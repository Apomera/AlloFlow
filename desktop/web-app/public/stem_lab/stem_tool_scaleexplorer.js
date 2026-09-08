// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Scale Explorer (powers of ten)
//
// One continuous zoom across ~42 orders of magnitude, from the observable
// universe down to a proton, in the spirit of the Eames "Powers of Ten"
// (1977) and the scale-of-the-universe toys that followed it. Those are all
// mouse-only Flash-era experiences; this one is built to be driven from the
// keyboard and read by a screen reader, because that is the point of this
// suite.
//
// HOW THE VIEW WORKS (and why it is honest)
//   focusExp   = log10(metres) of whatever sits at the centre of the screen.
//   x position = (log10(size) - focusExp) / DECADES_ACROSS, so equal spacing
//                on screen means equal RATIO. The horizontal axis is a real
//                log axis, which is the whole lesson.
//   diameter   = size / 10^focusExp * REF_PX, i.e. drawn to true relative
//                size. Something ten times bigger really is ten times wider.
// Nothing is scaled by a giant CSS transform, so there is no float-precision
// cliff at either end of 42 decades: every object's pixel size is computed
// directly from the difference of two logs.
//
// SIZES are the characteristic linear dimension (diameter, length or height,
// as stated per item) in metres. Where a value is genuinely uncertain or
// definition-dependent it carries a `note`, and the note is shown to the
// student rather than hidden — "how well do we actually know this?" is part
// of the subject, not a caveat to bury. Betelgeuse is the clearest case:
// published radii run from about 640 to about 887 solar radii.
//
// ACCESSIBILITY is not a layer on top here:
//   - the canvas is a labelled role="application" with arrow/+/- keys
//   - the "scale ladder" list is a complete non-visual path to every object,
//     and flying to one is a button press
//   - crossing a power of ten announces once, on the decade, never per frame
//   - every object has a written description, offered as text and read aloud
//     through the house player (ctx.callTTS, explicit action only)
// See tests/scale_explorer.test.js for the contract.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  // ── The ladder ────────────────────────────────────────────────────────
  // size: metres. dim: which dimension the size refers to.
  var ITEMS = [
    { id: 'universe', emoji: '🌌', name: 'The observable universe', size: 8.8e26, dim: 'across', group: 'cosmic',
      describe: 'Everything close enough that its light has had time to reach us since the universe began. It is not the whole universe, only the part we can possibly see.',
      note: 'About 93 billion light years across. It is wider than the age of the universe in light years because space itself has stretched while the light travelled.' },
    { id: 'laniakea', emoji: '🕸️', name: 'The Laniakea Supercluster', size: 4.9e24, dim: 'across', group: 'cosmic',
      describe: 'The sheet of about a hundred thousand galaxies our own galaxy drifts within, all of them streaming toward a common region.',
      note: 'About 520 million light years across, from the 2014 survey that first defined it.' },
    { id: 'virgo-sc', emoji: '🔷', name: 'The Virgo Supercluster', size: 3.1e23, dim: 'across', group: 'cosmic',
      describe: 'A smaller grouping of galaxy clusters, once thought to be our largest neighbourhood until Laniakea was mapped around it.' },
    { id: 'andromeda-dist', emoji: '📍', name: 'Distance to the Andromeda Galaxy', size: 2.4e22, dim: 'distance', group: 'cosmic',
      describe: 'How far away the nearest large galaxy is. This is a gap between things, not the size of a thing.' },
    { id: 'milkyway', emoji: '🌀', name: 'The Milky Way galaxy', size: 9.5e20, dim: 'across', group: 'cosmic',
      describe: 'Our own galaxy: a flat spiral of a few hundred billion stars, with our Sun about halfway out from the centre.',
      note: 'Roughly 100,000 light years across. The edge is fuzzy, so the number depends on where you decide the galaxy stops.' },
    { id: 'galactic-centre', emoji: '🎯', name: 'Distance to the centre of the Milky Way', size: 2.5e20, dim: 'distance', group: 'cosmic',
      describe: 'How far the Sun sits from the crowded middle of our own galaxy, where a supermassive black hole lies. This is a distance, not the size of a thing.',
      note: 'About 26,000 light years. Measuring it is hard because dust blocks the view straight toward the centre.' },
    { id: 'local-bubble', emoji: '🫧', name: 'The Local Bubble', size: 9.5e18, dim: 'across', group: 'cosmic',
      describe: 'A cavity in the gas between the stars, blown clear by supernovae over the last ten to twenty million years, with our Solar System drifting through the middle of it.',
      note: 'Roughly a thousand light years across, though it is lopsided rather than round and older estimates were much smaller.' },
    { id: 'orion-nebula', emoji: '☁️', name: 'The Orion Nebula', size: 7.6e17, dim: 'across', group: 'cosmic',
      describe: 'A glowing cloud of gas and dust where new stars are forming, visible as the middle "star" of Orion\'s sword.' },
    { id: 'alpha-cen-dist', emoji: '📍', name: 'Distance to the nearest star system', size: 4.1e16, dim: 'distance', group: 'cosmic',
      describe: 'How far it is to Alpha Centauri, the closest star system to the Sun. Again a gap, not a size.' },
    { id: 'oort', emoji: '🫧', name: 'The Oort Cloud', size: 1.5e16, dim: 'across', group: 'cosmic',
      describe: 'A vast shell of icy bodies thought to surround the Solar System far beyond the planets, and the source of long-period comets.',
      note: 'Inferred from comet orbits rather than seen directly, so its size is an estimate.' },
    { id: 'lightyear', emoji: '📏', name: 'One light year', size: 9.461e15, dim: 'distance', group: 'cosmic',
      describe: 'How far light travels in a year, and the ruler astronomers reach for once kilometres stop being useful. Light crosses this whole distance in the time Earth takes to go once around the Sun.' },
    { id: 'heliosphere', emoji: '🛡️', name: 'The heliosphere', size: 3.64e13, dim: 'across', group: 'cosmic',
      describe: 'The bubble the Sun blows in the gas between the stars with its outgoing wind of particles. Crossing its edge is the closest thing there is to leaving the Sun behind.',
      note: 'Voyager 1 crossed the edge in 2012 at 121.6 times the Earth-Sun distance, and Voyager 2 in 2018 at about 119, in a different direction.' },
    { id: 'solar-system', emoji: '🪐', name: 'The Solar System', size: 9.0e12, dim: 'across', group: 'cosmic',
      describe: 'The Sun and its planets, measured across the orbit of Neptune, the outermost planet.' },
    { id: 'betelgeuse', emoji: '🔴', name: 'The star Betelgeuse', size: 1.06e12, dim: 'across', group: 'cosmic',
      describe: 'A red supergiant in Orion. If it replaced the Sun, it would swallow the orbits of the inner planets.',
      note: 'Genuinely uncertain: published radii run from about 640 to about 887 times the Sun\'s. Even famous stars are hard to measure.' },
    { id: 'au', emoji: '📍', name: 'Distance from the Earth to the Sun', size: 1.496e11, dim: 'distance', group: 'cosmic',
      describe: 'One astronomical unit, the standard yardstick for distances inside the Solar System.' },
    { id: 'sun', emoji: '☀️', name: 'The Sun', size: 1.392e9, dim: 'across', group: 'cosmic',
      describe: 'Our star, a ball of hot plasma held together by its own gravity. About 109 Earths would fit side by side across it, and it holds more than 99 per cent of all the mass in the Solar System.' },
    { id: 'jupiter', emoji: '🟠', name: 'Jupiter', size: 1.43e8, dim: 'across', group: 'cosmic',
      describe: 'The largest planet in the Solar System, a ball of gas with no solid surface to stand on.' },
    { id: 'earth', emoji: '🌍', name: 'The Earth', size: 1.2742e7, dim: 'across', group: 'cosmic',
      describe: 'Our planet, measured through the equator. It is very slightly wider than it is tall.' },
    { id: 'moon', emoji: '🌕', name: 'The Moon', size: 3.475e6, dim: 'across', group: 'cosmic',
      describe: 'Earth\'s only natural satellite, a little over a quarter of Earth\'s width. It is large enough, relative to its planet, that some astronomers call the pair a double system.' },
    { id: 'reef', emoji: '🪸', name: 'The Great Barrier Reef', size: 2.3e6, dim: 'long', group: 'earth',
      describe: 'The largest structure built by living things, a chain of thousands of reefs off the Australian coast.' },
    { id: 'grand-canyon', emoji: '🏜️', name: 'The Grand Canyon', size: 4.46e5, dim: 'long', group: 'earth',
      describe: 'A gorge cut by a river through rock layers that record roughly two billion years of Earth history.' },
    { id: 'chicxulub', emoji: '☄️', name: 'The Chicxulub crater', size: 1.8e5, dim: 'across', group: 'earth',
      describe: 'The buried scar of the asteroid impact that coincides with the extinction of the non-bird dinosaurs, most of it now under the sea off the Yucatan coast. It is invisible from the ground and was found from small variations in gravity.' },
    { id: 'everest', emoji: '🏔️', name: 'Mount Everest', size: 8849, dim: 'tall', group: 'earth',
      describe: 'The highest point on Earth above sea level, measured from sea level to the summit.' },
    { id: 'eiffel', emoji: '🗼', name: 'The Eiffel Tower', size: 330, dim: 'tall', group: 'built',
      describe: 'An iron lattice tower in Paris, for forty years the tallest structure people had built.' },
    { id: 'pyramid', emoji: '🔺', name: 'The Great Pyramid of Giza', size: 230, dim: 'wide at the base', group: 'built',
      describe: 'A stone pyramid built about 4,500 years ago, and the only one of the ancient wonders still standing.' },
    { id: 'football-pitch', emoji: '🥅', name: 'A football pitch', size: 105, dim: 'long', group: 'built',
      describe: 'A standard association football field, useful because so many people can picture one.' },
    { id: 'liberty', emoji: '🗽', name: 'The Statue of Liberty', size: 93, dim: 'tall', group: 'built',
      describe: 'A copper statue on an island in New York harbour, measured from the base of the pedestal to the tip of the torch. The copper skin is only about two millimetres thick.' },
    { id: 'sequoia', emoji: '🌲', name: 'A giant sequoia', size: 84, dim: 'tall', group: 'life',
      describe: 'Among the largest living things on Earth by volume. This is roughly the height of the tree called General Sherman.' },
    { id: 'blue-whale', emoji: '🐋', name: 'A blue whale', size: 25, dim: 'long', group: 'life',
      describe: 'The largest animal known to have lived, larger than any dinosaur yet found. Its heart alone is roughly the size of a small car, and it feeds on some of the smallest animals in the sea.',
      note: 'Adults commonly reach 24 to 30 metres, so this is a typical length rather than a maximum.' },
    { id: 'trex', emoji: '🦖', name: 'A Tyrannosaurus rex', size: 12, dim: 'long', group: 'life',
      describe: 'Measured nose to tail. Standing, it was only about four metres tall at the hip.' },
    { id: 'giraffe', emoji: '🦒', name: 'A giraffe', size: 5.5, dim: 'tall', group: 'life',
      describe: 'The tallest living land animal. Its neck has the same number of bones as yours: seven.' },
    { id: 'elephant', emoji: '🐘', name: 'An African elephant', size: 3.2, dim: 'tall', group: 'life',
      describe: 'The largest living land animal, measured at the shoulder. Its ears are laced with blood vessels and work as radiators, shedding heat into the air.' },
    { id: 'door', emoji: '🚪', name: 'A doorway', size: 2.0, dim: 'tall', group: 'built',
      describe: 'A standard interior door, a handy everyday ruler you walk through several times a day.' },
    { id: 'human', emoji: '🧍', name: 'A person', size: 1.7, dim: 'tall', group: 'life',
      describe: 'An adult human of roughly average height. This is the scale everything else here is easiest to feel from.' },
    { id: 'basketball', emoji: '🏀', name: 'A basketball', size: 0.24, dim: 'across', group: 'built',
      describe: 'A regulation basketball, about a seventh of a person\'s height. It is a useful rung on this ladder because almost everyone has held one and knows how big it feels.' },
    { id: 'mouse', emoji: '🐭', name: 'A house mouse', size: 0.08, dim: 'long', group: 'life',
      describe: 'A house mouse, measured head to rump; the tail adds about as much again. It is roughly the smallest mammal most people ever see indoors.' },
    { id: 'egg', emoji: '🥚', name: 'A chicken egg', size: 0.057, dim: 'long', group: 'life',
      describe: 'A hen\'s egg: a single very large cell surrounded by its food store and a shell of calcium carbonate. It is by far the biggest single cell most people ever handle.' },
    { id: 'honeybee', emoji: '🐝', name: 'A honeybee', size: 0.013, dim: 'long', group: 'life',
      describe: 'A worker honeybee. It navigates by the position of the sun and by the pattern of polarised light in the sky, which it can see and we cannot.' },
    { id: 'rice', emoji: '🌾', name: 'A grain of rice', size: 0.007, dim: 'long', group: 'life',
      describe: 'A single seed, and one of the most common objects on Earth used for guessing at small sizes.' },
    { id: 'ladybird', emoji: '🐞', name: 'A ladybird beetle', size: 0.006, dim: 'long', group: 'life',
      describe: 'A small beetle whose bright spotted pattern warns predators that it tastes unpleasant. Its hard outer wing cases fold down over the flying wings underneath.' },
    { id: 'flea', emoji: '🦟', name: 'A flea', size: 0.002, dim: 'long', group: 'life',
      describe: 'A wingless insect that jumps many times its own body length using a spring of stored elastic protein.' },
    { id: 'sand', emoji: '🏖️', name: 'A grain of sand', size: 5e-4, dim: 'across', group: 'earth',
      describe: 'A single sand grain, small enough that a handful holds tens of thousands of them.',
      note: 'Geologists define sand by size: anything from 0.0625 to 2 millimetres. This is a middling grain.' },
    { id: 'dust-mite', emoji: '🕷️', name: 'A dust mite', size: 3e-4, dim: 'long', group: 'life',
      describe: 'A tiny relative of spiders that lives in bedding and carpets and eats flakes of shed skin.' },
    { id: 'paramecium', emoji: '🦠', name: 'A paramecium', size: 2e-4, dim: 'long', group: 'life',
      describe: 'A single-celled pond organism that swims by beating thousands of tiny hairs, and is just visible without a microscope.' },
    { id: 'hair', emoji: '〰️', name: 'The width of a human hair', size: 7e-5, dim: 'across', group: 'life',
      describe: 'The thickness of a single strand of hair, the classic everyday reference for "very thin". It sits right at the edge of what an unaided eye can pick out.',
      note: 'Hair varies a great deal, from about 17 to 180 micrometres. This is a middling strand.' },
    { id: 'pollen', emoji: '🌼', name: 'A pollen grain', size: 2.5e-5, dim: 'across', group: 'life',
      describe: 'A plant\'s package of genetic material, built with a tough patterned shell that survives for millions of years.' },
    { id: 'rbc', emoji: '🩸', name: 'A red blood cell', size: 7.5e-6, dim: 'across', group: 'life',
      describe: 'A flexible disc that carries oxygen. It squeezes through capillaries narrower than itself.' },
    { id: 'ecoli', emoji: '🧫', name: 'An E. coli bacterium', size: 2e-6, dim: 'long', group: 'life',
      describe: 'A rod-shaped bacterium that lives in the gut, and one of the most studied living things on Earth. Under good conditions it can divide about every twenty minutes.' },
    { id: 'mitochondrion', emoji: '🫘', name: 'A mitochondrion', size: 1e-6, dim: 'long', group: 'life',
      describe: 'The part of your cells that releases usable energy. It carries its own separate DNA, a clue that it was once a free-living bacterium.' },
    { id: 'light', emoji: '🌈', name: 'A wavelength of green light', size: 5.5e-7, dim: 'long', group: 'physics',
      describe: 'One full wave of the light your eye is most sensitive to. Nothing smaller than about this can be resolved with an ordinary light microscope.',
      note: 'Visible light runs from roughly 380 nanometres (violet) to 700 (red). This is the green middle.' },
    { id: 'virus', emoji: '🦠', name: 'An influenza virus', size: 1e-7, dim: 'across', group: 'life',
      describe: 'A protein shell around a short strand of genetic instructions. Too small to see with a light microscope, and not clearly alive on its own.' },
    { id: 'ribosome', emoji: '⚙️', name: 'A ribosome', size: 2.5e-8, dim: 'across', group: 'life',
      describe: 'The molecular machine that reads genetic code and builds proteins from it. Every living cell has them.' },
    { id: 'dna', emoji: '🧬', name: 'The width of a DNA double helix', size: 2.4e-9, dim: 'across', group: 'life',
      describe: 'The thickness of the twisted ladder that stores genetic information. Its length is another matter entirely: about two metres of it is coiled inside almost every one of your cells.' },
    { id: 'water', emoji: '💧', name: 'A water molecule', size: 2.75e-10, dim: 'across', group: 'physics',
      describe: 'Two hydrogen atoms bonded to one oxygen, bent rather than straight, which is why water behaves so strangely.' },
    { id: 'carbon', emoji: '⚫', name: 'A carbon atom', size: 1.4e-10, dim: 'across', group: 'physics',
      describe: 'The atom that life is built around, because it bonds readily in four directions at once.',
      note: 'An atom has no hard edge. This is twice the accepted atomic radius, which is itself a convention.' },
    { id: 'hydrogen', emoji: '⚪', name: 'A hydrogen atom', size: 1.06e-10, dim: 'across', group: 'physics',
      describe: 'The simplest and most common atom in the universe: one proton with one electron around it.' },
    { id: 'xray', emoji: '🩻', name: 'An X-ray wavelength', size: 1e-11, dim: 'long', group: 'physics',
      describe: 'One wave of the light used to photograph bones. Its wavelength is close to the spacing between atoms in a crystal, which is exactly why bouncing X-rays off crystals reveals where the atoms sit.' },
    { id: 'gamma', emoji: '☢️', name: 'A gamma-ray wavelength', size: 1e-12, dim: 'long', group: 'physics',
      describe: 'One wave of the most energetic light there is, given off by radioactive decay and by violent events in space. The shorter the wave, the more energy each packet of light carries.',
      note: 'Gamma rays have no single wavelength; they are defined by being shorter than about ten picometres, so this is one point on an open-ended range.' },
    { id: 'nucleus', emoji: '🔵', name: 'The nucleus of a gold atom', size: 1.4e-14, dim: 'across', group: 'physics',
      describe: 'Almost all of an atom\'s mass, packed into a speck about ten thousand times narrower than the atom itself. Atoms are overwhelmingly empty space.' },
    { id: 'proton', emoji: '🔴', name: 'A proton', size: 1.68e-15, dim: 'across', group: 'physics',
      describe: 'One of the particles in an atomic nucleus. Below about this size, "how wide is it?" stops having a clear answer.',
      note: 'Measured as twice the charge radius. A proton has no surface, so its size is defined by how its charge is spread out.' }
  ];

  var MIN_EXP = -16.2, MAX_EXP = 27.6;   // a little past the smallest and largest items
  var DECADES_ACROSS = 3.2;              // how many powers of ten span the canvas width
  var HUMAN = 1.7;

  function log10(v) { return Math.log(v) / Math.LN10; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function fmt(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; }); }

  var SUPERSCRIPT = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function powerLabel(n) {
    return '10' + String(n).split('').map(function (ch) { return SUPERSCRIPT[ch] || ch; }).join('') + ' m';
  }

  // Big counts in words. "93 billion light years" is a number a person can hold;
  // "93013423528 light years" is a wall of digits that teaches nothing.
  function bigCount(v) {
    var a = Math.abs(v);
    if (a >= 1e12) return round2(v / 1e12) + ' trillion';
    if (a >= 1e9) return round2(v / 1e9) + ' billion';
    if (a >= 1e6) return round2(v / 1e6) + ' million';
    if (a >= 1e4) return String(Math.round(v / 1e3)) + ' thousand';
    return round2(v);
  }
  // A length in words, in the unit a person would actually use at that scale.
  function humanLength(m) {
    var a = Math.abs(m);
    // A light year and up gets word-scaled ("93 billion light years"); the
    // stretch below that still reads best in light years, but as a fraction.
    if (a >= 9.461e15) return bigCount(m / 9.461e15) + ' light years';
    if (a >= 1e14) return round2(m / 9.461e15) + ' light years';
    if (a >= 1.496e11) return bigCount(m / 1.496e11) + ' times the Earth–Sun distance';
    if (a >= 1000) return bigCount(m / 1000) + ' km';
    if (a >= 1) return round2(m) + ' m';
    if (a >= 0.01) return round2(m * 100) + ' cm';
    if (a >= 1e-3) return round2(m * 1000) + ' mm';
    if (a >= 1e-6) return round2(m * 1e6) + ' µm';
    if (a >= 1e-9) return round2(m * 1e9) + ' nm';
    if (a >= 1e-12) return round2(m * 1e12) + ' pm';
    return round2(m * 1e15) + ' fm';
  }
  // Mid-sentence, "A person" and "The Earth" need their article lowered.
  function lowerArticle(name) {
    return /^(A|An|The) /.test(name) ? name.charAt(0).toLowerCase() + name.slice(1) : name;
  }
  function round2(v) {
    var a = Math.abs(v);
    var d = a >= 100 ? 0 : a >= 10 ? 1 : 2;
    return String(Number(v.toFixed(d)));
  }
  // "about 60 million times" beats "6.0e7 times" for a ten-year-old. Past a
  // thousand trillion the word names stop helping ("1012 trillion times" is
  // noise), and in a powers-of-ten tool the power itself is the better answer.
  function timesPhrase(ratio) {
    if (ratio < 10) return round2(ratio) + ' times';
    if (ratio < 1e4) return String(Math.round(ratio)) + ' times';
    if (ratio >= 1e15) return 'ten to the power ' + Math.round(log10(ratio)) + ' times';
    var units = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million'], [1e3, 'thousand']];
    for (var i = 0; i < units.length; i++) {
      if (ratio >= units[i][0]) return round2(ratio / units[i][0]) + ' ' + units[i][1] + ' times';
    }
    return String(Math.round(ratio)) + ' times';
  }

  function palette(theme) {
    if (theme === 'light') return { bg: '#f8fafc', panel: '#ffffff', panel2: '#f1f5f9', line: '#64748b', text: '#0f172a', dim: '#475569', accent: '#1d4ed8', accentBtn: '#1d4ed8', accentFg: '#ffffff', ok: '#047857', warn: '#92400e', selBg: '#dbeafe', selFg: '#1e3a8a', stage: '#0b1220', ring: '#93c5fd', ringHot: '#fbbf24', axis: '#cbd5e1', stageFg: '#f1f5f9' };
    if (theme === 'contrast') return { bg: '#000000', panel: '#000000', panel2: '#0a0a0a', line: '#fbbf24', text: '#ffffff', dim: '#ffffff', accent: '#fbbf24', accentBtn: '#fbbf24', accentFg: '#000000', ok: '#00ff66', warn: '#ffff00', selBg: '#fbbf24', selFg: '#000000', stage: '#000000', ring: '#ffffff', ringHot: '#ffff00', axis: '#ffffff', stageFg: '#ffffff' };
    return { bg: '#0f172a', panel: '#1e293b', panel2: '#273449', line: '#334155', text: '#e2e8f0', dim: '#94a3b8', accent: '#38bdf8', accentBtn: '#0369a1', accentFg: '#ffffff', ok: '#4ade80', warn: '#fbbf24', selBg: '#0c4a6e', selFg: '#e0f2fe', stage: '#070b16', ring: '#38bdf8', ringHot: '#fbbf24', axis: '#475569', stageFg: '#e2e8f0' };
  }

  window.StemLab.registerTool('scaleExplorer', {
    icon: '🪆',
    label: 'Scale Explorer',
    desc: 'Zoom smoothly across 42 powers of ten, from the observable universe down to a proton, seeing what lives at every scale. Equal steps across the screen mean equal ratios, so "ten times bigger" always looks the same distance. Compare any two things and find out how many of one fit across the other. Fully keyboard-drivable, with a written description of everything.',
    color: 'violet',
    category: 'science',
    aliases: ['powers of ten', 'orders of magnitude', 'scale of the universe', 'size comparison', 'logarithmic'],
    questHooks: [
      { id: 'scale_travel', label: 'Travel across ten powers of ten', icon: '🔭',
        check: function (d) { return !!(d && (d.decadesSeen || 0) >= 10); } },
      { id: 'scale_compare', label: 'Compare the size of two things', icon: '⚖️',
        check: function (d) { return !!(d && (d.compareCount || 0) >= 1); } },
      { id: 'scale_read', label: 'Read about something you found', icon: '📖',
        check: function (d) { return !!(d && (d.readCount || 0) >= 1); } },
      { id: 'scale_estimate', label: 'Estimate a gap before checking it', icon: '🎯',
        check: function (d) { return !!(d && (d.estimateCount || 0) >= 1); } }
    ],
    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var theme = ctx.theme === 'light' || ctx.theme === 'contrast' ? ctx.theme : 'dark';
      var P = palette(theme);
      var slice = (ctx.toolData && ctx.toolData._scaleExplorer) || {};
      // The host does not provide ctx.lang; the app's actual signal is a global.
      var uiLang = ctx.lang || (typeof window !== 'undefined' ? window.__alloTextLanguage : null) || 'en';

      function S(key, fb, vars) { var v = t('stem.scaleExplorer.' + key, fb); return vars ? fmt(v, vars) : v; }
      function itemText(item, field, fb) { return t('stem.scaleExplorer.item_' + item.id.replace(/-/g, '_') + '_' + field, fb != null ? fb : item[field]); }
      function say(text) { if (ctx.announceToSR && text) ctx.announceToSR(text); }

      var _focus = React.useState('human'); var focusId = _focus[0], setFocusId = _focus[1];
      var _exp = React.useState(log10(HUMAN)); var exp = _exp[0], setExp = _exp[1];
      var _cmpA = React.useState('human'); var cmpA = _cmpA[0], setCmpA = _cmpA[1];
      var _cmpB = React.useState('rbc'); var cmpB = _cmpB[0], setCmpB = _cmpB[1];
      var _speaking = React.useState(''); var speaking = _speaking[0], setSpeaking = _speaking[1];
      var _journey = React.useState(0); var journey = _journey[0], setJourney = _journey[1];
      var journeyRef = React.useRef(null);
      var journeyDirRef = React.useRef(0);
      var _showLadder = React.useState(true); var showLadder = _showLadder[0], setShowLadder = _showLadder[1];
      var _pair = React.useState({ big: 'earth', small: 'human' }); var pair = _pair[0], setPair = _pair[1];
      var _guess = React.useState(''); var guess = _guess[0], setGuess = _guess[1];
      var _revealed = React.useState(false); var revealed = _revealed[0], setRevealed = _revealed[1];

      var canvasRef = React.useRef(null);
      var readoutRef = React.useRef(null);
      var scrubRef = React.useRef(null);
      // Guarding the repaint on FOCUS was wrong: a slider keeps focus long after
      // the student stops touching it, and the thumb then froze while the camera
      // moved on. The paint must only stand back while a pointer is actually
      // down on the thumb; under the keyboard the thumb should follow.
      var scrubDragRef = React.useRef(false);
      var wrapRef = React.useRef(null);
      var targetRef = React.useRef(log10(HUMAN));
      var expRef = React.useRef(log10(HUMAN));
      var rafRef = React.useRef(0);
      var lastDecadeRef = React.useRef(Math.round(log10(HUMAN)));
      var nearestRef = React.useRef('human');
      var intentRef = React.useRef(null);
      var speakTokenRef = React.useRef(0);
      var speakTimerRef = React.useRef(null);
      var descId = React.useMemo(function () { return 'sx-desc-' + Math.random().toString(36).slice(2, 8); }, []);

      var sorted = React.useMemo(function () {
        return ITEMS.slice().sort(function (a, b) { return b.size - a.size; });
      }, []);
      var byId = React.useMemo(function () {
        var m = {}; ITEMS.forEach(function (i) { m[i.id] = i; }); return m;
      }, []);
      var focused = byId[focusId] || byId.human;

      function updateSlice(fn) {
        setLabToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._scaleExplorer) || {});
          fn(cur);
          var next = Object.assign({}, prev); next._scaleExplorer = cur; return next;
        });
      }
      function noteDecade(d) {
        updateSlice(function (cur) {
          var seen = Object.assign({}, cur.decades || {});
          if (!seen[d]) { seen[d] = 1; cur.decades = seen; cur.decadesSeen = Object.keys(seen).length; }
        });
      }

      // ── Camera ──────────────────────────────────────────────────────────
      var reduceMotion = React.useMemo(function () {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
      }, []);
      function goTo(nextExp, opts) {
        opts = opts || {};
        var target = clamp(nextExp, MIN_EXP, MAX_EXP);
        targetRef.current = target;
        if (reduceMotion || opts.instant) { expRef.current = target; settleExp(target); draw(); afterMove(); return; }
        if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
      }
      // Only the readout text changes while the camera is moving, so it is written
      // straight to its node. Going through React state instead re-rendered the
      // whole panel — a 53-row ladder and two 53-option selects — 34 times for a
      // single keypress, which is free on a laptop and is not free on a Chromebook.
      function paintReadout() {
        var el = readoutRef.current;
        if (el) el.textContent = viewLineFor(expRef.current);
        // Painted rather than bound, for the same reason as the readout: this
        // moves every frame and must not re-render the panel to do it.
        var sc = scrubRef.current;
        if (sc && !scrubDragRef.current) {
          sc.value = String(expRef.current);
          sc.setAttribute('aria-valuetext', viewLineFor(expRef.current));
        }
      }
      // React state catches up once, at rest, so anything that renders from exp
      // stays correct without paying for the frames in between.
      function settleExp(v) { intentRef.current = null; setExp(v); paintReadout(); }
      function step() {
        rafRef.current = 0;
        var cur = expRef.current, target = targetRef.current;
        var d = target - cur;
        if (Math.abs(d) < 0.0015) { expRef.current = target; settleExp(target); draw(); afterMove(); return; }
        expRef.current = cur + d * 0.18;
        paintReadout();
        draw();
        afterMove();
        rafRef.current = requestAnimationFrame(step);
      }
      // One announcement per power of ten crossed, never one per frame: a live
      // region fed a running number talks over everything else the user does.
      function afterMove() {
        // Keep the panel honest: it says "in focus", so it has to be what is
        // actually in the middle of the view. Guarded on the nearest item
        // changing, so this costs a render per object passed, not per frame.
        if (!intentRef.current) {
          var near = nearestItem(expRef.current);
          if (near && near.id !== nearestRef.current) {
            nearestRef.current = near.id;
            setFocusId(near.id);
          }
        }
        var d = Math.round(expRef.current);
        if (d === lastDecadeRef.current) return;
        lastDecadeRef.current = d;
        noteDecade(d);
        var len = humanLength(Math.pow(10, d));
        say(Math.abs(d) <= 2
          ? S('decade_sr_near', 'Now at about {len}.', { len: len })
          : S('decade_sr', 'Now at ten to the power {n}, about {len}.', { n: d, len: len }));
      }
      function zoomBy(decades) { stopJourney(); goTo(targetRef.current + decades); }

      // The Eames film is a continuous outward journey, not a control panel. This
      // walks one power of ten at a time and names what lives at each, which is
      // the part a student cannot get by dragging.
      function nearestItem(e) {
        var best = null, bestD = Infinity;
        for (var i = 0; i < sorted.length; i++) {
          var d = Math.abs(log10(sorted[i].size) - e);
          if (d < bestD) { bestD = d; best = sorted[i]; }
        }
        return best;
      }
      function stopJourney() {
        if (journeyRef.current) { clearInterval(journeyRef.current); journeyRef.current = null; }
        if (journeyDirRef.current !== 0) { journeyDirRef.current = 0; setJourney(0); }
      }
      function startJourney(dir) {
        stopJourney();
        journeyDirRef.current = dir;
        setJourney(dir);
        var stepOnce = function () {
          var next = targetRef.current + dir;
          var atEnd = dir > 0 ? next >= MAX_EXP : next <= MIN_EXP;
          goTo(next);
          var here = nearestItem(clamp(next, MIN_EXP, MAX_EXP));
          if (here) setFocusId(here.id);
          if (atEnd) { stopJourney(); say(S('journey_end', 'That is as far as the ladder goes.')); }
        };
        stepOnce();
        // One decade every couple of seconds: long enough to read the name that
        // just came into view, short enough that the trip still feels like one.
        journeyRef.current = setInterval(stepOnce, 2400);
      }
      function flyTo(item, opts) {
        stopJourney();
        intentRef.current = item.id;
        nearestRef.current = item.id;
        setFocusId(item.id);
        goTo(log10(item.size), opts);
      }

      // ── Drawing ─────────────────────────────────────────────────────────
      function draw() {
        var cv = canvasRef.current; if (!cv) return;
        var parent = cv.parentElement; if (!parent) return;
        var cssW = Math.max(200, parent.clientWidth), cssH = Math.max(220, parent.clientHeight);
        var dpr = clamp(window.devicePixelRatio || 1, 1, 3);
        if (cv.width !== Math.round(cssW * dpr) || cv.height !== Math.round(cssH * dpr)) {
          cv.width = Math.round(cssW * dpr); cv.height = Math.round(cssH * dpr);
          cv.style.width = cssW + 'px'; cv.style.height = cssH + 'px';
        }
        var g = cv.getContext('2d'); if (!g) return;
        // setTransform is absolute, so a second call cannot compound the scale.
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        g.clearRect(0, 0, cssW, cssH);
        g.fillStyle = P.stage; g.fillRect(0, 0, cssW, cssH);

        var e = expRef.current;
        var pxPerDecade = cssW / DECADES_ACROSS;
        var refPx = Math.min(cssW, cssH) * 0.42;
        var axisY = cssH - 26;
        var midY = (cssH - 46) / 2 + 8;

        // Log axis: the ticks ARE the lesson, so they are drawn first and plainly.
        g.strokeStyle = P.axis; g.lineWidth = 1;
        g.beginPath(); g.moveTo(0, axisY); g.lineTo(cssW, axisY); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'top';
        g.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
        var first = Math.floor(e - DECADES_ACROSS / 2), last = Math.ceil(e + DECADES_ACROSS / 2);
        for (var n = first; n <= last; n++) {
          var tx = cssW / 2 + (n - e) * pxPerDecade;
          if (tx < -40 || tx > cssW + 40) continue;
          g.strokeStyle = P.axis;
          g.beginPath(); g.moveTo(tx, axisY - 5); g.lineTo(tx, axisY + 5); g.stroke();
          g.fillStyle = P.dim;
          g.fillText(powerLabel(n), tx, axisY + 8);
        }

        // Draw order and legibility, learned from the first render: at true
        // relative size an object one decade bigger than the focus is four
        // screens wide, and its emoji then covers everything. So an emoji is
        // only painted inside a legible band; anything larger is an arc and a
        // label, which is what actually carries the scale information.
        var cands = [];
        for (var i = 0; i < sorted.length; i++) {
          var it = sorted[i];
          var lg = log10(it.size);
          var dist = Math.abs(lg - e);
          if (dist > DECADES_ACROSS * 1.6) continue;
          var x = cssW / 2 + (lg - e) * pxPerDecade;
          var dia = it.size / Math.pow(10, e) * refPx;
          if (dia < 2.5 || x < -cssW * 0.6 || x > cssW * 1.6) continue;
          cands.push({ it: it, x: x, dia: dia, dist: dist });
        }
        // Closest to the focus is the most important, so it gets first claim on
        // label space and is painted last (on top).
        cands.sort(function (a, b) { return b.dist - a.dist; });

        var maxGlyph = Math.min(cssW, cssH) * 0.62;
        var labelBoxes = [];
        g.textBaseline = 'middle';
        for (var k = 0; k < cands.length; k++) {
          var c = cands[k], obj = c.it;
          var isFocus = obj.id === focusId;
          var fade = clamp(1 - (c.dist / (DECADES_ACROSS * 1.35)), 0.12, 1);
          var alpha = isFocus ? 1 : fade;

          g.globalAlpha = alpha;
          g.strokeStyle = isFocus ? P.ringHot : P.ring;
          g.lineWidth = isFocus ? 2.5 : 1.25;
          g.beginPath(); g.arc(c.x, midY, c.dia / 2, 0, Math.PI * 2); g.stroke();

          var glyph = c.dia * 0.7;
          if (glyph >= 10 && glyph <= maxGlyph) {
            g.globalAlpha = alpha * (isFocus ? 1 : 0.85);
            g.font = glyph + 'px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
            g.textAlign = 'center';
            g.fillText(obj.emoji, c.x, midY);
          }

          if (c.dia >= 30) {
            g.globalAlpha = alpha;
            g.font = (isFocus ? '700 ' : '500 ') + '12px system-ui, -apple-system, "Segoe UI", sans-serif';
            g.textAlign = 'center'; g.textBaseline = 'bottom';
            var nm = itemText(obj, 'name');
            var wpx = g.measureText(nm).width;
            var ly = midY - Math.min(c.dia / 2, maxGlyph / 2) - 8;
            if (ly < 16) ly = 16;
            var box = { x0: c.x - wpx / 2 - 6, x1: c.x + wpx / 2 + 6, y0: ly - 24, y1: ly + 2 };
            var clash = false;
            for (var b = 0; b < labelBoxes.length; b++) {
              var o = labelBoxes[b];
              if (box.x1 > o.x0 && box.x0 < o.x1 && box.y1 > o.y0 && box.y0 < o.y1) { clash = true; break; }
            }
            if (!clash || isFocus) {
              labelBoxes.push(box);
              g.fillStyle = isFocus ? P.ringHot : P.stageFg;
              g.fillText(nm, c.x, ly);
              g.font = '500 11px system-ui, -apple-system, "Segoe UI", sans-serif';
              g.fillStyle = P.dim;
              g.fillText(humanLength(obj.size), c.x, ly + 13);
            }
            g.textBaseline = 'middle';
          }
          g.globalAlpha = 1;
        }
      }

      React.useEffect(function () {
        draw();
        var onResize = function () { draw(); };
        window.addEventListener('resize', onResize);
        return function () {
          window.removeEventListener('resize', onResize);
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (journeyRef.current) clearInterval(journeyRef.current);
          clearTimeout(speakTimerRef.current);
        };
      }, []);
      React.useEffect(function () { draw(); }, [theme, focusId, uiLang]);

      // ── Keyboard on the canvas ──────────────────────────────────────────
      function onCanvasKey(ev) {
        var k = ev.key;
        var big = ev.shiftKey ? 1 : 0.25;
        if (k === 'ArrowRight' || k === 'ArrowUp' || k === '+' || k === '=') { ev.preventDefault(); zoomBy(big); return; }
        if (k === 'ArrowLeft' || k === 'ArrowDown' || k === '-' || k === '_') { ev.preventDefault(); zoomBy(-big); return; }
        if (k === 'PageUp') { ev.preventDefault(); zoomBy(3); return; }
        if (k === 'PageDown') { ev.preventDefault(); zoomBy(-3); return; }
        if (k === 'Home') { ev.preventDefault(); flyTo(byId.human); return; }
        if (k === 'End') { ev.preventDefault(); goTo(MAX_EXP); return; }
      }
      function onWheel(ev) {
        ev.preventDefault();
        goTo(targetRef.current + (ev.deltaY > 0 ? -0.22 : 0.22));
      }

      // ── Read aloud (explicit action only; hidden when the host cannot) ──
      function speak(key, text) {
        if (typeof ctx.callTTS !== 'function' || !text || speaking) return;
        var token = ++speakTokenRef.current;
        var settle = function (failed) {
          if (speakTokenRef.current !== token) return;
          clearTimeout(speakTimerRef.current);
          setSpeaking('');
          if (failed) say(S('read_aloud_failed', 'Read-aloud is not available right now.'));
        };
        setSpeaking(key);
        clearTimeout(speakTimerRef.current);
        speakTimerRef.current = setTimeout(function () { settle(true); }, 30000);
        Promise.resolve(ctx.callTTS(String(text), null, null, { force: true }))
          .then(function (url) { settle(!url); })
          .catch(function () { settle(true); });
      }
      function speakBtn(key, text) {
        if (typeof ctx.callTTS !== 'function' || !text) return null;
        var busy = speaking === key;
        return h('button', { type: 'button', onClick: function () { speak(key, text); }, disabled: busy,
          'aria-label': S('read_aloud', 'Read this aloud'), title: S('read_aloud', 'Read this aloud'),
          style: Object.assign({}, btn, { padding: '4px 8px', fontSize: '0.6875rem' }, busy ? { opacity: 0.6, cursor: 'progress' } : null) },
          busy ? '🔊 ' + S('read_aloud_busy', 'Speaking…') : '🔊');
      }

      // ── Compare ─────────────────────────────────────────────────────────
      var compare = React.useMemo(function () {
        var a = byId[cmpA], b = byId[cmpB];
        if (!a || !b) return null;
        var big = a.size >= b.size ? a : b, small = a.size >= b.size ? b : a;
        var ratio = big.size / small.size;
        return { big: big, small: small, ratio: ratio, decades: log10(ratio) };
      }, [cmpA, cmpB]);
      // ── Estimate first ──────────────────────────────────────────────────
      // Every other tool in this lab makes the student commit to a guess before
      // it shows an answer. Browsing alone does not build a feel for orders of
      // magnitude; being wrong by six decades once does.
      function pickPair() {
        for (var tries = 0; tries < 60; tries++) {
          var a = sorted[Math.floor(Math.random() * sorted.length)];
          var b = sorted[Math.floor(Math.random() * sorted.length)];
          if (a.id === b.id) continue;
          var gap = Math.abs(log10(a.size) - log10(b.size));
          // Under 2 decades is a coin flip; over 20 is unguessable rather than
          // instructive.
          if (gap < 2 || gap > 20) continue;
          return a.size >= b.size ? { big: a.id, small: b.id } : { big: b.id, small: a.id };
        }
        return { big: 'earth', small: 'human' };
      }
      function newChallenge() {
        setPair(pickPair());
        setGuess('');
        setRevealed(false);
      }
      function lockInEstimate() {
        if (revealed) return;
        var n = parseFloat(guess);
        if (!isFinite(n)) return;
        setRevealed(true);
        updateSlice(function (cur) { cur.estimateCount = (cur.estimateCount || 0) + 1; });
        say(estimateVerdict(n) + ' ' + challengeReveal());
      }
      var challenge = React.useMemo(function () {
        var big = byId[pair.big], small = byId[pair.small];
        if (!big || !small) return null;
        return { big: big, small: small, decades: log10(big.size / small.size), ratio: big.size / small.size };
      }, [pair]);
      function estimateVerdict(n) {
        if (!challenge) return '';
        var off = Math.abs(n - challenge.decades);
        // Never "wrong": say how close, then give the real number. Being two
        // decades out is a hundredfold error and worth naming plainly.
        if (off <= 0.5) return S('est_spot', 'Spot on.');
        if (off <= 1.5) return S('est_close', 'Close — within a power of ten or so.');
        return S('est_off', 'Not yet. You were {off} powers of ten out, which is a factor of {factor}.',
          { off: round2(off), factor: timesPhrase(Math.pow(10, off)).replace(' times', '') });
      }
      function challengeReveal() {
        if (!challenge) return '';
        return S('est_reveal', 'The gap is {dec} powers of ten: {big} is about {times} bigger across than {small}.',
          { dec: round2(challenge.decades), big: itemText(challenge.big, 'name'),
            times: timesPhrase(challenge.ratio), small: lowerArticle(itemText(challenge.small, 'name')) });
      }
      function runCompare() {
        if (!compare) return;
        updateSlice(function (cur) { cur.compareCount = (cur.compareCount || 0) + 1; });
        say(compareSentence());
      }
      function compareSentence() {
        if (!compare) return '';
        var bigName = itemText(compare.big, 'name');
        var smallName = lowerArticle(itemText(compare.small, 'name'));
        if (compare.ratio < 1.02) return S('cmp_same', '{a} and {b} are about the same size.', { a: bigName, b: smallName });
        // "bigger across" and not just "bigger": this is a ratio of lengths, so
        // saying it plainly avoids implying anything about volume or mass.
        return S('cmp_line', '{big} is about {times} bigger across than {small}. That is {dec} powers of ten.',
          { big: bigName, times: timesPhrase(compare.ratio), small: smallName, dec: round2(compare.decades) });
      }

      function openItem(item) {
        flyTo(item);
        updateSlice(function (cur) { cur.readCount = (cur.readCount || 0) + 1; });
      }

      // ── Styles ──────────────────────────────────────────────────────────
      var btn = { borderRadius: 8, padding: '7px 10px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', border: '1px solid ' + P.line, background: P.panel2, color: P.text };
      var goBtn = { borderRadius: 8, padding: '8px 12px', fontSize: '0.8125rem', fontWeight: 700, cursor: 'pointer', border: 'none', background: P.accentBtn, color: P.accentFg };
      var card = { background: P.panel2, border: '1px solid ' + P.line, borderRadius: 10, padding: '9px 11px', fontSize: '0.8125rem', lineHeight: 1.5, color: P.text };
      var sel = { background: P.bg, color: P.text, border: '1px solid ' + P.line, borderRadius: 8, padding: '6px 8px', fontSize: '0.8125rem', maxWidth: '100%' };

      function viewLineFor(e) {
        return S('view_line', 'You are looking at things about {len} across ({p}).',
          { len: humanLength(Math.pow(10, e)), p: powerLabel(Math.round(e)) });
      }
      var viewLine = viewLineFor(exp);
      // Past the ends of the ladder there is nothing to draw. That is not a bug
      // and it is not nothing: it is the edge of what is known, or the edge of
      // what "how wide is it?" still means. Say which.
      var biggest = sorted[0], smallest = sorted[sorted.length - 1];
      var edge = null;
      if (exp > log10(biggest.size) + 0.55) {
        edge = S('edge_big', 'You have zoomed out past everything. {name} is the largest thing here, because it is the largest thing anyone can see.',
          { name: itemText(biggest, 'name') });
      } else if (exp < log10(smallest.size) - 0.55) {
        edge = S('edge_small', 'You have zoomed in past everything. Below about the size of {name}, asking how wide something is stops having a clear answer.',
          { name: lowerArticle(itemText(smallest, 'name')) });
      }

      function itemOptions() {
        return sorted.map(function (i) { return h('option', { key: i.id, value: i.id }, itemText(i, 'name') + ' — ' + humanLength(i.size)); });
      }

      return h('div', { ref: wrapRef, className: 'flex flex-col gap-3 animate-in fade-in duration-300',
        // The host card is white in both themes and these inks assume slate.
        style: { background: P.bg, color: P.text, borderRadius: 14, padding: 14, minWidth: 0 } },

        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          typeof setStemLabTool === 'function' && h('button', { onClick: function () { setStemLabTool(null); say(S('returned_sr', 'Returned to the STEAM Lab tools.')); }, type: 'button', style: btn },
            ArrowLeft ? h(ArrowLeft, { size: 14, style: { display: 'inline', verticalAlign: '-2px', marginRight: 4 } }) : null,
            S('back_to_tools', 'Back to STEAM Lab tools')),
          h('h2', { style: { margin: 0, fontSize: '1.0625rem', fontWeight: 700, flex: '1 1 auto' } }, S('title', '🪆 Scale Explorer — powers of ten')),
          typeof window.__alloStemFS === 'function' ? h('button', { type: 'button', style: btn, onClick: function () { try { window.__alloStemFS(wrapRef.current); } catch (_) {} setTimeout(draw, 60); } }, S('fullscreen', '⛶ Fullscreen')) : null
        ),

        h('p', { style: { margin: 0, fontSize: '0.8125rem', color: P.dim, lineHeight: 1.55 } },
          S('blurb', 'Every step across the screen is one power of ten, so the same distance always means the same ratio. Zoom out far enough and the Earth is a dot; zoom in far enough and an atom fills the view.')),

        h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' } },

          // ── Stage ──
          h('div', { style: { flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 } },
            h('div', { style: { position: 'relative', height: 'min(52vh, 460px)', minHeight: 260, borderRadius: 12, border: '1px solid ' + P.line, overflow: 'hidden', background: P.stage } },
              h('canvas', { ref: canvasRef, tabIndex: 0, role: 'application',
                'aria-label': S('canvas_aria', 'Scale view. Left and right arrows zoom by a quarter of a power of ten, hold shift for a whole one, Page Up and Page Down jump three, Home returns to human scale.'),
                'aria-describedby': descId,
                onKeyDown: onCanvasKey, onWheel: onWheel,
                style: { display: 'block', width: '100%', height: '100%', outlineOffset: '-3px' } })
            ),
            h('p', { id: descId, ref: readoutRef, style: { margin: 0, fontSize: '0.8125rem', color: P.text, fontWeight: 600 } }, viewLine),
            edge ? h('p', { role: 'status', style: Object.assign({}, card, { margin: 0, borderColor: P.accent, fontSize: '0.78125rem' }) }, '🛑 ' + edge) : null,
            h('label', { style: { display: 'block', fontSize: '0.71875rem', color: P.dim } },
              S('scrub_label', 'Where you are, across all 44 powers of ten'),
              h('input', { type: 'range', ref: scrubRef, min: MIN_EXP, max: MAX_EXP, step: 0.1, defaultValue: exp,
                'aria-label': S('scrub_aria', 'Scale position, in powers of ten'),
                'aria-valuetext': viewLineFor(exp),
                onChange: function (e) { stopJourney(); goTo(parseFloat(e.target.value), { instant: true }); },
                onPointerDown: function () { scrubDragRef.current = true; },
                onPointerUp: function () { scrubDragRef.current = false; },
                onPointerCancel: function () { scrubDragRef.current = false; },
                onBlur: function () { scrubDragRef.current = false; },
                style: { width: '100%', marginTop: 4, accentColor: P.accent } })),
            h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
              h('button', { type: 'button', style: btn, onClick: function () { zoomBy(-1); }, 'aria-label': S('out_one', 'Zoom out one power of ten') }, '− 10×'),
              h('button', { type: 'button', style: btn, onClick: function () { zoomBy(1); }, 'aria-label': S('in_one', 'Zoom in one power of ten') }, '+ 10×'),
              h('button', { type: 'button', style: journey !== 0 ? Object.assign({}, btn, { borderColor: P.accent, color: P.accent }) : btn,
                'aria-pressed': journey !== 0 ? 'true' : 'false',
                onClick: function () { if (journey !== 0) { stopJourney(); say(S('journey_paused', 'Journey paused.')); } else { startJourney(1); } } },
                journey !== 0 ? S('journey_pause', '⏸ Pause the journey') : S('journey_out', '▶ Journey outward')),
              journey === 0 ? h('button', { type: 'button', style: btn, onClick: function () { startJourney(-1); } }, S('journey_in', '▶ Journey inward')) : null,
              h('button', { type: 'button', style: btn, onClick: function () { flyTo(byId.human); } }, S('to_human', '🧍 Human scale')),
              h('button', { type: 'button', style: btn, onClick: function () { goTo(MAX_EXP); } }, S('to_big', '🌌 Biggest')),
              h('button', { type: 'button', style: btn, onClick: function () { goTo(MIN_EXP); } }, S('to_small', '🔴 Smallest')))
          ),

          // ── Side panel ──
          h('aside', { 'aria-label': S('panel_aria', 'Scale details'), style: { flex: '0 1 320px', minWidth: 250, background: P.panel, border: '1px solid ' + P.line, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 } },

            h('div', null,
              h('h3', { style: { margin: '0 0 4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: P.dim } }, S('focus_heading', 'In focus')),
              h('div', { style: card },
                h('div', { style: { fontWeight: 700, marginBottom: 2 } }, focused.emoji + ' ' + itemText(focused, 'name')),
                h('div', { style: { color: P.dim, fontSize: '0.75rem', marginBottom: 6 } },
                  S('size_line', '{len} {dim}', { len: humanLength(focused.size), dim: S('dim_' + focused.dim.replace(/\s+/g, '_'), focused.dim) })),
                h('p', { style: { margin: 0 } }, itemText(focused, 'describe')),
                focused.note ? h('p', { style: { margin: '6px 0 0', fontSize: '0.71875rem', color: P.dim, lineHeight: 1.45 } }, '⚖️ ' + itemText(focused, 'note')) : null,
                speakBtn('focus', itemText(focused, 'describe') + (focused.note ? ' ' + itemText(focused, 'note') : '')) ?
                  h('div', { style: { marginTop: 8 } }, speakBtn('focus', itemText(focused, 'describe') + (focused.note ? ' ' + itemText(focused, 'note') : ''))) : null)),

            // Estimate first, then check: the house Predict → Explore → Explain
            // shape. The reveal is never withheld and never scored.
            challenge ? h('div', null,
              h('h3', { style: { margin: '0 0 4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: P.dim } }, S('est_heading', 'Estimate first')),
              h('div', { style: Object.assign({}, card, { display: 'flex', flexDirection: 'column', gap: 8 }) },
                h('p', { style: { margin: 0 } },
                  S('est_question', 'How many powers of ten bigger across is {big} than {small}?',
                    { big: itemText(challenge.big, 'name'), small: lowerArticle(itemText(challenge.small, 'name')) })),
                h('label', { style: { fontSize: '0.71875rem', color: P.dim } },
                  S('est_label', 'Your estimate, in powers of ten'),
                  h('input', { type: 'number', inputMode: 'decimal', step: '1', min: '0', max: '45', value: guess, disabled: revealed,
                    onChange: function (e) { setGuess(e.target.value); },
                    onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); lockInEstimate(); } },
                    style: Object.assign({}, sel, { width: '100%', marginTop: 2 }) })),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  !revealed ? h('button', { type: 'button', style: Object.assign({}, goBtn, guess === '' ? { opacity: 0.55, cursor: 'not-allowed' } : null), disabled: guess === '', onClick: lockInEstimate }, S('est_go', 'Lock in my estimate')) : null,
                  revealed ? h('button', { type: 'button', style: btn, onClick: function () { setCmpA(challenge.small.id); setCmpB(challenge.big.id); flyTo(challenge.big); } }, S('est_show', 'Show me')) : null,
                  h('button', { type: 'button', style: btn, onClick: newChallenge }, S('est_new', 'Another pair'))),
                revealed ? h('p', { role: 'status', style: { margin: 0, fontWeight: 600 } },
                  estimateVerdict(parseFloat(guess)) + ' ' + challengeReveal()) : null)) : null,

            // Compare
            h('div', null,
              h('h3', { style: { margin: '0 0 4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: P.dim } }, S('cmp_heading', 'Compare two sizes')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                h('label', { style: { fontSize: '0.71875rem', color: P.dim } }, S('cmp_a', 'First thing'),
                  h('select', { value: cmpA, onChange: function (e) { setCmpA(e.target.value); }, style: Object.assign({}, sel, { width: '100%', marginTop: 2 }) }, itemOptions())),
                h('label', { style: { fontSize: '0.71875rem', color: P.dim } }, S('cmp_b', 'Second thing'),
                  h('select', { value: cmpB, onChange: function (e) { setCmpB(e.target.value); }, style: Object.assign({}, sel, { width: '100%', marginTop: 2 }) }, itemOptions())),
                h('button', { type: 'button', style: goBtn, onClick: runCompare }, S('cmp_go', 'Compare them')),
                compare ? h('p', { role: 'status', style: Object.assign({}, card, { margin: 0, borderColor: P.accent }) }, compareSentence()) : null)),

            // The scale ladder: the complete non-visual path through the tool.
            h('div', { style: { minHeight: 0, display: 'flex', flexDirection: 'column' } },
              h('button', { type: 'button', onClick: function () { setShowLadder(!showLadder); }, 'aria-expanded': showLadder ? 'true' : 'false', 'aria-controls': 'sx-ladder', style: btn },
                (showLadder ? '▾ ' : '▸ ') + S('ladder_heading', 'Everything, largest first')),
              h('ul', { id: 'sx-ladder', hidden: !showLadder, style: { listStyle: 'none', margin: '6px 0 0', padding: 0, maxHeight: 220, overflowY: 'auto', border: '1px solid ' + P.line, borderRadius: 8 } },
                sorted.map(function (i) {
                  var on = i.id === focusId;
                  return h('li', { key: i.id },
                    h('button', { type: 'button', onClick: function () { openItem(i); },
                      'aria-current': on ? 'true' : undefined,
                      style: { display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid ' + P.line, background: on ? P.selBg : P.panel, color: on ? P.selFg : P.text, padding: '6px 9px', fontSize: '0.75rem', cursor: 'pointer', font: 'inherit' } },
                      h('span', { style: { fontWeight: on ? 700 : 500 } }, i.emoji + ' ' + itemText(i, 'name')),
                      h('span', { style: { color: on ? P.selFg : P.dim, float: 'right', fontSize: '0.6875rem' } }, humanLength(i.size))));
                })))
          )
        ),

        h('p', { style: { margin: 0, fontSize: '0.6875rem', color: P.dim, lineHeight: 1.5 } },
          S('credit', 'Sizes are the characteristic width, length or height of each thing, in metres. Where a size is genuinely uncertain or depends on where you decide something stops, the tool says so rather than pretending otherwise.'))
      );
    }
  });
  console.log('[StemLab] stem_tool_scaleexplorer.js loaded — Scale Explorer (powers of ten)');
})();
