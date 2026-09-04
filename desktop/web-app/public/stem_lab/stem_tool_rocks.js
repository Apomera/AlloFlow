// ── Reduced motion CSS (WCAG 2.3.3), shared across all STEAM Lab tools ──
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
  // NOTE: this style block used to also carry an unscoped, app-wide colour
  // override for the slate-600 text utility, shipped from this single tool file.
  // It repainted EVERY such element in AlloFlow (not just this tool's) from
  // #475569 down to #64748b, dropping that text from 7.58:1 to 4.76:1 on white
  // and to 4.48:1 on the orange-50 panels used here — below the WCAG AA 4.5:1
  // floor for normal text. Removed; the Tailwind utility already clears AA
  // comfortably on its own. (Kept literal-free so the contrast test can assert
  // the override is gone by string match.)
  if (!document.getElementById('rock-a11y')) { var _s = document.createElement('style'); _s.id = 'rock-a11y'; _s.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }'; document.head.appendChild(_s); }

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

  // ── Shared challenge + vocabulary tables (module scope) ──
  // These used to live INSIDE the `rocks` tool body. When `rockCycle` was split
  // out into its own registerTool() block it kept referring to them, but they
  // were out of scope there — every reference threw ReferenceError at runtime:
  //   • ROCKS_VOCAB in rockCycle's quiz renders DURING render, so StemLab's
  //     renderTool() try/catch swallowed it and returned null — the whole Rock
  //     Cycle tool blanked out the moment a quiz answer was shown ("resetting").
  //   • ROCKS_CHALLENGES in rockCycle's award paths threw inside event handlers.
  // Hoisting to module scope gives both tools ONE definition (no drift) and
  // keeps them in scope everywhere. `check` now takes its state explicitly —
  // the old `s || d || {}` fallback closed over the rocks tool's `d`, which is
  // exactly what could not be hoisted; the sole call site always passes state.
  // ── Stable callback ref for the landscape canvas (rocks tool) ──
  // Same defect the rockCycle canvas had: the ref was an inline function that
  // called the initialiser and rebound the zone-click handler, so React saw a
  // new identity on every commit and did ref(null) → cleanup → ref(el). In this
  // tool the teardown is heavier — it cancels the rAF loop, removes the
  // mousemove/click/keydown listeners, disconnects a ResizeObserver and drops
  // the visibilitychange listener — and the rebuild resets `tick` to 0 and
  // `hoverZone` to null. So the landscape animation restarted and the hover
  // highlight was lost on EVERY state update in the rocks tool.
  //
  // _rocksSelectBox keeps the zone-click handler current without touching ref
  // identity: the element gets a thin forwarder bound once at mount that always
  // dispatches into the LATEST render's closure.
  var _rocksInitBox = { fn: null };
  var _rocksSelectBox = { fn: null };
  var _rocksTourBox = { fn: null };
  var _rocksLastCanvas = null;
  function rocksLandscapeCanvasRef(canvasEl) {
    if (!canvasEl) {
      if (_rocksLastCanvas && _rocksLastCanvas._rocksCleanup) { _rocksLastCanvas._rocksCleanup(); }
      if (_rocksLastCanvas) {
        _rocksLastCanvas._rocksInit = false;
        if (_rocksLastCanvas._rocksRO) { try { _rocksLastCanvas._rocksRO.disconnect(); } catch (e) {} }
      }
      _rocksLastCanvas = null;
      return;
    }
    _rocksLastCanvas = canvasEl;
    if (canvasEl._rocksInit) return;
    canvasEl._onSelectRock = function (rockId, type) {
      if (_rocksSelectBox.fn) _rocksSelectBox.fn(rockId, type);
    };
    if (_rocksInitBox.fn) _rocksInitBox.fn(canvasEl);
  }

  // Belt-and-braces sweep on the tool root. Must ALSO be identity-stable: as an
  // inline ref it fired on every commit and tore the landscape canvas down by
  // querySelector, which kept the re-init bug alive even after the canvas ref
  // itself was stabilised.
  function rocksRootCleanupRef(el) {
    if (el) return;
    var old = typeof document !== 'undefined' ? document.querySelector('[data-rocks-canvas]') : null;
    if (old && old._rocksCleanup) {
      old._rocksCleanup();
      if (old._rocksRO) { try { old._rocksRO.disconnect(); } catch (e) {} }
    }
  }

  // ══ Specimen art: deterministic SVG swatches for rock + mineral ID ══
  // WHY: the rocks grid, the Mystery Rock guess grid and the quiz all drew a
  // specimen as its ROCK-TYPE emoji — so all 20 rocks rendered as one of only
  // three pictures (volcano / beach / mountain). An identification game whose
  // options are visually identical is not an identification game; the picture
  // carried no diagnostic information at all. Minerals fared slightly better
  // (a flat colour dot) but still showed nothing about lustre or crystal habit,
  // which are the properties a field guide actually keys on.
  //
  // These render the real diagnostic features from data already on each record:
  // rocks from `texture` + `grainColors`, minerals from `crystal` + `luster` +
  // `color`. SVG (not canvas) so they are declarative, need no ref lifecycle,
  // scale to any tile size, and render under SSR for tests. Literal hex only —
  // SVG presentation attributes ignore CSS var().
  //
  // DETERMINISM: patterns are placed with a tiny seeded LCG keyed off the
  // specimen id, never Math.random(). The same rock always draws the same way,
  // so a student can learn "that speckled one is diorite", goldens stay stable,
  // and a re-render never reshuffles the picture.
  function rkSeed(str) {
    var hsh = 2166136261;
    for (var i = 0; i < str.length; i++) {
      hsh ^= str.charCodeAt(i);
      hsh = (hsh * 16777619) >>> 0;
    }
    return function () {
      hsh = (hsh * 1664525 + 1013904223) >>> 0;
      return hsh / 4294967296;
    };
  }

  // ══ Keeping a mark visible on the thing it is drawn on ══
  // This bug has now turned up four separate times in this tool, always the
  // same shape: a mark is drawn in a colour close to whatever is behind it, so
  // it is present in the markup and invisible on screen. Pale rocks hid their
  // own texture; eleven minerals left a white streak on a white plate; and the
  // scratch groove was painted #1f2937, which is magnetite's body colour
  // EXACTLY — scratching magnetite cut a groove that could not be seen at all.
  // Nothing about any of those reads as wrong in the source; only rendering it
  // and looking finds it. So the rule lives in one place now.
  // The first version of this worked in luminance DIFFERENCE, which made marks
  // visible but is not what WCAG measures. A luminance gap of 0.16 can still be
  // a contrast ratio of 1.1, and an audit found the scratch marks running as
  // low as 1.07:1 against their specimen — visible, and nowhere near the 3:1
  // that SC 1.4.11 asks of a graphic you need in order to understand the
  // content. Its comment also claimed an equal shift on all three channels
  // moves luminance by exactly that amount; that is true in LINEAR light and
  // this scale is gamma-encoded, so the old shift landed wherever it landed.
  // Both are fixed by targeting the ratio itself.
  function rkSrgbLum(hex) {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return 0.5;
    var c = [1, 3, 5].map(function (i) {
      var v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  }

  /** WCAG contrast ratio between two #rrggbb colours. */
  function rkContrast(a, b) {
    var la = rkSrgbLum(a), lb = rkSrgbLum(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  function rkMixToward(hex, target, t) {
    return '#' + [1, 3, 5].map(function (i) {
      var v = parseInt(hex.slice(i, i + 2), 16);
      var out = Math.round(v + (target - v) * t);
      return (out < 16 ? '0' : '') + out.toString(16);
    }).join('');
  }

  /**
   * `mark` pushed away from `base` until it reaches `minRatio`, or returned
   * unchanged if it already does. Blends toward black on a light base and
   * toward white on a dark one, and searches for the SMALLEST push that works
   * so the mark keeps as much of its own hue as it can.
   */
  function rkMarkOn(mark, base, minRatio) {
    if (!/^#[0-9a-fA-F]{6}$/.test(mark) || !/^#[0-9a-fA-F]{6}$/.test(base)) return mark;
    if (rkContrast(mark, base) >= minRatio) return mark;
    var toward = rkSrgbLum(base) > 0.18 ? 0 : 255;
    var full = rkMixToward(mark, toward, 1);
    // Mid-tone bases cannot reach a high ratio in either direction; take the
    // best available rather than pretending.
    if (rkContrast(full, base) < minRatio) {
      var other = rkMixToward(mark, toward === 0 ? 255 : 0, 1);
      return rkContrast(other, base) > rkContrast(full, base) ? other : full;
    }
    var lo = 0, hi = 1, best = full;
    for (var s = 0; s < 12; s++) {
      var t = (lo + hi) / 2;
      var cand = rkMixToward(mark, toward, t);
      if (rkContrast(cand, base) >= minRatio) { best = cand; hi = t; } else { lo = t; }
    }
    return best;
  }

  // Rock specimen swatch. `texture` drives the pattern, `grainColors` the palette.
  // How a rock BREAKS shapes how a specimen looks, so the silhouette is picked
  // from the texture family rather than being one shared rounded square:
  // crystalline and glassy rocks fracture to sharp angular blocks, clastic and
  // vesicular ones weather to rounded lumps, foliated and banded ones split into
  // flat tabular slabs. That makes the outline itself diagnostic — and gives
  // every specimen its own recognisable shape instead of 20 identical tiles.
  var RK_SILHOUETTE = {
    'coarse-grained': 'angular', 'crystalline': 'angular', 'non-foliated': 'angular',
    'glassy': 'angular', 'fine-grained': 'blocky',
    'clastic': 'rounded', 'clastic-coarse': 'rounded', 'clastic-angular': 'rounded', 'bioclastic': 'rounded',
    'vesicular': 'rounded',
    'clastic-fine': 'blocky', 'organic-banded': 'blocky',
    'foliated': 'tabular', 'banded': 'tabular', 'fine-layered': 'tabular'
  };

  // Deterministic irregular outline. Returns an SVG path string in a 0..S box.
  function rkSilhouettePath(kind, S, rnd) {
    var pts = [];
    var n = kind === 'rounded' ? 11 : kind === 'tabular' ? 10 : 9;
    var cx = S / 2, cy = S / 2;
    var i;
    for (i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      // Tabular specimens are wide and shallow; the others are near-equant.
      var rx = kind === 'tabular' ? S * 0.44 : S * 0.40;
      var ry = kind === 'tabular' ? S * 0.27 : S * 0.39;
      var jitter = kind === 'rounded' ? 0.06 : kind === 'blocky' ? 0.10 : 0.16;
      var k = 1 - jitter / 2 + rnd() * jitter;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    var dstr = '';
    if (kind === 'rounded') {
      // Smooth closed curve through the points.
      dstr = 'M' + pts[0][0].toFixed(1) + ',' + pts[0][1].toFixed(1);
      for (i = 0; i < pts.length; i++) {
        var p1 = pts[i];
        var p2 = pts[(i + 1) % pts.length];
        var mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2;
        dstr += ' Q' + p1[0].toFixed(1) + ',' + p1[1].toFixed(1) + ' ' + mx.toFixed(1) + ',' + my.toFixed(1);
      }
      dstr += ' Z';
    } else {
      dstr = 'M' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' L') + ' Z';
    }
    return dstr;
  }

  // Rock specimen swatch. `texture` drives the pattern, `grainColors` the palette,
  // and the texture family also drives the outline and how the light falls.
  // ── Rock specimens (hoisted to module scope) ──────────────────────────
  // Was declared inside the `rocks` render, which put the 20-specimen table
  // out of reach of the sibling rockCycle tool. The rock cycle names eight of
  // these by name and was drawing each one as a generic family texture while
  // the real specimen art sat one tab away, unreachable.
  //
  // Rows carry `labelKey`; the render localizes them, so the data stays pure.
  var RK_ROCKS = [

    { id: 'granite', type: 'igneous', labelKey: 'stem.rocks.granite', hardness: 6.5, texture: 'coarse-grained', grainColors: ['#d4d4d8', '#fca5a5', '#1e1e1e', '#fafafa'], desc: 'Intrusive igneous rock with visible quartz, feldspar, and mica crystals. Forms deep underground from slowly cooling magma.', uses: 'Countertops, monuments, building stone' },

    { id: 'basalt', type: 'igneous', labelKey: 'stem.rocks.basalt', hardness: 6, texture: 'fine-grained', grainColors: ['#374151', '#1f2937', '#4b5563', '#111827'], desc: 'Extrusive igneous rock, the most common volcanic rock. Forms when lava cools quickly at the surface.', uses: 'Road aggregate, construction fill' },

    { id: 'obsidian', type: 'igneous', art: 'conchoidal', labelKey: 'stem.rocks.obsidian', hardness: 5.5, texture: 'glassy', grainColors: ['#0f0f0f', '#1a1a2e', '#16213e', '#0a0a0a'], desc: 'Volcanic glass formed when lava cools extremely rapidly. Conchoidal fracture.', uses: 'Surgical scalpels, jewelry, ancient tools' },

    { id: 'pumice', type: 'igneous', labelKey: 'stem.rocks.pumice', hardness: 6, texture: 'vesicular', grainColors: ['#d6d3d1', '#e7e5e4', '#a8a29e', '#f5f5f4'], desc: 'Light, porous volcanic rock full of gas bubbles. So light it can float on water!', uses: 'Abrasive cleaning, lightweight aggregate' },

    { id: 'rhyolite', type: 'igneous', art: 'flowbanded', labelKey: 'stem.rocks.rhyolite', hardness: 6, texture: 'fine-grained', grainColors: ['#fca5a5', '#e5e7eb', '#d1d5db', '#fecaca'], desc: 'Extrusive equivalent of granite. Light-colored fine-grained volcanic rock, often with flow banding. Rich in silica (>69%). Erupts explosively due to high viscosity.', uses: 'Aggregate, decorative stone, gemstone (thundereggs)' },

    { id: 'diorite', type: 'igneous', art: 'saltpepper', labelKey: 'stem.rocks.diorite', hardness: 6, texture: 'coarse-grained', grainColors: ['#1e1e1e', '#fafafa', '#4b5563', '#e5e7eb'], desc: 'Intrusive igneous rock with a "salt and pepper" appearance. Intermediate composition between granite and gabbro. Contains plagioclase feldspar and hornblende.', uses: 'Building stone, cobblestones, ancient sculptures (Inca)' },

    { id: 'gabbro', type: 'igneous', labelKey: 'stem.rocks.gabbro', hardness: 6, texture: 'coarse-grained', grainColors: ['#3f4a3c', '#d6d3d1', '#18181b', '#5b6650'], desc: 'Coarse-grained intrusive rock with the same composition as basalt: plagioclase, pyroxene and often olivine. The same magma makes basalt when it erupts and gabbro when it cools slowly at depth. Most of the ocean crust beneath the basalt layer is gabbro.', uses: 'Building stone, road aggregate, polished slabs sold as "black granite"' },

    { id: 'andesite', type: 'igneous', labelKey: 'stem.rocks.andesite', hardness: 6, texture: 'fine-grained', grainColors: ['#94a3b8', '#9ca3af', '#4b5563', '#d1d5db'], desc: 'Intermediate volcanic rock named after the Andes Mountains. Common at convergent plate boundaries. Often contains visible phenocrysts in a fine matrix (porphyritic texture).', uses: 'Construction aggregate, monuments' },

    { id: 'tuff', type: 'igneous', art: 'shards', labelKey: 'stem.rocks.tuff', hardness: 4, texture: 'vesicular', grainColors: ['#d9d3c6', '#c0b9a8', '#a39c8c', '#ece7dc'], desc: 'Consolidated volcanic ash. Formed when explosive eruptions blast fine particles into the air, which settle and lithify. Can contain pumice fragments and glass shards.', uses: 'Building stone (ancient Rome), lightweight concrete, water filtration' },

    { id: 'sandstone', type: 'sedimentary', labelKey: 'stem.rocks.sandstone', hardness: 6.5, texture: 'clastic', grainColors: ['#d8c19a', '#c2a878', '#a98f61', '#eee0c6'], desc: 'Made of sand-sized quartz grains cemented together. Often shows cross-bedding from ancient dunes or rivers.', uses: 'Building stone, flagstone, aquifers' },

    { id: 'limestone', type: 'sedimentary', labelKey: 'stem.rocks.limestone', hardness: 3, texture: 'bioclastic', grainColors: ['#e5e7eb', '#d1d5db', '#f3f4f6', '#fef9c3'], desc: 'Composed mainly of calcite (CaCO\u2083). Often contains fossils. Fizzes with acid!', uses: 'Cement, lime, building stone, chalk' },

    { id: 'siltstone', type: 'sedimentary', labelKey: 'stem.rocks.siltstone', hardness: 4, texture: 'clastic-fine', grainColors: ['#a8a29e', '#c4bdb4', '#8a8279', '#d6cfc6'], desc: 'The grain size between sandstone and shale. Silt grains are too small to pick out by eye but big enough to feel gritty between your teeth, and unlike shale it does not split into sheets. Grain size is the entire classification here: sand you can see, silt you can feel, clay you can only smear.', uses: 'Brick and tile clay, construction aggregate' },

    { id: 'shale', type: 'sedimentary', labelKey: 'stem.rocks.shale', hardness: 3, texture: 'fine-layered', grainColors: ['#94a3b8', '#4b5563', '#9ca3af', '#374151'], desc: 'Made of compressed clay and silt. Splits into thin layers (fissile). Most common sedimentary rock.', uses: 'Bricks, pottery, oil/gas source rock' },

    { id: 'conglom', type: 'sedimentary', labelKey: 'stem.rocks.conglomerate', hardness: 6, texture: 'clastic-coarse', grainColors: ['#92400e', '#a16207', '#d4d4d8', '#78716c'], desc: 'Contains large rounded pebbles cemented in a fine matrix. Tells us about ancient fast-flowing rivers.', uses: 'Construction aggregate, decorative stone' },

    { id: 'breccia', type: 'sedimentary', labelKey: 'stem.rocks.breccia', hardness: 6, texture: 'clastic-angular', grainColors: ['#7c2d12', '#a8a29e', '#57534e', '#d6d3d1'], desc: 'Large ANGULAR fragments cemented in a finer matrix. Compare it with conglomerate: same sizes, same cement, but these corners are still sharp. Rounding takes distance, so breccia forms where the pieces were buried close to where they broke, such as a scree slope or a fault zone.', uses: 'Decorative stone, construction aggregate' },

    { id: 'chalk', type: 'sedimentary', labelKey: 'stem.rocks.chalk', hardness: 1, texture: 'bioclastic', grainColors: ['#fafafa', '#f5f5f4', '#e5e7eb', '#ffffff'], desc: 'Soft, white limestone made of microscopic plankton shells (coccoliths). The White Cliffs of Dover are chalk. Extremely fine-grained, each grain is a tiny fossil!', uses: 'Blackboard chalk, whiting, soil amendment, toothpaste' },

    { id: 'travertine', type: 'sedimentary', art: 'bandedporous', labelKey: 'stem.rocks.travertine', hardness: 4, texture: 'crystalline', grainColors: ['#fef3c7', '#fde68a', '#fafaf9', '#e7e5e4'], desc: 'Chemical sedimentary rock deposited from mineral-rich hot springs and cave systems. Often has a banded, porous appearance. Forms stalactites and stalagmites in caves.', uses: 'Flooring, countertops, building facades (Colosseum in Rome)' },

    { id: 'coal', type: 'sedimentary', labelKey: 'stem.rocks.coal', hardness: 2, texture: 'organic-banded', grainColors: ['#1c1917', '#292524', '#0c0a09', '#44403c'], desc: 'The one common rock made of once-living material instead of mineral grains. Plants piled up in a swamp faster than they could rot, and burial squeezed and heated the peat that formed. More burial means a higher rank: peat, then lignite, then the bituminous coal shown here, then anthracite. Light for a rock, dull with brighter bands, and it burns.', uses: 'Fuel for electricity, coke for steelmaking' },

    { id: 'marble', type: 'metamorphic', labelKey: 'stem.rocks.marble', hardness: 3.5, texture: 'crystalline', grainColors: ['#fafafa', '#e5e7eb', '#f3f4f6', '#dbeafe'], desc: 'Metamorphosed limestone. Interlocking calcite crystals give it a sugary texture. Used by sculptors for millennia.', uses: 'Sculpture, flooring, tombstones' },

    { id: 'slate', type: 'metamorphic', art: 'slaty', labelKey: 'stem.rocks.slate', hardness: 5.5, texture: 'foliated', grainColors: ['#374151', '#475569', '#334155', '#1e293b'], desc: 'Metamorphosed shale. Excellent foliation, splits into flat, smooth sheets.', uses: 'Roofing tiles, chalkboards, flooring' },

    { id: 'quartzite', type: 'metamorphic', labelKey: 'stem.rocks.quartzite', hardness: 7, texture: 'non-foliated', grainColors: ['#f5f5f4', '#fafaf9', '#e7e5e4', '#e0f2fe'], desc: 'Metamorphosed sandstone. Extremely hard, even harder than granite. Quartz grains fuse together.', uses: 'Railroad ballast, decorative stone' },

    { id: 'gneiss', type: 'metamorphic', labelKey: 'stem.rocks.gneiss', hardness: 7, texture: 'banded', grainColors: ['#1e1e1e', '#fafafa', '#94a3b8', '#d4d4d8'], desc: 'Shows distinct light and dark mineral banding. Forms under extreme heat and pressure deep in the crust.', uses: 'Decorative stone, construction' },

    { id: 'schist', type: 'metamorphic', art: 'schistose', labelKey: 'stem.rocks.schist', hardness: 5, texture: 'foliated', grainColors: ['#78716c', '#a8a29e', '#57534e', '#d6d3d1'], desc: 'Medium-grade metamorphic rock with visible, aligned mica flakes that give it a sparkly, shiny appearance. Forms from shale under moderate heat and pressure. Named for its tendency to split (Greek "schizein" = to split).', uses: 'Decorative landscaping, flagstone, historical millstones' },

    { id: 'phyllite', type: 'metamorphic', art: 'crenulated', labelKey: 'stem.rocks.phyllite', hardness: 4, texture: 'foliated', grainColors: ['#4b5563', '#94a3b8', '#374151', '#9ca3af'], desc: 'Between slate and schist in metamorphic grade. Has a distinctive silky, satiny sheen from microscopic mica crystals. Crinkled foliation surface (crenulations). The stepping stone between low and medium metamorphism.', uses: 'Decorative stone, garden paths, grave markers' }

  ];

  function rkRockSwatch(h, rock, size) {
    var S = size || 40;
    var cols = (rock && rock.grainColors && rock.grainColors.length) ? rock.grainColors : ['#a8a29e', '#78716c'];
    var id = rock ? rock.id : 'x';
    var rnd = rkSeed(id);
    var tex = rock ? rock.texture : 'fine-grained';
    // Suffixed with the size: the same specimen can appear twice on one page
    // (grid tile at 54px and hand-lens detail at 100px), and bare ids collided —
    // duplicate DOM ids, with both instances resolving to the first definition.
    var uid = id + '-' + S;
    var clip = 'rkclip-' + uid;
    var shadeId = 'rkshade-' + uid;
    var glossId = 'rkgloss-' + uid;
    var silKind = RK_SILHOUETTE[tex] || 'blocky';
    var sil = rkSilhouettePath(silKind, S, rnd);
    var kids = [];
    var i;
    // `separate` is assigned below but only ever called from the texture code,
    // which runs after it exists.
    var pick = function (n) { return separate(cols[n % cols.length]); };

    // Adapt the lighting to the specimen's own value. A fixed white highlight
    // blows out the pale rocks — chalk, marble, quartzite and limestone turned
    // into featureless white blobs — while a fixed shadow buries the dark ones.
    // Light specimens get most of their modelling from shadow, dark specimens
    // from highlight.
    var baseLum = rkSrgbLum(cols[0]);

    // The same problem one level down. Adapting the LIGHTING stopped the pale
    // specimens blowing out, but their texture marks are picked from the same
    // near-white palette as the body, so the feature each description NAMES was
    // being drawn and then disappearing into the rock: chalk's plankton shells,
    // limestone's fossils, marble's sugary crystals and schist's mica flakes
    // were all present in the markup and invisible on screen. Any mark that
    // lands too close to the body is nudged away from it — away from white on a
    // pale rock, away from black on a dark one — and marks that already read
    // are left exactly as they were.
    // SC 1.4.11 wants 3:1 for the parts of a graphic you need in order to
    // understand it. Forcing that onto the FILL was the wrong way to get it:
    // grain colours in a real rock sit close to the matrix — that is precisely
    // why a rock looks uniform — so demanding 3:1 of the fill repainted 51 of
    // 60 grain colours, some by 134 of 255 in a channel, and turned sandstone's
    // quartz dark brown and rhyolite's pale phenocrysts black. On an
    // identification tool the grain colour IS the information, which is the
    // "essential presentation" the criterion explicitly excepts.
    //
    // So the fill stays true and the BOUNDARY carries the contrast, which is
    // what the criterion actually asks for and what its own guidance suggests
    // for this case. `edge` clears 3:1 against the body no matter how pale or
    // dark the rock is.
    var MIN_RATIO = 3.0;
    var edge = rkMarkOn('#0f172a', cols[0], MIN_RATIO);
    var separate = function (hex) { return hex; };
    // Marks drawn as a STROKE have no fill to protect — the ink IS the mark, so
    // it can carry the 3:1 itself. Chalk's shell arcs were stroked in the same
    // near-white as chalk and vanished; a fossil outline has no true colour to
    // falsify, unlike a grain of quartz.
    var ink = function (n) { return rkMarkOn(cols[n % cols.length], cols[0], MIN_RATIO); };
    var hiOp = (0.42 - baseLum * 0.34).toFixed(3);   // .42 on black → .08 on white
    var loOp = (0.20 + baseLum * 0.34).toFixed(3);   // .20 on black → .54 on white

    kids.push(h('defs', { key: 'defs' },
      h('clipPath', { id: clip }, h('path', { d: sil })),
      // Volume: lit from the upper left, falling away to the lower right.
      h('linearGradient', { id: shadeId, x1: '0%', y1: '0%', x2: '75%', y2: '100%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: hiOp }),
        h('stop', { offset: '45%', stopColor: '#ffffff', stopOpacity: 0.03 }),
        h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: loOp })),
      // Tight specular for the shiny families.
      h('radialGradient', { id: glossId, cx: '32%', cy: '26%', r: '42%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.72 }),
        h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 }))
    ));

    // Contact shadow — lifts the specimen off the tile.
    kids.push(h('ellipse', { key: 'shadow', cx: S / 2, cy: S * 0.93, rx: S * 0.33, ry: S * 0.055, fill: '#0f172a', opacity: 0.22 }));

    // Body
    kids.push(h('path', { key: 'body', d: sil, fill: cols[0] }));

    var g = [];
    // ART OVERRIDES. `texture` is user-facing — it is glossed in the detail
    // panel, read out to screen readers and used by the quizzes — so the
    // identifying features a description NAMES are carried in a separate `art`
    // field rather than by inventing new texture words. Every value here exists
    // because the words promised something the picture did not show.
    var art = (rock && rock.art) || '';

    if (art === 'conchoidal') {
      // Conchoidal fracture is the whole reason obsidian is on a rock chart:
      // shell-like ripples nesting around the point the flake was struck. The
      // art drew five arcs straight across the body, which reads as a highlight
      // on a black pebble, not as a fracture.
      g.push(h('rect', { key: 'gl', x: 0, y: 0, width: S, height: S, fill: cols[0] }));
      var ox = S * 0.32, oy = S * 0.26;
      for (i = 1; i <= 7; i++) {
        g.push(h('circle', {
          key: 'ch' + i, cx: ox.toFixed(1), cy: oy.toFixed(1), r: (S * 0.115 * i).toFixed(2),
          fill: 'none', // SC 1.4.11: conchoidal fracture IS obsidian's diagnostic, so the
          // ripples are a graphic required to understand the content. The old
          // ramp faded the outermost ring to 2.44:1 on the black glass.
          stroke: 'rgba(198,220,255,' + (0.62 - i * 0.024).toFixed(3) + ')',
          strokeWidth: (S * 0.02).toFixed(2),
        }));
      }
      // The struck point catches the most light.
      g.push(h('circle', { key: 'chp', cx: ox.toFixed(1), cy: oy.toFixed(1), r: (S * 0.035).toFixed(2), fill: 'rgba(224,238,255,0.55)' }));
    } else if (art === 'saltpepper') {
      // "Salt and pepper" is a FINE intermix. Diorite listed its darkest colour
      // first, so that became the whole body with a few big pale blocks on top —
      // it read as a cow, not as the even speckle the description names.
      g.push(h('rect', { key: 'sp-bg', x: 0, y: 0, width: S, height: S, fill: '#9ca3af' }));
      for (i = 0; i < 54; i++) {
        var spx = rnd() * S, spy = rnd() * S, spr = 0.055 * S * (0.6 + rnd() * 0.8);
        var spSides = 4 + Math.floor(rnd() * 3), spPts = [];
        for (var sk = 0; sk < spSides; sk++) {
          var spa = (sk / spSides) * Math.PI * 2 + rnd() * 0.5;
          spPts.push((spx + Math.cos(spa) * spr).toFixed(1) + ',' + (spy + Math.sin(spa) * spr).toFixed(1));
        }
        g.push(h('polygon', { key: 'sp-grain-' + i, points: spPts.join(' '), fill: i % 2 ? cols[0] : cols[1], opacity: 0.95, stroke: edge, strokeWidth: 0.35 }));
      }
    } else if (art === 'slaty') {
      // Slate, phyllite and schist all carried texture 'foliated', so all three
      // drew the same wavy lozenge and differed only in colour. They are the
      // metamorphic grade sequence — the differences between them ARE the
      // lesson, and the art was erasing it. Slate splits into flat, smooth
      // sheets, so its foliation is dead straight.
      for (i = 1; i < 9; i++) {
        var sly = (i / 9) * S;
        g.push(h('line', {
          key: 'sl' + i, x1: 0, y1: sly.toFixed(1), x2: S, y2: sly.toFixed(1),
          stroke: ink(i), strokeWidth: 0.9, opacity: 0.7,
        }));
      }
      // One sheet lifted clear of the face — the cleavage you can actually split.
      g.push(h('path', {
        key: 'sledge',
        d: 'M0,' + (S * 0.62).toFixed(1) + ' L' + S + ',' + (S * 0.56).toFixed(1)
          + ' L' + S + ',' + (S * 0.605).toFixed(1) + ' L0,' + (S * 0.665).toFixed(1) + ' Z',
        fill: 'rgba(255,255,255,0.22)',
      }));
    } else if (art === 'crenulated') {
      // Phyllite's description calls out a CRINKLED foliation surface and a
      // satiny sheen. Straight lines showed neither.
      for (i = 1; i < 12; i++) {
        var cry = (i / 12) * S;
        var crd = 'M0,' + cry.toFixed(1);
        for (var w = 1; w <= 6; w++) {
          var wx = (w / 6) * S;
          crd += ' Q' + (wx - S / 12).toFixed(1) + ',' + (cry + (w % 2 ? -1 : 1) * S * 0.030).toFixed(1)
            + ' ' + wx.toFixed(1) + ',' + cry.toFixed(1);
        }
        g.push(h('path', { key: 'cr' + i, d: crd, fill: 'none', stroke: ink(i), strokeWidth: 0.95, opacity: 0.85 }));
      }
    } else if (art === 'schistose') {
      // Schist is defined by mica flakes big enough to SEE, lying in one plane
      // and flashing as the specimen turns. Featureless bands are exactly what
      // schist is not.
      // A foliated silhouette is a flat lozenge that fills only the middle of
      // the box, so scattering flakes over the whole square put most of them
      // outside the clip and the specimen came back nearly bare. Slate and
      // phyllite hid this because they draw lines clear across, so whatever
      // survived the clip still read as banding.
      for (i = 0; i < 26; i++) {
        var mx = S * (0.06 + rnd() * 0.88), my = S * (0.30 + rnd() * 0.40);
        var mw = S * (0.10 + rnd() * 0.10), mh = S * 0.030;
        var tilt = (-8 + (rnd() - 0.5) * 10).toFixed(1);
        var mrot = 'rotate(' + tilt + ' ' + mx.toFixed(1) + ' ' + my.toFixed(1) + ')';
        g.push(h('rect', {
          key: 'mk' + i, x: (mx - mw / 2).toFixed(1), y: (my - mh / 2).toFixed(1),
          width: mw.toFixed(1), height: mh.toFixed(2), rx: (mh / 2).toFixed(2),
          fill: pick(i + 1), opacity: 0.92, stroke: edge, strokeWidth: 0.3, transform: mrot,
        }));
        // The sparkle: the flakes that happen to be angled into the light.
        if (i % 2 === 0) {
          g.push(h('rect', {
            key: 'mks' + i, x: (mx - mw / 2).toFixed(1), y: (my - mh / 2).toFixed(1),
            width: mw.toFixed(1), height: (mh * 0.42).toFixed(2), rx: (mh / 4).toFixed(2),
            fill: 'rgba(255,255,255,0.72)', transform: mrot,
          }));
        }
      }
    } else if (art === 'shards') {
      // Tuff is welded ASH — angular glass shards and pumice scraps. The
      // vesicular texture drew round gas bubbles, which says pumice, not tuff.
      for (i = 0; i < 30; i++) {
        var hx = rnd() * S, hy = rnd() * S, hr = 0.06 * S * (0.6 + rnd() * 1.1);
        var hPts = [];
        for (var hk = 0; hk < 4; hk++) {
          var ha = (hk / 4) * Math.PI * 2 + rnd() * 0.9;
          var hrr = hr * (0.5 + rnd());
          hPts.push((hx + Math.cos(ha) * hrr).toFixed(1) + ',' + (hy + Math.sin(ha) * hrr).toFixed(1));
        }
        g.push(h('polygon', { key: 'sd' + i, points: hPts.join(' '), fill: pick(i + 1), stroke: edge, strokeWidth: 0.55, opacity: 0.95 }));
      }
    } else if (tex === 'coarse-grained' || tex === 'crystalline' || tex === 'non-foliated') {
      var n = tex === 'coarse-grained' ? 9 : 12;
      for (i = 0; i < n; i++) {
        var cx2 = rnd() * S, cy2 = rnd() * S;
        var r = (tex === 'coarse-grained' ? 0.17 : 0.12) * S * (0.7 + rnd() * 0.6);
        var sides = 5 + Math.floor(rnd() * 2);
        var pts = [];
        for (var k = 0; k < sides; k++) {
          var a = (k / sides) * Math.PI * 2 + rnd() * 0.4;
          pts.push((cx2 + Math.cos(a) * r).toFixed(1) + ',' + (cy2 + Math.sin(a) * r).toFixed(1));
        }
        g.push(h('polygon', { key: 'c' + i, points: pts.join(' '), fill: pick(i + 1), stroke: edge, strokeWidth: 0.6 }));
      }
    } else if (tex === 'fine-grained') {
      for (i = 0; i < 70; i++) {
        g.push(h('circle', { key: 'f' + i, cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1), r: (0.035 * S * (0.6 + rnd())).toFixed(2), fill: pick(i + 1), opacity: 0.85, stroke: edge, strokeWidth: 0.35 }));
      }
    } else if (tex === 'glassy') {
      g.push(h('rect', { key: 'gl', x: 0, y: 0, width: S, height: S, fill: cols[0] }));
      for (i = 0; i < 5; i++) {
        g.push(h('path', {
          key: 'arc' + i,
          d: 'M' + (S * 0.1) + ',' + (S * (0.2 + i * 0.16)) + ' Q' + (S * 0.55) + ',' + (S * (0.05 + i * 0.16)) + ' ' + (S * 0.95) + ',' + (S * (0.28 + i * 0.16)),
          fill: 'none', stroke: 'rgba(190,215,255,0.30)', strokeWidth: 0.7,
        }));
      }
    } else if (tex === 'vesicular') {
      for (i = 0; i < 26; i++) {
        g.push(h('circle', { key: 'v' + i, cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1), r: (0.045 * S * (0.6 + rnd() * 1.4)).toFixed(2), fill: 'rgba(60,50,45,0.45)', stroke: edge, strokeWidth: 0.4 }));
      }
    } else if (tex === 'clastic') {
      for (i = 1; i < 5; i++) {
        g.push(h('line', { key: 'b' + i, x1: 0, y1: (i / 5) * S, x2: S, y2: (i / 5) * S, stroke: 'rgba(0,0,0,0.13)', strokeWidth: 0.7 }));
      }
      for (i = 0; i < 46; i++) {
        g.push(h('circle', { key: 'gr' + i, cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1), r: (0.05 * S * (0.7 + rnd() * 0.6)).toFixed(2), fill: pick(i + 1), opacity: 0.9, stroke: edge, strokeWidth: 0.4 }));
      }
    } else if (tex === 'clastic-coarse') {
      for (i = 0; i < 8; i++) {
        g.push(h('ellipse', {
          key: 'p' + i,
          cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1),
          rx: (0.13 * S * (0.7 + rnd() * 0.7)).toFixed(2), ry: (0.10 * S * (0.7 + rnd() * 0.7)).toFixed(2),
          fill: pick(i + 1), stroke: edge, strokeWidth: 0.6,
        }));
      }
    } else if (tex === 'clastic-fine') {
      // Silt is defined by what you CANNOT see: no grain is resolvable, but the
      // rock is still gritty and still bedded. Fine speckle plus faint bedding.
      for (i = 1; i < 5; i++) {
        g.push(h('line', { key: 'sb' + i, x1: 0, y1: (i / 5) * S, x2: S, y2: (i / 5) * S, stroke: 'rgba(0,0,0,0.09)', strokeWidth: 0.5 }));
      }
      for (i = 0; i < 120; i++) {
        g.push(h('circle', { key: 'sf' + i, cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1), r: (0.012 * S * (0.7 + rnd() * 0.8)).toFixed(2), fill: pick(i + 1), opacity: 0.85 }));
      }
    } else if (tex === 'organic-banded') {
      // Bituminous coal is banded: dull layers alternating with bright, glassy
      // vitrain. The bright bands are the lesson, so they get the contrast.
      for (i = 0; i < 9; i++) {
        g.push(h('rect', { key: 'cb' + i, x: 0, y: ((i / 9) * S).toFixed(1), width: S, height: (S / 9).toFixed(1), fill: pick(i + 1), opacity: 0.9 }));
      }
      for (i = 0; i < 3; i++) {
        var vy = ((i * 3 + 1.2) / 9) * S;
        g.push(h('rect', { key: 'vt' + i, x: 0, y: vy.toFixed(1), width: S, height: (S * 0.045).toFixed(2), fill: '#cbd5e1', opacity: 0.75, stroke: edge, strokeWidth: 0.4 }));
      }
    } else if (tex === 'clastic-angular') {
      // Breccia. Same clast sizes as conglomerate, but drawn as polygons with
      // real corners: rounding takes distance, so the corners ARE the evidence
      // that these fragments were buried close to where they broke.
      for (i = 0; i < 8; i++) {
        var acx = rnd() * S, acy = rnd() * S, acr = 0.13 * S * (0.7 + rnd() * 0.7);
        var apts = [];
        for (var av = 0; av < 5; av++) {
          var aang = (av / 5) * Math.PI * 2 + rnd() * 0.5;
          var arad = acr * (0.62 + rnd() * 0.55);
          apts.push((acx + Math.cos(aang) * arad).toFixed(1) + ',' + (acy + Math.sin(aang) * arad).toFixed(1));
        }
        g.push(h('polygon', { key: 'ac' + i, points: apts.join(' '), fill: pick(i + 1), stroke: edge, strokeWidth: 0.6 }));
      }
    } else if (tex === 'bioclastic') {
      for (i = 1; i < 4; i++) {
        g.push(h('line', { key: 'bl' + i, x1: 0, y1: (i / 4) * S, x2: S, y2: (i / 4) * S, stroke: 'rgba(0,0,0,0.10)', strokeWidth: 0.6 }));
      }
      for (i = 0; i < 9; i++) {
        var sx = rnd() * S, sy = rnd() * S, sr = 0.11 * S;
        g.push(h('path', { key: 'sh' + i, d: 'M' + (sx - sr) + ',' + sy + ' a' + sr + ',' + sr + ' 0 0,1 ' + (sr * 2) + ',0', fill: 'none', stroke: ink(i + 1), strokeWidth: 1.1 }));
      }
    } else if (tex === 'fine-layered') {
      for (i = 1; i < 14; i++) {
        g.push(h('line', { key: 'fl' + i, x1: 0, y1: (i / 14) * S, x2: S, y2: (i / 14) * S, stroke: ink(i), strokeWidth: 0.8, opacity: 0.75 }));
      }
    } else if (tex === 'foliated') {
      for (i = 1; i < 11; i++) {
        var fy = (i / 11) * S;
        g.push(h('path', { key: 'fo' + i, d: 'M0,' + fy.toFixed(1) + ' Q' + (S * 0.5) + ',' + (fy - S * 0.05).toFixed(1) + ' ' + S + ',' + fy.toFixed(1), fill: 'none', stroke: ink(i), strokeWidth: 1.0, opacity: 0.85 }));
      }
    } else if (tex === 'banded') {
      for (i = 0; i < 6; i++) {
        var by = (i / 6) * S + S * 0.06;
        g.push(h('path', {
          key: 'bd' + i,
          d: 'M0,' + by.toFixed(1) + ' Q' + (S * 0.3) + ',' + (by - S * 0.07).toFixed(1) + ' ' + (S * 0.6) + ',' + by.toFixed(1) + ' T' + S + ',' + (by - S * 0.02).toFixed(1),
          fill: 'none', stroke: ink(i), strokeWidth: S * 0.09, opacity: 0.9,
        }));
      }
    } else {
      for (i = 0; i < 40; i++) {
        g.push(h('circle', { key: 'd' + i, cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1), r: 0.04 * S, fill: pick(i + 1), stroke: edge, strokeWidth: 0.35 }));
      }
    }

    // ADDITIVE features. These lie on top of the rock's own grain rather than
    // replacing it, because the description names them IN ADDITION to the
    // texture — a flow-banded rhyolite is still fine-grained.
    if (art === 'flowbanded') {
      // "Often with flow banding": the lava was still moving as it froze.
      for (i = 0; i < 7; i++) {
        var fby = S * (0.10 + i * 0.125);
        g.push(h('path', {
          key: 'fb' + i,
          d: 'M0,' + fby.toFixed(1) + ' Q' + (S * 0.35).toFixed(1) + ',' + (fby - S * 0.06).toFixed(1)
            + ' ' + (S * 0.62).toFixed(1) + ',' + fby.toFixed(1) + ' T' + S + ',' + (fby + S * 0.02).toFixed(1),
          fill: 'none', stroke: ink(i + 1), strokeWidth: (S * 0.035).toFixed(2), opacity: 0.55,
        }));
      }
    } else if (art === 'bandedporous') {
      // Travertine: "often has a banded, porous appearance". It had neither —
      // the identical omission its thin section had.
      for (i = 0; i < 6; i++) {
        var tby = S * (0.12 + i * 0.145);
        g.push(h('path', {
          key: 'tb' + i,
          d: 'M0,' + tby.toFixed(1) + ' Q' + (S * 0.5).toFixed(1) + ',' + (tby - S * 0.035).toFixed(1) + ' ' + S + ',' + tby.toFixed(1),
          fill: 'none', stroke: ink(i + 1), strokeWidth: (S * 0.045).toFixed(2), opacity: 0.6,
        }));
      }
      for (i = 0; i < 12; i++) {
        g.push(h('ellipse', {
          key: 'tp' + i, cx: (rnd() * S).toFixed(1), cy: (rnd() * S).toFixed(1),
          rx: (0.05 * S * (0.6 + rnd())).toFixed(2), ry: (0.035 * S * (0.6 + rnd())).toFixed(2),
          fill: 'rgba(70,58,40,0.42)',
        }));
      }
    }

    kids.push(h('g', { key: 'tex', clipPath: 'url(#' + clip + ')' }, g));

    // Volume shading over the texture, then a specular only where it belongs —
    // obsidian and metallic-looking rocks catch light, sandstone does not.
    // Phyllite earns one too: "silky, satiny sheen" is the property its own
    // description leads with.
    kids.push(h('path', { key: 'shade', d: sil, fill: 'url(#' + shadeId + ')' }));
    if (art === 'conchoidal' || art === 'crenulated'
      || tex === 'glassy' || tex === 'crystalline' || tex === 'non-foliated') {
      kids.push(h('path', { key: 'gloss', d: sil, fill: 'url(#' + glossId + ')' }));
    }
    // Rim: dark contact edge plus a light catch along the top.
    kids.push(h('path', { key: 'rim', d: sil, fill: 'none', stroke: 'rgba(15,23,42,0.55)', strokeWidth: Math.max(0.7, S * 0.022), strokeLinejoin: silKind === 'rounded' ? 'round' : 'miter' }));

    return h('svg', {
      width: S, height: S, viewBox: '0 0 ' + S + ' ' + S,
      'aria-hidden': true, focusable: 'false',
      style: { display: 'block', overflow: 'visible' },
    }, kids);
  }

  // Mineral swatch: crystal HABIT as the outline, LUSTRE as the shading.
  // Those are the two properties a mineral key leads with, and neither was
  // previously visible anywhere in the tool.
  function rkMineralSwatch(h, mineral, size) {
    var S = size || 40;
    var base = (mineral && mineral.color) || '#cbd5e1';
    var sys = String((mineral && mineral.crystal) || '').toLowerCase();
    var lus = String((mineral && mineral.luster) || '').toLowerCase();
    var id = mineral ? mineral.id : 'x';
    var kids = [];
    // The habit branches below loop; without this the counter leaks to the
    // global scope in sloppy mode and throws under strict.
    var i;

    var metallic = lus.indexOf('metallic') !== -1;
    var earthy = lus.indexOf('earthy') !== -1;
    var pearly = lus.indexOf('pearly') !== -1;
    var silky = lus.indexOf('silky') !== -1;
    var adamantine = lus.indexOf('adamantine') !== -1;

    var vaultId = 'rkvault-' + id;
    var faceId = 'rkface-' + id;

    // Backing plate: a soft vignette rather than flat slate, so pale minerals
    // stay visible and the crystal reads as sitting in a display case.
    kids.push(h('defs', { key: 'defs' },
      h('radialGradient', { id: vaultId, cx: '38%', cy: '30%', r: '78%' },
        h('stop', { offset: '0%', stopColor: '#5b6b80' }),
        h('stop', { offset: '100%', stopColor: '#1c2738' })),
      // Face shading: crystals are faceted, so light falls off across each face
      // instead of filling it evenly.
      h('linearGradient', { id: faceId, x1: '0%', y1: '0%', x2: '60%', y2: '100%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.30 }),
        h('stop', { offset: '55%', stopColor: '#ffffff', stopOpacity: 0.02 }),
        h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: 0.30 }))
    ));
    kids.push(h('rect', { key: 'plate', x: 0, y: 0, width: S, height: S, rx: S * 0.16, fill: 'url(#' + vaultId + ')' }));
    // Contact shadow under the crystal.
    kids.push(h('ellipse', { key: 'shadow', cx: S / 2, cy: S * 0.82, rx: S * 0.26, ry: S * 0.05, fill: '#000000', opacity: 0.38 }));

    var c = S / 2;
    var shape;
    var outline = 'rgba(0,0,0,0.55)';

    // CRYSTAL SYSTEM is not crystal HABIT. The silhouette was chosen from the
    // system alone, which is right for most minerals and wrong for the ones
    // whose description names a habit: magnetite says "Octahedral crystal
    // habit" and drew a cube, garnet says "dodecahedral crystals (12-sided)"
    // and drew a four-sided block. Both are cubic-system minerals, so the
    // system was doing its job — it simply is not the thing being described.
    // `habit` overrides the system where a description commits to a shape.
    var habit = String((mineral && mineral.habit) || '').toLowerCase();
    // The facet gradient used to be laid down as a loose rectangle over the
    // whole tile. Behind a cube that is invisible, but a narrow habit lets the
    // rectangle's corners show on the backing plate as a grey box. Each branch
    // records the outline of its main face so the shading can follow the
    // crystal instead of the tile.
    var facetPts = null;

    if (habit === 'octahedral') {
      // Two square pyramids base to base, seen edge-on: the shape magnetite
      // and spinel actually grow.
      var ow2 = S * 0.30, oh2 = S * 0.36;
      shape = [
        h('polygon', { key: 'octL', points: [c + ',' + (c - oh2), (c - ow2) + ',' + c, c + ',' + (c + oh2)].join(' '), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'octR', points: [c + ',' + (c - oh2), (c + ow2) + ',' + c, c + ',' + (c + oh2)].join(' '), fill: base, opacity: 0.68, stroke: outline, strokeWidth: 0.9 }),
        // The waist edge, which is what tells you it is two pyramids.
        h('line', { key: 'octW', x1: c - ow2, y1: c, x2: c + ow2, y2: c, stroke: 'rgba(0,0,0,0.28)', strokeWidth: 0.7 }),
      ];
      facetPts = [c + ',' + (c - oh2), (c + ow2) + ',' + c, c + ',' + (c + oh2), (c - ow2) + ',' + c].join(' ');
    } else if (habit === 'dodecahedral') {
      // A rhombic dodecahedron down its three-fold axis: a hexagon divided
      // into three rhombic faces. Twelve faces is the thing garnet is known
      // for, and it is how you tell a garnet from a cube of pyrite by eye.
      var dr = S * 0.34, dv = [];
      for (i = 0; i < 6; i++) {
        var da = (Math.PI / 3) * i - Math.PI / 2;
        dv.push([c + Math.cos(da) * dr, c + Math.sin(da) * dr]);
      }
      var quad = function (n) {
        return [c + ',' + c, dv[n][0].toFixed(1) + ',' + dv[n][1].toFixed(1),
          dv[(n + 1) % 6][0].toFixed(1) + ',' + dv[(n + 1) % 6][1].toFixed(1),
          dv[(n + 2) % 6][0].toFixed(1) + ',' + dv[(n + 2) % 6][1].toFixed(1)].join(' ');
      };
      shape = [
        h('polygon', { key: 'dodA', points: quad(0), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'dodB', points: quad(2), fill: base, opacity: 0.74, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'dodC', points: quad(4), fill: base, opacity: 0.54, stroke: outline, strokeWidth: 0.9 }),
      ];
      facetPts = dv.map(function (v) { return v[0].toFixed(1) + ',' + v[1].toFixed(1); }).join(' ');
    } else if (habit === 'blocky90') {
      // Two cleavage directions meeting at very nearly a right angle. The lean
      // is a few degrees of perspective, not the 20-plus of a rhomb.
      var bw = S * 0.26, bh = S * 0.30, bo = S * 0.07;
      shape = [
        h('polygon', { key: 'fsFront', points: [(c - bw) + ',' + (c - bh + bo), (c + bw - bo) + ',' + (c - bh + bo), (c + bw - bo) + ',' + (c + bh), (c - bw) + ',' + (c + bh)].join(' '), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'fsTop', points: [(c - bw) + ',' + (c - bh + bo), (c - bw + bo) + ',' + (c - bh), (c + bw) + ',' + (c - bh), (c + bw - bo) + ',' + (c - bh + bo)].join(' '), fill: base, opacity: 0.74, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'fsSide', points: [(c + bw - bo) + ',' + (c - bh + bo), (c + bw) + ',' + (c - bh), (c + bw) + ',' + (c + bh - bo), (c + bw - bo) + ',' + (c + bh)].join(' '), fill: base, opacity: 0.55, stroke: outline, strokeWidth: 0.9 }),
        // The two cleavage sets, drawn square to each other so the angle reads.
        h('line', { key: 'fsClH', x1: (c - bw + S * 0.03).toFixed(1), y1: (c + bh * 0.10).toFixed(1), x2: (c + bw - bo - S * 0.03).toFixed(1), y2: (c + bh * 0.10).toFixed(1), stroke: 'rgba(0,0,0,0.30)', strokeWidth: 0.6 }),
        h('line', { key: 'fsClV', x1: (c - bw * 0.15).toFixed(1), y1: (c - bh + bo + S * 0.03).toFixed(1), x2: (c - bw * 0.15).toFixed(1), y2: (c + bh - S * 0.03).toFixed(1), stroke: 'rgba(0,0,0,0.30)', strokeWidth: 0.6 }),
      ];
      facetPts = [(c - bw) + ',' + (c - bh + bo), (c - bw + bo) + ',' + (c - bh), (c + bw) + ',' + (c - bh), (c + bw) + ',' + (c + bh - bo), (c + bw - bo) + ',' + (c + bh), (c - bw) + ',' + (c + bh)].join(' ');
    } else if (habit === 'micaceous') {
      // "Peels into thin, flexible sheets ... perfect basal cleavage produces
      // incredibly thin layers." Two rules across a block does not say thin.
      var kw = S * 0.28, kh = S * 0.24, kl = S * 0.10;
      shape = [h('polygon', {
        key: 'micaBody',
        points: [(c - kw + kl) + ',' + (c - kh), (c + kw) + ',' + (c - kh * 0.82),
          (c + kw - kl) + ',' + (c + kh), (c - kw) + ',' + (c + kh * 0.82)].join(' '),
        fill: base, stroke: outline, strokeWidth: 0.9,
      })];
      for (i = 1; i < 9; i++) {
        var kt = i / 9;
        shape.push(h('line', {
          key: 'mksheet' + i,
          x1: (c - kw + kl * (1 - kt)).toFixed(1), y1: (c - kh + kt * kh * 1.82).toFixed(1),
          x2: (c + kw - kl * kt).toFixed(1), y2: (c - kh * 0.82 + kt * kh * 1.82).toFixed(1),
          stroke: 'rgba(0,0,0,0.26)', strokeWidth: 0.45,
        }));
      }
    } else if (sys.indexOf('cubic') !== -1 || sys.indexOf('isometric') !== -1) {
      // Cube drawn in projection: front face + top + right so it reads 3-D.
      var a = S * 0.30, off = S * 0.14;
      shape = [
        h('polygon', { key: 'front', points: [(c - a) + ',' + (c - a + off), (c + a - off) + ',' + (c - a + off), (c + a - off) + ',' + (c + a), (c - a) + ',' + (c + a)].join(' '), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'top', points: [(c - a) + ',' + (c - a + off), (c - a + off) + ',' + (c - a), (c + a) + ',' + (c - a), (c + a - off) + ',' + (c - a + off)].join(' '), fill: base, opacity: 0.75, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'side', points: [(c + a - off) + ',' + (c - a + off), (c + a) + ',' + (c - a), (c + a) + ',' + (c + a - off), (c + a - off) + ',' + (c + a)].join(' '), fill: base, opacity: 0.55, stroke: outline, strokeWidth: 0.9 }),
      ];
    } else if (sys.indexOf('hexagonal') !== -1) {
      // Hexagonal prism with a pointed termination (quartz habit).
      var hw = S * 0.19, top = S * 0.14, mid = S * 0.30, bot = S * 0.86;
      shape = [
        h('polygon', { key: 'prism', points: [(c - hw) + ',' + mid, c + ',' + top, (c + hw) + ',' + mid, (c + hw) + ',' + bot, (c - hw) + ',' + bot].join(' '), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('line', { key: 'edge', x1: c, y1: top, x2: c, y2: bot, stroke: 'rgba(0,0,0,0.30)', strokeWidth: 0.7 }),
        h('line', { key: 'face', x1: c - hw * 0.35, y1: mid * 1.02, x2: c - hw * 0.35, y2: bot, stroke: 'rgba(255,255,255,0.35)', strokeWidth: 0.7 }),
      ];
    } else if (sys.indexOf('rhombohedral') !== -1 || sys.indexOf('trigonal') !== -1) {
      // Rhomb — calcite always breaks into leaning parallelograms.
      var rw = S * 0.28, rh = S * 0.24, sk = S * 0.11;
      shape = [
        h('polygon', { key: 'rhomb', points: [(c - rw + sk) + ',' + (c - rh), (c + rw) + ',' + (c - rh), (c + rw - sk) + ',' + (c + rh), (c - rw) + ',' + (c + rh)].join(' '), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('line', { key: 'cl1', x1: c - rw + sk * 0.4, y1: c - rh * 0.3, x2: c + rw - sk * 0.6, y2: c - rh * 0.3, stroke: 'rgba(0,0,0,0.22)', strokeWidth: 0.6 }),
        h('line', { key: 'cl2', x1: c - rw + sk * 0.1, y1: c + rh * 0.4, x2: c + rw - sk * 0.9, y2: c + rh * 0.4, stroke: 'rgba(0,0,0,0.22)', strokeWidth: 0.6 }),
      ];
    } else if (sys.indexOf('orthorhombic') !== -1) {
      // Blocky elongated prism.
      var ow = S * 0.20, oh = S * 0.32;
      shape = [
        h('rect', { key: 'ortho', x: c - ow, y: c - oh, width: ow * 2, height: oh * 2, fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('polygon', { key: 'orthoTop', points: [(c - ow) + ',' + (c - oh), (c - ow + S * 0.08) + ',' + (c - oh - S * 0.08), (c + ow + S * 0.08) + ',' + (c - oh - S * 0.08), (c + ow) + ',' + (c - oh)].join(' '), fill: base, opacity: 0.7, stroke: outline, strokeWidth: 0.8 }),
      ];
    } else {
      // Monoclinic / triclinic: leaning, unequal — plus stacked sheets for micas.
      var mw = S * 0.26, mh = S * 0.26, lean = S * 0.10;
      shape = [
        h('polygon', { key: 'mono', points: [(c - mw + lean) + ',' + (c - mh), (c + mw) + ',' + (c - mh * 0.8), (c + mw - lean) + ',' + (c + mh), (c - mw) + ',' + (c + mh * 0.8)].join(' '), fill: base, stroke: outline, strokeWidth: 0.9 }),
        h('line', { key: 'sheet1', x1: c - mw + lean * 0.6, y1: c - mh * 0.35, x2: c + mw - lean * 0.3, y2: c - mh * 0.25, stroke: 'rgba(0,0,0,0.25)', strokeWidth: 0.6 }),
        h('line', { key: 'sheet2', x1: c - mw + lean * 0.3, y1: c + mh * 0.25, x2: c + mw - lean * 0.6, y2: c + mh * 0.35, stroke: 'rgba(0,0,0,0.25)', strokeWidth: 0.6 }),
      ];
    }
    // Striations are additive: they lie ON a prism rather than changing its
    // shape. Topaz's description ends on "prismatic crystals with vertical
    // striations", and the striations are how you tell it from a plain quartz
    // prism in the hand — so they cannot be the one detail left out.
    if (habit === 'striated') {
      for (i = 1; i < 6; i++) {
        var stx = c - S * 0.20 + (i / 6) * S * 0.40;
        shape.push(h('line', {
          key: 'stri' + i, x1: stx.toFixed(1), y1: (c - S * 0.30).toFixed(1),
          x2: stx.toFixed(1), y2: (c + S * 0.32).toFixed(1),
          stroke: 'rgba(0,0,0,0.24)', strokeWidth: 0.5,
        }));
      }
    }

    // Scale the habit up about the tile centre. Drawn at the original size the
    // crystal sat small inside its plate and the whole thing read as a flat app
    // icon rather than a specimen in a case; the crystal should be the object.
    kids.push(h('g', {
      key: 'habit',
      transform: 'translate(' + (c * (1 - 1.3)).toFixed(2) + ',' + (c * (1 - 1.3)).toFixed(2) + ') scale(1.3)'
    }, shape));
    // Facet shading laid over the habit, so the crystal has volume rather than
    // reading as a flat coloured outline. Earthy minerals are matte by
    // definition, so they are left unshaded.
    if (!earthy) {
      kids.push(facetPts
        ? h('g', {
          key: 'facet',
          transform: 'translate(' + (c * (1 - 1.3)).toFixed(2) + ',' + (c * (1 - 1.3)).toFixed(2) + ') scale(1.3)',
        }, h('polygon', { points: facetPts, fill: 'url(#' + faceId + ')', style: { mixBlendMode: 'soft-light' }, pointerEvents: 'none' }))
        : h('rect', { key: 'facet', x: S * 0.16, y: S * 0.10, width: S * 0.68, height: S * 0.72, fill: 'url(#' + faceId + ')', style: { mixBlendMode: 'soft-light' }, pointerEvents: 'none' }));
    }

    // ── Lustre ──
    if (metallic) {
      // Hard, bright specular band — the giveaway that it looks like metal.
      kids.push(h('polygon', { key: 'spec', points: [(c - S * 0.22) + ',' + (c + S * 0.10), (c - S * 0.05) + ',' + (c - S * 0.22), (c + S * 0.06) + ',' + (c - S * 0.20), (c - S * 0.12) + ',' + (c + S * 0.12)].join(' '), fill: 'rgba(255,255,255,0.72)' }));
      kids.push(h('circle', { key: 'glint', cx: c + S * 0.13, cy: c - S * 0.13, r: S * 0.035, fill: '#ffffff' }));
    } else if (adamantine) {
      // Brilliant, diamond-like: multiple sharp sparkles.
      [[0.14, -0.16, 0.055], [-0.16, 0.06, 0.04], [0.04, 0.18, 0.032]].forEach(function (s, i) {
        kids.push(h('path', {
          key: 'spark' + i,
          d: 'M' + (c + S * s[0]) + ',' + (c + S * s[1] - S * s[2]) + ' L' + (c + S * s[0] + S * s[2] * 0.35) + ',' + (c + S * s[1]) + ' L' + (c + S * s[0]) + ',' + (c + S * s[1] + S * s[2]) + ' L' + (c + S * s[0] - S * s[2] * 0.35) + ',' + (c + S * s[1]) + ' Z',
          fill: '#ffffff', opacity: 0.9,
        }));
      });
    } else if (pearly) {
      // Soft, spread iridescent sheen across the cleavage face.
      kids.push(h('ellipse', { key: 'pearl', cx: c - S * 0.06, cy: c - S * 0.06, rx: S * 0.20, ry: S * 0.12, fill: 'rgba(255,255,255,0.42)', transform: 'rotate(-22 ' + (c - S * 0.06) + ' ' + (c - S * 0.06) + ')' }));
    } else if (silky) {
      // Fine parallel fibres.
      for (var f = 0; f < 7; f++) {
        kids.push(h('line', { key: 'silk' + f, x1: c - S * 0.22 + f * S * 0.07, y1: c - S * 0.24, x2: c - S * 0.26 + f * S * 0.07, y2: c + S * 0.24, stroke: 'rgba(255,255,255,0.30)', strokeWidth: 0.6 }));
      }
    } else if (earthy) {
      // Matte, dusty — deliberately NO highlight; that absence is the diagnostic.
      for (var e = 0; e < 22; e++) {
        var er = rkSeed(id + e)();
        kids.push(h('circle', { key: 'dust' + e, cx: (c - S * 0.28 + er * S * 0.56).toFixed(1), cy: (c - S * 0.28 + rkSeed(id + 'y' + e)() * S * 0.56).toFixed(1), r: 0.5, fill: 'rgba(0,0,0,0.28)' }));
      }
    } else {
      // Vitreous (glassy) — the default: one clean, contained highlight.
      kids.push(h('ellipse', { key: 'vit', cx: c - S * 0.09, cy: c - S * 0.11, rx: S * 0.10, ry: S * 0.06, fill: 'rgba(255,255,255,0.55)', transform: 'rotate(-30 ' + (c - S * 0.09) + ' ' + (c - S * 0.11) + ')' }));
    }

    return h('svg', {
      width: S, height: S, viewBox: '0 0 ' + S + ' ' + S,
      'aria-hidden': true, focusable: 'false',
      style: { display: 'block', borderRadius: (S * 0.16) + 'px' },
    }, kids);
  }

  // Plain-language gloss for what the swatch is showing. Used as the tile's
  // accessible description so a screen-reader user gets the same diagnostic
  // information the picture carries, not just the specimen name.
  var RK_TEXTURE_GLOSS = {
    'coarse-grained': 'coarse interlocking crystals you can see without a lens',
    'fine-grained': 'grains too fine to tell apart by eye',
    'glassy': 'smooth volcanic glass with curved, shell-like fracture',
    'vesicular': 'full of frozen gas bubbles',
    'clastic': 'cemented sand grains in visible beds',
    'clastic-coarse': 'rounded pebbles set in a finer matrix',
    'clastic-angular': 'sharp-cornered fragments set in a finer matrix',
    'bioclastic': 'packed with shell and fossil fragments',
    'clastic-fine': 'grains too fine to pick out by eye, and no splitting layers',
    'organic-banded': 'dull black rock banded with brighter, glassier layers',
    'fine-layered': 'very thin flat layers that split apart',
    'crystalline': 'tightly interlocking sugary crystals',
    'foliated': 'flat minerals all lined up in wavy layers',
    'non-foliated': 'interlocking crystals with no layering',
    'banded': 'alternating light and dark mineral bands',
  };

  // ══ Thin section under a polarizing microscope ══
  // The tool had a hand-specimen view and an atomic-scale view and nothing in
  // between — but the gap it skipped is where petrology actually happens. A
  // 30 µm slice under a polarizing microscope at 40-400x is how a geologist
  // identifies the minerals IN a rock, and it is the one instrument that ties
  // this tool's two halves together: the rocks mode and the minerals mode are
  // the same subject at two magnifications, and a thin section is where you see
  // that. Granite stops being "speckled grey" and becomes quartz + feldspar +
  // mica, each identifiable by how it behaves in polarized light.
  //
  // Two illumination modes, because that is how the instrument works:
  //   PPL — plane-polarized light. Shows natural colour, relief and cleavage.
  //   XPL — crossed polars: a second filter at 90 degrees to the first. Light
  //         only reaches the eye if the grain rotated the plane of polarization,
  //         so ISOTROPIC minerals stay black at every stage angle (diagnostic on
  //         its own) and anisotropic ones show interference colours and go dark
  //         four times per full rotation — extinction.
  //
  // Everything is deterministic (seeded per rock id), so a student can learn a
  // section and it looks the same on every visit, the same discipline the
  // specimen art follows.

  // birefringence: peak interference colour class under crossed polars.
  // isotropic: never passes light under XPL, whatever the stage angle.
  var RK_OPTICS = {
    quartz:     { ppl: '#f2f4f7', relief: 'low',  bire: ['#8d8f95', '#c9ccd2', '#e8eaee'], iso: false, note: 'colourless, no cleavage; grey to white interference colours' },
    feldspar:   { ppl: '#efe7e2', relief: 'low',  bire: ['#8b8d93', '#bfc2c8', '#dcdfe4'], iso: false, twin: true, note: 'colourless with cleavage traces; grey, and plagioclase shows candy-stripe twins' },
    mica:       { ppl: '#c9b380', relief: 'mid',  bire: ['#e0473a', '#f0a53a', '#63c4b0', '#7f6bd6'], iso: false, cleav: true, note: 'one perfect cleavage; vivid 2nd-order colours' },
    biotite:    { ppl: '#6b4423', relief: 'mid',  bire: ['#7a4a2a', '#a9682f', '#c98a3c'], iso: false, cleav: true, note: 'brown and pleochroic; mottled dark extinction' },
    calcite:    { ppl: '#f4efe4', relief: 'high', bire: ['#f5f0ff', '#ffe9f4', '#eafff4', '#fff6e0'], iso: false, twin: true, note: 'very high relief that changes as you rotate; pearly high-order colours' },
    olivine:    { ppl: '#dbe7c8', relief: 'high', bire: ['#3f8fd6', '#d24f8c', '#4fc06a', '#e0b23a'], iso: false, frac: true, note: 'colourless to pale green, cracked; bright 2nd-3rd order colours' },
    pyroxene:   { ppl: '#cfd9c6', relief: 'high', bire: ['#4f8fd0', '#d6a03f', '#59b98a'], iso: false, cleav: true, note: 'pale green, two cleavages at right angles' },
    amphibole:  { ppl: '#9fb08c', relief: 'high', bire: ['#4e86c4', '#c9903c', '#67a97f'], iso: false, cleav: true, note: 'green and pleochroic, two cleavages at 60/120 degrees' },
    garnet:     { ppl: '#e8b6a8', relief: 'high', bire: ['#000000'], iso: true,  note: 'high relief, no cleavage — and STAYS BLACK under crossed polars at every angle' },
    magnetite:  { ppl: '#1c1c1c', relief: 'high', bire: ['#000000'], iso: true,  opaque: true, note: 'opaque — black in both modes because no light gets through at all' },
    organic:    { ppl: '#241f1c', relief: 'mid',  bire: ['#000000'], iso: true,  opaque: true, note: 'coal macerals are opaque in transmitted light, so they stay black in both modes; coal petrology is done in REFLECTED light for exactly this reason' },
    clay:       { ppl: '#d8cfc2', relief: 'low',  bire: ['#9a9a9a', '#c0bcb4'], iso: false, note: 'too fine to resolve individually; a dull mottled mass' },
    glass:      { ppl: '#d9d5cc', relief: 'low',  bire: ['#000000'], iso: true,  note: 'volcanic glass is not crystalline, so it is isotropic and stays black' },
    cement:     { ppl: '#efe9dd', relief: 'low',  bire: ['#a8a8a8', '#d2d2d2'], iso: false, note: 'the carbonate or silica cement holding the grains together' }
  };

  // What you would actually see in a slice of each rock. Fractions are rough
  // modal proportions and only need to be right enough to read.
  var RK_THIN_SECTION = {
    granite:      { mag: 40, fabric: 'interlocking',  parts: [['quartz', 0.32], ['feldspar', 0.45], ['mica', 0.13], ['biotite', 0.10]], look: 'Interlocking grains with no preferred direction and no space between them — that texture alone says it crystallised slowly from a melt.' },
    diorite:      { mag: 40, fabric: 'interlocking',  parts: [['feldspar', 0.55], ['amphibole', 0.30], ['biotite', 0.15]], look: 'Interlocking, and much darker overall than granite because there is almost no quartz.' },
    basalt:       { mag: 100, fabric: 'interlocking', parts: [['feldspar', 0.42], ['pyroxene', 0.34], ['olivine', 0.14], ['magnetite', 0.10]], look: 'Tiny lath-shaped feldspar crystals in a fine groundmass — chilled too fast for anything to grow large.' },
    andesite:     { mag: 100, fabric: 'interlocking', parts: [['feldspar', 0.52], ['amphibole', 0.24], ['pyroxene', 0.16], ['glass', 0.08]], look: 'A few larger crystals sitting in a much finer groundmass: two cooling rates recorded in one rock.' },
    rhyolite:     { mag: 100, fabric: 'interlocking', parts: [['quartz', 0.28], ['feldspar', 0.40], ['glass', 0.32]], look: 'Glassy groundmass with scattered quartz and feldspar — erupted, not intruded.' },
    obsidian:     { mag: 100, fabric: 'interlocking', parts: [['glass', 1.0]], look: 'No crystals at all. Under crossed polars the whole field stays black however far you rotate, because glass is not a crystal.' },
    pumice:       { mag: 40, fabric: 'interlocking', vesicles: 0.42,  parts: [['glass', 0.92], ['feldspar', 0.08]], look: 'Glass threaded with frozen gas bubbles — mostly holes. Those voids are why it floats.' },
    // 'shards', not 'clastic': tuff IS fragmental, but its fragments were never
    // transported, so they are sharp and cuspate rather than rounded. Tagging it
    // clastic gave it a rounding history it never had.
    tuff:         { mag: 40, fabric: 'shards',  parts: [['glass', 0.55], ['feldspar', 0.20], ['quartz', 0.15], ['clay', 0.10]], look: 'Broken shards of volcanic glass welded together — an ash fall turned to rock. The fragments are angular because they were never carried anywhere.' },
    gabbro:       { mag: 40, fabric: 'interlocking', parts: [['feldspar', 0.55], ['pyroxene', 0.33], ['olivine', 0.06], ['magnetite', 0.06]], look: 'Big interlocking crystals: lath-shaped plagioclase with candy-stripe twins, pale green pyroxene between them, and opaque grains that stay black in both modes. The same minerals as basalt, given time to grow.' },
    sandstone:    { mag: 40, fabric: 'clastic',  parts: [['quartz', 0.70], ['feldspar', 0.12], ['cement', 0.18]], look: 'ROUNDED grains with cement between them — the rounding happened during transport, and the space between grains is the giveaway that this was once loose sand.' },
    conglom:      { mag: 20, fabric: 'clastic',  parts: [['quartz', 0.45], ['feldspar', 0.18], ['clay', 0.15], ['cement', 0.22]], look: 'Large rounded clasts of several different rocks, set in a finer matrix.' },
    breccia:      { mag: 20, fabric: 'shards', parts: [['quartz', 0.38], ['feldspar', 0.20], ['clay', 0.17], ['cement', 0.25]], look: 'Sharp-cornered fragments packed in cement. Put it beside conglomerate at the same magnification: identical idea, rounded clasts. Corners survive only when the pieces did not travel.' },
    // 'shards' for the same reason tuff uses it: angular fragments. Ash was
    // never transported; silt IS transported but is too fine to be rounded by
    // it, because grains this small are cushioned in the water instead of
    // grinding against each other.
    siltstone:    { mag: 100, fabric: 'shards', parts: [['quartz', 0.58], ['feldspar', 0.10], ['clay', 0.18], ['cement', 0.14]], look: 'Grains you can only just resolve at 100x: far bigger than the clay in shale, far smaller than the sand in sandstone. They are still ANGULAR, because transport cannot round a grain this fine.' },
    shale:        { mag: 200, fabric: 'foliated', parts: [['clay', 0.78], ['quartz', 0.16], ['mica', 0.06]], look: 'Clay too fine to resolve even at this magnification, with the flakes weakly lined up.' },
    limestone:    { mag: 40, fabric: 'interlocking',  parts: [['calcite', 0.88], ['cement', 0.12]], look: 'Calcite everywhere, often with fossil fragments still recognisable. Watch the relief flicker as you rotate — that is calcite.' },
    chalk:        { mag: 400, fabric: 'plates', parts: [['calcite', 1.0]], look: 'At 400x the "mud" resolves into countless plates from single-celled plankton.' },
    travertine:   { mag: 40, fabric: 'interlocking', banded: 38, vesicles: 0.16, parts: [['calcite', 1.0]], look: 'Banded calcite precipitated from water, often with open cavities.' },
    coal:         { mag: 100, fabric: 'foliated', banded: 42, parts: [['organic', 0.93], ['clay', 0.07]], look: 'Black in plane light AND under crossed polars, because coal is opaque and no light gets through it at all. The pale specks are the clay and quartz dust that blew into the swamp with the plants. Opacity is the observation here, and it is why coal is studied in reflected light.' },
    marble:       { mag: 40, fabric: 'interlocking',  parts: [['calcite', 1.0]], look: 'Calcite recrystallised into a tight interlocking mosaic — the fossils and bedding are gone.' },
    quartzite:    { mag: 40, fabric: 'interlocking',  parts: [['quartz', 0.95], ['mica', 0.05]], look: 'Quartz grains fused directly to each other with no cement left between them. Compare with sandstone.' },
    slate:        { mag: 200, fabric: 'foliated', parts: [['clay', 0.62], ['mica', 0.28], ['quartz', 0.10]], look: 'Microscopic micas all rotated into the same plane — that alignment IS the cleavage.' },
    phyllite:     { mag: 100, fabric: 'foliated', parts: [['mica', 0.55], ['quartz', 0.30], ['clay', 0.15]], look: 'The micas have grown just big enough to catch the light, which is the silky sheen you see in the hand specimen.' },
    schist:       { mag: 40, fabric: 'foliated',  parts: [['mica', 0.48], ['quartz', 0.30], ['feldspar', 0.14], ['garnet', 0.08]], look: 'Mica flakes now large and strongly aligned, often wrapping around garnets.' },
    gneiss:       { mag: 40, fabric: 'foliated', banded: 58, parts: [['quartz', 0.32], ['feldspar', 0.38], ['biotite', 0.22], ['garnet', 0.08]], look: 'Light and dark minerals segregated into separate bands — the banding you see with the naked eye, at grain scale.' }
  };

  // Grain mosaic. A jittered grid, each cell drawn as an irregular polygon, so
  // grains interlock the way they do in a real section. Deterministic per rock.
  // `T` is the render's __alloT. The screen-reader label below is the entire
  // thin section for a non-visual reader, and it was English-only.
  function rkThinSectionSvg(h, rock, xpl, stageDeg, T) {
    T = T || function (k, en) { return en; };
    var id = rock ? rock.id : 'x';
    var sec = RK_THIN_SECTION[id];
    var S = 260, R = 124, CX = 130, CY = 130;
    var kids = [];
    var i;
    if (!sec) return null;

    var clip = 'rkts-' + id;
    kids.push(h('defs', { key: 'd' },
      h('clipPath', { id: clip }, h('circle', { cx: CX, cy: CY, r: R }))));

    // Field of view: black under crossed polars, warm white in plane light.
    kids.push(h('circle', { key: 'fov', cx: CX, cy: CY, r: R, fill: xpl ? '#07070a' : '#fbfaf6' }));

    // Weighted mineral picker.
    var pool = [];
    sec.parts.forEach(function (p) {
      var n = Math.max(1, Math.round(p[1] * 100));
      for (var q = 0; q < n; q++) pool.push(p[0]);
    });

    var rnd = rkSeed(id + '-section');
    var grains = [];
    var STEP = sec.mag >= 200 ? 13 : sec.mag >= 100 ? 19 : 27;

    // FABRIC — how the grains are arranged. Every rock used to get the same
    // jittered interlocking mosaic, so sandstone rendered identically to granite
    // while its own caption promised "rounded grains with cement between them",
    // and slate's grains pointed every which way under a caption saying the
    // micas are all rotated into one plane. The texture is half of what a thin
    // section tells you, so it is now drawn rather than only described.
    var fabric = sec.fabric || 'interlocking';
    var FOLIATION = -18;   // degrees; one shared direction for aligned fabrics

    // BANDING — a few rocks are defined by layers rather than by grains, and
    // those two rendered as a uniform mosaic. Gneiss's caption says the light
    // and dark minerals are "segregated into separate bands" and travertine's
    // says it is "banded calcite ... often with open cavities", yet gneiss came
    // out indistinguishable from schist and travertine from marble. The layering
    // IS the diagnostic, so it is drawn.
    var bandW = sec.banded || 0;
    // Metamorphic banding follows the foliation. A layer precipitated out of
    // water was laid down flat, so it runs horizontally instead.
    var bandRad = (fabric === 'foliated' ? FOLIATION : 0) * Math.PI / 180;
    var RK_DARK_BAND = { biotite: 1, amphibole: 1, pyroxene: 1, magnetite: 1, garnet: 1, olivine: 1 };
    var lightPool = [], darkPool = [];
    if (bandW) pool.forEach(function (m) { (RK_DARK_BAND[m] ? darkPool : lightPool).push(m); });
    // Compositional segregation only means anything if the rock actually has
    // both a light and a dark mineral. Travertine is calcite all the way through,
    // so its layers show up as a coarse/fine alternation instead.
    var segregates = !!(bandW && lightPool.length && darkPool.length);
    function bandIndexAt(px, py) {
      var u = -(px - CX) * Math.sin(bandRad) + (py - CY) * Math.cos(bandRad);
      return Math.floor((u + R * 4) / bandW);
    }

    // Clastic rocks sit in a cement matrix, so paint that first and leave the
    // grains smaller than their cell — the gaps ARE the diagnostic.
    // 'shards' is fragmental like clastic — matrix plus separate fragments — but
    // the fragments keep their angular edges. 'plates' is fragmental too: chalk
    // is not a mosaic of interlocking crystals, it is countless separate
    // coccolith plates sitting in lime mud, which is what its caption already
    // claimed while the render showed a fine-grained marble.
    var fragmental = fabric === 'clastic' || fabric === 'shards' || fabric === 'plates';
    if (fragmental) {
      kids.push(h('circle', {
        key: 'matrix', cx: CX, cy: CY, r: R,
        fill: xpl ? '#15151b' : (RK_OPTICS.cement.ppl)
      }));
    }

    for (var gy = -R; gy < R + STEP; gy += STEP) {
      for (var gx = -R; gx < R + STEP; gx += STEP) {
        var jitter = fragmental ? 0.5 : 0.7;
        var jx = CX + gx + (rnd() - 0.5) * STEP * jitter;
        var jy = CY + gy + (rnd() - 0.5) * STEP * jitter;
        if (Math.sqrt((jx - CX) * (jx - CX) + (jy - CY) * (jy - CY)) > R + STEP) continue;
        var bandI = bandW ? bandIndexAt(jx, jy) : 0;
        var bandSrc = segregates ? (bandI % 2 === 0 ? lightPool : darkPool) : pool;
        var mineral = bandSrc[Math.floor(rnd() * bandSrc.length)];
        // In a clastic rock the cement is the matrix, not a grain.
        if (fragmental && mineral === 'cement') continue;
        // Layers differ in grain size as well as composition — the coarse band
        // is the one you can see individual crystals in.
        var bandScale = bandW ? (bandI % 2 === 0 ? 1.10 : 0.78) : 1;
        grains.push({
          x: jx, y: jy,
          m: mineral,
          // Crystallographic orientation. In a foliated rock the grains grew or
          // rotated into one plane, so they scatter only slightly around it.
          rot: fabric === 'foliated' ? FOLIATION + (rnd() - 0.5) * 26 : rnd() * 180,
          // Clastic grains are separated by cement; interlocking ones fill the cell.
          r: STEP * (fabric === 'plates' ? (0.40 + rnd() * 0.22)
            : fragmental ? (0.34 + rnd() * 0.20) : (0.55 + rnd() * 0.35)) * bandScale,
          // Round ONLY where something made it round. Transport wore the corners
          // off clastic grains; a coccolith plate simply grew as a disc. Ash
          // shards were never carried anywhere, so they stay sharp, and
          // crystallised grains interlock.
          sides: (fabric === 'clastic' || fabric === 'plates') ? 9 : fabric === 'shards' ? 4 : 5 + Math.floor(rnd() * 3),
          elong: fabric === 'foliated' ? 1.75 + rnd() * 0.6 : 1,
          wob: rnd()
        });
      }
    }

    var g = [];
    grains.forEach(function (gr, idx) {
      var opt = RK_OPTICS[gr.m] || RK_OPTICS.clay;
      var fill;
      if (!xpl) {
        fill = opt.ppl;
      } else if (opt.iso || opt.opaque) {
        // Isotropic and opaque grains never pass light under crossed polars —
        // that is exactly how you identify them.
        fill = '#07070a';
      } else {
        // Extinction: a grain goes dark four times per full stage rotation, and
        // is brightest at 45 degrees to the polarizers.
        var theta = (stageDeg + gr.rot) * Math.PI / 180;
        var lightness = Math.abs(Math.sin(2 * theta));
        var band = opt.bire[Math.floor(gr.wob * opt.bire.length) % opt.bire.length];
        fill = lightness < 0.10 ? '#07070a' : band;
        if (lightness < 0.45) {
          // Dim toward extinction by overlaying black at low opacity.
          g.push(h('circle', { key: 'dim' + idx, cx: gr.x, cy: gr.y, r: gr.r, fill: band, opacity: Math.max(0.08, lightness) }));
          return;
        }
      }
      var pts = [];
      for (i = 0; i < gr.sides; i++) {
        var a = (i / gr.sides) * Math.PI * 2 + gr.rot * 0.02;
        // Clastic grains are smooth and rounded — transport wore the corners off.
        // Crystallised ones keep their irregular interlocking outline.
        var rough = gr.sides > 8 ? 0.10 : 0.42;
        var rr = gr.r * ((1 - rough / 2) + ((gr.wob * (i + 3)) % 1) * rough);
        // Foliated grains are platy and lie in the foliation plane, so stretch
        // along it and squash across it.
        var ex = Math.cos(a) * rr * gr.elong;
        var ey = Math.sin(a) * rr / (gr.elong > 1 ? gr.elong * 0.72 : 1);
        var fr = gr.elong > 1 ? FOLIATION * Math.PI / 180 : 0;
        var px = gr.x + ex * Math.cos(fr) - ey * Math.sin(fr);
        var py = gr.y + ex * Math.sin(fr) + ey * Math.cos(fr);
        pts.push(px.toFixed(1) + ',' + py.toFixed(1));
      }
      g.push(h('polygon', {
        key: 'g' + idx, points: pts.join(' '), fill: fill,
        stroke: xpl ? 'rgba(0,0,0,0.55)' : 'rgba(90,80,70,0.45)', strokeWidth: 0.6
      }));

      // Cleavage traces and fractures are PPL features — they are what you use
      // to tell a colourless mineral from another colourless mineral.
      if (!xpl && opt.cleav) {
        for (i = 1; i < 3; i++) {
          g.push(h('line', {
            key: 'c' + idx + '_' + i,
            x1: gr.x - gr.r * 0.8, y1: gr.y - gr.r + (i * gr.r * 0.66),
            x2: gr.x + gr.r * 0.8, y2: gr.y - gr.r + (i * gr.r * 0.66),
            stroke: 'rgba(60,50,40,0.55)', strokeWidth: 0.7,
            transform: 'rotate(' + gr.rot.toFixed(0) + ' ' + gr.x.toFixed(1) + ' ' + gr.y.toFixed(1) + ')'
          }));
        }
      }
      if (!xpl && opt.frac) {
        g.push(h('path', {
          key: 'f' + idx,
          d: 'M' + (gr.x - gr.r * 0.7) + ',' + (gr.y - gr.r * 0.3) + ' L' + (gr.x + gr.r * 0.2) + ',' + (gr.y + gr.r * 0.6),
          stroke: 'rgba(40,35,30,0.5)', strokeWidth: 0.7, fill: 'none'
        }));
      }
      // Polysynthetic twinning — the candy-stripe that identifies plagioclase.
      if (xpl && opt.twin && (idx % 3 === 0)) {
        for (i = 0; i < 4; i++) {
          g.push(h('line', {
            key: 't' + idx + '_' + i,
            x1: gr.x - gr.r, y1: gr.y - gr.r * 0.7 + i * gr.r * 0.45,
            x2: gr.x + gr.r, y2: gr.y - gr.r * 0.7 + i * gr.r * 0.45,
            stroke: 'rgba(255,255,255,0.42)', strokeWidth: 1.1,
            transform: 'rotate(' + gr.rot.toFixed(0) + ' ' + gr.x.toFixed(1) + ' ' + gr.y.toFixed(1) + ')'
          }));
        }
      }
    });

    // Band boundaries. Without them the layering has to be inferred from a
    // statistical drift in colour, which is exactly the thing a beginner cannot
    // yet see. The line is the same thing a lecturer draws on the board.
    if (bandW) {
      var bnx = -Math.sin(bandRad), bny = Math.cos(bandRad);   // across the bands
      var bdx = Math.cos(bandRad), bdy = Math.sin(bandRad);    // along them
      for (var bu = -R; bu <= R; bu += bandW) {
        var bcx = CX + bnx * bu, bcy = CY + bny * bu;
        g.push(h('line', {
          key: 'bnd' + bu.toFixed(0),
          x1: (bcx - bdx * R * 1.6).toFixed(1), y1: (bcy - bdy * R * 1.6).toFixed(1),
          x2: (bcx + bdx * R * 1.6).toFixed(1), y2: (bcy + bdy * R * 1.6).toFixed(1),
          stroke: xpl ? 'rgba(255,255,255,0.20)' : 'rgba(120,95,60,0.34)',
          strokeWidth: 1.3
        }));
      }
    }

    // Vesicles — frozen gas bubbles. Pumice's caption already said "mostly
    // holes" while the render showed a solid mass indistinguishable from
    // obsidian. The voids are the whole identity of the rock: they are why it
    // floats, and in a real section they are simply empty, so they read as
    // bright in plane light and stay black under crossed polars like any other
    // non-crystalline space.
    if (sec.vesicles) {
      var vRnd = rkSeed(id + '-vesicles');
      var vN = Math.round(46 * sec.vesicles);
      for (var vi = 0; vi < vN; vi++) {
        var va = vRnd() * Math.PI * 2;
        var vd = Math.sqrt(vRnd()) * (R - 8);
        g.push(h('ellipse', {
          key: 'ves' + vi,
          cx: (CX + Math.cos(va) * vd).toFixed(1),
          cy: (CY + Math.sin(va) * vd).toFixed(1),
          rx: (5 + vRnd() * 13).toFixed(1),
          ry: (4 + vRnd() * 11).toFixed(1),
          transform: 'rotate(' + (vRnd() * 180).toFixed(0) + ' ' + (CX + Math.cos(va) * vd).toFixed(1) + ' ' + (CY + Math.sin(va) * vd).toFixed(1) + ')',
          fill: xpl ? '#07070a' : '#ffffff',
          stroke: xpl ? 'rgba(90,90,110,0.45)' : 'rgba(120,110,95,0.55)',
          strokeWidth: 1
        }));
      }
    }

    kids.push(h('g', { key: 'grains', clipPath: 'url(#' + clip + ')' }, g));

    // Crosshairs + rim, so it reads as an eyepiece rather than a texture swatch.
    kids.push(h('circle', { key: 'rim', cx: CX, cy: CY, r: R, fill: 'none', stroke: '#334155', strokeWidth: 5 }));
    kids.push(h('circle', { key: 'rim2', cx: CX, cy: CY, r: R + 3, fill: 'none', stroke: '#0f172a', strokeWidth: 2 }));
    kids.push(h('line', { key: 'chx', x1: CX - 14, y1: CY, x2: CX + 14, y2: CY, stroke: xpl ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)', strokeWidth: 0.8 }));
    kids.push(h('line', { key: 'chy', x1: CX, y1: CY - 14, x2: CX, y2: CY + 14, stroke: xpl ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.30)', strokeWidth: 0.8 }));

    // Scale bar. A real section is 30 µm thick and the field of view at these
    // magnifications is a couple of millimetres across.
    var fovMm = (sec.mag >= 400 ? 0.45 : sec.mag >= 200 ? 0.9 : sec.mag >= 100 ? 1.8 : sec.mag >= 40 ? 4.5 : 9);
    kids.push(h('line', { key: 'sb', x1: CX - 46, y1: CY + R - 16, x2: CX + 46, y2: CY + R - 16, stroke: xpl ? '#e2e8f0' : '#1e293b', strokeWidth: 2.5 }));
    // The bar is 92 units long across a field of view 2R units wide — divide by
    // the FIELD diameter, not the viewBox width, or the labelled length is wrong.
    kids.push(h('text', { key: 'sbt', x: CX, y: CY + R - 5, textAnchor: 'middle', fontSize: '10', fontWeight: '700', fill: xpl ? '#e2e8f0' : '#1e293b' },
      (fovMm * 92 / (R * 2)).toFixed(2) + ' mm'));

    return h('svg', {
      viewBox: '0 0 ' + S + ' ' + S, width: '100%', role: 'img',
      style: { display: 'block', maxWidth: '300px', margin: '0 auto' },
      'aria-label': (rock ? rock.label : '') + T('stem.rocks.ts_aria_a', ' in thin section at about ') + sec.mag + T('stem.rocks.ts_aria_b', ' times magnification, ')
        + (xpl ? T('stem.rocks.ts_aria_xpl', 'under crossed polars. ') : T('stem.rocks.ts_aria_ppl', 'in plane-polarized light. '))
        + T('stem.rocks.thin_look_' + (rock ? rock.id : 'x'), sec.look) + ' '
        + T('stem.rocks.thin_minerals_present', 'Minerals present: ')
        + sec.parts.map(function (p) { return T('stem.rocks.tsmin_' + p[0], p[0]) + ' ' + Math.round(p[1] * 100) + '%'; }).join(', ') + '.'
    }, kids);
  }

  // ══ Mineral test-bench visuals ══
  // The three classic hands-on identification tests — streak, scratch, acid —
  // were each a button, a progress bar and a sentence of result text. The whole
  // point of these tests is that you LOOK at what happens, so the tool was
  // describing an observation instead of letting a student make one.
  //
  // Animation is CSS keyframes rather than JS timers: no new intervals to leak,
  // and the reduced-motion block already injected above collapses them to
  // 0.01ms for free (WCAG 2.3.3).
  function rkEnsureBenchCss() {
    if (typeof document === 'undefined') return;
    var el = document.getElementById('rock-a11y');
    if (!el || el._rkBenchCss) return;
    el._rkBenchCss = true;
    el.textContent += [
      '@keyframes rkBubbleRise{0%{transform:translateY(0);opacity:0}',
      '15%{opacity:.9}80%{opacity:.7}100%{transform:translateY(-34px);opacity:0}}',
      '@keyframes rkSmear{from{stroke-dashoffset:150}to{stroke-dashoffset:0}}',
      '.rk-bubble{animation:rkBubbleRise 1.6s linear infinite}',
      '.rk-smear{stroke-dasharray:150;animation:rkSmear .7s ease-out forwards}',
      '@keyframes rkLensDrift{0%,100%{transform:translate(0,0)}50%{transform:translate(5px,3px)}}',
      '.rk-lens-drift{animation:rkLensDrift 3.4s ease-in-out infinite}'
    ].join('');
  }

  // Known streak colours, keyed off the MINERALS data's `streak` strings.
  var RK_STREAK_HEX = {
    'White': '#ffffff',
    'Greenish-black': '#16301c',
    'Black': '#171717',
    'Red-brown': '#8b3a2a',
    'Reddish-brown': '#8b3a2a',
    'Lead-gray': '#8d949e',
    'White-yellow': '#fffbd6',
    'Yellow': '#fadf72',
    'Brown-yellow': '#a1741f',
    'Colorless': '#e9eef5',
    'None (too hard)': null
  };

  // Streak plates and household scratch references are approximate teaching
  // models, not laboratory instruments. Keep their outcome rules in one place
  // so the standalone labs, the workbench forecast, and the candidate filter
  // cannot tell learners three different stories about the same observation.
  var RK_STREAK_PLATE_HARDNESS = 6.5;
  function rkStreakPlateTooHard(mineral) {
    return !!mineral && Number(mineral.hardness) > RK_STREAK_PLATE_HARDNESS;
  }
  function rkScratchOutcome(toolH, mineralH) {
    var tool = Number(toolH), specimen = Number(mineralH);
    if (Math.abs(tool - specimen) < 0.001) return 'borderline';
    return tool > specimen ? 'scratched' : 'no';
  }

  // 1) STREAK PLATE — the test's whole lesson is that a mineral's streak is
  // often NOT its outward colour, so the two are shown side by side. Pyrite is
  // the classic case: brassy gold specimen, greenish-black powder.
  // `T` is the render's __alloT, threaded in because these module-scope
  // builders sit above it. Without it the words drawn INTO the diagram stayed
  // English in every language — and on the streak panel those words are the
  // lesson: "looks like" beside "streak" is the whole comparison.
  function rkStreakPlateSvg(h, mineral, revealed, T) {
    T = T || function (k, en) { return en; };
    rkEnsureBenchCss();
    var streakName = (mineral && mineral.streak) || '';
    var hex = Object.prototype.hasOwnProperty.call(RK_STREAK_HEX, streakName)
      ? RK_STREAK_HEX[streakName]
      : '#cbd5e1';
    var tooHard = rkStreakPlateTooHard(mineral) || hex === null;
    var body = (mineral && mineral.color) || '#cbd5e1';
    var rnd = rkSeed((mineral ? mineral.id : 'x') + '-streak');
    var kids = [];
    var i;

    // Unglazed porcelain plate. It used to be drawn at #fbfbfa, all but white —
    // and ELEVEN of the tool's eighteen minerals have a White streak, which was
    // painted at #f1f5f9. That is a luminance difference of about 0.01, so for
    // the majority of the minerals the student saw no powder at all and had to
    // read the answer instead of observing it, in the one test whose entire
    // premise is looking at the residue. Real porcelain biscuit is an off-white
    // grey and chalk-white powder shows up on it plainly, so the plate is now
    // the colour it actually is rather than paper white.
    kids.push(h('rect', { key: 'plate', x: 4, y: 8, width: 116, height: 62, rx: 5, fill: '#e8e5de', stroke: '#94a3b8', strokeWidth: 1.2 }));
    for (i = 0; i < 40; i++) {
      kids.push(h('circle', { key: 'g' + i, cx: (6 + rnd() * 112).toFixed(1), cy: (10 + rnd() * 58).toFixed(1), r: 0.5, fill: '#d6d2c8' }));
    }

    if (revealed) {
      if (tooHard) {
        // Harder than the plate: the MINERAL wins and grooves the porcelain.
        kids.push(h('path', {
          key: 'groove', className: 'rk-smear',
          d: 'M18,52 L102,26', stroke: '#94a3b8', strokeWidth: 2.4, strokeLinecap: 'round', fill: 'none'
        }));
        kids.push(h('text', { key: 'th', x: 62, y: 66, textAnchor: 'middle', fontSize: '8', fontWeight: '700', fill: '#334155' }, T('stem.rocks.sp_plate_scratched', 'plate scratched — no powder')));
      } else {
        // Powder smear: a broad soft stroke plus scattered grains at the edges.
        // A pale powder is legible because it is a deposit sitting ON the
        // plate, so it gets the faint shadow a real one has — hue alone cannot
        // carry a white streak, whatever colour the plate is.
        kids.push(h('path', {
          key: 'smearShadow',
          d: 'M18,53.4 Q60,35.4 102,27.4', stroke: 'rgba(90,84,70,0.30)', strokeWidth: 10,
          strokeLinecap: 'round', fill: 'none'
        }));
        kids.push(h('path', {
          key: 'smear', className: 'rk-smear',
          d: 'M18,52 Q60,34 102,26', stroke: hex, strokeWidth: 9, strokeLinecap: 'round', fill: 'none', opacity: 0.92
        }));
        for (i = 0; i < 26; i++) {
          var t = rnd();
          var sx = 18 + t * 84;
          var sy = 52 - t * 26 + (rnd() - 0.5) * 13;
          kids.push(h('circle', { key: 'p' + i, cx: sx.toFixed(1), cy: sy.toFixed(1), r: (0.6 + rnd() * 1.1).toFixed(2), fill: hex, opacity: 0.75 }));
        }
      }
    } else {
      kids.push(h('text', { key: 'hint', x: 62, y: 43, textAnchor: 'middle', fontSize: '9', fill: '#57534e' }, T('stem.rocks.sp_unglazed', 'unglazed porcelain')));
    }

    // Side-by-side comparison — the actual teaching point.
    var cmp = [];
    if (revealed && !tooHard) {
      cmp.push(h('rect', { key: 'c1', x: 132, y: 14, width: 26, height: 18, rx: 3, fill: body, stroke: '#64748b', strokeWidth: 1 }));
      cmp.push(h('text', { key: 't1', x: 145, y: 41, textAnchor: 'middle', fontSize: '7.5', fontWeight: '700', fill: '#334155' }, T('stem.rocks.sp_looks_like', 'looks like')));
      cmp.push(h('rect', { key: 'c2', x: 132, y: 48, width: 26, height: 18, rx: 3, fill: hex, stroke: '#64748b', strokeWidth: 1 }));
      cmp.push(h('text', { key: 't2', x: 145, y: 75, textAnchor: 'middle', fontSize: '7.5', fontWeight: '700', fill: '#334155' }, T('stem.rocks.sp_streak', 'streak')));
    }

    return h('svg', {
      viewBox: '0 0 168 80', width: '100%', role: 'img',
      style: { maxWidth: '340px', display: 'block' },
      // Built from fragments because a mineral name is spliced mid-sentence.
      // The powder colour reuses the workbench's own streak-choice keys rather
      // than duplicating nine colour words.
      'aria-label': revealed
        ? (tooHard
            ? (mineral.label + T('stem.rocks.sp_aria_toohard', ' is harder than the porcelain plate, so it scratches the plate instead of leaving a powder streak.'))
            : (mineral.label + T('stem.rocks.sp_aria_leaves', ' leaves a ')
                + T('stem.rocks.wb_streak_choice_powder-' + String(streakName).toLowerCase().replace(/ /g, '-'), streakName.toLowerCase())
                + T('stem.rocks.sp_aria_tail', ' streak, next to its outward colour for comparison.')))
        : T('stem.rocks.sp_aria_empty', 'An empty unglazed porcelain streak plate, ready for testing.')
    }, kids, cmp);
  }

  // 2) SCRATCH TEST — shows WHY the result happened. A definite groove appears
  // only when the modeled reference is harder. Equal modeled values are shown
  // as borderline because real specimens and reference objects vary.
  function rkScratchSvg(h, mineral, toolLabel, toolH, progress, done, T) {
    T = T || function (k, en) { return en; };
    var mh = (mineral && mineral.hardness) || 0;
    var outcome = rkScratchOutcome(toolH, mh);
    var scratches = outcome === 'scratched';
    var borderline = outcome === 'borderline';
    var body = (mineral && mineral.color) || '#cbd5e1';
    var p = Math.max(0, Math.min(100, progress || 0));
    var x0 = 20, x1 = 148, y = 54;
    var tipX = x0 + (x1 - x0) * (p / 100);
    var kids = [];
    var i;

    // Mineral surface
    kids.push(h('rect', { key: 'surf', x: 12, y: 40, width: 144, height: 30, rx: 4, fill: body, stroke: '#475569', strokeWidth: 1.2 }));
    kids.push(h('rect', { key: 'shine', x: 12, y: 40, width: 144, height: 9, rx: 4, fill: '#ffffff', opacity: 0.22 }));

    // Both marks are drawn ON the specimen, so both have to be separated from
    // it. The groove was a flat #1f2937 — magnetite's body colour EXACTLY, so
    // scratching magnetite produced a groove that could not be seen — and the
    // smear was a flat #e2e8f0, invisible on quartz, halite, calcite, talc,
    // gypsum and diamond. A scratch test whose result you cannot see is the
    // same failure as a streak plate whose powder you cannot see.
    // Same criterion: the mark IS the result of the test. Unlike a streak
    // colour, no particular groove colour is essential information, so there is
    // nothing here to trade against meeting 3:1.
    var grooveInk = rkMarkOn('#1f2937', body, 3.0);
    var smearInk = rkMarkOn('#e2e8f0', body, 3.0);
    var borderlineHalo = rkMarkOn('#fef3c7', body, 3.0);

    // The mark left behind, revealed up to the tool's current position.
    if (p > 0) {
      if (scratches) {
        kids.push(h('line', { key: 'groove', x1: x0, y1: y, x2: tipX, y2: y, stroke: grooveInk, strokeWidth: 2.6, strokeLinecap: 'round', opacity: 0.85 }));
        kids.push(h('line', { key: 'grooveHi', x1: x0, y1: y - 1.6, x2: tipX, y2: y - 1.6, stroke: '#ffffff', strokeWidth: 1, strokeLinecap: 'round', opacity: 0.45 }));
        // Debris thrown ahead of the tip.
        for (i = 0; i < 6; i++) {
          var dr = rkSeed((mineral ? mineral.id : 'x') + 'd' + i)();
          kids.push(h('circle', { key: 'db' + i, cx: (tipX + 2 + dr * 7).toFixed(1), cy: (y + 4 + dr * 5).toFixed(1), r: 0.9, fill: grooveInk, opacity: 0.5 }));
        }
      } else if (borderline) {
        // Equal nominal values do not justify a binary conclusion. A broken,
        // dotted trace communicates an ambiguous mark without pretending it is
        // either a clean groove or merely transferred tool material. Draw the
        // same dashed shape once as a contrast halo so the amber trace remains
        // visible on every modeled specimen body.
        kids.push(h('line', { key: 'borderlineHalo', x1: x0, y1: y, x2: tipX, y2: y, stroke: borderlineHalo, strokeWidth: 5.4, strokeLinecap: 'round', strokeDasharray: '4 4', opacity: 0.98 }));
        kids.push(h('line', { key: 'borderline', x1: x0, y1: y, x2: tipX, y2: y, stroke: '#b45309', strokeWidth: 2.8, strokeLinecap: 'round', strokeDasharray: '4 4', opacity: 0.9 }));
      } else {
        // Softer tool: its own material rubs off as a faint smear. No groove.
        kids.push(h('line', { key: 'smear', x1: x0, y1: y, x2: tipX, y2: y, stroke: smearInk, strokeWidth: 3.4, strokeLinecap: 'round', opacity: 0.75 }));
      }
    }

    // Tool tip
    kids.push(h('polygon', {
      key: 'tip',
      points: [tipX + ',' + (y - 3), (tipX - 5) + ',' + (y - 17), (tipX + 5) + ',' + (y - 17)].join(' '),
      fill: scratches ? '#334155' : borderline ? '#d97706' : '#94a3b8', stroke: '#0f172a', strokeWidth: 0.9
    }));
    kids.push(h('rect', { key: 'shaft', x: tipX - 4, y: 12, width: 8, height: 18, rx: 2, fill: '#64748b', stroke: '#0f172a', strokeWidth: 0.9 }));

    // Mohs comparison strip — the reason, not just the outcome.
    // At scaleY 84 the "mineral N" caption's glyphs ran from y≈68.5, and the
    // specimen bar ends at y=70, so the caption sat ON the specimen — dark
    // purple text over magnetite's near-black body. Six units is not enough
    // clearance for a 7.5px font, so the whole strip moved down and the
    // viewBox grew to match.
    var scaleY = 90;
    kids.push(h('rect', { key: 'scale', x: 12, y: scaleY, width: 144, height: 7, rx: 3.5, fill: '#e2e8f0' }));
    for (i = 1; i <= 10; i++) {
      kids.push(h('line', { key: 'tick' + i, x1: 12 + (i / 10) * 144, y1: scaleY, x2: 12 + (i / 10) * 144, y2: scaleY + 7, stroke: '#cbd5e1', strokeWidth: 0.7 }));
    }
    var mx = 12 + (mh / 10) * 144;
    var tx = 12 + (toolH / 10) * 144;
    // The MARKER sits at the true hardness, but the CAPTION has to stay inside
    // the viewBox. At hardness 10 the marker lands at x=156 of 168, so
    // "mineral 10" ran off the right edge and rendered as "mineral " — diamond,
    // the one specimen whose hardness is the entire point of it. Same class as
    // the vertical clipping already fixed on the tool caption below.
    var capX = function (v) { return Math.max(20, Math.min(148, v)); };
    kids.push(h('polygon', { key: 'mMark', points: [mx + ',' + (scaleY - 1), (mx - 4) + ',' + (scaleY - 8), (mx + 4) + ',' + (scaleY - 8)].join(' '), fill: '#7c3aed' }));
    kids.push(h('text', { key: 'mTxt', x: capX(mx), y: scaleY - 10, textAnchor: 'middle', fontSize: '7.5', fontWeight: '700', fill: '#5b21b6' }, 'mineral ' + mh));
    kids.push(h('polygon', { key: 'tMark', points: [tx + ',' + (scaleY + 8), (tx - 4) + ',' + (scaleY + 15), (tx + 4) + ',' + (scaleY + 15)].join(' '), fill: '#0f766e' }));
    kids.push(h('text', { key: 'tTxt', x: capX(tx), y: scaleY + 23, textAnchor: 'middle', fontSize: '7.5', fontWeight: '700', fill: '#115e59' }, 'tool ' + toolH));

    return h('svg', { role: 'img',
      // 118 tall, not 100: the tool marker's caption was being clipped clean
      // off, so the strip showed the mineral's hardness with an unlabelled
      // triangle opposite it — exactly the comparison the strip exists to make.
      // The extra six units are the clearance that stops the mineral caption
      // printing on top of the specimen.
      viewBox: '0 0 168 118', width: '100%',
      style: { maxWidth: '360px', display: 'block' },
      'aria-label': !done
        ? (T('stem.rocks.sc_aria_progress', 'Scratch test in progress: ') + toolLabel + T('stem.rocks.sc_aria_hardness', ', hardness ') + toolH + T('stem.rocks.sc_aria_across', ', drawn across ') + (mineral ? mineral.label : '') + T('stem.rocks.sc_aria_hardness', ', hardness ') + mh + '.')
        : (scratches
            ? (toolLabel + T('stem.rocks.sc_aria_at', ' at hardness ') + toolH + T('stem.rocks.sc_aria_cut', ' cut a groove into ') + mineral.label + T('stem.rocks.sc_aria_at', ' at hardness ') + mh + T('stem.rocks.sc_aria_harder', ', because the modeled reference is harder.'))
            : borderline
              ? (toolLabel + T('stem.rocks.sc_aria_and', ' and ') + mineral.label + T('stem.rocks.sc_aria_both', ' both have modeled hardness ') + mh + T('stem.rocks.sc_aria_retest', '. The broken trace is a borderline result, so retest with a different reference.'))
              : (toolLabel + T('stem.rocks.sc_aria_at', ' at hardness ') + toolH + T('stem.rocks.sc_aria_smear', ' left only its own smear on ') + mineral.label + T('stem.rocks.sc_aria_at', ' at hardness ') + mh + T('stem.rocks.sc_aria_softer', ', because it is softer.')))
    }, kids);
  }

  // 3) ACID FIZZ — CO2 escaping is the observation. A non-carbonate shows the
  // drop simply beading on the surface, which is a real negative result rather
  // than an empty panel.
  function rkFizzSvg(h, mineral, active, done, isCarbonate, T) {
    T = T || function (k, en) { return en; };
    rkEnsureBenchCss();
    var body = (mineral && mineral.color) || '#cbd5e1';
    var kids = [];
    var i;

    kids.push(h('rect', { key: 'surf', x: 14, y: 52, width: 140, height: 26, rx: 4, fill: body, stroke: '#475569', strokeWidth: 1.2 }));
    kids.push(h('rect', { key: 'shine', x: 14, y: 52, width: 140, height: 8, rx: 4, fill: '#ffffff', opacity: 0.22 }));

    // Pipette
    kids.push(h('rect', { key: 'pip', x: 78, y: 4, width: 10, height: 22, rx: 3, fill: '#e0f2fe', stroke: '#0369a1', strokeWidth: 1 }));
    kids.push(h('path', { key: 'nozzle', d: 'M80,26 L86,26 L84,34 L82,34 Z', fill: '#0369a1' }));

    if (active || done) {
      // Acid pooled on the specimen
      kids.push(h('ellipse', { key: 'drop', cx: 83, cy: 53, rx: 15, ry: 4.5, fill: '#38bdf8', opacity: 0.55 }));
    }

    if ((active || done) && isCarbonate) {
      for (i = 0; i < 9; i++) {
        var s = rkSeed((mineral ? mineral.id : 'x') + 'b' + i);
        var bx = 68 + s() * 30;
        var r = 1.6 + s() * 2.6;
        kids.push(h('circle', {
          key: 'bub' + i, className: active ? 'rk-bubble' : undefined,
          cx: bx.toFixed(1), cy: 50, r: r.toFixed(2),
          fill: '#ffffff', stroke: '#0ea5e9', strokeWidth: 0.7,
          opacity: active ? 1 : 0.85,
          style: active ? { animationDelay: (i * 0.17).toFixed(2) + 's' } : { transform: 'translateY(' + (-6 - i * 3) + 'px)' }
        }));
      }
      if (done) {
        kids.push(h('text', { key: 'co2', x: 120, y: 30, fontSize: '9', fontWeight: '700', fill: '#0369a1' }, 'CO₂'));
      }
    } else if (done) {
      // Negative result: the drop just sits there.
      kids.push(h('text', { key: 'no', x: 83, y: 40, textAnchor: 'middle', fontSize: '8', fontWeight: '700', fill: '#475569' }, T('stem.rocks.fizz_no_gas', 'no gas released')));
    }

    return h('svg', {
      viewBox: '0 0 168 86', width: '100%', role: 'img',
      style: { maxWidth: '340px', display: 'block' },
      'aria-label': !(active || done)
        ? T('stem.rocks.fz_aria_ready', 'A pipette of dilute hydrochloric acid above the specimen, ready to test.')
        : (isCarbonate
            ? (T('stem.rocks.fz_aria_on', 'Acid on ') + (mineral ? mineral.label : '') + T('stem.rocks.fz_aria_bubbles', ' releases a stream of carbon dioxide bubbles.'))
            : (T('stem.rocks.fz_aria_beads', 'Acid beads on the surface of ') + (mineral ? mineral.label : '') + T('stem.rocks.fz_aria_nobubbles', ' with no bubbles, so no carbonate is present.')))
    }, kids);
  }

  // ══ Weathering outcrop illustration ══
  // The weathering widget was three sliders and a coloured caption: a weathering
  // simulator that never showed weathering. This draws the outcrop so the
  // classification is something a student can SEE rather than only read.
  //
  // DELIBERATELY driven by the discrete 4-state marker ONLY, never by the raw
  // slider values. The widget's design note pins "discrete 4-state weathering
  // marker; no rate score; no reveal — by design", and scaling crack counts or
  // pit sizes off the sliders would smuggle a continuous intensity readout back
  // in through the artwork. Four states, four pictures.
  function rkWeatheringSvg(h, state, T) {
    T = T || function (k, en) { return en; };
    var kids = [];
    var i;
    var seed = rkSeed('weathering-' + state);

    var sky = state === 'physDom' ? '#dbeafe' : state === 'chemDom' ? '#e7e5e4' : state === 'mixed' ? '#e0f2fe' : '#e0f2fe';
    kids.push(h('rect', { key: 'sky', x: 0, y: 0, width: 200, height: 110, rx: 6, fill: sky }));

    // Ground
    kids.push(h('rect', { key: 'ground', x: 0, y: 84, width: 200, height: 26, fill: '#6b5b45' }));
    kids.push(h('rect', { key: 'soil', x: 0, y: 84, width: 200, height: 4, fill: '#4d4133' }));

    if (state === 'minimal') {
      // Stable: sharp, intact, angular block. Sun, no precipitation.
      kids.push(h('circle', { key: 'sun', cx: 168, cy: 24, r: 11, fill: '#fcd34d' }));
      kids.push(h('polygon', { key: 'rock', points: '62,84 74,34 108,26 134,46 138,84', fill: '#8b8378', stroke: '#4b4640', strokeWidth: 2, strokeLinejoin: 'miter' }));
      kids.push(h('polygon', { key: 'face', points: '74,34 108,26 112,58 80,62', fill: '#9c9488', opacity: 0.85 }));
      // y=104 like the other three, so the caption does not jump as the state
      // changes under the sliders.
      kids.push(h('text', { key: 'lbl', x: 100, y: 104, textAnchor: 'middle', fontSize: '9', fontWeight: '700', fill: '#f8fafc' }, T('stem.rocks.weath_cap_minimal', 'edges stay sharp')));

    } else if (state === 'physDom') {
      // Freeze–thaw: water in joints freezes, wedges the rock apart along
      // straight fractures, and drops ANGULAR blocks as scree at the base.
      for (i = 0; i < 7; i++) {
        var fx = 14 + i * 27;
        kids.push(h('path', { key: 'snow' + i, d: 'M' + fx + ',12 l0,8 M' + (fx - 4) + ',16 l8,0 M' + (fx - 3) + ',13 l6,6 M' + (fx + 3) + ',13 l-6,6', stroke: '#93c5fd', strokeWidth: 1.4, strokeLinecap: 'round' }));
      }
      kids.push(h('polygon', { key: 'rock', points: '62,84 74,34 108,26 134,46 138,84', fill: '#8b8378', stroke: '#4b4640', strokeWidth: 2 }));
      // Ice-filled fractures, straight and angular.
      kids.push(h('path', { key: 'cr1', d: 'M86,30 L92,84', stroke: '#bfdbfe', strokeWidth: 3.4, strokeLinecap: 'round' }));
      kids.push(h('path', { key: 'cr1b', d: 'M86,30 L92,84', stroke: '#1e3a5f', strokeWidth: 1.2 }));
      kids.push(h('path', { key: 'cr2', d: 'M108,27 L104,84', stroke: '#bfdbfe', strokeWidth: 2.8, strokeLinecap: 'round' }));
      kids.push(h('path', { key: 'cr2b', d: 'M108,27 L104,84', stroke: '#1e3a5f', strokeWidth: 1 }));
      kids.push(h('path', { key: 'cr3', d: 'M120,40 L126,84', stroke: '#bfdbfe', strokeWidth: 2.4, strokeLinecap: 'round' }));
      // Angular scree — the diagnostic debris shape for physical weathering.
      var scree = [[46, 88], [54, 92], [150, 89], [158, 93], [40, 95], [164, 87]];
      for (i = 0; i < scree.length; i++) {
        var s = seed();
        kids.push(h('polygon', {
          key: 'sc' + i,
          points: [scree[i][0] + ',' + scree[i][1], (scree[i][0] + 7 + s * 3) + ',' + (scree[i][1] - 4), (scree[i][0] + 11) + ',' + (scree[i][1] + 3), (scree[i][0] + 3) + ',' + (scree[i][1] + 5)].join(' '),
          fill: '#7d766c', stroke: '#4b4640', strokeWidth: 0.8
        }));
      }
      kids.push(h('text', { key: 'lbl', x: 100, y: 104, textAnchor: 'middle', fontSize: '9', fontWeight: '700', fill: '#f8fafc' }, T('stem.rocks.weath_cap_phys', 'ice wedges split it into angular blocks')));

    } else if (state === 'chemDom') {
      // Dissolution: acid rain rounds the profile, pits the surface and opens a
      // solution hollow — the karst signature.
      for (i = 0; i < 9; i++) {
        var dx = 12 + i * 21;
        // Ordinary rain blue, NOT the lime green this used to be. Acid rain
        // looks exactly like any other rain — that you cannot see it is the
        // whole point, and green rain teaches a child to expect a visible
        // warning that does not exist. The grey overcast sky and the caption
        // carry "acidic"; the drawing should not invent a colour for it.
        kids.push(h('line', { key: 'rain' + i, x1: dx, y1: 8 + (i % 3) * 6, x2: dx - 3, y2: 18 + (i % 3) * 6, stroke: '#38bdf8', strokeWidth: 1.6, strokeLinecap: 'round', opacity: 0.85 }));
      }
      // Rounded, slumped profile — no sharp corners left.
      kids.push(h('path', { key: 'rock', d: 'M62,84 Q60,50 84,38 Q106,28 124,44 Q140,58 138,84 Z', fill: '#96907f', stroke: '#4b4640', strokeWidth: 2 }));
      // Solution pits
      var pits = [[84, 52], [104, 46], [118, 58], [92, 68], [124, 70], [76, 66]];
      for (i = 0; i < pits.length; i++) {
        kids.push(h('ellipse', { key: 'pit' + i, cx: pits[i][0], cy: pits[i][1], rx: 4.5 + seed() * 2.5, ry: 3 + seed() * 2, fill: '#6f6a5c', opacity: 0.8 }));
      }
      // Solution hollow / incipient cave at the base
      kids.push(h('path', { key: 'cave', d: 'M96,84 Q102,68 116,84 Z', fill: '#332f28' }));
      kids.push(h('text', { key: 'lbl', x: 100, y: 104, textAnchor: 'middle', fontSize: '9', fontWeight: '700', fill: '#f8fafc' }, T('stem.rocks.weath_cap_chem', 'acid dissolves it — rounded and pitted')));

    } else {
      // Mixed: both signatures present — some fracture, some rounding.
      for (i = 0; i < 5; i++) {
        var mx = 20 + i * 34;
        kids.push(h('line', { key: 'r' + i, x1: mx, y1: 10, x2: mx - 3, y2: 19, stroke: '#38bdf8', strokeWidth: 1.5, strokeLinecap: 'round', opacity: 0.8 }));
      }
      kids.push(h('path', { key: 'rock', d: 'M62,84 L72,40 Q92,28 110,30 L132,48 Q138,64 138,84 Z', fill: '#8f8878', stroke: '#4b4640', strokeWidth: 2 }));
      kids.push(h('path', { key: 'cr', d: 'M94,32 L98,84', stroke: '#5c574e', strokeWidth: 2.2, strokeLinecap: 'round' }));
      kids.push(h('ellipse', { key: 'p1', cx: 114, cy: 56, rx: 4.5, ry: 3.2, fill: '#6f6a5c', opacity: 0.8 }));
      kids.push(h('ellipse', { key: 'p2', cx: 80, cy: 62, rx: 4, ry: 2.8, fill: '#6f6a5c', opacity: 0.8 }));
      kids.push(h('polygon', { key: 'sc1', points: '48,90 56,86 60,92 50,95', fill: '#7d766c', stroke: '#4b4640', strokeWidth: 0.8 }));
      kids.push(h('polygon', { key: 'sc2', points: '146,89 154,86 158,92 148,95', fill: '#7d766c', stroke: '#4b4640', strokeWidth: 0.8 }));
      kids.push(h('text', { key: 'lbl', x: 100, y: 104, textAnchor: 'middle', fontSize: '9', fontWeight: '700', fill: '#f8fafc' }, T('stem.rocks.weath_cap_mixed', 'both signatures: cracks and rounding')));
    }

    // The picture IS the finding here, so this description is the whole widget
    // for a screen-reader user. It has to travel with the language.
    var descEn = {
      minimal: 'A rock outcrop with sharp, intact edges under a clear sky. Stable conditions, so the surface persists.',
      physDom: 'A rock outcrop split by straight ice-filled fractures, with angular blocks fallen as scree at its base. Freeze-thaw is breaking it apart mechanically.',
      chemDom: 'A rock outcrop with a rounded, slumped profile, pitted surface and a solution hollow at the base, under acidic rain. Minerals are dissolving away.',
      mixed: 'A rock outcrop showing both signatures at once: a fracture splitting it and rounded, pitted surfaces, with a little angular debris.'
    }[state];
    var desc = descEn ? T('stem.rocks.weath_scene_' + state, descEn) : descEn;

    return h('svg', {
      viewBox: '0 0 200 110', width: '100%', role: 'img',
      style: { display: 'block' },
      'aria-label': desc
    }, kids);
  }

  // ══ 3D crystal structure lab ══
  // The tool teaches crystal HABIT (the outward shape) and lets students test
  // hardness, streak and cleavage — all of which are consequences of how the
  // atoms are stacked, which was never shown. This renders the arrangement
  // itself, so "why does halite break into cubes?" and "why does mica peel into
  // sheets?" have something to look at.
  //
  // Scale note: the sibling Geology Explorer is a CRUST-scale voxel
  // cross-section. This is the opposite end — one unit cell — so the two do not
  // overlap.
  //
  // HONESTY: several of these minerals have genuinely complicated structures.
  // Where the real arrangement is simple and well known it is drawn (rock-salt,
  // fluorite, diamond, sheet silicates, carbonate). Where it is not, the tool
  // draws the UNIT-CELL GEOMETRY of that mineral's crystal system and says so,
  // rather than inventing an atomic arrangement that would look authoritative
  // and be wrong. `exact: false` drives that disclosure in the UI.
  var RK_ATOM = {
    Na: { color: 0x9c6ade, r: 0.30, label: 'Sodium (Na⁺)' },
    Cl: { color: 0x6ee7b7, r: 0.46, label: 'Chloride (Cl⁻)' },
    Pb: { color: 0x94a3b8, r: 0.42, label: 'Lead (Pb²⁺)' },
    S:  { color: 0xfacc15, r: 0.34, label: 'Sulfur (S)' },
    Ca: { color: 0x60a5fa, r: 0.38, label: 'Calcium (Ca²⁺)' },
    F:  { color: 0x86efac, r: 0.26, label: 'Fluoride (F⁻)' },
    C:  { color: 0x475569, r: 0.28, label: 'Carbon (C)' },
    O:  { color: 0xf87171, r: 0.28, label: 'Oxygen (O)' },
    Si: { color: 0xfb923c, r: 0.30, label: 'Silicon (Si)' },
    // Phosphorus centres apatite's PO4 tetrahedra, the same structural role
    // silicon plays in olivine. Pink keeps the two apart in the legend.
    P:  { color: 0xf472b6, r: 0.31, label: 'Phosphorus (P)' },
    Fe: { color: 0xa16207, r: 0.38, label: 'Iron (Fe)' },
    Cu: { color: 0xd98d6a, r: 0.36, label: 'Copper (Cu\u00b2\u207a)' },
    Mg: { color: 0x34d399, r: 0.34, label: 'Magnesium (Mg)' },
    Al: { color: 0xc084fc, r: 0.34, label: 'Aluminium (Al)' },
    // K+ is a big, weakly-held ion sitting in the framework cavities — drawn
    // large to match, and distinct from Al so the substitution reads.
    K:  { color: 0x818cf8, r: 0.44, label: 'Potassium (K⁺)' },
    // Magnetite is an INVERSE spinel: Fe3+ occurs on both site types while
    // Fe2+ occurs on octahedral B sites. Keeping all three roles separate lets
    // the legend teach site occupancy without calling them different elements.
    Fe3A: { color: 0xd97706, r: 0.34, label: 'Iron Fe³⁺ (tetrahedral A site)' },
    Fe3B: { color: 0xf59e0b, r: 0.37, label: 'Iron Fe³⁺ (octahedral B site)' },
    Fe2B: { color: 0x0ea5e9, r: 0.40, label: 'Iron Fe²⁺ (octahedral B site)' },
    X:  { color: 0x93c5fd, r: 0.30, label: 'Lattice point' }
  };

  // Which structure each mineral gets, and whether it is that mineral's real
  // atomic arrangement or its crystal system's cell geometry.
  var RK_LATTICE = {
    halite:    { kind: 'rocksalt',  a: 'Na', b: 'Cl', exact: true,  why: 'Na⁺ and Cl⁻ alternate in every direction. The bonds are equally strong along all three axes, so halite cleaves into perfect cubes.' },
    galena:    { kind: 'rocksalt',  a: 'Pb', b: 'S',  exact: true,  why: 'Same rock-salt packing as halite, with lead and sulfur. That shared arrangement is why galena also breaks into cubes.' },
    fluorite:  { kind: 'fluorite',  a: 'Ca', b: 'F',  exact: true,  why: 'Calcium sits on a face-centred cube with fluoride filling all eight tetrahedral holes. The weakest planes run diagonally, so fluorite cleaves into octahedra, not cubes.' },
    graphite:  { kind: 'graphite', a: 'C',  b: 'C',  exact: true,  why: 'The same element as diamond, arranged completely differently. Each carbon bonds to only THREE others, in flat hexagonal sheets, and the sheets are held to each other by almost nothing. Inside a sheet the bonds are even stronger than diamond\u2019s; between sheets there is a gap more than twice the bond length with no bond drawn across it, because there is none. That gap is the whole difference: graphite is Mohs 1 to 2 and rubs off on paper, while diamond is Mohs 10.' },
    diamond:   { kind: 'diamond',   a: 'C',  b: 'C',  exact: true,  why: 'Every carbon is bonded to four others in a rigid three-dimensional net. Nothing in the structure is weak, which is why diamond is the hardest mineral at Mohs 10.' },
    pyrite:    { kind: 'pyrite',    a: 'Fe', b: 'S',  exact: true,  why: 'Iron on a face-centred cube with sulfur in bonded PAIRS (S₂). The paired sulfur is what makes it a disulfide rather than a simple sulfide.' },
    malachite: { kind: 'carbonate', a: 'Cu', b: 'O',  exact: false, why: 'A copper carbonate, so the flat triangular CO\u2083 group drawn here is the right motif and the reason malachite fizzes in acid. What the model does NOT show is the rest of the formula: malachite is a BASIC carbonate, with hydroxyl groups bonded to the copper as well, and its real layers are more complex than calcite\u2019s neat stack.' },
    azurite:   { kind: 'carbonate', a: 'Cu', b: 'O',  exact: false, why: 'The same carbonate group and the same copper as malachite, in a different proportion: three coppers and two CO\u2083 groups instead of two and one. That small difference in the formula is the whole difference between blue and green, and azurite converts to malachite over time by taking up water.' },
    calcite:   { kind: 'carbonate', a: 'Ca', b: 'O',  exact: true,  why: 'Layers of calcium alternate with flat triangular CO₃ groups. The layers are stacked at a slant, which is why calcite always breaks into leaning rhombs.' },
    mica:      { kind: 'sheet',     a: 'Al', b: 'Si', exact: false, why: 'Strongly bonded silicate sheets held together only weakly between layers. That contrast is the whole story: mica peels into transparent flakes but is tough within a sheet.' },
    biotite:   { kind: 'sheet',     a: 'Fe', b: 'Si', exact: false, why: 'The same silicate sheets as muscovite, with iron and magnesium filling the sites aluminium holds there. That swap changes almost nothing you can measure and everything you can see: it is why biotite is black and muscovite is silvery, while both peel into flexible sheets at Mohs 2.5 to 3.' },
    talc:      { kind: 'sheet',     a: 'Mg', b: 'Si', exact: false, why: 'Silicate sheets with almost nothing holding one sheet to the next, so they slide over each other. That is why talc is the softest mineral at Mohs 1 and feels slippery.' },
    quartz:    { kind: 'silica',    a: 'Si', b: 'O',  exact: true,  why: 'Every silicon sits at the centre of an oxygen tetrahedron, and every tetrahedron shares all four corners with its neighbours. The framework has no weak plane, so quartz fractures like glass instead of cleaving.' },
    gypsum:    { kind: 'sheet',     a: 'Ca', b: 'O',  exact: false, why: 'Layers of calcium sulfate separated by sheets of water molecules. The water layers are the weak planes gypsum splits along.' },
    garnet:    { kind: 'isolated',  a: 'Fe', b: 'Si', c: 'Al', exact: true, why: 'A nesosilicate like olivine — isolated SiO₄ tetrahedra — but held together by TWO different cation sites, a larger one and a smaller one, packed tightly in three dimensions. No chains, no sheets, no framework means no plane of weakness anywhere: garnet has no cleavage at all and fractures instead, and that even packing is why it reaches Mohs 7 and grows those equant twelve-sided crystals.' },
    topaz:     { kind: 'isolated',  a: 'Al', b: 'Si', c: 'F',  exact: true, why: 'Isolated SiO₄ tetrahedra linked by aluminium, with fluorine completing the aluminium’s coordination. Strong bonding in every direction gives Mohs 8 — but the fluorine and hydroxyl sit in layers, and that single plane of weaker bonds is why topaz has one perfect cleavage. Gem cutters have to orient around it.' },
    apatite:   { kind: 'isolated',  a: 'Ca', b: 'P',  exact: false, why: 'A phosphate, not a silicate: isolated PO\u2084 tetrahedra linked by calcium, the same island motif olivine has with SiO\u2084. What this model does NOT draw is the feature apatite is named for. Columns of calcium leave open channels running along the long axis, and fluorine, chlorine or a hydroxyl group sits inside them. Which one fills the channel is the entire difference between fluorapatite, chlorapatite and hydroxylapatite.' },
    magnetite: { kind: 'spinel',    a: 'Fe3A', b: 'Fe2B', c: 'Fe3B', exact: false, why: 'Magnetite is an inverse spinel: Fe³⁺ fills tetrahedral A sites, while equal numbers of Fe²⁺ and Fe³⁺ share twice as many octahedral B sites. A- and B-site magnetic moments point in OPPOSITE directions. The Fe³⁺ contributions largely cancel, leaving a net Fe²⁺ contribution — why magnetite can form a lodestone. The two B-site colours track the formal 1:1 count; they are not fixed room-temperature charge positions.' },
    feldspar:  { kind: 'framework', a: 'K',  b: 'Si', exact: true,  why: 'A framework of corner-linked tetrahedra, like quartz — except aluminium substitutes for some of the silicon. Aluminium carries one less positive charge, so potassium, sodium or calcium sits in the cavities to balance it. That substitution is the entire difference from quartz, and it is why feldspar breaks along two clean planes while quartz has none.' },
    sulfur:    { kind: 'rings',     a: 'S',  b: 'S',  exact: true,  why: 'Sulfur is a MOLECULAR crystal: eight atoms bonded into a puckered S₈ crown, and only weak attractions holding one ring to the next. Strong bonds inside the ring, almost nothing between them — which is why sulfur is Mohs 2, crumbles easily, and melts at just 115 °C.' },
    olivine:   { kind: 'isolated',  a: 'Mg', b: 'Si', exact: true,  why: 'A nesosilicate: no SiO₄ tetrahedron shares an oxygen with another one. They are islands, and the magnesium and iron bonded between them are the only thing linking the structure. With no linked framework and no sheets, olivine has no good cleavage direction — and those exposed cation sites are why it weathers away faster than any other common silicate.' },
    corundum:  { kind: 'closepacked', a: 'Al', b: 'O', exact: true, why: 'Oxygen packed as tightly as spheres can be, with aluminium filling two thirds of the gaps between them. Dense packing plus short, strong Al–O bonds in every direction is what makes corundum Mohs 9 — ruby and sapphire are this structure with a trace of chromium or iron for colour.' },
    hematite:  { kind: 'closepacked', a: 'Fe', b: 'O', exact: true, why: 'The same close-packed architecture as corundum, with iron in place of aluminium. Identical geometry, different cation — and because Fe–O bonds are weaker than Al–O, hematite is around Mohs 6 rather than 9. The iron is also what gives it that red-brown streak.' }
  };

  // Cell geometry per crystal system, for minerals whose real structure is not
  // drawn. Axis lengths and the shear used to convey the system's shape.
  // Axis ratios are deliberately exaggerated. Real ratios vary mineral to
  // mineral and the true differences are a few percent — at the auto-fit scale
  // this view uses, a cubic cell and an orthorhombic one were indistinguishable,
  // which defeats the only thing this fallback is for. The claim being made is
  // equal-vs-unequal and right-angled-vs-inclined, so those are what is drawn
  // legibly, the way a textbook crystal-system diagram does.
  var RK_CELL_GEOMETRY = {
    'cubic':        { ax: [1, 1, 1],       shear: 0,    note: 'three equal axes, all at right angles' },
    'isometric':    { ax: [1, 1, 1],       shear: 0,    note: 'three equal axes, all at right angles' },
    'hexagonal':    { ax: [1, 1, 1.75],    shear: 0,    hex: true, note: 'six-fold symmetry about a long vertical axis' },
    'trigonal':     { ax: [1, 1, 1],       shear: 0.42, note: 'three-fold symmetry, axes equally inclined' },
    'rhombohedral': { ax: [1, 1, 1],       shear: 0.42, note: 'three equal axes, none at right angles' },
    'orthorhombic': { ax: [0.58, 1, 1.5],  shear: 0,    note: 'three unequal axes, all at right angles' },
    'monoclinic':   { ax: [0.72, 1, 1.3],  shear: 0.46, note: 'three unequal axes, one pair not at right angles' },
    'triclinic':    { ax: [0.70, 1, 1.25], shear: 0.52, note: 'three unequal axes, none at right angles' }
  };

  function rkCellGeometryFor(crystalStr) {
    var s = String(crystalStr || '').toLowerCase();
    var keys = Object.keys(RK_CELL_GEOMETRY);
    for (var i = 0; i < keys.length; i++) {
      if (s.indexOf(keys[i]) !== -1) return { key: keys[i], geo: RK_CELL_GEOMETRY[keys[i]] };
    }
    return { key: 'cubic', geo: RK_CELL_GEOMETRY.cubic };
  }

  // The mineral currently being drawn. The host viewer builds its scene once per
  // attach, so the container is re-keyed on mineral id to force a clean rebuild.
  var _rkCrystalBox = { mineral: null };

  // Build the atom list for a structure. All positions are in unit-cell space,
  // recentred on the origin by the caller.
  function rkLatticeAtoms(kind, A, B, C) {
    var out = [];
    var i, j, k;
    var push = function (sp, x, y, z, meta) {
      var atom = { sp: sp, x: x, y: y, z: z };
      if (meta) Object.keys(meta).forEach(function (key) { atom[key] = meta[key]; });
      out.push(atom);
    };

    if (kind === 'rocksalt') {
      // Alternating cations/anions on a 3x3x3 block of the simple cubic sublattice.
      for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) for (k = 0; k < 3; k++) {
        push(((i + j + k) % 2 === 0) ? A : B, i, j, k);
      }
    } else if (kind === 'fluorite') {
      // Ca on the FCC positions of one cell, F on all eight tetrahedral sites.
      var fcc = [[0,0,0],[2,0,0],[0,2,0],[0,0,2],[2,2,0],[2,0,2],[0,2,2],[2,2,2],[1,1,0],[1,0,1],[0,1,1],[2,1,1],[1,2,1],[1,1,2]];
      for (i = 0; i < fcc.length; i++) push(A, fcc[i][0], fcc[i][1], fcc[i][2]);
      for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) for (k = 0; k < 2; k++) {
        push(B, 0.5 + i, 0.5 + j, 0.5 + k);
      }
    } else if (kind === 'diamond') {
      // Diamond occupies only HALF the tetrahedral sites, so four of the
      // fourteen face-centred-cubic positions have no occupied neighbour inside
      // the drawn block — their partners live in the next cell along. Drawn,
      // they were four carbons floating with no bonds at all, under a caption
      // reading "every carbon is bonded to four others ... nothing in the
      // structure is weak". A textbook cell can get away with that because the
      // reader knows it continues; a picture whose whole job is to show bonding
      // cannot. They are omitted, and what remains is a true fragment in which
      // every atom drawn really is bonded.
      var dfcc = [[0,0,0],[2,2,0],[2,0,2],[0,2,2],[1,1,0],[1,0,1],[0,1,1],[2,1,1],[1,2,1],[1,1,2]];
      for (i = 0; i < dfcc.length; i++) push(A, dfcc[i][0], dfcc[i][1], dfcc[i][2]);
      // Four of the eight tetrahedral sites — the diamond half-occupancy.
      var tet = [[0.5,0.5,0.5],[1.5,1.5,0.5],[1.5,0.5,1.5],[0.5,1.5,1.5]];
      for (i = 0; i < tet.length; i++) push(A, tet[i][0], tet[i][1], tet[i][2]);
    } else if (kind === 'pyrite') {
      // Same omission as diamond, and for the same reason: the S₂ dumbbells sit
      // on only half the tetrahedral sites, so these four corners had no
      // neighbour in range and rendered as loose iron atoms.
      var pf = [[0,0,0],[2,2,0],[2,0,2],[0,2,2],[1,1,0],[1,0,1],[0,1,1],[2,1,1],[1,2,1],[1,1,2]];
      for (i = 0; i < pf.length; i++) push(A, pf[i][0], pf[i][1], pf[i][2]);
      // S2 dumbbells straddling the tetrahedral sites.
      var db = [[0.5,0.5,0.5],[1.5,1.5,0.5],[1.5,0.5,1.5],[0.5,1.5,1.5]];
      for (i = 0; i < db.length; i++) {
        push(B, db[i][0] - 0.16, db[i][1] - 0.16, db[i][2] - 0.16);
        push(B, db[i][0] + 0.16, db[i][1] + 0.16, db[i][2] + 0.16);
      }
    } else if (kind === 'carbonate') {
      // Calcium layers alternating with flat CO3 triangles, stacked with a lean.
      for (k = 0; k < 3; k++) {
        var lean = k * 0.42;
        for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
          if (k % 2 === 0) {
            push(A, i + lean, k * 0.9, j);
          } else {
            push('C', i + lean, k * 0.9, j);
            push(B, i + lean + 0.34, k * 0.9, j);
            push(B, i + lean - 0.17, k * 0.9, j + 0.30);
            push(B, i + lean - 0.17, k * 0.9, j - 0.30);
          }
        }
      }
    } else if (kind === 'sheet') {
      // Three strongly-bonded sheets with a wide, weak gap between them.
      for (k = 0; k < 3; k++) {
        for (i = 0; i < 4; i++) for (j = 0; j < 4; j++) {
          push(B, i, k * 2.6, j);
          push(A, i + 0.5, k * 2.6 + 0.34, j + 0.5);
        }
      }
    } else if (kind === 'graphite') {
      // Honeycomb net from a two-atom basis on a hexagonal lattice. Every
      // in-plane neighbour lands at exactly 1.00, and the next layer at 2.36.
      // Layers alternate by one bond vector, which is the real ABA stacking.
      for (k = 0; k < 3; k++) {
        var shift = (k % 2) * 1.0;
        for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
          var bx = 1.5 * (i + j) + shift, bz = 0.866 * (i - j);
          push(A, bx, k * 2.36, bz);
          push(B, bx + 1.0, k * 2.36, bz);
        }
      }
    } else if (kind === 'silica') {
      // Corner-sharing SiO4 tetrahedra in a ring. The whole claim quartz's
      // caption makes — "every tetrahedron shares all four corners with its
      // neighbours" — is about SHARING, and it is the one thing that separates
      // a framework silicate from the isolated tetrahedra of olivine two
      // entries below. The old layout gave every silicon its own four oxygens
      // at fixed offsets, so nothing was shared by construction and quartz drew
      // essentially the same motif as the nesosilicates it is supposed to
      // contrast with. Each BRIDGING oxygen is now a single atom placed on the
      // line between two silicons, so it belongs to both tetrahedra at once.
      var ring = 6;
      var si = [];
      for (i = 0; i < ring; i++) {
        var a = (i / ring) * Math.PI * 2;
        si.push({ x: Math.cos(a) * 1.12, y: (i % 2) * 0.55, z: Math.sin(a) * 1.12 });
      }
      for (i = 0; i < ring; i++) push(A, si[i].x, si[i].y, si[i].z);
      for (i = 0; i < ring; i++) {
        var nx = si[(i + 1) % ring];
        // One shared corner per Si-Si link, sitting between the two centres.
        push(B, (si[i].x + nx.x) / 2, (si[i].y + nx.y) / 2, (si[i].z + nx.z) / 2);
        // The other two corners of each tetrahedron point out of the ring
        // plane, where they would bridge to the rings above and below.
        push(B, si[i].x * 1.34, si[i].y + 0.46, si[i].z * 1.34);
        push(B, si[i].x * 1.34, si[i].y - 0.46, si[i].z * 1.34);
      }
    } else if (kind === 'spinel') {
      // A SCHEMATIC inverse-spinel block, not crystallographic coordinates.
      // Its COUNTS preserve the chemistry: 16 O, 4 tetrahedral-A Fe3+, and
      // 8 octahedral-B cations split evenly between Fe2+ and Fe3+. Thus
      // Fe12O16 reduces to Fe3O4, and there are twice as many B as A sites.
      var tetraFe3 = A || 'Fe3A';
      var octaFe2 = B || 'Fe2B';
      var octaFe3 = C || 'Fe3B';
      for (k = 0; k < 2; k++) {
        var sOff = (k % 2) * 0.5;
        for (i = 0; i < 2; i++) for (j = 0; j < 4; j++) {
          push('O', i + sOff, k * 0.92, j + sOff * 0.6, { element: 'O' });
        }
      }
      // Four-coordinate tetrahedral A sites, all occupied by Fe3+.
      for (k = 0; k < 2; k++) for (j = 0; j < 2; j++) {
        push(tetraFe3, 0.75 + (k % 2) * 0.25, k * 0.92 + 0.46, j * 1.6 + 0.1,
          { element: 'Fe', site: 'A', oxidation: 3, coordination: 4 });
      }
      // Six-coordinate octahedral B sites, half Fe2+ and half Fe3+.
      for (k = 0; k < 2; k++) for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) {
        var fe2 = (i + j + k) % 2;
        push(fe2 ? octaFe2 : octaFe3,
          i + 0.25, k * 0.92 + 0.46, j * 1.6 + 0.9,
          { element: 'Fe', site: 'B', oxidation: fe2 ? 2 : 3, coordination: 6 });
      }
    } else if (kind === 'framework') {
      // Tectosilicate: the same corner-linked tetrahedra as quartz, but with
      // aluminium substituting for some of the silicon. Al carries one less
      // positive charge than Si, so a cation (K, Na or Ca) sits in the cavities
      // to balance it — that substitution is the whole difference from quartz.
      // Same corner-sharing geometry as quartz — that identity is the point,
      // because the ONLY difference feldspar's caption claims is the aluminium
      // substitution and the cavity cation that balances its charge. Drawing
      // the framework differently would have invented a second difference.
      var fr = 6;
      var tet = [];
      for (i = 0; i < fr; i++) {
        var fa = (i / fr) * Math.PI * 2;
        tet.push({ x: Math.cos(fa) * 1.12, y: (i % 2) * 0.55, z: Math.sin(fa) * 1.12 });
      }
      for (i = 0; i < fr; i++) push(i === 0 || i === 3 ? 'Al' : B, tet[i].x, tet[i].y, tet[i].z);
      for (i = 0; i < fr; i++) {
        var tn = tet[(i + 1) % fr];
        push('O', (tet[i].x + tn.x) / 2, (tet[i].y + tn.y) / 2, (tet[i].z + tn.z) / 2);
        push('O', tet[i].x * 1.34, tet[i].y + 0.46, tet[i].z * 1.34);
        push('O', tet[i].x * 1.34, tet[i].y - 0.46, tet[i].z * 1.34);
      }
      push(A, 0, 0.28, 0);   // cation in the cavity
    } else if (kind === 'rings') {
      // Native sulfur is a MOLECULAR crystal: puckered S8 crowns stacked with
      // only weak forces holding one ring to the next. Drawing the gap between
      // rings is the whole explanation for Mohs 2 and a 115 °C melting point.
      // Ring separation has to exceed the bond cutoff by more than a ring
      // diameter, or neighbouring rings bond to each other and the picture says
      // the opposite of the caption. Adjacent S-S inside a crown is ~1.05;
      // these offsets keep the closest inter-ring pair near 1.9.
      for (var rI = 0; rI < 3; rI++) {
        var ox = (rI % 2) * 2.8, oy = rI * 2.5, oz = (rI % 2) * 1.5;
        for (i = 0; i < 8; i++) {
          var ra = (i / 8) * Math.PI * 2;
          push(A, ox + Math.cos(ra) * 1.05, oy + (i % 2 ? 0.34 : -0.34), oz + Math.sin(ra) * 1.05);
        }
      }
    } else if (kind === 'isolated') {
      // Nesosilicate: SiO4 tetrahedra that share NO corners with each other.
      // The cations sitting between them are what hold the structure together.
      for (i = 0; i < 2; i++) for (j = 0; j < 2; j++) for (k = 0; k < 2; k++) {
        var bx = i * 2.5, by = j * 2.5, bz = k * 2.5;
        push(B, bx, by, bz);
        push('O', bx + 0.55, by + 0.55, bz + 0.55);
        push('O', bx - 0.55, by - 0.55, bz + 0.55);
        push('O', bx + 0.55, by - 0.55, bz - 0.55);
        push('O', bx - 0.55, by + 0.55, bz - 0.55);
        if (i === 0) push(A, bx + 1.25, by, bz);
        // Optional SECOND cation site. Garnet and topaz are nesosilicates like
        // olivine, but their islands are held by two different cation
        // environments rather than one, and that pair is what distinguishes
        // them — so it is drawn rather than averaged into a single species.
        if (C && j === 0) push(C, bx, by + 1.25, bz);
      }
    } else if (kind === 'closepacked') {
      // Corundum structure: oxygen in hexagonal close packing with the metal
      // filling two thirds of the octahedral holes. Al2O3 and Fe2O3 share it.
      for (k = 0; k < 3; k++) {
        var off = (k % 2) * 0.5;
        for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
          push(B, i + off, k * 0.88, j + off * 0.6);
        }
        if (k < 2) {
          // Two thirds occupancy, which is the defining number of the corundum
          // structure — Al₂O₃ needs exactly two metals per three oxygens. On a
          // 2x2 grid the old filter skipped one site of four and delivered
          // THREE quarters while the comment claimed two thirds. A 3x3 grid
          // divides exactly: (i+j)%3===2 removes three of the nine.
          for (i = 0; i < 3; i++) for (j = 0; j < 3; j++) {
            if ((i + j) % 3 === 2) continue;
            push(A, i + 0.5 + off, k * 0.88 + 0.44, j + 0.5);
          }
        }
      }
    }
    return out;
  }

  // The spinel view uses explicit nearest-oxygen coordination instead of a
  // distance cutoff. That preserves four neighbours around every A-site iron
  // and six around every B-site iron, and prevents the three legend species
  // from being mistaken for permission to draw Fe-Fe bonds.
  function rkSpinelBondPairs(atoms) {
    var pairs = [];
    atoms.forEach(function (metal, metalIndex) {
      if (metal.element !== 'Fe' || !metal.coordination) return;
      atoms.map(function (atom, atomIndex) {
        return {
          atom: atom,
          atomIndex: atomIndex,
          distance: Math.sqrt(
            Math.pow(metal.x - atom.x, 2) +
            Math.pow(metal.y - atom.y, 2) +
            Math.pow(metal.z - atom.z, 2)
          )
        };
      }).filter(function (candidate) {
        return candidate.atom.element === 'O';
      }).sort(function (left, right) {
        return left.distance - right.distance || left.atomIndex - right.atomIndex;
      }).slice(0, metal.coordination).forEach(function (oxygen) {
        pairs.push([Math.min(metalIndex, oxygen.atomIndex), Math.max(metalIndex, oxygen.atomIndex)]);
      });
    });
    return pairs;
  }

  // Generic unit-cell lattice points for a crystal system.
  // Corners carry their (i,j,k) index so the scene can draw the cell's twelve
  // EDGES and nothing else. Bonding every pair within a cutoff — which is right
  // for an atomic structure — drew the face and body diagonals too, and that
  // scribble hid the one thing this fallback exists to show: the SHAPE of the
  // cell. A cubic cell and a sheared monoclinic one looked identical.
  function rkCellAtoms(geo) {
    var out = [];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) for (var k = 0; k < 2; k++) {
      out.push({
        sp: 'X', cell: true, i: i, j: j, k: k,
        x: i * geo.ax[0], y: j * geo.ax[1] + i * geo.shear, z: k * geo.ax[2]
      });
    }
    return out;
  }

  // Scene builder handed to the host viewer shell.
  function rkBuildCrystalScene(THREE, api) {
    var meshes = {};
    var picks = [];
    var m = _rkCrystalBox.mineral;
    if (!m) return { meshes: meshes, picks: picks, anchor: null };

    var anchor = new THREE.Group();
    api.scene.add(anchor);

    var spec = RK_LATTICE[m.id];
    var atoms, bondLen;
    if (spec) {
      atoms = rkLatticeAtoms(spec.kind, spec.a, spec.b, spec.c);
      // Bond cutoff per structure. Chosen so bonds form WITHIN the unit that
      // matters and never across the gap that carries the lesson: inside an S8
      // ring but not between rings, inside a tetrahedron but not between
      // isolated ones, inside a silicate sheet but not across the weak plane.
      bondLen = spec.kind === 'sheet' ? 1.15
        : spec.kind === 'graphite' ? 1.15
        : spec.kind === 'silica' ? 0.95
        : spec.kind === 'rings' ? 1.15
        : spec.kind === 'isolated' ? 1.10
        // 1.21, not 1.05: once like-species pairs stopped bonding, three
        // oxygens in corundum's top layer and two in magnetite's were left
        // with no partner inside the old cutoff — orphaned by the gaps the
        // two-thirds occupancy leaves, not by the edge of the block. A few
        // slightly long bonds read far better than floating spheres.
        : spec.kind === 'closepacked' ? 1.21
        // 1.00, not 0.95: the cavity cation's nearest oxygen sits at 0.97, so
        // at 0.95 the potassium floated unbonded in the middle of the
        // framework — under a caption whose whole point is that it SITS there
        // balancing the aluminium's charge. A cavity cation really is bonded,
        // just at longer range than Si-O; 1.00 seats it and pulls in nothing
        // else (the pairs stay Al-O, Si-O and K-O).
        : spec.kind === 'framework' ? 1.00
        : spec.kind === 'spinel' ? 1.21
        : 1.15;
    } else {
      atoms = rkCellAtoms(rkCellGeometryFor(m.crystal).geo);
      bondLen = 1.45;
    }

    // Recentre so the structure orbits about its own middle.
    var cx = 0, cy = 0, cz = 0;
    atoms.forEach(function (at) { cx += at.x; cy += at.y; cz += at.z; });
    cx /= atoms.length; cy /= atoms.length; cz /= atoms.length;

    // Auto-fit. A fixed scale suited the compact cubic lattices but clipped the
    // tall ones — the layered sheet structures run three slabs high and ran off
    // the top of the frame, cutting off the very gap they exist to show. Scale
    // each structure to a common bounding radius instead, so every mineral
    // arrives framed at the same home camera distance.
    var maxR = 0.001;
    atoms.forEach(function (at) {
      var dx0 = at.x - cx, dy0 = at.y - cy, dz0 = at.z - cz;
      var rr = Math.sqrt(dx0 * dx0 + dy0 * dy0 + dz0 * dz0);
      if (rr > maxR) maxR = rr;
    });
    var SCALE = Math.max(0.22, Math.min(0.90, 1.65 / maxR));

    // Radii in RK_ATOM are RELATIVE ionic sizes — chloride really is bigger than
    // sodium, and that is worth seeing. But drawn at full scale against this
    // lattice spacing the spheres overlap into a single blob and hide the very
    // arrangement the panel exists to show, so they are shrunk uniformly to
    // ball-and-stick proportions: relative sizes preserved, gaps and bonds
    // visible, the cubic packing legible.
    var ATOM_SCALE = 0.46;

    var geoCache = {};
    atoms.forEach(function (at, idx) {
      var def = RK_ATOM[at.sp] || RK_ATOM.X;
      var key = at.sp;
      if (!geoCache[key]) geoCache[key] = new THREE.SphereGeometry(def.r * ATOM_SCALE, 20, 14);
      var mat = new THREE.MeshPhongMaterial({
        color: api.contrast ? 0xffffff : def.color,
        shininess: 58,
        specular: 0x333333,
        emissive: api.contrast ? 0x000000 : def.color,
        emissiveIntensity: api.dark ? 0.18 : 0.06
      });
      var mesh = new THREE.Mesh(geoCache[key], mat);
      mesh.position.set((at.x - cx) * SCALE, (at.y - cy) * SCALE + 0.3, (at.z - cz) * SCALE);
      if (api.wantShadow) { mesh.castShadow = true; mesh.receiveShadow = true; }
      mesh.userData.partId = 'atom-' + at.sp;
      anchor.add(mesh);
      picks.push(mesh);
      if (!meshes['atom-' + at.sp]) meshes['atom-' + at.sp] = mesh;
      if (idx === 0) meshes.root = mesh;
    });

    // Bonds between near neighbours, so the arrangement reads as a framework
    // rather than a cloud of loose spheres.
    var bondMat = new THREE.MeshPhongMaterial({ color: api.contrast ? 0xffffff : 0x94a3b8, shininess: 20 });
    var bondGeo = new THREE.CylinderGeometry(0.032, 0.032, 1, 8);
    // Bond budget. This was 220, which four structures exceeded — calcite wants
    // 315 and the three sheet silicates want 291 each. The loop walks i
    // ascending and the sheets are pushed layer by layer, so the atoms that
    // lost their bonds were the whole TOP slab: seventeen spheres left floating
    // above a structure whose entire caption is about how strongly the sheets
    // are bonded within a layer. Silent truncation is the worst kind, because
    // the picture still looks deliberate. The budget is now above what any
    // structure asks for, and a test fails if a new one ever reaches it.
    var BOND_BUDGET = 600;

    // A distance cutoff alone cannot tell a BOND from two ions that merely sit
    // near each other, and it was drawing a great many that do not exist:
    // calcite came out with 109 oxygen-to-oxygen bonds, 24 calcium-to-calcium
    // and 12 carbon-to-carbon, and the silicate sheets were laced with Si-Si
    // and Al-Al. In an ionic or a polyhedral structure the bonds run between
    // UNLIKE species — cation to anion, centre to ligand — so like-to-like is
    // refused unless the mineral genuinely has element-to-element bonding.
    // Diamond is carbon bonded to carbon throughout; sulfur's crown and
    // pyrite's dumbbell are both S-S, and pyrite being a DISULFIDE rather than
    // a simple sulfide is the thing its caption exists to point out.
    var RK_HOMOATOMIC = { diamond: { C: 1 }, graphite: { C: 1 }, rings: { S: 1 }, pyrite: { S: 1 } };
    var homoOk = (spec && RK_HOMOATOMIC[spec.kind]) || {};

    // A few structures need more than one cutoff. In a carbonate the carbon
    // bonds ONLY to the three oxygens of its own triangle — a tight covalent
    // unit — while the calcium sits between the layers as an ion, in contact
    // with oxygens that are much further away. A single distance cannot say
    // both: set it loose enough to seat the calcium and every carbon picked up
    // six oxygens plus thirty bonds straight to calcium, which is not a bond in
    // any sense. Returning 0 refuses the pair outright.
    var pairLimit = null;
    if (spec && spec.kind === 'carbonate') {
      pairLimit = function (p, q) {
        if (p === 'C' || q === 'C') return (p === 'O' || q === 'O') ? 0.60 : 0;
        return 1.05;   // Ca to O, the ionic contact between the layers
      };
    } else if (spec && spec.kind === 'pyrite') {
      // Pyrite needs the same trick for the same reason. Its sulfur comes in
      // discrete S₂ dumbbells, and being a DISULFIDE rather than a simple
      // sulfide is the one thing its caption exists to point out — but sulfurs
      // in NEIGHBOURING dumbbells sit 1.01 apart, inside the cutoff, so the
      // structure drew seven S-S bonds where only four are pairs and the
      // dumbbells joined into a chain. Iron-to-sulfur reaches 1.14, so a single
      // distance cannot separate the two; the pair bond gets its own short
      // limit instead.
      pairLimit = function (p, q) { return (p === 'S' && q === 'S') ? 0.70 : 1.15; };
    }

    var explicitSpinelBonds = null;
    if (spec && spec.kind === 'spinel') {
      explicitSpinelBonds = {};
      rkSpinelBondPairs(atoms).forEach(function (pair) {
        explicitSpinelBonds[pair[0] + ':' + pair[1]] = true;
      });
    }

    var placed = 0;
    for (var i = 0; i < atoms.length && placed < BOND_BUDGET; i++) {
      for (var j = i + 1; j < atoms.length && placed < BOND_BUDGET; j++) {
        var explicitSpinelBond = explicitSpinelBonds && explicitSpinelBonds[i + ':' + j];
        if (explicitSpinelBonds && !explicitSpinelBond) continue;
        // Unit-cell corners connect along the cell's EDGES only — neighbours
        // differing in exactly one axis index. A distance cutoff would also
        // catch the face and body diagonals and bury the cell's shape.
        if (atoms[i].cell && atoms[j].cell) {
          var steps = (atoms[i].i !== atoms[j].i ? 1 : 0)
            + (atoms[i].j !== atoms[j].j ? 1 : 0)
            + (atoms[i].k !== atoms[j].k ? 1 : 0);
          if (steps !== 1) continue;
        }
        // The unit-cell fallback is lattice POINTS, not atoms, so the
        // like-species rule does not apply to it — its edges are the whole
        // picture.
        if (!(atoms[i].cell && atoms[j].cell)
          && atoms[i].sp === atoms[j].sp && !homoOk[atoms[i].sp]) continue;
        var dx = (atoms[i].x - atoms[j].x) * SCALE;
        var dy = (atoms[i].y - atoms[j].y) * SCALE;
        var dz = (atoms[i].z - atoms[j].z) * SCALE;
        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        var limit = pairLimit ? pairLimit(atoms[i].sp, atoms[j].sp) : bondLen;
        if (!explicitSpinelBond && !(atoms[i].cell && atoms[j].cell)
          && (limit <= 0 || dist > limit * SCALE || dist < 0.0001)) continue;
        var bond = new THREE.Mesh(bondGeo, bondMat);
        bond.position.set(
          ((atoms[i].x + atoms[j].x) / 2 - cx) * SCALE,
          ((atoms[i].y + atoms[j].y) / 2 - cy) * SCALE + 0.3,
          ((atoms[i].z + atoms[j].z) / 2 - cz) * SCALE
        );
        bond.scale.set(1, dist, 1);
        bond.lookAt(new THREE.Vector3(
          (atoms[i].x - cx) * SCALE,
          (atoms[i].y - cy) * SCALE + 0.3,
          (atoms[i].z - cz) * SCALE
        ));
        bond.rotateX(Math.PI / 2);
        anchor.add(bond);
        placed++;
      }
    }

    return { meshes: meshes, picks: picks, anchor: anchor };
  }

  // Identity-stable ref, same discipline as the two canvases in this file: an
  // inline ref would detach and rebuild the whole WebGL scene on every render.
  // The host shell's attach() is documented as stable for exactly this reason.
  function rkCrystalRef(node) {
    RK_CRYSTAL_VIEWER.attach(node || null);
  }

  // Singleton viewer — one instance, and only one tool mounts at a time.
  var RK_CRYSTAL_NULL = {
    attach: function () {}, sync: function () {}, nudge: function () {},
    zoom: function () {}, reset: function () {}, status: function () { return 'failed'; }
  };
  // Why the 3D view is unavailable, when it is. The panel used to offer a single
  // explanation — "a CDN your network may block" — which is only one of the two
  // ways this fails, and it sent anyone debugging the other one down the wrong
  // path. If the HOST is missing makeBayViewer (its deploy mirror can lag the
  // root module), no amount of network access will help.
  var RK_CRYSTAL_UNAVAILABLE = null;

  var RK_CRYSTAL_VIEWER = (function () {
    var mk = window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) {
      RK_CRYSTAL_UNAVAILABLE = 'host';
      console.warn('[rocks] 3D crystal lab disabled: window.StemLab.makeBayViewer is missing. ' +
        'The host module (stem_lab_module.js) is older than the tool expects.');
      return RK_CRYSTAL_NULL;
    }
    return mk({
      parts: Object.keys(RK_ATOM).map(function (sp) {
        return { id: 'atom-' + sp, label: RK_ATOM[sp].label, color: RK_ATOM[sp].color };
      }),
      buildScene: rkBuildCrystalScene,
      home: { yaw: -0.6, pitch: 0.62, dist: 5.0 }
    });
  })();

  var ROCKS_CHALLENGES = [
    { id: 'types_explored', name: 'Petrologist', desc: 'Examine all 3 rock types (Igneous, Sedimentary, Metamorphic)', icon: '⛰️', rp: 15, check: function(s) { var st = s || {}; return Object.keys(st.typesViewed || {}).length >= 3; } },
    { id: 'specimens_examined', name: 'Rock Collector', desc: 'Examine 5+ rock specimens', icon: '🔍', rp: 15, check: function(s) { var st = s || {}; return Object.keys(st.rocksViewed || {}).length >= 5; } },
    { id: 'quiz_ace', name: 'Earth Science Ace', desc: 'Correctly answer 3 questions in the quiz', icon: '🎓', rp: 20, check: function(s) { var st = s || {}; return (st.quizScore || 0) >= 3; } },
    { id: 'vocab_studied', name: 'Vocabulary Master', desc: 'Study 3 key terminology definitions', icon: '📖', rp: 15, check: function(s) { var st = s || {}; return (st.vocabLookedUp || []).length >= 3; } },
    { id: 'wb_identify', name: 'Field Mineralogist', desc: 'Identify 2 unknown specimens at the Mineral Workbench', icon: '🔬', rp: 25, check: function(st) { var w = (st || {}).wb || {}; return (w.solved || 0) >= 2; } },
    { id: 'cycle_interact', name: 'Cycle Creator', desc: 'Perform 3 operations in the Rock Cycle simulator', icon: '🔄', rp: 20, check: function(s) { var st = s || {}; return (st.cycleInteractions || 0) >= 3; } }
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

  // Both quizzes render the Concept Focus card, one from each tool's render, so
  // these take T rather than being defined twice. The TERM is also the state key
  // for "already studied", so only the DISPLAY is translated; lookups keep using
  // the English id.
  function rkVocabSlug(term) { return String(term).toLowerCase().replace(/[^a-z0-9]+/g, '_'); }
  function rkVocabTerm(T, term) { return T('stem.rocks.vocab_term_' + rkVocabSlug(term), String(term)); }
  function rkVocabDef(T, term) {
    var english = ROCKS_VOCAB[term];
    return english ? T('stem.rocks.vocab_def_' + rkVocabSlug(term), english) : '';
  }

  // ── Stable callback ref for the Rock Cycle canvas ──
  // The canvas ref USED to be an inline `function (canvasEl) {...}` created fresh
  // inside the tool body on every render. React compares callback-ref identity: a
  // new function each commit means it calls the OLD ref with null (running the
  // cleanup, clearing _rcInit) and the NEW ref with the element — so the canvas
  // tore down and fully re-initialised on EVERY state update. tick reset to 0 and
  // all 125 particles were re-randomised, so the cycle animation visibly snapped
  // back to its start whenever anything changed: clicking a rock node, picking a
  // process, and — worst — ten times a second while the transformation machine's
  // progress timer ran. That is the "rock cycle keeps resetting" glitch.
  //
  // The draw loop was already written for a LONG-LIVED canvas: it reads the live
  // selection from canvasEl.dataset.selectedRock rather than from a closure, and
  // its click handler uses functional setState because "this listener's closure is
  // bound once at canvas init". The inline ref was defeating that design.
  //
  // Fix: one module-level function whose identity never changes, delegating to a
  // mutable box that each render refreshes. React sees the same ref every commit
  // and leaves the canvas mounted; the box keeps the initialiser current. No hook
  // is used — STEM tool bodies are inlined into the host bridge, so adding a hook
  // in one tool would shift hook order when navigating between tools.
  var _rcInitBox = { fn: null };
  var _rcLastCanvas = null;
  // Transformation-machine progress timer. Module-scoped so a run can always be
  // cancelled — by a new run, or by the tool unmounting — instead of leaking an
  // interval that keeps writing state into a tool nobody is looking at.
  var _rcTransformTimer = null;
  function rcStopTransformTimer() {
    if (_rcTransformTimer) { clearInterval(_rcTransformTimer); _rcTransformTimer = null; }
  }
  function rockCycleCanvasRef(canvasEl) {
    if (!canvasEl) {
      // Real unmount: React passes null. Tear the animation down for good.
      if (_rcLastCanvas && _rcLastCanvas._rcCleanup) { _rcLastCanvas._rcCleanup(); }
      if (_rcLastCanvas) _rcLastCanvas._rcInit = false;
      _rcLastCanvas = null;
      return;
    }
    _rcLastCanvas = canvasEl;
    if (canvasEl._rcInit) return;
    if (_rcInitBox.fn) _rcInitBox.fn(canvasEl);
  }

  // ═══ 🔬 rocks (rocks) ═══
  // Catalog identity. These were `label: 'rocks'` with an empty desc, so the
  // tool browser listed a lowercase id and no blurb \u2014 87 of the other 90 STEM
  // tools carry a proper name and description, and the a11y audit flags the gap
  // as a catalog/context notice.
  // ══ Observation-first workbench helpers ══
  // WHY: the Mineral Workbench used to READ the specimen's properties to the
  // learner — the lens overlay printed "Vitreous", the streak evidence said
  // "Streak: Greenish-black", the balance printed ρ. A student never had to
  // look at anything; the notebook filled itself. Identification is the act
  // of classifying what you see, so every instrument now shows evidence only,
  // and the learner records the classification. A misread is allowed: it
  // eliminates the true mineral, the shortlist empties, and the tool asks the
  // learner to look again instead of correcting them.
  //
  // Luster is recorded as one of four field classes. Each pool mineral maps
  // to exactly one class from the FIRST term of its `luster` string, so the
  // candidate filter and the choice buttons can never disagree.
  var RK_LUSTER_CLASSES = [
    { id: 'metallic', label: 'Metallic', hint: 'Shines like polished metal. Opaque: no light gets inside. A hard, mirror-like flash that slides as you tilt it.', sr: 'The surface acts like a mirror: a hard, bright reflection of the lamp with crisp edges, and no light passing into the specimen.' },
    { id: 'glassy', label: 'Glassy (vitreous)', hint: 'Shines like broken glass. A small, sharp highlight, and light passes a little way into the specimen.', sr: 'The surface shines like glass: one small sharp highlight, and light passes into the specimen so the interior looks lit.' },
    { id: 'pearly', label: 'Pearly or silky', hint: 'A soft, layered sheen like the inside of a seashell. The highlight is broad and blurred, with faint rainbow tints.', sr: 'The surface has a soft, layered sheen like the inside of a seashell: a broad, blurred highlight with faint rainbow tints along thin layers.' },
    { id: 'dull', label: 'Waxy, resinous or dull', hint: 'A soft shine like candle wax or amber, or no shine at all like chalk. No crisp highlight anywhere.', sr: 'The surface is matte or waxy: no crisp highlight anywhere, like chalk or candle wax.' }
  ];
  var RK_LUSTER_WORDS = { metallic: 'metallic', submetallic: 'metallic', vitreous: 'glassy', glassy: 'glassy', adamantine: 'glassy', pearly: 'pearly', silky: 'pearly', waxy: 'dull', resinous: 'dull', earthy: 'dull', greasy: 'dull', dull: 'dull' };
  function rkLusterClass(mineral) {
    var first = String((mineral && mineral.luster) || '').split('/')[0].trim().toLowerCase();
    return RK_LUSTER_WORDS[first] || 'dull';
  }
  function rkLusterClassInfo(id) {
    for (var i = 0; i < RK_LUSTER_CLASSES.length; i++) if (RK_LUSTER_CLASSES[i].id === id) return RK_LUSTER_CLASSES[i];
    return { id: 'unknown', label: 'Not recorded', hint: '', sr: '' };
  }
  // Powder-colour choices. Ids match wbStreakOutcomeFor() in the workbench
  // ('powder-' + slug of the data's streak string), plus the grooved-plate
  // outcome and one colour no pool mineral has, so the plate is a real
  // observation rather than a two-way guess.
  var RK_STREAK_CHOICES = [
    { id: 'powder-white', label: 'White', hex: '#ffffff' },
    { id: 'powder-greenish-black', label: 'Greenish-black', hex: '#16301c' },
    { id: 'powder-black', label: 'Black', hex: '#171717' },
    { id: 'powder-red-brown', label: 'Red-brown', hex: '#8b3a2a' },
    { id: 'powder-lead-gray', label: 'Lead-gray', hex: '#8d949e' },
    { id: 'powder-yellow-brown', label: 'Yellow-brown', hex: '#a1741f' },
    { id: 'powder-white-yellow', label: 'Pale yellow', hex: '#fffbd6' },
    { id: 'powder-green', label: 'Green', hex: '#3f9c6d' },
    { id: 'powder-pale-blue', label: 'Pale blue', hex: '#93bfe8' },
    { id: 'plate-scratched', label: 'No powder — the plate itself was grooved', hex: null }
  ];
  function rkStreakChoiceInfo(id) {
    for (var i = 0; i < RK_STREAK_CHOICES.length; i++) if (RK_STREAK_CHOICES[i].id === id) return RK_STREAK_CHOICES[i];
    return { id: 'unknown', label: 'Not recorded', hex: null };
  }

  // Form (shape) classes: the seventh evidence type. Derived ONCE here and used
  // by the hand-specimen drawing, the 3D geometry, the screen-reader description
  // of the bench and the candidate filter, so the picture, the model, the words
  // and the evidence can never disagree ([[feedback_one_verdict_one_derivation]]).
  var RK_FORM_CLASSES = [
    { id: 'blocky', label: 'Blocky: corners and steps near right angles', hint: 'Breaks into box-like pieces; cleavage directions meet at about 90°.', sr: 'The fragment has box-like corners and stepped faces meeting near right angles.' },
    { id: 'rhombs', label: 'Leaning blocks (rhombs)', hint: 'Faces are parallelograms that lean, like a squashed box.', sr: 'The fragment breaks into leaning, parallelogram-faced pieces.' },
    { id: 'sheets', label: 'Thin sheets or flakes', hint: 'Peels into flexible layers like the pages of a book.', sr: 'The fragment is a stack of thin sheets that peel apart.' },
    { id: 'prism', label: 'Six-sided column', hint: 'A long prism with a pointed end and lines running along its length.', sr: 'The fragment is a six-sided column with lengthwise lines.' },
    { id: 'pyramids', label: 'Pointed pyramids', hint: 'Triangular faces meeting in points, like two pyramids base to base.', sr: 'The fragment shows triangular faces meeting in points.' },
    { id: 'blades', label: 'Flat blade or tablet', hint: 'A thin, flat slab much wider than it is thick.', sr: 'The fragment is a thin, flat slab.' },
    { id: 'ball', label: 'Ball of many small faces', hint: 'A rounded crystal covered in small four-sided faces, like a soccer ball (a dodecahedron).', sr: 'The fragment is a rounded crystal covered in many small faces.' },
    { id: 'massive', label: 'No clear faces (massive)', hint: 'Lumpy or grainy with no flat faces or straight edges.', sr: 'The fragment is a lumpy mass without flat faces.' }
  ];
  // Overrides where the crystal SYSTEM is not what a hand specimen shows:
  // specular hematite is a massive/platy ore, talc a foliated mass, selenite a
  // tabular blade. Garnet (dodecahedral) is outside the workbench pool.
  // Challenge set: diamond grows as octahedra; sulfur and olivine are met as
  // massive crusts and granular masses; corundum as barrel-shaped prisms.
  // Mohs picked ten real minerals and ranked them by which scratches which.
  // The scale IS these specimens, so with all ten in the catalogue the minerals
  // browser can show the scale as minerals you can open rather than as numbers.
  // Which minerals react with cold dilute acid. Was declared TWICE — once in the
  // minerals lab and once in the workbench — each carrying a note asking the
  // other to be kept in step by hand. One list, two readers.
  var RK_CARBONATE_IDS = ['calcite', 'malachite', 'azurite'];

  var RK_MOHS_INDEX = [['talc', 1], ['gypsum', 2], ['calcite', 3], ['fluorite', 4], ['apatite', 5], ['feldspar', 6], ['quartz', 7], ['topaz', 8], ['corundum', 9], ['diamond', 10]];

  var RK_FORM_BY_ID = { apatite: 'prism', graphite: 'sheets', biotite: 'sheets', malachite: 'massive', azurite: 'prism', hematite: 'massive', talc: 'sheets', gypsum: 'blades', diamond: 'pyramids', sulfur: 'massive', olivine: 'massive', corundum: 'prism' };
  function rkFormClass(m) {
    if (!m) return 'massive';
    if (RK_FORM_BY_ID[m.id]) return RK_FORM_BY_ID[m.id];
    var habit = String(m.habit || '').toLowerCase();
    var sys = String(m.crystal || '').toLowerCase();
    if (habit === 'micaceous') return 'sheets';
    if (habit === 'octahedral') return 'pyramids';
    if (habit === 'blocky90') return 'blocky';
    if (habit === 'dodecahedral') return 'ball';
    if (sys.indexOf('cubic') !== -1 || sys.indexOf('isometric') !== -1) return 'blocky';
    if (sys.indexOf('hexagonal') !== -1 || sys.indexOf('orthorhombic') !== -1) return 'prism';
    if (sys.indexOf('rhombohedral') !== -1 || sys.indexOf('trigonal') !== -1) return 'rhombs';
    if (sys.indexOf('monoclinic') !== -1) return 'blades';
    return 'massive';
  }
  function rkFormClassInfo(id) {
    for (var i = 0; i < RK_FORM_CLASSES.length; i++) if (RK_FORM_CLASSES[i].id === id) return RK_FORM_CLASSES[i];
    return { id: 'unknown', label: 'Not recorded', hint: '', sr: 'The fragment’s form has not been described.' };
  }

  // Hand specimen: an irregular broken fragment, NOT the idealised crystal the
  // candidate cards show. The bench used to draw the unknown with the same
  // rkMineralSwatch as the reference cards, so a learner could identify it by
  // matching pictures. A field unknown is a chunk; its form shows through as
  // cleavage steps, sheets or fracture, which is the real evidence.
  function rkHandSpecimenSvg(h, mineral, size, opts) {
    var S = size || 40, o = opts || {};
    var base = (mineral && mineral.color) || '#cbd5e1';
    var id = mineral ? mineral.id : 'x';
    var cls = rkLusterClass(mineral);
    var form = rkFormClass(mineral);
    var rnd = rkSeed(id + '-hand');
    var c = S / 2, kids = [], i;
    var uid = 'rkhs-' + id + '-' + S;
    kids.push(h('defs', { key: 'defs' },
      h('radialGradient', { id: uid + '-vault', cx: '38%', cy: '30%', r: '78%' },
        h('stop', { offset: '0%', stopColor: '#5b6b80' }), h('stop', { offset: '100%', stopColor: '#1c2738' })),
      h('linearGradient', { id: uid + '-face', x1: '0%', y1: '0%', x2: '70%', y2: '100%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: cls === 'metallic' ? 0.55 : 0.30 }),
        h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.02 }),
        h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: cls === 'metallic' ? 0.45 : 0.32 })),
      h('radialGradient', { id: uid + '-glow', cx: '45%', cy: '40%', r: '60%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.28 }), h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 }))
    ));
    if (o.plate !== false) kids.push(h('rect', { key: 'plate', x: 0, y: 0, width: S, height: S, rx: S * 0.16, fill: 'url(#' + uid + '-vault)' }));
    kids.push(h('ellipse', { key: 'shadow', cx: c, cy: S * 0.84, rx: S * 0.30, ry: S * 0.055, fill: '#000000', opacity: 0.38 }));
    var outline = 'rgba(0,0,0,0.55)';
    var pts = [], n = 10;
    if (form === 'sheets') {
      // A book of sheets with a peeling top flake.
      var kw = S * 0.30, kh = S * 0.20, kl = S * 0.09;
      for (i = 0; i < 7; i++) {
        var dy = (i - 3) * S * 0.035, dx = (rnd() - 0.5) * S * 0.04;
        kids.push(h('polygon', { key: 'sheet' + i, points: [(c - kw + kl + dx) + ',' + (c - kh + dy), (c + kw + dx) + ',' + (c - kh * 0.8 + dy), (c + kw - kl + dx) + ',' + (c + kh * 0.25 + dy), (c - kw + dx) + ',' + (c + kh * 0.1 + dy)].join(' '), fill: base, stroke: outline, strokeWidth: 0.7, opacity: 0.92 }));
      }
      kids.push(h('polygon', { key: 'flake', points: [(c - kw + kl) + ',' + (c - kh - S * 0.11), (c + kw * 0.7) + ',' + (c - kh - S * 0.16), (c + kw * 0.5) + ',' + (c - kh - S * 0.02), (c - kw + kl * 0.3) + ',' + (c - kh - S * 0.01)].join(' '), fill: base, stroke: outline, strokeWidth: 0.7, opacity: 0.85 }));
      pts = null;
    } else {
      for (i = 0; i < n; i++) {
        var a = (i / n) * Math.PI * 2 - Math.PI / 2;
        var r = S * 0.33 * (0.82 + rnd() * 0.30);
        // Cleavable habits break with flatter, straighter faces.
        if (form === 'blocky' || form === 'blades') r = S * 0.33 * (0.92 + rnd() * 0.14);
        pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r * 0.92]);
      }
      var poly = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
      kids.push(h('polygon', { key: 'body', points: poly, fill: base, stroke: outline, strokeWidth: 0.9 }));
      // Facets: wedges from the centre, alternating tone, so the chunk reads as
      // a solid with broken faces rather than a flat blob.
      var tones = [0.0, 0.14, 0.05, 0.22, 0.08, 0.18];
      for (i = 0; i < n; i += 2) {
        var p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        kids.push(h('polygon', { key: 'facet' + i, points: [c + ',' + c, p1[0].toFixed(1) + ',' + p1[1].toFixed(1), p2[0].toFixed(1) + ',' + p2[1].toFixed(1), p3[0].toFixed(1) + ',' + p3[1].toFixed(1)].join(' '), fill: '#000000', opacity: tones[(i / 2) % tones.length] }));
      }
      kids.push(h('polygon', { key: 'faceShade', points: poly, fill: 'url(#' + uid + '-face)' }));
      // Habit cues drawn ON the fragment.
      var cue = 'rgba(0,0,0,0.32)';
      if (form === 'blocky') {
        // Right-angle cleavage steps.
        kids.push(h('polyline', { key: 'stepA', points: [(c - S * 0.16) + ',' + (c - S * 0.02), (c - S * 0.16) + ',' + (c + S * 0.10), (c - S * 0.02) + ',' + (c + S * 0.10)].join(' '), fill: 'none', stroke: cue, strokeWidth: 0.9 }));
        kids.push(h('polyline', { key: 'stepB', points: [(c + S * 0.02) + ',' + (c - S * 0.14), (c + S * 0.14) + ',' + (c - S * 0.14), (c + S * 0.14) + ',' + (c - S * 0.02)].join(' '), fill: 'none', stroke: cue, strokeWidth: 0.9 }));
      } else if (form === 'rhombs') {
        // Two sets of parallel cleavage traces meeting obliquely.
        for (i = 0; i < 3; i++) {
          kids.push(h('line', { key: 'rhA' + i, x1: (c - S * 0.18 + i * S * 0.09).toFixed(1), y1: (c + S * 0.12).toFixed(1), x2: (c - S * 0.06 + i * S * 0.09).toFixed(1), y2: (c - S * 0.14).toFixed(1), stroke: cue, strokeWidth: 0.7 }));
        }
        kids.push(h('line', { key: 'rhB', x1: (c - S * 0.2).toFixed(1), y1: (c + S * 0.02).toFixed(1), x2: (c + S * 0.16).toFixed(1), y2: (c - S * 0.03).toFixed(1), stroke: cue, strokeWidth: 0.7 }));
      } else if (form === 'pyramids' || form === 'blades') {
        // One flat face surviving on the fragment: a triangle for an octahedron,
        // a broad rhomb for a tabular blade.
        kids.push(h('polygon', { key: 'face', points: form === 'pyramids'
          ? [(c - S * 0.12) + ',' + (c + S * 0.06), (c + S * 0.10) + ',' + (c + S * 0.08), (c - S * 0.01) + ',' + (c - S * 0.12)].join(' ')
          : [(c - S * 0.12) + ',' + c, (c - S * 0.02) + ',' + (c - S * 0.12), (c + S * 0.12) + ',' + (c - S * 0.02), (c + S * 0.02) + ',' + (c + S * 0.10)].join(' '),
          fill: '#ffffff', opacity: 0.22, stroke: cue, strokeWidth: 0.7 }));
      } else if (form === 'ball') {
        // A few small pentagon-ish facets over a rounded fragment.
        for (i = 0; i < 3; i++) {
          var bcx = c + (i - 1) * S * 0.13, bcy = c + (i % 2 ? S * 0.08 : -S * 0.06), br = S * 0.07;
          kids.push(h('polygon', { key: 'ballf' + i, points: [0, 1, 2, 3, 4].map(function (k) { var ang = k * 1.2566 - 1.57; return (bcx + Math.cos(ang) * br).toFixed(1) + ',' + (bcy + Math.sin(ang) * br).toFixed(1); }).join(' '), fill: '#ffffff', opacity: 0.16, stroke: cue, strokeWidth: 0.6 }));
        }
      } else if (form === 'prism') {
        // Prism striations along one surviving face.
        for (i = 0; i < 4; i++) kids.push(h('line', { key: 'str' + i, x1: (c - S * 0.14 + i * S * 0.05).toFixed(1), y1: (c - S * 0.16).toFixed(1), x2: (c - S * 0.10 + i * S * 0.05).toFixed(1), y2: (c + S * 0.14).toFixed(1), stroke: cue, strokeWidth: 0.6 }));
      } else if (cls === 'glassy') {
        // Conchoidal fracture: concentric shell-like arcs.
        for (i = 1; i <= 3; i++) kids.push(h('path', { key: 'conch' + i, d: 'M' + (c - S * 0.05 * i).toFixed(1) + ',' + (c + S * 0.02 * i).toFixed(1) + ' a' + (S * 0.07 * i).toFixed(1) + ',' + (S * 0.05 * i).toFixed(1) + ' 0 0 1 ' + (S * 0.12 * i).toFixed(1) + ',' + (-S * 0.02 * i).toFixed(1), fill: 'none', stroke: cue, strokeWidth: 0.6 }));
      }
      if (cls === 'dull' || form === 'massive') {
        for (i = 0; i < 26; i++) kids.push(h('circle', { key: 'gr' + i, cx: (c + (rnd() - 0.5) * S * 0.46).toFixed(1), cy: (c + (rnd() - 0.5) * S * 0.42).toFixed(1), r: 0.55, fill: '#000000', opacity: 0.22 }));
      }
    }
    // Luster shading: the visible difference between the four classes.
    if (cls === 'metallic') {
      kids.push(h('polygon', { key: 'mirror', points: [(c - S * 0.22) + ',' + (c - S * 0.08), (c - S * 0.04) + ',' + (c - S * 0.24), (c + S * 0.02) + ',' + (c - S * 0.20), (c - S * 0.18) + ',' + (c - S * 0.02)].join(' '), fill: '#ffffff', opacity: 0.72 }));
      kids.push(h('polygon', { key: 'mirror2', points: [(c + S * 0.04) + ',' + (c + S * 0.10), (c + S * 0.16) + ',' + (c - S * 0.02), (c + S * 0.19) + ',' + (c + S * 0.01), (c + S * 0.07) + ',' + (c + S * 0.13)].join(' '), fill: '#ffffff', opacity: 0.35 }));
    } else if (cls === 'glassy') {
      kids.push(h('ellipse', { key: 'glow', cx: c, cy: c, rx: S * 0.26, ry: S * 0.22, fill: 'url(#' + uid + '-glow)' }));
      kids.push(h('ellipse', { key: 'spec', cx: c - S * 0.12, cy: c - S * 0.14, rx: S * 0.05, ry: S * 0.025, fill: '#ffffff', opacity: 0.85, transform: 'rotate(-28 ' + (c - S * 0.12) + ' ' + (c - S * 0.14) + ')' }));
      kids.push(h('circle', { key: 'spec2', cx: c + S * 0.10, cy: c + S * 0.06, r: S * 0.012, fill: '#ffffff', opacity: 0.7 }));
    } else if (cls === 'pearly') {
      kids.push(h('ellipse', { key: 'sheen1', cx: c - S * 0.04, cy: c - S * 0.06, rx: S * 0.22, ry: S * 0.09, fill: '#ffffff', opacity: 0.16, transform: 'rotate(-14 ' + c + ' ' + c + ')' }));
      kids.push(h('ellipse', { key: 'sheen2', cx: c - S * 0.04, cy: c - S * 0.06, rx: S * 0.13, ry: S * 0.05, fill: '#ffffff', opacity: 0.22, transform: 'rotate(-14 ' + c + ' ' + c + ')' }));
      kids.push(h('line', { key: 'irisA', x1: (c - S * 0.2).toFixed(1), y1: (c + S * 0.02).toFixed(1), x2: (c + S * 0.18).toFixed(1), y2: (c - S * 0.06).toFixed(1), stroke: '#f9a8d4', strokeWidth: 1.1, opacity: 0.35 }));
      kids.push(h('line', { key: 'irisB', x1: (c - S * 0.18).toFixed(1), y1: (c + S * 0.06).toFixed(1), x2: (c + S * 0.2).toFixed(1), y2: (c - S * 0.02).toFixed(1), stroke: '#67e8f9', strokeWidth: 1.1, opacity: 0.30 }));
    }
    return h('svg', { viewBox: '0 0 ' + S + ' ' + S, width: S, height: S, role: 'img', 'aria-label': o.aria || 'Unknown hand specimen: an irregular broken fragment.', style: { display: 'block' } }, kids);
  }

  // Lens porthole: a magnified patch of surface whose ONLY job is to show how
  // the surface handles light. Same rim and lamp position for every class, so
  // the frame is never the cue; the highlight behaviour is.
  function rkLensViewSvg(h, mineral, size, opts) {
    var S = size || 120, o = opts || {};
    var base = (mineral && mineral.color) || '#cbd5e1';
    var cls = o.forceClass || rkLusterClass(mineral);
    var id = (mineral ? mineral.id : 'x') + (o.forceClass ? '-ref' : '');
    var rnd = rkSeed(id + '-lens');
    var c = S / 2, r = S * 0.44, kids = [], i;
    var uid = 'rklens-' + id + '-' + S;
    // Highlights carry a slow drift when animated, so 'tilt it under the lamp'
    // is visibly true even in the 2D porthole.
    var drift = o.animate ? 'rk-lens-drift' : undefined;
    kids.push(h('defs', { key: 'defs' },
      h('clipPath', { id: uid + '-clip' }, h('circle', { cx: c, cy: c, r: r })),
      h('radialGradient', { id: uid + '-inner', cx: '50%', cy: '55%', r: '55%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.34 }), h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })),
      h('linearGradient', { id: uid + '-mirror', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
        h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.75 }),
        h('stop', { offset: '38%', stopColor: '#ffffff', stopOpacity: 0.08 }),
        h('stop', { offset: '62%', stopColor: '#000000', stopOpacity: 0.10 }),
        h('stop', { offset: '100%', stopColor: '#000000', stopOpacity: 0.55 })),
      h('linearGradient', { id: uid + '-pearl', x1: '0%', y1: '0%', x2: '100%', y2: '40%' },
        h('stop', { offset: '0%', stopColor: '#fbcfe8', stopOpacity: 0.28 }),
        h('stop', { offset: '50%', stopColor: '#ffffff', stopOpacity: 0.36 }),
        h('stop', { offset: '100%', stopColor: '#a5f3fc', stopOpacity: 0.26 }))
    ));
    var g = [];
    g.push(h('circle', { key: 'body', cx: c, cy: c, r: r, fill: base }));
    if (cls === 'metallic') {
      g.push(h('rect', { key: 'mirror', x: 0, y: 0, width: S, height: S, fill: 'url(#' + uid + '-mirror)' }));
      // Crisp reflection of the lamp.
      g.push(h('rect', { key: 'lamp', className: drift, x: c - r * 0.62, y: c - r * 0.58, width: r * 0.42, height: r * 0.16, rx: r * 0.04, fill: '#ffffff', opacity: 0.92, transform: 'rotate(-32 ' + c + ' ' + c + ')' }));
      for (i = 0; i < 6; i++) g.push(h('line', { key: 'sc' + i, x1: (c - r + rnd() * r * 1.4).toFixed(1), y1: (c - r * 0.6 + rnd() * r * 1.4).toFixed(1), x2: (c - r * 0.2 + rnd() * r * 1.2).toFixed(1), y2: (c - r * 0.3 + rnd() * r * 1.2).toFixed(1), stroke: '#ffffff', strokeWidth: 0.5, opacity: 0.35 }));
    } else if (cls === 'glassy') {
      g.push(h('circle', { key: 'inner', cx: c, cy: c, r: r, fill: 'url(#' + uid + '-inner)' }));
      for (i = 1; i <= 4; i++) g.push(h('path', { key: 'conch' + i, d: 'M' + (c - r * 0.16 * i).toFixed(1) + ',' + (c + r * 0.08 * i).toFixed(1) + ' a' + (r * 0.24 * i).toFixed(1) + ',' + (r * 0.16 * i).toFixed(1) + ' 0 0 1 ' + (r * 0.36 * i).toFixed(1) + ',' + (-r * 0.06 * i).toFixed(1), fill: 'none', stroke: '#000000', strokeWidth: 0.7, opacity: 0.22 }));
      g.push(h('ellipse', { key: 'spec', className: drift, cx: c - r * 0.42, cy: c - r * 0.44, rx: r * 0.16, ry: r * 0.07, fill: '#ffffff', opacity: 0.92, transform: 'rotate(-32 ' + (c - r * 0.42) + ' ' + (c - r * 0.44) + ')' }));
      g.push(h('circle', { key: 'spec2', className: drift, cx: c + r * 0.3, cy: c + r * 0.2, r: r * 0.035, fill: '#ffffff', opacity: 0.8 }));
      g.push(h('path', { key: 'edgeGlint', d: 'M' + (c + r * 0.2).toFixed(1) + ',' + (c - r * 0.7).toFixed(1) + ' q' + (r * 0.45).toFixed(1) + ',' + (r * 0.3).toFixed(1) + ' ' + (r * 0.3).toFixed(1) + ',' + (r * 0.9).toFixed(1), fill: 'none', stroke: '#ffffff', strokeWidth: 1.2, opacity: 0.55 }));
    } else if (cls === 'pearly') {
      for (i = 0; i < 9; i++) g.push(h('line', { key: 'layer' + i, x1: c - r, y1: (c - r * 0.8 + i * r * 0.2).toFixed(1), x2: c + r, y2: (c - r * 0.95 + i * r * 0.2).toFixed(1), stroke: '#000000', strokeWidth: 0.6, opacity: 0.18 }));
      g.push(h('rect', { key: 'pearl', x: 0, y: 0, width: S, height: S, fill: 'url(#' + uid + '-pearl)' }));
      for (i = 0; i < 4; i++) g.push(h('ellipse', { key: 'soft' + i, className: drift, cx: c - r * 0.3, cy: c - r * 0.2, rx: r * (0.62 - i * 0.12), ry: r * (0.30 - i * 0.055), fill: '#ffffff', opacity: 0.12, transform: 'rotate(-18 ' + (c - r * 0.3) + ' ' + (c - r * 0.2) + ')' }));
    } else {
      g.push(h('circle', { key: 'matte', cx: c, cy: c, r: r, fill: '#000000', opacity: 0.08 }));
      for (i = 0; i < 90; i++) g.push(h('circle', { key: 'gr' + i, cx: (c + (rnd() - 0.5) * r * 1.9).toFixed(1), cy: (c + (rnd() - 0.5) * r * 1.9).toFixed(1), r: (0.5 + rnd() * 1.1).toFixed(2), fill: rnd() > 0.5 ? '#000000' : '#ffffff', opacity: 0.16 }));
      g.push(h('ellipse', { key: 'waxy', cx: c - r * 0.35, cy: c - r * 0.35, rx: r * 0.3, ry: r * 0.18, fill: '#ffffff', opacity: cls === 'dull' ? 0.07 : 0.1 }));
    }
    kids.push(h('g', { key: 'view', clipPath: 'url(#' + uid + '-clip)' }, g));
    // Rim + the lens's own glass reflection, identical for every class.
    kids.push(h('circle', { key: 'rim', cx: c, cy: c, r: r, fill: 'none', stroke: '#0f172a', strokeWidth: S * 0.045 }));
    kids.push(h('circle', { key: 'rim2', cx: c, cy: c, r: r + S * 0.03, fill: 'none', stroke: '#475569', strokeWidth: S * 0.012 }));
    kids.push(h('path', { key: 'glass', d: 'M' + (c - r * 0.72).toFixed(1) + ',' + (c - r * 0.5).toFixed(1) + ' a' + r.toFixed(1) + ',' + r.toFixed(1) + ' 0 0 1 ' + (r * 0.5).toFixed(1) + ',' + (-r * 0.66).toFixed(1), fill: 'none', stroke: '#ffffff', strokeWidth: S * 0.018, opacity: 0.35, strokeLinecap: 'round' }));
    // x/y are honoured when this is nested inside another svg; a transform on a
    // wrapping <g> is NOT applied to a nested <svg> viewport by every engine.
    return h('svg', { viewBox: '0 0 ' + S + ' ' + S, width: o.width || S, height: o.height || S, x: o.x, y: o.y, role: 'img', 'aria-label': o.aria || 'Magnified view of the specimen surface under a lamp.', style: { display: 'block', maxWidth: '100%' } }, kids);
  }

  // ── 3D hand specimen on the host viewer shell ──
  // A physically-based rendering of the unknown so the learner can turn it
  // under the lamp and watch how the highlight behaves: a metallic surface
  // throws a hard mirror flash, glass a pin-point with light entering the
  // body, a pearly book a soft sheen, a dull surface nothing. Same shell the
  // crystal lab uses, so it inherits load/teardown/context-loss handling and
  // degrades to the 2D lens view when WebGL or the CDN is unavailable.
  var _rkSpecimenBox = { mineral: null };
  function rkSpecimenEnvMap(THREE) {
    // Six tiny canvases: a bright ceiling lamp, lit walls, dark floor. Cheap,
    // and it is what makes metal and glass READ as metal and glass.
    var faces = [];
    var mk = function (paint) {
      var cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
      var g = cv.getContext('2d'); paint(g); return cv;
    };
    var wall = function (light) {
      return mk(function (g) {
        var gr = g.createLinearGradient(0, 0, 0, 64);
        gr.addColorStop(0, light ? '#dbe7f3' : '#8fa3b8'); gr.addColorStop(1, '#2b3646');
        g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
        if (light) { g.fillStyle = '#ffffff'; g.fillRect(18, 8, 28, 14); }
      });
    };
    faces.push(wall(true));   // +x
    faces.push(wall(false));  // -x
    faces.push(mk(function (g) { g.fillStyle = '#e8f0f8'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#ffffff'; g.fillRect(14, 14, 36, 36); })); // +y ceiling lamp
    faces.push(mk(function (g) { g.fillStyle = '#3b2f24'; g.fillRect(0, 0, 64, 64); })); // -y floor
    faces.push(wall(false));  // +z
    faces.push(wall(true));   // -z
    var tex = new THREE.CubeTexture(faces);
    // Deliberately LEFT in linear encoding: the shell renders with linear output,
    // and an sRGB-tagged map is decoded to linear on sample, which turned a
    // mid-grey room into a quarter-brightness one and every metal near-black.
    tex.needsUpdate = true;
    return tex;
  }
  function rkSpecimenGeometry(THREE, m) {
    var habit = String((m && m.habit) || '').toLowerCase();
    var form = rkFormClass(m);
    var rnd = rkSeed((m ? m.id : 'x') + '-geo');
    var jitter = function (geo, amp) {
      var pos = geo.attributes && geo.attributes.position;
      if (!pos) return geo;
      // Three's primitives are NON-indexed: a corner shared by three faces is
      // stored three times. Jittering each copy independently tore the faces
      // apart (slivers and holes). Key the offset on the rounded position so
      // every copy of a corner moves together and the solid stays closed.
      var seen = {};
      for (var i = 0; i < pos.count; i++) {
        var key = pos.getX(i).toFixed(3) + ',' + pos.getY(i).toFixed(3) + ',' + pos.getZ(i).toFixed(3);
        if (!seen[key]) seen[key] = [(rnd() - 0.5) * amp, (rnd() - 0.5) * amp, (rnd() - 0.5) * amp];
        var dlt = seen[key];
        pos.setXYZ(i, pos.getX(i) + dlt[0], pos.getY(i) + dlt[1], pos.getZ(i) + dlt[2]);
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();
      return geo;
    };
    var shear = function (geo, kx) {
      var mat = new THREE.Matrix4().set(1, kx, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
      geo.applyMatrix4(mat);
      geo.computeVertexNormals();
      return geo;
    };
    if (form === 'pyramids') return new THREE.OctahedronGeometry(1.15, 0);
    if (form === 'ball') return new THREE.DodecahedronGeometry(1.05, 0);
    if (form === 'blocky') return habit === 'blocky90' ? jitter(new THREE.BoxGeometry(1.5, 1.05, 1.2), 0.04) : jitter(new THREE.BoxGeometry(1.35, 1.35, 1.35), 0.05);
    if (form === 'prism') {
      var prism = new THREE.CylinderGeometry(0.6, 0.62, 1.5, 6);
      var tip = new THREE.ConeGeometry(0.6, 0.55, 6);
      tip.translate(0, 1.02, 0);
      var merged = null;
      try {
        if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeBufferGeometries) merged = THREE.BufferGeometryUtils.mergeBufferGeometries([prism, tip]);
      } catch (e) { merged = null; }
      return merged || { group: [prism, tip] };
    }
    if (form === 'rhombs') return shear(new THREE.BoxGeometry(1.35, 1.1, 1.15), 0.42);
    if (form === 'blades') return shear(new THREE.BoxGeometry(1.7, 0.32, 1.0), 0.22);
    // massive (and 'sheets', which buildScene assembles from plates instead)
    return jitter(new THREE.DodecahedronGeometry(1.05, 1), 0.14);
  }
  function rkSpecimenMaterial(THREE, m, env) {
    var cls = rkLusterClass(m);
    var color = new THREE.Color((m && m.color) || '#cbd5e1');
    var mat;
    if (cls === 'metallic') {
      mat = new THREE.MeshStandardMaterial({ color: color, metalness: 1.0, roughness: 0.28, envMap: env, envMapIntensity: 1.5, flatShading: true });
    } else if (cls === 'glassy') {
      mat = new THREE.MeshPhysicalMaterial({ color: color, metalness: 0.0, roughness: 0.05, envMap: env, envMapIntensity: 1.1, transparent: true, opacity: 0.96, flatShading: true });
      if ('clearcoat' in mat) { mat.clearcoat = 1.0; mat.clearcoatRoughness = 0.04; }
      if ('transmission' in mat) mat.transmission = 0.45;
      if ('thickness' in mat) mat.thickness = 0.8;
      if ('ior' in mat) mat.ior = 1.55;
    } else if (cls === 'pearly') {
      var pale = color.clone().lerp(new THREE.Color('#ffffff'), 0.25);
      mat = new THREE.MeshPhysicalMaterial({ color: pale, metalness: 0.05, roughness: 0.42, envMap: env, envMapIntensity: 0.8, flatShading: true });
      if ('clearcoat' in mat) { mat.clearcoat = 0.9; mat.clearcoatRoughness = 0.38; }
      if ('sheen' in mat) {
        if (typeof mat.sheen === 'number') { mat.sheen = 0.8; if ('sheenColor' in mat) mat.sheenColor = new THREE.Color('#fbcfe8'); }
        else mat.sheen = new THREE.Color('#fbcfe8');
      }
    } else {
      mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.0, roughness: 1.0, flatShading: true });
    }
    return mat;
  }
  function rkBuildSpecimenScene(THREE, api) {
    var meshes = {}, picks = [];
    var m = _rkSpecimenBox.mineral;
    if (!m) return { meshes: meshes, picks: picks, anchor: null };
    var anchor = new THREE.Group();
    api.scene.add(anchor);
    var env = rkSpecimenEnvMap(THREE);
    var mat = rkSpecimenMaterial(THREE, m, env);
    var body = new THREE.Group();
    var i;
    if (rkFormClass(m) === 'sheets') {
      // A book of thin plates, top ones lifted like peeling sheets.
      for (i = 0; i < 9; i++) {
        var plate = new THREE.Mesh(new THREE.CylinderGeometry(1.0 + (i % 3) * 0.03, 1.0, 0.05, 6), mat);
        plate.position.set((i % 2) * 0.03, -0.35 + i * 0.075 + (i > 6 ? (i - 6) * 0.06 : 0), (i % 3) * 0.02);
        plate.rotation.z = i > 6 ? (i - 6) * 0.08 : 0;
        plate.rotation.y = i * 0.05;
        plate.castShadow = api.wantShadow; plate.receiveShadow = api.wantShadow;
        body.add(plate);
      }
    } else {
      var geo = rkSpecimenGeometry(THREE, m);
      var parts = geo && geo.group ? geo.group : [geo];
      for (i = 0; i < parts.length; i++) {
        var mesh = new THREE.Mesh(parts[i], mat);
        mesh.castShadow = api.wantShadow; mesh.receiveShadow = api.wantShadow;
        body.add(mesh);
      }
    }
    body.position.y = 0.15;
    anchor.add(body);
    // Bench top: a matte disc that catches the shadow, so the fragment sits
    // on something instead of hanging in fog.
    var floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 40), new THREE.MeshStandardMaterial({ color: api.dark ? 0x6b4c2f : 0xa97c4f, roughness: 0.95, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.95;
    floor.receiveShadow = api.wantShadow;
    anchor.add(floor);
    // A lamp glint sphere in the reflection direction helps metal/glass show
    // a hard highlight even without the env map.
    var lamp = new THREE.PointLight(0xfff2d6, 0.9, 12);
    lamp.position.set(1.6, 3.2, 2.2);
    anchor.add(lamp);
    meshes.specimen = body;
    var frame = function (now, sceneProps, reduced) {
      if (reduced) return;
      body.rotation.y = (now * 0.00035) % (Math.PI * 2);
    };
    return { meshes: meshes, picks: picks, anchor: anchor, frame: frame };
  }
  var RK_SPECIMEN_VIEWER = (function () {
    var mk = window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) return null;
    return mk({ parts: [], buildScene: rkBuildSpecimenScene, home: { yaw: -0.55, pitch: 0.42, dist: 4.4 } });
  })();
  // Identity-stable ref (see rkCrystalRef): an inline ref would rebuild the
  // WebGL scene on every workbench render.
  function rkSpecimenRef(node) {
    if (RK_SPECIMEN_VIEWER) RK_SPECIMEN_VIEWER.attach(node || null);
  }

  window.StemLab.registerTool('rocks', {
    icon: '\uD83E\uDEA8',
    label: 'Rocks & Minerals Explorer',
    desc: 'Earth Science: identify 24 rock specimens and 23 minerals by what you can actually see. Interactive landscape cross-section, textured specimen art, a no-AI Visual ID drill, AI Mystery Rock clues, and the real hand-sample tests \u2014 Mohs scratch, streak plate, acid fizz \u2014 plus a rotatable 3D view of each mineral\u2019s crystal structure and a weathering-climate investigation.',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'view_all_types', label: 'View igneous, sedimentary, and metamorphic rocks', icon: '\uD83E\uDEA8', check: function(d) { return Object.keys(d.typesViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.typesViewed || {}).length + '/3 types'; } },
      { id: 'quiz_score_5', label: 'Score 5+ on the rock identification quiz', icon: '\uD83E\uDDE0', check: function(d) { return (d.quizScore || 0) >= 5; }, progress: function(d) { return (d.quizScore || 0) + '/5'; } },
      { id: 'explore_5_rocks', label: 'Examine 5 different rock specimens', icon: '\uD83D\uDD2C', check: function(d) { return Object.keys(d.rocksViewed || {}).length >= 5; }, progress: function(d) { return Object.keys(d.rocksViewed || {}).length + '/5 rocks'; } }
    ],
    render: function(ctx) {
      // The header and the two hint lines paint no ground of their own, so
      // they sit on the HOST surface - white in light and dark, pure BLACK in
      // the contrast theme, where the tool own title measured 1.44:1.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
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
              { id: 'gabbro', type: 'igneous' }, { id: 'breccia', type: 'sedimentary' },
              { id: 'sandstone', type: 'sedimentary' }, { id: 'limestone', type: 'sedimentary' },
              { id: 'shale', type: 'sedimentary' }, { id: 'conglom', type: 'sedimentary' },
              { id: 'chalk', type: 'sedimentary' }, { id: 'travertine', type: 'sedimentary' },
              { id: 'siltstone', type: 'sedimentary' }, { id: 'coal', type: 'sedimentary' },
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

          // The chip tooltip and the completion toast were the only two readers
          // of a challenge's name and description, and both printed the table's
          // raw English.
          const rkChallengeText = function (ch, field) {
            return (ch && typeof ch[field] === 'string')
              ? __alloT('stem.rocks.challenge_' + ch.id + '_' + field, ch[field])
              : '';
          };

          // ROCKS_CHALLENGES / ROCKS_VOCAB now live at module scope (shared with
          // the rockCycle tool, which referenced them out of scope).

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
                  var name = fc ? rkChallengeText(fc, 'name') : finishedId;
                  var rp = fc ? fc.rp : 0;
                  // Host signature is addToast(message, type); the object form
                  // that used to be here rendered as "[object Object]".
                  addToast('🏆 Challenge complete: ' + name + ' (+' + rp + ' RP)', 'success');
                }
              }
              if (typeof announceToSR === 'function') {
                announceToSR(__alloT('stem.rocks.sr_challenges_updated', 'Challenges updated. You have completed ') + updatedCompleted.length + __alloT('stem.rocks.sr_challenges_of', ' of ') + ROCKS_CHALLENGES.length + __alloT('stem.rocks.sr_challenges_tail', ' challenges. Research points: ') + newRP);
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
                  updMulti({ aiAnswer: __alloT('stem.rocks.ai_connection_error', 'Connection error. Please try again.'), aiLoading: false });
                });
              } else {
                updMulti({ aiAnswer: __alloT('stem.rocks.ai_offline_no_key', 'AI Petrologist is currently offline. Key not configured.'), aiLoading: false });
              }
              return;
            }

            fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            }).then(function(r) { return r.json(); }).then(function(data) {
              var answer = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || __alloT('stem.rocks.ai_no_response', 'I could not generate a response. Try again!');
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

            igneous: { label: t('stem.rocks.igneous'), icon: '🌋', color: '#ef4444', ink: '#b91c1c', desc: t('stem.rocks.formed_from_cooled_magma_or'), process: 'Cooling & Crystallization' },

            sedimentary: { label: t('stem.rocks.sedimentary'), icon: '🏖️', color: '#f59e0b', ink: '#92400e', desc: t('stem.rocks.formed_from_compressed_layers_of'), process: 'Compaction & Cementation' },

            metamorphic: { label: t('stem.rocks.metamorphic'), icon: '⛰️', color: '#8b5cf6', ink: '#6d28d9', desc: t('stem.rocks.formed_when_existing_rocks_change'), process: t('stem.rock_cycle.heat_pressure') }

          };



          // ── Rock specimens ──




          // ── Mineral data ──

          // Localized view of the hoisted RK_ROCKS table (see its note above).
          //
          // `label` was the ONLY localized field, so the specimen card — the
          // most-read panel in the tool — printed its description and its uses
          // in English in every language. The pack could be 100% complete and a
          // reader still learned nothing about the rock they had selected.
          // Keyed by id rather than by a slug of the English, so revising the
          // wording does not silently orphan the translations.
          const ROCKS = RK_ROCKS.map(function (r) {
            return Object.assign({}, r, {
              label: t(r.labelKey),
              desc: __alloT('stem.rocks.desc_' + r.id, r.desc),
              uses: __alloT('stem.rocks.uses_' + r.id, r.uses)
            });
          });
          // The gloss is what a screen reader reads INSTEAD of the picture, so
          // leaving it in English made the tile unusable in any other language.
          // RK_TEXTURE_GLOSS sits at module scope, above __alloT, so the
          // localized read has to happen in here.
          const rkGloss = function (texture) {
            var english = RK_TEXTURE_GLOSS[texture];
            if (!english) return texture;
            return __alloT('stem.rocks.texture_gloss_' + texture, english);
          };
          const MINERALS = [

            { id: 'quartz', label: t('stem.rocks.quartz'), hardness: 7, density: 2.65, streak: 'White', luster: 'Vitreous', crystal: 'Hexagonal', color: '#e8edf0', formula: 'SiO\u2082', desc: 'The second most abundant mineral in the crust of Earth. Forms distinctive six-sided prismatic crystals with pointed terminations. Extremely resistant to weathering. Comes in many colored varieties: amethyst (purple), citrine (yellow), rose quartz (pink), smoky quartz (brown).', uses: 'Electronics (oscillators, watches), glassmaking, abrasives, gemstones', funFact: 'Quartz is piezoelectric (when squeezed, it generates an electric charge). This property makes quartz watches accurate to within 15 seconds per month!', occurrence: 'Found in virtually all rock types worldwide. Major deposits in Brazil, Arkansas (USA), Madagascar, and the Alps.' },

            { id: 'feldspar', label: t('stem.rocks.feldspar'), hardness: 6, density: 2.56, streak: 'White', luster: 'Vitreous', crystal: 'Monoclinic', habit: 'blocky90', color: '#d9a48f', formula: 'KAlSi\u2083O\u2088', desc: 'This reference specimen represents orthoclase, a potassium feldspar. Feldspars are the most abundant mineral group in Earth\u2019s crust and commonly show two cleavage directions near 90\u00B0. Orthoclase is often pink, white, or gray.', uses: 'Ceramics, glass, porcelain, scouring powders, dental products', funFact: 'The name feldspar comes from the German words for "field" and "splinter." Moonstone and labradorite are feldspar gemstones!', occurrence: 'Common in granite, rhyolite, gneiss, pegmatites, and many other igneous and metamorphic rocks worldwide.' },

            { id: 'mica', label: t('stem.rocks.mica_muscovite'), hardness: 2.5, density: 2.82, streak: 'White', luster: 'Pearly/Vitreous', crystal: 'Monoclinic', habit: 'micaceous', color: '#c9b380', formula: 'KAl\u2082(Si\u2083Al)O\u2081\u2080(OH)\u2082', desc: 'Sheet silicate that peels into thin, flexible, transparent sheets. The "sparkly" mineral in rocks. Two common types: muscovite (light/clear) and biotite (dark/black). Perfect basal cleavage produces incredibly thin layers.', uses: 'Electrical insulation, cosmetics (shimmer), paint filler, window material (historically)', funFact: 'Before glass windows were common, thin sheets of muscovite mica were used as window panes in medieval Russia, hence "Muscovy glass" \u2192 muscovite!', occurrence: 'Common in granites, schists, pegmatites. Major deposits in India, Brazil, Russia, and the USA.' },

            { id: 'biotite', label: t('stem.rocks.biotite'), hardness: 2.75, density: 3.0, streak: 'White', luster: 'Vitreous/Pearly', crystal: 'Monoclinic', color: '#3f2d18', formula: 'K(Mg,Fe)\u2083AlSi\u2083O\u2081\u2080(OH,F)\u2082', desc: 'The dark mica. It peels into flexible sheets exactly as muscovite does, and shares its hardness, its white streak and its one perfect cleavage, but iron and magnesium in the structure make it brown to black instead of silvery. In a granite the black flakes are biotite and the pale ones are muscovite.', uses: 'Mainly a rock-forming mineral rather than an ore; used in potassium-argon dating and as a filler', funFact: 'Biotite is a favourite mineral for dating rocks. It takes potassium into its structure and then holds on to the argon that potassium decays into, so a single flake records when its rock last cooled.', occurrence: 'Granites, schists and gneisses worldwide. Most coarse-grained igneous and metamorphic rocks contain some.' },

            { id: 'calcite', label: t('stem.rocks.calcite'), hardness: 3, density: 2.71, streak: 'White', luster: 'Vitreous', crystal: 'Trigonal (Rhombohedral)', color: '#efe9dc', formula: 'CaCO\u2083', desc: 'The primary mineral in limestone and marble. Shows perfect rhombohedral cleavage, always breaks into parallelogram-shaped pieces. Fizzes vigorously when dilute acid is applied. Some varieties show double refraction (text appears doubled through clear crystals).', uses: 'Cement/concrete, lime production, optical instruments, antacid tablets (Tums)', funFact: 'Iceland spar (transparent calcite) creates double images! Vikings may have used it as a "sunstone" to navigate on cloudy days by detecting polarized skylight.', occurrence: 'Limestone caves (stalactites/stalagmites), coral reefs, chalk cliffs, marble deposits worldwide.' },

            { id: 'malachite', label: t('stem.rocks.malachite'), hardness: 3.75, density: 3.9, streak: 'Green', luster: 'Silky/Dull', crystal: 'Monoclinic', color: '#1f7a4d', formula: 'Cu\u2082CO\u2083(OH)\u2082', desc: 'A copper carbonate, and one of the few minerals whose powder is as green as the specimen. It usually grows as banded, kidney-shaped masses rather than crystals, and it fizzes in dilute acid because it IS a carbonate. Where you find it, copper ore is usually nearby.', uses: 'Copper ore, gemstone and carving stone, historic green pigment', funFact: 'Ground malachite was the green pigment in ancient Egyptian eye paint and in medieval European paintings, long before anyone knew it was a copper ore.', occurrence: 'The oxidised upper zone of copper deposits. Famous from the Urals, Katanga in the Democratic Republic of the Congo, and Bisbee in Arizona.' },

            { id: 'azurite', label: t('stem.rocks.azurite'), hardness: 3.75, density: 3.77, streak: 'Pale blue', luster: 'Vitreous', crystal: 'Monoclinic', color: '#1d4ed8', formula: 'Cu\u2083(CO\u2083)\u2082(OH)\u2082', desc: 'The blue copper carbonate, and malachite\u2019s constant companion: the two form in the same place, and azurite slowly turns INTO malachite as it takes up water. Like malachite it fizzes in dilute acid. Deep blue specimen, pale blue powder.', uses: 'Copper ore, gemstone, historic blue pigment', funFact: 'Blue skies in old European paintings sometimes look green today, because the azurite pigment altered to malachite on the canvas over centuries.', occurrence: 'The same oxidised copper zones as malachite, usually with it. Chessy in France gave azurite its old name, chessylite.' },

            { id: 'halite', label: t('stem.rocks.halite'), hardness: 2.5, density: 2.17, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#eceff3', formula: 'NaCl', desc: 'Common table salt forms perfect cubic crystals. Never taste an unknown mineral specimen; it may be contaminated or unsafe. Halite forms when shallow seas or salt lakes evaporate and can be colorless, white, pink, blue, or red because of impurities.', uses: 'Food seasoning/preservation, road de-icing, chemical industry, water softening', funFact: 'The English word "salary" comes through Latin salarium, an allowance associated with buying salt—not evidence that Roman soldiers were paid in salt.', occurrence: 'Evaporite deposits in arid regions: Great Salt Lake, Dead Sea, salt mines in Poland (Wieliczka), Germany, and Louisiana.' },

            { id: 'pyrite', label: t('stem.rocks.pyrite'), hardness: 6.5, density: 5.01, streak: 'Greenish-black', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#c9a227', formula: 'FeS\u2082', desc: 'Iron sulfide with a brilliant metallic brass-yellow color. Forms perfect cubes, pyritohedrons, and octahedrons. Produces sparks when struck against steel (name from Greek "pyr" = fire). Commonly mistaken for gold but much harder and lighter.', uses: 'Sulfuric acid production, electronics (early crystal radios), decorative stone, gold indicator mineral', funFact: 'Called "fool\u2019s gold" because miners confused it with real gold. You can tell them apart: gold is soft (scratches with a knife), pyrite is hard. Gold leaves a yellow streak, pyrite leaves a greenish-black streak!', occurrence: 'Found in all rock types. Often found alongside real gold deposits! Common in coal, hydrothermal veins, and sedimentary rocks.' },

            { id: 'talc', label: t('stem.rocks.talc'), hardness: 1, density: 2.75, streak: 'White', luster: 'Pearly/Waxy', crystal: 'Monoclinic', color: '#dcded2', formula: 'Mg\u2083Si\u2084O\u2081\u2080(OH)\u2082', desc: 'The softest known mineral, number 1 on the Mohs scale. Can be scratched with a fingernail! Has a soapy, greasy feel. Forms flat, foliated masses. Color ranges from white to pale green to gray. Metamorphic mineral formed from magnesium-rich rocks.', uses: 'Talcum powder, ceramics, paint filler, paper coating, cosmetics', funFact: 'Soapstone (used for carving and countertops) is a rock made mostly of talc. It was used by ancient cultures worldwide to carve cooking vessels because it retains heat well!', occurrence: 'Metamorphic rocks (ultramafic environments). Major deposits in China, India, USA (Vermont), France, and Brazil.' },

            { id: 'graphite', label: t('stem.rocks.graphite'), hardness: 1.5, density: 2.23, streak: 'Black', luster: 'Metallic/Earthy', crystal: 'Hexagonal', color: '#3f3f46', formula: 'C', desc: 'Pure carbon, and the softest common mineral after talc. It is greasy to the touch, marks paper, and conducts electricity, which almost no other non-metal mineral does. Diamond is the same element: everything different about the two comes from how the atoms are joined.', uses: 'Pencil "lead", dry lubricant, crucibles, electrodes, lithium-ion battery anodes', funFact: 'Graphite and diamond are both pure carbon, so the same element gives you Mohs 1 to 2 and Mohs 10. Arrangement, not composition, is doing all of the work.', occurrence: 'Metamorphosed carbon-rich sediments; marbles and schists. Major sources in China, Mozambique, Madagascar and Sri Lanka.' },

            { id: 'diamond', label: t('stem.rocks.diamond'), hardness: 10, density: 3.52, streak: 'None (too hard)', luster: 'Adamantine', crystal: 'Cubic (Isometric)', color: '#f0f9ff', formula: 'C', desc: 'Pure crystallized carbon, the hardest natural substance on Earth. Forms deep in the mantle (150+ km below surface) under extreme pressure and temperature. Brought to surface by violent volcanic eruptions in kimberlite pipes. High refractive index creates "fire" (rainbow flashes).', uses: 'Gemstones, cutting/grinding tools, drill bits, thermal conductors, optical windows', funFact: 'Diamond and graphite (pencil lead) are both pure carbon! The only difference is how the carbon atoms are arranged. Diamond is the hardest mineral; graphite is one of the softest. Same atoms, completely different properties!', occurrence: 'Kimberlite pipes in South Africa, Russia, Australia, Canada, Botswana. Also found in river gravels (alluvial deposits).' },

            { id: 'magnetite', label: t('stem.rocks.magnetite'), hardness: 5.5, density: 5.18, streak: 'Black', luster: 'Metallic/Submetallic', crystal: 'Cubic (Isometric)', habit: 'octahedral', color: '#1f2937', formula: 'Fe\u2083O\u2084', desc: 'The most magnetic naturally occurring mineral on Earth. Strongly attracted to magnets and can itself act as a natural magnet ("lodestone"). Black, heavy, and opaque. Important iron ore mineral. Octahedral crystal habit.', uses: 'Iron/steel production, magnetic recording media, heavy concrete, water purification', funFact: 'Lodestone (naturally magnetized magnetite) was the first compass! Ancient Chinese and Greek navigators used floating lodestones to find north. Magnetite crystals have even been found in the brains of pigeons and sea turtles, helping them navigate!', occurrence: 'Igneous and metamorphic rocks worldwide. Major deposits in Sweden (Kiruna), Australia, Brazil, South Africa, and Minnesota (USA).' },

            { id: 'hematite', label: t('stem.rocks.hematite'), hardness: 5.5, density: 5.26, streak: 'Red-brown', luster: 'Metallic/Earthy', crystal: 'Trigonal', color: '#991b1b', formula: 'Fe\u2082O\u2083', desc: 'The most important iron ore mineral. Name from Greek "haima" (blood) due to its red streak. Can appear metallic silver-gray (specular hematite) or earthy red-brown. Always produces a distinctive red-brown streak regardless of surface color.', uses: 'Iron/steel production (primary ore), pigment (red ochre), polishing compound (jeweler\u2019s rouge), radiation shielding', funFact: 'Mars looks red because its surface materials contain oxidized iron minerals. Hematite occurs on Mars, but newer evidence suggests ferrihydrite may also be an important source of the planet\u2019s red dust. Hematite was also used as a pigment by prehistoric humans.', occurrence: 'Banded iron formations, volcanic rocks, red soils. Lake Superior region (USA), Minas Gerais (Brazil), Pilbara (Australia), Mars!' },

            { id: 'garnet', label: t('stem.rocks.garnet'), hardness: 7, density: 4.32, streak: 'White', luster: 'Vitreous/Resinous', crystal: 'Cubic (Isometric)', habit: 'dodecahedral', color: '#7f1d1d', formula: 'Complex silicates (e.g., Fe\u2083Al\u2082Si\u2083O\u2081\u2082)', desc: 'A group of silicate minerals known for their beautiful dodecahedral crystals (12-sided). Most commonly deep red (almandine), but can be green (tsavorite), orange (spessartine), or even color-changing. Very hard and durable. Excellent for identifying metamorphic grade.', uses: 'Abrasive blasting (sandpaper, waterjet cutting), gemstones, water filtration, indicator mineral in geology', funFact: 'Garnets grow in metamorphic rocks and their size indicates how much heat and pressure the rock experienced. Geologists use garnet composition like a geological thermometer! Some rare garnets change color from blue-green in daylight to purple under incandescent light.', occurrence: 'Schists, gneisses, contact metamorphic zones. Major gem deposits in India, Sri Lanka, Tanzania, Madagascar, and Idaho (USA).' },

            { id: 'olivine', label: t('stem.rocks.olivine'), hardness: 6.5, density: 3.32, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', color: '#4d7c0f', formula: '(Mg,Fe)\u2082SiO\u2084', desc: 'Olive-green mineral abundant in the upper mantle of Earth. One of the first minerals to crystallize from cooling magma. Forms small glassy grains in basalt. Gem variety is called peridot. Weathers quickly at the surface, which is why it is rare in sedimentary rocks.', uses: 'Gemstone (peridot), refractory bricks, CO\u2082 capture research, foundry sand', funFact: 'Olivine is a dominant mineral in much of Earth\'s upper mantle, but bridgmanite deeper in the mantle is Earth\'s most abundant mineral overall. The green sand beaches of Hawaii (Papak\u014Dlea Beach) are made of tiny olivine crystals eroded from volcanic rock!', occurrence: 'Basalt, peridotite, meteorites. Hawaii, Canary Islands, Pakistan (peridot gems), mantle xenoliths worldwide.' },

            { id: 'fluorite', label: t('stem.rocks.fluorite'), hardness: 4, density: 3.18, streak: 'White', luster: 'Vitreous', crystal: 'Cubic (Isometric)', color: '#7c3aed', formula: 'CaF\u2082', desc: 'Known as the "most colorful mineral in the world", comes in virtually every color: purple, green, blue, yellow, pink, and even colorless. Forms perfect cubic and octahedral crystals. Often fluorescent under UV light (the word "fluorescence" comes from fluorite!). Four directions of perfect cleavage.', uses: 'Steelmaking flux, hydrofluoric acid production, optical lenses, gemstone, decorative carvings', funFact: 'Fluorite literally invented the word "fluorescence"! In 1852, George Stokes described the glow of fluorite under UV light and coined the term from the name of the mineral. The element fluorine is also named after fluorite!', occurrence: 'Hydrothermal veins, limestone cavities. Major deposits in China, Mexico, South Africa, Derbyshire (England, "Blue John"), and Illinois (USA).' },

            { id: 'galena', label: t('stem.rocks.galena'), hardness: 2.5, density: 7.5, streak: 'Lead-gray', luster: 'Metallic', crystal: 'Cubic (Isometric)', color: '#94a3b8', formula: 'PbS', desc: 'Primary ore of lead. Very dense (heavy for its size) with perfect cubic cleavage, so it cleaves into tiny cubes. Bright metallic silver color when fresh, tarnishes to dull gray. Lead-gray streak. Often found with silver as an impurity, making it a source of silver too.', uses: 'Lead production, ammunition, batteries, radiation shielding, early radio crystal detectors', funFact: 'Before transistors were invented, galena crystals were used in "crystal radio" sets! A thin wire ("cat\u2019s whisker") touching a galena crystal could detect radio signals without any battery or electricity. Galena was also used by ancient Egyptians as kohl eyeliner!', occurrence: 'Hydrothermal veins, limestone replacement deposits. Missouri (USA, largest lead deposit), Broken Hill (Australia), Germany, Mexico.' },

            { id: 'apatite', label: t('stem.rocks.apatite'), hardness: 5, density: 3.19, streak: 'White', luster: 'Vitreous', crystal: 'Hexagonal', color: '#6fbfa0', formula: 'Ca\u2085(PO\u2084)\u2083(F,Cl,OH)', desc: 'The reference mineral for Mohs 5, and the mineral your bones and tooth enamel are built from. Grows as six-sided prisms, most often green or blue-green, and is soft enough to be scratched by a glass plate but not by a copper coin.', uses: 'Phosphate fertilizer, phosphoric acid, gemstones', funFact: 'Tooth enamel is a form of apatite, so the hardest tissue in your body sits at 5 on the very scale that runs from talc to diamond.', occurrence: 'An accessory mineral in almost every igneous rock, and the main ore of phosphorus. Major deposits in Morocco, the Kola Peninsula in Russia, and Florida.' },

            { id: 'gypsum', label: t('stem.rocks.gypsum'), hardness: 2, density: 2.32, streak: 'White', luster: 'Vitreous/Silky/Pearly', crystal: 'Monoclinic', color: '#efe9e0', formula: 'CaSO\u2084\u00B72H\u2082O', desc: 'A very soft evaporite mineral (can be scratched with a fingernail). Forms in a variety of habits: tabular crystals (selenite), fibrous masses (satin spar), and granular masses (alabaster). Transparent selenite crystals can be enormous. Contains water in its crystal structure.', uses: 'Drywall/plasterboard, plaster of Paris, cement, fertilizer, alabaster carvings', funFact: 'The Naica Mine in Mexico contains selenite gypsum crystals up to 12 meters (39 feet) long and weighing 55 tons, the largest crystals ever discovered on Earth! The cave is so hot (58\u00B0C/136\u00B0F) that humans can only survive inside for about 10 minutes!', occurrence: 'Evaporite deposits, desert roses (sand-included crystals), cave formations. Major deposits in USA, Mexico, Spain, Italy, and Nova Scotia.' },

            { id: 'sulfur', label: t('stem.rocks.sulfur', 'Sulfur'), hardness: 2, density: 2.07, streak: 'White-yellow', luster: 'Resinous/Adamantine', crystal: 'Orthorhombic', color: '#eab308', formula: 'S', desc: 'Native element with a distinctive bright yellow color. Very light and brittle, with a low melting point (115\u00B0C). Burning sulfur makes pungent sulfur dioxide gas; the rotten-egg odor at some volcanic sites comes from hydrogen sulfide, not sulfur itself. Associated with volcanic activity and hot springs. One of the few minerals that occurs as a native element.', uses: 'Sulfuric acid (most widely used chemical), gunpowder, rubber vulcanization, fungicides, matches', funFact: 'Sulfur was known to ancient civilizations as "brimstone" (burning stone). It is mentioned in the Bible and in the Odyssey by Homer! The moon Io of Jupiter is covered in sulfur from its 400+ active volcanoes, giving it a bright yellow-orange appearance.', occurrence: 'Volcanic fumaroles, hot springs, evaporite domes (Gulf Coast USA), Sicily, Japan, Indonesia.' },

            { id: 'corundum', label: t('stem.rocks.corundum'), hardness: 9, density: 4.0, streak: 'White', luster: 'Adamantine/Vitreous', crystal: 'Trigonal', color: '#1e40af', formula: 'Al\u2082O\u2083', desc: 'Second hardest natural mineral after diamond. Pure corundum is colorless, but trace impurities create spectacular gemstones: chromium makes ruby (red), iron and titanium make sapphire (blue). Can occur in many other colors too. Extremely durable and resistant to chemical weathering.', uses: 'Gemstones (ruby/sapphire), watch bearings, abrasive (emery), laser rods, sandpaper', funFact: 'Ruby and sapphire are the SAME mineral! The only difference is trace element impurities, where 0.01% chromium makes a ruby, while iron+titanium make a sapphire. A "padparadscha" sapphire (pink-orange) is among the rarest gems in the world!', occurrence: 'Metamorphic and igneous rocks. Major ruby deposits in Myanmar, Mozambique. Sapphires from Kashmir, Sri Lanka, Montana (USA), Australia.' },

            { id: 'topaz', label: t('stem.rocks.topaz'), hardness: 8, density: 3.53, streak: 'White', luster: 'Vitreous', crystal: 'Orthorhombic', habit: 'striated', color: '#f97316', formula: 'Al\u2082SiO\u2084(F,OH)\u2082', desc: 'Hard silicate mineral prized as a gemstone. Naturally colorless, yellow, orange, or blue (most blue topaz on the market is heat-treated). Contains fluorine and hydroxyl in its structure. Forms beautiful prismatic crystals with vertical striations. Perfect basal cleavage.', uses: 'Gemstones, Mohs hardness reference (#8), decorative carvings, optical components', funFact: 'The 6.2 kg (31,000-carat) El-Dorado Topaz from Brazil is one of the world\'s largest faceted topazes; it was cut from a much heavier rough crystal. Imperial topaz (a rare orange-pink variety from Ouro Preto, Brazil) is among the most valuable colored gemstones.', occurrence: 'Granite pegmatites, rhyolite cavities, alluvial deposits. Major sources: Brazil (Minas Gerais), Pakistan, Russia (Ural Mts), Utah (USA).' }

          ].map(function (m) {
            // Same gap the specimen card had: `label` was translated and every
            // line of prose underneath it was not, so the mineral card read as
            // English in every language. Keyed by id, so rewording the copy
            // cannot orphan the translations.
            return Object.assign({}, m, {
              desc: __alloT('stem.rocks.mdesc_' + m.id, m.desc),
              uses: __alloT('stem.rocks.muses_' + m.id, m.uses),
              funFact: __alloT('stem.rocks.mfact_' + m.id, m.funFact),
              occurrence: __alloT('stem.rocks.mwhere_' + m.id, m.occurrence)
            });
          });

          // ── Quiz bank ──

          const QUIZ_BANK = [
            // ── Six specimens the tool teaches in full but never assessed ──
            // breccia, siltstone, apatite, graphite, malachite and azurite were
            // added to the catalogue in later rounds — art, thin section, unit
            // cell and all — and the quiz bank was never extended to match. Each
            // question below asks for the DISCRIMINATOR the specimen's own card
            // teaches, and every distractor is a genuine look-alike rather than
            // a throwaway, so a wrong answer is worth reading.
            {
              q: __alloT('stem.rocks.q_breccia_vs_conglomerate', 'Breccia and conglomerate have the same grain sizes and the same cement. What separates them?'),
              a: __alloT('stem.rocks.qopt_breccia_corners_sharp', 'The fragments in breccia still have sharp corners'),
              options: [
                __alloT('stem.rocks.qopt_breccia_corners_sharp', 'The fragments in breccia still have sharp corners'),
                __alloT('stem.rocks.qopt_breccia_bigger_grains', 'Breccia has much larger grains'),
                __alloT('stem.rocks.qopt_breccia_no_cement', 'Breccia has no cement holding it together'),
                __alloT('stem.rocks.qopt_breccia_metamorphic', 'Breccia is metamorphic and conglomerate is sedimentary')
              ],
              concept: 'Sedimentary',
              wrongFeedback: [
                __alloT('stem.rocks.correct_breccia_corners', 'Correct! Rounding takes distance, so sharp corners mean the pieces were buried close to where they broke — a scree slope or a fault zone.'),
                __alloT('stem.rocks.incorrect_breccia_bigger_grains', 'Incorrect. Both hold large fragments in a finer matrix; size is what they share, not what separates them.'),
                __alloT('stem.rocks.incorrect_breccia_no_cement', 'Incorrect. Both are cemented clastic rocks. Without cement you have loose scree, not a rock.'),
                __alloT('stem.rocks.incorrect_breccia_metamorphic', 'Incorrect. Both are sedimentary. Neither has been recrystallized by heat and pressure.')
              ]
            },
            {
              q: __alloT('stem.rocks.q_gritty_but_not_splitting', 'A fine-grained rock feels gritty between your teeth but will not split into sheets. What is it?'),
              a: t('stem.rocks.siltstone'),
              options: [t('stem.rocks.siltstone'), t('stem.rocks.shale'), t('stem.rocks.sandstone'), t('stem.rocks.chalk')],
              concept: 'Sedimentary',
              wrongFeedback: [
                __alloT('stem.rocks.correct_siltstone_grit', 'Correct! Silt is the size between sand and clay: too fine to pick out by eye, coarse enough to feel, and it does not split the way shale does.'),
                __alloT('stem.rocks.incorrect_siltstone_shale', 'Incorrect. Shale is finer still and its whole signature is splitting into thin sheets.'),
                __alloT('stem.rocks.incorrect_siltstone_sandstone', 'Incorrect. You can see sandstone grains without a lens; silt grains you can only feel.'),
                __alloT('stem.rocks.incorrect_siltstone_chalk', 'Incorrect. Chalk is soft carbonate made of plankton shells, and it is not gritty.')
              ]
            },
            {
              q: __alloT('stem.rocks.q_mohs_five_tooth_enamel', 'Which mineral is the Mohs 5 reference, and the material your tooth enamel is built from?'),
              a: t('stem.rocks.apatite'),
              options: [t('stem.rocks.apatite'), t('stem.rocks.fluorite'), t('stem.rocks.calcite'), t('stem.rocks.quartz')],
              concept: 'Hardness',
              wrongFeedback: [
                __alloT('stem.rocks.correct_apatite_enamel', 'Correct! Apatite is Mohs 5, so the hardest tissue in your body sits on the very scale that runs from talc to diamond.'),
                __alloT('stem.rocks.incorrect_apatite_fluorite', 'Incorrect. Fluorite is the step below, at Mohs 4.'),
                __alloT('stem.rocks.incorrect_apatite_calcite', 'Incorrect. Calcite is Mohs 3 — a copper coin will scratch it.'),
                __alloT('stem.rocks.incorrect_apatite_quartz', 'Incorrect. Quartz is Mohs 7, hard enough to scratch a steel nail.')
              ]
            },
            {
              q: __alloT('stem.rocks.q_graphite_diamond_same_element', 'Graphite is Mohs 1 to 2 and diamond is Mohs 10, yet both are pure carbon. What accounts for the difference?'),
              a: __alloT('stem.rocks.qopt_atoms_bonded_differently', 'The atoms are bonded in completely different arrangements'),
              options: [
                __alloT('stem.rocks.qopt_atoms_bonded_differently', 'The atoms are bonded in completely different arrangements'),
                __alloT('stem.rocks.qopt_different_elements', 'They are made of different elements'),
                __alloT('stem.rocks.qopt_diamond_more_impurities', 'Diamond contains more impurities'),
                __alloT('stem.rocks.qopt_graphite_is_younger', 'Graphite formed more recently')
              ],
              concept: 'Crystallization',
              wrongFeedback: [
                __alloT('stem.rocks.correct_graphite_arrangement', 'Correct! Diamond bonds every carbon to four others in a rigid net; graphite bonds each to three in sheets that barely hold to one another. Arrangement, not composition.'),
                __alloT('stem.rocks.incorrect_graphite_elements', 'Incorrect. Both are pure carbon — that is exactly what makes the comparison worth making.'),
                __alloT('stem.rocks.incorrect_graphite_impurities', 'Incorrect. Impurities colour a diamond; they do not explain a nine-step gap in hardness.'),
                __alloT('stem.rocks.incorrect_graphite_age', 'Incorrect. Age does not set hardness. A mineral is as hard as its bonds, whenever it grew.')
              ]
            },
            {
              q: __alloT('stem.rocks.q_green_mineral_fizzes', 'A green mineral fizzes in dilute acid, and its powder is green as well. What is it?'),
              a: t('stem.rocks.malachite'),
              options: [t('stem.rocks.malachite'), t('stem.rocks.olivine'), t('stem.rocks.fluorite'), t('stem.rocks.biotite')],
              concept: 'Streak',
              wrongFeedback: [
                __alloT('stem.rocks.correct_malachite_green_powder', 'Correct! Malachite is a copper carbonate, so it fizzes — and it is one of the few minerals whose powder is as green as the specimen.'),
                __alloT('stem.rocks.incorrect_malachite_olivine', 'Incorrect. Olivine is green but it is a silicate, so it does not fizz, and its streak is white.'),
                __alloT('stem.rocks.incorrect_malachite_fluorite', 'Incorrect. Fluorite comes in green, but it is a fluoride and its streak is white.'),
                __alloT('stem.rocks.incorrect_malachite_biotite', 'Incorrect. Biotite is a dark mica with a white streak, and it does not react with acid.')
              ]
            },
            {
              q: __alloT('stem.rocks.q_blue_mineral_becomes_malachite', 'Which deep blue mineral slowly turns INTO malachite as it takes up water?'),
              a: t('stem.rocks.azurite'),
              options: [t('stem.rocks.azurite'), t('stem.rocks.fluorite'), t('stem.rocks.corundum'), t('stem.rocks.halite')],
              concept: 'Streak',
              wrongFeedback: [
                __alloT('stem.rocks.correct_azurite_to_malachite', 'Correct! Azurite and malachite are the same copper carbonate in different proportions, which is why blue skies in old paintings sometimes look green today.'),
                __alloT('stem.rocks.incorrect_azurite_fluorite', 'Incorrect. Fluorite can be blue, but it is stable and does not convert to a copper carbonate.'),
                __alloT('stem.rocks.incorrect_azurite_corundum', 'Incorrect. Blue corundum is sapphire, one of the most durable minerals there is.'),
                __alloT('stem.rocks.incorrect_azurite_halite', 'Incorrect. Halite can look blue, but it is a salt: it dissolves in water rather than altering to malachite.')
              ]
            },
            {
              q: __alloT('stem.rocks.which_rock_type_forms_from_cooled_magma', 'Which rock type forms from cooled magma?'),
              a: t('stem.rocks.igneous'),
              options: [t('stem.rocks.igneous'), t('stem.rocks.sedimentary'), t('stem.rocks.metamorphic'), __alloT('stem.rocks.qopt_organic', 'Organic')],
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
              a: __alloT('stem.rocks.qopt_compaction_and_cementation', 'Compaction and cementation'),
              options: [__alloT('stem.rocks.qopt_compaction_and_cementation', 'Compaction and cementation'), __alloT('stem.rocks.qopt_melting_and_recrystallizing', 'Melting and recrystallizing'), __alloT('stem.rocks.ls_cooling', 'Cooling'), __alloT('stem.rocks.qopt_erosion', 'Erosion')],
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
              a: __alloT('stem.rocks.qopt_very_quickly', 'Very quickly'),
              options: [__alloT('stem.rocks.qopt_very_quickly', 'Very quickly'), __alloT('stem.rocks.qopt_extremely_slowly', 'Extremely slowly'), __alloT('stem.rocks.qopt_underground', 'Underground'), __alloT('stem.rocks.qopt_underwater', 'Underwater')],
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
              options: [t('stem.rocks.sedimentary'), t('stem.rocks.igneous'), t('stem.rocks.metamorphic'), __alloT('stem.rocks.qopt_mineral', 'Mineral')],
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
              a: __alloT('stem.rocks.qopt_fools_gold', 'Fool\'s gold'),
              options: [__alloT('stem.rocks.qopt_fools_gold', 'Fool\'s gold'), __alloT('stem.rocks.qopt_white_gold', 'White gold'), __alloT('stem.rocks.qopt_rose_gold', 'Rose gold'), __alloT('stem.rocks.qopt_black_gold', 'Black gold')],
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
              a: __alloT('stem.rocks.wb_coverage_acid', 'Acid'),
              options: [__alloT('stem.rocks.wb_coverage_acid', 'Acid'), t('stem.chem_balance.water'), __alloT('stem.rocks.qopt_salt', 'Salt'), __alloT('stem.rocks.qopt_oil', 'Oil')],
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
              options: [t('stem.rocks.granite'), t('stem.rocks.basalt'), __alloT('stem.rocks.gabbro', 'Gabbro'), t('stem.rocks.diorite')],
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
              q: __alloT('stem.rocks.what_gives_mars_its_red_color', 'Which iron-oxide mineral has been identified on Mars?'),
              a: __alloT('stem.rocks.qopt_hematite_iron_oxide', 'Hematite (iron oxide)'),
              options: [__alloT('stem.rocks.qopt_hematite_iron_oxide', 'Hematite (iron oxide)'), __alloT('stem.rocks.qopt_pyrite_iron_sulfide', 'Pyrite (iron sulfide)'), __alloT('stem.rocks.qopt_galena_lead_sulfide', 'Galena (lead sulfide)'), __alloT('stem.rocks.qopt_halite_sodium_chloride', 'Halite (sodium chloride)')],
              concept: 'Streak',
              wrongFeedback: [
                __alloT('stem.rocks.correct_hematite_dust_covers_the_martian_surface_giving', 'Correct! Hematite is one iron-oxide mineral identified on Mars; the planet\u2019s overall red color comes from oxidized iron minerals.'),
                __alloT('stem.rocks.incorrect_general_rust_is_iron_oxide_but_hematite', 'Incorrect. Pyrite is an iron sulfide, not the iron oxide named in this question.'),
                __alloT('stem.rocks.incorrect_the_sand_is_red_due_to_hematite', 'Incorrect. Galena is lead sulfide, not an iron oxide.'),
                __alloT('stem.rocks.incorrect_volcanic_dust_on_mars_is_not_the', 'Incorrect. Halite is sodium chloride, not an iron oxide.')
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
              a: __alloT('stem.rocks.qopt_microscopic_plankton', 'Microscopic plankton'),
              options: [__alloT('stem.rocks.qopt_microscopic_plankton', 'Microscopic plankton'), __alloT('stem.rocks.qopt_snails_and_other_molluscs', 'Snails and other molluscs'), __alloT('stem.rocks.qopt_clams', 'Clams'), __alloT('stem.rocks.qopt_coral', 'Coral')],
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
              a: __alloT('stem.rocks.qopt_salt_and_pepper', 'Salt and pepper'),
              options: [__alloT('stem.rocks.qopt_salt_and_pepper', 'Salt and pepper'), __alloT('stem.rocks.qopt_solid_black_throughout', 'Solid black throughout'), __alloT('stem.rocks.qopt_striped', 'Striped'), __alloT('stem.rocks.qopt_glassy', 'Glassy')],
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
              options: [t('stem.rocks.olivine'), __alloT('stem.rocks.qopt_emerald', 'Emerald'), __alloT('stem.rocks.qopt_jade', 'Jade'), __alloT('stem.rocks.qopt_green_glass', 'Green glass')],
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
              a: __alloT('stem.rocks.qopt_the_colosseum', 'The Colosseum'),
              options: [__alloT('stem.rocks.qopt_the_colosseum', 'The Colosseum'), __alloT('stem.rocks.qopt_the_great_pyramids', 'The Great Pyramids'), __alloT('stem.rocks.qopt_stonehenge', 'Stonehenge'), __alloT('stem.rocks.qopt_taj_mahal', 'Taj Mahal')],
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
              a: __alloT('stem.rocks.qopt_aligned_mica_flakes', 'Aligned mica flakes'),
              options: [__alloT('stem.rocks.qopt_aligned_mica_flakes', 'Aligned mica flakes'), __alloT('stem.rocks.qopt_embedded_quartz_crystals', 'Embedded quartz crystals'), __alloT('stem.rocks.qopt_gold_inclusions', 'Gold inclusions'), __alloT('stem.rocks.qopt_diamond_dust', 'Diamond dust')],
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
              a: __alloT('stem.rocks.qopt_piezoelectric_effect', 'Piezoelectric effect'),
              options: [__alloT('stem.rocks.qopt_piezoelectric_effect', 'Piezoelectric effect'), __alloT('stem.rocks.qopt_a_magnetic_field_coil', 'A magnetic field coil'), __alloT('stem.rocks.qopt_battery_power', 'Battery power'), __alloT('stem.rocks.qopt_high_density', 'High density')],
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
              a: __alloT('stem.rocks.qopt_naica_mine_mexico', 'Naica Mine, Mexico'),
              options: [__alloT('stem.rocks.qopt_naica_mine_mexico', 'Naica Mine, Mexico'), __alloT('stem.rocks.qopt_mount_everest_nepal', 'Mount Everest, Nepal'), __alloT('stem.rocks.qopt_grand_canyon', 'Grand Canyon'), __alloT('stem.rocks.qopt_sahara_desert', 'Sahara Desert')],
              concept: 'Crystallization',
              wrongFeedback: [
                __alloT('stem.rocks.correct_gypsum_crystals_up_to_12_meters_long', 'Correct! Gypsum crystals up to 12 meters long grow in the extreme heat of the Naica Mine.'),
                __alloT('stem.rocks.incorrect_mount_everest_does_not_host_giant_caves', 'Incorrect. Mount Everest does not host giant caves of giant crystals.'),
                __alloT('stem.rocks.incorrect_the_grand_canyon_features_stratified_sedimentary_rocks', 'Incorrect. The Grand Canyon features stratified sedimentary rocks.'),
                __alloT('stem.rocks.incorrect_the_sahara_desert_is_sand_covered_rather', 'Incorrect. The Sahara Desert is sand-covered rather than hosting giant gypsum crystal caves.')
              ]
            },
            {
              q: __alloT('stem.rocks.the_word_salary_comes_from_the_latin_word', 'What was the Latin salarium associated with?'),
              a: __alloT('stem.rocks.qopt_an_allowance_connected_with_salt', 'An allowance connected with salt'),
              options: [__alloT('stem.rocks.qopt_an_allowance_connected_with_salt', 'An allowance connected with salt'), __alloT('stem.rocks.qopt_a_payment_made_in_silver_coin_only', 'A payment made in silver coin only'), __alloT('stem.rocks.qopt_a_gold_coin', 'A gold coin'), __alloT('stem.rocks.qopt_a_stone_trading_fee', 'A stone-trading fee')],
              concept: 'Hardness',
              wrongFeedback: [
                __alloT('stem.rocks.correct_roman_soldiers_were_sometimes_paid_in_salt', 'Correct! Latin salarium was an allowance associated with salt—not evidence that Roman soldiers were literally paid in salt.'),
                __alloT('stem.rocks.incorrect_silver_was_money_but_not_the_root', 'Incorrect. Silver was money but not the root of salary.'),
                __alloT('stem.rocks.incorrect_gold_was_money_but_not_the_root', 'Incorrect. Gold was money but not the root of salary.'),
                __alloT('stem.rocks.incorrect_stone_was_not_the_root_of_salary', 'Incorrect. Stone was not the root of salary.')
              ]
            },
            {
              q: __alloT('stem.rocks.andesite_is_named_after', 'Andesite is named after...'),
              a: __alloT('stem.rocks.qopt_the_andes_mountains', 'The Andes Mountains'),
              options: [__alloT('stem.rocks.qopt_the_andes_mountains', 'The Andes Mountains'), __alloT('stem.rocks.qopt_andean_people', 'Andean people'), __alloT('stem.rocks.qopt_a_scientist_named_ande', 'A scientist named Ande'), __alloT('stem.rocks.qopt_an_ancient_city', 'An ancient city')],
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
              a: __alloT('stem.rocks.qopt_volcanic_ash', 'Volcanic ash'),
              options: [__alloT('stem.rocks.qopt_volcanic_ash', 'Volcanic ash'), __alloT('stem.rocks.qopt_river_sand_and_silt', 'River sand and silt'), __alloT('stem.rocks.qopt_coral_reef', 'Coral reef'), __alloT('stem.rocks.qopt_glacier_ice', 'Glacier ice')],
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
              a: __alloT('stem.rocks.qopt_12_dodecahedral', '12 (dodecahedral)'),
              options: [__alloT('stem.rocks.qopt_12_dodecahedral', '12 (dodecahedral)'), __alloT('stem.rocks.qopt_4_tetrahedral', '4 (tetrahedral)'), __alloT('stem.rocks.qopt_6_cubic', '6 (cubic)'), __alloT('stem.rocks.qopt_8_octahedral_form', '8 (octahedral form)')],
              concept: 'Crystallization',
              wrongFeedback: [
                __alloT('stem.rocks.correct_garnet_crystals_typically_grow_into_12_sided', 'Correct! Garnet crystals typically grow into 12-sided dodecahedrons.'),
                __alloT('stem.rocks.incorrect_tetrahedrons_have_4_sides_not_characteristic_of', 'Incorrect. Tetrahedrons have 4 sides, not characteristic of garnet.'),
                __alloT('stem.rocks.incorrect_cubic_crystals_6_sides_are_typical_of', 'Incorrect. Cubic crystals (6 sides) are typical of halite or pyrite.'),
                __alloT('stem.rocks.incorrect_octahedral_crystals_8_sides_are_typical_of', 'Incorrect. Octahedral crystals (8 sides) are typical of fluorite or diamond.')
              ]
            }
          ];

          // The authored bank put every correct answer FIRST in its options
          // (18 of 18), so the quiz rendered "always pick A". Rotate each
          // question's options deterministically; wrongFeedback is keyed by
          // position, so it rotates in lockstep. Grading compares option TEXT
          // to q.a, so no index remap is needed. Deterministic because this
          // runs on every render.
          QUIZ_BANK.forEach(function (q, i) {
            var len = q.options.length;
            var shift = (i * 7 + 3) % len;
            if (!shift) return;
            q.options = q.options.slice(shift).concat(q.options.slice(0, shift));
            if (Array.isArray(q.wrongFeedback) && q.wrongFeedback.length === len) {
              q.wrongFeedback = q.wrongFeedback.slice(shift).concat(q.wrongFeedback.slice(0, shift));
            }
          });

          const selRock = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;

          const selMineral = d.selectedMineral ? MINERALS.find(m => m.id === d.selectedMineral) : null;

          const quizQ = mode === 'quiz' && QUIZ_BANK[d.quizIdx || 0] ? QUIZ_BANK[d.quizIdx || 0] : null;



          // ── Landscape canvas initialiser ──
          // Re-created each render (it closes over the current upd/ROCKS), but NOT
          // handed to React. It is published into _rocksInitBox and invoked by the
          // identity-stable rocksLandscapeCanvasRef, so the canvas — and its rAF
          // loop, four listeners, ResizeObserver, tick and hover state — survives
          // re-renders instead of being torn down and rebuilt by every upd().

          const landscapeRef = function (canvasEl) {

            if (!canvasEl) return;

            if (canvasEl._rocksInit) return;

            // Zero-size guard: we now initialise once per mount, so a canvas
            // measured before layout would stay blank forever.
            if (!canvasEl.offsetWidth || !canvasEl.offsetHeight) {
              if (typeof requestAnimationFrame === 'function' && !canvasEl._rocksSizeRetry) {
                canvasEl._rocksSizeRetry = requestAnimationFrame(function () {
                  canvasEl._rocksSizeRetry = null;
                  if (canvasEl.isConnected) rocksLandscapeCanvasRef(canvasEl);
                });
              }
              return;
            }

            canvasEl._rocksInit = true;

            // let, not const: the ResizeObserver below must be able to retarget the
            // frame. With W/H frozen at init, a container that changed size after
            // mount (sidebar toggle, rotation, late stylesheet) got a backing store of
            // the new size drawn at the OLD size: the whole scene stretched and the
            // right-hand zone marker fell off the canvas.
            let W = canvasEl.width = canvasEl.offsetWidth * (window.devicePixelRatio || 1);

            let H = canvasEl.height = canvasEl.offsetHeight * (window.devicePixelRatio || 1);

            const ctx = canvasEl.getContext('2d');
            if (!ctx) { canvasEl._rocksInit = false; return; }

            const dpr = window.devicePixelRatio || 1;

            let tick = 0;

            let hoverZone = null;
            let rocksAlive = true;
            let rocksPrefersReduced = false;
            try { rocksPrefersReduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
            // WCAG 2.2.2 wants a way to stop motion for every user, not only for
            // those who set the OS preference, so the control writes a dataset
            // flag and this is read on every frame. A boolean captured when the
            // ref fired could never see the toggle: the ref runs once.
            function rocksMotionReduced() {
              if (rocksPrefersReduced) return true;
              try { return canvasEl.dataset.rocksMotionOff === '1'; } catch (e) { return false; }
            }

            function isRocksHidden() {
              return typeof document !== 'undefined' && !!document.hidden;
            }

            function cancelRocksFrame() {
              if (animId && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(animId);
              animId = null;
            }

            function scheduleRocksFrame() {
              if (!rocksAlive || rocksMotionReduced() || animId || isRocksHidden()) return;
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



            // ── Landscape scene ──
            // The first thing a student sees in this tool. It used to be three
            // flat silhouettes, five coloured rectangles and two emoji fossils
            // at 50% alpha: nothing in it showed HOW the three rock families
            // form. Now every zone carries its own process: a stratovolcano
            // with alternating lava/ash layers and an ash plume, fed by a
            // convecting magma chamber with a contact aureole; a river that
            // carries sediment off the mountain into a lake where graded beds
            // (shale, sandstone, limestone with fossils, conglomerate) stack
            // youngest-on-top; a folded metamorphic root under the mountain
            // with compression arrows. Rock-cycle arrows have heads and flow.
            // Everything is deterministic (seeded, tick-driven), so the frame
            // is identical for identical inputs and reduced-motion is static.
            var rkLsSeeded = null;
            function rkLsPrep() {
              if (rkLsSeeded) return rkLsSeeded;
              var rnd = rkSeed('rocks-landscape');
              var grains = [], stipple = [], pebbles = [], sediment = [], stars = [];
              var i;
              for (i = 0; i < 160; i++) grains.push([rnd(), rnd(), rnd()]);
              for (i = 0; i < 70; i++) stipple.push([rnd(), rnd()]);
              for (i = 0; i < 26; i++) pebbles.push([rnd(), rnd(), rnd(), rnd()]);
              for (i = 0; i < 12; i++) sediment.push(rnd());
              rkLsSeeded = { grains: grains, stipple: stipple, pebbles: pebbles, sediment: sediment };
              return rkLsSeeded;
            }
            // Rounded rectangle without ctx.roundRect (absent in older WebViews).
            function rkLsRR(x, y, w, hh, r) {
              ctx.beginPath();
              ctx.moveTo(x + r, y);
              ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
              ctx.lineTo(x + w, y + hh - r); ctx.quadraticCurveTo(x + w, y + hh, x + w - r, y + hh);
              ctx.lineTo(x + r, y + hh); ctx.quadraticCurveTo(x, y + hh, x, y + hh - r);
              ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
              ctx.closePath();
            }
            // Curved arrow with a real head. Dashes flow along it with tick.
            function rkLsArrow(x0, y0, cx, cy, x1, y1, color, width, flow) {
              ctx.save();
              ctx.strokeStyle = color; ctx.fillStyle = color;
              ctx.lineWidth = width;
              ctx.lineCap = 'round';
              if (flow) { ctx.setLineDash([7 * dpr, 6 * dpr]); ctx.lineDashOffset = -tick * 0.6 * dpr; }
              ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1); ctx.stroke();
              ctx.setLineDash([]);
              var ang = Math.atan2(y1 - cy, x1 - cx);
              var hl = 9 * dpr;
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.lineTo(x1 - hl * Math.cos(ang - 0.45), y1 - hl * Math.sin(ang - 0.45));
              ctx.lineTo(x1 - hl * Math.cos(ang + 0.45), y1 - hl * Math.sin(ang + 0.45));
              ctx.closePath(); ctx.fill();
              ctx.restore();
            }
            // Pills that carry a hitId are clickable: they record their box for
            // onRockClick / onRockMove (reset every frame in drawLandscape).
            var rkLsHits = [];
            function rkLsPill(text, lx, ly, align, hitId) {
              ctx.save();
              ctx.setLineDash([]);
              ctx.textAlign = align || 'left'; ctx.textBaseline = 'alphabetic';
              ctx.font = 'bold ' + (9 * dpr) + 'px sans-serif';
              var tw = ctx.measureText(text).width;
              var padX = 5 * dpr, boxH = 14 * dpr;
              var bx = (align === 'center' ? lx - tw / 2 : lx) - padX, by = ly - 10 * dpr, bw = tw + padX * 2;
              if (hitId) rkLsHits.push({ id: hitId, x: bx / W, y: by / H, w: bw / W, h: boxH / H });
              rkLsRR(bx, by, bw, boxH, 4 * dpr);
              ctx.fillStyle = 'rgba(15,23,42,0.82)';
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.fillText(text, lx, ly);
              ctx.restore();
            }
            function rkLsProcess(zoneId) {
              return zoneId === 'volcano' ? __alloT('stem.rocks.ls_process_igneous', 'Magma rises, cools and hardens → igneous')
                : zoneId === 'river' ? __alloT('stem.rocks.ls_process_sedimentary', 'Sediment settles, compacts and cements → sedimentary')
                  : __alloT('stem.rocks.ls_process_metamorphic', 'Buried rock is squeezed and heated → metamorphic');
            }
            function rkLsAnnounce(msg) {
              try { var live = document.getElementById('allo-live-rocks'); if (live) live.textContent = msg; } catch (e) {}
            }
            // ── Guided tour: follow ONE rock around the cycle ──
            // The static scene shows every process at once; the tour shows the
            // sequence. A tracer travels each leg with a caption for the stage,
            // announced to the live region. Under reduced motion the tracer
            // does not move: each stage is a still frame, stepped by button.
            var rkLsTour = { stage: -1, u: 0, playing: false };
            var RK_LS_TOUR = [
              { id: 'igneous', color: '#f97316', cap: __alloT('stem.rocks.tour_cap_igneous', 'Magma cools and hardens: igneous rock'), path: null },
              { id: 'weather', color: '#fbbf24', cap: __alloT('stem.rocks.tour_cap_weather', 'Weathering and erosion break it into sediment'), path: null },
              { id: 'sedimentary', color: '#d97706', cap: __alloT('stem.rocks.tour_cap_sedimentary', 'Sediment settles, compacts and cements: sedimentary rock'), path: null },
              { id: 'metamorphic', color: '#a78bfa', cap: __alloT('stem.rocks.tour_cap_metamorphic', 'Buried, squeezed and heated: metamorphic rock'), path: null },
              { id: 'melt', color: '#ef4444', cap: __alloT('stem.rocks.tour_cap_melt', 'Deep enough, it melts back into magma'), path: null }
            ];
            function rkLsTourPaths() {
              // Recomputed each frame from W/H so a resize retargets the route.
              RK_LS_TOUR[0].path = [[W * 0.18, H * 0.66], [W * 0.17, H * 0.30], [W * 0.255, H * 0.45]];
              RK_LS_TOUR[1].path = [[W * 0.27, H * 0.44], [W * 0.38, H * 0.30], [W * 0.47, H * 0.46]];
              RK_LS_TOUR[2].path = [[W * 0.47, H * 0.46], [W * 0.50, H * 0.62], [W * 0.60, H * 0.84]];
              RK_LS_TOUR[3].path = [[W * 0.60, H * 0.84], [W * 0.70, H * 0.82], [W * 0.80, H * 0.68]];
              RK_LS_TOUR[4].path = [[W * 0.70, H * 0.86], [W * 0.45, H * 0.99], [W * 0.24, H * 0.76]];
            }
            function rkLsTourAnnounce() {
              if (rkLsTour.stage < 0) { rkLsAnnounce(__alloT('stem.rocks.tour_stopped', 'Rock cycle tour stopped.')); return; }
              var st = RK_LS_TOUR[rkLsTour.stage];
              rkLsAnnounce(__alloT('stem.rocks.tour_stage', 'Stage ') + (rkLsTour.stage + 1) + __alloT('stem.rocks.tour_of', ' of ') + RK_LS_TOUR.length + ': ' + st.cap + '.');
            }
            function rkLsTourCmd(cmd) {
              if (cmd === 'play') { if (rkLsTour.stage < 0) { rkLsTour.stage = 0; rkLsTour.u = 0; } rkLsTour.playing = !rocksMotionReduced(); rkLsTourAnnounce(); }
              else if (cmd === 'stop') { rkLsTour.stage = -1; rkLsTour.u = 0; rkLsTour.playing = false; rkLsTourAnnounce(); }
              else if (cmd === 'next') { rkLsTour.stage = rkLsTour.stage < 0 ? 0 : (rkLsTour.stage + 1) % RK_LS_TOUR.length; rkLsTour.u = 0; rkLsTourAnnounce(); }
              else if (cmd === 'prev') { rkLsTour.stage = rkLsTour.stage <= 0 ? RK_LS_TOUR.length - 1 : rkLsTour.stage - 1; rkLsTour.u = 0; rkLsTourAnnounce(); }
              else if (cmd === 'toggle') { rkLsTourCmd(rkLsTour.stage < 0 ? 'play' : 'stop'); return; }
              else if (typeof cmd === 'string' && cmd.indexOf('goto:') === 0) { var gs = parseInt(cmd.slice(5), 10); if (gs >= 0 && gs < RK_LS_TOUR.length) { rkLsTour.stage = gs; rkLsTour.u = 0; rkLsTour.playing = !rocksMotionReduced(); rkLsTourAnnounce(); } }
              if (rocksMotionReduced()) drawLandscape();
            }
            function rkLsDrawTour() {
              if (rkLsTour.stage < 0) return;
              rkLsTourPaths();
              if (rkLsTour.playing && !rocksMotionReduced()) {
                rkLsTour.u += 1 / 220;
                if (rkLsTour.u >= 1) { rkLsTour.u = 0; rkLsTour.stage = (rkLsTour.stage + 1) % RK_LS_TOUR.length; rkLsTourAnnounce(); }
              }
              var st = RK_LS_TOUR[rkLsTour.stage];
              // Under reduced motion the tracer sits at the END of its leg: the
              // still frame shows where the stage delivers the rock.
              var u = rocksMotionReduced() ? 1 : rkLsTour.u;
              // Trail of the current leg, then the tracer.
              ctx.save();
              ctx.strokeStyle = st.color; ctx.lineWidth = 3 * dpr; ctx.lineCap = 'round'; ctx.globalAlpha = 0.85;
              ctx.beginPath();
              for (var ti = 0; ti <= 24; ti++) { var tp = rkLsBezier(st.path[0], st.path[1], st.path[2], (ti / 24) * u); if (ti === 0) ctx.moveTo(tp[0], tp[1]); else ctx.lineTo(tp[0], tp[1]); }
              ctx.stroke();
              var p = rkLsBezier(st.path[0], st.path[1], st.path[2], u);
              ctx.globalAlpha = 1;
              ctx.shadowColor = st.color; ctx.shadowBlur = 14 * dpr;
              ctx.fillStyle = st.color;
              ctx.beginPath(); ctx.arc(p[0], p[1], 7 * dpr, 0, Math.PI * 2); ctx.fill();
              ctx.shadowBlur = 0;
              ctx.fillStyle = '#ffffff';
              ctx.beginPath(); ctx.arc(p[0], p[1], 3 * dpr, 0, Math.PI * 2); ctx.fill();
              ctx.restore();
              // Stage banner at the top centre, where nothing else lives.
              rkLsPill(__alloT('stem.rocks.tour_stage', 'Stage ') + (rkLsTour.stage + 1) + __alloT('stem.rocks.tour_of', ' of ') + RK_LS_TOUR.length + ' · ' + st.cap, W * 0.5, H * 0.045, 'center');
              // Stage dots.
              for (var di = 0; di < RK_LS_TOUR.length; di++) {
                ctx.beginPath(); ctx.arc(W * 0.5 + (di - 2) * 14 * dpr, H * 0.075, 3.2 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = di === rkLsTour.stage ? '#ffffff' : 'rgba(255,255,255,0.4)'; ctx.fill();
              }
            }
            function rkLsBezier(p0, p1, p2, u) {
              var v = 1 - u;
              return [v * v * p0[0] + 2 * v * u * p1[0] + u * u * p2[0], v * v * p0[1] + 2 * v * u * p1[1] + u * u * p2[1]];
            }

            function drawLandscape() {
              var P = rkLsPrep();
              var i, j;
              rkLsHits.length = 0;
              ctx.clearRect(0, 0, W, H);

              // ── Sky: deep zenith to hazy horizon, sun, drifting clouds ──
              const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.5);
              skyGrad.addColorStop(0, '#0b3a5e');
              skyGrad.addColorStop(0.55, '#3b9ad6');
              skyGrad.addColorStop(1, '#bfe6fa');
              ctx.fillStyle = skyGrad;
              ctx.fillRect(0, 0, W, H * 0.5);
              var sunX = W * 0.55, sunY = H * 0.11;
              var sunGlow = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, W * 0.11);
              sunGlow.addColorStop(0, 'rgba(255,247,204,0.95)');
              sunGlow.addColorStop(0.25, 'rgba(255,236,170,0.45)');
              sunGlow.addColorStop(1, 'rgba(255,236,170,0)');
              ctx.fillStyle = sunGlow;
              ctx.fillRect(sunX - W * 0.12, sunY - W * 0.12, W * 0.24, W * 0.24);
              ctx.beginPath(); ctx.arc(sunX, sunY, 11 * dpr, 0, Math.PI * 2); ctx.fillStyle = '#fff7cc'; ctx.fill();
              // Distant ridge for depth.
              ctx.beginPath();
              ctx.moveTo(W * 0.30, H * 0.5);
              ctx.lineTo(W * 0.38, H * 0.40); ctx.lineTo(W * 0.45, H * 0.44); ctx.lineTo(W * 0.52, H * 0.37);
              ctx.lineTo(W * 0.58, H * 0.43); ctx.lineTo(W * 0.66, H * 0.39); ctx.lineTo(W * 0.72, H * 0.5);
              ctx.closePath();
              ctx.fillStyle = 'rgba(91,122,154,0.55)';
              ctx.fill();
              // Clouds: three clusters drifting right, wrapping.
              for (i = 0; i < 3; i++) {
                var cxC = ((W * (0.15 + i * 0.33) + tick * (0.35 + i * 0.12) * dpr) % (W * 1.3)) - W * 0.15;
                var cyC = H * (0.09 + i * 0.05);
                ctx.fillStyle = 'rgba(255,255,255,0.86)';
                for (j = 0; j < 4; j++) {
                  ctx.beginPath();
                  ctx.ellipse(cxC + (j - 1.5) * 16 * dpr, cyC + (j % 2 ? 3 : -3) * dpr, (14 + (j % 2) * 8) * dpr, (8 + (j % 2) * 4) * dpr, 0, 0, Math.PI * 2);
                  ctx.fill();
                }
              }

              // Birds: two small flocks crossing the sky. Life in the scene, and a
              // sense of scale for the range behind them.
              ctx.save();
              ctx.strokeStyle = 'rgba(30,41,59,0.75)'; ctx.lineWidth = 1.3 * dpr; ctx.lineCap = 'round';
              for (i = 0; i < 2; i++) {
                var dir = i === 0 ? 1 : -1;
                var fx = ((tick * (0.55 + i * 0.2) * dpr + W * (0.2 + i * 0.5)) % (W * 1.3)) - W * 0.15;
                if (dir < 0) fx = W - fx;
                var fy = H * (0.16 + i * 0.09);
                for (j = 0; j < 4 + i; j++) {
                  var bx = fx + (j - 2) * 11 * dpr * dir, by = fy + Math.abs(j - 2) * 5 * dpr + Math.sin(tick * 0.05 + j) * 1.5 * dpr;
                  var flap = 2.2 * dpr + Math.sin(tick * 0.25 + j * 0.7) * 1.6 * dpr;
                  ctx.beginPath(); ctx.moveTo(bx - 4 * dpr, by + flap); ctx.lineTo(bx, by); ctx.lineTo(bx + 4 * dpr, by + flap); ctx.stroke();
                }
              }
              ctx.restore();

              // ── Underground: bedrock gradient + grain ──
              const groundGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
              groundGrad.addColorStop(0, '#6b4423');
              groundGrad.addColorStop(0.35, '#7c4a1e');
              groundGrad.addColorStop(1, '#3a1607');
              ctx.fillStyle = groundGrad;
              ctx.fillRect(0, H * 0.5, W, H * 0.5);
              for (i = 0; i < P.grains.length; i++) {
                var gr = P.grains[i];
                ctx.fillStyle = gr[2] > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.16)';
                ctx.fillRect(gr[0] * W, H * 0.52 + gr[1] * H * 0.47, (1.5 + gr[2] * 2) * dpr, (1 + gr[2]) * dpr);
              }
              // ── Surface: soil horizon + turf band ──
              var turfH = H * 0.035;
              var surfaceY = function (x) { return H * 0.5 + Math.sin(x * 0.01 + tick * 0.01) * 3 * dpr; };
              var band = function (topOffset, bottomOffset, fill) {
                ctx.beginPath();
                ctx.moveTo(0, surfaceY(0) + topOffset);
                for (let x = 0; x <= W; x += 5) ctx.lineTo(x, surfaceY(x) + topOffset);
                for (let x = W; x >= 0; x -= 5) ctx.lineTo(x, surfaceY(x) + bottomOffset);
                ctx.closePath();
                ctx.fillStyle = fill;
                ctx.fill();
              };
              band(turfH * 0.9, turfH * 2.4, '#5b4426');
              band(0, turfH, '#65a30d');

              // ── Sedimentary basin (centre): lake, delta, graded beds ──
              var bx0 = W * 0.38, bx1 = W * 0.70;
              var bedTops = [0.55, 0.63, 0.71, 0.79, 0.87, 0.95];
              var bedFill = ['#b09a7a', '#e0b062', '#d9d2bd', '#a8693a', '#3f3a34'];
              var bedNames = ['shale', 'sandstone', 'limestone', 'conglomerate', 'mudstone'];
              for (i = 0; i < 5; i++) {
                var y0 = H * bedTops[i], y1 = H * bedTops[i + 1];
                var dip = H * 0.012;
                ctx.beginPath();
                ctx.moveTo(bx0, y0 + dip); ctx.lineTo(bx1, y0 - dip); ctx.lineTo(bx1, y1 - dip); ctx.lineTo(bx0, y1 + dip); ctx.closePath();
                ctx.fillStyle = bedFill[i]; ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
                ctx.save();
                ctx.clip();
                if (bedNames[i] === 'shale' || bedNames[i] === 'mudstone') {
                  ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 0.7 * dpr;
                  for (j = 1; j < 6; j++) { var ly = y0 + (y1 - y0) * (j / 6); ctx.beginPath(); ctx.moveTo(bx0, ly + dip); ctx.lineTo(bx1, ly - dip); ctx.stroke(); }
                } else if (bedNames[i] === 'sandstone') {
                  ctx.fillStyle = 'rgba(120,70,20,0.35)';
                  for (j = 0; j < P.stipple.length; j++) ctx.fillRect(bx0 + P.stipple[j][0] * (bx1 - bx0), y0 + P.stipple[j][1] * (y1 - y0), 1.4 * dpr, 1.4 * dpr);
                } else if (bedNames[i] === 'conglomerate') {
                  for (j = 0; j < P.pebbles.length; j++) {
                    var pb = P.pebbles[j];
                    ctx.beginPath();
                    ctx.ellipse(bx0 + pb[0] * (bx1 - bx0), y0 + 0.15 * (y1 - y0) + pb[1] * 0.7 * (y1 - y0), (2.5 + pb[2] * 4) * dpr, (2 + pb[3] * 2.5) * dpr, pb[2] * 3, 0, Math.PI * 2);
                    ctx.fillStyle = pb[3] > 0.6 ? '#d6d3d1' : pb[3] > 0.3 ? '#7c6f64' : '#c2410c';
                    ctx.fill();
                    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.6 * dpr; ctx.stroke();
                  }
                } else if (bedNames[i] === 'limestone') {
                  // Fossils drawn as shapes, not emoji: ammonite, bivalve, fish.
                  ctx.strokeStyle = 'rgba(60,45,30,0.75)'; ctx.lineWidth = 1.1 * dpr; ctx.fillStyle = 'rgba(255,255,255,0.35)';
                  var ax = W * 0.455, ay = (y0 + y1) / 2;
                  ctx.beginPath();
                  for (j = 0; j <= 60; j++) { var ta = j * 0.21, ra = (1 + ta * 1.9) * dpr; var px = ax + Math.cos(ta) * ra, py = ay + Math.sin(ta) * ra; if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
                  ctx.stroke();
                  var sx = W * 0.545, sy = ay + 4 * dpr;
                  ctx.beginPath(); ctx.moveTo(sx - 9 * dpr, sy); ctx.quadraticCurveTo(sx, sy - 16 * dpr, sx + 9 * dpr, sy); ctx.closePath(); ctx.fill(); ctx.stroke();
                  for (j = -2; j <= 2; j++) { ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + j * 3.5 * dpr, sy - (12 - Math.abs(j) * 2.5) * dpr); ctx.stroke(); }
                  var fx = W * 0.63, fy = ay;
                  ctx.beginPath(); ctx.moveTo(fx - 14 * dpr, fy); ctx.lineTo(fx + 10 * dpr, fy); ctx.stroke();
                  for (j = -3; j <= 3; j++) { ctx.beginPath(); ctx.moveTo(fx + j * 3.5 * dpr, fy); ctx.lineTo(fx + j * 3.5 * dpr - 2 * dpr, fy - 5 * dpr); ctx.moveTo(fx + j * 3.5 * dpr, fy); ctx.lineTo(fx + j * 3.5 * dpr - 2 * dpr, fy + 5 * dpr); ctx.stroke(); }
                  ctx.beginPath(); ctx.moveTo(fx + 10 * dpr, fy); ctx.lineTo(fx + 16 * dpr, fy - 5 * dpr); ctx.lineTo(fx + 16 * dpr, fy + 5 * dpr); ctx.closePath(); ctx.stroke();
                  ctx.beginPath(); ctx.arc(fx - 14 * dpr, fy, 4 * dpr, 0, Math.PI * 2); ctx.stroke();
                }
                ctx.restore();
              }
              // Superposition cue: youngest on top.
              rkLsArrow(W * 0.405, H * 0.93, W * 0.405, H * 0.78, W * 0.405, H * 0.60, 'rgba(15,23,42,0.85)', 1.6 * dpr, false);
              ctx.save();
              ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
              var ygTxt = __alloT('stem.rocks.ls_younger', 'younger');
              var ygW = ctx.measureText(ygTxt).width;
              ctx.translate(W * 0.419, H * 0.76); ctx.rotate(-Math.PI / 2);
              ctx.fillStyle = 'rgba(15,23,42,0.72)';
              ctx.fillRect(-ygW / 2 - 4 * dpr, -6 * dpr, ygW + 8 * dpr, 12 * dpr);
              ctx.fillStyle = 'rgba(255,255,255,0.95)';
              ctx.fillText(ygTxt, 0, 0);
              ctx.restore();
              // Lake with shimmer.
              ctx.beginPath();
              ctx.ellipse(W * 0.54, H * 0.505, W * 0.15, H * 0.022, 0, 0, Math.PI * 2);
              ctx.fillStyle = '#38bdf8'; ctx.fill();
              ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1 * dpr;
              for (i = 0; i < 4; i++) {
                var shx = W * (0.44 + i * 0.05) + Math.sin(tick * 0.05 + i) * 4 * dpr;
                ctx.beginPath(); ctx.moveTo(shx, H * 0.505 + (i % 2) * 3 * dpr); ctx.lineTo(shx + 10 * dpr, H * 0.505 + (i % 2) * 3 * dpr); ctx.stroke();
              }
              // River from the mountain flank into the lake, with flow dashes.
              var r0 = [W * 0.735, H * 0.28], r1 = [W * 0.70, H * 0.44], r2 = [W * 0.655, H * 0.505];
              ctx.save();
              ctx.strokeStyle = '#7dd3fc'; ctx.lineWidth = 5 * dpr; ctx.lineCap = 'round';
              ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.quadraticCurveTo(r1[0], r1[1], r2[0], r2[1]); ctx.stroke();
              ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.4 * dpr;
              ctx.setLineDash([5 * dpr, 7 * dpr]); ctx.lineDashOffset = -tick * 0.8 * dpr;
              ctx.beginPath(); ctx.moveTo(r0[0], r0[1]); ctx.quadraticCurveTo(r1[0], r1[1], r2[0], r2[1]); ctx.stroke();
              ctx.restore();
              // Delta fan where the river meets the lake.
              ctx.beginPath();
              ctx.moveTo(r2[0] + 4 * dpr, r2[1] - 5 * dpr);
              ctx.quadraticCurveTo(W * 0.62, H * 0.49, W * 0.60, H * 0.515);
              ctx.quadraticCurveTo(W * 0.635, H * 0.53, r2[0] + 8 * dpr, H * 0.52);
              ctx.closePath();
              ctx.fillStyle = '#d6b370'; ctx.fill();
              // Sediment grains travelling down the river and settling.
              for (i = 0; i < P.sediment.length; i++) {
                var u = (tick * 0.004 + P.sediment[i]) % 1;
                var sp2 = rkLsBezier(r0, r1, r2, u);
                var settle = u > 0.85 ? (u - 0.85) / 0.15 : 0;
                ctx.beginPath();
                ctx.arc(sp2[0] - settle * 30 * dpr, sp2[1] + settle * 6 * dpr, (1.4 + P.sediment[i]) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(214,179,112,' + (1 - settle * 0.9) + ')';
                ctx.fill();
              }

              // ── Volcano (left): layered stratocone, crater, plume, lava ──
              const conePts = [[W * 0.02, H * 0.52], [W * 0.15, H * 0.12], [W * 0.18, H * 0.10], [W * 0.21, H * 0.12], [W * 0.34, H * 0.52]];
              ctx.beginPath();
              ctx.moveTo(conePts[0][0], conePts[0][1]);
              for (i = 1; i < conePts.length; i++) ctx.lineTo(conePts[i][0], conePts[i][1]);
              ctx.closePath();
              const volcGrad = ctx.createLinearGradient(W * 0.15, H * 0.10, W * 0.15, H * 0.52);
              volcGrad.addColorStop(0, '#7f1d1d');
              volcGrad.addColorStop(0.5, '#6b2f2f');
              volcGrad.addColorStop(1, '#57534e');
              ctx.fillStyle = volcGrad; ctx.fill();
              ctx.save();
              ctx.clip();
              // Alternating lava / ash layers seen in cross-section.
              for (i = 0; i < 9; i++) {
                var lyY = H * (0.16 + i * 0.04);
                var half = (lyY - H * 0.10) / (H * 0.42) * (W * 0.16);
                ctx.beginPath();
                ctx.moveTo(W * 0.18 - half - W * 0.02, lyY + H * 0.03);
                ctx.lineTo(W * 0.18, lyY - H * 0.012);
                ctx.lineTo(W * 0.18 + half + W * 0.02, lyY + H * 0.03);
                ctx.lineTo(W * 0.18 + half + W * 0.02, lyY + H * 0.045);
                ctx.lineTo(W * 0.18, lyY + H * 0.003);
                ctx.lineTo(W * 0.18 - half - W * 0.02, lyY + H * 0.045);
                ctx.closePath();
                ctx.fillStyle = i % 2 ? 'rgba(80,80,80,0.55)' : 'rgba(153,27,27,0.55)';
                ctx.fill();
              }
              ctx.restore();
              // Crater bowl.
              ctx.beginPath();
              ctx.moveTo(W * 0.155, H * 0.12); ctx.quadraticCurveTo(W * 0.18, H * 0.155, W * 0.205, H * 0.12);
              ctx.closePath();
              ctx.fillStyle = '#3f1d1d'; ctx.fill();
              // Ash plume: rising, expanding puffs.
              for (i = 0; i < 9; i++) {
                var ph = (tick * 0.5 + i * 27) % 240;
                var pyp = H * 0.10 - ph * 0.55 * dpr;
                var pxp = W * 0.18 + Math.sin(ph * 0.04 + i) * (4 + ph * 0.12) * dpr + ph * 0.18 * dpr;
                var prad = (5 + ph * 0.09) * dpr;
                if (pyp < -prad) continue;
                ctx.beginPath(); ctx.arc(pxp, pyp, prad, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(90,90,100,' + (0.55 - ph / 240 * 0.5) + ')';
                ctx.fill();
              }
              // Embers.
              for (i = 0; i < 8; i++) {
                const px = W * 0.18 + Math.sin(tick * 0.08 + i * 1.2) * 14 * dpr;
                const py = H * 0.09 - Math.abs(Math.sin(tick * 0.06 + i * 0.9)) * 24 * dpr;
                ctx.beginPath(); ctx.arc(px, py, (1.6 + Math.sin(tick * 0.1 + i)) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = i % 2 === 0 ? '#fbbf24' : '#f97316'; ctx.fill();
              }
              // Lava flow down the right flank, glowing.
              ctx.save();
              ctx.shadowColor = '#f97316'; ctx.shadowBlur = 10 * dpr;
              ctx.beginPath();
              ctx.moveTo(W * 0.185, H * 0.13);
              const lavaWave = Math.sin(tick * 0.05) * 4 * dpr;
              ctx.quadraticCurveTo(W * 0.21 + lavaWave, H * 0.27, W * 0.26, H * 0.44);
              ctx.lineTo(W * 0.235, H * 0.445);
              ctx.quadraticCurveTo(W * 0.19 - lavaWave, H * 0.27, W * 0.175, H * 0.13);
              ctx.closePath();
              const lavaGrad = ctx.createLinearGradient(W * 0.18, H * 0.13, W * 0.18, H * 0.44);
              lavaGrad.addColorStop(0, '#fef3c7'); lavaGrad.addColorStop(0.2, '#fbbf24'); lavaGrad.addColorStop(0.6, '#f97316'); lavaGrad.addColorStop(1, '#991b1b');
              ctx.fillStyle = lavaGrad; ctx.fill();
              ctx.restore();
              // Cooled basalt toe at the foot of the flow.
              ctx.beginPath(); ctx.ellipse(W * 0.265, H * 0.455, 16 * dpr, 5 * dpr, 0, 0, Math.PI * 2); ctx.fillStyle = '#1f2937'; ctx.fill();

              // ── Magma chamber + conduit + aureole ──
              const mgX = W * 0.18, mgY = H * 0.76, mgRx = W * 0.085, mgRy = H * 0.11;
              // Heat halo, then aureole ring: country rock baked around the pluton.
              var halo = ctx.createRadialGradient(mgX, mgY, mgRx * 0.8, mgX, mgY, mgRx * 1.9);
              halo.addColorStop(0, 'rgba(249,115,22,0.30)'); halo.addColorStop(1, 'rgba(249,115,22,0)');
              ctx.fillStyle = halo; ctx.fillRect(mgX - mgRx * 2, mgY - mgRy * 2.4, mgRx * 4, mgRy * 4.8);
              ctx.save();
              ctx.setLineDash([3 * dpr, 4 * dpr]); ctx.strokeStyle = 'rgba(251,191,36,0.55)'; ctx.lineWidth = 1.5 * dpr;
              ctx.beginPath(); ctx.ellipse(mgX, mgY, mgRx * 1.45, mgRy * 1.45, 0, 0, Math.PI * 2); ctx.stroke();
              ctx.restore();
              // Feeder conduit.
              ctx.beginPath();
              ctx.moveTo(mgX - 7 * dpr, mgY - mgRy * 0.8);
              ctx.quadraticCurveTo(W * 0.172, H * 0.62, W * 0.176, H * 0.14);
              ctx.lineTo(W * 0.186, H * 0.14);
              ctx.quadraticCurveTo(W * 0.187, H * 0.62, mgX + 7 * dpr, mgY - mgRy * 0.8);
              ctx.closePath();
              const conduitGrad = ctx.createLinearGradient(0, H * 0.14, 0, mgY);
              conduitGrad.addColorStop(0, '#fbbf24'); conduitGrad.addColorStop(0.4, '#c2410c'); conduitGrad.addColorStop(1, '#ea580c');
              ctx.fillStyle = conduitGrad; ctx.fill();
              // Irregular chamber, deterministic wobble.
              ctx.beginPath();
              for (let mi = 0; mi <= 28; mi++) {
                const ma = (mi / 28) * Math.PI * 2;
                const wob = 1 + 0.15 * Math.sin(ma * 3 + 1.1) + 0.08 * Math.sin(ma * 5 + 2.3);
                const mxp = mgX + Math.cos(ma) * mgRx * wob;
                const myp = mgY + Math.sin(ma) * mgRy * wob;
                if (mi === 0) ctx.moveTo(mxp, myp); else ctx.lineTo(mxp, myp);
              }
              ctx.closePath();
              const magmaGrad = ctx.createRadialGradient(mgX - mgRx * 0.2, mgY - mgRy * 0.2, 0, mgX, mgY, mgRx * 1.25);
              magmaGrad.addColorStop(0, '#fde047'); magmaGrad.addColorStop(0.42, '#ea580c'); magmaGrad.addColorStop(1, '#7f1d1d');
              ctx.fillStyle = magmaGrad; ctx.fill();
              ctx.strokeStyle = 'rgba(69,26,3,0.75)'; ctx.lineWidth = 2 * dpr; ctx.stroke();
              // Convection cells inside the chamber.
              ctx.save();
              ctx.strokeStyle = 'rgba(253,224,71,0.45)'; ctx.lineWidth = 1.5 * dpr;
              for (i = 0; i < 3; i++) {
                var ca = tick * 0.02 + i * 2.1;
                ctx.beginPath(); ctx.ellipse(mgX + (i - 1) * mgRx * 0.45, mgY, mgRx * 0.28, mgRy * 0.5, 0, ca, ca + 3.6); ctx.stroke();
              }
              ctx.restore();

              // ── Mountain (right): peaks, snow, folded metamorphic root ──
              ctx.beginPath();
              ctx.moveTo(W * 0.60, H * 0.52);
              ctx.lineTo(W * 0.70, H * 0.22); ctx.lineTo(W * 0.745, H * 0.30);
              ctx.lineTo(W * 0.80, H * 0.06); ctx.lineTo(W * 0.83, H * 0.02); ctx.lineTo(W * 0.86, H * 0.06);
              ctx.lineTo(W * 0.985, H * 0.52);
              ctx.closePath();
              const mtGrad = ctx.createLinearGradient(W * 0.82, H * 0.02, W * 0.82, H * 0.52);
              mtGrad.addColorStop(0, '#e5e7eb'); mtGrad.addColorStop(0.35, '#9ca3af'); mtGrad.addColorStop(1, '#374151');
              ctx.fillStyle = mtGrad; ctx.fill();
              // Tilted strata on the mountain face.
              ctx.save(); ctx.clip();
              ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1.2 * dpr;
              for (i = 0; i < 7; i++) { ctx.beginPath(); ctx.moveTo(W * 0.62, H * (0.30 + i * 0.035)); ctx.lineTo(W * 0.98, H * (0.16 + i * 0.05)); ctx.stroke(); }
              // Snow cap.
              ctx.beginPath();
              ctx.moveTo(W * 0.80, H * 0.06); ctx.lineTo(W * 0.83, H * 0.02); ctx.lineTo(W * 0.86, H * 0.06);
              ctx.lineTo(W * 0.875, H * 0.115); ctx.lineTo(W * 0.86, H * 0.10); ctx.lineTo(W * 0.845, H * 0.125); ctx.lineTo(W * 0.825, H * 0.105); ctx.lineTo(W * 0.805, H * 0.125); ctx.lineTo(W * 0.79, H * 0.10);
              ctx.closePath(); ctx.fillStyle = '#f8fafc'; ctx.fill();
              ctx.restore();
              // Folded metamorphic root: filled anticline bands.
              var foldCols = ['#4c1d95', '#6d28d9', '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed'];
              var fx0 = W * 0.63, fx1 = W * 0.975;
              var foldY = function (k, x) {
                var u = (x - fx0) / (fx1 - fx0);
                var amp = H * 0.045 * (1 - k * 0.08);
                return H * (0.60 + k * 0.058) - Math.sin(u * Math.PI) * amp + Math.sin(u * Math.PI * 3 + tick * 0.004) * H * 0.006;
              };
              for (i = 0; i < 6; i++) {
                ctx.beginPath();
                for (let x = fx0; x <= fx1; x += 4) { var yy = foldY(i, x); if (x === fx0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
                for (let x = fx1; x >= fx0; x -= 4) ctx.lineTo(x, foldY(i + 1, x));
                ctx.closePath();
                ctx.fillStyle = foldCols[i]; ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8 * dpr; ctx.stroke();
              }
              // Foliation. "The minerals lined up" is what metamorphic means, so
              // the lines follow the fold surfaces rather than running flat, and
              // garnet porphyroblasts sit across the fabric the way they do in a
              // real schist — the same relationship the thin section describes.
              ctx.save();
              ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.lineWidth = 0.8 * dpr;
              for (i = 0; i < 6; i++) {
                for (j = 1; j <= 3; j++) {
                  ctx.beginPath();
                  for (let x = fx0 + 4; x <= fx1 - 4; x += 6) {
                    var fyTop = foldY(i, x), fyBot = foldY(i + 1, x);
                    var fyLine = fyTop + (fyBot - fyTop) * (j / 4);
                    if (x === fx0 + 4) ctx.moveTo(x, fyLine); else ctx.lineTo(x, fyLine);
                  }
                  ctx.stroke();
                }
              }
              for (i = 0; i < 7; i++) {
                var pbX = fx0 + (fx1 - fx0) * (0.09 + ((i * 0.139) % 0.82));
                var pbB = i % 5;
                var pbY = foldY(pbB, pbX) + (foldY(pbB + 1, pbX) - foldY(pbB, pbX)) * 0.5;
                ctx.beginPath(); ctx.arc(pbX, pbY, 2.6 * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#7f1d1d'; ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.7 * dpr; ctx.stroke();
              }
              ctx.restore();

              // Rain squall over the range and rockfall down its flank: the cause
              // behind the "weathering & erosion" arrow, not just the label.
              ctx.save();
              ctx.strokeStyle = 'rgba(191,219,254,0.55)'; ctx.lineWidth = 1.2 * dpr; ctx.lineCap = 'round';
              for (i = 0; i < 14; i++) {
                var rx = W * (0.63 + (i * 0.0137) % 0.16);
                var ry = H * 0.10 + ((tick * 3.2 + i * 37) % (H * 0.30));
                ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3 * dpr, ry + 9 * dpr); ctx.stroke();
              }
              ctx.restore();
              for (i = 0; i < 3; i++) {
                var fu = ((tick * 0.006) + i / 3) % 1;
                var fp = rkLsBezier([W * 0.705, H * 0.24], [W * 0.685, H * 0.36], [W * 0.66, H * 0.485], fu);
                ctx.beginPath(); ctx.arc(fp[0], fp[1], (2.4 - fu) * dpr, 0, Math.PI * 2);
                ctx.fillStyle = '#6b7280'; ctx.fill();
                ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.6 * dpr; ctx.stroke();
              }
              // Compression arrows from both sides, pulsing.
              const arrowAlpha = 0.55 + Math.sin(tick * 0.04) * 0.25;
              var arrowCol = 'rgba(255,255,255,' + arrowAlpha + ')';
              rkLsArrow(W * 0.615, H * 0.73, W * 0.635, H * 0.73, W * 0.655, H * 0.73, arrowCol, 3 * dpr, false);
              rkLsArrow(W * 0.985, H * 0.73, W * 0.965, H * 0.73, W * 0.945, H * 0.73, arrowCol, 3 * dpr, false);
              rkLsArrow(W * 0.80, H * 0.545, W * 0.80, H * 0.56, W * 0.80, H * 0.585, arrowCol, 3 * dpr, false);
              rkLsPill(__alloT('stem.rocks.ls_pressure', 'pressure'), W * 0.80, H * 0.98, 'center', 3);
              // Uplift arrow beside the range.
              rkLsArrow(W * 0.575, H * 0.47, W * 0.575, H * 0.42, W * 0.575, H * 0.36, 'rgba(255,255,255,0.8)', 2 * dpr, false);
              rkLsPill(__alloT('stem.rocks.ls_uplift', 'uplift'), W * 0.575, H * 0.335, 'center');

              // ── Depth / temperature scale at the left edge ──
              // Drawn after the terrain so nothing buries it, starting at the
              // ground surface rather than inside the soil band. Every label
              // sits on a dark plate: it crosses glowing magma on its way down.
              ctx.save();
              var dsX = W * 0.012, dsY0 = H * 0.59, dsY1 = H * 0.97;
              var dsGrad = ctx.createLinearGradient(0, dsY0, 0, dsY1);
              dsGrad.addColorStop(0, '#93c5fd'); dsGrad.addColorStop(0.5, '#fbbf24'); dsGrad.addColorStop(1, '#ef4444');
              ctx.fillStyle = dsGrad;
              ctx.fillRect(dsX, dsY0, 5 * dpr, dsY1 - dsY0);
              ctx.strokeStyle = 'rgba(15,23,42,0.55)'; ctx.lineWidth = 1 * dpr;
              ctx.strokeRect(dsX, dsY0, 5 * dpr, dsY1 - dsY0);
              ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
              var dsLabel = function (text, y, px) {
                ctx.font = 'bold ' + (px * dpr) + 'px sans-serif';
                var tw = ctx.measureText(text).width;
                ctx.fillStyle = 'rgba(15,23,42,0.62)';
                ctx.fillRect(dsX + 9 * dpr, y - (px * 0.78) * dpr, tw + 8 * dpr, (px * 1.56) * dpr);
                ctx.fillStyle = 'rgba(255,255,255,0.95)';
                ctx.fillText(text, dsX + 13 * dpr, y);
              };
              // Marks at the depths where burial lithification and regional
              // metamorphism actually happen, so the bar reads as a scale.
              // Skipped on a short canvas, where they would crowd the ends.
              if (H > 300 * dpr) {
                var dsMarks = [[5 / 35, __alloT('stem.rocks.ls_depth_mid1', '~5 km · burial')], [15 / 35, __alloT('stem.rocks.ls_depth_mid2', '~15 km · heat + pressure')]];
                ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.2 * dpr;
                for (i = 0; i < dsMarks.length; i++) {
                  var dsMy = dsY0 + (dsY1 - dsY0) * dsMarks[i][0];
                  ctx.beginPath(); ctx.moveTo(dsX, dsMy); ctx.lineTo(dsX + 9 * dpr, dsMy); ctx.stroke();
                  dsLabel(dsMarks[i][1], dsMy, 7.5);
                }
              }
              dsLabel(__alloT('stem.rocks.ls_depth_top', '0 km · cool'), dsY0 + 5 * dpr, 8);
              dsLabel(__alloT('stem.rocks.ls_depth_bottom', '~35 km · hot'), dsY1 - 5 * dpr, 8);
              ctx.restore();

              // ── Zone markers + hover highlights (hit areas unchanged) ──
              zones.forEach(z => {
                var zx = z.x * W, zy = z.y * H, zw = z.w * W, zh = z.h * H;
                var isHover = hoverZone === z.id;
                var zColor = ROCK_TYPES[z.type].color;
                ctx.save();
                ctx.globalAlpha = isHover ? 0.6 : 0.15 + Math.sin(tick * 0.03) * 0.05;
                ctx.strokeStyle = zColor;
                ctx.lineWidth = (isHover ? 3 : 1.5) * dpr;
                ctx.setLineDash(isHover ? [6 * dpr, 4 * dpr] : [3 * dpr, 6 * dpr]);
                ctx.strokeRect(zx, zy, zw, zh);
                ctx.setLineDash([]);
                ctx.restore();
                var iconScale = 1 + Math.sin(tick * 0.04 + z.x * 10) * 0.15;
                var cxZ = zx + zw / 2, cyZ = zy + zh / 2;
                ctx.save();
                ctx.globalAlpha = isHover ? 1.0 : 0.7;
                ctx.shadowColor = zColor;
                ctx.shadowBlur = (isHover ? 16 : 8) * dpr;
                ctx.fillStyle = 'rgba(0,0,0,0.4)';
                ctx.beginPath();
                ctx.arc(cxZ, cyZ - 2 * dpr, 14 * dpr * iconScale, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.font = 'bold ' + Math.round(18 * dpr * iconScale) + 'px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(z.id === 'volcano' ? '🌋' : z.id === 'river' ? '🏖️' : '⛰️', cxZ, cyZ);
                ctx.restore();
                ctx.save();
                ctx.globalAlpha = isHover ? 0.95 : 0.55;
                ctx.font = 'bold ' + (isHover ? 12 : 10) * dpr + 'px sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                var labelText = z.id === 'volcano' ? __alloT('stem.rocks.igneous', 'Igneous') : z.id === 'river' ? __alloT('stem.rocks.sedimentary', 'Sedimentary') : __alloT('stem.rocks.metamorphic', 'Metamorphic');
                var labelW = ctx.measureText(labelText).width + 12 * dpr;
                ctx.fillStyle = 'rgba(0,0,0,0.45)';
                rkLsRR(cxZ - labelW / 2, cyZ + 16 * dpr, labelW, 18 * dpr, 6 * dpr);
                ctx.fill();
                ctx.fillStyle = '#fff';
                ctx.fillText(labelText, cxZ, cyZ + 18 * dpr);
                ctx.restore();
                if (isHover) {
                  ctx.save();
                  ctx.font = (9 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
                  ctx.fillStyle = 'rgba(255,255,255,0.7)';
                  ctx.fillText(__alloT('stem.rocks.ls_click_to_explore', 'Click to explore →'), cxZ, cyZ + 36 * dpr);
                  ctx.restore();
                  // The process, in one line, where the eye already is.
                  rkLsPill(rkLsProcess(z.id), cxZ, cyZ + 58 * dpr, 'center');
                }
              });

              // ── Rock-cycle arrows with heads and flowing dashes ──
              var cyc = 'rgba(255,255,255,0.75)';
              // Igneous → weathering → sediment
              rkLsArrow(W * 0.30, H * 0.40, W * 0.38, H * 0.33, W * 0.46, H * 0.44, cyc, 2 * dpr, true);
              rkLsPill(__alloT('stem.rocks.ls_weathering', 'Weathering & erosion'), W * 0.40, H * 0.27, 'center', 1);
              // Sediment → heat/pressure → metamorphic
              rkLsArrow(W * 0.60, H * 0.93, W * 0.63, H * 0.88, W * 0.66, H * 0.82, cyc, 2 * dpr, true);
              rkLsPill(t('stem.rock_cycle.heat_pressure'), W * 0.60, H * 0.965, 'left', 3);
              // Metamorphic → melting → magma
              rkLsArrow(W * 0.62, H * 0.86, W * 0.45, H * 0.97, W * 0.29, H * 0.83, cyc, 2 * dpr, true);
              rkLsPill(__alloT('stem.rocks.ls_melting', 'Melting'), W * 0.44, H * 0.91, 'center', 4);
              // Sediment → rock: the one stage that had no label of its own.
              rkLsPill(__alloT('stem.rocks.ls_deposition', 'Deposition'), W * 0.54, H * 0.585, 'center', 2);
              // Magma → cooling → igneous
              rkLsPill(__alloT('stem.rocks.ls_cooling', 'Cooling'), W * 0.27, H * 0.37, 'center', 0);

              rkLsDrawTour();
              // Caption
              ctx.font = (10 * dpr) + 'px monospace';
              ctx.fillStyle = 'rgba(255,255,255,0.6)';
              ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
              // Right of the depth-scale labels, so the two never overlap on a narrow canvas.
              ctx.fillText('🪨 ' + __alloT('stem.rocks.ls_cross_section', 'Cross-Section View'), dsX + 8 * dpr + ctx.measureText(__alloT('stem.rocks.ls_depth_bottom', '~35 km · hot')).width + 14 * dpr, H - 8 * dpr);
            }

            let animId = null;

            function loop() {
              if (!rocksAlive) return;
              animId = null;
              if (!canvasEl.isConnected) { canvasEl._rocksCleanup(); return; }
              if (isRocksHidden()) { cancelRocksFrame(); return; }

              if (!rocksMotionReduced()) tick++;

              drawLandscape();

              scheduleRocksFrame();

            }

            loop();



            // Mouse hover for zones

            function rkLsHitAt(mx, my) {
              for (var hi = 0; hi < rkLsHits.length; hi++) { var hb = rkLsHits[hi]; if (mx >= hb.x && mx <= hb.x + hb.w && my >= hb.y && my <= hb.y + hb.h) return hb; }
              return null;
            }
            function onRockMove(e) {

              const rect = canvasEl.getBoundingClientRect();

              const mx = (e.clientX - rect.left) / rect.width;

              const my = (e.clientY - rect.top) / rect.height;

              hoverZone = null;

              zones.forEach(z => {

                if (mx >= z.x && mx <= z.x + z.w && my >= z.y && my <= z.y + z.h) hoverZone = z.id;

              });

              canvasEl.style.cursor = (hoverZone || rkLsHitAt(mx, my)) ? 'pointer' : 'default';
              if (rocksMotionReduced()) drawLandscape();

            }



            function onRockClick(e) {

              const rect = canvasEl.getBoundingClientRect();

              const mx = (e.clientX - rect.left) / rect.width;

              const my = (e.clientY - rect.top) / rect.height;

              // A process label is a shortcut into the tour at that stage.
              var hit = rkLsHitAt(mx, my);
              if (hit) { rkLsTourCmd('goto:' + hit.id); if (canvasEl._onTourJump) canvasEl._onTourJump(); return; }
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

            canvasEl.setAttribute('aria-label', __alloT('stem.rocks.rock_cycle_landscape_aria2', 'Rock cycle landscape. Press 1 for the volcano and igneous rocks, 2 for the river delta and sedimentary rocks, 3 for the mountain core and metamorphic rocks. The first press previews a zone; press it again, or Enter, to open it. Press T to follow one rock around the cycle, N and P to step through its stages.'));

            function onRockKey(e) {
              // Two-press pattern. Sighted mouse users get a hover preview (caption
              // + highlight) before committing; keyboard users used to get none —
              // the first key press navigated away. Now the first press previews
              // the zone and announces its process, the same key again (or Enter /
              // Space) opens it, and Escape clears the preview.
              if (e.key === 't' || e.key === 'T') { e.preventDefault(); rkLsTourCmd('toggle'); return; }
              if ((e.key === 'n' || e.key === 'N') && rkLsTour.stage >= 0) { e.preventDefault(); rkLsTourCmd('next'); return; }
              if ((e.key === 'p' || e.key === 'P') && rkLsTour.stage >= 0) { e.preventDefault(); rkLsTourCmd('prev'); return; }
              var zoneIdx = -1;
              if (e.key === '1' || e.key === 'v' || e.key === 'V') zoneIdx = 0;
              else if (e.key === '2' || e.key === 'r' || e.key === 'R') zoneIdx = 1;
              else if (e.key === '3' || e.key === 'm' || e.key === 'M') zoneIdx = 2;
              else if ((e.key === 'Enter' || e.key === ' ') && hoverZone) { for (var zi = 0; zi < zones.length; zi++) if (zones[zi].id === hoverZone) zoneIdx = zi; }
              else if (e.key === 'Escape' && hoverZone) {
                e.preventDefault();
                hoverZone = null;
                rkLsAnnounce(__alloT('stem.rocks.landscape_preview_cleared', 'Zone preview cleared.'));
                if (rocksMotionReduced()) drawLandscape();
                return;
              }
              if (zoneIdx < 0) return;
              e.preventDefault();
              var z = zones[zoneIdx];
              if (hoverZone !== z.id) {
                hoverZone = z.id;
                rkLsAnnounce(z.label + '. ' + rkLsProcess(z.id) + '. ' + __alloT('stem.rocks.landscape_preview_open_hint', 'Press the same key again, Enter, or Space to open this zone; Escape to clear.'));
                if (rocksMotionReduced()) drawLandscape();
                return;
              }
              var typeRocks = ROCKS.filter(function (r) { return r.type === z.type; });
              if (typeRocks.length > 0) canvasEl._onSelectRock && canvasEl._onSelectRock(typeRocks[0].id, z.type);
              if (rocksMotionReduced()) drawLandscape();
            }
            canvasEl.addEventListener('keydown', onRockKey);
            // Imperative handle for the React controls under the canvas.
            canvasEl._rocksTourCmd = rkLsTourCmd;
            // Stopping is immediate: cancel the pending frame and paint one
            // static one. Resuming has to kick the loop by hand, because with
            // motion off nothing was left scheduling frames.
            canvasEl._rocksSetMotion = function (off) {
              canvasEl.dataset.rocksMotionOff = off ? '1' : '';
              cancelRocksFrame();
              if (off) drawLandscape(); else loop();
            };
            canvasEl._onTourJump = function () { if (_rocksTourBox.fn) _rocksTourBox.fn(); };
            canvasEl._rocksTourState = function () { return { stage: rkLsTour.stage, playing: rkLsTour.playing, total: RK_LS_TOUR.length }; };



            const ro = new ResizeObserver(function () {

              var newW = canvasEl.offsetWidth * dpr;

              var newH = canvasEl.offsetHeight * dpr;

              if (Math.abs(canvasEl.width - newW) > 1 || Math.abs(canvasEl.height - newH) > 1) {

                W = canvasEl.width = newW;
                H = canvasEl.height = newH;
                if (rocksMotionReduced()) drawLandscape();

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
              if (canvasEl._rocksSizeRetry && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._rocksSizeRetry);
              canvasEl._rocksSizeRetry = null;

            };

          };

          // Publish for the stable ref. Property assignment, so the ref React
          // holds keeps its identity and the canvas stays mounted.
          _rocksInitBox.fn = landscapeRef;

          // Zone clicks dispatch through here, so the canvas's handler is bound
          // once at mount but always runs the CURRENT render's closure.
          _rocksTourBox.fn = function () { if (!d.tourOn) upd('tourOn', true); };
          _rocksSelectBox.fn = function (rockId, type) {
            upd("selectedRock", rockId);
            upd("selectedType", type);
            upd("mode", "rocks");
            if (typeof canvasNarrate === 'function') {
              canvasNarrate('rocks', 'zone_select', {
                first: 'Exploring ' + type + ' rocks. Selected ' + rockId + ' from the ' + (type === 'igneous' ? 'volcano zone' : type === 'sedimentary' ? 'river delta zone' : 'mountain core zone') + '.',
                repeat: type + ' rock: ' + rockId + '.',
                terse: rockId + '.'
              }, { debounce: 500 });
            }
          };



          // The rock texture canvas renderer was removed here: the detail view
          // now uses rkRockSwatch at 100px, so the grid tile and the hand-lens
          // view are the same drawing at two sizes instead of two different
          // pictures of one specimen.



          // Cleanup ref — see rocksRootCleanupRef at module scope. This was the
          // OTHER half of the landscape re-init bug: making the canvas ref stable
          // was not enough, because this root-level ref was also inline. React
          // detached it on every commit, and its null branch reaches the canvas
          // by querySelector and runs the full teardown — so the animation was
          // still being destroyed on every render from here.



          return React.createElement("div", { ref: rocksRootCleanupRef, className: "max-w-4xl mx-auto animate-in fade-in duration-200" },

            // Header

            React.createElement("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 mb-3", "data-rocks-header": "responsive" },

              React.createElement("button", { onClick: function () { setStemLabTool(null); }, className: "transition-colors grid h-11 w-11 shrink-0 place-items-center hover:bg-slate-100 rounded-xl active:scale-[0.97]", 'aria-label': __alloT('stem.rocks.back_to_tools', 'Back to tools'), "data-rocks-header-action": "back" }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "min-w-0 flex-1 text-lg font-bold text-slate-800 tracking-tight leading-tight" + onHostInk }, "\uD83E\uDEA8 " + __alloT('stem.rocks.rocks_minerals_explorer', "Rocks & Minerals Explorer")),

              React.createElement("button", { onClick: function () { setStemLabTool('geologyExplorer'); }, title: __alloT('stem.rocks.open_3d_voxel_cross_section', 'Open the 3D voxel cross-section of the crust'), 'aria-label': __alloT('stem.rocks.open_geology_explorer_3d', 'Open Geology Explorer \u2014 3D voxel cross-section'), className: "transition-colors active:scale-[0.97] min-h-[44px] text-[11px] font-bold px-2.5 py-2 rounded-xl border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100", "data-rocks-header-action": "geology-3d" }, "\u26F0\uFE0F " + __alloT('stem.rocks.explore_in_3d', "Explore in 3D") + " \u2192"),

              // flex-wrap: six mode tabs on one non-wrapping row measured 441px,
              // so on a 390px phone the whole tool scrolled sideways and the last
              // tabs sat off-screen. The header is the one row a student cannot
              // work around, so it wraps rather than overflowing.
              React.createElement("div", { className: "order-3 flex w-full flex-wrap gap-1 sm:order-none sm:w-auto sm:ml-auto", "data-rocks-mode-nav": "responsive" },

                ['landscape', 'rocks', 'minerals', 'mystery', 'workbench', 'quiz', 'weathHunt'].map(function (m) {

                  const modeLabel = m === 'landscape' ? __alloT('stem.rocks.mode_landscape', 'Landscape') : m === 'rocks' ? __alloT('stem.rocks.mode_rocks', 'Rocks') : m === 'minerals' ? __alloT('stem.rocks.mode_minerals', 'Minerals') : m === 'mystery' ? __alloT('stem.rocks.mystery_rock', 'Mystery Rock') : m === 'workbench' ? __alloT('stem.rocks.mode_workbench', 'Workbench') : m === 'weathHunt' ? __alloT('stem.rocks.weathering_lab', 'Weathering Lab') : __alloT('stem.rocks.mode_quiz', 'Quiz');

                  return React.createElement("button", { "aria-label": __alloT('stem.rocks.switch_to_prefix', "Switch to ") + modeLabel + __alloT('stem.rocks.mode_suffix', " mode"),

                    key: m, onClick: function () {

                      upd("mode", m);

                      if (m === 'quiz') { upd("quizIdx", 0); upd("quizScore", 0); upd("quizFeedback", null); }

                      if (typeof canvasNarrate === 'function') { canvasNarrate('rocks', 'mode_switch', { first: 'Switched to ' + modeLabel + ' mode.', repeat: modeLabel + ' mode.', terse: m + '.' }, { debounce: 500 }); }

                    }, className: "min-h-[44px] px-3 py-2 rounded-lg text-xs font-bold capitalize " + (mode === m ? 'bg-amber-700 text-white' : 'transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 active:scale-[0.97]')

                  },

                    m === 'landscape' ? '🗺️ ' + __alloT('stem.rocks.mode_landscape', 'Landscape') : m === 'rocks' ? '🪨 ' + __alloT('stem.rocks.mode_rocks', 'Rocks') : m === 'minerals' ? '💎 ' + __alloT('stem.rocks.mode_minerals', 'Minerals') : m === 'mystery' ? '🔍 ' + __alloT('stem.rocks.mystery', 'Mystery') : m === 'workbench' ? '🔬 ' + __alloT('stem.rocks.mode_workbench', 'Workbench') : m === 'weathHunt' ? '⛏️ ' + __alloT('stem.rocks.weathering', 'Weathering') : '🧠 ' + __alloT('stem.rocks.mode_quiz', 'Quiz'));

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
                  React.createElement("span", { className: "text-sm font-bold text-amber-800" }, (d.researchPoints || 0) + " RP")
                ),
                React.createElement("span", {
                  className: "text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-700"
                }, (d.completedChallenges || []).length + "/" + ROCKS_CHALLENGES.length + " " + __alloT('stem.rocks.challenges', "challenges"))
              ),
              React.createElement("div", { className: "w-full rounded-full h-2.5 bg-orange-100", style: { boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" } },
                React.createElement("div", {
                  className: "bg-gradient-to-r from-amber-500 to-orange-500 h-2.5 rounded-full transition-all duration-500",
                  style: { width: Math.min(100, ((d.completedChallenges || []).length / ROCKS_CHALLENGES.length) * 100) + "%", boxShadow: "0 0 8px rgba(245,158,11,0.4)" }
                })
              ),
              React.createElement("div", { className: "flex flex-wrap gap-2 mt-3" },
                ROCKS_CHALLENGES.map(function(ch) {
                  var done = (d.completedChallenges || []).indexOf(ch.id) !== -1;
                  return React.createElement("div", {
                    key: ch.id, title: rkChallengeText(ch, 'name') + ": " + rkChallengeText(ch, 'desc') + " (" + ch.rp + " RP)",
                    className: "text-center cursor-default transition-all " + (done ? "drop-shadow-md" : "opacity-25 grayscale"),
                    style: { fontSize: "18px" }
                  }, ch.icon);
                })
              )
            ),

            // ── Topic-accent hero band per mode ──
            (function() {
              var MODE_META = {
                landscape: { accent: '#15803d', soft: 'rgba(22,163,74,0.10)', icon: '🗺️', title: __alloT('stem.rocks.hero_landscape_title', 'Landscape, the geology you can SEE'),           hint: __alloT('stem.rocks.hero_landscape_hint', 'Volcano, river delta, mountain face. Surface features tell you what\u2019s underneath. Plate tectonics + erosion + time = every landscape. The Hawaiian volcanoes are 30+ million years old; Mt. Etna is 500K.') },
                rocks:     { accent: '#92400e', soft: 'rgba(146,64,14,0.10)',  icon: '🪨', title: __alloT('stem.rocks.hero_rocks_title', 'Rocks: igneous, sedimentary, metamorphic'),     hint: __alloT('stem.rocks.hero_rocks_hint', 'Igneous (cooled magma: granite, basalt), sedimentary (compressed layers: sandstone, limestone), metamorphic (heat + pressure: marble, slate). The rock cycle moves stones between all three over millions of years.') },
                minerals:  { accent: '#0e7490', soft: 'rgba(8,145,178,0.10)',  icon: '💎', title: __alloT('stem.rocks.hero_minerals_title', 'Minerals, the building blocks of rocks'),         hint: __alloT('stem.rocks.hero_minerals_hint', 'Mohs scale 1-10: talc soft, diamond hardest. Streak, luster, cleavage, hardness, color = the 5 ID tests. Quartz is 12% of Earth\u2019s crust; you carry it in every grain of sand.') },
                mystery:   { accent: '#9333ea', soft: 'rgba(147,51,234,0.10)', icon: '🔍', title: __alloT('stem.rocks.hero_mystery_title', 'Mystery Rock, detective ID'),                  hint: __alloT('stem.rocks.hero_mystery_hint', 'Real geology workflow: observe (color, crystals, layers), test (hardness, streak, fizz with HCl for carbonate), classify. The fizz test alone separates limestone from a pile of look-alikes.') },
                workbench: { accent: '#b45309', soft: 'rgba(180,83,9,0.10)',  icon: '🔬', title: __alloT('stem.rocks.hero_wb_title', 'Mineral Workbench, evidence-first ID'),            hint: __alloT('stem.rocks.hero_wb_hint', 'Streak, scratch hardness, acid, magnet, and lens on an unknown specimen. Your notebook of observations eliminates suspects until only one mineral fits, the same way a field geologist works.') },
                quiz:      { accent: '#b45309', soft: 'rgba(217,119,6,0.10)',  icon: '🧠', title: __alloT('stem.rocks.hero_quiz_title', 'Quiz, graded ID + classification'),              hint: __alloT('stem.rocks.hero_quiz_hint', 'NGSS MS-ESS2-1: rock cycle as material system. AP ES practice: matching rocks to environment of formation. Builds the visual library so you can ID a rock at the Grand Canyon by sight.') },
                // weathHunt had no entry, so the fallback below quietly served the
                // LANDSCAPE banner: the Weathering tab announced itself as
                // "Landscape, the geology you can SEE".
                weathHunt: { accent: '#7c2d12', soft: 'rgba(124,45,18,0.10)',  icon: '⛏️', title: __alloT('stem.rocks.hero_weath_title', 'Weathering, how rock comes apart'),          hint: __alloT('stem.rocks.hero_weath_hint', 'Physical weathering breaks rock without changing it — ice wedging prises blocks apart and leaves ANGULAR debris. Chemical weathering dissolves minerals instead, rounding and pitting the surface. Climate decides which one wins.') }
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
                // text-slate-600, NOT the themed --allo-stem-text-soft token. In
                // dark theme the STEM host wraps every tool in a white card but leaves
                // the themed tokens resolving dark, so this hint rendered #94a3b8 at
                // 2.56:1 — the shape described in the shell module's own note. This
                // tool paints no themed ground anywhere, so its substrate is white in
                // BOTH themes and its ink is a fixed dark utility like every other
                // colour in the file.
                  React.createElement('p', { className: 'text-slate-600', style: { margin: '3px 0 0', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
                )
              );
            })(),



            // ── Landscape mode ──

            mode === 'landscape' && React.createElement("div", null,

              React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-2", role: "group", "aria-label": __alloT('stem.rocks.tour_controls_aria', 'Rock cycle tour controls') },
                React.createElement("button", { type: "button", "data-rocks-tour": d.tourOn ? 'stop' : 'play', "aria-pressed": !!d.tourOn, className: "rounded-xl px-3 py-2 min-h-[44px] text-[11px] font-black " + (d.tourOn ? "bg-amber-800 text-white hover:bg-amber-900" : "bg-amber-700 text-white hover:bg-amber-800"),
                  onClick: function () { var cv = document.querySelector('[data-rocks-canvas]'); if (cv && cv._rocksTourCmd) cv._rocksTourCmd(d.tourOn ? 'stop' : 'play'); upd('tourOn', !d.tourOn); } },
                  d.tourOn ? '■ ' + __alloT('stem.rocks.tour_stop', 'Stop the tour') : '▶ ' + __alloT('stem.rocks.tour_play', 'Follow one rock around the cycle')),
                d.tourOn ? React.createElement("button", { type: "button", "data-rocks-tour": "prev", className: "rounded-xl border border-amber-300 bg-white px-3 py-2 min-h-[44px] text-[11px] font-black text-amber-900 hover:bg-amber-50", "aria-label": __alloT('stem.rocks.tour_prev', 'Previous stage'), onClick: function () { var cv = document.querySelector('[data-rocks-canvas]'); if (cv && cv._rocksTourCmd) cv._rocksTourCmd('prev'); } }, '◀') : null,
                d.tourOn ? React.createElement("button", { type: "button", "data-rocks-tour": "next", className: "rounded-xl border border-amber-300 bg-white px-3 py-2 min-h-[44px] text-[11px] font-black text-amber-900 hover:bg-amber-50", "aria-label": __alloT('stem.rocks.tour_next', 'Next stage'), onClick: function () { var cv = document.querySelector('[data-rocks-canvas]'); if (cv && cv._rocksTourCmd) cv._rocksTourCmd('next'); } }, '▶') : null,
                React.createElement("button", { type: "button", "data-rocks-motion": d.motionOff ? 'off' : 'on', "aria-pressed": !!d.motionOff,
                  className: "rounded-xl border border-amber-300 bg-white px-3 py-2 min-h-[44px] text-[11px] font-black text-amber-900 hover:bg-amber-50",
                  onClick: function () {
                    var nextOff = !d.motionOff;
                    upd('motionOff', nextOff);
                    var cv = document.querySelector('[data-rocks-canvas]');
                    if (cv && cv._rocksSetMotion) cv._rocksSetMotion(nextOff);
                    if (typeof announceToSR === 'function') { try { announceToSR(nextOff ? __alloT('stem.rocks.motion_paused_sr', 'Scene motion paused. The cross-section is still fully readable.') : __alloT('stem.rocks.motion_resumed_sr', 'Scene motion resumed.')); } catch (e) {} }
                  }
                }, d.motionOff ? '\u25b6 ' + __alloT('stem.rocks.motion_resume', 'Resume motion') : '\u23f8 ' + __alloT('stem.rocks.motion_pause', 'Pause motion')),
                React.createElement("span", { className: "text-[10.5px] text-slate-600" + onHostInk }, d.tourOn ? __alloT('stem.rocks.tour_hint_on', 'Watch the tracer; each stage is announced. Reduced motion shows one still frame per stage.') : __alloT('stem.rocks.tour_hint_off', 'A guided trip through all five stages, one rock at a time. You can also click any process label on the picture to start there.'))
              ),
              React.createElement("p", { className: "text-xs text-slate-600 mb-2 italic" + onHostInk }, __alloT('stem.rocks.landscape_click_zones_hint', "Click landscape zones to explore rock types. Hover to see labels. Keyboard: Tab to canvas, then 1=Volcano, 2=River, 3=Mountain.") + ' ' + __alloT('stem.rocks.ls_not_to_scale', 'Vertical scale is exaggerated: the cross-section is schematic, not to scale.')),

              // Height follows width on narrow screens so the scene keeps its shape
              // (a fixed 520px at phone width squeezed it and collided the labels).
              React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-200", style: { height: 'clamp(280px, 58vw, 520px)' } },

                React.createElement("canvas", {

                  role: "img", tabIndex: 0, "aria-label": __alloT('stem.rocks.rock_cycle_diagram_aria', "Rock cycle diagram — click a rock type or process to explore how rocks transform."),
                  "data-rocks-canvas": "true",
                  "data-rocks-motion-off": d.motionOff ? '1' : undefined,

                  // Identity-stable (see rocksLandscapeCanvasRef). An inline
                  // function here re-initialised the whole canvas every render.
                  ref: rocksLandscapeCanvasRef,

                  style: { width: '100%', height: '100%' }

                })

              ),

              // Rock cycle legend

              React.createElement("div", { className: "flex flex-wrap justify-center gap-3 mt-3" },

                Object.values(ROCK_TYPES).map(function (rt) {

                  return React.createElement("div", { key: rt.label, className: "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border text-xs font-bold", style: { borderColor: rt.color, color: rt.ink } },

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

              React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 mb-3" },

                ROCKS.filter(function (r) { return !d.selectedType || r.type === d.selectedType; }).map(function (rock) {

                  const rt = ROCK_TYPES[rock.type];

                  return React.createElement("button", { key: rock.id, onClick: function () { upd("selectedRock", d.selectedRock === rock.id ? null : rock.id); upd("selectedMineral", null); },

                    // The tile used to be the rock-TYPE emoji, so all 20 rocks
                    // showed one of three pictures. The swatch draws this
                    // specimen's actual texture and grain colours instead.
                    "aria-label": rock.label + ', ' + rt.label + ' rock — ' + rkGloss(rock.texture),

                    className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +

                      (d.selectedRock === rock.id ? 'bg-white shadow-lg' : 'bg-slate-50 border-slate-200'),

                    style: d.selectedRock === rock.id ? { borderColor: rt.color, color: rt.ink } : {}

                  },

                    React.createElement("div", { className: "flex justify-center mb-1" }, rkRockSwatch(React.createElement, rock, 54)),

                    rock.label);

                })

              ),

              // ── Visual ID drill ──
              // The existing quiz asks about CONCEPTS ("which type forms from
              // magma?") and Mystery Rock needs a live AI call, so neither is an
              // offline test of "can you recognise this specimen?". This drill is
              // purely visual and purely local: it shows one specimen and asks for
              // its name. Distractors are drawn from the SAME rock type first,
              // which is where real confusion lives — granite vs diorite is a
              // genuine field call, granite vs shale is not.
              (function () {
                var vid = d.visualId || null;
                var vidAnswer = vid ? ROCKS.find(function (r) { return r.id === vid.rockId; }) : null;

                function pickFrom(list) {
                  return list.splice(Math.floor(Math.random() * list.length), 1)[0];
                }

                function startVisualId() {
                  var pool = ROCKS.slice();
                  var answer = pickFrom(pool);
                  // Don't ask the same specimen twice in a row.
                  if (vid && vid.rockId === answer.id && pool.length) answer = pickFrom(pool);

                  var sameType = ROCKS.filter(function (r) { return r.type === answer.type && r.id !== answer.id; });
                  var otherType = ROCKS.filter(function (r) { return r.type !== answer.type; });
                  var picks = [];
                  while (picks.length < 2 && sameType.length) picks.push(pickFrom(sameType));
                  while (picks.length < 3 && otherType.length) picks.push(pickFrom(otherType));

                  var opts = picks.concat([answer]);
                  for (var i = opts.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = opts[i]; opts[i] = opts[j]; opts[j] = tmp;
                  }

                  updMulti({
                    visualId: {
                      rockId: answer.id,
                      options: opts.map(function (o) { return o.id; }),
                      answered: false,
                      chosen: null,
                      score: (vid && vid.score) || 0,
                      asked: ((vid && vid.asked) || 0) + 1
                    }
                  });
                  sfxRockClick();
                  if (typeof announceToSR === 'function') {
                    announceToSR(__alloT('stem.rocks.sr_drill_new', 'New specimen shown. ') + rkGloss(answer.texture) + __alloT('stem.rocks.sr_drill_choose', '. Choose its name from four options.'));
                  }
                }

                function answerVisualId(rockId) {
                  if (!vid || vid.answered) return;
                  var correct = rockId === vid.rockId;
                  // Functional update, and the already-answered check is repeated
                  // against the LIVE state: `vid` here is the render-time snapshot,
                  // so a stale handler (or a double dispatch) must not be able to
                  // score the same round twice.
                  setLabToolData(function (prev) {
                    var r = Object.assign({}, (prev && prev.rocks) || {});
                    var cur = r.visualId;
                    if (!cur || cur.answered) return prev;
                    r.visualId = Object.assign({}, cur, {
                      answered: true,
                      chosen: rockId,
                      score: (cur.score || 0) + (rockId === cur.rockId ? 1 : 0)
                    });
                    return Object.assign({}, prev, { rocks: r });
                  });
                  if (correct) {
                    sfxRockCorrect();
                    if (typeof awardStemXP === 'function') awardStemXP(5, 'Visual rock ID');
                  } else {
                    sfxRockCrack();
                  }
                  if (typeof announceToSR === 'function') {
                    var truth = ROCKS.find(function (r) { return r.id === vid.rockId; });
                    announceToSR(correct ? 'Correct.' : 'Not quite. It was ' + (truth ? truth.label : '') + '.');
                  }
                }

                return React.createElement("div", { className: "mt-3 rounded-xl border-2 border-sky-300 bg-sky-50 p-3", role: "region", "aria-label": __alloT('stem.rocks.visual_id_region', "Visual rock identification drill") },
                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },
                    React.createElement("span", { className: "text-base", "aria-hidden": true }, "🔎"),
                    React.createElement("h4", { className: "font-bold text-sm text-sky-900" }, __alloT('stem.rocks.visual_id_title', "Visual ID drill")),
                    vid && vid.asked > 0 && React.createElement("span", { className: "ml-auto text-[11px] font-bold text-sky-900" },
                      (vid.score || 0) + " / " + (vid.answered ? vid.asked : Math.max(0, vid.asked - 1)) + " " + __alloT('stem.rocks.visual_id_correct', "correct"))
                  ),

                  !vid && React.createElement("div", null,
                    React.createElement("p", { className: "text-[11px] text-slate-700 mb-2" },
                      __alloT('stem.rocks.visual_id_intro', "No clues, no AI needed — just the specimen. Name it from what you can see. Wrong options are usually the same rock type, so look at texture and grain size, not colour alone.")),
                    React.createElement("button", {
                      type: "button",
                      onClick: startVisualId,
                      className: "px-4 py-1.5 bg-sky-800 hover:bg-sky-900 text-white font-bold text-xs rounded-full transition-colors active:scale-[0.97]"
                    }, "▶ " + __alloT('stem.rocks.visual_id_start', "Start drill"))
                  ),

                  vid && vidAnswer && React.createElement("div", null,
                    React.createElement("div", { className: "flex flex-col sm:flex-row gap-3 items-center sm:items-start" },
                      React.createElement("div", { className: "shrink-0 rounded-xl border-2 border-slate-400 overflow-hidden bg-white p-1" },
                        rkRockSwatch(React.createElement, vidAnswer, 96)),
                      React.createElement("div", { className: "flex-1 w-full" },
                        React.createElement("p", { className: "text-xs font-bold text-slate-800 mb-2" },
                          __alloT('stem.rocks.visual_id_prompt', "Which specimen is this?")),
                        React.createElement("div", { className: "grid grid-cols-2 gap-1.5" },
                          (vid.options || []).map(function (oid) {
                            var opt = ROCKS.find(function (r) { return r.id === oid; });
                            if (!opt) return null;
                            var isTruth = oid === vid.rockId;
                            var isChosen = vid.chosen === oid;
                            var cls = !vid.answered
                              ? "bg-white border-slate-300 text-slate-800 hover:border-sky-600"
                              : isTruth
                                ? "bg-emerald-100 border-emerald-700 text-emerald-900"
                                : isChosen
                                  ? "bg-red-100 border-red-700 text-red-900"
                                  : "bg-white border-slate-200 text-slate-600 opacity-70";
                            return React.createElement("button", {
                              key: oid,
                              type: "button",
                              disabled: vid.answered,
                              onClick: function () { answerVisualId(oid); },
                              "aria-label": opt.label,
                              className: "px-2 py-1.5 rounded-lg text-[11px] font-bold border-2 transition-colors text-left " + cls
                            }, opt.label);
                          })
                        )
                      )
                    ),

                    vid.answered && React.createElement("div", { className: "mt-2 p-2 rounded-lg bg-white border border-slate-300" },
                      React.createElement("p", { className: "text-xs font-black " + (vid.chosen === vid.rockId ? "text-emerald-800" : "text-red-800") },
                        vid.chosen === vid.rockId
                          ? "✅ " + __alloT('stem.rocks.visual_id_right', "Correct — ") + vidAnswer.label
                          : "❌ " + __alloT('stem.rocks.visual_id_wrong', "It was ") + vidAnswer.label),
                      React.createElement("p", { className: "text-[11px] text-slate-800 leading-snug mt-1" },
                        React.createElement("span", { className: "font-bold" }, ROCK_TYPES[vidAnswer.type].label + " · " + vidAnswer.texture + " — "),
                        rkGloss(vidAnswer.texture)),
                      React.createElement("button", {
                        type: "button",
                        onClick: startVisualId,
                        className: "mt-2 px-3 py-1 bg-sky-800 hover:bg-sky-900 text-white font-bold text-[11px] rounded-lg transition-colors active:scale-[0.97]"
                      }, "↻ " + __alloT('stem.rocks.visual_id_next', "Next specimen"))
                    )
                  )
                );
              })(),
              // Selected rock detail card

              selRock && React.createElement("div", { className: "bg-white rounded-xl border-2 p-4 animate-in fade-in", style: { borderColor: ROCK_TYPES[selRock.type].color } },

                React.createElement("div", { className: "flex gap-4" },

                  // Hand-lens view. This was a separate canvas renderer with its
                  // own crystal geometry, so the detail view and the grid tile
                  // drew the SAME rock differently — granite was grey and fine in
                  // the grid but pink with huge crystals here. Two pictures of one
                  // specimen is worse than none when the task is learning to
                  // recognise it, so both now come from rkRockSwatch: the tile is
                  // simply this at a smaller size.

                  React.createElement("div", {
                    className: "shrink-0 rounded-xl border-2 border-slate-300 bg-white p-1",
                    role: "img",
                    "aria-label": __alloT('stem.rocks.rock_texture_close_up', "Rock texture close-up") + ' — ' + selRock.label + ', ' + rkGloss(selRock.texture)
                  }, rkRockSwatch(React.createElement, selRock, 100)),

                  React.createElement("div", { className: "flex-1" },

                    React.createElement("h4", { className: "font-bold text-base mb-1", style: { color: ROCK_TYPES[selRock.type].ink } }, ROCK_TYPES[selRock.type].icon + " " + selRock.label),

                    React.createElement("span", { className: "inline-block px-2 py-0.5 rounded-full text-[11px] font-bold mb-2", style: { background: ROCK_TYPES[selRock.type].color + '20', color: ROCK_TYPES[selRock.type].ink } }, ROCK_TYPES[selRock.type].label + " Rock"),

                    React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, selRock.desc),

                  )

                ),

                // Properties

                React.createElement("div", { className: "grid grid-cols-3 gap-2 mt-3" },

                  [

                    { label: __alloT('stem.rocks.rock_hardness_label', 'Scratch resistance (approx.)'), value: '~' + selRock.hardness + '/10', icon: '💪', hint: __alloT('stem.rocks.rock_hardness_hint', 'Mohs is defined for MINERALS. A rock is a mixture, so the figure depends on which mineral the point lands on and on how well the grains are cemented.') },

                    // The texture slug alone ("clastic-coarse") means nothing to a
                    // student. Pair it with the plain-language gloss so the term,
                    // the swatch and the specimen photo all describe one thing.
                    { label: t('stem.rocks.texture'), value: selRock.texture, icon: '🔍', hint: rkGloss(selRock.texture) },

                    { label: t('stem.rocks.uses'), value: selRock.uses, icon: '🏗️' }

                  ].map(function (prop) {

                    return React.createElement("div", { key: prop.label, className: "bg-slate-50 rounded-lg p-2 text-center" },

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold" }, prop.icon + " " + prop.label),

                      React.createElement("p", { className: "text-xs font-bold text-slate-700 mt-0.5" }, prop.value),

                      prop.hint && React.createElement("p", { className: "text-[10px] text-slate-600 leading-snug mt-0.5" }, prop.hint));

                  })

                ),

                // Mohs scale bar

                React.createElement("div", { className: "mt-3" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1" }, __alloT('stem.rocks.rock_hardness_scale', "Roughly where that sits on the Mohs scale")),

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
                // ── Thin section under the polarizing microscope ──
                // Sits between the hand-specimen art above and the mineral tool's
                // atomic view: the magnification where a rock stops being a
                // texture and becomes a named list of minerals.
                RK_THIN_SECTION[selRock.id] && (function () {
                  var ts = d.thinSection || {};
                  var xpl = !!ts.xpl;
                  var stage = typeof ts.stage === 'number' ? ts.stage : 0;
                  var sec = RK_THIN_SECTION[selRock.id];
                  var setTS = function (patch) { upd('thinSection', Object.assign({}, ts, patch)); };

                  return React.createElement("div", { className: "border-t border-slate-200 pt-3 mt-3" },
                    React.createElement("p", { className: "text-xs font-black text-slate-800 mb-1 flex items-center gap-1.5" },
                      React.createElement("span", { "aria-hidden": true }, "🔬"),
                      React.createElement("span", null, __alloT('stem.rocks.thin_title', "Thin section — polarizing microscope")),
                      React.createElement("span", { className: "ml-auto text-[10px] font-bold text-slate-600" }, "≈" + sec.mag + "×")
                    ),
                    React.createElement("p", { className: "text-[11px] text-slate-700 mb-2 leading-snug" },
                      __alloT('stem.rocks.thin_intro', "A slice of the rock ground to 30 micrometres — thin enough for light to pass through. This is how the minerals in a rock are actually identified.")
                    ),

                    React.createElement("div", { className: "grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] items-start" },
                      React.createElement("div", { className: "rounded-xl border border-slate-300 bg-slate-100 p-2" },
                        rkThinSectionSvg(React.createElement, selRock, xpl, stage, __alloT)
                      ),

                      React.createElement("div", null,
                        // Illumination mode
                        React.createElement("div", { className: "flex gap-1 mb-2", role: "group", "aria-label": __alloT('stem.rocks.thin_mode_aria', "Illumination mode") },
                          [[false, __alloT('stem.rocks.thin_ppl', "Plane light"), 'PPL'], [true, __alloT('stem.rocks.thin_xpl', "Crossed polars"), 'XPL']].map(function (opt) {
                            var on = xpl === opt[0];
                            return React.createElement("button", {
                              key: opt[2], type: "button",
                              "aria-pressed": on,
                              onClick: function () { setTS({ xpl: opt[0] }); sfxRockClick(); },
                              className: "px-2.5 py-1 rounded-lg text-[11px] font-black border transition-colors " +
                                (on ? "bg-slate-800 border-slate-900 text-white" : "bg-white border-slate-300 text-slate-800 hover:bg-slate-100")
                            }, opt[1]);
                          })
                        ),

                        // Rotating stage. This model uses stage angle to teach
                        // extinction under crossed polars. Leaving an active
                        // no-op slider in plane light made the control look
                        // broken, so it now pauses and says exactly how to use it.
                        React.createElement("div", { className: "rounded-lg border p-2 " + (xpl ? "border-indigo-200 bg-indigo-50/60" : "border-slate-200 bg-slate-50") },
                          React.createElement("label", { htmlFor: "rk-stage", className: "block text-[11px] font-bold text-slate-700" },
                            __alloT('stem.rocks.thin_stage', "Stage angle: "),
                            React.createElement("span", { className: "font-mono text-slate-900" }, stage + "°")),
                          React.createElement("input", {
                            id: "rk-stage", type: "range", min: 0, max: 90, step: 1, value: stage,
                            disabled: !xpl,
                            onChange: function (e) { setTS({ stage: parseInt(e.target.value, 10) }); },
                            className: "w-full disabled:opacity-45 disabled:cursor-not-allowed",
                            "aria-describedby": "rk-stage-help",
                            "aria-label": __alloT('stem.rocks.thin_stage_aria', "Microscope stage angle in degrees; use crossed polars to observe extinction")
                          }),
                          xpl && React.createElement("p", { id: "rk-stage-help", className: "text-[11px] text-slate-700 leading-snug mt-1" },
                            __alloT('stem.rocks.thin_extinction', "Why rotate? Under crossed polars, turn the stage and watch individual grains darken and brighten. A crystal reaches extinction when it turns black. Anything that stays black at every angle is isotropic or opaque.")
                          ),
                          !xpl && React.createElement("p", { id: "rk-stage-help", className: "text-[11px] text-slate-700 leading-snug mt-1" },
                            __alloT('stem.rocks.thin_ppl_hint', "Plane light shows natural colour, relief and cleavage. In this model, stage rotation is used to investigate extinction: choose Crossed polars, then drag from 0° to 90° and watch different grains turn black.")
                          )
                        ),

                        React.createElement("p", { className: "text-[11px] text-slate-800 leading-snug mt-2 bg-slate-50 border border-slate-200 rounded-lg p-2" },
                          React.createElement("span", { className: "font-black" }, __alloT('stem.rocks.thin_what_you_see', "What you're looking at: ")),
                          __alloT('stem.rocks.thin_look_' + selRock.id, sec.look))
                      )
                    ),

                    // Mineral key — the payoff. This is the rock's composition, and
                    // each entry is a mineral the Minerals tab covers in its own right.
                    React.createElement("div", { className: "mt-2" },
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600 mb-1" },
                        __alloT('stem.rocks.thin_assemblage', "Minerals in this section")),
                      React.createElement("div", { className: "flex flex-wrap gap-1.5" },
                        sec.parts.map(function (p) {
                          var opt = RK_OPTICS[p[0]] || RK_OPTICS.clay;
                          return React.createElement("span", {
                            key: p[0],
                            className: "inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800 bg-white border border-slate-300 rounded-lg px-2 py-1",
                            title: __alloT('stem.rocks.opt_note_' + p[0], opt.note)
                          },
                            React.createElement("span", {
                              "aria-hidden": true,
                              style: {
                                width: '11px', height: '11px', borderRadius: '3px',
                                background: xpl ? (opt.iso || opt.opaque ? '#07070a' : opt.bire[0]) : opt.ppl,
                                border: '1px solid #64748b', display: 'inline-block'
                              }
                            }),
                            __alloT('stem.rocks.tsmin_' + p[0], p[0]) + ' ' + Math.round(p[1] * 100) + '%');
                        })
                      ),
                      React.createElement("ul", { className: "mt-1.5 space-y-0.5" },
                        sec.parts.map(function (p) {
                          var opt = RK_OPTICS[p[0]] || RK_OPTICS.clay;
                          return React.createElement("li", { key: p[0], className: "text-[10px] text-slate-700 leading-snug" },
                            React.createElement("span", { className: "font-bold text-slate-900" }, __alloT('stem.rocks.tsmin_' + p[0], p[0]) + ': '), __alloT('stem.rocks.opt_note_' + p[0], opt.note));
                        })
                      )
                    )
                  );
                })(),

                // Igneous Cooling Rate Simulator
                selRock && selRock.type === 'igneous' && (function() {
                  var coolingSpeed = d.coolingSpeed || 'slow';
                  var animProgress = d.coolingProgress || 0;
                  var isAnimActive = d.coolingAnimActive || false;
                  var speeds = [
                    {
                      id: 'slow', label: __alloT('stem.rocks.speed_slow_label', 'Slow (Intrusive)'),
                      desc: __alloT('stem.rocks.speed_slow_desc', 'Magma loses heat slowly at depth, so a few crystals have time to grow large.'),
                      where: __alloT('stem.rocks.speed_slow_where', 'Deep underground'),
                      atoms: __alloT('stem.rocks.speed_slow_atoms', 'Lots of time to migrate and join an ordered crystal lattice'),
                      texture: __alloT('stem.rocks.speed_slow_texture', 'Coarse-grained; large crystals visible to the eye'),
                      example: __alloT('stem.rocks.speed_slow_example', 'Granite or gabbro'),
                      visual: __alloT('stem.rocks.speed_slow_visual', 'Few large crystals'), duration: 3200
                    },
                    {
                      id: 'medium', label: __alloT('stem.rocks.speed_medium_label', 'Moderate'),
                      desc: __alloT('stem.rocks.speed_medium_desc', 'A shallow intrusion cools faster, leaving less growth time and medium-sized crystals.'),
                      where: __alloT('stem.rocks.speed_medium_where', 'Shallow underground intrusion'),
                      atoms: __alloT('stem.rocks.speed_medium_atoms', 'Some time to organize, but crystal growth stops sooner'),
                      texture: __alloT('stem.rocks.speed_medium_texture', 'Medium-grained; crystals are smaller but still distinct'),
                      example: __alloT('stem.rocks.speed_medium_example', 'Diabase (dolerite)'),
                      visual: __alloT('stem.rocks.speed_medium_visual', 'More medium crystals'), duration: 2400
                    },
                    {
                      id: 'fast', label: __alloT('stem.rocks.speed_fast_label', 'Fast (Extrusive)'),
                      desc: __alloT('stem.rocks.speed_fast_desc', 'Lava cools quickly at the surface, producing many crystals too small to see easily.'),
                      where: __alloT('stem.rocks.speed_fast_where', 'At or near Earth\'s surface'),
                      atoms: __alloT('stem.rocks.speed_fast_atoms', 'Little time to move before the melt becomes solid'),
                      texture: __alloT('stem.rocks.speed_fast_texture', 'Fine-grained; microscopic crystals'),
                      example: __alloT('stem.rocks.speed_fast_example', 'Basalt or rhyolite'),
                      visual: __alloT('stem.rocks.speed_fast_visual', 'Many tiny crystals'), duration: 1500
                    },
                    {
                      id: 'rapid', label: __alloT('stem.rocks.speed_rapid_label', 'Quenched (Glassy)'),
                      desc: __alloT('stem.rocks.speed_rapid_desc', 'Quenching locks the disordered melt in place before a crystal lattice can form.'),
                      where: __alloT('stem.rocks.speed_rapid_where', 'A chilled lava margin or contact with water'),
                      atoms: __alloT('stem.rocks.speed_rapid_atoms', 'Almost no time to organize into repeating structures'),
                      texture: __alloT('stem.rocks.speed_rapid_texture', 'Glassy; no mineral crystals'),
                      example: __alloT('stem.rocks.speed_rapid_example', 'Obsidian or volcanic glass'),
                      visual: __alloT('stem.rocks.speed_rapid_visual', 'Glass — no crystals'), duration: 800
                    }
                  ];
                  var currentSpeed = speeds.find(function(s) { return s.id === coolingSpeed; }) || speeds[0];
                  var canvasPhase = animProgress <= 0
                    ? __alloT('stem.rocks.cooling_phase_molten', 'Molten magma')
                    : animProgress < 30
                      ? __alloT('stem.rocks.cooling_phase_nuclei', 'Crystal nuclei forming')
                      : animProgress < 100
                        ? __alloT('stem.rocks.cooling_phase_growing', 'Crystals growing')
                        : currentSpeed.visual;
                  var modelStatus = animProgress <= 0
                    ? __alloT('stem.rocks.cooling_status_ready', 'Ready to run: the model begins with molten magma.')
                    : isAnimActive
                      ? __alloT('stem.rocks.cooling_status_active', 'Cooling in progress: watch the melt fade as crystals nucleate and grow.')
                      : __alloT('stem.rocks.cooling_status_complete', 'Model complete: ') + currentSpeed.texture + '.';

                  // Unlike the landscape and rock-cycle canvases, this one is
                  // MEANT to redraw every render — it has no animation loop or
                  // listeners, and the progress value is what drives the frame.
                  var coolingRef = function(canvasEl) {
                    if (!canvasEl) return;
                    var ctx = canvasEl.getContext('2d');
                    // Null on any canvas-less host; the clearRect below would throw.
                    if (!ctx) return;
                    var dpr = window.devicePixelRatio || 1;
                    // Give the model enough room for crystal-size differences to
                    // be legible. Draw in CSS pixels and scale once for HiDPI so
                    // the science diagram stays sharp without shrinking its art.
                    var W = 360, H = 225;
                    canvasEl.width = W * dpr;
                    canvasEl.height = H * dpr;
                    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                    ctx.clearRect(0,0,W,H);

                    var progress = animProgress / 100;
                    var melt = ctx.createLinearGradient(0, 0, W, H);
                    melt.addColorStop(0, 'rgba(251, 146, 60, ' + (1 - progress * 0.72) + ')');
                    melt.addColorStop(0.48, 'rgba(220, 38, 38, ' + (1 - progress * 0.82) + ')');
                    melt.addColorStop(1, 'rgba(127, 29, 29, ' + (1 - progress * 0.68) + ')');
                    ctx.fillStyle = melt;
                    ctx.fillRect(0,0,W,H);

                    // Atomic building blocks in the melt. Their scattered
                    // positions make the starting state visibly disordered;
                    // the crystal shapes below are the ordered outcome.
                    for (var atomI = 0; atomI < 54; atomI++) {
                      var atomX = 12 + ((atomI * 73) % 337);
                      var atomY = 48 + ((atomI * 47) % 158);
                      ctx.beginPath();
                      ctx.arc(atomX, atomY, 1.8 + (atomI % 3) * 0.55, 0, Math.PI * 2);
                      ctx.fillStyle = 'rgba(254, 240, 138, ' + Math.max(0.05, 0.56 * (1 - progress)) + ')';
                      ctx.fill();
                    }

                    ctx.save();
                    if (coolingSpeed === 'slow') {
                      var numCrystals = 6;
                      ctx.lineWidth = 1.8;
                      for (var i = 0; i < numCrystals; i++) {
                        var cx = W * (0.2 + (i % 3) * 0.3);
                        var cy = H * (0.3 + Math.floor(i / 3) * 0.45);
                        var size = H * 0.25 * progress;
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
                        var size = H * 0.13 * progress;
                        if (size > 0) {
                          ctx.beginPath();
                          ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
                          ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                          ctx.fill();
                          ctx.strokeStyle = 'rgba(255,255,255,0.32)';
                          ctx.lineWidth = 1;
                          ctx.stroke();
                        }
                      }
                    } else if (coolingSpeed === 'fast') {
                      var numCrystals = 80;
                      for (var i = 0; i < numCrystals; i++) {
                        var cx = W * (0.05 + (i % 10) * 0.1);
                        var cy = H * (0.08 + Math.floor(i / 10) * 0.11);
                        var size = H * 0.042 * progress;
                        if (size > 0) {
                          ctx.beginPath();
                          ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
                          ctx.fillStyle = selRock.grainColors[i % selRock.grainColors.length];
                          ctx.fill();
                        }
                      }
                    } else {
                      // A quench produces glass, not tiny crystals. Curved
                      // conchoidal fracture lines distinguish the finished
                      // glass from an empty black panel.
                      ctx.fillStyle = 'rgba(8, 10, 16, ' + progress + ')';
                      ctx.fillRect(0,0,W,H);
                      if (progress > 0.35) {
                        ctx.strokeStyle = 'rgba(191,219,254,' + (0.22 + progress * 0.3) + ')';
                        ctx.lineWidth = 2;
                        for (var glassArc = 0; glassArc < 4; glassArc++) {
                          ctx.beginPath();
                          ctx.arc(W * 0.44, H * 0.47, 34 + glassArc * 24, -0.65, 1.75);
                          ctx.stroke();
                        }
                        var sheen = ctx.createLinearGradient(W * 0.1, 0, W * 0.8, H);
                        sheen.addColorStop(0, 'rgba(255,255,255,0)');
                        sheen.addColorStop(0.5, 'rgba(148,163,184,0.20)');
                        sheen.addColorStop(1, 'rgba(255,255,255,0)');
                        ctx.fillStyle = sheen;
                        ctx.fillRect(0, 0, W, H);
                      }
                    }
                    ctx.restore();

                    if (progress < 1) {
                      ctx.fillStyle = 'rgba(251, 191, 36, ' + (0.3 * (1 - progress) * (1 + 0.2 * Math.sin(Date.now() * 0.005))) + ')';
                      ctx.fillRect(0,0,W,H);
                    }

                    // A visible phase label keeps the animation interpretable
                    // even when it is paused on its first or final frame.
                    ctx.fillStyle = 'rgba(15,23,42,0.82)';
                    ctx.fillRect(12, 12, W - 24, 31);
                    ctx.fillStyle = '#f8fafc';
                    ctx.font = '700 14px system-ui, sans-serif';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(canvasPhase, 23, 28);
                  };

                  var startCooling = function() {
                    updMulti({ coolingProgress: 0, coolingAnimActive: true });
                    sfxRockMelt();
                    var reduceMotion = false;
                    try { reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
                    if (reduceMotion) {
                      updMulti({ coolingProgress: 100, coolingAnimActive: false });
                      sfxRockCool();
                      return;
                    }
                    var elapsed = 0;
                    var interval = setInterval(function() {
                      elapsed += 50;
                      var p = Math.min(100, Math.round((elapsed / currentSpeed.duration) * 100));
                      upd("coolingProgress", p);
                      if (p >= 100) {
                        clearInterval(interval);
                        upd("coolingAnimActive", false);
                        sfxRockCool();
                      }
                    }, 50);
                  };

                  return React.createElement("div", { className: "border-t border-slate-200 pt-4 mt-4" },
                    React.createElement("p", { className: "text-sm font-black text-amber-900 mb-1.5 flex items-center gap-1.5" },
                      React.createElement("span", { "aria-hidden": true }, "🌋"),
                      React.createElement("span", null, __alloT('stem.rocks.magma_cooling_simulator_title', "Magma Cooling & Crystallization Simulator"))
                    ),
                    React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed mb-2" },
                      __alloT('stem.rocks.cooling_intro', "Change only the cooling rate and follow the evidence chain: time for atoms to move → crystal size → igneous texture.")
                    ),
                    React.createElement("p", { id: "rk-cooling-context", className: "text-xs text-slate-700 leading-relaxed rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3" },
                      React.createElement("span", { className: "font-black text-amber-900" }, __alloT('stem.rocks.cooling_current_specimen', "Current specimen: ")),
                      selRock.label + " (" + selRock.texture + "). ",
                      __alloT('stem.rocks.cooling_context', "Use the model to isolate cooling rate, then compare its predicted texture with this specimen. Chemistry, dissolved gas, and eruption style can also shape an igneous rock.")
                    ),

                    React.createElement("div", { className: "rounded-xl border border-amber-200 bg-white p-3 mb-3" },
                      React.createElement("p", { className: "text-xs font-black text-amber-900 mb-2" },
                        __alloT('stem.rocks.cooling_how_title', "How to use this model")
                      ),
                      React.createElement("ol", { className: "grid gap-2 sm:grid-cols-3", "aria-label": __alloT('stem.rocks.cooling_how_title', "How to use this model") },
                        [
                          __alloT('stem.rocks.cooling_walkthrough_choose', "Choose a cooling history."),
                          __alloT('stem.rocks.cooling_walkthrough_run', "Run solidification and watch crystal size change."),
                          __alloT('stem.rocks.cooling_walkthrough_compare', "Compare the predicted texture with the specimen and explain why.")
                        ].map(function(step, stepIndex) {
                          return React.createElement("li", { key: "cooling-step-" + stepIndex, className: "flex items-start gap-2 text-xs text-slate-700 leading-relaxed" },
                            React.createElement("span", { "aria-hidden": true, className: "shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-900 font-black" }, stepIndex + 1),
                            React.createElement("span", null, step)
                          );
                        })
                      )
                    ),

                    React.createElement("div", { className: "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] items-start" },
                      React.createElement("div", { className: "w-full order-2" },
                        React.createElement("p", { className: "text-xs font-black text-slate-800 mb-1.5" },
                          __alloT('stem.rocks.cooling_run_step', "Live solidification model")
                        ),
                        React.createElement("canvas", {
                          ref: coolingRef, role: "img", tabIndex: 0,
                          "aria-describedby": "rk-cooling-context rk-cooling-status",
                          "aria-label": __alloT('stem.rocks.crystal_cooling_diagram_aria', "Crystal cooling-rate model — slower cooling grows larger crystals.") + " " + currentSpeed.label + ": " + currentSpeed.visual + ". " + currentSpeed.texture + ".",
                          style: { width: '100%', maxWidth: '380px', height: 'auto', aspectRatio: '16 / 10', borderRadius: '12px', border: '2px solid #cbd5e1', display: 'block', background: '#1e293b' }
                        }),
                        React.createElement("div", { className: "mt-2 flex items-center gap-2" },
                          React.createElement("progress", {
                            value: animProgress, max: 100,
                            className: "h-2 flex-1 accent-amber-600",
                            "aria-label": __alloT('stem.rocks.cooling_progress_aria', "Solidification model progress")
                          }),
                          React.createElement("span", { className: "text-xs font-mono font-bold text-slate-700 min-w-[3ch] text-right" }, animProgress + "%")
                        ),
                        React.createElement("p", { id: "rk-cooling-status", role: "status", "aria-live": "polite", className: "mt-1 text-xs text-slate-700 leading-relaxed min-h-[2.5rem]" }, modelStatus),
                        React.createElement("button", {
                          type: "button", disabled: isAnimActive, onClick: startCooling,
                          className: "transition-colors mt-2 w-full min-h-11 px-4 py-2.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg text-sm shadow-sm disabled:opacity-50 active:scale-[0.99]"
                        }, isAnimActive
                          ? __alloT('stem.rocks.cooling_ellipsis', "Cooling...")
                          : "⚡ " + (animProgress >= 100
                            ? __alloT('stem.rocks.replay_solidification', "Replay solidification")
                            : __alloT('stem.rocks.run_solidification', "Run solidification")))
                      ),

                      React.createElement("div", { className: "w-full order-1" },
                        React.createElement("p", { className: "text-xs font-black text-slate-800 mb-1.5" },
                          __alloT('stem.rocks.cooling_choose_rate', "Cooling history controls")
                        ),
                        React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-2 mb-3", role: "group", "aria-label": __alloT('stem.rocks.cooling_rate_group', "Cooling history") },
                          speeds.map(function(s) {
                            var selected = coolingSpeed === s.id;
                            return React.createElement("button", {
                              key: s.id, type: "button", disabled: isAnimActive,
                              "aria-pressed": selected,
                              onClick: function() { updMulti({ coolingSpeed: s.id, coolingProgress: 0, coolingAnimActive: false }); sfxRockClick(); },
                              className: "min-h-[48px] px-2.5 py-2 rounded-lg text-xs font-bold text-center border transition-all disabled:opacity-50 " +
                                (selected ? "bg-amber-100 border-amber-500 text-amber-900 shadow-sm" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50")
                            }, s.label);
                          })
                        ),
                        React.createElement("p", { className: "text-sm text-slate-800 leading-relaxed font-semibold mb-3" }, currentSpeed.desc),
                        React.createElement("dl", { className: "grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" },
                          React.createElement("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-2.5" },
                            React.createElement("dt", { className: "text-xs font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.cooling_environment', "Environment")),
                            React.createElement("dd", { className: "mt-1 text-xs font-semibold text-slate-800 leading-relaxed" }, currentSpeed.where)
                          ),
                          React.createElement("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-2.5" },
                            React.createElement("dt", { className: "text-xs font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.cooling_atom_time', "Time for atoms")),
                            React.createElement("dd", { className: "mt-1 text-xs font-semibold text-slate-800 leading-relaxed" }, currentSpeed.atoms)
                          ),
                          React.createElement("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-2.5" },
                            React.createElement("dt", { className: "text-xs font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.cooling_result_texture', "Resulting texture")),
                            React.createElement("dd", { className: "mt-1 text-xs font-semibold text-slate-800 leading-relaxed" }, currentSpeed.texture)
                          )
                        ),
                        React.createElement("p", { className: "mt-2 text-xs text-slate-700" },
                          React.createElement("span", { className: "font-black text-slate-900" }, __alloT('stem.rocks.cooling_example', "Rock examples: ")),
                          currentSpeed.example
                        )
                      )
                    ),

                    React.createElement("div", { className: "mt-3 rounded-xl border border-orange-200 bg-orange-50 p-3" },
                      React.createElement("p", { className: "text-xs font-black text-orange-900" }, __alloT('stem.rocks.cooling_why_title', "Why geologists care")),
                      React.createElement("p", { className: "mt-1 text-xs text-slate-700 leading-relaxed" },
                        __alloT('stem.rocks.cooling_why', "Crystal size is a record of cooling history. Large visible crystals point to slow cooling underground; microscopic crystals point to fast cooling after eruption; glass records quenching so rapid that crystals never formed. Cooling rate controls texture, while magma chemistry helps determine which minerals and rock name result.")
                      ),
                      React.createElement("p", { className: "mt-2 text-xs font-bold text-orange-900" },
                        __alloT('stem.rocks.cooling_compare_prompt', "Try Slow and Quenched back-to-back: which result has visible crystals, and what did the atoms have time to do?")
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
                    __alloT('stem.rocks.acid_fizz_intro', "Use the virtual dilute-HCl dropper. A fizz means a carbonate, not a particular mineral: calcite, malachite and azurite all react at once. Some other carbonates, such as dolomite, react only weakly or when powdered, so no fizz is weaker evidence than a fizz.")
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
                            res = __alloT('stem.rocks.fizz_no_reaction', "No immediate visible fizz. That argues against calcite in this model; some other carbonates react weakly or only when powdered.");
                          }
                          updMulti({ fizzAnimActive: false, fizzResult: res });
                        }, 1200);
                      },
                      className: "px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-lg text-xs transition-all shadow-sm disabled:opacity-50 active:scale-[0.97]"
                    }, d.fizzAnimActive ? "🫧 " + __alloT('stem.rocks.dropping_acid', "Dropping Acid...") : "🧪 " + __alloT('stem.rocks.drop_hcl_acid', "Drop HCl Acid")),
                    d.fizzAnimActive && React.createElement("div", { className: "flex items-center gap-1 animate-pulse motion-reduce:animate-none" },
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
                  React.createElement("p", { className: "text-[10px] text-slate-600 mb-2" },
                    __alloT('stem.rocks.query_ai_about_prefix', "Query the AI about ") + selRock.label + __alloT('stem.rocks.query_ai_suffix', "'s geologic origin, chemical properties, or tectonic significance.")
                  ),
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("input", {
                      type: "text",
                      'aria-label': __alloT('stem.rocks.ask_petrologist_question', 'Ask the AI Petrologist a question'),
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
                // Null on any canvas-less host; the next fillStyle write would throw.
                if (!csCtx) { canvasEl._lastMineral = null; return; }

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

                // Seeded off the mineral id, not Math.random: these cleavage
                // traces are part of what a student is learning to recognise, so
                // they must not be redrawn differently on every visit.
                var csRnd = rkSeed(selMineral.id + '-cleavage');

                for (var cli = 0; cli < 4; cli++) {

                  csCtx.beginPath();

                  csCtx.moveTo(crystalX + csRnd() * crystalW * 0.3, crystalY + cli * crystalH * 0.25);

                  csCtx.lineTo(crystalX + crystalW * 0.7 + csRnd() * crystalW * 0.3, crystalY + cli * crystalH * 0.25 + crystalH * 0.15);

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

                React.createElement("section", { className: "rounded-xl border border-violet-200 bg-violet-50 p-2.5", "data-mohs-scale": "index-minerals", "aria-labelledby": "mohs-scale-title" },
                  React.createElement("p", { id: "mohs-scale-title", className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.mohs_scale_title', 'The Mohs scale, mineral by mineral')),
                  React.createElement("p", { className: "text-[10.5px] text-violet-900 mt-0.5 leading-snug" }, __alloT('stem.rocks.mohs_scale_body', 'Every step of the scale is a real mineral, from talc at 1 to diamond at 10, and all ten are in this catalogue. Open a step to see what defines it. The steps are a ranking, not a measurement: diamond is far harder than corundum, not one step harder.')),
                  React.createElement("ol", { className: "flex flex-wrap gap-1.5 mt-2", "aria-label": __alloT('stem.rocks.mohs_scale_aria', 'Mohs index minerals from 1 to 10') },
                    RK_MOHS_INDEX.map(function (step) {
                      var stepM = MINERALS.filter(function (m) { return m.id === step[0]; })[0];
                      if (!stepM) return null;
                      var stepOn = d.selectedMineral === stepM.id;
                      return React.createElement("li", { key: step[0] },
                        React.createElement("button", {
                          type: "button", "data-mohs-step": String(step[1]), "aria-pressed": stepOn,
                          className: "rounded-lg border px-1.5 py-1 min-h-[44px] flex items-center gap-1.5 " + (stepOn ? "border-violet-500 bg-white ring-2 ring-violet-300" : "border-violet-200 bg-white hover:border-violet-400"),
                          onClick: function () { upd("selectedMineral", stepOn ? null : stepM.id); upd("selectedRock", null); }
                        },
                          React.createElement("span", { className: "w-5 h-5 rounded-full bg-violet-700 text-white text-[10px] font-black flex items-center justify-center shrink-0", "aria-hidden": "true" }, String(step[1])),
                          React.createElement("span", { "aria-hidden": "true", className: "shrink-0 leading-none" }, rkMineralSwatch(React.createElement, stepM, 18)),
                          React.createElement("span", { className: "text-[10.5px] font-black text-violet-900" }, stepM.label)
                        )
                      );
                    })
                  )
                ),

                // Mineral grid
                React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 mb-3", "data-mineral-grid": "catalogue" },
                  MINERALS.map(function (mineral) {
                    return React.createElement("button", { key: mineral.id, onClick: function () { upd("selectedMineral", d.selectedMineral === mineral.id ? null : mineral.id); upd("selectedRock", null); },
                      // Was a flat colour dot, which showed nothing about the two
                      // properties a mineral key actually leads with. The swatch
                      // draws the crystal habit as the outline and the lustre as
                      // the shading, and the label says so for screen readers.
                      "aria-label": mineral.label + ' — ' + (mineral.crystal || '') + ' crystal, ' + (mineral.luster || '') + ' lustre, hardness ' + mineral.hardness,
                      className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +
                        (d.selectedMineral === mineral.id ? 'bg-white shadow-lg border-violet-400' : 'transition-colors bg-slate-50 border-slate-200 hover:border-violet-200'),
                      style: d.selectedMineral === mineral.id ? { borderColor: '#8b5cf6', color: '#6d28d9' } : {}
                    },
                      React.createElement("div", { className: "flex justify-center mb-1" }, rkMineralSwatch(React.createElement, mineral, 46)),
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

                    // Neutral surface, NOT the mineral's own colour. This card used
                    // style={{ background: selMineral.color }} behind slate-800 text,
                    // so every dark mineral rendered unreadable — magnetite at
                    // 1.00:1 (its text and its background are the same colour),
                    // garnet 1.46, corundum 1.68, hematite 1.76, fluorite 2.57,
                    // olivine 2.93. It also forced `color` to be a pale UI tint
                    // rather than the specimen's actual colour, which is why pyrite
                    // was cream instead of brass. A swatch below carries the colour.
                    return React.createElement("div", { key: prop.label, className: "rounded-lg p-2.5 text-center bg-slate-50 border border-slate-200" },

                      React.createElement("p", { className: "text-[11px] text-slate-600 font-bold" }, prop.icon + " " + prop.label),

                      React.createElement("p", { className: "text-sm font-bold text-slate-800 mt-0.5" }, prop.value));

                  })

                ),

                selMineral.uses && React.createElement("div", { className: "bg-blue-50 rounded-lg p-2.5" },

                  React.createElement("p", { className: "text-[11px] font-bold text-blue-800 uppercase mb-0.5" }, "\uD83C\uDFD7\uFE0F " + __alloT('stem.rocks.uses_heading', "Uses")),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" }, selMineral.uses)

                ),

                selMineral.funFact && React.createElement("div", { className: "bg-amber-50 rounded-lg p-2.5 border border-amber-200" },

                  React.createElement("p", { className: "text-[11px] font-bold text-amber-800 uppercase mb-0.5" }, "\uD83D\uDCA1 " + __alloT('stem.rocks.fun_fact_heading', "Fun Fact")),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed italic" }, selMineral.funFact)

                ),

                selMineral.occurrence && React.createElement("div", { className: "bg-emerald-50 rounded-lg p-2.5" },

                  React.createElement("p", { className: "text-[11px] font-bold text-emerald-800 uppercase mb-0.5" }, "\uD83C\uDF0D " + __alloT('stem.rocks.where_found_heading', "Where Found")),

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
                    __alloT('stem.rocks.mohs_scratch_intro', 'Select a scratch tool and run the test. A harder tool leaves a scratch, a softer tool does not, and equal modeled hardness is a borderline result that should be retested.')
                  ),
                  React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-3" },
                    [
                      { id: 'fingernail', label: '💅 ' + __alloT('stem.rocks.tool_fingernail', 'Fingernail'), h: 2.5 },
                      { id: 'penny', label: '🪙 ' + __alloT('stem.rocks.tool_copper_reference', 'Copper reference (modeled)'), h: 3.5 },
                      { id: 'steel_nail', label: '▱ ' + __alloT('stem.rocks.tool_glass_reference', 'Glass reference (modeled)'), h: 5.5 },
                      { id: 'streak_plate', label: '🍽️ ' + __alloT('stem.rocks.tool_streak_plate', 'Streak Plate'), h: 6.5 },
                      { id: 'drill_bit', label: '⌁ ' + __alloT('stem.rocks.tool_calibrated_point', 'Calibrated point (modeled)'), h: 8.5 },
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
                        React.createElement("div", { className: "text-[10px] text-slate-600 font-mono mt-0.5" }, "H: " + tool.h)
                      );
                    })
                  ),
                  React.createElement("p", { className: "text-[10px] text-slate-600 -mt-1 mb-3" }, __alloT('stem.rocks.reference_variability_note', 'Reference values are modeled; real objects vary.')),
                  d.scratchTool && (function() {
                    var toolData = [
                      { id: 'fingernail', label: __alloT('stem.rocks.tool_fingernail', 'Fingernail'), h: 2.5 },
                      { id: 'penny', label: __alloT('stem.rocks.tool_copper_reference', 'Copper reference (modeled)'), h: 3.5 },
                      { id: 'steel_nail', label: __alloT('stem.rocks.tool_glass_reference', 'Glass reference (modeled)'), h: 5.5 },
                      { id: 'streak_plate', label: __alloT('stem.rocks.tool_streak_plate', 'Streak Plate'), h: 6.5 },
                      { id: 'drill_bit', label: __alloT('stem.rocks.tool_calibrated_point', 'Calibrated point (modeled)'), h: 8.5 },
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
                          var scratchOutcome = rkScratchOutcome(toolData.h, selMineral.hardness);
                          var text = "";
                          if (scratchOutcome === 'scratched') {
                            text = __alloT('stem.rocks.scratch_success_a', "Result: Scratch created! The ") + toolData.label + " (" + toolData.h + ") " + __alloT('stem.rocks.scratch_success_b', "successfully scratched ") + selMineral.label + " (" + selMineral.hardness + ").";
                            sfxRockCrack();
                          } else if (scratchOutcome === 'borderline') {
                            text = __alloT('stem.rocks.scratch_borderline', "Modeled near-match—retest to confirm") + ". " + __alloT('stem.rocks.scratch_borderline_detail', "The tool and mineral share the same modeled Mohs value, so the model narrows to approximate equality; real specimens vary, so confirm with another reference.");
                            sfxRockCool();
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
                      React.createElement("div", { className: "flex justify-between items-center gap-2 mb-2" },
                        React.createElement("span", { className: "text-[11px] font-bold text-slate-700" }, __alloT('stem.rocks.active_tool_label', "Active Tool: ") + toolData.label + " (" + __alloT('stem.rocks.hardness_word', "Hardness") + " " + toolData.h + ")"),
                        // The old condition was `animProgress === 0`, so once a run
                        // finished at 100 the button disappeared and the only way to
                        // retest was to re-pick a tool. Show it whenever idle.
                        (animProgress === 0 || animProgress >= 100) && React.createElement("button", {
                          onClick: runTest,
                          className: "px-3 py-1 bg-violet-700 hover:bg-violet-800 text-white rounded-lg text-[10px] font-bold transition-colors shadow-sm active:scale-[0.97] shrink-0"
                        }, (animProgress >= 100 ? "↻ " + __alloT('stem.rocks.run_scratch_again', "Test again") : "⚡ " + __alloT('stem.rocks.run_scratch_test', "Run Scratch Test")))
                      ),
                      // Watch the tool travel, see whether it cuts a groove or just
                      // smears itself off, and read both hardnesses on one Mohs
                      // strip — the result text alone never showed the WHY.
                      animProgress > 0 && React.createElement("div", { className: "rounded-lg border border-slate-300 bg-white p-2 mb-2" },
                        rkScratchSvg(React.createElement, selMineral, toolData.label, toolData.h, animProgress, animProgress >= 100, __alloT)
                      ),
                      animProgress > 0 && animProgress < 100 && React.createElement("div", { className: "w-full bg-slate-200 h-2.5 rounded-full overflow-hidden mb-2" },
                        React.createElement("div", {
                          className: "bg-violet-700 h-full transition-all duration-75",
                          style: { width: animProgress + '%' }
                        })
                      ),
                      d.scratchResult && React.createElement("p", { className: "text-xs font-bold text-slate-800 leading-relaxed animate-in fade-in" },
                        d.scratchResult
                      ),

                      // The tool measures hardness here and explains WHY that
                      // hardness happens in the 3D panel below, but the two never
                      // referred to each other — so the result read as a bare fact
                      // rather than something the student can go and account for.
                      // Only shown for minerals whose real structure is drawn;
                      // pointing at a generic unit cell would promise an
                      // explanation the panel does not actually contain.
                      d.scratchResult && RK_LATTICE[selMineral.id] && React.createElement("p", { className: "text-[11px] text-slate-700 leading-snug mt-1.5" },
                        __alloT('stem.rocks.scratch_see_structure', "Why is it this hard? Scroll to 3D crystal structure below — ") +
                        (selMineral.hardness >= 7
                          ? __alloT('stem.rocks.scratch_hard_hint', "strongly bonded in every direction leaves nothing to break along.")
                          : selMineral.hardness <= 3
                            ? __alloT('stem.rocks.scratch_soft_hint', "look for the weak gaps between the strongly bonded parts; that is what gives way.")
                            : __alloT('stem.rocks.scratch_mid_hint', "the bond strength and how evenly it is spread set where this sits on the scale."))
                      )
                    );
                  })()
                ),

                // ── 3D crystal structure lab ──
                // Habit, hardness, streak and cleavage are all consequences of
                // how the atoms are stacked, and that was the one thing the tool
                // never showed. Runs on the host viewer shell, so it inherits the
                // tested lifecycle: CDN load, context-loss retry, teardown, and a
                // 'failed' status when WebGL or the network is unavailable.
                (function () {
                  _rkCrystalBox.mineral = selMineral;
                  var spec = RK_LATTICE[selMineral.id];
                  var cellInfo = rkCellGeometryFor(selMineral.crystal);
                  var cs = d.crystal3d || {};
                  var setCS = function (patch) { upd('crystal3d', Object.assign({}, cs, patch)); };

                  // Derived from the atoms the generator ACTUALLY emits, not from
                  // spec.a/spec.b. Several structures push species directly —
                  // olivine and feldspar their oxygens, feldspar its aluminium,
                  // magnetite a second iron site — and a key built from a/b left
                  // those spheres unlabelled, which is the one thing the key is
                  // for. Deriving it means new structures label themselves.
                  var species = spec
                    ? rkLatticeAtoms(spec.kind, spec.a, spec.b, spec.c)
                        .map(function (at) { return at.sp; })
                        .filter(function (v, i, arr) { return arr.indexOf(v) === i; })
                    : ['X'];

                  return React.createElement("div", { className: "border-t border-violet-100 pt-3 mt-3" },
                    React.createElement("p", { className: "text-xs font-black text-violet-800 mb-1 flex items-center gap-1.5" },
                      React.createElement("span", { "aria-hidden": true }, "🧊"),
                      React.createElement("span", null, __alloT('stem.rocks.crystal3d_title', "3D crystal structure"))
                    ),
                    // `exact` was set on every row in RK_LATTICE and read by
                    // nothing — a disclosure that lived in the data and never
                    // reached a student. Every mineral with a structure was
                    // introduced as "how the atoms are actually stacked",
                    // including the ones drawn as a simplified layer model.
                    React.createElement("p", { className: "text-[11px] text-slate-700 mb-2" },
                      !spec
                        ? __alloT('stem.rocks.crystal3d_intro_cell', "Drag to rotate the unit cell — the smallest repeating box of this mineral's crystal system.")
                        : spec.exact
                          ? __alloT('stem.rocks.crystal3d_intro_exact', "This is how the atoms are actually stacked inside the mineral. Drag to rotate.")
                          : __alloT('stem.rocks.crystal3d_intro_model', "A simplified teaching model: it preserves the key arrangement described below, but not every atom or exact position. Drag to rotate.")
                    ),

                    // The container is KEYED on the mineral id: the host viewer
                    // builds its scene once per attach, so re-keying is what makes
                    // React unmount and remount the node and get a clean rebuild
                    // when the student picks a different mineral.
                    React.createElement("div", {
                      key: 'crystal-' + selMineral.id,
                      ref: rkCrystalRef,
                      className: "relative w-full rounded-xl overflow-hidden border-2 border-slate-700 bg-slate-900",
                      style: { height: '240px' },
                      role: "img",
                      "aria-label": (spec
                        ? selMineral.label + __alloT('stem.rocks.lat_aria_structure', ' atomic structure: ') + __alloT('stem.rocks.lat_why_' + selMineral.id, spec.why)
                        : selMineral.label + __alloT('stem.rocks.lat_aria_cell', ' unit cell: ') + __alloT('stem.rocks.geo_note_' + cellInfo.key, cellInfo.geo.note) + '.')
                    }),

                    // Controls. Rotation was drag-only, which excludes keyboard,
                    // switch and most touch users.
                    React.createElement("div", { className: "flex flex-wrap gap-1 mt-2", role: "group", "aria-label": __alloT('stem.rocks.crystal3d_controls', "Crystal view controls") },
                      [
                        ['◀', __alloT('stem.rocks.crystal3d_left', 'Rotate left'), function () { RK_CRYSTAL_VIEWER.nudge(-0.3, 0); }],
                        ['▶', __alloT('stem.rocks.crystal3d_right', 'Rotate right'), function () { RK_CRYSTAL_VIEWER.nudge(0.3, 0); }],
                        ['▲', __alloT('stem.rocks.crystal3d_up', 'Tilt up'), function () { RK_CRYSTAL_VIEWER.nudge(0, 0.2); }],
                        ['▼', __alloT('stem.rocks.crystal3d_down', 'Tilt down'), function () { RK_CRYSTAL_VIEWER.nudge(0, -0.2); }],
                        ['＋', __alloT('stem.rocks.crystal3d_in', 'Zoom in'), function () { RK_CRYSTAL_VIEWER.zoom(-0.6); }],
                        ['－', __alloT('stem.rocks.crystal3d_out', 'Zoom out'), function () { RK_CRYSTAL_VIEWER.zoom(0.6); }],
                        ['↺', __alloT('stem.rocks.crystal3d_reset', 'Reset view'), function () { RK_CRYSTAL_VIEWER.reset(); }]
                      ].map(function (btn) {
                        return React.createElement("button", {
                          key: btn[1], type: "button", onClick: btn[2], "aria-label": btn[1], title: btn[1],
                          className: "px-2.5 py-1 rounded-lg text-xs font-black border border-slate-400 bg-white text-slate-800 hover:bg-slate-100 transition-colors active:scale-[0.97]"
                        }, btn[0]);
                      })
                    ),

                    // Atom key — the spheres mean nothing without it.
                    React.createElement("div", { className: "flex flex-wrap gap-2 mt-2" },
                      species.map(function (sp) {
                        var def = RK_ATOM[sp] || RK_ATOM.X;
                        var atomLabel = __alloT('stem.rocks.atom_' + sp, def.label);
                        return React.createElement("span", { key: sp, className: "inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-800" },
                          React.createElement("span", {
                            "aria-hidden": true,
                            style: {
                              width: '12px', height: '12px', borderRadius: '9999px',
                              background: '#' + def.color.toString(16).padStart(6, '0'),
                              border: '1px solid #334155', display: 'inline-block'
                            }
                          }),
                          atomLabel);
                      })
                    ),

                    // Why the structure explains the property — the actual payoff.
                    React.createElement("p", { className: "text-[11px] text-slate-800 leading-relaxed mt-2 bg-violet-50 border border-violet-200 rounded-lg p-2" },
                      React.createElement("span", { className: "font-black text-violet-900" }, __alloT('stem.rocks.crystal3d_why', "Why it matters: ")),
                      spec ? __alloT('stem.rocks.lat_why_' + selMineral.id, spec.why) : (selMineral.label + __alloT('stem.rocks.lat_cell_a', ' crystallises in the ') + __alloT('stem.rocks.sys_' + cellInfo.key, cellInfo.key) + __alloT('stem.rocks.lat_cell_b', ' system — ') + __alloT('stem.rocks.geo_note_' + cellInfo.key, cellInfo.geo.note) + __alloT('stem.rocks.lat_cell_c', '. That symmetry can influence its observed form and cleavage.'))
                    ),

                    // Say plainly when the drawing is the SYSTEM's cell rather than
                    // this mineral's real atomic arrangement. Inventing an
                    // authoritative-looking structure would be worse than saying so.
                    !spec && React.createElement("p", { className: "text-[10px] text-slate-700 leading-snug mt-1.5 italic" },
                      __alloT('stem.rocks.crystal3d_model_limit', "Model limit: this shows the unit-cell geometry of the ") + cellInfo.key +
                      __alloT('stem.rocks.crystal3d_model_limit_b', " system, not this mineral's full atomic arrangement — that structure is more complex than this view is built to show.")
                    ),

                    // There are TWO ways this view fails and they need different
                    // answers. A blocked CDN is a network problem a school can fix;
                    // a host module older than the tool is a deploy problem no
                    // amount of network access will help. Offering only the first
                    // explanation sends anyone hitting the second down the wrong path.
                    RK_CRYSTAL_UNAVAILABLE === 'host'
                      ? React.createElement("p", { className: "text-[11px] text-slate-800 mt-1.5 bg-amber-50 border border-amber-300 rounded-lg p-2" },
                          React.createElement("span", { className: "font-black" }, __alloT('stem.rocks.crystal3d_host_stale_label', "3D unavailable: ")),
                          __alloT('stem.rocks.crystal3d_host_stale', "this build's STEAM Lab host is older than this tool and does not provide the 3D viewer. Everything else on this page works normally; the structure is described in full above.")
                        )
                      : React.createElement("p", { className: "text-[11px] text-slate-700 mt-1.5" },
                          __alloT('stem.rocks.crystal3d_offline_note', "If the 3D view stays blank, the engine is served from a CDN your network may block — every other panel on this page still works offline.")
                        )
                  );
                })(),
                // Streak Test Lab
                React.createElement("div", { className: "border-t border-violet-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-violet-700 mb-2 flex items-center gap-1.5" },
                    React.createElement("span", null, "🍽️"),
                    React.createElement("span", null, __alloT('stem.rocks.streak_plate_test_lab', "Streak Plate Test Lab"))
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                    __alloT('stem.rocks.streak_test_intro', 'Scratch the mineral across an unglazed porcelain streak plate (modeled Mohs 6.5). Softer minerals leave powder whose color can aid identification; harder minerals scratch the plate, so no reliable powder streak is produced.')
                  ),
                  // The plate itself is now drawn, with the specimen's outward
                  // colour beside the powder colour — that contrast IS the lesson,
                  // and a 40x14 swatch was not making it.
                  React.createElement("div", { className: "rounded-xl border border-slate-300 bg-white p-2 mb-2" },
                    rkStreakPlateSvg(React.createElement, selMineral, !!d.streakResult, __alloT)
                  ),
                  React.createElement("div", { className: "flex items-center gap-3 flex-wrap" },
                    React.createElement("button", {
                      disabled: d.streakAnimActive,
                      onClick: function() {
                        upd("streakAnimActive", true);
                        upd("streakResult", null);
                        sfxRockCrack();
                        setTimeout(function() {
                          var res = rkStreakPlateTooHard(selMineral)
                            ? __alloT('stem.rocks.streak_plate_scratched_result', "Plate scratched — no reliable powder streak")
                            : __alloT('stem.rocks.powder_streak_result', "Powder Streak Result: ") + selMineral.streak;
                          updMulti({ streakAnimActive: false, streakResult: res });
                        }, 800);
                      },
                      className: "px-3 py-1.5 bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 active:scale-[0.97]"
                    }, d.streakAnimActive ? "✏️ " + __alloT('stem.rocks.scratching_plate', "Scratching plate...") : "🍽️ " + __alloT('stem.rocks.perform_streak_test', "Perform Streak Test")),
                    d.streakResult && React.createElement("span", { className: "text-xs font-bold text-slate-800 animate-in fade-in" }, d.streakResult),
                    d.streakResult && selMineral.streak && !rkStreakPlateTooHard(selMineral) && !selMineral.streak.includes('None') &&
                      React.createElement("p", { className: "text-[11px] text-slate-700 basis-full leading-snug" },
                        __alloT('stem.rocks.streak_vs_colour', "Compare the two chips: the powder colour is the reliable identifier, because a mineral's outward colour can vary with impurities while its streak does not."))
                  )
                ),

                // Acid Fizz Test Lab
                React.createElement("div", { className: "border-t border-violet-100 pt-3 mt-3" },
                  React.createElement("p", { className: "text-xs font-black text-violet-700 mb-2 flex items-center gap-1.5" },
                    React.createElement("span", null, "🧪"),
                    React.createElement("span", null, __alloT('stem.rocks.acid_fizz_test_lab', "Acid Fizz Test Lab"))
                  ),
                  React.createElement("p", { className: "text-[11px] text-slate-600 mb-3" },
                    __alloT('stem.rocks.acid_fizz_intro', "Use the virtual dilute-HCl dropper. A fizz means a carbonate, not a particular mineral: calcite, malachite and azurite all react at once. Some other carbonates, such as dolomite, react only weakly or when powdered, so no fizz is weaker evidence than a fizz.")
                  ),
                  // Carbonate status drives the drawing too, so it is derived once
                  // from the module-scope list the workbench also reads.
                  (function () {
                    var isCarb = RK_CARBONATE_IDS.indexOf(selMineral.id) !== -1;
                    return React.createElement("div", null,
                      React.createElement("div", { className: "rounded-xl border border-slate-300 bg-white p-2 mb-2" },
                        rkFizzSvg(React.createElement, selMineral, !!d.fizzAnimActive, !!d.fizzResult, isCarb, __alloT)
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
                              var res = "";
                              if (isCarb) {
                                res = "🫧 " + __alloT('stem.rocks.fizz_positive', "Fizz! The acid reacted with calcium carbonate in the specimen, releasing carbon dioxide gas:") + " CaCO3 + 2HCl -> CaCl2 + CO2 (gas) + H2O.";
                              } else {
                                res = __alloT('stem.rocks.fizz_no_reaction', "No immediate visible fizz. That argues against calcite in this model; some other carbonates react weakly or only when powdered.");
                              }
                              updMulti({ fizzAnimActive: false, fizzResult: res });
                            }, 1200);
                          },
                          className: "px-3 py-1.5 bg-violet-700 hover:bg-violet-800 text-white font-bold rounded-lg text-xs transition-colors shadow-sm disabled:opacity-50 active:scale-[0.97]"
                        }, d.fizzAnimActive ? "🫧 " + __alloT('stem.rocks.dropping_acid', "Dropping Acid...") : "🧪 " + __alloT('stem.rocks.drop_hcl_acid', "Drop HCl Acid")),
                        d.fizzAnimActive && React.createElement("div", { className: "flex items-center gap-1 animate-pulse motion-reduce:animate-none" },
                          React.createElement("span", { className: "text-lg", "aria-hidden": true }, "🫧"),
                          React.createElement("span", { className: "text-[10px] text-violet-800 font-bold" }, __alloT('stem.rocks.bubbling_reaction_active', "Bubbling reaction active..."))
                        )
                      )
                    );
                  })(),
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
                  React.createElement("p", { className: "text-[10px] text-slate-600 mb-2" },
                    __alloT('stem.rocks.query_ai_about_prefix', "Query the AI about ") + selMineral.label + __alloT('stem.rocks.query_ai_suffix', "'s geologic origin, chemical properties, or tectonic significance.")
                  ),
                  React.createElement("div", { className: "flex gap-2" },
                    React.createElement("input", {
                      type: "text",
                      'aria-label': __alloT('stem.rocks.ask_petrologist_question', 'Ask the AI Petrologist a question'),
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

                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.rocks.sr_mystery_ready', 'Mystery rock ready. First clue revealed.'));

                }).catch(function () {

                  upd("mystery", { rockId: pick.id, clues: [], cluesShown: 0, revealed: false, solved: false, loading: false, lastGuess: null, error: __alloT('stem.rocks.could_not_reach_ai', 'Could not reach AI tutor. Try again in a moment.') });

                });

              }



              function revealNextClue() {

                if (cluesShown < clues.length) {

                  upd("mystery", Object.assign({}, myst, { cluesShown: cluesShown + 1 }));

                  sfxRockClick();

                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.rocks.sr_clue', 'Clue ') + (cluesShown + 1) + __alloT('stem.rocks.sr_clue_of', ' of ') + clues.length + ': ' + clues[cluesShown]);

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

                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.rocks.sr_mystery_correct', 'Correct! The mystery rock was ') + mysteryRock.label + '.');

                } else {

                  rockTone(200, 0.1, 'sawtooth', 0.05);

                  upd("mystery", Object.assign({}, myst, { lastGuess: rockId, cluesShown: Math.min(cluesShown + 1, clues.length) }));

                  if (typeof announceToSR === 'function') announceToSR(__alloT('stem.rocks.sr_mystery_wrong', 'Not quite. Next clue revealed.'));

                }

              }



              function giveUp() {

                if (!mysteryRock) return;

                upd("mystery", Object.assign({}, myst, { revealed: true, cluesShown: clues.length }));

                if (typeof announceToSR === 'function') announceToSR(__alloT('stem.rocks.sr_mystery_reveal', 'Answer revealed: ') + mysteryRock.label + '.');

              }



              return React.createElement("div", { className: "mt-2", role: "region", "aria-label": __alloT('stem.rocks.mystery_rock_challenge_aria', "Mystery Rock challenge") },

                React.createElement("div", { className: "bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-300 p-4 mb-3" },

                  React.createElement("div", { className: "flex items-center gap-2 mb-2" },

                    React.createElement("span", { className: "text-2xl" }, "🔍"),

                    React.createElement("h4", { className: "font-bold text-sm text-amber-900" }, __alloT('stem.rocks.mystery_rock_challenge_title', "Mystery Rock Challenge")),

                    React.createElement("span", { className: "ml-auto text-[11px] text-amber-800 font-bold" }, __alloT('stem.rocks.reading_level_label', "Reading level: ") + (gradeLevel || '5th Grade'))

                  ),

                  React.createElement("p", { className: "text-xs text-slate-700 leading-relaxed" },

                    __alloT('stem.rocks.mystery_intro', "The AI tutor picks a rock and gives you 3 clues. Read each clue, then click a rock from the grid below to guess. Wrong guesses reveal the next clue. Earn 15 XP for a correct ID."))

                ),

                !myst.rockId && !myst.loading && React.createElement("div", { className: "flex flex-col items-center gap-2 p-6 bg-white rounded-xl border-2 border-dashed border-amber-300" },

                  React.createElement("p", { className: "text-xs text-slate-600" }, __alloT('stem.rocks.ready_to_test', "Ready to test your rock knowledge?")),

                  React.createElement("button", {

                    onClick: startMystery,

                    "aria-label": __alloT('stem.rocks.start_mystery_aria', "Start Mystery Rock challenge"),

                    className: "px-5 py-2 bg-gradient-to-r from-amber-700 to-orange-700 text-white font-bold text-sm rounded-full shadow-md hover:shadow-lg hover:from-amber-700 hover:to-orange-700"

                  }, "🎲 " + __alloT('stem.rocks.start_challenge', "Start Challenge")),

                  myst.error && React.createElement("p", { className: "text-[11px] text-red-700 mt-1", role: "alert" }, myst.error)

                ),

                myst.loading && React.createElement("div", { className: "p-4 bg-white rounded-xl border border-amber-200 text-center text-xs text-slate-600", role: "status", "aria-live": "polite" },

                  "🧠 " + __alloT('stem.rocks.ai_thinking_clues', "AI tutor is thinking up clues...")),

                myst.rockId && !myst.loading && React.createElement("div", null,

                  React.createElement("div", { className: "bg-white rounded-xl border-2 border-amber-200 p-3 mb-3" },

                    React.createElement("p", { className: "text-[11px] font-bold text-amber-800 mb-2" }, __alloT('stem.rocks.clues_label', "Clues") + " (" + cluesShown + "/" + clues.length + ")"),

                    clues.slice(0, cluesShown).map(function (c, i) {

                      return React.createElement("div", { key: i, className: "flex gap-2 mb-1.5 text-xs text-slate-700 leading-relaxed" },

                        React.createElement("span", { className: "font-bold text-amber-800 shrink-0" }, __alloT('stem.rocks.clue_label', "Clue ") + (i + 1) + ":"),

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

                    // Close the visual loop: the reveal was text-only, so a student
                    // never got to connect the clues they just reasoned through to
                    // what the rock actually looks like.
                    React.createElement("div", { className: "flex gap-3 items-start" },

                      React.createElement("div", { className: "shrink-0 rounded-lg border-2 border-slate-400 bg-white p-1" }, rkRockSwatch(React.createElement, mysteryRock, 56)),

                      React.createElement("div", { className: "flex-1 min-w-0" },

                        React.createElement("p", { className: "text-sm font-bold " + (myst.solved ? "text-green-800" : "text-slate-800") },

                          (myst.solved ? "✅ " + __alloT('stem.rocks.correct_it_was', "Correct! It was ") : "📖 " + __alloT('stem.rocks.the_answer_was', "The answer was ")) + ROCK_TYPES[mysteryRock.type].icon + " " + mysteryRock.label),

                        React.createElement("p", { className: "text-[11px] font-bold text-slate-700 mt-0.5" }, mysteryRock.texture + " — " + rkGloss(mysteryRock.texture)),

                        React.createElement("p", { className: "text-[11px] text-slate-600 mt-1 leading-relaxed" }, mysteryRock.desc)

                      )

                    ),

                    React.createElement("button", {

                      onClick: startMystery,

                      "aria-label": __alloT('stem.rocks.start_new_mystery_aria', "Start a new Mystery Rock challenge"),

                      className: "transition-colors mt-2 px-3 py-1 text-[11px] font-bold bg-amber-700 text-white rounded-lg hover:bg-amber-800 active:scale-[0.97]"

                    }, "🎲 " + __alloT('stem.rocks.new_mystery', "New Mystery"))

                  ),

                  !myst.solved && !myst.revealed && React.createElement("div", null,

                    React.createElement("p", { className: "text-[11px] font-bold text-slate-600 mb-1.5" }, __alloT('stem.rocks.click_rock_matches_clues', "Click the rock you think matches the clues:")),

                    React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-6 gap-2 mb-2", role: "group", "aria-label": __alloT('stem.rocks.rock_guess_options_aria', "Rock guess options") },

                      ROCKS.map(function (rock) {

                        const rt = ROCK_TYPES[rock.type];

                        const wasWrong = myst.lastGuess === rock.id && myst.lastGuess !== myst.rockId;

                        return React.createElement("button", {

                          key: rock.id,

                          onClick: function () { guess(rock.id); },

                          // This is an IDENTIFICATION game, so the option tiles
                          // have to carry identifying information. They used to
                          // be the rock-type emoji — every igneous option looked
                          // the same, which made the picture useless and left the
                          // clue text doing all the work.
                          "aria-label": __alloT('stem.rocks.guess_label', "Guess ") + rock.label + ' — ' + rkGloss(rock.texture),

                          className: "p-2 rounded-lg text-[11px] font-bold border-2 transition-all hover:scale-105 text-center " +

                            (wasWrong ? "bg-red-50 border-red-600 text-red-700" : "transition-colors bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-400")

                        },

                          React.createElement("div", { className: "flex justify-center mb-1" }, rkRockSwatch(React.createElement, rock, 54)),

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



            // ── Workbench mode: evidence-first mineral identification ──
            // The scratch/fizz primitives elsewhere in this tool demonstrate a
            // KNOWN mineral's properties. The workbench inverts that: an unknown
            // specimen, a tray of instruments, a notebook that fills with the
            // student's own observations, and an identification earned from
            // evidence. All interactions are buttons (no drag requirement), every
            // async completion is try/finally-guarded so a busy flag can never
            // latch, and the candidate order is shuffled once per specimen draw.
            mode === 'workbench' && (function () {
              rkEnsureBenchCss();
              if (typeof document !== 'undefined') {
                var wbCssHost = document.getElementById('rock-a11y');
                if (wbCssHost && !wbCssHost._rkWbCss) {
                  wbCssHost._rkWbCss = true;
                  wbCssHost.textContent += [
                    '@keyframes rkWbSwing{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}',
                    '@keyframes rkWbTug{0%{transform:translateX(0)}60%{transform:translateX(26px)}100%{transform:translateX(22px)}}',
                    '@keyframes rkWbShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}',
                    '@keyframes rkWbPop{0%{transform:scale(.6);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}',
                    '@keyframes rkWbShine{0%{opacity:.15}50%{opacity:.55}100%{opacity:.15}}',
                    '@keyframes rkWbDrip{0%{transform:translateY(-18px);opacity:0}30%{opacity:1}100%{transform:translateY(6px);opacity:0}}',
                    '.rk-wb-swing{animation:rkWbSwing .9s ease-in-out infinite;transform-origin:50% 10%}',
                    '.rk-wb-tug{animation:rkWbTug 1s ease-out forwards}',
                    '.rk-wb-shake{animation:rkWbShake .35s ease-in-out 2}',
                    '.rk-wb-pop{animation:rkWbPop .45s ease-out forwards}',
                    '.rk-wb-shine{animation:rkWbShine 2.6s ease-in-out infinite}',
                    '.rk-wb-drip{animation:rkWbDrip .8s ease-in infinite}',
                    '@keyframes rkWbDrop{0%{transform:translateY(-46px);opacity:0}55%{transform:translateY(6px);opacity:1}75%{transform:translateY(-4px)}100%{transform:translateY(0)}}',
                    '.rk-wb-drop{animation:rkWbDrop .7s cubic-bezier(.2,.8,.3,1.1) both}',
                    '@keyframes rkWbGlide{0%{transform:translateX(0)}100%{transform:translateX(96px)}}',
                    '.rk-wb-glide{animation:rkWbGlide .75s ease-in-out both}',
                    '@keyframes rkWbRise{0%{transform:scaleY(.62)}100%{transform:scaleY(1)}}',
                    '.rk-wb-rise{transform-origin:434px 132px;animation:rkWbRise 1.1s ease-out both}',
                    '@keyframes rkWbNudge{0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,.45)}55%{box-shadow:0 0 0 7px rgba(245,158,11,0)}}',
                    '.rk-wb-nudge{animation:rkWbNudge 2.6s ease-out 1}'
                  ].join('');
                }
              }

              var wb = d.wb || {}; // Guided investigation state lives here.
              var updWb = function (patch) {
                setLabToolData(function (prev) {
                  var pr = (prev && prev.rocks) || {};
                  var pw = pr.wb || {};
                  var next = { ...pw, ...patch };
                  return { ...prev, rocks: { ...pr, wb: next } };
                });
              };
              var wbSay = function (msg) { if (typeof announceToSR === 'function') { try { announceToSR(msg); } catch (e) {} } };
              // When an action replaces its own trigger, move focus to a real
              // control in the revealed state. Scope every query to this
              // workbench so another tool instance can never steal focus.
              var wbFocusAfterUpdate = function (selector) {
                if (typeof document === 'undefined' || !selector) return;
                setTimeout(function () {
                  try {
                    var root = document.querySelector('[data-rocks-workbench="mineral-identification"]');
                    var target = root ? root.querySelector(selector) : null;
                    if (target && typeof target.focus === 'function') target.focus();
                  } catch (e) {}
                }, 0);
              };
              var wbUpdateAndFocus = function (patch, selector) {
                updWb(patch);
                wbFocusAfterUpdate(selector);
              };

              // Specimen pool: minerals with distinct, testable signatures.
              var WB_POOL = ['quartz', 'feldspar', 'mica', 'calcite', 'halite', 'pyrite', 'talc', 'gypsum', 'magnetite', 'hematite', 'galena', 'fluorite'];
              // Challenge set: adds the catalogue's hard minerals. Four of them scratch
              // the streak plate, so hardness bracketing with the harder references,
              // density and form have to carry the identification.
              // Apatite is in the mineral catalogue (it is the Mohs 5 reference)
              // but deliberately NOT in either pool. On this instrument set it and
              // fluorite read identically: both glassy, both a white streak, both
              // scratched by the glass reference and not by copper, and 3.19 vs 3.18
              // g/cm3 falls in a single density band. Cleavage is what separates them
              // in the field and the bench cannot measure it, so adding apatite here
              // would make an unsolvable specimen.
              // Biotite is held out for the same reason. Muscovite and biotite
              // share a hardness range, a white streak, one perfect cleavage and
              // a single density band (2.82 and 3.00 g/cm3). Colour is what tells
              // them apart, and colour on its own is precisely what this bench
              // refuses to accept as an answer.
              var WB_POOL_CHALLENGE = WB_POOL.concat(['diamond', 'garnet', 'olivine', 'sulfur', 'corundum', 'topaz', 'graphite', 'malachite', 'azurite']);
              var wbPoolFor = function () { return wb.pool === 'challenge' ? WB_POOL_CHALLENGE : WB_POOL; };
              var wbMineral = function (id) { for (var i = 0; i < MINERALS.length; i++) { if (MINERALS[i].id === id) return MINERALS[i]; } return null; };
              var WB_CARBONATES = RK_CARBONATE_IDS;
              var WB_MAGNETIC = ['magnetite'];
              var WB_DENSITY_BAND = 0.5; // modeled balance resolution, g/cm³
              var WB_REFS = [
                { id: 'fingernail', label: '💅 ' + __alloT('stem.rocks.tool_fingernail', 'Fingernail'), h: 2.5 },
                { id: 'penny', label: '🪙 ' + __alloT('stem.rocks.tool_copper_reference', 'Copper reference (modeled)'), h: 3.5 },
                { id: 'steel_nail', label: '▱ ' + __alloT('stem.rocks.tool_glass_reference', 'Glass reference (modeled)'), h: 5.5 },
                { id: 'streak_plate', label: '🍽️ ' + __alloT('stem.rocks.tool_porcelain_reference', 'Porcelain plate reference (modeled)'), h: 6.5 },
                { id: 'drill_bit', label: '⌁ ' + __alloT('stem.rocks.tool_calibrated_point', 'Calibrated point (modeled)'), h: 8.5 },
                { id: 'diamond_scribe', label: '💎 ' + __alloT('stem.rocks.tool_diamond_scribe', 'Diamond Scribe'), h: 10.0 }
              ];
              // Equal modeled values are an inconclusive near-match, not a
              // precise measurement. Keep a narrow band for tentative
              // filtering, then require a strict boundary before CER use.
              var WB_PROVISIONAL_HARDNESS_TOLERANCE = 0.5;
              var wbScratchObservationMatches = function (ref, observed, m) {
                if (!ref || !m) return false;
                if (observed === 'borderline') return Math.abs(m.hardness - ref.h) <= WB_PROVISIONAL_HARDNESS_TOLERANCE + 0.001;
                return rkScratchOutcome(ref.h, m.hardness) === observed;
              };

              var wbShuffle = function (list) {
                var a = list.slice();
                for (var i = a.length - 1; i > 0; i--) {
                  var j = Math.floor(Math.random() * (i + 1));
                  var t2 = a[i]; a[i] = a[j]; a[j] = t2;
                }
                return a;
              };
              // Optional fixed pick (the debrief's look-alike button); otherwise random.
              var wbDraw = function (forcedId) {
                var order = wbShuffle(wbPoolFor());
                var choices = wb.spId ? order.filter(function (id) { return id !== wb.spId; }) : order;
                var forced = typeof forcedId === 'string' && order.indexOf(forcedId) !== -1 ? forcedId : null;
                updWb({
                  spId: forced || choices[Math.floor(Math.random() * choices.length)],
                  order: order, scratch: {}, streakDone: false, fizz: null, magnet: null, density: false,
                  lens: false, formObs: null, streakObs: null, densityObs: null, pending: null, history: [], guessedWrong: [], selectedId: null, lastRejectedId: null, reviewId: null, candidateView: null, solvedId: null, anim: null,
                  toolsExpanded: false, candidatesExpanded: false,
                  claimEvidence: [], claimReasoning: null, claimConfidence: null, predictionTool: null, predictionValue: null,
                  solved: (wb.solved || 0), attempts: (wb.attempts || 0)
                });
                wbFocusAfterUpdate('[data-wb-tool="lens"]');
                wbSay(__alloT('stem.rocks.wb_new_specimen_sr', 'A new unknown specimen is on the bench. Choose an instrument to begin testing.'));
              };

              var sp = wb.spId ? wbMineral(wb.spId) : null;
              var spIsCarb = sp ? WB_CARBONATES.indexOf(sp.id) !== -1 : false;
              var spIsMag = sp ? WB_MAGNETIC.indexOf(sp.id) !== -1 : false;
              // A trial that has run but whose result the learner has not yet
              // classified. Instruments wait; the station keeps showing it.
              var wbPendingTool = wb.pending && wb.pending.tool ? wb.pending.tool : null;
              var wbPendingRefId = wbPendingTool === 'scratch' ? (wb.pending.ref || null) : null;
              _rkSpecimenBox.mineral = sp;
              var wbObservedFormFor = function (m) {
                return __alloT('stem.rocks.wb_form_' + rkFormClass(m) + '_sr', rkFormClassInfo(rkFormClass(m)).sr);
              };
              // Use one transparent modeled specimen volume so the density
              // station shows the actual mass ÷ displaced-volume reasoning,
              // not a number that appears without its measurements.
              var wbModeledVolume = 10.0;
              var wbModeledMass = sp && typeof sp.density === 'number' ? sp.density * wbModeledVolume : 0;
              var wbPlateScratched = wb.streakObs === 'plate-scratched';
              var wbStreakOutcomeFor = function (m) {
                if (!m) return { id: 'unknown', label: __alloT('stem.rocks.wb_rail_pending', 'Not measured') };
                if (rkStreakPlateTooHard(m)) return { id: 'plate-scratched', label: __alloT('stem.rocks.streak_plate_scratched_result', 'Plate scratched — no reliable powder streak') };
                return { id: 'powder-' + String(m.streak || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: m.streak };
              };
              var wbDensityOutcomeFor = function (m) {
                if (!m || typeof m.density !== 'number') return { id: 'unknown', label: __alloT('stem.rocks.wb_rail_pending', 'Not measured') };
                var low = Math.floor((m.density + 0.000001) / WB_DENSITY_BAND) * WB_DENSITY_BAND;
                var high = low + WB_DENSITY_BAND;
                return {
                  id: 'density-' + low.toFixed(1).replace('.', '-'),
                  label: low.toFixed(1) + '–<' + high.toFixed(1) + ' g/cm³ ' + __alloT('stem.rocks.wb_density_band', 'measurement band')
                };
              };

              var wbStreakChoiceFor = function (id) { return rkStreakChoiceInfo(id); };
              // Density bands the learner can choose from: every pool band plus
              // distractors, so the arithmetic is a real step.
              var wbDensityChoices = [2.1, 2.6, 3.1, 3.6, 4.1, 4.6, 5.1, 5.6, 7.1, 7.6].map(function (v) { return wbDensityOutcomeFor({ density: v }); });
              var wbDensityChoiceFor = function (id) { for (var i = 0; i < wbDensityChoices.length; i++) if (wbDensityChoices[i].id === id) return wbDensityChoices[i]; return { id: 'unknown', label: __alloT('stem.rocks.wb_rail_pending', 'Not measured') }; };
              var wbComputedDensity = wbModeledVolume ? wbModeledMass / wbModeledVolume : 0;
              // A tiny stable hash so each specimen gets its own silhouette.
              var wbHash = 0; if (sp) { for (var hI = 0; hI < sp.id.length; hI++) { wbHash = (wbHash * 31 + sp.id.charCodeAt(hI)) % 997; } }
              var wbJit = function (n, amp) { return ((wbHash * (n + 3) * 7919) % 100) / 100 * amp - amp / 2; };

              // Evidence, derived once for the notebook and the candidate filter.
              var wbEvidence = [];
              // Match the coverage rail's property order. This is an
              // explanatory grouping, not a claim that tests ran in sequence.
              if (wb.lens && sp) wbEvidence.push({ k: 'lens', text: __alloT('stem.rocks.wb_ev_lens', 'Lens: luster ') + rkLusterClassInfo(wb.lens).label.toLowerCase() + __alloT('stem.rocks.wb_ev_recorded_suffix', ' (your classification)'), test: function (m) { return rkLusterClass(m) === wb.lens; } });
              if (wb.formObs && sp) wbEvidence.push({ k: 'form', text: __alloT('stem.rocks.wb_ev_form', 'Form: ') + rkFormClassInfo(wb.formObs).label.toLowerCase() + __alloT('stem.rocks.wb_ev_recorded_suffix', ' (your classification)'), test: function (m) { return rkFormClass(m) === wb.formObs; } });
              if (wb.streakObs && sp) {
                var wbObservedStreak = wbStreakChoiceFor(wb.streakObs);
                wbEvidence.push({
                  // A groove without powder is hardness evidence, not a
                  // powder-color measurement. Keep one observation, but file
                  // it under hardness so two hardness trials cannot masquerade
                  // as two independent property types in the CER builder.
                  k: wbPlateScratched ? 'scratch_streak_plate' : 'streak',
                  text: wbPlateScratched ? __alloT('stem.rocks.wb_ev_plate_scratched', 'Streak plate: no powder; the plate groove gives H > about 6.5') : __alloT('stem.rocks.wb_ev_streak', 'Streak: ') + wbObservedStreak.label + __alloT('stem.rocks.wb_ev_recorded_suffix', ' (your classification)'),
                  test: function (m) { return wbStreakOutcomeFor(m).id === wbObservedStreak.id; }
                });
              }
              (function () {
                var sc = wb.scratch || {};
                for (var i = 0; i < WB_REFS.length; i++) {
                  var ref = WB_REFS[i];
                  if (!sc[ref.id]) continue;
                  // A streak-plate groove and the explicit porcelain reference
                  // are the same physical comparison. Keep one notebook row and
                  // one React key instead of counting the plate twice.
                  if (ref.id === 'streak_plate' && wbPlateScratched) continue;
                  var observed = sc[ref.id];
                  wbEvidence.push({
                    k: 'scratch_' + ref.id,
                    text: ref.label.replace(/^\S+\s/, '') + ': ' + (observed === 'scratched' ? __alloT('stem.rocks.wb_ev_marked', 'left a scratch') : observed === 'borderline' ? __alloT('stem.rocks.scratch_borderline', 'Modeled near-match—retest to confirm') : __alloT('stem.rocks.wb_ev_nomark', 'no mark')),
                    provisional: observed === 'borderline',
                    test: (function (r, expected) { return function (m) { return wbScratchObservationMatches(r, expected, m); }; })(ref, observed)
                  });
                }
              })();
              if (wb.fizz && sp) wbEvidence.push({ k: 'fizz', text: wb.fizz === 'fizz' ? __alloT('stem.rocks.wb_ev_fizz', 'Acid: immediate fizz (calcite response in this set)') : __alloT('stem.rocks.wb_ev_nofizz', 'Acid: no immediate visible fizz'), test: function (m) { return (WB_CARBONATES.indexOf(m.id) !== -1) === (wb.fizz === 'fizz'); } });
              if (wb.magnet && sp) wbEvidence.push({ k: 'magnet', text: wb.magnet === 'pull' ? __alloT('stem.rocks.wb_ev_pull', 'Magnet: strong pull') : __alloT('stem.rocks.wb_ev_nopull', 'Magnet: no attraction'), test: function (m) { return (WB_MAGNETIC.indexOf(m.id) !== -1) === (wb.magnet === 'pull'); } });
              if (wb.densityObs && sp && sp.density) {
                var wbObservedDensity = wbDensityChoiceFor(wb.densityObs);
                wbEvidence.push({ k: 'density', text: __alloT('stem.rocks.wb_ev_density', 'Density calculation: ') + wbModeledMass.toFixed(1) + ' g ÷ ' + wbModeledVolume.toFixed(1) + ' cm³ = ' + wbComputedDensity.toFixed(2) + ' g/cm³ — ' + wbObservedDensity.label + (wbDensityOutcomeFor({ density: wbComputedDensity }).id === wb.densityObs ? '' : __alloT('stem.rocks.wb_ev_density_recheck', ' (check your division: the readings do not land in this band)')), test: function (m) { return wbDensityOutcomeFor(m).id === wbObservedDensity.id; } });
              }

              var wbFits = function (m) { for (var i = 0; i < wbEvidence.length; i++) { if (!wbEvidence[i].test(m)) return false; } return true; };
              var wbConfirmedFits = function (m) { for (var i = 0; i < wbEvidence.length; i++) { if (!wbEvidence[i].provisional && !wbEvidence[i].test(m)) return false; } return true; };
              var wbRemaining = 0, wbConfirmedRemaining = 0;
              (wb.order || []).forEach(function (id) {
                var m = wbMineral(id); if (!m) return;
                if (wbFits(m)) wbRemaining++;
                if (wbConfirmedFits(m)) wbConfirmedRemaining++;
              });

              // Turn the investigation into a visible learning sequence. The
              // previous layout put the bench, eleven instrument buttons, the
              // notebook and twelve guesses on screen at once, but never told a
              // novice what a useful NEXT observation would be. This coach is
              // deliberately heuristic rather than answer-aware: it recommends
              // a discriminating property, never the specimen's name.
              var wbScratchCount = Object.keys(wb.scratch || {}).length;
              var wbStrictScratchCount = Object.keys(wb.scratch || {}).filter(function (id) { return (wb.scratch || {})[id] !== 'borderline'; }).length;
              var wbHasProvisionalScratch = Object.keys(wb.scratch || {}).some(function (id) { return (wb.scratch || {})[id] === 'borderline'; });
              // Convert scratch observations into explicit inequalities once,
              // before deciding whether hardness is usable in a claim.
              var wbLo = wbPlateScratched ? RK_STREAK_PLATE_HARDNESS : 0, wbHi = 10.5, wbEq = null, wbHardnessConflict = false;
              (function () {
                var sc = wb.scratch || {};
                for (var i = 0; i < WB_REFS.length; i++) {
                  var r = WB_REFS[i];
                  if (sc[r.id] === 'scratched' && r.h < wbHi) wbHi = r.h;
                  if (sc[r.id] === 'no' && r.h > wbLo) wbLo = r.h;
                  if (sc[r.id] === 'borderline') {
                    if (wbEq !== null && wbEq !== r.h) wbHardnessConflict = true;
                    wbEq = r.h;
                  }
                }
                if (wbLo >= wbHi || (wbEq !== null && (wbEq <= wbLo || wbEq >= wbHi))) wbHardnessConflict = true;
              })();
              // A distant reference adds a broad bound; it does not confirm an
              // approximate equality. Require the next softer/harder recorded
              // reference, or an independent plate-groove hardness result.
              var wbHasAdjacentScratchConfirmation = false;
              (function () {
                var sc = wb.scratch || {};
                for (var i = 0; i < WB_REFS.length; i++) {
                  if (sc[WB_REFS[i].id] !== 'borderline') continue;
                  var softer = i > 0 ? sc[WB_REFS[i - 1].id] : null;
                  var harder = i < WB_REFS.length - 1 ? sc[WB_REFS[i + 1].id] : null;
                  // The softer reference should leave no mark; the harder one
                  // should scratch. An opposite result is a conflict, not
                  // corroboration.
                  if (softer === 'no' || harder === 'scratched') wbHasAdjacentScratchConfirmation = true;
                }
              })();
              var wbHardnessConfirmed = !wbHardnessConflict && (wbPlateScratched || (!wbHasProvisionalScratch && wbStrictScratchCount > 0) || wbHasAdjacentScratchConfirmation);
              var wbHardnessProvisional = !wbHardnessConflict && !wbHardnessConfirmed && wbHasProvisionalScratch;
              var wbHasHardnessEvidence = wbHardnessConfirmed || wbHardnessProvisional;
              // Scratch references create several notebook observations, but
              // they measure one scientific property. Keep a separate coverage
              // model so "3 of 6 property types" can never become the confusing
              // "7 / 6" that a full hardness bracket previously produced.
              var wbCoverage = [
                { id: 'luster', icon: '🔍', label: __alloT('stem.rocks.wb_coverage_luster', 'Luster'), done: !!wb.lens },
                { id: 'form', icon: '🔷', label: __alloT('stem.rocks.wb_coverage_form', 'Form'), done: !!wb.formObs },
                { id: 'streak', icon: '➖', label: __alloT('stem.rocks.wb_coverage_streak', 'Streak'), done: !!wb.streakObs && !wbPlateScratched },
                { id: 'hardness', icon: '⛏️', label: __alloT('stem.rocks.wb_coverage_hardness', 'Hardness'), done: wbHardnessConfirmed, provisional: wbHardnessProvisional },
                { id: 'acid', icon: '🧪', label: __alloT('stem.rocks.wb_coverage_acid', 'Acid'), done: !!wb.fizz },
                { id: 'magnetism', icon: '🧲', label: __alloT('stem.rocks.wb_coverage_magnetism', 'Magnetism'), done: !!wb.magnet },
                { id: 'density', icon: '⚖️', label: __alloT('stem.rocks.wb_coverage_density', 'Density'), done: !!wb.densityObs }
              ];
              var wbEvidenceTypeCount = wbCoverage.filter(function (item) { return item.done; }).length;
              var wbProvisionalTypeCount = wbCoverage.filter(function (item) { return item.provisional; }).length;
              var wbClaimReady = wbEvidenceTypeCount >= 2;
              var wbCandidateHas = function (id) {
                if (!(wb.order || []).length) return false;
                for (var i = 0; i < wb.order.length; i++) {
                  var m = wbMineral(wb.order[i]);
                  if (m && m.id === id && wbFits(m)) return true;
                }
                return false;
              };
              var wbNext = !wb.lens
                ? { tool: 'lens', icon: '🔍', title: __alloT('stem.rocks.wb_next_lens', 'Start with the hand lens'), detail: __alloT('stem.rocks.wb_next_lens_detail', 'Luster is a fast first split: does the surface reflect like metal, glass, pearl, or wax?') }
                  : !wb.streakObs
                  ? { tool: 'streak', icon: '🍽️', title: __alloT('stem.rocks.wb_next_streak', 'Run the streak plate'), detail: __alloT('stem.rocks.wb_next_streak_detail', 'Softer minerals leave diagnostic powder; a harder specimen grooves the plate and provides a hardness clue instead.') }
                  : !wbHardnessConfirmed && wbRemaining > 2
                    ? { tool: 'steel_nail', icon: '▱', title: __alloT('stem.rocks.wb_next_scratch', 'Bracket the hardness'), detail: __alloT('stem.rocks.wb_next_scratch_detail', 'Try the glass reference at modeled Mohs 5.5, then choose a softer or harder calibrated point from the result.') }
                    : WB_CARBONATES.some(wbCandidateHas) && !wb.fizz
                      ? { tool: 'acid', icon: '🧪', title: __alloT('stem.rocks.wb_next_acid', 'Check for calcite’s acid response'), detail: __alloT('stem.rocks.wb_next_acid_detail', 'Fizzing means a carbonate. In the standard set calcite is the only one, so a fizz names it; the challenge set adds two copper carbonates, so there a fizz narrows the field instead of finishing it.') }
                      : wbCandidateHas('magnetite') && !wb.magnet
                        ? { tool: 'magnet', icon: '🧲', title: __alloT('stem.rocks.wb_next_magnet', 'Check magnetism'), detail: __alloT('stem.rocks.wb_next_magnet_detail', 'A strong pull is unusually diagnostic and can settle a magnetite hypothesis.') }
                        : !wb.densityObs && wbRemaining > 1
                          ? { tool: 'balance', icon: '⚖️', title: __alloT('stem.rocks.wb_next_density', 'Compare heft with density'), detail: __alloT('stem.rocks.wb_next_density_detail', 'Mass divided by displaced volume helps separate minerals that look alike.') }
                          : { tool: 'claim', icon: '🧠', title: __alloT('stem.rocks.wb_next_claim', 'Your evidence is ready'), detail: wbRemaining === 1 ? __alloT('stem.rocks.wb_next_claim_detail_one', 'Compare the remaining card with your notebook, then make the claim your evidence supports.') : __alloT('stem.rocks.wb_next_claim_detail', 'Compare the remaining cards with your notebook, then make the claim your evidence supports.') };

              // A recommendation is more useful when learners can see why the
              // test is diagnostic. Group the currently viable candidates by
              // their possible reference outcomes without consulting the
              // unknown specimen, then invite an optional prediction.
              var wbOutcomeSlug = function (value) { return String(value || 'unknown').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); };
              var wbScratchRefFor = function (tool) {
                for (var i = 0; i < WB_REFS.length; i++) if (WB_REFS[i].id === tool) return WB_REFS[i];
                return null;
              };
              var wbForecastOutcomeFor = function (tool, m) {
                if (!m) return null;
                if (tool === 'lens') return { id: rkLusterClass(m), label: rkLusterClassInfo(rkLusterClass(m)).label };
                if (tool === 'form') return { id: rkFormClass(m), label: rkFormClassInfo(rkFormClass(m)).label };
                if (tool === 'streak') return wbStreakOutcomeFor(m);
                var scratchRef = wbScratchRefFor(tool);
                if (scratchRef) {
                  var scratchForecast = rkScratchOutcome(scratchRef.h, m.hardness);
                  return scratchForecast === 'scratched'
                    ? { id: 'scratches', label: scratchRef.label + ' ' + __alloT('stem.rocks.wb_forecast_ref_scratches', 'leaves a scratch') }
                    : scratchForecast === 'borderline'
                      ? { id: 'borderline', label: __alloT('stem.rocks.scratch_borderline', 'Modeled near-match—retest to confirm') }
                      : { id: 'resists', label: __alloT('stem.rocks.wb_forecast_ref_resists', 'Specimen resists') + ' ' + scratchRef.label };
                }
                if (tool === 'acid') return WB_CARBONATES.indexOf(m.id) !== -1
                  ? { id: 'fizz', label: __alloT('stem.rocks.wb_forecast_fizz', 'Immediate visible fizz') }
                  : { id: 'no-fizz', label: __alloT('stem.rocks.wb_forecast_no_fizz', 'No immediate visible fizz') };
                if (tool === 'magnet') return WB_MAGNETIC.indexOf(m.id) !== -1
                  ? { id: 'pull', label: __alloT('stem.rocks.wb_forecast_pull', 'Strong magnetic pull') }
                  : { id: 'no-pull', label: __alloT('stem.rocks.wb_forecast_no_pull', 'No magnetic pull') };
                if (tool === 'balance') return wbDensityOutcomeFor(m);
                return null;
              };
              var wbForecastTitleFor = function (tool) {
                var scratchRef = wbScratchRefFor(tool);
                if (scratchRef) return __alloT('stem.rocks.wb_forecast_hardness_with', 'a Mohs scratch test with ') + scratchRef.label;
                if (tool === 'form') return __alloT('stem.rocks.wb_forecast_form_title', 'the fragment’s form');
                return tool === 'lens' ? __alloT('stem.rocks.wb_forecast_luster_title', 'luster')
                  : tool === 'streak' ? __alloT('stem.rocks.wb_forecast_streak_title', 'a streak-plate result')
                    : tool === 'acid' ? __alloT('stem.rocks.wb_forecast_acid_title', 'an acid reaction')
                        : tool === 'magnet' ? __alloT('stem.rocks.wb_forecast_magnet_title', 'a magnetic response')
                          : __alloT('stem.rocks.wb_forecast_density_title', 'a 0.5 g/cm³ density band');
              };
              var wbBuildForecast = function (tool, candidates) {
                var groups = [], byId = {};
                var candidatePool = (candidates || []).filter(Boolean);
                candidatePool.forEach(function (m) {
                  var outcome = wbForecastOutcomeFor(tool, m);
                  if (!outcome) return;
                  if (!byId[outcome.id]) {
                    byId[outcome.id] = { id: outcome.id, label: outcome.label, count: 0, candidates: [] };
                    groups.push(byId[outcome.id]);
                  }
                  byId[outcome.id].count++;
                  byId[outcome.id].candidates.push({ id: m.id, label: m.label || m.id });
                });
                // Outcome bars use exact trigger groups. A provisional scratch
                // branch deliberately retains a wider ±0.5 Mohs shortlist, so
                // projected remaining counts must be calculated separately.
                var forecastScratchRef = wbScratchRefFor(tool);
                groups.forEach(function (group) {
                  var retained = group.candidates.slice();
                  if (forecastScratchRef) {
                    var observed = group.id === 'scratches' ? 'scratched' : group.id === 'borderline' ? 'borderline' : 'no';
                    retained = candidatePool.filter(function (m) { return wbScratchObservationMatches(forecastScratchRef, observed, m); }).map(function (m) { return { id: m.id, label: m.label || m.id }; });
                  }
                  group.remainingCount = retained.length;
                  group.remainingCandidates = retained;
                });
                groups.sort(function (a, b) { return b.count - a.count || a.label.localeCompare(b.label); });
                return groups;
              };
              // Scientific recommendations and support use measurement matches,
              // never the learner's previous guesses. A rejected guess remains
              // a live possibility until an observation actually rules it out.
              var wbViableCandidates = (wb.order || []).map(wbMineral).filter(function (m) { return m && wbFits(m); });
              var wbTestProfileFor = function (tool) {
                var scratchRef = wbScratchRefFor(tool);
                if (scratchRef) return {
                  tool: tool, icon: '⛏️', priority: 3,
                  title: __alloT('stem.rocks.wb_next_scratch_ref', 'Try the best hardness reference: ') + scratchRef.label,
                  detail: __alloT('stem.rocks.wb_next_scratch_ref_detail', 'This Mohs reference creates the strongest expected split among the remaining hardness possibilities.')
                };
                var profiles = {
                  lens: { tool: 'lens', icon: '🔍', priority: 0, title: __alloT('stem.rocks.wb_next_lens', 'Start with the hand lens'), detail: __alloT('stem.rocks.wb_next_lens_detail', 'Luster is a fast first split: does the surface reflect like metal, glass, pearl, or wax?') },
                  streak: { tool: 'streak', icon: '🍽️', priority: 1, title: __alloT('stem.rocks.wb_next_streak', 'Run the streak plate'), detail: __alloT('stem.rocks.wb_next_streak_detail', 'Softer minerals leave diagnostic powder; a harder specimen grooves the plate and provides a hardness clue instead.') },
                  magnet: { tool: 'magnet', icon: '🧲', priority: 4, title: __alloT('stem.rocks.wb_next_magnet', 'Check magnetism'), detail: __alloT('stem.rocks.wb_next_magnet_detail', 'A strong pull is unusually diagnostic and can settle a magnetite hypothesis.') },
                  balance: { tool: 'balance', icon: '⚖️', priority: 5, title: __alloT('stem.rocks.wb_next_density', 'Compare heft with density'), detail: __alloT('stem.rocks.wb_next_density_detail', 'Mass divided by displaced volume helps separate minerals that look alike.') },
                  acid: { tool: 'acid', icon: '🧪', priority: 6, title: __alloT('stem.rocks.wb_next_acid', 'Check for calcite’s acid response'), detail: __alloT('stem.rocks.wb_next_acid_detail', 'Fizzing means a carbonate. In the standard set calcite is the only one, so a fizz names it; the challenge set adds two copper carbonates, so there a fizz narrows the field instead of finishing it.') }
                };
                return profiles[tool] || null;
              };
              var wbAvailableTestTools = [];
              if (!wb.lens) wbAvailableTestTools.push('lens');
              // 'form' is deliberately not ranked: see wbTestProfileFor.
              if (!wb.streakObs) wbAvailableTestTools.push('streak');
              WB_REFS.forEach(function (ref) { if (!(wb.scratch || {})[ref.id]) wbAvailableTestTools.push(ref.id); });
              if (!wb.magnet) wbAvailableTestTools.push('magnet');
              if (!wb.densityObs) wbAvailableTestTools.push('balance');
              if (!wb.fizz) wbAvailableTestTools.push('acid');
              var wbTestRankings = wbAvailableTestTools.map(function (tool) {
                var profile = wbTestProfileFor(tool);
                var groups = wbBuildForecast(tool, wbViableCandidates);
                if (!profile || groups.length < 2 || wbViableCandidates.length < 2) return null;
                var expectedRemaining = groups.reduce(function (sum, group) { return sum + group.count * group.remainingCount; }, 0) / wbViableCandidates.length;
                var largestGroup = groups.reduce(function (largest, group) { return Math.max(largest, group.remainingCount); }, 0);
                return Object.assign({}, profile, {
                  outcomeCount: groups.length,
                  expectedRemaining: expectedRemaining,
                  expectedEliminated: wbViableCandidates.length - expectedRemaining,
                  largestGroup: largestGroup
                });
              }).filter(Boolean).sort(function (a, b) {
                return a.expectedRemaining - b.expectedRemaining
                  || a.largestGroup - b.largestGroup
                  || b.outcomeCount - a.outcomeCount
                  || a.priority - b.priority;
              });
              if (wbHardnessConflict) wbNext = {
                tool: 'reconcile-hardness', icon: '↺',
                title: __alloT('stem.rocks.wb_reconcile_hardness', 'Resolve the conflicting scratch results'),
                detail: __alloT('stem.rocks.wb_reconcile_hardness_detail', 'The recorded bounds cannot all be true at once. Clear only the hardness trials, then bracket again from a fresh reference.')
              };
              else if (!wbViableCandidates.length && wbEvidence.length) wbNext = {
                tool: 'reconcile-evidence', icon: '↺',
                title: __alloT('stem.rocks.wb_reconcile_evidence', 'Recheck the conflicting observations'),
                detail: __alloT('stem.rocks.wb_reconcile_evidence_detail', 'No reference candidate fits every recorded observation. Clear and rerun the measurements instead of making an unsupported claim.')
              };
              // Rankings drive the coach only once the learner has one observation.
              // A fresh bench always starts with the lens: it is the non-destructive
              // look every field geologist takes first, and with luster grouped into
              // four classes the plate would otherwise edge it out on expected split.
              else if (wbTestRankings.length && wbViableCandidates.length > 1 && wbEvidence.length > 0) wbNext = wbTestRankings[0];
              else if (wbClaimReady && wbViableCandidates.length === 1) wbNext = { tool: 'claim', icon: '🧠', title: __alloT('stem.rocks.wb_next_claim', 'Your evidence is ready'), detail: __alloT('stem.rocks.wb_next_claim_detail_one', 'Compare the remaining card with your notebook, then make the claim your evidence supports.') };
              if (wbPendingTool) wbNext = { tool: 'record', icon: '📝', title: __alloT('stem.rocks.wb_next_record', 'Record what you observed'), detail: __alloT('stem.rocks.wb_next_record_detail', 'Look at the specimen station, then choose the description that matches what you actually see. The notebook only fills with observations you record yourself.') };
              var wbForecastGroups = (wbNext.tool === 'claim' || wbNext.tool === 'record') ? [] : wbBuildForecast(wbNext.tool, wbViableCandidates);
              var wbForecastPalette = ['#6d28d9', '#0f766e', '#b45309', '#be123c', '#0369a1', '#475569', '#4338ca', '#a21caf'];
              // What the learner actually recorded for a tool, in forecast ids,
              // so a prediction is checked against their observation.
              var wbRecordedOutcomeFor = function (tool) {
                if (!tool) return null;
                if (tool === 'lens') return wb.lens ? { id: wb.lens, label: rkLusterClassInfo(wb.lens).label } : null;
                if (tool === 'form') return wb.formObs ? { id: wb.formObs, label: rkFormClassInfo(wb.formObs).label } : null;
                if (tool === 'streak') return wb.streakObs ? wbStreakChoiceFor(wb.streakObs) : null;
                var recRef = wbScratchRefFor(tool);
                if (recRef) {
                  var rec = (wb.scratch || {})[recRef.id];
                  if (!rec) return null;
                  return rec === 'scratched' ? { id: 'scratches', label: recRef.label + ' ' + __alloT('stem.rocks.wb_forecast_ref_scratches', 'leaves a scratch') }
                    : rec === 'borderline' ? { id: 'borderline', label: __alloT('stem.rocks.scratch_borderline', 'Modeled near-match—retest to confirm') }
                      : { id: 'resists', label: __alloT('stem.rocks.wb_forecast_ref_resists', 'Specimen resists') + ' ' + recRef.label };
                }
                if (tool === 'acid') return wb.fizz ? (wb.fizz === 'fizz' ? { id: 'fizz', label: __alloT('stem.rocks.wb_forecast_fizz', 'Immediate visible fizz') } : { id: 'no-fizz', label: __alloT('stem.rocks.wb_forecast_no_fizz', 'No immediate visible fizz') }) : null;
                if (tool === 'magnet') return wb.magnet ? (wb.magnet === 'pull' ? { id: 'pull', label: __alloT('stem.rocks.wb_forecast_pull', 'Strong magnetic pull') } : { id: 'no-pull', label: __alloT('stem.rocks.wb_forecast_no_pull', 'No magnetic pull') }) : null;
                if (tool === 'balance') return wb.densityObs ? wbDensityChoiceFor(wb.densityObs) : null;
                return null;
              };
              var wbPredictionTool = wb.predictionTool || null;
              var wbPredictionValue = wb.predictionValue || null;
              var wbPredictionScratchRef = wbScratchRefFor(wbPredictionTool);
              var wbPredictionDone = wbPredictionTool === 'lens' ? !!wb.lens
                : wbPredictionTool === 'form' ? !!wb.formObs
                : wbPredictionTool === 'streak' ? !!wb.streakObs
                  : wbPredictionScratchRef ? !!(wb.scratch || {})[wbPredictionScratchRef.id]
                    : wbPredictionTool === 'acid' ? !!wb.fizz
                      : wbPredictionTool === 'magnet' ? !!wb.magnet
                        : wbPredictionTool === 'balance' ? !!wb.densityObs : false;
              var wbPredictionActual = wbPredictionDone && sp ? wbRecordedOutcomeFor(wbPredictionTool) : null;
              var wbPredictionReferenceGroups = wbPredictionTool ? wbBuildForecast(wbPredictionTool, wbPoolFor().map(wbMineral).filter(Boolean)) : [];
              var wbPredictionExpected = wbPredictionReferenceGroups.filter(function (group) { return group.id === wbPredictionValue; })[0] || null;
              var wbPredictionMatched = !!wbPredictionActual && !!wbPredictionExpected && wbPredictionActual.id === wbPredictionExpected.id;
              // Collecting the minimum evidence does not mean the learner has
              // compared anything yet. Stay in Compare until a supported
              // candidate is deliberately selected; only then enter Claim.
              var wbStage = wbEvidence.length === 0 ? 0 : 1;
              var wbEvidenceKind = function (key) {
                if (key.indexOf('scratch_') === 0) return __alloT('stem.rocks.wb_kind_hardness', 'hardness');
                return key === 'lens' ? __alloT('stem.rocks.wb_kind_luster', 'luster')
                  : key === 'form' ? __alloT('stem.rocks.wb_kind_form', 'form')
                  : key === 'density' ? __alloT('stem.rocks.wb_kind_density', 'density')
                    : key === 'fizz' ? __alloT('stem.rocks.wb_kind_acid', 'acid reaction')
                      : key === 'magnet' ? __alloT('stem.rocks.wb_kind_magnet', 'magnetism')
                        : __alloT('stem.rocks.wb_kind_streak', 'streak');
              };
              var wbEvidenceIcon = function (key) {
                if (key.indexOf('scratch_') === 0) return '⛏️';
                return key === 'lens' ? '🔍' : key === 'form' ? '🔷' : key === 'density' ? '⚖️' : key === 'fizz' ? '🧪' : key === 'magnet' ? '🧲' : '➖';
              };
              var wbMismatchKind = function (m) {
                for (var i = 0; i < wbEvidence.length; i++) {
                  if (!wbEvidence[i].test(m)) return wbEvidenceKind(wbEvidence[i].k);
                }
                return null;
              };

              // A clean scratch means H < reference, no mark means H >
              // reference, and equal modeled values are approximate.
              var wbHardnessLabel = wbHardnessConflict
                ? __alloT('stem.rocks.wb_mohs_conflict', 'Conflicting scratch results — retest')
                : wbEq !== null ? 'H ≈ ' + wbEq
                  : wbLo > 0 && wbHi < 10.5 ? wbLo + ' < H < ' + wbHi
                    : wbLo > 0 ? 'H > ' + wbLo
                      : wbHi < 10.5 ? 'H < ' + wbHi
                        : __alloT('stem.rocks.wb_mohs_unmeasured', 'Not bracketed yet');

              var wbBusy = !!wb.anim;
              var wbStoredSelection = wb.selectedId ? wbMineral(wb.selectedId) : null;
              var wbInvalidatedSelected = wbStoredSelection && !wbFits(wbStoredSelection) ? wbStoredSelection : null;
              var wbInvalidatedKind = wbInvalidatedSelected ? wbMismatchKind(wbInvalidatedSelected) : null;
              var wbSelected = wbInvalidatedSelected ? null : wbStoredSelection;
              if (wbSelected && wbClaimReady) wbStage = 2;
              // Guided focus is the novice default. It keeps the current stage
              // visually dominant while preserving a one-click route to the
              // complete workbench for learners who prefer open exploration.
              var wbGuided = wb.guided !== false;
              var wbToolsOpen = !wbGuided || wbStage === 0 || !!wb.toolsExpanded;
              var wbCandidatesOpen = !wbGuided || wbStage > 0 || !!wb.candidatesExpanded;
              var wbLastRejected = wb.lastRejectedId ? wbMineral(wb.lastRejectedId) : null;
              var wbReviewCandidate = wb.reviewId ? wbMineral(wb.reviewId) : null;
              if (wbReviewCandidate && wbFits(wbReviewCandidate) && (wb.guessedWrong || []).indexOf(wbReviewCandidate.id) === -1) wbReviewCandidate = null;
              // Show how much work each observation does. This is calculated
              // against the full starting set, not the already-filtered set, so
              // "rules out 8 on its own" stays honest and comparable even when
              // another observation eliminated some of the same candidates.
              var wbEvidenceImpact = function (ev) {
                var count = 0;
                (wb.order || []).forEach(function (id) { var m = wbMineral(id); if (m && !ev.test(m)) count++; });
                return count;
              };
              var wbTopEvidence = null;
              wbEvidence.forEach(function (ev) {
                if (ev.provisional) return;
                var impact = wbEvidenceImpact(ev);
                if (!wbTopEvidence || impact > wbTopEvidence.impact) wbTopEvidence = { ev: ev, impact: impact };
              });

              // Turn the claim into a visible comparison, rather than asking a
              // learner to infer the reasoning from two distant parts of the
              // interface. Each measured property gets one unknown/reference
              // pair so the evidence chain can be checked at a glance.
              var wbMatchRowsFor = function (m) {
                if (!m || !sp) return [];
                var rows = [];
                if (wb.lens) rows.push({ id: 'luster', label: __alloT('stem.rocks.wb_match_luster', 'Luster'), unknown: rkLusterClassInfo(wb.lens).label, candidate: m.luster + ' (' + rkLusterClassInfo(rkLusterClass(m)).label + ')', matches: rkLusterClass(m) === wb.lens });
                if (wb.formObs) rows.push({ id: 'form', label: __alloT('stem.rocks.wb_match_form', 'Form'), unknown: rkFormClassInfo(wb.formObs).label, candidate: rkFormClassInfo(rkFormClass(m)).label, matches: rkFormClass(m) === wb.formObs });
                if (wb.streakObs && !wbPlateScratched) rows.push({ id: 'streak', label: __alloT('stem.rocks.wb_match_streak', 'Streak'), unknown: wbStreakChoiceFor(wb.streakObs).label, candidate: wbStreakOutcomeFor(m).label, matches: wbStreakOutcomeFor(m).id === wb.streakObs });
                if (wbHasHardnessEvidence) rows.push({
                  id: 'hardness', label: __alloT('stem.rocks.wb_match_hardness', 'Hardness'),
                  unknown: wbHardnessLabel + ' (modeled Mohs)',
                  candidate: m.hardness + ' Mohs',
                  provisional: wbHardnessProvisional,
                  matches: wbEvidence.filter(function (ev) { return ev.k.indexOf('scratch_') === 0; }).every(function (ev) { return ev.test(m); })
                });
                if (wb.fizz) rows.push({
                  id: 'acid', label: __alloT('stem.rocks.wb_match_acid', 'Acid reaction'),
                  unknown: wb.fizz === 'fizz' ? __alloT('stem.rocks.wb_match_fizzes', 'Fizzes') : __alloT('stem.rocks.wb_match_no_reaction', 'No reaction'),
                  candidate: WB_CARBONATES.indexOf(m.id) !== -1 ? __alloT('stem.rocks.wb_match_fizzes', 'Fizzes') : __alloT('stem.rocks.wb_match_no_reaction', 'No reaction'),
                  matches: (WB_CARBONATES.indexOf(m.id) !== -1) === (wb.fizz === 'fizz')
                });
                if (wb.magnet) rows.push({
                  id: 'magnetism', label: __alloT('stem.rocks.wb_match_magnetism', 'Magnetism'),
                  unknown: wb.magnet === 'pull' ? __alloT('stem.rocks.wb_match_strong_pull', 'Strong pull') : __alloT('stem.rocks.wb_match_no_attraction', 'No attraction'),
                  candidate: WB_MAGNETIC.indexOf(m.id) !== -1 ? __alloT('stem.rocks.wb_match_strong_pull', 'Strong pull') : __alloT('stem.rocks.wb_match_no_attraction', 'No attraction'),
                  matches: (WB_MAGNETIC.indexOf(m.id) !== -1) === (wb.magnet === 'pull')
                });
                if (wb.densityObs && sp.density) {
                  var unknownDensityOutcome = wbDensityChoiceFor(wb.densityObs);
                  var candidateDensityOutcome = wbDensityOutcomeFor(m);
                  rows.push({
                    id: 'density', label: __alloT('stem.rocks.wb_match_density', 'Density'),
                    unknown: wbComputedDensity.toFixed(2) + ' g/cm\u00b3 — ' + unknownDensityOutcome.label,
                    candidate: (m.density ? m.density.toFixed(2) + ' g/cm\u00b3 — ' : '') + candidateDensityOutcome.label,
                    matches: candidateDensityOutcome.id === unknownDensityOutcome.id
                  });
                }
                return rows;
              };
              var wbRenderMatchMap = function (m, context) {
                var rows = wbMatchRowsFor(m);
                if (!rows.length) return null;
                var matchedRows = rows.filter(function (row) { return row.matches; }).length;
                var allRowsMatch = matchedRows === rows.length;
                var hasProvisionalMatch = rows.some(function (row) { return row.provisional && row.matches; });
                var matchCount = (allRowsMatch ? rows.length : matchedRows + ' / ' + rows.length) + ' ' + (rows.length === 1 ? __alloT('stem.rocks.wb_match_count_singular', 'match') : __alloT('stem.rocks.wb_matches_count', 'matches')) + (hasProvisionalMatch ? ' · ' + __alloT('stem.rocks.wb_provisional_short', 'provisional') : '');
                var matchCountClass = "rounded-full border px-2 py-1 text-[10px] font-black " + (hasProvisionalMatch ? "bg-amber-100 border-amber-300 text-amber-900" : allRowsMatch ? "bg-emerald-100 border-emerald-200 text-emerald-800" : "bg-rose-100 border-rose-200 text-rose-800");
                var matchRows = React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", role: "list" },
                    rows.map(function (row) {
                      var provisionalMatch = row.provisional && row.matches;
                      return React.createElement("div", { key: row.id, role: "listitem", className: "rounded-lg border p-2.5 min-w-0 " + (provisionalMatch ? "border-amber-300 bg-amber-50" : row.matches ? "border-slate-200 bg-slate-50" : "border-rose-300 bg-rose-50"), "data-wb-match-property": row.id, "data-wb-match-state": provisionalMatch ? 'provisional' : row.matches ? 'match' : 'conflict' },
                        React.createElement("div", { className: "flex items-center justify-between gap-2" },
                          React.createElement("p", { className: "text-[11.5px] font-black text-slate-900" }, row.label),
                          React.createElement("span", { className: "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black " + (provisionalMatch ? "bg-amber-100 text-amber-900" : row.matches ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800") }, provisionalMatch ? '\u2248 ' + __alloT('stem.rocks.wb_provisional_confirm', 'Provisional—confirm') : row.matches ? '\u2713 ' + __alloT('stem.rocks.wb_matches_evidence', 'Matches evidence') : '\u00d7 ' + __alloT('stem.rocks.wb_review_conflict', 'Conflict'))
                        ),
                        React.createElement("dl", { className: "grid grid-cols-2 gap-2 mt-2" },
                          React.createElement("div", { className: "min-w-0 border-r border-slate-200 pr-2" },
                            React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_unknown_observation', 'Unknown observation')),
                            React.createElement("dd", { className: "text-[11px] font-bold text-slate-800 mt-0.5", style: { overflowWrap: 'anywhere' } }, row.unknown)
                          ),
                          React.createElement("div", { className: "min-w-0" },
                            React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_candidate_reference', 'Candidate reference')),
                            React.createElement("dd", { className: "text-[11px] font-bold text-violet-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, row.candidate)
                          )
                        )
                      );
                    })
                  );
                if (context === 'claim') {
                  return React.createElement("details", {
                    className: "group mt-3 rounded-xl border border-violet-200 bg-white/90 p-2.5 sm:p-3 text-left",
                    "data-wb-match-map": context, "data-wb-match-map-state": "collapsed-by-default"
                  },
                    React.createElement("summary", {
                      className: "list-none cursor-pointer min-h-[44px] flex flex-wrap items-center justify-between gap-2 rounded-lg px-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600"
                    },
                      React.createElement("span", { className: "inline-flex items-center gap-2 text-[11px] font-black text-violet-900" },
                        React.createElement("span", { "aria-hidden": true, className: "group-open:rotate-90 transition-transform" }, '▶'),
                        __alloT('stem.rocks.wb_review_all_matches', 'Review all measured matches')
                      ),
                      React.createElement("span", { className: matchCountClass }, matchCount)
                    ),
                    React.createElement("div", { className: "mt-2" }, matchRows)
                  );
                }
                return React.createElement("div", {
                  className: "mt-3 rounded-xl border border-violet-200 bg-white/90 p-2.5 sm:p-3 text-left",
                  role: "group", "aria-label": __alloT('stem.rocks.wb_match_map_aria', 'Evidence match map for ') + m.label,
                  "data-wb-match-map": context
                },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-2" },
                    React.createElement("p", { className: "text-[11px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.wb_match_map_title', 'Evidence match map')),
                    React.createElement("span", { className: matchCountClass }, matchCount)
                  ),
                  matchRows
                );
              };

              // A tentative claim is easier to revise when the learner can see
              // the closest alternative, not just a count of candidates. Score
              // similarity across the six reference properties, then surface
              // only the properties whose values could actually separate the
              // selected candidate from that remaining look-alike.
              var wbSimilarityScoreFor = function (a, b) {
                if (!a || !b) return -1;
                var score = 0;
                if (rkLusterClass(a) === rkLusterClass(b)) score++;
                if (rkFormClass(a) === rkFormClass(b)) score++;
                if (wbStreakOutcomeFor(a).id === wbStreakOutcomeFor(b).id) score++;
                if (Math.abs(a.hardness - b.hardness) <= 1) score++;
                if ((WB_CARBONATES.indexOf(a.id) !== -1) === (WB_CARBONATES.indexOf(b.id) !== -1)) score++;
                if ((WB_MAGNETIC.indexOf(a.id) !== -1) === (WB_MAGNETIC.indexOf(b.id) !== -1)) score++;
                if (wbDensityOutcomeFor(a).id === wbDensityOutcomeFor(b).id) score++;
                return score;
              };
              var wbFaceoffRival = null;
              if (wbSelected) {
                wbViableCandidates.forEach(function (m) {
                  if (!m || m.id === wbSelected.id) return;
                  if (!wbFaceoffRival || wbSimilarityScoreFor(wbSelected, m) > wbSimilarityScoreFor(wbSelected, wbFaceoffRival)) wbFaceoffRival = m;
                });
              }
              var wbFaceoffSeparatorsFor = function (a, b) {
                if (!a || !b) return [];
                var separators = [];
                var add = function (item) { if (item.differs) separators.push(item); };
                add({
                  id: 'luster', icon: '🔍', label: __alloT('stem.rocks.wb_faceoff_luster', 'Luster'), differs: rkLusterClass(a) !== rkLusterClass(b),
                  a: a.luster + ' (' + rkLusterClassInfo(rkLusterClass(a)).label + ')', b: b.luster + ' (' + rkLusterClassInfo(rkLusterClass(b)).label + ')', measured: !!wb.lens,
                  prompt: __alloT('stem.rocks.wb_faceoff_luster_prompt', 'Compare how each surface reflects light under the hand lens.')
                });
                add({
                  id: 'form', icon: '🔷', label: __alloT('stem.rocks.wb_faceoff_form', 'Form'), differs: rkFormClass(a) !== rkFormClass(b),
                  a: rkFormClassInfo(rkFormClass(a)).label, b: rkFormClassInfo(rkFormClass(b)).label, measured: !!wb.formObs,
                  prompt: __alloT('stem.rocks.wb_faceoff_form_prompt', 'Look at how each fragment breaks: corners, sheets, columns or no faces at all.')
                });
                add({
                  id: 'streak', icon: '➖', label: __alloT('stem.rocks.wb_faceoff_streak', 'Streak'), differs: wbStreakOutcomeFor(a).id !== wbStreakOutcomeFor(b).id,
                  a: wbStreakOutcomeFor(a).label, b: wbStreakOutcomeFor(b).label, measured: !!wb.streakObs,
                  prompt: __alloT('stem.rocks.wb_faceoff_streak_prompt', 'Powder color—or a scratched plate—can separate these references.')
                });
                add({
                  id: 'hardness', icon: '⛏️', label: __alloT('stem.rocks.wb_faceoff_hardness', 'Hardness'), differs: Math.abs(a.hardness - b.hardness) >= 0.5,
                  a: a.hardness + ' Mohs', b: b.hardness + ' Mohs', measured: wbHasHardnessEvidence,
                  prompt: __alloT('stem.rocks.wb_faceoff_hardness_prompt', 'Choose a Mohs reference between their values to refine the bracket.')
                });
                add({
                  id: 'acid', icon: '🧪', label: __alloT('stem.rocks.wb_faceoff_acid', 'Acid reaction'), differs: (WB_CARBONATES.indexOf(a.id) !== -1) !== (WB_CARBONATES.indexOf(b.id) !== -1),
                  a: WB_CARBONATES.indexOf(a.id) !== -1 ? __alloT('stem.rocks.wb_faceoff_fizzes', 'Fizzes') : __alloT('stem.rocks.wb_faceoff_no_reaction', 'No reaction'),
                  b: WB_CARBONATES.indexOf(b.id) !== -1 ? __alloT('stem.rocks.wb_faceoff_fizzes', 'Fizzes') : __alloT('stem.rocks.wb_faceoff_no_reaction', 'No reaction'), measured: !!wb.fizz,
                  prompt: __alloT('stem.rocks.wb_faceoff_acid_prompt', 'A fizz versus no-fizz result is strongly diagnostic.')
                });
                add({
                  id: 'magnetism', icon: '🧲', label: __alloT('stem.rocks.wb_faceoff_magnet', 'Magnetism'), differs: (WB_MAGNETIC.indexOf(a.id) !== -1) !== (WB_MAGNETIC.indexOf(b.id) !== -1),
                  a: WB_MAGNETIC.indexOf(a.id) !== -1 ? __alloT('stem.rocks.wb_faceoff_pull', 'Strong pull') : __alloT('stem.rocks.wb_faceoff_no_pull', 'No pull'),
                  b: WB_MAGNETIC.indexOf(b.id) !== -1 ? __alloT('stem.rocks.wb_faceoff_pull', 'Strong pull') : __alloT('stem.rocks.wb_faceoff_no_pull', 'No pull'), measured: !!wb.magnet,
                  prompt: __alloT('stem.rocks.wb_faceoff_magnet_prompt', 'A magnetic pull can immediately separate these references.')
                });
                add({
                  id: 'density', icon: '⚖️', label: __alloT('stem.rocks.wb_faceoff_density', 'Density'), differs: wbDensityOutcomeFor(a).id !== wbDensityOutcomeFor(b).id,
                  a: a.density ? a.density.toFixed(2) + ' g/cm³ · ' + wbDensityOutcomeFor(a).label : __alloT('stem.rocks.wb_faceoff_unknown', 'Unknown'),
                  b: b.density ? b.density.toFixed(2) + ' g/cm³ · ' + wbDensityOutcomeFor(b).label : __alloT('stem.rocks.wb_faceoff_unknown', 'Unknown'), measured: !!wb.densityObs,
                  prompt: __alloT('stem.rocks.wb_faceoff_density_prompt', 'Calculated density can separate minerals that look alike.')
                });
                return separators;
              };
              var wbFaceoffSeparators = wbFaceoffSeparatorsFor(wbSelected, wbFaceoffRival);
              var wbRenderLookalikeFaceoff = function () {
                if (!wbSelected || !wbFaceoffRival || wb.solvedId || wbCandidateView === 'setaside' || wbReviewCandidate) return null;
                var measuredMatches = wbMatchRowsFor(wbSelected).length;
                return React.createElement("section", {
                  className: "mt-3 rounded-2xl border-2 border-sky-300 bg-gradient-to-br from-sky-50 via-white to-violet-50 p-3 sm:p-4",
                  "aria-labelledby": "wb-lookalike-title", "data-wb-lookalike-faceoff": wbFaceoffRival.id, "data-wb-lookalike-separators": wbFaceoffSeparators.length
                },
                  React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-2" },
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-sky-800" }, __alloT('stem.rocks.wb_faceoff_eyebrow', 'Closest look-alike still supported')),
                      React.createElement("h5", { id: "wb-lookalike-title", className: "text-[14px] sm:text-[15px] font-black text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, wbSelected.label + ' ' + __alloT('stem.rocks.wb_faceoff_vs', 'versus') + ' ' + wbFaceoffRival.label),
                      React.createElement("p", { className: "text-[10.5px] sm:text-[11px] text-slate-700 mt-1 leading-relaxed" }, __alloT('stem.rocks.wb_faceoff_body_start', 'Both still fit ') + measuredMatches + (measuredMatches === 1 ? __alloT('stem.rocks.wb_faceoff_match_one', ' measured property. Use a reference difference below before treating the claim as settled.') : __alloT('stem.rocks.wb_faceoff_match_many', ' measured properties. Use a reference difference below before treating the claim as settled.')))
                    ),
                    React.createElement("span", { className: "rounded-full border border-sky-300 bg-white px-2.5 py-1 text-[10px] font-black text-sky-900 shrink-0" }, wbFaceoffSeparators.length + (wbFaceoffSeparators.length === 1 ? __alloT('stem.rocks.wb_faceoff_way_one', ' separating property') : __alloT('stem.rocks.wb_faceoff_way_many', ' separating properties')))
                  ),
                  React.createElement("div", { className: "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 sm:gap-4 mt-3", role: "group", "aria-label": __alloT('stem.rocks.wb_faceoff_pair_aria', 'Selected candidate compared with its closest remaining look-alike') },
                    React.createElement("div", { className: "rounded-xl border-2 border-violet-300 bg-white p-2.5 text-center min-w-0", "data-wb-faceoff-side": "selected" },
                      React.createElement("div", { className: "mx-auto w-fit rounded-xl ring-2 ring-violet-200" }, rkMineralSwatch(React.createElement, wbSelected, 68)),
                      React.createElement("p", { className: "text-[10.5px] sm:text-[12px] font-black text-violet-900 mt-2", style: { overflowWrap: 'anywhere' } }, wbSelected.label),
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-violet-700 mt-0.5" }, __alloT('stem.rocks.wb_faceoff_your_claim', 'Your claim'))
                    ),
                    React.createElement("span", { className: "w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black shadow-sm", "aria-hidden": "true" }, __alloT('stem.rocks.wb_faceoff_vs_short', 'VS')),
                    React.createElement("div", { className: "rounded-xl border-2 border-sky-300 bg-white p-2.5 text-center min-w-0", "data-wb-faceoff-side": "rival" },
                      React.createElement("div", { className: "mx-auto w-fit rounded-xl ring-2 ring-sky-200" }, rkMineralSwatch(React.createElement, wbFaceoffRival, 68)),
                      React.createElement("p", { className: "text-[10.5px] sm:text-[12px] font-black text-sky-900 mt-2", style: { overflowWrap: 'anywhere' } }, wbFaceoffRival.label),
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-sky-800 mt-0.5" }, __alloT('stem.rocks.wb_faceoff_alternative', 'Closest alternative'))
                    )
                  ),
                  wbFaceoffSeparators.length ? React.createElement("div", { className: "mt-3" },
                    React.createElement("p", { className: "text-[10.5px] font-black text-slate-900 mb-2" }, __alloT('stem.rocks.wb_faceoff_distinguish', 'Properties that can distinguish this pair')),
                    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2", role: "list" }, wbFaceoffSeparators.map(function (item) {
                      return React.createElement("div", { key: item.id, role: "listitem", "data-wb-faceoff-separator": item.id, "data-wb-faceoff-test-state": item.measured ? 'refine' : 'unmeasured', className: "rounded-xl border border-slate-200 bg-white p-2.5 min-w-0" },
                        React.createElement("div", { className: "flex items-center justify-between gap-2" },
                          React.createElement("p", { className: "text-[11px] font-black text-slate-900" }, item.icon + ' ' + item.label),
                          React.createElement("span", { className: "rounded-full px-2 py-0.5 text-[10px] font-black " + (item.measured ? "bg-amber-100 text-amber-900" : "bg-sky-100 text-sky-900") }, item.measured ? __alloT('stem.rocks.wb_faceoff_refine', 'Refine this test') : __alloT('stem.rocks.wb_faceoff_not_tested', 'Not tested yet'))
                        ),
                        React.createElement("dl", { className: "grid grid-cols-2 gap-2 mt-2" },
                          React.createElement("div", { className: "min-w-0 border-r border-slate-200 pr-2" },
                            React.createElement("dt", { className: "text-[10px] font-black text-violet-700", style: { overflowWrap: 'anywhere' } }, wbSelected.label),
                            React.createElement("dd", { className: "text-[10.5px] font-bold text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, item.a)
                          ),
                          React.createElement("div", { className: "min-w-0" },
                            React.createElement("dt", { className: "text-[10px] font-black text-sky-800", style: { overflowWrap: 'anywhere' } }, wbFaceoffRival.label),
                            React.createElement("dd", { className: "text-[10.5px] font-bold text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, item.b)
                          )
                        ),
                        React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-2 leading-relaxed" }, item.prompt)
                      );
                    }))
                  ) : React.createElement("p", { className: "mt-3 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-[10.5px] text-amber-900" }, __alloT('stem.rocks.wb_faceoff_no_separator', 'These references overlap on the available properties. Add another independent observation and keep the claim tentative.'))
                );
              };

              // Set-aside candidates are evidence to learn from, not disabled
              // dead ends. This inspector makes every measured match and
              // conflict visible, and treats a rejected-but-still-matching
              // claim as a prompt for a more diagnostic test.
              var wbRenderSetAsideInspector = function () {
                if (!wbReviewCandidate) return null;
                var rows = wbMatchRowsFor(wbReviewCandidate);
                var conflicts = rows.filter(function (row) { return !row.matches; });
                var unresolved = conflicts.length === 0;
                return React.createElement("section", {
                  id: "wb-setaside-inspector", className: "mt-3 rounded-2xl border-2 p-3 sm:p-4 " + (unresolved ? "border-amber-300 bg-amber-50" : "border-rose-300 bg-rose-50"),
                  "aria-labelledby": "wb-setaside-review-title", "data-wb-setaside-inspector": unresolved ? 'unresolved' : 'conflict'
                },
                  React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-3" },
                    React.createElement("div", { className: "flex items-start gap-3 min-w-0" },
                      React.createElement("span", { className: "shrink-0 rounded-xl border bg-white p-1 " + (unresolved ? "border-amber-200" : "border-rose-200"), "aria-hidden": "true" }, rkMineralSwatch(React.createElement, wbReviewCandidate, 54)),
                      React.createElement("div", { className: "min-w-0" },
                        React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] " + (unresolved ? "text-amber-800" : "text-rose-800") }, __alloT('stem.rocks.wb_review_label', 'Set-aside evidence inspector')),
                        React.createElement("h5", { id: "wb-setaside-review-title", className: "text-[14px] sm:text-[15px] font-black text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, __alloT('stem.rocks.wb_review_why', 'Why review ') + wbReviewCandidate.label + '?'),
                        React.createElement("p", { className: "text-[10.5px] sm:text-[11px] mt-1 leading-relaxed " + (unresolved ? "text-amber-900" : "text-rose-900") }, unresolved
                          ? __alloT('stem.rocks.wb_review_unresolved', 'Every current observation still matches. The earlier claim was rejected, so another diagnostic test is needed.')
                          : conflicts.length + ' ' + (conflicts.length === 1 ? __alloT('stem.rocks.wb_review_conflict_one', 'measured property conflicts with this candidate.') : __alloT('stem.rocks.wb_review_conflict_many', 'measured properties conflict with this candidate.')))
                      )
                    ),
                    React.createElement("button", {
                      type: "button", onClick: function () { var returnId = wbReviewCandidate.id; wbUpdateAndFocus({ reviewId: null }, '[data-wb-candidate="' + returnId + '"]'); wbSay(__alloT('stem.rocks.wb_review_closed_sr', 'Set-aside evidence review closed.')); },
                      className: "w-full sm:w-auto shrink-0 rounded-xl border bg-white px-3 py-2 min-h-[44px] text-[10.5px] font-black text-slate-800 hover:bg-slate-50 " + (unresolved ? "border-amber-300" : "border-rose-300"),
                      "aria-label": __alloT('stem.rocks.wb_review_close_aria', 'Close evidence review for ') + wbReviewCandidate.label,
                      "data-wb-review-close": wbReviewCandidate.id
                    }, __alloT('stem.rocks.wb_review_close', 'Close review'))
                  ),
                  rows.length ? React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3", role: "list", "aria-label": __alloT('stem.rocks.wb_review_rows_aria', 'Measured evidence compared with candidate reference values') },
                    rows.map(function (row) {
                      return React.createElement("div", {
                        key: row.id, role: "listitem", "data-wb-review-property": row.id, "data-wb-review-state": row.matches ? 'match' : 'conflict',
                        className: "rounded-xl border bg-white p-2.5 min-w-0 " + (row.matches ? "border-emerald-300" : "border-rose-400")
                      },
                        React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-1.5" },
                          React.createElement("p", { className: "text-[11.5px] font-black text-slate-900" }, row.label),
                          React.createElement("span", { className: "rounded-full px-2 py-0.5 text-[10px] font-black " + (row.matches ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800") }, (row.matches ? '\u2713 ' + __alloT('stem.rocks.wb_review_match', 'Match') : '\u00d7 ' + __alloT('stem.rocks.wb_review_conflict', 'Conflict')))
                        ),
                        React.createElement("dl", { className: "grid grid-cols-2 gap-2 mt-2" },
                          React.createElement("div", { className: "min-w-0 border-r border-slate-200 pr-2" },
                            React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_unknown_observation', 'Unknown observation')),
                            React.createElement("dd", { className: "text-[11px] font-bold text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, row.unknown)
                          ),
                          React.createElement("div", { className: "min-w-0" },
                            React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_candidate_reference', 'Candidate reference')),
                            React.createElement("dd", { className: "text-[11px] font-bold mt-0.5 " + (row.matches ? "text-emerald-900" : "text-rose-900"), style: { overflowWrap: 'anywhere' } }, row.candidate)
                          )
                        )
                      );
                    })
                  ) : null,
                  React.createElement("aside", { className: "mt-3 rounded-xl border p-2.5 flex gap-2.5 items-start " + (unresolved ? "border-amber-300 bg-white/80" : "border-rose-200 bg-white/80") },
                    React.createElement("span", { className: "text-lg leading-none", "aria-hidden": "true" }, unresolved ? wbNext.icon : '\u21b3'),
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("p", { className: "text-[10.5px] font-black text-slate-900" }, unresolved ? __alloT('stem.rocks.wb_review_next_title', 'Best next distinction: ') + wbNext.title : __alloT('stem.rocks.wb_review_rule_title', 'Evidence rule: one diagnostic conflict is enough.')),
                      React.createElement("p", { className: "text-[10px] text-slate-700 mt-0.5 leading-relaxed" }, unresolved ? wbNext.detail : __alloT('stem.rocks.wb_review_rule_body', 'A supported identification must agree with every measured diagnostic property, even when several other properties match.'))
                    )
                  )
                );
              };

              // Every completed test leaves a persistent visual trace here.
              // The bench animations are momentary by design; this rail keeps
              // their results visible while the learner scrolls and compares.
              var wbRailItems = [
                { id: 'luster', icon: '🔍', label: __alloT('stem.rocks.wb_rail_luster', 'Luster'), done: !!wb.lens, value: wb.lens ? rkLusterClassInfo(wb.lens).label : __alloT('stem.rocks.wb_rail_pending', 'Not measured') },
                { id: 'form', icon: '🔷', label: __alloT('stem.rocks.wb_rail_form', 'Form'), done: !!wb.formObs, value: wb.formObs ? rkFormClassInfo(wb.formObs).label : __alloT('stem.rocks.wb_rail_pending', 'Not measured') },
                { id: 'streak', icon: '➖', label: __alloT('stem.rocks.wb_rail_streak', 'Streak plate'), done: !!wb.streakObs, caution: wbPlateScratched, value: wb.streakObs ? wbStreakChoiceFor(wb.streakObs).label : __alloT('stem.rocks.wb_rail_pending', 'Not measured') },
                { id: 'hardness', icon: '⛏️', label: __alloT('stem.rocks.wb_rail_hardness', 'Hardness'), done: wbHardnessConfirmed, provisional: wbHardnessProvisional, derived: wbPlateScratched && wbScratchCount === 0, value: wbHasHardnessEvidence ? wbHardnessLabel : __alloT('stem.rocks.wb_rail_pending', 'Not measured') },
                { id: 'acid', icon: '🧪', label: __alloT('stem.rocks.wb_rail_acid', 'Acid'), done: !!wb.fizz, value: wb.fizz ? (wb.fizz === 'fizz' ? __alloT('stem.rocks.wb_match_fizzes', 'Fizzes') : __alloT('stem.rocks.wb_match_no_reaction', 'No reaction')) : __alloT('stem.rocks.wb_rail_pending', 'Not measured') },
                { id: 'magnetism', icon: '🧲', label: __alloT('stem.rocks.wb_rail_magnet', 'Magnetism'), done: !!wb.magnet, value: wb.magnet ? (wb.magnet === 'pull' ? __alloT('stem.rocks.wb_match_strong_pull', 'Strong pull') : __alloT('stem.rocks.wb_match_no_attraction', 'No attraction')) : __alloT('stem.rocks.wb_rail_pending', 'Not measured') },
                { id: 'density', icon: '⚖️', label: __alloT('stem.rocks.wb_rail_density', 'Density'), done: !!wb.densityObs, value: wb.densityObs ? wbComputedDensity.toFixed(2) + ' g/cm³ · ' + wbDensityChoiceFor(wb.densityObs).label : __alloT('stem.rocks.wb_rail_pending', 'Not measured') }
              ];
              var wbRailGraphic = function (item) {
                if (item.id === 'streak' && item.done && sp) {
                  return React.createElement("span", { className: "w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center shrink-0", style: { background: '#e8e5de' }, "aria-hidden": "true" },
                    rkStreakPlateTooHard(sp)
                      ? React.createElement("span", { style: { display: 'block', width: 28, borderTop: '2px solid #64748b', transform: 'rotate(-10deg)' } })
                      : React.createElement("span", { style: { display: 'block', width: 28, height: 6, borderRadius: 999, transform: 'rotate(-10deg)', background: RK_STREAK_HEX[sp.streak] || '#cbd5e1', border: (RK_STREAK_HEX[sp.streak] === '#ffffff' ? '1px solid #94a3b8' : 'none') } })
                  );
                }
                if (item.id === 'luster' && item.done && sp) {
                  return React.createElement("span", { className: "w-10 h-10 rounded-lg border border-slate-400 relative overflow-hidden shrink-0", style: { display: 'block', background: sp.color }, "aria-hidden": "true" },
                    React.createElement("span", { style: { position: 'absolute', width: 20, height: 8, borderRadius: 999, left: 7, top: 7, transform: 'rotate(-24deg)', background: 'rgba(255,255,255,' + (sp.luster.indexOf('Metallic') !== -1 ? '.78' : sp.luster.indexOf('Vitreous') !== -1 ? '.58' : '.32') + ')' } })
                  );
                }
                return React.createElement("span", { className: "w-10 h-10 rounded-lg border flex items-center justify-center text-xl shrink-0 " + (item.caution || item.provisional ? "bg-amber-50 border-amber-300" : item.done ? "bg-emerald-50 border-emerald-300" : "bg-slate-100 border-slate-200"), "aria-hidden": "true" }, item.icon);
              };
              var wbRenderTestForecast = function (embedded) {
                if (wbBusy || wb.solvedId || wbForecastGroups.length < 2 || wbViableCandidates.length < 2) return null;
                var activePredictionBranch = wbPredictionTool === wbNext.tool ? wbForecastGroups.filter(function (group) { return group.id === wbPredictionValue; })[0] : null;
                var forecastUsesTolerance = wbForecastGroups.some(function (group) { return group.count !== group.remainingCount; });
                var forecastLabel = wbViableCandidates.length + __alloT('stem.rocks.wb_forecast_aria_mid', ' current candidates divide into ') + wbForecastGroups.length + __alloT('stem.rocks.wb_forecast_aria_end', ' possible outcome groups: ') + wbForecastGroups.map(function (group) {
                  return group.label + ', ' + group.count + ': ' + group.candidates.map(function (candidate) { return candidate.label; }).join(', ');
                }).join('; ');
                return React.createElement(embedded ? "details" : "section", {
                  className: embedded ? "mt-3 pt-3 border-t border-amber-200 group" : "rounded-2xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 to-white p-3 sm:p-4", "aria-labelledby": "wb-test-forecast-title",
                  "data-wb-forecast-disclosure": embedded ? 'progressive' : undefined,
                  "data-wb-test-forecast": wbNext.tool, "data-wb-forecast-outcomes": wbForecastGroups.length
                },
                  embedded ? React.createElement("summary", { className: "cursor-pointer list-none rounded-xl bg-white/80 border border-amber-200 px-3 py-2.5 min-h-[44px] flex items-center justify-between gap-3 text-left hover:bg-white" },
                    React.createElement("span", { className: "min-w-0" },
                      React.createElement("span", { className: "block text-[10px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.wb_forecast_eyebrow', 'Plan before you test')),
                      React.createElement("span", { className: "block text-[11px] sm:text-[12px] font-black text-slate-900 mt-0.5" }, __alloT('stem.rocks.wb_forecast_preview_start', 'Preview ') + wbForecastGroups.length + __alloT('stem.rocks.wb_forecast_preview_end', ' possible outcomes and make a prediction'))
                    ),
                    React.createElement("span", { className: "text-[10px] font-black text-violet-900 shrink-0" },
                      React.createElement("span", { className: "group-open:hidden" }, __alloT('stem.rocks.wb_open_forecast', 'Open') + ' ▾'),
                      React.createElement("span", { className: "hidden group-open:inline" }, __alloT('stem.rocks.wb_close_forecast', 'Close') + ' ▴')
                    )
                  ) : null,
                  React.createElement("div", { className: embedded ? "mt-3" : "" },
                  React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-start justify-between gap-2" },
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.wb_forecast_eyebrow', 'Plan before you test')),
                      React.createElement("h4", { id: "wb-test-forecast-title", className: "text-[13px] sm:text-[14px] font-black text-slate-900 mt-0.5" }, __alloT('stem.rocks.wb_forecast_question_start', 'How could ') + wbForecastTitleFor(wbNext.tool) + __alloT('stem.rocks.wb_forecast_question_end', ' split the shortlist?')),
                      React.createElement("p", { className: "text-[10.5px] sm:text-[11px] text-slate-700 mt-1 leading-relaxed" }, wbViableCandidates.length + __alloT('stem.rocks.wb_forecast_summary_mid', ' candidates could produce ') + wbForecastGroups.length + __alloT('stem.rocks.wb_forecast_summary_end', ' distinct outcomes. More than one possible outcome makes this a useful diagnostic test.'))
                    ),
                    React.createElement("span", { className: "rounded-full border border-violet-300 bg-white px-2.5 py-1 text-[10px] font-black text-violet-900 shrink-0" }, wbForecastGroups.length + __alloT('stem.rocks.wb_forecast_outcomes_badge', ' outcomes'))
                  ),
                  React.createElement("div", { className: "mt-3 h-3 rounded-full overflow-hidden flex bg-slate-200 ring-1 ring-slate-300", role: "img", "aria-label": forecastLabel },
                    wbForecastGroups.map(function (group, i) {
                      return React.createElement("span", { key: group.id, "aria-hidden": "true", style: { width: (group.count / wbViableCandidates.length * 100) + '%', background: wbForecastPalette[i % wbForecastPalette.length] } });
                    })
                  ),
                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5 mt-2", role: "list", "aria-label": __alloT('stem.rocks.wb_forecast_legend_aria', 'Possible reference outcomes') }, wbForecastGroups.map(function (group, i) {
                    return React.createElement("div", {
                      key: group.id, role: "listitem", className: "rounded-lg border border-slate-200 bg-white px-2.5 py-2 min-w-0",
                      "data-wb-forecast-branch": group.id, "data-wb-branch-count": group.count,
                      "data-wb-branch-remaining": group.remainingCount,
                      "data-wb-forecast-candidates": group.candidates.map(function (candidate) { return candidate.id; }).join(','),
                      "data-wb-forecast-retained": group.remainingCandidates.map(function (candidate) { return candidate.id; }).join(',')
                    },
                      React.createElement("div", { className: "flex items-center gap-2 min-w-0" },
                        React.createElement("span", { className: "w-2.5 h-2.5 rounded-full shrink-0", style: { background: wbForecastPalette[i % wbForecastPalette.length] }, "aria-hidden": "true" }),
                        React.createElement("span", { className: "text-[10.5px] font-bold text-slate-800 min-w-0 flex-1", style: { overflowWrap: 'anywhere' } }, group.label),
                        React.createElement("span", { className: "rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-700 shrink-0" }, group.count + __alloT('stem.rocks.wb_forecast_can_produce', ' can produce this'))
                      ),
                      React.createElement("p", { className: "mt-1.5 pl-[18px] text-[10.5px] text-slate-600 leading-relaxed", style: { overflowWrap: 'anywhere' } },
                        React.createElement("span", { className: "font-black text-violet-800" }, __alloT('stem.rocks.wb_branch_keeps', 'Would keep: ')),
                        group.remainingCandidates.map(function (candidate) { return candidate.label; }).join(', ')
                      )
                    );
                  })),
                  forecastUsesTolerance ? React.createElement("p", {
                    className: "mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-900 leading-relaxed",
                    "data-wb-forecast-tolerance-note": "visible"
                  }, __alloT('stem.rocks.wb_forecast_tolerance_note', 'Bar widths show exact modeled outcomes. “Would keep” also includes near-match candidates retained by the ±0.5 Mohs tolerance, so those counts can differ.')) : null,
                  React.createElement("fieldset", { className: "mt-3 pt-3 border-t border-violet-200" },
                    React.createElement("legend", { className: "px-1 text-[11px] font-black text-violet-900" }, __alloT('stem.rocks.wb_forecast_predict', 'Optional prediction: what do you think you will observe?')),
                    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1" }, wbForecastGroups.map(function (group) {
                      var chosen = wbPredictionTool === wbNext.tool && wbPredictionValue === group.id;
                      return React.createElement("button", {
                        key: group.id, type: "button", "aria-pressed": chosen, "data-wb-prediction-outcome": group.id, "data-wb-prediction-branch-size": group.remainingCount,
                        "aria-label": __alloT('stem.rocks.wb_predict_aria_start', 'Predict ') + group.label + '. ' + __alloT('stem.rocks.wb_predict_aria_mid', 'This branch would leave ') + group.remainingCount + (group.remainingCount === 1 ? __alloT('stem.rocks.wb_forecast_candidate_one', ' candidate') : __alloT('stem.rocks.wb_forecast_candidate_many', ' candidates')) + '.',
                        onClick: function () { updWb({ predictionTool: wbNext.tool, predictionValue: group.id }); wbSay(__alloT('stem.rocks.wb_prediction_saved_sr', 'Prediction saved: ') + group.label + '. ' + __alloT('stem.rocks.wb_predict_aria_mid', 'This branch would leave ') + group.remainingCount + (group.remainingCount === 1 ? __alloT('stem.rocks.wb_forecast_candidate_one', ' candidate') : __alloT('stem.rocks.wb_forecast_candidate_many', ' candidates')) + '. ' + __alloT('stem.rocks.wb_prediction_saved_sr2', 'Run the recommended test and compare the observation.')); },
                        className: "rounded-xl border px-3 py-2.5 min-h-[48px] text-left text-[10.5px] font-black transition-all " + (chosen ? "bg-violet-100 border-violet-500 text-violet-900 ring-2 ring-violet-200" : "bg-white border-slate-300 text-slate-800 hover:border-violet-400 hover:bg-violet-50")
                      },
                        React.createElement("span", { className: "block" }, (chosen ? '✓ ' : '') + group.label),
                        React.createElement("span", { className: "block mt-1 text-[10px] font-semibold text-slate-600" }, __alloT('stem.rocks.wb_branch_would_leave', 'Would leave ') + group.remainingCount + (group.remainingCount === 1 ? __alloT('stem.rocks.wb_forecast_candidate_one', ' candidate') : __alloT('stem.rocks.wb_forecast_candidate_many', ' candidates')))
                      );
                    })),
                    activePredictionBranch ? React.createElement("aside", {
                      className: "mt-2 rounded-xl border border-violet-300 bg-violet-50 p-2.5",
                      "data-wb-prediction-branch": activePredictionBranch.id,
                      "data-wb-prediction-remaining": activePredictionBranch.remainingCount
                    },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.wb_working_hypothesis', 'Working hypothesis')),
                      React.createElement("p", { className: "text-[10.5px] text-slate-800 mt-0.5 leading-relaxed" },
                        __alloT('stem.rocks.wb_branch_if', 'If ') + activePredictionBranch.label + __alloT('stem.rocks.wb_branch_then', ' occurs, ') + activePredictionBranch.remainingCount + (activePredictionBranch.remainingCount === 1 ? __alloT('stem.rocks.wb_branch_one_remains', ' candidate would remain: ') : __alloT('stem.rocks.wb_branch_many_remain', ' candidates would remain: ')) + activePredictionBranch.remainingCandidates.map(function (candidate) { return candidate.label; }).join(', ') + '.'
                      )
                    ) : null
                  ),
                  React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-2 leading-relaxed" }, __alloT('stem.rocks.wb_forecast_not_grade', 'A prediction is a hypothesis, not a grade. A surprising result is useful evidence.'))
                  )
                );
              };
              var wbRenderActionHub = function () {
                var focusStep = wbSteps[wbStage] || wbSteps[0];
                var focusTitle = wbSelected && wbNext.tool !== 'claim'
                  ? __alloT('stem.rocks.wb_step_strengthen', 'Strengthen your claim')
                  : focusStep.title;
                return React.createElement("section", {
                  className: "rounded-2xl border-2 p-3 sm:p-4 " + (wbBusy ? "border-sky-300 bg-sky-50" : "border-amber-300 bg-amber-50"),
                  "aria-labelledby": "wb-action-hub-title", "data-wb-action-hub": "unified", "data-wb-action-tool": wbNext.tool
                },
                  React.createElement("div", { className: "flex gap-3 items-start min-w-0" },
                    React.createElement("span", { className: "w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0", "aria-hidden": "true" }, wbBusy ? '⏳' : wbNext.icon),
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.14em] " + (wbBusy ? "text-sky-800" : "text-amber-800") }, wbBusy ? __alloT('stem.rocks.wb_observing_now', 'Observation in progress') : __alloT('stem.rocks.wb_current_focus', 'Next scientific move') + ' · ' + focusTitle),
                      React.createElement("h4", { id: "wb-action-hub-title", className: "text-[14px] sm:text-[15px] font-black text-slate-900 mt-0.5" }, wbBusy ? wbAnimLabel : wbNext.title),
                      React.createElement("p", { className: "text-[11px] sm:text-[11.5px] text-slate-700 mt-1 leading-relaxed" }, wbBusy ? __alloT('stem.rocks.wb_watch_change', 'Watch the specimen station, then find the observation in your notebook.') : wbNext.detail),
                      !wbBusy && typeof wbNext.expectedRemaining === 'number' ? React.createElement("p", { className: "text-[10.5px] font-bold text-violet-900 mt-2 leading-relaxed", "data-wb-information-gain": wbNext.expectedRemaining.toFixed(1), "data-wb-ranked-tests": wbTestRankings.length },
                        __alloT('stem.rocks.wb_info_gain_start', 'Best expected split: about ') + wbNext.expectedRemaining.toFixed(1) + __alloT('stem.rocks.wb_info_gain_mid', ' candidates would remain after a typical result. Compared across ') + wbTestRankings.length + __alloT('stem.rocks.wb_info_gain_end', ' useful available tests.') + ' ' + __alloT('stem.rocks.wb_info_gain_assumption', 'Estimate assumes each remaining candidate is equally likely.')
                      ) : null
                    )
                  ),
                  !wbBusy && wbNext.tool === 'record' ? React.createElement("button", { type: "button", className: "mt-3 w-full sm:w-auto rounded-xl bg-sky-800 hover:bg-sky-900 text-white px-3.5 py-2.5 min-h-[44px] text-[11px] font-black", "data-wb-open-observation": wbPendingTool, onClick: function () { wbFocusAfterUpdate('[data-wb-observe-choice]'); } }, __alloT('stem.rocks.wb_go_observe', 'Go to the observation card')) : null,
                  !wbBusy && wbNext.tool !== 'claim' && wbNext.tool !== 'record' && wbNext.tool.indexOf('reconcile-') !== 0 && !wbToolsOpen ? React.createElement("button", {
                    type: "button", className: "mt-3 w-full sm:w-auto rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-2.5 min-h-[44px] text-[11px] font-black",
                    "aria-controls": "wb-tools-panel", "aria-expanded": false, "data-wb-open-recommended": wbNext.tool,
                    onClick: function () { wbUpdateAndFocus({ toolsExpanded: true }, '[data-wb-tool="' + wbNext.tool + '"]'); wbSay(__alloT('stem.rocks.wb_tools_opened_sr', 'Instrument tray opened. The recommended test is ') + wbNext.title + '.'); }
                  }, __alloT('stem.rocks.wb_open_recommended', 'Open recommended instrument')) : null,
                  !wbBusy && wbNext.tool === 'reconcile-hardness' ? React.createElement("button", {
                    type: "button", className: "mt-3 w-full sm:w-auto rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-2.5 min-h-[44px] text-[11px] font-black",
                    "data-wb-recovery-action": "hardness",
                    onClick: wbClearHardness
                  }, __alloT('stem.rocks.wb_clear_hardness', 'Clear hardness trials and retest')) : null,
                  !wbBusy && wbNext.tool === 'reconcile-evidence' ? React.createElement("button", {
                    type: "button", className: "mt-3 w-full sm:w-auto rounded-xl bg-amber-800 hover:bg-amber-900 text-white px-3.5 py-2.5 min-h-[44px] text-[11px] font-black",
                    "data-wb-recovery-action": "evidence",
                    onClick: wbClearEvidence
                  }, __alloT('stem.rocks.wb_clear_recheck', 'Clear observations and recheck')) : null,
                  wbRenderTestForecast(wbGuided)
                );
              };
              var wbRenderPredictionReflection = function () {
                if (!wbPredictionActual || !wbPredictionExpected) return null;
                return React.createElement("aside", {
                  className: "mt-3 rounded-xl border p-3 " + (wbPredictionMatched ? "border-emerald-300 bg-emerald-50" : "border-sky-300 bg-sky-50"),
                  "data-wb-prediction-reflection": wbPredictionMatched ? 'matched' : 'updated'
                },
                  React.createElement("div", { className: "flex items-start gap-2.5" },
                    React.createElement("span", { className: "w-9 h-9 rounded-xl bg-white border flex items-center justify-center text-lg shrink-0 " + (wbPredictionMatched ? "border-emerald-200" : "border-sky-200"), "aria-hidden": "true" }, wbPredictionMatched ? '✓' : '↻'),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.12em] " + (wbPredictionMatched ? "text-emerald-800" : "text-sky-800") }, __alloT('stem.rocks.wb_prediction_check', 'Prediction check')),
                      React.createElement("p", { className: "text-[11px] font-black text-slate-900 mt-0.5" }, wbPredictionMatched ? __alloT('stem.rocks.wb_prediction_matched', 'Your prediction matched the observation.') : __alloT('stem.rocks.wb_prediction_updated', 'The observation differed from your prediction—update your model.')),
                      React.createElement("dl", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2" },
                        React.createElement("div", { className: "rounded-lg border border-white bg-white/80 p-2" },
                          React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_prediction_yours', 'You predicted')),
                          React.createElement("dd", { className: "text-[10.5px] font-bold text-violet-900 mt-0.5" }, wbPredictionExpected.label)
                        ),
                        React.createElement("div", { className: "rounded-lg border border-white bg-white/80 p-2" },
                          React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_prediction_observed', 'You observed')),
                          React.createElement("dd", { className: "text-[10.5px] font-bold text-slate-900 mt-0.5" }, wbPredictionActual.label)
                        )
                      ),
                      React.createElement("p", { className: "text-[10px] text-slate-700 mt-2 leading-relaxed" }, wbPredictionMatched ? __alloT('stem.rocks.wb_prediction_matched_body', 'Agreement supports your working model; keep checking it against other properties.') : __alloT('stem.rocks.wb_prediction_updated_body', 'Scientists do not erase surprising evidence. They use it to revise explanations and choose the next test.'))
                    )
                  )
                );
              };
              var wbRenderEvidenceRail = function () {
                return React.createElement("section", { className: "rounded-2xl border border-slate-300 bg-white p-3", "aria-labelledby": "wb-evidence-rail-title", "data-wb-evidence-rail": "persistent" },
                  React.createElement("div", { className: "flex flex-wrap items-end justify-between gap-2 mb-2.5" },
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.14em] text-violet-800" }, __alloT('stem.rocks.wb_rail_eyebrow', 'Persistent results')),
                      React.createElement("h4", { id: "wb-evidence-rail-title", className: "text-[13px] font-black text-slate-900" }, __alloT('stem.rocks.wb_rail_title', 'Specimen evidence rail')),
                      React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5" }, __alloT('stem.rocks.wb_rail_help', 'Each result stays visible while you compare candidates.'))
                    ),
                    React.createElement("span", { className: "rounded-full bg-violet-50 border border-violet-200 px-2.5 py-1 text-[10.5px] font-black text-violet-900" }, wbEvidenceTypeCount + ' / 7 ' + __alloT('stem.rocks.wb_rail_captured', 'confirmed') + (wbProvisionalTypeCount ? ' · ' + wbProvisionalTypeCount + ' ' + __alloT('stem.rocks.wb_provisional_short', 'provisional') : ''))
                  ),
                  React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2", role: "list" }, wbRailItems.map(function (item) {
                    return React.createElement("div", { key: item.id, role: "listitem", "data-wb-rail-property": item.id, "data-wb-rail-state": item.provisional ? 'provisional' : item.caution ? 'hardness-clue' : item.derived ? 'derived' : item.done ? 'captured' : 'pending', className: "rounded-xl border p-2 min-w-0 " + (item.caution || item.provisional ? "bg-amber-50 border-amber-300" : item.done ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-200") },
                      React.createElement("div", { className: "flex items-center gap-2" },
                        wbRailGraphic(item),
                        React.createElement("span", { className: "min-w-0" },
                          React.createElement("span", { className: "block text-[11px] font-black " + (item.caution || item.provisional ? "text-amber-900" : item.done ? "text-emerald-900" : "text-slate-700") }, (item.provisional ? '≈ ' : item.caution ? '↗ ' : item.done ? '✓ ' : '') + item.label),
                          React.createElement("span", { className: "block text-[10.5px] font-semibold mt-0.5 " + (item.done || item.provisional ? "text-slate-800" : "text-slate-600"), style: { overflowWrap: 'anywhere' } }, item.value),
                          item.provisional ? React.createElement("span", { className: "block text-[10px] font-black text-amber-800 mt-0.5" }, __alloT('stem.rocks.wb_provisional_confirm', 'Provisional—confirm')) : null
                        )
                      )
                    );
                  })),
                  wbRenderPredictionReflection()
                );
              };
              var wbPropertyGuideItems = [
                {
                  id: 'luster', icon: '🔍', cue: __alloT('stem.rocks.wb_guide_luster_cue', 'LOOK'), label: __alloT('stem.rocks.wb_guide_luster', 'Luster'), done: !!wb.lens,
                  meaning: __alloT('stem.rocks.wb_guide_luster_meaning', 'How the mineral surface reflects light: metallic, glassy, pearly, waxy, or dull.'),
                  use: __alloT('stem.rocks.wb_guide_luster_use', 'Use it to make a fast first split between broad surface types.'),
                  guard: __alloT('stem.rocks.wb_guide_luster_guard', 'Luster is reflection, not the specimen’s color.')
                },
                {
                  id: 'form', icon: '🔷', cue: __alloT('stem.rocks.wb_guide_form_cue', 'SHAPE'), label: __alloT('stem.rocks.wb_guide_form', 'Form'), done: !!wb.formObs,
                  meaning: __alloT('stem.rocks.wb_guide_form_meaning', 'The shape a mineral grows or breaks into: box-like corners, leaning rhombs, sheets, columns, pyramids, blades, or no faces at all.'),
                  use: __alloT('stem.rocks.wb_guide_form_use', 'A free observation: describe the fragment on the bench (turn it in 3D) before running any instrument.'),
                  guard: __alloT('stem.rocks.wb_guide_form_guard', 'A broken fragment shows cleavage and fracture, not the perfect crystal in a textbook; judge the corners and faces you can see.')
                },
                {
                  id: 'streak', icon: '➖', cue: __alloT('stem.rocks.wb_guide_streak_cue', 'PLATE'), label: __alloT('stem.rocks.wb_guide_streak', 'Streak plate'), done: !!wb.streakObs && !wbPlateScratched,
                  meaning: __alloT('stem.rocks.wb_guide_streak_meaning', 'Softer minerals leave powder color on unglazed porcelain; harder minerals groove the plate instead.'),
                  use: __alloT('stem.rocks.wb_guide_streak_use', 'Use powder color to compare minerals, or a plate groove as evidence that hardness exceeds about 6.5.'),
                  guard: __alloT('stem.rocks.wb_guide_streak_guard', 'Powder color may differ from the outside surface color; a groove is hardness evidence, not a powder streak.')
                },
                {
                  id: 'hardness', icon: '⛏️', cue: __alloT('stem.rocks.wb_guide_hardness_cue', 'SCRATCH'), label: __alloT('stem.rocks.wb_guide_hardness', 'Hardness'), done: wbHardnessConfirmed, provisional: wbHardnessProvisional,
                  meaning: __alloT('stem.rocks.wb_guide_hardness_meaning', 'Resistance to scratching, compared with references on the Mohs scale.'),
                  use: __alloT('stem.rocks.wb_guide_hardness_use', 'Use a no-mark reference and a harder scratching reference to bracket the value.'),
                  guard: __alloT('stem.rocks.wb_guide_hardness_guard', 'Hardness is not toughness or resistance to breaking.')
                },
                {
                  id: 'acid', icon: '🧪', cue: __alloT('stem.rocks.wb_guide_acid_cue', 'BUBBLES'), label: __alloT('stem.rocks.wb_guide_acid', 'Acid reaction'), done: !!wb.fizz,
                  meaning: __alloT('stem.rocks.wb_guide_acid_meaning', 'Calcite gives an immediate carbon-dioxide fizz in cold dilute acid; some other carbonates can react slowly.'),
                  use: __alloT('stem.rocks.wb_guide_acid_use', 'In this reference set, use immediate fizzing as a highly diagnostic calcite clue.'),
                  guard: __alloT('stem.rocks.wb_guide_acid_guard', 'No immediate visible fizz argues against calcite here; it does not prove that every carbonate is absent.')
                },
                {
                  id: 'magnetism', icon: '🧲', cue: __alloT('stem.rocks.wb_guide_magnet_cue', 'PULL'), label: __alloT('stem.rocks.wb_guide_magnet', 'Magnetism'), done: !!wb.magnet,
                  meaning: __alloT('stem.rocks.wb_guide_magnet_meaning', 'A direct attraction between the specimen and a magnet.'),
                  use: __alloT('stem.rocks.wb_guide_magnet_use', 'Use a strong pull to identify an unusually magnetic reference quickly.'),
                  guard: __alloT('stem.rocks.wb_guide_magnet_guard', 'Dark color or heavy feel cannot prove magnetism.')
                },
                {
                  id: 'density', icon: '⚖️', cue: __alloT('stem.rocks.wb_guide_density_cue', 'MASS ÷ VOL'), label: __alloT('stem.rocks.wb_guide_density', 'Density'), done: !!wb.densityObs,
                  meaning: __alloT('stem.rocks.wb_guide_density_meaning', 'Mass divided by volume, measured here in grams per cubic centimeter.'),
                  use: __alloT('stem.rocks.wb_guide_density_use', 'Use it to separate minerals that look similar but have different internal packing.'),
                  guard: __alloT('stem.rocks.wb_guide_density_guard', 'Density is not mass alone; specimen size changes mass, not density.')
                }
              ];
              var wbRenderPropertyGuideGraphic = function (item) {
                return React.createElement("span", {
                  className: "w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 relative overflow-hidden " + (item.provisional ? "bg-amber-50 border-amber-300" : item.done ? "bg-emerald-50 border-emerald-300" : "bg-slate-50 border-slate-300"),
                  "aria-hidden": "true", "data-wb-guide-graphic": item.id
                },
                  React.createElement("span", { className: "text-xl leading-none" }, item.icon),
                  React.createElement("span", { className: "text-[7px] font-black tracking-wide text-slate-800 mt-1" }, item.cue),
                  item.id === 'luster' ? React.createElement("span", { className: "absolute w-5 h-1.5 rounded-full bg-white/80 top-1.5 right-1.5 -rotate-12" }) : null,
                  item.id === 'acid' ? React.createElement(React.Fragment, null,
                    React.createElement("span", { className: "absolute w-1.5 h-1.5 rounded-full bg-sky-500 top-1.5 left-2" }),
                    React.createElement("span", { className: "absolute w-1 h-1 rounded-full bg-sky-600 top-3 left-1.5" })
                  ) : null
                );
              };
              var wbRenderPropertyGuide = function () {
                return React.createElement("details", { className: "group rounded-2xl border border-violet-200 bg-violet-50/60 overflow-hidden", "data-wb-property-guide": "progressive" },
                  React.createElement("summary", { className: "cursor-pointer list-none min-h-[52px] px-3 sm:px-4 py-2.5 flex items-center gap-3 select-none" },
                    React.createElement("span", { className: "w-9 h-9 rounded-xl border border-violet-200 bg-white flex items-center justify-center text-lg shrink-0", "aria-hidden": "true" }, '🧭'),
                    React.createElement("span", { className: "min-w-0 flex-1" },
                      React.createElement("span", { className: "block text-[11.5px] sm:text-[12px] font-black text-violet-900" }, __alloT('stem.rocks.wb_guide_title', 'Need a property refresher? Open the visual guide.')),
                      React.createElement("span", { className: "block text-[10px] sm:text-[10.5px] text-slate-600 mt-0.5" }, __alloT('stem.rocks.wb_guide_summary', 'Six quick definitions, diagnostic uses, and common mix-ups.'))
                    ),
                    React.createElement("span", { className: "hidden sm:inline rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[10px] font-black text-violet-900 shrink-0" }, __alloT('stem.rocks.wb_guide_optional', 'Optional help')),
                    React.createElement("span", { className: "text-violet-800 text-lg font-black transition-transform group-open:rotate-180 shrink-0", "aria-hidden": "true" }, '⌄')
                  ),
                  React.createElement("div", { className: "border-t border-violet-200 bg-white p-3 sm:p-4" },
                    React.createElement("div", { className: "flex flex-wrap items-end justify-between gap-2 mb-3" },
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.wb_guide_eyebrow', 'Read the evidence like a mineralogist')),
                        React.createElement("p", { className: "text-[11px] text-slate-700 mt-0.5" }, __alloT('stem.rocks.wb_guide_intro', 'Each property answers a different question. Combining them is more reliable than color alone.'))
                      ),
                      React.createElement("span", { className: "rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-900" }, wbEvidenceTypeCount + __alloT('stem.rocks.wb_guide_measured_count', ' of 6 confirmed'))
                    ),
                    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5", role: "list", "aria-label": __alloT('stem.rocks.wb_guide_list_aria', 'Mineral property definitions and misconception guards') }, wbPropertyGuideItems.map(function (item) {
                      return React.createElement("article", {
                        key: item.id, role: "listitem", "data-wb-property-guide-card": item.id, "data-wb-guide-state": item.provisional ? 'provisional' : item.done ? 'measured' : 'available',
                        className: "rounded-xl border p-3 min-w-0 " + (item.provisional ? "border-amber-300 bg-amber-50/70" : item.done ? "border-emerald-300 bg-emerald-50/70" : "border-slate-200 bg-slate-50")
                      },
                        React.createElement("div", { className: "flex items-start gap-2.5" },
                          wbRenderPropertyGuideGraphic(item),
                          React.createElement("div", { className: "min-w-0 flex-1" },
                            React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-1" },
                              React.createElement("h5", { className: "text-[12px] font-black text-slate-900" }, item.label),
                              React.createElement("span", { className: "rounded-full px-2 py-0.5 text-[10px] font-black " + (item.provisional ? "bg-amber-100 text-amber-900" : item.done ? "bg-emerald-100 text-emerald-900" : "bg-white text-slate-700 border border-slate-200") }, item.provisional ? __alloT('stem.rocks.wb_provisional_confirm', 'Provisional—confirm') : item.done ? __alloT('stem.rocks.wb_guide_measured', 'Measured') : __alloT('stem.rocks.wb_guide_available', 'Available'))
                            ),
                            React.createElement("p", { className: "text-[10.5px] text-slate-700 mt-1 leading-relaxed" }, item.meaning)
                          )
                        ),
                        React.createElement("p", { className: "text-[10px] font-semibold text-violet-900 mt-2 leading-relaxed" }, __alloT('stem.rocks.wb_guide_use_prefix', 'Diagnostic use: ') + item.use),
                        React.createElement("p", { className: "mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10.5px] text-amber-900 leading-relaxed" }, '⚠ ' + __alloT('stem.rocks.wb_guide_guard_prefix', 'Do not mix it up: ') + item.guard)
                      );
                    }))
                  )
                );
              };

              // Progressive disclosure keeps the phone view from becoming a
              // twelve-card wall after the first observation. Eliminated and
              // rejected cards remain one explicit, reversible filter away.
              var wbShortlistCount = 0, wbCompatibleRejectedCount = 0;
              (wb.order || []).forEach(function (id) {
                var m = wbMineral(id); if (!m) return;
                var wrong = (wb.guessedWrong || []).indexOf(id) !== -1;
                if (!wbFits(m)) return;
                if (wrong) wbCompatibleRejectedCount++;
                else wbShortlistCount++;
              });
              var wbSetAsideCount = (wb.order || []).length - wbShortlistCount;
              var wbCandidateView = wb.candidateView || (wbEvidence.length ? 'shortlist' : 'all');
              if (['shortlist', 'setaside', 'all'].indexOf(wbCandidateView) === -1) wbCandidateView = 'all';
              var wbCandidateVisible = function (out, wrong) {
                return wbCandidateView === 'all' || (wbCandidateView === 'shortlist' ? (!out && !wrong) : (out || wrong));
              };
              var wbClaimSupport = !wbSelected
                ? { id: 'choose', label: __alloT('stem.rocks.wb_support_choose', 'Choose a candidate'), detail: __alloT('stem.rocks.wb_support_choose_detail', 'Select an active-shortlist card to compare it directly with the unknown.') }
                : !wbClaimReady
                  ? { id: 'building', label: __alloT('stem.rocks.wb_support_building', 'Building evidence'), detail: wbEvidenceTypeCount + ' / 2 ' + __alloT('stem.rocks.wb_types_needed', 'property types needed') }
                  : wbConfirmedRemaining === 1
                    ? { id: 'strong', label: __alloT('stem.rocks.wb_support_strong', 'Strong evidence support'), detail: __alloT('stem.rocks.wb_support_strong_detail', 'Only one candidate remains after confirmed measurements.') }
                    : wbConfirmedRemaining <= 2 && wbEvidenceTypeCount >= 3
                      ? { id: 'good', label: __alloT('stem.rocks.wb_support_good', 'Good evidence support'), detail: __alloT('stem.rocks.wb_support_good_detail', 'The selected candidate matches; one close alternative may remain.') }
                      : { id: 'tentative', label: __alloT('stem.rocks.wb_support_tentative', 'Tentative claim permitted'), detail: wbHardnessProvisional && wbConfirmedRemaining > wbRemaining ? __alloT('stem.rocks.wb_support_provisional_detail', 'A modeled near-match narrows the list, but confirm hardness before treating that narrowing as strong support.') : wbRemaining + __alloT('stem.rocks.wb_support_tentative_detail', ' candidates still fit. Another diagnostic test would strengthen the claim.') };
              var wbMeasuredIds = wbCoverage.filter(function (item) { return item.done; }).map(function (item) { return item.id; });
              var wbClaimEvidence = [];
              (wb.claimEvidence || []).forEach(function (id) {
                if (wbMeasuredIds.indexOf(id) !== -1 && wbClaimEvidence.indexOf(id) === -1) wbClaimEvidence.push(id);
              });
              var wbReasoningOptions = [
                { id: 'match', label: __alloT('stem.rocks.wb_reason_match', 'Match the identity'), detail: __alloT('stem.rocks.wb_reason_match_detail', 'Diagnostic properties agree with the candidate reference.') },
                { id: 'eliminate', label: __alloT('stem.rocks.wb_reason_eliminate', 'Rule out alternatives'), detail: __alloT('stem.rocks.wb_reason_eliminate_detail', 'The results remove candidates with conflicting properties.') },
                { id: 'both', label: __alloT('stem.rocks.wb_reason_both', 'Use both ideas'), detail: __alloT('stem.rocks.wb_reason_both_detail', 'The evidence matches the candidate and narrows the field.') }
              ];
              var wbClaimReasoning = ['match', 'eliminate', 'both'].indexOf(wb.claimReasoning) !== -1 ? wb.claimReasoning : null;
              var wbConfidenceOptions = [
                { id: 'unsure', label: __alloT('stem.rocks.wb_conf_unsure', 'Still unsure') },
                { id: 'somewhat', label: __alloT('stem.rocks.wb_conf_somewhat', 'Somewhat confident') },
                { id: 'very', label: __alloT('stem.rocks.wb_conf_very', 'Very confident') }
              ];
              var wbClaimConfidence = ['unsure', 'somewhat', 'very'].indexOf(wb.claimConfidence) !== -1 ? wb.claimConfidence : null;
              var wbConfidenceLabel = wbClaimConfidence ? (wbConfidenceOptions.filter(function (item) { return item.id === wbClaimConfidence; })[0] || {}).label : __alloT('stem.rocks.wb_conf_not_recorded', 'Confidence not recorded');
              var wbClaimReasoningLabel = wbClaimReasoning ? (wbReasoningOptions.filter(function (item) { return item.id === wbClaimReasoning; })[0] || {}).label : __alloT('stem.rocks.wb_reason_not_recorded', 'Reasoning not recorded');
              var wbCerReady = wbClaimReady && wbClaimEvidence.length >= 2 && !!wbClaimReasoning && !!wbClaimConfidence;
              var wbToggleClaimEvidence = function (id, label) {
                var next = wbClaimEvidence.slice();
                var at = next.indexOf(id);
                if (at === -1) next.push(id); else next.splice(at, 1);
                updWb({ claimEvidence: next });
                wbSay((at === -1 ? __alloT('stem.rocks.wb_ev_selected_sr', 'Evidence selected: ') : __alloT('stem.rocks.wb_ev_removed_sr', 'Evidence removed: ')) + (label || id) + '.');
              };
              // Provisional properties remain visible in comparisons, but do
              // not appear as selectable evidence until they are confirmed.
              var wbCerRows = wbSelected ? wbMatchRowsFor(wbSelected).filter(function (row) { return wbMeasuredIds.indexOf(row.id) !== -1; }) : [];
              var wbChosenRows = wbCerRows.filter(function (row) { return wbClaimEvidence.indexOf(row.id) !== -1; });
              var wbChosenLabels = wbChosenRows.map(function (row) { return row.label.toLowerCase(); });
              var wbChosenText = wbChosenLabels.length > 1 ? wbChosenLabels.slice(0, -1).join(', ') + __alloT('stem.rocks.wb_reason_and', ' and ') + wbChosenLabels[wbChosenLabels.length - 1] : (wbChosenLabels[0] || '');
              var wbReasoningSentence = !wbClaimReasoning || wbChosenRows.length < 2 || !wbSelected
                ? __alloT('stem.rocks.wb_reasoning_prompt_active', 'Choose at least two observations and the reasoning that connects them to your claim.')
                : wbClaimReasoning === 'match'
                  ? __alloT('stem.rocks.wb_reason_sentence_match_start', 'Because the unknown’s ') + wbChosenText + __alloT('stem.rocks.wb_reason_sentence_match_mid', ' match the reference values for ') + wbSelected.label + __alloT('stem.rocks.wb_reason_sentence_match_end', ', the evidence supports this identification.')
                  : wbClaimReasoning === 'eliminate'
                    ? __alloT('stem.rocks.wb_reason_sentence_eliminate_start', 'The ') + wbChosenText + __alloT('stem.rocks.wb_reason_sentence_eliminate_mid', ' results rule out minerals with conflicting properties, leaving ') + wbSelected.label + __alloT('stem.rocks.wb_reason_sentence_eliminate_end', ' supported.')
                    : __alloT('stem.rocks.wb_reason_sentence_both_start', 'The unknown matches ') + wbSelected.label + __alloT('stem.rocks.wb_reason_sentence_both_mid', ' on ') + wbChosenText + __alloT('stem.rocks.wb_reason_sentence_both_end', ', and those results narrow the other possibilities.');
              var wbCerStatusText = !wbSelected ? __alloT('stem.rocks.wb_support_select_first', 'Select a candidate to compare')
                : !wbClaimReady ? wbEvidenceTypeCount + ' / 2 ' + __alloT('stem.rocks.wb_types_needed', 'property types needed')
                  : wbClaimEvidence.length < 2 ? wbClaimEvidence.length + ' / 2 ' + __alloT('stem.rocks.wb_cer_evidence_needed', 'evidence choices needed')
                    : !wbClaimReasoning ? __alloT('stem.rocks.wb_cer_reason_needed', 'Choose how the evidence supports your claim')
                      : !wbClaimConfidence ? __alloT('stem.rocks.wb_cer_confidence_needed', 'Record your confidence before submitting')
                        : (wbClaimSupport.id === 'tentative' ? '△ ' : '✓ ') + wbClaimSupport.label;
              var wbSupportClass = wbClaimSupport.id === 'strong' ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                : wbClaimSupport.id === 'good' ? 'bg-violet-100 border-violet-300 text-violet-900'
                  : (wbClaimSupport.id === 'tentative' || wbClaimSupport.id === 'building') ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-slate-100 border-slate-300 text-slate-700';
              var wbRenderComparisonDock = function () {
                var rows = wbSelected ? wbMatchRowsFor(wbSelected) : [];
                return React.createElement("section", {
                  className: "sm:sticky sm:top-2 rounded-2xl border-2 border-violet-300 shadow-md p-2.5 sm:p-3 mb-3",
                  style: { zIndex: 20, background: 'rgba(255,255,255,0.97)' },
                  "aria-labelledby": "wb-live-compare-title", "data-wb-comparison-dock": wbSelected ? 'selected' : 'empty', "data-wb-claim-strength": wbClaimSupport.id
                },
                  React.createElement("div", { className: "flex items-center gap-2.5 sm:gap-3 min-w-0" },
                    React.createElement("div", { className: "shrink-0 text-center" },
                      React.createElement("div", { className: "rounded-xl ring-2 ring-amber-200" }, rkHandSpecimenSvg(React.createElement, sp, 54, { aria: __alloT('stem.rocks.wb_specimen_aria', 'Unknown hand specimen: an irregular broken fragment.') })),
                      wb.lens ? React.createElement("div", { className: "mt-1 rounded-md bg-slate-900 p-0.5 inline-block", "data-wb-dock-porthole": "unknown" }, rkLensViewSvg(React.createElement, sp, 34, { aria: __alloT('stem.rocks.wb_lens_aria', 'Magnified patch of the specimen surface under the lamp. ') + wbSpecimenSr })) : null,
                      React.createElement("p", { className: "text-[10px] sm:text-[10.5px] font-black text-amber-900 mt-1" }, __alloT('stem.rocks.wb_compare_unknown', 'Unknown'))
                    ),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("div", { className: "flex flex-wrap items-center gap-1.5" },
                        React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.12em] text-violet-800" }, __alloT('stem.rocks.wb_live_compare', 'Pinned live comparison')),
                        React.createElement("span", { className: "rounded-full border px-2 py-0.5 text-[10px] font-black " + wbSupportClass }, wbClaimSupport.label)
                      ),
                      React.createElement("h5", { id: "wb-live-compare-title", className: "text-[12px] sm:text-[14px] font-black text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, wbSelected ? __alloT('stem.rocks.wb_compare_title_selected', 'Unknown compared with ') + wbSelected.label : __alloT('stem.rocks.wb_compare_title_empty', 'Keep the unknown visible while choosing a candidate')),
                      React.createElement("p", { className: "text-[10.5px] sm:text-[11px] text-slate-700 mt-0.5 leading-snug" }, wbClaimSupport.detail),
                      rows.length ? React.createElement("div", { className: "hidden sm:flex flex-wrap gap-1.5 mt-2", role: "group", "aria-label": __alloT('stem.rocks.wb_compare_matches_aria', 'Measured properties that match the selected candidate') },
                        rows.slice(0, 4).map(function (row) { return React.createElement("span", { key: row.id, className: "rounded-full bg-emerald-50 border border-emerald-200 px-2 py-1 text-[10px] font-black text-emerald-900" }, '✓ ' + row.label); }),
                        rows.length > 4 ? React.createElement("span", { className: "rounded-full bg-slate-100 border border-slate-200 px-2 py-1 text-[10px] font-black text-slate-700" }, '+' + (rows.length - 4) + __alloT('stem.rocks.wb_compare_more', ' more')) : null
                      ) : null
                    ),
                    React.createElement("span", { className: "text-violet-700 text-lg font-black shrink-0", "aria-hidden": "true" }, '↔'),
                    wbSelected ? React.createElement("div", { className: "shrink-0 text-center" },
                      React.createElement("div", { className: "rounded-xl ring-2 ring-violet-200" }, rkMineralSwatch(React.createElement, wbSelected, 54)),
                      wb.lens ? React.createElement("div", { className: "mt-1 rounded-md bg-slate-900 p-0.5 inline-block", "data-wb-dock-porthole": wbSelected.id }, rkLensViewSvg(React.createElement, wbSelected, 34, { aria: wbSelected.label + __alloT('stem.rocks.wb_candidate_porthole_aria', ' under the lens: ') + rkLusterClassInfo(rkLusterClass(wbSelected)).sr })) : null,
                      React.createElement("p", { className: "text-[10px] sm:text-[10.5px] font-black text-violet-900 mt-1 leading-tight", style: { maxWidth: 74, overflowWrap: 'anywhere' } }, wbSelected.label)
                    ) : React.createElement("div", { className: "shrink-0 text-center" },
                      React.createElement("div", { className: "rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-xl font-black text-slate-600", style: { width: 54, height: 54 }, "aria-hidden": "true" }, '?'),
                      React.createElement("p", { className: "text-[10px] sm:text-[10.5px] font-black text-slate-600 mt-1" }, __alloT('stem.rocks.wb_compare_candidate', 'Candidate'))
                    )
                  )
                );
              };
              var wbEvidencePropertyId = function (key) {
                if (key.indexOf('scratch_') === 0) return 'hardness';
                return key === 'lens' ? 'luster' : key === 'fizz' ? 'acid' : key === 'magnet' ? 'magnetism' : key;
              };
              var wbPropertyImpact = function (id) {
                var best = 0;
                wbEvidence.forEach(function (ev) { if (wbEvidencePropertyId(ev.k) === id) best = Math.max(best, wbEvidenceImpact(ev)); });
                return best;
              };
              var wbRenderCerBuilder = function () {
                if (!wbSelected) return null;
                return React.createElement("div", { className: "mt-3 space-y-3", "data-wb-cer-builder": "active", "data-wb-cer-ready": wbCerReady ? 'true' : 'false' },
                  React.createElement("fieldset", { className: "rounded-xl border border-violet-200 bg-white p-3", "data-wb-cer-evidence-count": wbClaimEvidence.length },
                    React.createElement("legend", { className: "px-1 text-[11.5px] font-black text-violet-900" }, __alloT('stem.rocks.wb_cer_step1', '1 · Choose your strongest evidence')),
                    React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 mb-2" },
                      React.createElement("p", { className: "text-[11px] text-slate-700" }, __alloT('stem.rocks.wb_cer_evidence_help', 'Select at least two measured properties that best support this claim.')),
                      React.createElement("span", { className: "rounded-full border px-2 py-1 text-[10px] font-black " + (wbClaimEvidence.length >= 2 ? "bg-emerald-100 border-emerald-300 text-emerald-900" : "bg-amber-100 border-amber-300 text-amber-900") }, wbClaimEvidence.length + ' / 2 ' + __alloT('stem.rocks.wb_cer_chosen', 'chosen'))
                    ),
                    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2" }, wbCerRows.map(function (row) {
                      var chosen = wbClaimEvidence.indexOf(row.id) !== -1;
                      var impact = wbPropertyImpact(row.id);
                      var rivalSeparator = wbFaceoffRival ? wbFaceoffSeparators.filter(function (item) { return item.id === row.id; })[0] : null;
                      var evidenceContext = !wbFaceoffRival ? 'unique' : rivalSeparator ? 'refine' : 'shared';
                      var evidenceContextLabel = evidenceContext === 'refine'
                        ? __alloT('stem.rocks.wb_cer_refine_rival', 'Refine vs look-alike')
                        : evidenceContext === 'shared'
                          ? __alloT('stem.rocks.wb_cer_shared_rival', 'Shared with look-alike')
                          : impact > 0 ? __alloT('stem.rocks.wb_cer_rules_out', 'Rules out ') + impact : __alloT('stem.rocks.wb_cer_confirms', 'Confirms');
                      return React.createElement("button", {
                        key: row.id, type: "button", "aria-pressed": chosen, "data-wb-cer-evidence": row.id, "data-wb-cer-evidence-state": chosen ? 'chosen' : 'available', "data-wb-cer-context": evidenceContext,
                        onClick: function () { wbToggleClaimEvidence(row.id, row.label); },
                        className: "rounded-xl border p-2.5 min-h-[66px] text-left transition-all " + (chosen ? "bg-violet-100 border-violet-500 ring-2 ring-violet-200 text-violet-900" : "bg-slate-50 border-slate-300 text-slate-800 hover:border-violet-400")
                      },
                        React.createElement("span", { className: "flex items-center justify-between gap-2" },
                          React.createElement("span", { className: "text-[11.5px] font-black" }, (chosen ? '✓ ' : '') + row.label),
                          React.createElement("span", { className: "rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700" }, evidenceContextLabel)
                        ),
                        React.createElement("span", { className: "block text-[10.5px] font-semibold mt-1 text-slate-700", style: { overflowWrap: 'anywhere' } }, row.unknown + ' → ' + row.candidate)
                      );
                    }))
                  ),
                  React.createElement("fieldset", { className: "rounded-xl border border-violet-200 bg-white p-3" },
                    React.createElement("legend", { className: "px-1 text-[11.5px] font-black text-violet-900" }, __alloT('stem.rocks.wb_cer_step2', '2 · Explain why the evidence matters')),
                    React.createElement("p", { className: "text-[11px] text-slate-700 mb-2" }, __alloT('stem.rocks.wb_cer_reason_help', 'Choose the reasoning that connects your observations to the mineral identity.')),
                    React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" }, wbReasoningOptions.map(function (option) {
                      var chosen = wbClaimReasoning === option.id;
                      return React.createElement("button", {
                        key: option.id, type: "button", "aria-pressed": chosen, "data-wb-cer-reasoning": option.id,
                        onClick: function () { updWb({ claimReasoning: option.id }); wbSay(__alloT('stem.rocks.wb_reason_selected_sr', 'Reasoning selected: ') + option.label + '.'); },
                        className: "rounded-xl border p-2.5 min-h-[72px] text-left transition-all " + (chosen ? "bg-violet-100 border-violet-500 ring-2 ring-violet-200 text-violet-900" : "bg-slate-50 border-slate-300 text-slate-800 hover:border-violet-400")
                      },
                        React.createElement("span", { className: "block text-[11px] font-black" }, (chosen ? '✓ ' : '') + option.label),
                        React.createElement("span", { className: "block text-[10.5px] mt-1 leading-snug text-slate-700" }, option.detail)
                      );
                    }))
                  ),
                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" },
                    React.createElement("fieldset", { className: "rounded-xl border border-slate-300 bg-white p-3", "data-wb-confidence": wbClaimConfidence || 'not-recorded' },
                      React.createElement("legend", { className: "px-1 text-[11.5px] font-black text-slate-900" }, __alloT('stem.rocks.wb_cer_step3', '3 · Record your confidence')),
                      React.createElement("p", { className: "text-[10.5px] text-slate-600 mb-2" }, __alloT('stem.rocks.wb_conf_help', 'This does not affect correctness; it helps you reflect afterward.')),
                      React.createElement("div", { className: "grid grid-cols-3 gap-1.5" }, wbConfidenceOptions.map(function (option) {
                        var chosen = wbClaimConfidence === option.id;
                        return React.createElement("button", {
                          key: option.id, type: "button", "aria-pressed": chosen, "data-wb-cer-confidence": option.id,
                          onClick: function () { updWb({ claimConfidence: option.id }); wbSay(__alloT('stem.rocks.wb_conf_selected_sr', 'Confidence recorded: ') + option.label + '.'); },
                          className: "rounded-lg border px-2 py-2 min-h-[46px] text-[10.5px] font-black transition-all " + (chosen ? "bg-amber-100 border-amber-400 text-amber-900" : "bg-slate-50 border-slate-300 text-slate-700 hover:border-amber-400")
                        }, option.label);
                      }))
                    ),
                    React.createElement("div", { className: "rounded-xl border border-emerald-300 bg-emerald-50 p-3", "data-wb-reasoning-frame": wbCerReady ? 'complete' : 'building' },
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-emerald-800" }, __alloT('stem.rocks.wb_reasoning_preview', 'Your reasoning preview')),
                      React.createElement("p", { className: "text-[11px] font-semibold text-emerald-900 mt-1 leading-relaxed" }, wbReasoningSentence)
                    )
                  )
                );
              };
              var wbRun = function (kind, ms, finish, runState) {
                if (wbBusy || wbPendingTool) return;
                sfxRockClick();
                // Keep the initiating control mounted through the async result
                // so keyboard and screen-reader focus cannot fall back to body.
                // A new observation also requires a fresh confidence judgment;
                // the old confidence belonged to the earlier evidence set.
                updWb(Object.assign({ anim: kind, toolsExpanded: true, claimConfidence: null }, runState || {}));
                setTimeout(function () {
                  try { finish(); } finally { updWb({ anim: null, activeScratchRef: null }); }
                }, ms);
              };
              var wbClearEvidence = function () {
                wbUpdateAndFocus({
                  scratch: {}, streakDone: false, fizz: null, magnet: null, density: false,
                  lens: false, formObs: null, streakObs: null, densityObs: null, pending: null, history: [], guessedWrong: [], selectedId: null, lastRejectedId: null, reviewId: null, candidateView: null, solvedId: null, anim: null,
                  toolsExpanded: false, candidatesExpanded: false,
                  claimEvidence: [], claimReasoning: null, claimConfidence: null, predictionTool: null, predictionValue: null, activeScratchRef: null
                }, '[data-wb-tool="lens"]');
                wbSay(__alloT('stem.rocks.wb_evidence_cleared_sr', 'Observations cleared. The same specimen remains on the bench.'));
              };
              var wbClearHardness = function () {
                wbUpdateAndFocus({
                  scratch: {}, activeScratchRef: null,
                  claimEvidence: (wb.claimEvidence || []).filter(function (id) { return id !== 'hardness'; }),
                  claimConfidence: null, toolsExpanded: true
                }, '[data-wb-tool="steel_nail"]');
                wbSay(__alloT('stem.rocks.wb_hardness_cleared_sr', 'Conflicting hardness trials cleared. The other observations are preserved; bracket hardness again.'));
              };
              var wbSubmitClaim = function () {
                if (wbBusy || !wbSelected || !wbCerReady || !sp) return;
                var claimId = wbSelected.id;
                if (claimId === sp.id) {
                  sfxRockCorrect();
                  var wbCaseNext = (wb.collected || []).indexOf(claimId) !== -1 ? (wb.collected || []) : (wb.collected || []).concat([claimId]);
                  wbUpdateAndFocus({ solvedId: claimId, selectedId: claimId, lastRejectedId: null, reviewId: null, collected: wbCaseNext, solved: (wb.solved || 0) + 1, attempts: (wb.attempts || 0) + 1 }, '[data-wb-next-specimen]');
                  setTimeout(function () { try { checkRocksChallenges({ ...d, wb: { ...wb, solvedId: claimId, solved: (wb.solved || 0) + 1 } }); } catch (e) {} }, 60);
                  wbSay(__alloT('stem.rocks.wb_sr_solved', 'Correct. The specimen is ') + wbSelected.label + '. ' + wbCaseNext.filter(function (id) { return wbPoolFor().indexOf(id) !== -1; }).length + ' / ' + wbPoolFor().length + ' ' + __alloT('stem.rocks.wb_case_named', 'named') + '.');
                  try { if (typeof stemCelebrate === 'function') stemCelebrate(); } catch (e) {}
                } else {
                  wbUpdateAndFocus({ guessedWrong: (wb.guessedWrong || []).concat([claimId]), selectedId: null, lastRejectedId: claimId, reviewId: claimId, candidateView: 'setaside', claimEvidence: [], claimReasoning: null, claimConfidence: null, attempts: (wb.attempts || 0) + 1, anim: 'wrong' }, '[data-wb-review-close="' + claimId + '"]');
                  setTimeout(function () { try { wbSay(__alloT('stem.rocks.wb_sr_wrong', 'Not ') + wbSelected.label + '. ' + __alloT('stem.rocks.wb_sr_wrong2', 'Your evidence still fits it, so run a test that would tell them apart.')); } finally { updWb({ anim: null }); } }, 700);
                }
              };

              // ── The bench itself: SVG scene ──
              // Evidence only. Nothing drawn here names a property: the plate
              // shows a colour, the tile shows a mark, the beaker shows two
              // readings. The learner classifies each in the observation card.
              var wbActiveScratchRef = wbScratchRefFor(wb.activeScratchRef || wbPendingRefId);
              var wbActiveScratchOutcome = wbActiveScratchRef && sp ? rkScratchOutcome(wbActiveScratchRef.h, sp.hardness) : null;
              var wbShowScratch = (wb.anim === 'scratch' || wbPendingTool === 'scratch') && !!wbActiveScratchRef;
              var wbShowDensity = wb.anim === 'density' || wbPendingTool === 'density';
              var wbShowAcid = wb.anim === 'acid' || wbPendingTool === 'acid';
              var wbShowMagnet = wb.anim === 'magnet' || wbPendingTool === 'magnet';
              var wbShowLens = wb.anim === 'lens' || wbPendingTool === 'lens';
              var wbRightStationBusy = wbShowScratch || wbShowDensity;
              var wbSpecimenSr = rkLusterClassInfo(rkLusterClass(sp)).sr;
              var wbBench = sp && React.createElement("svg", {
                viewBox: "0 0 560 250", role: "img", className: "w-full rounded-xl",
                "aria-label": __alloT('stem.rocks.wb_bench_aria', 'Laboratory bench with an unknown specimen showing ') + wbObservedFormFor(sp) + __alloT('stem.rocks.wb_bench_aria_evidence', '. Its outward colour is visible; every other property must be tested. Each test leaves visible evidence at the station, described in the observation card and the field notebook.'),
                style: { display: 'block', maxHeight: 250, background: 'linear-gradient(180deg,#1e293b 0%,#334155 58%,#7c5a35 58%,#a97c4f 63%,#8a6540 100%)' }
              },
                React.createElement("rect", { x: 18, y: 16, width: 176, height: 28, rx: 14, fill: "#0f172a", stroke: "#64748b", strokeWidth: 1.5 }),
                React.createElement("circle", { cx: 36, cy: 30, r: 5, fill: wbBusy ? "#fbbf24" : wbPendingTool ? "#38bdf8" : "#34d399" }),
                React.createElement("text", { className: "hidden sm:inline", x: 50, y: 35, fontSize: 12, fill: "#f8fafc", fontWeight: 800, letterSpacing: 1.2 }, __alloT('stem.rocks.wb_field_station', 'FIELD STATION 01')),
                React.createElement("rect", { x: 0, y: 145, width: 560, height: 4, fill: "#c99a68", opacity: 0.9 }),
                React.createElement("ellipse", { cx: 280, cy: 175, rx: 190, ry: 26, fill: "#000", opacity: 0.28 }),
                React.createElement("ellipse", { cx: 280, cy: 60, rx: 220, ry: 60, fill: "#f8fafc", opacity: 0.05 }),
                // The unknown is a broken hand specimen, never the idealised
                // crystal the candidate cards use, so it cannot be identified
                // by matching pictures. Form shows through as cleavage steps,
                // sheets or fracture — real evidence, not a label.
                React.createElement("g", { key: 'specimen-' + sp.id, className: wbShowMagnet && spIsMag ? 'rk-wb-tug' : (wb.anim === 'wrong' ? 'rk-wb-shake' : 'rk-wb-drop'), "data-wb-specimen": "hand-specimen" },
                  React.createElement("g", { transform: "translate(215 30)" }, rkHandSpecimenSvg(React.createElement, sp, 130, { plate: false, aria: __alloT('stem.rocks.wb_specimen_aria', 'Unknown hand specimen: an irregular broken fragment.') }))
                ),
                React.createElement("rect", { x: 213, y: 174, width: 134, height: 25, rx: 6, fill: "#f8fafc", stroke: "#cbd5e1", strokeWidth: 1.5 }),
                React.createElement("text", { className: "hidden sm:inline", x: 280, y: 191, fontSize: 11, fill: "#334155", textAnchor: "middle", fontWeight: 900, letterSpacing: 1 }, __alloT('stem.rocks.wb_unknown_label', 'UNKNOWN SPECIMEN')),
                React.createElement("line", { x1: 220, y1: 216, x2: 340, y2: 216, stroke: "#f8fafc", strokeWidth: 2 }),
                [0, 1, 2, 3, 4].map(function (i) { return React.createElement("line", { key: 'tick' + i, x1: 220 + i * 30, y1: 211, x2: 220 + i * 30, y2: 221, stroke: "#f8fafc", strokeWidth: 1.5 }); }),
                React.createElement("text", { className: "hidden sm:inline", x: 280, y: 238, fontSize: 9, fill: "#e2e8f0", textAnchor: "middle", fontWeight: 700 }, __alloT('stem.rocks.wb_scale_reference', 'VISUAL SCALE REFERENCE')),
                // Streak plate: shows the powder (or the groove). The colour
                // name is the learner's to supply.
                (wb.anim === 'streak' || (wb.streakDone && !wbRightStationBusy)) ? React.createElement("g", { "data-wb-bench-observation": "streak" },
                  React.createElement("rect", { x: 388, y: 112, width: 120, height: 60, rx: 6, fill: "#e8e5de", stroke: "#94a3b8", strokeWidth: 2 }),
                  rkStreakPlateTooHard(sp)
                    ? React.createElement("path", { className: wb.anim === 'streak' ? 'rk-smear' : undefined, d: "M400 152 C 424 138, 452 156, 496 140", fill: "none", stroke: "#8a8f97", strokeWidth: 2.5, strokeLinecap: "round" })
                    : React.createElement(React.Fragment, null,
                      React.createElement("path", { d: "M400 153.4 C 424 139.4, 452 157.4, 496 141.4", fill: "none", stroke: "rgba(90,84,70,0.30)", strokeWidth: 11, strokeLinecap: "round" }),
                      React.createElement("path", { className: wb.anim === 'streak' ? 'rk-smear' : undefined, d: "M400 152 C 424 138, 452 156, 496 140", fill: "none", stroke: (RK_STREAK_HEX[sp.streak] || '#cbd5e1'), strokeWidth: 9, strokeLinecap: "round", opacity: 0.94 })
                    ),
                  wb.anim === 'streak' ? React.createElement("g", { className: "rk-wb-glide", "data-wb-streak-chip": "gliding" },
                    React.createElement("polygon", { points: "396,150 404,140 414,142 416,152 408,158 398,156", fill: sp.color, stroke: "#0f172a", strokeWidth: 1 })
                  ) : null,
                  // Outward colour chip beside the plate: the comparison IS the lesson.
                  React.createElement("rect", { x: 396, y: 118, width: 22, height: 12, rx: 2, fill: sp.color, stroke: "#64748b", strokeWidth: 1 }),
                  React.createElement("text", { className: "hidden sm:inline", x: 448, y: 187, fontSize: 8.5, fill: "#f8fafc", textAnchor: "middle", fontWeight: 800 },
                    rkStreakPlateTooHard(sp) ? __alloT('stem.rocks.wb_plate_no_powder_short', 'NO POWDER STREAK') : wb.streakObs ? __alloT('stem.rocks.wb_streak_recorded', 'STREAK RECORDED') : __alloT('stem.rocks.wb_record_prompt_short', 'RECORD WHAT YOU SEE')),
                  rkStreakPlateTooHard(sp) ? React.createElement("text", { className: "hidden sm:inline", x: 448, y: 198, fontSize: 8.5, fill: "#f8fafc", textAnchor: "middle", fontWeight: 800 }, __alloT('stem.rocks.wb_plate_grooved_short', 'PLATE GROOVED')) : null
                ) : null,
                // Scratch tile: a groove cut INTO the surface (dark, with chips),
                // a smear rubbed ON it (pale, no depth), or a broken trace.
                wbShowScratch ? React.createElement("g", { className: "rk-wb-pop", "data-wb-bench-observation": "scratch" },
                  React.createElement("rect", { x: 388, y: 62, width: 120, height: 52, rx: 6, fill: sp.color, stroke: "#cbd5e1", strokeWidth: 2 }),
                  React.createElement("rect", { x: 388, y: 62, width: 120, height: 14, rx: 6, fill: "#ffffff", opacity: 0.18 }),
                  wbActiveScratchOutcome === 'borderline' ? React.createElement(React.Fragment, null,
                    React.createElement("line", { x1: 400, y1: 89, x2: 496, y2: 89, stroke: rkMarkOn('#fef3c7', sp.color, 3), strokeWidth: 5.4, strokeLinecap: "round", strokeDasharray: "4 4" }),
                    React.createElement("line", { x1: 400, y1: 89, x2: 496, y2: 89, stroke: "#b45309", strokeWidth: 2.8, strokeLinecap: "round", strokeDasharray: "4 4" })
                  ) : wbActiveScratchOutcome === 'scratched' ? React.createElement(React.Fragment, null,
                    React.createElement("line", { x1: 400, y1: 89, x2: 496, y2: 89, stroke: rkMarkOn('#1f2937', sp.color, 3), strokeWidth: 2.8, strokeLinecap: "round", opacity: 0.92 }),
                    React.createElement("line", { x1: 400, y1: 87.4, x2: 496, y2: 87.4, stroke: "#ffffff", strokeWidth: 1, strokeLinecap: "round", opacity: 0.5 }),
                    [0, 1, 2, 3, 4].map(function (i) { return React.createElement("circle", { key: 'chip' + i, cx: 470 + i * 6 + (i % 2) * 3, cy: 93 + (i % 3) * 2.5, r: 1.1, fill: rkMarkOn('#1f2937', sp.color, 3), opacity: 0.7 }); })
                  ) : React.createElement("line", { x1: 400, y1: 89, x2: 496, y2: 89, stroke: rkMarkOn('#e2e8f0', sp.color, 3), strokeWidth: 3.6, strokeLinecap: "round", opacity: 0.75 }),
                  wb.anim === 'scratch' ? React.createElement("g", { className: "rk-wb-glide", "data-wb-scratch-tool": "gliding" },
                    React.createElement("polygon", { points: "400,86 395,72 405,72", fill: wbActiveScratchOutcome === 'scratched' ? '#334155' : wbActiveScratchOutcome === 'borderline' ? '#d97706' : '#94a3b8', stroke: "#0f172a", strokeWidth: 0.9 }),
                    React.createElement("rect", { x: 396, y: 56, width: 8, height: 16, rx: 2, fill: "#64748b", stroke: "#0f172a", strokeWidth: 0.9 })
                  ) : null,
                  React.createElement("text", { className: "hidden sm:inline", x: 448, y: 128, fontSize: 8.5, fill: "#f8fafc", textAnchor: "middle", fontWeight: 800 }, wbActiveScratchRef.label.replace(/^\S+\s/, '').toUpperCase() + ' · ' + __alloT('stem.rocks.wb_look_closely_short', 'LOOK CLOSELY'))
                ) : null,
                // Acid: bubbles rise, or the drop just sits there.
                wbShowAcid ? React.createElement("g", { "data-wb-bench-observation": "acid" },
                  React.createElement("path", { d: "M280 34 l7 14 a8 8 0 1 1 -14 0 z", fill: "#7dd3fc", stroke: "#0369a1", strokeWidth: 1.5 }),
                  wb.anim === 'acid' ? React.createElement("circle", { className: "rk-wb-drip", cx: 280, cy: 66, r: 3.4, fill: "#7dd3fc" }) : null,
                  React.createElement("ellipse", { cx: 280, cy: 122, rx: 22, ry: 6, fill: "#7dd3fc", opacity: 0.55 }),
                  spIsCarb ? [0, 1, 2, 3, 4, 5].map(function (i) {
                    return React.createElement("circle", { key: 'b' + i, className: wb.anim === 'acid' ? "rk-bubble" : undefined, cx: 258 + i * 9, cy: 118 - (wb.anim === 'acid' ? 0 : 6 + (i % 3) * 7), r: 2.6 + (i % 3) * 1.4, fill: "#e0f2fe", stroke: "#7dd3fc", strokeWidth: 1, style: wb.anim === 'acid' ? { animationDelay: (i * 0.18) + 's' } : undefined });
                  }) : null
                ) : null,
                // Balance + displacement beaker: two readings, no quotient.
                wbShowDensity ? React.createElement("g", { className: "rk-wb-pop", "data-wb-bench-observation": "density" },
                  React.createElement("path", { d: "M392 60 h84 v66 a10 10 0 0 1 -10 10 h-64 a10 10 0 0 1 -10 -10 z", fill: "#e0f2fe", stroke: "#0369a1", strokeWidth: 2.5, opacity: 0.9 }),
                  React.createElement("rect", { className: wb.anim === 'density' ? "rk-wb-rise" : undefined, "data-wb-density-water": wb.anim === 'density' ? 'rising' : 'settled', x: 396, y: 96, width: 76, height: 36, fill: "#7dd3fc", opacity: 0.65 }),
                  React.createElement("rect", { className: wb.anim === 'density' ? "rk-wb-shine" : undefined, x: 396, y: 88, width: 76, height: 8, fill: "#bae6fd" }),
                  React.createElement("line", { x1: 396, y1: 88, x2: 472, y2: 88, stroke: "#0369a1", strokeWidth: 1, strokeDasharray: "2 2" }),
                  React.createElement("polygon", { points: "424,104 414,122 444,122 434,104", fill: sp.color, stroke: "#0f172a", strokeWidth: 2 }),
                  React.createElement("rect", { x: 396, y: 40, width: 76, height: 16, rx: 8, fill: "#0f172a", opacity: 0.85 }),
                  React.createElement("text", { className: "hidden sm:inline", x: 434, y: 52, fontSize: 10, fill: "#f8fafc", textAnchor: "middle", fontWeight: 700 }, 'm = ' + wbModeledMass.toFixed(1) + ' g'),
                  React.createElement("text", { className: "hidden sm:inline", x: 434, y: 151, fontSize: 9, fill: "#f8fafc", textAnchor: "middle", fontWeight: 700 }, 'ΔV = ' + wbModeledVolume.toFixed(1) + ' cm³'),
                  React.createElement("text", { className: "hidden sm:inline", x: 434, y: 165, fontSize: 9, fill: "#fbbf24", textAnchor: "middle", fontWeight: 800 }, 'ρ = m ÷ V = ?')
                ) : null,
                wbShowMagnet ? React.createElement("text", { className: wb.anim === 'magnet' ? "rk-wb-swing" : undefined, x: 348, y: 84, fontSize: 40, "data-wb-bench-observation": "magnet" }, '🧲') : null,
                // Lens porthole: a magnified patch showing only how the surface
                // handles light. No caption — that is the observation.
                wbShowLens ? React.createElement("g", { className: "rk-wb-pop", "data-wb-bench-observation": "lens" },
                  rkLensViewSvg(React.createElement, sp, 128, { x: 216, y: 54, animate: true, aria: __alloT('stem.rocks.wb_lens_aria', 'Magnified patch of the specimen surface under the lamp. ') + wbSpecimenSr })
                ) : null
              );

              // ── Observation card: the learner records what the bench shows ──
              var wbRecordObservation = function (choiceId, choiceLabel) {
                if (!wbPendingTool || !sp || wbBusy) return;
                var patch = { pending: null, claimConfidence: null };
                if (wbPendingTool === 'lens') patch.lens = choiceId;
                else if (wbPendingTool === 'form') patch.formObs = choiceId;
                else if (wbPendingTool === 'streak') patch.streakObs = choiceId;
                else if (wbPendingTool === 'scratch' && wbActiveScratchRef) { var sc = { ...(wb.scratch || {}) }; sc[wbActiveScratchRef.id] = choiceId; patch.scratch = sc; }
                else if (wbPendingTool === 'acid') patch.fizz = choiceId;
                else if (wbPendingTool === 'magnet') patch.magnet = choiceId;
                else if (wbPendingTool === 'density') patch.densityObs = choiceId;
                else return;
                // Reasoning trail: every record is kept, revisions included, so the
                // debrief can replay the learner's path rather than only the end state.
                patch.history = (wb.history || []).concat([{ tool: wbPendingTool, ref: wbPendingTool === 'scratch' && wbActiveScratchRef ? wbActiveScratchRef.id : undefined, choice: choiceId, label: choiceLabel }]);
                sfxRockClick();
                wbUpdateAndFocus(patch, '#wb-notebook-title');
                wbSay(__alloT('stem.rocks.wb_recorded_sr', 'Recorded: ') + choiceLabel + '. ' + __alloT('stem.rocks.wb_recorded_sr2', 'The notebook and the candidate shortlist now use your observation.'));
              };
              var wbDiscardTrial = function () {
                if (!wbPendingTool) return;
                var patch = { pending: null };
                if (wbPendingTool === 'streak') patch.streakDone = false;
                if (wbPendingTool === 'density') patch.density = false;
                var backTo = wbPendingTool === 'scratch' && wbActiveScratchRef ? wbActiveScratchRef.id : wbPendingTool === 'density' ? 'balance' : wbPendingTool;
                wbUpdateAndFocus(patch, '[data-wb-tool="' + backTo + '"]');
                wbSay(__alloT('stem.rocks.wb_discarded_sr', 'Trial discarded without recording. You can run it again.'));
              };
              // Re-open a recorded observation for another look. The old record
              // stays until replaced, so a learner can compare, not just erase.
              // Two scratch trials both label as "hardness", which is exactly the
              // ambiguity a stuck learner cannot afford: name the reference.
              var wbImpasseLabel = function (k) {
                if (k.indexOf('scratch_') === 0) { var ref = wbScratchRefFor(k.slice(8)); if (ref) return ref.label; }
                return wbEvidenceKind(k);
              };
              var wbReexamine = function (kind) {
                if (wbBusy || wbPendingTool) return;
                var pending = null, patch = {};
                if (kind === 'lens') pending = { tool: 'lens' };
                else if (kind === 'form') pending = { tool: 'form' };
                else if (kind === 'streak' || kind === 'scratch_streak_plate') { pending = { tool: 'streak' }; patch.streakDone = true; }
                else if (kind === 'fizz') pending = { tool: 'acid' };
                else if (kind === 'magnet') pending = { tool: 'magnet' };
                else if (kind === 'density') { pending = { tool: 'density' }; patch.density = true; }
                else if (kind.indexOf('scratch_') === 0) pending = { tool: 'scratch', ref: kind.slice(8) };
                if (!pending) return;
                patch.pending = pending;
                wbUpdateAndFocus(patch, '[data-wb-observe-choice]');
                wbSay(__alloT('stem.rocks.wb_reexamine_sr', 'Looking again. The station shows the evidence; choose what you see to replace the earlier record.'));
              };
              // Tiny evidence icons for the choices, so each option shows the
              // mark it names. Decorative: the label carries the meaning.
              var wbChoiceTile = function (kind) {
                var h = React.createElement, k = [];
                var base = h('rect', { key: 'b', x: 2, y: 12, width: 40, height: 20, rx: 4, fill: '#cbd5e1', stroke: '#64748b', strokeWidth: 1 });
                if (kind === 'scratched') k = [base, h('line', { key: 'l', x1: 8, y1: 22, x2: 34, y2: 22, stroke: '#1f2937', strokeWidth: 2.4, strokeLinecap: 'round' }), h('circle', { key: 'c1', cx: 35, cy: 25, r: 1.2, fill: '#1f2937' }), h('circle', { key: 'c2', cx: 38, cy: 23, r: 1, fill: '#1f2937' })];
                else if (kind === 'no') k = [base, h('line', { key: 'l', x1: 8, y1: 22, x2: 34, y2: 22, stroke: '#f8fafc', strokeWidth: 3.2, strokeLinecap: 'round', opacity: 0.85 })];
                else if (kind === 'borderline') k = [base, h('line', { key: 'l', x1: 8, y1: 22, x2: 36, y2: 22, stroke: '#b45309', strokeWidth: 2.6, strokeLinecap: 'round', strokeDasharray: '4 4' })];
                else if (kind === 'fizz' || kind === 'nofizz') k = [h('rect', { key: 'b', x: 2, y: 24, width: 40, height: 14, rx: 3, fill: '#cbd5e1', stroke: '#64748b', strokeWidth: 1 }), h('ellipse', { key: 'd', cx: 22, cy: 24, rx: 9, ry: 3.5, fill: '#7dd3fc', opacity: 0.8 })].concat(kind === 'fizz' ? [h('circle', { key: 'u1', cx: 17, cy: 15, r: 2.2, fill: '#e0f2fe', stroke: '#0ea5e9', strokeWidth: 0.8 }), h('circle', { key: 'u2', cx: 24, cy: 9, r: 2.8, fill: '#e0f2fe', stroke: '#0ea5e9', strokeWidth: 0.8 }), h('circle', { key: 'u3', cx: 29, cy: 16, r: 1.8, fill: '#e0f2fe', stroke: '#0ea5e9', strokeWidth: 0.8 })] : []);
                else if (kind.indexOf('form-') === 0) {
                  var fk = kind.slice(5), ink = '#334155', fill = '#cbd5e1';
                  if (fk === 'blocky') k = [h('polygon', { key: 'f', points: '10,16 28,16 28,34 10,34', fill: fill, stroke: ink, strokeWidth: 1 }), h('polygon', { key: 't', points: '10,16 16,10 34,10 28,16', fill: '#e2e8f0', stroke: ink, strokeWidth: 1 }), h('polygon', { key: 's', points: '28,16 34,10 34,28 28,34', fill: '#94a3b8', stroke: ink, strokeWidth: 1 })];
                  else if (fk === 'rhombs') k = [h('polygon', { key: 'f', points: '8,32 18,12 38,12 28,32', fill: fill, stroke: ink, strokeWidth: 1 }), h('line', { key: 'l', x1: 13, y1: 22, x2: 33, y2: 22, stroke: ink, strokeWidth: 0.7, opacity: 0.6 })];
                  else if (fk === 'sheets') k = [0, 1, 2, 3, 4].map(function (i) { return h('polygon', { key: 'p' + i, points: (8 + i) + ',' + (30 - i * 4) + ' ' + (30 + i) + ',' + (28 - i * 4) + ' ' + (36 + i) + ',' + (31 - i * 4) + ' ' + (14 + i) + ',' + (33 - i * 4), fill: i === 4 ? '#e2e8f0' : fill, stroke: ink, strokeWidth: 0.8 }); });
                  else if (fk === 'prism') k = [h('polygon', { key: 'b', points: '16,16 28,16 28,36 16,36', fill: fill, stroke: ink, strokeWidth: 1 }), h('polygon', { key: 'c', points: '16,16 22,6 28,16', fill: '#e2e8f0', stroke: ink, strokeWidth: 1 }), h('line', { key: 'e', x1: 22, y1: 16, x2: 22, y2: 36, stroke: ink, strokeWidth: 0.7 })];
                  else if (fk === 'pyramids') k = [h('polygon', { key: 'l', points: '22,6 10,22 22,38', fill: fill, stroke: ink, strokeWidth: 1 }), h('polygon', { key: 'r', points: '22,6 34,22 22,38', fill: '#94a3b8', stroke: ink, strokeWidth: 1 }), h('line', { key: 'w', x1: 10, y1: 22, x2: 34, y2: 22, stroke: ink, strokeWidth: 0.7 })];
                  else if (fk === 'ball') k = [h('circle', { key: 'c', cx: 22, cy: 22, r: 14, fill: fill, stroke: ink, strokeWidth: 1 }), h('polygon', { key: 'p', points: '22,11 30,17 27,26 17,26 14,17', fill: '#e2e8f0', stroke: ink, strokeWidth: 0.8 }), h('line', { key: 'l1', x1: 30, y1: 17, x2: 35, y2: 15, stroke: ink, strokeWidth: 0.7 }), h('line', { key: 'l2', x1: 27, y1: 26, x2: 31, y2: 33, stroke: ink, strokeWidth: 0.7 }), h('line', { key: 'l3', x1: 17, y1: 26, x2: 13, y2: 33, stroke: ink, strokeWidth: 0.7 }), h('line', { key: 'l4', x1: 14, y1: 17, x2: 9, y2: 15, stroke: ink, strokeWidth: 0.7 })];
                  else if (fk === 'blades') k = [h('polygon', { key: 'f', points: '6,26 30,20 38,24 14,30', fill: fill, stroke: ink, strokeWidth: 1 }), h('polygon', { key: 's', points: '14,30 38,24 38,28 14,34', fill: '#94a3b8', stroke: ink, strokeWidth: 1 })];
                  else k = [h('path', { key: 'm', d: 'M10 26 q2 -12 14 -12 q12 0 12 10 q0 10 -12 12 q-14 -1 -14 -10 z', fill: fill, stroke: ink, strokeWidth: 1 }), h('circle', { key: 'g1', cx: 18, cy: 22, r: 1.2, fill: ink, opacity: 0.5 }), h('circle', { key: 'g2', cx: 26, cy: 28, r: 1.2, fill: ink, opacity: 0.5 }), h('circle', { key: 'g3', cx: 22, cy: 31, r: 1, fill: ink, opacity: 0.5 })];
                }
                else if (kind === 'pull' || kind === 'nopull') k = [h('rect', { key: 'm', x: 30, y: 8, width: 10, height: 26, rx: 3, fill: '#dc2626' }), h('rect', { key: 'm2', x: 30, y: 8, width: 10, height: 8, rx: 2, fill: '#f8fafc', opacity: 0.6 }), h('polygon', { key: 's', points: kind === 'pull' ? '18,16 28,20 26,30 16,28' : '4,16 14,20 12,30 2,28', fill: '#94a3b8', stroke: '#334155', strokeWidth: 1 })].concat(kind === 'pull' ? [h('path', { key: 'a', d: 'M6 22 h8 m-3 -3 l3 3 l-3 3', fill: 'none', stroke: '#0f172a', strokeWidth: 1.4 })] : []);
                return h('svg', { viewBox: '0 0 44 44', width: 44, height: 44, 'aria-hidden': 'true', style: { display: 'block' }, 'data-wb-choice-tile': kind }, k);
              };
              var wbObservationChoices = function () {
                if (wbPendingTool === 'lens') return RK_LUSTER_CLASSES.map(function (c) { return { id: c.id, label: __alloT('stem.rocks.wb_luster_' + c.id, c.label), hint: __alloT('stem.rocks.wb_luster_' + c.id + '_hint', c.hint), tile: rkLensViewSvg(React.createElement, { id: 'ref', color: '#9aa3ad' }, 44, { forceClass: c.id, aria: __alloT('stem.rocks.wb_luster_ref_aria', 'Reference sheen on a neutral grey surface: ') + c.label }) }; });
                if (wbPendingTool === 'form') return RK_FORM_CLASSES.map(function (c) { return { id: c.id, tile: wbChoiceTile('form-' + c.id), label: __alloT('stem.rocks.wb_form_' + c.id, c.label), hint: __alloT('stem.rocks.wb_form_' + c.id + '_hint', c.hint) }; });
                if (wbPendingTool === 'streak') return RK_STREAK_CHOICES.map(function (c) { return { id: c.id, label: __alloT('stem.rocks.wb_streak_choice_' + c.id, c.label), hex: c.hex }; });
                if (wbPendingTool === 'scratch') return [
                  { id: 'scratched', tile: wbChoiceTile('scratched'), label: __alloT('stem.rocks.wb_obs_scratched', 'It cut a groove into the specimen'), hint: __alloT('stem.rocks.wb_obs_scratched_hint', 'A dark line with tiny chips thrown ahead of the tip: the reference is harder than the specimen.') },
                  { id: 'no', tile: wbChoiceTile('no'), label: __alloT('stem.rocks.wb_obs_no_mark', 'No groove: only a smear rubbed off the reference'), hint: __alloT('stem.rocks.wb_obs_no_mark_hint', 'A pale mark that sits on top and wipes away; the reference is softer than the specimen.') },
                  { id: 'borderline', tile: wbChoiceTile('borderline'), label: __alloT('stem.rocks.wb_obs_borderline', 'Hard to tell: a broken, uneven trace'), hint: __alloT('stem.rocks.wb_obs_borderline_hint', 'Record it as provisional and confirm with the next softer or harder reference.') }
                ];
                if (wbPendingTool === 'acid') return [
                  { id: 'fizz', tile: wbChoiceTile('fizz'), label: __alloT('stem.rocks.wb_obs_fizz', 'Bubbles rose from the drop'), hint: __alloT('stem.rocks.wb_obs_fizz_hint', 'Gas escaping means the acid is reacting with the mineral.') },
                  { id: 'none', tile: wbChoiceTile('nofizz'), label: __alloT('stem.rocks.wb_obs_no_fizz', 'The drop sat still: no bubbles'), hint: __alloT('stem.rocks.wb_obs_no_fizz_hint', 'No visible reaction in cold dilute acid.') }
                ];
                if (wbPendingTool === 'magnet') return [
                  { id: 'pull', tile: wbChoiceTile('pull'), label: __alloT('stem.rocks.wb_obs_pull', 'The specimen moved toward the magnet'), hint: __alloT('stem.rocks.wb_obs_pull_hint', 'It slid across the bench: a strong attraction.') },
                  { id: 'none', tile: wbChoiceTile('nopull'), label: __alloT('stem.rocks.wb_obs_no_pull', 'No movement at all'), hint: __alloT('stem.rocks.wb_obs_no_pull_hint', 'The magnet passed close by and nothing happened.') }
                ];
                if (wbPendingTool === 'density') return wbDensityChoices.map(function (c) { return { id: c.id, label: c.label }; });
                return [];
              };
              // Verdict for a history entry, computed ONLY once the claim is solved:
              // 'revised' if a later record replaced it, 'match' if it agrees with
              // the solved mineral's reference outcome, else 'mismatch'.
              var wbHistoryToolKey = function (e) { return e.tool === 'scratch' ? e.ref : e.tool === 'density' ? 'balance' : e.tool; };
              var wbHistoryChoiceAsForecastId = function (e) {
                if (e.tool === 'scratch') return e.choice === 'scratched' ? 'scratches' : e.choice === 'no' ? 'resists' : 'borderline';
                if (e.tool === 'acid') return e.choice === 'fizz' ? 'fizz' : 'no-fizz';
                if (e.tool === 'magnet') return e.choice === 'pull' ? 'pull' : 'no-pull';
                return e.choice;
              };
              var wbHistoryToolLabel = function (e) {
                if (e.tool === 'scratch') { var r = wbScratchRefFor(e.ref); return r ? r.label.replace(/^\S+\s/, '') : __alloT('stem.rocks.wb_kind_hardness', 'hardness'); }
                return e.tool === 'lens' ? __alloT('stem.rocks.wb_t_lens', 'Hand lens') : e.tool === 'form' ? __alloT('stem.rocks.wb_t_form', 'Describe its shape') : e.tool === 'streak' ? __alloT('stem.rocks.wb_t_streak', 'Streak plate') : e.tool === 'acid' ? __alloT('stem.rocks.wb_t_acid', 'Acid dropper') : e.tool === 'magnet' ? __alloT('stem.rocks.wb_t_magnet', 'Magnet') : __alloT('stem.rocks.wb_t_balance', 'Balance + beaker');
              };
              var wbDebriefRival = null;
              if (wb.solvedId) {
                var wbSolvedM = wbMineral(wb.solvedId);
                wbPoolFor().forEach(function (id) {
                  var cand = wbMineral(id);
                  if (!cand || !wbSolvedM || cand.id === wbSolvedM.id) return;
                  if (!wbDebriefRival || wbSimilarityScoreFor(wbSolvedM, cand) > wbSimilarityScoreFor(wbSolvedM, wbDebriefRival)) wbDebriefRival = cand;
                });
              }
              var wbRenderReasoningTrail = function () {
                var hist = wb.history || [];
                var solved = wb.solvedId ? wbMineral(wb.solvedId) : null;
                if (!solved || !hist.length) return null;
                var rows = hist.map(function (e, i) {
                  var key = wbHistoryToolKey(e);
                  var later = hist.slice(i + 1).some(function (n) { return wbHistoryToolKey(n) === key; });
                  var ref = wbForecastOutcomeFor(key, solved);
                  var verdict = later ? 'revised' : (ref && ref.id === wbHistoryChoiceAsForecastId(e)) ? 'match' : 'mismatch';
                  return { e: e, verdict: verdict, ref: ref };
                });
                var revised = rows.filter(function (r) { return r.verdict === 'revised'; }).length;
                var mismatched = rows.filter(function (r) { return r.verdict === 'mismatch'; }).length;
                return React.createElement("section", { className: "mt-3 rounded-xl border border-emerald-200 bg-white/80 p-2.5 text-left", "aria-labelledby": "wb-trail-title", "data-wb-debrief-history": hist.length, "data-wb-debrief-revised": revised, "data-wb-debrief-mismatched": mismatched },
                  React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-emerald-800" }, __alloT('stem.rocks.wb_trail_eyebrow', 'Reasoning trail')),
                  React.createElement("h6", { id: "wb-trail-title", className: "text-[12px] font-black text-slate-900 mt-0.5" }, __alloT('stem.rocks.wb_trail_title', 'How you got there')),
                  React.createElement("p", { className: "text-[10.5px] text-slate-700 mt-0.5 leading-relaxed" }, revised
                    ? __alloT('stem.rocks.wb_trail_revised_help', 'Looking again and revising a reading is exactly what a careful observer does. Revised readings are kept here so you can see how your thinking changed.')
                    : __alloT('stem.rocks.wb_trail_help', 'Every observation you recorded, in order, compared with the reference values for the mineral you identified.')),
                  React.createElement("ol", { className: "mt-2 space-y-1.5" }, rows.map(function (r, i) {
                    return React.createElement("li", { key: i, "data-wb-history-verdict": r.verdict, className: "rounded-lg border px-2.5 py-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] " + (r.verdict === 'match' ? "border-emerald-200 bg-emerald-50" : r.verdict === 'revised' ? "border-slate-200 bg-slate-50" : "border-amber-300 bg-amber-50") },
                      React.createElement("span", { className: "w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 " + (r.verdict === 'match' ? "bg-emerald-700 text-white" : r.verdict === 'revised' ? "bg-slate-500 text-white" : "bg-amber-700 text-white"), "aria-hidden": "true" }, i + 1),
                      React.createElement("span", { className: "font-black text-slate-900" }, wbHistoryToolLabel(r.e) + ':'),
                      React.createElement("span", { className: "font-semibold " + (r.verdict === 'revised' ? "text-slate-600 line-through" : "text-slate-800") }, r.e.label),
                      React.createElement("span", { className: "ml-auto rounded-full border px-2 py-0.5 text-[10px] font-black " + (r.verdict === 'match' ? "border-emerald-300 bg-white text-emerald-900" : r.verdict === 'revised' ? "border-slate-300 bg-white text-slate-700" : "border-amber-400 bg-white text-amber-900") },
                        r.verdict === 'match' ? '\u2713 ' + __alloT('stem.rocks.wb_trail_match', 'Matches reference') : r.verdict === 'revised' ? '\u21bb ' + __alloT('stem.rocks.wb_trail_revised', 'Revised later') : '\u26a0 ' + __alloT('stem.rocks.wb_trail_mismatch', 'Worth a second look: reference says ') + (r.ref ? r.ref.label : '?'))
                    );
                  }))
                );
              };
              // Plain-text notebook for pasting into an assignment or a lab report.
              // Hindsight-optimal test set: the smallest group of tests whose
              // outcomes on THIS specimen differ from every other pool member.
              // A minimum set cover over 12 candidate tests, so exhaustive
              // branch-and-bound is cheap and exact. Deliberately not offered
              // before the answer is known: choosing tests under uncertainty is
              // the skill, and this is the retrospective on it.
              var wbMinimalPath = function (target) {
                var pool = (wb.order || []).map(wbMineral).filter(Boolean);
                if (!target || pool.length < 2) return null;
                var others = pool.filter(function (m) { return m.id !== target.id; });
                if (!others.length || others.length > 24) return null;
                var tools = [];
                // 'form' is left out for the same reason wbTestProfileFor never
                // recommends it: crystal form on a broken fragment is a weak
                // diagnostic. Counting it here would let the review claim one
                // glance at the shape was enough, contradicting the coach.
                ['lens', 'streak', 'acid', 'magnet', 'balance'].concat(WB_REFS.map(function (r) { return r.id; })).forEach(function (tool) {
                  var mine = wbForecastOutcomeFor(tool, target);
                  if (!mine) return;
                  var mask = 0;
                  for (var oi = 0; oi < others.length; oi++) {
                    var other = wbForecastOutcomeFor(tool, others[oi]);
                    if (other && other.id !== mine.id) mask += Math.pow(2, oi);
                  }
                  if (mask) tools.push({ tool: tool, mask: mask });
                });
                var full = Math.pow(2, others.length) - 1;
                var best = null;
                var search = function (start, mask, picked) {
                  if (mask === full) { if (!best || picked.length < best.length) best = picked.slice(); return; }
                  if (best && picked.length + 1 >= best.length) return;
                  for (var ti = start; ti < tools.length; ti++) {
                    var next = mask | tools[ti].mask;
                    if (next === mask) continue;
                    picked.push(tools[ti].tool);
                    search(ti + 1, next, picked);
                    picked.pop();
                  }
                };
                search(0, 0, []);
                return best;
              };
              var wbRenderEfficiency = function () {
                var target = wb.solvedId ? wbMineral(wb.solvedId) : null;
                var minimal = wbMinimalPath(target);
                if (!minimal || !minimal.length) return null;
                var used = [];
                (wb.history || []).forEach(function (e) { var k = wbHistoryToolKey(e); if (k && used.indexOf(k) === -1) used.push(k); });
                if (!used.length) return null;
                var lean = used.length <= minimal.length;
                return React.createElement("section", {
                  className: "mt-2.5 rounded-xl border p-2.5 text-left " + (lean ? "border-emerald-300 bg-white" : "border-sky-300 bg-sky-50"),
                  "data-wb-efficiency": lean ? 'lean' : 'longer', "data-wb-efficiency-minimum": String(minimal.length), "data-wb-efficiency-used": String(used.length)
                },
                  React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide " + (lean ? "text-emerald-800" : "text-sky-800") }, __alloT('stem.rocks.wb_eff_title', 'Experimental design review')),
                  React.createElement("p", { className: "text-[10.5px] font-bold mt-0.5 " + (lean ? "text-emerald-900" : "text-sky-900"), style: { overflowWrap: 'anywhere' } },
                    __alloT('stem.rocks.wb_eff_used', 'Tests you ran: ') + used.length + '. ' + __alloT('stem.rocks.wb_eff_min', 'Shortest sufficient path, visible only in hindsight: ') + minimal.length + '. ' + __alloT('stem.rocks.wb_eff_which', 'That path: ') + minimal.map(wbForecastTitleFor).join(__alloT('stem.rocks.wb_eff_join', ', ')) + '.'),
                  React.createElement("p", { className: "text-[10px] mt-1 leading-relaxed " + (lean ? "text-emerald-800" : "text-sky-800") },
                    lean ? __alloT('stem.rocks.wb_eff_lean', 'You matched it while the answer was still open, which is what efficient experimental design looks like.')
                      : __alloT('stem.rocks.wb_eff_longer', 'Nobody could have known it in advance, so the extra tests were not wasted. Independent properties that agree make an identification much harder to overturn.'))
                );
              };

              var wbNotebookText = function () {
                var lines = [__alloT('stem.rocks.wb_nb_title', 'Mineral Workbench field notebook')];
                lines.push(__alloT('stem.rocks.wb_nb_set', 'Candidate set: ') + ((wb.pool || 'standard') === 'challenge' ? __alloT('stem.rocks.wb_pool_challenge', 'Challenge set') + ' · ' + WB_POOL_CHALLENGE.length : __alloT('stem.rocks.wb_pool_standard', 'Standard set') + ' · ' + WB_POOL.length));
                lines.push('');
                lines.push(__alloT('stem.rocks.wb_nb_observations', 'Observations (in the order recorded):'));
                if (!(wb.history || []).length && !wbEvidence.length) lines.push('  ' + __alloT('stem.rocks.wb_nb_none', 'none yet'));
                (wb.history || []).forEach(function (e, i) { lines.push('  ' + (i + 1) + '. ' + wbHistoryToolLabel(e) + ': ' + e.label); });
                lines.push('');
                lines.push(__alloT('stem.rocks.wb_nb_evidence', 'Evidence in force:'));
                wbEvidence.forEach(function (ev) { lines.push('  - ' + wbEvidenceKind(ev.k) + ': ' + ev.text); });
                if (wbHasHardnessEvidence) lines.push('  - ' + __alloT('stem.rocks.wb_nb_hardness', 'Hardness constraint: ') + wbHardnessLabel);
                lines.push('');
                lines.push(__alloT('stem.rocks.wb_nb_shortlist', 'Candidates still fitting: ') + wbRemaining + ' / ' + (wb.order || []).length + (wbViableCandidates.length ? ' (' + wbViableCandidates.map(function (m) { return m.label; }).join(', ') + ')' : ''));
                if (wbSelected) lines.push(__alloT('stem.rocks.wb_nb_claim', 'Claim: ') + wbSelected.label);
                if (wbSelected && wbClaimReasoning && wbChosenRows.length >= 2) lines.push(__alloT('stem.rocks.wb_nb_reasoning', 'Reasoning: ') + wbReasoningSentence);
                if (wb.solvedId) lines.push(__alloT('stem.rocks.wb_nb_identified', 'Identified: ') + (wbMineral(wb.solvedId) || {}).label);
                return lines.join('\n');
              };
              var wbCopyNotebook = function () {
                var txt = wbNotebookText(), ok = false;
                try { if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(txt); ok = true; } } catch (e) {}
                if (!ok) {
                  try { var ta = document.createElement('textarea'); ta.value = txt; ta.setAttribute('aria-hidden', 'true'); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); ok = !!document.execCommand('copy'); document.body.removeChild(ta); } catch (e) { ok = false; }
                }
                if (typeof addToast === 'function') { try { addToast(ok ? __alloT('stem.rocks.wb_nb_copied', 'Notebook copied to the clipboard.') : __alloT('stem.rocks.wb_nb_copy_failed', 'Could not copy. Select the notebook text and copy it by hand.'), ok ? 'success' : 'error'); } catch (e) {} }
                wbSay(ok ? __alloT('stem.rocks.wb_nb_copied', 'Notebook copied to the clipboard.') : __alloT('stem.rocks.wb_nb_copy_failed', 'Could not copy. Select the notebook text and copy it by hand.'));
              };
              var wbRenderObservationCard = function () {
                if (!wbPendingTool || !sp) return null;
                var title = wbPendingTool === 'lens' ? __alloT('stem.rocks.wb_obs_title_lens', 'What does the surface do with light?')
                  : wbPendingTool === 'form' ? __alloT('stem.rocks.wb_obs_title_form', 'What shape does the fragment break into?')
                  : wbPendingTool === 'streak' ? __alloT('stem.rocks.wb_obs_title_streak', 'What is on the porcelain plate?')
                    : wbPendingTool === 'scratch' ? __alloT('stem.rocks.wb_obs_title_scratch', 'Did the reference leave a real scratch?')
                      : wbPendingTool === 'acid' ? __alloT('stem.rocks.wb_obs_title_acid', 'What happened when the acid touched the specimen?')
                        : wbPendingTool === 'magnet' ? __alloT('stem.rocks.wb_obs_title_magnet', 'How did the specimen respond to the magnet?')
                          : __alloT('stem.rocks.wb_obs_title_density', 'Work out the density from the two readings');
                var help = wbPendingTool === 'form' ? __alloT('stem.rocks.wb_obs_help_form', 'Look at the corners, faces and edges of the fragment on the bench; turn it in 3D if that helps. Form is about shape, not colour or shine. Compare with the reference crystals on the candidate cards.')
                  : wbPendingTool === 'lens' ? __alloT('stem.rocks.wb_obs_help_lens', 'Compare the porthole with the four reference sheens. They are all on the same grey surface, so the only difference between them is how they reflect the lamp. Colour is not luster.')
                  : wbPendingTool === 'streak' ? __alloT('stem.rocks.wb_obs_help_streak', 'Name the colour of the powder itself, not the specimen. If the plate is grooved with no powder, the mineral is harder than porcelain.')
                    : wbPendingTool === 'scratch' ? __alloT('stem.rocks.wb_obs_help_scratch', 'A groove cuts INTO the surface and throws chips. A smear is the reference’s own material rubbed ON the surface with no depth.')
                      : wbPendingTool === 'acid' ? __alloT('stem.rocks.wb_obs_help_acid', 'Look at the drop on the specimen.')
                        : wbPendingTool === 'magnet' ? __alloT('stem.rocks.wb_obs_help_magnet', 'Look at where the specimen is now compared with its outline on the bench.')
                          : __alloT('stem.rocks.wb_obs_help_density', 'Density is mass divided by volume: ρ = m ÷ V. Divide the balance reading by the water the specimen displaced, then choose the band your answer falls in.');
                var choices = wbObservationChoices();
                var isLens = wbPendingTool === 'lens', isForm = wbPendingTool === 'form', isStreak = wbPendingTool === 'streak', isDensity = wbPendingTool === 'density';
                return React.createElement("section", {
                  className: "rounded-2xl border-2 border-sky-400 bg-sky-50 p-3 sm:p-4 rk-wb-pop",
                  "aria-labelledby": "wb-observation-title", "data-wb-observation-card": wbPendingTool,
                  "data-wb-observation-ref": wbActiveScratchRef && wbPendingTool === 'scratch' ? wbActiveScratchRef.id : undefined
                },
                  React.createElement("div", { className: "flex items-start gap-3" },
                    React.createElement("span", { className: "w-10 h-10 rounded-xl bg-white flex items-center justify-center text-xl shadow-sm shrink-0", "aria-hidden": "true" }, '📝'),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.14em] text-sky-800" }, __alloT('stem.rocks.wb_obs_eyebrow', 'Your observation')),
                      React.createElement("h4", { id: "wb-observation-title", className: "text-[14px] sm:text-[15px] font-black text-slate-900 mt-0.5" }, title),
                      React.createElement("p", { className: "text-[11px] sm:text-[11.5px] text-slate-700 mt-1 leading-relaxed" }, help)
                    )
                  ),
                  isLens ? React.createElement("div", { className: "mt-3 flex flex-col sm:flex-row gap-3 items-start" },
                    React.createElement("div", { className: "shrink-0 rounded-xl bg-slate-900 p-2", "data-wb-lens-porthole": "large" },
                      rkLensViewSvg(React.createElement, sp, 160, { animate: true, aria: __alloT('stem.rocks.wb_lens_aria', 'Magnified patch of the specimen surface under the lamp. ') + wbSpecimenSr })
                    ),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-wide text-slate-700" }, __alloT('stem.rocks.wb_obs_tilt', 'Tilt it: turn the specimen under the lamp and watch the highlight')),
                      React.createElement("p", { className: "text-[10.5px] text-slate-700 mt-0.5 leading-relaxed" }, __alloT('stem.rocks.wb_obs_tilt_help', 'A hard mirror flash that slides is metallic. One pin-sharp point with a lit interior is glassy. A wide soft glow along layers is pearly. No crisp highlight is dull or waxy.')),
                      React.createElement("button", { type: "button", className: "mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 min-h-[44px] text-[10.5px] font-black text-slate-800 hover:border-sky-400 hover:bg-sky-100", "aria-pressed": !!wb.view3d, "data-wb-view3d": wb.view3d ? 'on' : 'off', onClick: function () { updWb({ view3d: !wb.view3d }); wbSay(wb.view3d ? __alloT('stem.rocks.wb_3d_closed_sr', '3D specimen closed.') : __alloT('stem.rocks.wb_3d_opened_sr', '3D specimen opened below the bench. Drag or use the arrow buttons to turn it.')); } }, wb.view3d ? '🧊 ' + __alloT('stem.rocks.wb_3d_hide', 'Hide 3D specimen') : '🧊 ' + __alloT('stem.rocks.wb_3d_show', 'Turn it in 3D'))
                    )
                  ) : null,
                  isForm ? React.createElement("div", { className: "mt-3 flex flex-col sm:flex-row gap-3 items-start" },
                    React.createElement("div", { className: "shrink-0 rounded-xl bg-slate-900 p-2", "data-wb-form-specimen": "large" }, rkHandSpecimenSvg(React.createElement, sp, 150, { plate: false, aria: __alloT('stem.rocks.wb_form_large_aria', 'The unknown fragment, enlarged. ') + wbObservedFormFor(sp) })),
                    React.createElement("div", { className: "min-w-0 flex-1" },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-wide text-slate-700" }, __alloT('stem.rocks.wb_obs_form_cue', 'Look for corners, sheets, columns or points')),
                      React.createElement("p", { className: "text-[10.5px] text-slate-700 mt-0.5 leading-relaxed" }, __alloT('stem.rocks.wb_obs_form_cue_help', 'Right-angle steps mean box-like cleavage. Leaning faces mean rhombs. Layers that peel are sheets. A long six-sided column is a prism. Triangles meeting in points are pyramids. A thin slab is a blade. A rounded crystal of many small faces is a ball. Lumpy with no faces is massive.')),
                      React.createElement("button", { type: "button", className: "mt-2 rounded-xl border border-slate-300 bg-white px-3 py-2 min-h-[44px] text-[10.5px] font-black text-slate-800 hover:border-sky-400 hover:bg-sky-100", "aria-pressed": !!wb.view3d, "data-wb-view3d": wb.view3d ? 'on' : 'off', onClick: function () { updWb({ view3d: !wb.view3d }); } }, wb.view3d ? '🧊 ' + __alloT('stem.rocks.wb_3d_hide', 'Hide 3D specimen') : '🧊 ' + __alloT('stem.rocks.wb_3d_show', 'Turn it in 3D'))
                    )
                  ) : null,
                  isDensity ? React.createElement("dl", { className: "mt-3 grid grid-cols-2 gap-2", "data-wb-density-readings": "shown" },
                    React.createElement("div", { className: "rounded-xl border border-sky-200 bg-white p-2.5" },
                      React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_reading_mass', 'Balance reading (mass)')),
                      React.createElement("dd", { className: "text-[15px] font-black text-slate-900 mt-0.5" }, 'm = ' + wbModeledMass.toFixed(1) + ' g')
                    ),
                    React.createElement("div", { className: "rounded-xl border border-sky-200 bg-white p-2.5" },
                      React.createElement("dt", { className: "text-[10px] font-black uppercase tracking-wide text-slate-600" }, __alloT('stem.rocks.wb_reading_volume', 'Water displaced (volume)')),
                      React.createElement("dd", { className: "text-[15px] font-black text-slate-900 mt-0.5" }, 'V = ' + wbModeledVolume.toFixed(1) + ' cm³')
                    )
                  ) : null,
                  React.createElement("div", { className: "mt-3 grid gap-2 " + (isDensity ? "grid-cols-2 sm:grid-cols-5" : isStreak ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-1 sm:grid-cols-2"), role: "group", "aria-label": __alloT('stem.rocks.wb_obs_choices_aria', 'Choose the description that matches what you see') },
                    choices.map(function (c) {
                      return React.createElement("button", {
                        key: c.id, type: "button", "data-wb-observe-choice": c.id, "aria-disabled": wbBusy,
                        className: "rounded-xl border border-slate-300 bg-white px-2.5 py-2.5 min-h-[48px] text-left hover:border-sky-500 hover:bg-sky-100 transition-all flex items-center gap-2.5",
                        onClick: function (e) { if (wbBusy) { if (e && e.preventDefault) e.preventDefault(); return; } wbRecordObservation(c.id, c.label); }
                      },
                        c.tile ? React.createElement("span", { className: "shrink-0 rounded-lg overflow-hidden", "data-wb-luster-reference": c.id }, c.tile) : null,
                        c.hex !== undefined ? React.createElement("span", { className: "shrink-0 w-7 h-7 rounded-md border border-slate-400", style: { background: c.hex || 'repeating-linear-gradient(135deg,#e8e5de,#e8e5de 3px,#94a3b8 3px,#94a3b8 4px)' }, "aria-hidden": "true" }) : null,
                        React.createElement("span", { className: "min-w-0" },
                          React.createElement("span", { className: "block text-[11.5px] font-black text-slate-900 leading-tight" }, c.label),
                          c.hint ? React.createElement("span", { className: "block text-[10px] text-slate-700 mt-0.5 leading-snug" }, c.hint) : null
                        )
                      );
                    })
                  ),
                  React.createElement("div", { className: "mt-3 flex flex-wrap items-center justify-between gap-2" },
                    React.createElement("p", { className: "text-[10px] text-slate-700 italic" }, __alloT('stem.rocks.wb_obs_honesty', 'Record what you see, not what you expect. A misread will empty the shortlist, and you can look again.')),
                    React.createElement("button", { type: "button", className: "rounded-lg border border-slate-300 bg-white px-3 py-2 min-h-[44px] text-[10px] font-black text-slate-800 hover:bg-slate-50", "data-wb-observe-discard": wbPendingTool, disabled: wbBusy, onClick: wbDiscardTrial }, __alloT('stem.rocks.wb_obs_discard', 'Discard this trial'))
                  )
                );
              };
              // 3D hand specimen on the host viewer shell. Lives under the bench
              // so it is available for any test, not only while the lens is open.
              var wbRenderSpecimen3d = function () {
                if (!sp || !wb.view3d) return null;
                if (!RK_SPECIMEN_VIEWER) return React.createElement("p", { className: "rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-[10.5px] text-slate-700", "data-wb-specimen-3d": "unavailable" }, __alloT('stem.rocks.wb_3d_unavailable', 'The 3D specimen is unavailable on this host. The lens porthole above carries the same luster evidence.'));
                return React.createElement("section", { className: "rounded-2xl border border-slate-700 bg-slate-900 p-2", "aria-labelledby": "wb-3d-title", "data-wb-specimen-3d": "open" },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 px-1 pb-1.5" },
                    React.createElement("h4", { id: "wb-3d-title", className: "text-[11px] font-black", style: { color: '#f1f5f9', background: '#0f172a' } }, '🧊 ' + __alloT('stem.rocks.wb_3d_title', 'Hand specimen under the lamp')),
                    React.createElement("div", { className: "flex gap-1", role: "group", "aria-label": __alloT('stem.rocks.wb_3d_controls_aria', '3D specimen view controls') },
                      [
                        ['◀', __alloT('stem.rocks.crystal3d_left', 'Rotate left'), function () { RK_SPECIMEN_VIEWER.nudge(-0.3, 0); }],
                        ['▶', __alloT('stem.rocks.crystal3d_right', 'Rotate right'), function () { RK_SPECIMEN_VIEWER.nudge(0.3, 0); }],
                        ['▲', __alloT('stem.rocks.crystal3d_up', 'Tilt up'), function () { RK_SPECIMEN_VIEWER.nudge(0, 0.2); }],
                        ['▼', __alloT('stem.rocks.crystal3d_down', 'Tilt down'), function () { RK_SPECIMEN_VIEWER.nudge(0, -0.2); }],
                        ['＋', __alloT('stem.rocks.crystal3d_in', 'Zoom in'), function () { RK_SPECIMEN_VIEWER.zoom(-0.6); }],
                        ['－', __alloT('stem.rocks.crystal3d_out', 'Zoom out'), function () { RK_SPECIMEN_VIEWER.zoom(0.6); }],
                        ['↺', __alloT('stem.rocks.crystal3d_reset', 'Reset view'), function () { RK_SPECIMEN_VIEWER.reset(); }]
                      ].map(function (b) { return React.createElement("button", { key: b[1], type: "button", "aria-label": b[1], title: b[1], className: "w-9 h-9 min-h-[36px] rounded-lg bg-slate-800 border border-slate-600 text-[12px] font-black hover:bg-slate-700", style: { color: '#f1f5f9', background: '#1e293b' }, onClick: b[2] }, b[0]); })
                    )
                  ),
                  React.createElement("div", {
                    key: 'specimen3d-' + sp.id, ref: rkSpecimenRef,
                    className: "relative w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-950",
                    style: { height: '260px' }, role: "img",
                    "aria-label": __alloT('stem.rocks.wb_3d_aria', 'Rotating 3D model of the unknown hand specimen under a lamp. ') + wbSpecimenSr
                  }),
                  React.createElement("p", { className: "text-[10px] px-1 pt-1.5 leading-relaxed", style: { color: '#cbd5e1', background: '#0f172a' } }, __alloT('stem.rocks.wb_3d_help', 'Drag to turn it. Watch the highlight: does it slide like a mirror, stay as one sharp point, spread as a soft glow, or never appear?'))
                );
              };
              var wbToolBtn = function (opts) {
                var doneTone = opts.caution ? "bg-amber-50 border-amber-300 text-amber-900" : "bg-emerald-50 border-emerald-300 text-emerald-900";
                var unavailable = wbBusy || opts.done || !!wbPendingTool;
                return React.createElement("button", {
                  key: opts.key, type: "button", "aria-disabled": unavailable,
                  onClick: function (e) { if (unavailable) { if (e && e.preventDefault) e.preventDefault(); return; } opts.onClick(); },
                  "aria-label": (wbNext.tool === opts.key && !opts.done ? __alloT('stem.rocks.wb_recommended_aria', 'Recommended next test. ') : '') + opts.aria, title: opts.aria,
                  "data-wb-tool": opts.key,
                  className: "px-2.5 py-2.5 rounded-xl text-left border transition-all min-h-[52px] flex flex-col justify-center " + (opts.done ? doneTone + " cursor-default" : wbBusy ? "bg-white border-slate-300 text-slate-700 cursor-wait opacity-65" : (wbNext.tool === opts.key ? "bg-amber-50 border-amber-400 text-slate-800 ring-2 ring-amber-200 hover:bg-amber-100 rk-wb-nudge" : "bg-white border-slate-300 text-slate-800 hover:border-amber-400 hover:-translate-y-0.5 hover:shadow-md"))
                },
                  React.createElement("span", { className: "text-[12px] font-black leading-tight" }, (opts.done ? '✓ ' : '') + opts.label),
                  opts.meta ? React.createElement("span", { className: "text-[10px] font-semibold text-slate-600 mt-1 leading-tight" }, opts.meta) : null,
                  opts.result ? React.createElement("span", { className: "text-[10px] font-black mt-1 leading-tight " + (opts.caution ? "text-amber-800" : "text-emerald-800") }, opts.result) : null
                );
              };
              var wbRenderMohsInterval = function () {
                var low = wbEq !== null ? Math.max(1, wbEq - WB_PROVISIONAL_HARDNESS_TOLERANCE) : Math.max(1, Math.min(10, wbLo > 0 ? wbLo : 1));
                var high = wbEq !== null ? Math.min(10, wbEq + WB_PROVISIONAL_HARDNESS_TOLERANCE) : Math.max(low, Math.min(10, wbHi < 10.5 ? wbHi : 10));
                var width = high - low;
                var quality = wbHardnessConflict ? 'conflict' : !wbHasHardnessEvidence ? 'unmeasured' : wbHardnessProvisional ? 'provisional' : wbEq !== null || width <= 2.5 ? 'narrow' : width <= 5 ? 'useful' : 'broad';
                var qualityLabel = quality === 'conflict' ? __alloT('stem.rocks.wb_mohs_conflict', 'Conflicting scratch results — retest')
                  : quality === 'unmeasured' ? __alloT('stem.rocks.wb_mohs_unmeasured', 'Not bracketed yet')
                  : quality === 'provisional' ? __alloT('stem.rocks.wb_mohs_provisional', 'Provisional band—confirm')
                    : quality === 'narrow' ? __alloT('stem.rocks.wb_mohs_narrow', 'Narrow bracket')
                    : quality === 'useful' ? __alloT('stem.rocks.wb_mohs_useful', 'Useful bracket') : __alloT('stem.rocks.wb_mohs_broad', 'Broad bracket');
                var recommendedRef = wbScratchRefFor(wbNext.tool);
                var position = function (value) { return ((Math.max(1, Math.min(10, value)) - 1) / 9 * 100); };
                var byHardness = {};
                wbViableCandidates.forEach(function (m) {
                  var key = String(m.hardness);
                  if (!byHardness[key]) byHardness[key] = { hardness: m.hardness, count: 0, names: [] };
                  byHardness[key].count++;
                  byHardness[key].names.push(m.label);
                });
                var candidateGroups = Object.keys(byHardness).map(function (key) { return byHardness[key]; }).sort(function (a, b) { return a.hardness - b.hardness; });
                var candidateSummary = candidateGroups.length ? candidateGroups.map(function (group) {
                  return group.count + (group.count === 1 ? __alloT('stem.rocks.wb_mohs_aria_candidate_one', ' candidate at Mohs ') : __alloT('stem.rocks.wb_mohs_aria_candidate_many', ' candidates at Mohs ')) + group.hardness;
                }).join(', ') : __alloT('stem.rocks.wb_mohs_aria_none', 'No candidates match the current scratch results');
                var intervalAria = __alloT('stem.rocks.wb_mohs_aria_intro', 'Mohs ordinal hardness ranking from 1 to 10. Modeled constraint: ') + wbHardnessLabel + '. ' + __alloT('stem.rocks.wb_mohs_rank_note', 'Mohs is an ordinal ranking; equal spacing does not mean equal increases in hardness.') + ' ' + __alloT('stem.rocks.wb_mohs_aria_candidates', 'Remaining candidate positions: ') + candidateSummary + '.' + (recommendedRef ? ' ' + __alloT('stem.rocks.wb_mohs_aria_next', 'Recommended next reference: ') + recommendedRef.label.replace(/^\S+\s/, '') + ', Mohs ' + recommendedRef.h + '.' : '');
                return React.createElement("figure", {
                  className: "mt-3", "data-wb-mohs-interval": quality,
                  "data-wb-mohs-low": low, "data-wb-mohs-high": high,
                  "data-wb-mohs-equality": wbEq !== null ? wbEq : 'none',
                  "data-wb-mohs-recommended": recommendedRef ? recommendedRef.id : 'none'
                },
                  React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2" },
                    React.createElement("p", { className: "text-[11px] font-black text-slate-900" }, __alloT('stem.rocks.wb_mohs_constraint_title', 'Modeled hardness constraint: ') + wbHardnessLabel),
                    React.createElement("span", { className: "text-[10px] font-black " + (quality === 'narrow' ? "text-emerald-800" : quality === 'useful' ? "text-violet-800" : "text-amber-800") }, qualityLabel)
                  ),
                  React.createElement("div", { className: "mt-2 px-3" },
                    React.createElement("div", { className: "relative h-16", role: "img", "aria-label": intervalAria },
                      React.createElement("span", { className: "absolute left-0 right-0 top-6 h-2 rounded-full bg-slate-200", "aria-hidden": "true" }),
                      React.createElement("span", { className: "absolute top-[22px] h-3 rounded-full bg-violet-600", style: { left: position(low) + '%', width: Math.max(1, position(high) - position(low)) + '%' }, "aria-hidden": "true" }),
                      React.createElement("span", { className: "absolute top-[18px] w-1 h-5 rounded bg-violet-900", style: { left: position(low) + '%', transform: 'translateX(-50%)' }, "aria-hidden": "true" }),
                      React.createElement("span", { className: "absolute top-[18px] w-1 h-5 rounded bg-violet-900", style: { left: position(high) + '%', transform: 'translateX(-50%)' }, "aria-hidden": "true" }),
                      candidateGroups.map(function (group) { return React.createElement("span", { key: 'candidate-' + group.hardness, className: "absolute top-[21px] w-3 h-3 rounded-full bg-white border-[3px] border-violet-900", style: { left: position(group.hardness) + '%', transform: 'translateX(-50%)' }, "data-wb-mohs-candidate-marker": group.hardness, "data-wb-mohs-candidate-count": group.count, "aria-hidden": "true" }); }),
                      recommendedRef ? React.createElement("span", { className: "absolute top-0 text-amber-800 text-base font-black", style: { left: position(recommendedRef.h) + '%', transform: 'translateX(-50%)' }, "aria-hidden": "true", "data-wb-mohs-next-marker": recommendedRef.id }, '◆') : null,
                      [1, 3, 5, 7, 10].map(function (tick) { return React.createElement("span", { key: tick, className: "absolute top-10 text-[11px] font-bold text-slate-700", style: { left: position(tick) + '%', transform: 'translateX(-50%)' }, "aria-hidden": "true" }, tick); })
                    )
                  ),
                  React.createElement("figcaption", { className: "flex flex-wrap gap-x-4 gap-y-1 text-[10.5px] text-slate-700" },
                    React.createElement("span", null, '● ' + __alloT('stem.rocks.wb_mohs_candidates_key', 'Remaining candidate hardnesses')),
                    recommendedRef ? React.createElement("span", { className: "font-bold text-amber-900" }, '◆ ' + __alloT('stem.rocks.wb_mohs_next_key', 'Recommended next reference: ') + recommendedRef.label + ' (' + recommendedRef.h + ')') : null,
                    React.createElement("span", { className: "basis-full mt-1" }, __alloT('stem.rocks.wb_mohs_rank_note', 'Mohs is an ordinal ranking; equal spacing does not mean equal increases in hardness.'))
                  )
                );
              };

              var wbCasePool = wbPoolFor();
              var wbCollected = (wb.collected || []).filter(function (id) { return wbCasePool.indexOf(id) !== -1; });
              var wbCaseComplete = wbCollected.length >= wbCasePool.length;
              var wbRenderFieldCase = function () {
                if (!wbCollected.length) return null;
                var remaining = wbCasePool.length - wbCollected.length;
                return React.createElement("section", { className: "rounded-xl border border-slate-200 bg-white p-2.5", "data-wb-field-case": wbCaseComplete ? 'complete' : 'partial', "aria-labelledby": "wb-case-title" },
                  React.createElement("div", { className: "flex items-center justify-between gap-2 mb-2" },
                    React.createElement("p", { id: "wb-case-title", className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-600" }, __alloT('stem.rocks.wb_case_title', 'Field case')),
                    React.createElement("span", { className: "rounded-full px-2.5 py-1 text-[10.5px] font-black border " + (wbCaseComplete ? "bg-emerald-100 text-emerald-900 border-emerald-300" : "bg-slate-100 text-slate-700 border-slate-300"), "data-wb-case-count": String(wbCollected.length) },
                      wbCaseComplete ? __alloT('stem.rocks.wb_case_complete', 'Case complete') : wbCollected.length + ' / ' + wbCasePool.length + ' ' + __alloT('stem.rocks.wb_case_named', 'named'))
                  ),
                  React.createElement("ul", { className: "flex flex-wrap gap-1.5", "aria-label": __alloT('stem.rocks.wb_case_aria', 'Minerals named this session') },
                    wbCasePool.filter(function (id) { return wbCollected.indexOf(id) !== -1; }).map(function (id) {
                      var caseM = wbMineral(id);
                      if (!caseM) return null;
                      return React.createElement("li", {
                        key: id, "data-wb-case-slot": "filled", "data-wb-case-id": id,
                        className: "rounded-lg border border-emerald-300 bg-emerald-50 pl-1 pr-2 py-1 flex items-center gap-1.5" + (id === wb.solvedId ? " rk-wb-pop" : "")
                      },
                        React.createElement("span", { "aria-hidden": "true", className: "shrink-0 leading-none" }, rkMineralSwatch(React.createElement, caseM, 20)),
                        React.createElement("span", { className: "text-[10.5px] font-black text-emerald-900" }, caseM.label)
                      );
                    }),
                    remaining > 0 ? React.createElement("li", { key: "wb-case-rest", "data-wb-case-slot": "empty", className: "rounded-lg border border-dashed border-slate-400 bg-slate-50 px-2 py-1 flex items-center gap-1.5" },
                      React.createElement("span", { "aria-hidden": "true", className: "w-5 h-5 rounded border border-dashed border-slate-400 flex items-center justify-center text-[10px] font-black text-slate-600" }, '?'),
                      React.createElement("span", { className: "text-[10.5px] font-black text-slate-600" }, remaining + ' ' + __alloT('stem.rocks.wb_case_remaining', 'still unnamed'))
                    ) : null
                  )
                );
              };

              var wbSteps = [
                { id: 'observe', icon: '1', short: __alloT('stem.rocks.wb_step_observe_short', 'Observe'), title: __alloT('stem.rocks.wb_step_observe', 'Observe & test'), detail: __alloT('stem.rocks.wb_step_observe_detail', 'Use an instrument to collect a property.') },
                { id: 'compare', icon: '2', short: __alloT('stem.rocks.wb_step_compare_short', 'Compare'), title: __alloT('stem.rocks.wb_step_compare', 'Compare evidence'), detail: __alloT('stem.rocks.wb_step_compare_detail', 'Notice which candidates no longer fit.') },
                { id: 'claim', icon: '3', short: __alloT('stem.rocks.wb_step_claim_short', 'Claim'), title: __alloT('stem.rocks.wb_step_claim', 'Make a claim'), detail: __alloT('stem.rocks.wb_step_claim_detail', 'Name the mineral and support your choice.') }
              ];
              var wbAnimLabel = ({
                streak: __alloT('stem.rocks.wb_running_streak', 'Running the streak-plate test…'),
                acid: __alloT('stem.rocks.wb_running_acid', 'Watching for an acid reaction…'),
                magnet: __alloT('stem.rocks.wb_running_magnet', 'Checking for magnetic pull…'),
                lens: __alloT('stem.rocks.wb_running_lens', 'Examining luster and crystal form…'),
                form: __alloT('stem.rocks.wb_running_form', 'Looking at the fragment’s shape…'),
                density: __alloT('stem.rocks.wb_running_density', 'Measuring mass and displaced volume…'),
                scratch: __alloT('stem.rocks.wb_running_scratch', 'Checking whether the reference leaves a true scratch…'),
                wrong: __alloT('stem.rocks.wb_running_claim', 'That claim does not fit yet—compare the remaining evidence.')
              })[wb.anim] || '';

              return React.createElement("div", { className: "space-y-4", "data-rocks-workbench": "mineral-identification", "data-wb-guided-focus": wbGuided ? 'active' : 'full', "aria-busy": wbBusy },
                !sp ? React.createElement("section", { className: "rounded-2xl border-2 border-amber-300 p-5 sm:p-7 text-center overflow-hidden", style: { background: 'radial-gradient(circle at 50% 0%,#ffffff 0%,#fffbeb 38%,#fef3c7 100%)' }, "aria-labelledby": "wb-intro-title" },
                  React.createElement("div", { className: "mx-auto w-16 h-16 rounded-2xl bg-slate-900 flex items-center justify-center shadow-lg", style: { fontSize: 36 }, "aria-hidden": "true" }, '🔬'),
                  React.createElement("p", { className: "text-[10px] font-black tracking-[0.18em] uppercase text-amber-800 mt-4" }, __alloT('stem.rocks.wb_intro_eyebrow', 'Evidence-first mineral identification')),
                  React.createElement("h3", { id: "wb-intro-title", className: "text-xl font-black text-amber-900 mt-1" }, __alloT('stem.rocks.wb_intro_title', 'The Mineral Workbench')),
                  React.createElement("p", { className: "text-[13px] sm:text-sm text-amber-900 max-w-xl mx-auto mt-2 leading-relaxed" }, __alloT('stem.rocks.wb_intro_body', 'An unknown specimen, real instruments, and a field notebook. Run the tests a geologist would, watch your evidence eliminate suspects, then name the mineral.')),
                  React.createElement("ol", { className: "grid sm:grid-cols-3 gap-2.5 max-w-2xl mx-auto mt-5 text-left", "aria-label": __alloT('stem.rocks.wb_sequence_aria', 'Mineral identification sequence') },
                    wbSteps.map(function (step) { return React.createElement("li", { key: step.id, className: "rounded-xl border border-amber-200 bg-white/80 p-3 flex gap-2.5" },
                      React.createElement("span", { className: "w-7 h-7 rounded-full bg-amber-700 text-white text-xs font-black flex items-center justify-center shrink-0", "aria-hidden": "true" }, step.icon),
                      React.createElement("span", null,
                        React.createElement("span", { className: "block text-[12px] font-black text-amber-900" }, step.title),
                        React.createElement("span", { className: "block text-[10.5px] text-amber-800 mt-0.5 leading-snug" }, step.detail)
                      )
                    ); })
                  ),
                  React.createElement("div", { className: "mt-5 inline-flex rounded-xl border border-amber-300 bg-white/80 p-1", role: "group", "aria-label": __alloT('stem.rocks.wb_pool_aria', 'Choose the candidate set') },
                    [['standard', __alloT('stem.rocks.wb_pool_standard', 'Standard set') + ' · ' + WB_POOL.length], ['challenge', __alloT('stem.rocks.wb_pool_challenge', 'Challenge set') + ' · ' + WB_POOL_CHALLENGE.length]].map(function (opt) {
                      var on = (wb.pool || 'standard') === opt[0];
                      return React.createElement("button", { key: opt[0], type: "button", "aria-pressed": on, "data-wb-pool": opt[0], className: "rounded-lg px-3 py-2 min-h-[40px] text-[11px] font-black " + (on ? "bg-amber-700 text-white" : "text-amber-900 hover:bg-amber-100"), onClick: function () { updWb({ pool: opt[0] }); } }, opt[1]);
                    })
                  ),
                  React.createElement("p", { className: "text-[10.5px] text-amber-900 mt-1.5" }, (wb.pool || 'standard') === 'challenge' ? __alloT('stem.rocks.wb_pool_challenge_help', 'Adds diamond, garnet, olivine, sulfur, corundum, topaz, graphite and the two copper carbonates. Several are harder than the streak plate, and three of them fizz, so neither test finishes the job alone.') : __alloT('stem.rocks.wb_pool_standard_help', 'Twelve common minerals with clearly different signatures.')),
                  React.createElement("div", null,
                    React.createElement("button", { className: "mt-4 px-5 py-3 rounded-xl bg-amber-700 text-white font-black shadow-md hover:bg-amber-800 hover:-translate-y-0.5 transition-all min-h-[48px]", onClick: wbDraw }, __alloT('stem.rocks.wb_open', '🪨 Put a specimen on the bench'))
                  )
                ) : React.createElement(React.Fragment, null,
                  // A compact investigation map stays visible as the state
                  // changes, giving students a stable sense of where they are.
                  React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-2" },
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-600" }, __alloT('stem.rocks.wb_investigation_path', 'Investigation path')),
                      React.createElement("p", { className: "text-[11px] text-slate-700 mt-0.5" }, wbGuided ? __alloT('stem.rocks.wb_guided_help', 'Guided focus keeps the current scientific task open and quiets later steps.') : __alloT('stem.rocks.wb_full_help', 'Full workbench keeps every investigation area available.'))
                    ),
                  React.createElement("button", { type: "button", "aria-label": __alloT('stem.rocks.wb_guided_toggle_aria', 'Guided focus'), "aria-pressed": wbGuided, "data-wb-guided-toggle": wbGuided ? 'active' : 'full', className: "w-full sm:w-auto min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-[10.5px] font-black text-slate-800 hover:border-amber-400 hover:bg-amber-50", onClick: function () { updWb({ guided: !wbGuided, toolsExpanded: false, candidatesExpanded: false }); } }, wbGuided ? __alloT('stem.rocks.wb_show_full', 'Show full workbench') : __alloT('stem.rocks.wb_use_guided', 'Use guided focus'))
                  ),
                  React.createElement("ol", { className: "grid grid-cols-3 gap-2", "aria-label": __alloT('stem.rocks.wb_progress_aria', 'Mineral investigation progress') },
                    wbSteps.map(function (step, i) {
                      var progressState = wb.solvedId ? 'complete'
                        : i === 0 ? (wbEvidenceTypeCount >= 2 ? 'complete' : wbEvidenceTypeCount > 0 ? 'in-progress' : 'current')
                          : i === 1 ? (wbStage > 1 ? 'complete' : wbEvidenceTypeCount > 0 ? 'current' : 'upcoming')
                            : wbStage === 2 ? 'current' : 'upcoming';
                      var complete = progressState === 'complete';
                      var current = progressState === 'current';
                      var inProgress = progressState === 'in-progress';
                      return React.createElement("li", {
                        key: step.id, "data-wb-step": step.id, "data-wb-step-state": progressState,
                        "aria-current": current ? 'step' : undefined,
                        className: "rounded-xl border px-2.5 py-2.5 flex items-center gap-2 min-w-0 " + (complete ? "bg-emerald-50 border-emerald-300 text-emerald-900" : current ? "bg-amber-50 border-amber-400 text-amber-900 ring-2 ring-amber-100" : inProgress ? "bg-sky-50 border-sky-300 text-sky-900" : "bg-slate-50 border-slate-200 text-slate-600")
                      },
                        React.createElement("span", { className: "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 " + (complete ? "bg-emerald-700 text-white" : current ? "bg-amber-700 text-white" : inProgress ? "bg-sky-700 text-white" : "bg-slate-200 text-slate-600"), "aria-hidden": "true" }, complete ? '✓' : step.icon),
                        React.createElement("span", { className: "text-[10.5px] sm:text-[12px] font-black leading-tight min-w-0" },
                          React.createElement("span", { className: "sm:hidden" }, step.short),
                          React.createElement("span", { className: "hidden sm:inline" }, step.title),
                          inProgress ? React.createElement("span", { className: "block text-[10px] font-bold mt-0.5" }, __alloT('stem.rocks.wb_stage_in_progress', 'In progress')) : null
                        )
                      );
                    })
                  ),
                  wbRenderFieldCase(),
                  wbBench,
                  React.createElement("p", { className: "sm:hidden rounded-lg bg-slate-800 px-3 py-2 text-[11px] font-semibold text-white leading-relaxed", "data-wb-mobile-bench-caption": "readable" },
                    __alloT('stem.rocks.wb_unknown_mobile', 'Unknown specimen') + ' · ' + wbObservedFormFor(sp) + (wbPlateScratched ? ' · ' + __alloT('stem.rocks.wb_plate_mobile', 'No powder streak; plate groove gives H > 6.5') : '')
                  ),
                  wbRenderSpecimen3d(),
                  wbRenderObservationCard(),
                  // Guided learners see the next scientific move immediately
                  // after the specimen; the full bench keeps evidence first.
                  wbGuided ? wbRenderActionHub() : null,
                  wbRenderEvidenceRail(),
                  wbRenderPropertyGuide(),
                  !wbGuided ? wbRenderActionHub() : null,
                  React.createElement("div", { className: "grid lg:grid-cols-5 gap-3" },
                    // Instrument tray: purpose text and Mohs values make each
                    // control a scientific choice rather than an icon puzzle.
                    React.createElement("section", { id: "wb-tools-panel", className: "rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 lg:col-span-3", "aria-labelledby": "wb-tools-title", "data-wb-tools-state": wbToolsOpen ? 'open' : 'focused' },
                      React.createElement("div", { className: "flex items-start justify-between gap-3 mb-3" },
                        React.createElement("div", null,
                          React.createElement("h4", { id: "wb-tools-title", className: "text-[12px] font-black text-slate-800 uppercase tracking-wide" }, '🧰 ' + __alloT('stem.rocks.wb_tray', 'Instrument tray')),
                          React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5" }, __alloT('stem.rocks.wb_tray_help', 'Choose a property to measure. The highlighted tool is a useful next test, not a required path.'))
                        ),
                        wbGuided && wbStage > 0 ? React.createElement("button", { type: "button", "aria-expanded": wbToolsOpen, "aria-controls": "wb-tools-content", className: "rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 min-h-[44px] text-[10px] font-black text-slate-800 shrink-0 hover:border-amber-400 hover:bg-amber-50", onClick: function () { updWb({ toolsExpanded: !wbToolsOpen }); } }, wbToolsOpen ? __alloT('stem.rocks.wb_quiet_tools', 'Hide instruments') : __alloT('stem.rocks.wb_show_tools', 'Show all instruments')) : React.createElement("span", { className: "rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700 shrink-0" }, wbEvidence.length + ' ' + __alloT('stem.rocks.wb_observations', 'observations'))
                      ),
                      wbToolsOpen ? React.createElement(React.Fragment, null,
                      React.createElement("div", { id: "wb-tools-content", className: "grid sm:grid-cols-2 xl:grid-cols-3 gap-2" },
                        wbToolBtn({ key: 'form', label: '🔷 ' + __alloT('stem.rocks.wb_t_form', 'Describe its shape'), meta: __alloT('stem.rocks.wb_meta_form', 'Free look: corners, sheets, columns or no faces'), done: !!wb.formObs, aria: __alloT('stem.rocks.wb_t_form_aria', 'Describe the form of the fragment on the bench'), onClick: function () { wbRun('form', 500, function () { updWb({ pending: { tool: 'form' } }); wbSay(wbObservedFormFor(sp) + ' ' + __alloT('stem.rocks.wb_sr_record_prompt', 'Choose the description that matches in the observation card.')); }); } }),
                        wbToolBtn({ key: 'lens', label: '🔍 ' + __alloT('stem.rocks.wb_t_lens', 'Hand lens'), meta: __alloT('stem.rocks.wb_meta_lens', 'Observe luster + crystal form'), done: !!wb.lens, aria: __alloT('stem.rocks.wb_t_lens_aria', 'Examine the surface with a hand lens'), onClick: function () { wbRun('lens', 1600, function () { updWb({ pending: { tool: 'lens' } }); wbSay(__alloT('stem.rocks.wb_sr_lens_evidence', 'Under the lens: ') + wbSpecimenSr + ' ' + __alloT('stem.rocks.wb_sr_lens2', 'Observed reference form: ') + wbObservedFormFor(sp) + '. ' + __alloT('stem.rocks.wb_sr_record_prompt', 'Choose the description that matches in the observation card.')); }); } }),
                        wbToolBtn({ key: 'streak', label: '🍽️ ' + __alloT('stem.rocks.wb_t_streak', 'Streak plate'), meta: __alloT('stem.rocks.wb_meta_streak', 'Check powder color or plate scratch'), done: !!wb.streakObs, caution: wbPlateScratched, aria: __alloT('stem.rocks.wb_t_streak_aria', 'Run the streak-plate test'), onClick: function () { wbRun('streak', 900, function () { updWb({ streakDone: true, pending: { tool: 'streak' } }); sfxRockCrack(); wbSay(rkStreakPlateTooHard(sp) ? __alloT('stem.rocks.wb_sr_streak_groove', 'The specimen cut a groove into the porcelain and left no powder.') : __alloT('stem.rocks.wb_sr_streak_powder', 'A powder mark crosses the plate. Its colour is ') + String(sp.streak).toLowerCase() + __alloT('stem.rocks.wb_sr_streak_powder2', ', shown beside the specimen’s outward colour.') + ' ' + __alloT('stem.rocks.wb_sr_record_prompt', 'Choose the description that matches in the observation card.')); }); } }),
                        wbToolBtn({ key: 'magnet', label: '🧲 ' + __alloT('stem.rocks.wb_t_magnet', 'Magnet'), meta: __alloT('stem.rocks.wb_meta_magnet', 'Check for magnetic pull'), done: !!wb.magnet, aria: __alloT('stem.rocks.wb_t_magnet_aria', 'Bring a magnet close to the specimen'), onClick: function () { wbRun('magnet', 1100, function () { updWb({ pending: { tool: 'magnet' } }); wbSay((spIsMag ? __alloT('stem.rocks.wb_sr_magnet_moved', 'The specimen slid across the bench toward the magnet.') : __alloT('stem.rocks.wb_sr_magnet_still', 'The magnet passed close by and the specimen did not move.')) + ' ' + __alloT('stem.rocks.wb_sr_record_prompt', 'Choose the description that matches in the observation card.')); }); } }),
                        wbToolBtn({ key: 'acid', label: '🧪 ' + __alloT('stem.rocks.wb_t_acid', 'Acid dropper'), meta: __alloT('stem.rocks.wb_meta_acid', 'Virtual calcite-response check'), done: !!wb.fizz, aria: __alloT('stem.rocks.wb_t_acid_aria', 'Apply a virtual drop of dilute hydrochloric acid'), onClick: function () { wbRun('acid', 1400, function () { updWb({ pending: { tool: 'acid' } }); (spIsCarb ? sfxRockCool : sfxRockClick)(); wbSay((spIsCarb ? __alloT('stem.rocks.wb_sr_acid_bubbles', 'Bubbles rise steadily from the drop.') : __alloT('stem.rocks.wb_sr_acid_still', 'The drop sits still on the surface; nothing rises from it.')) + ' ' + __alloT('stem.rocks.wb_sr_record_prompt', 'Choose the description that matches in the observation card.')); }); } }),
                        wbToolBtn({ key: 'balance', label: '⚖️ ' + __alloT('stem.rocks.wb_t_balance', 'Balance + beaker'), meta: __alloT('stem.rocks.wb_meta_density', 'Calculate mass ÷ volume'), done: !!wb.densityObs, aria: __alloT('stem.rocks.wb_t_balance_aria', 'Weigh the specimen and measure displacement to find density'), onClick: function () { wbRun('density', 1800, function () { updWb({ density: true, pending: { tool: 'density' } }); sfxRockCool(); wbSay(__alloT('stem.rocks.wb_sr_density_readings', 'The balance reads ') + wbModeledMass.toFixed(1) + __alloT('stem.rocks.wb_sr_density_readings2', ' grams. The water level rose by ') + wbModeledVolume.toFixed(1) + __alloT('stem.rocks.wb_sr_density_readings3', ' cubic centimetres. Divide mass by volume and choose the band your answer falls in.')); }); } })
                      ),
                      React.createElement("div", { className: "mt-4 pt-3 border-t border-slate-200" },
                        React.createElement("div", { className: "flex items-start justify-between gap-3 mb-2" },
                          React.createElement("div", null,
                            React.createElement("h5", { className: "text-[11px] font-black text-slate-800 uppercase tracking-wide" }, '🪛 ' + __alloT('stem.rocks.wb_scratch_set', 'Mohs scratch reference set')),
                            React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-0.5" }, __alloT('stem.rocks.wb_scratch_help', 'Find one reference that leaves no mark and the next harder reference that scratches. A modeled near-match narrows to H ≈ the reference but should be confirmed. The porcelain reference is the same plate: a groove without powder means H > about 6.5.'))
                          ),
                          wbHasHardnessEvidence ? React.createElement("span", { className: "rounded-lg bg-violet-50 border border-violet-200 px-2 py-1 text-[10px] font-black text-violet-900 shrink-0" }, wbHardnessLabel) : null
                        ),
                        wbRenderMohsInterval(),
                        React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-2" },
                          WB_REFS.map(function (ref) {
                            var res = (wb.scratch || {})[ref.id];
                            var derivedPlateResult = ref.id === 'streak_plate' && wbPlateScratched;
                            return wbToolBtn({ key: ref.id, label: ref.label, meta: __alloT('stem.rocks.wb_mohs_value', 'Mohs') + ' ' + ref.h, result: derivedPlateResult ? __alloT('stem.rocks.wb_result_plate_derived', 'Bound recorded from the streak-plate groove') : res ? (res === 'scratched' ? __alloT('stem.rocks.wb_result_scratch', '✓ left a scratch') : res === 'borderline' ? __alloT('stem.rocks.scratch_borderline', 'Modeled near-match—retest to confirm') : __alloT('stem.rocks.wb_result_nomark', 'No mark observed')) : null, done: !!res || derivedPlateResult, caution: res === 'borderline', aria: __alloT('stem.rocks.wb_scratch_aria', 'Try to scratch the specimen with ') + ref.label.replace(/^\S+\s/, '') + ', Mohs ' + ref.h, onClick: function () { wbRun('scratch', 800, function () { var outcome = rkScratchOutcome(ref.h, sp.hardness); updWb({ pending: { tool: 'scratch', ref: ref.id } }); (outcome === 'scratched' ? sfxRockCrack : sfxRockClick)(); wbSay((outcome === 'scratched' ? __alloT('stem.rocks.wb_sr_scratch_groove', 'The reference cut a dark groove with chips thrown ahead of the tip.') : outcome === 'borderline' ? __alloT('stem.rocks.wb_sr_scratch_trace', 'Only a broken, uneven trace: hard to tell whether it cut in.') : __alloT('stem.rocks.wb_sr_scratch_smear', 'Only a faint pale smear of the reference’s own material; the surface underneath is unmarked.')) + ' ' + __alloT('stem.rocks.wb_sr_record_prompt', 'Choose the description that matches in the observation card.')); }, { activeScratchRef: ref.id }); } });
                          })
                        )
                      ),
                      React.createElement("p", { className: "mt-3 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-[10.5px] text-rose-900" }, '⚠️ ' + __alloT('stem.rocks.wb_safety', 'This is a virtual lab. In a physical lab, use only teacher-approved specimens, wear eye protection, avoid making dust—especially from lead-bearing minerals such as galena—wash hands, and never taste an unknown. Acid tests require teacher supervision and a tiny test area.'))
                      ) : React.createElement("div", { id: "wb-tools-content", className: "rounded-xl bg-slate-50 border border-slate-200 p-3", "data-wb-tools-summary": "quiet" },
                        React.createElement("p", { className: "text-[11px] font-black text-slate-900" }, wbNext.tool === 'claim' ? __alloT('stem.rocks.wb_tools_quiet_claim', 'Instruments are quiet while you build the claim.') : __alloT('stem.rocks.wb_tools_quiet_compare', 'Instrument choices are tucked away while you compare evidence.')),
                        React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-1 leading-relaxed" }, __alloT('stem.rocks.wb_tools_quiet_help', 'Open the tray whenever another measurement would strengthen or challenge your idea.'))
                      )
                    ),
                    // The notebook makes elimination visible as a consequence
                    // of evidence, with enough context to explain the reasoning.
                    React.createElement("aside", { className: "rounded-2xl border border-amber-300 p-3 sm:p-4 lg:col-span-2", style: { background: 'repeating-linear-gradient(180deg,#fffbeb,#fffbeb 29px,#fde68a55 30px)' }, "aria-labelledby": "wb-notebook-title" },
                      React.createElement("div", { className: "flex items-center justify-between gap-3" },
                        React.createElement("h4", { id: "wb-notebook-title", tabIndex: -1, className: "text-[12px] font-black text-amber-900 uppercase tracking-wide" }, '📓 ' + __alloT('stem.rocks.wb_notebook', 'Field notebook')),
                        React.createElement("span", { className: "rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[10px] font-black text-amber-900" }, wbEvidenceTypeCount + ' / 7 ' + __alloT('stem.rocks.wb_confirmed_types_short', 'confirmed') + (wbProvisionalTypeCount ? ' · ' + wbProvisionalTypeCount + ' ' + __alloT('stem.rocks.wb_provisional_short', 'provisional') : ''))
                      ),
                      React.createElement("div", { className: "mt-3", role: "group", "aria-label": __alloT('stem.rocks.wb_coverage_aria', 'Evidence coverage by property type') },
                        React.createElement("div", { className: "flex items-center justify-between gap-2 mb-1.5" },
                          React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-amber-800" }, __alloT('stem.rocks.wb_coverage_title', 'Evidence coverage')),
                          React.createElement("p", { className: "text-[10px] font-semibold text-amber-800" }, wbEvidenceTypeCount + __alloT('stem.rocks.wb_of_seven_types', ' of 7 confirmed property types'))
                        ),
                        React.createElement("div", { className: "grid grid-cols-2 gap-1.5", role: "list" }, wbCoverage.map(function (item) {
                          return React.createElement("div", {
                            key: item.id, "data-wb-evidence-type": item.id, "data-wb-evidence-state": item.provisional ? 'provisional' : item.done ? 'measured' : 'not-measured',
                            role: "listitem",
                            "aria-label": item.label + '. ' + (item.provisional ? __alloT('stem.rocks.wb_provisional_short', 'provisional') : item.done ? __alloT('stem.rocks.wb_confirmed_types_short', 'confirmed') : __alloT('stem.rocks.wb_rail_pending', 'Not measured')) + '.',
                            className: "rounded-lg border px-2 py-1.5 flex items-center gap-1.5 text-[10px] font-black " + (item.provisional ? "bg-amber-100 border-amber-400 text-amber-900" : item.done ? "bg-emerald-50 border-emerald-300 text-emerald-900" : "bg-white/70 border-amber-200 text-amber-800")
                          },
                            React.createElement("span", { "aria-hidden": "true" }, item.provisional ? '≈' : item.done ? '✓' : item.icon),
                            React.createElement("span", null, item.label + (item.provisional ? ' · ' + __alloT('stem.rocks.wb_provisional_short', 'provisional') : ''))
                          );
                        }))
                      ),
                      wbEvidence.length === 0 ? React.createElement("div", { className: "rounded-xl border border-dashed border-amber-400 bg-white/70 p-4 mt-3 text-center" },
                        React.createElement("p", { className: "text-[12px] font-black text-amber-900" }, __alloT('stem.rocks.wb_notebook_empty_title', 'Your first observation goes here.')),
                        React.createElement("p", { className: "text-[11px] text-amber-800 mt-1" }, __alloT('stem.rocks.wb_notebook_empty', 'No observations yet. Every test you run is recorded here as evidence.'))
                      ) : React.createElement("ul", { className: "space-y-2 mt-3", "aria-label": __alloT('stem.rocks.wb_notebook_list_aria', 'Recorded evidence grouped by property') }, wbEvidence.map(function (ev) {
                        var impact = wbEvidenceImpact(ev);
                        return React.createElement("li", { key: ev.k, "data-wb-evidence-impact": impact, "data-wb-evidence-certainty": ev.provisional ? 'provisional' : 'confirmed', className: "rounded-lg border p-2.5 rk-wb-pop flex gap-2 " + (ev.provisional ? "border-amber-400 bg-amber-50" : "border-amber-200 bg-white/85") },
                          React.createElement("span", { className: "w-7 h-7 rounded-lg text-[14px] flex items-center justify-center shrink-0 " + (ev.provisional ? "bg-amber-100 border border-amber-400" : "bg-emerald-50 border border-emerald-300"), "aria-hidden": "true" }, ev.provisional ? '≈' : wbEvidenceIcon(ev.k)),
                          React.createElement("span", { className: "min-w-0 flex-1" },
                            React.createElement("span", { className: "block text-[10px] font-black uppercase tracking-wide text-amber-800" }, wbEvidenceKind(ev.k)),
                            React.createElement("span", { className: "block text-[11.5px] text-amber-900 font-semibold leading-snug" }, ev.text),
                            React.createElement("button", { type: "button", className: "mt-1 mr-1.5 inline-flex items-center rounded-full border border-amber-400 bg-white/90 px-3 py-1 min-h-[44px] text-[10px] font-black text-amber-900 hover:bg-amber-100 disabled:opacity-50", "data-wb-reexamine": ev.k, disabled: wbBusy || !!wbPendingTool, "aria-label": __alloT('stem.rocks.wb_reexamine_aria', 'Look again and re-record: ') + wbEvidenceKind(ev.k), onClick: function () { wbReexamine(ev.k); } }, '👁 ' + __alloT('stem.rocks.wb_reexamine', 'Look again')),
                            React.createElement("span", { className: "inline-block mt-1 rounded-full border px-2 py-0.5 text-[10px] font-black " + (ev.provisional ? "bg-amber-100 border-amber-300 text-amber-900" : impact > 0 ? "bg-violet-50 border-violet-200 text-violet-900" : "bg-slate-50 border-slate-200 text-slate-600") }, ev.provisional ? __alloT('stem.rocks.wb_provisional_not_claim', 'Provisional model clue—confirm before using hardness in a claim') : impact > 0 ? __alloT('stem.rocks.wb_rules_out', 'Rules out ') + impact + __alloT('stem.rocks.wb_on_own', ' on its own') : __alloT('stem.rocks.wb_confirms_only', 'Confirms, but does not narrow alone'))
                          )
                        );
                      })),
                      wbHasHardnessEvidence ? React.createElement("p", { className: "text-[11.5px] font-black mt-3 rounded-lg border p-2.5 " + (wbHardnessProvisional ? "text-amber-900 border-amber-300 bg-amber-50" : "text-violet-900 border-violet-200 bg-violet-50"), "data-wb-hardness-certainty": wbHardnessProvisional ? 'provisional' : 'confirmed' }, '⛏️ ' + __alloT('stem.rocks.wb_bracket', 'Hardness constraint: ') + wbHardnessLabel + (wbHardnessProvisional ? ' · ' + __alloT('stem.rocks.wb_provisional_confirm', 'Provisional—confirm') : '')) : null,
                      wbTopEvidence && wbTopEvidence.impact > 0 ? React.createElement("div", { className: "mt-3 rounded-xl border border-violet-200 bg-violet-50 p-2.5", "data-wb-diagnostic-leader": wbEvidenceKind(wbTopEvidence.ev.k) },
                        React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-violet-800" }, __alloT('stem.rocks.wb_diagnostic_title', 'Most diagnostic so far')),
                        React.createElement("p", { className: "text-[10.5px] font-semibold text-violet-900 mt-0.5" }, wbEvidenceKind(wbTopEvidence.ev.k) + __alloT('stem.rocks.wb_diagnostic_mid', ' rules out ') + wbTopEvidence.impact + __alloT('stem.rocks.wb_diagnostic_end', ' candidates by itself. A useful test creates a strong split among possibilities.'))
                      ) : null,
                      React.createElement("div", { className: "mt-4 pt-3 border-t border-amber-300" },
                        React.createElement("div", { className: "flex justify-between gap-3 text-[11px]" },
                          React.createElement("span", { className: "font-black text-amber-900" }, wbRemaining + ' ' + __alloT('stem.rocks.wb_still_fit', 'still fit')),
                          React.createElement("span", { className: "font-semibold text-amber-800" }, ((wb.order || []).length - wbRemaining) + ' ' + __alloT('stem.rocks.wb_eliminated', 'eliminated'))
                        ),
                        React.createElement("div", { className: "h-2 rounded-full bg-amber-200 mt-1.5 overflow-hidden", role: "progressbar", "aria-label": __alloT('stem.rocks.wb_elimination_progress', 'Candidate elimination progress'), "aria-valuemin": 0, "aria-valuemax": (wb.order || []).length, "aria-valuenow": (wb.order || []).length - wbRemaining, "aria-valuetext": ((wb.order || []).length - wbRemaining) + ' ' + __alloT('stem.rocks.wb_eliminated', 'eliminated') + '; ' + wbRemaining + ' ' + __alloT('stem.rocks.wb_still_fit', 'still fit') + '.' },
                          React.createElement("div", { className: "h-full rounded-full transition-all " + (wbRemaining === 0 && !wb.solvedId ? "bg-rose-500" : "bg-emerald-600"), style: { width: (((wb.order || []).length ? (((wb.order || []).length - wbRemaining) / wb.order.length) : 0) * 100) + '%' } })
                        ),
                        React.createElement("button", { type: "button", className: "mt-3 rounded-lg border border-amber-300 bg-white/80 px-2.5 py-1.5 min-h-[40px] text-[10px] font-black text-amber-900 hover:bg-white", "data-wb-pool-toggle": (wb.pool || 'standard'), "aria-pressed": (wb.pool || 'standard') === 'challenge', onClick: function () { var next = (wb.pool || 'standard') === 'challenge' ? 'standard' : 'challenge'; updWb({ pool: next }); wbSay((next === 'challenge' ? __alloT('stem.rocks.wb_pool_next_challenge_sr', 'Challenge set selected for the next unknown: ') : __alloT('stem.rocks.wb_pool_next_standard_sr', 'Standard set selected for the next unknown: ')) + (next === 'challenge' ? WB_POOL_CHALLENGE.length : WB_POOL.length) + ' ' + __alloT('stem.rocks.wb_pool_candidates_sr', 'candidates.')); } }, ((wb.pool || 'standard') === 'challenge' ? '★ ' + __alloT('stem.rocks.wb_pool_on', 'Challenge set on') : '☆ ' + __alloT('stem.rocks.wb_pool_off', 'Challenge set off')) + ' · ' + __alloT('stem.rocks.wb_pool_next', 'applies to the next unknown')),
                        React.createElement("p", { className: "text-[10.5px] text-amber-900 mt-3 italic" }, __alloT('stem.rocks.wb_reasoning_prompt', 'Reasoning check: why did the most diagnostic observation separate more candidates than surface color would?')),
                        React.createElement("div", { className: "grid grid-cols-2 gap-2 mt-3" },
                          React.createElement("button", { type: "button", disabled: wbBusy || wbEvidence.length === 0, className: "rounded-lg border border-amber-300 bg-white/80 px-2 py-2 text-[10px] font-black text-amber-900 hover:bg-white disabled:opacity-50 min-h-[44px]", onClick: wbClearEvidence, "aria-label": __alloT('stem.rocks.wb_clear_aria', 'Clear observations and retest the same specimen') }, __alloT('stem.rocks.wb_clear', '↺ Clear evidence')),
                          React.createElement("button", { type: "button", disabled: wbBusy, className: "rounded-lg border border-slate-300 bg-white/80 px-2 py-2 text-[10px] font-black text-slate-800 hover:bg-white disabled:opacity-50 min-h-[44px]", onClick: function () { wbDraw(); }, "aria-label": __alloT('stem.rocks.wb_swap_aria', 'Put away this specimen and draw a different unknown from the ' + ((wb.pool || 'standard') === 'challenge' ? 'challenge' : 'standard') + ' set') }, __alloT('stem.rocks.wb_swap', '🔄 New unknown')),
                          React.createElement("button", { type: "button", disabled: wbBusy, className: "col-span-2 rounded-lg border border-amber-300 bg-white/80 px-2 py-2 text-[10px] font-black text-amber-900 hover:bg-white disabled:opacity-50 min-h-[44px]", "data-wb-copy-notebook": "true", onClick: wbCopyNotebook, "aria-label": __alloT('stem.rocks.wb_nb_copy_aria', 'Copy the field notebook as plain text for a lab report') }, '📋 ' + __alloT('stem.rocks.wb_nb_copy', 'Copy notebook for my report'))
                        )
                      )
                    )
                  ),
                  // Candidate cards get the full width. The swatch exposes habit
                  // and luster; property chips appear only after that property
                  // has been measured, so the reference table grows with inquiry.
                  wbCandidatesOpen ? React.createElement("section", { id: "wb-candidates-panel", className: "rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4", "aria-labelledby": "wb-candidates-title", "data-wb-candidate-view": wbCandidateView, "data-wb-candidates-state": "open" },
                    React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-3" },
                      React.createElement("div", null,
                        React.createElement("p", { className: "text-[10px] font-black uppercase tracking-[0.14em] text-violet-700" }, __alloT('stem.rocks.wb_compare_board', 'Evidence comparison board')),
                        React.createElement("h4", { id: "wb-candidates-title", className: "text-base font-black text-slate-900" }, '🕵️ ' + __alloT('stem.rocks.wb_suspects', 'Candidate minerals')),
                        React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5" }, __alloT('stem.rocks.wb_candidate_help', 'Compare the unknown with the candidates still supported by every observation in your notebook.'))
                      ),
                      !wb.solvedId ? React.createElement("span", { className: "rounded-full bg-white border border-slate-300 px-3 py-1.5 text-[11px] font-black text-slate-800 self-start sm:self-auto", "data-wb-count": "measurement-matches" }, wbRemaining + ' / ' + (wb.order || []).length + ' ' + __alloT('stem.rocks.wb_measurement_matches', 'measurement matches')) : null
                    ),
                    !wb.solvedId ? React.createElement("div", { className: "rounded-xl border border-slate-200 bg-white p-2.5 mb-3" },
                      React.createElement("div", { className: "grid grid-cols-3 gap-1.5", role: "group", "aria-label": __alloT('stem.rocks.wb_filter_aria', 'Choose which candidate cards to show') },
                        [
                          { id: 'shortlist', label: __alloT('stem.rocks.wb_filter_shortlist', 'Active shortlist'), count: wbShortlistCount },
                          { id: 'setaside', label: __alloT('stem.rocks.wb_filter_setaside', 'Set aside'), count: wbSetAsideCount },
                          { id: 'all', label: __alloT('stem.rocks.wb_filter_all', 'All'), count: (wb.order || []).length }
                        ].map(function (view) {
                          var active = wbCandidateView === view.id;
                          return React.createElement("button", {
                            key: view.id, type: "button", "aria-pressed": active, "data-wb-candidate-filter": view.id,
                            disabled: wbBusy || (view.id === 'setaside' && view.count === 0),
                            onClick: function () { updWb({ candidateView: view.id, reviewId: null }); wbSay(view.label + ': ' + view.count + __alloT('stem.rocks.wb_cards_shown_sr', ' candidate cards shown.')); },
                            className: "rounded-lg border px-2 py-2 min-h-[44px] text-[10px] sm:text-[11px] font-black transition-colors disabled:opacity-50 " + (active ? "bg-violet-700 border-violet-700 text-white" : "bg-slate-50 border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50")
                          }, view.label + ' · ' + view.count);
                        })
                      ),
                      React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-2 leading-relaxed" }, __alloT('stem.rocks.wb_filter_help', 'Active shortlist cards match the current observations and have not been submitted already. Set aside preserves measurement conflicts and rejected claims for review; rejection feedback is not a physical property.')),
                      wbCompatibleRejectedCount ? React.createElement("p", { className: "mt-2 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-2 text-[10px] font-bold text-amber-900 leading-relaxed", role: "status", "data-wb-compatible-rejected": wbCompatibleRejectedCount }, wbCompatibleRejectedCount + ' ' + (wbCompatibleRejectedCount === 1 ? __alloT('stem.rocks.wb_compatible_rejected_one', 'rejected claim still matches the measurements.') : __alloT('stem.rocks.wb_compatible_rejected_many', 'rejected claims still match the measurements.')) + ' ' + __alloT('stem.rocks.wb_rejection_not_evidence', 'Rejection feedback is not physical evidence—run another diagnostic test.')) : null
                    ) : null,
                    wbRemaining === 0 && !wb.solvedId ? React.createElement("aside", {
                      className: "rounded-xl border-2 border-rose-300 bg-rose-50 p-3 mb-3", role: "status", "aria-live": "polite",
                      "data-wb-impasse": wbHardnessConflict ? 'hardness-conflict' : 'no-candidate'
                    },
                      React.createElement("p", { className: "text-[11.5px] font-black text-rose-900" }, __alloT('stem.rocks.wb_impasse_title', 'No candidate fits every observation.')),
                      React.createElement("p", { className: "text-[10.5px] text-rose-900 mt-0.5 leading-relaxed" },
                        wbHardnessConflict
                          ? __alloT('stem.rocks.wb_impasse_hardness', 'Two scratch results cannot both be true, so the hardness bracket has closed on nothing. Clear the hardness trials and bracket again from a fresh reference.')
                          : __alloT('stem.rocks.wb_impasse_body', 'The specimen on the bench IS one of these minerals, so one record must not match what the bench actually showed. Look again at a single property; you do not have to start over.')),
                      React.createElement("div", { className: "flex flex-wrap gap-1.5 mt-2" },
                        wbHardnessConflict ? React.createElement("button", {
                          type: "button", "data-wb-impasse-action": "clear-hardness", disabled: wbBusy || !!wbPendingTool,
                          className: "rounded-full border border-rose-500 bg-white px-3 py-1 min-h-[44px] text-[10px] font-black text-rose-900 hover:bg-rose-100 disabled:opacity-50",
                          onClick: wbClearHardness
                        }, __alloT('stem.rocks.wb_impasse_clear_hardness', 'Clear hardness trials and retest')) : null,
                        wbEvidence.map(function (ev) {
                          return React.createElement("button", {
                            key: ev.k, type: "button", "data-wb-impasse-reexamine": ev.k, disabled: wbBusy || !!wbPendingTool,
                            className: "rounded-full border border-rose-300 bg-white px-3 py-1 min-h-[44px] text-[10px] font-black text-rose-900 hover:bg-rose-100 disabled:opacity-50",
                            onClick: function () { wbReexamine(ev.k); }
                          }, __alloT('stem.rocks.wb_impasse_look', 'Look again: ') + wbImpasseLabel(ev.k));
                        })
                      )
                    ) : null,
                    !wb.solvedId ? wbRenderComparisonDock() : null,
                    !wb.solvedId ? wbRenderSetAsideInspector() : null,
                    wb.solvedId ? React.createElement("section", { className: "rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3.5 sm:p-4 rk-wb-pop", "aria-labelledby": "wb-debrief-title", "data-wb-investigation-debrief": "complete" },
                      React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4" },
                        React.createElement("div", { className: "flex items-center gap-3 min-w-0 flex-1" },
                          React.createElement("div", { className: "shrink-0" }, rkMineralSwatch(React.createElement, wbMineral(wb.solvedId), 76)),
                          React.createElement("div", { className: "min-w-0 text-left" },
                            React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-wide text-emerald-800" }, __alloT('stem.rocks.wb_debrief_label', 'Investigation debrief')),
                            React.createElement("h5", { id: "wb-debrief-title", className: "text-lg font-black text-emerald-900", style: { overflowWrap: 'anywhere' } }, __alloT('stem.rocks.wb_solved', 'Identified: ') + (wbMineral(wb.solvedId) || {}).label),
                            React.createElement("p", { className: "text-[11px] text-emerald-800 mt-0.5" }, __alloT('stem.rocks.wb_solved_body', 'Named from ') + wbEvidenceTypeCount + __alloT('stem.rocks.wb_solved_body2', ' measured property types. Solved so far: ') + (wb.solved || 0) + '.')
                          )
                        ),
                        React.createElement("div", { className: "flex flex-col sm:flex-row gap-2 shrink-0" },
                          wbDebriefRival ? React.createElement("button", { className: "w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-emerald-700 bg-white hover:bg-emerald-100 text-emerald-900 font-black min-h-[44px]", onClick: function () { wbDraw(wbDebriefRival.id); }, "data-wb-next-lookalike": wbDebriefRival.id, "aria-label": __alloT('stem.rocks.wb_next_lookalike_aria', 'Next: its closest look-alike, ') + wbDebriefRival.label }, '🕵️ ' + __alloT('stem.rocks.wb_next_lookalike', 'Try its look-alike: ') + wbDebriefRival.label) : null,
                          React.createElement("button", { className: "w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black min-h-[44px]", onClick: function () { wbDraw(); }, "data-wb-next-specimen": "true" }, __alloT('stem.rocks.wb_next', '🔄 Next specimen'))
                        )
                      ),
                      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 text-left" },
                        React.createElement("div", { className: "rounded-xl border border-emerald-200 bg-white/80 p-2.5" },
                          React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-emerald-800" }, __alloT('stem.rocks.wb_debrief_strongest', 'Strongest discriminator')),
                          React.createElement("p", { className: "text-[10.5px] font-bold text-emerald-900 mt-0.5" }, wbTopEvidence ? wbEvidenceKind(wbTopEvidence.ev.k) + (wbTopEvidence.impact > 0 ? __alloT('stem.rocks.wb_debrief_ruled_out', ' ruled out ') + wbTopEvidence.impact + __alloT('stem.rocks.wb_debrief_candidates', ' starting candidates.') : __alloT('stem.rocks.wb_debrief_converged', ' supported the converging evidence.')) : __alloT('stem.rocks.wb_debrief_reviewed', 'The observations were reviewed together.'))
                        ),
                        React.createElement("div", { className: "rounded-xl border border-emerald-200 bg-white/80 p-2.5" },
                          React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-emerald-800" }, __alloT('stem.rocks.wb_debrief_notebook', 'Notebook summary')),
                          React.createElement("p", { className: "text-[10.5px] font-bold text-emerald-900 mt-0.5" }, wbEvidence.length + __alloT('stem.rocks.wb_debrief_observations', ' observations across ') + wbEvidenceTypeCount + __alloT('stem.rocks.wb_debrief_types', ' property types.') + __alloT('stem.rocks.wb_debrief_chosen_prefix', ' Chosen for the claim: ') + wbClaimEvidence.length + '; ' + wbClaimReasoningLabel + '.')
                        ),
                        React.createElement("div", { className: "rounded-xl border border-amber-300 bg-amber-50 p-2.5", "data-wb-confidence-calibration": wbClaimConfidence || 'not-recorded' },
                          React.createElement("p", { className: "text-[10px] font-black uppercase tracking-wide text-amber-800" }, __alloT('stem.rocks.wb_debrief_confidence', 'Confidence calibration')),
                          React.createElement("p", { className: "text-[10.5px] font-bold text-amber-900 mt-0.5" }, wbConfidenceLabel + '. ' + __alloT('stem.rocks.wb_debrief_evidence_level', 'Evidence level: ') + wbClaimSupport.label + '.')
                        )
                      ),
                      wbRenderReasoningTrail(),
                      wbRenderEfficiency(),
                      wbRenderMatchMap(wbMineral(wb.solvedId), 'debrief'),
                      React.createElement("aside", { className: "mt-2.5 rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-left" },
                        React.createElement("p", { className: "text-[10.5px] font-black text-amber-900" }, __alloT('stem.rocks.wb_debrief_guard_title', 'Field scientist reminder')),
                        React.createElement("p", { className: "text-[10px] text-amber-900 mt-0.5 leading-relaxed" }, __alloT('stem.rocks.wb_debrief_guard', 'Surface color alone is not enough. A reliable mineral identification combines several matching physical properties.'))
                      )
                    ) : React.createElement(React.Fragment, null,
                      wbInvalidatedSelected ? React.createElement("aside", { className: "rounded-xl border border-amber-400 bg-amber-50 p-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3", role: "status", "aria-live": "polite", "data-wb-revision": "measurement-conflict", "data-wb-invalidated-candidate": wbInvalidatedSelected.id },
                        React.createElement("span", { className: "w-9 h-9 rounded-xl bg-white border border-amber-300 flex items-center justify-center shrink-0", "aria-hidden": "true" }, '↳'),
                        React.createElement("div", { className: "min-w-0 flex-1" },
                          React.createElement("p", { className: "text-[11.5px] font-black text-amber-900" }, __alloT('stem.rocks.wb_conflict_revision_title', 'New evidence changed your working claim.')),
                          React.createElement("p", { className: "text-[10.5px] text-amber-900 mt-0.5 leading-relaxed" }, wbInvalidatedSelected.label + __alloT('stem.rocks.wb_conflict_revision_mid', ' no longer fits the ') + (wbInvalidatedKind || __alloT('stem.rocks.wb_new_evidence', 'new evidence')) + __alloT('stem.rocks.wb_conflict_revision_end', ' observation. Your notebook is preserved—review what changed, then choose a supported candidate.'))
                        ),
                        React.createElement("button", { type: "button", className: "w-full sm:w-auto min-h-[44px] rounded-lg border border-amber-500 bg-white px-3 py-2 text-[10.5px] font-black text-amber-900 hover:bg-amber-100 shrink-0", "data-wb-review-conflict": wbInvalidatedSelected.id, onClick: function () { var invalidatedId = wbInvalidatedSelected.id; wbUpdateAndFocus({ selectedId: null, reviewId: invalidatedId, candidateView: 'setaside', claimEvidence: [], claimReasoning: null, claimConfidence: null }, '[data-wb-review-close="' + invalidatedId + '"]'); wbSay(__alloT('stem.rocks.wb_conflict_reviewing_sr', 'Reviewing the new evidence conflict for ') + wbInvalidatedSelected.label + '. ' + __alloT('stem.rocks.wb_claim_changed_sr', 'Recheck the evidence, reasoning, and confidence before making a revised claim.')); } }, __alloT('stem.rocks.wb_review_conflict_action', 'Review conflict'))
                      ) : wbLastRejected ? React.createElement("aside", { className: "rounded-xl border border-rose-300 bg-rose-50 p-3 mb-3 flex gap-3 items-start", role: "status", "aria-live": "polite", "data-wb-revision": "needed" },
                        React.createElement("span", { className: "w-9 h-9 rounded-xl bg-white border border-rose-200 flex items-center justify-center shrink-0", "aria-hidden": "true" }, '↺'),
                        React.createElement("div", { className: "min-w-0" },
                          React.createElement("p", { className: "text-[11px] font-black text-rose-900" }, __alloT('stem.rocks.wb_revise_title', 'Revise the claim—do not restart.')),
                          React.createElement("p", { className: "text-[10.5px] text-rose-800 mt-0.5 leading-relaxed" }, wbLastRejected.label + __alloT('stem.rocks.wb_revise_body', ' shared the evidence you had, but it was not this specimen. Use ') + wbNext.title.toLowerCase() + __alloT('stem.rocks.wb_revise_body2', ' to distinguish the remaining possibilities.'))
                        )
                      ) : null,
                      React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5" },
                      (wb.order || []).map(function (id) {
                        var m = wbMineral(id); if (!m) return null;
                        var out = !wbFits(m);
                        var wrong = (wb.guessedWrong || []).indexOf(id) !== -1;
                        if (!wbCandidateVisible(out, wrong)) return null;
                        var selected = !!wbSelected && wbSelected.id === id;
                        var reviewing = !!wbReviewCandidate && wbReviewCandidate.id === id;
                        var mismatch = wbMismatchKind(m);
                        var facts = [];
                        if (wb.lens) facts.push({ k: 'l', text: __alloT('stem.rocks.wb_fact_luster', 'Luster: ') + m.luster });
                        if (wb.formObs) facts.push({ k: 'f', text: __alloT('stem.rocks.wb_fact_form', 'Form: ') + rkFormClassInfo(rkFormClass(m)).label });
                        if (wb.streakObs) facts.push({ k: 's', text: __alloT('stem.rocks.wb_fact_streak', 'Streak: ') + wbStreakOutcomeFor(m).label });
                        if (wbHasHardnessEvidence) facts.push({ k: 'h', text: __alloT('stem.rocks.wb_fact_mohs', 'Mohs: ') + m.hardness });
                        if (wb.fizz) facts.push({ k: 'a', text: WB_CARBONATES.indexOf(m.id) !== -1 ? __alloT('stem.rocks.wb_fact_fizz', 'Acid: fizzes') : __alloT('stem.rocks.wb_fact_nofizz', 'Acid: no fizz') });
                        if (wb.magnet) facts.push({ k: 'm', text: WB_MAGNETIC.indexOf(m.id) !== -1 ? __alloT('stem.rocks.wb_fact_pull', 'Magnet: pull') : __alloT('stem.rocks.wb_fact_nopull', 'Magnet: none') });
                        if (wb.densityObs && m.density) facts.push({ k: 'd', text: __alloT('stem.rocks.wb_fact_density', 'Density: ') + m.density.toFixed(2) });
                        return React.createElement("button", {
                          key: id, type: "button", "aria-disabled": wbBusy ? true : undefined, "aria-pressed": (out || wrong) ? undefined : selected, "aria-expanded": (out || wrong) ? reviewing : undefined, "aria-controls": reviewing ? "wb-setaside-inspector" : undefined, "data-wb-candidate": id, "data-wb-candidate-state": out ? 'eliminated' : (wrong ? 'rejected' : (selected ? 'selected' : 'viable')), "data-wb-reviewing": reviewing ? 'true' : 'false',
                          className: "rounded-xl border min-w-0 min-h-[94px] p-2.5 text-left transition-all flex gap-2.5 items-start overflow-hidden " + (wbBusy ? "cursor-wait opacity-65 transform-none " : "") + (out ? (reviewing ? "bg-slate-50 border-slate-600 text-slate-900 ring-2 ring-slate-300 shadow-md" : "bg-slate-100 border-slate-300 text-slate-700 hover:border-slate-500 hover:bg-slate-50") : wrong ? (reviewing ? "bg-rose-50 border-rose-600 text-rose-900 ring-2 ring-rose-200 shadow-md" : "bg-rose-50 border-rose-300 text-rose-900 hover:border-rose-500") : selected ? "bg-violet-50 border-violet-500 text-violet-900 ring-2 ring-violet-200 shadow-md" : "bg-white border-slate-300 text-slate-900 hover:border-violet-500 hover:-translate-y-0.5 hover:shadow-md"),
                          "aria-label": (out ? __alloT('stem.rocks.wb_out_aria', 'Review why this candidate was set aside: ') : wrong ? __alloT('stem.rocks.wb_rejected_aria', 'Review unresolved evidence for the rejected claim: ') : selected ? __alloT('stem.rocks.wb_selected_aria', 'Selected for your claim: ') : __alloT('stem.rocks.wb_select_aria', 'Select as a possible claim: ')) + m.label + (mismatch ? '. ' + __alloT('stem.rocks.wb_mismatch_aria', 'Does not match the ') + mismatch + __alloT('stem.rocks.wb_mismatch_aria_end', ' observation.') : ''),
                          onClick: function () {
                            if (wbBusy) return;
                            if (out || wrong) {
                              wbUpdateAndFocus({ reviewId: id }, '[data-wb-review-close="' + id + '"]');
                              wbSay(__alloT('stem.rocks.wb_reviewing_sr', 'Reviewing the measured evidence for ') + m.label + '.');
                              return;
                            }
                            var changedClaim = wb.selectedId !== id && (!!wb.selectedId || !!wb.claimReasoning || !!wb.claimConfidence || (wb.claimEvidence || []).length > 0);
                            var selectionPatch = { selectedId: id, lastRejectedId: null, reviewId: null, toolsExpanded: false };
                            if (wb.selectedId !== id) Object.assign(selectionPatch, { claimEvidence: [], claimReasoning: null, claimConfidence: null });
                            updWb(selectionPatch);
                            wbSay(__alloT('stem.rocks.wb_selected_sr', 'Selected ') + m.label + __alloT('stem.rocks.wb_selected_sr2', ' as a possible claim. Review the claim builder before submitting.') + (changedClaim ? ' ' + __alloT('stem.rocks.wb_claim_changed_sr', 'Recheck the evidence, reasoning, and confidence before making a revised claim.') : ''));
                          }
                        },
                          React.createElement("span", { className: "shrink-0 relative flex flex-col items-center gap-1" },
                            rkMineralSwatch(React.createElement, m, 50),
                            // Once luster has been recorded, show how THIS reference looks
                            // under the same lens so the unknown's porthole can be compared
                            // card by card rather than against a word.
                            wb.lens ? React.createElement("span", { className: "rounded-md bg-slate-900 p-0.5", "data-wb-candidate-porthole": m.id }, rkLensViewSvg(React.createElement, m, 34, { aria: m.label + __alloT('stem.rocks.wb_candidate_porthole_aria', ' under the lens: ') + rkLusterClassInfo(rkLusterClass(m)).sr })) : null,
                            (out || wrong || selected) ? React.createElement("span", { className: "absolute -right-1 -bottom-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-black " + (wrong ? "bg-rose-600" : selected ? "bg-violet-700" : "bg-slate-600"), "aria-hidden": "true" }, selected ? '✓' : '×') : null
                          ),
                          React.createElement("span", { className: "min-w-0 flex-1" },
                            React.createElement("span", { className: "block text-[12px] font-black leading-tight", style: { overflowWrap: 'anywhere' } }, m.label),
                            out ? React.createElement("span", { className: "block text-[10.5px] font-black text-slate-700 mt-1" }, reviewing ? __alloT('stem.rocks.wb_reviewing_card', 'Reviewing all measured evidence') : __alloT('stem.rocks.wb_eliminated_by', 'Review why set aside · ') + mismatch) : wrong ? React.createElement("span", { className: "block text-[10.5px] font-black text-rose-800 mt-1" }, reviewing ? __alloT('stem.rocks.wb_reviewing_unresolved_card', 'Reviewing unresolved evidence') : __alloT('stem.rocks.wb_claim_rejected', 'Review rejected claim evidence')) : selected ? React.createElement("span", { className: "block text-[10.5px] font-black text-violet-800 mt-1" }, __alloT('stem.rocks.wb_selected', 'Selected for claim')) : React.createElement("span", { className: "block text-[10.5px] font-black text-emerald-800 mt-1" }, __alloT('stem.rocks.wb_still_possible', 'Still supported')),
                            facts.length ? React.createElement("span", { className: "flex flex-wrap gap-1 mt-1.5" }, facts.slice(0, 3).map(function (fact) { return React.createElement("span", { key: fact.k, className: "rounded bg-white/80 border border-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 leading-tight" }, fact.text); })) : React.createElement("span", { className: "block text-[10.5px] text-slate-600 mt-1" }, __alloT('stem.rocks.wb_no_measured_facts', 'Run a test to compare properties'))
                          )
                        );
                      })
                      ),
                      wbRenderLookalikeFaceoff(),
                      React.createElement("section", { className: "mt-3 rounded-2xl border-2 p-3 sm:p-4 " + (wbSelected ? "border-violet-300 bg-violet-50" : "border-dashed border-slate-300 bg-white"), "aria-labelledby": "wb-claim-builder-title", "data-wb-claim-ready": wbCerReady ? 'true' : 'false', "data-wb-measurement-ready": wbClaimReady ? 'true' : 'false', "data-wb-provisional-hardness": wbHardnessProvisional ? 'true' : 'false', "data-wb-claim-strength": wbClaimSupport.id },
                        React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-3" },
                          React.createElement("div", { className: "min-w-0" },
                            React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-violet-700" }, __alloT('stem.rocks.wb_cer_label', 'Claim · Evidence · Reasoning')),
                            React.createElement("h5", { id: "wb-claim-builder-title", className: "text-[13px] font-black text-slate-900 mt-0.5", style: { overflowWrap: 'anywhere' } }, wbSelected ? __alloT('stem.rocks.wb_my_claim', 'My claim: the unknown is ') + wbSelected.label : __alloT('stem.rocks.wb_choose_claim', 'Choose one supported candidate to build your claim.')),
                            wbSelected ? React.createElement("p", { className: "text-[11px] text-slate-700 mt-1 leading-relaxed" }, __alloT('stem.rocks.wb_cer_active_help', 'Build the claim yourself: choose evidence, connect it with scientific reasoning, then record how confident you feel.')) : React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-1" }, wbCandidateView === 'setaside' ? __alloT('stem.rocks.wb_setaside_help', 'These cards are here for review. Switch to Active shortlist to select a supported claim.') : __alloT('stem.rocks.wb_choose_help', 'Selecting a card does not submit it. You will review the evidence here first.'))
                          ),
                          React.createElement("div", { className: "sm:text-right shrink-0" },
                            React.createElement("p", { className: "text-[10.5px] font-black mb-1.5 " + (wbCerReady && wbClaimSupport.id === 'strong' ? "text-emerald-800" : wbCerReady && wbClaimSupport.id === 'good' ? "text-violet-800" : "text-amber-800") }, wbCerStatusText),
                            React.createElement("button", { type: "button", disabled: wbBusy || !wbSelected || !wbCerReady, onClick: wbSubmitClaim, className: "rounded-xl px-4 py-2.5 min-h-[44px] font-black text-[11.5px] transition-all " + (wbSelected && wbCerReady && !wbBusy ? "bg-violet-700 text-white hover:bg-violet-800 shadow-sm" : "bg-slate-200 text-slate-600 cursor-not-allowed"), "aria-describedby": "wb-claim-readiness" }, __alloT('stem.rocks.wb_submit_claim', 'Submit evidence-based claim'))
                          )
                        ),
                        wbRenderCerBuilder(),
                        wbSelected ? wbRenderMatchMap(wbSelected, 'claim') : null,
                        React.createElement("p", { id: "wb-claim-readiness", className: "sr-only" }, wbCerStatusText + '. ' + wbClaimSupport.detail)
                      )
                    ),
                    !wb.solvedId ? React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-3" }, __alloT('stem.rocks.wb_hint', 'Use Active shortlist for a focused decision. Set aside preserves eliminated and rejected cards with the property that conflicted, so evidence is never hidden from review.')) : null
                  ) : React.createElement("section", { className: "rounded-xl border border-slate-200 bg-slate-50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3", "aria-labelledby": "wb-candidates-preview-title", "data-wb-candidates-state": "quiet" },
                    React.createElement("div", { className: "min-w-0" },
                      React.createElement("p", { className: "text-[10.5px] font-black uppercase tracking-[0.12em] text-slate-600" }, __alloT('stem.rocks.wb_compare_later', 'Compare comes next')),
                      React.createElement("h4", { id: "wb-candidates-preview-title", className: "text-[12px] font-black text-slate-900 mt-0.5" }, __alloT('stem.rocks.wb_candidates_waiting', 'Candidate references are waiting for your first observation.')),
                      React.createElement("p", { className: "text-[10.5px] text-slate-600 mt-0.5" }, __alloT('stem.rocks.wb_candidates_waiting_help', 'Collect one property first, or preview the full reference set whenever you need it.'))
                    ),
                    React.createElement("button", { type: "button", className: "w-full sm:w-auto min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 py-2 text-[10.5px] font-black text-slate-800 hover:border-violet-400 hover:bg-violet-50", onClick: function () { wbUpdateAndFocus({ candidatesExpanded: true }, '[data-wb-candidate-filter="' + wbCandidateView + '"]'); }, "aria-expanded": false, "aria-controls": "wb-candidates-panel", "data-wb-preview-candidates": "true" }, __alloT('stem.rocks.wb_preview_candidates', 'Preview candidates'))
                  )
                )
              );
            })(),

            // ── Quiz mode ──

            quizQ && React.createElement("div", {
              className: "mt-3 bg-amber-50 rounded-xl border-2 border-amber-200 p-4 animate-in fade-in outline-none focus:ring-2 focus:ring-amber-600",
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
                React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "🧠 " + __alloT('stem.rocks.question_label', "Question ") + ((d.quizIdx || 0) + 1) + "/" + QUIZ_BANK.length),
                React.createElement("span", { className: "font-bold text-green-800 text-xs" }, "✔ " + (d.quizScore || 0))
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
                React.createElement("div", { className: "p-3 rounded-lg text-sm " + (d.quizFeedback.correct ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200") },
                  React.createElement("p", { className: "font-black" }, d.quizFeedback.msg),
                  React.createElement("p", { className: "text-xs mt-1 leading-relaxed text-slate-700" }, d.quizFeedback.explanation)
                ),
                quizQ.concept && ROCKS_VOCAB[quizQ.concept] && (function() {
                  var concept = quizQ.concept;
                  var definition = rkVocabDef(__alloT, concept);
                  var studied = (d.vocabLookedUp || []).indexOf(concept) !== -1;
                  return React.createElement("div", { className: "p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in" },
                    React.createElement("div", { className: "flex-1" },
                      React.createElement("p", { className: "text-xs font-bold text-amber-800" }, "🔍 " + __alloT('stem.rocks.concept_focus_label', "Concept Focus: ") + rkVocabTerm(__alloT, concept)),
                      React.createElement("p", { className: "text-[11px] text-slate-600 mt-0.5 leading-relaxed" }, definition)
                    ),
                    !studied && React.createElement("button", {
                      onClick: function() {
                        var list = d.vocabLookedUp || [];
                        var newList = list.concat([concept]);
                        updMulti({ vocabLookedUp: newList });
                        sfxRockClick();
                        if (typeof awardStemXP === 'function') awardStemXP(5, 'Concept studied: ' + concept);
                        if (typeof addToast === 'function') addToast('📖 Concept studied: ' + concept + ' (+5 RP)', 'success');
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
              // Extracted from an inline [state] index so the trial log below can
              // look up any state's label and colour, not just the current one.
              var SM_ALL = {
                chemDom: { label: '\ud83e\uddea ' + __alloT('stem.rocks.weath_chem_label', 'Chemical-dominated'), color: '#6d28d9', bg: '#f5f3ff', border: '#c4b5fd', desc: __alloT('stem.rocks.weath_chem_desc', 'Acidic rain dissolves minerals. Karst landscapes form.') },
                physDom: { label: '\ud83d\udd28 ' + __alloT('stem.rocks.weath_phys_label', 'Physical-dominated'), color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', desc: __alloT('stem.rocks.weath_phys_desc', 'Freeze-thaw cycles fracture rock mechanically.') },
                mixed:   { label: '\u2696\ufe0f ' + __alloT('stem.rocks.weath_mixed_label', 'Mixed weathering'), color: '#0e7490', bg: '#ecfeff', border: '#67e8f9', desc: __alloT('stem.rocks.weath_mixed_desc', 'Both processes active. Typical temperate climate.') },
                minimal: { label: '\ud83d\udfe2 ' + __alloT('stem.rocks.weath_minimal_label', 'Minimal weathering'), color: '#047857', bg: '#ecfdf5', border: '#86efac', desc: __alloT('stem.rocks.weath_minimal_desc', 'Stable conditions. Rock surfaces persist.') }
              };
              var sm = SM_ALL[state];
              return h('div', { className: 'p-4 rounded-xl bg-white border border-amber-300 space-y-3' },
                h('h3', { className: 'text-sm font-black text-amber-800' }, '\u26cf\ufe0f ' + __alloT('stem.rocks.rock_weathering_discovery', 'Rock weathering discovery')),
                h('p', { className: 'text-[12px] text-slate-700 leading-relaxed' }, __alloT('stem.rocks.weathering_intro', 'Adjust temperature swings, rainfall, and rain pH. Widget classifies dominant weathering mode into 4 discrete categories. No score, no reveal.')),
                // Draw the outcrop. A weathering simulator that never showed
                // weathering was asking students to picture the whole thing.
                // The frame belongs around the artwork, not around a 420px
                // drawing floating in a full-width box with white on both sides.
                h('div', { className: 'rounded-lg overflow-hidden border-2', style: { borderColor: sm.border, maxWidth: '420px', margin: '0 auto' } },
                  rkWeatheringSvg(h, state, __alloT)
                ),
                h('div', { className: 'p-3 rounded-lg text-center', style: { background: sm.bg, border: '2px solid ' + sm.border } },
                  h('div', { className: 'text-base font-black', style: { color: sm.color } }, sm.label),
                  h('div', { className: 'text-[11px] text-slate-700 mt-1' }, sm.desc)
                ),
                h('div', { className: 'grid grid-cols-3 gap-3' },
                  [{ k: 'tempSwing', l: __alloT('stem.rocks.weath_temp_swing', 'Temp swing (\u00b0C)'), mn: 0, mx: 50, st: 1 },
                   { k: 'rainfall', l: __alloT('stem.rocks.weath_rainfall', 'Rainfall (mm/yr)'), mn: 0, mx: 500, st: 10 },
                   { k: 'pH', l: __alloT('stem.rocks.weath_rain_ph', 'Rain pH'), mn: 0, mx: 14, st: 0.1 }].map(function(s) {
                    return h('div', { key: s.k },
                      h('label', { htmlFor: 'wh-' + s.k, className: 'block text-[11px] font-bold text-slate-700' }, s.l + ': ', h('span', { className: 'font-mono text-amber-800' }, iq[s.k])),
                      h('input', { id: 'wh-' + s.k, type: 'range', min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                        onChange: function(e) { var p = {}; p[s.k] = parseFloat(e.target.value); setIQ(p); },
                        className: 'w-full', 'aria-label': s.l }));
                  })
                ),
                h('div', { className: 'flex gap-2 items-center flex-wrap' },
                  h('button', { onClick: function() { setIQ({ log: (iq.log || []).concat([{ t: iq.tempSwing, r: iq.rainfall, p: iq.pH, st: state }]).slice(-8) }); }, className: 'px-2 py-1 rounded bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-300' }, '\ud83d\udccb ' + __alloT('stem.rocks.weath_log', 'Log')),
                  h('button', { onClick: function() { setIQ({ tempSwing: 20, rainfall: 200, pH: 7, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' }); }, className: 'px-2 py-1 rounded bg-white text-[11px] font-semibold text-slate-600 border border-slate-300' }, '\u21ba ' + __alloT('stem.rocks.weath_reset', 'Reset'))
                ),
                // The Log button has always written iq.log — and nothing has ever
                // rendered it. Clicking it stored a trial and showed the student
                // nothing, so the affordance read as broken. Comparing trials IS
                // the inquiry skill this widget is for, so the record is now
                // visible: conditions on the left, the state they produced on the
                // right. No score and no ranking — it is a notebook, not a
                // leaderboard, per the widget's design note.
                (iq.log || []).length > 0 && h('div', { className: 'rounded-lg border border-slate-300 bg-slate-50 p-2' },
                  h('div', { className: 'flex items-center justify-between mb-1.5' },
                    // The log keeps the last 8 (see the Log button's slice). Say so
                    // when it is full, rather than silently dropping the oldest
                    // trial out from under a student who is comparing runs.
                    h('span', { className: 'text-[11px] font-black text-slate-700' },
                      '📋 ' + __alloT('stem.rocks.weath_log_title', 'Logged trials') + ' (' + iq.log.length + ')' +
                      (iq.log.length >= 8 ? ' · ' + __alloT('stem.rocks.weath_log_capped', 'showing the last 8') : '')),
                    h('button', {
                      type: 'button',
                      onClick: function() { setIQ({ log: [] }); },
                      className: 'text-[10px] font-bold text-slate-700 underline hover:text-slate-900'
                    }, __alloT('stem.rocks.weath_log_clear', 'Clear'))
                  ),
                  h('ul', { className: 'space-y-1' }, iq.log.map(function(entry, li) {
                    var em = SM_ALL[entry.st] || SM_ALL.minimal;
                    return h('li', { key: li, className: 'flex items-center gap-2 text-[11px]' },
                      h('span', { className: 'font-mono text-slate-700 shrink-0' },
                        (__alloT('stem.rocks.weath_log_temp', 'ΔT') + ' ' + entry.t + '°  ' +
                         __alloT('stem.rocks.weath_log_rain', 'rain') + ' ' + entry.r + '  ' +
                         __alloT('stem.rocks.weath_log_ph', 'pH') + ' ' + entry.p)),
                      h('span', {
                        className: 'ml-auto px-1.5 py-0.5 rounded font-bold shrink-0',
                        style: { background: em.bg, color: em.color, border: '1px solid ' + em.border }
                      }, em.label)
                    );
                  }))
                ),
                h('textarea', { value: iq.hypothesis || '', onChange: function(e) { setIQ({ hypothesis: e.target.value }); }, 'aria-label': __alloT('stem.rocks.hypothesis_input', 'Weathering climate hypothesis'), placeholder: __alloT('stem.rocks.weath_hypothesis_placeholder', 'Hypothesis: What climate produces chemical vs physical dominance?'),
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
                  iq.understood && h('textarea', { value: iq.explanation || '', onChange: function(e) { setIQ({ explanation: e.target.value }); }, 'aria-label': __alloT('stem.rocks.explanation_input', 'Weathering climate explanation'), placeholder: __alloT('stem.rocks.weath_explanation_placeholder', 'Explain how climate selects which weathering mode dominates.'),
                    className: 'w-full text-[12px] border border-emerald-300 rounded p-2 font-mono leading-snug mt-2', rows: 4 })),
                h('div', { className: 'text-[10px] italic text-slate-600' }, __alloT('stem.rocks.weath_design_note', 'Design note: discrete 4-state weathering marker; no rate score; no reveal \u2014 by design.'))
              );
            })(),


            // Bottom controls

            React.createElement("div", { className: "flex gap-3 mt-3 items-center" },

              React.createElement("button", { "aria-label": __alloT('stem.rocks.snapshot', "Snapshot"),

                onClick: function () {

                  setToolSnapshots(function (prev) { return prev.concat([{ id: 'rk-' + Date.now(), tool: 'rocks', label: t('stem.rocks.rocks') + (selRock ? ': ' + selRock.label : selMineral ? ': ' + selMineral.label : ''), data: Object.assign({}, d), timestamp: Date.now() }]); });

                  addToast('\uD83D\uDCF8 Snapshot saved!', 'success');

                }, className: "ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-amber-700 to-orange-700 rounded-full hover:from-amber-700 hover:to-orange-700 shadow-md hover:shadow-lg transition-all"

              }, "\uD83D\uDCF8 " + __alloT('stem.rocks.snapshot', "Snapshot"))

            )

          )
      })();
    }
  });

  // ═══ 🔬 rockCycle (rockCycle) ═══
  // ── Rock Cycle data + renderers (hoisted to module scope) ─────────────
  // These were declared INSIDE the rockCycle render function, which rebuilt
  // every table and both SVG renderers on each render, put them out of reach
  // of testHooks, and made them impossible to share with the sibling `rocks`
  // tool that holds richer versions of the same specimens.
  //
  // The families/processes tables previously baked t() into a `label` at
  // declaration time, which is why they could not live out here. They now
  // carry `labelKey` and the render localizes them, so the data is pure.
  //
  // NOTE the old name for the families table was ROCKS - the SAME identifier
  // the sibling tool uses for its 20 specimens. Two different datasets under
  // one name in one file; renamed RC_FAMILIES.
  var RC_FAMILIES = [

    {

      id: 'igneous', labelKey: 'stem.rocks.igneous', emoji: '\uD83C\uDF0B', color: '#ef4444', glow: '#fca5a5', ink: '#b91c1c',

      desc: 'Formed when magma or lava cools and solidifies. Intrusive igneous rocks (granite) cool slowly underground with large crystals. Extrusive rocks (basalt) cool quickly at the surface with fine grains.',

      examples: 'Granite, Basalt, Obsidian, Pumice, Rhyolite, Gabbro',

      hardness: '6-7 (Mohs)', crystals: 'Visible in intrusive; microscopic in extrusive',

      uses: 'Countertops (granite), road gravel (basalt), surgical blades (obsidian)',

      funFact: 'Obsidian fractures so cleanly it was used for Stone Age scalpels, sharper than modern steel!'

    },

    {

      id: 'sedimentary', labelKey: 'stem.rocks.sedimentary', emoji: '\uD83C\uDFD6\uFE0F', color: '#eab308', glow: '#fde68a', ink: '#92400e',

      desc: 'Formed from layers of sediment (sand, mud, shells, organic matter) compressed and cemented over millions of years. The only rock type that commonly contains fossils, making it essential for paleontology.',

      examples: 'Sandstone, Limestone, Shale, Chalk, Conglomerate, Coal',

      hardness: '3-6 (Mohs)', crystals: 'Layered grain structure, not crystalline',

      uses: 'Building stone (sandstone), cement (limestone), energy (coal)',

      funFact: 'The White Cliffs of Dover are chalk, made from trillions of microscopic coccolithophore shells!'

    },

    {

      id: 'metamorphic', labelKey: 'stem.rocks.metamorphic', emoji: '\uD83D\uDC8E', color: '#8b5cf6', glow: '#c4b5fd', ink: '#6d28d9',

      desc: 'Formed when existing rocks are transformed by extreme heat and/or pressure deep underground. The minerals recrystallize without melting, creating new textures and sometimes foliation (layered banding).',

      examples: 'Marble, Slate, Quartzite, Gneiss, Schist, Phyllite',

      hardness: '6-8 (Mohs)', crystals: 'Recrystallized; often banded (foliated)',

      uses: 'Sculpture (marble), roofing (slate), decorative stone (gneiss)',

      funFact: 'Michelangelo\'s David is carved from Carrara marble, metamorphosed limestone from Tuscany!'

    },

  ];

  var RC_PROCESSES = [

    { from: 'igneous', to: 'sedimentary', labelKey: 'stem.rock_cycle.weathering_erosion', emoji: '\uD83C\uDF2C\uFE0F', desc: 'Wind, water, ice, and biological activity break igneous rocks into sediments. Rivers carry fragments to basins where they settle in layers.' },

    { from: 'sedimentary', to: 'metamorphic', labelKey: 'stem.rock_cycle.heat_pressure', emoji: '\uD83D\uDD25', desc: 'Deep burial subjects sedimentary rock to intense heat (200-800°C) and pressure, transforming its mineral structure without melting.' },

    { from: 'metamorphic', to: 'igneous', labelKey: 'stem.rock_cycle.melting_cooling', emoji: '\uD83C\uDF0B', desc: 'Extreme heat (>800\u00B0C) melts metamorphic rock into magma. When it cools (slowly underground or quickly at the surface), new igneous rock forms.' },

    { from: 'igneous', to: 'metamorphic', labelKey: 'stem.rock_cycle.heat_pressure', emoji: '\u2B07\uFE0F', desc: 'Igneous rock can be buried deep and subjected to extreme conditions, directly transforming into metamorphic rock.' },

    { from: 'sedimentary', to: 'igneous', labelKey: 'stem.rock_cycle.melting_cooling', emoji: '\uD83C\uDF0B', desc: 'Under extreme heat, sedimentary rock can melt into magma and re-solidify as igneous rock.' },

    { from: 'metamorphic', to: 'sedimentary', labelKey: 'stem.rock_cycle.weathering_erosion', emoji: '\uD83C\uDF2C\uFE0F', desc: 'Metamorphic rocks exposed at the surface weather and erode into sediments over time.' },

  ];

  var RC_SPECIMENS = [
    { id: 'granite',   label: 'Granite',   family: 'igneous',     texture: 'crystalline', note: 'Coarse interlocking quartz, feldspar and mica crystals.' },
    { id: 'basalt',    label: 'Basalt',    family: 'igneous',     texture: 'finegrained', note: 'Dark, fine-grained; often pitted with gas vesicles.' },
    { id: 'sandstone', label: 'Sandstone', family: 'sedimentary', texture: 'clastic',     note: 'Cemented quartz sand grains with visible bedding.' },
    { id: 'limestone', label: 'Limestone', family: 'sedimentary', texture: 'bioclastic',  note: 'Calcite (CaCO₃); often fossil-rich; fizzes in acid.' },
    { id: 'shale',     label: 'Shale',     family: 'sedimentary', texture: 'finelayered', note: 'Compacted clay; splits into thin sheets.' },
    { id: 'slate',     label: 'Slate',     family: 'metamorphic', texture: 'foliated',    note: 'Low-grade; flat cleavage planes, dull sheen.' },
    { id: 'marble',    label: 'Marble',    family: 'metamorphic', texture: 'nonfoliated', note: 'Recrystallized calcite; sugary, unlayered.' },
    { id: 'gneiss',    label: 'Gneiss',    family: 'metamorphic', texture: 'banded',      note: 'High-grade; alternating light and dark mineral bands.' }
  ];

  var RC_AGENTS = [
    { id: 'melting_cooling',    short: 'Melt & Cool',      icon: '🌋', produces: 'igneous',     verb: 'Melting and crystallization' },
    { id: 'heat_pressure',      short: 'Heat & Press',     icon: '🔥', produces: 'metamorphic', verb: 'Metamorphism' },
    { id: 'weathering_erosion', short: 'Weather & Erode',  icon: '🌧️', produces: 'sedimentary', verb: 'Weathering, transport and lithification' }
  ];

  var RC_TRANSFORMS = {
    granite: {
      melting_cooling:    { product: 'Granite or Rhyolite', family: 'igneous', texture: 'crystalline', process: 'Partial melting, then crystallization', conditions: '650–750 °C (water-bearing), 15–30 km deep', time: '10,000s–millions of years', change: 'Quartz and feldspar melt into a sticky, silica-rich (felsic) magma. Cooling slowly at depth regrows large crystals — granite. Erupted and chilled, the same melt becomes fine-grained rhyolite.', evidence: 'Crystal size tells you the cooling rate: coarse = slow and deep, fine = fast and erupted.', stages: ['Heating toward the solidus', 'First melt on crystal edges', 'Felsic magma body forms', 'Crystals nucleate and grow'] },
      heat_pressure:      { product: 'Gneiss', family: 'metamorphic', texture: 'banded', process: 'High-grade regional metamorphism', conditions: '600–700 °C, 20–30 km deep', time: 'Millions of years', change: 'Minerals recrystallize and segregate into alternating light (quartz/feldspar) and dark (biotite/amphibole) bands. Nothing melts — the rock stays solid throughout.', evidence: 'Look for gneissic banding: stripes that swirl around, not flat sedimentary layers.', stages: ['Burial and heating', 'Minerals begin to align', 'Light/dark segregation', 'Gneissic banding locked in'] },
      weathering_erosion: { product: 'Sandstone and Shale', family: 'sedimentary', texture: 'clastic', process: 'Hydrolysis, transport, lithification', conditions: 'Surface temperatures and rainfall', time: '1,000s–millions of years', change: 'Feldspar reacts with weak acid in rainwater and breaks down to clay; quartz is too tough to dissolve and survives as sand. The two travel different distances and settle separately — sand near the source, clay far out in quiet water.', evidence: 'One granite yields TWO sedimentary rocks: quartz sand → sandstone, clay → shale.', stages: ['Rain and frost open cracks', 'Feldspar → clay, quartz freed', 'Rivers sort sand from clay', 'Burial, compaction, cementation'] }
    },
    basalt: {
      melting_cooling:    { product: 'Basalt or Gabbro', family: 'igneous', texture: 'finegrained', process: 'Melting, then crystallization', conditions: '1000–1250 °C', time: 'Days (lava) to millions of years (pluton)', change: 'Basalt melts to a runny, iron- and magnesium-rich (mafic) magma. Erupted, it chills fast into fine-grained basalt; trapped at depth, the same melt cools slowly into coarse gabbro.', evidence: 'Same magma, two rocks — the only difference is cooling rate.', stages: ['Mafic rock reaches melting point', 'Low-viscosity magma pools', 'Ascent or ponding', 'Fast chill or slow crystal growth'] },
      heat_pressure:      { product: 'Greenschist, then Amphibolite', family: 'metamorphic', texture: 'foliated', process: 'Prograde regional metamorphism', conditions: '400–600 °C, 10–25 km deep', time: 'Millions of years', change: 'New minerals grow that are stable at the higher temperature: chlorite and epidote give greenschist its green colour, and at higher grade hornblende takes over to form amphibolite.', evidence: 'The colour change is the data — green means chlorite, black-and-white speckle means hornblende + plagioclase.', stages: ['Burial in a subduction zone', 'Chlorite and epidote grow', 'Greenschist stage', 'Hornblende replaces chlorite'] },
      weathering_erosion: { product: 'Mudstone (iron-rich)', family: 'sedimentary', texture: 'finelayered', process: 'Chemical weathering, transport, lithification', conditions: 'Warm, wet surface conditions', time: '1,000s–millions of years', change: 'Olivine and pyroxene weather quickly to clay minerals, and the iron they release oxidizes to rust-red iron oxide. In the tropics this leaves deep red soils (laterite) that later harden into iron-rich mudstone.', evidence: 'The red colour is oxidized iron — direct evidence that oxygen and water did the work.', stages: ['Water attacks olivine', 'Clay forms, iron released', 'Iron oxidizes rust-red', 'Deposition and compaction'] }
    },
    sandstone: {
      melting_cooling:    { product: 'Rhyolite or Granite', family: 'igneous', texture: 'crystalline', process: 'Crustal melting, then crystallization', conditions: '850–1100 °C, deep burial', time: 'Millions of years', change: 'A quartz-rich sandstone must be buried very deep before it melts. The result is a silica-rich melt that crystallizes into granite at depth or rhyolite if it erupts.', evidence: 'Quartz has a high melting point, so this route needs more heat than melting basalt does.', stages: ['Deep burial', 'Quartz cement breaks down', 'Silica-rich melt forms', 'Crystallization'] },
      heat_pressure:      { product: 'Quartzite', family: 'metamorphic', texture: 'nonfoliated', process: 'Contact or regional metamorphism', conditions: '300–500 °C', time: '10,000s–millions of years', change: 'Quartz grains recrystallize and fuse together, sealing the pore space. Because quartz grains are blocky rather than flat, they cannot line up — so quartzite has no foliation.', evidence: 'Break it: sandstone fractures AROUND its grains, quartzite fractures straight THROUGH them.', stages: ['Heating of buried sand', 'Pore space closes', 'Grain boundaries fuse', 'Interlocking quartz mosaic'] },
      weathering_erosion: { product: 'Sandstone (recycled)', family: 'sedimentary', texture: 'clastic', process: 'Erosion, transport, re-lithification', conditions: 'Surface conditions', time: '1,000s–millions of years', change: 'The cement dissolves and releases the sand grains, but quartz itself is chemically tough and physically hard, so the grains simply travel and are buried again. Each cycle rounds them a little more.', evidence: 'Well-rounded, highly sorted quartz grains have been recycled many times.', stages: ['Cement dissolves', 'Grains released', 'Rounded during transport', 'Re-cemented as new sandstone'] }
    },
    limestone: {
      melting_cooling:    { product: 'Igneous rock (model outcome)', family: 'igneous', texture: 'crystalline', process: 'Melting, then crystallization', conditions: 'Above ~900 °C', time: 'Millions of years', change: 'In the standard rock cycle any rock can melt and re-crystallize as igneous rock, and that is the pathway shown here.', evidence: 'Use a silicate rock such as granite or basalt for a cleaner example of the melting pathway.', caveat: 'Real limestone is the awkward case: heated at shallow depth, calcite tends to break down and release CO₂ (decarbonation) rather than melt. Genuine carbonate magmas (carbonatites) exist but are rare and come from the mantle, not from melting a limestone bed.', stages: ['Strong heating', 'Calcite becomes unstable', 'Melt or CO₂ release', 'Crystallization'] },
      heat_pressure:      { product: 'Marble', family: 'metamorphic', texture: 'nonfoliated', process: 'Contact or regional metamorphism', conditions: '300–600 °C', time: '10,000s–millions of years', change: 'Calcite crystals dissolve and regrow larger and interlocking. Fossils and bedding are erased in the process, which is why marble looks uniform and sugary.', evidence: 'Lost fossils are the tell — if you can still see shells, it is limestone, not marble.', stages: ['Burial or nearby intrusion', 'Calcite starts recrystallizing', 'Fossils and bedding erased', 'Interlocking calcite mosaic'] },
      weathering_erosion: { product: 'Limestone or Travertine', family: 'sedimentary', texture: 'bioclastic', process: 'Carbonate dissolution and re-precipitation', conditions: 'Rainwater with dissolved CO₂', time: '1,000s–millions of years', change: 'Rain plus CO₂ makes weak carbonic acid, which dissolves calcite outright instead of grinding it into grains. The calcium is carried away in solution and re-precipitates elsewhere — as cave formations, travertine, or new marine limestone.', evidence: 'This is why limestone regions form caves, sinkholes and karst instead of sandy beaches.', stages: ['Acidic rainwater contact', 'Calcite dissolves', 'Ca²⁺ carried in solution', 'Re-precipitates as new carbonate'] }
    },
    shale: {
      melting_cooling:    { product: 'Granite (S-type)', family: 'igneous', texture: 'crystalline', process: 'Melting of sedimentary crust', conditions: '650–800 °C, deep crust', time: 'Millions of years', change: 'Clay-rich rock buried into the deep crust melts to a silica- and aluminium-rich magma. Geologists call the granite it forms "S-type" because its source was Sedimentary.', evidence: 'S-type granites carry aluminium-rich minerals inherited from the original clay.', stages: ['Deep burial of clay beds', 'Water-bearing minerals break down', 'Aluminous melt forms', 'Crystallization as S-type granite'] },
      heat_pressure:      { product: 'Slate → Phyllite → Schist → Gneiss', family: 'metamorphic', texture: 'foliated', process: 'Prograde regional metamorphism', conditions: '200 °C (slate) rising to 700 °C (gneiss)', time: 'Millions of years', change: 'This is the classic metamorphic series. Flat clay minerals rotate to sit perpendicular to the squeeze, then regrow larger at each step: slate (too small to see) → phyllite (silky sheen) → schist (visible mica flakes) → gneiss (segregated bands).', evidence: 'Grain size IS the thermometer — the coarser the mica, the higher the grade it reached.', stages: ['Clay flakes rotate — slate', 'Mica grows — phyllite sheen', 'Visible flakes — schist', 'Bands segregate — gneiss'] },
      weathering_erosion: { product: 'Mudstone or Shale', family: 'sedimentary', texture: 'finelayered', process: 'Erosion, transport, lithification', conditions: 'Surface conditions', time: '1,000s–millions of years', change: 'Clay is already the end product of chemical weathering, so it does not break down further — it just splits apart, washes into quiet water and settles again. Clay particles are so fine they only settle where currents are nearly still.', evidence: 'Shale means quiet water: deep sea floor, lake bottom, or floodplain.', stages: ['Layers split and flake', 'Clay suspended in water', 'Settles in still water', 'Compaction to new shale'] }
    },
    slate: {
      melting_cooling:    { product: 'Granite (S-type)', family: 'igneous', texture: 'crystalline', process: 'Melting of metamorphosed mud', conditions: '650–800 °C, deep crust', time: 'Millions of years', change: 'Slate carries the same clay-derived chemistry as the shale it came from, so melting it yields the same aluminium-rich, S-type granitic magma.', evidence: 'The melt "forgets" the foliation entirely — igneous crystals grow in random orientations.', stages: ['Deep burial', 'Mica breaks down', 'Aluminous melt forms', 'Random crystal growth'] },
      heat_pressure:      { product: 'Phyllite, then Schist', family: 'metamorphic', texture: 'foliated', process: 'Increasing metamorphic grade', conditions: '400–600 °C', time: 'Millions of years', change: 'Turning up heat and pressure on slate grows its microscopic micas into larger flakes. First they are just big enough to give a silky sheen (phyllite), then big enough to see and pick out individually (schist).', evidence: 'Run a finger over it: slate is dull and flat, phyllite is silky, schist sparkles.', stages: ['Grade increases', 'Micas coarsen — silky sheen', 'Phyllite stage', 'Visible mica flakes — schist'] },
      weathering_erosion: { product: 'Shale or Mudstone', family: 'sedimentary', texture: 'clastic', process: 'Erosion, transport, lithification', conditions: 'Surface conditions', time: '1,000s–millions of years', change: 'Slate splits readily along its cleavage planes, so it breaks into flat chips. Those chips grind down to clay and silt and are deposited as mud once again.', evidence: 'Slate’s cleavage makes it weather into flat plates rather than round cobbles.', stages: ['Splits along cleavage', 'Chips ground to silt and clay', 'Transport and deposition', 'Compaction to mudstone'] }
    },
    marble: {
      melting_cooling:    { product: 'Igneous rock (model outcome)', family: 'igneous', texture: 'crystalline', process: 'Melting, then crystallization', conditions: 'Above ~900 °C', time: 'Millions of years', change: 'In the standard rock cycle any rock can melt and re-crystallize as igneous rock, and that is the pathway shown here.', evidence: 'Granite, basalt or shale give cleaner examples of the melting pathway.', caveat: 'Marble is calcite, so like limestone it tends to release CO₂ (decarbonation) rather than melt cleanly at crustal depths. Carbonate magmas are real but rare and mantle-derived.', stages: ['Strong heating', 'Calcite becomes unstable', 'Melt or CO₂ release', 'Crystallization'] },
      heat_pressure:      { product: 'Coarse Marble', family: 'metamorphic', texture: 'coarsemosaic', process: 'Continued recrystallization', conditions: '500–700 °C', time: 'Millions of years', change: 'Marble is already calcite, so more heat does not create new minerals — it just lets existing crystals grow larger by consuming their neighbours. Calcite grains are blocky, so even under great pressure they cannot align into foliation.', evidence: 'Marble never develops banding no matter how high the grade — blocky minerals cannot line up.', stages: ['Reheating', 'Grain boundaries migrate', 'Small crystals absorbed', 'Coarse sugary texture'] },
      weathering_erosion: { product: 'Limestone (re-precipitated)', family: 'sedimentary', texture: 'bioclastic', process: 'Carbonate dissolution and re-precipitation', conditions: 'Rainwater with dissolved CO₂', time: '1,000s–millions of years', change: 'Like limestone, marble dissolves in weak carbonic acid rather than crumbling into grains. The dissolved calcium is carried off and re-precipitated as new carbonate rock.', evidence: 'This is why marble statues and headstones lose their detail in acidic rain.', stages: ['Acid rain contact', 'Calcite dissolves', 'Carried in solution', 'Re-precipitated as carbonate'] }
    },
    gneiss: {
      melting_cooling:    { product: 'Migmatite, then Granite', family: 'igneous', texture: 'crystalline', process: 'Partial melting (anatexis)', conditions: '700–800 °C — the top of the metamorphic range', time: 'Millions of years', change: 'Gneiss sits right at the boundary where metamorphism ends and melting begins. The light quartz-feldspar bands melt first while the dark bands stay solid, producing migmatite — literally a mixed rock, half metamorphic and half igneous.', evidence: 'Migmatite is the visible proof of where the rock cycle’s two branches meet.', stages: ['Temperature hits the solidus', 'Light bands begin to melt', 'Migmatite — part melt, part solid', 'Melt separates and crystallizes'] },
      heat_pressure:      { product: 'Migmatite', family: 'metamorphic', texture: 'banded', process: 'Ultra-high-grade metamorphism', conditions: '700–800 °C', time: 'Millions of years', change: 'Gneiss is already the highest common grade, so pushing further starts partial melting instead of making a new solid rock. The result is migmatite, which marks the upper limit of metamorphism.', evidence: 'Wispy, folded light-coloured veins cutting through darker gneiss are frozen melt.', stages: ['Already high grade', 'Approaching the solidus', 'First melt in felsic bands', 'Migmatite forms'] },
      weathering_erosion: { product: 'Sandstone and Shale', family: 'sedimentary', texture: 'clastic', process: 'Hydrolysis, transport, lithification', conditions: 'Surface conditions', time: '1,000s–millions of years', change: 'Gneiss weathers much like granite because it holds the same minerals: feldspar breaks down to clay while quartz survives as sand. The banding is destroyed entirely — sediment keeps no memory of it.', evidence: 'Sediment records the minerals of its parent rock, but not its texture.', stages: ['Bands split along weak micas', 'Feldspar → clay, quartz freed', 'Rivers sort the load', 'Burial and cementation'] }
    }
  };

  var RC_FAMILY_COLORS = {
    igneous:     { base: '#7f1d1d', mid: '#b91c1c', detail: '#fca5a5' },
    sedimentary: { base: '#78350f', mid: '#b45309', detail: '#fde68a' },
    metamorphic: { base: '#4c1d95', mid: '#6d28d9', detail: '#c4b5fd' }
  };

  var rcBlend = function (a, b, t) {
    var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    var part = function (sh) {
      var va = (pa >> sh) & 255, vb = (pb >> sh) & 255;
      var v = Math.round(va + (vb - va) * t);
      if (v < 0) v = 0; if (v > 255) v = 255;
      return (v < 16 ? '0' : '') + v.toString(16);
    };
    return '#' + part(16) + part(8) + part(0);
  };

  var rcMosaic = function (h, cols, rows, tones, c, x, y, w, hgt) {
    // A 22px family chip cannot show twelve grains; it just goes muddy.
    if (Math.min(w, hgt) < 34) { cols = Math.max(2, Math.round(cols / 2)); rows = Math.max(2, Math.round(rows / 2)); }
    var cw = w / cols, ch = hgt / rows;
    // Deterministic jitter — index-driven, never Math.random — so a
    // re-render at the same progress redraws exactly the same frame.
    var wob = function (seed, span) { return (((seed * 2654435761) % 1000) / 1000 - 0.5) * span; };
    var pt = [];
    var row, col;
    for (row = 0; row <= rows; row++) {
      pt.push([]);
      for (col = 0; col <= cols; col++) {
        var seed = row * 73 + col * 149 + 7;
        var edgeH = (row === 0 || row === rows);
        var edgeV = (col === 0 || col === cols);
        pt[row].push([
          x + col * cw + (edgeV ? 0 : wob(seed, cw * 0.5)),
          y + row * ch + (edgeH ? 0 : wob(seed + 31, ch * 0.5))
        ]);
      }
    }
    var out = [];
    var n = 0;
    for (row = 0; row < rows; row++) {
      for (col = 0; col < cols; col++, n++) {
        var q = [pt[row][col], pt[row][col + 1], pt[row + 1][col + 1], pt[row + 1][col]];
        out.push(h('polygon', {
          key: 'mo' + n,
          points: q.map(function (p) { return p[0].toFixed(2) + ',' + p[1].toFixed(2); }).join(' '),
          fill: tones[(n + row) % tones.length], stroke: c.base, strokeWidth: 0.7, strokeLinejoin: 'round'
        }));
      }
    }
    return out;
  };

  var rcSwatch = function (h, key, texture, family, x, y, w, hgt, opacity) {
    var c = RC_FAMILY_COLORS[family] || RC_FAMILY_COLORS.igneous;
    var kids = [];
    var clipId = 'rcclip-' + key;
    kids.push(h('defs', { key: 'defs' },
      h('clipPath', { id: clipId }, h('rect', { x: x, y: y, width: w, height: hgt, rx: 7 }))));
    kids.push(h('rect', { key: 'body', x: x, y: y, width: w, height: hgt, rx: 7, fill: c.mid, stroke: c.base, strokeWidth: 1.5 }));
    var g = [];
    var i;
    if (texture === 'crystalline') {
      // INTERLOCKING coarse crystals — grains that meet, with no matrix
      // between them. That is the whole distinction the captions rest on
      // ("coarse interlocking quartz, feldspar and mica crystals"), and
      // the old drawing showed six identical diamonds floating in a flat
      // field with wide gaps: not interlocking, and one mineral, not
      // three. A student reading "interlocking" and seeing "floating"
      // learns the opposite of the point.
      //
      // Grains are laid on a jittered grid at a radius large enough to
      // guarantee overlap with their neighbours, so every boundary is a
      // shared edge. Painted in order, later grains clip earlier ones —
      // which is exactly how an interlocking mosaic reads. Three tones
      // stand in for the three named minerals.
      g.push.apply(g, rcMosaic(h, 4, 3, [
        rcBlend(c.mid, '#ffffff', 0.52),   // pale quartz
        rcBlend(c.mid, '#ffffff', 0.22),   // feldspar
        rcBlend(c.base, c.mid, 0.30)       // dark mica
      ], c, x, y, w, hgt));
    } else if (texture === 'finegrained') {
      // Fine matrix plus gas vesicles.
      for (i = 0; i < 34; i++) {
        g.push(h('circle', { key: 'f' + i, cx: x + ((i * 37) % 100) / 100 * w, cy: y + ((i * 61) % 100) / 100 * hgt, r: 0.9, fill: c.detail, opacity: 0.55 }));
      }
      var ves = [[0.24, 0.34, 3], [0.62, 0.26, 2.4], [0.44, 0.7, 2.8], [0.8, 0.6, 2.2]];
      for (i = 0; i < ves.length; i++) {
        g.push(h('circle', { key: 'v' + i, cx: x + ves[i][0] * w, cy: y + ves[i][1] * hgt, r: ves[i][2], fill: c.base, opacity: 0.6 }));
      }
    } else if (texture === 'clastic') {
      // Flat bedding planes with grains between them.
      for (i = 1; i < 6; i++) {
        g.push(h('line', { key: 'l' + i, x1: x, y1: y + (i / 6) * hgt, x2: x + w, y2: y + (i / 6) * hgt, stroke: c.detail, strokeWidth: 1.6, opacity: 0.8 }));
      }
      for (i = 0; i < 18; i++) {
        g.push(h('circle', { key: 'g' + i, cx: x + ((i * 43) % 100) / 100 * w, cy: y + ((i * 71) % 100) / 100 * hgt, r: 1.3, fill: c.detail, opacity: 0.45 }));
      }
    } else if (texture === 'finelayered') {
      // Fissile: shale splits into thin sheets, and that is the whole
      // difference between it and sandstone in the hand. Both were
      // tagged 'clastic', so two of the eight specimens a student picks
      // between were drawing the identical picture — and the sibling
      // rocks tool had already separated them.
      for (i = 1; i < 12; i++) {
        g.push(h('line', {
          key: 'fl' + i, x1: x, y1: y + (i / 12) * hgt, x2: x + w, y2: y + (i / 12) * hgt,
          stroke: c.detail, strokeWidth: 0.9, opacity: 0.85,
        }));
      }
      // A split running in from the edge — the layers coming apart.
      g.push(h('path', {
        key: 'flsplit',
        d: 'M' + x + ',' + (y + hgt * 0.42) + ' L' + (x + w * 0.55) + ',' + (y + hgt * 0.46)
          + ' L' + x + ',' + (y + hgt * 0.52) + ' Z',
        fill: c.base, opacity: 0.55,
      }));
    } else if (texture === 'bioclastic') {
      // Bedding plus shell fragments.
      for (i = 1; i < 4; i++) {
        g.push(h('line', { key: 'l' + i, x1: x, y1: y + (i / 4) * hgt, x2: x + w, y2: y + (i / 4) * hgt, stroke: c.detail, strokeWidth: 1.3, opacity: 0.6 }));
      }
      var sh = [[0.2, 0.3], [0.55, 0.22], [0.35, 0.66], [0.72, 0.58], [0.84, 0.34]];
      for (i = 0; i < sh.length; i++) {
        var sx = x + sh[i][0] * w, sy = y + sh[i][1] * hgt;
        g.push(h('path', { key: 's' + i, d: 'M' + (sx - 4) + ',' + sy + ' a4,4 0 0,1 8,0', fill: 'none', stroke: c.detail, strokeWidth: 1.6, opacity: 0.95 }));
      }
    } else if (texture === 'foliated') {
      // Tightly spaced aligned mica planes.
      for (i = 1; i < 11; i++) {
        var fy = y + (i / 11) * hgt;
        g.push(h('path', { key: 'p' + i, d: 'M' + x + ',' + fy + ' Q' + (x + w / 2) + ',' + (fy - 1.6) + ' ' + (x + w) + ',' + fy, fill: 'none', stroke: c.detail, strokeWidth: 1.1, opacity: 0.8 }));
      }
    } else if (texture === 'coarsemosaic') {
      // The same interlocking mosaic with fewer, larger grains.
      // Marble + more heat produces "Coarse Marble" — the panel says
      // "existing crystals grow larger by consuming their neighbours",
      // and the product used to be drawn with grains exactly the size
      // of the marble that went in. The one change described was the
      // one thing the picture did not show.
      g.push.apply(g, rcMosaic(h, 3, 2, [
        rcBlend(c.mid, '#ffffff', 0.48),
        rcBlend(c.mid, '#ffffff', 0.24),
        rcBlend(c.mid, '#ffffff', 0.36)
      ], c, x, y, w, hgt));
    } else if (texture === 'banded') {
      // Segregated light/dark gneissic banding.
      for (i = 0; i < 5; i++) {
        var by = y + (i / 5) * hgt;
        g.push(h('path', { key: 'b' + i, d: 'M' + x + ',' + (by + 3) + ' Q' + (x + w * 0.35) + ',' + (by - 2) + ' ' + (x + w * 0.7) + ',' + (by + 3) + ' T' + (x + w) + ',' + (by + 2), fill: 'none', stroke: i % 2 ? c.detail : c.base, strokeWidth: 3.4, opacity: 0.85 }));
      }
    } else { // nonfoliated — equant interlocking mosaic.
      // NOTE: this is also the catch-all. A texture name that is not
      // handled above lands here and draws a marble-like mosaic with no
      // error, so a typo would look like a deliberate rock. A test
      // pins that every texture the data asks for is handled by name.
      //
      // Quartzite is the clearest case of the drawing contradicting its
      // own caption: the panel says grains "recrystallize and FUSE
      // together, SEALING the pore space", and the tool then drew seven
      // separated hexagons with the pore space making up most of the
      // picture. Marble's "interlocking calcite mosaic" had the same
      // problem. Both are equant mosaics, so both now tile.
      g.push.apply(g, rcMosaic(h, 5, 4, [
        rcBlend(c.mid, '#ffffff', 0.44),
        rcBlend(c.mid, '#ffffff', 0.20),
        rcBlend(c.mid, '#ffffff', 0.32)
      ], c, x, y, w, hgt));
    }
    kids.push(h('g', { key: 'tex', clipPath: 'url(#' + clipId + ')' }, g));
    return h('g', { key: key, opacity: opacity == null ? 1 : opacity }, kids);
  };

  var RC_FAMILY_TEXTURE = { igneous: 'crystalline', sedimentary: 'clastic', metamorphic: 'banded' };

  var rcFamilyChip = function (h, key, familyId, size) {
    var S = size || 24;
    return h('svg', {
      width: S, height: S, viewBox: '0 0 ' + S + ' ' + S,
      'aria-hidden': true, focusable: 'false',
      style: { display: 'block', flexShrink: 0 }
    }, rcSwatch(h, key, RC_FAMILY_TEXTURE[familyId] || 'crystalline', familyId, 0, 0, S, S, 1));
  };

  window.StemLab.registerTool('rockCycle', {
    // 🔬 (microscope) said nothing about a rock cycle and collided with the
    // sibling tool in the catalog; 🔄 matches the animated cycle and the
    // transformation machine this tool is built around.
    icon: '🔄',
    label: 'Rock Cycle',
    desc: 'Earth Science: the rock cycle as a branching network, not a one-way circle. Animated cross-section diagram with all six pathways clickable, and a transformation machine that takes a named specimen and an agent of change and returns the specific named product with its real temperatures, depths, timescale and field evidence — shale to slate, limestone to marble, granite to gneiss.',
    color: 'slate',
    category: 'science',
    questHooks: [
      { id: 'view_3_rocks', label: 'Explore all 3 rock families', icon: '🪨', check: function(d) { return Object.keys(d.rcViewed || {}).length >= 3; }, progress: function(d) { return Object.keys(d.rcViewed || {}).length + '/3 families'; } },
      { id: 'try_process', label: 'Inspect a transformation process', icon: '↔️', check: function(d) { return !!d.selectedProcess; }, progress: function(d) { return d.selectedProcess ? 'Done' : 'Pick a process'; } },
      { id: 'run_3_transforms', label: 'Run the Transformation Machine 3 times', icon: '🔄', check: function(d) { return (d.transformsRun || 0) >= 3; }, progress: function(d) { return (d.transformsRun || 0) + '/3 runs'; } }
    ],
    render: function(ctx) {
      // rockCycle paints no ground of its own, so its chrome sits on the HOST
      // surface - a white card in light AND dark, but pure BLACK in the
      // contrast theme. This tool had never been rendered by the layout gate at
      // all (it is the SECOND registerTool in this file, and the gate used to
      // read only the first), which is why 9 sites went unseen.
      var isContrast = !!ctx.isContrast;
      var onHostInk = isContrast ? ' text-white' : '';
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

          // Localized views of the hoisted tables. The data lives at module scope
          // as pure records carrying `labelKey`; the display label is resolved
          // here, once per render, so every existing ROCKS/PROCESSES reference
          // below keeps reading a plain `.label`.
          const ROCKS = RC_FAMILIES.map(function (r) { return Object.assign({}, r, { label: t(r.labelKey) }); });
          const PROCESSES = RC_PROCESSES.map(function (p) { return Object.assign({}, p, { label: t(p.labelKey) }); });

          const upd = (key, val) => setLabToolData(prev => ({ ...prev, rockCycle: { ...prev.rockCycle, [key]: val } }));

          // Batched sibling of `upd`. The transformation machine called this to
          // finish a run, but it was only ever defined inside the `rocks` tool —
          // so the call threw ReferenceError the instant the progress bar hit
          // 100%, leaving transformationAnimActive stuck TRUE forever (button
          // permanently disabled, result panel never rendered). That was the
          // "transformation machine gets stuck" bug.
          const updMulti = function(obj) {
            setLabToolData(function(prev) {
              var rc = Object.assign({}, (prev && prev.rockCycle) || {});
              Object.assign(rc, obj);
              return Object.assign({}, prev, { rockCycle: rc });
            });
          };



          const sel = d.selectedRock ? ROCKS.find(r => r.id === d.selectedRock) : null;



          // ══ Transformation Machine: petrology model ══
          // The machine used to take a rock FAMILY and print one generic paragraph
          // per agent, so "Igneous + Heat & Press" and "Sedimentary + Heat & Press"
          // said nearly the same thing. It now takes a NAMED SPECIMEN and returns a
          // named product with the real conditions, timescale, mineral change and
          // field evidence for that specific pairing — the pairings students are
          // actually asked to know (shale → slate, limestone → marble, sandstone →
          // quartzite, granite → gneiss).


          // [specimen][agent] → the specific, named outcome.
          // `caveat` is only set where the tidy classroom rock cycle genuinely
          // oversimplifies, so the tool teaches the model without asserting
          // something a geologist would call wrong.

          // Localized view. The row's `label` and `note` were reaching the
          // transformation machine in English while the transformation text
          // beside them was translated, so the dropdown and its specimen note
          // were the only English left on the panel. `family` and `texture` stay
          // untouched: they are ids the renderer switches on.
          const rcSpecimen = function (id) {
            var row = RC_SPECIMENS[0];
            for (var i = 0; i < RC_SPECIMENS.length; i++) { if (RC_SPECIMENS[i].id === id) { row = RC_SPECIMENS[i]; break; } }
            return Object.assign({}, row, {
              label: __alloT('stem.rocks.' + row.id, row.label),
              note: __alloT('stem.rock_cycle.spec_note_' + row.id, row.note)
            });
          };
          const rcAgent = function (id) {
            for (var i = 0; i < RC_AGENTS.length; i++) { if (RC_AGENTS[i].id === id) return RC_AGENTS[i]; }
            return null;
          };
          // Text fields only. `family` and `texture` are ids the renderer
          // switches on, so translating them would break the drawing.
          const RC_TX_TEXT = ['product', 'process', 'conditions', 'time', 'change', 'evidence', 'caveat'];
          const rcLookup = function (specimenId, agentId) {
            var row = RC_TRANSFORMS[specimenId];
            var rec = (row && row[agentId]) ? row[agentId] : null;
            if (!rec) return null;
            var base = 'stem.rock_cycle.tx_' + specimenId + '_' + agentId + '_';
            var out = Object.assign({}, rec);
            RC_TX_TEXT.forEach(function (key) {
              if (typeof rec[key] === 'string') out[key] = __alloT(base + key, rec[key]);
            });
            if (Object.prototype.toString.call(rec.stages) === '[object Array]') {
              out.stages = rec.stages.map(function (stage, i) { return __alloT(base + 'stage' + i, stage); });
            }
            return out;
          };

          // Family palette. Literal hex only — SVG presentation attributes do not
          // accept CSS var(), so a token here would silently render black.
          // base/mid/detail only — an `ink` was defined here and never read, which
          // is exactly the write-only-data smell this pass went looking for. Text
          // colour comes from each ROCKS entry's own `ink`.

          // Mix two hex colours. Literal hex in, literal hex out — for the same
          // reason the palette above is literal: an SVG presentation attribute
          // takes neither var() nor color-mix(), and would render black.

          // A TILING grain mosaic: cols × rows of jittered polygons whose radius
          // comes from the cell half-diagonal, so neighbouring grains always
          // overlap and every boundary is a shared edge rather than a gap. That
          // is what "interlocking" means, and drawing separated grains instead
          // was contradicting the captions that rest on it.
          //
          // Tones must stay inside the family hue: tiling in the pale `detail`
          // colour would repaint the whole swatch and break the colour coding
          // the three families depend on.
          //
          // Deterministic — index-driven, never Math.random — so a re-render at
          // the same progress redraws exactly the same frame.
          // Grains are quads over a JITTERED LATTICE, sharing their corners with
          // their neighbours. That tiles exactly: every edge is a boundary
          // between two grains and there is no space left between them, which is
          // the claim these captions make.
          //
          // The first attempt scattered overlapping hexagons on a square grid
          // instead. It looked interlocking, because the gaps showed the body
          // colour and read as dark boundaries — but sampling the area found
          // only 72-79% of the rock covered by a grain. Hexagons cannot tile a
          // square lattice without overlap so heavy that late grains bury early
          // ones. Sharing corners removes the problem rather than compensating
          // for it, and needs no clipping to hide the shortfall.
          //
          // Lattice points on the outer border move only ALONG that border, so
          // the rock's own outline stays exactly the rect its caller asked for.

          // Draws one rock specimen as a textured SVG swatch. Texture is the whole
          // point: a student should be able to SEE that quartzite is interlocking
          // and shale is layered, not just read the words.

          // A standalone family chip, so the process list and the transformation
          // machine speak the same visual language. One representative texture
          // per family: igneous crystallises, sedimentary beds, metamorphic bands.

          // ── Animated Canvas2D for Rock Cycle ──
          // This initialiser is re-created each render (it closes over the current
          // upd/setLabToolData), but it is NOT handed to React as the ref. It is
          // published into _rcInitBox and invoked by the identity-stable
          // rockCycleCanvasRef, so the canvas mounts exactly once per visit.

          const initRockCycleCanvas = function (canvasEl) {

            if (!canvasEl) return;

            if (canvasEl._rcInit) return;

            // Zero-size guard. We now initialise ONCE per mount, so a canvas
            // measured at 0×0 (ref fired before layout, or mounted inside a
            // hidden ancestor) would stay permanently blank — the old
            // re-init-every-render behaviour used to paper over that by accident.
            // Retry on the next frame instead of latching a dead canvas.
            if (!canvasEl.offsetWidth || !canvasEl.offsetHeight) {
              if (typeof requestAnimationFrame === 'function' && !canvasEl._rcSizeRetry) {
                canvasEl._rcSizeRetry = requestAnimationFrame(function () {
                  canvasEl._rcSizeRetry = null;
                  if (canvasEl.isConnected) rockCycleCanvasRef(canvasEl);
                });
              }
              return;
            }

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
              if (canvasEl._rcSizeRetry && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(canvasEl._rcSizeRetry);
              canvasEl._rcSizeRetry = null;
              // The canvas only unmounts when the whole tool does, so this is the
              // one reliable place to stop an in-flight transformation run.
              rcStopTransformTimer();
              canvasEl.removeEventListener('click', onRockCycleClick);
              canvasEl.removeEventListener('keydown', onRockCycleKey);
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
                // The panel two sections down says "the diagram's 6 arrows show
                // every path", and the three branch arrows were drawn at 0.22
                // alpha in mid-slate — composited over this backdrop that is
                // roughly 1.4:1, so the diagram did not really show what the
                // text claimed. Lighter base colour and higher alpha for both,
                // keeping the forward/branch distinction that makes the
                // canonical loop readable at a glance.
                ctx.strokeStyle = shortcut ? 'rgba(226,232,240,0.52)' : 'rgba(226,232,240,0.78)';
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
                ctx.fillStyle = shortcut ? 'rgba(226,232,240,0.74)' : 'rgba(226,232,240,0.95)';
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
                  // 6px at 78% opacity over a busy animated background was barely
                  // readable — the same defect the landscape captions had. Set on
                  // a dark pill at a legible size instead.
                  ctx.font = 'bold ' + (8 * dpr) + 'px sans-serif';
                  ctx.textAlign = 'center';
                  var plw = ctx.measureText(proc.label).width;
                  var plx = labelX * dpr, ply = labelY * dpr;
                  var ppadX = 5 * dpr, pboxH = 13 * dpr, prr = 3.5 * dpr;
                  var pbx = plx - plw / 2 - ppadX, pby = ply - 9.5 * dpr, pbw = plw + ppadX * 2;
                  ctx.beginPath();
                  ctx.moveTo(pbx + prr, pby);
                  ctx.lineTo(pbx + pbw - prr, pby); ctx.quadraticCurveTo(pbx + pbw, pby, pbx + pbw, pby + prr);
                  ctx.lineTo(pbx + pbw, pby + pboxH - prr); ctx.quadraticCurveTo(pbx + pbw, pby + pboxH, pbx + pbw - prr, pby + pboxH);
                  ctx.lineTo(pbx + prr, pby + pboxH); ctx.quadraticCurveTo(pbx, pby + pboxH, pbx, pby + pboxH - prr);
                  ctx.lineTo(pbx, pby + prr); ctx.quadraticCurveTo(pbx, pby, pbx + prr, pby);
                  ctx.closePath();
                  ctx.fillStyle = 'rgba(2,6,23,0.80)';
                  ctx.fill();
                  ctx.fillStyle = '#f1f5f9';
                  ctx.fillText(proc.label, plx, ply);
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

              ctx.fillText('\uD83E\uDEA8 ' + __alloT('stem.rock_cycle.canvas_badge', 'Rock Cycle'), 12 * dpr, 19 * dpr);

              scheduleRockCycleFrame();

            }

            draw();

            canvasEl._rcCleanup = cleanupRockCycleCanvas;
            if (typeof document !== 'undefined') document.addEventListener('visibilitychange', onRockCycleVisibilityChange);



            // Selecting a family. Shared by pointer and keyboard so the two can
            // never drift apart — the keyboard path was added later, and the only
            // safe way to add it was to make the existing click path call this.
            function rcSelectFamily(rock) {
              if (!rock) return;
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
              // The canvas is role=application, so nothing about a selection is
              // announced by the platform — a screen-reader user pressing 2 got
              // silence. The detail panel that appears below is out of the
              // reading position, so say what was selected here.
              try {
                if (typeof announceToSR === 'function') {
                  announceToSR(rock.label + ' ' + __alloT('stem.rocks.selected_word', 'selected') + '. ' + rock.desc);
                }
              } catch (e) {}
            }

            function onRockCycleClick(e) {

              var rect = canvasEl.getBoundingClientRect();

              var mx = (e.clientX - rect.left) / rect.width * (cW / dpr);

              var my = (e.clientY - rect.top) / rect.height * (cH / dpr);

              ROCKS.forEach(function (rock) {

                var n = nodes[rock.id];

                var dist = Math.sqrt((mx - n.x) * (mx - n.x) + (my - n.y) * (my - n.y));

                if (dist < 40) rcSelectFamily(rock);

              });

            }
            canvasEl.addEventListener('click', onRockCycleClick);

            // ── Keyboard family selector (WCAG 2.1.1) ──
            // The canvas was tabIndex=0 with a click listener and NO key handler:
            // a keyboard user landed on a focus stop whose own label said "click
            // to inspect" and then had nothing to press. Same keys as the sibling
            // rocks landscape canvas, which has had this since its own audit.
            function onRockCycleKey(e) {
              if (e.altKey || e.ctrlKey || e.metaKey) return;
              var id = null;
              if (e.key === '1' || e.key === 'i' || e.key === 'I') id = 'igneous';
              else if (e.key === '2' || e.key === 's' || e.key === 'S') id = 'sedimentary';
              else if (e.key === '3' || e.key === 'm' || e.key === 'M') id = 'metamorphic';
              if (!id) return;
              e.preventDefault();
              // Deliberately NOT StemLab.findById: ROCKS is right here in scope
              // with three known ids, and reaching into the host for that would
              // make the keyboard path go dead wherever findById is absent —
              // silently, because the null result is swallowed by the guard.
              for (var ri = 0; ri < ROCKS.length; ri++) {
                if (ROCKS[ri].id === id) { rcSelectFamily(ROCKS[ri]); return; }
              }
            }
            canvasEl.addEventListener('keydown', onRockCycleKey);

          };

          // Publish the current initialiser for the stable ref to call. Assigning a
          // property does NOT change rockCycleCanvasRef's identity, so React keeps
          // the canvas mounted across re-renders.
          _rcInitBox.fn = initRockCycleCanvas;


          var viewedFamilies = Object.keys(d.rcViewed || {}).length;
          var transformsRun = d.transformsRun || 0;
          var nextMission = viewedFamilies < 3 ? { icon: '🪨', title: __alloT('stem.rocks.mission_compare_title', 'Compare all three rock families'), detail: __alloT('stem.rocks.mission_compare_detail', 'Select each node and look for evidence of how it formed.') }
            : !d.selectedProcess ? { icon: '↔️', title: __alloT('stem.rocks.mission_trace_title', 'Trace a transformation'), detail: __alloT('stem.rocks.mission_trace_detail', 'Choose an arrow to connect process, energy, and time.') }
            : transformsRun < 3 ? { icon: '🔄', title: __alloT('stem.rocks.mission_test_title', 'Test the transformation machine'), detail: __alloT('stem.rocks.mission_test_detail', 'Run another pathway and compare its inputs and products.') }
            : { icon: '🧠', title: __alloT('stem.rocks.mission_explain_title', 'Explain the branching cycle'), detail: __alloT('stem.rocks.mission_explain_detail', 'Use evidence to show why the rock cycle has many valid paths.') };

          return React.createElement("div", { className: "max-w-5xl mx-auto animate-in fade-in duration-200" },

            React.createElement("div", { className: "flex items-center gap-3 mb-3" },

              React.createElement("button", { type: 'button', onClick: () => setStemLabTool(null), className: "transition-colors grid h-10 w-10 shrink-0 place-items-center border border-slate-200 hover:bg-slate-100 rounded-xl active:scale-[0.97]", 'aria-label': __alloT('stem.rocks.back_to_tools', 'Back to tools') }, React.createElement(ArrowLeft, { size: 18, className: "text-slate-600" })),

              React.createElement("h3", { className: "text-lg font-bold text-slate-800 tracking-tight" + onHostInk }, "\uD83E\uDEA8 " + __alloT('stem.rocks.rock_cycle_title', "Rock Cycle")),

              React.createElement("span", { className: "px-2 py-0.5 bg-orange-100 text-orange-800 text-[11px] font-bold rounded-full" }, __alloT('stem.rocks.animated_badge', "ANIMATED"))

            ),

            React.createElement("section", { "data-rockcycle-command": true, className: "relative overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-sky-50 p-4 sm:p-5 mb-4", "aria-labelledby": "rockcycle-command-title" },
              React.createElement("div", { className: "absolute -right-6 -top-8 text-8xl opacity-[0.06]", "aria-hidden": true }, "🪨"),
              React.createElement("div", { className: "relative grid gap-4 lg:grid-cols-[1.15fr_.85fr]" },
                React.createElement("div", null,
                  React.createElement("div", { className: "text-[10px] font-black uppercase tracking-[0.15em] text-orange-700" }, __alloT('stem.rocks.earth_systems_mission', "Earth systems mission")),
                  React.createElement("h2", { id: "rockcycle-command-title", className: "mt-2 text-xl sm:text-2xl font-black text-slate-900" }, nextMission.icon + " " + nextMission.title),
                  React.createElement("p", { className: "mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed" }, nextMission.detail),
                  // role=group is load-bearing, not decoration: a plain div maps
                  // to role=generic, which does not support an accessible name,
                  // so this aria-label was in the DOM and announced to nobody.
                  // Same shape as a role=button with no key handler — present in
                  // the markup, dead in use.
                  React.createElement("div", { className: "mt-4 grid grid-cols-3 gap-2", role: "group", "aria-label": __alloT('stem.rocks.mission_progress_aria', "Rock cycle mission progress") },
                    [[viewedFamilies + '/3', __alloT('stem.rocks.metric_families', 'Families')], [d.selectedProcess ? '1/1' : '0/1', __alloT('stem.rocks.metric_process', 'Process')], [transformsRun + '/3', __alloT('stem.rocks.metric_transforms', 'Transforms')]].map(function(metric) { return React.createElement("div", { key: metric[1], className: "rounded-xl border border-orange-100 bg-white p-3 text-center" }, React.createElement("div", { className: "text-lg font-black text-slate-900" }, metric[0]), React.createElement("div", { className: "text-[10px] font-bold text-slate-600" }, metric[1])); })
                  )
                ),
                React.createElement("aside", { className: "rounded-xl border border-sky-200 bg-sky-50 p-4", "aria-label": __alloT('stem.rocks.evidence_route_aria', "Rock cycle evidence route") },
                  React.createElement("div", { className: "text-[10px] font-black uppercase tracking-wide text-sky-800" }, __alloT('stem.rocks.evidence_route', "Evidence route")),
                  React.createElement("ol", { className: "mt-2 space-y-2 text-[11px] text-slate-700" }, [__alloT('stem.rocks.evidence_step_observe', 'Observe texture and composition'), __alloT('stem.rocks.evidence_step_connect', 'Connect process to energy and time'), __alloT('stem.rocks.evidence_step_explain', 'Explain more than one valid pathway')].map(function(step, i) { return React.createElement("li", { key: step, className: "flex gap-2" }, React.createElement("span", { className: "font-black text-orange-800" }, (i + 1) + '.'), React.createElement("span", null, step)); }))
                )
              )
            ),

            React.createElement("div", { className: "relative rounded-xl overflow-hidden border-2 border-amber-400 shadow-lg mb-3", style: { height: "420px" } },

              // The label here used to read "Rock sample close-up of igneous —
              // click to inspect", copied from the sibling rocks tool's specimen
              // canvas. This canvas draws nothing of the kind: it is an Earth
              // cross-section with three family nodes and six pathway arrows over
              // a magma chamber. A screen-reader user was told about a picture
              // that is not on the screen, and told to click it. role=img also
              // contradicted tabIndex=0 — an image is not a focus stop.
              React.createElement("canvas", { ref: rockCycleCanvasRef, role: "application", tabIndex: 0,
                "aria-label": __alloT('stem.rocks.rc_canvas_aria',
                  "Rock cycle diagram: an Earth cross-section with a magma chamber below. Three rock family nodes — igneous at the top, metamorphic at lower left, sedimentary at lower right — are joined by six curved arrows, one per transformation pathway.")
                  + " " + __alloT('stem.rocks.rc_canvas_keys', "Press 1 for igneous, 2 for sedimentary, 3 for metamorphic.")
                  + (sel ? " " + __alloT('stem.rocks.rc_canvas_selected', "Currently selected:") + " " + sel.label + "." : ""),
                "data-selected-rock": d.selectedRock || '', style: { width: "100%", height: "100%", display: "block", cursor: "pointer" } })

            ),

            React.createElement("div", { className: "flex flex-wrap gap-1.5 mb-3" },

              ROCKS.map(function (rock) {

                return React.createElement("button", { key: rock.id, onClick: function () { upd('selectedRock', rock.id); setLabToolData(function (prev) { var rc = prev.rockCycle || {}; var v = Object.assign({}, rc.rcViewed); v[rock.id] = true; return Object.assign({}, prev, { rockCycle: Object.assign({}, rc, { rcViewed: v }) }); }); },

                  className: "px-3 py-2 rounded-lg text-xs font-bold transition-all " + (d.selectedRock === rock.id ? 'text-white shadow-md scale-105' : 'border hover:opacity-80'),

                  style: { backgroundColor: d.selectedRock === rock.id ? rock.ink : rock.color + (isContrast ? '55' : '15'), borderColor: rock.ink, color: (d.selectedRock === rock.id || isContrast) ? '#ffffff' : rock.ink }

                }, rock.emoji + " " + rock.label);

              })

            ),

            sel && React.createElement("div", { className: "rounded-xl border-2 p-4 animate-in slide-in-from-bottom-2 shadow-md mb-3", style: { borderColor: sel.color, background: 'linear-gradient(135deg, ' + sel.color + '12, ' + sel.color + '05)' } },

              React.createElement("div", { className: "flex items-center gap-3 mb-3" },

                React.createElement("span", { className: "text-3xl", style: { filter: 'drop-shadow(0 0 8px ' + sel.color + ')' }, "aria-hidden": true }, sel.emoji),

                // Show the family's texture, not only its emoji — same chip the
                // process list and the transformation machine use.
                React.createElement("div", { className: "rounded-lg border border-slate-400 bg-white p-0.5 shrink-0" }, rcFamilyChip(h, 'selFamily', sel.id, 36)),

                React.createElement("div", null,

                  // `sel.label` is translated; " Rocks" was a bare English
                  // suffix glued onto it, so a Spanish pack rendered "Ígneas
                  // Rocks" and a language that puts the noun first could not fix
                  // it at all. A placeholder lets the pack own the word order —
                  // the same {token} convention the rest of ui_strings uses.
                  React.createElement("h4", { className: "text-lg font-black tracking-tight", style: { color: sel.ink } },
                    __alloT('stem.rocks.family_rocks_heading', '{family} Rocks').replace('{family}', sel.label)),

                  React.createElement("p", { className: "text-[11px] text-slate-600" }, sel.examples)

                )

              ),

              React.createElement("p", { className: "text-sm text-slate-600 leading-relaxed mb-3" }, sel.desc),

              React.createElement("div", { className: "grid grid-cols-3 gap-2 mb-3" },

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.rocks.hardness_word', "Hardness")),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.ink } }, sel.hardness)

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.rocks.crystals_label', "Crystals")),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.ink } }, sel.crystals)

                ),

                React.createElement("div", { className: "bg-white rounded-lg p-2 text-center border" },

                  React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase" }, __alloT('stem.rocks.real_uses_label', "Real Uses")),

                  React.createElement("p", { className: "text-xs font-bold", style: { color: sel.ink } }, sel.uses)

                )

              ),

              React.createElement("div", { className: "bg-amber-50 rounded-lg p-2 border border-amber-200" },

                React.createElement("p", { className: "text-xs text-amber-800 italic" }, "\uD83D\uDCA1 " + sel.funFact)

              )

            ),

            React.createElement("div", { className: "mb-3" },

              React.createElement("p", { className: "text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1" + onHostInk }, "\u2194\uFE0F " + __alloT('stem.rocks.transformation_processes', "Transformation Processes")),

              // This panel used to render only the first three PROCESSES \u2014 the
              // steps of the simple loop. The three DIRECT branches (igneous \u2192
              // metamorphic, sedimentary \u2192 igneous, metamorphic \u2192 sedimentary)
              // were unreachable, which flatly contradicted this tool's own
              // teaching two panels down ("the diagram's 6 arrows show every
              // path", "the cycle only goes one way" listed as a myth) and the
              // mission "Explain the branching cycle". The canvas already drew
              // all six; only the clickable list was truncated. All six now.
              // The copy used to say "the three on the LEFT ... the three on the
              // RIGHT". The grid is grid-cols-2 sm:grid-cols-3, so at the wide
              // breakpoint the loop is the TOP row and the branches the BOTTOM
              // row, and at the narrow one they interleave across three rows —
              // left/right is wrong at every size. Ordering is the only claim
              // that survives a reflow, and each branch already carries a
              // visible "direct branch" tag to point at instead.
              React.createElement("p", { className: "text-[11px] text-slate-700 mb-2" + onHostInk },
                __alloT('stem.rocks.processes_intro', "Every pathway is real. The first three are the familiar loop; the last three are marked direct branch and skip a step entirely.")),

              React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2" },

                PROCESSES.map(function (proc, i) {

                  var isActive = d.selectedProcess && d.selectedProcess.label === proc.label && d.selectedProcess.from === proc.from;

                  // findById is null-safe \u2014 chained `.find(...).label` was the
                  // single-click-crashes-the-panel pattern the 2026-06-07 audit
                  // flagged. Fallback to the raw id keeps the panel renderable.
                  var fromRock = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS, proc.from) : null;
                  var toRock = window.StemLab && window.StemLab.findById ? window.StemLab.findById(ROCKS, proc.to) : null;
                  var processFromTo = (fromRock ? fromRock.label : proc.from) + " \u2192 " + (toRock ? toRock.label : proc.to);

                  // A "direct branch" skips the familiar loop order entirely.
                  var isBranch = i >= 3;

                  return React.createElement("button", { key: i, onClick: function () { upd('selectedProcess', proc); },

                    "aria-pressed": !!isActive,
                    "aria-label": processFromTo + " by " + proc.label + (isBranch ? " — a direct branch" : ""),

                    className: "min-w-0 p-2 rounded-lg text-left border transition-colors " + (isActive ? 'bg-orange-100 border-orange-500 shadow-md' : 'bg-slate-50 border-slate-200 hover:bg-orange-50 active:scale-[0.97]')

                  },

                    React.createElement("p", { className: "text-sm font-bold break-words " + (isActive ? 'text-orange-800' : 'text-slate-700') }, proc.emoji + " " + proc.label),

                    // Show the two rock families rather than only naming them, so
                    // the pathway reads at a glance and matches the textures the
                    // transformation machine uses.
                    React.createElement("div", { className: "flex items-center gap-1 my-1" },
                      rcFamilyChip(h, 'pf' + i, proc.from, 22),
                      React.createElement("span", { className: "text-[11px] font-black text-slate-600" }, "→"),
                      rcFamilyChip(h, 'pt' + i, proc.to, 22)
                    ),

                    React.createElement("p", { className: "text-[11px] text-slate-700 break-words" }, processFromTo),

                    isBranch && React.createElement("p", { className: "text-[10px] font-bold text-violet-800 mt-0.5" }, __alloT('stem.rocks.process_direct_branch', "direct branch"))

                  );

                })

              ),

              d.selectedProcess && React.createElement("div", { className: "mt-2 p-3 bg-orange-50 rounded-lg border border-orange-300 animate-in slide-in-from-bottom" },

                // Larger from → to figure: the selected pathway was described in
                // prose with nothing to look at.
                React.createElement("div", { className: "flex items-center gap-3 mb-2" },
                  React.createElement("div", { className: "rounded-lg border border-slate-400 bg-white p-0.5" }, rcFamilyChip(h, 'selFrom', d.selectedProcess.from, 40)),
                  React.createElement("div", { className: "text-center" },
                    React.createElement("div", { className: "text-lg leading-none", "aria-hidden": true }, d.selectedProcess.emoji),
                    React.createElement("div", { className: "text-[11px] font-black text-orange-800" }, "→")
                  ),
                  React.createElement("div", { className: "rounded-lg border border-slate-400 bg-white p-0.5" }, rcFamilyChip(h, 'selTo', d.selectedProcess.to, 40)),
                  React.createElement("p", { className: "text-xs font-black text-orange-900 ml-1" }, d.selectedProcess.label)
                ),

                React.createElement("p", { className: "text-sm text-orange-900 leading-relaxed" }, d.selectedProcess.desc)

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

            // ══ Rock Transformation Machine ══
            // Wrapped in an IIFE so the scene builder and the run handler can be
            // plain statements instead of being inlined into an argument list.
            (function () {

              var mSpecId = d.startingRock || 'granite';
              // Guard against state saved by the OLD machine, which stored a rock
              // FAMILY ('igneous') where a named specimen id now belongs.
              if (!RC_TRANSFORMS[mSpecId]) {
                mSpecId = mSpecId === 'sedimentary' ? 'shale' : mSpecId === 'metamorphic' ? 'slate' : 'granite';
              }
              var mSpec = rcSpecimen(mSpecId);
              var mAgent = rcAgent(d.geologicalAgent);
              var mPreview = mAgent ? rcLookup(mSpecId, mAgent.id) : null;
              var running = !!d.transformationAnimActive;
              var prog = running ? (d.transformationProgress || 0) : (d.transformationResult ? 100 : 0);
              // Tool data persists across sessions, so a student can arrive with a
              // result saved by the OLD machine — shaped { id, desc } rather than
              // { product, family, conditions, ... }. Rendering that would print
              // "undefined" into the panel, so treat a shapeless result as absent.
              var result = (d.transformationResult && d.transformationResult.product) ? d.transformationResult : null;
              // While a run is in flight the scene shows the run's OWN pairing, not
              // whatever the dropdown currently says — changing the select mid-run
              // must not rewrite the animation under the student.
              var liveRec = running ? (d.transformationRun || mPreview) : (result || mPreview);
              var liveSpec = rcSpecimen((running && d.transformationRun ? d.transformationRun.fromId : null) || (result ? result.fromId : null) || mSpecId);

              // ── Stage caption ──
              var stageIdx = Math.min(3, Math.floor(prog / 25));
              var stageText = (liveRec && liveRec.stages) ? liveRec.stages[stageIdx] : '';

              // ── SVG scene: input specimen → process chamber → product ──
              // Deterministic geometry only (index-driven, never Math.random), so a
              // re-render at the same progress redraws exactly the same frame.
              var rcScene = function () {
                var W = 340, H = 124;
                var inX = 6, outX = 248, swW = 86, swY = 26, swH = 70;
                var agentId = mAgent ? mAgent.id : null;
                var outFamily = liveRec ? liveRec.family : 'igneous';
                var outTexture = liveRec ? liveRec.texture : 'crystalline';
                var inOpacity = prog < 50 ? 1 : Math.max(0.18, 1 - (prog - 50) / 50);
                var outOpacity = prog <= 50 ? 0 : (prog - 50) / 50;
                var fx = [];
                var i;
                var midX = 104, midW = 132;

                // Chamber shell
                fx.push(h('rect', { key: 'chamber', x: midX, y: swY - 6, width: midW, height: swH + 12, rx: 9, fill: '#0f172a', opacity: 0.06, stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 3' }));

                if (agentId === 'melting_cooling') {
                  // Rising melt: blobs climb and brighten with progress.
                  for (i = 0; i < 9; i++) {
                    var ph = ((prog * 1.6) + i * 34) % 100;
                    var bx = midX + 14 + ((i * 29) % (midW - 28));
                    var by = swY + swH - (ph / 100) * (swH - 6);
                    fx.push(h('circle', { key: 'melt' + i, cx: bx, cy: by, r: 2.6 + (i % 3), fill: i % 2 ? '#f59e0b' : '#ef4444', opacity: 0.25 + 0.55 * (prog / 100) * (1 - ph / 140) }));
                  }
                  fx.push(h('rect', { key: 'pool', x: midX + 6, y: swY + swH - 12, width: midW - 12, height: 10, rx: 5, fill: '#dc2626', opacity: 0.15 + 0.5 * (prog / 100) }));
                } else if (agentId === 'heat_pressure') {
                  // Opposing squeeze: arrows converge as progress rises.
                  //
                  // The two arrowheads used to point AWAY from each other —
                  // outward, at the top and bottom edges. That is tension, the
                  // opposite of what "Heat & Press" means, on the tool's central
                  // animation for metamorphism. Their POSITIONS converged, which
                  // is what the comment described and what made it look right at
                  // a glance; only the heads were reversed.
                  //
                  // The raw path has its tip at the anchor and its shaft ABOVE,
                  // so un-rotated it points down. Anchoring the top arrow at the
                  // low end of its footprint and rotating the bottom one about
                  // its own tip keeps both footprints exactly where they were and
                  // turns both heads inward.
                  var sq = (prog / 100) * 14;
                  var arrX = midX + midW / 2;
                  var topTip = swY + 12 + sq;
                  var botTip = swY + swH - 12 - sq;
                  fx.push(h('path', { key: 'arrTop', d: 'M' + arrX + ',' + topTip + ' l-9,-9 h5 v-7 h8 v7 h5 z', fill: '#b45309', opacity: 0.85 }));
                  fx.push(h('path', { key: 'arrBot', d: 'M' + arrX + ',' + botTip + ' l-9,-9 h5 v-7 h8 v7 h5 z', fill: '#b45309', opacity: 0.85, transform: 'rotate(180 ' + arrX + ' ' + botTip + ')' }));
                  for (i = 0; i < 5; i++) {
                    var wy = swY + 12 + i * ((swH - 24) / 4);
                    fx.push(h('path', { key: 'sq' + i, d: 'M' + (midX + 14) + ',' + wy + ' Q' + (midX + midW / 2) + ',' + (wy - 4 - (prog / 100) * 5) + ' ' + (midX + midW - 14) + ',' + wy, fill: 'none', stroke: '#f97316', strokeWidth: 1.6, opacity: 0.3 + 0.5 * (prog / 100) }));
                  }
                } else if (agentId === 'weathering_erosion') {
                  // Rain plus grains detaching and settling into a growing bed.
                  for (i = 0; i < 10; i++) {
                    var rp = ((prog * 2.1) + i * 27) % 100;
                    var rx = midX + 12 + ((i * 31) % (midW - 24));
                    fx.push(h('line', { key: 'rain' + i, x1: rx, y1: swY + (rp / 100) * (swH - 16), x2: rx - 2, y2: swY + (rp / 100) * (swH - 16) + 7, stroke: '#0ea5e9', strokeWidth: 1.4, opacity: 0.45 }));
                  }
                  for (i = 0; i < 12; i++) {
                    var gp = ((prog * 1.4) + i * 23) % 100;
                    fx.push(h('circle', { key: 'grain' + i, cx: midX + 16 + ((i * 37) % (midW - 32)), cy: swY + 6 + (gp / 100) * (swH - 18), r: 1.5, fill: '#a16207', opacity: 0.65 }));
                  }
                  fx.push(h('rect', { key: 'bed', x: midX + 8, y: swY + swH - 4 - (prog / 100) * 9, width: midW - 16, height: 4 + (prog / 100) * 9, rx: 2, fill: '#b45309', opacity: 0.5 }));
                } else {
                  // #cbd5e1 on the slate-50 panel is 1.42:1 — the machine's own
                  // call to action was the palest thing on the screen, and it is
                  // the one instruction a student needs before anything happens.
                  // #475569 is 6.4:1 on the same panel and matches the family
                  // captions above and below it.
                  fx.push(h('text', { key: 'hint', x: midX + midW / 2, y: swY + swH / 2 + 4, textAnchor: 'middle', fontSize: '10', fontWeight: '600', fill: '#475569' }, __alloT('stem.rocks.machine_pick_agent', 'Pick an agent of change')));
                }

                return h('svg', {
                  viewBox: '0 0 ' + W + ' ' + H,
                  width: '100%',
                  role: 'img',
                  'aria-label': (liveRec
                    ? liveSpec.label + ' ' + (mAgent ? mAgent.verb.toLowerCase() : '') + ' produces ' + liveRec.product + '. ' + (stageText ? 'Stage: ' + stageText + '.' : '')
                    : liveSpec.label + ' loaded. Choose an agent of change to begin.'),
                  className: 'block w-full h-auto',
                  style: { maxHeight: '190px' }
                },
                  // Input specimen. Deliberately rcSwatch and NOT the sibling's
                  // rkRockSwatch: the two are not duplicate renderers. rcSwatch
                  // tiles a fixed box to show grain FABRIC, which is what this
                  // machine teaches (and what the >90% coverage test pins for the
                  // "no pore space" claim); rkRockSwatch draws a hand-specimen
                  // silhouette for identification, which leaves most of the box
                  // empty. Swapping it dropped grain coverage to 23.6%.
                  rcSwatch(h, 'in', liveSpec.texture, liveSpec.family, inX + 4, swY, swW, swH, inOpacity),
                  h('text', { key: 'inLbl', x: inX + 4 + swW / 2, y: swY + swH + 15, textAnchor: 'middle', fontSize: '10', fontWeight: '700', fill: '#334155' }, liveSpec.label),
                  h('text', { key: 'inFam', x: inX + 4 + swW / 2, y: swY - 10, textAnchor: 'middle', fontSize: '8', fontWeight: '700', fill: '#475569' }, liveSpec.family.toUpperCase()),
                  // Process chamber
                  h('g', { key: 'fx' }, fx),
                  h('text', { key: 'agLbl', x: 104 + 66, y: swY - 10, textAnchor: 'middle', fontSize: '8', fontWeight: '700', fill: '#475569' }, mAgent ? mAgent.short.toUpperCase() : ''),
                  // Arrows
                  h('path', { key: 'a1', d: 'M96,' + (swY + swH / 2) + ' l0,-5 l8,5 l-8,5 z', fill: '#78716c' }),
                  h('path', { key: 'a2', d: 'M240,' + (swY + swH / 2) + ' l0,-5 l8,5 l-8,5 z', fill: '#78716c', opacity: prog > 50 ? 1 : 0.3 }),
                  // Product
                  outOpacity > 0 ? rcSwatch(h, 'out', outTexture, outFamily, outX, swY, swW, swH, outOpacity) : h('rect', { key: 'outGhost', x: outX, y: swY, width: swW, height: swH, rx: 7, fill: 'none', stroke: '#cbd5e1', strokeWidth: 1.5, strokeDasharray: '5 4' }),
                  h('text', { key: 'outLbl', x: outX + swW / 2, y: swY + swH + 15, textAnchor: 'middle', fontSize: '10', fontWeight: '700', fill: outOpacity > 0.4 ? '#334155' : '#64748b' },
                    outOpacity > 0.4 && liveRec ? liveRec.product.split(' → ')[0].split(' or ')[0] : '?'),
                  h('text', { key: 'outFam', x: outX + swW / 2, y: swY - 10, textAnchor: 'middle', fontSize: '8', fontWeight: '700', fill: '#475569' }, outOpacity > 0.4 && liveRec ? liveRec.family.toUpperCase() : '')
                );
              };

              // ── Run handler ──
              var runMachine = function () {
                if (d.transformationAnimActive) return;
                if (!mAgent) return;
                var rec = rcLookup(mSpecId, mAgent.id);
                if (!rec) return;

                rcStopTransformTimer();

                if (mAgent.id === 'melting_cooling') sfxRockMelt();
                else if (mAgent.id === 'heat_pressure') sfxRockCrack();
                else sfxRockCool();

                var runRec = Object.assign({}, rec, { fromId: mSpecId, fromLabel: mSpec.label, agentId: mAgent.id, agentShort: mAgent.short });

                // Every completion path routes through here, and the whole body is
                // guarded — a throw inside the award logic must never be able to
                // leave transformationAnimActive stuck TRUE again (that is exactly
                // how the old machine wedged: an unguarded ReferenceError at 100%
                // left the button permanently disabled).
                var finish = function () {
                  try {
                    // Functional update: `d` here is the click-time snapshot, so
                    // reading the run counter off it would drop concurrent writes.
                    setLabToolData(function (prev) {
                      var rc = Object.assign({}, (prev && prev.rockCycle) || {});
                      rc.transformationAnimActive = false;
                      rc.transformationProgress = 100;
                      rc.transformationResult = runRec;
                      rc.transformationRun = null;
                      rc.transformsRun = (rc.transformsRun || 0) + 1;
                      return Object.assign({}, prev, { rockCycle: rc });
                    });
                  } catch (e) {
                    try { upd('transformationAnimActive', false); } catch (e2) {}
                  }
                  try { awardCycleInteraction(); } catch (e) { console.error('[rockCycle] challenge award failed', e); }
                  try {
                    if (typeof announceToSR === 'function') {
                      announceToSR(mSpec.label + ' ' + mAgent.verb.toLowerCase() + ' produced ' + rec.product + '. ' + rec.change);
                    }
                  } catch (e) {}
                };

                var reduced = false;
                try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}

                updMulti({
                  transformationAnimActive: !reduced,
                  transformationProgress: reduced ? 100 : 0,
                  transformationResult: null,
                  transformationRun: reduced ? null : runRec
                });

                // WCAG 2.3.3 — honour reduced motion by jumping straight to the result.
                if (reduced) { finish(); return; }

                var p = 0;
                _rcTransformTimer = setInterval(function () {
                  p += 5;
                  if (p >= 100) {
                    rcStopTransformTimer();
                    finish();
                  } else {
                    upd('transformationProgress', p);
                  }
                }, 100);
              };

              // Cross-tool challenge credit for using the cycle simulator. Kept in a
              // named function so runMachine's happy path stays readable, and so a
              // failure here cannot strand the machine.
              var awardCycleInteraction = function () {
                setLabToolData(function (prev) {
                  var r = Object.assign({}, (prev && prev.rocks) || {});
                  r.cycleInteractions = (r.cycleInteractions || 0) + 1;

                  var completed = r.completedChallenges || [];
                  var newlyCompleted = [];
                  var pointsEarned = 0;

                  for (var ci = 0; ci < ROCKS_CHALLENGES.length; ci++) {
                    var ch = ROCKS_CHALLENGES[ci];
                    if (completed.indexOf(ch.id) === -1 && ch.check(r)) {
                      newlyCompleted.push(ch);
                      pointsEarned += (ch.rp || 0);
                    }
                  }

                  if (newlyCompleted.length > 0) {
                    r.completedChallenges = completed.concat(newlyCompleted.map(function (c) { return c.id; }));
                    r.researchPoints = (r.researchPoints || 0) + pointsEarned;
                    r.totalRP = (r.totalRP || 0) + pointsEarned;
                    sfxRockCorrect();
                    if (typeof addToast === 'function') {
                      newlyCompleted.forEach(function (c) {
                        // addToast is (message, type) — the object form used here
                        // before rendered as "[object Object]" in the toast.
                        addToast('🏆 Challenge complete: ' + c.name + ' (+' + c.rp + ' RP)', 'success');
                      });
                    }
                  }
                  return Object.assign({}, prev, { rocks: r });
                });
              };

              var chip = function (key, label, value) {
                return h('div', { key: key, className: 'rounded-lg bg-white border border-orange-200 px-2.5 py-1.5' },
                  h('div', { className: 'text-[9px] font-black uppercase tracking-wide text-orange-800' }, label),
                  h('div', { className: 'text-[11px] font-semibold text-slate-800 leading-snug' }, value)
                );
              };

              return React.createElement("div", { "data-rc-machine": true, className: "mt-4 border-t border-slate-200 pt-3" },
                React.createElement("p", { className: "text-xs font-black text-orange-800 mb-1 flex items-center gap-1.5" + onHostInk },
                  React.createElement("span", { "aria-hidden": true }, "🔄"),
                  React.createElement("span", null, __alloT('stem.rocks.transformation_machine_title', "Rock Transformation Machine"))
                ),
                React.createElement("p", { className: "text-[11px] text-slate-700 mb-3" + onHostInk },
                  __alloT('stem.rocks.transformation_machine_intro2', "Load a named rock specimen, choose an agent of change, and run the machine. Each pairing produces a specific named product with its real conditions, timescale and field evidence.")
                ),

                // ── Controls ──
                React.createElement("div", { className: "grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] mb-3" },
                  React.createElement("div", null,
                    React.createElement("label", { htmlFor: "rc-machine-specimen", className: "block text-[10px] font-bold text-slate-700 uppercase mb-1" + onHostInk }, __alloT('stem.rocks.starting_specimen', "Starting specimen")),
                    React.createElement("select", {
                      id: "rc-machine-specimen",
                      value: mSpecId,
                      disabled: running,
                      onChange: function (e) { upd("startingRock", e.target.value); sfxRockClick(); },
                      className: "w-full p-1.5 text-xs border border-slate-500 rounded-lg bg-white font-bold text-slate-800 disabled:opacity-60"
                    },
                      RC_SPECIMENS.map(function (s) {
                        return React.createElement("option", { key: s.id, value: s.id }, s.label + ' (' + s.family + ')');
                      })
                    )
                  ),
                  React.createElement("div", null,
                    React.createElement("span", { id: "rc-agent-label", className: "block text-[10px] font-bold text-slate-700 uppercase mb-1" + onHostInk }, __alloT('stem.rocks.geological_agent', "Geological Agent")),
                    React.createElement("div", { className: "grid grid-cols-3 gap-1", role: "group", "aria-labelledby": "rc-agent-label" },
                      RC_AGENTS.map(function (agent) {
                        var isSel = d.geologicalAgent === agent.id;
                        return React.createElement("button", {
                          key: agent.id,
                          type: "button",
                          disabled: running,
                          "aria-pressed": isSel,
                          onClick: function () { upd("geologicalAgent", agent.id); sfxRockClick(); },
                          className: "px-1 py-1.5 rounded text-[10px] font-black text-center border transition-colors disabled:opacity-60 " +
                            (isSel ? "bg-orange-700 border-orange-800 text-white" : "bg-white border-slate-300 text-slate-700 hover:border-orange-500 hover:bg-orange-50")
                        }, agent.icon + ' ' + agent.short);
                      })
                    )
                  ),
                  React.createElement("div", { className: "flex items-end gap-1" },
                    React.createElement("button", {
                      type: "button",
                      disabled: running || !mAgent,
                      onClick: runMachine,
                      className: "flex-1 px-3 py-1.5 bg-orange-700 hover:bg-orange-800 text-white font-bold rounded-lg text-xs transition-colors disabled:opacity-50 active:scale-[0.97]"
                    }, running ? __alloT('stem.rocks.transforming_ellipsis', "Transforming...") : "⚡ " + __alloT('stem.rocks.transform_btn', "Transform!")),
                    (result || running) && React.createElement("button", {
                      type: "button",
                      title: __alloT('stem.rocks.machine_reset', "Reset machine"),
                      "aria-label": __alloT('stem.rocks.machine_reset', "Reset machine"),
                      onClick: function () {
                        rcStopTransformTimer();
                        updMulti({ transformationAnimActive: false, transformationProgress: 0, transformationResult: null, transformationRun: null });
                        sfxRockClick();
                      },
                      className: "px-2 py-1.5 rounded-lg text-xs font-bold border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                    }, "↺")
                  )
                ),

                // ── Pairing preview (before the run, so the choice is legible) ──
                mPreview && !result && !running && React.createElement("p", { className: "text-[11px] text-slate-700 mb-2" + onHostInk },
                  React.createElement("span", { className: "font-bold text-slate-900" + onHostInk }, mSpec.label),
                  " + " + (mAgent ? mAgent.short : '') + " → ",
                  React.createElement("span", { className: "font-bold text-orange-800" + onHostInk }, mPreview.product)
                ),

                // ── Visual scene ──
                React.createElement("div", { className: "rounded-xl border border-slate-300 bg-slate-50 p-2 mb-2" }, rcScene()),

                // ── Progress + stage caption ──
                (running || result) && React.createElement("div", { className: "mb-2" },
                  React.createElement("div", {
                    className: "w-full bg-slate-200 h-2.5 rounded-full overflow-hidden",
                    role: "progressbar",
                    "aria-valuenow": Math.round(prog),
                    "aria-valuemin": 0,
                    "aria-valuemax": 100,
                    "aria-label": __alloT('stem.rocks.transformation_progress_aria', "Transformation progress")
                  },
                    React.createElement("div", { className: "bg-orange-700 h-full transition-all duration-100", style: { width: prog + '%' } })
                  ),
                  stageText && React.createElement("p", { className: "mt-1 text-[11px] font-semibold text-slate-700" },
                    React.createElement("span", { className: "text-orange-800 font-black" }, (stageIdx + 1) + '/4 '), stageText)
                ),

                // ── Result ──
                result && React.createElement("div", { className: "p-3 bg-orange-50 border border-orange-300 rounded-lg animate-in slide-in-from-bottom" },
                  React.createElement("div", { className: "flex items-start gap-2 mb-2" },
                    React.createElement("span", { className: "text-2xl leading-none", "aria-hidden": true }, result.family === 'igneous' ? '🌋' : result.family === 'sedimentary' ? '🏖' : '💎'),
                    React.createElement("div", null,
                      React.createElement("p", { className: "text-sm font-black text-orange-900" }, (result.fromLabel || mSpec.label) + " → " + result.product),
                      React.createElement("p", { className: "text-[11px] font-bold text-slate-700" }, result.process)
                    )
                  ),
                  React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2" },
                    chip('cond', __alloT('stem.rocks.machine_conditions', "Conditions"), result.conditions),
                    chip('time', __alloT('stem.rocks.machine_timescale', "Timescale"), result.time)
                  ),
                  React.createElement("p", { className: "text-xs text-slate-800 leading-relaxed mb-2" },
                    React.createElement("span", { className: "font-black text-orange-900" }, __alloT('stem.rocks.machine_what_changes', "What changes: ")), result.change),
                  React.createElement("p", { className: "text-xs text-slate-800 leading-relaxed" },
                    React.createElement("span", { className: "font-black text-orange-900" }, __alloT('stem.rocks.machine_how_you_know', "How you'd know: ")), result.evidence),
                  result.caveat && React.createElement("p", { className: "mt-2 text-[11px] text-slate-800 leading-relaxed bg-white border border-slate-300 rounded-lg p-2" },
                    React.createElement("span", { className: "font-black text-slate-900" }, __alloT('stem.rocks.machine_model_limit', "Model limit: ")), result.caveat)
                ),

                // Specimen note keeps the dropdown meaningful even before a run.
                !result && React.createElement("p", { className: "text-[11px] text-slate-700" + onHostInk },
                  React.createElement("span", { className: "font-bold text-slate-900" + onHostInk }, mSpec.label + ': '), mSpec.note)
              );
            })(),

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
                      a: __alloT('stem.rocks.rcopt_limestone_sedimentary', 'Limestone (sedimentary)'),
                      opts: [__alloT('stem.rocks.rcopt_granite_igneous_coarse', 'Granite (igneous, coarse)'), __alloT('stem.rocks.rcopt_limestone_sedimentary', 'Limestone (sedimentary)'), __alloT('stem.rocks.rcopt_basalt_igneous', 'Basalt (igneous)')],
                      concept: 'Metamorphic',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_granite_transforms_into_gneiss', 'Incorrect. Granite transforms into gneiss.'),
                        __alloT('stem.rocks.rc_correct_limestone_transforms_into_marble_under_metamorphism', 'Correct! Limestone transforms into marble under metamorphism.'),
                        __alloT('stem.rocks.rc_incorrect_basalt_transforms_into_greenstone_or_amphibolite', 'Incorrect. Basalt transforms into greenstone or amphibolite.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_what_breaks_rocks_into_sediment', 'What breaks rocks into sediment?'),
                      a: __alloT('stem.rocks.ls_weathering', 'Weathering & erosion'),
                      opts: [__alloT('stem.rocks.rcopt_heat_and_pressure_at_depth', 'Heat & pressure at depth'), __alloT('stem.rocks.ls_weathering', 'Weathering & erosion'), __alloT('stem.rocks.ls_melting', 'Melting')],
                      concept: 'Lithification',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_heat_and_pressure_trigger_metamorphic_alteration', 'Incorrect. Heat and pressure trigger metamorphic alteration.'),
                        __alloT('stem.rocks.rc_correct_wind_water_and_ice_weather_rocks_down', 'Correct! Wind, water, and ice weather rocks down into sediment particles.'),
                        __alloT('stem.rocks.rc_incorrect_melting_creates_magma_which_forms_igneous_rocks', 'Incorrect. Melting creates magma, which forms igneous rocks.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_what_must_happen_for_metamorphic_rock_to_become', 'What must happen for metamorphic rock to become igneous?'),
                      a: __alloT('stem.rocks.rcopt_it_must_melt_then_cool', 'It must melt, then cool'),
                      opts: [__alloT('stem.rocks.rcopt_it_must_be_weathered', 'It must be weathered'), __alloT('stem.rocks.rcopt_it_must_be_compressed_further', 'It must be compressed further'), __alloT('stem.rocks.rcopt_it_must_melt_then_cool', 'It must melt, then cool')],
                      concept: 'Crystallization',
                      wrongFeedback: [
                        __alloT('stem.rocks.rc_incorrect_weathering_turns_metamorphic_rocks_into_sedimentary_ones', 'Incorrect. Weathering turns metamorphic rocks into sedimentary ones.'),
                        __alloT('stem.rocks.rc_incorrect_compression_leads_to_metamorphism_not_igneous_rock', 'Incorrect. Compression leads to metamorphism, not igneous rock.'),
                        __alloT('stem.rocks.rc_correct_metamorphic_rocks_must_melt_into_magma_then', 'Correct! Metamorphic rocks must melt into magma, then cool and solidify.')
                      ]
                    },
                    {
                      q: __alloT('stem.rocks.rc_what_is_the_mohs_scale_used_to_measure', 'What is the Mohs scale used to measure?'),
                      a: __alloT('stem.rocks.rcopt_mineral_hardness', 'Mineral hardness'),
                      opts: [__alloT('stem.rocks.rcopt_rock_age', 'Rock age'), __alloT('stem.rocks.rcopt_mineral_hardness', 'Mineral hardness'), __alloT('stem.rocks.rcopt_crystal_size_and_shape', 'Crystal size and shape')],
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

                  // Draw from the questions NOT yet asked. A plain random pick
                  // over ten questions repeats constantly — pressing "Next
                  // Question" had a one-in-ten chance of serving the identical
                  // question straight back, and a ten-press run showed about six
                  // distinct ones. Refill once the bag is empty so the quiz
                  // never runs out.
                  var rcAsked = (d.rcQuiz && d.rcQuiz.asked) || [];
                  var rcPool = RC_QS.filter(function (item) { return rcAsked.indexOf(item.q) === -1; });
                  if (!rcPool.length) { rcAsked = []; rcPool = RC_QS; }
                  var q = rcPool[Math.floor(Math.random() * rcPool.length)];
                  upd('rcQuiz', { q: q.q, a: q.a, opts: q.opts, wrongFeedback: q.wrongFeedback, concept: q.concept, answered: false, score: (d.rcQuiz && d.rcQuiz.score) || 0, asked: rcAsked.concat([q.q]) });
                }, className: "px-3 py-1.5 rounded-lg text-xs font-bold " + (d.rcQuiz ? 'bg-orange-100 text-orange-700' : 'bg-orange-700 text-white') + " transition-all"
              }, d.rcQuiz ? "🔄 " + __alloT('stem.rocks.next_question', "Next Question") : "🧠 " + __alloT('stem.rocks.quiz_mode', "Quiz Mode")),

              d.rcQuiz && d.rcQuiz.score > 0 && React.createElement("span", { className: "ml-2 text-xs font-bold text-emerald-800" }, "⭐ " + d.rcQuiz.score + " " + __alloT('stem.rocks.correct_count_suffix', "correct")),

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
                    return React.createElement("div", { className: "p-2.5 rounded-lg bg-orange-100 border border-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3" },
                      React.createElement("div", { className: "flex-1" },
                        React.createElement("p", { className: "text-xs font-bold text-orange-800" }, "🔍 " + __alloT('stem.rocks.concept_focus_label', "Concept Focus: ") + rkVocabTerm(__alloT, d.rcQuiz.concept)),
                        React.createElement("p", { className: "text-[10px] text-slate-600 mt-0.5 leading-relaxed" }, rkVocabDef(__alloT, d.rcQuiz.concept))
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
                          if (typeof addToast === 'function') addToast('📖 Concept studied: ' + d.rcQuiz.concept + ' (+5 RP)', 'success');
                        },
                        className: "px-2 py-1 bg-orange-700 hover:bg-orange-800 text-white font-bold rounded text-[10px] shrink-0 self-start sm:self-center transition-all hover:scale-105 active:scale-[0.97]"
                      }, "📖 " + __alloT('stem.rocks.study_term', "Study Term (+5 RP)"))
                    );
                  })()
                )
              )
            ),

            React.createElement("button", { "aria-label": __alloT('stem.rocks.snapshot', "Snapshot"), onClick: () => { setToolSnapshots(prev => [...prev, { id: 'rc-' + Date.now(), tool: 'rockCycle', label: sel ? sel.label : t('stem.tools_menu.rock_cycle'), data: { ...d }, timestamp: Date.now() }]); addToast('\uD83D\uDCF8 Snapshot saved!', 'success'); }, className: "mt-3 ml-auto px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full hover:from-indigo-600 hover:to-purple-600 shadow-md hover:shadow-lg transition-all" }, "\uD83D\uDCF8 " + __alloT('stem.rocks.snapshot', "Snapshot"))

          );
      })();
    }
  });

})();
