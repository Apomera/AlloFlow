// ═══════════════════════════════════════════
// stem_tool_artstudio.js — STEAM Lab Art Studio Tools
// Renamed from stem_tool_creative.js (stem_tool_art.js was the obsolete duplicate)
// 2 registered tools: artStudio, gameStudio
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
// Ensure window.StemLab is available before registering tools.
// If stem_lab_module.js hasn't loaded yet, create the registry stub.
window.StemLab = window.StemLab || {
  _registry: {},
  _order: [],
  registerTool: function(id, config) {
    config.id = id;
    config.ready = config.ready !== false;
    this._registry[id] = config;
    if (this._order.indexOf(id) === -1) this._order.push(id);
    console.log('[StemLab] Registered tool: ' + id);
  },
  getRegisteredTools: function() {
    var self = this;
    return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean);
  },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) {
    var tool = this._registry[id];
    if (!tool || !tool.render) return null;
    try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; }
  }
};
// ═══ End Guard ═══

(function() {
  'use strict';
  // ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEAM Lab tools ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();


  // ── Audio (auto-injected) ──
  var _artAC = null;
  function getArtAC() { if (!_artAC) { try { _artAC = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } if (_artAC && _artAC.state === "suspended") { try { _artAC.resume(); } catch(e) {} } return _artAC; }
  function artTone(f,d,tp,v) { var ac = getArtAC(); if (!ac) return; try { var o = ac.createOscillator(); var g = ac.createGain(); o.type = tp||"sine"; o.frequency.value = f; g.gain.setValueAtTime(v||0.07, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime+(d||0.1)); o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime+(d||0.1)); } catch(e) {} }
  function sfxArtClick() { artTone(600, 0.03, "sine", 0.04); }
  function sfxArtSuccess() { artTone(523, 0.08, "sine", 0.07); setTimeout(function() { artTone(659, 0.08, "sine", 0.07); }, 70); setTimeout(function() { artTone(784, 0.1, "sine", 0.08); }, 140); }

  // The live watercolor grid is intentionally kept outside React state. This
  // small session cache lets wet paint keep diffusing after the canvas is
  // remounted, while the serializable tool data still stores a flat PNG.
  var _artStudioWatercolorCache = {
    state: null,
    undo: [],
    redo: [],
    maxHistory: 8
  };

  // IndexedDB keeps the typed simulation arrays durable without forcing a
  // multi-megabyte payload through React state or localStorage. The PNG in
  // tool data remains the portable fallback when IndexedDB is unavailable.
  var _artStudioWatercolorStateStore = (function () {
    var databasePromise = null;
    var databaseName = 'alloflow-artstudio';
    var storeName = 'watercolorStates';

    function openDatabase() {
      if (databasePromise) return databasePromise;
      if (typeof indexedDB === 'undefined') return Promise.resolve(null);
      databasePromise = new Promise(function (resolve) {
        var request;
        try { request = indexedDB.open(databaseName, 1); }
        catch (_) { resolve(null); return; }
        request.onupgradeneeded = function () {
          var database = request.result;
          if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
        };
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { resolve(null); };
        request.onblocked = function () { resolve(null); };
      });
      return databasePromise;
    }

    function transact(mode, action) {
      return openDatabase().then(function (database) {
        if (!database) return null;
        return new Promise(function (resolve) {
          var transaction;
          try { transaction = database.transaction(storeName, mode); }
          catch (_) { resolve(null); return; }
          var request;
          try { request = action(transaction.objectStore(storeName)); }
          catch (_) { resolve(null); return; }
          request.onsuccess = function () { resolve(mode === 'readonly' ? (request.result || null) : true); };
          request.onerror = function () { resolve(null); };
          transaction.onabort = function () { resolve(null); };
        });
      });
    }

    return {
      createKey: function () {
        var randomPart = Math.random().toString(36).slice(2, 10);
        return 'watercolor-' + Date.now().toString(36) + '-' + randomPart;
      },
      load: function (key) {
        if (!key) return Promise.resolve(null);
        return transact('readonly', function (store) { return store.get(key); });
      },
      save: function (key, state) {
        if (!key || !state) return Promise.resolve(null);
        return transact('readwrite', function (store) {
          return store.put({ version: 1, savedAt: Date.now(), state: state }, key);
        });
      },
      remove: function (key) {
        if (!key) return Promise.resolve(null);
        return transact('readwrite', function (store) { return store.delete(key); });
      }
    };
  })();

  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-artstudio')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-artstudio';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ═══ dataPlot → extracted to stem_tool_dataplot.js ═══

  // ═══ 🔬 artStudio (artStudio) ═══
  // Artist & Traditions Explorer. Profiles teach ways of looking and making;
  // they are not image-generation style presets. Living artists and culturally
  // specific practices retain an explicit respect note.
  var ARTIST_EXPLORER_PROFILES = [
    { id: 'el-anatsui', name: 'El Anatsui', life: 'born 1944', region: 'Africa', places: 'Ghana and Nigeria', era: 'Contemporary', medium: 'Installation & mixed media', colors: ['#9b6b28','#d7b96a','#3b5368'], overview: 'Transforms discarded bottle caps and metal into vast, flexible fields that change with every installation.', lookFor: 'Repetition, material history, changing surfaces, and the tension between precious appearance and discarded matter.', context: 'His works connect trade, consumption, colonial histories, labor, and the ability of a material to carry memory.', tryThis: 'Build a repeated unit from safe reused material, then test three arrangements instead of treating the first layout as final.', respect: 'Study transformation and systems; do not reduce West African histories to a decorative metallic effect.', labs: ['tessellation','sculpt3d','gradient'] },
    { id: 'ibrahim-el-salahi', name: 'Ibrahim El-Salahi', life: 'born 1930', region: 'Africa', places: 'Sudan and the United Kingdom', era: 'Contemporary', medium: 'Painting & drawing', colors: ['#1f2937','#a16207','#e7e5e4'], overview: 'A foundational figure in African modernism whose drawings and paintings join calligraphic energy, memory, landscape, and abstraction.', lookFor: 'Branching lines, compressed figures, black-and-white rhythm, and forms that hover between writing and image.', context: 'His work emerged through Sudanese, African, Arab, Islamic, and international modernist conversations rather than a single inherited category.', tryThis: 'Let one continuous line grow into an image, then identify where it reads as symbol, body, landscape, or writing.', respect: 'Explore the relationship between mark and meaning without copying sacred or unfamiliar scripts as decoration.', labs: ['symmetry','generative','stringArt'] },
    { id: 'esther-mahlangu', name: 'Esther Mahlangu', life: 'born 1935', region: 'Africa', places: 'South Africa; Ndebele', era: 'Contemporary', medium: 'Textiles, pattern & design', colors: ['#111827','#f8fafc','#ef4444','#2563eb','#facc15'], overview: 'Extends Ndebele mural painting through architecture, canvas, vehicles, and public commissions while asserting the knowledge of women artists.', lookFor: 'Bold boundaries, geometric sequencing, high-contrast color, scale, and the adaptation of a living mural practice.', context: 'Ndebele house painting is a living cultural practice tied to community, identity, and women’s knowledge—not a generic pattern library.', tryThis: 'Create a geometric rhythm from shapes drawn from your own environment and explain what your repeated choices mean.', respect: 'Credit Ndebele artists and context. Do not claim Ndebele identity or reproduce culturally meaningful motifs as anonymous décor.', labs: ['tessellation','contrast','colorWheel'] },
    { id: 'skunder-boghossian', name: 'Skunder Boghossian', life: '1937–2003', region: 'Africa', places: 'Ethiopia, France, and the United States', era: 'Modern', medium: 'Painting & drawing', colors: ['#7c2d12','#d97706','#312e81','#0f172a'], overview: 'Built dense, layered paintings from Ethiopian visual histories, personal symbols, jazz-like rhythm, and international modernism.', lookFor: 'Layering, icon-like forms, luminous color, improvisation, and figures emerging from complex grounds.', context: 'His work challenges accounts of modernism that place innovation only in Europe and North America.', tryThis: 'Layer three translucent systems—marks, shapes, and a limited palette—then decide which layer should lead.', respect: 'Study how multiple histories coexist in a work rather than extracting Ethiopian symbols from their meanings.', labs: ['watercolor','generative','gradient'] },
    { id: 'hokusai', name: 'Katsushika Hokusai', life: '1760–1849', region: 'Asia', places: 'Japan', era: 'Early modern', medium: 'Printmaking', colors: ['#164e63','#e0f2fe','#d6b98c','#1e293b'], overview: 'Used woodblock design, dramatic cropping, repeated series, and close observation to make everyday labor and landscape feel monumental.', lookFor: 'Strong silhouettes, compressed depth, directional movement, foreground cropping, and recurring viewpoints.', context: 'Ukiyo-e prints were collaborative works involving designer, carver, printer, and publisher—not the product of one isolated hand.', tryThis: 'Compose the same place from three viewpoints using only flat shapes and a four-color palette.', respect: 'Name the collaborative print process and avoid treating Japanese design as a timeless exotic aesthetic.', labs: ['pixel','gradient','tessellation'], sourceUrl: 'https://www.metmuseum.org/art/collection/search/55286' },
    { id: 'amrita-sher-gil', name: 'Amrita Sher-Gil', life: '1913–1941', region: 'Asia', places: 'India and Hungary', era: 'Modern', medium: 'Painting & drawing', colors: ['#7f1d1d','#ca8a04','#334155','#d6d3d1'], overview: 'Joined European painting study with sustained attention to people, color, and social life in India, refusing an easy division between East and West.', lookFor: 'Weighted figures, quiet group psychology, earthy color, simplified volume, and carefully held space.', context: 'Her work belongs to histories of Indian modernism, migration, gender, and the unequal conditions through which art histories are written.', tryThis: 'Arrange three simplified figures so posture and spacing communicate a relationship without facial detail.', respect: 'Study composition and social attention rather than using clothing or identity as costume.', labs: ['colorWheel','sculpt3d','contrast'] },
    { id: 'pacita-abad', name: 'Pacita Abad', life: '1946–2004', region: 'Asia', places: 'The Philippines and a global studio practice', era: 'Contemporary', medium: 'Textiles, pattern & design', colors: ['#db2777','#f97316','#14b8a6','#7c3aed'], overview: 'Created exuberant trapunto paintings by stitching, stuffing, painting, and attaching materials to build color into physical relief.', lookFor: 'Quilted depth, accumulated surfaces, portable materials, intense color, and the movement between abstraction and social witness.', context: 'Her global practice grew through travel and relationships; it should not be flattened into a collection of interchangeable cultural motifs.', tryThis: 'Design a relief surface in three layers: base shape, stitched or repeated boundary, and attached texture.', respect: 'Credit specific material traditions when using them and avoid presenting cultural borrowing as placeless “world pattern.”', labs: ['sculpt3d','tessellation','colorWheel'] },
    { id: 'yayoi-kusama', name: 'Yayoi Kusama', life: 'born 1929', region: 'Asia', places: 'Japan and the United States', era: 'Contemporary', medium: 'Installation & mixed media', colors: ['#dc2626','#f8fafc','#facc15','#111827'], overview: 'Uses repetition, mirrored space, accumulation, performance, painting, and sculpture to alter how a viewer experiences body and environment.', lookFor: 'Accumulation, serial marks, scale shifts, reflection, immersion, and the point where repetition changes perception.', context: 'Her long practice cannot be reduced to polka dots; it includes painting, political performance, publishing, fashion, sculpture, and installation.', tryThis: 'Choose one simple mark and vary density and scale until the surrounding space—not the mark itself—becomes the subject.', respect: 'Kusama is a living artist. Study repetition and perception; do not ask an image model to imitate her signature works.', labs: ['opArt','tessellation','sculpt3d'] },
    { id: 'artemisia-gentileschi', name: 'Artemisia Gentileschi', life: '1593–c.1654', region: 'Europe', places: 'Italy', era: 'Early modern', medium: 'Painting & drawing', colors: ['#422006','#9f1239','#d6b98c','#0f172a'], overview: 'Built large narrative paintings through forceful gesture, directional light, compressed action, and protagonists with physical presence.', lookFor: 'Chiaroscuro, diagonals, weight, hands at work, and the moment in a story selected for maximum consequence.', context: 'Her biography matters, but reducing every painting to personal trauma can erase her professional ambition, learning, patrons, and invention.', tryThis: 'Stage a three-shape scene where light and diagonal movement identify the decisive moment without adding text.', respect: 'Do not treat an artist’s suffering as the only explanation for artistic intelligence.', labs: ['contrast','gradient','sculpt3d'] },
    { id: 'kathe-kollwitz', name: 'Käthe Kollwitz', life: '1867–1945', region: 'Europe', places: 'Germany', era: 'Modern', medium: 'Printmaking', colors: ['#111827','#57534e','#d6d3d1'], overview: 'Used drawing, etching, lithography, woodcut, and sculpture to address grief, labor, poverty, war, care, and resistance.', lookFor: 'Compressed value, expressive hands, repeated figures, carved silhouettes, and empathy without sentimentality.', context: 'Printmaking allowed images to circulate beyond a single painting, joining formal decisions to public witness.', tryThis: 'Tell a social story using only black, paper color, and three values; remove every mark that does not carry meaning.', respect: 'Approach represented suffering with specificity and dignity, not as visual drama detached from people’s lives.', labs: ['contrast','pixel','stringArt'] },
    { id: 'hilma-af-klint', name: 'Hilma af Klint', life: '1862–1944', region: 'Europe', places: 'Sweden', era: 'Modern', medium: 'Painting & drawing', colors: ['#f9a8d4','#93c5fd','#fef3c7','#7c3aed'], overview: 'Developed large abstract systems of color, geometry, notation, and organic form years before abstraction entered the standard modernist story.', lookFor: 'Paired forms, spirals, diagrams, botanical growth, letter-like signs, scale, and sequences across groups of works.', context: 'Her practice joined artistic experiment, spiritual inquiry, scientific curiosity, collaboration, and careful systems of documentation.', tryThis: 'Invent five nonverbal forms for growth, tension, balance, change, and return; arrange them as a visual argument.', respect: 'Distinguish studying symbolic systems from claiming that unfamiliar spiritual signs have meanings you invented.', labs: ['symmetry','spirograph','colorWheel'] },
    { id: 'bridget-riley', name: 'Bridget Riley', life: 'born 1931', region: 'Europe', places: 'United Kingdom', era: 'Contemporary', medium: 'Painting & drawing', colors: ['#111827','#f8fafc','#2563eb','#f97316'], overview: 'Builds precise arrangements of line, interval, contrast, and color that make perception feel unstable and active.', lookFor: 'Rhythm, optical vibration, repeated intervals, figure-ground reversal, and movement produced without animation.', context: 'Op art is not merely an illusion trick; it asks how seeing unfolds over time in an embodied viewer.', tryThis: 'Change one interval across a repeated grid and record where still pattern begins to appear mobile.', respect: 'Riley is a living artist. Investigate perceptual variables rather than copying a recognizable composition.', labs: ['opArt','contrast','gradient'] },
    { id: 'tarsila-do-amaral', name: 'Tarsila do Amaral', life: '1886–1973', region: 'Latin America & Caribbean', places: 'Brazil', era: 'Modern', medium: 'Painting & drawing', colors: ['#65a30d','#facc15','#f97316','#38bdf8'], overview: 'Combined vivid color, transformed bodies and landscapes, industrial change, and Brazilian modernist debates into an unmistakable visual language.', lookFor: 'Elastic scale, simplified volume, saturated local color, landscape-body relationships, and tension between city and countryside.', context: 'Brazilian modernism wrestled with colonial inheritance and national identity; cultural cannibalism was a critical strategy, not a decorative theme.', tryThis: 'Exaggerate the scale of one ordinary form to show how power or attention operates in a place you know.', respect: 'Study transformation and national self-definition without turning Brazilian identity into tropical shorthand.', labs: ['sculpt3d','colorWheel','gradient'] },
    { id: 'wifredo-lam', name: 'Wifredo Lam', life: '1902–1982', region: 'Latin America & Caribbean', places: 'Cuba, Spain, and France', era: 'Modern', medium: 'Painting & drawing', colors: ['#14532d','#713f12','#1e293b','#a3a3a3'], overview: 'Created hybrid, compressed figures amid cane-like vegetation while confronting colonialism and the European appetite for primitivism.', lookFor: 'Mask-like heads, blade forms, unstable bodies, dense vertical space, and figures that resist easy reading.', context: 'Lam engaged Afro-Cuban histories and modernism while rejecting the treatment of African and Caribbean culture as raw material for Europe.', tryThis: 'Construct a figure from plant, tool, and body shapes so no single category fully explains it.', respect: 'Do not call unfamiliar sacred or cultural forms “primitive,” and do not detach Afro-Cuban references from colonial history.', labs: ['symmetry','generative','sculpt3d'] },
    { id: 'frida-kahlo', name: 'Frida Kahlo', life: '1907–1954', region: 'Latin America & Caribbean', places: 'Mexico', era: 'Modern', medium: 'Painting & drawing', colors: ['#166534','#b91c1c','#facc15','#0f172a'], overview: 'Made tightly constructed paintings in which body, disability, clothing, plants, politics, place, and self-representation carry layered meanings.', lookFor: 'Direct gaze, compressed symbols, doubled selves, bodily specificity, staged space, and objects functioning as evidence.', context: 'Her work exceeds the simplified label “pain transformed into art”; it also involves humor, politics, national identity, intimacy, and deliberate self-fashioning.', tryThis: 'Create a symbolic self-portrait without drawing a face: choose five objects and explain what relationship each one carries.', respect: 'Do not romanticize disability or reduce a complex artist to trauma and inspirational perseverance.', labs: ['symmetry','colorWheel','sculpt3d'] },
    { id: 'joaquin-torres-garcia', name: 'Joaquín Torres-García', life: '1874–1949', region: 'Latin America & Caribbean', places: 'Uruguay, Spain, and France', era: 'Modern', medium: 'Painting & drawing', colors: ['#dc2626','#eab308','#2563eb','#111827'], overview: 'Organized grids, pictographic signs, proportion, and a School of the South that reoriented modern art away from Europe as the automatic center.', lookFor: 'Modular grids, unequal rectangles, compact signs, primary colors, and relationships between universal systems and local place.', context: 'His inverted map of South America made orientation itself an argument: north need not determine cultural authority.', tryThis: 'Design a grid-map of your community using only ten personal symbols, then rotate it and ask what the new orientation changes.', respect: 'Invent symbols from your own life instead of borrowing Indigenous signs as supposedly universal marks.', labs: ['pixel','tessellation','contrast'] },
    { id: 'etel-adnan', name: 'Etel Adnan', life: '1925–2021', region: 'Middle East & North Africa', places: 'Lebanon, France, and the United States', era: 'Contemporary', medium: 'Painting & drawing', colors: ['#f97316','#eab308','#2563eb','#7c2d12'], overview: 'Moved among poetry, painting, tapestry, leporello books, journalism, and philosophy, often returning to compact landscapes and the changing presence of a mountain.', lookFor: 'Small fields of strong color, horizon, sun, folded sequence, repeated place, and the exchange between writing and image.', context: 'Her multilingual, diasporic practice resists being assigned to one nation, language, medium, or identity.', tryThis: 'Observe the same view at three times and reduce each version to five color shapes; bind them into a sequence.', respect: 'Treat migration and multilingual identity as lived complexity, not as an exotic source of visual hybridity.', labs: ['gradient','colorWheel','pixel'] },
    { id: 'shirin-neshat', name: 'Shirin Neshat', life: 'born 1957', region: 'Middle East & North Africa', places: 'Iran and the United States', era: 'Contemporary', medium: 'Photography & video', colors: ['#111827','#f8fafc','#991b1b'], overview: 'Uses photography, film, sound, performance, and divided installations to examine power, gender, exile, collective voice, and representation.', lookFor: 'Black-white contrast, opposing screens, gaze, calligraphic overlay, sound across space, and individuals positioned within groups.', context: 'Her work addresses Iranian and diasporic histories while also questioning Western expectations about Muslim women.', tryThis: 'Storyboard two simultaneous viewpoints on the same event and decide what each frame allows or withholds.', respect: 'Neshat is a living artist. Do not imitate her signature imagery or use pseudo-calligraphy; study viewpoint, opposition, and spectatorship.', labs: ['contrast','stereogram','gradient'] },
    { id: 'monir-farmanfarmaian', name: 'Monir Shahroudy Farmanfarmaian', life: '1922–2019', region: 'Middle East & North Africa', places: 'Iran and the United States', era: 'Contemporary', medium: 'Sculpture', colors: ['#e2e8f0','#67e8f9','#f9a8d4','#facc15'], overview: 'Joined mirror mosaic, reverse-glass painting, geometry, craft collaboration, and modern abstraction in radiant constructed works.', lookFor: 'Reflection, polygon systems, cut modules, changing light, symmetry, and the viewer becoming part of the surface.', context: 'Her work grew through Iranian architectural and craft traditions as well as international abstraction; neither side is a decorative footnote.', tryThis: 'Build a symmetric polygon system whose appearance changes when a light source or viewer position moves.', respect: 'Credit mirror-work traditions and workshop collaboration rather than describing the work as geometry discovered by modernism alone.', labs: ['symmetry','tessellation','sculpt3d'] },
    { id: 'laila-shawa', name: 'Laila Shawa', life: '1940–2022', region: 'Middle East & North Africa', places: 'Palestine and the United Kingdom', era: 'Contemporary', medium: 'Printmaking', colors: ['#ec4899','#22c55e','#111827','#f8fafc'], overview: 'Combined screenprint, photography, painting, text, pattern, and pop color to confront occupation, gender, violence, propaganda, and mass media.', lookFor: 'Repetition, photographic fragments, bright color against difficult content, fences or grids, and images transformed through printing.', context: 'Surface attraction and political critique operate together; brightness does not make the subject uncomplicated.', tryThis: 'Repeat one news-derived shape, changing scale and color to reveal how repetition can normalize or challenge a message.', respect: 'Keep political images connected to real histories and people; do not aestheticize violence into an empty pattern.', labs: ['pixel','contrast','tessellation'] },
    { id: 'alma-thomas', name: 'Alma Thomas', life: '1891–1978', region: 'North America', places: 'United States', era: 'Modern', medium: 'Painting & drawing', colors: ['#dc2626','#2563eb','#16a34a','#facc15'], overview: 'Developed luminous abstractions from gardens, music, light, and space exploration after a long career as a public-school art teacher.', lookFor: 'Broken color marks, white intervals, vertical and circular rhythm, optical mixing, and movement built from small variation.', context: 'Thomas became Howard University’s first fine-arts graduate and produced her best-known work after retiring from thirty-five years of teaching.', tryThis: 'Build a rhythm from separated color marks, leaving the ground active; vary one interval so the pattern breathes rather than becoming mechanical.', respect: 'Study rhythm, nature, and late-life experimentation rather than copying a signature mosaic surface.', labs: ['colorWheel','tessellation','gradient'], sourceUrl: 'https://americanart.si.edu/artist/alma-thomas-4778' },
    { id: 'ruth-asawa', name: 'Ruth Asawa', life: '1926–2013', region: 'North America', places: 'United States; Japanese American', era: 'Contemporary', medium: 'Sculpture', colors: ['#475569','#cbd5e1','#f8fafc'], overview: 'Created suspended looped-wire forms whose interior and exterior remain visible, while also building arts education and public-making programs.', lookFor: 'Continuous line in space, nested volume, transparency, shadow, hand process, and structures that hold air rather than conceal it.', context: 'Her work connects craft knowledge, experimental education, unjust wartime incarceration, family, public art, and sustained community organizing.', tryThis: 'Model a volume using only a continuous line or mesh; make its shadow a second composition.', respect: 'Do not use incarceration as an inspirational prelude; recognize it as state violence within a larger life and practice.', labs: ['sculpt3d','stringArt','symmetry'] },
    { id: 'jacob-lawrence', name: 'Jacob Lawrence', life: '1917–2000', region: 'North America', places: 'United States', era: 'Modern', medium: 'Painting & drawing', colors: ['#b91c1c','#1d4ed8','#eab308','#111827'], overview: 'Built narrative series from repeated colors, angular figures, research, text, and scenes of migration, labor, resistance, and everyday life.', lookFor: 'Series structure, recurring palette, diagonals, compressed rooms, repeated figures, and the relation between caption and image.', context: 'The Migration Series treats history through many connected panels, making movement and collective experience structural rather than incidental.', tryThis: 'Tell one community change in four panels using a fixed six-color palette and one recurring shape.', respect: 'Research the people and history represented; do not turn collective struggle into a generic heroic storyline.', labs: ['pixel','contrast','colorWheel'] },
    { id: 'maria-martinez', name: 'Maria Poveka Martinez', life: 'c.1887–1980', region: 'North America', places: 'San Ildefonso Pueblo, United States', era: 'Modern', medium: 'Ceramics', colors: ['#111827','#44403c','#a8a29e'], overview: 'Worked with family and community collaborators to refine celebrated black-on-black pottery grounded in Pueblo knowledge and material practice.', lookFor: 'Form, burnished and matte contrast, firing knowledge, surface-light relationships, and the precision of a vessel as a whole.', context: 'Maria Martinez’s pottery is inseparable from San Ildefonso Pueblo, family collaboration, clay knowledge, firing, and the pressures of an outside art market.', tryThis: 'Design a vessel through silhouette and two surface finishes; explain how light—not borrowed motif—creates contrast.', respect: 'Pueblo designs are not a pattern pack. Credit Maria, Julian Martinez, family collaborators, San Ildefonso Pueblo, and living pottery traditions.', labs: ['sculpt3d','contrast','gradient'] },
    { id: 'emily-kame-kngwarreye', name: 'Emily Kam Kngwarray', life: 'c.1910–1996', region: 'Oceania', places: 'Anmatyerr Country, Australia', era: 'Contemporary', medium: 'Painting & drawing', colors: ['#7c2d12','#f59e0b','#f8fafc','#1e3a8a'], overview: 'Began painting on canvas late in life after decades of cultural and artistic work, creating varied paintings grounded in Alhalker Country and Anmatyerr knowledge.', lookFor: 'Gesture, seasonal change, layered mark, scale, Country, and dramatic shifts between dense fields and spare lines.', context: 'The work is not generic abstraction: it arises from Country, kinship, plants, ceremony, and knowledge that viewers do not automatically possess.', tryThis: 'Map change in a place you personally know through gesture, density, and season rather than copying dots or cultural symbols.', respect: 'Do not copy Anmatyerr marks or claim their meanings. Learn from sustained attention to your own relationship with place.', labs: ['watercolor','generative','colorWheel'], sourceUrl: 'https://nga.gov.au/learn/learning-resources/emily-kam-kngwarray/' },
    { id: 'lisa-reihana', name: 'Lisa Reihana', life: 'born 1964', region: 'Oceania', places: 'Aotearoa New Zealand; Māori', era: 'Contemporary', medium: 'Photography & video', colors: ['#0f172a','#0f766e','#d6b98c','#be123c'], overview: 'Uses photography, moving image, sound, performance, costume, and digital compositing to question colonial representation and reactivate histories.', lookFor: 'Panoramic sequence, staged encounter, gaze, costume, sound, quotation, and the difference between being pictured and representing oneself.', context: 'Her work often speaks back to European images of the Pacific rather than simply illustrating the historical record they created.', tryThis: 'Take one historical image and storyboard what occurs immediately outside its frame from another participant’s viewpoint.', respect: 'Reihana is a living Māori artist. Study counter-narrative and framing; do not imitate culturally specific imagery or performance.', labs: ['stereogram','gradient','contrast'] },
    { id: 'yuki-kihara', name: 'Yuki Kihara', life: 'born 1975', region: 'Oceania', places: 'Sāmoa and Aotearoa New Zealand', era: 'Contemporary', medium: 'Photography & video', colors: ['#7f1d1d','#f8fafc','#0f172a','#0e7490'], overview: 'Works across photography, performance, video, dance, and curating to examine colonial imagery, climate, gender, labor, and Sāmoan histories.', lookFor: 'Re-enactment, serial photographs, pose, archival quotation, costume, absence, and who controls the camera.', context: 'Kihara’s perspective as a faʻafafine artist is specific; it should not be translated into a generic Western category or spectacle.', tryThis: 'Restage the composition—not the identity or costume—of an archival image and change who has agency in the frame.', respect: 'Kihara is a living artist. Use the work to study power in representation, not to imitate Sāmoan or faʻafafine identity.', labs: ['contrast','stereogram','pixel'] },
    { id: 'fiona-foley', name: 'Fiona Foley', life: 'born 1964', region: 'Oceania', places: 'Badtjala Country, Australia', era: 'Contemporary', medium: 'Installation & mixed media', colors: ['#7c2d12','#e7e5e4','#1e3a8a','#111827'], overview: 'Uses sculpture, photography, public art, text, and research to expose colonial violence, contested language, memory, and Badtjala histories.', lookFor: 'Encoded text, archival evidence, public placement, material symbolism, withheld information, and work that changes as history is uncovered.', context: 'Her projects demonstrate that public monuments and official archives are active political forms, not neutral containers of facts.', tryThis: 'Identify a phrase or omission in a local public record and design a nonliteral memorial that asks viewers to investigate it.', respect: 'Foley is a living Badtjala artist. Research local Indigenous authority and history rather than borrowing her symbols or speaking for her community.', labs: ['sculpt3d','contrast','tessellation'] }
  ];

  function artistExplorerSourceUrl(profile) {
    return profile.sourceUrl || ('https://www.si.edu/search?edan_q=' + encodeURIComponent(profile.name));
  }

  function filterArtistExplorerProfiles(filters) {
    var opts = filters || {};
    var query = String(opts.query || '').toLowerCase().trim();
    return ARTIST_EXPLORER_PROFILES.filter(function (profile) {
      if (opts.region && opts.region !== 'All regions' && profile.region !== opts.region) return false;
      if (opts.era && opts.era !== 'All eras' && profile.era !== opts.era) return false;
      if (opts.medium && opts.medium !== 'All media' && profile.medium !== opts.medium) return false;
      if (!query) return true;
      return [profile.name, profile.life, profile.region, profile.places, profile.era, profile.medium, profile.overview, profile.lookFor, profile.context]
        .join(' ').toLowerCase().indexOf(query) !== -1;
    });
  }

  function compareArtistExplorerProfiles(ids) {
    var requested = Array.isArray(ids) ? ids : [];
    var seen = {};
    var profiles = [];
    requested.forEach(function (id) {
      if (seen[id] || profiles.length >= 3) return;
      var profile = ARTIST_EXPLORER_PROFILES.filter(function (candidate) { return candidate.id === id; })[0];
      if (!profile) return;
      seen[id] = true;
      profiles.push(profile);
    });
    var sharedLabs = profiles.length ? profiles[0].labs.filter(function (labId) {
      return profiles.every(function (profile) { return profile.labs.indexOf(labId) !== -1; });
    }) : [];
    return {
      profiles: profiles,
      sharedLabs: sharedLabs,
      prompts: [
        'What appears similar at first, and what different histories or purposes change its meaning?',
        'How does each material or process shape what the artist can ask a viewer to notice?',
        'Which underlying decision could you translate into your own context without copying identity, symbols, or a signature style?'
      ]
    };
  }

  function artistSourcebookQuery(profile) {
    if (!profile) return '';
    return [profile.name, profile.medium, profile.places, 'museum open access'].join(' ');
  }

  function sourcebookProviderApiReady(api) {
    return !!(api && Number(api.version) >= 10 && typeof api.searchOpen === 'function' && typeof api.allowsRightsScope === 'function');
  }

  function ensureArtistSourcebookProviders() {
    if (sourcebookProviderApiReady(window.SourcebookProviders)) return Promise.resolve(window.SourcebookProviders);
    if (window._artStudioSourcebookProviderPromise) return window._artStudioSourcebookProviderPromise;
    if (typeof document === 'undefined' || !document.head) return Promise.reject(new Error('Sourcebook provider loading is unavailable.'));
    var scripts = Array.prototype.slice.call(document.getElementsByTagName('script'));
    var artStudioScript = scripts.filter(function (script) { return /stem_lab\/stem_tool_artstudio\.js(?:[?#].*)?$/i.test(script.src || ''); })[0];
    var sourceUrl = artStudioScript && artStudioScript.src
      ? artStudioScript.src.replace(/stem_tool_artstudio\.js(?:[?#].*)?$/i, 'stem_tool_sourcebook.js')
      : 'stem_lab/stem_tool_sourcebook.js';
    try {
      var resolved = new URL(sourceUrl, window.location.href);
      if (resolved.origin !== window.location.origin) return Promise.reject(new Error('Sourcebook provider URL must be same-origin.'));
      sourceUrl = resolved.href;
    } catch (_) { return Promise.reject(new Error('Sourcebook provider URL is invalid.')); }
    window._artStudioSourcebookProviderPromise = new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      var settled = false;
      var timer = setTimeout(function () {
        if (settled) return;
        settled = true;
        window._artStudioSourcebookProviderPromise = null;
        reject(new Error('Sourcebook provider loading timed out.'));
      }, 12000);
      function finish(error) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (!error && sourcebookProviderApiReady(window.SourcebookProviders)) resolve(window.SourcebookProviders);
        else {
          window._artStudioSourcebookProviderPromise = null;
          reject(error || new Error('Sourcebook rights API did not initialize.'));
        }
      }
      script.async = true;
      script.src = sourceUrl;
      script.onload = function () { finish(); };
      script.onerror = function () { finish(new Error('Sourcebook provider bundle could not be loaded.')); };
      document.head.appendChild(script);
    });
    return window._artStudioSourcebookProviderPromise;
  }

  function searchArtistSourcebookWorks(profile, providerApi, options) {
    var opts = options || {};
    var rightsScope = ['pd', 'pd-cc0', 'all'].indexOf(opts.rightsScope) !== -1 ? opts.rightsScope : 'pd';
    if (!profile || !providerApi || Number(providerApi.version) < 10 || typeof providerApi.searchOpen !== 'function' || typeof providerApi.allowsRightsScope !== 'function') {
      return Promise.reject(new Error('Sourcebook rights-verified search is unavailable.'));
    }
    return Promise.resolve(providerApi.searchOpen(artistSourcebookQuery(profile), {
      provider: 'All',
      kind: 'Visual assets',
      rightsScope: rightsScope,
      limit: 24,
      resultLimit: 18
    })).then(function (items) {
      var seen = {};
      return (Array.isArray(items) ? items : []).filter(function (item) {
        if (!item || seen[item.id] || !item.title || !item.imageUrl || !item.sourceUrl) return false;
        if (!/^https:\/\//i.test(item.imageUrl) || !/^https:\/\//i.test(item.sourceUrl)) return false;
        if (!providerApi.allowsRightsScope(item, rightsScope)) return false;
        seen[item.id] = true;
        return true;
      }).slice(0, 12);
    });
  }

  window.ArtStudioArtistExplorer = {
    version: 2,
    profiles: ARTIST_EXPLORER_PROFILES.slice(),
    filter: filterArtistExplorerProfiles,
    sourceUrl: artistExplorerSourceUrl,
    compare: compareArtistExplorerProfiles,
    sourcebookQuery: artistSourcebookQuery,
    searchWorks: searchArtistSourcebookWorks,
    ensureSourcebook: ensureArtistSourcebookProviders
  };

  window.StemLab.registerTool('artStudio', {
    icon: '\uD83D\uDD8C\uFE0F',
    label: "Art & Design Studio",
    desc: "Explore color theory, watercolor, pixel art, symmetry, spirographs, fractals, generative design, and WCAG contrast.",
    color: 'slate',
    category: 'creative',
    questHooks: [
      { id: 'create_palette', label: 'Create a color harmony palette', icon: '🎨', check: function(d) { return d.harmony && d.harmony !== 'complementary'; }, progress: function(d) { return d.harmony ? 'Created!' : 'Try harmonies'; } },
      { id: 'draw_pixels', label: 'Draw pixel art (10+ cells)', icon: '🖼️', check: function(d) { return Object.keys(d.pixelData || {}).length >= 10; }, progress: function(d) { return Object.keys(d.pixelData || {}).length + '/10'; } }
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
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var isDark = ctx.isDark || false;
      var isContrast = ctx.isContrast || false;
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
      var onUseArtwork = ctx.onUseArtwork;

      // ── Tool body (artStudio) ──
      return (function() {
const d = labToolData.artStudio || {};

          const ART_STUDIO_MAX_ANIM_KEYFRAMES = 12;
          const upd = (key, val) => setLabToolData(prev => ({ ...prev, artStudio: { ...prev.artStudio, [key]: val } }));
          const updMany = (values) => setLabToolData(prev => ({ ...prev, artStudio: { ...prev.artStudio, ...values } }));
          const copyArtStudioPixels = function (source) {
            var pixels = source && source.data ? source.data : source;
            return new Uint8ClampedArray(pixels || 0);
          };
          const _artistWorksState = React.useState({ profileId: '', status: 'idle', message: '', items: [] });
          const artistWorksState = _artistWorksState[0];
          const setArtistWorksState = _artistWorksState[1];
          const artistWorksRequestRef = React.useRef(0);
          const stereoAnimRuntimeRef = React.useRef(null);
          if (!stereoAnimRuntimeRef.current) {
            stereoAnimRuntimeRef.current = { timer: null, frames: [], renderGeneration: 0 };
          }
          const _stereoAnimRef = stereoAnimRuntimeRef.current;
          React.useEffect(function () {
            return function () {
              _stereoAnimRef.renderGeneration += 1;
              if (_stereoAnimRef.timer) clearInterval(_stereoAnimRef.timer);
              _stereoAnimRef.timer = null;
              _stereoAnimRef.frames = [];
            };
          }, []);
          const _artistCompareIdsState = React.useState(Array.isArray(d.artistCompareIds) ? d.artistCompareIds.slice(0, 3) : []);
          const artistCompareIds = _artistCompareIdsState[0];
          const setArtistCompareIds = _artistCompareIdsState[1];
          const saveWatercolorMetadata = function (snapshot, stateKey) {
            setLabToolData(function (prev) {
              return {
                ...prev,
                artStudio: {
                  ...(prev.artStudio || {}),
                  watercolorSnapshot: snapshot || '',
                  watercolorStateKey: stateKey || ''
                }
              };
            });
          };

          const ART_STUDIO_TAB_ORDER = ['artistExplorer', 'colorWheel', 'mixer', 'watercolor', 'pixel', 'symmetry', 'spirograph', 'generative', 'spinArt', 'stringArt', 'opArt', 'tessellation', 'fractal', 'gradient', 'stereogram', 'sculpt3d', 'contrast', 'harmonyHunt'];
          const requestedArtStudioTab = d.tab || 'colorWheel';
          const tab = ART_STUDIO_TAB_ORDER.indexOf(requestedArtStudioTab) !== -1 ? requestedArtStudioTab : 'colorWheel';
          const ART_STUDIO_TAB_LABELS = {
            artistExplorer: 'Artists & Traditions',
            colorWheel: 'Color Wheel', mixer: 'Color Mixer', watercolor: 'Watercolor', pixel: 'Pixel Art',
            symmetry: 'Symmetry', spirograph: 'Spirograph', generative: 'Generative Art', spinArt: 'Spin Art',
            stringArt: 'String Art', opArt: 'Op Art', tessellation: 'Tessellation', fractal: 'Fractal',
            gradient: 'Gradient', stereogram: 'Stereogram', sculpt3d: '3D Sculpture', contrast: 'Contrast', harmonyHunt: 'Harmony'
          };
          const ART_STUDIO_TAB_ITEMS = [
            { id: 'artistExplorer', icon: '\uD83C\uDF0D', label: __alloT('stem.artstudio.artists_traditions', 'Artists & Traditions') },
            { id: 'colorWheel', icon: '\uD83C\uDFA8', label: __alloT('stem.artstudio.color_wheel_2', 'Color Wheel') },
            { id: 'mixer', icon: '\uD83E\uDDEA', label: __alloT('stem.artstudio.color_mixer_2', 'Color Mixer') },
            { id: 'watercolor', icon: '\uD83C\uDFA8', label: __alloT('stem.artstudio.watercolor_2', 'Watercolor') },
            { id: 'pixel', icon: '\uD83D\uDDBC', label: __alloT('stem.artstudio.pixel_art_2', 'Pixel Art') },
            { id: 'symmetry', icon: '\u2728', label: __alloT('stem.artstudio.symmetry_2', 'Symmetry') },
            { id: 'spirograph', icon: '\uD83C\uDF00', label: __alloT('stem.artstudio.spirograph_2', 'Spirograph') },
            { id: 'generative', icon: '\uD83C\uDF86', label: __alloT('stem.artstudio.generative_2', 'Generative') },
            { id: 'spinArt', icon: '\uD83C\uDF00', label: __alloT('stem.artstudio.spin_art_2', 'Spin Art') },
            { id: 'stringArt', icon: '\uD83D\uDD78', label: __alloT('stem.artstudio.string_art_2', 'String Art') },
            { id: 'opArt', icon: '\uD83D\uDC41', label: __alloT('stem.artstudio.op_art_2', 'Op Art') },
            { id: 'tessellation', icon: '\uD83D\uDD37', label: __alloT('stem.artstudio.tessellation_2', 'Tessellation') },
            { id: 'fractal', icon: '\uD83D\uDD2E', label: __alloT('stem.artstudio.fractals_2', 'Fractals') },
            { id: 'gradient', icon: '\uD83C\uDF08', label: __alloT('stem.artstudio.gradient_2', 'Gradient') },
            { id: 'stereogram', icon: '\uD83D\uDC53', label: __alloT('stem.artstudio.stereogram_2', 'Stereogram') },
            { id: 'sculpt3d', icon: '\uD83D\uDDFF', label: __alloT('stem.artstudio.sculpt_3d', 'Sculpt 3D') },
            { id: 'contrast', icon: '\u267F', label: __alloT('stem.artstudio.contrast_2', 'Contrast') },
            { id: 'harmonyHunt', icon: '\uD83C\uDFB6', label: __alloT('stem.artstudio.harmony', 'Harmony') }
          ];
          const ART_STUDIO_GROUPS = [
            { id: 'explore', icon: '\uD83C\uDF0D', label: 'Explore', tabs: ['artistExplorer'] },
            { id: 'paint', icon: '\uD83C\uDFA8', label: 'Paint & color', tabs: ['colorWheel', 'mixer', 'watercolor', 'gradient'] },
            { id: 'pattern', icon: '\u25C8', label: 'Pattern & mathematics', tabs: ['symmetry', 'spirograph', 'stringArt', 'tessellation', 'fractal'] },
            { id: 'digital', icon: '\u2726', label: 'Digital & generative', tabs: ['pixel', 'generative', 'spinArt', 'stereogram'] },
            { id: 'space', icon: '\uD83D\uDDFF', label: 'Space & sculpture', tabs: ['sculpt3d'] },
            { id: 'perception', icon: '\u25C9', label: 'Perception & access', tabs: ['opArt', 'contrast', 'harmonyHunt'] }
          ];
          const STUDIO_START_PATHS = [
            { id: 'paint', tab: 'watercolor', icon: '\uD83C\uDFA8', eyebrow: 'Paint', title: 'Paint something', description: 'Start with a responsive watercolor canvas, then explore pigment and paper when you are ready.', accent: 'border-teal-300 hover:border-teal-500 hover:bg-teal-50' },
            { id: 'digital', tab: 'pixel', icon: '\uD83D\uDDBC', eyebrow: 'Digital', title: 'Make pixel art', description: 'Build a sprite or icon one deliberate cell at a time.', accent: 'border-blue-300 hover:border-blue-500 hover:bg-blue-50' },
            { id: 'pattern', tab: 'symmetry', icon: '\u2728', eyebrow: 'Pattern', title: 'Create a pattern', description: 'Draw once and let reflection, rotation, and repetition transform the mark.', accent: 'border-violet-300 hover:border-violet-500 hover:bg-violet-50' },
            { id: 'sculpt', tab: 'sculpt3d', icon: '\uD83D\uDDFF', eyebrow: 'Space', title: 'Build in 3D', description: 'Combine simple forms into a sculpture you can orbit and photograph.', accent: 'border-amber-300 hover:border-amber-500 hover:bg-amber-50' },
            { id: 'artists', tab: 'artistExplorer', icon: '\uD83C\uDF0D', eyebrow: 'Learn', title: 'Explore an artist', description: 'Study a creative decision and carry the question, not a copied style, into your own work.', accent: 'border-rose-300 hover:border-rose-500 hover:bg-rose-50' },
            { id: 'access', tab: 'contrast', icon: '\u25C9', eyebrow: 'Inspect', title: 'Design accessible color', description: 'Test color choices and understand how contrast changes who can use a design.', accent: 'border-cyan-300 hover:border-cyan-500 hover:bg-cyan-50' }
          ];
          const artStudioGroupForTab = function (tabId) {
            return ART_STUDIO_GROUPS.filter(function (group) { return group.tabs.indexOf(tabId) !== -1; })[0] || ART_STUDIO_GROUPS[0];
          };
          const activeArtStudioGroup = artStudioGroupForTab(tab);
          const visibleArtStudioTabs = ART_STUDIO_TAB_ITEMS.filter(function (item) { return activeArtStudioGroup.tabs.indexOf(item.id) !== -1; });
          const canvasArtworkAvailable = ['colorWheel', 'watercolor', 'pixel', 'symmetry', 'spirograph', 'generative', 'spinArt', 'stringArt', 'opArt', 'tessellation', 'fractal', 'gradient', 'stereogram', 'sculpt3d'].indexOf(tab) !== -1;
          const studioHomeOpen = d.studioHome === true || (d.studioHome !== false && (!d.tab || d.tab === 'color'));
          const focusArtStudioTarget = function (targetId) {
            if (typeof window === 'undefined' || typeof document === 'undefined') return;
            window.setTimeout(function () {
              var target = document.getElementById(targetId);
              if (target && typeof target.focus === 'function') target.focus();
            }, 0);
          };
          const beginStudioPath = function (nextTab, label) {
            var safeTab = ART_STUDIO_TAB_ORDER.indexOf(nextTab) !== -1 ? nextTab : 'colorWheel';
            updMany({
              tab: safeTab,
              artNavGroup: artStudioGroupForTab(safeTab).id,
              studioHome: false,
              studioStarted: true
            });
            focusArtStudioTarget('artstudio-panel-' + safeTab);
            if (typeof canvasNarrate === 'function') canvasNarrate('artStudio', 'studioStart', 'Opened ' + (label || ART_STUDIO_TAB_LABELS[safeTab] || 'Art Studio') + '.', { debounce: 300 });
          };
          const WATERCOLOR_PIGMENTS = [
            { id: 'ultramarine', color: '#2f6fb0', label: 'Ultramarine', description: 'granulating, transparent, low staining, medium mobility', values: { watercolorGranulation: 78, watercolorStaining: 34, watercolorOpacity: 28, watercolorMobility: 62 } },
            { id: 'crimson', color: '#b4233c', label: 'Crimson', description: 'smooth, transparent, high staining, high mobility', values: { watercolorGranulation: 18, watercolorStaining: 84, watercolorOpacity: 22, watercolorMobility: 82 } },
            { id: 'ochre', color: '#c48a28', label: 'Ochre', description: 'granulating, opaque, low staining, low mobility', values: { watercolorGranulation: 56, watercolorStaining: 42, watercolorOpacity: 78, watercolorMobility: 34 } },
            { id: 'viridian', color: '#2f8063', label: 'Viridian', description: 'granulating, semi-transparent, medium staining and mobility', values: { watercolorGranulation: 68, watercolorStaining: 58, watercolorOpacity: 34, watercolorMobility: 54 } },
            { id: 'violet', color: '#453b72', label: 'Violet', description: 'smooth, transparent, high staining and mobility', values: { watercolorGranulation: 38, watercolorStaining: 76, watercolorOpacity: 26, watercolorMobility: 72 } }
          ];
          const getWatercolorPigment = function (id) {
            for (var pigmentIndex = 0; pigmentIndex < WATERCOLOR_PIGMENTS.length; pigmentIndex++) {
              if (WATERCOLOR_PIGMENTS[pigmentIndex].id === id) return WATERCOLOR_PIGMENTS[pigmentIndex];
            }
            return WATERCOLOR_PIGMENTS[0];
          };
          const mixWatercolorPigments = function (first, second, secondPercent) {
            var secondWeight = Math.max(0, Math.min(1, Number(secondPercent) / 100));
            var firstWeight = 1 - secondWeight;
            var firstNumber = parseInt(first.color.slice(1), 16);
            var secondNumber = parseInt(second.color.slice(1), 16);
            var firstRgb = [(firstNumber >> 16) & 255, (firstNumber >> 8) & 255, firstNumber & 255];
            var secondRgb = [(secondNumber >> 16) & 255, (secondNumber >> 8) & 255, secondNumber & 255];
            var mixedRgb = firstRgb.map(function (channel, channelIndex) {
              // Interpolate optical absorbance rather than display RGB. This
              // produces the darker, less neon mixtures expected from paint.
              var firstReflectance = (channel + 12) / 267;
              var secondReflectance = (secondRgb[channelIndex] + 12) / 267;
              var reflectance = Math.exp(Math.log(firstReflectance) * firstWeight + Math.log(secondReflectance) * secondWeight);
              return Math.max(0, Math.min(255, Math.round(reflectance * 267 - 12)));
            });
            var mixedColor = '#' + mixedRgb.map(function (channel) { return channel.toString(16).padStart(2, '0'); }).join('');
            var mixedValues = {};
            ['watercolorGranulation', 'watercolorStaining', 'watercolorOpacity', 'watercolorMobility'].forEach(function (key) {
              mixedValues[key] = Math.round(first.values[key] * firstWeight + second.values[key] * secondWeight);
            });
            return { color: mixedColor, values: mixedValues, firstWeight: firstWeight, secondWeight: secondWeight };
          };
          const persistWatercolorBeforeLeave = function () {
            if (tab !== 'watercolor' || typeof document === 'undefined') return;
            var watercolorCanvas = document.getElementById('watercolorCanvas');
            if (!watercolorCanvas || !watercolorCanvas._watercolorEngine || !watercolorCanvas._watercolorEngine.captureSnapshot) return;
            var watercolorEngine = watercolorCanvas._watercolorEngine;
            if (watercolorEngine.persistState) watercolorEngine.persistState();
            else {
              var flatSnapshot = watercolorEngine.captureSnapshot();
              if (watercolorEngine.captureState) {
                var liveState = watercolorEngine.captureState();
                liveState.flatSnapshot = flatSnapshot;
                _artStudioWatercolorCache.state = liveState;
              }
              upd('watercolorSnapshot', flatSnapshot);
            }
          };
          const openStudioHome = function () {
            persistWatercolorBeforeLeave();
            var nextState = { studioHome: true };
            if (tab === 'stereogram') {
              _cancelStereoAnimWork(false);
              nextState.stereoAnimPlaying = false;
              nextState.stereoAnimRendering = false;
              nextState.stereoAnimProgress = 0;
              nextState.stereoAnimAiMotionStatus = '';
            }
            updMany(nextState);
            focusArtStudioTarget('artstudio-home-title');
          };
          const closeArtStudio = function (nextTool) {
            persistWatercolorBeforeLeave();
            if (tab === 'stereogram') {
              _cancelStereoAnimWork(true);
              updMany({
                stereoAnimPlaying: false,
                stereoAnimRendering: false,
                stereoAnimHasFrames: false,
                stereoAnimProgress: 0,
                stereoAnimAiMotionStatus: ''
              });
            }
            setStemLabTool(nextTool);
          };
          const captureCurrentArtwork = function () {
            if (typeof document === 'undefined') return null;
            var panel = document.getElementById('artstudio-panel-' + tab);
            if (!panel) return null;
            var canvases = panel.querySelectorAll('canvas');
            var preferredCanvasId = tab === 'stereogram' ? ((d.stereoAnimMode || 'static') === 'animate' ? 'stereoAnimCanvas' : 'stereoCanvas') : '';
            var canvas = preferredCanvasId ? panel.querySelector('#' + preferredCanvasId) : null;
            for (var ci = 0; !canvas && ci < canvases.length; ci++) {
              var candidate = canvases[ci];
              if (candidate && candidate.getAttribute('aria-hidden') !== 'true' && candidate.width > 0 && candidate.height > 0) {
                canvas = candidate;
                break;
              }
            }
            if (!canvas) return null;
            var src = '';
            try {
              src = canvas._watercolorEngine && canvas._watercolorEngine.captureSnapshot
                ? canvas._watercolorEngine.captureSnapshot()
                : canvas.toDataURL('image/png');
            } catch (_) { return null; }
            if (!src || src === 'data:,') return null;
            var label = ART_STUDIO_TAB_LABELS[tab] || 'Art Studio artwork';
            var altText = canvas.getAttribute('aria-label') || label + ' artwork created in Art Studio.';
            return {
              src: src,
              title: 'Art Studio — ' + label,
              altText: String(altText).replace(/\s+/g, ' ').trim().slice(0, 300),
              sourceTool: 'artStudio',
              sourceTab: tab,
              createdAt: Date.now()
            };
          };
          const sendArtworkTo = function (destination) {
            persistWatercolorBeforeLeave();
            var artwork = captureCurrentArtwork();
            if (!artwork) {
              if (typeof addToast === 'function') addToast('Finish or open an artwork canvas on this tab before sending it.', 'info');
              return;
            }
            if (typeof onUseArtwork !== 'function') {
              if (typeof addToast === 'function') addToast('Artwork handoff is not available in this version of AlloFlow.', 'info');
              return;
            }
            onUseArtwork(artwork, destination);
          };
          const artStudioTabKeyDown = function (e, index, tabOrder) {
            var order = Array.isArray(tabOrder) && tabOrder.length ? tabOrder : ART_STUDIO_TAB_ORDER;
            let nextIndex = -1;
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIndex = (index + 1) % order.length;
            else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIndex = (index + order.length - 1) % order.length;
            else if (e.key === 'Home') nextIndex = 0;
            else if (e.key === 'End') nextIndex = order.length - 1;
            if (nextIndex < 0) return;
            e.preventDefault();
            const tabs = e.currentTarget && e.currentTarget.parentNode
              ? e.currentTarget.parentNode.querySelectorAll('[role="tab"]')
              : [];
            const nextTab = tabs[nextIndex];
            if (nextTab) {
              nextTab.focus();
              nextTab.click();
            }
          };
          const selectArtStudioTab = function (nextTab, label) {
            if (nextTab !== 'watercolor') persistWatercolorBeforeLeave();
            var nextState = { tab: nextTab, artNavGroup: artStudioGroupForTab(nextTab).id, studioHome: false, studioStarted: true };
            if (tab === 'stereogram' && nextTab !== 'stereogram') {
              _cancelStereoAnimWork(true);
              nextState.stereoAnimPlaying = false;
              nextState.stereoAnimRendering = false;
              nextState.stereoAnimHasFrames = false;
              nextState.stereoAnimProgress = 0;
              nextState.stereoAnimAiMotionStatus = '';
            }
            updMany(nextState);
            if (typeof canvasNarrate === 'function') canvasNarrate('artStudio', 'tabSwitch', 'Switched to ' + label + ' canvas tool.', { debounce: 500 });
          };
          const createArtStudioSnapshotData = function () {
            var snapshot = { ...d };
            if (Array.isArray(snapshot.stereoAnimKeyframes)) {
              snapshot.stereoAnimKeyframes = snapshot.stereoAnimKeyframes.slice(-ART_STUDIO_MAX_ANIM_KEYFRAMES);
            }
            // Rendered output frames live in the component runtime, not tool data.
            // Reset matching UI flags so a restored snapshot never claims that
            // missing frames are playing or still rendering.
            snapshot.stereoAnimPlaying = false;
            snapshot.stereoAnimRendering = false;
            snapshot.stereoAnimHasFrames = false;
            snapshot.stereoAnimProgress = 0;
            snapshot.stereoAnimIndex = 0;
            snapshot.stereoAnimAiGenerating = false;
            snapshot.stereoAnimAiMotionStatus = '';
            return snapshot;
          };
          const saveArtStudioSnapshot = function () {
            persistWatercolorBeforeLeave();
            if (typeof setToolSnapshots !== 'function') {
              if (typeof addToast === 'function') addToast('Snapshot saving is not available here.', 'warning');
              return;
            }
            var now = Date.now();
            var snapshotLabel = 'Art Studio - ' + (ART_STUDIO_TAB_LABELS[tab] || 'Workspace');
            setToolSnapshots(function (prev) {
              return (prev || []).concat([{
                id: 'art-' + now,
                tool: 'artStudio',
                label: snapshotLabel,
                data: createArtStudioSnapshotData(),
                timestamp: now
              }]);
            });
            if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Art snapshot saved!', 'success');
          };
          const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;

          // Canvas Narration: Art Studio init
          if (typeof canvasNarrate === 'function') canvasNarrate('artStudio', 'init', {
            first: studioHomeOpen ? 'Art Studio loaded. Choose a creative path to begin, or ask for a surprise.' : 'Art Studio loaded. Explore color theory, watercolor, pixel art, symmetry drawing, spirographs, fractals, and more. Use the tabs to switch between tools.',
            repeat: 'Art Studio ready.',
            terse: 'Art Studio ready.'
          });



          // Color Wheel Canvas

          const wheelRef = function (canvas) {

            if (!canvas) return;

            if (canvas._wheelAnim) cancelAnimationFrame(canvas._wheelAnim);

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - 20;

            var tick = 0;

            var hue = d.hue || 0, sat = d.sat !== undefined ? d.sat : 100, lit = d.lit !== undefined ? d.lit : 50;

            // Pre-render the static 360-segment hue ring ONCE. sat/lit are frozen for
            // this loop instance (wheelRef re-runs with fresh values on slider change),
            // so the ring was rebuilt + 360 hsl-strings allocated EVERY frame purely to
            // pulse the 2px selector dot. Cache it; redraw only the dot/markers live.
            var _wheelBmp = document.createElement('canvas'); _wheelBmp.setAttribute('aria-hidden', 'true');
            _wheelBmp.width = W; _wheelBmp.height = H;
            var _wctx = _wheelBmp.getContext('2d');
            for (var wa = 0; wa < 360; wa++) {
              var wr1 = (wa - 90) * Math.PI / 180, wr2 = (wa - 89) * Math.PI / 180;
              _wctx.beginPath(); _wctx.moveTo(cx, cy); _wctx.arc(cx, cy, R, wr1, wr2); _wctx.closePath();
              _wctx.fillStyle = 'hsl(' + wa + ',' + sat + '%,' + lit + '%)'; _wctx.fill();
            }



            function drawWheel() {

              tick++;

              ctx.clearRect(0, 0, W, H);

              ctx.drawImage(_wheelBmp, 0, 0); // cached static hue ring (was a 360-arc rebuild every frame)

              ctx.beginPath(); ctx.arc(cx, cy, R * 0.35, 0, Math.PI * 2);

              ctx.fillStyle = 'hsl(' + hue + ',' + sat + '%,' + lit + '%)'; ctx.fill();

              ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();

              var selRad = (hue - 90) * Math.PI / 180;

              var sx = cx + Math.cos(selRad) * R * 0.75;

              var sy = cy + Math.sin(selRad) * R * 0.75;

              ctx.beginPath(); ctx.arc(sx, sy, reducedMotion ? 8 : 8 + Math.sin(tick * 0.06) * 2, 0, Math.PI * 2);

              ctx.shadowBlur = 14; ctx.shadowColor = 'hsl(' + hue + ',' + sat + '%,' + lit + '%)';

              ctx.fillStyle = '#fff'; ctx.fill();

              ctx.shadowBlur = 0;

              ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();

              ctx.fillStyle = lit > 55 ? '#000' : '#fff';

              ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

              ctx.fillText('H:' + hue + '\u00B0', cx, cy - 8);

              ctx.fillText('S:' + sat + '% L:' + lit + '%', cx, cy + 8);

              var harmony = d.harmony || 'complementary';

              var harmAngles = [];

              if (harmony === 'complementary') harmAngles = [(hue + 180) % 360];

              else if (harmony === 'triadic') harmAngles = [(hue + 120) % 360, (hue + 240) % 360];

              else if (harmony === 'analogous') harmAngles = [(hue + 30) % 360, (hue - 30 + 360) % 360];

              else if (harmony === 'split') harmAngles = [(hue + 150) % 360, (hue + 210) % 360];

              harmAngles.forEach(function (ha) {

                var hr = (ha - 90) * Math.PI / 180;

                var hx = cx + Math.cos(hr) * R * 0.75, hy = cy + Math.sin(hr) * R * 0.75;

                ctx.beginPath(); ctx.arc(hx, hy, 6, 0, Math.PI * 2);

                ctx.fillStyle = 'hsl(' + ha + ',' + sat + '%,' + lit + '%)'; ctx.fill();

                ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();

              });

              if (!reducedMotion && canvas.isConnected) canvas._wheelAnim = requestAnimationFrame(drawWheel);

            }

            function chooseHue(angle, messagePrefix) {

              hue = (angle + 360) % 360;

              canvas.setAttribute('aria-label', 'Interactive color wheel. Hue ' + hue + ' degrees, saturation ' + sat +

                ' percent, lightness ' + lit + ' percent.');

              upd('hue', hue);

              if (typeof announceToSR === 'function') announceToSR((messagePrefix || 'Hue') + ' ' + hue + ' degrees.');

            }

            canvas.onmousedown = canvas.ontouchstart = function (e) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              var scaleX = W / rect.width, scaleY = H / rect.height;

              ex *= scaleX; ey *= scaleY;

              var dx = ex - cx, dy = ey - cy;

              var dist = Math.sqrt(dx * dx + dy * dy);

              if (dist < R && dist > R * 0.35) {

                chooseHue(Math.round((Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360), 'Selected hue');

              }

            };

            canvas.onkeydown = function(event) {

              var step = event.shiftKey ? 10 : 1;

              var handled = true;

              if (event.key === 'ArrowRight' || event.key === 'ArrowUp') chooseHue(hue + step, 'Hue');

              else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') chooseHue(hue - step, 'Hue');

              else if (event.key === 'Home') chooseHue(0, 'Hue');

              else if (event.key === 'End') chooseHue(359, 'Hue');

              else handled = false;

              if (handled) event.preventDefault();

            };

            canvas.setAttribute('aria-label', 'Interactive color wheel. Hue ' + hue + ' degrees, saturation ' + sat +

              ' percent, lightness ' + lit + ' percent.');

            drawWheel();

          };



          // Watercolor Simulation Canvas

          // This is intentionally a small, self-contained fluid/pigment model:
          // water and pigment live on a 192x192 grid, then get upscaled into
          // the display canvas. Keeping the hot loop here (rather than in
          // React state) makes wet-on-wet diffusion inexpensive and keeps
          // session snapshots from filling up with per-frame pixel data.
          const watercolorRef = function (canvas) {
            if (!canvas) return;

            function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

            function parseColor(value) {
              var hex = String(value || '#2f6fb0').replace('#', '');
              if (hex.length === 3) hex = hex.split('').map(function (ch) { return ch + ch; }).join('');
              var num = parseInt(hex, 16);
              if (!isFinite(num)) num = parseInt('2f6fb0', 16);
              return {
                r: ((num >> 16) & 255) / 255,
                g: ((num >> 8) & 255) / 255,
                b: (num & 255) / 255
              };
            }

            function readParams() {
              var size = Number(d.watercolorSize);
              var water = Number(d.watercolorWater);
              var pigment = Number(d.watercolorPigment);
              var paper = Number(d.watercolorPaper);
              var granulation = Number(d.watercolorGranulation);
              var bleed = Number(d.watercolorBleed);
              var absorption = Number(d.watercolorAbsorption);
              var drying = Number(d.watercolorDrying);
              var flowStrength = Number(d.watercolorFlowStrength);
              var staining = Number(d.watercolorStaining);
              var opacity = Number(d.watercolorOpacity);
              var mobility = Number(d.watercolorMobility);
              var separation = Number(d.watercolorSeparation);
              var rewetting = Number(d.watercolorRewetting);
              var humidity = Number(d.watercolorHumidity);
              var airflow = Number(d.watercolorAirflow);
              var sizing = Number(d.watercolorSizing);
              var bloomSensitivity = Number(d.watercolorBloomSensitivity);
              return {
                color: parseColor(d.watercolorColor || '#2f6fb0'),
                brush: d.watercolorBrush || 'round',
                surface: d.watercolorSurface || 'wet',
                flowDirection: d.watercolorFlowDirection || 'down',
                showWetness: !!d.watercolorShowWetness,
                showFlow: !!d.watercolorShowFlow,
                size: clamp(isFinite(size) ? size : 28, 8, 80),
                water: clamp((isFinite(water) ? water : 72) / 100, 0, 1),
                pigment: clamp((isFinite(pigment) ? pigment : 68) / 100, 0, 1),
                paper: clamp((isFinite(paper) ? paper : 48) / 100, 0, 1),
                granulation: clamp((isFinite(granulation) ? granulation : 54) / 100, 0, 1),
                bleed: clamp((isFinite(bleed) ? bleed : 62) / 100, 0, 1),
                absorption: clamp((isFinite(absorption) ? absorption : 52) / 100, 0, 1),
                drying: clamp((isFinite(drying) ? drying : 50) / 100, 0, 1),
                flowStrength: clamp((isFinite(flowStrength) ? flowStrength : 60) / 100, 0, 1),
                staining: clamp((isFinite(staining) ? staining : 50) / 100, 0, 1),
                opacity: clamp((isFinite(opacity) ? opacity : 40) / 100, 0, 1),
                mobility: clamp((isFinite(mobility) ? mobility : 55) / 100, 0, 1),
                separation: clamp((isFinite(separation) ? separation : 70) / 100, 0, 1),
                rewetting: clamp((isFinite(rewetting) ? rewetting : 48) / 100, 0, 1),
                humidity: clamp((isFinite(humidity) ? humidity : 45) / 100, 0, 1),
                airflow: clamp((isFinite(airflow) ? airflow : 25) / 100, 0, 1),
                sizing: clamp((isFinite(sizing) ? sizing : 58) / 100, 0, 1),
                bloomSensitivity: clamp((isFinite(bloomSensitivity) ? bloomSensitivity : 60) / 100, 0, 1)
              };
            }

            var existing = canvas._watercolorEngine;
            if (existing) {
              existing.configure(readParams(), d.watercolorSnapshot || '');
              return;
            }

            var SIM_W = 192, SIM_H = 192, COUNT = SIM_W * SIM_H;
            var mainCtx = canvas.getContext('2d');
            if (!mainCtx) return;

            var simCanvas = document.createElement('canvas');
            simCanvas.setAttribute('aria-hidden', 'true');
            simCanvas.width = SIM_W; simCanvas.height = SIM_H;
            var simCtx = simCanvas.getContext('2d');

            var paperCanvas = document.createElement('canvas');
            paperCanvas.setAttribute('aria-hidden', 'true');
            paperCanvas.width = SIM_W; paperCanvas.height = SIM_H;
            var paperCtx = paperCanvas.getContext('2d');
            var paperImage = paperCtx.createImageData(SIM_W, SIM_H);
            var paperNoise = new Float32Array(COUNT);
            var granulationNoise = new Float32Array(COUNT);

            function seededNoise(seed) {
              var value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
              return value - Math.floor(value);
            }

            for (var pi = 0; pi < COUNT; pi++) {
              var grain = seededNoise(pi + 11.7);
              paperNoise[pi] = grain;
              var fiber = seededNoise(pi * 0.37 + 91.4);
              var cellX = pi % SIM_W;
              var cellY = Math.floor(pi / SIM_W);
              var cluster = seededNoise(Math.floor(cellX / 6) * 17.13 + Math.floor(cellY / 6) * 31.71 + 8.4);
              var microCluster = seededNoise(pi * 0.73 + 17.2);
              granulationNoise[pi] = clamp(cluster * 0.78 + microCluster * 0.22, 0, 1);
              var tone = 247 + Math.round((grain - 0.5) * 7 + (fiber - 0.5) * 2);
              var po = pi * 4;
              paperImage.data[po] = clamp(tone + 2, 0, 255);
              paperImage.data[po + 1] = clamp(tone + 1, 0, 255);
              paperImage.data[po + 2] = clamp(tone, 0, 255);
              paperImage.data[po + 3] = 255;
            }
            paperCtx.putImageData(paperImage, 0, 0);

            var water = new Float32Array(COUNT);
            var nextWater = new Float32Array(COUNT);
            var pigmentR = new Float32Array(COUNT);
            var pigmentG = new Float32Array(COUNT);
            var pigmentB = new Float32Array(COUNT);
            var pigmentDensity = new Float32Array(COUNT);
            var pigmentStainingMass = new Float32Array(COUNT);
            var pigmentOpacityMass = new Float32Array(COUNT);
            var pigmentGranulationMass = new Float32Array(COUNT);
            var pigmentMobilityMass = new Float32Array(COUNT);
            // Channel-weighted mobility keeps unlike pigments distinct while
            // they share a wet cell, allowing realistic color separation.
            var pigmentMobilityRMass = new Float32Array(COUNT);
            var pigmentMobilityGMass = new Float32Array(COUNT);
            var pigmentMobilityBMass = new Float32Array(COUNT);
            // Mobile pigment travels with water; stain pigment has settled into
            // the paper fibers. Keeping both layers makes glazing and lifting
            // behave more like transparent watercolor on real paper.
            var stainR = new Float32Array(COUNT);
            var stainG = new Float32Array(COUNT);
            var stainB = new Float32Array(COUNT);
            var stainDensity = new Float32Array(COUNT);
            var stainStainingMass = new Float32Array(COUNT);
            var stainOpacityMass = new Float32Array(COUNT);
            var stainGranulationMass = new Float32Array(COUNT);
            var stainMobilityMass = new Float32Array(COUNT);
            var stainMobilityRMass = new Float32Array(COUNT);
            var stainMobilityGMass = new Float32Array(COUNT);
            var stainMobilityBMass = new Float32Array(COUNT);
            var nextR = new Float32Array(COUNT);
            var nextG = new Float32Array(COUNT);
            var nextB = new Float32Array(COUNT);
            var nextDensity = new Float32Array(COUNT);
            var nextStainingMass = new Float32Array(COUNT);
            var nextOpacityMass = new Float32Array(COUNT);
            var nextGranulationMass = new Float32Array(COUNT);
            var nextMobilityMass = new Float32Array(COUNT);
            var nextMobilityRMass = new Float32Array(COUNT);
            var nextMobilityGMass = new Float32Array(COUNT);
            var nextMobilityBMass = new Float32Array(COUNT);
            var bloom = new Float32Array(COUNT);
            var nextBloom = new Float32Array(COUNT);
            // Masking fluid is a non-porous resist layer. Pigment and water
            // cannot enter masked fibers until the artist peels it away.
            var mask = new Float32Array(COUNT);
            var pigmentImage = simCtx.createImageData(SIM_W, SIM_H);
            var params = readParams();
            var baseImage = null;
            var loadedSnapshot = '';
            var ignoredFlatSnapshot = '';
            var wetCells = 0;
            var maskedCells = 0;
            var waterTotal = 0;
            var running = false;
            var paused = false;
            var frameId = 0;
            var lastTime = 0;
            var accumulator = 0;
            var drawing = false;
            var lastX = null, lastY = null;
            var lastStrokeTime = 0;
            var lastPressure = 0.7;
            var lastTilt = 0;
            var lastBrushAngle = 0;
            var keyboardX = SIM_W / 2, keyboardY = SIM_H / 2;
            var reservoirWater = 1;
            var reservoirPigment = 1;
            var strokeSeed = 1;
            var lastStatusKey = '';
            var durableStateKey = d.watercolorStateKey || '';
            var persistenceTimer = 0;
            var localRevision = 0;
            var STEP = 1 / 30;

            function updateA11y() {
              canvas.setAttribute('aria-label', 'Watercolor painting canvas using a ' + params.brush +
                ' brush on ' + params.surface + ' paper. Brush size ' + Math.round(params.size) +
                ' pixels, water ' + Math.round(params.water * 100) + ' percent, pigment ' +
                Math.round(params.pigment * 100) + ' percent, granulation ' +
                Math.round(params.granulation * 100) + ' percent, bleed ' +
                Math.round(params.bleed * 100) + ' percent, absorption ' +
                Math.round(params.absorption * 100) + ' percent, drying rate ' +
                Math.round(params.drying * 100) + ' percent, flow ' + params.flowDirection + ' at ' +
                Math.round(params.flowStrength * 100) + ' percent strength, staining ' +
                Math.round(params.staining * 100) + ' percent, opacity ' +
                Math.round(params.opacity * 100) + ' percent, pigment mobility ' +
                Math.round(params.mobility * 100) + ' percent, chromatic separation ' +
                Math.round(params.separation * 100) + ' percent, rewetting sensitivity ' +
                Math.round(params.rewetting * 100) + ' percent, studio humidity ' +
                Math.round(params.humidity * 100) + ' percent, airflow ' +
                Math.round(params.airflow * 100) + ' percent, paper sizing ' +
                Math.round(params.sizing * 100) + ' percent, bloom sensitivity ' +
                Math.round(params.bloomSensitivity * 100) + ' percent. ' +
                (params.showWetness ? 'Wetness map visible. ' : '') +
                (params.showFlow ? 'Flow vectors visible. ' : '') +
                (paused ? 'Drying is paused.' : 'Drying is active.'));
            }

            function loadSnapshot(url) {
              url = url || '';
              if (url === loadedSnapshot) return;
              loadedSnapshot = url;
              baseImage = null;
              if (!url) { render(); return; }
              var image = new Image();
              image.onload = function () { baseImage = image; render(); };
              image.onerror = function () { loadedSnapshot = ''; baseImage = null; render(); };
              image.src = url;
            }

            function updateStatus() {
              if (typeof document === 'undefined') return;
              var status = document.getElementById('artstudio-watercolor-status');
              if (!status) return;
              var averageWater = wetCells > 0 ? waterTotal / wetCells : 0;
              var stage = 'Dry';
              if (wetCells > 0 && averageWater > 0.72) stage = 'Very wet';
              else if (wetCells > 0 && averageWater > 0.24) stage = 'Wet';
              else if (wetCells > 0) stage = 'Damp';
              var coverage = wetCells > 0
                ? Math.max(1, Math.min(100, Math.ceil((wetCells / COUNT * 100) / 5) * 5))
                : 0;
              var waterLoad = Math.round(reservoirWater * 10) * 10;
              var pigmentLoad = Math.round(reservoirPigment * 10) * 10;
              var maskCoverage = maskedCells > 0
                ? Math.max(1, Math.min(100, Math.ceil((maskedCells / COUNT * 100) / 5) * 5))
                : 0;
              var humidityPercent = Math.round(params.humidity * 100);
              var airflowPercent = Math.round(params.airflow * 100);
              var sizingPercent = Math.round(params.sizing * 100);
              var bloomPercent = Math.round(params.bloomSensitivity * 100);
              var statusKey = stage + '|' + coverage + '|' + maskCoverage + '|' + waterLoad + '|' + pigmentLoad + '|' + humidityPercent + '|' + airflowPercent + '|' + sizingPercent + '|' + bloomPercent + '|' + paused;
              if (statusKey === lastStatusKey) return;
              lastStatusKey = statusKey;
              status.textContent = 'Paper: ' + stage + ' | active area ' + coverage + '%. Brush load: ' +
                waterLoad + '% water | ' + pigmentLoad + '% pigment. Masked area: ' + maskCoverage + '%.' +
                ' Climate: ' + humidityPercent + '% humidity | ' + airflowPercent + '% airflow.' +
                ' Paper chemistry: ' + sizingPercent + '% sizing | ' + bloomPercent + '% bloom response.' +
                (paused ? ' Drying paused.' : ' Drying active.') + ' Wet-state autosave on.';
            }

            function updateHistoryControls() {
              if (typeof document === 'undefined') return;
              var undoButton = document.getElementById('artstudio-watercolor-undo');
              var redoButton = document.getElementById('artstudio-watercolor-redo');
              if (undoButton) undoButton.disabled = _artStudioWatercolorCache.undo.length === 0;
              if (redoButton) redoButton.disabled = _artStudioWatercolorCache.redo.length === 0;
            }

            function updatePauseControl() {
              if (typeof document === 'undefined') return;
              var pauseButton = document.getElementById('artstudio-watercolor-pause');
              if (!pauseButton) return;
              pauseButton.setAttribute('aria-pressed', paused ? 'true' : 'false');
              pauseButton.textContent = paused
                ? (pauseButton.getAttribute('data-resume-label') || 'Resume drying')
                : (pauseButton.getAttribute('data-pause-label') || 'Pause drying');
            }

            function packStateArray(source, maxValue) {
              var packed = new Uint16Array(source.length);
              var scale = 65535 / maxValue;
              for (var packedIndex = 0; packedIndex < source.length; packedIndex++) {
                packed[packedIndex] = Math.round(clamp(source[packedIndex], 0, maxValue) * scale);
              }
              return packed;
            }

            function snapshotStateArray(source, maxValue, compact) {
              return compact ? packStateArray(source, maxValue) : source.slice(0);
            }

            function restoreStateArray(target, source, maxValue, packedFormat) {
              if (!source || source.length !== COUNT) return false;
              if (packedFormat === 'uint16-v1') {
                var scale = maxValue / 65535;
                for (var restoredIndex = 0; restoredIndex < COUNT; restoredIndex++) target[restoredIndex] = source[restoredIndex] * scale;
              } else target.set(source);
              return true;
            }

            function captureState(compact) {
              return {
                version: 9,
                packed: compact ? 'uint16-v1' : '',
                simWidth: SIM_W,
                simHeight: SIM_H,
                baseSnapshot: loadedSnapshot,
                water: snapshotStateArray(water, 1.5, compact),
                pigmentR: snapshotStateArray(pigmentR, 2.5, compact),
                pigmentG: snapshotStateArray(pigmentG, 2.5, compact),
                pigmentB: snapshotStateArray(pigmentB, 2.5, compact),
                pigmentDensity: snapshotStateArray(pigmentDensity, 2.5, compact),
                pigmentStainingMass: snapshotStateArray(pigmentStainingMass, 2.5, compact),
                pigmentOpacityMass: snapshotStateArray(pigmentOpacityMass, 2.5, compact),
                pigmentGranulationMass: snapshotStateArray(pigmentGranulationMass, 2.5, compact),
                pigmentMobilityMass: snapshotStateArray(pigmentMobilityMass, 2.5, compact),
                pigmentMobilityRMass: snapshotStateArray(pigmentMobilityRMass, 2.5, compact),
                pigmentMobilityGMass: snapshotStateArray(pigmentMobilityGMass, 2.5, compact),
                pigmentMobilityBMass: snapshotStateArray(pigmentMobilityBMass, 2.5, compact),
                stainR: snapshotStateArray(stainR, 2.5, compact),
                stainG: snapshotStateArray(stainG, 2.5, compact),
                stainB: snapshotStateArray(stainB, 2.5, compact),
                stainDensity: snapshotStateArray(stainDensity, 3.5, compact),
                stainStainingMass: snapshotStateArray(stainStainingMass, 3.5, compact),
                stainOpacityMass: snapshotStateArray(stainOpacityMass, 3.5, compact),
                stainGranulationMass: snapshotStateArray(stainGranulationMass, 3.5, compact),
                stainMobilityMass: snapshotStateArray(stainMobilityMass, 3.5, compact),
                stainMobilityRMass: snapshotStateArray(stainMobilityRMass, 3.5, compact),
                stainMobilityGMass: snapshotStateArray(stainMobilityGMass, 3.5, compact),
                stainMobilityBMass: snapshotStateArray(stainMobilityBMass, 3.5, compact),
                bloom: snapshotStateArray(bloom, 1, compact),
                mask: snapshotStateArray(mask, 1, compact),
                reservoirWater: reservoirWater,
                reservoirPigment: reservoirPigment,
                paused: paused,
                strokeSeed: strokeSeed,
                keyboardX: keyboardX,
                keyboardY: keyboardY
              };
            }

            function restoreState(state) {
              if (!state || state.simWidth !== SIM_W || state.simHeight !== SIM_H ||
                  !state.water || state.water.length !== COUNT) return false;
              if (frameId) cancelAnimationFrame(frameId);
              running = false;
              drawing = false;
              lastX = null; lastY = null;
              lastStrokeTime = 0;
              loadSnapshot(state.baseSnapshot || '');
              restoreStateArray(water, state.water, 1.5, state.packed);
              pigmentR.fill(0); pigmentG.fill(0); pigmentB.fill(0);
              pigmentDensity.fill(0); pigmentStainingMass.fill(0); pigmentOpacityMass.fill(0); pigmentGranulationMass.fill(0); pigmentMobilityMass.fill(0); pigmentMobilityRMass.fill(0); pigmentMobilityGMass.fill(0); pigmentMobilityBMass.fill(0);
              stainR.fill(0); stainG.fill(0); stainB.fill(0); stainDensity.fill(0); stainStainingMass.fill(0); stainOpacityMass.fill(0); stainGranulationMass.fill(0); stainMobilityMass.fill(0); stainMobilityRMass.fill(0); stainMobilityGMass.fill(0); stainMobilityBMass.fill(0); bloom.fill(0); mask.fill(0);
              restoreStateArray(pigmentR, state.pigmentR, 2.5, state.packed);
              restoreStateArray(pigmentG, state.pigmentG, 2.5, state.packed);
              restoreStateArray(pigmentB, state.pigmentB, 2.5, state.packed);
              restoreStateArray(pigmentDensity, state.pigmentDensity, 2.5, state.packed);
              restoreStateArray(pigmentStainingMass, state.pigmentStainingMass, 2.5, state.packed);
              restoreStateArray(pigmentOpacityMass, state.pigmentOpacityMass, 2.5, state.packed);
              restoreStateArray(pigmentGranulationMass, state.pigmentGranulationMass, 2.5, state.packed);
              restoreStateArray(pigmentMobilityMass, state.pigmentMobilityMass, 2.5, state.packed);
              restoreStateArray(pigmentMobilityRMass, state.pigmentMobilityRMass, 2.5, state.packed);
              restoreStateArray(pigmentMobilityGMass, state.pigmentMobilityGMass, 2.5, state.packed);
              restoreStateArray(pigmentMobilityBMass, state.pigmentMobilityBMass, 2.5, state.packed);
              restoreStateArray(stainR, state.stainR, 2.5, state.packed);
              restoreStateArray(stainG, state.stainG, 2.5, state.packed);
              restoreStateArray(stainB, state.stainB, 2.5, state.packed);
              restoreStateArray(stainDensity, state.stainDensity, 3.5, state.packed);
              restoreStateArray(stainStainingMass, state.stainStainingMass, 3.5, state.packed);
              restoreStateArray(stainOpacityMass, state.stainOpacityMass, 3.5, state.packed);
              restoreStateArray(stainGranulationMass, state.stainGranulationMass, 3.5, state.packed);
              restoreStateArray(stainMobilityMass, state.stainMobilityMass, 3.5, state.packed);
              restoreStateArray(stainMobilityRMass, state.stainMobilityRMass, 3.5, state.packed);
              restoreStateArray(stainMobilityGMass, state.stainMobilityGMass, 3.5, state.packed);
              restoreStateArray(stainMobilityBMass, state.stainMobilityBMass, 3.5, state.packed);
              restoreStateArray(bloom, state.bloom, 1, state.packed);
              restoreStateArray(mask, state.mask, 1, state.packed);
              if (!state.pigmentDensity || state.pigmentDensity.length !== COUNT || !state.stainDensity || state.stainDensity.length !== COUNT) {
                for (var legacyIndex = 0; legacyIndex < COUNT; legacyIndex++) {
                  if (!state.pigmentDensity || state.pigmentDensity.length !== COUNT) pigmentDensity[legacyIndex] = Math.max(pigmentR[legacyIndex], pigmentG[legacyIndex], pigmentB[legacyIndex]);
                  if (!state.stainDensity || state.stainDensity.length !== COUNT) stainDensity[legacyIndex] = Math.max(stainR[legacyIndex], stainG[legacyIndex], stainB[legacyIndex]);
                }
              }
              if (!state.pigmentStainingMass || state.pigmentStainingMass.length !== COUNT ||
                  !state.pigmentOpacityMass || state.pigmentOpacityMass.length !== COUNT ||
                  !state.pigmentGranulationMass || state.pigmentGranulationMass.length !== COUNT ||
                  !state.pigmentMobilityMass || state.pigmentMobilityMass.length !== COUNT ||
                  !state.stainStainingMass || state.stainStainingMass.length !== COUNT ||
                  !state.stainOpacityMass || state.stainOpacityMass.length !== COUNT ||
                  !state.stainGranulationMass || state.stainGranulationMass.length !== COUNT ||
                  !state.stainMobilityMass || state.stainMobilityMass.length !== COUNT) {
                for (var propertyIndex = 0; propertyIndex < COUNT; propertyIndex++) {
                  if (!state.pigmentStainingMass || state.pigmentStainingMass.length !== COUNT) pigmentStainingMass[propertyIndex] = pigmentDensity[propertyIndex] * params.staining;
                  if (!state.pigmentOpacityMass || state.pigmentOpacityMass.length !== COUNT) pigmentOpacityMass[propertyIndex] = pigmentDensity[propertyIndex] * params.opacity;
                  if (!state.pigmentGranulationMass || state.pigmentGranulationMass.length !== COUNT) pigmentGranulationMass[propertyIndex] = pigmentDensity[propertyIndex] * params.granulation;
                  if (!state.pigmentMobilityMass || state.pigmentMobilityMass.length !== COUNT) pigmentMobilityMass[propertyIndex] = pigmentDensity[propertyIndex] * params.mobility;
                  if (!state.stainStainingMass || state.stainStainingMass.length !== COUNT) stainStainingMass[propertyIndex] = stainDensity[propertyIndex] * params.staining;
                  if (!state.stainOpacityMass || state.stainOpacityMass.length !== COUNT) stainOpacityMass[propertyIndex] = stainDensity[propertyIndex] * params.opacity;
                  if (!state.stainGranulationMass || state.stainGranulationMass.length !== COUNT) stainGranulationMass[propertyIndex] = stainDensity[propertyIndex] * params.granulation;
                  if (!state.stainMobilityMass || state.stainMobilityMass.length !== COUNT) stainMobilityMass[propertyIndex] = stainDensity[propertyIndex] * params.mobility;
                }
              }
              if (!state.pigmentMobilityRMass || state.pigmentMobilityRMass.length !== COUNT ||
                  !state.pigmentMobilityGMass || state.pigmentMobilityGMass.length !== COUNT ||
                  !state.pigmentMobilityBMass || state.pigmentMobilityBMass.length !== COUNT ||
                  !state.stainMobilityRMass || state.stainMobilityRMass.length !== COUNT ||
                  !state.stainMobilityGMass || state.stainMobilityGMass.length !== COUNT ||
                  !state.stainMobilityBMass || state.stainMobilityBMass.length !== COUNT) {
                for (var channelPropertyIndex = 0; channelPropertyIndex < COUNT; channelPropertyIndex++) {
                  var legacyMobility = pigmentDensity[channelPropertyIndex] > 0.0001
                    ? clamp(pigmentMobilityMass[channelPropertyIndex] / pigmentDensity[channelPropertyIndex], 0, 1)
                    : params.mobility;
                  var legacyStainMobility = stainDensity[channelPropertyIndex] > 0.0001
                    ? clamp(stainMobilityMass[channelPropertyIndex] / stainDensity[channelPropertyIndex], 0, 1)
                    : params.mobility;
                  if (!state.pigmentMobilityRMass || state.pigmentMobilityRMass.length !== COUNT) pigmentMobilityRMass[channelPropertyIndex] = pigmentR[channelPropertyIndex] * legacyMobility;
                  if (!state.pigmentMobilityGMass || state.pigmentMobilityGMass.length !== COUNT) pigmentMobilityGMass[channelPropertyIndex] = pigmentG[channelPropertyIndex] * legacyMobility;
                  if (!state.pigmentMobilityBMass || state.pigmentMobilityBMass.length !== COUNT) pigmentMobilityBMass[channelPropertyIndex] = pigmentB[channelPropertyIndex] * legacyMobility;
                  if (!state.stainMobilityRMass || state.stainMobilityRMass.length !== COUNT) stainMobilityRMass[channelPropertyIndex] = stainR[channelPropertyIndex] * legacyStainMobility;
                  if (!state.stainMobilityGMass || state.stainMobilityGMass.length !== COUNT) stainMobilityGMass[channelPropertyIndex] = stainG[channelPropertyIndex] * legacyStainMobility;
                  if (!state.stainMobilityBMass || state.stainMobilityBMass.length !== COUNT) stainMobilityBMass[channelPropertyIndex] = stainB[channelPropertyIndex] * legacyStainMobility;
                }
              }
              nextWater.fill(0); nextR.fill(0); nextG.fill(0); nextB.fill(0); nextDensity.fill(0); nextStainingMass.fill(0); nextOpacityMass.fill(0); nextGranulationMass.fill(0); nextMobilityMass.fill(0); nextMobilityRMass.fill(0); nextMobilityGMass.fill(0); nextMobilityBMass.fill(0); nextBloom.fill(0);
              wetCells = 0;
              maskedCells = 0;
              waterTotal = 0;
              for (var wi = 0; wi < COUNT; wi++) {
                waterTotal += water[wi];
                if (water[wi] > 0.004) wetCells++;
                if (mask[wi] > 0.04) maskedCells++;
              }
              reservoirWater = clamp(Number(state.reservoirWater), 0, 1);
              reservoirPigment = clamp(Number(state.reservoirPigment), 0, 1);
              if (!isFinite(reservoirWater)) reservoirWater = 1;
              if (!isFinite(reservoirPigment)) reservoirPigment = 1;
              paused = !!state.paused;
              strokeSeed = isFinite(Number(state.strokeSeed)) ? Number(state.strokeSeed) : 1;
              keyboardX = clamp(isFinite(Number(state.keyboardX)) ? Number(state.keyboardX) : SIM_W / 2, 0, SIM_W - 1);
              keyboardY = clamp(isFinite(Number(state.keyboardY)) ? Number(state.keyboardY) : SIM_H / 2, 0, SIM_H - 1);
              lastStatusKey = '';
              render();
              updateHistoryControls();
              updatePauseControl();
              if (wetCells > 0 && !paused) ensureLoop();
              return true;
            }

            function persistStateNow() {
              if (persistenceTimer) clearTimeout(persistenceTimer);
              persistenceTimer = 0;
              if (drawing) {
                scheduleDurablePersistence(350);
                return '';
              }
              var flatSnapshot = captureCleanSnapshot();
              if (!flatSnapshot || flatSnapshot === 'data:,') return '';
              var durableState = captureState(true);
              durableState.flatSnapshot = flatSnapshot;
              _artStudioWatercolorCache.state = durableState;
              ignoredFlatSnapshot = flatSnapshot;
              if (!durableStateKey) durableStateKey = _artStudioWatercolorStateStore.createKey();
              saveWatercolorMetadata(flatSnapshot, durableStateKey);
              _artStudioWatercolorStateStore.save(durableStateKey, durableState);
              return flatSnapshot;
            }

            function scheduleDurablePersistence(delay) {
              if (persistenceTimer) clearTimeout(persistenceTimer);
              persistenceTimer = setTimeout(function () {
                persistenceTimer = 0;
                if (canvas._watercolorEngine !== engine || (typeof canvas.isConnected === 'boolean' && !canvas.isConnected)) return;
                persistStateNow();
              }, Math.max(0, Number(delay) || 0));
            }

            function discardDurableState() {
              if (persistenceTimer) clearTimeout(persistenceTimer);
              persistenceTimer = 0;
              var discardedKey = durableStateKey;
              durableStateKey = '';
              _artStudioWatercolorCache.state = null;
              if (discardedKey) _artStudioWatercolorStateStore.remove(discardedKey);
              saveWatercolorMetadata('', '');
            }

            function trimHistory(stack) {
              while (stack.length > _artStudioWatercolorCache.maxHistory) stack.shift();
            }

            function pushHistory() {
              _artStudioWatercolorCache.undo.push(captureState(true));
              trimHistory(_artStudioWatercolorCache.undo);
              _artStudioWatercolorCache.redo.length = 0;
              updateHistoryControls();
            }

            function undoState() {
              if (_artStudioWatercolorCache.undo.length === 0) return false;
              _artStudioWatercolorCache.redo.push(captureState(true));
              trimHistory(_artStudioWatercolorCache.redo);
              var previous = _artStudioWatercolorCache.undo.pop();
              var restored = restoreState(previous);
              if (restored) { localRevision += 1; scheduleDurablePersistence(500); }
              updateHistoryControls();
              return restored;
            }

            function redoState() {
              if (_artStudioWatercolorCache.redo.length === 0) return false;
              _artStudioWatercolorCache.undo.push(captureState(true));
              trimHistory(_artStudioWatercolorCache.undo);
              var next = _artStudioWatercolorCache.redo.pop();
              var restored = restoreState(next);
              if (restored) { localRevision += 1; scheduleDurablePersistence(500); }
              updateHistoryControls();
              return restored;
            }

            function drawFlowDiagnostics() {
              if (params.flowDirection === 'none') return;
              var vectorX = params.flowDirection === 'right' ? 1 : (params.flowDirection === 'left' ? -1 : 0);
              var vectorY = params.flowDirection === 'down' ? 1 : (params.flowDirection === 'up' ? -1 : 0);
              var scaleX = canvas.width / SIM_W;
              var scaleY = canvas.height / SIM_H;
              var arrowLength = 5 + params.flowStrength * 11;
              mainCtx.save();
              mainCtx.strokeStyle = 'rgba(8, 145, 178, 0.92)';
              mainCtx.lineWidth = Math.max(1.25, canvas.width / 420);
              mainCtx.lineCap = 'round';
              mainCtx.lineJoin = 'round';
              for (var guideY = 14; guideY < SIM_H; guideY += 24) {
                for (var guideX = 14; guideX < SIM_W; guideX += 24) {
                  var guideIndex = guideY * SIM_W + guideX;
                  var localWater = clamp(water[guideIndex], 0, 1);
                  if (localWater < 0.018) continue;
                  var startX = guideX * scaleX;
                  var startY = guideY * scaleY;
                  var endX = startX + vectorX * arrowLength;
                  var endY = startY + vectorY * arrowLength;
                  var perpendicularX = -vectorY;
                  var perpendicularY = vectorX;
                  var headLength = 3.5;
                  mainCtx.globalAlpha = 0.35 + localWater * 0.55;
                  mainCtx.beginPath();
                  mainCtx.moveTo(startX, startY);
                  mainCtx.lineTo(endX, endY);
                  mainCtx.moveTo(endX, endY);
                  mainCtx.lineTo(endX - vectorX * headLength + perpendicularX * headLength * 0.7, endY - vectorY * headLength + perpendicularY * headLength * 0.7);
                  mainCtx.moveTo(endX, endY);
                  mainCtx.lineTo(endX - vectorX * headLength - perpendicularX * headLength * 0.7, endY - vectorY * headLength - perpendicularY * headLength * 0.7);
                  mainCtx.stroke();
                }
              }
              mainCtx.restore();
            }

            function render(includeDiagnostics) {
              var diagnosticsEnabled = includeDiagnostics !== false;
              var showWetness = diagnosticsEnabled && params.showWetness;
              var data = pigmentImage.data;
              for (var i = 0; i < COUNT; i++) {
                var mobileMass = pigmentDensity[i];
                var stainMass = stainDensity[i];
                var r = pigmentR[i] + stainR[i];
                var g = pigmentG[i] + stainG[i];
                var b = pigmentB[i] + stainB[i];
                var mass = mobileMass + stainMass;
                var maskAmount = mask[i];
                var offset = i * 4;
                if (mass < 0.0001) {
                  if (maskAmount > 0.01) {
                    var maskGrain = 0.92 + paperNoise[i] * 0.10;
                    data[offset] = Math.round(196 * maskGrain);
                    data[offset + 1] = Math.round(218 * maskGrain);
                    data[offset + 2] = Math.round(220 * maskGrain);
                    data[offset + 3] = Math.round(clamp(maskAmount * 0.48, 0.04, 0.48) * 255);
                  } else {
                    data[offset] = 0; data[offset + 1] = 0; data[offset + 2] = 0; data[offset + 3] = 0;
                  }
                  if (showWetness && water[i] > 0.004) {
                    var clearWetness = clamp(water[i] / 1.15, 0, 1);
                    var clearWetBlend = 0.18 + clearWetness * 0.34;
                    var clearWetAlpha = Math.round((0.10 + clearWetness * 0.40) * 255);
                    data[offset] = Math.round((data[offset] || 52) * (1 - clearWetBlend) + 34 * clearWetBlend);
                    data[offset + 1] = Math.round((data[offset + 1] || 178) * (1 - clearWetBlend) + 190 * clearWetBlend);
                    data[offset + 2] = Math.round((data[offset + 2] || 226) * (1 - clearWetBlend) + 235 * clearWetBlend);
                    data[offset + 3] = Math.max(data[offset + 3], clearWetAlpha);
                  }
                  continue;
                }

                var dryCell = clamp(1 - water[i] * 0.86, 0, 1);
                var localGranulation = clamp((pigmentGranulationMass[i] + stainGranulationMass[i]) / Math.max(0.0001, mass), 0, 1);
                var granuleTone = (granulationNoise[i] - 0.5) * localGranulation * dryCell;
                var transparentLayering = mobileMass * 0.30 + stainMass * 0.43;
                var density = clamp(transparentLayering * (0.88 + params.pigment * 0.78) *
                  (0.84 + dryCell * 0.20) * (1 + bloom[i] * 0.42 + Math.max(0, granuleTone) * 0.46), 0, 3.2);
                var averageR = clamp(r / Math.max(0.0001, mass), 0, 1);
                var averageG = clamp(g / Math.max(0.0001, mass), 0, 1);
                var averageB = clamp(b / Math.max(0.0001, mass), 0, 1);
                var localOpacity = clamp((pigmentOpacityMass[i] + stainOpacityMass[i]) / Math.max(0.0001, mass), 0, 1);
                // Beer-Lambert-style channel absorption gives overlapping
                // washes subtractive depth without making light glazes opaque.
                var opticalR = Math.exp(-density * (0.07 + (1 - averageR) * 0.28));
                var opticalG = Math.exp(-density * (0.07 + (1 - averageG) * 0.28));
                var opticalB = Math.exp(-density * (0.07 + (1 - averageB) * 0.28));
                var grainTone = clamp(0.95 + (paperNoise[i] - 0.5) * 0.13 * params.paper - Math.max(0, granuleTone) * 0.08, 0.82, 1.08);
                var alpha = clamp(1 - Math.exp(-density * (0.68 + localOpacity * 0.50)) + bloom[i] * 0.045, 0.02, 0.97);
                var renderedR = clamp(averageR * 255 * opticalR * grainTone, 0, 255);
                var renderedG = clamp(averageG * 255 * opticalG * grainTone, 0, 255);
                var renderedB = clamp(averageB * 255 * opticalB * grainTone, 0, 255);
                var scattering = clamp(localOpacity * dryCell * (0.035 + stainMass * 0.025), 0, 0.18);
                renderedR = renderedR * (1 - scattering) + averageR * 255 * scattering;
                renderedG = renderedG * (1 - scattering) + averageG * 255 * scattering;
                renderedB = renderedB * (1 - scattering) + averageB * 255 * scattering;
                var maskFilm = maskAmount * 0.58;
                data[offset] = Math.round(renderedR * (1 - maskFilm) + 196 * maskFilm);
                data[offset + 1] = Math.round(renderedG * (1 - maskFilm) + 218 * maskFilm);
                data[offset + 2] = Math.round(renderedB * (1 - maskFilm) + 220 * maskFilm);
                data[offset + 3] = Math.round(Math.max(alpha, maskAmount * 0.48) * 255);
                if (showWetness && water[i] > 0.004) {
                  var paintedWetness = clamp(water[i] / 1.15, 0, 1);
                  var paintedWetBlend = 0.10 + paintedWetness * 0.24;
                  data[offset] = Math.round(data[offset] * (1 - paintedWetBlend) + 44 * paintedWetBlend);
                  data[offset + 1] = Math.round(data[offset + 1] * (1 - paintedWetBlend) + 196 * paintedWetBlend);
                  data[offset + 2] = Math.round(data[offset + 2] * (1 - paintedWetBlend) + 235 * paintedWetBlend);
                  data[offset + 3] = Math.max(data[offset + 3], Math.round((0.12 + paintedWetness * 0.32) * 255));
                }
              }
              simCtx.putImageData(pigmentImage, 0, 0);
              mainCtx.save();
              mainCtx.clearRect(0, 0, canvas.width, canvas.height);
              mainCtx.imageSmoothingEnabled = true;
              if (baseImage) mainCtx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
              else mainCtx.drawImage(paperCanvas, 0, 0, canvas.width, canvas.height);
              mainCtx.drawImage(simCanvas, 0, 0, canvas.width, canvas.height);
              if (diagnosticsEnabled && params.showFlow) drawFlowDiagnostics();
              mainCtx.restore();
              updateStatus();
            }

            function captureCleanSnapshot() {
              var snapshot = '';
              render(false);
              try { snapshot = canvas.toDataURL('image/png'); }
              catch (_) { snapshot = ''; }
              render(true);
              return snapshot;
            }

            function stepSimulation() {
              var flow = params.surface === 'wet' ? 0.16 + params.bleed * 0.22 : 0.08 + params.bleed * 0.10;
              flow *= 0.82 + params.sizing * 0.34;
              var evaporation = params.surface === 'wet'
                ? 0.0036 + (1 - params.bleed) * 0.0018
                : 0.007 + (1 - params.bleed) * 0.0025;
              evaporation *= 0.45 + params.drying * 1.10;
              evaporation *= (1.30 - params.humidity * 0.82) * (0.78 + params.airflow * 0.78);
              var pigmentFlow = params.surface === 'wet' ? 0.10 + params.bleed * 0.16 : 0.035 + params.bleed * 0.07;
              pigmentFlow *= 0.80 + params.sizing * 0.32;
              var gravityStrength = params.surface === 'wet' ? 0.028 + params.bleed * 0.072 : 0.012 + params.bleed * 0.035;
              gravityStrength *= 0.10 + params.flowStrength * 1.50;
              var effectiveAbsorption = params.absorption * (1 - params.sizing * 0.62);
              var absorptionStrength = params.surface === 'wet' ? 0.001 + effectiveAbsorption * 0.004 : 0.002 + effectiveAbsorption * 0.006;
              var nextWetCells = 0;
              var nextWaterTotal = 0;

              for (var y = 0; y < SIM_H; y++) {
                for (var x = 0; x < SIM_W; x++) {
                  var i = y * SIM_W + x;
                  var left = x > 0 ? i - 1 : i;
                  var right = x < SIM_W - 1 ? i + 1 : i;
                  var up = y > 0 ? i - SIM_W : i;
                  var down = y < SIM_H - 1 ? i + SIM_W : i;
                  var barrier = clamp(mask[i], 0, 1);
                  var access = 1 - barrier;
                  var w0 = water[i];
                  var wl = water[left] * (1 - mask[left] * 0.98);
                  var wr = water[right] * (1 - mask[right] * 0.98);
                  var wu = water[up] * (1 - mask[up] * 0.98);
                  var wd = water[down] * (1 - mask[down] * 0.98);
                  var neighborWater = (wl + wr + wu + wd) * 0.25;
                  var gradient = clamp(Math.abs(w0 - neighborWater) * 3.2, 0, 1);
                  var upstream = i;
                  if (params.flowDirection === 'down') upstream = up;
                  else if (params.flowDirection === 'up') upstream = down;
                  else if (params.flowDirection === 'right') upstream = left;
                  else if (params.flowDirection === 'left') upstream = right;
                  var gravity = params.flowDirection === 'none' ? 0 : (water[upstream] * (1 - mask[upstream] * 0.98) - w0) * gravityStrength * access;
                  var paperPull = absorptionStrength * (0.45 + paperNoise[i] * 0.55) * w0 * access;
                  var nw = clamp(w0 + (neighborWater - w0) * flow * access + gravity -
                    evaporation * (0.25 + w0) * (0.18 + access * 0.82) - paperPull, 0, 1.5);

                  var totalWater = w0 + wl + wr + wu + wd + 0.0001;
                  var neighborR = (pigmentR[i] * w0 + pigmentR[left] * wl + pigmentR[right] * wr + pigmentR[up] * wu + pigmentR[down] * wd) / totalWater;
                  var neighborG = (pigmentG[i] * w0 + pigmentG[left] * wl + pigmentG[right] * wr + pigmentG[up] * wu + pigmentG[down] * wd) / totalWater;
                  var neighborB = (pigmentB[i] * w0 + pigmentB[left] * wl + pigmentB[right] * wr + pigmentB[up] * wu + pigmentB[down] * wd) / totalWater;
                  var neighborDensity = (pigmentDensity[i] * w0 + pigmentDensity[left] * wl + pigmentDensity[right] * wr + pigmentDensity[up] * wu + pigmentDensity[down] * wd) / totalWater;
                  var neighborStainingMass = (pigmentStainingMass[i] * w0 + pigmentStainingMass[left] * wl + pigmentStainingMass[right] * wr + pigmentStainingMass[up] * wu + pigmentStainingMass[down] * wd) / totalWater;
                  var neighborOpacityMass = (pigmentOpacityMass[i] * w0 + pigmentOpacityMass[left] * wl + pigmentOpacityMass[right] * wr + pigmentOpacityMass[up] * wu + pigmentOpacityMass[down] * wd) / totalWater;
                  var neighborGranulationMass = (pigmentGranulationMass[i] * w0 + pigmentGranulationMass[left] * wl + pigmentGranulationMass[right] * wr + pigmentGranulationMass[up] * wu + pigmentGranulationMass[down] * wd) / totalWater;
                  var neighborMobilityMass = (pigmentMobilityMass[i] * w0 + pigmentMobilityMass[left] * wl + pigmentMobilityMass[right] * wr + pigmentMobilityMass[up] * wu + pigmentMobilityMass[down] * wd) / totalWater;
                  var neighborMobilityRMass = (pigmentMobilityRMass[i] * w0 + pigmentMobilityRMass[left] * wl + pigmentMobilityRMass[right] * wr + pigmentMobilityRMass[up] * wu + pigmentMobilityRMass[down] * wd) / totalWater;
                  var neighborMobilityGMass = (pigmentMobilityGMass[i] * w0 + pigmentMobilityGMass[left] * wl + pigmentMobilityGMass[right] * wr + pigmentMobilityGMass[up] * wu + pigmentMobilityGMass[down] * wd) / totalWater;
                  var neighborMobilityBMass = (pigmentMobilityBMass[i] * w0 + pigmentMobilityBMass[left] * wl + pigmentMobilityBMass[right] * wr + pigmentMobilityBMass[up] * wu + pigmentMobilityBMass[down] * wd) / totalWater;
                  var wetFactor = clamp((w0 + neighborWater) * 0.5, 0, 1);
                  var cellGranulation = pigmentDensity[i] > 0.0001 ? clamp(pigmentGranulationMass[i] / pigmentDensity[i], 0, 1) : params.granulation;
                  var cellMobility = pigmentDensity[i] > 0.0001 ? clamp(pigmentMobilityMass[i] / pigmentDensity[i], 0, 1) : params.mobility;
                  var settling = cellGranulation * (1 - wetFactor) * (0.004 + granulationNoise[i] * 0.018);
                  var cellOpacity = pigmentDensity[i] > 0.0001 ? clamp(pigmentOpacityMass[i] / pigmentDensity[i], 0, 1) : params.opacity;
                  var mobilityCarrierR = pigmentR[i] + neighborR;
                  var mobilityCarrierG = pigmentG[i] + neighborG;
                  var mobilityCarrierB = pigmentB[i] + neighborB;
                  var channelMobilityR = mobilityCarrierR > 0.0001 ? clamp((pigmentMobilityRMass[i] + neighborMobilityRMass) / mobilityCarrierR, 0, 1) : cellMobility;
                  var channelMobilityG = mobilityCarrierG > 0.0001 ? clamp((pigmentMobilityGMass[i] + neighborMobilityGMass) / mobilityCarrierG, 0, 1) : cellMobility;
                  var channelMobilityB = mobilityCarrierB > 0.0001 ? clamp((pigmentMobilityBMass[i] + neighborMobilityBMass) / mobilityCarrierB, 0, 1) : cellMobility;
                  var effectiveMobilityR = cellMobility + (channelMobilityR - cellMobility) * params.separation;
                  var effectiveMobilityG = cellMobility + (channelMobilityG - cellMobility) * params.separation;
                  var effectiveMobilityB = cellMobility + (channelMobilityB - cellMobility) * params.separation;
                  var pigmentMixBase = pigmentFlow * (1.08 - cellOpacity * 0.20) * (0.25 + wetFactor * 0.75) * (1 - cellGranulation * (1 - wetFactor) * 0.18) * (1 - effectiveAbsorption * (1 - wetFactor) * 0.22) * access;
                  var pigmentMix = pigmentMixBase * (0.56 + cellMobility * 0.80);
                  var pigmentMixR = pigmentMixBase * (0.56 + effectiveMobilityR * 0.80);
                  var pigmentMixG = pigmentMixBase * (0.56 + effectiveMobilityG * 0.80);
                  var pigmentMixB = pigmentMixBase * (0.56 + effectiveMobilityB * 0.80);
                  var bloomResponse = (0.35 + params.bloomSensitivity * 1.05) * (0.80 + params.sizing * 0.36);
                  var bloomAmount = gradient * w0 * (0.012 + paperNoise[i] * params.paper * 0.045) * (0.72 + params.bleed * 0.86) * bloomResponse * access;
                  var granuleShift = (granulationNoise[i] - 0.5) * settling;
                  var mixedR = clamp(pigmentR[i] + (neighborR - pigmentR[i]) * pigmentMixR + pigmentR[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedG = clamp(pigmentG[i] + (neighborG - pigmentG[i]) * pigmentMixG + pigmentG[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedB = clamp(pigmentB[i] + (neighborB - pigmentB[i]) * pigmentMixB + pigmentB[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedDensity = clamp(pigmentDensity[i] + (neighborDensity - pigmentDensity[i]) * pigmentMix + pigmentDensity[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedStainingMass = clamp(pigmentStainingMass[i] + (neighborStainingMass - pigmentStainingMass[i]) * pigmentMix + pigmentStainingMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedOpacityMass = clamp(pigmentOpacityMass[i] + (neighborOpacityMass - pigmentOpacityMass[i]) * pigmentMix + pigmentOpacityMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedGranulationMass = clamp(pigmentGranulationMass[i] + (neighborGranulationMass - pigmentGranulationMass[i]) * pigmentMix + pigmentGranulationMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedMobilityMass = clamp(pigmentMobilityMass[i] + (neighborMobilityMass - pigmentMobilityMass[i]) * pigmentMix + pigmentMobilityMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedMobilityRMass = clamp(pigmentMobilityRMass[i] + (neighborMobilityRMass - pigmentMobilityRMass[i]) * pigmentMixR + pigmentMobilityRMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedMobilityGMass = clamp(pigmentMobilityGMass[i] + (neighborMobilityGMass - pigmentMobilityGMass[i]) * pigmentMixG + pigmentMobilityGMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var mixedMobilityBMass = clamp(pigmentMobilityBMass[i] + (neighborMobilityBMass - pigmentMobilityBMass[i]) * pigmentMixB + pigmentMobilityBMass[i] * (bloomAmount + granuleShift), 0, 2.5);
                  var localStaining = mixedDensity > 0.0001 ? clamp(mixedStainingMass / mixedDensity, 0, 1) : params.staining;
                  var fiberFix = clamp(settling + effectiveAbsorption * (1 - wetFactor) *
                    (0.002 + paperNoise[i] * 0.006), 0, 0.065) * (0.65 + localStaining * 0.70);
                  fiberFix = clamp(fiberFix, 0, 0.085);

                  nextWater[i] = nw;
                  nextR[i] = mixedR * (1 - fiberFix);
                  nextG[i] = mixedG * (1 - fiberFix);
                  nextB[i] = mixedB * (1 - fiberFix);
                  nextDensity[i] = mixedDensity * (1 - fiberFix);
                  nextStainingMass[i] = mixedStainingMass * (1 - fiberFix);
                  nextOpacityMass[i] = mixedOpacityMass * (1 - fiberFix);
                  nextGranulationMass[i] = mixedGranulationMass * (1 - fiberFix);
                  nextMobilityMass[i] = mixedMobilityMass * (1 - fiberFix);
                  nextMobilityRMass[i] = mixedMobilityRMass * (1 - fiberFix);
                  nextMobilityGMass[i] = mixedMobilityGMass * (1 - fiberFix);
                  nextMobilityBMass[i] = mixedMobilityBMass * (1 - fiberFix);
                  stainR[i] = clamp(stainR[i] + mixedR * fiberFix, 0, 2.5);
                  stainG[i] = clamp(stainG[i] + mixedG * fiberFix, 0, 2.5);
                  stainB[i] = clamp(stainB[i] + mixedB * fiberFix, 0, 2.5);
                  stainDensity[i] = clamp(stainDensity[i] + mixedDensity * fiberFix, 0, 3.5);
                  stainStainingMass[i] = clamp(stainStainingMass[i] + mixedStainingMass * fiberFix, 0, 3.5);
                  stainOpacityMass[i] = clamp(stainOpacityMass[i] + mixedOpacityMass * fiberFix, 0, 3.5);
                  stainGranulationMass[i] = clamp(stainGranulationMass[i] + mixedGranulationMass * fiberFix, 0, 3.5);
                  stainMobilityMass[i] = clamp(stainMobilityMass[i] + mixedMobilityMass * fiberFix, 0, 3.5);
                  stainMobilityRMass[i] = clamp(stainMobilityRMass[i] + mixedMobilityRMass * fiberFix, 0, 3.5);
                  stainMobilityGMass[i] = clamp(stainMobilityGMass[i] + mixedMobilityGMass * fiberFix, 0, 3.5);
                  stainMobilityBMass[i] = clamp(stainMobilityBMass[i] + mixedMobilityBMass * fiberFix, 0, 3.5);
                  var bloomPersistence = (0.34 + params.humidity * 0.18) * (1 - params.airflow * 0.10);
                  var bloomGradient = gradient * (0.26 + params.bloomSensitivity * 0.80) * (0.82 + params.sizing * 0.30);
                  nextBloom[i] = clamp(bloomGradient + bloom[i] * bloomPersistence, 0, 1);
                  nextWaterTotal += nw;
                  if (nw > 0.004) nextWetCells++;
                }
              }

              var swap;
              swap = water; water = nextWater; nextWater = swap;
              swap = pigmentR; pigmentR = nextR; nextR = swap;
              swap = pigmentG; pigmentG = nextG; nextG = swap;
              swap = pigmentB; pigmentB = nextB; nextB = swap;
              swap = pigmentDensity; pigmentDensity = nextDensity; nextDensity = swap;
              swap = pigmentStainingMass; pigmentStainingMass = nextStainingMass; nextStainingMass = swap;
              swap = pigmentOpacityMass; pigmentOpacityMass = nextOpacityMass; nextOpacityMass = swap;
              swap = pigmentGranulationMass; pigmentGranulationMass = nextGranulationMass; nextGranulationMass = swap;
              swap = pigmentMobilityMass; pigmentMobilityMass = nextMobilityMass; nextMobilityMass = swap;
              swap = pigmentMobilityRMass; pigmentMobilityRMass = nextMobilityRMass; nextMobilityRMass = swap;
              swap = pigmentMobilityGMass; pigmentMobilityGMass = nextMobilityGMass; nextMobilityGMass = swap;
              swap = pigmentMobilityBMass; pigmentMobilityBMass = nextMobilityBMass; nextMobilityBMass = swap;
              swap = bloom; bloom = nextBloom; nextBloom = swap;
              wetCells = nextWetCells;
              waterTotal = nextWaterTotal;
            }

            function tick(now) {
              if (!canvas.isConnected) { running = false; return; }
              if (paused) { running = false; render(); return; }
              var delta = Math.min(0.12, Math.max(0, (now - lastTime) / 1000));
              lastTime = now;
              accumulator += delta;
              var steps = 0;
              while (accumulator >= STEP && steps < 4) {
                stepSimulation();
                accumulator -= STEP;
                steps++;
              }
              if (steps > 0) render();
              if (running && (wetCells > 0 || drawing)) frameId = requestAnimationFrame(tick);
              else { running = false; render(); }
            }

            function ensureLoop() {
              if (paused) { render(); return; }
              if (running || !canvas.isConnected) return;
              running = true;
              lastTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
              frameId = requestAnimationFrame(tick);
            }

            function setCellWater(index, value) {
              var previous = water[index];
              var next = clamp(value, 0, 1.5);
              water[index] = next;
              waterTotal = Math.max(0, waterTotal + next - previous);
              if (previous <= 0.004 && next > 0.004) wetCells++;
              else if (previous > 0.004 && next <= 0.004) wetCells = Math.max(0, wetCells - 1);
            }

            function setCellMask(index, value) {
              var previous = mask[index];
              var next = clamp(value, 0, 1);
              mask[index] = next;
              if (previous <= 0.04 && next > 0.04) maskedCells++;
              else if (previous > 0.04 && next <= 0.04) maskedCells = Math.max(0, maskedCells - 1);
            }

            function remobilizeStain(index, fraction) {
              if (stainDensity[index] <= 0.0001 || fraction <= 0) return 0;
              var densityCapacity = (2.5 - pigmentDensity[index]) / Math.max(0.0001, stainDensity[index]);
              var transferFraction = clamp(Math.min(fraction, densityCapacity), 0, 1);
              if (transferFraction <= 0) return 0;
              var transfer;
              transfer = stainR[index] * transferFraction; stainR[index] -= transfer; pigmentR[index] += transfer;
              transfer = stainG[index] * transferFraction; stainG[index] -= transfer; pigmentG[index] += transfer;
              transfer = stainB[index] * transferFraction; stainB[index] -= transfer; pigmentB[index] += transfer;
              transfer = stainDensity[index] * transferFraction; stainDensity[index] -= transfer; pigmentDensity[index] += transfer;
              transfer = stainStainingMass[index] * transferFraction; stainStainingMass[index] -= transfer; pigmentStainingMass[index] += transfer;
              transfer = stainOpacityMass[index] * transferFraction; stainOpacityMass[index] -= transfer; pigmentOpacityMass[index] += transfer;
              transfer = stainGranulationMass[index] * transferFraction; stainGranulationMass[index] -= transfer; pigmentGranulationMass[index] += transfer;
              transfer = stainMobilityMass[index] * transferFraction; stainMobilityMass[index] -= transfer; pigmentMobilityMass[index] += transfer;
              transfer = stainMobilityRMass[index] * transferFraction; stainMobilityRMass[index] -= transfer; pigmentMobilityRMass[index] += transfer;
              transfer = stainMobilityGMass[index] * transferFraction; stainMobilityGMass[index] -= transfer; pigmentMobilityGMass[index] += transfer;
              transfer = stainMobilityBMass[index] * transferFraction; stainMobilityBMass[index] -= transfer; pigmentMobilityBMass[index] += transfer;
              return transferFraction;
            }

            function addDab(x, y, dynamics) {
              if (typeof dynamics === 'number') dynamics = { pressure: dynamics };
              dynamics = dynamics || {};
              var brushScale = 1, waterScale = 1, pigmentScale = 1, softness = 1;
              var clearWater = params.brush === 'water';
              var liftPigment = params.brush === 'lift';
              var splatter = params.brush === 'splatter';
              var saltTexture = params.brush === 'salt';
              var maskingFluid = params.brush === 'mask';
              var peelMask = params.brush === 'peel';
              var flatBrush = params.brush === 'flat';
              var mopBrush = params.brush === 'mop';
              var riggerBrush = params.brush === 'rigger';
              if (params.brush === 'wash') { brushScale = 1.55; waterScale = 1.38; pigmentScale = 0.42; softness = 1.24; }
              if (params.brush === 'dry') { brushScale = 0.72; waterScale = 0.22; pigmentScale = 1.15; softness = 0.72; }
              if (flatBrush) { brushScale = 1.05; waterScale = 0.82; pigmentScale = 0.92; softness = 0.68; }
              if (mopBrush) { brushScale = 1.52; waterScale = 1.58; pigmentScale = 0.48; softness = 1.48; }
              if (riggerBrush) { brushScale = 0.52; waterScale = 0.70; pigmentScale = 0.94; softness = 0.82; }
              if (clearWater) { brushScale = 1.18; waterScale = 1.62; pigmentScale = 0; softness = 1.32; }
              if (liftPigment) { brushScale = 0.92; waterScale = 0.78; pigmentScale = 0; softness = 1.05; }
              if (splatter) { brushScale = 1.75; waterScale = 0.78; pigmentScale = 0.82; softness = 0.68; }
              if (saltTexture) { brushScale = 1.08; waterScale = 0; pigmentScale = 0; softness = 0.9; }
              if (maskingFluid) { brushScale = 0.88; waterScale = 0; pigmentScale = 0; softness = 1.12; }
              if (peelMask) { brushScale = 1.02; waterScale = 0; pigmentScale = 0; softness = 0.94; }
              if (params.surface === 'wet') waterScale *= 1.18;
              else { waterScale *= 0.62; pigmentScale *= 1.08; }

              var safePressure = dynamics.pressure > 0 ? clamp(dynamics.pressure, 0.05, 1) : 0.7;
              var speed = clamp(Number(dynamics.speed) || 0, 0, 1);
              var tilt = clamp(Number(dynamics.tilt) || 0, 0, 1);
              var brushAngle = Number(dynamics.angle) || 0;
              var depositScale = clamp(isFinite(Number(dynamics.depositScale)) ? Number(dynamics.depositScale) : 1, 0.2, 1.4);
              var speedDeposit = 1 - speed * 0.46;
              waterScale *= 0.78 + speedDeposit * 0.28;
              pigmentScale *= 0.72 + speedDeposit * 0.36;
              var waterLoad = clamp(0.56 + reservoirWater * 0.44, 0.32, 1);
              var pigmentLoad = clamp(0.48 + reservoirPigment * 0.52, 0.28, 1);
              var radius = Math.max(1.5, params.size * (SIM_W / Math.max(1, canvas.width)) * brushScale * (0.72 + safePressure * 0.46));
              var aspect = 1 + tilt * (params.brush === 'wash' ? 1.05 : 0.72);
              var majorRadius = radius * aspect;
              var minorRadius = radius / (1 + tilt * 0.18);
              if (flatBrush) { majorRadius = radius * (1.42 + tilt * 0.42); minorRadius = radius * (0.44 - tilt * 0.08); }
              else if (mopBrush) { majorRadius = radius * (1 + tilt * 0.26); minorRadius = radius * (1 - tilt * 0.10); }
              else if (riggerBrush) { majorRadius = radius * (1.86 + tilt * 0.32); minorRadius = Math.max(0.9, radius * (0.34 - tilt * 0.06)); }
              var extent = Math.max(majorRadius, minorRadius);
              var angleCos = Math.cos(brushAngle), angleSin = Math.sin(brushAngle);
              var minX = Math.max(0, Math.floor(x - extent - 1));
              var maxX = Math.min(SIM_W - 1, Math.ceil(x + extent + 1));
              var minY = Math.max(0, Math.floor(y - extent - 1));
              var maxY = Math.min(SIM_H - 1, Math.ceil(y + extent + 1));
              var color = params.color;

              for (var yy = minY; yy <= maxY; yy++) {
                for (var xx = minX; xx <= maxX; xx++) {
                  var dx = xx - x, dy = yy - y;
                  var rotatedX = dx * angleCos + dy * angleSin;
                  var rotatedY = -dx * angleSin + dy * angleCos;
                  var normalizedDistance;
                  if (flatBrush) {
                    var flatX = Math.abs(rotatedX) / majorRadius;
                    var flatY = Math.abs(rotatedY) / minorRadius;
                    normalizedDistance = Math.pow(Math.pow(flatX, 6) + Math.pow(flatY, 6), 1 / 6);
                  } else normalizedDistance = Math.sqrt((rotatedX * rotatedX) / (majorRadius * majorRadius) + (rotatedY * rotatedY) / (minorRadius * minorRadius));
                  if (normalizedDistance > 1) continue;
                  var falloff = Math.pow(1 - normalizedDistance, softness);
                  var index = yy * SIM_W + xx;
                  var dropletNoise = seededNoise(index * 0.91 + strokeSeed * 37.4);
                  if (splatter && dropletNoise < 0.73) continue;
                  if (params.brush === 'dry' && seededNoise(index * 0.23 + strokeSeed * 11.8) < 0.10 + speed * 0.18 + params.paper * 0.08) continue;
                  if (flatBrush && seededNoise(Math.floor((rotatedY + minorRadius) * 4.2) + strokeSeed * 19.7) < 0.035 + speed * 0.045) continue;
                  var texture = 0.78 + paperNoise[index] * (0.24 + params.paper * 0.26);
                  var deposit = falloff * texture * speedDeposit * depositScale * (splatter ? 0.42 + dropletNoise * 0.88 : 1);
                  if (maskingFluid) {
                    var adhesion = clamp(1 - water[index] * 0.72, 0.22, 1);
                    setCellMask(index, mask[index] + deposit * adhesion * (0.42 + safePressure * 0.46));
                    continue;
                  }
                  if (peelMask) {
                    setCellMask(index, mask[index] - deposit * (0.62 + safePressure * 0.54));
                    continue;
                  }
                  var resist = 1 - mask[index];
                  if (resist <= 0.01) continue;
                  deposit *= resist;
                  if (saltTexture) {
                    var saltCenter = clamp(1 - normalizedDistance, 0, 1);
                    var saltRing = clamp(1 - Math.abs(normalizedDistance - 0.72) * 5.5, 0, 1);
                    var saltPreDensity = pigmentDensity[index] + stainDensity[index];
                    var saltGranulation = saltPreDensity > 0.0001
                      ? clamp((pigmentGranulationMass[index] + stainGranulationMass[index]) / saltPreDensity, 0, 1)
                      : params.granulation;
                    var saltLift = clamp(deposit * (0.10 + saltGranulation * 0.24) * saltCenter, 0, 0.58);
                    pigmentR[index] *= 1 - saltLift;
                    pigmentG[index] *= 1 - saltLift;
                    pigmentB[index] *= 1 - saltLift;
                    pigmentDensity[index] *= 1 - saltLift;
                    pigmentStainingMass[index] *= 1 - saltLift;
                    pigmentOpacityMass[index] *= 1 - saltLift;
                    pigmentGranulationMass[index] *= 1 - saltLift;
                    pigmentMobilityMass[index] *= 1 - saltLift;
                    pigmentMobilityRMass[index] *= 1 - saltLift;
                    pigmentMobilityGMass[index] *= 1 - saltLift;
                    pigmentMobilityBMass[index] *= 1 - saltLift;
                    var saltCellDensity = pigmentDensity[index] + stainDensity[index];
                    var saltCellStaining = saltCellDensity > 0.0001
                      ? clamp((pigmentStainingMass[index] + stainStainingMass[index]) / saltCellDensity, 0, 1)
                      : params.staining;
                    var fixedSaltLift = saltLift * (0.14 - saltCellStaining * 0.12);
                    stainR[index] *= 1 - fixedSaltLift;
                    stainG[index] *= 1 - fixedSaltLift;
                    stainB[index] *= 1 - fixedSaltLift;
                    stainDensity[index] *= 1 - fixedSaltLift;
                    stainStainingMass[index] *= 1 - fixedSaltLift;
                    stainOpacityMass[index] *= 1 - fixedSaltLift;
                    stainGranulationMass[index] *= 1 - fixedSaltLift;
                    stainMobilityMass[index] *= 1 - fixedSaltLift;
                    stainMobilityRMass[index] *= 1 - fixedSaltLift;
                    stainMobilityGMass[index] *= 1 - fixedSaltLift;
                    stainMobilityBMass[index] *= 1 - fixedSaltLift;
                    setCellWater(index, water[index] * (1 - saltLift * 0.22));
                    bloom[index] = clamp(bloom[index] + saltRing * deposit * 0.34, 0, 1);
                    continue;
                  }
                  var waterAmount = deposit * params.water * waterScale * 0.62 * waterLoad;
                  var pigmentAmount = deposit * params.pigment * pigmentScale * 0.42 * (0.64 + safePressure * 0.4) * pigmentLoad;
                  setCellWater(index, water[index] + waterAmount);
                  if (!liftPigment && waterAmount > 0.0001 && params.rewetting > 0 && stainDensity[index] > 0.0001) {
                    var settledStaining = clamp(stainStainingMass[index] / stainDensity[index], 0, 1);
                    var settledGranulation = clamp(stainGranulationMass[index] / stainDensity[index], 0, 1);
                    var brushRewetStrength = clearWater ? 1.18 : ((mopBrush || params.brush === 'wash') ? 0.88 : 0.64);
                    var rewetFraction = clamp(waterAmount * params.rewetting * (0.10 + safePressure * 0.08) *
                      (1 - settledStaining * 0.82) * (1 - settledGranulation * 0.22) * brushRewetStrength *
                      (0.72 + params.sizing * 0.48), 0, 0.28);
                    var remobilized = remobilizeStain(index, rewetFraction);
                    if (remobilized > 0) bloom[index] = clamp(bloom[index] + remobilized * (0.18 + params.bleed * 0.20), 0, 1);
                  }
                  if (liftPigment) {
                    var liftAmount = clamp(deposit * (0.10 + params.water * 0.28) * (0.58 + safePressure * 0.42), 0, 0.72);
                    pigmentR[index] *= 1 - liftAmount;
                    pigmentG[index] *= 1 - liftAmount;
                    pigmentB[index] *= 1 - liftAmount;
                    pigmentDensity[index] *= 1 - liftAmount;
                    pigmentStainingMass[index] *= 1 - liftAmount;
                    pigmentOpacityMass[index] *= 1 - liftAmount;
                    pigmentGranulationMass[index] *= 1 - liftAmount;
                    pigmentMobilityMass[index] *= 1 - liftAmount;
                    pigmentMobilityRMass[index] *= 1 - liftAmount;
                    pigmentMobilityGMass[index] *= 1 - liftAmount;
                    pigmentMobilityBMass[index] *= 1 - liftAmount;
                    var liftCellDensity = pigmentDensity[index] + stainDensity[index];
                    var liftCellStaining = liftCellDensity > 0.0001
                      ? clamp((pigmentStainingMass[index] + stainStainingMass[index]) / liftCellDensity, 0, 1)
                      : params.staining;
                    var fixedLift = liftAmount * (0.46 - liftCellStaining * 0.40) * (0.72 + params.sizing * 0.50);
                    stainR[index] *= 1 - fixedLift;
                    stainG[index] *= 1 - fixedLift;
                    stainB[index] *= 1 - fixedLift;
                    stainDensity[index] *= 1 - fixedLift;
                    stainStainingMass[index] *= 1 - fixedLift;
                    stainOpacityMass[index] *= 1 - fixedLift;
                    stainGranulationMass[index] *= 1 - fixedLift;
                    stainMobilityMass[index] *= 1 - fixedLift;
                    stainMobilityRMass[index] *= 1 - fixedLift;
                    stainMobilityGMass[index] *= 1 - fixedLift;
                    stainMobilityBMass[index] *= 1 - fixedLift;
                    bloom[index] *= 1 - liftAmount * 0.55;
                  } else {
                    pigmentR[index] = clamp(pigmentR[index] + color.r * pigmentAmount, 0, 2.5);
                    pigmentG[index] = clamp(pigmentG[index] + color.g * pigmentAmount, 0, 2.5);
                    pigmentB[index] = clamp(pigmentB[index] + color.b * pigmentAmount, 0, 2.5);
                    pigmentDensity[index] = clamp(pigmentDensity[index] + pigmentAmount, 0, 2.5);
                    pigmentStainingMass[index] = clamp(pigmentStainingMass[index] + pigmentAmount * params.staining, 0, 2.5);
                    pigmentOpacityMass[index] = clamp(pigmentOpacityMass[index] + pigmentAmount * params.opacity, 0, 2.5);
                    pigmentGranulationMass[index] = clamp(pigmentGranulationMass[index] + pigmentAmount * params.granulation, 0, 2.5);
                    pigmentMobilityMass[index] = clamp(pigmentMobilityMass[index] + pigmentAmount * params.mobility, 0, 2.5);
                    pigmentMobilityRMass[index] = clamp(pigmentMobilityRMass[index] + color.r * pigmentAmount * params.mobility, 0, 2.5);
                    pigmentMobilityGMass[index] = clamp(pigmentMobilityGMass[index] + color.g * pigmentAmount * params.mobility, 0, 2.5);
                    pigmentMobilityBMass[index] = clamp(pigmentMobilityBMass[index] + color.b * pigmentAmount * params.mobility, 0, 2.5);
                  }
                  bloom[index] = clamp(bloom[index] + deposit * (params.paper * 0.08), 0, 1);
                }
              }
              var waterDrain = params.brush === 'wash' ? 0.026 : (mopBrush ? 0.034 : (riggerBrush ? 0.009 : 0.014));
              var pigmentDrain = (clearWater || liftPigment || saltTexture || maskingFluid || peelMask) ? 0 : (params.brush === 'dry' ? 0.022 : (riggerBrush ? 0.009 : (flatBrush ? 0.019 : 0.016)));
              if (!maskingFluid && !peelMask) reservoirWater = clamp(reservoirWater - waterDrain * depositScale * (0.55 + params.water * 0.7), 0.04, 1);
              reservoirPigment = clamp(reservoirPigment - pigmentDrain * depositScale * (0.55 + params.pigment * 0.7), 0.04, 1);
              updateStatus();
            }

            function pointFor(event) {
              var rect = canvas.getBoundingClientRect();
              return {
                x: clamp((event.clientX - rect.left) * (SIM_W / Math.max(1, rect.width)), 0, SIM_W - 1),
                y: clamp((event.clientY - rect.top) * (SIM_H / Math.max(1, rect.height)), 0, SIM_H - 1)
              };
            }

            var engine = {
              configure: function (nextParams, snapshotUrl) {
                var previousBrush = params.brush;
                var previousColor = params.color;
                params = nextParams || params;
                var colorChanged = !previousColor || !params.color || params.color.r !== previousColor.r ||
                  params.color.g !== previousColor.g || params.color.b !== previousColor.b;
                if (params.brush !== previousBrush || colorChanged) {
                  reservoirWater = 1;
                  reservoirPigment = 1;
                }
                updateA11y();
                snapshotUrl = snapshotUrl || '';
                if (snapshotUrl !== ignoredFlatSnapshot) {
                  ignoredFlatSnapshot = '';
                  loadSnapshot(snapshotUrl);
                }
                render();
                setTimeout(function () { updateStatus(); updateHistoryControls(); updatePauseControl(); }, 0);
              },
              clear: function () {
                localRevision += 1;
                pushHistory();
                if (frameId) cancelAnimationFrame(frameId);
                running = false; wetCells = 0; maskedCells = 0; waterTotal = 0; baseImage = null; loadedSnapshot = ''; ignoredFlatSnapshot = '';
                reservoirWater = 1; reservoirPigment = 1;
                strokeSeed = 1;
                water.fill(0); nextWater.fill(0); pigmentR.fill(0); pigmentG.fill(0); pigmentB.fill(0); pigmentDensity.fill(0); pigmentStainingMass.fill(0); pigmentOpacityMass.fill(0); pigmentGranulationMass.fill(0); pigmentMobilityMass.fill(0); pigmentMobilityRMass.fill(0); pigmentMobilityGMass.fill(0); pigmentMobilityBMass.fill(0);
                stainR.fill(0); stainG.fill(0); stainB.fill(0); stainDensity.fill(0); stainStainingMass.fill(0); stainOpacityMass.fill(0); stainGranulationMass.fill(0); stainMobilityMass.fill(0); stainMobilityRMass.fill(0); stainMobilityGMass.fill(0); stainMobilityBMass.fill(0);
                nextR.fill(0); nextG.fill(0); nextB.fill(0); nextDensity.fill(0); nextStainingMass.fill(0); nextOpacityMass.fill(0); nextGranulationMass.fill(0); nextMobilityMass.fill(0); nextMobilityRMass.fill(0); nextMobilityGMass.fill(0); nextMobilityBMass.fill(0); bloom.fill(0); nextBloom.fill(0); mask.fill(0);
                lastStatusKey = '';
                render();
                discardDurableState();
              },
              dry: function () {
                localRevision += 1;
                pushHistory();
                for (var di = 0; di < COUNT; di++) {
                  stainR[di] = clamp(stainR[di] + pigmentR[di], 0, 2.5);
                  stainG[di] = clamp(stainG[di] + pigmentG[di], 0, 2.5);
                  stainB[di] = clamp(stainB[di] + pigmentB[di], 0, 2.5);
                  stainDensity[di] = clamp(stainDensity[di] + pigmentDensity[di], 0, 3.5);
                  stainStainingMass[di] = clamp(stainStainingMass[di] + pigmentStainingMass[di], 0, 3.5);
                  stainOpacityMass[di] = clamp(stainOpacityMass[di] + pigmentOpacityMass[di], 0, 3.5);
                  stainGranulationMass[di] = clamp(stainGranulationMass[di] + pigmentGranulationMass[di], 0, 3.5);
                  stainMobilityMass[di] = clamp(stainMobilityMass[di] + pigmentMobilityMass[di], 0, 3.5);
                  stainMobilityRMass[di] = clamp(stainMobilityRMass[di] + pigmentMobilityRMass[di], 0, 3.5);
                  stainMobilityGMass[di] = clamp(stainMobilityGMass[di] + pigmentMobilityGMass[di], 0, 3.5);
                  stainMobilityBMass[di] = clamp(stainMobilityBMass[di] + pigmentMobilityBMass[di], 0, 3.5);
                }
                pigmentR.fill(0); pigmentG.fill(0); pigmentB.fill(0); pigmentDensity.fill(0); pigmentStainingMass.fill(0); pigmentOpacityMass.fill(0); pigmentGranulationMass.fill(0); pigmentMobilityMass.fill(0); pigmentMobilityRMass.fill(0); pigmentMobilityGMass.fill(0); pigmentMobilityBMass.fill(0);
                nextR.fill(0); nextG.fill(0); nextB.fill(0); nextDensity.fill(0); nextStainingMass.fill(0); nextOpacityMass.fill(0); nextGranulationMass.fill(0); nextMobilityMass.fill(0); nextMobilityRMass.fill(0); nextMobilityGMass.fill(0); nextMobilityBMass.fill(0);
                water.fill(0); nextWater.fill(0); wetCells = 0; waterTotal = 0;
                lastStatusKey = '';
                render();
                scheduleDurablePersistence(250);
              },
              reload: function () {
                reservoirWater = 1;
                reservoirPigment = 1;
                lastStatusKey = '';
                updateStatus();
                scheduleDurablePersistence(500);
              },
              removeMask: function () {
                if (maskedCells === 0) return false;
                localRevision += 1;
                pushHistory();
                mask.fill(0);
                maskedCells = 0;
                lastStatusKey = '';
                render();
                scheduleDurablePersistence(350);
                return true;
              },
              togglePause: function () {
                localRevision += 1;
                paused = !paused;
                lastStatusKey = '';
                if (paused) {
                  if (frameId) cancelAnimationFrame(frameId);
                  running = false;
                  render();
                } else if (wetCells > 0) ensureLoop();
                updateA11y();
                updateStatus();
                updatePauseControl();
                scheduleDurablePersistence(300);
                return paused;
              },
              dabAt: function (x, y, pressure) { localRevision += 1; pushHistory(); strokeSeed += 1; addDab(x, y, { pressure: pressure || 0.7, speed: 0.12, tilt: 0, angle: 0 }); ensureLoop(); scheduleDurablePersistence(650); },
              undo: undoState,
              redo: redoState,
              captureState: captureState,
              restoreState: restoreState,
              captureSnapshot: captureCleanSnapshot,
              advanceSimulation: function (steps) {
                var count = Math.max(0, Math.min(300, Math.floor(Number(steps) || 0)));
                for (var simulationStep = 0; simulationStep < count; simulationStep++) stepSimulation();
                render();
                return count;
              },
              persistState: persistStateNow,
              discardPersistedState: discardDurableState
            };
            canvas._watercolorEngine = engine;
            canvas.style.touchAction = 'none';

            function dynamicsForEvent(event) {
              var pressure = Number(event.pressure);
              if (!isFinite(pressure) || pressure <= 0) pressure = event.pointerType === 'pen' ? 0.35 : 0.68;
              var tiltX = Number(event.tiltX) || 0;
              var tiltY = Number(event.tiltY) || 0;
              var tilt = clamp(Math.sqrt(tiltX * tiltX + tiltY * tiltY) / 90, 0, 1);
              var angle = tilt > 0.02 ? Math.atan2(tiltY, tiltX) : ((Number(event.twist) || 0) * Math.PI / 180);
              return {
                pressure: clamp(pressure, 0.05, 1),
                tilt: tilt,
                angle: angle,
                time: Number(event.timeStamp) || Date.now()
              };
            }

            function strokeTo(x, y, dynamics) {
              var radius = Math.max(2, params.size * (SIM_W / Math.max(1, canvas.width)) * 0.35);
              var targetPressure = dynamics.pressure;
              var targetTilt = dynamics.tilt;
              var targetAngle = dynamics.angle;
              if (lastX === null || lastY === null) {
                addDab(x, y, { pressure: targetPressure, speed: 0, tilt: targetTilt, angle: targetAngle, depositScale: 1 });
              }
              else {
                var dx = x - lastX, dy = y - lastY;
                var distance = Math.sqrt(dx * dx + dy * dy);
                if (targetTilt < 0.02 && distance > 0.001 && (params.brush === 'flat' || params.brush === 'rigger')) {
                  targetAngle = Math.atan2(dy, dx) + (params.brush === 'flat' ? Math.PI / 2 : 0);
                }
                var elapsed = Math.max(4, dynamics.time - lastStrokeTime);
                var speed = clamp((distance / elapsed) / 0.62, 0, 1);
                var spacingFactor = params.brush === 'dry' ? 0.34 : (params.brush === 'flat' ? 0.27 : (params.brush === 'rigger' ? 0.23 : (params.brush === 'mop' ? 0.40 : 0.46)));
                var spacing = Math.max(0.65, radius * spacingFactor);
                var count = Math.max(1, Math.ceil(distance / spacing));
                var sampleScale = clamp(distance / Math.max(0.001, spacing), 0.22, 1);
                for (var step = 1; step <= count; step++) {
                  var amount = step / count;
                  addDab(lastX + dx * amount, lastY + dy * amount, {
                    pressure: lastPressure + (targetPressure - lastPressure) * amount,
                    speed: speed,
                    tilt: lastTilt + (targetTilt - lastTilt) * amount,
                    angle: lastBrushAngle + (targetAngle - lastBrushAngle) * amount,
                    depositScale: sampleScale
                  });
                }
              }
              lastX = x; lastY = y;
              lastStrokeTime = dynamics.time;
              lastPressure = targetPressure;
              lastTilt = targetTilt;
              lastBrushAngle = targetAngle;
              ensureLoop();
            }

            function paintPointerSamples(event) {
              var samples = typeof event.getCoalescedEvents === 'function' ? event.getCoalescedEvents() : null;
              if (!samples || samples.length === 0) samples = [event];
              for (var sampleIndex = 0; sampleIndex < samples.length; sampleIndex++) {
                var sample = samples[sampleIndex];
                var point = pointFor(sample);
                strokeTo(point.x, point.y, dynamicsForEvent(sample));
              }
            }

            canvas.onpointerdown = function (event) {
              event.preventDefault(); drawing = true; lastX = null; lastY = null;
              lastStrokeTime = 0; lastPressure = 0.7; lastTilt = 0; lastBrushAngle = 0;
              localRevision += 1;
              pushHistory();
              strokeSeed += 1;
              try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
              paintPointerSamples(event);
            };
            canvas.onpointermove = function (event) {
              if (!drawing) return;
              event.preventDefault();
              paintPointerSamples(event);
            };
            canvas.onpointerup = canvas.onpointercancel = function () {
              drawing = false; lastX = null; lastY = null; lastStrokeTime = 0;
              scheduleDurablePersistence(650);
            };
            canvas.onkeydown = function (event) {
              var historyKey = String(event.key || '').toLowerCase();
              if (!event.ctrlKey && !event.metaKey && !event.altKey && historyKey === 'p') {
                event.preventDefault();
                var nowPaused = engine.togglePause();
                if (typeof announceToSR === 'function') announceToSR(nowPaused ? 'Watercolor drying paused.' : 'Watercolor drying resumed.');
                return;
              }
              if ((event.ctrlKey || event.metaKey) && historyKey === 'z') {
                event.preventDefault();
                var didHistoryChange = event.shiftKey ? engine.redo() : engine.undo();
                if (typeof announceToSR === 'function') announceToSR(didHistoryChange ? (event.shiftKey ? 'Watercolor redone.' : 'Watercolor undone.') : (event.shiftKey ? 'Nothing to redo.' : 'Nothing to undo.'));
                return;
              }
              if ((event.ctrlKey || event.metaKey) && historyKey === 'y') {
                event.preventDefault();
                var didRedo = engine.redo();
                if (typeof announceToSR === 'function') announceToSR(didRedo ? 'Watercolor redone.' : 'Nothing to redo.');
                return;
              }
              var move = Math.max(2, params.size * (SIM_W / Math.max(1, canvas.width)) * 0.55);
              var moved = false;
              if (event.key === 'ArrowLeft') { keyboardX = clamp(keyboardX - move, 0, SIM_W - 1); moved = true; }
              else if (event.key === 'ArrowRight') { keyboardX = clamp(keyboardX + move, 0, SIM_W - 1); moved = true; }
              else if (event.key === 'ArrowUp') { keyboardY = clamp(keyboardY - move, 0, SIM_H - 1); moved = true; }
              else if (event.key === 'ArrowDown') { keyboardY = clamp(keyboardY + move, 0, SIM_H - 1); moved = true; }
              else if (event.key === 'Home') { keyboardX = 0; keyboardY = 0; moved = true; }
              else if (event.key === 'End') { keyboardX = SIM_W - 1; keyboardY = SIM_H - 1; moved = true; }
              if (moved) {
                event.preventDefault();
                if (typeof announceToSR === 'function') announceToSR('Watercolor cursor at column ' + Math.round(keyboardX + 1) + ', row ' + Math.round(keyboardY + 1) + '.');
                return;
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                engine.dabAt(keyboardX, keyboardY, 0.7);
                if (typeof announceToSR === 'function') announceToSR('Watercolor dab placed at column ' + Math.round(keyboardX + 1) + ', row ' + Math.round(keyboardY + 1) + '.');
              }
            };

            var incomingSnapshot = d.watercolorSnapshot || '';
            var incomingStateKey = d.watercolorStateKey || '';
            var cachedState = _artStudioWatercolorCache.state;
            if (cachedState && cachedState.flatSnapshot === incomingSnapshot) {
              ignoredFlatSnapshot = incomingSnapshot;
              params = readParams();
              updateA11y();
              restoreState(cachedState);
              setTimeout(function () { updateStatus(); updateHistoryControls(); updatePauseControl(); }, 0);
            } else {
              _artStudioWatercolorCache.state = null;
              _artStudioWatercolorCache.undo.length = 0;
              _artStudioWatercolorCache.redo.length = 0;
              engine.configure(readParams(), incomingSnapshot);
              if (incomingStateKey && incomingSnapshot) {
                var revisionAtLoad = localRevision;
                _artStudioWatercolorStateStore.load(incomingStateKey).then(function (record) {
                  if (!record || !record.state || record.state.flatSnapshot !== incomingSnapshot) return;
                  if (canvas._watercolorEngine !== engine || localRevision !== revisionAtLoad) return;
                  if (typeof canvas.isConnected === 'boolean' && !canvas.isConnected) return;
                  ignoredFlatSnapshot = incomingSnapshot;
                  durableStateKey = incomingStateKey;
                  if (restoreState(record.state)) {
                    _artStudioWatercolorCache.state = record.state;
                    setTimeout(function () { updateStatus(); updateHistoryControls(); updatePauseControl(); }, 0);
                  }
                });
              }
            }
          };



          // Pixel Art Canvas

          const pixelRef = function (canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var gridSize = typeof d.pixelGrid === 'number' ? d.pixelGrid : 16;

            var cellW = W / gridSize, cellH = H / gridSize;

            var grid = d.pixelData || {};

            var painting = false;

            var currentColor = 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)';
            var keyboardCursor = canvas._pixelKeyboardCursor || { x: 0, y: 0 };
            keyboardCursor.x = Math.max(0, Math.min(gridSize - 1, keyboardCursor.x || 0));
            keyboardCursor.y = Math.max(0, Math.min(gridSize - 1, keyboardCursor.y || 0));
            canvas._pixelKeyboardCursor = keyboardCursor;

            function updateKeyboardLabel() {
              var colored = Object.keys(grid).length;
              canvas.setAttribute('aria-label', 'Pixel art editor, ' + gridSize + ' by ' + gridSize + ' grid with ' + colored +
                ' colored cells. Keyboard cursor at row ' + (keyboardCursor.y + 1) + ', column ' + (keyboardCursor.x + 1) + '.');
            }

            function drawPixelGrid() {

              ctx.clearRect(0, 0, W, H);

              ctx.fillStyle = '#1e1e2e'; ctx.fillRect(0, 0, W, H);

              Object.keys(grid).forEach(function (key) {

                var parts = key.split(',');

                ctx.fillStyle = grid[key];

                ctx.fillRect(parseInt(parts[0]) * cellW, parseInt(parts[1]) * cellH, cellW, cellH);

              });

              ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 0.5;

              for (var gx = 0; gx <= gridSize; gx++) { ctx.beginPath(); ctx.moveTo(gx * cellW, 0); ctx.lineTo(gx * cellW, H); ctx.stroke(); }

              for (var gy = 0; gy <= gridSize; gy++) { ctx.beginPath(); ctx.moveTo(0, gy * cellH); ctx.lineTo(W, gy * cellH); ctx.stroke(); }

              if (typeof document !== 'undefined' && document.activeElement === canvas) {
                ctx.save();
                ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
                ctx.strokeRect(keyboardCursor.x * cellW + 2, keyboardCursor.y * cellH + 2, cellW - 4, cellH - 4);
                ctx.strokeStyle = '#111827'; ctx.lineWidth = 2;
                ctx.strokeRect(keyboardCursor.x * cellW + 5, keyboardCursor.y * cellH + 5, cellW - 10, cellH - 10);
                ctx.restore();
              }
              updateKeyboardLabel();

            }

            function floodFill(startX, startY, fillColor) {

              var targetColor = grid[startX + ',' + startY] || null;

              if (targetColor === fillColor) return;

              var queue = [[startX, startY]];

              var visited = {};

              while (queue.length > 0) {

                var cell = queue.shift();

                var cx2 = cell[0], cy2 = cell[1];

                var k = cx2 + ',' + cy2;

                if (cx2 < 0 || cx2 >= gridSize || cy2 < 0 || cy2 >= gridSize) continue;

                if (visited[k]) continue;

                visited[k] = true;

                var cellColor = grid[k] || null;

                if (cellColor !== targetColor) continue;

                grid[k] = fillColor;

                queue.push([cx2 + 1, cy2], [cx2 - 1, cy2], [cx2, cy2 + 1], [cx2, cy2 - 1]);

              }

              upd('pixelData', Object.assign({}, grid));

              drawPixelGrid();

            }

            function applyToolAt(gx, gy) {
              if (gx < 0 || gx >= gridSize || gy < 0 || gy >= gridSize) return '';
              if (d.pixelTool === 'fill') {
                floodFill(gx, gy, currentColor);
                return 'Filled from';
              }
              var key = gx + ',' + gy;
              if (d.pixelTool === 'eraser') {
                delete grid[key];
                upd('pixelData', Object.assign({}, grid));
                drawPixelGrid();
                return 'Erased';
              }
              grid[key] = currentColor;
              upd('pixelData', Object.assign({}, grid));
              drawPixelGrid();
              return 'Painted';
            }

            function paint(e) {

              var rect = canvas.getBoundingClientRect();

              var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

              var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

              var gx = Math.floor(ex * (W / rect.width) / cellW);

              var gy = Math.floor(ey * (H / rect.height) / cellH);

              applyToolAt(gx, gy);

            }

            canvas.onmousedown = canvas.ontouchstart = function (e) { painting = true; paint(e); };

            canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) paint(e); };

            canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

            canvas.onmouseleave = function () { painting = false; };
            canvas.onfocus = function () { drawPixelGrid(); };
            canvas.onblur = function () { drawPixelGrid(); };
            canvas.onkeydown = function (event) {
              var moved = false;
              if (event.key === 'ArrowLeft') { keyboardCursor.x = Math.max(0, keyboardCursor.x - 1); moved = true; }
              else if (event.key === 'ArrowRight') { keyboardCursor.x = Math.min(gridSize - 1, keyboardCursor.x + 1); moved = true; }
              else if (event.key === 'ArrowUp') { keyboardCursor.y = Math.max(0, keyboardCursor.y - 1); moved = true; }
              else if (event.key === 'ArrowDown') { keyboardCursor.y = Math.min(gridSize - 1, keyboardCursor.y + 1); moved = true; }
              else if (event.key === 'Home') { keyboardCursor.x = 0; keyboardCursor.y = 0; moved = true; }
              else if (event.key === 'End') { keyboardCursor.x = gridSize - 1; keyboardCursor.y = gridSize - 1; moved = true; }
              else if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                var action = applyToolAt(keyboardCursor.x, keyboardCursor.y);
                updateKeyboardLabel();
                if (typeof announceToSR === 'function') {
                  announceToSR(action + ' row ' + (keyboardCursor.y + 1) + ', column ' + (keyboardCursor.x + 1) + '.');
                }
                return;
              } else {
                return;
              }
              if (moved) {
                event.preventDefault();
                canvas._pixelKeyboardCursor = keyboardCursor;
                drawPixelGrid();
                if (typeof announceToSR === 'function') {
                  announceToSR('Pixel row ' + (keyboardCursor.y + 1) + ', column ' + (keyboardCursor.x + 1) + '.');
                }
              }
            };

            drawPixelGrid();

          };



          // Symmetry Canvas

          const symmetryRef = function (canvas) {

            if (!canvas) return;

            var ctx = canvas.getContext('2d');

            var W = canvas.width, H = canvas.height;

            var cx = W / 2, cy = H / 2;

            var requestedFolds = parseInt(d.symmetryFolds, 10);
            var folds = isFinite(requestedFolds) ? Math.max(2, Math.min(24, requestedFolds)) : 6;

            var brushSize = d.brushSize || 3;
            var requestedBrushOpacity = Number(d.symBrushOpacity);
            var brushOpacity = isFinite(requestedBrushOpacity) ? Math.max(0.1, Math.min(1, requestedBrushOpacity)) : 1;

            var brushColor = 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)';
            var colorMode = d.symBrushMode || 'rainbow';
            var strokeMode = ['dots', 'freehand', 'line'].indexOf(d.symStrokeMode) !== -1 ? d.symStrokeMode : 'freehand';
            var legacyPatternMode = d.symMirrorOnly ? 'kaleidoscope' : 'rotate';
            var patternMode = ['rotate', 'kaleidoscope', 'bilateral'].indexOf(d.symPatternMode) !== -1 ? d.symPatternMode : legacyPatternMode;
            var copyCount = patternMode === 'bilateral' ? 1 : folds;
            var reflectCopies = patternMode === 'kaleidoscope' || patternMode === 'bilateral';
            var patternName = patternMode === 'bilateral' ? 'bilateral mirror' : patternMode === 'kaleidoscope' ? 'kaleidoscope' : 'rotational';
            var keyboardCursor = canvas._symmetryKeyboardCursor || { x: cx, y: cy };
            keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));
            keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));
            canvas._symmetryKeyboardCursor = keyboardCursor;

            function updateKeyboardCursor(show) {
              var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-symmetry-keyboard-cursor="true"]');
              if (cursor) {
                var displayW = canvas.clientWidth || W;
                var displayH = canvas.clientHeight || H;
                cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';
                cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';
                cursor.style.display = show ? 'block' : 'none';
              }
              canvas.setAttribute('aria-label', 'Symmetry drawing canvas in ' + patternName + ' mode with ' + (patternMode === 'bilateral' ? '2 reflected copies' : folds + ' folds') + ', using ' + (strokeMode === 'dots' ? 'dot stamps' : strokeMode === 'line' ? 'straight lines' : 'continuous freehand') + '. Keyboard cursor at x ' +
                Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');
            }

            // Store previous point for continuous line drawing

            if (canvas._prevX === undefined) canvas._prevX = null;

            if (canvas._prevY === undefined) canvas._prevY = null;



            function paintSymmetryBackground() {
              ctx.globalAlpha = 1;
              ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);
              ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 0.5;
              if (patternMode === 'bilateral') {
                ctx.beginPath(); ctx.moveTo(cx, cy);
                ctx.moveTo(cx, 0); ctx.lineTo(cx, H);
                ctx.stroke();
              } else {
                for (var guideIndex = 0; guideIndex < folds; guideIndex++) {
                  var guideAngle = (guideIndex / folds) * Math.PI * 2;
                  ctx.beginPath(); ctx.moveTo(cx, cy);
                  ctx.lineTo(cx + Math.cos(guideAngle) * Math.max(W, H), cy + Math.sin(guideAngle) * Math.max(W, H));
                  ctx.stroke();
                }
              }
            }

            function captureSymmetryCanvas() {
              try { return ctx.getImageData(0, 0, W, H); } catch (e) { return null; }
            }

            function restoreSymmetryCanvas(snapshot) {
              if (!snapshot) return false;
              try { ctx.putImageData(snapshot, 0, 0); return true; } catch (e) { return false; }
            }

            function recordSymmetryChange(before) {
              if (!before) return;
              canvas._symUndo = (canvas._symUndo || []).concat([before]).slice(-20);
              canvas._symRedo = [];
            }

            function undoSymmetry() {
              var history = canvas._symUndo || [];
              if (!history.length) {
                if (typeof announceToSR === 'function') announceToSR('Nothing to undo.');
                return;
              }
              var current = captureSymmetryCanvas();
              var previous = history[history.length - 1];
              if (!restoreSymmetryCanvas(previous)) return;
              canvas._symUndo = history.slice(0, -1);
              if (current) canvas._symRedo = (canvas._symRedo || []).concat([current]).slice(-20);
              if (typeof announceToSR === 'function') announceToSR('Undid the last symmetry change.');
            }

            function redoSymmetry() {
              var future = canvas._symRedo || [];
              if (!future.length) {
                if (typeof announceToSR === 'function') announceToSR('Nothing to redo.');
                return;
              }
              var current = captureSymmetryCanvas();
              var next = future[future.length - 1];
              if (!restoreSymmetryCanvas(next)) return;
              if (current) canvas._symUndo = (canvas._symUndo || []).concat([current]).slice(-20);
              canvas._symRedo = future.slice(0, -1);
              if (typeof announceToSR === 'function') announceToSR('Redid the symmetry change.');
            }

            function clearSymmetry() {
              var before = captureSymmetryCanvas();
              paintSymmetryBackground();
              canvas._prevX = null; canvas._prevY = null;
              recordSymmetryChange(before);
              if (typeof announceToSR === 'function') announceToSR('Cleared the symmetry artwork.');
            }

            canvas._symUndoAction = undoSymmetry;
            canvas._symRedoAction = redoSymmetry;
            canvas._symClearAction = clearSymmetry;

            if (!canvas._symInit) {
              canvas._symInit = true;
              canvas._symUndo = [];
              canvas._symRedo = [];
              paintSymmetryBackground();
            } else {
              if (!Array.isArray(canvas._symUndo)) canvas._symUndo = [];
              if (!Array.isArray(canvas._symRedo)) canvas._symRedo = [];
            }

            // In rainbow mode, pick a color based on distance from center or time; otherwise use selected



            function drawSymmetric(ex, ey, isStart, forceLine) {

              var dx = ex - cx, dy = ey - cy, dist = Math.sqrt(dx * dx + dy * dy);

              var baseAngle = Math.atan2(dy, dx);



              var drawColor = brushColor;

              if (colorMode === 'rainbow') {

                drawColor = 'hsl(' + ((Date.now() / 10) % 360) + ', 100%, 50%)';

              }



              ctx.lineWidth = brushSize * 2; // match stroke width to circle diam
              ctx.globalAlpha = brushOpacity;

              ctx.lineCap = 'round';

              ctx.lineJoin = 'round';

              ctx.strokeStyle = drawColor;

              ctx.fillStyle = drawColor;



              // If it's the very first dot of a stroke, just draw a dot

              if (isStart || canvas._prevX === null || canvas._prevY === null || (strokeMode === 'dots' && !forceLine)) {

                for (var i = 0; i < copyCount; i++) {

                  var copyRotation = (i / copyCount) * Math.PI * 2;
                  var angle = baseAngle + copyRotation;

                  ctx.beginPath(); ctx.arc(cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, brushSize, 0, Math.PI * 2);

                  ctx.fill();

                  if (reflectCopies) {

                    var mirrorAngle = (patternMode === 'bilateral' ? Math.PI - baseAngle : -baseAngle) + copyRotation;

                    ctx.beginPath(); ctx.arc(cx + Math.cos(mirrorAngle) * dist, cy + Math.sin(mirrorAngle) * dist, brushSize, 0, Math.PI * 2);

                    ctx.fill();

                  }

                }

              } else {

                 // Draw continuous lines from previous points to current

                 var px = canvas._prevX - cx, py = canvas._prevY - cy;

                 var prevDist = Math.sqrt(px * px + py * py);

                 var prevBaseAngle = Math.atan2(py, px);



                 for (var j = 0; j < copyCount; j++) {

                    var segmentRotation = (j / copyCount) * Math.PI * 2;
                    var curAngle = baseAngle + segmentRotation;

                    var pAngle = prevBaseAngle + segmentRotation;

                    ctx.beginPath();

                    ctx.moveTo(cx + Math.cos(pAngle) * prevDist, cy + Math.sin(pAngle) * prevDist);

                    ctx.lineTo(cx + Math.cos(curAngle) * dist, cy + Math.sin(curAngle) * dist);

                    ctx.stroke();



                    if (reflectCopies) {

                       var mCurAngle = (patternMode === 'bilateral' ? Math.PI - baseAngle : -baseAngle) + segmentRotation;

                       var mPAngle = (patternMode === 'bilateral' ? Math.PI - prevBaseAngle : -prevBaseAngle) + segmentRotation;

                       ctx.beginPath();

                       ctx.moveTo(cx + Math.cos(mPAngle) * prevDist, cy + Math.sin(mPAngle) * prevDist);

                       ctx.lineTo(cx + Math.cos(mCurAngle) * dist, cy + Math.sin(mCurAngle) * dist);

                       ctx.stroke();

                    }

                 }

              }

              // Save prev coords

              canvas._prevX = ex;

              canvas._prevY = ey;

            }



            function eventPoint(e) {
              var rect = canvas.getBoundingClientRect();
              var source = e.touches && e.touches[0] ? e.touches[0] : e;
              var displayW = rect.width || canvas.clientWidth || W;
              var displayH = rect.height || canvas.clientHeight || H;
              return {
                x: ((source.clientX - rect.left) * (W / displayW)),
                y: ((source.clientY - rect.top) * (H / displayH))
              };
            }

            function handleDraw(e, isStart) {
              var point = eventPoint(e);
              drawSymmetric(point.x, point.y, isStart);
              return point;
            }

            function restoreLineSnapshot() {
              if (!canvas._symLineSnapshot) return;
              restoreSymmetryCanvas(canvas._symLineSnapshot);
            }

            function finishPointer(e, cancelled) {
              if (!canvas._symDrawing) return;
              var before = canvas._symStrokeStartSnapshot;
              if (strokeMode === 'line') {
                restoreLineSnapshot();
                if (!cancelled && e) {
                  canvas._prevX = canvas._symLineStart.x;
                  canvas._prevY = canvas._symLineStart.y;
                  handleDraw(e, false);
                }
              }
              if (!cancelled || strokeMode !== 'line') recordSymmetryChange(before);
              canvas._symDrawing = false;
              canvas._symLineStart = null;
              canvas._symLineSnapshot = null;
              canvas._symStrokeStartSnapshot = null;
              canvas._prevX = null; canvas._prevY = null;
              try { if (e && e.pointerId !== undefined) canvas.releasePointerCapture(e.pointerId); } catch (err) {}
            }

            canvas.style.touchAction = 'none';
            canvas.onpointerdown = function (e) {
              if (e.button !== undefined && e.button !== 0) return;
              e.preventDefault();
              canvas._symDrawing = true;
              canvas._prevX = null; canvas._prevY = null;
              var point = eventPoint(e);
              canvas._symLineStart = point;
              canvas._symStrokeStartSnapshot = captureSymmetryCanvas();
              canvas._symLineSnapshot = strokeMode === 'line' ? canvas._symStrokeStartSnapshot : null;
              drawSymmetric(point.x, point.y, true);
              try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
            };
            canvas.onpointermove = function (e) {
              if (!canvas._symDrawing) return;
              e.preventDefault();
              if (strokeMode === 'line') {
                restoreLineSnapshot();
                canvas._prevX = canvas._symLineStart.x;
                canvas._prevY = canvas._symLineStart.y;
              }
              handleDraw(e, strokeMode === 'dots');
            };
            canvas.onpointerup = function (e) { finishPointer(e, false); };
            canvas.onpointercancel = function (e) { finishPointer(e, true); };
            canvas.onlostpointercapture = function (e) { finishPointer(e, false); };
            // Remove the legacy mouse/touch property handlers so a pointer gesture
            // cannot be delivered twice on browsers that synthesize mouse events.
            canvas.onmousedown = canvas.onmousemove = canvas.onmouseup = canvas.onmouseleave = null;
            canvas.ontouchstart = canvas.ontouchmove = canvas.ontouchend = null;
            canvas.onfocus = function () { updateKeyboardCursor(true); };
            canvas.onblur = function () { updateKeyboardCursor(false); };
            canvas.onkeydown = function (event) {
              var historyKey = String(event.key || '').toLowerCase();
              if ((event.ctrlKey || event.metaKey) && historyKey === 'z') {
                event.preventDefault();
                if (event.shiftKey) redoSymmetry(); else undoSymmetry();
                return;
              }
              if ((event.ctrlKey || event.metaKey) && historyKey === 'y') {
                event.preventDefault();
                redoSymmetry();
                return;
              }
              var step = event.altKey ? 1 : 10;
              var oldX = keyboardCursor.x, oldY = keyboardCursor.y;
              var moved = true;
              if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);
              else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);
              else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);
              else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);
              else if (event.key === 'Home') { keyboardCursor.x = cx; keyboardCursor.y = cy; }
              else moved = false;

              if (moved) {
                event.preventDefault();
                if (event.shiftKey) {
                  var lineBefore = captureSymmetryCanvas();
                  canvas._prevX = oldX; canvas._prevY = oldY;
                  drawSymmetric(keyboardCursor.x, keyboardCursor.y, false, true);
                  canvas._prevX = null; canvas._prevY = null;
                  recordSymmetryChange(lineBefore);
                }
                canvas._symmetryKeyboardCursor = keyboardCursor;
                updateKeyboardCursor(true);
                if (typeof announceToSR === 'function') {
                  announceToSR((event.shiftKey ? 'Drew to' : 'Symmetry cursor') + ' x ' + Math.round(keyboardCursor.x) +
                    ', y ' + Math.round(keyboardCursor.y) + '.');
                }
                return;
              }
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                var stampBefore = captureSymmetryCanvas();
                canvas._prevX = null; canvas._prevY = null;
                drawSymmetric(keyboardCursor.x, keyboardCursor.y, true);
                recordSymmetryChange(stampBefore);
                if (typeof announceToSR === 'function') {
                  announceToSR('Placed symmetric marks at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');
                }
              }
            };
            updateKeyboardCursor(false);

          };



          // WCAG contrast helpers

          function luminance(h, s, l) {

            var c = (1 - Math.abs(2 * l / 100 - 1)) * s / 100;

            var x = c * (1 - Math.abs((h / 60) % 2 - 1));

            var m = l / 100 - c / 2;

            var r, g, b;

            if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }

            else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }

            else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }

            r += m; g += m; b += m;

            var toL = function (v) { return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };

            return 0.2126 * toL(r) + 0.7152 * toL(g) + 0.0722 * toL(b);

          }

          function mixColors(c1, c2, ratio) {

            var h1 = c1.h, s1 = c1.s, l1 = c1.l, h2 = c2.h, s2 = c2.s, l2 = c2.l;

            var hDiff = h2 - h1; if (Math.abs(hDiff) > 180) { if (hDiff > 0) h1 += 360; else h2 += 360; }

            return { h: Math.round((h1 + (h2 - h1) * ratio + 360) % 360), s: Math.round(s1 + (s2 - s1) * ratio), l: Math.round(l1 + (l2 - l1) * ratio) };

          }

          var mix1 = { h: d.mix1H || 0, s: d.mix1S || 100, l: d.mix1L || 50 };

          var mix2 = { h: d.mix2H || 200, s: d.mix2S || 100, l: d.mix2L || 50 };

          var mixRatio = d.mixRatio || 0.5;

          var mixed = mixColors(mix1, mix2, mixRatio);

          var fgH = typeof d.fgH === 'number' ? d.fgH : 0;

          var fgS = typeof d.fgS === 'number' ? d.fgS : 0;

          var fgL = typeof d.fgL === 'number' ? d.fgL : 0;

          var bgH = typeof d.bgH === 'number' ? d.bgH : 0;

          var bgS = typeof d.bgS === 'number' ? d.bgS : 0;

          var bgL = typeof d.bgL === 'number' ? d.bgL : 100;

          var l1c = luminance(fgH, fgS, fgL), l2c = luminance(bgH, bgS, bgL);

          var contrastRatio = (Math.max(l1c, l2c) + 0.05) / (Math.min(l1c, l2c) + 0.05);

          var passAA = contrastRatio >= 4.5, passAAA = contrastRatio >= 7, passAALarge = contrastRatio >= 3;



          // Helper to toggle fullscreen for specific tool containers

          const toggleFullscreen = (elementId) => {

            var el = document.getElementById(elementId);

            if (!el) return;

            // A sandboxed embed (the Canvas surface) refuses real fullscreen outright,
            // and the rejection below only reached console.warn — so the button was
            // dead with no explanation. The shared host helper tries real fullscreen
            // first and falls back to a CSS fill-frame that Escape leaves.
            if (typeof window !== 'undefined' && typeof window.__alloStemFS === 'function') {

              window.__alloStemFS(el);

              return;

            }

            if (!document.fullscreenElement) {

              if (el.requestFullscreen) {

                el.requestFullscreen().catch(err => console.warn("Fullscreen failed: ", err));

              } else if (el.webkitRequestFullscreen) { /* Safari */

                el.webkitRequestFullscreen();

              } else if (el.msRequestFullscreen) { /* IE11 */

                el.msRequestFullscreen();

              }

            } else {

              if (document.exitFullscreen) {

                document.exitFullscreen();

              } else if (document.webkitExitFullscreen) { /* Safari */

                document.webkitExitFullscreen();

              } else if (document.msExitFullscreen) { /* IE11 */

                document.msExitFullscreen();

              }

            }

          };

            function _sirdsRenderSync(W, H, dmData, dmW, dmH, pType, pWidth, maxShift, aiPat) {

              var offscreen = document.createElement('canvas'); offscreen.setAttribute('aria-hidden', 'true'); offscreen.width = W; offscreen.height = H;

              var ctx = offscreen.getContext('2d');

              function makeRng(seed) { var s = seed; return function() { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; }; }

              var imgData = ctx.createImageData(W, H); var data = imgData.data;

              for (var y = 0; y < H; y++) {

                var rng = makeRng(y * 7919 + 12345);

                var row = new Uint8Array(W * 3);

                for (var x = 0; x < W; x++) {

                  if (x < pWidth) {

                    if (pType === 'bw') { var c = rng() > 0.5 ? 230 : 25; row[x*3]=c; row[x*3+1]=c; row[x*3+2]=c; }

                    else if (pType === 'color') { row[x*3]=Math.floor(rng()*200)+55; row[x*3+1]=Math.floor(rng()*200)+55; row[x*3+2]=Math.floor(rng()*200)+55; }

                    else if (pType === 'ai' && aiPat) { var pw=aiPat.width,ph=aiPat.height,pI=((y%ph)*pw+(x%pw))*4; row[x*3]=aiPat.data[pI]; row[x*3+1]=aiPat.data[pI+1]; row[x*3+2]=aiPat.data[pI+2]; }

                    else { var v=Math.floor(rng()*220)+20; row[x*3]=v; row[x*3+1]=v; row[x*3+2]=v; }

                  } else {

                    var dx=Math.floor(x*dmW/W), dy=Math.floor(y*dmH/H), di=(dy*dmW+dx)*4;

                    var depth=dmData[di]/255, shift=Math.round(depth*maxShift), srcX=x-pWidth+shift;

                    if (srcX >= 0) { row[x*3]=row[srcX*3]; row[x*3+1]=row[srcX*3+1]; row[x*3+2]=row[srcX*3+2]; }

                    else {

                      if (pType === 'bw') { var c2=rng()>0.5?230:25; row[x*3]=c2; row[x*3+1]=c2; row[x*3+2]=c2; }

                      else if (pType === 'color') { row[x*3]=Math.floor(rng()*200)+55; row[x*3+1]=Math.floor(rng()*200)+55; row[x*3+2]=Math.floor(rng()*200)+55; }

                      else if (pType === 'ai' && aiPat) { var pw2=aiPat.width,ph2=aiPat.height,pI2=((y%ph2)*pw2+(x%pw2))*4; row[x*3]=aiPat.data[pI2]; row[x*3+1]=aiPat.data[pI2+1]; row[x*3+2]=aiPat.data[pI2+2]; }

                      else { var v2=Math.floor(rng()*220)+20; row[x*3]=v2; row[x*3+1]=v2; row[x*3+2]=v2; }

                    }

                  }

                }

                for (var x2=0; x2<W; x2++) { var idx=(y*W+x2)*4; data[idx]=row[x2*3]; data[idx+1]=row[x2*3+1]; data[idx+2]=row[x2*3+2]; data[idx+3]=255; }

              }

              ctx.putImageData(imgData, 0, 0);

              return offscreen;

            }

            function _genAnimDepth(presetId, frameIdx, totalFrames, W, H) {

              var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

              var t = frameIdx / totalFrames;

              if (presetId === 'pulseSphere') {

                var rBase = Math.abs(0.15 + 0.25 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2)));

                var r = Math.max(4, Math.abs(Math.round(Math.min(W, H) * rBase)));

                var gradR = Math.max(4, r);

                if (!isFinite(gradR) || gradR <= 0) gradR = 4;

                var grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, gradR);

                grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#888'); grad.addColorStop(1, '#000');

                ctx.beginPath(); ctx.arc(W/2, H/2, Math.max(1, r), 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

              } else if (presetId === 'spinCube') {

                var angle = t * Math.PI * 2, cos = Math.cos(angle), sin = Math.sin(angle);

                var sz = Math.min(W, H) * 0.25, cx = W/2, cy = H/2;

                var verts = [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]];

                var faces = [[0,1,2,3],[4,5,6,7],[0,1,5,4],[2,3,7,6],[0,3,7,4],[1,2,6,5]];

                var proj = verts.map(function(v) { var rx=v[0]*cos-v[2]*sin, rz=v[0]*sin+v[2]*cos; return {x:cx+rx*sz, y:cy+v[1]*sz, z:(rz+1)/2}; });

                // Sort faces by average z (painter's algorithm)

                var sortedFaces = faces.slice().sort(function(a,b) {

                  var za = a.reduce(function(s,i){return s+proj[i].z;},0)/a.length;

                  var zb = b.reduce(function(s,i){return s+proj[i].z;},0)/b.length;

                  return za - zb;

                });

                sortedFaces.forEach(function(face) {

                  var avgZ = face.reduce(function(s,i){return s+proj[i].z;},0)/face.length;

                  var brt = Math.round(avgZ * 255);

                  ctx.beginPath(); ctx.moveTo(proj[face[0]].x, proj[face[0]].y);

                  for (var fi=1; fi<face.length; fi++) ctx.lineTo(proj[face[fi]].x, proj[face[fi]].y);

                  ctx.closePath(); ctx.fillStyle = 'rgb('+brt+','+brt+','+brt+')'; ctx.fill();

                });

              } else if (presetId === 'waveRipple') {

                var imgData = ctx.createImageData(W, H); var data = imgData.data;

                var phase = t * Math.PI * 2;

                for (var y=0; y<H; y++) for (var x=0; x<W; x++) {

                  var dx2=x-W/2, dy2=y-H/2, dist=Math.sqrt(dx2*dx2+dy2*dy2)/(Math.min(W,H)*0.15);

                  var val=Math.max(0,Math.min(255,Math.round((Math.sin(dist-phase)*0.5+0.5)*255*Math.max(0,1-dist/5))));

                  var idx2=(y*W+x)*4; data[idx2]=val; data[idx2+1]=val; data[idx2+2]=val; data[idx2+3]=255;

                }

                ctx.putImageData(imgData, 0, 0);

              } else if (presetId === 'morphHeart') {

                var sc = Math.min(W,H) * (0.009 + 0.004 * Math.sin(t * Math.PI * 2));

                ctx.save(); ctx.translate(W/2, H*0.45); ctx.scale(sc, -sc);

                ctx.beginPath();

                for (var ht=0; ht<=Math.PI*2; ht+=0.01) {

                  var hx=16*Math.pow(Math.sin(ht),3), hy=13*Math.cos(ht)-5*Math.cos(2*ht)-2*Math.cos(3*ht)-Math.cos(4*ht);

                  if (ht===0) ctx.moveTo(hx,hy); else ctx.lineTo(hx,hy);

                }

                ctx.closePath(); ctx.restore();

                var hGrad = ctx.createRadialGradient(W/2, H*0.45, 0, W/2, H*0.45, Math.min(W,H)*0.4);

                hGrad.addColorStop(0, '#fff'); hGrad.addColorStop(0.8, '#aaa'); hGrad.addColorStop(1, '#000');

                ctx.fillStyle = hGrad; ctx.fill();

              } else if (presetId === 'floatText') {

                var dep = Math.round(128 + 127 * Math.sin(t * Math.PI * 2));

                ctx.fillStyle = 'rgb('+dep+','+dep+','+dep+')';

                ctx.font = 'bold ' + Math.round(H * 0.4) + 'px Arial';

                ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('3D', W/2, H/2);

              }

              return ctx.getImageData(0, 0, W, H);

            }

            function _renderAnimFrames(nFrames, presetId, pType, pWidth, maxShift, aiPat, onProgress, onDone, renderGeneration) {

              var W = 512, H = 512, dmW = 400, dmH = 400;

              var frames = []; var i = 0;

              function step() {

                if (!_isStereoAnimRenderActive(renderGeneration)) return;

                if (i >= nFrames) { onDone(frames); return; }

                var dmImgData = _genAnimDepth(presetId, i, nFrames, dmW, dmH);

                var f = _sirdsRenderSync(W, H, dmImgData.data, dmW, dmH, pType, pWidth, maxShift, aiPat);

                frames.push(f);

                i++;

                if (onProgress) onProgress(i, nFrames);

                requestAnimationFrame(step);

              }

              requestAnimationFrame(step);

            }

            function _stopStereoAnim() {

              if (_stereoAnimRef.timer) { clearInterval(_stereoAnimRef.timer); _stereoAnimRef.timer = null; }

            }

            function _cancelStereoAnimWork(clearFrames) {

              _stereoAnimRef.renderGeneration += 1;

              _stopStereoAnim();

              if (clearFrames) _stereoAnimRef.frames = [];

            }

            function _beginStereoAnimRender() {

              _cancelStereoAnimWork(true);

              return _stereoAnimRef.renderGeneration;

            }

            function _isStereoAnimRenderActive(renderGeneration) {

              return renderGeneration === _stereoAnimRef.renderGeneration;

            }

            function _playStereoAnim(canvasId, fps) {

              _stopStereoAnim();

              var frames = _stereoAnimRef.frames;

              if (!frames || frames.length === 0) return;

              var c = document.getElementById(canvasId);

              if (!c) return;

              var ctx = c.getContext('2d');

              var idx = 0;

              var drawNextFrame = function() {

                if (c.isConnected === false || _stereoAnimRef.frames !== frames) {

                  _stopStereoAnim();

                  return;

                }

                ctx.drawImage(frames[idx], 0, 0);

                idx = (idx + 1) % frames.length;

              };

              drawNextFrame();

              _stereoAnimRef.timer = setInterval(drawNextFrame, 1000 / Math.max(1, Number(fps) || 8));

            }

            function _exportStereoGif(frames, fps) {

              if (!frames || frames.length === 0) return;

              // Build animated GIF using minimal encoder

              var W = frames[0].width, H = frames[0].height;

              var delay = Math.round(100 / fps); // centiseconds

              // Quantize each frame to 256 colors and build GIF

              var parts = [];

              // GIF89a Header

              parts.push(new Uint8Array([0x47,0x49,0x46,0x38,0x39,0x61]));

              // Logical Screen Descriptor

              var lsd = new Uint8Array(7);

              lsd[0] = W & 0xFF; lsd[1] = (W >> 8) & 0xFF;

              lsd[2] = H & 0xFF; lsd[3] = (H >> 8) & 0xFF;

              lsd[4] = 0xF7; // GCT flag, 256 colors (2^(7+1)=256)

              lsd[5] = 0; lsd[6] = 0;

              parts.push(lsd);

              // Global Color Table (256 entries = 768 bytes) - web-safe palette

              var gct = new Uint8Array(768);

              for (var ci = 0; ci < 256; ci++) {

                // Simple 6x6x6 cube + 40 grays

                if (ci < 216) {

                  gct[ci*3] = Math.floor(ci/36) * 51;

                  gct[ci*3+1] = (Math.floor(ci/6) % 6) * 51;

                  gct[ci*3+2] = (ci % 6) * 51;

                } else {

                  var gv = Math.round((ci - 216) / 39 * 255);

                  gct[ci*3] = gv; gct[ci*3+1] = gv; gct[ci*3+2] = gv;

                }

              }

              parts.push(gct);

              // Netscape looping extension

              parts.push(new Uint8Array([0x21,0xFF,0x0B,

                0x4E,0x45,0x54,0x53,0x43,0x41,0x50,0x45,0x32,0x2E,0x30,

                0x03,0x01,0x00,0x00,0x00]));

              function nearestColor(r,g,b) {

                // Map to 6x6x6 cube

                var ri = Math.round(r/255*5), gi = Math.round(g/255*5), bi = Math.round(b/255*5);

                return ri*36 + gi*6 + bi;

              }

              // LZW Minimum Code Size

              var minCodeSize = 8;

              function lzwEncode(indexStream) {

                var clearCode = 1 << minCodeSize;

                var eoiCode = clearCode + 1;

                var codeSize = minCodeSize + 1;

                var nextCode = eoiCode + 1;

                var dict = {};

                for (var di = 0; di < clearCode; di++) dict[String(di)] = di;

                var out = [];

                var bitBuf = 0, bitCount = 0;

                function writeBits(code, size) {

                  bitBuf |= (code << bitCount);

                  bitCount += size;

                  while (bitCount >= 8) { out.push(bitBuf & 0xFF); bitBuf >>= 8; bitCount -= 8; }

                }

                writeBits(clearCode, codeSize);

                var cur = String(indexStream[0]);

                for (var si = 1; si < indexStream.length; si++) {

                  var next = String(indexStream[si]);

                  var combined = cur + ',' + next;

                  if (dict[combined] !== undefined) {

                    cur = combined;

                  } else {

                    writeBits(dict[cur], codeSize);

                    if (nextCode < 4096) {

                      dict[combined] = nextCode++;

                      if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;

                    } else {

                      writeBits(clearCode, codeSize);

                      dict = {};

                      for (var dj = 0; dj < clearCode; dj++) dict[String(dj)] = dj;

                      nextCode = eoiCode + 1;

                      codeSize = minCodeSize + 1;

                    }

                    cur = next;

                  }

                }

                writeBits(dict[cur], codeSize);

                writeBits(eoiCode, codeSize);

                if (bitCount > 0) out.push(bitBuf & 0xFF);

                return new Uint8Array(out);

              }

              for (var fi = 0; fi < frames.length; fi++) {

                // Graphic Control Extension

                var gce = new Uint8Array([0x21,0xF9,0x04,0x00, delay & 0xFF, (delay >> 8) & 0xFF, 0x00, 0x00]);

                parts.push(gce);

                // Image Descriptor

                var imgDesc = new Uint8Array(10);

                imgDesc[0] = 0x2C; // separator

                imgDesc[1] = 0; imgDesc[2] = 0; imgDesc[3] = 0; imgDesc[4] = 0; // x,y

                imgDesc[5] = W & 0xFF; imgDesc[6] = (W >> 8) & 0xFF;

                imgDesc[7] = H & 0xFF; imgDesc[8] = (H >> 8) & 0xFF;

                imgDesc[9] = 0; // no local color table

                parts.push(imgDesc);

                // Get pixel data

                var fCtx = frames[fi].getContext('2d');

                var fData = fCtx.getImageData(0, 0, W, H).data;

                // Quantize

                var indices = new Uint8Array(W * H);

                for (var pi = 0; pi < W * H; pi++) {

                  indices[pi] = nearestColor(fData[pi*4], fData[pi*4+1], fData[pi*4+2]);

                }

                // LZW encode

                parts.push(new Uint8Array([minCodeSize]));

                var lzwData = lzwEncode(indices);

                // Sub-blocks (max 255 bytes each)

                var pos = 0;

                while (pos < lzwData.length) {

                  var chunkLen = Math.min(255, lzwData.length - pos);

                  parts.push(new Uint8Array([chunkLen]));

                  parts.push(lzwData.slice(pos, pos + chunkLen));

                  pos += chunkLen;

                }

                parts.push(new Uint8Array([0x00])); // block terminator

              }

              // Trailer

              parts.push(new Uint8Array([0x3B]));

              // Assemble

              var totalLen = parts.reduce(function(s,p){return s+p.length;}, 0);

              var result = new Uint8Array(totalLen);

              var offset = 0;

              parts.forEach(function(p) { result.set(p, offset); offset += p.length; });

              var blob = new Blob([result], { type: 'image/gif' });

              var link = document.createElement('a');

              link.download = 'stereogram-anim-' + Date.now() + '.gif';

              link.href = URL.createObjectURL(blob);

              link.click();

              URL.revokeObjectURL(link.href);

              if (typeof addToast === 'function') addToast('\uD83C\uDFAC Animated GIF exported!', 'success');

            }



            // ═══ CUSTOM ANIMATION HELPERS ═══

            function _genTransformDepth(sourceImgData, W, H, transformType, frameIdx, totalFrames) {

              var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

              var t = frameIdx / totalFrames;

              // Put source into a temp canvas so we can drawImage with transforms

              var src = document.createElement('canvas'); src.setAttribute('aria-hidden', 'true'); src.width = W; src.height = H;

              var sCtx = src.getContext('2d');

              var sImg = sCtx.createImageData(W, H);

              var sData = sourceImgData.data || sourceImgData;

              for (var i = 0; i < sImg.data.length; i++) sImg.data[i] = sData[i];

              sCtx.putImageData(sImg, 0, 0);

              ctx.save();

              ctx.translate(W / 2, H / 2);

              if (transformType === 'zoom') {

                var scale = 0.6 + 0.8 * (0.5 + 0.5 * Math.sin(t * Math.PI * 2));

                ctx.scale(scale, scale);

              } else if (transformType === 'rotate') {

                ctx.rotate(t * Math.PI * 2);

              } else if (transformType === 'bounce') {

                var bounceY = Math.abs(Math.sin(t * Math.PI * 2)) * H * 0.25;

                ctx.translate(0, -bounceY);

                var bounceScale = 0.8 + 0.2 * Math.abs(Math.sin(t * Math.PI * 2));

                ctx.scale(bounceScale, bounceScale);

              } else if (transformType === 'slide') {

                var slideX = Math.sin(t * Math.PI * 2) * W * 0.3;

                ctx.translate(slideX, 0);

              }

              ctx.drawImage(src, -W / 2, -H / 2, W, H);

              ctx.restore();

              return ctx.getImageData(0, 0, W, H);

            }



            function _interpolateDepthMaps(maps, frameIdx, totalFrames) {

              if (!maps || maps.length === 0) return null;

              if (maps.length === 1) return maps[0];

              var segCount = maps.length;

              var pos = (frameIdx / totalFrames) * segCount;

              var idx0 = Math.floor(pos) % maps.length;

              var idx1 = (idx0 + 1) % maps.length;

              var frac = pos - Math.floor(pos);

              var m0 = maps[idx0], m1 = maps[idx1];

              var W = m0.width, H = m0.height;

              var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = W; c.height = H;

              var ctx = c.getContext('2d');

              var out = ctx.createImageData(W, H);

              var d0 = m0.data, d1 = m1.data, od = out.data;

              for (var i = 0; i < od.length; i += 4) {

                od[i]     = Math.round(d0[i]     * (1 - frac) + d1[i]     * frac);

                od[i + 1] = Math.round(d0[i + 1] * (1 - frac) + d1[i + 1] * frac);

                od[i + 2] = Math.round(d0[i + 2] * (1 - frac) + d1[i + 2] * frac);

                od[i + 3] = 255;

              }

              ctx.putImageData(out, 0, 0);

              return out;

            }


          const renderStudioHome = function () {
            var recentTab = ART_STUDIO_TAB_ORDER.indexOf(d.tab) !== -1 ? d.tab : null;
            var surpriseTabs = ['watercolor', 'pixel', 'symmetry', 'spirograph', 'generative', 'sculpt3d'];
            return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200", 'data-artstudio-home': 'true' },
              React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-4" },
                React.createElement("button", { type: "button", onClick: function () { closeArtStudio(null); }, className: "p-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50", 'aria-label': __alloT('stem.artstudio.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
                React.createElement("div", { className: "min-w-0 flex-1" },
                  React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.18em] text-pink-700" }, 'Creative desk'),
                  React.createElement("p", { className: "truncate text-lg font-black text-slate-900" }, __alloT('stem.artstudio.art_design_studio', '\uD83C\uDFA8 Art & Design Studio'))
                ),
                React.createElement("button", { type: "button", onClick: function () { var picked = surpriseTabs[Math.floor(Math.random() * surpriseTabs.length)]; beginStudioPath(picked, 'a surprise creative lab'); }, className: "ml-auto px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800" }, '\u2726 Surprise me')
              ),

              React.createElement("section", { className: "relative overflow-hidden rounded-3xl bg-slate-950 text-white p-6 sm:p-8 shadow-xl", 'aria-labelledby': "artstudio-home-title" },
                React.createElement("div", { className: "absolute -right-16 -top-20 h-56 w-56 rounded-full bg-pink-500/25 blur-3xl", 'aria-hidden': "true" }),
                React.createElement("div", { className: "absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-cyan-400/20 blur-3xl", 'aria-hidden': "true" }),
                React.createElement("div", { className: "relative max-w-2xl" },
                  React.createElement("p", { className: "text-xs font-black uppercase tracking-[0.2em] text-pink-300" }, 'Begin with an intention'),
                  React.createElement("h1", { id: "artstudio-home-title", tabIndex: -1, className: "mt-2 text-3xl sm:text-4xl font-black tracking-tight focus:outline-none" }, 'What do you want to make?'),
                  React.createElement("p", { className: "mt-3 text-sm sm:text-base leading-relaxed text-slate-300" }, 'Choose a creative direction. The canvas comes first; techniques, artists, mathematics, and accessibility stay close when you want to look deeper.'),
                  React.createElement("div", { className: "mt-5 flex flex-wrap gap-2", role: "group", 'aria-label': "Studio lenses" },
                    ['\u270E Create', '\u25CE Learn', '\u2315 Inspect'].map(function (lens) { return React.createElement("span", { key: lens, className: "rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white" }, lens); })
                  )
                )
              ),

              recentTab && React.createElement("button", { type: "button", onClick: function () { beginStudioPath(recentTab, ART_STUDIO_TAB_LABELS[recentTab]); }, className: "mt-4 w-full flex items-center gap-4 rounded-2xl border-2 border-pink-200 bg-pink-50 p-4 text-left hover:border-pink-400 hover:bg-pink-100 transition-colors" },
                React.createElement("span", { className: "grid h-11 w-11 place-items-center rounded-xl bg-white text-xl shadow-sm", 'aria-hidden': "true" }, "\u21BB"),
                React.createElement("span", { className: "flex-1" },
                  React.createElement("span", { className: "block text-[11px] font-black uppercase tracking-wider text-pink-700" }, 'Continue creating'),
                  React.createElement("span", { className: "block text-sm font-black text-slate-900" }, ART_STUDIO_TAB_LABELS[recentTab])
                ),
                React.createElement("span", { className: "text-pink-700 font-black", 'aria-hidden': "true" }, "\u2192")
              ),

              React.createElement("section", { className: "mt-6", 'aria-labelledby': "artstudio-starting-points-title" },
                React.createElement("div", { className: "flex items-end justify-between gap-3 mb-3" },
                  React.createElement("div", null,
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.16em] text-slate-500" }, 'Starting points'),
                    React.createElement("h2", { id: "artstudio-starting-points-title", className: "text-xl font-black text-slate-900" }, 'Choose a creative path')
                  ),
                  React.createElement("button", { type: "button", onClick: function () { beginStudioPath('colorWheel', 'the full lab navigator'); }, className: "text-xs font-black text-pink-700 hover:text-pink-900" }, 'Open full lab navigator \u2192')
                ),
                React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" },
                  STUDIO_START_PATHS.map(function (path) {
                    return React.createElement("button", { type: "button", key: path.id, onClick: function () { beginStudioPath(path.tab, path.title); }, className: "group min-h-[150px] rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md " + path.accent, 'aria-label': path.title + '. ' + path.description },
                      React.createElement("div", { className: "flex items-start justify-between gap-3" },
                        React.createElement("span", { className: "grid h-11 w-11 place-items-center rounded-xl bg-slate-100 text-2xl group-hover:bg-white", 'aria-hidden': "true" }, path.icon),
                        React.createElement("span", { className: "text-[10px] font-black uppercase tracking-[0.16em] text-slate-500" }, path.eyebrow)
                      ),
                      React.createElement("span", { className: "mt-4 block text-base font-black text-slate-900" }, path.title),
                      React.createElement("span", { className: "mt-1 block text-xs leading-relaxed text-slate-600" }, path.description)
                    );
                  })
                )
              )
            );
          };

          if (studioHomeOpen) return renderStudioHome();

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "relative z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-300 bg-white/95 p-2 shadow-sm" },
              React.createElement("button", { type: "button", onClick: function () { closeArtStudio(null); }, className: "p-2 hover:bg-slate-100 rounded-xl text-slate-700", 'aria-label': __alloT('stem.artstudio.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18 })),
              React.createElement("div", { className: "min-w-0" },
                React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.16em] text-pink-700" }, 'Creative desk'),
                React.createElement("h3", { className: "truncate text-sm sm:text-base font-black text-slate-900" }, __alloT('stem.artstudio.art_design_studio', "Art & Design Studio"))
              ),
              React.createElement("span", { className: "hidden sm:inline-flex px-2 py-1 bg-slate-100 text-slate-700 text-[10px] font-black rounded-full" }, ART_STUDIO_TAB_LABELS[tab] || "CREATIVE"),
              React.createElement("div", { className: "ml-auto flex items-center gap-1.5" },
                React.createElement("button", { type: "button", onClick: openStudioHome, className: "px-3 py-2 rounded-xl text-xs font-black text-slate-700 hover:bg-slate-100", 'aria-label': 'Open Studio home' }, "Home"),
                React.createElement("button", { type: "button", onClick: function () { upd('showTour', !d.showTour); }, className: "px-3 py-2 rounded-xl text-xs font-black " + (d.showTour ? "bg-pink-700 text-white" : "text-pink-800 bg-pink-50 hover:bg-pink-100"), "aria-label": d.showTour ? 'Close Studio learning guide' : 'Open Studio learning guide', 'aria-expanded': !!d.showTour, 'aria-controls': 'artstudio-tour' }, d.showTour ? "Close tour" : "Learn"),
                React.createElement("details", { className: "relative" },
                  React.createElement("summary", { className: "cursor-pointer list-none rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800", 'aria-label': "Open Studio actions" }, "Actions"),
                  React.createElement("div", { className: "absolute right-0 mt-2 w-56 space-y-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl" },
                    React.createElement("p", { className: "px-2 py-1 text-[10px] font-black uppercase tracking-wider text-slate-500" }, 'Save or continue in'),
                    React.createElement("button", { type: "button", "aria-label": __alloT('stem.artstudio.snapshot', "Snapshot"), onClick: saveArtStudioSnapshot, className: "w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold text-rose-800 hover:bg-rose-50" }, __alloT('stem.artstudio.snapshot_2', "\uD83D\uDCF8 Snapshot")),
                    typeof onUseArtwork === 'function' && canvasArtworkAvailable && React.createElement("button", { type: "button", onClick: function () { sendArtworkTo('page-designer'); }, className: "w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold text-indigo-800 hover:bg-indigo-50", title: "Insert this static image into Page Designer" }, "↗ Page Designer"),
                    typeof onUseArtwork === 'function' && canvasArtworkAvailable && React.createElement("button", { type: "button", onClick: function () { sendArtworkTo('visual-support'); }, className: "w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold text-violet-800 hover:bg-violet-50", title: "Save this static image as a Visual Support" }, "＋ Visual Support"),
                    typeof onUseArtwork === 'function' && !canvasArtworkAvailable && React.createElement("p", { className: "rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] text-slate-600" }, 'Artwork handoff is available in canvas labs.'),
                    React.createElement("button", { type: "button", onClick: function () { closeArtStudio('archStudio'); }, className: "w-full rounded-lg px-2.5 py-2 text-left text-xs font-bold text-amber-800 hover:bg-amber-50", title: __alloT('stem.artstudio.launch_3d_architecture_studio', "Launch 3D Architecture Studio") }, __alloT('stem.artstudio.3d_builder', "\uD83C\uDFD7\uFE0F 3D Architecture Studio"))
                  )
                )
              )
            ),

            /* ── Art Studio Tour/Welcome Panel ── */
            d.showTour && React.createElement("div", { id: "artstudio-tour", role: "region", 'aria-labelledby': "artstudio-tour-title", className: "mb-4 bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 rounded-xl border-2 border-pink-200 p-4 animate-in fade-in duration-200" },
              React.createElement("h4", { id: "artstudio-tour-title", className: "text-sm font-black text-pink-800 mb-3 flex items-center gap-2" }, __alloT('stem.artstudio.welcome_to_the_art_design_studio', "\uD83C\uDFA8 Welcome to the Art & Design Studio!")),
              React.createElement("p", { className: "text-xs text-slate-600 mb-3 leading-relaxed" }, __alloT('stem.artstudio.explore_15_interactive_tools_that_teac', "Explore artists and traditions alongside 17 interactive labs for color theory, mathematical art, generative design, sculpture, sound, and visual accessibility.")),
              React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3" },
                [
                  { icon: '\uD83C\uDF0D', name: __alloT('stem.artstudio.artists_traditions', 'Artists & Traditions'), desc: __alloT('stem.artstudio.artists_traditions_desc', 'Explore 28 globally representative creative practices') },
                  { icon: '\uD83C\uDFA8', name: __alloT('stem.artstudio.color_wheel', 'Color Wheel'), desc: __alloT('stem.artstudio.explore_hsl_color_space_interactively', 'Explore HSL color space interactively') },
                  { icon: '\uD83E\uDDEA', name: __alloT('stem.artstudio.color_mixer', 'Color Mixer'), desc: __alloT('stem.artstudio.mix_paints_with_subtractive_color_theo', 'Mix paints with subtractive color theory') },
                  { icon: '\uD83C\uDFA8', name: __alloT('stem.artstudio.watercolor', 'Watercolor'), desc: __alloT('stem.artstudio.simulate_watercolor_diffusion_and_paper', 'Simulate pigment, water, and paper texture') },
                  { icon: '\uD83D\uDDBC', name: __alloT('stem.artstudio.pixel_art', 'Pixel Art'), desc: __alloT('stem.artstudio.create_pixel_art_on_a_grid_canvas', 'Create pixel art on a grid canvas') },
                  { icon: '\u2728', name: __alloT('stem.artstudio.symmetry', 'Symmetry'), desc: __alloT('stem.artstudio.draw_with_rotational_reflective_symmet', 'Draw with rotational & reflective symmetry') },
                  { icon: '\uD83C\uDF00', name: __alloT('stem.artstudio.spirograph', 'Spirograph'), desc: __alloT('stem.artstudio.mathematical_spiral_patterns_hypotroch', 'Mathematical spiral patterns (hypotrochoids)') },
                  { icon: '\uD83C\uDF86', name: __alloT('stem.artstudio.generative', 'Generative'), desc: __alloT('stem.artstudio.flow_fields_particles_starfields_auror', 'Flow fields, particles, starfields, aurora') },
                  { icon: '\uD83C\uDF00', name: __alloT('stem.artstudio.spin_art', 'Spin Art'), desc: __alloT('stem.artstudio.virtual_spin_painting_with_physics', 'Virtual spin painting with physics') },
                  { icon: '\uD83D\uDD78', name: __alloT('stem.artstudio.string_art', 'String Art'), desc: __alloT('stem.artstudio.geometric_string_patterns_on_pegs', 'Geometric string patterns on pegs') },
                  { icon: '\uD83D\uDC41', name: __alloT('stem.artstudio.op_art', 'Op Art'), desc: __alloT('stem.artstudio.optical_illusions_and_visual_tricks', 'Optical illusions and visual tricks') },
                  { icon: '\uD83D\uDD37', name: __alloT('stem.artstudio.tessellation', 'Tessellation'), desc: __alloT('stem.artstudio.repeating_tile_patterns_like_m_c_esche', 'Repeating tile patterns like M.C. Escher') },
                  { icon: '\uD83D\uDD2E', name: __alloT('stem.artstudio.fractals', 'Fractals'), desc: __alloT('stem.artstudio.mandelbrot_julia_sets_sierpinski_trian', 'Mandelbrot, Julia sets, Sierpinski triangle') },
                  { icon: '\uD83C\uDF08', name: __alloT('stem.artstudio.gradient', 'Gradient'), desc: __alloT('stem.artstudio.design_and_export_css_gradient_pattern', 'Design and export CSS gradient patterns') },
                  { icon: '\uD83D\uDC53', name: __alloT('stem.artstudio.stereogram', 'Stereogram'), desc: __alloT('stem.artstudio.hidden_3d_images_magic_eye_style', 'Hidden 3D images (Magic Eye style)') },

                  { icon: '\uD83C\uDFB6', name: __alloT('stem.artstudio.harmony', 'Harmony'), desc: __alloT('stem.artstudio.harmony_desc', 'Explore musical consonance, intervals, and visual sound relationships') },
                  { icon: '\u267F', name: __alloT('stem.artstudio.contrast', 'Contrast'), desc: __alloT('stem.artstudio.wcag_contrast_checker_for_accessibilit', 'WCAG contrast checker for accessibility') },
                ].map(function(tool) {
                  return React.createElement("div", { key: tool.name, className: "bg-white rounded-lg p-2 border border-slate-100 text-center shadow-sm hover:shadow-md transition-shadow cursor-default" },
                    React.createElement("div", { className: "text-lg" }, tool.icon),
                    React.createElement("div", { className: "text-[11px] font-bold text-slate-700 mt-0.5" }, tool.name),
                    React.createElement("div", { className: "text-[11px] text-slate-600 mt-0.5 leading-tight" }, tool.desc)
                  );
                })
              ),
              React.createElement("div", { className: "bg-white rounded-lg p-3 border border-pink-100" },
                React.createElement("h5", { className: "text-[11px] font-bold text-pink-700 uppercase mb-1" }, __alloT('stem.artstudio.educational_concepts', "\uD83D\uDCA1 Educational Concepts")),
                React.createElement("p", { className: "text-[11px] text-slate-600 leading-relaxed" },
                  __alloT('stem.artstudio.color_theory_additive_vs_subtractive_m', "Color theory (additive vs subtractive mixing, complementary colors, HSL/RGB), mathematical curves (hypotrochoids, Lissajous), fractals & self-similarity, tessellation geometry, op art visual perception, WCAG accessibility standards, and computational art. Every tool teaches the math behind the beauty.")
                )
              ),
              React.createElement("button", { onClick: function () { upd('showTour', false); }, className: "mt-3 w-full py-2 bg-pink-600 text-white text-sm font-bold rounded-lg hover:bg-pink-700 transition-colors" }, __alloT('stem.artstudio.got_it_let_s_create', "Got it \u2014 let\u2019s create! \uD83C\uDFA8"))
            ),

            React.createElement('nav', { className: 'mb-4 space-y-2', 'aria-label': __alloT('stem.artstudio.art_studio_sections', 'Art Studio sections'), 'data-artstudio-grouped-nav': 'true' },
              React.createElement('div', { className: 'sm:hidden rounded-2xl border border-slate-300 bg-white p-3 shadow-sm' },
                React.createElement('label', { htmlFor: 'artstudio-mobile-tool-picker', className: 'block text-[11px] font-black uppercase tracking-wider text-slate-600' }, 'Choose a studio tool'),
                React.createElement('select', { id: 'artstudio-mobile-tool-picker', 'aria-controls': 'artstudio-panel-' + tab, value: tab, onChange: function (event) { var nextId = event.target.value; selectArtStudioTab(nextId, ART_STUDIO_TAB_LABELS[nextId] || nextId); }, className: 'mt-1 min-h-[44px] w-full rounded-xl border-2 border-slate-400 bg-white px-3 text-sm font-bold text-slate-900' },
                  ART_STUDIO_GROUPS.map(function (group) {
                    return React.createElement('optgroup', { key: group.id, label: group.label },
                      ART_STUDIO_TAB_ITEMS.filter(function (item) { return group.tabs.indexOf(item.id) !== -1; }).map(function (item) {
                        return React.createElement('option', { key: item.id, value: item.id }, item.label);
                      })
                    );
                  })
                )
              ),
              React.createElement('div', { className: 'hidden sm:block space-y-2' },
                React.createElement('div', { className: 'grid grid-cols-3 lg:grid-cols-6 gap-1 rounded-xl border border-slate-400 bg-slate-100 p-1', role: 'group', 'aria-label': 'Art Studio tool groups' }, ART_STUDIO_GROUPS.map(function (group) {
                  var groupActive = group.id === activeArtStudioGroup.id;
                  return React.createElement('button', {
                    type: 'button', key: group.id, 'aria-pressed': groupActive,
                    onClick: function () { var firstTab = group.tabs[0]; selectArtStudioTab(firstTab, ART_STUDIO_TAB_LABELS[firstTab] || group.label); },
                    className: 'min-h-[42px] rounded-lg px-2 text-xs font-black transition-all ' + (groupActive ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-slate-50')
                  }, group.icon + ' ' + group.label);
                })),
                React.createElement('div', { id: 'artstudio-group-tools', className: 'flex flex-wrap gap-1 rounded-xl border border-rose-200 bg-rose-50/60 p-1', role: 'tablist', 'aria-label': activeArtStudioGroup.label + ' tools' },
                  visibleArtStudioTabs.map(function (tb, tabIndex) {
                    return React.createElement('button', { 'aria-label': 'Switch to ' + tb.label + ' tab', key: tb.id, id: 'artstudio-tab-' + tb.id, 'aria-controls': 'artstudio-panel-' + tb.id, onClick: function () { selectArtStudioTab(tb.id, tb.label); }, role: 'tab', 'aria-selected': tab === tb.id, tabIndex: tab === tb.id ? 0 : -1, onKeyDown: function (e) { artStudioTabKeyDown(e, tabIndex, activeArtStudioGroup.tabs); }, className: 'min-h-[40px] flex-1 rounded-lg px-3 py-2 text-xs font-bold transition-all ' + (tab === tb.id ? 'bg-white text-pink-700 shadow-md ring-1 ring-rose-200' : 'text-slate-700 hover:bg-white/70') }, tb.icon + ' ' + tb.label);
                  })
                )
              )
            ),

            visibleArtStudioTabs.filter(function (tb) { return tb.id !== tab; }).map(function (tb) {
              return React.createElement('div', {
                key: 'artstudio-inactive-panel-' + tb.id,
                id: 'artstudio-panel-' + tb.id,
                role: 'tabpanel',
                'aria-labelledby': 'artstudio-tab-' + tb.id,
                hidden: true
              });
            }),

            React.createElement('section', {
              role: 'tabpanel', id: 'artstudio-panel-' + tab,
              'aria-labelledby': 'artstudio-tab-' + tab, tabIndex: 0,
              'aria-label': (ART_STUDIO_TAB_LABELS[tab] || 'Art Studio') + ' workspace',
              'data-artstudio-workspace': tab,
              className: 'space-y-4 focus:outline-none'
            },

            // ── Topic-accent hero band per tab ──
            (function() {
              var TAB_META = {
                artistExplorer:{ accent: '#9d174d', soft: 'rgba(157,23,77,0.09)', icon: '\uD83C\uDF0D', title: __alloT('stem.artstudio.artist_explorer_title', 'Artists & Traditions — decisions, context, and making'), hint: __alloT('stem.artstudio.artist_explorer_hint', 'Explore 28 practices across seven regions. Learn from artistic decisions and cultural context, then carry the question—not a copied signature style—into an interactive Studio lab.') },
                colorWheel:   { accent: '#db2777', soft: 'rgba(219,39,119,0.10)', icon: '\uD83C\uDFA8', title: __alloT('stem.artstudio.color_wheel_hsl_hsv_complementary_pair', 'Color Wheel \u2014 HSL/HSV + complementary pairs'),           hint: __alloT('stem.artstudio.hue_0_360_around_the_wheel_saturation_', 'Hue (0-360 around the wheel), saturation (purity), lightness (brightness). Complementary across, analogous adjacent, triadic 120\u00b0 apart. Newton put the spectrum on a wheel in 1666.') },
                mixer:        { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '\uD83E\uDDEA', title: __alloT('stem.artstudio.color_mixer_subtractive_vs_additive', 'Color Mixer \u2014 subtractive vs additive'),                  hint: __alloT('stem.artstudio.paint_and_print_subtractive_cmy_mixes_', 'Paint and print = subtractive (CMY mixes to dark); light and screens = additive (RGB mixes to white). Same world, completely different math \u2014 a printer thinks in K plates, a TV thinks in Hz.') },
                watercolor:   { accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: '\uD83C\uDFA8', title: __alloT('stem.artstudio.watercolor_simulation', 'Watercolor \u2014 pigment, water, and paper'),                 hint: __alloT('stem.artstudio.watercolor_simulation_hint', 'Water carries pigment across paper; as the brush unloads and water evaporates, clustered pigment creates granulation and darker drying edges. Try a wash, then a dry brush.') },
                pixel:        { accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: '\uD83D\uDDBC',  title: __alloT('stem.artstudio.pixel_art_bitmap_craft_at_8_8_to_32_32', 'Pixel Art \u2014 bitmap craft at 8\u00d78 to 32\u00d732'),          hint: __alloT('stem.artstudio.each_pixel_is_a_deliberate_decision_ne', 'Each pixel is a deliberate decision. NES sprites famously fit a hero into 16\u00d716 with a 4-color palette. Bresenham\u2019s line algorithm draws diagonals without floats.') },
                symmetry:     { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\u2728',         title: __alloT('stem.artstudio.symmetry_reflection_rotation_glide', 'Symmetry \u2014 reflection, rotation, glide'),                hint: __alloT('stem.artstudio.bilateral_mirror_rotational_n_fold_poi', 'Bilateral (mirror), rotational (n-fold), point. The 17 wallpaper groups classify every possible repeating 2D pattern \u2014 Escher\u2019s entire body of work.') },
                spirograph:   { accent: '#0891b2', soft: 'rgba(8,145,178,0.10)',  icon: '\uD83C\uDF00', title: __alloT('stem.artstudio.spirograph_hypotrochoid_roulettes', 'Spirograph \u2014 hypotrochoid roulettes'),                  hint: __alloT('stem.artstudio.a_small_circle_rolls_inside_a_big_one_', 'A small circle rolls inside a big one, pen offset from center. Ratio of radii determines petal count; offset sets thickness. Toy patented 1965, math from 1700s.') },
                generative:   { accent: '#4f46e5', soft: 'rgba(79,70,229,0.10)',  icon: '\uD83C\uDF86', title: __alloT('stem.artstudio.generative_algorithm_randomness_as_art', 'Generative \u2014 algorithm + randomness as artist'),         hint: __alloT('stem.artstudio.sol_lewitt_wrote_instructions_the_wall', 'Sol LeWitt wrote instructions; the wall installer was the executor. Today: Processing, p5.js, Cinder. \u201CThe artist is the rule, not the result.\u201D') },
                spinArt:      { accent: '#db2777', soft: 'rgba(219,39,119,0.10)', icon: '\uD83C\uDF00', title: __alloT('stem.artstudio.spin_art_centripetal_physics_in_paint', 'Spin Art \u2014 centripetal physics in paint'),               hint: __alloT('stem.artstudio.drop_paint_spin_watch_it_fling_outward', 'Drop paint, spin, watch it fling outward in spirals. Damien Hirst made millions selling spin paintings. Same physics as a salad spinner; F = m\u03c9\u00b2r.') },
                stringArt:    { accent: '#d97706', soft: 'rgba(217,119,6,0.10)',  icon: '\uD83D\uDD78', title: __alloT('stem.artstudio.string_art_curves_from_straight_lines', 'String Art \u2014 curves from straight lines'),                hint: __alloT('stem.artstudio.connect_every_n_th_nail_an_envelope_cu', 'Connect every n-th nail; an envelope curve emerges. Mary Everest Boole introduced this as classroom math c. 1900. The straight-line cardioid is still hypnotic.') },
                opArt:        { accent: '#475569', soft: 'rgba(71,85,105,0.10)',  icon: '\uD83D\uDC41', title: __alloT('stem.artstudio.op_art_fooling_the_visual_system', 'Op Art \u2014 fooling the visual system'),                    hint: __alloT('stem.artstudio.bridget_riley_s_moir_fields_vasarely_s', 'Bridget Riley\u2019s moir\u00e9 fields, Vasarely\u2019s grids. The brain\u2019s motion-detection edge cells over-fire on rapidly alternating contrast \u2014 the page appears to *vibrate*.') },
                tessellation: { accent: '#059669', soft: 'rgba(5,150,105,0.10)',  icon: '\uD83D\uDD37', title: __alloT('stem.artstudio.tessellation_the_17_wallpaper_groups', 'Tessellation \u2014 the 17 wallpaper groups'),                hint: __alloT('stem.artstudio.every_periodic_2d_tiling_fits_one_of_1', 'Every periodic 2D tiling fits one of 17 symmetry groups. Escher figured this out by visiting the Alhambra in 1936; he then spent 30 years exhausting the catalogue.') },
                fractal:      { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83D\uDD2E', title: __alloT('stem.artstudio.fractal_self_similar_at_every_scale', 'Fractal \u2014 self-similar at every scale'),                  hint: __alloT('stem.artstudio.mandelbrot_1975_cauliflower_coastlines', 'Mandelbrot 1975. Cauliflower, coastlines, blood vessels, lightning, lung alveoli \u2014 all fractal. \u201CClouds are not spheres, mountains are not cones, bark is not smooth.\u201D') },
                gradient:     { accent: '#ec4899', soft: 'rgba(236,72,153,0.10)', icon: '\uD83C\uDF08', title: __alloT('stem.artstudio.gradient_smooth_color_transitions', 'Gradient \u2014 smooth color transitions'),                    hint: __alloT('stem.artstudio.css_gives_you_linear_radial_and_conic_', 'CSS gives you linear, radial, and conic gradients. Real rainbows have continuous spectra (no discrete bands) \u2014 the 7 \u201Ccolors of the rainbow\u201D were Newton\u2019s arbitrary choice for musical reasons.') },
                stereogram:   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.10)', icon: '\uD83D\uDC53', title: __alloT('stem.artstudio.stereogram_3d_from_a_flat_page', 'Stereogram \u2014 3D from a flat page'),                       hint: __alloT('stem.artstudio.90s_magic_eye_craze_each_eye_sees_a_sl', '90s Magic Eye craze. Each eye sees a slightly shifted version; if you cross or diverge correctly, the brain fuses them into depth. ~5% of people genuinely can\u2019t \u2014 not their fault.') },
                sculpt3d:     { accent: '#b45309', soft: 'rgba(180,83,9,0.10)', icon: '\uD83D\uDDFF', title: '3D Sculpture \u2014 form, balance, and space',                    hint: 'Build with simple forms, then orbit the work to study silhouette, balance, negative space, scale, and how a sculpture changes from every viewpoint.' },

                contrast:     { accent: '#0d9488', soft: 'rgba(13,148,136,0.10)', icon: '\u267F',         title: __alloT('stem.artstudio.contrast_wcag_4_5_1_3_1_apca', 'Contrast \u2014 WCAG 4.5:1 / 3:1 / APCA'),                   hint: __alloT('stem.artstudio.wcag_2_1_normal_text_4_5_1_large_3_1_w', 'WCAG 2.1: normal text 4.5:1, large 3:1. Why low contrast hurts low-vision readers, even if you can read it. APCA (the WCAG 3.0 successor) uses perceptual lightness, not raw luminance ratio.') },
                harmonyHunt:  { accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: '\uD83C\uDFB6', title: __alloT('stem.artstudio.harmony_lab_title', 'Harmony - sound, ratio, and color'), hint: __alloT('stem.artstudio.harmony_lab_hint', 'Compare consonant and dissonant intervals, connect frequency ratios to pattern, and translate musical relationships into visual harmony.') }
              };
              var meta = TAB_META[tab] || TAB_META.colorWheel;
              return React.createElement('div', {
                'data-artstudio-tab-intro': 'true',
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

            tab === 'artistExplorer' && (function () {
              var regions = ['All regions', 'Africa', 'Asia', 'Europe', 'Latin America & Caribbean', 'Middle East & North Africa', 'North America', 'Oceania'];
              var eras = ['All eras', 'Early modern', 'Modern', 'Contemporary'];
              var media = ['All media', 'Painting & drawing', 'Printmaking', 'Sculpture', 'Ceramics', 'Textiles, pattern & design', 'Photography & video', 'Installation & mixed media'];
              var filters = {
                query: d.artistQuery || '',
                region: d.artistRegion || 'All regions',
                era: d.artistEra || 'All eras',
                medium: d.artistMedium || 'All media'
              };
              var matches = filterArtistExplorerProfiles(filters);
              var selected = matches.filter(function (profile) { return profile.id === d.artistProfileId; })[0] || matches[0] || null;
              var selectedIndex = selected ? ARTIST_EXPLORER_PROFILES.indexOf(selected) : -1;
              var comparison = compareArtistExplorerProfiles(artistCompareIds);
              var artistRightsScope = ['pd', 'pd-cc0', 'all'].indexOf(d.artistRightsScope) !== -1 ? d.artistRightsScope : 'pd';
              var sourcebookApi = typeof window !== 'undefined' ? window.SourcebookProviders : null;
              var sourcebookReady = sourcebookProviderApiReady(sourcebookApi);
              var currentWorks = selected && artistWorksState.profileId === selected.id ? artistWorksState : { profileId: selected ? selected.id : '', status: 'idle', message: '', items: [] };
              function palettePreview(profile, height) {
                var stops = profile.colors.map(function (color, index) { return color + ' ' + Math.round(index * 100 / Math.max(1, profile.colors.length - 1)) + '%'; }).join(',');
                return React.createElement('div', {
                  role: 'img',
                  'aria-label': profile.name + ' study palette: ' + profile.colors.join(', '),
                  style: { height: height || 54, borderRadius: 10, background: 'linear-gradient(135deg,' + stops + ')', border: '1px solid rgba(15,23,42,.16)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.28)' }
                });
              }
              function selectProfile(profile) {
                upd('artistProfileId', profile.id);
                if (typeof announceToSR === 'function') announceToSR('Selected ' + profile.name + ' in Artists and Traditions Explorer');
              }
              function toggleComparison(profile) {
                var ids = comparison.profiles.map(function (item) { return item.id; });
                var existingIndex = ids.indexOf(profile.id);
                if (existingIndex !== -1) ids.splice(existingIndex, 1);
                else if (ids.length < 3) ids.push(profile.id);
                else {
                  if (typeof addToast === 'function') addToast('Compare up to three artists at a time.', 'info');
                  return;
                }
                setArtistCompareIds(ids);
                upd('artistCompareIds', ids);
                if (typeof announceToSR === 'function') announceToSR((existingIndex === -1 ? 'Added ' : 'Removed ') + profile.name + (existingIndex === -1 ? ' to comparison' : ' from comparison'));
              }
              function findRightsClearedWorks(profile) {
                var requestId = ++artistWorksRequestRef.current;
                setArtistWorksState({ profileId: profile.id, status: 'loading', message: (sourcebookReady ? 'Searching public collections' : 'Loading Sourcebook, then searching public collections') + ' and checking item-level reuse rights\u2026', items: [] });
                ensureArtistSourcebookProviders().then(function (api) {
                  return searchArtistSourcebookWorks(profile, api, { rightsScope: artistRightsScope });
                }).then(function (items) {
                  if (requestId !== artistWorksRequestRef.current) return;
                  setArtistWorksState({
                    profileId: profile.id,
                    status: 'ready',
                    message: items.length ? items.length + ' rights-verified collection matches. Review the catalog metadata before deciding whether a result is by or about this artist.' : 'No results passed this rights filter. Try a broader reuse setting or continue in Sourcebook.',
                    items: items
                  });
                }, function () {
                  if (requestId !== artistWorksRequestRef.current) return;
                  setArtistWorksState({ profileId: profile.id, status: 'unavailable', message: 'Sourcebook search is unavailable. No unverified artwork has been substituted.', items: [] });
                });
              }
              function saveWorkToSourcebook(item) {
                if (!sourcebookReady || !sourcebookApi.allowsRightsScope(item, artistRightsScope)) {
                  if (typeof addToast === 'function') addToast('This asset did not pass the active Sourcebook rights filter.', 'error');
                  return;
                }
                setLabToolData(function (prev) {
                  var previousSourcebook = prev.sourcebook || {};
                  var collection = Array.isArray(previousSourcebook.collection) ? previousSourcebook.collection.slice() : [];
                  if (collection.indexOf(item.id) === -1) collection.push(item.id);
                  var savedAssets = Object.assign({}, previousSourcebook.savedAssets || {});
                  savedAssets[item.id] = item;
                  return Object.assign({}, prev, {
                    sourcebook: Object.assign({}, previousSourcebook, {
                      query: selected ? artistSourcebookQuery(selected) : '',
                      rightsScope: artistRightsScope,
                      activeId: item.id,
                      collection: collection,
                      savedAssets: savedAssets
                    })
                  });
                });
                if (typeof addToast === 'function') addToast('Saved to the Sourcebook palette with rights and source metadata.', 'success');
                if (typeof announceToSR === 'function') announceToSR('Saved ' + item.title + ' to the Sourcebook palette');
              }
              function continueInSourcebook(profile) {
                setLabToolData(function (prev) {
                  return Object.assign({}, prev, {
                    sourcebook: Object.assign({}, prev.sourcebook || {}, { query: artistSourcebookQuery(profile), rightsScope: artistRightsScope })
                  });
                });
                if (typeof setStemLabTool === 'function') setStemLabTool('sourcebook');
              }
              return React.createElement('div', { className: 'space-y-4', 'data-artstudio-artist-explorer': 'true' },
                React.createElement('section', { className: 'rounded-xl border border-rose-200 bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4', 'aria-labelledby': 'artist-explorer-intro' },
                  React.createElement('div', { className: 'flex flex-wrap items-start justify-between gap-3' },
                    React.createElement('div', { className: 'max-w-2xl' },
                      React.createElement('h4', { id: 'artist-explorer-intro', className: 'text-base font-black text-rose-900' }, 'A wider map of artistic intelligence'),
                      React.createElement('p', { className: 'mt-1 text-xs leading-relaxed text-slate-700' }, 'Explore artists across seven regions, many media, and different relationships among art, place, history, technology, and community. No profile is a style preset: notice decisions, investigate context, and make from your own experience.')
                    ),
                    React.createElement('span', { className: 'rounded-full bg-rose-900 px-3 py-1 text-[11px] font-black text-white' }, ARTIST_EXPLORER_PROFILES.length + ' profiles')
                  )
                ),
                React.createElement('section', { className: 'rounded-xl border border-slate-300 bg-white p-3', 'aria-label': 'Filter artists and traditions' },
                  React.createElement('div', { className: 'grid gap-2 sm:grid-cols-2 lg:grid-cols-4' },
                    React.createElement('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Search',
                      React.createElement('input', { type: 'search', value: filters.query, onChange: function (event) { upd('artistQuery', event.target.value.slice(0, 80)); }, placeholder: 'Artist, place, idea, medium…', className: 'mt-1 min-h-[42px] w-full rounded-lg border border-slate-400 px-3 text-sm', 'aria-label': 'Search artist profiles' })
                    ),
                    React.createElement('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Region',
                      React.createElement('select', { value: filters.region, onChange: function (event) { upd('artistRegion', event.target.value); }, className: 'mt-1 min-h-[42px] w-full rounded-lg border border-slate-400 bg-white px-2 text-xs', 'aria-label': 'Filter artists by region' }, regions.map(function (value) { return React.createElement('option', { key: value, value: value }, value); }))
                    ),
                    React.createElement('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Era',
                      React.createElement('select', { value: filters.era, onChange: function (event) { upd('artistEra', event.target.value); }, className: 'mt-1 min-h-[42px] w-full rounded-lg border border-slate-400 bg-white px-2 text-xs', 'aria-label': 'Filter artists by era' }, eras.map(function (value) { return React.createElement('option', { key: value, value: value }, value); }))
                    ),
                    React.createElement('label', { className: 'text-[11px] font-bold text-slate-700' }, 'Medium',
                      React.createElement('select', { value: filters.medium, onChange: function (event) { upd('artistMedium', event.target.value); }, className: 'mt-1 min-h-[42px] w-full rounded-lg border border-slate-400 bg-white px-2 text-xs', 'aria-label': 'Filter artists by medium' }, media.map(function (value) { return React.createElement('option', { key: value, value: value }, value); }))
                    )
                  ),
                  React.createElement('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
                    React.createElement('p', { className: 'mr-auto text-xs font-bold text-slate-700', role: 'status', 'aria-live': 'polite' }, matches.length + ' matching profile' + (matches.length === 1 ? '' : 's')),
                    React.createElement('button', { type: 'button', onClick: function () { upd('artistQuery', ''); upd('artistRegion', 'All regions'); upd('artistEra', 'All eras'); upd('artistMedium', 'All media'); }, className: 'min-h-[38px] rounded-lg border border-slate-400 bg-slate-50 px-3 text-xs font-bold text-slate-800' }, 'Clear filters'),
                    React.createElement('button', { type: 'button', disabled: !ARTIST_EXPLORER_PROFILES.length, onClick: function () { var next = ARTIST_EXPLORER_PROFILES[(Math.max(0, selectedIndex) + 7) % ARTIST_EXPLORER_PROFILES.length]; upd('artistQuery', ''); upd('artistRegion', 'All regions'); upd('artistEra', 'All eras'); upd('artistMedium', 'All media'); selectProfile(next); }, className: 'min-h-[38px] rounded-lg bg-rose-800 px-3 text-xs font-black text-white disabled:opacity-50' }, 'Surprise me')
                  )
                ),
                comparison.profiles.length > 0 && React.createElement('section', { className: 'rounded-xl border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-white p-4', 'aria-labelledby': 'artist-comparison-title', 'data-artist-comparison': 'true' },
                  React.createElement('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
                    React.createElement('div', null,
                      React.createElement('h4', { id: 'artist-comparison-title', className: 'font-black text-indigo-950' }, 'Compare artistic decisions'),
                      React.createElement('p', { className: 'mt-1 text-xs text-indigo-900' }, comparison.profiles.length < 2 ? 'Choose at least one more profile to begin a side-by-side inquiry.' : 'Compare context and choices without flattening distinct practices into a shared style.')
                    ),
                    React.createElement('div', { className: 'flex items-center gap-2' },
                      React.createElement('span', { className: 'rounded-full bg-indigo-900 px-3 py-1 text-[10px] font-black text-white' }, comparison.profiles.length + ' of 3'),
                      React.createElement('button', { type: 'button', onClick: function () { setArtistCompareIds([]); upd('artistCompareIds', []); }, className: 'min-h-[36px] rounded-lg border border-indigo-400 bg-white px-3 text-[11px] font-black text-indigo-950' }, 'Clear')
                    )
                  ),
                  React.createElement('div', { className: 'mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3', role: 'list', 'aria-label': 'Artists selected for comparison' }, comparison.profiles.map(function (profile) {
                    return React.createElement('article', { key: profile.id, role: 'listitem', className: 'rounded-xl border border-indigo-200 bg-white p-3 shadow-sm' },
                      palettePreview(profile, 34),
                      React.createElement('div', { className: 'mt-2 flex items-start justify-between gap-2' },
                        React.createElement('div', null,
                          React.createElement('h5', { className: 'text-sm font-black text-slate-950' }, profile.name),
                          React.createElement('p', { className: 'text-[10px] font-bold text-slate-600' }, profile.places + ' \u00B7 ' + profile.medium)
                        ),
                        React.createElement('button', { type: 'button', onClick: function () { toggleComparison(profile); }, 'aria-label': 'Remove ' + profile.name + ' from comparison', className: 'rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-black text-slate-700' }, 'Remove')
                      ),
                      React.createElement('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-700' }, profile.lookFor),
                      React.createElement('p', { className: 'mt-2 rounded-lg bg-emerald-50 p-2 text-[10px] leading-relaxed text-emerald-950' }, profile.tryThis)
                    );
                  })),
                  comparison.profiles.length >= 2 && React.createElement('div', { className: 'mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]' },
                    React.createElement('div', { className: 'rounded-xl border border-indigo-200 bg-white p-3' },
                      React.createElement('h5', { className: 'text-xs font-black text-indigo-950' }, 'Inquiry prompts'),
                      React.createElement('ol', { className: 'mt-2 list-decimal space-y-1 pl-5 text-[11px] leading-relaxed text-slate-700' }, comparison.prompts.map(function (prompt) { return React.createElement('li', { key: prompt }, prompt); }))
                    ),
                    React.createElement('div', { className: 'rounded-xl border border-indigo-200 bg-white p-3' },
                      React.createElement('h5', { className: 'text-xs font-black text-indigo-950' }, comparison.sharedLabs.length ? 'Shared Studio labs' : 'Different lab pathways'),
                      React.createElement('div', { className: 'mt-2 flex flex-wrap gap-2' }, (comparison.sharedLabs.length ? comparison.sharedLabs : comparison.profiles.reduce(function (ids, profile) {
                        profile.labs.forEach(function (labId) { if (ids.indexOf(labId) === -1 && ids.length < 3) ids.push(labId); });
                        return ids;
                      }, [])).map(function (labId) {
                        var label = ART_STUDIO_TAB_LABELS[labId] || labId;
                        return React.createElement('button', { key: labId, type: 'button', onClick: function () { selectArtStudioTab(labId, label); }, className: 'min-h-[36px] rounded-lg bg-indigo-900 px-3 text-[10px] font-black text-white' }, 'Open ' + label);
                      }))
                    )
                  )
                ),
                matches.length === 0 ? React.createElement('div', { className: 'rounded-xl border border-amber-300 bg-amber-50 p-5 text-center' },
                  React.createElement('h4', { className: 'font-black text-amber-950' }, 'No profiles match these filters'),
                  React.createElement('p', { className: 'mt-1 text-xs text-amber-900' }, 'Clear one or more filters to return to the full explorer.')
                ) : React.createElement('div', { className: 'grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]' },
                  React.createElement('div', { className: 'grid gap-3 sm:grid-cols-2', role: 'list', 'aria-label': 'Artist and tradition profiles' }, matches.map(function (profile) {
                    var active = selected && selected.id === profile.id;
                    return React.createElement('div', { key: profile.id, role: 'listitem' },
                      React.createElement('button', {
                        type: 'button', 'aria-pressed': active, onClick: function () { selectProfile(profile); },
                        className: 'h-full w-full min-h-[150px] rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus:ring-2 focus:ring-rose-700 ' + (active ? 'border-rose-700 bg-rose-50 shadow-md' : 'border-slate-300 bg-white hover:border-rose-400 hover:shadow-sm')
                      },
                        palettePreview(profile, 42),
                        React.createElement('div', { className: 'mt-2 flex items-start justify-between gap-2' },
                          React.createElement('div', null,
                            React.createElement('h5', { className: 'text-sm font-black text-slate-900' }, profile.name),
                            React.createElement('p', { className: 'text-[11px] font-bold text-slate-600' }, profile.life + ' · ' + profile.places)
                          ),
                          React.createElement('span', { className: 'rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black text-slate-700' }, profile.region)
                        ),
                        React.createElement('p', { className: 'mt-2 text-[11px] leading-relaxed text-slate-700' }, profile.overview)
                      ),
                      React.createElement('button', {
                        type: 'button',
                        'aria-pressed': comparison.profiles.some(function (item) { return item.id === profile.id; }),
                        onClick: function () { toggleComparison(profile); },
                        className: 'mt-2 min-h-[38px] w-full rounded-lg border px-3 text-[11px] font-black ' + (comparison.profiles.some(function (item) { return item.id === profile.id; }) ? 'border-indigo-700 bg-indigo-50 text-indigo-950' : 'border-slate-400 bg-white text-slate-700')
                      }, comparison.profiles.some(function (item) { return item.id === profile.id; }) ? '✓ In comparison' : '+ Add to compare')
                    );
                  })),
                  selected && React.createElement('aside', { className: 'lg:sticky lg:top-2 max-h-[72vh] overflow-y-auto rounded-xl border-2 border-rose-300 bg-[#fffaf3] p-4 shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-700', tabIndex: 0, 'aria-label': 'Selected artist study details' },
                    palettePreview(selected, 82),
                    React.createElement('p', { className: 'mt-3 text-[10px] font-black uppercase tracking-wider text-rose-800' }, selected.region + ' · ' + selected.era),
                    React.createElement('div', { className: 'mt-1 flex items-start justify-between gap-2' },
                      React.createElement('h4', { className: 'font-serif text-xl font-black text-slate-900' }, selected.name),
                      React.createElement('button', { type: 'button', onClick: function () { toggleComparison(selected); }, 'aria-pressed': comparison.profiles.some(function (item) { return item.id === selected.id; }), className: 'shrink-0 rounded-lg border border-indigo-400 bg-white px-2 py-1 text-[10px] font-black text-indigo-950' }, comparison.profiles.some(function (item) { return item.id === selected.id; }) ? '\u2713 Compare' : '+ Compare')
                    ),
                    React.createElement('p', { className: 'text-xs font-bold text-slate-600' }, selected.life + ' · ' + selected.medium),
                    React.createElement('p', { className: 'mt-3 text-xs leading-relaxed text-slate-700' }, selected.overview),
                    React.createElement('section', { className: 'mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3' },
                      React.createElement('h5', { className: 'text-xs font-black text-sky-950' }, 'Look closely'),
                      React.createElement('p', { className: 'mt-1 text-[11px] leading-relaxed text-sky-950' }, selected.lookFor)
                    ),
                    React.createElement('section', { className: 'mt-3 rounded-lg border border-violet-200 bg-violet-50 p-3' },
                      React.createElement('h5', { className: 'text-xs font-black text-violet-950' }, 'Context matters'),
                      React.createElement('p', { className: 'mt-1 text-[11px] leading-relaxed text-violet-950' }, selected.context)
                    ),
                    React.createElement('section', { className: 'mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3' },
                      React.createElement('h5', { className: 'text-xs font-black text-emerald-950' }, 'Try the underlying question'),
                      React.createElement('p', { className: 'mt-1 text-[11px] leading-relaxed text-emerald-950' }, selected.tryThis)
                    ),
                    React.createElement('section', { className: 'mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3' },
                      React.createElement('h5', { className: 'text-xs font-black text-amber-950' }, 'Learn with respect'),
                      React.createElement('p', { className: 'mt-1 text-[11px] leading-relaxed text-amber-950' }, selected.respect)
                    ),
                    React.createElement('div', { className: 'mt-3' },
                      React.createElement('p', { className: 'text-[10px] font-black uppercase tracking-wider text-slate-600' }, 'Carry the inquiry into a Studio lab'),
                      React.createElement('div', { className: 'mt-2 flex flex-wrap gap-2' }, selected.labs.map(function (labId) {
                        var labLabel = ART_STUDIO_TAB_LABELS[labId] || labId;
                        return React.createElement('button', { key: labId, type: 'button', onClick: function () { selectArtStudioTab(labId, labLabel); }, className: 'min-h-[38px] rounded-lg bg-slate-900 px-3 text-[11px] font-black text-white' }, 'Open ' + labLabel);
                      }))
                    ),
                    React.createElement('section', { className: 'mt-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3', 'aria-labelledby': 'artist-sourcebook-title' },
                      React.createElement('p', { className: 'text-[9px] font-black uppercase tracking-[.16em] text-emerald-800' }, 'Sourcebook bridge'),
                      React.createElement('h5', { id: 'artist-sourcebook-title', className: 'mt-1 text-xs font-black text-emerald-950' }, 'Find reusable collection images'),
                      React.createElement('p', { className: 'mt-1 text-[10px] leading-relaxed text-emerald-950' }, 'Searches Sourcebook providers and fails closed: no result appears unless its item-level rights pass the selected allowlist.'),
                      React.createElement('label', { className: 'mt-2 block text-[10px] font-black text-emerald-950' }, 'Reuse rights',
                        React.createElement('select', { value: artistRightsScope, onChange: function (event) { upd('artistRightsScope', event.target.value); setArtistWorksState({ profileId: '', status: 'idle', message: '', items: [] }); }, className: 'mt-1 min-h-[38px] w-full rounded-lg border border-emerald-500 bg-white px-2 text-[11px]', 'aria-label': 'Rights filter for artist collection search' },
                          React.createElement('option', { value: 'pd' }, 'Public domain only'),
                          React.createElement('option', { value: 'pd-cc0' }, 'Public domain + CC0'),
                          React.createElement('option', { value: 'all' }, 'Public domain + CC0 + CC BY')
                        )
                      ),
                      React.createElement('div', { className: 'mt-2 grid gap-2' },
                        React.createElement('button', { type: 'button', disabled: currentWorks.status === 'loading', onClick: function () { findRightsClearedWorks(selected); }, className: 'min-h-[40px] rounded-lg bg-emerald-900 px-3 text-[11px] font-black text-white disabled:opacity-50' }, currentWorks.status === 'loading' ? 'Checking rights…' : (sourcebookReady ? 'Find rights-cleared images' : 'Load Sourcebook & find images')),
                        React.createElement('button', { type: 'button', onClick: function () { continueInSourcebook(selected); }, className: 'min-h-[40px] rounded-lg border border-emerald-700 bg-white px-3 text-[11px] font-black text-emerald-950' }, 'Continue this search in Sourcebook →')
                      ),
                      !sourcebookReady && React.createElement('p', { className: 'mt-2 text-[10px] font-bold text-emerald-900', role: 'status' }, 'Sourcebook’s verified provider service will load on demand. If it cannot load, Art Studio shows no substitute results.')
                    ),
                    React.createElement('a', { href: artistExplorerSourceUrl(selected), target: '_blank', rel: 'noopener noreferrer', className: 'mt-4 inline-flex min-h-[40px] items-center rounded-lg border border-rose-700 bg-white px-3 text-xs font-black text-rose-900' }, 'Explore museum collection records ↗'),
                    React.createElement('p', { className: 'mt-2 text-[10px] leading-relaxed text-slate-500' }, 'External collection records are for further study. Rights vary by individual artwork; this tab does not grant reuse permission or reproduce those works.')
                  )
                ),
                selected && currentWorks.status !== 'idle' && React.createElement('section', { className: 'rounded-2xl border-2 border-emerald-300 bg-[#f4fbf7] p-4', 'aria-labelledby': 'artist-sourcebook-results-title', 'data-artist-sourcebook-results': currentWorks.status },
                  React.createElement('div', { className: 'flex flex-wrap items-start justify-between gap-2' },
                    React.createElement('div', null,
                      React.createElement('p', { className: 'text-[9px] font-black uppercase tracking-[.18em] text-emerald-800' }, 'Rights-verified visual assets'),
                      React.createElement('h4', { id: 'artist-sourcebook-results-title', className: 'mt-1 font-serif text-xl font-black text-emerald-950' }, 'Sourcebook matches for ' + selected.name),
                      React.createElement('p', { className: 'mt-1 max-w-3xl text-[11px] leading-relaxed text-emerald-950', role: 'status', 'aria-live': 'polite' }, currentWorks.message)
                    ),
                    React.createElement('span', { className: 'rounded-full bg-emerald-900 px-3 py-1 text-[10px] font-black text-white' }, artistRightsScope === 'pd' ? 'Public domain only' : (artistRightsScope === 'pd-cc0' ? 'PD + CC0' : 'PD + CC0 + CC BY'))
                  ),
                  currentWorks.status === 'loading' && React.createElement('div', { className: 'mt-4 h-2 overflow-hidden rounded-full bg-emerald-100', 'aria-hidden': 'true' }, React.createElement('div', { className: 'h-full w-1/2 animate-pulse rounded-full bg-emerald-700' })),
                  currentWorks.status === 'ready' && currentWorks.items.length === 0 && React.createElement('div', { className: 'mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950' }, 'Nothing was shown because no collection result passed both relevance and the active rights allowlist.'),
                  currentWorks.items.length > 0 && React.createElement('div', { className: 'mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3', role: 'list', 'aria-label': 'Rights-verified Sourcebook matches' }, currentWorks.items.map(function (item) {
                    var credit = sourcebookApi && typeof sourcebookApi.buildAttribution === 'function' ? sourcebookApi.buildAttribution(item) : ((item.creator || 'Creator not listed') + ' · ' + (item.provider || 'Source collection'));
                    return React.createElement('article', { key: item.id, role: 'listitem', className: 'overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-sm' },
                      React.createElement('div', { className: 'h-44 bg-slate-100' }, React.createElement('img', { src: item.imageUrl, alt: item.title + (item.creator ? ' by ' + item.creator : ''), loading: 'lazy', className: 'h-full w-full object-contain' })),
                      React.createElement('div', { className: 'p-3' },
                        React.createElement('div', { className: 'flex items-start justify-between gap-2' },
                          React.createElement('h5', { className: 'text-xs font-black leading-snug text-slate-950' }, item.title),
                          React.createElement('span', { className: 'shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black text-emerald-950' }, item.rightsShort || item.license)
                        ),
                        React.createElement('p', { className: 'mt-1 text-[10px] font-bold text-slate-600' }, (item.creator || 'Creator not listed') + ' · ' + (item.provider || 'Open collection')),
                        React.createElement('p', { className: 'mt-2 text-[9px] leading-relaxed text-slate-600' }, credit),
                        React.createElement('div', { className: 'mt-3 grid gap-2' },
                          React.createElement('button', { type: 'button', onClick: function () { saveWorkToSourcebook(item); }, className: 'min-h-[38px] rounded-lg bg-emerald-900 px-3 text-[10px] font-black text-white' }, 'Save to Sourcebook palette'),
                          React.createElement('a', { href: item.sourceUrl, target: '_blank', rel: 'noopener noreferrer', className: 'min-h-[38px] inline-flex items-center justify-center rounded-lg border border-emerald-700 bg-white px-3 text-[10px] font-black text-emerald-950' }, 'Verify source & rights ↗')
                        )
                      )
                    );
                  }))
                )
              );
            })(),

            tab === 'colorWheel' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "flex flex-col lg:flex-row gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("canvas", { tabIndex: 0, ref: wheelRef, width: 320, height: 320, role: "img",
                  'aria-label': 'Interactive color wheel. Hue ' + (d.hue || 0) + ' degrees, saturation ' + (d.sat !== undefined ? d.sat : 100) + ' percent, lightness ' + (d.lit !== undefined ? d.lit : 50) + ' percent.',
                  'aria-describedby': "artstudio-color-wheel-help",
                  'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home End",
                  className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair flex-shrink-0 focus-visible:ring-4 focus-visible:ring-pink-600 focus-visible:ring-offset-2",
                  style: { background: '#1e1e2e', maxWidth: '100%' } }),

                React.createElement("div", { className: "flex-1 space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl p-4 border border-pink-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-pink-700 mb-2" }, __alloT('stem.artstudio.selected_color', "\uD83C\uDFAF Selected Color")),

                    React.createElement("div", { className: "flex flex-wrap items-center gap-3 mb-3" },

                      React.createElement("div", { "aria-hidden": "true", style: { width: 60, height: 60, borderRadius: 12, background: 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                      React.createElement("div", null,

                        React.createElement("p", { className: "text-sm font-bold text-slate-800" }, "HSL(" + (d.hue || 0) + ", " + (d.sat || 100) + "%, " + (d.lit || 50) + "%)"),

                        React.createElement("p", { id: "artstudio-color-wheel-help", className: "text-[11px] text-slate-600" }, "Click the wheel, or focus it and use Arrow keys to adjust hue; hold Shift for 10-degree steps; Home selects 0 degrees and End selects 359 degrees.")

                      )

                    ),

                    [{ k: 'hue', label: 'Hue', min: 0, max: 360 }, { k: 'sat', label: __alloT('stem.artstudio.saturation', 'Saturation %'), min: 0, max: 100 }, { k: 'lit', label: __alloT('stem.artstudio.lightness', 'Lightness %'), min: 0, max: 100 }].map(function (s) {

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-color-' + s.k, className: "text-[11px] font-bold text-pink-700 block mb-0.5" }, s.label + ": " + (d[s.k] !== undefined ? d[s.k] : (s.k === 'hue' ? 0 : s.k === 'sat' ? 100 : 50))),

                        React.createElement("input", { id: 'artstudio-color-' + s.k, type: "range", min: s.min, max: s.max, value: d[s.k] !== undefined ? d[s.k] : (s.k === 'hue' ? 0 : s.k === 'sat' ? 100 : 50), onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-pink-600" })

                      );

                    })

                  ),

                  React.createElement("div", { className: "bg-white rounded-xl p-3 border border-pink-200" },

                    React.createElement("p", { id: "artstudio-color-harmony-label", className: "text-[11px] font-bold text-pink-700 mb-2" }, __alloT('stem.artstudio.color_harmony', "\uD83D\uDD17 Color Harmony")),

                    React.createElement("div", { className: "flex flex-wrap gap-1", role: "group", "aria-labelledby": "artstudio-color-harmony-label" },

                      ['complementary', 'triadic', 'analogous', 'split'].map(function (h) {

                        return React.createElement("button", { key: h, "aria-pressed": (d.harmony || 'complementary') === h, onClick: function () { upd('harmony', h); }, className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all " + ((d.harmony || 'complementary') === h ? 'bg-pink-600 text-white' : 'bg-slate-50 text-slate-600 hover:bg-pink-50') }, h);

                      })

                    )

                  )

                )

              )

            ),

            tab === 'mixer' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "grid grid-cols-3 gap-4 items-center" },

                React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200 text-center" },

                  React.createElement("div", { style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mix1.h + ',' + mix1.s + '%,' + mix1.l + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-indigo-700 mb-2" }, __alloT('stem.artstudio.color_a', "Color A")),

                  [{ k: 'mix1H', max: 360, val: mix1.h }, { k: 'mix1S', max: 100, val: mix1.s }, { k: 'mix1L', max: 100, val: mix1.l }].map(function (s) {

                    return React.createElement("input", { key: s.k, type: "range", min: 0, max: s.max, value: s.val, 'aria-label': s.k + ' channel', onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-indigo-500 mb-1" });

                  })

                ),

                React.createElement("div", { className: "text-center" },

                  React.createElement("div", { style: { width: 100, height: 100, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mixed.h + ',' + mixed.s + '%,' + mixed.l + '%)', border: '4px solid white', boxShadow: '0 6px 20px rgba(0,0,0,0.2)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-slate-700 mb-2" }, __alloT('stem.artstudio.result', "\uD83C\uDFAF Result")),

                  React.createElement("input", { type: "range", min: 0, max: 100, value: Math.round(mixRatio * 100), 'aria-label': __alloT('stem.artstudio.color_mix_ratio', 'Color mix ratio'), onChange: function (e) { upd('mixRatio', parseInt(e.target.value) / 100); }, className: "w-full accent-pink-500" }),

                  React.createElement("p", { className: "text-[11px] text-slate-600" }, Math.round((1 - mixRatio) * 100) + '% A + ' + Math.round(mixRatio * 100) + '% B')

                ),

                React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200 text-center" },

                  React.createElement("div", { style: { width: 80, height: 80, borderRadius: '50%', margin: '0 auto 8px', background: 'hsl(' + mix2.h + ',' + mix2.s + '%,' + mix2.l + '%)', border: '3px solid white', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' } }),

                  React.createElement("p", { className: "text-xs font-bold text-rose-700 mb-2" }, __alloT('stem.artstudio.color_b', "Color B")),

                  [{ k: 'mix2H', max: 360, val: mix2.h }, { k: 'mix2S', max: 100, val: mix2.s }, { k: 'mix2L', max: 100, val: mix2.l }].map(function (s) {

                    return React.createElement("input", { key: s.k, type: "range", min: 0, max: s.max, value: s.val, 'aria-label': s.k + ' filter', onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-rose-500 mb-1" });

                  })

                )

              )

            ),

            tab === 'watercolor' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 flex-wrap bg-teal-50 rounded-xl p-3 border border-teal-200" },
                React.createElement("label", { htmlFor: "artstudio-watercolor-color", className: "text-xs font-bold text-teal-800" }, __alloT('stem.artstudio.watercolor_color', "Pigment color")),
                React.createElement("input", { id: "artstudio-watercolor-color", type: "color", value: d.watercolorColor || '#2f6fb0', onChange: function (e) { upd('watercolorColor', e.target.value); }, 'aria-label': __alloT('stem.artstudio.watercolor_color', "Pigment color"), className: "h-8 w-12 rounded cursor-pointer border border-teal-300 bg-white" }),
                React.createElement("div", { className: "flex gap-1 ml-auto flex-wrap" },
                  WATERCOLOR_PIGMENTS.map(function (swatch) {
                    return React.createElement("button", { key: swatch.color, type: "button", onClick: function () { upd('watercolorColor', swatch.color); Object.keys(swatch.values).forEach(function (key) { upd(key, swatch.values[key]); }); if (typeof announceToSR === 'function') announceToSR(swatch.label + ' pigment preset applied: ' + swatch.description + '.'); }, title: swatch.label + ': ' + swatch.description, 'aria-label': 'Choose ' + swatch.label + ' pigment preset, ' + swatch.description, 'aria-pressed': (d.watercolorColor || '#2f6fb0').toLowerCase() === swatch.color, className: "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 " + ((d.watercolorColor || '#2f6fb0').toLowerCase() === swatch.color ? 'border-slate-900 scale-110' : 'border-white'), style: { background: swatch.color, boxShadow: '0 1px 3px rgba(0,0,0,0.25)' } });
                  })
                )
              ),

              React.createElement("section", { 'aria-label': "Watercolor canvas workspace", className: "space-y-2" },
                React.createElement("div", { className: "rounded-xl border-2 border-teal-200 bg-[#f8f7f1] p-2 shadow-lg" },
                  React.createElement("canvas", { id: "watercolorCanvas", tabIndex: 0, ref: watercolorRef, width: 512, height: 512, role: "img", 'aria-label': 'Watercolor painting canvas. Focus and use Arrow keys to move the brush, then press Enter or Space to dab.', 'aria-describedby': "artstudio-watercolor-keyboard-help artstudio-watercolor-status", 'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter Space P Control+Z Control+Y Meta+Z Meta+Y", className: "rounded-lg cursor-crosshair mx-auto block w-full max-w-[640px] focus-visible:ring-4 focus-visible:ring-teal-700 focus-visible:ring-offset-2", style: { aspectRatio: '1 / 1', touchAction: 'none' } })
                ),
                React.createElement("div", { className: "flex gap-2 flex-wrap items-center" },
                  React.createElement("button", { id: "artstudio-watercolor-undo", type: "button", disabled: true, onClick: function () { var c = document.getElementById('watercolorCanvas'); var changed = !!(c && c._watercolorEngine && c._watercolorEngine.undo()); if (typeof announceToSR === 'function') announceToSR(changed ? 'Watercolor undone.' : 'Nothing to undo.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed" }, __alloT('stem.artstudio.undo_watercolor', "Undo")),
                  React.createElement("button", { id: "artstudio-watercolor-redo", type: "button", disabled: true, onClick: function () { var c = document.getElementById('watercolorCanvas'); var changed = !!(c && c._watercolorEngine && c._watercolorEngine.redo()); if (typeof announceToSR === 'function') announceToSR(changed ? 'Watercolor redone.' : 'Nothing to redo.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-50 text-violet-800 border border-violet-200 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed" }, __alloT('stem.artstudio.redo_watercolor', "Redo")),
                  React.createElement("button", { id: "artstudio-watercolor-pause", type: "button", 'aria-pressed': false, 'data-pause-label': __alloT('stem.artstudio.pause_watercolor_drying', "Pause drying"), 'data-resume-label': __alloT('stem.artstudio.resume_watercolor_drying', "Resume drying"), onClick: function () { var c = document.getElementById('watercolorCanvas'); var isPaused = !!(c && c._watercolorEngine && c._watercolorEngine.togglePause()); if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Watercolor drying paused.' : 'Watercolor drying resumed.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100" }, __alloT('stem.artstudio.pause_watercolor_drying', "Pause drying")),
                  React.createElement("button", { id: "artstudio-watercolor-remove-mask", type: "button", onClick: function () { var c = document.getElementById('watercolorCanvas'); var changed = !!(c && c._watercolorEngine && c._watercolorEngine.removeMask()); if (typeof announceToSR === 'function') announceToSR(changed ? 'All watercolor masking fluid removed.' : 'No masking fluid to remove.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-50 text-slate-700 border border-slate-300 hover:bg-slate-100" }, __alloT('stem.artstudio.remove_all_masking_fluid', "Remove all mask")),
                  React.createElement("button", { type: "button", onClick: function () { var c = document.getElementById('watercolorCanvas'); if (c && c._watercolorEngine) c._watercolorEngine.clear(); else saveWatercolorMetadata('', ''); if (typeof announceToSR === 'function') announceToSR('Watercolor canvas cleared.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100" }, __alloT('stem.artstudio.clear_watercolor', "Clear")),
                  React.createElement("button", { type: "button", onClick: function () { var c = document.getElementById('watercolorCanvas'); if (c && c._watercolorEngine) c._watercolorEngine.reload(); if (typeof announceToSR === 'function') announceToSR('Watercolor brush reloaded.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-50 text-sky-800 border border-sky-200 hover:bg-sky-100" }, __alloT('stem.artstudio.reload_watercolor_brush', "Reload brush")),
                  React.createElement("button", { type: "button", onClick: function () { var c = document.getElementById('watercolorCanvas'); if (c && c._watercolorEngine) c._watercolorEngine.dry(); if (typeof announceToSR === 'function') announceToSR('Watercolor dried.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100" }, __alloT('stem.artstudio.dry_watercolor', "Dry paint")),
                  React.createElement("button", { type: "button", onClick: function () { var c = document.getElementById('watercolorCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'watercolor-' + Date.now() + '.png'; link.href = c._watercolorEngine && c._watercolorEngine.captureSnapshot ? c._watercolorEngine.captureSnapshot() : c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Watercolor PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Watercolor PNG exported without diagnostic overlays.'); }, className: "ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_watercolor_png', "Export PNG"))
                ),
                React.createElement("p", { id: "artstudio-watercolor-keyboard-help", className: "text-[11px] text-slate-600 text-center" }, __alloT('stem.artstudio.watercolor_keyboard_help', "Draw with a pointer or stylus; pressure, tilt, and stroke speed shape the mark. Focus the canvas and use Arrow keys to move; press Enter or Space to dab, P to pause drying, and Ctrl/Command+Z to undo.")),
                React.createElement("div", { id: "artstudio-watercolor-status", role: "status", 'aria-live': "polite", 'aria-atomic': "true", className: "text-[11px] font-semibold text-teal-900 text-center bg-teal-50 rounded-lg border border-teal-200 px-3 py-2" }, "Paper: Dry | active area 0%. Brush load: 100% water | 100% pigment. Masked area: 0%. Climate: 45% humidity | 25% airflow. Paper chemistry: 58% sizing | 60% bloom response. Drying active. Wet-state autosave on.")
              ),

              (function () {
                var stainingValue = isFinite(Number(d.watercolorStaining)) ? Number(d.watercolorStaining) : 50;
                var opacityValue = isFinite(Number(d.watercolorOpacity)) ? Number(d.watercolorOpacity) : 40;
                var granulationValue = isFinite(Number(d.watercolorGranulation)) ? Number(d.watercolorGranulation) : 54;
                var mobilityValue = isFinite(Number(d.watercolorMobility)) ? Number(d.watercolorMobility) : 55;
                var stainingLabel = stainingValue < 34 ? 'low staining' : (stainingValue < 67 ? 'medium staining' : 'high staining');
                var opacityLabel = opacityValue < 34 ? 'transparent' : (opacityValue < 67 ? 'semi-opaque' : 'opaque');
                var granulationLabel = granulationValue < 34 ? 'smooth' : (granulationValue < 67 ? 'moderately granulating' : 'granulating');
                var mobilityLabel = mobilityValue < 34 ? 'low mobility' : (mobilityValue < 67 ? 'medium mobility' : 'high mobility');
                var character = opacityLabel + ' / ' + stainingLabel + ' / ' + granulationLabel + ' / ' + mobilityLabel;
                return React.createElement("div", { role: "note", 'aria-label': 'Current pigment character: ' + character, className: "text-[11px] font-semibold text-teal-900 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2" },
                  React.createElement("strong", null, __alloT('stem.artstudio.pigment_character', 'Pigment character: ')), character
                );
              })(),

              React.createElement("details", { id: "artstudio-watercolor-mixing-disclosure", open: !!d.watercolorMixingOpen, onToggle: function (event) { var nextOpen = !!event.currentTarget.open; if (nextOpen !== !!d.watercolorMixingOpen) upd('watercolorMixingOpen', nextOpen); }, className: "rounded-xl border border-amber-300 bg-amber-50/60" },
                React.createElement("summary", { className: "cursor-pointer select-none px-3 py-2 text-xs font-black text-amber-950" }, 'Mix pigments'),
              (function () {
                var firstPigment = getWatercolorPigment(d.watercolorMixA || 'ultramarine');
                var secondPigment = getWatercolorPigment(d.watercolorMixB || 'ochre');
                var secondPercent = isFinite(Number(d.watercolorMixRatio)) ? Math.max(0, Math.min(100, Number(d.watercolorMixRatio))) : 50;
                var firstPercent = 100 - secondPercent;
                var mixture = mixWatercolorPigments(firstPigment, secondPigment, secondPercent);
                var mixtureSummary = firstPercent + '% ' + firstPigment.label + ' and ' + secondPercent + '% ' + secondPigment.label;
                var loadMixture = function () {
                  upd('watercolorColor', mixture.color);
                  Object.keys(mixture.values).forEach(function (key) { upd(key, mixture.values[key]); });
                  if (typeof announceToSR === 'function') announceToSR('Mixed pigment loaded: ' + mixtureSummary + '.');
                };
                return React.createElement("div", { id: "artstudio-watercolor-mixing-tray", role: "group", 'aria-labelledby': "artstudio-watercolor-mixing-title", className: "rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2" },
                  React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },
                    React.createElement("div", null,
                      React.createElement("h4", { id: "artstudio-watercolor-mixing-title", className: "text-xs font-extrabold text-amber-950" }, __alloT('stem.artstudio.watercolor_mixing_tray', 'Pigment mixing tray')),
                      React.createElement("p", { className: "text-[11px] text-amber-900" }, __alloT('stem.artstudio.watercolor_mixing_help', 'Blend two material profiles using optical absorbance.'))
                    ),
                    React.createElement("div", { role: "img", 'aria-label': 'Mixture preview: ' + mixtureSummary, title: mixtureSummary, className: "ml-auto h-10 w-16 rounded-lg border-2 border-white shadow-sm", style: { background: mixture.color } })
                  ),
                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" },
                    React.createElement("label", { htmlFor: "artstudio-watercolor-mix-a", className: "text-[11px] font-bold text-amber-950" },
                      __alloT('stem.artstudio.mix_pigment_a', 'Pigment A'),
                      React.createElement("select", { id: "artstudio-watercolor-mix-a", value: firstPigment.id, onChange: function (e) { upd('watercolorMixA', e.target.value); }, className: "block mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs" },
                        WATERCOLOR_PIGMENTS.map(function (pigment) { return React.createElement("option", { key: pigment.id, value: pigment.id }, pigment.label); })
                      )
                    ),
                    React.createElement("label", { htmlFor: "artstudio-watercolor-mix-b", className: "text-[11px] font-bold text-amber-950" },
                      __alloT('stem.artstudio.mix_pigment_b', 'Pigment B'),
                      React.createElement("select", { id: "artstudio-watercolor-mix-b", value: secondPigment.id, onChange: function (e) { upd('watercolorMixB', e.target.value); }, className: "block mt-1 w-full rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs" },
                        WATERCOLOR_PIGMENTS.map(function (pigment) { return React.createElement("option", { key: pigment.id, value: pigment.id }, pigment.label); })
                      )
                    )
                  ),
                  React.createElement("label", { htmlFor: "artstudio-watercolor-mix-ratio", className: "block text-[11px] font-bold text-amber-950" },
                    'Mix ratio: ' + mixtureSummary,
                    React.createElement("input", { id: "artstudio-watercolor-mix-ratio", type: "range", min: 0, max: 100, step: 5, value: secondPercent, 'aria-label': 'Pigment B proportion', onChange: function (e) { upd('watercolorMixRatio', parseInt(e.target.value)); }, className: "block w-full accent-amber-700 mt-1" })
                  ),
                  React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                    React.createElement("button", { id: "artstudio-watercolor-load-mixture", type: "button", onClick: loadMixture, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-700 text-white hover:bg-amber-800" }, __alloT('stem.artstudio.load_mixed_pigment', 'Load mixed pigment')),
                    React.createElement("span", { role: "status", 'aria-live': "polite", className: "text-[11px] text-amber-950" },
                      'Profile: granulation ' + mixture.values.watercolorGranulation + '%, staining ' + mixture.values.watercolorStaining + '%, opacity ' + mixture.values.watercolorOpacity + '%, mobility ' + mixture.values.watercolorMobility + '%.'
                    )
                  )
                );
              })()),

              React.createElement("div", { className: "flex items-center gap-2 flex-wrap" },
                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.watercolor_brush', "Brush:")),
                [{ id: 'round', icon: '\uD83D\uDD8C', label: __alloT('stem.artstudio.round_brush', 'Round') }, { id: 'flat', icon: '\u25B0', label: __alloT('stem.artstudio.flat_brush', 'Flat') }, { id: 'mop', icon: '\u25CF', label: __alloT('stem.artstudio.mop_brush', 'Mop') }, { id: 'rigger', icon: '\u2571', label: __alloT('stem.artstudio.rigger_brush', 'Rigger') }, { id: 'wash', icon: '\uD83D\uDCA7', label: __alloT('stem.artstudio.wash_brush', 'Wash') }, { id: 'dry', icon: '\uD83C\uDF2C', label: __alloT('stem.artstudio.dry_brush', 'Dry') }, { id: 'water', icon: '\uD83D\uDCA6', label: __alloT('stem.artstudio.clear_water_brush', 'Clear water') }, { id: 'lift', icon: '\u2728', label: __alloT('stem.artstudio.lift_brush', 'Lift') }, { id: 'splatter', icon: '\u2726', label: __alloT('stem.artstudio.splatter_brush', 'Splatter') }, { id: 'salt', icon: '\u2744', label: __alloT('stem.artstudio.salt_texture_brush', 'Salt texture') }, { id: 'mask', icon: '\u25C7', label: __alloT('stem.artstudio.masking_fluid_brush', 'Masking fluid') }, { id: 'peel', icon: '\u25CC', label: __alloT('stem.artstudio.peel_mask_brush', 'Peel mask') }].map(function (brush) {
                  return React.createElement("button", { type: "button", key: brush.id, "aria-pressed": (d.watercolorBrush || 'round') === brush.id, onClick: function () { upd('watercolorBrush', brush.id); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.watercolorBrush || 'round') === brush.id ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-teal-50') }, brush.icon + ' ' + brush.label);
                }),
                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, __alloT('stem.artstudio.watercolor_surface', "Paper:")),
                [{ id: 'wet', label: __alloT('stem.artstudio.wet_on_wet', 'Wet-on-wet') }, { id: 'dry', label: __alloT('stem.artstudio.wet_on_dry', 'Wet-on-dry') }].map(function (surface) {
                  return React.createElement("button", { type: "button", key: surface.id, "aria-pressed": (d.watercolorSurface || 'wet') === surface.id, onClick: function () { upd('watercolorSurface', surface.id); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.watercolorSurface || 'wet') === surface.id ? 'bg-cyan-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-cyan-50') }, surface.label);
                }),
                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, __alloT('stem.artstudio.watercolor_flow', "Flow:")),
                [{ id: 'down', label: '↓ Down' }, { id: 'right', label: '→ Right' }, { id: 'left', label: '← Left' }, { id: 'up', label: '↑ Up' }, { id: 'none', label: __alloT('stem.artstudio.no_flow', 'Still') }].map(function (direction) {
                  return React.createElement("button", { type: "button", key: direction.id, "aria-pressed": (d.watercolorFlowDirection || 'down') === direction.id, onClick: function () { upd('watercolorFlowDirection', direction.id); }, className: "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.watercolorFlowDirection || 'down') === direction.id ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50') }, direction.label);
                })
              ),

              React.createElement("details", { id: "artstudio-watercolor-inspector", open: !!d.watercolorInspectorOpen, onToggle: function (event) { var nextOpen = !!event.currentTarget.open; if (nextOpen !== !!d.watercolorInspectorOpen) upd('watercolorInspectorOpen', nextOpen); }, className: "rounded-xl border border-cyan-300 bg-cyan-50/50" },
                React.createElement("summary", { className: "cursor-pointer select-none px-3 py-2 text-xs font-black text-cyan-950" }, 'Diagnostics and presets'),
                React.createElement("div", { className: "space-y-2 border-t border-cyan-200 p-3" },
              React.createElement("div", { id: "artstudio-watercolor-diagnostics", role: "group", 'aria-label': "Watercolor diagnostics", className: "flex items-center gap-2 flex-wrap rounded-xl border border-cyan-200 bg-cyan-50 p-2" },
                React.createElement("span", { className: "text-xs font-bold text-cyan-950" }, __alloT('stem.artstudio.watercolor_diagnostics', 'View diagnostics:')),
                React.createElement("button", { id: "artstudio-watercolor-wetness-map", type: "button", 'aria-pressed': !!d.watercolorShowWetness, onClick: function () { upd('watercolorShowWetness', !d.watercolorShowWetness); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.watercolorShowWetness ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-800 border border-cyan-200 hover:bg-cyan-100') }, __alloT('stem.artstudio.wetness_map', 'Wetness map')),
                React.createElement("button", { id: "artstudio-watercolor-flow-guides", type: "button", 'aria-pressed': !!d.watercolorShowFlow, onClick: function () { upd('watercolorShowFlow', !d.watercolorShowFlow); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + (d.watercolorShowFlow ? 'bg-cyan-700 text-white' : 'bg-white text-cyan-800 border border-cyan-200 hover:bg-cyan-100') }, __alloT('stem.artstudio.flow_guides', 'Flow guides')),
                React.createElement("span", { className: "text-[11px] text-cyan-900" }, __alloT('stem.artstudio.diagnostics_export_note', 'Screen-only overlays; autosaves and exports remain clean.'))
              ),

              React.createElement("div", { id: "artstudio-watercolor-paper-presets", role: "group", 'aria-label': "Watercolor paper presets", className: "flex items-center gap-2 flex-wrap bg-indigo-50 rounded-xl p-2 border border-indigo-200" },
                React.createElement("span", { className: "text-xs font-bold text-indigo-800" }, __alloT('stem.artstudio.paper_presets', "Paper preset:")),
                [{ id: 'hot', label: __alloT('stem.artstudio.hot_press', 'Hot press'), description: 'smooth, strongly sized, slower-absorbing surface', values: { watercolorPaper: 18, watercolorAbsorption: 38, watercolorBleed: 58, watercolorDrying: 46, watercolorSizing: 78, watercolorBloomSensitivity: 52 } }, { id: 'cold', label: __alloT('stem.artstudio.cold_press', 'Cold press'), description: 'balanced texture, sizing, and bloom response', values: { watercolorPaper: 48, watercolorAbsorption: 52, watercolorBleed: 62, watercolorDrying: 50, watercolorSizing: 58, watercolorBloomSensitivity: 64 } }, { id: 'rough', label: __alloT('stem.artstudio.rough_paper', 'Rough'), description: 'deep texture, lighter sizing, and faster fiber absorption', values: { watercolorPaper: 82, watercolorAbsorption: 72, watercolorBleed: 46, watercolorDrying: 66, watercolorSizing: 42, watercolorBloomSensitivity: 58 } }].map(function (preset) {
                  return React.createElement("button", { type: "button", key: preset.id, title: preset.description, 'aria-label': preset.label + ', ' + preset.description, onClick: function () { Object.keys(preset.values).forEach(function (key) { upd(key, preset.values[key]); }); if (typeof announceToSR === 'function') announceToSR(preset.label + ' paper preset applied: ' + preset.description + '.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100" }, preset.label);
                })
              ),

              React.createElement("div", { id: "artstudio-watercolor-climate-presets", role: "group", 'aria-label': "Studio climate presets", className: "flex items-center gap-2 flex-wrap bg-emerald-50 rounded-xl p-2 border border-emerald-200" },
                React.createElement("span", { className: "text-xs font-bold text-emerald-900" }, __alloT('stem.artstudio.climate_presets', 'Studio climate:')),
                [{ id: 'dry', label: __alloT('stem.artstudio.dry_studio', 'Dry studio'), description: '20% humidity and 55% airflow', values: { watercolorHumidity: 20, watercolorAirflow: 55, watercolorDrying: 65 } }, { id: 'balanced', label: __alloT('stem.artstudio.balanced_studio', 'Balanced'), description: '45% humidity and 25% airflow', values: { watercolorHumidity: 45, watercolorAirflow: 25, watercolorDrying: 50 } }, { id: 'humid', label: __alloT('stem.artstudio.humid_studio', 'Humid studio'), description: '78% humidity and 10% airflow', values: { watercolorHumidity: 78, watercolorAirflow: 10, watercolorDrying: 35 } }].map(function (preset) {
                  return React.createElement("button", { type: "button", key: preset.id, title: preset.description, 'aria-label': preset.label + ', ' + preset.description, onClick: function () { Object.keys(preset.values).forEach(function (key) { upd(key, preset.values[key]); }); if (typeof announceToSR === 'function') announceToSR(preset.label + ' climate applied: ' + preset.description + '.'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100" }, preset.label);
                })
              )
                )
              ),

              (function () {
                var basicControls = [
                  { key: 'watercolorSize', label: __alloT('stem.artstudio.brush_size', 'Brush size'), min: 8, max: 80, fallback: 28, unit: 'px' },
                  { key: 'watercolorWater', label: __alloT('stem.artstudio.water_amount', 'Water'), min: 0, max: 100, fallback: 72, unit: '%' },
                  { key: 'watercolorPigment', label: __alloT('stem.artstudio.pigment_amount', 'Pigment'), min: 0, max: 100, fallback: 68, unit: '%' },
                  { key: 'watercolorPaper', label: __alloT('stem.artstudio.paper_texture', 'Paper texture'), min: 0, max: 100, fallback: 48, unit: '%' },
                  { key: 'watercolorGranulation', label: __alloT('stem.artstudio.granulation', 'Granulation'), min: 0, max: 100, fallback: 54, unit: '%' }
                ];
                var advancedControls = [
                  { key: 'watercolorStaining', label: __alloT('stem.artstudio.staining_strength', 'Staining strength'), fallback: 50 },
                  { key: 'watercolorOpacity', label: __alloT('stem.artstudio.pigment_opacity', 'Pigment opacity'), fallback: 40 },
                  { key: 'watercolorMobility', label: __alloT('stem.artstudio.pigment_mobility', 'Pigment mobility'), fallback: 55 },
                  { key: 'watercolorSeparation', label: __alloT('stem.artstudio.chromatic_separation', 'Chromatic separation'), fallback: 70 },
                  { key: 'watercolorRewetting', label: __alloT('stem.artstudio.rewetting_sensitivity', 'Rewetting sensitivity'), fallback: 48 },
                  { key: 'watercolorBleed', label: __alloT('stem.artstudio.bleed', 'Bleed'), fallback: 62 },
                  { key: 'watercolorAbsorption', label: __alloT('stem.artstudio.absorption', 'Absorption'), fallback: 52 },
                  { key: 'watercolorSizing', label: __alloT('stem.artstudio.paper_sizing', 'Paper sizing'), fallback: 58 },
                  { key: 'watercolorBloomSensitivity', label: __alloT('stem.artstudio.bloom_sensitivity', 'Bloom sensitivity'), fallback: 60 },
                  { key: 'watercolorDrying', label: __alloT('stem.artstudio.drying_rate', 'Drying rate'), fallback: 50 },
                  { key: 'watercolorFlowStrength', label: __alloT('stem.artstudio.tilt_strength', 'Tilt strength'), fallback: 60 },
                  { key: 'watercolorHumidity', label: __alloT('stem.artstudio.studio_humidity', 'Studio humidity'), fallback: 45 },
                  { key: 'watercolorAirflow', label: __alloT('stem.artstudio.studio_airflow', 'Studio airflow'), fallback: 25 }
                ].map(function (control) { return Object.assign({ min: 0, max: 100, unit: '%' }, control); });
                var renderControl = function (control) {
                  var value = Number(d[control.key]);
                  if (!isFinite(value)) value = control.fallback;
                  return React.createElement("label", { key: control.key, className: "text-[11px] font-bold text-slate-600" },
                    control.label + ': ' + Math.round(value) + control.unit,
                    React.createElement("input", { type: "range", min: control.min, max: control.max, value: value, 'aria-label': control.label, onChange: function (e) { upd(control.key, parseInt(e.target.value)); }, className: "block w-full accent-teal-700 mt-1" })
                  );
                };
                return React.createElement("div", { className: "space-y-2" },
                  React.createElement("div", { role: "group", 'aria-label': "Core watercolor controls", className: "grid grid-cols-2 lg:grid-cols-5 gap-2 bg-slate-50 rounded-xl p-3 border border-slate-200" }, basicControls.map(renderControl)),
                  React.createElement("details", { id: "artstudio-watercolor-advanced-controls", open: !!d.watercolorAdvancedOpen, onToggle: function (event) { var nextOpen = !!event.currentTarget.open; if (nextOpen !== !!d.watercolorAdvancedOpen) upd('watercolorAdvancedOpen', nextOpen); }, className: "rounded-xl border border-slate-300 bg-white" },
                    React.createElement("summary", { className: "cursor-pointer select-none px-3 py-2 text-xs font-extrabold text-slate-700 hover:bg-slate-50 rounded-xl" }, __alloT('stem.artstudio.advanced_watercolor_controls', 'Advanced pigment, paper, flow, and climate controls')),
                    React.createElement("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-2 p-3 border-t border-slate-200" }, advancedControls.map(renderControl))
                  )
                );
              })(),

              React.createElement("details", { className: "rounded-xl border border-teal-300 bg-white" },
                React.createElement("summary", { className: "cursor-pointer select-none px-3 py-2 text-xs font-black text-teal-950" }, "Learn why watercolor behaves this way"),
                React.createElement("div", { className: "space-y-2 border-t border-teal-200 p-3" },
              React.createElement("p", { role: "note", className: "text-[11px] text-violet-900 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2" },
                React.createElement("strong", null, __alloT('stem.artstudio.separation_tip', 'Chromatic separation: ')),
                __alloT('stem.artstudio.separation_tip_desc', 'When pigments with different mobility meet on wet paper, higher settings let faster color channels travel ahead of heavier ones. Premixed pigments remain more uniform.')
              ),

              React.createElement("p", { role: "note", className: "text-[11px] text-sky-900 bg-sky-50 border border-sky-200 rounded-lg px-3 py-2" },
                React.createElement("strong", null, __alloT('stem.artstudio.rewetting_tip', 'Rewetting and glazing: ')),
                __alloT('stem.artstudio.rewetting_tip_desc', 'Clear water and wet glazes reactivate low-staining color more readily. Highly staining and strongly granulating layers stay anchored in the paper.')
              ),

              React.createElement("p", { role: "note", className: "text-[11px] text-indigo-950 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2" },
                React.createElement("strong", null, __alloT('stem.artstudio.paper_chemistry_tip', 'Paper chemistry: ')),
                __alloT('stem.artstudio.paper_chemistry_tip_desc', 'Higher sizing keeps water and pigment near the surface, extending flow and making dry color easier to lift. Lower sizing pulls washes into the fibers sooner. Bloom sensitivity controls how strongly wetness boundaries create backruns and cauliflower edges.')
              ),

              React.createElement("div", { className: "bg-teal-50 rounded-xl p-3 border border-teal-200" },
                React.createElement("p", { className: "text-[11px] text-teal-900 leading-relaxed" }, React.createElement("strong", null, __alloT('stem.artstudio.watercolor_science', "Why it looks wet: ")), __alloT('stem.artstudio.watercolor_science_desc', "Water diffuses pigment into nearby paper fibers. Every deposited wash carries its own granulation, staining, opacity, and mobility through mixtures. Each color channel retains mobility-weighted transport, so faster pigments can separate at wet edges while heavier colors lag and settle. Granulating particles collect in texture, staining colors resist lifting, and opaque particles scatter more light. Paper sizing controls how long water and pigment remain mobile on the surface before absorption; highly sized sheets lift and rewet more readily, while lightly sized sheets anchor washes sooner. Bloom sensitivity controls the strength of backruns at uneven wetness boundaries. Dry layers can be selectively remobilized by clear water or wet glazes; low-staining color releases more readily while staining and granulation anchor pigment in the fibers. Studio humidity slows evaporation and preserves blooms, while airflow accelerates surface drying. Round, flat, mop, rigger, wash, and dry brushes vary footprint, softness, water load, spacing, and reservoir drain. Slow, pressured strokes deposit more paint, stylus tilt spreads the footprint, and optical absorption deepens mixtures. Masking fluid, evaporation, gravity, clear water, salt, blooms, and tide marks remain physically layered. Wetness maps and flow guides visualize the simulation without changing saved artwork."))
              )
                )
              ),

            ),

            tab === 'pixel' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("div", { style: { width: 28, height: 28, borderRadius: 6, background: 'hsl(' + (d.hue || 0) + ',' + (d.sat || 100) + '%,' + (d.lit || 50) + '%)', border: '2px solid #fff', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' } }),

                React.createElement("span", { className: "text-[11px] font-bold text-slate-600" }, __alloT('stem.artstudio.current_color', "Current color")),

                React.createElement("div", { className: "ml-auto flex gap-1 flex-wrap" },

                  [{ id: 'brush', icon: '\uD83D\uDD8C', label: __alloT('stem.artstudio.brush', 'Brush') }, { id: 'eraser', icon: '\uD83E\uDDFD', label: __alloT('stem.artstudio.eraser', 'Eraser') }, { id: 'fill', icon: '\uD83E\uDEA3', label: __alloT('stem.artstudio.fill', 'Fill') }].map(function (t) {

                    return React.createElement("button", { "aria-label": t.label, "aria-pressed": (d.pixelTool || 'brush') === t.id, key: t.id, onClick: function () { upd('pixelTool', t.id); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.pixelTool || 'brush') === t.id ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, t.icon + ' ' + t.label);

                  }),

                  React.createElement("button", { onClick: function () { upd('pixelData', {}); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_2', "\uD83D\uDDD1 Clear")),

                  React.createElement("button", { onClick: function () { var c = document.querySelector('canvas[style*="pixelated"]'); if (!c) return; var link = document.createElement('a'); link.download = 'pixel-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, __alloT('stem.artstudio.export_png', "\uD83D\uDCE5 Export PNG")),

                  React.createElement("select", { 'aria-label': __alloT('stem.artstudio.grid_size', 'Grid size'), value: typeof d.pixelGrid === 'number' ? d.pixelGrid : 16, onChange: function (e) { upd('pixelGrid', parseInt(e.target.value)); upd('pixelData', {}); }, className: "px-2 py-1 text-xs border border-slate-400 rounded-lg" },

                    [8, 16, 24, 32].map(function (s) { return React.createElement("option", { key: s, value: s }, s + 'x' + s); }))

                )

              ),

              // Color Palette Presets

              React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-400" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, __alloT('stem.artstudio.palettes', "\uD83C\uDFA8 Palettes")),

                  [{ id: 'retro', label: __alloT('stem.artstudio.retro', '\uD83D\uDD79 Retro'), colors: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]] },

                   { id: 'nature', label: __alloT('stem.artstudio.nature', '\uD83C\uDF3F Nature'), colors: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]] },

                   { id: 'warm', label: __alloT('stem.artstudio.warm', '\uD83D\uDD25 Warm'), colors: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]] },

                   { id: 'cool', label: __alloT('stem.artstudio.cool', '\u2744 Cool'), colors: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]] },

                   { id: 'neon', label: __alloT('stem.artstudio.neon', '\uD83D\uDCA5 Neon'), colors: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, "aria-pressed": (d.activePalette || 'retro') === pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-pink-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { "aria-label": 'Choose color: hue ' + c[0] + ' degrees, saturation ' + c[1] + ' percent, lightness ' + c[2] + ' percent', "aria-pressed": d.hue === c[0] && d.sat === c[1] && d.lit === c[2], key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ec4899' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("p", { id: "artstudio-pixel-keyboard-help", className: "text-xs text-slate-600 text-center" },
                "Keyboard: focus the canvas, move the cell cursor with Arrow keys, jump with Home or End, and press Space or Enter to use the selected tool."
              ),
              React.createElement("canvas", { tabIndex: 0, ref: pixelRef, width: 512, height: 512, role: "img",
                'aria-label': 'Pixel art editor, ' + (typeof d.pixelGrid === 'number' ? d.pixelGrid : 16) + ' by ' + (typeof d.pixelGrid === 'number' ? d.pixelGrid : 16) + ' grid with ' + Object.keys(d.pixelData || {}).length + ' colored cells.',
                'aria-describedby': "artstudio-pixel-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Home End Enter Space",
                className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair mx-auto block focus-visible:ring-4 focus-visible:ring-blue-500 focus-visible:ring-offset-2",
                style: { maxWidth: '100%', imageRendering: 'pixelated' } })

            ),

            tab === 'symmetry' && React.createElement("div", { id: 'symmetryFullscreenWorkspace', className: "space-y-3", 'data-symmetry-fullscreen-workspace': 'true', role: 'region', 'aria-label': 'Symmetry Studio canvas and drawing controls' },

              React.createElement("style", null, '#symmetryFullscreenWorkspace:fullscreen,#symmetryFullscreenWorkspace:-webkit-full-screen{box-sizing:border-box;width:100vw;height:100vh;overflow:auto;padding:clamp(10px,2vw,20px);background:#020617}#symmetryFullscreenWorkspace:fullscreen #symmetryCanvasContainer,#symmetryFullscreenWorkspace:-webkit-full-screen #symmetryCanvasContainer{min-height:calc(100vh - 150px)}'),

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.folds', "\u2728 Folds:")),

                [4, 6, 8, 12, 16].map(function (f) {

                  return React.createElement("button", { "aria-label": f + ' symmetry folds', "aria-pressed": (d.symmetryFolds || 6) === f, key: f, onClick: function () { upd('symmetryFolds', f); }, className: "px-3 py-1 rounded-lg text-xs font-bold transition-all " + ((d.symmetryFolds || 6) === f ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, f);

                }),

                React.createElement("input", { type: "range", min: 2, max: 24, step: 1, value: Math.max(2, Math.min(24, parseInt(d.symmetryFolds, 10) || 6)), "aria-label": "Custom symmetry fold count", "aria-valuetext": (Math.max(2, Math.min(24, parseInt(d.symmetryFolds, 10) || 6))) + " folds", onChange: function (e) { upd('symmetryFolds', parseInt(e.target.value, 10)); }, className: "w-24 accent-violet-600" }),

                React.createElement("output", { className: "min-w-[24px] text-xs font-black text-violet-700" }, Math.max(2, Math.min(24, parseInt(d.symmetryFolds, 10) || 6))),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-3" }, "Brush:"),

                React.createElement("input", { type: "range", min: 1, max: 10, value: d.brushSize || 3, 'aria-label': __alloT('stem.artstudio.brush_size', 'Brush size'), onChange: function (e) { upd('brushSize', parseInt(e.target.value)); }, className: "w-20 accent-pink-600" }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Opacity:"),

                React.createElement("input", { type: "range", min: 10, max: 100, step: 5, value: Math.round((isFinite(Number(d.symBrushOpacity)) ? Math.max(0.1, Math.min(1, Number(d.symBrushOpacity))) : 1) * 100), "aria-label": "Symmetry brush opacity", "aria-valuetext": Math.round((isFinite(Number(d.symBrushOpacity)) ? Math.max(0.1, Math.min(1, Number(d.symBrushOpacity))) : 1) * 100) + " percent", onChange: function (e) { upd('symBrushOpacity', parseInt(e.target.value, 10) / 100); }, className: "w-20 accent-pink-600" }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Stroke:"),

                [{ id: 'dots', label: '\u2022 Dots', aria: 'Dot stamp stroke mode' }, { id: 'freehand', label: '\u223F Freehand', aria: 'Continuous freehand stroke mode' }, { id: 'line', label: '\u2571 Line', aria: 'Straight line stroke mode' }].map(function (stroke) {
                  return React.createElement("button", { key: stroke.id, "aria-label": stroke.aria, "aria-pressed": (d.symStrokeMode || 'freehand') === stroke.id, onClick: function () { upd('symStrokeMode', stroke.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.symStrokeMode || 'freehand') === stroke.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50') }, stroke.label);
                }),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Color:"),

                React.createElement("button", { "aria-pressed": (d.symBrushMode || 'rainbow') === 'solid', onClick: function () { upd('symBrushMode', 'solid'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.symBrushMode || 'rainbow') === 'solid' ? 'bg-pink-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, __alloT('stem.artstudio.solid', "\uD83D\uDD8C Solid")),

                React.createElement("button", { "aria-pressed": (d.symBrushMode || 'rainbow') === 'rainbow', onClick: function () { upd('symBrushMode', 'rainbow'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.symBrushMode || 'rainbow') === 'rainbow' ? 'bg-gradient-to-r from-red-600 via-yellow-700 to-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-pink-50') }, __alloT('stem.artstudio.rainbow', "\uD83C\uDF08 Rainbow")),

                React.createElement("span", { className: "text-xs font-bold text-slate-600 ml-2" }, "Pattern:"),

                [{ id: 'rotate', label: '\u27F3 Rotate', aria: 'Rotational symmetry pattern' }, { id: 'kaleidoscope', label: '\uD83E\uDE9E Kaleidoscope', aria: 'Kaleidoscope reflected symmetry pattern' }, { id: 'bilateral', label: '\u2194 Bilateral', aria: 'Bilateral mirror symmetry pattern' }].map(function (pattern) {
                  var activePattern = ['rotate', 'kaleidoscope', 'bilateral'].indexOf(d.symPatternMode) !== -1 ? d.symPatternMode : (d.symMirrorOnly ? 'kaleidoscope' : 'rotate');
                  return React.createElement("button", { key: pattern.id, "aria-label": pattern.aria, "aria-pressed": activePattern === pattern.id, onClick: function () {
                    if (activePattern === pattern.id) return;
                    updMany({ symPatternMode: pattern.id, symMirrorOnly: pattern.id === 'kaleidoscope', symmetryClear: Date.now() });
                  }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (activePattern === pattern.id ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-violet-50') }, pattern.label);
                }),

                React.createElement("button", { "aria-label": "Undo symmetry change", onClick: function () { var c = document.getElementById('symmetryCanvas'); if (c && c._symUndoAction) c._symUndoAction(); }, className: "ml-auto px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200" }, "\u21B6 Undo"),

                React.createElement("button", { "aria-label": "Redo symmetry change", onClick: function () { var c = document.getElementById('symmetryCanvas'); if (c && c._symRedoAction) c._symRedoAction(); }, className: "px-2 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200" }, "\u21B7 Redo"),

                React.createElement("button", { onClick: function () { var c = document.getElementById('symmetryCanvas'); if (c && c._symClearAction) c._symClearAction(); else upd('symmetryClear', Date.now()); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_3', "\uD83D\uDDD1 Clear")),

                React.createElement("button", { onClick: function () { var c = document.getElementById('symmetryCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'symmetry-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, __alloT('stem.artstudio.export_png_2', "\uD83D\uDCE5 Export PNG")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.fullscreen', "Toggle fullscreen Symmetry Studio workspace"), onClick: function () { toggleFullscreen('symmetryFullscreenWorkspace'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all" }, __alloT('stem.artstudio.fullscreen_2', "\u26F6 Fullscreen"))

              ),

              React.createElement("div", { id: 'symmetryCanvasContainer', className: "bg-slate-900 rounded-xl p-2 relative flex flex-col items-center justify-center w-full" },

                React.createElement("div", { className: "bg-slate-800/80 rounded-xl p-2 border border-slate-700 w-full mb-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, __alloT('stem.artstudio.palettes_2', "\uD83C\uDFA8 Palettes")),

                  [{ id: 'retro', label: __alloT('stem.artstudio.retro_2', '\uD83D\uDD79 Retro') }, { id: 'nature', label: __alloT('stem.artstudio.nature_2', '\uD83C\uDF3F Nature') }, { id: 'warm', label: __alloT('stem.artstudio.warm_2', '\uD83D\uDD25 Warm') }, { id: 'cool', label: __alloT('stem.artstudio.cool_2', '\u2744 Cool') }, { id: 'neon', label: __alloT('stem.artstudio.neon_2', '\uD83D\uDCA5 Neon') }].map(function (pal) {

                    return React.createElement("button", { key: pal.id, "aria-pressed": (d.activePalette || 'retro') === pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-pink-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-pink-50') }, pal.label);

                  })

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { "aria-label": 'Choose color: hue ' + c[0] + ' degrees, saturation ' + c[1] + ' percent, lightness ' + c[2] + ' percent', "aria-pressed": d.hue === c[0] && d.sat === c[1] && d.lit === c[2], key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#ec4899' : 'rgba(255,255,255,0.6)', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("p", { id: "artstudio-symmetry-keyboard-help", className: "mb-1 text-xs text-slate-200 text-center" },
                "Pointer: drag for dots or freehand; in Line mode, drag from start to end. Keyboard: Arrow keys move the cursor; hold Shift with an Arrow key to draw a line; Space or Enter stamps marks; Home returns to center; Alt makes one-pixel moves; Ctrl or Command+Z undoes and Shift+Ctrl or Command+Z redoes."
              ),
              React.createElement("canvas", { tabIndex: 0, id: 'symmetryCanvas', ref: symmetryRef, width: 512, height: 512, role: "img",
                'aria-label': 'Symmetry drawing canvas in ' + ((d.symPatternMode || (d.symMirrorOnly ? 'kaleidoscope' : 'rotate')) === 'bilateral' ? 'bilateral mirror' : (d.symPatternMode || (d.symMirrorOnly ? 'kaleidoscope' : 'rotate')) === 'kaleidoscope' ? 'kaleidoscope' : 'rotational') + ' mode, using ' + ((d.symStrokeMode || 'freehand') === 'dots' ? 'dot stamps' : (d.symStrokeMode || 'freehand') === 'line' ? 'straight lines' : 'continuous freehand') + '.',
                'aria-describedby': "artstudio-symmetry-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space Control+Z Meta+Z Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y",
                key: 'sym-' + (d.symmetryFolds || 6) + '-' + (d.symmetryClear || 0) + '-' + (d.symPatternMode || (d.symMirrorOnly ? 'kaleidoscope' : 'rotate')),
                className: "rounded-xl border-2 border-pink-200 shadow-lg cursor-crosshair mx-auto block mt-3 flex-shrink-0 focus-visible:ring-4 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900",
                style: { maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', background: 'var(--allo-stem-canvas, #0f172a)' } }),
              React.createElement("span", {
                "data-symmetry-keyboard-cursor": "true",
                "aria-hidden": "true",
                className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#0f172a]",
                style: { display: 'none' }
              })

              ), // end symmetryCanvasContainer

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-violet-50 to-pink-50 rounded-xl p-4 border border-violet-200" },

                React.createElement("button", { onClick: function () { upd('showSymInfo', !d.showSymInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-violet-700" },

                  React.createElement("span", null, __alloT('stem.artstudio.learn_about_symmetry', "\uD83D\uDD2E Learn About Symmetry")),

                  React.createElement("span", null, d.showSymInfo ? '\u25B2' : '\u25BC')

                ),

                d.showSymInfo && React.createElement("div", { className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                  React.createElement("p", null, "\uD83C\uDF3B ", React.createElement("strong", null, __alloT('stem.artstudio.radial_symmetry', "Radial symmetry")), __alloT('stem.artstudio.repeats_a_pattern_around_a_central_poi', " repeats a pattern around a central point. In "), React.createElement("strong", null, "nature"), __alloT('stem.artstudio.starfish_5_fold_snowflakes_6_fold_and_', ", starfish (5-fold), snowflakes (6-fold), and flowers show this everywhere.")),

                  React.createElement("p", null, "\uD83D\uDD73 ", React.createElement("strong", null, "4-fold:"), __alloT('stem.artstudio.tile_patterns_quilts_floor_mosaics', " Tile patterns, quilts, floor mosaics. "), React.createElement("strong", null, "6-fold:"), __alloT('stem.artstudio.snowflakes_honeycombs_islamic_star_pat', " Snowflakes, honeycombs, Islamic star patterns. "), React.createElement("strong", null, "8-fold:"), __alloT('stem.artstudio.mandala_art_rose_windows_in_cathedrals', " Mandala art, rose windows in cathedrals.")),

                  React.createElement("p", null, "\uD83C\uDFDB ", React.createElement("strong", null, __alloT('stem.artstudio.cultural_connections', "Cultural connections:")), __alloT('stem.artstudio.islamic_geometric_art_uses_radial_symm', " Islamic geometric art uses radial symmetry extensively. Celtic knots, Navajo textiles, and Japanese family crests (\u201Cmon\u201D) all rely on rotational symmetry.")),

                  React.createElement("p", null, "\uD83E\uDE9E ", React.createElement("strong", null, __alloT('stem.artstudio.mirror_mode', "Mirror mode")), __alloT('stem.artstudio.uses_bilateral_reflection_symmetry_the', " uses bilateral (reflection) symmetry \u2014 the kind found in faces, butterflies, and leaves. It\u2019s the most common symmetry in the animal kingdom.")),

                  React.createElement("p", null, "\uD83C\uDF08 ", React.createElement("strong", null, __alloT('stem.artstudio.rainbow_brush', "Rainbow brush")), __alloT('stem.artstudio.cycles_through_the_color_spectrum_as_y', " cycles through the color spectrum as you draw, creating gradient-like mandala effects automatically."))

                )

              )

            ),

            tab === 'contrast' && React.createElement("div", { className: "space-y-4" },

              React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4" },

                [

                  { prefix: 'fg', title: __alloT('stem.artstudio.foreground_text', "Foreground (Text)"), h: fgH, s: fgS, l: fgL },

                  { prefix: 'bg', title: __alloT('stem.artstudio.background', "Background"), h: bgH, s: bgS, l: bgL }

                ].map(function (group) {

                  var headingId = 'artstudio-contrast-' + group.prefix + '-heading';

                  var colorText = 'HSL ' + group.h + ' degrees, ' + group.s + ' percent saturation, ' + group.l + ' percent lightness';

                  return React.createElement("section", { key: group.prefix, role: "group", "aria-labelledby": headingId, className: "bg-white rounded-xl p-4 border border-slate-400" },

                    React.createElement("h4", { id: headingId, className: "text-xs font-bold text-slate-700 mb-3" }, group.title),

                    React.createElement("div", { role: "img", "aria-label": group.title + ' color preview: ' + colorText + '.', style: { width: '100%', height: 50, borderRadius: 8, background: 'hsl(' + group.h + ',' + group.s + '%,' + group.l + '%)', marginBottom: 8, border: '1px solid #64748b' } }),

                    [

                      { suffix: 'H', label: __alloT('stem.artstudio.hue', 'Hue'), max: 360, val: group.h, valueText: group.h + ' degrees' },

                      { suffix: 'S', label: __alloT('stem.artstudio.saturation', 'Saturation'), max: 100, val: group.s, valueText: group.s + ' percent' },

                      { suffix: 'L', label: __alloT('stem.artstudio.lightness', 'Lightness'), max: 100, val: group.l, valueText: group.l + ' percent' }

                    ].map(function (control) {

                      var stateKey = group.prefix + control.suffix;

                      var inputId = 'artstudio-contrast-' + stateKey;

                      return React.createElement("div", { key: stateKey, className: "mb-2" },

                        React.createElement("label", { htmlFor: inputId, className: "text-[11px] text-slate-700 font-bold block" }, control.label + ': ' + control.val),

                        React.createElement("input", { id: inputId, type: "range", min: 0, max: control.max, value: control.val, "aria-valuetext": control.valueText, onChange: function (e) { upd(stateKey, parseInt(e.target.value)); }, className: "w-full accent-slate-700" })

                      );

                    })

                  );

                })

              ),

              React.createElement("section", { role: "status", "aria-live": "polite", "aria-atomic": "true", "aria-labelledby": "artstudio-contrast-result-heading", className: "rounded-xl border-2 p-4 sm:p-6 text-center " + (passAA ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') },

                React.createElement("h4", { id: "artstudio-contrast-result-heading", className: "text-sm font-bold text-slate-800 mb-3" }, __alloT('stem.artstudio.contrast_result', "WCAG 2.2 contrast result")),

                React.createElement("div", { role: "group", "aria-label": "Text contrast preview", className: "mb-3", style: { padding: 20, borderRadius: 12, background: 'hsl(' + bgH + ',' + bgS + '%,' + bgL + '%)', border: '1px solid #64748b' } },

                  React.createElement("p", { style: { color: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', fontSize: 24, fontWeight: 'bold' } }, __alloT('stem.artstudio.sample_text', "Sample Text")),

                  React.createElement("p", { style: { color: 'hsl(' + fgH + ',' + fgS + '%,' + fgL + '%)', fontSize: 14 } }, __alloT('stem.artstudio.the_quick_brown_fox_jumps_over_the_laz', "The quick brown fox jumps over the lazy dog"))

                ),

                React.createElement("p", { className: "text-3xl font-bold " + (passAA ? 'text-green-800' : 'text-red-800') }, contrastRatio.toFixed(2) + ':1'),

                React.createElement("p", { className: "text-xs text-slate-700 mt-2" }, __alloT('stem.artstudio.wcag_22_contrast_guidance', "WCAG 2.2 AA requires 4.5:1 for normal text and 3:1 for large text. AAA requires 7:1 for normal text.")),

                React.createElement("div", { className: "flex flex-wrap justify-center gap-2 sm:gap-3 mt-3" },

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAALarge ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900') }, (passAALarge ? '\u2705 Pass' : '\u274C Fail') + ' AA Large'),

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAA ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900') }, (passAA ? '\u2705 Pass' : '\u274C Fail') + ' AA Normal'),

                  React.createElement("span", { className: "px-3 py-1 rounded-full text-xs font-bold " + (passAAA ? 'bg-green-200 text-green-900' : 'bg-red-200 text-red-900') }, (passAAA ? '\u2705 Pass' : '\u274C Fail') + ' AAA Normal')

                )

              )

            ),

            // === Sculpt 3D — the full sculpting suite on the shared Prim3D seams ===
            // Same recipe format + PURE edit ops (prim3d_module.js) that power
            // Free Forms, Memory Palace, and Geometry Sandbox: presets, hand-built
            // part editing, optional AI describe/refine, a persistent gallery, and
            // PNG export. Preview follows this tool's hook-free convention: a
            // callback ref owns the WebGL lifecycle, caching on the canvas element
            // and self-terminating (with disposal) once the canvas leaves the DOM.
            tab === 'sculpt3d' && (function() {
              var P3D = window.AlloModules && window.AlloModules.Prim3D;
              var THREE_OK = !!window.THREE;
              function _loadScript(src, onDone) {
                var s = document.createElement('script'); s.src = src; s.async = true;
                s.onload = function() { onDone(true); }; s.onerror = function() { onDone(false); };
                document.head.appendChild(s);
              }
              if (!THREE_OK && !window._artSculptThreeLoading) {
                window._artSculptThreeLoading = true;
                window.StemLab.ensureThree({ orbit: false }).then(function () {
                  upd('_sculptPing', Date.now());
                }).catch(function () {
                  window._artSculptThreeLoading = false;   // failed load must not latch "loading" forever — revisiting the tab retries
                  upd('_sculptPing', Date.now());
                });
              }
              if (!P3D && !window._artSculptP3dLoading) {
                window._artSculptP3dLoading = true;
                var base = 'https://alloflow-cdn.pages.dev/', q = '';
                try {
                  var scr = document.querySelectorAll('script[src]');
                  for (var si = 0; si < scr.length; si++) {
                    var src = scr[si].getAttribute('src') || '';
                    var m = src.match(/^(.*\/)(?:stem_lab\/stem_tool_artstudio|stem_lab\/stem_tool_geosandbox|memory_palace_module|concept_graph_3d_module|prim3d_module)\.js(\?.*)?$/);
                    if (m) { base = m[1]; q = m[2] || ''; break; }
                  }
                } catch (e) {}
                _loadScript(base + 'prim3d_module.js' + q, function(ok) {
                  if (!ok) window._artSculptP3dLoading = false;
                  upd('_sculptPing', Date.now());
                });
              }
              if (!P3D || !window.THREE) {
                return React.createElement("div", { className: "p-8 text-center text-slate-500 text-sm", role: "status" }, '🗿 ' + __alloT('stem.artstudio.sculpt_loading', 'Loading the sculpting engine…'));
              }
              var recipe = d.sculptRecipe ? P3D.normalizeRecipe(d.sculptRecipe) : null;
              var parts = (recipe && recipe.parts) || [];
              var sel = Math.min(d.sculptSel || 0, Math.max(0, parts.length - 1));
              var gallery = d.sculptGallery || {};
              var sculptAuto = d.sculptAuto === undefined ? !reducedMotion : !!d.sculptAuto;
              var sculptMode = ['move', 'rotate', 'scale'].indexOf(d.sculptInteractMode) !== -1 ? d.sculptInteractMode : 'orbit';
              var sculptMirrorAxis = ['x', 'y', 'z'].indexOf(d.sculptMirrorAxis) !== -1 ? d.sculptMirrorAxis : 'x';
              var requestedSculptSnap = Number(d.sculptSnap);
              var sculptSnap = [0.1, 0.25, 0.5].indexOf(requestedSculptSnap) !== -1 ? requestedSculptSnap : 0;
              var sculptUndo = Array.isArray(d.sculptUndo) ? d.sculptUndo : [];
              var sculptRedo = Array.isArray(d.sculptRedo) ? d.sculptRedo : [];
              var sculptSummary = recipe ? ((recipe.name || 'Custom sculpture') + ' with ' + parts.length + (parts.length === 1 ? ' part' : ' parts')) : 'Empty sculpture scene';
              var rawSelectedPart = parts[sel] || null;
              var selectedPart = rawSelectedPart ? Object.assign({}, rawSelectedPart, {
                size: Array.isArray(rawSelectedPart.size) ? rawSelectedPart.size : [0.4, 0.4, 0.4],
                position: Array.isArray(rawSelectedPart.position) ? rawSelectedPart.position : [0, 0.5, 0],
                rotation: Array.isArray(rawSelectedPart.rotation) ? rawSelectedPart.rotation : [0, 0, 0],
                color: typeof rawSelectedPart.color === 'string' ? rawSelectedPart.color : '#818cf8'
              }) : null;
              function snapSculptValue(value, bypass, snapOverride) {
                var increment = typeof snapOverride === 'number' ? snapOverride : sculptSnap;
                if (bypass || !increment) return Math.round(value * 1000) / 1000;
                return Math.round((Math.round(value / increment) * increment) * 1000) / 1000;
              }
              var setRecipe = function(r) {
                var next = r ? P3D.normalizeRecipe(r) : null;
                if (JSON.stringify(next) === JSON.stringify(recipe)) return;
                updMany({
                  sculptRecipe: next,
                  sculptUndo: sculptUndo.concat([recipe]).slice(-20),
                  sculptRedo: []
                });
              };
              var partOp = function(op) { var next = op(P3D, recipe); if (next !== recipe) setRecipe(next); };
              var undoSculpt = function() {
                if (!sculptUndo.length) return;
                var previous = sculptUndo[sculptUndo.length - 1] || null;
                updMany({ sculptRecipe: previous, sculptUndo: sculptUndo.slice(0, -1), sculptRedo: sculptRedo.concat([recipe]).slice(-20), sculptSel: 0 });
                if (typeof announceToSR === 'function') announceToSR('Undid the last sculpture change.');
              };
              var redoSculpt = function() {
                if (!sculptRedo.length) return;
                var next = sculptRedo[sculptRedo.length - 1] || null;
                updMany({ sculptRecipe: next, sculptUndo: sculptUndo.concat([recipe]).slice(-20), sculptRedo: sculptRedo.slice(0, -1), sculptSel: 0 });
                if (typeof announceToSR === 'function') announceToSR('Redid the sculpture change.');
              };
              var _cnvBox = { current: null };
              // ── preview lifecycle (callback ref; state cached ON the canvas) ──
              var sculptRef = function(cnv) {
                if (!cnv) return;
                _cnvBox.current = cnv;
                var THREE = window.THREE;
                cnv.dataset.auto = sculptAuto ? '1' : '0';
                cnv.dataset.summary = sculptSummary;
                cnv.dataset.snap = sculptSnap ? String(sculptSnap) : 'off';
                if (cnv._p3d && !cnv._p3d.drag) cnv._p3d.auto = sculptAuto;
                if (cnv._p3d && cnv._p3d.updateA11y) cnv._p3d.updateA11y();
                else cnv.setAttribute('aria-label', '3D sculpture preview. ' + sculptSummary + '. Auto-rotation ' + (sculptAuto ? 'running' : 'paused') + '. Position snapping ' + (sculptSnap ? sculptSnap + ' units' : 'off') + '.');
                if (!cnv._p3d) {
                  var scene3 = new THREE.Scene(); scene3.background = new THREE.Color('#0f172a');
                  var cam = new THREE.PerspectiveCamera(45, cnv.width / cnv.height, 0.1, 100);
                  var ren = new THREE.WebGLRenderer({ canvas: cnv, antialias: true });
                  ren.setSize(cnv.width, cnv.height, false);
                  scene3.add(new THREE.AmbientLight(0xffffff, 0.6));
                  var d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(2, 3, 2); scene3.add(d1);
                  var grid = new THREE.GridHelper(3, 12, 0x475569, 0x1e293b); scene3.add(grid);
                  cnv._p3d = { scene: scene3, cam: cam, ren: ren, obj: null, json: '', yaw: 0.7, pitch: 0.5, auto: sculptAuto };
                  function updateSculptViewLabel() {
                    var state = cnv._p3d;
                    if (!state) return;
                    var yawDegrees = Math.round((((state.yaw * 180 / Math.PI) % 360) + 360) % 360);
                    var pitchDegrees = Math.round(state.pitch * 180 / Math.PI);
                    cnv.setAttribute('aria-label', '3D sculpture preview. ' + cnv.dataset.summary + '. View angle ' +
                      yawDegrees + ' degrees, elevation ' + pitchDegrees + ' degrees. Auto-rotation ' + (state.auto ? 'running' : 'paused') +
                      '. Position snapping ' + (cnv.dataset.snap === 'off' ? 'off' : cnv.dataset.snap + ' units') + '.');
                  }
                  cnv._p3d.updateA11y = updateSculptViewLabel;
                  function announceSculptView(message) {
                    updateSculptViewLabel();
                    var state = cnv._p3d;
                    if (!state || typeof announceToSR !== 'function') return;
                    announceToSR(message + ' View angle ' + Math.round((((state.yaw * 180 / Math.PI) % 360) + 360) % 360) +
                      ' degrees, elevation ' + Math.round(state.pitch * 180 / Math.PI) + ' degrees.');
                  }
                  function findPartMesh(root, partIndex) {
                    var found = null;
                    if (root && root.traverse) root.traverse(function(item) {
                      if (!found && item.userData && item.userData.prim3dPartIndex === partIndex) found = item;
                    });
                    return found;
                  }
                  function pickSculptPart(ev, st) {
                    if (!st.obj || !THREE.Raycaster || !THREE.Vector2) return st.selectedIndex;
                    try {
                      var rect = cnv.getBoundingClientRect();
                      var pointer = new THREE.Vector2(
                        ((ev.clientX - rect.left) / (rect.width || cnv.clientWidth || cnv.width)) * 2 - 1,
                        -((ev.clientY - rect.top) / (rect.height || cnv.clientHeight || cnv.height)) * 2 + 1
                      );
                      var raycaster = new THREE.Raycaster();
                      raycaster.setFromCamera(pointer, st.cam);
                      var hits = raycaster.intersectObject(st.obj, true) || [];
                      for (var hitIndex = 0; hitIndex < hits.length; hitIndex++) {
                        var hit = hits[hitIndex].object;
                        if (hit && hit.userData && typeof hit.userData.prim3dPartIndex === 'number') return hit.userData.prim3dPartIndex;
                      }
                    } catch (e) {}
                    return st.selectedIndex;
                  }
                  function endSculptDrag(cancelled) {
                    var st = cnv._p3d;
                    if (!st || !st.drag) return;
                    var drag = st.drag;
                    if (drag.kind !== 'orbit') {
                      if (cancelled && drag.mesh) {
                        if (drag.kind === 'move' && drag.mesh.position && drag.mesh.position.set) {
                          drag.mesh.position.set(drag.start[0], drag.start[1], drag.start[2]);
                        } else if (drag.kind === 'rotate' && drag.mesh.rotation && drag.mesh.rotation.set) {
                          drag.mesh.rotation.set(drag.start[0] * Math.PI / 180, drag.start[1] * Math.PI / 180, drag.start[2] * Math.PI / 180);
                        } else if (drag.kind === 'scale' && drag.mesh.scale && drag.mesh.scale.set) {
                          drag.mesh.scale.set(1, 1, 1);
                        }
                      } else if (drag.moved && st.recipe && P3D.updatePart && st.commitRecipe) {
                        var transformPatch = {};
                        transformPatch[drag.kind === 'move' ? 'position' : drag.kind === 'rotate' ? 'rotation' : 'size'] = drag.current.slice();
                        var next = P3D.updatePart(st.recipe, drag.index, transformPatch);
                        st.recipe = next;
                        st.commitRecipe(next);
                        if (typeof announceToSR === 'function') announceToSR((drag.kind === 'move' ? 'Moved' : drag.kind === 'rotate' ? 'Rotated' : 'Scaled') + ' part ' + (drag.index + 1) + '.');
                      }
                    }
                    st.drag = null;
                    st.auto = !!drag.resumeAuto;
                    updateSculptViewLabel();
                  }
                  // Orbit the view, or directly move, rotate, or scale a selected part.
                  cnv.style.touchAction = 'none';
                  cnv.addEventListener('pointerdown', function(ev) {
                    var st = cnv._p3d; if (!st) return;
                    var resumeAuto = cnv.dataset.auto === '1';
                    if (st.interactionMode !== 'orbit' && st.recipe && st.recipe.parts && st.recipe.parts.length) {
                      var index = pickSculptPart(ev, st);
                      index = Math.max(0, Math.min(st.recipe.parts.length - 1, typeof index === 'number' ? index : 0));
                      var transformKind = st.interactionMode;
                      var startField = transformKind === 'move' ? 'position' : transformKind === 'rotate' ? 'rotation' : 'size';
                      var start = st.recipe.parts[index][startField].slice();
                      st.drag = { kind: transformKind, x: ev.clientX, y: ev.clientY, index: index, start: start, raw: start.slice(), current: start.slice(), moved: false, mesh: findPartMesh(st.obj, index), resumeAuto: resumeAuto };
                      st.selectedIndex = index;
                      if (st.selectPart) st.selectPart(index);
                      if (typeof announceToSR === 'function') announceToSR('Selected part ' + (index + 1) + '. Drag to ' + transformKind + ' it.');
                    } else {
                      st.drag = { kind: 'orbit', x: ev.clientX, y: ev.clientY, resumeAuto: resumeAuto };
                    }
                    st.auto = false;
                    updateSculptViewLabel();
                    try { cnv.setPointerCapture(ev.pointerId); } catch (e) {}
                  });
                  cnv.addEventListener('pointermove', function(ev) {
                    var st = cnv._p3d; if (!st || !st.drag) return;
                    var dx = ev.clientX - st.drag.x, dy = ev.clientY - st.drag.y;
                    if (st.drag.kind === 'move') {
                      st.drag.raw[0] = Math.max(-4, Math.min(4, st.drag.raw[0] + dx * 0.006));
                      st.drag.raw[1] = Math.max(-4, Math.min(8, st.drag.raw[1] - dy * 0.006));
                      st.drag.current[0] = snapSculptValue(st.drag.raw[0], ev.altKey, st.snap);
                      st.drag.current[1] = snapSculptValue(st.drag.raw[1], ev.altKey, st.snap);
                      if (st.drag.mesh && st.drag.mesh.position && st.drag.mesh.position.set) st.drag.mesh.position.set(st.drag.current[0], st.drag.current[1], st.drag.current[2]);
                    } else if (st.drag.kind === 'rotate') {
                      st.drag.raw[0] = Math.max(-360, Math.min(360, st.drag.raw[0] - dy * 0.5));
                      st.drag.raw[1] = Math.max(-360, Math.min(360, st.drag.raw[1] + dx * 0.5));
                      for (var rotationAxis = 0; rotationAxis < 3; rotationAxis++) st.drag.current[rotationAxis] = Math.round(st.drag.raw[rotationAxis] * 10) / 10;
                      if (st.drag.mesh && st.drag.mesh.rotation && st.drag.mesh.rotation.set) {
                        st.drag.mesh.rotation.set(st.drag.current[0] * Math.PI / 180, st.drag.current[1] * Math.PI / 180, st.drag.current[2] * Math.PI / 180);
                      }
                    } else if (st.drag.kind === 'scale') {
                      var scaleFactor = Math.exp((dx - dy) * 0.008);
                      for (var sizeAxis = 0; sizeAxis < st.drag.raw.length; sizeAxis++) {
                        st.drag.raw[sizeAxis] = Math.max(0.02, Math.min(4, st.drag.raw[sizeAxis] * scaleFactor));
                        st.drag.current[sizeAxis] = Math.round(st.drag.raw[sizeAxis] * 1000) / 1000;
                      }
                      if (st.drag.mesh && st.drag.mesh.scale && st.drag.mesh.scale.set) {
                        var previewScale = st.drag.current[0] / st.drag.start[0];
                        st.drag.mesh.scale.set(previewScale, previewScale, previewScale);
                      }
                    } else {
                      st.yaw += dx * 0.01;
                      st.pitch = Math.max(0.05, Math.min(1.45, st.pitch + dy * 0.008));
                    }
                    if (st.drag.kind !== 'orbit') st.drag.moved = st.drag.moved || Math.abs(dx) + Math.abs(dy) > 0;
                    st.drag.x = ev.clientX; st.drag.y = ev.clientY;
                    updateSculptViewLabel();
                  });
                  cnv.addEventListener('pointerup', function() { endSculptDrag(false); });
                  cnv.addEventListener('pointercancel', function() { endSculptDrag(true); });
                  cnv.onkeydown = function(event) {
                    var st = cnv._p3d;
                    if (!st) return;
                    if (st.interactionMode === 'move' && st.recipe && P3D.updatePart &&
                        (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown')) {
                      event.preventDefault();
                      var activeSnap = event.altKey ? 0 : (Number(st.snap) || 0);
                      var moveStep = event.altKey ? 0.02 : (activeSnap || 0.1);
                      var moveAxis = event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 0 : event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 1 : 2;
                      var moveDirection = event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown' ? -1 : 1;
                      var movedPosition = st.recipe.parts[st.selectedIndex].position.slice();
                      movedPosition[moveAxis] = snapSculptValue(movedPosition[moveAxis] + moveDirection * moveStep, event.altKey, activeSnap);
                      var movedRecipe = P3D.updatePart(st.recipe, st.selectedIndex, { position: movedPosition });
                      st.recipe = movedRecipe;
                      if (st.commitRecipe) st.commitRecipe(movedRecipe);
                      if (typeof announceToSR === 'function') announceToSR('Moved part ' + (st.selectedIndex + 1) + ' ' + (event.key === 'PageUp' ? 'closer' : event.key === 'PageDown' ? 'farther' : event.key.replace('Arrow', '').toLowerCase()) + '.');
                    } else if (st.interactionMode === 'rotate' && st.recipe && P3D.updatePart &&
                        (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown')) {
                      event.preventDefault();
                      var rotationStep = event.altKey ? 1 : 15;
                      var rotationAxis = event.key === 'ArrowUp' || event.key === 'ArrowDown' ? 0 : event.key === 'ArrowLeft' || event.key === 'ArrowRight' ? 1 : 2;
                      var rotationDirection = event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown' ? -1 : 1;
                      var rotatedValues = st.recipe.parts[st.selectedIndex].rotation.slice();
                      rotatedValues[rotationAxis] = Math.max(-360, Math.min(360, rotatedValues[rotationAxis] + rotationDirection * rotationStep));
                      var rotatedRecipe = P3D.updatePart(st.recipe, st.selectedIndex, { rotation: rotatedValues });
                      st.recipe = rotatedRecipe;
                      if (st.commitRecipe) st.commitRecipe(rotatedRecipe);
                      if (typeof announceToSR === 'function') announceToSR('Rotated part ' + (st.selectedIndex + 1) + ' by ' + rotationDirection * rotationStep + ' degrees.');
                    } else if (st.interactionMode === 'scale' && st.recipe && P3D.updatePart &&
                        (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'PageUp' || event.key === 'PageDown')) {
                      event.preventDefault();
                      var growPart = event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp';
                      var keyboardScaleFactor = event.altKey ? 1.02 : 1.1;
                      if (!growPart) keyboardScaleFactor = 1 / keyboardScaleFactor;
                      var scaledValues = st.recipe.parts[st.selectedIndex].size.map(function(value) {
                        return Math.max(0.02, Math.min(4, Math.round(value * keyboardScaleFactor * 1000) / 1000));
                      });
                      var scaledRecipe = P3D.updatePart(st.recipe, st.selectedIndex, { size: scaledValues });
                      st.recipe = scaledRecipe;
                      if (st.commitRecipe) st.commitRecipe(scaledRecipe);
                      if (typeof announceToSR === 'function') announceToSR('Scaled part ' + (st.selectedIndex + 1) + ' ' + (growPart ? 'larger.' : 'smaller.'));
                    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'ArrowDown') {
                      event.preventDefault();
                      var step = event.altKey ? 0.02 : 0.12;
                      if (event.key === 'ArrowLeft') st.yaw -= step;
                      if (event.key === 'ArrowRight') st.yaw += step;
                      if (event.key === 'ArrowUp') st.pitch = Math.min(1.45, st.pitch + step);
                      if (event.key === 'ArrowDown') st.pitch = Math.max(0.05, st.pitch - step);
                      st.auto = false; cnv.dataset.auto = '0'; upd('sculptAuto', false);
                      announceSculptView('Sculpture view moved; auto-rotation paused.');
                    } else if (event.key === 'Home') {
                      event.preventDefault();
                      st.yaw = 0.7; st.pitch = 0.5; st.auto = false; cnv.dataset.auto = '0'; upd('sculptAuto', false);
                      announceSculptView('Sculpture view reset; auto-rotation paused.');
                    } else if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      st.auto = !st.auto; cnv.dataset.auto = st.auto ? '1' : '0'; upd('sculptAuto', st.auto);
                      announceSculptView(st.auto ? 'Sculpture auto-rotation resumed.' : 'Sculpture auto-rotation paused.');
                    }
                  };
                  updateSculptViewLabel();
                  var loop = function() {
                    var st = cnv._p3d;
                    if (!st) return;
                    if (!cnv.isConnected) {   // tab switched away — full teardown, no zombie loop
                      try {
                        st.scene.traverse(function(o) {
                          if (o.geometry && o.geometry.dispose) o.geometry.dispose();
                          var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
                          mats.forEach(function(mx) { try { if (mx.map && mx.map.dispose) mx.map.dispose(); mx.dispose(); } catch (e) {} });
                        });
                        st.ren.dispose(); if (st.ren.forceContextLoss) st.ren.forceContextLoss();
                      } catch (e) {}
                      cnv._p3d = null;
                      return;
                    }
                    if (st.auto) st.yaw += 0.006;
                    var R = 2.6;
                    st.cam.position.set(Math.sin(st.yaw) * Math.cos(st.pitch) * R, 0.5 + Math.sin(st.pitch) * R * 0.8, Math.cos(st.yaw) * Math.cos(st.pitch) * R);
                    st.cam.lookAt(0, 0.5, 0);
                    st.ren.render(st.scene, st.cam);
                    cnv._p3dAnim = requestAnimationFrame(loop);
                  };
                  loop();
                }
                var liveState = cnv._p3d;
                if (liveState) {
                  liveState.interactionMode = sculptMode;
                  liveState.recipe = recipe;
                  liveState.selectedIndex = sel;
                  liveState.commitRecipe = setRecipe;
                  liveState.selectPart = function(index) { upd('sculptSel', index); };
                  liveState.snap = sculptSnap;
                  cnv.dataset.mode = sculptMode;
                  cnv.dataset.snap = sculptSnap ? String(sculptSnap) : 'off';
                }
                // (re)build the sculpture when the recipe changed
                var st2 = cnv._p3d;
                var json = recipe ? JSON.stringify(recipe) : '';
                if (st2 && st2.json !== json) {
                  st2.json = json;
                  if (st2.obj) {
                    try {
                      st2.scene.remove(st2.obj);
                      st2.obj.traverse(function(o) { if (o.geometry && o.geometry.dispose) o.geometry.dispose(); var mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; mats.forEach(function(mx) { try { mx.dispose(); } catch (e) {} }); });
                    } catch (e) {}
                    st2.obj = null;
                  }
                  if (recipe) { try { st2.obj = P3D.buildObject(window.THREE, recipe, { unit: 1 }); if (st2.obj) st2.scene.add(st2.obj); } catch (e) {} }
                }
              };
              var SHAPE_ICONS = { box: '📦', sphere: '⚪', cylinder: '🛢', cone: '🔺', torus: '🍩' };
              var mini = "min-h-[40px] min-w-[40px] rounded-lg border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-pink-50";
              var doAiSculpt = function() {
                // busy flag lives on window, NOT in toolData — a persisted busy
                // flag from an interrupted request would disable the button forever.
                if (typeof callGemini !== 'function' || window._artSculptBusy) return;
                var subj = (d.sculptText || '').trim(); if (!subj) return;
                window._artSculptBusy = true; upd('_sculptPing', (d._sculptPing || 0) + 1);
                var prompt = recipe ? P3D.buildRefinePrompt(recipe, subj) : P3D.buildRecipePrompt(subj);
                callGemini(prompt, false, false, 0.85).then(function(resp) {
                  var r = P3D.parseRecipe(typeof resp === 'string' ? resp : (resp && (resp.text || resp.output || resp.response)) || '');
                  window._artSculptBusy = false;
                  if (r) { if (!recipe) r.name = subj.slice(0, 80); upd('sculptSel', 0); setRecipe(r); if (typeof announceToSR === 'function') announceToSR('Sculpture updated'); }
                  else { upd('_sculptPing', (d._sculptPing || 0) + 2); if (addToast) addToast('⚠️ ' + __alloT('stem.artstudio.sculpt_failed', 'Sculpting failed — try a simpler description.'), 'error'); }
                }).catch(function() { window._artSculptBusy = false; upd('_sculptPing', (d._sculptPing || 0) + 2); });
              };
              var doExportPng = function() {
                var cnv = _cnvBox.current; if (!cnv || !cnv._p3d) return;
                try {
                  cnv._p3d.ren.render(cnv._p3d.scene, cnv._p3d.cam);   // synchronous render → valid buffer
                  var a = document.createElement('a');
                  a.href = cnv.toDataURL('image/png');
                  a.download = ((recipe && recipe.name) || 'sculpture').toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40) + '.png';
                  document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  if (typeof announceToSR === 'function') announceToSR('Sculpture picture saved.');
                } catch (e) {
                  if (typeof announceToSR === 'function') announceToSR('Unable to save the sculpture picture.');
                }
              };
              var placeDroppedShape = function(event) {
                event.preventDefault();
                var shape = '';
                try { shape = event.dataTransfer.getData('application/x-artstudio-shape') || event.dataTransfer.getData('text/plain'); } catch (e) {}
                if ((P3D.SHAPES || []).indexOf(shape) === -1) return;
                var next = P3D.addPart(recipe, shape);
                if (!next || !next.parts || !next.parts.length) return;
                var index = next.parts.length - 1;
                var rect = event.currentTarget.getBoundingClientRect();
                var width = rect.width || event.currentTarget.clientWidth || 480;
                var height = rect.height || event.currentTarget.clientHeight || 420;
                var x = Math.max(-2, Math.min(2, ((event.clientX - rect.left) / width - 0.5) * 3));
                var y = Math.max(0.05, Math.min(2.5, (1 - (event.clientY - rect.top) / height) * 1.8));
                x = snapSculptValue(x, false);
                y = snapSculptValue(y, false);
                if (P3D.updatePart) next = P3D.updatePart(next, index, { position: [x, y, 0] });
                setRecipe(next);
                upd('sculptSel', index);
                if (typeof announceToSR === 'function') announceToSR('Added ' + shape + ' at the drop position.');
              };
              var mirrorSelectedPart = function() {
                if (!recipe || !selectedPart || !P3D.duplicatePart || !P3D.updatePart) return;
                var next = P3D.duplicatePart(recipe, sel);
                if (!next || !next.parts || next.parts.length <= parts.length) {
                  if (typeof announceToSR === 'function') announceToSR('Unable to add another sculpture part.');
                  return;
                }
                var mirroredIndex = sel + 1;
                var mirrorAxisIndex = sculptMirrorAxis === 'y' ? 1 : sculptMirrorAxis === 'z' ? 2 : 0;
                var mirroredPosition = selectedPart.position.slice();
                mirroredPosition[mirrorAxisIndex] = -mirroredPosition[mirrorAxisIndex];
                mirroredPosition = mirroredPosition.map(function(value) { return snapSculptValue(value, false); });
                var mirroredRotation = selectedPart.rotation.map(function(value, axis) { return axis === mirrorAxisIndex ? value : -value; });
                next = P3D.updatePart(next, mirroredIndex, { position: mirroredPosition, rotation: mirroredRotation });
                setRecipe(next);
                upd('sculptSel', mirroredIndex);
                if (typeof announceToSR === 'function') announceToSR('Created a mirrored copy of part ' + (sel + 1) + ' on the ' + sculptMirrorAxis.toUpperCase() + ' axis.');
              };
              return React.createElement("div", { className: "grid md:grid-cols-2 gap-4" },
                // preview column
                React.createElement('div', { className: 'contents' },
                  React.createElement('div', { className: 'md:col-span-2 -mb-2 flex flex-wrap gap-2 items-center' },
                    React.createElement('div', { className: 'flex gap-1 flex-1', role: 'group', 'aria-label': 'Sculpture canvas interaction' },
                      React.createElement('button', { className: mini + ' flex-1', 'aria-label': 'Orbit sculpture view', 'aria-pressed': sculptMode === 'orbit', onClick: function() { upd('sculptInteractMode', 'orbit'); } }, '\uD83C\uDF10 Orbit'),
                      React.createElement('button', { className: mini + ' flex-1', 'aria-label': 'Move sculpture parts', 'aria-pressed': sculptMode === 'move', disabled: !parts.length, onClick: function() { upd('sculptInteractMode', 'move'); } }, '\u270B Move'),
                      React.createElement('button', { className: mini + ' flex-1', 'aria-label': 'Rotate sculpture parts', 'aria-pressed': sculptMode === 'rotate', disabled: !parts.length, onClick: function() { upd('sculptInteractMode', 'rotate'); } }, '\u21BB Rotate'),
                      React.createElement('button', { className: mini + ' flex-1', 'aria-label': 'Scale sculpture parts', 'aria-pressed': sculptMode === 'scale', disabled: !parts.length, onClick: function() { upd('sculptInteractMode', 'scale'); } }, '\u2922 Scale')
                    ),
                    React.createElement('div', { className: 'flex gap-1 items-center', role: 'group', 'aria-label': 'Position snapping' },
                      React.createElement('span', { className: 'text-[11px] font-bold text-slate-600' }, 'Snap:'),
                      [{ value: 0, label: 'Off' }, { value: 0.1, label: '0.1' }, { value: 0.25, label: '0.25' }, { value: 0.5, label: '0.5' }].map(function(option) {
                        return React.createElement('button', { key: option.label, className: mini + ' px-2', 'aria-label': option.value ? 'Snap positions to ' + option.label + ' units' : 'Turn position snapping off', 'aria-pressed': sculptSnap === option.value, onClick: function() { upd('sculptSnap', option.value); } }, option.label);
                      })
                    )
                  )
                ),
                React.createElement("div", null,
                  React.createElement("canvas", { role: "img", "aria-label": '3D sculpture preview. ' + sculptSummary + '. Auto-rotation ' + (sculptAuto ? 'running' : 'paused') + '. Position snapping ' + (sculptSnap ? sculptSnap + ' units' : 'off') + '.',
                    ref: sculptRef,
                    width: 480,
                    height: 420,
                    className: "w-full rounded-xl border border-slate-400 focus-visible:ring-4 focus-visible:ring-pink-600 focus-visible:ring-offset-2 " + (sculptMode === 'move' ? 'cursor-move' : sculptMode === 'rotate' ? 'cursor-grabbing' : sculptMode === 'scale' ? 'cursor-ns-resize' : 'cursor-grab'),
                    tabIndex: 0,
                    "aria-describedby": "artstudio-sculpt-keyboard-help",
                    "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight PageUp PageDown Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",
                    onDragOver: function(event) { event.preventDefault(); },
                    onDrop: placeDroppedShape
                  }),
                  React.createElement("p", { id: "artstudio-sculpt-keyboard-help", className: "mt-2 text-[11px] text-slate-600" }, sculptMode === 'move' ? "Move parts: select and drag a form. Arrow keys move it; Page Up or Page Down changes depth. Choose a Snap grid, or hold Alt for fine unsnapped movement. Drop a shape button onto the canvas to place it." : sculptMode === 'rotate' ? "Rotate parts: select and drag a form. Arrow keys rotate its X or Y axis; Page Up or Page Down rotates Z. Hold Alt for one-degree keyboard turns." : sculptMode === 'scale' ? "Scale parts: select and drag diagonally. Up, Right, or Page Up grows it; Down, Left, or Page Down shrinks it. Hold Alt for fine scaling." : "Orbit: drag or use Arrow keys to turn the view; Alt makes a fine adjustment; Home resets the view; Space or Enter toggles auto-rotation."),
                  React.createElement("div", { className: "flex flex-wrap gap-2 mt-2", role: "group", "aria-label": "3D preview actions" },
                    React.createElement("button", { className: mini, "aria-label": "Undo sculpture change", disabled: !sculptUndo.length, onClick: undoSculpt }, '\u21B6'),
                    React.createElement("button", { className: mini, "aria-label": "Redo sculpture change", disabled: !sculptRedo.length, onClick: redoSculpt }, '\u21B7'),
                    React.createElement("button", {
                      className: mini + " flex-1",
                      "aria-label": sculptAuto ? "Pause 3D preview rotation" : "Resume 3D preview rotation",
                      "aria-pressed": !sculptAuto,
                      onClick: function() {
                        var nextAuto = !sculptAuto;
                        var cnv = _cnvBox.current;
                        if (cnv && cnv._p3d) { cnv._p3d.auto = nextAuto; cnv.dataset.auto = nextAuto ? '1' : '0'; }
                        upd('sculptAuto', nextAuto);
                        if (typeof announceToSR === 'function') announceToSR(nextAuto ? 'Sculpture auto-rotation resumed.' : 'Sculpture auto-rotation paused.');
                      }
                    }, sculptAuto ? '⏸ ' + __alloT('stem.artstudio.pause', 'Pause') : '▶ ' + __alloT('stem.artstudio.resume', 'Resume')),
                    React.createElement("button", { className: mini + " flex-1", onClick: doExportPng }, '📷 ' + __alloT('stem.artstudio.sculpt_export', 'Save picture')),
                    recipe ? React.createElement("button", { className: mini + " flex-1", onClick: function() { upd('sculptSel', 0); setRecipe(null); if (typeof announceToSR === 'function') announceToSR('Sculpture cleared.'); } }, '🗑 ' + __alloT('stem.artstudio.sculpt_clear', 'Clear')) : null
                  )
                ),
                // editor column
                React.createElement("div", { className: "space-y-2" },
                  React.createElement("h3", { className: "font-black text-slate-700 text-sm" }, '🗿 ' + __alloT('stem.artstudio.sculpt_title', 'Sculpt with primitive shapes')),
                  React.createElement("div", null,
                    React.createElement("span", { id: "artstudio-sculpt-presets-label", className: "text-[11px] font-bold text-slate-600 mb-1 block" }, __alloT('stem.artstudio.sculpt_presets', 'Start from or morph a preset')),
                    React.createElement("div", { className: "flex flex-wrap gap-1", role: "group", "aria-labelledby": "artstudio-sculpt-presets-label" }, (P3D.PRESETS || []).map(function(ps) {
                      return React.createElement("button", { key: ps.id, className: mini, title: ps.label, "aria-label": 'Preset: ' + ps.label, onClick: function() { upd('sculptSel', 0); setRecipe(P3D.getPreset(ps.id)); } }, ps.emoji);
                    }))
                  ),
                  React.createElement("div", null,
                    React.createElement("span", { id: "artstudio-sculpt-add-label", className: "text-[11px] font-bold text-slate-600 mb-1 block" }, __alloT('stem.artstudio.sculpt_add_part', 'Add a part \u2014 click, or drag it onto the preview')),
                    React.createElement("div", { className: "flex flex-wrap gap-1", role: "group", "aria-labelledby": "artstudio-sculpt-add-label" }, (P3D.SHAPES || []).map(function(shp) {
                      return React.createElement("button", { key: shp, className: mini, draggable: true, title: 'Add or drag ' + shp, "aria-label": 'Add ' + shp + '; it can also be dragged onto the preview', onDragStart: function(event) { event.dataTransfer.setData('application/x-artstudio-shape', shp); event.dataTransfer.setData('text/plain', shp); }, onClick: function() { partOp(function(P, r) { return P.addPart(r, shp); }); upd('sculptSel', parts.length); } }, SHAPE_ICONS[shp] || shp);
                    }))
                  ),
                  parts.length ? React.createElement("div", null,
                    React.createElement("div", { className: "flex flex-wrap gap-1 mb-1", role: "group", "aria-label": __alloT('stem.artstudio.sculpt_parts', 'Parts') }, parts.map(function(p, i) {
                      return React.createElement("button", { key: i, className: mini + (i === sel ? ' ring-2 ring-pink-500' : ''), "aria-pressed": i === sel ? 'true' : 'false', "aria-label": 'Part ' + (i + 1) + ': ' + p.shape, style: { borderBottom: '3px solid ' + p.color }, onClick: function() { upd('sculptSel', i); } }, SHAPE_ICONS[p.shape] || p.shape);
                    })),
                    React.createElement("div", { className: "grid grid-cols-6 gap-1 mb-1", role: "group", "aria-label": __alloT('stem.artstudio.sculpt_move', 'Move the selected part') },
                      [['◀', 0, -1, 'Left'], ['▶', 0, 1, 'Right'], ['⬆', 1, 1, 'Up'], ['⬇', 1, -1, 'Down'], ['↗', 2, 1, 'Closer'], ['↙', 2, -1, 'Farther']].map(function(cfg) {
                        return React.createElement("button", { key: cfg[3], className: mini, title: cfg[3], "aria-label": cfg[3], onClick: function() { partOp(function(P, r) {
                          var moved = selectedPart.position.slice();
                          moved[cfg[1]] = snapSculptValue(moved[cfg[1]] + cfg[2] * (sculptSnap || 0.08), false);
                          return P.updatePart(r, sel, { position: moved });
                        }); } }, cfg[0]);
                      })),
                    React.createElement("div", { className: "flex items-center gap-1 mb-1", role: "group", "aria-label": "Mirror copy axis" },
                      React.createElement("span", { className: "mr-1 text-[11px] font-bold text-slate-600" }, "Mirror axis:"),
                      ['x', 'y', 'z'].map(function(axis) {
                        return React.createElement("button", { key: axis, className: mini + " min-h-[32px] px-3", "aria-label": 'Mirror across ' + axis.toUpperCase() + ' axis', "aria-pressed": sculptMirrorAxis === axis, onClick: function() { upd('sculptMirrorAxis', axis); } }, axis.toUpperCase());
                      })
                    ),
                    React.createElement("div", { className: "grid grid-cols-7 gap-1", role: "group", "aria-label": __alloT('stem.artstudio.sculpt_tools', 'Shape tools') },
                      React.createElement("button", { className: mini, title: 'Bigger', "aria-label": 'Bigger', onClick: function() { partOp(function(P, r) { return P.scalePart(r, sel, 1.25); }); } }, '➕'),
                      React.createElement("button", { className: mini, title: 'Smaller', "aria-label": 'Smaller', onClick: function() { partOp(function(P, r) { return P.scalePart(r, sel, 0.8); }); } }, '➖'),
                      React.createElement("button", { className: mini, title: 'Spin', "aria-label": 'Spin', onClick: function() { partOp(function(P, r) { return P.nudgePart(r, sel, 'rotation', 1, 30); }); } }, '🔄'),
                      React.createElement("button", { className: mini, title: 'Color', "aria-label": 'Change color', onClick: function() { partOp(function(P, r) { return P.recolorPart(r, sel); }); } }, '🎨'),
                      React.createElement("button", { className: mini, title: 'Duplicate', "aria-label": 'Duplicate', onClick: function() { partOp(function(P, r) { return P.duplicatePart(r, sel); }); } }, '⧉'),
                      React.createElement("button", { className: mini, title: 'Mirror copy on ' + sculptMirrorAxis.toUpperCase() + ' axis', "aria-label": 'Mirror copy on ' + sculptMirrorAxis.toUpperCase() + ' axis', onClick: mirrorSelectedPart }, '↔'),
                      React.createElement("button", { className: mini, title: 'Remove part', "aria-label": 'Remove part', onClick: function() { partOp(function(P, r) { return P.removePart(r, sel); }); upd('sculptSel', Math.max(0, sel - 1)); } }, '✕')
                    ),
                    selectedPart ? React.createElement("details", { className: "mt-2 rounded-xl border border-slate-200 bg-slate-50 p-2" },
                      React.createElement("summary", { className: "cursor-pointer text-xs font-black text-slate-700" }, 'Fine-tune selected part'),
                      React.createElement("div", { className: "mt-2 space-y-2" },
                        React.createElement("div", { className: "grid grid-cols-2 gap-2" },
                          React.createElement("label", { className: "text-[11px] font-bold text-slate-600" }, 'Shape',
                            React.createElement("select", { value: selectedPart.shape, className: "mt-1 w-full rounded border border-slate-300 bg-white p-1", onChange: function(event) { var nextShape = event.target.value; partOp(function(P, r) { var starter = P.newPart(nextShape, sel); return P.updatePart(r, sel, { shape: nextShape, size: starter.size }); }); } }, (P3D.SHAPES || []).map(function(shape) { return React.createElement("option", { key: shape, value: shape }, shape); }))
                          ),
                          React.createElement("label", { className: "text-[11px] font-bold text-slate-600" }, 'Color',
                            React.createElement("input", { type: "color", value: selectedPart.color, className: "mt-1 h-8 w-full", onChange: function(event) { partOp(function(P, r) { return P.updatePart(r, sel, { color: event.target.value }); }); } })
                          )
                        ),
                        React.createElement("div", null,
                          React.createElement("p", { className: "text-[11px] font-black text-slate-600" }, 'Size'),
                          (selectedPart.shape === 'box' ? ['Width', 'Height', 'Depth'] : selectedPart.shape === 'sphere' ? ['Radius'] : selectedPart.shape === 'torus' ? ['Ring radius', 'Tube radius'] : ['Radius', 'Height']).map(function(label, axis) {
                            return React.createElement("label", { key: label, className: "grid grid-cols-[72px_1fr_34px] items-center gap-1 text-[10px] text-slate-600" }, label,
                              React.createElement("input", { type: "range", min: 0.02, max: 4, step: 0.02, value: selectedPart.size[axis], onChange: function(event) { var size = selectedPart.size.slice(); size[axis] = parseFloat(event.target.value); partOp(function(P, r) { return P.updatePart(r, sel, { size: size }); }); } }),
                              React.createElement("output", null, Number(selectedPart.size[axis]).toFixed(2))
                            );
                          })
                        ),
                        [{ field: 'position', title: 'Position', step: sculptSnap || 0.05, min: -4, max: 4 }, { field: 'rotation', title: 'Rotation', step: 5, min: -180, max: 180 }].map(function(group) {
                          return React.createElement("div", { key: group.field },
                            React.createElement("p", { className: "text-[11px] font-black text-slate-600" }, group.title),
                            ['X', 'Y', 'Z'].map(function(axisLabel, axis) {
                              var upper = group.field === 'position' && axis === 1 ? 8 : group.max;
                              return React.createElement("label", { key: axisLabel, className: "grid grid-cols-[18px_1fr_38px] items-center gap-1 text-[10px] text-slate-600" }, axisLabel,
                                React.createElement("input", { type: "range", min: group.min, max: upper, step: group.step, value: selectedPart[group.field][axis], onChange: function(event) { var values = selectedPart[group.field].slice(); values[axis] = parseFloat(event.target.value); var patch = {}; patch[group.field] = values; partOp(function(P, r) { return P.updatePart(r, sel, patch); }); } }),
                                React.createElement("output", null, Math.round(selectedPart[group.field][axis] * 100) / 100)
                              );
                            })
                          );
                        })
                      )
                    ) : null
                  ) : null,
                  (typeof callGemini === 'function') ? React.createElement("div", { className: "flex gap-1" },
                    React.createElement("input", { value: d.sculptText || '', onChange: function(e) { upd('sculptText', e.target.value); }, placeholder: recipe ? __alloT('stem.artstudio.sculpt_refine_ph', 'Describe a change ("longer tail")…') : __alloT('stem.artstudio.sculpt_create_ph', 'Or describe something to sculpt…'), "aria-label": __alloT('stem.artstudio.sculpt_ai_label', 'Describe a sculpture or a change'), className: "flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-xs" }),
                    React.createElement("button", { className: mini, "aria-label": recipe ? "Refine sculpture with AI" : "Create sculpture with AI", onClick: doAiSculpt, disabled: !!window._artSculptBusy, "aria-busy": window._artSculptBusy ? 'true' : 'false' }, window._artSculptBusy ? '…' : '✨')
                  ) : null,
                  // gallery — named recipes persisted in toolData
                  React.createElement("div", null,
                    React.createElement("div", { className: "text-[11px] font-bold text-slate-500 mb-1" }, '🖼 ' + __alloT('stem.artstudio.sculpt_gallery', 'My gallery')),
                    recipe ? React.createElement("form", { className: "flex gap-1 mb-1", onSubmit: function(e) {
                      e.preventDefault();
                      var nm = (e.target.elements.sculptname.value || '').trim().slice(0, 40);
                      if (!nm) return;
                      var g2 = Object.assign({}, gallery); g2[nm] = recipe;
                      upd('sculptGallery', g2); e.target.elements.sculptname.value = '';
                      if (typeof announceToSR === 'function') announceToSR('Saved to gallery');
                    } },
                      React.createElement("input", { name: "sculptname", placeholder: __alloT('stem.artstudio.sculpt_save_ph', 'Name it…'), "aria-label": __alloT('stem.artstudio.sculpt_save_ph', 'Name it…'), className: "flex-1 min-w-0 border border-slate-300 rounded-lg px-2 py-1.5 text-xs" }),
                      React.createElement("button", { type: "submit", className: mini, "aria-label": "Save sculpture to gallery" }, '💾')
                    ) : null,
                    Object.keys(gallery).length ? React.createElement("ul", { className: "space-y-1" }, Object.keys(gallery).map(function(nm) {
                      return React.createElement("li", { key: nm, className: "flex items-center gap-1 text-xs" },
                        React.createElement("button", { className: "flex-1 text-left min-h-[40px] px-2 rounded-lg border border-slate-200 hover:bg-pink-50 font-bold text-slate-700", onClick: function() { upd('sculptSel', 0); setRecipe(P3D.normalizeRecipe(gallery[nm])); }, "aria-label": 'Load ' + nm }, nm),
                        React.createElement("button", { className: mini, "aria-label": 'Delete ' + nm, onClick: function() { var g2 = Object.assign({}, gallery); delete g2[nm]; upd('sculptGallery', g2); } }, '✕')
                      );
                    })) : React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.sculpt_gallery_empty', 'Saved sculptures appear here.'))
                  )
                )
              );
            })(),

            // === H7b'' RICH inquiry widget: color harmony ===
            tab === 'harmonyHunt' && (function() {
              var iq = d._harmonyHunt || { baseHue: 200, satBlend: 70, litVar: 50, rotation: 0, paletteSize: 6, hypothesis: '', stuckRevealed: false, understood: false, explanation: '', log: [] };
              function setIQ(patch) { upd('_harmonyHunt', Object.assign({}, iq, patch)); }
              // Generate harmony palette based on base hue + offset
              var palette = [];
              var harmonyType;
              for (var i = 0; i < iq.paletteSize; i++) {
                var hue = (iq.baseHue + (360 / iq.paletteSize) * i + iq.rotation) % 360;
                var sat = 50 + (iq.satBlend / 100) * 40;
                var lit = 40 + (iq.litVar / 100) * 30;
                palette.push({ hue: hue, sat: sat, lit: lit, css: 'hsl(' + hue + ',' + sat + '%,' + lit + '%)' });
              }
              // Classify harmony type by palette spread
              var hueSpread = 360 / iq.paletteSize;
              if (iq.paletteSize === 2) harmonyType = 'complementary';
              else if (iq.paletteSize === 3) harmonyType = 'triadic';
              else if (iq.paletteSize === 4) harmonyType = 'tetradic';
              else if (iq.paletteSize <= 6 && iq.satBlend < 30) harmonyType = 'analogous';
              else harmonyType = 'rainbow';
              var hMeta = {
                complementary: { label: __alloT('stem.artstudio.complementary_2_opposites', '⚫⚪ Complementary (2 opposites)'), desc: __alloT('stem.artstudio.maximum_contrast_pop_art_brand_accents', 'Maximum contrast. Pop art, brand accents.') },
                triadic:       { label: __alloT('stem.artstudio.triadic_3_equidistant', '🔺 Triadic (3 equidistant)'), desc: __alloT('stem.artstudio.vibrant_but_balanced_childrens_books_c', 'Vibrant but balanced. Childrens books, cartoons.') },
                tetradic:      { label: __alloT('stem.artstudio.tetradic_4_corners', '◇ Tetradic (4 corners)'), desc: __alloT('stem.artstudio.rich_palette_with_two_opposing_pairs', 'Rich palette with two opposing pairs.') },
                analogous:     { label: __alloT('stem.artstudio.analogous_low_saturation_neighbors', '🌅 Analogous (low saturation neighbors)'), desc: __alloT('stem.artstudio.calm_harmonious_landscape_painting', 'Calm, harmonious — landscape painting.') },
                rainbow:       { label: __alloT('stem.artstudio.rainbow_many_vivid_hues', '🌈 Rainbow (many vivid hues)'), desc: __alloT('stem.artstudio.energetic_playful_childrens_design', 'Energetic, playful — childrens design.') }
              }[harmonyType];
              function logObs() {
                setIQ({ log: (iq.log || []).concat([{ h: iq.baseHue, s: iq.satBlend, l: iq.litVar, r: iq.rotation, n: iq.paletteSize, t: harmonyType }]).slice(-8) });
              }
              return React.createElement('div', { className: 'space-y-3' },
                React.createElement('div', { className: 'p-4 rounded-xl bg-white border border-pink-300 shadow-sm space-y-3' },
                  React.createElement('h3', { className: 'text-sm font-black text-pink-700' }, __alloT('stem.artstudio.color_harmony_discovery', '🎶 Color harmony discovery')),
                  React.createElement('p', { className: 'text-[12px] text-slate-700 leading-relaxed' },
                    __alloT('stem.artstudio.adjust_base_hue_saturation_lightness_v', 'Adjust base hue, saturation, lightness variation, rotation, and palette size. Widget renders a live harmony palette and classifies it into one of 5 discrete harmony types. No score, no reveal — sweep and notice which combinations produce which harmonies.')),
                  // Classification badge
                  React.createElement('div', { className: 'p-3 rounded-lg text-center', style: { background: '#f5f3ff', border: '2px solid #c4b5fd' } },
                    React.createElement('div', { className: 'text-base font-black text-violet-700' }, hMeta.label),
                    React.createElement('div', { className: 'text-[11px] text-slate-700 mt-1' }, hMeta.desc)
                  ),
                  // SVG harmony wheel visualization
                  React.createElement('div', { className: 'flex justify-center p-3 bg-slate-50 rounded border border-slate-200' },
                    React.createElement('svg', { viewBox: '0 0 240 240', role: 'img', 'aria-label': 'Color harmony wheel showing ' + hMeta.label + ' with ' + iq.paletteSize + ' colors around base hue ' + iq.baseHue + ' degrees.', className: 'w-64 h-64' },
                      // Background hue ring (reference)
                      Array.from({ length: 36 }, function(_, i) {
                        var hue = i * 10;
                        var a1 = (hue - 5 - 90) * Math.PI / 180;
                        var a2 = (hue + 5 - 90) * Math.PI / 180;
                        var rIn = 95, rOut = 110;
                        var x1 = 120 + rIn * Math.cos(a1), y1 = 120 + rIn * Math.sin(a1);
                        var x2 = 120 + rOut * Math.cos(a1), y2 = 120 + rOut * Math.sin(a1);
                        var x3 = 120 + rOut * Math.cos(a2), y3 = 120 + rOut * Math.sin(a2);
                        var x4 = 120 + rIn * Math.cos(a2), y4 = 120 + rIn * Math.sin(a2);
                        return React.createElement('path', { key: 'r' + i, d: 'M ' + x1 + ' ' + y1 + ' L ' + x2 + ' ' + y2 + ' A ' + rOut + ' ' + rOut + ' 0 0 1 ' + x3 + ' ' + y3 + ' L ' + x4 + ' ' + y4 + ' A ' + rIn + ' ' + rIn + ' 0 0 0 ' + x1 + ' ' + y1 + ' Z',
                          fill: 'hsl(' + hue + ',75%,60%)', opacity: 0.35 });
                      }),
                      // Palette markers — show selected harmony positions
                      palette.map(function(p, i) {
                        var ang = (p.hue - 90) * Math.PI / 180;
                        var cx = 120 + 78 * Math.cos(ang);
                        var cy = 120 + 78 * Math.sin(ang);
                        return React.createElement('g', { key: 'p' + i },
                          React.createElement('circle', { cx: cx, cy: cy, r: 18, fill: p.css, stroke: '#1e293b', strokeWidth: 1.5 }),
                          React.createElement('text', { x: cx, y: cy + 4, textAnchor: 'middle', fontSize: 11, fontWeight: 'bold', fill: p.lit > 50 ? '#1e293b' : '#fff' }, (i + 1))
                        );
                      }),
                      // Center label
                      React.createElement('text', { x: 120, y: 118, textAnchor: 'middle', fontSize: 12, fontWeight: 'bold', fill: '#475569' }, 'base ' + iq.baseHue + '°'),
                      React.createElement('text', { x: 120, y: 132, textAnchor: 'middle', fontSize: 10, fill: '#64748b' }, harmonyType)
                    )
                  ),
                  // Palette swatches with HSL values
                  React.createElement('div', { className: 'flex flex-wrap gap-1' },
                    palette.map(function(p, i) {
                      return React.createElement('div', { key: 'sw' + i, className: 'flex-1 min-w-[60px] rounded text-center text-[10px] font-mono', style: { background: p.css, color: p.lit > 50 ? '#1e293b' : '#fff', padding: '8px 4px' } },
                        '#' + (i + 1), React.createElement('div', null, p.hue.toFixed(0) + '°'));
                    })
                  ),
                  // Sliders
                  React.createElement('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                    [{ k: 'baseHue', l: 'Base hue (°)', mn: 0, mx: 359, st: 5 },
                     { k: 'satBlend', l: 'Saturation blend (%)', mn: 0, mx: 100, st: 5 },
                     { k: 'litVar', l: 'Lightness variation (%)', mn: 0, mx: 100, st: 5 },
                     { k: 'rotation', l: 'Rotation (°)', mn: -90, mx: 90, st: 5 },
                     { k: 'paletteSize', l: 'Palette size', mn: 2, mx: 12, st: 1 }].map(function(s) {
                      return React.createElement('div', { key: s.k },
                        React.createElement('label', { htmlFor: 'hh-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', React.createElement('span', { className: 'font-mono text-pink-700' }, iq[s.k])),
                        React.createElement('input', { id: 'hh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                          onChange: function(e) { var p = {}; p[s.k] = parseInt(e.target.value, 10); setIQ(p); },
                          className: 'w-full', 'aria-label': s.l }));
                    })
                  ),
                  // Log + reset
                  React.createElement('div', { className: 'flex gap-2 items-center flex-wrap' },
                    React.createElement('button', { onClick: logObs, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, __alloT('stem.artstudio.log', '📋 Log')),
                    React.createElement('button', { onClick: function() { setIQ({ baseHue: 200, satBlend: 70, litVar: 50, rotation: 0, paletteSize: 6, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, __alloT('stem.artstudio.reset', '↺ Reset')),
                    (iq.log || []).length > 0 && React.createElement('span', { className: 'text-[10px] text-slate-500 italic' }, (iq.log || []).length + ' logged')
                  ),
                  // Log table
                  (iq.log || []).length > 0 && React.createElement('div', { className: 'overflow-x-auto' },
                    React.createElement('table', { className: 'text-[10px] w-full border-collapse text-slate-700' },
                      React.createElement('thead', null, React.createElement('tr', { className: 'bg-slate-100' },
                        ['base', 'sat', 'lit', 'rot', 'n', 'harmony'].map(function(c, i) { return React.createElement('th', { key: 'h' + i, scope: 'col', className: 'px-1 border border-slate-200 text-left' }, c); }))),
                      React.createElement('tbody', null, iq.log.map(function(o, idx) {
                        return React.createElement('tr', { key: 'lr' + idx },
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.h),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.s),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.l),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.r),
                          React.createElement('td', { className: 'px-1 border border-slate-200 font-mono' }, o.n),
                          React.createElement('td', { className: 'px-1 border border-slate-200' }, o.t));
                      }))
                    )
                  ),
                  React.createElement('textarea', { 'aria-label': 'Color harmony hypothesis', value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, placeholder: __alloT('stem.artstudio.hypothesis_free_text_no_right_answer_w', 'Hypothesis (free text — no right answer): What makes a palette feel harmonious vs jarring?'),
                    className: 'w-full text-[12px] border border-slate-300 rounded p-2 font-mono leading-snug', rows: 3 }),
                  !iq.stuckRevealed && React.createElement('button', { onClick: function() { setIQ({ stuckRevealed: true }); }, className: 'px-2 py-1 rounded bg-amber-50 text-[11px] font-bold text-amber-800 border border-amber-300' }, __alloT('stem.artstudio.stuck_show_open_prompts_no_answers', '🤔 Stuck — show open prompts (no answers)')),
                  iq.stuckRevealed && React.createElement('div', { className: 'p-3 rounded bg-amber-50 border border-amber-200 text-[11px] text-slate-700 leading-relaxed' },
                    React.createElement('div', { className: 'font-bold text-amber-900 mb-1' }, __alloT('stem.artstudio.open_prompts_investigate_by_manipulati', 'Open prompts — investigate by manipulating:')),
                    React.createElement('ul', { className: 'list-disc pl-5 space-y-1' },
                      React.createElement('ul', { className: 'list-disc pl-3' },
                        React.createElement('li', null, __alloT('stem.artstudio.find_the_smallest_palette_that_still_f', 'Find the smallest palette that still feels "complete" to you.')),
                        React.createElement('li', null, __alloT('stem.artstudio.real_impressionists_used_analogous_pal', 'Real impressionists used analogous palettes. Why might that be?')),
                        React.createElement('li', null, __alloT('stem.artstudio.some_color_schemes_have_proper_names_c', 'Some color schemes have proper names (complementary, split-complementary, triadic). Look those up and try to reproduce them.')),
                        React.createElement('li', null, __alloT('stem.artstudio.high_saturation_many_colors_busy_try_d', 'High saturation + many colors = busy. Try desaturating with the blend slider — what happens to "harmony"?'))))),
                  React.createElement('div', { className: 'p-3 rounded bg-emerald-50 border border-emerald-200' },
                    React.createElement('div', { className: 'flex items-center gap-2 mb-2' },
                      React.createElement('input', { type: 'checkbox', id: 'hh-und', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); }, className: 'w-4 h-4' }),
                      React.createElement('label', { htmlFor: 'hh-und', className: 'text-[12px] font-bold text-emerald-900 cursor-pointer' },
                        __alloT('stem.artstudio.i_think_i_understand_color_harmony_now', 'I think I understand color harmony now — let me explain it in my own words'))),
                    iq.understood && React.createElement('textarea', { 'aria-label': 'Explain your understanding of color harmony', value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, placeholder: __alloT('stem.artstudio.explain_in_your_own_words_how_do_hue_s', 'Explain in your own words: how do hue spacing, saturation, and palette size determine "harmony"?'),
                      className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug', rows: 4 })),
                  React.createElement('div', { className: 'mt-3 text-[10px] italic text-slate-500' },
                    __alloT('stem.artstudio.design_note_discrete_5_state_harmony_m', 'Design note: discrete 5-state harmony marker; SVG wheel shows palette positions; no "good palette" score — by design.'))
                )
              );
            })(),

            // ═══ SPIROGRAPH TAB ═══

            tab === 'spirograph' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl p-4 border border-indigo-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-indigo-700 mb-3" }, __alloT('stem.artstudio.spirograph_controls', "\uD83C\uDF00 Spirograph Controls")),

                    [{ k: 'spiroR', label: __alloT('stem.artstudio.outer_radius', 'Outer Radius'), min: 40, max: 200, def: 120 },

                     { k: 'spiror', label: __alloT('stem.artstudio.inner_radius', 'Inner Radius'), min: 10, max: 100, def: 45 },

                     { k: 'spirop', label: __alloT('stem.artstudio.pen_offset', 'Pen Offset'), min: 5, max: 120, def: 55 },

                     { k: 'spiroSpeed', label: __alloT('stem.artstudio.draw_speed', 'Draw Speed'), min: 1, max: 20, def: 8 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-indigo-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": s.k === 'spiroSpeed' ? val + ' drawing steps per frame' : val + ' units', onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('spiroReset', Date.now()); }, className: "w-full accent-indigo-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('spiroReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Redrawing the spirograph.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-300 hover:bg-indigo-100 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.redraw_spirograph', "\u21BB Redraw")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_spirograph_png', "Export spirograph as PNG"), onClick: function () { var c = document.getElementById('spiroCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'spirograph-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Spirograph PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_3', "\uD83D\uDCE5 Export PNG")),

                      React.createElement("button", { "aria-label": d.spiroRainbow ? "Use a single color for the spirograph" : "Use a rainbow color progression for the spirograph", "aria-pressed": !!d.spiroRainbow, onClick: function () { var nextRainbow = !d.spiroRainbow; upd('spiroRainbow', nextRainbow); upd('spiroReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(nextRainbow ? 'Rainbow spirograph enabled.' : 'Single-color spirograph enabled.'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 " + (d.spiroRainbow ? 'bg-gradient-to-r from-red-600 via-yellow-700 to-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-400 hover:bg-indigo-50') }, d.spiroRainbow ? '\uD83C\uDF08 Rainbow \u2714' : '\uD83C\uDF08 Rainbow')

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-spiro-presets-label" },

                      React.createElement("span", { id: "artstudio-spiro-presets-label", className: "text-[11px] font-bold text-indigo-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.star', 'Star'), R: 120, r: 45, p: 55 }, { label: __alloT('stem.artstudio.flower', 'Flower'), R: 150, r: 50, p: 25 }, { label: __alloT('stem.artstudio.lace', 'Lace'), R: 100, r: 73, p: 80 }, { label: __alloT('stem.artstudio.atom', 'Atom'), R: 180, r: 25, p: 90 }, { label: __alloT('stem.artstudio.spiral', 'Spiral'), R: 140, r: 91, p: 60 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' spirograph preset', onClick: function () { upd('spiroR', pr.R); upd('spiror', pr.r); upd('spirop', pr.p); upd('spiroReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(pr.label + ' spirograph preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-indigo-700 border border-indigo-600 hover:bg-indigo-50 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-xl p-3 border border-violet-200" },

                    React.createElement("p", { className: "text-[11px] font-bold text-violet-700 mb-1" }, __alloT('stem.artstudio.math_connection', "\uD83D\uDCDA Math Connection")),

                    React.createElement("p", { id: "artstudio-spiro-description", className: "text-[11px] text-slate-700 leading-relaxed" }, __alloT('stem.artstudio.spirographs_draw', "Spirographs draw "), React.createElement("strong", null, __alloT('stem.artstudio.hypotrochoid_curves', "hypotrochoid curves")), __alloT('stem.artstudio.the_path_traced_by_a_point_on_a_small_', " \u2014 the path traced by a point on a small circle rolling inside a larger one. The pattern depends on the "), React.createElement("strong", null, "GCD"), __alloT('stem.artstudio.greatest_common_divisor_of_the_two_rad', " (greatest common divisor) of the two radii. When R/r is a simple fraction, you get fewer petals; complex ratios create intricate, never-repeating paths."))

                  )

                ),

                React.createElement("canvas", { id: 'spiroCanvas', key: 'spiro-' + (d.spiroReset || 0), width: 512, height: 512, role: "img", "aria-describedby": "artstudio-spiro-description", 'aria-label': 'Spirograph output: a ' + (d.spiroRainbow ? 'rainbow' : 'single-color') + ' hypotrochoid with outer radius ' + (typeof d.spiroR === 'number' ? d.spiroR : 120) + ', inner radius ' + (typeof d.spiror === 'number' ? d.spiror : 45) + ', and pen offset ' + (typeof d.spirop === 'number' ? d.spirop : 55) + '.', className: "rounded-xl border-2 border-indigo-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: 'var(--allo-stem-canvas, #0f172a)' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._spiroInit) return;

                    canvas._spiroInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var R = typeof d.spiroR === 'number' ? d.spiroR : 120;

                    var r = typeof d.spiror === 'number' ? d.spiror : 45;

                    var p = typeof d.spirop === 'number' ? d.spirop : 55;

                    var speed = typeof d.spiroSpeed === 'number' ? d.spiroSpeed : 8;

                    var rainbow = d.spiroRainbow;

                    var baseHue = d.hue || 0;

                    var baseSat = d.sat || 100;

                    var baseLit = d.lit || 50;

                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    var t = 0;

                    var diff = R - r;

                    var ratio = diff / r;

                    var totalRevolutions = r / (function gcd(a, b) { return b === 0 ? a : gcd(b, a % b); })(R, r);

                    var maxT = totalRevolutions * Math.PI * 2;

                    var prevX = cx + diff * Math.cos(0) + p * Math.cos(0 * ratio);

                    var prevY = cy + diff * Math.sin(0) + p * Math.sin(0 * ratio);

                    ctx.lineWidth = 1.5;

                    ctx.lineCap = 'round';

                    ctx.globalCompositeOperation = 'lighter';

                    function announceSpiroComplete() {

                      if (canvas._spiroDone) return;

                      canvas._spiroDone = true;

                      if (typeof announceToSR === 'function') announceToSR('Spirograph drawing complete.');

                    }

                    function drawStep() {

                      if (t >= maxT) { announceSpiroComplete(); return; }

                      var stepsThisFrame = reducedMotion ? Math.ceil((maxT - t) / 0.02) : speed;

                      for (var si = 0; si < stepsThisFrame; si++) {

                        t += 0.02;

                        if (t > maxT) t = maxT;

                        var x = cx + diff * Math.cos(t) + p * Math.cos(t * ratio);

                        var y = cy + diff * Math.sin(t) + p * Math.sin(t * ratio);

                        var hue = rainbow ? Math.round((t / maxT) * 360) % 360 : baseHue;

                        ctx.strokeStyle = 'hsl(' + hue + ',' + baseSat + '%,' + baseLit + '%)';

                        ctx.beginPath(); ctx.moveTo(prevX, prevY); ctx.lineTo(x, y); ctx.stroke();

                        prevX = x; prevY = y;

                      }

                      if (t < maxT && canvas.isConnected) canvas._spiroAnim = requestAnimationFrame(drawStep);

                      else announceSpiroComplete();

                    }

                    drawStep();

                  }

                })

              )

            ),

            // ═══ GENERATIVE ART TAB ═══

            tab === 'generative' && React.createElement("div", { className: "relative space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap", role: "group", "aria-label": "Generative art controls" },

                React.createElement("span", { className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.style', "\uD83C\uDF86 Style:")),

                [{ id: 'flow', icon: '\uD83C\uDF0A', label: __alloT('stem.artstudio.flow_field', 'Flow Field') }, { id: 'rain', icon: '\uD83C\uDF27', label: __alloT('stem.artstudio.particle_rain', 'Particle Rain') }, { id: 'stars', icon: '\u2728', label: __alloT('stem.artstudio.starfield', 'Starfield') }, { id: 'aurora', icon: '\uD83C\uDF0C', label: __alloT('stem.artstudio.aurora', 'Aurora') }].map(function (s) {

                  return React.createElement("button", { "aria-label": 'Use ' + s.label + ' generative style', "aria-pressed": (d.genStyle || 'flow') === s.id, key: s.id, onClick: function () { upd('genStyle', s.id); upd('genReset', Date.now()); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold transition-all " + ((d.genStyle || 'flow') === s.id ? 'bg-fuchsia-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-fuchsia-50') }, s.icon + ' ' + s.label);

                }),

                React.createElement("button", {
                  "aria-label": (d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? "Resume generative animation" : "Pause generative animation",
                  "aria-pressed": d.genPaused === undefined ? reducedMotion : !!d.genPaused,
                  onClick: function () {
                    var isPaused = d.genPaused === undefined ? reducedMotion : !!d.genPaused;
                    upd('genPaused', !isPaused);
                    if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Generative animation resumed.' : 'Generative animation paused.');
                  },
                  className: "px-3 py-1.5 rounded-lg text-xs font-bold " + ((d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? 'bg-amber-100 text-amber-700' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200')
                }, (d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? '\u25B6 Resume' : '\u23F8 Pause'),

                React.createElement("button", { onClick: function () { upd('genReset', Date.now()); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_6', "\uD83D\uDDD1 Clear")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_4', "Export PNG"), onClick: function () { var c = document.getElementById('genCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'generative-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_png_5', "\uD83D\uDCE5 Export PNG"))

              ),

              React.createElement("div", { className: "flex gap-2 mb-2" },

                React.createElement("label", { htmlFor: "artstudio-generative-density", className: "text-[11px] font-bold text-slate-600" }, "Density:"),

                React.createElement("input", { id: "artstudio-generative-density", type: "range", min: 20, max: 300, value: d.genDensity || 100, "aria-describedby": "artstudio-generative-density-value", onChange: function (e) { upd('genDensity', parseInt(e.target.value)); upd('genReset', Date.now()); }, className: "w-32 max-w-full accent-fuchsia-600" }),

                React.createElement("span", { id: "artstudio-generative-density-value", className: "text-[11px] text-slate-600" }, (d.genDensity || 100) + ' particles')

              ),

              React.createElement("canvas", { tabIndex: 0, id: 'genCanvas', key: 'gen-' + (d.genStyle || 'flow') + '-' + (d.genReset || 0), width: 640, height: 480, role: "img",
                'aria-label': 'Generative art canvas using ' + (d.genStyle || 'flow') + ' style with ' + (d.genDensity || 100) + ' particles; ' + ((d.genPaused === undefined ? reducedMotion : !!d.genPaused) ? 'paused' : 'playing') + '.',
                'aria-describedby': "artstudio-generative-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",
                className: "rounded-xl border-2 border-fuchsia-200 shadow-lg cursor-crosshair mx-auto block focus-visible:ring-4 focus-visible:ring-fuchsia-600 focus-visible:ring-offset-2",
                style: { maxWidth: '100%', background: '#0a0a1a' },

                ref: function (canvas) {

                  if (!canvas) return;

                  var isPaused = d.genPaused === undefined ? reducedMotion : !!d.genPaused;

                  canvas.setAttribute('data-paused', isPaused ? '1' : '0');

                  canvas.setAttribute('aria-label', 'Generative art canvas using ' + (d.genStyle || 'flow') + ' style with ' +

                    (d.genDensity || 100) + ' particles; ' + (isPaused ? 'paused' : 'playing') + '.');

                  if (canvas._genInit) return;

                  canvas._genInit = true;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var style = d.genStyle || 'flow';

                  var density = d.genDensity || 100;

                  var baseHue = d.hue || 0;

                  var particles = [];

                  var mouseX = -1, mouseY = -1;

                  var keyboardCursor = canvas._genKeyboardCursor || { x: W / 2, y: H / 2 };

                  keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));

                  keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));

                  canvas._genKeyboardCursor = keyboardCursor;

                  function updateGenCursor(show) {

                    var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-generative-keyboard-cursor="true"]');

                    if (cursor) {

                      var displayW = canvas.clientWidth || W;

                      var displayH = canvas.clientHeight || H;

                      cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                      cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                      cursor.style.display = show ? 'block' : 'none';

                    }

                    canvas.setAttribute('aria-label', 'Generative art canvas using ' + style + ' style with ' + density +

                      ' particles; ' + (canvas.getAttribute('data-paused') === '1' ? 'paused' : 'playing') +

                      '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                  }

                  // Simplex-like noise (simple hash-based)

                  function noise2D(x, y) {

                    var n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;

                    return n - Math.floor(n);

                  }

                  // Init particles

                  for (var i = 0; i < density; i++) {

                    particles.push({

                      x: Math.random() * W, y: Math.random() * H,

                      vx: 0, vy: 0,

                      life: Math.random() * 200 + 100,

                      maxLife: 300,

                      hue: (baseHue + Math.random() * 60) % 360,

                      size: 1 + Math.random() * 2

                    });

                  }

                  ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);

                  var tick = 0;

                  var paused = false;

                  // Pause state is refreshed before the initialization guard so the controls remain functional.

                  function burstAt(x, y) {

                    mouseX = x; mouseY = y;

                    for (var bi = 0; bi < 30; bi++) {

                      var angle = Math.random() * Math.PI * 2;

                      var speed = 1 + Math.random() * 3;

                      particles.push({

                        x: mouseX, y: mouseY,

                        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,

                        life: 150 + Math.random() * 100, maxLife: 250,

                        hue: (baseHue + Math.random() * 120) % 360,

                        size: 1 + Math.random() * 3

                      });

                    }

                  }

                  canvas.onmousedown = canvas.ontouchstart = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                    burstAt(mouseX, mouseY);

                  };

                  canvas.onmousemove = canvas.ontouchmove = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onfocus = function() { updateGenCursor(true); };

                  canvas.onblur = function() { updateGenCursor(false); };

                  canvas.onkeydown = function(event) {

                    var step = event.altKey ? 1 : 10;

                    var moved = true;

                    if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                    else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                    else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                    else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                    else if (event.key === 'Home') { keyboardCursor.x = W / 2; keyboardCursor.y = H / 2; }

                    else moved = false;

                    if (moved) {

                      event.preventDefault();

                      canvas._genKeyboardCursor = keyboardCursor;

                      if (event.shiftKey) burstAt(keyboardCursor.x, keyboardCursor.y);

                      updateGenCursor(true);

                      if (typeof announceToSR === 'function') announceToSR((event.shiftKey ? 'Created particle burst at' : 'Generative cursor') +

                        ' x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                      return;

                    }

                    if (event.key === 'Enter' || event.key === ' ') {

                      event.preventDefault(); burstAt(keyboardCursor.x, keyboardCursor.y);

                      if (typeof announceToSR === 'function') announceToSR('Created particle burst at x ' +

                        Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                    }

                  };

                  updateGenCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                  function animate() {

                    if (canvas.getAttribute('data-paused') === '1') {

                      if (canvas.isConnected) canvas._genAnim = requestAnimationFrame(animate);

                      return;

                    }

                    tick++;

                    // Fade trail

                    ctx.fillStyle = 'rgba(10,10,26,0.04)';

                    ctx.fillRect(0, 0, W, H);

                    ctx.globalCompositeOperation = 'lighter';

                    for (var i = particles.length - 1; i >= 0; i--) {

                      var p = particles[i];

                      p.life--;

                      if (p.life <= 0) { particles.splice(i, 1); continue; }

                      var alpha = Math.min(1, p.life / 50);

                      if (style === 'flow') {

                        var angle = noise2D(p.x * 0.005, p.y * 0.005 + tick * 0.001) * Math.PI * 4;

                        p.vx += Math.cos(angle) * 0.3; p.vy += Math.sin(angle) * 0.3;

                        p.vx *= 0.96; p.vy *= 0.96;

                      } else if (style === 'rain') {

                        p.vy += 0.05;

                        p.vx += (Math.random() - 0.5) * 0.1;

                        if (p.y > H) { p.y = 0; p.x = Math.random() * W; p.vy = 0; p.life = p.maxLife; }

                      } else if (style === 'stars') {

                        var scx = W / 2, scy = H / 2;

                        var sdx = p.x - scx, sdy = p.y - scy;

                        var sdist = Math.sqrt(sdx * sdx + sdy * sdy) + 0.01;

                        p.vx += sdx / sdist * 0.1; p.vy += sdy / sdist * 0.1;

                        if (sdist > Math.max(W, H) * 0.7) { p.x = scx + (Math.random() - 0.5) * 20; p.y = scy + (Math.random() - 0.5) * 20; p.vx = 0; p.vy = 0; p.life = p.maxLife; }

                      } else if (style === 'aurora') {

                        p.vx += Math.sin(p.y * 0.01 + tick * 0.02) * 0.2;

                        p.vy += (Math.random() - 0.5) * 0.05 - 0.02;

                        if (p.y < 0 || p.x < 0 || p.x > W) { p.x = Math.random() * W; p.y = H * 0.7 + Math.random() * H * 0.3; p.vx = 0; p.vy = 0; p.life = p.maxLife; }

                        p.hue = (120 + Math.sin(p.x * 0.01) * 60 + tick * 0.5) % 360;

                      }

                      p.x += p.vx; p.y += p.vy;

                      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);

                      ctx.fillStyle = 'hsla(' + p.hue + ',90%,60%,' + (alpha * 0.8) + ')';

                      ctx.fill();

                      // Glow effect

                      if (p.size > 1.5) {

                        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);

                        ctx.fillStyle = 'hsla(' + p.hue + ',80%,50%,' + (alpha * 0.08) + ')';

                        ctx.fill();

                      }

                    }

                    ctx.globalCompositeOperation = 'source-over';

                    // Replenish particles

                    while (particles.length < density * 0.7) {

                      particles.push({

                        x: style === 'stars' ? W / 2 + (Math.random() - 0.5) * 20 : Math.random() * W,

                        y: style === 'rain' ? 0 : style === 'aurora' ? H * 0.7 + Math.random() * H * 0.3 : Math.random() * H,

                        vx: 0, vy: 0,

                        life: 200 + Math.random() * 100, maxLife: 300,

                        hue: (baseHue + Math.random() * 60) % 360,

                        size: 1 + Math.random() * 2

                      });

                    }

                    if (canvas.isConnected) canvas._genAnim = requestAnimationFrame(animate);

                  }

                  animate();

                }

              }),

              React.createElement("span", {
                "data-generative-keyboard-cursor": "true",
                "aria-hidden": "true",
                className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#c026d3]",
                style: { display: 'none' }
              }),

              React.createElement("p", { id: "artstudio-generative-keyboard-help", className: "text-[11px] text-center text-slate-600 italic mt-1" }, "Click the canvas to create a particle burst. Keyboard: Arrow keys move the cursor; Space or Enter creates a burst; Shift with an Arrow key moves and creates a burst; Home returns to center; Alt makes one-pixel moves.")

            ),

            // ═══ SPIN ART TAB ═══

            tab === 'spinArt' && React.createElement("div", { className: "relative space-y-3" },

              React.createElement("div", { className: "flex items-center gap-2 mb-2 flex-wrap", role: "group", "aria-label": "Spin art controls" },

                React.createElement("label", { htmlFor: "artstudio-spin-rpm", className: "text-xs font-bold text-slate-600" }, __alloT('stem.artstudio.rpm', "\uD83C\uDF00 RPM:")),

                React.createElement("input", { id: "artstudio-spin-rpm", type: "range", min: 20, max: 300, value: d.spinRPM || 120, "aria-describedby": "artstudio-spin-rpm-value", onChange: function (e) { upd('spinRPM', parseInt(e.target.value)); }, className: "w-28 max-w-full accent-orange-600" }),

                React.createElement("span", { id: "artstudio-spin-rpm-value", className: "text-[11px] text-slate-600 font-bold" }, (d.spinRPM || 120) + ' rpm'),

                React.createElement("label", { htmlFor: "artstudio-spin-brush", className: "text-xs font-bold text-slate-600 ml-2" }, "Brush:"),

                React.createElement("input", { id: "artstudio-spin-brush", type: "range", min: 2, max: 20, value: d.spinBrush || 6, "aria-describedby": "artstudio-spin-brush-value", onChange: function (e) { upd('spinBrush', parseInt(e.target.value)); }, className: "w-20 max-w-full accent-orange-600" }),

                React.createElement("span", { id: "artstudio-spin-brush-value", className: "text-[11px] text-slate-600 font-bold" }, (d.spinBrush || 6) + ' pixels'),

                React.createElement("button", { "aria-label": d.spinSplatter ? "Disable paint splatter" : "Enable paint splatter", "aria-pressed": !!d.spinSplatter, onClick: function () { upd('spinSplatter', !d.spinSplatter); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.spinSplatter ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-orange-50') }, d.spinSplatter ? '\uD83D\uDCA6 Splatter \u2714' : '\uD83D\uDCA6 Splatter'),

                React.createElement("button", { "aria-label": d.spinDark ? "Switch to light canvas background" : "Switch to dark canvas background", "aria-pressed": !!d.spinDark, onClick: function () { upd('spinDark', !d.spinDark); upd('spinReset', Date.now()); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + (d.spinDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-400') }, d.spinDark ? '\uD83C\uDF11 Dark' : '\u2B1C Light'),

                React.createElement("button", {
                  "aria-label": (d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? "Resume spin art animation" : "Pause spin art animation",
                  "aria-pressed": d.spinPaused === undefined ? reducedMotion : !!d.spinPaused,
                  onClick: function () {
                    var isPaused = d.spinPaused === undefined ? reducedMotion : !!d.spinPaused;
                    upd('spinPaused', !isPaused);
                    if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Spin art animation resumed.' : 'Spin art animation paused.');
                  },
                  className: "px-2 py-1 rounded-lg text-[11px] font-bold " + ((d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
                }, (d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? '\u25B6 Resume' : '\u23F8 Pause'),

                React.createElement("button", { onClick: function () { upd('spinReset', Date.now()); }, className: "transition-colors ml-auto px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_7', "\uD83D\uDDD1 Clear")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_6', "Export PNG"), onClick: function () { var c = document.getElementById('spinCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'spin-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_png_7', "\uD83D\uDCE5 Export PNG"))

              ),

              React.createElement("div", { className: "bg-slate-50 rounded-xl p-2 border border-slate-400" },

                React.createElement("div", { className: "flex items-center gap-2 mb-1.5 flex-wrap" },

                  React.createElement("span", { id: "artstudio-spin-palettes-label", className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider" }, __alloT('stem.artstudio.palettes_3', "\uD83C\uDFA8 Palettes")),

                  React.createElement("div", { className: "contents", role: "group", "aria-labelledby": "artstudio-spin-palettes-label" },

                    [{ id: 'retro', label: __alloT('stem.artstudio.retro_3', '\uD83D\uDD79 Retro') }, { id: 'nature', label: __alloT('stem.artstudio.nature_3', '\uD83C\uDF3F Nature') }, { id: 'warm', label: __alloT('stem.artstudio.warm_3', '\uD83D\uDD25 Warm') }, { id: 'cool', label: __alloT('stem.artstudio.cool_3', '\u2744 Cool') }, { id: 'neon', label: __alloT('stem.artstudio.neon_3', '\uD83D\uDCA5 Neon') }].map(function (pal) {

                      return React.createElement("button", { "aria-label": "Use " + pal.label + " palette", "aria-pressed": (d.activePalette || 'retro') === pal.id, key: pal.id, onClick: function () { upd('activePalette', pal.id); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.activePalette || 'retro') === pal.id ? 'bg-orange-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-orange-50') }, pal.label);

                    })

                  )

                ),

                React.createElement("div", { className: "flex gap-1 flex-wrap" },

                  (function () {

                    var palettes = { retro: [[0,85,45],[30,90,55],[55,90,55],[120,60,40],[200,70,50],[240,60,35],[280,70,45],[0,0,15],[0,0,85],[30,20,70]], nature: [[85,50,35],[100,40,45],[120,55,30],[140,60,40],[45,70,45],[30,60,35],[20,50,30],[195,50,50],[210,40,60],[40,30,70]], warm: [[0,80,50],[10,85,55],[20,90,55],[35,95,55],[45,90,55],[350,70,45],[15,70,40],[40,80,65],[5,60,35],[25,50,70]], cool: [[195,70,50],[210,65,55],[225,60,50],[240,55,45],[180,50,40],[200,80,60],[170,45,50],[260,50,55],[190,40,65],[220,30,70]], neon: [[330,100,55],[300,100,55],[280,100,60],[200,100,55],[170,100,50],[120,100,45],[60,100,50],[30,100,55],[0,100,50],[45,100,55]] };

                    var activePal = palettes[d.activePalette || 'retro'] || palettes.retro;

                    return activePal.map(function (c, i) {

                      return React.createElement("button", { "aria-label": "Select color HSL " + c[0] + ", " + c[1] + " percent saturation, " + c[2] + " percent lightness", "aria-pressed": d.hue === c[0] && d.sat === c[1] && d.lit === c[2], key: i, onClick: function () { upd('hue', c[0]); upd('sat', c[1]); upd('lit', c[2]); }, className: "rounded-md border-2 transition-all hover:scale-110 focus-visible:ring-4 focus-visible:ring-orange-600 focus-visible:ring-offset-2", style: { width: 28, height: 28, background: 'hsl(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)', borderColor: (d.hue === c[0] && d.sat === c[1] && d.lit === c[2]) ? '#c2410c' : '#64748b', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }, title: 'HSL(' + c[0] + ',' + c[1] + '%,' + c[2] + '%)' });

                    });

                  })()

                )

              ),

              React.createElement("canvas", { tabIndex: 0, id: 'spinCanvas', key: 'spin-' + (d.spinReset || 0), width: 512, height: 512, role: "img",
                'aria-label': 'Spin art canvas at ' + (d.spinRPM || 120) + ' RPM with a ' + (d.spinBrush || 6) + '-pixel brush; ' + ((d.spinPaused === undefined ? reducedMotion : !!d.spinPaused) ? 'paused' : 'playing') + '.',
                'aria-describedby': "artstudio-spin-keyboard-help",
                'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",
                className: "rounded-full border-4 border-orange-300 shadow-lg cursor-crosshair mx-auto block mt-3 focus-visible:ring-4 focus-visible:ring-orange-600 focus-visible:ring-offset-2",
                style: { maxWidth: '100%', background: d.spinDark ? '#0f172a' : '#fefefe' },

                ref: function (canvas) {

                  if (!canvas) return;

                  // Always sync current controls to canvas data attributes (runs on every render).
                  var spinPaused = d.spinPaused === undefined ? reducedMotion : !!d.spinPaused;
                  canvas.dataset.hue = d.hue === undefined ? 0 : d.hue;
                  canvas.dataset.sat = d.sat === undefined ? 100 : d.sat;
                  canvas.dataset.lit = d.lit === undefined ? 50 : d.lit;
                  canvas.dataset.rpm = d.spinRPM || 120;
                  canvas.dataset.brush = d.spinBrush || 6;
                  canvas.dataset.splatter = d.spinSplatter ? '1' : '0';
                  canvas.dataset.paused = spinPaused ? '1' : '0';
                  canvas.setAttribute('aria-label', 'Spin art canvas at ' + (d.spinRPM || 120) + ' RPM with a ' +
                    (d.spinBrush || 6) + '-pixel brush; ' + (spinPaused ? 'paused' : 'playing') + '.');

                  if (canvas._spinInit) return;

                  canvas._spinInit = true;

                  var ctx = canvas.getContext('2d');

                  var W = canvas.width, H = canvas.height;

                  var cx = W / 2, cy = H / 2;

                  var isDark = d.spinDark || false;

                  var baseSat = d.sat === undefined ? 100 : d.sat;

                  var baseLit = d.lit === undefined ? 50 : d.lit;




                  ctx.fillStyle = isDark ? '#0f172a' : '#fefefe';

                  ctx.fillRect(0, 0, W, H);

                  var angle = 0;

                  var drips = [];

                  var mouseDown = false, mouseX = cx, mouseY = cy;

                  var keyboardCursor = canvas._spinKeyboardCursor || { x: cx, y: cy };

                  canvas._spinKeyboardCursor = keyboardCursor;

                  function updateSpinCursor(show) {

                    var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-spin-keyboard-cursor="true"]');

                    if (cursor) {

                      var displayW = canvas.clientWidth || W, displayH = canvas.clientHeight || H;

                      cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                      cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                      cursor.style.display = show ? 'block' : 'none';

                    }

                    canvas.setAttribute('aria-label', 'Spin art canvas at ' + canvas.dataset.rpm + ' RPM with a ' +

                      canvas.dataset.brush + '-pixel brush; ' + (canvas.dataset.paused === '1' ? 'paused' : 'playing') +

                      '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                  }

                  canvas.onmousedown = canvas.ontouchstart = function (e) {

                    mouseDown = true;

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onmousemove = canvas.ontouchmove = function (e) {

                    var rect = canvas.getBoundingClientRect();

                    mouseX = ((e.touches ? e.touches[0].clientX : e.clientX) - rect.left) * (W / rect.width);

                    mouseY = ((e.touches ? e.touches[0].clientY : e.clientY) - rect.top) * (H / rect.height);

                  };

                  canvas.onmouseup = canvas.ontouchend = function () { mouseDown = false; };

                  canvas.onmouseleave = function () { mouseDown = false; };

                  canvas.onfocus = function () { updateSpinCursor(true); };

                  canvas.onblur = function () { updateSpinCursor(false); };

                  canvas.onkeydown = function (event) {

                    var step = event.altKey ? 1 : 10, moved = true;

                    if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                    else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                    else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                    else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                    else if (event.key === 'Home') { keyboardCursor.x = cx; keyboardCursor.y = cy; }

                    else moved = false;

                    if (moved) {

                      event.preventDefault();

                      canvas._spinKeyboardCursor = keyboardCursor;

                      if (event.shiftKey) spawnDrip(keyboardCursor.x, keyboardCursor.y);

                      updateSpinCursor(true);

                      if (typeof announceToSR === 'function') announceToSR((event.shiftKey ? 'Added paint at' : 'Spin art cursor') +

                        ' x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                    } else if (event.key === 'Enter' || event.key === ' ') {

                      event.preventDefault();

                      spawnDrip(keyboardCursor.x, keyboardCursor.y);

                      if (typeof announceToSR === 'function') announceToSR('Added paint at x ' +

                        Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                    }

                  };

                  updateSpinCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                  function spawnDrip(x, y) {

                    var curHue = parseFloat(canvas.dataset.hue) || 0;
                    var curSat = parseFloat(canvas.dataset.sat);
                    var curLit = parseFloat(canvas.dataset.lit);
                    var currentBrush = parseFloat(canvas.dataset.brush) || 6;
                    var currentSplatter = canvas.dataset.splatter === '1';
                    var count = currentSplatter ? 5 + Math.floor(Math.random() * 8) : 1;

                    for (var i = 0; i < count; i++) {

                      var ox = currentSplatter ? (Math.random() - 0.5) * 30 : 0;

                      var oy = currentSplatter ? (Math.random() - 0.5) * 30 : 0;

                      drips.push({ x: x + ox, y: y + oy, vx: 0, vy: 0, life: 200 + Math.random() * 150, size: currentSplatter ? 1 + Math.random() * currentBrush : currentBrush * 0.6, hue: curHue + (currentSplatter ? Math.random() * 30 - 15 : 0), sat: curSat, lit: curLit });

                    }

                  }

                  function animate() {

                    if (canvas.dataset.paused === '1') {

                      if (canvas.isConnected) canvas._spinAnim = requestAnimationFrame(animate);

                      return;

                    }

                    var rpm = parseFloat(canvas.dataset.rpm) || 120;

                    var radPerFrame = (rpm / 60) * (Math.PI * 2) / 60;

                    angle += radPerFrame;

                    if (mouseDown) spawnDrip(mouseX, mouseY);

                    ctx.save();

                    ctx.translate(cx, cy);

                    ctx.rotate(angle);

                    ctx.translate(-cx, -cy);

                    for (var i = drips.length - 1; i >= 0; i--) {

                      var dr = drips[i];

                      dr.life--;

                      if (dr.life <= 0) { drips.splice(i, 1); continue; }

                      var dx = dr.x - cx, dy = dr.y - cy;

                      var dist = Math.sqrt(dx * dx + dy * dy);

                      if (dist > 1) {

                        var centrifugal = rpm * 0.00015;

                        dr.vx += (dx / dist) * centrifugal * dist;

                        dr.vy += (dy / dist) * centrifugal * dist;

                      }

                      dr.vx *= 0.98; dr.vy *= 0.98;

                      dr.x += dr.vx; dr.y += dr.vy;

                      var alpha = Math.min(1, dr.life / 60);

                      ctx.globalAlpha = alpha * 0.85;

                      ctx.beginPath();

                      ctx.arc(dr.x, dr.y, dr.size, 0, Math.PI * 2);

                      ctx.fillStyle = 'hsl(' + Math.round(dr.hue) + ',' + (dr.sat || baseSat) + '%,' + (dr.lit || baseLit) + '%)';

                      ctx.fill();

                      if (dist > W * 0.48) { drips.splice(i, 1); }

                    }

                    ctx.restore();

                    if (canvas.isConnected) canvas._spinAnim = requestAnimationFrame(animate);

                  }

                  animate();

                }

              }),

              React.createElement("span", {
                "data-spin-keyboard-cursor": "true",
                "aria-hidden": "true",
                className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#c2410c]",
                style: { display: 'none' }
              }),

              React.createElement("p", { id: "artstudio-spin-keyboard-help", className: "text-[11px] text-center text-slate-600 italic mt-1" }, "Click and drag to drip paint. Keyboard: Arrow keys move the cursor; Space or Enter adds paint; Shift with an Arrow key moves and adds paint; Home returns to center; Alt makes one-pixel moves."),

              React.createElement("div", { className: "mt-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-4 border border-orange-200" },

                React.createElement("button", { "aria-expanded": !!d.showSpinInfo, "aria-controls": "artstudio-spin-physics", onClick: function () { upd('showSpinInfo', !d.showSpinInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-orange-700" },

                  React.createElement("span", null, __alloT('stem.artstudio.physics_of_spin_art', "\uD83C\uDF00 Physics of Spin Art")),

                  React.createElement("span", { "aria-hidden": "true" }, d.showSpinInfo ? '\u25B2' : '\u25BC')

                ),

                d.showSpinInfo && React.createElement("div", { id: "artstudio-spin-physics", className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                  React.createElement("p", null, "\uD83C\uDF00 ", React.createElement("strong", null, __alloT('stem.artstudio.centrifugal_effect', "Centrifugal effect:")), __alloT('stem.artstudio.in_a_spinning_reference_frame_objects_', " In a spinning reference frame, objects experience an outward pseudo-force proportional to their distance from the center and the square of angular velocity (\u03C9\u00B2r).")),

                  React.createElement("p", null, "\uD83D\uDCA7 ", React.createElement("strong", null, __alloT('stem.artstudio.paint_behavior', "Paint behavior:")), __alloT('stem.artstudio.real_spin_art_uses_centripetal_acceler', " Real spin art uses centripetal acceleration to spread paint. Thinner paint flies outward faster; thicker paint creates shorter, more controlled trails.")),

                  React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, __alloT('stem.artstudio.why_it_s_beautiful', "Why it\u2019s beautiful:")), __alloT('stem.artstudio.the_combination_of_rotational_motion_a', " The combination of rotational motion and paint viscosity creates natural spirals and interference patterns. No two spin paintings are ever alike \u2014 it\u2019s a form of "), React.createElement("strong", null, __alloT('stem.artstudio.chaotic_art', "chaotic art")), ".")

                )

              )

            ),

            // ═══ STRING ART TAB ═══

            tab === 'stringArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-rose-700 mb-3" }, __alloT('stem.artstudio.string_art_controls', "\uD83D\uDD78 String Art Controls")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-string-shape-label", className: "text-[11px] font-bold text-rose-700 block mb-1" }, __alloT('stem.artstudio.shape', "Shape")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-string-shape-label" },

                        [{ id: 'circle', label: __alloT('stem.artstudio.circle', '\u25CB Circle') }, { id: 'square', label: __alloT('stem.artstudio.square', '\u25A1 Square') }, { id: 'triangle', label: __alloT('stem.artstudio.triangle', '\u25B3 Triangle') }, { id: 'star', label: __alloT('stem.artstudio.star_2', '\u2606 Star') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.strShape || 'circle') === s.id, onClick: function () { upd('strShape', s.id); upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(s.label + ' string-art frame selected.'); }, className: "flex-1 min-w-[5rem] px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + ((d.strShape || 'circle') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'strNails', label: __alloT('stem.artstudio.nail_count', 'Nail Count'), min: 20, max: 200, def: 80 },

                     { k: 'strMult', label: __alloT('stem.artstudio.multiplier', 'Multiplier'), min: 2, max: 99, def: 2 },

                     { k: 'strOpacity', label: __alloT('stem.artstudio.thread_opacity', 'Thread Opacity %'), min: 5, max: 100, def: 30 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-rose-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": s.k === 'strOpacity' ? val + ' percent opacity' : val + (s.k === 'strNails' ? ' nails' : ' multiplier'), onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('strReset', Date.now()); }, className: "w-full accent-rose-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Redrawing the string art.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.redraw_string_art', "\u21BB Redraw")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_string_art_png', "Export string art as PNG"), onClick: function () { var c = document.getElementById('stringCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'string-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('String-art PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_8', "\uD83D\uDCE5 Export PNG")),

                      React.createElement("button", { "aria-label": d.strRainbow ? "Use a single thread color" : "Use a rainbow thread progression", "aria-pressed": !!d.strRainbow, onClick: function () { var nextRainbow = !d.strRainbow; upd('strRainbow', nextRainbow); upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(nextRainbow ? 'Rainbow threads enabled.' : 'Single-color threads enabled.'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + (d.strRainbow ? 'bg-gradient-to-r from-red-600 via-yellow-700 to-blue-600 text-white' : 'bg-slate-100 text-slate-700 border border-slate-400 hover:bg-rose-50') }, d.strRainbow ? '\uD83C\uDF08 Rainbow \u2714' : '\uD83C\uDF08 Rainbow')

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-string-presets-label" },

                      React.createElement("span", { id: "artstudio-string-presets-label", className: "text-[11px] font-bold text-rose-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.cardioid', 'Cardioid'), nails: 100, mult: 2 }, { label: __alloT('stem.artstudio.nephroid', 'Nephroid'), nails: 100, mult: 3 }, { label: __alloT('stem.artstudio.star_burst', 'Star Burst'), nails: 72, mult: 37 }, { label: __alloT('stem.artstudio.lace_2', 'Lace'), nails: 150, mult: 71 }, { label: __alloT('stem.artstudio.weave', 'Weave'), nails: 60, mult: 23 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' string-art preset', onClick: function () { upd('strNails', pr.nails); upd('strMult', pr.mult); upd('strReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(pr.label + ' string-art preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-700 border border-rose-600 hover:bg-rose-50 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-pink-50 to-fuchsia-50 rounded-xl p-3 border border-pink-200" },

                    React.createElement("p", { className: "text-[11px] font-bold text-pink-700 mb-1" }, __alloT('stem.artstudio.math_connection_2', "\uD83D\uDCDA Math Connection")),

                    React.createElement("p", { id: "artstudio-string-description", className: "text-[11px] text-slate-700 leading-relaxed" }, __alloT('stem.artstudio.string_art_creates', "String art creates "), React.createElement("strong", null, __alloT('stem.artstudio.envelope_curves', "envelope curves")), __alloT('stem.artstudio.from_straight_lines_with_a_circle_and_', " from straight lines. With a circle and multiplier of 2, you get a "), React.createElement("strong", null, "cardioid"), __alloT('stem.artstudio.the_heart_shaped_curve_seen_in_coffee_', " \u2014 the heart-shaped curve seen in coffee cups. Multiplier 3 makes a "), React.createElement("strong", null, "nephroid"), __alloT('stem.artstudio.higher_multipliers_create_intricate_pa', ". Higher multipliers create intricate patterns governed by "), React.createElement("strong", null, __alloT('stem.artstudio.modular_arithmetic', "modular arithmetic")), __alloT('stem.artstudio.nail_n_connects_to_nail_n_m_mod_total', ": nail N connects to nail (N \u00D7 M) mod total."))

                  )

                ),

                React.createElement("canvas", { id: 'stringCanvas', key: 'str-' + (d.strReset || 0), width: 512, height: 512, role: "img", "aria-describedby": "artstudio-string-description", 'aria-label': 'String-art output: ' + (typeof d.strNails === 'number' ? d.strNails : 80) + ' nails arranged on a ' + (d.strShape || 'circle') + ' frame, connected with multiplier ' + (typeof d.strMult === 'number' ? d.strMult : 2) + ' using ' + (d.strRainbow ? 'rainbow' : 'single-color') + ' threads at ' + (typeof d.strOpacity === 'number' ? d.strOpacity : 30) + ' percent opacity.', className: "rounded-xl border-2 border-rose-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: 'var(--allo-stem-canvas, #0f172a)' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._strInit) return;

                    canvas._strInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var R = Math.min(W, H) * 0.42;

                    var nails = typeof d.strNails === 'number' ? d.strNails : 80;

                    var mult = typeof d.strMult === 'number' ? d.strMult : 2;

                    var opacity = typeof d.strOpacity === 'number' ? d.strOpacity : 30;

                    var rainbow = d.strRainbow;

                    var shape = d.strShape || 'circle';

                    var baseHue = d.hue || 0;

                    var baseSat = d.sat || 100;

                    var baseLit = d.lit || 50;

                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    // Compute nail positions based on shape

                    var nailPos = [];

                    for (var i = 0; i < nails; i++) {

                      var t = i / nails;

                      if (shape === 'circle') {

                        var ang = t * Math.PI * 2 - Math.PI / 2;

                        nailPos.push([cx + Math.cos(ang) * R, cy + Math.sin(ang) * R]);

                      } else if (shape === 'square') {

                        var side = Math.floor(t * 4) % 4;

                        var frac = (t * 4) % 1;

                        var half = R;

                        if (side === 0) nailPos.push([cx - half + frac * 2 * half, cy - half]);

                        else if (side === 1) nailPos.push([cx + half, cy - half + frac * 2 * half]);

                        else if (side === 2) nailPos.push([cx + half - frac * 2 * half, cy + half]);

                        else nailPos.push([cx - half, cy + half - frac * 2 * half]);

                      } else if (shape === 'triangle') {

                        var side2 = Math.floor(t * 3) % 3;

                        var frac2 = (t * 3) % 1;

                        var triR = R;

                        var pts = [[cx, cy - triR], [cx + triR * Math.cos(Math.PI / 6), cy + triR * Math.sin(Math.PI / 6)], [cx - triR * Math.cos(Math.PI / 6), cy + triR * Math.sin(Math.PI / 6)]];

                        var p1 = pts[side2], p2 = pts[(side2 + 1) % 3];

                        nailPos.push([p1[0] + (p2[0] - p1[0]) * frac2, p1[1] + (p2[1] - p1[1]) * frac2]);

                      } else if (shape === 'star') {

                        var starPts = 5;

                        var segTotal = starPts * 2;

                        var seg = Math.floor(t * segTotal) % segTotal;

                        var frac3 = (t * segTotal) % 1;

                        var outerR = R, innerR = R * 0.4;

                        var allPts = [];

                        for (var si = 0; si < starPts; si++) {

                          var oAng = (si / starPts) * Math.PI * 2 - Math.PI / 2;

                          var iAng = ((si + 0.5) / starPts) * Math.PI * 2 - Math.PI / 2;

                          allPts.push([cx + Math.cos(oAng) * outerR, cy + Math.sin(oAng) * outerR]);

                          allPts.push([cx + Math.cos(iAng) * innerR, cy + Math.sin(iAng) * innerR]);

                        }

                        var sp1 = allPts[seg], sp2 = allPts[(seg + 1) % allPts.length];

                        nailPos.push([sp1[0] + (sp2[0] - sp1[0]) * frac3, sp1[1] + (sp2[1] - sp1[1]) * frac3]);

                      }

                    }

                    // Draw nail dots

                    ctx.fillStyle = 'rgba(255,255,255,0.15)';

                    nailPos.forEach(function (np) { ctx.beginPath(); ctx.arc(np[0], np[1], 1.5, 0, Math.PI * 2); ctx.fill(); });

                    // Animate strings

                    var lineIdx = 0;

                    ctx.lineWidth = 1;

                    ctx.lineCap = 'round';

                    ctx.globalCompositeOperation = 'lighter';

                    function announceStringComplete() {

                      if (canvas._strDone) return;

                      canvas._strDone = true;

                      if (typeof announceToSR === 'function') announceToSR('String-art drawing complete.');

                    }

                    function drawStep() {

                      if (lineIdx >= nails) { announceStringComplete(); return; }

                      var batchSize = reducedMotion ? nails : Math.max(1, Math.floor(nails / 80));

                      for (var b = 0; b < batchSize && lineIdx < nails; b++, lineIdx++) {

                        var from = nailPos[lineIdx];

                        var toIdx = (lineIdx * mult) % nails;

                        var to = nailPos[toIdx];

                        var hue = rainbow ? Math.round((lineIdx / nails) * 360) % 360 : baseHue;

                        ctx.strokeStyle = 'hsla(' + hue + ',' + baseSat + '%,' + baseLit + '%,' + (opacity / 100) + ')';

                        ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.lineTo(to[0], to[1]); ctx.stroke();

                      }

                      if (lineIdx < nails && canvas.isConnected) canvas._strAnim = requestAnimationFrame(drawStep);

                      else announceStringComplete();

                    }

                    drawStep();

                  }

                })

              )

            ),

            // ═══ OP ART TAB ═══

            tab === 'opArt' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-fuchsia-50 to-purple-50 rounded-xl p-4 border border-fuchsia-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-fuchsia-700 mb-3" }, __alloT('stem.artstudio.op_art_controls', "\uD83D\uDC41 Op Art Controls")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-op-style-label", className: "text-[11px] font-bold text-fuchsia-700 block mb-1" }, __alloT('stem.artstudio.style_2', "Style")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-op-style-label" },

                        [{ id: 'concentric', label: __alloT('stem.artstudio.rings', '\u25CE Rings') }, { id: 'checkerboard', label: __alloT('stem.artstudio.checker', '\u2593 Checker') }, { id: 'moire', label: __alloT('stem.artstudio.moir', '\u2261 Moir\u00E9') }, { id: 'vibrating', label: __alloT('stem.artstudio.vibrate', '\u2248 Vibrate') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.opStyle || 'concentric') === s.id, onClick: function () { upd('opStyle', s.id); if (typeof announceToSR === 'function') announceToSR(s.label + ' Op Art style selected.'); }, className: "flex-1 min-w-[5rem] px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 " + ((d.opStyle || 'concentric') === s.id ? 'bg-fuchsia-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-fuchsia-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'opSpeed', label: __alloT('stem.artstudio.speed', 'Speed'), min: 1, max: 20, def: 5 },

                     { k: 'opDensity', label: __alloT('stem.artstudio.density', 'Density'), min: 3, max: 60, def: 20 },

                     { k: 'opHueA', label: __alloT('stem.artstudio.color_a_hue', 'Color A Hue'), min: 0, max: 360, def: 0 },

                     { k: 'opHueB', label: __alloT('stem.artstudio.color_b_hue', 'Color B Hue'), min: 0, max: 360, def: 180 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-fuchsia-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": s.k === 'opSpeed' ? val + ' animation speed' : s.k === 'opDensity' ? val + ' pattern density' : val + ' degrees hue', onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-fuchsia-600" })

                      );

                    }),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": (d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? "Resume Op Art animation" : "Pause Op Art animation", "aria-describedby": "artstudio-op-motion-status", onClick: function () { var isPaused = d.opPaused === undefined ? reducedMotion : !!d.opPaused; upd('opPaused', !isPaused); if (typeof announceToSR === 'function') announceToSR(isPaused ? 'Op Art animation resumed.' : 'Op Art animation paused.'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2 " + ((d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? 'bg-green-50 text-green-700 border border-green-600 hover:bg-green-100' : 'bg-amber-50 text-amber-800 border border-amber-600 hover:bg-amber-100') }, (d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? '\u25B6 Resume' : '\u23F8 Pause'),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_op_art_png', "Export Op Art as PNG"), onClick: function () { var c = document.getElementById('opArtCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'op-art-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Op Art PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_10', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-op-presets-label" },

                      React.createElement("span", { id: "artstudio-op-presets-label", className: "text-[11px] font-bold text-fuchsia-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.classic_b_w', 'Classic B&W'), style: 'concentric', hA: 0, hB: 0, density: 25, speed: 4 },

                       { label: __alloT('stem.artstudio.neon_pulse', 'Neon Pulse'), style: 'concentric', hA: 280, hB: 160, density: 15, speed: 8 },

                       { label: __alloT('stem.artstudio.spiral_vortex', 'Spiral Vortex'), style: 'moire', hA: 200, hB: 30, density: 40, speed: 6 },

                       { label: __alloT('stem.artstudio.wave_grid', 'Wave Grid'), style: 'checkerboard', hA: 10, hB: 190, density: 20, speed: 5 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' Op Art preset', onClick: function () { upd('opStyle', pr.style); upd('opHueA', pr.hA); upd('opHueB', pr.hB); upd('opDensity', pr.density); upd('opSpeed', pr.speed); if (typeof announceToSR === 'function') announceToSR(pr.label + ' Op Art preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-fuchsia-700 border border-fuchsia-600 hover:bg-fuchsia-50 transition-all focus-visible:ring-2 focus-visible:ring-fuchsia-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    ),

                    React.createElement("p", { id: "artstudio-op-motion-status", className: "mt-3 text-[11px] text-fuchsia-700 leading-relaxed" }, ((d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? 'Animation paused. ' : 'Animation running. ') + 'Use the pause or resume button to control motion; reduced-motion preferences start this view paused.')

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("button", { id: "artstudio-op-info-toggle", "aria-expanded": !!d.showOpInfo, "aria-controls": "artstudio-op-info", onClick: function () { upd('showOpInfo', !d.showOpInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_science_of_op_art', "\uD83E\uDDE0 The Science of Op Art")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showOpInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showOpInfo && React.createElement("div", { id: "artstudio-op-info", role: "region", "aria-labelledby": "artstudio-op-info-toggle", className: "mt-3 space-y-2 text-xs text-slate-700 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDC41 ", React.createElement("strong", null, __alloT('stem.artstudio.op_art_3', "Op Art")), __alloT('stem.artstudio.optical_art_emerged_in_the_1960s_pione', " (Optical Art) emerged in the 1960s, pioneered by "), React.createElement("strong", null, __alloT('stem.artstudio.bridget_riley', "Bridget Riley")), " and ", React.createElement("strong", null, __alloT('stem.artstudio.victor_vasarely', "Victor Vasarely")), __alloT('stem.artstudio.it_exploits_the_mechanics_of_human_vis', ". It exploits the mechanics of human vision to create illusions of movement, vibration, and depth on flat surfaces.")),

                      React.createElement("p", null, "\u2728 ", React.createElement("strong", null, __alloT('stem.artstudio.moir_patterns', "Moir\u00E9 patterns")), __alloT('stem.artstudio.appear_when_two_regular_grids_overlap_', " appear when two regular grids overlap at slight angles. Your brain can\u2019t resolve the conflicting patterns, creating phantom curves and waves. This same effect causes the \u201Cscreen door\u201D shimmer on some fabrics.")),

                      React.createElement("p", null, "\uD83C\uDF08 ", React.createElement("strong", null, __alloT('stem.artstudio.vibrating_colors', "Vibrating colors")), __alloT('stem.artstudio.occur_when_highly_saturated_complement', " occur when highly saturated complementary colors sit side by side. Your eye\u2019s color receptors compete, creating a buzzing, unstable edge\u2014this is called "), React.createElement("strong", null, __alloT('stem.artstudio.chromatic_vibration', "chromatic vibration")), "."),

                      React.createElement("p", null, "\uD83E\uDDE0 ", React.createElement("strong", null, __alloT('stem.artstudio.persistence_of_vision', "Persistence of vision")), " and ", React.createElement("strong", null, __alloT('stem.artstudio.lateral_inhibition', "lateral inhibition")), __alloT('stem.artstudio.in_the_retina_are_the_main_perceptual_', " in the retina are the main perceptual mechanisms. Concentric ring patterns trigger involuntary eye saccades, making the artwork seem to breathe and pulse."))

                    )

                  )

                ),

                React.createElement("canvas", { id: 'opArtCanvas', width: 512, height: 512, role: "img", "aria-describedby": "artstudio-op-motion-status", 'aria-label': 'Op Art output: ' + ((d.opStyle || 'concentric') === 'concentric' ? 'concentric rings' : (d.opStyle || 'concentric') === 'checkerboard' ? 'a warped checkerboard grid' : (d.opStyle || 'concentric') === 'moire' ? 'overlapping Moire line fields' : 'vibrating wavy stripes') + ' at density ' + (typeof d.opDensity === 'number' ? d.opDensity : 20) + ' and speed ' + (typeof d.opSpeed === 'number' ? d.opSpeed : 5) + ', ' + ((d.opPaused === undefined ? reducedMotion : !!d.opPaused) ? 'paused' : 'animating') + '.', className: "rounded-xl border-2 border-fuchsia-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#0a0a0a' },

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._opAnim) cancelAnimationFrame(canvas._opAnim);

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var cx = W / 2, cy = H / 2;

                    var tick = 0;

                    var style = d.opStyle || 'concentric';

                    var speed = typeof d.opSpeed === 'number' ? d.opSpeed : 5;

                    var density = typeof d.opDensity === 'number' ? d.opDensity : 20;

                    var hueA = typeof d.opHueA === 'number' ? d.opHueA : 0;

                    var hueB = typeof d.opHueB === 'number' ? d.opHueB : 180;

                    var paused = d.opPaused === undefined ? reducedMotion : !!d.opPaused;

                    var isMonochrome = (hueA === 0 && hueB === 0);

                    var colA = isMonochrome ? '#000000' : 'hsl(' + hueA + ',85%,50%)';

                    var colB = isMonochrome ? '#ffffff' : 'hsl(' + hueB + ',85%,50%)';



                    function drawFrame() {

                      if (!paused) tick++;

                      ctx.clearRect(0, 0, W, H);



                      if (style === 'concentric') {

                        var maxR = Math.sqrt(cx * cx + cy * cy);

                        var ringWidth = maxR / density;

                        var offset = (tick * speed * 0.3) % (ringWidth * 2);

                        for (var r = maxR + ringWidth; r > 0; r -= ringWidth) {

                          var rr = r - offset;

                          if (rr < 0) rr += ringWidth * 2;

                          ctx.beginPath();

                          ctx.arc(cx, cy, Math.abs(rr), 0, Math.PI * 2);

                          ctx.fillStyle = (Math.round(r / ringWidth) % 2 === 0) ? colA : colB;

                          ctx.fill();

                        }

                        // Add subtle rotation warp

                        ctx.save();

                        ctx.globalCompositeOperation = 'overlay';

                        ctx.globalAlpha = 0.08;

                        var warpAngle = tick * speed * 0.005;

                        for (var wr = 0; wr < maxR; wr += ringWidth * 1.5) {

                          ctx.beginPath();

                          ctx.ellipse(cx, cy, wr, wr * (0.9 + Math.sin(warpAngle + wr * 0.01) * 0.1), warpAngle, 0, Math.PI * 2);

                          ctx.strokeStyle = colA; ctx.lineWidth = 2; ctx.stroke();

                        }

                        ctx.restore();



                      } else if (style === 'checkerboard') {

                        var cellSize = Math.max(8, Math.round(W / density));

                        var t = tick * speed * 0.02;

                        for (var gx = 0; gx < W; gx += cellSize) {

                          for (var gy = 0; gy < H; gy += cellSize) {

                            var dx = gx - cx, dy = gy - cy;

                            var dist = Math.sqrt(dx * dx + dy * dy);

                            var warp = Math.sin(dist * 0.015 - t) * cellSize * 0.4;

                            var wx = gx + warp * (dx / (dist || 1));

                            var wy = gy + warp * (dy / (dist || 1));

                            var col = Math.floor(gx / cellSize);

                            var row = Math.floor(gy / cellSize);

                            ctx.fillStyle = ((col + row) % 2 === 0) ? colA : colB;

                            ctx.fillRect(wx, wy, cellSize, cellSize);

                          }

                        }



                      } else if (style === 'moire') {

                        var spacing = Math.max(3, Math.round(200 / density));

                        var t2 = tick * speed * 0.003;

                        ctx.fillStyle = isMonochrome ? '#000' : 'hsl(' + hueA + ',30%,10%)';

                        ctx.fillRect(0, 0, W, H);

                        ctx.lineWidth = 1.5;

                        // Layer 1 — horizontal lines

                        ctx.strokeStyle = colB;

                        ctx.globalAlpha = 0.7;

                        for (var ly = -H; ly < H * 2; ly += spacing) {

                          ctx.beginPath();

                          ctx.moveTo(0, ly);

                          ctx.lineTo(W, ly);

                          ctx.stroke();

                        }

                        // Layer 2 — rotated lines

                        ctx.save();

                        ctx.translate(cx, cy);

                        ctx.rotate(t2);

                        ctx.strokeStyle = colA;

                        for (var ly2 = -W * 2; ly2 < W * 2; ly2 += spacing) {

                          ctx.beginPath();

                          ctx.moveTo(-W, ly2);

                          ctx.lineTo(W, ly2);

                          ctx.stroke();

                        }

                        ctx.restore();

                        ctx.globalAlpha = 1;



                      } else if (style === 'vibrating') {

                        var stripeW = Math.max(4, Math.round(W / density));

                        var t3 = tick * speed * 0.04;

                        for (var vx = 0; vx < W; vx += stripeW) {

                          var wave = Math.sin(vx * 0.03 + t3) * stripeW * 0.3;

                          var idx = Math.floor(vx / stripeW);

                          ctx.fillStyle = (idx % 2 === 0) ? colA : colB;

                          ctx.beginPath();

                          ctx.moveTo(vx + wave, 0);

                          ctx.lineTo(vx + stripeW + wave, 0);

                          for (var vy = 0; vy < H; vy += 4) {

                            var localWave = Math.sin(vy * 0.02 + t3 + vx * 0.01) * stripeW * 0.25;

                            ctx.lineTo(vx + stripeW + localWave, vy);

                          }

                          ctx.lineTo(vx + stripeW, H);

                          ctx.lineTo(vx, H);

                          for (var vy2 = H; vy2 > 0; vy2 -= 4) {

                            var localWave2 = Math.sin(vy2 * 0.02 + t3 + vx * 0.01) * stripeW * 0.25;

                            ctx.lineTo(vx + localWave2, vy2);

                          }

                          ctx.closePath();

                          ctx.fill();

                        }

                      }



                      if (!paused && canvas.isConnected) canvas._opAnim = requestAnimationFrame(drawFrame);

                    }

                    drawFrame();

                  }

                })

              )

            ),

            // ═══ TESSELLATION TAB ═══

            tab === 'tessellation' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-teal-700 mb-3" }, __alloT('stem.artstudio.tessellation_controls', "\uD83D\uDD37 Tessellation Controls")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-tess-shape-label", className: "text-[11px] font-bold text-teal-700 block mb-1" }, __alloT('stem.artstudio.base_shape', "Base Shape")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-tess-shape-label" },

                        [{ id: 'triangle', label: __alloT('stem.artstudio.triangle_2', '\u25B3 Triangle') }, { id: 'square', label: __alloT('stem.artstudio.square_2', '\u25A1 Square') }, { id: 'hexagon', label: __alloT('stem.artstudio.hexagon', '\u2B21 Hexagon') }].map(function (s) {

                          return React.createElement("button", { "aria-pressed": (d.tessShape || 'hexagon') === s.id, key: s.id, onClick: function () { upd('tessShape', s.id); upd('tessClickData', {}); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.tessShape || 'hexagon') === s.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-teal-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'tessGrid', label: __alloT('stem.artstudio.grid_size_2', 'Grid Size'), min: 2, max: 20, def: 6 },

                     { k: 'tessRotation', label: __alloT('stem.artstudio.rotation', 'Rotation \u00B0'), min: 0, max: 360, def: 0 },

                     { k: 'tessWarpAmt', label: __alloT('stem.artstudio.escher_warp', 'Escher Warp'), min: 0, max: 50, def: 0 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: "artstudio-" + s.k, className: "text-[11px] font-bold text-teal-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: "artstudio-" + s.k, type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-teal-600" })

                      );

                    }),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-tess-scheme-label", className: "text-[11px] font-bold text-teal-700 block mb-1" }, __alloT('stem.artstudio.color_scheme', "Color Scheme")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-tess-scheme-label" },

                        [{ id: 'rainbow', label: __alloT('stem.artstudio.rainbow_2', '\uD83C\uDF08 Rainbow') }, { id: 'warm', label: __alloT('stem.artstudio.warm_4', '\uD83D\uDD25 Warm') }, { id: 'cool', label: __alloT('stem.artstudio.cool_4', '\u2744 Cool') }, { id: 'mono', label: __alloT('stem.artstudio.mono', '\u25AB Mono') }, { id: 'custom', label: __alloT('stem.artstudio.custom', '\uD83C\uDFA8 Custom') }].map(function (s) {

                          return React.createElement("button", { "aria-pressed": (d.tessScheme || 'rainbow') === s.id, key: s.id, onClick: function () { upd('tessScheme', s.id); upd('tessClickData', {}); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.tessScheme || 'rainbow') === s.id ? 'bg-teal-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-teal-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": "Clear tessellation tile colors", onClick: function () { upd('tessClickData', {}); upd('tessReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Tessellation tile colors cleared.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_colors', "\uD83D\uDDD1 Clear Colors")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_11', "Export PNG"), onClick: function () { var c = document.getElementById('tessCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'tessellation-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" }, __alloT('stem.artstudio.export_png_12', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap", role: "group", "aria-labelledby": "artstudio-tess-presets-label" },

                      React.createElement("span", { id: "artstudio-tess-presets-label", className: "text-[11px] font-bold text-teal-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.honeycomb', 'Honeycomb'), shape: 'hexagon', grid: 6, rot: 0, warp: 0, scheme: 'warm' },

                       { label: __alloT('stem.artstudio.pinwheel', 'Pinwheel'), shape: 'triangle', grid: 8, rot: 30, warp: 0, scheme: 'rainbow' },

                       { label: __alloT('stem.artstudio.islamic_star', 'Islamic Star'), shape: 'hexagon', grid: 5, rot: 15, warp: 10, scheme: 'cool' },

                       { label: __alloT('stem.artstudio.escher_fish', 'Escher Fish'), shape: 'square', grid: 6, rot: 0, warp: 35, scheme: 'rainbow' }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, onClick: function () { upd('tessShape', pr.shape); upd('tessGrid', pr.grid); upd('tessRotation', pr.rot); upd('tessWarpAmt', pr.warp); upd('tessScheme', pr.scheme); upd('tessClickData', {}); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-teal-700 border border-teal-700 hover:bg-teal-50 transition-all" }, pr.label);

                      })

                    )

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-3 border border-cyan-200" },

                    React.createElement("button", { "aria-expanded": !!d.showTessInfo, "aria-controls": "artstudio-tess-math", onClick: function () { upd('showTessInfo', !d.showTessInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-cyan-700" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_math_of_tessellations', "\uD83D\uDCCF The Math of Tessellations")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showTessInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showTessInfo && React.createElement("div", { id: "artstudio-tess-math", className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, __alloT('stem.artstudio.a', "\uD83D\uDD37 A "), React.createElement("strong", null, "tessellation"), __alloT('stem.artstudio.or_tiling_covers_a_plane_with_shapes_t', " (or tiling) covers a plane with shapes that fit together without gaps or overlaps. Only three regular polygons tile by themselves: "), React.createElement("strong", null, __alloT('stem.artstudio.equilateral_triangles', "equilateral triangles")), __alloT('stem.artstudio.60_6_360', " (60\u00B0 \u00D7 6 = 360\u00B0), "), React.createElement("strong", null, "squares"), __alloT('stem.artstudio.90_4_360_and', " (90\u00B0 \u00D7 4 = 360\u00B0), and "), React.createElement("strong", null, __alloT('stem.artstudio.regular_hexagons', "regular hexagons")), __alloT('stem.artstudio.120_3_360', " (120\u00B0 \u00D7 3 = 360\u00B0).")),

                      React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, __alloT('stem.artstudio.m_c_escher', "M.C. Escher")), __alloT('stem.artstudio.1898_1972_transformed_simple_tilings_i', " (1898\u20131972) transformed simple tilings into art by warping tile edges. His technique: deform one side of a shape and copy the deformation to the opposite side, so tiles still fit together perfectly. This is the basis of the "), React.createElement("strong", null, __alloT('stem.artstudio.escher_warp_2', "Escher Warp")), " slider."),

                      React.createElement("p", null, "\uD83C\uDFDB ", React.createElement("strong", null, __alloT('stem.artstudio.islamic_geometric_art', "Islamic geometric art")), __alloT('stem.artstudio.uses_tessellations_extensively_combini', " uses tessellations extensively\u2014combining stars, hexagons, and interlocking patterns seen in mosques like the Alhambra. These patterns follow strict mathematical rules while creating breathtaking visual complexity.")),

                      React.createElement("p", null, "\uD83D\uDCCA ", React.createElement("strong", null, "Transformations:"), __alloT('stem.artstudio.tessellations_use_three_key_operations', " Tessellations use three key operations\u2014"), React.createElement("strong", null, "translation"), " (slide), ", React.createElement("strong", null, "rotation"), __alloT('stem.artstudio.turn_and', " (turn), and "), React.createElement("strong", null, "reflection"), __alloT('stem.artstudio.flip_every_tessellation_can_be_classif', " (flip). Every tessellation can be classified by which of these 17 'wallpaper groups' it belongs to."))

                    )

                  ),

                  React.createElement("p", { id: "artstudio-tess-keyboard-help", className: "text-[11px] text-center text-slate-600 italic" }, "Click a tile to cycle its color. Keyboard: Arrow keys move between tiles; Space or Enter cycles the selected tile; Shift with an Arrow key moves and cycles; Home selects the center tile.")

                ),

                React.createElement("div", { className: "relative min-w-0" },

                  React.createElement("canvas", { tabIndex: 0, id: 'tessCanvas', width: 512, height: 512, role: "img",
                    'aria-label': 'Tessellation canvas with ' + (d.tessShape || 'hexagon') + ' tiles in a ' + (d.tessScheme || 'rainbow') + ' color scheme and grid size ' + (typeof d.tessGrid === 'number' ? d.tessGrid : 6) + '.',
                    'aria-describedby': "artstudio-tess-keyboard-help",
                    'aria-keyshortcuts': "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Home Enter Space",
                    className: "rounded-xl border-2 border-teal-300 shadow-lg mx-auto block cursor-pointer focus-visible:ring-4 focus-visible:ring-teal-600 focus-visible:ring-offset-2",
                    style: { maxWidth: '100%', background: 'var(--allo-stem-canvas, #0f172a)' },

                    key: 'tess-' + (d.tessShape || 'hexagon') + '-' + (d.tessGrid || 6) + '-' + (d.tessRotation || 0) + '-' + (d.tessWarpAmt || 0) + '-' + (d.tessScheme || 'rainbow') + '-' + (d.tessReset || 0),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._tessInit) return;

                    canvas._tessInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var shape = d.tessShape || 'hexagon';

                    var gridSize = typeof d.tessGrid === 'number' ? d.tessGrid : 6;

                    var rotation = (typeof d.tessRotation === 'number' ? d.tessRotation : 0) * Math.PI / 180;

                    var warpAmt = typeof d.tessWarpAmt === 'number' ? d.tessWarpAmt : 0;

                    var scheme = d.tessScheme || 'rainbow';

                    var clickData = d.tessClickData || {};



                    // Color palettes

                    var palettes = {

                      rainbow: function (i, total) { return 'hsl(' + Math.round((i / Math.max(total, 1)) * 360) + ',75%,55%)'; },

                      warm: function (i, total) { return 'hsl(' + Math.round((i / Math.max(total, 1)) * 60) + ',80%,' + (40 + (i % 3) * 10) + '%)'; },

                      cool: function (i, total) { return 'hsl(' + (180 + Math.round((i / Math.max(total, 1)) * 80)) + ',70%,' + (40 + (i % 3) * 10) + '%)'; },

                      mono: function (i, total) { return 'hsl(210,' + (10 + (i % 4) * 8) + '%,' + (30 + (i / Math.max(total, 1)) * 40) + '%)'; },

                      custom: function (i) { return 'hsl(' + ((i * 137.508) % 360) + ',65%,55%)'; }

                    };

                    var colorFn = palettes[scheme] || palettes.rainbow;

                    var clickCyclePalette = ['hsl(0,80%,55%)', 'hsl(30,90%,55%)', 'hsl(55,90%,55%)', 'hsl(120,60%,45%)', 'hsl(200,75%,50%)', 'hsl(270,70%,55%)', 'hsl(320,80%,55%)', 'hsl(0,0%,90%)'];



                    // Store tile polygons for click detection

                    var tilePolys = [];



                    ctx.fillStyle = '#0f172a'; ctx.fillRect(0, 0, W, H);

                    ctx.save();

                    ctx.translate(W / 2, H / 2);

                    ctx.rotate(rotation);

                    ctx.translate(-W / 2, -H / 2);



                    var tileIdx = 0;



                    function warpEdge(x1, y1, x2, y2, amt) {

                      if (amt <= 0) return [[x1, y1], [x2, y2]];

                      var pts = [[x1, y1]];

                      var steps = 6;

                      for (var s = 1; s < steps; s++) {

                        var t = s / steps;

                        var mx = x1 + (x2 - x1) * t;

                        var my = y1 + (y2 - y1) * t;

                        var dx = -(y2 - y1), dy = (x2 - x1);

                        var len = Math.sqrt(dx * dx + dy * dy) || 1;

                        var offset = Math.sin(t * Math.PI * 2) * amt * 0.3;

                        pts.push([mx + (dx / len) * offset, my + (dy / len) * offset]);

                      }

                      pts.push([x2, y2]);

                      return pts;

                    }



                    function warpedPoints(vertices) {

                      var wPts = [];

                      for (var vi = 0; vi < vertices.length; vi++) {

                        var next = (vi + 1) % vertices.length;

                        var edgePts = warpEdge(vertices[vi][0], vertices[vi][1], vertices[next][0], vertices[next][1], warpAmt);

                        for (var ep = 0; ep < edgePts.length - (vi < vertices.length - 1 ? 1 : 0); ep++) wPts.push(edgePts[ep]);

                      }

                      return wPts;

                    }

                    function paintTile(vertices, fillColor) {

                      var wPts = warpedPoints(vertices);

                      ctx.beginPath();

                      ctx.moveTo(wPts[0][0], wPts[0][1]);

                      for (var wp = 1; wp < wPts.length; wp++) ctx.lineTo(wPts[wp][0], wPts[wp][1]);

                      ctx.closePath();

                      ctx.fillStyle = fillColor;

                      ctx.fill();

                      ctx.strokeStyle = 'rgba(255,255,255,0.4)';

                      ctx.lineWidth = 1;

                      ctx.stroke();

                    }

                    function drawTile(vertices, fillColor, idx) {

                      var keyStr = Math.round(vertices[0][0]) + '_' + Math.round(vertices[0][1]);

                      var useColor = clickData[keyStr] !== undefined ? clickCyclePalette[clickData[keyStr] % clickCyclePalette.length] : fillColor;

                      paintTile(vertices, useColor);

                      tilePolys.push({ vertices: vertices, key: keyStr, idx: idx });

                    }



                    if (shape === 'hexagon') {

                      var hexR = W / (gridSize * 1.8);

                      var hexH = hexR * Math.sqrt(3);

                      var startX = -hexR * 2;

                      var startY = -hexH;

                      for (var row = 0; row < gridSize + 3; row++) {

                        for (var col = 0; col < gridSize + 3; col++) {

                          var hx = startX + col * hexR * 1.5;

                          var hy = startY + row * hexH + (col % 2 === 1 ? hexH / 2 : 0);

                          var verts = [];

                          for (var a = 0; a < 6; a++) {

                            var ang = (a * 60 - 30) * Math.PI / 180;

                            verts.push([hx + Math.cos(ang) * hexR, hy + Math.sin(ang) * hexR]);

                          }

                          drawTile(verts, colorFn(tileIdx, (gridSize + 3) * (gridSize + 3)), tileIdx);

                          tileIdx++;

                        }

                      }

                    } else if (shape === 'square') {

                      var sqSize = W / gridSize;

                      for (var row2 = -1; row2 < gridSize + 1; row2++) {

                        for (var col2 = -1; col2 < gridSize + 1; col2++) {

                          var sx = col2 * sqSize;

                          var sy = row2 * sqSize;

                          var verts2 = [[sx, sy], [sx + sqSize, sy], [sx + sqSize, sy + sqSize], [sx, sy + sqSize]];

                          drawTile(verts2, colorFn(tileIdx, (gridSize + 2) * (gridSize + 2)), tileIdx);

                          tileIdx++;

                        }

                      }

                    } else if (shape === 'triangle') {

                      var triH2 = W / gridSize;

                      var triW = triH2 * 2 / Math.sqrt(3);

                      for (var row3 = -1; row3 < gridSize + 2; row3++) {

                        for (var col3 = -2; col3 < gridSize * 2 + 2; col3++) {

                          var isUp = (col3 + row3) % 2 === 0;

                          var tx = col3 * triW / 2;

                          var ty = row3 * triH2;

                          var verts3;

                          if (isUp) {

                            verts3 = [[tx, ty + triH2], [tx + triW / 2, ty], [tx + triW, ty + triH2]];

                          } else {

                            verts3 = [[tx, ty], [tx + triW, ty], [tx + triW / 2, ty + triH2]];

                          }

                          drawTile(verts3, colorFn(tileIdx, (gridSize + 3) * (gridSize * 2 + 4)), tileIdx);

                          tileIdx++;

                        }

                      }

                    }

                    ctx.restore();

                    var clickCycleNames = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'light gray'];

                    function displayPoint(px, py) {

                      var dcx = W / 2, dcy = H / 2, ddx = px - dcx, ddy = py - dcy;

                      return { x: dcx + ddx * Math.cos(rotation) - ddy * Math.sin(rotation), y: dcy + ddx * Math.sin(rotation) + ddy * Math.cos(rotation) };

                    }

                    function displayCenter(poly) {

                      var px = 0, py = 0;

                      for (var ci = 0; ci < poly.vertices.length; ci++) { px += poly.vertices[ci][0]; py += poly.vertices[ci][1]; }

                      return displayPoint(px / poly.vertices.length, py / poly.vertices.length);

                    }

                    var visibleTiles = tilePolys.filter(function (poly) {

                      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

                      for (var bvi = 0; bvi < poly.vertices.length; bvi++) {

                        var point = displayPoint(poly.vertices[bvi][0], poly.vertices[bvi][1]);

                        minX = Math.min(minX, point.x); minY = Math.min(minY, point.y);

                        maxX = Math.max(maxX, point.x); maxY = Math.max(maxY, point.y);

                      }

                      return maxX >= 0 && minX <= W && maxY >= 0 && minY <= H;

                    });

                    var selectedPoly = visibleTiles[0] || tilePolys[0];

                    var bestCenterDistance = Infinity;

                    for (var vsi = 0; vsi < visibleTiles.length; vsi++) {

                      var vc = displayCenter(visibleTiles[vsi]);

                      var vd = Math.pow(vc.x - W / 2, 2) + Math.pow(vc.y - H / 2, 2);

                      if (vd < bestCenterDistance) { bestCenterDistance = vd; selectedPoly = visibleTiles[vsi]; }

                    }

                    function updateTessSelection(show) {

                      if (!selectedPoly) return;

                      canvas._tessSelectedKey = selectedPoly.key;

                      var selectedCenter = displayCenter(selectedPoly);

                      var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-tess-keyboard-cursor="true"]');

                      if (cursor) {

                        var displayW = canvas.clientWidth || W, displayH = canvas.clientHeight || H;

                        cursor.style.left = ((canvas.offsetLeft || 0) + selectedCenter.x / W * displayW - 10) + 'px';

                        cursor.style.top = ((canvas.offsetTop || 0) + selectedCenter.y / H * displayH - 10) + 'px';

                        cursor.style.display = show ? 'block' : 'none';

                      }

                      var selectedNumber = visibleTiles.indexOf(selectedPoly) + 1;

                      var colorIndex = clickData[selectedPoly.key];

                      canvas.setAttribute('aria-label', 'Tessellation canvas with ' + shape + ' tiles in a ' + scheme +

                        ' color scheme and grid size ' + gridSize + '. Selected tile ' + selectedNumber + ' of ' +

                        visibleTiles.length + (colorIndex === undefined ? '.' : ', colored ' + clickCycleNames[colorIndex] + '.'));

                    }

                    function cycleTile(poly) {

                      if (!poly) return;

                      var newClick = Object.assign({}, clickData);

                      var nextColor = ((newClick[poly.key] || 0) + 1) % clickCyclePalette.length;

                      newClick[poly.key] = nextColor;

                      clickData = newClick;

                      ctx.save();

                      ctx.translate(W / 2, H / 2); ctx.rotate(rotation); ctx.translate(-W / 2, -H / 2);

                      paintTile(poly.vertices, clickCyclePalette[nextColor]);

                      ctx.restore();

                      upd('tessClickData', newClick);

                      updateTessSelection(true);

                      if (typeof announceToSR === 'function') announceToSR('Tile ' + (visibleTiles.indexOf(poly) + 1) +

                        ' of ' + visibleTiles.length + ' changed to ' + clickCycleNames[nextColor] + '.');

                    }

                    function moveTessSelection(key) {

                      if (!selectedPoly) return;

                      var current = displayCenter(selectedPoly), best = null, bestScore = Infinity;

                      for (var mi = 0; mi < visibleTiles.length; mi++) {

                        var candidate = visibleTiles[mi];

                        if (candidate === selectedPoly) continue;

                        var cc = displayCenter(candidate), dx = cc.x - current.x, dy = cc.y - current.y;

                        var forward = key === 'ArrowLeft' ? -dx : key === 'ArrowRight' ? dx : key === 'ArrowUp' ? -dy : dy;

                        if (forward <= 1) continue;

                        var sideways = key === 'ArrowLeft' || key === 'ArrowRight' ? Math.abs(dy) : Math.abs(dx);

                        var score = forward + sideways * 2;

                        if (score < bestScore) { bestScore = score; best = candidate; }

                      }

                      if (best) selectedPoly = best;

                    }

                    canvas.onfocus = function () { updateTessSelection(true); };

                    canvas.onblur = function () { updateTessSelection(false); };

                    canvas.onkeydown = function (event) {

                      if (event.key === 'Home') {

                        event.preventDefault();

                        bestCenterDistance = Infinity;

                        for (var hi = 0; hi < visibleTiles.length; hi++) {

                          var hc = displayCenter(visibleTiles[hi]);

                          var hd = Math.pow(hc.x - W / 2, 2) + Math.pow(hc.y - H / 2, 2);

                          if (hd < bestCenterDistance) { bestCenterDistance = hd; selectedPoly = visibleTiles[hi]; }

                        }

                        updateTessSelection(true);

                      } else if (event.key.indexOf('Arrow') === 0) {

                        event.preventDefault();

                        moveTessSelection(event.key);

                        if (event.shiftKey) cycleTile(selectedPoly);

                        else {

                          updateTessSelection(true);

                          if (typeof announceToSR === 'function') announceToSR('Selected tile ' +

                            (visibleTiles.indexOf(selectedPoly) + 1) + ' of ' + visibleTiles.length + '.');

                        }

                      } else if (event.key === 'Enter' || event.key === ' ') {

                        event.preventDefault();

                        cycleTile(selectedPoly);

                      }

                    };

                    updateTessSelection(typeof document !== 'undefined' && document.activeElement === canvas);

                    // Click handler for cycling tile colors.

                    canvas.onclick = function (e) {

                      var rect = canvas.getBoundingClientRect();

                      var mx = (e.clientX - rect.left) * (W / rect.width);

                      var my = (e.clientY - rect.top) * (H / rect.height);

                      // Transform click point by inverse rotation

                      var cos = Math.cos(-rotation), sin = Math.sin(-rotation);

                      var cx2 = W / 2, cy2 = H / 2;

                      var dx = mx - cx2, dy = my - cy2;

                      var rx = cx2 + dx * cos - dy * sin;

                      var ry = cy2 + dx * sin + dy * cos;

                      // Find clicked tile

                      for (var ti = tilePolys.length - 1; ti >= 0; ti--) {

                        var poly = tilePolys[ti];

                        var inside = false;

                        var vs = poly.vertices;

                        for (var pi = 0, pj = vs.length - 1; pi < vs.length; pj = pi++) {

                          if (((vs[pi][1] > ry) !== (vs[pj][1] > ry)) && (rx < (vs[pj][0] - vs[pi][0]) * (ry - vs[pi][1]) / (vs[pj][1] - vs[pi][1]) + vs[pi][0])) {

                            inside = !inside;

                          }

                        }

                        if (inside) {

                          selectedPoly = poly;

                          cycleTile(poly);

                          break;

                        }

                      }

                    };

                  }

                }),

                  React.createElement("span", {
                    "data-tess-keyboard-cursor": "true",
                    "aria-hidden": "true",
                    className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#0f766e]",
                    style: { display: 'none' }
                  })

                )

              )

            ),

            // ═══ FRACTAL EXPLORER TAB ═══

            tab === 'fractal' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-violet-700 mb-3" }, __alloT('stem.artstudio.fractal_explorer', "\uD83D\uDD2E Fractal Explorer")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-fractal-type-label", className: "text-[11px] font-bold text-violet-700 block mb-1" }, __alloT('stem.artstudio.fractal_type', "Fractal Type")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-fractal-type-label" },

                        [{ id: 'mandelbrot', label: __alloT('stem.artstudio.mandelbrot', '\uD83C\uDF00 Mandelbrot') }, { id: 'julia', label: __alloT('stem.artstudio.julia', '\u2728 Julia') }, { id: 'burningShip', label: __alloT('stem.artstudio.burning_ship', '\uD83D\uDD25 Burning Ship') }, { id: 'sierpinski', label: __alloT('stem.artstudio.sierpinski', '\u25B3 Sierpinski') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.fractalType || 'mandelbrot') === s.id, onClick: function () { upd('fractalType', s.id); upd('fractalZoom', 1); upd('fractalPanX', 0); upd('fractalPanY', 0); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(s.label + ' fractal selected; view reset.'); }, className: "flex-1 min-w-[6rem] px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 " + ((d.fractalType || 'mandelbrot') === s.id ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-violet-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'fractalIter', label: __alloT('stem.artstudio.max_iterations', 'Max Iterations'), min: 50, max: 500, def: 200 },

                     { k: 'fractalZoom', label: __alloT('stem.artstudio.zoom', 'Zoom'), min: 1, max: 500, def: 1 },

                     { k: 'fractalPanX', label: __alloT('stem.artstudio.horizontal_pan', 'Horizontal pan'), min: -200, max: 200, def: 0 },

                     { k: 'fractalPanY', label: __alloT('stem.artstudio.vertical_pan', 'Vertical pan'), min: -200, max: 200, def: 0 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      var valueText = s.k === 'fractalZoom' ? val + ' times magnification' :

                        s.k === 'fractalPanX' ? val + ' horizontal units' :

                        s.k === 'fractalPanY' ? val + ' vertical units' : val + ' iterations';

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-violet-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": valueText, onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('fractalReset', Date.now()); }, className: "w-full accent-violet-600" })

                      );

                    }),

                    (d.fractalType || 'mandelbrot') === 'julia' && React.createElement("div", { className: "space-y-2 mt-2 p-2 bg-violet-50 rounded-lg border border-violet-200" },

                      React.createElement("p", { className: "text-[11px] font-bold text-violet-700" }, __alloT('stem.artstudio.julia_constant_c', "Julia Constant (c)")),

                      [{ k: 'juliaReal', label: __alloT('stem.artstudio.c_real', 'c real'), min: -200, max: 200, def: -70 },

                       { k: 'juliaImag', label: __alloT('stem.artstudio.c_imaginary', 'c imaginary'), min: -200, max: 200, def: 27 }].map(function (s) {

                        var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                        return React.createElement("div", { key: s.k },

                          React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-violet-700 block" }, s.label + ': ' + (val / 100).toFixed(2)),

                          React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, "aria-valuetext": (val / 100).toFixed(2), onChange: function (e) { upd(s.k, parseInt(e.target.value)); upd('fractalReset', Date.now()); }, className: "w-full accent-violet-600" })

                        );

                      })

                    ),

                    React.createElement("div", { className: "mb-3 mt-2" },

                      React.createElement("span", { id: "artstudio-fractal-color-label", className: "text-[11px] font-bold text-violet-700 block mb-1" }, __alloT('stem.artstudio.color_scheme_2', "Color Scheme")),

                      React.createElement("div", { className: "flex gap-1 flex-wrap", role: "group", "aria-labelledby": "artstudio-fractal-color-label" },

                        [{ id: 'classic', label: __alloT('stem.artstudio.classic', '\uD83C\uDF08 Classic') }, { id: 'fire', label: __alloT('stem.artstudio.fire', '\uD83D\uDD25 Fire') }, { id: 'ocean', label: __alloT('stem.artstudio.ocean', '\uD83C\uDF0A Ocean') }, { id: 'psychedelic', label: __alloT('stem.artstudio.psychedelic', '\uD83D\uDC9C Psychedelic') }, { id: 'grayscale', label: __alloT('stem.artstudio.grayscale', '\u25AB Grayscale') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.fractalColor || 'classic') === s.id, onClick: function () { upd('fractalColor', s.id); upd('fractalReset', Date.now()); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 " + ((d.fractalColor || 'classic') === s.id ? 'bg-violet-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-violet-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { onClick: function () { upd('fractalZoom', 1); upd('fractalPanX', 0); upd('fractalPanY', 0); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Fractal view reset to one times zoom and centered pan.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.reset_view', "\u21BA Reset View")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_png_13', "Export fractal as PNG"), onClick: function () { var c = document.getElementById('fractalCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'fractal-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Fractal PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_14', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-fractal-presets-label" },

                      React.createElement("span", { id: "artstudio-fractal-presets-label", className: "text-[11px] font-bold text-violet-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.seahorse_valley', 'Seahorse Valley'), type: 'mandelbrot', panX: 74, panY: -20, zoom: 120, iter: 350 },

                       { label: __alloT('stem.artstudio.elephant_valley', 'Elephant Valley'), type: 'mandelbrot', panX: 36, panY: -4, zoom: 80, iter: 300 },

                       { label: __alloT('stem.artstudio.lightning', 'Lightning'), type: 'julia', panX: 0, panY: 0, zoom: 1, iter: 250, jr: -12, ji: 75 },

                       { label: __alloT('stem.artstudio.spiral_arm', 'Spiral Arm'), type: 'julia', panX: 0, panY: 0, zoom: 1, iter: 300, jr: 28, ji: 1 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' fractal preset', onClick: function () { upd('fractalType', pr.type); upd('fractalPanX', pr.panX); upd('fractalPanY', pr.panY); upd('fractalZoom', pr.zoom); upd('fractalIter', pr.iter); if (pr.jr !== undefined) { upd('juliaReal', pr.jr); upd('juliaImag', pr.ji); } upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR(pr.label + ' fractal preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-violet-700 border border-violet-300 hover:bg-violet-50 transition-all focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    ),

                    React.createElement("p", { id: "artstudio-fractal-instructions", className: "mt-3 text-[11px] text-violet-700 leading-relaxed" }, __alloT('stem.artstudio.fractal_keyboard_instructions', "Keyboard: use the Zoom, Horizontal pan, and Vertical pan sliders to explore every view. Pointer users can also double-click a location or use the mouse wheel."))

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-3 border border-purple-200" },

                    React.createElement("button", { id: "artstudio-fractal-info-toggle", "aria-expanded": !!d.showFractalInfo, "aria-controls": "artstudio-fractal-info", onClick: function () { upd('showFractalInfo', !d.showFractalInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-purple-700 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 rounded" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_math_of_fractals', "\uD83D\uDD2C The Math of Fractals")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showFractalInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showFractalInfo && React.createElement("div", { id: "artstudio-fractal-info", role: "region", "aria-labelledby": "artstudio-fractal-info-toggle", className: "mt-3 space-y-2 text-xs text-slate-700 leading-relaxed" },

                      React.createElement("p", null, "\uD83C\uDF00 ", React.createElement("strong", null, __alloT('stem.artstudio.the_mandelbrot_set', "The Mandelbrot set")), __alloT('stem.artstudio.is_generated_by_iterating_z_z_c_for_ev', " is generated by iterating z = z\u00B2 + c for every point c in the complex plane. Points where |z| stays bounded (never exceeds 2) are 'in' the set. The boundary reveals "), React.createElement("strong", null, __alloT('stem.artstudio.infinite_complexity', "infinite complexity")), __alloT('stem.artstudio.at_every_scale', " at every scale.")),

                      React.createElement("p", null, "\u2728 ", React.createElement("strong", null, __alloT('stem.artstudio.julia_sets', "Julia sets")), __alloT('stem.artstudio.use_the_same_formula_but_fix_c_and_var', " use the same formula but fix c and vary the starting z. Each Mandelbrot point generates a unique Julia set \u2014 points inside the Mandelbrot produce connected Julias; outside points produce dust-like 'Fatou sets'.")),

                      React.createElement("p", null, __alloT('stem.artstudio.the', "\uD83D\uDD25 The "), React.createElement("strong", null, __alloT('stem.artstudio.burning_ship_2', "Burning Ship")), __alloT('stem.artstudio.fractal_modifies_the_iteration_to_z_re', " fractal modifies the iteration to z = (|Re(z)| + i|Im(z)|)\u00B2 + c, creating an asymmetric shape resembling a flaming vessel. It was discovered by Michael Michelitsch and Otto R\u00F6ssler in 1992.")),

                      React.createElement("p", null, __alloT('stem.artstudio.the_2', "\u25B3 The "), React.createElement("strong", null, __alloT('stem.artstudio.sierpinski_triangle', "Sierpinski Triangle")), __alloT('stem.artstudio.is_built_by_the_chaos_game_pick_a_rand', " is built by the 'chaos game': pick a random point, then repeatedly jump halfway toward a randomly chosen vertex. Remarkably, this random process produces a perfectly self-similar fractal.")),

                      React.createElement("p", null, "\uD83E\uDDE0 ", React.createElement("strong", null, __alloT('stem.artstudio.benoit_mandelbrot', "Benoit Mandelbrot")), __alloT('stem.artstudio.1924_2010_coined_the_word_fractal_from', " (1924\u20132010) coined the word 'fractal' from Latin 'fractus' (broken). He showed that coastlines, mountains, blood vessels, and stock markets all exhibit fractal geometry \u2014 "), React.createElement("strong", null, __alloT('stem.artstudio.nature_is_fractal', "nature is fractal")), ".")

                    )

                  )

                ),

                React.createElement("canvas", { id: 'fractalCanvas', width: 512, height: 512, role: "img", "aria-describedby": "artstudio-fractal-instructions", 'aria-label': ((d.fractalType || 'mandelbrot') === 'mandelbrot' ? 'Mandelbrot fractal: a dark cardioid and circular bulbs bordered by repeating colored tendrils' : (d.fractalType || 'mandelbrot') === 'julia' ? 'Julia fractal: self-similar colored branches generated from the selected complex constant' : (d.fractalType || 'mandelbrot') === 'burningShip' ? 'Burning Ship fractal: an asymmetric ship-like boundary with flame-shaped repeating detail' : 'Sierpinski triangle: a self-similar triangle subdivided into three smaller triangles') + '. ' + (typeof d.fractalIter === 'number' ? d.fractalIter : 200) + ' maximum iterations, ' + (typeof d.fractalZoom === 'number' ? d.fractalZoom : 1) + ' times zoom, horizontal pan ' + (typeof d.fractalPanX === 'number' ? d.fractalPanX : 0) + ', vertical pan ' + (typeof d.fractalPanY === 'number' ? d.fractalPanY : 0) + ', ' + (d.fractalColor || 'classic') + ' color scheme.', className: "rounded-xl border-2 border-violet-300 shadow-lg mx-auto block cursor-crosshair", style: { maxWidth: '100%', background: '#0a0a1a' },

                  key: 'frac-' + (d.fractalType || 'mandelbrot') + '-' + (d.fractalReset || 0),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._fracInit) return;

                    canvas._fracInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var type = d.fractalType || 'mandelbrot';

                    var maxIter = typeof d.fractalIter === 'number' ? d.fractalIter : 200;

                    var zoom = typeof d.fractalZoom === 'number' ? d.fractalZoom : 1;

                    var panX = typeof d.fractalPanX === 'number' ? d.fractalPanX : 0;

                    var panY = typeof d.fractalPanY === 'number' ? d.fractalPanY : 0;

                    var colorScheme = d.fractalColor || 'classic';

                    var juliaR = typeof d.juliaReal === 'number' ? d.juliaReal / 100 : -0.7;

                    var juliaI = typeof d.juliaImag === 'number' ? d.juliaImag / 100 : 0.27;



                    function getColor(iter, max) {

                      if (iter === max) return [0, 0, 0];

                      var t = iter / max;

                      if (colorScheme === 'fire') return [Math.min(255, Math.round(t * 3 * 255)), Math.round(t * t * 255), Math.round(t * t * t * 200)];

                      if (colorScheme === 'ocean') return [Math.round(t * t * 80), Math.round(t * 180), Math.min(255, Math.round(t * 1.5 * 255))];

                      if (colorScheme === 'psychedelic') {

                        var h = (t * 360 * 3) % 360;

                        var s = 0.9, l = 0.5;

                        var c = (1 - Math.abs(2 * l - 1)) * s;

                        var x = c * (1 - Math.abs((h / 60) % 2 - 1));

                        var m = l - c / 2;

                        var r1, g1, b1;

                        if (h < 60) { r1 = c; g1 = x; b1 = 0; } else if (h < 120) { r1 = x; g1 = c; b1 = 0; }

                        else if (h < 180) { r1 = 0; g1 = c; b1 = x; } else if (h < 240) { r1 = 0; g1 = x; b1 = c; }

                        else if (h < 300) { r1 = x; g1 = 0; b1 = c; } else { r1 = c; g1 = 0; b1 = x; }

                        return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];

                      }

                      if (colorScheme === 'grayscale') { var v = Math.round(t * 255); return [v, v, v]; }

                      // classic rainbow

                      var h2 = (t * 360 * 2) % 360;

                      var c2 = 1 * 0.8; var x2 = c2 * (1 - Math.abs((h2 / 60) % 2 - 1)); var m2 = 0.1;

                      var r2, g2, b2;

                      if (h2 < 60) { r2 = c2; g2 = x2; b2 = 0; } else if (h2 < 120) { r2 = x2; g2 = c2; b2 = 0; }

                      else if (h2 < 180) { r2 = 0; g2 = c2; b2 = x2; } else if (h2 < 240) { r2 = 0; g2 = x2; b2 = c2; }

                      else if (h2 < 300) { r2 = x2; g2 = 0; b2 = c2; } else { r2 = c2; g2 = 0; b2 = x2; }

                      return [Math.round((r2 + m2) * 255), Math.round((g2 + m2) * 255), Math.round((b2 + m2) * 255)];

                    }



                    if (type === 'sierpinski') {

                      // Chaos game Sierpinski

                      ctx.fillStyle = '#0a0a1a'; ctx.fillRect(0, 0, W, H);

                      var verts = [[W / 2, 20], [20, H - 20], [W - 20, H - 20]];

                      var px = Math.random() * W, py = Math.random() * H;

                      var si = 0, total = 100000;

                      var batchSize = reducedMotion ? total : 500;

                      function drawSierpBatch() {

                        for (var b = 0; b < batchSize && si < total; b++, si++) {

                          var vi = Math.floor(Math.random() * 3);

                          px = (px + verts[vi][0]) / 2;

                          py = (py + verts[vi][1]) / 2;

                          if (si > 10) {

                            var t = si / total;

                            var col = getColor(Math.round(t * maxIter * 0.5), maxIter);

                            ctx.fillStyle = 'rgba(' + col[0] + ',' + col[1] + ',' + col[2] + ',0.7)';

                            ctx.fillRect(px, py, 1.2, 1.2);

                          }

                        }

                        if (si < total && canvas.isConnected) canvas._fracAnim = requestAnimationFrame(drawSierpBatch);

                      }

                      drawSierpBatch();

                    } else {

                      // Mandelbrot / Julia / Burning Ship — pixel-by-pixel via ImageData

                      var imgData = ctx.createImageData(W, H);

                      var data = imgData.data;

                      // Render in chunks for responsiveness

                      var rowsDone = 0;

                      var centerX = type === 'mandelbrot' ? -0.5 : type === 'burningShip' ? -0.4 : 0;

                      var centerY = type === 'burningShip' ? -0.5 : 0;

                      var scale = 3.0 / (zoom * Math.min(W, H));

                      var offsetX = (panX / 100) * 2;

                      var offsetY = (panY / 100) * 2;



                      function renderChunk() {

                        var endRow = Math.min(rowsDone + 16, H);

                        for (var py2 = rowsDone; py2 < endRow; py2++) {

                          for (var px2 = 0; px2 < W; px2++) {

                            var x0 = (px2 - W / 2) * scale + centerX - offsetX;

                            var y0 = (py2 - H / 2) * scale + centerY - offsetY;

                            var zr, zi, cr, ci, iter = 0;



                            if (type === 'julia') {

                              zr = x0; zi = y0; cr = juliaR; ci = juliaI;

                            } else {

                              zr = 0; zi = 0; cr = x0; ci = y0;

                            }



                            while (iter < maxIter && zr * zr + zi * zi < 4) {

                              if (type === 'burningShip') {

                                var tr = Math.abs(zr), ti = Math.abs(zi);

                                var newR = tr * tr - ti * ti + cr;

                                zi = 2 * tr * ti + ci;

                                zr = newR;

                              } else {

                                var newR2 = zr * zr - zi * zi + cr;

                                zi = 2 * zr * zi + ci;

                                zr = newR2;

                              }

                              iter++;

                            }



                            // Smooth coloring

                            var smoothIter = iter;

                            if (iter < maxIter) {

                              var log_zn = Math.log(zr * zr + zi * zi) / 2;

                              var nu = Math.log(log_zn / Math.log(2)) / Math.log(2);

                              if (isFinite(nu)) smoothIter = iter + 1 - nu;

                            }



                            var col = getColor(smoothIter, maxIter);

                            var idx = (py2 * W + px2) * 4;

                            data[idx] = col[0]; data[idx + 1] = col[1]; data[idx + 2] = col[2]; data[idx + 3] = 255;

                          }

                        }

                        if (reducedMotion) {

                          if (endRow === H) ctx.putImageData(imgData, 0, 0);

                        } else {

                          ctx.putImageData(imgData, 0, 0, 0, rowsDone, W, endRow - rowsDone);

                        }

                        rowsDone = endRow;

                        if (rowsDone < H && canvas.isConnected) canvas._fracAnim = requestAnimationFrame(renderChunk);

                      }

                      renderChunk();

                    }



                    // Click-to-zoom

                    canvas.ondblclick = function (e) {

                      var rect = canvas.getBoundingClientRect();

                      var mx = (e.clientX - rect.left) * (W / rect.width);

                      var my = (e.clientY - rect.top) * (H / rect.height);

                      var newPanX = Math.round(((W / 2 - mx) / W) * 100 + panX);

                      var newPanY = Math.round(((H / 2 - my) / H) * 100 + panY);

                      var newZoom = Math.min(500, Math.round(zoom * 2));

                      upd('fractalPanX', newPanX); upd('fractalPanY', newPanY); upd('fractalZoom', newZoom); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Fractal view zoomed to ' + newZoom + ' times at horizontal pan ' + newPanX + ' and vertical pan ' + newPanY + '.');

                    };

                    // Scroll-to-zoom

                    canvas.onwheel = function (e) {

                      e.preventDefault();

                      var factor = e.deltaY < 0 ? 1.3 : 0.77;

                      var newZoom2 = Math.max(1, Math.min(500, Math.round(zoom * factor)));

                      upd('fractalZoom', newZoom2); upd('fractalReset', Date.now()); if (typeof announceToSR === 'function') announceToSR('Fractal zoom ' + newZoom2 + ' times.');

                    };

                  }

                })

              ),

              React.createElement("p", { className: "text-[11px] text-center text-slate-600 italic mt-1" }, __alloT('stem.artstudio.double_click_to_zoom_in_scroll_wheel_t', "\uD83D\uDC46 Double-click to zoom in \u2022 Scroll-wheel to zoom in/out"))

            ),

            // ═══ GRADIENT LAB TAB ═══

            tab === 'gradient' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-rose-50 to-orange-50 rounded-xl p-4 border border-rose-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-rose-700 mb-3" }, __alloT('stem.artstudio.gradient_lab', "\uD83C\uDF08 Gradient Lab")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-gradient-type-label", className: "text-[11px] font-bold text-rose-700 block mb-1" }, __alloT('stem.artstudio.gradient_type', "Gradient Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-gradient-type-label" },

                        [{ id: 'linear', label: __alloT('stem.artstudio.linear', '\u2194 Linear') }, { id: 'radial', label: __alloT('stem.artstudio.radial', '\u25CE Radial') }, { id: 'conic', label: __alloT('stem.artstudio.conic', '\uD83C\uDF00 Conic') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.gradType || 'linear') === s.id, onClick: function () { upd('gradType', s.id); }, className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + ((d.gradType || 'linear') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    (d.gradType || 'linear') === 'linear' && React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { htmlFor: "artstudio-grad-angle", className: "text-[11px] font-bold text-rose-700 block mb-0.5" }, "Angle: " + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + '\u00B0'),

                      React.createElement("input", { id: "artstudio-grad-angle", type: "range", min: 0, max: 360, value: typeof d.gradAngle === 'number' ? d.gradAngle : 90, "aria-valuetext": (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + ' degrees', onChange: function (e) { upd('gradAngle', parseInt(e.target.value)); }, className: "w-full accent-rose-600" })

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-gradient-blend-label", className: "text-[11px] font-bold text-rose-700 block mb-1" }, __alloT('stem.artstudio.blend_mode', "Blend Mode")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-gradient-blend-label" },

                        [{ id: 'smooth', label: __alloT('stem.artstudio.smooth', 'Smooth') }, { id: 'hard', label: __alloT('stem.artstudio.hard_edge', 'Hard Edge') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.gradBlend || 'smooth') === s.id, onClick: function () { upd('gradBlend', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 " + ((d.gradBlend || 'smooth') === s.id ? 'bg-rose-600 text-white' : 'bg-white text-slate-700 border border-slate-400 hover:bg-rose-50') }, s.label);

                        })

                      )

                    ),

                    // Color stops editor

                    React.createElement("div", { className: "mb-3", role: "group", "aria-labelledby": "artstudio-gradient-stops-label" },

                      React.createElement("div", { className: "flex items-center justify-between mb-1" },

                        React.createElement("span", { id: "artstudio-gradient-stops-label", className: "text-[11px] font-bold text-rose-700" }, __alloT('stem.artstudio.color_stops', "Color Stops")),

                        React.createElement("button", { "aria-label": __alloT('stem.artstudio.add_stop', "Add color stop"), "aria-describedby": "artstudio-gradient-stop-help", disabled: (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).length >= 8, onClick: function () {

                          var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                          if (stops.length < 8) {

                            var newPos = 50;

                            stops = stops.concat([{ hue: Math.round(Math.random() * 360), pos: newPos }]);

                            stops.sort(function (a, b) { return a.pos - b.pos; });

                            upd('gradStops', stops);

                            if (typeof announceToSR === 'function') announceToSR('Color stop added. ' + stops.length + ' stops total.');

                          }

                        }, className: "transition-colors px-2 py-1 rounded text-[11px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.add_stop_2', "+ Add Stop"))

                      ),

                      React.createElement("p", { id: "artstudio-gradient-stop-help", className: "text-[11px] text-rose-700 mb-2 leading-relaxed" }, "Adjust hue and position with the sliders. Positions stay between neighboring stops. " + (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).length + " of 8 stops."),

                      (function () {

                        var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                        return stops.map(function (stop, idx) {

                          return React.createElement("div", { key: idx, className: "flex items-end gap-2 mb-2 flex-wrap", role: "group", "aria-label": 'Color stop ' + (idx + 1) + ', hue ' + stop.hue + ' degrees, position ' + stop.pos + ' percent' },

                            React.createElement("div", { "aria-hidden": "true", style: { width: 24, height: 24, borderRadius: 4, background: 'hsl(' + stop.hue + ',85%,55%)', border: '2px solid white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', flexShrink: 0 } }),

                            React.createElement("div", { className: "flex-1 min-w-[8rem]" },

                              React.createElement("label", { htmlFor: 'artstudio-grad-stop-' + idx + '-hue', className: "text-[10px] font-bold text-rose-700 block" }, 'Hue: ' + stop.hue + '\u00B0'),

                              React.createElement("input", { id: 'artstudio-grad-stop-' + idx + '-hue', type: "range", min: 0, max: 360, value: stop.hue, "aria-valuetext": stop.hue + ' degrees', onChange: function (e) {

                                var newStops = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                                newStops[idx] = Object.assign({}, newStops[idx], { hue: parseInt(e.target.value) });

                                upd('gradStops', newStops);

                              }, className: "w-full accent-rose-500", title: "Hue: " + stop.hue })

                            ),

                            React.createElement("div", { className: "w-24 flex-shrink-0" },

                              React.createElement("label", { htmlFor: 'artstudio-grad-stop-' + idx + '-position', className: "text-[10px] font-bold text-rose-700 block" }, 'Position: ' + stop.pos + '%'),

                              React.createElement("input", { id: 'artstudio-grad-stop-' + idx + '-position', type: "range", min: idx === 0 ? 0 : stops[idx - 1].pos, max: idx === stops.length - 1 ? 100 : stops[idx + 1].pos, value: stop.pos, "aria-valuetext": stop.pos + ' percent', onChange: function (e) {

                                var newStops2 = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                                newStops2[idx] = Object.assign({}, newStops2[idx], { pos: parseInt(e.target.value) });

                                upd('gradStops', newStops2);

                              }, className: "w-full accent-orange-500" })

                            ),

                            stops.length > 2 && React.createElement("button", { "aria-label": 'Remove color stop ' + (idx + 1), onClick: function () {

                              var newStops3 = (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).slice();

                              newStops3.splice(idx, 1);

                              upd('gradStops', newStops3);

                              if (typeof announceToSR === 'function') announceToSR('Color stop removed. ' + newStops3.length + ' stops remain.');

                            }, className: "transition-colors text-sm font-bold text-red-700 hover:text-red-800 flex-shrink-0 w-6 h-6 rounded focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2" }, "\u00D7")

                          );

                        });

                      })()

                    ),

                    React.createElement("div", { className: "flex gap-2 mt-3" },

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_gradient_png', "Export gradient as PNG"), onClick: function () { var c = document.getElementById('gradientCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'gradient-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); if (typeof announceToSR === 'function') announceToSR('Gradient PNG exported.'); }, className: "transition-colors flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2" }, __alloT('stem.artstudio.export_png_16', "\uD83D\uDCE5 Export PNG"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap items-center", role: "group", "aria-labelledby": "artstudio-gradient-presets-label" },

                      React.createElement("span", { id: "artstudio-gradient-presets-label", className: "text-[11px] font-bold text-rose-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.sunset', 'Sunset'), stops: [{ hue: 270, pos: 0 }, { hue: 330, pos: 30 }, { hue: 20, pos: 60 }, { hue: 45, pos: 100 }], type: 'linear', angle: 180 },

                       { label: __alloT('stem.artstudio.northern_lights', 'Northern Lights'), stops: [{ hue: 160, pos: 0 }, { hue: 120, pos: 35 }, { hue: 180, pos: 65 }, { hue: 280, pos: 100 }], type: 'linear', angle: 0 },

                       { label: __alloT('stem.artstudio.vaporwave', 'Vaporwave'), stops: [{ hue: 300, pos: 0 }, { hue: 270, pos: 40 }, { hue: 190, pos: 70 }, { hue: 330, pos: 100 }], type: 'radial', angle: 90 },

                       { label: __alloT('stem.artstudio.golden_hour', 'Golden Hour'), stops: [{ hue: 40, pos: 0 }, { hue: 25, pos: 50 }, { hue: 10, pos: 100 }], type: 'linear', angle: 135 },

                       { label: __alloT('stem.artstudio.deep_space', 'Deep Space'), stops: [{ hue: 260, pos: 0 }, { hue: 230, pos: 30 }, { hue: 200, pos: 60 }, { hue: 280, pos: 80 }, { hue: 0, pos: 100 }], type: 'radial', angle: 90 }].map(function (pr) {

                        return React.createElement("button", { key: pr.label, "aria-label": 'Load ' + pr.label + ' gradient preset', onClick: function () { upd('gradStops', pr.stops); upd('gradType', pr.type); upd('gradAngle', pr.angle); if (typeof announceToSR === 'function') announceToSR(pr.label + ' gradient preset loaded.'); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-rose-700 border border-rose-600 hover:bg-rose-50 transition-all focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2" }, pr.label);

                      })

                    )

                  ),

                  // CSS output

                  React.createElement("div", { className: "bg-slate-900 rounded-xl p-3 border border-slate-700" },

                    React.createElement("div", { className: "flex items-center justify-between mb-1" },

                      React.createElement("span", { id: "artstudio-gradient-css-label", className: "text-[11px] font-bold text-slate-300" }, __alloT('stem.artstudio.css_output', "\uD83D\uDCCB CSS Output")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.copy_gradient_css', "Copy gradient CSS to clipboard"), onClick: function () {

                        var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                        var stopsStr = stops.map(function (s) { return 'hsl(' + s.hue + ', 85%, 55%) ' + s.pos + '%'; }).join(', ');

                        var css;

                        if ((d.gradType || 'linear') === 'radial') css = 'background: radial-gradient(circle, ' + stopsStr + ');';

                        else if (d.gradType === 'conic') css = 'background: conic-gradient(from 0deg, ' + stopsStr + ');';

                        else css = 'background: linear-gradient(' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + 'deg, ' + stopsStr + ');';

                        navigator.clipboard.writeText(css).then(function () { if (typeof addToast === 'function') addToast('\u2705 CSS copied!', 'success'); if (typeof announceToSR === 'function') announceToSR('Gradient CSS copied to the clipboard.'); }, function () { if (typeof addToast === 'function') addToast('Unable to copy CSS.', 'error'); if (typeof announceToSR === 'function') announceToSR('Unable to copy gradient CSS.'); });

                      }, className: "transition-colors px-2 py-1 rounded text-[11px] font-bold bg-slate-700 text-slate-200 hover:bg-slate-600 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900" }, __alloT('stem.artstudio.copy_2', "\uD83D\uDCCB Copy"))

                    ),

                    React.createElement("code", { id: "artstudio-gradient-css", "aria-labelledby": "artstudio-gradient-css-label", className: "text-[11px] text-green-400 font-mono leading-relaxed block whitespace-pre-wrap" }, (function () {

                      var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];

                      var stopsStr = stops.map(function (s) { return 'hsl(' + s.hue + ', 85%, 55%) ' + s.pos + '%'; }).join(',\n  ');

                      if ((d.gradType || 'linear') === 'radial') return 'radial-gradient(\n  circle,\n  ' + stopsStr + '\n)';

                      if (d.gradType === 'conic') return 'conic-gradient(\n  from 0deg,\n  ' + stopsStr + '\n)';

                      return 'linear-gradient(\n  ' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + 'deg,\n  ' + stopsStr + '\n)';

                    })())

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-3 border border-orange-200" },

                    React.createElement("button", { id: "artstudio-gradient-info-toggle", "aria-expanded": !!d.showGradInfo, "aria-controls": "artstudio-gradient-info", onClick: function () { upd('showGradInfo', !d.showGradInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-orange-700 focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 rounded" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_science_of_gradients', "\uD83C\uDFA8 The Science of Gradients")),

                      React.createElement("span", { "aria-hidden": "true" }, d.showGradInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showGradInfo && React.createElement("div", { id: "artstudio-gradient-info", role: "region", "aria-labelledby": "artstudio-gradient-info-toggle", className: "mt-3 space-y-2 text-xs text-slate-700 leading-relaxed" },

                      React.createElement("p", null, __alloT('stem.artstudio.screens_create_gradients_by_mixing', "\uD83C\uDF08 Screens create gradients by mixing "), React.createElement("strong", null, __alloT('stem.artstudio.rgb_sub_pixels', "RGB sub-pixels")), __alloT('stem.artstudio.each_pixel_blends_red_green_and_blue_l', ". Each pixel blends red, green, and blue light at different intensities. A gradient smoothly interpolates these values across space.")),

                      React.createElement("p", null, "\uD83C\uDFA8 ", React.createElement("strong", null, __alloT('stem.artstudio.hsl_interpolation', "HSL interpolation")), __alloT('stem.artstudio.produces_more_perceptually_uniform_gra', " produces more perceptually uniform gradients than RGB. Going from red to blue in RGB passes through muddy grays; in HSL, it sweeps through vivid purples \u2014 the way a painter would mix.")),

                      React.createElement("p", null, "\uD83C\uDF05 ", React.createElement("strong", null, __alloT('stem.artstudio.real_world_gradients', "Real-world gradients")), __alloT('stem.artstudio.are_everywhere_sunsets_rayleigh_scatte', " are everywhere: sunsets (Rayleigh scattering separates wavelengths), rainbows (refraction sorts light by frequency), and ocean depths (water absorbs red first, leaving deep blue).")),

                      React.createElement("p", null, "\uD83D\uDCCA ", React.createElement("strong", null, __alloT('stem.artstudio.conic_gradients', "Conic gradients")), __alloT('stem.artstudio.sweep_color_around_a_center_point_like', " sweep color around a center point like a color wheel. They\u2019re used in pie charts, loading spinners, and data visualizations. CSS only added conic-gradient support in 2020!")),

                      React.createElement("p", null, "\uD83D\uDEE0 ", React.createElement("strong", null, __alloT('stem.artstudio.designers', "Designers")), __alloT('stem.artstudio.use_gradients_to_create_depth_direct_a', " use gradients to create depth, direct attention, and evoke emotion. Warm-to-cool gradients suggest depth (atmospheric perspective); light-to-dark suggests volume (chiaroscuro)."))

                    )

                  )

                ),

                React.createElement("canvas", { id: 'gradientCanvas', width: 512, height: 512, role: "img", "aria-describedby": "artstudio-gradient-css", 'aria-label': 'Gradient output: ' + (d.gradType || 'linear') + ((d.gradType || 'linear') === 'linear' ? ' at ' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + ' degrees' : '') + ', ' + (d.gradBlend || 'smooth') + ' blend, with ' + (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).length + ' color stops: ' + (d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }]).map(function (stop) { return 'hue ' + stop.hue + ' at ' + stop.pos + ' percent'; }).join(', ') + '.', className: "rounded-xl border-2 border-rose-300 shadow-lg mx-auto block", style: { maxWidth: '100%', background: '#1e1e2e' },

                  key: 'grad-' + (d.gradType || 'linear') + '-' + (typeof d.gradAngle === 'number' ? d.gradAngle : 90) + '-' + (d.gradBlend || 'smooth') + '-' + JSON.stringify(d.gradStops || []),

                  ref: function (canvas) {

                    if (!canvas) return;

                    if (canvas._gradInit) return;

                    canvas._gradInit = true;

                    var ctx = canvas.getContext('2d');

                    var W = canvas.width, H = canvas.height;

                    var type = d.gradType || 'linear';

                    var angle = typeof d.gradAngle === 'number' ? d.gradAngle : 90;

                    var blend = d.gradBlend || 'smooth';

                    var stops = d.gradStops || [{ hue: 330, pos: 0 }, { hue: 45, pos: 100 }];



                    if (blend === 'hard') {

                      // Hard-edge gradient — fill bands

                      if (type === 'linear') {

                        var rad = angle * Math.PI / 180;

                        var cos = Math.cos(rad), sin = Math.sin(rad);

                        for (var py = 0; py < H; py++) {

                          for (var px = 0; px < W; px++) {

                            var t = ((px - W / 2) * cos + (py - H / 2) * sin) / (Math.max(W, H) * 0.5) * 0.5 + 0.5;

                            t = Math.max(0, Math.min(1, t));

                            var pos = t * 100;

                            var stopIdx = 0;

                            for (var si = 0; si < stops.length - 1; si++) {

                              if (pos >= stops[si].pos) stopIdx = si;

                            }

                            ctx.fillStyle = 'hsl(' + stops[stopIdx].hue + ',85%,55%)';

                            ctx.fillRect(px, py, 1, 1);

                          }

                        }

                      } else if (type === 'conic') {

                        var cx2 = W / 2, cy2 = H / 2;

                        for (var py2 = 0; py2 < H; py2++) {

                          for (var px2 = 0; px2 < W; px2++) {

                            var ang = (Math.atan2(py2 - cy2, px2 - cx2) * 180 / Math.PI + 360 + 90) % 360;

                            var pos2 = ang / 360 * 100;

                            var si2 = 0;

                            for (var k = 0; k < stops.length - 1; k++) { if (pos2 >= stops[k].pos) si2 = k; }

                            ctx.fillStyle = 'hsl(' + stops[si2].hue + ',85%,55%)';

                            ctx.fillRect(px2, py2, 1, 1);

                          }

                        }

                      } else {

                        var cx3 = W / 2, cy3 = H / 2;

                        var maxR = Math.sqrt(cx3 * cx3 + cy3 * cy3);

                        for (var py3 = 0; py3 < H; py3++) {

                          for (var px3 = 0; px3 < W; px3++) {

                            var dist = Math.sqrt((px3 - cx3) * (px3 - cx3) + (py3 - cy3) * (py3 - cy3));

                            var pos3 = (dist / maxR) * 100;

                            var si3 = 0;

                            for (var k2 = 0; k2 < stops.length - 1; k2++) { if (pos3 >= stops[k2].pos) si3 = k2; }

                            ctx.fillStyle = 'hsl(' + stops[si3].hue + ',85%,55%)';

                            ctx.fillRect(px3, py3, 1, 1);

                          }

                        }

                      }

                    } else {

                      // Smooth gradient using Canvas API

                      if (type === 'linear') {

                        var rad2 = angle * Math.PI / 180;

                        var len = Math.max(W, H);

                        var x1 = W / 2 - Math.cos(rad2) * len / 2;

                        var y1 = H / 2 - Math.sin(rad2) * len / 2;

                        var x2 = W / 2 + Math.cos(rad2) * len / 2;

                        var y2 = H / 2 + Math.sin(rad2) * len / 2;

                        var grad = ctx.createLinearGradient(x1, y1, x2, y2);

                        stops.forEach(function (s) { grad.addColorStop(Math.max(0, Math.min(1, s.pos / 100)), 'hsl(' + s.hue + ',85%,55%)'); });

                        ctx.fillStyle = grad;

                        ctx.fillRect(0, 0, W, H);

                      } else if (type === 'radial') {

                        var grad2 = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);

                        stops.forEach(function (s) { grad2.addColorStop(Math.max(0, Math.min(1, s.pos / 100)), 'hsl(' + s.hue + ',85%,55%)'); });

                        ctx.fillStyle = grad2;

                        ctx.fillRect(0, 0, W, H);

                      } else {

                        // Conic — render pixel-by-pixel for smooth interpolation

                        var cx4 = W / 2, cy4 = H / 2;

                        var imgData = ctx.createImageData(W, H);

                        var pxData = imgData.data;

                        function hslToRgb(h, s, l) {

                          h = h / 360; s = s / 100; l = l / 100;

                          var r3, g3, b3;

                          if (s === 0) { r3 = g3 = b3 = l; } else {

                            var hue2rgb = function (p, q, t) { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1/6) return p + (q - p) * 6 * t; if (t < 1/2) return q; if (t < 2/3) return p + (q - p) * (2/3 - t) * 6; return p; };

                            var q = l < 0.5 ? l * (1 + s) : l + s - l * s;

                            var p = 2 * l - q;

                            r3 = hue2rgb(p, q, h + 1/3); g3 = hue2rgb(p, q, h); b3 = hue2rgb(p, q, h - 1/3);

                          }

                          return [Math.round(r3 * 255), Math.round(g3 * 255), Math.round(b3 * 255)];

                        }

                        for (var py4 = 0; py4 < H; py4++) {

                          for (var px4 = 0; px4 < W; px4++) {

                            var ang2 = (Math.atan2(py4 - cy4, px4 - cx4) * 180 / Math.PI + 360 + 90) % 360;

                            var pos4 = ang2 / 360 * 100;

                            // Interpolate between stops

                            var s1 = stops[0], s2 = stops[stops.length - 1];

                            for (var k3 = 0; k3 < stops.length - 1; k3++) {

                              if (pos4 >= stops[k3].pos && pos4 <= stops[k3 + 1].pos) { s1 = stops[k3]; s2 = stops[k3 + 1]; break; }

                            }

                            var range = s2.pos - s1.pos || 1;

                            var t4 = (pos4 - s1.pos) / range;

                            var h1 = s1.hue, h2 = s2.hue;

                            var hDiff = h2 - h1; if (Math.abs(hDiff) > 180) { if (hDiff > 0) h1 += 360; else h2 += 360; }

                            var interpH = ((h1 + (h2 - h1) * t4) + 360) % 360;

                            var rgb = hslToRgb(interpH, 85, 55);

                            var idx = (py4 * W + px4) * 4;

                            pxData[idx] = rgb[0]; pxData[idx + 1] = rgb[1]; pxData[idx + 2] = rgb[2]; pxData[idx + 3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0);

                      }

                    }



                    // Decorative border glow

                    ctx.save();

                    ctx.globalCompositeOperation = 'destination-over';

                    ctx.fillStyle = '#1e1e2e';

                    ctx.fillRect(0, 0, W, H);

                    ctx.restore();

                  }

                })

              )

            ),





            // ═══ STEREOGRAM GENERATOR TAB ═══

            tab === 'stereogram' && React.createElement("div", { className: "space-y-3" },

              React.createElement("div", { className: "flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-400 mb-2", role: "group", "aria-label": "Stereogram mode" },

                React.createElement("button", { "aria-pressed": (d.stereoAnimMode || 'static') === 'static', onClick: function() { _cancelStereoAnimWork(true); updMany({ stereoAnimMode: 'static', stereoAnimPlaying: false, stereoAnimRendering: false, stereoAnimHasFrames: false, stereoAnimProgress: 0, stereoAnimAiMotionStatus: '' }); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.stereoAnimMode || 'static') === 'static' ? 'bg-white shadow-md text-cyan-700' : 'text-slate-600 hover:text-slate-700') }, __alloT('stem.artstudio.static', "\uD83D\uDCF8 Static")),

                React.createElement("button", { "aria-label": __alloT('stem.artstudio.animate', "Animate"), "aria-pressed": (d.stereoAnimMode || 'static') === 'animate', onClick: function() {
                  var staticDepthCanvas = document.getElementById('depthMapCanvas');
                  if (staticDepthCanvas) {
                    try {
                      var staticDepthData = staticDepthCanvas.getContext('2d').getImageData(0, 0, staticDepthCanvas.width, staticDepthCanvas.height);
                      upd('stereoStaticDepthSnapshot', { width: staticDepthCanvas.width, height: staticDepthCanvas.height, data: copyArtStudioPixels(staticDepthData) });
                    } catch (_) {}
                  }
                  upd('stereoAnimMode', 'animate');
                }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + ((d.stereoAnimMode || 'static') === 'animate' ? 'bg-white shadow-md text-purple-700' : 'text-slate-600 hover:text-slate-700') }, __alloT('stem.artstudio.animate_2', "\uD83C\uDFAC Animate"))

              ),

              (d.stereoAnimMode || 'static') === 'static' &&

              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", style: { alignItems: 'flex-start' } },

                React.createElement("div", { className: "space-y-3" },

                  React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200" },

                    React.createElement("h4", { className: "text-xs font-bold text-cyan-700 mb-3" }, __alloT('stem.artstudio.stereogram_generator', "\uD83D\uDC53 Stereogram Generator")),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-stereo-depth-brush-label", className: "text-[11px] font-bold text-cyan-700 block mb-1" }, __alloT('stem.artstudio.depth_brush', "Depth Brush")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-stereo-depth-brush-label" },

                        [{ id: 'near', label: __alloT('stem.artstudio.near', '\u2B1C Near') }, { id: 'mid', label: __alloT('stem.artstudio.mid', '\uD83D\uDD18 Mid') }, { id: 'far', label: __alloT('stem.artstudio.far', '\u2B1B Far') }, { id: 'erase', label: __alloT('stem.artstudio.erase', '\uD83E\uDDFD Erase') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoDepth || 'near') === s.id, onClick: function () { upd('stereoDepth', s.id); }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoDepth || 'near') === s.id ? 'bg-cyan-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-cyan-50') }, s.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("label", { htmlFor: "artstudio-stereo-brush-size", className: "text-[11px] font-bold text-cyan-700 block mb-0.5" }, "Brush Size: " + (typeof d.stereoBrush === 'number' ? d.stereoBrush : 20)),

                      React.createElement("input", { id: "artstudio-stereo-brush-size", type: "range", min: 5, max: 60, value: typeof d.stereoBrush === 'number' ? d.stereoBrush : 20, onChange: function (e) { upd('stereoBrush', parseInt(e.target.value)); }, className: "w-full accent-cyan-600" })

                    ),

                    React.createElement("div", { className: "mb-3" },

                      React.createElement("span", { id: "artstudio-stereo-pattern-label", className: "text-[11px] font-bold text-cyan-700 block mb-1" }, __alloT('stem.artstudio.pattern_type', "Pattern Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-stereo-pattern-label" },

                        [{ id: 'bw', label: __alloT('stem.artstudio.b_w', '\u26AB B&W') }, { id: 'color', label: __alloT('stem.artstudio.color', '\uD83C\uDFA8 Color') }, { id: 'noise', label: __alloT('stem.artstudio.noise', '\uD83D\uDCFA Noise') }, { id: 'ai', label: __alloT('stem.artstudio.ai', '\u2728 AI') }].map(function (s) {

                          return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoPattern || 'bw') === s.id, onClick: function () { upd('stereoPattern', s.id); if(s.id === 'ai' && !d.stereoAiPatternImg) { if(typeof addToast === 'function') addToast('Please generate an AI Pattern first!', 'warning'); } }, className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoPattern || 'bw') === s.id ? 'bg-cyan-700 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-cyan-50') }, s.label);

                        })

                      )

                    ),

                    [{ k: 'stereoStrength', label: __alloT('stem.artstudio.depth_strength', 'Depth Strength'), min: 5, max: 30, def: 15 },

                     { k: 'stereoDensity', label: __alloT('stem.artstudio.pattern_width', 'Pattern Width'), min: 60, max: 150, def: 100 }].map(function (s) {

                      var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                      return React.createElement("div", { key: s.k, className: "mb-2" },

                        React.createElement("label", { htmlFor: 'artstudio-' + s.k, className: "text-[11px] font-bold text-cyan-700 block mb-0.5" }, s.label + ': ' + val),

                        React.createElement("input", { id: 'artstudio-' + s.k, type: "range", min: s.min, max: s.max, value: val, onChange: function (e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-cyan-600" })

                      );

                    }),



                    // --- AI GENERATION ---

                    callImagen && React.createElement("div", { className: "mt-4 bg-gradient-to-br from-indigo-50 to-blue-50 p-3 rounded-lg border border-indigo-200" },

                      React.createElement("div", { className: "flex justify-between items-center mb-2" },

                        React.createElement("label", { htmlFor: "artstudio-stereo-ai-description", className: "text-[11px] font-bold text-indigo-700" }, __alloT('stem.artstudio.ai_stereogram_creator', "\u2728 AI Stereogram Creator")),

                        d.stereoAiGen && React.createElement("span", { className: "text-[11px] text-indigo-700 font-bold" + (reducedMotion ? "" : " animate-pulse") }, "Generating " + d.stereoAiGen + "...")

                      ),

                      React.createElement("textarea", {

                        id: "artstudio-stereo-ai-description",
                        value: d.stereoAiStr || '',

                        onChange: function(e) { upd('stereoAiStr', e.target.value); },

                        placeholder: __alloT('stem.artstudio.describe_an_object_for_a_depth_map_or_', "Describe an object for a depth map or a texture for a pattern..."),

                        className: "w-full text-xs p-2 rounded border border-indigo-600 focus:ring-2 focus:ring-indigo-400 mb-2 h-16 resize-none",

                        disabled: !!d.stereoAiGen

                      }),

                      React.createElement("div", { className: "flex gap-2" },

                        React.createElement("button", { "aria-label": __alloT('stem.artstudio.generate_ai_depth_map', "Generate AI Depth Map"),

                          onClick: function() {

                            if (!d.stereoAiStr) return;

                            upd('stereoAiGen', 'Depth Map');

                            callImagen('A smooth, high-quality, continuous 3D grayscale depth map of: ' + d.stereoAiStr + '. The closest parts must be pure white, and the furthest background pure black. No text, no floating artifacts. Fill the entire square frame.', 400)

                              .then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  var cvs = document.getElementById('depthMapCanvas');

                                  if(cvs) {

                                    var ztx = cvs.getContext('2d');

                                    ztx.clearRect(0, 0, cvs.width, cvs.height);

                                    ztx.drawImage(img, 0, 0, cvs.width, cvs.height);

                                  }

                                  upd('stereoAiGen', null);

                                  if(typeof addToast === 'function') addToast('\u2728 Depth map generated!', 'success');

                                };

                                img.src = base64;

                              }).catch(function(e) {

                                upd('stereoAiGen', null);

                                if(typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                              });

                          },

                          disabled: !!d.stereoAiGen || !d.stereoAiStr,

                          className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-sm"

                        }, __alloT('stem.artstudio.generate_depth_map', "\u2B1C Generate Depth Map")),

                        React.createElement("button", { "aria-label": __alloT('stem.artstudio.generate_ai_pattern_tile', "Generate AI Pattern Tile"),

                          onClick: function() {

                            if (!d.stereoAiStr) return;

                            upd('stereoAiGen', 'Pattern');

                            callImagen('A beautiful, abstract, seamless repeating pattern tile texture of: ' + d.stereoAiStr + '. No text, no borders.', 100)

                              .then(function(base64) {

                                var img = new Image();

                                img.onload = function() {

                                  // Store in state to use during render logic

                                  var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = img.width; c.height = img.height;

                                  c.getContext('2d').drawImage(img, 0, 0);

                                  upd('stereoAiPatternImg', { width: img.width, height: img.height, data: c.getContext('2d').getImageData(0,0,img.width,img.height).data });

                                  upd('stereoAiGen', null);

                                  upd('stereoPattern', 'ai');

                                  if(typeof addToast === 'function') addToast('\u2728 AI Pattern loaded and selected!', 'success');

                                };

                                img.src = base64;

                              }).catch(function(e) {

                                upd('stereoAiGen', null);

                                if(typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                              });

                          },

                          disabled: !!d.stereoAiGen || !d.stereoAiStr,

                          className: "flex-1 px-2 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"

                        }, __alloT('stem.artstudio.generate_ai_base_tile', "\uD83C\uDFA8 Generate AI Base Tile"))

                      )

                    ),



                    React.createElement("div", { className: "flex gap-2 mt-4" },

                      React.createElement("button", { onClick: function () { upd('stereoGen', Date.now()); if (typeof announceToSR === 'function') announceToSR('Rendering stereogram from the current depth map.'); }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-700 to-teal-700 text-white hover:from-cyan-700 hover:to-teal-700 shadow-md transition-all" }, __alloT('stem.artstudio.render_stereogram', "\uD83D\uDC53 Render Stereogram")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.clear_9', "Clear"), onClick: function () { upd('stereoClear', Date.now()); upd('stereoPreset', null); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_10', "\uD83D\uDDD1 Clear"))

                    ),

                    React.createElement("div", { className: "flex gap-1 mt-3 flex-wrap", role: "group", "aria-labelledby": "artstudio-stereo-presets-label" },

                      React.createElement("span", { id: "artstudio-stereo-presets-label", className: "text-[11px] font-bold text-cyan-700 mr-1" }, "Presets:"),

                      [{ label: __alloT('stem.artstudio.sphere', 'Sphere'), id: 'sphere' }, { label: __alloT('stem.artstudio.pyramid', 'Pyramid'), id: 'pyramid' }, { label: __alloT('stem.artstudio.heart', 'Heart'), id: 'heart' }, { label: __alloT('stem.artstudio.hi_text', 'HI Text'), id: 'text' }, { label: __alloT('stem.artstudio.rings_2', 'Rings'), id: 'rings' }].map(function (pr) {

                        return React.createElement("button", { "aria-label": 'Use ' + pr.label + ' depth-map preset', "aria-pressed": d.stereoPreset === pr.id, key: pr.id, onClick: function () { upd('stereoPreset', pr.id); upd('stereoClear', Date.now()); setTimeout(function () { upd('stereoGen', Date.now()); }, 150); }, className: "px-2 py-1 rounded-lg text-[11px] font-bold bg-white text-cyan-700 border border-cyan-600 hover:bg-cyan-50 transition-all" }, pr.label);

                      })

                    ),

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_stereogram_2', "Export Stereogram"), onClick: function () { var c = document.getElementById('stereoCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'stereogram-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 PNG exported!', 'success'); }, className: "w-full mt-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-all" }, __alloT('stem.artstudio.export_stereogram_3', "\uD83D\uDCE5 Export Stereogram"))

                  ),

                  React.createElement("div", { className: "relative" },

                    React.createElement("p", { className: "text-[11px] font-bold text-cyan-700 mb-1" }, __alloT('stem.artstudio.depth_map_canvas', "\uD83C\uDFA8 Depth Map Canvas")),

                    React.createElement("p", { id: "artstudio-depth-map-legend", className: "text-[11px] text-slate-600 mb-1" }, __alloT('stem.artstudio.white_pops_out_gray_middle_black_far', "White = pops out \u2022 Gray = middle \u2022 Black = far")),

                    React.createElement("p", { id: "artstudio-depth-map-keyboard-help", className: "text-[11px] text-slate-700 mb-1" }, "Keyboard: Arrow keys move the drawing cursor; hold Shift with an Arrow key to draw; Space or Enter stamps the brush; Home returns to center; Alt makes one-pixel moves."),

                    React.createElement("canvas", { id: 'depthMapCanvas', width: 400, height: 400,
                      tabIndex: 0,
                      role: "img",
                      "aria-label": "Depth map drawing canvas. Current brush is " + (d.stereoDepth || 'near') + ". White is near, gray is middle, and black is far.",
                      "aria-describedby": "artstudio-depth-map-legend artstudio-depth-map-keyboard-help",
                      "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",

                      key: 'dm-' + (d.stereoClear || 0),

                      className: "rounded-xl border-2 border-cyan-200 shadow-lg cursor-crosshair block focus-visible:ring-4 focus-visible:ring-cyan-600 focus-visible:ring-offset-2", style: { maxWidth: '100%', background: '#000000' },

                      ref: function (canvas) {

                        if (!canvas) return;

                        var ctx = canvas.getContext('2d');

                        var W = canvas.width, H = canvas.height;

                        if (!canvas._dmInit) {

                          canvas._dmInit = true;

                          ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, W, H);

                          var preset = d.stereoPreset;

                          if (preset === 'sphere') {

                            var grad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, Math.min(W,H)*0.35);

                            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.7, '#888888'); grad.addColorStop(1, '#000000');

                            ctx.beginPath(); ctx.arc(W/2, H/2, Math.min(W,H)*0.35, 0, Math.PI*2); ctx.fillStyle = grad; ctx.fill();

                          } else if (preset === 'pyramid') {

                            ctx.beginPath(); ctx.moveTo(W/2, H*0.15); ctx.lineTo(W*0.2, H*0.85); ctx.lineTo(W*0.8, H*0.85); ctx.closePath();

                            var pgr = ctx.createLinearGradient(W/2, H*0.15, W/2, H*0.85);

                            pgr.addColorStop(0, '#ffffff'); pgr.addColorStop(1, '#555555'); ctx.fillStyle = pgr; ctx.fill();

                          } else if (preset === 'heart') {

                            ctx.save(); ctx.translate(W/2, H*0.45);

                            var sc = Math.min(W,H) * 0.012; ctx.scale(sc, -sc);

                            ctx.beginPath();

                            for (var ht = 0; ht <= Math.PI * 2; ht += 0.01) {

                              var hx = 16 * Math.pow(Math.sin(ht), 3);

                              var hy = 13 * Math.cos(ht) - 5 * Math.cos(2*ht) - 2 * Math.cos(3*ht) - Math.cos(4*ht);

                              if (ht === 0) ctx.moveTo(hx, hy); else ctx.lineTo(hx, hy);

                            }

                            ctx.closePath(); ctx.restore(); ctx.fillStyle = '#ffffff'; ctx.fill();

                          } else if (preset === 'text') {

                            ctx.fillStyle = '#ffffff'; ctx.font = 'bold ' + Math.round(H * 0.45) + 'px Arial';

                            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('HI', W/2, H/2);

                          } else if (preset === 'rings') {

                            for (var ri = 3; ri > 0; ri--) {

                              var rr = ri * Math.min(W,H) * 0.12;

                              var brt = Math.round((4 - ri) / 3 * 255);

                              ctx.beginPath(); ctx.arc(W/2, H/2, rr, 0, Math.PI*2);

                              ctx.lineWidth = 20; ctx.strokeStyle = 'rgb(' + brt + ',' + brt + ',' + brt + ')'; ctx.stroke();

                            }

                          }

                        }

                        var depthLevel = d.stereoDepth || 'near';

                        var brushSz = typeof d.stereoBrush === 'number' ? d.stereoBrush : 20;

                        var depthColors = { near: '#ffffff', mid: '#999999', far: '#333333', erase: '#000000' };

                        var painting = false;

                        var keyboardCursor = canvas._depthKeyboardCursor || { x: W / 2, y: H / 2 };

                        keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));

                        keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));

                        canvas._depthKeyboardCursor = keyboardCursor;

                        function updateDepthKeyboardCursor(show) {

                          var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-depth-keyboard-cursor="true"]');

                          if (cursor) {

                            var displayW = canvas.clientWidth || W;

                            var displayH = canvas.clientHeight || H;

                            cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                            cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                            cursor.style.display = show ? 'block' : 'none';

                          }

                          canvas.setAttribute('aria-label', 'Depth map drawing canvas. Current brush is ' + depthLevel +

                            '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                        }

                        function getP(e) {

                          var rect = canvas.getBoundingClientRect();

                          var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                          var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                          return { x: ex * (W / rect.width), y: ey * (H / rect.height) };

                        }

                        function doBrush(pos) {

                          ctx.beginPath(); ctx.arc(pos.x, pos.y, brushSz, 0, Math.PI * 2);

                          ctx.fillStyle = depthColors[depthLevel]; ctx.fill();

                        }

                        function doBrushLine(from, to) {

                          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);

                          ctx.lineWidth = brushSz * 2; ctx.lineCap = 'round';

                          ctx.strokeStyle = depthColors[depthLevel]; ctx.stroke();

                        }

                        canvas.onmousedown = canvas.ontouchstart = function (e) { e.preventDefault(); painting = true; doBrush(getP(e)); };

                        canvas.onmousemove = canvas.ontouchmove = function (e) { if (painting) doBrush(getP(e)); };

                        canvas.onmouseup = canvas.ontouchend = function () { painting = false; };

                        canvas.onmouseleave = function () { painting = false; };

                        canvas.onfocus = function () { updateDepthKeyboardCursor(true); };

                        canvas.onblur = function () { updateDepthKeyboardCursor(false); };

                        canvas.onkeydown = function (event) {

                          var step = event.altKey ? 1 : 10;

                          var previous = { x: keyboardCursor.x, y: keyboardCursor.y };

                          var moved = true;

                          if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                          else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                          else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                          else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                          else if (event.key === 'Home') { keyboardCursor.x = W / 2; keyboardCursor.y = H / 2; }

                          else moved = false;

                          if (moved) {

                            event.preventDefault();

                            if (event.shiftKey) doBrushLine(previous, keyboardCursor);

                            canvas._depthKeyboardCursor = keyboardCursor;

                            updateDepthKeyboardCursor(true);

                            if (typeof announceToSR === 'function') {

                              announceToSR((event.shiftKey ? 'Drew depth to' : 'Depth cursor') + ' x ' + Math.round(keyboardCursor.x) +

                                ', y ' + Math.round(keyboardCursor.y) + '.');

                            }

                            return;

                          }

                          if (event.key === 'Enter' || event.key === ' ') {

                            event.preventDefault(); doBrush(keyboardCursor);

                            if (typeof announceToSR === 'function') announceToSR('Stamped ' + depthLevel + ' depth at x ' +

                              Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                          }

                        };

                        updateDepthKeyboardCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                      }

                    }),

                    React.createElement("span", {

                      "data-depth-keyboard-cursor": "true",

                      "aria-hidden": "true",

                      className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#0891b2]",

                      style: { display: 'none' }

                    })

                  ),

                  React.createElement("div", { className: "flex gap-2 mt-2" },

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.save_depth_map_png', "Save Depth Map PNG"), onClick: function () { var c = document.getElementById('depthMapCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'depth-map-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Depth map saved as PNG!', 'success'); }, className: "flex-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-200 hover:from-indigo-100 hover:to-purple-100 transition-all" }, __alloT('stem.artstudio.save_depth_map_png_2', "\u2B07\uFE0F Save Depth Map PNG"))

                  ),

                  React.createElement("div", { className: "bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-3 border border-teal-200" },

                    React.createElement("button", { "aria-expanded": !!d.showStereoInfo, "aria-controls": "artstudio-stereogram-science", onClick: function () { upd('showStereoInfo', !d.showStereoInfo); }, className: "w-full flex items-center justify-between text-xs font-bold text-teal-700" },

                      React.createElement("span", null, __alloT('stem.artstudio.the_science_of_stereograms', "\uD83E\uDDE0 The Science of Stereograms")),

                      React.createElement("span", null, d.showStereoInfo ? '\u25B2' : '\u25BC')

                    ),

                    d.showStereoInfo && React.createElement("div", { id: "artstudio-stereogram-science", className: "mt-3 space-y-2 text-xs text-slate-600 leading-relaxed" },

                      React.createElement("p", null, "\uD83D\uDC40 ", React.createElement("strong", null, __alloT('stem.artstudio.your_eyes_are_6_cm_apart', "Your eyes are ~6 cm apart")), __alloT('stem.artstudio.so_each_sees_the_world_from_a_slightly', ", so each sees the world from a slightly different angle. Your brain fuses these two views to perceive "), React.createElement("strong", null, "depth"), __alloT('stem.artstudio.this_is_called', " \u2014 this is called "), React.createElement("strong", null, "stereopsis"), "."),

                      React.createElement("p", null, "\uD83D\uDC53 ", React.createElement("strong", null, __alloT('stem.artstudio.autostereograms', "Autostereograms")), __alloT('stem.artstudio.magic_eye_images_hide_3d_shapes_in_a_r', " (Magic Eye\u2122 images) hide 3D shapes in a repeating pattern. The trick: where the hidden object is \u2018close,\u2019 the pattern repeats with a "), React.createElement("strong", null, __alloT('stem.artstudio.shorter_period', "shorter period")), __alloT('stem.artstudio.where_it_s_far_the_period_is_longer_yo', "; where it\u2019s \u2018far,\u2019 the period is longer. Your brain decodes these period differences as depth.")),

                      React.createElement("p", null, "\uD83D\uDCDA ", React.createElement("strong", null, __alloT('stem.artstudio.magic_eye_books', "Magic Eye books")), __alloT('stem.artstudio.1993_94_by_tom_baccei_and_cheri_smith_', " (1993\u201394) by Tom Baccei and Cheri Smith sold over 25 million copies worldwide. The underlying autostereogram technique was pioneered by Dr. Christopher Tyler in 1979.")),

                      React.createElement("p", null, __alloT('stem.artstudio.to_see_the_image_hold_your_face_close_', "\uD83E\uDDE0 To see the image: hold your face close to the screen, relax your eyes as if looking \u2018through\u2019 the image at a distant wall, then slowly pull back. The 3D shape will \u2018pop\u2019 into view. This is called "), React.createElement("strong", null, __alloT('stem.artstudio.wall_eyed_parallel_viewing', "wall-eyed (parallel) viewing")), "."),

                      React.createElement("p", null, __alloT('stem.artstudio.about', "\u26A0 About "), React.createElement("strong", null, __alloT('stem.artstudio.5_10_of_people', "5\u201310% of people")), __alloT('stem.artstudio.have_difficulty_seeing_stereograms_due', " have difficulty seeing stereograms due to conditions like amblyopia (lazy eye), strabismus (crossed eyes), or other binocular vision differences. This is completely normal!"))

                    )

                  )

                ),

                React.createElement("div", { className: "space-y-2" },

                  React.createElement("p", { className: "text-xs font-bold text-teal-700" }, __alloT('stem.artstudio.stereogram_output', "\uD83D\uDC53 Stereogram Output")),

                  React.createElement("p", { id: "artstudio-stereogram-output-help", className: "text-[11px] text-slate-600 mb-1" }, __alloT('stem.artstudio.relax_your_eyes_and_look_through_the_i', "Relax your eyes and look \u2018through\u2019 the image to see 3D")),

                  React.createElement("canvas", { id: 'stereoCanvas', width: 512, height: 512,
                    role: "img",
                    "aria-label": "Stereogram output using the " + (d.stereoPattern || 'black and white') + " pattern and " + (d.stereoPreset || 'drawn') + " depth map.",
                    "aria-describedby": "artstudio-stereogram-output-help",

                    key: 'stereo-' + (d.stereoGen || 0),

                    className: "rounded-xl border-2 border-teal-200 shadow-lg block", style: { maxWidth: '100%', background: '#111' },

                    ref: function (canvas) {

                      if (!canvas) return;

                      if (canvas._stereoInit) return;

                      canvas._stereoInit = true;

                      var ctx = canvas.getContext('2d');

                      var W = canvas.width, H = canvas.height;

                      var patternType = d.stereoPattern || 'bw';

                      var patternWidth = typeof d.stereoDensity === 'number' ? d.stereoDensity : 100;

                      var maxShift = typeof d.stereoStrength === 'number' ? d.stereoStrength : 15;

                      var dmCanvas = document.getElementById('depthMapCanvas');

                      if (!dmCanvas) {

                        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);

                        ctx.fillStyle = '#444'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

                        ctx.fillText('Draw on the depth map, then click Generate', W/2, H/2);

                        return;

                      }

                      var dmCtx = dmCanvas.getContext('2d');

                      var dmData = dmCtx.getImageData(0, 0, dmCanvas.width, dmCanvas.height).data;

                      var dmW = dmCanvas.width, dmH = dmCanvas.height;

                      function makeRng(seed) {

                        var s = seed; return function () { s = (s * 1664525 + 1013904223) & 0x7FFFFFFF; return s / 0x7FFFFFFF; };

                      }

                      var imgData = ctx.createImageData(W, H);

                      var data = imgData.data;

                      var rowsDone = 0;

                      function renderChunk() {

                        var endRow = Math.min(rowsDone + 32, H);

                        for (var y = rowsDone; y < endRow; y++) {

                          var rng = makeRng(y * 7919 + 12345);

                          var row = new Uint8Array(W * 3);

                          for (var x = 0; x < W; x++) {

                            if (x < patternWidth) {

                              if (patternType === 'bw') { var c = rng() > 0.5 ? 230 : 25; row[x*3] = c; row[x*3+1] = c; row[x*3+2] = c; }

                              else if (patternType === 'color') { row[x*3] = Math.floor(rng()*200)+55; row[x*3+1] = Math.floor(rng()*200)+55; row[x*3+2] = Math.floor(rng()*200)+55; }

                              else if (patternType === 'ai' && d.stereoAiPatternImg) {

                                var pw = d.stereoAiPatternImg.width, ph = d.stereoAiPatternImg.height;

                                var pIdx = ((y % ph) * pw + (x % pw)) * 4;

                                row[x*3] = d.stereoAiPatternImg.data[pIdx]; row[x*3+1] = d.stereoAiPatternImg.data[pIdx+1]; row[x*3+2] = d.stereoAiPatternImg.data[pIdx+2];

                              }

                              else { var v = Math.floor(rng() * 220) + 20; row[x*3] = v; row[x*3+1] = v; row[x*3+2] = v; }

                            } else {

                              var dx = Math.floor(x * dmW / W), dy = Math.floor(y * dmH / H);

                              var di = (dy * dmW + dx) * 4;

                              var depth = dmData[di] / 255;

                              var shift = Math.round(depth * maxShift);

                              var srcX = x - patternWidth + shift;

                              if (srcX >= 0) { row[x*3] = row[srcX*3]; row[x*3+1] = row[srcX*3+1]; row[x*3+2] = row[srcX*3+2]; }

                              else {

                                if (patternType === 'bw') { var c2 = rng() > 0.5 ? 230 : 25; row[x*3] = c2; row[x*3+1] = c2; row[x*3+2] = c2; }

                                else if (patternType === 'color') { row[x*3] = Math.floor(rng()*200)+55; row[x*3+1] = Math.floor(rng()*200)+55; row[x*3+2] = Math.floor(rng()*200)+55; }

                                else if (patternType === 'ai' && d.stereoAiPatternImg) {

                                  var pw2 = d.stereoAiPatternImg.width, ph2 = d.stereoAiPatternImg.height;

                                  var pIdx2 = ((y % ph2) * pw2 + (x % pw2)) * 4;

                                  row[x*3] = d.stereoAiPatternImg.data[pIdx2]; row[x*3+1] = d.stereoAiPatternImg.data[pIdx2+1]; row[x*3+2] = d.stereoAiPatternImg.data[pIdx2+2];

                                }

                                else { var v2 = Math.floor(rng()*220)+20; row[x*3] = v2; row[x*3+1] = v2; row[x*3+2] = v2; }

                              }

                            }

                          }

                          for (var x2 = 0; x2 < W; x2++) {

                            var idx = (y * W + x2) * 4;

                            data[idx] = row[x2*3]; data[idx+1] = row[x2*3+1]; data[idx+2] = row[x2*3+2]; data[idx+3] = 255;

                          }

                        }

                        ctx.putImageData(imgData, 0, 0, 0, rowsDone, W, endRow - rowsDone);

                        rowsDone = endRow;

                        if (rowsDone < H && canvas.isConnected) canvas._stereoAnim = requestAnimationFrame(renderChunk);

                      }

                      renderChunk();

                    }

                  }),

                  React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-2" },

                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, __alloT('stem.artstudio.how_to_view', "\uD83D\uDCA1 How to View")),

                    React.createElement("ol", { className: "text-[11px] text-slate-600 leading-relaxed list-decimal ml-4 space-y-0.5" },

                      React.createElement("li", null, __alloT('stem.artstudio.hold_your_face_close_to_the_screen', "Hold your face close to the screen")),

                      React.createElement("li", null, __alloT('stem.artstudio.relax_your_eyes_try_to_look_through_th', "Relax your eyes \u2014 try to look \u2018through\u2019 the image at a wall behind it")),

                      React.createElement("li", null, __alloT('stem.artstudio.slowly_move_back_a_3d_shape_will_emerg', "Slowly move back. A 3D shape will emerge!")),

                      React.createElement("li", null, __alloT('stem.artstudio.tip_the_two_guide_dots_above_should_ap', "Tip: the two guide dots above should appear as three when your eyes are set correctly"))

                    )

                  )

                )

              )

            ),

              (d.stereoAnimMode || 'static') === 'animate' && React.createElement("div", { className: "space-y-3" },

                React.createElement("div", { className: "bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200" },

                  React.createElement("h4", { className: "text-xs font-bold text-purple-700 mb-3" }, __alloT('stem.artstudio.animated_stereogram_studio', "\uD83C\uDFAC Animated Stereogram Studio")),

                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" }, __alloT('stem.artstudio.create_animated_3d_stereograms_from_pr', "Create animated 3D stereograms from presets, custom drawings, uploaded images, transforms, or AI-generated depth maps!")),



                  // ═══ SOURCE MODE SELECTOR ═══

                  React.createElement("div", { className: "mb-3" },

                    React.createElement("span", { id: "artstudio-animation-source-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.animation_source', "\uD83D\uDCE1 Animation Source")),

                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1", role: "group", "aria-labelledby": "artstudio-animation-source-label" },

                      [{ id: 'preset', icon: '\u2728', label: __alloT('stem.artstudio.preset', 'Preset') }, { id: 'draw', icon: '\u270F\uFE0F', label: __alloT('stem.artstudio.draw', 'Draw') }, { id: 'upload', icon: '\uD83D\uDCC2', label: __alloT('stem.artstudio.upload', 'Upload') }, { id: 'transform', icon: '\uD83D\uDD04', label: __alloT('stem.artstudio.transform', 'Transform') }, { id: 'ai', icon: '\uD83E\uDD16', label: __alloT('stem.artstudio.ai_depth', 'AI Depth') }].map(function(s) {

                        return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoAnimSource || 'preset') === s.id, onClick: function() { upd('stereoAnimSource', s.id); },

                          className: "px-2 py-2 rounded-lg text-[11px] font-bold transition-all text-center " + ((d.stereoAnimSource || 'preset') === s.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50')

                        }, s.icon + ' ' + s.label);

                      })

                    )

                  ),



                  // ═══ PRESET SOURCE (existing behavior) ═══

                  (d.stereoAnimSource || 'preset') === 'preset' && React.createElement("div", { className: "mb-3" },

                    React.createElement("span", { id: "artstudio-animation-preset-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.animation_presets', "\u2728 Animation Presets")),

                    React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1", role: "group", "aria-labelledby": "artstudio-animation-preset-label" },

                      [{ id: 'pulseSphere', icon: '\uD83D\uDCAB', label: __alloT('stem.artstudio.pulse', 'Pulse') }, { id: 'spinCube', icon: '\uD83D\uDD04', label: __alloT('stem.artstudio.spin_cube', 'Spin Cube') }, { id: 'waveRipple', icon: '\uD83C\uDF0A', label: __alloT('stem.artstudio.wave', 'Wave') }, { id: 'morphHeart', icon: '\uD83D\uDC93', label: __alloT('stem.artstudio.heart_2', 'Heart') }, { id: 'floatText', icon: '\u2702\uFE0F', label: __alloT('stem.artstudio.3d_text', '3D Text') }].map(function(p) {

                        return React.createElement("button", { key: p.id, "aria-pressed": d.stereoAnimPreset === p.id, onClick: function() { upd('stereoAnimPreset', p.id); },

                          className: "px-2 py-2 rounded-lg text-[11px] font-bold transition-all text-center " + (d.stereoAnimPreset === p.id ? 'bg-purple-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50')

                        }, p.icon + ' ' + p.label);

                      })

                    )

                  ),



                  // ═══ CUSTOM DRAW SOURCE ═══

                  (d.stereoAnimSource) === 'draw' && React.createElement("div", { className: "relative mb-3 space-y-2" },

                    React.createElement("h5", { className: "text-[11px] font-bold text-purple-700 block" }, __alloT('stem.artstudio.draw_depth_keyframes', "\u270F\uFE0F Draw Depth Keyframes")),

                    React.createElement("p", { id: "artstudio-anim-draw-description", className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.draw_a_depth_map_capture_it_as_a_keyfr', "Draw a depth map, capture it as a keyframe, then draw the next. The animation will interpolate between them.")),

                    React.createElement("p", { id: "artstudio-anim-draw-keyboard-help", className: "text-[11px] text-slate-700" }, "Keyboard: Arrow keys move the drawing cursor; hold Shift with an Arrow key to draw; Space or Enter stamps the brush; Home returns to center; Alt makes one-pixel moves."),

                    React.createElement("div", { className: "flex gap-1 mb-2", role: "group", "aria-label": "Animation depth brush" },

                      [{ id: 'near', label: __alloT('stem.artstudio.near_2', '\u2B1C Near'), c: '#ffffff' }, { id: 'mid', label: __alloT('stem.artstudio.mid_2', '\uD83D\uDD18 Mid'), c: '#888888' }, { id: 'far', label: __alloT('stem.artstudio.far_2', '\u2B1B Far'), c: '#222222' }, { id: 'erase', label: __alloT('stem.artstudio.erase_2', '\uD83E\uDDFD Erase'), c: '#000000' }].map(function(s2) {

                        return React.createElement("button", { key: s2.id, "aria-pressed": (d.stereoAnimDrawBrush || 'near') === s2.id, onClick: function() { upd('stereoAnimDrawBrush', s2.id); },

                          className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoAnimDrawBrush || 'near') === s2.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, s2.label);

                      })

                    ),

                    React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                      React.createElement("label", { htmlFor: "artstudio-anim-draw-size", className: "text-[11px] font-bold text-purple-700" }, "Brush: " + (d.stereoAnimDrawSize || 20)),

                      React.createElement("input", { id: "artstudio-anim-draw-size", type: "range", min: 5, max: 60, value: d.stereoAnimDrawSize || 20, onChange: function(e) { upd('stereoAnimDrawSize', parseInt(e.target.value)); }, className: "flex-1 accent-purple-600" })

                    ),

                    React.createElement("canvas", { id: 'stereoAnimDrawCanvas', width: 400, height: 400,
                      tabIndex: 0,
                      role: "img",
                      "aria-label": "Animation depth-map drawing canvas. Current brush is " + (d.stereoAnimDrawBrush || 'near') + ".",
                      "aria-describedby": "artstudio-anim-draw-description artstudio-anim-draw-keyboard-help",
                      "aria-keyshortcuts": "ArrowUp ArrowDown ArrowLeft ArrowRight Shift+ArrowUp Shift+ArrowDown Shift+ArrowLeft Shift+ArrowRight Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight Home Enter Space",

                      key: 'anim-draw-' + (d.stereoAnimDrawClear || 0),

                      className: "rounded-xl border-2 border-purple-200 shadow-lg cursor-crosshair block mx-auto focus-visible:ring-4 focus-visible:ring-purple-600 focus-visible:ring-offset-2", style: { maxWidth: '100%', background: '#000' },

                      ref: function(canvas) {

                        if (!canvas) return;

                        var ctx = canvas.getContext('2d');

                        var W = canvas.width, H = canvas.height;

                        if (!canvas._drawInit) {

                          canvas._drawInit = true;

                          ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);

                        }

                        var drawing = false;

                        var keyboardCursor = canvas._animDepthKeyboardCursor || { x: W / 2, y: H / 2 };

                        keyboardCursor.x = Math.max(0, Math.min(W, keyboardCursor.x));

                        keyboardCursor.y = Math.max(0, Math.min(H, keyboardCursor.y));

                        canvas._animDepthKeyboardCursor = keyboardCursor;

                        function updateAnimDepthCursor(show) {

                          var cursor = canvas.parentElement && canvas.parentElement.querySelector('[data-anim-depth-keyboard-cursor="true"]');

                          if (cursor) {

                            var displayW = canvas.clientWidth || W;

                            var displayH = canvas.clientHeight || H;

                            cursor.style.left = ((canvas.offsetLeft || 0) + keyboardCursor.x / W * displayW - 10) + 'px';

                            cursor.style.top = ((canvas.offsetTop || 0) + keyboardCursor.y / H * displayH - 10) + 'px';

                            cursor.style.display = show ? 'block' : 'none';

                          }

                          canvas.setAttribute('aria-label', 'Animation depth-map drawing canvas. Current brush is ' +

                            (d.stereoAnimDrawBrush || 'near') + '. Keyboard cursor at x ' + Math.round(keyboardCursor.x) +

                            ', y ' + Math.round(keyboardCursor.y) + '.');

                        }

                        function getColor() {

                          var b = d.stereoAnimDrawBrush || 'near';

                          if (b === 'near') return '#ffffff';

                          if (b === 'mid') return '#888888';

                          if (b === 'far') return '#222222';

                          return '#000000';

                        }

                        function paintAt(x, y) {

                          var size = d.stereoAnimDrawSize || 20;

                          ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2);

                          ctx.fillStyle = getColor(); ctx.fill();

                        }

                        function paint(e) {

                          var rect = canvas.getBoundingClientRect();

                          var ex = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;

                          var ey = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;

                          paintAt(ex * (W / rect.width), ey * (H / rect.height));

                        }

                        function paintLine(from, to) {

                          ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y);

                          ctx.lineWidth = (d.stereoAnimDrawSize || 20) * 2; ctx.lineCap = 'round';

                          ctx.strokeStyle = getColor(); ctx.stroke();

                        }

                        canvas.onmousedown = canvas.ontouchstart = function(e) { e.preventDefault(); drawing = true; paint(e); };

                        canvas.onmousemove = canvas.ontouchmove = function(e) { if (drawing) { e.preventDefault(); paint(e); } };

                        canvas.onmouseup = canvas.ontouchend = function() { drawing = false; };

                        canvas.onmouseleave = function() { drawing = false; };

                        canvas.onfocus = function() { updateAnimDepthCursor(true); };

                        canvas.onblur = function() { updateAnimDepthCursor(false); };

                        canvas.onkeydown = function(event) {

                          var step = event.altKey ? 1 : 10;

                          var previous = { x: keyboardCursor.x, y: keyboardCursor.y };

                          var moved = true;

                          if (event.key === 'ArrowLeft') keyboardCursor.x = Math.max(0, keyboardCursor.x - step);

                          else if (event.key === 'ArrowRight') keyboardCursor.x = Math.min(W, keyboardCursor.x + step);

                          else if (event.key === 'ArrowUp') keyboardCursor.y = Math.max(0, keyboardCursor.y - step);

                          else if (event.key === 'ArrowDown') keyboardCursor.y = Math.min(H, keyboardCursor.y + step);

                          else if (event.key === 'Home') { keyboardCursor.x = W / 2; keyboardCursor.y = H / 2; }

                          else moved = false;

                          if (moved) {

                            event.preventDefault();

                            if (event.shiftKey) paintLine(previous, keyboardCursor);

                            canvas._animDepthKeyboardCursor = keyboardCursor;

                            updateAnimDepthCursor(true);

                            if (typeof announceToSR === 'function') announceToSR((event.shiftKey ? 'Drew animation depth to' : 'Animation depth cursor') +

                              ' x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                            return;

                          }

                          if (event.key === 'Enter' || event.key === ' ') {

                            event.preventDefault(); paintAt(keyboardCursor.x, keyboardCursor.y);

                            if (typeof announceToSR === 'function') announceToSR('Stamped ' + (d.stereoAnimDrawBrush || 'near') +

                              ' animation depth at x ' + Math.round(keyboardCursor.x) + ', y ' + Math.round(keyboardCursor.y) + '.');

                          }

                        };

                        updateAnimDepthCursor(typeof document !== 'undefined' && document.activeElement === canvas);

                      }

                    }),

                    React.createElement("span", {

                      "data-anim-depth-keyboard-cursor": "true",

                      "aria-hidden": "true",

                      className: "pointer-events-none absolute z-10 h-5 w-5 rounded-full border-4 border-white shadow-[0_0_0_2px_#7e22ce]",

                      style: { display: 'none' }

                    }),

                    React.createElement("div", { className: "flex flex-wrap gap-2 mt-2" },

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.capture_keyframe', "Capture Keyframe"), onClick: function() {

                        var c = document.getElementById('stereoAnimDrawCanvas');

                        if (!c) return;

                        var imgData = c.getContext('2d').getImageData(0, 0, c.width, c.height);

                        var kf = d.stereoAnimKeyframes ? d.stereoAnimKeyframes.slice() : [];

                        if (kf.length >= ART_STUDIO_MAX_ANIM_KEYFRAMES) {

                          if (typeof addToast === 'function') addToast('Keep up to ' + ART_STUDIO_MAX_ANIM_KEYFRAMES + ' keyframes. Remove one before capturing another.', 'warning');

                          if (typeof announceToSR === 'function') announceToSR('Keyframe limit reached. Remove a keyframe before capturing another.');

                          return;

                        }

                        kf.push({ width: c.width, height: c.height, data: copyArtStudioPixels(imgData) });

                        upd('stereoAnimKeyframes', kf);

                        if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Keyframe ' + kf.length + ' captured!', 'success');
                        if (typeof announceToSR === 'function') announceToSR('Keyframe ' + kf.length + ' captured.');

                      }, className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-green-700 to-emerald-700 text-white hover:from-green-800 hover:to-emerald-800 shadow-sm" }, __alloT('stem.artstudio.capture_keyframe_2', "\uD83D\uDCF8 Capture Keyframe")),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.clear_canvas', "Clear Canvas"), onClick: function() {

                        var c = document.getElementById('stereoAnimDrawCanvas');

                        if (c) { var ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height); if (typeof announceToSR === 'function') announceToSR('Animation depth canvas cleared.'); }

                      }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200" }, __alloT('stem.artstudio.clear_canvas_2', "\uD83D\uDDD1 Clear Canvas")),

                      React.createElement("button", { onClick: function() { upd('stereoAnimKeyframes', []); if (typeof announceToSR === 'function') announceToSR('All animation keyframes cleared.'); }, className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100" }, __alloT('stem.artstudio.clear_all_frames', "\u274C Clear All Frames")),

                      React.createElement("button", { onClick: function() { var c = document.getElementById('stereoAnimDrawCanvas'); if (!c) return; var link = document.createElement('a'); link.download = 'depth-drawing-' + Date.now() + '.png'; link.href = c.toDataURL('image/png'); link.click(); if (typeof addToast === 'function') addToast('\uD83D\uDCE5 Drawing saved as PNG!', 'success'); }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border border-indigo-600 hover:from-indigo-100 hover:to-purple-100 transition-all" }, __alloT('stem.artstudio.save_drawing_png', "\u2B07\uFE0F Save Drawing PNG")),

                      (d.stereoAnimKeyframes && d.stereoAnimKeyframes.length >= 2) && React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_depth_map_gif', "Export Depth Map GIF"), onClick: function() {

                        var kfs = d.stereoAnimKeyframes;

                        if (!kfs || kfs.length < 2) { if (typeof addToast === 'function') addToast('Need at least 2 keyframes for GIF!', 'warning'); return; }

                        if (typeof addToast === 'function') addToast('\u23F3 Building depth map GIF...', 'info');

                        var totalFrames = 24;

                        var canvasFrames = [];

                        var tempCanvas = document.createElement('canvas'); tempCanvas.setAttribute('aria-hidden', 'true'); tempCanvas.width = kfs[0].width; tempCanvas.height = kfs[0].height;

                        var tempCtx = tempCanvas.getContext('2d');

                        for (var fi = 0; fi < totalFrames; fi++) {

                          var interpData = _interpolateDepthMaps(

                            kfs.map(function(kf) { var id = tempCtx.createImageData(kf.width, kf.height); for (var p = 0; p < kf.data.length; p++) id.data[p] = kf.data[p]; return id; }),

                            fi, totalFrames

                          );

                          tempCtx.putImageData(interpData, 0, 0);

                          canvasFrames.push(tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height));

                        }

                        _exportStereoGif(canvasFrames, 8);

                      }, className: "px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border border-emerald-600 hover:from-emerald-100 hover:to-teal-100 transition-all" }, __alloT('stem.artstudio.export_depth_gif', "\uD83C\uDFAC Export Depth GIF"))

                    ),

                    (d.stereoAnimKeyframes && d.stereoAnimKeyframes.length > 0) && React.createElement("div", { className: "mt-2" },

                      React.createElement("p", { role: "status", "aria-live": "polite", className: "text-[11px] font-bold text-purple-700 mb-1" }, "\uD83C\uDFAC Keyframes: " + d.stereoAnimKeyframes.length),

                      React.createElement("div", { className: "flex gap-1 flex-wrap" },

                        d.stereoAnimKeyframes.map(function(kf, idx) {

                          return React.createElement("div", { key: idx, className: "relative" },

                            React.createElement("canvas", { width: 60, height: 60, role: "img", "aria-label": "Depth-map keyframe " + (idx + 1) + " of " + d.stereoAnimKeyframes.length, className: "rounded border border-purple-200", ref: function(c) {

                              if (!c) return;

                              var ctx = c.getContext('2d');

                              var imgData = ctx.createImageData(kf.width, kf.height);

                              for (var i = 0; i < kf.data.length; i++) imgData.data[i] = kf.data[i];

                              var temp = document.createElement('canvas'); temp.setAttribute('aria-hidden', 'true'); temp.width = kf.width; temp.height = kf.height;

                              temp.getContext('2d').putImageData(imgData, 0, 0);

                              ctx.drawImage(temp, 0, 0, 60, 60);

                            } }),

                            React.createElement("button", { "aria-label": "Remove keyframe " + (idx + 1), onClick: function() {

                              var kfs = d.stereoAnimKeyframes.slice(); kfs.splice(idx, 1); upd('stereoAnimKeyframes', kfs); if (typeof announceToSR === 'function') announceToSR('Keyframe ' + (idx + 1) + ' removed.');

                            }, className: "transition-colors absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-700 text-white text-sm font-bold flex items-center justify-center hover:bg-red-600 cursor-pointer focus-visible:ring-4 focus-visible:ring-purple-600 focus-visible:ring-offset-2", style: { lineHeight: '1' } }, "\u00D7")

                          );

                        })

                      )

                    )

                  ),



                  // ═══ UPLOAD IMAGE SOURCE ═══

                  (d.stereoAnimSource) === 'upload' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { htmlFor: "artstudio-anim-depth-upload", className: "text-[11px] font-bold text-purple-700 block" }, __alloT('stem.artstudio.upload_depth_map_image', "\uD83D\uDCC2 Upload Depth Map Image")),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.upload_a_grayscale_image_white_near_bl', "Upload a grayscale image (white = near, black = far). It will be animated using the selected transform.")),

                    React.createElement("input", { id: "artstudio-anim-depth-upload", type: "file", accept: "image/png,image/jpeg,image/webp",

                      'aria-label': __alloT('stem.artstudio.upload_depth_map_image_2', 'Upload depth map image'),

                      className: "text-xs file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200",

                      onChange: function(e) {

                        var file = e.target.files && e.target.files[0];

                        if (!file) return;

                        var reader = new FileReader();

                        reader.onload = function(ev) {

                          var img = new Image();

                          img.onload = function() {

                            var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = 400; c.height = 400;

                            var ctx = c.getContext('2d');

                            ctx.drawImage(img, 0, 0, 400, 400);

                            var imgData = ctx.getImageData(0, 0, 400, 400);

                            upd('stereoAnimUploadedDepth', { width: 400, height: 400, data: copyArtStudioPixels(imgData) });

                            if (typeof addToast === 'function') addToast('\uD83D\uDCF8 Depth map uploaded!', 'success');

                          };

                          img.src = ev.target.result;

                        };

                        reader.readAsDataURL(file);

                      }

                    }),

                    d.stereoAnimUploadedDepth && React.createElement("div", { className: "mt-2 flex items-center gap-2" },

                      React.createElement("canvas", { width: 80, height: 80, role: "img", "aria-label": "Uploaded depth map preview", className: "rounded border border-purple-200", ref: function(c) {

                        if (!c || !d.stereoAnimUploadedDepth) return;

                        var ctx = c.getContext('2d');

                        var ud = d.stereoAnimUploadedDepth;

                        var imgData = ctx.createImageData(ud.width, ud.height);

                        for (var i = 0; i < ud.data.length; i++) imgData.data[i] = ud.data[i];

                        var temp = document.createElement('canvas'); temp.setAttribute('aria-hidden', 'true'); temp.width = ud.width; temp.height = ud.height;

                        temp.getContext('2d').putImageData(imgData, 0, 0);

                        ctx.drawImage(temp, 0, 0, 80, 80);

                      } }),

                      React.createElement("span", { role: "status", "aria-live": "polite", className: "text-[11px] text-green-700 font-bold" }, __alloT('stem.artstudio.depth_map_loaded_400_400', "\u2705 Depth map loaded (400\u00D7400)"))

                    ),

                    React.createElement("div", { className: "mt-2" },

                      React.createElement("span", { id: "artstudio-upload-transform-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.transform_type', "\uD83D\uDD04 Transform Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-upload-transform-label" },

                        [{ id: 'zoom', label: __alloT('stem.artstudio.zoom_2', '\uD83D\uDD0D Zoom') }, { id: 'rotate', label: __alloT('stem.artstudio.rotate', '\uD83D\uDD04 Rotate') }, { id: 'bounce', label: __alloT('stem.artstudio.bounce', '\u26A1 Bounce') }, { id: 'slide', label: __alloT('stem.artstudio.slide', '\u21C6 Slide') }].map(function(t) {

                          return React.createElement("button", { key: t.id, "aria-pressed": (d.stereoAnimTransform || 'zoom') === t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                            className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, t.label);

                        })

                      )

                    )

                  ),



                  // ═══ TRANSFORM SOURCE (uses static depth map) ═══

                  (d.stereoAnimSource) === 'transform' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("h5", { className: "text-[11px] font-bold text-purple-700 block" }, __alloT('stem.artstudio.transform_depth_map', "\uD83D\uDD04 Transform Depth Map")),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.animates_the_depth_map_from_the_static', "Animates the depth map from the Static tab using a chosen transform effect. Switch to Static mode first to draw your depth map.")),

                    React.createElement("div", { className: "mt-2" },

                      React.createElement("span", { id: "artstudio-static-transform-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.transform_type_2', "\uD83D\uDD04 Transform Type")),

                      React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-static-transform-label" },

                        [{ id: 'zoom', label: __alloT('stem.artstudio.zoom_3', '\uD83D\uDD0D Zoom') }, { id: 'rotate', label: __alloT('stem.artstudio.rotate_2', '\uD83D\uDD04 Rotate') }, { id: 'bounce', label: __alloT('stem.artstudio.bounce_2', '\u26A1 Bounce') }, { id: 'slide', label: __alloT('stem.artstudio.slide_2', '\u21C6 Slide') }].map(function(t) {

                          return React.createElement("button", { key: t.id, "aria-pressed": (d.stereoAnimTransform || 'zoom') === t.id, onClick: function() { upd('stereoAnimTransform', t.id); },

                            className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, t.label);

                        })

                      )

                    ),

                    React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 mt-2 border border-amber-200" },

                      React.createElement("p", { role: "status", className: "text-[11px] text-amber-700" }, (d.stereoStaticDepthSnapshot ? "\u2705 Static depth map captured. " : "\u26A0 No static depth map captured yet. ") + __alloT('stem.artstudio.tip_draw_a_depth_map_in_the_static_tab', "\uD83D\uDCA1 Tip: Draw a depth map in the Static tab first, then come back here to animate it with a transform."))

                    )

                  ),



                  // ═══ AI DEPTH SOURCE ═══

                  (d.stereoAnimSource) === 'ai' && React.createElement("div", { className: "mb-3 space-y-2" },

                    React.createElement("label", { htmlFor: "artstudio-stereo-animation-ai-prompt", className: "text-[11px] font-bold text-purple-600 block" }, __alloT('stem.artstudio.ai_generated_depth_map', "\uD83E\uDD16 AI-Generated Depth Map")),

                    React.createElement("p", { className: "text-[11px] text-slate-600" }, __alloT('stem.artstudio.describe_a_3d_scene_and_ai_will_genera', "Describe a 3D scene and AI will generate a depth map, then animate it with a transform.")),

                    callImagen ? React.createElement("div", null,

                      React.createElement("textarea", {

                        id: "artstudio-stereo-animation-ai-prompt",
                        value: d.stereoAnimAiPrompt || '',

                        onChange: function(e) { upd('stereoAnimAiPrompt', e.target.value); },

                        placeholder: __alloT('stem.artstudio.e_g_a_glowing_crystal_orb_floating_in_', "e.g. A glowing crystal orb floating in space..."),

                        className: "w-full text-xs p-2 rounded border border-purple-600 focus:ring-2 focus:ring-purple-400 mb-2 h-16 resize-none",

                        disabled: !!d.stereoAnimAiGenerating

                      }),

                      React.createElement("button", { "aria-label": __alloT('stem.artstudio.generate_ai_depth_map_for_animation', "Generate AI Depth Map for Animation"),

                        onClick: function() {

                          if (!d.stereoAnimAiPrompt) return;

                          upd('stereoAnimAiGenerating', true);

                          callImagen('A smooth, high-quality, continuous 3D grayscale depth map of: ' + d.stereoAnimAiPrompt + '. The closest parts must be pure white, and the furthest background pure black. No text, no floating artifacts. Fill the entire square frame.', 400)

                            .then(function(base64) {

                              var img = new Image();

                              img.onload = function() {

                                var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = 400; c.height = 400;

                                c.getContext('2d').drawImage(img, 0, 0, 400, 400);

                                var imgData = c.getContext('2d').getImageData(0, 0, 400, 400);

                                upd('stereoAnimAiDepth', { width: 400, height: 400, data: copyArtStudioPixels(imgData) });

                                upd('stereoAnimAiGenerating', false);

                                if (typeof addToast === 'function') addToast('\u2728 AI depth map generated!', 'success');

                              };

                              img.src = base64;

                            }).catch(function(e) {

                              upd('stereoAnimAiGenerating', false);

                              if (typeof addToast === 'function') addToast('AI Error: ' + e.message, 'error');

                            });

                        },

                        disabled: !!d.stereoAnimAiGenerating || !d.stereoAnimAiPrompt,

                        className: "w-full px-3 py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-indigo-700 to-purple-700 text-white hover:from-indigo-800 hover:to-purple-800 disabled:opacity-50 shadow-sm transition-all mb-2"

                      }, d.stereoAnimAiGenerating ? '\u23F3 Generating...' : '\uD83E\uDD16 Generate AI Depth Map'),

                      d.stereoAnimAiDepth && React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                        React.createElement("canvas", { width: 80, height: 80, role: "img", "aria-label": "AI-generated depth map preview", className: "rounded border border-purple-200", ref: function(c) {

                          if (!c || !d.stereoAnimAiDepth) return;

                          var ctx = c.getContext('2d');

                          var ad = d.stereoAnimAiDepth;

                          var imgData = ctx.createImageData(ad.width, ad.height);

                          for (var i = 0; i < ad.data.length; i++) imgData.data[i] = ad.data[i];

                          var temp = document.createElement('canvas'); temp.setAttribute('aria-hidden', 'true'); temp.width = ad.width; temp.height = ad.height;

                          temp.getContext('2d').putImageData(imgData, 0, 0);

                          ctx.drawImage(temp, 0, 0, 80, 80);

                        } }),

                        React.createElement("span", { role: "status", "aria-live": "polite", className: "text-[11px] text-green-700 font-bold" }, __alloT('stem.artstudio.ai_depth_map_ready', "\u2705 AI depth map ready!"))

                      ),

                      React.createElement("div", { className: "mt-2" },

                        React.createElement("span", { id: "artstudio-ai-transform-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.transform_type_3', "\uD83D\uDD04 Transform Type")),

                        React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1", role: "group", "aria-labelledby": "artstudio-ai-transform-label" },

                          [{ id: 'zoom', label: __alloT('stem.artstudio.zoom_4', '\uD83D\uDD0D Zoom') }, { id: 'rotate', label: __alloT('stem.artstudio.rotate_3', '\uD83D\uDD04 Rotate') }, { id: 'bounce', label: __alloT('stem.artstudio.bounce_3', '\u26A1 Bounce') }, { id: 'slide', label: __alloT('stem.artstudio.slide_3', '\u21C6 Slide') }, { id: 'ai-motion', label: __alloT('stem.artstudio.ai_motion', '\uD83C\uDFAD AI Motion') }].map(function(t) {

                            return React.createElement("button", { key: t.id, "aria-pressed": (d.stereoAnimTransform || 'zoom') === t.id, onClick: function() {

                              upd('stereoAnimTransform', t.id);

                              // AI Motion is much heavier per frame than mechanical transforms,
                              // so seed a lower default frame count if the user is still on the
                              // pre-AI default. Caps to 30 max via slider; <=8 generates in
                              // ~30-45s end-to-end on Google's tier.
                              if (t.id === 'ai-motion' && (typeof d.stereoAnimFrameCount !== 'number' || d.stereoAnimFrameCount === 12)) {

                                upd('stereoAnimFrameCount', 8);

                              }

                            },

                              className: "px-1 py-1 rounded-lg text-[10px] font-bold transition-all " + ((d.stereoAnimTransform || 'zoom') === t.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, t.label);

                          })

                        ),

                        (d.stereoAnimTransform === 'ai-motion') && React.createElement("p", { className: "text-[10px] text-purple-700 mt-1 italic" },

                          __alloT('stem.artstudio.ai_motion_calls_gemini_to_plan_poses_t', "AI Motion calls Gemini to plan poses then Imagen to render each frame as its own depth map. ~5\u20137s per frame; rate-limit-safe.")

                        )

                      )

                    ) : React.createElement("div", { className: "bg-amber-50 rounded-lg p-3 border border-amber-200" },

                      React.createElement("p", { className: "text-[11px] text-amber-700 font-bold" }, __alloT('stem.artstudio.ai_image_generation_is_not_available_u', "\u26A0\uFE0F AI image generation is not available. Use the Preset, Draw, Upload, or Transform modes instead."))

                    )

                  ),



                  // ═══ COMMON CONTROLS (frames, speed, pattern, strength) ═══

                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3" },

                    React.createElement("div", null,

                      React.createElement("label", { htmlFor: "artstudio-anim-frame-count", className: "text-[11px] font-bold text-purple-700 block mb-0.5" }, "Frames: " + (d.stereoAnimFrameCount || 12)),

                      React.createElement("input", { id: "artstudio-anim-frame-count", type: "range", min: 6, max: 30, value: d.stereoAnimFrameCount || 12, onChange: function(e) { upd('stereoAnimFrameCount', parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    ),

                    React.createElement("div", null,

                      React.createElement("label", { htmlFor: "artstudio-anim-speed", className: "text-[11px] font-bold text-purple-700 block mb-0.5" }, "Speed: " + (d.stereoAnimSpeed || 8) + " FPS"),

                      React.createElement("input", { id: "artstudio-anim-speed", type: "range", min: 2, max: 15, value: d.stereoAnimSpeed || 8, onChange: function(e) { upd('stereoAnimSpeed', parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    )

                  ),

                  React.createElement("div", { className: "mb-3" },

                    React.createElement("span", { id: "artstudio-anim-pattern-label", className: "text-[11px] font-bold text-purple-700 block mb-1" }, __alloT('stem.artstudio.pattern_type_2', "Pattern Type")),

                    React.createElement("div", { className: "flex gap-1", role: "group", "aria-labelledby": "artstudio-anim-pattern-label" },

                      [{ id: 'bw', label: __alloT('stem.artstudio.b_w_2', '\u26AB B&W') }, { id: 'color', label: __alloT('stem.artstudio.color_2', '\uD83C\uDFA8 Color') }, { id: 'noise', label: __alloT('stem.artstudio.noise_2', '\uD83D\uDCFA Noise') }].map(function(s) {

                        return React.createElement("button", { key: s.id, "aria-pressed": (d.stereoPattern || 'bw') === s.id, onClick: function() { upd('stereoPattern', s.id); },

                          className: "flex-1 px-2 py-1 rounded-lg text-[11px] font-bold transition-all " + ((d.stereoPattern || 'bw') === s.id ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 border border-slate-400 hover:bg-purple-50') }, s.label);

                      })

                    )

                  ),

                  [{ k: 'stereoStrength', label: __alloT('stem.artstudio.depth_strength_2', 'Depth Strength'), min: 5, max: 30, def: 15 },

                   { k: 'stereoDensity', label: __alloT('stem.artstudio.pattern_width_2', 'Pattern Width'), min: 60, max: 150, def: 100 }].map(function(s) {

                    var val = typeof d[s.k] === 'number' ? d[s.k] : s.def;

                    return React.createElement("div", { key: s.k, className: "mb-2" },

                      React.createElement("label", { htmlFor: 'artstudio-anim-' + s.k, className: "text-[11px] font-bold text-purple-700 block mb-0.5" }, s.label + ': ' + val),

                      React.createElement("input", { id: 'artstudio-anim-' + s.k, type: "range", min: s.min, max: s.max, value: val, onChange: function(e) { upd(s.k, parseInt(e.target.value)); }, className: "w-full accent-purple-600" })

                    );

                  }),



                  // ═══ RENDER BUTTON (branches by source) ═══

                  React.createElement("div", { className: "flex gap-2 mt-3" },

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.render_animated_stereogram', "Render Animated Stereogram"),

                      onClick: function() {

                        var source = d.stereoAnimSource || 'preset';

                        var nF = d.stereoAnimFrameCount || 12;

                        var pType = d.stereoPattern || 'bw';

                        var pWidth = typeof d.stereoDensity === 'number' ? d.stereoDensity : 100;

                        var maxShift = typeof d.stereoStrength === 'number' ? d.stereoStrength : 15;

                        var aiPat = d.stereoAiPatternImg || null;



                        // Validation

                        if (source === 'preset' && !d.stereoAnimPreset) { if (typeof addToast === 'function') addToast('Pick an animation preset first!', 'warning'); return; }

                        if (source === 'draw' && (!d.stereoAnimKeyframes || d.stereoAnimKeyframes.length < 2)) { if (typeof addToast === 'function') addToast('Capture at least 2 keyframes!', 'warning'); return; }

                        if (source === 'upload' && !d.stereoAnimUploadedDepth) { if (typeof addToast === 'function') addToast('Upload a depth map image first!', 'warning'); return; }

                        if (source === 'ai' && !d.stereoAnimAiDepth) { if (typeof addToast === 'function') addToast('Generate an AI depth map first!', 'warning'); return; }

                        if (source === 'transform' && !d.stereoStaticDepthSnapshot) {

                          if (typeof addToast === 'function') addToast('Draw a static depth map before using Transform.', 'warning');

                          if (typeof announceToSR === 'function') announceToSR('No static depth map is available. Return to Static mode and draw one first.');

                          return;

                        }



                        var renderGeneration = _beginStereoAnimRender();

                        updMany({
                          stereoAnimRendering: true,
                          stereoAnimProgress: 0,
                          stereoAnimAiMotionStatus: '',
                          stereoAnimHasFrames: false,
                          stereoAnimPlaying: false
                        });

                        if (typeof announceToSR === 'function') announceToSR('Rendering animated stereogram.');



                        // ═══ AI MOTION (Gemini storyboard + Imagen per-frame) ═══
                        // Only valid when the depth source is AI. Gemini plans a
                        // looped N-frame pose sequence; each pose is rendered as
                        // its own grayscale depth map via Imagen; the existing
                        // stereogram converter then runs frame-by-frame. callImagen
                        // already has exponential backoff + auto-serialization on
                        // 429, so an N-frame batch is rate-limit-safe (it'll slow
                        // down, not fail). Frames cap at 30 via the slider.

                        if (source === 'ai' && (d.stereoAnimTransform === 'ai-motion')) {

                          if (typeof callGemini !== 'function' || typeof callImagen !== 'function') {

                            upd('stereoAnimRendering', false);

                            if (typeof addToast === 'function') addToast('AI Motion needs Gemini + Imagen — switch transforms or check AI setup.', 'error');

                            return;

                          }

                          var motionPrompt = (d.stereoAnimAiPrompt || '').trim();

                          if (!motionPrompt) {

                            upd('stereoAnimRendering', false);

                            if (typeof addToast === 'function') addToast('Need an AI prompt for AI Motion mode.', 'warning');

                            return;

                          }

                          upd('stereoAnimAiMotionStatus', 'Planning pose sequence with Gemini…');

                          upd('stereoAnimProgress', 1);

                          var storyboardPrompt =
                            'You are a storyboard artist planning a looping ' + nF + '-frame stereogram animation.\n\n' +
                            'Subject: "' + motionPrompt + '"\n\n' +
                            'Plan exactly ' + nF + ' frames showing this subject in continuous motion.\n' +
                            'Rules (CRITICAL):\n' +
                            '1. The subject must look IDENTICAL across all frames — same anatomy, proportions, breed/species/style. Repeat the subject phrase verbatim at the start of every pose.\n' +
                            '2. Only pose / limb angles / position change between adjacent frames. No costume changes, no camera moves.\n' +
                            '3. The motion must LOOP smoothly — frame ' + nF + ' should flow naturally back into frame 1.\n' +
                            '4. Use small incremental changes (no huge jumps between adjacent frames).\n' +
                            '5. Always full-body, centered, fills the square frame, looking toward camera unless the motion requires otherwise.\n\n' +
                            'Return ONLY a JSON array of exactly ' + nF + ' strings (one per frame). Each string is a single sentence describing the pose in that frame, in present tense. No object keys, no commentary, no markdown — just the bare JSON array.';

                          // Imagen call wrapped in a promise that resolves with the ImageData-shaped keyframe.

                          var generateFrame = function(idx, pose, fallbackKf) {

                            return new Promise(function(resolve) {

                              if (!_isStereoAnimRenderActive(renderGeneration)) { resolve(null); return; }

                              var dpPrompt = 'A smooth high-quality grayscale depth map: ' + pose + ' ' +
                                'Closest parts pure white, furthest pure black. No text or artifacts. ' +
                                'Fill the entire square frame. Subject style: ' + motionPrompt + '.';

                              callImagen(dpPrompt, 400).then(function(base64) {

                                if (!_isStereoAnimRenderActive(renderGeneration)) { resolve(null); return; }

                                var img = new Image();

                                img.onload = function() {

                                  if (!_isStereoAnimRenderActive(renderGeneration)) { resolve(null); return; }

                                  var c = document.createElement('canvas'); c.setAttribute('aria-hidden', 'true'); c.width = 400; c.height = 400;

                                  c.getContext('2d').drawImage(img, 0, 0, 400, 400);

                                  var imgData = c.getContext('2d').getImageData(0, 0, 400, 400);

                                  resolve({ width: 400, height: 400, data: imgData.data });

                                };

                                img.onerror = function() { resolve(fallbackKf); };

                                img.src = base64;

                              }).catch(function(err) {

                                if (!_isStereoAnimRenderActive(renderGeneration)) { resolve(null); return; }

                                console.warn('[AI Motion] Imagen failed for frame ' + idx + ':', err && err.message);

                                resolve(fallbackKf);

                              });

                            });

                          };

                          callGemini(storyboardPrompt, true).then(function(rawResponse) {

                            if (!_isStereoAnimRenderActive(renderGeneration)) return;

                            // callGemini returns the raw text body — with jsonMode=true that's a JSON
                            // string we have to parse ourselves. Be defensive: some model responses
                            // wrap the JSON in ```json … ``` fences even when responseMimeType is set.
                            console.log('[AI Motion] Gemini raw response (first 300 chars):', String(rawResponse).slice(0, 300));

                            var poses;

                            try {

                              if (Array.isArray(rawResponse)) {

                                poses = rawResponse; // already parsed (future-proof)

                              } else if (typeof rawResponse === 'string') {

                                var cleaned = rawResponse.trim()

                                  .replace(/^```(?:json)?\s*/i, '')

                                  .replace(/```\s*$/, '')

                                  .trim();

                                poses = JSON.parse(cleaned);

                                // Some responses come back as { "frames": [...] } or { "poses": [...] }
                                if (!Array.isArray(poses) && poses && typeof poses === 'object') {

                                  poses = poses.frames || poses.poses || poses.steps || Object.values(poses).find(function(v){ return Array.isArray(v); });

                                }

                              } else {

                                poses = rawResponse;

                              }

                            } catch (parseErr) {

                              console.warn('[AI Motion] Failed to parse Gemini storyboard JSON. Raw response:', rawResponse);

                              throw new Error('Could not parse Gemini storyboard: ' + parseErr.message);

                            }

                            if (!Array.isArray(poses) || poses.length === 0) {

                              console.warn('[AI Motion] Gemini storyboard not an array. Parsed value:', poses);

                              throw new Error('Gemini returned an empty or malformed storyboard (got ' + (Array.isArray(poses) ? 'empty array' : typeof poses) + ').');

                            }

                            console.log('[AI Motion] Storyboard parsed:', poses.length + ' poses (requested ' + nF + ')');

                            // Normalize to exactly nF entries (pad with last, trim overflow)
                            poses = poses.slice(0, nF);

                            while (poses.length < nF) poses.push(poses[poses.length - 1] || motionPrompt);

                            // Original AI-generated depth map serves as identity anchor for fallbacks
                            var anchorKf = d.stereoAnimAiDepth || null;

                            // Generate sequentially — callImagen auto-serializes anyway on rate limits,
                            // and sequential keeps frame N's "fallback to N-1" logic simple.

                            var keyframes = [];

                            var generateNext = function(i) {

                              if (!_isStereoAnimRenderActive(renderGeneration)) return;

                              if (i >= nF) {

                                // All depth maps generated — hand off to stereogram render
                                upd('stereoAnimAiMotionStatus', 'Rendering stereograms…');

                                upd('stereoAnimProgress', 50);

                                runStereoRender(keyframes);

                                return;

                              }

                              upd('stereoAnimAiMotionStatus', 'Generating depth map ' + (i + 1) + ' of ' + nF + '…');

                              var fallback = keyframes.length > 0 ? keyframes[keyframes.length - 1] : anchorKf;

                              generateFrame(i, String(poses[i] || motionPrompt), fallback).then(function(kf) {

                                if (!_isStereoAnimRenderActive(renderGeneration)) return;

                                keyframes.push(kf || anchorKf);

                                upd('stereoAnimProgress', Math.round((i + 1) / nF * 50));

                                generateNext(i + 1);

                              });

                            };

                            generateNext(0);

                          }).catch(function(err) {

                            if (!_isStereoAnimRenderActive(renderGeneration)) return;

                            console.warn('[AI Motion] Storyboard / pipeline failed:', err);

                            upd('stereoAnimRendering', false);

                            upd('stereoAnimAiMotionStatus', '');

                            upd('stereoAnimProgress', 0);

                            if (typeof addToast === 'function') addToast('AI Motion failed: ' + (err && err.message ? err.message : 'unknown'), 'error');

                          });

                          // Stereogram render once depth-map keyframes are ready.

                          function runStereoRender(kfs) {

                            var W = 512, H = 512, dmW = 400, dmH = 400;

                            var renderedFrames = []; var fi2 = 0;

                            function step() {

                              if (!_isStereoAnimRenderActive(renderGeneration)) return;

                              if (fi2 >= nF) {

                                _stereoAnimRef.frames = renderedFrames;

                                upd('stereoAnimRendering', false);

                                upd('stereoAnimAiMotionStatus', '');

                                upd('stereoAnimProgress', 100);

                                upd('stereoAnimHasFrames', true);

                                if (typeof addToast === 'function') addToast('🎭 AI Motion: ' + renderedFrames.length + ' frames rendered!', 'success');

                                if (typeof announceToSR === 'function') announceToSR('AI motion animation rendered.');

                                if (reducedMotion) upd('stereoAnimPlaying', false);

                                else { upd('stereoAnimPlaying', true); _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8); }

                                return;

                              }

                              var kf = kfs[fi2];

                              if (!kf || !kf.data) { fi2++; requestAnimationFrame(step); return; }

                              // Normalize the keyframe's data buffer to a Uint8ClampedArray for _sirdsRenderSync.

                              var depthArr;

                              if (kf.data instanceof Uint8ClampedArray) {

                                depthArr = kf.data;

                              } else {

                                var tc = document.createElement('canvas'); tc.setAttribute('aria-hidden', 'true'); tc.width = kf.width; tc.height = kf.height;

                                var tctx = tc.getContext('2d');

                                var tid = tctx.createImageData(kf.width, kf.height);

                                for (var ti = 0; ti < kf.data.length; ti++) tid.data[ti] = kf.data[ti];

                                tctx.putImageData(tid, 0, 0);

                                depthArr = tctx.getImageData(0, 0, kf.width, kf.height).data;

                              }

                              var f = _sirdsRenderSync(W, H, depthArr, dmW, dmH, pType, pWidth, maxShift, aiPat);

                              renderedFrames.push(f);

                              fi2++;

                              upd('stereoAnimProgress', 50 + Math.round(fi2 / nF * 50));

                              requestAnimationFrame(step);

                            }

                            requestAnimationFrame(step);

                          }

                          return; // skip the normal render flow below

                        }



                        if (source === 'preset') {

                          // Existing preset rendering

                          _renderAnimFrames(nF, d.stereoAnimPreset, pType, pWidth, maxShift, aiPat,

                            function(done, total) { upd('stereoAnimProgress', Math.round(done/total*100)); },

                            function(frames) {

                              _stereoAnimRef.frames = frames;

                              upd('stereoAnimRendering', false); upd('stereoAnimProgress', 100); upd('stereoAnimHasFrames', true);

                              if (typeof addToast === 'function') addToast('\uD83C\uDFAC ' + frames.length + ' frames rendered!', 'success');

                              if (typeof announceToSR === 'function') announceToSR('Animation rendered.');

                              if (reducedMotion) upd('stereoAnimPlaying', false);

                              else { upd('stereoAnimPlaying', true); _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8); }

                            },

                            renderGeneration

                          );

                        } else {

                          // Custom source rendering

                          var W = 512, H = 512, dmW = 400, dmH = 400;

                          var frames = []; var fi = 0;



                          function getDepthForFrame(frameIdx) {

                            if (source === 'draw') {

                              // Interpolate between keyframes

                              var kfs = d.stereoAnimKeyframes;

                              var maps = kfs.map(function(kf) {

                                var c2 = document.createElement('canvas'); c2.setAttribute('aria-hidden', 'true'); c2.width = kf.width; c2.height = kf.height;

                                var ctx2 = c2.getContext('2d');

                                var id2 = ctx2.createImageData(kf.width, kf.height);

                                for (var j = 0; j < kf.data.length; j++) id2.data[j] = kf.data[j];

                                ctx2.putImageData(id2, 0, 0);

                                return ctx2.getImageData(0, 0, kf.width, kf.height);

                              });

                              return _interpolateDepthMaps(maps, frameIdx, nF);

                            } else {

                              // Upload, Transform, AI — use _genTransformDepth

                              var srcData;

                              if (source === 'upload') {

                                srcData = d.stereoAnimUploadedDepth;

                              } else if (source === 'ai') {

                                srcData = d.stereoAnimAiDepth;

                              } else {

                                // transform - use the snapshot captured before the static canvas unmounted

                                srcData = d.stereoStaticDepthSnapshot || null;

                                if (!srcData) {

                                  var dmc = document.getElementById('depthMapCanvas');

                                  if (dmc) srcData = dmc.getContext('2d').getImageData(0, 0, dmc.width, dmc.height);

                                }

                                if (!srcData) {

                                  var fc = document.createElement('canvas'); fc.setAttribute('aria-hidden', 'true'); fc.width = dmW; fc.height = dmH;

                                  var fctx = fc.getContext('2d'); fctx.fillStyle = '#000'; fctx.fillRect(0, 0, dmW, dmH);

                                  srcData = fctx.getImageData(0, 0, dmW, dmH);

                                }

                              }

                              var srcImg;

                              if (srcData.data instanceof Uint8ClampedArray) {

                                srcImg = srcData;

                              } else {

                                // Convert from Array to ImageData

                                var tc = document.createElement('canvas'); tc.setAttribute('aria-hidden', 'true'); tc.width = srcData.width; tc.height = srcData.height;

                                var tctx = tc.getContext('2d');

                                var tid = tctx.createImageData(srcData.width, srcData.height);

                                for (var ti = 0; ti < srcData.data.length; ti++) tid.data[ti] = srcData.data[ti];

                                tctx.putImageData(tid, 0, 0);

                                srcImg = tctx.getImageData(0, 0, srcData.width, srcData.height);

                              }

                              return _genTransformDepth(srcImg, dmW, dmH, d.stereoAnimTransform || 'zoom', frameIdx, nF);

                            }

                          }



                          function renderStep() {

                            if (!_isStereoAnimRenderActive(renderGeneration)) return;

                            if (fi >= nF) {

                              _stereoAnimRef.frames = frames;

                              upd('stereoAnimRendering', false); upd('stereoAnimProgress', 100); upd('stereoAnimHasFrames', true);

                              if (typeof addToast === 'function') addToast('\uD83C\uDFAC ' + frames.length + ' frames rendered!', 'success');

                              if (typeof announceToSR === 'function') announceToSR('Animation rendered.');

                              if (reducedMotion) upd('stereoAnimPlaying', false);

                              else { upd('stereoAnimPlaying', true); _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8); }

                              return;

                            }

                            var depthData = getDepthForFrame(fi);

                            var f = _sirdsRenderSync(W, H, depthData.data, dmW, dmH, pType, pWidth, maxShift, aiPat);

                            frames.push(f);

                            fi++;

                            upd('stereoAnimProgress', Math.round(fi / nF * 100));

                            requestAnimationFrame(renderStep);

                          }

                          requestAnimationFrame(renderStep);

                        }

                      },

                      disabled: !!d.stereoAnimRendering,

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-black bg-gradient-to-r from-purple-700 to-indigo-700 text-white hover:from-purple-800 hover:to-indigo-800 disabled:opacity-50 shadow-md transition-all"

                    }, d.stereoAnimRendering ? (d.stereoAnimAiMotionStatus ? ('\u23F3 ' + d.stereoAnimAiMotionStatus + ' ' + (d.stereoAnimProgress || 0) + '%') : ('\u23F3 Rendering... ' + (d.stereoAnimProgress || 0) + '%')) : '\uD83C\uDFAC Render Animation'),

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.reset_stereogram_animation', "Reset stereogram animation"),

                      onClick: function() {

                        _cancelStereoAnimWork(true);

                        // Also clear the output canvas and repaint the placeholder
                        // banner. Without this the last rendered frame stays painted
                        // forever (the canvas init ref only fires once via
                        // canvas._animInit, so it never re-blanks on later resets).
                        try {

                          var rc = document.getElementById('stereoAnimCanvas');

                          if (rc) {

                            var rctx = rc.getContext('2d');

                            rctx.fillStyle = '#1a1a2e'; rctx.fillRect(0, 0, rc.width, rc.height);

                            rctx.fillStyle = '#888'; rctx.font = '14px sans-serif'; rctx.textAlign = 'center';

                            rctx.fillText('Pick a source and click Render Animation', rc.width / 2, rc.height / 2);

                          }

                        } catch (_) {}

                        upd('stereoAnimHasFrames', false);

                        upd('stereoAnimPlaying', false);

                        upd('stereoAnimProgress', 0);

                        upd('stereoAnimAiMotionStatus', '');

                        if (typeof announceToSR === 'function') announceToSR('Stereogram animation reset.');

                      },

                      className: "transition-colors px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 hover:bg-red-100"

                    }, __alloT('stem.artstudio.reset_2', "\u23F9 Reset"))

                  ),

                  React.createElement("div", { role: "status", "aria-live": "polite", "aria-atomic": "true", className: "sr-only" },

                    d.stereoAnimRendering ? (d.stereoAnimAiMotionStatus || "Rendering animation.") :

                      (d.stereoAnimHasFrames ? (d.stereoAnimPlaying ? "Animation playing." : "Animation ready and paused.") : "")

                  ),

                  d.stereoAnimRendering && React.createElement("div", {

                    role: "progressbar",

                    "aria-label": "Animation rendering progress",

                    "aria-valuemin": 0,

                    "aria-valuemax": 100,

                    "aria-valuenow": d.stereoAnimProgress || 0,

                    "aria-valuetext": (d.stereoAnimAiMotionStatus || "Rendering animation") + " " + (d.stereoAnimProgress || 0) + " percent",

                    className: "mt-2 h-2 bg-purple-100 rounded-full overflow-hidden"

                  },

                    React.createElement("div", { style: { width: (d.stereoAnimProgress || 0) + '%', transition: reducedMotion ? 'none' : 'width 0.3s' }, className: "h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" })

                  )

                ),



                React.createElement("div", { className: "bg-white rounded-xl p-4 border border-purple-200 shadow-sm" },

                  React.createElement("div", { className: "flex justify-between items-center mb-2" },

                    React.createElement("p", { className: "text-xs font-bold text-purple-700" }, __alloT('stem.artstudio.animated_stereogram_output', "\uD83D\uDC53 Animated Stereogram Output")),

                    d.stereoAnimHasFrames && React.createElement("span", { role: "status", "aria-live": "polite", className: "text-[11px] font-bold px-2 py-0.5 rounded-full " + (d.stereoAnimPlaying ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600') }, d.stereoAnimPlaying ? '\u25B6 Playing' : '\u23F8 Paused')

                  ),

                  React.createElement("p", { id: "artstudio-animated-stereogram-help", className: "text-[11px] text-slate-600 mb-2" }, __alloT('stem.artstudio.relax_your_eyes_and_look_through_the_a', "Relax your eyes and look \u2018through\u2019 the animation to see 3D shapes move")),

                  React.createElement("canvas", { id: 'stereoAnimCanvas', width: 512, height: 512,
                    role: "img",
                    "aria-label": "Animated stereogram output with " + ((_stereoAnimRef.frames && _stereoAnimRef.frames.length) || 0) + " rendered frames; " + (d.stereoAnimPlaying ? "playing" : "paused") + ".",
                    "aria-describedby": "artstudio-animated-stereogram-help",

                    className: "rounded-xl border-2 border-purple-200 shadow-lg block", style: { maxWidth: '100%', background: '#111' },

                    ref: function(canvas) {

                      if (!canvas) return;

                      if (canvas._animInit) return;

                      canvas._animInit = true;

                      var ctx = canvas.getContext('2d');

                      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 512, 512);

                      ctx.fillStyle = '#cbd5e1'; ctx.font = '14px sans-serif'; ctx.textAlign = 'center';

                      ctx.fillText('Pick a source and click Render Animation', 256, 256);

                    }

                  }),

                  d.stereoAnimHasFrames && React.createElement("div", { className: "flex gap-2 mt-3" },

                    React.createElement("button", { "aria-label": d.stereoAnimPlaying ? "Pause animated stereogram" : "Play animated stereogram", "aria-pressed": !!d.stereoAnimPlaying,

                      onClick: function() {

                        if (d.stereoAnimPlaying) {

                          _stopStereoAnim(); upd('stereoAnimPlaying', false);

                          if (typeof announceToSR === 'function') announceToSR('Animated stereogram paused.');

                        } else {

                          _playStereoAnim('stereoAnimCanvas', d.stereoAnimSpeed || 8); upd('stereoAnimPlaying', true);

                          if (typeof announceToSR === 'function') announceToSR('Animated stereogram playing.');

                        }

                      },

                      className: "flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.stereoAnimPlaying ? 'bg-amber-700 text-white hover:bg-amber-800' : 'bg-gradient-to-r from-green-700 to-emerald-700 text-white hover:from-green-800 hover:to-emerald-800 shadow-md')

                    }, d.stereoAnimPlaying ? '\u23F8 Pause' : '\u25B6 Play'),

                    React.createElement("button", { "aria-label": __alloT('stem.artstudio.export_gif', "Export GIF"),

                      onClick: function() {

                        _stopStereoAnim();

                        upd('stereoAnimPlaying', false);

                        _exportStereoGif(_stereoAnimRef.frames, d.stereoAnimSpeed || 8);

                      },

                      className: "transition-colors flex-1 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-600 hover:bg-emerald-100"

                    }, __alloT('stem.artstudio.export_gif_2', "\uD83D\uDCE5 Export GIF"))

                  ),

                  React.createElement("div", { className: "bg-amber-50 rounded-xl p-3 border border-amber-200 mt-3" },

                    React.createElement("p", { className: "text-[11px] font-bold text-amber-700 mb-1" }, __alloT('stem.artstudio.tips_for_animated_stereograms', "\uD83D\uDCA1 Tips for Animated Stereograms")),

                    React.createElement("ul", { className: "text-[11px] text-slate-600 leading-relaxed list-disc ml-4 space-y-0.5" },

                      React.createElement("li", null, __alloT('stem.artstudio.lock_your_eyes_into_the_3d_view_before', "Lock your eyes into the 3D view before clicking Play")),

                      React.createElement("li", null, __alloT('stem.artstudio.slower_speeds_4_6_fps_are_easier_to_ma', "Slower speeds (4\u20136 FPS) are easier to maintain focus")),

                      React.createElement("li", null, __alloT('stem.artstudio.pulse_and_heart_presets_are_the_easies', "Pulse and Heart presets are the easiest to see in motion")),

                      React.createElement("li", null, __alloT('stem.artstudio.the_exported_gif_can_be_printed_frame_', "The exported GIF can be printed frame-by-frame as a flipbook!"))

                    )

                  )

                )

              )

            )

          );
      })();
    }
  });

  console.log('[StemLab] stem_tool_artstudio.js loaded \u2014 1 tool (artStudio)');
})();
