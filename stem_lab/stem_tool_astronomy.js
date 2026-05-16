/* eslint-disable */
// stem_tool_astronomy.js — Night Sky & Astronomy Lab
// Earth & Space Science: constellations (including Wabanaki + cross-cultural
// sky traditions), moon phases, planets, seasons, stars, galaxies, eclipses,
// observing practice, light-pollution awareness. NGSS MS-ESS1 + HS-ESS1.
// Built for King Middle's place-based pedagogy (Maine + Wabanaki star stories).
(function() {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_astronomy.js loaded before StemLab registry — bailing');
    return;
  }

  // ──────────────────────────────────────────────────────────────────
  // DATA: Constellations (Greek + Wabanaki + cross-cultural traditions)
  // ──────────────────────────────────────────────────────────────────
  var CONSTELLATIONS = [
    {
      id: 'ursa_major', name: 'Ursa Major', common: 'The Great Bear (Big Dipper)',
      season: 'Year-round (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Dubhe', 'Merak', 'Alkaid'],
      story: 'In Greek myth, Callisto was turned into a bear by Hera. Her son Arcas almost killed her hunting; Zeus placed both in the sky as Ursa Major and Ursa Minor.',
      indigenous: 'In many Algonquin traditions (including Wabanaki), the bowl of the Big Dipper is a bear, and the three stars of the handle are hunters tracking it across the sky through the seasons. When the bear lowers in autumn, the leaves turn red from the bear\'s blood.',
      howToFind: 'The seven brightest stars form a dipper or "plough" shape. The two stars at the front of the bowl point to Polaris (the North Star). Visible all year from northern latitudes.',
      sciFacts: 'Mizar (middle handle star) is a famous double star, visible to keen eyes paired with Alcor. Through binoculars or a telescope, Mizar itself splits into two more stars — and each of those is also double.'
    },
    {
      id: 'orion', name: 'Orion', common: 'The Hunter',
      season: 'Winter (Northern Hemisphere)', hemisphere: 'both',
      brightStars: ['Betelgeuse (red)', 'Rigel (blue)', 'Belt: Alnitak, Alnilam, Mintaka'],
      story: 'Greek mythology: Orion the giant hunter. Multiple myths — one has Artemis loving him and Apollo tricking her into shooting him; another has him stung by a scorpion. The Scorpion (Scorpius) rises as Orion sets.',
      indigenous: 'In Wabanaki tradition the three belt stars are sometimes called the canoe of three brothers. In Aboriginal Australian traditions (Yolngu people) the same three stars are three brothers fishing in a canoe. In many cultures the three belt stars are the brightest most-recognized "asterism."',
      howToFind: 'In winter evenings, look south. The three bright stars in a row (the Belt) are unmistakable. Above the belt is reddish Betelgeuse (a dying red supergiant); below is blue Rigel. The Orion Nebula hangs below the belt — visible to the naked eye as a fuzzy patch.',
      sciFacts: 'Betelgeuse will go supernova "soon" on cosmic timescales (within a few hundred thousand years). When it does, it will briefly outshine the moon. The Orion Nebula is a stellar nursery: stars are being born there right now.'
    },
    {
      id: 'cassiopeia', name: 'Cassiopeia', common: 'The Queen (W or M)',
      season: 'Year-round (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Schedar', 'Caph', 'Tsih'],
      story: 'Cassiopeia was a vain queen who boasted of her beauty, angering Poseidon. She was placed in the sky tied to her throne, condemned to rotate around the pole — sometimes hanging upside down.',
      indigenous: 'In some Sami (northern Scandinavian Indigenous) traditions, this W-shape is an elk or moose. In Marshallese (Polynesian) navigation, these stars helped mark celestial paths across the Pacific.',
      howToFind: 'Look opposite the Big Dipper across Polaris. A distinct W or M shape (depending on time of year and your latitude) of five bright stars.',
      sciFacts: 'Tycho\'s supernova exploded in Cassiopeia in 1572. It was bright enough to see in daytime for weeks and helped overturn the idea that the heavens were unchanging.'
    },
    {
      id: 'scorpius', name: 'Scorpius', common: 'The Scorpion',
      season: 'Summer (Northern Hemisphere)', hemisphere: 'both',
      brightStars: ['Antares (red)', 'Shaula', 'Sargas'],
      story: 'Greek: the scorpion that killed Orion. Placed on opposite sides of the sky so they never appear together.',
      indigenous: 'In Polynesian navigation, the curve of Scorpius is the fishhook of Maui. In Aboriginal Australian (Boorong) astronomy, Antares is the head of a great hunter and the body of Scorpius is his outstretched body in death.',
      howToFind: 'Summer evenings, low in the southern sky. The bright red star Antares (rival of Mars) sits at the heart. The body curves down to the stinger of two close bright stars (Shaula and Lesath, called "the Cat\'s Eyes").',
      sciFacts: 'Antares is a red supergiant about 700 times the diameter of the sun. If you placed it where the sun is, it would swallow Earth and reach almost to Jupiter.'
    },
    {
      id: 'cygnus', name: 'Cygnus', common: 'The Swan (Northern Cross)',
      season: 'Summer to fall (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Deneb', 'Albireo', 'Sadr'],
      story: 'In one Greek myth Zeus turned himself into a swan; in another, the swan is Cygnus who searched a river for a lost friend until the gods placed him in the sky.',
      indigenous: 'In some Polynesian traditions, Deneb (the swan\'s tail) is one of the brightest navigation stars. In Lakota astronomy, this region is part of the "Spirit Path."',
      howToFind: 'Summer Triangle: Deneb (Cygnus), Vega (Lyra), and Altair (Aquila). Cygnus appears to fly down the Milky Way.',
      sciFacts: 'Albireo (the swan\'s "head") is one of the most beautiful telescope objects in the sky: a gold and blue double star. They look like a pair, but probably aren\'t gravitationally bound.'
    },
    {
      id: 'leo', name: 'Leo', common: 'The Lion',
      season: 'Spring (Northern Hemisphere)', hemisphere: 'both',
      brightStars: ['Regulus', 'Denebola', 'Algieba'],
      story: 'Greek: the Nemean Lion killed by Heracles in the first of his twelve labors. The lion had a hide that no weapon could pierce; Heracles strangled it.',
      indigenous: 'In many ancient agricultural societies (Egyptian, Mesopotamian), Leo rose at dawn near the spring equinox, marking the planting season. The lion symbolism for spring/strength is widespread.',
      howToFind: 'Spring evenings. A backwards question mark (the "Sickle") forms the head and mane. Regulus, the brightest star, sits at the base of the sickle.',
      sciFacts: 'Regulus rotates so fast it\'s squashed into an oblate spheroid — its equator is about 32% larger than its poles. One day on Regulus is just 15.9 hours.'
    },
    {
      id: 'taurus', name: 'Taurus', common: 'The Bull (with Pleiades)',
      season: 'Winter (Northern Hemisphere)', hemisphere: 'both',
      brightStars: ['Aldebaran (red eye)', 'Elnath', 'Pleiades cluster'],
      story: 'Greek: Zeus turned himself into a white bull to abduct Europa. Different myths attach to the Pleiades — seven sisters mourning, hunted by Orion forever.',
      indigenous: 'The Pleiades are the most cross-culturally recognized star cluster on Earth. Wabanaki (Algonquin) traditions tell of seven children who became stars. Cherokee, Lakota, Maori (Matariki), Japanese (Subaru), and dozens of other peoples have specific names and seasonal stories tied to them.',
      howToFind: 'Winter evenings. Find Orion\'s belt; trace it up and to the right to a small dipper-shape — that\'s the Pleiades. Aldebaran, the bright orange eye of the bull, is on the way.',
      sciFacts: 'The Pleiades are a young open cluster, only about 100 million years old (the sun is 4.6 billion). About 1,000 stars, of which we see 6 to 9 with the naked eye depending on sky quality.'
    },
    {
      id: 'lyra', name: 'Lyra', common: 'The Lyre',
      season: 'Summer (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Vega'],
      story: 'Greek: the lyre of Orpheus, whose music could charm even Hades. When he failed to bring Eurydice back from the underworld, the lyre was placed in the sky.',
      indigenous: 'Vega is one of the brightest stars in the northern sky and shows up in navigation traditions across many cultures.',
      howToFind: 'Summer Triangle. Vega is the brightest of the three. The four stars of Lyra near Vega form a small parallelogram.',
      sciFacts: 'Vega will be the North Star around 13,000 CE due to Earth\'s axial precession (the slow wobble of Earth\'s rotation axis on a 26,000-year cycle).'
    },
    {
      id: 'sagittarius', name: 'Sagittarius', common: 'The Archer (Teapot)',
      season: 'Summer (Northern Hemisphere)', hemisphere: 'both',
      brightStars: ['Kaus Australis', 'Nunki'],
      story: 'Greek: a centaur (some myths say Chiron) drawing a bow.',
      indigenous: 'In Lakota traditions, parts of this region are part of "Wakȟánuŋnaȟpi," the celestial council fire.',
      howToFind: 'Summer evenings, low in the south. Easier to see as a teapot than an archer. The Milky Way pours out of the spout.',
      sciFacts: 'The center of our Milky Way galaxy lies in the direction of Sagittarius. Sagittarius A* (Sgr A-star) is the supermassive black hole at the galactic center — 4 million times the mass of the sun.'
    },
    {
      id: 'andromeda', name: 'Andromeda', common: 'The Princess',
      season: 'Fall (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Alpheratz', 'Mirach'],
      story: 'Greek: Andromeda was chained to a rock as sacrifice to a sea monster. Perseus rescued her. Her parents (Cassiopeia, Cepheus) and rescuer are all nearby constellations.',
      indigenous: 'The cross-cultural story varies; the Andromeda Galaxy in this constellation has been observed and named in many traditions, though without telescopes it appears as a faint smudge.',
      howToFind: 'Fall evenings. From the W of Cassiopeia, look toward the Great Square of Pegasus; Andromeda extends from the corner.',
      sciFacts: 'The Andromeda Galaxy (M31) is the most distant object visible to the naked eye, at 2.5 million light-years away. It contains about a trillion stars and is on a collision course with the Milky Way — they\'ll merge in about 4.5 billion years.'
    },
    {
      id: 'crux', name: 'Crux', common: 'The Southern Cross',
      season: 'Year-round (Southern Hemisphere)', hemisphere: 'S',
      brightStars: ['Acrux', 'Mimosa', 'Gacrux', 'Imai'],
      story: 'Crux is the smallest of all 88 constellations. Recognized in Europe only after Portuguese sailors brought it back from Southern Hemisphere voyages in the 15th-16th centuries. Once part of Centaurus before being split off.',
      indigenous: 'In Māori navigation, Crux is part of "Te Punga" (the anchor) of the great celestial canoe. In Aboriginal Australian tradition, the dark Coalsack Nebula next to Crux is the head of the Emu in the Sky. The Southern Cross appears on the flags of Australia, New Zealand, Brazil, Papua New Guinea, and Samoa.',
      howToFind: 'The kite-shaped pattern of four bright stars is unmistakable in the southern sky. Two of those stars (Gacrux to Acrux) point toward the south celestial pole — useful for navigation.',
      sciFacts: 'Crux\'s brightest star Acrux is actually a multiple-star system, with at least 5 components. The neighboring Coalsack Nebula is one of the most prominent naked-eye dark nebulae — a cloud of dust blocking light from stars behind it.'
    },
    {
      id: 'aquila', name: 'Aquila', common: 'The Eagle',
      season: 'Summer (Northern Hemisphere)', hemisphere: 'both',
      brightStars: ['Altair'],
      story: 'Greek: the eagle that carried Zeus\'s thunderbolts. Also identified as the eagle that abducted the youth Ganymede to be cupbearer to the gods.',
      indigenous: 'In Polynesian navigation, Altair is one of the brightest "zenith stars" — stars that pass directly overhead at known latitudes. Voyagers used it to maintain latitude across thousands of miles of open Pacific.',
      howToFind: 'Summer Triangle. Altair, with two close companion stars on either side, is the southernmost vertex of the triangle (with Vega and Deneb).',
      sciFacts: 'Altair is only 16.8 light-years away — among the closest naked-eye stars. It spins so fast (one rotation in 9 hours) that it\'s significantly oblate, bulging at its equator.'
    },
    {
      id: 'bootes', name: 'Boötes', common: 'The Herdsman',
      season: 'Spring (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Arcturus'],
      story: 'Greek: a herdsman driving the Great Bear (Ursa Major) around the pole, sometimes identified as the inventor of the plough. Various myths attach.',
      indigenous: 'In some Inuit traditions, Arcturus is one of the marker stars of the seasons. The shift in its rising time across the year tracks the long polar light cycle.',
      howToFind: 'Spring evenings. From the handle of the Big Dipper, "arc to Arcturus" — follow the curve of the handle and you\'ll hit the bright orange star Arcturus. Boötes is the kite-shaped constellation containing it.',
      sciFacts: 'Arcturus is one of the brightest stars in the sky and the third-brightest individual star (after Sirius and Canopus). It\'s a red giant in late life, about 25× the diameter of our Sun. Moves through the galaxy unusually fast — likely a visitor from a smaller galaxy the Milky Way absorbed long ago.'
    },
    {
      id: 'centaurus', name: 'Centaurus', common: 'The Centaur',
      season: 'Spring (Southern Hemisphere)', hemisphere: 'S',
      brightStars: ['Alpha Centauri', 'Hadar'],
      story: 'Greek: a centaur, often identified as Chiron, the wise centaur who taught many heroes. Survives in the sky after sacrificing his immortality.',
      indigenous: 'In Aboriginal Australian traditions, the Alpha and Beta Centauri stars are two brothers. Across the Southern Hemisphere, these brilliant stars are landmarks impossible to miss.',
      howToFind: 'Best from the Southern Hemisphere (mostly invisible from North America and Europe). The pointer stars Alpha and Beta Centauri direct attention toward Crux nearby.',
      sciFacts: 'Alpha Centauri is the closest star system to the Sun: 4.37 light-years away, a triple system of Alpha Centauri A, B, and Proxima Centauri. Proxima Centauri b, an Earth-mass exoplanet in the habitable zone, was discovered in 2016.'
    },
    {
      id: 'ursa_minor', name: 'Ursa Minor', common: 'The Little Bear (Little Dipper)',
      season: 'Year-round (Northern Hemisphere)', hemisphere: 'N',
      brightStars: ['Polaris (the North Star)'],
      story: 'Greek: Arcas, the son of Callisto (Ursa Major). When Hera turned Callisto into a bear, Zeus turned Arcas into a smaller bear and placed them both in the sky.',
      indigenous: 'Polaris has been the navigational guide of Northern Hemisphere peoples for thousands of years, from Wabanaki canoe travel to Norse seafaring. The pole star changes very slowly: in 13,000 years Vega will be the pole star due to Earth\'s axial precession.',
      howToFind: 'The two outer stars of the Big Dipper\'s bowl point to Polaris (about 5× the distance between them). Polaris sits at the end of the Little Dipper\'s handle. The Little Dipper\'s bowl curves downward from there.',
      sciFacts: 'Polaris is not actually the brightest star in the sky (it ranks ~48th), but it sits within 0.7° of the north celestial pole. It is a Cepheid variable: it pulses brighter and dimmer on a 4-day cycle. Cepheid variables are how astronomers measure distances to other galaxies.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Exoplanets
  // ──────────────────────────────────────────────────────────────────
  var EXOPLANETS = [
    {
      id: 'proxima_b', name: 'Proxima Centauri b', host: 'Proxima Centauri (red dwarf)',
      distance: '4.24 light-years', discovered: 2016, mass: '~1.07 Earth masses', orbital: '11.2 days',
      habitable: 'In habitable zone',
      story: 'The closest known exoplanet, orbiting the closest star to our Sun. In the habitable zone (where liquid water could exist on the surface). However, Proxima is a red dwarf with frequent flares; the planet is tidally locked (one side always faces the star); and the atmosphere, if any, is unknown.',
      detection: 'Doppler / radial velocity method (the star wobbles slightly as the planet pulls it).'
    },
    {
      id: 'trappist1', name: 'TRAPPIST-1 system (7 planets)', host: 'TRAPPIST-1 (cool red dwarf)',
      distance: '40 light-years', discovered: 2017, mass: 'all roughly Earth-mass', orbital: '1.5 to 19 days',
      habitable: 'Three planets in habitable zone (e, f, g)',
      story: 'A nearby ultracool dwarf with 7 known terrestrial planets, all close enough to their star that an Earth-sized observer on one planet could see the others as discs in the sky. Three are in the habitable zone. JWST is studying their atmospheres now.',
      detection: 'Transit photometry (the planets dim the star\'s light as they pass in front).'
    },
    {
      id: 'kepler_452b', name: 'Kepler-452b', host: 'Kepler-452 (G-type, like our Sun)',
      distance: '~1,800 light-years', discovered: 2015, mass: '~5 Earth masses (super-Earth)', orbital: '385 days',
      habitable: 'In habitable zone of a Sun-like star',
      story: 'Often called "Earth\'s cousin": orbiting a Sun-like star at almost Earth\'s distance, with a year about the same length. About 1.5× Earth\'s radius. The star is about 6 billion years old (older than the Sun) — if this planet held liquid water, it\'s had a long time to do something interesting.',
      detection: 'Transit (Kepler space telescope, NASA, 2009-2018).'
    },
    {
      id: 'hd_209458b', name: 'HD 209458 b ("Osiris")', host: 'HD 209458 (G-type star)',
      distance: '~159 light-years', discovered: 1999, mass: '~0.69 Jupiter masses', orbital: '3.5 days',
      habitable: 'No — too hot',
      story: 'A "hot Jupiter" orbiting so close to its star that the planet is being evaporated, with hydrogen streaming away in a comet-like tail. The first exoplanet observed to transit its star, the first to have its atmosphere detected, the first with detected oxygen, carbon, and water vapor.',
      detection: 'Doppler then transit confirmation; many "firsts" in exoplanet science came from this single planet.'
    },
    {
      id: 'wasp12b', name: 'WASP-12b', host: 'WASP-12 (yellow dwarf)',
      distance: '~1,400 light-years', discovered: 2008, mass: '~1.4 Jupiter masses', orbital: '26 hours',
      habitable: 'No — being eaten by its star',
      story: 'Possibly the darkest exoplanet ever observed (reflects only ~6% of light). So close to its star that the planet is distorted into an egg shape by tidal forces. Will be consumed by its star in about 10 million years.',
      detection: 'Transit.'
    },
    {
      id: 'k2_18b', name: 'K2-18 b', host: 'K2-18 (cool red dwarf)',
      distance: '~124 light-years', discovered: 2015, mass: '~8.6 Earth masses (sub-Neptune)', orbital: '33 days',
      habitable: 'In habitable zone; possible "Hycean" (hot ocean + hydrogen atmosphere) world',
      story: 'In 2023, JWST detected methane and CO₂ in its atmosphere, plus a tentative signal of dimethyl sulfide (a gas produced on Earth only by life — primarily by marine plankton). The DMS detection is unconfirmed and contested. If true, it would be the first molecular hint of life beyond Earth.',
      detection: 'Transit + JWST atmospheric spectroscopy.'
    }
  ];

  var EXO_OVERVIEW = {
    knownCount: '~5,800+ confirmed (as of 2024-2025)',
    methods: [
      { id: 'doppler', name: 'Radial velocity (Doppler)',
        how: 'The star wobbles slightly as a planet orbits, shifting starlight to redder or bluer wavelengths. Detects massive planets first.',
        first: 'First confirmed exoplanets around a normal star (51 Pegasi b, 1995, Mayor + Queloz, 2019 Nobel Prize).' },
      { id: 'transit', name: 'Transit photometry',
        how: 'A planet crossing in front of its star dims the starlight by a tiny amount (typically 0.01% to 1%). Detects smaller planets; best for short orbits.',
        first: 'Most modern discoveries: Kepler space telescope (2009-2018) confirmed ~2,700 planets this way. TESS (2018-) continues.' },
      { id: 'imaging', name: 'Direct imaging',
        how: 'Actually photographing the planet. Very hard — the star is millions to billions of times brighter. Requires special coronagraphs that block the starlight.',
        first: 'Mostly young, hot, large planets orbiting far from their stars. HR 8799 system, 2008.' },
      { id: 'microlensing', name: 'Gravitational microlensing',
        how: 'A planet passing in front of a more distant star bends and brightens the distant star\'s light. Detects planets at any distance — including ones with very long orbits.',
        first: 'OGLE survey + others. Detects "rogue" planets not bound to any star.' },
      { id: 'astrometry', name: 'Astrometry',
        how: 'Measuring tiny changes in a star\'s position on the sky as a planet pulls it. ESA\'s Gaia spacecraft is expected to discover tens of thousands this way.',
        first: 'Just becoming productive. Gaia mission ongoing.' }
    ]
  };

  // ──────────────────────────────────────────────────────────────────
  // DATA: Moon phases (8 standard phases with %illumination)
  // ──────────────────────────────────────────────────────────────────
  var MOON_PHASES = [
    { id: 'new',           name: 'New Moon',          pct: 0,   age: 0,    desc: 'The Moon is between Earth and Sun. The lit side faces away from us. Sky is darkest — best for stargazing.', visibility: 'Rises and sets with the Sun. Not visible.' },
    { id: 'waxing_cresc',  name: 'Waxing Crescent',   pct: 25,  age: 3.5,  desc: 'A thin crescent of light grows on the right side (Northern Hemisphere). "Waxing" = growing.', visibility: 'Visible in the western sky after sunset.' },
    { id: 'first_quarter', name: 'First Quarter',     pct: 50,  age: 7,    desc: 'Half-lit on the right. The terminator (light-dark line) crosses the middle of the moon — best detail through binoculars.', visibility: 'Rises at noon, sets at midnight. High overhead at sunset.' },
    { id: 'waxing_gibb',   name: 'Waxing Gibbous',    pct: 75,  age: 10.5, desc: 'More than half lit, growing toward full. "Gibbous" = hump-shaped.', visibility: 'Visible most of the evening, sets after midnight.' },
    { id: 'full',          name: 'Full Moon',         pct: 100, age: 14,   desc: 'Earth is between Moon and Sun. The full near-side is lit. Sky is too bright for deep-sky observing.', visibility: 'Rises at sunset, sets at sunrise. Visible all night.' },
    { id: 'waning_gibb',   name: 'Waning Gibbous',    pct: 75,  age: 17.5, desc: 'Lit on the left side, shrinking. "Waning" = shrinking.', visibility: 'Rises after sunset, visible most of the night and into morning.' },
    { id: 'last_quarter',  name: 'Last Quarter',      pct: 50,  age: 21,   desc: 'Half-lit on the left side. The terminator again crosses the middle.', visibility: 'Rises at midnight, high overhead at sunrise.' },
    { id: 'waning_cresc',  name: 'Waning Crescent',   pct: 25,  age: 24.5, desc: 'Thin crescent on the left, fading toward new moon.', visibility: 'Visible in the eastern sky before sunrise.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Planets (naked-eye + others, with key facts)
  // ──────────────────────────────────────────────────────────────────
  var PLANETS = [
    { id: 'mercury', name: 'Mercury',  icon: '☿', auFromSun: 0.39, diameterEarth: 0.38, dayHours: 4222.6, yearDays: 88,    moons: 0,   visible: 'naked-eye', color: '#8b7355',
      fact: 'Closest to the Sun. Surface ranges from −180°C at night to +430°C in daylight. Has a strange 3:2 spin-orbit resonance — 3 rotations for every 2 orbits.' },
    { id: 'venus',   name: 'Venus',    icon: '♀', auFromSun: 0.72, diameterEarth: 0.95, dayHours: 5832,   yearDays: 225,   moons: 0,   visible: 'naked-eye', color: '#e8c47a',
      fact: 'Brightest planet, often the "morning star" or "evening star." Thick CO₂ atmosphere creates runaway greenhouse — surface is 465°C (hotter than Mercury). Spins backwards (retrograde).' },
    { id: 'earth',   name: 'Earth',    icon: '🜨', auFromSun: 1.00, diameterEarth: 1.00, dayHours: 24,     yearDays: 365.25, moons: 1,   visible: 'self', color: '#4a90e2',
      fact: 'The only known world with liquid water on its surface, a magnetic field strong enough to protect from solar wind, and life. So far we have not detected life anywhere else, despite ~5,500 confirmed exoplanets.' },
    { id: 'mars',    name: 'Mars',     icon: '♂', auFromSun: 1.52, diameterEarth: 0.53, dayHours: 24.6,   yearDays: 687,   moons: 2,   visible: 'naked-eye', color: '#d76f43',
      fact: 'Olympus Mons is the largest volcano in the solar system — 22 km tall, three times the height of Everest. Past evidence of running water; now mostly frozen. The two moons (Phobos, Deimos) are probably captured asteroids.' },
    { id: 'jupiter', name: 'Jupiter',  icon: '♃', auFromSun: 5.20, diameterEarth: 11.2, dayHours: 9.9,    yearDays: 4333,  moons: 95,  visible: 'naked-eye', color: '#c9a877',
      fact: 'The largest planet — could fit 1,300 Earths inside. The Great Red Spot is a storm bigger than Earth that has lasted at least 400 years. Four large moons (Io, Europa, Ganymede, Callisto) visible with binoculars; Europa likely has a subsurface ocean.' },
    { id: 'saturn',  name: 'Saturn',   icon: '♄', auFromSun: 9.54, diameterEarth: 9.45, dayHours: 10.7,   yearDays: 10759, moons: 146, visible: 'naked-eye', color: '#e6d39f',
      fact: 'The rings are mostly ice particles, from dust-sized to house-sized. So thin (about 10 m thick) that they almost disappear when seen edge-on. Saturn is less dense than water — if you had an ocean big enough, it would float.' },
    { id: 'uranus',  name: 'Uranus',   icon: '♅', auFromSun: 19.2, diameterEarth: 4.0,  dayHours: 17.2,   yearDays: 30687, moons: 27,  visible: 'binoculars', color: '#a3d4d9',
      fact: 'Tipped on its side — axial tilt of 98°. Each pole gets 42 years of continuous sunlight, then 42 years of darkness. The methane in its atmosphere gives the cyan color.' },
    { id: 'neptune', name: 'Neptune',  icon: '♆', auFromSun: 30.1, diameterEarth: 3.9,  dayHours: 16.1,   yearDays: 60190, moons: 16,  visible: 'telescope',  color: '#4068c4',
      fact: 'Discovered by mathematics first — astronomers noticed Uranus wasn\'t orbiting quite right, predicted where another planet had to be, and pointed telescopes there. Winds reach 2,100 km/h, the fastest in the solar system.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Stellar types (HR diagram simplified)
  // ──────────────────────────────────────────────────────────────────
  var STAR_TYPES = [
    { id: 'O', class: 'O', name: 'O-type (Blue)',         tempK: '30,000-50,000', color: '#4b6bdf', massSun: '15-90',   life: '~10 million yr',   example: 'Mintaka (Orion belt)', desc: 'Very hot, blue, massive, short-lived. End as supernovae and black holes.' },
    { id: 'B', class: 'B', name: 'B-type (Blue-white)',    tempK: '10,000-30,000', color: '#7c9eff', massSun: '2-15',    life: '~50 million yr',   example: 'Rigel (Orion)',         desc: 'Hot, blue-white. Also massive, also end as supernovae.' },
    { id: 'A', class: 'A', name: 'A-type (White)',         tempK: '7,500-10,000',  color: '#dbe7ff', massSun: '1.4-2.1', life: '~1 billion yr',    example: 'Vega, Sirius',          desc: 'White, fairly hot. Strong hydrogen lines.' },
    { id: 'F', class: 'F', name: 'F-type (Yellow-white)',  tempK: '6,000-7,500',   color: '#f5f1d4', massSun: '1.0-1.4', life: '~5 billion yr',    example: 'Procyon',               desc: 'Yellowish-white. Stable, long-lived, can host life zones.' },
    { id: 'G', class: 'G', name: 'G-type (Yellow / SUN)',  tempK: '5,200-6,000',   color: '#fde9a0', massSun: '0.8-1.0', life: '~10 billion yr',   example: 'Our Sun',               desc: 'Yellow main-sequence stars. The Sun is a G2V. Sweet spot for stable, long-lasting stars.' },
    { id: 'K', class: 'K', name: 'K-type (Orange)',        tempK: '3,700-5,200',   color: '#fec072', massSun: '0.4-0.8', life: '~30 billion yr',   example: 'Alpha Centauri B',      desc: 'Orange, cooler, smaller, very long-lived. Excellent targets for habitable-zone searches.' },
    { id: 'M', class: 'M', name: 'M-type (Red dwarf)',     tempK: '2,400-3,700',   color: '#ff8568', massSun: '0.08-0.4',life: '100+ billion yr',  example: 'Proxima Centauri',      desc: 'The most common stars in the galaxy (about 70% of all stars). Cool, dim, extremely long-lived. Most exoplanets we have found orbit red dwarfs.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Eclipses & cosmic events
  // ──────────────────────────────────────────────────────────────────
  var EVENTS_LEARN = [
    { id: 'lunar_e',    name: 'Lunar Eclipse',  icon: '🌑', what: 'Earth\'s shadow falls on the Moon. The full Moon turns a copper/red color (sometimes called a "blood moon") because sunlight bent through Earth\'s atmosphere reaches the Moon.', when: 'Only at Full Moon. 2-4 per year somewhere on Earth.', safety: 'Safe to look at directly with naked eye, binoculars, or telescope.' },
    { id: 'solar_e',    name: 'Solar Eclipse',  icon: '☀️', what: 'The Moon passes between Earth and Sun, blocking part or all of the Sun\'s disk. Total eclipses reveal the corona — the Sun\'s outer atmosphere — for a few minutes.', when: 'Only at New Moon. 2-5 per year somewhere on Earth, but total eclipses are rare at any given location (once every ~375 years on average).', safety: 'NEVER look at the Sun without certified solar-eclipse glasses (ISO 12312-2). Only during the brief moments of TOTALITY (totality only) is it safe to remove glasses. Looking directly burns the retina permanently.' },
    { id: 'meteor',     name: 'Meteor Shower',  icon: '☄️', what: 'Earth passes through dust left by a comet. Dust grains hit the upper atmosphere at ~70 km/s and burn up, producing streaks of light. They appear to come from a single point (the "radiant") but can be seen all over the sky.', when: 'Annual showers: Perseids (Aug 12), Geminids (Dec 13-14), Quadrantids (Jan 3-4), Leonids (Nov 17-18) are the strongest. Best viewing: after midnight, away from city lights, when the moon is below the horizon.', safety: 'Completely safe to view. Just go outside and look up.' },
    { id: 'comet',      name: 'Comet',          icon: '☄', what: 'Frozen leftovers from the early solar system. When a comet gets near the Sun, ice sublimates and releases gas + dust that forms a tail pushed away from the Sun by solar wind. Bright comets are rare and unpredictable.', when: 'Major naked-eye comets average once per decade. Recent: NEOWISE (2020), Tsuchinshan-ATLAS (2024).', safety: 'Safe. Use binoculars or naked eye; long-exposure photography reveals the tail dramatically.' },
    { id: 'supernova',  name: 'Supernova',      icon: '💥', what: 'A massive star (or a white dwarf accreting matter) explodes. For weeks, the star outshines an entire galaxy of normal stars. Heavier elements (calcium in your bones, iron in your blood) were forged in supernovae.', when: 'In our galaxy: 1-2 per century on average, though we have not observed one with the naked eye since 1604 (Kepler\'s supernova). The most recent nearby supernova was 1987A, in a satellite galaxy.', safety: 'Safe. Visible supernovae brighter than 6th magnitude are rare; most need telescopes.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Indigenous & cross-cultural astronomy
  // ──────────────────────────────────────────────────────────────────
  var INDIGENOUS_SKY = [
    {
      id: 'wabanaki',
      tradition: 'Wabanaki (Penobscot, Passamaquoddy, Maliseet, Mi\'kmaq, Abenaki)',
      region: 'Maine + Maritimes',
      stories: [
        { title: 'The Celestial Bear Hunt', text: 'Three hunters (the handle of the Big Dipper) and their dog (Alcor, the small star next to Mizar) track a bear (the bowl of the Big Dipper) across the sky from spring to autumn. When the bear is caught and tipped low in the western sky in autumn, its blood drips on the leaves and they turn red.' },
        { title: 'The Seven Children (Pleiades)', text: 'Seven children who were neglected by their parents asked the spirit of the dance to take them away. They danced into the sky and became the Pleiades. The story is told to remind adults to care for children.' },
        { title: 'Gisos, the Sun', text: 'In Mi\'kmaq tradition, Gisos travels across the sky each day; the names of the moons mark the seasons of harvesting, hunting, and planting. The "Strawberry Moon" (June) and "Cold Moon" (December) are widely known.' }
      ],
      practical: 'Wabanaki sky knowledge is tied to the land, the seasons, and survival. Stars marked when to hunt, when to fish, when to plant. Learn from Penobscot Nation, Passamaquoddy Tribe, or Wabanaki cultural educators for first-hand teaching.'
    },
    {
      id: 'lakota',
      tradition: 'Lakota / Dakota',
      region: 'Northern Plains',
      stories: [
        { title: 'The Spirit Path (Milky Way)', text: 'The Milky Way is the path of departed spirits traveling to the spirit world. Different parts of the path are associated with different beings and stages of the journey.' },
        { title: 'Wakȟánuŋnaȟpi (Sacred Hoop)', text: 'A constellation of stars (including parts of what Western astronomers call Cancer, Gemini, Orion) forms a sacred council fire that mirrors ceremonies on Earth at specific seasons.' }
      ],
      practical: 'Lakota star knowledge connects directly to ceremonies at sacred sites on the land. The astronomical calendar and the ceremonial calendar are the same calendar.'
    },
    {
      id: 'maori',
      tradition: 'Māori (Aotearoa / New Zealand)',
      region: 'Polynesia',
      stories: [
        { title: 'Matariki (the Pleiades)', text: 'When Matariki rises before dawn in midwinter (June or July, in the Southern Hemisphere), it marks the Māori New Year. Different stars in the cluster have specific names for prosperity, health, wind, food, rain, the sea, and remembrance of the recently deceased.' },
        { title: 'Te Waka o Tama-rereti (The Canoe)', text: 'A great celestial canoe stretches across the sky. The Southern Cross is its anchor; the Milky Way is the canoe\'s path.' }
      ],
      practical: 'Matariki is now an official New Zealand public holiday. Whetūrangitia (star-keeping) was central to Polynesian wayfinding — voyages across thousands of miles of open Pacific Ocean were guided by stars, swells, and bird flight.'
    },
    {
      id: 'aboriginal',
      tradition: 'Aboriginal Australian (varied)',
      region: 'Australia',
      stories: [
        { title: 'The Emu in the Sky', text: 'Unlike most Western constellations, this one is made of dark clouds in the Milky Way, not stars. The Emu\'s head is the Coalsack Nebula near the Southern Cross; its neck, body, and legs stretch along the dust lanes of the galaxy. The Emu\'s position in the sky tells when to gather emu eggs.' },
        { title: 'The Seven Sisters (Pleiades)', text: 'Many Aboriginal traditions tell of seven sisters being chased by a man (Orion). The story varies by Country but the seven Pleiades appearing with Orion behind them is a near-universal motif. Some scholars suggest this 100,000-year-old oral tradition records a real astronomical event — one of the Pleiades stars (Pleione) faded over that time.' }
      ],
      practical: 'Aboriginal astronomy is part of the oldest continuous cultural tradition on Earth (60,000+ years). Astronomical knowledge encodes navigation, seasonal food cycles, and law. The work of Indigenous astronomers Duane Hamacher and others is making this knowledge more visible.'
    },
    {
      id: 'islamic',
      tradition: 'Islamic Golden Age Astronomy',
      region: 'Middle East and North Africa, 8th-15th centuries',
      stories: [
        { title: 'Star names', text: 'Most of the bright stars we name today have Arabic-origin names: Aldebaran ("the follower"), Betelgeuse ("hand of the giant"), Algol ("the ghoul"), Vega ("the falling eagle"), Altair ("the flying eagle"), Rigel ("the foot"). Hundreds more.' },
        { title: 'Observatory tradition', text: 'Islamic astronomers built the first systematic observatories. Al-Battani measured the year length to within 24 seconds. Ulugh Beg\'s Samarkand observatory (15th c.) compiled the most accurate star catalog before the telescope.' }
      ],
      practical: 'The Astrolabe, the algebra needed for celestial calculations, and the system of identifying stars by Arabic names all come from this tradition. Modern astronomy stands on these foundations.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Bortle scale (light pollution)
  // ──────────────────────────────────────────────────────────────────
  var BORTLE = [
    { class: 1, name: 'Excellent dark-sky site',     skyMag: '21.7-22',   ms: '7.6-8.0', desc: 'Milky Way casts visible shadows. Zodiacal light, gegenschein visible. The night sky as it was before electric light. Found in remote wilderness only.' },
    { class: 2, name: 'Typical truly dark site',     skyMag: '21.5-21.7', ms: '7.1-7.5', desc: 'Milky Way shows great detail and structure. Limited horizon glow from distant cities. Most western US national parks at their best.' },
    { class: 3, name: 'Rural sky',                   skyMag: '21.3-21.5', ms: '6.6-7.0', desc: 'Some indication of light pollution at the horizon. Milky Way still very visible overhead. Many state parks in the rural eastern US.' },
    { class: 4, name: 'Rural / suburban transition', skyMag: '20.4-21.3', ms: '6.1-6.5', desc: 'Light domes visible from nearby cities. Milky Way visible but lacks detail near horizon.' },
    { class: 5, name: 'Suburban sky',                skyMag: '19.1-20.4', ms: '5.6-6.0', desc: 'Only the brightest parts of the Milky Way are visible. Sky has a definite glow. The condition most suburban Americans live in.' },
    { class: 6, name: 'Bright suburban sky',         skyMag: '18.0-19.1', ms: '5.1-5.5', desc: 'Milky Way not visible. Even the Andromeda Galaxy is hard to find with binoculars.' },
    { class: 7, name: 'Suburban / urban transition', skyMag: '~18.0',     ms: '4.6-5.0', desc: 'Sky has a strong orange/yellow glow. Constellations are still recognizable but bare of fainter stars.' },
    { class: 8, name: 'City sky',                    skyMag: '<18.0',     ms: '4.1-4.5', desc: 'Only Moon, planets, and brightest stars visible. Some constellations are unrecognizable. Most major US cities.' },
    { class: 9, name: 'Inner-city sky',              skyMag: '<18.0',     ms: '<4.0',    desc: 'Only Moon, planets, and a handful of the very brightest stars visible. The night sky is essentially erased.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // QUIZ
  // ──────────────────────────────────────────────────────────────────
  var QUIZ_QUESTIONS = [
    { q: 'What causes the phases of the Moon?', choices: ['Earth\'s shadow on the Moon', 'The Moon\'s rotation', 'The Moon orbiting Earth and showing different lit portions to us', 'Atmospheric refraction'], answer: 2, explain: 'The Moon doesn\'t generate light — it reflects sunlight. As it orbits Earth, we see different fractions of the lit half facing us. Earth\'s shadow only matters during lunar eclipses.' },
    { q: 'Why are summers warm and winters cold in temperate latitudes?', choices: ['Earth is closer to the Sun in summer', 'Earth\'s axis is tilted; sunlight hits more directly in summer', 'The Sun gets hotter in summer', 'The Earth\'s orbit is more circular in summer'], answer: 1, explain: 'Earth\'s 23.5° axial tilt means each hemisphere is tipped toward or away from the Sun as Earth orbits. The tilted hemisphere gets more direct sunlight per square meter AND longer days. Earth is actually slightly farther from the Sun during Northern Hemisphere summer.' },
    { q: 'How long does light from the Sun take to reach Earth?', choices: ['~8 seconds', '~8 minutes', '~8 hours', '~8 days'], answer: 1, explain: 'Light travels at 300,000 km/s. The Sun is 150 million km away. So light takes about 8 minutes 20 seconds. When you look at the Sun, you\'re seeing it as it was 8 minutes ago.' },
    { q: 'What is the closest star to Earth (other than the Sun)?', choices: ['Sirius', 'Polaris', 'Proxima Centauri', 'Vega'], answer: 2, explain: 'Proxima Centauri is about 4.24 light-years away. It\'s a small red dwarf in the Alpha Centauri triple-star system. Sirius is the brightest star in our sky but is 8.6 light-years away.' },
    { q: 'During a SOLAR eclipse, what is between Earth and the Sun?', choices: ['Mars', 'Venus', 'A comet', 'The Moon'], answer: 3, explain: 'In a solar eclipse, the Moon passes between Earth and the Sun. Solar eclipses only happen at New Moon, when the Moon is between us and the Sun.' },
    { q: 'Approximately how many stars are visible from a perfect dark-sky site with the naked eye?', choices: ['About 100', 'About 1,000', 'About 9,000', 'About 1 million'], answer: 2, explain: 'Roughly 9,000 stars are bright enough to see with the naked eye from a perfect dark site, split between both hemispheres. From any one location at any one time you might see 3,000-4,000.' },
    { q: 'The Andromeda Galaxy is the most distant object visible to the naked eye. How far away is it?', choices: ['250,000 light-years', '2.5 million light-years', '25 million light-years', '250 million light-years'], answer: 1, explain: 'The Andromeda Galaxy (M31) is about 2.5 million light-years away. When you look at it, you see light that left when our ancestors were just starting to use stone tools.' },
    { q: 'What is the safest way to view a SOLAR eclipse (NOT totality)?', choices: ['Sunglasses', 'Looking briefly with squinted eyes', 'Certified solar-eclipse glasses (ISO 12312-2) or a pinhole projector', 'Welding goggles of any kind'], answer: 2, explain: 'Only ISO 12312-2 certified solar-eclipse glasses or properly built pinhole projectors are safe. Sunglasses (even very dark) and most welding goggles (less than Shade 14) are NOT safe. Looking briefly will burn your retina, possibly permanently.' },
    { q: 'In Wabanaki tradition, the bowl of the Big Dipper represents what?', choices: ['A canoe', 'A bear being chased by hunters', 'A spirit path', 'Seven sisters'], answer: 1, explain: 'In many Algonquin traditions including Wabanaki, the bowl is a bear and the handle stars are hunters tracking it across the sky through the seasons. When the bear is brought down in autumn, its blood turns the leaves red.' },
    { q: 'What is the difference between a meteor, a meteoroid, and a meteorite?', choices: ['Nothing — they\'re the same thing', 'Meteoroid in space; meteor in the atmosphere as a streak of light; meteorite on the ground', 'Meteor in space; meteoroid on the ground; meteorite in the atmosphere', 'Meteoroid in space; meteorite in the atmosphere; meteor on the ground'], answer: 1, explain: 'Meteoroid: rocky/icy body in space. Meteor: the streak of light when it burns up in the atmosphere. Meteorite: the surviving piece on the ground.' },
    { q: 'Most of the elements in your body (calcium in bones, iron in blood) were made where?', choices: ['On Earth, by geological processes', 'In the Sun', 'In supernovae (exploding stars) billions of years ago', 'In the Big Bang directly'], answer: 2, explain: 'The Big Bang made hydrogen, helium, and a trace of lithium. Everything heavier was forged inside stars and scattered into space when stars exploded. We are, literally, made of star stuff (Carl Sagan was being precise, not poetic).' },
    { q: 'Which planet has the largest volcano in the solar system?', choices: ['Earth', 'Venus', 'Mars', 'Jupiter (its moon Io)'], answer: 2, explain: 'Olympus Mons on Mars is 22 km tall (3× Everest) and 600 km wide. Mars\'s lack of plate tectonics allowed a single hot spot to build up an enormous shield volcano over billions of years.' },
    { q: 'Roughly how many exoplanets have been confirmed as of 2024?', choices: ['About 50', 'About 500', 'About 5,800', 'About 1 million'], answer: 2, explain: 'As of late 2024, ~5,800 confirmed exoplanets. The first one around a Sun-like star (51 Pegasi b) was confirmed in 1995. The Kepler space telescope (2009-2018) alone added ~2,700.' },
    { q: 'On the Hertzsprung-Russell diagram, where is our Sun located?', choices: ['Among the red giants', 'On the main sequence in the middle', 'Among the supergiants', 'Among the white dwarfs'], answer: 1, explain: 'The Sun is a G-type main-sequence star. It sits in the middle of the main sequence — neither very hot nor very cool. It will spend ~10 billion years on the main sequence before becoming a red giant, then a white dwarf.' },
    { q: 'Which is the closest star system to our Sun?', choices: ['Sirius', 'Vega', 'Alpha Centauri (triple system, includes Proxima)', 'Betelgeuse'], answer: 2, explain: 'Alpha Centauri is 4.37 light-years away — a triple system of Alpha Centauri A, B, and Proxima Centauri. Proxima Centauri b, an Earth-mass planet in the habitable zone, was discovered in 2016.' }
  ];

  // Plugin registration
  window.StemLab.registerTool('astronomy', {
    icon: '🔭',
    label: 'Night Sky & Astronomy',
    desc: 'Earth & Space Science: constellations (with Wabanaki + cross-cultural sky traditions), moon phases, planets, seasons, stars, galaxies, eclipses, observing practice, light-pollution awareness. NGSS MS-ESS1 + HS-ESS1. Place-based for Maine + extendable. Printable observing checklists.',
    color: 'indigo',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var callGemini = ctx.callGemini;

      // State init
      if (!labToolData || !labToolData.astronomy) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { astronomy: {
            tab: 'tonight',
            selectedConstellation: null,
            moonPhaseIdx: 0,
            seasonMonth: 6, // June
            selectedPlanet: 'earth',
            selectedStarType: 'G',
            selectedTradition: 'wabanaki',
            bortleClass: 5,
            quizIdx: 0,
            quizAnswers: [],
            quizSubmitted: false,
            quizCorrect: 0,
            askInput: '',
            askResponse: '',
            askLoading: false,
            observingList: [],
            currentDate: null
          }});
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } }, '🔭 Initializing Night Sky Lab...');
      }
      var d = labToolData.astronomy;

      function upd(patch) {
        setLabToolData(function(prev) {
          var s = Object.assign({}, (prev && prev.astronomy) || {}, patch);
          return Object.assign({}, prev, { astronomy: s });
        });
      }

      var INDIGO = '#6366f1', INDIGO_LIGHT = '#eef2ff', INDIGO_DARK = '#3730a3';
      var BG = '#0f172a';

      // ──────────────────────────────────────────────────────────────
      // Tab Bar
      // ──────────────────────────────────────────────────────────────
      var TABS = [
        { id: 'tonight',      icon: '🌙', label: 'Tonight' },
        { id: 'constellations', icon: '⭐', label: 'Constellations' },
        { id: 'moon',         icon: '🌖', label: 'Moon' },
        { id: 'planets',      icon: '🪐', label: 'Planets' },
        { id: 'exoplanets',   icon: '🌎', label: 'Exoplanets' },
        { id: 'seasons',      icon: '🌍', label: 'Seasons' },
        { id: 'stars',        icon: '✨', label: 'Stars' },
        { id: 'galaxies',     icon: '🌌', label: 'Galaxies' },
        { id: 'eclipses',     icon: '🌑', label: 'Events' },
        { id: 'indigenous',   icon: '🪶', label: 'Sky Traditions' },
        { id: 'history',      icon: '📜', label: 'History' },
        { id: 'observe',      icon: '🔭', label: 'Observing' },
        { id: 'quiz',         icon: '📝', label: 'Quiz' },
        { id: 'print',        icon: '🖨', label: 'Print' }
      ];

      var tabBar = h('div', {
        role: 'tablist', 'aria-label': 'Astronomy sections',
        style: { display: 'flex', gap: 4, padding: '10px 12px', borderBottom: '1px solid #1e293b', overflowX: 'auto', flexShrink: 0, background: '#0a0e1a' }
      },
        TABS.map(function(t) {
          var active = d.tab === t.id;
          return h('button', {
            key: t.id, role: 'tab', 'aria-selected': active,
            'aria-label': t.label,
            onClick: function() { upd({ tab: t.id }); },
            style: {
              padding: '6px 12px', borderRadius: 8, border: 'none',
              background: active ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: active ? '#c7d2fe' : '#94a3b8',
              fontWeight: active ? 700 : 500, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap'
            }
          }, t.icon + ' ' + t.label);
        })
      );

      // ──────────────────────────────────────────────────────────────
      // Helpers
      // ──────────────────────────────────────────────────────────────
      function safetyBanner(msg) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.12)', borderTop: '1px solid rgba(239,68,68,0.35)', borderRight: '1px solid rgba(239,68,68,0.35)', borderBottom: '1px solid rgba(239,68,68,0.35)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12, color: '#fecaca', lineHeight: 1.6 } },
          h('strong', null, '⚠️ '),
          msg
        );
      }
      function softNote(msg) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.3)', borderRight: '1px solid rgba(99,102,241,0.3)', borderBottom: '1px solid rgba(99,102,241,0.3)', borderLeft: '3px solid #6366f1', marginBottom: 10, fontSize: 12, color: '#c7d2fe', lineHeight: 1.6, fontStyle: 'italic' } },
          msg
        );
      }
      function sectionCard(title, children, accent) {
        accent = accent || INDIGO;
        return h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + accent, marginBottom: 12 } },
          title ? h('div', { style: { fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 } }, title) : null,
          children
        );
      }

      // ──────────────────────────────────────────────────────────────
      // TONIGHT — what to look for
      // ──────────────────────────────────────────────────────────────
      function renderTonight() {
        var now = new Date();
        var month = now.getMonth() + 1; // 1-12
        var seasonal = month >= 12 || month <= 2 ? 'winter' : (month <= 5 ? 'spring' : (month <= 8 ? 'summer' : 'fall'));
        var northSeasonal = {
          winter: ['Orion (south)', 'Taurus + Pleiades (overhead)', 'Sirius (brightest star, south)', 'Gemini'],
          spring: ['Leo (south)', 'Ursa Major (overhead)', 'Boötes with Arcturus (east)', 'Virgo with Spica'],
          summer: ['Scorpius (low south)', 'Sagittarius / Milky Way center (south)', 'Cygnus + Summer Triangle (overhead)', 'Lyra with Vega'],
          fall:   ['Pegasus + Andromeda (east)', 'Cassiopeia (overhead)', 'Last of Summer Triangle (west)', 'Perseus']
        };
        // Estimate moon phase from date (simplified)
        var newMoonRef = new Date('2024-01-11T00:00:00Z').getTime(); // known new moon
        var cycle = 29.53058867;
        var daysSince = (now.getTime() - newMoonRef) / 86400000;
        var phaseAge = ((daysSince % cycle) + cycle) % cycle;
        var phaseIdx = Math.round(phaseAge / cycle * 8) % 8;
        var moonPhase = MOON_PHASES[phaseIdx];

        return h('div', { style: { padding: 16 } },
          sectionCard('🌙 Right now (' + now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) + ')',
            h('div', null,
              h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 8 } },
                'Approximate moon phase: ',
                h('strong', { style: { color: '#fde68a' } }, moonPhase.name),
                ' (~', Math.round(phaseAge), ' days into the lunar cycle).'
              ),
              h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6 } }, moonPhase.visibility)
            )
          ),

          sectionCard('⭐ Constellations to look for in the Northern Hemisphere this season (' + seasonal + ')',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
              northSeasonal[seasonal].map(function(s, i) { return h('li', { key: i }, s); })
            )
          ),

          sectionCard('🪐 Naked-eye planets (planning approximation)',
            h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 } },
              'Mercury, Venus, Mars, Jupiter, and Saturn can all be visible to the naked eye depending on the date. ',
              'Venus is the brightest — often the "morning star" before dawn or "evening star" after sunset. ',
              'Jupiter and Saturn are visible most of each year, near the ecliptic (the path the Sun takes through the sky). ',
              'Mars varies a lot — it can be very bright and red, or hard to find, depending on where it is in its orbit. ',
              'For precise positions tonight, check Stellarium (free), the NASA Eyes web app, or a sky app like Night Sky or SkyView.'
            )
          ),

          sectionCard('🤖 Ask the sky',
            h('div', null,
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8, lineHeight: 1.55 } }, 'Ask anything: "What is that bright thing in the south right now?" "How do I find the Pleiades?" "Why does the moon look different colors?"'),
              h('textarea', {
                value: d.askInput || '',
                onChange: function(e) { upd({ askInput: e.target.value }); },
                placeholder: 'Your question...',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical' }
              }),
              h('div', { style: { marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' } },
                h('button', {
                  onClick: function() {
                    if (!callGemini || !(d.askInput || '').trim()) return;
                    upd({ askLoading: true, askResponse: '' });
                    var prompt = 'You are a friendly, expert astronomy guide answering a middle-school or high-school student. ' +
                      'Answer their question in 3-6 sentences. Be accurate and curious. Include one specific observable detail they could go look for tonight if relevant. ' +
                      'If the question involves safety (looking at the Sun, eclipse viewing), include the safety note. ' +
                      'Use plain language, no jargon without quick definition. Identity-first language where relevant. No em dashes (use commas or colons).\n\n' +
                      'STUDENT QUESTION: ' + d.askInput.trim();
                    callGemini(prompt, false).then(function(r) {
                      upd({ askResponse: r ? r.trim() : '(no response)', askLoading: false });
                    }).catch(function() {
                      upd({ askResponse: 'Sorry — the AI is unavailable right now. Try again, or check a free resource like NASA\'s sky watching page.', askLoading: false });
                    });
                  },
                  disabled: d.askLoading || !(d.askInput || '').trim() || !callGemini,
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: callGemini && (d.askInput || '').trim() && !d.askLoading ? INDIGO : '#475569', color: '#fff', fontWeight: 700, fontSize: 13, cursor: callGemini && (d.askInput || '').trim() && !d.askLoading ? 'pointer' : 'not-allowed' }
                }, d.askLoading ? 'Thinking…' : '🔭 Ask'),
                !callGemini ? h('div', { style: { fontSize: 11, color: '#94a3b8' } }, '(AI unavailable in this session)') : null
              ),
              d.askResponse ? h('div', { style: { marginTop: 10, padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', fontSize: 13, color: '#e2e8f0', lineHeight: 1.65, whiteSpace: 'pre-wrap' } }, d.askResponse) : null
            )
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // CONSTELLATIONS
      // ──────────────────────────────────────────────────────────────
      function renderConstellations() {
        var selected = d.selectedConstellation ? CONSTELLATIONS.find(function(c) { return c.id === d.selectedConstellation; }) : null;
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Constellations are patterns ancient people connected with stories. Modern astronomy uses 88 official constellations as a sky-mapping convention, but every culture has named the same stars differently. Below: ten major constellations, each with the Greek story AND a teaching from another tradition.'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
            CONSTELLATIONS.map(function(c) {
              var active = d.selectedConstellation === c.id;
              return h('button', {
                key: c.id,
                onClick: function() { upd({ selectedConstellation: c.id }); },
                'aria-label': c.name + ', ' + c.common,
                style: {
                  padding: 10, borderRadius: 8, textAlign: 'left',
                  background: active ? 'rgba(99,102,241,0.25)' : '#1e293b',
                  border: '1px solid ' + (active ? INDIGO : '#334155'), cursor: 'pointer', color: '#e2e8f0'
                }
              },
                h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 2 } }, c.name),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, c.common),
                h('div', { style: { fontSize: 10, color: '#64748b', marginTop: 4 } }, c.season)
              );
            })
          ),
          selected ? h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('h3', { style: { margin: '0 0 4px', color: '#c7d2fe', fontSize: 18 } }, selected.name),
            h('div', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, selected.common + ' · ' + selected.season),

            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', borderLeft: '3px solid ' + INDIGO, marginBottom: 10 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Greek tradition'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.65 } }, selected.story)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Other traditions'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.65 } }, selected.indigenous)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', borderLeft: '3px solid #22c55e', marginBottom: 10 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'How to find it'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.65 } }, selected.howToFind)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Science note'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.65 } }, selected.sciFacts)
            ),

            h('div', { style: { marginTop: 12 } },
              h('button', {
                onClick: function() {
                  var list = (d.observingList || []).slice();
                  if (list.indexOf(selected.id) < 0) {
                    list.push(selected.id);
                    upd({ observingList: list });
                    if (addToast) addToast('Added ' + selected.name + ' to your observing list', 'success');
                  } else {
                    if (addToast) addToast('Already on your observing list', 'info');
                  }
                },
                style: { padding: '6px 14px', borderRadius: 6, border: '1px solid ' + INDIGO, background: 'rgba(99,102,241,0.15)', color: '#c7d2fe', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, '+ Add to observing list')
            )
          ) : h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px dashed #334155', color: '#94a3b8', fontStyle: 'italic', fontSize: 13 } }, 'Select a constellation to see its story across traditions, how to find it, and the science behind it.')
        );
      }

      // ──────────────────────────────────────────────────────────────
      // MOON PHASES
      // ──────────────────────────────────────────────────────────────
      function renderMoon() {
        var phase = MOON_PHASES[d.moonPhaseIdx];
        // SVG of moon phase
        function moonSvg() {
          var R = 70;
          var ill = phase.pct / 100;
          // Compute terminator x-coordinate
          var isWaxing = ['waxing_cresc', 'first_quarter', 'waxing_gibb'].indexOf(phase.id) >= 0;
          var isFull = phase.id === 'full';
          var isNew = phase.id === 'new';
          // For visualization
          return h('svg', { viewBox: '-100 -100 200 200', width: 180, height: 180, role: 'img', 'aria-labelledby': 'moonSvgTitle moonSvgDesc' },
            h('title', { id: 'moonSvgTitle' }, phase.name + ' phase'),
            h('desc', { id: 'moonSvgDesc' }, 'Moon disc showing ' + phase.pct + '% illumination, with the lit portion ' + (isWaxing ? 'on the right (waxing)' : 'on the left (waning)') + '.'),
            // Dark moon backdrop
            h('circle', { cx: 0, cy: 0, r: R, fill: '#1e293b', stroke: '#475569', strokeWidth: 1 }),
            // Lit half via overlay
            isNew ? null : isFull ? h('circle', { cx: 0, cy: 0, r: R, fill: '#fef3c7' }) :
              // Compute path for phase using two ellipses
              (function() {
                // We draw a clipping shape: full circle minus a vertical ellipse on one side
                // For waxing crescent (<50%): subtract on the right (lit on right)
                // For waning gibbous: similar logic
                var leftLit = !isWaxing;
                var pct = phase.pct;
                // Use an ellipse with rx scaled by (1 - 2*pct/100)
                // pct=0 (new): rx = R (covers everything)
                // pct=50: rx = 0 (half moon)
                // pct=100: rx = -R (no overlay, full moon)
                var rx = Math.abs((1 - 2 * pct / 100) * R);
                // Determine direction
                var fillEllipse = pct < 50 ? '#1e293b' : '#fef3c7';
                var bgFill = pct < 50 ? '#fef3c7' : '#1e293b';
                // Draw lit half first
                var sideX = leftLit ? -R / 2 : R / 2;
                var halfPath = leftLit
                  ? 'M 0,' + (-R) + ' A ' + R + ',' + R + ' 0 0,0 0,' + R + ' Z'
                  : 'M 0,' + (-R) + ' A ' + R + ',' + R + ' 0 0,1 0,' + R + ' Z';
                var halfFill = '#fef3c7';
                // Combine half + ellipse for gibbous/crescent shaping
                return h('g', null,
                  h('path', { d: halfPath, fill: halfFill }),
                  h('ellipse', { cx: 0, cy: 0, rx: rx, ry: R, fill: fillEllipse })
                );
              })(),
            // Outline
            h('circle', { cx: 0, cy: 0, r: R, fill: 'none', stroke: '#94a3b8', strokeWidth: 1.5 })
          );
        }
        return h('div', { style: { padding: 16 } },
          softNote('The moon doesn\'t generate light. It reflects sunlight. Phases happen because the moon orbits Earth, and we see different fractions of the lit half over the ~29.5-day lunar cycle.'),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 20, alignItems: 'start', marginBottom: 16 } },
            h('div', { style: { textAlign: 'center' } },
              moonSvg(),
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a', marginTop: 8 } }, phase.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8' } }, phase.pct + '% illuminated · day ' + phase.age + ' of ~29.5')
            ),
            h('div', null,
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, phase.desc),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6 } },
                h('strong', { style: { color: '#a5b4fc' } }, 'Visibility: '),
                phase.visibility
              )
            )
          ),

          h('div', { style: { marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', fontWeight: 700, marginBottom: 6 } }, 'Slide through the lunar cycle:'),
            h('input', {
              type: 'range', min: 0, max: 7, value: d.moonPhaseIdx,
              onChange: function(e) { upd({ moonPhaseIdx: parseInt(e.target.value, 10) }); },
              'aria-label': 'Moon phase position',
              style: { width: '100%', accentColor: INDIGO }
            }),
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#64748b', marginTop: 4 } },
              h('span', null, 'New'),
              h('span', null, 'First Quarter'),
              h('span', null, 'Full'),
              h('span', null, 'Last Quarter')
            )
          ),

          sectionCard('Why the same face always points to us',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'The Moon rotates on its own axis exactly once per orbit around Earth. This "tidal locking" means the same hemisphere always faces us. We never see the "far side" from Earth without a spacecraft. ',
              h('em', { style: { color: '#a5b4fc' } }, 'Note: it is the far side, NOT the dark side. The far side gets just as much sunlight as the near side — both have day and night as the Moon orbits.')
            )
          ),

          sectionCard('Earth and Moon to scale',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'The Moon is about 1/4 the diameter of Earth and 1/80 its mass. At average distance (384,400 km), about 30 Earths would fit between Earth and Moon. The Moon is slowly drifting away — about 3.8 cm per year — and one day will look smaller in our sky than the Sun does, ending total solar eclipses.'
            )
          ),

          sectionCard('🌖 Features to find on the Moon',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'A pair of 7×50 binoculars (or any small telescope) reveals enormous detail on the Moon. Best viewing is along the ',
                h('strong', { style: { color: '#fde68a' } }, 'terminator'),
                ' — the boundary between day and night — where shadows make craters dramatic. The terminator is in the middle during first or last quarter. Full moon is too bright + flat (sun overhead = no shadows).'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                [
                  { name: 'Mare Tranquillitatis', kind: 'Sea (mare)', desc: 'The dark Sea of Tranquility, easily visible to the naked eye. Apollo 11 landed here in July 1969 at 0.67°N latitude. "One small step" happened on its southwestern shore.', color: '#94a3b8' },
                  { name: 'Mare Imbrium', kind: 'Sea (mare)', desc: 'The Sea of Rains, the largest dark feature on the near side. A basin from a giant impact 3.85 billion years ago, later flooded with basalt lava. About 1,250 km across.', color: '#94a3b8' },
                  { name: 'Mare Serenitatis', kind: 'Sea (mare)', desc: 'The Sea of Serenity, neighboring Tranquillitatis. Apollo 17 (1972, last crewed lunar mission) landed at its eastern edge.', color: '#94a3b8' },
                  { name: 'Oceanus Procellarum', kind: 'Sea (mare)', desc: 'The Ocean of Storms, the largest mare on the Moon. Covers nearly 1/6 of the visible face. Apollo 12 landed here.', color: '#94a3b8' },
                  { name: 'Tycho crater', kind: 'Bright crater', desc: 'Young (~108 million years old). Famous for its bright ray system — splash patterns extending 1,500+ km across the surface. Easy to find at full moon in the southern highlands.', color: '#fde68a' },
                  { name: 'Copernicus crater', kind: 'Bright crater', desc: 'About 800 million years old. Central peaks formed by rebound after the impact. Easy binocular target. Often called the "monarch of the Moon" by 19th-century observers.', color: '#fde68a' },
                  { name: 'Aristarchus', kind: 'Brightest spot', desc: 'The brightest feature on the Moon. So bright it can be seen with the naked eye even when shadowed (lit by earthshine). Site of recurring "lunar transient phenomena" — unexplained brief glows.', color: '#fde68a' },
                  { name: 'Plato crater', kind: 'Dark-floored crater', desc: 'On the northern shore of Mare Imbrium. Unusually dark, smooth floor — flooded with later lava. About 100 km across. A favorite of small-telescope observers.', color: '#a78bfa' },
                  { name: 'Lunar highlands', kind: 'Ancient terrain', desc: 'The bright, heavily-cratered regions. About 4.4 billion years old — the original lunar crust, predating the maria. Made of anorthosite, an aluminum-rich rock. The "face" you see is partly highlands (white).', color: '#cbd5e1' }
                ].map(function(f, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + f.color } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 } },
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0' } }, f.name),
                      h('div', { style: { fontSize: 10, color: f.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, f.kind)
                    ),
                    h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55 } }, f.desc)
                  );
                })
              )
            ),
            '#fde68a'
          ),

          sectionCard('🌊 Tides + Earth-Moon dynamics',
            (function() {
              var TOPICS = [
                { id: 'why2', name: 'Why TWO tides per day', color: '#0ea5e9',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'Tides aren\'t caused by the Moon "pulling water up." They\'re caused by DIFFERENTIAL gravity — the Moon pulls slightly harder on the near side of Earth than on the center, and slightly harder on the center than on the far side.'
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#7dd3fc' } }, 'Near side: '),
                      'water pulled toward Moon faster than the Earth → bulges out.'
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#7dd3fc' } }, 'Far side: '),
                      'water left behind as Earth itself gets pulled toward Moon faster → bulges out the other way.'
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'Earth rotates THROUGH both bulges in 24 hours, so every point on the equator passes through two tidal highs (and two lows) per day. Tide cycle is actually 24h 50min because the Moon is also moving in its orbit — so the gap between high tides is ~12h 25min.'
                    )
                  )
                },
                { id: 'spring', name: 'Spring vs neap tides', color: '#fbbf24',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'The Sun also creates tides, about half as strong as the Moon\'s. When Sun + Moon align (new moon OR full moon), their effects add → ',
                      h('strong', { style: { color: '#fbbf24' } }, 'SPRING TIDES'),
                      ' (no relation to the season; from "to spring forth"). The highest highs + lowest lows of the month.'
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'When Sun + Moon are at 90° (first or last quarter), their effects partly cancel → ',
                      h('strong', { style: { color: '#fbbf24' } }, 'NEAP TIDES'),
                      '. The most muted tidal range of the month.'
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'Combined with Moon\'s elliptical orbit (closer = stronger), spring tides at perigee (perigean spring tides, or "king tides") are the largest of all. Maine\'s Bay of Fundy has tides over 16 m due to its resonant geometry.'
                    )
                  )
                },
                { id: 'locked', name: 'Tidal locking', color: '#a855f7',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'Earth\'s gravity creates tidal bulges in the Moon too (mostly rock, not water). Friction inside the Moon during early history dissipated rotational energy until the Moon\'s rotation period matched its orbital period — about 27.3 days. Now the same face always points to us.'
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#d8b4fe' } }, 'Common misconception: '),
                      'tidal locking does NOT mean the Moon doesn\'t rotate. It rotates exactly once per orbit. We never see the "far side" but the far side gets just as much sunlight as the near side.'
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'Tidal locking is common — most large moons in the solar system are tidally locked to their planets. Earth-mass planets in red-dwarf habitable zones are likely tidally locked to their stars (one face always lit, one always dark) — creating major climate + biology challenges for habitability.'
                    )
                  )
                },
                { id: 'recede', name: 'The Moon is leaving', color: '#22c55e',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      'Earth\'s tidal bulges DO not perfectly align with the Moon — Earth\'s rotation drags them ahead. The bulge\'s gravity pulls slightly forward on the Moon, accelerating it. Faster orbit = larger orbit. The Moon recedes by ',
                      h('strong', { style: { color: '#86efac' } }, '~3.8 cm per year'),
                      ' — measured precisely by laser ranging off retroreflectors the Apollo astronauts placed on the lunar surface.'
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#86efac' } }, 'Conservation of angular momentum: '),
                      'whatever Earth + Moon lose to friction has to go somewhere. Earth\'s rotation is slowing — days are ~1.8 milliseconds longer per century. Hundreds of millions of years ago, days were 22 hours; coral fossils with daily growth bands preserve this record.'
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#86efac' } }, 'Future consequence: '),
                      'the Moon will eventually appear too small in our sky to cover the Sun. Total solar eclipses will end in ~600 million years. The Moon will recede until Earth\'s rotation matches the lunar orbital period (a "double tidal lock"), but that won\'t happen before the Sun becomes a red giant.'
                    )
                  )
                },
                { id: 'roche', name: 'Tides on other worlds', color: '#ef4444',
                  content: h('div', null,
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#fca5a5' } }, 'Jupiter\'s moons: '),
                      'Io is so tidally flexed by Jupiter that the constant friction makes it the most volcanically active body in the solar system. Hundreds of active volcanoes; surface entirely paved by lava over geological time. Europa\'s subsurface ocean is kept liquid by similar (but smaller) tidal heating.'
                    ),
                    h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#fca5a5' } }, 'Roche limit: '),
                      'a moon orbiting too close to its planet gets torn apart by tidal forces — the planet\'s gravity pulls harder on the near side than on the far side faster than the moon\'s own gravity can hold it together. Saturn\'s rings may be the remains of a moon that ventured inside the Roche limit, or a small body that never managed to coalesce.'
                    ),
                    h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                      h('strong', { style: { color: '#fca5a5' } }, 'Black hole spaghettification: '),
                      'falling into a small black hole, you would be stretched vertically + compressed horizontally by tidal forces well before reaching the event horizon. For supermassive black holes, the tidal forces at the event horizon are gentle enough that you would cross without immediate notice.'
                    )
                  )
                }
              ];
              var sel = TOPICS.find(function(t) { return t.id === d.selectedTideTopic; }) || TOPICS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'The Moon makes the tides — but the physics is subtler than "Moon pulls water." Tidal forces from the Moon shape Earth\'s rotation, its day length, the Moon\'s own orbit, and on a grander scale they sculpt every binary system in the universe.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  TOPICS.map(function(t) {
                    var active = (d.selectedTideTopic || TOPICS[0].id) === t.id;
                    return h('button', { key: t.id,
                      onClick: function() { upd({ selectedTideTopic: t.id }); },
                      style: { padding: '8px 14px', borderRadius: 8, background: active ? t.color + '33' : '#1e293b', border: '1px solid ' + (active ? t.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } }, sel.content)
              );
            })(),
            '#0ea5e9'
          ),

          sectionCard('Apollo landing sites (all six successful)',
            h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } },
              h('strong', null, 'Apollo 11 '), '(July 1969) — Mare Tranquillitatis. Armstrong + Aldrin, the first humans on another world.', h('br'),
              h('strong', null, 'Apollo 12 '), '(Nov 1969) — Oceanus Procellarum. Conrad + Bean. Landed within walking distance of the unmanned Surveyor 3 probe; brought pieces back.', h('br'),
              h('strong', null, 'Apollo 14 '), '(Feb 1971) — Fra Mauro highlands. Shepard + Mitchell. (Apollo 13 famously did not land.)', h('br'),
              h('strong', null, 'Apollo 15 '), '(Jul-Aug 1971) — Hadley Rille. Scott + Irwin. First crewed mission with a lunar rover.', h('br'),
              h('strong', null, 'Apollo 16 '), '(Apr 1972) — Descartes highlands. Young + Duke. Highland geology.', h('br'),
              h('strong', null, 'Apollo 17 '), '(Dec 1972) — Taurus-Littrow valley. Cernan + Schmitt (only geologist to walk on the Moon). The last people to leave the Moon. The Artemis program plans to return crews starting in the late 2020s.'
            )
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // PLANETS
      // ──────────────────────────────────────────────────────────────
      function renderPlanets() {
        var selected = PLANETS.find(function(p) { return p.id === d.selectedPlanet; });
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Our solar system. Mercury, Venus, Mars, Jupiter, and Saturn can all be seen with the naked eye. Uranus is at the edge of naked-eye visibility; Neptune requires a telescope.'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 } },
            PLANETS.map(function(p) {
              var active = d.selectedPlanet === p.id;
              return h('button', {
                key: p.id,
                onClick: function() { upd({ selectedPlanet: p.id }); },
                'aria-label': p.name,
                style: {
                  padding: 10, borderRadius: 8, textAlign: 'left',
                  background: active ? 'rgba(99,102,241,0.20)' : '#1e293b',
                  border: '1px solid ' + (active ? INDIGO : '#334155'),
                  cursor: 'pointer', color: '#e2e8f0'
                }
              },
                h('div', { style: { fontSize: 24, marginBottom: 2 } }, p.icon),
                h('div', { style: { fontSize: 13, fontWeight: 800 } }, p.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, p.visible === 'naked-eye' ? 'Naked eye' : p.visible === 'binoculars' ? 'Binoculars' : p.visible === 'telescope' ? 'Telescope' : 'You\'re on it')
              );
            })
          ),
          selected ? h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 } },
              h('div', { style: { width: 90, height: 90, borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, ' + selected.color + ', #000)', border: '2px solid #475569' } }),
              h('div', null,
                h('h3', { style: { margin: '0 0 4px', color: '#c7d2fe', fontSize: 22 } }, selected.icon + ' ' + selected.name)
              )
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 } },
              dataPair('Distance from Sun', selected.auFromSun + ' AU'),
              dataPair('Diameter (Earth=1)', selected.diameterEarth),
              dataPair('Day length', selected.dayHours + ' hours'),
              dataPair('Year length', selected.yearDays + ' Earth days'),
              dataPair('Known moons', selected.moons),
              dataPair('Visibility', selected.visible)
            ),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, selected.fact)
          ) : null,

          sectionCard('🌀 How the solar system formed — 4.6 billion years ago',
            (function() {
              var STAGES = [
                { id: 'cloud', name: 'Pre-solar cloud', age: '~4.6 Gya', color: '#7c3aed',
                  what: 'A patch of an interstellar molecular cloud, hundreds of light-years across, contains the raw material: mostly hydrogen + helium, plus heavier elements forged in previous generations of stars + supernovae. A nearby supernova shockwave triggers part of the cloud to collapse.',
                  evidence: 'Short-lived radioactive isotopes (Al-26, Fe-60) found in primitive meteorites must have been delivered from a supernova within ~1 million years of solar-system formation. The Sun was born in a stellar cluster — its siblings have since drifted apart.'
                },
                { id: 'disk', name: 'Protoplanetary disk', age: '~4.6 Gya', color: '#7dd3fc',
                  what: 'The collapsing cloud spins faster (conservation of angular momentum). It flattens into a disk: a young Sun in the middle + a flat rotating disk of gas + dust extending outward. The disk is hot near the Sun + cold farther out.',
                  evidence: 'JWST + ALMA routinely image protoplanetary disks around young stars elsewhere (HL Tau, TW Hydrae). Each is a present-day snapshot of what our solar system looked like 4.5 Gya. Gaps in those disks suggest planets are forming inside them right now.'
                },
                { id: 'planetesimals', name: 'Planetesimals', age: '4.59-4.55 Gya', color: '#fbbf24',
                  what: 'Dust grains stick together by electrostatic forces, then by gravity, growing into pebbles → boulders → kilometer-sized bodies called planetesimals. The inner (hot) disk forms rocky planetesimals; the outer (cold) disk forms icy ones.',
                  evidence: 'Primitive meteorites (chondrites) are unmelted leftovers of this stage — they have not been part of a planet. Asteroids in the asteroid belt are surviving planetesimals that never managed to coalesce into a planet (Jupiter\'s gravity prevented it).'
                },
                { id: 'planets', name: 'Planet accretion', age: '4.55-4.5 Gya', color: '#10b981',
                  what: 'Planetesimals collide + merge to form bigger bodies (protoplanets). The inner solar system builds rocky planets (Mercury, Venus, Earth, Mars). The outer disk also has plenty of solid ice, allowing larger cores to form. The biggest outer cores accrete gas from the disk → gas giants (Jupiter, Saturn) + ice giants (Uranus, Neptune).',
                  evidence: 'The age of Earth is constrained by uranium-lead dating of the oldest minerals (zircon crystals from Western Australia, 4.4 Gya). Detailed isotope chemistry of meteorites tells us the timing.'
                },
                { id: 'late', name: 'Late Heavy Bombardment', age: '~4.1-3.8 Gya', color: '#dc2626',
                  what: 'A period of intense asteroid + comet impacts. The Moon\'s heavily cratered surface dates from this time. Earth was also heavily bombarded — but plate tectonics + weathering have erased the craters. Caused (possibly) by planetary migration that destabilized the asteroid belt + Kuiper belt.',
                  evidence: 'Lunar crater dating + Apollo samples show a peak in impact ages around 3.9 Gya. The Nice model (a leading theoretical framework) attributes the bombardment to Jupiter + Saturn crossing a 2:1 resonance, gravitationally destabilizing many small bodies.'
                },
                { id: 'now', name: 'Modern solar system', age: '4.5 Gya — now', color: '#94a3b8',
                  what: 'After the bombardment subsided, the solar system settled into its current configuration. Earth\'s atmosphere transformed (no oxygen → oxygenated by photosynthesis ~2.4 Gya). Plate tectonics, life, climate cycles. The orbits remain mostly stable.',
                  evidence: 'Long-term orbital simulations show our solar system is on the edge of chaotic — small perturbations can dramatically change Mercury\'s orbit on billion-year timescales. There\'s ~1% chance of Mercury becoming unstable + crossing Earth\'s orbit before the Sun becomes a red giant.'
                }
              ];
              var sel = STAGES.find(function(s) { return s.id === d.selectedSSStage; }) || STAGES[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'The same physics that forms stars also forms their planets. Our entire solar system — Sun, planets, moons, asteroids, comets — coalesced from a single rotating disk of gas + dust about 4.6 billion years ago. Every atom heavier than helium in your body was forged in stars that exploded before our Sun was born.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  STAGES.map(function(s) {
                    var active = (d.selectedSSStage || 'cloud') === s.id;
                    return h('button', { key: s.id,
                      onClick: function() { upd({ selectedSSStage: s.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? s.color + '33' : '#1e293b', border: '1px solid ' + (active ? s.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, s.name);
                  })
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 } },
                    h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color } }, sel.name),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, sel.age)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What happened'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How we know'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.evidence)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Why rocky inside, gassy outside? '),
                  'The "frost line" of the protoplanetary disk, around 2-4 AU from the Sun, was the dividing line. Inside it, the Sun\'s heat kept water + methane + ammonia as gases that streamed away. Only metals + silicates condensed → small rocky planets. Outside the frost line, water + ammonia froze + added to the solid material → larger cores that grew big enough to capture gas → giant planets. Same physics still operates in protoplanetary disks today.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'Planetary migration: '),
                  'Planets don\'t necessarily stay where they formed. The Nice model + Grand Tack hypothesis propose that Jupiter migrated INWARD to ~1.5 AU, then was pulled back outward by Saturn — and this migration cleared the asteroid belt, delivered water to Earth, and triggered the Late Heavy Bombardment. Exoplanet "hot Jupiters" (gas giants orbiting closer than Mercury) are the strongest direct evidence that planetary migration is real + common.'
                )
              );
            })(),
            '#a855f7'
          )
        );
        function dataPair(label, value) {
          return h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
            h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, label),
            h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 2 } }, String(value))
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // EXOPLANETS
      // ──────────────────────────────────────────────────────────────
      function renderExoplanets() {
        var selected = (d.selectedExoplanet && EXOPLANETS.find(function(p) { return p.id === d.selectedExoplanet; })) || EXOPLANETS[0];
        var habitableColor = function(label) {
          if (/in habitable zone/i.test(label) || /possible/i.test(label)) return '#22c55e';
          if (/no/i.test(label)) return '#ef4444';
          return '#94a3b8';
        };
        return h('div', { style: { padding: 16 } },
          sectionCard('🌎 The exoplanet revolution',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              'In 1995, we knew of zero confirmed planets outside our solar system. As of 2024-2025, we have confirmed roughly ',
              h('strong', { style: { color: '#86efac' } }, EXO_OVERVIEW.knownCount),
              '. Some are larger than Jupiter; some are smaller than Earth. Some orbit so close to their stars that the surface is hotter than lava; some orbit in the habitable zone where liquid water could exist. Most stars in our galaxy have at least one planet, and Earth-sized planets in habitable zones are common.'
            ),
            '#22c55e'
          ),

          // Detection methods first (the "how do we know?")
          sectionCard('🔬 How we find them',
            h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 10, lineHeight: 1.6 } },
              'Exoplanets are extraordinarily hard to image directly — even the nearest stars are too dim. Five indirect methods do most of the work:'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
              EXO_OVERVIEW.methods.map(function(m, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid #38bdf8' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 4 } }, m.name),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55, marginBottom: 6 } }, m.how),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.5 } }, h('strong', null, 'Where: '), m.first)
                );
              })
            )
          ),

          // Notable planets
          sectionCard('🪐 Six notable exoplanets',
            h('div', null,
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8, marginBottom: 14 } },
                EXOPLANETS.map(function(p) {
                  var active = (d.selectedExoplanet || EXOPLANETS[0].id) === p.id;
                  return h('button', { key: p.id,
                    onClick: function() { upd({ selectedExoplanet: p.id }); },
                    'aria-label': p.name,
                    style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(99,102,241,0.20)' : '#1e293b', border: '1px solid ' + (active ? INDIGO : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
                  },
                    h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, p.name),
                    h('div', { style: { fontSize: 10, color: habitableColor(p.habitable), fontWeight: 700 } }, p.habitable),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, p.distance)
                  );
                })
              ),
              h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                h('h3', { style: { margin: '0 0 4px', color: '#c7d2fe', fontSize: 18 } }, selected.name),
                h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } }, 'Discovered ' + selected.discovered + ' · Orbiting ' + selected.host),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 10 } },
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Distance from us'),
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.distance)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Mass'),
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.mass)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Year length'),
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.orbital)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Habitability'),
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: habitableColor(selected.habitable) } }, selected.habitable)
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Why it matters'),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.story)
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'How we know about it'),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.detection)
                )
              )
            ),
            INDIGO
          ),

          // Interactive transit light-curve simulator
          sectionCard('📉 Transit light-curve simulator',
            (function() {
              var planetR = d.transitPlanetR != null ? d.transitPlanetR : 1.0;  // Earth radii
              var starR = d.transitStarR != null ? d.transitStarR : 1.0;        // Sun radii
              var orbitR = d.transitOrbit != null ? d.transitOrbit : 0.05;       // AU
              var impactB = d.transitImpact != null ? d.transitImpact : 0.0;     // 0 = central transit, 1.0 = grazing
              var time = d.transitTime != null ? d.transitTime : 0.5;            // 0..1 position across transit window

              // Compute physics
              // Transit depth = (Rp / Rs)^2 — the fraction of star area blocked
              var earthR_km = 6371;
              var sunR_km = 696340;
              var planetR_relSun = (planetR * earthR_km) / (sunR_km * starR);
              var transitDepth = planetR_relSun * planetR_relSun;
              var depthPct = transitDepth * 100;
              // Transit duration (simplified, central transit, circular orbit):
              //   d = (Rs + Rp) * P / (pi * a)
              // We'll skip explicit period and just give a visual position.
              // Detectability:
              //   Kepler precision: ~20 ppm (for bright stars). So 0.002% = 20 ppm = detectable
              //   Ground-based: ~1000 ppm = 0.1% (Earth-sized planet around Sun-sized star: ~84 ppm — NOT ground-detectable)
              var detKepler = depthPct >= 0.002;   // 20 ppm
              var detGround = depthPct >= 0.1;     // 1000 ppm
              var detEye = depthPct >= 1;          // 1% — naked-eye-like
              var grazing = impactB >= 1 - planetR_relSun;
              var noTransit = impactB > 1 + planetR_relSun;

              // Visualize the transit at given time
              function transitSvg() {
                var svgW = 600, svgH = 160;
                // Star at center, planet moves left to right
                var cx = svgW / 2, cy = 60;
                var Rstar_px = 50; // star radius in px (visual)
                var Rplanet_px = Math.max(2, Rstar_px * planetR_relSun);
                // Planet position
                var sweep = (Rstar_px + Rplanet_px) * 2;
                var planetX = cx - sweep / 2 + time * sweep;
                var planetY = cy + Rstar_px * impactB;

                // Compute what fraction of star is blocked at current time (simple overlap calc)
                var dx = planetX - cx, dy = planetY - cy;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var blockedFrac;
                if (dist >= Rstar_px + Rplanet_px) blockedFrac = 0;
                else if (dist + Rplanet_px <= Rstar_px) blockedFrac = (Rplanet_px * Rplanet_px) / (Rstar_px * Rstar_px); // fully inside
                else {
                  // Partial overlap area calc (lens area)
                  var d2 = dist * dist;
                  var a = (Rstar_px * Rstar_px - Rplanet_px * Rplanet_px + d2) / (2 * dist);
                  var hh = Math.sqrt(Math.max(0, Rstar_px * Rstar_px - a * a));
                  // overlap area = star_area_segment + planet_area_segment, approximated for visualization
                  blockedFrac = (Rplanet_px * Rplanet_px) / (Rstar_px * Rstar_px) * 0.5;
                }
                var currentBrightness = 1 - blockedFrac;

                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'transitTitle transitDesc' },
                  h('title', { id: 'transitTitle' }, 'Exoplanet transit simulation'),
                  h('desc', { id: 'transitDesc' }, 'A planet ' + planetR + ' Earth radii passing in front of a star ' + starR + ' Sun radii. Transit depth is ' + depthPct.toFixed(3) + ' percent. Currently blocking ' + (blockedFrac * 100).toFixed(2) + ' percent of star light.'),
                  // Black background
                  h('rect', { x: 0, y: 0, width: svgW, height: 120, fill: '#000' }),
                  // Star with limb darkening (radial gradient)
                  h('defs', null,
                    h('radialGradient', { id: 'starG' },
                      h('stop', { offset: '0%', stopColor: '#fff8dc' }),
                      h('stop', { offset: '50%', stopColor: '#fde68a' }),
                      h('stop', { offset: '100%', stopColor: '#f59e0b' })
                    )
                  ),
                  h('circle', { cx: cx, cy: cy, r: Rstar_px, fill: 'url(#starG)' }),
                  // Planet silhouette
                  h('circle', { cx: planetX, cy: planetY, r: Rplanet_px, fill: '#0a0e1a', stroke: '#1e293b', strokeWidth: 1 }),
                  // Brightness meter below
                  h('rect', { x: 50, y: 130, width: 500, height: 16, fill: '#0a0e1a', stroke: '#334155', strokeWidth: 1 }),
                  h('rect', { x: 50, y: 130, width: 500 * currentBrightness, height: 16, fill: '#fde68a' }),
                  h('text', { x: 50, y: 154, fill: '#94a3b8', fontSize: 10 }, 'Observed brightness: ' + (currentBrightness * 100).toFixed(3) + '%'),
                  h('text', { x: 550, y: 154, textAnchor: 'end', fill: '#94a3b8', fontSize: 10 }, 'Depth at mid-transit: ' + depthPct.toFixed(3) + '%')
                );
              }

              // Build light curve SVG (brightness vs time across multiple transits)
              function lightCurveSvg() {
                var svgW = 600, svgH = 120;
                var padX = 30, padY = 16;
                var plotW = svgW - 2 * padX, plotH = svgH - 2 * padY;
                // Plot brightness 100% - depth at center, smoothly transitioning
                var pts = [];
                var nSamples = 100;
                for (var i = 0; i <= nSamples; i++) {
                  var t = i / nSamples; // 0..1 across whole window with 2 transits
                  // Two transits — at t=0.25 and t=0.75
                  var bright = 1;
                  [0.25, 0.75].forEach(function(center) {
                    var dt = Math.abs(t - center);
                    var w = 0.06; // half-width of transit
                    if (dt < w) {
                      // Smooth dip with rounded floor
                      var inner = Math.max(0, 1 - (dt / w) * (dt / w) * 1.5);
                      bright = Math.min(bright, 1 - transitDepth * inner);
                    }
                  });
                  var x = padX + t * plotW;
                  var y = padY + (1 - bright) * plotH * 50; // amplify dip visually
                  pts.push(x + ',' + Math.min(padY + plotH, y));
                }
                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-label': 'Light curve showing brightness dips during transits' },
                  h('rect', { x: padX, y: padY, width: plotW, height: plotH, fill: '#0a0e1a', stroke: '#334155', strokeWidth: 1 }),
                  // Baseline (full brightness)
                  h('line', { x1: padX, y1: padY + 4, x2: padX + plotW, y2: padY + 4, stroke: '#475569', strokeWidth: 0.5, strokeDasharray: '3 2' }),
                  h('text', { x: padX - 4, y: padY + 8, fill: '#94a3b8', fontSize: 9, textAnchor: 'end' }, '100%'),
                  // Light curve
                  h('polyline', { points: pts.join(' '), fill: 'none', stroke: '#fbbf24', strokeWidth: 1.8 }),
                  // Axis
                  h('text', { x: padX + plotW / 2, y: padY + plotH + 14, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, 'Time →'),
                  // Two transit labels
                  h('text', { x: padX + plotW * 0.25, y: padY + plotH + 14, textAnchor: 'middle', fill: '#fbbf24', fontSize: 9 }, 'transit 1'),
                  h('text', { x: padX + plotW * 0.75, y: padY + plotH + 14, textAnchor: 'middle', fill: '#fbbf24', fontSize: 9 }, 'transit 2')
                );
              }

              return h('div', null,
                h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                  'The transit method (Kepler, TESS, ~75% of all confirmed exoplanets) works by watching a star\'s brightness over time. When a planet passes between us and its star, the star dims by a tiny amount equal to ',
                  h('strong', { style: { color: '#fbbf24' } }, '(R_planet / R_star)²'),
                  '. Each transit produces a characteristic flat-bottomed dip. The depth tells us the planet\'s SIZE; the period (time between transits) tells us its ORBIT.'
                ),

                h('div', { style: { padding: 10, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', marginBottom: 10 } },
                  transitSvg()
                ),

                h('div', { style: { padding: 10, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', marginBottom: 12 } },
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Brightness over time (two consecutive transits):'),
                  lightCurveSvg()
                ),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 10, marginBottom: 12 } },
                  [
                    { label: 'Planet size (Earth radii)', value: planetR, min: 0.3, max: 12, step: 0.1, key: 'transitPlanetR' },
                    { label: 'Star size (Sun radii)', value: starR, min: 0.3, max: 3.0, step: 0.1, key: 'transitStarR' },
                    { label: 'Transit position', value: time, min: 0, max: 1, step: 0.02, key: 'transitTime' },
                    { label: 'Impact parameter (0=center, 1=grazing)', value: impactB, min: 0, max: 1.2, step: 0.05, key: 'transitImpact' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: '#fbbf24', fontWeight: 800 } }, typeof s.value === 'number' ? s.value.toFixed(2) : s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: '#fbbf24' }
                      })
                    );
                  })
                ),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 12 } },
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Transit depth'),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginTop: 2 } }, depthPct.toFixed(4) + ' %'),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, '(' + (depthPct * 10000).toFixed(0) + ' ppm)')
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Naked eye'),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: detEye ? '#86efac' : '#fca5a5', marginTop: 2 } }, detEye ? '✓ visible' : '✗ undetectable'),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'requires ≥1% dip')
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Ground telescope'),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: detGround ? '#86efac' : '#fca5a5', marginTop: 2 } }, detGround ? '✓ detectable' : '✗ too small'),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'requires ≥0.1% / 1000 ppm')
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Kepler space telescope'),
                    h('div', { style: { fontSize: 14, fontWeight: 800, color: detKepler ? '#86efac' : '#fca5a5', marginTop: 2 } }, detKepler ? '✓ detectable' : '✗ below precision'),
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, 'requires ≥20 ppm')
                  )
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Try these: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.65 } },
                    h('li', null, 'A Jupiter-sized planet (~11 Earth radii) around a Sun-sized star: depth ~1%. Big enough to (barely) see by naked eye.'),
                    h('li', null, 'An Earth-sized planet around a Sun-sized star: depth ~0.0084% (84 ppm). Kepler detected, ground-based cannot.'),
                    h('li', null, 'An Earth-sized planet around a red dwarf (R ≈ 0.15 Sun radii): depth ~0.37%. Easily detectable. This is why most habitable-zone Earth-sized exoplanets we know orbit red dwarfs.')
                  )
                )
              );
            })(),
            '#22c55e'
          ),

          sectionCard('🧬 Astrobiology — the search for life elsewhere',
            (function() {
              var TARGETS = [
                {
                  id: 'mars', name: 'Mars', what: 'Best-explored extraterrestrial target.', confidence: 'past life: possible / present: unlikely',
                  why: 'Liquid water flowed on the surface in the distant past (3+ billion years ago). Sustained habitability for hundreds of millions of years. Modern Mars is cold (-60°C average) + nearly airless + bathed in UV. If life exists today, it would be underground microbes.',
                  missions: 'Perseverance + Ingenuity (active 2021-now): sample collection at Jezero Crater. Future "Mars Sample Return" mission would bring samples back to Earth for biosignature analysis. Curiosity has been roaming since 2012.',
                  color: '#dc2626'
                },
                {
                  id: 'europa', name: 'Europa (Jupiter moon)', what: 'Best candidate for present-day life in our solar system.', confidence: 'present-day microbial life: plausible',
                  why: 'A global ocean of liquid water under an ice shell, kept liquid by tidal heating from Jupiter. Likely has hydrothermal vents on its rocky seafloor — the same kind of environment where life may have originated on early Earth.',
                  missions: 'Europa Clipper (launched October 2024, arrives 2030). NOT designed to detect life directly but will characterize the ocean, ice thickness, and surface chemistry — laying groundwork for a future lander.',
                  color: '#0ea5e9'
                },
                {
                  id: 'enceladus', name: 'Enceladus (Saturn moon)', what: 'Small icy moon with a habitable ocean.', confidence: 'present-day microbial life: plausible',
                  why: 'Cassini flew through icy plumes erupting from the south pole. Found water, salts, organic molecules, and silica particles consistent with hydrothermal activity on the seafloor. Sample-able from orbit by flying through the plume — no landing needed.',
                  missions: 'No confirmed mission yet but Enceladus Orbilander is a top decadal-survey priority for the 2030s. Direct-sample biosignature search is uniquely feasible here.',
                  color: '#7dd3fc'
                },
                {
                  id: 'titan', name: 'Titan (Saturn moon)', what: 'A world with weather + rivers + seas — of liquid methane.', confidence: 'life as we know it: unlikely / life as we don\'t: possible',
                  why: 'Titan has lakes + rivers of liquid methane + ethane, a thick nitrogen atmosphere, complex organic chemistry. Way too cold (-180°C) for water-based life. But astrobiologists ask: could a different solvent chemistry support some form of life here?',
                  missions: 'Dragonfly (NASA, launching 2028, arriving 2034). A nuclear-powered helicopter that will fly to multiple sites on Titan studying prebiotic chemistry. First rotorcraft on another world.',
                  color: '#fbbf24'
                },
                {
                  id: 'exo', name: 'Exoplanet atmospheres', what: 'Look for "biosignatures" in light from exoplanet atmospheres.', confidence: 'currently inconclusive; technique is rapidly improving',
                  why: 'Some gases on Earth (oxygen + methane together, dimethyl sulfide) persist only because life keeps making them. If we detect such combinations in an exoplanet atmosphere, the prior for life there goes up substantially.',
                  missions: 'JWST is doing this NOW. K2-18 b 2023 hints at DMS (contested). HWO (Habitable Worlds Observatory, NASA flagship targeting 2040s) is being designed specifically to image + spectroscopically analyze Earth-like exoplanets.',
                  color: '#22c55e'
                }
              ];
              var sel = TARGETS.find(function(t) { return t.id === d.selectedAstroTarget; }) || TARGETS[0];

              // Drake equation interactive
              var fp = d.drakeFp != null ? d.drakeFp : 1.0;
              var ne = d.drakeNe != null ? d.drakeNe : 0.4;
              var fl = d.drakeFl != null ? d.drakeFl : 0.5;
              var fi = d.drakeFi != null ? d.drakeFi : 0.01;
              var fc = d.drakeFc != null ? d.drakeFc : 0.1;
              var dlife = d.drakeL != null ? d.drakeL : 10000;
              // Star formation rate ≈ 1.5/year, fraction of stars with planets ≈ 1.0
              var Rstar = 1.5;
              var fpStar = 1.0;
              var N = Rstar * fpStar * fp * ne * fl * fi * fc * dlife;

              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Are we alone? It is among the oldest human questions and one we now have tools to investigate. Astrobiology is the scientific search for life beyond Earth — past, present, microbial, or technological.'
                ),

                // Target picker
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  TARGETS.map(function(t) {
                    var active = (d.selectedAstroTarget || TARGETS[0].id) === t.id;
                    return h('button', { key: t.id,
                      onClick: function() { upd({ selectedAstroTarget: t.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? t.color + '33' : '#1e293b', border: '1px solid ' + (active ? t.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, t.name);
                  })
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color, marginBottom: 14 } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.name),
                  h('div', { style: { fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 } }, sel.what + ' · Confidence: ' + sel.confidence),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Why we look here'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, sel.why)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Missions'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.missions)
                  )
                ),

                // Drake equation
                h('div', { style: { padding: 14, borderRadius: 12, background: '#1e1b4b', border: '1px solid #6366f1', marginBottom: 12 } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#c7d2fe', marginBottom: 8 } }, '🔢 The Drake Equation'),
                  h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } },
                    'Frank Drake (1961) proposed an equation to estimate the number of communicating civilizations in our galaxy. The equation is a thinking tool, not a measurement — we have huge uncertainty on several factors. Try different values:'
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: '#0a0e1a', textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 13, color: '#c7d2fe', marginBottom: 10 } },
                    'N = R★ × f_p × n_e × f_l × f_i × f_c × L'
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 10 } },
                    [
                      { label: 'f_p: fraction with planets', value: fp, min: 0, max: 1, step: 0.05, key: 'drakeFp', sub: 'Confirmed: ~1.0' },
                      { label: 'n_e: habitable planets/system', value: ne, min: 0, max: 5, step: 0.1, key: 'drakeNe', sub: 'Kepler: ~0.2-0.6' },
                      { label: 'f_l: fraction that develop life', value: fl, min: 0, max: 1, step: 0.05, key: 'drakeFl', sub: 'Unknown! 1 example (us)' },
                      { label: 'f_i: fraction that go intelligent', value: fi, min: 0, max: 1, step: 0.01, key: 'drakeFi', sub: 'Unknown' },
                      { label: 'f_c: fraction that communicate', value: fc, min: 0, max: 1, step: 0.05, key: 'drakeFc', sub: 'Unknown' },
                      { label: 'L: civ. lifetime (years)', value: dlife, min: 100, max: 1000000, step: 100, key: 'drakeL', sub: 'Unknown — pessimist: 100, optimist: 10⁶+' }
                    ].map(function(s, i) {
                      return h('div', { key: i, style: { padding: 6, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                        h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 2 } },
                          h('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700 } }, s.label),
                          h('span', { style: { fontSize: 11, color: '#c7d2fe', fontWeight: 800 } }, typeof s.value === 'number' && s.step < 0.5 ? s.value.toFixed(2) : s.value.toLocaleString())
                        ),
                        h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                          onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                          'aria-label': s.label,
                          style: { width: '100%', accentColor: '#6366f1' }
                        }),
                        h('div', { style: { fontSize: 9, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub)
                      );
                    })
                  ),
                  h('div', { style: { padding: 10, borderRadius: 6, background: 'rgba(99,102,241,0.20)', border: '1px solid #6366f1', textAlign: 'center' } },
                    h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Estimated communicating civilizations in our galaxy right now:'),
                    h('div', { style: { fontSize: 28, fontWeight: 900, color: '#c7d2fe', margin: '4px 0' } }, N < 1 ? N.toExponential(1) : N >= 1e6 ? N.toExponential(1) : N.toFixed(0)),
                    h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'For reference: the Milky Way has ~400 billion stars')
                  )
                ),

                // The Fermi Paradox
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65, marginBottom: 8 } },
                  h('strong', null, 'The Fermi Paradox: '),
                  '"Where is everybody?" Even modest Drake estimates suggest thousands or millions of civilizations should exist. We have heard nothing. Possible answers (none confirmed): we are first/early; intelligent life is much rarer than we hope; civilizations destroy themselves quickly; advanced civilizations are not communicating in the ways we look; the Great Filter is ahead of us, not behind. SETI (Search for Extraterrestrial Intelligence) has been listening for radio signals since 1960. No confirmed detections.'
                ),

                // Biosignatures
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, 'What counts as a biosignature: '),
                  'gases that persist in an atmosphere only because life keeps making them. Earth\'s atmosphere has 21% O₂ + traces of CH₄ + N₂O. Without life, those would react away in geological time. JWST + future direct-imaging telescopes are looking for such atmospheric "disequilibrium" on exoplanets. The K2-18 b 2023 hint of dimethyl sulfide (DMS, made on Earth almost only by marine plankton) is currently contested but illustrates the technique. Any single biosignature detection will be cross-checked exhaustively before claiming life.'
                )
              );
            })(),
            '#22c55e'
          ),

          sectionCard('🪐 The habitable zone — and its honest limits',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } }, 'The habitable zone is the orbit range where a rocky planet could have liquid water on its surface — given an Earth-like atmosphere. Sometimes called the "Goldilocks zone": not too hot, not too cold.'),
              h('p', { style: { margin: '0 0 8px' } }, 'But the habitable zone is a starting point, not an answer. A planet in the habitable zone might:'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', lineHeight: 1.7 } },
                h('li', null, 'Have no atmosphere (like Mercury, mostly).'),
                h('li', null, 'Have a runaway greenhouse atmosphere (like Venus).'),
                h('li', null, 'Be tidally locked to a red dwarf, with one side always hot and the other always frozen.'),
                h('li', null, 'Get blasted by stellar flares (red dwarf hosts are flaring stars).'),
                h('li', null, 'Have life, and we have no good way to know yet.')
              ),
              h('p', { style: { margin: '8px 0 0' } }, 'JWST and future missions (Habitable Worlds Observatory, ARIEL) are now probing exoplanet atmospheres for biosignatures: gas combinations like oxygen + methane that, on Earth, only persist because life keeps producing them.')
            ),
            '#22c55e'
          ),

          // ─── JWST exoplanet atmosphere spectroscopy ─────────────
          sectionCard('🔬 JWST exoplanet atmosphere spectroscopy',
            (function() {
              var JWST_TOPICS = [
                { id: 'how', name: 'How transmission spectroscopy works', emoji: '🌫️',
                  body: 'When a planet transits its star, a small fraction of starlight passes through the planet\'s ATMOSPHERE on its way to us. Different gases absorb at different wavelengths (water at ~1.4 + ~1.9 microns, methane at ~3.3, CO2 at ~4.3, ozone at ~9.6). By comparing the depth of the transit at different wavelengths, we can detect which gases are present. The signal is tiny — for a hot Jupiter, the transit depth varies by about 0.01-0.1% across wavelengths. For a small rocky planet like TRAPPIST-1e, the signal is closer to 0.001% — at or below the noise floor of even JWST. JWST\'s 6.5-meter mirror + cold infrared detectors are the first instrument capable of doing this routinely.',
                  caveat: 'Transmission spectroscopy only probes the TERMINATOR (day-night boundary) of the planet, not the whole atmosphere. You see the upper layers, not the surface. Clouds + haze can flatten the spectrum entirely (the "muted feature" problem) and reduce sensitivity dramatically. Many JWST exoplanet observations to date have shown features less sharp than predicted — clouds matter more than early models assumed.'
                },
                { id: 'wasp39b', name: 'WASP-39b — the first big JWST exoplanet', emoji: '☀️',
                  body: 'WASP-39b is a hot Saturn-mass gas giant about 700 light-years away. In July-August 2022, JWST took its first transmission spectrum, detecting water vapor (H2O), carbon dioxide (CO2 — the first unambiguous CO2 detection in an exoplanet atmosphere), carbon monoxide (CO), and sulfur dioxide (SO2). The SO2 detection was the surprise: it requires photochemistry — UV light from the star breaking up other molecules to produce SO2 — which had been predicted but not previously observed. This is exoplanet "photochemistry" caught in the act. The chemistry tells us about the planet\'s composition, formation location, and metallicity.',
                  caveat: 'WASP-39b is a hot puffy planet ideal for transmission spectroscopy (large atmosphere, high temperature, big signal). Detection of CO2 + SO2 there does NOT mean we can detect those gases on smaller cooler planets. It does mean the TECHNIQUES work — and as JWST keeps observing, smaller + cooler targets become possible with longer integration times.'
                },
                { id: 'trappist', name: 'TRAPPIST-1 planets', emoji: '🌍',
                  body: 'TRAPPIST-1 is an ultra-cool red-dwarf star 40 light-years away with seven Earth-sized planets, three (TRAPPIST-1e, f, g) in the habitable zone. JWST has now observed TRAPPIST-1b (the innermost, NOT habitable — much too close to the star). Result: thermal-emission measurements show TRAPPIST-1b is too hot for thick atmosphere on its dayside, suggesting most or all of its atmosphere was stripped by stellar activity. TRAPPIST-1c results (2023) suggested similar atmospheric loss. The implication is concerning for the outer planets: red-dwarf stars are flare-prone in their youth, and stripping atmospheres from close-in rocky planets is apparently common.',
                  caveat: 'Not all TRAPPIST-1 planets have been observed yet, and the habitable-zone planets (e, f, g) are further out + experience less stellar bombardment than b + c. Whether they retained atmospheres is still genuinely unknown. JWST observations of TRAPPIST-1e are scheduled + ongoing. The narrative "red dwarf planets are doomed" is premature; we are still gathering data.'
                },
                { id: 'k218b', name: 'K2-18b — the DMS controversy', emoji: '🌊',
                  body: 'K2-18b is a sub-Neptune-sized planet 124 light-years away, in the habitable zone of a red-dwarf star. In September 2023, a Cambridge team (Madhusudhan et al.) reported JWST detection of methane (CH4) + carbon dioxide (CO2) + a tentative signal of dimethyl sulfide (DMS) — on Earth, DMS is produced almost exclusively by marine plankton. They proposed K2-18b might be a "Hycean world" (hydrogen-rich atmosphere over a global ocean) with possibly LIFE. The story made global headlines. The follow-up has been more cautious: independent re-analyses suggest the DMS signal is at most ~1-2σ, well below the 5σ threshold for "discovery." The methane + CO2 detections are robust; DMS is not.',
                  caveat: 'This case is a textbook example of how exoplanet biosignature science needs to be communicated carefully. The Cambridge paper itself called the DMS detection "tentative" + said much more data was needed. Headlines lost the "tentative" word. A year later (May 2024), the same team published much more JWST data on K2-18b that REDUCED their DMS confidence further. Honest status: K2-18b has interesting chemistry but no confirmed biosignature. The DMS hunt continues.'
                },
                { id: 'wasp107b', name: 'WASP-107b — atmospheric escape + sulfur clouds', emoji: '💨',
                  body: 'WASP-107b is a low-density "puffy" exoplanet — Neptune-mass in a Jupiter-size envelope. JWST 2023 observations revealed (a) water vapor + sulfur dioxide + carbon dioxide, (b) HIGH-altitude silicate clouds, (c) ATMOSPHERIC ESCAPE — molecules being stripped off the planet by stellar wind. The escape is so vigorous that ~ 0.01-1 Earth masses of atmosphere have been lost over the planet\'s lifetime. This is one of the cleanest detections of "evaporating" exoplanets, important for understanding the demographic gap of planet sizes between Earth-size + Neptune-size (the "radius valley"): one hypothesis is that small Neptunes evaporate their atmospheres + shrink to super-Earths over time.',
                  caveat: 'Atmospheric escape is a major shaping force in exoplanet evolution. JWST + Hubble are now mapping it. The escape rate depends on stellar UV + X-ray flux (which varies hugely between star types) + on planet mass + composition (water atmospheres escape more easily than nitrogen). Generalizing from one planet is dangerous; building a population sample is what matters.'
                },
                { id: 'biosig', name: 'The biosignature problem', emoji: '🧪',
                  body: 'What gas combinations on an exoplanet would PROVE life? Oxygen alone is not enough (it can be produced abiotically by UV photolysis of water vapor). Methane alone is not enough (it can be produced by serpentinization + volcanism). Together, O2 + CH4 is a strong biosignature because they react with each other; on Earth, they only coexist because biology keeps replenishing both. But: false positives exist. Hot rocky planets can produce abiotic O2 from runaway water photolysis. And false negatives exist: early Earth (3 billion years ago) had life but very little O2. The "biosignature pyramid" requires multiple independent lines of evidence — atmospheric composition, climate stability, surface conditions, lack of plausible abiotic explanation.',
                  caveat: 'JWST cannot prove life. It CAN find planets so chemically unusual that we send larger missions (Habitable Worlds Observatory in the 2040s) to look harder. The honest scientific framing: ANY biosignature claim will face an enormous burden of proof, and any single claim from any single mission should be treated as the start of a debate, not the end.'
                },
                { id: 'limits', name: 'What JWST cannot do', emoji: '🚧',
                  body: 'JWST is transformative for HOT + WARM exoplanets around small stars. It is much less capable for the holy grail: cool Earth-like planets around Sun-like stars. The reason is geometry. A Sun-like star is ~100× brighter than a red dwarf, so the planet-star contrast for an Earth-analog is much worse. Also, an Earth-analog transit lasts only a few hours, once per year, with a tiny depth. Building up enough signal-to-noise on a single planet would take decades of integration time. JWST will probably never observe an Earth-twin atmosphere well. That has to wait for direct-imaging missions with coronagraphs (Habitable Worlds Observatory, LIFE, others — concepts in development).',
                  caveat: 'JWST will operate at least until the early-to-mid 2030s (fuel-limited). Its exoplanet program is huge + only a few percent of expected observations have been published. The story is still in chapter one. Expect surprises — JWST has already overturned predictions about cloud properties + chemistry in multiple systems.'
                }
              ];
              var sel = d.selectedJWST || 'how';
              var topic = JWST_TOPICS.find(function(t) { return t.id === sel; }) || JWST_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'The James Webb Space Telescope (JWST, launched Dec 25, 2021) was designed largely to study early-universe galaxies — but its biggest impact so far may turn out to be exoplanet atmospheres. By using transmission spectroscopy + thermal emission, JWST is, for the first time, building a real chemical inventory of worlds around other stars.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  JWST_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedJWST: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#22c55e' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #22c55e' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#86efac', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'Honest framing: '), topic.caveat
                  )
                )
              );
            })(),
            '#22c55e'
          ),

          // ─── Fermi Paradox + SETI ───────────────────────────────
          sectionCard('🛸 The Fermi paradox + SETI — where is everybody?',
            (function() {
              var FP_TOPICS = [
                { id: 'fermi', name: 'The Fermi paradox itself', emoji: '❓',
                  body: 'In 1950, during a lunch conversation at Los Alamos, physicist Enrico Fermi reportedly asked "But where is everybody?" The argument: the galaxy is ~10 billion years old. Even at a small fraction of the speed of light, a civilization could colonize the entire Milky Way in ~10 million years — a tiny fraction of cosmic time. If there are many intelligent civilizations, the galaxy should be VISIBLY occupied, with engineered megastructures, signals, or visits. Instead we see silence. This contradiction between "there should be many civilizations" + "we see none" is the Fermi paradox.',
                  caveat: 'The paradox depends on assumptions that may all be wrong: that civilizations arise reasonably often, that they expand (rather than turning inward), that they last long enough to leave evidence, that we would recognize evidence if we saw it, that the Drake equation\'s factors are all non-zero. The "paradox" is a useful framing rather than a settled finding — it constrains possibilities but does not prove any specific answer.'
                },
                { id: 'drake', name: 'The Drake equation', emoji: '📐',
                  body: 'Frank Drake (1961) wrote down an equation to estimate the number of communicating civilizations in our galaxy: N = R* × f_p × n_e × f_l × f_i × f_c × L. Rate of star formation × fraction with planets × planets per system in habitable zone × fraction that develop life × fraction with intelligence × fraction that develop communicating technology × lifetime of communicating phase. Modern values for the first three factors are reasonably well-known (R* ~ 1-3 stars/yr, f_p ~ 0.5+, n_e ~ 0.1-0.4 from exoplanet surveys). The last four are essentially unknown — they could each be anywhere from 0.001 to ~1. Plug in optimistic values: thousands of civilizations. Pessimistic values: we are alone in the galaxy.',
                  caveat: 'The Drake equation does not GIVE an answer; it organizes uncertainty. Its real value is making clear which factors are dominant + which we have observational handles on. Drake originally proposed it as a discussion structure for a SETI workshop, not as a predictive formula.'
                },
                { id: 'filter', name: 'The Great Filter', emoji: '🚧',
                  body: 'Robin Hanson (1996) proposed the Great Filter: somewhere between "non-life chemistry" and "intergalactic civilization," there is at least one extremely improbable step. We do not know where the Filter is. If it is BEHIND us (the origin of life, or the eukaryote transition, or the emergence of intelligence), then we are an extreme outlier + most worlds remain barren — bad for the galaxy, good news for us. If it is AHEAD of us (technological civilizations consistently destroy themselves, or hit an energy/resource ceiling, or get hit by something), then we should expect to fail too — bad news for us. Finding life on Mars or Europa, if it happens, would shift the Great Filter EARLIER and therefore most likely AHEAD of us. As Nick Bostrom put it, "No news is good news. News of life is bad news."',
                  caveat: 'The Great Filter is a probabilistic argument, not a deterministic one. Many specific Filters have been proposed: gamma-ray bursts, asteroid impacts, runaway greenhouse, nuclear war, engineered pandemics, AI catastrophe, self-replicating nanotechnology, social collapse, energy depletion, ecosystem failure. We do not know which (if any) operate; some may be cumulative. The Filter is a label for the gap between expected and observed civilizations, not a specific cause.'
                },
                { id: 'seti', name: 'SETI — the actual searches', emoji: '📡',
                  body: 'Active scientific Search for Extraterrestrial Intelligence dates to Frank Drake\'s Project Ozma (1960, 200 hours of observation on two stars). The Allen Telescope Array (ATA, California, 42 dishes since 2007) is the most dedicated continuing facility. Breakthrough Listen (2015-present, $100M from Yuri Milner, using Green Bank + Parkes + others) is the largest current effort: ~$10M/year scanning ~1 million nearby stars + ~100 galaxies. Most SETI looks for narrow-band radio signals (artificial frequency stability) that natural sources cannot produce. Optical SETI searches for laser pulses. So far: ~70+ years of effort + ZERO confirmed detections.',
                  caveat: 'SETI nulls are interpretable in many ways. We may be looking at the wrong frequencies, the wrong sky, the wrong way, or the wrong epoch. We have searched ~10⁻¹⁰ of possible signal phase space according to some estimates. "No signals after 70 years" mostly tells us "no civilization is BLASTING signals at us at megawatt level on the frequencies we monitor." That is a much weaker statement than "no one is out there."'
                },
                { id: 'wow', name: 'Notable signals', emoji: '📻',
                  body: 'The WOW! signal (1977, Big Ear Radio Observatory, Ohio) was a 72-second strong narrow-band radio burst at 1420 MHz (the hydrogen line frequency, often suggested as a natural SETI channel) that has never been explained or repeated. It remains the strongest candidate signal in SETI history. More recent: BLC1 (2019, detected by Breakthrough Listen toward Proxima Centauri, 982 MHz) generated headlines + was eventually traced to terrestrial RFI. Tabby\'s Star / KIC 8462852 (Boyajian 2015) showed unprecedented irregular dimming that briefly invited speculation about Dyson swarms; explanations now favor dust + comet families. Each case has driven new analysis methods + community RFI-mitigation work.',
                  caveat: 'Every notable SETI signal so far has either turned out to be terrestrial interference or remained ambiguous. The community has developed extensive verification protocols (cross-check at independent observatories, look for repetition, check signal properties against equipment expectations). This is good science — exactly what should happen — and an honest source of disappointment for anyone hoping for a definitive yes.'
                },
                { id: 'meti', name: 'Should we broadcast back? (METI)', emoji: '📤',
                  body: 'Active METI (Messaging Extraterrestrial Intelligence) deliberately broadcasts signals INTO space rather than just listening. The Arecibo Message (1974, 3-minute pictogram aimed at globular cluster M13) was the first major active METI attempt. Several METI projects have run since (Cosmic Call 1999 + 2003, A Message From Earth 2008, Lone Signal 2013, others). The METI debate is genuinely contentious. Proponents (some at METI International) argue: silence guarantees we never communicate, and a civilization advanced enough to receive us is advanced enough to find us already. Opponents (Stephen Hawking, the Asilomar SETI Protocol signatories) warn: advertising our presence + location to an unknown audience may be catastrophically unwise; we have no way to assess risk.',
                  caveat: 'METI raises real ethical questions about who has the right to speak for humanity. The 1974 Arecibo Message was sent without anything resembling democratic consultation. Modern international guidelines (the IAA Declaration of Principles Concerning Activities Following the Detection of Extraterrestrial Intelligence) call for global consultation before any active reply, but compliance is voluntary. The debate is not whether the technology works (it does) but whether using it is wise.'
                },
                { id: 'solutions', name: 'Proposed Fermi resolutions', emoji: '💡',
                  body: 'Many serious + semi-serious proposals: (1) The Rare Earth hypothesis (Ward + Brownlee, 2000) — Earth-like life-supporting worlds are extremely rare due to many simultaneous requirements. (2) The Zoo hypothesis (Ball 1973) — they know about us + are watching, but not interacting (a galactic Prime Directive). (3) The Dark Forest hypothesis (Liu Cixin 2008) — civilizations stay quiet for fear of predators. (4) The Transcension hypothesis — advanced civilizations turn inward + disappear into virtual reality or black holes. (5) Self-destruction — most civilizations end shortly after developing the means to do so. (6) Slow expansion — colonization is slow + we may simply be too early. (7) Detection limit — we have not searched enough sky long enough. (8) Aestivation hypothesis (Sandberg) — they sleep through the hot era waiting for a cooler universe.',
                  caveat: 'No proposal is widely accepted. The honest answer is "we don\'t know." Each hypothesis emphasizes different fears + hopes; the Dark Forest reflects competitive thinking, the Zoo reflects cooperative thinking, Rare Earth reflects astrobiological humility, Transcension reflects technological speculation. All are about us as much as about them.'
                },
                { id: 'meaning', name: 'Why this matters', emoji: '🌍',
                  body: 'The Fermi paradox is not a puzzle about aliens. It is a puzzle about US. Whatever the answer turns out to be, it tells us something profound: either intelligence is so rare we are precious, or intelligence so dangerous we are about to disappear, or the universe is so vast we may always be alone, or signals exist we cannot yet detect. Any answer reshapes how we think about cosmic ethics, our own survival, the value of preserving biodiversity, the importance of not being our own Great Filter. For students, the paradox is a doorway: serious astronomical thinking that opens into philosophy, ethics, biology, sociology, and self-knowledge.',
                  caveat: 'Reasonable people of good faith reach very different conclusions about the Fermi paradox. Religious, secular, technological, ecological frameworks all engage with it. The most important thing is to think about it seriously rather than dismiss it. A culture that takes the question seriously is more likely to survive long enough to find or write the answer.'
                }
              ];
              var sel = d.selectedFermi || 'fermi';
              var topic = FP_TOPICS.find(function(t) { return t.id === sel; }) || FP_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'If the galaxy contains hundreds of billions of stars, and many have planets, and some have life — where is everyone? This question, asked at a 1950 lunch table by Enrico Fermi, has become one of the most generative puzzles in modern astronomy. It connects exoplanet science to philosophy + ethics + the future of humanity. There is no settled answer; what we know is that whatever the answer is, it tells us something important about ourselves.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  FP_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedFermi: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#a78bfa' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #a78bfa' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'Honest framing: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, 'Citizen science you can join: '),
                  'SETI@home shut down in 2020 after 20 years, but Breakthrough Listen makes its data publicly available + the Open SETI project (setisearcher.com) lets volunteers help with signal classification. The SETI Institute (seti.org) has student programs + summer research opportunities. For students at King Middle, this is one of the most accessible advanced research domains — anyone with a laptop can engage with real published data + contribute to the search.'
                )
              );
            })(),
            '#a78bfa'
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // SEASONS
      // ──────────────────────────────────────────────────────────────
      function renderSeasons() {
        var month = d.seasonMonth || 6;
        // Earth's axial tilt orientation through the year
        var monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        var phase = (month - 1) / 12; // 0 to 1
        var orbitAngle = phase * 2 * Math.PI;
        var earthX = 80 * Math.cos(orbitAngle);
        var earthY = 80 * Math.sin(orbitAngle);
        // N hemisphere season label
        var nSeason = month >= 3 && month <= 5 ? 'Spring' : (month >= 6 && month <= 8 ? 'Summer' : (month >= 9 && month <= 11 ? 'Fall' : 'Winter'));
        var sSeason = nSeason === 'Spring' ? 'Fall' : nSeason === 'Summer' ? 'Winter' : nSeason === 'Fall' ? 'Spring' : 'Summer';
        var note = '';
        if (month === 3) note = 'Spring equinox (March 20-21): day and night roughly equal everywhere.';
        else if (month === 6) note = 'June solstice (June 20-21): longest day in Northern Hemisphere, shortest in Southern.';
        else if (month === 9) note = 'Fall equinox (September 22-23): day and night roughly equal everywhere.';
        else if (month === 12) note = 'December solstice (December 21-22): shortest day in Northern Hemisphere, longest in Southern.';

        return h('div', { style: { padding: 16 } },
          softNote('Seasons are caused by Earth\'s axial tilt (23.5°), NOT by distance from the Sun. The hemisphere tipped toward the Sun gets more direct sunlight per square meter AND longer days. Earth is actually slightly farther from the Sun during Northern Hemisphere summer.'),

          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 } },
            h('div', { style: { padding: 14, borderRadius: 12, background: '#0a0e1a', border: '1px solid #334155', textAlign: 'center' } },
              h('svg', { viewBox: '-130 -130 260 260', width: 260, height: 260, role: 'img', 'aria-labelledby': 'seasonSvgTitle seasonSvgDesc' },
                h('title', { id: 'seasonSvgTitle' }, 'Earth\'s orbital position in ' + monthNames[month - 1]),
                h('desc', { id: 'seasonSvgDesc' }, 'Schematic of Earth\'s orbit around the Sun. Earth is shown at its orbital position for ' + monthNames[month - 1] + '. In Northern Hemisphere it is ' + nSeason + '.'),
                // Orbit ellipse
                h('ellipse', { cx: 0, cy: 0, rx: 80, ry: 80, fill: 'none', stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }),
                // Sun
                h('circle', { cx: 0, cy: 0, r: 18, fill: '#fde047', stroke: '#fbbf24', strokeWidth: 1 }),
                h('text', { x: 0, y: 30, textAnchor: 'middle', fill: '#fde68a', fontSize: 10 }, 'Sun'),
                // Earth at orbital position
                h('g', { transform: 'translate(' + earthX + ',' + earthY + ')' },
                  // Tilt indicator
                  h('line', { x1: -6, y1: -16, x2: 6, y2: 16, stroke: '#94a3b8', strokeWidth: 1.5, strokeLinecap: 'round' }),
                  h('circle', { cx: 0, cy: 0, r: 10, fill: '#3b82f6', stroke: '#1e3a8a', strokeWidth: 1 }),
                  h('text', { x: 0, y: 25, textAnchor: 'middle', fill: '#bfdbfe', fontSize: 10 }, 'Earth')
                )
              )
            ),
            h('div', null,
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8 } }, 'Month: ' + monthNames[month - 1]),
              h('input', {
                type: 'range', min: 1, max: 12, value: month,
                onChange: function(e) { upd({ seasonMonth: parseInt(e.target.value, 10) }); },
                'aria-label': 'Month of year',
                style: { width: '100%', accentColor: INDIGO, marginBottom: 12 }
              }),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Northern Hemisphere'),
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fde68a' } }, nSeason)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Southern Hemisphere'),
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#bae6fd' } }, sSeason)
              ),
              note ? h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.55 } }, note) : null
            )
          ),

          sectionCard('Why the tilt matters more than the distance',
            h('div', null,
              h('p', { style: { margin: '0 0 8px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
                'When sunlight hits Earth at a steep angle (overhead), it concentrates on a small area, heating it more. At a shallow angle, the same sunlight spreads over a larger area, heating each spot less. The 23.5° tilt means each hemisphere takes turns getting the steep-angle sunlight.'
              ),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
                'The tilt also affects day length. In summer, the tipped-toward hemisphere has long days; in winter, short days. Near the equator, this effect is small (days stay close to 12 hours year-round). Near the poles, it\'s huge — summer day length goes to 24 hours, winter to zero.'
              )
            )
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // STARS
      // ──────────────────────────────────────────────────────────────
      function renderStars() {
        var selected = STAR_TYPES.find(function(s) { return s.id === d.selectedStarType; });

        // Real-star samples for the HR diagram. Position = (B-V color index, absolute magnitude).
        // Plot: x = color (hot left to cool right), y = absolute magnitude (bright up, dim down).
        var HR_STARS = [
          // Main sequence (sloping from upper-left to lower-right)
          { name: 'Spica',     class: 'B', tempK: 22400, absMag: -3.6, group: 'main' },
          { name: 'Rigel',     class: 'B', tempK: 12100, absMag: -7.0, group: 'super' },
          { name: 'Vega',      class: 'A', tempK: 9602,  absMag: 0.58, group: 'main' },
          { name: 'Sirius A',  class: 'A', tempK: 9940,  absMag: 1.42, group: 'main' },
          { name: 'Procyon',   class: 'F', tempK: 6530,  absMag: 2.66, group: 'main' },
          { name: 'Sun',       class: 'G', tempK: 5778,  absMag: 4.83, group: 'main' },
          { name: 'Alpha Cen A', class: 'G', tempK: 5790, absMag: 4.38, group: 'main' },
          { name: 'Alpha Cen B', class: 'K', tempK: 5260, absMag: 5.71, group: 'main' },
          { name: 'Proxima Cen', class: 'M', tempK: 3042, absMag: 15.6, group: 'main' },
          // Red giants (upper right)
          { name: 'Arcturus',  class: 'K', tempK: 4286,  absMag: -0.30, group: 'giant' },
          { name: 'Aldebaran', class: 'K', tempK: 3910,  absMag: -0.63, group: 'giant' },
          // Supergiants (upper)
          { name: 'Betelgeuse',class: 'M', tempK: 3500,  absMag: -5.85, group: 'super' },
          { name: 'Antares',   class: 'M', tempK: 3660,  absMag: -5.28, group: 'super' },
          { name: 'Deneb',     class: 'A', tempK: 8525,  absMag: -8.38, group: 'super' },
          // White dwarfs (lower left)
          { name: 'Sirius B',  class: 'A', tempK: 25200, absMag: 11.18, group: 'dwarf' },
          { name: 'Procyon B', class: 'A', tempK: 7740,  absMag: 13.04, group: 'dwarf' }
        ];

        function hrDiagram() {
          var svgW = 640, svgH = 380;
          var padLeft = 70, padRight = 20, padTop = 20, padBottom = 50;
          var plotW = svgW - padLeft - padRight;
          var plotH = svgH - padTop - padBottom;
          // X axis: temperature 30000K (left) to 2500K (right) — log scale, REVERSED (hot left)
          var xMin = Math.log10(2500), xMax = Math.log10(35000);
          // Reverse: hotter (higher log) on LEFT
          function tx(tempK) {
            var logT = Math.log10(tempK);
            var t = (xMax - logT) / (xMax - xMin); // hotter on left
            return padLeft + t * plotW;
          }
          // Y axis: absolute magnitude. Brighter (lower number) on TOP. Range +18 to -10.
          var yMin = -10, yMax = 18;
          function ty(mag) {
            var t = (mag - yMin) / (yMax - yMin);
            return padTop + t * plotH;
          }
          // Color from temperature
          function colorForT(t) {
            if (t > 28000) return '#9bb0ff';      // O blue
            if (t > 10000) return '#aabfff';      // B blue-white
            if (t > 7500)  return '#cad7ff';      // A white
            if (t > 6000)  return '#f8f7ff';      // F yellow-white
            if (t > 5200)  return '#fff4ea';      // G yellow
            if (t > 3700)  return '#ffd2a1';      // K orange
            return '#ffbb88';                      // M red
          }

          return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'hrTitle hrDesc' },
            h('title', { id: 'hrTitle' }, 'Hertzsprung-Russell diagram'),
            h('desc', { id: 'hrDesc' }, 'Scatter plot of 16 real stars showing surface temperature (x-axis, hotter on left) versus absolute magnitude (y-axis, brighter on top). Main sequence stars form a band from upper-left to lower-right. Red giants in upper right, white dwarfs in lower left, supergiants along the top.'),
            // Plot area background
            h('rect', { x: padLeft, y: padTop, width: plotW, height: plotH, fill: '#0a0e1a', stroke: '#334155', strokeWidth: 1 }),
            // Y axis label
            h('text', { x: 16, y: padTop + plotH / 2, transform: 'rotate(-90 16 ' + (padTop + plotH / 2) + ')', textAnchor: 'middle', fill: '#94a3b8', fontSize: 11 }, 'Absolute magnitude (brighter ↑)'),
            // X axis label
            h('text', { x: padLeft + plotW / 2, y: svgH - 18, textAnchor: 'middle', fill: '#94a3b8', fontSize: 11 }, 'Surface temperature (K) — hotter ←'),
            // Y axis ticks at -10, -5, 0, 5, 10, 15
            [-10, -5, 0, 5, 10, 15].map(function(m) {
              return h('g', { key: 'y' + m },
                h('line', { x1: padLeft - 4, y1: ty(m), x2: padLeft, y2: ty(m), stroke: '#475569', strokeWidth: 1 }),
                h('text', { x: padLeft - 8, y: ty(m) + 4, textAnchor: 'end', fill: '#94a3b8', fontSize: 10 }, String(m))
              );
            }),
            // X axis ticks (log temperature)
            [30000, 10000, 6000, 3000].map(function(t) {
              return h('g', { key: 'x' + t },
                h('line', { x1: tx(t), y1: padTop + plotH, x2: tx(t), y2: padTop + plotH + 4, stroke: '#475569', strokeWidth: 1 }),
                h('text', { x: tx(t), y: padTop + plotH + 16, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, t.toLocaleString() + ' K')
              );
            }),
            // Region labels
            h('text', { x: tx(8000), y: ty(2), textAnchor: 'middle', fill: '#fbbf24', fontSize: 11, fontStyle: 'italic', fontWeight: 700 }, 'Main sequence'),
            h('text', { x: tx(4000), y: ty(-2), textAnchor: 'middle', fill: '#fda4af', fontSize: 11, fontStyle: 'italic', fontWeight: 700 }, 'Red giants'),
            h('text', { x: tx(5000), y: ty(-7.5), textAnchor: 'middle', fill: '#f87171', fontSize: 11, fontStyle: 'italic', fontWeight: 700 }, 'Supergiants'),
            h('text', { x: tx(12000), y: ty(12), textAnchor: 'middle', fill: '#bfdbfe', fontSize: 11, fontStyle: 'italic', fontWeight: 700 }, 'White dwarfs'),
            // Stars
            HR_STARS.map(function(s, i) {
              var x = tx(s.tempK), y = ty(s.absMag);
              var r = s.group === 'super' ? 8 : (s.group === 'giant' ? 6 : (s.group === 'dwarf' ? 3 : 4));
              var col = colorForT(s.tempK);
              return h('g', { key: 'star_' + i },
                h('circle', { cx: x, cy: y, r: r, fill: col, stroke: '#0a0e1a', strokeWidth: 0.5, opacity: 0.95 }),
                s.name === 'Sun' ? h('text', { x: x + 8, y: y + 4, fill: '#fde68a', fontSize: 10, fontWeight: 800 }, '☉ Sun') : null,
                s.name === 'Betelgeuse' ? h('text', { x: x + 10, y: y + 4, fill: '#fbbf24', fontSize: 9 }, 'Betelgeuse') : null,
                s.name === 'Sirius A' ? h('text', { x: x + 8, y: y + 4, fill: '#cbd5e1', fontSize: 9 }, 'Sirius') : null,
                s.name === 'Proxima Cen' ? h('text', { x: x + 6, y: y - 4, fill: '#fbbf24', fontSize: 9 }, 'Proxima') : null,
                s.name === 'Vega' ? h('text', { x: x + 8, y: y - 2, fill: '#cbd5e1', fontSize: 9 }, 'Vega') : null,
                s.name === 'Arcturus' ? h('text', { x: x + 8, y: y - 2, fill: '#fbbf24', fontSize: 9 }, 'Arcturus') : null,
                s.name === 'Rigel' ? h('text', { x: x + 10, y: y + 4, fill: '#cbd5e1', fontSize: 9 }, 'Rigel') : null,
                s.name === 'Deneb' ? h('text', { x: x + 10, y: y + 4, fill: '#cbd5e1', fontSize: 9 }, 'Deneb') : null
              );
            })
          );
        }

        return h('div', { style: { padding: 16 } },
          softNote('Stars are classified by surface temperature. The classes are O, B, A, F, G, K, M (memorized as "Oh, Be A Fine Girl/Guy, Kiss Me"). Each type has different mass, brightness, color, and lifespan.'),

          // HR diagram — the single most important plot in stellar astrophysics
          sectionCard('🌟 The Hertzsprung-Russell Diagram',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'When astronomers Ejnar Hertzsprung and Henry Norris Russell independently plotted star temperature against brightness around 1910, they discovered stars aren\'t scattered randomly — they cluster into a few distinct groups. The pattern is the foundation of stellar astrophysics. Each region tells you what stage of life a star is in.'
              ),
              hrDiagram(),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 12 } },
                [
                  { name: 'Main Sequence', desc: '~90% of all stars. Hydrogen fusion in the core. The Sun is here. Hotter = brighter + bigger + shorter-lived.', color: '#fbbf24' },
                  { name: 'Red Giants', desc: 'Stars that have exhausted core hydrogen. Outer layers expand + cool. The Sun will become one in ~5 billion years.', color: '#fda4af' },
                  { name: 'Supergiants', desc: 'The most massive stars in their final stage. Will end as supernovae. Betelgeuse, Rigel, Deneb.', color: '#f87171' },
                  { name: 'White Dwarfs', desc: 'The cooling core of a dead Sun-like star. Earth-sized but as massive as the Sun. Eventually fades to a black dwarf (none exist yet — the universe is too young).', color: '#bfdbfe' }
                ].map(function(r, i) {
                  return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + r.color } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: r.color, marginBottom: 2 } }, r.name),
                    h('div', { style: { fontSize: 11, color: '#e2e8f0', lineHeight: 1.55 } }, r.desc)
                  );
                })
              )
            ),
            '#fbbf24'
          ),

          // Star class picker
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0a0e1a', border: '1px solid #334155', marginBottom: 14, overflowX: 'auto' } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Pick a spectral class to learn more'),
            h('div', { style: { display: 'flex', gap: 6, justifyContent: 'space-around', minWidth: 480 } },
              STAR_TYPES.map(function(s) {
                var active = d.selectedStarType === s.id;
                var size = 20 + STAR_TYPES.indexOf(s) * 3;
                return h('button', {
                  key: s.id,
                  onClick: function() { upd({ selectedStarType: s.id }); },
                  'aria-label': s.name,
                  style: { padding: 8, borderRadius: 8, border: '1px solid ' + (active ? '#fbbf24' : '#334155'), background: active ? 'rgba(245,158,11,0.15)' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 60 }
                },
                  h('div', { style: { width: size, height: size, borderRadius: '50%', background: s.color, boxShadow: '0 0 ' + (size / 2) + 'px ' + s.color } }),
                  h('div', { style: { fontSize: 11, fontWeight: 700, color: active ? '#fbbf24' : '#cbd5e1' } }, s.class)
                );
              })
            )
          ),

          selected ? h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('h3', { style: { margin: '0 0 8px', color: selected.color, fontSize: 18 } }, selected.name),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 12 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Surface temp'),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' } }, selected.tempK + ' K')
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Mass (Sun=1)'),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' } }, selected.massSun)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Lifespan'),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' } }, selected.life)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Example'),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0' } }, selected.example)
              )
            ),
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, selected.desc)
          ) : null,

          sectionCard('Stellar lifecycles in one paragraph',
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
              'A star is a self-gravitating ball of hydrogen and helium that fuses hydrogen into helium in its core, releasing enormous energy. Massive stars burn hot and fast (millions of years); small stars burn cool and long (trillions of years, longer than the current age of the universe). When the core runs out of hydrogen, the star expands (red giant phase). A massive star ends in a supernova (collapsing into a neutron star or black hole). A small star ends as a white dwarf, slowly cooling.'
            )
          ),

          // Spectroscopy — how we know what stars are made of, their temperature, motion
          sectionCard('🌈 Spectroscopy — the cipher of starlight',
            (function() {
              var spectrumType = d.spectrumType || 'continuous';
              var dopplerKms = d.dopplerKms != null ? d.dopplerKms : 0;  // -300 to +300 km/s
              var c = 299792.458; // km/s
              var rest = [
                { name: 'Hα (Balmer)', nm: 656.28, color: '#ff6666' },
                { name: 'Hβ', nm: 486.13, color: '#66ccff' },
                { name: 'Hγ', nm: 434.05, color: '#aa88ff' },
                { name: 'Hδ', nm: 410.17, color: '#ddaaff' },
                { name: 'Na D doublet', nm: 589.30, color: '#ffcc44' },
                { name: 'Ca H+K', nm: 396.85, color: '#ddccff' },
                { name: 'Mg b triplet', nm: 517.00, color: '#88dd88' }
              ];

              // Map wavelength (nm, 380-750) to visible color
              function wavelengthToColor(nm) {
                var r = 0, g = 0, b = 0;
                if (nm >= 380 && nm < 440) { r = -(nm - 440) / 60; g = 0; b = 1; }
                else if (nm >= 440 && nm < 490) { r = 0; g = (nm - 440) / 50; b = 1; }
                else if (nm >= 490 && nm < 510) { r = 0; g = 1; b = -(nm - 510) / 20; }
                else if (nm >= 510 && nm < 580) { r = (nm - 510) / 70; g = 1; b = 0; }
                else if (nm >= 580 && nm < 645) { r = 1; g = -(nm - 645) / 65; b = 0; }
                else if (nm >= 645 && nm <= 780) { r = 1; g = 0; b = 0; }
                var factor = 1;
                if (nm >= 380 && nm < 420) factor = 0.3 + 0.7 * (nm - 380) / 40;
                if (nm > 700) factor = 0.3 + 0.7 * (780 - nm) / 80;
                var toHex = function(v) { var x = Math.round(255 * Math.pow(Math.max(0, v) * factor, 0.8)); return ('0' + x.toString(16)).slice(-2); };
                return '#' + toHex(r) + toHex(g) + toHex(b);
              }

              function spectrumSvg() {
                var svgW = 640, svgH = 80;
                var leftPad = 50, rightPad = 30;
                var plotW = svgW - leftPad - rightPad;
                var lambdaMin = 380, lambdaMax = 750;
                function xOf(nm) { return leftPad + (nm - lambdaMin) / (lambdaMax - lambdaMin) * plotW; }
                // Build continuous gradient stops
                var grad = [];
                for (var n = lambdaMin; n <= lambdaMax; n += 10) {
                  grad.push({ pct: ((n - lambdaMin) / (lambdaMax - lambdaMin) * 100).toFixed(1), color: wavelengthToColor(n) });
                }
                // Doppler-shifted line positions
                var shiftFactor = 1 + dopplerKms / c; // λ_observed = λ_rest * (1 + v/c)
                var shifted = rest.map(function(r) { return { name: r.name, nm: r.nm * shiftFactor, restNm: r.nm }; });

                return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'spectrumTitle spectrumDesc' },
                  h('title', { id: 'spectrumTitle' }, spectrumType + ' spectrum with Doppler shift of ' + dopplerKms + ' km/s'),
                  h('desc', { id: 'spectrumDesc' }, 'A visual spectrum from 380 to 750 nm showing ' + spectrumType + ' lines. Doppler shift is ' + (dopplerKms === 0 ? 'zero (at rest).' : (dopplerKms > 0 ? 'positive (object moving away, redshift)' : 'negative (object moving toward us, blueshift)') + '.')),
                  h('defs', null,
                    h('linearGradient', { id: 'visSpect', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                      grad.map(function(g, i) { return h('stop', { key: i, offset: g.pct + '%', stopColor: g.color }); })
                    )
                  ),
                  // Spectrum bar
                  h('rect', { x: leftPad, y: 15, width: plotW, height: 35,
                    fill: spectrumType === 'continuous' || spectrumType === 'absorption' ? 'url(#visSpect)' : '#000' }),
                  // Lines
                  shifted.map(function(l, i) {
                    if (l.nm < lambdaMin || l.nm > lambdaMax) return null;
                    var x = xOf(l.nm);
                    var lineColor = spectrumType === 'absorption' ? '#000' : wavelengthToColor(l.restNm);
                    return h('line', { key: 'line' + i, x1: x, y1: 15, x2: x, y2: 50, stroke: lineColor, strokeWidth: 2, opacity: spectrumType === 'continuous' ? 0 : (spectrumType === 'absorption' ? 0.95 : 1) });
                  }),
                  // Axis
                  [400, 450, 500, 550, 600, 650, 700].map(function(t, i) {
                    return h('g', { key: 't' + i },
                      h('line', { x1: xOf(t), y1: 50, x2: xOf(t), y2: 55, stroke: '#94a3b8', strokeWidth: 1 }),
                      h('text', { x: xOf(t), y: 67, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10 }, t + ' nm')
                    );
                  }),
                  h('text', { x: 8, y: 35, fill: '#cbd5e1', fontSize: 11, fontWeight: 700 },
                    spectrumType === 'continuous' ? 'Continuous' : spectrumType === 'emission' ? 'Emission' : 'Absorption'
                  )
                );
              }

              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Light from a star spreads into a spectrum when passed through a prism or diffraction grating. The pattern of bright + dark lines tells us EVERYTHING about the star: what it is made of (line positions), how hot it is (line intensities), how it is moving (line shifts), and even its magnetic field (line splitting). Spectroscopy is the single most important technique in modern astrophysics.'
                ),
                h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 } },
                  [
                    { id: 'continuous', name: 'Continuous (hot solid)', desc: 'A hot dense object emits at all wavelengths. The Sun\'s interior or a tungsten light bulb.' },
                    { id: 'emission', name: 'Emission (hot thin gas)', desc: 'A hot gas under low pressure emits only at specific wavelengths characteristic of the elements present. Neon signs, nebulae.' },
                    { id: 'absorption', name: 'Absorption (cool gas in front of hot)', desc: 'The standard stellar spectrum: continuous from the hot star, with dark lines where cooler outer atmosphere has absorbed specific wavelengths. The Sun looks like this.' }
                  ].map(function(s) {
                    var active = spectrumType === s.id;
                    return h('button', { key: s.id,
                      onClick: function() { upd({ spectrumType: s.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? 'rgba(245,158,11,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#fbbf24' : '#334155'), color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left', maxWidth: 220 } },
                      h('div', null, s.name),
                      h('div', { style: { fontSize: 10, opacity: 0.75, fontWeight: 500, marginTop: 2, lineHeight: 1.4 } }, s.desc)
                    );
                  })
                ),

                h('div', { style: { padding: 10, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', marginBottom: 10 } },
                  spectrumSvg()
                ),

                // Doppler shift slider
                h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 } },
                    h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Doppler shift (radial velocity)'),
                    h('span', { style: { fontSize: 13, color: dopplerKms > 50 ? '#fca5a5' : dopplerKms < -50 ? '#7dd3fc' : '#86efac', fontWeight: 800 } }, dopplerKms.toFixed(0) + ' km/s ' + (dopplerKms > 0 ? '(redshift, moving away)' : dopplerKms < 0 ? '(blueshift, approaching)' : '(at rest)'))
                  ),
                  h('input', { type: 'range', min: -300, max: 300, step: 10, value: dopplerKms,
                    onChange: function(e) { upd({ dopplerKms: parseInt(e.target.value, 10) }); },
                    'aria-label': 'Doppler radial velocity in km/s',
                    style: { width: '100%', accentColor: '#fbbf24' }
                  })
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'What spectroscopy tells us about a star: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Composition: '), 'Each element has a unique pattern of spectral lines (its "fingerprint"). Hydrogen, helium, calcium, sodium, iron — all identifiable by line wavelength.'),
                    h('li', null, h('strong', null, 'Temperature: '), 'The CONTINUUM (background spectrum) follows Planck\'s blackbody curve. Hotter stars peak at shorter (bluer) wavelengths; cooler stars at longer (redder).'),
                    h('li', null, h('strong', null, 'Radial velocity: '), 'A star moving toward us blueshifts its lines (compressed); moving away redshifts (stretched). Doppler shift Δλ/λ = v/c. This is how exoplanets are found by the radial-velocity method.'),
                    h('li', null, h('strong', null, 'Rotation: '), 'A spinning star has one limb moving toward us, the other away — blueshifted + redshifted at once. Lines BROADEN. Astronomers measure rotation by line width.'),
                    h('li', null, h('strong', null, 'Magnetic field: '), 'Strong magnetic fields split a single line into multiple components (Zeeman effect). The Sun\'s sunspot magnetic fields show this clearly.')
                  )
                )
              );
            })(),
            '#fbbf24'
          ),

          sectionCard('☁️ Nebulae + star formation — where stars are born',
            (function() {
              var NEBULAE = [
                {
                  id: 'molecular', name: 'Molecular cloud (stellar nursery)', color: '#7c3aed',
                  example: 'Orion Molecular Cloud Complex (1,300 ly away, contains the Orion Nebula visible to the naked eye below Orion\'s belt).',
                  what: 'Cold (~10-50 K), dense (relative to interstellar medium) clouds of mostly molecular hydrogen + helium + dust. The raw material from which stars form.',
                  size: 'Can span hundreds of light-years; contain enough material to form thousands of stars.',
                  why: 'When part of the cloud collapses under its own gravity (often triggered by a nearby supernova shock or compression by spiral arm), the densest regions become protostars. Most stars form in batches of dozens to thousands in a single cloud — open clusters are the leftover groups.',
                  obs: 'The Pleiades is the leftover cluster of a stellar nursery that finished its work ~100 million years ago. The Orion Nebula is one currently in action — you can see star formation happening right now with a small telescope.'
                },
                {
                  id: 'emission', name: 'Emission nebula', color: '#ef4444',
                  example: 'Orion Nebula (M42), Eagle Nebula (M16, "Pillars of Creation"), Lagoon Nebula (M8).',
                  what: 'Clouds of ionized hydrogen + other gas heated by ultraviolet light from nearby hot young stars. The gas glows by FLUORESCENCE — atoms absorb UV photons + re-emit visible light, especially the red Hα line at 656 nm.',
                  size: 'A few to a few hundred light-years across.',
                  why: 'A hot O-type star emits intense UV that ionizes the surrounding hydrogen for many light-years. The HII region (ionized hydrogen) glows red. Eventually the central stars age + die; the nebula dissipates back into the interstellar medium.',
                  obs: 'The Orion Nebula is visible with the naked eye as a fuzzy patch in Orion\'s sword. Through a small telescope it\'s breathtaking — bright cyan-pink gas around the four brightest "Trapezium" stars.'
                },
                {
                  id: 'reflection', name: 'Reflection nebula', color: '#3b82f6',
                  example: 'The Pleiades nebula (visible around the brightest Pleiades stars in long exposures).',
                  what: 'Dust clouds illuminated by nearby stars but not hot enough to ionize the gas. The dust SCATTERS the starlight, like a fog around a streetlight. Always blueish because dust scatters blue light more efficiently than red (same physics that makes the daytime sky blue).',
                  size: 'Smaller than emission nebulae, typically a few light-years.',
                  why: 'A common companion to molecular clouds + open clusters. The Pleiades cluster is moving through a dust cloud right now; the dust reflects light from the young stars + appears blue.',
                  obs: 'Photographs reveal them dramatically; visually they are subtle. Long-exposure imaging is the best way to see them.'
                },
                {
                  id: 'planetary', name: 'Planetary nebula', color: '#22c55e',
                  example: 'Ring Nebula (M57) in Lyra, Helix Nebula (NGC 7293) in Aquarius, Cat\'s Eye Nebula (NGC 6543).',
                  what: 'The outer layers shed by a Sun-like star late in its life. The remaining hot stellar core (eventually a white dwarf) ionizes the expanding shell. The misnomer "planetary" came from early telescopes — they looked disk-shaped + planet-like at first glance.',
                  size: 'Typically 1-3 light-years; expanding at ~30 km/s.',
                  why: 'The death rattle of a Sun-like star. The Sun itself will produce one in ~5 billion years. Each represents about half the original star\'s mass returned to the interstellar medium — carrying back the heavier elements forged during the star\'s life.',
                  obs: 'Many require a telescope to see well. The Ring Nebula is a classic small-telescope target — looks like a smoke ring at 100×.'
                },
                {
                  id: 'snr', name: 'Supernova remnant', color: '#f59e0b',
                  example: 'Crab Nebula (M1, from the 1054 CE supernova), Cassiopeia A (~340 years old), Veil Nebula (~10,000 years old).',
                  what: 'The expanding, glowing shell of gas blown off by a massive star in a supernova explosion. Filaments of ionized gas + dust + heavy elements made during the explosion.',
                  size: 'Starts compact, expands to hundreds of light-years over thousands of years.',
                  why: 'Supernovae forge ALL elements heavier than iron + scatter them across thousands of light-years. Every gold atom, every uranium atom, every calcium atom in your bones came from supernova remnants (or now also from neutron-star mergers). They also leave behind a neutron star or black hole.',
                  obs: 'The Crab Nebula was first recorded by Chinese astronomers in 1054 CE as a "guest star" visible in daytime for weeks. Visible now through a small telescope as a faint smudge.'
                }
              ];
              var sel = NEBULAE.find(function(n) { return n.id === d.selectedNebula; }) || NEBULAE[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Stars are born in clouds + die in clouds. Between formation and death, ~99% of a star\'s life is the steady main-sequence phase. But the spectacular phases that look like nothing else in nature — the births + deaths — are recorded in nebulae of different kinds. Five major categories, each telling a different chapter of the stellar life cycle.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  NEBULAE.map(function(n) {
                    var active = (d.selectedNebula || NEBULAE[0].id) === n.id;
                    return h('button', { key: n.id,
                      onClick: function() { upd({ selectedNebula: n.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? n.color + '33' : '#1e293b', border: '1px solid ' + (active ? n.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, n.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, 'Example: ' + sel.example),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What it is'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Why it exists'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.why)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Size + scale'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.size)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How to observe'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.obs)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'How a star actually forms (in 4 steps): '),
                  h('ol', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Trigger: '), 'Something disturbs a stable molecular cloud — a nearby supernova shockwave, two clouds colliding, or compression by spiral-arm density waves.'),
                    h('li', null, h('strong', null, 'Collapse: '), 'A dense knot in the cloud begins gravitational free-fall. It contracts; conserving angular momentum, it flattens into a disk. The center grows hotter.'),
                    h('li', null, h('strong', null, 'Protostar phase: '), 'After ~100,000 years, the core reaches a few million degrees — but not yet hot enough for fusion. It is "shining" by gravitational contraction. Protoplanetary disk surrounds it. Bipolar jets fire perpendicular to the disk.'),
                    h('li', null, h('strong', null, 'Main sequence ignition: '), 'After ~10-100 million years (Sun-like) or much faster (massive stars), the core reaches ~10 million K. Hydrogen fusion starts. The star is "born" + joins the main sequence. The protoplanetary disk\'s remaining material forms planets.')
                  )
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'The Pillars of Creation: '),
                  'Hubble\'s famous 1995 image of the Eagle Nebula shows three towering columns of gas + dust, each several light-years tall, being eroded by ultraviolet radiation from nearby young hot stars. New stars are forming inside the pillars. JWST re-imaged them in 2022 in infrared, revealing the protostars more clearly than ever. The pillars themselves may have already been destroyed by a supernova ~6,000 years ago — but the light hasn\'t reached us yet.'
                )
              );
            })(),
            '#a855f7'
          ),

          sectionCard('☀️ Our Sun — closest, most important star',
            (function() {
              var LAYERS = [
                { id: 'core', name: 'Core', color: '#fde047',
                  size: '~25% of solar radius (175,000 km)',
                  temp: '15 million K',
                  what: 'Where nuclear fusion happens. Hydrogen fuses to helium via the proton-proton chain. Releases the energy that powers the Sun — and Earth. Density at the center: 150 g/cm³ (10× lead).',
                  why: 'The Sun fuses about 600 million tons of hydrogen into helium PER SECOND. Mass equivalent to ~4 million tons becomes pure energy (E=mc²) every second. Has been doing this for 4.6 billion years; will continue for ~5 more billion.'
                },
                { id: 'radiative', name: 'Radiative zone', color: '#fbbf24',
                  size: '~70% of solar radius',
                  temp: '7 million → 2 million K',
                  what: 'A region where energy travels by photons radiating outward, bouncing between particles. The journey of a photon from core to surface takes ~100,000 years (NOT 8 minutes — that\'s only the trip from surface to Earth).',
                  why: 'Material here is opaque + dense. Each photon is absorbed + re-emitted countless times — a random walk through the Sun.'
                },
                { id: 'convective', name: 'Convective zone', color: '#f97316',
                  size: '~30% of solar radius (outermost)',
                  temp: '2 million → 5,778 K',
                  what: 'Plasma boils like water in a pot. Hot blobs rise to the surface, cool, sink. The granulated appearance of the Sun\'s surface is the tops of these convection cells.',
                  why: 'Different parts of the Sun rotate at different speeds (equator faster than poles — "differential rotation"). The motion winds up magnetic field lines, eventually causing them to snap + reorganize, which drives the 11-year solar cycle.'
                },
                { id: 'photosphere', name: 'Photosphere', color: '#fef3c7',
                  size: 'A 500-km layer (the "visible surface")',
                  temp: '5,778 K',
                  what: 'The "surface" of the Sun is the layer from which most visible light escapes. Below: opaque. Above: transparent. Granulation, sunspots, and faculae live here.',
                  why: 'Sunspots are cooler regions (~3,800 K) where magnetic fields are so strong they inhibit local convection. They appear dark only by contrast against the brighter surroundings.'
                },
                { id: 'chromosphere', name: 'Chromosphere', color: '#dc2626',
                  size: '~2,000 km thick',
                  temp: '~4,000 → 25,000 K (gets HOTTER outward)',
                  what: 'A thin, pinkish-red layer (named for its color: "color sphere"). Visible only during total solar eclipses or with hydrogen-alpha filters. Filaments, prominences, and spicules live here.',
                  why: 'Why does temperature INCREASE moving away from the heat source? "Coronal heating problem" — one of the great open puzzles in solar physics. Current best answer involves magnetic reconnection events on tiny scales (nanoflares) and Alfvén waves heating the upper atmosphere.'
                },
                { id: 'corona', name: 'Corona', color: '#7dd3fc',
                  size: 'Extends millions of km outward, eventually becoming the solar wind',
                  temp: '1-3 million K (hotter than the surface!)',
                  what: 'The Sun\'s outer atmosphere. Visible only during total solar eclipses as the pearly-white halo. Origin of the solar wind + most coronal mass ejections + flares.',
                  why: 'Drives space weather. A coronal mass ejection (CME) that hits Earth produces auroras + can disrupt satellites + power grids. The 1859 Carrington Event was the largest recorded — telegraph wires sparked. A repeat today would cause trillions in damage to electronics.'
                }
              ];
              var selL = LAYERS.find(function(l) { return l.id === d.selectedSolarLayer; }) || LAYERS[0];
              var layerIdx = LAYERS.findIndex(function(l) { return l === selL; });

              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Our Sun is a G2V main-sequence star — middle-aged, middle-sized, middle-luminosity. The most thoroughly studied star in existence, and the only one we can study at close range. Solar physics is also "space weather": the Sun\'s activity directly affects Earth\'s magnetosphere, satellites, power grids, and the aurora.'
                ),
                // SVG layered Sun
                (function() {
                  var svgW = 600, svgH = 300;
                  var cx = svgW / 2, cy = svgH / 2;
                  return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'sunTitle sunDesc' },
                    h('title', { id: 'sunTitle' }, 'Sun cross-section diagram'),
                    h('desc', { id: 'sunDesc' }, 'A schematic cross-section of the Sun showing nested concentric layers from the central core out to the corona.'),
                    h('rect', { x: 0, y: 0, width: svgW, height: svgH, fill: '#000' }),
                    // Corona (large, faint)
                    h('circle', { cx: cx, cy: cy, r: 140, fill: 'rgba(125, 211, 252, 0.15)', stroke: '#7dd3fc', strokeWidth: layerIdx === 5 ? 3 : 1, opacity: 0.9 }),
                    h('text', { x: cx, y: cy - 130, textAnchor: 'middle', fill: layerIdx === 5 ? '#7dd3fc' : '#94a3b8', fontSize: 11, fontWeight: layerIdx === 5 ? 800 : 500 }, 'Corona'),
                    // Chromosphere
                    h('circle', { cx: cx, cy: cy, r: 105, fill: '#dc2626', stroke: '#7f1d1d', strokeWidth: layerIdx === 4 ? 3 : 1, opacity: 0.7 }),
                    h('text', { x: cx + 115, y: cy - 25, fill: layerIdx === 4 ? '#fca5a5' : '#94a3b8', fontSize: 10, fontWeight: layerIdx === 4 ? 800 : 500 }, 'Chromosphere'),
                    // Photosphere
                    h('circle', { cx: cx, cy: cy, r: 100, fill: '#fef3c7', stroke: layerIdx === 3 ? '#fbbf24' : '#92400e', strokeWidth: layerIdx === 3 ? 3 : 1, opacity: 0.85 }),
                    h('text', { x: cx + 105, y: cy + 5, fill: layerIdx === 3 ? '#fde68a' : '#94a3b8', fontSize: 10, fontWeight: layerIdx === 3 ? 800 : 500 }, 'Photosphere'),
                    // Convective zone
                    h('circle', { cx: cx, cy: cy, r: 80, fill: '#f97316', stroke: '#9a3412', strokeWidth: layerIdx === 2 ? 3 : 1 }),
                    h('text', { x: cx, y: cy + 70, textAnchor: 'middle', fill: layerIdx === 2 ? '#fdba74' : '#94a3b8', fontSize: 10, fontWeight: layerIdx === 2 ? 800 : 500 }, 'Convective zone'),
                    // Radiative zone
                    h('circle', { cx: cx, cy: cy, r: 55, fill: '#fbbf24', stroke: '#92400e', strokeWidth: layerIdx === 1 ? 3 : 1 }),
                    h('text', { x: cx, y: cy + 45, textAnchor: 'middle', fill: layerIdx === 1 ? '#fde68a' : '#94a3b8', fontSize: 9, fontWeight: layerIdx === 1 ? 800 : 500 }, 'Radiative zone'),
                    // Core
                    h('circle', { cx: cx, cy: cy, r: 25, fill: '#fde047', stroke: '#facc15', strokeWidth: layerIdx === 0 ? 3 : 1 }),
                    h('text', { x: cx, y: cy + 4, textAnchor: 'middle', fill: '#7c2d12', fontSize: 11, fontWeight: 800 }, 'Core'),
                    // Solar wind arrows (only when corona selected)
                    layerIdx === 5 ? [0, 1, 2, 3].map(function(i) {
                      var ang = i * Math.PI / 2;
                      var x1 = cx + Math.cos(ang) * 140, y1 = cy + Math.sin(ang) * 140;
                      var x2 = cx + Math.cos(ang) * 170, y2 = cy + Math.sin(ang) * 170;
                      return h('g', { key: 'sw' + i },
                        h('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: '#7dd3fc', strokeWidth: 1.5 }),
                        h('polygon', { points: x2 + ',' + (y2 - 4) + ' ' + x2 + ',' + (y2 + 4) + ' ' + (x2 + 8) + ',' + y2, fill: '#7dd3fc', transform: 'rotate(' + (ang * 180 / Math.PI) + ' ' + x2 + ' ' + y2 + ')' })
                      );
                    }) : null
                  );
                })(),
                // Layer picker
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10, marginBottom: 12 } },
                  LAYERS.map(function(l) {
                    var active = (d.selectedSolarLayer || 'core') === l.id;
                    return h('button', { key: l.id,
                      onClick: function() { upd({ selectedSolarLayer: l.id }); },
                      style: { padding: '6px 12px', borderRadius: 8, background: active ? l.color + '33' : '#1e293b', border: '1px solid ' + (active ? l.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, l.name);
                  })
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + selL.color } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: selL.color, marginBottom: 4 } }, selL.name),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 } },
                    h('div', { style: { padding: 6, borderRadius: 6, background: '#1e293b' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Size'),
                      h('div', { style: { fontSize: 11.5, color: '#e2e8f0', fontWeight: 700 } }, selL.size)
                    ),
                    h('div', { style: { padding: 6, borderRadius: 6, background: '#1e293b' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Temperature'),
                      h('div', { style: { fontSize: 11.5, color: '#fde68a', fontWeight: 700 } }, selL.temp)
                    )
                  ),
                  h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, selL.what),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8', fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic' } }, selL.why)
                ),
                // Solar cycle + space weather
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'The 11-year solar cycle: '),
                  'Sunspot count varies on an ~11-year cycle (the "Schwabe cycle," 1843). At solar minimum: few or no sunspots; aurora rare. At solar maximum: many sunspots, frequent CMEs, vivid aurora, possible satellite + power-grid impacts. Solar Cycle 25 (current) peaked in 2024-25; the 2024 May Mother\'s Day Storm was the strongest in 20 years. The Sun\'s magnetic poles flip every cycle (so the FULL cycle is actually 22 years).'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, 'Aurora — Sun-Earth coupling: '),
                  'Charged particles from solar wind + CMEs follow Earth\'s magnetic field lines toward the poles, colliding with atmospheric atoms at 100-300 km altitude. Excited oxygen emits green (~557 nm) + red (~630 nm); nitrogen emits blue + purple. Strong storms push aurora to lower latitudes — Maine + Vermont saw the May 2024 + October 2024 storms vividly. Best viewing: dark site, look north, allow eyes to dark-adapt. NOAA SWPC (Space Weather Prediction Center) issues aurora forecasts.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, 'The Carrington Event (1859): '),
                  'A massive solar storm — auroras visible in the Caribbean, telegraph operators got electric shocks, some telegraph systems caught fire. Modern estimates: peak CME speed ~2,000 km/s (the 2024 May storm reached ~900 km/s). A direct Carrington-scale hit today could disrupt power grids globally for months. Lloyd\'s of London estimated the economic cost at $2 trillion+. Active research on grid hardening + early warning is ongoing. The Parker Solar Probe (launched 2018) flies through the corona to better understand CME origins.'
                )
              );
            })(),
            '#fde047'
          ),

          // Compact objects — the dead ends of stellar evolution
          sectionCard('💀 Compact objects — what stars become',
            (function() {
              var COMPACT = [
                {
                  id: 'wd', name: 'White Dwarf', color: '#bfdbfe',
                  mass: '< 1.4 solar masses (Chandrasekhar limit)',
                  size: '~Earth-sized (radius ~6,400 km)',
                  density: '~10⁹ kg/m³ — a teaspoon weighs 5 tons',
                  origin: 'The core of a Sun-like star after it sheds its outer layers as a planetary nebula. The Sun will become one in ~5 billion years.',
                  physics: 'Supported against gravity by electron degeneracy pressure (a quantum effect: electrons can\'t share the same quantum state). Slowly cools over billions of years. No fusion happens inside.',
                  example: 'Sirius B (companion to Sirius). About 12 cm of diameter visible through the world\'s best telescopes from Earth.',
                  fate: 'Eventually cools to a "black dwarf" — but the universe is not yet old enough for any black dwarfs to exist. Takes >> 13.8 billion years to cool fully.'
                },
                {
                  id: 'ns', name: 'Neutron Star', color: '#fbbf24',
                  mass: '~1.4 - 2.2 solar masses',
                  size: '~10-20 km RADIUS (size of a city)',
                  density: '~10¹⁷ kg/m³ — a teaspoon weighs ~5 BILLION tons',
                  origin: 'The collapsed core of a massive star that went supernova. The outer layers are blown off; the iron core implodes into nuclear-density matter.',
                  physics: 'Supported by neutron degeneracy pressure. Spins extremely fast (from milliseconds to seconds per rotation) — angular momentum conservation from the collapse. Strongest magnetic fields known.',
                  example: 'Crab Pulsar (in the Crab Nebula, from the 1054 CE supernova). The first millisecond pulsar (PSR B1937+21) spins 642 times per second.',
                  fate: 'PULSAR: a neutron star whose magnetic poles sweep across our line of sight. MAGNETAR: a neutron star with magnetic fields a thousand trillion times Earth\'s. Either way, eventually cools + the rotation slows.'
                },
                {
                  id: 'sbh', name: 'Stellar-mass Black Hole', color: '#a855f7',
                  mass: '~3 - 100 solar masses (above the Tolman-Oppenheimer-Volkoff limit)',
                  size: 'Event horizon radius ≈ 3 km × (mass in solar masses). A 10-solar-mass BH has a ~30 km event horizon.',
                  density: 'Singular at the center (formally infinite). Average density inside the event horizon decreases with mass — a supermassive BH could be less dense than water.',
                  origin: 'The collapsed core of a very massive star that exceeded the maximum neutron star mass. No known force stops the collapse.',
                  physics: 'Defined by the event horizon: the surface beyond which nothing — not even light — can escape. Three properties only (the "no-hair theorem"): mass, charge, angular momentum.',
                  example: 'Cygnus X-1 (first BH identified, 1971). LIGO has now detected ~100+ binary BH mergers.',
                  fate: 'Effectively forever. Hawking radiation predicts very slow evaporation, but for a solar-mass BH it would take ~10⁶⁷ years to evaporate. The universe is 1.38 × 10¹⁰ years old.'
                },
                {
                  id: 'smbh', name: 'Supermassive Black Hole (SMBH)', color: '#7c3aed',
                  mass: 'Millions to billions of solar masses',
                  size: 'Event horizon ranges from solar-system-sized to bigger than the orbit of Pluto',
                  density: 'Average density inside event horizon can be less than water for the largest BHs (size scales linearly with mass, but volume scales as mass³).',
                  origin: 'Unclear — grew over cosmic time from "seed" BHs in the early universe. Found at the center of essentially every galaxy.',
                  physics: 'Same as stellar BHs but vastly larger. Surrounded by accretion disks (heated infalling matter, the brightest objects in the universe when active).',
                  example: 'Sagittarius A* at the Milky Way center (~4.3 million solar masses, imaged by the Event Horizon Telescope in 2022). M87* (the first BH ever imaged, 2019, ~6.5 billion solar masses).',
                  fate: 'Galaxy mergers cause SMBHs to spiral together over billions of years and merge. LISA (planned 2030s space mission) will detect these mergers in gravitational waves.'
                }
              ];
              var sel = COMPACT.find(function(c) { return c.id === d.selectedCompact; }) || COMPACT[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'When a star runs out of fuel, gravity wins. The kind of corpse it becomes depends on one thing: the mass of the remaining core. Sun-like stars leave white dwarfs. Big stars leave neutron stars or black holes. The boundaries are sharp and rooted in fundamental physics.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  COMPACT.map(function(c) {
                    var active = (d.selectedCompact || 'wd') === c.id;
                    return h('button', { key: c.id,
                      onClick: function() { upd({ selectedCompact: c.id }); },
                      style: { padding: '8px 14px', borderRadius: 8, background: active ? c.color + '33' : '#1e293b', border: '1px solid ' + (active ? c.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, c.name);
                  })
                ),
                h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('h3', { style: { margin: '0 0 10px', color: sel.color, fontSize: 17 } }, sel.name),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, marginBottom: 10 } },
                    [
                      { label: 'Mass', value: sel.mass },
                      { label: 'Size', value: sel.size },
                      { label: 'Density', value: sel.density }
                    ].map(function(p, i) {
                      return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b' } },
                        h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, p.label),
                        h('div', { style: { fontSize: 11.5, color: '#e2e8f0', fontWeight: 700, marginTop: 2, lineHeight: 1.45 } }, p.value)
                      );
                    })
                  ),
                  [
                    { title: 'Origin', body: sel.origin, color: '#fbbf24' },
                    { title: 'Physics', body: sel.physics, color: sel.color },
                    { title: 'Real example', body: sel.example, color: '#38bdf8' },
                    { title: 'Long-term fate', body: sel.fate, color: '#94a3b8' }
                  ].map(function(p, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: 'rgba(99,102,241,0.05)', borderLeft: '3px solid ' + p.color, marginBottom: 6 } },
                      h('div', { style: { fontSize: 10.5, fontWeight: 800, color: p.color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, p.title),
                      h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, p.body)
                    );
                  })
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'LIGO + gravitational waves: '),
                  'When two black holes (or two neutron stars) spiral into each other and merge, they emit gravitational waves — ripples in spacetime predicted by Einstein in 1915. The Laser Interferometer Gravitational-wave Observatory (LIGO) made the first direct detection on September 14, 2015 (GW150914, two black holes ~36 + ~29 solar masses, ~1.3 billion light-years away). The 2017 Nobel Prize went to Weiss, Barish + Thorne for this discovery. Over 100 BH mergers + a few neutron-star mergers have now been detected.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(124,58,237,0.10)', border: '1px solid rgba(124,58,237,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'EHT: the first picture of a black hole. '),
                  'The Event Horizon Telescope is a planet-sized virtual telescope: dozens of radio dishes around Earth combined into one image. In April 2019 it released the first-ever direct image of a black hole — the supermassive M87* in the center of the M87 galaxy, showing the bright accretion disk + the dark shadow of the event horizon. In May 2022 it imaged Sagittarius A* at our own Milky Way\'s center. Both images match Einstein\'s general relativity predictions from over a century ago.'
                )
              );
            })(),
            '#a855f7'
          ),

          // Magnitude scale: apparent vs absolute
          sectionCard('🔆 The magnitude scale: how bright is bright?',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Astronomers measure brightness on the magnitude scale, invented by the Greek astronomer Hipparchus around 130 BCE. It is ',
                h('strong', { style: { color: '#fbbf24' } }, 'inverted'),
                ' (smaller number = brighter, the historical convention) and ',
                h('strong', { style: { color: '#fbbf24' } }, 'logarithmic'),
                ' (each step of 5 magnitudes is exactly 100× brighter). The Sun at magnitude -27 and the faintest galaxy ever imaged at magnitude +32 differ in brightness by a factor of about 10²³.'
              ),

              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid #fbbf24' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, 'Apparent magnitude (m)'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'How bright the object LOOKS from Earth. Depends on both how much light the object emits AND how far away it is. A bright nearby star and a dim distant star can have the same apparent magnitude.')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid #c7d2fe' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } }, 'Absolute magnitude (M)'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'How bright the object would APPEAR if placed at a standard distance of 10 parsecs (32.6 light-years). Lets us compare the actual luminosity of stars regardless of distance.')
                )
              ),

              // Magnitude reference table
              h('div', { style: { padding: 12, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', overflowX: 'auto' } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } }, 'Apparent magnitude reference:'),
                h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5, minWidth: 480 } },
                  h('thead', null, h('tr', null,
                    ['Object', 'App. mag (m)', 'Visibility'].map(function(c, i) {
                      return h('th', { key: i, style: { padding: 5, textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid #334155', fontWeight: 700 } }, c);
                    })
                  )),
                  h('tbody', null,
                    [
                      { obj: 'Sun', m: '-26.7', vis: 'Too bright to look at safely' },
                      { obj: 'Full Moon', m: '-12.7', vis: 'Brightest natural night object' },
                      { obj: 'Venus (brightest)', m: '-4.9', vis: 'Visible in twilight' },
                      { obj: 'Jupiter (brightest)', m: '-3.0', vis: 'Easily naked-eye' },
                      { obj: 'Sirius (brightest star)', m: '-1.46', vis: 'Brightest star at night' },
                      { obj: 'Vega', m: '0.03', vis: 'Reference standard (~mag 0)' },
                      { obj: 'Polaris', m: '+1.97', vis: 'North Star, mid-bright' },
                      { obj: 'Naked-eye limit (dark sky)', m: '+6.5', vis: 'Threshold of naked-eye visibility' },
                      { obj: 'Naked-eye limit (city)', m: '+2 to +4', vis: 'Most stars erased by light pollution' },
                      { obj: 'Binocular limit (7×50)', m: '+9 to +10', vis: 'Adds thousands of stars' },
                      { obj: 'Small telescope limit', m: '+12 to +14', vis: 'Galaxies, deep-sky' },
                      { obj: 'Hubble deep field limit', m: '+30', vis: 'Beyond reach of most ground telescopes' },
                      { obj: 'JWST faintest', m: '+34 (estimated)', vis: 'The faintest galaxies ever imaged' }
                    ].map(function(r, i) {
                      return h('tr', { key: i, style: { background: i % 2 === 0 ? '#0a0e1a' : '#0f172a' } },
                        h('td', { style: { padding: 5, color: '#e2e8f0' } }, r.obj),
                        h('td', { style: { padding: 5, color: '#fbbf24', fontFamily: 'ui-monospace, monospace' } }, r.m),
                        h('td', { style: { padding: 5, color: '#94a3b8' } }, r.vis)
                      );
                    })
                  )
                )
              ),

              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                h('strong', null, 'Why this matters: '),
                'Sirius LOOKS brightest in our sky because it is close (8.6 light-years), but its absolute magnitude is +1.4 — Vega (also close, 25 ly) is intrinsically brighter at +0.6. Betelgeuse looks medium-bright (+0.5) but is 550 light-years away — its absolute magnitude is -5.8, intrinsically about 100,000× more luminous than the Sun. Without correcting for distance, you cannot compare what stars actually are.'
              )
            ),
            '#fbbf24'
          ),

          // ─── Solar physics + space weather ───────────────────────
          sectionCard('☀️ Solar physics + space weather',
            (function() {
              var SUN_TOPICS = [
                { id: 'cycle', name: 'The 11-year sunspot cycle', emoji: '🔄',
                  body: 'The Sun goes through an ~11-year cycle of magnetic activity, discovered by Heinrich Schwabe in 1843 after 17 years of patient observation. At solar MINIMUM, the visible disk has few or no sunspots; at solar MAXIMUM, dozens of spots appear at any time, in two latitude bands either side of the equator. The magnetic field flips polarity at each maximum, so the FULL cycle is actually 22 years (the Hale cycle). The cycle is generated by a magnetic dynamo deep in the Sun, driven by differential rotation (the equator rotates ~25 days, the poles ~35 days) shearing the magnetic field into ropes that buoyantly rise + break through the surface as sunspots. We are currently in Solar Cycle 25 (started December 2019); maximum is expected late 2024 to early 2025 — already very active.',
                  caveat: 'The 11-year period is an average; individual cycles vary from 9 to 14 years + from very mild (Cycle 24 was unusually weak) to very strong (Cycle 19 in 1957-1958 was the strongest on record). Long stretches with almost no sunspots have happened — the Maunder Minimum (1645-1715) coincided with the coldest part of the Little Ice Age in Europe, though the climate connection is partial + contested.'
                },
                { id: 'flares', name: 'Solar flares', emoji: '⚡',
                  body: 'A solar flare is a sudden bright flash on the Sun caused by magnetic reconnection — twisted field lines in an active region snap into a lower-energy configuration, releasing the stored energy as X-rays + gamma-rays + accelerated particles + heated plasma. Flares are classified A (smallest), B, C, M, X (largest), each class 10× more intense than the previous. The largest flares ever recorded are estimated around X45 (November 2003, modern instruments saturated) + X40 (the May 2024 series). Flare X-rays reach Earth in 8 minutes (the speed of light); they ionize the upper atmosphere, causing HF radio blackouts on the sunlit side of Earth for minutes to hours.',
                  caveat: 'Solar flares can damage satellites + disrupt communications, but they do not directly threaten people on Earth\'s surface (the atmosphere blocks the X-rays). The more dangerous space-weather events are CMEs, which follow some flares but can also occur independently. Aviation routes near the poles are sometimes diverted during major flare events to reduce radiation exposure for crew + passengers.'
                },
                { id: 'cme', name: 'Coronal mass ejections (CMEs)', emoji: '💥',
                  body: 'A CME is a huge bubble of magnetized plasma erupted from the Sun\'s corona — billions of tons of charged particles flung into space at 250-3000 km/s. If a CME is aimed at Earth, it takes 15 hours to 3 days to arrive (depending on speed). On arrival, the CME\'s magnetic field interacts with Earth\'s magnetosphere; if oriented southward, it couples + dumps energy into the magnetosphere, triggering a GEOMAGNETIC STORM. The energetic particles excite oxygen + nitrogen in the upper atmosphere, producing the aurora borealis + australis. Strong CMEs push the aurora oval to mid-latitudes (visible from Maine + sometimes as far south as Texas + Florida).',
                  caveat: 'NOT every CME hits Earth — most are aimed elsewhere in the solar system. Of those that do hit, only those with the right magnetic orientation cause strong geomagnetic effects. NOAA\'s Space Weather Prediction Center monitors the Sun continuously + issues storm forecasts; their 5-level G-scale (G1 minor through G5 extreme) is the official US warning system.'
                },
                { id: 'carrington', name: 'The Carrington event (1859)', emoji: '📚',
                  body: 'On September 1-2, 1859, the largest geomagnetic storm in recorded history hit Earth. Richard Carrington + Richard Hodgson independently witnessed a white-light solar flare (the first ever observed); ~17 hours later the CME arrived. Telegraph systems worldwide failed; operators reported pylons sparking, paper catching fire from induced currents, and lines continuing to transmit even with batteries disconnected. Aurora appeared as far south as Cuba, Hawaii, and the Caribbean. The event is now estimated as a G5+ storm with possibly twice the magnetic energy of the largest 20th-century event. A Carrington-class event today would cost an estimated $1-2 trillion in damage to power grids + satellites + financial networks, with recovery taking years.',
                  caveat: 'Modern estimates of Carrington-event frequency: ~1 per 100-150 years on average, with high uncertainty. A near-miss occurred in July 2012 (a CME passed through Earth\'s orbit just 9 days AFTER Earth had been there). Power grid hardening (grounding modifications, GIC monitoring, fast-trip relays) has improved since 2003, but the largest CMEs would still cause serious damage. This is a real low-probability + high-impact risk, not science fiction.'
                },
                { id: 'spaceweather', name: 'Modern impacts', emoji: '🛰️',
                  body: 'A strong geomagnetic storm can: (a) Damage SATELLITES — Starlink lost ~40 satellites to a moderate storm in February 2022 because the heated upper atmosphere increased atmospheric drag on the freshly-launched batch. (b) Disrupt GPS — ionospheric scintillation degrades GPS accuracy from meters to tens of meters during storms; precision agriculture + drone operations + airline navigation all suffer. (c) Trigger power grid failures — Quebec Hydro experienced a 9-hour province-wide blackout from a March 1989 storm (G5). (d) Block HF radio communication used by aviation + maritime + amateur radio. (e) Increase radiation exposure for astronauts (ISS goes into shielded areas + on the Moon, future Artemis missions will have to track CMEs). (f) Cause aurora displays visible at unusual latitudes.',
                  caveat: 'Space weather is now a core operational concern for NOAA, NASA, the FAA, DOD, ESA, and major utility + telecom companies. Industry-specific warnings (Air Force aviation forecasts, ICAO advisories, NERC grid alerts) all derive from the same NOAA SWPC products. Resilience has improved but not enough; modern society is more dependent on satellites + grid stability than 1859 society was on telegraphs.'
                },
                { id: 'aurora', name: 'Auroras explained', emoji: '🌌',
                  body: 'When solar-wind particles enter Earth\'s upper atmosphere along magnetic field lines (mostly near the poles), they collide with oxygen + nitrogen atoms + excite them. The atoms emit light at specific wavelengths as they relax: GREEN aurora is excited atomic oxygen at ~100 km altitude (557.7 nm wavelength); RED aurora is excited atomic oxygen at ~250 km (630 nm, lower density + slower decay); BLUE + PURPLE are ionized nitrogen at lower altitudes. The aurora oval expands during geomagnetic storms, pushing visibility to mid-latitudes. Maine sees aurora on average a few nights a year; during the May 10-11 2024 G5 storm, aurora was visible across most of the continental US + parts of Mexico, the strongest such event in 20 years.',
                  caveat: 'Some popular media calls aurora "the lights of the gods" or "souls of the departed." Indigenous cultures around the Arctic have their own complex aurora stories — Inuit, Sámi, Tlingit, and many Wabanaki traditions all include aurora lore. Respect those traditions for what they are: human meaning-making about a genuinely beautiful natural phenomenon. The physics is true; the cultural meaning is also true on its own terms.'
                },
                { id: 'fusion', name: 'How the Sun shines', emoji: '🔥',
                  body: 'The Sun is a ~4.6-billion-year-old G-type main-sequence star. Its core (~15 million K, ~150 g/cm³) fuses hydrogen into helium via the proton-proton (pp) chain, converting ~4 million tons of mass into energy EVERY SECOND (E = mc², so 4 million tons × c² ~ 3.8 × 10²⁶ joules/sec). That energy diffuses through the radiative zone (200,000 years for a photon to make its way out — the random walk through hot dense plasma is incredibly slow), reaches the convective zone (last 30% of the radius), boils up to the photosphere, and escapes as the sunlight we see. The Sun has fused about half of its core hydrogen so far; it will continue main-sequence burning for another ~5 billion years before evolving into a red giant + eventually a white dwarf.',
                  caveat: 'The "150 g/cm³ core density" is greater than lead, but the temperature is so high the matter behaves as plasma, not solid. The pp chain is dominant in the Sun; heavier stars use the CNO cycle. Neutrinos from these reactions reach Earth in 8 minutes (light-travel time); we detect them daily with neutrino observatories like Super-Kamiokande + SNO + IceCube. The "solar neutrino problem" of the 1990s (we detected fewer than predicted) was solved when neutrino oscillations were discovered (Takaaki Kajita + Arthur McDonald, 2015 Nobel).'
                }
              ];
              var sel = d.selectedSun || 'cycle';
              var topic = SUN_TOPICS.find(function(t) { return t.id === sel; }) || SUN_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'Our nearest star is also our most-studied. Solar activity follows an 11-year cycle, with flares + coronal mass ejections + space-weather impacts on Earth that affect satellites, power grids, GPS, aviation, and radio communications. As we put more critical infrastructure into space + into vulnerable terrestrial networks, understanding the Sun has shifted from astronomy curiosity to operational necessity.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  SUN_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedSun: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#f97316' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #f97316' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#fdba74', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'Honest framing: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'Safety reminder: '),
                  'NEVER look directly at the Sun without certified solar-eclipse glasses (ISO 12312-2) or a solar-filtered telescope. Even brief exposure can permanently damage your retina. Sunspots ARE visible through proper solar filters; many citizen-science projects (like the Sunspotter or AAVSO Solar Section) let you participate in solar observation safely.'
                )
              );
            })(),
            '#f97316'
          ),

          // ─── Stellar nucleosynthesis (origin of elements) ───────
          sectionCard('⚛️ Where every atom in your body came from',
            (function() {
              var NS_TOPICS = [
                { id: 'overview', name: 'Why this matters', emoji: '🌟',
                  body: 'Every atom in your body other than hydrogen was forged inside a star. The calcium in your bones, the iron in your blood, the carbon + nitrogen + oxygen in your DNA, the iodine in your thyroid, the zinc in your hand — all of it was assembled inside one or more stars, scattered into space by stellar death, and eventually incorporated into the Solar System + into you. The original "star stuff" framing by Carl Sagan is not poetic; it is biochemistry. Understanding stellar nucleosynthesis is understanding where you, every element of your home, and every element of every world we know about, originally came from.',
                  caveat: 'The full story took ~13.8 billion years to play out, with different elements coming from different stellar processes at different times. No single "type" of nucleosynthesis made everything. Tracing a specific atom\'s origin requires knowing not just what physics formed it but which population of stars at which time + where they ended up.'
                },
                { id: 'bbn', name: 'Big Bang nucleosynthesis (~3 minutes)', emoji: '💥',
                  body: 'In the first ~3 minutes after the Big Bang, the universe was a hot, dense plasma of protons + neutrons + electrons + photons + neutrinos. As it cooled below ~10⁹ K, protons + neutrons combined into deuterium (²H, one proton + one neutron), then helium-4 (4 nucleons), and trace amounts of lithium-7 + helium-3. The neutron-to-proton ratio when the temperature dropped below the freeze-out point determined the final hydrogen/helium ratio — about 75% H + 25% He by mass. After ~20 minutes the universe was too cool + diffuse for fusion to continue. The remaining elements had to wait for stars.',
                  caveat: 'Big Bang nucleosynthesis (BBN) predictions match observation to ~5% for helium-4 (the easiest to measure) but a known mystery exists for lithium-7: theory predicts ~3× more than is observed in old halo stars (the "cosmological lithium problem"). The discrepancy may be a stellar-mixing effect, an issue in nuclear cross-section measurements, or a hint of new physics. Still unresolved.'
                },
                { id: 'main', name: 'Main-sequence stars (pp + CNO)', emoji: '☀️',
                  body: 'Ordinary stars fuse hydrogen into helium in their cores. Sun-like stars (mass <1.3 M_sun) use the PROTON-PROTON (pp) chain: four protons → one helium-4 + 2 positrons + 2 neutrinos + energy. This is what powers our Sun. Heavier stars (>1.3 M_sun) use the CNO cycle: carbon, nitrogen, oxygen act as catalysts in a cyclic process that net converts hydrogen to helium more rapidly at higher temperatures. Both processes produce helium-4 + release ~7 MeV of energy per nucleon (the strongest binding-energy step in fusion). Stars spend ~90% of their visible life in this main-sequence phase.',
                  caveat: 'Main-sequence fusion does not produce significant amounts of any other elements. The Sun has been fusing for ~4.6 billion years + the only elements it has measurably increased are helium + (in CNO-cycle stars) some carbon/nitrogen redistribution. Everything heavier comes from LATER stellar processes.'
                },
                { id: 'giants', name: 'Red giants + AGB stars', emoji: '🔴',
                  body: 'When a star\'s core runs out of hydrogen, the core contracts + heats up, while the outer envelope expands + cools (a red giant). Helium fusion begins in the core (3 helium-4 → carbon-12 via the triple-alpha process, requiring a key resonance Fred Hoyle predicted in 1953 — the "Hoyle state"). Beyond carbon, helium captures continue to produce oxygen-16, neon-20, magnesium-24. AGB (Asymptotic Giant Branch) stars also drive the s-process — slow neutron capture — building up about half the heavy elements past iron (zirconium, barium, lead). Material from the outer envelope is shed via stellar winds during the red-giant + AGB phases, returning enriched material to the interstellar medium.',
                  caveat: 'AGB stars contribute most of the carbon + nitrogen + s-process heavy elements in the universe. The Sun + Solar System inherited about half its carbon from AGB stars + about half from supernovae. Without the Hoyle resonance, carbon-based life would be impossible — a fine-tuning observation Hoyle himself remarked on extensively.'
                },
                { id: 'super', name: 'Core-collapse supernovae (Type II)', emoji: '💫',
                  body: 'Stars more massive than ~8 M_sun continue fusing past carbon into neon, magnesium, silicon, then silicon into iron-56. Iron-56 has the highest binding energy per nucleon of any element — beyond iron, fusion REQUIRES energy rather than releasing it. When an iron core grows beyond ~1.4 M_sun (the Chandrasekhar mass), electron degeneracy pressure can no longer support it. The core collapses in less than a second, electrons + protons combine into neutrons (with neutrino emission), and a neutron star (or black hole) forms. The released gravitational energy + neutrino pressure drives a shockwave outward, blowing off the rest of the star as a Type-II supernova. In the explosion, the r-process — rapid neutron capture — creates about half the elements heavier than iron, including most uranium, thorium, and gold.',
                  caveat: 'Supernovae are the dominant source of oxygen, neon, magnesium, silicon, sulfur, calcium, iron — the bulk of the heavier elements that make up rocky planets + biology. The galactic frequency is ~1-2 per century per Milky-Way-sized galaxy; the last observable one in our galaxy was Kepler\'s in 1604. SN 1987A in the Large Magellanic Cloud was the closest naked-eye supernova in 400 years.'
                },
                { id: 'iaSN', name: 'Type Ia supernovae', emoji: '🌟',
                  body: 'A different kind of supernova: a white dwarf in a binary system accretes matter from its companion until it nears the Chandrasekhar mass, then ignites runaway thermonuclear fusion of its carbon + oxygen core. The entire star is consumed in seconds. Because the trigger mass is the same (~1.4 M_sun) and the physics is similar, Type Ia supernovae have nearly standard luminosity — they are the "standard candles" used to measure the cosmic distance scale + discover dark energy. Type Ia events are the dominant source of IRON-PEAK elements (iron, nickel, cobalt) in the universe; the iron in your blood is mostly Type-Ia-supernova iron.',
                  caveat: 'The precise progenitor system of Type Ia supernovae is still debated — single-degenerate (white dwarf + non-degenerate companion) vs double-degenerate (white-dwarf merger). Both probably occur. The fact that they still appear nearly standard despite this mixture is one of nature\'s slightly fortunate accidents for cosmology.'
                },
                { id: 'merger', name: 'Neutron-star mergers', emoji: '✨',
                  body: 'When two neutron stars in a binary system spiral together and merge, the violent collision ejects neutron-rich material that undergoes RAPID r-process nucleosynthesis. The kilonova GW170817 (2017, see the Gravitational Waves section in the Galaxies tab) was the first direct observation: spectroscopy of the explosion showed signatures of newly-formed gold, platinum, and other heavy elements. This single event probably produced ~100 Earth-masses of gold + similar amounts of platinum. Neutron-star mergers are now believed to be a MAJOR source of r-process elements, possibly the dominant source — supernovae alone may not be able to produce enough.',
                  caveat: 'The relative contribution of supernovae vs neutron-star mergers to r-process nucleosynthesis is still being worked out. Galactic chemical-evolution models with only supernovae underpredict observed europium abundances; adding neutron-star mergers fits better. The picture is becoming clearer with each multi-messenger detection.'
                },
                { id: 'spallation', name: 'Cosmic-ray spallation', emoji: '⚛️',
                  body: 'A few light elements — lithium, beryllium, boron — are produced in TRACE amounts by Big Bang nucleosynthesis but in much LARGER amounts by cosmic-ray spallation: high-energy cosmic-ray particles (mostly protons + alpha particles) crashing into interstellar atoms (C, N, O) + breaking them into smaller nuclei. This is essentially the ONLY significant source of beryllium-9, boron-10, and boron-11 in the universe. The boron in your bones, the lithium in mood-stabilizer medications, the beryllium in some metal alloys — all originally formed when cosmic rays hit interstellar gas billions of years ago.',
                  caveat: 'Cosmic-ray spallation produces only trace amounts of any element — Li/Be/B are among the rarest in the universe. They survive in trace amounts but stellar interiors quickly destroy them; that\'s why solar lithium is so much lower than the primordial lithium abundance. The science of "Li/Be/B production" is sometimes called "light-element nucleosynthesis" + has its own specialty literature.'
                },
                { id: 'maine', name: 'Reading the abundance map', emoji: '📊',
                  body: 'The relative abundances of elements in the universe — about 75% hydrogen + 24% helium + 1% everything heavier ("metals" in astronomical jargon) — reflect this cascade of processes. Each element\'s relative abundance is a signature of how + where + when it was made. Iron is common because supernovae make a lot of it. Gold is rare because the r-process is rare. Lithium is rare because stars destroy it. By measuring stellar spectra at different distances + ages, astronomers can read the galactic chemical evolution: stars formed in the early universe are "metal-poor" (~1/1000 solar metallicity); newer stars (like the Sun) carry the accumulated nucleosynthesis of ~9 billion years of previous stellar generations. Population III stars (the very first generation, made from pure H + He) have never been directly observed; finding one would be a major discovery.',
                  caveat: 'The "metal" jargon is unusual. To an astronomer, carbon + nitrogen + oxygen are "metals." This causes some confusion with chemistry students. The convention reflects how stellar spectroscopy was first developed — bulk classification by hydrogen-helium vs everything-else.'
                }
              ];
              var sel = d.selectedNS || 'overview';
              var topic = NS_TOPICS.find(function(t) { return t.id === sel; }) || NS_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  '"We are made of star stuff" is biochemistry, not poetry. Every atom heavier than hydrogen in your body came from a specific stellar process — most of it from inside long-dead stars. The cascade of nuclear reactions that built the periodic table happened in roughly five distinct settings, each producing different elements, over billions of years. Tracing it is one of the great achievements of 20th-century astrophysics.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  NS_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedNS: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#ec4899' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #ec4899' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#f9a8d4', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'Honest framing: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, 'A specific atom\'s journey: '),
                  'A single iron atom in your hemoglobin formed either (a) in the silicon-burning shell of a star >8 M_sun, ejected by a Type-II supernova ~6-10 billion years ago, OR (b) in a Type-Ia supernova when a white dwarf detonated. It then drifted through the interstellar medium for hundreds of millions of years, eventually condensed into the cloud that became our Solar System ~4.6 billion years ago, was incorporated into Earth\'s core during planetary differentiation, was brought near the surface by volcanism + plate tectonics, was eaten by a plant + a cow + you, and is now carrying oxygen between your cells. The "you are stardust" line is literally + scientifically true.'
                )
              );
            })(),
            '#ec4899'
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // GALAXIES & SCALE
      // ──────────────────────────────────────────────────────────────
      function renderGalaxies() {
        return h('div', { style: { padding: 16 } },
          sectionCard('🌌 Our Milky Way',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'A barred spiral galaxy, about 100,000 light-years across, containing 100-400 billion stars and an unknown number of planets (probably trillions). Our Sun is about 26,000 light-years from the center, in a quiet spiral arm called the Orion Arm. The supermassive black hole at the center (Sagittarius A*) is 4 million times the mass of the Sun. The Milky Way is one of about 2 trillion galaxies in the observable universe.'
            )
          ),

          sectionCard('🪐 The Local Group',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'Our gravitational neighborhood. About 80 galaxies including the Milky Way, the Andromeda Galaxy (M31), the Triangulum Galaxy (M33), the Magellanic Clouds (visible from the Southern Hemisphere), and many small dwarf galaxies. The Local Group is about 10 million light-years across. Andromeda is approaching us at 110 km/s and will merge with the Milky Way in about 4.5 billion years.'
            )
          ),

          sectionCard('🌠 Types of galaxies',
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              [
                { name: 'Spiral', desc: 'Like the Milky Way and Andromeda. Spiral arms of gas, dust, and young stars wrapping around a central bulge. Active star formation continues in the arms.' },
                { name: 'Elliptical', desc: 'Football-shaped or round. Old, red stars; little star formation. Often the result of galaxy mergers. The largest galaxies in the universe are giant ellipticals.' },
                { name: 'Irregular', desc: 'No clear shape. Often dwarf galaxies near larger ones (like the Magellanic Clouds), or galaxies whose shape has been disrupted by a recent merger.' },
                { name: 'Active galactic nuclei (quasars)', desc: 'Galaxies with a supermassive black hole actively eating gas, releasing enormous energy. Quasars are the brightest things in the universe.' }
              ].map(function(g, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } }, g.name),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, g.desc)
                );
              })
            )
          ),

          sectionCard('📏 Scale of the universe in one paragraph',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              'Light from the Sun reaches us in 8 minutes. From Proxima Centauri, in 4.24 years. From the Andromeda Galaxy, 2.5 million years. From the most distant galaxies we can see, over 13 billion years. The observable universe is about 93 billion light-years across (yes, more than the age of the universe in light-years, because space itself has been expanding). Beyond what we can see, the universe may be much larger, or even infinite.'
            )
          ),

          sectionCard('🔭 Gravitational lensing — Einstein\'s curve-light prediction',
            (function() {
              var mass = d.lensMass != null ? d.lensMass : 50;  // arbitrary units
              var offset = d.lensOffset != null ? d.lensOffset : 0;  // 0 = perfect alignment (Einstein ring)
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Light follows curves in spacetime. Einstein\'s 1915 general relativity predicted that mass would bend the path of light passing nearby — so a massive object can act like a lens, distorting the appearance of objects behind it. Confirmed in 1919 by Eddington during a solar eclipse: stars near the Sun\'s edge appeared shifted by the predicted amount. The discovery made Einstein a global celebrity.'
                ),

                // Interactive SVG
                (function() {
                  var svgW = 600, svgH = 220;
                  var cx = svgW / 2, cy = svgH / 2;
                  var lensSize = 8 + mass / 4;
                  // When perfectly aligned (offset=0), bg source appears as a ring (Einstein ring)
                  // When slightly offset, splits into two arcs
                  // When very offset, two separated images
                  var ringR = lensSize * 2 + mass / 6;
                  return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'lensTitle lensDesc' },
                    h('title', { id: 'lensTitle' }, 'Gravitational lensing diagram'),
                    h('desc', { id: 'lensDesc' }, 'A massive object (galaxy cluster) lies between us and a distant background galaxy. Its gravity bends the light, producing ' + (Math.abs(offset) < 5 ? 'a complete Einstein ring' : Math.abs(offset) < 25 ? 'distorted arcs' : 'two separated images') + '.'),
                    // Background starfield
                    h('rect', { x: 0, y: 0, width: svgW, height: svgH, fill: '#000' }),
                    [50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550].map(function(x, i) {
                      var ys = [30, 50, 80, 130, 170, 200, 25, 90, 140, 190, 60][i];
                      return h('circle', { key: 'bg' + i, cx: x, cy: ys, r: 1, fill: '#fde68a', opacity: 0.6 });
                    }),
                    // Lensed images (depending on offset)
                    (function() {
                      if (Math.abs(offset) < 5) {
                        // Einstein ring
                        return h('g', null,
                          h('circle', { cx: cx, cy: cy, r: ringR, fill: 'none', stroke: '#7dd3fc', strokeWidth: 4, opacity: 0.85 }),
                          h('text', { x: cx, y: cy + ringR + 18, textAnchor: 'middle', fill: '#7dd3fc', fontSize: 11, fontWeight: 700 }, 'Einstein ring')
                        );
                      } else if (Math.abs(offset) < 25) {
                        // Arcs
                        var arcOffset = offset / 4;
                        return h('g', null,
                          h('path', { d: 'M ' + (cx - ringR + arcOffset) + ',' + cy + ' A ' + ringR + ',' + ringR + ' 0 0,1 ' + (cx + ringR - arcOffset) + ',' + cy, fill: 'none', stroke: '#7dd3fc', strokeWidth: 4, opacity: 0.85 }),
                          h('path', { d: 'M ' + (cx - ringR + arcOffset) + ',' + cy + ' A ' + ringR + ',' + ringR + ' 0 0,0 ' + (cx + ringR - arcOffset) + ',' + cy, fill: 'none', stroke: '#7dd3fc', strokeWidth: 4, opacity: 0.85 }),
                          h('text', { x: cx, y: svgH - 16, textAnchor: 'middle', fill: '#7dd3fc', fontSize: 11, fontWeight: 700 }, 'Lensed arcs')
                        );
                      } else {
                        // Two separated images
                        return h('g', null,
                          h('ellipse', { cx: cx - ringR + offset / 2, cy: cy, rx: 8, ry: 12, fill: '#7dd3fc', opacity: 0.9 }),
                          h('ellipse', { cx: cx + ringR - offset / 2, cy: cy, rx: 8, ry: 12, fill: '#7dd3fc', opacity: 0.9 }),
                          h('text', { x: cx - 100, y: cy + 25, textAnchor: 'middle', fill: '#7dd3fc', fontSize: 10 }, 'Image 1'),
                          h('text', { x: cx + 100, y: cy + 25, textAnchor: 'middle', fill: '#7dd3fc', fontSize: 10 }, 'Image 2')
                        );
                      }
                    })(),
                    // The lens (massive object — galaxy cluster as orange blob)
                    h('circle', { cx: cx, cy: cy, r: lensSize, fill: '#f97316', opacity: 0.9, stroke: '#fbbf24', strokeWidth: 1 }),
                    // Spacetime distortion grid
                    [-3, -2, -1, 1, 2, 3].map(function(r, i) {
                      var rad = lensSize + r * 20 + mass / 5;
                      return h('circle', { key: 'g' + i, cx: cx, cy: cy, r: rad, fill: 'none', stroke: '#fbbf24', strokeWidth: 0.5, strokeDasharray: '2 4', opacity: 0.4 });
                    }),
                    h('text', { x: cx, y: cy + lensSize + 22, textAnchor: 'middle', fill: '#fbbf24', fontSize: 11, fontWeight: 700 }, 'Lens (massive galaxy cluster)'),
                    // True position of background source (shown as dim cross)
                    h('g', { transform: 'translate(' + (cx + offset) + ',' + (cy + 60) + ')' },
                      h('line', { x1: -5, y1: 0, x2: 5, y2: 0, stroke: '#94a3b8', strokeWidth: 1 }),
                      h('line', { x1: 0, y1: -5, x2: 0, y2: 5, stroke: '#94a3b8', strokeWidth: 1 }),
                      h('text', { x: 0, y: 18, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'true source position')
                    )
                  );
                })(),

                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12, marginBottom: 12 } },
                  [
                    { label: 'Lens mass (×10¹⁴ M☉)', value: mass, min: 10, max: 200, step: 5, key: 'lensMass' },
                    { label: 'Source offset (alignment)', value: offset, min: -80, max: 80, step: 2, key: 'lensOffset' }
                  ].map(function(s, i) {
                    return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                        h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                        h('span', { style: { fontSize: 13, color: '#fbbf24', fontWeight: 800 } }, s.value)
                      ),
                      h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                        onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                        'aria-label': s.label,
                        style: { width: '100%', accentColor: '#fbbf24' }
                      })
                    );
                  })
                ),

                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'What we DO with lensing: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Weigh galaxy clusters: '), 'The amount of distortion tells us how much mass is doing the bending. Clusters consistently show more lensing than visible matter alone explains — the strongest direct evidence for dark matter.'),
                    h('li', null, h('strong', null, 'Magnify the distant universe: '), 'A foreground galaxy cluster magnifies background galaxies behind it — sometimes by 30× or more. Hubble + JWST routinely point at "lensing clusters" (Abell 1689, MACS J0416) to see otherwise-too-faint objects.'),
                    h('li', null, h('strong', null, 'Find exoplanets: '), 'Microlensing — a star with a planet passing in front of a distant star slightly distorts the light. The planet causes a brief extra blip. Detects planets far from their stars + even rogue (unbound) planets.'),
                    h('li', null, h('strong', null, 'Test general relativity: '), 'Every observed lens system is a test of Einstein\'s theory. So far it has passed every test, including in extreme regimes (LIGO BH mergers, EHT BH images).')
                  )
                ),

                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'The 1919 confirmation: '),
                  'Arthur Eddington led an expedition to the island of Príncipe to observe a total solar eclipse on May 29 1919. Without the Sun\'s glare, stars near its edge could be photographed. The shift in their apparent positions matched Einstein\'s prediction (~1.75 arcseconds at the solar limb), not Newton\'s (~0.87 arcseconds). News went global; on November 7 1919 the Times of London announced "Revolution in Science." Einstein went from physicist to public figure overnight.'
                )
              );
            })(),
            '#fbbf24'
          ),

          sectionCard('💥 The Big Bang + cosmic microwave background',
            (function() {
              var ERAS = [
                { time: '10⁻⁴³ s', name: 'Planck epoch', desc: 'Earlier than this, our physics breaks down: gravity and quantum mechanics are not yet unified. We do not know what happened here.', color: '#1e293b' },
                { time: '10⁻³⁶ to 10⁻³² s', name: 'Inflation', desc: 'The universe expanded faster than the speed of light by a factor of ~10²⁶. Smoothed out the early universe. Solves the "horizon problem" (why opposite sides of the sky have the same temperature). Quantum fluctuations during inflation became the seeds of all later structure.', color: '#7c3aed' },
                { time: '10⁻⁶ s', name: 'Quark-gluon plasma', desc: 'Free quarks and gluons in a hot dense soup. Recreated for tiny fractions of a second in particle accelerators (RHIC, LHC).', color: '#a855f7' },
                { time: '1 second', name: 'Hadron + neutrino freeze-out', desc: 'Quarks combine into protons + neutrons. Neutrinos decouple from matter and stream freely. These neutrinos still exist today as the "cosmic neutrino background" — at about 1.95 K. Not yet detected directly.', color: '#0ea5e9' },
                { time: '3 minutes', name: 'Big Bang nucleosynthesis', desc: 'The universe is finally cool enough (~1 billion K) for protons + neutrons to fuse without immediately being broken up again. Hydrogen, helium-4 (~25% by mass), and trace amounts of deuterium, helium-3, lithium-7 form. ALL the heavier elements come later from stars + supernovae.', color: '#fbbf24' },
                { time: '380,000 years', name: 'Recombination + CMB', desc: 'The universe finally cools below 3,000 K. Electrons combine with nuclei to form neutral atoms. Photons that had been ping-ponging through the plasma can now travel freely. Those photons are the cosmic microwave background — the oldest light we can see, redshifted by expansion to 2.725 K today.', color: '#fbbf24' },
                { time: '~100-200 million years', name: 'First stars', desc: 'The first stars ("Population III") form from primordial hydrogen + helium. Massive, hot, short-lived. End as supernovae, scattering the first heavier elements. We have not yet directly observed Population III stars — they are a key JWST target.', color: '#ef4444' },
                { time: '~1 billion years', name: 'First galaxies', desc: 'Small galaxies form from the early stars + dark-matter halos. Mergers + accretion grow them. JWST is now imaging galaxies older than 13.4 billion years (formed within the first ~400 million years of the universe).', color: '#22c55e' },
                { time: '9 billion years', name: 'Solar System forms', desc: '4.6 billion years ago. Earth assembles from the dust + gas left over by previous generations of stars. Every heavy atom in your body was forged in stars that lived + died before our Sun even existed.', color: '#10b981' },
                { time: '13.8 billion years', name: 'Now', desc: 'The universe is still expanding, accelerating (due to dark energy). The cosmic microwave background still surrounds us. About 4.9% ordinary matter, 26.8% dark matter, 68.3% dark energy by content.', color: '#94a3b8' }
              ];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'The Big Bang theory says the universe began ~13.8 billion years ago as something incredibly hot + dense + small, and has been expanding + cooling ever since. The evidence is overwhelming: the cosmic microwave background, the abundance of light elements, the expansion of space (Hubble), and the cosmic structure we observe. It does NOT say the universe began from "nothing" — physics has no opinion on what came before the Planck epoch.'
                ),

                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                  ERAS.map(function(e, i) {
                    return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, padding: 8, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + e.color } },
                      h('div', { style: { fontSize: 11.5, fontWeight: 800, color: e.color, paddingTop: 2, fontFamily: 'ui-monospace, monospace' } }, e.time),
                      h('div', null,
                        h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 } }, e.name),
                        h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55 } }, e.desc)
                      )
                    );
                  })
                ),

                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'The CMB is everywhere. '),
                  'About 1% of the static on an old analog TV channel comes from the cosmic microwave background. Penzias + Wilson stumbled into it in 1964 looking for radio sources, won the 1978 Nobel. COBE (1992) showed it has the perfect blackbody spectrum predicted by Big Bang theory. WMAP (2003) + Planck (2013) mapped tiny temperature fluctuations ±18 microkelvin — the seeds that grew into galaxies + clusters. All four are foundational tools of modern cosmology.'
                ),

                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Dark matter + dark energy: '),
                  'Of the universe\'s total energy budget, only ~5% is the ordinary matter we know about — protons + neutrons + electrons + neutrinos. About 27% is DARK MATTER (we see its gravitational effects on galaxies + galaxy clusters; we do not know what it is — leading candidates are WIMPs, axions, or primordial black holes). About 68% is DARK ENERGY (driving the accelerated expansion of the universe, discovered 1998 by tracking Type Ia supernovae; we have NO theory of what it is). The two together make modern cosmology a field with enormous open questions.'
                )
              );
            })(),
            '#fbbf24'
          ),

          sectionCard('🪜 The cosmic distance ladder — how do we know?',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'No single method measures distances across the universe. Astronomers use a series of overlapping methods, each calibrated by the rung below it. Each successive rung lets us measure farther. If any rung were wrong, every farther distance would be off too — which is why this work is constantly cross-checked.'
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                [
                  { rung: '1', name: 'Radar + lasers', range: 'Solar system',
                    how: 'Bounce radar off planets + asteroids; bounce laser light off retroreflectors on the Moon (left by Apollo astronauts). Time the round trip; multiply by speed of light. Earth-Moon distance known to within ~3 cm.',
                    why: 'Direct measurement. The most precise distances in astronomy.',
                    color: '#22c55e' },
                  { rung: '2', name: 'Stellar parallax', range: '~1,000 light-years (Gaia: ~30,000+ ly)',
                    how: 'A nearby star appears to shift slightly against distant background stars as Earth orbits the Sun. The half-angle of that shift is the parallax. Distance (parsecs) = 1 / parallax (arcseconds). 1 parsec = 3.26 light-years (literally, "parallax of one arc-second").',
                    why: 'Pure geometry; no astrophysics needed. ESA\'s Gaia satellite is measuring parallaxes for ~1 billion stars.',
                    color: '#fbbf24' },
                  { rung: '3', name: 'Main-sequence fitting', range: '~100,000 light-years',
                    how: 'Plot the star cluster on an HR diagram. Compare the apparent brightness of its main sequence to the absolute brightness of a calibrated nearby main sequence. The brightness offset gives distance.',
                    why: 'Calibrated by parallax. Lets us measure distances to star clusters in our own galaxy.',
                    color: '#fbbf24' },
                  { rung: '4', name: 'Cepheid variables', range: '~100 million light-years',
                    how: 'Cepheids are stars that pulse brighter + dimmer on a regular period. Henrietta Leavitt discovered in 1908 that the pulsation period is directly tied to absolute brightness — a "period-luminosity relation." Measure the period (timing the pulses) and you know absolute brightness. Compare to apparent brightness to get distance.',
                    why: 'The rung that let Edwin Hubble (1924) prove that the Andromeda "nebula" was actually another galaxy at 2.5 million ly. Calibrated by parallax + main-sequence fitting.',
                    color: '#fb923c' },
                  { rung: '5', name: 'Type Ia supernovae', range: '~10 billion light-years',
                    how: 'When a white dwarf in a binary system grows past the Chandrasekhar limit (1.4 solar masses), it explodes. These supernovae all happen at very similar peak brightness — they\'re "standardizable candles." Calibrate by finding Type Ia supernovae in galaxies whose distances we know from Cepheids; then apply to far more distant galaxies.',
                    why: 'How the 1998 acceleration-of-the-universe was discovered (the discovery that led to "dark energy"). Calibrated by Cepheids.',
                    color: '#ef4444' },
                  { rung: '6', name: 'Hubble\'s law (redshift)', range: 'Most of the observable universe',
                    how: 'Distant galaxies are receding from us; their light is stretched ("redshifted") in proportion to distance. Distance = redshift × (speed of light) / Hubble constant H₀. Current best value of H₀ ≈ 67-73 km/s/Mpc.',
                    why: 'Calibrated by Type Ia supernovae. The current ~9% discrepancy between H₀ measured locally vs from the cosmic microwave background ("Hubble tension") is one of the biggest open questions in cosmology.',
                    color: '#a855f7' }
                ].map(function(r, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '4px solid ' + r.color } },
                    h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
                      h('div', { style: { fontSize: 18, fontWeight: 900, color: r.color, minWidth: 22 } }, r.rung),
                      h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', flex: 1 } }, r.name),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, 'range: ' + r.range)
                    ),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.55, marginBottom: 4 } },
                      h('strong', { style: { color: r.color } }, 'How: '), r.how
                    ),
                    h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.5, fontStyle: 'italic' } },
                      h('strong', null, 'Why we trust it: '), r.why
                    )
                  );
                })
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                h('strong', null, 'Henrietta Leavitt: '),
                'discovered the Cepheid period-luminosity relation while working as a "computer" at Harvard College Observatory (1908) — measuring photographic plates by hand. Without her work, Hubble could not have proved the universe contained other galaxies, and we would have no rung 4. She died in 1921, three years before Hubble\'s announcement; she was never nominated for a Nobel Prize, which she likely would have shared.'
              )
            ),
            '#fbbf24'
          ),

          // ─── Dark matter + dark energy ──────────────────────────
          sectionCard('🌑 Dark matter + dark energy — the 95% we cannot see',
            (function() {
              var DM_TOPICS = [
                { id: 'rotation', name: 'Galaxy rotation curves (Rubin)', emoji: '🌀',
                  body: 'Vera Rubin + Kent Ford (1970s) measured how fast stars orbit at different distances from the centers of spiral galaxies. Newtonian gravity predicts: the further out, the slower the orbit (like outer planets in the Solar System). Instead they found: orbital speeds stay flat or rise even at huge radii. The only explanations are (a) there is far more mass than we can see, distributed in a roughly spherical "halo" extending well beyond the visible disk, or (b) gravity itself behaves differently on galactic scales. The first option, dark matter, fits more data with fewer ad-hoc fixes.',
                  caveat: 'Rubin was never awarded a Nobel; she died in 2016. The discovery is now considered one of the foundational observations of modern cosmology. Earlier (1933) Fritz Zwicky had already inferred missing mass in galaxy clusters from the Coma Cluster\'s velocity dispersion, calling it dunkle Materie ("dark matter") — but his work was largely ignored for 40 years.'
                },
                { id: 'lensing', name: 'Gravitational lensing maps', emoji: '🔭',
                  body: 'Mass bends light (Einstein, predicted 1915, confirmed Eddington 1919 at a solar eclipse). On large scales, foreground galaxy clusters bend light from background galaxies into arcs + rings. By mapping the distortion pattern statistically across thousands of background sources (weak lensing), we can reconstruct where the mass is — and it does NOT trace the visible galaxies. The Bullet Cluster (1E 0657-558, observed 2006) is the cleanest example: two clusters that collided. The hot gas (most of the normal matter, traceable in X-ray) lags behind, but the lensing mass continues straight through. The mass is somewhere the visible matter is not.',
                  caveat: 'The Bullet Cluster is widely cited as a "smoking gun" for dark matter, ruling out simple modified-gravity theories. More sophisticated modified-gravity models can still fit it, but require their own dark-matter-like ingredients, which weakens the parsimony argument.'
                },
                { id: 'cmb', name: 'CMB acoustic peaks', emoji: '📡',
                  body: 'The cosmic microwave background has tiny temperature fluctuations (~1 part in 100,000) — and their statistical pattern (the angular power spectrum, mapped by WMAP + Planck) shows a series of peaks. The relative heights of those peaks encode the recipe of the early universe. The fit gives: ~5% ordinary (baryonic) matter, ~27% dark matter, ~68% dark energy. This is independent of the galaxy + cluster evidence and agrees almost exactly. Three completely different observations (rotation, lensing, CMB) converge on the same answer.',
                  caveat: 'The CMB recipe is for the early universe (380,000 years after the Big Bang). It does not directly tell us what dark matter IS — only that something gravitating but not radiating must be there. The particle nature is still unknown.'
                },
                { id: 'candidates', name: 'Candidate particles', emoji: '🧪',
                  body: 'WIMPs (weakly interacting massive particles) were the favored candidate for ~30 years: predicted by supersymmetric extensions of the Standard Model, with the right mass to give the observed dark-matter density via the "WIMP miracle." Direct detection experiments (XENONnT, LZ, PandaX) have ruled out most of the favored WIMP parameter space, weakening the case. Axions (ultralight bosons proposed for an unrelated problem, the strong-CP problem) are now a leading candidate, hunted by ADMX + HAYSTAC. Other possibilities: sterile neutrinos, primordial black holes (largely constrained by microlensing surveys), self-interacting dark matter. None confirmed yet.',
                  caveat: 'After 40+ years and billions of dollars, NO direct detection of any dark-matter particle exists. This is genuinely puzzling. Some physicists take it as evidence we are looking in the wrong place; others as evidence the cross-section is just smaller than current sensitivity. Honest answer: we don\'t know.'
                },
                { id: 'darkenergy', name: 'Dark energy + accelerating expansion', emoji: '⚡',
                  body: 'In 1998, two teams (Perlmutter; Schmidt + Riess) measured Type Ia supernovae at high redshift and found the universe is not just expanding — its expansion is ACCELERATING. They expected gravity from matter to slow it down, but distant supernovae were fainter (further) than expected. Something is pushing space apart. Einstein\'s cosmological constant Λ (which he had introduced and then called his "greatest blunder") fits the data: a constant energy density of empty space itself, ~68% of the total energy budget. Nobel Prize 2011 to all three.',
                  caveat: 'Calling it dark "energy" is partly a placeholder. We don\'t know if it is genuinely a cosmological constant (Λ, with equation-of-state w = -1) or "quintessence" (a dynamical field with w slowly evolving). Current data slightly favors Λ but with large uncertainty. The DESI survey (2024 first results) hinted at evolving dark energy at ~2.6σ; not yet conclusive.'
                },
                { id: 'tension', name: 'Hubble tension — a real problem', emoji: '⚠️',
                  body: 'Two independent ways to measure the current expansion rate (Hubble constant, H₀) disagree. CMB + ΛCDM model gives ~67.4 km/s/Mpc (Planck 2018). The local distance ladder (Cepheids → Type Ia supernovae, SH0ES collaboration) gives ~73.0 km/s/Mpc. The discrepancy is ~9% and the statistical significance has grown to ~5σ. JWST measurements (2023-2024) confirm the local-ladder value with high precision, so it is not a Cepheid systematic. Either there is unrecognized systematic error somewhere, or our standard cosmological model (ΛCDM) is incomplete. Proposals: early dark energy, evolving Λ, sterile neutrinos, modified gravity — none yet decisive.',
                  caveat: 'The Hubble tension is currently the biggest unresolved problem in physical cosmology. It may turn out to be a measurement error. It may turn out to be the first crack in the standard model.'
                },
                { id: 'limits', name: 'What we honestly do not know', emoji: '❓',
                  body: '(a) What dark matter IS as a particle — 90+ years after Zwicky, no direct detection. (b) What dark energy IS — vacuum energy, dynamical field, or something else entirely. (c) Why the dark-energy density has the value it has — naive quantum field theory predicts a value 10⁵⁰ to 10¹²⁰ times larger (the "cosmological constant problem," sometimes called the worst prediction in physics). (d) Whether dark matter is really matter at all, or whether modified gravity (MOND, TeVeS, MOG) might explain the same data with different ingredients — most observations now strongly disfavor pure modified gravity, but it is not formally dead. (e) Whether the Hubble tension signals new physics or hidden systematics.',
                  caveat: 'Cosmology over the past 25 years has gotten extraordinarily precise (Planck mission, supernova surveys, galaxy redshift surveys, gravitational waves). And the more precise we get, the clearer it becomes that ~95% of the universe is something we do not understand. This is genuinely humbling.'
                }
              ];
              var sel = d.selectedDM || 'rotation';
              var topic = DM_TOPICS.find(function(t) { return t.id === sel; }) || DM_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'About 5% of the universe is ordinary matter (atoms, including everything we have ever directly studied — stars, planets, you). About 27% is "dark matter," some unknown particle that gravitates but does not emit, absorb, or scatter light at any wavelength we can detect. About 68% is "dark energy," whatever is causing space itself to expand faster + faster. The names are placeholders for our ignorance.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  DM_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedDM: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#a855f7' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #a855f7' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#e9d5ff', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'The honest framing: '),
                  'When you hear "scientists have proven dark matter," they have not. What is proven is that the data require SOMETHING we have not yet identified. That distinction is not a weakness of science — it is science working as designed, refusing to overstate what the evidence justifies.'
                )
              );
            })(),
            '#a855f7'
          ),

          // ─── Inflation + multiverse ──────────────────────────────
          sectionCard('🌌 Cosmic inflation + the multiverse question',
            (function() {
              var INF_TOPICS = [
                { id: 'whyneed', name: 'Why we needed inflation', emoji: '❓',
                  body: 'The Big Bang theory works beautifully — but in the 1970s it had three serious puzzles. (1) The horizon problem: the CMB is almost EXACTLY the same temperature in every direction (to 1 part in 100,000), even between regions that should never have been in causal contact at recombination. How could they reach the same temperature without ever exchanging heat? (2) The flatness problem: spacetime appears geometrically flat to extreme precision. Any tiny initial curvature would have grown over 13.8 billion years; the universe should be wildly curved by now, but it is not. (3) The monopole problem: Grand Unified Theories predict the early universe should have produced huge numbers of magnetic monopoles. We have never found one.',
                  caveat: 'Inflation was proposed to SOLVE these three problems with one mechanism. It does. But "explains the data" is not the same as "is established." The case for inflation is now strong, but the specific model is not.'
                },
                { id: 'guth', name: 'Guth\'s proposal (1980)', emoji: '💡',
                  body: 'Alan Guth (then a young postdoc at Cornell, working on monopoles) realized that if the very early universe went through a brief period of exponential expansion — doubling in size many dozens of times in a tiny fraction of a second — all three problems could be solved at once. The horizon problem: regions that look causally separated NOW were once in tiny causal contact BEFORE inflation, then stretched far apart. The flatness problem: exponential expansion smooths out any curvature, the way blowing up a balloon makes its surface look locally flat. The monopole problem: if monopoles formed before inflation, they got diluted to undetectable density. The brief moment of inflation needs to last from about 10⁻³⁶ to 10⁻³² seconds after t=0, expanding space by a factor of at least e^60 (~10²⁶).',
                  caveat: 'Guth\'s original model had a problem: it couldn\'t end gracefully. Andrei Linde + Andreas Albrecht + Paul Steinhardt (independently, 1982) proposed "new inflation" and then "slow-roll inflation" that fixed this. The family of working models is now large, which is part of inflation\'s critique: it can fit almost anything.'
                },
                { id: 'evidence', name: 'Evidence for inflation', emoji: '📊',
                  body: 'Inflation predicts specific signatures in the CMB. (1) Nearly scale-invariant primordial fluctuations: the same statistical pattern across all length scales. Planck measured the spectral index n_s = 0.965 ± 0.004, slightly less than 1, exactly as slow-roll inflation predicts (a perfectly scale-invariant spectrum would be 1.000). (2) Gaussian statistics: fluctuations follow a normal distribution. Observed. (3) A small amount of spatial curvature consistent with zero (flatness). Observed. (4) Adiabatic perturbations: matter + photons fluctuate together, not independently. Observed. (5) Tensor modes (primordial gravitational waves) — NOT yet observed, but their non-detection constrains many inflation models.',
                  caveat: 'BICEP2 announced detection of primordial gravitational waves in 2014 → would have been Nobel-level evidence for inflation. Within a year, the signal turned out to be Milky Way dust, not cosmological. CMB-S4 (proposed) and LiteBIRD (Japan, 2032 launch) aim to make the definitive measurement. If primordial B-modes are detected, inflation goes from "favored theory" to "confirmed."'
                },
                { id: 'eternal', name: 'Eternal inflation + the multiverse', emoji: '∞',
                  body: 'A very natural consequence of MOST working inflation models (Linde 1986): inflation never globally ends. In any region where inflation has stopped (like our observable universe, "bubble"), inflation is still going on in adjacent regions. The space between bubbles is expanding far faster than the bubbles themselves grow, so the bubbles never meet. Each bubble is its own universe with potentially different physical "constants" (electron mass, dark-energy density, fine-structure constant) — set randomly during the moment inflation ended in that bubble. This is one version of the "multiverse." String theory adds a separate version: the landscape of ~10⁵⁰⁰ possible vacuum states, each with different laws.',
                  caveat: 'The multiverse is a CONSEQUENCE of several otherwise-successful theories, not an independently-tested idea. Most physicists treat eternal inflation seriously. Whether other "bubbles" are observable in principle is debated; whether they exist at all if unobservable is a question some call physics and others call metaphysics. There is no consensus.'
                },
                { id: 'anthropic', name: 'The anthropic principle', emoji: '🪞',
                  body: 'The dark-energy density Λ has a value about 10⁻¹²² in natural units. If it were 10× larger, galaxies could never form (expansion outpaces gravity before structures collapse). If it were significantly negative, the universe would have re-collapsed long before stars existed. Why is Λ in the narrow window compatible with life? Steven Weinberg (1987) proposed an anthropic answer: IF there is a multiverse with random values of Λ, then we necessarily inhabit one of the rare bubbles where Λ is small enough for observers to exist. Weinberg even PREDICTED that Λ would be non-zero before the 1998 supernova discovery, on anthropic grounds. He was approximately right.',
                  caveat: 'Anthropic reasoning is controversial. Some physicists (Weinberg, Susskind, Linde, Rees) consider it legitimate physics if a multiverse exists. Others (Penrose, \'t Hooft, sometimes Hossenfelder) consider it untestable and therefore non-scientific. The disagreement is real and longstanding.'
                },
                { id: 'critics', name: 'The serious critique', emoji: '⚖️',
                  body: 'Paul Steinhardt (one of the original architects of inflation!) is now one of its loudest critics. His argument: inflation has become unfalsifiable. With enough free parameters and enough possible models, ANY observation can be accommodated. A theory that predicts every possible outcome predicts nothing. Steinhardt has proposed a cyclic / "bouncing" alternative in which the universe never had a Big Bang but instead bounces between contraction + expansion phases. Roger Penrose has proposed Conformal Cyclic Cosmology, a different bouncing model. These are minority positions, but they are not crank physics. The mainstream view treats inflation as the leading hypothesis; the alternatives remain on the table.',
                  caveat: 'The disagreement among serious cosmologists matters. Inflation is the most-tested, best-supported model of the very early universe. It is NOT the only model. Students should know that "Big Bang + inflation" is the standard story but that the inflation chapter remains under active scientific dispute, by some of its original architects.'
                },
                { id: 'limits', name: 'What we honestly cannot test', emoji: '🚧',
                  body: 'We cannot directly observe inflation itself; we observe its predicted CMB signatures. We cannot communicate with or measure other "bubble" universes, by construction (faster-than-light expansion separates them). We cannot test what happened BEFORE the Planck time (~10⁻⁴³ s), when known physics breaks down. We cannot derive the values of the constants from first principles in any known theory — we can only measure them. These are not gaps inflation needs to fix; they are limits on what physics can know at present. Quantum gravity, when it arrives, may move these limits. Or it may simply reveal new limits underneath.',
                  caveat: 'In every era of physics, some questions seemed permanently unanswerable until they weren\'t. Some never moved at all. We do not know in advance which category a question is in. The honest answer to "did inflation really happen?" is: probably, mostly, in some form. The honest answer to "are there other universes?" is: we genuinely don\'t know, and may never know.'
                }
              ];
              var sel = d.selectedInf || 'whyneed';
              var topic = INF_TOPICS.find(function(t) { return t.id === sel; }) || INF_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'The Big Bang theory describes the universe from about 1 second after t=0 onward. What about the first second — or rather, the first 10⁻³⁰ of a second? That is where cosmic inflation lives, and where modern cosmology meets quantum field theory, string theory, and the genuinely open question of whether other universes exist.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  INF_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedInf: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#06b6d4' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #06b6d4' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#67e8f9', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                )
              );
            })(),
            '#06b6d4'
          ),

          // ─── Black hole information paradox ──────────────────────
          sectionCard('🕳️ Black holes, Hawking radiation, and the information paradox',
            (function() {
              var BH_TOPICS = [
                { id: 'classical', name: 'The classical black hole', emoji: '🌑',
                  body: 'In classical general relativity (Einstein 1915, Schwarzschild solution 1916), a black hole is the simplest object in physics. It has three properties only — mass, electric charge, angular momentum — and nothing else (the "no-hair theorem," Israel + Carter + Hawking + Robinson, 1967-1975). Two stars made of completely different materials, with different histories, collapsing to the same mass-charge-spin would produce IDENTICAL black holes. All other information about the matter (chemistry, structure, history, who built the spaceship that fell in) appears to be lost behind the event horizon — irretrievable but at least still THERE inside.',
                  caveat: 'This was already philosophically uncomfortable. But in classical relativity, the information is at least in principle still inside the hole. The paradox shows up only when you add quantum mechanics.'
                },
                { id: 'entropy', name: 'Bekenstein-Hawking entropy', emoji: '🧮',
                  body: 'Jacob Bekenstein (1972, as a Princeton graduate student) argued that black holes MUST have entropy proportional to the area of their event horizon — otherwise you could throw entropy-bearing matter (a hot cup of coffee) into a black hole and violate the second law of thermodynamics. Hawking initially disagreed, then in 1974 worked out the quantum field theory in curved spacetime and showed Bekenstein was right: a black hole has entropy S = (kᵦ × A) / (4 × L²ₚ), where A is the horizon area and Lₚ is the Planck length. A black hole the mass of the Sun has entropy ~10⁷⁷ — astonishingly more than the matter that fell in had. Information density on the horizon is one bit per ~4 Planck areas. This is one of the most surprising results in modern physics.',
                  caveat: 'Bekenstein died young (2015, age 68). His insight about black-hole entropy is now considered foundational; it underlies the holographic principle (\'t Hooft + Susskind, 1990s) — the idea that all the information in a 3D region is encoded on its 2D boundary. The full implications are still being worked out.'
                },
                { id: 'hawking', name: 'Hawking radiation', emoji: '🌡️',
                  body: 'In 1974 Stephen Hawking made a stunning calculation. Combining quantum field theory with the curved spacetime near a black hole, he showed that black holes are not perfectly black. They emit thermal radiation with a temperature T = ħc³ / (8π G M kᵦ) — INVERSELY proportional to mass. A solar-mass black hole has a Hawking temperature of about 60 nanokelvin (colder than empty space). A black hole 1 mm across would have a temperature of ~10²³ K (hotter than anything). The radiation carries energy away, so the black hole LOSES mass and gets HOTTER — runaway evaporation at the end. A solar-mass BH would take ~10⁶⁷ years to evaporate; a small primordial BH from the Big Bang could be evaporating right now.',
                  caveat: 'Hawking radiation has never been directly observed — the Hawking temperature of any astrophysical BH is FAR colder than the cosmic microwave background, so they absorb more energy than they radiate. Analog systems (sonic Hawking radiation in fluid flows, optical analogs) have shown the basic mechanism. Hawking died in 2018, never having received a Nobel Prize, in part because the radiation that bears his name has never been directly detected. His result is universally accepted theoretically.'
                },
                { id: 'paradox', name: 'The information paradox', emoji: '❓',
                  body: 'Here is the puzzle. Quantum mechanics says information is NEVER lost — the state of a closed system evolves unitarily, and you can always reconstruct the past from the present if you have full information. But Hawking\'s calculation says the radiation coming out of a black hole is purely thermal — random, carrying no information about what fell in. If the black hole eventually evaporates completely into thermal radiation, the information about everything that fell in is GONE. Unitarity violated. The two pillars of modern physics, GR and QM, are giving incompatible answers. Hawking himself stated in 1976 that information IS lost. Most physicists came to believe that cannot be right; the resolution must be that the radiation carries information in some subtle way Hawking\'s leading-order calculation missed.',
                  caveat: 'In 2004, Hawking publicly conceded a famous bet with John Preskill (over whether information is preserved), conceding that information IS preserved. He gave Preskill a baseball encyclopedia. But the resolution he proposed at the time was not satisfying. The paradox remained unresolved for another two decades.'
                },
                { id: 'firewall', name: 'AMPS firewall + complementarity', emoji: '🔥',
                  body: 'In 2012, Almheiri, Marolf, Polchinski + Sully (AMPS) sharpened the paradox into a near-contradiction. Three principles that everyone wants to keep — (a) information is preserved, (b) someone falling into a large BH should notice nothing special at the horizon (equivalence principle), (c) low-energy effective field theory works outside the horizon — turn out to be mutually inconsistent. Some principle has to give. Their proposed resolution: a "firewall" of high-energy particles burns up anyone crossing the horizon, violating the equivalence principle. Susskind\'s earlier proposal, "complementarity," argued that an outside observer and an infalling observer can have different but each self-consistent descriptions — neither sees a contradiction.',
                  caveat: 'The firewall paradox sparked roughly a decade of intense theoretical work and produced ER = EPR (Maldacena + Susskind 2013), the suggestion that quantum entanglement and spatial wormholes are the same thing. These are some of the strangest, deepest, most active areas in theoretical physics. Students should know: these are not crank ideas; they come from the most respected practitioners in the field. But they are also not yet established.'
                },
                { id: 'page', name: 'Page curve + the recent breakthrough', emoji: '📈',
                  body: 'Don Page (1993) calculated what entanglement entropy SHOULD look like over the life of an evaporating BH if information is preserved. The result is a characteristic curve (the "Page curve") that rises, peaks at the Page time (when half the mass has evaporated), then decreases back to zero. Hawking\'s original calculation gave a curve that just keeps rising forever — incompatible with unitarity. In 2019-2020, Penington; Almheiri-Engelhardt-Marolf-Maxfield; Penington-Shenker-Stanford-Yang (working largely in the AdS/CFT correspondence) showed how to reproduce the Page curve using "quantum extremal surfaces" + previously-unrecognized contributions from "replica wormholes." The information comes out in subtle correlations between the late and early Hawking radiation, recoverable in principle but in practice requiring impossibly precise measurements.',
                  caveat: 'This is genuinely a recent breakthrough, less than 7 years old. It is widely considered the biggest progress on the information paradox since the paradox was identified. The Page curve result is now reproduced in many specific models. But these results are MOSTLY in highly-supersymmetric, anti-de-Sitter spacetimes — not the universe we live in. Whether the lessons carry over to realistic 4D cosmology is being actively studied.'
                },
                { id: 'inside', name: 'What is inside a black hole?', emoji: '⚫',
                  body: 'Classical GR predicts a SINGULARITY at the center — a point of infinite density where the equations break down. This is universally regarded as a placeholder for "we need quantum gravity here, and we don\'t have it." String theory + loop quantum gravity each have partial proposals (fuzzballs, planck-scale stars, etc.), but no consensus. The interior of a real BH is one of the most extreme environments to which physics applies. Some physicists (Penrose, Hawking + Hartle "no-boundary" proposal) have explored whether the singularity is replaced by something else, like another universe, or a smooth quantum bounce. Speculation is high; observational constraints are essentially zero (you cannot send a signal back out).',
                  caveat: 'Be very careful with popular books that confidently describe the interior of a black hole. The honest answer is: we do not know. We know what classical relativity predicts (singularity, infinite curvature). We know that quantum gravity must replace this prediction. We do not yet know what it replaces it with.'
                },
                { id: 'limits', name: 'What this tells us about physics', emoji: '🌐',
                  body: 'The black hole information paradox is one of the most fertile sources of new physics in 50 years. It forced the discovery of black-hole thermodynamics, drove the development of holography + AdS/CFT, motivated the firewall debate, and led to the recent Page-curve breakthroughs. It is a constraint that any future theory of quantum gravity must respect: BHs must obey unitarity. It also illustrates a wider lesson — the deepest progress in theoretical physics has repeatedly come from taking thought experiments seriously and refusing to abandon ANY of our well-tested principles until forced to.',
                  caveat: 'There is still no agreed-upon resolution. Different camps endorse complementarity, firewalls, fuzzballs, replica wormholes + islands, or "we don\'t yet know." The healthy interpretation is: this is a hard problem at the frontier, and the answer when it comes will probably reshape physics — like the discoveries of quantum mechanics or relativity did a century ago. Or it may turn out to be a longer climb than that.'
                }
              ];
              var sel = d.selectedBH || 'classical';
              var topic = BH_TOPICS.find(function(t) { return t.id === sel; }) || BH_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'Black holes are not just astronomical curiosities. They are the cleanest laboratory we have for the place where general relativity meets quantum mechanics — the two best-tested theories of physics, which famously give incompatible answers in extreme regimes. The "information paradox" is the sharpest version of that conflict.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  BH_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedBH: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#0ea5e9' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #0ea5e9' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#7dd3fc', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                )
              );
            })(),
            '#0ea5e9'
          ),

          // ─── Gravitational waves + multi-messenger astronomy ─────
          sectionCard('🌊 Gravitational waves + multi-messenger astronomy',
            (function() {
              var GW_TOPICS = [
                { id: 'predict', name: 'Einstein\'s prediction', emoji: '✍️',
                  body: 'In 1916, one year after publishing general relativity, Einstein predicted that accelerating masses must radiate ripples in the fabric of spacetime itself — "gravitational waves." A passing wave alternately stretches + compresses space transverse to its direction of travel. The amplitude is so small that Einstein himself doubted they would ever be detected. For a typical astrophysical source, the fractional stretch is on the order of 10⁻²¹ — meaning over a 4 km baseline, the stretch is about 4 × 10⁻¹⁸ meters, roughly 1/1000 the diameter of a proton. Einstein went back and forth on whether the waves were a real physical phenomenon or a mathematical artifact; he eventually concluded they were real, but never expected experimental confirmation in his lifetime.',
                  caveat: 'Indirect evidence came in 1974 with the Hulse-Taylor pulsar (PSR 1913+16): two neutron stars orbiting each other, losing orbital energy at EXACTLY the rate predicted by GR if they were radiating gravitational waves. Hulse + Taylor won the 1993 Nobel for this. But direct detection of the waves themselves had to wait another 42 years.'
                },
                { id: 'ligo', name: 'LIGO + the 2015 detection', emoji: '📡',
                  body: 'The Laser Interferometer Gravitational-Wave Observatory (LIGO) was conceived in the 1980s by Rai Weiss + Kip Thorne + Ron Drever. The design: two perpendicular 4-km vacuum arms, with laser beams bouncing between mirrors at each end + recombined at a central beam splitter. A passing gravitational wave stretches one arm + compresses the other, causing the recombined light to brighten + dim by a tiny amount. After ~25 years of construction + sensitivity upgrades (the original LIGO ran 2002-2010 with no detections; Advanced LIGO went online 2015 with 10× better sensitivity), the first detection came on September 14, 2015 (GW150914): two black holes of 29 + 36 solar masses merging into a 62-solar-mass remnant, ~1.3 billion light-years away. The 3 solar masses missing were converted directly into gravitational-wave energy in the final fraction of a second — a peak power greater than all the stars in the observable universe COMBINED for that one moment. Weiss + Thorne + Barish won the 2017 Nobel Prize.',
                  caveat: 'LIGO required engineering precision that has no peer in physics: vacuum-tube cleanliness better than the surface of the Moon, mirror suspensions stable to atomic-scale vibrations, ground-vibration isolation systems that filter everything from passing trucks to ocean waves on distant continents. It is arguably the most precise measurement instrument ever built. About 1/3 of detection-confirmation work consists of ruling out instrumental artifacts.'
                },
                { id: 'sources', name: 'What we have detected', emoji: '📊',
                  body: 'As of late 2025 the LIGO-Virgo-KAGRA collaboration has confirmed ~250+ gravitational-wave detections, almost all of them compact-binary mergers. By type: most are binary black hole mergers (BBH; masses 5-150 solar). Several are binary neutron star mergers (BNS). A few are neutron-star-black-hole mergers (NSBH). The discoveries have transformed what we know about stellar-mass black holes: we now know they exist in the 50-150 solar mass range (heavier than expected from any known stellar collapse pathway), that they sometimes form pairs that merge within Hubble time, and that they may form through hierarchical mergers in dense stellar clusters. Catalog releases (O1, O2, O3a, O3b, O4 ongoing) are public; anyone can re-analyze the strain data.',
                  caveat: 'Detection rates are biased toward HEAVIER systems (which radiate more energy in the LIGO band), and we miss most events too far away or pointing the wrong direction. The full population statistics require careful selection-effect modeling. Still, the field went from zero detections in 2015 to confirmed detection every few days during O4 — a transformation faster than almost any branch of astronomy has experienced.'
                },
                { id: 'kilonova', name: 'GW170817 — the multi-messenger event', emoji: '✨',
                  body: 'On August 17, 2017, LIGO + Virgo detected a binary neutron star merger (GW170817, ~130 million light-years away in the galaxy NGC 4993). 1.7 seconds later, NASA\'s Fermi gamma-ray telescope detected a short gamma-ray burst from the same patch of sky. Over the next hours, optical + IR + X-ray + radio telescopes worldwide — 70+ observatories, 3500+ scientists — pivoted to watch the aftermath. What they saw was a "kilonova": a glowing cloud of newly-formed heavy elements (gold, platinum, uranium, lanthanides) thrown off by the merger. This single event confirmed that (a) binary neutron star mergers are sources of short gamma-ray bursts, (b) at least HALF the gold + platinum + uranium in the universe is forged in such mergers (not just in supernovae, as previously thought), and (c) the speed of gravity equals the speed of light to better than 10⁻¹⁵.',
                  caveat: 'GW170817 is the only neutron-star merger detected with a confirmed optical counterpart so far. Subsequent BNS detections have been further away + poorly localized, and no kilonova was seen. The 2017 event was extraordinarily lucky in distance + sky position. The 2025 EM-counterpart drought is a real puzzle the field is still working through.'
                },
                { id: 'spectrum', name: 'The gravitational-wave spectrum', emoji: '🎼',
                  body: 'Different detector designs sense different frequencies. LIGO + Virgo + KAGRA (4 km laser interferometers, ground-based) detect 10-2000 Hz — the audible-range "chirps" of stellar-mass compact binaries in the final seconds before merger. LISA (Laser Interferometer Space Antenna, ESA-led, launch ~2035) will be three spacecraft in solar orbit forming arms ~2.5 million km long, sensitive to 10⁻⁴ to 10⁻¹ Hz — supermassive BH mergers, double white dwarfs, extreme mass-ratio inspirals. Pulsar Timing Arrays (NANOGrav, EPTA, others) monitor millisecond pulsars over decades, sensitive to 10⁻⁹ to 10⁻⁷ Hz — supermassive BH mergers building up an isotropic stochastic background. In 2023 NANOGrav + EPTA + PPTA + IPTA reported strong evidence for that background, almost certainly from supermassive BH binaries in galaxy mergers.',
                  caveat: 'The 2023 stochastic-background results from PTAs are ~3-4σ evidence; confirmation + characterization will take another decade of data. The nature of the signal (single SMBH-binary population vs cosmological-origin) is not yet pinned down. LISA is mid-design + behind schedule, as space missions often are.'
                },
                { id: 'multimessenger', name: 'Multi-messenger astronomy', emoji: '🌐',
                  body: 'For most of history, astronomy meant photons — visible light, radio, infrared, ultraviolet, X-ray, gamma-ray. Multi-messenger astronomy combines photons with the other "messengers" reaching us from astrophysical sources: gravitational waves, neutrinos, and (debatably) cosmic rays. Each tells you something the others cannot. Photons trace electromagnetic activity (heat, magnetic processes, atomic transitions). Neutrinos trace nuclear processes (supernova cores, AGN jets). Gravitational waves trace mass-motion (binary mergers, asymmetric supernova collapse). 1987A (a supernova in the Large Magellanic Cloud) was detected in neutrinos hours before the light arrived — the first true multi-messenger event. GW170817 was the first joint photon + GW event. IceCube has detected high-energy neutrinos correlated with active galactic nuclei. The field is genuinely revolutionizing astrophysics.',
                  caveat: 'Coordinating real-time alerts across hundreds of observatories is operationally hard. False alarms (background fluctuations, instrumental glitches, satellite glints) are a real problem. The community has developed shared infrastructure (Gamma-ray Coordinates Network, Astronomers Telegram, NASA GCN) but quality + speed still vary. The field is learning as it goes.'
                },
                { id: 'cosmology', name: 'Standard sirens — GW cosmology', emoji: '📏',
                  body: 'Binary neutron star + binary BH mergers are "standard sirens": their gravitational-wave waveform encodes the merger\'s intrinsic luminosity (in GWs), so the strain we observe directly tells us the distance. If we ALSO identify the host galaxy (via electromagnetic counterpart or statistical inference), we get the redshift — and with distance + redshift, we get an independent measurement of the Hubble constant H₀, free of the cosmic distance ladder. The first H₀ measurement from GW170817 gave ~70 km/s/Mpc with large error bars. As statistics accumulate, the GW H₀ is expected to reach few-% precision in the next decade — potentially resolving the Hubble tension.',
                  caveat: 'Currently, GW-based H₀ has wide error bars (~10%). It does NOT yet decide between the CMB + distance-ladder values. Reaching 1-2% precision requires either many more BNS detections with optical counterparts, or sophisticated "dark sirens" methods (statistical galaxy-association without an identified host) that have their own systematics. The next 5-10 years should be decisive.'
                },
                { id: 'limits', name: 'Honest limits', emoji: '🚧',
                  body: 'GW astronomy is still very new. We have detected ~250 events; for comparison, modern optical sky surveys catalog billions of sources. Sky localization is poor compared to optical (often 10-100 square degrees, sometimes larger — the field of view of HUNDREDS of full moons). We cannot yet detect (a) supernova GW signals from typical core-collapse events (too weak for current LIGO), (b) primordial GWs from inflation (sought by CMB B-mode searches, not yet detected), (c) continuous GWs from rotating non-axisymmetric neutron stars (likely too weak), (d) GWs from binaries of very different mass ratios except the loudest cases. The next generation (Cosmic Explorer, Einstein Telescope, both targeted for 2030s) will be ~10× more sensitive + dramatically expand the detectable population.',
                  caveat: 'GW astronomy started in 2015, just 11 years ago at the time of this writing. The field is genuinely young + every year brings something new. Predictions about what will be impossible "in principle" should be hedged accordingly; predictions in this field have been wrong before.'
                }
              ];
              var sel = d.selectedGW || 'predict';
              var topic = GW_TOPICS.find(function(t) { return t.id === sel; }) || GW_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'For 99.9999% of human history, astronomy meant looking at light. In 2015 that changed. Gravitational-wave astronomy added a completely new sense — the ability to LISTEN to the universe rather than just SEE it. Multi-messenger astronomy combines all of these: light + neutrinos + gravitational waves from the same event.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  GW_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedGW: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#14b8a6' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #14b8a6' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(20,184,166,0.08)', border: '1px solid rgba(20,184,166,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#5eead4', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                )
              );
            })(),
            '#14b8a6'
          ),

          // ─── Pulsars + magnetars + FRBs ──────────────────────────
          sectionCard('📡 Pulsars, magnetars, and fast radio bursts',
            (function() {
              var PSR_TOPICS = [
                { id: 'discovery', name: 'Jocelyn Bell + LGM-1', emoji: '🔭',
                  body: 'In 1967 Jocelyn Bell Burnell, a 24-year-old PhD student at Cambridge, was reviewing radio-telescope chart-recorder traces (over 30 meters of paper per day) when she noticed a peculiar regular pulse repeating every 1.337 seconds. The signal was so clean + so periodic that the team half-jokingly labeled it "LGM-1" — Little Green Men. Within months they found three more sources at different sky positions, ruling out intelligent broadcasts. What Bell had discovered was the first PULSAR: a rapidly rotating neutron star sweeping a beam of radiation across Earth like a cosmic lighthouse. Antony Hewish (her supervisor) won the 1974 Nobel Prize; Bell was famously not included.',
                  caveat: 'Bell\'s exclusion from the Nobel sparked a longstanding debate about who gets credit in big-science collaborations. Bell has been gracious in public, saying graduate students don\'t typically win Nobels. In 2018 she donated her £2.3 million Breakthrough Prize entirely to fund physics PhDs for under-represented groups — one of the more remarkable acts of scientific philanthropy in recent decades. She is now Dame Jocelyn Bell Burnell, a former president of the Royal Astronomical Society + Royal Society of Edinburgh.'
                },
                { id: 'whatisa', name: 'What a pulsar IS', emoji: '⚡',
                  body: 'A pulsar is a rapidly rotating neutron star whose magnetic axis is tilted relative to its rotation axis. Charged particles accelerate along the magnetic field lines, producing focused beams of radio (and sometimes optical, X-ray, gamma-ray) radiation along the magnetic poles. As the star rotates, the beams sweep through space — and IF one happens to point at Earth during each rotation, we see a regular pulse. The pulsar mass is typically ~1.4 solar masses compressed into a sphere ~20 km across (about the size of Manhattan). Density: a sugar-cube-sized chunk would weigh about a billion tons. Surface gravity ~10¹¹ times Earth\'s. Magnetic field ~10⁸ to 10¹⁵ Gauss (Earth\'s field is ~0.5 Gauss). Most pulsars rotate once per second or so; the fastest known (PSR J1748-2446ad) spins at 716 Hz — 716 rotations per second.',
                  caveat: 'The "lighthouse" framing is helpful but slightly misleading. The radio beam isn\'t a literal headlight; it\'s a more complex emission geometry that we still don\'t fully understand at the plasma-physics level. The basics of how pulsars emit are reasonably well-modeled; the details (why some pulsars suddenly "glitch," why some "nulling" pulsars turn off + back on, why pulse profiles vary) remain active research.'
                },
                { id: 'msp', name: 'Millisecond pulsars + cosmic clocks', emoji: '⏱️',
                  body: 'Millisecond pulsars (MSPs) rotate hundreds of times per second. They are old pulsars that were "spun up" by accreting matter from a binary companion. Their rotation periods are stable to about 1 part in 10¹⁵ — better than the best atomic clocks. This makes them extraordinary tools. Pulsar timing arrays (NANOGrav, EPTA, PPTA) monitor dozens of MSPs over decades, watching for tiny correlated timing variations caused by gravitational waves passing through the galaxy. In 2023, four PTA collaborations independently announced strong evidence for a stochastic gravitational-wave background at nanohertz frequencies — almost certainly from a galaxy-wide population of supermassive black hole binaries.',
                  caveat: 'PTAs have been measuring for almost 20 years to get this evidence. The signal is real but the precise interpretation (single SMBH-binary population? cosmic strings? primordial GWs from inflation?) is still being worked out. The 2023 results were ~3-4σ; reaching 5σ + characterizing the source will take another decade.'
                },
                { id: 'magnetars', name: 'Magnetars — the extremes', emoji: '🧲',
                  body: 'Magnetars are a rare subclass of neutron star with magnetic fields ~1000× stronger than ordinary pulsars — up to 10¹⁵ Gauss. To put that in perspective: at half the distance of the Moon, a magnetar would wipe every credit card on Earth + reset every pacemaker; at ~1000 km the magnetic field would tear molecules apart, killing you not by force or radiation but by destroying the chemistry of your body. Magnetars occasionally produce "giant flares" — bursts of soft gamma rays releasing more energy in a tenth of a second than the Sun emits in 100,000 years. The 2004 flare from SGR 1806-20 (~50,000 light-years away) briefly compressed Earth\'s magnetosphere + ionized the upper atmosphere on Earth\'s nightside. Only about 30 magnetars are known.',
                  caveat: 'Magnetars are believed to be the leftover cores of stars that died with unusually strong magnetic fields, which were further amplified by rapid rotation + dynamo action in the supernova\'s last seconds. Why some neutron stars become magnetars + others don\'t is still partly a guess. Magnetar magnetic fields decay on timescales of ~10,000-100,000 years, after which they become ordinary radio pulsars.'
                },
                { id: 'frbs', name: 'Fast radio bursts (FRBs)', emoji: '⚡',
                  body: 'Fast radio bursts are millisecond-long pulses of radio energy, immensely bright (releasing ~10³⁸ erg in ~1 ms — comparable to the Sun\'s entire daily energy output, in a millisecond, in radio alone). The first FRB (the "Lorimer burst") was found in 2007 archival data from the Parkes telescope. They were originally thought to be one-off events of unknown origin; then in 2016 the first "repeater" was found (FRB 121102), and we realized at least some FRB sources emit multiple bursts. Most FRBs are extragalactic — their high dispersion measure (radio signal smeared by passage through intergalactic plasma) indicates distances of hundreds of millions to billions of light-years.',
                  caveat: 'For ~14 years, FRBs were a complete mystery. Hundreds of theories were proposed (neutron star mergers, exotic dark matter, alien beacons, primordial black holes). In April 2020, FRB 200428 was detected from inside our own galaxy, coming from a known magnetar (SGR 1935+2154). This essentially settled it: AT LEAST some FRBs are magnetar-powered. But there may be multiple FRB-source classes — some repeating, some one-off, possibly with different mechanisms.'
                },
                { id: 'mechanism', name: 'How magnetars make FRBs', emoji: '⚙️',
                  body: 'The leading model: a magnetar\'s crust occasionally fractures under magnetic stress (a "starquake"), releasing a burst of energy that propagates outward as a relativistic shock through the magnetosphere. Charged particles accelerated to enormous energies emit coherent radio emission via the synchrotron-maser mechanism. The pulse is brief because the emitting region is tiny; bright because the emission is coherent (the particles radiate in phase). Repeating FRB sources may correspond to magnetars in dense environments where many starquakes happen per year; one-off FRBs may come from rarer, more extreme events (catastrophic magnetar collapse, neutron star mergers, or something we haven\'t identified yet).',
                  caveat: 'The synchrotron-maser model fits the data reasonably well, but several aspects (the precise emission geometry, why bursts cluster in time, the source-localized polarization variations) are not fully explained. FRB plasma physics is genuinely one of the harder problems in current astrophysics. New telescopes (CHIME, ASKAP, MeerKAT, the future SKA) are detecting hundreds to thousands of FRBs per year, which should pin down the mechanism within a decade.'
                },
                { id: 'use', name: 'FRBs as cosmological probes', emoji: '🌌',
                  body: 'Because FRBs travel through the intergalactic medium for billions of light-years, their radio pulses are dispersed (low frequencies arrive later than high frequencies) by an amount proportional to the total free-electron column along the path. This makes FRBs unique "cosmic dispersion meters." The Macquart relation (2020, named for the late Australian astronomer J.-P. Macquart) confirms that FRB dispersion measure does scale with redshift as expected if most of the baryons are diffuse intergalactic plasma — settling the long-running "missing baryon problem" (decades of trying to find the ~50% of normal matter that wasn\'t in galaxies). FRBs may also probe magnetic fields along their paths (via Faraday rotation), the structure of the cosmic web, and potentially fundamental physics tests of photon mass + Einstein equivalence.',
                  caveat: 'FRB cosmology is in its infancy. Sample sizes are small + selection biases poorly understood. A few dozen FRBs with redshifts measured can already deliver useful results; thousands will eventually deliver precise cosmography. The field is moving very fast.'
                },
                { id: 'aliens', name: 'Could it be aliens?', emoji: '👽',
                  body: 'Whenever a new astrophysical phenomenon appears mysterious, the alien-broadcast hypothesis comes up. For pulsars (1967): briefly considered, rapidly dismissed once multiple sources were found at random sky positions. For FRBs (2007-2020): briefly considered, rapidly dismissed once they were shown to be extragalactic + coming from many different sources at random sky positions. The "aliens" hypothesis fails the same test every time: technological signals would be expected from rare specific sources (planets we could identify), not from random sky positions billions of light-years away. Genuine SETI work continues (Breakthrough Listen, the Allen Telescope Array, FAST), and they are looking — but they would look like deliberate, narrow-band, repeating signals from specific stars, not like FRBs.',
                  caveat: 'The history of astronomy is FULL of strange signals that turned out to be natural (pulsars, FRBs, the "WOW! signal," Tabby\'s Star). None have ever turned out to be alien. This is not evidence aliens don\'t exist — it is evidence that we should default to natural explanations + only invoke aliens when the natural hypotheses really fail. They never have, in 100+ years of trying.'
                }
              ];
              var sel = d.selectedPSR || 'discovery';
              var topic = PSR_TOPICS.find(function(t) { return t.id === sel; }) || PSR_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'Neutron stars are the densest objects in the universe short of black holes. Some of them are pulsars, some are magnetars, and some appear to be the sources of fast radio bursts — millisecond flashes of radio energy bright enough to be seen across the universe. Each tells us something different about extreme physics.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  PSR_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedPSR: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#f59e0b' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #f59e0b' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#fbbf24', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                )
              );
            })(),
            '#f59e0b'
          ),

          // ─── Cosmic calendar (Sagan's compressed year) ──────────
          sectionCard('📅 The Cosmic Calendar — 13.8 billion years in one year',
            (function() {
              var CC_DATES = [
                { id: 'jan1', when: 'January 1, 12:00 AM', emoji: '💥',
                  what: 'The Big Bang. The observable universe begins as something incredibly hot, dense, and small. In the first second, the four fundamental forces separate. In the first three minutes, hydrogen + helium + traces of lithium form (Big Bang nucleosynthesis). 380,000 years later (~ 5 minutes on the cosmic calendar), the first atoms form + the cosmic microwave background is released. The next ~100 million years are the "cosmic dark ages" — no stars yet, just neutral hydrogen.',
                  context: 'On Sagan\'s calendar, 1 cosmic year = 13.8 billion real years. So: 1 cosmic month ~ 1.15 billion real years. 1 cosmic day ~ 38 million real years. 1 cosmic hour ~ 1.6 million real years. 1 cosmic minute ~ 26,000 real years. 1 cosmic second ~ 437 real years. We humans, all of recorded history, all our wars + cathedrals + science + everything, fit inside the last few cosmic seconds.'
                },
                { id: 'jan10', when: 'January 10-22', emoji: '⭐',
                  what: 'First stars + galaxies form (~ 100-400 million real years after Big Bang). The first stars (Population III) were massive, short-lived, made entirely of H + He. They produced the first heavier elements + their supernovae enriched the interstellar medium. Galaxies began merging into the first protogalaxies — JWST has now imaged some of these directly. Cosmic dawn ends; the universe lights up.',
                  context: 'The 4 weeks between the Big Bang + the first galaxies represents the time before any luminous objects existed in our universe. JWST has pushed direct observation back to ~ January 12-15 on the cosmic calendar. We are looking deeper into the cosmic year every decade.'
                },
                { id: 'mar15', when: 'March 15', emoji: '🌌',
                  what: 'The Milky Way galaxy forms (~ 11.5 billion real years ago). A massive halo of dark matter pulls in primordial gas; star formation begins; the central supermassive black hole grows. The Milky Way has been continuously forming stars + capturing satellite galaxies ever since. We are still expanding + still cannibalizing smaller galaxies today — the Sagittarius Dwarf Galaxy is currently being torn apart + absorbed by our halo.',
                  context: 'Our galaxy has been around for about 80% of the universe\'s history. Most of the stars in our galaxy are older than the Sun.'
                },
                { id: 'aug28', when: 'August 28', emoji: '🪐',
                  what: 'Solar System formation begins (~ 4.6 billion real years ago). A giant molecular cloud (with material enriched by ~ 9 billion years of previous stellar nucleosynthesis) collapses, possibly triggered by a nearby supernova. The Sun forms; the protoplanetary disk forms; the planets accrete; the Late Heavy Bombardment delivers water + organics; the Moon forms after a Mars-sized body (Theia) collides with proto-Earth.',
                  context: 'In real years: 4.6 billion years ago — which is to say, about 9.2 billion years AFTER the Big Bang. The Earth + Sun are roughly halfway through the universe\'s history.'
                },
                { id: 'sep1', when: 'September 1-15', emoji: '🦠',
                  what: 'First life on Earth (~ 4.0-3.8 billion real years ago). The oldest convincing evidence is fossilized microbial mats (stromatolites) ~ 3.5 billion years old. By ~ 3 billion years ago, oxygenic photosynthesis evolved in cyanobacteria; this slowly transformed Earth\'s atmosphere over the next 500 million years (the Great Oxidation Event, ~ 2.4 billion years ago).',
                  context: 'Life appears extraordinarily quickly after Earth becomes habitable (within ~ 500-700 million years), suggesting that under the right conditions, simple life may form readily. The transition from simple to complex life took FAR longer + may be the bigger filter.'
                },
                { id: 'nov15', when: 'November 9', emoji: '🧬',
                  what: 'First eukaryotes (cells with nuclei + organelles) appear (~ 2.1-1.7 billion real years ago). Endosymbiosis — when one prokaryote engulfed another + the captured cell became a mitochondrion or chloroplast — was the singular event that made all complex life possible. This may be the hardest single step in the evolution of intelligence + may be the bulk of the Great Filter behind us (if there is one).',
                  context: 'Eukaryotes appear MORE than 1 billion real years after life first arose. The "easy" step (prokaryotes) was fast; the "hard" step (eukaryotes) took much longer.'
                },
                { id: 'dec5', when: 'December 5', emoji: '🐚',
                  what: 'Cambrian explosion (~ 540 million real years ago). The fossil record suddenly shows nearly all the major animal body plans (phyla) appearing within a few tens of millions of years. Trilobites, mollusks, arthropods, vertebrate ancestors. The ozone layer is now established, allowing UV-sensitive organisms to thrive in shallow water. Multicellular life with hard parts had begun ~ 100 million years earlier (the Ediacaran).',
                  context: 'Most of complex life history has happened in the LAST month of the cosmic year. December 5 marks the start of recognizable animals.'
                },
                { id: 'dec25', when: 'December 25', emoji: '🦖',
                  what: 'Age of dinosaurs begins (~ 230 million real years ago). The Triassic-Jurassic-Cretaceous reign of dinosaurs lasts ~ 165 million real years — about 4-5 days on the cosmic calendar. Mammals exist throughout this time but stay small + nocturnal. Christmas morning to mid-afternoon: dinosaurs dominate. Then a 10-km asteroid hits the Yucatan (December 30 on cosmic calendar, ~ 66 million real years ago) + ends them.',
                  context: 'Even the dinosaurs, who ruled Earth for an unimaginable span, occupy only ~ 4 days of the cosmic year. Their entire existence is shorter than the time between the start of complex animals + now.'
                },
                { id: 'dec31', when: 'December 31, 11:54 PM', emoji: '🚶',
                  what: 'Homo sapiens emerges (~ 300,000 real years ago). Our species evolves in Africa, spreads gradually across the globe, develops language, art, agriculture. The 300,000-year tenure of anatomically modern humans occupies about 11 minutes on the cosmic calendar. We share Earth with Neanderthals + Denisovans for much of this time; they go extinct ~ 40,000 years ago (December 31, 11:58 PM).',
                  context: 'Everything humans have ever done — every story, every cave painting, every migration, every culture — fits inside the last 11 minutes of the cosmic year.'
                },
                { id: 'agriculture', when: 'December 31, 11:59:30 PM', emoji: '🌾',
                  what: 'Agriculture begins (~ 12,000 real years ago, Mesopotamia + independently elsewhere). Wheat, barley, lentils, einkorn are domesticated. Within a few thousand real years, the same revolution happens independently with rice in China, maize in Mesoamerica, sorghum in Africa, potatoes in the Andes. Settled life, cities, writing, organized states all follow.',
                  context: 'All of human civilization — every empire, every religion, every cathedral, every nation — occupies the last 30 seconds of the cosmic year.'
                },
                { id: 'now', when: 'December 31, 11:59:59 PM', emoji: '🌍',
                  what: 'The present moment. Roman empire (~ 4 seconds ago). Renaissance (~ 1.3 seconds ago). Industrial Revolution (~ 0.6 seconds ago). Modern era (~ 0.3 seconds ago). Computers, atomic energy, spaceflight, internet, social media, AI: all in the final < 0.1 cosmic seconds. Everything that defines modern life happened in less than the time it takes to blink.',
                  context: 'This is the perspective the cosmic calendar is meant to give. NOT to make our lives feel meaningless (we are still here, doing this) but to make our species feel young + our recent achievements + threats feel as RECENT as they actually are. Climate change, nuclear weapons, AI — every one of our existential challenges is the work of the LAST FEW SECONDS of cosmic time. We are all newborns trying to figure out how to live.'
                }
              ];
              var sel = d.selectedCC || 'jan1';
              var topic = CC_DATES.find(function(t) { return t.id === sel; }) || CC_DATES[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'In the 1970s, Carl Sagan compressed the entire 13.8-billion-year history of the universe into a single year. The Big Bang is January 1 at midnight; "now" is December 31 at 11:59:59 PM. This framing remains one of the most powerful ways to grasp cosmic time. A cosmic SECOND is ~437 years of real time. Recorded human history occupies the last ~14 cosmic seconds.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  CC_DATES.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedCC: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fb923c' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fb923c' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.when.split(',')[0]);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#fdba74', marginBottom: 2 } }, topic.emoji + ' ' + topic.when),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10, marginTop: 8 } }, topic.what),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'On the calendar: '), topic.context
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'A classroom exercise: '),
                  'Print a paper calendar of any single year + write events on it at proportional dates: January 1 = Big Bang, mid-March = Milky Way forms, late August = Earth forms, etc. Have students mark their own birthday on the calendar — for a 12-year-old, their entire life is ~ 0.027 cosmic seconds, faster than the eye can blink. Then ask: "What deserves attention given how short our individual lifetimes are at cosmic scale?" The answer is not "nothing." It is the opposite: what we choose to do MATTERS more, not less, in such a brief window.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, 'Sagan\'s original framing: '),
                  '"The cosmos is also within us. We are made of star-stuff. We are a way for the universe to know itself." From "Cosmos" (1980), Episode 1. The cosmic calendar was first laid out in "The Dragons of Eden" (1977, Pulitzer Prize for nonfiction) + has been adapted in many forms since. The version above closely follows Sagan\'s scaling. Astrophysicists use slightly different dates as new dating evidence refines, but the orders-of-magnitude pattern is robust.'
                )
              );
            })(),
            '#fb923c'
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // ECLIPSES & EVENTS
      // ──────────────────────────────────────────────────────────────
      function renderEvents() {
        return h('div', { style: { padding: 16 } },
          safetyBanner('NEVER look at the Sun without certified solar-eclipse glasses (ISO 12312-2). Even brief exposure can cause permanent eye damage. Regular sunglasses, smoked glass, exposed film, and most welding goggles are NOT safe. The only safe direct view is during TOTALITY (the brief moment when the Moon completely covers the Sun in a TOTAL solar eclipse — and only at that exact moment).'),
          EVENTS_LEARN.map(function(e) {
            return h('div', { key: e.id, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 22 }, 'aria-hidden': 'true' }, e.icon),
                h('h3', { style: { margin: 0, color: '#c7d2fe', fontSize: 16 } }, e.name)
              ),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 6 } }, e.what),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', marginBottom: 6 } },
                h('span', { style: { fontSize: 11, fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'When: '),
                h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, e.when)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)' } },
                h('span', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Safety: '),
                h('span', { style: { fontSize: 12, color: '#fecaca' } }, e.safety)
              )
            );
          }),

          sectionCard('☄️ Meteorites + comets — visitors from deep space',
            (function() {
              var ITEMS = [
                { id: 'murchison', name: 'Murchison meteorite', when: 'Fell Sep 28 1969, Australia', color: '#22c55e',
                  what: 'A 100 kg carbonaceous chondrite that landed in Murchison, Victoria. One of the most-studied meteorites in history because it contains COMPLEX ORGANIC MOLECULES — including ~90 different amino acids (both biological + non-biological), nucleobases (the building blocks of DNA + RNA), and sugars.',
                  why: 'Strong evidence that the building blocks of life formed naturally in the early solar system + were delivered to Earth (and many other worlds) by impacts. Doesn\'t solve the origin of life problem but reframes it: the chemistry was ready everywhere; the question is what assembled it.',
                  cool: 'Murchison contains amino acids in BOTH left-handed + right-handed forms (Earth life uses only left-handed). Found 70+ amino acids that Earth life doesn\'t use at all.'
                },
                { id: 'allende', name: 'Allende meteorite', when: 'Fell Feb 8 1969, Mexico', color: '#fbbf24',
                  what: 'A 2-ton carbonaceous chondrite that broke up over Chihuahua, Mexico. Hundreds of kg of fragments recovered. Contains CALCIUM-ALUMINUM-RICH INCLUSIONS (CAIs) — the OLDEST solid materials in the solar system, ~4.567 billion years old.',
                  why: 'CAI dating set the firm age of the solar system. The composition + isotope patterns in CAIs preserve evidence of the supernova that triggered our solar nebula collapse. Allende is the cosmochemist\'s reference standard.',
                  cool: 'CAIs are millimeter-scale crystals. They are older than Earth, older than the Moon, older than the Sun (as a fusion-powered star). Holding a piece of Allende is touching the early solar system.'
                },
                { id: 'mars', name: 'Mars meteorites (~300 known)', when: 'Various', color: '#dc2626',
                  what: 'Rocks blasted off Mars by impacts, eventually reaching Earth. Confirmed Martian by their trapped atmospheric gases (matches the Mars rovers\' atmospheric measurements). Travel takes typically 100,000 to 10 million years.',
                  why: 'A free way to study Mars surface chemistry without a sample-return mission. The 1996 ALH 84001 famously contained possible (now contested) microfossil-like structures + magnetite chains; the debate launched the modern field of astrobiology even though the claim is largely disbelieved now.',
                  cool: 'You can buy a small piece of Mars from a meteorite dealer. Prices range from ~$100 (small fragment) to $1,000+/g for well-classified specimens. The total amount of Mars on Earth from natural delivery is ~300 kg total.'
                },
                { id: '67p', name: '67P/Churyumov-Gerasimenko (Rosetta)', when: 'Visited 2014-2016', color: '#0ea5e9',
                  what: 'A 4 km dumbbell-shaped comet. ESA\'s Rosetta spacecraft (launched 2004) orbited it from 2014-2016, the first-ever extended visit to a comet. The Philae lander touched down November 2014 — the first soft landing on a comet, though it bounced + ended up sideways in a shadow.',
                  why: 'Rosetta studied the nucleus from km away as 67P approached the Sun + began outgassing. Detected water vapor, glycine (an amino acid), molecular oxygen, organic dust. The water isotope ratios DIFFERED from Earth\'s ocean water — challenging the idea that comets delivered Earth\'s water.',
                  cool: 'Mission ended Sep 30 2016 with controlled crash into the comet — last images released minute by minute. Rosetta\'s data are still being analyzed 8+ years later.'
                },
                { id: 'oumuamua', name: 'ʻOumuamua (1I/2017 U1)', when: 'Discovered Oct 19 2017', color: '#a855f7',
                  what: 'The FIRST detected interstellar object — an asteroid or comet from another star system passing through our solar system. ~100-1000 m long, very elongated (10:1 ratio), reddish, with unusual non-gravitational acceleration.',
                  why: 'Until ʻOumuamua, all known small bodies originated in our own solar system. It proved that material crosses between stellar systems regularly. The unusual acceleration sparked controversy — Harvard astronomer Avi Loeb proposed it might be alien technology (a "light sail"); most astronomers favor exotic but natural explanations (hydrogen ice, fractal aggregate, captured fragment).',
                  cool: 'The name is Hawaiian for "scout" or "first messenger from far away." Discovered by Pan-STARRS in Hawaii.'
                },
                { id: 'borisov', name: '2I/Borisov', when: 'Discovered Aug 30 2019', color: '#f97316',
                  what: 'The SECOND interstellar object — an active comet from outside our solar system. Discovered by amateur astronomer Gennady Borisov from Crimea. Behaved much more like a normal comet (developed a tail, outgassed water + CO + cyanide).',
                  why: 'Confirmed that interstellar comets exist + are detectable. The composition matched solar-system comets in many ways but had much higher CO + CO₂ → formed in a colder environment than typical solar-system comets. A literal piece of another solar system.',
                  cool: 'Borisov was an unpaid amateur. His 65 cm telescope spotted what professional surveys missed. He was awarded the 2020 Edgar Wilson Award + got an asteroid named for him.'
                }
              ];
              var sel = ITEMS.find(function(i) { return i.id === d.selectedMeteoroid; }) || ITEMS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Meteorites + comets are time capsules. They preserve solar-system chemistry from 4.6 billion years ago — and increasingly, samples from OUTSIDE our solar system. Every piece tells a story about where it formed, what conditions it survived, and (sometimes) what kinds of chemistry are possible elsewhere.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  ITEMS.map(function(it) {
                    var active = (d.selectedMeteoroid || ITEMS[0].id) === it.id;
                    return h('button', { key: it.id,
                      onClick: function() { upd({ selectedMeteoroid: it.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? it.color + '33' : '#1e293b', border: '1px solid ' + (active ? it.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, it.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 } }, sel.when),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What it is'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Why it matters'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.why)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Worth knowing'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.cool)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Meteorite classification (simplified): '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Chondrites (86% of falls): '), 'Stony, primitive, unmelted. Contain chondrules — millimeter-scale glass spheres formed in the early solar nebula. Carbonaceous chondrites are the most pristine (Murchison, Allende).'),
                    h('li', null, h('strong', null, 'Achondrites (8% of falls): '), 'Stony but melted + differentiated. Came from bodies large enough to have melted internally. Mars + Moon meteorites are achondrites.'),
                    h('li', null, h('strong', null, 'Iron meteorites (5% of falls): '), 'Metallic iron-nickel from the cores of destroyed planetesimals. The Widmanstätten pattern (cooled crystalline pattern) takes millions of years to form + cannot be faked.'),
                    h('li', null, h('strong', null, 'Stony-irons (1%): '), 'Mix of stone + metal. Pallasites are the most beautiful — translucent olivine crystals embedded in iron-nickel matrix.')
                  )
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, 'Where did Earth\'s water come from? '),
                  'For decades the leading theory was: comets delivered water. But Rosetta + other missions showed comet water has DIFFERENT deuterium/hydrogen ratios than Earth\'s oceans. Current best guess: most water came from carbonaceous asteroids during Earth\'s formation; comets contributed perhaps 10%. Active research; still being refined.'
                )
              );
            })(),
            '#22c55e'
          ),

          sectionCard('☄️ Asteroids + planetary defense',
            (function() {
              var IMPACTS = [
                { id: 'tunguska', name: 'Tunguska 1908', size: '~50-60 m', loc: 'Siberia, Russia', color: '#a16207',
                  what: 'A stony asteroid (or possibly icy comet fragment) about 50-60 m across detonated 5-10 km above the Siberian forest, releasing energy equivalent to 10-15 megatons of TNT (~1,000× Hiroshima). Flattened ~2,000 km² of forest. Witnessed by a few dozen people, mostly Indigenous Evenk reindeer herders. Killed at least 3 people that we know of.',
                  rate: 'Tunguska-scale events: probably once every few centuries to a millennium globally.',
                  prep: 'Below the size threshold for current detection programs to give substantial warning. This is the most likely "we didn\'t see it coming" disaster scenario.'
                },
                { id: 'chelyabinsk', name: 'Chelyabinsk 2013', size: '~20 m', loc: 'Russia (recorded on dashcams)', color: '#fbbf24',
                  what: 'A 20 m stony asteroid entered Earth\'s atmosphere over Chelyabinsk in February 2013, exploding ~30 km up with energy ~30× Hiroshima. The shockwave shattered windows across the city, injuring ~1,500 people (mostly from flying glass). The brightest event recorded since Tunguska. The asteroid came from a direction we couldn\'t detect — it was inside the Sun\'s glare.',
                  rate: 'Chelyabinsk-scale events: every few decades.',
                  prep: 'Major impetus for NEO programs + improved daytime + Sun-direction detection (currently a major gap).'
                },
                { id: 'apophis', name: 'Apophis 2029 close approach', size: '~370 m', loc: 'Will pass 31,000 km from Earth (closer than geostationary satellites)', color: '#ef4444',
                  what: '99942 Apophis is a peanut-shaped asteroid ~370 m long. On April 13 2029, it will pass within 31,000 km of Earth — visible to the naked eye in some locations. The closest approach of an object this large in recorded history. After 2 decades of refinement, current trajectory shows NO impact this century. Will be intensively studied during the close approach.',
                  rate: 'Apophis-scale (300+ m) impacts: every ~100,000 years. Would cause regional-scale devastation.',
                  prep: 'Already on the radar for years; example of NEO surveillance working as designed.'
                },
                { id: 'chicxulub', name: 'Chicxulub 66 Mya (dinosaur killer)', size: '~10-15 km', loc: 'Yucatán, Mexico', color: '#7f1d1d',
                  what: 'A 10-15 km asteroid struck shallow ocean off the Yucatán Peninsula at the end of the Cretaceous. Energy ~100 million megatons. Initial fireball, then megatsunami, then global wildfires (from ejecta re-entering as molten rock), then years of "impact winter" from sulfur + dust in the stratosphere blocking sunlight. Killed ~75% of all species — every non-avian dinosaur + most marine life. Cleared the way for mammals.',
                  rate: 'Chicxulub-scale (10+ km) impacts: every ~100 million years. Civilizationally + ecologically catastrophic.',
                  prep: 'We can detect these. The challenge is having decades of warning AND a way to deflect a body that massive.'
                },
                { id: 'dart', name: 'DART mission 2022 (first deflection test)', size: '160 m target', loc: 'Dimorphos asteroid', color: '#22c55e',
                  what: 'NASA\'s Double Asteroid Redirection Test crashed a ~570 kg spacecraft into the asteroid Dimorphos (a moon of the larger asteroid Didymos) at 22,500 km/h on September 26 2022. Successfully shortened Dimorphos\'s orbit around Didymos by 32 minutes — proving humanity can deflect an asteroid for the first time. Even a small change applied years in advance is enough to deflect a future impactor.',
                  rate: '(Mission cadence, not threat cadence) ESA\'s Hera follow-up arrives at Dimorphos in 2026 to assess crater + ejecta in detail.',
                  prep: 'The technology works. The remaining challenges: detection (knowing what\'s coming far enough in advance), AND political will + international coordination (no single nation should unilaterally deflect a planet-threatening asteroid).'
                }
              ];
              var sel = IMPACTS.find(function(i) { return i.id === d.selectedImpact; }) || IMPACTS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Earth has been struck by asteroids + comets throughout its history. Most are too small to matter. A few are big enough to wreck a region, a civilization, or an ecosystem. Unlike most natural hazards, asteroid impacts are PREVENTABLE — if we see them coming far enough in advance + take action.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  IMPACTS.map(function(i) {
                    var active = (d.selectedImpact || IMPACTS[0].id) === i.id;
                    return h('button', { key: i.id,
                      onClick: function() { upd({ selectedImpact: i.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? i.color + '33' : '#1e293b', border: '1px solid ' + (active ? i.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    },
                      h('div', null, i.name),
                      h('div', { style: { fontSize: 10, opacity: 0.75, fontWeight: 500, marginTop: 2 } }, i.size)
                    );
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8 } }, sel.size + ' · ' + sel.loc),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What happened / will happen'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How often'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.rate)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Preparedness state'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.prep)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Current detection programs: '),
                  'NASA + ESA + amateur observatories worldwide. NASA\'s Center for NEO Studies tracks ~35,000+ known near-Earth asteroids (as of 2024). The Catalina Sky Survey, Pan-STARRS, ATLAS find dozens of new ones per month. The Vera C. Rubin Observatory (Chile, first light 2025) is expected to find tens of thousands more in its first few years. The Sun-direction "blind spot" remains a major gap; NASA\'s NEO Surveyor space telescope (launching 2027-28) will close it.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                  h('strong', null, 'Deflection options: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.65 } },
                    h('li', null, h('strong', null, 'Kinetic impactor: '), 'Crash a spacecraft into it (DART approach). Most mature option. Effective with years of warning.'),
                    h('li', null, h('strong', null, 'Gravity tractor: '), 'Park a heavy spacecraft alongside the asteroid + use its tiny gravity to nudge over years. Slow but precise.'),
                    h('li', null, h('strong', null, 'Nuclear standoff: '), 'Detonate a nuclear device NEAR (not on) the asteroid; the ablation push deflects it. Theoretically powerful, politically + technically fraught.'),
                    h('li', null, h('strong', null, 'Last-resort fragmentation: '), 'Direct nuclear hit if all else fails + impact is imminent. Risk: fragments could still hit + spread the damage.')
                  )
                )
              );
            })(),
            '#dc2626'
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // INDIGENOUS SKY
      // ──────────────────────────────────────────────────────────────
      function renderIndigenous() {
        var selected = INDIGENOUS_SKY.find(function(t) { return t.id === d.selectedTradition; }) || INDIGENOUS_SKY[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.7 } },
            'Every people on Earth has looked up and named what they saw. The Greek-Roman tradition is one tradition among many, and it is not even the oldest. Indigenous astronomical knowledge encodes navigation, seasonal cycles, ceremony, law, and ethics. It is living knowledge, not historical curiosity.'
          ),
          softNote('At King Middle in Portland, Maine, the Wabanaki sky stories are the local tradition. Learn from Penobscot Nation, Passamaquoddy Tribe, Maliseet, Mi\'kmaq, or Abenaki cultural educators for first-hand teaching. The teachings here are introductions, not substitutes for that direct learning.'),

          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            INDIGENOUS_SKY.map(function(t) {
              var active = d.selectedTradition === t.id;
              return h('button', {
                key: t.id,
                onClick: function() { upd({ selectedTradition: t.id }); },
                style: {
                  padding: '6px 12px', borderRadius: 8,
                  background: active ? 'rgba(245,158,11,0.20)' : '#1e293b',
                  border: '1px solid ' + (active ? '#f59e0b' : '#334155'),
                  color: active ? '#fbbf24' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer'
                }
              }, t.tradition);
            })
          ),

          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('h3', { style: { margin: '0 0 2px', color: '#fbbf24', fontSize: 18 } }, selected.tradition),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 12 } }, selected.region),
            selected.stories.map(function(s, i) {
              return h('div', { key: i, style: { marginBottom: 10, paddingBottom: 8, borderBottom: i < selected.stories.length - 1 ? '1px dashed #334155' : 'none' } },
                h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } }, s.title),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, s.text)
              );
            }),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'For deeper learning'),
              h('div', { style: { fontSize: 12, color: '#dcfce7', lineHeight: 1.6 } }, selected.practical)
            )
          ),
          crossCulturalTraditionsSection()
        );

        function crossCulturalTraditionsSection() {
          var TRADS = [
            { id: 'polynesian', name: 'Polynesian wayfinding', region: 'Pacific Ocean', emoji: '🌊',
              what: 'Pacific Islanders crossed the world\'s largest ocean (more than 3000 km between many island groups) without compasses, sextants, or written maps. Navigators carried in their heads a star compass of ~32 points marking the rising + setting positions of major stars (Hawaiki, Mahiku, Hokuleia, etc.), seasonal wind patterns, ocean swell directions, bird flight paths to land, the color + temperature of water, and cloud formations over islands. This knowledge was transmitted orally over generations.',
              proof: 'The Polynesian Voyaging Society\'s replica double-hulled canoe Hokulea has sailed throughout the Pacific since 1976 using only traditional wayfinding under master navigator Mau Piailug (Satawal Island, Micronesia) + later Nainoa Thompson (Hawaii). Hokulea\'s 2014-2017 worldwide voyage (Malama Honua) circumnavigated Earth without modern instruments, confirming the methods that brought the first Polynesians to Hawaii, New Zealand, and Easter Island.',
              limit: 'Wayfinding knowledge was nearly lost between 1800 + 1976; colonial suppression + missionary schools systematically erased it. The current revival relies on a few elders + their students; the chain of transmission was threatened + remains fragile. The Polynesian Voyaging Society works actively with Pacific communities to restore + extend this knowledge.'
            },
            { id: 'egyptian', name: 'Ancient Egyptian astronomy', region: 'Nile valley, 3000 BCE-300 CE', emoji: '☥',
              what: 'Egyptians used the heliacal rising of Sirius (Sopdet) to predict the annual Nile flood — the most economically consequential single piece of astronomical knowledge of the ancient world. Their calendar of 365 days (12 months of 30 days + 5 epagomenal days) was the basis for the later Julian + Gregorian calendars. The Decanal stars (36 star clusters rising at 10-day intervals through the year) marked time for the dead in the afterlife. The Pyramid Texts contain extensive astronomical references. The Dendera Zodiac (Greco-Egyptian, ~50 BCE) is the oldest surviving relatively complete zodiac.',
              proof: 'Pyramids are precisely aligned to cardinal directions (within ~0.06° for the Great Pyramid of Khufu) — implying methodical observation of celestial alignments. Egyptian astronomical knowledge was transmitted to Greece (via Thales + Pythagoras visiting Egypt) + influenced the development of Greek astronomy.',
              limit: 'The Egyptian astronomical record is fragmentary; much was destroyed in the fires of the Library of Alexandria (multiple times, 48 BCE through 642 CE). The 365-day calendar drifted ~1 day every 4 years (no leap year correction) until the Roman period.'
            },
            { id: 'mesopotamian', name: 'Babylonian + Mesopotamian', region: 'Modern Iraq, 1800 BCE-100 CE', emoji: '🏛️',
              what: 'The Babylonians invented systematic astronomical observation. They recorded eclipses, planetary positions, and conjunctions on clay tablets for over 1500 years — one of the longest continuous scientific datasets in human history. They divided the day into hours, the hour into 60 minutes, and the circle into 360 degrees (still our base-60 timekeeping). They named the 12 zodiac signs we still use. They predicted lunar eclipses centuries in advance using the Saros cycle (18 years, 11 days, 8 hours) — discovered ~600 BCE. The MUL.APIN tablets (~1000 BCE) are the oldest comprehensive star catalogs.',
              proof: 'Babylonian eclipse predictions matched observations to within hours, which is remarkable given they had no modern physics. The records were inherited by Greek astronomers (Ptolemy, Hipparchus) + form the foundation of Western astronomy. Without Babylonian data Hipparchus could not have discovered precession of the equinoxes.',
              limit: 'The Babylonian system was procedural — they could predict eclipses without knowing WHY. Their model of the universe was tied to religion + omens; astronomy + astrology were inseparable in their tradition. The line between "they knew" and "they recorded that something repeated" is sometimes hard to draw cleanly.'
            },
            { id: 'chinese', name: 'Chinese astronomy', region: 'China, 1500 BCE-present', emoji: '🐉',
              what: 'Chinese astronomers kept the world\'s most continuous astronomical record — eclipse + supernova + comet observations span ~3000 years. Their records of the 1054 CE supernova (Tianguan-keshing, "guest star") are the primary historical record of what is now the Crab Nebula + the Crab Pulsar. They observed Halley\'s Comet regularly back to ~240 BCE. They mapped 283 constellations divided into 4 quadrants of 7 lunar mansions each, fundamentally different from Western constellation patterns. The Beijing Ancient Observatory operated continuously from 1442 until 1929. The Su Song astronomical clock tower (1090 CE) is widely considered one of the most sophisticated mechanical devices of medieval times.',
              proof: 'The Chinese 1054 supernova record allowed modern astronomers to date the Crab Nebula expansion + the pulsar age. Crab is one of the most-studied objects in modern astronomy + the Chinese observation IS the calibration point. Their long comet records + lunar/solar eclipse records remain useful primary sources for studying solar activity + Earth\'s rotation deceleration.',
              limit: 'Imperial Chinese astronomy was a state enterprise tied to dynastic legitimacy + omen interpretation. Reporting unfavorable omens could be politically dangerous; some records may have been edited. The system was conservative + slow to adopt heliocentrism + Newtonian physics; Jesuit missionaries brought European astronomy in the 17th century but Chinese astronomy did not fully integrate it until the 19th.'
            },
            { id: 'maya', name: 'Maya astronomy', region: 'Mesoamerica, 200-900 CE peak', emoji: '🐆',
              what: 'The Classic Maya developed sophisticated astronomical knowledge linked to a complex calendrical system. Their Venus tables (Dresden Codex, ~1100 CE compilation of earlier data) predict the heliacal risings of Venus to within a day over ~104 years. Their Long Count calendar combined 5 cycles (k\'in, winal, tun, k\'atun, b\'ak\'tun) to give precise long-range dates. They observed solar + lunar eclipses, equinoxes, solstices, and Venus + Mars + Mercury cycles. The El Caracol observatory at Chichen Itza is precisely aligned to Venus extremes; Tikal + Palenque structures align with solstices.',
              proof: 'Maya Venus predictions match modern calculations to better than 0.1% over centuries. Their accuracy in predicting eclipses + the Venus cycle was equal to or better than contemporary European astronomy. Modern Maya communities (Yucatec, K\'iche\', Q\'eqchi\', many others) maintain elements of this calendrical knowledge to this day.',
              limit: 'The "2012 Maya apocalypse" was a Western misinterpretation. The end of a b\'ak\'tun was a calendar reset, not a doomsday — the way our Y2K was the end of a millennium without being the end of the world. Maya scholars + Maya descendants both spent years correcting this New-Age misreading. Honor the actual sophistication of the tradition rather than the projected mysticism.'
            },
            { id: 'aboriginal', name: 'Aboriginal Australian', region: 'Australia, 60000+ BCE-present', emoji: '🌌',
              what: 'Aboriginal Australian sky knowledge is plausibly the oldest continuous astronomical tradition on Earth — some sky stories may be 60,000+ years old, with corroborating evidence in ethnographic + archaeoastronomical analysis. The Emu in the Sky is a DARK-cloud constellation (silhouetted against the Milky Way) extending from the Coalsack to Scorpius — readable across multiple Aboriginal nations + only visible because the southern Milky Way is much richer than the northern. Aboriginal traditions encode information about meteor showers, supernovae (the Boorong people\'s observation of a "red star" in 1844 may be a long-period variable), eclipses, and tides linked to the moon.',
              proof: 'Anthropologist Duane Hamacher + colleagues have systematically documented Aboriginal astronomical knowledge with sky correlations. The Wardaman traditions about Eta Carinae outburst dates fit the historical record. The continuous transmission across tens of thousands of years (longer than any other human cultural tradition) is supported by genetic + archaeological evidence of population continuity.',
              limit: 'Much Aboriginal sky knowledge was suppressed by colonial Australia (forced child removal, mission schools, English-only laws); recovery work is ongoing + sometimes contested. Different Aboriginal nations have DIFFERENT astronomical traditions — there is no monolithic "Aboriginal astronomy." Respect specific traditions to specific communities; some knowledge is restricted + not for outside audiences.'
            },
            { id: 'islamic', name: 'Islamic Golden Age astronomy', region: 'Cordoba, Baghdad, Damascus, Samarkand, 800-1500 CE', emoji: '☪️',
              what: 'Between 800 + 1500 CE, scholars working in Arabic produced the most sophisticated astronomy of the medieval world. Al-Battani (c.858-929) measured the length of the year to within minutes; his data was still used by Copernicus. Ibn al-Haytham (965-1040) founded modern optics + critiqued Ptolemy\'s lunar model. Al-Tusi (1201-1274) developed the Tusi couple — a geometric construction later used by Copernicus + Galileo. Ulugh Beg (Samarkand, 1394-1449) built the Samarkand Observatory with a 40-meter-tall sextant + produced a star catalog of 1018 stars matching Hipparchus + Ptolemy in precision. Most modern star names (Aldebaran, Algol, Altair, Vega, Rigel, Betelgeuse, Deneb) are from Arabic.',
              proof: 'European astronomy from Copernicus onward rests on Islamic mathematical innovations. The Tusi couple, the trigonometry of al-Battani + al-Khwarizmi, and the Arabic translations of Greek + Indian astronomy preserved knowledge that would otherwise have been lost. "Almagest" (Ptolemy\'s textbook) survives in its Arabic form; "algebra" is from Arabic al-jabr; "algorithm" is from al-Khwarizmi.',
              limit: 'The Islamic Golden Age in astronomy is often invisible in Western curricula. Multiple cultural + political factors slowed the tradition after ~1500 (Mongol invasions, Ottoman consolidation, European intellectual centralization). Some accounts romanticize a continuous "decline narrative" that does not reflect the actual range + complexity of post-1500 Islamic scientific work. Honest history shows multi-century scientific activity across the Islamic world, with varying degrees of state + scholarly support, that contributed substantially to global astronomy.'
            },
            { id: 'inca', name: 'Inca astronomy', region: 'Andes, 1400-1533 CE peak', emoji: '🏔️',
              what: 'Inca astronomy was woven into both agricultural cycles + state ceremony. Cusco was laid out so that 41 ceque (sight lines) radiated from the Coricancha (Temple of the Sun) to mark celestial alignments + ritual paths. The Inti Raymi (Festival of the Sun) marked the June solstice. The Pleiades (Qollqa, "the storehouse") helped predict the rainy season — if they appeared dim at heliacal rising in June, drought was expected. Modern research has confirmed that Pleiades visibility is actually correlated with El Niño / La Niña years via high-altitude cirrus clouds, validating the indigenous observational technique. The Inca recognized DARK constellations in the Milky Way (the llama, the fox, the toad) alongside the bright-star patterns.',
              proof: 'The Inti Raymi celebration continues in modern Cusco (~250,000 attendees annually). Pleiades-as-rainfall-predictor was independently confirmed by Orlove + colleagues (2000) in a Nature paper showing the ENSO connection. Andean farmers in remote villages continue to use these methods alongside modern weather forecasts.',
              limit: 'Most Inca astronomical records were destroyed by Spanish conquest + the Inquisition. Sources are reconstructed from colonial Spanish chronicles, Quechua oral tradition, and archaeoastronomical alignment studies. Specifics are sometimes contested; the broad pattern (sophisticated calendrical astronomy linked to agriculture + state ritual) is solidly established. Honor what we have + acknowledge what was lost.'
            }
          ];
          var sel = d.selectedTrad || 'polynesian';
          var topic = TRADS.find(function(t) { return t.id === sel; }) || TRADS[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#fbbf24', fontSize: 16 } }, '🌐 Cross-cultural astronomy traditions'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'Western astronomy is one tradition among many. Cultures across every continent independently developed astronomical knowledge linked to agriculture, navigation, ritual, calendar-keeping, and pure observation. Some of these traditions remain active today; others were suppressed, lost, or are being recovered by descendant communities + scholars. Honoring this diversity is intellectual honesty AND practical: indigenous astronomical observations are sometimes the longest single-source datasets we have.'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              TRADS.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedTrad: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#fbbf24' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #fbbf24' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#fbbf24', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, topic.region),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What the tradition knew'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.what)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Evidence + impact'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.proof)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.06)', borderLeft: '3px solid #a78bfa' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Honest limits + framing'),
                h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.limit)
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
              h('strong', null, 'Why this section matters: '),
              'Reducing "real" astronomy to Western tradition both impoverishes the curriculum + erases knowledge that took millennia to develop. The Polynesian wayfinding revival, the Aboriginal sky-story documentation projects, the Maya descendant calendrical work, and the recovery of Inca + indigenous astronomy globally all matter intellectually + ethically. Wabanaki sky stories are covered separately in this same tab — they are part of THIS continent\'s deep astronomical heritage that students at King Middle can encounter close to home.'
            )
          );
        }
      }

      // ──────────────────────────────────────────────────────────────
      // HISTORY OF ASTRONOMY
      // ──────────────────────────────────────────────────────────────
      function renderHistory() {
        var FIGURES = [
          { id: 'aristarchus', name: 'Aristarchus of Samos', years: '~310-230 BCE', color: '#7c3aed',
            did: 'Proposed the first known heliocentric model — Earth orbits the Sun, not the other way. Estimated the Sun is much larger + farther than the Moon.',
            tools: 'Geometry + lunar eclipse observations. Used the angle of half-Moon illumination to estimate Sun-Earth vs Moon-Earth distance ratio (got the geometry right but underestimated by ~20× because the angle was so close to 90° that small errors compounded).',
            why: 'For ~1,800 years his model was rejected — Earth was assumed stationary by Aristotle, Ptolemy, and most authorities. The geocentric model fit appearances better given available measurement precision. Aristarchus was ahead of the available evidence.',
            legacy: 'When Copernicus revived heliocentrism in 1543, he explicitly credited Aristarchus.'
          },
          { id: 'copernicus', name: 'Nicolaus Copernicus', years: '1473-1543', color: '#3b82f6',
            did: '"De revolutionibus orbium coelestium" (1543) — re-proposed the Sun at the center of the universe with Earth as a planet orbiting it. The "Copernican Revolution" started here.',
            tools: 'Naked-eye astronomy + extensive geometric models. Published only at the end of his life, partly to avoid Church controversy.',
            why: 'Copernicus retained the ancient assumption that orbits were perfect circles, so his model was no more accurate than Ptolemy\'s — it had nothing observational over the geocentric system. His radical contribution was conceptual: putting Earth in motion.',
            legacy: 'Triggered the Scientific Revolution. By the time Galileo + Kepler refined the model, it had become unanswerable.'
          },
          { id: 'tycho', name: 'Tycho Brahe', years: '1546-1601', color: '#0ea5e9',
            did: 'Built the largest naked-eye astronomical observatory in human history at Uraniborg (Denmark). Compiled positional measurements ~20× more accurate than any previous record.',
            tools: 'Huge sextants + quadrants — some as large as a house. No telescope (telescope was invented in 1608, after his death). His mural quadrant had a radius of 2 meters, allowing precision to ~30 arcseconds.',
            why: 'Pre-telescope precision was limited by the sharpness of human eyesight (~1 arcminute). Tycho built such large instruments that minor angular displacements translated to readable centimeters on the rim. His data was the indispensable foundation for Kepler.',
            legacy: 'Without Tycho\'s 40 years of meticulous data, Kepler could not have discovered the laws of planetary motion. He proposed a hybrid model (Sun orbits Earth; other planets orbit the Sun) — incorrect but understandable given his evidence.'
          },
          { id: 'kepler', name: 'Johannes Kepler', years: '1571-1630', color: '#10b981',
            did: 'Three laws of planetary motion: (1) planets orbit in ELLIPSES with the Sun at one focus, not circles; (2) planets sweep equal areas in equal times; (3) the square of orbital period is proportional to the cube of semi-major axis.',
            tools: 'Tycho\'s data + relentless calculation. Spent years fitting Mars\'s motion to a circle + failing by 8 arcminutes — concluded the orbit must be non-circular. Recognized the ellipse only after exhaustive attempts.',
            why: 'Kepler\'s laws are EMPIRICAL — they describe what planets do without explaining why. He was unable to derive them from first principles. He did however suggest gravity might be involved — anticipating Newton.',
            legacy: 'First mathematical laws governing the heavens. The 1:1 link between observation + mathematical theory inaugurated modern science.'
          },
          { id: 'galileo', name: 'Galileo Galilei', years: '1564-1642', color: '#fbbf24',
            did: 'First to use the newly-invented telescope (1609) for astronomy. Discovered: mountains + craters on the Moon, the four largest moons of Jupiter, the phases of Venus (proved it orbits the Sun), sunspots, the Milky Way as countless faint stars.',
            tools: 'A 20× refracting telescope of his own design (improving on the original 1608 Dutch invention). Later 30×.',
            why: 'Each of his discoveries was an observational nail in the coffin of geocentrism. Jupiter\'s moons (1610) showed not everything orbits Earth. The phases of Venus proved Venus orbits the Sun. The Moon\'s surface showed celestial bodies were NOT perfect or different in kind from Earth.',
            legacy: 'Tried for heresy by the Roman Inquisition (1633) for advocating heliocentrism. Forced to recant. Died under house arrest. The Vatican formally acknowledged the error in 1992 — 359 years later.'
          },
          { id: 'newton', name: 'Isaac Newton', years: '1643-1727', color: '#f97316',
            did: '"Principia Mathematica" (1687) — universal gravitation. Showed that the SAME force pulling apples to Earth governs the Moon\'s orbit, the planets\' orbits, the tides, and Kepler\'s laws. Derived Kepler\'s laws from F = G·m₁m₂/r².',
            tools: 'Mathematics, including the calculus he co-invented with Leibniz. Reflecting telescope of his own design (1668) — first practical reflector + ancestor of all modern large telescopes.',
            why: 'Before Newton, celestial physics + terrestrial physics were separate domains. Newton unified them. The Moon falls toward Earth in the same way an apple does — just sideways fast enough to keep missing.',
            legacy: 'Newtonian mechanics dominated physics for ~220 years. Even today it is accurate enough for almost everything in everyday life + most engineering. Einstein refined it; he did not overturn it.'
          },
          { id: 'herschel', name: 'William + Caroline Herschel', years: '1738-1822 / 1750-1848', color: '#a855f7',
            did: 'Discovered Uranus (1781) — the first new planet found since prehistory. Built the largest telescopes of their day. William cataloged thousands of nebulae + double stars. Caroline discovered 8 comets + co-authored major catalogs.',
            tools: 'Reflecting telescopes built by hand. William\'s 40-foot telescope (1789) had a primary mirror 1.2 m across — the largest in the world for 50 years.',
            why: 'Together they essentially founded deep-sky astronomy. Caroline was the first woman paid for scientific work in Britain. Their nebula catalog is the basis of the modern NGC + IC catalogs.',
            legacy: 'The Herschel name is among the most cited in astronomy. The James Webb Space Telescope\'s mirror is ~100× the area of William\'s 40-foot — the lineage runs unbroken.'
          },
          { id: 'leavitt', name: 'Henrietta Swan Leavitt', years: '1868-1921', color: '#ec4899',
            did: 'Discovered the period-luminosity relation for Cepheid variable stars (1908, 1912). Showed that the period of variation directly indicates absolute brightness — enabling distance measurement out to other galaxies.',
            tools: 'Photographic plates from the Harvard College Observatory. Hired as a "computer" — a category of low-paid (mostly female) workers who measured + cataloged plates. Leavitt examined ~2,400 variables in the Magellanic Clouds.',
            why: 'Before her: galaxies could not be measured. After: Hubble (1924) used Cepheids in the Andromeda nebula to prove it lay outside the Milky Way → other galaxies exist → the universe is vastly larger than thought.',
            legacy: 'Died at 53 from cancer. Was being considered for a Nobel nomination (which she would likely have shared with Hubble for the expanding universe), but Nobel rules forbid posthumous awards. Her work remains the foundational rung of the cosmic distance ladder.'
          },
          { id: 'hubble', name: 'Edwin Hubble', years: '1889-1953', color: '#ef4444',
            did: 'Two world-changing discoveries: (1) using Leavitt\'s Cepheid relation, proved that other galaxies exist beyond the Milky Way (1924, ending the "Great Debate"). (2) discovered the universe is EXPANDING (1929, "Hubble\'s Law" — recession velocity proportional to distance).',
            tools: '100-inch Hooker telescope at Mt. Wilson (then the largest in the world). Photographic plates + spectra.',
            why: 'Hubble\'s law was the key empirical evidence for the Big Bang. The further a galaxy is, the faster it recedes — meaning everything was closer in the past. Run the clock backward → all matter compressed into a hot dense state.',
            legacy: 'The Hubble Space Telescope was named for him (launched 1990, still operating). His observational program continues today as one of astronomy\'s great enterprises. Recent measurements show his "Hubble constant" disagrees by ~9% between the CMB + local-universe methods — the "Hubble tension," still unresolved.'
          },
          { id: 'modern', name: 'Modern era', years: '1950-now', color: '#94a3b8',
            did: 'Discovery of: the cosmic microwave background (Penzias + Wilson, 1964 — Big Bang confirmation). Pulsars (Jocelyn Bell Burnell, 1967 — accident during PhD work). Cosmic acceleration + dark energy (Perlmutter + Schmidt + Riess, 1998 — Nobel 2011). First exoplanet around a Sun-like star (Mayor + Queloz, 1995 — Nobel 2019). First image of a black hole (Event Horizon Telescope, 2019). First gravitational-wave detection (LIGO 2015 — Nobel 2017). JWST first light (2022).',
            tools: 'Radio telescopes, space telescopes, gravitational-wave interferometers, neutrino observatories, X-ray + gamma-ray detectors. Each new window into the cosmos has revealed something unexpected.',
            why: 'Astronomy went from solving the solar system to mapping the universe — to confronting cosmological questions we don\'t yet have the physics to answer (dark matter, dark energy, why anything exists).',
            legacy: 'Open questions for the next century: what IS dark matter? What is dark energy? Is there life beyond Earth? Why are the laws of physics what they are? The instruments are now so sensitive that we are limited mostly by our theory.'
          }
        ];
        var sel = FIGURES.find(function(f) { return f.id === d.selectedHistFig; }) || FIGURES[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('🔭 Astronomy through the millennia',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'Modern astronomy stands on the shoulders of two thousand years of patient observation + creative theory. Each named figure here moved the field forward through a particular kind of effort: brilliant mathematical insight, decades of meticulous data, or the courage to follow data wherever it led — even against authority.'
            ),
            INDIGO
          ),
          sectionCard('Ten figures who changed how we understand the universe',
            h('div', null,
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                FIGURES.map(function(f) {
                  var active = (d.selectedHistFig || FIGURES[0].id) === f.id;
                  return h('button', { key: f.id,
                    onClick: function() { upd({ selectedHistFig: f.id }); },
                    style: { padding: '8px 12px', borderRadius: 8, background: active ? f.color + '33' : '#1e293b', border: '1px solid ' + (active ? f.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                  }, f.name);
                })
              ),
              h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', borderTop: '1px solid #334155', borderRight: '1px solid #334155', borderBottom: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap' } },
                  h('div', { style: { fontSize: 16, fontWeight: 800, color: sel.color } }, sel.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, sel.years)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What they did'),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, sel.did)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Tools + methods'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.tools)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Why it mattered'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.why)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Legacy'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.legacy)
                )
              )
            ),
            INDIGO
          ),
          sectionCard('🧭 Whose names are missing — and why',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } },
                'The "Great Men" history of astronomy systematically erased many contributors. The Harvard "computers" of the late 19th + early 20th century — including Annie Jump Cannon (classified ~400,000 stars by spectrum, invented the OBAFGKM system), Williamina Fleming, Antonia Maury — did the foundational work that named astronomers got credit for. Cecilia Payne-Gaposchkin\'s 1925 PhD thesis showed that stars are mostly hydrogen — a result so radical it was initially discouraged from publication; later credited.'
              ),
              h('p', { style: { margin: '0 0 8px' } },
                'Indigenous astronomical traditions across the world (Wabanaki + Lakota + Maori + Aboriginal Australian + many others, covered in the Sky Traditions tab) are at least as old as written-record astronomy + were systematically dismissed by colonial scientists. The Polynesian wayfinding tradition navigated thousands of miles of open ocean using only star positions, swells, and bird flight — a sophisticated practical astronomy mostly absent from Western histories.'
              ),
              h('p', { style: { margin: 0 } },
                'Modern astronomy is increasingly diverse but progress remains uneven. Naming this history honestly is part of doing science honestly.'
              )
            ),
            '#94a3b8'
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // OBSERVING
      // ──────────────────────────────────────────────────────────────
      function renderObserve() {
        var bortle = BORTLE.find(function(b) { return b.class === d.bortleClass; }) || BORTLE[4];

        // Telescope ray-diagram simulator
        function telescopeSim() {
          var type = d.scopeType || 'refractor';
          var aperture = d.scopeAperture || 100;  // mm
          var focalLen = d.scopeFocalLen || 1000;  // mm objective focal length
          var eyepieceFl = d.eyepieceFl || 25;     // mm eyepiece focal length

          // Calculations
          var magnification = focalLen / eyepieceFl;
          var focalRatio = focalLen / aperture; // "f/N"
          var eyePupilMm = 6;                    // typical dark-adapted pupil
          var lightGather = (aperture * aperture) / (eyePupilMm * eyePupilMm); // vs naked eye
          var exitPupil = aperture / magnification; // mm
          var resolveDawes = 116 / aperture;       // Dawes limit in arcseconds (for visible light)
          var limMag = 2 + 5 * Math.log10(aperture); // approximate limiting magnitude
          var maxMag = aperture * 2;               // max useful magnification (~2x aperture in mm)

          // Render SVG ray diagram
          function refractorSvg() {
            return h('svg', { viewBox: '0 0 600 220', width: '100%', height: 220, role: 'img', 'aria-labelledby': 'refractorT refractorD' },
              h('title', { id: 'refractorT' }, 'Refractor telescope ray diagram'),
              h('desc', { id: 'refractorD' }, 'A refractor telescope uses an objective lens to focus parallel light from a distant object to a focal point, where an eyepiece lens magnifies it to the eye. ' + aperture + ' mm aperture, ' + focalLen + ' mm focal length, magnification ' + magnification.toFixed(0) + ' times.'),
              // Tube
              h('rect', { x: 50, y: 80, width: 480, height: 60, fill: 'none', stroke: '#475569', strokeWidth: 1.5 }),
              // Star light arrows (parallel rays from infinity)
              [90, 100, 110, 120, 130].map(function(y, i) {
                return h('g', { key: 'r' + i },
                  h('line', { x1: 0, y1: y, x2: 80, y2: y, stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: i % 2 ? '4 2' : null }),
                  h('polygon', { points: '78,' + (y - 3) + ' 78,' + (y + 3) + ' 84,' + y, fill: '#fbbf24' })
                );
              }),
              h('text', { x: 6, y: 75, fill: '#fde68a', fontSize: 10 }, 'Light from a star →'),
              // Objective lens (biconvex, at x=80)
              h('ellipse', { cx: 80, cy: 110, rx: 4, ry: 30, fill: '#7dd3fc', opacity: 0.55, stroke: '#0ea5e9', strokeWidth: 1.5 }),
              h('text', { x: 80, y: 60, textAnchor: 'middle', fill: '#bae6fd', fontSize: 9, fontWeight: 700 }, 'Objective lens'),
              h('text', { x: 80, y: 162, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, aperture + ' mm aperture'),
              // Convergent rays from objective to focal point
              [90, 110, 130].map(function(y, i) {
                return h('line', { key: 'c' + i, x1: 84, y1: y, x2: 420, y2: 110, stroke: '#fbbf24', strokeWidth: 1, opacity: 0.85 });
              }),
              // Focal point marker
              h('circle', { cx: 420, cy: 110, r: 3, fill: '#fde68a' }),
              h('text', { x: 420, y: 75, textAnchor: 'middle', fill: '#fde68a', fontSize: 9, fontWeight: 700 }, 'Focal plane'),
              h('text', { x: 420, y: 162, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'fl = ' + focalLen + ' mm'),
              // Focal length dimension
              h('line', { x1: 80, y1: 175, x2: 420, y2: 175, stroke: '#64748b', strokeWidth: 0.5 }),
              // Eyepiece (smaller biconvex at x=460)
              h('ellipse', { cx: 460, cy: 110, rx: 3, ry: 16, fill: '#86efac', opacity: 0.55, stroke: '#22c55e', strokeWidth: 1.5 }),
              h('text', { x: 460, y: 80, textAnchor: 'middle', fill: '#bbf7d0', fontSize: 9, fontWeight: 700 }, 'Eyepiece'),
              h('text', { x: 460, y: 175, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, eyepieceFl + ' mm'),
              // Rays diverging from eyepiece into eye
              [97, 110, 123].map(function(y, i) {
                return h('line', { key: 'div' + i, x1: 462, y1: 110, x2: 555, y2: y, stroke: '#fbbf24', strokeWidth: 1, opacity: 0.85 });
              }),
              // Eye
              h('circle', { cx: 565, cy: 110, r: 14, fill: 'none', stroke: '#cbd5e1', strokeWidth: 1.5 }),
              h('circle', { cx: 565, cy: 110, r: 4, fill: '#1e293b' })
            );
          }

          function reflectorSvg() {
            // Newtonian reflector: primary concave mirror at far end, light comes IN, bounces off primary,
            // hits secondary mirror, exits side to eyepiece
            return h('svg', { viewBox: '0 0 600 220', width: '100%', height: 220, role: 'img', 'aria-labelledby': 'reflectorT reflectorD' },
              h('title', { id: 'reflectorT' }, 'Newtonian reflector ray diagram'),
              h('desc', { id: 'reflectorD' }, 'A Newtonian reflector uses a concave primary mirror at the back end of the tube to focus light forward to a flat secondary mirror, which reflects it out the side to an eyepiece. ' + aperture + ' mm aperture, ' + focalLen + ' mm focal length, magnification ' + magnification.toFixed(0) + ' times.'),
              // Tube
              h('rect', { x: 50, y: 80, width: 480, height: 60, fill: 'none', stroke: '#475569', strokeWidth: 1.5 }),
              // Star light enters from the left
              [88, 102, 116, 128].map(function(y, i) {
                return h('g', { key: 'r' + i },
                  h('line', { x1: 0, y1: y, x2: 470, y2: y, stroke: '#fbbf24', strokeWidth: 1, opacity: 0.85 })
                );
              }),
              h('text', { x: 6, y: 75, fill: '#fde68a', fontSize: 10 }, 'Light enters →'),
              // Primary concave mirror (curved shape at far right inside tube)
              h('path', { d: 'M 500,84 Q 480,110 500,136 L 510,136 Q 495,110 510,84 Z', fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1.5 }),
              h('text', { x: 505, y: 60, textAnchor: 'middle', fill: '#bfdbfe', fontSize: 9, fontWeight: 700 }, 'Primary mirror'),
              h('text', { x: 505, y: 165, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, aperture + ' mm'),
              // Converging rays bouncing off primary toward secondary
              [88, 102, 116, 128].map(function(y, i) {
                return h('line', { key: 'b' + i, x1: 500, y1: y, x2: 200, y2: 110, stroke: '#fbbf24', strokeWidth: 1, opacity: 0.85, strokeDasharray: '3 2' });
              }),
              // Secondary mirror (diagonal flat at center)
              h('rect', { x: 195, y: 105, width: 14, height: 10, transform: 'rotate(45 202 110)', fill: '#fde68a', stroke: '#f59e0b', strokeWidth: 1 }),
              h('text', { x: 202, y: 100, textAnchor: 'middle', fill: '#fde68a', fontSize: 9, fontWeight: 700 }, 'Secondary'),
              // Rays leaving secondary upward to eyepiece
              h('line', { x1: 200, y1: 105, x2: 200, y2: 50, stroke: '#fbbf24', strokeWidth: 2, opacity: 0.85 }),
              // Eyepiece on top
              h('ellipse', { cx: 200, cy: 40, rx: 16, ry: 4, fill: '#86efac', opacity: 0.55, stroke: '#22c55e', strokeWidth: 1.5 }),
              h('text', { x: 230, y: 42, fill: '#bbf7d0', fontSize: 9, fontWeight: 700 }, 'Eyepiece (' + eyepieceFl + ' mm)'),
              // Eye
              h('circle', { cx: 200, cy: 20, r: 12, fill: 'none', stroke: '#cbd5e1', strokeWidth: 1.5 }),
              h('circle', { cx: 200, cy: 20, r: 3, fill: '#1e293b' }),
              // Focal length annotation
              h('text', { x: 350, y: 175, textAnchor: 'middle', fill: '#94a3b8', fontSize: 9 }, 'Focal length = ' + focalLen + ' mm')
            );
          }

          var maxOK = magnification <= maxMag;

          return h('div', null,
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' } },
              ['refractor', 'reflector'].map(function(t) {
                var active = type === t;
                return h('button', { key: t,
                  onClick: function() { upd({ scopeType: t }); },
                  style: { padding: '8px 14px', borderRadius: 8, background: active ? 'rgba(99,102,241,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#6366f1' : '#334155'), color: active ? '#c7d2fe' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                }, t === 'refractor' ? '🔭 Refractor (lens)' : '🔭 Reflector (mirror)');
              })
            ),

            h('div', { style: { padding: 10, borderRadius: 10, background: '#0a0e1a', border: '1px solid #334155', marginBottom: 12, overflow: 'hidden' } },
              type === 'refractor' ? refractorSvg() : reflectorSvg()
            ),

            // Sliders
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 12 } },
              [
                { label: 'Aperture (mm)', value: aperture, min: 50, max: 400, step: 10, key: 'scopeAperture' },
                { label: 'Focal length (mm)', value: focalLen, min: 300, max: 3000, step: 50, key: 'scopeFocalLen' },
                { label: 'Eyepiece focal length (mm)', value: eyepieceFl, min: 4, max: 40, step: 1, key: 'eyepieceFl' }
              ].map(function(s, i) {
                var patch = {}; patch[s.key] = s.value;
                return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                    h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, s.label),
                    h('span', { style: { fontSize: 13, color: INDIGO, fontWeight: 800 } }, s.value)
                  ),
                  h('input', { type: 'range', min: s.min, max: s.max, step: s.step, value: s.value,
                    onChange: (function(key) { return function(e) { var p = {}; p[key] = parseFloat(e.target.value); upd(p); }; })(s.key),
                    'aria-label': s.label,
                    style: { width: '100%', accentColor: INDIGO }
                  })
                );
              })
            ),

            // Stats
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 } },
              [
                { label: 'Magnification', value: magnification.toFixed(0) + '×', color: maxOK ? '#86efac' : '#fca5a5', sub: maxOK ? '' : 'Exceeds max useful (' + maxMag.toFixed(0) + '×)' },
                { label: 'Focal ratio', value: 'f/' + focalRatio.toFixed(1), color: '#c7d2fe', sub: focalRatio < 6 ? 'fast (wide field)' : focalRatio > 12 ? 'slow (high mag)' : 'medium' },
                { label: 'Light gathering', value: lightGather.toFixed(0) + '× eye', color: '#fde68a', sub: 'vs naked eye' },
                { label: 'Exit pupil', value: exitPupil.toFixed(1) + ' mm', color: exitPupil > 7 ? '#fca5a5' : '#86efac', sub: exitPupil > 7 ? 'too large — wastes light' : exitPupil < 0.5 ? 'too small — dim image' : 'OK' },
                { label: 'Resolution (Dawes)', value: resolveDawes.toFixed(2) + '″', color: '#c7d2fe', sub: 'arcseconds' },
                { label: 'Limiting magnitude', value: '~+' + limMag.toFixed(1), color: '#c7d2fe', sub: 'in dark sky' }
              ].map(function(s, i) {
                return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, s.label),
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: s.color, marginTop: 2 } }, s.value),
                  s.sub ? h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2, fontStyle: 'italic' } }, s.sub) : null
                );
              })
            ),

            h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.6 } },
              h('strong', null, 'Key insight: '),
              'Aperture is everything. Magnification = focal length / eyepiece focal length, but USEFUL magnification is capped at ~2× aperture in mm. Beyond that, you just magnify the blur. A 100 mm scope tops out around 200×; a 300 mm scope can usefully push to ~600×. The Dawes limit (resolution) and limiting magnitude (faintest visible) both scale with aperture, not magnification. "Bigger eye, not bigger zoom."'
            )
          );
        }

        return h('div', { style: { padding: 16 } },
          sectionCard('🔭 Tools for observing',
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 } },
              [
                { name: 'Naked eye', cost: 'Free', see: 'Constellations, the Moon, naked-eye planets (Mercury, Venus, Mars, Jupiter, Saturn), the Milky Way (in dark sky), bright deep-sky objects (Pleiades, Andromeda)', start: 'Best starting point. Learn a few constellations a month. A star chart or sky app (Stellarium is free) helps.' },
                { name: 'Binoculars', cost: '$50-200 for 7x50 or 10x50', see: 'Moon craters and mare, the four Galilean moons of Jupiter, Saturn (just barely as oval), open clusters, the Andromeda Galaxy as a fuzzy patch, hundreds of times more stars', start: 'A surprisingly underrated astronomy tool. Often better than a cheap telescope for wide views.' },
                { name: 'Telescope', cost: '$200-2000+ for serious entry', see: 'Saturn\'s rings, Jupiter\'s belts, Mars surface details, the Orion Nebula, double stars, distant galaxies', start: 'Start with binoculars first. When you upgrade: a 6-inch or 8-inch Dobsonian reflector gives the most aperture per dollar. Avoid department-store "500x magnification" scopes.' },
                { name: 'Sky apps', cost: 'Free to $5', see: 'Real-time planet positions, ISS passes, eclipse predictions, what\'s up tonight', start: 'Stellarium (free desktop + mobile), NASA Eyes (web), SkyView (mobile), Night Sky (iOS).' }
              ].map(function(t, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } }, t.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6 } }, t.cost),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', marginBottom: 6, lineHeight: 1.5 } }, h('strong', null, 'What you can see: '), t.see),
                  h('div', { style: { fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5 } }, t.start)
                );
              })
            )
          ),

          sectionCard('🌒 Light pollution: the Bortle scale',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'How dark is your sky? Most people live under sky much brighter than they realize. The Bortle scale (1-9) ranks sky darkness; class 1 is true wilderness dark sky, class 9 is inner city. Where do you live?'
              ),
              h('div', { style: { display: 'flex', gap: 4, marginBottom: 10 } },
                BORTLE.map(function(b) {
                  var active = d.bortleClass === b.class;
                  var bgColor = b.class <= 3 ? '#0f172a' : b.class <= 5 ? '#1e3a5f' : b.class <= 7 ? '#3b3b6e' : '#7c3aed';
                  return h('button', {
                    key: b.class,
                    onClick: function() { upd({ bortleClass: b.class }); },
                    'aria-label': 'Bortle class ' + b.class + ': ' + b.name,
                    style: { flex: 1, padding: '8px 4px', borderRadius: 6, background: bgColor, border: '2px solid ' + (active ? '#fbbf24' : 'transparent'), color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
                  }, String(b.class));
                })
              ),
              h('div', { style: { padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid #334155' } },
                h('div', { style: { fontSize: 14, fontWeight: 800, color: '#c7d2fe', marginBottom: 4 } }, 'Bortle ' + bortle.class + ': ' + bortle.name),
                h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 6 } }, 'Sky magnitude: ' + bortle.skyMag + ' · Limiting magnitude (faintest visible star): ' + bortle.ms),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, bortle.desc)
              ),
              h('p', { style: { margin: '10px 0 0', fontSize: 12, color: '#cbd5e1', lineHeight: 1.65 } },
                h('strong', { style: { color: '#fbbf24' } }, 'Equity note: '),
                'most US students live under Bortle 5-8 skies. The actual Milky Way is invisible to about 80% of Americans. Light-pollution dark-sky parks (Acadia in Maine, for example) are intentional preservation of this disappearing resource.'
              )
            )
          ),

          sectionCard('🔬 Interactive telescope simulator',
            telescopeSim(),
            INDIGO
          ),

          d.observingList && d.observingList.length > 0 ? sectionCard('⭐ Your observing list',
            h('div', null,
              h('p', { style: { margin: '0 0 8px', fontSize: 12, color: '#94a3b8' } }, 'Constellations you have marked to observe. Add more from the Constellations tab.'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.85 } },
                d.observingList.map(function(id, i) {
                  var c = CONSTELLATIONS.find(function(c2) { return c2.id === id; });
                  if (!c) return null;
                  return h('li', { key: i },
                    c.name + ' (' + c.season + ')',
                    h('button', {
                      onClick: function() { upd({ observingList: d.observingList.filter(function(x) { return x !== id; }) }); },
                      style: { marginLeft: 8, fontSize: 10, color: '#94a3b8', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' }
                    }, 'remove')
                  );
                })
              )
            )
          ) : null,

          // ─── Light pollution + dark-sky preservation ────────────
          sectionCard('🌃 Light pollution + dark-sky preservation',
            (function() {
              var LP_TOPICS = [
                { id: 'bortle', name: 'The Bortle scale', emoji: '🔭',
                  body: 'John Bortle\'s 9-class scale (Sky & Telescope, 2001) is the standard for describing night-sky darkness from a human-perception perspective. Class 1: excellent dark site (Milky Way casts shadows, zodiacal light is obvious, faintest naked-eye stars are magnitude 7.6-8.0; about 1% of US population lives within reach of such a site). Class 4: rural-suburban transition (Milky Way visible but reduced detail, magnitude 6.1-6.5 naked-eye limit). Class 7: suburban-urban transition (only major constellations visible, sky has noticeable orange/grey glow throughout). Class 9: inner-city sky (only the brightest 20-30 stars visible, no Milky Way at all). About 99% of Americans + Europeans live under Class 5+ skies. About 80% of the world\'s population lives under light-polluted skies; about 1/3 of humanity cannot see the Milky Way at all from where they live.',
                  caveat: 'The Bortle scale is somewhat subjective. Two observers at the same site can rate it differently based on dark-adaptation + acuity. Photometric measures (SQM, Sky Quality Meter) give numerical magnitudes per square arcsecond that are more reproducible. Modern satellite-based light-pollution maps (Falchi et al. 2016 World Atlas of Artificial Night Sky Brightness) give precise digital ratings everywhere on Earth.'
                },
                { id: 'sources', name: 'Where light pollution comes from', emoji: '💡',
                  body: 'Five primary contributors. (1) Streetlights (the largest single contributor in most urban areas; older sodium-vapor lights had broad yellow output, modern LED conversions are often whiter + more sky-glow-producing if not properly shielded). (2) Commercial signage + parking-lot lighting (often over-illuminated, on all night). (3) Sports stadium + parking ramp lighting (peaks during specific events). (4) Vehicle headlights (rising with population + commuter patterns). (5) Residential exterior lighting (porch lights, landscape lighting, decorative lighting — small per-source but cumulative across millions of homes). Recent emerging concern: SATELLITE light pollution. Starlink + similar mega-constellations are adding hundreds of thousands of bright satellite trails to astronomical exposures. The brightest are visible to the naked eye for ~1-2 hours after sunset.',
                  caveat: 'Light pollution has grown ~2% per year globally for decades, faster than population growth. The LED revolution (started ~2010) was supposed to reduce energy costs + light pollution; in practice, the cost reduction made cities INCREASE light output ("Jevons paradox" applied to illumination). Per-capita light emission has risen, not fallen, in most LED-converted cities. The technology itself was not the problem; the lack of design guidance was.'
                },
                { id: 'shielding', name: 'Solutions that actually work', emoji: '🔅',
                  body: 'Engineering fixes: (a) FULL CUT-OFF fixtures (light directed ONLY downward, no light escaping above horizontal). The IDA-approved "Dark Sky Friendly" certification specifies this. (b) WARMER LED color temperature (≤ 3000 K, ideally 2200 K amber). Cooler/whiter light (4000-6000 K) scatters more in the atmosphere + harms wildlife circadian rhythms. (c) LOWER lumen output (most outdoor lighting is over-lit by 2-5×). (d) MOTION-ACTIVATED + scheduled DIMMING (light only when needed). (e) Avoid uplighting of buildings + landscape features. Phoenix, Tucson, Flagstaff (since 1958 — the FIRST dark-sky city), and parts of Hawaii (around Mauna Kea) have effective lighting ordinances. The International Dark-Sky Association (IDA, founded 1988) certifies "International Dark-Sky Places" — about 200 communities + parks worldwide as of 2024.',
                  caveat: 'Dark-sky-friendly lighting has the same actual functional benefit (you can still see at night, walk safely, drive safely) as poorly-designed lighting + costs the same or less. The barriers are not technical. They are aesthetic + regulatory + sometimes safety-anxiety-driven (more lumens does NOT reliably improve safety; the evidence on lighting + crime + traffic safety is more mixed than commonly assumed).'
                },
                { id: 'wildlife', name: 'Effects on wildlife', emoji: '🦋',
                  body: 'Artificial light at night (ALAN) disrupts wildlife in many measured ways. SEA TURTLE hatchlings use moonlight reflection on water to navigate to the ocean; beach lighting causes them to crawl inland + die — Florida coastal communities now have seasonal "lights out" ordinances. MIGRATORY BIRDS use stars + magnetic fields to navigate; brightly-lit buildings during migration nights cause millions of bird-strike deaths annually (NYC + Chicago + Toronto have "lights out" programs during spring + fall migration). INSECTS, especially moths + fireflies + mayflies, are disoriented by lights + drained of mating energy (the "vacuum effect"). Insect decline is now well-documented globally (~75% biomass loss in some European studies over 30 years); light pollution is ONE of several contributing factors. BATS, AMPHIBIANS, FISH all show measurable behavioral disruption from ALAN.',
                  caveat: 'The wildlife case is solid + sometimes overstated. Light pollution is one of many simultaneous pressures on wildlife (habitat loss, climate change, pesticides, plastic, disease, invasive species). Reducing light pollution genuinely helps but does not by itself reverse declines. The framing should be: dark-sky measures are inexpensive, ecologically beneficial, and reduce energy costs — they should be done. They are not a singular solution to biodiversity loss.'
                },
                { id: 'health', name: 'Effects on human health', emoji: '😴',
                  body: 'Disruption of circadian rhythm by night-time light exposure is well-established. Even relatively dim bedroom light (10 lux, dimmer than typical streetlight scatter) suppresses melatonin production + delays sleep onset. Long-term shift workers have higher rates of breast cancer, prostate cancer, metabolic syndrome, depression — the WHO classifies night-shift work as a "probable carcinogen" (Group 2A) based on this evidence. For typical residents under light-polluted skies: poorer sleep quality, more sleep onset latency, more vivid morning awakenings. Children + adolescents may be particularly affected; melatonin onset shifts later, contributing to school-night sleep deficits.',
                  caveat: 'The dose-response for ALAN + chronic health outcomes is not fully characterized. Effects are probably real + small at typical light-pollution levels, more substantial for night-shift workers. Useful interventions: blackout curtains for bedrooms, eliminating bedside electronics, addressing intrusive exterior light from neighbors. School psychologists working with adolescent sleep issues should consider ambient light + screen time as one factor among several.'
                },
                { id: 'satellites', name: 'Mega-constellation problem', emoji: '🛰️',
                  body: 'Starting in 2019, SpaceX began launching the Starlink satellite mega-constellation — eventually ~12,000 satellites in low Earth orbit, with full plans for ~42,000. Amazon Kuiper + OneWeb + Chinese constellations add more. Astronomical exposures now routinely show satellite streaks across the field of view. The Rubin Observatory (a 10-year all-sky survey starting 2025) will have ~30% of its exposures crossed by satellites; cleanup software helps but cannot fully recover lost data. Bright satellites also affect dark-sky tourism + indigenous astronomy. SpaceX has implemented "DarkSat" + "VisorSat" mitigations (dark coatings, visors blocking sunlight reflections) that have reduced visibility ~50%, helpful but not a full solution.',
                  caveat: 'There is no international body that can regulate satellite reflectivity. The FCC licenses US satellite operators but lacks dark-sky authority. The IAU created a Centre for the Protection of the Dark and Quiet Sky from Satellite Constellation Interference in 2022, but it is advisory only. This problem will keep growing without a coordinated regulatory framework. Astronomy is increasingly negotiating with industry rather than pure science.'
                },
                { id: 'maine', name: 'Maine has real dark skies', emoji: '🌲',
                  body: 'Northern + interior Maine (Aroostook, Piscataquis, parts of Washington county) still have Bortle Class 2-3 skies — the darkest in the northeastern US. Cobscook Bay State Park, Katahdin Woods + Waters National Monument, Acadia National Park (since 2009 an IDA-certified International Dark-Sky Park), and the Maine Astronomy Retreat in New Sharon all offer night sky access close to most school populations. The Maine Audubon + Penobscot Outdoor Education Center run public dark-sky events. For King Middle students + families, a 2-3 hour drive to the Greenville/Moosehead area puts you under skies most Americans have never seen.',
                  caveat: 'Maine\'s dark skies are an asset that other regions are losing — and Maine itself is slowly losing some of them. South-coast development from Portland to Brunswick has noticeably brightened the southern Maine sky over the past 20 years. Wabanaki astronomers + ecological knowledge keepers have warned about this for longer. Protecting dark skies is conservation, not nostalgia.'
                }
              ];
              var sel = d.selectedLP || 'bortle';
              var topic = LP_TOPICS.find(function(t) { return t.id === sel; }) || LP_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'For most of human history, every clear night offered a Milky Way arching overhead. Today, about a third of humanity cannot see it at all from where they live. Light pollution is one of the most rapidly-growing + most easily-reversed forms of environmental degradation. It also threatens biodiversity, human sleep, and the very practice of astronomy that built our understanding of the cosmos.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  LP_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedLP: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#8b5cf6' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #8b5cf6' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'Honest framing: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, 'Citizen science you can do tonight: '),
                  'Globe at Night (globeatnight.org) — record visible constellations from your address, contributing to a global light-pollution map. Loss of the Night app (free, iOS + Android) — same concept. AAVSO variable-star observations (aavso.org) — submit brightness estimates of variable stars. CitizenSky + Zooniverse have many astronomy projects open to students. School psychologists + teachers can use these as low-friction outdoor learning experiences.'
                )
              );
            })(),
            '#8b5cf6'
          ),

          // ─── Multi-wavelength + multi-messenger observatories ───
          sectionCard('🛰️ The instruments of modern astronomy',
            (function() {
              var INST_TOPICS = [
                { id: 'radio', name: 'Radio telescopes', emoji: '📡',
                  range: '~10 cm to 30 m wavelengths (~1 MHz to 3 GHz)',
                  what: 'Radio telescopes are huge dish antennas that focus radio waves onto a feed horn + receiver. Pioneered by Karl Jansky (1932, accidental discovery of Milky Way radio noise) + Grote Reber (1937, first dedicated radio telescope, built in his Illinois back yard). Modern major facilities: the Very Large Array (VLA, New Mexico, 27 dishes), Atacama Large Millimeter Array (ALMA, Chile, 66 dishes at 5000 m altitude), Square Kilometre Array (SKA, under construction in South Africa + Australia, will be 1 km² total collecting area), FAST (China, 500 m fixed dish, the world\'s largest single-dish since 2016), Arecibo (Puerto Rico, collapsed 2020 after 57 years of service).',
                  finds: 'Cold molecular clouds (CO emission), pulsars + magnetars, the cosmic microwave background, radio galaxies + quasar jets, fast radio bursts, the 21-cm line of neutral hydrogen (tracing galactic structure + the cosmic web), and the recent stochastic gravitational-wave background detected by pulsar timing arrays (NANOGrav + others, 2023).'
                },
                { id: 'mm', name: 'Millimeter + submillimeter', emoji: '〰️',
                  range: '~0.3 mm to 10 mm (~30 GHz to 1 THz)',
                  what: 'Bridging radio + infrared. ALMA (already mentioned) is the world leader. Other major: South Pole Telescope, CCAT-prime (planned), James Clerk Maxwell Telescope (Mauna Kea). The Event Horizon Telescope (EHT) is a global Very Long Baseline Interferometry array combining ALMA + other mm/submm sites to create an Earth-sized virtual telescope. EHT produced the first image of a black hole event horizon (M87*, 2019) + the first of Sagittarius A* (the Milky Way\'s central BH, 2022).',
                  finds: 'Star + planet formation (dust grain growth, protoplanetary disks, debris disks), molecular line emission (~250 different molecular species detected in interstellar clouds), the CMB at high resolution (Planck 2013, BICEP3 ongoing), and black hole event horizons.'
                },
                { id: 'ir', name: 'Infrared telescopes', emoji: '🔥',
                  range: '~0.75 to 1000 microns (~1000 nm to 1 mm)',
                  what: 'Infrared light penetrates dust + reveals cool objects. The atmosphere blocks much of the IR, so the best IR telescopes are at high-altitude dry sites (Mauna Kea) or in space. Spitzer Space Telescope (NASA, 2003-2020). Herschel Space Observatory (ESA, 2009-2013). The James Webb Space Telescope (JWST, launched Dec 2021) is the current crown jewel — 6.5 m primary mirror, sunshield, L2 orbit, ultra-cold detectors, sensitive from 0.6 to 28 microns. JWST has revolutionized galaxy evolution, exoplanet atmospheres (see Exoplanets tab), star formation, and Solar System studies.',
                  finds: 'Galaxies in the early universe (high redshift shifts visible light into the IR), the dust + ice + organics in protoplanetary disks + comets, the cold ISM, exoplanet atmospheres via transit spectroscopy, brown dwarfs.'
                },
                { id: 'optical', name: 'Optical / visible-light', emoji: '👁️',
                  range: '~390 to 700 nm',
                  what: 'The historical heart of astronomy. Modern ground-based behemoths use adaptive optics (laser guide stars + deformable mirrors) to correct for atmospheric blurring, achieving space-telescope-quality resolution from the ground. Major facilities: the Very Large Telescope (VLT, ESO Chile, four 8.2 m units), Gemini North + South, Subaru (Mauna Kea), Keck I + II (Mauna Kea, 10 m), and the Extremely Large Telescope (ELT, ESO Chile, under construction, 39 m primary scheduled first light 2028). The Vera C. Rubin Observatory (Chile, first light 2024-2025) will run a 10-year time-domain survey of the entire visible sky every few nights — about 30 trillion measurements.',
                  finds: 'Stellar populations + ages, galaxy morphology + structure, asteroids + comets + transient phenomena (supernovae, kilonovae, microlensing events), exoplanet transits (Kepler 2009-2018, TESS 2018-present), spectroscopic chemistry of everything.'
                },
                { id: 'uv', name: 'Ultraviolet', emoji: '💜',
                  range: '~10 to 400 nm',
                  what: 'Earth\'s atmosphere (ozone layer) blocks most UV, so UV astronomy requires space telescopes. Hubble Space Telescope (1990-present) has UV imaging spectroscopy capabilities. GALEX (2003-2013) was a dedicated UV survey. Future: ULTRASAT (Israeli mission, 2025) for UV time-domain.',
                  finds: 'Hot young stars (O + B types), white dwarfs, accretion disks around compact objects, the chemistry of the Local Bubble + the interstellar medium, the UV emission of star-forming galaxies (probing star formation history), and the auroras of giant planets.'
                },
                { id: 'xray', name: 'X-ray telescopes', emoji: '🩻',
                  range: '~0.01 to 10 nm (~100 eV to 100 keV)',
                  what: 'X-rays penetrate matter + cannot be focused by ordinary mirrors. They are focused by GRAZING INCIDENCE mirrors — nested cylindrical mirrors at very shallow angles. Chandra X-ray Observatory (1999-present, NASA flagship), XMM-Newton (1999-present, ESA), Athena (planned 2030s, large ESA flagship). NuSTAR (2012-present, hard-X-ray imaging). Recent: eROSITA (Russian-German, 2019, all-sky X-ray survey).',
                  finds: 'Hot ionized gas around galaxy clusters, accretion disks around black holes + neutron stars, supernova remnants, the diffuse X-ray background (largely from active galactic nuclei). The 2024 controversy about the Hubble tension included new X-ray cluster measurements as part of the evidence.'
                },
                { id: 'gamma', name: 'Gamma-ray telescopes', emoji: '☢️',
                  range: '~10 keV to >100 TeV',
                  what: 'The most energetic photons. Above ~30 keV, ordinary mirror focusing fails entirely; gamma-ray detectors are direct-detection coded-aperture instruments (Fermi LAT, Compton, INTEGRAL) or Cherenkov telescopes (ground-based: detect the blue flash from gamma-rays striking the upper atmosphere). Fermi Gamma-ray Space Telescope (NASA, 2008-present), INTEGRAL (ESA, 2002-present), the Cherenkov Telescope Array (CTA, multi-site, under construction).',
                  finds: 'Gamma-ray bursts (the most energetic explosions in the universe), pulsar high-energy emission, supernova remnants, blazars, the Galactic Center, possible dark-matter annihilation signatures, the diffuse gamma-ray background.'
                },
                { id: 'particles', name: 'Particle messengers', emoji: '⚛️',
                  range: 'Non-photon: neutrinos, cosmic rays, gravitational waves',
                  what: 'For decades, "astronomy" meant photons. Modern astronomy is multi-messenger. NEUTRINO observatories: Super-Kamiokande (Japan, 50 ktons of water), SNO (Canada, retired 2006, replaced by SNO+), IceCube (Antarctica, 1 km³ of instrumented ice), KM3NeT (Mediterranean, under construction). COSMIC RAY observatories: Pierre Auger Observatory (Argentina, 3000 km² of detectors), Telescope Array (Utah). GRAVITATIONAL WAVES: LIGO + Virgo + KAGRA (already covered in detail). Each messenger samples different physics + complements the photons.',
                  finds: 'Neutrinos from the Sun + supernovae (SN 1987A famously seen as 24 neutrinos in 13 seconds, hours before the photons arrived) + active galactic nuclei (IceCube 2017 association of high-energy neutrinos with a flaring blazar). Cosmic rays of extreme energy (the "Oh-My-God" particle 1991, the "Amaterasu" particle 2023 at ~244 EeV). GW from BH + NS mergers.'
                },
                { id: 'limits', name: 'What we still cannot see', emoji: '🚫',
                  range: 'The remaining frontiers',
                  what: 'Each electromagnetic window has gaps + limitations. Far-infrared (~30-300 microns) sees the dustiest objects but requires cryogenic space telescopes (Herschel ran out of helium 2013; no current replacement). Hard X-ray + soft gamma-ray transition (~100 keV-1 MeV) is poorly mapped. Ultra-high-energy neutrinos (>10 PeV) are predicted but not yet confidently detected. Primordial gravitational waves (from inflation) require CMB-polarization B-mode detection, still elusive. The very-low-frequency GW band (microhertz to nanohertz) is covered by pulsar timing + space interferometers (LISA, ~2035).',
                  finds: 'Future facilities aim at these gaps. Cosmic Explorer + Einstein Telescope (next-gen ground GW), Habitable Worlds Observatory (NASA flagship, 2040s, direct exoplanet imaging), LISA, SKA full-array, ELT, Athena. The field has never had more planned + funded major facilities than right now. The 2030s + 2040s will be remarkable for observational astronomy.'
                }
              ];
              var sel = d.selectedInst || 'radio';
              var topic = INST_TOPICS.find(function(t) { return t.id === sel; }) || INST_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'Light is just one of many messengers reaching us from the universe. Modern astronomy uses telescopes across the full electromagnetic spectrum — radio, infrared, optical, ultraviolet, X-ray, gamma-ray — plus neutrinos, cosmic rays, and gravitational waves. Each window reveals different physics. The same supernova looks completely different in X-rays + radio + visible light + neutrinos; combining them is how we understand it.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  INST_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedInst: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#0ea5e9' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #0ea5e9' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#7dd3fc', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, topic.range),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'How the instrument works'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.what)
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e' } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What it reveals'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.finds)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'The honest meta-point: '),
                  'No single observatory tells you the truth about an astrophysical source. Every major discovery of the past 30 years (the first exoplanet, the accelerating universe, the EHT black hole image, GW170817, dark energy, fast radio bursts) was confirmed by multi-instrument + multi-wavelength agreement. Astronomy has matured into a coordinated global enterprise; lone observers + single instruments now serve specific tasks within larger networks. The pre-print culture (arXiv, daily reports) + alert networks (TNS, GCN, ATEL) keep this enterprise running in near-real time.'
                )
              );
            })(),
            '#0ea5e9'
          ),

          // ─── Astrophotography basics ────────────────────────────
          sectionCard('📷 Astrophotography — how to capture what you see',
            (function() {
              var AP_TOPICS = [
                { id: 'phone', name: 'Phone astrophotography', emoji: '📱',
                  gear: 'Just your phone',
                  what: 'Modern phones (iPhone since iPhone 11, Pixel since Pixel 3, recent Samsung) have NIGHT MODE that can capture stunning sky photos. Hold the phone steady (against a wall, fence, tripod adapter), use the maximum night-mode exposure (15-30 seconds on Pixel; tap to focus on a bright star first), and let the AI processing combine many short exposures into one. You can capture: the Milky Way from a dark site, the Moon at full + crescent, conjunctions of planets, the brightest star clusters (Pleiades, Orion sword region), bright comets, lunar eclipses, aurora.',
                  limit: 'Phones cannot capture faint deep-sky objects (galaxies, most nebulae) — the small sensor + short max exposure are limiting. Phone cameras compress + sharpen aggressively; the JPEG output may look worse than dedicated cameras. Pro tip: use RAW capture mode where available + edit in Snapseed / Lightroom Mobile. The Photopills app helps plan exact phone-friendly shoots (Milky Way visibility, ISS pass times, moon phase).'
                },
                { id: 'dslr', name: 'DSLR / mirrorless basics', emoji: '📸',
                  gear: 'Camera + tripod + intervalometer',
                  what: 'The classic astrophotography setup: a DSLR or mirrorless camera with manual mode, a fast wide-angle lens (24mm f/1.8 or wider, f/2.8 or faster), a tripod, and a remote shutter or intervalometer. For Milky Way: ISO 1600-3200, f/1.8-2.8, 20-25 seconds exposure (use the 500-rule: max exposure = 500/focal length in mm before star trails). For startrails: many shorter exposures stacked. For lunar + planetary: telephoto lens, faster shutter, low ISO. RAW format always.',
                  limit: 'Wide-field shots from a DSLR on a fixed tripod max out at ~25 seconds before earth\'s rotation creates star trails. To go longer, you need a star tracker (~ $400-800 entry, motorized to follow earth\'s rotation). Even then, the focal length matters: ~ 50mm + tracker = 2-minute exposures; ~ 300mm + tracker = 30-60 second exposures only. The longer the focal length, the more critical tracking becomes.'
                },
                { id: 'tracker', name: 'Star trackers + mounts', emoji: '⚙️',
                  gear: 'iOptron SkyGuider Pro, Sky-Watcher Star Adventurer, or larger EQ mount',
                  what: 'A star tracker rotates a camera or small telescope westward at sidereal rate (one rotation per ~ 24 hours, matching earth\'s rotation), keeping stars fixed in the frame for long exposures. A polar-aligned tracker enables MINUTES-long exposures revealing faint nebulae + galaxies. Larger equatorial mounts (EQ6-R, AVX, HEQ5, ZWO AM5) handle full telescopes + auto-guide via a small secondary scope + camera to correct drift. Mount precision separates good from professional results: $1500 mount = ~ 0.5 arcsecond accuracy = professional galaxy + nebula images.',
                  limit: 'Polar alignment is the make-or-break skill. Pointing the mount\'s rotation axis at the celestial pole (Polaris in the north hemisphere) within ~ 5 arcminutes lets you do unguided 1-2 minute exposures. Poor alignment + you see star trails immediately. Modern tools (electronic polar scopes, Sharpcap polar alignment via plate-solving) have made the task much easier than in pre-computer days.'
                },
                { id: 'planetary', name: 'Lunar + planetary imaging', emoji: '🌙',
                  gear: 'Telescope + ASI224 / ZWO planetary cam',
                  what: 'Lunar + planetary imaging uses a completely different approach: high frame rate VIDEO. The atmosphere distorts images on millisecond timescales (the "seeing"); capturing 5000 frames + STACKING the sharpest few hundred reveals detail unavailable in single exposures. Software: AutoStakkert (free), Registax (free), PixInsight ($$). Telescope: 8-inch or larger (Celestron C8, Skywatcher Maksutov), planetary camera with small pixels + high frame rate. Best targets: Moon (always great), Jupiter (with moons + Great Red Spot), Saturn (rings), Mars at opposition (~ every 2 years).',
                  limit: 'Atmospheric SEEING is a hard limit. Even 14-inch telescopes from a city backyard rarely beat a 5-inch from a high mountain site. Plan your imaging sessions for the best-seeing nights (jet stream forecasts, transparency forecasts from Clear Outside or Astrospheric apps). Cooled cameras + filter wheels add complexity but unlock color planetary imaging.'
                },
                { id: 'deep', name: 'Deep-sky imaging (DSOs)', emoji: '🌌',
                  gear: 'Telescope + cooled astro camera + filters',
                  what: 'Deep-Sky Objects (DSOs) are galaxies, nebulae, star clusters — faint extended objects requiring HOURS of total exposure. Modern workflow: tracking mount + telescope + cooled CMOS camera (ZWO ASI2600, QHY268, etc.) + filter wheel (luminance, red, green, blue + Halpha, OIII, SII for emission nebulae). Auto-guiding keeps tracking precise. Image 50-200 sub-exposures of 60-300 seconds each, total integration 4-15+ hours per target. Process in PixInsight, Siril (free), or Photoshop. Same target imaged from a Bortle 4 dark site vs Bortle 7 urban shows night-and-day quality difference.',
                  limit: 'Deep-sky imaging is the most equipment-intensive + skill-intensive area of astrophotography. Entry kit is $3-5K minimum; serious setups reach $15-30K. Image processing is half the skill — bad processing of good data looks worse than good processing of mediocre data. PixInsight has a steep learning curve. The good news: every step from data acquisition through processing is well-documented in YouTube tutorials + community forums (CloudyNights, AstroBin).'
                },
                { id: 'narrowband', name: 'Narrowband + dual-band filters', emoji: '🎨',
                  gear: 'Halpha / OIII / SII narrowband filters',
                  what: 'Most nebulae emit at SPECIFIC WAVELENGTHS: Halpha (hydrogen, 656nm, red), OIII (doubly-ionized oxygen, 501nm, teal), SII (singly-ionized sulfur, 672nm, deep red). A narrowband filter passes only the wavelength of interest, blocking everything else INCLUDING light pollution. This means you can image emission nebulae from a city backyard. The classic "Hubble palette" combines SII (red), Halpha (green), OIII (blue) for striking false-color images. Dual-band filters (Halpha + OIII in one filter, like the L-eXtreme + Optolong L-eNhance) work in a single shot — great for color cameras.',
                  limit: 'Narrowband only works for EMISSION nebulae (HII regions, supernova remnants, planetary nebulae). Galaxies + reflection nebulae need broadband imaging from dark skies. Narrowband requires longer exposures (less light passes through). The aesthetic of the Hubble palette is acquired taste — real natural color is sometimes more interesting than the dramatic false color.'
                },
                { id: 'process', name: 'Image processing essentials', emoji: '🎚️',
                  gear: 'Software: PixInsight, Siril (free), Photoshop',
                  what: 'Astrophotography processing has standard steps: CALIBRATION (subtract bias frames + dark frames + flat field corrections to remove sensor pattern noise + vignetting), REGISTRATION (align all sub-exposures), STACKING (average to reduce noise), STRETCHING (asinh or histogram transformation to reveal faint signal without blowing out highlights), NOISE REDUCTION + SHARPENING, COLOR CALIBRATION + saturation. Modern tools (NoiseXTerminator, BlurXTerminator, StarXTerminator from Russell Croman) use AI to do specific tasks dramatically well + have become near-standard in 2024-2025 workflows.',
                  limit: 'Processing is the half-the-fun, half-the-frustration of astrophotography. The biggest skill is RESTRAINT — knowing when to stop stretching, when to leave color subtle, when to NOT smooth out detail. Over-processed images look like cartoons. PixInsight has a steep learning curve; Siril is more approachable; YouTube tutorials (Adam Block, Cuiv The Lazy Geek, Astrobackyard, Trevor Jones) are world-class free resources.'
                },
                { id: 'maine', name: 'Maine astrophotography', emoji: '🌲',
                  gear: 'Your existing kit + a 2-hour drive',
                  what: 'Maine has some of the best astrophotography skies east of the Mississippi. PRIMARY DARK SITES: Acadia National Park (Bortle 2, official IDA Dark Sky Park since 2009), Katahdin Woods + Waters National Monument (Bortle 1-2 in core areas), Cobscook Bay State Park, Aroostook State Park, Greenville / Moosehead Lake region. The Maine Bigelow Lab in Boothbay + the College of the Atlantic in Bar Harbor both run public observing programs. Annual events: the Stellafane convention (Vermont, every August) is a 4-hour drive from Portland + has been the premier amateur astronomy gathering since 1926.',
                  limit: 'Maine winters limit observation time + battery life. Imaging gear works fine at -20°C but cold-soaked tracking mounts sometimes seize; protect bearings + lubricants. Black flies + mosquitoes in late spring are real obstacles. The Bortle 1-2 of Aroostook county is exceptional but the drive (5-6 hours from Portland) + accommodations make it a planned trip rather than an evening drive. For King Middle student field trips, Acadia or the closer Wells Reserve are practical.'
                }
              ];
              var sel = d.selectedAP || 'phone';
              var topic = AP_TOPICS.find(function(t) { return t.id === sel; }) || AP_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'Astrophotography has changed completely in the past decade. Phones with night mode capture the Milky Way; $500 star trackers + DSLRs make professional-looking deep-sky images possible from suburban backyards; AI processing tools (StarXTerminator, BlurXTerminator) automate steps that took experts hours. For students at any level, there is a clear progression from phone shots tonight to professional-quality images within a year of focused practice.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  AP_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedAP: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#06b6d4' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #06b6d4' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#67e8f9', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, fontStyle: 'italic' } }, 'Gear: ' + topic.gear),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What + how'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.what)
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Honest limit'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7 } }, topic.limit)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, 'Tonight, with your phone: '),
                  'Find a place ~ 1 mile from major lights. Wait 20 minutes for your eyes to adapt. Hold your phone steady against a flat surface (a wall, fence, picnic table) + open the camera in night mode. Aim at the Milky Way (best in June-Sept evening sky from Maine), or just the brightest stars. Take 30-second exposures. Most modern phones produce surprisingly good images that you can share. This is the entire entry barrier — no purchase needed.'
                )
              );
            })(),
            '#06b6d4'
          ),

          // ─── Astronomical timekeeping ───────────────────────────
          sectionCard('⏱️ How we tell time — UTC, leap seconds, and GPS relativity',
            (function() {
              var TIME_TOPICS = [
                { id: 'origins', name: 'Time from the sky', emoji: '🌅',
                  body: 'For most of human history, time meant the SUN. Local apparent solar time (sundial time) was the only practical reference; each town set its own clocks by when the sun crossed the local meridian. The Earth\'s rotation was the assumed-perfect clock. Mean solar time (averaged to remove Earth\'s orbital eccentricity + axial-tilt wobbles) became standard with mechanical clocks in the 1500s. The MEAN SOLAR SECOND was defined as 1/86,400 of a mean solar day. This worked fine until ~1955.',
                  caveat: 'Each town keeping its own time worked when travel was slow. The railroads broke that — a train leaving Boston could not list its departure time if every town had a different "noon." Standard time zones (proposed by Sandford Fleming 1879, adopted in the US 1883 by the railroads, internationalized 1884 at the Washington Meridian Conference) imposed a single time across regions for the first time in history.'
                },
                { id: 'atomic', name: 'The atomic second (1967)', emoji: '⚛️',
                  body: 'In 1955 Louis Essen + Jack Parry at the UK National Physical Laboratory built the first cesium atomic clock. They demonstrated that an atomic transition (a specific electronic state change in cesium-133) provided a vastly more stable time reference than Earth\'s rotation. The 1967 General Conference on Weights + Measures redefined the SI SECOND as "the duration of 9,192,631,770 periods of the radiation corresponding to the transition between the two hyperfine levels of the ground state of the cesium-133 atom." Earth\'s rotation no longer defines the second. Atomic clocks are now accurate to ~10⁻¹⁵-10⁻¹⁸ (off by less than 1 second over the age of the universe for the best optical clocks).',
                  caveat: 'The cesium standard runs faster + slower over the years than Earth\'s rotation. Earth\'s rotation is gradually slowing (tidal friction with the Moon, plus seasonal + decadal wobbles). The mismatch between atomic-defined seconds + rotation-defined days creates the LEAP SECOND problem.'
                },
                { id: 'utc', name: 'UTC + leap seconds', emoji: '⏲️',
                  body: 'Coordinated Universal Time (UTC, since 1972) is based on the atomic second but kept SYNCHRONIZED with Earth\'s rotation by inserting LEAP SECONDS when the accumulated difference reaches ~ 0.9 seconds. Leap seconds are decided by the International Earth Rotation + Reference Systems Service (IERS), typically inserted on June 30 or December 31. Since 1972, 27 leap seconds have been added (the last was December 31, 2016; the next is uncertain). One leap second was even predicted to be SUBTRACTED (negative leap second) around 2026-2029 because Earth has temporarily SPED UP, but melting polar ice has redistributed mass + slowed rotation again, postponing the negative leap second indefinitely.',
                  caveat: 'Leap seconds wreak havoc on computer systems. The 2012 leap second crashed Reddit, LinkedIn, FourSquare, Yelp; the 2017 leap second crashed Cloudflare\'s DNS for 90 minutes. The IT industry has lobbied to abolish leap seconds; the General Conference on Weights + Measures voted in November 2022 to PHASE OUT leap seconds by 2035 (allowing UTC to drift indefinitely from solar time, with corrections expected only after the drift reaches a full minute or more — perhaps decades from now).'
                },
                { id: 'gps', name: 'GPS time + relativity', emoji: '🛰️',
                  body: 'GPS satellites carry atomic clocks. The position of a GPS receiver is determined by the time delay of signals from 4+ satellites. To get position accuracy of meters, time accuracy of ~ 30 nanoseconds is required. AT this precision, EINSTEIN\'S RELATIVITY IS NOT OPTIONAL. Two effects: SPECIAL RELATIVITY (satellites orbit at ~14,000 km/h relative to Earth\'s surface — their clocks run ~ 7 microseconds/day SLOWER) + GENERAL RELATIVITY (satellites are in weaker gravity at 20,200 km altitude — their clocks run ~ 45 microseconds/day FASTER). Net effect: GPS satellite clocks gain ~ 38 microseconds per day relative to ground clocks. Without correction, this would compound to ~ 11 km of position error per day. GPS satellites are launched with their clocks INTENTIONALLY tuned slow by exactly this amount.',
                  caveat: 'Every iPhone with GPS is literally testing Einstein\'s relativity every second. The Pound-Rebka experiment (1959) first measured general-relativistic time dilation in a 22-meter Harvard tower; GPS is the same physics at industrial scale. This is the most-used + most-tested confirmation of general relativity in everyday technology.'
                },
                { id: 'tai', name: 'TAI, TT, TCG, TCB — astronomers\' time scales', emoji: '🌐',
                  body: 'Different domains use different time scales. INTERNATIONAL ATOMIC TIME (TAI) is the pure atomic standard — no leap seconds, no corrections. It is currently ~ 37 seconds ahead of UTC. TERRESTRIAL TIME (TT) is TAI + 32.184 seconds (an offset chosen to match older Ephemeris Time); TT is the standard for SOLAR-SYSTEM EPHEMERIDES (where to point a telescope to find a planet at a given moment). GEOCENTRIC COORDINATE TIME (TCG) + BARYCENTRIC COORDINATE TIME (TCB) are relativistic timescales accounting for the gravitational potential difference between Earth + the solar-system center of mass — required for high-precision positions of spacecraft, planets, + pulsars. JULIAN DATE (JD) counts days since noon Universal Time on January 1, 4713 BCE — convenient for astronomy because there are no leap years or month boundaries. Modified Julian Date (MJD) = JD - 2400000.5.',
                  caveat: 'Astronomical time scales LOOK complicated because they ARE complicated. The right scale depends on the precision required + the reference frame. For everyday observations, UTC is fine. For VLBI, pulsar timing, spacecraft navigation, gravitational-wave astronomy, the choice matters at the microsecond level.'
                },
                { id: 'pulsars', name: 'Pulsars as cosmic clocks', emoji: '⚡',
                  body: 'Millisecond pulsars are the most stable natural timekeepers in the universe. Pulsar B1855+09 has timed for 40+ years with a fractional stability of ~ 10⁻¹⁵ — rivaling the best atomic clocks. Pulsar timing arrays (NANOGrav, EPTA, PPTA — see Galaxies tab Pulsar section) detect gravitational waves by watching for correlated timing variations across many pulsars. A future "Pulsar Time" standard could be used as a cross-check on atomic clocks. The redundancy matters: if some catastrophe disrupted Earth\'s atomic-clock network, pulsar timing could in principle re-derive UTC.',
                  caveat: 'Pulsar timing is observationally demanding + the long-term stability is limited by interstellar-medium variations + pulsar glitches. Pulsars cannot replace atomic clocks for routine timekeeping (the precision per single pulse is much worse than a lab atomic clock) but they offer an independent astronomical reference for the longest timescales.'
                },
                { id: 'optical', name: 'Optical clocks + the next SI second', emoji: '💎',
                  body: 'Microwave cesium clocks (the current SI standard) have stabilities of ~ 10⁻¹⁵. OPTICAL CLOCKS use higher-frequency atomic transitions (visible light at ~ 10¹⁵ Hz) — orders of magnitude more clock ticks per second, with corresponding precision gains. Aluminum-ion optical clocks (NIST Boulder) + strontium lattice clocks (JILA, RIKEN, PTB) now achieve fractional stability of 10⁻¹⁸ — better than 1 second in the age of the universe. The Bureau International des Poids et Mesures (BIPM) is preparing for a redefinition of the SI second based on an optical transition, expected around 2030. The currently-most-stable optical clock is so sensitive that it can measure gravitational time dilation between two laboratory tables at different heights.',
                  caveat: 'Optical clocks are research instruments, not consumer devices. They occupy entire rooms + require teams of physicists. They are slowly being miniaturized; in a few decades, optical-clock-grade timekeeping may be available in lab benchtop instruments + ultimately portable systems (key for next-generation GPS + autonomous vehicles + financial systems).'
                },
                { id: 'why', name: 'Why timekeeping is civilization', emoji: '🏛️',
                  body: 'Reliable time + reliable position are core requirements for almost every modern technology. STOCK markets settle trades to microsecond precision; financial law assigns liability to whoever timestamped first. POWER GRIDS synchronize generators across continents to atomic-clock accuracy or risk blackouts. CELL TOWERS handoff calls using time-synchronized signals. SCIENTIFIC instruments correlate events at nanosecond precision (LIGO, particle colliders). MILITARY navigation depends on GPS encrypted timestamps. The "knowing what time it is" infrastructure is invisible + critical. A society that loses precise time loses much of its modern function within hours.',
                  caveat: 'The risks of time-infrastructure failure are real + understudied. GPS spoofing (broadcasting fake signals to confuse receivers) has been documented in maritime + airline incidents. The 2012 + 2017 leap-second crashes showed how brittle global computer time systems can be. Backup time sources (radio time signals like WWV in Colorado + WWVH in Hawaii, fiber-optic timing networks, future lunar PNT systems) are part of infrastructure resilience that gets attention only after failures.'
                }
              ];
              var sel = d.selectedTime || 'origins';
              var topic = TIME_TOPICS.find(function(t) { return t.id === sel; }) || TIME_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'For most of history, the sky was the clock. Today, the most precise time references on Earth are atomic transitions — except for civil time (UTC), which is kept synchronized to Earth\'s slowing rotation via leap seconds. GPS satellites need Einstein\'s relativity to work. The "what time is it" question turns out to be one of the deepest + most-tested questions in physics + engineering.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  TIME_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedTime: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#facc15' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #facc15' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#fde68a', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'Honest framing: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'A demonstration anyone can do: '),
                  'On any day, open the iOS Clock app + look at the local time + a city like London. The London time minus your offset should give a number very close to UTC. Now compare to a satellite-based source (GPS in your maps app) or a precision time service (time.gov, time.is). They will all agree to within seconds. The fact that everyone\'s phone — in 200 countries with completely different governments, geography, + politics — agrees on what time it is, all derived from a single global system, is one of humanity\'s most impressive collective achievements.'
                )
              );
            })(),
            '#facc15'
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // QUIZ
      // ──────────────────────────────────────────────────────────────
      function renderQuiz() {
        var idx = d.quizIdx || 0;
        var answers = d.quizAnswers || [];
        var done = d.quizSubmitted;

        function selectChoice(qIdx, cIdx) {
          var newAns = answers.slice();
          newAns[qIdx] = cIdx;
          upd({ quizAnswers: newAns });
        }
        function submit() {
          var correct = 0;
          QUIZ_QUESTIONS.forEach(function(q, i) {
            if (answers[i] === q.answer) correct++;
          });
          upd({ quizSubmitted: true, quizCorrect: correct });
          if (addToast) addToast('Quiz complete: ' + correct + '/' + QUIZ_QUESTIONS.length, correct >= 9 ? 'success' : 'info');
          if (awardXP) awardXP(correct * 5);
        }
        function reset() {
          upd({ quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0 });
        }

        if (done) {
          var correct = d.quizCorrect || 0;
          var pct = Math.round(correct / QUIZ_QUESTIONS.length * 100);
          return h('div', { style: { padding: 16 } },
            h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 36, marginBottom: 4 } }, pct >= 80 ? '🌟' : pct >= 60 ? '⭐' : '🌙'),
              h('h2', { style: { margin: '0 0 4px', color: '#c7d2fe', fontSize: 22 } }, correct + ' / ' + QUIZ_QUESTIONS.length),
              h('div', { style: { fontSize: 14, color: '#94a3b8' } }, pct + '%')
            ),
            QUIZ_QUESTIONS.map(function(q, i) {
              var got = answers[i] === q.answer;
              return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid ' + (got ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'), borderLeft: '3px solid ' + (got ? '#22c55e' : '#ef4444'), marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: got ? '#86efac' : '#fca5a5', marginBottom: 4 } }, (got ? '✓ ' : '✗ ') + 'Q' + (i + 1)),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 6 } }, q.q),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 4 } }, 'Correct: ', h('strong', null, q.choices[q.answer])),
                !got ? h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Your answer: ', q.choices[answers[i] != null ? answers[i] : 0]) : null,
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic' } }, q.explain)
              );
            }),
            h('button', { onClick: reset, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: INDIGO, color: '#fff', fontWeight: 700, cursor: 'pointer' } }, 'Retake quiz')
          );
        }

        var allAnswered = QUIZ_QUESTIONS.every(function(_, i) { return answers[i] != null; });

        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12 } }, QUIZ_QUESTIONS.length + ' questions covering everything in this tool. Take your time.'),
          QUIZ_QUESTIONS.map(function(q, i) {
            return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.55 } }, h('strong', { style: { color: '#c7d2fe' } }, 'Q' + (i + 1) + '. '), q.q),
              q.choices.map(function(c, ci) {
                var picked = answers[i] === ci;
                return h('button', {
                  key: ci,
                  onClick: function() { selectChoice(i, ci); },
                  style: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, marginBottom: 4, background: picked ? 'rgba(99,102,241,0.20)' : '#0f172a', border: '1px solid ' + (picked ? INDIGO : '#334155'), color: '#e2e8f0', fontSize: 12.5, cursor: 'pointer', lineHeight: 1.5 }
                }, c);
              })
            );
          }),
          h('button', {
            onClick: submit,
            disabled: !allAnswered,
            style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: allAnswered ? INDIGO : '#475569', color: '#fff', fontWeight: 800, fontSize: 14, cursor: allAnswered ? 'pointer' : 'not-allowed' }
          }, allAnswered ? 'Submit quiz' : 'Answer all questions to submit (' + answers.filter(function(a) { return a != null; }).length + '/' + QUIZ_QUESTIONS.length + ')')
        );
      }

      // ──────────────────────────────────────────────────────────────
      // PRINT
      // ──────────────────────────────────────────────────────────────
      function renderPrint() {
        var bortle = BORTLE.find(function(b) { return b.class === d.bortleClass; }) || BORTLE[4];
        var obsList = (d.observingList || []).map(function(id) { return CONSTELLATIONS.find(function(c) { return c.id === id; }); }).filter(Boolean);
        return h('div', { style: { padding: 16 } },
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.10)', borderTop: '1px solid rgba(99,102,241,0.4)', borderRight: '1px solid rgba(99,102,241,0.4)', borderBottom: '1px solid rgba(99,102,241,0.4)', borderLeft: '3px solid ' + INDIGO, marginBottom: 12, fontSize: 12.5, color: '#c7d2fe', lineHeight: 1.65 } },
            h('strong', null, '🖨 Observing kit. '),
            'A take-into-the-field reference: your observing list, this season\'s constellation map, the moon phase calendar, safety reminders, and a quick reference for binocular vs naked-eye targets.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: function() { try { window.print(); } catch (e) {} },
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#astro-print-region, #astro-print-region * { visibility: visible !important; } ' +
            '#astro-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#astro-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'astro-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'Night Sky Observing Kit'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'NGSS MS-ESS1 · HS-ESS1')
            ),

            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 12, fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' } },
              h('strong', null, 'SAFETY: '),
              'Never look at the Sun without ISO 12312-2 solar-eclipse glasses (NOT sunglasses, NOT smoked glass). Lunar eclipses and meteor showers are safe to view directly. Use a red flashlight outside to preserve dark adaptation.'
            ),

            obsList.length > 0 ? h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'My observing list'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12.5, color: '#0f172a', lineHeight: 1.7 } },
                obsList.map(function(c, i) {
                  return h('li', { key: i, style: { marginBottom: 4 } },
                    h('strong', null, c.name + ' (' + c.common + '): '),
                    c.howToFind
                  );
                })
              )
            ) : null,

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Naked-eye seasonal sky (Northern Hemisphere)'),
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 } },
                h('thead', null, h('tr', null,
                  h('th', { style: { padding: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left' } }, 'Season'),
                  h('th', { style: { padding: 6, border: '1px solid #cbd5e1', background: '#f1f5f9', textAlign: 'left' } }, 'What\'s up')
                )),
                h('tbody', null,
                  [
                    { s: 'Winter (Dec-Feb)', w: 'Orion, Taurus + Pleiades, Sirius (brightest star), Gemini, Auriga' },
                    { s: 'Spring (Mar-May)', w: 'Leo (with Regulus), Ursa Major high, Boötes with Arcturus, Virgo with Spica' },
                    { s: 'Summer (Jun-Aug)', w: 'Summer Triangle (Vega-Deneb-Altair), Scorpius with Antares low S, Sagittarius (Milky Way center)' },
                    { s: 'Fall (Sep-Nov)', w: 'Pegasus + Andromeda Galaxy (M31), Cassiopeia high, last of Summer Triangle' }
                  ].map(function(r, i) {
                    return h('tr', { key: i },
                      h('td', { style: { padding: 6, border: '1px solid #cbd5e1', fontWeight: 700 } }, r.s),
                      h('td', { style: { padding: 6, border: '1px solid #cbd5e1' } }, r.w)
                    );
                  })
                )
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Annual meteor showers (set a calendar reminder)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.65 } },
                h('li', null, h('strong', null, 'Quadrantids: '), 'Jan 3-4. Strong but short. Northern radiant. Cold; bundle up.'),
                h('li', null, h('strong', null, 'Lyrids: '), 'April 22-23. Modest, ~15-20 per hour.'),
                h('li', null, h('strong', null, 'Perseids: '), 'August 12-13. The most popular shower. Warm summer nights, ~60-100 per hour in dark skies.'),
                h('li', null, h('strong', null, 'Orionids: '), 'October 21-22. Moderate, from Halley\'s Comet debris.'),
                h('li', null, h('strong', null, 'Leonids: '), 'November 17-18. Variable.'),
                h('li', null, h('strong', null, 'Geminids: '), 'December 13-14. The strongest, most reliable shower. ~120 per hour in dark skies. Cold but worth it.')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'My sky darkness'),
              h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.6 } },
                h('strong', null, 'Bortle class ' + bortle.class + ': ' + bortle.name), h('br'),
                bortle.desc
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Tonight checklist'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.75 } },
                h('li', null, '□ Check moon phase. Look near full moon? Try the Moon itself. Try meteor showers near new moon.'),
                h('li', null, '□ Let your eyes dark-adapt for 15-20 minutes. Use a red flashlight if you need light.'),
                h('li', null, '□ Pick ONE thing to find tonight. Don\'t try to learn everything.'),
                h('li', null, '□ Layer up. It\'s colder than you think, especially in Maine.'),
                h('li', null, '□ Bring water, a chair if you\'ll be out long, binoculars if you have them.'),
                h('li', null, '□ Tell someone where you\'re going if you\'re going to a dark site alone.')
              )
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: NASA (nasa.gov) · International Dark-Sky Association (darksky.org) · NGSS Lead States, 2013 · Bortle, J. (2001), "Introducing the Bortle Dark-Sky Scale" · Penobscot Nation, Passamaquoddy Tribe, and other Wabanaki sources for the local sky traditions. Printed from AlloFlow STEM Lab.'
            )
          )
        );
      }

      // ──────────────────────────────────────────────────────────────
      // Dispatch
      // ──────────────────────────────────────────────────────────────
      var body;
      switch (d.tab) {
        case 'constellations': body = renderConstellations(); break;
        case 'moon':           body = renderMoon(); break;
        case 'planets':        body = renderPlanets(); break;
        case 'exoplanets':     body = renderExoplanets(); break;
        case 'seasons':        body = renderSeasons(); break;
        case 'stars':          body = renderStars(); break;
        case 'galaxies':       body = renderGalaxies(); break;
        case 'eclipses':       body = renderEvents(); break;
        case 'indigenous':     body = renderIndigenous(); break;
        case 'history':        body = renderHistory(); break;
        case 'observe':        body = renderObserve(); break;
        case 'quiz':           body = renderQuiz(); break;
        case 'print':          body = renderPrint(); break;
        default:               body = renderTonight();
      }

      return h('div', { className: 'selh-astronomy', style: { display: 'flex', flexDirection: 'column', height: '100%', background: BG, color: '#e2e8f0' } },
        // Header
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #1e293b', background: 'linear-gradient(135deg, #1e1b4b, #0f172a)', display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, '🔭'),
          h('div', null,
            h('h2', { style: { margin: 0, color: '#c7d2fe', fontSize: 20, fontWeight: 900 } }, 'Night Sky & Astronomy'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 2 } }, 'Earth & Space Science · NGSS MS-ESS1 · HS-ESS1')
          )
        ),
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, body)
      );
    }
  });

  console.log('[StemLab] stem_tool_astronomy.js loaded — Night Sky & Astronomy');
})();
