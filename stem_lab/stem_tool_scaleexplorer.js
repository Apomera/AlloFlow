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
  // A shared link (?tool=...) requests this plugin before stem_lab_module.js has
  // run, so window.StemLab may not exist yet. Returning here made the host show
  // "The plugin loaded but did not register" on every deep link (found
  // 2026-09-10 by opening the live app). Install the same minimal registry the
  // other plugins install; the module adopts it when it arrives.
  window.StemLab = window.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    getRegisteredTools: function () { var self = this; return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean); },
    isRegistered: function (id) { return !!this._registry[id]; },
    renderTool: function (id, ctx) {
      var tool = this._registry[id];
      if (!tool || !tool.render) return null;
      try { return tool.render(ctx); } catch (e) { return null; }
    }
  };
  if (typeof window.StemLab.registerTool !== 'function') return;
  var atlasAssetBase = 'stem_lab/assets/astronomy/';
  try { if (document.currentScript && document.currentScript.src) atlasAssetBase = new URL('assets/astronomy/', document.currentScript.src).href; } catch (_) {}

  // ── The ladder ────────────────────────────────────────────────────────
  // size: metres. dim: which dimension the size refers to.
  var ITEMS = [
    { id: 'ten-billion-ly', emoji: '📏', name: 'Ten billion light years', size: 9.461e25, dim: 'distance', group: 'cosmic',
      describe: 'A ruler for the deepest views: how far light travels in ten billion years. Light that has come this distance set out before the Sun and Earth existed; the faint red galaxies in the Webb telescope\u2019s deep fields are seen by light older than this.' },
    { id: 'universe', emoji: '🌌', name: 'The observable universe', size: 8.8e26, dim: 'across', group: 'cosmic',
      describe: 'Everything close enough that its light has had time to reach us since the universe began. It is not the whole universe, only the part we can possibly see.',
      note: 'About 93 billion light years across. It is wider than the age of the universe in light years because space itself has stretched while the light travelled.' },
    { id: 'coma-dist', emoji: '📍', name: 'Distance to the Coma Cluster', size: 3.0e24, dim: 'distance', group: 'cosmic',
      describe: 'How far away a dense swarm of more than a thousand galaxies lies, in the direction of the constellation Coma Berenices. It was here, in 1933, that galaxies were first seen moving too fast for their visible mass, the earliest evidence for dark matter.',
      note: 'About 320 million light years; distances on this scale carry an uncertainty of a few percent depending on the method.' },
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
    { id: 'light-month', emoji: '🗓️', name: 'One light month', size: 7.77e14, dim: 'distance', group: 'cosmic',
      describe: 'How far light travels in thirty days. No spacecraft has gone this far: Voyager 1, the most distant, is under one light day out after nearly fifty years of flight.' },
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
    { id: 'light-minute', emoji: '⏱️', name: 'One light minute', size: 1.799e10, dim: 'distance', group: 'cosmic',
      describe: 'How far light travels in one minute: about 18 million kilometres, or nearly fifty times the distance to the Moon. Sunlight is a little over eight of these old when it reaches you.' },
    { id: 'au', emoji: '📍', name: 'Distance from the Earth to the Sun', size: 1.496e11, dim: 'distance', group: 'cosmic',
      describe: 'One astronomical unit, the standard yardstick for distances inside the Solar System.' },
    { id: 'sun', photo: 'solarflare', emoji: '☀️', name: 'The Sun', size: 1.392e9, dim: 'across', group: 'cosmic',
      describe: 'Our star, a ball of hot plasma held together by its own gravity. About 109 Earths would fit side by side across it, and it holds more than 99 per cent of all the mass in the Solar System.' },
    { id: 'jupiter', emoji: '🟠', name: 'Jupiter', size: 1.43e8, dim: 'across', group: 'cosmic',
      describe: 'The largest planet in the Solar System, a ball of gas with no solid surface to stand on.' },
    { id: 'earth', photo: 'earthrise', emoji: '🌍', name: 'The Earth', size: 1.2742e7, dim: 'across', group: 'cosmic',
      describe: 'Our planet, measured through the equator. It is very slightly wider than it is tall.' },
    { id: 'moon', photo: 'farside', emoji: '🌕', name: 'The Moon', size: 3.475e6, dim: 'across', group: 'cosmic',
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

  // ── Guided tours ───────────────────────────────────────────────────────
  // The film is one continuous shot and the journey is one decade at a time;
  // neither gives a class a narrative. A tour is a handful of stops with one
  // sentence each: what to notice here, and how it relates to the last stop.
  // Every ratio in a line was checked against the ITEMS sizes above.
  var TOURS = [
    { id: 'out', emoji: '🌌', title: 'From you to the edge of everything', stops: [
      { id: 'human', line: 'Start here: you. Everything on this trip is measured against you.' },
      { id: 'blue-whale', line: 'About fifteen of you, nose to tail. The largest animal that has ever lived is still something you could walk the length of.' },
      { id: 'eiffel', line: 'Nearly two hundred of you. Buildings are where human-sized things stop feeling human-sized.' },
      { id: 'everest', line: 'Five thousand of you. From here on nothing is built; everything is grown, piled up or blown.' },
      { id: 'earth', line: 'Twelve thousand kilometres across. At this size Everest is a bump far too small to see.' },
      { id: 'sun', line: 'One hundred and nine Earths across. The bright disc in the sky is this.' },
      { id: 'au', line: 'The gap between the Earth and the Sun: about a hundred and seven Suns laid side by side.' },
      { id: 'lightyear', line: 'One light year: sixty-three thousand Earth-Sun distances. The nearest other star is four of these away.' },
      { id: 'milkyway', line: 'Our galaxy, about a hundred thousand light years across. Light takes a hundred thousand years to cross it.' },
      { id: 'universe', line: 'The observable universe, ninety-three billion light years across. Past this, no light has had time to reach us.' } ] },
    { id: 'in', emoji: '🔬', title: 'From you down to the proton', stops: [
      { id: 'human', line: 'Start here: you. This time every stop is smaller than the last.' },
      { id: 'hair', line: 'Seventy micrometres: the width of a hair, about the smallest thing an unaided eye can pick out.' },
      { id: 'rbc', line: 'Seven and a half micrometres. About ten of these fit across that hair.' },
      { id: 'ecoli', line: 'Two micrometres: a bacterium. Nearly four across one red blood cell.' },
      { id: 'virus', line: 'A hundred nanometres. Too small for light to show; this is where microscopes switch to electrons.' },
      { id: 'dna', line: 'Two nanometres wide: the double helix. A thousand of these across that bacterium.' },
      { id: 'water', line: 'A water molecule, a quarter of a nanometre. One glass holds more of these than there are stars in the observable universe.' },
      { id: 'carbon', line: 'One carbon atom. It has no hard edge, so this size is a convention, and the note on its card says so.' },
      { id: 'nucleus', line: 'The nucleus of a gold atom: tens of thousands of times narrower than the atom around it. Almost all of an atom is empty space.' },
      { id: 'proton', line: 'A proton. Below this, asking how wide something is stops having a clear answer, and the trip ends.' } ] },
    { id: 'solar', emoji: '🪐', title: 'Around the Solar System', stops: [
      { id: 'earth', line: 'Home: twelve thousand kilometres across.' },
      { id: 'moon', line: 'A quarter of the Earth\u2019s width, and it sits thirty Earths away, farther than most pictures suggest.' },
      { id: 'jupiter', line: 'Eleven Earths across, and most of the planetary mass in the Solar System.' },
      { id: 'sun', line: 'Ten Jupiters across; about a thousand Jupiters would fit inside.' },
      { id: 'au', line: 'One astronomical unit, the Earth\u2019s distance from the Sun: eight light minutes.' },
      { id: 'solar-system', line: 'Neptune\u2019s orbit, sixty times the Earth-Sun distance. Light takes over eight hours to cross it.' },
      { id: 'heliosphere', line: 'The Sun\u2019s bubble in the galaxy, where its wind gives out. Both Voyagers have crossed its edge.' },
      { id: 'oort', line: 'The Oort cloud of comets, reaching most of a light year out: the true edge of the Sun\u2019s family.' },
      { id: 'alpha-cen-dist', line: 'The nearest other star system, a little over four light years. Every stop so far fits into this gap.' } ] }
  ];

  var MIN_EXP = -16.2, MAX_EXP = 27.6;   // a little past the smallest and largest items
  var DECADES_ACROSS = 3.2;              // how many powers of ten span the canvas width
  var HUMAN = 1.7;

  function log10(v) { return Math.log(v) / Math.LN10; }
  function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function fmt(s, vars) { return String(s).replace(/\{(\w+)\}/g, function (m, k) { return vars && k in vars ? vars[k] : m; }); }

  // ── Shareable views ───────────────────────────────────────────────────
  // The shell deep link (/scale-explorer → /app/?tool=scaleExplorer) opens the
  // tool; these two extra parameters open it AT a place, so a teacher can send
  // a class straight to a red blood cell or the Oort cloud:
  //   ?tool=scaleExplorer&focus=rbc      an item id from ITEMS
  //   ?tool=scaleExplorer&at=-9          a power of ten (log10 metres)
  // Read only when the link names this tool, so another tool's `focus` cannot
  // steer this one. The host keeps location.search after boot (verified live).
  function linkNamesThisTool() {
    try {
      var p = new URLSearchParams(window.location.search || '');
      var tool = String(p.get('tool') || p.get('stem_tool') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return tool === 'scaleexplorer' ? p : null;
    } catch (_) { return null; }
  }
  function readStartFromLink(items) {
    // Another tool can hand over a width to look at (Zoom Gallery's scale bar
    // does): read it once and clear it, so a later plain open starts normally.
    try {
      var hand = window.__alloScaleExplorerStart;
      // Not cleared here: React may run this initialiser twice in development
      // (StrictMode), and the second run must see the same value. The mount
      // effect clears it once the tool is actually on screen.
      if (hand && isFinite(hand.exp)) {
        var he = Math.max(MIN_EXP, Math.min(MAX_EXP, hand.exp));
        var hb = null, hd = Infinity;
        for (var q = 0; q < items.length; q++) { var dq = Math.abs(log10(items[q].size) - he); if (dq < hd) { hd = dq; hb = items[q]; } }
        return { focusId: hb ? hb.id : null, exp: he };
      }
    } catch (_) {}
    var p = linkNamesThisTool();
    if (!p) return null;
    // ?tour=solar starts a guided tour at its first stop.
    var tourWanted = String(p.get('tour') || '').toLowerCase().replace(/[^a-z]/g, '');
    if (tourWanted && TOURS.some(function (x) { return x.id === tourWanted; })) return { focusId: null, exp: null, tour: tourWanted };
    var focus = String(p.get('focus') || '').toLowerCase().replace(/[^a-z0-9-]/g, '');
    for (var i = 0; i < items.length; i++) if (items[i].id === focus) return { focusId: items[i].id, exp: log10(items[i].size) };
    var at = parseFloat(p.get('at'));
    if (isFinite(at) && at >= MIN_EXP && at <= MAX_EXP) {
      // The camera lands at the power of ten; the focus card should describe
      // whatever is nearest, exactly as it would after a move.
      var best = null, bestD = Infinity;
      for (var j = 0; j < items.length; j++) { var d = Math.abs(log10(items[j].size) - at); if (d < bestD) { bestD = d; best = items[j]; } }
      return { focusId: best ? best.id : null, exp: at };
    }
    return null;
  }
  // Where a copied link should point. Inside Gemini Canvas, the desktop app or a
  // dev server the current address is not reachable by students, so the public
  // shell is used; on an AlloFlow host the current origin is kept.
  function shareBase() {
    try {
      var loc = window.location, host = loc.hostname || '';
      if (/(^|\.)alloflow/i.test(host) || /\.pages\.dev$/i.test(host) || /\.web\.app$/i.test(host)) return loc.origin + loc.pathname;
    } catch (_) {}
    return 'https://alloflow-cdn.pages.dev/app/';
  }
  function shareLinkFor(item) { return shareBase() + '?tool=scaleExplorer&focus=' + encodeURIComponent(item.id); }
  // Clipboard, the house way: the shell's alloCopyText (works inside Canvas),
  // then the async API, then the legacy textarea. Resolves true on success.
  function copyPlain(text) {
    return Promise.resolve().then(function () {
      if (typeof window.alloCopyText === 'function') return window.alloCopyText(text);
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).then(function () { return true; });
      var ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
      ta.remove(); return ok;
    }).then(function (r) { return r !== false; }, function () { return false; });
  }

  var SUPERSCRIPT = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  function powerLabel(n) {
    return '10' + String(n).split('').map(function (ch) { return SUPERSCRIPT[ch] || ch; }).join('') + ' m';
  }
  function sup(n) { return String(n).split('').map(function (ch) { return SUPERSCRIPT[ch] || ch; }).join(''); }
  // Scientific notation, two significant figures: 7.5 × 10⁻⁶ m. The exponent
  // IS the order of magnitude, and it is how the idea is examined, so the tool
  // can show it beside the friendly unit on request.
  function sciNotation(m) {
    if (!(m > 0)) return '';
    var e = Math.floor(Math.log(m) / Math.LN10);
    var mant = m / Math.pow(10, e);
    var r = Math.round(mant * 10) / 10;
    if (r >= 10) { r = 1; e += 1; }
    return (r % 1 === 0 ? String(r) : r.toFixed(1)) + ' × 10' + sup(e) + ' m';
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
    if (a >= 1.496e11) {
      var au = m / 1.496e11;
      // "1 times the Earth–Sun distance" read badly on the AU rung itself.
      if (au < 1.05) return 'the Earth–Sun distance';
      return bigCount(au) + ' times the Earth–Sun distance';
    }
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
    if (/^(A|An|The) /.test(name)) return name.charAt(0).toLowerCase() + name.slice(1);
    // The personalised person is "You" on its card and "you" inside a sentence.
    return name === 'You' ? 'you' : name;
  }
  // The person can be made the student's own height. Kept between 50 cm and
  // 2.5 m: anything outside that is a typo, not a person.
  function validHeightCm(v) { var n = Number(v); return isFinite(n) && n >= 50 && n <= 250 ? n : null; }
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
    if (theme === 'light') return { bg: '#f8fafc', panel: '#ffffff', panel2: '#f1f5f9', line: '#64748b', text: '#0f172a', dim: '#475569', accent: '#1d4ed8', accentBtn: '#1d4ed8', accentFg: '#ffffff', ok: '#047857', warn: '#92400e', selBg: '#dbeafe', selFg: '#1e3a8a', stage: '#0b1220', ring: '#93c5fd', ringHot: '#fbbf24', axis: '#94a3b8', stageFg: '#f1f5f9', stageDim: '#cbd5e1' };
    if (theme === 'contrast') return { bg: '#000000', panel: '#000000', panel2: '#0a0a0a', line: '#fbbf24', text: '#ffffff', dim: '#ffffff', accent: '#fbbf24', accentBtn: '#fbbf24', accentFg: '#000000', ok: '#00ff66', warn: '#ffff00', selBg: '#fbbf24', selFg: '#000000', stage: '#000000', ring: '#ffffff', ringHot: '#ffff00', axis: '#ffffff', stageFg: '#ffffff', stageDim: '#ffffff' };
    return { bg: '#0f172a', panel: '#1e293b', panel2: '#273449', line: '#334155', text: '#e2e8f0', dim: '#94a3b8', accent: '#38bdf8', accentBtn: '#0369a1', accentFg: '#ffffff', ok: '#4ade80', warn: '#fbbf24', selBg: '#0c4a6e', selFg: '#e0f2fe', stage: '#070b16', ring: '#38bdf8', ringHot: '#fbbf24', axis: '#64748b', stageFg: '#e2e8f0', stageDim: '#cbd5e1' };
  }

  // The atlas uses local coordinates in metres / 10^exponent. Never put
  // astronomical metre coordinates into the GPU's single-precision buffers.
  var REALMS = [
    { id: 'quantum', name: 'Inside matter', subtitle: 'Where familiar shapes give way to probability', at: 'carbon', max: -8.5, color: '#bda5ff', bg: '#100c22' },
    { id: 'micro', name: 'Hidden life', subtitle: 'A living world beneath the reach of your eyes', at: 'rbc', max: -3, color: '#7ee7db', bg: '#061f23' },
    { id: 'human', name: 'Our world', subtitle: 'Begin with a scale you can feel', at: 'human', max: 3, color: '#ffd294', bg: '#171c23' },
    { id: 'planet', name: 'Worlds & landscapes', subtitle: 'From the shape of the land to the curve of a world', at: 'earth', max: 8.7, color: '#8dcaff', bg: '#071624' },
    { id: 'stellar', name: 'Between the stars', subtitle: 'Stars, light and the enormous spaces between', at: 'sun', max: 19, color: '#ffc39b', bg: '#140f22' },
    { id: 'cosmic', name: 'The cosmic ocean', subtitle: 'Galaxies become the building blocks', at: 'milkyway', max: Infinity, color: '#cbb7ff', bg: '#100c22' }
  ];
  function realmAt(e) { return REALMS.filter(function (r) { return e < r.max; })[0] || REALMS[5]; }

  function atlasDetails(id, S) {
    var insectSource='https://www.nhm.ac.uk/schools/teaching-resources/key-stage-1/animal-and-human-bodies/parts-of-an-insect.html';
    var dinosaurSource='https://www.amnh.org/exhibitions/permanent/saurischian-dinosaurs/tyrannosaurus-rex';
    var dnaSource='https://www.genome.gov/genetics-glossary/Deoxyribonucleic-Acid-DNA';
    var cellSource='https://www.ncbi.nlm.nih.gov/mesh/68051336';
    if(id==='honeybee')return [
      {id:'head',at:[-.42,.06,.11],label:S('atlas_detail_head', 'Head & antennae'),body:S('atlas_detail_head_body', 'Follow the antennae back to the head. Insects have three main body regions: head, thorax, and abdomen. Turn the view to find the matching antenna on the other side.'),source:insectSource},
      {id:'wings',at:[-.05,.15,.36],label:S('atlas_detail_wings', 'Veined wings'),body:S('atlas_detail_wings_body', 'Look through the translucent wing and trace its supporting veins. The smaller hindwing sits behind the forewing. Both pairs attach to the thorax.'),source:insectSource},
      {id:'legs',at:[.015,-.20,.25],label:S('atlas_detail_legs', 'Jointed legs'),body:S('atlas_detail_legs_body', 'Count three legs on this side, then orbit to find the other three. Each leg bends at joints; the hind legs in this illustration carry golden pollen loads.'),source:insectSource}
    ];
    if(id==='ladybird')return [
      {id:'elytra',at:[.12,.19,.11],label:S('atlas_detail_elytra', 'Protective wing cases'),body:S('atlas_detail_elytra_body', 'The red shell is a pair of hardened forewings called elytra. Follow the seam where they meet. The flight wings fold beneath these protective covers.'),source:'https://www.nhm.ac.uk/discover/uk-beetles-british-most-spectacular-and-beautiful.html'},
      {id:'antennae',at:[-.49,.08,.11],label:S('atlas_detail_antennae', 'Antennae'),body:S('atlas_detail_antennae_body', 'These paired structures extend from the head. Compare their short, curved shape with the longer antennae on the honeybee.'),source:insectSource},
      {id:'legs',at:[.1,-.14,.27],label:S('atlas_detail_six_legs', 'Six legs'),body:S('atlas_detail_six_legs_body', 'Look below the wing cases for three pairs of jointed legs. Six legs are one of the features that identify an insect.'),source:insectSource}
    ];
    if(id==='trex')return [
      {id:'jaw',at:[-.39,.11,.04],label:S('atlas_detail_jaw', 'Jaws & teeth'),body:S('atlas_detail_jaw_body', 'Move around the opening between the jaws to inspect the teeth. The soft tissues and colors are illustrated; the skeleton provides the evidence for the overall body plan.'),source:dinosaurSource},
      {id:'tail',at:[.32,.06,.01],label:S('atlas_detail_tail', 'Balancing tail'),body:S('atlas_detail_tail_body', 'Trace the taper from the hips to the tip. The long tail extends behind a horizontal body, rather than resting on the ground.'),source:dinosaurSource},
      {id:'feet',at:[.015,-.27,.09],label:S('atlas_detail_feet', 'Two walking legs'),body:S('atlas_detail_feet_body', 'Follow the powerful hind leg down to its toes. T. rex supported its body on two hind legs; its small forelimbs did not serve as walking legs.'),source:dinosaurSource}
    ];
    if(id==='mitochondrion')return [
      {id:'cristae',at:[-.02,.08,.05],cutaway:true,label:S('atlas_detail_cristae', 'Inner membrane folds'),body:S('atlas_detail_cristae_body', 'These folds are called cristae. They pack more inner membrane into a small space. The membrane contains machinery involved in producing ATP, a molecule cells use to transfer energy.'),source:cellSource},
      {id:'envelope',at:[.17,.19,.10],cutaway:false,label:S('atlas_detail_envelope', 'Outer membrane'),body:S('atlas_detail_envelope_body', 'The outer membrane encloses the mitochondrion. Open the cutaway to compare this enclosing surface with the folded inner membrane beneath it.'),source:cellSource}
    ];
    if(id==='rbc')return [
      {id:'center',at:[0,.061,0],label:S('atlas_detail_cell_center', 'Indented center'),body:S('atlas_detail_cell_center_body', 'Look at the shallow depression in the disc. Orbit to see the matching indentation on the opposite face. This is a surface shape, not a hole through the cell.'),source:'https://www.nhlbi.nih.gov/health/sickle-cell-disease'},
      {id:'rim',at:[.36,.13,.12],label:S('atlas_detail_cell_rim', 'Flexible disc'),body:S('atlas_detail_cell_rim_body', 'Compare the thicker rim with the thinner center. Normal red blood cells are flexible discs. Hemoglobin inside them carries oxygen around the body.'),source:'https://www.nhlbi.nih.gov/health/sickle-cell-disease'}
    ];
    if(id==='dna')return [
      {id:'backbone',at:[-.40,-.21,.12],label:S('atlas_detail_backbone', 'Sugar–phosphate backbone'),body:S('atlas_detail_backbone_body', 'Follow one continuous strand around the helix. Each backbone alternates sugar and phosphate groups. The second strand winds alongside it.'),source:dnaSource},
      {id:'bases',at:[-.1,0,-.03],label:S('atlas_detail_bases', 'Paired bases'),body:S('atlas_detail_bases_body', 'The rungs represent pairs of bases between the two backbones. A pairs with T, and C pairs with G. The colors help distinguish parts of this conceptual model.'),source:'https://www.genome.gov/about-genomics/fact-sheets/Deoxyribonucleic-Acid-Fact-Sheet'}
    ];
    return [];
  }

  var NOTEBOOK_LIMIT = 24, NOTE_LIMIT = 1200;
  function observationKey(itemId, detailId) { return itemId + ':' + (detailId || ''); }
  function observationTarget(itemId, detailId) {
    var item = ITEMS.filter(function (it) { return it.id === itemId; })[0];
    if (!item) return null;
    var detail = atlasDetails(itemId, function (key, fallback) { return fallback; }).filter(function (d) { return d.id === detailId; })[0];
    return detailId && !detail ? null : { item: item, detail: detail };
  }
  // Persist plain data only. Rebuild names and source links from the catalog,
  // and tolerate older or damaged tool state without losing the whole notebook.
  function readObservations(raw) {
    var seen = {}, result = [];
    if (!Array.isArray(raw)) return result;
    raw.slice(0, 200).forEach(function (entry) {
      if (!entry || typeof entry !== 'object' || result.length >= NOTEBOOK_LIMIT) return;
      var target = observationTarget(entry.itemId, entry.detailId || '');
      if (!target) return;
      var key = observationKey(entry.itemId, entry.detailId);
      if (seen[key]) return;
      seen[key] = true;
      result.push({ itemId: target.item.id, detailId: target.detail ? target.detail.id : '',
        size: target.item.id === 'human' && entry.you === true && typeof entry.size === 'number' && validHeightCm(entry.size * 100) ? entry.size : target.item.size,
        you: target.item.id === 'human' && entry.you === true,
        note: typeof entry.note === 'string' ? entry.note.slice(0, NOTE_LIMIT) : '',
        zoom: typeof entry.zoom === 'number' && isFinite(entry.zoom) ? clamp(entry.zoom, 1, 2.5) : 1,
        yaw: typeof entry.yaw === 'number' && isFinite(entry.yaw) ? Math.atan2(Math.sin(entry.yaw), Math.cos(entry.yaw)) : 0,
        pitch: typeof entry.pitch === 'number' && isFinite(entry.pitch) ? clamp(entry.pitch, -1.1, 1.1) : .12,
        cutaway: entry.cutaway !== false, view: entry.view === 'chart' ? 'chart' : 'atlas' });
    });
    return result;
  }
  function readObservationDrafts(raw) {
    var result = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return result;
    Object.keys(raw).slice(0, 200).forEach(function (key) {
      var parts = key.split(':');
      if (parts.length === 2 && observationTarget(parts[0], parts[1]) && typeof raw[key] === 'string') result[key] = raw[key].slice(0, NOTE_LIMIT);
    });
    return result;
  }

  // The bridge's positions are exact multiples of the smaller measurement.
  // A nearby catalog specimen is an example, never a replacement for a step.
  function compareMeasurements(a, b) {
    if (!a || !b || !(a.size > 0) || !(b.size > 0) || !isFinite(a.size) || !isFinite(b.size)) return null;
    var big = a.size >= b.size ? a : b, small = a.size >= b.size ? b : a;
    var ratio = big.size / small.size;
    if (!isFinite(ratio)) return null;
    return { a: a, b: b, big: big, small: small, ratio: ratio, decades: log10(ratio) };
  }
  function scaleBridge(pair, items) {
    if (!pair) return [];
    var from = log10(pair.small.size), steps = [{ exp: from, size: pair.small.size, item: pair.small, endpoint: true, factor: 1 }];
    for (var k = 1; k < pair.decades - 1e-8; k++) {
      var at = from + k, example = null, best = .5;
      items.forEach(function (item) {
        if (item.size <= pair.small.size || item.size >= pair.big.size) return;
        var distance = Math.abs(log10(item.size) - at);
        if (distance < best) { example = item; best = distance; }
      });
      steps.push({ exp: at, size: Math.pow(10, at), item: example, endpoint: false, factor: 10 });
    }
    if (pair.decades > 1e-8) steps.push({ exp: log10(pair.big.size), size: pair.big.size, item: pair.big, endpoint: true,
      factor: Math.pow(10, pair.decades - (steps.length - 1)) });
    return steps;
  }
  function readComparison(raw, fallbackA, fallbackB) {
    function known(id) { return typeof id === 'string' && ITEMS.some(function (item) { return item.id === id; }); }
    return { a: raw && known(raw.a) ? raw.a : fallbackA, b: raw && known(raw.b) ? raw.b : fallbackB };
  }

  function createScaleAtlas(T, canvas, read, pick, fail, inspect, markers, comparisonLabels) {
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    var scene = new T.Scene(), camera = new T.PerspectiveCamera(43, 1, 0.05, 160);
    // Parallel projection preserves the shared unit even when the specimens
    // have different depths. Both roots keep their actual measured ratio.
    var comparisonCamera = new T.OrthographicCamera(-5, 5, 5, -5, .01, 160), activeCamera = camera;
    var comparisonLayoutKey = '', comparisonBounds = new T.Box3(), comparisonCenter = new T.Vector3(), comparisonRadius = 3;
    var space = new T.Group(); scene.add(space);
    var hemisphere = new T.HemisphereLight(0xd8e8f5, 0x505348, 0.75); scene.add(hemisphere);
    var key = new T.DirectionalLight(0xfff2dc, 2.25); key.position.set(-3.8, 5.5, 5); scene.add(key);
    key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -6;
    key.shadow.camera.right = key.shadow.camera.top = 6;
    key.shadow.camera.near = 0.1; key.shadow.camera.far = 24;
    key.shadow.bias = -0.0003; key.shadow.normalBias = 0.012; key.shadow.radius = 3;
    var rim = new T.DirectionalLight(0xb6d9ed, 1.15); rim.position.set(4, 2, -4); scene.add(rim);
    var fill = new T.DirectionalLight(0xd9e6ef, 0.4); fill.position.set(3, 1, 5); scene.add(fill);
    var resources = new Set(), models = {}, disposed = false, frame = 0, dirty = true, paintCount = 0;
    var yaw = 0, pitch = 0.12, time = 0, last = 0, inView = true;
    var sphere = track(new T.SphereGeometry(0.5, 48, 32));
    var unitBox = track(new T.BoxGeometry(1, 1, 1));
    var ray = new T.Raycaster(), pointer = new T.Vector2(), drag = null;
    var fingers = new Map(), pinch = null, cameraZoom = 1, lastZoomInput = 1;
    var cameraAim=new T.Vector3(0,.2,0),aimGoal=new T.Vector3(0,.2,0),cameraSettling=false;
    var markerPoint=new T.Vector3(),previousDetail='',focusRing;
    function track(v) { resources.add(v); return v; }
    function material(color, options) { var mat = track(new T.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.78, metalness: 0 }, options || {}))); mat.color.convertSRGBToLinear(); mat.emissive.convertSRGBToLinear(); return mat; }
    function mesh(group, geo, mat, x, y, z, sx, sy, sz) {
      var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.scale.set(sx || 1, sy || sx || 1, sz || sx || 1); m.castShadow = !mat.transparent; m.receiveShadow = !mat.transparent; group.add(m); return m;
    }
    function ball(g, mat, x, y, z, sx, sy, sz) { return mesh(g, sphere, mat, x, y, z, sx, sy, sz); }
    function box(g, mat, x, y, z, sx, sy, sz) { return mesh(g, unitBox, mat, x, y, z, sx, sy, sz); }
    function tube(g, points, radius, mat) {
      var curve = new T.CatmullRomCurve3(points.map(function (p) { return new T.Vector3(p[0], p[1], p[2]); }));
      return mesh(g, track(new T.TubeGeometry(curve, Math.max(16, points.length * 4), radius, 10, false)), mat);
    }
    function rod(g, a, b, radius, mat) {
      var av = new T.Vector3(a[0], a[1], a[2]), bv = new T.Vector3(b[0], b[1], b[2]);
      var m = mesh(g, track(new T.CylinderGeometry(radius, radius, av.distanceTo(bv), 8)), mat);
      m.position.copy(av).add(bv).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), bv.sub(av).normalize()); return m;
    }
    function ring(g, radius, color, rot) {
      var m = mesh(g, track(new T.TorusGeometry(radius, 0.004, 5, 96)), material(color, { emissive: color, emissiveIntensity: 0.5 }));
      m.rotation.x = rot === undefined ? Math.PI / 2 : rot; return m;
    }
    function random(seed) { var v = seed; return function () { v = (v * 1664525 + 1013904223) >>> 0; return v / 4294967296; }; }
    // Smooth tapered anatomy. The path controls its centre; each cross-section
    // has independent width and depth, unlike a chain of spheres/cylinders.
    function organic(g, sections, mat, axis) {
      var curve = new T.CatmullRomCurve3(sections.map(function(s){return new T.Vector3(s[0],s[1],s[2]);}));
      var radii = new T.CatmullRomCurve3(sections.map(function(s){return new T.Vector3(s[3],s[4] || s[3],0);}));
      var steps = Math.max(32, sections.length * 10), sides = 24, positions = [], uvs = [], indices = [];
      for(var i=0;i<=steps;i++) {
        var t=i/steps, p=curve.getPoint(t), r=radii.getPoint(t), tangent=curve.getTangent(t).normalize();
        var up=new T.Vector3(axis==='x'?0:1,axis==='x'?1:0,0);
        if(Math.abs(up.dot(tangent))>0.98)up.set(0,0,1);
        var normal=new T.Vector3().crossVectors(tangent,up).normalize(), binormal=new T.Vector3().crossVectors(tangent,normal).normalize();
        for(var n=0;n<=sides;n++) {
          var th=n/sides*Math.PI*2, v=p.clone().addScaledVector(normal,Math.cos(th)*Math.max(.0001,r.x)).addScaledVector(binormal,Math.sin(th)*Math.max(.0001,r.y));
          positions.push(v.x,v.y,v.z);uvs.push(n/sides,t);
          if(i<steps&&n<sides){var q=i*(sides+1)+n;indices.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1);}
        }
      }
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();
      return mesh(g,geo,mat);
    }
    function fur(g, center, radii, count, length, color, seed) {
      var rng=random(seed), points=[];
      for(var i=0;i<count;i++) {
        var y=rng()*2-1,angle=rng()*Math.PI*2,r=Math.sqrt(1-y*y),n=[Math.cos(angle)*r,y,Math.sin(angle)*r];
        var p=n.map(function(v,k){return center[k]+v*radii[k];});
        var len=length*(.4+rng()*.6);points.push(p[0],p[1],p[2],p[0]+n[0]*len,p[1]+n[1]*len,p[2]+n[2]*len);
      }
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(points,3));
      var mat=track(new T.LineBasicMaterial({color:new T.Color(color).convertSRGBToLinear(),transparent:true,opacity:.63}));
      var hairs=new T.LineSegments(geo,mat);g.add(hairs);return hairs;
    }
    function giraffeTexture() {
      var cv=document.createElement('canvas');cv.width=cv.height=256;
      var context=cv.getContext('2d'),pixels=context.createImageData(256,256),rng=random(121),seeds=[],cells=7,unit=256/cells;
      for(var i=0;i<cells*cells;i++)seeds.push([.2+rng()*.6,.2+rng()*.6,rng()]);
      for(var y=0;y<256;y++)for(var x=0;x<256;x++) {
        var gx=Math.floor(x/unit),gy=Math.floor(y/unit),first=1e9,second=1e9,tone=0;
        for(var dy=-1;dy<=1;dy++)for(var dx=-1;dx<=1;dx++) {
          var nx=gx+dx,ny=gy+dy,s=seeds[((ny+cells)%cells)*cells+(nx+cells)%cells];
          var d=Math.hypot(x-(nx+s[0])*unit,y-(ny+s[1])*unit);
          if(d<first){second=first;first=d;tone=s[2];}else if(d<second)second=d;
        }
        var edge=clamp((second-first-1.4)/1.3,0,1),at=(y*256+x)*4;
        pixels.data[at]=220*(1-edge)+(112+tone*35)*edge;
        pixels.data[at+1]=188*(1-edge)+(67+tone*28)*edge;
        pixels.data[at+2]=135*(1-edge)+(35+tone*18)*edge;pixels.data[at+3]=255;
      }
      context.putImageData(pixels,0,0);var tex=track(new T.CanvasTexture(cv));tex.encoding=T.sRGBEncoding;tex.wrapS=tex.wrapT=T.RepeatWrapping;return tex;
    }
    function beeAbdomenTexture() {
      var cv=document.createElement('canvas');cv.width=64;cv.height=512;
      var context=cv.getContext('2d'),pixels=context.createImageData(cv.width,cv.height),rng=random(54);
      for(var y=0;y<cv.height;y++)for(var x=0;x<cv.width;x++) {
        var t=1-y/(cv.height-1),phase=(t*5.5)%1;
        var dark=clamp((phase-.52)/.035,0,1)*(1-clamp((phase-.94)/.05,0,1));
        var noise=(rng()-.5)*12,at=(y*cv.width+x)*4;
        pixels.data[at]=190*(1-dark)+64*dark+noise;
        pixels.data[at+1]=147*(1-dark)+47*dark+noise;
        pixels.data[at+2]=84*(1-dark)+32*dark+noise;pixels.data[at+3]=255;
      }
      context.putImageData(pixels,0,0);var tex=track(new T.CanvasTexture(cv));tex.encoding=T.sRGBEncoding;return tex;
    }
    // Pigment patches follow the shell surface, including the edge of each spot.
    function ellipsoidMark(g,mat,center,radii,x,z,rx,rz) {
      var positions=[],indices=[],rings=7,sides=32;
      for(var r=0;r<=rings;r++)for(var i=0;i<=sides;i++) {
        var angle=i/sides*Math.PI*2,px=x+Math.cos(angle)*rx*r/rings,pz=z+Math.sin(angle)*rz*r/rings;
        var dx=(px-center[0])/radii[0],dz=(pz-center[2])/radii[2];
        var py=center[1]+radii[1]*Math.sqrt(Math.max(.001,1-dx*dx-dz*dz))+.001;
        positions.push(px,py,pz);
        if(r<rings&&i<sides){var q=r*(sides+1)+i;indices.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1);}
      }
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
      return mesh(g,geo,mat);
    }
    function beeWing(g, side, back, membrane, vein) {
      var wing=new T.Group();wing.position.set(back?-.06:-.17,.105,side*.085);g.add(wing);
      var shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.08,.12,-.03,.43,.09,.49);shape.bezierCurveTo(.23,.50,.31,.30,.19,.12);shape.bezierCurveTo(.11,.04,.05,0,0,0);
      var sheet=mesh(wing,track(new T.ShapeGeometry(shape,24)),membrane);sheet.rotation.x=side*Math.PI/2;
      var routes=[[[0,0,0],[.015,.01,side*.17],[.07,.015,side*.46]],[[0,0,0],[.09,.01,side*.15],[.17,.015,side*.34]],[[.015,.01,side*.17],[.09,.012,side*.21],[.13,.013,side*.39]],[[.09,.012,side*.21],[.19,.014,side*.25]],[[.035,.01,side*.27],[.105,.013,side*.30]]];
      routes.forEach(function(p){tube(wing,p,.0015,vein);});
      wing.rotation.x=side*-.15;if(back){wing.scale.set(.7,.7,.72);wing.rotation.y=side*-.2;}return wing;
    }
    function relief(seed, pattern) {
      var cv=document.createElement('canvas');cv.width=cv.height=256;var c=cv.getContext('2d'),rng=random(seed),pixels=c.createImageData(256,256);
      for(var y=0;y<256;y++)for(var x=0;x<256;x++){var n=rng(),v=pattern==='wrinkle'?128+34*Math.sin(x*.3+Math.sin(y*.075)*4)+n*40:pattern==='cloth'?110+35*(x%3===0||y%3===0)+n*40:110+n*90;var at=(y*256+x)*4;pixels.data[at]=pixels.data[at+1]=pixels.data[at+2]=v;pixels.data[at+3]=255;}
      c.putImageData(pixels,0,0);var tex=track(new T.CanvasTexture(cv));tex.wrapS=tex.wrapT=T.RepeatWrapping;tex.repeat.set(3,3);return tex;
    }
    var grainTexture=relief(41,'grain'), wrinkleTexture=relief(63,'wrinkle');
    // View-dependent, softly lit membrane / atmospheric rim. No wire cages.
    function shell(g,color,scale,strength) {
      var mat=track(new T.ShaderMaterial({uniforms:{tint:{value:new T.Color(color).convertSRGBToLinear()},strength:{value:strength}},transparent:true,depthWrite:false,side:T.FrontSide,blending:T.AdditiveBlending,
        vertexShader:'varying vec3 n;varying vec3 v;void main(){vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=-p.xyz;gl_Position=projectionMatrix*p;}',
        fragmentShader:'uniform vec3 tint;uniform float strength;varying vec3 n;varying vec3 v;void main(){float edge=pow(1.-abs(dot(normalize(n),normalize(v))),3.);gl_FragColor=vec4(tint,edge*strength);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'}));
      var m=ball(g,mat,0,0,0,scale);m.userData.unmeasured=true;return m;
    }
    function dots(g, count, place, color, size, seed) {
      var r = random(seed || 7), pos = [], colors = [], c = new T.Color(color);
      for (var i = 0; i < count; i++) { var p = place(r, i); pos.push(p[0], p[1], p[2]); var v = 0.5 + r() * 0.5; colors.push(c.r * v, c.g * v, c.b * v); }
      var geo = track(new T.BufferGeometry()); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
      var mat = track(new T.PointsMaterial({ size: size, map: glowTexture || null, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: T.AdditiveBlending }));
      var cloud = new T.Points(geo, mat); g.add(cloud); return cloud;
    }
    // Soft light is generated locally; there are no image downloads or GPU
    // post-processing buffers to delay a classroom's first frame.
    var glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 128;
    var gc = glowCanvas.getContext('2d'), gradient = gc.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255,255,255,0.9)'); gradient.addColorStop(0.18, 'rgba(255,255,255,0.45)'); gradient.addColorStop(1, 'rgba(255,255,255,0)');
    gc.fillStyle = gradient; gc.fillRect(0, 0, 128, 128);
    var glowTexture = track(new T.CanvasTexture(glowCanvas));
    function glow(g, color, size, opacity) {
      var sprite = new T.Sprite(track(new T.SpriteMaterial({ map: glowTexture, color: color, transparent: true, opacity: opacity || 0.6, depthWrite: false, blending: T.AdditiveBlending })));
      sprite.scale.set(size, size, 1); g.add(sprite); return sprite;
    }
    var haze = glow(scene, '#6086b8', 30, 0.13); haze.position.set(-6, 3, -18);
    var haze2 = glow(scene, '#9475b8', 20, 0.1); haze2.position.set(7, -3, -14);
    var motes = dots(scene, 700, function (r) { return [(r() - 0.5) * 65, (r() - 0.5) * 38, -8 - r() * 55]; }, '#b8d8ff', 0.045, 91);
    var ground = new T.Group(); scene.add(ground); ground.position.y = -1.64;
    var floor=mesh(ground,track(new T.PlaneGeometry(180,180)),material('#26302c',{roughness:1,bumpMap:grainTexture,bumpScale:0.01}));floor.rotation.x=-Math.PI/2;floor.castShadow=false;
    var garden = new T.Group(); scene.add(garden);
    var grassPositions=[],grassColors=[],grassRandom=random(77);
    for(var gi=0;gi<750;gi++) {
      var gx=(grassRandom()-.5)*23,gz=-2-grassRandom()*19,gh=.12+grassRandom()*.6;
      if(Math.abs(gx)<2.3&&gz>-6)continue;
      var bend=(grassRandom()-.5)*.3,w=.016+grassRandom()*.025;
      grassPositions.push(gx-w,-1.65,gz,gx+w,-1.65,gz,gx+bend,-1.65+gh,gz-.07);
      var green=.05+grassRandom()*.045;
      grassColors.push(green*.7,green,green*.65,green*.7,green,green*.65,green*1.4,green*1.6,green*.8);
    }
    var grassGeo=track(new T.BufferGeometry());grassGeo.setAttribute('position',new T.Float32BufferAttribute(grassPositions,3));grassGeo.setAttribute('color',new T.Float32BufferAttribute(grassColors,3));grassGeo.computeVertexNormals();
    mesh(garden,grassGeo,material('#ffffff',{vertexColors:true,side:T.DoubleSide,roughness:1}));
    // A centimetre-scale habitat: its dimensions share the atlas scale axis.
    var leafWorld=new T.Group();scene.add(leafWorld);leafWorld.visible=false;
    var leafCanvas=document.createElement('canvas');leafCanvas.width=leafCanvas.height=256;
    var lc=leafCanvas.getContext('2d'),leafGradient=lc.createLinearGradient(0,0,256,0);
    leafGradient.addColorStop(0,'#263e20');leafGradient.addColorStop(.48,'#698644');leafGradient.addColorStop(1,'#2f572c');lc.fillStyle=leafGradient;lc.fillRect(0,0,256,256);
    lc.strokeStyle='rgba(185,200,115,.48)';lc.lineWidth=2;lc.beginPath();lc.moveTo(128,0);lc.lineTo(128,256);lc.stroke();
    for(var vi=1;vi<14;vi++)[-1,1].forEach(function(sign){lc.lineWidth=1.1;lc.beginPath();lc.moveTo(128,vi*19);lc.quadraticCurveTo(128+sign*65,vi*19-15,128+sign*128,vi*19-44);lc.stroke();});
    var leafTex=track(new T.CanvasTexture(leafCanvas));leafTex.encoding=T.sRGBEncoding;
    var leafMat=material('#c0d29c',{map:leafTex,roughness:.72,side:T.DoubleSide,bumpMap:grainTexture,bumpScale:.006});
    var leafPos=[],leafUv=[],leafIdx=[],leafSteps=32,leafSides=12;
    for(var ly=0;ly<=leafSteps;ly++)for(var lx=0;lx<=leafSides;lx++){
      var lt=ly/leafSteps,lu=lx/leafSides*2-1,lw=Math.pow(Math.sin(Math.PI*lt),.72)*.47;
      leafPos.push((lt-.5)*2,.075*lu*lu*Math.sin(Math.PI*lt)+.06*Math.pow(lt-.5,2),lu*lw);
      leafUv.push((lu+1)/2,lt);
      if(ly<leafSteps&&lx<leafSides){var lq=ly*(leafSides+1)+lx;leafIdx.push(lq,lq+1,lq+leafSides+1,lq+1,lq+leafSides+2,lq+leafSides+1);}
    }
    var leafGeo=track(new T.BufferGeometry());leafGeo.setAttribute('position',new T.Float32BufferAttribute(leafPos,3));leafGeo.setAttribute('uv',new T.Float32BufferAttribute(leafUv,2));leafGeo.setIndex(leafIdx);leafGeo.computeVertexNormals();
    var restingLeaf=mesh(leafWorld,leafGeo,leafMat,0,0,0,3.4,1.1,4.0);restingLeaf.rotation.y=-.12;
    var plants=[],stemMat=material('#526b39',{roughness:.85});
    [[-3.2,-2.4,3.4],[3.5,-3.2,4.5],[-4.6,-5,5.5],[4.5,-6,6.4]].forEach(function(p,idx){
      var plant=new T.Group();plant.position.set(p[0],0,p[1]);leafWorld.add(plant);plants.push(plant);
      var direction=p[0]>0?-1:1;
      tube(plant,[[0,0,0],[direction*.18,p[2]*.45,0],[direction*.5,p[2],-.2]],.035,stemMat);
      for(var li=0;li<3;li++){var blade=mesh(plant,leafGeo,leafMat,direction*(.2+li*.06),p[2]*(.35+li*.22),-.08,1.4-li*.2,1.7,1.5);blade.rotation.z=direction*(.48+li*.2);blade.rotation.y=idx*.7+li*1.5;}
    });
    var waterMat=material('#bedfd4',{roughness:.06,metalness:.25,transparent:true,opacity:.65,depthWrite:false});
    [[-2.1,.08,.35,.24],[2.25,.08,.65,.28],[1.75,.06,-.75,.16],[-1.5,.06,-1.05,.12]].forEach(function(d){
      ball(leafWorld,waterMat,d[0],d[1],d[2],d[3],d[3]*.7,d[3]);ball(leafWorld,material('#ffffff',{transparent:true,opacity:.65,depthWrite:false}),d[0]-.025,d[1]+d[3]*.24,d[2]+d[3]*.17,d[3]*.12);
    });
    var microBackdrop = new T.Group(); scene.add(microBackdrop);
    var membrane = material('#548b87', { transparent: true, opacity: 0.065, depthWrite: false, roughness:1 });
    for (var mi = 0; mi < 9; mi++) {
      var vesicle = ball(microBackdrop, membrane, Math.sin(mi * 2.4) * 9, Math.cos(mi * 1.7) * 6, -7 - mi, 2 + mi % 3, 1.5 + mi % 3, 2);
      vesicle.rotation.set(mi, mi * 0.3, mi * 0.7);
    }

    function planetTexture(id) {
      var cv = document.createElement('canvas'); cv.width = 512; cv.height = 256;
      var c = cv.getContext('2d'), r = random(37), i;
      c.fillStyle = id === 'earth' ? '#174b83' : id === 'moon' ? '#969b9f' : '#cbad82'; c.fillRect(0, 0, 512, 256);
      if (id === 'earth') {
        // Deliberately an illustrated globe. The object card says so; these
        // hand-drawn silhouettes are not a geographic data layer.
        var continents = [[[45,56],[77,30],[135,39],[153,69],[121,82],[105,119],[75,105],[60,77]],[[116,115],[157,132],[163,159],[145,186],[130,211],[119,167]],[[226,66],[255,59],[282,78],[287,120],[265,166],[251,147],[234,119]],[[262,46],[310,27],[371,33],[420,61],[400,101],[365,90],[347,126],[324,107],[302,80]],[[387,164],[424,152],[449,173],[428,190],[397,182]],[[211,23],[235,13],[246,33],[221,44]]];
        continents.forEach(function (p) { c.beginPath(); p.forEach(function (v, j) { if (!j) c.moveTo(v[0],v[1]); else c.lineTo(v[0],v[1]); }); c.closePath(); c.fillStyle = '#628962'; c.fill(); c.strokeStyle = '#97ae7b'; c.lineWidth = 3; c.stroke(); });
        c.fillStyle = '#dfe8ec'; c.fillRect(0, 0, 512, 12); c.fillRect(0, 241, 512, 15);
        for (i=0;i<90;i++) { c.fillStyle='rgba(238,247,255,0.24)';c.beginPath();c.ellipse(r()*512,r()*256,7+r()*26,1+r()*3,-0.2,0,Math.PI*2);c.fill(); }
      } else if (id === 'moon') {
        for (i=0;i<650;i++) { var x=r()*512,y=r()*256,s=1+r()*12;c.fillStyle='rgba(39,46,58,0.19)';c.beginPath();c.arc(x,y,s,0,Math.PI*2);c.fill();c.strokeStyle='rgba(245,244,233,0.22)';c.lineWidth=1.5;c.stroke(); }
      } else {
        for (i=0;i<256;i+=3) { c.fillStyle=['#b28b6f','#e2caa1','#846654','#ead8b8','#c4a181'][Math.floor(r()*5)];c.fillRect(0,i,512,3+r()*7); }
        c.fillStyle='#a76b55';c.beginPath();c.ellipse(350,159,35,12,0,0,Math.PI*2);c.fill();
      }
      var tex=track(new T.CanvasTexture(cv));tex.encoding=T.sRGBEncoding;return tex;
    }
    function loadHumanSurface(root) {
      var g=root.userData.model;
      var ready=T.GLTFLoader?Promise.resolve():window.StemLab.loadScriptResilient?window.StemLab.loadScriptResilient([new URL('../../../vendor/three-r128/GLTFLoader.js',atlasAssetBase).href],{cacheKey:'three-gltf-loader',check:function(){return !!T.GLTFLoader;}}):Promise.reject(new Error('Model loader unavailable'));
      ready.then(function(){
        if(disposed||g.userData.released)return;
        new T.GLTFLoader().load(new URL('../anatomy/body-surface/makehuman-body-surface.glb',atlasAssetBase).href,function(asset){
          if(disposed||g.userData.released){asset.scene.traverse(function(n){if(n.geometry)n.geometry.dispose();if(n.material)n.material.dispose();});return;}
          var bounds=new T.Box3().setFromObject(asset.scene),height=bounds.max.y-bounds.min.y,center=bounds.getCenter(new T.Vector3());
          g.clear();g.position.set(0,0,0);g.scale.setScalar(1);g.rotation.set(0,-.18,0);
          var bronze=material('#a49b80',{metalness:.36,roughness:.52});root.userData.resources.push(bronze);
          asset.scene.traverse(function(n){if(n.isMesh){
            n.geometry.translate(-center.x,-center.y,-center.z);n.geometry.scale(1/height,1/height,1/height);
            n.material.dispose();n.material=bronze;n.castShadow=n.receiveShadow=true;track(n.geometry);root.userData.resources.push(n.geometry);
          }});
          g.add(asset.scene);root.userData.floor=-.5;root.userData.materials=[];
          g.traverse(function(n){if(n.material){n.userData.baseOpacity=n.material.opacity;n.userData.baseTransparent=n.material.transparent;root.userData.materials.push(n);}});
          g.userData.surfaceReady=true;invalidate();
        },undefined,function(){ /* Retain the procedural figure when the local asset is unavailable. */ });
      }).catch(function(){ /* A loader failure leaves the atlas interactive. */ });
    }
    function model(item) {
      var previousResources = new Set(resources);
      var g=new T.Group(), id=item.id, a=material('#8cd9ce'), b=material('#d49b69'), dark=material('#293f4b'), white=material('#eceadf');
      var j, k, theta, m;
      if (item.dim === 'distance') {
        var lineMat=material('#b8c8ff',{emissive:'#697ed0',emissiveIntensity:0.7});
        rod(g,[-0.5,0,0],[0.5,0,0],0.006,lineMat);
        for(j=0;j<=10;j++)rod(g,[-0.5+j/10,-0.035,0],[-0.5+j/10,0.035,0],0.003,lineMat);
        ball(g,white,-0.5,0,0,0.024);ball(g,white,0.5,0,0,0.024);
        glow(g,'#98b4ff',0.5,0.3);g.userData.dimension='x';
      } else if (['earth','moon','jupiter'].indexOf(id)>=0) {
        var planetMat=material('#ffffff',{map:planetTexture(id),roughness:id==='earth'?0.68:0.96});
        ball(g,planetMat,0,0,0,1);
        if(id==='earth'||id==='moon'||id==='jupiter') {
          var texture=track(new T.TextureLoader().load(atlasAssetBase+(id==='earth'?'scale-earth-bluemarble-1k.png':id==='moon'?'moon-lroc-color-2k.jpg':'scale-jupiter-hubble-1k.jpg'),function(tex){
            if(disposed||g.userData.released){tex.dispose();return;}tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());planetMat.map=tex;planetMat.needsUpdate=true;g.userData.imageryReady=true;invalidate();
          },undefined,function(){ /* The locally generated globe remains usable if an asset is unavailable. */ }));
          texture.encoding=T.sRGBEncoding;
        }
        if(id==='moon') {
          var heightMap=track(new T.TextureLoader().load(atlasAssetBase+'moon-lola-height-1k.jpg',function(tex){if(disposed||g.userData.released){tex.dispose();return;}planetMat.bumpMap=tex;planetMat.bumpScale=.008;planetMat.needsUpdate=true;invalidate();},undefined,function(){}));
        }
        if(id==='earth'){shell(g,'#549aff',1.025,.75);g.rotation.y=2.8;g.rotation.z=.12;}
        if(id==='jupiter'){g.scale.y=.935;g.rotation.y=1.7;}
      } else if(id==='sun'||id==='betelgeuse') {
        var star=track(new T.ShaderMaterial({
          uniforms:{uTime:{value:0},uRed:{value:id==='betelgeuse'?1:0}},
          vertexShader:'varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-p.xyz;gl_Position=projectionMatrix*p;}',
          fragmentShader:[
            'uniform float uTime;uniform float uRed;varying vec3 vP;varying vec3 vN;varying vec3 vV;',
            'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
            'float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
            'void main(){vec3 p=vP*26.;float n=noise(p+uTime*.08)*.55+noise(p*2.1-uTime*.05)*.3+noise(p*5.4)*.15;float fine=noise(p*8.);float limb=.4+.6*pow(max(0.,dot(normalize(vN),normalize(vV))),.35);vec3 dark=vec3(.8,.085,.005);vec3 bright=mix(vec3(2.1,1.05,.16),vec3(1.5,.38,.065),uRed);vec3 col=mix(dark,bright,smoothstep(.23,.76,n))*(.8+fine*.35)*limb;gl_FragColor=vec4(col,1.);',
            '#include <tonemapping_fragment>', '#include <encodings_fragment>', '}'
          ].join('\n')
        }));
        var geo=track(new T.SphereGeometry(0.5,48,32)), arr=geo.attributes.position;
        for(j=0;j<arr.count;j++){var x=arr.getX(j),y=arr.getY(j),z=arr.getZ(j),s=1+0.007*Math.sin(x*90+y*70)*Math.cos(z*95);arr.setXYZ(j,x*s,y*s,z*s);}geo.computeVertexNormals();
        mesh(g,geo,star);glow(g,id==='sun'?'#ffac35':'#ff6941',2.2,0.65);
        g.userData.starMaterial=star;
      } else if(id==='milkyway') {
        // Separate populations give the arms depth: warm central stars,
        // young blue associations and faint dusty gaps between spiral arms.
        var dust=track(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending,
          vertexShader:'varying vec2 p;void main(){p=uv-.5;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:[
            'varying vec2 p;float hash(vec2 q){return fract(sin(dot(q,vec2(127.1,311.7)))*43758.5453);}',
            'float noise(vec2 q){vec2 i=floor(q),f=fract(q);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}',
            'void main(){float r=length(p),a=atan(p.y,p.x);float n=noise(p*85.)*.55+noise(p*190.)*.3+noise(p*430.)*.15;float phase=(a-4.8*log(r+.075))*4.;float arms=pow(.5+.5*cos(phase+n*1.3),5.);float disk=(arms*.75+.07)*smoothstep(.5,.24,r)*smoothstep(.015,.1,r);float core=exp(-r*32.);float dust=pow(n,1.5);vec3 col=mix(vec3(.20,.29,.51),vec3(1.1,.73,.39),exp(-r*12.));gl_FragColor=vec4(col*(.65+dust),clamp((disk*(.2+dust)*1.5+core)*.85,0.,.92));',
            '#include <tonemapping_fragment>','#include <encodings_fragment>','}'
          ].join('\n')}));
        var disk=mesh(g,track(new T.PlaneGeometry(1,1)),dust);disk.rotation.x=-Math.PI/2;disk.castShadow=disk.receiveShadow=false;
        dots(g,12000,function(r,i){var rad=Math.pow(r(),.75)*.5,angle=4.8*Math.log(rad+.075)+(i%4)*Math.PI/2+(r()-.5)*(.24+rad*.8);return [Math.cos(angle)*rad,(r()-.5)*(.012+.065*Math.exp(-rad*15)),Math.sin(angle)*rad];},'#bbcdeb',.0035,31);
        dots(g,2300,function(r){var th=r()*Math.PI*2,rad=Math.pow(r(),1.8)*.13;return [Math.cos(th)*rad,(r()-.5)*.055,Math.sin(th)*rad];},'#ffe0aa',.004,21);
        dots(g,850,function(r,i){var rad=.10+r()*.39,th=4.8*Math.log(rad+.075)+(i%4)*Math.PI/2+(r()-.5)*.12;return [Math.cos(th)*rad,(r()-.5)*.013,Math.sin(th)*rad];},'#ecc6da',.012,13);
        glow(g,'#ffce91',.23,.8);glow(g,'#7b8cbf',.8,.12);g.rotation.x=.68;g.rotation.z=-.22;
      } else if(['universe','laniakea','virgo-sc'].indexOf(id)>=0) {
        var rng=random(8), nodes=[];
        for(j=0;j<44;j++)nodes.push([(rng()-0.5)*0.85,(rng()-0.5)*0.85,(rng()-0.5)*0.85]);
        var lines=[], netMat=track(new T.LineBasicMaterial({color:'#8577c5',transparent:true,opacity:0.38}));
        nodes.forEach(function(p,i){nodes.slice(i+1).forEach(function(q){if(new T.Vector3().fromArray(p).distanceTo(new T.Vector3().fromArray(q))<0.3)lines.push.apply(lines,p.concat(q));});});
        var netGeo=track(new T.BufferGeometry());netGeo.setAttribute('position',new T.Float32BufferAttribute(lines,3));g.add(new T.LineSegments(netGeo,netMat));
        dots(g,2700,function(r,i){var p=nodes[i%nodes.length];return [p[0]+(r()-0.5)*0.09,p[1]+(r()-0.5)*0.09,p[2]+(r()-0.5)*0.09];},'#d8c2ff',0.005,4);
        glow(g,'#7960bb',1.3,0.16);
      } else if(['solar-system','heliosphere','oort','local-bubble','orion-nebula'].indexOf(id)>=0) {
        if(id==='solar-system') {
          ball(g,material('#ffd69b',{emissive:'#ee9c35',emissiveIntensity:1}),0,0,0,0.025);glow(g,'#ffd998',0.1,0.7);
          [0.05,0.09,0.15,0.24,0.34,0.5].forEach(function(r,i){ring(g,r,'#596985');theta=i*2.4;ball(g,a,Math.cos(theta)*r,0,Math.sin(theta)*r,0.012);});g.rotation.x=0.35;
        } else {
          dots(g,2000,function(r){var th=r()*Math.PI*2,u=r()*2-1,rad=id==='orion-nebula'?r()*0.5:0.4+r()*0.1;return [Math.cos(th)*Math.sqrt(1-u*u)*rad,u*rad*0.72,Math.sin(th)*Math.sqrt(1-u*u)*rad];},id==='orion-nebula'?'#ef9cd8':'#9bcbea',0.009,15);
          glow(g,id==='orion-nebula'?'#d571c4':'#688acf',1.2,0.3);
        }
      } else if(id==='water') {
        var oxygen=material('#f07674'), hydrogen=material('#eff6ff');ball(g,oxygen,0,0,0,0.56);
        [-1,1].forEach(function(sign){ball(g,hydrogen,sign*0.33,-0.255,0,0.32);rod(g,[0,0,0],[sign*0.33,-0.255,0],0.035,white);});
      } else if(id==='dna') {
        var strand1=[],strand2=[],cyan=material('#73aab4',{roughness:.58}),pink=material('#d4b69b',{roughness:.6}),baseMats=[material('#849cbd'),material('#d6bd83'),material('#b58696'),material('#91b298')];
        for(j=0;j<=84;j++){
          theta=j/84*Math.PI*2.5;var yy=j/84*2.1-1.05,phase=theta+2.3;
          strand1.push([Math.cos(theta)*.43,yy,Math.sin(theta)*.43]);strand2.push([Math.cos(phase)*.43,yy,Math.sin(phase)*.43]);
          if(j%6===0){var p1=strand1[j],p2=strand2[j],mid=p1.map(function(v,k){return (v+p2[k])/2;});rod(g,p1,mid,.024,baseMats[j/6%4]);rod(g,mid,p2,.024,baseMats[(j/6+2)%4]);ball(g,white,p1[0],p1[1],p1[2],.075);ball(g,white,p2[0],p2[1],p2[2],.075);}
        }
        tube(g,strand1,.036,cyan);tube(g,strand2,.036,pink);g.userData.dimension='x';g.userData.frameHeight=2.2;
      } else if(['carbon','hydrogen','nucleus','proton'].indexOf(id)>=0) {
        var quantum=material('#bc93ec',{transparent:true,opacity:0.11,depthWrite:false,roughness:0.2});
        if(id==='carbon'||id==='hydrogen') {
          ball(g,quantum,0,0,0,1);dots(g,1500,function(r){var th=r()*Math.PI*2,u=r()*2-1,rad=Math.pow(r(),0.6)*0.5;return [Math.cos(th)*Math.sqrt(1-u*u)*rad,u*rad,Math.sin(th)*Math.sqrt(1-u*u)*rad];},'#beadff',0.007,61);
          glow(g,'#b59aec',1.25,0.2);
        } else if(id==='nucleus') {
          for(j=0;j<56;j++){theta=j*2.39996;var yy=1-j/28,rr=Math.sqrt(Math.max(0,1-yy*yy))*0.36;ball(g,j%2?material('#e998b0'):a,Math.cos(theta)*rr,yy*0.36,Math.sin(theta)*rr,0.2);}
        } else {ball(g,quantum,0,0,0,1);glow(g,'#d499ec',1,0.75);dots(g,900,function(r){return [(r()-0.5)*0.7,(r()-0.5)*0.7,(r()-0.5)*0.7];},'#e7baff',0.01,11);}
      } else if(['light','xray','gamma'].indexOf(id)>=0) {
        var wave=[];for(j=0;j<=64;j++)wave.push([j/64-0.5,Math.sin(j/64*Math.PI*2)*0.18,0]);tube(g,wave,0.015,material(id==='light'?'#90eca2':'#b9a0ff',{emissive:'#719888',emissiveIntensity:0.6}));g.userData.dimension='x';
      } else if(id==='rbc') {
        var disc=track(new T.SphereGeometry(.5,80,56)), p=disc.attributes.position, vertexColors=[];
        for(j=0;j<p.count;j++){var xx=p.getX(j),zz=p.getZ(j),rad=Math.min(1,Math.sqrt(xx*xx+zz*zz)/.5),r2=rad*rad;
          p.setY(j,Math.sign(p.getY(j))*.19*Math.sqrt(Math.max(0,1-r2))*(.32+2.4*r2-1.5*r2*r2));
          var cellColor=new T.Color().setRGB(.24+rad*.14,.009+rad*.012,.018+rad*.025);vertexColors.push(cellColor.r,cellColor.g,cellColor.b);
        }disc.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));disc.computeVertexNormals();
        mesh(g,disc,material('#ffffff',{vertexColors:true,roughness:.52,bumpMap:grainTexture,bumpScale:.004}));g.rotation.x=1.0;g.rotation.z=-.18;
      } else if(['ecoli','mitochondrion','paramecium','ribosome','virus','pollen'].indexOf(id)>=0) {
        var microColor=id==='virus'?'#b1a0b8':id==='pollen'?'#dfb36a':id==='mitochondrion'?'#bc7f65':'#72aba0';
        var skin=material(microColor,{roughness:.6,bumpMap:grainTexture,bumpScale:.016});
        if(id==='mitochondrion') {
          // Open upper membrane exposes the folded inner membrane (cutaway).
          var envelope=track(new T.SphereGeometry(.5,64,40,0,Math.PI*2,Math.PI*.42,Math.PI*.58));
          mesh(g,envelope,material('#b77658',{side:T.DoubleSide,roughness:.7,bumpMap:grainTexture,bumpScale:.008}),0,0,0,1,.48,.58);
          var cover=mesh(g,track(new T.SphereGeometry(.5,64,32,0,Math.PI*2,0,Math.PI*.42)),material('#b77658',{side:T.DoubleSide,roughness:.7,bumpMap:grainTexture,bumpScale:.008}),0,0,0,1,.48,.58);
          g.userData.outerMembrane=cover;cover.visible=false;
          var inner=material('#d69b7f',{side:T.DoubleSide,roughness:.72});
          for(j=0;j<10;j++){var fx=-.39+j*.087,fw=Math.sqrt(Math.max(0,1-Math.pow(fx/.48,2)))*.21,fold=[];
            var sheet=[];
            for(k=0;k<=20;k++){var fz=-fw+k/20*fw*2;fold.push([fx+Math.sin(k*.32)*.025,.02+Math.sin(k/20*Math.PI)*.08,fz]);
              if(k){var prev=fold[k-1],cur=fold[k];sheet.push(prev[0],prev[1],prev[2],prev[0]-.015,-.08,prev[2],cur[0],cur[1],cur[2],cur[0],cur[1],cur[2],prev[0]-.015,-.08,prev[2],cur[0]-.015,-.08,cur[2]);}
            }
            var foldGeo=track(new T.BufferGeometry());foldGeo.setAttribute('position',new T.Float32BufferAttribute(sheet,3));foldGeo.computeVertexNormals();mesh(g,foldGeo,inner);tube(g,fold,.008,inner);
          }g.rotation.x=.65;g.rotation.z=-.24;
        } else if(id==='virus'||id==='pollen') {
          mesh(g,track(new T.IcosahedronGeometry(.4,4)),skin);
          var spike=material(id==='virus'?'#a86b72':'#c49143',{roughness:.7});
          for(j=0;j<94;j++){theta=j*2.39996;var v=1-(j+.5)/47,s=Math.sqrt(Math.max(0,1-v*v)),unit=[Math.cos(theta)*s,v,Math.sin(theta)*s],end=unit.map(function(x){return x*.51;});
            rod(g,unit.map(function(x){return x*.39;}),end,id==='virus'?.009:.017,spike);
            if(id==='virus'){var cap=ball(g,spike,end[0],end[1],end[2],.054,.026,.054);cap.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3().fromArray(unit));}
          }
        } else {
          organic(g,[[-.5,0,0,.002],[-.39,0,0,.15],[-.17,.02,0,.18],[.15,0,0,.16],[.39,-.02,0,.12],[.5,0,0,.002]],skin,'x');
          var hairs=material('#a4c4a0',{roughness:1});
          for(j=0;j<(id==='paramecium'?90:16);j++){theta=j*2.39996;var hx=-.42+(j%15)/14*.84,hy=Math.cos(theta)*.155,hz=Math.sin(theta)*.155;
            tube(g,[[hx,hy,hz],[hx+.03,hy*1.4,hz*1.4],[hx+.07,hy*1.6,hz*1.6]],.0025,hairs);
          }
          if(id==='ecoli'){for(j=0;j<4;j++){var flag=[];for(k=0;k<32;k++)flag.push([.42+k*.016,Math.sin(k*.35+j)*.07,Math.cos(k*.35+j)*.07]);tube(g,flag,.003,hairs);}g.userData.extent=1;}
          if(id==='ribosome'){for(j=0;j<28;j++){theta=j*2.4;ball(g,j%3?skin:b,Math.cos(theta)*.22,(j/28-.5)*.36,Math.sin(theta)*.17,.16,.19,.14);}}
          g.rotation.z=-.25;
        }
      } else if(id==='human'||id==='liberty') {
        var suit=material(id==='liberty'?'#7c9c87':'#a49b80',{roughness:.55,metalness:.3});
        ball(g,suit,0,.414,0,.113,.145,.116);rod(g,[0,.30,0],[0,.36,0],.027,suit);
        organic(g,[[0,-.055,0,.055,.09],[0,.015,0,.068,.09],[0,.13,0,.05,.079],[0,.24,0,.064,.117],[0,.3,0,.03,.08]],suit,'y');
        [-1,1].forEach(function(s){
          organic(g,[[s*.054,.02,0,.047],[s*.067,-.12,.008,.045],[s*.076,-.25,.01,.028],[s*.075,-.35,0,.034],[s*.077,-.45,0,.02]],suit,'y');
          ball(g,suit,s*.079,-.472,.026,.055,.046,.12);
          organic(g,[[s*.096,.269,0,.038],[s*.145,.20,0,.035],[s*.175,.10,0,.023],[s*.2,.035,.01,.025],[s*.213,-.045,.015,.013]],suit,'y');
          ball(g,suit,s*.219,-.078,.017,.032,.067,.022);
        });
        if(id==='liberty'){box(g,b,0,-0.64,0,0.5,0.25,0.4);rod(g,[0.15,0.27,0],[0.3,0.63,0],0.03,suit);ball(g,b,0.3,0.68,0,0.1);}
      } else if(id==='door') {
        box(g,b,-0.24,0,0,0.035,1,0.065);box(g,b,0.24,0,0,0.035,1,0.065);box(g,b,0,0.48,0,0.51,0.04,0.065);
        box(g,material('#5a8f91'),-0.035,-0.01,-0.045,0.41,0.94,0.028);ball(g,white,0.12,-0.025,0,0.025);
      } else if(id==='basketball') {
        ball(g,material('#be692c',{roughness:0.95,bumpMap:grainTexture,bumpScale:.015}),0,0,0,1);
        for(j=0;j<3;j++){m=ring(g,0.502,'#4a3630',j*Math.PI/2);if(j===2)m.rotation.y=Math.PI/2;}
      } else if(id==='sequoia') {
        var bark=material('#82604b',{roughness:1,bumpMap:wrinkleTexture,bumpScale:.007});
        organic(g,[[0,-.5,0,.064],[0,-.45,0,.04],[0,-.24,0,.026],[.004,.02,0,.019],[0,.3,0,.01],[.008,.5,0,.0005]],bark,'y');
        var needleCanvas=document.createElement('canvas');needleCanvas.width=needleCanvas.height=128;var nc=needleCanvas.getContext('2d');
        nc.strokeStyle='#9da57a';nc.lineWidth=2;nc.beginPath();nc.moveTo(64,124);nc.lineTo(64,5);nc.stroke();
        for(j=0;j<28;j++){var ny=8+j*4,nw=Math.sin(j/28*Math.PI)*48+4;nc.strokeStyle=j%3?'#bac3a0':'#748e68';nc.lineWidth=2.2;[-1,1].forEach(function(s){nc.beginPath();nc.moveTo(64,ny+12);nc.lineTo(64+s*nw,ny-5);nc.stroke();});}
        var needleMap=track(new T.CanvasTexture(needleCanvas));needleMap.encoding=T.sRGBEncoding;
        var needles=material('#6b8553',{roughness:1,map:needleMap,alphaTest:.28,side:T.DoubleSide}),rngTree=random(91),leafPos=[],leafUv=[];
        for(j=0;j<3;j++){var angle=j*Math.PI/3;[[-.5,-.5,0,0],[.5,-.5,1,0],[.5,.5,1,1],[-.5,-.5,0,0],[.5,.5,1,1],[-.5,.5,0,1]].forEach(function(v){leafPos.push(v[0]*Math.cos(angle),v[1],v[0]*Math.sin(angle));leafUv.push(v[2],v[3]);});}
        var foliageGeo=track(new T.BufferGeometry());foliageGeo.setAttribute('position',new T.Float32BufferAttribute(leafPos,3));foliageGeo.setAttribute('uv',new T.Float32BufferAttribute(leafUv,2));foliageGeo.computeVertexNormals();
        var foliage=track(new T.InstancedMesh(foliageGeo,needles,420)),transform=new T.Object3D();foliage.castShadow=foliage.receiveShadow=true;g.add(foliage);
        for(j=0;j<35;j++) {
          var by=-.22+j/35*.68,br=(.52-by)*.22,ba=j*2.4;
          var end=[Math.cos(ba)*br,by+.025,Math.sin(ba)*br];
          tube(g,[[0,by-.035,0],[end[0]*.55,by,end[2]*.55],end],.004,bark);
          for(k=0;k<12;k++){var frac=.15+k*.077;transform.position.set(end[0]*frac+(rngTree()-.5)*.04,by+(rngTree()-.5)*.055,end[2]*frac+(rngTree()-.5)*.04);transform.scale.set(br*.55,.06+br*.2,br*.55);transform.rotation.set(rngTree()*2,ba,rngTree()*2);transform.updateMatrix();foliage.setMatrixAt(j*12+k,transform.matrix);}
        }foliage.instanceMatrix.needsUpdate=true;g.userData.extent=1;
      } else if(id==='eiffel') {
        var iron=material('#cfaa7c',{metalness:0.65});
        for(j=0;j<4;j++){theta=j*Math.PI/2+Math.PI/4;rod(g,[Math.cos(theta)*0.27,-0.5,Math.sin(theta)*0.27],[0,0.5,0],0.012,iron);}
        for(j=0;j<7;j++){var ht=-0.42+j*0.13,rr=(0.5-ht)*0.24;box(g,iron,0,ht,0,rr*2,0.013,rr*2);}
        for(j=0;j<6;j++)for(k=0;k<4;k++){theta=k*Math.PI/2;var y0=-0.42+j*0.13,r0=(0.5-y0)*0.18,r1=(0.37-y0)*0.18;rod(g,[Math.cos(theta)*r0-Math.sin(theta)*r0,y0,Math.sin(theta)*r0+Math.cos(theta)*r0],[Math.cos(theta)*r1+Math.sin(theta)*r1,y0+0.13,Math.sin(theta)*r1-Math.cos(theta)*r1],0.005,iron);}
      } else if(id==='pyramid') {
        mesh(g,track(new T.ConeGeometry(0.707,0.64,4)),material('#ceac74'),0,0,0).rotation.y=Math.PI/4;g.userData.dimension='x';
      } else if(id==='football-pitch') {
        box(g,material('#368568'),0,0,0,1,0.014,0.65);var chalk=material('#e3e8dc');
        [-0.47,0,0.47].forEach(function(x){rod(g,[x,0.013,-0.29],[x,0.013,0.29],0.002,chalk);});[-0.29,0.29].forEach(function(z){rod(g,[-0.47,0.013,z],[0.47,0.013,z],0.002,chalk);});ring(g,0.085,'#e3e8dc');g.rotation.x=0.25;
      } else if(['everest','grand-canyon','reef','chicxulub'].indexOf(id)>=0) {
        var terrain=track(new T.PlaneGeometry(1,1,100,100)), pos=terrain.attributes.position,landColors=[];
        for(j=0;j<pos.count;j++){var tx=pos.getX(j),ty=pos.getY(j),d=Math.sqrt(tx*tx+ty*ty),hgt;
          if(id==='everest')hgt=Math.max(0,0.7-d*1.5)*(0.85+0.15*Math.sin(tx*23)*Math.cos(ty*18));
          else if(id==='chicxulub')hgt=0.12*Math.exp(-Math.pow((d-0.3)*24,2));
          else if(id==='grand-canyon')hgt=0.2-0.16*Math.exp(-Math.pow((tx+Math.sin(ty*9)*0.08)*13,2));
          else hgt=0.035+0.04*Math.sin(tx*50)*Math.cos(ty*38);
          var detail=(Math.sin(tx*74+ty*31)+Math.sin(ty*137-tx*59))*.003;
          hgt+=detail;pos.setZ(j,hgt);
          var lc=new T.Color(id==='reef'?'#477c73':id==='everest'?'#655e55':'#945c3c').convertSRGBToLinear();
          if(id==='everest')lc.lerp(new T.Color('#ecf1ed').convertSRGBToLinear(),clamp((hgt-.22+Math.sin(tx*60)*.028)*8,0,1));
          else if(id==='grand-canyon')lc.multiplyScalar(.7+.3*Math.sin(hgt*220));
          else if(id==='reef')lc.lerp(new T.Color('#a7a177').convertSRGBToLinear(),clamp(hgt*9,0,1));
          landColors.push(lc.r,lc.g,lc.b);
        }
        terrain.setAttribute('color',new T.Float32BufferAttribute(landColors,3));terrain.computeVertexNormals();m=mesh(g,terrain,material('#ffffff',{vertexColors:true,side:T.DoubleSide,roughness:.95,bumpMap:grainTexture,bumpScale:.008}));m.rotation.x=-Math.PI/2;g.rotation.x=.32;g.rotation.y=-.35;
      } else if(id==='trex') {
        var reptile=material('#77785b',{roughness:.88,bumpMap:grainTexture,bumpScale:.004}),jawMat=material('#a19a76',{roughness:.85}),claw=material('#403c30');
        organic(g,[[-.28,.09,0,.028],[-.18,.04,0,.061,.09],[.01,.025,0,.08,.103],[.14,.025,0,.052,.065],[.23,.036,0,.032,.039],[.39,.065,0,.017,.018],[.56,.088,.005,.0005]],reptile,'x');
        organic(g,[[-.27,.06,0,.055],[-.30,.12,0,.054],[-.30,.17,0,.036]],reptile,'y');
        organic(g,[[-.50,.145,0,.015,.027],[-.46,.153,0,.036,.035],[-.35,.157,0,.045,.046],[-.27,.155,0,.034,.035],[-.24,.14,0,.008]],reptile,'x');
        organic(g,[[-.493,.099,0,.002],[-.44,.083,0,.029,.012],[-.33,.08,0,.037,.018],[-.26,.113,0,.017]],jawMat,'x');
        var tooth=material('#d9d0ad',{roughness:.7});
        [-1,1].forEach(function(s){
          organic(g,[[.06,.02,s*.056,.052],[.005,-.095,s*.086,.046],[.08,-.205,s*.082,.024],[.046,-.275,s*.088,.013]],reptile,'y');
          for(var n=0;n<3;n++){var tz=s*.085+(n-1)*.016;tube(g,[[.046,-.273,s*.088],[.017,-.286,tz],[-.047,-.287,tz]],.008,reptile);tube(g,[[-.046,-.286,tz],[-.06,-.29,tz]],.004,claw);}
          organic(g,[[-.20,.006,s*.06,.015],[-.255,-.023,s*.085,.011],[-.24,-.058,s*.08,.005]],reptile,'y');
          for(var digit=0;digit<2;digit++)tube(g,[[-.24,-.058,s*.08],[-.262,-.066,s*(.077+digit*.011)],[-.27,-.055,s*(.077+digit*.011)]],.0035,claw);
          ball(g,material('#b69551',{roughness:.4}),-.32,.174,s*.041,.013,.013,.008);ball(g,dark,-.322,.175,s*.045,.005,.008,.003);
          ball(g,dark,-.475,.161,s*.027,.008,.005,.003);
          for(var t=0;t<7;t++){var tx=-.466+t*.025;mesh(g,track(new T.ConeGeometry(.0035,.014,7)),tooth,tx,.116,s*.028).rotation.z=Math.PI;}
        });g.rotation.y=-.25;
      } else if(id==='giraffe') {
        var patterned=material('#ffffff',{map:giraffeTexture(),roughness:.92,bumpMap:grainTexture,bumpScale:.001}),muzzle=material('#b49b70'),hoof=material('#403f36');
        organic(g,[[-.23,-.035,0,.015],[-.16,-.025,0,.077,.10],[.04,-.065,0,.069,.092],[.19,-.085,0,.052,.07],[.23,-.10,0,.002]],patterned,'x');
        organic(g,[[-.16,-.02,0,.056],[-.20,.11,0,.039],[-.255,.30,0,.027],[-.27,.41,0,.022]],patterned,'y');
        organic(g,[[-.39,.42,0,.011,.015],[-.35,.43,0,.024,.02],[-.29,.435,0,.031,.032],[-.24,.43,0,.017]],patterned,'x');
        ball(g,muzzle,-.377,.417,0,.045,.04,.047);
        [-1,1].forEach(function(s){
          [-.16,.16].forEach(function(x){organic(g,[[x,-.08,s*.048,.027],[x+.017,-.24,s*.06,.015],[x+.01,-.385,s*.062,.012],[x+.012,-.485,s*.063,.008]],patterned,'y');ball(g,hoof,x+.008,-.495,s*.063,.038,.026,.028);});
          var ear=ball(g,patterned,-.24,.454,s*.045,.07,.015,.031);ear.rotation.y=s*-.6;ear.rotation.z=.35;
          rod(g,[-.28,.454,s*.014],[-.276,.502,s*.018],.0055,patterned);ball(g,hoof,-.276,.505,s*.018,.016);
          ball(g,dark,-.308,.444,s*.028,.012,.011,.007);
        });
        tube(g,[[.21,-.077,0],[.25,-.16,0],[.28,-.28,.015],[.30,-.34,.015]],.006,muzzle);ball(g,hoof,.30,-.347,.015,.025,.06,.024);
        for(j=0;j<24;j++){var ny=.02+j/24*.38,nx=-.15-(ny-.02)*.25;rod(g,[nx,ny,-.026],[nx+.016,ny+.005,-.029],.0018,hoof);}
        g.rotation.y=-.2;
      } else if(['blue-whale','mouse','elephant'].indexOf(id)>=0) {
        var coat=material(id==='blue-whale'?'#667f88':id==='giraffe'?'#c7a16b':'#62645c',{roughness:id==='blue-whale'?.58:.92,bumpMap:wrinkleTexture,bumpScale:id==='elephant'?.0025:.001});
        if(id==='blue-whale') {
          organic(g,[[-.5,.015,0,.001],[-.43,.015,0,.065,.047],[-.29,.01,0,.094,.08],[-.08,0,0,.091,.095],[.18,.01,0,.058,.06],[.38,.035,0,.018,.025],[.46,.052,0,.013,.013]],coat,'x');
          var belly=material('#a5b0ad',{roughness:.74});
          for(j=0;j<9;j++){var zz=(j-4)*.012;tube(g,[[-.44,-.016,zz*.4],[-.30,-.061,zz],[-.12,-.083,zz*.8],[.05,-.057,zz*.35]],.0015,belly);}
          tube(g,[[-.48,.008,.025],[-.37,-.024,.065],[-.25,-.02,.086]],.002,dark);
          [-1,1].forEach(function(s){organic(g,[[.40,.04,0,.01],[.44,.057,s*.07,.014,.045],[.46,.065,s*.145,.005,.029],[.49,.072,s*.22,.0005]],coat,'y');
            organic(g,[[-.14,-.032,s*.072,.008],[-.05,-.076,s*.15,.009,.033],[.06,-.11,s*.23,.0005]],coat,'y');ball(g,dark,-.365,.007,s*.06,.008);});
          organic(g,[[.24,.055,0,.023,.023],[.28,.102,0,.009,.014],[.30,.10,0,.0005]],coat,'y');
          g.rotation.y=-.35;g.rotation.z=-.06;
        } else {
          organic(g,[[-.36,.09,0,.03],[-.27,.04,0,.14,.17],[-.04,.035,0,.18,.19],[.20,.02,0,.15,.17],[.31,.00,0,.02]],coat,'x');
          ball(g,coat,-.34,.12,0,.245,.28,.245);
          [-1,1].forEach(function(s){[-1,1].forEach(function(z){organic(g,[[s*.19,-.03,z*.095,.066],[s*.20,-.17,z*.102,.052],[s*.22,-.29,z*.105,.035],[s*.22,-.35,z*.11,.043]],coat,'y');
            ball(g,coat,s*.22,-.35,z*.108,.09,.052,.085);
          });});
          organic(g,[[.29,.05,0,.018],[.36,-.01,0,.013],[.40,-.15,0,.008],[.43,-.22,.02,.002]],coat,'y');
        }
        if(id==='elephant'){
          organic(g,[[-.40,.17,0,.061],[-.46,.06,0,.053],[-.49,-.10,0,.037],[-.48,-.26,.01,.026],[-.42,-.29,.025,.013]],coat,'y');
          var ivory=material('#d1c6a6',{roughness:.48});
          [-1,1].forEach(function(s){
            var ear=ball(g,coat,-.245,.13,s*.15,.21,.33,.037);ear.rotation.y=s*.5;ear.rotation.z=-.18;
            organic(g,[[-.4,.04,s*.07,.016],[-.46,-.04,s*.085,.014],[-.51,-.047,s*.09,.007],[-.54,-.018,s*.09,.0005]],ivory,'x');
            ball(g,dark,-.397,.173,s*.092,.012);
            for(j=0;j<3;j++)ball(g,ivory,-.235+j*.02,-.363,s*.14,.014,.017,.009);
          });g.rotation.y=-.32;
        }
        if(id==='mouse')[-1,1].forEach(function(s){ball(g,b,-0.31,0.18,s*0.09,0.13,0.14,0.04);});
        if(id!=='blue-whale'&&id!=='elephant')ball(g,dark,-0.41,0.1,0.11,0.018);g.userData.dimension=item.dim==='tall'?'y':'x';
      } else if(id==='honeybee') {
        var chitin=material('#322b22',{roughness:.55,bumpMap:grainTexture,bumpScale:.002}),gold=material('#b58c4e',{roughness:.95}),eyes=material('#171b19',{roughness:.23});
        ball(g,chitin,-.386,.014,0,.225,.253,.242);
        ball(g,gold,-.17,0,0,.29,.31,.31);
        organic(g,[[-.055,0,0,.032],[.04,-.012,0,.12,.11],[.19,-.028,0,.146,.116],[.34,-.045,0,.104,.08],[.47,-.065,0,.028,.025],[.50,-.069,0,.0005]],material('#ffffff',{map:beeAbdomenTexture(),roughness:.67,bumpMap:grainTexture,bumpScale:.002}),'x');
        fur(g,[-.17,0,0],[.147,.157,.157],1800,.019,'#cbb77f',18);fur(g,[-.386,.014,0],[.113,.127,.122],600,.012,'#b5a576',25);
        var membrane=material('#c7d3c5',{transparent:true,opacity:.3,depthWrite:false,side:T.DoubleSide,roughness:.35}),vein=material('#897b5a',{roughness:.8});
        [-1,1].forEach(function(s){
          ball(g,eyes,-.417,.048,s*.09,.11,.17,.072);
          tube(g,[[-.454,.08,s*.043],[-.51,.145,s*.076],[-.61,.17,s*.10]],.006,chitin);
          beeWing(g,s,true,membrane,vein);beeWing(g,s,false,membrane,vein);
          for(var leg=0;leg<3;leg++){var lx=-.27+leg*.11,ex=lx+(leg-1)*.14;
            tube(g,[[lx,-.055,s*.10],[lx-.025,-.12,s*.20],[ex,-.20,s*.24],[ex-.07,-.27,s*.29]],.011,chitin);
            tube(g,[[ex-.07,-.27,s*.29],[ex-.09,-.275,s*.33]],.004,chitin);
            if(leg===2)ball(g,gold,ex-.015,-.20,s*.25,.05,.075,.038);
          }
        });g.rotation.x=.22;g.rotation.y=-.22;g.userData.extent=1;g.userData.measureCenter=0;
      } else if(id==='ladybird') {
        var shellRed=material('#ac3029',{roughness:.31,bumpMap:grainTexture,bumpScale:.001}),black=material('#192220',{roughness:.45});
        ball(g,black,-.36,-.015,0,.24,.21,.29);ball(g,black,-.19,.01,0,.24,.26,.46);
        var carapace=ball(g,shellRed,.095,.015,0,.79,.40,.58);
        tube(g,[[-.275,.064,0],[-.17,.181,0],[.12,.215,0],[.42,.127,0],[.489,.015,0]],.005,black);
        [-1,1].forEach(function(s){
          ellipsoidMark(g,white,[-.19,.01,0],[.12,.13,.23],-.24,s*.16,.025,.026);
          [[-.11,.11],[.085,.17],[.28,.14]].forEach(function(p){ellipsoidMark(g,black,[.095,.015,0],[.395,.20,.29],p[0],s*p[1],.05,.038);});
          for(var l=0;l<3;l++){var xx=-.24+l*.2;tube(g,[[xx,-.06,s*.16],[xx-.06,-.14,s*.27],[xx-.10,-.205,s*.32]],.010,black);}
          tube(g,[[-.43,.035,s*.065],[-.49,.08,s*.095],[-.535,.083,s*.13]],.005,black);ball(g,black,-.535,.083,s*.13,.02);
          ball(g,black,-.425,.03,s*.104,.041,.047,.028);
        });g.rotation.x=.42;g.rotation.y=-.18;
      } else if(id==='flea'||id==='dust-mite') {
        var insect=material('#b69e88',{roughness:.76,bumpMap:grainTexture,bumpScale:.003});
        ball(g,insect,.08,0,0,.7,.4,id==='flea'?.21:.4);ball(g,insect,-.36,0,0,.28);
        var legCount=id==='dust-mite'?4:3;
        for(j=0;j<legCount;j++)[-1,1].forEach(function(s){var xx=-.23+j*.17;tube(g,[[xx,-.05,s*.09],[xx-.07,-.17,s*.26],[xx-.12,-.29,s*.37]],.013,insect);});
        fur(g,[.08,0,0],[.35,.2,id==='flea'?.105:.2],150,.045,'#c9b89c',32);
      } else if(id==='hair') {mesh(g,track(new T.CylinderGeometry(0.5,0.5,3,32)),material('#a98a66'));g.userData.dimension='x';}
      else if(id==='egg'||id==='rice') {ball(g,white,0,0,0,id==='egg'?0.74:0.3,1,id==='egg'?0.74:0.3);g.userData.dimension='y';}
      else {mesh(g,track(new T.IcosahedronGeometry(0.5,1)),material('#dab990',{flatShading:true,roughness:0.8}));}
      // Normalize the stated dimension, not the bounding box's longest side:
      // DNA and hair are widths; a height remains a height.
      g.updateMatrixWorld(true);var bounds=new T.Box3().setFromObject(g), size=new T.Vector3();bounds.getSize(size);
      var axis=g.userData.dimension || (item.dim==='tall'?'y':'x');
      // Glows describe illumination, not the object's measured surface.
      var extent=g.userData.extent||(['earth','moon','jupiter','sun','betelgeuse','carbon','hydrogen','proton','milkyway','universe','laniakea','virgo-sc','oort','heliosphere','local-bubble','orion-nebula'].indexOf(id)>=0?1:size[axis]);
      g.scale.multiplyScalar(1/Math.max(0.001,extent));
      var measuredCenter=g.userData.measureCenter!==undefined?g.userData.measureCenter:(bounds.min[axis]+bounds.max[axis])/2;
      g.position[axis]=-measuredCenter/Math.max(.001,extent);
      var root=new T.Group();root.add(g);root.userData.itemId=id;root.userData.model=g;root.userData.initialYaw=g.rotation.y;
      root.userData.floor=bounds.min.y/extent+(axis==='y'?g.position.y:0);
      var ruler=new T.Group(), rulerMat=track(new T.MeshBasicMaterial({color:new T.Color('#91b9c8').convertSRGBToLinear(),transparent:true,opacity:.8,depthTest:false,depthWrite:false}));
      if(axis==='y') {
        var rulerX=bounds.max.x/extent+.16;
        rod(ruler,[rulerX,-0.5,0],[rulerX,0.5,0],0.0015,rulerMat);
        [-0.5,0.5].forEach(function(y){rod(ruler,[rulerX-.04,y,0],[rulerX+.04,y,0],0.0015,rulerMat);});
      } else {
        var rulerY=bounds.min.y/extent-.16;
        rod(ruler,[-0.5,rulerY,0],[0.5,rulerY,0],0.0015,rulerMat);
        [-0.5,0.5].forEach(function(x){rod(ruler,[x,rulerY-.04,0],[x,rulerY+.04,0],0.0015,rulerMat);});
      }
      ruler.traverse(function(n){n.castShadow=n.receiveShadow=false;n.renderOrder=100;});
      root.add(ruler);root.userData.ruler=ruler;
      root.userData.materials=[];g.traverse(function(n){if(n.material){n.userData.baseOpacity=n.material.opacity;n.userData.baseTransparent=n.material.transparent;root.userData.materials.push(n);}});
      root.userData.resources=Array.from(resources).filter(function(r){return !previousResources.has(r);});
      space.add(root);models[id]=root;if(id==='human')loadHumanSurface(root);return root;
    }
    function trimModelCache() {
      var cached=Object.keys(models), evict=cached.filter(function(id){return !models[id].visible;}).sort(function(a,b){return models[a].userData.lastSeen-models[b].userData.lastSeen;});
      while(cached.length>10&&evict.length){var oldId=evict.shift(),old=models[oldId];old.userData.model.userData.released=true;space.remove(old);old.userData.resources.forEach(function(r){r.dispose();resources.delete(r);});delete models[oldId];cached.pop();}
    }
    function paintComparison(state, width, height) {
      var pair = state.comparison, visible = [], list = pair.a.id === pair.b.id ? [pair.a] : [pair.a, pair.b];
      activeCamera = comparisonCamera; cameraSettling = false; paintCount++;
      scene.background = new T.Color(state.contrast ? '#000000' : '#101f2a'); scene.fog = null;
      ground.visible = garden.visible = microBackdrop.visible = leafWorld.visible = floor.visible = motes.visible = false;
      if (focusRing) focusRing.visible = false;
      key.castShadow = false; key.intensity = 1.7; hemisphere.intensity = .55; rim.intensity = .7; fill.intensity = .28;
      haze.material.opacity = haze2.material.opacity = .025;
      if (markers) Array.prototype.forEach.call(markers.querySelectorAll('[data-scale-marker]'), function (button) { button.hidden = true; });
      Object.keys(models).forEach(function (id) { models[id].visible = false; });
      list.forEach(function (item) {
        var root = models[item.id] || model(item);
        root.visible = true; root.userData.lastSeen = paintCount;
        root.scale.setScalar(3 * item.size / pair.big.size);
        root.userData.ruler.visible = state.measure;
        root.userData.model.rotation.y = root.userData.initialYaw;
        if (root.userData.model.userData.outerMembrane) root.userData.model.userData.outerMembrane.visible = !state.cutaway;
        root.userData.materials.forEach(function (n) {
          if (n.material.transparent !== n.userData.baseTransparent) { n.material.transparent = n.userData.baseTransparent; n.material.needsUpdate = true; }
          n.material.opacity = n.userData.baseOpacity;
        });
        visible.push(root);
      });
      var layoutKey = list.map(function (item) { return item.id + ':' + item.size + ':' + !!models[item.id].userData.model.userData.surfaceReady; }).join('|') + ':' + state.cutaway + ':' + state.measure;
      if (layoutKey !== comparisonLayoutKey) {
        comparisonLayoutKey = layoutKey;
        var left = 0;
        visible.forEach(function (root) {
          root.position.set(0, 0, 0); root.updateMatrixWorld(true);
          var bounds = new T.Box3().setFromObject(root.userData.model);
          root.position.set(left - bounds.min.x, -bounds.min.y, 0);
          left += bounds.max.x - bounds.min.x + .65;
        });
        scene.updateMatrixWorld(true); comparisonBounds.makeEmpty();
        visible.forEach(function (root) { comparisonBounds.union(new T.Box3().setFromObject(root)); });
        comparisonBounds.getCenter(comparisonCenter);
        comparisonRadius = Math.max(1.5, comparisonBounds.getSize(new T.Vector3()).length() / 2);
      }
      // Fit the bounds projected onto this camera's right and up axes, leaving
      // a clear heading band. A locator never changes either model's size.
      var aspect = width / height, extent = comparisonBounds.getSize(new T.Vector3()).multiplyScalar(.5);
      var upAxis = new T.Vector3(-Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), -Math.cos(yaw) * Math.sin(pitch));
      var halfWidth = Math.abs(Math.cos(yaw)) * extent.x + Math.abs(Math.sin(yaw)) * extent.z;
      var halfHeight = Math.abs(upAxis.x) * extent.x + Math.abs(upAxis.y) * extent.y + Math.abs(upAxis.z) * extent.z;
      var halfH = Math.max(halfHeight / Math.max(.3, (height - 210) / height), halfWidth / (aspect * Math.max(.4, (width - 60) / width))) * 1.06 / cameraZoom;
      comparisonCamera.left = -halfH * aspect; comparisonCamera.right = halfH * aspect;
      comparisonCamera.top = halfH; comparisonCamera.bottom = -halfH;
      var distance = comparisonRadius * 3 + 10;
      comparisonCamera.far = distance + comparisonRadius * 4 + 10;
      comparisonCamera.updateProjectionMatrix();
      cameraAim.copy(comparisonCenter).addScaledVector(upAxis, halfH * 80 / height);
      comparisonCamera.position.set(Math.sin(yaw) * Math.cos(pitch) * distance, Math.sin(pitch) * distance, Math.cos(yaw) * Math.cos(pitch) * distance).add(cameraAim);
      comparisonCamera.lookAt(cameraAim); comparisonCamera.updateMatrixWorld(true);
      if (comparisonLabels) Array.prototype.forEach.call(comparisonLabels.querySelectorAll('[data-scale-comparison-point]'), function (button) {
        var root = visible.filter(function (r) { return r.userData.itemId === button.dataset.scaleComparisonPoint; })[0];
        var pixels = root ? root.scale.x * height / (2 * halfH) : 0;
        button.hidden = !root || pixels >= 2;
        if (root && pixels < 2) {
          markerPoint.copy(root.position).project(comparisonCamera);
          var px = clamp((markerPoint.x * .5 + .5) * width, 94, width - 94), py = clamp((-markerPoint.y * .5 + .5) * height, 145, height - 85);
          button.style.transform = 'translate(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px) translate(-50%,-50%)';
        }
      });
      trimModelCache(); renderer.render(scene, comparisonCamera);
      canvas.dataset.atlasReady = 'true'; canvas.dataset.atlasObjects = visible.map(function (r) { return r.userData.itemId; }).join(',');
      canvas.dataset.atlasComparison = pair.a.id + ':' + pair.b.id; canvas.dataset.atlasProjection = 'orthographic';
      canvas.dataset.atlasSmallPixels = (3 / pair.ratio * height / (2 * halfH)).toPrecision(5);
      canvas.dataset.atlasExponent = canvas.dataset.atlasTarget = log10(pair.big.size).toFixed(4);
      canvas.dataset.atlasYaw = yaw.toFixed(4); canvas.dataset.atlasZoom = cameraZoom.toFixed(2);
      canvas.dataset.atlasDetail = ''; canvas.dataset.atlasHabitat = 'studio';
      canvas.dataset.atlasCutaway = state.cutaway ? 'open' : 'closed';
      dirty = false;
    }
    function paint() {
      if(disposed)return;
      var state=read(), e=state.exp, realm=realmAt(e), width=canvas.clientWidth,height=canvas.clientHeight;
      if(!width||!height)return;
      if(state.inspectionZoom!==lastZoomInput){cameraZoom=clamp(state.inspectionZoom||1,1,2.5);lastZoomInput=state.inspectionZoom;}
      var ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio)){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
      if (state.comparison) { paintComparison(state, width, height); return; }
      activeCamera = camera; comparisonLayoutKey = '';
      canvas.dataset.atlasComparison = ''; canvas.dataset.atlasProjection = 'perspective'; delete canvas.dataset.atlasSmallPixels;
      if (comparisonLabels) Array.prototype.forEach.call(comparisonLabels.querySelectorAll('[data-scale-comparison-point]'), function (button) { button.hidden = true; });
      scene.background=new T.Color(state.contrast?'#000000':realm.bg);haze.material.color.set(realm.color);haze2.material.color.set(realm.color);
      motes.visible=!state.contrast&&realm.id!=='human';motes.rotation.y=e*0.027+(state.motion?time*0.001:0);
      motes.material.size = realm.id === 'micro' ? 0.1 : 0.045;
      motes.material.color.set(realm.id === 'micro' ? '#79dfc6' : '#ffffff');
      ground.visible = garden.visible = realm.id === 'human';
      microBackdrop.visible = realm.id === 'micro';
      scene.fog=realm.id==='human'?new T.Fog(realm.bg,9,33):null;
      var cosmic=realm.id==='planet'||realm.id==='stellar'||realm.id==='cosmic';
      hemisphere.intensity=cosmic?.065:.36;rim.intensity=cosmic?.08:.55;fill.intensity=cosmic?.025:.12;
      key.intensity=cosmic?2.6:1.25;key.castShadow=ground.visible;
      haze.material.opacity=cosmic?.065:.08;haze2.material.opacity=cosmic?.045:.04;
      var candidates=state.items.filter(function(it){return Math.abs(log10(it.size)-e)<1.9;}).sort(function(a,b){return Math.abs(log10(a.size)-e)-Math.abs(log10(b.size)-e);});
      if(!state.neighbors)candidates=candidates.slice(0,1);
      var focal=candidates[0],close=focal?1-clamp(Math.abs(log10(focal.size)-e)*3,0,1):0;
      if(focal&&focal.id==='blue-whale'){
        ground.visible=garden.visible=false;key.castShadow=false;scene.background.set(state.contrast?'#000000':'#071d28');scene.fog=null;
        motes.visible=!state.contrast;motes.material.color.set('#78aab8');motes.material.size=.06;hemisphere.intensity=.4;
      }
      var distance=6.8+(focal&&focal.id==='dna'?6.7*close:focal&&focal.id==='hair'?7.5*close:0);
      // Leave a quiet band for the heading and fit narrow portrait screens.
      distance*=Math.max(1,.95/camera.aspect);
      distance/=cameraZoom;
      var detailKey=state.focusId+':'+state.detailId;
      if(state.detailId&&detailKey!==previousDetail){yaw=0;pitch=.12;}
      previousDetail=detailKey;
      var cameraPitch=ground.visible?Math.max(-.1,pitch):pitch;
      var occupied=[], visible=[];paintCount++;
      Object.keys(models).forEach(function(id){models[id].visible=false;});
      candidates.forEach(function(it){
        var delta=log10(it.size)-e;
        if(occupied.some(function(d){return Math.abs(d-delta)<0.27;}))return;
        occupied.push(delta);var root=models[it.id]||model(it), scale=3*Math.pow(10,delta);
        root.visible=true;root.userData.lastSeen=paintCount;root.scale.setScalar(scale);root.userData.ruler.visible=occupied.length===1&&state.measure;
        if(it.group==='cosmic' && it.dim!=='distance')root.userData.model.rotation.y=root.userData.initialYaw+time*0.018;
        if(root.userData.model.userData.starMaterial)root.userData.model.userData.starMaterial.uniforms.uTime.value=time;
        if(root.userData.model.userData.outerMembrane)root.userData.model.userData.outerMembrane.visible=!state.cutaway;
        var shoulder = Math.sign(delta) * scale * 0.65 * Math.min(1, Math.abs(delta) * 5);
        root.position.set(delta*8.5+shoulder,Math.sin(delta*2)*0.3,-Math.abs(delta)*0.75-scale*0.25*Math.min(1,Math.abs(delta)*5));
        // Keep the measured geometry proportional; only visibility changes at
        // the edge of the current scale neighborhood.
        var opacity=clamp((1.9-Math.abs(delta))*2,0,1);
        root.userData.materials.forEach(function(n){var transparent=n.userData.baseTransparent||opacity<1;if(n.material.transparent!==transparent){n.material.transparent=transparent;n.material.needsUpdate=true;}n.material.opacity=n.userData.baseOpacity*opacity;});
        if(occupied.length===1&&ground.visible){ground.position.y=root.position.y+root.userData.floor*scale-.008;garden.position.y=ground.position.y+1.64;}
        visible.push(root);
      });
      // Keep only the recent neighborhood. In particular, a tour through the
      // whole catalog must not retain every model, shader, and texture on GPU.
      trimModelCache();
      var isLeafWorld=!!focal&&['honeybee','ladybird'].indexOf(focal.id)>=0&&close>.25;
      leafWorld.visible=isLeafWorld;
      floor.visible=!isLeafWorld;
      if(isLeafWorld){
        garden.visible=false;leafWorld.scale.setScalar(3*.01/Math.pow(10,e));leafWorld.position.set(visible[0].position.x,ground.position.y,visible[0].position.z);
        scene.background.set(state.contrast?'#000000':'#10281f');scene.fog=new T.Fog(state.contrast?'#000000':'#10281f',8,30);
        key.intensity=1.9;hemisphere.intensity=.64;rim.intensity=.75;
        plants.forEach(function(plant,index){plant.rotation.z=Math.sin(time*.65+index)*.025;});
      }
      // Landmarks live in the model's own coordinates, so labels and the orbit
      // centre follow its normalization, rotation, and scale without drift.
      var activeRoot=visible.filter(function(r){return r.userData.itemId===state.focusId;})[0];
      var selected=state.details.filter(function(d){return d.id===state.detailId;})[0];
      if(!activeRoot||close<.8)selected=null;
      scene.updateMatrixWorld(true);aimGoal.set(0,.2,0);
      if(selected){aimGoal.fromArray(selected.at);activeRoot.userData.model.localToWorld(aimGoal);}
      cameraAim.lerp(aimGoal,state.reduceMotion?1:.18);cameraSettling=cameraAim.distanceToSquared(aimGoal)>.000001;
      if(!cameraSettling)cameraAim.copy(aimGoal);
      camera.position.set(Math.sin(yaw)*Math.cos(cameraPitch)*distance,Math.sin(cameraPitch)*distance,Math.cos(yaw)*Math.cos(cameraPitch)*distance).add(cameraAim);camera.lookAt(cameraAim);camera.updateMatrixWorld(true);
      if(!focusRing){focusRing=ring(scene,.085,'#d7e9bd',0);focusRing.material.depthTest=false;focusRing.material.depthWrite=false;focusRing.renderOrder=101;focusRing.castShadow=focusRing.receiveShadow=false;}
      focusRing.visible=!!selected&&state.showDetails;
      if(selected){focusRing.position.copy(aimGoal);focusRing.quaternion.copy(camera.quaternion);focusRing.scale.setScalar(distance*.075);}
      if(markers)Array.prototype.forEach.call(markers.querySelectorAll('[data-scale-marker]'),function(button){
        var detail=state.details.filter(function(d){return d.id===button.dataset.scaleMarker;})[0];
        var available=!!detail&&!!activeRoot&&close>.8&&(detail.cutaway===undefined||detail.cutaway===state.cutaway)&&state.showDetails;
        if(available){markerPoint.fromArray(detail.at);activeRoot.userData.model.localToWorld(markerPoint);markerPoint.project(camera);var px=(markerPoint.x*.5+.5)*width,py=(-markerPoint.y*.5+.5)*height;available=markerPoint.z>-1&&markerPoint.z<1&&px>24&&px<width-24&&py>125&&py<height-65;if(available)button.style.transform='translate('+px.toFixed(1)+'px,'+py.toFixed(1)+'px) translate(-50%,-50%)';}
        button.hidden=!available;
      });
      renderer.render(scene,camera);
      canvas.dataset.atlasReady='true';canvas.dataset.atlasObjects=visible.map(function(o){return o.userData.itemId;}).join(',');
      canvas.dataset.atlasExponent=e.toFixed(4);canvas.dataset.atlasYaw=yaw.toFixed(4);
      canvas.dataset.atlasTarget=state.target.toFixed(4);
      canvas.dataset.atlasZoom=cameraZoom.toFixed(2);
      canvas.dataset.atlasCutaway=state.cutaway?'open':'closed';
      canvas.dataset.atlasDetail=selected?selected.id:'';canvas.dataset.atlasAim=cameraAim.toArray().map(function(v){return v.toFixed(4);}).join(',');
      canvas.dataset.atlasHabitat=isLeafWorld?'leaf':'realm';
      canvas.dataset.atlasSurface=visible[0]&&visible[0].userData.model.userData.surfaceReady?'detailed':'procedural';
      dirty=false;
    }
    function schedule(){if(!disposed&&!frame&&inView&&!document.hidden)frame=requestAnimationFrame(tick);}
    function tick(ts){frame=0;if(disposed||document.hidden||!inView)return;var state=read();if(state.motion)time+=last?Math.min(0.05,(ts-last)/1000):0;last=ts;if(dirty||state.motion||cameraSettling)paint();if(state.motion||cameraSettling)schedule();}
    function invalidate(){dirty=true;schedule();}
    function down(ev){
      if(ev.button!==0)return;
      if(fingers.size>=2&&!fingers.has(ev.pointerId))return;
      fingers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});canvas.setPointerCapture(ev.pointerId);canvas.focus({preventScroll:true});
      if(fingers.size===1)drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,startX:ev.clientX,startY:ev.clientY,moved:false};
      else if(fingers.size===2){var pts=Array.from(fingers.values());pinch={distance:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),zoom:cameraZoom};drag=null;}
    }
    function turnAngle(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}
    function move(ev){
      if(!fingers.has(ev.pointerId))return;fingers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
      if(pinch&&fingers.size>=2){var pts=Array.from(fingers.values());cameraZoom=clamp(pinch.zoom*Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)/pinch.distance,1,2.5);invalidate();return;}
      if(!drag||drag.id!==ev.pointerId)return;var dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;if(Math.hypot(ev.clientX-drag.startX,ev.clientY-drag.startY)>5)drag.moved=true;yaw=turnAngle(yaw-dx*.005);pitch=clamp(pitch+dy*.005,-1.1,1.1);drag.x=ev.clientX;drag.y=ev.clientY;invalidate();
    }
    function finishPointer(ev,allowPick){
      if(!fingers.has(ev.pointerId))return;
      var didMove=!!pinch||!drag||drag.moved;fingers.delete(ev.pointerId);
      if(pinch){cameraZoom=Math.round(cameraZoom*10)/10;if(inspect)inspect(cameraZoom);pinch=null;invalidate();}
      drag=null;
      if(fingers.size===1){var entry=Array.from(fingers.entries())[0],p=entry[1];drag={id:entry[0],x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true};}
      if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);if(didMove||!allowPick)return;
      var rect=canvas.getBoundingClientRect();pointer.set((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,activeCamera);
      var hits=ray.intersectObjects(Object.keys(models).map(function(id){return models[id];}).filter(function(m){return m.visible;}),true);
      for(var i=0;i<hits.length;i++){if(!hits[i].object.isMesh)continue;var obj=hits[i].object;while(obj&&!obj.userData.itemId)obj=obj.parent;if(obj){pick(obj.userData.itemId);break;}}
    }
    function up(ev){finishPointer(ev,true);}
    function cancel(ev){finishPointer(ev,false);}
    function visibility(){last=0;if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else invalidate();}
    function lost(ev){ev.preventDefault();if(!disposed)fail();}
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',visibility);
    var resize=window.ResizeObserver?new ResizeObserver(invalidate):null;if(resize)resize.observe(canvas.parentElement);
    var intersection=window.IntersectionObserver?new IntersectionObserver(function(entries){inView=entries[0].isIntersecting;if(inView)invalidate();else {if(frame)cancelAnimationFrame(frame);frame=0;last=0;}}):null;if(intersection)intersection.observe(canvas);
    try { paint(); } catch(err) { dispose(); throw err; }
    schedule();
    function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);if(resize)resize.disconnect();if(intersection)intersection.disconnect();document.removeEventListener('visibilitychange',visibility);
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('webglcontextlost',lost);
      resources.forEach(function(r){r.dispose();});if(key.shadow.map)key.shadow.map.dispose();renderer.dispose();renderer.forceContextLoss();delete canvas.dataset.atlasReady;
    }
    return { update:invalidate, orbit:function(x,y){yaw=turnAngle(yaw+x);pitch=clamp(pitch+y,-1.1,1.1);invalidate();}, reset:function(){yaw=0;pitch=0.12;cameraZoom=1;invalidate();},
      capture:function(){return {yaw:yaw,pitch:pitch};},
      restore:function(view){yaw=turnAngle(view.yaw);pitch=clamp(view.pitch,-1.1,1.1);cameraZoom=view.zoom;lastZoomInput=view.zoom;previousDetail=read().focusId+':'+view.detailId;invalidate();},
      dispose:dispose };
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
        check: function (d) { return !!(d && (d.estimateCount || 0) >= 1); } },
      { id: 'scale_tour', label: 'Finish a guided tour', icon: '🧭',
        check: function (d) { return !!(d && (d.tourDoneCount || 0) >= 1); } }
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
      function itemText(item, field, fb) {
        if (item.you) {
          if (field === 'name') return S('you_name', 'You');
          if (field === 'describe') return S('you_describe', 'That is you, at {len}. Everything else here is measured against you.', { len: humanLength(item.size) });
        }
        return t('stem.scaleExplorer.item_' + item.id.replace(/-/g, '_') + '_' + field, fb != null ? fb : item[field]);
      }
      // Setting or clearing the height re-centres on the person, so the change
      // is seen, and is remembered with the rest of the tool's state.
      function applyHeight(cm) {
        setYourCm(cm);
        updateSlice(function (cur) { if (cm) cur.yourHeightCm = cm; else delete cur.yourHeightCm; });
        var size = cm ? cm / 100 : HUMAN;
        stopJourney();
        intentRef.current = 'human'; nearestRef.current = 'human'; setFocusId('human');
        goTo(log10(size));
        say(cm ? S('you_set_sr', 'The person is now you, {len} tall.', { len: humanLength(size) }) : S('you_cleared_sr', 'Back to an average adult, 1.7 m tall.'));
      }
      function submitHeight() {
        var cm = validHeightCm(heightDraft);
        if (!cm) { say(S('you_invalid', 'Enter a height between 50 and 250 centimetres.')); return; }
        applyHeight(cm);
        setHeightDraft('');
      }
      function say(text) { if (ctx.announceToSR && text) ctx.announceToSR(text); }

      // A shared link may name a starting place; otherwise the person, the
      // scale everything else is easiest to feel from.
      // "Your height": the person becomes the student. One derived list, and
      // everything below (sort order, lookups, the stage, Compare, the
      // staircase, the estimate pairs) reads from it rather than from ITEMS.
      var _yourCm = React.useState(validHeightCm(slice.yourHeightCm)); var yourCm = _yourCm[0], setYourCm = _yourCm[1];
      var _heightDraft = React.useState(''); var heightDraft = _heightDraft[0], setHeightDraft = _heightDraft[1];
      var items = React.useMemo(function () {
        if (!yourCm) return ITEMS;
        return ITEMS.map(function (i) { return i.id === 'human' ? Object.assign({}, i, { size: yourCm / 100, you: true }) : i; });
      }, [yourCm]);
      var start = React.useMemo(function () {
        var r = readStartFromLink(ITEMS);
        if (r && r.tour) { var first = ITEMS.filter(function (i) { return i.id === TOURS.filter(function (x) { return x.id === r.tour; })[0].stops[0].id; })[0]; return { focusId: first.id, exp: log10(first.size), tour: r.tour }; }
        return r || { focusId: 'human', exp: log10(yourCm ? yourCm / 100 : HUMAN) };
      }, []);
      var _focus = React.useState(start.focusId || 'human'); var focusId = _focus[0], setFocusId = _focus[1];
      var _exp = React.useState(start.exp); var exp = _exp[0], setExp = _exp[1];
      var _link = React.useState(''); var linkState = _link[0], setLinkState = _link[1]; // '' | 'copied' | 'failed'
      // A link that names a place usually means "look at this"; Compare starts
      // from it, against the person, so the first comparison is about the thing
      // the link was for.
      var linkedFocus = start.focusId && start.focusId !== 'human' ? start.focusId : null;
      var initialComparison = React.useMemo(function () { return linkedFocus ? { a: linkedFocus, b: 'human' } : readComparison(slice.comparison, 'human', 'rbc'); }, []);
      var _cmpA = React.useState(initialComparison.a); var cmpA = _cmpA[0], setCmpA = _cmpA[1];
      var _cmpB = React.useState(initialComparison.b); var cmpB = _cmpB[0], setCmpB = _cmpB[1];
      var _comparisonActive = React.useState(false); var comparisonActive = _comparisonActive[0], setComparisonActive = _comparisonActive[1];
      var _bridgeIndex = React.useState(0); var bridgeIndex = _bridgeIndex[0], setBridgeIndex = _bridgeIndex[1];
      var _speaking = React.useState(''); var speaking = _speaking[0], setSpeaking = _speaking[1];
      var _journey = React.useState(0); var journey = _journey[0], setJourney = _journey[1];
      var journeyRef = React.useRef(null);
      // The film: a continuous, constant-rate zoom along the axis. Direction and
      // progress live in refs (they move every frame); React holds only the
      // on/off state the buttons render from, and the chosen speed.
      var filmRef = React.useRef({ dir: 0, from: 0, to: 0, last: 0 });
      var filmRafRef = React.useRef(0);
      var _film = React.useState(0); var film = _film[0], setFilm = _film[1];
      var _filmSpeed = React.useState((slice.filmSpeed === 'slow' || slice.filmSpeed === 'fast') ? slice.filmSpeed : 'normal');
      var filmSpeed = _filmSpeed[0], setFilmSpeed = _filmSpeed[1];
      var filmSpeedRef = React.useRef(filmSpeed); filmSpeedRef.current = filmSpeed;
      var FILM_RATE = { slow: 0.35, normal: 0.7, fast: 1.4 }; // powers of ten per second
      var journeyDirRef = React.useRef(0);
      var _showLadder = React.useState(false); var showLadder = _showLadder[0], setShowLadder = _showLadder[1];
      var _sci = React.useState(!!slice.sci); var sci = _sci[0], setSci = _sci[1];
      // Guided tour: which tour, and which stop (-1 = not started).
      var _tour = React.useState(start.tour || ''); var tourId = _tour[0], setTourId = _tour[1];
      var _stop = React.useState(start.tour ? 0 : -1); var stopIdx = _stop[0], setStopIdx = _stop[1];
      var sciRef = React.useRef(sci); sciRef.current = sci;
      // One place decides how a length is written, so the card, the ladder, the
      // selects and the stage never disagree.
      function lengthText(m) { return sci ? humanLength(m) + ' · ' + sciNotation(m) : humanLength(m); }
      var _pair = React.useState({ big: 'earth', small: 'human' }); var pair = _pair[0], setPair = _pair[1];
      var _guess = React.useState(''); var guess = _guess[0], setGuess = _guess[1];
      var _revealed = React.useState(false); var revealed = _revealed[0], setRevealed = _revealed[1];

      var canvasRef = React.useRef(null);
      var atlasCanvasRef = React.useRef(null);
      var markerLayerRef = React.useRef(null);
      var comparisonLayerRef = React.useRef(null);
      var atlasRef = React.useRef(null);
      var _viewMode = React.useState('atlas'); var viewMode = _viewMode[0], setViewMode = _viewMode[1];
      var viewModeRef = React.useRef(viewMode); viewModeRef.current = viewMode;
      var _atlasStatus = React.useState('loading'); var atlasStatus = _atlasStatus[0], setAtlasStatus = _atlasStatus[1];
      var _ambient = React.useState(slice.ambient !== false); var ambient = _ambient[0], setAmbient = _ambient[1];
      var _neighbors = React.useState(slice.atlasNeighbors === true); var neighbors = _neighbors[0], setNeighbors = _neighbors[1];
      var _measure = React.useState(true); var measure = _measure[0], setMeasure = _measure[1];
      var _inspectionZoom = React.useState(1); var inspectionZoom = _inspectionZoom[0], setInspectionZoom = _inspectionZoom[1];
      var _detailId=React.useState('');var detailId=_detailId[0],setDetailId=_detailId[1];
      var _showDetails=React.useState(true);var showDetails=_showDetails[0],setShowDetails=_showDetails[1];
      var _cutaway = React.useState(true); var cutaway = _cutaway[0], setCutaway = _cutaway[1];
      var _observations = React.useState(function () { return readObservations(slice.observations); });
      var observations = _observations[0], setObservations = _observations[1];
      var _observationDrafts = React.useState(function () { return readObservationDrafts(slice.observationDrafts); });
      var observationDrafts = _observationDrafts[0], setObservationDrafts = _observationDrafts[1];
      var _notebookMessage = React.useState(''); var notebookMessage = _notebookMessage[0], setNotebookMessage = _notebookMessage[1];
      var _pendingObservation = React.useState(null); var pendingObservation = _pendingObservation[0], setPendingObservation = _pendingObservation[1];
      var savedObservationsRef = React.useRef(null);
      React.useEffect(function(){if(!pendingObservation){setInspectionZoom(1);setDetailId('');}},[focusId]);
      var _search = React.useState(''); var search = _search[0], setSearch = _search[1];
      var readoutRef = React.useRef(null);
      var scrubRef = React.useRef(null);
      // Guarding the repaint on FOCUS was wrong: a slider keeps focus long after
      // the student stops touching it, and the thumb then froze while the camera
      // moved on. The paint must only stand back while a pointer is actually
      // down on the thumb; under the keyboard the thumb should follow.
      var scrubDragRef = React.useRef(false);
      var wrapRef = React.useRef(null);
      var targetRef = React.useRef(start.exp);
      var expRef = React.useRef(start.exp);
      var rafRef = React.useRef(0);
      var cameraMoveRef = React.useRef({ from: start.exp, at: 0 });
      var lastDecadeRef = React.useRef(Math.round(start.exp));
      var nearestRef = React.useRef(start.focusId || 'human');
      // Read through a ref, not the render closure: the animation loop outlives
      // the render that created it.
      var focusIdRef = React.useRef(focusId);
      focusIdRef.current = focusId;
      var intentRef = React.useRef(null);
      var speakTokenRef = React.useRef(0);
      var speakTimerRef = React.useRef(null);
      var descId = React.useMemo(function () { return 'sx-desc-' + Math.random().toString(36).slice(2, 8); }, []);

      var sorted = React.useMemo(function () {
        return items.slice().sort(function (a, b) { return b.size - a.size; });
      }, [items]);
      var byId = React.useMemo(function () {
        var m = {}; items.forEach(function (i) { m[i.id] = i; }); return m;
      }, [items]);
      var compare = React.useMemo(function () { return compareMeasurements(byId[cmpA], byId[cmpB]); }, [cmpA, cmpB, byId]);
      var bridge = React.useMemo(function () { return scaleBridge(compare, sorted); }, [compare, sorted]);
      // The animation loop outlives the render that started it, so the stage
      // and the nearest-item search read the list through a ref, as they do
      // the focus id; otherwise the last frame after "Use my height" would
      // paint the old person at the new camera position.
      var sortedRef = React.useRef(sorted); sortedRef.current = sorted;
      var focused = byId[focusId] || byId.human;
      var details=atlasDetails(focusId,S),selectedDetail=details.filter(function(d){return d.id===detailId;})[0];
      var observationDetail = viewMode === 'atlas' && selectedDetail ? selectedDetail.id : '';
      var currentObservationKey = observationKey(focused.id, observationDetail);
      var savedObservation = observations.filter(function (entry) { return observationKey(entry.itemId, entry.detailId) === currentObservationKey; })[0];
      var observationDraft = Object.prototype.hasOwnProperty.call(observationDrafts, currentObservationKey) ? observationDrafts[currentObservationKey] : savedObservation ? savedObservation.note : '';
      function observationItem(entry) { return Object.assign({}, byId[entry.itemId], { size: entry.size, you: entry.you }); }
      function observationTitle(entry) {
        var detail = atlasDetails(entry.itemId, S).filter(function (d) { return d.id === entry.detailId; })[0];
        return itemText(observationItem(entry), 'name') + (detail ? ' · ' + detail.label : '');
      }
      function editObservation(text) {
        var note = text.slice(0, NOTE_LIMIT), key = currentObservationKey;
        setObservationDrafts(function (prev) { var next = Object.assign({}, prev); next[key] = note; return next; });
        updateSlice(function (cur) { var next = readObservationDrafts(cur.observationDrafts); next[key] = note; cur.observationDrafts = next; });
        setNotebookMessage('');
      }
      function saveObservation() {
        if (comparisonActive) return;
        if (!savedObservation && observations.length >= NOTEBOOK_LIMIT) return;
        var angle = viewMode === 'atlas' && atlasRef.current ? atlasRef.current.capture() : { yaw: 0, pitch: .12 };
        var entry = { itemId: focused.id, detailId: observationDetail, size: focused.size, you: !!focused.you,
          note: observationDraft.trim(), zoom: inspectionZoom, yaw: angle.yaw, pitch: angle.pitch, cutaway: cutaway, view: viewMode };
        var next = [entry].concat(observations.filter(function (old) { return observationKey(old.itemId, old.detailId) !== currentObservationKey; }));
        setObservations(next);
        updateSlice(function (cur) { cur.observations = next; });
        if (savedObservationsRef.current) savedObservationsRef.current.open = true;
        setNotebookMessage(savedObservation ? S('atlas_observation_updated', 'Observation updated.') : S('atlas_observation_saved', 'Observation saved.'));
      }
      function removeObservation(entry) {
        var key = observationKey(entry.itemId, entry.detailId);
        var next = observations.filter(function (old) { return observationKey(old.itemId, old.detailId) !== key; });
        setObservations(next);
        setObservationDrafts(function (prev) { var drafts = Object.assign({}, prev); delete drafts[key]; return drafts; });
        updateSlice(function (cur) { cur.observations = next; var drafts = readObservationDrafts(cur.observationDrafts); delete drafts[key]; cur.observationDrafts = drafts; });
        if (savedObservationsRef.current) savedObservationsRef.current.querySelector('summary').focus({ preventScroll: true });
        setNotebookMessage(S('atlas_observation_removed', 'Observation removed.'));
      }
      function revisitObservation(entry) {
        var item = byId[entry.itemId];
        if (!item) return;
        if (entry.itemId === 'human') {
          var cm = entry.you ? entry.size * 100 : null;
          setYourCm(cm);
          updateSlice(function (cur) { if (cm) cur.yourHeightCm = cm; else delete cur.yourHeightCm; });
          item = observationItem(entry);
        }
        setPendingObservation(entry);
        setViewMode(entry.view === 'atlas' && atlasStatus !== 'failed' ? 'atlas' : 'chart');
        flyTo(item, { instant: true });
      }
      function downloadObservations() {
        var lines = [S('atlas_notebook_title', 'Scale Explorer field notebook'), S('atlas_notebook_scope', 'Object dimensions are measured references. Colors and anatomical details in the 3D models are illustrative.'), ''];
        observations.forEach(function (entry, index) {
          var item = observationItem(entry), detail = atlasDetails(entry.itemId, S).filter(function (d) { return d.id === entry.detailId; })[0];
          lines.push((index + 1) + '. ' + observationTitle(entry));
          lines.push(S('atlas_observation_size', 'Recorded size: {len} {dim}', { len: humanLength(entry.size), dim: S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim) }));
          lines.push(sciNotation(entry.size));
          if (entry.note) lines.push(S('atlas_observation_note', 'My observation: {note}', { note: entry.note }));
          if (detail) { lines.push(detail.body); lines.push(detail.source); }
          if (item.note) lines.push(itemText(item, 'note'));
          lines.push(shareLinkFor(item), '');
        });
        var url, anchor;
        try {
          url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
          anchor = document.createElement('a'); anchor.href = url; anchor.download = 'scale-explorer-notebook.txt';
          document.body.appendChild(anchor); anchor.click();
          setNotebookMessage(S('atlas_notebook_downloaded', 'Saved observations downloaded.'));
        } catch (_) { setNotebookMessage(S('atlas_notebook_download_failed', 'The download could not start here. Your saved observations are still in the notebook.')); }
        finally { if (anchor) anchor.remove(); if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
      }
      function chooseDetail(detail){
        stopJourney();
        if(detailId===detail.id){setDetailId('');setInspectionZoom(1);return;}
        setDetailId(detail.id);setShowDetails(true);setNeighbors(false);setInspectionZoom(focusId==='dna'?2.2:1.8);
        if(detail.cutaway!==undefined)setCutaway(detail.cutaway);
        say(detail.label+'. '+detail.body);
        var cv=atlasCanvasRef.current;
        if(cv){var rect=cv.getBoundingClientRect();if(rect.top< -40||rect.bottom>window.innerHeight+40)cv.scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});}
      }

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
      var _reduceMotion = React.useState(function () {
        try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; }
      }); var reduceMotion = _reduceMotion[0], setReduceMotion = _reduceMotion[1];
      var atlasState = React.useRef(null);
      atlasState.current = { items: sorted, exp: expRef.current, motion: !comparisonActive && ambient && !reduceMotion, reduceMotion:reduceMotion, contrast: theme === 'contrast', neighbors: neighbors, measure: measure, inspectionZoom: inspectionZoom, cutaway: cutaway, focusId:focusId, details:details, detailId:detailId, showDetails:showDetails, comparison: comparisonActive ? compare : null };
      var atlasActions = React.useRef(null);
      atlasActions.current = { pick: function (id) { if (byId[id]) openItem(byId[id]); }, zoom: function (delta) {
        if (comparisonActive) setInspectionZoom(function (prev) { return Math.round(clamp(prev + delta, 1, 2.5) * 10) / 10; });
        else zoomBy(delta);
      } };
      // Apply a saved feature after navigation has reset the inspection state.
      // Wait for a newly mounted atlas before restoring its camera angle.
      React.useEffect(function () {
        if (!pendingObservation || focusId !== pendingObservation.itemId) return;
        setDetailId(pendingObservation.detailId); setInspectionZoom(pendingObservation.zoom); setCutaway(pendingObservation.cutaway); setShowDetails(true); setNeighbors(false);
        if (detailId !== pendingObservation.detailId || inspectionZoom !== pendingObservation.zoom || cutaway !== pendingObservation.cutaway) return;
        if (viewMode === 'atlas' && (atlasStatus !== 'ready' || !atlasRef.current)) return;
        if (viewMode === 'atlas') atlasRef.current.restore(pendingObservation);
        setPendingObservation(null);
        var cv = viewMode === 'atlas' ? atlasCanvasRef.current : canvasRef.current;
        if (cv) cv.scrollIntoView({ block: 'center', behavior: 'auto' });
        setNotebookMessage(S('atlas_observation_returned', 'Returned to {name}.', { name: observationTitle(pendingObservation) }));
      }, [pendingObservation, focusId, viewMode, atlasStatus, detailId, inspectionZoom, cutaway]);
      React.useEffect(function () {
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        function change() { setReduceMotion(mq.matches); if (mq.matches) stopJourney(); }
        if (mq.addEventListener) mq.addEventListener('change', change);
        return function () { if (mq.removeEventListener) mq.removeEventListener('change', change); };
      }, []);
      React.useEffect(function () {
        if (viewMode !== 'atlas') { draw(); return; }
        var alive = true, cv = atlasCanvasRef.current, timeout;
        if (!cv) return;
        setAtlasStatus('loading');
        function failed() {
          if (!alive) return;
          clearTimeout(timeout); setAtlasStatus('failed'); setViewMode('chart');
          say(S('atlas_failed', 'The 3D view is unavailable. The scale chart and all destinations are ready to explore.'));
        }
        function wheel(ev) { ev.preventDefault(); atlasActions.current.zoom(clamp(-ev.deltaY * (ev.deltaMode === 1 ? 0.02 : 0.002), -0.6, 0.6)); }
        cv.addEventListener('wheel', wheel, { passive: false });
        timeout = setTimeout(failed, 15000);
        var loading = window.THREE ? Promise.resolve(window.THREE) : window.StemLab.ensureThree
          ? window.StemLab.ensureThree({ orbit: false }) : Promise.reject(new Error('Three.js loader unavailable'));
        loading.then(function () {
          if (!alive) return;
          clearTimeout(timeout);
          atlasRef.current = createScaleAtlas(window.THREE, cv, function () {
            return Object.assign({}, atlasState.current, { exp: expRef.current, target: targetRef.current });
          }, function (id) { atlasActions.current.pick(id); }, failed, function(value){if(alive)setInspectionZoom(value);},markerLayerRef.current,comparisonLayerRef.current);
          setAtlasStatus('ready');
        }).catch(failed);
        return function () { alive = false; clearTimeout(timeout); cv.removeEventListener('wheel', wheel); if (atlasRef.current) { atlasRef.current.dispose(); atlasRef.current = null; } };
      }, [viewMode]);
      React.useEffect(function () { if (atlasRef.current) atlasRef.current.update(); }, [ambient, reduceMotion, theme, items, neighbors, measure, inspectionZoom, cutaway, detailId, showDetails, focusId, comparisonActive, compare]);
      function goTo(nextExp, opts) {
        setComparisonActive(false);
        setDetailId('');
        opts = opts || {};
        var target = clamp(nextExp, MIN_EXP, MAX_EXP);
        targetRef.current = target;
        cameraMoveRef.current = { from: expRef.current, at: performance.now() };
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
        var ts = performance.now();
        rafRef.current = 0;
        var cur = expRef.current, target = targetRef.current;
        var d = target - cur;
        var progress = clamp((ts - cameraMoveRef.current.at) / 650, 0, 1);
        if (Math.abs(d) < 0.0015 || progress >= 1) { expRef.current = target; settleExp(target); draw(); afterMove(); return; }
        expRef.current = cameraMoveRef.current.from + (target - cameraMoveRef.current.from) * (1 - Math.pow(1 - progress, 3));
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
        var list = sortedRef.current, best = null, bestD = Infinity;
        for (var i = 0; i < list.length; i++) {
          var d = Math.abs(log10(list[i].size) - e);
          if (d < bestD) { bestD = d; best = list[i]; }
        }
        return best;
      }
      function stopJourney() {
        if (journeyRef.current) { clearInterval(journeyRef.current); journeyRef.current = null; }
        if (journeyDirRef.current !== 0) { journeyDirRef.current = 0; setJourney(0); }
        stopFilm();
      }
      // ── The film ────────────────────────────────────────────────────────
      // The Eames experience is one unbroken zoom, not a slideshow: the camera
      // moves at a steady number of powers of ten per second from wherever you
      // are to the end of the ladder, and the focus card, the stage labels and
      // the per-decade announcement keep up on their own. Under reduced motion
      // it becomes the stepwise journey, which says the same things.
      function stopFilm() {
        if (filmRafRef.current) { cancelAnimationFrame(filmRafRef.current); filmRafRef.current = 0; }
        if (filmRef.current.dir !== 0) {
          filmRef.current.dir = 0;
          setFilm(0);
          targetRef.current = expRef.current;
          settleExp(expRef.current);
          draw();
        }
      }
      function startFilm(dir) {
        setComparisonActive(false);
        if (reduceMotion) { startJourney(dir); return; }
        stopJourney();
        if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
        var here = expRef.current;
        var list = sortedRef.current;
        var end = dir > 0 ? log10(list[0].size) + 0.4 : log10(list[list.length - 1].size) - 0.4;
        if ((dir > 0 && here >= end - 0.01) || (dir < 0 && here <= end + 0.01)) { say(S('journey_end', 'That is as far as the ladder goes.')); return; }
        intentRef.current = null;
        filmRef.current = { dir: dir, from: here, to: end, last: 0 };
        targetRef.current = end;
        setFilm(dir);
        say(dir > 0 ? S('film_start_out', 'Playing the zoom outward. Press space to pause.') : S('film_start_in', 'Playing the zoom inward. Press space to pause.'));
        filmRafRef.current = requestAnimationFrame(filmStep);
      }
      function filmStep(ts) {
        filmRafRef.current = 0;
        var f = filmRef.current;
        if (!f.dir) return;
        var dt = f.last ? Math.min(0.1, (ts - f.last) / 1000) : 0;
        f.last = ts;
        var rate = FILM_RATE[filmSpeedRef.current] || FILM_RATE.normal;
        var next = expRef.current + f.dir * rate * dt;
        var done = f.dir > 0 ? next >= f.to : next <= f.to;
        expRef.current = done ? f.to : next;
        paintReadout();
        draw();
        afterMove();
        if (done) {
          stopFilm();
          say(S('journey_end', 'That is as far as the ladder goes.'));
          return;
        }
        filmRafRef.current = requestAnimationFrame(filmStep);
      }
      function toggleFilm(dir) {
        if (filmRef.current.dir !== 0) { stopFilm(); say(S('film_paused', 'Paused. Press play to continue.')); return; }
        startFilm(dir || 1);
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
        // A recorded personal height may update the item list on the next
        // render. Keep an instant destination pinned while that list catches up.
        if (opts && opts.instant) { nearestRef.current = item.id; setFocusId(item.id); }
      }

      // ── Drawing ─────────────────────────────────────────────────────────
      function draw() {
        if (viewModeRef.current === 'atlas') { if (atlasRef.current) atlasRef.current.update(); return; }
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
          g.fillStyle = P.stageDim;
          g.fillText(powerLabel(n), tx, axisY + 8);
        }

        // Draw order and legibility, learned from the first render: at true
        // relative size an object one decade bigger than the focus is four
        // screens wide, and its emoji then covers everything. So an emoji is
        // only painted inside a legible band; anything larger is an arc and a
        // label, which is what actually carries the scale information.
        var laneGap = Math.min(cssH * 0.15, 84);
        var cands = [];
        var list = sortedRef.current;
        for (var i = 0; i < list.length; i++) {
          var it = list[i];
          var lg = log10(it.size);
          var dist = Math.abs(lg - e);
          if (dist > DECADES_ACROSS * 1.6) continue;
          var x = cssW / 2 + (lg - e) * pxPerDecade;
          var dia = it.size / Math.pow(10, e) * refPx;
          if (dia < 2.5 || x < -cssW * 0.6 || x > cssW * 1.6) continue;
          // Three lanes, assigned by position in the size-ordered ladder, so a
          // thing and its nearest neighbours are never in the same one. Stable
          // per object, so nothing jumps lane as you zoom.
          var lane = (i % 3) - 1;
          cands.push({ it: it, x: x, dia: dia, dist: dist, y: midY + lane * laneGap });
        }
        // Closest to the focus is the most important, so it gets first claim on
        // label space and is painted last (on top).
        cands.sort(function (a, b) { return b.dist - a.dist; });

        var maxGlyph = Math.min(cssW, cssH) * 0.62;
        var labelBoxes = [];
        g.textBaseline = 'middle';
        for (var k = 0; k < cands.length; k++) {
          var c = cands[k], obj = c.it;
          var isFocus = obj.id === focusIdRef.current;
          var fade = clamp(1 - (c.dist / (DECADES_ACROSS * 1.35)), 0.12, 1);
          var alpha = isFocus ? 1 : fade;

          g.globalAlpha = alpha;
          g.strokeStyle = isFocus ? P.ringHot : P.ring;
          g.lineWidth = isFocus ? 2.5 : 1.25;
          g.beginPath(); g.arc(c.x, c.y, c.dia / 2, 0, Math.PI * 2); g.stroke();

          var glyph = c.dia * 0.7;
          if (glyph >= 10 && glyph <= maxGlyph) {
            g.globalAlpha = alpha * (isFocus ? 1 : 0.85);
            g.font = glyph + 'px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
            g.textAlign = 'center';
            g.fillText(obj.emoji, c.x, c.y);
          }

          if (c.dia >= 30) c.wantsLabel = true;
          g.globalAlpha = 1;

          // Nested decade frames. The ring ten times WIDER than the focus is off
          // the stage by construction (the focus fills ~42% of the shorter side),
          // so the frames nest inward: the focus, a square a tenth as wide inside
          // it, and a hundredth inside that. Each step left on the axis below is
          // one of these squares. Drawn only for the focus, only when legible.
          if (isFocus && c.dia >= 60) {
            var side = c.dia, fx = c.x, fy = c.y;
            g.save();
            g.font = '700 11px system-ui, -apple-system, "Segoe UI", sans-serif';
            g.textAlign = 'left'; g.textBaseline = 'middle';
            for (var f = 1; f <= 2; f++) {
              var fs = side / Math.pow(10, f);
              if (fs < 6) break;
              g.globalAlpha = 1;
              // A dark backing under the frame keeps the dashed edge visible over
              // the emoji's own colours (the Earth is mostly green and blue).
              g.setLineDash([]);
              g.strokeStyle = P.stage; g.lineWidth = 4;
              g.strokeRect(fx - fs / 2, fy - fs / 2, fs, fs);
              g.setLineDash([5, 3]);
              g.strokeStyle = P.ringHot; g.lineWidth = f === 1 ? 2 : 1.5;
              g.strokeRect(fx - fs / 2, fy - fs / 2, fs, fs);
              if (fs >= 18) {
                var tag = '÷' + (f === 1 ? '10' : '100');
                var tw = g.measureText(tag).width;
                var tx0 = fx + fs / 2 + 6, ty0 = fy - fs / 2 + 7;
                g.setLineDash([]);
                g.fillStyle = P.stage; g.globalAlpha = 0.85;
                g.fillRect(tx0 - 3, ty0 - 8, tw + 6, 16);
                g.globalAlpha = 1; g.fillStyle = P.ringHot;
                g.fillText(tag, tx0, ty0);
              }
            }
            // The guide: from the bottom of the ÷10 square down to the axis, one
            // tick to the LEFT of the focus. That is the whole lesson in one line:
            // a tenth of the width is one step left on the axis.
            var s10 = side / 10;
            if (s10 >= 6) {
              var gx = fx - pxPerDecade;
              g.setLineDash([3, 4]); g.strokeStyle = P.ringHot; g.lineWidth = 1; g.globalAlpha = 0.9;
              g.beginPath(); g.moveTo(fx, fy + s10 / 2); g.lineTo(gx, axisY - 6); g.stroke();
              g.setLineDash([]);
              g.beginPath(); g.arc(gx, axisY, 3.5, 0, Math.PI * 2); g.fillStyle = P.ringHot; g.fill();
            }
            g.restore();
            g.globalAlpha = 1;
          }
        }

        // Labels are a second pass, run NEAREST first. In one pass the focused
        // object was labelled last and had to either yield or overlap whatever
        // had already claimed the space; here the thing the student is looking
        // at claims its space first and the rest fit around it.
        var labelled = cands.filter(function (c) { return c.wantsLabel; })
          .sort(function (a, b) { return a.dist - b.dist; });
        g.textAlign = 'center'; g.textBaseline = 'bottom';
        for (var L = 0; L < labelled.length; L++) {
          var lc = labelled[L], lo = lc.it;
          var lFocus = lo.id === focusIdRef.current;
          g.globalAlpha = lFocus ? 1 : clamp(1 - (lc.dist / (DECADES_ACROSS * 1.35)), 0.12, 1);
          g.font = (lFocus ? '700 ' : '500 ') + '12px system-ui, -apple-system, "Segoe UI", sans-serif';
          var nm = itemText(lo, 'name');
          var wpx = g.measureText(nm).width;
          var ly = lc.y - Math.min(lc.dia / 2, maxGlyph / 2) - 8;
          if (ly < 16) ly = 16;
          // Keep the whole label on the stage; a name centred near the edge was
          // being cut in half by it.
          var lx = clamp(lc.x, wpx / 2 + 8, cssW - wpx / 2 - 8);
          var box = { x0: lx - wpx / 2 - 6, x1: lx + wpx / 2 + 6, y0: ly - 24, y1: ly + 2 };
          var clash = false;
          for (var b = 0; b < labelBoxes.length; b++) {
            var o = labelBoxes[b];
            if (box.x1 > o.x0 && box.x0 < o.x1 && box.y1 > o.y0 && box.y0 < o.y1) { clash = true; break; }
          }
          if (clash) continue;
          labelBoxes.push(box);
          g.fillStyle = lFocus ? P.ringHot : P.stageFg;
          g.fillText(nm, lx, ly);
          g.font = '500 11px system-ui, -apple-system, "Segoe UI", sans-serif';
          g.fillStyle = P.stageDim;
          g.fillText(sciRef.current ? sciNotation(lo.size) : humanLength(lo.size), lx, ly + 13);
        }
        g.globalAlpha = 1;
        g.textBaseline = 'middle';

        // Film chrome: a progress strip across the top (how far along the ladder
        // the camera is) and a caption with the power of ten and the length it
        // means. Painted here so it costs nothing when the film is not playing.
        var fm = filmRef.current;
        if (fm.dir !== 0) {
          var lo = Math.min(fm.from, fm.to), hi = Math.max(fm.from, fm.to);
          var prog = hi > lo ? clamp((e - lo) / (hi - lo), 0, 1) : 0;
          g.fillStyle = P.axis; g.globalAlpha = 0.35; g.fillRect(0, 0, cssW, 4);
          g.globalAlpha = 1; g.fillStyle = P.ringHot;
          g.fillRect(0, 0, cssW * prog, 4);
          var dec = Math.floor(e + 1e-9);
          var cap = powerLabel(dec) + '  ·  ' + humanLength(Math.pow(10, e));
          g.font = '700 15px system-ui, -apple-system, "Segoe UI", sans-serif';
          g.textAlign = 'left'; g.textBaseline = 'top';
          var cw = g.measureText(cap).width;
          g.fillStyle = P.stage; g.globalAlpha = 0.82;
          g.fillRect(10, 12, cw + 18, 30);
          g.globalAlpha = 1; g.fillStyle = P.stageFg;
          g.fillText(cap, 19, 19);
          g.textBaseline = 'middle';
        }
      }

      React.useEffect(function () {
        try { window.__alloScaleExplorerStart = null; } catch (_) {}
        draw();
        var onResize = function () { draw(); };
        window.addEventListener('resize', onResize);
        // The stage now grows to match the side panel, so its height is not
        // known until layout settles. Observe it rather than guess at a timeout.
        var ro = null;
        try {
          var host = canvasRef.current && canvasRef.current.parentElement;
          if (host && window.ResizeObserver) { ro = new ResizeObserver(function () { draw(); }); ro.observe(host); }
        } catch (_) {}
        return function () {
          window.removeEventListener('resize', onResize);
          if (ro) { try { ro.disconnect(); } catch (_) {} }
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          if (filmRafRef.current) cancelAnimationFrame(filmRafRef.current);
          if (journeyRef.current) clearInterval(journeyRef.current);
          clearTimeout(speakTimerRef.current);
          clearTimeout(linkTimerRef.current);
        };
      }, []);
      React.useEffect(function () { draw(); }, [theme, focusId, uiLang, sci, items]);

      // ── Keyboard on the canvas ──────────────────────────────────────────
      function onCanvasKey(ev) {
        var k = ev.key;
        if (k === 'Escape' && comparisonActive) { ev.preventDefault(); inspectCompared(focused); return; }
        if (atlasRef.current && /^(a|d|w|s|r)$/i.test(k)) {
          ev.preventDefault();
          if (k.toLowerCase() === 'r') { atlasRef.current.reset(); setInspectionZoom(1); setDetailId(''); }
          else atlasRef.current.orbit(k.toLowerCase() === 'a' ? -0.12 : k.toLowerCase() === 'd' ? 0.12 : 0, k.toLowerCase() === 'w' ? -0.1 : k.toLowerCase() === 's' ? 0.1 : 0);
          return;
        }
        var big = ev.shiftKey ? 1 : 0.25;
        if (k === 'ArrowRight' || k === 'ArrowUp' || k === '+' || k === '=') { ev.preventDefault(); zoomBy(big); return; }
        if (k === 'ArrowLeft' || k === 'ArrowDown' || k === '-' || k === '_') { ev.preventDefault(); zoomBy(-big); return; }
        if (k === 'PageUp') { ev.preventDefault(); zoomBy(3); return; }
        if (k === 'PageDown') { ev.preventDefault(); zoomBy(-3); return; }
        if (k === 'Home') { ev.preventDefault(); flyTo(byId.human); return; }
        if (k === 'End') { ev.preventDefault(); stopJourney(); goTo(MAX_EXP); return; }
        if (k === ' ' || k === 'Spacebar') { ev.preventDefault(); toggleFilm(filmRef.current.dir || (ev.shiftKey ? -1 : 1)); return; }
      }
      function onWheel(ev) {
        ev.preventDefault();
        stopJourney();
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
      var linkTimerRef = React.useRef(null);
      function copyLink() {
        var item = focused;
        clearTimeout(linkTimerRef.current);
        copyPlain(shareLinkFor(item)).then(function (ok) {
          setLinkState(ok ? 'copied' : 'failed');
          say(ok ? S('link_copied_sr', 'Link to {name} copied.', { name: itemText(item, 'name') }) : S('link_failed', 'Copying was blocked here. Select the link and copy it by hand:'));
          if (ok) linkTimerRef.current = setTimeout(function () { setLinkState(''); }, 2400);
        });
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
      }, [pair, byId]);
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
      function tourText(tour, field, stop) {
        if (field === 'title') return t('stem.scaleExplorer.tour_' + tour.id + '_title', tour.title);
        return t('stem.scaleExplorer.tour_' + tour.id + '_stop_' + stop, tour.stops[stop].line);
      }
      function goToStop(tour, i) {
        var stop = tour.stops[i]; var item = byId[stop.id]; if (!item) return;
        setStopIdx(i);
        flyTo(item);
        say(S('tour_stop_sr', 'Stop {n} of {total}: {name}. {line}', { n: i + 1, total: tour.stops.length, name: itemText(item, 'name'), line: tourText(tour, 'line', i) }));
        if (i === tour.stops.length - 1) updateSlice(function (cur) { cur.tourDoneCount = (cur.tourDoneCount || 0) + 1; });
      }
      function startTour(id) {
        setTourId(id);
        var tour = TOURS.filter(function (x) { return x.id === id; })[0];
        if (tour) goToStop(tour, 0); else setStopIdx(-1);
      }
      var cmpSecondRef = React.useRef(null);
      var cmpDetailsRef = React.useRef(null);
      // From the focus card: put what you are looking at into the first slot and
      // hand focus to the second, so the next keystroke picks the other thing.
      function compareFocused() {
        if (cmpDetailsRef.current) cmpDetailsRef.current.open = true;
        var item = focused;
        changeComparison(item.id, cmpB === item.id ? (item.id === 'human' ? 'rbc' : 'human') : cmpB);
        say(S('cmp_from_focus_sr', '{name} is now the first thing to compare. Choose the second.', { name: itemText(item, 'name') }));
        setTimeout(function () { var el = cmpSecondRef.current; if (el && el.focus) { try { el.scrollIntoView({ block: 'nearest' }); } catch (_) {} el.focus(); } }, 0);
      }
      function runCompare() {
        if (!compare) return;
        flyTo(compare.big, { instant: true });
        setInspectionZoom(1); setDetailId('');
        if (atlasRef.current) atlasRef.current.reset();
        setComparisonActive(true);
        var cv = viewMode === 'atlas' ? atlasCanvasRef.current : canvasRef.current;
        if (cv && cv.parentElement) cv.parentElement.scrollIntoView({ block: 'center', behavior: 'auto' });
        updateSlice(function (cur) { cur.compareCount = (cur.compareCount || 0) + 1; });
        say(compareSentence());
      }
      function changeComparison(a, b) {
        if (!byId[a] || !byId[b]) return;
        setCmpA(a); setCmpB(b); setBridgeIndex(0); setInspectionZoom(1); setDetailId('');
        updateSlice(function (cur) { cur.comparison = { a: a, b: b }; });
        if (atlasRef.current) atlasRef.current.reset();
      }
      function inspectCompared(item) {
        setInspectionZoom(1); if (atlasRef.current) atlasRef.current.reset();
        openItem(item);
        setTimeout(function () { var cv = viewModeRef.current === 'atlas' ? atlasCanvasRef.current : canvasRef.current; if (cv) { cv.scrollIntoView({ block: 'center' }); cv.focus({ preventScroll: true }); } }, 0);
      }
      function visitBridge(index) {
        var step = bridge[index]; if (!step) return;
        setBridgeIndex(index); setInspectionZoom(1); stopJourney();
        if (atlasRef.current) atlasRef.current.reset();
        if (step.endpoint) flyTo(step.item); else goTo(step.exp);
        var cv = viewMode === 'atlas' ? atlasCanvasRef.current : canvasRef.current;
        if (cv && cv.parentElement) cv.parentElement.scrollIntoView({ block: 'center', behavior: 'auto' });
        say(S('atlas_bridge_arrived', 'Scale step {n} of {total}: {len}.', { n: index + 1, total: bridge.length, len: humanLength(step.size) }));
      }
      // The ×10 staircase: the ratio as a chain of tens, each step carrying a
      // real object at that decade. "5.36 powers of ten" is a number; five
      // visible steps from a person up to the Earth, each ten times the last,
      // is the idea. Steps are the whole decades; the remainder is said in words.
      function comparisonDiagram() {
        if (!compare) return null;
        var W = 600, children = [];
        [compare.a, compare.b].forEach(function (item, index) {
          var y = 90 + index * 120, width = 520 * item.size / compare.big.size;
          children.push(h('text', { key: 'label' + index, x: 40, y: y - 16, fill: '#dbeaf4', fontSize: 16 }, index === 0 ? S('cmp_a', 'First thing') : S('cmp_b', 'Second thing')));
          children.push(h('rect', { key: 'bar' + index, 'data-comparison-bar': item.id, x: 40, y: y, width: width, height: 18, rx: Math.min(3, width / 2), fill: index === 0 ? '#9ee4da' : '#e3c698' }));
          if (width < 2) children.push(h('path', { key: 'locator' + index, 'data-comparison-locator': item.id, d: 'M40 ' + (y - 6) + 'v30m-5 -15h10', fill: 'none', stroke: '#dbeaf4', strokeDasharray: '2 3', strokeWidth: 1 }));
          children.push(h('text', { key: 'size' + index, className: 'sx-diagram-size', x: 40, y: y + 44, fill: '#bacfdd', fontSize: 13 }, humanLength(item.size) + ' · ' + S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim)));
        });
        return h('svg', { className: 'sx-comparison-diagram', viewBox: '0 0 ' + W + ' 310', role: 'img',
          'aria-label': S('atlas_comparison_diagram', 'Length diagram at one shared scale. {line}', { line: compareSentence() }),
          style: { position: 'absolute', inset: '90px 0 35px', width: '100%', height: 'calc(100% - 125px)' } }, children);
      }
      // Side-by-side tiling for near neighbours (under two powers of ten): the
      // small thing repeated across the width of the big one. "Four basketballs
      // across a door" is a picture; past about a hundred copies the copies stop
      // being countable, and the staircase takes over.
      function tiling() {
        var ratio = compare.ratio;
        var W = 300, H = 46, top = 6, barH = 34;
        var cellW = W / ratio;
        var whole = Math.floor(ratio + 1e-9), frac = ratio - whole;
        var kids = [];
        // the big thing: one bar the full width
        kids.push(h('rect', { key: 'big', x: 0, y: top, width: W, height: barH, rx: 6, fill: P.selBg, stroke: P.accent, strokeWidth: 1 }));
        var glyph = cellW >= 14;
        for (var i = 0; i < whole; i++) {
          var x = i * cellW;
          if (glyph) {
            kids.push(h('text', { key: 'g' + i, x: x + cellW / 2, y: top + barH / 2 + 1, textAnchor: 'middle', dominantBaseline: 'middle', fontSize: Math.min(cellW * 0.85, 26) }, compare.small.emoji));
          } else {
            kids.push(h('rect', { key: 'c' + i, x: x + 0.5, y: top + 6, width: Math.max(cellW - 1, 0.6), height: barH - 12, fill: i % 2 ? P.accent : P.ringHot, opacity: 0.85 }));
          }
        }
        if (frac > 0.04) {
          // the part-copy at the end, drawn as a fraction of a cell
          var fx = whole * cellW;
          kids.push(h('rect', { key: 'frac', x: fx + 0.5, y: top + 6, width: Math.max(cellW * frac - 1, 0.6), height: barH - 12, fill: P.dim, opacity: 0.55 }));
        }
        var n = ratio < 10 ? Math.round(ratio * 10) / 10 : Math.round(ratio);
        var caption = ratio < 1.5
          ? S('fit_line_close', '{big} is only {n} times as wide as {small}: nearly the same size.', { big: itemText(compare.big, 'name'), n: n, small: lowerArticle(itemText(compare.small, 'name')) })
          : S('fit_line', 'About {n} of {small} fit side by side across {big}.', { n: n, small: lowerArticle(itemText(compare.small, 'name')), big: lowerArticle(itemText(compare.big, 'name')) });
        return h('div', { style: { marginTop: 4 } },
          h('div', { style: { fontSize: '0.71875rem', color: P.dim, marginBottom: 4 } }, caption),
          h('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, role: 'img', 'aria-label': caption, style: { display: 'block', overflow: 'visible' } }, kids),
          h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '0.65625rem', color: P.dim } },
            h('span', null, compare.small.emoji + ' ' + itemText(compare.small, 'name') + ' × ' + n),
            h('span', null, compare.big.emoji + ' ' + itemText(compare.big, 'name'))));
      }
      function staircase() {
        if (bridge.length < 2) return null;
        var current = Math.min(bridgeIndex, bridge.length - 1);
        return h('section', { className: 'sx-scale-bridge', 'aria-label': S('atlas_bridge', 'Scale bridge'), style: { marginTop: 8 } },
          h('h4', { style: { margin: '0 0 6px', fontSize: '.8125rem' } }, S('atlas_bridge', 'Scale bridge')),
          h('p', { style: { margin: '0 0 8px', fontSize: '.71875rem', color: P.dim, lineHeight: 1.5 } },
            S('atlas_bridge_hint', 'Each full step is exactly ten times the last. The final step closes the remaining gap. Nearby specimens are examples with their own measurements.')),
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
            h('button', { type: 'button', style: btn, disabled: current === 0, onClick: function () { visitBridge(current - 1); } }, S('atlas_bridge_previous', 'Previous scale step')),
            h('button', { type: 'button', style: btn, disabled: current === bridge.length - 1, onClick: function () { visitBridge(current + 1); } }, S('atlas_bridge_next', 'Next scale step'))),
          h('ol', { style: { listStyle: 'none', margin: 0, padding: '2px 4px', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 290, overflowY: 'auto' } }, bridge.map(function (step, index) {
            var on = !comparisonActive && Math.abs(exp - step.exp) < .002;
            return h('li', { key: index, 'data-bridge-step': index, style: { borderLeft: '2px solid ' + (on ? P.accent : P.line), paddingLeft: 8 } },
              index ? h('p', { style: { margin: '0 0 3px', fontSize: '.6875rem', color: P.dim } }, '×' + round2(step.factor) + ' ↓') : null,
              h('button', { type: 'button', style: on ? goBtn : btn, 'aria-current': on ? 'step' : undefined,
                'aria-label': S('atlas_bridge_visit', 'Go to scale step {n}: {len}', { n: index + 1, len: humanLength(step.size) }),
                onClick: function () { visitBridge(index); } }, lengthText(step.size) + (step.endpoint ? ' · ' + itemText(step.item, 'name') : '')),
              !step.endpoint && step.item ? h('p', { style: { fontSize: '.6875rem', color: P.dim, margin: '5px 0 0', lineHeight: 1.4 } },
                S('atlas_bridge_example', 'Nearby example: {name}, {len}.', { name: itemText(step.item, 'name'), len: lengthText(step.item.size) }),
                ' ', h('button', { type: 'button', onClick: function () { inspectCompared(step.item); }, style: Object.assign({}, btn, { padding: '3px 6px', fontSize: '.6875rem' }),
                  'aria-label': S('atlas_comparison_inspect', 'Inspect {name}', { name: itemText(step.item, 'name') }) }, S('atlas_bridge_inspect', 'Inspect example'))) : null);
          })));
      }
      function compareSentence() {
        if (!compare) return '';
        var bigName = itemText(compare.big, 'name');
        var smallName = lowerArticle(itemText(compare.small, 'name'));
        if (compare.ratio < 1.02) return S('cmp_same', '{a} and {b} are about the same size.', { a: bigName, b: smallName });
        // "bigger across" and not just "bigger": this is a ratio of lengths, so
        // saying it plainly avoids implying anything about volume or mass.
        return S('atlas_comparison_line', '{big} measures about {times} as long as {small}, using their stated dimensions. The gap is {dec} powers of ten.',
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
      if (comparisonActive) viewLine = S('atlas_comparison_readout', 'Both specimens use the same scale. {line}', { line: compareSentence() });
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

      // Where the ladder is dense and where it is empty, drawn on the scrubber's
      // own axis: a column per power of ten, as tall as the number of things at
      // that size. Human scale is crowded; between the Sun and the nearest star
      // there is almost nothing, and that emptiness is itself a fact about the
      // universe. Decorative for the screen reader (the ladder already lists
      // everything); a click on a column goes there.
      var decadeCounts = React.useMemo(function () {
        var counts = {};
        sorted.forEach(function (i) { var d = Math.round(log10(i.size)); counts[d] = (counts[d] || 0) + 1; });
        return counts;
      }, [sorted]);
      function populationStrip() {
        var lo = Math.ceil(MIN_EXP), hi = Math.floor(MAX_EXP);
        var span = MAX_EXP - MIN_EXP;
        var max = 1; Object.keys(decadeCounts).forEach(function (k) { if (decadeCounts[k] > max) max = decadeCounts[k]; });
        var cols = [];
        for (var d = lo; d <= hi; d++) {
          var c = decadeCounts[d] || 0;
          var x = ((d - MIN_EXP) / span) * 100;
          var w = (1 / span) * 100;
          cols.push(h('rect', { key: d, x: x - w / 2 + '%', y: 18 - Math.round((c / max) * 16), width: w * 0.8 + '%', height: c ? Math.round((c / max) * 16) : 1,
            fill: c ? P.accent : P.line, opacity: c ? 0.9 : 0.6, rx: 0.5, style: { cursor: 'pointer' },
            onClick: (function (n) { return function () { stopJourney(); goTo(n); }; })(d) }));
        }
        return h('svg', { 'aria-hidden': 'true', focusable: 'false', viewBox: '0 0 100 18', preserveAspectRatio: 'none',
          style: { display: 'block', width: '100%', height: 18, marginTop: 6, overflow: 'visible' } }, cols);
      }
      function itemOptions() {
        return sorted.map(function (i) { return h('option', { key: i.id, value: i.id }, itemText(i, 'name') + ' — ' + lengthText(i.size)); });
      }

      var realm = realmAt(log10(focused.size));
      var focusIndex = sorted.findIndex(function (i) { return i.id === focused.id; });
      var smaller = sorted[focusIndex + 1], larger = sorted[focusIndex - 1];
      function adjacent(item, direction) {
        if (!item) return null;
        return h('button', { type: 'button', className: 'sx-destination', onClick: function () { openItem(item); }, style: { borderColor: P.line, background: P.panel, color: P.text } },
          h('span', { style: { fontSize: '0.6875rem', color: P.dim, display: 'block', marginBottom: 4 } }, direction < 0 ? S('atlas_smaller', '← Next smaller') : S('atlas_larger', 'Next larger →')),
          h('strong', null, itemText(item, 'name')),
          h('span', { style: { fontSize: '0.75rem', color: P.dim, display: 'block', marginTop: 4 } }, lengthText(item.size)));
      }

      return h('div', { ref: wrapRef, className: 'sx-explorer flex flex-col gap-3 animate-in fade-in duration-300',
        // The fullscreen target the button below resolves with closest().
        'data-allo-fs-stage': 'true',
        // The host card is white in both themes and these inks assume slate.
        style: { background: P.bg, color: P.text, borderRadius: 14, padding: 14, minWidth: 0 } },

        h('style', null, '.sx-explorer{font-family:ui-sans-serif,system-ui,sans-serif;display:flex;flex-direction:column;gap:14px}.sx-explorer *{box-sizing:border-box}.sx-explorer button,.sx-explorer select{min-height:40px}.sx-explorer button:disabled{opacity:.45;cursor:default}.sx-explorer button:focus-visible,.sx-explorer input:focus-visible,.sx-explorer select:focus-visible,.sx-explorer canvas:focus-visible{outline:3px solid #67d8f5;outline-offset:3px}.sx-regions{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}.sx-regions button{text-align:left;padding:12px;border:1px solid;border-radius:10px;font:inherit;cursor:pointer}.sx-stage{height:clamp(410px,62vh,690px);position:relative;isolation:isolate;border-radius:16px;overflow:hidden;border:1px solid #334155;background:#0b1421}.sx-stage canvas{position:absolute;inset:0;width:100%;height:100%}.sx-hud{position:absolute;pointer-events:none;left:24px;right:24px;top:22px;color:#eef5fc;text-shadow:0 2px 10px #020713}.sx-hud h3{font-family:Georgia,serif;font-size:clamp(26px,3vw,44px);line-height:1.08;margin:7px 0;font-weight:400;max-width:75%}.sx-hud p{font-size:12px;letter-spacing:.07em;margin:0;color:#c5d7e4}.sx-stage-note{position:absolute;left:20px;right:20px;bottom:18px;pointer-events:none;display:flex;gap:12px;justify-content:space-between;align-items:flex-end;color:#deebf6;font-size:11px;line-height:1.5}.sx-stage-note span{padding:6px 9px;background:rgba(4,12,24,.86);border-radius:6px;max-width:60%}.sx-destination{flex:1 1 140px;text-align:left;border:1px solid;border-radius:10px;padding:12px;cursor:pointer;font-size:13px}.sx-flight-controls{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.sx-panel{flex:0 1 310px;min-width:0;width:100%}.sx-search{width:100%;padding:10px 12px;border:1px solid;border-radius:8px;font:inherit;font-size:13px}.sx-explorer:fullscreen{overflow:auto;padding:20px!important}.sx-explorer:fullscreen .sx-stage{height:72vh}@media(max-width:700px){.sx-regions{grid-template-columns:repeat(3,minmax(0,1fr))}.sx-regions button{padding:9px;font-size:12px}.sx-stage{height:440px}.sx-hud{left:16px;right:16px;top:18px}.sx-hud h3{max-width:100%;font-size:30px}.sx-panel{flex:1 1 100%}.sx-stage-note{left:12px;right:12px}.sx-stage-note span{max-width:70%}}@media(prefers-reduced-motion:reduce){.sx-explorer{animation:none!important;scroll-behavior:auto}}'),

        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
          typeof setStemLabTool === 'function' && h('button', { onClick: function () { setStemLabTool(null); say(S('returned_sr', 'Returned to the STEAM Lab tools.')); }, type: 'button', style: btn },
            ArrowLeft ? h(ArrowLeft, { size: 14, style: { display: 'inline', verticalAlign: '-2px', marginRight: 4 } }) : null,
            S('back_to_tools', 'Back to STEAM Lab tools')),
          h('div', { style: { flex: '1 1 auto' } },
            h('p', { style: { margin: '0 0 3px', fontSize: '0.625rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: P.dim } }, S('atlas_eyebrow', 'An atlas of everything')),
            h('h2', { style: { margin: 0, fontSize: '1.5rem', fontWeight: 650, letterSpacing: '-0.035em' } }, S('atlas_title', 'Scale Explorer'))),
          // The shared binder owns the click AND keeps the accessible name, the
          // pressed state and the glyph in step with the real fullscreen state --
          // including an Escape exit, which never reaches a click handler. Before
          // this the button read "Fullscreen" even while the tool filled the
          // screen. The glyph has to be the first element child for the binder to
          // swap it, hence the span.
          typeof window.__alloStemFS === 'function' ? h('button', {
            type: 'button', style: btn,
            'data-allo-fs-btn': 'true',
            'aria-pressed': 'false',
            'aria-label': S('fullscreen_enter', 'View the scale explorer full screen'),
            'data-fs-out': S('fullscreen_enter', 'View the scale explorer full screen'),
            'data-fs-in': S('fullscreen_exit', 'Exit full screen scale explorer'),
            ref: function (b) { if (b && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(b, b.closest('[data-allo-fs-stage]')); },
            onClick: function () { setTimeout(draw, 60); }
          }, h('span', { 'aria-hidden': 'true' }, '⛶'), ' ', S('fullscreen_label', 'Fullscreen')) : null
        ),

        h('p', { style: { margin: 0, fontSize: '0.8125rem', color: P.dim, lineHeight: 1.55 } },
          S('atlas_blurb', 'Travel from the familiar to the almost unimaginable. Orbit a world, find your next destination, and feel what a power of ten changes.')),

        h('style', null, '.sx-panel{align-self:flex-start}.sx-stage:after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,rgba(3,9,17,.38),transparent 29%,transparent 82%,rgba(3,9,17,.45))}.sx-hud,.sx-stage-note{z-index:1}.sx-hud h3{letter-spacing:-.025em}.sx-stage canvas:active{cursor:grabbing!important}.sx-markers{position:absolute;inset:0;pointer-events:none;z-index:2}.sx-marker{position:absolute;left:0;top:0;width:44px;height:44px;padding:6px;background:transparent;border:0;pointer-events:auto;cursor:pointer;color:#f2f8ec;font:600 12px system-ui}.sx-marker[hidden]{display:none}.sx-marker span{display:grid;place-items:center;width:30px;height:30px;border:1px solid #d0dec2;border-radius:50%;background:rgba(11,27,23,.88);box-shadow:0 0 0 4px rgba(180,215,162,.10),0 3px 12px #0005}.sx-marker:hover span,.sx-marker[aria-pressed="true"] span{background:#deebbe;color:#172819;border-color:#eff5de}.sx-detail-choices{display:flex;flex-wrap:wrap;gap:6px;margin-top:12px}.sx-detail-choices button{flex:1 1 130px;text-align:left}.sx-detail-note a:focus-visible{outline:3px solid #67d8f5;outline-offset:3px}'),
        h('style', null, '.sx-comparison-points{position:absolute;inset:0;pointer-events:none;z-index:2}.sx-comparison-point{position:absolute;left:0;top:0;pointer-events:auto;width:172px;border:1px dashed #bed3de;border-radius:8px;padding:7px 9px;color:#eef6fc;background:rgba(9,22,32,.93);font:12px system-ui;cursor:pointer}.sx-comparison-point:before{content:"+";display:block;font-size:20px;line-height:22px}.sx-comparison-point[hidden]{display:none}.sx-comparison-pair{display:flex;gap:8px;flex-wrap:wrap}.sx-comparison-pair article{flex:1 1 200px;min-width:0;overflow-wrap:anywhere}.sx-scale-bridge button{text-align:left;max-width:100%}.sx-explorer textarea:focus-visible{outline:3px solid #67d8f5;outline-offset:3px}'),
        h('style', null, '@media(max-width:700px){.sx-comparison-diagram text{font-size:30px}.sx-comparison-diagram .sx-diagram-size{font-size:26px}}'),
        h('nav', { className: 'sx-regions', 'aria-label': S('atlas_realms', 'Scale destinations') }, REALMS.map(function (r, i) {
          var active = realm.id === r.id;
          return h('button', { key: r.id, type: 'button', 'aria-current': active ? 'true' : undefined, onClick: function () { openItem(byId[r.at]); },
            style: { background: active ? P.selBg : P.panel, borderColor: active ? P.accent : P.line, color: active ? P.selFg : P.text } },
            h('span', { style: { display: 'block', color: active ? P.selFg : P.dim, fontSize: '0.625rem', letterSpacing: '0.12em', marginBottom: 4 } }, '0' + (i + 1)),
            h('strong', { style: { fontSize: '0.75rem' } }, S('atlas_realm_' + r.id, r.name)));
        })),

        h('div', { style: { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'stretch' } },

          // ── Stage ──
          h('div', { style: { flex: '1 1 520px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 } },
            h('label', { style: { display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.75rem', color: P.dim } },
              S('atlas_fly_to', 'Fly to'),
              h('select', { 'aria-label': S('atlas_destination', 'Choose a destination'), value: focusId, onChange: function (e) { openItem(byId[e.target.value]); }, style: Object.assign({}, sel, { flex: 1, minWidth: 0, fontWeight: 600 }) }, itemOptions())),
            h('div', { className: 'sx-flight-controls', role: 'group', 'aria-label': S('atlas_view_controls', 'View controls') },
              h('button', { type: 'button', style: viewMode === 'atlas' ? goBtn : btn, 'aria-pressed': viewMode === 'atlas', onClick: function () { setViewMode('atlas'); } }, S('atlas_view', 'Immersive 3D')),
              h('button', { type: 'button', style: viewMode === 'chart' ? goBtn : btn, 'aria-pressed': viewMode === 'chart', onClick: function () { setViewMode('chart'); } }, S('atlas_chart', 'Scale chart')),
              viewMode === 'atlas' ? h('button', { type: 'button', style: btn, onClick: function () { setInspectionZoom(1);setDetailId(''); if (atlasRef.current) atlasRef.current.reset(); } }, S('atlas_reset', 'Reset camera')) : null,
              viewMode === 'atlas' ? h('button', { type: 'button', style: btn, 'aria-pressed': ambient && !reduceMotion, disabled: reduceMotion, onClick: function () { setAmbient(!ambient); updateSlice(function (cur) { cur.ambient = !ambient; }); } }, reduceMotion ? S('atlas_still', 'Reduced motion') : ambient ? S('atlas_motion_pause', 'Pause ambience') : S('atlas_motion_play', 'Resume ambience')) : null),
            atlasStatus === 'failed' ? h('p', { role: 'status', style: { margin: 0, color: P.dim, fontSize: '0.8125rem' } }, S('atlas_failed', 'The 3D view is unavailable. The scale chart and all destinations are ready to explore.')) : null,
            h('div', { className: 'sx-stage' },
              viewMode === 'atlas' ? h('canvas', { ref: atlasCanvasRef, tabIndex: 0, role: 'application',
                'aria-label': comparisonActive ? S('atlas_comparison_canvas_aria', 'Shared scale comparison. Drag or use W A S D to orbit. Scroll or pinch to inspect. R resets the camera. Escape returns to exploration.') : S('atlas_canvas_aria', 'Interactive scale atlas. Scroll or use arrow keys to travel through scale. Drag to orbit, or use W A S D. Pinch to inspect more closely. R resets the camera. Home returns to human scale. Space plays or pauses the journey.'),
                'aria-describedby': descId, onKeyDown: onCanvasKey, style: { touchAction: 'none', cursor: 'grab', outlineOffset: '-4px' } }) : null,
              h('canvas', { ref: canvasRef, tabIndex: 0, role: 'application',
                'aria-label': S('canvas_aria', 'Scale view. Left and right arrows zoom by a quarter of a power of ten, hold shift for a whole one, Page Up and Page Down jump three, Home returns to human scale, space plays or pauses the zoom.'),
                'aria-describedby': descId,
                onKeyDown: onCanvasKey, onWheel: onWheel,
                style: { display: viewMode === 'chart' && !comparisonActive ? 'block' : 'none', width: '100%', height: '100%', outlineOffset: '-3px' } }),
              viewMode === 'chart' && comparisonActive ? comparisonDiagram() : null,
              viewMode==='atlas'?h('div',{ref:markerLayerRef,className:'sx-markers'},details.map(function(detail,index){return h('button',{key:focusId+'-'+detail.id,type:'button',className:'sx-marker',hidden:true,'data-scale-marker':detail.id,'aria-label':S('atlas_inspect_part', 'Inspect {part}',{part:detail.label}),'aria-pressed':detailId===detail.id,title:detail.label,onClick:function(){chooseDetail(detail);}},h('span',null,index+1));})):null,
              viewMode === 'atlas' ? h('div', { ref: comparisonLayerRef, className: 'sx-comparison-points' }, compare ? [compare.a, compare.b].map(function (item, index) {
                return h('button', { key: index, type: 'button', className: 'sx-comparison-point', hidden: true, 'data-scale-comparison-point': item.id,
                  'aria-label': S('atlas_comparison_inspect', 'Inspect {name}', { name: itemText(item, 'name') }), onClick: function () { inspectCompared(item); } },
                  S('atlas_comparison_locator', 'Position only · too small to resolve'), h('span', { style: { display: 'block', marginTop: 4, fontWeight: 700 } }, itemText(item, 'name')));
              }) : null) : null,
              viewMode === 'atlas' || comparisonActive ? h('div', { className: 'sx-hud', 'aria-hidden': 'true' },
                h('p', { style: { color: comparisonActive ? '#a5dcd8' : theme === 'contrast' ? '#ffffff' : realm.color, textTransform: 'uppercase', fontWeight: 700 } }, comparisonActive ? S('atlas_comparison_studio', 'Comparison studio') : S('atlas_realm_' + realm.id, realm.name)),
                h('h3', null, comparisonActive ? S('atlas_comparison_shared', 'One shared scale') : itemText(focused, 'name')),
                h('p', null, comparisonActive ? (viewMode === 'atlas' ? S('atlas_comparison_projection', 'Measured proportions · parallel projection') : S('atlas_comparison_diagram_tag', 'Measured lengths · one shared unit')) : lengthText(focused.size) + ' ' + S('dim_' + focused.dim.replace(/\s+/g, '_'), focused.dim)),
                !comparisonActive&&selectedDetail?h('p',{style:{marginTop:14,letterSpacing:'.02em',color:'#deebbe'}},S('atlas_inspecting', 'Inspecting: {part}',{part:selectedDetail.label})):null,
                atlasStatus === 'loading' ? h('p', { style: { marginTop: 20 } }, S('atlas_loading', 'Preparing your observatory…')) : null) : null,
              viewMode === 'atlas' ? h('div', { className: 'sx-stage-note', 'aria-hidden': 'true' },
                h('span', null, comparisonActive ? S('atlas_comparison_gesture', 'Drag to orbit · Scroll to inspect · Esc to explore') : S('atlas_gesture', 'Drag to orbit · Pinch to inspect · Scroll to travel')),
                h('span', null, S('atlas_model_tag', 'Illustrated models / measured dimensions'))) : null
            ),
            comparisonActive ? h('section', { className: 'sx-comparison-summary', 'aria-label': S('atlas_comparison_dimensions', 'Compared measurements') },
              h('div', { className: 'sx-comparison-pair' }, [compare.a, compare.b].map(function (item, index) {
                return h('article', { key: index, style: Object.assign({}, card, { borderTop: '3px solid ' + (index === 0 ? '#9ee4da' : '#e3c698') }) },
                  h('p', { style: { margin: '0 0 3px', fontSize: '.6875rem', color: P.dim } }, index === 0 ? S('cmp_a', 'First thing') : S('cmp_b', 'Second thing')),
                  h('strong', null, itemText(item, 'name')),
                  h('p', { style: { margin: '4px 0 8px', fontSize: '.75rem' } }, lengthText(item.size) + ' · ' + S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim)),
                  h('button', { type: 'button', style: btn, onClick: function () { inspectCompared(item); } }, S('atlas_comparison_inspect', 'Inspect {name}', { name: itemText(item, 'name') })));
              })),
              h('p', { style: { fontSize: '.75rem', color: P.dim, lineHeight: 1.5 } }, S('atlas_comparison_scope', 'The ratio compares the stated length, height, width or distance. Areas and volumes need additional shape assumptions.')),
              compare.ratio >= 100 ? h('p', { style: { fontSize: '.75rem', color: P.dim, lineHeight: 1.5 } }, S('atlas_comparison_resolution', 'A smaller specimen may fall below a screen pixel at this scale. A dashed locator marks its position; Inspect brings it into view at its own scale.')) : null,
              h('button', { type: 'button', style: btn, onClick: function () { inspectCompared(focused); } }, S('atlas_comparison_exit', 'Back to exploration'))) : null,
            viewMode === 'atlas' ? h('div', { className: 'sx-inspection', style: { display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',padding:'9px 12px',border:'1px solid '+P.line,borderRadius:10,background:P.panel } },
              h('label', { style:{display:'flex',gap:10,alignItems:'center',flex:'1 1 230px',fontSize:'0.75rem'} },
                S('atlas_inspection_zoom', 'Inspection zoom'),
                h('input', { type:'range',min:1,max:2.5,step:.1,value:inspectionZoom,'aria-label':S('atlas_inspection_aria', 'Inspection magnification'), 'aria-valuetext':S('atlas_inspection_value', '{n} times closer', {n:inspectionZoom.toFixed(1)}),onChange:function(ev){setInspectionZoom(Number(ev.target.value));},style:{flex:1,minWidth:60,accentColor:P.accent} }),
                h('output', { style:{fontVariantNumeric:'tabular-nums',minWidth:34} },inspectionZoom.toFixed(1)+'×')),
              h('button', { type:'button',style:btn,disabled:inspectionZoom===1&&!detailId,onClick:function(){setInspectionZoom(1);setDetailId('');} },S('atlas_fit', 'Fit object')),
              focused.id==='mitochondrion'?h('button',{type:'button',style:cutaway?goBtn:btn,'aria-pressed':cutaway,onClick:function(){setCutaway(!cutaway);setDetailId('');}},S('atlas_cutaway', 'Open cutaway')):null) : null,
            viewMode==='atlas'&&!comparisonActive&&details.length?h('section',{className:'sx-details','aria-label':S('atlas_detail_section', 'Explore this specimen'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('div',{style:{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center'}},h('h3',{style:{fontSize:'0.9rem',margin:0}},S('atlas_detail_section', 'Explore this specimen')),h('button',{type:'button',style:btn,'aria-pressed':showDetails,onClick:function(){setShowDetails(!showDetails);}},S('atlas_markers', 'Landmarks'))),
              h('div',{className:'sx-detail-choices'},details.map(function(detail,index){return h('button',{key:detail.id,type:'button',style:detailId===detail.id?goBtn:btn,'aria-pressed':detailId===detail.id,onClick:function(){chooseDetail(detail);}},h('span',{'aria-hidden':'true',style:{opacity:.7,marginRight:6}},String(index+1).padStart(2,'0')),detail.label);})),
              selectedDetail?h('div',{className:'sx-detail-note',style:{borderLeft:'2px solid '+P.accent,paddingLeft:12}},h('p',{style:{fontSize:'0.875rem',lineHeight:1.65,margin:'10px 0 6px'}},selectedDetail.body),h('a',{href:selectedDetail.source,target:'_blank',rel:'noopener noreferrer',style:{fontSize:'0.75rem',color:P.accent}},S('atlas_detail_source', 'Read the science source'))):h('p',{style:{fontSize:'0.8rem',lineHeight:1.6,color:P.dim,margin:'10px 0 0'}},S('atlas_detail_invite', 'Choose a numbered landmark to move closer. Orbit around the feature, then use Fit object to see the whole specimen.'))):null,
            viewMode==='atlas'&&focused.id==='mitochondrion'?h('p',{style:{margin:0,fontSize:'0.75rem',lineHeight:1.5,color:P.dim}},cutaway?S('atlas_cutaway_open', 'Inside: the cristae are folds of the inner membrane. Close the cutaway to see the outer surface.'):S('atlas_cutaway_closed', 'Outside: the outer membrane encloses the organelle. Open the cutaway to explore the folds within.')):null,
            viewMode === 'atlas' ? h('div', { className: 'sx-flight-controls', role: 'group', 'aria-label': S('atlas_orbit_controls', 'Orbit the 3D scene') },
              h('button', { type: 'button', style: btn, onClick: function () { if (atlasRef.current) atlasRef.current.orbit(-0.2, 0); } }, S('atlas_orbit_left', 'Orbit left')),
              h('button', { type: 'button', style: btn, onClick: function () { if (atlasRef.current) atlasRef.current.orbit(0.2, 0); } }, S('atlas_orbit_right', 'Orbit right')),
              h('button', { type: 'button', style: neighbors ? goBtn : btn, disabled: comparisonActive, 'aria-pressed': neighbors, onClick: function () { setNeighbors(!neighbors); updateSlice(function(cur){cur.atlasNeighbors=!neighbors;}); } }, S('atlas_show_neighbors', 'Size neighbors')),
              h('button', { type: 'button', style: measure ? goBtn : btn, 'aria-pressed': measure, onClick: function () { setMeasure(!measure); } }, S('atlas_measure', 'Measurement')),
              h('button', { type: 'button', style: btn, onClick: function () { zoomBy(-1); } }, S('atlas_shrink', 'Explore 10× smaller')),
              h('button', { type: 'button', style: btn, onClick: function () { zoomBy(1); } }, S('atlas_grow', 'Explore 10× larger'))) : null,
            h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, 'aria-label': S('atlas_neighbors', 'Nearby destinations') }, adjacent(smaller, -1), adjacent(larger, 1)),
            h('p', { id: descId, ref: readoutRef, style: { margin: 0, fontSize: '0.8125rem', color: P.text, fontWeight: 600 } }, viewLine),
            edge ? h('p', { role: 'status', style: Object.assign({}, card, { margin: 0, borderColor: P.accent, fontSize: '0.78125rem' }) }, '🛑 ' + edge) : null,
            h('label', { style: { display: 'block', fontSize: '0.71875rem', color: P.dim } },
              S('scrub_label', 'Where you are, across all 44 powers of ten'),
              populationStrip(),
              h('input', { type: 'range', ref: scrubRef, min: MIN_EXP, max: MAX_EXP, step: 0.1, defaultValue: exp,
                'aria-label': S('scrub_aria', 'Scale position, in powers of ten'),
                'aria-valuetext': viewLineFor(exp),
                onChange: function (e) { stopJourney(); goTo(parseFloat(e.target.value), { instant: true }); },
                onPointerDown: function () { scrubDragRef.current = true; },
                onPointerUp: function () { scrubDragRef.current = false; },
                onPointerCancel: function () { scrubDragRef.current = false; },
                onBlur: function () { scrubDragRef.current = false; },
                style: { width: '100%', marginTop: 4, accentColor: P.accent } })),
            // Play the zoom: the whole ladder as one continuous shot. Outward from
            // here to the observable universe, or inward to the proton.
            h('div', { role: 'group', 'aria-label': S('film_group', 'Play the zoom'), style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
              h('button', { type: 'button', 'aria-pressed': film > 0 ? 'true' : 'false',
                style: film > 0 ? Object.assign({}, goBtn, { padding: '6px 10px' }) : Object.assign({}, btn, { fontWeight: 700 }),
                onClick: function () { film > 0 ? toggleFilm(1) : startFilm(1); } },
                film > 0 ? S('film_pause', '⏸ Pause') : S('film_out', '▶ Play the zoom out to the universe')),
              h('button', { type: 'button', 'aria-pressed': film < 0 ? 'true' : 'false',
                style: film < 0 ? Object.assign({}, goBtn, { padding: '6px 10px' }) : Object.assign({}, btn, { fontWeight: 700 }),
                onClick: function () { film < 0 ? toggleFilm(-1) : startFilm(-1); } },
                film < 0 ? S('film_pause', '⏸ Pause') : S('film_in', '▶ Play the zoom in to the proton')),
              h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.71875rem', color: P.dim } },
                S('film_speed', 'Speed'),
                h('select', { value: filmSpeed, 'aria-label': S('film_speed_aria', 'Film speed, in powers of ten per second'),
                  onChange: function (e) { var v = e.target.value; setFilmSpeed(v); updateSlice(function (cur) { cur.filmSpeed = v; }); },
                  style: Object.assign({}, sel, { padding: '4px 6px', fontSize: '0.71875rem' }) },
                  h('option', { value: 'slow' }, S('film_slow', 'Slow')),
                  h('option', { value: 'normal' }, S('film_normal', 'Normal')),
                  h('option', { value: 'fast' }, S('film_fast', 'Fast')))),
              reduceMotion ? h('span', { style: { fontSize: '0.6875rem', color: P.dim } }, S('film_reduced', 'Reduced motion is on, so this plays one power of ten at a time.')) : null),
            // Guided tours: a narrative with one sentence per stop, paced by the student.
            (function () {
              var tour = TOURS.filter(function (x) { return x.id === tourId; })[0] || null;
              var atEnd = tour && stopIdx >= tour.stops.length - 1;
              return h('div', { role: 'group', 'aria-label': S('tour_group', 'Guided tours'), style: Object.assign({}, card, { display: 'flex', flexDirection: 'column', gap: 6 }) },
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
                  h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.71875rem', color: P.dim } },
                    '🧭 ' + S('tour_label', 'Guided tour'),
                    h('select', { value: tourId, 'aria-label': S('tour_select_aria', 'Choose a guided tour'), onChange: function (e) { startTour(e.target.value); },
                      style: Object.assign({}, sel, { padding: '4px 6px', fontSize: '0.75rem' }) },
                      h('option', { value: '' }, S('tour_none', 'Choose a tour…')),
                      TOURS.map(function (x) { return h('option', { key: x.id, value: x.id }, x.emoji + ' ' + tourText(x, 'title')); }))),
                  tour ? h('button', { type: 'button', style: btn, disabled: stopIdx <= 0, onClick: function () { goToStop(tour, stopIdx - 1); } }, S('tour_prev', '◀ Back')) : null,
                  tour ? h('button', { type: 'button', style: atEnd ? btn : goBtn, disabled: !!atEnd, onClick: function () { goToStop(tour, stopIdx + 1); } }, S('tour_next', 'Next stop ▶')) : null,
                  tour ? h('span', { style: { fontSize: '0.71875rem', color: P.dim } }, S('tour_progress', 'Stop {n} of {total}', { n: stopIdx + 1, total: tour.stops.length })) : null),
                tour && stopIdx >= 0 ? h('p', { style: { margin: 0, fontSize: '0.8125rem', lineHeight: 1.5 } },
                  h('b', null, (byId[tour.stops[stopIdx].id] || {}).emoji + ' ' + itemText(byId[tour.stops[stopIdx].id], 'name') + ': '), tourText(tour, 'line', stopIdx)) : null,
                atEnd ? h('p', { role: 'status', style: { margin: 0, fontSize: '0.75rem', color: P.ok } }, S('tour_done', 'Tour complete. Choose another, or explore from here.')) : null);
            })(),
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
          h('aside', { className: 'sx-panel', 'aria-label': S('panel_aria', 'Scale details'), style: { background: P.panel, border: '1px solid ' + P.line, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 10 } },

            h('div', null,
              h('h3', { style: { margin: '0 0 4px', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: P.dim } }, S('focus_heading', 'In focus')),
              h('div', { style: card },
                h('div', { style: { fontWeight: 700, marginBottom: 2 } }, itemText(focused, 'name')),
                h('div', { style: { color: P.dim, fontSize: '0.75rem', marginBottom: 6 } },
                  S('size_line', '{len} {dim}', { len: lengthText(focused.size), dim: S('dim_' + focused.dim.replace(/\s+/g, '_'), focused.dim) })),
                h('p', { style: { margin: 0 } }, itemText(focused, 'describe')),
                viewMode === 'atlas' ? h('p', { style: { margin: '10px 0 0', color: P.dim, fontSize: '0.71875rem', lineHeight: 1.5 } },
                  focused.dim === 'distance' ? S('atlas_distance_note', 'This is a gap, shown as a ruler. Endpoint markers are illustrative, not scaled objects.') :
                  focused.id === 'solar-system' ? S('atlas_solar_note', 'The outer orbit sets the measured width. Inner orbits and planet markers are enlarged and spaced for visibility.') :
                  focused.id === 'carbon' || focused.id === 'hydrogen' || focused.id === 'proton' ? S('atlas_quantum_note', 'A conceptual probability or charge cloud, not a solid surface. Colors are illustrative; an atomic nucleus would be too small to see here.') :
                  focused.id === 'everest' ? S('atlas_everest_note', 'The stated height is measured above sea level. The mountain terrain is an illustration, not a surveyed height map.') :
                  focused.id === 'earth' ? S('atlas_earth_note', 'Earth imagery: NASA/Goddard Space Flight Center Scientific Visualization Studio, Blue Marble. A satellite mosaic, not a live view. Neighboring objects are arranged by size, not orbital distance.') :
                  focused.id === 'moon' ? S('atlas_moon_note', 'Lunar surface imagery: NASA/GSFC/Arizona State University, Lunar Reconnaissance Orbiter. Lighting here is illustrative.') :
                  focused.id === 'jupiter' ? S('atlas_jupiter_note', 'Jupiter surface: NASA/GSFC and Space Telescope Science Institute, Hubble global map from 2015. A historical observation with simulated lighting.') :
                  focused.id === 'human' ? S('atlas_human_note', 'A sculptural body study using the MakeHuman Community surface (CC0), with a procedural fallback. A generic adult figure, scaled to the stated height.') :
                  focused.id === 'honeybee' ? S('atlas_bee_note', 'Look for the head, hairy thorax, banded abdomen, six legs, and two pairs of veined wings. The stated length measures the body; antennae extend beyond it.') :
                  focused.id === 'trex' ? S('atlas_trex_note', 'A reconstruction with a horizontal body, balancing tail, two walking legs, and two fingers on each small hand. Surface colors and soft tissues are illustrative.') :
                  focused.id === 'mitochondrion' ? S('atlas_mito_note', 'A cutaway reveals the folds of the inner membrane, called cristae. Shape and colors illustrate its structure; this is not a microscopy reconstruction.') :
                  S('atlas_illustration_note', 'A stylized model, with illustrative colors and details. Travel changes its size by powers of ten. Positions arrange the atlas; they are not real locations.')) : null,
                focused.note ? h('p', { style: { margin: '6px 0 0', fontSize: '0.71875rem', color: P.dim, lineHeight: 1.45 } }, '⚖️ ' + itemText(focused, 'note')) : null,
                h('div', { style: { marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' } },
                  speakBtn('focus', itemText(focused, 'describe') + (focused.note ? ' ' + itemText(focused, 'note') : '')),
                  h('button', { type: 'button', onClick: copyLink, 'aria-label': S('copy_link_aria', 'Copy a link that opens Scale Explorer at {name}', { name: itemText(focused, 'name') }),
                    title: S('copy_link_title', 'Copy a link that opens Scale Explorer here'),
                    style: Object.assign({}, btn, { padding: '4px 8px', fontSize: '0.6875rem' }) },
                    linkState === 'copied' ? '✓ ' + S('link_copied', 'Link copied') : '🔗 ' + S('copy_link', 'Copy link to this view')),
                  focused.photo && typeof ctx.setStemLabTool === 'function' ? h('button', { type: 'button',
                    onClick: function () { try { window.__alloZoomGalleryStart = { image: focused.photo, from: 'scaleExplorer' }; } catch (_) {} updateSlice(function (cur) { cur.toGalleryCount = (cur.toGalleryCount || 0) + 1; }); stopJourney(); ctx.setStemLabTool('zoomGallery'); },
                    'aria-label': S('see_photo_aria', 'Open a real photograph of {name} in Zoom Gallery', { name: itemText(focused, 'name') }),
                    style: Object.assign({}, btn, { padding: '4px 8px', fontSize: '0.6875rem' }) }, '🔍 ' + S('see_photo', 'See a real photo')) : null,
                  h('button', { type: 'button', onClick: compareFocused,
                    'aria-label': S('cmp_from_focus_aria', 'Compare {name} with something else', { name: itemText(focused, 'name') }),
                    style: Object.assign({}, btn, { padding: '4px 8px', fontSize: '0.6875rem' }) }, '⚖️ ' + S('cmp_from_focus', 'Compare this'))),
                linkState === 'failed' ? h('div', { style: { marginTop: 6 } },
                  h('div', { style: { fontSize: '0.71875rem', color: P.dim, marginBottom: 4 } }, S('link_failed', 'Copying was blocked here. Select the link and copy it by hand:')),
                  h('input', { type: 'text', readOnly: true, value: shareLinkFor(focused), 'aria-label': S('link_field_aria', 'Link to this view'),
                    onFocus: function (e) { try { e.target.select(); } catch (_) {} },
                    style: { width: '100%', boxSizing: 'border-box', fontSize: '0.71875rem', padding: '4px 6px', borderRadius: 6, border: '1px solid ' + P.line, background: P.bg, color: P.text } })) : null)),

            // Your height: the one personalisation that changes what every other
            // number means. Shown when the person is in focus, and always once set.
            (focused.id === 'human' || yourCm) ? h('div', { style: { display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.71875rem', color: P.dim } },
              h('label', { style: { display: 'inline-flex', alignItems: 'center', gap: 4 } },
                S('you_label', 'Make the person your height:'),
                h('input', { type: 'number', min: 50, max: 250, step: 1, inputMode: 'numeric', value: heightDraft, placeholder: yourCm ? String(yourCm) : '170',
                  'aria-label': S('you_input_aria', 'Your height in centimetres'),
                  onChange: function (e) { setHeightDraft(e.target.value); },
                  onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); submitHeight(); } },
                  style: { width: 64, padding: '4px 6px', borderRadius: 6, border: '1px solid ' + P.line, background: P.bg, color: P.text, fontSize: '0.75rem' } }),
                S('you_cm', 'cm')),
              h('button', { type: 'button', onClick: submitHeight, style: Object.assign({}, btn, { padding: '4px 8px', fontSize: '0.6875rem' }) }, S('you_apply', 'Use my height')),
              yourCm ? h('button', { type: 'button', onClick: function () { applyHeight(null); }, style: Object.assign({}, btn, { padding: '4px 8px', fontSize: '0.6875rem' }) }, S('you_reset', 'Back to average')) : null) : null,

            h('section', { className: 'sx-notebook', 'aria-label': S('atlas_notebook_heading', 'Field notebook'), style: Object.assign({}, card, { display: 'flex', flexDirection: 'column', gap: 8 }) },
              h('h3', { style: { fontSize: '0.875rem', margin: 0 } }, S('atlas_notebook_heading', 'Field notebook')),
              h('p', { style: { margin: 0, color: P.dim, fontSize: '0.75rem' } }, itemText(focused, 'name') + (observationDetail ? ' · ' + selectedDetail.label : '')),
              h('label', { style: { fontSize: '0.75rem' } }, S('atlas_notebook_prompt', 'What do you notice?'),
                h('textarea', { value: observationDraft, onChange: function (e) { editObservation(e.target.value); }, rows: 3, maxLength: NOTE_LIMIT,
                  style: Object.assign({}, sel, { display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 5, resize: 'vertical', font: 'inherit', minHeight: 76 }) })),
              h('p', { style: { margin: 0, fontSize: '0.6875rem', color: P.dim } }, S('atlas_notebook_hint', 'Drafts stay with their specimen or landmark. Save an observation to include it in your download.')),
              comparisonActive ? h('p', { style: { margin: 0, color: P.dim, fontSize: '.75rem' } }, S('atlas_comparison_observe', 'Inspect a specimen to save its view and observation in your notebook.')) : null,
              h('button', { type: 'button', style: goBtn, disabled: comparisonActive || (!savedObservation && observations.length >= NOTEBOOK_LIMIT), onClick: saveObservation },
                savedObservation ? S('atlas_observation_update', 'Update observation') : S('atlas_observation_save', 'Save observation')),
              !savedObservation && observations.length >= NOTEBOOK_LIMIT ? h('p', { style: { margin: 0, color: P.warn, fontSize: '0.75rem' } }, S('atlas_notebook_full', 'Your notebook has 24 observations. Remove one to save another; existing observations can still be updated.')) : null,
              h('details', { ref: savedObservationsRef },
                h('summary', { style: { cursor: 'pointer', padding: '6px 0', fontWeight: 600 } }, S('atlas_notebook_count', 'Saved observations · {n}', { n: observations.length })),
                observations.length ? h('ol', { style: { listStyle: 'none', padding: 0, margin: '6px 0', display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 330, overflowY: 'auto' } }, observations.map(function (entry) {
                  var title = observationTitle(entry), item = observationItem(entry);
                  return h('li', { key: observationKey(entry.itemId, entry.detailId), 'data-observation': observationKey(entry.itemId, entry.detailId), style: { borderTop: '1px solid ' + P.line, paddingTop: 10, overflowWrap: 'anywhere' } },
                    h('strong', { style: { display: 'block', fontSize: '0.75rem' } }, title),
                    h('p', { style: { margin: '3px 0', color: P.dim, fontSize: '0.6875rem' } }, S('atlas_observation_size', 'Recorded size: {len} {dim}', { len: humanLength(entry.size), dim: S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim) })),
                    entry.note ? h('p', { style: { margin: '6px 0', whiteSpace: 'pre-wrap', fontSize: '0.75rem' } }, entry.note) : null,
                    h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 } },
                      h('button', { type: 'button', style: btn, onClick: function () { revisitObservation(entry); }, 'aria-label': S('atlas_observation_return_aria', 'Return to {name}', { name: title }) }, S('atlas_observation_return', 'Return to view')),
                      h('button', { type: 'button', style: btn, onClick: function () { removeObservation(entry); }, 'aria-label': S('atlas_observation_remove_aria', 'Remove observation of {name}', { name: title }) }, S('atlas_observation_remove', 'Remove'))));
                })) : h('p', { style: { color: P.dim, fontSize: '0.75rem' } }, S('atlas_notebook_empty', 'Saved observations will appear here.')),
                h('button', { type: 'button', style: btn, disabled: !observations.length, onClick: downloadObservations }, S('atlas_notebook_download', 'Download notes'))),
              h('p', { role: 'status', style: { margin: 0, fontSize: '0.75rem', minHeight: '1.5em' } }, notebookMessage)),

            // Estimate first, then check: the house Predict → Explore → Explain
            // shape. The reveal is never withheld and never scored.
            challenge ? h('details', null,
              h('summary', { style: { padding: '10px 0', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: P.text } }, S('est_heading', 'Estimate first')),
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
            h('details', { ref: cmpDetailsRef, className: 'sx-comparison-workbench' },
              h('summary', { style: { padding: '10px 0', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: P.text } }, S('cmp_heading', 'Compare two sizes')),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                h('label', { style: { fontSize: '0.71875rem', color: P.dim } }, S('cmp_a', 'First thing'),
                  h('select', { value: cmpA, onChange: function (e) { changeComparison(e.target.value, cmpB); }, style: Object.assign({}, sel, { width: '100%', marginTop: 2 }) }, itemOptions())),
                h('label', { style: { fontSize: '0.71875rem', color: P.dim } }, S('cmp_b', 'Second thing'),
                  h('select', { ref: cmpSecondRef, value: cmpB, onChange: function (e) { changeComparison(cmpA, e.target.value); }, style: Object.assign({}, sel, { width: '100%', marginTop: 2 }) }, itemOptions())),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  h('button', { type: 'button', style: goBtn, onClick: runCompare, 'aria-pressed': comparisonActive }, S('cmp_go', 'Compare them')),
                  h('button', { type: 'button', style: btn, onClick: function () { changeComparison(cmpB, cmpA); } }, S('atlas_comparison_swap', 'Swap specimens'))),
                compare ? h('p', { role: 'status', style: Object.assign({}, card, { margin: 0, borderColor: P.accent }) }, compareSentence()) : null,
                compare && (compare.a.note || compare.b.note || compare.a.dim === 'distance' || compare.b.dim === 'distance') ? h('details', { className: 'sx-comparison-evidence', style: { fontSize: '.75rem', lineHeight: 1.5 } },
                  h('summary', { style: { padding: '6px 0', cursor: 'pointer', color: P.dim } }, S('atlas_comparison_notes', 'Measurement notes')),
                  [compare.a, compare.b].map(function (item, index) { return item.note || item.dim === 'distance' ? h('p', { key: index }, h('strong', null, itemText(item, 'name') + ': '), item.dim === 'distance' ? itemText(item, 'describe') + ' ' : '', item.note ? itemText(item, 'note') : '') : null; })) : null,
                compare && compare.ratio >= 1.02 && compare.decades < 2 ? tiling() : null,
                compare && compare.decades > 0.000001 ? staircase() : null)),

            h('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.71875rem', color: P.dim, cursor: 'pointer' } },
              h('input', { type: 'checkbox', checked: sci, onChange: function (e) { var on = !!e.target.checked; setSci(on); updateSlice(function (cur) { cur.sci = on; }); } }),
              S('sci_toggle', 'Also show sizes in scientific notation (the exponent is the power of ten)')),

            // The scale ladder: the complete non-visual path through the tool.
            h('div', { style: { minHeight: 0, display: 'flex', flexDirection: 'column' } },
              h('button', { type: 'button', onClick: function () { setShowLadder(!showLadder); }, 'aria-expanded': showLadder ? 'true' : 'false', 'aria-controls': 'sx-ladder', style: btn },
                (showLadder ? '▾ ' : '▸ ') + S('ladder_heading', 'Everything, largest first')),
              showLadder ? h('input', { className: 'sx-search', type: 'search', value: search, onChange: function (e) { setSearch(e.target.value); }, 'aria-label': S('atlas_search', 'Find an object'), placeholder: S('atlas_search', 'Find an object'), style: { background: P.bg, color: P.text, borderColor: P.line, marginTop: 8 } }) : null,
              h('ul', { id: 'sx-ladder', hidden: !showLadder, style: { listStyle: 'none', margin: '6px 0 0', padding: 0, maxHeight: 220, overflowY: 'auto', border: '1px solid ' + P.line, borderRadius: 8 } },
                sorted.filter(function (i) { return itemText(i, 'name').toLocaleLowerCase().indexOf(search.toLocaleLowerCase().trim()) !== -1; }).map(function (i) {
                  var on = i.id === focusId;
                  return h('li', { key: i.id },
                    h('button', { type: 'button', onClick: function () { openItem(i); },
                      'aria-current': on ? 'true' : undefined,
                      style: { display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid ' + P.line, background: on ? P.selBg : P.panel, color: on ? P.selFg : P.text, padding: '6px 9px', fontSize: '0.75rem', cursor: 'pointer', font: 'inherit' } },
                      h('span', { style: { fontWeight: on ? 700 : 500 } }, itemText(i, 'name')),
                      h('span', { style: { color: on ? P.selFg : P.dim, float: 'right', fontSize: '0.6875rem' } }, lengthText(i.size))));
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
