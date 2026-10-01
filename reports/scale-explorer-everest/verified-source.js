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
    { id: 'orion-nebula', emoji: '☁️', name: 'The Orion Nebula', size: 2.27e17, dim: 'across', group: 'cosmic',
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
  function isPlanetaryWorld(id) { return id === 'earth' || id === 'moon' || id === 'jupiter'; }
  function isMicrobe(id) { return id === 'ecoli' || id === 'paramecium'; }
  function hasCutaway(id) { return id === 'sun' || id === 'mitochondrion' || isMicrobe(id); }
  function surfacePoint(u, v) {
    var latitude = v * Math.PI, longitude = u * Math.PI * 2;
    return [-.503 * Math.cos(longitude) * Math.sin(latitude), .503 * Math.cos(latitude), .503 * Math.sin(longitude) * Math.sin(latitude)];
  }
  function illuminatedDisc(angle) { return Math.round((1 + Math.cos(angle * Math.PI / 180)) * 50); }

  // JPL J2000 semimajor axes set circular reference radii. The composed
  // longitudes are illustrative; this atlas is not a dated ephemeris.
  var SOLAR_ORBITS = [
    {id:'mercury',au:.38709927,angle:2.6,color:'#aea89c',diameter:.012},
    {id:'venus',au:.72333566,angle:4.45,color:'#edcf94',diameter:.016},
    {id:'earth',au:1.00000261,angle:.38,color:'#7aacd5',diameter:.016},
    {id:'mars',au:1.52371034,angle:2.9,color:'#d29170',diameter:.014},
    {id:'jupiter',au:5.202887,angle:5.65,color:'#d8b28f',diameter:.027},
    {id:'saturn',au:9.53667594,angle:2.65,color:'#dac493',diameter:.025},
    {id:'uranus',au:19.18916464,angle:4.55,color:'#b1dcdf',diameter:.020},
    {id:'neptune',au:30.06992276,angle:.28,color:'#679bce',diameter:.020}
  ];
  var SOLAR_RADIUS_AU = SOLAR_ORBITS[7].au;
  function solarPosition(orbit) { var r=orbit.au/(2*SOLAR_RADIUS_AU);return [Math.cos(orbit.angle)*r,0,Math.sin(orbit.angle)*r]; }
  // The path is an illustration. Normalize its arc length to the catalog's
  // 446 km; a straight chord must not be mistaken for the river distance.
  function canyonCenter(x) { return .035*Math.sin(x*9+.4)+.023*Math.sin(x*20-1)+.010*Math.sin(x*37); }
  function canyonSmooth(a,b,v) { var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t); }
  function canyonNoise(x,z) {
    var ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
    fx=fx*fx*(3-2*fx);fz=fz*fz*(3-2*fz);
    function hash(a,b){var n=Math.imul(a,374761393)+Math.imul(b,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
    return (hash(ix,iz)*(1-fx)+hash(ix+1,iz)*fx)*(1-fz)+(hash(ix,iz+1)*(1-fx)+hash(ix+1,iz+1)*fx)*fz;
  }
  var CANYON_PATH=(function(){var points=[],distances=[],length=0;for(var i=0;i<=512;i++){var x=i/512-.5,z=canyonCenter(x);if(i)length+=Math.hypot(x-points[i-1][0],z-points[i-1][1]);points.push([x,z]);distances.push(length);}return {points:points,distances:distances,length:length,depth:1600/446000*length};})();
  function cameraBlend(milliseconds,retention) { return 1-Math.pow(retention,clamp(milliseconds,0,150)*.06); }
  function canyonRouteKm(value) { return typeof value==='number'&&isFinite(value)?clamp(value,0,446):0; }
  function canyonRoutePoint(km) {
    var distance=canyonRouteKm(km)/446*CANYON_PATH.length,low=0,high=CANYON_PATH.points.length-1;
    while(high-low>1){var mid=(low+high)>>1;if(CANYON_PATH.distances[mid]<distance)low=mid;else high=mid;}
    var a=CANYON_PATH.points[low],b=CANYON_PATH.points[high],t=(distance-CANYON_PATH.distances[low])/(CANYON_PATH.distances[high]-CANYON_PATH.distances[low]);
    return [a[0]+(b[0]-a[0])*t,.00015,a[1]+(b[1]-a[1])*t];
  }
  function canyonRouteView(km) {
    var a=canyonRoutePoint(canyonRouteKm(km)-8),b=canyonRoutePoint(canyonRouteKm(km)+8),dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz)||1;
    return [-dx/length,1.15,-dz/length];
  }
  function canyonHeight(x,z) {
    var side=z-canyonCenter(x),d=Math.abs(side),grain=canyonNoise(x*75,z*75),rough=canyonNoise(x*138,z*138);
    var distance=d*(.70+.60*grain);
    var h=.19*canyonSmooth(.00015,.0032,distance)+.19*canyonSmooth(.004,.008,distance)+.23*canyonSmooth(.010,.016,distance)+.25*canyonSmooth(.020,.026,distance)+.14*canyonSmooth(.030,.038,distance);
    var erosion=0,reach=Math.abs(side);
    for(var i=0;i<6;i++){
      var anchor=-.43+i*.17,course=anchor+reach*.34+Math.sin(reach*65+i*2)*.012;
      var width=.003+reach*.05,channel=Math.exp(-Math.pow((x-course)/width,2));
      var fork=Math.exp(-Math.pow((x-course-(reach-.055)*.45)/(.002+reach*.024),2))*canyonSmooth(.035,.09,reach);
      erosion=Math.max(erosion,(channel+fork*.6)*clamp(1-reach/.20,0,1)*.78);
    }
    h*=1-clamp(erosion,0,.85);
    h+=(grain-.5)*.07*canyonSmooth(.004,.014,d)+(rough-.5)*.05*canyonSmooth(.002,.025,d);
    return Math.max(0,h)*CANYON_PATH.depth;
  }
  function canyonPoint(x,z,relief) { return [x,canyonHeight(x,z)*(relief||8),z]; }
  // Local metres map directly to the 8,849 m catalogue height; no summit fitting.
  function validEverestTerrain(data) {
    return !!data&&data.version===1&&data.width===241&&data.spanMeters===18000&&data.spacingMeters===75&&
      data.center&&data.center.latitude===27.98&&data.center.longitude===86.925&&
      Array.isArray(data.elevations)&&data.elevations.length===58081&&
      data.elevations.every(function(h){return typeof h==='number'&&isFinite(h)&&h>=3500&&h<=9100;});
  }
  function everestHeight(data,x,z) {
    var n=data.width,u=clamp((x*8849/data.spanMeters+.5)*(n-1),0,n-1),
      v=clamp((z*8849/data.spanMeters+.5)*(n-1),0,n-1),col=Math.min(n-2,Math.floor(u)),row=Math.min(n-2,Math.floor(v)),fx=u-col,fy=v-row,a=row*n+col;
    return ((data.elevations[a]*(1-fx)+data.elevations[a+1]*fx)*(1-fy)+(data.elevations[a+n]*(1-fx)+data.elevations[a+n+1]*fx)*fy)/8849;
  }
  function inspectionLimit(id) { return id==='solar-system'?32:id==='grand-canyon'?12:id==='everest'?5:2.5; }
  function atlasDetails(id, S, terrainRelief, riverKm) {
    if(id==='solar-system'){
      var names=[S('atlas_orbit_mercury', 'Mercury'),S('atlas_orbit_venus', 'Venus'),S('atlas_orbit_earth', 'Earth'),S('atlas_orbit_mars', 'Mars'),
        S('atlas_orbit_jupiter', 'Jupiter'),S('atlas_orbit_saturn', 'Saturn'),S('atlas_orbit_uranus', 'Uranus'),S('atlas_orbit_neptune', 'Neptune')];
      return [{id:'inner-orbits',at:[0,0,0],view:[0,1,0],zoom:24,maxZoom:5,label:S('atlas_orbit_inner', 'The inner planets'),
        body:S('atlas_orbit_inner_body', 'Move in toward Mercury, Venus, Earth and Mars. These four rocky worlds occupy a small part of the planetary system. The circular paths keep their distance proportions as the camera moves closer. One astronomical unit (AU) is about the Earth–Sun distance.'),
        source:'https://science.nasa.gov/solar-system/solar-system-facts/'}].concat(SOLAR_ORBITS.map(function(orbit,index){
          return {id:orbit.id+'-orbit',at:solarPosition(orbit),view:[0,1,0],zoom:index<4?32:index<6?9:4,minZoom:index<4?6:0,
            hint:S('atlas_orbit_hint', '{planet} · {au} AU · Select to approach',{planet:names[index],au:orbit.au.toFixed(2)}),au:orbit.au,visit:['earth','jupiter'].indexOf(orbit.id)>=0?orbit.id:null,label:names[index],
            body:S('atlas_orbit_planet_body', '{planet} has a reference orbital radius of about {au} AU. Compare its path with its neighbours, then orbit the scene to see the shared plane. Planet markers are enlarged; circular paths use approximate orbital sizes, with illustrative positions.',{planet:names[index],au:orbit.au.toFixed(2)}),
            source:'https://ssd.jpl.nasa.gov/planets/approx_pos.html'};
        })).concat([{id:'asteroid-belt',at:[-.04,0,-.02],view:[0,1,0],viewAim:[0,0,0],zoom:12,minZoom:3,
          label:S('atlas_orbit_belt', 'The asteroid belt'),body:S('atlas_orbit_belt_body', 'Between Mars and Jupiter, a sparse population of small bodies circles the Sun. The particles here are enlarged representatives. The belt contains far more empty space than this illustrated cloud suggests.'),
          source:'https://science.nasa.gov/solar-system/asteroids/'}]);
    }
    if(id==='milkyway')return [
      {id:'solar-neighbourhood',at:[.216,0,.145],view:[0,1,0],zoom:2.3,label:S('atlas_detail_galaxy_sun', 'Our Sun’s neighbourhood'),body:S('atlas_detail_galaxy_sun_body', 'Our Sun lies about 26,000 light-years from the galactic centre, near the Orion Spur between larger spiral arms. This marker locates our neighbourhood; the Sun and its planets are far too small to resolve at this scale. Visit the Solar System to continue the journey inward.'),source:'https://science.nasa.gov/solar-system/solar-system-facts/'},
      {id:'central-bar',at:[-.06,.025,-.03],view:[0,.7,1],zoom:2,label:S('atlas_detail_galaxy_bar', 'Central bar & bulge'),body:S('atlas_detail_galaxy_bar_body', 'The Milky Way is a barred spiral galaxy. A crowded, elongated central population rises above and below the disc. Warm light distinguishes the illustrated older stars here. The central black hole is much too small to resolve in this view.'),source:'https://www.esa.int/Science_Exploration/Space_Science/Gaia/Guide_to_our_galaxy'},
      {id:'spiral-arms',at:[-.20,.005,-.21],viewAim:[0,0,0],view:[0,1,0],zoom:1.1,label:S('atlas_detail_galaxy_arms', 'Spiral arms from above'),body:S('atlas_detail_galaxy_arms_body', 'Look down on the disc to follow its curved arms. Young stars, gas and dust help trace this structure. The broad stellar arms and finer branches are an interpretation of an evolving map: we observe our own galaxy from inside it, so this is not an exterior photograph.'),source:'https://science.nasa.gov/resource/the-milky-way-galaxy/'},
      {id:'galactic-disc',at:[.33,0,-.05],viewAim:[0,0,0],view:[0,0,1],zoom:1.25,label:S('atlas_detail_galaxy_disc', 'The disc seen edge-on'),body:S('atlas_detail_galaxy_disc_body', 'Seen along its plane, the broad galaxy becomes a thin band with a thicker central bulge. Dust in the disc absorbs light from stars behind it. Orbit gently above or below the plane to see the dark lane open into the spiral pattern.'),source:'https://www.esa.int/ESA_Multimedia/Images/2015/07/Stellar_density_map'}
    ];
    if(id==='orion-nebula')return [
      {id:'trapezium',at:[-.006,.014,.135],reveal:true,zoom:2.4,label:S('atlas_detail_orion_trapezium', 'Trapezium stars'),body:S('atlas_detail_orion_trapezium_body', 'Four bright stars mark the heart of this illustrated cluster. Their ultraviolet light energizes the surrounding gas. Reveal embedded stars reduces the cloud’s opacity so you can explore the stars behind it. The light points are enlarged to remain visible.'),source:'https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-messier-catalog/messier-42/'},
      {id:'stellar-cavity',at:[.11,.11,-.03],reveal:false,label:S('atlas_detail_orion_cavity', 'Sculpted stellar cavity'),body:S('atlas_detail_orion_cavity_body', 'Orbit around the hollow in the cloud. Radiation and winds from the central stars have carved a bowl-like cavity into the molecular cloud. This volume is an interpretation of that structure; its depth and orientation are illustrative.'),source:'https://www.jpl.nasa.gov/news/nasa-space-telescopes-provide-a-3-d-journey-through-the-orion-nebula/'},
      {id:'ionization-front',at:[.19,-.115,.035],reveal:false,label:S('atlas_detail_orion_front', 'Glowing cloud front'),body:S('atlas_detail_orion_front_body', 'Follow the luminous boundary where the stars’ radiation meets denser material. Ultraviolet light strips electrons from atoms, and the gas emits light. The warm and cool colors help distinguish regions of this illustrated nebula.'),source:'https://science.nasa.gov/mission/hubble/science/universe-uncovered/hubble-nebulae/'},
      {id:'dust-ridge',at:[-.13,.145,.115],reveal:false,label:S('atlas_detail_orion_dust', 'Dark dust ridge'),body:S('atlas_detail_orion_dust_body', 'Dark material blocks some of the light behind it. Turn the cloud, then reveal embedded stars to see how the view changes when the dust becomes transparent. This is a visibility aid, rather than a telescope wavelength or a live observation.'),source:'https://science.nasa.gov/asset/hubble/close-up-images-of-the-orion-nebula/'}
    ];
    if(id==='sun')return [
      {id:'core',at:[.06,.02,.008],cutaway:true,label:S('atlas_detail_solar_core', 'Fusion core'),body:S('atlas_detail_solar_core_body', 'Begin where the Sun produces its energy. Nuclear fusion turns hydrogen into helium in the core. The cutaway places its outer boundary at about a quarter of the solar radius. Orbit to see both exposed faces of the interior.'),source:'https://solarscience.msfc.nasa.gov/interior.shtml'},
      {id:'radiative-zone',at:[.235,.055,.008],cutaway:true,label:S('atlas_detail_solar_radiative', 'Radiative zone'),body:S('atlas_detail_solar_radiative_body', 'Energy moves through this dense region by radiation, with repeated absorption and emission. The zone extends from roughly 25% to 70% of the solar radius. The luminous texture distinguishes it from the circulating plasma farther out.'),source:'https://solarscience.msfc.nasa.gov/interior.shtml'},
      {id:'convection-zone',at:[.36,-.19,.008],cutaway:true,label:S('atlas_detail_solar_convection', 'Convection zone'),body:S('atlas_detail_solar_convection_body', 'Hot plasma rises, cools near the surface, and sinks again. Trace the circulating paths in the outer interior. These enlarged loops explain the movement; they do not show individual flows measured inside the Sun.'),source:'https://science.nasa.gov/blogs/the-sun-spot/2023/09/26/layers-of-the-sun/'},
      {id:'photosphere',at:[-.14,-.20,.43635],cutaway:false,label:S('atlas_detail_solar_surface', 'Granulated photosphere'),body:S('atlas_detail_solar_surface_body', 'This visible layer has no solid ground. Hot, rising plasma forms bright granules bordered by cooler, darker lanes. The model enlarges that fine texture so it can be explored at the scale of the whole star.'),source:'https://apod.nasa.gov/apod/ap100416.html'},
      {id:'sunspots',at:[-.24,.12,.42190],cutaway:false,label:S('atlas_detail_solar_spots', 'Sunspots'),body:S('atlas_detail_solar_spots_body', 'Explore the dark center and lighter surround of this illustrated sunspot group. Strong magnetic fields restrict convection, making these regions cooler and darker than nearby plasma. These are example features, not a map of today’s Sun.'),source:'https://science.nasa.gov/sun/sunspots/'},
      {id:'prominence',at:[-.547,.236,.174],cutaway:false,label:S('atlas_detail_solar_prominence', 'Prominence & corona'),body:S('atlas_detail_solar_prominence_body', 'Follow the arch of plasma suspended above the photosphere by magnetic fields. The faint glow beyond the limb represents the corona, the Sun’s extended outer atmosphere. Filaments, colors and their slow motion are an illustration.'),source:'https://science.nasa.gov/sun/facts/'}
    ];
    if(id==='ecoli')return [
      {id:'cell-envelope',at:[-.24,.13,.08],cutaway:false,label:S('atlas_detail_bacterial_envelope', 'Cell envelope & pili'),body:S('atlas_detail_bacterial_envelope_body', 'The rounded rod is the bacterial cell body. Its envelope surrounds the cytoplasm. Compare the short surface pili with the much longer flagella. The size reference measures the body, excluding its appendages.'),source:'https://www.ncbi.nlm.nih.gov/books/NBK8477/'},
      {id:'flagella',at:[.57,.03,.09],label:S('atlas_detail_flagella', 'Rotating flagella'),body:S('atlas_detail_flagella_body', 'Long helical filaments extend from motors in the cell envelope. Their rotation can propel the bacterium through liquid. This illustration slows the motion and shows only a few filaments; their number varies between cells.'),source:'https://www.ncbi.nlm.nih.gov/books/NBK8477/'},
      {id:'nucleoid',at:[-.05,.025,.035],cutaway:true,label:S('atlas_detail_nucleoid', 'Folded chromosome'),body:S('atlas_detail_nucleoid_body', 'The gold strand represents folded DNA in the nucleoid. E. coli has no membrane-bound nucleus. The strand is a schematic view of the chromosome, enlarged so you can follow its path through the cell.'),source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC6907758/'},
      {id:'ribosomes',at:[.21,-.065,.075],cutaway:true,label:S('atlas_detail_ribosomes', 'Ribosomes in the cytoplasm'),body:S('atlas_detail_ribosomes_body', 'The small pale particles represent ribosomes, which assemble proteins. Only a sample is shown. Compare these dispersed structures with the larger, folded chromosome in the same cell.'),source:'https://www.ncbi.nlm.nih.gov/books/NBK9849/'}
    ];
    if(id==='paramecium')return [
      {id:'cilia',at:[-.23,.18,.055],cutaway:false,label:S('atlas_detail_cilia', 'Waves of cilia'),body:S('atlas_detail_cilia_body', 'Rows of short cilia cover the cell. Their coordinated beating helps move it through water. Pause ambience to inspect a still view; the illustrated beat is slowed and the number of cilia is reduced for clarity.'),source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8535419/'},
      {id:'oral-groove',at:[-.035,-.105,.11],cutaway:false,label:S('atlas_detail_oral', 'Oral groove'),body:S('atlas_detail_oral_body', 'Follow the long depression along the surface. Cilia guide food particles toward the oral apparatus, where food vacuoles form. Turn the cell to see how the groove is set into its curved surface.'),source:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8208649/'},
      {id:'nuclei',at:[-.07,.035,.025],cutaway:true,label:S('atlas_detail_nuclei', 'Two kinds of nucleus'),body:S('atlas_detail_nuclei_body', 'The large macronucleus supports everyday cell functions. A smaller micronucleus nearby has a role in sexual reproduction. Their colors distinguish them in this anatomical illustration.'),source:'https://www.ncbi.nlm.nih.gov/mesh/68048631'},
      {id:'contractile-vacuole',at:[.29,.015,.025],cutaway:true,label:S('atlas_detail_vacuole', 'Contractile vacuoles'),body:S('atlas_detail_vacuole_body', 'The star-shaped complexes collect and expel excess water. Watch a central reservoir fill and contract, then pause to inspect its radiating canals. The cycle is illustrative; its rate depends on the cell and its surroundings.'),source:'https://pubmed.ncbi.nlm.nih.gov/9427677/'}
    ];
    if(id==='everest')return [
      {id:'everest-summit',terrain:true,at:[0,0,-.1019],view:[-.55,.55,1],zoom:3.2,label:S('atlas_detail_everest_summit', 'The summit ridge'),body:S('atlas_detail_everest_summit_body', 'Approach the crest of Everest. The 75 m elevation grid preserves the surrounding ridges, but smooths features smaller than a grid cell. Its highest sample is about 8,744 m; the catalogue height of 8,849 m comes from the summit measurement, not this sampled mesh.'),source:'https://registry.opendata.aws/terrain-tiles/'},
      {id:'everest-east',terrain:true,at:[1600/8849,0,-750/8849],view:[1,.6,.15],zoom:3.2,label:S('atlas_detail_everest_east', 'The eastern face'),body:S('atlas_detail_everest_east_body', 'Orbit beside the eastern slopes to see how ridges divide the steep mountain faces. Horizontal and vertical distances use the same scale. Snow and rock colors illustrate the landforms; they do not map today’s snow cover.'),source:'https://science.nasa.gov/earth/earth-observatory/exploring-mount-everests-ice-81823/'},
      {id:'everest-valley',terrain:true,at:[-2400/8849,0,3600/8849],view:[-.35,.6,1],zoom:2.7,label:S('atlas_detail_everest_valley', 'Valleys below the summit'),body:S('atlas_detail_everest_valley_body', 'Look across the valleys south of Everest, then turn toward the high ridges. Glaciers shape and occupy this landscape. The elevation data describes the terrain surface; the pale coloring is an illustration, not a glacier boundary map.'),source:'https://science.nasa.gov/earth/earth-observatory/exploring-mount-everests-ice-81823/'},
      {id:'everest-overview',terrain:true,marker:false,at:[0,0,0],view:[0,1,.15],zoom:1,label:S('atlas_detail_everest_overview', 'An atlas from above'),body:S('atlas_detail_everest_overview_body', 'An 18 km square of the Himalaya, with north toward the far edge in this view. The local grid uses one sample every 75 m. Follow the ridges and branching valleys; the straight edges are the boundary of the displayed dataset.'),source:'https://registry.opendata.aws/terrain-tiles/'},
      {id:'everest-datum',terrain:true,datum:true,marker:false,at:[0,1,-.1019],viewAim:[0,.48,0],view:[.3,.32,1],zoom:1,label:S('atlas_detail_everest_datum', 'Height above sea level'),body:S('atlas_detail_everest_datum_body', 'The lower grid marks the zero-height reference, extended beneath the mountain. The ruler reaches 8,849 m above that reference. The valleys are already thousands of metres above sea level, so the visible summit-to-valley relief is much smaller than Everest’s stated height. The lower grid is a reference plane, not an ocean beneath the terrain.'),source:'https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1'}
    ];
    if(id==='grand-canyon')return [
      {id:'canyon-rim',at:canyonPoint(-.06,canyonCenter(-.06)+.042,terrainRelief),view:[.2,1,.65],zoom:3.5,label:S('atlas_detail_canyon_rim', 'Layered canyon walls'),body:S('atlas_detail_canyon_rim_body', 'Approach the rim and follow the bands across the cliffs. Different rock layers resist erosion differently, producing cliffs and slopes. The colors and terrace shapes are illustrative. Adjust vertical relief to compare this readable view with the much flatter proportions at the scale of the whole canyon.'),source:'https://www.nps.gov/grca/learn/nature/grca-geology.htm'},
      {id:'river-bend',at:canyonPoint(.08,canyonCenter(.08),terrainRelief),view:[0,1,0],zoom:6,label:S('atlas_detail_canyon_river', 'Colorado River corridor'),body:S('atlas_detail_canyon_river_body', 'Follow the river through the inner gorge. The canyon’s 446 km length is measured along the river, so the dashed measurement follows this model’s winding course. The route is an illustration rather than a geographic map.'),source:'https://www.nps.gov/grca/faqs.htm'},
      {id:'side-canyons',at:canyonPoint(.115,canyonCenter(.115)+.065,terrainRelief),view:[.15,1,.6],zoom:4,label:S('atlas_detail_canyon_tributaries', 'Branching side canyons'),body:S('atlas_detail_canyon_tributaries_body', 'Explore the smaller gullies joining the main gorge. Water flowing through tributaries erodes the surrounding slopes and helps widen the canyon. Look from above to see how the drainage network branches.'),source:'https://www.nps.gov/grca/learn/nature/grca-geology.htm'},
      {id:'river-journey',marker:false,at:canyonRoutePoint(riverKm),view:canyonRouteView(riverKm),zoom:8,label:S('atlas_river_journey', 'River journey'),body:S('atlas_river_journey_body', 'Move along the illustrated river, bend by bend. Distance follows the winding course from 0 to 446 km. The route map shows your position; the pale ring in the scene is a location marker. These positions describe the illustrated model, not real navigation coordinates.'),source:'https://www.nps.gov/grca/learn/nature/grca-geology.htm'},
      {id:'canyon-overview',marker:false,at:[0,0,0],viewAim:[0,.02,0],view:[0,1,0],zoom:1.05,label:S('atlas_detail_canyon_overview', 'The winding landscape'),body:S('atlas_detail_canyon_overview_body', 'Look down on the whole terrain. Its river path represents the full canyon length. The reference relief uses about 1.6 km of depth; the relief control changes only vertical dimensions. Terrain shape, vegetation colors and rock bands are an interpretation.'),source:'https://www.nps.gov/grca/learn/management/statistics.htm'}
    ];
    if(id==='earth')return [
      {id:'himalaya',surface:true,at:surfacePoint(.741458,.34451),visit:'everest',label:S('atlas_detail_earth_himalaya', 'Everest & the Himalaya'),body:S('atlas_detail_earth_himalaya_body', 'Find the high mountain region north of the Indian subcontinent. Continue inward to explore an elevation model around Everest, from its valleys to the summit ridge.'),source:'https://science.nasa.gov/earth/earth-observatory/exploring-mount-everests-ice-81823/'},
      {id:'arizona-canyon',surface:true,at:surfacePoint(.1886,.2994),visit:'grand-canyon',label:S('atlas_detail_earth_canyon', 'Grand Canyon, Arizona'),body:S('atlas_detail_earth_canyon_body', 'This marker locates the canyon region in northern Arizona. At the scale of the globe, the gorge is too small to show its cliffs. Continue inward to explore the canyon landscape and its changing proportions.'),source:'https://www.nps.gov/grca/index.htm'},
      {id:'pacific',surface:true,at:surfacePoint(.13,.52),label:S('atlas_detail_pacific', 'Pacific Ocean'),body:S('atlas_detail_pacific_body', 'Explore the broad blue expanse between the continents. Ocean covers about 71% of Earth. Change the sunlight angle to trace the boundary between day and night across the water.'),source:'https://science.nasa.gov/earth/facts/'},
      {id:'sahara',surface:true,at:surfacePoint(.545,.36),label:S('atlas_detail_sahara', 'Sahara & continents'),body:S('atlas_detail_sahara_body', 'The pale Sahara contrasts with greener land to its south and the surrounding ocean. This satellite mosaic lets you inspect surface patterns at a planetary scale.'),source:'https://svs.gsfc.nasa.gov/2915/'},
      {id:'greenland',surface:true,at:surfacePoint(.39,.105),label:S('atlas_detail_greenland', 'Greenland ice sheet'),body:S('atlas_detail_greenland_body', 'The bright ice sheet covers much of Greenland. Follow its edge toward the darker coastal terrain. The mosaic is a reference image; it does not show current weather or sea-ice conditions.'),source:'https://science.nasa.gov/resource/land-ice-greenland/'}
    ];
    if(id==='moon')return [
      {id:'tycho',surface:true,at:surfacePoint(.4684,.7406),label:S('atlas_detail_tycho', 'Tycho crater'),body:S('atlas_detail_tycho_body', 'Look for the bright rays extending from this impact crater in the southern highlands. Compare full and side lighting to see how surface color and relief contribute to its appearance.'),source:'https://science.nasa.gov/photojournal/the-floor-of-tycho/'},
      {id:'maria',surface:true,at:surfacePoint(.40,.40),label:S('atlas_detail_maria', 'Dark lunar plains'),body:S('atlas_detail_maria_body', 'These dark plains are called maria. Ancient lava filled large basins and hardened into basalt. Their smooth, darker appearance contrasts with the brighter cratered highlands.'),source:'https://science.nasa.gov/moon/facts/'},
      {id:'highlands',surface:true,at:surfacePoint(.61,.53),label:S('atlas_detail_highlands', 'Cratered highlands'),body:S('atlas_detail_highlands_body', 'Explore the densely cratered terrain. Move the light toward a half-lit view to bring out changes in the surface. The relief is enhanced so it remains visible on a screen.'),source:'https://svs.gsfc.nasa.gov/4720/'}
    ];
    if(id==='jupiter')return [
      {id:'red-spot',surface:true,at:surfacePoint(.648,.625),label:S('atlas_detail_red_spot', 'Great Red Spot'),body:S('atlas_detail_red_spot_body', 'This oval is a vast storm in Jupiter’s atmosphere. Inspect the surrounding swirls in the Hubble mosaic. The image records a particular observation; the storm and clouds continue to change.'),source:'https://science.nasa.gov/jupiter/jupiter-facts/'},
      {id:'belts',surface:true,at:surfacePoint(.40,.422),label:S('atlas_detail_belts', 'Belts & zones'),body:S('atlas_detail_belts_body', 'The stripes are atmospheric cloud bands. Darker belts alternate with brighter zones as winds flow around the planet. Jupiter is a gas giant, so this image shows cloud tops rather than solid ground.'),source:'https://science.nasa.gov/jupiter/jupiter-facts/'}
    ];
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
        zoom: typeof entry.zoom === 'number' && isFinite(entry.zoom) ? clamp(entry.zoom, 1, inspectionLimit(target.item.id)) : 1,
        yaw: typeof entry.yaw === 'number' && isFinite(entry.yaw) ? Math.atan2(Math.sin(entry.yaw), Math.cos(entry.yaw)) : 0,
        pitch: typeof entry.pitch === 'number' && isFinite(entry.pitch) ? clamp(entry.pitch, -1.1, 1.1) : .12,
        sunAngle: typeof entry.sunAngle === 'number' && isFinite(entry.sunAngle) ? clamp(entry.sunAngle, 0, 180) : 45,
        nebulaReveal: entry.nebulaReveal === true,
        riverKm: canyonRouteKm(entry.riverKm),
        terrainRelief: typeof entry.terrainRelief === 'number' && isFinite(entry.terrainRelief) ? clamp(entry.terrainRelief,1,20) : 8,
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

  function validScalingFactor(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
    var number = Number(value);
    return isFinite(number) && number >= .01 && number <= 1e45 ? number : null;
  }
  function geometricScale(value) {
    var factor = validScalingFactor(value);
    return factor === null ? null : { factor: factor, edge: factor, faceArea: factor * factor,
      surfaceArea: 6 * factor * factor, volume: factor * factor * factor, relativeSurfaceVolume: 1 / factor };
  }
  function scalingDiagramMeasures(value) {
    var factor = validScalingFactor(value);
    if (factor === null) return null;
    var original = 68 / Math.max(1, factor), copy = original * factor;
    var ratio = Math.max(factor, 1 / factor), integer = Math.round(ratio);
    var divisions = integer >= 2 && integer <= 8 && Math.abs(ratio - integer) < 1e-10 ? integer : 1;
    return { original: original, copy: copy, originalDivisions: factor < 1 ? divisions : 1, copyDivisions: factor > 1 ? divisions : 1 };
  }
  function scalingValue(value) {
    if (value >= 1e6 || value < .001) {
      var exponent = Math.floor(log10(value)), coefficient = Number((value / Math.pow(10, exponent)).toPrecision(3));
      if (coefficient >= 10) { coefficient /= 10; exponent++; }
      return coefficient + ' × 10' + sup(exponent);
    }
    return String(Number(value.toPrecision(3)));
  }
  function readScaling(raw, completed) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return completed ? null : { factor: '2', reflection: '', reference: null };
    var factor = typeof raw.factor === 'string' ? raw.factor.slice(0, 70) : typeof raw.factor === 'number' ? String(raw.factor) : '2';
    var model = geometricScale(factor);
    if (completed && (!model || validScalingFactor(raw.factor) === null)) return null;
    var reference = raw.reference && compareMeasurements(inquiryMeasurement(raw.reference.small), inquiryMeasurement(raw.reference.big));
    if (reference && (!model || reference.small.id === reference.big.id || reference.small.dim === 'distance' || reference.big.dim === 'distance' || Math.abs(log10(reference.ratio / model.factor)) > 1e-12)) reference = null;
    return { factor: model ? String(model.factor) : factor,
      reflection: typeof raw.reflection === 'string' ? raw.reflection.slice(0, NOTE_LIMIT) : '',
      reference: reference ? { small: inquirySnapshot(reference.small), big: inquirySnapshot(reference.big) } : null };
  }

  var DRAWING_UNITS = { mm: 1, cm: 10, m: 1000, in: 25.4 }, DRAWING_WIDTH = 180;
  function validDrawingSize(value, unit) {
    if (typeof unit !== 'string' || !Object.prototype.hasOwnProperty.call(DRAWING_UNITS, unit) || (typeof value !== 'number' && typeof value !== 'string')) return null;
    if (typeof value === 'string' && !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
    var mm = Number(value) * DRAWING_UNITS[unit];
    return isFinite(mm) && mm >= 1e-6 && mm <= 1e6 ? mm : null;
  }
  function drawingModel(reference, target, value, unit) {
    var mm = validDrawingSize(value, unit);
    if (mm === null || !reference || !target || typeof reference.size !== 'number' || typeof target.size !== 'number' || !(reference.size > 0) || !(target.size > 0) || !isFinite(reference.size) || !isFinite(target.size)) return null;
    var ratio = target.size / reference.size, targetMM = mm * ratio, scale = mm / 1000 / reference.size;
    if (!(targetMM > 0) || !isFinite(targetMM) || !(scale > 0) || !isFinite(scale)) return null;
    return { reference: reference, target: target, referenceMM: mm, targetMM: targetMM, scale: scale, ratio: ratio };
  }
  function drawingSpan(mm) { return { length: Math.min(DRAWING_WIDTH, mm), offPage: mm > DRAWING_WIDTH, unresolved: mm < .5 }; }
  function readDrawing(raw, completed) {
    var valid = raw && typeof raw === 'object' && !Array.isArray(raw);
    var reference = valid ? inquiryMeasurement(raw.reference) : null, target = valid ? inquiryMeasurement(raw.target) : null;
    if (completed && (!reference || !target || validDrawingSize(raw.size, raw.unit) === null)) return null;
    var size = valid && (typeof raw.size === 'number' || typeof raw.size === 'string') ? String(raw.size).slice(0, 70) : '10';
    var unit = valid && typeof raw.unit === 'string' && Object.prototype.hasOwnProperty.call(DRAWING_UNITS, raw.unit) ? raw.unit : 'cm';
    return { reference: inquirySnapshot(reference || inquiryMeasurement({ id: 'earth' })), target: inquirySnapshot(target || inquiryMeasurement({ id: 'moon' })),
      size: size, unit: unit, note: valid && typeof raw.note === 'string' ? raw.note.slice(0, NOTE_LIMIT) : '' };
  }
  function drawingXml(text) {
    return String(text || '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\uFFFE\uFFFF]/g, '').replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c]; });
  }
  // A physical 210 mm sheet. All dimension coordinates are millimetres;
  // clipping marks the page edge without changing the chosen model scale.
  function drawingSvg(model, labels) {
    if (!model) return '';
    var description = [labels.description, labels.scale, labels.names[0] + ': ' + labels.real[0] + ' → ' + labels.mapped[0], labels.names[1] + ': ' + labels.real[1] + ' → ' + labels.mapped[1], labels.calibration, labels.print, labels.scope].join(' ');
    var lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="145mm" viewBox="0 0 210 145" role="img" aria-labelledby="drawing-title" aria-describedby="drawing-description">',
      '<title id="drawing-title">' + drawingXml(labels.title) + '</title><desc id="drawing-description">' + drawingXml(description) + '</desc>',
      '<rect width="210" height="145" fill="white"/><g font-family="sans-serif" fill="#172033">'];
    function text(x, y, value, size) { lines.push('<text x="' + x + '" y="' + y + '" font-size="' + size + '">' + drawingXml(value) + '</text>'); }
    function wrapped(value, y, size, max) {
      var remaining = String(value), row = 0;
      while (remaining && row < 5) { var cut = remaining.length <= max ? remaining.length : remaining.lastIndexOf(' ', max); if (cut < max / 2) cut = Math.min(max, remaining.length); text(15, y + row * 4, remaining.slice(0, cut), size); remaining = remaining.slice(cut).trim(); row++; }
    }
    text(15, 12, labels.title, 5); wrapped(labels.scale, 21, 3.2, 95);
    [model.referenceMM, model.targetMM].forEach(function (mm, index) {
      var item = index === 0 ? model.reference : model.target, span = drawingSpan(mm), y = index === 0 ? 50 : 84, end = 15 + span.length;
      wrapped((index + 1) + '. ' + labels.names[index] + ' · ' + labels.real[index], y - 14, 3.5, 82);
      lines.push('<g stroke="' + (index === 0 ? '#146675' : '#92541b') + '" stroke-width=".55" fill="none">',
        '<line data-drawing-measure="' + index + '" data-model-mm="' + mm + '" transform="translate(15 0)" x1="0" y1="' + y + '" x2="' + span.length + '" y2="' + y + '"' + (item.dim === 'distance' ? ' stroke-dasharray="2 2"' : '') + '/>',
        '<path d="M15 ' + (y - 2) + 'v4' + (span.offPage ? '' : 'M' + end + ' ' + (y - 2) + 'v4') + '"/>');
      if (span.offPage) lines.push('<path data-drawing-off-page="' + index + '" d="M192 ' + (y - 2) + 'l4 2-4 2"/>');
      if (span.unresolved) lines.push('<path data-drawing-locator="' + index + '" stroke-dasharray=".5 .5" d="M13 ' + y + 'h4m-2 -2v4"/>');
      lines.push('</g>'); wrapped(labels.mapped[index] + (span.offPage ? ' · ' + labels.offPage : ''), y + 7, 3.5, 88);
    });
    lines.push('<path data-drawing-calibration="10" d="M15 103v4m0-2h10m0-2v4" fill="none" stroke="#172033" stroke-width=".4"/>');
    text(30, 106, labels.calibration, 3.5); wrapped(labels.print, 116, 3.2, 94); wrapped(labels.scope, 129, 3, 98);
    lines.push('</g></svg>'); return lines.join('\n');
  }

  var INQUIRY_LIMIT = 12, ESTIMATE_MAX = 45;
  var INQUIRY_THEMES = [
    { id: 'home', small: 'human', big: 'earth', title: 'From human scale to Earth',
      reflect: 'Which familiar size helped you judge the gap? What changed when you followed the scale bridge?' },
    { id: 'cells', small: 'dna', big: 'rbc', title: 'DNA and a blood cell',
      reflect: 'Both measurements are widths. What does their ratio tell you, and what would you still need to know about their shapes?' },
    { id: 'worlds', small: 'moon', big: 'earth', title: 'Earth and Moon',
      reflect: 'How did a fraction of a power of ten change your prediction? Describe what you noticed in the shared-scale view.' },
    { id: 'stars', small: 'earth', big: 'sun', title: 'Earth and Sun',
      reflect: 'How many tenfold steps did you need? Why does this length ratio leave the volume comparison unanswered?' },
    { id: 'matter', small: 'nucleus', big: 'carbon', title: 'Inside an atom',
      reflect: 'What can you learn from the scale gap, and what do the illustrative colors and shapes leave uncertain?' },
    { id: 'distance', small: 'sun', big: 'alpha-cen-dist', title: 'A star and the gap to another',
      reflect: 'One reference is a diameter and one is a distance. How would you explain that difference in a drawing?' }
  ];
  function validEstimate(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim())) return null;
    var number = Number(value);
    return isFinite(number) && number >= 0 && number <= ESTIMATE_MAX ? number : null;
  }
  function inquiryMeasurement(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var item = ITEMS.filter(function (it) { return it.id === raw.id; })[0];
    if (!item) return null;
    var personal = item.id === 'human' && raw.you === true && typeof raw.size === 'number' && !!validHeightCm(raw.size * 100);
    return Object.assign({}, item, { size: personal ? raw.size : item.size, you: personal });
  }
  function inquirySnapshot(item) { return { id: item.id, size: item.size, you: !!item.you }; }
  function readInquiry(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    var small = inquiryMeasurement(raw.small), big = inquiryMeasurement(raw.big), pair = compareMeasurements(small, big);
    if (!pair || small.id === big.id) return null;
    var theme = INQUIRY_THEMES.filter(function (it) { return it.id === raw.theme && it.small === pair.small.id && it.big === pair.big.id; })[0];
    var guess = validEstimate(raw.guess);
    return { id: typeof raw.id === 'string' && raw.id.length <= 64 && /^inquiry-[a-z0-9]+-[a-z0-9]+$/i.test(raw.id) ? raw.id : '',
      theme: theme ? theme.id : 'mixed', small: inquirySnapshot(pair.small), big: inquirySnapshot(pair.big),
      guess: guess === null ? '' : String(guess), revealed: raw.revealed === true && guess !== null,
      reflection: typeof raw.reflection === 'string' ? raw.reflection.slice(0, NOTE_LIMIT) : '' };
  }
  function readInvestigations(raw) {
    var result = [], seen = new Set();
    if (!Array.isArray(raw)) return result;
    raw.slice(0, 200).forEach(function (entry) {
      if (result.length >= INQUIRY_LIMIT) return;
      var record = readInquiry(entry);
      if (!record || !record.id || !record.revealed || seen.has(record.id)) return;
      seen.add(record.id); result.push(record);
    });
    return result;
  }
  function predictionDifference(prediction, actualDecades) {
    var guess = validEstimate(prediction);
    if (guess === null || typeof actualDecades !== 'number' || !isFinite(actualDecades) || actualDecades < 0 || actualDecades > ESTIMATE_MAX) return null;
    var delta = guess - actualDecades;
    return { delta: delta, off: Math.abs(delta), factor: Math.pow(10, Math.abs(delta)), direction: delta < 0 ? 'under' : delta > 0 ? 'over' : 'equal' };
  }
  function freshInquiry(theme, small, big) {
    var pair = compareMeasurements(small, big);
    return { id: 'inquiry-' + Date.now().toString(36) + '-' + (Math.random().toString(36).slice(2, 9) || '0'), theme: theme,
      small: inquirySnapshot(pair.small), big: inquirySnapshot(pair.big), guess: '', revealed: false, reflection: '' };
  }

  function createScaleAtlas(T, canvas, read, pick, fail, inspect, markers, comparisonLabels, onImagery, hoverCard, flightLabels) {
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
    scene.add(key.target);
    key.name = 'atlasSunlight';
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
    var fingers = new Map(), pinch = null, cameraZoom = 1, zoomGoal = 1, lastZoomInput = 1, orbitGoal = null;
    var cameraAim=new T.Vector3(0,.2,0),aimGoal=new T.Vector3(0,.2,0),cameraSettling=false,lastCameraFrame=0;
    var markerPoint=new T.Vector3(),previousDetail='',focusRing,riverTravelKm=0;
    var sunDirection=new T.Vector3(),lightView=new T.Vector3(),lightSide=new T.Vector3(),globeCenter=new T.Vector3(),lastImagery='';
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
    function earthAtmosphere(g) {
      var mat=track(new T.ShaderMaterial({uniforms:{sunDirection:{value:new T.Vector3(-.4,.6,.5).normalize()}},transparent:true,depthWrite:false,blending:T.AdditiveBlending,
        vertexShader:'varying vec3 worldNormal;varying vec3 viewNormal;varying vec3 viewDir;void main(){vec4 p=modelViewMatrix*vec4(position,1.);worldNormal=normalize(mat3(modelMatrix)*normal);viewNormal=normalize(normalMatrix*normal);viewDir=-p.xyz;gl_Position=projectionMatrix*p;}',
        fragmentShader:'uniform vec3 sunDirection;varying vec3 worldNormal;varying vec3 viewNormal;varying vec3 viewDir;void main(){float edge=pow(1.-abs(dot(normalize(viewNormal),normalize(viewDir))),3.);float daylight=smoothstep(-.16,.35,dot(normalize(worldNormal),sunDirection));gl_FragColor=vec4(vec3(.08,.34,1.),edge*daylight*.75);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'}));
      var atmosphere=ball(g,mat,0,0,0,1.025);atmosphere.userData.unmeasured=true;g.userData.atmosphereMaterial=mat;
    }
    function studioLight() { key.color.set(0xfff2dc);key.shadow.normalBias=.012;key.position.set(-3.8,5.5,5);key.target.position.set(0,0,0);sunDirection.copy(key.position).normalize(); }
    function lightAtmospheres(visible) { visible.forEach(function(root){var mat=root.userData.model.userData.atmosphereMaterial;if(mat)mat.uniforms.sunDirection.value.copy(sunDirection);}); }
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
    // Body length is exactly one local unit. Appendages and illustrative
    // organelles must never change the measured dimensions of these cells.
    function microbePoint(id,x,angle) {
      var r=id==='ecoli'?Math.sqrt(Math.max(0,.16*.16-Math.pow(Math.max(0,Math.abs(x)-.34),2))):.19*Math.sqrt(Math.max(0,1-4*x*x))*(1-.28*x);
      if(id==='paramecium')r-=.048*Math.exp(-Math.pow((x+.025)/.19,2)-Math.pow((angle-2.13)/.3,2));
      r=Math.max(0,r);
      return [x,r*Math.cos(angle),r*Math.sin(angle)*(id==='paramecium'?.78:1)];
    }
    function microbeSkin(id,front) {
      var positions=[],uv=[],indices=[],steps=64,sides=32;
      for(var i=0;i<=steps;i++)for(var j=0;j<=sides;j++){
        var x=i/steps-.5,angle=j/sides*Math.PI+(front?0:Math.PI),p=microbePoint(id,x,angle);
        positions.push(p[0],p[1],p[2]);uv.push(i/steps,angle/(Math.PI*2));
        if(i<steps&&j<sides){var q=i*(sides+1)+j;indices.push(q,q+1,q+sides+1,q+1,q+sides+2,q+sides+1);}
      }
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
    }
    function ciliaryCoat(g,id) {
      var positions=[],bends=[],phases=[],surfaceZ=[],rows=id==='paramecium'?24:12,columns=id==='paramecium'?36:14,segments=id==='paramecium'?5:2;
      for(var row=0;row<rows;row++)for(var col=0;col<columns;col++){
        var angle=row/rows*Math.PI*2,x=-.475+(col+.35*(row%2))/(columns-1)*.95,p=microbePoint(id,clamp(x,-.49,.49),angle),len=id==='paramecium'?.048:.036;
        for(var s=0;s<segments;s++)for(var end=0;end<2;end++){
          var t=(s+end)/segments,bend=t*t;
          positions.push(p[0]+.014*bend,p[1]+Math.cos(angle)*len*t,p[2]+Math.sin(angle)*len*t);
          bends.push(id==='paramecium'?.018*bend:0,Math.sin(angle)*.004*bend,-Math.cos(angle)*.004*bend);phases.push(x*26+row*.7);surfaceZ.push(p[2]);
        }
      }
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('aBend',new T.Float32BufferAttribute(bends,3));geo.setAttribute('aPhase',new T.Float32BufferAttribute(phases,1));geo.setAttribute('aSurfaceZ',new T.Float32BufferAttribute(surfaceZ,1));
      var mat=track(new T.ShaderMaterial({uniforms:{uTime:{value:0},uOpen:{value:1},uOpacity:{value:.62},tint:{value:new T.Color(id==='paramecium'?'#afd6b9':'#b7d6cf').convertSRGBToLinear()}},transparent:true,depthWrite:false,
        vertexShader:'attribute vec3 aBend;attribute float aPhase;attribute float aSurfaceZ;uniform float uTime;varying float surfaceZ;void main(){surfaceZ=aSurfaceZ;vec3 p=position+aBend*sin(uTime*3.+aPhase);gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',
        fragmentShader:'uniform vec3 tint;uniform float uOpen;uniform float uOpacity;varying float surfaceZ;void main(){if(uOpen>.5&&surfaceZ>.012)discard;gl_FragColor=vec4(tint,uOpacity);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'}));
      var coat=new T.LineSegments(geo,mat);coat.frustumCulled=false;g.add(coat);g.userData.coatMaterial=mat;if(id==='paramecium')g.userData.ciliaMaterial=mat;
    }
    function microbeModel(g,id) {
      var body=material(id==='ecoli'?'#67998b':'#819e86',{roughness:.52,bumpMap:grainTexture,bumpScale:.002,side:T.DoubleSide});
      mesh(g,microbeSkin(id,false),body);
      var cover=new T.Group();g.add(cover);mesh(cover,microbeSkin(id,true),body);g.userData.outerMembrane=cover;
      var inside=new T.Group();g.add(inside);g.userData.innerStructures=inside;
      var lip=material('#bed4a7',{roughness:.48});
      [0,Math.PI].forEach(function(angle){var points=[];for(var i=0;i<=48;i++)points.push(microbePoint(id,i/48-.5,angle));tube(inside,points,.004,lip);});
      ciliaryCoat(g,id);
      var rng=random(id==='ecoli'?205:307),beadMat=material('#b3b598',{roughness:.6});
      // Batch particles into one mesh with real bounds. Three r128's generic
      // Box3 path does not include per-instance transforms when fitting a model.
      var beadGeo=track(new T.IcosahedronGeometry(.5,0)),beadPositions=[],beadNormals=[],bp=beadGeo.attributes.position,bn=beadGeo.attributes.normal;
      for(var n=0;n<(id==='ecoli'?150:95);n++){
        var bx=(rng()-.5)*.82,th=rng()*Math.PI*2,edge=microbePoint(id,bx,th),rad=.48+rng()*.35;
        var bs=id==='ecoli'?.015:.009+rng()*.007;
        for(var v=0;v<bp.count;v++){beadPositions.push(bx+bp.getX(v)*bs,edge[1]*rad+bp.getY(v)*bs,edge[2]*rad+bp.getZ(v)*bs);beadNormals.push(bn.getX(v),bn.getY(v),bn.getZ(v));}
      }
      var batch=track(new T.BufferGeometry());batch.setAttribute('position',new T.Float32BufferAttribute(beadPositions,3));batch.setAttribute('normal',new T.Float32BufferAttribute(beadNormals,3));mesh(inside,batch,beadMat).name='cytoplasm-particles';
      if(id==='ecoli'){
        var chromosome=[],dnaMat=material('#d7ae76',{roughness:.48});
        for(var j=0;j<=240;j++){var t=j/240*Math.PI*2;chromosome.push([.30*Math.cos(t),.066*Math.sin(t*11),.055*Math.sin(t*9)+.015]);}
        tube(inside,chromosome,.0045,dnaMat);
        var ribosome=ball(inside,beadMat,.21,-.065,.075,.022);ribosome.name='ribosome-landmark';
        g.userData.flagella=[];var filament=material('#a6c1a0',{roughness:.7});
        [[.31,.10,.07],[-.05,-.15,.03],[.08,.03,-.155],[-.31,.06,.09]].forEach(function(base,index){
          var tail=new T.Group();tail.position.fromArray(base);g.add(tail);var path=[];
          for(var k=0;k<=70;k++){var t=k/70,r=.046*Math.min(1,t*5),phase=t*Math.PI*8;path.push([t*(.70+index*.09),Math.sin(phase)*r,Math.cos(phase)*r-r*Math.exp(-t*12)]);}
          tube(tail,path,.0028,filament);tail.userData.phase=index*1.5;g.userData.flagella.push(tail);
          ball(g,lip,base[0],base[1],base[2],.023);
        });
      }else{
        var nucleusMat=material('#b58c9f',{roughness:.52,bumpMap:grainTexture,bumpScale:.002});
        var macronucleus=ball(inside,nucleusMat,-.07,.035,.02,.29,.13,.10);macronucleus.rotation.z=-.15;
        ball(inside,material('#e1bcb0',{roughness:.5}),-.025,-.048,.046,.048);
        var foodMat=material('#c4a376',{roughness:.38,transparent:true,opacity:.66,depthWrite:false});
        [[-.31,-.03,.01,.072],[-.17,-.095,.025,.068],[.10,-.08,.025,.063],[.20,.085,0,.054],[.33,-.05,0,.043]].forEach(function(p){
          ball(inside,foodMat,p[0],p[1],p[2],p[3]);ball(inside,beadMat,p[0]+.009,p[1],p[2],p[3]*.28);
        });
        g.userData.vacuoles=[];var water=material('#a8d5d0',{roughness:.25,metalness:.04,transparent:true,opacity:.73,depthWrite:false}),canal=material('#7fc2b8',{roughness:.5});
        [-.33,.29].forEach(function(x,index){
          var reservoir=ball(inside,water,x,.015,.025,.080,.070,.043);reservoir.userData.baseScale=reservoir.scale.clone();reservoir.userData.phase=index*Math.PI;g.userData.vacuoles.push(reservoir);
          for(var c=0;c<7;c++){var angle=c/7*Math.PI*2;rod(inside,[x+Math.cos(angle)*.035,.015+Math.sin(angle)*.028,.016],[x+Math.cos(angle)*.092,.015+Math.sin(angle)*.072,.006],.003,canal);}
        });
        var groove=[];for(var v=0;v<=30;v++){var gx=-.25+v/30*.45;groove.push(microbePoint(id,gx,2.13));}
        tube(cover,groove,.009,material('#345b51',{roughness:.8}));
      }
      g.userData.extent=1;g.userData.measureCenter=0;g.userData.microbe=true;g.rotation.z=-.14;
    }
    function animateMicrobe(g,cutaway,clock) {
      if(g.userData.innerStructures)g.userData.innerStructures.visible=cutaway;
      if(g.userData.coatMaterial){g.userData.coatMaterial.uniforms.uOpen.value=cutaway?1:0;g.userData.coatMaterial.uniforms.uOpacity.value=.62;}
      if(g.userData.ciliaMaterial)g.userData.ciliaMaterial.uniforms.uTime.value=clock;
      if(g.userData.flagella)g.userData.flagella.forEach(function(tail){tail.rotation.x=clock*1.5+tail.userData.phase;});
      if(g.userData.vacuoles)g.userData.vacuoles.forEach(function(v){var cycle=(clock/4.2+v.userData.phase/(Math.PI*2))%1,pulse=cycle<.82?.45+.55*cycle/.82:1-.55*(cycle-.82)/.18;v.scale.copy(v.userData.baseScale).multiplyScalar(pulse);});
    }
    function solarModel(g) {
      // One model unit is the photospheric diameter. The atmosphere and loops
      // extend beyond the ruler; opening a quadrant never rescales the star.
      var clock={value:0},open={value:0};
      var noiseGLSL=[
        'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
        'float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}'
      ].join('\n');
      var vertex='varying vec3 vP;varying vec3 vN;varying vec3 vV;void main(){vP=position;vec4 p=modelViewMatrix*vec4(position,1.);vN=normalize(normalMatrix*normal);vV=-p.xyz;gl_Position=projectionMatrix*p;}';
      var finish=['#include <tonemapping_fragment>','#include <encodings_fragment>','}'];
      var surface=track(new T.ShaderMaterial({uniforms:{uTime:clock,uOpen:open,uOpacity:{value:1}},vertexShader:vertex,
        fragmentShader:[
          'uniform float uTime;uniform float uOpen;uniform float uOpacity;varying vec3 vP;varying vec3 vN;varying vec3 vV;',noiseGLSL,
          'float grains(vec3 p){vec3 cell=floor(p),f=fract(p);float a=8.,b=8.;for(int x=-1;x<=1;x++){for(int y=-1;y<=1;y++){for(int z=-1;z<=1;z++){vec3 q=vec3(float(x),float(y),float(z));vec3 seed=cell+q;vec3 h=vec3(hash(seed),hash(seed+31.7),hash(seed+81.3));vec3 d=q+h-f;float dist=dot(d,d);if(dist<a){b=a;a=dist;}else b=min(b,dist);}}}return smoothstep(.005,.34,sqrt(b)-sqrt(a));}',
          'float spot(vec3 center,float radius){vec3 p=vP-center;float d=length(p);float angle=atan(p.y,p.x);float edge=1.+.09*sin(angle*7.)+.04*sin(angle*19.);float penumbra=1.-smoothstep(radius*.62,radius*1.3,d/edge);float umbra=1.-smoothstep(radius*.32,radius*.60,d/edge);return clamp(penumbra*(.42+.07*sin(angle*63.))+umbra*.49,0.,.94);}',
          'void main(){if(uOpen>.5&&vP.x>0.&&vP.z>0.)discard;vec3 p=vP*86.;p+=.8*vec3(noise(p*.7),noise(p*.7+17.),noise(p*.7+43.));float grain=grains(p+vec3(0.,uTime*.035,0.));float broad=noise(vP*34.+uTime*.015);float fine=noise(vP*650.);float limb=.10+.90*pow(max(0.,dot(normalize(vN),normalize(vV))),.65);vec3 col=mix(vec3(.43,.14,.03),vec3(1.25,.74,.31),grain*.78+fine*.22)*(.73+.35*broad+.13*fine);float spots=max(spot(vec3(-.24,.12,.42190),.031),max(spot(vec3(-.184,.108,.4522),.017),spot(vec3(.19,-.21,.4121),.020)));col*=1.-spots;gl_FragColor=vec4(col*limb,uOpacity);'
        ].concat(finish).join('\n')}));
      var photosphere=mesh(g,track(new T.SphereGeometry(.5,96,64)),surface);
      photosphere.name='solarPhotosphere';photosphere.castShadow=photosphere.receiveShadow=false;
      var inside=new T.Group();inside.name='solarInterior';g.add(inside);
      var section=track(new T.ShaderMaterial({side:T.DoubleSide,uniforms:{uTime:clock,uOpacity:{value:1}},vertexShader:vertex,
        fragmentShader:[
          'uniform float uTime;uniform float uOpacity;varying vec3 vP;varying vec3 vN;varying vec3 vV;',noiseGLSL,
          'void main(){float r=length(vP.xy),a=atan(vP.y,vP.x);float n=noise(vec3(vP.xy*95.,uTime*.07));float fine=noise(vec3(vP.xy*280.,1.));vec3 col;',
          'if(r<.125){float hot=1.-r/.125;col=mix(vec3(2.3,.94,.25),vec3(3.4,2.7,1.35),pow(hot,.55))*(.94+.1*n);}',
          'else if(r<.35){float ripple=.5+.5*sin(r*550.+n*3.);col=mix(vec3(.82,.22,.04),vec3(1.22,.39,.075),fine)*(.88+.08*ripple);}',
          'else{float cells=.5+.5*sin(a*42.+sin(r*50.+uTime*.12)*1.2);col=mix(vec3(.10,.012,.004),vec3(.48,.082,.015),.28+n*.5+cells*.18);}',
          'float edge=max(exp(-abs(r-.125)*1000.),exp(-abs(r-.35)*1000.));col+=vec3(.65,.28,.06)*edge;float face=.72+.28*abs(dot(normalize(vN),normalize(vV)));gl_FragColor=vec4(col*face,uOpacity);'
        ].concat(finish).join('\n')}));
      var sectionGeo=track(new T.RingGeometry(0,.5,96,1,-Math.PI/2,Math.PI));
      mesh(inside,sectionGeo,section).name='solarSectionFront';
      var side=mesh(inside,sectionGeo,section);side.rotation.y=-Math.PI/2;side.name='solarSectionSide';
      // The circulating paths sit on the exposed planes, not in the corona.
      var flowPositions=[],flowProgress=[];
      for(var face=0;face<2;face++)for(var cell=0;cell<13;cell++)for(var k=0;k<48;k++)for(var end=0;end<2;end++){
        var t=(k+end)/48*Math.PI*2,angle=-1.39+cell/12*2.78+.087*Math.sin(t),radius=.423+.055*Math.cos(t);
        var x=radius*Math.cos(angle),y=radius*Math.sin(angle);
        flowPositions.push(face?.002:x,y,face?x:.002);flowProgress.push((k+end)/48+cell*.173);
      }
      var flowGeo=track(new T.BufferGeometry());flowGeo.setAttribute('position',new T.Float32BufferAttribute(flowPositions,3));flowGeo.setAttribute('aProgress',new T.Float32BufferAttribute(flowProgress,1));
      var flowMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uTime:clock,uOpacity:{value:1}},
        vertexShader:'attribute float aProgress;varying float vProgress;void main(){vProgress=aProgress;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:['uniform float uTime;uniform float uOpacity;varying float vProgress;void main(){float pulse=pow(.5+.5*cos((vProgress-uTime*.10)*6.28318),12.);gl_FragColor=vec4(mix(vec3(.85,.23,.04),vec3(2.4,1.45,.50),pulse),(.25+.7*pulse)*uOpacity);'].concat(finish).join('\n')}));
      var flows=new T.LineSegments(flowGeo,flowMat);flows.name='solarConvectionFlows';inside.add(flows);
      var loops=new T.Group();loops.name='solarProminences';g.add(loops);
      var loopMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:clock,uOpen:open,uOpacity:{value:1}},
        vertexShader:'varying vec3 vP;varying vec2 vUv;void main(){vP=position;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:['uniform float uTime;uniform float uOpen;uniform float uOpacity;varying vec3 vP;varying vec2 vUv;void main(){if(uOpen>.5&&vP.x>0.&&vP.z>0.)discard;float pulse=pow(.5+.5*sin(vUv.x*24.-uTime*.7),4.);gl_FragColor=vec4(vec3(1.75,.24,.045)+pulse*vec3(.65,.42,.12),(.32+.45*pulse)*uOpacity);'].concat(finish).join('\n')}));
      [[-.88,.38,.28],[.84,-.50,.15]].forEach(function(direction,index){
        var normal=new T.Vector3().fromArray(direction).normalize(),tangent=new T.Vector3(normal.y,-normal.x,0).normalize(),across=new T.Vector3().crossVectors(normal,tangent);
        for(var strand=0;strand<7;strand++){
          var points=[];for(var step=0;step<=36;step++){
            var u=step/36,angle=(u-.5)*(.34+strand*.008),height=(.09+strand*.008)*(index?.62:1)*Math.sin(Math.PI*u);
            var p=normal.clone().multiplyScalar(Math.cos(angle)).addScaledVector(tangent,Math.sin(angle)).multiplyScalar(.499+height);
            p.addScaledVector(across,(strand-3)*.003*Math.sin(Math.PI*u));points.push(p.toArray());
          }
          tube(loops,points,.0012,loopMat);
        }
      });
      // A billboard draws the faint extended corona beyond the measured limb.
      // The opaque body occludes it; the fragment mask also clears the cutaway.
      var coronaMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,uniforms:{uTime:clock,uOpacity:{value:1}},
        vertexShader:'varying vec2 vUv;void main(){vUv=uv;vec4 c=modelViewMatrix*vec4(0.,0.,0.,1.);float scale=length(modelViewMatrix[0].xyz);c.xy+=position.xy*scale;gl_Position=projectionMatrix*c;}',
        fragmentShader:['uniform float uTime;uniform float uOpacity;varying vec2 vUv;void main(){vec2 p=(vUv-.5)*2.3;float r=length(p);if(r<.498)discard;float a=atan(p.y,p.x);float strands=pow(.5+.5*sin(a*47.+sin(a*13.)*3.+sin(r*22.-uTime*.07)),3.);float fans=.55+.45*pow(abs(cos(a-.2)),3.);float halo=exp(-(r-.5)*18.)*.16+exp(-(r-.5)*9.)*strands*fans*.085;halo*=1.-smoothstep(.65,1.1,r);gl_FragColor=vec4(vec3(1.15,.57,.25),halo*uOpacity);'].concat(finish).join('\n')}));
      var corona=mesh(g,track(new T.PlaneGeometry(2.3,2.3)),coronaMat);corona.name='solarCorona';corona.frustumCulled=false;
      g.userData.starMaterial=surface;g.userData.solarInterior=inside;g.userData.solarPhotosphere=photosphere;
      g.userData.extent=1;g.userData.measureCenter=0;g.rotation.y=-.30;
    }
    function animateSun(g,cutaway,clock) {
      g.userData.starMaterial.uniforms.uTime.value=clock;
      g.userData.starMaterial.uniforms.uOpen.value=cutaway?1:0;
      g.userData.solarInterior.visible=cutaway;
    }
    function solarFeatureVisible(root,detail,cutaway) {
      var p=new T.Vector3().fromArray(detail.at),eye=root.userData.model.worldToLocal(camera.position.clone());
      var direction=eye.sub(p).normalize(),b=p.dot(direction),discriminant=b*b+.25-p.lengthSq();
      if(discriminant<0)return true;
      var exitDistance=-b+Math.sqrt(discriminant);
      if(exitDistance<.004)return true;
      p.addScaledVector(direction,exitDistance);
      return cutaway&&p.x>0&&p.z>0;
    }
    function nebulaModel(g) {
      // A compact 96^3 density field, packed into an ordinary 2D texture, keeps
      // this volume available on both WebGL 1 and 2 without a remote asset.
      var side=96,atlasWidth=1152,atlasHeight=768,data=new Uint8Array(atlasWidth*atlasHeight*4);
      function hash(x,y,z){var n=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791);n=Math.imul(n^(n>>>16),0x45d9f3b);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967295;}
      function noise(x,y,z){
        var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);
        var a=hash(ix,iy,iz)*(1-fx)+hash(ix+1,iy,iz)*fx,b=hash(ix,iy+1,iz)*(1-fx)+hash(ix+1,iy+1,iz)*fx;
        var c=hash(ix,iy,iz+1)*(1-fx)+hash(ix+1,iy,iz+1)*fx,d=hash(ix,iy+1,iz+1)*(1-fx)+hash(ix+1,iy+1,iz+1)*fx;
        return (a*(1-fy)+b*fy)*(1-fz)+(c*(1-fy)+d*fy)*fz;
      }
      function smooth(a,b,v){var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
      for(var z=0;z<side;z++)for(var y=0;y<side;y++)for(var x=0;x<side;x++){
        var px=x/95-.5,py=y/95-.5,pz=z/95-.5;
        var n=noise(px*9+4,py*9+3,pz*9+5)*.40+noise(px*25+8,py*25+1,pz*25+9)*.31+noise(px*60+6,py*60+9,pz*60+7)*.21+noise(px*110,py*110+5,pz*110)*.08;
        var radius=Math.sqrt(Math.pow(px/.49,2)+Math.pow((py+.015)/.34,2)+Math.pow(pz/.29,2));
        var envelope=(1-smooth(.68,1.05,radius))*(.4+Math.exp(-radius*radius*2));
        var cavityDistance=Math.sqrt(Math.pow((px+.01)/1.12,2)+Math.pow(py-.025,2)+Math.pow((pz-.16)*.92,2));
        var cavity=smooth(.17,.25,cavityDistance);
        var bar=Math.exp(-Math.pow((py+.16-.22*px)/.048,2)-Math.pow((px-.15)/.25,2)-Math.pow((pz-.025)/.13,2));
        var gas=envelope*Math.pow(Math.max(0,n-.28)*2.3,2.1)*(.035+.965*cavity)+bar*(.15+n)*1.2;
        var ridge=Math.exp(-Math.pow((py-.135+.36*px)/.07,2)-Math.pow((px+.15)/.25,2)-Math.pow((pz-.11)/.08,2));
        var dust=ridge*(.25+Math.pow(n,2)*1.7)+envelope*Math.pow(Math.max(0,n-.52),2)*3;
        var cool=clamp(Math.exp(-Math.pow(cavityDistance/.31,2))*1.5,0,1);
        // Leave a transparent guard around the box to avoid a hard volume edge.
        var edge=1-smooth(.455,.495,Math.max(Math.abs(px),Math.abs(py),Math.abs(pz)));
        var i=((Math.floor(z/12)*96+y)*atlasWidth+(z%12)*96+x)*4;
        data[i]=Math.round(clamp(gas*edge,0,1)*255);data[i+1]=Math.round(cool*255);data[i+2]=Math.round(clamp(dust*edge,0,1)*255);data[i+3]=255;
      }
      var texture=track(new T.DataTexture(data,atlasWidth,atlasHeight,T.RGBAFormat));texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
      var volume={value:texture},eye={value:new T.Vector3()},direction={value:new T.Vector3(0,0,-1)},orthographic={value:0},reveal={value:1},viewport={value:600};
      var sampleGLSL=[
        'uniform sampler2D uVolume;uniform vec3 uEye;uniform vec3 uDirection;uniform float uOrthographic;uniform float uCloud;',
        'vec3 field(vec3 p){if(any(lessThan(p,vec3(-.5)))||any(greaterThan(p,vec3(.5))))return vec3(0.);vec3 q=(p+.5)*95.;float z=floor(q.z),next=min(z+1.,95.);vec2 a=(vec2(mod(z,12.),floor(z/12.))*96.+q.xy+.5)/vec2(1152.,768.);vec2 b=(vec2(mod(next,12.),floor(next/12.))*96.+q.xy+.5)/vec2(1152.,768.);return mix(texture2D(uVolume,a).rgb,texture2D(uVolume,b).rgb,fract(q.z));}',
        'float extinction(vec3 f){return f.r*4.5+f.b*11.;}'
      ].join('\n');
      var finish=['#include <tonemapping_fragment>','#include <encodings_fragment>','}'];
      var cloudMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,uniforms:{uVolume:volume,uEye:eye,uDirection:direction,uOrthographic:orthographic,uCloud:reveal,uOpacity:{value:1}},
        vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:[sampleGLSL,'uniform float uOpacity;varying vec3 vP;',
          'void main(){vec3 rd=normalize(mix(normalize(vP-uEye),uDirection,uOrthographic)),origin=mix(uEye,vP-rd*3.,uOrthographic),inv=1./(rd+vec3(.000001));vec3 a=(-.5-origin)*inv,b=(.5-origin)*inv,lo=min(a,b),hi=max(a,b);float near=max(0.,max(lo.x,max(lo.y,lo.z))),far=min(hi.x,min(hi.y,hi.z));if(far<=near)discard;float stepSize=(far-near)/48.;vec3 p=origin+rd*(near+stepSize*.5);vec4 sum=vec4(0.);',
          'for(int i=0;i<48;i++){vec3 f=field(p);float alpha=1.-exp(-extinction(f)*stepSize*uCloud);vec3 color=mix(vec3(1.10,.22,.16),vec3(.12,.54,.78),smoothstep(.38,.9,f.g));float glow=f.r/(f.r+f.b*2.8+.001);color=color*(1.4+f.r*2.8)*glow+vec3(.018,.012,.023)*(1.-glow);sum.rgb+=(1.-sum.a)*alpha*color;sum.a+=(1.-sum.a)*alpha;p+=rd*stepSize;}if(sum.a<.001)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a*uOpacity);'
        ].concat(finish).join('\n')}));
      var cloud=mesh(g,unitBox,cloudMat);cloud.name='orionCloudVolume';cloud.renderOrder=10;cloud.castShadow=cloud.receiveShadow=false;
      var rng=random(742),positions=[],sizes=[],colors=[];
      [[-.028,.016,.14],[-.008,.035,.13],[.011,.014,.138],[.002,-.009,.125]].forEach(function(p,index){positions.push.apply(positions,p);sizes.push(.040-index*.004);colors.push(1.4,1.9,2.5);});
      for(var star=0;star<440;star++){
        var theta=rng()*Math.PI*2,rad=Math.sqrt(rng())*.43;
        positions.push(Math.cos(theta)*rad,Math.sin(theta)*rad*.7,(rng()-.5)*.44);
        sizes.push(.0025+Math.pow(rng(),4)*.008);var warm=rng();colors.push(.8+warm*.6,.85+warm*.3,1.3-warm*.6);
      }
      var starsGeo=track(new T.BufferGeometry());starsGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));starsGeo.setAttribute('aSize',new T.Float32BufferAttribute(sizes,1));starsGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      var starsMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,uniforms:{uVolume:volume,uEye:eye,uDirection:direction,uOrthographic:orthographic,uCloud:reveal,uViewport:viewport,uOpacity:{value:1}},
        vertexShader:[sampleGLSL,'uniform float uViewport;attribute float aSize;varying vec3 vColor;varying float vVisibility;',
          'void main(){vec3 direction=normalize(mix(normalize(uEye-position),-uDirection,uOrthographic)),inv=1./(direction+vec3(.000001)),a=(-.5-position)*inv,b=(.5-position)*inv,far=max(a,b);float distance=min(length(uEye-position),max(0.,min(far.x,min(far.y,far.z))));float stepSize=distance/16.,depth=0.;for(int i=0;i<16;i++){depth+=extinction(field(position+direction*(float(i)+.5)*stepSize))*stepSize;}vVisibility=exp(-depth*uCloud);vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);float scale=length(modelViewMatrix[0].xyz),projection=mix(1./max(.1,-mv.z),projectionMatrix[1][1]*.5,uOrthographic);gl_PointSize=clamp(aSize*scale*uViewport*projection,1.,42.);gl_Position=projectionMatrix*mv;}'
        ].join('\n'),
        fragmentShader:['uniform float uOpacity;varying vec3 vColor;varying float vVisibility;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float core=exp(-r*r*120.),halo=exp(-r*r*16.)*.14;float rays=(exp(-abs(p.x)*110.-abs(p.y)*10.)+exp(-abs(p.y)*110.-abs(p.x)*10.))*.12;gl_FragColor=vec4(vColor,(core+halo+rays)*vVisibility*uOpacity);'].concat(finish).join('\n')}));
      var stars=new T.Points(starsGeo,starsMat);stars.name='orionEmbeddedStars';stars.renderOrder=11;stars.frustumCulled=false;g.add(stars);
      g.userData.nebula={cloud:cloud,stars:stars,eye:eye,direction:direction,orthographic:orthographic,reveal:reveal,viewport:viewport};g.userData.extent=1;g.userData.measureCenter=0;
    }
    function solarSystemModel(g) {
      var bodies=[],paths=[];
      var star=ball(g,material('#fff0ce',{emissive:'#ffbc63',emissiveIntensity:2}),0,0,0,.004);
      var halo=glow(g,'#ffd1a0',.045,.75);
      SOLAR_ORBITS.forEach(function(orbit,index){
        var radius=orbit.au/(2*SOLAR_RADIUS_AU),points=[];
        for(var j=0;j<256;j++){var a=j/256*Math.PI*2;points.push(Math.cos(a)*radius,0,Math.sin(a)*radius);}
        var geometry=track(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
        var line=new T.LineLoop(geometry,track(new T.LineBasicMaterial({color:orbit.color,transparent:true,opacity:index<4?.42:.28,depthWrite:false})));
        line.userData.orbitAU=orbit.au;line.userData.planetId=orbit.id;g.add(line);paths.push(line);
        var uniforms={uColor:{value:new T.Color(orbit.color).convertSRGBToLinear()},uKind:{value:index},uSun:{value:new T.Vector3(-Math.cos(orbit.angle),0,-Math.sin(orbit.angle))},uOpacity:{value:1}};
        var surface=track(new T.ShaderMaterial({uniforms:uniforms,vertexShader:'varying vec3 vN;varying vec3 vP;void main(){vN=normal;vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
          fragmentShader:[
            'uniform vec3 uColor;uniform vec3 uSun;uniform float uKind;uniform float uOpacity;varying vec3 vN;varying vec3 vP;',
            'float hash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
            'float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
            'void main(){vec3 n=normalize(vN);float grain=noise(vP*32.);vec3 col=uColor*(.68+grain*.5);',
            'if(uKind>3.5){float bands=sin(vP.y*95.+noise(vP*18.)*3.);col=uColor*(.78+.18*bands+.12*grain);}',
            'if(uKind>1.5&&uKind<2.5){float land=noise(vP*7.)*.7+noise(vP*17.)*.3;col=mix(vec3(.025,.13,.28),vec3(.16,.23,.12),smoothstep(.49,.55,land));float clouds=smoothstep(.63,.78,noise(vP*24.));col=mix(col,vec3(.8,.83,.78),clouds);}',
            'if(uKind>2.5&&uKind<3.5)col=mix(col,vec3(.7,.72,.7),smoothstep(.44,.49,abs(vP.y)));',
            'float daylight=max(0.,dot(n,uSun));col*=.26+1.9*daylight;gl_FragColor=vec4(col,uOpacity);',
            '#include <tonemapping_fragment>','#include <encodings_fragment>','}'
          ].join('\n')}));
        var body=new T.Group();body.position.fromArray(solarPosition(orbit));body.userData.planetId=orbit.id;body.userData.orbitAU=orbit.au;g.add(body);
        ball(body,surface,0,0,0,1);
        if(orbit.id==='saturn'){
          var ringGeo=track(new T.RingGeometry(.64,1.12,128));
          var ringMat=track(new T.ShaderMaterial({side:T.DoubleSide,transparent:true,depthWrite:false,
            uniforms:{uOpacity:{value:.72}},vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
            fragmentShader:'uniform float uOpacity;varying vec3 vP;void main(){float r=length(vP.xy);float gap=1.-smoothstep(.895,.909,r)*(1.-smoothstep(.936,.950,r));float lines=.82+.18*sin(r*65.);gl_FragColor=vec4(vec3(.68,.59,.43),uOpacity*gap*lines);\n#include <tonemapping_fragment>\n#include <encodings_fragment>\n}'}));
          var rings=mesh(body,ringGeo,ringMat);rings.rotation.x=-Math.PI/2+.47;
        }
        bodies.push(body);
      });
      var belt=dots(g,1600,function(r){var angle=r()*Math.PI*2,radius=(2.1+r()*1.2)/(2*SOLAR_RADIUS_AU);return [Math.cos(angle)*radius,(r()-.5)*.0016,Math.sin(angle)*radius];},'#c9b58f',.0012,431);
      belt.material.opacity=.60;
      var measureGeo=track(new T.BufferGeometry());measureGeo.setAttribute('position',new T.Float32BufferAttribute([0,0,0,0,0,0],3));
      var measureLine=new T.Line(measureGeo,track(new T.LineDashedMaterial({color:'#e9ce9e',dashSize:.004,gapSize:.003,transparent:true,opacity:.7,depthWrite:false})));
      measureLine.visible=false;g.add(measureLine);
      g.rotation.x=.78;g.rotation.z=-.10;g.userData.extent=1;g.userData.measureCenter=0;
      g.userData.solarSystem={bodies:bodies,paths:paths,star:star,halo:halo,belt:belt,measureLine:measureLine};
      sizeSolarMarkers(g,1);
    }
    function sizeSolarMarkers(g,zoom){
      var system=g.userData.solarSystem;
      // Marker diameters aid visibility; the orbital geometry never changes.
      system.bodies.forEach(function(body,index){body.scale.setScalar(Math.min(index<4?.002:1,SOLAR_ORBITS[index].diameter/Math.sqrt(zoom)));});
      system.star.scale.setScalar(Math.min(.004,.007/Math.sqrt(zoom)));
      system.halo.scale.setScalar(.045/Math.sqrt(zoom));
    }
    function lightSolarSystem(root,state){
      var g=root.userData.model,system=g.userData.solarSystem;if(!system)return;
      sizeSolarMarkers(g,!state.comparison&&state.focusId==='solar-system'?cameraZoom:1);
      system.measureLine.visible=!state.comparison&&state.showDetails&&state.focusId==='solar-system'&&/-orbit$/.test(state.detailId);
      if(system.measureLine.visible){
        var orbit=SOLAR_ORBITS.filter(function(o){return o.id+'-orbit'===state.detailId;})[0],p=solarPosition(orbit),attr=system.measureLine.geometry.attributes.position;
        attr.setXYZ(1,p[0],p[1],p[2]);attr.needsUpdate=true;system.measureLine.geometry.computeBoundingSphere();system.measureLine.computeLineDistances();
      }
      system.paths.forEach(function(line){if(!state.comparison&&line.userData.planetId+'-orbit'===state.detailId)line.material.opacity*=2;});
    }
    function galaxyModel(g) {
      // 128 x 32 x 128 cells; height slices fit a WebGL 1-compatible 2D texture.
      var data=new Uint8Array(1024*512*4),c=Math.cos(.45),s=Math.sin(.45);
      function hash(x,y,z){var n=Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791);n=Math.imul(n^(n>>>16),0x45d9f3b);return ((n^(n>>>16))>>>0)/4294967295;}
      function noise(x,y,z){var ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);fz=fz*fz*(3-2*fz);var a=hash(ix,iy,iz)*(1-fx)+hash(ix+1,iy,iz)*fx,b=hash(ix,iy+1,iz)*(1-fx)+hash(ix+1,iy+1,iz)*fx,d=hash(ix,iy,iz+1)*(1-fx)+hash(ix+1,iy,iz+1)*fx,e=hash(ix,iy+1,iz+1)*(1-fx)+hash(ix+1,iy+1,iz+1)*fx;return(a*(1-fy)+b*fy)*(1-fz)+(d*(1-fy)+e*fy)*fz;}
      function smooth(a,b,v){var t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);}
      for(var y=0;y<32;y++)for(var z=0;z<128;z++)for(var x=0;x<128;x++){
        var px=x/127-.5,py=(y/31-.5)*.24,pz=z/127-.5,r=Math.hypot(px,pz),angle=Math.atan2(pz,px);
        var grain=noise(px*24+5,py*40+6,pz*24+3)*.6+noise(px*83+9,py*110+5,pz*83+1)*.4;
        var phase=angle-2.6*Math.log(Math.max(.055,r)/.1)-.45+(grain-.5)*.35+.10*Math.sin(17*r+3*angle);
        var arms=(Math.pow(.5+.5*Math.cos(phase*2),10)+.34*Math.pow(.5+.5*Math.cos(phase*2+Math.PI),16))*smooth(.075,.15,r);
        var envelope=Math.exp(-r*4)*(1-smooth(.42,.495,r)),thin=Math.exp(-Math.abs(py)/.008);
        var bx=px*c+pz*s,bz=-px*s+pz*c;
        var bar=Math.exp(-Math.pow(bx/.135,4)-Math.pow(bz/.031,2)-Math.pow(py/.025,2));
        var bulge=Math.exp(-Math.pow(r/.073,1.5)-Math.pow(Math.abs(py)/.035,1.5));
        var disc=envelope*(.30+arms*2.2)*thin*Math.pow(Math.max(0,grain-.25)*2.5,1.8);
        var starlight=disc+bar*.9+bulge*1.3,young=clamp(disc/(starlight+.001)*(.35+arms*.8),0,1);
        var lane=Math.pow(.5+.5*Math.cos(phase*2+.38+(grain-.5)*.6),22)*smooth(.07,.14,r);
        var dust=envelope*(.65+lane*2.1)*Math.exp(-Math.pow(py/.0055,2))*(.35+grain);
        var i=((Math.floor(y/8)*128+z)*1024+(y%8)*128+x)*4;
        data[i]=Math.round(clamp(starlight,0,1)*255);data[i+1]=Math.round(young*255);data[i+2]=Math.round(clamp(dust,0,1)*255);data[i+3]=255;
      }
      var texture=track(new T.DataTexture(data,1024,512,T.RGBAFormat));texture.minFilter=texture.magFilter=T.LinearFilter;texture.generateMipmaps=false;texture.needsUpdate=true;
      var volume={value:texture},eye={value:new T.Vector3()},direction={value:new T.Vector3(0,0,-1)},orthographic={value:0},reveal={value:1},viewport={value:600};
      var sample=[
        'uniform sampler2D uVolume;uniform vec3 uEye;uniform vec3 uDirection;uniform float uOrthographic;',
        'vec3 field(vec3 p){vec3 q=(p/vec3(1.,.24,1.)+.5);if(any(lessThan(q,vec3(0.)))||any(greaterThan(q,vec3(1.))))return vec3(0.);q*=vec3(127.,31.,127.);float y=floor(q.y),next=min(y+1.,31.);vec2 a=(vec2(mod(y,8.),floor(y/8.))*128.+q.xz+.5)/vec2(1024.,512.);vec2 b=(vec2(mod(next,8.),floor(next/8.))*128.+q.xz+.5)/vec2(1024.,512.);return mix(texture2D(uVolume,a).rgb,texture2D(uVolume,b).rgb,fract(q.y));}'
      ].join('\n'),finish=['#include <tonemapping_fragment>','#include <encodings_fragment>','}'];
      var cloudMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,side:T.BackSide,uniforms:{uVolume:volume,uEye:eye,uDirection:direction,uOrthographic:orthographic,uOpacity:{value:1}},
        vertexShader:'varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
        fragmentShader:[sample,'uniform float uOpacity;varying vec3 vP;',
          'void main(){vec3 rd=normalize(mix(normalize(vP-uEye),uDirection,uOrthographic)),origin=mix(uEye,vP-rd*3.,uOrthographic),inv=1./(rd+vec3(.000001));vec3 a=(-vec3(.5,.12,.5)-origin)*inv,b=(vec3(.5,.12,.5)-origin)*inv,lo=min(a,b),hi=max(a,b);float near=max(0.,max(lo.x,max(lo.y,lo.z))),far=min(hi.x,min(hi.y,hi.z));if(far<=near)discard;float stepSize=(far-near)/64.;vec3 p=origin+rd*(near+stepSize*.5);vec4 sum=vec4(0.);',
          'for(int i=0;i<64;i++){vec3 f=field(p);float extinction=f.r*7.+f.b*120.,alpha=1.-exp(-extinction*stepSize);vec3 color=mix(vec3(1.35,.72,.34),vec3(.48,.64,.94),smoothstep(.15,.92,f.g));float emission=f.r*7./(extinction+.001);color*=emission*(2.4+f.r*2.);sum.rgb+=(1.-sum.a)*alpha*color;sum.a+=(1.-sum.a)*alpha;p+=rd*stepSize;}if(sum.a<.001)discard;gl_FragColor=vec4(sum.rgb/max(sum.a,.001),sum.a*uOpacity);'
        ].concat(finish).join('\n')}));
      var cloud=mesh(g,track(new T.BoxGeometry(1,.24,1)),cloudMat);cloud.name='galacticLightAndDust';cloud.renderOrder=10;cloud.castShadow=cloud.receiveShadow=false;
      var rng=random(26000),positions=[],sizes=[],colors=[];
      function gaussian(){return Math.sqrt(-2*Math.log(Math.max(.00001,rng())))*Math.cos(2*Math.PI*rng());}
      for(var j=0;j<22000;j++){
        var px,pz,py,r,young;
        if(j<17500){r=Math.pow(rng(),.65)*.49;var arm=j%4,theta=2.6*Math.log(Math.max(.055,r)/.1)+.45+arm*Math.PI*.5;if(j%5<2)theta=rng()*Math.PI*2;else theta+=gaussian()*(arm%2?.075:.13);px=Math.cos(theta)*r;pz=Math.sin(theta)*r;py=gaussian()*(.003+.003*Math.exp(-r*12));young=j%5>=2&&r>.1;}
        else if(j<20200){px=gaussian()*.051;pz=gaussian()*.038;py=gaussian()*.021;young=false;}
        else {var bx=(rng()-.5)*.31,bz=gaussian()*.012;px=bx*c-bz*s;pz=bx*s+bz*c;py=gaussian()*.01;young=false;}
        positions.push(px,clamp(py,-.1,.1),pz);sizes.push(.00065+Math.pow(rng(),5)*.0026);
        var light=.45+rng()*.7;colors.push(light*(young?.55:1.25),light*(young?.8:1.03),light*(young?1.5:.72));
      }
      positions.push(.216,0,.145);sizes.push(.009);colors.push(2.2,1.8,.7);
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('aSize',new T.Float32BufferAttribute(sizes,1));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      var starsMat=track(new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,vertexColors:true,uniforms:{uVolume:volume,uEye:eye,uDirection:direction,uOrthographic:orthographic,uViewport:viewport,uOpacity:{value:1}},
        vertexShader:[sample,'uniform float uViewport;attribute float aSize;varying vec3 vColor;varying float vVisibility;varying float vEnergy;',
          'void main(){vec3 rd=normalize(mix(normalize(uEye-position),-uDirection,uOrthographic)),inv=1./(rd+vec3(.000001)),a=(-vec3(.5,.12,.5)-position)*inv,b=(vec3(.5,.12,.5)-position)*inv,far=max(a,b);float distance=min(length(uEye-position),max(0.,min(far.x,min(far.y,far.z)))),stepSize=distance/16.,depth=0.;for(int i=0;i<16;i++){depth+=field(position+rd*(float(i)+.5)*stepSize).b*120.*stepSize;}vVisibility=exp(-depth);vColor=color;vec4 mv=modelViewMatrix*vec4(position,1.);float scale=length(modelViewMatrix[0].xyz),projection=mix(projectionMatrix[1][1]*.5/max(.1,-mv.z),projectionMatrix[1][1]*.5,uOrthographic);float diameter=aSize*scale*uViewport*projection;vEnergy=min(1.,diameter*diameter);gl_PointSize=clamp(diameter,1.,18.);gl_Position=projectionMatrix*mv;}'
        ].join('\n'),fragmentShader:['uniform float uOpacity;varying vec3 vColor;varying float vVisibility;varying float vEnergy;void main(){vec2 p=gl_PointCoord-.5;float r=length(p);if(r>.5)discard;float light=exp(-r*r*32.);gl_FragColor=vec4(vColor,light*vVisibility*vEnergy*uOpacity*.5);'].concat(finish).join('\n')}));
      var stars=new T.Points(geo,starsMat);stars.name='galacticStellarPopulations';stars.renderOrder=11;stars.frustumCulled=false;g.add(stars);
      g.userData.galaxy={cloud:cloud,stars:stars,eye:eye,direction:direction,orthographic:orthographic,reveal:reveal,viewport:viewport};
      g.rotation.x=.68;g.rotation.z=-.22;g.userData.extent=1;g.userData.measureCenter=0;
    }
    function lightVolumes(visible,state,height) {
      var settling=false;
      visible.forEach(function(root){
        var g=root.userData.model,n=g.userData.nebula||g.userData.galaxy;if(!n)return;var goal=g.userData.nebula&&state.nebulaReveal?.16:1;
        n.eye.value.copy(activeCamera.position);g.worldToLocal(n.eye.value);
        activeCamera.getWorldDirection(n.direction.value).add(activeCamera.position);g.worldToLocal(n.direction.value).sub(n.eye.value).normalize();
        n.orthographic.value=activeCamera.isOrthographicCamera?1:0;
        n.reveal.value+=(goal-n.reveal.value)*(state.reduceMotion||state.comparison?1:.16);
        if(Math.abs(goal-n.reveal.value)<.0001)n.reveal.value=goal;else settling=true;
        n.viewport.value=height*renderer.getPixelRatio();
      });
      return settling;
    }
    function canyonModel(g) {
      var land=new T.Group();g.add(land);
      var positions=[],uvs=[],colors=[],indices=[],nx=384,nz=144;
      function point(x,z) {
        var height=canyonHeight(x,z),level=height/CANYON_PATH.depth;
        positions.push(x,height,z);uvs.push((x+.5)*3,level*.84+.12);
        var d=Math.abs(z-canyonCenter(x)),grain=canyonNoise(x*100,z*100);
        var shadow=.68+.32*canyonSmooth(.001,.025,d),green=canyonSmooth(.86,1,level)*(.3+.5*grain);
        colors.push(shadow*(1-green*.28),shadow*(1-green*.12),shadow*(1-green*.34));
      }
      for(var z=0;z<=nz;z++)for(var x=0;x<=nx;x++){
        var px=x/nx-.5,q=z/nz*2-1,pz=canyonCenter(px)+Math.sign(q)*.19*Math.pow(Math.abs(q),1.65);point(px,pz);
        if(z<nz&&x<nx){var a=z*(nx+1)+x,b=a+nx+1;indices.push(a,b,a+1,a+1,b,b+1);}
      }
      // Close the terrain at its edges so low viewpoints reveal a solid slab.
      var edge=[];for(var x=0;x<=nx;x++)edge.push(x);for(var z=1;z<=nz;z++)edge.push(z*(nx+1)+nx);
      for(var x=nx-1;x>=0;x--)edge.push(nz*(nx+1)+x);for(var z=nz-1;z>0;z--)edge.push(z*(nx+1));
      for(var i=0;i<edge.length;i++){
        var a=edge[i],b=edge[(i+1)%edge.length],at=positions.length/3;
        [a,b].forEach(function(index){positions.push(positions[index*3],-.00065,positions[index*3+2]);uvs.push(uvs[index*2],0);colors.push(.63,.60,.58);});
        indices.push(a,at,b,b,at,at+1);
      }
      var geo=track(new T.BufferGeometry());geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.setIndex(indices);geo.computeVertexNormals();
      var cv=document.createElement('canvas');cv.width=128;cv.height=1024;var ctx=cv.getContext('2d'),pixels=ctx.createImageData(128,1024);
      var bands=[[0,'#5f4e50'],[.12,'#725855'],[.27,'#a76550'],[.41,'#b68b6e'],[.53,'#b75f42'],[.66,'#d2916b'],[.80,'#b27a58'],[.93,'#d5bc92'],[1,'#c7b391']];
      var ramp=bands.map(function(b){return [b[0],new T.Color(b[1])];});
      for(var y=0;y<1024;y++)for(var x=0;x<128;x++){
        var h=1-y/1023,band=0;while(band<ramp.length-2&&h>ramp[band+1][0])band++;
        var a=ramp[band],b=ramp[band+1],t=canyonSmooth(b[0]-.012,b[0]+.008,h),c=a[1].clone().lerp(b[1],t);
        var fleck=.91+.06*Math.sin(h*480)+.035*Math.sin(h*1300)+.055*canyonNoise(x*.4,y*.5),p=(y*128+x)*4;
        pixels.data[p]=c.r*255*fleck;pixels.data[p+1]=c.g*255*fleck;pixels.data[p+2]=c.b*255*fleck;pixels.data[p+3]=255;
      }
      ctx.putImageData(pixels,0,0);var strata=track(new T.CanvasTexture(cv));strata.encoding=T.sRGBEncoding;strata.wrapS=T.RepeatWrapping;strata.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
      var rockMat=material('#ffffff',{map:strata,vertexColors:true,roughness:.96,bumpMap:grainTexture,bumpScale:.000035,side:T.DoubleSide});
      rockMat.onBeforeCompile=function(shader){
        shader.vertexShader='varying vec3 vCanyonPosition;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCanyonPosition=position;');
        shader.fragmentShader='varying vec3 vCanyonPosition;\nfloat canyonGrain(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}\nfloat canyonSoil(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(canyonGrain(i),canyonGrain(i+vec2(1.,0.)),f.x),mix(canyonGrain(i+vec2(0.,1.)),canyonGrain(i+vec2(1.)),f.x),f.y);}\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\nfloat top=smoothstep('+String(CANYON_PATH.depth*.84)+','+String(CANYON_PATH.depth*.97)+',vCanyonPosition.y);float grain=canyonSoil(vCanyonPosition.xz*370.);vec3 soil=mix(vec3(.27,.235,.16),vec3(.12,.17,.085),canyonSoil(vCanyonPosition.xz*120.));diffuseColor.rgb=mix(diffuseColor.rgb,soil*(.8+.4*grain),top);');
      };
      var terrain=mesh(land,geo,rockMat);terrain.name='canyonStrata';
      var riverPositions=[],riverUV=[],riverIndices=[],halfWidth=91/446000*CANYON_PATH.length/2;
      CANYON_PATH.points.forEach(function(p,i){riverPositions.push(p[0],.000008,p[1]-halfWidth,p[0],.000008,p[1]+halfWidth);riverUV.push(i/512,0,i/512,1);if(i<512){var a=i*2;riverIndices.push(a,a+1,a+2,a+1,a+3,a+2);}});
      var riverGeo=track(new T.BufferGeometry());riverGeo.setAttribute('position',new T.Float32BufferAttribute(riverPositions,3));riverGeo.setAttribute('uv',new T.Float32BufferAttribute(riverUV,2));riverGeo.setIndex(riverIndices);riverGeo.computeVertexNormals();
      var river=mesh(land,riverGeo,material('#649c99',{roughness:.32,metalness:.15,emissive:'#244345',emissiveIntensity:.16,side:T.DoubleSide}));river.name='canyonRiver';river.castShadow=false;
      g.rotation.x=.50;g.rotation.y=-.24;g.userData.extent=CANYON_PATH.length;g.userData.measureCenter=0;
      var locator=new T.Mesh(track(new T.RingGeometry(.003,.004,48)),track(new T.MeshBasicMaterial({color:'#e8f6cf',side:T.DoubleSide,depthTest:false,depthWrite:false})));
      locator.rotation.x=-Math.PI/2;locator.visible=false;locator.renderOrder=8;locator.name='canyonRouteLocator';g.add(locator);
      land.scale.y=8;g.userData.canyon={land:land,terrain:terrain,river:river,locator:locator};
    }
    function lightCanyon(root,state) {
      var c=root.userData.model.userData.canyon;if(!c)return;
      c.land.scale.y=state.comparison?1:clamp(state.terrainRelief||8,1,20);
      c.locator.visible=!state.comparison&&!state.flight&&state.detailId==='river-journey';
      if(c.locator.visible)c.locator.position.fromArray(canyonRoutePoint(riverTravelKm));
    }
    function everestModel(g) {
      var n=241,span=18000/8849,geo=track(new T.PlaneGeometry(span,span,n-1,n-1));
      geo.rotateX(-Math.PI/2);
      var p=geo.attributes.position,colors=new Float32Array(p.count*3);
      for(var i=0;i<p.count;i++)p.setY(i,.64);
      geo.setAttribute('color',new T.BufferAttribute(colors,3));
      var land=mesh(g,geo,material('#ffffff',{vertexColors:true,roughness:.94,bumpMap:grainTexture,bumpScale:.0018}));
      land.name='everestElevationSurface';land.visible=false;
      // Close the cropped edges at a fixed elevation. This is a display cut,
      // never the zero-height datum used to measure Everest.
      var sideGeo=track(new T.BufferGeometry()),sidePos=new Float32Array((n-1)*4*18);
      sideGeo.setAttribute('position',new T.BufferAttribute(sidePos,3));
      var sides=mesh(g,sideGeo,material('#343b40',{roughness:1,side:T.DoubleSide}));sides.visible=false;
      var datum=new T.Group();g.add(datum);
      var lines=[],half=span/2;
      for(i=-2;i<=2;i++){var q=i*half/2;lines.push(-half,0,q,half,0,q,q,0,-half,q,0,half);}
      var datumGeo=track(new T.BufferGeometry());datumGeo.setAttribute('position',new T.Float32BufferAttribute(lines,3));
      var datumLines=new T.LineSegments(datumGeo,track(new T.LineDashedMaterial({color:'#a5bec7',transparent:true,opacity:.48,dashSize:.035,gapSize:.02})));
      datumLines.computeLineDistances();datum.add(datumLines);
      var datumGuide=new T.Line(track(new T.BufferGeometry().setFromPoints([new T.Vector3(0,0,-.1019),new T.Vector3(0,1,-.1019)])),track(new T.LineDashedMaterial({color:'#e8d6a4',dashSize:.022,gapSize:.014,transparent:true,opacity:.8})));
      datumGuide.computeLineDistances();datum.add(datumGuide);datum.visible=false;
      g.userData.dimension='y';g.userData.extent=1;g.userData.measureCenter=.5;
      g.userData.everest={land:land,datum:datum,data:null,status:'loading'};
      var controller=null,timer=0;
      track({dispose:function(){clearTimeout(timer);if(controller)controller.abort();}});
      function loadTerrain(){
      if(disposed||g.userData.released)return;
      controller=typeof AbortController!=='undefined'?new AbortController():null;
      g.userData.everest.status='loading';invalidate();
      timer=setTimeout(function(){if(controller)controller.abort();},20000);
      fetch(new URL('../terrain/everest-elevation.json',atlasAssetBase).href,controller?{signal:controller.signal}:{}).then(function(response){
        if(!response.ok)throw new Error('Terrain unavailable');return response.json();
      }).then(function(data){
        clearTimeout(timer);if(disposed||g.userData.released)return;
        if(!validEverestTerrain(data))throw new Error('Invalid terrain grid');
        var rock=new T.Color('#5e5d58').convertSRGBToLinear(),snow=new T.Color('#edf4f5').convertSRGBToLinear(),ice=new T.Color('#afc4cb').convertSRGBToLinear(),color=new T.Color(),step=data.spacingMeters||75;
        for(var j=0;j<p.count;j++)p.setY(j,data.elevations[j]/8849);
        geo.computeVertexNormals();
        for(var row=0;row<n;row++)for(var col=0;col<n;col++){
          var k=row*n+col,h=data.elevations[k],
            dx=(data.elevations[row*n+Math.min(n-1,col+1)]-data.elevations[row*n+Math.max(0,col-1)])/(step*(col===0||col===n-1?1:2)),
            dz=(data.elevations[Math.min(n-1,row+1)*n+col]-data.elevations[Math.max(0,row-1)*n+col])/(step*(row===0||row===n-1?1:2)),
            slope=Math.sqrt(dx*dx+dz*dz),noise=Math.sin(col*1.73+row*.73)*Math.sin(row*1.13-col*.93),
            cover=clamp((h-5500)/1400,0,1)*clamp((1.15-slope)*1.6+noise*.1,0,1);
          color.copy(rock).lerp(ice,clamp((h-5400)/4000,0,.3)).lerp(snow,cover).multiplyScalar(.91+noise*.055);
          colors[k*3]=color.r;colors[k*3+1]=color.g;colors[k*3+2]=color.b;
        }
        p.needsUpdate=true;geo.attributes.color.needsUpdate=true;geo.computeBoundingBox();geo.computeBoundingSphere();
        var cursor=0;
        function side(a,b){[a,b,-b-1,a,-b-1,-a-1].forEach(function(k){var low=k<0,index=low?-k-1:k;sidePos[cursor++]=p.getX(index);sidePos[cursor++]=low?.46:p.getY(index);sidePos[cursor++]=p.getZ(index);});}
        for(var edge=0;edge<n-1;edge++){side(edge,edge+1);side((n-1)*n+edge+1,(n-1)*n+edge);side((edge+1)*n,edge*n);side(edge*n+n-1,(edge+1)*n+n-1);}
        sideGeo.attributes.position.needsUpdate=true;sideGeo.computeVertexNormals();sideGeo.computeBoundingBox();sideGeo.computeBoundingSphere();
        land.visible=sides.visible=true;g.userData.everest.data=data;g.userData.everest.status='ready';g.userData.surfaceReady=true;
        comparisonLayoutKey='';invalidate();
      }).catch(function(){clearTimeout(timer);if(!disposed&&!g.userData.released){g.userData.everest.status='failed';invalidate();}});
      }
      g.userData.everest.retry=function(){if(g.userData.everest.status==='failed')loadTerrain();};loadTerrain();
    }
    function terrainDetail(root,detail) {
      var terrain=root&&root.userData.model.userData.everest;
      if(!detail||!detail.terrain||detail.datum||!terrain||!terrain.data)return detail;
      var at=detail.at.slice();at[1]=everestHeight(terrain.data,at[0],at[2])+.003;
      return Object.assign({},detail,{at:at});
    }
    function lightEverest(root,state) {
      var terrain=root.userData.model.userData.everest;
      if(terrain)terrain.datum.visible=!!state.comparison||state.detailId==='everest-datum';
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
        var planetMat=track(new T.MeshPhysicalMaterial({color:0xffffff,map:planetTexture(id),roughness:.96,reflectivity:id==='earth'?.18:.08}));
        ball(g,planetMat,0,0,0,1);
        if(id==='earth'||id==='moon'||id==='jupiter') {
          var texture=track(new T.TextureLoader().load(atlasAssetBase+(id==='earth'?'scale-earth-bluemarble-1k.png':id==='moon'?'moon-lroc-color-2k.jpg':'scale-jupiter-hubble-1k.jpg'),function(tex){
            if(disposed||g.userData.released){tex.dispose();return;}tex.encoding=T.sRGBEncoding;tex.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());planetMat.map=tex;planetMat.needsUpdate=true;g.userData.imageryReady=true;invalidate();
          },undefined,function(){if(!disposed&&!g.userData.released){g.userData.imageryError=true;invalidate();}}));
          texture.encoding=T.sRGBEncoding;
        }
        if(id==='moon') {
          var heightMap=track(new T.TextureLoader().load(atlasAssetBase+'moon-lola-height-1k.jpg',function(tex){if(disposed||g.userData.released){tex.dispose();return;}planetMat.bumpMap=tex;planetMat.bumpScale=.008;planetMat.needsUpdate=true;invalidate();},undefined,function(){}));
        }
        if(id==='earth'){earthAtmosphere(g);g.rotation.y=2.8;g.rotation.z=.12;}
        if(id==='jupiter'){g.scale.y=.935;g.rotation.y=1.7;}
      } else if(id==='sun') {
        solarModel(g);
      } else if(id==='betelgeuse') {
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
        galaxyModel(g);
      } else if(['universe','laniakea','virgo-sc'].indexOf(id)>=0) {
        var rng=random(8), nodes=[];
        for(j=0;j<44;j++)nodes.push([(rng()-0.5)*0.85,(rng()-0.5)*0.85,(rng()-0.5)*0.85]);
        var lines=[], netMat=track(new T.LineBasicMaterial({color:'#8577c5',transparent:true,opacity:0.38}));
        nodes.forEach(function(p,i){nodes.slice(i+1).forEach(function(q){if(new T.Vector3().fromArray(p).distanceTo(new T.Vector3().fromArray(q))<0.3)lines.push.apply(lines,p.concat(q));});});
        var netGeo=track(new T.BufferGeometry());netGeo.setAttribute('position',new T.Float32BufferAttribute(lines,3));g.add(new T.LineSegments(netGeo,netMat));
        dots(g,2700,function(r,i){var p=nodes[i%nodes.length];return [p[0]+(r()-0.5)*0.09,p[1]+(r()-0.5)*0.09,p[2]+(r()-0.5)*0.09];},'#d8c2ff',0.005,4);
        glow(g,'#7960bb',1.3,0.16);
      } else if(id==='orion-nebula') {
        nebulaModel(g);
      } else if(['solar-system','heliosphere','oort','local-bubble'].indexOf(id)>=0) {
        if(id==='solar-system') {
          solarSystemModel(g);
        } else {
          dots(g,2000,function(r){var th=r()*Math.PI*2,u=r()*2-1,rad=0.4+r()*0.1;return [Math.cos(th)*Math.sqrt(1-u*u)*rad,u*rad*0.72,Math.sin(th)*Math.sqrt(1-u*u)*rad];},'#9bcbea',0.009,15);
          glow(g,'#688acf',1.2,0.3);
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
      } else if(isMicrobe(id)) { microbeModel(g,id);
      } else if(['mitochondrion','ribosome','virus','pollen'].indexOf(id)>=0) {
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
          for(j=0;j<16;j++){theta=j*2.39996;var hx=-.42+(j%15)/14*.84,hy=Math.cos(theta)*.155,hz=Math.sin(theta)*.155;
            tube(g,[[hx,hy,hz],[hx+.03,hy*1.4,hz*1.4],[hx+.07,hy*1.6,hz*1.6]],.0025,hairs);
          }
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
      } else if(id==='grand-canyon') {canyonModel(g);
      } else if(id==='everest') {everestModel(g);
      } else if(['reef','chicxulub'].indexOf(id)>=0) {
        var terrain=track(new T.PlaneGeometry(1,1,100,100)), pos=terrain.attributes.position,landColors=[];
        for(j=0;j<pos.count;j++){var tx=pos.getX(j),ty=pos.getY(j),d=Math.sqrt(tx*tx+ty*ty),hgt;
          if(id==='chicxulub')hgt=0.12*Math.exp(-Math.pow((d-0.3)*24,2));
          else hgt=0.035+0.04*Math.sin(tx*50)*Math.cos(ty*38);
          var detail=(Math.sin(tx*74+ty*31)+Math.sin(ty*137-tx*59))*.003;
          hgt+=detail;pos.setZ(j,hgt);
          var lc=new T.Color(id==='reef'?'#477c73':'#945c3c').convertSRGBToLinear();
          if(id==='reef')lc.lerp(new T.Color('#a7a177').convertSRGBToLinear(),clamp(hgt*9,0,1));
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
      if(id==='grand-canyon'){
        g.updateMatrix();var path=CANYON_PATH.points.map(function(p){return new T.Vector3(p[0],.0002,p[1]).applyMatrix4(g.matrix);});
        var routeGeo=track(new T.BufferGeometry().setFromPoints(path)),route=new T.Line(routeGeo,track(new T.LineDashedMaterial({color:'#b2ddcf',dashSize:.018,gapSize:.008,transparent:true,opacity:.85,depthTest:false,depthWrite:false})));
        route.computeLineDistances();ruler.add(route);
      } else if(axis==='y') {
        var rulerX=bounds.max.x/extent+.16;
        rod(ruler,[rulerX,-0.5,0],[rulerX,0.5,0],0.0015,rulerMat);
        [-0.5,0.5].forEach(function(y){rod(ruler,[rulerX-.04,y,0],[rulerX+.04,y,0],0.0015,rulerMat);});
      } else {
        var rulerY=id==='sun'?-.66:bounds.min.y/extent-.16;
        rod(ruler,[-0.5,rulerY,0],[0.5,rulerY,0],0.0015,rulerMat);
        [-0.5,0.5].forEach(function(x){rod(ruler,[x,rulerY-.04,0],[x,rulerY+.04,0],0.0015,rulerMat);});
      }
      ruler.traverse(function(n){n.castShadow=n.receiveShadow=false;n.renderOrder=100;});
      root.add(ruler);root.userData.ruler=ruler;
      root.userData.materials=[];g.traverse(function(n){if(n.material){n.userData.baseOpacity=n.material.opacity;n.userData.baseTransparent=n.material.transparent;if(n.material.uniforms&&n.material.uniforms.uOpacity)n.userData.baseUniformOpacity=n.material.uniforms.uOpacity.value;root.userData.materials.push(n);}});
      root.userData.resources=Array.from(resources).filter(function(r){return !previousResources.has(r);});
      space.add(root);models[id]=root;if(id==='human')loadHumanSurface(root);return root;
    }
    function trimModelCache() {
      var cached=Object.keys(models), evict=cached.filter(function(id){return !models[id].visible;}).sort(function(a,b){return models[a].userData.lastSeen-models[b].userData.lastSeen;});
      while(cached.length>10&&evict.length){var oldId=evict.shift(),old=models[oldId];old.userData.model.userData.released=true;space.remove(old);old.userData.resources.forEach(function(r){r.dispose();resources.delete(r);});delete models[oldId];cached.pop();}
    }
    function paintComparison(state, width, height) {
      var pair = state.comparison, visible = [], list = pair.a.id === pair.b.id ? [pair.a] : [pair.a, pair.b];
      activeCamera = comparisonCamera; cameraSettling = false; orbitGoal = null; paintCount++;
      scene.background = new T.Color(state.contrast ? '#000000' : '#101f2a'); scene.fog = null;
      ground.visible = garden.visible = microBackdrop.visible = leafWorld.visible = floor.visible = motes.visible = false;
      if (focusRing) focusRing.visible = false;
      key.castShadow = false; key.intensity = 1.7; hemisphere.intensity = .55; rim.intensity = .7; fill.intensity = .28;
      studioLight();
      haze.material.opacity = haze2.material.opacity = .025;
      if (markers) Array.prototype.forEach.call(markers.querySelectorAll('[data-scale-marker]'), function (button) { button.hidden = true; });
      Object.keys(models).forEach(function (id) { models[id].visible = false; });
      list.forEach(function (item) {
        var root = models[item.id] || model(item);
        root.visible = true; root.userData.lastSeen = paintCount;
        root.scale.setScalar(3 * item.size / pair.big.size);
        root.userData.ruler.visible = state.measure;
        root.userData.ruler.quaternion.identity();
        root.userData.model.rotation.y = root.userData.initialYaw;lightCanyon(root,state);lightEverest(root,state);
        if (root.userData.model.userData.outerMembrane) root.userData.model.userData.outerMembrane.visible = !state.cutaway;
        if (root.userData.model.userData.microbe) animateMicrobe(root.userData.model,state.cutaway,0);
        if (root.userData.model.userData.solarInterior) animateSun(root.userData.model,state.cutaway,0);
        root.userData.materials.forEach(function (n) {
          if (n.material.transparent !== n.userData.baseTransparent) { n.material.transparent = n.userData.baseTransparent; n.material.needsUpdate = true; }
          n.material.opacity = n.userData.baseOpacity;
          if(n.material.uniforms&&n.material.uniforms.uOpacity)n.material.uniforms.uOpacity.value=n.userData.baseUniformOpacity;
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
      visible.forEach(function(root){lightSolarSystem(root,state);});
      lightAtmospheres(visible);lightVolumes(visible,state,height);trimModelCache(); renderer.render(scene, comparisonCamera);
      canvas.dataset.atlasReady = 'true'; canvas.dataset.atlasObjects = visible.map(function (r) { return r.userData.itemId; }).join(',');
      canvas.dataset.atlasComparison = pair.a.id + ':' + pair.b.id; canvas.dataset.atlasProjection = 'orthographic';
      canvas.dataset.atlasSmallPixels = (3 / pair.ratio * height / (2 * halfH)).toPrecision(5);
      canvas.dataset.atlasExponent = canvas.dataset.atlasTarget = log10(pair.big.size).toFixed(4);
      canvas.dataset.atlasYaw = yaw.toFixed(4); canvas.dataset.atlasZoom = cameraZoom.toFixed(2);
      canvas.dataset.atlasDetail = ''; canvas.dataset.atlasHabitat = 'studio';delete canvas.dataset.atlasRelief;delete canvas.dataset.atlasTerrain;
      canvas.dataset.atlasCutaway = state.cutaway ? 'open' : 'closed';
      if(list.some(function(item){return item.id==='orion-nebula';}))canvas.dataset.atlasCloud=state.nebulaReveal?'revealed':'natural';else delete canvas.dataset.atlasCloud;
      delete canvas.dataset.atlasSunAngle;delete canvas.dataset.atlasIlluminated;delete canvas.dataset.atlasImagery;
      dirty = false;
    }
    var flightRings=null,flightPhase='';
    function paintFlightRings(flight,e,width,height) {
      if(!flightRings){
        flightRings=new T.Group();flightRings.name='scaleMeasurementRings';scene.add(flightRings);
        var points=[];for(var j=0;j<192;j++){var a=j/192*Math.PI*2;points.push(Math.cos(a),Math.sin(a),0);}
        var geometry=track(new T.BufferGeometry());geometry.setAttribute('position',new T.Float32BufferAttribute(points,3));
        for(var i=0;i<5;i++){var line=new T.LineLoop(geometry,track(new T.LineBasicMaterial({color:'#9dc8cf',transparent:true,opacity:0,depthWrite:false})));flightRings.add(line);}
      }
      var progress=flight?flight.progress:0,visible=!!flight&&progress>=.2;
      flightRings.visible=visible;
      if(flightLabels)flightLabels.hidden=!visible;
      if(!visible)return;
      flightRings.quaternion.copy(camera.quaternion);
      var fade=clamp((progress-.2)/.08,0,1)*clamp((1-progress)/.12,0,1),base=Math.ceil(e)-2;
      flightRings.children.forEach(function(line,index){
        var exponent=base+index,radius=1.5*Math.pow(10,exponent-e);
        line.visible=exponent>=log10(flight.destination.size);
        line.scale.setScalar(radius);line.material.opacity=fade*.32*clamp(radius/.2,0,1)*clamp((24-radius)/12,0,1);
        var label=flightLabels&&flightLabels.children[index];if(!label)return;
        markerPoint.set(radius,0,0).applyQuaternion(camera.quaternion).project(camera);
        var x=(markerPoint.x*.5+.5)*width,y=(-markerPoint.y*.5+.5)*height;
        label.hidden=!line.visible||radius<.22||x<20||x>width-65||y<145||y>height-112||fade<.1;
        if(!label.hidden){label.textContent='10'+sup(exponent)+' m';label.style.transform='translate('+x.toFixed(1)+'px,'+y.toFixed(1)+'px)';label.style.opacity=String(fade);}
      });
      var locator=flightLabels&&flightLabels.querySelector('[data-flight-locator]');
      if(locator){
        var diameter=3*Math.pow(10,log10(flight.destination.size)-e)*height/(2*Math.tan(camera.fov*Math.PI/360)*camera.position.length());
        locator.hidden=diameter>=1;
        if(!locator.hidden){markerPoint.set(0,0,0).project(camera);locator.style.transform='translate('+((markerPoint.x*.5+.5)*width).toFixed(1)+'px,'+((-markerPoint.y*.5+.5)*height).toFixed(1)+'px) translate(-50%,-9px)';}
      }
    }
    function paint() {
      if(disposed)return;
      var state=read(),flight=state.flight,departing=!!flight&&flight.progress<.2;
      var cameraNow=performance.now(),cameraDelta=cameraSettling?cameraNow-lastCameraFrame:1000/60,cameraEase=cameraBlend(cameraDelta,.82);lastCameraFrame=cameraNow;
      var phase=flight?(departing?'departure':'descent'):'';
      if(flight){
        clearOrbitHover();
        // Prepare the detailed destination while its parent is still in view.
        if(!models[flight.destination.id])model(flight.destination);
        if(departing){
          var origin=flight.origin;
          state=Object.assign({},state,{exp:flight.from,focusId:origin.itemId,inspectionZoom:origin.zoom*(1+flight.progress*2),detailId:origin.detailId,details:origin.details,showDetails:false,measure:false,neighbors:false,sunAngle:origin.sunAngle,nebulaReveal:origin.nebulaReveal,terrainRelief:origin.terrainRelief,riverKm:origin.riverKm,cutaway:origin.cutaway});
          if(flightPhase!==phase){yaw=origin.yaw;pitch=origin.pitch;cameraZoom=origin.zoom;orbitGoal=null;previousDetail=origin.itemId+':'+origin.detailId+(origin.detailId==='river-journey'?':'+canyonRouteKm(origin.riverKm):'');}
        }else{
          state=Object.assign({},state,{inspectionZoom:1,detailId:'',showDetails:false,measure:false,neighbors:false});
          if(flightPhase!==phase){yaw=0;pitch=.12;cameraZoom=zoomGoal=lastZoomInput=1;orbitGoal=null;cameraAim.set(0,.2,0);}
        }
      }
      flightPhase=phase;
      var riverMoving=false;
      if(state.focusId==='grand-canyon'&&state.detailId==='river-journey'&&!state.comparison){
        var riverGoal=canyonRouteKm(state.riverKm);
        if(state.reduceMotion||previousDetail.indexOf('grand-canyon:river-journey:')!==0)riverTravelKm=riverGoal;
        else riverTravelKm+=(riverGoal-riverTravelKm)*cameraBlend(cameraDelta,.84);
        riverMoving=Math.abs(riverGoal-riverTravelKm)>.01;
        if(!riverMoving)riverTravelKm=riverGoal;
      }
      var e=state.exp,realm=realmAt(e),width=canvas.clientWidth,height=canvas.clientHeight;
      if(!width||!height)return;
      if(flightRings)flightRings.visible=false;
      if(flightLabels)flightLabels.hidden=true;
      canvas.dataset.atlasFlight=phase;
      canvas.dataset.atlasFlightProgress=flight?flight.progress.toFixed(4):'';

      if(state.inspectionZoom!==lastZoomInput){zoomGoal=clamp(state.inspectionZoom||1,1,state.comparison?2.5:inspectionLimit(state.focusId));lastZoomInput=state.inspectionZoom;}
      if(state.focusId==='solar-system'&&!state.reduceMotion&&!state.comparison)cameraZoom*=Math.pow(zoomGoal/cameraZoom,cameraEase);
      else cameraZoom+= (zoomGoal-cameraZoom)*(state.reduceMotion||state.comparison?1:cameraEase);
      if(Math.abs(zoomGoal-cameraZoom)<.0001)cameraZoom=zoomGoal;
      var ratio=renderer.getPixelRatio();if(canvas.width!==Math.floor(width*ratio)||canvas.height!==Math.floor(height*ratio)){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
      if (state.comparison) { clearOrbitHover();paintComparison(state, width, height); return; }
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
      studioLight();
      haze.material.opacity=cosmic?.065:.08;haze2.material.opacity=cosmic?.045:.04;
      var candidates=flight&&!departing?[flight.destination]:state.items.filter(function(it){return Math.abs(log10(it.size)-e)<1.9;}).sort(function(a,b){return Math.abs(log10(a.size)-e)-Math.abs(log10(b.size)-e);});
      if(!state.neighbors)candidates=candidates.slice(0,1);
      var focal=candidates[0],close=flight&&!departing?1:focal?1-clamp(Math.abs(log10(focal.size)-e)*3,0,1):0;
      if(focal&&focal.id==='blue-whale'){
        ground.visible=garden.visible=false;key.castShadow=false;scene.background.set(state.contrast?'#000000':'#071d28');scene.fog=null;
        motes.visible=!state.contrast;motes.material.color.set('#78aab8');motes.material.size=.06;hemisphere.intensity=.4;
      }
      var distance=6.8+(focal&&focal.id==='dna'?6.7*close:focal&&focal.id==='hair'?7.5*close:focal&&focal.id==='ecoli'?1.8*close:0);
      if(focal&&focal.id==='orion-nebula'){distance-=1.35*close;scene.background.set(state.contrast?'#000000':'#080d19');haze.material.opacity=.025;haze2.material.opacity=.02;}
      if(focal&&focal.id==='milkyway'){distance-=.7*close;scene.background.set(state.contrast?'#000000':'#070b14');haze.material.opacity=.015;haze2.material.opacity=.01;}
      if(focal&&focal.id==='solar-system'){distance-=1.1*close*(1-clamp((cameraZoom-1)/3,0,1));scene.background.set(state.contrast?'#000000':'#070f19');haze.material.opacity=.008;haze2.material.opacity=.008;}
      if(focal&&focal.id==='grand-canyon'){
        scene.background.set(state.contrast?'#000000':'#172935');scene.fog=new T.Fog(state.contrast?'#000000':'#172935',11,28);
        motes.visible=false;ground.visible=garden.visible=false;haze.material.opacity=.025;haze2.material.opacity=.015;
        hemisphere.intensity=.5;rim.intensity=.2;fill.intensity=.15;key.intensity=1.45;key.color.set('#ffe0b6');key.castShadow=true;key.shadow.normalBias=.001;
        distance-=2.4*close;
      }
      if(focal&&focal.id==='everest'){
        scene.background.set(state.contrast?'#000000':'#1c3446');scene.fog=new T.Fog(state.contrast?'#000000':'#1c3446',15,35);
        motes.visible=ground.visible=garden.visible=false;haze.material.opacity=.018;haze2.material.opacity=.01;
        hemisphere.intensity=.46;rim.intensity=.28;fill.intensity=.12;key.intensity=1.8;key.color.set('#fff0d5');key.castShadow=true;key.shadow.normalBias=.002;
        var alpineAngle=(clamp(state.sunAngle===undefined?45:state.sunAngle,0,180)-90)*Math.PI/180;
        key.position.set(Math.sin(alpineAngle)*7,4,Math.cos(alpineAngle)*7);key.target.position.set(0,1,0);distance+=3*close;
      }
      // Leave a quiet band for the heading and fit narrow portrait screens.
      distance*=Math.max(1,.95/camera.aspect);
      distance/=cameraZoom;
      camera.near=focal&&focal.id==='solar-system'?.002:.05;camera.updateProjectionMatrix();
      var detailKey=state.focusId+':'+state.detailId+(state.detailId==='river-journey'?':'+canyonRouteKm(state.riverKm):''),detailChanged=detailKey!==previousDetail;
      if(detailChanged)orbitGoal=state.detailId?{yaw:0,pitch:.12}:state.focusId==='everest'?{yaw:.2,pitch:.5}:null;
      var occupied=[], visible=[];paintCount++;
      Object.keys(models).forEach(function(id){models[id].visible=false;});
      candidates.forEach(function(it){
        var delta=log10(it.size)-e;
        if(occupied.some(function(d){return Math.abs(d-delta)<0.27;}))return;
        occupied.push(delta);var root=models[it.id]||model(it), scale=3*Math.pow(10,delta);
        root.visible=true;root.userData.lastSeen=paintCount;root.scale.setScalar(scale);root.userData.ruler.visible=occupied.length===1&&state.measure;
        if(it.group==='cosmic' && it.dim!=='distance'&&!isPlanetaryWorld(it.id)&&it.id!=='sun'&&it.id!=='orion-nebula'&&it.id!=='milkyway'&&it.id!=='solar-system')root.userData.model.rotation.y=root.userData.initialYaw+time*0.018;
        if(root.userData.model.userData.starMaterial)root.userData.model.userData.starMaterial.uniforms.uTime.value=time;
        if(root.userData.model.userData.outerMembrane)root.userData.model.userData.outerMembrane.visible=!state.cutaway;
        lightCanyon(root,state);lightEverest(root,state);
        if(root.userData.model.userData.microbe)animateMicrobe(root.userData.model,state.cutaway,time);
        if(root.userData.model.userData.solarInterior)animateSun(root.userData.model,state.cutaway,time);
        var shoulder = Math.sign(delta) * scale * 0.65 * Math.min(1, Math.abs(delta) * 5);
        root.position.set(delta*8.5+shoulder,Math.sin(delta*2)*0.3,-Math.abs(delta)*0.75-scale*0.25*Math.min(1,Math.abs(delta)*5));
        // Keep the measured geometry proportional; only visibility changes at
        // the edge of the current scale neighborhood.
        if(flight&&!departing)root.position.set(0,0,0);
        var opacity=flight?(departing?1-Math.pow(clamp(flight.progress/.2,0,1),2):1):clamp((1.9-Math.abs(delta))*2,0,1);
        root.userData.materials.forEach(function(n){var transparent=n.userData.baseTransparent||opacity<1;if(n.material.transparent!==transparent){n.material.transparent=transparent;n.material.needsUpdate=true;}n.material.opacity=n.userData.baseOpacity*opacity;if(n.material.uniforms&&n.material.uniforms.uOpacity)n.material.uniforms.uOpacity.value=n.userData.baseUniformOpacity*opacity;});
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
      var planetary=!!activeRoot&&isPlanetaryWorld(state.focusId)&&close>.8;
      var alpine=!!activeRoot&&state.focusId==='everest'&&close>.8;
      var imagery=alpine?activeRoot.userData.model.userData.everest.status:planetary?(activeRoot.userData.model.userData.imageryReady?'ready':activeRoot.userData.model.userData.imageryError?'failed':'loading'):'';
      var imageryKey=state.focusId+':'+imagery;
      if(imageryKey!==lastImagery){lastImagery=imageryKey;if(onImagery)onImagery({id:state.focusId,status:imagery});}
      var selected=state.details.filter(function(d){return d.id===state.detailId;})[0];
      if(!activeRoot||close<.8)selected=null;
      if(selected&&(selected.surface||selected.terrain)&&imagery!=='ready')selected=null;
      selected=terrainDetail(activeRoot,selected);
      if(selected&&selected.id==='river-journey')selected=Object.assign({},selected,{at:canyonRoutePoint(riverTravelKm),view:canyonRouteView(riverTravelKm)});
      scene.updateMatrixWorld(true);aimGoal.set(0,alpine?.9:.2,0);
      if(planetary){globeCenter.set(0,0,0);activeRoot.userData.model.localToWorld(globeCenter);}
      if(selected){aimGoal.fromArray(selected.viewAim||selected.at);activeRoot.userData.model.localToWorld(aimGoal);}
      if(selected&&selected.view&&(detailChanged||riverMoving)){lightView.fromArray(selected.view).transformDirection(activeRoot.userData.model.matrixWorld);orbitGoal={yaw:Math.atan2(lightView.x,lightView.z),pitch:clamp(Math.asin(lightView.y),-1.1,1.1)};}
      if(selected&&selected.surface&&detailChanged){lightView.copy(aimGoal).sub(globeCenter).normalize();orbitGoal={yaw:Math.atan2(lightView.x,lightView.z),pitch:clamp(Math.asin(lightView.y),-1.1,1.1)};}
      // A texture can arrive after a saved view. Do not replace its camera angle.
      if(!state.detailId||selected)previousDetail=detailKey;
      if(orbitGoal){var ease=state.reduceMotion?1:cameraEase;yaw=turnAngle(yaw+turnAngle(orbitGoal.yaw-yaw)*ease);pitch+=(orbitGoal.pitch-pitch)*ease;if(Math.abs(turnAngle(orbitGoal.yaw-yaw))+Math.abs(orbitGoal.pitch-pitch)<.0001){yaw=orbitGoal.yaw;pitch=orbitGoal.pitch;orbitGoal=null;}}
      cameraAim.lerp(aimGoal,state.reduceMotion?1:cameraEase);
      var aimMoving=cameraAim.distanceToSquared(aimGoal)>.000001;
      if(!aimMoving)cameraAim.copy(aimGoal);
      cameraSettling=aimMoving||!!orbitGoal||cameraZoom!==zoomGoal||riverMoving;
      var cameraPitch=ground.visible?Math.max(-.1,pitch):pitch;
      camera.position.set(Math.sin(yaw)*Math.cos(cameraPitch)*distance,Math.sin(cameraPitch)*distance,Math.cos(yaw)*Math.cos(cameraPitch)*distance).add(cameraAim);
      if(planetary){
        lightView.copy(camera.position).sub(globeCenter);var minimumDistance=activeRoot.scale.x*.5+.12;
        if(lightView.length()<minimumDistance)camera.position.copy(globeCenter).add(lightView.normalize().multiplyScalar(minimumDistance));
        lightView.copy(camera.position).sub(globeCenter).normalize();lightSide.set(0,1,0).cross(lightView).normalize();
        var sunRadians=clamp(state.sunAngle===undefined?45:state.sunAngle,0,180)*Math.PI/180;
        sunDirection.copy(lightView).multiplyScalar(Math.cos(sunRadians)).addScaledVector(lightSide,Math.sin(sunRadians));
        key.position.copy(globeCenter).addScaledVector(sunDirection,10);key.target.position.copy(globeCenter);
        hemisphere.intensity=.008;rim.intensity=0;fill.intensity=0;key.intensity=1.55;
      }
      visible.forEach(function(root){lightSolarSystem(root,state);});
      lightAtmospheres(visible);camera.lookAt(cameraAim);camera.updateMatrixWorld(true);
      cameraSettling=lightVolumes(visible,state,height)||cameraSettling;
      // A globe's diameter is independent of orientation. Keep its ruler in
      // the viewing plane so a polar inspection cannot project it across land.
      visible.forEach(function(root){if(isPlanetaryWorld(root.userData.itemId)||root.userData.itemId==='sun'||root.userData.itemId==='orion-nebula'||root.userData.itemId==='milkyway'||root.userData.itemId==='solar-system')root.userData.ruler.quaternion.copy(camera.quaternion);});
      if(!focusRing){focusRing=ring(scene,.085,'#d7e9bd',0);focusRing.material.depthTest=false;focusRing.material.depthWrite=false;focusRing.renderOrder=101;focusRing.castShadow=focusRing.receiveShadow=false;}
      focusRing.visible=!!selected&&selected.id!=='river-journey'&&state.showDetails&&!(state.focusId==='solar-system'&&selected.id==='inner-orbits');
      if(selected&&selected.surface)focusRing.visible=focusRing.visible&&lightView.copy(aimGoal).sub(globeCenter).dot(lightSide.copy(camera.position).sub(aimGoal))>0;
      if(selected&&state.focusId==='sun')focusRing.visible=focusRing.visible&&solarFeatureVisible(activeRoot,selected,state.cutaway);
      if(selected){focusRing.position.fromArray(selected.at);activeRoot.userData.model.localToWorld(focusRing.position);focusRing.quaternion.copy(camera.quaternion);focusRing.scale.setScalar(distance*.075);}
      var solarLabels=[];
      if(markers)Array.prototype.slice.call(markers.querySelectorAll('[data-scale-marker]')).sort(function(a,b){return state.focusId==='solar-system'||state.focusId==='grand-canyon'?Number(b.dataset.scaleMarker===state.detailId)-Number(a.dataset.scaleMarker===state.detailId):0;}).forEach(function(button){
        var detail=terrainDetail(activeRoot,state.details.filter(function(d){return d.id===button.dataset.scaleMarker;})[0]);
        var available=!!detail&&detail.marker!==false&&!!activeRoot&&close>.8&&(detail.cutaway===undefined||detail.cutaway===state.cutaway)&&state.showDetails;
        if(available&&detail.terrain)available=imagery==='ready';
        if(available&&state.focusId==='sun')available=solarFeatureVisible(activeRoot,detail,state.cutaway);
        if(available&&state.focusId==='solar-system')available=(detail.id===state.detailId||cameraZoom>=(detail.minZoom||0))&&cameraZoom<=(detail.maxZoom||32);
        if(available){markerPoint.fromArray(detail.at);activeRoot.userData.model.localToWorld(markerPoint);if(detail.surface)available=imagery==='ready'&&lightView.copy(markerPoint).sub(globeCenter).dot(lightSide.copy(camera.position).sub(markerPoint))>0;markerPoint.project(camera);var px=(markerPoint.x*.5+.5)*width,py=(-markerPoint.y*.5+.5)*height;available=available&&markerPoint.z>-1&&markerPoint.z<1&&px>24&&px<width-24&&py>125&&py<height-65;
          if(available){var offset=((isMicrobe(state.focusId)||state.focusId==='sun'||state.focusId==='orion-nebula'||state.focusId==='milkyway'||state.focusId==='grand-canyon')&&detail.id===state.detailId||state.focusId==='solar-system')&&py<height-110?44:0;
            if(state.focusId==='solar-system'){var labelWidth=Math.max(44,detail.label.length*7+24),rect={x:px-labelWidth/2,y:py+offset-22,w:labelWidth,h:44};available=rect.x>4&&rect.x+rect.w<width-4&&rect.y>160&&(detail.id===state.detailId||!solarLabels.some(function(r){return rect.x<r.x+r.w+6&&rect.x+rect.w+6>r.x&&rect.y<r.y+r.h+6&&rect.y+rect.h+6>r.y;}));if(available)solarLabels.push(rect);}if(state.focusId==='grand-canyon'){var terrainRect={x:px-22,y:py+offset-22,w:44,h:44};available=!solarLabels.some(function(r){return terrainRect.x<r.x+r.w+6&&terrainRect.x+50>r.x&&terrainRect.y<r.y+r.h+6&&terrainRect.y+50>r.y;});if(available)solarLabels.push(terrainRect);}button.dataset.offset=offset?'true':'false';button.style.transform='translate('+px.toFixed(1)+'px,'+(py+offset).toFixed(1)+'px) translate(-50%,-50%)';}}
        button.hidden=!available;
      });
      if(hoveredOrbit){
        if(state.focusId!=='solar-system'||state.comparison||cameraSettling||hoverExp!==state.exp||hoverDetail!==state.detailId)clearOrbitHover();
        else {
          if(!hoverRing){hoverRing=mesh(scene,track(new T.TorusGeometry(1,.025,6,96)),track(new T.MeshBasicMaterial({color:'#8edbe6',transparent:true,opacity:.9})));hoverRing.material.depthTest=false;hoverRing.material.depthWrite=false;hoverRing.renderOrder=102;hoverRing.castShadow=hoverRing.receiveShadow=false;}
          hoveredOrbit.body.getWorldPosition(hoverRing.position);hoverRing.quaternion.copy(camera.quaternion);
          hoveredOrbit.body.getWorldScale(hoverPoint);var radius=hoverPoint.x*(hoveredOrbit.id==='saturn-orbit'?1.25:.65);
          hoverRing.scale.setScalar(Math.max(radius,hoverRing.position.distanceTo(camera.position)*.016));hoverRing.visible=true;
        }
      }
      if(flight)paintFlightRings(flight,e,width,height);
      renderer.render(scene,camera);
      canvas.dataset.atlasReady='true';canvas.dataset.atlasObjects=visible.map(function(o){return o.userData.itemId;}).join(',');
      canvas.dataset.atlasExponent=e.toFixed(4);canvas.dataset.atlasYaw=yaw.toFixed(4);
      canvas.dataset.atlasTarget=state.target.toFixed(4);
      canvas.dataset.atlasZoom=cameraZoom.toFixed(2);
      canvas.dataset.atlasCutaway=state.cutaway?'open':'closed';
      canvas.dataset.atlasDetail=selected?selected.id:'';canvas.dataset.atlasAim=cameraAim.toArray().map(function(v){return v.toFixed(4);}).join(',');
      if(selected&&selected.id==='river-journey'){canvas.dataset.atlasRiverKm=String(canyonRouteKm(state.riverKm));canvas.dataset.atlasRiverTravelKm=riverTravelKm.toFixed(2);}else {delete canvas.dataset.atlasRiverKm;delete canvas.dataset.atlasRiverTravelKm;}
      canvas.dataset.atlasHabitat=focal&&focal.id==='grand-canyon'?'canyon':alpine?'alpine':isLeafWorld?'leaf':'realm';
      if(alpine)canvas.dataset.atlasTerrain=imagery;else delete canvas.dataset.atlasTerrain;
      if(focal&&focal.id==='grand-canyon')canvas.dataset.atlasRelief=String(state.terrainRelief||8);else delete canvas.dataset.atlasRelief;
      canvas.dataset.atlasSurface=visible[0]&&visible[0].userData.model.userData.surfaceReady?'detailed':'procedural';
      if(state.focusId==='orion-nebula')canvas.dataset.atlasCloud=state.nebulaReveal?'revealed':'natural';else delete canvas.dataset.atlasCloud;
      if(planetary){canvas.dataset.atlasSunAngle=String(state.sunAngle);canvas.dataset.atlasIlluminated=String(illuminatedDisc(state.sunAngle));canvas.dataset.atlasImagery=imagery;}
      else {delete canvas.dataset.atlasSunAngle;delete canvas.dataset.atlasIlluminated;delete canvas.dataset.atlasImagery;}
      dirty=false;
    }
    function schedule(){if(!disposed&&!frame&&inView&&!document.hidden)frame=requestAnimationFrame(tick);}
    function tick(ts){frame=0;if(disposed||document.hidden||!inView)return;var state=read();if(state.motion)time+=last?Math.min(0.05,(ts-last)/1000):0;last=ts;if(dirty||state.motion||cameraSettling)paint();if(state.motion||cameraSettling)schedule();}
    function invalidate(){dirty=true;schedule();}
    function interruptApproach(){clearOrbitHover();orbitGoal=null;var state=read();riverTravelKm=canyonRouteKm(state.riverKm);previousDetail=state.focusId+':'+state.detailId+(state.detailId==='river-journey'?':'+canyonRouteKm(state.riverKm):'');}
    function down(ev){
      if(ev.button!==0||read().flight)return;
      interruptApproach();
      if(fingers.size>=2&&!fingers.has(ev.pointerId))return;
      clearOrbitHover();fingers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});canvas.setPointerCapture(ev.pointerId);canvas.focus({preventScroll:true});
      if(fingers.size===1)drag={id:ev.pointerId,x:ev.clientX,y:ev.clientY,startX:ev.clientX,startY:ev.clientY,moved:false};
      else if(fingers.size===2){var pts=Array.from(fingers.values());pinch={distance:Math.max(1,Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)),zoom:cameraZoom};drag=null;}
    }
    var hoveredOrbit=null,hoverRing=null,hoverPoint=new T.Vector3(),hoverExp=0,hoverDetail='';
    function clearOrbitHover(){
      hoveredOrbit=null;if(hoverCard)hoverCard.hidden=true;if(hoverRing)hoverRing.visible=false;
      canvas.style.cursor='grab';
    }
    function orbitalTarget(ev){
      var state=read(),root=models['solar-system'];
      if(state.comparison||state.focusId!=='solar-system'||!root||!root.visible||Math.abs(log10(9e12)-state.exp)>.06)return null;
      var system=root.userData.model.userData.solarSystem,rect=canvas.getBoundingClientRect(),x=ev.clientX-rect.left,y=ev.clientY-rect.top;
      var targets=system.bodies.filter(function(body,index){return index>=4||cameraZoom>=6;});
      pointer.set(x/rect.width*2-1,-y/rect.height*2+1);ray.setFromCamera(pointer,activeCamera);
      var hits=ray.intersectObjects(targets,true);
      if(hits.length){var body=hits[0].object;while(body&&!body.userData.planetId)body=body.parent;if(body)return {id:body.userData.planetId+'-orbit',body:body};}
      // Give small worlds a useful touch target without changing their geometry.
      var nearest=null,best=Infinity,tolerance=ev.pointerType==='touch'?22:12;
      targets.forEach(function(body){
        body.getWorldPosition(hoverPoint).project(activeCamera);
        if(hoverPoint.z<=-1||hoverPoint.z>=1)return;
        var dx=(hoverPoint.x*.5+.5)*rect.width-x,dy=(-hoverPoint.y*.5+.5)*rect.height-y,score=dx*dx+dy*dy;
        if(score<tolerance*tolerance&&score<best){best=score;nearest={id:body.userData.planetId+'-orbit',body:body};}
      });
      if(!nearest&&cameraZoom<6){
        system.star.getWorldPosition(hoverPoint).project(activeCamera);
        var dx=(hoverPoint.x*.5+.5)*rect.width-x,dy=(-hoverPoint.y*.5+.5)*rect.height-y;
        if(hoverPoint.z>-1&&hoverPoint.z<1&&dx*dx+dy*dy<tolerance*tolerance)nearest={id:'inner-orbits',body:system.star};
      }
      return nearest;
    }
    function hoverOrbit(ev){
      if(ev.pointerType==='touch'||fingers.size||read().flight)return;
      var hit=orbitalTarget(ev),state=read(),detail=hit&&state.details.filter(function(d){return d.id===hit.id;})[0];
      if(!detail){if(hoveredOrbit){clearOrbitHover();invalidate();}return;}
      if(hoveredOrbit&&hoveredOrbit.id===hit.id)return;
      hoveredOrbit=hit;hoverExp=state.exp;hoverDetail=state.detailId;
      if(hoverCard){hoverCard.textContent=detail.hint||detail.label;hoverCard.hidden=false;}
      canvas.style.cursor='pointer';invalidate();
    }
    function leaveOrbit(){if(!fingers.size&&hoveredOrbit){clearOrbitHover();invalidate();}}
    function turnAngle(angle){return Math.atan2(Math.sin(angle),Math.cos(angle));}
    function move(ev){
      if(!fingers.has(ev.pointerId)){hoverOrbit(ev);return;}fingers.set(ev.pointerId,{x:ev.clientX,y:ev.clientY});
      if(pinch&&fingers.size>=2){var pts=Array.from(fingers.values());cameraZoom=zoomGoal=clamp(pinch.zoom*Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y)/pinch.distance,1,read().comparison?2.5:inspectionLimit(read().focusId));invalidate();return;}
      if(!drag||drag.id!==ev.pointerId)return;var dx=ev.clientX-drag.x,dy=ev.clientY-drag.y;if(Math.hypot(ev.clientX-drag.startX,ev.clientY-drag.startY)>5)drag.moved=true;yaw=turnAngle(yaw-dx*.005);pitch=clamp(pitch+dy*.005,-1.1,1.1);drag.x=ev.clientX;drag.y=ev.clientY;invalidate();
    }
    function finishPointer(ev,allowPick){
      if(!fingers.has(ev.pointerId))return;
      var didMove=!!pinch||!drag||drag.moved;fingers.delete(ev.pointerId);
      if(pinch){cameraZoom=zoomGoal=Math.round(cameraZoom*10)/10;if(inspect)inspect(cameraZoom);pinch=null;invalidate();}
      drag=null;
      if(fingers.size===1){var entry=Array.from(fingers.entries())[0],p=entry[1];drag={id:entry[0],x:p.x,y:p.y,startX:p.x,startY:p.y,moved:true};}
      if(canvas.hasPointerCapture(ev.pointerId))canvas.releasePointerCapture(ev.pointerId);if(didMove||!allowPick)return;
      var state=read();if(state.focusId==='solar-system'&&!state.comparison){var target=orbitalTarget(ev);if(target)pick('solar-system',target.id);return;}
      var rect=canvas.getBoundingClientRect();pointer.set((ev.clientX-rect.left)/rect.width*2-1,-(ev.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,activeCamera);
      var hits=ray.intersectObjects(Object.keys(models).map(function(id){return models[id];}).filter(function(m){return m.visible;}),true);
      for(var i=0;i<hits.length;i++){if(!hits[i].object.isMesh)continue;var obj=hits[i].object;while(obj&&!obj.userData.itemId)obj=obj.parent;if(obj){pick(obj.userData.itemId);break;}}
    }
    function up(ev){finishPointer(ev,true);}
    function cancel(ev){finishPointer(ev,false);}
    function visibility(){last=0;if(document.hidden){if(frame)cancelAnimationFrame(frame);frame=0;}else invalidate();}
    function lost(ev){ev.preventDefault();if(!disposed)fail();}
    canvas.addEventListener('pointerleave',leaveOrbit);
    canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('webglcontextlost',lost);
    document.addEventListener('visibilitychange',visibility);
    var resize=window.ResizeObserver?new ResizeObserver(invalidate):null;if(resize)resize.observe(canvas.parentElement);
    // A quick scroll can queue both exit and entry. Use the newest entry so
    // an earlier exit cannot leave a visible canvas suspended indefinitely.
    var intersection=window.IntersectionObserver?new IntersectionObserver(function(entries){entries.forEach(function(entry){if(entry.target===canvas)inView=entry.isIntersecting;});if(inView)invalidate();else {if(frame)cancelAnimationFrame(frame);frame=0;last=0;}}):null;if(intersection)intersection.observe(canvas);
    try { paint(); } catch(err) { dispose(); throw err; }
    schedule();
    function dispose(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);if(resize)resize.disconnect();if(intersection)intersection.disconnect();document.removeEventListener('visibilitychange',visibility);
      canvas.removeEventListener('pointerleave',leaveOrbit);clearOrbitHover();
      canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',up);canvas.removeEventListener('pointercancel',cancel);canvas.removeEventListener('lostpointercapture',cancel);canvas.removeEventListener('webglcontextlost',lost);
      resources.forEach(function(r){r.dispose();});if(key.shadow.map)key.shadow.map.dispose();renderer.dispose();renderer.forceContextLoss();delete canvas.dataset.atlasReady;
    }
    return { update:invalidate, orbit:function(x,y){interruptApproach();yaw=turnAngle(yaw+x);pitch=clamp(pitch+y,-1.1,1.1);invalidate();}, reset:function(){interruptApproach();yaw=0;pitch=0.12;cameraZoom=zoomGoal=1;invalidate();},
      approach:function(){previousDetail='';invalidate();},
      capture:function(){return {yaw:orbitGoal?orbitGoal.yaw:yaw,pitch:orbitGoal?orbitGoal.pitch:pitch};},
      restore:function(view){riverTravelKm=canyonRouteKm(view.riverKm);orbitGoal=null;yaw=turnAngle(view.yaw);pitch=clamp(view.pitch,-1.1,1.1);cameraZoom=zoomGoal=view.zoom;lastZoomInput=view.zoom;previousDetail=read().focusId+':'+view.detailId+(view.detailId==='river-journey'?':'+canyonRouteKm(view.riverKm):'');invalidate();},
      retryTerrain:function(){var root=models.everest;if(root&&root.userData.model.userData.everest)root.userData.model.userData.everest.retry();},
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
      var initialInquiry = React.useMemo(function () {
        var stored = readInquiry(slice.inquiryDraft);
        return stored && stored.id ? stored : freshInquiry('home', items.filter(function (it) { return it.id === 'human'; })[0], items.filter(function (it) { return it.id === 'earth'; })[0]);
      }, []);
      var _pair = React.useState(initialInquiry); var pair = _pair[0], setPair = _pair[1];
      var _guess = React.useState(initialInquiry.guess); var guess = _guess[0], setGuess = _guess[1];
      var _revealed = React.useState(initialInquiry.revealed); var revealed = _revealed[0], setRevealed = _revealed[1];
      var _reflection = React.useState(initialInquiry.reflection); var reflection = _reflection[0], setReflection = _reflection[1];
      var _investigations = React.useState(function () { return readInvestigations(slice.investigations); }); var investigations = _investigations[0], setInvestigations = _investigations[1];
      var _themeChoice = React.useState(initialInquiry.theme); var themeChoice = _themeChoice[0], setThemeChoice = _themeChoice[1];
      var _inquiryMessage = React.useState(''); var inquiryMessage = _inquiryMessage[0], setInquiryMessage = _inquiryMessage[1];
      var inquiryPanelRef = React.useRef(null), inquiryHistoryRef = React.useRef(null);
      React.useEffect(function () {
        updateSlice(function (cur) { cur.inquiryDraft = Object.assign({}, pair, { guess: guess, revealed: revealed, reflection: reflection }); });
      }, [pair, guess, revealed, reflection]);

      var initialScaling = React.useMemo(function () { return readScaling(slice.scalingDraft, false); }, []);
      var _scalingFactor = React.useState(initialScaling.factor); var scalingFactor = _scalingFactor[0], setScalingFactor = _scalingFactor[1];
      var _scalingReflection = React.useState(initialScaling.reflection); var scalingReflection = _scalingReflection[0], setScalingReflection = _scalingReflection[1];
      var _scalingReference = React.useState(initialScaling.reference); var scalingReference = _scalingReference[0], setScalingReference = _scalingReference[1];
      var _scalingRecord = React.useState(function () { return readScaling(slice.scalingRecord, true); }); var scalingRecord = _scalingRecord[0], setScalingRecord = _scalingRecord[1];
      var _scalingMessage = React.useState(''); var scalingMessage = _scalingMessage[0], setScalingMessage = _scalingMessage[1];
      var scalingPanelRef = React.useRef(null);
      var scalingModel = geometricScale(scalingFactor);
      React.useEffect(function () {
        updateSlice(function (cur) { cur.scalingDraft = { factor: scalingFactor, reflection: scalingReflection, reference: scalingReference }; });
      }, [scalingFactor, scalingReflection, scalingReference]);

      var _drawingDraft = React.useState(function () { return readDrawing(slice.drawingDraft, false); }); var drawingDraft = _drawingDraft[0], setDrawingDraft = _drawingDraft[1];
      var _drawingRecord = React.useState(function () { return readDrawing(slice.drawingRecord, true); }); var drawingRecord = _drawingRecord[0], setDrawingRecord = _drawingRecord[1];
      var _drawingMessage = React.useState(''); var drawingMessage = _drawingMessage[0], setDrawingMessage = _drawingMessage[1];
      var drawingPanelRef = React.useRef(null);
      var drawing = drawingModel(inquiryMeasurement(drawingDraft.reference), inquiryMeasurement(drawingDraft.target), drawingDraft.size, drawingDraft.unit);
      React.useEffect(function () { updateSlice(function (cur) { cur.drawingDraft = drawingDraft; }); }, [drawingDraft]);

      var canvasRef = React.useRef(null);
      var atlasCanvasRef = React.useRef(null);
      var markerLayerRef = React.useRef(null),orbitHoverRef=React.useRef(null);
      var _atlasRoute=React.useState([]);var atlasRoute=_atlasRoute[0],setAtlasRoute=_atlasRoute[1];
      var _scaleFlight=React.useState(null);var scaleFlight=_scaleFlight[0],setScaleFlight=_scaleFlight[1];
      var scaleFlightRef=React.useRef(null),flightPanelRef=React.useRef(null),flightLabelsRef=React.useRef(null);
      React.useEffect(function(){if(scaleFlight&&atlasCanvasRef.current)atlasCanvasRef.current.focus({preventScroll:true});},[scaleFlight]);
      var comparisonLayerRef = React.useRef(null);
      var atlasRef = React.useRef(null);
      var _viewMode = React.useState('atlas'); var viewMode = _viewMode[0], setViewMode = _viewMode[1];
      var viewModeRef = React.useRef(viewMode); viewModeRef.current = viewMode;
      var _atlasStatus = React.useState('loading'); var atlasStatus = _atlasStatus[0], setAtlasStatus = _atlasStatus[1];
      var _ambient = React.useState(slice.ambient !== false); var ambient = _ambient[0], setAmbient = _ambient[1];
      var _neighbors = React.useState(slice.atlasNeighbors === true); var neighbors = _neighbors[0], setNeighbors = _neighbors[1];
      var _measure = React.useState(true); var measure = _measure[0], setMeasure = _measure[1];
      var _inspectionZoom = React.useState(1); var inspectionZoom = _inspectionZoom[0], setInspectionZoom = _inspectionZoom[1];
      var _sunAngle=React.useState(45);var sunAngle=_sunAngle[0],setSunAngle=_sunAngle[1];
      var _nebulaReveal=React.useState(false);var nebulaReveal=_nebulaReveal[0],setNebulaReveal=_nebulaReveal[1];
      var _terrainRelief=React.useState(8);var terrainRelief=_terrainRelief[0],setTerrainRelief=_terrainRelief[1];
      var _riverKm=React.useState(0);var riverKm=_riverKm[0],setRiverKm=_riverKm[1];
      var riverSliderRef=React.useRef(null);
      var _planetImagery=React.useState({id:'',status:''});var planetImagery=_planetImagery[0],setPlanetImagery=_planetImagery[1];
      var _detailId=React.useState('');var detailId=_detailId[0],setDetailId=_detailId[1];
      var _showDetails=React.useState(true);var showDetails=_showDetails[0],setShowDetails=_showDetails[1];
      var _featureNoteOpen=React.useState(false);var featureNoteOpen=_featureNoteOpen[0],setFeatureNoteOpen=_featureNoteOpen[1];
      var featureButtonRef=React.useRef(null);
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
      var details=atlasDetails(focusId,S,terrainRelief,riverKm),selectedDetail=details.filter(function(d){return d.id===detailId;})[0];
      var availableDetails=details.filter(function(d){return !(d.surface||d.terrain)||(planetImagery.id===focusId&&planetImagery.status==='ready');});
      React.useEffect(function(){setFeatureNoteOpen(false);},[focusId,viewMode,comparisonActive]);
      var observationDetail = viewMode === 'atlas' && selectedDetail ? selectedDetail.id : '';
      var currentObservationKey = observationKey(focused.id, observationDetail);
      var savedObservation = observations.filter(function (entry) { return observationKey(entry.itemId, entry.detailId) === currentObservationKey; })[0];
      var observationDraft = Object.prototype.hasOwnProperty.call(observationDrafts, currentObservationKey) ? observationDrafts[currentObservationKey] : savedObservation ? savedObservation.note : '';
      function observationItem(entry) { return Object.assign({}, byId[entry.itemId], { size: entry.size, you: entry.you }); }
      function observationTitle(entry) {
        var detail = atlasDetails(entry.itemId, S).filter(function (d) { return d.id === entry.detailId; })[0];
        return itemText(observationItem(entry), 'name') + (detail ? ' · ' + detail.label : '')+(entry.detailId==='river-journey'?' · '+canyonRouteKm(entry.riverKm)+' km':'');
      }
      function editObservation(text) {
        var note = text.slice(0, NOTE_LIMIT), key = currentObservationKey;
        setObservationDrafts(function (prev) { var next = Object.assign({}, prev); next[key] = note; return next; });
        updateSlice(function (cur) { var next = readObservationDrafts(cur.observationDrafts); next[key] = note; cur.observationDrafts = next; });
        setNotebookMessage('');
      }
      function saveObservation() {
        if (comparisonActive) return;
        arriveNow();
        if (!savedObservation && observations.length >= NOTEBOOK_LIMIT) return;
        var angle = viewMode === 'atlas' && atlasRef.current ? atlasRef.current.capture() : { yaw: 0, pitch: .12 };
        var entry = { itemId: focused.id, detailId: observationDetail, size: focused.size, you: !!focused.you,
          note: observationDraft.trim(), zoom: inspectionZoom, yaw: angle.yaw, pitch: angle.pitch, sunAngle:sunAngle, nebulaReveal:nebulaReveal, terrainRelief:terrainRelief, riverKm:riverKm, cutaway: cutaway, view: viewMode };
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
          if(isPlanetaryWorld(entry.itemId)&&entry.view==='atlas')lines.push(S('atlas_observation_sun', 'Lighting model: {angle}° Sun–observer angle; approximately {percent}% of the disc illuminated.', {angle:entry.sunAngle,percent:illuminatedDisc(entry.sunAngle)}));
          if(entry.itemId==='grand-canyon'&&entry.view==='atlas')lines.push(S('atlas_canyon_export', 'Vertical relief: {n}×. River length remains 446 km. Terrain is illustrative.',{n:entry.terrainRelief||8}));
          if(entry.detailId==='river-journey')lines.push(S('atlas_river_export', 'River journey: {n} km along the illustrated 446 km course. Position is within the model, not a geographic coordinate.',{n:canyonRouteKm(entry.riverKm)}));
          if(entry.itemId==='orion-nebula'&&entry.view==='atlas')lines.push(entry.nebulaReveal?S('atlas_nebula_export_revealed', 'Cloud visibility: reduced to reveal embedded stars.'):S('atlas_nebula_export_natural', 'Cloud visibility: full gas and dust.'));
          if (entry.note) lines.push(S('atlas_observation_note', 'My observation: {note}', { note: entry.note }));
          if (detail) { lines.push(detail.body); lines.push(detail.source); }
          if (item.note) lines.push(itemText(item, 'note'));
          lines.push(shareLinkFor(item), '');
        });
        if (investigations.length) {
          lines.push(S('atlas_inquiry_export_heading', 'Saved scale investigations'), '');
          investigations.forEach(function (entry, index) {
            var measured = compareMeasurements(inquiryMeasurement(entry.small), inquiryMeasurement(entry.big));
            lines.push((index + 1) + '. ' + inquiryTitle(entry));
            lines.push(S('atlas_inquiry_prediction_record', 'Prediction: {n} powers of ten ({ratio}).', { n: entry.guess, ratio: timesPhrase(Math.pow(10, Number(entry.guess))) }));
            lines.push(S('atlas_inquiry_measured_record', 'Measured gap: {n} powers of ten ({ratio}).', { n: round2(measured.decades), ratio: timesPhrase(measured.ratio) }));
            lines.push(predictionFeedback(Number(entry.guess), measured));
            [measured.small, measured.big].forEach(function (item) {
              lines.push(itemText(item, 'name') + ': ' + humanLength(item.size) + ' · ' + S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim));
              lines.push(sciNotation(item.size));
              if (item.note) lines.push(itemText(item, 'note'));
              lines.push(shareLinkFor(item));
            });
            var theme = INQUIRY_THEMES.filter(function (it) { return it.id === entry.theme; })[0];
            lines.push(theme ? S('atlas_inquiry_reflect_' + theme.id, theme.reflect) : S('atlas_inquiry_reflect_mixed', 'Which reference helped your prediction? What would you change in your explanation after exploring the comparison?'));
            if (entry.reflection) lines.push(S('atlas_inquiry_reflection_record', 'My reflection: {text}', { text: entry.reflection }));
            lines.push('');
          });
        }
        if (scalingRecord) {
          var model = geometricScale(scalingRecord.factor);
          lines.push(S('atlas_scaling_export', 'Similar-shape model evidence'), '');
          lines.push(S('atlas_scaling_scope', 'These are copies of the same cube. Every corresponding edge changes by the same factor. A length ratio between different objects does not establish their area, volume or mass.'));
          lines.push(S('atlas_scaling_results', 'Edge factor: {edge}. One-face area factor: {area}. Volume factor: {volume}. Surface-to-volume ratio relative to the original: {relative}.',
            { edge: scalingValue(model.edge), area: scalingValue(model.faceArea), volume: scalingValue(model.volume), relative: scalingValue(model.relativeSurfaceVolume) }));
          lines.push(S('atlas_scaling_surface_record', 'For an original unit cube, total surface area changes from 6 to {area} square units.', { area: scalingValue(model.surfaceArea) }));
          if (scalingRecord.reference) lines.push(scalingReferenceLine(scalingRecord.reference));
          if (scalingRecord.reflection) lines.push(S('atlas_scaling_reflection_record', 'My model explanation: {text}', { text: scalingRecord.reflection }));
          lines.push('');
        }
        if (drawingRecord) {
          var physical = drawingModel(inquiryMeasurement(drawingRecord.reference), inquiryMeasurement(drawingRecord.target), drawingRecord.size, drawingRecord.unit);
          lines.push(S('atlas_drawing_export_title', 'Scale Explorer · scale drawing'), drawingScaleLine(physical), drawingScope());
          [physical.reference, physical.target].forEach(function (item, index) {
            var mm = index === 0 ? physical.referenceMM : physical.targetMM;
            lines.push(itemText(item, 'name') + ': ' + drawingReal(item) + ' → ' + drawingPhysical(mm));
            if (drawingSpan(mm).offPage) lines.push(S('atlas_drawing_off_page', 'Continues beyond the page'));
          });
          if (drawingRecord.note) lines.push(S('atlas_drawing_note_record', 'My drawing plan: {text}', { text: drawingRecord.note }));
          lines.push(S('atlas_drawing_print', 'Print at 100% scale. Check the 10 mm ruler with a real ruler; fit-to-page printing changes the dimensions.'), '');
        }
        var url, anchor;
        try {
          url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
          anchor = document.createElement('a'); anchor.href = url; anchor.download = 'scale-explorer-notebook.txt';
          document.body.appendChild(anchor); anchor.click();
          var downloaded = investigations.length || scalingRecord || drawingRecord ? S('atlas_inquiry_downloaded', 'Saved notebook evidence downloaded.') : S('atlas_notebook_downloaded', 'Saved observations downloaded.');
          setNotebookMessage(downloaded);
          if (investigations.length) setInquiryMessage(downloaded);
          if (scalingRecord) setScalingMessage(downloaded);
          if (drawingRecord) setDrawingMessage(downloaded);
        } catch (_) {
          var failed = investigations.length || scalingRecord || drawingRecord ? S('atlas_inquiry_download_failed', 'The download could not start here. Your saved work is still in the notebook.') : S('atlas_notebook_download_failed', 'The download could not start here. Your saved observations are still in the notebook.');
          setNotebookMessage(failed);
          if (investigations.length) setInquiryMessage(failed);
          if (scalingRecord) setScalingMessage(failed);
          if (drawingRecord) setDrawingMessage(failed);
        }
        finally { if (anchor) anchor.remove(); if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
      }
      function chooseDetail(detail,force){
        if((detail.surface||detail.terrain)&&(planetImagery.id!==focusId||planetImagery.status!=='ready'))return;
        stopJourney();
        if(detail.datum)setMeasure(true);
        if(detailId===detail.id&&!force){setDetailId('');setInspectionZoom(1);return;}
        setDetailId(detail.id);setShowDetails(true);setNeighbors(false);setInspectionZoom(detail.zoom||(focusId==='dna'?2.2:1.8));
        if(detail.cutaway!==undefined)setCutaway(detail.cutaway);
        if(detail.reveal!==undefined)setNebulaReveal(detail.reveal);
        if(force&&atlasRef.current)atlasRef.current.approach();
        say(detail.label+'. '+detail.body);
        var cv=atlasCanvasRef.current;
        if(cv){var rect=cv.getBoundingClientRect();if(rect.top< -40||rect.bottom>window.innerHeight+40)cv.scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});}
      }
      function changeSunlight(value){stopJourney();setSunAngle(clamp(value,0,180));}
      function stepFeature(direction){
        if(!availableDetails.length)return;
        var index=availableDetails.findIndex(function(d){return d.id===detailId;});
        var next=availableDetails[index<0?0:(index+direction+availableDetails.length)%availableDetails.length];
        if(next.id!==detailId)chooseDetail(next);
      }
      function wholeSpecimen(){
        stopJourney();setDetailId('');setInspectionZoom(1);setFeatureNoteOpen(false);
        say(S('atlas_whole_view_sr', 'Showing the whole specimen.'));
        if(featureButtonRef.current)featureButtonRef.current.focus({preventScroll:true});
      }
      function onFeatureKey(ev){
        if(ev.key==='ArrowRight'||ev.key==='ArrowLeft'){ev.preventDefault();stepFeature(ev.key==='ArrowRight'?1:-1);}
        else if(ev.key==='Escape'){
          ev.preventDefault();
          if(featureNoteOpen){setFeatureNoteOpen(false);if(featureButtonRef.current)featureButtonRef.current.focus({preventScroll:true});}
          else wholeSpecimen();
        }
      }
      function travelTo(item){
        if(!item||item.id===focusId)return;
        arriveNow();
        var angle=atlasRef.current?atlasRef.current.capture():{yaw:0,pitch:.12};
        var origin={itemId:focusId,detailId:detailId,zoom:inspectionZoom,yaw:angle.yaw,pitch:angle.pitch,
          sunAngle:sunAngle,nebulaReveal:nebulaReveal,terrainRelief:terrainRelief,riverKm:riverKm,cutaway:cutaway,view:viewMode,route:true,neighbors:neighbors,measure:measure};
        setAtlasRoute(function(previous){return previous.concat([origin]).slice(-6);});
        openItem(item,true,{travel:Object.assign({},origin,{details:details})});
      }
      function returnAlongRoute(index){
        var saved=atlasRoute[index];if(!saved||!byId[saved.itemId])return;
        setAtlasRoute(atlasRoute.slice(0,index));setPendingObservation(saved);
        setViewMode(saved.view==='atlas'&&atlasStatus!=='failed'?'atlas':'chart');
        flyTo(byId[saved.itemId],{instant:true});
      }
      function routeNavigation(){
        if(!atlasRoute.length)return null;
        return h('nav',{className:'sx-route','aria-label':S('atlas_route', 'Your exploration route')},
          h('span',{className:'sx-route-label'},S('atlas_route_label', 'Your route')),
          atlasRoute.map(function(entry,index){return h(React.Fragment,{key:index},
            h('button',{type:'button','aria-label':S('atlas_route_return', 'Return to {name}',{name:itemText(byId[entry.itemId],'name')}),onClick:function(){returnAlongRoute(index);}},itemText(byId[entry.itemId],'name')),
            h('span',{'aria-hidden':'true'},'›'));}),
          h('strong',{'aria-current':'location'},itemText(focused,'name')));
      }
      function scenePortal(){
        if(viewMode!=='atlas'||comparisonActive||scaleFlight||atlasStatus!=='ready')return null;
        var destination=focused.id==='milkyway'&&detailId==='solar-neighbourhood'?byId['solar-system']:
          selectedDetail&&selectedDetail.visit?byId[selectedDetail.visit]:null;
        if(!destination)return null;
        return h('section',{className:'sx-portal','aria-label':S('atlas_portal', 'Continue the journey')},
          h('div',null,h('span',null,S('atlas_portal_label', 'Continue inward')),
            h('strong',null,S('atlas_portal_scale', '{n} powers of ten smaller',{n:round2(log10(focused.size/destination.size))}))),
          h('button',{type:'button',onClick:function(){travelTo(destination);}},S('atlas_portal_enter', 'Explore {name}',{name:lowerArticle(itemText(destination,'name'))})));
      }
      function moveAlongRiver(km) {
        arriveNow();stopJourney();setRiverKm(Math.round(canyonRouteKm(km)));setDetailId('river-journey');
        setInspectionZoom(8);setNeighbors(false);setFeatureNoteOpen(false);
      }
      function leaveRiver(){chooseDetail(details.filter(function(d){return d.id==='canyon-overview';})[0],true);if(atlasCanvasRef.current)atlasCanvasRef.current.focus({preventScroll:true});}
      React.useEffect(function(){if(viewMode==='atlas'&&!comparisonActive&&detailId==='river-journey'&&riverSliderRef.current)riverSliderRef.current.focus({preventScroll:true});},[viewMode,comparisonActive,detailId]);
      function riverNavigator() {
        if(viewMode!=='atlas'||comparisonActive||scaleFlight||focusId!=='grand-canyon'||detailId!=='river-journey')return null;
        var point=canyonRoutePoint(riverKm),route=CANYON_PATH.points.map(function(p,i){return(i?'L':'M')+(18+(p[0]+.5)*464).toFixed(2)+','+(38-p[1]*340).toFixed(2);}).join(' ');
        return h('section',{className:'sx-river-nav','aria-label':S('atlas_river_controls', 'Navigate the river'),onKeyDown:function(ev){if(ev.key==='Escape'){ev.preventDefault();leaveRiver();}}},
          h('div',{className:'sx-river-title'},
            h('div',null,h('strong',null,S('atlas_river_journey', 'River journey')),h('span',null,S('atlas_river_position', '{n} of 446 km · illustrated course',{n:riverKm}))),
            h('button',{type:'button',className:'sx-river-leave',onClick:leaveRiver},S('atlas_river_leave', 'Whole landscape'))),
          h('svg',{className:'sx-river-map',viewBox:'0 0 500 74',preserveAspectRatio:'none','aria-hidden':'true'},
            h('path',{d:route,fill:'none',stroke:'#33515b',strokeWidth:8,strokeLinecap:'round'}),
            h('path',{d:route,fill:'none',stroke:'#87b5b9',strokeWidth:2,strokeLinecap:'round'}),
            h('path',{d:route,fill:'none',stroke:'#e4c68e',strokeWidth:3,pathLength:446,strokeDasharray:riverKm+' 446',strokeLinecap:'round'}),
            h('circle',{cx:18+(point[0]+.5)*464,cy:38-point[2]*340,r:9,fill:'#c8e7c4',fillOpacity:.12,stroke:'#deedcd',strokeWidth:1.5}),
            h('circle',{cx:18+(point[0]+.5)*464,cy:38-point[2]*340,r:3,fill:'#f4e3ba'})),
          h('div',{className:'sx-river-slider'},
            h('button',{type:'button',disabled:riverKm===0,'aria-label':S('atlas_river_back', 'Move back 25 km'),onClick:function(){moveAlongRiver(riverKm-25);}},'←'),
            h('label',null,
              h('input',{ref:riverSliderRef,type:'range',min:0,max:446,step:1,value:riverKm,'aria-label':S('atlas_river_slider', 'Position along the illustrated river'),'aria-valuetext':S('atlas_river_distance', '{n} kilometres along the illustrated river',{n:riverKm}),onChange:function(ev){moveAlongRiver(Number(ev.target.value));}}),
              h('span',{className:'sx-river-limits','aria-hidden':'true'},h('span',null,'0 km'),h('span',null,'446 km'))),
            h('button',{type:'button',disabled:riverKm===446,'aria-label':S('atlas_river_forward', 'Move forward 25 km'),onClick:function(){moveAlongRiver(riverKm+25);}},'→')));
      }

      function featureNavigator(){
        if(viewMode!=='atlas'||comparisonActive||atlasStatus!=='ready'||!details.length||detailId==='river-journey')return null;
        var position=details.findIndex(function(d){return d.id===detailId;})+1;
        var readLabel=selectedDetail?S('atlas_feature_about', 'About {part}',{part:selectedDetail.label}):S('atlas_feature_start', 'Explore landmarks');
        return h('nav',{className:'sx-feature-nav','aria-label':S('atlas_feature_navigation', 'Landmark navigator'),onKeyDown:onFeatureKey},
          h('button',{ref:featureButtonRef,type:'button',className:'sx-feature-title',disabled:!availableDetails.length,'aria-label':readLabel,'aria-expanded':selectedDetail?featureNoteOpen:undefined,'aria-controls':selectedDetail&&featureNoteOpen?descId+'-feature-note':undefined,onClick:function(){if(selectedDetail)setFeatureNoteOpen(!featureNoteOpen);else stepFeature(1);}},
            h('span',{className:'sx-feature-count'},selectedDetail?(featureNoteOpen?S('atlas_feature_count_open', 'Landmark {n} of {total} · Close notes',{n:position,total:details.length}):S('atlas_feature_count', 'Landmark {n} of {total} · Read more',{n:position,total:details.length})):S('atlas_feature_available', '{n} places to explore',{n:details.length})),
            h('strong',null,selectedDetail?selectedDetail.label:S('atlas_feature_start', 'Explore landmarks'))),
          h('button',{type:'button',className:'sx-feature-arrow','aria-label':S('atlas_feature_previous', 'Previous landmark'),'aria-keyshortcuts':'ArrowLeft',title:S('atlas_feature_previous', 'Previous landmark'),disabled:!selectedDetail||availableDetails.length<2,onClick:function(){stepFeature(-1);}},h('span',{'aria-hidden':'true'},'‹')),
          h('button',{type:'button',className:'sx-feature-arrow','aria-label':S('atlas_feature_next', 'Next landmark'),'aria-keyshortcuts':'ArrowRight',title:S('atlas_feature_next', 'Next landmark'),disabled:!availableDetails.length||!!selectedDetail&&availableDetails.length<2,onClick:function(){stepFeature(1);}},h('span',{'aria-hidden':'true'},'›')),
          h('button',{type:'button',className:'sx-feature-overview','aria-label':S('atlas_feature_overview', 'Return to whole view'),title:S('atlas_feature_overview', 'Return to whole view'),disabled:!selectedDetail,onClick:wholeSpecimen},h('span',{'aria-hidden':'true'},'↺')),
          selectedDetail&&featureNoteOpen?h('section',{id:descId+'-feature-note',className:'sx-feature-story',tabIndex:0,'aria-label':S('atlas_feature_story', 'About this landmark')},
            h('p',null,selectedDetail.body),
            selectedDetail.visit?h('button',{type:'button',style:{display:'block',padding:'6px 10px',margin:'0 0 8px',background:'#243b47',borderColor:'#527080'},onClick:function(){travelTo(byId[selectedDetail.visit]);}},S('atlas_orbit_visit_world', 'Explore {planet} at its own scale',{planet:selectedDetail.label})):null,
            h('a',{href:selectedDetail.source,target:'_blank',rel:'noopener noreferrer'},S('atlas_feature_reference', 'Science reference'))):null);
      }
      function orbitScene(x,y){
        arriveNow();
        if(atlasRef.current)atlasRef.current.orbit(x,y);
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
      atlasState.current = { items: sorted, exp: expRef.current, motion: !comparisonActive && ambient && !reduceMotion, reduceMotion:reduceMotion, contrast: theme === 'contrast', neighbors: neighbors, measure: measure, inspectionZoom: inspectionZoom, sunAngle:sunAngle, nebulaReveal:nebulaReveal, terrainRelief:terrainRelief, riverKm:riverKm, cutaway: cutaway, focusId:focusId, details:details, detailId:detailId, showDetails:showDetails, comparison: comparisonActive ? compare : null };
      var atlasActions = React.useRef(null);
      atlasActions.current = { pick: function (id,part) { var detail=part&&focusId===id&&details.filter(function(d){return d.id===part;})[0];if(detail)chooseDetail(detail,true);else if(byId[id])openItem(byId[id]); }, zoom: function (delta) {
        if (comparisonActive) setInspectionZoom(function (prev) { return Math.round(clamp(prev + delta, 1, 2.5) * 10) / 10; });
        else zoomBy(delta);
      } };
      // Apply a saved feature after navigation has reset the inspection state.
      // Wait for a newly mounted atlas before restoring its camera angle.
      React.useEffect(function () {
        if (!pendingObservation || focusId !== pendingObservation.itemId) return;
        setDetailId(pendingObservation.detailId); setInspectionZoom(pendingObservation.zoom); setSunAngle(pendingObservation.sunAngle); setNebulaReveal(pendingObservation.nebulaReveal); setTerrainRelief(pendingObservation.terrainRelief||8); setRiverKm(canyonRouteKm(pendingObservation.riverKm)); setCutaway(pendingObservation.cutaway); setShowDetails(true); setNeighbors(false);
        if (detailId !== pendingObservation.detailId || inspectionZoom !== pendingObservation.zoom || sunAngle !== pendingObservation.sunAngle || nebulaReveal !== pendingObservation.nebulaReveal || terrainRelief !== (pendingObservation.terrainRelief||8) || riverKm !== canyonRouteKm(pendingObservation.riverKm) || cutaway !== pendingObservation.cutaway) return;
        if (viewMode === 'atlas' && (atlasStatus !== 'ready' || !atlasRef.current)) return;
        if (viewMode === 'atlas') atlasRef.current.restore(pendingObservation);
        setPendingObservation(null);
        var cv = viewMode === 'atlas' ? atlasCanvasRef.current : canvasRef.current;
        if (cv) cv.scrollIntoView({ block: 'center', behavior: 'auto' });
        if(pendingObservation.route){setNeighbors(pendingObservation.neighbors);setMeasure(pendingObservation.measure);say(S('atlas_route_restored', 'Returned to your saved viewpoint of {name}.',{name:itemText(byId[pendingObservation.itemId],'name')}));if(cv)cv.focus({preventScroll:true});}
        else setNotebookMessage(S('atlas_observation_returned', 'Returned to {name}.', { name: observationTitle(pendingObservation) }));
      }, [pendingObservation, focusId, viewMode, atlasStatus, detailId, inspectionZoom, sunAngle, nebulaReveal, terrainRelief, riverKm, cutaway]);
      React.useEffect(function () {
        var mq = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        if (!mq) return;
        function change() { setReduceMotion(mq.matches); if (mq.matches) { arriveNow();stopJourney(); } }
        if (mq.addEventListener) mq.addEventListener('change', change);
        return function () { if (mq.removeEventListener) mq.removeEventListener('change', change); };
      }, []);
      React.useEffect(function () {
        if (viewMode !== 'atlas') { arriveNow();draw(); return; }
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
            return Object.assign({}, atlasState.current, { exp: expRef.current, target: targetRef.current, flight:scaleFlightRef.current });
          }, function (id,part) { atlasActions.current.pick(id,part); }, failed, function(value){if(alive)setInspectionZoom(value);},markerLayerRef.current,comparisonLayerRef.current,function(value){if(alive)setPlanetImagery(value);},orbitHoverRef.current,flightLabelsRef.current);
          setAtlasStatus('ready');
        }).catch(failed);
        return function () { alive = false; clearTimeout(timeout); cv.removeEventListener('wheel', wheel); if (atlasRef.current) { atlasRef.current.dispose(); atlasRef.current = null; } };
      }, [viewMode]);
      React.useEffect(function () { if (atlasRef.current) atlasRef.current.update(); }, [ambient, reduceMotion, theme, items, neighbors, measure, inspectionZoom, sunAngle, nebulaReveal, terrainRelief, riverKm, planetImagery, cutaway, detailId, showDetails, focusId, comparisonActive, compare]);
      function goTo(nextExp, opts) {
        setComparisonActive(false);
        setDetailId('');
        opts = opts || {};
        var target = clamp(nextExp, MIN_EXP, MAX_EXP);
        targetRef.current = target;
        clearScaleFlight();
        cameraMoveRef.current = { from: expRef.current, at: performance.now(), duration:650 };
        if(opts.travel&&!reduceMotion&&!opts.instant&&viewModeRef.current==='atlas'&&atlasRef.current){
          var destination=byId[intentRef.current],span=Math.abs(target-expRef.current);
          if(destination&&span>.1){
            var flight={origin:opts.travel,destination:destination,from:expRef.current,to:target,progress:0};
            scaleFlightRef.current=flight;setScaleFlight(flight);cameraMoveRef.current.duration=clamp(1800+span*240,2600,4400);
            say(S('atlas_flight_start', 'Approaching {name}. Press Escape to arrive now.',{name:itemText(destination,'name')}));
          }
        }
        if (reduceMotion || opts.instant) { if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=0;}expRef.current = target; settleExp(target); draw(); afterMove(); return; }
        if (!rafRef.current) rafRef.current = requestAnimationFrame(step);
      }
      function clearScaleFlight(){
        if(!scaleFlightRef.current)return;
        scaleFlightRef.current=null;setScaleFlight(null);
      }
      function finishScaleFlight(){
        var flight=scaleFlightRef.current;if(!flight)return;
        var panel=flightPanelRef.current,restoreFocus=panel&&panel.contains(document.activeElement);
        clearScaleFlight();
        if(atlasRef.current)atlasRef.current.restore({yaw:0,pitch:.12,zoom:1,detailId:''});
        say(S('atlas_flight_arrived', 'Arrived at {name}, at its own scale.',{name:itemText(flight.destination,'name')}));
        if(restoreFocus&&atlasCanvasRef.current)atlasCanvasRef.current.focus({preventScroll:true});
      }
      function arriveNow(){
        if(!scaleFlightRef.current)return;
        if(rafRef.current){cancelAnimationFrame(rafRef.current);rafRef.current=0;}
        expRef.current=targetRef.current;settleExp(targetRef.current);afterMove();finishScaleFlight();draw();
      }
      function flightPanel(){
        if(!scaleFlight||viewMode!=='atlas')return null;
        return h('section',{ref:flightPanelRef,className:'sx-descent','aria-label':S('atlas_flight_region', 'Scale approach'),onKeyDown:function(ev){if(ev.key==='Escape'){ev.preventDefault();arriveNow();}}},
          h('div',{className:'sx-descent-meta'},h('span',null,S('atlas_flight_readout', 'Current scale')),
            h('strong',{'data-flight-length':true},lengthText(Math.pow(10,scaleFlight.from)))),
          h('div',{className:'sx-descent-track','aria-hidden':'true'},h('i',{'data-flight-fill':true})),
          h('p',null,S('atlas_flight_rings', 'Each ring spans a power of ten in metres.')),
          h('button',{type:'button',onClick:arriveNow},S('atlas_flight_skip', 'Arrive now')));
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
        var flight=scaleFlightRef.current,panel=flightPanelRef.current;
        if(flight&&panel){
          var label=panel.querySelector('[data-flight-length]'),bar=panel.querySelector('[data-flight-fill]');
          if(label)label.textContent=lengthText(Math.pow(10,expRef.current));
          if(bar)bar.style.transform='scaleX('+flight.progress.toFixed(4)+')';
        }
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
        var progress = clamp((ts - cameraMoveRef.current.at) / (cameraMoveRef.current.duration||650), 0, 1),flight=scaleFlightRef.current;
        if (Math.abs(d) < 0.0015 || progress >= 1) { expRef.current = target; settleExp(target); afterMove();finishScaleFlight();draw();return; }
        var eased=1-Math.pow(1-progress,3);
        if(flight){flight.progress=progress;var descent=clamp((progress-.2)/.8,0,1);eased=descent*descent*(3-2*descent);}
        expRef.current = cameraMoveRef.current.from + (target - cameraMoveRef.current.from) * eased;
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
        if(scaleFlightRef.current)return;
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
        arriveNow();
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
        if(scaleFlightRef.current&&(k==='Escape'||k===' '||k==='Spacebar')){ev.preventDefault();arriveNow();return;}
        if (k === 'Escape' && comparisonActive) { ev.preventDefault(); inspectCompared(focused); return; }
        if (atlasRef.current && /^(a|d|w|s|r)$/i.test(k)) {
          ev.preventDefault();arriveNow();
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
        var chosen = pickPair();
        setPair(freshInquiry('mixed', byId[chosen.small], byId[chosen.big]));
        setGuess('');
        setRevealed(false);
        setReflection(''); setThemeChoice('mixed'); setInquiryMessage('');
      }
      function startInvestigation() {
        var theme = INQUIRY_THEMES.filter(function (it) { return it.id === themeChoice; })[0];
        if (!theme) { newChallenge(); return; }
        setPair(freshInquiry(theme.id, byId[theme.small], byId[theme.big]));
        setGuess(''); setRevealed(false); setReflection(''); setInquiryMessage('');
      }
      function lockInEstimate() {
        if (revealed) return;
        var n = validEstimate(guess);
        if (n === null) return;
        setRevealed(true);
        updateSlice(function (cur) { cur.estimateCount = (cur.estimateCount || 0) + 1; });
        say(estimateVerdict(n) + ' ' + challengeReveal());
      }
      var challenge = React.useMemo(function () {
        return compareMeasurements(inquiryMeasurement(pair.small), inquiryMeasurement(pair.big));
      }, [pair]);
      var prediction = validEstimate(guess);
      var savedInvestigation = investigations.filter(function (entry) { return entry.id === pair.id; })[0];
      var activeInquiryTheme = INQUIRY_THEMES.filter(function (theme) { return theme.id === pair.theme; })[0];
      function inquiryTitle(entry) {
        var theme = INQUIRY_THEMES.filter(function (it) { return it.id === entry.theme; })[0];
        return theme ? S('atlas_inquiry_theme_' + theme.id, theme.title) : itemText(inquiryMeasurement(entry.small), 'name') + ' ↔ ' + itemText(inquiryMeasurement(entry.big), 'name');
      }
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
        return S('atlas_inquiry_reveal', 'The gap is {dec} powers of ten. Ratio of the stated dimensions: {times}.',
          { dec: round2(challenge.decades), times: timesPhrase(challenge.ratio) });
      }
      function predictionFeedback(n, measured) {
        var difference = predictionDifference(n, measured.decades);
        if (!difference) return '';
        if (difference.off < .05) return S('atlas_inquiry_match', 'Your predicted ratio and the measured ratio nearly match.');
        return difference.direction === 'under'
          ? S('atlas_inquiry_under', 'Your predicted ratio was about {factor} smaller than the measured ratio.', { factor: timesPhrase(difference.factor) })
          : S('atlas_inquiry_over', 'Your predicted ratio was about {factor} larger than the measured ratio.', { factor: timesPhrase(difference.factor) });
      }
      function predictionChart() {
        var maximum = Math.min(ESTIMATE_MAX, Math.max(3, Math.ceil(Math.max(prediction, challenge.decades) + 1)));
        function x(value) { return 20 + value / maximum * 260; }
        return h('svg', { className: 'sx-prediction-plot', viewBox: '0 0 300 148', role: 'img',
          'data-prediction': prediction, 'data-measured': challenge.decades, 'data-domain': maximum,
          'aria-label': S('atlas_inquiry_plot_aria', 'Prediction: {guess} powers of ten. Measured gap: {actual} powers of ten. {feedback}',
            { guess: round2(prediction), actual: round2(challenge.decades), feedback: predictionFeedback(prediction, challenge) }),
          style: { width: '100%', height: 148, display: 'block', background: P.bg, borderRadius: 8 } },
          h('text', { x: 20, y: 21, fill: P.text, fontSize: 16 }, S('atlas_inquiry_plot_guess', 'Predicted · {n} powers of ten', { n: round2(prediction) })),
          h('line', { x1: 20, y1: 38, x2: x(prediction), y2: 38, stroke: P.warn, strokeWidth: 5 }),
          h('circle', { 'data-prediction-point': 'guess', cx: x(prediction), cy: 38, r: 5, fill: P.warn }),
          h('text', { x: 20, y: 72, fill: P.text, fontSize: 16 }, S('atlas_inquiry_plot_actual', 'Measured · {n} powers of ten', { n: round2(challenge.decades) })),
          h('line', { x1: 20, y1: 89, x2: x(challenge.decades), y2: 89, stroke: P.accent, strokeWidth: 5 }),
          h('circle', { 'data-prediction-point': 'actual', cx: x(challenge.decades), cy: 89, r: 5, fill: P.accent }),
          [0, maximum / 2, maximum].map(function (value, index) { return h('text', { key: index, x: x(value), y: 125, textAnchor: index === 0 ? 'start' : index === 2 ? 'end' : 'middle', fill: P.dim, fontSize: 14 }, round2(value)); }));
      }
      function saveInvestigation() {
        if (!revealed || prediction === null || (!savedInvestigation && investigations.length >= INQUIRY_LIMIT)) return;
        var entry = readInquiry(Object.assign({}, pair, { guess: guess, revealed: true, reflection: reflection.trim() }));
        if (!entry) return;
        var next = [entry].concat(investigations.filter(function (old) { return old.id !== entry.id; }));
        setInvestigations(next); updateSlice(function (cur) { cur.investigations = next; });
        if (inquiryHistoryRef.current) inquiryHistoryRef.current.open = true;
        setInquiryMessage(savedInvestigation ? S('atlas_inquiry_updated', 'Investigation updated.') : S('atlas_inquiry_saved', 'Investigation saved.'));
      }
      function removeInvestigation(entry) {
        var next = investigations.filter(function (old) { return old.id !== entry.id; });
        setInvestigations(next); updateSlice(function (cur) { cur.investigations = next; });
        if (inquiryHistoryRef.current) inquiryHistoryRef.current.querySelector('summary').focus();
        setInquiryMessage(S('atlas_inquiry_removed', 'Investigation removed.'));
      }
      function loadInvestigation(entry) {
        setPair(entry); setGuess(entry.guess); setRevealed(true); setReflection(entry.reflection); setThemeChoice(entry.theme);
        setInquiryMessage(S('atlas_inquiry_loaded', 'Returned to the recorded prediction and measurements.'));
        if (inquiryPanelRef.current) {
          inquiryPanelRef.current.open = true;
          var summary = inquiryPanelRef.current.querySelector('summary'); summary.scrollIntoView({ block: 'nearest' }); summary.focus();
        }
      }
      function showInvestigation(entry) {
        var measured = compareMeasurements(inquiryMeasurement(entry.small), inquiryMeasurement(entry.big));
        var person = [measured.small, measured.big].filter(function (item) { return item.id === 'human'; })[0];
        if (person) {
          var cm = person.you ? person.size * 100 : null;
          setYourCm(cm); updateSlice(function (cur) { if (cm) cur.yourHeightCm = cm; else delete cur.yourHeightCm; });
        }
        changeComparison(measured.small.id, measured.big.id);
        if (cmpDetailsRef.current) cmpDetailsRef.current.open = true;
        runCompare(measured);
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
      function runCompare(recordedPair) {
        var selected = recordedPair && recordedPair.big && recordedPair.small ? recordedPair : compare;
        if (!selected) return;
        flyTo(selected.big, { instant: true });
        setInspectionZoom(1); setDetailId('');
        if (atlasRef.current) atlasRef.current.reset();
        setComparisonActive(true);
        var cv = viewMode === 'atlas' ? atlasCanvasRef.current : canvasRef.current;
        if (cv && cv.parentElement) cv.parentElement.scrollIntoView({ block: 'center', behavior: 'auto' });
        updateSlice(function (cur) { cur.compareCount = (cur.compareCount || 0) + 1; });
        say(recordedPair && recordedPair.big && recordedPair.small
          ? S('atlas_inquiry_show_sr', 'Showing the recorded comparison of {small} and {big}. Length ratio: {ratio}.', { small: itemText(selected.small, 'name'), big: itemText(selected.big, 'name'), ratio: timesPhrase(selected.ratio) })
          : compareSentence());
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
      function editScalingFactor(value, reference) {
        setScalingFactor(String(value)); setScalingReference(reference || null); setScalingMessage('');
      }
      function scalingReferenceLine(reference) {
        var measured = compareMeasurements(inquiryMeasurement(reference.small), inquiryMeasurement(reference.big));
        return S('atlas_scaling_reference', 'The edge factor uses only the recorded length ratio: {small} ({smallSize}) to {big} ({bigSize}). The cube model supplies the shape assumption.',
          { small: itemText(measured.small, 'name'), smallSize: humanLength(measured.small.size), big: itemText(measured.big, 'name'), bigSize: humanLength(measured.big.size) });
      }
      function openScalingLab() {
        if (!scalingPanelRef.current) return;
        scalingPanelRef.current.open = true;
        var summary = scalingPanelRef.current.querySelector('summary'); summary.scrollIntoView({ block: 'nearest' }); summary.focus();
      }
      function saveScalingModel() {
        if (!scalingModel) return;
        var record = readScaling({ factor: scalingFactor, reflection: scalingReflection.trim(), reference: scalingReference }, true);
        setScalingRecord(record); updateSlice(function (cur) { cur.scalingRecord = record; });
        setScalingMessage(S('atlas_scaling_saved', 'Model evidence saved in the notebook.'));
      }
      function restoreScalingModel() {
        if (!scalingRecord) return;
        setScalingFactor(scalingRecord.factor); setScalingReflection(scalingRecord.reflection); setScalingReference(scalingRecord.reference);
        openScalingLab(); setScalingMessage(S('atlas_scaling_restored', 'Returned to the saved model and explanation.'));
      }
      function removeScalingModel() {
        setScalingRecord(null); updateSlice(function (cur) { delete cur.scalingRecord; });
        openScalingLab(); setScalingMessage(S('atlas_scaling_removed', 'Saved model removed. Your current draft is still here.'));
      }
      function scalingDiagram(cubes) {
        if (!scalingModel) return null;
        var layout = scalingDiagramMeasures(scalingModel.factor), children = [], model = scalingModel;
        var geometries = [{ key: 'original', x: 18, size: layout.original, divisions: layout.originalDivisions, color: '#9ee4da', label: S('atlas_scaling_original', 'Original') },
          { key: 'copy', x: 153, size: layout.copy, divisions: layout.copyDivisions, color: '#e3c698', label: S('atlas_scaling_copy', 'Scaled copy') }];
        geometries.forEach(function (shape) {
          var x = shape.x, y = 140, s = shape.size, d = cubes ? s * .36 : 0;
          children.push(h('text', { key: shape.key + '-label', x: x, y: 20, fill: P.text, fontSize: 14 }, shape.label));
          children.push(h('rect', { key: shape.key + '-front', 'data-scaling-shape': shape.key, x: x, y: y - s, width: s, height: s, fill: shape.color, fillOpacity: .3, stroke: shape.color, strokeWidth: .8 }));
          if (cubes) {
            children.push(h('path', { key: shape.key + '-top', d: 'M' + x + ' ' + (y - s) + 'l' + d + ' ' + (-d) + 'h' + s + 'l' + (-d) + ' ' + d + 'Z', fill: shape.color, fillOpacity: .55, stroke: shape.color, strokeWidth: .8 }));
            children.push(h('path', { key: shape.key + '-side', d: 'M' + (x + s) + ' ' + y + 'l' + d + ' ' + (-d) + 'v' + (-s) + 'l' + (-d) + ' ' + d + 'Z', fill: shape.color, fillOpacity: .18, stroke: shape.color, strokeWidth: .8 }));
          }
          for (var i = 1; i < shape.divisions; i++) {
            var f = i / shape.divisions, commands = 'M' + (x + s * f) + ' ' + y + 'v' + (-s) + 'M' + x + ' ' + (y - s * f) + 'h' + s;
            if (cubes) commands += 'l' + d + ' ' + (-d) + 'M' + (x + s * f) + ' ' + (y - s) + 'l' + d + ' ' + (-d) + 'M' + (x + d * f) + ' ' + (y - s - d * f) + 'h' + s + 'v' + s;
            children.push(h('path', { key: shape.key + '-grid-' + i, 'data-scaling-grid': shape.key, d: commands, fill: 'none', stroke: shape.color, strokeWidth: .7 }));
          }
          if (s < 2) children.push(h('path', { key: shape.key + '-locator', 'data-scaling-locator': shape.key, d: 'M' + (x - 4) + ' ' + y + 'h8m-4 -4v8', fill: 'none', stroke: P.dim, strokeWidth: 1, strokeDasharray: '2 2' }));
          children.push(h('text', { key: shape.key + '-edge', x: x, y: 166, fill: shape.color, fontSize: 14 }, S('atlas_scaling_edge_label', 'Edge ×{n}', { n: shape.key === 'original' ? '1' : scalingValue(model.factor) })));
        });
        return h('svg', { className: 'sx-scaling-diagram', viewBox: '0 0 260 182', role: 'img', 'data-scaling-kind': cubes ? 'cube' : 'square',
          'aria-label': cubes ? S('atlas_scaling_cube_aria', 'Same-scale cubes. Edge factor {edge}; volume factor {volume}.', { edge: scalingValue(model.edge), volume: scalingValue(model.volume) }) : S('atlas_scaling_square_aria', 'Same-scale squares. Edge factor {edge}; area factor {area}.', { edge: scalingValue(model.edge), area: scalingValue(model.faceArea) }),
          style: { width: '100%', height: 182, display: 'block', borderRadius: 8, background: P.bg } }, children);
      }
      function scalingLab() {
        var model = scalingModel, canUsePair = compare && compare.a.dim !== 'distance' && compare.b.dim !== 'distance';
        var rows = model ? [[S('atlas_scaling_edge', 'Edge length'), 1, model.edge], [S('atlas_scaling_face', 'One-face area'), 1, model.faceArea],
          [S('atlas_scaling_surface', 'Total surface area'), 6, model.surfaceArea], [S('atlas_scaling_volume', 'Volume'), 1, model.volume],
          [S('atlas_scaling_relative', 'Surface/volume, relative to original'), 1, model.relativeSurfaceVolume]] : [];
        return h('details', { ref: scalingPanelRef, className: 'sx-scaling-lab' },
          h('summary', { style: { padding: '10px 0', cursor: 'pointer', fontSize: '.8125rem', fontWeight: 700 } }, S('atlas_scaling_title', 'Length, area and volume')),
          h('div', { style: Object.assign({}, card, { display: 'flex', flexDirection: 'column', gap: 10, overflowWrap: 'anywhere' }) },
            h('p', { style: { margin: 0, fontSize: '.75rem', lineHeight: 1.5 } }, S('atlas_scaling_intro', 'Change every edge of a cube. Predict what happens to its face area and volume, then inspect the copies at one shared scale.')),
            h('label', { style: { fontSize: '.75rem' } }, S('atlas_scaling_factor', 'Edge multiplier'),
              h('input', { type: 'number', min: '.01', max: '1e45', step: 'any', value: scalingFactor, 'aria-invalid': !model ? 'true' : undefined, 'aria-describedby': descId + '-scaling-help',
                onChange: function (event) { editScalingFactor(event.target.value); }, style: Object.assign({}, sel, { width: '100%', marginTop: 4 }) })),
            h('p', { id: descId + '-scaling-help', style: { margin: 0, color: model ? P.dim : P.warn, fontSize: '.6875rem', lineHeight: 1.5 } }, S('atlas_scaling_help', 'Use a factor from 0.01 to 10⁴⁵. Factors below 1 shrink the copy. The slider covers 0.01 to 100; the number field also accepts scientific notation.')),
            !model || model.factor <= 100 ? h('label', { style: { fontSize: '.75rem' } }, S('atlas_scaling_slider', 'Adjust edge factor'),
              h('input', { type: 'range', min: -2, max: 2, step: .01, value: model ? log10(model.factor) : log10(2), 'aria-valuetext': model ? S('atlas_scaling_edge_label', 'Edge ×{n}', { n: scalingValue(model.factor) }) : undefined,
                onChange: function (event) { editScalingFactor(Number(Math.pow(10, Number(event.target.value)).toPrecision(8))); }, style: { display: 'block', width: '100%', accentColor: P.accent } })) : null,
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 } },
              [[.5, S('atlas_scaling_half', 'Half the edge')], [2, S('atlas_scaling_double', 'Double the edge')], [3, S('atlas_scaling_triple', 'Triple the edge')], [10, S('atlas_scaling_tenfold', 'Tenfold edge')]].map(function (preset) {
                return h('button', { key: preset[0], type: 'button', style: btn, onClick: function () { editScalingFactor(preset[0]); } }, preset[1]);
              })),
            h('button', { type: 'button', style: btn, disabled: !canUsePair, onClick: function () { if (canUsePair) editScalingFactor(compare.ratio, { small: inquirySnapshot(compare.small), big: inquirySnapshot(compare.big) }); } }, S('atlas_scaling_use_pair', 'Use selected length ratio')),
            !canUsePair ? h('p', { style: { margin: 0, fontSize: '.6875rem', color: P.dim, lineHeight: 1.5 } }, S('atlas_scaling_distance', 'A distance reference is not an edge of a solid. Choose two object dimensions to use their length ratio in this cube model.')) : null,
            scalingReference && model ? h('p', { className: 'sx-scaling-reference', style: { margin: 0, fontSize: '.6875rem', lineHeight: 1.5, color: P.dim } }, scalingReferenceLine(scalingReference)) : null,
            model ? h('div', { className: 'sx-scaling-results', 'data-edge-factor': model.factor, 'data-area-factor': model.faceArea, 'data-volume-factor': model.volume, 'data-relative-surface-volume': model.relativeSurfaceVolume },
              h('p', { style: { fontSize: '.75rem', fontWeight: 600, lineHeight: 1.5 } }, S('atlas_scaling_rule', 'Edge ×k → face area ×k² → volume ×k³. Surface area grows with k², so surface/volume changes by 1/k.')),
              h('h4', { style: { fontSize: '.8125rem', margin: '8px 0 4px' } }, S('atlas_scaling_squares', 'Area: two squares')), scalingDiagram(false),
              h('h4', { style: { fontSize: '.8125rem', margin: '10px 0 4px' } }, S('atlas_scaling_cubes', 'Volume: two cubes')), scalingDiagram(true),
              h('p', { style: { fontSize: '.6875rem', color: P.dim, lineHeight: 1.5 } }, S('atlas_scaling_grid', 'For whole-number ratios up to 8, grid divisions follow the smaller edge. Dashed marks locate copies too small to resolve; their dimensions stay unchanged.')),
              h('table', { className: 'sx-scaling-table', style: { tableLayout: 'fixed', width: '100%', borderCollapse: 'collapse', fontSize: '.75rem', lineHeight: 1.5 } },
                h('caption', { style: { textAlign: 'left', marginBottom: 6 } }, S('atlas_scaling_units', 'An original unit cube: lengths in units, areas in square units and volumes in cubic units. Values shown to three significant figures.')),
                h('thead', null, h('tr', null, [S('atlas_scaling_measure', 'Measure'), S('atlas_scaling_original', 'Original'), S('atlas_scaling_copy', 'Scaled copy')].map(function (label, i) { return h('th', { key: i, scope: 'col', style: { width: i === 0 ? '46%' : '27%', textAlign: 'left', padding: '6px 3px', borderBottom: '1px solid ' + P.line } }, label); }))),
                h('tbody', null, rows.map(function (row, i) { return h('tr', { key: i, 'data-scaling-measure': i }, h('th', { scope: 'row', style: { textAlign: 'left', fontWeight: 400, padding: '6px 3px', borderBottom: '1px solid ' + P.line } }, row[0]),
                  h('td', { style: { padding: '6px 3px', borderBottom: '1px solid ' + P.line } }, scalingValue(row[1])), h('td', { style: { padding: '6px 3px', borderBottom: '1px solid ' + P.line } }, scalingValue(row[2]))); })))) : null,
            h('p', { style: { margin: 0, fontSize: '.75rem', color: P.dim, lineHeight: 1.5 } }, S('atlas_scaling_scope', 'These are copies of the same cube. Every corresponding edge changes by the same factor. A length ratio between different objects does not establish their area, volume or mass.')),
            h('label', { style: { fontSize: '.75rem' } }, S('atlas_scaling_reflection', 'My model explanation'),
              h('textarea', { value: scalingReflection, rows: 3, maxLength: NOTE_LIMIT, onChange: function (event) { setScalingReflection(event.target.value); setScalingMessage(''); }, style: Object.assign({}, sel, { display: 'block', width: '100%', marginTop: 4, resize: 'vertical' }) })),
            h('button', { type: 'button', style: goBtn, disabled: !model, onClick: saveScalingModel }, scalingRecord ? S('atlas_scaling_update', 'Update model evidence') : S('atlas_scaling_save', 'Save model evidence')),
            scalingRecord ? h('div', { className: 'sx-scaling-saved', style: { fontSize: '.75rem', lineHeight: 1.5 } },
              h('p', null, S('atlas_scaling_saved_summary', 'Saved model: edge ×{edge}; face area ×{area}; volume ×{volume}.', { edge: scalingValue(Number(scalingRecord.factor)), area: scalingValue(geometricScale(scalingRecord.factor).faceArea), volume: scalingValue(geometricScale(scalingRecord.factor).volume) })),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, h('button', { type: 'button', style: btn, onClick: restoreScalingModel }, S('atlas_scaling_return', 'Return to saved model')),
                h('button', { type: 'button', style: btn, onClick: removeScalingModel }, S('atlas_scaling_remove', 'Remove saved model')))) : null,
            h('button', { type: 'button', style: btn, disabled: !scalingRecord, onClick: downloadObservations }, S('atlas_scaling_download', 'Download model notes')),
            h('p', { role: 'status', style: { margin: 0, minHeight: '1.5em', fontSize: '.75rem' } }, scalingMessage)));
      }
      function editDrawing(changes) {
        setDrawingDraft(function (prev) { return Object.assign({}, prev, changes); }); setDrawingMessage('');
      }
      function changeDrawingUnit(unit) {
        var mm = validDrawingSize(drawingDraft.size, drawingDraft.unit);
        editDrawing({ unit: unit, size: mm === null ? drawingDraft.size : String(mm / DRAWING_UNITS[unit]) });
      }
      function useDrawingComparison() {
        if (compare) editDrawing({ reference: inquirySnapshot(compare.a), target: inquirySnapshot(compare.b) });
      }
      function fitDrawing() {
        var a = inquiryMeasurement(drawingDraft.reference), b = inquiryMeasurement(drawingDraft.target);
        editDrawing({ reference: inquirySnapshot(a.size >= b.size ? a : b), target: inquirySnapshot(a.size >= b.size ? b : a), size: '16', unit: 'cm' });
        setDrawingMessage(S('atlas_drawing_fitted', 'The larger measurement is now the 16 cm reference. Both dimensions fit on the drawing.'));
      }
      function openDrawingWorkshop() {
        if (!drawingPanelRef.current) return;
        drawingPanelRef.current.open = true; var summary = drawingPanelRef.current.querySelector('summary'); summary.scrollIntoView({ block: 'nearest' }); summary.focus();
      }
      function saveDrawing() {
        if (!drawing) return;
        var record = readDrawing(Object.assign({}, drawingDraft, { note: drawingDraft.note.trim() }), true);
        setDrawingRecord(record); updateSlice(function (cur) { cur.drawingRecord = record; });
        setDrawingMessage(S('atlas_drawing_saved', 'Drawing plan saved in the notebook.'));
      }
      function restoreDrawing() {
        if (!drawingRecord) return;
        setDrawingDraft(drawingRecord); openDrawingWorkshop(); setDrawingMessage(S('atlas_drawing_restored', 'Returned to the saved drawing plan and measurements.'));
      }
      function removeDrawing() {
        setDrawingRecord(null); updateSlice(function (cur) { delete cur.drawingRecord; }); openDrawingWorkshop();
        setDrawingMessage(S('atlas_drawing_removed', 'Saved drawing removed. Your current draft is still here.'));
      }
      function drawingScaleLine(model) {
        return S('atlas_drawing_scale', 'Model length = real length × {factor}. One model centimetre represents {real}.', { factor: scalingValue(model.scale), real: S('atlas_drawing_metres', '{n} m', { n: scalingValue(.01 / model.scale) }) });
      }
      function drawingPhysical(mm) { return S('atlas_drawing_mm', '{n} mm', { n: scalingValue(mm) }); }
      function drawingReal(item) { return S('atlas_drawing_metres', '{n} m', { n: scalingValue(item.size) }) + ' · ' + S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim); }
      function drawingScope() { return S('atlas_drawing_scope', 'Each line represents its stated dimension. Dashed dimension lines are distances, not object diameters. This compares lengths; it does not map positions, areas or volumes.'); }
      function downloadDrawingSvg() {
        if (!drawingRecord) return;
        var model = drawingModel(inquiryMeasurement(drawingRecord.reference), inquiryMeasurement(drawingRecord.target), drawingRecord.size, drawingRecord.unit), url, anchor;
        try {
          var svg = drawingSvg(model, { title: S('atlas_drawing_export_title', 'Scale Explorer · scale drawing'), description: drawingScope() + ' ' + drawingRecord.note,
            scale: drawingScaleLine(model), names: [itemText(model.reference, 'name'), itemText(model.target, 'name')], real: [drawingReal(model.reference), drawingReal(model.target)],
            mapped: [drawingPhysical(model.referenceMM), drawingPhysical(model.targetMM)], offPage: S('atlas_drawing_off_page', 'Continues beyond the page'),
            calibration: S('atlas_drawing_calibration', '10 mm calibration ruler'), print: S('atlas_drawing_print', 'Print at 100% scale. Check the 10 mm ruler with a real ruler; fit-to-page printing changes the dimensions.'),
            scope: drawingScope() + ' ' + S('atlas_drawing_locator_note', 'Dashed locators mark dimensions below 0.5 mm without enlarging them.') });
          url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
          anchor = document.createElement('a'); anchor.href = url; anchor.download = 'scale-explorer-drawing.svg'; document.body.appendChild(anchor); anchor.click();
          setDrawingMessage(S('atlas_drawing_downloaded', 'Saved drawing downloaded. Print at 100% scale and check its calibration ruler.'));
        } catch (_) { setDrawingMessage(S('atlas_drawing_download_failed', 'The drawing download could not start here. Your saved plan is still in the notebook.')); }
        finally { if (anchor) anchor.remove(); if (url) setTimeout(function () { URL.revokeObjectURL(url); }, 1000); }
      }
      function drawingPreview(model) {
        var marks = [];
        [model.referenceMM, model.targetMM].forEach(function (mm, index) {
          var item = index === 0 ? model.reference : model.target, span = drawingSpan(mm), y = 30 + index * 40, end = 15 + span.length, color = index === 0 ? '#9ee4da' : '#e3c698';
          marks.push(h('text', { key: 'number' + index, x: 4, y: y + 3, fontSize: 10, fill: color }, index + 1));
          marks.push(h('line', { key: 'line' + index, 'data-drawing-measure': index, 'data-model-mm': mm, transform: 'translate(15 0)', x1: 0, y1: y, x2: span.length, y2: y, stroke: color, strokeWidth: 1, strokeDasharray: item.dim === 'distance' ? '2 2' : undefined }));
          marks.push(h('path', { key: 'ticks' + index, d: 'M15 ' + (y - 3) + 'v6' + (span.offPage ? '' : 'M' + end + ' ' + (y - 3) + 'v6'), stroke: color, strokeWidth: 1, fill: 'none' }));
          if (span.offPage) marks.push(h('path', { key: 'off' + index, 'data-drawing-off-page': index, d: 'M192 ' + (y - 3) + 'l4 3-4 3', stroke: color, strokeWidth: 1, fill: 'none' }));
          if (span.unresolved) marks.push(h('path', { key: 'tiny' + index, 'data-drawing-locator': index, d: 'M12 ' + y + 'h6m-3 -3v6', stroke: color, strokeDasharray: '1 1', strokeWidth: .7, fill: 'none' }));
        });
        marks.push(h('path', { key: 'calibration', 'data-drawing-calibration': 10, d: 'M15 92v6m0-3h10m0-3v6', stroke: '#cbd5e1', strokeWidth: .7, fill: 'none' }));
        marks.push(h('text', { key: 'ruler-label', x: 32, y: 98, fontSize: 10, fill: '#cbd5e1' }, drawingPhysical(10)));
        return h('svg', { className: 'sx-drawing-preview', viewBox: '0 0 210 108', role: 'img', 'aria-label': S('atlas_drawing_preview_aria', 'Drawing dimensions: {first}, {second}. Preview at a shared scale; the downloaded SVG carries physical millimetre dimensions.', { first: drawingPhysical(model.referenceMM), second: drawingPhysical(model.targetMM) }),
          style: { display: 'block', width: '100%', height: 'auto', background: '#0f172a', borderRadius: 8 } }, marks);
      }
      function drawingWorkshop() {
        var model = drawing, saved = drawingRecord && drawingModel(inquiryMeasurement(drawingRecord.reference), inquiryMeasurement(drawingRecord.target), drawingRecord.size, drawingRecord.unit);
        return h('details', { className: 'sx-drawing-workshop', ref: drawingPanelRef },
          h('summary', { style: { padding: '10px 0', cursor: 'pointer', fontSize: '.8125rem', fontWeight: 700 } }, S('atlas_drawing_title', 'Make a scale drawing')),
          h('div', { style: Object.assign({}, card, { display: 'flex', flexDirection: 'column', gap: 10, overflowWrap: 'anywhere' }) },
            h('p', { style: { margin: 0, fontSize: '.75rem', lineHeight: 1.5 } }, S('atlas_drawing_intro', 'Choose a physical size for one reference. Give the second measurement the same model scale, then plan a drawing you can print and measure.')),
            [[S('atlas_drawing_reference', 'Drawing reference'), 'reference'], [S('atlas_drawing_target', 'Second drawing measurement'), 'target']].map(function (field) {
              return h('label', { key: field[1], style: { fontSize: '.75rem' } }, field[0], h('select', { value: drawingDraft[field[1]].id, style: Object.assign({}, sel, { width: '100%', marginTop: 4 }),
                onChange: function (event) { var change = {}; change[field[1]] = inquirySnapshot(byId[event.target.value]); editDrawing(change); } }, itemOptions()));
            }),
            h('label', { style: { fontSize: '.75rem' } }, S('atlas_drawing_size', 'Reference size in the drawing'),
              h('input', { type: 'number', step: 'any', value: drawingDraft.size, 'aria-invalid': !model ? 'true' : undefined, 'aria-describedby': descId + '-drawing-help',
                onChange: function (event) { editDrawing({ size: event.target.value }); }, style: Object.assign({}, sel, { width: '100%', marginTop: 4 }) })),
            h('label', { style: { fontSize: '.75rem' } }, S('atlas_drawing_unit', 'Drawing size unit'), h('select', { value: drawingDraft.unit, onChange: function (event) { changeDrawingUnit(event.target.value); }, style: Object.assign({}, sel, { width: '100%', marginTop: 4 }) },
              [['mm', S('atlas_drawing_unit_mm', 'Millimetres')], ['cm', S('atlas_drawing_unit_cm', 'Centimetres')], ['m', S('atlas_drawing_unit_m', 'Metres')], ['in', S('atlas_drawing_unit_in', 'Inches')]].map(function (unit) { return h('option', { key: unit[0], value: unit[0] }, unit[1]); }))),
            h('p', { id: descId + '-drawing-help', style: { margin: 0, fontSize: '.6875rem', lineHeight: 1.5, color: model ? P.dim : P.warn } }, S('atlas_drawing_help', 'Enter a positive size from 10⁻⁶ to 10⁶ mm, using the chosen unit. Changing units keeps the physical size. Measurements are captured when selected; use the current comparison again after changing your height.')),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 } },
              h('button', { type: 'button', style: btn, disabled: !compare, onClick: useDrawingComparison }, S('atlas_drawing_use_pair', 'Use current comparison')),
              h('button', { type: 'button', style: btn, onClick: function () { editDrawing({ reference: drawingDraft.target, target: drawingDraft.reference }); } }, S('atlas_drawing_swap', 'Swap measurements')),
              h('button', { type: 'button', style: Object.assign({}, btn, { gridColumn: '1 / -1' }), onClick: fitDrawing }, S('atlas_drawing_fit', 'Fit both on the drawing'))),
            model ? h('div', { className: 'sx-drawing-results', 'data-drawing-scale': model.scale },
              h('p', { style: { margin: '0 0 10px', fontSize: '.75rem', lineHeight: 1.5 } }, drawingScaleLine(model)), drawingPreview(model),
              h('p', { style: { fontSize: '.6875rem', lineHeight: 1.5, color: P.dim } }, S('atlas_drawing_page', 'The drawing has 180 mm of usable width. Arrows mean a dimension continues beyond the page. Dashed locators mark dimensions below 0.5 mm without enlarging them. Drawing labels use three significant figures.')),
              h('table', { className: 'sx-drawing-table', style: { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '.75rem', lineHeight: 1.5 } },
                h('caption', { style: { textAlign: 'left', marginBottom: 6 } }, S('atlas_drawing_table', 'The two measurements at one physical model scale')),
                h('thead', null, h('tr', null, [S('atlas_drawing_measurement', 'Measurement'), S('atlas_drawing_real', 'Real dimension'), S('atlas_drawing_model', 'Drawing dimension')].map(function (label, i) { return h('th', { key: i, scope: 'col', style: { textAlign: 'left', padding: 3, width: i === 0 ? '38%' : '31%' } }, label); }))),
                h('tbody', null, [model.reference, model.target].map(function (item, i) { var mm = i === 0 ? model.referenceMM : model.targetMM;
                  return h('tr', { key: i }, h('th', { scope: 'row', style: { textAlign: 'left', fontWeight: 400, padding: '8px 3px', borderTop: '1px solid ' + P.line } }, (i + 1) + '. ' + itemText(item, 'name')),
                    h('td', { style: { padding: '8px 3px', borderTop: '1px solid ' + P.line } }, drawingReal(item)), h('td', { style: { padding: '8px 3px', borderTop: '1px solid ' + P.line } }, drawingPhysical(mm), drawingSpan(mm).offPage ? h('span', { style: { display: 'block', color: P.warn } }, S('atlas_drawing_off_page', 'Continues beyond the page')) : null)); }))),
              h('p', { style: { fontSize: '.6875rem', lineHeight: 1.5, color: P.dim } }, drawingScope())) : null,
            h('label', { style: { fontSize: '.75rem' } }, S('atlas_drawing_note', 'My drawing plan'), h('textarea', { value: drawingDraft.note, rows: 3, maxLength: NOTE_LIMIT,
              onChange: function (event) { editDrawing({ note: event.target.value.slice(0, NOTE_LIMIT) }); }, style: Object.assign({}, sel, { display: 'block', width: '100%', marginTop: 4, resize: 'vertical', minHeight: 76, font: 'inherit' }) })),
            h('button', { type: 'button', style: goBtn, disabled: !model, onClick: saveDrawing }, drawingRecord ? S('atlas_drawing_update', 'Update drawing plan') : S('atlas_drawing_save', 'Save drawing plan')),
            saved ? h('div', { className: 'sx-drawing-saved', style: { fontSize: '.75rem', lineHeight: 1.5 } },
              h('p', null, S('atlas_drawing_saved_summary', 'Saved drawing: {first} → {a}; {second} → {b}.', { first: itemText(saved.reference, 'name'), a: drawingPhysical(saved.referenceMM), second: itemText(saved.target, 'name'), b: drawingPhysical(saved.targetMM) })),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } }, h('button', { type: 'button', style: btn, onClick: restoreDrawing }, S('atlas_drawing_return', 'Return to saved drawing')),
                h('button', { type: 'button', style: btn, onClick: removeDrawing }, S('atlas_drawing_remove', 'Remove saved drawing'))),
              h('p', { style: { fontSize: '.6875rem', color: P.dim } }, S('atlas_drawing_print', 'Print at 100% scale. Check the 10 mm ruler with a real ruler; fit-to-page printing changes the dimensions.'))) : null,
            h('button', { type: 'button', style: btn, disabled: !drawingRecord, onClick: downloadDrawingSvg }, S('atlas_drawing_download', 'Download saved drawing SVG')),
            h('button', { type: 'button', style: btn, disabled: !drawingRecord, onClick: downloadObservations }, S('atlas_drawing_notes', 'Download drawing notes')),
            h('p', { role: 'status', style: { margin: 0, minHeight: '1.5em', fontSize: '.75rem' } }, drawingMessage)));
      }
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

      function openItem(item, keepRoute, opts) {
        if(!keepRoute&&item.id!==focusId)setAtlasRoute([]);
        flyTo(item,opts);
        updateSlice(function (cur) { cur.readCount = (cur.readCount || 0) + 1; });
        var cv=viewMode==='atlas'?atlasCanvasRef.current:canvasRef.current;
        if(cv){var rect=cv.getBoundingClientRect();if(rect.top< -40||rect.top>window.innerHeight-120)cv.scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});}
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

        h('style',null,'.sx-hud{isolation:isolate}.sx-hud:before{content:"";position:absolute;inset:-26px -28px -24px;z-index:-1;background:linear-gradient(180deg,rgba(5,11,21,.92),rgba(5,11,21,.70) 50%,rgba(5,11,21,0))}'),
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
        h('style',null,'.sx-marker[data-offset="true"]:before{content:"";position:absolute;left:21px;top:-22px;width:1px;height:28px;background:#d7e9bd;pointer-events:none}.sx-marker[data-offset="true"]:after{content:"";position:absolute;left:19px;top:-24px;width:5px;height:5px;border-radius:50%;background:#d7e9bd;pointer-events:none}'),
        h('style',null,'.sx-route{display:flex;align-items:center;flex-wrap:wrap;gap:5px 8px;padding:8px 12px;border:1px solid #344756;border-radius:10px;background:#101c29;color:#b3c5cf;font-size:12px}.sx-route-label{font-size:10px;text-transform:uppercase;letter-spacing:.09em;margin-right:6px}.sx-route button{font:inherit;min-height:40px;color:#b7e1df;background:transparent;border:1px solid transparent;border-radius:6px;padding:6px}.sx-route button:hover{border-color:#628489;background:#1b303c}.sx-route strong{color:#edf2ec;font-weight:550}.sx-orbit-hover{position:absolute;z-index:3;pointer-events:none;bottom:56px;left:50%;transform:translateX(-50%);max-width:calc(100% - 28px);padding:9px 14px;border:1px solid #76969d;border-radius:8px;background:rgba(7,21,32,.96);box-shadow:0 6px 24px #0008;color:#e8f6f4;font-size:12px;text-align:center}.sx-portal{display:flex;flex:none;align-items:center;justify-content:space-between;gap:12px;padding:11px 18px;border-top:1px solid #435456;background:linear-gradient(110deg,#172a32,#1c2429);color:#ece3ce}.sx-portal span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#a5c3c3;margin-bottom:4px}.sx-portal strong{font-size:12px;font-weight:500}.sx-portal button{border:1px solid #e4d5b0;border-radius:7px;padding:9px 15px;background:#e8d5ae;color:#252b2b;font:600 13px system-ui;cursor:pointer;min-height:44px}.sx-portal button:hover{background:#f7e6bf}@media(max-width:700px){.sx-stage-portal{height:510px}.sx-portal{padding:9px 12px;gap:8px}.sx-portal button{padding:8px 10px;font-size:12px}.sx-portal strong{font-size:11px}.sx-route{gap:3px 5px;font-size:11px}}'),
        h('style',null,'.sx-orbit-marker{width:max-content;max-width:180px;min-width:44px}.sx-orbit-marker span{width:auto;min-width:32px;height:28px;padding:0 9px;border-radius:5px;font-size:11px;white-space:nowrap;background:rgba(8,20,31,.9);border-color:#8d9f9e;box-shadow:0 3px 12px #0005}.sx-orbit-marker[data-offset="true"]:before{left:50%;background:#c5bfaa}.sx-orbit-marker[data-offset="true"]:after{left:calc(50% - 2px);background:#d2c8b0}.sx-orbit-marker[aria-pressed="true"] span{background:#ead5ac;border-color:#f2e2bd;color:#302918}'),
        h('style',null,".sx-stage.sx-stage-river{height:clamp(520px,74vh,780px)}.sx-river-nav{flex:none;position:relative;z-index:3;border-top:1px solid #38535d;background:linear-gradient(120deg,#162b34,#0e1d29);color:#edf1dd;padding:10px 18px 7px;display:grid;grid-template-columns:minmax(180px,1fr) minmax(220px,1.5fr);column-gap:28px;align-items:center}.sx-river-title{display:flex;align-items:center;justify-content:space-between;gap:10px;grid-row:1/3}.sx-river-title strong{display:block;font:500 18px Georgia,serif}.sx-river-title span{display:block;color:#bdd0cd;font-size:11px;margin-top:5px;line-height:1.5;font-variant-numeric:tabular-nums}.sx-river-nav button{min-width:44px;min-height:44px;border:1px solid #4b6266;border-radius:7px;background:#1b353e;color:#e1eccc;cursor:pointer;font:inherit}.sx-river-nav button:hover:not(:disabled){background:#2e4a50;border-color:#aed3c6}.sx-river-nav .sx-river-leave{padding:6px 10px;font-size:11px}.sx-river-map{width:100%;height:45px;display:block;overflow:visible}.sx-river-slider{display:flex;align-items:center;gap:10px}.sx-river-slider label{flex:1;min-width:0}.sx-river-slider input{width:100%;height:28px;margin:0;accent-color:#d9e5b7;cursor:ew-resize}.sx-river-limits{display:flex;justify-content:space-between;color:#9cb6bb;font:10px ui-monospace,monospace}.sx-river-slider button{font-size:22px}.sx-stage-river .sx-stage-note{display:none}@media(max-width:700px){.sx-river-nav{display:block;padding:8px 12px}.sx-river-title strong{font-size:16px}.sx-river-title span{font-size:10px;margin-top:2px}.sx-river-map{height:32px}.sx-river-slider{gap:8px}.sx-stage-river .sx-hud p:last-child{display:none}}"),
        h('style',null,".sx-flight-labels{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}.sx-flight-labels[hidden]{display:none}.sx-flight-target{position:absolute;left:0;top:0;text-align:center;color:#c4dce0;font-size:12px;white-space:nowrap}.sx-flight-target[hidden]{display:none}.sx-flight-target i{display:block;width:18px;height:18px;border:1px solid #9fc3ce;border-radius:50%;margin:0 auto 10px;box-shadow:0 0 0 5px #8ebac012}.sx-flight-target strong{display:block;font-weight:500}.sx-flight-target small{display:block;color:#92aeb8;font-size:10px;margin-top:5px}.sx-flight-labels span{position:absolute;left:0;top:0;color:#b6d5d9;background:#08121bcc;border-left:1px solid #73949c;padding:4px 8px;font:11px ui-monospace,monospace;white-space:nowrap}.sx-flight-labels span[hidden]{display:none}.sx-descent{position:absolute;left:20px;right:20px;bottom:18px;z-index:4;padding:12px 16px;background:linear-gradient(110deg,#152a36ee,#0d1926f5);border:1px solid #476674;border-radius:10px;box-shadow:0 12px 30px #0004;color:#d9e9ed;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px 18px}.sx-descent-meta{display:flex;align-items:baseline;gap:12px;min-width:0}.sx-descent-meta span{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:#a0bec7}.sx-descent-meta strong{font:500 15px ui-monospace,monospace;font-variant-numeric:tabular-nums}.sx-descent-track{height:3px;grid-column:1;border-radius:3px;overflow:hidden;background:#35515c}.sx-descent-track i{display:block;width:100%;height:100%;background:linear-gradient(90deg,#72bfc9,#f1deb8);transform-origin:left;transform:scaleX(0)}.sx-descent p{margin:0;font-size:11px;color:#a9c2cc;grid-column:1}.sx-descent button{grid-column:2;grid-row:1/4;align-self:center;min-height:44px;border:1px solid #b0c4cb;border-radius:7px;padding:9px 14px;background:#d8e8e7;color:#1b3039;cursor:pointer;font:600 12px system-ui}.sx-descent button:hover{background:#f1f4e8}@media(max-width:700px){.sx-descent{left:10px;right:10px;bottom:10px;padding:10px;gap:7px 10px}.sx-descent-meta{display:block}.sx-descent-meta span{display:block;font-size:9px;margin-bottom:3px}.sx-descent-meta strong{font-size:13px}.sx-descent p{font-size:9px}.sx-descent button{padding:8px;font-size:11px}.sx-flight-labels span{font-size:10px}}"),
        h('style',null,'.sx-stage{display:flex;flex-direction:column}.sx-viewport{position:relative;flex:1;min-height:0;isolation:isolate}.sx-feature-nav{position:relative;z-index:3;flex:none;display:flex;align-items:center;gap:5px;padding:8px 12px;border-top:1px solid #354352;background:linear-gradient(110deg,#101e2b,#101723);color:#edf4f7}.sx-feature-nav button{color:inherit;border:1px solid transparent;background:transparent;border-radius:8px;cursor:pointer;min-height:44px;font:inherit}.sx-feature-nav button:hover:not(:disabled){background:#213344;border-color:#527080}.sx-feature-nav button:focus-visible,.sx-feature-story a:focus-visible{outline:3px solid #67d8f5;outline-offset:-3px}.sx-feature-title{flex:1;min-width:0;padding:5px 8px;text-align:left;line-height:1.3}.sx-feature-title strong{display:block;font-size:14px;font-weight:550;overflow-wrap:anywhere}.sx-feature-count{display:block;color:#aac1cf;font-size:10px;letter-spacing:.04em;line-height:1.5;margin-bottom:3px}.sx-feature-arrow,.sx-feature-overview{flex:0 0 44px;width:44px;padding:0}.sx-feature-arrow span{font-size:30px;line-height:1}.sx-feature-overview span{font-size:22px}.sx-feature-story{position:absolute;bottom:100%;left:0;right:0;max-height:160px;overflow:auto;overscroll-behavior:contain;padding:14px 20px 16px;background:rgba(9,20,31,.97);border-top:1px solid #527080;box-shadow:0 -12px 30px #0003;color:#edf4f7;font-size:13px;line-height:1.65}.sx-feature-story p{margin:0 0 9px}.sx-feature-story a{color:#9ddfee;text-underline-offset:3px}.sx-feature-nav:has(.sx-feature-story) .sx-feature-title{background:#203442;border-color:#527080}@media(max-width:700px){.sx-feature-nav{padding:7px 6px;gap:0}.sx-feature-title{padding:3px 6px}.sx-feature-title strong{font-size:12px}.sx-feature-count{font-size:9px;letter-spacing:0}.sx-feature-story{max-height:150px;padding:12px 14px;font-size:12px}.sx-viewport .sx-stage-note{bottom:8px}.sx-viewport .sx-stage-note span{font-size:9px;padding:4px 5px}}'),
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
              viewMode === 'atlas' ? h('button', { type: 'button', style: btn, onClick: function () { arriveNow();setInspectionZoom(1);setDetailId(''); if (atlasRef.current) atlasRef.current.reset(); } }, S('atlas_reset', 'Reset camera')) : null,
              viewMode === 'atlas' ? h('button', { type: 'button', style: btn, 'aria-pressed': ambient && !reduceMotion, disabled: reduceMotion, onClick: function () { setAmbient(!ambient); updateSlice(function (cur) { cur.ambient = !ambient; }); } }, reduceMotion ? S('atlas_still', 'Reduced motion') : ambient ? S('atlas_motion_pause', 'Pause ambience') : S('atlas_motion_play', 'Resume ambience')) : null),
            atlasStatus === 'failed' ? h('p', { role: 'status', style: { margin: 0, color: P.dim, fontSize: '0.8125rem' } }, S('atlas_failed', 'The 3D view is unavailable. The scale chart and all destinations are ready to explore.')) : null,
            routeNavigation(),
            h('div', { className: 'sx-stage'+(viewMode==='atlas'&&!comparisonActive&&detailId==='river-journey'?' sx-stage-river':'')+(viewMode==='atlas'&&!comparisonActive&&selectedDetail&&selectedDetail.visit?' sx-stage-portal':'') },
              h('div',{className:'sx-viewport'},
              viewMode === 'atlas' ? h('canvas', { ref: atlasCanvasRef, tabIndex: 0, role: 'application',
                'aria-label': comparisonActive ? S('atlas_comparison_canvas_aria', 'Shared scale comparison. Drag or use W A S D to orbit. Scroll or pinch to inspect. R resets the camera. Escape returns to exploration.') : S('atlas_canvas_aria', 'Interactive scale atlas. Scroll or use arrow keys to travel through scale. Drag to orbit, or use W A S D. Pinch to inspect more closely. R resets the camera. Home returns to human scale. Space plays or pauses the journey.'),
                'aria-describedby': descId, 'aria-busy':!!scaleFlight, onKeyDown: onCanvasKey, style: { touchAction: 'none', cursor: 'grab', outlineOffset: '-4px' } }) : null,
              h('canvas', { ref: canvasRef, tabIndex: 0, role: 'application',
                'aria-label': S('canvas_aria', 'Scale view. Left and right arrows zoom by a quarter of a power of ten, hold shift for a whole one, Page Up and Page Down jump three, Home returns to human scale, space plays or pauses the zoom.'),
                'aria-describedby': descId,
                onKeyDown: onCanvasKey, onWheel: onWheel,
                style: { display: viewMode === 'chart' && !comparisonActive ? 'block' : 'none', width: '100%', height: '100%', outlineOffset: '-3px' } }),
              viewMode === 'chart' && comparisonActive ? comparisonDiagram() : null,
              viewMode==='atlas'?h('div',{ref:orbitHoverRef,className:'sx-orbit-hover',hidden:true,'aria-hidden':'true'}):null,
              viewMode==='atlas'?h('div',{ref:flightLabelsRef,className:'sx-flight-labels',hidden:true,'aria-hidden':'true'},[0,1,2,3,4].map(function(i){return h('span',{key:i,hidden:true});}),scaleFlight?h('div',{className:'sx-flight-target','data-flight-locator':true,hidden:true},h('i',null),h('strong',null,itemText(scaleFlight.destination,'name')),h('small',null,S('atlas_flight_below_pixel', 'Position only · smaller than one pixel'))):null):null,
              flightPanel(),
              viewMode==='atlas'?h('div',{ref:markerLayerRef,className:'sx-markers'},details.map(function(detail,index){return h('button',{key:focusId+'-'+detail.id,type:'button',className:'sx-marker'+(focusId==='solar-system'?' sx-orbit-marker':''),hidden:true,'data-scale-marker':detail.id,'aria-label':S('atlas_inspect_part', 'Inspect {part}',{part:detail.label}),'aria-pressed':detailId===detail.id,title:detail.label,onClick:function(){chooseDetail(detail);}},h('span',null,focusId==='solar-system'?detail.label:index+1));})):null,
              viewMode === 'atlas' ? h('div', { ref: comparisonLayerRef, className: 'sx-comparison-points' }, compare ? [compare.a, compare.b].map(function (item, index) {
                return h('button', { key: index, type: 'button', className: 'sx-comparison-point', hidden: true, 'data-scale-comparison-point': item.id,
                  'aria-label': S('atlas_comparison_inspect', 'Inspect {name}', { name: itemText(item, 'name') }), onClick: function () { inspectCompared(item); } },
                  S('atlas_comparison_locator', 'Position only · too small to resolve'), h('span', { style: { display: 'block', marginTop: 4, fontWeight: 700 } }, itemText(item, 'name')));
              }) : null) : null,
              viewMode === 'atlas' || comparisonActive ? h('div', { className: 'sx-hud', 'aria-hidden': 'true' },
                h('p', { style: { color: comparisonActive ? '#a5dcd8' : theme === 'contrast' ? '#ffffff' : realm.color, textTransform: 'uppercase', fontWeight: 700 } }, scaleFlight ? S('atlas_flight_heading', 'Journey through scale') : comparisonActive ? S('atlas_comparison_studio', 'Comparison studio') : S('atlas_realm_' + realm.id, realm.name)),
                h('h3', null, comparisonActive ? S('atlas_comparison_shared', 'One shared scale') : itemText(focused, 'name')),
                h('p', null, scaleFlight ? S('atlas_flight_origin', 'From {name}',{name:lowerArticle(itemText(byId[scaleFlight.origin.itemId],'name'))}) : comparisonActive ? (viewMode === 'atlas' ? S('atlas_comparison_projection', 'Measured proportions · parallel projection') : S('atlas_comparison_diagram_tag', 'Measured lengths · one shared unit')) : focused.id==='everest'?S('atlas_alpine_height', '8,849 m above sea level'):lengthText(focused.size) + ' ' + S('dim_' + focused.dim.replace(/\s+/g, '_'), focused.dim)),
                !scaleFlight&&!comparisonActive&&focused.id==='solar-system'?h('p',{style:{color:'#e3cba5',marginTop:10}},selectedDetail&&selectedDetail.au?S('atlas_orbit_au_label', '{au} AU · orbital radius',{au:selectedDetail.au.toFixed(2)}):S('atlas_orbit_stage_label', 'Proportional orbits · enlarged worlds')):null,
                !comparisonActive&&focused.id==='everest'?h('p',{style:{color:'#c4e3ef',marginTop:10}},planetImagery.id===focused.id&&planetImagery.status==='ready'?S('atlas_alpine_badge', 'Himalayan terrain · actual proportions'):planetImagery.id===focused.id&&planetImagery.status==='failed'?S('atlas_alpine_badge_failed', 'Elevation data unavailable'):S('atlas_alpine_loading', 'Loading the local elevation grid…')):null,
                !comparisonActive&&focused.id==='grand-canyon'?h('p',{style:{color:'#edc49b',marginTop:10}},S('atlas_canyon_badge', 'Vertical relief {n}× · length follows the river',{n:terrainRelief})):null,
                !comparisonActive&&focused.id==='everest'&&detailId==='everest-datum'?h('p',{style:{color:'#dfd2ab',marginTop:10}},S('atlas_alpine_datum_label', 'Lower grid: 0 m · ruler top: 8,849 m')):null,
                !comparisonActive&&selectedDetail?h('p',{style:{marginTop:14,letterSpacing:'.02em',color:'#deebbe'}},S('atlas_inspecting', 'Inspecting: {part}',{part:selectedDetail.label})):null,
                atlasStatus === 'loading' ? h('p', { style: { marginTop: 20 } }, S('atlas_loading', 'Preparing your observatory…')) : null) : null,
              viewMode === 'atlas' && !scaleFlight ? h('div', { className: 'sx-stage-note', 'aria-hidden': 'true' },
                h('span', null, comparisonActive ? S('atlas_comparison_gesture', 'Drag to orbit · Scroll to inspect · Esc to explore') : S('atlas_gesture', 'Drag to orbit · Pinch to inspect · Scroll to travel')),
                h('span', null, focused.id==='everest'&&!comparisonActive?S('atlas_alpine_stage_note', 'Elevation data / illustrated snow & light'):S('atlas_model_tag', 'Illustrated models / measured dimensions'))) : null),
              scenePortal(),
              riverNavigator(),
              featureNavigator()
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
              h('button', { type: 'button', style: btn, onClick: openScalingLab }, S('atlas_scaling_open', 'Explore length, area and volume')),
              h('button', { type: 'button', style: btn, onClick: function () { useDrawingComparison(); openDrawingWorkshop(); } }, S('atlas_drawing_title', 'Make a scale drawing')),
              compare.ratio >= 100 ? h('p', { style: { fontSize: '.75rem', color: P.dim, lineHeight: 1.5 } }, S('atlas_comparison_resolution', 'A smaller specimen may fall below a screen pixel at this scale. A dashed locator marks its position; Inspect brings it into view at its own scale.')) : null,
              h('button', { type: 'button', style: btn, onClick: function () { inspectCompared(focused); } }, S('atlas_comparison_exit', 'Back to exploration'))) : null,
            viewMode === 'atlas' ? h('div', { className: 'sx-inspection', style: { display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',padding:'9px 12px',border:'1px solid '+P.line,borderRadius:10,background:P.panel } },
              h('label', { style:{display:'flex',gap:10,alignItems:'center',flex:'1 1 230px',fontSize:'0.75rem'} },
                S('atlas_inspection_zoom', 'Inspection zoom'),
                h('input', { type:'range',min:1,max:comparisonActive?2.5:inspectionLimit(focusId),step:.1,value:inspectionZoom,'aria-label':S('atlas_inspection_aria', 'Inspection magnification'), 'aria-valuetext':S('atlas_inspection_value', '{n} times closer', {n:inspectionZoom.toFixed(1)}),onChange:function(ev){arriveNow();setInspectionZoom(Number(ev.target.value));},style:{flex:1,minWidth:60,accentColor:P.accent} }),
                h('output', { style:{fontVariantNumeric:'tabular-nums',minWidth:34} },inspectionZoom.toFixed(1)+'×')),
              h('button', { type:'button',style:btn,disabled:inspectionZoom===1&&!detailId,onClick:function(){setInspectionZoom(1);setDetailId('');} },S('atlas_fit', 'Fit object')),
              hasCutaway(focused.id)?h('button',{type:'button',style:cutaway?goBtn:btn,'aria-pressed':cutaway,onClick:function(){setCutaway(!cutaway);setDetailId('');}},S('atlas_cutaway', 'Open cutaway')):null) : null,
            viewMode==='atlas'&&!comparisonActive&&isPlanetaryWorld(focused.id)?h('section',{className:'sx-lighting','aria-label':S('atlas_lighting', 'Light this world'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}},h('h3',{style:{fontSize:'.9rem',margin:0}},S('atlas_lighting', 'Light this world')),h('output',{style:{fontSize:'.75rem',color:P.dim,fontVariantNumeric:'tabular-nums'}},S('atlas_illuminated', 'Approx. {n}% illuminated', {n:illuminatedDisc(sunAngle)}))),
              h('label',{style:{display:'flex',gap:12,alignItems:'center',marginTop:12,fontSize:'.75rem'}},S('atlas_sun_angle', 'Sun–observer angle'),h('input',{type:'range',min:0,max:180,step:1,value:sunAngle,'aria-label':S('atlas_sun_angle', 'Sun–observer angle'),'aria-valuetext':sunAngle+'°',onChange:function(ev){changeSunlight(Number(ev.target.value));},style:{flex:1,minWidth:40,accentColor:P.accent}}),h('span',{style:{minWidth:32,fontVariantNumeric:'tabular-nums'}},sunAngle+'°')),
              h('div',{style:{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}},[[0,S('atlas_light_full', 'Full light')],[90,S('atlas_light_half', 'Half light')],[135,S('atlas_light_crescent', 'Crescent')]].map(function(preset){return h('button',{key:preset[0],type:'button',style:sunAngle===preset[0]?goBtn:btn,'aria-pressed':sunAngle===preset[0],onClick:function(){changeSunlight(preset[0]);}},preset[1]);})),
              h('p',{style:{fontSize:'.75rem',lineHeight:1.5,color:P.dim,margin:'10px 0 0'}},S('atlas_lighting_scope', 'Explore how sunlight changes the visible disc. This model follows your viewpoint; it does not show today’s sky.'))):null,
            viewMode==='atlas'&&!comparisonActive&&focused.id==='everest'?h('section',{className:'sx-alpine-controls','aria-label':S('atlas_alpine_controls', 'Light across the ridges'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('h3',{style:{fontSize:'.9rem',margin:'0 0 10px'}},S('atlas_alpine_controls', 'Light across the ridges')),
              h('p',{style:{fontSize:'.8rem',lineHeight:1.6,margin:'0 0 12px',color:P.dim}},S('atlas_alpine_light_hint', 'Move the light across the mountain to reveal its faces and shadows. The terrain keeps its actual proportions.')),
              h('label',{style:{display:'flex',gap:12,alignItems:'center',fontSize:'.8rem'}},S('atlas_alpine_direction', 'Light direction'),
                h('input',{type:'range',min:0,max:180,step:1,value:sunAngle,'aria-label':S('atlas_alpine_direction', 'Light direction'),'aria-valuetext':S('atlas_alpine_direction_value', '{n} degrees from the west',{n:sunAngle}),style:{flex:1,minWidth:40,accentColor:P.accent},onChange:function(ev){changeSunlight(Number(ev.target.value));}})),
              h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginTop:12}},[[25,S('atlas_alpine_west', 'Western light')],[155,S('atlas_alpine_east', 'Eastern light')]].map(function(preset){return h('button',{key:preset[0],type:'button',style:sunAngle===preset[0]?goBtn:btn,'aria-pressed':sunAngle===preset[0],onClick:function(){changeSunlight(preset[0]);}},preset[1]);})),
              h('p',{style:{fontSize:'.75rem',lineHeight:1.6,color:P.dim,margin:'12px 0 6px'}},S('atlas_alpine_data', '18 km of terrain · 75 m grid · no vertical exaggeration. Snow and surface colors are illustrative. Elevation data: Mapzen; SRTM and GMTED2010 courtesy of the U.S. Geological Survey.')),
              h('a',{href:'https://registry.opendata.aws/terrain-tiles/',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'.75rem',color:P.accent}},S('atlas_alpine_source', 'About the elevation data'))):null,
            viewMode==='atlas'&&!comparisonActive&&details.length?h('section',{className:'sx-details','aria-label':S('atlas_detail_section', 'Explore this specimen'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('div',{style:{display:'flex',gap:12,justifyContent:'space-between',alignItems:'center'}},h('h3',{style:{fontSize:'0.9rem',margin:0}},S('atlas_detail_section', 'Explore this specimen')),h('button',{type:'button',style:btn,'aria-pressed':showDetails,onClick:function(){setShowDetails(!showDetails);}},S('atlas_markers', 'Landmarks'))),
              isPlanetaryWorld(focused.id)&&(planetImagery.id!==focused.id||planetImagery.status!=='ready')?h('p',{role:'status',style:{fontSize:'.8rem',color:P.dim}},planetImagery.id===focused.id&&planetImagery.status==='failed'?S('atlas_imagery_unavailable', 'Surface imagery is unavailable. You can still orbit this world and explore its lighting.'):S('atlas_imagery_loading', 'Loading surface imagery for these landmarks…')):null,
              focused.id==='everest'&&(planetImagery.id!==focused.id||planetImagery.status!=='ready')?h('div',{role:'status',style:{fontSize:'.8rem',lineHeight:1.6,color:P.dim}},
                h('p',null,planetImagery.id===focused.id&&planetImagery.status==='failed'?S('atlas_alpine_failed', 'The elevation data could not load. Retry to explore the terrain, or use the scale chart.'):S('atlas_alpine_loading', 'Loading the local elevation grid…')),
                planetImagery.id===focused.id&&planetImagery.status==='failed'?h('button',{type:'button',style:btn,onClick:function(){if(atlasRef.current)atlasRef.current.retryTerrain();}},S('atlas_alpine_retry', 'Retry terrain')):null):null,
              h('div',{className:'sx-detail-choices'},details.map(function(detail,index){return h('button',{key:detail.id,type:'button',style:detailId===detail.id?goBtn:btn,disabled:(detail.surface||detail.terrain)&&(planetImagery.id!==focused.id||planetImagery.status!=='ready'),'aria-pressed':detailId===detail.id,onClick:function(){chooseDetail(detail);}},h('span',{'aria-hidden':'true',style:{opacity:.7,marginRight:6}},String(index+1).padStart(2,'0')),detail.label);})),
              selectedDetail?h('div',{className:'sx-detail-note',style:{borderLeft:'2px solid '+P.accent,paddingLeft:12}},h('p',{style:{fontSize:'0.875rem',lineHeight:1.65,margin:'10px 0 6px'}},selectedDetail.body),h('a',{href:selectedDetail.source,target:'_blank',rel:'noopener noreferrer',style:{fontSize:'0.75rem',color:P.accent}},S('atlas_detail_source', 'Read the science source'))):h('p',{style:{fontSize:'0.8rem',lineHeight:1.6,color:P.dim,margin:'10px 0 0'}},S('atlas_detail_invite', 'Choose a numbered landmark to move closer. Orbit around the feature, then use Fit object to see the whole specimen.'))):null,
            viewMode==='atlas'&&focused.id==='mitochondrion'?h('p',{style:{margin:0,fontSize:'0.75rem',lineHeight:1.5,color:P.dim}},cutaway?S('atlas_cutaway_open', 'Inside: the cristae are folds of the inner membrane. Close the cutaway to see the outer surface.'):S('atlas_cutaway_closed', 'Outside: the outer membrane encloses the organelle. Open the cutaway to explore the folds within.')):null,
            viewMode==='atlas'&&!comparisonActive&&isMicrobe(focused.id)?h('p',{className:'sx-cell-note',style:{margin:0,fontSize:'.75rem',lineHeight:1.6,color:P.dim}},S('atlas_cell_scope', 'The ruler measures cell body length. Colors, organelle sizes and motion are illustrated to make the anatomy readable. Open the cutaway to explore inside; Pause ambience holds the motion still.')):null,
            viewMode==='atlas'&&!comparisonActive&&focused.id==='sun'?h('p',{className:'sx-solar-note',style:{margin:0,fontSize:'.75rem',lineHeight:1.6,color:P.dim}},S('atlas_solar_scope', 'The ruler spans the photosphere. The corona extends beyond it. Interior boundaries are approximate; warm colors, enlarged surface detail and slow flows help reveal the structure. This is an illustrated star, not a live solar observation.')):null,
            viewMode==='atlas'&&!comparisonActive&&focused.id==='grand-canyon'?h('section',{className:'sx-terrain-controls','aria-label':S('atlas_canyon_controls', 'Explore the canyon landscape'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('h3',{style:{fontSize:'.9rem',margin:'0 0 10px'}},S('atlas_canyon_controls', 'Explore the canyon landscape')),
              h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
                h('button',{type:'button',style:btn,onClick:function(){chooseDetail(details.filter(function(d){return d.id==='canyon-overview';})[0],true);}},S('atlas_canyon_overview', 'Look from above')),
                h('button',{type:'button',style:goBtn,onClick:function(){chooseDetail(details.filter(function(d){return d.id==='canyon-rim';})[0],true);}},S('atlas_canyon_rim', 'Approach the rim')),
                h('button',{type:'button',style:btn,onClick:function(){chooseDetail(details.filter(function(d){return d.id==='river-bend';})[0],true);}},S('atlas_canyon_river', 'Follow the river')),
                h('button',{type:'button',style:btn,onClick:function(){chooseDetail(details.filter(function(d){return d.id==='river-journey';})[0],true);}},S('atlas_river_enter', 'Travel along the river'))),
              h('label',{style:{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',fontSize:'.8rem',marginTop:14}},
                S('atlas_canyon_relief', 'Vertical relief'),
                h('input',{type:'range',min:1,max:20,step:1,value:terrainRelief,'aria-label':S('atlas_canyon_relief', 'Vertical relief'),'aria-valuetext':S('atlas_canyon_relief_value', '{n} times vertical relief',{n:terrainRelief}),style:{flex:1,minWidth:100,accentColor:P.accent},onChange:function(ev){arriveNow();setTerrainRelief(Number(ev.target.value));}}),
                h('output',{style:{minWidth:32,fontVariantNumeric:'tabular-nums'}},terrainRelief+'×')),
              h('div',{style:{display:'flex',gap:8,flexWrap:'wrap',marginTop:9}},
                h('button',{type:'button',style:terrainRelief===1?goBtn:btn,'aria-pressed':terrainRelief===1,onClick:function(){arriveNow();setTerrainRelief(1);}},S('atlas_canyon_true_relief', 'Actual proportions')),
                h('button',{type:'button',style:terrainRelief===8?goBtn:btn,'aria-pressed':terrainRelief===8,onClick:function(){arriveNow();setTerrainRelief(8);}},S('atlas_canyon_enhance_relief', 'Reveal the relief'))),
              h('p',{style:{fontSize:'.75rem',lineHeight:1.6,color:P.dim,margin:'12px 0 0'}},S('atlas_canyon_scope', 'An illustrated terrain, using 446 km of river length and about 1.6 km of reference depth. Vertical exaggeration reveals the cliffs at this large scale. The winding route, tributaries and rock bands are composed for exploration; this is not a surveyed elevation map. Comparisons use unexaggerated relief.')),
              h('a',{href:'https://www.nps.gov/grca/learn/nature/grca-geology.htm',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'.75rem',color:P.accent}},S('atlas_canyon_source', 'Geology · National Park Service'))):null,
            viewMode==='atlas'&&!comparisonActive&&focused.id==='solar-system'?h('section',{className:'sx-system-controls','aria-label':S('atlas_system_controls', 'Explore the planetary system'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('h3',{style:{fontSize:'.9rem',margin:'0 0 10px'}},S('atlas_system_controls', 'Explore the planetary system')),
              h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
                h('button',{type:'button',style:btn,onClick:function(){wholeSpecimen();if(atlasRef.current)atlasRef.current.reset();}},S('atlas_orbit_whole', 'Whole system')),
                h('button',{type:'button',style:btn,onClick:function(){chooseDetail(details[0],true);}},S('atlas_orbit_inner_action', 'Explore inner planets')),
                h('button',{type:'button',style:goBtn,onClick:function(){travelTo(byId.sun);}},S('atlas_orbit_visit_sun', 'Visit the Sun')),
                h('button',{type:'button',style:btn,onClick:function(){openItem(byId.milkyway);}},S('atlas_orbit_visit_galaxy', 'Return to the Milky Way'))),
              selectedDetail&&selectedDetail.au?h('p',{className:'sx-orbit-distance',style:{fontSize:'.85rem',lineHeight:1.5,color:P.text,margin:'12px 0 0'}},
                S('atlas_orbit_distance', '{planet} · {au} AU from the Sun in this model',{planet:selectedDetail.label,au:selectedDetail.au.toFixed(2)})):null,
              selectedDetail&&selectedDetail.visit?h('button',{type:'button',style:Object.assign({},goBtn,{marginTop:10}),onClick:function(){travelTo(byId[selectedDetail.visit]);}},S('atlas_orbit_visit_world', 'Explore {planet} at its own scale',{planet:selectedDetail.label})):null,
              h('p',{style:{fontSize:'.75rem',lineHeight:1.6,color:P.dim,margin:'10px 0 0'}},S('atlas_orbit_scope', 'Distances keep their proportions through every view. Inspection zoom moves your camera; it leaves the atlas scale unchanged. Worlds are enlarged markers with illustrated surfaces. Choose Earth or Jupiter to continue into its detailed globe.')),
              h('a',{href:'https://ssd.jpl.nasa.gov/planets/approx_pos.html',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'.75rem',color:P.accent}},S('atlas_orbit_source', 'Orbital sizes · NASA/JPL'))):null,
            viewMode==='atlas'&&!comparisonActive&&focused.id==='milkyway'?h('section',{className:'sx-galaxy-controls','aria-label':S('atlas_galaxy_controls', 'Galaxy viewpoint'),style:{padding:'14px 16px',border:'1px solid '+P.line,borderRadius:12,background:P.panel}},
              h('h3',{style:{fontSize:'.9rem',margin:'0 0 10px'}},S('atlas_galaxy_controls', 'Galaxy viewpoint')),
              h('div',{style:{display:'flex',gap:8,flexWrap:'wrap'}},
                h('button',{type:'button',style:btn,onClick:function(){chooseDetail(details.filter(function(d){return d.id==='spiral-arms';})[0],true);}},S('atlas_galaxy_above', 'View from above')),
                h('button',{type:'button',style:btn,onClick:function(){chooseDetail(details.filter(function(d){return d.id==='galactic-disc';})[0],true);}},S('atlas_galaxy_edge', 'View edge-on')),
                h('button',{type:'button',style:goBtn,onClick:function(){travelTo(byId['solar-system']);}},S('atlas_galaxy_visit', 'Visit the Solar System'))),
              h('p',{style:{fontSize:'.75rem',lineHeight:1.6,color:P.dim,margin:'10px 0 0'}},S('atlas_galaxy_scope', 'An illustrated stellar disc, approximately 100,000 light-years across. Arm paths, dust, colors and vertical structure are interpretive. Light points represent stellar populations; the Sun marker is enlarged. The extended halo is outside this model.'))):null,
            viewMode==='atlas'&&!comparisonActive&&focused.id==='orion-nebula'?h('div',{className:'sx-nebula-controls',role:'group','aria-label':S('atlas_nebula_controls', 'Nebula view'),style:{display:'flex',flexDirection:'column',gap:9}},
              h('button',{type:'button',style:nebulaReveal?goBtn:btn,'aria-pressed':nebulaReveal,onClick:function(){setNebulaReveal(!nebulaReveal);var cv=atlasCanvasRef.current;if(cv){var rect=cv.getBoundingClientRect();if(rect.top< -40||rect.bottom>window.innerHeight+40)cv.scrollIntoView({block:'center',behavior:reduceMotion?'auto':'smooth'});}}},S('atlas_nebula_reveal', 'Reveal embedded stars')),
              h('p',{style:{margin:0,fontSize:'.75rem',lineHeight:1.6,color:P.dim}},S('atlas_nebula_scope', 'Explore an illustrated volume of gas and dust. Its shape, depth and colors are interpretive; stellar light points are enlarged. Revealing stars reduces opacity while keeping every position and measured distance unchanged.')),
              h('a',{href:'https://science.nasa.gov/solar-system/skywatching/night-sky-network/a-flame-in-the-sky-the-orion-nebula/',target:'_blank',rel:'noopener noreferrer',style:{fontSize:'.75rem',color:P.accent}},S('atlas_nebula_scale_source', 'Scale reference: approximately 24 light-years across · NASA'))):null,
            viewMode === 'atlas' ? h('div', { className: 'sx-flight-controls', role: 'group', 'aria-label': S('atlas_orbit_controls', 'Orbit the 3D scene') },
              h('button', { type: 'button', style: btn, onClick: function () { orbitScene(-0.2, 0); } }, S('atlas_orbit_left', 'Orbit left')),
              h('button', { type: 'button', style: btn, onClick: function () { orbitScene(0.2, 0); } }, S('atlas_orbit_right', 'Orbit right')),
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
                  focused.id === 'solar-system' ? S('atlas_solar_note', 'The width spans Neptune’s reference orbit. All eight orbital radii share one scale. Circular paths, a shared plane and fixed planet positions simplify the system. The Sun, planets and asteroid particles are enlarged markers.') :
                  focused.id === 'carbon' || focused.id === 'hydrogen' || focused.id === 'proton' ? S('atlas_quantum_note', 'A conceptual probability or charge cloud, not a solid surface. Colors are illustrative; an atomic nucleus would be too small to see here.') :
                  focused.id === 'everest' ? S('atlas_everest_note', 'The stated 8,849 m height is above sea level. Terrain uses a locally bundled Mapzen elevation grid at 75 m spacing, with no vertical exaggeration. SRTM and GMTED2010 data courtesy of the U.S. Geological Survey. Snow, rock colors and lighting are illustrative.') :
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
                h('button', { type: 'button', style: btn, disabled: !observations.length && !investigations.length && !scalingRecord && !drawingRecord, onClick: downloadObservations }, S('atlas_notebook_download', 'Download notes'))),
              h('p', { role: 'status', style: { margin: 0, fontSize: '0.75rem', minHeight: '1.5em' } }, notebookMessage)),

            // Estimate first, then check: the house Predict → Explore → Explain
            // shape. The reveal is never withheld and never scored.
            challenge ? h('details', { ref: inquiryPanelRef, className: 'sx-inquiry' },
              h('summary', { style: { padding: '10px 0', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 700, color: P.text } }, S('est_heading', 'Estimate first')),
              h('div', { style: Object.assign({}, card, { display: 'flex', flexDirection: 'column', gap: 8 }) },
                h('label', { style: { fontSize: '.75rem' } }, S('atlas_inquiry_theme', 'Investigation theme'),
                  h('select', { value: themeChoice, onChange: function (event) { setThemeChoice(event.target.value); }, style: Object.assign({}, sel, { width: '100%', marginTop: 4 }) },
                    INQUIRY_THEMES.map(function (theme) { return h('option', { key: theme.id, value: theme.id }, S('atlas_inquiry_theme_' + theme.id, theme.title)); }),
                    h('option', { value: 'mixed' }, S('atlas_inquiry_mixed', 'Mixed scales')))),
                h('button', { type: 'button', style: btn, onClick: startInvestigation }, S('atlas_inquiry_start', 'Start investigation')),
                h('h4', { style: { margin: '6px 0 0', fontSize: '.875rem' } }, inquiryTitle(pair)),
                h('p', { style: { margin: 0 } },
                  S('atlas_inquiry_question', 'How many powers of ten separate {big} and {small} along their stated dimensions?',
                    { big: lowerArticle(itemText(challenge.big, 'name')), small: lowerArticle(itemText(challenge.small, 'name')) })),
                h('label', { style: { fontSize: '0.71875rem', color: P.dim } },
                  S('est_label', 'Your estimate, in powers of ten'),
                  h('input', { type: 'number', inputMode: 'decimal', step: '.1', min: '0', max: ESTIMATE_MAX, value: guess, disabled: revealed,
                    'aria-invalid': guess !== '' && prediction === null ? 'true' : undefined, 'aria-describedby': descId + '-prediction-help',
                    onChange: function (e) { setGuess(e.target.value); },
                    onKeyDown: function (e) { if (e.key === 'Enter') { e.preventDefault(); lockInEstimate(); } },
                    style: Object.assign({}, sel, { width: '100%', marginTop: 2 }) })),
                h('p', { id: descId + '-prediction-help', style: { margin: 0, fontSize: '.6875rem', color: guess !== '' && prediction === null ? P.warn : P.dim, lineHeight: 1.5 } },
                  S('atlas_inquiry_help', 'Enter a number from 0 to 45. One power of ten is a tenfold ratio; decimal predictions are welcome.')),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap' } },
                  !revealed ? h('button', { type: 'button', style: goBtn, disabled: prediction === null, onClick: lockInEstimate }, S('est_go', 'Lock in my estimate')) : null,
                  revealed ? h('button', { type: 'button', style: btn, onClick: function () { showInvestigation(pair); } }, S('est_show', 'Show me')) : null,
                  h('button', { type: 'button', style: btn, onClick: newChallenge }, S('est_new', 'Another pair'))),
                revealed ? h('p', { role: 'status', style: { margin: 0, fontWeight: 600 } },
                  estimateVerdict(prediction) + ' ' + challengeReveal()) : null,
                revealed ? h('div', { className: 'sx-inquiry-evidence' },
                  predictionChart(),
                  h('p', { style: { fontSize: '.75rem', lineHeight: 1.5 } }, predictionFeedback(prediction, challenge)),
                  h('ul', { style: { paddingLeft: 18, margin: '8px 0', fontSize: '.75rem', lineHeight: 1.6 } }, [challenge.small, challenge.big].map(function (item) {
                    return h('li', { key: item.id }, itemText(item, 'name') + ': ' + lengthText(item.size) + ' · ' + S('dim_' + item.dim.replace(/\s+/g, '_'), item.dim), item.note ? h('p', { style: { margin: '3px 0', color: P.dim, fontSize: '.6875rem' } }, itemText(item, 'note')) : null);
                  })),
                  h('p', { style: { fontSize: '.75rem', lineHeight: 1.5 } }, activeInquiryTheme ? S('atlas_inquiry_reflect_' + activeInquiryTheme.id, activeInquiryTheme.reflect) : S('atlas_inquiry_reflect_mixed', 'Which reference helped your prediction? What would you change in your explanation after exploring the comparison?')),
                  h('label', { style: { fontSize: '.75rem' } }, S('atlas_inquiry_reflection', 'My reflection'),
                    h('textarea', { value: reflection, maxLength: NOTE_LIMIT, rows: 3, onChange: function (event) { setReflection(event.target.value); setInquiryMessage(''); },
                      style: Object.assign({}, sel, { display: 'block', width: '100%', marginTop: 4, resize: 'vertical' }) })),
                  h('button', { type: 'button', style: Object.assign({}, goBtn, { marginTop: 8 }), disabled: !savedInvestigation && investigations.length >= INQUIRY_LIMIT, onClick: saveInvestigation },
                    savedInvestigation ? S('atlas_inquiry_update', 'Update investigation') : S('atlas_inquiry_save', 'Save investigation')),
                  !savedInvestigation && investigations.length >= INQUIRY_LIMIT ? h('p', { style: { color: P.warn, fontSize: '.75rem' } }, S('atlas_inquiry_full', 'You have 12 saved investigations. Remove one to save another; existing investigations can still be updated.')) : null) : null,
                challenge.small.id === 'human' || challenge.big.id === 'human' ? h('p', { style: { margin: 0, fontSize: '.6875rem', lineHeight: 1.5, color: P.dim } }, S('atlas_inquiry_snapshot_hint', 'This investigation keeps the measurements it started with. Start another after changing your height to use the new reference.')) : null,
                h('details', { ref: inquiryHistoryRef, className: 'sx-inquiry-history' },
                  h('summary', { style: { padding: '8px 0', cursor: 'pointer', fontWeight: 600 } }, S('atlas_inquiry_count', 'Saved investigations · {n}', { n: investigations.length })),
                  investigations.length ? h('ol', { style: { listStyle: 'none', padding: 0, margin: 0, maxHeight: 300, overflowY: 'auto' } }, investigations.map(function (entry) {
                    var title = inquiryTitle(entry), measured = compareMeasurements(inquiryMeasurement(entry.small), inquiryMeasurement(entry.big));
                    return h('li', { key: entry.id, 'data-investigation': entry.id, style: { borderTop: '1px solid ' + P.line, padding: '10px 0', overflowWrap: 'anywhere', fontSize: '.75rem' } },
                      h('strong', null, title),
                      h('p', { style: { margin: '4px 0', color: P.dim } }, S('atlas_inquiry_history_ratio', 'Predicted {guess}; measured {actual} powers of ten.', { guess: entry.guess, actual: round2(measured.decades) })),
                      entry.reflection ? h('p', { style: { whiteSpace: 'pre-wrap', margin: '4px 0 8px' } }, entry.reflection) : null,
                      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                        h('button', { type: 'button', style: btn, onClick: function () { loadInvestigation(entry); }, 'aria-label': S('atlas_inquiry_return_aria', 'Return to investigation: {name}', { name: title }) }, S('atlas_inquiry_return', 'Return to investigation')),
                        h('button', { type: 'button', style: btn, onClick: function () { removeInvestigation(entry); }, 'aria-label': S('atlas_inquiry_remove_aria', 'Remove investigation: {name}', { name: title }) }, S('atlas_inquiry_remove', 'Remove'))));
                  })) : h('p', { style: { fontSize: '.75rem', color: P.dim } }, S('atlas_inquiry_empty', 'Save a prediction and reflection to keep the evidence here.')),
                  h('button', { type: 'button', style: btn, disabled: !investigations.length, onClick: downloadObservations }, S('atlas_inquiry_download', 'Download investigations'))),
                h('p', { role: 'status', style: { fontSize: '.75rem', margin: 0, minHeight: '1.5em' } }, inquiryMessage))) : null,

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

            scalingLab(),
            drawingWorkshop(),

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
