// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEM Lab — Nuclear & Radiation Lab
//
// Before this tool, zero of 129 tools were findable by searching "nuclear",
// "half-life", "isotope" or "radiation safety". The apparent hits were false
// positives: "nuclear" in the cell tool means cell NUCLEUS, and the chemistry
// suite's are nuclear EQUATIONS.
//
// Nuclear is a subject where students arrive with strong priors from both
// directions, so the house rule here is stricter than usual:
//   - Every figure carries its source and its date.
//   - Where science is genuinely contested (low-dose risk, Chernobyl's
//     long-term toll) the tool says so and gives the range, rather than
//     picking the number that suits a narrative.
//   - Where a technology is promised rather than delivered (SMRs, fusion) the
//     tool separates what is operating from what is proposed.
// A tool that oversells nuclear and one that overstates its harm are the same
// failure: both replace a student's judgement with the author's.
// ═══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var NK_REVIEWED = '2026-08';
  var NK_SOURCES = {
    nudat: { label: 'NNDC NuDat 3', url: 'https://www.nndc.bnl.gov/nudat3/' },
    nist: { label: 'NIST XCOM', url: 'https://physics.nist.gov/PhysRefData/Xcom/html/xcom1.html' },
    unscear: { label: 'UNSCEAR Fukushima 2020/21', url: 'https://www.unscear.org/unscear/en/publications/2020_2021_2.html' },
    nrc: { label: 'NRC radiological-emergency guidance', url: 'https://www.nrc.gov/about-nrc/emerg-preparedness/in-radiological-emerg' },
    iter: { label: 'ITER 2024 baseline', url: 'https://www.iter.org/node/20687/new-baseline-prioritize-robust-start-exploitation' },
    nif: { label: 'LLNL NIF 2022 result', url: 'https://annual.llnl.gov/fy-2022/national-ignition-facility-2022' },
    nuscale: { label: 'NuScale project termination', url: 'https://www.nuscalepower.com/press-releases/2023/utah-associated-municipal-power-systems-and-nuscale-power-agree-to-terminate-the-carbon-free-power-project' }
  };

  // ── Isotopes. Half-lives from the NNDC / IAEA chart of nuclides. ──
  var ISOTOPES = [
    { id: 'tc99m', name: 'Technetium-99m', hl: 6.01 / 24 / 365.25, unit: 'hours', hlText: '6.0 hours', decay: 'Gamma', use: 'The workhorse of medical imaging — about 40 million scans a year. Its short half-life is the point: it images you, then it is gone.' },
    { id: 'rn222', name: 'Radon-222',      hl: 3.82 / 365.25,      unit: 'days',  hlText: '3.8 days', decay: 'Alpha', use: 'Seeps from rock into basements and is the largest single source of natural dose for most people. Second leading cause of lung cancer after smoking.' },
    { id: 'i131',  name: 'Iodine-131',     hl: 8.02 / 365.25,      unit: 'days',  hlText: '8.0 days', decay: 'Beta + gamma', use: 'Treats thyroid cancer, and is the early fallout hazard after an accident because the thyroid concentrates iodine. Gone in months.' },
    { id: 'co60',  name: 'Cobalt-60',      hl: 5.27,               unit: 'years', hlText: '5.3 years', decay: 'Gamma', use: 'Sterilises medical equipment and treats cancer. Strong penetrating gamma, so it is handled remotely behind heavy shielding.' },
    { id: 'h3',    name: 'Tritium',        hl: 12.32,              unit: 'years', hlText: '12.3 years', decay: 'Beta (very weak)', use: 'Glow-in-the-dark exit signs and watch dials. Its beta is so weak it cannot get through skin — the hazard is only if it is taken in.' },
    { id: 'cs137', name: 'Caesium-137',    hl: 30.05,              unit: 'years', hlText: '30.1 years', decay: 'Beta + gamma', use: 'The contaminant that defines the Chernobyl and Fukushima exclusion zones. Chemically like potassium, so it spreads through soil and food chains.' },
    { id: 'c14',   name: 'Carbon-14',      hl: 5730,               unit: 'years', hlText: '5,730 years', decay: 'Beta', use: 'Radiocarbon dating. Useful back to roughly 50,000 years, after which too little is left to measure.' },
    { id: 'pu239', name: 'Plutonium-239',  hl: 24110,              unit: 'years', hlText: '24,110 years', decay: 'Alpha', use: 'Reactor by-product and weapons material. Its alpha radiation has very little penetrating power through intact skin, but plutonium is serious if inhaled, swallowed, or carried into a wound.' },
    { id: 'u235',  name: 'Uranium-235',    hl: 7.04e8,             unit: 'years', hlText: '704 million years', decay: 'Alpha', use: 'The fissile isotope, only 0.72% of natural uranium. Reactors enrich it to 3–5%; weapons need above 90%.' },
    { id: 'k40',   name: 'Potassium-40',   hl: 1.25e9,             unit: 'years', hlText: '1.25 billion years', decay: 'Beta + electron capture', use: 'In every banana, and in you — about 4,000 decays a second inside your own body, for your whole life.' },
    { id: 'u238',  name: 'Uranium-238',    hl: 4.468e9,            unit: 'years', hlText: '4.47 billion years', decay: 'Alpha', use: 'Dates rocks and meteorites. This is how we know the Earth is 4.54 billion years old.' }
  ];

  // ── Radiation types. Attenuation values are order-of-magnitude teaching
  //    figures, not shielding-design numbers. ──
  var RAD_TYPES = [
    { id: 'alpha', name: 'Alpha', symbol: 'α', what: 'A helium nucleus: 2 protons, 2 neutrons. Heavy and doubly charged.',
      stops: 'A sheet of paper, or the dead outer layer of your skin.', range: 'A few cm of air',
      danger: 'Usually a low external hazard to intact skin, but not harmless: alpha can damage the eye or tissue exposed by a wound. It is especially serious when inhaled, swallowed, or otherwise taken into the body, because all that ionising power is dumped into a tiny volume of living tissue. This is exactly why radon matters: you breathe it in.',
      colour: '#f87171', ionising: 5, penetration: 1 },
    { id: 'beta', name: 'Beta', symbol: 'β', what: 'A fast electron (or positron) thrown out as a neutron turns into a proton.',
      stops: 'A few millimetres of aluminium or plastic.', range: 'A few metres of air',
      danger: 'Can reach the sensitive layer of skin and the lens of the eye. Shield with plastic rather than lead — a heavy shield makes secondary X-rays.',
      colour: '#60a5fa', ionising: 3, penetration: 3 },
    { id: 'gamma', name: 'Gamma', symbol: 'γ', what: 'A high-energy photon. No mass, no charge — just light far beyond violet.',
      stops: 'Nothing stops it completely. Lead or concrete cuts it exponentially.', range: 'Hundreds of metres of air',
      danger: 'Passes right through you, so it irradiates every organ. This is the dominant external hazard after an accident.',
      colour: '#a78bfa', ionising: 1, penetration: 8 },
    { id: 'neutron', name: 'Neutron', symbol: 'n', what: 'A free neutron, released in fission. Uncharged, so it ignores electrons entirely.',
      stops: 'Water, concrete or polyethylene — anything full of hydrogen. Lead is nearly useless.',
      range: 'Hundreds of metres of air',
      danger: 'Very damaging, and it makes other materials radioactive by being absorbed. Mostly a concern inside an operating reactor.',
      colour: '#34d399', ionising: 4, penetration: 9 }
  ];

  // Linear attenuation coefficients for 1 MeV gamma, cm^-1 (NIST XCOM).
  var SHIELDS = [
    { id: 'air', name: 'Air', mu: 0.0000807, note: 'Effectively transparent. This is why distance, not shielding, is the first line of defence.' },
    { id: 'water', name: 'Water', mu: 0.0707, note: 'A spent-fuel pool is deliberately deep: several metres of water bring the dose at the surface down to background.' },
    { id: 'concrete', name: 'Concrete', mu: 0.149, note: 'Cheap, structural, and works on both gamma and neutrons. Reactor biological shields are metres thick.' },
    { id: 'steel', name: 'Steel', mu: 0.470, note: 'Dense and strong. Used where a shield also has to hold pressure.' },
    { id: 'lead', name: 'Lead', mu: 0.771, note: 'The densest practical shield. Thin lead does what thick concrete does — which is why aprons are lead, not concrete.' }
  ];

  // ── Dose comparisons, in millisieverts. Sources: UNSCEAR 2008/2020,
  //    ICRP 103, US NCRP 160, PHE/UKHSA. ──
  var DOSES = [
    { name: 'Eating one banana', mSv: 0.0001, note: 'The potassium-40 in it. Your body already holds far more, and regulates it — the "banana dose" is a scale marker, not a real exposure.' },
    { name: 'Dental X-ray', mSv: 0.005, note: 'A few days of ordinary background radiation.' },
    { name: 'Flight, London to New York', mSv: 0.04, note: 'Less atmosphere overhead means more cosmic rays. Aircrew are classed as radiation workers in much of Europe.' },
    { name: 'Chest X-ray', mSv: 0.1, note: 'Roughly two weeks of background.' },
    { name: 'Mammogram', mSv: 0.4, note: 'The screening benefit is judged to outweigh this by a wide margin at screening ages.' },
    { name: 'CT scan, head', mSv: 2.0, note: 'About one year of background in a few seconds.' },
    { name: 'Natural background, one year', mSv: 2.4, note: 'The world average (UNSCEAR). Radon is usually the biggest part. Kerala and Ramsar run several times higher with no clear health effect found.' },
    { name: 'CT scan, abdomen', mSv: 10, note: 'The single largest medical dose most people receive. Worth asking whether it is needed — and usually it is.' },
    { name: 'Annual limit, radiation worker', mSv: 20, note: 'ICRP recommendation, averaged over five years. Set well below any level where harm has been observed.' },
    { name: 'Lowest dose with clear cancer link', mSv: 100, note: 'Above this, excess cancer risk is measurable in survivor studies. Below it, the effect is too small to separate from ordinary cancer rates.' },
    { name: 'Radiation sickness begins', mSv: 1000, note: 'Nausea and fatigue within hours. Survivable with care.' },
    { name: 'Fatal without treatment (about half)', mSv: 4500, note: 'LD50/60 — half of those exposed die within 60 days without medical support.' },
    { name: 'Highest Chernobyl responder doses', mSv: 16000, note: 'The firefighters on the roof. 28 died of acute radiation syndrome within months.' }
  ];


  // ── The uranium-238 decay series, the full 14 steps to stable lead-206.
  //    Half-lives from the NNDC chart of nuclides. This chain is the answer to
  //    a question the tool asks elsewhere and never answered: where does the
  //    radon in a basement actually come from? ──
  var U238_CHAIN = [
    { sym: 'U-238',  hl: '4.468 billion y', kind: 'alpha', note: 'The parent. Half of all the uranium-238 made in a supernova before the Earth formed is still here, because its half-life is roughly the age of the planet.' },
    { sym: 'Th-234', hl: '24.1 days',       kind: 'beta',  note: 'Thorium. From here the chain moves fast — every step below is quick compared with the parent.' },
    { sym: 'Pa-234m',hl: '1.17 minutes',    kind: 'beta',  note: 'Protactinium, gone in minutes.' },
    { sym: 'U-234',  hl: '245,500 y',       kind: 'alpha', note: 'Back to uranium, a different isotope. The chain wanders up and down the periodic table as alpha decay removes 2 protons and beta decay adds 1.' },
    { sym: 'Th-230', hl: '75,380 y',        kind: 'alpha', note: 'Used to date corals and cave deposits over the last half-million years.' },
    { sym: 'Ra-226', hl: '1,600 y',         kind: 'alpha', note: 'Radium — what the Curies isolated, and what was painted on watch dials with fatal consequences for the women who did it.' },
    { sym: 'Rn-222', hl: '3.82 days',       kind: 'alpha', gas: true, note: 'RADON. The only GAS in the chain. Everything above and below is a metal locked in rock — but radon can seep out through soil and cracks, and collect in a basement. That single fact is why the chain matters to you.' },
    { sym: 'Po-218', hl: '3.10 minutes',    kind: 'alpha', note: 'Once radon is in your lungs it decays to solid polonium, which sticks to lung tissue and keeps emitting alphas from the inside. The radon is the delivery mechanism; its daughters do most of the damage.' },
    { sym: 'Pb-214', hl: '26.8 minutes',    kind: 'beta',  note: 'Lead-214, still radioactive — most lead isotopes are not.' },
    { sym: 'Bi-214', hl: '19.9 minutes',    kind: 'beta',  note: 'Bismuth. Its gamma emission is what a radon detector actually measures.' },
    { sym: 'Po-214', hl: '164 microseconds',kind: 'alpha', note: 'Blink and it is gone. Half-lives in this chain span 24 orders of magnitude, from microseconds to billions of years.' },
    { sym: 'Pb-210', hl: '22.3 y',          kind: 'beta',  note: 'A long pause. Used to date lake sediments and glacier ice over the last century or so.' },
    { sym: 'Bi-210', hl: '5.01 days',       kind: 'beta',  note: 'Bismuth again, briefly.' },
    { sym: 'Po-210', hl: '138.4 days',      kind: 'alpha', note: 'Polonium-210. Intensely radioactive, and notorious as a poison because intact skin blocks most alpha radiation while internal contamination can deliver a severe dose to a tiny volume of tissue.' },
    { sym: 'Pb-206', hl: 'stable',          kind: 'stable',note: 'Lead-206. The chain stops here. Measuring the ratio of lead-206 to uranium-238 in a rock is how the age of the Earth was established: 4.54 billion years.' }
  ];

  // ── Enrichment. Presented as the threshold ladder every safeguards regime
  //    uses, not as a design curve — the educational point is the FLOOR below
  //    which reactor fuel simply cannot be made to work as a weapon. ──
  var ENRICH_LEVELS = [
    { pct: 0.72, name: 'Natural uranium', use: 'As it comes out of the ground. CANDU reactors run on this directly, using heavy water as the moderator to make up for it.' },
    { pct: 3.5, name: 'Reactor fuel (LEU)', use: 'What almost every power reactor uses. Needs a moderator to slow neutrons before they will sustain fission at all.' },
    { pct: 5, name: 'Upper limit for most fuel', use: 'Above this, licensing and transport rules change sharply.' },
    { pct: 19.75, name: 'HALEU ceiling', use: 'High-assay low-enriched uranium, just under the 20% line. Several SMR designs need it, and the supply chain for it barely exists yet.' },
    { pct: 20, name: 'The safeguards line', use: 'The IAEA threshold for "highly enriched". Above this, material is treated as directly usable and monitored accordingly.' },
    { pct: 90, name: 'Weapons-grade', use: 'What a weapon requires. Getting from 5% to 90% takes thousands of additional centrifuge stages — the enrichment ladder gets steeper the higher you climb, which is precisely what makes it detectable.' }
  ];

  // ── Binding energy per nucleon, MeV. Values from the AME2020 mass evaluation.
  //    This one curve is why fission AND fusion both release energy: everything
  //    runs downhill toward the peak, from either side. ──
  var BINDING = [
    { a: 1, sym: 'H-1', be: 0.000 }, { a: 2, sym: 'H-2', be: 1.112 }, { a: 3, sym: 'H-3', be: 2.827 },
    { a: 3, sym: 'He-3', be: 2.573 }, { a: 4, sym: 'He-4', be: 7.074 }, { a: 6, sym: 'Li-6', be: 5.332 },
    { a: 7, sym: 'Li-7', be: 5.606 }, { a: 9, sym: 'Be-9', be: 6.463 }, { a: 11, sym: 'B-11', be: 6.928 },
    { a: 12, sym: 'C-12', be: 7.680 }, { a: 14, sym: 'N-14', be: 7.476 }, { a: 16, sym: 'O-16', be: 7.976 },
    { a: 20, sym: 'Ne-20', be: 8.032 }, { a: 24, sym: 'Mg-24', be: 8.261 }, { a: 28, sym: 'Si-28', be: 8.448 },
    { a: 32, sym: 'S-32', be: 8.493 }, { a: 40, sym: 'Ar-40', be: 8.595 }, { a: 48, sym: 'Ti-48', be: 8.723 },
    { a: 52, sym: 'Cr-52', be: 8.776 }, { a: 56, sym: 'Fe-56', be: 8.790 }, { a: 58, sym: 'Fe-58', be: 8.792 },
    { a: 62, sym: 'Ni-62', be: 8.795 }, { a: 63, sym: 'Cu-63', be: 8.752 }, { a: 64, sym: 'Zn-64', be: 8.736 },
    { a: 84, sym: 'Kr-84', be: 8.717 }, { a: 90, sym: 'Zr-90', be: 8.710 }, { a: 98, sym: 'Mo-98', be: 8.635 },
    { a: 107, sym: 'Ag-107', be: 8.554 }, { a: 120, sym: 'Sn-120', be: 8.505 }, { a: 132, sym: 'Xe-132', be: 8.428 },
    { a: 138, sym: 'Ba-138', be: 8.393 }, { a: 144, sym: 'Nd-144', be: 8.327 }, { a: 152, sym: 'Sm-152', be: 8.244 },
    { a: 164, sym: 'Dy-164', be: 8.127 }, { a: 176, sym: 'Yb-176', be: 8.024 }, { a: 186, sym: 'W-186', be: 7.913 },
    { a: 197, sym: 'Au-197', be: 7.916 }, { a: 208, sym: 'Pb-208', be: 7.867 }, { a: 232, sym: 'Th-232', be: 7.615 },
    { a: 235, sym: 'U-235', be: 7.591 }, { a: 238, sym: 'U-238', be: 7.570 }, { a: 239, sym: 'Pu-239', be: 7.560 }
  ];

  // Reactions, with the arithmetic done from the binding energies above rather
  // than quoted, so the two always agree.
  var REACTIONS = [
    { id: 'dt', kind: 'fusion', name: 'Deuterium + tritium', eq: 'H-2 + H-3 → He-4 + n',
      inA: 5, outA: 5, mev: 17.6,
      note: 'The easiest fusion reaction to ignite, and the one ITER and NIF both use. Still needs about 100 million °C, because two positive nuclei have to be forced together against their mutual repulsion.' },
    { id: 'pp', kind: 'fusion', name: 'Proton-proton chain', eq: '4 H-1 → He-4 + 2e⁺ + 2ν',
      inA: 4, outA: 4, mev: 26.7,
      note: 'What the Sun actually does. It is astonishingly slow — a given proton waits billions of years — which is exactly why the Sun lasts.' },
    { id: 'u235', kind: 'fission', name: 'Uranium-235 fission', eq: 'U-235 + n → Ba-141 + Kr-92 + 3n',
      inA: 236, outA: 236, mev: 200,
      note: 'A reactor does this about 10²⁰ times a second. The products sit near the peak of the curve, so the drop is large in total even though it is modest per nucleon.' },
    { id: 'coal', kind: 'chemical', name: 'Burning carbon', eq: 'C + O₂ → CO₂',
      // 44 nucleons, not 1: the reactants are a carbon atom AND an oxygen
      // molecule. Using 1 overstated both the per-nucleon figure and the
      // fraction of mass converted by a factor of 44.
      inA: 44, outA: 44, mev: 0.0000041,
      note: 'A chemical reaction rearranges electrons and leaves the nucleus untouched, so it releases about fifty million times less energy per atom. That single ratio is the whole case for nuclear energy.' }
  ];

  var NK_C2 = 931.494;   // MeV per atomic mass unit, from E = mc²

  // ── Annual dose estimator. Component figures from UNSCEAR 2008/2020 and
  //    NCRP 160; radon is the one that varies most between homes. ──
  var DOSE_COSMIC_SEA = 0.28;      // mSv/yr at sea level
  var DOSE_TERRESTRIAL = 0.48;     // mSv/yr average from ground and building materials
  var DOSE_INTERNAL = 0.29;        // mSv/yr from potassium-40 and friends inside you
  var DOSE_FLIGHT_HR = 0.003;      // mSv per hour at cruising altitude
  var RADON_LEVELS = [
    { id: 'low', name: 'Low (well ventilated, no basement)', v: 0.4 },
    { id: 'avg', name: 'Typical', v: 1.3 },
    { id: 'high', name: 'High (basement, granite region)', v: 4.0 },
    { id: 'vhigh', name: 'Very high (untreated hot spot)', v: 12.0 }
  ];
  var SCAN_TYPES = [
    { id: 'dental', name: 'Dental X-ray', v: 0.005 },
    { id: 'chest', name: 'Chest X-ray', v: 0.1 },
    { id: 'mammo', name: 'Mammogram', v: 0.4 },
    { id: 'ctHead', name: 'CT head', v: 2.0 },
    { id: 'ctAbdo', name: 'CT abdomen', v: 10.0 }
  ];

  // ── Deaths per terawatt-hour, full life cycle including accidents, mining
  //    and air pollution. Markandya & Wilkinson (2007) and Sovacool et al.
  //    (2016), as compiled by Our World in Data (2024). ──
  var DEATHS_TWH = [
    { name: 'Coal', v: 24.6, colour: '#78716c', note: 'Almost all of it is air pollution, not accidents. This is the largest number on the list by a wide margin.' },
    { name: 'Oil', v: 18.4, colour: '#a16207', note: 'Again dominated by air pollution from combustion.' },
    { name: 'Biomass', v: 4.6, colour: '#65a30d', note: 'Smoke from burning organic fuel, indoors and out.' },
    { name: 'Natural gas', v: 2.8, colour: '#f59e0b', note: 'Cleaner-burning than coal, but far from zero.' },
    { name: 'Hydropower', v: 1.3, colour: '#38bdf8', note: 'Dominated by a single event: the 1975 Banqiao dam failure in China. Excluding it, hydro looks far safer.' },
    { name: 'Wind', v: 0.04, colour: '#22d3ee', note: 'Mostly construction and maintenance accidents.' },
    { name: 'Nuclear', v: 0.03, colour: '#a78bfa', note: 'Includes Chernobyl and Fukushima. Even with both, it sits with wind and solar rather than with fossil fuels.' },
    { name: 'Solar', v: 0.02, colour: '#fbbf24', note: 'Mostly falls during rooftop installation.' }
  ];

  // Lifecycle emissions, gCO2-equivalent per kWh. IPCC AR5 Annex III medians.
  var CO2_KWH = [
    { name: 'Coal', v: 820, colour: '#78716c' },
    { name: 'Natural gas', v: 490, colour: '#f59e0b' },
    { name: 'Biomass', v: 230, colour: '#65a30d' },
    { name: 'Solar PV', v: 48, colour: '#fbbf24' },
    { name: 'Hydropower', v: 24, colour: '#38bdf8' },
    { name: 'Nuclear', v: 12, colour: '#a78bfa' },
    { name: 'Wind', v: 11, colour: '#22d3ee' }
  ];

  // ── The three accidents everyone names. Figures from UNSCEAR 2008 (Chernobyl)
  //    and UNSCEAR 2020/2021 (Fukushima), plus the Japanese government's own
  //    count of evacuation-related deaths. ──
  var INCIDENTS = [
    { id: 'tmi', name: 'Three Mile Island', year: 1979, place: 'Pennsylvania, USA', level: 'INES 5',
      what: 'A stuck valve and a misread indicator let coolant escape. Half the core melted, but the containment building held.',
      toll: 'No deaths. No detectable off-site health effect; the average dose to nearby residents was about 0.01 mSv, roughly a day of background.',
      changed: 'Rewrote operator training and control-room design across the industry. Also stopped US reactor construction for three decades, which is arguably its largest effect.' },
    { id: 'chernobyl', name: 'Chernobyl', year: 1986, place: 'Ukraine, then USSR', level: 'INES 7',
      what: 'An RBMK reactor with a positive void coefficient — power RISES as coolant boils — pushed into an unstable state during a badly run test, with no containment building over it.',
      toll: '2 died in the explosion, 28 responders of acute radiation syndrome within months, and about 15 people have died of thyroid cancer linked to the fallout. Projections of additional long-term deaths range from several thousand to tens of thousands depending on the model used, and are genuinely disputed among scientists.',
      changed: 'Positive void coefficients were designed out; remaining RBMKs were modified. It also established that the health effects of the disruption — evacuation, poverty, alcohol, fear — can rival the radiation itself.' },
    { id: 'fukushima', name: 'Fukushima Daiichi', year: 2011, place: 'Japan', level: 'INES 7',
      what: 'A magnitude 9.0 earthquake and a 14 m tsunami flooded the backup generators, which sat too low. Without power the cores could not be cooled.',
      toll: 'No deaths from acute radiation. One worker death was attributed to radiation exposure in 2018. Around 2,200 deaths have been attributed to the evacuation itself — mostly elderly patients moved too fast — and roughly 18,500 people were killed by the tsunami.',
      changed: 'Backup power moved above flood level worldwide, and portable emergency equipment stockpiled. It also prompted a hard rethink of whether rapid mass evacuation is always the safer choice.' }
  ];

  // ── Reactor designs, operating and proposed. Status as of early 2026. ──
  var REACTORS = [
    { id: 'pwr', name: 'Pressurised water (PWR)', status: 'operating', share: 'About 70% of the world fleet',
      how: 'Ordinary water under high pressure both cools the core and slows neutrons. A second loop makes the steam, so the turbine side stays clean.',
      safety: 'Water is its own safety feature: lose it and the chain reaction stops, because the neutrons are no longer slowed enough to sustain fission. Decay heat still has to be removed, which is what failed at Fukushima.',
      catch: 'Needs active pumps and power for decay-heat removal. Big, expensive, and slow to build in the West.' },
    { id: 'bwr', name: 'Boiling water (BWR)', status: 'operating', share: 'About 15% of the fleet',
      how: 'Water boils directly in the core and the steam drives the turbine. Simpler — one loop instead of two.',
      safety: 'Same self-limiting physics as a PWR. Fukushima Daiichi units were BWRs; the design was not the cause, the flooded generators were.',
      catch: 'Turbine hall is mildly radioactive, so maintenance is more restricted.' },
    { id: 'candu', name: 'Heavy water (CANDU)', status: 'operating', share: 'Canada, India, and others',
      how: 'Heavy water is such a good moderator that the reactor can run on natural, unenriched uranium.',
      safety: 'Refuels while running, and heavy water gives a large thermal margin.',
      catch: 'Heavy water is expensive, and the design produces more tritium.' },
    { id: 'rbmk', name: 'RBMK (Chernobyl type)', status: 'legacy', share: 'A handful still running in Russia',
      how: 'Graphite moderator with water coolant — an unusual pairing, chosen because it could make weapons material and power at once.',
      safety: 'The design flaw: a POSITIVE void coefficient. When coolant boiled, power went UP rather than down. Modern designs are required to be negative.',
      catch: 'Built without a full containment building. Both problems have since been mitigated on the surviving units.' },
    { id: 'smr', name: 'Small modular (SMR)', status: 'emerging', share: 'A few operating; many proposed',
      how: 'Reactors under about 300 MW built in a factory and shipped, rather than poured on site. Several modules make up a plant.',
      safety: 'Small cores make passive cooling genuinely feasible — convection and gravity alone can remove decay heat, with no pumps and no operator action for days.',
      catch: 'The honest position: almost none are operating commercially. China\'s HTR-PM began commercial operation in 2023 and Russia has a floating plant, but NuScale\'s flagship US project was cancelled in 2023 when projected costs rose from about $58 to $89 per MWh. Factory economics need volume that does not yet exist.' },
    { id: 'msr', name: 'Molten salt', status: 'proposed', share: 'Prototypes only',
      how: 'The fuel is dissolved in liquid salt rather than sealed in solid rods, and runs hot at near-atmospheric pressure.',
      safety: 'A freeze plug melts on loss of power and drains the fuel into passively cooled tanks. No pressure means no pressure-driven release.',
      catch: 'The salts are corrosive and the chemistry is hard. A 1960s test reactor ran successfully; no commercial unit exists. Treat timelines with caution.' },
    { id: 'fusion', name: 'Fusion', status: 'research', share: 'No power on any grid',
      how: 'Force light nuclei together instead of splitting heavy ones. Deuterium-tritium is the easiest reaction and still needs about 100 million °C.',
      safety: 'Cannot melt down — stop the fuel supply and it stops instantly. Waste is short-lived compared with fission.',
      catch: 'In December 2022 the National Ignition Facility got 3.15 MJ out for 2.05 MJ delivered to the target — a real first. But the lasers drew roughly 300 MJ from the wall, so the plant was far from break-even. ITER\'s 2024 baseline targets Start of Research Operation in 2034, full magnetic energy in 2036, and deuterium-tritium operation in 2039. Useful electricity remains decades away.' }
  ];

  // ── What to do with the waste. Volumes from IAEA and the US DOE. ──
  var WASTE_FACTS = [
    { name: 'How much there is', fact: 'About 400,000 tonnes of spent fuel worldwide, growing by roughly 2,000–2,500 t a year.',
      detail: 'All the spent fuel the US has ever made from commercial power would cover a single football field to a depth of about 10 metres. Compare that with the ash and CO2 from an equivalent amount of coal, which is measured in billions of tonnes.' },
    { name: 'How long it stays dangerous', fact: 'Radiotoxicity falls back to that of the original uranium ore after roughly 100,000 to 300,000 years.',
      detail: 'Most of that tail comes from a small mass of long-lived actinides. Reprocessing or fast-reactor transmutation could cut the required isolation time to under a thousand years — technically demonstrated, but expensive and it raises proliferation questions.' },
    { name: 'Where it is right now', fact: 'Mostly on the sites that made it — first in cooling pools, then in dry casks.',
      detail: 'This works and is well monitored, but it was meant to be temporary. Storing waste at dozens of reactor sites indefinitely is a policy failure rather than a technical one.' },
    { name: 'The permanent answer', fact: 'Finland\'s Onkalo is the first deep geological repository in the world to be built and licensed.',
      detail: 'Copper canisters in bentonite clay, 430 m down in 1.9-billion-year-old bedrock, designed for 100,000 years. Sweden has approved a similar site. The US Yucca Mountain project was defunded in 2011 over political rather than technical objections.' },
    { name: 'The part nobody solved', fact: 'How do you warn someone 10,000 years from now?',
      detail: 'No language or symbol has survived that long. Serious proposals have included hostile architecture, engineered "atomic priesthoods" and cats bred to change colour near radiation. None is convincing, and the current consensus is to build deep, record carefully, and accept the limits of the idea.' }
  ];


  // ── Detection. The tool talks about sieverts everywhere above and never once
  //    says how anybody KNOWS. A counter does not measure dose; it measures
  //    counts, and counts are a random process. Both facts get skipped in most
  //    treatments, and both are where students form durable misconceptions.
  //
  //    The detector is a school end-window Geiger-Müller tube, modelled from
  //    its geometry rather than a fudge factor: a window of area A at distance
  //    d intercepts A/(4πd²) of the gammas leaving a point source, and the tube
  //    registers a small percentage of the ones that arrive. Intrinsic
  //    efficiencies here are the ~1% typical of a thin-walled GM tube at these
  //    photon energies (Knoll, Radiation Detection and Measurement, ch. 7).
  //    A GM tube is a poor gamma detector and that is the point — it is what
  //    schools actually own. ──
  var GM_WINDOW_CM2 = 6.16;   // π × (1.4 cm)² end window
  var GM_BACKGROUND = 0.42;   // counts/s at sea level with no source, ≈25 cpm

  // gps = gamma photons emitted per second = activity × photons per decay.
  // Keeping activity and photon rate as separate fields is deliberate: the gap
  // between them is half of why becquerels and counts are not the same thing.
  var COUNT_SOURCES = [
    { id: 'none', name: 'Background only', bq: 0, gps: 0, eff: 0.010, desc: 'No source at all.',
      note: 'Cosmic rays, potassium-40 in the walls and in you, and radon daughters in the air. About 25 counts a minute, everywhere, always. Every measurement below has to be read against this — which is why you count it too.' },
    { id: 'banana', name: 'One banana', bq: 14, gps: 1.48, eff: 0.008, desc: '≈0.45 g of potassium, so ≈14 Bq of K-40.',
      note: 'A banana really is radioactive, and a school counter really cannot see it. Only 10.6% of K-40 decays give off a gamma at all, the window catches a sliver of those, and the tube registers about 1%. The "banana dose" is a unit of explanation, not a measurement.' },
    { id: 'kcl', name: '1 kg salt substitute (KCl)', bq: 16600, gps: 1751, eff: 0.008, desc: '524 g of potassium at 31.7 Bq/g.',
      note: 'The cheapest detectable source in a supermarket — but only just. It is over a thousand bananas, and at arm\'s length it still vanishes into the background. Put the tube almost against the bag and count for several minutes and it appears. This is the source that teaches you what a long count is actually for.' },
    { id: 'cs137', name: 'Cs-137 check source, 37 kBq', bq: 37000, gps: 31487, eff: 0.010, desc: '1 µCi sealed disc, 662 keV gamma in 85.1% of decays.',
      note: 'The standard teaching source, sealed in plastic so the beta never gets out. Note what its 30-year half-life means for a school cupboard: a source bought in 1990 now emits about half what its label says, and an uncalibrated old source reads low for a reason that has nothing to do with the detector.' },
    { id: 'co60', name: 'Co-60 check source, 37 kBq', bq: 37000, gps: 74000, eff: 0.009, desc: '1 µCi, and TWO gammas per decay (1.17 and 1.33 MeV).',
      note: 'Same activity in becquerels as the caesium source, roughly twice the count rate. Activity counts nuclei falling apart; it says nothing about how many photons come out, or how energetic they are. This pair is the cleanest demonstration of that in the whole tool.' }
  ];
  var COUNT_TIMES = [5, 10, 30, 60, 300, 600];

  // Knuth for small means; the normal approximation above 30, where it is
  // indistinguishable and does not loop λ times.
  function nkPoisson(lam) {
    if (!(lam > 0)) return 0;
    if (lam < 30) {
      var L = Math.exp(-lam), k = 0, p = 1;
      do { k++; p *= Math.random(); } while (p > L);
      return k - 1;
    }
    var u1 = Math.max(1e-12, Math.random()), u2 = Math.random();
    var z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return Math.max(0, Math.round(lam + z * Math.sqrt(lam)));
  }

  // ── Gray to sievert. Every dose figure in this tool is quoted in mSv and
  //    nothing above says where that unit comes from. The gap matters: the
  //    gray is pure physics and the sievert is physics multiplied by biology,
  //    and the tool's own claim that alpha is "harmless outside the body and
  //    serious inside it" is a statement about exactly this factor.
  //    Radiation weighting factors from ICRP Publication 103 (2007), Table 2. ──
  var RAD_WEIGHTS = [
    { id: 'gamma', name: 'Gamma / X-ray', symbol: 'γ', wr: 1, colour: '#a78bfa',
      why: 'The reference. A photon deposits its energy thinly along a track metres long, so the damage is spread out and cells usually repair it.' },
    { id: 'beta', name: 'Beta (electrons)', symbol: 'β', wr: 1, colour: '#60a5fa',
      why: 'Weighted the same as photons. A fast electron is also a sparse ioniser — the difference between beta and gamma is where they can reach, not what they do once there.' },
    { id: 'proton', name: 'Protons', symbol: 'p', wr: 2, colour: '#fbbf24',
      why: 'Twice as damaging per joule. Relevant to aircrew, astronauts and proton beam therapy, where the concentrated track is the whole point of the treatment.' },
    { id: 'neutron', name: 'Neutrons (fission energy)', symbol: 'n', wr: 20, colour: '#34d399',
      why: 'The awkward one: the factor is not a single number but a continuous function of energy, running from about 2.5 for very slow or very fast neutrons up to about 20 around 1 MeV. Fission neutrons sit near that peak, which is the value used here.' },
    { id: 'alpha', name: 'Alpha', symbol: 'α', wr: 20, colour: '#f87171',
      why: 'Twenty times the harm for the same joule per kilogram. An alpha particle spends its entire energy in a track a few tens of micrometres long — roughly one cell — so the DNA breaks arrive clustered, and clustered breaks are the ones repair gets wrong.' }
  ];

  // Tissue weighting factors, ICRP 103 Table 3. These sum to exactly 1.00 by
  // construction: they apportion whole-body detriment, they do not measure it.
  var TISSUE_WEIGHTS = [
    { id: 'marrow', name: 'Red bone marrow', wt: 0.12 },
    { id: 'colon', name: 'Colon', wt: 0.12 },
    { id: 'lung', name: 'Lung', wt: 0.12 },
    { id: 'stomach', name: 'Stomach', wt: 0.12 },
    { id: 'breast', name: 'Breast', wt: 0.12 },
    { id: 'remainder', name: 'Remainder tissues', wt: 0.12 },
    { id: 'gonads', name: 'Gonads', wt: 0.08 },
    { id: 'bladder', name: 'Bladder', wt: 0.04 },
    { id: 'oesophagus', name: 'Oesophagus', wt: 0.04 },
    { id: 'liver', name: 'Liver', wt: 0.04 },
    { id: 'thyroid', name: 'Thyroid', wt: 0.04 },
    { id: 'bone', name: 'Bone surface', wt: 0.01 },
    { id: 'brain', name: 'Brain', wt: 0.01 },
    { id: 'salivary', name: 'Salivary glands', wt: 0.01 },
    { id: 'skin', name: 'Skin', wt: 0.01 }
  ];

  // ── Biological half-life. Half-lives above are all PHYSICAL, and for a
  //    nuclide inside a person the physical half-life is often the number that
  //    matters least. Excretion runs in parallel with decay, so the rates add:
  //      1/T_eff = 1/T_phys + 1/T_bio
  //    This is where "caesium-137 has a 30-year half-life" turns into a
  //    misconception. In soil, yes. In a person, ten weeks.
  //    Biological half-lives from ICRP 30 / ICRP 137 biokinetic models; they
  //    vary between individuals far more than physical half-lives do (which
  //    do not vary at all), and the tool says so rather than implying
  //    three-figure precision. All values stored in DAYS. ──
  var BIO_NUCLIDES = [
    { id: 'tc99m', name: 'Technetium-99m', tp: 6.01 / 24, tb: 1, where: 'Whole body, as pertechnetate', colour: '#22d3ee',
      note: 'Designed around this. A diagnostic scan needs the isotope present while the camera is running and gone shortly after, and both halves of that are engineered: a 6-hour physical half-life, and a chemistry the kidneys clear in about a day.' },
    { id: 'h3', name: 'Tritium (as water)', tp: 12.32 * 365.25, tb: 10, where: 'Whole body — it IS water', colour: '#60a5fa',
      note: 'Twelve years on a shelf, ten days in a person, and the difference is chemistry rather than nuclear physics. Tritiated water joins the body water pool and leaves with it. Drink more, clear it faster — one of the very few cases where that sentence is medically true.' },
    { id: 'k40', name: 'Potassium-40', tp: 1.25e9 * 365.25, tb: 30, where: 'Whole body, with your potassium', colour: '#a3e635',
      note: 'A physical half-life of 1.25 billion years and a body burden that turns over completely in a month. The potassium-40 decaying in you as you read this was not in you last year, and your total will not change however long you live, because your body holds potassium to a set point.' },
    { id: 'i131', name: 'Iodine-131', tp: 8.02, tb: 80, where: 'Thyroid, which concentrates iodine', colour: '#fbbf24',
      note: 'The 7.3-day effective half-life is why radioiodine therapy works and why the thyroid is the organ at risk after a release. It is also why potassium iodide tablets have to be taken BEFORE or within hours of exposure: they work by filling the thyroid with stable iodine first, and a full thyroid cannot take up much more.' },
    { id: 'po210', name: 'Polonium-210', tp: 138.4, tb: 50, where: 'Liver, kidney, spleen, bone marrow', colour: '#fb923c',
      note: 'Neither number is long, and it does not need to be. An alpha emitter distributed through soft tissue delivers its entire dose internally within weeks — which is precisely why the effective half-life being short offers no protection at all here.' },
    { id: 'cs137', name: 'Caesium-137', tp: 30.05 * 365.25, tb: 70, where: 'Whole body — it behaves like potassium', colour: '#f472b6',
      note: 'THE misconception in this whole tool. Caesium-137 defines the exclusion zones for thirty years because that is how long it persists in SOIL. Inside a person it is chemically potassium, and the body flushes potassium: about seventy days, and faster in children. The land and the person are two different clocks and they get quoted as one.' },
    { id: 'sr90', name: 'Strontium-90', tp: 28.79 * 365.25, tb: 18 * 365.25, where: 'Bone — it substitutes for calcium', colour: '#94a3b8',
      note: 'Chemically calcium, so bone takes it up and holds it. Here biology barely helps: a body that is very good at keeping calcium is, for this one purpose, very bad at letting go. This is why strontium in milk was the fallout figure that frightened people most in the 1950s.' },
    { id: 'ra226', name: 'Radium-226', tp: 1600 * 365.25, tb: 45 * 365.25, where: 'Bone, like strontium', colour: '#c084fc',
      note: 'What happened to the radium dial painters. They pointed their brushes with their lips, swallowed microgram quantities, and a bone-seeking alpha emitter with a decades-long biological half-life did the rest. The physical half-life of 1,600 years was never the relevant number; the biological one was.' },
    { id: 'pu239', name: 'Plutonium-239', tp: 24110 * 365.25, tb: 50 * 365.25, where: 'Bone surface and liver', colour: '#ef4444',
      note: 'The case where biology does not rescue you. An alpha emitter that lodges in bone and stays for fifty years is, for a human lifetime, permanent — so the intake limits are correspondingly tiny. Intact skin blocks most alpha radiation, but contamination can still reach the eye or an open wound; inhaling or swallowing plutonium is the dominant hazard.' }
  ];

  // ── Time, distance, shielding. Sections 5 and 12 cover two of the three
  //    levers and the tool never names the third, which is the cheapest and
  //    the one an actual radiation worker reaches for first.
  //
  //    Dose rate is COMPUTED here, not quoted, from the decay scheme:
  //      K = A · Σ(E_i · y_i · (μ_en/ρ)_air(E_i)) / (4πd²)
  //    Two things this gets wrong if done carelessly, both of which cost ~20%:
  //    weighting μ_en/ρ by the MEAN photon energy instead of per line, and
  //    dropping the K X-rays. With both fixed the derived constants land within
  //    3% of the published R·cm²/(mCi·h) values for every source below — which
  //    is asserted in nuclearlab_science.test.js rather than taken on trust.
  //    Iridium-192 is deliberately absent: its scheme has ~25 lines, a short
  //    list comes out 13% low, and a number the tool cannot defend is worse
  //    than a source it does not offer. ──
  var MU_EN_AIR = [
    [0.01, 4.742], [0.015, 1.334], [0.02, 0.5389], [0.03, 0.1537], [0.04, 0.06833],
    [0.05, 0.04098], [0.06, 0.03041], [0.08, 0.02407], [0.10, 0.02325], [0.15, 0.02496],
    [0.20, 0.02672], [0.30, 0.02872], [0.40, 0.02949], [0.50, 0.02966], [0.60, 0.02953],
    [0.80, 0.02882], [1.00, 0.02789], [1.25, 0.02666], [1.50, 0.02547], [2.00, 0.02345]
  ];
  // Log-log interpolation: this coefficient spans three decades across the
  // table, so straight-line interpolation is badly wrong at the soft end.
  function nkMuEnAir(e) {
    if (e <= MU_EN_AIR[0][0]) return MU_EN_AIR[0][1];
    var last = MU_EN_AIR[MU_EN_AIR.length - 1];
    if (e >= last[0]) return last[1];
    for (var i = 1; i < MU_EN_AIR.length; i++) {
      if (e <= MU_EN_AIR[i][0]) {
        var x0 = MU_EN_AIR[i - 1][0], y0 = MU_EN_AIR[i - 1][1];
        var x1 = MU_EN_AIR[i][0], y1 = MU_EN_AIR[i][1];
        var f = (Math.log(e) - Math.log(x0)) / (Math.log(x1) - Math.log(x0));
        return Math.exp(Math.log(y0) + f * (Math.log(y1) - Math.log(y0)));
      }
    }
    return last[1];
  }
  // mSv per hour at 1 m, per GBq.
  function nkGammaConst(lines) {
    var acc = 0;
    for (var i = 0; i < lines.length; i++) {
      acc += lines[i][0] * lines[i][1] * nkMuEnAir(lines[i][0]) * 0.1;  // cm²/g → m²/kg
    }
    return (1e9 * 1.602e-13 * acc / (4 * Math.PI)) * 3600 * 1000;
  }

  // Energies in MeV, yields per decay, including the K X-rays — leaving those
  // out puts technetium 25% low, because μ_en/ρ for air at 18 keV is twenty
  // times what it is at 140 keV.
  var PROTECT_SOURCES = [
    { id: 'tc99m', name: 'Someone who has just had a bone scan', nuclide: 'Tc-99m', gbq: 0.8,
      lines: [[0.1405, 0.885], [0.0185, 0.074]], colour: '#22d3ee',
      note: 'A routine diagnostic injection. The question people actually ask — can I sit next to them, can they hug their child — has a number, and it is a reassuring one. Its 6-hour physical half-life and 1-day biological one (section 9) do the rest within a day.' },
    { id: 'i131', name: 'A patient treated for thyroid cancer', nuclide: 'I-131', gbq: 5.5,
      lines: [[0.3645, 0.817], [0.6370, 0.072], [0.2843, 0.061], [0.7229, 0.018], [0.0296, 0.039]], colour: '#fbbf24',
      note: 'Seven times the activity of the scan above and a harder gamma, which is why these patients are kept in a shielded room for a few days and sent home with rules about distance and time. This is the one case where a hospital hands a family the same three levers this section is about.' },
    { id: 'cs137', name: 'An industrial thickness gauge', nuclide: 'Cs-137', gbq: 37,
      lines: [[0.6617, 0.851], [0.032, 0.058]], colour: '#a78bfa',
      note: 'A sealed 1-curie source in a steel housing on a production line, measuring how thick the sheet passing under it is. Perfectly safe shuttered; the accidents happen when a source is left unshuttered and someone works next to it not knowing.' },
    { id: 'co60', name: 'A sterilisation source', nuclide: 'Co-60', gbq: 37,
      lines: [[1.1732, 0.9985], [1.3325, 0.9998]], colour: '#f87171',
      note: 'Same activity in becquerels as the gauge above and four times the dose rate, because cobalt emits two hard gammas per decay rather than one soft one — the becquerel-versus-dose distinction from section 12, now in units that matter. A real irradiator holds tens of thousands of times this, behind metres of concrete.' }
  ];
  // Where the numbers land, for the stay-time readout.
  var DOSE_LIMITS = [
    { id: 'public', name: 'Public annual limit', mSv: 1 },
    { id: 'worker', name: 'Worker annual limit', mSv: 20 },
    { id: 'sick', name: 'Radiation sickness begins', mSv: 1000 }
  ];

  // ── Shelter or evacuate. The accidents section states that about 2,200
  //    people died because of the Fukushima evacuation and one from radiation,
  //    and that this "prompted a hard rethink of whether rapid mass evacuation
  //    is always the safer choice". It then leaves the reader with a striking
  //    fact and no way to think about it.
  //
  //    This is the one place in the tool where the honest answer is genuinely
  //    "it depends", and the thing it depends on is arithmetic a student can
  //    do. Sheltering is not a third option alongside the three levers — it IS
  //    two of them: a building is shielding, and staying put is less time in
  //    the open than driving through a plume. Which wins flips on the numbers,
  //    and the section is built so that it visibly flips.
  //
  //    Shielding factors from FEMA/EPA emergency planning guidance for cloud
  //    and ground shine. These are ranges in the source material and are shown
  //    as ranges here; a single figure would imply a precision nobody has. ──
  var SHELTER_PLACES = [
    { id: 'outdoors', name: 'Outdoors, or in a car', drf: 0.9, range: '0.9 – 1.0', colour: '#f87171',
      note: 'A car is not shelter. Glass and thin steel stop essentially nothing at these energies, which is exactly why the hours spent driving out are the expensive part of evacuating.' },
    { id: 'wood', name: 'Wood-frame house, ground floor', drf: 0.4, range: '0.2 – 0.5', colour: '#fb923c',
      note: 'Most housing in most countries. Cuts the dose by roughly half to three-quarters — modest, but it costs nothing and starts the moment you close the door.' },
    { id: 'masonry', name: 'Brick or concrete house', drf: 0.2, range: '0.1 – 0.3', colour: '#fbbf24',
      note: 'Mass is what matters, and masonry has several times the mass per square metre of a timber wall. Moving to an interior room, away from outside walls and windows, does more again.' },
    { id: 'basement', name: 'Basement of a masonry house', drf: 0.05, range: '0.02 – 0.1', colour: '#34d399',
      note: 'Earth on three sides and a floor overhead. A basement is the best shelter most people have and almost nobody thinks of it, because the word "basement" is associated with the wrong kind of emergency.' },
    { id: 'large', name: 'Interior of a large concrete building', drf: 0.02, range: '0.005 – 0.05', colour: '#2dd4bf',
      note: 'A school, a hospital, an office block — anywhere with a lot of building between you and the sky. Fifty times better than standing outside, and it is where most people already are on a weekday.' }
  ];
  // Published decision thresholds. These are PROJECTED doses over a stated
  // window, not measured ones, which is the part that makes real decisions hard.
  var PAG_LEVELS = [
    { name: 'US EPA protective action guide, lower bound', mSv: 10, window: 'first 4 days',
      what: 'At a projected 10 mSv, authorities are expected to act — evacuate or shelter, whichever gives the lower dose. Not "evacuate": whichever is lower.' },
    { name: 'US EPA protective action guide, upper bound', mSv: 50, window: 'first 4 days',
      what: 'The top of the same range. Above this the case for moving people is strong enough that the disruption is usually judged worth it.' },
    { name: 'IAEA generic criterion', mSv: 100, window: 'first 7 days',
      what: 'The international threshold for urgent protective action. Note it sits at the same 100 mSv as the lowest dose with a clearly measurable cancer link, from section 11.' }
  ];

  // ── Readable ink. The accent colours below are chosen to sit on a DARK
  //    card, and most of them do that well. Put the same hex on the light
  //    theme's near-white card and it collapses: a static audit of every
  //    hard-coded text colour in this file found 22 of 24 below the WCAG AA
  //    4.5:1 line in light mode — including every section heading, which is
  //    the one thing a reader has to be able to find.
  //
  //    So an accent now has two inks. The accent itself still draws borders,
  //    bars and 3D materials unchanged; only TEXT is remapped, because only
  //    text has a contrast requirement. Pairs are Tailwind 300/400 against the
  //    dark card and 700/800 against the light one, and every pair is asserted
  //    against both backgrounds in nuclearlab_contrast_a11y.test.js — the
  //    lowest is 4.84:1. Anything not in this table passes through untouched,
  //    which is what keeps '#0b1020' (dark text ON an accent) correct. ──
  var NK_INK = {
    '#fbbf24': ['#fbbf24', '#a16207'], '#f59e0b': ['#fbbf24', '#a16207'],   // amber
    '#22d3ee': ['#22d3ee', '#0e7490'], '#0891b2': ['#22d3ee', '#0e7490'],   // cyan
    '#c4b5fd': ['#c4b5fd', '#6d28d9'], '#a78bfa': ['#a78bfa', '#6d28d9'],   // violet
    '#2dd4bf': ['#2dd4bf', '#0f766e'], '#0d9488': ['#2dd4bf', '#0f766e'],   // teal
    '#34d399': ['#34d399', '#047857'], '#059669': ['#34d399', '#047857'],   // emerald
    '#84cc16': ['#a3e635', '#4d7c0f'], '#65a30d': ['#a3e635', '#4d7c0f'],   // lime
    '#a3e635': ['#a3e635', '#4d7c0f'],
    '#38bdf8': ['#38bdf8', '#0369a1'], '#0284c7': ['#38bdf8', '#0369a1'],   // sky
    '#fb923c': ['#fb923c', '#c2410c'], '#ea580c': ['#fb923c', '#c2410c'],   // orange
    '#e879f9': ['#e879f9', '#a21caf'], '#c026d3': ['#e879f9', '#a21caf'],   // fuchsia
    '#60a5fa': ['#60a5fa', '#1d4ed8'],                                       // blue
    '#94a3b8': ['#cbd5e1', '#475569'],                                       // slate
    '#c084fc': ['#c084fc', '#7e22ce'],                                       // purple
    '#f472b6': ['#f472b6', '#be185d'],                                       // pink
    '#f87171': ['#f87171', '#b91c1c'], '#ef4444': ['#f87171', '#b91c1c'],   // red
    '#dc2626': ['#f87171', '#b91c1c'],
    '#78716c': ['#a8a29e', '#57534e'],                                       // stone
    '#a16207': ['#fbbf24', '#a16207']
  };

  // ── The chain as a map, not a list. Section 3 tells the reader the chain
  //    "wanders up and down the periodic table as alpha decay removes 2 protons
  //    and beta decay adds 1", and then shows fifteen rows of text. Plotted on
  //    the axes physicists actually use — neutrons across, protons up — that
  //    sentence becomes a shape: alpha steps run down-left at a fixed diagonal,
  //    beta steps kick back up-left at a different one, and the zigzag is the
  //    whole mechanism at a glance. Z from the element symbol, A from the mass
  //    number already in the table, N = A - Z. Nothing new is asserted here;
  //    it is the same fourteen steps in a second projection. ──
  var NK_Z = { U: 92, Pa: 91, Th: 90, Ra: 88, Rn: 86, Bi: 83, Po: 84, Pb: 82 };
  var NK_CHAIN_XY = U238_CHAIN.map(function (step, i) {
    var bits = step.sym.split('-');
    var z = NK_Z[bits[0]];
    var a = parseInt(bits[1].replace(/[^0-9]/g, ''), 10);
    return { sym: step.sym, z: z, n: a - z, a: a, kind: step.kind, gas: !!step.gas, i: i };
  });

  // Hex (or an existing rgb/rgba string) to rgba at a given alpha, for chart
  // gradients and label backing plates.
  function nkRgba(colour, alpha) {
    var m = /^#([0-9a-fA-F]{6})$/.exec(String(colour).trim());
    if (m) {
      var n = parseInt(m[1], 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + alpha + ')';
    }
    var r = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(String(colour).trim());
    if (r) return 'rgba(' + r[1] + ',' + r[2] + ',' + r[3] + ',' + alpha + ')';
    return colour;
  }

  function nkClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function nkFmt(n, dp) { var f = Math.pow(10, dp || 0); return (Math.round(n * f) / f).toLocaleString(); }
  // Doses span eight orders of magnitude, so anything linear is unreadable.
  function nkLogFrac(v, lo, hi) {
    return nkClamp((Math.log10(v) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)), 0, 1);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Reactor operation simulator
  //
  // The base case is a MODERN reactor operated normally, because that is the
  // thing nobody ever sees: holding k at exactly 1, fighting xenon, and
  // removing decay heat after shutdown. The accident conditions are available
  // as switchable case studies rather than as a disaster game — the point is
  // "here is the flaw, watch the physics do it", not "can you kill people".
  //
  // Physics: one-group point kinetics using the prompt-jump approximation,
  // which is the standard teaching form. Full point kinetics with
  // Lambda = 1e-4 s is stiff and blows up at any frame rate a browser can hold.
  //   rho  = rho_rods + rho_temperature + rho_void + rho_xenon
  //   T    = (beta - rho) / (lambda * rho)        reactor period, seconds
  //   dP/dt = P / T
  // Prompt criticality at rho >= beta is where period collapses to Lambda /
  // (rho - beta) and no operator action can keep up. That is the cliff the
  // whole of reactor control exists to stay away from.
  // ═══════════════════════════════════════════════════════════════════════
  var RX_BETA = 0.0065;          // delayed neutron fraction, U-235
  var RX_LAMBDA_D = 0.0767;      // one-group delayed precursor decay constant, /s
  var RX_GEN = 1e-4;             // prompt neutron generation time, s
  var RX_T_REF = 290;            // reference coolant temperature, C
  var RX_T_CLAD = 1200;          // zirconium cladding starts to fail, C
  var RX_T_MELT = 2865;          // uranium dioxide melts, C
  var RX_LAM_I = Math.LN2 / (6.57 * 3600);   // iodine-135, 6.57 h
  var RX_LAM_X = Math.LN2 / (9.14 * 3600);   // xenon-135, 9.14 h

  var RX_MODES = [
    { id: 'modern', name: 'Modern PWR', voidCoef: -1.6e-4, tempCoef: -2.5e-5,
      blurb: 'Negative temperature AND void coefficients. Heat it up or boil it and the reaction fights back on its own, with no operator and no computer involved.' },
    { id: 'rbmk', name: 'RBMK (Chernobyl type)', voidCoef: 2.0e-4, tempCoef: -1.0e-5,
      blurb: 'POSITIVE void coefficient. Boiling the coolant ADDS reactivity, so the reaction accelerates itself. This is the design flaw, and it is why every modern licence requires a negative coefficient.' }
  ];

  var RX_SCENARIOS = [
    { id: 'steady', name: 'Hold at full power', goal: 'Keep power between 95% and 105% for 60 seconds.',
      brief: 'The ordinary job. Rods trim the reaction against slow drifts. Notice how sluggish the response feels — that lag is the delayed neutrons, and without them this would be uncontrollable.' },
    { id: 'xenon', name: 'The xenon pit', goal: 'Drop to 20% power, hold 90 seconds, then get back above 80%.',
      brief: 'Xenon-135 absorbs neutrons ferociously and builds up when power drops. Operators at Chernobyl met this, pulled almost every rod to fight it, and left the core with no shutdown margin. You will feel the same trap; the difference is that you can see the xenon number.' },
    { id: 'blackout', name: 'Station blackout', goal: 'After the scram, keep fuel below 1200 °C for 120 seconds.',
      brief: 'The reactor scrams correctly and fission stops — and the core still makes about 6.5% of full power from decaying fission products. That is what flooded generators cost Fukushima. Restore any cooling you can.' }
  ];

  function rxDecayHeat(p0, secs) {
    // Wigner-Way approximation, valid from about 10 s after shutdown
    return p0 * 0.065 * Math.pow(Math.max(secs, 10), -0.2) / Math.pow(10, -0.2);
  }

  // ── 3D core. Geometry only; the host owns WebGL, orbit, picking and fallback.
  //    Rebuilt when the quantised rod position changes, so the rods visibly move
  //    without re-creating the scene every frame. ──
  var RX_PARTS = [
    { id: 'fuel', label: 'Fuel assemblies', color: '#fbbf24', desc: 'Uranium dioxide pellets stacked in zirconium tubes. Enriched to 3–5% U-235 — nowhere near the 90%+ a weapon needs, which is the simplest reason a power reactor cannot detonate like one.' },
    { id: 'rods', label: 'Control rods', color: '#38bdf8', desc: 'Boron or cadmium: nuclei that swallow neutrons without fissioning. Drop them in and k falls. On a scram they are released and fall under gravity, so losing power INSERTS them rather than stranding them.' },
    { id: 'coolant', label: 'Coolant / moderator', color: '#60a5fa', desc: 'In a PWR, ordinary water does both jobs: it carries the heat away and it slows neutrons so they can cause fission. Lose the water and the chain reaction stops on its own — but decay heat does not.' },
    { id: 'vessel', label: 'Pressure vessel', color: '#94a3b8', desc: 'Steel around 20 cm thick holding roughly 155 atmospheres, so the water reaches over 300 °C without boiling. It is the first barrier between the fuel and the world.' },
    { id: 'containment', label: 'Containment', color: '#a78bfa', desc: 'A metre of reinforced concrete over a steel liner. Three Mile Island melted half its core and this held. Chernobyl had nothing equivalent, which is most of the difference in outcome.' }
  ];

  function rxBuildCore(THREE, api) {
    // Every variable declared before use — a declaration below its first use is
    // what silently broke another 3D tool in this lab for most of its shapes.
    var meshes = {}, picks = [];
    var anchor = new THREE.Group();
    api.scene.add(anchor);
    var contrast = !!api.contrast;
    var sp = api.sceneProps || {};
    var rodFrac = typeof sp.rods === 'number' ? sp.rods / 100 : 0.5;
    var hot = typeof sp.hot === 'number' ? sp.hot : 0;          // 0..1 how hot the core is

    var colourOf = function (id) {
      if (contrast) return '#ffffff';
      for (var i = 0; i < RX_PARTS.length; i++) if (RX_PARTS[i].id === id) return RX_PARTS[i].color;
      return '#94a3b8';
    };
    var mat = function (id, o) {
      o = o || {};
      return new THREE.MeshPhongMaterial({
        color: new THREE.Color(o.colour || colourOf(id)),
        shininess: contrast ? 0 : 28,
        specular: contrast ? 0x000000 : 0x5b6472,
        transparent: o.opacity != null && o.opacity < 1,
        opacity: o.opacity == null ? 1 : o.opacity,
        emissive: new THREE.Color(o.emissive || '#000000')
      });
    };

    var H = 2.0, R = 1.05;

    // containment shell
    var shell = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.55, R + 0.55, H + 1.1, 28, 1, true),
      mat('containment', { opacity: contrast ? 1 : 0.13 }));
    anchor.add(shell);
    meshes.containment = shell;
    picks.push(shell);

    // pressure vessel
    var vessel = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.16, R + 0.16, H + 0.4, 26, 1, true),
      mat('vessel', { opacity: contrast ? 1 : 0.3 }));
    anchor.add(vessel);
    meshes.vessel = vessel;
    picks.push(vessel);

    // coolant volume, tinted by temperature
    var coolCol = hot > 0.66 ? '#f87171' : (hot > 0.33 ? '#fb923c' : '#60a5fa');
    var cool = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, H + 0.2, 24),
      mat('coolant', { colour: contrast ? '#ffffff' : coolCol, opacity: contrast ? 1 : 0.16 }));
    anchor.add(cool);
    meshes.coolant = cool;
    picks.push(cool);

    // fuel assemblies on a square lattice inside the circle
    var fuelGroup = new THREE.Group();
    var rodGroup = new THREE.Group();
    var fuelGeo = new THREE.CylinderGeometry(0.055, 0.055, H, 8);
    var rodGeo = new THREE.CylinderGeometry(0.045, 0.045, H, 8);
    var glow = hot > 0.5 ? (hot > 0.8 ? '#7f1d1d' : '#4a2405') : '#000000';
    var gx, gz, px, pz, isRod, m, n = 0;
    for (gx = -4; gx <= 4; gx++) {
      for (gz = -4; gz <= 4; gz++) {
        px = gx * 0.21; pz = gz * 0.21;
        if (Math.sqrt(px * px + pz * pz) > R - 0.08) continue;
        n++;
        isRod = ((gx + 8) % 3 === 0 && (gz + 8) % 3 === 0);
        if (isRod) {
          m = new THREE.Mesh(rodGeo, mat('rods'));
          // insertion: fully in sits centred, fully out is lifted clear of the core
          m.position.set(px, (1 - rodFrac) * H, pz);
          rodGroup.add(m);
        } else {
          m = new THREE.Mesh(fuelGeo, mat('fuel', { emissive: contrast ? '#000000' : glow }));
          m.position.set(px, 0, pz);
          if (api.wantShadow) m.castShadow = true;
          fuelGroup.add(m);
        }
      }
    }
    anchor.add(fuelGroup);
    anchor.add(rodGroup);
    meshes.fuel = fuelGroup;
    meshes.rods = rodGroup;
    picks.push(fuelGroup);
    picks.push(rodGroup);

    // upper and lower heads so it reads as a sealed vessel
    var headGeo = new THREE.CylinderGeometry(R + 0.16, R + 0.16, 0.1, 26);
    var top = new THREE.Mesh(headGeo, mat('vessel'));
    top.position.y = (H + 0.4) / 2;
    anchor.add(top);
    var bot = new THREE.Mesh(headGeo, mat('vessel'));
    bot.position.y = -(H + 0.4) / 2;
    anchor.add(bot);

    return { meshes: meshes, picks: picks, anchor: anchor };
  }

  var RX_NULL = {
    attach: function () {}, sync: function () {}, nudge: function () {},
    zoom: function () {}, reset: function () {}, status: function () { return 'failed'; }
  };
  var RX_MISSING = null;
  var RX_VIEWER = (function () {
    var mk = window.StemLab && window.StemLab.makeBayViewer;
    if (!mk) { RX_MISSING = 'host'; return RX_NULL; }
    return mk({
      parts: RX_PARTS.map(function (p) { return { id: p.id, label: p.label, color: p.color }; }),
      buildScene: rxBuildCore,
      home: { yaw: -0.6, pitch: 0.34, dist: 7.2 },
      failMessage: '3D reactor core unavailable'
    });
  })();
  function rxAttach(node) { RX_VIEWER.attach(node || null); }

  window.StemLab.registerTool('nuclearLab', {
    icon: '☢️',
    label: 'Nuclear & Radiation Lab',
    desc: 'Half-life and decay you can run, what actually stops alpha, beta and gamma, how fission and fusion work, radiation doses on a scale you can read, a simulated Geiger counter that shows why one short count lies, the three accidents in honest numbers, what to do with the waste, and where small modular reactors really stand.',
    color: 'violet',
    category: 'science',
    aliases: ['nuclear', 'radiation', 'radioactive', 'radioactivity', 'half-life', 'halflife', 'isotope', 'isotopes',
      'decay', 'fission', 'fusion', 'reactor', 'SMR', 'small modular reactor', 'uranium', 'plutonium', 'carbon dating',
      'radiocarbon', 'chernobyl', 'fukushima', 'three mile island', 'sievert', 'becquerel', 'dose', 'radiation safety',
      'shielding', 'nuclear waste', 'geological repository', 'alpha', 'beta', 'gamma', 'neutron', 'radon', 'ITER',
      'meltdown', 'containment', 'control rods', 'enrichment', 'nuclear power', 'atomic',
      'geiger counter', 'geiger', 'counts per minute', 'cpm', 'count rate', 'counting statistics', 'Poisson',
      'inverse square law', 'detector', 'activity', 'background radiation', 'background count', 'dosimeter',
      'measurement uncertainty', 'detection limit',
      'gray', 'Gy', 'sievert', 'absorbed dose', 'equivalent dose', 'effective dose', 'weighting factor', 'ICRP',
      'biological half-life', 'effective half-life', 'internal contamination', 'potassium iodide', 'KI tablets',
      'strontium-90', 'radium', 'polonium-210', 'nuclear medicine', 'radioiodine',
      'time distance shielding', 'ALARA', 'stay time', 'dose rate', 'gamma constant', 'half-value layer',
      'sealed source', 'radiation protection', 'radiography source', 'occupational dose',
      'shelter in place', 'evacuation', 'protective action', 'emergency planning', 'plume', 'PAG',
      'dose reduction factor', 'shielding factor', 'exclusion zone'],

    questHooks: [
      { id: 'nk_decay', label: 'Run three isotopes through their half-lives', icon: '⏳',
        check: function (d) { return !!(d && (d.isoTried || []).length >= 3); } },
      { id: 'nk_dating', label: 'Date a sample with carbon-14', icon: '🦴',
        check: function (d) { return !!(d && d.datedOnce); } },
      { id: 'nk_shield', label: 'Shield all four kinds of radiation', icon: '🛡️',
        check: function (d) { return !!(d && (d.radTried || []).length >= 4); } },
      { id: 'nk_criticality', label: 'Hold a chain reaction critical', icon: '⚛️',
        check: function (d) { return !!(d && d.heldCritical); } },
      { id: 'nk_operate', label: 'Complete a reactor scenario', icon: '🎛️',
        check: function (d) { return !!(d && d.reactorRun); } },
      { id: 'nk_chain', label: 'Follow four steps of the uranium chain', icon: '⛓️',
        check: function (d) { return !!(d && (d.chainSeen || []).length >= 4); } },
      { id: 'nk_enrich', label: 'Compare three enrichment levels', icon: '🔢',
        check: function (d) { return !!(d && (d.enrSeen || []).length >= 3); } },
      { id: 'nk_binding', label: 'Work out three reactions from the curve', icon: '⛰️',
        check: function (d) { return !!(d && (d.reactionsSeen || []).length >= 3); } },
      { id: 'nk_mydose', label: 'Estimate your own annual dose', icon: '🧮',
        check: function (d) { return !!(d && d.doseEstimated); } },
      { id: 'nk_dose', label: 'Compare five doses on the ladder', icon: '📏',
        check: function (d) { return !!(d && (d.dosesSeen || []).length >= 5); } },
      { id: 'nk_weighting', label: 'Weight the same joule three ways', icon: '⚖️',
        check: function (d) { return !!(d && d.doseWeighted && (d.wrTried || []).length >= 3); } },
      { id: 'nk_biohalf', label: 'Compare four nuclides inside a body', icon: '🫀',
        check: function (d) { return !!(d && (d.bioSeen || []).length >= 4); } },
      { id: 'nk_paths', label: 'Follow two question routes through the lab', icon: '🧭',
        check: function (d) { return !!(d && (d.pathsTried || []).length >= 2); } },
      { id: 'nk_shelter', label: 'Find where shelter beats evacuation, and where it stops', icon: '🏠',
        check: function (d) { return !!(d && d.shelterUsed && (d.shSeen || []).length >= 3); } },
      { id: 'nk_protect', label: 'Work out a stay time with all three levers', icon: '⏱️',
        check: function (d) { return !!(d && d.protectUsed && (d.ptTried || []).length >= 2); } },
      { id: 'nk_count', label: 'Take a count you could defend — better than ±5%', icon: '🔬',
        check: function (d) { return !!(d && d.countPrecise); } },
      { id: 'nk_invsq', label: 'Measure the same source at three distances', icon: '📐',
        check: function (d) { return !!(d && (d.cdDistTried || []).length >= 3); } },
      { id: 'nk_incidents', label: 'Read all three accidents in full', icon: '📋',
        check: function (d) { return !!(d && (d.incidentsRead || []).length >= 3); } },
      { id: 'nk_reactors', label: 'Compare three reactor designs', icon: '🏭',
        check: function (d) { return !!(d && (d.reactorsSeen || []).length >= 3); } },
      { id: 'nk_waste', label: 'Work through the waste question', icon: '🗄️',
        check: function (d) { return !!(d && (d.wasteSeen || []).length >= 3); } }
    ],

    render: function (ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var t = ctx.t || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var isDark = ctx.theme !== 'light';

      // All hooks first, unconditionally — a hook after a render-time branch is
      // the crash class that has bitten other tools in this lab on navigation.
      var decayRef = React.useRef(null);
      var doseRef = React.useRef(null);
      var countRef = React.useRef(null);
      var chainRef = React.useRef(null);
      var protectRef = React.useRef(null);
      var shelterRef = React.useRef(null);
      var bioRef = React.useRef(null);
      var stGuess = React.useState('');
      var ageGuess = stGuess[0], setAgeGuess = stGuess[1];
      var stShown = React.useState(false);
      var ageShown = stShown[0], setAgeShown = stShown[1];

      var d = (ctx.toolData && ctx.toolData._nuclearLab) || {};
      function upd(patch) {
        setToolData(function (prev) {
          var cur = Object.assign({}, (prev && prev._nuclearLab) || {}, patch);
          var next = Object.assign({}, prev);
          next._nuclearLab = cur;
          return next;
        });
      }
      function pushOnce(key, value) {
        var list = d[key] || [];
        if (list.indexOf(value) !== -1) return;
        var patch = {};
        patch[key] = list.concat([value]);
        upd(patch);
      }

      // ── 1. decay ──
      var isoId = d.isoId || 'c14';
      var iso = ISOTOPES.filter(function (x) { return x.id === isoId; })[0] || ISOTOPES[6];
      var halves = typeof d.halves === 'number' ? d.halves : 0;
      var remaining = Math.pow(0.5, halves);
      var elapsedYears = halves * iso.hl;
      function nkYears(y) {
        if (y === 0) return '0';
        // Singular matters here: the biological half-life table has entries
        // that land on exactly one day, and "1 days" reads as a bug.
        // Test the ROUNDED NUMBER, not the formatted string: nkFmt runs
        // toLocaleString, so parseFloat('1,600') is 1 and radium-226 would
        // have read "1,600 year".
        var unit = function (v, dp, word) {
          var f = Math.pow(10, dp || 0);
          return nkFmt(v, dp) + ' ' + (Math.round(v * f) / f === 1 ? word : word + 's');
        };
        if (y < 1 / 365.25) return unit(y * 365.25 * 24, 1, 'hour');
        if (y < 1) return unit(y * 365.25, 1, 'day');
        if (y < 1e4) return unit(y, 0, 'year');
        if (y < 1e6) return nkFmt(y / 1000, 1) + ' thousand years';
        if (y < 1e9) return nkFmt(y / 1e6, 1) + ' million years';
        return nkFmt(y / 1e9, 2) + ' billion years';
      }

      // decay curve for the chart
      var decayPts = [];
      for (var dh = 0; dh <= 10; dh += 0.05) decayPts.push([dh, Math.pow(0.5, dh) * 100]);

      // ── 2. carbon dating ──
      var c14Frac = typeof d.c14Frac === 'number' ? d.c14Frac : 50;   // percent remaining
      var c14Age = 5730 * Math.log(100 / c14Frac) / Math.LN2;

      // ── 3. shielding ──
      var radId = d.radId || 'gamma';
      var rad = RAD_TYPES.filter(function (x) { return x.id === radId; })[0] || RAD_TYPES[2];
      var shieldId = d.shieldId || 'lead';
      var shield = SHIELDS.filter(function (x) { return x.id === shieldId; })[0] || SHIELDS[4];
      var thick = typeof d.thick === 'number' ? d.thick : 2;          // cm
      // Beer-Lambert for gamma. Alpha and beta are range-limited, not exponential,
      // so modelling them with the same equation would be quietly wrong.
      var gammaThrough = Math.exp(-shield.mu * thick) * 100;
      // Alpha is range-limited, but its range depends enormously on the medium:
      // a few centimetres in air versus only micrometres in liquids and solids.
      // Treating 0.1 cm of air like 0.1 cm of lead contradicted the range card
      // immediately below and taught the wrong lesson about surface contamination.
      var alphaRangeCm = shieldId === 'air' ? 4 : 0.01;
      var alphaStopped = thick >= alphaRangeCm;
      var betaStopped = (shieldId === 'air' ? thick > 300 : thick > 0.3);
      var neutronThrough = shieldId === 'water' || shieldId === 'concrete'
        ? Math.exp(-0.1 * thick) * 100
        : Math.exp(-0.02 * thick) * 100;

      // ── 4. chain reaction ──
      var rods = typeof d.rods === 'number' ? d.rods : 50;             // percent inserted
      // k rises as rods withdraw. Tuned so critical (k=1) sits near 50%.
      var kEff = 1.30 - 0.006 * rods;
      var kState = kEff < 0.995 ? 'subcritical' : (kEff > 1.005 ? 'supercritical' : 'critical');
      var gens = [];
      var pop = 100;
      for (var g = 0; g < 12; g++) { gens.push(pop); pop = pop * kEff; }

      React.useEffect(function () {
        if (kState === 'critical' && !d.heldCritical) upd({ heldCritical: true });
      }, [kState, d.heldCritical]);

      // ── 5. counting ──
      var cdSrcId = d.cdSrc || 'cs137';
      var cdSrc = COUNT_SOURCES.filter(function (x) { return x.id === cdSrcId; })[0] || COUNT_SOURCES[3];
      var cdDist = typeof d.cdDist === 'number' ? d.cdDist : 10;      // cm
      var cdTime = typeof d.cdTime === 'number' ? d.cdTime : 10;      // s
      // Solid angle only. A GM tube is small compared with 10 cm but not with
      // 3 cm, so the model is flagged rather than quietly extrapolated.
      function cdNetRateAt(dist) {
        return cdSrc.gps * (GM_WINDOW_CM2 / (4 * Math.PI * dist * dist)) * cdSrc.eff;
      }
      var cdTrueNet = cdNetRateAt(Math.max(cdDist, 0.5));
      var cdRuns = Array.isArray(d.cdRuns) ? d.cdRuns : [];
      var cdLast = cdRuns.length ? cdRuns[cdRuns.length - 1] : null;
      var cdNets = cdRuns.map(function (r) { return (r.g - r.b) / r.t; });
      // Paired equal-time counts: net = Ng − Nb, so the variances add.
      var cdNet = cdLast ? (cdLast.g - cdLast.b) / cdLast.t : 0;
      var cdSigma = cdLast ? Math.sqrt(cdLast.g + cdLast.b) / cdLast.t : 0;
      var cdRel = cdLast && cdNet > 0 ? cdSigma / cdNet : Infinity;
      // Currie critical level for a paired blank, 5% false-positive rate.
      var cdCrit = cdLast ? 2.33 * Math.sqrt(2 * Math.max(cdLast.b, 1)) : 0;
      var cdDetected = !!cdLast && (cdLast.g - cdLast.b) > cdCrit;

      function cdTakeCount() {
        var t = cdTime;
        var run = { g: nkPoisson((cdTrueNet + GM_BACKGROUND) * t), b: nkPoisson(GM_BACKGROUND * t), t: t, d: cdDist, s: cdSrcId };
        var net = (run.g - run.b) / t;
        var sig = Math.sqrt(run.g + run.b) / t;
        var ok = (run.g - run.b) > 2.33 * Math.sqrt(2 * Math.max(run.b, 1));
        var patch = { cdRuns: cdRuns.concat([run]).slice(-8), countTaken: true };
        if (ok && net > 0 && sig / net <= 0.05) {
          patch.countPrecise = true;
          if (!d.countPrecise) {
            if (typeof celebrate === 'function') celebrate();
            if (typeof awardXP === 'function') awardXP('nuclear_count', 10, 'Measured a source to better than 5%');
          }
        }
        if (cdSrcId !== 'none') {
          var seen = d.cdDistTried || [];
          var key = cdSrcId + '@' + Math.round(cdDist);
          if (seen.indexOf(key) === -1) patch.cdDistTried = seen.concat([key]);
        }
        upd(patch);
        if (typeof beep === 'function') beep();
        if (typeof announceToSR === 'function') {
          announceToSR('Counted for ' + t + ' seconds. ' + run.g + ' counts with the source, ' +
            run.b + ' counts of background. Net ' + (net).toFixed(3) + ' plus or minus ' + sig.toFixed(3) + ' counts per second.');
        }
      }
      function cdReset(patch) {
        upd(Object.assign({ cdRuns: [] }, patch));
        if (typeof beep === 'function') beep();
      }

      // ── shelter or evacuate ──
      var shRate = typeof d.shRate === 'number' ? d.shRate : 2;        // mSv/h outdoors
      var shPlume = typeof d.shPlume === 'number' ? d.shPlume : 8;     // hours the release lasts
      var shEvac = typeof d.shEvac === 'number' ? d.shEvac : 4;        // hours exposed getting out
      var shPlaceId = d.shPlace || 'masonry';
      var shPlace = SHELTER_PLACES.filter(function (x) { return x.id === shPlaceId; })[0] || SHELTER_PLACES[2];
      var shOutdoors = SHELTER_PLACES[0].drf;
      // Stay put and you take the whole plume at the building's reduced rate.
      var shShelterDose = shRate * shPlace.drf * shPlume;
      // Leave and you take the full outdoor rate, but only until you are clear
      // — or until the plume stops, whichever comes first.
      function shEvacDoseAt(hours) { return shRate * shOutdoors * Math.min(hours, shPlume); }
      var shEvacDose = shEvacDoseAt(shEvac);
      // The hours-to-clear at which the two are equal. Past this, leaving costs
      // more dose than staying; below it, less.
      var shBreakEven = shPlace.drf * shPlume / shOutdoors;
      var shSheltering = shShelterDose < shEvacDose;

      // ── protection: time, distance, shielding ──
      var ptSrcId = d.ptSrc || 'cs137';
      var ptSrc = PROTECT_SOURCES.filter(function (x) { return x.id === ptSrcId; })[0] || PROTECT_SOURCES[2];
      var ptDist = typeof d.ptDist === 'number' ? d.ptDist : 1;        // metres
      var ptShieldId = d.ptShield || 'air';
      var ptShield = SHIELDS.filter(function (x) { return x.id === ptShieldId; })[0] || SHIELDS[0];
      var ptThick = typeof d.ptThick === 'number' ? d.ptThick : 0;     // cm
      var ptLimitId = d.ptLimit || 'public';
      var ptLimit = DOSE_LIMITS.filter(function (x) { return x.id === ptLimitId; })[0] || DOSE_LIMITS[0];
      var ptGamma = nkGammaConst(ptSrc.lines);                          // mSv/h at 1 m per GBq
      // Narrow-beam attenuation. Real shields also pass scattered photons —
      // the buildup factor — so this flatters a thick shield; said out loud
      // below rather than left for the reader to discover.
      var ptAtten = Math.exp(-ptShield.mu * ptThick);
      function ptRateAt(metres, thickCm) {
        var m = Math.max(0.1, metres);
        return ptGamma * ptSrc.gbq * Math.exp(-ptShield.mu * (thickCm === undefined ? ptThick : thickCm)) / (m * m);
      }
      var ptBare = ptRateAt(ptDist, 0);                                 // mSv/h, no shield
      var ptRate = ptRateAt(ptDist);                                    // mSv/h as configured
      var ptStayH = ptRate > 0 ? ptLimit.mSv / ptRate : Infinity;       // hours to the limit
      // Each lever, sized so it halves the dose — the same answer three ways.
      var ptHalfDist = ptDist * Math.SQRT2;
      var ptHvl = ptShield.mu > 0 ? Math.LN2 / ptShield.mu : Infinity;  // cm

      // ── 6. gray → sievert ──
      var wrId = d.wrId || 'gamma';
      var wr = RAD_WEIGHTS.filter(function (x) { return x.id === wrId; })[0] || RAD_WEIGHTS[0];
      var wtId = d.wtId || 'whole';
      var wt = TISSUE_WEIGHTS.filter(function (x) { return x.id === wtId; })[0];
      var wtFactor = wt ? wt.wt : 1;                       // 'whole' body = every tissue = 1.00
      var absorbedMGy = typeof d.absorbedMGy === 'number' ? d.absorbedMGy : 1;
      var equivalentMSv = absorbedMGy * wr.wr;             // H = D × w_R
      var effectiveMSv = equivalentMSv * wtFactor;         // E = Σ w_T × H
      var wtSum = TISSUE_WEIGHTS.reduce(function (a, x) { return a + x.wt; }, 0);

      // ── 7. physical vs biological half-life ──
      var bioId = d.bioId || 'cs137';
      var bio = BIO_NUCLIDES.filter(function (x) { return x.id === bioId; })[0] || BIO_NUCLIDES[5];
      // Decay and excretion run in parallel, so the RATES add, not the times.
      var bioEff = (bio.tp * bio.tb) / (bio.tp + bio.tb);  // days
      // Which clock is actually running the show? "The shorter one wins" is
      // only true when the two are far apart. For strontium-90 (29 y against
      // 18 y) and polonium-210 (138 d against 50 d) NEITHER number gets you
      // to the answer, and saying otherwise would be a worse error than
      // leaving the section out — so the verdict branches on the ratio, and
      // quotes the actual shortfall rather than asserting "close".
      var bioRatio = Math.max(bio.tp, bio.tb) / Math.min(bio.tp, bio.tb);
      var bioShorter = Math.min(bio.tp, bio.tb);
      var bioGapPct = (1 - bioEff / bioShorter) * 100;   // how far below the shorter clock
      var bioDriver = bioRatio < 8 ? 'both' : (bio.tb < bio.tp ? 'biology' : 'physics');
      var bioSpanDays = bioEff * 5;
      var bioUnit = bioSpanDays > 2000
        ? { div: 365.25, label: 'years' }
        : (bioSpanDays > 2 ? { div: 1, label: 'days' } : { div: 1 / 24, label: 'hours' });

      // ── charts ──
      // The decay chain plotted on the chart of nuclides. `pick` is the row
      // currently open in the list below, so selecting a step lights up the
      // same nucleus here — the two views stay one view.
      function nkChainMap(el, pick) {
        if (!el) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var ow = el.offsetWidth || 560, oh = el.offsetHeight || 230;
        var W = el.width = Math.round(ow * dpr);
        var H = el.height = Math.round(oh * dpr);
        var c = el.getContext('2d');
        if (!c) return;
        var padL = 40 * dpr, padR = 16 * dpr, padT = 16 * dpr, padB = 34 * dpr;
        var pw = W - padL - padR, ph = H - padT - padB;
        var bg = isDark ? '#0b1120' : '#f8fafc';
        var axisInk = isDark ? 'rgba(148,163,184,0.92)' : 'rgba(51,65,85,0.92)';
        var A_COL = ink('#f87171'), B_COL = ink('#60a5fa'), GAS = ink('#fbbf24');
        c.clearRect(0, 0, W, H);
        c.fillStyle = bg; c.fillRect(0, 0, W, H);

        var nMin = 122, nMax = 148, zMin = 81, zMax = 93;
        function px(n) { return padL + (n - nMin) / (nMax - nMin) * pw; }
        function py(z) { return padT + (1 - (z - zMin) / (zMax - zMin)) * ph; }

        c.strokeStyle = isDark ? 'rgba(148,163,184,0.13)' : 'rgba(100,116,139,0.13)';
        c.lineWidth = Math.max(1, dpr);
        c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
        c.fillStyle = axisInk;
        c.textAlign = 'right'; c.textBaseline = 'middle';
        for (var z = zMin + 1; z < zMax; z += 2) {
          c.beginPath(); c.moveTo(padL, py(z)); c.lineTo(W - padR, py(z)); c.stroke();
          c.fillText(String(z), padL - 5 * dpr, py(z));
        }
        c.textAlign = 'center'; c.textBaseline = 'top';
        for (var n = 124; n <= nMax - 2; n += 4) {
          c.beginPath(); c.moveTo(px(n), padT); c.lineTo(px(n), H - padB); c.stroke();
          c.fillText(String(n), px(n), H - padB + 5 * dpr);
        }

        // Steps, drawn as arrows from parent to daughter.
        for (var i = 0; i < NK_CHAIN_XY.length - 1; i++) {
          var from = NK_CHAIN_XY[i], to = NK_CHAIN_XY[i + 1];
          var col = from.kind === 'alpha' ? A_COL : B_COL;
          var x0 = px(from.n), y0 = py(from.z), x1 = px(to.n), y1 = py(to.z);
          var ang = Math.atan2(y1 - y0, x1 - x0);
          var back = 6.5 * dpr;                       // stop short of the node
          var ex = x1 - Math.cos(ang) * back, ey = y1 - Math.sin(ang) * back;
          c.strokeStyle = nkRgba(col, 0.85);
          c.lineWidth = 1.8 * dpr; c.lineCap = 'round';
          c.beginPath(); c.moveTo(x0 + Math.cos(ang) * back, y0 + Math.sin(ang) * back);
          c.lineTo(ex, ey); c.stroke();
          var head = 4.5 * dpr;
          c.fillStyle = nkRgba(col, 0.9);
          c.beginPath();
          c.moveTo(ex, ey);
          c.lineTo(ex - Math.cos(ang - 0.42) * head, ey - Math.sin(ang - 0.42) * head);
          c.lineTo(ex - Math.cos(ang + 0.42) * head, ey - Math.sin(ang + 0.42) * head);
          c.closePath(); c.fill();
        }

        // Nodes.
        NK_CHAIN_XY.forEach(function (nd) {
          var x = px(nd.n), y = py(nd.z);
          var sel = pick === nd.i;
          var col = nd.kind === 'stable' ? (isDark ? '#cbd5e1' : '#475569')
            : (nd.gas ? GAS : (nd.kind === 'alpha' ? A_COL : B_COL));
          var r = (nd.gas || nd.kind === 'stable') ? 6 * dpr : 4.6 * dpr;
          if (sel) {
            c.beginPath(); c.arc(x, y, r + 4.5 * dpr, 0, 6.2832);
            c.strokeStyle = col; c.lineWidth = 2 * dpr; c.stroke();
          }
          c.beginPath(); c.arc(x, y, r + 1.6 * dpr, 0, 6.2832);
          c.fillStyle = bg; c.fill();
          c.beginPath(); c.arc(x, y, r, 0, 6.2832);
          c.fillStyle = col; c.fill();
          if (nd.kind === 'stable') {
            c.beginPath(); c.arc(x, y, r - 2.4 * dpr, 0, 6.2832);
            c.fillStyle = bg; c.fill();       // a ring: the chain stops here
          }
        });

        // Only the three that carry the story get permanent labels; the rest
        // would collide, and the list underneath names every one anyway.
        c.font = '700 ' + (9 * dpr) + 'px system-ui, sans-serif';
        [{ i: 0, dx: 8, dy: -9, align: 'left' },
         { i: 6, dx: 9, dy: 10, align: 'left' },
         { i: NK_CHAIN_XY.length - 1, dx: -9, dy: 9, align: 'right' }
        ].forEach(function (L) {
          var nd = NK_CHAIN_XY[L.i];
          if (!nd) return;
          var x = px(nd.n) + L.dx * dpr, y = py(nd.z) + L.dy * dpr;
          var col = nd.gas ? GAS : (nd.kind === 'stable' ? (isDark ? '#cbd5e1' : '#475569') : axisInk);
          var txt = nd.sym + (nd.gas ? '  (the gas)' : '');
          var tw = c.measureText(txt).width, pad = 3 * dpr;
          c.textAlign = L.align; c.textBaseline = 'middle';
          c.fillStyle = nkRgba(bg, 0.88);
          c.fillRect(L.align === 'right' ? x - tw - pad * 2 : x, y - 7 * dpr, tw + pad * 2, 14 * dpr);
          c.fillStyle = col;
          c.fillText(txt, L.align === 'right' ? x - pad : x + pad, y);
        });

        // Key: the two moves that generate the whole shape.
        c.font = '700 ' + (8.5 * dpr) + 'px system-ui, sans-serif';
        c.textAlign = 'left'; c.textBaseline = 'middle';
        var keys = [{ t: 'α  −2 protons, −2 neutrons', col: A_COL }, { t: 'β  +1 proton, −1 neutron', col: B_COL }];
        var kw = 0;
        keys.forEach(function (k) { kw = Math.max(kw, c.measureText(k.t).width); });
        var bw = kw + 24 * dpr, bh = keys.length * 13 * dpr + 6 * dpr;
        var bx = padL + 6 * dpr, by = padT + 4 * dpr;
        c.fillStyle = nkRgba(bg, 0.86); c.fillRect(bx, by, bw, bh);
        c.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)';
        c.lineWidth = dpr; c.strokeRect(bx, by, bw, bh);
        keys.forEach(function (k, ki) {
          var ky = by + 3 * dpr + 13 * dpr * ki + 6.5 * dpr;
          c.fillStyle = k.col;
          c.beginPath(); c.arc(bx + 10 * dpr, ky, 3.4 * dpr, 0, 6.2832); c.fill();
          c.fillStyle = axisInk;
          c.fillText(k.t, bx + 17 * dpr, ky);
        });

        c.strokeStyle = isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)';
        c.lineWidth = Math.max(1, dpr);
        c.beginPath(); c.moveTo(padL, padT); c.lineTo(padL, H - padB); c.lineTo(W - padR, H - padB); c.stroke();

        c.fillStyle = axisInk;
        c.font = '700 ' + (9.5 * dpr) + 'px system-ui, sans-serif';
        c.textAlign = 'center'; c.textBaseline = 'bottom';
        c.fillText('Neutrons (N)', padL + pw / 2, H - 3 * dpr);
        c.save();
        c.translate(10 * dpr, padT + ph / 2);
        c.rotate(-Math.PI / 2);
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('Protons (Z)', 0, 0);
        c.restore();
      }

      // A chart with no axis titles and no key makes the reader carry the
      // caption in their head. These four charts each make a specific argument,
      // so the renderer now supports the furniture that argument needs: named
      // axes, a key when there is more than one line, shaded regions, callouts
      // on the points that matter, and a fill so a curve reads as a quantity
      // rather than a squiggle. Everything is optional; a caller that passes
      // none of it gets the plain chart it always got.
      // Round numbers on an axis, from a raw data range. Without this the
      // gridlines land wherever the data happens to end — 3.62, 2.55, 1.49 —
      // which reads as noise and makes values impossible to estimate between
      // lines. Returns the snapped bounds and the step to walk.
      function nkTicks(lo, hi, target) {
        var span = hi - lo;
        if (!(span > 0) || !isFinite(span)) return { lo: lo, hi: hi, step: (span || 1) / 4 };
        var raw = span / (target || 4);
        var mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var norm = raw / mag;
        var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
        return { lo: Math.floor(lo / step) * step, hi: Math.ceil(hi / step) * step, step: step };
      }

      // Show a tick to the precision its own step implies: a step of 1 needs no
      // decimals, a step of 0.05 needs two. -0 is forced to 0; a gridline
      // labelled "-0" looks like a rendering fault.
      function nkAxisNum(v, step) {
        var dp = step >= 1 ? (step % 1 === 0 ? 0 : 1) : (step >= 0.1 ? 1 : 2);
        var out = (Math.abs(v) < step * 1e-6 ? 0 : v).toFixed(dp);
        return out;
      }

      function nkChart(el, cfg) {
        if (!el) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var ow = el.offsetWidth || 560, oh = el.offsetHeight || 180;
        var W = el.width = Math.round(ow * dpr);
        var H = el.height = Math.round(oh * dpr);
        var c = el.getContext('2d');
        if (!c) return;
        var padL = (cfg.yTitle ? 56 : 44) * dpr, padR = 12 * dpr;
        var padT = 12 * dpr, padB = (cfg.xTitle ? 40 : 28) * dpr;
        var pw = W - padL - padR, ph = H - padT - padB;
        var chartBg = isDark ? '#0b1120' : '#f8fafc';
        var axisInk = isDark ? 'rgba(148,163,184,0.92)' : 'rgba(51,65,85,0.92)';
        c.clearRect(0, 0, W, H);
        c.fillStyle = chartBg;
        c.fillRect(0, 0, W, H);
        // Snap the y-range outward to round gridlines. Opt out with niceY:false
        // where the exact bounds carry meaning.
        var yT = cfg.niceY === false
          ? { lo: cfg.yMin, hi: cfg.yMax, step: (cfg.yMax - cfg.yMin) / 4 }
          : nkTicks(cfg.yMin, cfg.yMax, 5);
        var yLo = yT.lo, yHi = yT.hi;
        function px(v) { return padL + (v - cfg.xMin) / (cfg.xMax - cfg.xMin) * pw; }
        function py(v) { return padT + (1 - (v - yLo) / (yHi - yLo)) * ph; }

        // Shaded x-regions sit behind everything, so a band never hides a line.
        (cfg.bands || []).forEach(function (b) {
          var x0 = px(Math.max(b.from, cfg.xMin)), x1 = px(Math.min(b.to, cfg.xMax));
          c.fillStyle = b.colour;
          c.fillRect(x0, padT, Math.max(0, x1 - x0), ph);
        });

        c.strokeStyle = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)';
        c.lineWidth = Math.max(1, dpr);
        c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
        c.fillStyle = axisInk;
        c.textAlign = 'right'; c.textBaseline = 'middle';
        for (var yv = yLo; yv <= yHi + yT.step * 0.001; yv += yT.step) {
          var y = py(yv);
          c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
          // Count rates run well below 1, where rounding to an integer labels
          // every gridline "0". yFmt is optional so existing callers are
          // untouched.
          c.fillText((cfg.yFmt ? cfg.yFmt(yv) : nkAxisNum(yv, yT.step)) + (cfg.yUnit || ''), padL - 5 * dpr, y);
        }
        c.textAlign = 'center'; c.textBaseline = 'top';
        for (var gx = 0; gx <= 5; gx++) {
          var xv = cfg.xMin + (cfg.xMax - cfg.xMin) * gx / 5;
          c.fillText((cfg.xFmt ? cfg.xFmt(xv) : Math.round(xv)) + (cfg.xUnit || ''), px(xv), H - padB + 6 * dpr);
        }

        // Clip to the plot rectangle. Without this a series that runs off the
        // top — the inverse-square curve does, by design — paints over the
        // tick labels instead of stopping at the frame.
        c.save();
        c.beginPath(); c.rect(padL, padT, pw, ph); c.clip();
        (cfg.series || []).forEach(function (s) {
          if (!s.points || !s.points.length) return;
          if (s.fill) {
            var g = c.createLinearGradient(0, padT, 0, padT + ph);
            g.addColorStop(0, nkRgba(s.colour, 0.34));
            g.addColorStop(1, nkRgba(s.colour, 0.02));
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(px(s.points[0][0]), py(yLo));
            s.points.forEach(function (p) { c.lineTo(px(p[0]), py(p[1])); });
            c.lineTo(px(s.points[s.points.length - 1][0]), py(yLo));
            c.closePath(); c.fill();
          }
          c.strokeStyle = s.colour; c.lineWidth = (s.width || 2) * dpr;
          c.lineJoin = 'round'; c.lineCap = 'round';
          if (s.dash) c.setLineDash([6 * dpr, 4 * dpr]);
          c.beginPath();
          s.points.forEach(function (p, i) { var x = px(p[0]), y = py(p[1]); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); });
          c.stroke();
          c.setLineDash([]);
          // Real measured nuclides, drawn as points, so the binding curve reads
          // as data rather than as a formula someone plotted.
          if (s.dots) {
            s.points.forEach(function (p) {
              c.beginPath(); c.arc(px(p[0]), py(p[1]), 2.6 * dpr, 0, 6.2832);
              c.fillStyle = s.colour; c.fill();
              c.lineWidth = 1.2 * dpr; c.strokeStyle = chartBg; c.stroke();
            });
          }
        });
        // half-life step markers make the halving visible rather than implied
        (cfg.steps || []).forEach(function (st) {
          c.strokeStyle = 'rgba(167,139,250,0.5)';
          c.setLineDash([3 * dpr, 3 * dpr]);
          c.beginPath();
          c.moveTo(px(st[0]), py(yLo)); c.lineTo(px(st[0]), py(st[1]));
          c.lineTo(px(cfg.xMin), py(st[1]));
          c.stroke();
          c.setLineDash([]);
        });
        if (cfg.marker) {
          // Ring in the chart's own background colour, so the marker stays
          // legible sitting on top of a line of its own colour.
          var mx = px(cfg.marker.x), my = py(cfg.marker.y);
          c.beginPath(); c.arc(mx, my, 5.5 * dpr, 0, 6.2832);
          c.fillStyle = chartBg; c.fill();
          c.beginPath(); c.arc(mx, my, 4 * dpr, 0, 6.2832);
          c.fillStyle = cfg.marker.colour; c.fill();
        }
        c.restore();

        // Callouts sit outside the clip so a label near the frame is not sliced.
        (cfg.annotations || []).forEach(function (a) {
          var ax = px(a.x), ay = py(a.y);
          var tx = ax + (a.dx || 0) * dpr, ty = ay + (a.dy || 0) * dpr;
          c.strokeStyle = nkRgba(a.colour, 0.75);
          c.lineWidth = 1.2 * dpr;
          c.beginPath(); c.moveTo(ax, ay); c.lineTo(tx, ty); c.stroke();
          c.font = '700 ' + (9 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = (a.dx || 0) < 0 ? 'right' : 'left';
          c.textBaseline = 'middle';
          var pad = 3 * dpr, tw = c.measureText(a.text).width;
          c.fillStyle = nkRgba(chartBg, 0.88);
          c.fillRect(c.textAlign === 'right' ? tx - tw - pad * 2 : tx, ty - 7 * dpr, tw + pad * 2, 14 * dpr);
          c.fillStyle = a.colour;
          c.fillText(a.text, c.textAlign === 'right' ? tx - pad : tx + pad, ty);
        });

        // Key, top-right inside the frame, on its own backing plate.
        if (cfg.legend && cfg.legend.length) {
          c.font = '700 ' + (9 * dpr) + 'px system-ui, sans-serif';
          c.textAlign = 'left'; c.textBaseline = 'middle';
          var lw = 0;
          cfg.legend.forEach(function (L) { lw = Math.max(lw, c.measureText(L.label).width); });
          var boxW = lw + 26 * dpr, rowH = 13 * dpr;
          var boxH = cfg.legend.length * rowH + 6 * dpr;
          var bx = W - padR - boxW - 4 * dpr;
          // Where is the data in the right-hand third? Sit in whichever gap it
          // leaves: above it, below it, or — when it occupies both ends, as the
          // body-burden chart does — in the middle.
          var xFrom = cfg.xMin + (cfg.xMax - cfg.xMin) * 0.6;
          var dLo = Infinity, dHi = -Infinity;
          (cfg.series || []).forEach(function (sr) {
            (sr.points || []).forEach(function (pt) {
              if (pt[0] >= xFrom) { if (pt[1] < dLo) dLo = pt[1]; if (pt[1] > dHi) dHi = pt[1]; }
            });
          });
          var by;
          var margin = (yHi - yLo) * 0.28;
          if (!isFinite(dHi)) by = padT + 4 * dpr;
          else if (dHi < yHi - margin) by = padT + 4 * dpr;
          else if (dLo > yLo + margin) by = padT + ph - boxH - 4 * dpr;
          else by = padT + (ph - boxH) / 2;
          c.fillStyle = nkRgba(chartBg, 0.86);
          c.fillRect(bx, by, boxW, boxH);
          c.strokeStyle = isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)';
          c.lineWidth = dpr;
          c.strokeRect(bx, by, boxW, boxH);
          cfg.legend.forEach(function (L, i) {
            var ly = by + 3 * dpr + rowH * i + rowH / 2;
            c.strokeStyle = L.colour; c.lineWidth = 2.4 * dpr;
            if (L.dash) c.setLineDash([4 * dpr, 3 * dpr]);
            c.beginPath(); c.moveTo(bx + 5 * dpr, ly); c.lineTo(bx + 18 * dpr, ly); c.stroke();
            c.setLineDash([]);
            c.fillStyle = axisInk;
            c.fillText(L.label, bx + 22 * dpr, ly);
          });
        }

        c.strokeStyle = isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)';
        c.lineWidth = Math.max(1, dpr);
        c.beginPath(); c.moveTo(padL, padT); c.lineTo(padL, H - padB); c.lineTo(W - padR, H - padB); c.stroke();

        // Axis titles last, so nothing paints over them.
        c.fillStyle = axisInk;
        c.font = '700 ' + (9.5 * dpr) + 'px system-ui, sans-serif';
        if (cfg.xTitle) {
          c.textAlign = 'center'; c.textBaseline = 'bottom';
          c.fillText(cfg.xTitle, padL + pw / 2, H - 4 * dpr);
        }
        if (cfg.yTitle) {
          c.save();
          c.translate(13 * dpr, padT + ph / 2);
          c.rotate(-Math.PI / 2);
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(cfg.yTitle, 0, 0);
          c.restore();
        }
      }

      React.useEffect(function () {
        var steps = [];
        for (var s = 1; s <= Math.min(4, Math.floor(halves)); s++) steps.push([s, Math.pow(0.5, s) * 100]);
        nkChart(decayRef.current, {
          xMin: 0, xMax: 10, yMin: 0, yMax: 100, xUnit: '', yUnit: '%',
          xTitle: 'Half-lives elapsed',
          yTitle: 'Nuclei remaining',
          series: [{ points: decayPts, colour: ink('#a78bfa'), width: 2.4, fill: true }],
          steps: steps,
          marker: { x: nkClamp(halves, 0, 10), y: remaining * 100, colour: ink('#fbbf24') },
          legend: [
            { label: iso.name, colour: ink('#a78bfa') },
            { label: 'Each halving', colour: 'rgba(167,139,250,0.75)', dash: true }
          ]
        });
      }, [halves, isoId, isDark]);

      React.useEffect(function () {
        nkChainMap(chainRef.current, d.chainPick);
      }, [d.chainPick, isDark]);

      // Dose against how long it takes to get clear. The shelter line is flat
      // — the plume does not care how fast you drive — and the evacuation line
      // climbs until you are out. Where they cross is the whole decision, so
      // the crossing is drawn rather than described.
      React.useEffect(function () {
        var maxH = 12;
        var evac = [], shel = [];
        for (var t = 0; t <= maxH + 0.01; t += 0.25) {
          evac.push([t, shEvacDoseAt(t)]);
          shel.push([t, shShelterDose]);
        }
        var top = Math.max(shEvacDoseAt(maxH), shShelterDose) * 1.2;
        var ann = [];
        if (shBreakEven > 0.15 && shBreakEven < maxH) {
          ann.push({ x: shBreakEven, y: shShelterDose,
            text: 'break even at ' + nkFmt(shBreakEven, 1) + ' h',
            colour: ink('#fbbf24'), dx: 10, dy: -14 });
        }
        nkChart(shelterRef.current, {
          xMin: 0, xMax: maxH, yMin: 0, yMax: Math.max(top, 1e-6),
          xTitle: 'Hours exposed while getting clear',
          yTitle: 'Dose received, mSv',
          series: [
            { points: shel, colour: ink(shPlace.colour), width: 2.6, dash: true },
            { points: evac, colour: ink('#f87171'), width: 2.6, fill: true }
          ],
          marker: { x: nkClamp(shEvac, 0, maxH), y: nkClamp(shEvacDose, 0, top), colour: ink('#fbbf24') },
          annotations: ann,
          legend: [
            { label: 'Shelter where you are', colour: ink(shPlace.colour), dash: true },
            { label: 'Evacuate now', colour: ink('#f87171') }
          ]
        });
      }, [shRate, shPlume, shEvac, shPlaceId, isDark]);

      // Dose rate against distance, bare and shielded. Two curves make the
      // point the prose cannot: distance is free and works on everything,
      // while shielding is a fixed multiplier that never changes the SHAPE.
      React.useEffect(function () {
        var bare = [], shielded = [];
        for (var m = 0.3; m <= 10.02; m += 0.1) {
          bare.push([m, ptRateAt(m, 0)]);
          shielded.push([m, ptRateAt(m)]);
        }
        // Scale to the distance being examined, not to the 0.3 m end. Anchored
        // at the close end, an inverse square collapses within two metres and
        // leaves three quarters of the chart empty — the shape is right and
        // unreadable. Anchoring near the marker keeps the part being reasoned
        // about on screen; the steep close-range end runs off the top, where
        // the clip handles it.
        var top = ptRateAt(Math.max(ptDist * 0.7, 0.3), 0) * 1.15;
        nkChart(protectRef.current, {
          xMin: 0, xMax: 10, yMin: 0, yMax: Math.max(top, 1e-6),
          xTitle: 'Distance from the source, metres',
          yTitle: 'Dose rate, mSv per hour',
          series: [
            { points: bare, colour: isDark ? '#94a3b8' : '#475569', width: 2, dash: true },
            { points: shielded, colour: ink(ptSrc.colour), width: 2.6, fill: true }
          ],
          marker: { x: nkClamp(ptDist, 0, 10), y: nkClamp(ptRate, 0, top), colour: ink('#fbbf24') },
          legend: ptThick > 0
            ? [{ label: 'Unshielded', colour: isDark ? '#94a3b8' : '#475569', dash: true },
               { label: nkFmt(ptThick, 1) + ' cm of ' + ptShield.name.toLowerCase(), colour: ink(ptSrc.colour) }]
            : [{ label: 'Unshielded', colour: ink(ptSrc.colour) }]
        });
      }, [ptSrcId, ptDist, ptShieldId, ptThick, isDark]);

      // Inverse-square curve, with the last measured net rate dropped on top of
      // it. The gap between the dot and the line IS the counting noise.
      // Scale to the distance actually being measured, not to the 3 cm end of
      // the curve — otherwise the measured point sits squashed against the axis
      // at every sensible distance. The curve simply runs off the top from
      // there; nkChart clips the plot area, so it stops at the frame.
      var cdChartMax = Math.max(cdNetRateAt(Math.max(cdDist * 0.7, 3)) * 1.15, 0.5);
      React.useEffect(function () {
        var pts = [];
        for (var cx = 3; cx <= 60; cx += 0.5) pts.push([cx, cdNetRateAt(cx)]);
        nkChart(countRef.current, {
          xMin: 0, xMax: 60, yMin: -0.18 * cdChartMax, yMax: cdChartMax,
          xUnit: '', yUnit: '',
          xTitle: 'Distance from the source, cm',
          yTitle: 'Net counts per second',
          series: [{ points: pts, colour: ink('#2dd4bf'), width: 2.4, fill: true }],
          legend: cdLast
            ? [{ label: 'True rate', colour: ink('#2dd4bf') }, { label: 'Your last count', colour: ink('#fbbf24') }]
            : [{ label: 'True rate', colour: ink('#2dd4bf') }],
          marker: cdLast ? { x: nkClamp(cdLast.d, 0, 60), y: nkClamp(cdNet, -0.18 * cdChartMax, cdChartMax), colour: ink('#fbbf24') } : null
        });
      }, [cdSrcId, cdDist, cdRuns.length, cdChartMax, cdNet, isDark]);

      // Body burden against time, with the decay-only curve behind it. For the
      // long-lived nuclides the decay-only curve is visibly FLAT across the
      // whole window, which is the entire argument of the section in one image.
      React.useEffect(function () {
        var phys = [], eff = [];
        for (var bi = 0; bi <= 120; bi++) {
          var td = bioSpanDays * bi / 120;
          phys.push([td / bioUnit.div, Math.pow(0.5, td / bio.tp) * 100]);
          eff.push([td / bioUnit.div, Math.pow(0.5, td / bioEff) * 100]);
        }
        nkChart(bioRef.current, {
          xMin: 0, xMax: bioSpanDays / bioUnit.div, yMin: 0, yMax: 100, yUnit: '%',
          xFmt: function (v) { return bioSpanDays / bioUnit.div < 12 ? v.toFixed(1) : String(Math.round(v)); },
          xTitle: 'Time since intake, ' + bioUnit.label,
          yTitle: 'Left in the body',
          series: [
            { points: phys, colour: isDark ? '#94a3b8' : '#475569', width: 2, dash: true },
            { points: eff, colour: ink(bio.colour), width: 2.6, fill: true }
          ],
          legend: [
            { label: 'Decay alone', colour: isDark ? '#94a3b8' : '#475569', dash: true },
            { label: 'Decay + excretion', colour: ink(bio.colour) }
          ]
        });
      }, [bioId, isDark]);


      // ── Reactor simulator ────────────────────────────────────────────
      // The sim state lives in a ref and the panel is drawn on canvas, so a
      // 10 Hz physics tick does not re-render the whole tool 10 times a second.
      // React state is only touched when something the CONTROLS depend on
      // changes: the scenario verdict and the quantised rod position for the 3D.
      var rxRef = React.useRef(null);
      var rxCanvasRef = React.useRef(null);
      var rxTelemetryRef = React.useRef(null);
      var rxAnim = React.useRef(0);
      var rxWakeRef = React.useRef(function () {});
      var stRx = React.useState({
        running: false, verdict: null, rodStep: 50, hotStep: 0,
        pumps: true, scrammed: false
      });
      var rxUi = stRx[0], setRxUi = stRx[1];
      var rxUiRef = React.useRef(rxUi);
      rxUiRef.current = rxUi;

      function rxPatchUi(patch) {
        setRxUi(function (prev) {
          var next = Object.assign({}, prev, patch);
          rxUiRef.current = next;
          return next;
        });
      }

      var rxMode = d.rxMode || 'modern';
      var rxScenario = d.rxScenario || 'steady';
      var rxModeObj = RX_MODES.filter(function (m) { return m.id === rxMode; })[0] || RX_MODES[0];
      var rxScenObj = RX_SCENARIOS.filter(function (s) { return s.id === rxScenario; })[0] || RX_SCENARIOS[0];

      function rxFresh() {
        return {
          rods: 50, pumps: true, scrammed: false, power: 100, t: RX_T_REF + 30,
          xe: 1, iod: 1, elapsed: 0, sinceScram: 0, holdOk: 0, phase: 0, peakT: RX_T_REF + 30,
          verdict: null, lastSync: 0
        };
      }
      if (!rxRef.current) rxRef.current = rxFresh();

      function rxReactivity(s, mode) {
        // Rod worth, solved rather than guessed. Three conditions fix it:
        //   fully out  -> +600 pcm of excess reactivity
        //   half in     -> exactly critical, so 50% is a sensible start
        //   fully in    -> -9000 pcm, a real shutdown margin
        // rho = 0.006 - c*x^n with 0.006 - c(0.5)^n = 0 and 0.006 - c = -0.09
        // gives c = 0.096 and n = 4. Near 50% a 1% rod movement is about 48 pcm,
        // comfortably under beta, which is why the core stays controllable.
        var rhoRods = 0.006 - 0.096 * Math.pow(s.rods / 100, 4);
        var rhoT = mode.tempCoef * (s.t - RX_T_REF);
        // Void must NOT appear at normal operating temperature. A PWR sits at
        // about 155 bar where water boils at 345 C, so a healthy core has
        // essentially no voiding. Thresholding at 330 C modelled a normally
        // running reactor as permanently boiling, which buried it under about
        // -470 pcm and made full power unreachable however far the rods came out.
        var voidFrac = s.pumps ? Math.max(0, (s.t - 350) / 50) : Math.max(0, (s.t - 320) / 40);
        voidFrac = Math.min(voidFrac, 1) * 100;
        var rhoVoid = mode.voidCoef * voidFrac;
        var rhoXe = -0.03 * (s.xe - 1);
        if (s.scrammed) rhoRods = -0.09;
        return { total: rhoRods + rhoT + rhoVoid + rhoXe, rods: rhoRods, temp: rhoT, voidR: rhoVoid, xe: rhoXe, voidFrac: voidFrac };
      }

      function rxWriteTelemetry(s, r, running) {
        var root = rxTelemetryRef.current;
        if (!root) return;
        function put(id, value) {
          var node = root.querySelector('#' + id);
          if (node && node.textContent !== value) node.textContent = value;
        }
        var rhoPcm = r.total * 1e5;
        put('rx-live-power', nkFmt(s.power, s.power < 10 ? 1 : 0) + '%');
        put('rx-live-temperature', nkFmt(s.t, 0) + ' °C');
        put('rx-live-reactivity', (rhoPcm >= 0 ? '+' : '') + nkFmt(rhoPcm, 0) + ' pcm');
        put('rx-live-xenon', nkFmt(s.xe, 2) + '×');
        put('rx-live-state', s.verdict
          ? (s.verdict.ok ? 'Scenario complete' : 'Run ended')
          : (s.scrammed ? 'Scrammed — decay heat only' : (running ? 'Running' : 'Paused')));
      }

      function rxStep(s, dt, mode, scen) {
        s.elapsed += dt;
        var r = rxReactivity(s, mode);
        var rho = r.total;

        if (s.scrammed) {
          s.sinceScram += dt;
          s.power = rxDecayHeat(100, s.sinceScram);
        } else {
          // prompt-jump period. Beyond prompt critical the period collapses and
          // no operator input can keep up — which is the entire point.
          var period;
          if (rho >= RX_BETA) period = Math.max(0.05, RX_GEN / Math.max(1e-6, rho - RX_BETA));
          else if (Math.abs(rho) < 1e-7) period = 1e9;
          else period = (RX_BETA - rho) / (RX_LAMBDA_D * rho);
          if (period > 0 && period < 0.5) period = 0.5;
          if (period < 0 && period > -2) period = -2;
          s.power = s.power * Math.exp(dt / period);
          s.power = Math.max(0.001, Math.min(100000, s.power));
        }

        // Thermal balance, solved so 100% power settles at about 310 C — the
        // average coolant temperature of a real PWR — and so a total loss of
        // cooling reaches cladding failure in a time a student will sit through.
        // Real cores take hours to get there; this one is deliberately compressed,
        // and the panel footnote says so.
        // Pumps off is very nearly zero removal, and that matters: at 0.05 the
        // core asymptoted at about 407 C, so the blackout scenario could be won
        // by doing nothing at all. With cooling genuinely lost there is no
        // equilibrium below melting — which is the entire lesson of Fukushima.
        var removal = (s.pumps ? 4.5 : 0.002) * (s.t - RX_T_REF);
        s.t += (s.power * 0.9 - removal) * dt * 2.6;
        s.t = Math.max(20, Math.min(4000, s.t));
        if (s.t > s.peakT) s.peakT = s.t;

        // xenon-135: builds from iodine when power drops, burns out at high flux
        var phi = s.power / 100;
        var prodI = phi, lossI = RX_LAM_I * s.iod * 3600 / 3600;
        s.iod += (prodI * 0.0000642 - RX_LAM_I * s.iod) * dt * 60;
        s.xe += (RX_LAM_I * s.iod + 0.0000032 * phi - RX_LAM_X * s.xe - 0.0000181 * phi * s.xe) * dt * 60;
        s.xe = Math.max(0.05, Math.min(6, s.xe));

        // scenario scoring
        if (!s.verdict) {
          if (s.t >= RX_T_MELT) s.verdict = { ok: false, why: 'Fuel melted. Above 2,865 °C the uranium dioxide itself liquefies — this is what "meltdown" literally means.' };
          else if (s.t >= RX_T_CLAD && scen.id !== 'blackout') s.verdict = { ok: false, why: 'Cladding failed at 1,200 °C. The zirconium tubes are the first barrier, and past this they split and react with steam to make hydrogen.' };
          else if (scen.id === 'steady') {
            if (s.power >= 95 && s.power <= 105) { s.holdOk += dt; if (s.holdOk >= 60) s.verdict = { ok: true, why: 'Held within band for a full minute. This is what a reactor does for months on end, and it is entirely unremarkable when it goes right.' }; }
            else s.holdOk = 0;
          } else if (scen.id === 'xenon') {
            if (s.phase === 0 && s.power <= 20) { s.phase = 1; s.holdOk = 0; }
            else if (s.phase === 1) { s.holdOk += dt; if (s.holdOk >= 90) s.phase = 2; }
            else if (s.phase === 2 && s.power >= 80) s.verdict = { ok: true, why: 'You climbed back out. Notice how many rods it took — and that at Chernobyl pulling that many left almost no shutdown margin, which is exactly the state the reactor was in.' };
          } else if (scen.id === 'blackout') {
            if (s.scrammed) { s.holdOk += dt; if (s.holdOk >= 120 && s.t < RX_T_CLAD) s.verdict = { ok: true, why: 'Two minutes of decay heat removed. At Fukushima this went on for days with no power, and that is the whole accident in one sentence.' }; }
            if (s.t >= RX_T_CLAD) s.verdict = { ok: false, why: 'Fuel reached 1,200 °C on decay heat alone, with fission long since stopped. Shutting a reactor down is not the same as making it safe.' };
          }
        }
        return r;
      }

      React.useEffect(function () {
        var el = rxCanvasRef.current;
        if (!el) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var W = 0, H = 0;
        // Signature of everything the panel actually shows. While the sim is
        // paused, an identical signature means an identical picture, so the
        // frame can be skipped entirely. Declared BEFORE size(), which writes
        // to it — a hoisted var would have worked, but only by accident.
        var lastSig = '';
        // Assigning el.width WIPES the canvas even when the value is unchanged,
        // and with the || 560 fallback it often IS unchanged: a resize from an
        // unlaid-out 0 to a real 560 produces identical numbers. That blanked
        // the panel permanently once the skip below started trusting a width
        // and height signature to mean nothing had changed. Clearing the
        // signature here is what makes "the canvas was wiped" count as a change.
        function size() {
          W = el.width = Math.round((el.offsetWidth || 560) * dpr);
          H = el.height = Math.round((el.offsetHeight || 210) * dpr);
          lastSig = '';
          if (rxWakeRef.current) rxWakeRef.current();
        }
        var c = el.getContext('2d');
        var last = 0;
        var hist = [];
        var frameQueued = false;
        var pageVisible = !document.hidden;
        var inView = true;

        function park() {
          if (frameQueued) cancelAnimationFrame(rxAnim.current);
          frameQueued = false;
          rxAnim.current = 0;
        }
        function queue() {
          if (frameQueued || !pageVisible || !inView || !el.isConnected) return;
          frameQueued = true;
          rxAnim.current = requestAnimationFrame(draw);
        }
        function wake() {
          lastSig = '';
          queue();
        }
        rxWakeRef.current = wake;
        size();

        function draw(ts) {
          frameQueued = false;
          rxAnim.current = 0;
          if (!el.isConnected || !pageVisible || !inView) return;
          try {
            var s = rxRef.current;
            var dt = last ? Math.min(0.25, (ts - last) / 1000) : 0.016;
            last = ts;
            var mode = RX_MODES.filter(function (m) { return m.id === el.dataset.mode; })[0] || RX_MODES[0];
            var scen = RX_SCENARIOS.filter(function (x) { return x.id === el.dataset.scenario; })[0] || RX_SCENARIOS[0];
            var advancing = el.dataset.running === 'on' && !s.verdict;
            if (!advancing) {
              // Rods still move while paused, and so does the resize, so the
              // signature covers both rather than assuming "paused" means
              // "unchanged". W and H are in it because a resize repaints.
              var sig = [el.dataset.mode, el.dataset.scenario, W, H, s.scrammed ? 1 : 0, s.pumps ? 1 : 0,
                Math.round(s.rods * 10), Math.round(s.power * 10), Math.round(s.t), Math.round(s.xe * 100),
                s.verdict ? 1 : 0].join('|');
              // Nothing changed: park completely. Controls, resize, visibility
              // and the dataset effect all call wake(), so no 60 Hz idle poll
              // is needed to make the next interaction immediate.
              if (sig === lastSig) return;
              lastSig = sig;
            } else {
              lastSig = '';
            }
            var r = advancing ? rxStep(s, dt, mode, scen) : rxReactivity(s, mode);

            hist.push(Math.min(200, s.power));
            if (hist.length > 240) hist.shift();

            c.clearRect(0, 0, W, H);
            c.fillStyle = '#0b1120';
            c.fillRect(0, 0, W, H);

            // Power trace, in a band that runs from just under the banner to
            // just above the readouts. The old layout gave the trace the top
            // 62% and the readouts the bottom 15%, which left a dead strip
            // across the middle AND put 200% power exactly on y=0 — so a real
            // excursion drew itself along the top edge, half-clipped, at the
            // one moment the trace is worth looking at.
            var plotTop = 26 * dpr, plotBot = H - 46 * dpr;
            function pwrY(pw) { return plotBot - (pw / 200) * (plotBot - plotTop); }
            c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
            [0, 100, 200].forEach(function (lv) {
              c.strokeStyle = lv === 100 ? 'rgba(148,163,184,0.34)' : 'rgba(148,163,184,0.16)';
              c.lineWidth = Math.max(1, dpr);
              if (lv === 200) c.setLineDash([4 * dpr, 4 * dpr]);
              c.beginPath(); c.moveTo(0, pwrY(lv)); c.lineTo(W, pwrY(lv)); c.stroke();
              c.setLineDash([]);
              c.fillStyle = 'rgba(148,163,184,0.85)';
              c.fillText(lv + '%', 4 * dpr, pwrY(lv) - 3 * dpr);
            });
            c.strokeStyle = s.t > RX_T_CLAD ? '#f87171' : (s.power > 110 ? '#fbbf24' : '#34d399');
            c.lineWidth = 2 * dpr;
            c.lineJoin = 'round'; c.lineCap = 'round';
            c.beginPath();
            hist.forEach(function (p, i) {
              var x = (i / 240) * W, y = pwrY(p);
              if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
            });
            c.stroke();
            // hist is clamped to 200, so past that the line goes flat along the
            // ceiling and reads as "power stopped rising" — the opposite of what
            // is happening. Say the real number instead.
            if (s.power > 200) {
              c.fillStyle = '#f87171';
              c.font = '800 ' + (9 * dpr) + 'px system-ui, sans-serif';
              c.textAlign = 'right';
              c.fillText('off scale — ' + nkFmt(s.power, 0) + '%', W - 6 * dpr, pwrY(200) - 3 * dpr);
              c.textAlign = 'left';
            }

            // readouts
            function box(x, label, value, colour) {
              // 0.65 put these at 3.75:1 on the panel's own #0b1120 — below AA,
              // and they are the words that say what each number IS. 0.85 is
              // 5.58:1 and still reads as a quieter label than its value.
              c.fillStyle = 'rgba(148,163,184,0.85)';
              c.font = '700 ' + (9 * dpr) + 'px system-ui, sans-serif';
              c.textAlign = 'left';
              c.fillText(label, x, H - 34 * dpr);
              c.fillStyle = colour;
              c.font = '800 ' + (15 * dpr) + 'px system-ui, sans-serif';
              c.fillText(value, x, H - 15 * dpr);
            }
            var colT = s.t >= RX_T_CLAD ? '#f87171' : (s.t > 400 ? '#fbbf24' : '#34d399');
            var rhoPcm = r.total * 1e5;
            box(10 * dpr, 'POWER', nkFmt(s.power, s.power < 10 ? 1 : 0) + '%', s.power > 110 ? '#fbbf24' : '#e2e8f0');
            box(W * 0.26, 'FUEL TEMP', nkFmt(s.t, 0) + ' °C', colT);
            box(W * 0.52, 'REACTIVITY', (rhoPcm >= 0 ? '+' : '') + nkFmt(rhoPcm, 0) + ' pcm', Math.abs(rhoPcm) < 20 ? '#34d399' : (rhoPcm > 650 ? '#f87171' : '#fbbf24'));
            box(W * 0.78, 'XENON', nkFmt(s.xe, 2) + '×', s.xe > 1.6 ? '#c084fc' : '#94a3b8');

            if (rhoPcm >= 650 && !s.scrammed) {
              c.fillStyle = '#f87171';
              c.font = '800 ' + (12 * dpr) + 'px system-ui, sans-serif';
              c.textAlign = 'center';
              c.fillText('PROMPT CRITICAL — beyond operator control', W / 2, 18 * dpr);
            } else if (s.scrammed) {
              c.fillStyle = '#60a5fa';
              c.font = '700 ' + (11 * dpr) + 'px system-ui, sans-serif';
              c.textAlign = 'center';
              c.fillText('SCRAMMED — decay heat only, ' + nkFmt(s.sinceScram, 0) + ' s', W / 2, 18 * dpr);
            }

            // sync only what the React controls actually need
            var rodStep = Math.round(s.rods / 5) * 5;
            var hotStep = s.t > 900 ? 2 : (s.t > 450 ? 1 : 0);
            if (!advancing || !s.lastSync || ts - s.lastSync > 400) {
              s.lastSync = ts;
              var runningNow = el.dataset.running === 'on' && !s.verdict;
              rxWriteTelemetry(s, r, runningNow);
              var ui = rxUiRef.current;
              if (rodStep !== ui.rodStep || hotStep !== ui.hotStep || (!!s.verdict) !== (!!ui.verdict) ||
                  s.pumps !== ui.pumps || s.scrammed !== ui.scrammed || runningNow !== ui.running) {
                var nextUi = Object.assign({}, ui, {
                  running: runningNow, verdict: s.verdict, rodStep: rodStep, hotStep: hotStep,
                  pumps: s.pumps, scrammed: s.scrammed
                });
                rxUiRef.current = nextUi;
                setRxUi(nextUi);
              }
            }
          } catch (err) { console.error('Reactor sim error:', err); }
          if (el.dataset.running === 'on' && !rxRef.current.verdict) queue();
        }
        var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null;
        if (ro) ro.observe(el);
        var io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
          if (!entries.length) return;
          inView = !!entries[0].isIntersecting;
          if (inView) wake(); else park();
        }, { rootMargin: '200px' }) : null;
        if (io) io.observe(el);
        function onVisibility() {
          pageVisible = !document.hidden;
          if (pageVisible) wake(); else park();
        }
        document.addEventListener('visibilitychange', onVisibility);
        queue();
        return function () {
          park();
          rxWakeRef.current = function () {};
          if (ro) ro.disconnect();
          if (io) io.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
        };
      }, []);

      React.useEffect(function () {
        var el = rxCanvasRef.current;
        if (!el) return;
        el.dataset.mode = rxMode;
        el.dataset.scenario = rxScenario;
        el.dataset.running = rxUi.running ? 'on' : 'off';
        rxWakeRef.current();
      }, [rxMode, rxScenario, rxUi.running]);

      React.useEffect(function () {
        RX_VIEWER.sync({
          selected: d.rxPart || null,
          dark: isDark,
          contrast: ctx.theme === 'contrast',
          sceneProps: { rods: rxUi.rodStep, hot: rxUi.hotStep / 2 },
          sceneKey: rxUi.rodStep + ':' + rxUi.hotStep,
          onPick: function (id) {
            upd({ rxPart: id });
            var p = RX_PARTS.filter(function (x) { return x.id === id; })[0];
            if (p && typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc);
          },
          onStatus: function (n) { upd({ rxStatus: n }); }
        });
      }, [d.rxPart, isDark, ctx.theme, rxUi.rodStep, rxUi.hotStep]);

      React.useEffect(function () {
        if (rxUi.verdict && rxUi.verdict.ok && !d.reactorRun) {
          upd({ reactorRun: true });
          if (typeof celebrate === 'function') celebrate();
          if (typeof awardXP === 'function') awardXP('nuclear_operate', 15, 'Completed a reactor scenario');
        }
      }, [rxUi.verdict, d.reactorRun]);

      function rxSet(patch) {
        var s = rxRef.current;
        Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
        rxWakeRef.current();
      }
      function rxRestart() {
        rxRef.current = rxFresh();
        rxPatchUi({
          running: false, verdict: null, rodStep: 50, hotStep: 0,
          pumps: true, scrammed: false
        });
        rxWakeRef.current();
        if (typeof announceToSR === 'function') announceToSR('Reactor reset to 50% rods, full power, pumps running.');
      }
      var rxRead = rxRef.current;
      var rxReadR = rxReactivity(rxRead, rxModeObj);
      var rxReadRhoPcm = rxReadR.total * 1e5;
      var rxReadState = rxUi.verdict
        ? (rxUi.verdict.ok ? 'Scenario complete' : 'Run ended')
        : (rxUi.scrammed ? 'Scrammed — decay heat only' : (rxUi.running ? 'Running' : 'Paused'));

      // ── binding energy ──
      var beRef = React.useRef(null);
      var bePick = d.bePick || 'u235';
      var beRxn = REACTIONS.filter(function (r) { return r.id === bePick; })[0] || REACTIONS[2];
      // The true maximum is Ni-62 at 8.795 MeV, not Fe-56 at 8.790. "Iron is the
      // peak" is a repeated simplification; Fe-56 is the most ABUNDANT end point
      // because stellar Ni-56 decays to it, which is a different claim.
      var bePeak = BINDING.reduce(function (best, x) { return x.be > best.be ? x : best; }, BINDING[0]);
      var beMevPerNucleon = beRxn.mev / beRxn.outA;
      var beMassPct = (beRxn.mev / (beRxn.outA * NK_C2)) * 100;

      React.useEffect(function () {
        var pts = BINDING.slice().sort(function (p, q) { return p.a - q.a; }).map(function (x) { return [x.a, x.be]; });
        nkChart(beRef.current, {
          xMin: 0, xMax: 240, yMin: 0, yMax: 10, xUnit: '', yUnit: '',
          xTitle: 'Mass number A  (protons + neutrons)',
          yTitle: 'Binding energy per nucleon, MeV',
          // The two halves of the argument, shaded. Everything to the left of
          // the peak releases energy by joining up; everything to the right
          // releases it by splitting. The peak is where both roads end.
          bands: [
            { from: 0, to: bePeak.a, colour: isDark ? 'rgba(52,211,153,0.10)' : 'rgba(5,150,105,0.09)' },
            { from: bePeak.a, to: 240, colour: isDark ? 'rgba(248,113,113,0.10)' : 'rgba(185,28,28,0.08)' }
          ],
          series: [{ points: pts, colour: ink('#38bdf8'), width: 2.2, fill: true, dots: true }],
          marker: { x: bePeak.a, y: bePeak.be, colour: ink('#fbbf24') },
          annotations: [
            { x: bePeak.a, y: bePeak.be, text: bePeak.sym + ' — ' + bePeak.be.toFixed(3) + ' MeV, the summit',
              colour: ink('#fbbf24'), dx: 14, dy: -16 },
            // Deliberately NOT phrased as uphill/downhill. On this axis the
            // curve climbs toward the peak, while the energy released is the
            // system falling to a lower mass-energy — so either word is right
            // about one thing and wrong about the other. Name the operation
            // instead, and let the shaded halves carry the direction.
            { x: 12, y: 2.2, text: 'FUSION: light nuclei join →', colour: ink('#34d399'), dx: 6, dy: 10 },
            { x: 235, y: 7.57, text: '← FISSION: heavy nuclei split', colour: ink('#f87171'), dx: -8, dy: 34 }
          ],
          legend: [{ label: 'Measured nuclides (AME2020)', colour: ink('#38bdf8') }]
        });
      }, [isDark]);

      // ── personal dose ──
      var dsAlt = typeof d.dsAlt === 'number' ? d.dsAlt : 100;         // metres
      var dsFlights = typeof d.dsFlights === 'number' ? d.dsFlights : 4; // hours per year
      var dsRadon = d.dsRadon || 'avg';
      var dsScans = d.dsScans || {};
      var radonObj = RADON_LEVELS.filter(function (r) { return r.id === dsRadon; })[0] || RADON_LEVELS[1];
      // Cosmic dose roughly doubles every 1,500 m of altitude
      var dsCosmic = DOSE_COSMIC_SEA * Math.pow(2, dsAlt / 1500);
      var dsFlightDose = dsFlights * DOSE_FLIGHT_HR;
      var dsMedical = 0;
      SCAN_TYPES.forEach(function (s) { dsMedical += (dsScans[s.id] || 0) * s.v; });
      var dsTotal = dsCosmic + DOSE_TERRESTRIAL + DOSE_INTERNAL + radonObj.v + dsFlightDose + dsMedical;
      var dsParts = [
        { name: 'Radon in your home', v: radonObj.v, colour: '#f87171' },
        { name: 'Ground and buildings', v: DOSE_TERRESTRIAL, colour: '#fb923c' },
        { name: 'Inside your own body', v: DOSE_INTERNAL, colour: '#a78bfa' },
        { name: 'Cosmic rays', v: dsCosmic, colour: '#38bdf8' },
        { name: 'Flying', v: dsFlightDose, colour: '#22d3ee' },
        { name: 'Medical imaging', v: dsMedical, colour: '#fbbf24' }
      ];

      // ── shared UI ──
      // Accent in, readable text colour out. Pass-through for anything not in
      // the table (rgba strings, already-theme-aware ternaries, '#0b1020'),
      // so it is safe to wrap any colour expression with it.
      var ink = function (c) {
        var pair = typeof c === 'string' && NK_INK[c.toLowerCase()];
        return pair ? (isDark ? pair[0] : pair[1]) : c;
      };
      var card = function (accent) {
        var children = Array.prototype.slice.call(arguments, 1);
        // Spread the children as separate arguments. Passing the array itself
        // makes React treat them as a dynamic LIST and warn that every one needs
        // a key — they are static siblings, not a list.
        return h.apply(null, ['div', { className: 'rounded-xl border p-3 mt-3', style: {
          borderColor: accent + '55',
          background: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.92)',
          boxShadow: '0 1px 2px rgba(15,23,42,0.05), 0 12px 28px -22px rgba(15,23,42,0.5)'
        } }].concat(children));
      };
      // Same card, plus the anchor the topic index jumps to. scroll-margin keeps
      // the heading clear of the sticky index bar instead of hiding under it.
      var sec = function (id, accent) {
        // Route mode is progressive disclosure, not only a navigation reorder:
        // keep unrelated sections out of the DOM so a learner following one
        // question sees a short, coherent path. The all-topics/search/category
        // modes continue to render every matching section.
        if (typeof nkPath !== 'undefined' && nkPath && nkPath.steps.indexOf(id) === -1) return null;
        var children = Array.prototype.slice.call(arguments, 2);
        // A route was only walkable from the index: read a step, scroll back up,
        // open the drawer, find the next one. Sections on the active route now
        // carry their own step footer, so it can be followed straight through.
        var footer = nkRouteFooter(id, accent);
        var node = card.apply(null, [accent].concat(footer ? children.concat([footer]) : children));
        return React.cloneElement(node, {
          id: 'nksec-' + id,
          'data-nk-sec': id,
          // tabIndex -1 so nkGoTo can move FOCUS here, not just the viewport.
          // Scrolling alone left a keyboard user's focus back on the index
          // button: the page moved, the next Tab went to the next index button,
          // and the section they asked for was unreachable without tabbing
          // through everything above it. -1 keeps it out of the tab order.
          tabIndex: -1,
          style: Object.assign({}, node.props.style, { scrollMarginTop: '188px', outline: 'none' })
        });
      };
      // A real <h4>, not a styled <p>. Seventeen sections had exactly one
      // heading element between them (the tool title), so a screen reader user
      // had no document structure to navigate — the topic index above is a
      // mouse affordance, and rotor/heading navigation found nothing. h4 sits
      // directly under the h3 title, so the order is valid with no gap.
      // Tailwind's preflight resets heading size and weight to inherit, so the
      // classes below still decide how it looks and nothing moves visually.
      var heading = function (accent, text) {
        return h('h4', { className: 'text-xs font-black mb-2', style: { color: ink(accent) } }, text);
      };
      var pill = function (on, accent, label, onClick, aria) {
        return h('button', {
          key: label, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria || label,
          onClick: onClick,
          className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold transition-colors',
          style: on
            ? { background: accent, color: '#0b1020', border: '1px solid ' + accent }
            : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
        }, label);
      };
      var slider = function (id, label, min, max, stepv, value, onChange, suffix) {
        return h('div', { className: 'flex items-center gap-2 mt-1.5' },
          h('label', { htmlFor: id, className: 'text-[11px] font-bold w-28 flex-shrink-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, label),
          h('input', { id: id, type: 'range', min: min, max: max, step: stepv, value: value, onChange: onChange, className: 'flex-1 h-6 accent-violet-500' }),
          h('span', { className: 'text-[11px] font-bold w-24 text-right', style: { color: isDark ? '#c4b5fd' : '#6d28d9' } }, suffix));
      };
      var stat = function (label, value, colour) {
        return h('div', { key: label, className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.09)', border: '1px solid ' + colour + '50' } },
          h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, label),
          h('p', { className: 'text-sm font-black', style: { color: ink(colour) } }, value));
      };
      // A disclosure, not a toggle button that swallows its own payload.
      // The revealed body used to sit INSIDE the button, and because these rows
      // set an explicit aria-label, that label became the accessible name and
      // the prose it wrapped was never announced — visible on screen, silent to
      // a screen reader, which is the worst of both. Now the button carries
      // aria-expanded and the body is an ordinary sibling immediately after it,
      // so browse-mode reading order walks straight into it.
      var expandRow = function (key, on, accent, title, sub, body, onClick, aria) {
        return h('div', {
          key: key, className: 'rounded-lg border transition-colors',
          style: on ? { background: accent + '1f', borderColor: accent }
            : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
        },
          h('button', {
            type: 'button', 'aria-expanded': on ? 'true' : 'false', 'aria-label': aria,
            onClick: onClick,
            className: 'w-full text-left px-2.5 py-2 rounded-lg'
          },
            h('span', { className: 'flex items-center gap-2' },
              h('span', { className: 'flex-1' },
                h('span', { className: 'block text-[11px] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, title),
                sub ? h('span', { className: 'block text-[11px]', style: { color: isDark ? '#cbd5e1' : '#475569' } }, sub) : null),
              h('span', { className: 'text-[11px] font-bold', 'aria-hidden': 'true', style: { color: ink(accent) } }, on ? '▾' : '›'))),
          on ? h('div', { className: 'px-2.5 pb-2 -mt-0.5' }, body) : null);
      };
      var para = function (txt, colour) {
        return h('span', { className: 'block text-[11px] leading-relaxed mt-1', style: { color: ink(colour) || (isDark ? '#e2e8f0' : '#334155') } }, txt);
      };
      var sourceNote = function (keys) {
        var items = keys.map(function (key) { return NK_SOURCES[key]; }).filter(Boolean);
        return h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
          'Sources · reviewed ' + NK_REVIEWED + ': ',
          items.map(function (src, i) {
            return h(React.Fragment, { key: src.url }, i ? ' · ' : '',
              h('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', className: 'underline font-bold' }, src.label));
          }));
      };
      var safetyNotice = function (kind) {
        var detail = kind === 'ki'
          ? 'Take potassium iodide only when public-health officials tell you to; it does not protect against most radiation hazards.'
          : (kind === 'medical'
            ? 'Follow the nuclear-medicine team\'s written discharge instructions. Never use this calculator to set a real contact time or handle a sealed source.'
            : (kind === 'emergency'
              ? 'In an actual release, follow state and local officials. Whether to shelter, evacuate, or take KI depends on measurements and conditions this model cannot know.'
              : 'This personal-dose estimate is educational, not a medical assessment. Ask a qualified clinician, health physicist, or local radon program about a real exposure.'));
        return h('aside', { role: 'note', 'aria-label': 'Educational safety notice', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(248,113,113,0.6)', background: isDark ? 'rgba(69,10,10,0.35)' : 'rgba(254,242,242,0.95)' } },
          h('p', { className: 'text-[11px] font-black', style: { color: ink('#ef4444') } }, 'Educational model — not emergency or medical instructions'),
          h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#fecaca' : '#7f1d1d' } }, detail),
          h('a', { href: NK_SOURCES.nrc.url, target: '_blank', rel: 'noopener noreferrer', className: 'inline-block mt-1 text-[11px] font-bold underline', style: { color: ink('#ef4444') } }, 'Official NRC emergency guidance ↗'));
      };

      // ── topic index ──
      // Fifteen sections is a long scroll to hunt through. Order here MUST match DOM
      // order — the numbers in the headings are read off this list.
      var NK_GROUPS = [
        { id: 'all', label: 'All' },
        { id: 'decay', label: 'Decay & dating' },
        { id: 'radiation', label: 'Radiation & dose' },
        { id: 'reactors', label: 'Reactors' },
        { id: 'society', label: 'Risk & society' }
      ];
      var NK_SECTIONS = [
        { id: 'halflife', grp: 'decay', icon: '⏳', label: 'Half-life', kw: 'decay constant rate exponential isotope carbon caesium tritium never changes' },
        { id: 'dating', grp: 'decay', icon: '🦴', label: 'Carbon dating', kw: 'carbon-14 c14 archaeology age sample radiocarbon 5730 years old' },
        { id: 'chain', grp: 'decay', icon: '⛓️', label: 'Uranium decay chain', kw: 'u238 lead radon basement alpha beta daughter series progeny' },
        { id: 'enrichment', grp: 'reactors', icon: '🔢', label: 'Enrichment', kw: 'u235 percent centrifuge weapons grade reactor fuel not a bomb proliferation' },
        { id: 'shielding', grp: 'radiation', icon: '🛡️', label: 'Shielding', kw: 'alpha beta gamma neutron lead concrete paper stopping attenuation' },
        { id: 'criticality', grp: 'reactors', icon: '⚛️', label: 'Chain reaction', kw: 'critical subcritical supercritical k neutron multiplication moderator control' },
        { id: 'binding', grp: 'decay', icon: '⛰️', label: 'Binding energy', kw: 'curve iron-56 fission fusion mass defect e=mc2 nucleon why energy' },
        { id: 'weighting', grp: 'radiation', icon: '🎚️', label: 'Gray vs sievert', kw: 'absorbed equivalent effective dose weighting factor icrp 103 gray gy sievert sv wr wt tissue organ why alpha is worse units' },
        { id: 'biohalf', grp: 'radiation', icon: '🫀', label: 'Half-life inside a body', kw: 'biological effective half-life excretion internal contamination caesium potassium iodide ki tablets thyroid strontium bone plutonium ingestion' },
        { id: 'mydose', grp: 'radiation', icon: '🧮', label: 'Your annual dose', kw: 'personal estimate radon flights scans altitude millisievert msv background' },
        { id: 'doseladder', grp: 'radiation', icon: '📏', label: 'Dose ladder', kw: 'sievert banana flight ct scan lethal acute compare how much is a lot' },
        { id: 'detect', grp: 'radiation', icon: '🔬', label: 'Measure it: counts vs dose', kw: 'geiger counter cpm cps becquerel activity counting statistics poisson inverse square distance background subtraction detection limit uncertainty error bars' },
        { id: 'protect', grp: 'radiation', icon: '⏱️', label: 'Time, distance, shielding', kw: 'protection alara stay time dose rate gamma constant sealed source patient nuclear medicine half value layer worker limit how long can i stand here' },
        { id: 'accidents', grp: 'society', icon: '📋', label: 'The three accidents', kw: 'chernobyl fukushima three mile island deaths tmi meltdown numbers' },
        { id: 'shelter', grp: 'society', icon: '🏠', label: 'Shelter or evacuate?', kw: 'emergency protective action evacuation sheltering plume dose reduction factor fukushima pag epa iaea basement decision' },
        { id: 'reactors', grp: 'reactors', icon: '🏭', label: 'Reactor designs & SMRs', kw: 'pwr bwr candu rbmk smr molten salt fusion small modular status' },
        { id: 'waste', grp: 'society', icon: '🗄️', label: 'The waste question', kw: 'spent fuel repository onkalo storage geological million years disposal' },
        { id: 'compare', grp: 'society', icon: '⚖️', label: 'Compared with alternatives', kw: 'deaths per twh coal gas solar wind carbon co2 lifecycle safest' },
        { id: 'operate', grp: 'reactors', icon: '🎛️', label: 'Operate a reactor', kw: 'simulator control rods scram xenon blackout scenario 3d core hands on' }
      ];
      // ── Question-led routes through the tool ─────────────────────────────
      // Nineteen sections and eleven thousand pixels, ordered by physics: start
      // at half-life, end at a reactor simulator. That order is right for
      // someone reading it through and wrong for almost everyone who arrives,
      // because people do not turn up wanting "section 8" — they turn up
      // wanting to know whether the scan they just had matters, or whether
      // nuclear power is safe, and the sections that answer those questions are
      // scattered across the document by design.
      //
      // These are the same nineteen sections in five reading orders. Nothing is
      // hidden and nothing is duplicated: a route is a filter over the index,
      // so a student can take one, ignore them all, or search as before.
      var NK_PATHS = [
        { id: 'safe', q: 'Is nuclear power safe?', icon: '⚖️',
          why: 'Start with the comparison, then the three accidents that shape how people feel about it, then the two problems that are genuinely unsolved.',
          steps: ['compare', 'accidents', 'shelter', 'waste', 'reactors'] },
        { id: 'me', q: 'Does this dose matter to me?', icon: '🧍',
          why: 'What a sievert actually is, what happens once something is inside you, your own yearly total, and where it all sits on a scale.',
          steps: ['weighting', 'biohalf', 'mydose', 'doseladder'] },
        { id: 'safety', q: 'How would I protect myself?', icon: '🛡️',
          why: 'What stops each kind of radiation, the three levers you can actually pull, and the one emergency decision that is genuinely a judgement call.',
          steps: ['shielding', 'protect', 'shelter'] },
        { id: 'works', q: 'How does any of it work?', icon: '⚛️',
          why: 'The one rule that never changes, the curve behind both fission and fusion, the chain reaction, and then run one yourself.',
          steps: ['halflife', 'binding', 'criticality', 'enrichment', 'operate'] },
        { id: 'know', q: 'How do we know all this?', icon: '🔬',
          why: 'Every number in this tool came from an instrument. This is what those instruments are and what they can and cannot tell you.',
          steps: ['detect', 'dating', 'chain'] }
      ];
      // Open on a laptop, where it costs a fifth of the screen and the routes
      // are the new way in. Closed on a phone, where the expanded bar measured
      // half the viewport and would sit there permanently for anyone who
      // scrolls rather than jumps. An explicit choice always wins over both.
      var nkNarrow = typeof window !== 'undefined' && window.innerWidth > 0 && window.innerWidth < 700;
      var nkOpen = typeof d.nkOpen === 'boolean' ? d.nkOpen : !nkNarrow;
      var nkQuery = (d.nkQuery || '').trim().toLowerCase();
      var nkGroup = d.nkGroup || 'all';
      var nkPathId = d.nkPath || null;
      var nkPath = nkPathId ? NK_PATHS.filter(function (p) { return p.id === nkPathId; })[0] : null;
      function nkMatches(s) {
        if (nkGroup !== 'all' && s.grp !== nkGroup) return false;
        if (!nkQuery) return true;
        return (s.id + ' ' + s.label + ' ' + s.kw).toLowerCase().indexOf(nkQuery) !== -1;
      }
      // A route replaces the filter AND the order: its sections are listed in
      // the order the route wants them read, not in document order.
      var nkVisible = nkPath
        ? nkPath.steps
            .map(function (id) { return NK_SECTIONS.filter(function (s) { return s.id === id; })[0]; })
            .filter(Boolean)
        : NK_SECTIONS.filter(nkMatches);
      function nkGoTo(s) {
        var target = typeof document !== 'undefined' && document.getElementById('nksec-' + s.id);
        if (target) {
          var rm = !!(typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
          try { target.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }); }
          catch (e) { target.scrollIntoView(); }
          // Then take focus with it, so Tab continues from the section the
          // reader asked for. preventScroll keeps focus() from fighting the
          // smooth scroll that just started.
          try { target.focus({ preventScroll: true }); }
          catch (e2) { try { target.focus(); } catch (e3) {} }
        }
        // Fold the index once it has been used. Measured on a 390 px phone the
        // expanded bar takes 48% of the viewport before the routes were added
        // and 53% after — half the screen, permanently, for navigation the
        // reader has just finished with.
        if (d.nkOpen !== false) upd({ nkOpen: false });
        if (typeof announceToSR === 'function') announceToSR('Jumped to ' + s.label + '.');
      }
      // ── Scroll-spy ───────────────────────────────────────────────────────
      // Nineteen sections and eleven thousand pixels. Once the index folds
      // there is nothing telling a reader where in the document they are, and
      // "where am I" is the question a long page has to keep answering.
      //
      // Written imperatively on purpose. Routing this through React state would
      // re-render all nineteen sections on every boundary crossed — measured at
      // ~100 ms on a throttled CPU — so scrolling would hitch repeatedly just to
      // move a highlight. The observer writes to the two buttons that change and
      // touches nothing else.
      React.useEffect(function () {
        if (typeof IntersectionObserver !== 'function' || typeof document === 'undefined') return;
        var root = document.querySelector('[data-nuclear-lab]');
        if (!root) return;
        var targets = root.querySelectorAll('[data-nk-sec]');
        if (!targets.length) return;
        var current = null;
        var visible = {};

        function paint(id, on) {
          var btn = root.querySelector('[data-nk-jump="' + id + '"]');
          if (!btn) return;                       // filtered out of the index
          if (on) {
            btn.setAttribute('aria-current', 'location');
            btn.style.background = ink('#22d3ee');
            btn.style.color = '#0b1020';
            btn.style.borderColor = ink('#22d3ee');
          } else {
            btn.removeAttribute('aria-current');
            btn.style.background = '';
            btn.style.color = '';
            btn.style.borderColor = '';
          }
        }

        var io = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) {
            var id = e.target.getAttribute('data-nk-sec');
            if (e.isIntersecting) visible[id] = e.boundingClientRect.top;
            else delete visible[id];
          });
          // The topmost section still on screen is the one being read. Without
          // this, a tall section and a short one both "intersect" and the
          // highlight flickers between them.
          var best = null, bestTop = Infinity;
          Object.keys(visible).forEach(function (id) {
            if (visible[id] < bestTop) { bestTop = visible[id]; best = id; }
          });
          if (best === current) return;
          if (current) paint(current, false);
          current = best;
          if (current) paint(current, true);
        }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });

        for (var i = 0; i < targets.length; i++) io.observe(targets[i]);
        return function () {
          if (current) paint(current, false);
          io.disconnect();
        };
      }, [isDark, nkPathId, nkOpen, nkGroup, nkQuery]);

      // Step footer for a section on the active route. A function DECLARATION so
      // sec() can call it from higher up the file: sec is defined before the
      // route state exists, but only ever runs inside the return below, by which
      // point it does.
      function nkRouteFooter(id, accent) {
        if (!nkPath) return null;
        var at = nkPath.steps.indexOf(id);
        if (at === -1) return null;
        var sectionOf = function (sid) {
          return NK_SECTIONS.filter(function (x) { return x.id === sid; })[0];
        };
        var prev = at > 0 ? sectionOf(nkPath.steps[at - 1]) : null;
        var next = at < nkPath.steps.length - 1 ? sectionOf(nkPath.steps[at + 1]) : null;
        var stepBtn = function (s, dir) {
          return h('button', {
            key: dir, type: 'button',
            onClick: function () { nkGoTo(s); },
            'aria-label': (dir === 'prev' ? 'Back to step ' + at + ': ' : 'On to step ' + (at + 2) + ': ') + s.label,
            className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.92)',
              color: isDark ? '#e2e8f0' : '#334155',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
            }
          }, dir === 'prev' ? '← ' + s.label : s.label + ' →');
        };
        return h('div', {
          key: 'routefoot',
          className: 'flex flex-wrap items-center gap-2 mt-3 pt-2',
          style: { borderTop: '1px dashed ' + accent + '66' }
        },
          h('span', { className: 'text-[10px] font-black', style: { color: ink('#22d3ee') } },
            nkPath.icon + ' STEP ' + (at + 1) + ' OF ' + nkPath.steps.length),
          h('span', { className: 'flex-1' }),
          prev ? stepBtn(prev, 'prev') : null,
          next ? stepBtn(next, 'next')
            : h('span', { className: 'text-[11px] font-bold', style: { color: ink('#34d399') } },
                '✓ End of this route')
        );
      }

      // Every section stays open, so the index is pure navigation — nothing here
      // marks a topic as engaged. The quest hooks still measure real interaction.
      var nkIndex = h('nav', {
        'aria-label': 'Nuclear lab topics',
        className: 'rounded-xl border px-2.5 py-2 mt-1',
        style: {
          position: 'sticky', top: 0, zIndex: 30,
          borderColor: 'rgba(167,139,250,0.4)',
          background: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(6px)'
        }
      },
        h('div', { className: 'flex flex-wrap items-center gap-2' },
          h('button', {
            type: 'button',
            'aria-expanded': nkOpen ? 'true' : 'false',
            // Only while the body exists. axe tolerates a dangling reference,
            // but aria-expanded already carries the state and pointing at an
            // id that is not in the document is not something to rely on.
            'aria-controls': nkOpen ? 'nk-index-body' : undefined,
            'aria-label': (nkOpen ? 'Hide' : 'Show') + ' the topic index, ' + NK_SECTIONS.length + ' topics'
              + (nkPath ? ', currently following the route "' + nkPath.q + '"' : ''),
            onClick: function () { upd({ nkOpen: !nkOpen }); if (typeof beep === 'function') beep(); },
            className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-black',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(167,139,250,0.09)',
              color: isDark ? '#c4b5fd' : '#6d28d9',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(167,139,250,0.35)')
            }
          }, '🧭 ' + NK_SECTIONS.length + ' topics ' + (nkOpen ? '▾' : '▸')),
          nkPath && !nkOpen
            ? h('span', { className: 'text-[11px] font-bold', style: { color: ink('#22d3ee') } },
                nkPath.icon + ' ' + nkPath.q)
            : null,
          h('label', { htmlFor: 'nk-topic-search', className: 'sr-only' }, 'Search topics'),
          h('input', {
            id: 'nk-topic-search', type: 'search', value: d.nkQuery || '',
            placeholder: 'Search topics…',
            'aria-label': 'Search the ' + NK_SECTIONS.length + ' topics by name or keyword',
            onChange: function (e) { upd({ nkQuery: e.target.value, nkPath: null }); },
            className: 'flex-1 min-w-[8rem] rounded-lg px-2 py-1 text-[11px]',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.95)',
              color: isDark ? '#e2e8f0' : '#1e293b',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
            }
          }),
          h('span', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } },
            nkPath ? 'route: ' + nkVisible.length + ' steps'
              : (nkVisible.length === NK_SECTIONS.length ? 'showing all' : 'showing ' + nkVisible.length))
        ),
        // Collapsible body. The header row above stays put so the index is
        // always one tap away; everything below folds once it has been used.
        // Belt as well as braces: even expanded, the sticky bar must not take
        // the screen. Bounded here rather than left to the sum of its rows.
        nkOpen ? h('div', { id: 'nk-index-body', style: { maxHeight: '42vh', overflowY: 'auto' } },
          h('div', { className: 'mt-1.5' },
            h('span', { className: 'block text-[10px] font-black mb-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'START WITH A QUESTION'),
            h('div', { className: 'flex flex-wrap gap-1' },
              NK_PATHS.map(function (route) {
                return pill(nkPathId === route.id, '#22d3ee', route.icon + ' ' + route.q, function () {
                  var on = nkPathId === route.id;
                  // Taking a route clears the search and the category, because
                  // three filters fighting each other is worse than none.
                  upd({ nkPath: on ? null : route.id, nkQuery: '', nkGroup: 'all' });
                  if (!on) {
                    pushOnce('pathsTried', route.id);
                    var first = NK_SECTIONS.filter(function (x) { return x.id === route.steps[0]; })[0];
                    if (first) nkGoTo(first);
                  }
                  if (typeof beep === 'function') beep();
                }, (nkPathId === route.id ? 'Leave the route: ' : 'Follow the route: ') + route.q
                   + '. ' + route.steps.length + ' topics, starting with ' + route.steps[0] + '.');
              })
            ),
            nkPath ? h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              nkPath.why) : null
          ),
          // These pills stay fully legible while a route is active. Dimming
          // them read as "disabled" when they are not — they are the way OFF a
          // route — and any opacity drops the contrast of the text inside by
          // the same factor, which is not something to do to a live control.
          nkPath ? h('span', { className: 'block text-[10px] font-black mt-1.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'OR BROWSE BY CATEGORY') : null,
          h('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
            NK_GROUPS.map(function (g) {
              var n = g.id === 'all' ? NK_SECTIONS.length : NK_SECTIONS.filter(function (s) { return s.grp === g.id; }).length;
              return pill(nkGroup === g.id && !nkPath, '#a78bfa', g.label + ' (' + n + ')', function () {
                // Choosing a category is a deliberate way off a route.
                upd({ nkGroup: g.id, nkPath: null });
              }, nkPath
                ? 'Leave the route and show ' + g.label + ', ' + n + ' topics'
                : 'Show ' + g.label + ', ' + n + ' topics');
            })
          ),
          // Cap the list height: 14 pills wrap to several rows, and an uncapped
          // sticky bar would sit on a third of a phone screen permanently.
          h('div', { className: 'flex flex-wrap gap-1 mt-1.5', style: { maxHeight: '92px', overflowY: 'auto' } },
            nkVisible.length === 0
              ? h('span', { className: 'text-[11px]', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                  'No topic matches “' + (d.nkQuery || '') + '”.')
              : nkVisible.map(function (s, i) {
                  return h('button', {
                    key: s.id, type: 'button',
                    onClick: function () { nkGoTo(s); },
                    'aria-label': 'Jump to ' + s.label,
                    // The scroll-spy below marks the section currently in view
                    // by writing to this element directly. It deliberately does
                    // not go through React: a state change here would re-render
                    // all nineteen sections every time a boundary is crossed,
                    // which measured ~100 ms on a throttled CPU — a hitch on
                    // every scroll, to move a highlight.
                    'data-nk-jump': s.id,
                    className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                    style: {
                      background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(167,139,250,0.09)',
                      color: isDark ? '#e2e8f0' : '#334155',
                      border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.28)' : 'rgba(167,139,250,0.35)')
                    }
                  }, nkPath
                    ? (s.icon + ' Step ' + (i + 1) + ' — ' + s.label + '  (§' + (NK_SECTIONS.indexOf(s) + 1) + ')')
                    : (s.icon + ' ' + (NK_SECTIONS.indexOf(s) + 1) + '. ' + s.label));
                })
          )
        ) : null
      );

      return h('div', { 'data-nuclear-lab': 'true', className: 'nk-readable max-w-5xl mx-auto animate-in fade-in duration-200' },
        h('style', null, '@media (max-width:640px){.nk-readable .text-\\[11px\\]{font-size:.875rem!important;line-height:1.35rem!important}.nk-readable .text-\\[10px\\]{font-size:.75rem!important;line-height:1.1rem!important}.nk-readable canvas{min-height:220px}}'),

        h('div', { className: 'relative overflow-hidden rounded-xl border mb-1 px-3 py-2.5', style: { background: 'linear-gradient(115deg, #1a0f2e 0%, #2e1065 46%, #0b1a2e 100%)', borderColor: 'rgba(167,139,250,0.4)' } },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            ArrowLeft ? h('button', {
              onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
              className: 'p-1.5 rounded-lg transition-colors',
              style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(226,232,240,0.18)' },
              'aria-label': t('stem.common.back_to_tools', 'Back to tools')
            }, h(ArrowLeft, { size: 18, className: 'text-slate-100' })) : null,
            h('div', null,
              h('h3', { className: 'text-lg font-black tracking-tight text-white' }, '☢️ Nuclear & Radiation Lab'),
              h('span', { className: 'text-xs', style: { color: 'rgba(196,181,253,0.9)' } }, 'What the numbers actually say — including where they are disputed')
            )
          )
        ),

        nkIndex,

        // ── 1. decay ──
        sec('halflife', '#a78bfa',
          heading(ink('#c4b5fd'), '⏳ 1. Half-life: the one rule that never changes'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every half-life, exactly half of what is left decays. Not half the original — half of what remains. Nothing changes the rate: not heat, not pressure, not chemistry.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            ISOTOPES.map(function (x) {
              return pill(isoId === x.id, '#a78bfa', x.name, function () {
                upd({ isoId: x.id });
                pushOnce('isoTried', x.id);
                if (typeof beep === 'function') beep();
              }, 'Use ' + x.name + ', half-life ' + x.hlText);
            })
          ),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(167,139,250,0.35)', height: '180px' } },
            h('canvas', { ref: decayRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-decay-description',
              'aria-label': 'Decay curve. After ' + nkFmt(halves, 1) + ' half-lives, ' + nkFmt(remaining * 100, 1) + ' percent of the ' + iso.name + ' remains. The curve halves at every step and never quite reaches zero.',
              style: { width: '100%', height: '100%', display: 'block' } })),
          slider('nk-halves', 'Half-lives', 0, 10, 0.25, halves,
            function (e) { upd({ halves: parseFloat(e.target.value) }); }, nkFmt(halves, 2)),
          h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
            stat('Still radioactive', nkFmt(remaining * 100, 2) + '%', ink('#a78bfa')),
            stat('Time passed', nkYears(elapsedYears), ink('#c4b5fd')),
            stat('Half-life', iso.hlText, ink('#fbbf24'))
          ),
          h('p', { id: 'nk-decay-description', className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            h('b', null, iso.name + ' (' + iso.decay + '): '), iso.use),
          h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: ink('#a78bfa') } },
            halves >= 7
              ? '🤔 After ' + nkFmt(halves, 0) + ' half-lives less than 1% is left — but never exactly zero. Why can this curve never actually reach the axis?'
              : '🤔 Drag to 7 half-lives. What fraction is left, and why is "ten half-lives and it is gone" only roughly true?')
        ),

        // ── 2. carbon dating ──
        sec('dating', '#22d3ee',
          heading(ink('#22d3ee'), '🦴 2. Read a date out of the decay'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Living things take in carbon-14 while alive and stop at death. Measure how much is left and you can run the half-life backwards to a date.'),
          slider('nk-c14', 'C-14 remaining', 1, 100, 1, c14Frac,
            function (e) { upd({ c14Frac: parseFloat(e.target.value) }); setAgeShown(false); }, c14Frac + '%'),
          h('div', { className: 'flex flex-wrap items-end gap-2 mt-2' },
            h('div', { className: 'flex-1 min-w-[150px]' },
              h('label', { htmlFor: 'nk-age-guess', className: 'block text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Your estimate (years)'),
              h('input', { id: 'nk-age-guess', type: 'number', value: ageGuess, placeholder: 'e.g. 5730',
                onChange: function (e) { setAgeGuess(e.target.value); },
                className: 'w-full min-h-11 px-3 py-2 rounded-lg text-[11px]',
                style: { border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.32)' : 'rgba(100,116,139,0.3)'), background: isDark ? 'rgba(15,23,42,0.8)' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' } })),
            h('button', { type: 'button', 'aria-label': 'Reveal the calculated age of the sample',
              onClick: function () {
                setAgeShown(true);
                upd({ datedOnce: true });
                var g = parseFloat(ageGuess);
                if (!isNaN(g) && Math.abs(g - c14Age) / c14Age < 0.15) {
                  if (typeof celebrate === 'function') celebrate();
                  if (typeof awardXP === 'function') awardXP('nuclear_dating', 10, 'Dated a sample from its carbon-14');
                }
                if (typeof announceToSR === 'function') announceToSR('The sample is about ' + nkFmt(c14Age, 0) + ' years old.');
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[11px] font-black text-white',
              style: { background: '#0e7490', border: '1px solid #0e7490' } }, ageShown ? 'Recalculate' : 'Reveal')
          ),
          ageShown ? h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(236,254,255,0.9)' } },
            h('p', { className: 'text-sm font-black', style: { color: ink('#0891b2') } }, 'About ' + nkFmt(c14Age, 0) + ' years old'),
            h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'age = 5730 × ln(100 / ' + c14Frac + ') / ln 2'),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              c14Frac <= 2
                ? 'Below about 1–2% remaining the measurement gets unreliable, which is why radiocarbon runs out at roughly 50,000 years. Older samples need a different clock — uranium-238 for rocks, potassium-argon for volcanic ash.'
                : 'Real dating also corrects for the fact that atmospheric carbon-14 has varied over time. Calibration curves built from tree rings and corals handle that, which is why published dates say "cal BP".')
          ) : null
        ),


        // ── decay chain ──
        sec('chain', '#c084fc',
          heading(ink('#c084fc'), '⛓️ 3. The chain from uranium to lead — and why radon is in basements'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Most heavy nuclei do not reach stability in one step. Uranium-238 takes fourteen, alternating alpha and beta, and finishes as lead. One member of that chain is a gas, and that changes everything.'),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(192,132,252,0.35)', height: '230px' } },
            h('canvas', { ref: chainRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-chain-description',
              'aria-label': 'The uranium-238 chain plotted on the chart of nuclides, neutrons across and protons up. It starts at uranium-238 with 92 protons and 146 neutrons, top right, and walks down-left to lead-206 with 82 protons and 124 neutrons, bottom left. Each of the eight alpha steps moves two protons down and two neutrons left; each of the six beta steps moves one proton up and one neutron left, which is the zigzag. Radon-222, the only gas, sits in the middle at 86 protons and 136 neutrons.',
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-chain-description', className: 'text-[11px] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Every alpha step takes the same diagonal down-left; every beta step kicks back up-left at a shallower one. That sawtooth is not decoration — it is why the chain crosses the same elements more than once, and why uranium appears twice in the list below. Tap a row to light up its nucleus here.'),
          h('div', { role: 'list', className: 'space-y-1 max-h-72 overflow-y-auto pr-1' },
            U238_CHAIN.map(function (step, i) {
              var on = d.chainPick === i;
              var col = step.kind === 'alpha' ? '#f87171' : (step.kind === 'beta' ? '#60a5fa' : '#94a3b8');
              if (step.gas) col = '#fbbf24';
              // role="listitem" belongs on a wrapper, NOT on the button. Put it
              // on the button and it REPLACES the button role: the control stops
              // announcing as a button and aria-pressed becomes invalid on it,
              // which axe rates critical. The list semantics are worth keeping —
              // "list, 15 items" tells you the chain has an end — so wrap.
              return h('div', { key: step.sym, role: 'listitem' }, h('button', {
                type: 'button',
                'aria-expanded': on ? 'true' : 'false',
                'aria-label': step.sym + ', half-life ' + step.hl + ', ' + (step.kind === 'stable' ? 'stable, the end of the chain' : step.kind + ' decay') + (step.gas ? '. This one is a gas.' : ''),
                onClick: function () {
                  upd({ chainPick: on ? null : i });
                  if (!on) pushOnce('chainSeen', step.sym);
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors',
                style: on ? { background: col + '22', borderColor: col }
                  : { background: step.gas ? 'rgba(251,191,36,0.09)' : (isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)'),
                      borderColor: step.gas ? 'rgba(251,191,36,0.5)' : (isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)') }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[10px] font-mono w-5 flex-shrink-0', style: { color: isDark ? '#94a3b8' : '#475569' } }, (i + 1)),
                  h('span', { className: 'text-[11px] font-black w-16 flex-shrink-0', style: { color: ink(col) } }, step.sym),
                  h('span', { className: 'text-[11px] font-mono flex-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, step.hl),
                  step.gas ? h('span', { className: 'text-[10px] font-black px-1.5 py-0.5 rounded-full', style: { color: ink('#fbbf24'), border: '1px solid rgba(251,191,36,0.6)' } }, 'GAS') : null,
                  h('span', { className: 'text-[11px] font-bold', style: { color: ink(col) } }, step.kind === 'stable' ? '■' : (step.kind === 'alpha' ? 'α' : 'β'))),
                null),
                on ? h('div', { className: 'px-2.5 pb-1.5 text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, step.note) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#f59e0b') } }, 'Why the whole chain runs at uranium-238\'s pace'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Every step below the parent is far faster than it, so each daughter decays about as fast as it is made. The chain settles into secular equilibrium and the whole thing ticks along at the rate of the slowest step — 4.47 billion years. That is why radon keeps appearing in a basement year after year and never runs out: it is being made continuously from uranium in the ground beneath, and the supply lasts as long as the planet does.')
          ),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: ink('#c084fc') } },
            '🤔 Radon has a half-life of under four days. Sealing a basement for a fortnight would clear what is already there. Why does that not fix the problem?')
        ),

        // ── enrichment ──
        sec('enrichment', '#fb923c',
          heading(ink('#fb923c'), '🔢 4. Enrichment: why reactor fuel is not a bomb'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Natural uranium is 99.3% U-238 and only 0.72% the fissile U-235. Separating them is the hardest industrial step in the whole business — and the reason a power reactor is not a weapon waiting to happen.'),
          h('div', { role: 'list', className: 'space-y-1' },
            ENRICH_LEVELS.map(function (lv, i) {
              var on = d.enrPick === i;
              var col = lv.pct >= 90 ? '#f87171' : (lv.pct >= 20 ? '#fb923c' : '#34d399');
              return h('div', { key: lv.name, role: 'listitem' }, h('button', {
                type: 'button',
                'aria-expanded': on ? 'true' : 'false',
                'aria-label': lv.name + ', ' + lv.pct + ' percent uranium-235',
                onClick: function () {
                  upd({ enrPick: on ? null : i });
                  if (!on) pushOnce('enrSeen', lv.name);
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors',
                style: on ? { background: col + '22', borderColor: col }
                  : { background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[11px] font-black w-14 flex-shrink-0', style: { color: ink(col) } }, lv.pct + '%'),
                  h('span', { className: 'text-[11px] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, lv.name)),
                h('span', { className: 'block h-1.5 rounded-full mt-1', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-1.5 rounded-full', style: { width: Math.max(1, lv.pct) + '%', background: col } })),
                null),
                on ? h('div', { className: 'px-2.5 pb-1.5 text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, lv.use) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(52,211,153,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,244,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#059669') } }, 'The answer to "could a reactor explode like a bomb?"'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'No, and not because of the safety systems. A weapon needs a fast chain reaction in material enriched above about 90%, held together for the microseconds it takes to run. Reactor fuel at 3–5% cannot sustain a fast chain reaction at ANY mass or shape: the U-238 that makes up the other 95% absorbs the fast neutrons before they find a U-235 nucleus. The fuel only works at all because a moderator slows the neutrons down first — and moderated neutrons are far too slow for the runaway a weapon needs. Chernobyl was a steam explosion that wrecked the building, not a nuclear detonation.')
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'This is also why enrichment is what arms-control regimes actually watch. The centrifuge cascade that takes uranium from 0.72% to 5% is most of the way, in separative work, to one that could reach 90% — so the equipment matters more than the material.')
        ),

        // ── 3. shielding ──
        sec('shielding', '#f87171',
          heading(ink('#f87171'), '🛡️ 5. What actually stops it'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            '"Radiation" is four different things that behave nothing alike. Pick one and try to stop it.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            RAD_TYPES.map(function (x) {
              return pill(radId === x.id, x.colour, x.symbol + ' ' + x.name, function () {
                upd({ radId: x.id });
                pushOnce('radTried', x.id);
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR(x.name + '. ' + x.what + ' Stopped by ' + x.stops);
              }, 'Study ' + x.name + ' radiation');
            })
          ),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            SHIELDS.map(function (s) {
              return pill(shieldId === s.id, '#94a3b8', s.name, function () {
                upd({ shieldId: s.id });
                if (typeof beep === 'function') beep();
              }, 'Shield with ' + s.name);
            })
          ),
          slider('nk-thick', 'Thickness', 0.1, 30, 0.1, thick,
            function (e) { upd({ thick: parseFloat(e.target.value) }); }, nkFmt(thick, 1) + ' cm'),
          (function () {
            var through, verdict;
            if (radId === 'alpha') {
              through = alphaStopped ? 0 : 100;
              verdict = shieldId === 'air'
                ? (alphaStopped
                  ? 'Stopped after travelling through several centimetres of air. The exact range depends on alpha energy and air density.'
                  : 'Still travelling through the air. Typical alpha particles need a few centimetres of air, not a fraction of a centimetre, before they stop.')
                : 'Stopped by the solid material. Intact skin also blocks most alpha radiation, but the eye and an open wound do not have the same dead protective layer; inhaled or swallowed contamination is the main hazard.';
            } else if (radId === 'beta') {
              through = betaStopped ? 0 : 100;
              verdict = betaStopped
                ? 'Stopped. A few millimetres of solid material absorbs beta entirely. Note that lead is the WRONG choice here: stopping fast electrons in a heavy element makes penetrating X-rays. Use plastic.'
                : 'Still getting through. Beta needs a few millimetres of solid; air barely slows it.';
            } else if (radId === 'neutron') {
              through = neutronThrough;
              verdict = (shieldId === 'water' || shieldId === 'concrete')
                ? 'Working. Neutrons are slowed by bouncing off nuclei of similar mass, so hydrogen-rich materials win. Water and concrete are excellent.'
                : 'Barely touched. Lead is nearly useless against neutrons — a heavy nucleus barely recoils, so the neutron keeps its energy. Counter-intuitive, and it catches people out.';
            } else {
              through = gammaThrough;
              verdict = gammaThrough < 1
                ? 'Down to under 1%, but never to zero. Gamma attenuates exponentially — every extra centimetre cuts it by the same FACTOR, so you can always halve it again and never quite eliminate it.'
                : (gammaThrough < 25
                  ? 'Substantially attenuated. The "half-value layer" for this material is ' + nkFmt(Math.LN2 / shield.mu, 2) + ' cm — every one of those halves the intensity again.'
                  : 'Most of it is still coming through. Gamma needs real thickness of a dense material.');
            }
            return h('div', { className: 'mt-2' },
              h('div', { className: 'h-4 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                h('div', { style: { height: '100%', width: nkClamp(through, 0, 100).toFixed(1) + '%', background: rad.colour, borderRadius: '999px', transition: 'width 160ms linear' } })),
              h('p', { className: 'text-[11px] font-black mt-1', style: { color: ink(rad.colour) } },
                nkFmt(through, through < 1 ? 3 : 1) + '% of the ' + rad.name.toLowerCase() + ' gets through ' + nkFmt(thick, 1) + ' cm of ' + shield.name.toLowerCase()),
              h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, verdict));
          })(),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: rad.colour + '60', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink(rad.colour) } }, rad.symbol + '  ' + rad.name),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, rad.what),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, h('b', null, 'Stopped by: '), rad.stops),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#fca5a5' : '#b91c1c' } }, h('b', null, 'Why it matters: '), rad.danger)),
          h('p', { className: 'text-[11px] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' } }, shield.note)
        ),

        // ── 4. chain reaction ──
        sec('criticality', '#34d399',
          heading(ink('#34d399'), '⚛️ 6. The chain reaction, and what holds it steady'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A uranium-235 nucleus absorbs a neutron, splits, and releases 2 or 3 more. k is how many of those go on to cause another fission. Everything about reactor control is holding k at exactly 1.'),
          slider('nk-rods', 'Control rods in', 0, 100, 1, rods,
            function (e) { upd({ rods: parseFloat(e.target.value) }); }, rods + '%'),
          h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
            stat('k (neutron multiplication)', kEff.toFixed(3), ink(kState === 'critical' ? '#34d399' : (kState === 'supercritical' ? '#f87171' : '#60a5fa'))),
            stat('State', kState, ink(kState === 'critical' ? '#34d399' : (kState === 'supercritical' ? '#f87171' : '#60a5fa'))),
            stat('After 12 generations', nkFmt(gens[11], 0) + ' neutrons', ink('#fbbf24'))
          ),
          h('div', { className: 'flex items-end gap-0.5 mt-2', style: { height: '54px' }, 'aria-hidden': 'true' },
            gens.map(function (v, i) {
              var frac = nkClamp(Math.log10(Math.max(1, v)) / 4, 0.02, 1);
              return h('div', { key: i, style: { flex: 1, height: (frac * 100) + '%', background: kState === 'supercritical' ? '#f87171' : (kState === 'critical' ? '#34d399' : '#60a5fa'), borderRadius: '2px 2px 0 0' } });
            })
          ),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Neutrons per generation, on a log scale. Twelve generations is under a thousandth of a second.'),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            kState === 'critical'
              ? '✅ Critical: k = 1. Every fission causes exactly one more, and power holds steady. This is the normal operating state of every reactor on earth — not a warning word, despite what films suggest.'
              : (kState === 'supercritical'
                ? 'Supercritical: k > 1. Power climbs generation after generation. Reactors do this deliberately and briefly when raising power, then settle back to k = 1. What makes it controllable is that about 0.65% of neutrons arrive SECONDS late, from decaying fission products — without those delayed neutrons no mechanical control could ever keep up.'
                : 'Subcritical: k < 1. The chain dies out. This is a shut-down reactor — though it still needs cooling, because decay heat continues for days. That is precisely what went wrong at Fukushima: the reactors shut down correctly and then could not be cooled.')),
          h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: ink('#34d399') } },
            '🤔 A bomb needs k far above 1 with fast neutrons and over 90% enrichment. Reactor fuel is 3–5%. Why can a power reactor not explode like a weapon, whatever else goes wrong?')
        ),


        // ── binding energy: the one curve behind both ──
        sec('binding', '#38bdf8',
          heading(ink('#38bdf8'), '⛰️ 7. One curve explains fission AND fusion'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Binding energy per nucleon is how tightly each particle is held. The curve climbs steeply from hydrogen, peaks, then falls slowly — and HIGHER on this curve means more tightly bound. Move toward the peak from either side and the nuclei end up more tightly bound than they started, so the leftover energy comes out. Light nuclei get there by joining; heavy ones get there by splitting. One curve, two industries.'),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(56,189,248,0.35)', height: '190px' } },
            h('canvas', { ref: beRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-binding-description',
              'aria-label': 'Binding energy per nucleon against mass number. It climbs steeply from hydrogen at zero, through helium-4 at 7.07, peaks at nickel-62 at 8.795 MeV, then falls slowly to uranium-238 at 7.57. Light nuclei release energy by fusing up the left slope; heavy nuclei release it by splitting down the right slope.',
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-binding-description', className: 'text-[10px] mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Mass number across, MeV per nucleon up. The marked peak is where nothing can release energy by changing at all.'),

          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            REACTIONS.map(function (r) {
              var col = r.kind === 'fusion' ? '#f472b6' : (r.kind === 'fission' ? '#a78bfa' : '#94a3b8');
              return pill(bePick === r.id, col, r.name, function () {
                upd({ bePick: r.id });
                pushOnce('reactionsSeen', r.id);
                if (typeof beep === 'function') beep();
              }, 'Work out the energy from ' + r.name);
            })
          ),
          h('div', { className: 'rounded-lg border p-2.5', style: { borderColor: (beRxn.kind === 'fusion' ? '#f472b6' : beRxn.kind === 'fission' ? '#a78bfa' : '#94a3b8') + '70', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
            h('p', { className: 'text-[11px] font-mono mb-1.5', style: { color: isDark ? '#e2e8f0' : '#334155' } }, beRxn.eq),
            h('div', { className: 'grid grid-cols-3 gap-2' },
              stat('Energy released', nkFmt(beRxn.mev, beRxn.mev < 1 ? 6 : 1) + ' MeV', ink('#fbbf24')),
              stat('Per nucleon', nkFmt(beMevPerNucleon, beMevPerNucleon < 0.001 ? 7 : 2) + ' MeV', ink('#38bdf8')),
              stat('Mass converted', nkFmt(beMassPct, beMassPct < 0.001 ? 7 : 3) + '%', ink('#f472b6'))
            ),
            h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, beRxn.note),
            h('p', { className: 'text-[11px] mt-1.5 font-mono', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'E = Δm c², and 1 atomic mass unit = 931.494 MeV. The mass really is missing — weigh the products and they come out lighter than what went in.')
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Fusion of deuterium and tritium releases about 3.5 MeV per nucleon; fission of uranium-235 about 0.85. Fusion wins per nucleon by roughly four to one — which is why it is worth the hundred-million-degree problem.'),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#f59e0b') } }, 'A detail almost every textbook gets slightly wrong'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'The peak is usually given as iron-56. The actual maximum is nickel-62 at ' + bePeak.be.toFixed(3) + ' MeV per nucleon, just above iron-58 and then iron-56 at 8.790. Iron-56 is the most ABUNDANT end point, because stellar burning makes nickel-56 which decays to it — that is a statement about supernovae, not about binding. Both facts are true; they are answers to different questions.')
          ),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: ink('#38bdf8') } },
            '🤔 Nothing past the peak can release energy by fusing, and nothing before it by splitting. What does that mean for a star once its core is iron and nickel?')
        ),

        // ── personal dose ──
        // ── what a sievert actually is ──
        sec('weighting', '#e879f9',
          heading(ink('#e879f9'), '🎚️ 8. Gray and sievert: the same joule, weighted twice'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everything below this point is quoted in millisieverts, and a sievert is not a physical measurement. It is a physical measurement multiplied by two judgements about biology. Both multiplications are worth seeing, because alpha has little penetrating power through intact skin but is far more damaging when contamination reaches living tissue.'),

          slider('nk-absorbed', 'Energy absorbed', 0.1, 20, 0.1, absorbedMGy,
            function (e) { upd({ absorbedMGy: parseFloat(e.target.value) }); }, nkFmt(absorbedMGy, 1) + ' mGy'),
          h('p', { className: 'text-[10px] mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'The gray is joules per kilogram of tissue, and nothing else. It does not know what kind of radiation delivered them or which organ received them. It is the one honestly physical quantity here.'),

          h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Delivered by'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            RAD_WEIGHTS.map(function (x) {
              return pill(wrId === x.id, x.colour, x.symbol + ' ' + x.name + '  ×' + x.wr, function () {
                upd({ wrId: x.id });
                pushOnce('wrTried', x.id);
                if (typeof beep === 'function') beep();
              }, x.name + ', radiation weighting factor ' + x.wr);
            })
          ),
          h('p', { className: 'text-[11px] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, wr.why),

          h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'To which tissue'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            [{ id: 'whole', name: 'Whole body', wt: 1 }].concat(TISSUE_WEIGHTS).map(function (x) {
              return pill(wtId === x.id, '#e879f9', x.name + '  ' + x.wt.toFixed(2), function () {
                upd({ wtId: x.id, doseWeighted: true });
                if (typeof beep === 'function') beep();
              }, x.name + ', tissue weighting factor ' + x.wt);
            })
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
            h('div', { className: 'rounded-lg border p-2', style: { borderColor: 'rgba(148,163,184,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'ABSORBED DOSE'),
              h('p', { className: 'text-sm font-black', style: { color: isDark ? '#e2e8f0' : '#334155' } }, nkFmt(absorbedMGy, 1) + ' mGy'),
              h('p', { className: 'text-[10px] mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'Pure physics: joules per kilogram.')),
            h('div', { className: 'rounded-lg border p-2', style: { borderColor: wr.colour + '80', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'EQUIVALENT DOSE'),
              h('p', { className: 'text-sm font-black', style: { color: ink(wr.colour) } }, nkFmt(equivalentMSv, 1) + ' mSv'),
              h('p', { className: 'text-[10px] mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } }, '× w' + 'ᴿ' + ' = ' + wr.wr + ', for how concentrated the damage is.')),
            h('div', { className: 'rounded-lg border p-2', style: { borderColor: 'rgba(232,121,249,0.6)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(253,244,255,0.9)' } },
              h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'EFFECTIVE DOSE'),
              h('p', { className: 'text-sm font-black', style: { color: ink('#c026d3') } }, nkFmt(effectiveMSv, 2) + ' mSv'),
              h('p', { className: 'text-[10px] mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } }, '× w' + 'ᵀ' + ' = ' + wtFactor.toFixed(2) + ', for how much that tissue contributes to whole-body risk.'))
          ),

          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            wr.wr === 1
              ? 'With gamma or beta the first multiplication does nothing — 1 mGy is 1 mSv, and this is why the two units get used interchangeably and then quietly confused. Switch to alpha and watch what the same joule becomes.'
              : 'The same ' + nkFmt(absorbedMGy, 1) + ' mGy — the same energy, the same joules per kilogram — is now ' + nkFmt(equivalentMSv, 1) + ' mSv, because ' + wr.name.toLowerCase() + ' spends it in a much shorter track. Nothing about the amount of energy changed. Only what it did on the way in.'),
          h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            wtId === 'whole'
              ? 'Irradiate the whole body and every tissue weight applies at once. They are defined to sum to exactly ' + wtSum.toFixed(2) + ', so effective dose and equivalent dose come out equal — the weights apportion risk, they never create or destroy it.'
              : 'Irradiating only the ' + (wt ? wt.name.toLowerCase() : '') + ' carries ' + (wtFactor * 100).toFixed(0) + '% of the whole-body detriment, so the effective dose is ' + (wtFactor * 100).toFixed(0) + '% of the equivalent dose. That is what makes a chest X-ray and a whole-body exposure comparable at all: effective dose is a common currency, deliberately constructed.'),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,146,60,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,247,237,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#ea580c') } }, 'What effective dose is NOT'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'ICRP says this plainly and it is routinely ignored: effective dose is a protection quantity for setting limits and comparing procedures across a population. It is not a measure of harm to a particular person. The weights are averaged over both sexes and all ages, so applying them to one patient — to say "your scan gave you this much risk" — uses the number for something it was never built to do. Every figure in this tool is an effective dose, and that caveat rides along with all of them.')
          ),
          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Weighting factors from ICRP Publication 103 (2007), Tables 2 and 3. The neutron factor is shown as its ~1 MeV peak; the published value is a continuous function of energy from about 2.5 to 20.')
        ),

        // ── the clock that actually runs inside a person ──
        sec('biohalf', '#f472b6',
          heading(ink('#f472b6'), '🫀 9. Half-life inside a body is a different number'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every half-life so far has been PHYSICAL — how fast the nuclei fall apart, which nothing can change. But a nuclide inside a person is also being excreted, and the two processes run at once. Decay and excretion are rates, so they add: 1/T' + 'ₑ' + ' = 1/T' + 'ₚ' + ' + 1/T' + 'ᵦ' + '. The shorter clock wins.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            BIO_NUCLIDES.map(function (x) {
              return pill(bioId === x.id, x.colour, x.name, function () {
                upd({ bioId: x.id });
                pushOnce('bioSeen', x.id);
                if (typeof beep === 'function') beep();
              }, 'Compare the physical and biological half-life of ' + x.name);
            })
          ),
          h('div', { className: 'grid grid-cols-3 gap-2' },
            stat('Physical half-life', nkYears(bio.tp / 365.25), ink('#94a3b8')),
            stat('Biological half-life', nkYears(bio.tb / 365.25), ink('#38bdf8')),
            stat('Effective half-life', nkYears(bioEff / 365.25), ink(bio.colour))
          ),
          h('p', { className: 'text-[11px] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Where it goes: ' + bio.where + '.'),
          h('div', { className: 'rounded-lg overflow-hidden border mt-2', style: { borderColor: bio.colour + '59', height: '175px' } },
            h('canvas', { ref: bioRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-bio-description',
              'aria-label': 'How much ' + bio.name + ' is left in the body over time. Radioactive decay alone would leave ' +
                nkFmt(Math.pow(0.5, bioSpanDays / bio.tp) * 100, 1) + ' percent after ' + nkYears(bioSpanDays / 365.25) +
                ', but with excretion as well only ' + nkFmt(Math.pow(0.5, bioSpanDays / bioEff) * 100, 1) +
                ' percent remains. The effective half-life is ' + nkYears(bioEff / 365.25) + '.',
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-bio-description', className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Grey: decay alone. Colour: what is actually left, once the body is also getting rid of it.'),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: ink(bio.colour) } },
            bioDriver === 'biology'
              ? 'Biology is running this one. The physical half-life is ' + nkFmt(bioRatio, bioRatio > 100 ? 0 : 1) + ' times the biological one, so decay barely enters the calculation and the effective half-life lands within ' + nkFmt(Math.max(bioGapPct, 0.1), 1) + '% of the biological figure alone.'
              : (bioDriver === 'physics'
                ? 'Physics is running this one. The body cannot clear it much faster than it decays, so decay sets the pace and the effective half-life comes out ' + nkFmt(bioGapPct, 0) + '% below the physical half-life.'
                : 'Neither clock is running this one. The two half-lives are within a factor of ' + nkFmt(bioRatio, 1) + ' of each other, so decay and excretion contribute comparably and the effective half-life falls ' + nkFmt(bioGapPct, 0) + '% below even the shorter of them. Quote either number on its own here and you are wrong — this is the case that makes the formula necessary rather than decorative.')),
          h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, bio.note),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(56,189,248,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,249,255,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#0284c7') } }, 'What potassium iodide tablets do, and what they do not'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'KI is one of the most misunderstood things in this entire subject. It is not an anti-radiation pill. It works on exactly one nuclide by exactly one mechanism: it saturates the thyroid with ordinary iodine so there is no room left to take up iodine-131. That is the whole of it. It does nothing about caesium, nothing about external gamma, nothing about any other part of a release — and taken without radioiodine present it is simply a drug with side effects, which is why authorities distribute it in advance and then tell people when to take it rather than leaving it to judgement.'),
            safetyNotice('ki')
          ),
          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Biological half-lives from the ICRP 30 and ICRP 137 biokinetic models, rounded. Unlike physical half-lives, which are constants of nature, these vary substantially with age, diet, chemical form and the individual — caesium clears roughly twice as fast in a small child as in an adult. Treat them as the right order of magnitude, not as measurements of you.')
        ),

        sec('mydose', '#22d3ee',
          heading(ink('#22d3ee'), '🧮 10. Estimate your own annual dose'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everyone is exposed, all the time, mostly from the ground and from radon. Put your own numbers in and see where yours comes from.'),
          safetyNotice('dose'),
          slider('ds-alt', 'Home altitude', 0, 3000, 50, dsAlt,
            function (e) { upd({ dsAlt: parseFloat(e.target.value), doseEstimated: true }); }, nkFmt(dsAlt, 0) + ' m'),
          slider('ds-fly', 'Flying per year', 0, 200, 2, dsFlights,
            function (e) { upd({ dsFlights: parseFloat(e.target.value), doseEstimated: true }); }, nkFmt(dsFlights, 0) + ' hours'),
          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Radon at home'),
          h('div', { className: 'flex flex-wrap gap-1' },
            RADON_LEVELS.map(function (r) {
              return pill(dsRadon === r.id, '#f87171', r.name, function () {
                upd({ dsRadon: r.id, doseEstimated: true });
                if (typeof beep === 'function') beep();
              }, 'Set home radon to ' + r.name + ', ' + r.v + ' millisieverts a year');
            })
          ),
          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Scans this year'),
          h('div', { className: 'space-y-1' },
            SCAN_TYPES.map(function (sc) {
              var n = dsScans[sc.id] || 0;
              return h('div', { key: sc.id, className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, sc.name),
                h('span', { className: 'text-[11px] font-mono w-16 text-right', style: { color: isDark ? '#94a3b8' : '#475569' } }, sc.v + ' mSv'),
                h('button', { type: 'button', 'aria-label': 'One fewer ' + sc.name,
                  onClick: function () { var nx = Object.assign({}, dsScans); nx[sc.id] = Math.max(0, n - 1); upd({ dsScans: nx, doseEstimated: true }); },
                  className: 'min-h-11 w-11 rounded-lg text-[11px] font-black',
                  style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '−'),
                h('span', { className: 'text-[11px] font-black w-6 text-center', style: { color: ink('#22d3ee') } }, n),
                h('button', { type: 'button', 'aria-label': 'One more ' + sc.name,
                  onClick: function () { var nx = Object.assign({}, dsScans); nx[sc.id] = n + 1; upd({ dsScans: nx, doseEstimated: true }); },
                  className: 'min-h-11 w-11 rounded-lg text-[11px] font-black',
                  style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '+'));
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(236,254,255,0.9)' } },
            h('p', { className: 'text-sm font-black mb-1.5', style: { color: ink('#0891b2') } }, 'About ' + nkFmt(dsTotal, 2) + ' mSv this year'),
            h('div', { role: 'list', className: 'space-y-1' },
              dsParts.filter(function (p) { return p.v > 0; }).sort(function (x, y) { return y.v - x.v; }).map(function (p) {
                return h('div', { key: p.name, role: 'listitem', 'aria-label': p.name + ', ' + p.v.toFixed(2) + ' millisieverts', className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[11px] w-32 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, p.name),
                  h('div', { className: 'flex-1 h-2.5 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                    h('div', { style: { height: '100%', width: Math.max(1, (p.v / Math.max(dsTotal, 0.01)) * 100) + '%', background: p.colour, borderRadius: '999px' } })),
                  h('span', { className: 'text-[11px] font-mono w-14 text-right', style: { color: ink(p.colour) } }, p.v.toFixed(2)));
              })
            ),
            h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              dsTotal > 6
                ? 'That is well above the 2.4 mSv world average — look at which bar is longest. If it is radon, that is the one worth acting on, and a test kit costs very little.'
                : (dsTotal > 3.5
                  ? 'Somewhat above the 2.4 mSv world average, which is unremarkable. Radon is usually the largest single term and the only one most people can change.'
                  : 'Close to or below the 2.4 mSv world average. Note how little of it is anything anyone chose.')),
            h('p', { className: 'text-[11px] mt-1.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'For scale, the occupational limit is 20 mSv a year and the lowest dose with a clearly measurable cancer link is around 100 mSv.')
          )
        ),

        // ── 5. dose ──
        sec('doseladder', '#fbbf24',
          heading(ink('#fbbf24'), '📏 11. How much is a lot? The dose ladder'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Doses span eight orders of magnitude, so this scale is logarithmic — each step along it is ten times the last. Tap any row.'),
          h('div', { role: 'list', className: 'space-y-1' },
            DOSES.map(function (dz, i) {
              var on = d.dosePick === i;
              var frac = nkLogFrac(dz.mSv, 0.0001, 16000);
              var col = dz.mSv >= 1000 ? '#f87171' : (dz.mSv >= 20 ? '#fb923c' : (dz.mSv >= 1 ? '#fbbf24' : '#34d399'));
              return h('div', { key: dz.name, role: 'listitem' }, h('button', {
                type: 'button',
                'aria-expanded': on ? 'true' : 'false',
                'aria-label': dz.name + ', ' + dz.mSv + ' millisieverts',
                onClick: function () {
                  upd({ dosePick: on ? null : i });
                  if (!on) pushOnce('dosesSeen', dz.name);
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors',
                style: on ? { background: col + '22', borderColor: col }
                  : { background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[11px] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, dz.name),
                  h('span', { className: 'text-[11px] font-mono', style: { color: ink(col) } }, dz.mSv < 1 ? dz.mSv + ' mSv' : nkFmt(dz.mSv, 0) + ' mSv')),
                h('span', { className: 'block h-1.5 rounded-full mt-1', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-1.5 rounded-full', style: { width: Math.max(1.5, frac * 100) + '%', background: col } })),
                null),
                on ? h('div', { className: 'px-2.5 pb-1.5 text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, dz.note) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#f59e0b') } }, 'Where the science is genuinely unsettled'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'At and above about 100 mSv, excess cancer risk is measurable in survivor studies. Below that, epidemiological studies have limited statistical power because ordinary cancer is common and the possible addition is small. Regulators use the linear no-threshold model as a cautious protection assumption. Evidence at low dose remains uncertain rather than proving either zero risk or a measured effect; be wary of claims that treat either conclusion as settled.')
          )
        ),

        // ── counting: where every number above actually comes from ──
        sec('detect', '#2dd4bf',
          heading(ink('#2dd4bf'), '🔬 12. Measure it yourself — and why one short count lies'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every figure above came out of a detector, and a detector does not measure sieverts. It measures clicks — and radioactive decay is random, so the same source counted twice gives two different answers. Neither is wrong. Take some counts and watch it happen.'),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2' },
            [{ u: 'Becquerel (Bq)', w: 'What the SOURCE does', p: 'One decay per second, inside the source. It does not depend on you, your detector, or where you stand.', c: '#a78bfa' },
             { u: 'Counts per second', w: 'What the DETECTOR sees', p: 'Always far less. Most photons miss the window entirely, and the tube ignores most of the ones that arrive. Never quote a count rate without saying which instrument, at what distance.', c: '#2dd4bf' },
             { u: 'Millisievert (mSv)', w: 'What YOUR BODY absorbs', p: 'Energy deposited per kilogram of tissue, weighted for how much damage that kind of radiation does. Getting here from counts needs a calibrated instrument and the photon energy.', c: '#fbbf24' }
            ].map(function (x) {
              return h('div', { key: x.u, className: 'rounded-lg border p-2', style: { borderColor: x.c + '55', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
                h('p', { className: 'text-[11px] font-black', style: { color: ink(x.c) } }, x.u),
                h('p', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, x.w),
                h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, x.p));
            })
          ),

          h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Put something in front of the tube'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            COUNT_SOURCES.map(function (s) {
              return pill(cdSrcId === s.id, '#2dd4bf', s.name, function () {
                cdReset({ cdSrc: s.id });
              }, 'Measure ' + s.name + '. ' + s.desc);
            })
          ),
          h('p', { className: 'text-[11px] mb-1 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            cdSrc.bq > 0 ? cdSrc.desc + ' — ' + nkFmt(cdSrc.bq, 0) + ' Bq, giving off about ' + nkFmt(cdSrc.gps, 0) + ' gammas a second in all directions.' : cdSrc.desc),

          slider('nk-cd-dist', 'Distance', 3, 60, 1, cdDist,
            function (e) { cdReset({ cdDist: parseFloat(e.target.value) }); }, nkFmt(cdDist, 0) + ' cm'),
          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Count for'),
          h('div', { className: 'flex flex-wrap gap-1' },
            COUNT_TIMES.map(function (tt) {
              return pill(cdTime === tt, '#2dd4bf', tt < 60 ? tt + ' s' : (tt / 60) + ' min', function () {
                cdReset({ cdTime: tt });
              }, 'Count for ' + tt + ' seconds');
            })
          ),
          h('div', { className: 'flex flex-wrap gap-2 mt-2' },
            h('button', {
              type: 'button', onClick: cdTakeCount,
              'aria-label': 'Take a ' + cdTime + ' second count of ' + cdSrc.name + ' at ' + cdDist + ' centimetres, with a matching background count',
              className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-black',
              style: { background: '#2dd4bf', color: '#0b1020', border: '1px solid #2dd4bf' }
            }, '⏱️ Take a count'),
            cdRuns.length ? h('button', {
              type: 'button', onClick: function () { cdReset({}); },
              'aria-label': 'Clear the ' + cdRuns.length + ' counts taken so far',
              className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold',
              style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
            }, 'Clear') : null
          ),

          cdLast ? h('div', { className: 'mt-2' },
            h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
              stat('With the source', nkFmt(cdLast.g, 0) + ' counts', ink('#2dd4bf')),
              stat('Background alone', nkFmt(cdLast.b, 0) + ' counts', ink('#94a3b8')),
              stat('Net rate', cdNet.toFixed(cdNet < 1 ? 3 : 2) + ' /s', ink(cdDetected ? '#fbbf24' : '#f87171')),
              stat('Uncertainty', '± ' + cdSigma.toFixed(cdSigma < 1 ? 3 : 2) + ' /s', ink('#a78bfa'))
            ),
            h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              cdSrcId === 'none'
                ? 'Two background counts, one subtracted from the other. The net should be zero and it is not — it lands either side of zero, and a NEGATIVE net is not an error. It is what "measurement noise" means, and it is the floor beneath every other reading you take here.'
                : (!cdDetected
                  ? 'You cannot claim a detection. The net is ' + nkFmt(cdLast.g - cdLast.b, 0) + ' counts, and against this much background the threshold for calling it real is about ' + nkFmt(cdCrit, 0) + '. Count for longer or move closer — background grows in proportion to time, but its NOISE only grows as the square root of time, so the signal wins if you wait.'
                  : (cdRel > 0.10
                    ? 'Detected — but loosely. ±' + nkFmt(cdRel * 100, 0) + '% on the net rate. You could honestly say the source is there; you could not honestly compare it with another reading this close. A four-times-longer count halves this.'
                    : 'Detected and pinned down: ±' + nkFmt(cdRel * 100, 1) + '%. This is a number you could put in a lab report and defend.'))),
            h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'The whole of counting statistics is one rule: a count of N carries an uncertainty of √N. Your ' + nkFmt(cdLast.g, 0) + ' counts are ' + nkFmt(cdLast.g, 0) + ' ± ' + nkFmt(Math.sqrt(cdLast.g), 1) + ', which is ±' + nkFmt(100 / Math.sqrt(Math.max(cdLast.g, 1)), 1) + '% on their own. Precision is bought with time, and only ever at the square root of it.')
          ) : h('p', { className: 'text-[11px] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'No counts yet. Each press runs the detector twice: once with the source, once with it removed, for the same length of time. That second run is not optional — you cannot subtract a background you never measured.'),

          cdRuns.length > 1 ? (function () {
            var hi = Math.max(cdTrueNet * 2, Math.max.apply(null, cdNets) * 1.15, 1e-4);
            var lo = Math.min(0, Math.min.apply(null, cdNets) * 1.15);
            var span = hi - lo;
            var mn = Math.min.apply(null, cdNets), mx = Math.max.apply(null, cdNets);
            var mean = cdNets.reduce(function (a, b) { return a + b; }, 0) / cdNets.length;
            return h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(45,212,191,0.45)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,250,0.9)' } },
              h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#0d9488') } },
                'Your last ' + cdRuns.length + ' counts, all of the same unchanged source'),
              h('div', { className: 'relative h-8 rounded-lg', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.1)' } },
                h('div', { style: { position: 'absolute', left: nkClamp((cdTrueNet - lo) / span, 0, 1) * 100 + '%', top: 0, bottom: 0, width: '2px', background: '#fbbf24' } }),
                cdNets.map(function (v, i) {
                  return h('div', { key: i, style: { position: 'absolute', left: 'calc(' + nkClamp((v - lo) / span, 0, 1) * 100 + '% - 4px)', top: 'calc(50% - 4px)', width: '8px', height: '8px', borderRadius: '999px', background: '#2dd4bf', opacity: 0.45 + 0.55 * (i / Math.max(1, cdNets.length - 1)) } });
                })
              ),
              h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                'Ranged from ' + mn.toFixed(3) + ' to ' + mx.toFixed(3) + ' counts per second, averaging ' + mean.toFixed(3) + '. The gold line is the rate this source and geometry genuinely produce: ' + cdTrueNet.toFixed(3) + ' /s. Nothing about the source changed between runs. ' +
                (cdTime <= 10
                  ? 'At ' + cdTime + ' seconds a count, that scatter is enormous — this is exactly how a short measurement misleads someone into thinking a reading "went up".'
                  : 'At ' + (cdTime >= 60 ? (cdTime / 60) + ' minutes' : cdTime + ' seconds') + ' a count the dots have pulled in tight around the true value. That is the whole trade: time buys certainty.'))
            );
          })() : null,

          h('div', { className: 'rounded-lg overflow-hidden border mt-2', style: { borderColor: 'rgba(45,212,191,0.35)', height: '170px' } },
            h('canvas', { ref: countRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-count-description',
              'aria-label': 'Net count rate against distance for ' + cdSrc.name + '. The curve follows the inverse square law: at ' +
                nkFmt(cdDist, 0) + ' centimetres the true rate is ' + cdTrueNet.toFixed(3) + ' counts per second, and doubling the distance to ' +
                nkFmt(cdDist * 2, 0) + ' centimetres quarters it to ' + cdNetRateAt(cdDist * 2).toFixed(3) + '.' +
                (cdLast ? ' Your last measurement sits at ' + cdNet.toFixed(3) + ', off the curve by counting noise alone.' : ''),
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-count-description', className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'The curve is the inverse square law, and it is not a property of radiation — it is a property of spheres. The same gammas spread over a surface four times larger when you step twice as far back. Doubling your distance does more than most shielding, costs nothing, and is why the first rule of a radiation area is stand further away.'),
          cdDist < 6 ? h('p', { className: 'text-[11px] mt-1 font-bold', style: { color: ink('#fb923c') } },
            '⚠️ Below about 6 cm the model is stretched. The tube window is no longer small compared with the distance, so the neat 1/d² stops holding and a real measurement would read lower than the curve promises.') : null,

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,146,60,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,247,237,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#ea580c') } }, 'The trap in every cheap counter'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Consumer Geiger counters show a number in µSv/h, which makes them look like dose meters. They are not. The tube counts clicks and the display multiplies by one fixed factor — almost always the one that is correct for caesium-137 at 662 keV. Point the same instrument at a lower-energy source and the reading can be out by a factor of several, in either direction. This is the single most common way a well-meaning measurement ends up wrong on the internet: the instrument is fine, the counting is fine, and the conversion was never valid for what was being measured.')
          ),
          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'End-window GM tube, 6.16 cm² window, intrinsic efficiency 0.8–1.0% and background 25 counts/min — typical of school apparatus at sea level. Counts are drawn from a Poisson distribution, the real statistics of decay. Detection threshold is the Currie critical level for a paired background, 2.33√(2N_b), a 5% chance of crying wolf. Source activities: 37 kBq check sources, potassium at 31.7 Bq per gram of natural K, K-40 emitting its 1461 keV gamma in 10.6% of decays.')
        ),

        // ── the third lever ──
        sec('protect', '#38bdf8',
          heading(ink('#38bdf8'), '⏱️ 13. Time, distance, shielding — all three levers'),
          safetyNotice('medical'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Section 5 covered what stops radiation and section 12 covered distance. There is a third lever, it is free, and it is the one a radiation worker reaches for first: leave sooner. Every dose in this tool is a rate multiplied by a time, and you can pull on any of the three.'),

          h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'What are you standing near?'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            PROTECT_SOURCES.map(function (x) {
              return pill(ptSrcId === x.id, x.colour, x.name, function () {
                upd({ ptSrc: x.id });
                pushOnce('ptTried', x.id);
                if (typeof beep === 'function') beep();
              }, x.name + ', ' + x.nuclide + ', ' + x.gbq + ' gigabecquerels');
            })
          ),
          h('p', { className: 'text-[11px] mb-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            ptSrc.nuclide + ', ' + nkFmt(ptSrc.gbq, 1) + ' GBq — ' + nkFmt(ptGamma, 4) + ' mSv/h at 1 metre per GBq, worked out from its decay scheme.'),

          slider('pt-dist', 'Your distance', 0.3, 10, 0.1, ptDist,
            function (e) { upd({ ptDist: parseFloat(e.target.value) }); }, nkFmt(ptDist, 1) + ' m'),
          h('div', { className: 'flex flex-wrap gap-1 mt-2 mb-1' },
            SHIELDS.map(function (sh) {
              return pill(ptShieldId === sh.id, '#94a3b8', sh.name, function () {
                upd({ ptShield: sh.id });
                if (typeof beep === 'function') beep();
              }, 'Shield with ' + sh.name);
            })
          ),
          slider('pt-thick', 'Shield thickness', 0, 20, 0.5, ptThick,
            function (e) { upd({ ptThick: parseFloat(e.target.value) }); }, nkFmt(ptThick, 1) + ' cm'),

          h('div', { className: 'rounded-lg overflow-hidden border mt-2', style: { borderColor: 'rgba(56,189,248,0.35)', height: '175px' } },
            h('canvas', { ref: protectRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-protect-summary',
              'aria-label': 'Dose rate against distance for ' + ptSrc.nuclide + ' at ' + ptSrc.gbq +
                ' gigabecquerels. Unshielded it is ' + nkFmt(ptRateAt(1, 0), 3) + ' millisieverts per hour at 1 metre and ' +
                nkFmt(ptRateAt(5, 0), 4) + ' at 5 metres. At your chosen ' + nkFmt(ptDist, 1) + ' metres behind ' +
                nkFmt(ptThick, 1) + ' centimetres of ' + ptShield.name.toLowerCase() + ' it is ' + nkFmt(ptRate, 4) +
                ' millisieverts per hour.',
              style: { width: '100%', height: '100%', display: 'block' } })),

          h('div', { id: 'nk-protect-summary', className: 'grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2' },
            stat('Dose rate here', nkFmt(ptRate, ptRate < 1 ? 4 : 2) + ' mSv/h', ink(ptSrc.colour)),
            stat('Shield cuts it to', ptThick > 0 ? nkFmt(ptAtten * 100, ptAtten < 0.01 ? 3 : 1) + '%' : 'no shield', ink('#94a3b8')),
            stat('An hour here costs', nkFmt(ptRate, ptRate < 1 ? 4 : 2) + ' mSv', ink('#fbbf24'))
          ),

          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'How long until you reach…'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            DOSE_LIMITS.map(function (L) {
              return pill(ptLimitId === L.id, '#38bdf8', L.name + ' (' + L.mSv + ' mSv)', function () {
                upd({ ptLimit: L.id, protectUsed: true });
                if (typeof beep === 'function') beep();
              }, L.name + ', ' + L.mSv + ' millisieverts');
            })
          ),
          h('div', { className: 'rounded-lg border p-2.5', style: { borderColor: 'rgba(56,189,248,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,249,255,0.9)' } },
            h('p', { className: 'text-sm font-black', style: { color: ink('#0284c7') } },
              !isFinite(ptStayH) ? 'Indefinitely — nothing is getting through'
                : (ptStayH > 8760 ? 'Over a year of standing there'
                  : (ptStayH >= 1 ? nkFmt(ptStayH, ptStayH < 10 ? 1 : 0) + ' hours'
                    : (ptStayH >= 1 / 60 ? nkFmt(ptStayH * 60, 1) + ' minutes'
                      : nkFmt(ptStayH * 3600, 0) + ' seconds')))),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'to accumulate ' + ptLimit.mSv + ' mSv at ' + nkFmt(ptDist, 1) + ' m'
              + (ptThick > 0 ? ' behind ' + nkFmt(ptThick, 1) + ' cm of ' + ptShield.name.toLowerCase() : ', unshielded') + '.'),
            h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              ptSrcId === 'tc99m'
                ? 'This is the number families are never given. Sitting an arm\'s length from someone who has just had a scan, all day, does not get near a year\'s background — and the isotope is largely gone by tomorrow anyway. The honest advice is ordinary caution for a day, not distance from the people who need you.'
                : (ptSrcId === 'i131'
                  ? 'Seven times the activity and a harder gamma, which is why this patient sleeps alone and keeps their distance from children for a few days. Not because the risk is dramatic, but because the cost of the precaution is a few days and the cost of skipping it is avoidable dose to someone who gets no benefit from it.'
                  : 'Sealed sources like this are safe because of the housing, not the isotope. Every serious accident with one has the same shape: the source came out of its shielding, or never went back in, and the person nearby had no way to know.')),
            h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: ink('#fbbf24') } },
              '⏱️ Halve your time and you halve your dose. There is no equipment to buy and nothing to carry, which is exactly why it gets forgotten.')
          ),

          h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2' },
            [{ k: '⏱️ TIME', v: 'Leave at ' + nkFmt(ptStayH >= 1 ? ptStayH / 2 : ptStayH * 30, 1) + (ptStayH >= 1 ? ' hours' : ' minutes'),
               w: 'Halving the time halves the dose, exactly, always. It is the only lever that costs nothing.', c: '#fbbf24' },
             { k: '📏 DISTANCE', v: 'Move to ' + nkFmt(ptHalfDist, 1) + ' m',
               w: 'Multiply your distance by 1.41 and the dose rate halves, because the same photons spread over twice the sphere.', c: '#34d399' },
             { k: '🧱 SHIELDING', v: isFinite(ptHvl) ? '+' + nkFmt(ptHvl, ptHvl < 1 ? 2 : 1) + ' cm of ' + ptShield.name.toLowerCase() : 'not with air',
               w: 'One half-value layer halves it again, and every further layer halves what is left. It never reaches zero.', c: '#60a5fa' }
            ].map(function (x) {
              return h('div', { key: x.k, className: 'rounded-lg border p-2', style: { borderColor: x.c + '60', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
                h('p', { className: 'text-[10px] font-black', style: { color: ink(x.c) } }, x.k),
                h('p', { className: 'text-[11px] font-black mt-0.5', style: { color: isDark ? '#fff' : '#1e293b' } }, x.v),
                h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, x.w));
            })
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Three levers, one halving each, and they multiply. Step back to ' + nkFmt(ptHalfDist, 1) + ' m, add a half-value layer, and leave in half the time, and you have taken a quarter of a quarter — one eighth of the dose, for a shield, a step and a glance at the clock.'),
          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Dose rate computed from each nuclide\'s decay scheme with NIST mass energy-absorption coefficients for air, not from a quoted constant; the results sit within 3% of the published R·cm²/(mCi·h) values. Two simplifications, both in the same direction: the shield uses the 1 MeV attenuation coefficients from section 5, and this is narrow-beam attenuation with no buildup factor, so a thick shield in the real world performs somewhat worse than the figure above. Treat it as the right order of magnitude and the right SHAPE, which is what the three levers are about.')
        ),

        // ── 6. accidents ──
        sec('accidents', '#f87171',
          heading(ink('#f87171'), '📋 14. The three accidents, in the actual numbers'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'These are the events that shaped how the world thinks about nuclear power. The figures below come from UNSCEAR and the relevant national reports, and where the range is disputed the tool says so.'),
          h('div', { className: 'space-y-1' },
            INCIDENTS.map(function (inc) {
              var on = d.incPick === inc.id;
              return expandRow(inc.id, on, '#f87171', inc.name + ' (' + inc.year + ')', inc.place + ' · ' + inc.level,
                h('span', null,
                  para(h('b', null, 'What happened: ') ? inc.what : inc.what),
                  h('span', { className: 'block text-[11px] leading-relaxed mt-1.5', style: { color: isDark ? '#fca5a5' : '#b91c1c' } }, h('b', null, 'The toll: '), inc.toll),
                  h('span', { className: 'block text-[11px] leading-relaxed mt-1.5', style: { color: isDark ? '#86efac' : '#15803d' } }, h('b', null, 'What changed: '), inc.changed)),
                function () {
                  upd({ incPick: on ? null : inc.id });
                  if (!on) pushOnce('incidentsRead', inc.id);
                  if (typeof beep === 'function') beep();
                },
                (on ? 'Hide' : 'Read') + ' the full account of ' + inc.name);
            })
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'A pattern worth noticing: at both Fukushima and Chernobyl, the disruption caused by the response — evacuation, dislocation, fear, lost livelihoods — did comparable or greater harm than the radiation. That is not an argument that radiation is harmless. It is an argument that emergency planning has to weigh both, and historically it has not.')
        ),

        // ── 7. reactors and SMRs ──
        // ── the decision the last section leaves you with ──
        sec('shelter', '#a3e635',
          heading(ink('#84cc16'), '🏠 15. Shelter or evacuate? Work the numbers'),
          safetyNotice('emergency'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Around 2,200 people died because of the Fukushima evacuation and one from radiation. That is a fact, not an argument — and the wrong lesson to draw from it is that evacuating is a mistake. The right lesson is that it is a CHOICE with a cost on both sides, and which side is cheaper depends on numbers you can work out.'),
          h('p', { className: 'text-[11px] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Sheltering is not a third option. It is two of the three levers from section 13: a building is shielding, and staying put costs less time in the open than driving through a plume. So the question is only ever which arithmetic is smaller.'),

          slider('sh-rate', 'Outdoor dose rate', 0.1, 30, 0.1, shRate,
            function (e) { upd({ shRate: parseFloat(e.target.value) }); }, nkFmt(shRate, 1) + ' mSv/h'),
          slider('sh-plume', 'Release lasts', 1, 72, 1, shPlume,
            function (e) { upd({ shPlume: parseFloat(e.target.value) }); }, nkFmt(shPlume, 0) + ' h'),
          slider('sh-evac', 'Hours to get clear', 0.5, 12, 0.5, shEvac,
            function (e) { upd({ shEvac: parseFloat(e.target.value), shelterUsed: true }); }, nkFmt(shEvac, 1) + ' h'),

          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Where would you be sheltering?'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            SHELTER_PLACES.map(function (x) {
              return pill(shPlaceId === x.id, x.colour, x.name + '  ×' + x.drf, function () {
                upd({ shPlace: x.id });
                pushOnce('shSeen', x.id);
                if (typeof beep === 'function') beep();
              }, x.name + ', dose reduction factor ' + x.drf);
            })
          ),
          h('p', { className: 'text-[11px] mb-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, shPlace.note),
          h('p', { className: 'text-[10px] mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Published range for this kind of building: ×' + shPlace.range + '. The tool uses ×' + shPlace.drf + '.'),

          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(163,230,53,0.35)', height: '180px' } },
            h('canvas', { ref: shelterRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-shelter-summary',
              'aria-label': 'Dose against how long it takes to get clear. Sheltering in a ' + shPlace.name.toLowerCase() +
                ' through a ' + nkFmt(shPlume, 0) + ' hour release gives a flat ' + nkFmt(shShelterDose, 1) +
                ' millisieverts. Evacuating gives ' + nkFmt(shEvacDose, 1) + ' millisieverts after ' + nkFmt(shEvac, 1) +
                ' hours in the open. The two are equal at ' + nkFmt(shBreakEven, 1) +
                ' hours: get clear faster than that and leaving costs less dose, slower and it costs more.',
              style: { width: '100%', height: '100%', display: 'block' } })),

          h('div', { id: 'nk-shelter-summary', className: 'grid grid-cols-2 gap-2' },
            stat('Shelter here', nkFmt(shShelterDose, shShelterDose < 10 ? 1 : 0) + ' mSv', ink(shPlace.colour)),
            stat('Evacuate now', nkFmt(shEvacDose, shEvacDose < 10 ? 1 : 0) + ' mSv', ink('#f87171'))
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(163,230,53,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(247,254,231,0.9)' } },
            h('p', { className: 'text-sm font-black mb-1', style: { color: ink('#65a30d') } },
              shSheltering
                ? 'On dose alone: stay where you are'
                : 'On dose alone: leaving costs less'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Break-even is ' + nkFmt(shBreakEven, 1) + ' hours in the open. '
              + (shSheltering
                ? 'You said it would take ' + nkFmt(shEvac, 1) + ' hours to get clear, which is longer than that, so the drive costs more dose than the walls save. This is the case people find counter-intuitive, and it is the ordinary one when a release is short and the roads are full.'
                : 'You said ' + nkFmt(shEvac, 1) + ' hours, which beats it, so leaving wins on dose. That is the ordinary case when a release goes on for days — no building shields you for a week.')),
            h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Push the release out to several days and watch the answer flip: sheltering is a way of waiting out a plume, not a way of living somewhere contaminated. This classroom comparison cannot issue real guidance: officials may order sheltering or evacuation as measurements and travel conditions change.')
          ),
          sourceNote(['nrc']),

          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Where does that land against the published thresholds?'),
          h('div', { role: 'list', className: 'space-y-1' },
            PAG_LEVELS.map(function (L) {
              var hit = Math.min(shShelterDose, shEvacDose) >= L.mSv;
              return h('div', { key: L.name, role: 'listitem', className: 'rounded-lg px-2.5 py-1.5 border',
                style: hit
                  ? { background: 'rgba(248,113,113,0.14)', borderColor: '#f87171' }
                  : { background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' } },
                h('p', { className: 'text-[11px] font-bold', style: { color: hit ? ink('#f87171') : (isDark ? '#e2e8f0' : '#334155') } },
                  (hit ? '⚠️ ' : '') + L.name + ' — ' + L.mSv + ' mSv, ' + L.window),
                h('p', { className: 'text-[11px] mt-0.5 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, L.what));
            })
          ),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(248,113,113,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(254,242,242,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#dc2626') } }, 'What this calculation leaves out, and it is the important part'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Everything above is dose, and dose was not what killed people at Fukushima. Moving a hospital ward or a care home has a mortality cost that has nothing to do with radiation and does not appear anywhere in this arithmetic: patients on ventilators, people with dementia moved somewhere unfamiliar, days on a bus. That is where most of the 2,200 came from. The lesson drawn afterwards was not "never evacuate" — it was that the decision has to be made per population rather than per map, because for a fit adult a few hours in a car is nearly free, and for a frail patient it can be the most dangerous thing that happens to them all year.'),
            h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'It also leaves out everything after the plume: contaminated ground, food and water controls, and whether people can return. A dose comparison over the first few days is one input to that decision, not the decision.')
          ),
          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Shielding factors from FEMA and EPA emergency planning guidance for cloud and ground shine, quoted as the ranges they are given as. Thresholds from the US EPA PAG Manual (2017) and IAEA GSR Part 7. The model is deliberately the simplest one that can flip: constant outdoor rate, a single building factor, and no credit for driving away from the plume rather than along it — which in a real evacuation matters as much as the hours do.')
        ),

        sec('reactors', '#38bdf8',
          heading(ink('#38bdf8'), '🏭 16. Reactor designs, and where SMRs really stand'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every row says how it works, what makes it safe, and — the part usually left out — what the catch is.'),
          h('div', { className: 'space-y-1' },
            REACTORS.map(function (r) {
              var on = d.reactorPick === r.id;
              var badge = ink(r.status === 'operating' ? '#34d399' : (r.status === 'emerging' ? '#fbbf24' : (r.status === 'legacy' ? '#94a3b8' : '#f472b6')));
              var bodyId = 'nk-reactor-' + r.id + '-body';
              return h('div', {
                key: r.id, className: 'rounded-lg border transition-colors',
                style: on ? { background: '#38bdf81f', borderColor: '#38bdf8' }
                  : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
              },
                h('button', {
                  type: 'button', 'aria-expanded': on ? 'true' : 'false',
                  'aria-controls': on ? bodyId : undefined,
                  'aria-label': (on ? 'Hide details for ' : 'Show details for ') + r.name + ', status ' + r.status,
                  onClick: function () {
                    upd({ reactorPick: on ? null : r.id });
                    if (!on) pushOnce('reactorsSeen', r.id);
                    if (typeof beep === 'function') beep();
                  },
                  className: 'w-full text-left rounded-lg px-2.5 py-2'
                },
                  h('span', { className: 'flex items-center gap-2 flex-wrap' },
                    h('span', { className: 'text-[11px] font-bold flex-1', style: { color: isDark ? '#fff' : '#1e293b' } }, r.name),
                    h('span', { className: 'text-[10px] font-black px-1.5 py-0.5 rounded-full', style: { color: badge, border: '1px solid ' + badge + '70' } }, r.status),
                    h('span', { className: 'text-[11px] font-bold', 'aria-hidden': 'true', style: { color: ink('#38bdf8') } }, on ? '▾' : '›')),
                  h('span', { className: 'block text-[11px] mt-0.5', style: { color: isDark ? '#cbd5e1' : '#475569' } }, r.share)),
                on ? h('div', { id: bodyId, className: 'px-2.5 pb-2 -mt-0.5' },
                  para(r.how),
                  h('p', { className: 'text-[11px] leading-relaxed mt-1.5', style: { color: isDark ? '#86efac' : '#15803d' } }, h('b', null, 'Safety: '), r.safety),
                  h('p', { className: 'text-[11px] leading-relaxed mt-1.5', style: { color: isDark ? '#fbbf24' : '#b45309' } }, h('b', null, 'The catch: '), r.catch)
                ) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#f59e0b') } }, 'On small modular reactors specifically'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'The engineering case is real: a small core can be cooled by convection and gravity alone, so a station blackout stops being the scenario that keeps operators awake. Factory production should also beat pouring concrete on site, where Western projects have overrun badly. But as of now almost none are operating commercially — China\'s HTR-PM since 2023, and a Russian floating plant. NuScale had the first US design approval and its flagship project was cancelled in 2023 when projected power costs rose from about $58 to $89 per MWh. Factory economics need order volume that does not yet exist, and several designs need HALEU fuel with a supply chain still being built. The right posture is interested, not convinced.'),
            sourceNote(['nuscale', 'iter', 'nif'])
          )
        ),


        // ── 8. waste ──
        sec('waste', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', '🗄️ 17. The waste question, taken seriously'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'This is the objection that survives every other answer, so it deserves a straight one — including the part that genuinely has no solution.'),
          h('div', { className: 'space-y-1' },
            WASTE_FACTS.map(function (w, i) {
              var on = d.wastePick === i;
              return expandRow('w' + i, on, '#94a3b8', w.name, w.fact,
                para(w.detail),
                function () {
                  upd({ wastePick: on ? null : i });
                  if (!on) pushOnce('wasteSeen', w.name);
                  if (typeof beep === 'function') beep();
                },
                (on ? 'Hide' : 'Read more about') + ' ' + w.name);
            })
          )
        ),

        // ── 9. comparison ──
        sec('compare', '#a3e635',
          heading(ink('#84cc16'), '⚖️ 18. Compared with the alternatives'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Risk only means something next to the risk of the thing you would do instead. Both charts are full life cycle, including mining, construction and accidents.'),
          h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Deaths per terawatt-hour of electricity'),
          h('div', { role: 'list', className: 'space-y-1' },
            DEATHS_TWH.map(function (r) {
              return h('div', { key: r.name, role: 'listitem', 'aria-label': r.name + ', ' + r.v + ' deaths per terawatt hour', className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold w-24 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.name),
                h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('div', { style: { height: '100%', width: Math.max(1, nkLogFrac(r.v, 0.01, 25) * 100) + '%', background: r.colour, borderRadius: '999px' } })),
                h('span', { className: 'text-[11px] font-mono w-12 text-right', style: { color: ink(r.colour) } }, r.v));
            })
          ),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Logarithmic scale. Markandya & Wilkinson (2007) and Sovacool et al. (2016), compiled by Our World in Data. Nuclear\'s figure includes Chernobyl and Fukushima.'),

          h('p', { className: 'text-[11px] font-bold mt-3 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Lifecycle CO₂, grams per kWh'),
          h('div', { role: 'list', className: 'space-y-1' },
            CO2_KWH.map(function (r) {
              return h('div', { key: r.name, role: 'listitem', 'aria-label': r.name + ', ' + r.v + ' grams CO2 per kilowatt hour', className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold w-24 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.name),
                h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('div', { style: { height: '100%', width: Math.max(1, (r.v / 820) * 100) + '%', background: r.colour, borderRadius: '999px' } })),
                h('span', { className: 'text-[11px] font-mono w-12 text-right', style: { color: ink(r.colour) } }, r.v));
            })
          ),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'Linear scale. IPCC AR5 Annex III medians.'),

          h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(163,230,53,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(247,254,231,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink('#65a30d') } }, 'What these charts do and do not settle'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'They show that on deaths and on carbon, nuclear sits with wind and solar rather than with fossil fuels — and that is not a close call. They do not settle the argument, because the real objections to nuclear are mostly not about these two numbers. They are about capital cost, build times that have run to a decade or more in the West, waste policy that no country except Finland has finished, and weapons proliferation. Anyone who tells you the deaths-per-TWh chart ends the debate is skipping the parts that are actually hard.')
          ),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: ink('#84cc16') } },
            '🤔 Coal kills roughly 800 times more people per unit of energy than nuclear, yet nuclear provokes far more fear. What does that tell you about how people weigh a rare, dramatic, involuntary risk against a constant, invisible, familiar one?')
        ),

        // ── reactor operation simulator ──
        sec('operate', '#34d399',
          heading(ink('#34d399'), '🎛️ 19. Operate a reactor'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A modern reactor, run properly. The two accident conditions are here as engineering case studies — the point is to watch the physics do it, not to score a disaster.'),

          h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-2' },
            h('div', { className: 'relative rounded-xl overflow-hidden border', style: { borderColor: 'rgba(52,211,153,0.4)', height: '260px', background: isDark ? '#0b1220' : '#dfe6ef' } },
              h('div', { ref: rxAttach, style: { position: 'absolute', inset: 0 } }),
              d.rxStatus !== 'ready' ? h('div', { role: 'status', className: 'absolute inset-0 flex items-center justify-center text-center p-4', style: { background: isDark ? 'rgba(11,18,32,0.92)' : 'rgba(223,230,239,0.92)' } },
                h('p', { className: 'text-[11px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                  d.rxStatus === 'loading' ? 'Loading the 3D core…'
                    : (RX_MISSING === 'host'
                      ? 'The 3D core needs a newer host module than this build has. The control panel beside it still works in full.'
                      : 'The 3D core could not start here, usually because WebGL is blocked. The control panel beside it still works in full.'))
              ) : null),
            h('div', { className: 'rounded-xl overflow-hidden border', style: { borderColor: 'rgba(52,211,153,0.4)', height: '260px' } },
              h('canvas', { ref: rxCanvasRef, role: 'img',
                'data-a11y-static': 'true',
                'aria-describedby': 'rx-live-readings',
                'aria-label': 'Reactor control panel showing a power trace, fuel temperature, net reactivity in pcm and xenon level. Use the controls below; every reading is also given as text under the panel.',
                'aria-describedby': 'rx-live-readings',
                style: { width: '100%', height: '100%', display: 'block' } }))
          ),

          h('dl', {
            id: 'rx-live-readings', ref: rxTelemetryRef,
            'aria-label': 'Live reactor readings', 'aria-live': 'off',
            className: 'mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2'
          }, [
            ['rx-live-power', 'Power', nkFmt(rxRead.power, rxRead.power < 10 ? 1 : 0) + '%'],
            ['rx-live-temperature', 'Fuel temperature', nkFmt(rxRead.t, 0) + ' °C'],
            ['rx-live-reactivity', 'Net reactivity', (rxReadRhoPcm >= 0 ? '+' : '') + nkFmt(rxReadRhoPcm, 0) + ' pcm'],
            ['rx-live-xenon', 'Xenon level', nkFmt(rxRead.xe, 2) + '×'],
            ['rx-live-state', 'Simulation state', rxReadState]
          ].map(function (metric) {
            return h('div', {
              key: metric[0], className: 'rounded-lg p-2 text-center',
              style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.09)', border: '1px solid rgba(52,211,153,0.35)' }
            },
              h('dt', { className: 'text-[10px] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, metric[1]),
              h('dd', { className: 'text-sm font-black', style: { color: isDark ? '#6ee7b7' : '#047857' } },
                h('output', { id: metric[0] }, metric[2])));
          })),

          // controls
          h('div', { className: 'mt-2 flex flex-wrap gap-1' },
            RX_SCENARIOS.map(function (s) {
              return pill(rxScenario === s.id, '#34d399', s.name, function () {
                upd({ rxScenario: s.id });
                rxRestart();
                if (typeof beep === 'function') beep();
              }, 'Run the scenario: ' + s.name + '. ' + s.goal);
            })
          ),
          h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            h('b', null, rxScenObj.goal + ' '), rxScenObj.brief),

          h('div', { className: 'mt-2 flex flex-wrap gap-1' },
            RX_MODES.map(function (m) {
              return pill(rxMode === m.id, m.id === 'rbmk' ? '#f87171' : '#60a5fa', m.name, function () {
                upd({ rxMode: m.id });
                rxRestart();
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR(m.name + '. ' + m.blurb);
              }, 'Switch the core to ' + m.name);
            })
          ),
          h('p', { className: 'text-[11px] mt-1.5 leading-relaxed', style: { color: rxMode === 'rbmk' ? (isDark ? '#fca5a5' : '#b91c1c') : (isDark ? '#cbd5e1' : '#475569') } }, rxModeObj.blurb),

          h('div', { className: 'mt-2 flex flex-wrap items-center gap-2' },
            h('button', { type: 'button', 'aria-pressed': rxUi.running ? 'true' : 'false',
              'aria-label': rxUi.running ? 'Pause the simulation' : 'Start the simulation',
              onClick: function () { rxPatchUi({ running: !rxUi.running }); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[11px] font-black',
              style: rxUi.running ? { background: '#f59e0b', color: '#0b1020', border: '1px solid #f59e0b' } : { background: '#065f46', color: '#fff', border: '1px solid #065f46' }
            }, rxUi.running ? '⏸ Pause' : '▶ Run'),
            h('button', { type: 'button', 'aria-label': 'Scram: drop every control rod immediately',
              onClick: function () {
                rxSet({ scrammed: true, sinceScram: 0, rods: 100, holdOk: 0 });
                rxPatchUi({ scrammed: true, rodStep: 100 });
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR('Scrammed. Fission stopped. Decay heat continues.');
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[11px] font-black text-white',
              style: { background: '#dc2626', border: '1px solid #dc2626' } }, '🛑 SCRAM'),
            h('button', { type: 'button', 'aria-label': 'Reset the reactor to its starting condition',
              onClick: function () { rxRestart(); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold',
              style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '↺ Reset'),
            h('button', { type: 'button', 'aria-pressed': rxUi.pumps ? 'true' : 'false',
              'aria-label': rxUi.pumps ? 'Stop the coolant pumps' : 'Restore the coolant pumps',
              onClick: function () {
                var pumps = !rxRef.current.pumps;
                rxSet({ pumps: pumps });
                rxPatchUi({ pumps: pumps });
                if (typeof beep === 'function') beep();
              },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold',
              style: rxUi.pumps
                ? { background: 'rgba(96,165,250,0.18)', color: isDark ? '#bfdbfe' : '#1d4ed8', border: '1px solid #60a5fa' }
                : { background: 'rgba(248,113,113,0.18)', color: isDark ? '#fecaca' : '#b91c1c', border: '1px solid #f87171' }
            }, rxUi.pumps ? '💧 Pumps on' : '💧 Pumps OFF')
          ),

          h('div', { className: 'flex items-center gap-2 mt-2' },
            h('label', { htmlFor: 'rx-rods', className: 'text-[11px] font-bold w-28 flex-shrink-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Control rods'),
            h('input', { id: 'rx-rods', type: 'range', min: 0, max: 100, step: 1,
              value: rxUi.rodStep,
              'aria-valuetext': rxUi.rodStep + ' percent inserted',
              onChange: function (e) {
                var value = parseFloat(e.target.value);
                rxSet({ rods: value, scrammed: false });
                rxPatchUi({ rodStep: Math.round(value / 5) * 5, scrammed: false });
              },
              className: 'flex-1 h-6 accent-emerald-500' }),
            h('span', { className: 'text-[11px] font-bold w-24 text-right', style: { color: isDark ? '#6ee7b7' : '#047857' } }, rxUi.rodStep + '% in')
          ),

          rxUi.verdict ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5',
            style: { borderColor: rxUi.verdict.ok ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)', background: isDark ? 'rgba(15,23,42,0.7)' : (rxUi.verdict.ok ? 'rgba(240,253,244,0.9)' : 'rgba(254,242,242,0.9)') } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink(rxUi.verdict.ok ? '#059669' : '#dc2626') } }, rxUi.verdict.ok ? '✅ Scenario complete' : '⚠️ Run ended'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, rxUi.verdict.why),
            h('button', { type: 'button', 'aria-label': 'Reset and try again',
              onClick: function () { rxRestart(); },
              className: 'min-h-11 mt-2 px-3 py-2 rounded-lg text-[11px] font-bold text-white',
              style: { background: '#065f46', border: '1px solid #065f46' } }, 'Try again')
          ) : null,

          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Parts of the core'),
          h('div', { className: 'flex flex-wrap gap-1' },
            RX_PARTS.map(function (p) {
              var on = d.rxPart === p.id;
              return h('button', { key: p.id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
                'aria-label': (on ? 'Hide' : 'Show') + ' details for ' + p.label,
                onClick: function () {
                  upd({ rxPart: on ? null : p.id });
                  if (!on) { pushOnce('rxPartsSeen', p.id); if (typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc); }
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold',
                style: on ? { background: p.color, color: '#0b1020', border: '1px solid ' + p.color }
                  : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, p.label);
            })
          ),
          (function () {
            var p = RX_PARTS.filter(function (x) { return x.id === d.rxPart; })[0];
            return p ? h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: p.color + '80', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.92)' } },
              h('p', { className: 'text-[11px] font-black mb-1', style: { color: ink(p.color) } }, p.label),
              h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, p.desc)) : null;
          })(),

          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'One-group point kinetics with the prompt-jump approximation: β = 0.0065, Λ = 10⁻⁴ s, λ = 0.0767 /s. Decay heat uses the Wigner-Way approximation. Temperature, void and xenon feedbacks are order-of-magnitude realistic for teaching, not a licensing model.')
        ),

        // ── bridges ──
        sec('next', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', '🔗 Take this somewhere'),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
            [{ id: 'heatLab', icon: '🌡️', name: 'Heat & Thermodynamics Lab', why: 'A reactor is a heat engine. Carnot caps it at about 33%, which is why two-thirds of the energy goes up the cooling towers.' },
             { id: 'renewablesLab', icon: '⚡', name: 'Renewables Lab', why: 'Put the deaths and carbon figures next to how each source actually generates power.' },
             { id: 'geologyExplorer', icon: '⛰️', name: 'Geology Explorer', why: 'Radiometric dating is the half-life maths above, applied to rock. It is how we know the Earth\'s age.' },
             { id: 'chemBalance', icon: '⚖️', name: 'ChemLab: Reactions & Elements', why: 'Nuclear equations balance mass number and charge, not atoms — and the periodic table atlas lives there.' }
            ].map(function (b) {
              return h('button', {
                key: b.id, type: 'button', 'aria-label': 'Open ' + b.name + '. ' + b.why,
                onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(b.id); },
                className: 'text-left rounded-lg p-2.5 border transition-colors',
                style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.24)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-sm', 'aria-hidden': 'true' }, b.icon),
                  h('span', { className: 'text-[11px] font-black', style: { color: isDark ? '#fff' : '#1e293b' } }, b.name),
                  h('span', { className: 'ml-auto text-[11px] font-bold', style: { color: ink('#94a3b8') } }, '→')),
                h('span', { className: 'block text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, b.why));
            })
          )
        ),

        h('footer', { className: 'mt-3 rounded-lg border p-3 text-center', style: { borderColor: isDark ? 'rgba(148,163,184,.25)' : 'rgba(100,116,139,.22)' } },
          h('p', { className: 'text-[10px] leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Reviewed ' + NK_REVIEWED + '. Half-lives use NNDC NuDat 3; attenuation uses NIST XCOM at 1 MeV; dose and accident context uses UNSCEAR, ICRP 103 and NCRP 160. Where a figure is disputed, the tool gives the range rather than choosing.'),
          sourceNote(['nudat', 'nist', 'unscear', 'nrc', 'iter', 'nif', 'nuscale']))
      );
    }
  });
})();
