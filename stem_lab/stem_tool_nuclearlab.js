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

  // ── Isotopes. Half-lives from the NNDC / IAEA chart of nuclides. ──
  var ISOTOPES = [
    { id: 'tc99m', name: 'Technetium-99m', hl: 6.01 / 24 / 365.25, unit: 'hours', hlText: '6.0 hours', decay: 'Gamma', use: 'The workhorse of medical imaging — about 40 million scans a year. Its short half-life is the point: it images you, then it is gone.' },
    { id: 'rn222', name: 'Radon-222',      hl: 3.82 / 365.25,      unit: 'days',  hlText: '3.8 days', decay: 'Alpha', use: 'Seeps from rock into basements and is the largest single source of natural dose for most people. Second leading cause of lung cancer after smoking.' },
    { id: 'i131',  name: 'Iodine-131',     hl: 8.02 / 365.25,      unit: 'days',  hlText: '8.0 days', decay: 'Beta + gamma', use: 'Treats thyroid cancer, and is the early fallout hazard after an accident because the thyroid concentrates iodine. Gone in months.' },
    { id: 'co60',  name: 'Cobalt-60',      hl: 5.27,               unit: 'years', hlText: '5.3 years', decay: 'Gamma', use: 'Sterilises medical equipment and treats cancer. Strong penetrating gamma, so it is handled remotely behind heavy shielding.' },
    { id: 'h3',    name: 'Tritium',        hl: 12.32,              unit: 'years', hlText: '12.3 years', decay: 'Beta (very weak)', use: 'Glow-in-the-dark exit signs and watch dials. Its beta is so weak it cannot get through skin — the hazard is only if it is taken in.' },
    { id: 'cs137', name: 'Caesium-137',    hl: 30.05,              unit: 'years', hlText: '30.1 years', decay: 'Beta + gamma', use: 'The contaminant that defines the Chernobyl and Fukushima exclusion zones. Chemically like potassium, so it spreads through soil and food chains.' },
    { id: 'c14',   name: 'Carbon-14',      hl: 5730,               unit: 'years', hlText: '5,730 years', decay: 'Beta', use: 'Radiocarbon dating. Useful back to roughly 50,000 years, after which too little is left to measure.' },
    { id: 'pu239', name: 'Plutonium-239',  hl: 24110,              unit: 'years', hlText: '24,110 years', decay: 'Alpha', use: 'Reactor by-product and weapons material. Alpha emitter, so it is harmless outside the body and serious inside it.' },
    { id: 'u235',  name: 'Uranium-235',    hl: 7.04e8,             unit: 'years', hlText: '704 million years', decay: 'Alpha', use: 'The fissile isotope, only 0.72% of natural uranium. Reactors enrich it to 3–5%; weapons need above 90%.' },
    { id: 'k40',   name: 'Potassium-40',   hl: 1.25e9,             unit: 'years', hlText: '1.25 billion years', decay: 'Beta + electron capture', use: 'In every banana, and in you — about 4,000 decays a second inside your own body, for your whole life.' },
    { id: 'u238',  name: 'Uranium-238',    hl: 4.468e9,            unit: 'years', hlText: '4.47 billion years', decay: 'Alpha', use: 'Dates rocks and meteorites. This is how we know the Earth is 4.54 billion years old.' }
  ];

  // ── Radiation types. Attenuation values are order-of-magnitude teaching
  //    figures, not shielding-design numbers. ──
  var RAD_TYPES = [
    { id: 'alpha', name: 'Alpha', symbol: 'α', what: 'A helium nucleus: 2 protons, 2 neutrons. Heavy and doubly charged.',
      stops: 'A sheet of paper, or the dead outer layer of your skin.', range: 'A few cm of air',
      danger: 'Harmless outside the body. Serious inside it — all that ionising power is dumped into a tiny volume of living tissue. This is exactly why radon matters: you breathe it in.',
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
    { sym: 'Po-210', hl: '138.4 days',      kind: 'alpha', note: 'Polonium-210. Intensely radioactive, and notorious as a poison precisely because an alpha emitter is harmless outside the body and lethal inside it.' },
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
      catch: 'In December 2022 the National Ignition Facility got 3.15 MJ out for 2.05 MJ delivered to the target — a real first. But the lasers drew roughly 300 MJ from the wall, so the plant was far from break-even. ITER now targets first plasma in 2034. Useful electricity remains decades away, and anyone promising otherwise is selling something.' }
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
    desc: 'Half-life and decay you can run, what actually stops alpha, beta and gamma, how fission and fusion work, radiation doses on a scale you can read, the three accidents in honest numbers, what to do with the waste, and where small modular reactors really stand.',
    color: 'violet',
    category: 'science',
    aliases: ['nuclear', 'radiation', 'radioactive', 'radioactivity', 'half-life', 'halflife', 'isotope', 'isotopes',
      'decay', 'fission', 'fusion', 'reactor', 'SMR', 'small modular reactor', 'uranium', 'plutonium', 'carbon dating',
      'radiocarbon', 'chernobyl', 'fukushima', 'three mile island', 'sievert', 'becquerel', 'dose', 'radiation safety',
      'shielding', 'nuclear waste', 'geological repository', 'alpha', 'beta', 'gamma', 'neutron', 'radon', 'ITER',
      'meltdown', 'containment', 'control rods', 'enrichment', 'nuclear power', 'atomic'],

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
        if (y < 1 / 365.25) return nkFmt(y * 365.25 * 24, 1) + ' hours';
        if (y < 1) return nkFmt(y * 365.25, 1) + ' days';
        if (y < 1e4) return nkFmt(y, 0) + ' years';
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
      var alphaStopped = thick > 0.01;
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

      // ── charts ──
      function nkChart(el, cfg) {
        if (!el) return;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var ow = el.offsetWidth || 560, oh = el.offsetHeight || 180;
        var W = el.width = Math.round(ow * dpr);
        var H = el.height = Math.round(oh * dpr);
        var c = el.getContext('2d');
        var padL = 44 * dpr, padR = 12 * dpr, padT = 12 * dpr, padB = 28 * dpr;
        var pw = W - padL - padR, ph = H - padT - padB;
        c.clearRect(0, 0, W, H);
        c.fillStyle = isDark ? '#0b1120' : '#f8fafc';
        c.fillRect(0, 0, W, H);
        function px(v) { return padL + (v - cfg.xMin) / (cfg.xMax - cfg.xMin) * pw; }
        function py(v) { return padT + (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)) * ph; }
        c.strokeStyle = isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)';
        c.lineWidth = Math.max(1, dpr);
        c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
        c.fillStyle = isDark ? 'rgba(148,163,184,0.9)' : 'rgba(71,85,105,0.9)';
        c.textAlign = 'right'; c.textBaseline = 'middle';
        for (var gi = 0; gi <= 4; gi++) {
          var yv = cfg.yMin + (cfg.yMax - cfg.yMin) * gi / 4, y = py(yv);
          c.beginPath(); c.moveTo(padL, y); c.lineTo(W - padR, y); c.stroke();
          c.fillText(Math.round(yv) + (cfg.yUnit || ''), padL - 5 * dpr, y);
        }
        c.textAlign = 'center'; c.textBaseline = 'top';
        for (var gx = 0; gx <= 5; gx++) {
          var xv = cfg.xMin + (cfg.xMax - cfg.xMin) * gx / 5;
          c.fillText(Math.round(xv) + (cfg.xUnit || ''), px(xv), H - padB + 6 * dpr);
        }
        (cfg.series || []).forEach(function (s) {
          c.strokeStyle = s.colour; c.lineWidth = (s.width || 2) * dpr;
          c.beginPath();
          s.points.forEach(function (p, i) { var x = px(p[0]), y = py(p[1]); if (i === 0) c.moveTo(x, y); else c.lineTo(x, y); });
          c.stroke();
        });
        // half-life step markers make the halving visible rather than implied
        (cfg.steps || []).forEach(function (st) {
          c.strokeStyle = 'rgba(167,139,250,0.5)';
          c.setLineDash([3 * dpr, 3 * dpr]);
          c.beginPath();
          c.moveTo(px(st[0]), py(cfg.yMin)); c.lineTo(px(st[0]), py(st[1]));
          c.lineTo(px(cfg.xMin), py(st[1]));
          c.stroke();
          c.setLineDash([]);
        });
        if (cfg.marker) {
          c.fillStyle = cfg.marker.colour;
          c.beginPath(); c.arc(px(cfg.marker.x), py(cfg.marker.y), 4.5 * dpr, 0, 6.2832); c.fill();
        }
        c.strokeStyle = isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)';
        c.beginPath(); c.moveTo(padL, padT); c.lineTo(padL, H - padB); c.lineTo(W - padR, H - padB); c.stroke();
      }

      React.useEffect(function () {
        var steps = [];
        for (var s = 1; s <= Math.min(4, Math.floor(halves)); s++) steps.push([s, Math.pow(0.5, s) * 100]);
        nkChart(decayRef.current, {
          xMin: 0, xMax: 10, yMin: 0, yMax: 100, xUnit: '', yUnit: '%',
          series: [{ points: decayPts, colour: '#a78bfa', width: 2.4 }],
          steps: steps,
          marker: { x: nkClamp(halves, 0, 10), y: remaining * 100, colour: '#fbbf24' }
        });
      }, [halves, isDark]);


      // ── Reactor simulator ────────────────────────────────────────────
      // The sim state lives in a ref and the panel is drawn on canvas, so a
      // 10 Hz physics tick does not re-render the whole tool 10 times a second.
      // React state is only touched when something the CONTROLS depend on
      // changes: the scenario verdict and the quantised rod position for the 3D.
      var rxRef = React.useRef(null);
      var rxCanvasRef = React.useRef(null);
      var rxAnim = React.useRef(0);
      var stRx = React.useState({ running: false, verdict: null, rodStep: 50, hotStep: 0 });
      var rxUi = stRx[0], setRxUi = stRx[1];

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
        function size() { W = el.width = Math.round((el.offsetWidth || 560) * dpr); H = el.height = Math.round((el.offsetHeight || 210) * dpr); }
        size();
        var c = el.getContext('2d');
        var last = 0;
        var hist = [];

        function draw(ts) {
          if (!el.isConnected) { cancelAnimationFrame(rxAnim.current); return; }
          try {
            var s = rxRef.current;
            var dt = last ? Math.min(0.25, (ts - last) / 1000) : 0.016;
            last = ts;
            var mode = RX_MODES.filter(function (m) { return m.id === el.dataset.mode; })[0] || RX_MODES[0];
            var scen = RX_SCENARIOS.filter(function (x) { return x.id === el.dataset.scenario; })[0] || RX_SCENARIOS[0];
            var r = { total: 0, voidFrac: 0 };
            if (el.dataset.running === 'on' && !s.verdict) r = rxStep(s, dt, mode, scen);
            else r = rxReactivity(s, mode);

            hist.push(Math.min(200, s.power));
            if (hist.length > 240) hist.shift();

            c.clearRect(0, 0, W, H);
            c.fillStyle = '#0b1120';
            c.fillRect(0, 0, W, H);

            // power trace
            var gy = H * 0.62;
            c.strokeStyle = 'rgba(148,163,184,0.25)';
            c.lineWidth = Math.max(1, dpr);
            c.beginPath(); c.moveTo(0, gy - (100 / 200) * gy); c.lineTo(W, gy - (100 / 200) * gy); c.stroke();
            c.strokeStyle = s.t > RX_T_CLAD ? '#f87171' : (s.power > 110 ? '#fbbf24' : '#34d399');
            c.lineWidth = 2 * dpr;
            c.beginPath();
            hist.forEach(function (p, i) {
              var x = (i / 240) * W, y = gy - (p / 200) * gy;
              if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
            });
            c.stroke();
            c.fillStyle = 'rgba(148,163,184,0.75)';
            c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
            c.fillText('100% line', 4 * dpr, gy - (100 / 200) * gy - 4 * dpr);

            // readouts
            function box(x, label, value, colour) {
              c.fillStyle = 'rgba(148,163,184,0.65)';
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
            if (ts - s.lastSync > 400) {
              s.lastSync = ts;
              if (rodStep !== rxUi.rodStep || hotStep !== rxUi.hotStep || (!!s.verdict) !== (!!rxUi.verdict)) {
                setRxUi({ running: el.dataset.running === 'on', verdict: s.verdict, rodStep: rodStep, hotStep: hotStep });
              }
            }
          } catch (err) { console.error('Reactor sim error:', err); }
          rxAnim.current = requestAnimationFrame(draw);
        }
        rxAnim.current = requestAnimationFrame(draw);
        var ro = typeof ResizeObserver === 'function' ? new ResizeObserver(size) : null;
        if (ro) ro.observe(el);
        return function () { cancelAnimationFrame(rxAnim.current); if (ro) ro.disconnect(); };
      }, []);

      React.useEffect(function () {
        var el = rxCanvasRef.current;
        if (!el) return;
        el.dataset.mode = rxMode;
        el.dataset.scenario = rxScenario;
        el.dataset.running = rxUi.running ? 'on' : 'off';
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
      }
      function rxRestart() {
        rxRef.current = rxFresh();
        setRxUi({ running: false, verdict: null, rodStep: 50, hotStep: 0 });
        if (typeof announceToSR === 'function') announceToSR('Reactor reset to 50% rods, full power, pumps running.');
      }

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
          series: [{ points: pts, colour: '#38bdf8', width: 2.2 }],
          marker: { x: bePeak.a, y: bePeak.be, colour: '#fbbf24' }
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
        var children = Array.prototype.slice.call(arguments, 2);
        var node = card.apply(null, [accent].concat(children));
        return React.cloneElement(node, {
          id: 'nksec-' + id,
          'data-nk-sec': id,
          style: Object.assign({}, node.props.style, { scrollMarginTop: '92px' })
        });
      };
      var heading = function (accent, text) {
        return h('p', { className: 'text-xs font-black mb-2', style: { color: accent } }, text);
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
          h('p', { className: 'text-sm font-black', style: { color: colour } }, value));
      };
      var expandRow = function (key, on, accent, title, sub, body, onClick, aria) {
        return h('button', {
          key: key, type: 'button', 'aria-pressed': on ? 'true' : 'false', 'aria-label': aria,
          onClick: onClick,
          className: 'w-full text-left rounded-lg px-2.5 py-2 border transition-colors',
          style: on ? { background: accent + '1f', borderColor: accent }
            : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
        },
          h('span', { className: 'flex items-center gap-2' },
            h('span', { className: 'flex-1' },
              h('span', { className: 'block text-[11px] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, title),
              sub ? h('span', { className: 'block text-[11px]', style: { color: isDark ? '#cbd5e1' : '#64748b' } }, sub) : null),
            h('span', { className: 'text-[11px] font-bold', style: { color: accent } }, on ? '▾' : '›')),
          on ? h('span', { className: 'block mt-1.5' }, body) : null);
      };
      var para = function (txt, colour) {
        return h('span', { className: 'block text-[11px] leading-relaxed mt-1', style: { color: colour || (isDark ? '#e2e8f0' : '#334155') } }, txt);
      };

      // ── topic index ──
      // 14 sections is a long scroll to hunt through. Order here MUST match DOM
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
        { id: 'mydose', grp: 'radiation', icon: '🧮', label: 'Your annual dose', kw: 'personal estimate radon flights scans altitude millisievert msv background' },
        { id: 'doseladder', grp: 'radiation', icon: '📏', label: 'Dose ladder', kw: 'sievert banana flight ct scan lethal acute compare how much is a lot' },
        { id: 'accidents', grp: 'society', icon: '📋', label: 'The three accidents', kw: 'chernobyl fukushima three mile island deaths tmi meltdown numbers' },
        { id: 'reactors', grp: 'reactors', icon: '🏭', label: 'Reactor designs & SMRs', kw: 'pwr bwr candu rbmk smr molten salt fusion small modular status' },
        { id: 'waste', grp: 'society', icon: '🗄️', label: 'The waste question', kw: 'spent fuel repository onkalo storage geological million years disposal' },
        { id: 'compare', grp: 'society', icon: '⚖️', label: 'Compared with alternatives', kw: 'deaths per twh coal gas solar wind carbon co2 lifecycle safest' },
        { id: 'operate', grp: 'reactors', icon: '🎛️', label: 'Operate a reactor', kw: 'simulator control rods scram xenon blackout scenario 3d core hands on' }
      ];
      var nkQuery = (d.nkQuery || '').trim().toLowerCase();
      var nkGroup = d.nkGroup || 'all';
      function nkMatches(s) {
        if (nkGroup !== 'all' && s.grp !== nkGroup) return false;
        if (!nkQuery) return true;
        return (s.id + ' ' + s.label + ' ' + s.kw).toLowerCase().indexOf(nkQuery) !== -1;
      }
      var nkVisible = NK_SECTIONS.filter(nkMatches);
      function nkGoTo(s) {
        var target = typeof document !== 'undefined' && document.getElementById('nksec-' + s.id);
        if (target) {
          var rm = !!(typeof window !== 'undefined' && window.matchMedia
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
          try { target.scrollIntoView({ behavior: rm ? 'auto' : 'smooth', block: 'start' }); }
          catch (e) { target.scrollIntoView(); }
        }
        if (typeof announceToSR === 'function') announceToSR('Jumped to ' + s.label + '.');
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
          h('span', { className: 'text-[11px] font-black', style: { color: isDark ? '#c4b5fd' : '#6d28d9' } },
            '🧭 ' + NK_SECTIONS.length + ' topics'),
          h('label', { htmlFor: 'nk-topic-search', className: 'sr-only' }, 'Search topics'),
          h('input', {
            id: 'nk-topic-search', type: 'search', value: d.nkQuery || '',
            placeholder: 'Search topics…',
            'aria-label': 'Search the ' + NK_SECTIONS.length + ' topics by name or keyword',
            onChange: function (e) { upd({ nkQuery: e.target.value }); },
            className: 'flex-1 min-w-[8rem] rounded-lg px-2 py-1 text-[11px]',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.95)',
              color: isDark ? '#e2e8f0' : '#1e293b',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
            }
          }),
          h('span', { className: 'text-[10px] font-bold', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            nkVisible.length === NK_SECTIONS.length ? 'showing all' : 'showing ' + nkVisible.length)
        ),
        h('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
          NK_GROUPS.map(function (g) {
            var n = g.id === 'all' ? NK_SECTIONS.length : NK_SECTIONS.filter(function (s) { return s.grp === g.id; }).length;
            return pill(nkGroup === g.id, '#a78bfa', g.label + ' (' + n + ')', function () {
              upd({ nkGroup: g.id });
            }, 'Show ' + g.label + ', ' + n + ' topics');
          })
        ),
        h('div', { className: 'flex flex-wrap gap-1 mt-1.5' },
          nkVisible.length === 0
            ? h('span', { className: 'text-[11px]', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                'No topic matches “' + (d.nkQuery || '') + '”.')
            : nkVisible.map(function (s, i) {
                return h('button', {
                  key: s.id, type: 'button',
                  onClick: function () { nkGoTo(s); },
                  'aria-label': 'Jump to ' + s.label,
                  className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                  style: {
                    background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(167,139,250,0.09)',
                    color: isDark ? '#e2e8f0' : '#334155',
                    border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.28)' : 'rgba(167,139,250,0.35)')
                  }
                }, s.icon + ' ' + (NK_SECTIONS.indexOf(s) + 1) + '. ' + s.label);
              })
        )
      );

      return h('div', { 'data-nuclear-lab': 'true', className: 'max-w-5xl mx-auto animate-in fade-in duration-200' },

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
          heading('#c4b5fd', '⏳ 1. Half-life: the one rule that never changes'),
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
              'aria-label': 'Decay curve. After ' + nkFmt(halves, 1) + ' half-lives, ' + nkFmt(remaining * 100, 1) + ' percent of the ' + iso.name + ' remains. The curve halves at every step and never quite reaches zero.',
              style: { width: '100%', height: '100%', display: 'block' } })),
          slider('nk-halves', 'Half-lives', 0, 10, 0.25, halves,
            function (e) { upd({ halves: parseFloat(e.target.value) }); }, nkFmt(halves, 2)),
          h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
            stat('Still radioactive', nkFmt(remaining * 100, 2) + '%', '#a78bfa'),
            stat('Time passed', nkYears(elapsedYears), '#c4b5fd'),
            stat('Half-life', iso.hlText, '#fbbf24')
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            h('b', null, iso.name + ' (' + iso.decay + '): '), iso.use),
          h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: '#a78bfa' } },
            halves >= 7
              ? '🤔 After ' + nkFmt(halves, 0) + ' half-lives less than 1% is left — but never exactly zero. Why can this curve never actually reach the axis?'
              : '🤔 Drag to 7 half-lives. What fraction is left, and why is "ten half-lives and it is gone" only roughly true?')
        ),

        // ── 2. carbon dating ──
        sec('dating', '#22d3ee',
          heading('#22d3ee', '🦴 2. Read a date out of the decay'),
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
              style: { background: '#0891b2', border: '1px solid #0891b2' } }, ageShown ? 'Recalculate' : 'Reveal')
          ),
          ageShown ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(236,254,255,0.9)' } },
            h('p', { className: 'text-sm font-black', style: { color: '#0891b2' } }, 'About ' + nkFmt(c14Age, 0) + ' years old'),
            h('p', { className: 'text-[11px] mt-1 font-mono', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'age = 5730 × ln(100 / ' + c14Frac + ') / ln 2'),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              c14Frac <= 2
                ? 'Below about 1–2% remaining the measurement gets unreliable, which is why radiocarbon runs out at roughly 50,000 years. Older samples need a different clock — uranium-238 for rocks, potassium-argon for volcanic ash.'
                : 'Real dating also corrects for the fact that atmospheric carbon-14 has varied over time. Calibration curves built from tree rings and corals handle that, which is why published dates say "cal BP".')
          ) : null
        ),


        // ── decay chain ──
        sec('chain', '#c084fc',
          heading('#c084fc', '⛓️ 3. The chain from uranium to lead — and why radon is in basements'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Most heavy nuclei do not reach stability in one step. Uranium-238 takes fourteen, alternating alpha and beta, and finishes as lead. One member of that chain is a gas, and that changes everything.'),
          h('div', { role: 'list', className: 'space-y-1 max-h-72 overflow-y-auto pr-1' },
            U238_CHAIN.map(function (step, i) {
              var on = d.chainPick === i;
              var col = step.kind === 'alpha' ? '#f87171' : (step.kind === 'beta' ? '#60a5fa' : '#94a3b8');
              if (step.gas) col = '#fbbf24';
              return h('button', {
                key: step.sym, type: 'button', role: 'listitem',
                'aria-pressed': on ? 'true' : 'false',
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
                  h('span', { className: 'text-[10px] font-mono w-5 flex-shrink-0', style: { color: isDark ? '#64748b' : '#94a3b8' } }, (i + 1)),
                  h('span', { className: 'text-[11px] font-black w-16 flex-shrink-0', style: { color: col } }, step.sym),
                  h('span', { className: 'text-[11px] font-mono flex-1', style: { color: isDark ? '#cbd5e1' : '#64748b' } }, step.hl),
                  step.gas ? h('span', { className: 'text-[10px] font-black px-1.5 py-0.5 rounded-full', style: { color: '#fbbf24', border: '1px solid rgba(251,191,36,0.6)' } }, 'GAS') : null,
                  h('span', { className: 'text-[11px] font-bold', style: { color: col } }, step.kind === 'stable' ? '■' : (step.kind === 'alpha' ? 'α' : 'β'))),
                on ? h('span', { className: 'block text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, step.note) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#f59e0b' } }, 'Why the whole chain runs at uranium-238\'s pace'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Every step below the parent is far faster than it, so each daughter decays about as fast as it is made. The chain settles into secular equilibrium and the whole thing ticks along at the rate of the slowest step — 4.47 billion years. That is why radon keeps appearing in a basement year after year and never runs out: it is being made continuously from uranium in the ground beneath, and the supply lasts as long as the planet does.')
          ),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: '#c084fc' } },
            '🤔 Radon has a half-life of under four days. Sealing a basement for a fortnight would clear what is already there. Why does that not fix the problem?')
        ),

        // ── enrichment ──
        sec('enrichment', '#fb923c',
          heading('#fb923c', '🔢 4. Enrichment: why reactor fuel is not a bomb'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Natural uranium is 99.3% U-238 and only 0.72% the fissile U-235. Separating them is the hardest industrial step in the whole business — and the reason a power reactor is not a weapon waiting to happen.'),
          h('div', { role: 'list', className: 'space-y-1' },
            ENRICH_LEVELS.map(function (lv, i) {
              var on = d.enrPick === i;
              var col = lv.pct >= 90 ? '#f87171' : (lv.pct >= 20 ? '#fb923c' : '#34d399');
              return h('button', {
                key: lv.name, type: 'button', role: 'listitem',
                'aria-pressed': on ? 'true' : 'false',
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
                  h('span', { className: 'text-[11px] font-black w-14 flex-shrink-0', style: { color: col } }, lv.pct + '%'),
                  h('span', { className: 'text-[11px] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, lv.name)),
                h('span', { className: 'block h-1.5 rounded-full mt-1', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-1.5 rounded-full', style: { width: Math.max(1, lv.pct) + '%', background: col } })),
                on ? h('span', { className: 'block text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, lv.use) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(52,211,153,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,244,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#059669' } }, 'The answer to "could a reactor explode like a bomb?"'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'No, and not because of the safety systems. A weapon needs a fast chain reaction in material enriched above about 90%, held together for the microseconds it takes to run. Reactor fuel at 3–5% cannot sustain a fast chain reaction at ANY mass or shape: the U-238 that makes up the other 95% absorbs the fast neutrons before they find a U-235 nucleus. The fuel only works at all because a moderator slows the neutrons down first — and moderated neutrons are far too slow for the runaway a weapon needs. Chernobyl was a steam explosion that wrecked the building, not a nuclear detonation.')
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'This is also why enrichment is what arms-control regimes actually watch. The centrifuge cascade that takes uranium from 0.72% to 5% is most of the way, in separative work, to one that could reach 90% — so the equipment matters more than the material.')
        ),

        // ── 3. shielding ──
        sec('shielding', '#f87171',
          heading('#f87171', '🛡️ 5. What actually stops it'),
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
              verdict = alphaStopped
                ? 'Completely stopped. Alpha particles cannot get through ' + nkFmt(thick, 1) + ' cm of anything — a sheet of paper would do. The danger is never external.'
                : 'Getting through, but only because the shield is thinner than a sheet of paper.';
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
              h('p', { className: 'text-[11px] font-black mt-1', style: { color: rad.colour } },
                nkFmt(through, through < 1 ? 3 : 1) + '% of the ' + rad.name.toLowerCase() + ' gets through ' + nkFmt(thick, 1) + ' cm of ' + shield.name.toLowerCase()),
              h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, verdict));
          })(),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: rad.colour + '60', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: rad.colour } }, rad.symbol + '  ' + rad.name),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, rad.what),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, h('b', null, 'Stopped by: '), rad.stops),
            h('p', { className: 'text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#fca5a5' : '#b91c1c' } }, h('b', null, 'Why it matters: '), rad.danger)),
          h('p', { className: 'text-[11px] mt-2', style: { color: isDark ? '#94a3b8' : '#64748b' } }, shield.note)
        ),

        // ── 4. chain reaction ──
        sec('criticality', '#34d399',
          heading('#34d399', '⚛️ 6. The chain reaction, and what holds it steady'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A uranium-235 nucleus absorbs a neutron, splits, and releases 2 or 3 more. k is how many of those go on to cause another fission. Everything about reactor control is holding k at exactly 1.'),
          slider('nk-rods', 'Control rods in', 0, 100, 1, rods,
            function (e) { upd({ rods: parseFloat(e.target.value) }); }, rods + '%'),
          h('div', { className: 'mt-2 grid grid-cols-3 gap-2' },
            stat('k (neutron multiplication)', kEff.toFixed(3), kState === 'critical' ? '#34d399' : (kState === 'supercritical' ? '#f87171' : '#60a5fa')),
            stat('State', kState, kState === 'critical' ? '#34d399' : (kState === 'supercritical' ? '#f87171' : '#60a5fa')),
            stat('After 12 generations', nkFmt(gens[11], 0) + ' neutrons', '#fbbf24')
          ),
          h('div', { className: 'flex items-end gap-0.5 mt-2', style: { height: '54px' }, 'aria-hidden': 'true' },
            gens.map(function (v, i) {
              var frac = nkClamp(Math.log10(Math.max(1, v)) / 4, 0.02, 1);
              return h('div', { key: i, style: { flex: 1, height: (frac * 100) + '%', background: kState === 'supercritical' ? '#f87171' : (kState === 'critical' ? '#34d399' : '#60a5fa'), borderRadius: '2px 2px 0 0' } });
            })
          ),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'Neutrons per generation, on a log scale. Twelve generations is under a thousandth of a second.'),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            kState === 'critical'
              ? '✅ Critical: k = 1. Every fission causes exactly one more, and power holds steady. This is the normal operating state of every reactor on earth — not a warning word, despite what films suggest.'
              : (kState === 'supercritical'
                ? 'Supercritical: k > 1. Power climbs generation after generation. Reactors do this deliberately and briefly when raising power, then settle back to k = 1. What makes it controllable is that about 0.65% of neutrons arrive SECONDS late, from decaying fission products — without those delayed neutrons no mechanical control could ever keep up.'
                : 'Subcritical: k < 1. The chain dies out. This is a shut-down reactor — though it still needs cooling, because decay heat continues for days. That is precisely what went wrong at Fukushima: the reactors shut down correctly and then could not be cooled.')),
          h('p', { className: 'text-[11px] mt-1.5 font-bold', style: { color: '#34d399' } },
            '🤔 A bomb needs k far above 1 with fast neutrons and over 90% enrichment. Reactor fuel is 3–5%. Why can a power reactor not explode like a weapon, whatever else goes wrong?')
        ),


        // ── binding energy: the one curve behind both ──
        sec('binding', '#38bdf8',
          heading('#38bdf8', '⛰️ 7. One curve explains fission AND fusion'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Binding energy per nucleon is how tightly each particle is held. The curve rises steeply from hydrogen, peaks, then falls slowly. Energy comes out whenever you move DOWNHILL toward that peak — and you can arrive from either side.'),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(56,189,248,0.35)', height: '190px' } },
            h('canvas', { ref: beRef, role: 'img',
              'aria-label': 'Binding energy per nucleon against mass number. It climbs steeply from hydrogen at zero, through helium-4 at 7.07, peaks at nickel-62 at 8.795 MeV, then falls slowly to uranium-238 at 7.57. Light nuclei release energy by fusing up the left slope; heavy nuclei release it by splitting down the right slope.',
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { className: 'text-[10px] mb-2', style: { color: isDark ? '#94a3b8' : '#64748b' } },
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
              stat('Energy released', nkFmt(beRxn.mev, beRxn.mev < 1 ? 6 : 1) + ' MeV', '#fbbf24'),
              stat('Per nucleon', nkFmt(beMevPerNucleon, beMevPerNucleon < 0.001 ? 7 : 2) + ' MeV', '#38bdf8'),
              stat('Mass converted', nkFmt(beMassPct, beMassPct < 0.001 ? 7 : 3) + '%', '#f472b6')
            ),
            h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, beRxn.note),
            h('p', { className: 'text-[11px] mt-1.5 font-mono', style: { color: isDark ? '#94a3b8' : '#64748b' } },
              'E = Δm c², and 1 atomic mass unit = 931.494 MeV. The mass really is missing — weigh the products and they come out lighter than what went in.')
          ),
          h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Fusion of deuterium and tritium releases about 3.5 MeV per nucleon; fission of uranium-235 about 0.85. Fusion wins per nucleon by roughly four to one — which is why it is worth the hundred-million-degree problem.'),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#f59e0b' } }, 'A detail almost every textbook gets slightly wrong'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'The peak is usually given as iron-56. The actual maximum is nickel-62 at ' + bePeak.be.toFixed(3) + ' MeV per nucleon, just above iron-58 and then iron-56 at 8.790. Iron-56 is the most ABUNDANT end point, because stellar burning makes nickel-56 which decays to it — that is a statement about supernovae, not about binding. Both facts are true; they are answers to different questions.')
          ),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: '#38bdf8' } },
            '🤔 Nothing past the peak can release energy by fusing, and nothing before it by splitting. What does that mean for a star once its core is iron and nickel?')
        ),

        // ── personal dose ──
        sec('mydose', '#22d3ee',
          heading('#22d3ee', '🧮 8. Estimate your own annual dose'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everyone is exposed, all the time, mostly from the ground and from radon. Put your own numbers in and see where yours comes from.'),
          slider('ds-alt', 'Home altitude', 0, 3000, 50, dsAlt,
            function (e) { upd({ dsAlt: parseFloat(e.target.value) }); }, nkFmt(dsAlt, 0) + ' m'),
          slider('ds-fly', 'Flying per year', 0, 200, 2, dsFlights,
            function (e) { upd({ dsFlights: parseFloat(e.target.value) }); }, nkFmt(dsFlights, 0) + ' hours'),
          h('p', { className: 'text-[11px] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Radon at home'),
          h('div', { className: 'flex flex-wrap gap-1' },
            RADON_LEVELS.map(function (r) {
              return pill(dsRadon === r.id, '#f87171', r.name, function () {
                upd({ dsRadon: r.id });
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
                h('span', { className: 'text-[11px] font-mono w-16 text-right', style: { color: isDark ? '#94a3b8' : '#64748b' } }, sc.v + ' mSv'),
                h('button', { type: 'button', 'aria-label': 'One fewer ' + sc.name,
                  onClick: function () { var nx = Object.assign({}, dsScans); nx[sc.id] = Math.max(0, n - 1); upd({ dsScans: nx }); },
                  className: 'min-h-11 w-11 rounded-lg text-[11px] font-black',
                  style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '−'),
                h('span', { className: 'text-[11px] font-black w-6 text-center', style: { color: '#22d3ee' } }, n),
                h('button', { type: 'button', 'aria-label': 'One more ' + sc.name,
                  onClick: function () { var nx = Object.assign({}, dsScans); nx[sc.id] = n + 1; upd({ dsScans: nx, doseEstimated: true }); },
                  className: 'min-h-11 w-11 rounded-lg text-[11px] font-black',
                  style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '+'));
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(236,254,255,0.9)' } },
            h('p', { className: 'text-sm font-black mb-1.5', style: { color: '#0891b2' } }, 'About ' + nkFmt(dsTotal, 2) + ' mSv this year'),
            h('div', { role: 'list', className: 'space-y-1' },
              dsParts.filter(function (p) { return p.v > 0; }).sort(function (x, y) { return y.v - x.v; }).map(function (p) {
                return h('div', { key: p.name, role: 'listitem', 'aria-label': p.name + ', ' + p.v.toFixed(2) + ' millisieverts', className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[11px] w-32 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, p.name),
                  h('div', { className: 'flex-1 h-2.5 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                    h('div', { style: { height: '100%', width: Math.max(1, (p.v / Math.max(dsTotal, 0.01)) * 100) + '%', background: p.colour, borderRadius: '999px' } })),
                  h('span', { className: 'text-[11px] font-mono w-14 text-right', style: { color: p.colour } }, p.v.toFixed(2)));
              })
            ),
            h('p', { className: 'text-[11px] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              dsTotal > 6
                ? 'That is well above the 2.4 mSv world average — look at which bar is longest. If it is radon, that is the one worth acting on, and a test kit costs very little.'
                : (dsTotal > 3.5
                  ? 'Somewhat above the 2.4 mSv world average, which is unremarkable. Radon is usually the largest single term and the only one most people can change.'
                  : 'Close to or below the 2.4 mSv world average. Note how little of it is anything anyone chose.')),
            h('p', { className: 'text-[11px] mt-1.5', style: { color: isDark ? '#94a3b8' : '#64748b' } },
              'For scale, the occupational limit is 20 mSv a year and the lowest dose with a clearly measurable cancer link is around 100 mSv.')
          )
        ),

        // ── 5. dose ──
        sec('doseladder', '#fbbf24',
          heading('#fbbf24', '📏 9. How much is a lot? The dose ladder'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Doses span eight orders of magnitude, so this scale is logarithmic — each step along it is ten times the last. Tap any row.'),
          h('div', { role: 'list', className: 'space-y-1' },
            DOSES.map(function (dz, i) {
              var on = d.dosePick === i;
              var frac = nkLogFrac(dz.mSv, 0.0001, 16000);
              var col = dz.mSv >= 1000 ? '#f87171' : (dz.mSv >= 20 ? '#fb923c' : (dz.mSv >= 1 ? '#fbbf24' : '#34d399'));
              return h('button', {
                key: dz.name, type: 'button', role: 'listitem',
                'aria-pressed': on ? 'true' : 'false',
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
                  h('span', { className: 'text-[11px] font-mono', style: { color: col } }, dz.mSv < 1 ? dz.mSv + ' mSv' : nkFmt(dz.mSv, 0) + ' mSv')),
                h('span', { className: 'block h-1.5 rounded-full mt-1', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-1.5 rounded-full', style: { width: Math.max(1.5, frac * 100) + '%', background: col } })),
                on ? h('span', { className: 'block text-[11px] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, dz.note) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#f59e0b' } }, 'Where the science is genuinely unsettled'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Above about 100 mSv, excess cancer risk is measurable in survivor studies. Below it, nobody has been able to measure an effect, because ordinary cancer is far too common to see a small addition against it. Regulators assume risk stays proportional all the way down to zero — the linear no-threshold model — because it is cautious and simple to administer. Whether it is TRUE at low doses is disputed among radiation biologists, and honest sources say so. Be wary of any claim that treats it as settled in either direction.')
          )
        ),

        // ── 6. accidents ──
        sec('accidents', '#f87171',
          heading('#f87171', '📋 10. The three accidents, in the actual numbers'),
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
        sec('reactors', '#38bdf8',
          heading('#38bdf8', '🏭 11. Reactor designs, and where SMRs really stand'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every row says how it works, what makes it safe, and — the part usually left out — what the catch is.'),
          h('div', { className: 'space-y-1' },
            REACTORS.map(function (r) {
              var on = d.reactorPick === r.id;
              var badge = r.status === 'operating' ? '#34d399' : (r.status === 'emerging' ? '#fbbf24' : (r.status === 'legacy' ? '#94a3b8' : '#f472b6'));
              return h('button', {
                key: r.id, type: 'button', 'aria-pressed': on ? 'true' : 'false',
                'aria-label': (on ? 'Hide' : 'Read about') + ' ' + r.name + ', status ' + r.status,
                onClick: function () {
                  upd({ reactorPick: on ? null : r.id });
                  if (!on) pushOnce('reactorsSeen', r.id);
                  if (typeof beep === 'function') beep();
                },
                className: 'w-full text-left rounded-lg px-2.5 py-2 border transition-colors',
                style: on ? { background: '#38bdf81f', borderColor: '#38bdf8' }
                  : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
              },
                h('span', { className: 'flex items-center gap-2 flex-wrap' },
                  h('span', { className: 'text-[11px] font-bold flex-1', style: { color: isDark ? '#fff' : '#1e293b' } }, r.name),
                  h('span', { className: 'text-[10px] font-black px-1.5 py-0.5 rounded-full', style: { color: badge, border: '1px solid ' + badge + '70' } }, r.status),
                  h('span', { className: 'text-[11px] font-bold', style: { color: '#38bdf8' } }, on ? '▾' : '›')),
                h('span', { className: 'block text-[11px] mt-0.5', style: { color: isDark ? '#cbd5e1' : '#64748b' } }, r.share),
                on ? h('span', { className: 'block mt-1.5' },
                  para(r.how),
                  h('span', { className: 'block text-[11px] leading-relaxed mt-1.5', style: { color: isDark ? '#86efac' : '#15803d' } }, h('b', null, 'Safety: '), r.safety),
                  h('span', { className: 'block text-[11px] leading-relaxed mt-1.5', style: { color: isDark ? '#fbbf24' : '#b45309' } }, h('b', null, 'The catch: '), r.catch)
                ) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#f59e0b' } }, 'On small modular reactors specifically'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'The engineering case is real: a small core can be cooled by convection and gravity alone, so a station blackout stops being the scenario that keeps operators awake. Factory production should also beat pouring concrete on site, where Western projects have overrun badly. But as of now almost none are operating commercially — China\'s HTR-PM since 2023, and a Russian floating plant. NuScale had the first US design approval and its flagship project was cancelled in 2023 when projected power costs rose from about $58 to $89 per MWh. Factory economics need order volume that does not yet exist, and several designs need HALEU fuel with a supply chain still being built. The right posture is interested, not convinced.')
          )
        ),


        // ── 8. waste ──
        sec('waste', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', '🗄️ 12. The waste question, taken seriously'),
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
          heading('#84cc16', '⚖️ 13. Compared with the alternatives'),
          h('p', { className: 'text-[11px] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Risk only means something next to the risk of the thing you would do instead. Both charts are full life cycle, including mining, construction and accidents.'),
          h('p', { className: 'text-[11px] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Deaths per terawatt-hour of electricity'),
          h('div', { role: 'list', className: 'space-y-1' },
            DEATHS_TWH.map(function (r) {
              return h('div', { key: r.name, role: 'listitem', 'aria-label': r.name + ', ' + r.v + ' deaths per terawatt hour', className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold w-24 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.name),
                h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('div', { style: { height: '100%', width: Math.max(1, nkLogFrac(r.v, 0.01, 25) * 100) + '%', background: r.colour, borderRadius: '999px' } })),
                h('span', { className: 'text-[11px] font-mono w-12 text-right', style: { color: r.colour } }, r.v));
            })
          ),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } },
            'Logarithmic scale. Markandya & Wilkinson (2007) and Sovacool et al. (2016), compiled by Our World in Data. Nuclear\'s figure includes Chernobyl and Fukushima.'),

          h('p', { className: 'text-[11px] font-bold mt-3 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Lifecycle CO₂, grams per kWh'),
          h('div', { role: 'list', className: 'space-y-1' },
            CO2_KWH.map(function (r) {
              return h('div', { key: r.name, role: 'listitem', 'aria-label': r.name + ', ' + r.v + ' grams CO2 per kilowatt hour', className: 'flex items-center gap-2' },
                h('span', { className: 'text-[11px] font-bold w-24 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.name),
                h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('div', { style: { height: '100%', width: Math.max(1, (r.v / 820) * 100) + '%', background: r.colour, borderRadius: '999px' } })),
                h('span', { className: 'text-[11px] font-mono w-12 text-right', style: { color: r.colour } }, r.v));
            })
          ),
          h('p', { className: 'text-[10px] mt-1', style: { color: isDark ? '#94a3b8' : '#64748b' } }, 'Linear scale. IPCC AR5 Annex III medians.'),

          h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(163,230,53,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(247,254,231,0.9)' } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: '#65a30d' } }, 'What these charts do and do not settle'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'They show that on deaths and on carbon, nuclear sits with wind and solar rather than with fossil fuels — and that is not a close call. They do not settle the argument, because the real objections to nuclear are mostly not about these two numbers. They are about capital cost, build times that have run to a decade or more in the West, waste policy that no country except Finland has finished, and weapons proliferation. Anyone who tells you the deaths-per-TWh chart ends the debate is skipping the parts that are actually hard.')
          ),
          h('p', { className: 'text-[11px] mt-2 font-bold', style: { color: '#84cc16' } },
            '🤔 Coal kills roughly 800 times more people per unit of energy than nuclear, yet nuclear provokes far more fear. What does that tell you about how people weigh a rare, dramatic, involuntary risk against a constant, invisible, familiar one?')
        ),

        // ── reactor operation simulator ──
        sec('operate', '#34d399',
          heading('#34d399', '🎛️ 14. Operate a reactor'),
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
                'aria-label': 'Reactor control panel showing a power trace, fuel temperature, net reactivity in pcm and xenon level. Use the controls below; every reading is also given as text under the panel.',
                style: { width: '100%', height: '100%', display: 'block' } }))
          ),

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
              onClick: function () { setRxUi(Object.assign({}, rxUi, { running: !rxUi.running })); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[11px] font-black',
              style: rxUi.running ? { background: '#f59e0b', color: '#0b1020', border: '1px solid #f59e0b' } : { background: '#059669', color: '#fff', border: '1px solid #059669' }
            }, rxUi.running ? '⏸ Pause' : '▶ Run'),
            h('button', { type: 'button', 'aria-label': 'Scram: drop every control rod immediately',
              onClick: function () {
                rxSet({ scrammed: true, sinceScram: 0, rods: 100, holdOk: 0 });
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR('Scrammed. Fission stopped. Decay heat continues.');
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[11px] font-black text-white',
              style: { background: '#dc2626', border: '1px solid #dc2626' } }, '🛑 SCRAM'),
            h('button', { type: 'button', 'aria-label': 'Reset the reactor to its starting condition',
              onClick: function () { rxRestart(); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold',
              style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '↺ Reset'),
            h('button', { type: 'button', 'aria-pressed': rxRef.current.pumps ? 'true' : 'false',
              'aria-label': rxRef.current.pumps ? 'Stop the coolant pumps' : 'Restore the coolant pumps',
              onClick: function () { rxSet({ pumps: !rxRef.current.pumps }); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[11px] font-bold',
              style: rxRef.current.pumps
                ? { background: 'rgba(96,165,250,0.18)', color: isDark ? '#bfdbfe' : '#1d4ed8', border: '1px solid #60a5fa' }
                : { background: 'rgba(248,113,113,0.18)', color: isDark ? '#fecaca' : '#b91c1c', border: '1px solid #f87171' }
            }, rxRef.current.pumps ? '💧 Pumps on' : '💧 Pumps OFF')
          ),

          h('div', { className: 'flex items-center gap-2 mt-2' },
            h('label', { htmlFor: 'rx-rods', className: 'text-[11px] font-bold w-28 flex-shrink-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Control rods'),
            h('input', { id: 'rx-rods', type: 'range', min: 0, max: 100, step: 1,
              value: rxUi.rodStep,
              'aria-valuetext': rxUi.rodStep + ' percent inserted',
              onChange: function (e) { rxSet({ rods: parseFloat(e.target.value), scrammed: false }); setRxUi(Object.assign({}, rxUi, { rodStep: Math.round(parseFloat(e.target.value) / 5) * 5 })); },
              className: 'flex-1 h-6 accent-emerald-500' }),
            h('span', { className: 'text-[11px] font-bold w-24 text-right', style: { color: isDark ? '#6ee7b7' : '#047857' } }, rxUi.rodStep + '% in')
          ),

          rxUi.verdict ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5',
            style: { borderColor: rxUi.verdict.ok ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)', background: isDark ? 'rgba(15,23,42,0.7)' : (rxUi.verdict.ok ? 'rgba(240,253,244,0.9)' : 'rgba(254,242,242,0.9)') } },
            h('p', { className: 'text-[11px] font-black mb-1', style: { color: rxUi.verdict.ok ? '#059669' : '#dc2626' } }, rxUi.verdict.ok ? '✅ Scenario complete' : '⚠️ Run ended'),
            h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, rxUi.verdict.why),
            h('button', { type: 'button', 'aria-label': 'Reset and try again',
              onClick: function () { rxRestart(); },
              className: 'min-h-11 mt-2 px-3 py-2 rounded-lg text-[11px] font-bold text-white',
              style: { background: '#059669', border: '1px solid #059669' } }, 'Try again')
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
            return p ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: p.color + '80', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.92)' } },
              h('p', { className: 'text-[11px] font-black mb-1', style: { color: p.color } }, p.label),
              h('p', { className: 'text-[11px] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, p.desc)) : null;
          })(),

          h('p', { className: 'text-[10px] mt-2 leading-relaxed', style: { color: isDark ? '#64748b' : '#94a3b8' } },
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
                  h('span', { className: 'ml-auto text-[11px] font-bold', style: { color: '#94a3b8' } }, '→')),
                h('span', { className: 'block text-[11px] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, b.why));
            })
          )
        ),

        h('p', { className: 'text-[10px] mt-3 text-center leading-relaxed', style: { color: isDark ? '#64748b' : '#94a3b8' } },
          'Half-lives from the NNDC chart of nuclides. Attenuation coefficients from NIST XCOM at 1 MeV. Doses from UNSCEAR, ICRP 103 and NCRP 160. Accident figures from UNSCEAR 2008 and 2020/21. Deaths per TWh from Markandya & Wilkinson (2007) and Sovacool et al. (2016) via Our World in Data. Lifecycle CO₂ from IPCC AR5 Annex III. Where a figure is disputed, the tool gives the range rather than choosing.')
      );
    }
  });
})();
