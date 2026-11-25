// ═══════════════════════════════════════════════════════════════════════
// AlloFlow STEAM Lab — Nuclear & Radiation Lab
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
  // Fallback-aware translator reachable from every call site in this tool.
  var __alloCtx_nuclearlab = null;
  var __alloT = function (k, fb) {
    var v;
    try { v = (__alloCtx_nuclearlab && typeof __alloCtx_nuclearlab.t === "function") ? __alloCtx_nuclearlab.t(k, fb) : null; } catch (e) { v = null; }
    return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v;
  };
  if (!window.StemLab || typeof window.StemLab.registerTool !== 'function') return;

  var NK_REVIEWED = '2026-08';
  var NK_SOURCES = {
    nudat: { label: 'NNDC NuDat 3', url: 'https://www.nndc.bnl.gov/nudat3/' },
    nist: { label: 'NIST XCOM', url: 'https://physics.nist.gov/PhysRefData/Xcom/html/xcom1.html' },
    unscear: { label: 'UNSCEAR Fukushima 2020/21', url: 'https://www.unscear.org/unscear/en/publications/2020_2021_2.html' },
    reconstruction: { label: 'Japan Reconstruction Agency disaster-related deaths (2026)', url: 'https://www.reconstruction.go.jp/files/user/topics/main-cat2/sub-cat2-6/20260213_kanrenshi.pdf' },
    mhlw: { label: 'Japan MHLW Fukushima worker health report (2024)', url: 'https://www.mhlw.go.jp/english/topics/2011eq/workers/ri/ar/rat_12th.pdf' },
    nrc: { label: 'NRC radiological-emergency guidance', url: 'https://www.nrc.gov/about-nrc/emerg-preparedness/in-radiological-emerg' },
    iter: { label: 'ITER 2024 baseline', url: 'https://www.iter.org/node/20687/new-baseline-prioritize-robust-start-exploitation' },
    nif: { label: 'LLNL NIF 2022 result', url: 'https://annual.llnl.gov/fy-2022/national-ignition-facility-2022' },
    nuscale: { label: 'NuScale project termination', url: 'https://www.nuscalepower.com/press-releases/2023/utah-associated-municipal-power-systems-and-nuscale-power-agree-to-terminate-the-carbon-free-power-project' },
    icrp103: { label: 'ICRP Publication 103 (2007)', url: 'https://www.icrp.org/publication.asp?id=ICRP%20Publication%20103' },
    inworks: { label: 'INWORKS worker cohort, BMJ 2023', url: 'https://www.bmj.com/content/382/bmj-2022-074520' }
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
      stops: 'Water, concrete or polyethylene — anything full of hydrogen. Lead knocks fast neutrons down but cannot slow them the rest of the way, so on its own it does not finish the job.',
      range: 'Hundreds of metres of air',
      danger: 'Very damaging, and it makes other materials radioactive by being absorbed. Mostly a concern inside an operating reactor.',
      colour: '#34d399', ionising: 4, penetration: 9 }
  ];

  // Linear attenuation coefficients for 1 MeV gamma, cm^-1 (NIST XCOM).
  //
  // sigR is the fast-neutron macroscopic REMOVAL cross-section, cm^-1, for a
  // fission spectrum (Rockwell, Reactor Shielding Design Manual; Chilton,
  // Shultz & Faw). It is a different quantity from mu and it does not behave
  // the way the folk rule predicts: per centimetre, steel and lead remove fast
  // neutrons BETTER than water does. The neutron branch used to paper over
  // that with a made-up 0.02 for every non-hydrogenous material, which got the
  // right teaching answer for the wrong reason and would not survive a student
  // looking the numbers up.
  //
  // The real reason hydrogen wins is the SECOND step. Removing a neutron from
  // the fast group is not stopping it; it has to be slowed all the way to
  // thermal energy before anything will reliably capture it, and how fast that
  // happens depends on what it is bouncing off. modA is the mass number of the
  // nucleus doing that slowing, and the collision count is derived from it
  // below rather than quoted. Two caveats the tool states out loud rather than
  // hiding: removal cross-sections are DEFINED for a shield with hydrogenous
  // material behind it, so a bare lead slab does worse than its sigR suggests;
  // and below roughly 1 MeV lead stops removing neutrons almost entirely,
  // because inelastic scattering has a threshold.
  var SHIELDS = [
    { id: 'air', name: 'Air', mu: 0.0000807, sigR: 0.00004, modA: 14, modName: 'nitrogen',
      note: 'Effectively transparent. This is why distance, not shielding, is the first line of defence.' },
    { id: 'water', name: 'Water', mu: 0.0707, sigR: 0.103, modA: 1, modName: 'hydrogen',
      note: 'A spent-fuel pool is deliberately deep: several metres of water bring the dose at the surface down to background.' },
    { id: 'concrete', name: 'Concrete', mu: 0.149, sigR: 0.089, modA: 1, modName: 'hydrogen',
      note: 'Cheap, structural, and works on both gamma and neutrons. Reactor biological shields are metres thick.' },
    { id: 'steel', name: 'Steel', mu: 0.470, sigR: 0.158, modA: 56, modName: 'iron',
      note: 'Dense and strong. Used where a shield also has to hold pressure.' },
    { id: 'lead', name: 'Lead', mu: 0.771, sigR: 0.118, modA: 207, modName: 'lead',
      note: 'The densest practical shield. Thin lead does what thick concrete does — which is why aprons are lead, not concrete.' }
  ];

  // Average logarithmic energy decrement: the mean fractional step down in
  // ln(E) a neutron takes per elastic collision. Pure kinematics of a billiard
  // ball hitting a heavier one, so it follows from the mass number alone.
  //   xi = 1 + a·ln(a)/(1-a),  a = ((A-1)/(A+1))²
  // Hydrogen is the special case: a = 0, and a head-on hit can take ALL of the
  // neutron's energy, which no heavier nucleus can do.
  function nkXi(A) {
    if (A <= 1) return 1;
    var a = Math.pow((A - 1) / (A + 1), 2);
    return 1 + a * Math.log(a) / (1 - a);
  }
  // Collisions to take a 2 MeV fission neutron down to thermal (0.025 eV).
  // Comes out at 18 for hydrogen and about 1,900 for lead — the two-orders-of-
  // magnitude gap that is the actual reason a neutron shield is made of water.
  var NK_THERMAL_SPAN = Math.log(2e6 / 0.025);
  function nkCollisionsToThermal(A) { return NK_THERMAL_SPAN / nkXi(A); }

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


  // ── How risky is a SMALL dose? ─────────────────────────────────────────
  // The dose ladder ends by saying the science below about 100 mSv is
  // unsettled, and then stops. That is the honest place to stop only if the
  // reader has no further use for the question — and almost every nuclear
  // number anyone argues about is downstream of it. The 1 mSv public limit,
  // the 20 mSv worker limit, ALARA, the case for evacuating and the case
  // against it, and BOTH ends of the Chernobyl death range this tool already
  // calls disputed are the same arithmetic run with different assumptions.
  //
  // So this section does not settle it, because it is not settled. It shows
  // the arithmetic, runs it under each model, and then shows why the argument
  // does not resolve: the study needed to measure a small dose directly is
  // larger than any cohort that has ever existed, and it grows as 1/dose².
  //
  // Coefficients are the detriment-adjusted nominal risk coefficients of ICRP
  // Publication 103 (2007), Table 1 — cancer, whole population, 5.5% per
  // sievert. ICRP reaches that figure by HALVING the slope measured in the
  // atomic-bomb survivors, a dose and dose-rate effectiveness factor of 2, so
  // the undiscounted reading of the same data is about 11% per sievert. Both
  // are offered here, because which one holds at low dose rate IS the
  // argument, and a tool that shows only one has taken a side by omission.
  var RISK_MODELS = [
    { id: 'icrp', name: 'Linear no-threshold', short: 'LNT (ICRP)', coeff: 0.055, threshold: 0, colour: '#a78bfa',
      who: 'ICRP, the US NRC, the EPA, and every national regulator. Every dose limit in this tool comes from it.',
      says: 'Risk is proportional to dose all the way down to zero, with no safe threshold. Half the dose, half the risk — never none.',
      forIt: 'It fits the atomic-bomb survivor data well above 100 mSv, it is simple to administer, and it errs in the direction that protects people. The pooled study of over 300,000 nuclear workers exposed slowly across whole careers (INWORKS) finds a dose-response consistent with a straight line rather than with a threshold.',
      against: 'Below about 100 mSv it is an extrapolation, not a measurement. It is routinely applied several orders of magnitude outside the range where anyone has tested it.' },
    { id: 'direct', name: 'Linear, with no low-dose-rate discount', short: 'Linear, no discount', coeff: 0.11, threshold: 0, colour: '#f87171',
      who: 'No regulator, but it is the reading a number of epidemiologists defend.',
      says: 'The same straight line without ICRP\'s factor-of-two discount for dose delivered slowly. Exactly twice the risk of the row above, at every dose.',
      forIt: 'That discount is a judgement call, not a measurement. Studies of workers who accumulated their dose slowly have not found the reduction it assumes.',
      against: 'Radiobiology gives real reasons to expect slow dose to do less harm: repair machinery has time to work between hits, and a dose spread over a career is not the same insult as the same dose in one second.' },
    { id: 'threshold', name: 'Threshold at 100 mSv', short: 'Threshold', coeff: 0.055, threshold: 100, colour: '#fbbf24',
      who: 'No major body uses it to set limits. It has genuine support among some radiobiologists.',
      says: 'Below the lowest dose at which an effect has ever been measured, the risk is zero — repair clears the damage completely.',
      forIt: 'Cells demonstrably repair radiation damage, and the body carries a very large natural rate of DNA damage from ordinary metabolism that it deals with continuously.',
      against: 'No threshold dose has ever been demonstrated; 100 mSv is where measurement runs out, not where an effect was shown to stop. "We cannot detect it" and "it is zero" are different claims, and this model treats them as one.' },
    { id: 'hormesis', name: 'Hormesis', short: 'Hormesis', coeff: null, threshold: 0, colour: '#34d399',
      who: 'A minority position. No health body adopts it, and none of the death projections quoted in public debate are built on it.',
      says: 'Small doses are net BENEFICIAL, because they stimulate repair and immune response by more than they damage.',
      forIt: 'Adaptive response is real and reproducible in the laboratory: a small priming dose measurably reduces the damage a later large one does.',
      against: 'It has no agreed dose-response coefficient, so there is nothing to multiply a population by — which is why this row returns NO NUMBER rather than a small one. That is the honest output, and it is also the model\'s central weakness: a model that cannot produce a falsifiable population prediction cannot be checked against one.' }
  ];

  // people × dose each. The last two exist to be compared: identical
  // arithmetic, and only one of the answers means anything.
  var COLLECTIVE_CASES = [
    { id: 'ct', name: 'One person, one CT of the abdomen', people: 1, mSv: 10, colour: '#fbbf24',
      note: 'A single identifiable person and a dose a hundred times their daily background. This is the scale the models were built to talk about, and the number that comes out is a genuine, if small, personal risk to weigh against the reason for the scan.' },
    { id: 'liquidators', name: '530,000 Chernobyl recovery workers, 120 mSv each', people: 530000, mSv: 120, colour: '#f87171',
      note: 'The case where the arithmetic earns its keep — and the check on it. UNSCEAR puts the average dose to the recovery operation workers at roughly 120 mSv, which is above the line where excess cancer has actually been observed. Run it and you get about three and a half thousand; the Chernobyl Forum\'s published projection for the most exposed groups is around four thousand. The same calculation, on the same population, lands where the experts landed. Keep that in mind for the rows further down, where it does not.' },
    { id: 'crew', name: '100,000 aircrew, 3 mSv a year for 20 years', people: 100000, mSv: 60, colour: '#22d3ee',
      note: 'A defensible use of the arithmetic. These are monitored people with individually meaningful doses, classed as radiation workers in much of Europe for exactly this reason, and the projection is used to decide rostering and dose tracking rather than to count bodies.' },
    { id: 'city', name: 'A city of 1 million, 1 mSv each after a release', people: 1000000, mSv: 1, colour: '#fb923c',
      note: 'The emergency-planning case. One millisievert each is small individually and large collectively, and this is exactly the calculation an authority runs to compare sheltering against evacuating. Treat the answer as a planning quantity for comparing OPTIONS, not as a prediction of identifiable deaths.' },
    { id: 'europe', name: '500 million people, 0.05 mSv each', people: 500000000, mSv: 0.05, colour: '#f472b6',
      note: 'The shape of the Europe-wide Chernobyl calculation, and the reason the published projections range so widely. A dose of 0.05 mSv is well under the amount by which natural background differs between one town and the next — so the model is being asked about a difference nobody could detect, across a population nobody could follow.' },
    { id: 'banana', name: 'Everyone on Earth eats a banana a day for a year', people: 8000000000, mSv: 0.0365, colour: '#a3e635',
      note: 'The reductio, and it is not a joke — the arithmetic is identical to the row above it. The true answer is zero for TWO independent reasons: the calculation is outside any range the model was validated in, and your body holds potassium at a set point, so eating more of it does not raise your potassium-40 burden at all. Any method that returns thousands of deaths here is not a method you can trust in the row above.' }
  ];

  function nkProjected(model, people, mSvEach) {
    if (!model || model.coeff == null) return null;                 // hormesis: no coefficient, no number
    if (model.threshold && mSvEach < model.threshold) return 0;
    return people * (mSvEach / 1000) * model.coeff;
  }

  // ── Why the argument does not resolve ──────────────────────────────────
  // Not "scientists disagree", which explains nothing. To SEE an excess you
  // need an exposed cohort and a matched control group large enough that a
  // difference this small is not noise, and ordinary cancer is common: about a
  // quarter of people die of one regardless. Standard two-proportion sizing at
  // 5% significance and 80% power gives the number per group, and because the
  // excess enters squared in the denominator, the requirement grows as the
  // INVERSE SQUARE of the dose. Ten times smaller dose, a hundred times the
  // people. That single fact is the whole reason the low-dose question stays
  // open, and it is arithmetic a student can check.
  var NK_BASE_CANCER = 0.25;     // lifetime cancer mortality, order of 1 in 4
  var NK_Z_ALPHA = 1.959964;     // two-sided, alpha = 0.05
  var NK_Z_BETA = 0.8416212;     // 80% power
  function nkCohortNeeded(mSv, coeff) {
    var excess = (mSv / 1000) * (coeff == null ? 0.055 : coeff);
    if (!(excess > 0)) return Infinity;
    var p1 = NK_BASE_CANCER, p2 = Math.min(0.999, p1 + excess);
    return (Math.pow(NK_Z_ALPHA + NK_Z_BETA, 2) * (p1 * (1 - p1) + p2 * (1 - p2))) / Math.pow(p2 - p1, 2);
  }

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
    { sym: 'Po-214', hl: '164 microseconds',kind: 'alpha', note: 'Blink and it is gone. Half-lives in this chain span about 21 orders of magnitude, from microseconds to billions of years.' },
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
  //    disaster-related-death count and worker-compensation reports. These are
  //    different evidence categories and are not presented as a causal tally. ──
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
      toll: 'No deaths from acute radiation. UNSCEAR has documented no adverse health effects among residents that can be directly attributed to radiation exposure. Japan has granted workers’ compensation for several cancers after the accident, including fatal cases; the health ministry explicitly says an award does not prove that radiation caused an individual cancer. Separately, Japan’s Reconstruction Agency records 2,350 disaster-related deaths in Fukushima Prefecture through 2025, a legal category covering illness after injury or the physical burden of evacuation life. It is not a count of radiation deaths, nor can every case be assigned to one evacuation decision.',
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
  // A saved list that is not an array must count as EMPTY, never as its own
  // length. `(d.x || []).length` LOOKS like a guard and is not: a string has
  // .length, so a corrupted save holding ten characters satisfied every
  // >= 3/4/5 check in questHooks and handed the learner 19 of the 25 quests
  // without touching the tool. Numbers, booleans and objects fall to 0 here
  // rather than throwing.
  function nkQuestList(value) { return Array.isArray(value) ? value : []; }

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

  // ── Time, distance, shielding. Sections 5 and 13 cover two of the three
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

  // Integrate a source whose activity falls exponentially. Treating a short-
  // lived medical isotope as a constant rate makes its lifetime dose grow
  // without limit and can produce a misleading time-to-dose result.
  function nkIntegratedDose(initialRate, hours, halfLifeHours) {
    if (!(initialRate > 0) || !(hours > 0)) return 0;
    if (!(halfLifeHours > 0) || !isFinite(halfLifeHours)) return initialRate * hours;
    var lambda = Math.LN2 / halfLifeHours;
    return initialRate * (-Math.expm1(-lambda * hours)) / lambda;
  }
  function nkTimeToDose(initialRate, targetDose, halfLifeHours) {
    if (!(targetDose > 0)) return 0;
    if (!(initialRate > 0)) return Infinity;
    if (!(halfLifeHours > 0) || !isFinite(halfLifeHours)) return targetDose / initialRate;
    var lambda = Math.LN2 / halfLifeHours;
    var lifetimeDose = initialRate / lambda;
    if (targetDose >= lifetimeDose) return Infinity;
    return -Math.log1p(-targetDose / lifetimeDose) / lambda;
  }

  // Energies in MeV, yields per decay, including the K X-rays — leaving those
  // out puts technetium 25% low, because μ_en/ρ for air at 18 keV is twenty
  // times what it is at 140 keV.
  var PROTECT_SOURCES = [
    { id: 'tc99m', name: 'Someone who has just had a bone scan', nuclide: 'Tc-99m', gbq: 0.8, halfLifeH: 6.01,
      lines: [[0.1405, 0.885], [0.0185, 0.074]], colour: '#22d3ee',
      note: 'A routine diagnostic injection. The question people actually ask — can I sit next to them, can they hug their child — has a number, and it is a reassuring one. Its 6-hour physical half-life and 1-day biological one (section 9) do the rest within a day.' },
    { id: 'i131', name: 'A patient treated for thyroid cancer', nuclide: 'I-131', gbq: 5.5, halfLifeH: 8.02 * 24,
      lines: [[0.3645, 0.817], [0.6370, 0.072], [0.2843, 0.061], [0.7229, 0.018], [0.0296, 0.039]], colour: '#fbbf24',
      note: 'Seven times the activity of the scan above and a harder gamma, which is why these patients are kept in a shielded room for a few days and sent home with rules about distance and time. This is the one case where a hospital hands a family the same three levers this section is about.' },
    { id: 'cs137', name: 'An industrial thickness gauge', nuclide: 'Cs-137', gbq: 37, halfLifeH: 30.05 * 365.25 * 24,
      lines: [[0.6617, 0.851], [0.032, 0.058]], colour: '#a78bfa',
      note: 'A sealed 1-curie source in a steel housing on a production line, measuring how thick the sheet passing under it is. Perfectly safe shuttered; the accidents happen when a source is left unshuttered and someone works next to it not knowing.' },
    { id: 'co60', name: 'A sterilisation source', nuclide: 'Co-60', gbq: 37, halfLifeH: 5.27 * 365.25 * 24,
      lines: [[1.1732, 0.9985], [1.3325, 0.9998]], colour: '#f87171',
      note: 'Same activity in becquerels as the gauge above and four times the dose rate, because cobalt emits two hard gammas per decay rather than one soft one — the becquerel-versus-dose distinction from section 13, now in units that matter. A real irradiator holds tens of thousands of times this, behind metres of concrete.' }
  ];
  // Where the numbers land, for the stay-time readout.
  var DOSE_LIMITS = [
    { id: 'public', name: 'Public annual limit', mSv: 1 },
    { id: 'worker', name: 'Worker annual limit', mSv: 20 },
    { id: 'sick', name: 'Radiation sickness begins', mSv: 1000 }
  ];

  // ── Shelter or evacuate. Fukushima's radiation-health findings, worker
  //    compensation decisions and disaster-related-death count are different
  //    evidence categories. The section keeps them separate, then gives the
  //    reader a way to compare the narrower dose paths in a classroom model.
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

  // ── Evidence challenge. The lab is deliberately full of qualified claims:
  //    model versus measurement, point source versus real geometry, and
  //    "not detected" versus "zero". A learner can read every number here and
  //    still miss that distinction, so the final activity asks for an evidence
  //    verdict rather than another calculation. The third verdict is essential:
  //    uncertainty is a scientific result, not a wrong answer waiting to be
  //    forced into true or false.
  var EVIDENCE_VERDICTS = [
    { id: 'supported', label: 'Supported by this evidence', short: 'Supported' },
    { id: 'contradicted', label: 'Contradicted by this evidence', short: 'Contradicted' },
    { id: 'uncertain', label: 'Not settled by this evidence', short: 'Not enough evidence' }
  ];
  var EVIDENCE_CLAIMS = [
    { id: 'reactor-bomb', section: 'enrichment', verdict: 'contradicted',
      claim: 'If every control rod is withdrawn, a power reactor can detonate like a nuclear weapon.',
      evidence: 'Power-reactor fuel is only about 3–5% uranium-235 and depends on moderated neutrons. It cannot sustain the fast, compact chain reaction a weapon requires. A badly controlled reactor can overheat or drive steam and chemical explosions, but those are different mechanisms.',
      takeaway: 'The strongest verdict names the mechanism, not just the outcome.' },
    { id: 'inverse-square', section: 'protect', verdict: 'supported',
      claim: 'For an ideal point gamma source in open air, doubling the distance cuts the dose rate to one quarter.',
      evidence: 'The same radiation is spread over four times the area when distance doubles, so the point-source model gives 1/d². A nearby extended source, walls, and scattered radiation can depart from that clean rule.',
      takeaway: 'A model can support a claim when its assumptions travel with it.' },
    { id: 'low-dose-zero', section: 'lowdose', verdict: 'uncertain',
      claim: 'Because studies cannot resolve a cancer effect below about 100 mSv, the risk below that dose must be zero.',
      evidence: 'Ordinary cancer is common, so a small added risk is statistically hard to separate from noise. The available evidence cannot distinguish a true zero from an effect too small for existing cohorts to measure.',
      takeaway: 'No detected effect is not the same statement as no effect.' },
    { id: 'neutron-layers', section: 'shielding', verdict: 'supported',
      claim: 'A layered fast-neutron shield can outperform lead alone because slowing and capturing neutrons are separate jobs.',
      evidence: 'Hydrogen-rich material removes energy efficiently through repeated collisions; a capture layer can then absorb the slowed neutrons. Dense lead can scatter fast neutrons, but by itself it is poor at finishing the long trip to thermal energy.',
      takeaway: 'The evidence supports the claim by separating two physical steps.' },
    { id: 'short-count', section: 'detect', verdict: 'uncertain',
      claim: 'One short Geiger count slightly above background proves that a weak radioactive source is present.',
      evidence: 'Both background and source counts fluctuate randomly. One small excess may be an ordinary fluctuation; repeated or longer counts, a matched background, and an uncertainty estimate are needed before the source can be distinguished.',
      takeaway: 'A measurement without uncertainty cannot carry the word “proves.”' }
  ];

  // Keep reflective writing out of the 21-section parent render. A controlled
  // textarea on that parent would rebuild every chart and simulator on each
  // keystroke, which is a poor writing experience on a modest device. This
  // small child owns the draft; only Save or Clear touches persisted tool data.
  function NKReflectionEditor(props) {
    var React = props.React;
    var h = React.createElement;
    var confidenceOptions = [
      { id: 'building', label: 'Still building the idea' },
      { id: 'growing', label: 'More confident' },
      { id: 'explain', label: 'Ready to explain it' }
    ];
    var saved = props.saved && typeof props.saved === 'object' ? props.saved : {};
    var savedConfidence = confidenceOptions.some(function (option) {
      return option.id === saved.confidence;
    }) ? saved.confidence : '';
    var savedIdea = typeof saved.idea === 'string' ? saved.idea.slice(0, 280) : '';
    var savedQuestion = typeof saved.question === 'string' ? saved.question.slice(0, 280) : '';
    var stConfidence = React.useState(savedConfidence);
    var confidence = stConfidence[0], setConfidence = stConfidence[1];
    var stIdea = React.useState(savedIdea);
    var idea = stIdea[0], setIdea = stIdea[1];
    var stQuestion = React.useState(savedQuestion);
    var question = stQuestion[0], setQuestion = stQuestion[1];
    var stNotice = React.useState('');
    var notice = stNotice[0], setNotice = stNotice[1];
    var firstConfidenceRef = React.useRef(null);
    var key = props.routeKey;
    var headingId = 'nk-reflection-heading-' + key;
    var helpId = 'nk-reflection-help-' + key;
    var ideaId = 'nk-reflection-idea-' + key;
    var ideaCountId = ideaId + '-count';
    var questionId = 'nk-reflection-question-' + key;
    var questionCountId = questionId + '-count';
    var savedHas = !!(savedConfidence || savedIdea || savedQuestion);
    var draftHas = !!(confidence || idea.trim() || question.trim());
    var dirty = confidence !== savedConfidence
      || idea.trim() !== savedIdea
      || question.trim() !== savedQuestion;
    var canSave = draftHas && dirty;
    var dark = props.isDark;
    var bodyInk = dark ? '#e2e8f0' : '#334155';
    var quietInk = dark ? '#cbd5e1' : '#475569';
    var fieldBackground = dark ? 'rgba(15,23,42,0.82)' : '#fff';
    var fieldBorder = '#64748b';

    function changed(setter, value) {
      setter(value);
      if (notice) setNotice('');
    }
    function submit(event) {
      event.preventDefault();
      if (!canSave) return;
      var cleanIdea = idea.trim();
      var cleanQuestion = question.trim();
      setIdea(cleanIdea);
      setQuestion(cleanQuestion);
      setNotice('Reflection saved with your lab progress.');
      props.onSave({
        confidence: confidence,
        idea: cleanIdea,
        question: cleanQuestion
      });
    }
    function clearReflection() {
      // The Clear button disappears after this update. Hand focus to a control
      // that remains in the form so keyboard users are not dropped on <body>.
      if (firstConfidenceRef.current && firstConfidenceRef.current.focus) {
        firstConfidenceRef.current.focus();
      }
      setConfidence('');
      setIdea('');
      setQuestion('');
      setNotice('Saved reflection cleared.');
      props.onClear();
    }

    var status = notice || (savedHas && !dirty
      ? 'Reflection saved for this route.'
      : (dirty ? 'Unsaved changes.' : 'Nothing saved yet.'));

    return h('section', {
      'data-nk-reflection': key,
      'aria-labelledby': headingId,
      className: 'mt-3 rounded-xl border p-3',
      style: {
        borderColor: 'rgba(34,211,238,0.58)',
        background: dark ? 'rgba(8,47,73,0.28)' : 'rgba(236,254,255,0.92)'
      }
    },
      h('h5', {
        id: headingId,
        className: 'text-xs font-black',
        style: { color: dark ? '#22d3ee' : '#0e7490' }
      }, props.routeQuestion
        ? (props.routeComplete ? 'Finish your route' : 'Reflect on the evidence so far')
        : 'Capture what you learned'),
      props.routeQuestion
        ? h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: bodyInk } },
            props.routeIcon + ' ' + props.routeQuestion)
        : null,
      h('p', {
        id: helpId,
        className: 'text-[0.6875rem] mt-1 leading-relaxed',
        style: { color: quietInk }
      }, 'Optional. There is no right answer and no score. Your note stays with your lab progress.'
        + (props.routeQuestion && !props.routeComplete && props.routeStepsRemaining
          ? ' You still have ' + props.routeStepsRemaining + ' route step'
            + (props.routeStepsRemaining === 1 ? '' : 's') + ' to open.'
          : '')),
      h('form', { className: 'mt-2', onSubmit: submit },
        h('fieldset', { 'aria-describedby': helpId },
          h('legend', { className: 'text-[0.6875rem] font-black mb-1', style: { color: bodyInk } },
            'How ready are you to explain this question in your own words?'),
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
            confidenceOptions.map(function (option) {
              var selected = confidence === option.id;
              return h('label', {
                key: option.id,
                className: 'min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.6875rem] font-bold cursor-pointer',
                style: selected
                  ? {
                      borderColor: '#22d3ee',
                      background: dark ? 'rgba(34,211,238,0.2)' : 'rgba(207,250,254,0.96)',
                      color: dark ? '#cffafe' : '#164e63'
                    }
                  : {
                      borderColor: fieldBorder,
                      background: fieldBackground,
                      color: bodyInk
                    }
              },
                h('input', {
                  ref: option.id === 'building' ? firstConfidenceRef : undefined,
                  type: 'radio',
                  name: 'nk-reflection-confidence-' + key,
                  value: option.id,
                  'aria-label': option.label,
                  checked: selected,
                  onChange: function () { changed(setConfidence, option.id); },
                  style: {
                    width: '1.15rem',
                    height: '1.15rem',
                    accentColor: '#0891b2',
                    flexShrink: 0
                  }
                }),
                h('span', null, option.label));
            })
          )
        ),
        h('div', { className: 'mt-3' },
          h('label', { htmlFor: ideaId, className: 'block text-[0.6875rem] font-black', style: { color: bodyInk } },
            'One idea I can explain now'),
          h('textarea', {
            id: ideaId,
            value: idea,
            maxLength: 280,
            rows: 3,
            'aria-describedby': helpId + ' ' + ideaCountId,
            onChange: function (event) { changed(setIdea, event.target.value); },
            className: 'mt-1 w-full rounded-lg border p-2.5 text-sm',
            style: {
              minHeight: '5.5rem',
              resize: 'vertical',
              background: fieldBackground,
              borderColor: fieldBorder,
              color: bodyInk
            }
          }),
          h('p', {
            id: ideaCountId,
            className: 'mt-1 text-[0.625rem] text-right',
            style: { color: quietInk }
          }, idea.length + ' of 280 characters')
        ),
        h('div', { className: 'mt-3' },
          h('label', { htmlFor: questionId, className: 'block text-[0.6875rem] font-black', style: { color: bodyInk } },
            'One question I still have (optional)'),
          h('textarea', {
            id: questionId,
            value: question,
            maxLength: 280,
            rows: 3,
            'aria-describedby': helpId + ' ' + questionCountId,
            onChange: function (event) { changed(setQuestion, event.target.value); },
            className: 'mt-1 w-full rounded-lg border p-2.5 text-sm',
            style: {
              minHeight: '5.5rem',
              resize: 'vertical',
              background: fieldBackground,
              borderColor: fieldBorder,
              color: bodyInk
            }
          }),
          h('p', {
            id: questionCountId,
            className: 'mt-1 text-[0.625rem] text-right',
            style: { color: quietInk }
          }, question.length + ' of 280 characters')
        ),
        h('div', { className: 'mt-3 flex flex-wrap items-center gap-2' },
          h('button', {
            type: 'submit',
            disabled: !canSave,
            className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black',
            style: {
              background: '#0e7490',
              border: '1px solid #0e7490',
              color: '#fff',
              opacity: canSave ? 1 : 0.55
            }
          }, savedHas ? 'Save changes' : 'Save reflection'),
          savedHas
            ? h('button', {
                type: 'button',
                onClick: clearReflection,
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                style: {
                  background: 'transparent',
                  border: '1px solid ' + fieldBorder,
                  color: quietInk
                }
              }, 'Clear saved reflection')
            : null,
          h('p', {
            'data-nk-reflection-status': key,
            role: 'status',
            'aria-live': 'polite',
            'aria-atomic': 'true',
            className: 'text-[0.6875rem] font-bold',
            style: { color: dark ? '#a7f3d0' : '#047857' }
          }, status)
        )
      )
    );
  }

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
  var RX_DECAY_K = 0.0781;       // decay-heat coefficient in k*t^-0.2, fitted to published PWR curves
  var RX_TIME_COMPRESSION = 3.5; // scenario pacing, NOT thermal mass: a real core takes ~8 min to reach
                                 // 1200 C adiabatically and hours with water in the vessel. This puts the
                                 // uncooled blackout failure at ~114 s so it fits the 120 s hold.
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

  // Turn the simulator's internal scoring state into learner-facing progress.
  // Keeping this pure makes every phase deterministic to test, while the live
  // panel can write its result directly to the DOM without re-rendering the
  // entire twenty-one-section lab on every physics tick.
  function rxScenarioProgress(s, scen) {
    s = s || {};
    var id = scen && scen.id ? scen.id : (scen || 'steady');
    var power = typeof s.power === 'number' ? s.power : 100;
    var hold = typeof s.holdOk === 'number' ? Math.max(0, s.holdOk) : 0;
    var verdict = s.verdict || null;
    function whole(value, max) {
      return Math.floor(Math.max(0, Math.min(max, value)));
    }
    function ended(value, max) {
      return {
        stage: verdict && verdict.ok ? 'complete' : 'ended',
        value: verdict && verdict.ok ? max : Math.max(0, Math.min(max, value)),
        max: max,
        label: verdict && verdict.ok ? 'Objective complete' : 'Run ended',
        detail: verdict && verdict.ok
          ? 'The scenario objective is complete.'
          : 'Reset the reactor to try this objective again.'
      };
    }

    if (id === 'xenon') {
      var phase = typeof s.phase === 'number' ? s.phase : 0;
      var xenonValue = phase <= 0 ? 0 : (phase === 1 ? 1 + Math.min(1, hold / 90) : 2);
      if (verdict) return ended(xenonValue, 3);
      if (phase <= 0) {
        return {
          stage: 'xenon-lower', value: 0, max: 3,
          label: 'Step 1 of 3 · Lower reactor power',
          detail: 'Power is ' + Math.round(power) + '%. Reach 20% or lower.'
        };
      }
      if (phase === 1 && power > 20) {
        return {
          stage: 'xenon-reset', value: 1, max: 3,
          label: 'Step 2 of 3 · Return to low power',
          detail: 'The continuous hold reset. Reach 20% or lower to restart the 90-second timer.'
        };
      }
      if (phase === 1) {
        return {
          stage: 'xenon-hold', value: 1 + Math.min(1, hold / 90), max: 3,
          label: 'Step 2 of 3 · Hold at low power',
          detail: whole(hold, 90) + ' of 90 continuous seconds at or below 20%.'
        };
      }
      return {
        stage: 'xenon-recover', value: 2, max: 3,
        label: 'Step 3 of 3 · Recover reactor power',
        detail: 'Power is ' + Math.round(power) + '%. Reach above 80%.'
      };
    }

    if (id === 'blackout') {
      var blackoutValue = s.scrammed ? 1 + Math.min(1, hold / 120) : 0;
      if (verdict) return ended(blackoutValue, 2);
      if (!s.scrammed) {
        return {
          stage: 'blackout-scram', value: 0, max: 2,
          label: 'Step 1 of 2 · Stop the chain reaction',
          detail: 'Cooling is offline. Press SCRAM before the fuel overheats.'
        };
      }
      return {
        stage: 'blackout-cool', value: 1 + Math.min(1, hold / 120), max: 2,
        label: 'Step 2 of 2 · Remove decay heat',
        detail: whole(hold, 120) + ' of 120 seconds below 1,200 °C. Restore cooling to survive the hold.'
      };
    }

    var inBand = power >= 95 && power <= 105;
    if (verdict) return ended(hold, 60);
    if (!inBand) {
      return {
        stage: 'steady-reset', value: 0, max: 60,
        label: 'Enter the 95–105% power band',
        detail: 'The continuous timer is at 0 of 60 seconds. Move the rods to return to the target band.'
      };
    }
    return {
      stage: 'steady-hold', value: Math.min(60, hold), max: 60,
      label: 'Hold inside the 95–105% power band',
      detail: whole(hold, 60) + ' of 60 continuous seconds in range.'
    };
  }

  function rxDecayHeat(p0, secs) {
    // Decay heat as k * t^-0.2, the standard teaching form. k = 0.0781 is the
    // least-squares fit to published PWR values after long operation (~5% at
    // 10 s, ~3% at 100 s, ~1.5% at 1 h, ~0.8% at 1 day) and sits within a few
    // percent of each. The curve passes 6.5% about 2.5 s after shutdown, which
    // is the figure the blackout brief quotes. Clamped at 1 s: a power law
    // diverges at zero, and nothing here models the prompt drop before that.
    return p0 * RX_DECAY_K * Math.pow(Math.max(secs, 1), -0.2);
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

    // Blend between stops on a 0..1 scale. The core used to pick its colour
    // from hard thresholds, which meant the last 300 degrees before cladding
    // failure -- more than half the blackout scenario, and the whole point of
    // it -- looked identical to 900 C. Interpolating makes the climb visible
    // while it is happening rather than in two jumps.
    var nkMix = function (a, b, f) {
      var pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
      var ar = (pa >> 16) & 255, ag = (pa >> 8) & 255, ab = pa & 255;
      var br = (pb >> 16) & 255, bg = (pb >> 8) & 255, bb = pb & 255;
      var t = f < 0 ? 0 : (f > 1 ? 1 : f);
      var r = Math.round(ar + (br - ar) * t);
      var g = Math.round(ag + (bg - ag) * t);
      var bl = Math.round(ab + (bb - ab) * t);
      return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
    };
    // Walk a list of [stop, colour] pairs.
    var nkRamp = function (stops, f) {
      if (f <= stops[0][0]) return stops[0][1];
      for (var i = 1; i < stops.length; i++) {
        if (f <= stops[i][0]) {
          var span = stops[i][0] - stops[i - 1][0];
          return nkMix(stops[i - 1][1], stops[i][1], span <= 0 ? 0 : (f - stops[i - 1][0]) / span);
        }
      }
      return stops[stops.length - 1][1];
    };

    var colourOf = function (id) {
      if (contrast) return '#ffffff';
      for (var i = 0; i < RX_PARTS.length; i++) if (RX_PARTS[i].id === id) return RX_PARTS[i].color;
      return '#94a3b8';
    };
    var hasPbr = typeof THREE.MeshPhysicalMaterial === 'function' || typeof THREE.MeshStandardMaterial === 'function';
    var mat = function (id, o) {
      o = o || {};
      var col = new THREE.Color(o.colour || colourOf(id));
      var em = new THREE.Color(o.emissive || '#000000');
      var isTrans = o.opacity != null && o.opacity < 1;
      var op = o.opacity == null ? 1 : o.opacity;
      if (hasPbr && !contrast) {
        var PbrCtor = (o.clearcoat && typeof THREE.MeshPhysicalMaterial === 'function')
          ? THREE.MeshPhysicalMaterial
          : (typeof THREE.MeshStandardMaterial === 'function' ? THREE.MeshStandardMaterial : THREE.MeshPhongMaterial);
        var opts = {
          color: col,
          roughness: o.roughness != null ? o.roughness : 0.42,
          metalness: o.metalness != null ? o.metalness : 0.35,
          transparent: isTrans,
          opacity: op,
          emissive: em,
          emissiveIntensity: o.emissiveIntensity != null ? o.emissiveIntensity : 1
        };
        if (o.depthWrite === false) opts.depthWrite = false;
        if (o.side != null) opts.side = o.side;
        if (o.clearcoat && PbrCtor === THREE.MeshPhysicalMaterial) {
          opts.clearcoat = o.clearcoat;
          opts.clearcoatRoughness = o.clearcoatRoughness != null ? o.clearcoatRoughness : 0.12;
        }
        return new PbrCtor(opts);
      }
      return new THREE.MeshPhongMaterial({
        color: col,
        shininess: contrast ? 0 : (o.shininess != null ? o.shininess : 38),
        specular: contrast ? 0x000000 : 0x6b7c93,
        transparent: isTrans,
        opacity: op,
        emissive: em
      });
    };

    var H = 2.0, R = 1.05;
    // Cherenkov underwater reactor glow intensity: bright electric-cyan in
    // moderated water, intensifying as control rods withdraw and moderating
    // as high-temperature steam voiding displaces the water.
    var cherenkov = Math.max(0.18, Math.min(1, (0.36 + (1 - rodFrac) * 0.64) * (1 - hot * 0.58)));
    var powerFrac = Math.max(0.14, Math.min(1, (1 - rodFrac) * 0.86 + 0.14));
    var tStart = Date.now();
    var rxUniforms = {
      uTime: { value: 2.6 },
      uPower: { value: powerFrac },
      uHot: { value: hot },
      uCherenkov: { value: cherenkov },
      uRodFrac: { value: rodFrac }
    };
    var coreLight = null;
    var coreLightBase = 1.35 * cherenkov + hot * 0.95;
    var fluxDiscs = [];
    var voidAnim = [];

    // containment shell
    var shell = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.55, R + 0.55, H + 1.1, 28, 1, true),
      mat('containment', { opacity: contrast ? 1 : 0.12, roughness: 0.72, metalness: 0.12, depthWrite: false, side: THREE.DoubleSide }));
    anchor.add(shell);
    meshes.containment = shell;
    picks.push(shell);

    // pressure vessel (machined steel alloy cylinder)
    var vessel = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.16, R + 0.16, H + 0.4, 26, 1, true),
      mat('vessel', { opacity: contrast ? 1 : 0.28, roughness: 0.32, metalness: 0.78, clearcoat: 0.35, depthWrite: false, side: THREE.DoubleSide }));
    anchor.add(vessel);
    meshes.vessel = vessel;
    picks.push(vessel);

    // coolant volume, tinted by temperature + electric-cyan Cherenkov sheen
    var coolCol = nkRamp([[0, '#60a5fa'], [0.45, '#38bdf8'], [0.7, '#fb923c'], [1, '#f87171']], hot);
    var coolEmissive = contrast ? '#000000' : nkRamp([[0, '#00c8ff'], [0.45, '#0284c7'], [0.75, '#9a3412'], [1, '#7f1d1d']], hot);
    var coolMat = mat('coolant', {
      colour: contrast ? '#ffffff' : coolCol,
      opacity: contrast ? 1 : 0.19,
      roughness: 0.14,
      metalness: 0.08,
      clearcoat: 0.85,
      clearcoatRoughness: 0.08,
      emissive: coolEmissive,
      emissiveIntensity: 0.32 + cherenkov * 0.38,
      depthWrite: false
    });
    // Subtle GLSL Fresnel Cherenkov rim + rising thermal shimmer on the coolant volume
    if (!contrast && coolMat && typeof coolMat.onBeforeCompile === 'function') {
      coolMat.customProgramCacheKey = function () { return 'nk-coolant-cherenkov-v1'; };
      coolMat.onBeforeCompile = function (shader) {
        shader.uniforms.uNkTime = rxUniforms.uTime;
        shader.uniforms.uNkPower = rxUniforms.uPower;
        shader.uniforms.uNkHot = rxUniforms.uHot;
        shader.uniforms.uNkCherenkov = rxUniforms.uCherenkov;
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nvarying vec3 vNkLocalPos;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvNkLocalPos = position;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>',
            '#include <common>\n' +
            'uniform float uNkTime;\n' +
            'uniform float uNkPower;\n' +
            'uniform float uNkHot;\n' +
            'uniform float uNkCherenkov;\n' +
            'varying vec3 vNkLocalPos;'
          )
          .replace('#include <tonemapping_fragment>',
            'vec3 nkN = normalize(normal);\n' +
            'vec3 nkV = normalize(vViewPosition);\n' +
            'float nkFres = pow(1.0 - max(dot(nkN, nkV), 0.0), 2.4);\n' +
            'float nkWave = 0.5 + 0.5 * sin(vNkLocalPos.y * 9.5 - uNkTime * (2.0 + uNkPower * 2.2) + sin(vNkLocalPos.x * 5.0 + vNkLocalPos.z * 5.0));\n' +
            'vec3 nkRimCol = mix(vec3(0.02, 0.86, 1.0), vec3(1.0, 0.48, 0.24), smoothstep(0.55, 0.95, uNkHot));\n' +
            'gl_FragColor.rgb += nkRimCol * (nkFres * (0.28 + 0.36 * uNkCherenkov) + nkWave * 0.08 * uNkCherenkov);\n' +
            '#include <tonemapping_fragment>'
          );
      };
    }
    var cool = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.05, R + 0.05, H + 0.2, 24), coolMat);
    anchor.add(cool);
    meshes.coolant = cool;
    picks.push(cool);

    // GLSL Volumetric Cherenkov Radiation Core, Neutron-Flux Interference Shells & Pool Caustics
    if (!contrast) {
      var bloomBlend = THREE.AdditiveBlending != null ? THREE.AdditiveBlending : undefined;
      if (typeof THREE.ShaderMaterial === 'function') {
        var nkVolVert = [
          'varying vec2 vUv;',
          'varying vec3 vWorldPos;',
          'varying vec3 vWorldNorm;',
          'varying vec3 vLocalPos;',
          'void main() {',
          '  vUv = uv;',
          '  vLocalPos = position;',
          '  vec4 wp = modelMatrix * vec4(position, 1.0);',
          '  vWorldPos = wp.xyz;',
          '  vWorldNorm = normalize(mat3(modelMatrix) * normal);',
          '  gl_Position = projectionMatrix * viewMatrix * wp;',
          '}'
        ].join('\n');

        var nkCherenkovFrag = [
          'precision mediump float;',
          'uniform float uTime;',
          'uniform float uPower;',
          'uniform float uHot;',
          'uniform float uCherenkov;',
          'uniform float uLayer;',
          'varying vec2 vUv;',
          'varying vec3 vWorldPos;',
          'varying vec3 vWorldNorm;',
          'varying vec3 vLocalPos;',
          'float nkHash(vec2 p) {',
          '  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);',
          '}',
          'float nkNoise(vec2 p) {',
          '  vec2 i = floor(p);',
          '  vec2 f = fract(p);',
          '  vec2 u = f * f * (3.0 - 2.0 * f);',
          '  return mix(',
          '    mix(nkHash(i + vec2(0.0, 0.0)), nkHash(i + vec2(1.0, 0.0)), u.x),',
          '    mix(nkHash(i + vec2(0.0, 1.0)), nkHash(i + vec2(1.0, 1.0)), u.x),',
          '    u.y',
          '  );',
          '}',
          'float nkFbm(vec2 p) {',
          '  float v = 0.0;',
          '  float a = 0.55;',
          '  for (int k = 0; k < 3; k++) {',
          '    v += a * nkNoise(p);',
          '    p = p * 2.03 + vec2(17.3, 9.2);',
          '    a *= 0.5;',
          '  }',
          '  return v;',
          '}',
          'void main() {',
          '  vec3 N = normalize(vWorldNorm);',
          '  vec3 V = normalize(cameraPosition - vWorldPos);',
          '  float ndv = abs(dot(N, V));',
          '  float fres = pow(1.0 - ndv, 1.45);',
          '  float axial = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.78, vUv.y);',
          '  float angle = atan(vLocalPos.z, vLocalPos.x);',
          '  float convSpeed = 0.32 + uPower * 0.38 + uHot * 0.48;',
          '  vec2 plumeUv = vec2(angle * 1.45, vUv.y * 4.2 - uTime * convSpeed);',
          '  float plume = nkFbm(plumeUv + vec2(sin(vUv.y * 6.0 - uTime * 0.9) * 0.28, 0.0));',
          '  float shimmer = 0.5 + 0.5 * sin(vUv.y * 24.0 - uTime * (3.2 + uPower * 2.6) + plume * 4.2);',
          '  float volDensity = mix(0.45 + 0.55 * (1.0 - fres * 0.5), 0.28 + 0.72 * fres, uLayer);',
          '  vec3 deepBlue = vec3(0.04, 0.30, 0.96);',
          '  vec3 elecCyan = vec3(0.0, 0.88, 1.0);',
          '  vec3 hotCore = vec3(0.68, 0.97, 1.0);',
          '  vec3 thermalTint = vec3(1.0, 0.42, 0.16);',
          '  vec3 col = mix(deepBlue, elecCyan, clamp(0.35 + plume * 0.75 - uLayer * 0.25, 0.0, 1.0));',
          '  col = mix(col, hotCore, pow(clamp(plume * shimmer * uPower, 0.0, 1.0), 1.8) * (1.0 - uLayer * 0.5));',
          '  col = mix(col, thermalTint, smoothstep(0.58, 0.98, uHot) * (0.35 + 0.35 * plume));',
          '  float alpha = axial * volDensity * (0.45 + 0.55 * plume + 0.22 * shimmer) * uCherenkov * mix(0.24, 0.10, uLayer);',
          '  gl_FragColor = vec4(col * (0.95 + 0.45 * uPower), clamp(alpha, 0.0, 0.55));',
          '}'
        ].join('\n');

        var cherenkovShells = [
          { rad: R * 0.85, h: H * 0.94, layer: 0.0 },
          { rad: R * 0.99, h: H * 1.04, layer: 0.5 },
          { rad: R * 1.15, h: H * 1.14, layer: 1.0 }
        ];
        for (var ci = 0; ci < cherenkovShells.length; ci++) {
          var cs = cherenkovShells[ci];
          var cShaderOpts = {
            uniforms: {
              uTime: rxUniforms.uTime,
              uPower: rxUniforms.uPower,
              uHot: rxUniforms.uHot,
              uCherenkov: rxUniforms.uCherenkov,
              uLayer: { value: cs.layer }
            },
            vertexShader: nkVolVert,
            fragmentShader: nkCherenkovFrag,
            transparent: true,
            depthWrite: false
          };
          if (bloomBlend != null) cShaderOpts.blending = bloomBlend;
          if (THREE.DoubleSide != null) cShaderOpts.side = THREE.DoubleSide;
          var cMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(cs.rad, cs.rad, cs.h, 32, 1, true),
            new THREE.ShaderMaterial(cShaderOpts)
          );
          anchor.add(cMesh);
        }

        // Concentric Neutron-Flux & Gamma Interference Shells around fuel assemblies
        var nkFluxFrag = [
          'precision mediump float;',
          'uniform float uTime;',
          'uniform float uPower;',
          'uniform float uHot;',
          'uniform float uRodFrac;',
          'uniform float uRingScale;',
          'varying vec2 vUv;',
          'varying vec3 vWorldPos;',
          'varying vec3 vWorldNorm;',
          'varying vec3 vLocalPos;',
          'void main() {',
          '  vec3 N = normalize(vWorldNorm);',
          '  vec3 V = normalize(cameraPosition - vWorldPos);',
          '  float fres = pow(1.0 - abs(dot(N, V)), 1.7);',
          '  float axial = smoothstep(0.02, 0.16, vUv.y) * smoothstep(0.98, 0.84, vUv.y);',
          '  float angle = atan(vLocalPos.z, vLocalPos.x);',
          '  float speed = 2.1 + uPower * 3.1;',
          '  float waveA = sin(vUv.y * 26.0 * uRingScale - uTime * speed);',
          '  float waveB = sin(vUv.y * 14.0 * uRingScale + uTime * (speed * 0.62) + cos(angle * 4.0));',
          '  float interf = pow(max(0.0, 0.5 * (waveA + waveB)), 2.2);',
          '  float latticeHarm = 0.55 + 0.45 * cos(angle * 8.0 - uTime * 0.85);',
          '  float rodMask = mix(1.0, smoothstep(0.95, 0.32, vUv.y), uRodFrac * 0.72);',
          '  vec3 neutronCol = vec3(0.18, 0.96, 0.82);',
          '  vec3 gammaCol = vec3(0.42, 0.68, 1.0);',
          '  vec3 col = mix(gammaCol, neutronCol, clamp(interf * latticeHarm, 0.0, 1.0));',
          '  col = mix(col, vec3(1.0, 0.64, 0.25), smoothstep(0.65, 1.0, uHot) * 0.45);',
          '  float fluxGain = 0.26 + 0.74 * uPower;',
          '  float alpha = axial * rodMask * (0.28 + 0.72 * fres) * interf * latticeHarm * fluxGain * 0.24;',
          '  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.42));',
          '}'
        ].join('\n');

        var fluxShells = [
          { rad: R * 0.56, h: H * 0.96, scale: 1.0 },
          { rad: R * 0.92, h: H * 0.98, scale: 1.35 }
        ];
        for (var fi = 0; fi < fluxShells.length; fi++) {
          var fs = fluxShells[fi];
          var fOpts = {
            uniforms: {
              uTime: rxUniforms.uTime,
              uPower: rxUniforms.uPower,
              uHot: rxUniforms.uHot,
              uRodFrac: rxUniforms.uRodFrac,
              uRingScale: { value: fs.scale }
            },
            vertexShader: nkVolVert,
            fragmentShader: nkFluxFrag,
            transparent: true,
            depthWrite: false
          };
          if (bloomBlend != null) fOpts.blending = bloomBlend;
          if (THREE.DoubleSide != null) fOpts.side = THREE.DoubleSide;
          var fMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(fs.rad, fs.rad, fs.h, 36, 1, true),
            new THREE.ShaderMaterial(fOpts)
          );
          anchor.add(fMesh);
        }

        // Radial neutron-flux interference wave planes + Dancing Cherenkov pool-water surface caustics
        if (typeof THREE.CircleGeometry === 'function') {
          var nkDiscVert = [
            'varying vec2 vUv;',
            'void main() {',
            '  vUv = uv;',
            '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
            '}'
          ].join('\n');

          var nkRadialFluxFrag = [
            'precision mediump float;',
            'uniform float uTime;',
            'uniform float uPower;',
            'uniform float uCherenkov;',
            'uniform float uPhase;',
            'varying vec2 vUv;',
            'void main() {',
            '  vec2 p = vUv * 2.0 - 1.0;',
            '  float r = length(p);',
            '  if (r > 1.0) discard;',
            '  float ang = atan(p.y, p.x);',
            '  float pulse = 0.5 + 0.5 * sin(r * 22.0 - uTime * (2.4 + uPower * 2.8) + uPhase);',
            '  float rings = pow(pulse, 3.6);',
            '  float spokes = 0.6 + 0.4 * cos(ang * 8.0 + r * 6.0 - uTime * 0.7);',
            '  float edge = smoothstep(1.0, 0.72, r) * smoothstep(0.05, 0.22, r);',
            '  vec3 col = mix(vec3(0.05, 0.76, 1.0), vec3(0.32, 1.0, 0.85), rings);',
            '  float alpha = rings * spokes * edge * (0.14 + 0.20 * uPower) * uCherenkov;',
            '  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.36));',
            '}'
          ].join('\n');

          var discHeights = [
            { y: -0.22, phase: 0.0, dir: 1 },
            { y: 0.28, phase: 2.1, dir: -1 }
          ];
          for (var di = 0; di < discHeights.length; di++) {
            var dh = discHeights[di];
            var dOpts = {
              uniforms: {
                uTime: rxUniforms.uTime,
                uPower: rxUniforms.uPower,
                uCherenkov: rxUniforms.uCherenkov,
                uPhase: { value: dh.phase }
              },
              vertexShader: nkDiscVert,
              fragmentShader: nkRadialFluxFrag,
              transparent: true,
              depthWrite: false
            };
            if (bloomBlend != null) dOpts.blending = bloomBlend;
            if (THREE.DoubleSide != null) dOpts.side = THREE.DoubleSide;
            var dMesh = new THREE.Mesh(new THREE.CircleGeometry(R * 0.98, 36), new THREE.ShaderMaterial(dOpts));
            dMesh.rotation.x = -Math.PI / 2;
            dMesh.position.y = dh.y;
            anchor.add(dMesh);
            fluxDiscs.push({ mesh: dMesh, dir: dh.dir });
          }

          // Dancing Cherenkov Pool-Water Surface & Floor Caustics
          var nkCausticFrag = [
            'precision mediump float;',
            'uniform float uTime;',
            'uniform float uPower;',
            'uniform float uCherenkov;',
            'uniform float uGain;',
            'varying vec2 vUv;',
            'float nkCausticLayer(vec2 p, float t) {',
            '  vec2 q = p;',
            '  float acc = 0.0;',
            '  for (int i = 0; i < 3; i++) {',
            '    float fi = float(i) + 1.0;',
            '    q += vec2(',
            '      cos(t * 0.55 * fi + q.y * 1.85) + sin(t * 0.42 - q.x * 1.45),',
            '      sin(t * 0.62 * fi + q.x * 1.75) + cos(t * 0.38 + q.y * 1.55)',
            '    ) * 0.42;',
            '    acc += 1.0 / (0.18 + length(vec2(sin(q.x + t * 0.35), cos(q.y - t * 0.31))));',
            '  }',
            '  return clamp(acc * 0.14, 0.0, 1.0);',
            '}',
            'void main() {',
            '  vec2 p = vUv * 2.0 - 1.0;',
            '  float r = length(p);',
            '  if (r > 1.0) discard;',
            '  float t = uTime * (0.75 + uPower * 0.55);',
            '  float cR = nkCausticLayer(p * 3.15 + vec2(0.03, 0.0), t);',
            '  float cG = nkCausticLayer(p * 3.15, t * 1.02);',
            '  float cB = nkCausticLayer(p * 3.15 - vec2(0.03, 0.02), t * 0.98);',
            '  vec3 caust = vec3(pow(cR, 2.3) * 0.35, pow(cG, 1.9) * 0.92, pow(cB, 1.65) * 1.0);',
            '  float rimGlow = smoothstep(0.62, 0.96, r) * smoothstep(1.0, 0.92, r) * 0.42;',
            '  float mask = smoothstep(1.0, 0.78, r);',
            '  vec3 col = caust + vec3(0.0, 0.84, 1.0) * rimGlow;',
            '  float intensity = (0.34 + 0.66 * uCherenkov) * (0.65 + 0.45 * uPower) * uGain;',
            '  float alpha = mask * (length(caust) * 0.58 + rimGlow * 0.55) * intensity;',
            '  gl_FragColor = vec4(col, clamp(alpha, 0.0, 0.58));',
            '}'
          ].join('\n');

          var causticPlanes = [
            { y: H / 2 + 0.12, gain: 0.95 },
            { y: -H / 2 - 0.10, gain: 0.72 }
          ];
          for (var cpi = 0; cpi < causticPlanes.length; cpi++) {
            var cp = causticPlanes[cpi];
            var cpOpts = {
              uniforms: {
                uTime: rxUniforms.uTime,
                uPower: rxUniforms.uPower,
                uCherenkov: rxUniforms.uCherenkov,
                uGain: { value: cp.gain }
              },
              vertexShader: nkDiscVert,
              fragmentShader: nkCausticFrag,
              transparent: true,
              depthWrite: false
            };
            if (bloomBlend != null) cpOpts.blending = bloomBlend;
            if (THREE.DoubleSide != null) cpOpts.side = THREE.DoubleSide;
            var cpMesh = new THREE.Mesh(new THREE.CircleGeometry(R + 0.04, 40), new THREE.ShaderMaterial(cpOpts));
            cpMesh.rotation.x = -Math.PI / 2;
            cpMesh.position.y = cp.y;
            anchor.add(cpMesh);
          }
        }
      } else if (typeof THREE.MeshBasicMaterial === 'function') {
        var cherenkovLayers = [
          { rad: R * 0.88, h: H * 0.94, col: '#00f0ff', op: 0.16 * cherenkov },
          { rad: R * 1.02, h: H * 1.04, col: '#0ea5e9', op: 0.11 * cherenkov },
          { rad: R * 1.16, h: H * 1.14, col: '#2563eb', op: 0.065 * cherenkov }
        ];
        for (var cbi = 0; cbi < cherenkovLayers.length; cbi++) {
          var cl = cherenkovLayers[cbi];
          var cMatOpts = {
            color: new THREE.Color(cl.col),
            transparent: true,
            opacity: cl.op,
            depthWrite: false
          };
          if (bloomBlend != null) cMatOpts.blending = bloomBlend;
          if (THREE.DoubleSide != null) cMatOpts.side = THREE.DoubleSide;
          var cbMesh = new THREE.Mesh(new THREE.CylinderGeometry(cl.rad, cl.rad, cl.h, 24, 1, true), new THREE.MeshBasicMaterial(cMatOpts));
          anchor.add(cbMesh);
        }
      }
      if (typeof THREE.PointLight === 'function') {
        var coreLightCol = hot > 0.65 ? nkRamp([[0.65, '#38bdf8'], [0.85, '#fb923c'], [1, '#ef4444']], hot) : '#00e5ff';
        coreLight = new THREE.PointLight(new THREE.Color(coreLightCol), coreLightBase, 7.5, 1.8);
        coreLight.position.set(0, 0.05, 0);
        anchor.add(coreLight);
      }
    }

    // Steam voids — a SHAPE channel for temperature, not a colour one.
    // Contrast mode paints the coolant white and the fuel emissive black, so
    // colour carried no heat information there at all, and the blue-to-red ramp
    // is exactly the pair a red-green colour-blind student reads worst at the
    // top of the range. Bubbles appear once the coolant is genuinely hot and
    // multiply as it climbs, which is also what really happens: boiling voids
    // the moderator. Deterministic placement, so the same temperature always
    // draws the same core and a rebuild does not make it shimmer.
    var voidCount = hot <= 0.45 ? 0 : Math.round((hot - 0.45) / 0.55 * 14);
    if (voidCount > 0) {
      var voidGroup = new THREE.Group();
      var voidGeo = new THREE.SphereGeometry(0.05, 6, 5);
      var voidMat = mat('coolant', {
        colour: contrast ? '#000000' : '#e2e8f0',
        opacity: contrast ? 1 : 0.62,
        roughness: 0.15,
        metalness: 0.05,
        emissive: contrast ? '#000000' : '#bae6fd',
        emissiveIntensity: 0.25
      });
      for (var vi = 0; vi < voidCount; vi++) {
        // Golden-angle spiral: even coverage without random(), so successive
        // rebuilds at the same temperature are identical.
        var va = vi * 2.399963;
        var vr = (R - 0.18) * Math.sqrt((vi + 0.5) / voidCount);
        var vyBase = ((vi % 7) / 6 - 0.5) * H * 0.8;
        var vm = new THREE.Mesh(voidGeo, voidMat);
        vm.position.set(Math.cos(va) * vr, vyBase, Math.sin(va) * vr);
        voidGroup.add(vm);
        voidAnim.push({ mesh: vm, baseY: vyBase, speed: 0.22 + (vi % 5) * 0.055 });
      }
      anchor.add(voidGroup);
      meshes.voids = voidGroup;
    }

    // fuel assemblies on a square lattice inside the circle
    var fuelGroup = new THREE.Group();
    var rodGroup = new THREE.Group();
    var fuelGeo = new THREE.CylinderGeometry(0.055, 0.055, H, 10);
    var rodGeo = new THREE.CylinderGeometry(0.045, 0.045, H, 10);
    // Shared PBR metallic materials for fuel cladding (zirconium-gold alloy) & boron-steel control rods
    // Emissive only starts to show once the fuel is genuinely hot, so normal
    // operation still reads as unremarkable -- which is the lesson of the
    // steady scenario. Past that it climbs smoothly to a glowing red.
    var glow = nkRamp([[0, '#000000'], [0.35, '#000000'], [0.6, '#4a2405'],
                       [0.85, '#7f1d1d'], [1, '#dc2626']], hot);
    var fuelMat = mat('fuel', {
      emissive: contrast ? '#000000' : glow,
      emissiveIntensity: 1.25,
      metalness: 0.72,
      roughness: 0.26
    });
    var rodMat = mat('rods', {
      metalness: 0.82,
      roughness: 0.28,
      emissive: contrast ? '#000000' : '#0c4a6e',
      emissiveIntensity: 0.35
    });
    var capMat = mat('vessel', { colour: contrast ? '#ffffff' : '#cbd5e1', metalness: 0.86, roughness: 0.24 });
    var fuelCapGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.06, 10);
    var rodDriveGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.38, 8);
    var gx, gz, px, pz, isRod, m, n = 0;
    for (gx = -4; gx <= 4; gx++) {
      for (gz = -4; gz <= 4; gz++) {
        px = gx * 0.21; pz = gz * 0.21;
        if (Math.sqrt(px * px + pz * pz) > R - 0.08) continue;
        n++;
        isRod = ((gx + 8) % 3 === 0 && (gz + 8) % 3 === 0);
        if (isRod) {
          m = new THREE.Mesh(rodGeo, rodMat);
          // insertion: fully in sits centred, fully out is lifted clear of the core
          m.position.set(px, (1 - rodFrac) * H, pz);
          rodGroup.add(m);
          var drive = new THREE.Mesh(rodDriveGeo, capMat);
          drive.position.set(px, (1 - rodFrac) * H + H / 2 + 0.19, pz);
          rodGroup.add(drive);
        } else {
          m = new THREE.Mesh(fuelGeo, fuelMat);
          m.position.set(px, 0, pz);
          if (api.wantShadow) m.castShadow = true;
          fuelGroup.add(m);
          var fCap = new THREE.Mesh(fuelCapGeo, capMat);
          fCap.position.set(px, H / 2 + 0.02, pz);
          fuelGroup.add(fCap);
        }
      }
    }
    // Core spacer grid rings for crisp fuel-assembly architectural depth
    if (typeof THREE.TorusGeometry === 'function') {
      var gridRingGeo = new THREE.TorusGeometry(R - 0.04, 0.024, 8, 36);
      var gridRingMat = mat('vessel', { colour: contrast ? '#ffffff' : '#94a3b8', metalness: 0.84, roughness: 0.28 });
      [-0.52, 0, 0.52].forEach(function (gy) {
        var gr = new THREE.Mesh(gridRingGeo, gridRingMat);
        gr.rotation.x = Math.PI / 2;
        gr.position.y = gy;
        fuelGroup.add(gr);
      });
    }
    anchor.add(fuelGroup);
    anchor.add(rodGroup);
    meshes.fuel = fuelGroup;
    meshes.rods = rodGroup;
    picks.push(fuelGroup);
    picks.push(rodGroup);

    // upper and lower heads + bolted steel pressure-vessel flanges
    var headGeo = new THREE.CylinderGeometry(R + 0.16, R + 0.16, 0.1, 26);
    var headMat = mat('vessel', { metalness: 0.82, roughness: 0.3 });
    var top = new THREE.Mesh(headGeo, headMat);
    top.position.y = (H + 0.4) / 2;
    anchor.add(top);
    var bot = new THREE.Mesh(headGeo, headMat);
    bot.position.y = -(H + 0.4) / 2;
    anchor.add(bot);
    if (typeof THREE.TorusGeometry === 'function') {
      var flangeGeo = new THREE.TorusGeometry(R + 0.19, 0.055, 10, 32);
      var topFlange = new THREE.Mesh(flangeGeo, capMat);
      topFlange.rotation.x = Math.PI / 2;
      topFlange.position.y = (H + 0.4) / 2;
      anchor.add(topFlange);
      var botFlange = new THREE.Mesh(flangeGeo, capMat);
      botFlange.rotation.x = Math.PI / 2;
      botFlange.position.y = -(H + 0.4) / 2;
      anchor.add(botFlange);
      var baseRing = new THREE.Mesh(new THREE.TorusGeometry(R + 0.56, 0.045, 8, 36), mat('containment', { opacity: contrast ? 1 : 0.42, metalness: 0.35, roughness: 0.6 }));
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = -(H + 1.1) / 2;
      anchor.add(baseRing);
    }

    var rxFrame = function (nowMs, liveSp, isReduced) {
      var reduced = !!(isReduced || api.reduced);
      var tSec = reduced ? 2.6 : (((nowMs - tStart) * 0.001) % 3600);
      rxUniforms.uTime.value = tSec;
      if (coreLight) {
        coreLight.intensity = reduced
          ? coreLightBase
          : coreLightBase * (0.93 + 0.07 * Math.sin(tSec * 2.1) + 0.03 * Math.sin(tSec * 5.3));
      }
      for (var fdi = 0; fdi < fluxDiscs.length; fdi++) {
        fluxDiscs[fdi].mesh.rotation.z = reduced ? 0 : tSec * 0.14 * fluxDiscs[fdi].dir;
      }
      if (voidAnim.length > 0) {
        var halfH = H * 0.4;
        var spanH = H * 0.8;
        for (var vai = 0; vai < voidAnim.length; vai++) {
          var vaItem = voidAnim[vai];
          if (reduced) {
            vaItem.mesh.position.y = vaItem.baseY;
          } else {
            var yOff = ((vaItem.baseY + halfH + tSec * vaItem.speed) % spanH) - halfH;
            vaItem.mesh.position.y = yOff;
          }
        }
      }
    };

    return { meshes: meshes, picks: picks, anchor: anchor, frame: rxFrame };
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

  // BEGIN NUCLEAR EXPERIMENT STUDIO
  function NuclearNucleusBuilder(props) {
    var React = props.ctx.React, h = React.createElement, nt = nkStudioTranslate(props.ctx);
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    function valid(row) { return row && typeof row === 'object' && !Array.isArray(row) && [6, 7].indexOf(row.protons) >= 0 && [6, 7, 8].indexOf(row.neutrons) >= 0; }
    function keyFor(row) { return row.protons + ':' + row.neutrons; }
    function nameFor(row) { return nt('nucleus_name', '{element}-{mass}', { element: row.protons === 6 ? nt('nucleus_carbon', 'Carbon') : nt('nucleus_nitrogen', 'Nitrogen'), mass: row.protons + row.neutrons }); }
    var protons = [6, 7].indexOf(data.protons) >= 0 ? data.protons : 6;
    var neutrons = [6, 7, 8].indexOf(data.neutrons) >= 0 ? data.neutrons : 6;
    var current = { protons: protons, neutrons: neutrons };
    var predictions = [
      { id: 'same', label: nt('nucleus_predict_same', 'It stays carbon') },
      { id: 'changes', label: nt('nucleus_predict_changes', 'It becomes another element') }
    ];
    var prediction = predictions.filter(function (item) { return item.id === data.prediction; })[0];
    var cards = [];
    if (prediction && Array.isArray(data.cards)) data.cards.forEach(function (row) {
      if (!valid(row)) return;
      cards = cards.filter(function (other) { return keyFor(row) !== keyFor(other); }).concat([{ protons: row.protons, neutrons: row.neutrons }]);
    });
    var targets = [{ protons: 6, neutrons: 6 }, { protons: 6, neutrons: 8 }, { protons: 7, neutrons: 8 }];
    var checked = targets.filter(function (target) { return cards.some(function (row) { return keyFor(row) === keyFor(target); }); });
    var eligible = !!prediction && checked.length === targets.length;
    var explained = eligible && data.explanation === 'correct';
    var missing = targets.filter(function (target) { return !cards.some(function (row) { return keyFor(row) === keyFor(target); }); })[0];
    var solved = data.solved === true;
    var comparisons = [
      { id: 'neutrons', first: targets[0], second: targets[1], lesson: nt('nucleus_compare_isotopes', 'Same proton count, different neutron count: two isotopes of carbon.') },
      { id: 'protons', first: targets[1], second: targets[2], lesson: nt('nucleus_compare_elements', 'Same neutron count, different proton count: carbon and nitrogen are different elements.') }
    ].filter(function (pair) {
      return [pair.first, pair.second].every(function (row) { return cards.some(function (saved) { return keyFor(saved) === keyFor(row); }); });
    });
    var comparison = comparisons.filter(function (pair) { return pair.id === data.comparison; })[0] || comparisons[0];
    var rawNoticing = data.noticing && typeof data.noticing === 'object' && !Array.isArray(data.noticing) ? data.noticing : {}, noticing = {};
    ['protons', 'neutrons'].forEach(function (id) { if (['protons', 'neutrons'].indexOf(rawNoticing[id]) >= 0) noticing[id] = rawNoticing[id]; });
    var noticed = comparison && noticing[comparison.id], spotted = !!comparison && noticed === comparison.id;
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var saveRef = React.useRef(null), pendingSaveFocus = React.useRef(false), explanationRef = React.useRef(null);
    var comparisonRef = React.useRef(null), buildRef = React.useRef(null);
    var checkRef = React.useRef(null), pendingCheckFocus = React.useRef(null);
    React.useEffect(function () {
      if (pendingSaveFocus.current && saveRef.current && !saveRef.current.disabled) {
        saveRef.current.focus(); pendingSaveFocus.current = false;
      }
    }, [protons, neutrons]);
    React.useEffect(function () {
      if (pendingCheckFocus.current && comparison && pendingCheckFocus.current === comparison.id && spotted && checkRef.current) checkRef.current.focus();
      pendingCheckFocus.current = null;
    }, [comparison && comparison.id, noticed]);
    function focusSection(ref) {
      if (!ref.current) return;
      ref.current.focus();
      var section = ref.current.parentElement || ref.current;
      if (typeof section.scrollIntoView === 'function') section.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    function reviewComparisons() {
      if (comparison) focusSection(comparisonRef);
    }
    function continueBuilding() {
      if (!buildRef.current) return;
      buildRef.current.parentElement.open = true;
      focusSection(buildRef);
    }
    function reviewExplanation() {
      if (eligible) focusSection(explanationRef);
    }
    function describe(row) { return nt('nucleus_description', '{name}: {protons} protons and {neutrons} neutrons.', { name: nameFor(row), protons: row.protons, neutrons: row.neutrons }); }
    function changeParticle(part, delta) {
      if (!prediction) return;
      var next = { protons: protons, neutrons: neutrons }; next[part] += delta;
      if (!valid(next)) return;
      props.onChange(next); setStatus(describe(next));
    }
    function prepare() {
      if (!prediction || !missing) return;
      pendingSaveFocus.current = true;
      props.onChange({ protons: missing.protons, neutrons: missing.neutrons });
      setStatus(nt('nucleus_prepared', '{name} is ready. Save it to add a comparison.', { name: nameFor(missing) }));
    }
    function save() {
      if (!prediction) return;
      var duplicate = cards.some(function (row) { return keyFor(row) === keyFor(current); });
      props.onChange({ cards: cards.filter(function (row) { return keyFor(row) !== keyFor(current); }).concat([current]) });
      setStatus(describe(current) + ' ' + (duplicate ? nt('nucleus_repeat', 'This nucleus is already in your comparisons.') : nt('nucleus_saved', 'Added to your comparisons.')));
    }
    function explain(correct) {
      if (!eligible) return;
      props.onChange(correct ? { explanation: 'correct', solved: true } : { explanation: 'retry' });
      setStatus(correct ? nt('nucleus_solved_status', 'Nucleus builder complete. Proton count identifies the element; neutron count distinguishes its isotopes.') : nt('nucleus_retry_status', 'Look at the two carbon rows. Which particle count stayed the same?'));
    }
    function notice(part) {
      if (!comparison || ['protons', 'neutrons'].indexOf(part) < 0) return;
      var next = Object.assign({}, noticing); next[comparison.id] = part;
      pendingCheckFocus.current = part === comparison.id && !spotted ? comparison.id : null;
      props.onChange({ noticing: next });
    }
    function savedTable() {
      return h('table', null, h('caption', null, nt('nucleus_caption', 'Save a nucleus to keep its particle counts. Each distinct nucleus has one row.')),
        h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('nucleus_column', 'Nucleus')), h('th', { scope: 'col' }, nt('nucleus_protons', 'Protons')), h('th', { scope: 'col' }, nt('nucleus_neutrons', 'Neutrons')))),
        h('tbody', null, cards.map(function (row) { return h('tr', { key: keyFor(row) }, h('th', { scope: 'row' }, nameFor(row)), h('td', null, row.protons), h('td', null, row.neutrons)); })));
    }
    function comparisonView() {
      return h('div', { className: 'ns-nucleus-comparison', 'data-ns-nucleus-comparison': comparison.id },
        comparisons.length > 1 ? h('div', { className: 'ns-pair-choices', role: 'group', 'aria-label': nt('nucleus_compare_group', 'Choose a saved nucleus comparison') }, comparisons.map(function (item) {
          return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'aria-pressed': comparison.id === item.id, onClick: function () {
            props.onChange({ comparison: item.id });
            setStatus(nt('nucleus_pair_switched', 'Viewing the saved comparison of {first} and {second}.', { first: nameFor(item.first), second: nameFor(item.second) }));
          } }, nt('nucleus_pair_label', '{first} → {second}', { first: nameFor(item.first), second: nameFor(item.second) }));
        })) : h('p', { className: 'ns-result' }, nt('nucleus_pair_label', '{first} → {second}', { first: nameFor(comparison.first), second: nameFor(comparison.second) })),
        h('div', { className: 'ns-pair-chart', role: 'img', 'aria-label': nt('nucleus_compare_picture', '{first}: {firstP} protons and {firstN} neutrons. {second}: {secondP} protons and {secondN} neutrons.', { first: nameFor(comparison.first), firstP: comparison.first.protons, firstN: comparison.first.neutrons, second: nameFor(comparison.second), secondP: comparison.second.protons, secondN: comparison.second.neutrons }) },
          h('div', { className: 'ns-pair-row ns-pair-head' }, h('span', null), h('strong', { className: 'ns-pair-name' }, nameFor(comparison.first)), h('strong', { className: 'ns-pair-name' }, nameFor(comparison.second))),
          ['protons', 'neutrons'].map(function (part) {
            var change = comparison.second[part] - comparison.first[part];
            return h('div', { key: part, className: 'ns-pair-row', 'data-ns-pair-part': part },
              h('div', { className: 'ns-pair-kind' }, h('strong', null, part === 'protons' ? nt('nucleus_protons', 'Protons') : nt('nucleus_neutrons', 'Neutrons')), h('small', null, change === 0 ? nt('nucleus_compare_same_count', 'Same count') : nt('nucleus_compare_added', '+{count}', { count: change }))),
              [comparison.first, comparison.second].map(function (row, i) {
                return h('div', { key: i, className: 'ns-pair-value', 'data-changed': i === 1 && change !== 0, 'data-ns-pair-count': row[part] },
                  h('strong', null, row[part]), h('div', { className: 'ns-pair-marks' }, Array.from({ length: 8 }, function (_, slot) { return h('span', { key: slot, className: 'ns-pair-dot', 'data-filled': slot < row[part], 'aria-hidden': 'true' }); })));
              }));
          })),
        h('p', { className: 'ns-note ns-pair-caption' }, nt('nucleus_compare_caption', 'Each filled dot represents one particle.')),
        h('details', { key: comparison.id, className: 'ns-pair-check', 'data-ns-pair-check': comparison.id, open: !spotted },
          h('summary', { ref: checkRef }, spotted ? comparison.id === 'neutrons' ? nt('nucleus_check_spotted_neutrons', '✓ Neutron count changed') : nt('nucleus_check_spotted_protons', '✓ Proton count changed') : nt('nucleus_check_question', 'Quick check: which count changed?')),
          h('div', { className: 'ns-pair-choices', role: 'group', 'aria-label': nt('nucleus_check_group', 'Which particle count changed between these saved nuclei?') }, ['protons', 'neutrons'].map(function (part) {
            return h('button', { key: part, type: 'button', className: 'ns-choice', 'aria-pressed': noticed === part, onClick: function () { notice(part); } }, part === 'protons' ? nt('nucleus_check_protons', 'Proton count') : nt('nucleus_check_neutrons', 'Neutron count'));
          }))),
        h('p', { className: 'ns-pair-lesson', role: 'status', 'data-ns-pair-feedback': spotted ? 'correct' : noticed ? 'retry' : 'waiting' }, spotted ? comparison.lesson : noticed ? comparison.id === 'neutrons' ? nt('nucleus_check_neutrons_hint', 'Both nuclei have 6 protons. Look at the neutron counts and try again.') : nt('nucleus_check_protons_hint', 'Both nuclei have 8 neutrons. Look at the proton counts and try again.') : ''),
        h('button', { type: 'button', className: 'ns-secondary ns-pair-next', 'data-ns-pair-next': 'true', onClick: missing ? continueBuilding : reviewExplanation },
          missing ? nt('nucleus_compare_continue_build', 'Continue building {name} →', { name: nameFor(missing) }) : explained ? nt('nucleus_compare_review_explanation', 'Review your explanation →') : nt('nucleus_compare_continue_explain', 'Explain these comparisons →')));
    }
    var particles = [];
    for (var i = 0; i < Math.max(protons, neutrons); i++) {
      if (i < protons) particles.push(h('span', { key: 'p' + i, className: 'ns-nucleon', 'data-particle': 'proton', 'aria-hidden': 'true' }, 'p+'));
      if (i < neutrons) particles.push(h('span', { key: 'n' + i, className: 'ns-nucleon', 'data-particle': 'neutron', 'aria-hidden': 'true' }, 'n'));
    }
    return h('div', { 'data-ns-nucleus': 'true' },
      h('button', { type: 'button', className: 'ns-secondary ns-case-back', onClick: function () { props.onView('studio'); } }, nt('case_back', '← Back to introductions')),
      h('div', { className: 'ns-heading' }, h('p', { className: 'ns-eyebrow' }, nt('nucleus_title', 'Nucleus builder')), h('h3', null, nt('nucleus_heading', 'What makes an isotope?')),
        h('p', null, nt('nucleus_goal', 'Start with carbon. Change one kind of particle and watch the name.'))),
      h('div', { className: 'ns-grid' },
        h('div', null,
          h('div', { className: 'ns-scene', 'data-ns-scene': 'nucleus' },
            h('p', { className: 'ns-scene-note' }, nt('nucleus_current', 'Your current nucleus')),
            h('div', { className: 'ns-nucleus-name', 'data-ns-nucleus-name': 'true' }, nameFor(current)),
            h('div', { className: 'ns-nucleus-cluster', role: 'img', 'aria-label': nt('nucleus_picture', '{name} nucleus: {protons} protons and {neutrons} neutrons. Mass number {mass}.', { name: nameFor(current), protons: protons, neutrons: neutrons, mass: protons + neutrons }) }, particles),
            h('div', { className: 'ns-nucleus-counts' }, h('span', null, nt('nucleus_proton_count', '{count} protons', { count: protons })), h('span', null, nt('nucleus_neutron_count', '{count} neutrons', { count: neutrons }))),
            h('p', { className: 'ns-scene-note' }, nt('nucleus_mass', 'Mass number = protons + neutrons')), h('p', { className: 'ns-nucleus-equation', 'data-ns-nucleus-mass': 'true' }, protons + ' + ' + neutrons + ' = ' + (protons + neutrons))),
          h('div', { className: 'ns-notebook ns-nucleus-stop', 'data-ns-nucleus-notebook': 'true' }, h('h5', { ref: comparisonRef, tabIndex: -1, 'data-ns-compare-heading': 'true' }, nt('nucleus_notebook', 'Your saved nuclei')),
            comparison ? comparisonView() : null,
            cards.length ? comparison ? h('details', { className: 'ns-pair-records' }, h('summary', null, nt('nucleus_compare_records', 'Review all saved counts ({count})', { count: cards.length })), savedTable()) : savedTable()
              : h('p', { className: 'ns-note' }, nt('nucleus_empty', 'Save carbon-12 to start your comparison.')))),
        h('div', { className: 'ns-controls' },
          h(NuclearStudioPrediction, { ctx: props.ctx, observed: cards.length > 0, value: prediction && nt('nucleus_prediction_scope', '{choice} when neutrons are added', { choice: prediction.label }) },
            h('h5', null, nt('nucleus_predict_question', 'If you add neutrons to carbon, does its element name change?')),
            h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('nucleus_predict_group', 'Predict what adding neutrons changes') }, predictions.map(function (item) {
              return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'aria-pressed': !!prediction && prediction.id === item.id, disabled: cards.length > 0, onClick: function () { props.onChange({ prediction: item.id, cards: [], noticing: {}, explanation: null }); } }, item.label);
            }))),
          h('details', { className: 'ns-case-tests ns-nucleus-stop', open: !explained }, h('summary', { ref: buildRef, 'data-ns-build-heading': 'true' }, explained ? nt('nucleus_review_build', 'Review your particle changes') : nt('nucleus_build_step', '2 / Build and compare')),
            prediction && missing ? nkStudioGuidance(h, nt,
              keyFor(missing) === '6:6' ? nt('nucleus_guide_start', 'Save carbon-12: 6 protons and 6 neutrons.') : keyFor(missing) === '6:8' ? nt('nucleus_guide_isotope', 'Keep 6 protons. Add two neutrons, then save carbon-14.') : nt('nucleus_guide_element', 'Keep 8 neutrons. Add one proton, then save nitrogen-15.'),
              nt('nucleus_prepare', 'Prepare {name}', { name: nameFor(missing) }), keyFor(missing) !== keyFor(current) ? prepare : null)
              : eligible && !explained ? nkStudioGuidance(h, nt, nt('nucleus_ready_compare', 'Your three nuclei are saved. Review them side by side.'), nt('nucleus_go_compare', 'Review saved comparisons →'), reviewComparisons) : null,
            !prediction ? h('p', { className: 'ns-note' }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
            h('div', { className: 'ns-particle-control', role: 'group', 'aria-label': nt('nucleus_proton_controls', 'Change the proton count') },
              h('p', null, h('strong', null, nt('nucleus_protons', 'Protons')), h('span', null, protons)),
              h('div', { className: 'ns-particle-buttons' }, h('button', { type: 'button', className: 'ns-secondary', disabled: !prediction || protons === 6, onClick: function () { changeParticle('protons', -1); } }, nt('nucleus_remove_proton', '− Proton')), h('button', { type: 'button', className: 'ns-secondary', disabled: !prediction || protons === 7, onClick: function () { changeParticle('protons', 1); } }, nt('nucleus_add_proton', '+ Proton')))),
            h('div', { className: 'ns-particle-control', role: 'group', 'aria-label': nt('nucleus_neutron_controls', 'Change the neutron count') },
              h('p', null, h('strong', null, nt('nucleus_neutrons', 'Neutrons')), h('span', null, neutrons)),
              h('div', { className: 'ns-particle-buttons' }, h('button', { type: 'button', className: 'ns-secondary', disabled: !prediction || neutrons === 6, onClick: function () { changeParticle('neutrons', -1); } }, nt('nucleus_remove_neutron', '− Neutron')), h('button', { type: 'button', className: 'ns-secondary', disabled: !prediction || neutrons === 8, onClick: function () { changeParticle('neutrons', 1); } }, nt('nucleus_add_neutron', '+ Neutron')))),
            h('button', { ref: saveRef, type: 'button', className: 'ns-primary', disabled: !prediction, onClick: save }, nt('nucleus_save', 'Save this nucleus →')),
            prediction ? h('p', { className: 'ns-note', 'data-ns-nucleus-evidence': 'true', style: { marginTop: 12 } }, nt('nucleus_evidence', '{count} of 3 comparison nuclei saved', { count: checked.length })) : null,
            comparison && (missing || explained) ? h('button', { type: 'button', className: 'ns-secondary ns-pair-next', 'data-ns-review-comparisons': 'true', onClick: reviewComparisons }, nt('nucleus_go_compare', 'Review saved comparisons →')) : null),
          h('p', { role: 'status', className: 'ns-note', 'data-ns-nucleus-status': 'true', style: { minHeight: 24, marginTop: 12 } }, status),
          eligible ? h('div', { className: 'ns-explain ns-nucleus-stop', 'data-ns-explain': 'nucleus' }, h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', { ref: explanationRef, tabIndex: -1 }, nt('nucleus_explain_question', 'What determines the element?')),
            h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('nucleus_explain_no', 'Adding neutrons always makes a different element.')),
            h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': explained, onClick: function () { explain(true); } }, nt('nucleus_explain_yes', 'Protons identify the element. Neutrons distinguish its isotopes.')),
            data.explanation === 'retry' ? h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('nucleus_retry', 'Carbon-12 and carbon-14 both have 6 protons. Their neutron counts differ. Compare them with nitrogen-15.')) : null,
            data.explanation === 'retry' ? h('button', { type: 'button', className: 'ns-secondary ns-pair-next', onClick: reviewComparisons }, nt('nucleus_retry_compare', 'Look at the saved comparisons again →')) : null,
            explained ? h('div', { className: 'ns-feedback' }, h('strong', null, nt('nucleus_solved', '✓ Nucleus builder complete')), h('p', null, nt('nucleus_takeaway', 'Same proton count, different neutron count: isotopes of one element. Change the proton count and the element changes.'))) : null,
            explained ? h('button', { type: 'button', className: 'ns-primary', onClick: props.onDecay }, nt('nucleus_continue', 'Continue to the half-life experiment →')) : null) : null,
          h('button', { type: 'button', className: 'ns-secondary', style: { marginTop: 12 }, onClick: function () { props.onChange({ prediction: null, protons: 6, neutrons: 6, cards: [], comparison: 'neutrons', noticing: {}, explanation: null }); setStatus(nt('nucleus_restart_status', 'Builder reset to carbon-12. Your saved takeaway is kept.')); } }, nt('nucleus_restart', 'Restart the builder')),
          nkStudioHint(h, nt, nt('nucleus_hint', 'Compare carbon-12 with carbon-14 first. Keep the protons fixed while changing neutrons. Then keep 8 neutrons while changing the proton count.'), 'nucleus'))),
      solved ? h('div', { className: 'ns-notebook' }, h(NuclearStudioReflection, { ctx: props.ctx, kind: 'nucleus', title: nt('nucleus_title', 'Nucleus builder'), note: data.reflection, onChange: function (note) { props.onChange({ reflection: note }); } })) : null,
      h('details', { className: 'ns-notebook' }, h('summary', null, nt('nucleus_more', 'Connect the names to the science')),
        h('p', { className: 'ns-note' }, nt('nucleus_model', 'The diagram labels a nucleus from its particle counts. The particle positions are schematic. Changing counts here lets you compare nuclei; it does not represent a particular nuclear reaction.')),
        h('p', { className: 'ns-note' }, nt('nucleus_stability', 'Isotopes can be stable or radioactive. Carbon-12 is stable; carbon-14 is radioactive. The half-life experiment explores how a radioactive sample changes over time.')),
        h('a', { href: 'https://www.energy.gov/science/doe-explainsisotopes', target: '_blank', rel: 'noopener noreferrer' }, nt('nucleus_doe_source', 'Source: DOE isotope basics')), ' · ',
        h('a', { href: 'https://www.isotopes.gov/isotope-basics', target: '_blank', rel: 'noopener noreferrer' }, nt('nucleus_nidc_source', 'Source: NIDC isotope notation'))));
  }

  function NuclearSignalInvestigation(props) {
    var React = props.ctx.React, h = React.createElement, nt = nkStudioTranslate(props.ctx);
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var lead = SHIELDS.filter(function (item) { return item.id === 'lead'; })[0];
    var tests = [
      { id: 'closer', distance: 1, thickness: 2, title: nt('case_closer', 'Move closer'), detail: nt('case_closer_detail', 'Move to 1 m. Keep the 2 cm lead shield.'), changed: nt('case_distance_only', 'Distance only') },
      { id: 'unshielded', distance: 2, thickness: 0, title: nt('case_unshielded', 'Remove the lead'), detail: nt('case_unshielded_detail', 'Remove the shield. Keep the detector at 2 m.'), changed: nt('case_shield_only', 'Shield only') },
      { id: 'both', distance: 1, thickness: 0, title: nt('case_undo_both', 'Undo both changes'), detail: nt('case_undo_both_detail', 'Move to 1 m and remove the shield.'), changed: nt('case_two_changes', 'Distance + shield') }
    ];
    function testFor(id) { return tests.filter(function (item) { return item.id === id; })[0]; }
    function signal(setup) { return 100 * Math.exp(-lead.mu * setup.thickness) / (setup.distance * setup.distance); }
    var predictions = [
      { id: 'distance', label: nt('case_predict_distance', 'The extra distance') },
      { id: 'shield', label: nt('case_predict_shield', 'The added lead') },
      { id: 'both', label: nt('case_predict_both', 'Both changes') }
    ];
    var prediction = predictions.filter(function (item) { return item.id === data.prediction; })[0];
    var runs = prediction && Array.isArray(data.runs) ? data.runs.filter(function (id, i, all) { return testFor(id) && all.lastIndexOf(id) === i; }).slice(-3) : [];
    var selected = testFor(data.selected) || tests[0];
    var initial = { distance: 2, thickness: 2 };
    var viewed = runs.indexOf(data.review) >= 0 ? data.review : runs[runs.length - 1];
    var measured = viewed ? testFor(viewed) : initial;
    var rawNoticing = data.noticing && typeof data.noticing === 'object' && !Array.isArray(data.noticing) ? data.noticing : {}, noticing = {};
    runs.forEach(function (id) { if (['distance', 'shield', 'both'].indexOf(rawNoticing[id]) >= 0) noticing[id] = rawNoticing[id]; });
    var changedPart = viewed === 'closer' ? 'distance' : viewed === 'unshielded' ? 'shield' : 'both';
    var noticed = viewed && noticing[viewed], spotted = !!viewed && noticed === changedPart;
    var checked = ['closer', 'unshielded'].filter(function (id) { return runs.indexOf(id) >= 0; });
    var eligible = !!prediction && checked.length === 2;
    var overview = eligible && data.evidenceView === 'effects';
    var explained = eligible && data.explanation === 'correct';
    var solved = data.solved === true;
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var runRef = React.useRef(null), pendingRunFocus = React.useRef(false), explanationRef = React.useRef(null);
    var evidenceRef = React.useRef(null), testsRef = React.useRef(null), pendingEvidenceFocus = React.useRef(null);
    var singleViewRef = React.useRef(null), effectsViewRef = React.useRef(null), pendingViewFocus = React.useRef(false);
    var checkRef = React.useRef(null), pendingCheckFocus = React.useRef(null);
    React.useEffect(function () {
      if (pendingRunFocus.current && runRef.current && !runRef.current.disabled) {
        runRef.current.focus(); pendingRunFocus.current = false;
      }
    }, [selected.id]);
    React.useEffect(function () {
      if (pendingEvidenceFocus.current === viewed && !overview) {
        focusSection(evidenceRef); pendingEvidenceFocus.current = null;
      }
    }, [viewed, overview]);
    React.useEffect(function () {
      if (pendingViewFocus.current) {
        var button = overview ? effectsViewRef.current : singleViewRef.current;
        if (button) button.focus();
        var section = evidenceRef.current && evidenceRef.current.parentElement;
        if (section && typeof section.scrollIntoView === 'function') section.scrollIntoView({ block: 'start', behavior: 'auto' });
        pendingViewFocus.current = false;
      }
    }, [overview]);
    function setEvidenceView(kind) {
      if (!eligible || ['single', 'effects'].indexOf(kind) < 0 || (kind === 'effects') === overview) return;
      pendingViewFocus.current = true;
      props.onChange({ evidenceView: kind });
    }
    function inspectEffect(id) {
      if (!eligible || ['closer', 'unshielded'].indexOf(id) < 0) return;
      pendingEvidenceFocus.current = id;
      review(id);
    }
    React.useEffect(function () {
      if (pendingCheckFocus.current === viewed && spotted) foldCheck();
      pendingCheckFocus.current = null;
    }, [viewed, noticed]);
    function foldCheck() {
      if (!checkRef.current) return;
      checkRef.current.parentElement.open = false;
      checkRef.current.focus();
    }
    function notice(part) {
      if (!viewed || runs.indexOf(viewed) < 0 || ['distance', 'shield', 'both'].indexOf(part) < 0) return;
      if (spotted && part === changedPart) { foldCheck(); return; }
      var next = Object.assign({}, noticing); next[viewed] = part;
      pendingCheckFocus.current = part === changedPart ? viewed : null;
      props.onChange({ noticing: next });
    }
    function focusSection(ref) {
      if (!ref.current) return;
      ref.current.focus();
      var section = ref.current.parentElement || ref.current;
      if (typeof section.scrollIntoView === 'function') section.scrollIntoView({ block: 'start', behavior: 'auto' });
    }
    function reviewEvidence() {
      if (runs.length) focusSection(evidenceRef);
    }
    function continueTesting() {
      if (!testsRef.current) return;
      testsRef.current.parentElement.open = true;
      focusSection(testsRef);
    }
    function reviewExplanation() {
      if (eligible) focusSection(explanationRef);
    }
    function reviewShielding() {
      if (runs.indexOf('unshielded') < 0) return;
      if (viewed === 'unshielded' && !overview) { reviewEvidence(); return; }
      pendingEvidenceFocus.current = 'unshielded';
      review('unshielded');
    }
    function prepareMissing() {
      pendingRunFocus.current = true;
      props.onChange({ selected: missing.id });
    }
    function run() {
      if (!prediction) return;
      var measurement = { runs: runs.filter(function (id) { return id !== selected.id; }).concat([selected.id]), review: selected.id };
      if (data.evidenceView === 'effects') measurement.evidenceView = 'single';
      props.onChange(measurement);
      setStatus(nt('case_measured', '{test}: {percent}% of the original signal. {changed}.', { test: selected.title, percent: signal(selected).toFixed(1), changed: selected.changed }));
    }
    function review(id) {
      if (runs.indexOf(id) < 0) return;
      props.onChange(overview ? { review: id, evidenceView: 'single' } : { review: id });
      setStatus(nt('case_review_status', 'Reviewing {test}: {percent}% of the original signal.', { test: testFor(id).title, percent: signal(testFor(id)).toFixed(1) }));
    }
    function explain(correct) {
      if (!eligible) return;
      props.onChange(correct ? { explanation: 'correct', solved: true } : { explanation: 'retry' });
      setStatus(correct ? nt('case_solved_status', 'Case explained. Both separate comparisons support your conclusion.') : nt('case_retry_status', 'Compare each single change with the original mystery setup. You can revise your explanation.'));
    }
    var missing = checked.indexOf('closer') < 0 ? tests[0] : tests[1];
    var detectorX = measured.distance === 1 ? 320 : 450;
    function overviewContent() {
      return h(React.Fragment, null,
        h('p', { className: 'ns-case-effects-intro' }, nt('case_effects_intro', 'Compare the two single changes with the same mystery setup.')),
        h('div', { className: 'ns-case-chart', role: 'img', 'data-ns-case-overview-chart': 'true', 'aria-label': nt('case_effects_chart_label', 'Saved single-change comparisons on a shared 0 to 100% scale. Mystery setup at 2 m with 2 cm lead: {mystery}%. Distance changed, 2 cm lead kept: {distance}%. Shield changed, distance kept at 2 m: {shield}%.', { mystery: signal(initial).toFixed(1), distance: signal(tests[0]).toFixed(1), shield: signal(tests[1]).toFixed(1) }) },
          [{ id: 'mystery', label: nt('case_mystery_short', 'Mystery setup'), setup: initial, fixed: nt('case_effects_mystery_setup', '2 m · 2 cm lead') },
            { id: 'closer', label: tests[0].title, setup: tests[0], fixed: nt('case_effects_distance_fixed', 'Distance changes · 2 cm lead kept') },
            { id: 'unshielded', label: tests[1].title, setup: tests[1], fixed: nt('case_effects_shield_fixed', 'Shield changes · distance kept at 2 m') }].map(function (row) {
            return h('div', { key: row.id, className: 'ns-case-chart-row', 'data-ns-case-effect': row.id, 'data-ns-case-bar': row.id },
              h('span', null, row.label), h('strong', null, signal(row.setup).toFixed(1) + '%'),
              h('div', { className: 'ns-case-track' }, h('div', { className: 'ns-case-fill', style: { width: signal(row.setup) + '%' } })),
              h('span', { className: 'ns-case-effect-fixed' }, row.fixed));
          }), h('p', { className: 'ns-case-scale' }, nt('case_effects_scale', 'All three bars use the same scale: 0–100%.'))),
        h('div', { className: 'ns-case-effects-actions' },
          h('button', { type: 'button', className: 'ns-secondary', onClick: function () { inspectEffect('closer'); } }, nt('case_effects_inspect_distance', 'Inspect distance test')),
          h('button', { type: 'button', className: 'ns-secondary', onClick: function () { inspectEffect('unshielded'); } }, nt('case_effects_inspect_shield', 'Inspect shielding test'))));
    }
    return h('div', { 'data-ns-investigation': 'signal' },
      h('button', { type: 'button', className: 'ns-secondary ns-case-back', onClick: function () { props.onView('studio'); } }, nt('case_back', '← Back to introductions')),
      h('div', { className: 'ns-heading' }, h('p', { className: 'ns-eyebrow' }, nt('case_title', 'Signal detective')), h('h3', null, nt('case_heading', 'Why did the signal drop?')),
        h('p', null, nt('case_story', 'The detector moved from 1 m to 2 m, and a lead shield was added. The source stayed the same. Separate the two effects with fair comparisons.'))),
      h('div', { className: 'ns-grid' },
        h('div', null,
          h('div', { className: 'ns-scene', 'data-ns-scene': 'investigation' },
            h('div', { className: 'ns-case-baseline' }, nt('case_before', 'Before: 1 m, no shield · '), h('strong', null, '100%')),
            h('p', { className: 'ns-case-source' }, nt('case_fixed_source', 'Source output stays fixed · 1 MeV gamma')),
            !overview ? h(React.Fragment, null, (function () {
              var detPct = Math.max(0, Math.min(100, signal(measured)));
              var detFrac = detPct / 100;
              var hasLead = !!measured.thickness;
              var slabX = 185, slabW = 56;
              return h('svg', { className: 'ns-beam', viewBox: '0 0 500 190', 'aria-hidden': 'true' },
                h('defs', null,
                  h('radialGradient', { id: 'nk-det-src', cx: '50%', cy: '50%', r: '50%' },
                    h('stop', { offset: '0%', stopColor: '#f5f3ff', stopOpacity: 0.95 }),
                    h('stop', { offset: '55%', stopColor: '#a78bfa', stopOpacity: 0.9 }),
                    h('stop', { offset: '100%', stopColor: '#6d28d9', stopOpacity: 0 })),
                  h('linearGradient', { id: 'nk-det-lead', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                    h('stop', { offset: '0%', stopColor: '#475569' }),
                    h('stop', { offset: '50%', stopColor: '#334155' }),
                    h('stop', { offset: '100%', stopColor: '#1e293b' })),
                  h('linearGradient', { id: 'nk-det-atten', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                    h('stop', { offset: '0%', stopColor: '#38bdf8', stopOpacity: 0.55 }),
                    h('stop', { offset: '100%', stopColor: '#2dd4bf', stopOpacity: Math.max(0.06, detFrac * 0.45) })),
                  h('linearGradient', { id: 'nk-det-bar', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
                    h('stop', { offset: '0%', stopColor: '#99f6e4' }),
                    h('stop', { offset: '50%', stopColor: '#2dd4bf' }),
                    h('stop', { offset: '100%', stopColor: '#0d9488' }))),
                h('circle', { cx: 48, cy: 86, r: 42, fill: 'url(#nk-det-src)', opacity: 0.55 }),
                h('circle', { cx: 48, cy: 86, r: 28, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
                h('text', { x: 48, y: 96, fill: '#171131', fontSize: 30, textAnchor: 'middle' }, 'γ'),
                [60, 86, 112].map(function (y) {
                  var midEnd = hasLead ? slabX : detectorX;
                  return h('g', { key: y },
                    h('path', { d: 'M80 ' + y + ' H' + midEnd, stroke: '#38bdf8', strokeWidth: 7, opacity: 0.16, strokeLinecap: 'round' }),
                    h('path', { d: 'M80 ' + y + ' H' + midEnd, stroke: '#c4b5fd', strokeWidth: 2.6, strokeDasharray: '7 5' }),
                    hasLead ? h('path', { d: 'M' + (slabX + slabW) + ' ' + y + ' H' + detectorX, stroke: '#2dd4bf', strokeWidth: 4 + detFrac * 4, opacity: 0.14 + detFrac * 0.18 }) : null,
                    hasLead ? h('path', { d: 'M' + (slabX + slabW) + ' ' + y + ' H' + detectorX, stroke: '#83f5e2', strokeWidth: 1.8 + detFrac * 2, opacity: 0.28 + detFrac * 0.72, strokeDasharray: '7 5' }) : null);
                }),
                h('rect', { x: slabX, y: 30, width: slabW, height: 112, rx: 6, fill: hasLead ? 'url(#nk-det-lead)' : '#10243b', stroke: '#a7d8f2', strokeWidth: 2, strokeDasharray: hasLead ? undefined : '5 5' }),
                hasLead ? h('rect', { x: slabX + 2, y: 46, width: slabW - 4, height: 80, rx: 4, fill: 'url(#nk-det-atten)' }) : null,
                h('text', { x: 213, y: 93, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15, fontWeight: 700 }, hasLead ? '2 cm' : '0 cm'),
                h('rect', { x: detectorX - 4, y: 38, width: 26, height: 98, rx: 8, fill: '#2dd4bf', opacity: 0.1 + detFrac * 0.24 }),
                h('rect', { x: detectorX, y: 42, width: 18, height: 90, rx: 5, fill: 'url(#nk-det-bar)', stroke: '#b8fff2', strokeWidth: 2 }),
                h('path', { d: 'M48 162 H' + detectorX, stroke: '#a7d8f2', strokeWidth: 1 }),
                h('text', { x: (48 + detectorX) / 2, y: 182, textAnchor: 'middle', fill: '#d0e3f5', fontSize: 17 }, measured.distance + ' m'));
            })(),
            h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-case-reading': 'true' }, signal(measured).toFixed(1) + '%'), h('span', null, nt('case_relative', 'of the original expected detector signal'))),
            h('p', { className: 'ns-scene-note', 'data-ns-case-measured': 'true' }, runs.length ? nt('case_review_setup', 'Saved test: {distance} m · {shield}', { distance: measured.distance, shield: measured.thickness ? nt('case_lead_present', '2 cm lead') : nt('case_no_lead', 'no lead') }) : nt('case_mystery_setup', 'Mystery setup: 2 m · 2 cm lead'))) : null,
            runs.length ? h('div', { className: 'ns-case-saved ns-case-stop' },
            h('h5', { ref: evidenceRef, tabIndex: -1, 'data-ns-case-evidence-heading': 'true' }, nt('case_saved_evidence', 'Your saved evidence')),
            eligible ? h('div', { className: 'ns-case-view', role: 'group', 'aria-label': nt('case_view_group', 'View saved signal evidence') },
              h('button', { ref: singleViewRef, type: 'button', className: 'ns-choice', 'aria-pressed': !overview, onClick: function () { setEvidenceView('single'); } }, nt('case_view_single', 'One saved test')),
              h('button', { ref: effectsViewRef, type: 'button', className: 'ns-choice', 'aria-pressed': overview, onClick: function () { setEvidenceView('effects'); } }, nt('case_view_effects', 'Both effects'))) : null,
            overview ? overviewContent() : h(React.Fragment, null,
            runs.length > 1 ? h('label', { className: 'ns-case-review' }, h('span', null, nt('case_review_label', 'Review a saved test')),
              h('select', { 'data-ns-case-review': 'true', value: viewed, onChange: function (event) { review(event.target.value); } }, runs.map(function (id) {
                var item = testFor(id);
                return h('option', { key: id, value: id }, nt('case_review_option', '{test} · {percent}%', { test: item.title, percent: signal(item).toFixed(1) }));
              }))) : null,
            h('div', { className: 'ns-case-chart', role: 'img', 'data-ns-case-chart': 'true', 'aria-label': nt('case_chart_label', 'Expected detector signal on a shared 0 to 100% scale. Mystery setup: {mystery}%. {test}: {reading}%.', { mystery: signal(initial).toFixed(1), test: measured.title, reading: signal(measured).toFixed(1) }) },
              [{ id: 'mystery', label: nt('case_mystery_short', 'Mystery setup'), value: signal(initial) }, { id: 'test', label: measured.title, value: signal(measured) }].map(function (row) {
                return h('div', { key: row.id, className: 'ns-case-chart-row', 'data-ns-case-bar': row.id },
                  h('span', null, row.label), h('strong', null, row.value.toFixed(1) + '%'),
                  h('div', { className: 'ns-case-track' }, h('div', { className: 'ns-case-fill', style: { width: row.value + '%' } })));
              }),
              h('p', { className: 'ns-case-scale' }, nt('case_shared_scale', 'Both bars use the same scale: 0–100%.')),
              h('p', { className: 'ns-scene-note' }, measured.id === 'closer' ? nt('case_distance_fixed', 'Distance changed. The 2 cm lead shield stayed in place.') : measured.id === 'unshielded' ? nt('case_shield_fixed', 'The lead changed. Distance stayed at 2 m.') : nt('case_both_changed', 'Two things changed. Test each separately to see its effect.'))),
            h('details', { key: viewed, className: 'ns-case-check', 'data-ns-case-check': viewed },
              h('summary', { ref: checkRef }, spotted ? changedPart === 'distance' ? nt('case_check_distance', '✓ Distance changed') : changedPart === 'shield' ? nt('case_check_shield', '✓ Shielding changed') : nt('case_check_both', '✓ Both changed together') : nt('case_check_question', 'Quick check: what changed?')),
              h('p', { className: 'ns-case-check-prompt' }, nt('case_check_prompt', 'From the mystery setup (2 m, 2 cm lead), what changed?')),
              h('div', { className: 'ns-case-check-choices', role: 'group', 'aria-label': nt('case_check_prompt', 'From the mystery setup (2 m, 2 cm lead), what changed?') }, [
                { id: 'distance', label: nt('case_distance_only', 'Distance only') }, { id: 'shield', label: nt('case_shield_only', 'Shield only') }, { id: 'both', label: nt('case_two_changes', 'Distance + shield') }
              ].map(function (item) { return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'aria-pressed': noticed === item.id, onClick: function () { notice(item.id); } }, item.label); }))),
            h('p', { className: 'ns-case-check-feedback', role: 'status', 'data-ns-case-check-feedback': spotted ? 'correct' : noticed ? 'retry' : 'waiting' }, spotted ? changedPart === 'distance' ? nt('case_check_distance_lesson', 'Keeping the shield fixed lets you separate the distance effect.') : changedPart === 'shield' ? nt('case_check_shield_lesson', 'Keeping distance fixed lets you separate the shielding effect.') : nt('case_check_both_lesson', 'Two changes together cannot show each effect separately. Use the single-change tests.') : noticed ? changedPart === 'distance' ? nt('case_check_distance_hint', 'The detector moved from 2 m to 1 m. The lead stayed at 2 cm. Try again.') : changedPart === 'shield' ? nt('case_check_shield_hint', 'The lead was removed. The detector stayed at 2 m. Try again.') : nt('case_check_both_hint', 'The detector moved closer and the lead was removed. Count both changes and try again.') : '')),
            h('button', { type: 'button', className: 'ns-secondary ns-case-next', onClick: eligible ? reviewExplanation : continueTesting }, eligible ? explained ? nt('case_revisit_explanation', 'Review your explanation') : nt('case_go_explain', 'Explain these results') : nt('case_continue_testing', 'Continue testing')))
              : h('p', { className: 'ns-scene-note' }, nt('case_mystery_reference', 'Compare each test with the mystery reading: {percent}%.', { percent: signal(initial).toFixed(1) }))),
          h('div', { className: 'ns-notebook', 'data-ns-case-notebook': 'true' }, h('h5', null, nt('case_comparisons', 'Your comparisons')),
            runs.length ? h('table', { className: 'ns-case-table' }, h('caption', null, nt('case_notebook_caption', 'Each test starts from the mystery setup. Repeated tests update their row.')),
              h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('case_test_column', 'Test')), h('th', { scope: 'col' }, nt('case_changed_column', 'Changed')), h('th', { scope: 'col' }, nt('case_signal_column', 'Signal')))),
              h('tbody', null, runs.map(function (id) { var item = testFor(id); return h('tr', { key: id, 'data-ns-case-current': viewed === id, 'aria-current': viewed === id ? 'true' : undefined }, h('th', { scope: 'row' }, item.title), h('td', null, item.changed), h('td', null, signal(item).toFixed(1) + '%')); })))
              : h('p', { className: 'ns-note' }, nt('case_empty', 'Run a test to collect your first comparison.')))),
        h('div', { className: 'ns-controls' },
          h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0, value: prediction && prediction.label },
            h('h5', null, nt('case_predict_question', 'Which changes helped lower the signal?')),
            h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('case_predict_group', 'Predict the cause of the signal drop') }, predictions.map(function (item) {
              return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'aria-pressed': prediction && prediction.id === item.id || false, disabled: runs.length > 0, onClick: function () { props.onChange({ prediction: item.id, runs: [], review: null, noticing: {}, evidenceView: 'single', explanation: null }); } }, item.label);
            }))),
          h('details', { className: 'ns-case-tests ns-case-stop', open: !explained },
          h('summary', { ref: testsRef, 'data-ns-case-tests-heading': 'true' }, explained ? nt('case_review_tests', 'Review your comparison tests') : nt('case_test_step', '2 / Change one thing')),
          prediction && !eligible ? nkStudioGuidance(h, nt, nt('case_next_test', 'Try {test}. Compare its signal with the mystery setup.', { test: missing.title }), nt('case_prepare', 'Prepare {test}', { test: missing.title }), selected.id !== missing.id ? prepareMissing : null)
            : eligible && !explained ? nkStudioGuidance(h, nt, nt('case_ready_explain', 'You checked each effect separately. Use those results to explain the mystery.'), nt('case_review_evidence', 'Review saved evidence'), reviewEvidence) : null,
          h('div', { className: 'ns-case-options', role: 'group', 'aria-label': nt('case_plan_group', 'Choose a comparison test') }, tests.map(function (item) {
            return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'data-ns-case-setup': item.id, 'aria-pressed': selected.id === item.id, disabled: !prediction, onClick: function () { props.onChange({ selected: item.id }); } }, h('strong', null, item.title), h('small', null, item.detail));
          })),
          h('p', { className: 'ns-note', 'data-ns-case-plan': 'true' }, nt('case_planned', 'Planned test: {test}. Run it to record a reading.', { test: selected.title })),
          h('button', { ref: runRef, type: 'button', className: 'ns-primary', disabled: !prediction, onClick: run }, nt('case_run', 'Run this comparison →')),
          !prediction ? h('p', { className: 'ns-note' }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
          runs.indexOf('both') >= 0 ? h('p', { className: 'ns-feedback' }, nt('case_confounded', 'Undoing both restores the signal, but two things changed together. Use the single changes to separate their effects.')) : null,
          prediction ? h('div', { className: 'ns-case-progress', 'data-ns-case-evidence': 'true' }, h('p', null, nt('case_evidence_count', '{count} of 2 separate effects checked', { count: checked.length })),
            h('ul', null, h('li', null, checked.indexOf('closer') >= 0 ? nt('case_distance_checked', '✓ Distance checked: shield kept in place') : nt('case_distance_missing', 'Distance: keep the shield in place')), h('li', null, checked.indexOf('unshielded') >= 0 ? nt('case_shield_checked', '✓ Shield checked: distance kept at 2 m') : nt('case_shield_missing', 'Shield: keep the distance at 2 m'))),
            runs.length && (!eligible || explained) ? h('button', { type: 'button', className: 'ns-secondary ns-case-next', onClick: reviewEvidence }, nt('case_review_evidence', 'Review saved evidence')) : null) : null),
          h('p', { role: 'status', className: 'ns-note', 'data-ns-case-status': 'true', style: { minHeight: 24, marginTop: 12 } }, status),
          eligible ? h('div', { className: 'ns-explain ns-case-stop', 'data-ns-explain': 'investigation' }, h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', { ref: explanationRef, tabIndex: -1 }, nt('case_explain_question', 'What explains the lower signal?')),
            h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('case_explain_no', 'Only distance mattered; the shield did nothing.')),
            h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': explained, onClick: function () { explain(true); } }, nt('case_explain_yes', 'Both distance and shielding reduced what reached the detector.')),
            data.explanation === 'retry' ? h('div', { className: 'ns-feedback', 'data-kind': 'retry' }, h('p', null, nt('case_retry', 'Removing the lead changed the signal while distance stayed at 2 m. What does that tell you?')),
              h('button', { type: 'button', className: 'ns-secondary ns-case-next', onClick: reviewShielding }, nt('case_review_shielding_evidence', 'Review the shielding evidence'))) : null,
            explained ? h('div', { className: 'ns-feedback' }, h('strong', null, nt('case_solved', '✓ Case explained')), h('p', null, nt('case_takeaway', 'Change one thing at a time to see its effect. A lower detector reading can come from the path, even when the source is unchanged.'))) : null) : null,
          h('button', { type: 'button', className: 'ns-secondary', style: { marginTop: 12 }, onClick: function () { props.onChange({ prediction: null, selected: 'closer', runs: [], review: null, noticing: {}, evidenceView: 'single', explanation: null }); setStatus(nt('case_reset_status', 'Mystery reset. Your saved takeaway is kept.')); } }, nt('case_reset', 'Restart the investigation')),
          nkStudioHint(h, nt, nt('case_hint', 'Compare the 2 m detector with and without lead. Then compare 1 m and 2 m while keeping the lead.'), 'investigation'))),
      solved ? h('div', { className: 'ns-notebook' }, h(NuclearStudioReflection, { ctx: props.ctx, kind: 'investigation', title: nt('case_title', 'Signal detective'), note: data.reflection, onChange: function (note) { props.onChange({ reflection: note }); } })) : null,
      h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
        h('p', { className: 'ns-note' }, nt('case_model', 'These are expected relative readings for an ideal point source of 1 MeV gamma photons. The model combines inverse-square spreading with the lab’s lead attenuation coefficient. It omits background counts and photons scattered into the detector.')),
        h('p', { className: 'ns-note' }, nt('case_formula', 'Signal relative to the original 1 m setup = (1 m / distance)² × exp(−μ × lead thickness).')),
        h('p', { className: 'ns-note' }, nt('case_coefficient', 'Here, μ is {mu} per centimetre in the lab’s lead model. Lead thickness is in centimetres.', { mu: lead.mu })),
        h('a', { href: 'https://www.osha.gov/ionizing-radiation/control-prevention', target: '_blank', rel: 'noopener noreferrer' }, nt('case_source_distance', 'Source: OSHA distance and shielding')), ' · ',
        h('a', { href: 'https://physics.nist.gov/PhysRefData/XrayMassCoef/chap2.html', target: '_blank', rel: 'noopener noreferrer' }, nt('nist_source', 'Source: NIST attenuation model'))),
      h('details', { className: 'ns-notebook' }, h('summary', null, nt('case_review', 'Review an idea first')),
        h('p', { className: 'ns-note' }, nt('case_review_help', 'Your investigation stays saved while you revisit an introduction.')),
        h('div', { className: 'ns-case-help' }, h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onIntro('distance'); } }, nt('case_review_distance', 'Review distance')), h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onIntro('shield'); } }, nt('case_review_shield', 'Review shielding')))));
  }

  function nkStudioDistanceIntensity(metres) { return 100 / (metres * metres); }

  function NuclearFirstDiscovery(props) {
    var ctx = props.ctx || {};
    var React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
    var canSpeak = typeof ctx.callTTS === 'function';
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var predictions = [
      { id: 'half', label: nt('distance_half', 'Half as much') },
      { id: 'quarter', label: nt('distance_quarter', 'One quarter') },
      { id: 'same', label: nt('distance_same', 'No change') }
    ];
    var prediction = predictions.filter(function (item) { return item.id === data.prediction; })[0];
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (value, i, all) { return [1, 2, 4].indexOf(value) >= 0 && all.indexOf(value) === i; }).slice(-3);
    var near = !!prediction && runs.indexOf(1) >= 0, far = !!prediction && runs.indexOf(2) >= 0;
    var eligible = near && far;
    var done = eligible && data.explanation === 'correct';
    var comparisonState = React.useState(false), showPrediction = eligible && comparisonState[0], setComparison = comparisonState[1];
    var predictedPercent = prediction ? { half: 50, quarter: 25, same: 100 }[prediction.id] : null;
    var stage = !prediction ? 'predict' : !near ? 'near' : !far ? 'far' : done ? 'done' : 'explain';
    var number = stage === 'predict' ? 1 : stage === 'near' ? 2 : stage === 'far' ? 3 : 4;
    var last = prediction && runs.length ? runs[runs.length - 1] : null;
    var position = [1, 2, 4].indexOf(data.setting) >= 0 ? data.setting : 1;
    var prepared = stage === 'far' && position === 2;
    var differentPosition = last !== null && last !== position;
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var headingRef = React.useRef(null), pendingFocus = React.useRef(false), readingRef = React.useRef(null), pendingMoveFocus = React.useRef(false);
    React.useEffect(function () {
      var target = pendingMoveFocus.current && prepared ? readingRef.current : pendingFocus.current ? headingRef.current : null;
      if (target) {
        target.focus();
        var section = headingRef.current && headingRef.current.parentElement;
        if (section && typeof section.scrollIntoView === 'function') section.scrollIntoView({ block: 'start', behavior: 'auto' });
      }
      pendingFocus.current = false;
      pendingMoveFocus.current = false;
    }, [stage, position]);
    function predict(id) {
      if (stage !== 'predict' || !predictions.some(function (item) { return item.id === id; })) return;
      pendingFocus.current = true;
      props.onChange({ prediction: id });
      setStatus(nt('first_prediction_kept', 'Prediction kept. Take your first reading at 1 m.'));
    }
    function move() {
      if (stage !== 'far' || prepared) return;
      pendingMoveFocus.current = true;
      props.onChange({ setting: 2 });
      setStatus(nt('first_move_status', 'Detector moved to 2 m. The saved reading stays at {distance} m. Take a new reading when you are ready.', { distance: last }));
    }
    function read() {
      if (!prediction || (stage !== 'near' && stage !== 'far') || (stage === 'far' && !prepared)) return;
      var target = stage === 'near' ? 1 : 2;
      pendingFocus.current = true;
      props.onChange({ setting: target, step: 0, runs: runs.filter(function (value) { return value !== target; }).concat([target]) });
      setStatus(nt('distance_result', 'At {distance}, the intensity is {percent}% of the 1 m reading.', { distance: target + ' m', percent: nkStudioDistanceIntensity(target) }));
    }
    function explain(correct) {
      if (!eligible || stage !== 'explain') return;
      pendingFocus.current = !!correct;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('first_retry', 'The source stayed fixed. Compare 100% at 1 m with 25% at 2 m, then try again.'));
    }
    function restart() {
      if (stage === 'predict') return;
      pendingFocus.current = true;
      setComparison(false);
      props.onChange({ prediction: null, setting: 1, step: 0, runs: [], explanation: null });
      setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.'));
    }
    var titles = {
      predict: nt('first_predict_heading', 'What will happen at twice the distance?'),
      near: nt('first_near_heading', 'First, read at 1 m'),
      far: prepared ? nt('first_prepared_heading', 'Read at 2 m') : nt('first_far_heading', 'Now, move to 2 m'),
      explain: nt('first_explain_heading', 'What did these readings show?'),
      done: nt('first_done_heading', 'You made your first comparison')
    };
    var scene = eligible ? h('div', { className: 'ns-scene ns-first-evidence', 'data-ns-scene': 'distance' },
      h('p', { className: 'ns-scene-note' }, nt('first_same_source', 'Same source. Only distance changed.')),
      h('div', { className: 'ns-first-compare', role: 'group', 'aria-label': nt('first_compare_group', 'Compare saved readings or your prediction') },
        h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': !showPrediction, 'data-ns-first-compare': 'readings', onClick: function () { setComparison(false); } }, nt('first_compare_readings', 'Saved readings')),
        h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': showPrediction, 'data-ns-first-compare': 'prediction', onClick: function () { setComparison(true); } }, nt('first_compare_prediction', 'My prediction'))),
      h('div', { className: 'ns-case-chart', role: 'img', 'data-ns-first-chart': 'true', 'aria-label': showPrediction
        ? nt('first_prediction_chart', 'At 2 m: your prediction, {predicted}%; saved reading, {measured}%. Both bars use a 0 to 100% scale. The source output stayed fixed.', { predicted: predictedPercent, measured: nkStudioDistanceIntensity(2) })
        : nt('first_chart_label', 'Saved readings on a shared 0 to 100% scale: 1 m, {near}%; 2 m, {far}%. The source output stayed fixed.', { near: nkStudioDistanceIntensity(1), far: nkStudioDistanceIntensity(2) }) },
        (showPrediction ? [
          { id: 'predicted', label: nt('first_predicted_at_two', 'Your prediction at 2 m'), percent: predictedPercent },
          { id: 'measured', label: nt('first_measured_at_two', 'Saved reading at 2 m'), percent: nkStudioDistanceIntensity(2) }
        ] : [1, 2].map(function (value) { return { id: value, label: value + ' m', percent: nkStudioDistanceIntensity(value) }; })).map(function (row) {
          return h('div', { key: row.id, className: 'ns-case-chart-row', 'data-ns-first-bar': showPrediction ? undefined : row.id, 'data-ns-prediction-bar': showPrediction ? row.id : undefined },
            h('span', null, row.label), h('strong', null, row.percent + '%'),
            h('div', { className: 'ns-case-track ns-first-scale', 'data-ns-first-scale': 'true' }, h('div', { className: 'ns-case-fill', style: { width: row.percent + '%' } }), h('div', { className: 'ns-first-scale-cuts', 'aria-hidden': 'true' }, [25, 50, 75].map(function (value) { return h('span', { key: value, style: { left: value + '%' } }); }))));
        }), h('p', { className: 'ns-case-scale' }, nt('case_shared_scale', 'Both bars use the same scale: 0–100%.'))),
      showPrediction ? h('p', { className: 'ns-scene-note', role: 'status', 'data-ns-first-prediction-result': predictedPercent === nkStudioDistanceIntensity(2) ? 'matched' : 'different' }, predictedPercent === nkStudioDistanceIntensity(2)
        ? nt('first_prediction_matched', 'Your prediction matched the saved reading at 2 m: {percent}%.', { percent: nkStudioDistanceIntensity(2) })
        : nt('first_prediction_different', 'Your prediction: {predicted}%. Saved reading: {measured}%.', { predicted: predictedPercent, measured: nkStudioDistanceIntensity(2) })) : null)
      : h('div', { className: 'ns-scene', 'data-ns-scene': 'distance' },
        h('div', { className: 'ns-scene-top' }, h('span', null, nt('point_source', 'Point source • fixed output')), h('span', { 'data-ns-first-position': position }, nt('first_detector_position', 'Detector: {distance} m', { distance: position }))),
        h('svg', { className: 'ns-beam', viewBox: position === 4 || last === 4 ? '0 0 440 185' : '0 0 300 185', role: 'img', 'data-ns-first-position-image': 'true',
          'aria-label': last === null ? nt('first_position_empty', 'Source output fixed. Detector at {position} m. No reading recorded yet.', { position: position }) : nt('first_position_saved', 'Source output fixed. Detector at {position} m. Saved reading at {saved} m: {percent}%.', { position: position, saved: last, percent: nkStudioDistanceIntensity(last) }) },
          [75, 150, 300].map(function (radius) { return h('circle', { key: radius, cx: 55, cy: 80, r: radius, fill: 'none', stroke: '#719cbd', strokeWidth: 1.5, strokeDasharray: '5 5' }); }),
          h('g', { className: 'ns-first-source-unit', 'data-ns-first-apparatus': 'source', 'aria-hidden': 'true' },
            h('rect', { x: 27, y: 47, width: 56, height: 66, rx: 12, fill: '#263451', stroke: '#a995dc', strokeWidth: 1.5 }),
            h('path', { d: 'M34 54 h3 M73 54 h3 M38 120 h34', stroke: '#c5b6f1', strokeWidth: 3, strokeLinecap: 'round' })),
          h('circle', { cx: 55, cy: 80, r: 23, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
          h('text', { x: 55, y: 88, fill: '#171131', fontSize: 24, textAnchor: 'middle' }, 'γ'),
          h('path', { d: position === 4 || last === 4 ? 'M55 138 H400' : 'M55 138 H260', stroke: '#bed4eb', strokeWidth: 2 }),
          (position === 4 || last === 4 ? [1, 2, 4] : [1, 2]).map(function (value) { return h('g', { key: value }, h('path', { d: 'M' + (55 + value * 75) + ' 132 V145', stroke: '#bed4eb', strokeWidth: 2 }), h('text', { x: 55 + value * 75, y: 172, textAnchor: 'middle', fill: '#edf5ff', fontSize: 17 }, value + ' m')); }),
          differentPosition ? h('g', null,
            h('rect', { 'data-ns-first-detector': 'saved', 'data-distance': last, x: 45 + last * 75, y: 51, width: 20, height: 58, rx: 5, fill: 'none', stroke: '#bed4eb', strokeWidth: 2, strokeDasharray: '5 5' }),
            h('text', { x: 55 + last * 75, y: 45, textAnchor: 'middle', fill: '#edf5ff', fontSize: 17 }, nt('first_marker_saved', 'Saved'))) : null,
          prepared && differentPosition ? h('path', { 'data-ns-first-movement': 'true', d: 'M' + (55 + last * 75) + ' 24 H' + (55 + position * 75) + ' m' + (position > last ? -6 : 6) + ' -5 l' + (position > last ? 6 : -6) + ' 5 l' + (position > last ? -6 : 6) + ' 5', fill: 'none', stroke: '#fbbf24', strokeWidth: 3 }) : null,
          h('g', { className: 'ns-first-detector-unit', 'data-ns-first-apparatus': 'detector', 'aria-hidden': 'true' },
            h('rect', { x: 39 + position * 75, y: 49, width: 32, height: 62, rx: 8, fill: '#173447', stroke: '#87bdc5', strokeWidth: 1.5 }),
            h('path', { d: 'M' + (55 + position * 75) + ' 112 v8 m-12 0 h24', stroke: '#87bdc5', strokeWidth: 3, strokeLinecap: 'round' })),
          h('rect', { 'data-ns-first-detector': 'current', 'data-distance': position, x: 45 + position * 75, y: 51, width: 20, height: 58, rx: 5, fill: '#65e2ce', stroke: '#b8fff2', strokeWidth: 2 }),
          differentPosition ? h('text', { x: 55 + position * 75, y: 45, textAnchor: 'middle', fill: '#edf5ff', fontSize: 17 }, nt('first_marker_now', 'Now')) : null),
        h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, last ? nkStudioDistanceIntensity(last) + '%' : '—'), h('span', null, nt('distance_relative', 'of the intensity at 1 m'))),
        h('p', { className: 'ns-scene-note' }, last ? nt('first_saved_reading', 'Saved reading at {distance} m', { distance: last }) : nt('first_position_no_reading', 'No reading saved yet.')));
    var steps = [
      { id: 'predict', label: nt('first_step_predict', 'Predict'), checked: !!prediction },
      { id: 'near', label: nt('first_step_near', 'Read at 1 m'), checked: near },
      { id: 'far', label: nt('first_step_far', 'Read at 2 m'), checked: far },
      { id: 'explain', label: nt('first_step_explain', 'Explain'), checked: done }
    ];
    return h('div', { className: 'ns-first', 'data-ns-first-discovery': stage },
      h('ol', { className: 'ns-first-progress', 'aria-label': nt('first_progress', 'Your first discovery: completed, current, and next steps') }, steps.map(function (item, index) {
        var current = !done && item.id === stage;
        return h('li', { key: item.id, 'data-state': item.checked ? 'done' : current ? 'current' : 'next', 'aria-current': current ? 'step' : undefined },
          h('strong', null, (index + 1) + '. ' + item.label), h('span', null, item.checked ? nt('first_step_done', '✓ Done') : current ? nt('first_step_now', 'Now') : nt('first_step_next', 'Next')));
      })),
      h('section', { className: 'ns-controls ns-first-stage', 'data-ns-first-stage': stage, 'aria-labelledby': 'ns-first-heading' },
        h('p', { className: 'ns-step' }, done ? nt('first_complete', 'Comparison complete') : nt('first_position', 'Step {number} of 4', { number: number })),
        h('h4', { id: 'ns-first-heading', ref: headingRef, tabIndex: -1, 'data-ns-first-heading': 'true' }, titles[stage]),
        prediction ? h('p', { className: 'ns-note ns-first-prediction' }, nt('prediction_summary', 'Your prediction: {choice}', { choice: prediction.label })) : null,
        stage !== 'predict' ? scene : null,
        stage === 'predict' ? h(React.Fragment, null,
          h('p', null, nt('distance_prediction', 'Move from 1 m to 2 m. How much intensity will the detector read?')),
          h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, predictions.map(function (item) { return h('button', { key: item.id, type: 'button', className: 'ns-choice', onClick: function () { predict(item.id); } }, h('span', null, item.label), h('svg', { className: 'ns-first-guess', viewBox: '0 0 100 12', 'aria-hidden': 'true', focusable: 'false', 'data-ns-first-guess': item.id }, h('rect', { x: 0, y: 1, width: 100, height: 10, rx: 3, fill: 'none', stroke: 'currentColor', strokeWidth: 1 }), h('rect', { x: 0, y: 1, width: { half: 50, quarter: 25, same: 100 }[item.id], height: 10, rx: 3, fill: 'currentColor' }))); })),
          h('p', { className: 'ns-note' }, nt('first_predict_hint', 'Choose what seems likely. The readings will help you check it.')), scene)
          : stage === 'near' || stage === 'far' ? h(React.Fragment, null,
            h('p', null, stage === 'near' ? nt('first_near_prompt', 'Record the starting reading before moving the detector.') : prepared ? nt('first_position_ready', 'The detector is at 2 m. Take a new reading to compare with your saved 1 m result.') : nt('first_far_prompt', 'Keep the source fixed. Move the detector to twice the distance and record a new reading.')),
            stage === 'far' && !prepared ? h('button', { type: 'button', className: 'ns-primary', onClick: move, 'data-ns-first-move': '2' }, nt('first_move_far', 'Move detector to 2 m →'))
              : h('button', { key: stage, ref: readingRef, type: 'button', className: 'ns-primary', onClick: read, 'data-ns-first-run': stage }, stage === 'near' ? position === 1 ? nt('first_read_near', 'Take a reading at 1 m →') : nt('first_near_move', 'Move to 1 m and take a reading →') : nt('first_read_prepared', 'Take a reading at 2 m →')))
            : stage === 'explain' ? h('div', { className: 'ns-explain', 'data-ns-explain': 'distance' },
              h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('distance_explain_no', 'Moving the detector makes the source emit less.')),
              h('button', { type: 'button', className: 'ns-choice', onClick: function () { explain(true); } }, nt('distance_explain_yes', 'The same output spreads over a larger area.')),
              data.explanation === 'retry' ? (function () {
                var diag = nkDiagnoseMisconception('distance', 'source-weaker', 'quarter');
                return h('div', null,
                  h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('first_retry', 'The source stayed fixed. Compare 100% at 1 m with 25% at 2 m, then try again.')),
                  h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': 'distance' }, diag.whyNot),
                  canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_distance_coaching', 'Read inverse-square coaching aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null);
              })() : null)
              : (function () {
                var diag = nkDiagnoseMisconception('distance', prediction ? prediction.id : 'quarter', 'quarter');
                return h('div', null,
                  h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')),
                  h('p', null, nt('distance_discovery', 'Doubling the distance gave 25% of the original intensity.')),
                  h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': 'distance-done' }, diag.whyNot),
                  canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_distance_debrief', 'Read distance discovery debrief aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null,
                  h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel));
              })(),
        h('p', { className: 'ns-first-status ns-note', role: 'status' }, status)),
      h('div', { className: 'ns-first-exits' },
        h('button', { type: 'button', className: 'ns-secondary', onClick: props.onExplore }, nt('first_explore', 'Explore distance freely')),
        stage !== 'predict' ? h('button', { type: 'button', className: 'ns-secondary', onClick: restart }, nt('intro_restart', 'Start again')) : null),
      h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
        h('p', { className: 'ns-note' }, nt('distance_model', 'For an ideal point source, intensity follows 1 / distance². The reference reading at 1 m is 100%. The model leaves out absorption, scattering, background, and detector noise; a real measurement can differ.')),
        h('a', { href: 'https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/08.pdf', target: '_blank', rel: 'noopener noreferrer' }, nt('distance_source', 'Source: NRC radiation protection guide'))));
  }

  function nkStudioTranslate(ctx) {
    return function (key, fallback, values) {
      var text;
      try { text = ctx.t && ctx.t('stem.nuclearlab.studio_' + key, fallback); } catch (_) {}
      if (text == null || text === '' || text === 'stem.nuclearlab.studio_' + key) text = fallback;
      return String(text).replace(/\{(\w+)\}/g, function (match, name) {
        return values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match;
      });
    };
  }

  function nkStudioHint(h, nt, text, key) {
    return h('details', { key: key, className: 'ns-hint' }, h('summary', null, nt('hint_label', 'Need a nudge?')), h('p', { className: 'ns-note' }, text));
  }

  function NuclearStudioPrediction(props) {
    var h = props.ctx.React.createElement, nt = nkStudioTranslate(props.ctx);
    return h('details', { className: 'ns-prediction', open: !props.observed },
      h('summary', null, props.observed ? nt('prediction_summary', 'Your prediction: {choice}', { choice: props.value || nt('prediction_missing', 'Not recorded') }) : nt('predict_step', '1 / Predict')),
      props.children);
  }

  function nkStudioGuidance(h, nt, text, label, action) {
    return h('div', { className: 'ns-guidance', 'data-ns-guide': 'true' },
      h('p', { className: 'ns-note' }, h('strong', null, nt('guide_label', 'Next step')), ' · ', text),
      action ? h('button', { type: 'button', className: 'ns-secondary', 'data-ns-prepare': 'true', onClick: action }, label) : null);
  }

  function NuclearStudioReflection(props) {
    var h = props.ctx.React.createElement, nt = nkStudioTranslate(props.ctx);
    var note = typeof props.note === 'string' ? props.note.slice(0, 300) : '';
    var fieldId = 'ns-reflection-' + props.kind, helpId = fieldId + '-help';
    return h('details', { className: 'ns-reflection', 'data-ns-reflection': props.kind },
      h('summary', null, note ? nt('reflection_saved_title', 'Your takeaway') : nt('reflection_add_title', 'Add a takeaway (optional)')),
      h('p', { id: helpId, className: 'ns-note' }, nt('reflection_prompt', 'What did you notice? Put one idea you want to remember in your own words.')),
      h('label', { htmlFor: fieldId }, nt('reflection_label', 'My takeaway from {title}', { title: props.title })),
      h('textarea', { id: fieldId, rows: 3, maxLength: 300, value: note, 'aria-describedby': helpId, onChange: function (event) { props.onChange(event.target.value.slice(0, 300)); } }),
      h('p', { className: 'ns-note', role: 'status' }, note ? nt('reflection_kept', 'Note kept with this discovery.') : nt('reflection_optional', 'You can leave this blank and continue exploring.')),
      note ? h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange(''); } }, nt('reflection_clear', 'Clear this note')) : null);
  }

  function nkStudioHasWork(id, value) {
    var data = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    var predictions = { decay: [16, 32, 48], distance: ['half', 'quarter', 'same'], shield: ['water', 'concrete', 'lead'], counting: ['same', 'vary'], rays: ['alpha', 'both', 'neither'], chain: ['stop', 'steady', 'grow'] };
    if (!predictions[id]) return false;
    if (predictions[id].indexOf(data.prediction) >= 0) return true;
    if ((id === 'decay' || id === 'chain') && Number.isInteger(data.step) && data.step > 0 && data.step <= 4) return true;
    var rows = Array.isArray(id === 'shield' ? data.trials : data.runs) ? (id === 'shield' ? data.trials : data.runs) : [];
    return rows.some(function (row) {
      if (id === 'shield') return row && ['water', 'concrete', 'lead'].indexOf(row.material) >= 0 && typeof row.thickness === 'number' && isFinite(row.thickness) && row.thickness >= 0 && row.thickness <= 10;
      if (id === 'counting') return Number.isInteger(row) && row >= 0 && row <= 1000;
      return (id === 'distance' ? [1, 2, 4] : id === 'chain' ? [.8, 1, 1.2] : id === 'rays' ? ['alpha-open', 'alpha-paper', 'gamma-paper'] : []).indexOf(row) >= 0;
    });
  }

  var NK_STUDIO_CSS = `
    .nk-workspace{--ns-bg:#0b1424;--ns-panel:#111f33;--ns-ink:#edf5ff;--ns-muted:#afc3dc;--ns-line:#3c536e;--ns-accent:#65e2ce;--ns-on:#052c29;color:var(--ns-ink);background:var(--ns-bg);border-radius:18px;padding:clamp(12px,2vw,24px);font-size:15px;line-height:1.55;min-width:0}
    .nk-workspace[data-theme=light]{--ns-bg:#f2f6fa;--ns-panel:#fff;--ns-ink:#182d46;--ns-muted:#49617b;--ns-line:#a9b8c9;--ns-accent:#006e62;--ns-on:#fff}
    .nk-workspace *{box-sizing:border-box}.nk-workspace button,.nk-workspace input,.nk-workspace textarea{font:inherit}.nk-workspace button{cursor:pointer;min-height:44px}.nk-workspace button:disabled{cursor:default;opacity:.55}
    .nk-workspace :is(button,input,textarea,a,summary):focus-visible,.nk-workspace [tabindex='-1']:focus{outline:3px solid #f59e0b;outline-offset:4px}
    .nk-workspace button,.nk-workspace a{touch-action:manipulation}.nk-workspace p,.nk-workspace h3,.nk-workspace h4,.nk-workspace h5{margin-top:0}
    .ns-first{max-width:760px;margin:0 auto}.ns-first-header{max-width:760px;margin:0 auto 18px}.ns-first-header button{margin-bottom:4px}
    .ns-first-progress{list-style:none;padding:0;margin:0 0 14px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.ns-first-progress li{border:1px solid var(--ns-line);border-radius:10px;padding:9px 10px;min-width:0}.ns-first-progress strong,.ns-first-progress span{display:block;font-size:13px}.ns-first-progress span{color:var(--ns-muted);margin-top:3px}.ns-first-progress li[data-state=current]{border:2px solid var(--ns-accent);padding:8px 9px}.ns-first-progress li[data-state=done] span{color:var(--ns-accent)}
    .ns-first-stage h4{font-size:22px;line-height:1.3;margin:0 0 10px}.ns-first-stage .ns-scene{margin:12px 0;padding:16px}.ns-first-stage .ns-beam{margin:10px 0;max-height:150px}.ns-first-stage .ns-scene-note{margin:8px 0 0}.ns-first-stage .ns-case-chart{margin:10px 0 0}.ns-first-stage .ns-explain{border:0;margin:0;padding:0}.ns-first-stage .ns-first-prediction{margin-bottom:8px}.ns-first-stage .ns-first-status{margin:12px 0 0}.ns-first-stage .ns-first-status:empty{margin:0}.ns-first-exits{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ns-first-exits button{flex:1}
    .ns-first-compare{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.ns-first-compare button{flex:1;min-width:110px}.ns-first [data-ns-prediction-bar=predicted] .ns-case-fill{background:#a7bdd5}
    .nk-workspace[data-ns-large=true] .ns-first-progress :is(strong,span){font-size:16px}
    @container (max-width:600px){.ns-first-progress{grid-template-columns:repeat(2,minmax(0,1fr))}.ns-first-stage{padding:16px}}
    @media (forced-colors:active){.ns-first-progress li[data-state=current]{border-color:Highlight}.ns-first-progress span,.ns-first-progress li[data-state=done] span,.ns-first .ns-scene-note{color:CanvasText}.ns-first .ns-beam path{stroke:CanvasText}.ns-first .ns-beam text{fill:CanvasText}.ns-first .ns-beam circle{stroke:CanvasText;fill:none}.ns-first .ns-beam circle:last-of-type{fill:Canvas}.ns-first .ns-beam rect{fill:Highlight;stroke:CanvasText}.ns-first .ns-beam [data-ns-first-detector=saved]{fill:Canvas;stroke:CanvasText}.ns-first [data-ns-prediction-bar=predicted] .ns-case-fill{background:Highlight;forced-color-adjust:none}}
    .ns-nav{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:20px}.ns-nav button,.ns-choice,.ns-secondary{border:1px solid var(--ns-line);border-radius:10px;padding:9px 14px;background:var(--ns-panel);color:var(--ns-ink);font-weight:700}
    .ns-nav button[aria-pressed=true],.ns-choice[aria-pressed=true]{border:2px solid var(--ns-accent);padding:8px 13px;background:var(--ns-accent);color:var(--ns-on)}
    .ns-hero{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:22px}.ns-eyebrow{color:var(--ns-accent);font-size:12px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;margin-bottom:6px}.ns-hero h3{font-size:clamp(23px,3vw,34px);line-height:1.2;letter-spacing:-.025em;margin:0 0 8px}.ns-hero p{color:var(--ns-muted);max-width:50ch;margin-bottom:0}
    .ns-progress{flex-shrink:0;border:1px solid var(--ns-line);border-radius:14px;padding:12px 16px;max-width:190px}.ns-progress strong{display:block;font-size:23px;color:var(--ns-accent)}.ns-progress span{display:block;color:var(--ns-muted);font-size:12px}
    .ns-missions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}.ns-mission{display:flex;gap:12px;text-align:left;align-items:center;padding:16px;border-radius:14px;background:var(--ns-panel);border:1px solid var(--ns-line);color:var(--ns-ink)}.ns-mission[aria-pressed=true]{border:2px solid var(--ns-accent);padding:15px;box-shadow:inset 4px 0 var(--ns-accent)}.ns-mission strong,.ns-mission small{display:block}.ns-mission small{color:var(--ns-muted);font-size:13px}.ns-mission-icon{font-size:28px;line-height:1.2}.ns-selected-mark{margin-left:auto;color:var(--ns-accent);font-size:20px}
    .ns-heading h3,.ns-heading h4{font-size:23px;line-height:1.3;margin:0 0 6px}.ns-heading p{color:var(--ns-muted);margin-bottom:16px}.ns-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(280px,.9fr);gap:18px;align-items:start}.ns-grid>*{min-width:0}
    .ns-scene{background:radial-gradient(ellipse at 50% 25%,#1d4660,#10243b 65%);border:1px solid #44617d;border-radius:16px;padding:22px;color:#ecf8ff;overflow:hidden}.ns-scene-top{display:flex;justify-content:space-between;gap:12px;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:#bed4eb}.ns-atom-grid{display:grid;grid-template-columns:repeat(8,1fr);gap:clamp(7px,1.5vw,14px);max-width:340px;margin:28px auto}.ns-atom{aspect-ratio:1;border:1px solid #83f5e2;border-radius:50%;background:#65e2ce;box-shadow:0 0 14px #65e2ce33;transition:background .2s,box-shadow .2s}.ns-atom[data-decayed=true]{background:#18304b;border-color:#66839e;box-shadow:none}
    .ns-readout{text-align:center}.ns-readout strong{font-size:clamp(30px,5vw,44px);font-weight:800;line-height:1.2;color:#83f5e2}.ns-readout span{display:block;font-size:13px;color:#d0e3f5}.ns-legend{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:18px;font-size:12px;color:#c5d9ee}.ns-legend i{display:inline-block;width:9px;height:9px;margin-right:5px;border-radius:50%;background:#65e2ce}.ns-legend i[data-decayed=true]{background:#18304b;border:1px solid #a2bad1}
    .ns-controls{background:var(--ns-panel);border:1px solid var(--ns-line);border-radius:16px;padding:20px}.ns-controls h5,.ns-notebook h5{font-size:16px;margin:0 0 10px}.ns-step{font-size:12px;color:var(--ns-accent);font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px}.ns-controls p{margin-bottom:12px}.ns-choices{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 18px}.ns-choices .ns-choice{flex:1;min-width:70px}.ns-primary{width:100%;border:1px solid var(--ns-accent);background:var(--ns-accent);color:var(--ns-on);padding:12px 16px;border-radius:10px;font-weight:800}.ns-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ns-actions>*{flex:1}.ns-note{font-size:13px;color:var(--ns-muted)}.ns-feedback{padding:12px;border-left:3px solid var(--ns-accent);background:var(--ns-bg);border-radius:0 8px 8px 0;margin:14px 0}.ns-feedback[data-kind=retry]{border-color:#f59e0b}.ns-result{font-size:16px;font-weight:700}.ns-label{display:flex;justify-content:space-between;gap:12px;font-weight:700;margin:14px 0 6px}.ns-range{width:100%;min-height:44px;accent-color:var(--ns-accent)}
    .ns-beam{width:100%;height:auto;display:block;margin:25px 0}.ns-notebook{margin-top:18px;border:1px solid var(--ns-line);border-radius:12px;padding:16px;background:var(--ns-panel)}.ns-notebook table{border-collapse:collapse;width:100%;font-size:14px;color:var(--ns-ink)}.ns-notebook th,.ns-notebook td{text-align:left;padding:9px 6px;border-bottom:1px solid var(--ns-line)}.ns-notebook th{font-weight:700}.ns-notebook caption{text-align:left;color:var(--ns-muted);font-size:13px;margin-bottom:8px}.ns-notebook summary{cursor:pointer;min-height:44px;align-content:center;font-weight:700}.ns-notebook a{color:var(--ns-accent);text-decoration:underline}.ns-explain{border-top:1px solid var(--ns-line);margin-top:18px;padding-top:18px}.ns-explain .ns-choice{text-align:left;width:100%;margin-bottom:8px}.ns-complete{font-weight:700;color:var(--ns-accent)}.ns-studio-footer{display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;margin-top:20px;color:var(--ns-muted);font-size:13px}
    @media(max-width:700px){.ns-grid{grid-template-columns:1fr}.ns-hero{align-items:flex-start}.ns-progress{padding:8px 10px;max-width:116px}.ns-missions{gap:8px}.ns-mission{padding:12px;align-items:flex-start;gap:8px}.ns-mission[aria-pressed=true]{padding:11px}.ns-mission-icon{display:none}.ns-mission small{font-size:12px}.ns-scene{padding:16px}.ns-atom-grid{max-width:240px;margin:20px auto}.ns-controls{padding:16px}}
    @container(max-width:650px){.ns-grid{grid-template-columns:1fr}.ns-grid>div:first-child{display:contents}.ns-grid>.ns-controls{grid-row:2}.ns-hero{flex-wrap:wrap}.ns-progress{max-width:none;display:flex;gap:10px;align-items:center}.ns-missions{grid-template-columns:1fr 1fr}.ns-mission-icon{display:none}.ns-nav button{flex:1;font-size:13px;padding:8px}.ns-scene{padding:16px}}
    .ns-chooser{border:1px solid var(--ns-line);border-radius:12px;padding:0 14px;margin-bottom:20px;background:var(--ns-panel)}.ns-chooser summary{cursor:pointer;padding:12px 0;min-height:48px;font-weight:700}.ns-chooser .ns-missions{margin:4px 0 14px}.ns-position{color:var(--ns-muted);font-size:13px;margin-left:10px}.ns-scene-note{color:#d0e3f5;font-size:13px;text-align:center;margin:12px 0 0}.ns-chain-chart{margin:26px 0}.ns-chain-row{display:grid;grid-template-columns:46px minmax(0,1fr) 44px;gap:10px;align-items:center;margin:14px 0;font-size:13px}.ns-chain-row>strong{text-align:right}.ns-chain-track{height:24px;border:1px solid #719cbd;border-radius:5px;overflow:hidden}.ns-chain-bar{height:100%;background:#65e2ce;border:1px solid #b8fff2}.ns-explain>.ns-primary{margin-top:12px}
    .ns-hint{margin:12px 0}.ns-hint summary{cursor:pointer;min-height:44px;align-content:center;color:var(--ns-accent);font-weight:700}.ns-hint p{margin:4px 0 12px}.ns-recap ul{list-style:none;padding:0;margin:8px 0 0}.ns-recap li{padding:14px 0;border-top:1px solid var(--ns-line)}.ns-recap li p{margin-bottom:10px}.ns-count-chart{display:flex;align-items:stretch;gap:8px;height:176px;margin:22px 0}.ns-count-column{flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:5px;font-size:13px}.ns-count-bar{width:100%;max-width:42px;background:#65e2ce;border:1px solid #b8fff2;border-radius:5px 5px 0 0;min-height:2px}.ns-count-column>span{color:#d0e3f5}.ns-count-empty{min-height:176px;display:grid;place-content:center;text-align:center;color:#d0e3f5}
    .ns-prediction{border-bottom:1px solid var(--ns-line);margin-bottom:16px;padding-bottom:10px}.ns-prediction summary{cursor:pointer;min-height:44px;align-content:center;color:var(--ns-accent);font-weight:700;font-size:14px}.ns-prediction h5{margin-top:8px}.ns-prediction .ns-choices{margin-bottom:8px}.ns-signal{font-size:clamp(22px,3vw,30px);line-height:1.3;font-weight:800;color:#83f5e2;text-align:center;margin:12px 0}.ns-path-choice{display:flex;align-items:center;gap:12px;text-align:left;width:100%;margin:8px 0}.ns-path-choice strong,.ns-path-choice small{display:block}.ns-path-choice small{font-size:13px;font-weight:400}.ns-path-number{font-size:22px;min-width:22px;text-align:center}.ns-ray-identity{border:1px solid #719cbd;border-radius:10px;padding:12px;margin:14px 0;color:#edf5ff}.ns-ray-identity p{margin:4px 0 0;font-size:14px}
    .nk-workspace[data-ns-large=true] [data-nk-studio]{font-size:18px}.nk-workspace[data-ns-large=true] :is(.ns-note,.ns-mission small,.ns-notebook table,.ns-notebook caption,.ns-studio-footer,.ns-scene-note,.ns-chain-row,.ns-count-column,.ns-readout span,.ns-prediction summary,.ns-ray-identity p,.ns-path-choice small){font-size:16px}
    .ns-guidance{margin:8px 0 14px}.ns-guidance p{margin-bottom:8px}.ns-guidance strong,.ns-mission-state{color:var(--ns-accent)}.ns-guidance button{width:100%;text-align:left}.ns-mission-state{display:block;margin-top:8px;font-size:13px;font-weight:700}.ns-resume{margin:0 0 14px;max-width:100%;text-align:left}.ns-mission{min-width:0}.ns-mission>span{min-width:0}.nk-workspace[data-ns-large=true] .ns-mission-state{font-size:16px}
    @container(max-width:450px){.ns-missions{grid-template-columns:1fr}}
    .ns-reflection{margin-top:12px}.ns-reflection label{display:block;font-weight:700;margin:10px 0 6px}.ns-reflection textarea{width:100%;min-height:104px;resize:vertical;line-height:1.5;padding:12px;border:1px solid var(--ns-line);border-radius:10px;color:var(--ns-ink);background:var(--ns-bg)}.ns-reflection p{margin:10px 0}.ns-reflection summary{color:var(--ns-accent)}
    .ns-case-entry summary{color:var(--ns-accent)}.ns-case-entry p{margin:10px 0}.ns-case-back{margin-bottom:16px}.ns-case-baseline{border:1px solid #719cbd;border-radius:10px;padding:10px 12px;color:#d0e3f5;font-size:14px}.ns-case-baseline strong{color:#edf5ff}.ns-case-source{margin:10px 0 0;text-align:center;color:#d0e3f5;font-size:14px}.ns-case-options{display:grid;gap:8px;margin:12px 0}.ns-case-options .ns-choice{text-align:left;width:100%;padding:12px}.ns-case-options strong,.ns-case-options small{display:block}.ns-case-options small{font-size:13px;font-weight:400;margin-top:4px}.ns-case-progress{padding:10px 12px;background:var(--ns-bg);border:1px solid var(--ns-line);border-radius:10px;margin:12px 0}.ns-case-progress p{margin:0 0 6px}.ns-case-progress ul{margin:0;padding-left:20px;font-size:14px}.ns-case-help{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.ns-case-help button{flex:1;min-width:120px}.nk-workspace[data-ns-large=true] :is(.ns-case-options small,.ns-case-baseline,.ns-case-source,.ns-case-progress ul){font-size:16px}
    .ns-case-tests summary{cursor:pointer;min-height:44px;align-content:center;font-weight:700;color:var(--ns-accent)}
    .ns-case-stop{scroll-margin-block-start:16px}.ns-case-saved{margin-top:20px}.ns-case-saved h5{font-size:16px;color:#edf5ff;margin:0 0 10px}.ns-case-next{width:100%;text-align:left;margin:12px 0 0}.nk-workspace[data-ns-large=true] .ns-case-saved h5{font-size:18px}
    @media(forced-colors:active){.ns-case-saved h5{color:CanvasText}}
    .ns-case-check{border-top:1px solid #719cbd;margin-top:12px;padding-top:6px}.ns-case-check summary{cursor:pointer;min-height:44px;align-content:center;font-size:14px;font-weight:700;color:#83f5e2}.ns-case-check-prompt,.ns-case-check-feedback{font-size:14px;color:#edf5ff;margin:8px 0}.ns-case-check-choices{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.ns-case-check-choices button{flex:1;min-width:110px;padding:9px 10px;text-align:left}.ns-case-check-feedback:empty{margin:0}.nk-workspace[data-ns-large=true] :is(.ns-case-check summary,.ns-case-check-prompt,.ns-case-check-feedback){font-size:16px}
    @media(forced-colors:active){.ns-case-check{border-color:CanvasText}.ns-case-check summary,.ns-case-check-prompt,.ns-case-check-feedback{color:CanvasText}}
    .ns-case-view,.ns-case-effects-actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}.ns-case-view button,.ns-case-effects-actions button{flex:1;min-width:110px;padding:9px 10px;text-align:left}.ns-case-effects-intro{font-size:14px;color:#edf5ff;margin:12px 0 0}.ns-case-effect-fixed{grid-column:1/-1;font-size:13px;color:#d0e3f5}.nk-workspace[data-ns-large=true] :is(.ns-case-effects-intro,.ns-case-effect-fixed){font-size:16px}
    @media(forced-colors:active){.ns-case-effects-intro,.ns-case-effect-fixed{color:CanvasText}}
    .ns-warmup-entry{margin:0 0 18px}.ns-warmup-entry summary{color:var(--ns-accent)}.ns-warmup-entry p{margin:8px 0 12px}.ns-nucleus-name{text-align:center;font-size:clamp(26px,4vw,36px);font-weight:800;color:#83f5e2;margin:10px 0}.ns-nucleus-cluster{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;max-width:250px;margin:26px auto}.ns-nucleon{display:grid;place-content:center;aspect-ratio:1;border-radius:50%;background:#65e2ce;color:#052c29;border:2px solid #b8fff2;font-weight:800;font-size:18px}.ns-nucleon[data-particle=neutron]{background:#c4b5fd;color:#231342;border-color:#e9ddff}.ns-nucleus-counts{display:flex;flex-wrap:wrap;justify-content:center;gap:8px 18px;color:#edf5ff;font-size:14px}.ns-nucleus-equation{font-size:26px;color:#edf5ff;font-weight:800;text-align:center;margin:4px 0 0}.ns-particle-control{margin:16px 0}.ns-particle-control>p{display:flex;justify-content:space-between;gap:12px;margin-bottom:6px}.ns-particle-control>p>span{font-weight:800;color:var(--ns-accent)}.ns-particle-buttons{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ns-particle-buttons button{padding:9px 6px}.nk-workspace[data-ns-large=true] .ns-nucleus-counts{font-size:16px}
    @media(forced-colors:active){.ns-nucleus-name,.ns-nucleus-counts,.ns-nucleus-equation{color:CanvasText}.ns-nucleon,.ns-nucleon[data-particle=neutron]{background:Canvas;color:CanvasText;border-color:CanvasText}.ns-nucleon[data-particle=neutron]{border-style:dashed}}
    .ns-pair-choices{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 16px}.ns-pair-choices button{flex:1;min-width:100px;font-size:14px;padding:9px 10px}.ns-pair-chart{margin:12px 0}.ns-pair-row{display:grid;grid-template-columns:minmax(78px,.8fr) repeat(2,minmax(0,1fr));gap:8px;align-items:center;margin-top:10px}.ns-pair-name{font-size:14px;overflow-wrap:anywhere}.ns-pair-kind{font-size:14px;min-width:0}.ns-pair-kind strong,.ns-pair-kind small{display:block;overflow-wrap:anywhere}.ns-pair-kind small{color:var(--ns-muted);font-size:12px;margin-top:4px}.ns-pair-value{border:1px solid var(--ns-line);border-radius:8px;padding:6px;min-width:0}.ns-pair-value>strong{font-size:18px}.ns-pair-value[data-changed=true]{outline:2px solid var(--ns-accent);outline-offset:-2px}.ns-pair-marks{display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:2px;margin-top:6px}.ns-pair-dot{height:8px;border-radius:50%;border:1px solid transparent}.ns-pair-dot[data-filled=true]{background:var(--ns-accent);border-color:var(--ns-accent)}.ns-pair-caption{margin:8px 0}.ns-pair-lesson{margin:10px 0 14px;font-size:14px;color:var(--ns-ink)}.ns-pair-records{border-top:1px solid var(--ns-line);margin-top:14px;padding-top:6px}.ns-pair-records summary{font-size:14px;color:var(--ns-accent)}.nk-workspace[data-ns-large=true] :is(.ns-pair-choices button,.ns-pair-name,.ns-pair-kind,.ns-pair-kind small,.ns-pair-lesson,.ns-pair-records summary){font-size:16px}
    @media(forced-colors:active){.ns-pair-dot[data-filled=true]{background:CanvasText;border-color:CanvasText;forced-color-adjust:none}.ns-pair-value[data-changed=true]{outline-color:Highlight}}
    .ns-pair-dot[data-filled=false]{visibility:hidden}
    .ns-pair-next{width:100%;text-align:left;margin:8px 0}.ns-nucleus-stop{scroll-margin-block-start:16px}
    .ns-pair-check{border-top:1px solid var(--ns-line);margin-top:12px;padding-top:6px}.ns-pair-check summary{font-size:14px;color:var(--ns-accent);min-height:44px}.ns-pair-lesson:empty{margin:0}.nk-workspace[data-ns-large=true] .ns-pair-check summary{font-size:16px}
    .ns-case-chart{border-top:1px solid #719cbd;margin-top:20px;padding-top:4px}.ns-case-chart-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:6px 10px;align-items:center;margin-top:12px;font-size:14px;color:#edf5ff}.ns-case-chart-row>strong{text-align:right}.ns-case-track{grid-column:1/-1;height:16px;border:1px solid #719cbd;border-radius:4px;overflow:hidden;background:#10243b}.ns-case-fill{height:100%;background:#65e2ce}.ns-case-chart-row[data-ns-case-bar=mystery] .ns-case-fill{background:#a7bdd5}.ns-case-scale{color:#d0e3f5;font-size:13px;margin:8px 0 0}.nk-workspace[data-ns-large=true] :is(.ns-case-chart-row,.ns-case-scale){font-size:16px}
    @media(forced-colors:active){.ns-case-chart{border-color:CanvasText}.ns-case-chart-row,.ns-case-scale{color:CanvasText}.ns-case-track{background:Canvas;border-color:CanvasText}.ns-case-fill,.ns-case-chart-row[data-ns-case-bar=mystery] .ns-case-fill{background:Highlight;forced-color-adjust:none}}
    .ns-case-review{display:block;margin-top:16px;color:#d0e3f5;font-size:14px}.ns-case-review>span{display:block;margin-bottom:6px}.ns-case-review select{display:block;width:100%;min-width:0;min-height:44px;padding:10px 8px;border:1px solid #719cbd;border-radius:8px;background:#10243b;color:#edf5ff;font:inherit;touch-action:manipulation}.ns-case-review select:focus-visible{outline:3px solid #f59e0b;outline-offset:4px}.ns-case-table tbody th{border-inline-start:3px solid transparent}.ns-case-table tr[data-ns-case-current=true]{background:var(--ns-bg)}.ns-case-table tr[data-ns-case-current=true] th{border-inline-start-color:var(--ns-accent)}.nk-workspace[data-ns-large=true] .ns-case-review{font-size:16px}
    @media(forced-colors:active){.ns-case-review,.ns-case-review select{color:CanvasText}.ns-case-review select{background:Canvas;border-color:CanvasText}.ns-case-table tr[data-ns-case-current=true] th{border-inline-start-color:Highlight}}
    @media(forced-colors:active){[data-ns-investigation] .ns-beam path{stroke:CanvasText}[data-ns-investigation] .ns-beam text{fill:CanvasText}[data-ns-investigation] .ns-beam rect,[data-ns-investigation] .ns-beam circle{fill:Canvas;stroke:CanvasText}[data-ns-investigation] .ns-beam rect:last-of-type{fill:Highlight}}
    .nk-workspace[data-ns-reduced=true] *,.nk-workspace[data-nk-reduce-motion="true"] *{transition:none!important;animation:none!important;scroll-behavior:auto!important}
    @media(prefers-reduced-motion:reduce){.nk-workspace *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
    @media(forced-colors:active){.ns-choice[aria-pressed=true],.ns-mission[aria-pressed=true],.ns-nav button[aria-pressed=true]{outline:3px solid Highlight;outline-offset:-4px}.ns-atom{background:Highlight;border-color:Highlight}.ns-atom[data-decayed=true]{background:Canvas;border:1px dashed CanvasText}.ns-scene{background:Canvas;color:CanvasText}.ns-readout strong,.ns-readout span,.ns-scene-top,.ns-legend{color:CanvasText}}

    .ns-first-header{padding:16px 0 14px;border-bottom:1px solid var(--ns-line)}.ns-first-header .ns-eyebrow{color:var(--ns-accent);font-weight:800;letter-spacing:.14em;font-size:12px}.ns-first-header h3{font-size:clamp(23px,3vw,30px);letter-spacing:-.025em}.ns-first-header button{border-radius:999px}
    .ns-first-progress li{background:var(--ns-panel);box-shadow:0 3px 12px #0000000c}.ns-first-progress li[data-state=current]{background:linear-gradient(135deg,#65e2ce12,var(--ns-panel));box-shadow:inset 0 3px 0 var(--ns-accent)}.ns-first-progress li[data-state=current]>span{width:fit-content;background:var(--ns-accent);color:var(--ns-on);border-radius:5px;padding:0 7px;font-weight:800}.ns-first-progress li[data-state=done]{border-color:var(--ns-accent)}
    .ns-first-stage{box-shadow:0 14px 38px #00000014;border-radius:20px}.ns-first-stage h4{font-weight:750;letter-spacing:-.015em}.ns-first-stage .ns-step{display:inline-block;border:1px solid var(--ns-line);border-radius:999px;padding:2px 9px;letter-spacing:.08em}.ns-first-prediction{border-inline-start:3px solid var(--ns-accent);padding-inline-start:9px}
    .ns-first-stage .ns-scene{background:radial-gradient(ellipse at 30% 20%,#28556c77,transparent 60%),radial-gradient(#a7bdd516 .7px,transparent .7px),#10243b;background-size:auto,14px 14px,auto;border-color:#607f99;box-shadow:inset 0 1px 0 #d0e3f518;border-radius:14px}.ns-first .ns-scene-top{align-items:flex-start;gap:8px;letter-spacing:.06em}.ns-first .ns-scene-top>span{border:1px solid #719cbd66;border-radius:7px;background:#0b203a;padding:4px 7px}.ns-first .ns-scene-top>span:last-child{color:#b8fff2;border-color:#65e2ce66}
    .ns-first .ns-beam{max-height:160px}.ns-first-source-unit{filter:drop-shadow(0 3px 4px #00000040)}.ns-first-detector-unit{filter:drop-shadow(0 3px 4px #00000040)}.ns-first .ns-readout{width:fit-content;min-width:155px;padding:9px 16px;margin:8px auto 0;border:1px solid #719cbd66;border-radius:10px;background:#081c2e}.ns-first .ns-readout strong{font-size:clamp(34px,5vw,48px);font-variant-numeric:tabular-nums;letter-spacing:-.04em}.ns-first .ns-readout span{max-width:28ch}
    .ns-first[data-ns-first-discovery=predict] .ns-choices .ns-choice{display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;padding:10px 8px;min-height:68px}.ns-first-guess{width:64px;max-width:100%;height:10px;display:block;color:var(--ns-accent);opacity:.9}.ns-first .ns-choice:hover{border-color:var(--ns-accent);box-shadow:0 0 0 1px var(--ns-accent)}.ns-first .ns-primary{box-shadow:0 4px 0 #00000020;border-radius:12px}.ns-first .ns-primary:active{box-shadow:none}
    .ns-first-compare{padding:4px;border:1px solid #719cbd66;background:#081c2e;border-radius:12px;gap:4px}.ns-first-compare .ns-choice{min-width:104px;background:transparent;color:#edf5ff;border-color:transparent;box-shadow:none}.ns-first-compare .ns-choice[aria-pressed=true]{background:#65e2ce;color:#052c29;border-color:#65e2ce}.ns-first .ns-case-chart-row>strong{font-size:20px;font-variant-numeric:tabular-nums;letter-spacing:-.03em}.ns-first .ns-case-track{height:22px;border-radius:5px;position:relative}.ns-first-scale-cuts{position:absolute;inset:0;pointer-events:none}.ns-first-scale-cuts>span{position:absolute;top:0;bottom:0;border-inline-start:1px solid #081c2e99}.ns-first .ns-case-scale{margin-top:9px}.ns-first [data-ns-first-prediction-result]{padding:9px 11px;border:1px solid #719cbd66;border-radius:9px;background:#081c2e;text-align:left}.ns-first [data-ns-first-prediction-result=matched]{border-inline-start:3px solid #65e2ce}
    @container(max-width:600px){.ns-first-header{padding-top:0;padding-bottom:8px;margin-bottom:12px}.ns-first-header p{margin-bottom:12px}.ns-first-stage{border-radius:16px}.ns-first .ns-readout{padding:8px 12px}.ns-first-compare .ns-choice{padding:8px 6px}.ns-first-progress li{padding:8px 9px}.ns-first-progress li[data-state=current]{padding:7px 8px}.ns-first[data-ns-first-discovery=predict] .ns-choices .ns-choice{padding:8px;gap:6px}}
    @media(forced-colors:active){.ns-first-header,.ns-first-progress li,.ns-first-stage,.ns-first-stage .ns-scene,.ns-first .ns-readout,.ns-first-compare,.ns-first [data-ns-first-prediction-result]{background:Canvas;color:CanvasText;border-color:CanvasText;box-shadow:none}.ns-first-progress li[data-state=current]>span{background:Highlight;color:HighlightText}.ns-first .ns-scene-top>span,.ns-first .ns-scene-top>span:last-child{background:Canvas;color:CanvasText;border-color:CanvasText}.ns-first .ns-readout strong,.ns-first .ns-readout span{color:CanvasText}.ns-first-source-unit,.ns-first-detector-unit{filter:none}.ns-first .ns-beam [data-ns-first-apparatus] rect{fill:Canvas;stroke:CanvasText}.ns-first-guess{color:CanvasText}.ns-first-compare .ns-choice{background:Canvas;color:CanvasText;border-color:CanvasText}.ns-first-compare .ns-choice[aria-pressed=true]{background:Highlight;color:HighlightText;border-color:Highlight;forced-color-adjust:none}.ns-first-scale-cuts>span{border-color:CanvasText}.ns-first [data-ns-first-prediction-result=matched]{border-inline-start-color:Highlight}.ns-first .ns-primary,.ns-first .ns-choice:hover{box-shadow:none}}
    .nk-studio-banner{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;padding:16px 18px;margin-bottom:16px;border-radius:16px;background:linear-gradient(125deg,#0f172a 0%,#1e1b4b 54%,#0c3245 100%);border:1px solid rgba(101,226,206,.38);box-shadow:0 14px 30px rgba(8,18,34,.28);color:#f1f5f9}
    .nk-studio-badge{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;background:rgba(101,226,206,.16);border:1px solid rgba(101,226,206,.45);color:#99f6e4}
    .nk-studio-title{font-size:18px;font-weight:900;letter-spacing:-.02em;color:#ffffff;margin:4px 0 2px}
    .nk-studio-sub{font-size:12px;color:#cbd5e1;margin:0}
    .nk-telemetry-row{display:flex;flex-wrap:wrap;align-items:center;gap:7px}
    .nk-telemetry-pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(15,23,42,.66);border:1px solid rgba(148,163,184,.36);color:#e2e8f0;white-space:nowrap}
    .nk-telemetry-pill strong{color:#65e2ce;font-weight:900}
    .nk-quick-bar{display:flex;flex-wrap:wrap;align-items:center;gap:7px;width:100%;padding-top:10px;border-top:1px solid rgba(148,163,184,.22)}
    .nk-quick-label{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#a5f3fc;margin-right:2px}
    .nk-quick-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;font-size:12px;font-weight:700;background:rgba(255,255,255,.1);border:1px solid rgba(101,226,206,.38);color:#f8fafc;cursor:pointer;min-height:36px!important;transition:background-color .15s,border-color .15s}
    .nk-quick-chip:hover{background:rgba(101,226,206,.22);border-color:#65e2ce;color:#ffffff}
    .ns-nav{padding:6px;border-radius:14px;background:var(--ns-panel);border:1px solid var(--ns-line);box-shadow:0 4px 14px rgba(8,18,34,.08)}
    .ns-controls,.ns-notebook,.ns-chooser{box-shadow:0 6px 18px rgba(8,18,34,.08)}
    .ns-scene{box-shadow:inset 0 1px 0 rgba(208,227,245,.16),0 12px 26px rgba(8,18,34,.22)}
    .ns-coach-panel summary{color:var(--ns-accent)}
    .ns-coach-chips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
    .ns-coach-chips button{padding:7px 11px;font-size:13px}
    .ns-coach-form{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}
    .ns-coach-form input{flex:1 1 200px;min-height:44px;padding:8px 12px;border:1px solid var(--ns-line);border-radius:10px;background:var(--ns-bg);color:var(--ns-ink)}
    .ns-coach-reply{margin-top:10px;padding:12px;border-radius:10px;border:1px solid var(--ns-line);background:var(--ns-bg)}
    .ns-coach-reply ul{margin:8px 0 0;padding-left:18px;font-size:13px}
    .ns-coach-whynot{margin:8px 0;padding:10px 12px;border-radius:8px;border:1px solid var(--ns-line);background:var(--ns-bg);font-size:13px;color:var(--ns-ink)}
    .ns-read-aloud{margin-top:8px;display:inline-flex;align-items:center;gap:6px}
    .nk-workspace[data-theme=contrast],.theme-contrast .nk-workspace{background:#000000!important;color:#ffffff!important;border:2px solid #ffffff!important}
    .nk-workspace[data-theme=contrast] .nk-studio-banner,.theme-contrast .nk-studio-banner{background:#000000!important;border:2px solid #00ff00!important;box-shadow:none!important;color:#ffffff!important}
    .nk-workspace[data-theme=contrast] .nk-studio-badge,.nk-workspace[data-theme=contrast] .nk-telemetry-pill,.theme-contrast .nk-studio-badge,.theme-contrast .nk-telemetry-pill{background:#000000!important;border:1px solid #ffff00!important;color:#ffff00!important}
    .nk-workspace[data-theme=contrast] .nk-telemetry-pill strong,.nk-workspace[data-theme=contrast] .nk-quick-label,.theme-contrast .nk-telemetry-pill strong,.theme-contrast .nk-quick-label{color:#ffff00!important}
    .nk-workspace[data-theme=contrast] .nk-quick-chip,.theme-contrast .nk-quick-chip{background:#000000!important;border:2px solid #00ff00!important;color:#ffffff!important}
    .nk-workspace[data-theme=contrast] :is(.ns-nav,.ns-controls,.ns-notebook,.ns-chooser,.ns-scene,.ns-progress,.ns-mission,.ns-feedback,.ns-coach-reply,.ns-coach-whynot),.theme-contrast .nk-workspace :is(.ns-nav,.ns-controls,.ns-notebook,.ns-chooser,.ns-scene,.ns-progress,.ns-mission,.ns-feedback,.ns-coach-reply,.ns-coach-whynot){background:#000000!important;color:#ffffff!important;border-color:#ffffff!important;box-shadow:none!important}
    .nk-workspace[data-theme=contrast] :is(button,input,textarea,a,summary):focus-visible,.theme-contrast .nk-workspace :is(button,input,textarea,a,summary):focus-visible{outline:3px solid #ffff00!important;outline-offset:3px!important}
  `;

  function NuclearStarterExperiment(props) {
    var ctx = props.ctx || {};
    var React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
    var canSpeak = typeof ctx.callTTS === 'function';
    var distance = props.kind === 'distance';
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var settings = distance ? [1, 2, 4] : [.8, 1, 1.2];
    var setting = settings.indexOf(data.setting) >= 0 ? data.setting : 1;
    var step = Number.isInteger(data.step) ? Math.max(0, Math.min(4, data.step)) : 0;
    var predictions = distance ? [
      { id: 'half', label: nt('distance_half', 'Half as much') },
      { id: 'quarter', label: nt('distance_quarter', 'One quarter') },
      { id: 'same', label: nt('distance_same', 'No change') }
    ] : [
      { id: 'stop', label: nt('chain_stop', 'It stops') },
      { id: 'steady', label: nt('chain_steady', 'It stays steady') },
      { id: 'grow', label: nt('chain_grow', 'It grows') }
    ];
    var prediction = predictions.some(function (p) { return p.id === data.prediction; }) ? data.prediction : null;
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (value, i, all) { return settings.indexOf(value) >= 0 && all.indexOf(value) === i; }).slice(-3);
    var eligible = distance ? runs.indexOf(1) >= 0 && runs.indexOf(2) >= 0 : runs.indexOf(1) >= 0 && runs.some(function (value) { return value !== 1; });
    var last = runs.length ? runs[runs.length - 1] : null;
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var runRef = React.useRef(null), focusRun = React.useRef(false);
    React.useEffect(function () { if (focusRun.current && runRef.current && !runRef.current.disabled) { runRef.current.focus(); focusRun.current = false; } }, [setting, step]);
    var nextSetting = distance ? runs.indexOf(1) >= 0 ? 2 : 1 : runs.indexOf(1) >= 0 ? setting !== 1 ? setting : .8 : 1;
    if (!distance && step > 0 && step < 4 && runs.indexOf(setting) < 0) nextSetting = setting;
    var needsSetup = nextSetting !== setting || (!distance && step >= 4);
    function expected(factor, generation) { return 20 * Math.pow(factor, generation); }
    function intensity(metres) { return nkStudioDistanceIntensity(metres); }
    function metres(value) { return nt('distance_metres', '{value} m', { value: value }); }
    function factorName(value) {
      return value === 1 ? nt('factor_same', '1 · Same') : value < 1 ? nt('factor_fewer', '0.8 · Fewer') : nt('factor_more', '1.2 · More');
    }
    function prepareNext() {
      focusRun.current = true;
      props.onChange({ setting: nextSetting, step: 0 });
      setStatus(nt('guide_prepared', 'Setup ready. Run the experiment to record a result.'));
    }
    function button(label, selected, action, disabled, key) {
      return h('button', { key: key || label, type: 'button', className: 'ns-choice', 'aria-pressed': selected, disabled: disabled, onClick: action }, label);
    }
    function run() {
      if (!prediction || (!distance && step >= 4)) return;
      var nextStep = distance ? 0 : step + 1;
      var patch = { step: nextStep };
      if (distance || nextStep === 4) patch.runs = runs.filter(function (value) { return value !== setting; }).concat([setting]);
      props.onChange(patch);
      setStatus(distance ? nt('distance_result', 'At {distance}, the intensity is {percent}% of the 1 m reading.', { distance: metres(setting), percent: intensity(setting) }) : nt('chain_result', 'Generation {generation}: {count} expected reactions.', { generation: nextStep, count: expected(setting, nextStep).toFixed(1) }));
    }
    function explain(correct) {
      if (!eligible) return;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('try_explanation', 'Look at your observations, then try another explanation.'));
    }
    var scene = distance ? h('div', { className: 'ns-scene', 'data-ns-scene': 'distance' },
      h('div', { className: 'ns-scene-top' }, h('span', null, nt('point_source', 'Point source • fixed output')), h('span', null, nt('detector', 'Detector'))),
      h('svg', { className: 'ns-beam', viewBox: '0 0 440 230', 'aria-hidden': 'true' },
        [75, 150, 300].map(function (r) { return h('circle', { key: r, cx: 55, cy: 98, r: r, fill: 'none', stroke: '#719cbd', strokeWidth: 1.5, strokeDasharray: '5 5' }); }),
        h('circle', { cx: 55, cy: 98, r: 23, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
        h('text', { x: 55, y: 106, fill: '#171131', fontSize: 24, textAnchor: 'middle' }, 'γ'),
        h('path', { d: 'M55 172 H385', stroke: '#bed4eb', strokeWidth: 2 }),
        settings.map(function (value) { return h('g', { key: value }, h('path', { d: 'M' + (55 + value * 75) + ' 165 V179', stroke: '#bed4eb', strokeWidth: 2 }), h('text', { x: 55 + value * 75, y: 204, textAnchor: 'middle', fill: '#edf5ff', fontSize: 17 }, metres(value))); }),
        h('rect', { x: 45 + (last || setting) * 75, y: 69, width: 20, height: 58, rx: 5, fill: '#65e2ce', stroke: '#b8fff2', strokeWidth: 2 })),
      h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, last ? intensity(last) + '%' : '—'), h('span', null, nt('distance_relative', 'of the intensity at 1 m'))),
      h('p', { className: 'ns-scene-note' }, last ? nt('distance_last', 'Last test: detector at {distance}', { distance: metres(last) }) : nt('distance_ready', 'Choose a distance, then take a reading.')))
      : h('div', { className: 'ns-scene', 'data-ns-scene': 'chain' },
        h('div', { className: 'ns-scene-top' }, h('span', null, nt('chain_expected', 'Expected reactions')), h('span', null, nt('chain_start', 'Start with 20'))),
        h('div', { className: 'ns-chain-chart', role: 'img', 'aria-label': Array.from({ length: step + 1 }, function (_, g) { return nt('generation_value', 'Generation {generation}: {count} expected reactions', { generation: g, count: expected(setting, g).toFixed(1) }); }).join('. ') },
          Array.from({ length: 5 }, function (_, g) {
            return h('div', { key: g, className: 'ns-chain-row', 'aria-hidden': 'true' }, h('span', null, g === 0 ? nt('chain_start_short', 'Start') : nt('chain_generation_short', 'Gen {number}', { number: g })),
              h('div', { className: 'ns-chain-track' }, g <= step ? h('div', { className: 'ns-chain-bar', style: { width: expected(setting, g) * 2 + '%' } }) : null),
              h('strong', null, g <= step ? expected(setting, g).toFixed(1) : '—'));
          })),
        h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, expected(setting, step).toFixed(1)), h('span', null, nt('chain_generation_reading', 'expected reactions in generation {number}', { number: step }))),
        h('p', { className: 'ns-scene-note' }, nt('chain_factor_reading', 'Each generation is multiplied by {factor}.', { factor: setting })));
    return h('div', { className: 'ns-grid', 'data-ns-intro': props.kind },
      h('div', null, scene,
        h('div', { className: 'ns-notebook', 'data-ns-notebook': props.kind }, h('h5', null, nt('notebook', 'Your observations')),
          runs.length ? h('table', null, h('caption', null, distance ? nt('distance_caption', 'Compare readings with the same source.') : nt('chain_caption', 'Each run starts at 20. Compare after four generations.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, distance ? nt('distance_column', 'Distance') : nt('chain_factor_column', 'Factor')), h('th', { scope: 'col' }, distance ? nt('intensity_column', 'Intensity') : nt('chain_reactions_column', 'Reactions')))),
            h('tbody', null, runs.map(function (value) { return h('tr', { key: value }, h('th', { scope: 'row' }, distance ? metres(value) : value), h('td', null, distance ? intensity(value) + '%' : expected(value, 4).toFixed(1))); })))
            : h('p', { className: 'ns-note' }, distance ? nt('empty_notebook', 'Your first test will appear here.') : nt('chain_empty', 'Complete four generations to record a run.'))),
        h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
          h('p', { className: 'ns-note' }, distance ? nt('distance_model', 'For an ideal point source, intensity follows 1 / distance². The reference reading at 1 m is 100%. The model leaves out absorption, scattering, background, and detector noise; a real measurement can differ.') : nt('chain_model', 'This simplified model multiplies 20 starting reactions by the selected factor once per generation. Fractional counts are expected averages. A factor of 1 sustains the chain. Real reactors also involve neutron timing, losses, temperature feedback, and control systems.')),
          h('a', { href: distance ? 'https://www.nrc.gov/sites/default/files/doc_library/cdn/legacy/reading-rm/basic-ref/students/for-educators/08.pdf' : 'https://www.nrc.gov/education-regulatory-research/glossary/criticality', target: '_blank', rel: 'noopener noreferrer' }, distance ? nt('distance_source', 'Source: NRC radiation protection guide') : nt('chain_source', 'Source: NRC criticality definition')))),
      h('div', { className: 'ns-controls' },
        h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0 || (!distance && step > 0), value: (predictions.filter(function (p) { return p.id === prediction; })[0] || {}).label },
        h('h5', null, distance ? nt('distance_prediction', 'Move from 1 m to 2 m. How much intensity will the detector read?') : nt('chain_prediction', 'If each reaction starts one more, what happens to the chain?')),
        h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, predictions.map(function (p) { return button(p.label, prediction === p.id, function () { props.onChange({ prediction: p.id }); }, runs.length > 0 || (!distance && step > 0), p.id); }))),
        h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
        prediction ? eligible ? null : nkStudioGuidance(h, nt,
          distance ? nt('guide_distance', '{count} of 2 comparison readings recorded. Take a reading at {distance}.', { count: (runs.indexOf(1) >= 0 ? 1 : 0) + (runs.indexOf(2) >= 0 ? 1 : 0), distance: metres(nextSetting) })
            : needsSetup ? nt('guide_chain_setup', '{count} of 2 comparison runs recorded. Prepare factor {factor}, then observe four generations.', { count: runs.length ? 1 : 0, factor: nextSetting })
              : nt('guide_chain_steps', 'This run: {count} of 4 generations observed. Advance until the run is recorded.', { count: step }),
          distance ? nt('guide_set_distance', 'Set distance to {distance}', { distance: metres(nextSetting) }) : nt('guide_set_factor', 'Prepare factor {factor}', { factor: nextSetting }), needsSetup ? prepareNext : null)
          : h('p', { className: 'ns-note' }, distance ? nt('distance_instruction', 'Take readings at 1 m and 2 m. Try 4 m when you are ready.') : nt('chain_instruction', 'Run four generations with factor 1, then compare with another factor.')),
        h('div', { className: 'ns-choices', role: 'group', 'aria-label': distance ? nt('distance_group', 'Detector distance') : nt('chain_group', 'Next-generation factor') }, settings.map(function (value) { return button(distance ? metres(value) : factorName(value), setting === value, function () { if (value !== setting) { props.onChange({ setting: value, step: 0 }); setStatus(''); } }, false, value); })),
        h('button', { ref: runRef, type: 'button', className: 'ns-primary', disabled: !prediction || (!distance && step >= 4), onClick: run }, distance ? nt('distance_test', 'Take a reading →') : step >= 4 ? nt('chain_four_done', 'Four generations observed') : nt('chain_advance', 'Advance one generation →')),
        !prediction ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
        h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status),
        distance && last !== null && last !== setting ? h('p', { className: 'ns-feedback' }, nt('distance_draft', 'Distance changed. Take a reading to update the detector.')) : null,
        eligible ? h('p', { className: 'ns-feedback' }, distance ? nt('distance_discovery', 'Doubling the distance gave 25% of the original intensity.') : nt('chain_discovery', 'With factor 1, every generation still has 20 expected reactions.')) : null,
        h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange({ prediction: null, step: 0, runs: [], explanation: null }); setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.')); } }, nt('intro_restart', 'Start again')),
        nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : distance ? nt('hint_distance', 'Record a reading at 1 m, then at 2 m. Compare the two numbers in your observations.') : nt('hint_chain', 'Finish four generations with factor 1. Then choose Fewer or More and finish four more. Compare the final counts.'), props.kind),
        eligible ? h('div', { className: 'ns-explain', 'data-ns-explain': props.kind },
          h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', null, nt('evidence_question', 'What does your evidence show?')),
          button(distance ? nt('distance_explain_no', 'Moving the detector makes the source emit less.') : nt('chain_explain_no', 'A steady chain has stopped reacting.'), data.explanation === 'retry', function () { explain(false); }),
          button(distance ? nt('distance_explain_yes', 'The same output spreads over a larger area.') : nt('chain_explain_yes', 'A steady chain keeps producing new reactions.'), data.explanation === 'correct', function () { explain(true); }),
          data.explanation === 'retry' ? (function () {
            var diag = nkDiagnoseMisconception(distance ? 'distance' : 'chain', distance ? 'source-weaker' : 'stopped', distance ? 'quarter' : 'steady');
            return h('div', null,
              h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('compare_again', 'Compare the numbers in your notebook. You can revise your explanation.')),
              h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': props.kind }, diag.whyNot),
              canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_mission_coaching', 'Read physics coaching aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null);
          })() : null,
          data.explanation === 'correct' ? (function () {
            var diag = nkDiagnoseMisconception(distance ? 'distance' : 'chain', prediction, distance ? 'quarter' : 'steady');
            return h('div', null,
              h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')),
              h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': props.kind + '-done' }, diag.whyNot),
              canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_mission_debrief', 'Read discovery debrief aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null,
              h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel));
          })() : null) : null));
  }

  function NuclearCountingExperiment(props) {
    var ctx = props.ctx || {};
    var React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
    var canSpeak = typeof ctx.callTTS === 'function';
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var prediction = ['same', 'vary'].indexOf(data.prediction) >= 0 ? data.prediction : null;
    // Equal readings are separate measurements and must remain in the notebook.
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (value) { return Number.isInteger(value) && value >= 0 && value <= 1000; }).slice(-6);
    var eligible = runs.length >= 3;
    var total = runs.reduce(function (sum, value) { return sum + value; }, 0);
    var maximum = Math.max.apply(null, [1].concat(runs));
    var varied = runs.some(function (value) { return value !== runs[0]; });
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    function choice(id, label) {
      return h('button', { key: id, type: 'button', className: 'ns-choice', 'aria-pressed': prediction === id, disabled: runs.length > 0, onClick: function () { props.onChange({ prediction: id }); } }, label);
    }
    function explain(correct) {
      if (!eligible) return;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('try_explanation', 'Look at your observations, then try another explanation.'));
    }
    return h('div', { className: 'ns-grid', 'data-ns-intro': 'counting' },
      h('div', null,
        h('div', { className: 'ns-scene', 'data-ns-scene': 'counting' },
          h('div', { className: 'ns-scene-top' }, h('span', null, nt('counting_setup', 'Background only • same setup'))),
          runs.length ? h('div', { className: 'ns-count-chart', role: 'img', 'aria-label': nt('counting_chart', 'Successive 10-second readings: {counts} counts.', { counts: runs.join(', ') }) },
            runs.map(function (value, i) { return h('div', { key: i, className: 'ns-count-column', 'aria-hidden': 'true' }, h('strong', null, value), h('div', { className: 'ns-count-bar', style: { height: value / maximum * 120 + 'px' } }), h('span', null, i + 1)); }))
            : h('p', { className: 'ns-count-empty' }, nt('counting_empty', 'Take a count to start your comparison.')),
          h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, runs.length ? runs[runs.length - 1] : '—'), h('span', null, nt('counting_readout', 'counts in the last 10-second measurement'))),
          h('p', { className: 'ns-scene-note' }, nt('counting_simulated', 'Each press simulates a 10-second measurement.'))),
        h('div', { className: 'ns-notebook', 'data-ns-notebook': 'counting' }, h('h5', null, nt('notebook', 'Your observations')),
          runs.length ? h('table', null, h('caption', null, nt('counting_caption', 'Latest six readings. Every measurement lasts 10 seconds.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('counting_reading_column', 'Reading')), h('th', { scope: 'col' }, nt('counting_count_column', 'Counts')))),
            h('tbody', null, runs.map(function (value, i) { return h('tr', { key: i }, h('th', { scope: 'row' }, i + 1), h('td', null, value)); }))) : h('p', { className: 'ns-note' }, nt('empty_notebook', 'Your first test will appear here.')),
          runs.length ? h('p', { className: 'ns-note', style: { marginTop: 12, marginBottom: 0 } }, nt('counting_total', 'These readings: {counts} counts in {seconds} seconds.', { counts: total, seconds: runs.length * 10 })) : null),
        h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
          h('p', { className: 'ns-note' }, nt('counting_model', 'The background stays at an average of 0.42 counts per second. Each reading is a fresh random sample from the lab’s Poisson counting model. Real detectors have additional effects. Counts describe detected events; they are not a dose measurement.')),
          h('a', { href: 'https://www.nrc.gov/education-regulatory-research/the-student-corner/science-101/what-is-a-geiger-counter', target: '_blank', rel: 'noopener noreferrer' }, nt('counting_source', 'Source: NRC guide to Geiger counters')))),
      h('div', { className: 'ns-controls' },
        h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0, value: prediction === 'same' ? nt('counting_same', 'Exactly the same') : prediction === 'vary' ? nt('counting_vary', 'They can differ') : null },
        h('h5', null, nt('counting_prediction', 'Will three counts with the same setup always match?')),
        h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, choice('same', nt('counting_same', 'Exactly the same')), choice('vary', nt('counting_vary', 'They can differ')))),
        h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
        prediction ? eligible ? null : nkStudioGuidance(h, nt, nt('guide_counting', '{count} of 3 readings recorded. Take a 10-second count with the same setup.', { count: runs.length })) : h('p', { className: 'ns-note' }, nt('counting_instruction', 'Take three counts. Keep the setup and measuring time the same.')),
        h('button', { type: 'button', className: 'ns-primary', disabled: !prediction, onClick: function () {
          if (!prediction) return;
          var count = nkPoisson(GM_BACKGROUND * 10);
          props.onChange({ runs: runs.concat([count]).slice(-6) });
          setStatus(nt('counting_result', 'Recorded {count} counts in a simulated 10 seconds. {readings} readings in your notebook.', { count: count, readings: Math.min(6, runs.length + 1) }));
        } }, nt('counting_test', 'Take a 10-second count →')),
        !prediction ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
        h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status),
        eligible ? h('p', { className: 'ns-feedback' }, varied ? nt('counting_varied', 'Your readings range from {min} to {max}. The setup stayed the same.', { min: Math.min.apply(null, runs), max: Math.max.apply(null, runs) }) : nt('counting_matched', 'These readings match. Random readings can match by chance; try another if you like.')) : null,
        h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange({ prediction: null, runs: [], explanation: null }); setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.')); } }, nt('intro_restart', 'Start again')),
        nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : nt('hint_counting', 'Take at least three readings. Compare the counts while remembering that the setup did not change. Matching values are possible too.'), 'counting'),
        eligible ? h('div', { className: 'ns-explain', 'data-ns-explain': 'counting' },
          h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', null, nt('evidence_question', 'What does your evidence show?')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('counting_explain_no', 'Every higher count means the radiation level went up.')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'correct', onClick: function () { explain(true); } }, nt('counting_explain_yes', 'Random variation can change counts even with the same setup.')),
          data.explanation === 'retry' ? (function () {
            var diag = nkDiagnoseMisconception('counting', 'higher-means-more', 'vary');
            return h('div', null,
              h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('counting_retry', 'The model kept the background constant. A single higher reading can come from random variation.')),
              h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': 'counting' }, diag.whyNot),
              canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_counting_coaching', 'Read counting statistics coaching aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null);
          })() : null,
          data.explanation === 'correct' ? (function () {
            var diag = nkDiagnoseMisconception('counting', prediction, 'vary');
            return h('div', null,
              h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')),
              h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': 'counting-done' }, diag.whyNot),
              canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_counting_debrief', 'Read counting discovery debrief aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null,
              h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel));
          })() : null) : null));
  }

  function NuclearRayExperiment(props) {
    var ctx = props.ctx || {};
    var React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
    var canSpeak = typeof ctx.callTTS === 'function';
    var data = props.data && typeof props.data === 'object' && !Array.isArray(props.data) ? props.data : {};
    var setups = [
      { id: 'alpha-open', alpha: true, paper: false, label: nt('rays_alpha_open', 'Alpha · paper out') },
      { id: 'alpha-paper', alpha: true, paper: true, label: nt('rays_alpha_paper', 'Alpha · paper in') },
      { id: 'gamma-paper', alpha: false, paper: true, label: nt('rays_gamma_paper', 'Gamma · paper in') }
    ];
    var predictions = [
      { id: 'alpha', label: nt('rays_guess_alpha', 'Alpha only') },
      { id: 'both', label: nt('rays_guess_both', 'Both types') },
      { id: 'neither', label: nt('rays_guess_neither', 'Neither type') }
    ];
    var prediction = predictions.filter(function (item) { return item.id === data.prediction; })[0];
    var runs = (Array.isArray(data.runs) ? data.runs : []).filter(function (id, i, all) { return setups.some(function (item) { return item.id === id; }) && all.indexOf(id) === i; });
    var last = setups.filter(function (item) { return item.id === runs[runs.length - 1]; })[0];
    var eligible = setups.every(function (item) { return runs.indexOf(item.id) >= 0; });
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    function blocked(item) { return item.alpha && item.paper; }
    function result(item) { return blocked(item) ? nt('rays_stopped', 'Stopped by paper') : nt('rays_arrives', 'Reaches the detector'); }
    function testSetup(item) {
      if (!prediction) return;
      props.onChange({ runs: runs.filter(function (id) { return id !== item.id; }).concat([item.id]) });
      setStatus(nt('rays_result', '{setup}: {result}. The source is still emitting.', { setup: item.label, result: result(item) }));
    }
    function explain(correct) {
      if (!eligible) return;
      props.onExplain(correct);
      setStatus(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('rays_retry', 'Look at the source in all three tests. Paper changes what reaches the detector.'));
    }
    var alpha = !last || last.alpha, hasPaper = last && last.paper, stopped = last && blocked(last);
    return h('div', { className: 'ns-grid', 'data-ns-intro': 'rays' },
      h('div', null,
        h('div', { className: 'ns-scene', 'data-ns-scene': 'rays' },
          h('div', { className: 'ns-scene-top' }, h('span', null, nt('rays_scene', 'Source → paper → detector'))),
          h('svg', { className: 'ns-beam', viewBox: '0 0 420 180', 'aria-hidden': 'true' },
            h('defs', null,
              h('radialGradient', { id: 'nk-rays-src', cx: '50%', cy: '50%', r: '50%' },
                h('stop', { offset: '0%', stopColor: alpha ? '#fef08a' : '#e0f2fe', stopOpacity: 0.9 }),
                h('stop', { offset: '55%', stopColor: alpha ? '#fb7185' : '#a78bfa', stopOpacity: 0.75 }),
                h('stop', { offset: '100%', stopColor: alpha ? '#be123c' : '#4c1d95', stopOpacity: 0 })),
              h('linearGradient', { id: 'nk-rays-paper', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
                h('stop', { offset: '0%', stopColor: '#f8fafc' }),
                h('stop', { offset: '50%', stopColor: '#dbeafe' }),
                h('stop', { offset: '100%', stopColor: '#cbd5e1' })),
              h('radialGradient', { id: 'nk-rays-bragg', cx: '50%', cy: '50%', r: '50%' },
                h('stop', { offset: '0%', stopColor: '#fef9c3', stopOpacity: 0.95 }),
                h('stop', { offset: '50%', stopColor: '#fb7185', stopOpacity: 0.55 }),
                h('stop', { offset: '100%', stopColor: '#f43f5e', stopOpacity: 0 }))),
            h('circle', { cx: 48, cy: 78, r: 42, fill: 'url(#nk-rays-src)', opacity: last ? 0.65 : 0.35 }),
            h('circle', { cx: 48, cy: 78, r: 28, fill: last ? (alpha ? '#fb7185' : '#a78bfa') : '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
            h('text', { x: 48, y: 87, textAnchor: 'middle', fill: '#171131', fontSize: 28, fontWeight: 700 }, last ? alpha ? 'α' : 'γ' : '?'),
            h('rect', { x: 200, y: 20, width: 16, height: 112, rx: 3, fill: hasPaper ? 'url(#nk-rays-paper)' : 'none', stroke: '#d0e3f5', strokeWidth: 2, strokeDasharray: hasPaper ? undefined : '5 5' }),
            last ? h('g', null,
              h('path', { d: stopped ? 'M82 78 H198' : 'M82 78 H360', stroke: alpha ? '#fb7185' : '#38bdf8', strokeWidth: alpha ? 12 : 9, opacity: 0.22, strokeLinecap: 'round' }),
              alpha
                ? h('g', null,
                    h('path', { d: stopped ? 'M82 78 H198' : 'M82 78 H360', stroke: '#fda4af', strokeWidth: 4.5, strokeDasharray: '4 8', strokeLinecap: 'round' }),
                    [104, 132, 160, 186].concat(stopped ? [] : [232, 268, 304, 338]).map(function (px) {
                      return h('circle', { key: 'a-' + px, cx: px, cy: 78, r: 3.4, fill: '#fef08a', stroke: '#fb7185', strokeWidth: 1.4 });
                    }))
                : h('path', { d: 'M82 78 Q92 64 102 78 T122 78 T142 78 T162 78 T182 78 T202 78 T222 78 T242 78 T262 78 T282 78 T302 78 T322 78 T342 78 T360 78', fill: 'none', stroke: '#83f5e2', strokeWidth: 3.2, strokeLinecap: 'round' })) : null,
            stopped ? h('g', null,
              h('circle', { cx: 196, cy: 78, r: 18, fill: 'url(#nk-rays-bragg)' }),
              h('path', { d: 'M184 67 L198 89 M198 67 L184 89', stroke: '#fff1b5', strokeWidth: 3, strokeLinecap: 'round' })) : null,
            last && !stopped ? h('rect', { x: 362, y: 37, width: 38, height: 82, rx: 9, fill: '#2dd4bf', opacity: 0.26 }) : null,
            h('rect', { x: 367, y: 42, width: 28, height: 72, rx: 6, fill: last && !stopped ? '#65e2ce' : '#18304b', stroke: '#b8fff2', strokeWidth: 2 }),
            h('text', { x: 48, y: 155, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15 }, nt('rays_source_label', 'Source')),
            h('text', { x: 208, y: 155, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15 }, nt('rays_paper_label', 'Paper')),
            h('text', { x: 371, y: 155, textAnchor: 'middle', fill: '#edf5ff', fontSize: 15 }, nt('detector', 'Detector'))),
          h('p', { className: 'ns-signal', 'data-ns-reading': 'true' }, last ? result(last) : nt('rays_ready', 'What will get through?')),
          h('p', { className: 'ns-scene-note' }, last ? nt('rays_emitting', '{setup}. Source: still emitting.', { setup: last.label }) : nt('rays_pick', 'Make a prediction, then try a setup.')),
          last ? h('div', { className: 'ns-ray-identity' }, h('strong', null, alpha ? nt('rays_alpha_name', 'Meet alpha · α') : nt('rays_gamma_name', 'Meet gamma · γ')),
            h('p', null, alpha ? nt('rays_alpha_identity', 'A particle made of two protons and two neutrons.') : nt('rays_gamma_identity', 'A photon: a packet of electromagnetic energy.'))) : null,
          h('p', { className: 'ns-scene-note' }, nt('rays_schematic', 'Simplified paths, not measured counts.'))),
        h('div', { className: 'ns-notebook', 'data-ns-notebook': 'rays' }, h('h5', null, nt('notebook', 'Your observations')),
          runs.length ? h('table', null, h('caption', null, nt('rays_caption', 'The source keeps emitting in every test.')),
            h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('rays_setup_column', 'Setup')), h('th', { scope: 'col' }, nt('rays_path_column', 'Radiation path')))),
            h('tbody', null, setups.filter(function (item) { return runs.indexOf(item.id) >= 0; }).map(function (item) { return h('tr', { key: item.id }, h('th', { scope: 'row' }, item.label), h('td', null, result(item))); }))) : h('p', { className: 'ns-note' }, nt('empty_notebook', 'Your first test will appear here.'))),
        h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
          h('p', { className: 'ns-note' }, nt('rays_model', 'This qualitative model places the source very close to an ideal detector sensitive to both types. Paper stops typical alpha particles; gamma photons can pass through it. Real results depend on energy, material thickness, air gaps, and detector design. Background and scattering are omitted. Stopping a signal does not make a radioactive source stop emitting.')),
          h('a', { href: 'https://www.nrc.gov/facilities-safety/radiation-protection/radiation-and-its-health-effects/radiation-basics', target: '_blank', rel: 'noopener noreferrer' }, nt('rays_reference', 'Source: NRC radiation basics')))),
      h('div', { className: 'ns-controls' },
        h(NuclearStudioPrediction, { ctx: props.ctx, observed: runs.length > 0, value: prediction && prediction.label },
          h('h5', null, nt('rays_prediction', 'Which radiation will a sheet of paper stop in this model?')),
          h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('intro_prediction_group', 'Make your prediction') }, predictions.map(function (item) {
            return h('button', { key: item.id, type: 'button', className: 'ns-choice', 'aria-pressed': prediction && prediction.id === item.id || false, disabled: runs.length > 0, onClick: function () { props.onChange({ prediction: item.id }); } }, item.label);
          }))),
        h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
        h('h5', null, nt('rays_tests_heading', 'Three quick tests')),
        prediction ? eligible ? null : nkStudioGuidance(h, nt, nt('guide_rays', '{count} of 3 setups tested. Try {setup} next.', { count: runs.length, setup: (setups.filter(function (item) { return runs.indexOf(item.id) < 0; })[0] || setups[0]).label })) : h('p', { className: 'ns-note' }, nt('rays_instruction', 'Select a setup to test it. Watch both the source and the detector.')),
        h('div', { className: 'ns-path-choices', role: 'group', 'aria-label': nt('rays_setups', 'Test a radiation path') }, setups.map(function (item, i) {
          return h('button', { key: item.id, type: 'button', className: 'ns-choice ns-path-choice', 'data-ns-setup': item.id, 'aria-pressed': !!last && last.id === item.id, disabled: !prediction, onClick: function () { testSetup(item); } },
            h('span', { className: 'ns-path-number', 'aria-hidden': 'true' }, runs.indexOf(item.id) >= 0 ? '✓' : i + 1), h('span', null, h('strong', null, item.label), h('small', null, runs.indexOf(item.id) >= 0 ? nt('rays_test_again', 'Tested · select to repeat') : nt('rays_test_action', 'Select to test'))));
        })),
        !prediction ? h('p', { className: 'ns-note' }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
        h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status),
        h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onChange({ prediction: null, runs: [], explanation: null }); setStatus(nt('intro_reset', 'Comparison reset. Make a new prediction.')); } }, nt('intro_restart', 'Start again')),
        nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : nt('rays_hint', 'Try all three setups. Does the paper change the source, or the path between the source and detector?'), 'rays'),
        eligible ? h('div', { className: 'ns-explain', 'data-ns-explain': 'rays' }, h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')), h('h5', null, nt('evidence_question', 'What does your evidence show?')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'retry', onClick: function () { explain(false); } }, nt('rays_explain_no', 'Paper switches off the radioactive source.')),
          h('button', { type: 'button', className: 'ns-choice', 'aria-pressed': data.explanation === 'correct', onClick: function () { explain(true); } }, nt('rays_explain_yes', 'Paper blocks the alpha path while the source keeps emitting.')),
          data.explanation === 'retry' ? (function () {
            var diag = nkDiagnoseMisconception('rays', 'source-stops', 'alpha');
            return h('div', null,
              h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('rays_retry', 'Look at the source in all three tests. Paper changes what reaches the detector.')),
              h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': 'rays' }, diag.whyNot),
              canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_rays_coaching', 'Read radiation path coaching aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null);
          })() : null,
          data.explanation === 'correct' ? (function () {
            var diag = nkDiagnoseMisconception('rays', prediction ? prediction.id : 'alpha', 'alpha');
            return h('div', null,
              h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')),
              h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': 'rays-done' }, diag.whyNot),
              canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_rays_debrief', 'Read radiation path debrief aloud'), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null,
              h('button', { type: 'button', className: 'ns-primary', onClick: props.onNext }, props.nextLabel));
          })() : null) : null));
  }

  function NuclearExperimentStudio(props) {
    var ctx = props.ctx || {};
    var React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
    var canSpeak = typeof ctx.callTTS === 'function';
    var raw = props.state && typeof props.state === 'object' && !Array.isArray(props.state) ? props.state : {};
    var journey = [
      { id: 'decay', icon: '◉', title: nt('decay_title', 'The disappearing sample'), sub: nt('decay_sub', 'Explore half-life, one step at a time.') },
      { id: 'distance', icon: '↔', title: nt('distance_title', 'Give it some space'), sub: nt('distance_sub', 'Move a detector. Notice the difference.') },
      { id: 'rays', icon: 'α γ', title: nt('rays_title', 'What can paper stop?'), sub: nt('rays_sub', 'Meet alpha and gamma. Follow their paths.') },
      { id: 'shield', icon: '▥', title: nt('shield_title', 'The shielding challenge'), sub: nt('shield_sub', 'Build a fair test. Follow the beam.') },
      { id: 'counting', icon: '▂▅▃', title: nt('counting_title', 'One count, or a pattern?'), sub: nt('counting_sub', 'Repeat a reading. Look for variation.') },
      { id: 'chain', icon: '⇢', title: nt('chain_title', 'Keep the chain going'), sub: nt('chain_sub', 'Explore what steady really means.') }
    ];
    var hasMission = journey.some(function (item) { return item.id === raw.mission; });
    var savedWork = journey.some(function (item) { return nkStudioHasWork(item.id, raw[item.id]) || Array.isArray(raw.completed) && raw.completed.indexOf(item.id) >= 0 || raw[item.id] && typeof raw[item.id].reflection === 'string' && raw[item.id].reflection.length > 0; })
      || ['nucleus', 'investigation'].some(function (id) { return raw[id] && typeof raw[id] === 'object' && !Array.isArray(raw[id]) && Object.keys(raw[id]).length > 0; });
    var guided = raw.firstDiscovery === 'guided' ? !hasMission || raw.mission === 'distance' : !hasMission && !savedWork && raw.firstDiscovery !== 'explore';
    var mission = guided ? 'distance' : hasMission ? raw.mission : 'decay';
    var missionIndex = journey.findIndex(function (item) { return item.id === mission; });
    var decay = raw.decay && typeof raw.decay === 'object' ? raw.decay : {};
    var shield = raw.shield && typeof raw.shield === 'object' ? raw.shield : {};
    var step = Number.isInteger(decay.step) ? Math.max(0, Math.min(4, decay.step)) : 0;
    var prediction = [16, 32, 48].indexOf(decay.prediction) >= 0 ? decay.prediction : null;
    var materials = SHIELDS.filter(function (item) { return ['water', 'concrete', 'lead'].indexOf(item.id) >= 0; });
    function materialFor(id) { return materials.filter(function (item) { return item.id === id; })[0] || materials[0]; }
    function materialName(id) {
      return id === 'lead' ? nt('lead', 'Lead') : id === 'concrete' ? nt('concrete', 'Concrete') : nt('water', 'Water');
    }
    var material = materialFor(shield.material || 'water');
    var thickness = typeof shield.thickness === 'number' && isFinite(shield.thickness) ? Math.max(0, Math.min(10, Math.round(shield.thickness * 2) / 2)) : 2;
    var shieldPrediction = materials.some(function (item) { return item.id === shield.prediction; }) ? shield.prediction : null;
    var trials = (Array.isArray(shield.trials) ? shield.trials : []).filter(function (item) {
      return item && materials.some(function (mat) { return mat.id === item.material; })
        && typeof item.thickness === 'number' && isFinite(item.thickness) && item.thickness >= 0 && item.thickness <= 10;
    }).slice(-6).map(function (item) {
      return { material: item.material, thickness: item.thickness, percent: 100 * Math.exp(-materialFor(item.material).mu * item.thickness) };
    });
    var last = trials[trials.length - 1];
    var fairPair = trials.some(function (a, i) { return trials.some(function (b, j) { return j > i && a.material !== b.material && a.thickness > 0 && a.thickness === b.thickness; }); });
    var comparison = trials.filter(function (item) { return item.thickness > 0 && Number.isInteger(item.thickness * 2); }).slice(-1)[0];
    var comparisonThickness = comparison ? comparison.thickness : thickness > 0 ? thickness : 2;
    var comparisonMaterial = comparison && material.id === comparison.material ? comparison.material === 'lead' ? 'water' : 'lead' : material.id;
    var needsShieldSetup = thickness !== comparisonThickness || material.id !== comparisonMaterial;
    var completed = (Array.isArray(raw.completed) ? raw.completed : []).filter(function (item, i, all) { return journey.some(function (entry) { return entry.id === item; }) && all.indexOf(item) === i; });
    var unfinished = journey.filter(function (item) { return completed.indexOf(item.id) < 0 && nkStudioHasWork(item.id, raw[item.id]); });
    var resume = unfinished.filter(function (item) { return item.id === raw.lastWorked; })[0] || unfinished[0];
    var takeaways = {
      decay: nt('recap_decay', 'Each half-life halves the remaining parent atoms on average.'),
      distance: nt('recap_distance', 'Doubling the distance gives one quarter of the intensity in this ideal point-source model.'),
      rays: nt('recap_rays', 'Paper can stop alpha particles while the source keeps emitting. Gamma photons can pass through.'),
      shield: nt('recap_shield', 'At the same thickness, different materials transmit different amounts of radiation.'),
      counting: nt('recap_counting', 'Repeated counts can vary even when the setup stays the same.'),
      chain: nt('recap_chain', 'A steady chain keeps producing new reactions in each generation.')
    };
    var statusState = React.useState(''), status = statusState[0], setStatus = statusState[1];
    var titleRef = React.useRef(null), focusNext = React.useRef(false), chooserRef = React.useRef(null), focusChooser = React.useRef(false);
    var shieldRunRef = React.useRef(null), focusShieldRun = React.useRef(false);
    React.useEffect(function () {
      if (focusChooser.current && chooserRef.current) {
        chooserRef.current.open = true;
        var summary = chooserRef.current.querySelector('summary');
        if (summary) summary.focus();
        if (typeof chooserRef.current.scrollIntoView === 'function') chooserRef.current.scrollIntoView({ block: 'start', behavior: 'auto' });
        focusChooser.current = false;
        focusNext.current = false;
      } else if (focusNext.current && titleRef.current) {
        titleRef.current.focus();
        var section = titleRef.current.parentElement;
        if (section && typeof section.scrollIntoView === 'function') section.scrollIntoView({ block: 'start', behavior: 'auto' });
        focusNext.current = false;
      }
    }, [mission, guided]);
    React.useEffect(function () { if (focusShieldRun.current && shieldRunRef.current && !shieldRunRef.current.disabled) { shieldRunRef.current.focus(); focusShieldRun.current = false; } }, [material.id, thickness]);
    function update(part, patch, extra) {
      props.onChange(function (current) {
        var next = Object.assign({}, current, extra || {}, { lastWorked: part });
        next[part] = Object.assign({}, current && current[part], patch);
        return next;
      });
    }
    function say(text) { setStatus(text); }
    function liveResult() {
      return h('p', { role: 'status', className: 'ns-note', style: { minHeight: 24, margin: '12px 0' }, 'data-ns-status': 'true' }, status);
    }
    function selectMission(id) {
      focusNext.current = id !== mission || guided;
      if (chooserRef.current) chooserRef.current.open = false;
      if (id === mission && !guided && titleRef.current) titleRef.current.focus();
      setStatus('');
      props.onChange(function (current) { return Object.assign({}, current, { mission: id, firstDiscovery: 'explore' }); });
    }
    function startGuide() {
      focusNext.current = true;
      props.onChange(function (current) { return Object.assign({}, current, { mission: 'distance', firstDiscovery: 'guided' }); });
    }
    function browseGuide() {
      focusChooser.current = true;
      selectMission('distance');
    }
    function goNext() {
      if (missionIndex < journey.length - 1) selectMission(journey[missionIndex + 1].id);
      else props.onView('reactor');
    }
    var nextLabel = missionIndex < journey.length - 1 ? nt('continue_experiment', 'Continue: {title} →', { title: journey[missionIndex + 1].title }) : nt('continue_reactor', 'Continue to the reactor →');
    function conclude(part, correct) {
      var eligible = part === 'decay' ? step >= 2 : fairPair;
      if (!eligible) return;
      var alreadyDone = completed.indexOf(part) >= 0;
      update(part, { explanation: correct ? 'correct' : 'retry' }, correct ? { completed: alreadyDone ? completed : completed.concat([part]) } : null);
      if (correct && !alreadyDone && typeof props.onMissionComplete === 'function') props.onMissionComplete(part);
      say(correct ? nt('discovery_saved', 'Discovery recorded. Your evidence supports that explanation.') : nt('try_explanation', 'Look at your observations, then try another explanation.'));
    }
    function choice(label, selected, click, disabled, key) {
      return h('button', { key: key || label, type: 'button', className: 'ns-choice', 'aria-pressed': selected, disabled: disabled, onClick: click }, label);
    }
    function explanation(part, correctText, otherText) {
      var value = part === 'decay' ? decay : shield;
      var diag = value.explanation === 'retry'
        ? nkDiagnoseMisconception(part === 'decay' ? 'decay' : 'shielding', part === 'decay' ? 'linear-32' : 'all-blocked', part === 'decay' ? 16 : 'lead')
        : (value.explanation === 'correct'
          ? nkDiagnoseMisconception(part === 'decay' ? 'decay' : 'shielding', part === 'decay' ? prediction : shieldPrediction, part === 'decay' ? 16 : 'lead')
          : null);
      return h('div', { className: 'ns-explain', 'data-ns-explain': part },
        h('p', { className: 'ns-step' }, nt('explain_step', '3 / Explain')),
        h('h5', null, nt('evidence_question', 'What does your evidence show?')),
        choice(otherText, value.explanation === 'retry', function () { conclude(part, false); }),
        choice(correctText, value.explanation === 'correct', function () { conclude(part, true); }),
        value.explanation === 'correct' ? h('p', { className: 'ns-complete' }, nt('recorded', '✓ Discovery recorded')) : null,
        value.explanation === 'retry' ? h('p', { className: 'ns-feedback', 'data-kind': 'retry' }, nt('compare_again', 'Compare the numbers in your notebook. You can revise your explanation.')) : null,
        diag ? h('p', { className: 'ns-coach-whynot', 'data-ns-coach-whynot': part + (value.explanation === 'correct' ? '-done' : '') }, diag.whyNot) : null,
        diag && canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_studio_coaching', 'Read {topic} coaching aloud').replace('{topic}', part), onClick: function () { speakNuclear(ctx, diag.headline + '. ' + diag.whyNot + ' ' + diag.physicalRule); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null,
        value.explanation === 'correct' ? h('button', { type: 'button', className: 'ns-primary', onClick: goNext }, nextLabel) : null);
    }
    var remaining = 64 * Math.pow(0.5, step);
    var decayScene = h('div', { className: 'ns-scene', 'data-ns-scene': 'decay' },
      h('div', { className: 'ns-scene-top' }, h('span', null, nt('sample_chamber', 'Sample chamber')), h('span', null, nt('elapsed', '{count} half-lives', { count: step }))),
      h('div', { className: 'ns-atom-grid', role: 'img', 'aria-label': nt('atom_summary', 'Expected population: {remaining} of 64 parent atoms remain after {count} half-lives.', { remaining: remaining, count: step }) },
        Array.from({ length: 64 }, function (_, i) { return h('span', { key: i, className: 'ns-atom', 'data-decayed': (i * 17 % 64) >= remaining, 'aria-hidden': 'true' }); })),
      h('div', { className: 'ns-readout' }, h('strong', null, remaining), h('span', null, nt('parent_atoms', 'parent atoms remaining (expected)'))),
      h('div', { className: 'ns-legend', 'aria-hidden': 'true' }, h('span', null, h('i'), nt('remaining', 'Remaining')), h('span', null, h('i', { 'data-decayed': 'true' }), nt('decayed', 'Decayed'))));
    var decayControls = h('div', { className: 'ns-controls' },
      h(NuclearStudioPrediction, { key: 'decay-prediction', ctx: props.ctx, observed: step > 0, value: prediction },
      h('h5', null, nt('decay_prediction', 'After two half-lives, how many of 64 parent atoms remain?')),
      h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('decay_choices', 'Predict the remaining atoms') }, [16, 32, 48].map(function (n) {
        return choice(String(n), prediction === n, function () { update('decay', { prediction: n }); }, step > 0, n);
      }))),
      h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
      prediction && step < 2 ? nkStudioGuidance(h, nt, nt('guide_decay', '{count} of 2 half-lives observed. Advance one interval and watch the remaining atoms.', { count: step })) : null,
      h('button', { type: 'button', className: 'ns-primary', disabled: prediction === null || step >= 4, onClick: function () {
        var next = step + 1;
        update('decay', { step: next });
        say(nt('decay_result', 'After {count} half-lives, {remaining} of 64 parent atoms remain in the expected model.', { count: next, remaining: 64 * Math.pow(0.5, next) }));
      } }, step >= 4 ? nt('four_intervals', 'Four half-lives observed') : nt('advance_half', 'Advance one half-life →')),
      prediction === null ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
      liveResult(),
      step >= 2 ? h('div', { className: 'ns-feedback ns-result' }, prediction === 16 ? nt('decay_match', 'Your prediction matched: 64 → 32 → 16.') : nt('decay_surprise', 'A useful surprise: you predicted {guess}; the model gives 16 after two half-lives.', { guess: prediction })) : null,
      h('button', { type: 'button', className: 'ns-secondary', onClick: function () { update('decay', { step: 0, prediction: null, explanation: null }); say(nt('decay_reset', 'Sample reset. Make a new prediction.')); } }, nt('reset_sample', 'Reset sample')),
      nkStudioHint(h, nt, !prediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : step < 2 ? nt('hint_decay_run', 'Advance until you have observed two half-lives. Watch the number of parent atoms still remaining.') : nt('hint_decay_compare', 'Compare 64, 32, and 16. Ask what happens to the remaining atoms each time.'), 'decay'),
      step >= 2 ? explanation('decay', nt('decay_explain_yes', 'Each interval halves the atoms still remaining.'), nt('decay_explain_no', 'Each interval removes 32 atoms, every time.')) : null);
    var changedSettings = last && (last.material !== material.id || last.thickness !== thickness);
    var shieldScene = h('div', { className: 'ns-scene', 'data-ns-scene': 'shield' },
      h('div', { className: 'ns-scene-top' }, h('span', null, nt('gamma_beam', 'Gamma beam • 1 MeV')), h('span', null, nt('detector', 'Detector'))),
      (function () {
        var curThick = last ? last.thickness : thickness;
        var curMatId = last ? last.material : material.id;
        var curPct = last ? last.percent : Math.round(100 * Math.exp(-material.mu * thickness) * 10) / 10;
        var curFrac = Math.max(0, Math.min(1, curPct / 100));
        var slabW = 58 + curThick * 6;
        var slabPalette = curMatId === 'water'
          ? ['#0ea5e9', '#0284c7', '#0369a1']
          : curMatId === 'concrete'
            ? ['#94a3b8', '#64748b', '#475569']
            : ['#475569', '#334155', '#1e293b'];
        return h('svg', { className: 'ns-beam', viewBox: '0 0 500 210', 'aria-hidden': 'true' },
          h('defs', null,
            h('radialGradient', { id: 'nk-shd-src', cx: '50%', cy: '50%', r: '50%' },
              h('stop', { offset: '0%', stopColor: '#f5f3ff', stopOpacity: 0.95 }),
              h('stop', { offset: '55%', stopColor: '#a78bfa', stopOpacity: 0.8 }),
              h('stop', { offset: '100%', stopColor: '#6d28d9', stopOpacity: 0 })),
            h('linearGradient', { id: 'nk-shd-slab', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: slabPalette[0], stopOpacity: curMatId === 'water' ? 0.55 : 0.92 }),
              h('stop', { offset: '50%', stopColor: slabPalette[1], stopOpacity: curMatId === 'water' ? 0.65 : 0.95 }),
              h('stop', { offset: '100%', stopColor: slabPalette[2], stopOpacity: curMatId === 'water' ? 0.72 : 0.98 })),
            h('linearGradient', { id: 'nk-shd-atten', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
              h('stop', { offset: '0%', stopColor: '#c4b5fd', stopOpacity: 0.52 }),
              h('stop', { offset: '45%', stopColor: '#38bdf8', stopOpacity: Math.max(0.06, 0.34 * Math.sqrt(curFrac)) }),
              h('stop', { offset: '100%', stopColor: '#2dd4bf', stopOpacity: Math.max(0.03, 0.44 * curFrac) }))),
          h('circle', { cx: 52, cy: 100, r: 46, fill: 'url(#nk-shd-src)', opacity: 0.6 }),
          h('circle', { cx: 52, cy: 100, r: 32, fill: '#a78bfa', stroke: '#e9ddff', strokeWidth: 2 }),
          h('text', { x: 52, y: 110, fill: '#171131', fontSize: 30, textAnchor: 'middle', fontWeight: 700 }, 'γ'),
          [55, 77, 100, 123, 145].map(function (y) {
            return h('g', { key: 'in' + y },
              h('path', { d: 'M90 ' + y + ' H221', stroke: '#a78bfa', strokeWidth: 7, opacity: 0.16, strokeLinecap: 'round' }),
              h('path', { d: 'M90 ' + y + ' Q98 ' + (y - 6) + ' 106 ' + y + ' T122 ' + y + ' T138 ' + y + ' T154 ' + y + ' T170 ' + y + ' T186 ' + y + ' T202 ' + y + ' T218 ' + y, fill: 'none', stroke: '#c4b5fd', strokeWidth: 2.5, strokeLinecap: 'round' }));
          }),
          h('rect', { x: 223, y: 28, width: slabW, height: 145, rx: 8, fill: curThick === 0 ? 'none' : 'url(#nk-shd-slab)', stroke: '#a7d8f2', strokeDasharray: curThick === 0 ? '5 5' : undefined, strokeWidth: 2 }),
          curThick > 0 ? h('rect', { x: 225, y: 44, width: Math.max(4, slabW - 4), height: 113, rx: 5, fill: 'url(#nk-shd-atten)' }) : null,
          h('text', { x: 223 + slabW / 2, y: 106, fill: '#f1f8ff', fontSize: 18, fontWeight: 700, textAnchor: 'middle' }, curThick + ' cm'),
          last ? [55, 77, 100, 123, 145].map(function (y) {
            var outX = 225 + slabW;
            return h('g', { key: 'out' + y },
              h('path', { d: 'M' + outX + ' ' + y + ' H435', stroke: '#2dd4bf', strokeWidth: 5 + 5 * curFrac, opacity: 0.08 + 0.24 * curFrac, strokeLinecap: 'round' }),
              h('path', { d: 'M' + outX + ' ' + y + ' H435', stroke: '#83f5e2', strokeWidth: 1.6 + 3.4 * curFrac, opacity: 0.2 + 0.8 * curFrac, strokeDasharray: '7 5' }));
          }) : null,
          last ? h('rect', { x: 438, y: 25, width: 30, height: 153, rx: 9, fill: '#2dd4bf', opacity: 0.08 + 0.34 * curFrac }) : null,
          h('rect', { x: 443, y: 30, width: 20, height: 143, rx: 6, fill: '#65e2ce', stroke: '#b8fff2', strokeWidth: 2 }));
      })(),
      h('div', { className: 'ns-readout' }, h('strong', { 'data-ns-reading': 'true' }, last ? last.percent.toFixed(1) + '%' : '—'), h('span', null, nt('transmitted', 'of the original beam transmitted'))),
      h('p', { className: 'ns-note', style: { color: '#d0e3f5', textAlign: 'center', margin: '12px 0 0' } }, last ? nt('tested_setting', 'Last test: {material}, {thickness} cm', { material: materialName(last.material), thickness: last.thickness }) : nt('ready_test', 'Set up a shield, then test the beam.')));
    var shieldControls = h('div', { className: 'ns-controls' },
      h(NuclearStudioPrediction, { key: 'shield-prediction', ctx: props.ctx, observed: trials.length > 0, value: shieldPrediction ? materialName(shieldPrediction) : null },
      h('h5', null, nt('shield_prediction', 'At the same thickness, which passes the least gamma radiation?')),
      h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('shield_predict_group', 'Predict a shielding material') }, materials.map(function (item) {
        return choice(materialName(item.id), shieldPrediction === item.id, function () { update('shield', { prediction: item.id }); }, trials.length > 0, item.id);
      }))),
      h('p', { className: 'ns-step' }, nt('test_step', '2 / Experiment')),
      shieldPrediction ? fairPair ? null : nkStudioGuidance(h, nt,
        comparison ? nt('guide_shield_compare', 'Compare with your {material} result at {thickness} cm. Test another material at that same thickness.', { material: materialName(comparison.material), thickness: comparisonThickness })
          : nt('guide_shield_first', 'Start with one material at a thickness above zero. Then compare another material at the same thickness.'),
        nt('guide_set_shield', 'Prepare {material} at {thickness} cm', { material: materialName(comparisonMaterial), thickness: comparisonThickness }), needsShieldSetup ? function () {
          focusShieldRun.current = true;
          update('shield', { material: comparisonMaterial, thickness: comparisonThickness });
          say(nt('guide_prepared', 'Setup ready. Run the experiment to record a result.'));
        } : null)
        : h('p', { className: 'ns-note' }, nt('fair_test', 'Try two materials at the same nonzero thickness for a fair comparison.')),
      h('div', { className: 'ns-choices', role: 'group', 'aria-label': nt('test_material_group', 'Material to test') }, materials.map(function (item) {
        return choice(materialName(item.id), material.id === item.id, function () { update('shield', { material: item.id }); }, false, item.id);
      })),
      h('label', { className: 'ns-label', htmlFor: 'ns-thickness' }, nt('thickness', 'Thickness'), h('span', null, nt('centimetres', '{value} cm', { value: thickness }))),
      h('input', { id: 'ns-thickness', className: 'ns-range', type: 'range', min: 0, max: 10, step: .5, value: thickness, 'aria-valuetext': nt('centimetres_long', '{value} centimetres', { value: thickness }), onChange: function (e) { update('shield', { thickness: Number(e.target.value) }); } }),
      h('button', { ref: shieldRunRef, type: 'button', className: 'ns-primary', disabled: !shieldPrediction, onClick: function () {
        var row = { material: material.id, thickness: thickness };
        var duplicate = trials.some(function (item) { return item.material === row.material && item.thickness === row.thickness; });
        var next = trials.filter(function (item) { return item.material !== row.material || item.thickness !== row.thickness; }).concat([row]).slice(-6);
        update('shield', { trials: next });
        say(nt('shield_result', '{material}, {thickness} cm: {percent} percent of the beam transmitted.', { material: materialName(material.id), thickness: thickness, percent: (100 * Math.exp(-material.mu * thickness)).toFixed(1) }) + (duplicate ? ' ' + nt('repeat_test', 'Repeated setup; notebook updated.') : ''));
      } }, nt('test_shield', 'Test this shield →')),
      !shieldPrediction ? h('p', { className: 'ns-note', style: { marginTop: 8 } }, nt('choose_first', 'Choose a prediction to start. It is fine to change your mind after testing.')) : null,
      changedSettings ? h('p', { className: 'ns-feedback' }, nt('settings_changed', 'Settings changed. Test again to update the detector.')) : null,
      liveResult(),
      fairPair ? h('p', { className: 'ns-feedback' }, nt('fair_pair_done', 'You have a fair comparison. Use your notebook to explain the difference.')) : null,
      h('button', { type: 'button', className: 'ns-secondary', style: { marginTop: 12 }, onClick: function () { update('shield', { prediction: null, trials: [], explanation: null }); say(nt('shield_reset', 'Trials cleared. Make a new prediction.')); } }, nt('new_shield_trial', 'Start a new comparison')),
      nkStudioHint(h, nt, !shieldPrediction ? nt('hint_predict', 'Choose the prediction that seems most likely. A different result can help you discover something.') : nt('hint_shield', 'Test one material at 2 cm. Keep 2 cm selected, choose another material, and test again. Compare how much of the beam passes through.'), 'shield'),
      fairPair ? explanation('shield', nt('shield_explain_yes', 'At the same thickness, different materials transmit different amounts.'), nt('shield_explain_no', 'Any material blocks all gamma radiation.')) : null);
    if (guided) return h('div', { 'data-nk-studio': 'distance' },
      h('div', { className: 'ns-heading ns-first-header' },
        h('p', { className: 'ns-eyebrow' }, nt('first_start_here', 'Start here')),
        h('h3', { ref: titleRef, tabIndex: -1 }, nt('first_title', 'Move a detector. Make a discovery.')),
        h('p', null, nt('first_goal', 'Keep the source fixed. Compare two readings.')),
        h('button', { type: 'button', className: 'ns-secondary', onClick: browseGuide }, nt('first_browse', 'Choose another experiment'))),
      h(NuclearFirstDiscovery, { ctx: props.ctx, data: raw.distance, nextLabel: nextLabel,
        onNext: goNext, onExplore: function () { selectMission('distance'); },
        onChange: function (patch) { update('distance', patch, { mission: 'distance', firstDiscovery: 'guided' }); },
        onExplain: function (correct) {
          var alreadyDone = completed.indexOf('distance') >= 0;
          update('distance', { explanation: correct ? 'correct' : 'retry' }, correct ? { mission: 'distance', firstDiscovery: 'guided', completed: alreadyDone ? completed : completed.concat(['distance']) } : { mission: 'distance', firstDiscovery: 'guided' });
          if (correct && !alreadyDone && typeof props.onMissionComplete === 'function') props.onMissionComplete('distance');
        }
      }));
    return h('div', { 'data-nk-studio': mission },
      h('div', { className: 'ns-hero' },
        h('div', null, h('p', { className: 'ns-eyebrow' }, nt('eyebrow', 'Nuclear & Radiation Lab')), h('h3', null, nt('title', 'Small experiments. Big discoveries.')), h('p', null, nt('intro', 'Make a prediction, change one thing, and see what the evidence says.'))),
        h('div', { className: 'ns-progress', 'aria-label': nt('progress_total', '{count} of {total} discoveries recorded', { count: completed.length, total: journey.length }) }, h('strong', null, completed.length + ' / ' + journey.length), h('span', null, nt('discoveries', 'discoveries recorded')))),
      h('details', { className: 'ns-notebook ns-first-invite' }, h('summary', null, nt('first_invite', 'Try a guided first discovery')),
        h('p', { className: 'ns-note' }, nt('first_invite_note', 'Compare 1 m and 2 m, with one action at each step. Your saved readings stay with you.')),
        h('button', { type: 'button', className: 'ns-primary', onClick: startGuide }, nt('first_open', 'Open the distance guide →'))),
      h('details', { className: 'ns-notebook ns-warmup-entry' }, h('summary', null, nt('nucleus_invite', 'New to nuclei? Try the nucleus builder')),
        h('p', { className: 'ns-note' }, nt('nucleus_entry', 'Meet protons, neutrons, and isotopes by building three small comparisons.')),
        h('button', { type: 'button', className: 'ns-primary', onClick: function () { props.onView('nucleus'); } }, raw.nucleus && raw.nucleus.solved === true ? nt('nucleus_revisit', 'Revisit the nucleus builder →') : raw.nucleus && ['same', 'changes'].indexOf(raw.nucleus.prediction) >= 0 ? nt('nucleus_resume', 'Resume the nucleus builder →') : nt('nucleus_start', 'Start the nucleus builder →'))),
      h('details', { className: 'ns-chooser', ref: chooserRef },
        h('summary', null, nt('choose_experiment', 'Choose an experiment'), h('span', { className: 'ns-position' }, nt('experiment_number', '{number} of {total}', { number: missionIndex + 1, total: journey.length }))),
        resume ? h('button', { type: 'button', className: 'ns-secondary ns-resume', 'data-ns-resume': resume.id, onClick: function () { selectMission(resume.id); } }, nt('resume_experiment', 'Resume: {title}', { title: resume.title })) : null,
        h('div', { className: 'ns-missions', role: 'group', 'aria-label': nt('choose_experiment', 'Choose an experiment') }, journey.map(function (item) {
          var saved = completed.indexOf(item.id) >= 0;
          return h('button', { key: item.id, className: 'ns-mission', 'data-ns-mission': item.id, type: 'button', 'aria-pressed': mission === item.id, onClick: function () { selectMission(item.id); } }, h('span', { className: 'ns-mission-icon', 'aria-hidden': 'true' }, item.icon), h('span', null, h('strong', null, item.title), h('small', null, item.sub), h('span', { className: 'ns-mission-state' }, saved ? nt('activity_recorded', 'Discovery recorded') : nkStudioHasWork(item.id, raw[item.id]) ? nt('activity_in_progress', 'In progress') : nt('activity_not_started', 'Not started'))), saved ? h('span', { className: 'ns-selected-mark', 'aria-label': nt('completed', 'Completed') }, '✓') : null);
        }))),
      h('div', { className: 'ns-heading' }, h('h4', { ref: titleRef, tabIndex: -1 }, mission === 'rays' ? nt('rays_heading', 'A signal disappears. Has the source stopped?') : mission === 'counting' ? nt('counting_heading', 'Can the same setup give different counts?') : mission === 'distance' ? nt('distance_heading', 'What changes when you move farther away?') : mission === 'chain' ? nt('chain_heading', 'Can a chain stay steady?') : mission === 'decay' ? nt('decay_heading', 'Where did the other atoms go?') : nt('shield_heading', 'Can you weaken the beam?')), h('p', null, mission === 'rays' ? nt('rays_goal', 'Compare two types of radiation. Put paper in the path and watch what changes.') : mission === 'counting' ? nt('counting_goal', 'A count is one detected event. Keep the setup unchanged and repeat.') : mission === 'distance' ? nt('distance_goal_plain', 'Keep the source the same. Compare how much radiation reaches the detector.') : mission === 'chain' ? nt('chain_goal_plain', 'A generation is one round of reactions. Watch what each round starts.') : mission === 'decay' ? nt('decay_goal', 'Start with 64 parent atoms. Predict what remains after two half-lives.') : nt('shield_goal', 'Compare water, concrete, and lead. Keep the thickness equal first.'))),
      ['distance', 'chain', 'counting', 'rays'].indexOf(mission) >= 0 ? h(mission === 'rays' ? NuclearRayExperiment : mission === 'counting' ? NuclearCountingExperiment : NuclearStarterExperiment, { key: mission, ctx: props.ctx, kind: mission, data: raw[mission], nextLabel: nextLabel, onNext: goNext, onChange: function (patch) { update(mission, patch); }, onExplain: function (correct) {
        var alreadyDone = completed.indexOf(mission) >= 0;
        update(mission, { explanation: correct ? 'correct' : 'retry' }, correct ? { completed: alreadyDone ? completed : completed.concat([mission]) } : null);
        if (correct && !alreadyDone && typeof props.onMissionComplete === 'function') props.onMissionComplete(mission);
      } }) : h('div', { className: 'ns-grid' },
        h('div', null, mission === 'decay' ? decayScene : shieldScene,
          h('div', { className: 'ns-notebook', 'data-ns-notebook': mission }, h('h5', null, nt('notebook', 'Your observations')),
            mission === 'decay' ? h('table', null, h('caption', null, nt('decay_notebook', 'Expected population after each interval')), h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('half_lives', 'Half-lives')), h('th', { scope: 'col' }, nt('atoms_left', 'Parent atoms remaining')))), h('tbody', null, Array.from({ length: step + 1 }, function (_, n) { return h('tr', { key: n }, h('th', { scope: 'row' }, n), h('td', null, 64 * Math.pow(.5, n))); })))
              : trials.length ? h('table', null, h('caption', null, nt('shield_notebook', 'Most recent six distinct test setups')), h('thead', null, h('tr', null, h('th', { scope: 'col' }, nt('material', 'Material')), h('th', { scope: 'col' }, nt('thickness', 'Thickness')), h('th', { scope: 'col' }, nt('beam_left', 'Beam left')))), h('tbody', null, trials.map(function (row, i) { return h('tr', { key: i }, h('th', { scope: 'row' }, materialName(row.material)), h('td', null, row.thickness + ' cm'), h('td', null, row.percent.toFixed(1) + '%')); })))
                : h('p', { className: 'ns-note' }, nt('empty_notebook', 'Your first test will appear here.'))),
          h('details', { className: 'ns-notebook' }, h('summary', null, nt('model_notes', 'How this model works')),
            h('p', { className: 'ns-note' }, mission === 'decay' ? nt('decay_model_note', 'The dots show the expected trend, not a prediction of which individual atom decays. Real radioactive decay is random: a sample of 64 can differ from these exact counts. Decayed parent atoms have changed into daughter nuclei; they have not vanished.') : nt('shield_model_note', 'This model uses exponential attenuation for a narrow beam of 1 MeV gamma photons and the lab’s existing material coefficients. It tracks radiation removed from the direct beam, including scattering. It is a teaching model, not a real shielding design.')),
            h('a', { href: mission === 'decay' ? 'https://www.nrc.gov/education-regulatory-research/glossary/half-life' : 'https://physics.nist.gov/PhysRefData/XrayMassCoef/chap2.html', target: '_blank', rel: 'noopener noreferrer' }, mission === 'decay' ? nt('nrc_source', 'Source: NRC half-life definition') : nt('nist_source', 'Source: NIST attenuation model')))),
        mission === 'decay' ? decayControls : shieldControls),
      completed.length ? h('details', { className: 'ns-notebook ns-recap' }, h('summary', null, nt('recap_notes_title', 'Your discoveries & notes ({count})', { count: completed.length })),
        h('ul', null, journey.filter(function (item) { return completed.indexOf(item.id) >= 0; }).map(function (item) {
          return h('li', { key: item.id, 'data-ns-discovery': item.id }, h('p', null, takeaways[item.id]), h('button', { type: 'button', className: 'ns-secondary', onClick: function () { selectMission(item.id); } }, nt('recap_revisit', 'Revisit: {title}', { title: item.title })),
            h(NuclearStudioReflection, { ctx: props.ctx, kind: item.id, title: item.title, note: raw[item.id] && raw[item.id].reflection, onChange: function (note) { update(item.id, { reflection: note }); } }));
        }))) : null,
      h('details', { className: 'ns-notebook ns-case-entry' }, h('summary', null, nt('case_title', 'Signal detective')),
        h('p', { className: 'ns-note' }, nt('case_entry', 'Put distance and shielding together. Solve a signal mystery with fair comparisons.')),
        h('button', { type: 'button', className: 'ns-primary', onClick: function () { props.onView('investigate'); } }, raw.investigation && raw.investigation.solved === true ? nt('case_revisit', 'Revisit the signal mystery →') : raw.investigation && (['distance', 'shield', 'both'].indexOf(raw.investigation.prediction) >= 0) ? nt('case_resume', 'Resume the signal mystery →') : nt('case_start', 'Start the signal mystery →'))),
      h(NuclearOfflinePhysicsCoach, { ctx: ctx, surface: 'studio', state: { mission: mission, shieldId: material.id, thick: thickness } }),
      h('div', { className: 'ns-studio-footer' }, h('span', null, nt('self_paced_footer', 'No timer. Test, revisit, and revise.')), h('button', { type: 'button', className: 'ns-secondary', onClick: function () { props.onView('reactor'); } }, nt('reactor_invite', 'Ready for more? Operate a reactor →'))));
  }

  function NuclearLabWorkspace(props) {
    var ctx = props.ctx, React = ctx.React, h = React.createElement, nt = nkStudioTranslate(ctx);
    __alloCtx_nuclearlab = ctx;
    var rawD = ctx.toolData && ctx.toolData._nuclearLab;
    var d = (rawD && typeof rawD === 'object' && !Array.isArray(rawD)) ? rawD : {};
    var mode = d.nkView === 'reference' || (!d.nkView && ['safe', 'me', 'safety', 'works', 'know'].indexOf(d.nkPath) >= 0) ? 'reference' : d.nkView === 'reactor' ? 'reactor' : d.nkView === 'investigate' ? 'investigate' : d.nkView === 'nucleus' ? 'nucleus' : 'studio';
    var contentRef = React.useRef(null), pendingFocus = React.useRef(false), wsXpRef = React.useRef({});
    React.useEffect(function () { if (pendingFocus.current && contentRef.current) { contentRef.current.focus(); pendingFocus.current = false; } }, [mode]);
    function changeView(next) {
      if (next === mode) return;
      pendingFocus.current = true;
      ctx.setToolData(function (prev) {
        var cur = prev && prev._nuclearLab;
        cur = (cur && typeof cur === 'object' && !Array.isArray(cur)) ? cur : {};
        return Object.assign({}, prev, { _nuclearLab: Object.assign({}, cur, { nkView: next, nkPath: null, nkOpen: false }) });
      });
    }
    function saveStudio(update, nextView) {
      ctx.setToolData(function (prev) {
        var curRaw = prev && prev._nuclearLab;
        var current = (curRaw && typeof curRaw === 'object' && !Array.isArray(curRaw)) ? curRaw : {};
        var studio = current.nkStudio;
        if (!studio || typeof studio !== 'object' || Array.isArray(studio)) studio = {};
        return Object.assign({}, prev, { _nuclearLab: Object.assign({}, current, { nkStudio: update(studio), nkView: nextView || mode }) });
      });
    }
    function awardStudioMissionXP(missionId) {
      if (typeof missionId !== 'string' || !missionId) return;
      var xpKey = 'studio_' + missionId;
      var ledger = nkSafeXpLedger(d._xpCredited);
      if ((!d._xpCredited || !ledger[xpKey]) && !wsXpRef.current[xpKey]) {
        wsXpRef.current[xpKey] = true;
        if (typeof ctx.awardXP === 'function') ctx.awardXP('nuclear_studio', 10, 'Recorded a Nuclear Lab studio discovery');
        ctx.setToolData(function (prev) {
          var curRaw = prev && prev._nuclearLab;
          var current = (curRaw && typeof curRaw === 'object' && !Array.isArray(curRaw)) ? curRaw : {};
          var nextLedger = nkSafeXpLedger(current._xpCredited);
          if (nextLedger[xpKey]) return prev;
          nextLedger[xpKey] = true;
          return Object.assign({}, prev, { _nuclearLab: Object.assign({}, current, { _xpCredited: nextLedger }) });
        });
      }
    }
    var studioRaw = d.nkStudio && typeof d.nkStudio === 'object' && !Array.isArray(d.nkStudio) ? d.nkStudio : {};
    var completedCount = Array.isArray(studioRaw.completed) ? studioRaw.completed.filter(function (id, i, all) { return all.indexOf(id) === i; }).length : 0;
    var evMasteredCount = Array.isArray(d.evidenceMastered) ? d.evidenceMastered.filter(function (id, i, all) { return all.indexOf(id) === i; }).length : 0;
    var activeIsoId = typeof d.isoId === 'string' ? d.isoId : 'c14';
    var activeIsoObj = ISOTOPES.filter(function (x) { return x.id === activeIsoId; })[0] || ISOTOPES[6];
    var wsContrast = !!(ctx && (ctx.isContrast === true || ctx.theme === 'contrast'));
    var wsLight = !wsContrast && (ctx.theme === 'light' || (ctx.theme == null && ctx.isDark === false));
    var wsReduced = !!(d.nkReduceMotion === true || (ctx && ctx.reduceMotion === true));
    var nkEmblemSvg = h('svg', { width: 48, height: 48, viewBox: '0 0 64 64', style: { flexShrink: 0 }, 'aria-hidden': 'true', focusable: 'false' },
      h('rect', { x: 2, y: 2, width: 60, height: 60, rx: 16, fill: 'rgba(15,23,42,0.72)', stroke: 'rgba(101,226,206,0.55)', strokeWidth: 1.5 }),
      h('ellipse', { cx: 32, cy: 32, rx: 22, ry: 9, fill: 'none', stroke: '#65e2ce', strokeWidth: 1.8, transform: 'rotate(-28 32 32)' }),
      h('ellipse', { cx: 32, cy: 32, rx: 22, ry: 9, fill: 'none', stroke: '#a78bfa', strokeWidth: 1.8, transform: 'rotate(28 32 32)' }),
      h('ellipse', { cx: 32, cy: 32, rx: 22, ry: 9, fill: 'none', stroke: '#38bdf8', strokeWidth: 1.6, transform: 'rotate(90 32 32)' }),
      h('circle', { cx: 32, cy: 32, r: 5.5, fill: '#65e2ce', stroke: '#f0fdfa', strokeWidth: 1.4 }),
      h('circle', { cx: 50, cy: 23, r: 2.6, fill: '#fbbf24' }),
      h('circle', { cx: 14, cy: 41, r: 2.6, fill: '#c4b5fd' })
    );
    function openStudioMission(missionId) {
      pendingFocus.current = true;
      saveStudio(function (current) { return Object.assign({}, current, { mission: missionId, firstDiscovery: 'explore' }); }, 'studio');
    }
    return h('div', { className: 'nk-workspace', 'data-nuclear-lab': mode === 'studio' ? 'true' : undefined, 'data-ns-large': !!d.nkLargeText, 'data-ns-reduced': wsReduced, 'data-nk-reduce-motion': wsReduced ? 'true' : 'false', 'data-theme': wsContrast ? 'contrast' : (wsLight ? 'light' : 'dark'), style: { containerType: 'inline-size' } },
      h('style', null, NK_STUDIO_CSS),
      h('div', { className: 'nk-studio-banner' },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: '1 1 260px' } },
          nkEmblemSvg,
          h('div', { style: { minWidth: 0 } },
            h('span', { className: 'nk-studio-badge' }, __alloT('stem.nuclearlab.banner_badge', 'Physics · Nuclear & Radiation Instrumentation')),
            h('p', { className: 'nk-studio-title' }, __alloT('stem.nuclearlab.banner_title', 'Nuclear & Radiation Workbench')),
            h('p', { className: 'nk-studio-sub' }, __alloT('stem.nuclearlab.banner_sub', 'Source-cited half-life decay, attenuation physics, counting statistics, and reactor control.'))
          )
        ),
        h('div', { className: 'nk-telemetry-row', role: 'group', 'aria-label': __alloT('stem.nuclearlab.banner_telemetry', 'Lab status readouts') },
          h('span', { className: 'nk-telemetry-pill' }, __alloT('stem.nuclearlab.pill_discoveries', 'Discoveries'), ' ', h('strong', null, completedCount + '/6')),
          h('span', { className: 'nk-telemetry-pill' }, __alloT('stem.nuclearlab.pill_evidence', 'Evidence'), ' ', h('strong', null, evMasteredCount + '/' + EVIDENCE_CLAIMS.length)),
          h('span', { className: 'nk-telemetry-pill' }, __alloT('stem.nuclearlab.pill_isotope', 'Isotope'), ' ', h('strong', null, activeIsoObj.name))
        ),
        h('div', { className: 'nk-quick-bar', role: 'group', 'aria-label': __alloT('stem.nuclearlab.banner_presets', 'Quick lab benches') },
          h('span', { className: 'nk-quick-label' }, __alloT('stem.nuclearlab.quick_label', 'Quick launch:')),
          h('button', { type: 'button', className: 'nk-quick-chip', onClick: function () { openStudioMission('decay'); } }, '⏳ ' + __alloT('stem.nuclearlab.quick_decay', 'Decay bench')),
          h('button', { type: 'button', className: 'nk-quick-chip', onClick: function () { openStudioMission('shield'); } }, '🛡️ ' + __alloT('stem.nuclearlab.quick_shield', 'Shielding bench')),
          h('button', { type: 'button', className: 'nk-quick-chip', onClick: function () { changeView('reactor'); } }, '🎛️ ' + __alloT('stem.nuclearlab.quick_reactor', 'Reactor room')),
          h('button', { type: 'button', className: 'nk-quick-chip', onClick: function () { changeView('reference'); } }, '📚 ' + __alloT('stem.nuclearlab.quick_reference', 'Reference guide'))
        )
      ),
      h('nav', { className: 'ns-nav', 'aria-label': nt('workspace_views', 'Nuclear Lab views') },
        [{ id: 'studio', label: nt('studio_view', 'Experiment studio') }, { id: 'reference', label: nt('reference_view', 'All topics & routes') }, { id: 'reactor', label: nt('reactor_view', 'Reactor control room') }].map(function (view) {
          return h('button', { key: view.id, type: 'button', 'aria-pressed': mode === view.id || (mode === 'investigate' || mode === 'nucleus') && view.id === 'studio', onClick: function () { changeView(view.id); } }, view.label);
        })),
      h('div', { ref: contentRef, tabIndex: -1, role: 'region', 'aria-label': mode === 'nucleus' ? nt('nucleus_title', 'Nucleus builder') : mode === 'investigate' ? nt('case_title', 'Signal detective') : mode === 'studio' ? nt('studio_view', 'Experiment studio') : mode === 'reactor' ? nt('reactor_view', 'Reactor control room') : nt('reference_view', 'All topics & routes') },
        mode === 'studio' ? h(NuclearExperimentStudio, { ctx: ctx, state: d.nkStudio, onView: changeView, onMissionComplete: awardStudioMissionXP, onChange: function (update) {
          saveStudio(update);
        } }) : mode === 'nucleus' ? h(NuclearNucleusBuilder, { ctx: ctx, data: d.nkStudio && d.nkStudio.nucleus, onView: changeView, onChange: function (patch) {
          saveStudio(function (current) {
            var saved = current.nucleus;
            if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
            return Object.assign({}, current, { nucleus: Object.assign({}, saved, patch) });
          });
        }, onDecay: function () {
          pendingFocus.current = true;
          saveStudio(function (current) { return Object.assign({}, current, { mission: 'decay', firstDiscovery: 'explore' }); }, 'studio');
        } }) : mode === 'investigate' ? h(NuclearSignalInvestigation, { ctx: ctx, data: d.nkStudio && d.nkStudio.investigation, onView: changeView, onChange: function (patch) {
          saveStudio(function (current) {
            var saved = current.investigation;
            if (!saved || typeof saved !== 'object' || Array.isArray(saved)) saved = {};
            return Object.assign({}, current, { investigation: Object.assign({}, saved, patch) });
          });
        }, onIntro: function (id) {
          pendingFocus.current = true;
          saveStudio(function (current) { return Object.assign({}, current, { mission: id, firstDiscovery: 'explore' }); }, 'studio');
        } }) : h(props.Reference, { key: mode, ctx: ctx })),
      mode === 'studio' && !ctx.embedded && typeof ctx.setStemLabTool === 'function' ? h('button', { type: 'button', className: 'ns-secondary', style: { marginTop: 12 }, onClick: function () { ctx.setStemLabTool(null); } }, nt('back_tools', '← Back to tools')) : null);
  }
  // END NUCLEAR EXPERIMENT STUDIO

  // ── Pure offline physics engine, mute-safe narration & XP dedup helpers ──
  function isNuclearGlobalMuted() {
    var fnMuted = false;
    try {
      if (typeof window !== 'undefined' && typeof window.__alloIsGlobalMuted === 'function') {
        fnMuted = !!window.__alloIsGlobalMuted();
      }
    } catch (e) { fnMuted = false; }
    return fnMuted || (typeof window !== 'undefined' && !!window._alloGlobalMute);
  }

  function speakNuclear(ctx, text) {
    if (isNuclearGlobalMuted()) return false;
    var msg = typeof text === 'string' ? text.trim() : '';
    if (!msg) return false;
    if (!ctx || typeof ctx.callTTS !== 'function') return false;
    try {
      ctx.callTTS(msg, undefined, undefined, { force: true });
      return true;
    } catch (e) { return false; }
  }

  function nkSafeXpLedger(val) {
    var out = {};
    if (!val || typeof val !== 'object' || Array.isArray(val)) return out;
    var keys = Object.keys(val);
    for (var i = 0; i < keys.length; i++) {
      if (val[keys[i]] === true) out[keys[i]] = true;
    }
    return out;
  }

  function nkEffectiveHalfLife(tpDays, tbDays) {
    var tp = Number(tpDays), tb = Number(tbDays);
    if (!(tp > 0) || !(tb > 0) || !isFinite(tp) || !isFinite(tb)) return null;
    return (tp * tb) / (tp + tb);
  }

  function nkGammaTransmissionPct(shieldId, thickCm) {
    var sh = SHIELDS.filter(function (x) { return x.id === shieldId; })[0];
    var th = Number(thickCm);
    if (!sh || !isFinite(th) || th < 0) return null;
    return Math.exp(-sh.mu * th) * 100;
  }

  function nkDiagnoseMisconception(topic, guess, truth) {
    var tNorm = typeof topic === 'string' ? topic.toLowerCase().trim() : '';
    var gRaw = guess == null ? '' : String(guess).trim();
    var gNorm = gRaw.toLowerCase();
    var trRaw = truth == null ? '' : String(truth).trim();
    var trNorm = trRaw.toLowerCase();
    var matched = !!(gNorm && trNorm && gNorm === trNorm);
    var leadCols = Math.round(nkCollisionsToThermal(207));
    var hydCols = Math.round(nkCollisionsToThermal(1));

    function pack(domain, headline, whyNot, physicalRule, verifyHere, source) {
      return Object.freeze({
        topic: domain,
        guess: gRaw,
        truth: trRaw,
        matched: matched,
        headline: headline,
        whyNot: whyNot,
        physicalRule: physicalRule,
        verifyHere: verifyHere,
        source: source
      });
    }

    if (tNorm === 'shielding' || tNorm === 'shield' || tNorm === 'rays' || tNorm === 'neutron' || tNorm === 'alpha' || tNorm === 'beta' || tNorm === 'gamma') {
      if (gNorm === 'source-stops' || /switch|turn off|stop emitting/.test(gNorm)) {
        return pack('shielding', 'Shielding intercepts the path, not the decay',
          'A sheet of paper stops alpha particles on their way to the detector, but it cannot reach inside the nucleus to switch off radioactive decay. The source keeps emitting at the same rate.',
          'Alpha is a heavy doubly-charged He-4 nucleus stopped by paper or dead outer skin; gamma is an uncharged photon that passes through paper.',
          'Compare Alpha · paper in against Gamma · paper in, or open section 5 (Shielding).',
          NK_SOURCES.nist.label);
      }
      if (gNorm === 'all-blocked' || /any material|blocks all gamma|stops all gamma/.test(gNorm)) {
        return pack('shielding', 'Gamma attenuates exponentially — never a sharp cutoff',
          'No single thickness blocks 100% of 1 MeV gamma photons. Beer-Lambert attenuation (I = I0 * e^(-mu * x)) cuts the beam by a fixed fraction per centimetre, so 2 cm of lead transmits 21.4% while 2 cm of water transmits 86.8%.',
          'Higher electron density gives a larger attenuation coefficient: lead mu = 0.771 cm^-1, concrete 0.149 cm^-1, water 0.0707 cm^-1 at 1 MeV.',
          'Test two materials at the same 2 cm thickness in the Shielding challenge or section 5.',
          NK_SOURCES.nist.label);
      }
      if (gNorm === 'lead-neutrons' || (tNorm === 'neutron' && /lead/.test(gNorm)) || (/lead/.test(gNorm) && /water|hydrogen|poly|concrete|moderator|layer/.test(trNorm))) {
        return pack('shielding', 'Dense lead cannot slow neutrons down alone',
          'Lead slows fast neutrons poorly by elastic bouncing because a lead nucleus (A = 207) is 207 times heavier than a neutron — taking roughly ' + leadCols + ' collisions to reach thermal energy, and inelastic removal shuts off below ~1 MeV. Hydrogen-rich water or polyethylene (A = 1) moderates a 2 MeV neutron in about ' + hydCols + ' collisions so boron or hydrogen can capture it.',
          'Fast neutrons need low-mass hydrogenous moderation first, capture second, and heavy-metal shielding for the resulting gamma rays.',
          'Select Neutron in section 5 (Shielding) and compare Lead against Water or Concrete.',
          NK_SOURCES.nist.label);
      }
      if (gNorm === 'lead-beta' || (/lead/.test(gNorm) && /beta|plastic|alumin/.test(trNorm))) {
        return pack('shielding', 'Shield beta with low-Z plastic or aluminium, not bare lead',
          'Decelerating fast beta electrons abruptly in high-Z lead produces secondary bremsstrahlung X-rays. A few millimetres of low-Z plastic or aluminium stops beta particles cleanly without generating strong X-rays.',
          'Match the shield to the radiation: paper for alpha, plastic/aluminium for beta, lead/concrete for gamma, hydrogenous material + absorber for neutrons.',
          'Select Beta in section 5 (Shielding) to inspect its range and secondary X-ray note.',
          NK_SOURCES.nist.label);
      }
      if (gNorm === 'alpha-harmless' || (/alpha/.test(gNorm) && /internal|inhale|radon|lung|tissue/.test(trNorm))) {
        return pack('shielding', 'Low external penetration does not mean safe internally',
          'Intact dead skin stops external alpha particles, but if an alpha emitter (like radon-222 daughters or polonium-210) is inhaled or swallowed, every bit of its high-LET energy lands inside living cells (wR = 20).',
          'External hazard scales with penetration; internal hazard scales with ionising density (alpha wR = 20 vs gamma wR = 1).',
          'Compare Alpha and Gamma in section 5 (Shielding) and section 8 (Gray to Sievert).',
          NK_SOURCES.icrp103.label);
      }
      if (gNorm === 'water' || gNorm === 'concrete') {
        var tx = nkGammaTransmissionPct(gNorm, 2);
        return pack('shielding', 'Dense high-Z lead absorbs far more 1 MeV gamma per centimetre',
          'At 2 cm, ' + gNorm + ' still lets ' + (tx != null ? tx.toFixed(1) : 'most') + '% of a 1 MeV gamma beam through, whereas 2 cm of lead cuts it to 21.4% because lead has much higher electron density (mu = 0.771 cm^-1).',
          'For 1 MeV gamma rays, transmission follows I / I0 = e^(-mu * x) with mu_lead > mu_concrete > mu_water.',
          'Compare Water, Concrete, and Lead at 2 cm in the Shielding bench.',
          NK_SOURCES.nist.label);
      }
      if (gNorm === 'both' || gNorm === 'neither') {
        return pack('shielding', 'Alpha and gamma behave differently at a sheet of paper',
          (gNorm === 'both' ? 'Paper stops heavy doubly-charged alpha particles, but high-energy gamma photons pass straight through a sheet of paper.' : 'Even a thin sheet of paper stops alpha particles because their +2 charge and large mass lose energy rapidly over micrometres of solid matter.'),
          'Penetration order in ordinary matter: alpha (paper/skin) < beta (mm of plastic/Al) < gamma (exponential attenuation in lead/concrete).',
          'Compare Alpha · paper in and Gamma · paper in in the radiation path bench.',
          NK_SOURCES.nrc.label);
      }
      return pack('shielding', 'Your shielding model matches attenuation physics',
        'Alpha is stopped by paper/skin, beta by mm of plastic/aluminium, gamma attenuates exponentially by electron density (lead > concrete > water), and neutrons require hydrogen-rich moderation (~' + hydCols + ' collisions in H vs ~' + leadCols + ' in Pb).',
        'I_gamma = I0 * e^(-mu * x); neutron moderation scales with average log energy loss xi(A).',
        'Explore all four radiation types in section 5 (Shielding).',
        NK_SOURCES.nist.label);
    }

    if (tNorm === 'inverse_square' || tNorm === 'inverse-square' || tNorm === 'distance' || tNorm === 'protect') {
      if (gNorm === 'half' || gNorm === '50' || gNorm === '50%' || /1\/d\b|linear|half/.test(gNorm)) {
        return pack('inverse_square', 'Why 2 m gives 25%, not 50% (1/d² vs linear 1/d)',
          'Predicting half (50%) applies a linear 1/d rule, which ignores that radiation from a point source spreads over a 2D spherical surface of area 4*pi*d². Doubling distance quadruples that surface area (2² = 4), cutting intensity to 1/4 = 25% at 2 m and 1/16 = 6.25% at 4 m.',
          'Point-source geometric spreading obeys the inverse-square law: I(d) = I(1 m) / d².',
          'Compare your 1 m (100%), 2 m (25%), and 4 m (6.25%) readings in the distance notebook or section 13.',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'same' || gNorm === '100' || gNorm === '100%' || /no change|same/.test(gNorm)) {
        return pack('inverse_square', 'Fixed source output still spreads thinner with distance',
          'The source keeps emitting the same photons per second, so it is tempting to expect the same reading — but at 2 m those photons cross a sphere four times larger, so only 25% hit the same detector window.',
          'Intensity through a fixed detector area drops as 1 / d² with distance from a point source.',
          'Compare 1 m (100%) and 2 m (25%) in the distance bench or section 14 (Time, distance, shielding).',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'source-weaker' || /emit less|weaker source/.test(gNorm)) {
        return pack('inverse_square', 'Moving the detector never changes the source',
          'The detector is a passive sensor. Stepping back from 1 m to 2 m leaves nuclear decay in the source unchanged; the reading drops to 25% because the same emission spreads over four times the spherical area.',
          'Inverse-square reduction is pure spherical geometry (area = 4*pi*d²), not a change in source activity.',
          'Check the fixed-output source badge and compare 1 m (100%) with 2 m (25%).',
          NK_SOURCES.nrc.label);
      }
      return pack('inverse_square', 'Inverse-square law confirmed (1/d²)',
        'Doubling the distance from a point source spreads the same fixed output across four times the spherical surface area (4*pi*d²), cutting intensity to 25% (and 6.25% at 4 m). Note that very close to a finite detector (<6 cm), ideal 1/d² breaks down.',
        'I(d2) / I(d1) = (d1 / d2)² for an ideal point source in open air.',
        'Test distance alongside time and shielding in section 14 (Time, distance, shielding).',
        NK_SOURCES.nrc.label);
    }

    if (tNorm === 'half_life' || tNorm === 'half-life' || tNorm === 'decay' || tNorm === 'biohalf' || tNorm === 'dating' || tNorm === 'c14') {
      if (tNorm === 'biohalf' || /sum|add|average|longer|shorter clock/.test(gNorm)) {
        return pack('half_life', 'Effective half-life is strictly shorter than EITHER clock',
          'Physical decay (tp) and biological excretion (tb) remove a nuclide from the body simultaneously in parallel, so their removal RATES add — not their half-lives. Neither the sum, the average, nor the longer clock works, and when tp and tb are close (like Sr-90: 28.8 y vs 18 y), teff = 11.1 y falls well below even the shorter clock.',
          '1 / t_eff = 1 / t_p + 1 / t_b  =>  t_eff = (t_p * t_b) / (t_p + t_b) < min(t_p, t_b).',
          'Compare Cs-137, I-131, Sr-90, and Po-210 in section 9 (Physical vs biological half-life).',
          NK_SOURCES.icrp103.label);
      }
      if (tNorm === 'dating' || tNorm === 'c14' || /dinosaur|rock|million|billion|non-organic|50,?000/.test(gNorm)) {
        return pack('half_life', 'Carbon-14 dates organic remains up to ~50,000 years — not rocks or dinosaurs',
          'Carbon-14 (half-life 5,730 years) only enters living organisms via atmospheric CO2 and drops below ~1–2% after roughly 50,000 years (~8–9 half-lives), where measurement runs into background. Non-organic rocks and 66-million-year-old dinosaur fossils cannot be dated with C-14; geologists use U-238/Pb-206 (4.468 billion years) or K-Ar instead.',
          'Idealised radiocarbon age is logarithmic: t = 5,730 * ln(100 / %remaining) / ln 2, calibrated with tree-ring/coral curves.',
          'Slide C-14 remaining down to 1–2% in section 2 (Carbon dating) and compare U-238 in section 1.',
          NK_SOURCES.nudat.label);
      }
      if (gNorm === 'linear-32' || gNorm === '32' || gNorm === '0' || /removes 32|linear|fixed amount/.test(gNorm)) {
        return pack('half_life', 'Half-life halves what remains — it is not linear subtraction',
          'Subtracting a fixed 32 atoms each interval would wipe out all 64 parent atoms in two intervals. Radioactive decay is proportional to the remaining population: 64 -> 32 after 1 half-life -> 16 after 2 half-lives -> 8 after 3. Decayed parent nuclei transform into daughter nuclei rather than vanishing.',
          'N(t) = N0 * (1/2)^(t / T_1/2): each half-life multiplies the remaining parent nuclei by 1/2.',
          'Watch the 64-atom chamber step 64 -> 32 -> 16 -> 8 in the Decay bench or section 1.',
          NK_SOURCES.nudat.label);
      }
      if (gNorm === '48') {
        return pack('half_life', 'Two half-lives remove three quarters, leaving 16 of 64',
          '48 would mean only one quarter decayed over two intervals. The first half-life cuts 64 to 32 (half left); the second cuts 32 to 16 (one quarter left).',
          'After n half-lives, fraction remaining is (1/2)^n: n = 1 -> 50%, n = 2 -> 25%, n = 3 -> 12.5%.',
          'Step through two intervals in the Decay bench and check the table: 64, 32, 16.',
          NK_SOURCES.nudat.label);
      }
      return pack('half_life', 'Exponential half-life rule confirmed',
        'Each half-life multiplies remaining parent nuclei by 1/2 (64 -> 32 -> 16). Inside the body, parallel decay and excretion give t_eff = (t_p * t_b) / (t_p + t_b), and C-14 dating reaches its practical ceiling near 50,000 years for once-living organic samples.',
        'N(t) = N0 * (1/2)^(t / T_1/2); 1 / t_eff = 1 / t_p + 1 / t_b.',
        'Compare isotopes in section 1, C-14 in section 2, and body clearance in section 9.',
        NK_SOURCES.nudat.label);
    }

    if (tNorm === 'reactor' || tNorm === 'chain' || tNorm === 'operate' || tNorm === 'criticality' || tNorm === 'kinetics' || tNorm === 'scram') {
      if (gNorm === 'stopped' || gNorm === 'stop' || /stopped reacting|no reaction/.test(gNorm)) {
        return pack('reactor', 'Critical (k = 1) means steady continuous fission, not stopped',
          'A steady chain reaction has not stopped — it is balanced. With multiplication factor k = 1.00, each fission triggers on average exactly one new fission, keeping power steady (20 -> 20 -> 20). Stopping requires subcritical k < 1.',
          'k < 1 decays (subcritical), k = 1 holds steady power (critical), k > 1 grows (supercritical).',
          'Compare factor 0.8, 1.0, and 1.2 in the chain bench or hold k = 1.000 in section 6.',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'scram-cold' || /scram|decay heat|turn off|no cooling|pumps off/.test(gNorm)) {
        return pack('reactor', 'SCRAM stops fission, NOT decay heat',
          'Dropping every control rod halts the fission chain reaction within seconds, but billions of radioactive fission products already inside the fuel keep decaying and generating ~6–7% of full thermal power right after shutdown (falling slowly as ~t^-0.2). Without cooling pumps, fuel cladding still overheats toward 1,200 °C — the core physics of Fukushima Daiichi.',
          'Wigner-Way decay heat continues after SCRAM: cooling must remain active even at zero fission power.',
          'Run the Station blackout scenario in section 20 (Operate a reactor) and watch fuel temperature after SCRAM.',
          NK_SOURCES.unscear.label);
      }
      if (gNorm === 'prompt' || /prompt|delayed|instant/.test(gNorm)) {
        return pack('reactor', 'Delayed neutrons make reactor control possible',
          'Over 99.3% of fission neutrons appear promptly in ~0.0001 s, far too fast for mechanical rods. The tiny 0.65% delayed neutron fraction (beta = 0.0065) arrives seconds later from fission products, slowing the reactor period enough for operators to control it. Exceeding rho >= beta (prompt critical) collapses the period to milliseconds.',
          'Controlled operation stays strictly below prompt criticality (rho < beta = 650 pcm for U-235).',
          'Compare PWR (negative void feedback) vs RBMK (positive void feedback) in section 20.',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'grow' || /bomb|explode|nuclear weapon/.test(gNorm)) {
        return pack('reactor', 'Steady k = 1 holds constant power; power fuel cannot detonate like a weapon',
          'At k = 1, reactions stay constant rather than growing. Even in a severe accident, commercial LEU fuel (3–5% U-235, moderated by water) cannot assemble into a nuclear detonation (>90% U-235 weapons-grade). Steam or hydrogen explosions are thermal/chemical hazards, not nuclear yields.',
          'Commercial reactors use 3–5% LEU below the 20% IAEA HEU threshold and far below >90% weapons-grade.',
          'Inspect the enrichment safeguards ladder in section 4 and reactor kinetics in section 20.',
          NK_SOURCES.nrc.label);
      }
      return pack('reactor', 'Reactor balance and safety physics confirmed',
        'A critical core (k = 1) sustains constant fission power using the 0.65% delayed neutron margin (beta = 0.0065). After SCRAM, fission stops immediately, yet radioactive decay heat still demands continuous cooling.',
        'k = 1 steady; rho < beta keeps period slow; decay heat follows ~t^-0.2 after SCRAM.',
        'Test Steady power, Xenon pit, and Station blackout in section 20 (Operate a reactor).',
        NK_SOURCES.nrc.label);
    }

    if (tNorm === 'counting' || tNorm === 'dose' || tNorm === 'lowdose' || tNorm === 'alara' || tNorm === 'shelter' || tNorm === 'ki') {
      if (gNorm === 'same' || gNorm === 'higher-means-more' || /higher count|went up|exact/.test(gNorm)) {
        return pack('dose', 'Random Poisson noise makes repeated short counts vary',
          'Radioactive decay is fundamentally probabilistic: a true mean of N counts fluctuates with standard deviation sqrt(N). A single higher 10-second reading does not prove the radiation level increased — you need longer counts and paired background subtraction to separate signal from noise.',
          'Counting uncertainty is sigma = sqrt(N) (and sqrt(Ng + Nb)/t for paired net rate); 4x longer time halves relative error.',
          'Take repeated 10 s vs 10 min counts in section 13 (Measure it yourself).',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'ki-all' || /ki|iodide|anti-radiation/.test(gNorm)) {
        return pack('dose', 'Potassium iodide (KI) protects ONLY the thyroid from iodine-131',
          'KI is not a general anti-radiation pill. It saturates the thyroid with stable iodine so radioactive I-131 cannot accumulate there; it offers zero protection against external gamma, Cs-137, or other nuclides.',
          'Use KI only when public health officials direct it for a radioiodine release.',
          'Read the potassium iodide box in section 9 (Physical vs biological half-life).',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'evac-always' || /always evacuate/.test(gNorm)) {
        return pack('dose', 'Driving through a plume can deliver more dose than sheltering',
          'A masonry building or basement reduces outdoor dose rate by its dose reduction factor (DRF). Whenever getting clear takes longer than break-even time t_be = DRF * t_plume, sheltering gives the lower dose — alongside avoiding non-radiological evacuation harm.',
          'Compare shelter dose (rate * DRF * plume) against evacuation dose (rate * min(t_evac, plume)).',
          'Adjust release duration and hours-to-clear in section 16 (Shelter or evacuate).',
          NK_SOURCES.nrc.label);
      }
      if (gNorm === 'low-dose-zero' || gNorm === 'low-dose-proven' || /zero risk|100 msv|lnt|proven/.test(gNorm)) {
        return pack('dose', 'Below ~100 mSv, epidemiology hits an inverse-square sample-size wall',
          'Excess cancer risk is directly measurable above ~100 mSv. Below that, the cohort needed to separate a tiny excess from ~25% baseline cancer mortality grows as 1 / dose². Neither "proven zero risk" nor "measured body count" is directly demonstrated; regulators use LNT cautiously for protection limits.',
          'Required cohort size scales as 1 / dose² (10x smaller dose needs ~100x more people per group).',
          'Slide the cohort-size detector in section 12 (How risky is a small dose?).',
          NK_SOURCES.icrp103.label);
      }
      return pack('dose', 'Measurement & dose reasoning confirmed',
        'Radioactive counts fluctuate by sqrt(N), becquerels measure source decays while sieverts measure weighted biological dose (H = D * wR), and protection combines time, distance (1/d²), and shielding.',
        'sigma = sqrt(N); H = D * wR; E = sum(wT * H).',
        'Verify with sections 8, 12, 13, 14, and 16.',
        NK_SOURCES.icrp103.label);
    }

    return pack('general', 'Check the physical mechanism against the lab data',
      'Compare your prediction against two controlled observations where only one variable changes (distance, material/thickness, half-life interval, or rod position).',
      'Core nuclear laws in this lab: N = N0*(1/2)^n, I_gamma = I0*e^(-mu*x), I(d) = I(1)/d², 1/t_eff = 1/t_p + 1/t_b, and sigma = sqrt(N).',
      'Re-run the comparison in the notebook and check the matching Reference section.',
      NK_SOURCES.nudat.label);
  }

  function nkBuildOfflinePhysicsCoach(question, state) {
    var q = typeof question === 'string' ? question.trim() : '';
    var ql = q.toLowerCase();
    var st = (state && typeof state === 'object' && !Array.isArray(state)) ? state : {};
    var missionHint = typeof st.mission === 'string' ? st.mission.toLowerCase() : '';

    var topic = 'overview';
    if (/scram|decay heat|prompt|delayed|xenon|reactor|critical|rbmk|pwr|bwr|smr|enrich|bomb|meltdown|void|control rod/.test(ql)) topic = 'reactor';
    else if (/inverse|square|1\/d|distance|farther|closer|alara|stay time|time.*distance|25%\s+at\s+2\s*m|spread/.test(ql)) topic = 'inverse_square';
    else if (/neutron|moderat|shield|lead|paper|concrete|attenuat|beer|lambert|bremsstrahlung|x-ray/.test(ql)) topic = 'shielding';
    else if (/half[- ]?life|carbon|c-?14|dating|fossil|dinosaur|biological|excret|radon|chain|uranium|u-?238|isotope|decay/.test(ql)) topic = 'half_life';
    else if (/geiger|count|poisson|noise|background|becquerel|\bbq\b|cpm|cps|uncertain|currie/.test(ql)) topic = 'counting';
    else if (/dose|sievert|msv|gray|mgy|lnt|threshold|hormesis|low[- ]?dose|shelter|evacuat|\bki\b|iodide|chernobyl|fukushima|banana|ct scan/.test(ql)) topic = 'dose';
    else if (/binding|fusion|fission|iter|nif|nickel|iron|e\s*=\s*mc|mass defect|sun/.test(ql)) topic = 'binding';
    else if (/alpha|beta|gamma/.test(ql)) topic = 'shielding';
    else if (missionHint === 'rays' || missionHint === 'shield') topic = 'shielding';
    else if (missionHint === 'distance') topic = 'inverse_square';
    else if (missionHint === 'decay') topic = 'half_life';
    else if (missionHint === 'chain') topic = 'reactor';
    else if (missionHint === 'counting') topic = 'counting';

    var liveNote = '';
    if (typeof st.isoId === 'string') {
      var isoRec = ISOTOPES.filter(function (x) { return x.id === st.isoId; })[0];
      if (isoRec) liveNote = 'Active isotope in lab: ' + isoRec.name + ' (half-life ' + isoRec.hlText + ', ' + isoRec.decay + ').';
    }
    if (!liveNote && typeof st.shieldId === 'string' && typeof st.thick === 'number' && isFinite(st.thick)) {
      var shRec = SHIELDS.filter(function (x) { return x.id === st.shieldId; })[0];
      if (shRec) {
        var txPct = nkGammaTransmissionPct(shRec.id, st.thick);
        liveNote = 'Current shield setting: ' + st.thick.toFixed(1) + ' cm of ' + shRec.name + ' transmits ' + (txPct != null ? txPct.toFixed(1) : '—') + '% of 1 MeV gamma.';
      }
    }

    var reply;
    if (topic === 'shielding') {
      var leadCols = Math.round(nkCollisionsToThermal(207));
      var hydCols = Math.round(nkCollisionsToThermal(1));
      reply = {
        topic: 'shielding',
        title: 'Radiation Shielding & Neutron Moderation (Offline Physics)',
        answer: 'Different radiations interact with matter differently: heavy charged alpha particles stop in paper or dead skin (yet are intensely damaging if inhaled); fast beta electrons stop in millimetres of plastic or aluminium (avoid bare lead to limit secondary X-rays); 1 MeV gamma photons attenuate exponentially with material electron density (lead mu = 0.771 cm^-1 vs concrete 0.149 vs water 0.0707); and uncharged fast neutrons must first be moderated by light hydrogen nuclei (~' + hydCols + ' elastic collisions in water/polyethylene vs ~' + leadCols + ' in heavy lead) before capture.',
        formula: 'I_gamma(x) = I0 * e^(-mu * x);  xi(A) = 1 + a*ln(a)/(1-a),  N_thermal = ln(2 MeV / 0.025 eV) / xi(A)',
        keyFacts: [
          '2 cm at 1 MeV gamma: Lead 21.4% through, Concrete 74.2%, Water 86.8% (NIST XCOM).',
          'Fast neutron slowing to 0.025 eV: ~' + hydCols + ' collisions off H-1 vs ~' + leadCols + ' off Pb-207.',
          'Stopping alpha with paper blocks the path — the source itself keeps decaying.'
        ],
        caution: 'Educational narrow-beam teaching values (no buildup factor) — not a shielding engineering design.',
        citation: NK_SOURCES.nist.label + ' & ' + NK_SOURCES.nrc.label,
        misconceptionHint: nkDiagnoseMisconception('neutron', 'lead-neutrons', 'water').whyNot
      };
    } else if (topic === 'inverse_square') {
      reply = {
        topic: 'inverse_square',
        title: 'Inverse-Square Law & Time-Distance-Shielding (Offline Physics)',
        answer: 'Radiation emitted isotropically from a point source spreads over a sphere of surface area 4*pi*d². Doubling your distance multiplies area by 4, cutting dose rate to 25% (1/4), and quadrupling distance cuts it to 6.25% (1/16). Together with reducing stay time and adding shielding, distance is free and works on every penetrating radiation.',
        formula: 'I(d) = I(1 m) / d²;  half-rate distance = d * sqrt(2) ≈ 1.41 * d',
        keyFacts: [
          '1 m -> 100%, 2 m -> 25%, 4 m -> 6.25% (not linear 50% at 2 m).',
          'For steady sources, halving time halves dose; for short-lived isotopes like Tc-99m (6.0 h), integrate physical decay.',
          'Below ~6 cm from a GM tube, finite detector size breaks the ideal point-source 1/d² curve.'
        ],
        caution: 'Point-source open-air model; extended sources and scatter depart from pure 1/d².',
        citation: NK_SOURCES.nrc.label,
        misconceptionHint: nkDiagnoseMisconception('distance', 'half', 'quarter').whyNot
      };
    } else if (topic === 'half_life') {
      var c14 = ISOTOPES.filter(function (x) { return x.id === 'c14'; })[0];
      var sr = BIO_NUCLIDES.filter(function (x) { return x.id === 'sr90'; })[0];
      var srEff = sr ? nkEffectiveHalfLife(sr.tp, sr.tb) : 4050;
      reply = {
        topic: 'half_life',
        title: 'Half-Life, Carbon-14 Ceiling & Biological Clearance (Offline Physics)',
        answer: 'Radioactive half-life is multiplicative: every half-life halves the remaining parent nuclei (100% -> 50% -> 25% -> 12.5%). Carbon-14 (' + (c14 ? c14.hlText : '5,730 years') + ') dates once-living organic material back to roughly 50,000 years, after which <1–2% remains; older fossils and rocks require U-238 (4.47 billion years) or K-Ar. Inside a body, physical decay and biological excretion run in parallel, so effective half-life is strictly shorter than either clock alone.',
        formula: 'N(t) = N0 * (1/2)^(t / T_1/2);  t_C14 = 5730 * ln(100 / %) / ln 2;  t_eff = (t_p * t_b) / (t_p + t_b)',
        keyFacts: [
          'C-14 practical ceiling: ~50,000 years (organic samples only; laboratory dates use calibration curves).',
          'Sr-90 example: t_p ≈ 28.8 y and t_b ≈ 18 y combine to t_eff ≈ ' + (srEff / 365.25).toFixed(1) + ' y (shorter than both).',
          'U-238 decays in 14 steps to stable Pb-206; Rn-222 (3.82 d) is the only gas in the chain, allowing basement seepage.'
        ],
        caution: 'Biological half-lives vary with age, diet, and chemical form; physical half-lives are nearly invariant under ordinary conditions.',
        citation: NK_SOURCES.nudat.label + ' & ' + NK_SOURCES.icrp103.label,
        misconceptionHint: nkDiagnoseMisconception('c14', 'dinosaur', 'u238').whyNot
      };
    } else if (topic === 'reactor') {
      reply = {
        topic: 'reactor',
        title: 'Reactor Kinetics, Delayed Neutrons & Decay Heat (Offline Physics)',
        answer: 'A steady reactor runs at k = 1.000 using the 0.65% delayed neutron fraction (beta = 0.0065) to keep response times on the scale of seconds rather than prompt milliseconds. Dropping control rods (SCRAM) halts fission immediately, yet radioactive fission products still emit ~6–7% thermal decay heat right after shutdown — requiring uninterrupted cooling. Commercial PWR/BWR cores have negative void coefficients (boiling slows fission) and use 3–5% LEU, far below the >90% needed for weapons.',
        formula: 'rho = (k - 1) / k;  delayed margin beta = 0.0065 (650 pcm);  P_decay(t) ≈ P0 * 0.0781 * t^(-0.2)',
        keyFacts: [
          'Prompt critical (rho >= beta): reactor period collapses toward Lambda / (rho - beta) ≈ 0.05 s.',
          'Xenon-135 pit: dropping power lets I-135 (6.57 h) decay into neutron-absorbing Xe-135 (9.14 h) faster than flux burns it off.',
          'Enrichment thresholds: 0.72% natural, 3–5% LEU fuel, 20% IAEA HEU safeguards line, >90% weapons-grade.'
        ],
        caution: 'One-group teaching kinetics model — illustrates real feedback mechanisms, not plant licensing calculations.',
        citation: NK_SOURCES.nrc.label + ' & ' + NK_SOURCES.unscear.label,
        misconceptionHint: nkDiagnoseMisconception('reactor', 'scram-cold', 'cooling-needed').whyNot
      };
    } else if (topic === 'counting') {
      reply = {
        topic: 'counting',
        title: 'Counting Statistics: Poisson Noise, Bq vs cps vs mSv (Offline Physics)',
        answer: 'A Geiger tube counts clicks, not sieverts. Because radioactive decay is random in time, N counts carry a Poisson uncertainty of sqrt(N), and paired background subtraction adds the variances: sigma_net = sqrt(N_g + N_b) / t. Short counts scatter widely and can even yield a negative net count on background alone. Precision improves only as sqrt(t) — four times the counting time halves the relative uncertainty.',
        formula: 'sigma(N) = sqrt(N);  net = (N_g - N_b) / t ± sqrt(N_g + N_b) / t;  L_C = 2.33 * sqrt(2 * N_b)',
        keyFacts: [
          'Becquerel (Bq) = decays/s inside the source; cps = clicks/s in one detector geometry; mSv = weighted tissue dose.',
          'Background count rate here is 0.42 cps (~25 cpm) on a 6.16 cm² end-window GM tube.',
          'Cheap µSv/h displays assume one fixed photon energy (usually Cs-137 at 662 keV) and misread other energies.'
        ],
        caution: 'Never equate raw Geiger clicks with absorbed dose without energy-compensated calibration.',
        citation: NK_SOURCES.nrc.label,
        misconceptionHint: nkDiagnoseMisconception('counting', 'same', 'vary').whyNot
      };
    } else if (topic === 'dose') {
      var cohort10 = nkCohortNeeded(10, 0.055);
      reply = {
        topic: 'dose',
        title: 'Radiation Dose, Low-Dose Models & Emergency Action (Offline Physics)',
        answer: 'World average natural background is ~2.4 mSv/yr (mostly indoor radon), an abdominal CT is ~10 mSv, the ICRP worker limit is 20 mSv/yr, and ~100 mSv is the lowest dose with a clearly measurable cancer excess in survivor studies. Below 100 mSv, required study size grows as 1 / dose² (detecting 10 mSv needs ~' + nkFmt(cohort10 / 1e6, 1) + ' million people per group), so regulators use LNT (5.5%/Sv) as a cautious protection rule rather than a body-count formula. In a plume emergency, sheltering beats evacuating whenever getting clear takes longer than DRF * plume duration; KI protects ONLY the thyroid against I-131.',
        formula: 'H = D * w_R;  E = sum(w_T * H);  N_cohort ∝ 1 / dose²;  t_breakeven = DRF * t_plume',
        keyFacts: [
          'Radiation weighting w_R: gamma/beta = 1, protons = 2, alpha = 20 (ICRP 103).',
          'Lifecycle deaths/TWh: Coal 24.6, Oil 18.4, Gas 2.8, Hydro 1.3, Wind 0.04, Nuclear 0.03, Solar 0.02.',
          'Educational model only — in real emergencies or medical care, always follow official authorities and clinicians.'
        ],
        caution: 'Educational model — not emergency or medical instructions. Follow state/local officials and healthcare providers.',
        citation: NK_SOURCES.icrp103.label + ', ' + NK_SOURCES.inworks.label + ' & ' + NK_SOURCES.unscear.label,
        misconceptionHint: nkDiagnoseMisconception('dose', 'low-dose-zero', 'uncertain').whyNot
      };
    } else if (topic === 'binding') {
      reply = {
        topic: 'binding',
        title: 'Binding Energy Curve: Why Both Fission & Fusion Release Energy (Offline Physics)',
        answer: 'Binding energy per nucleon climbs from H-1 (0 MeV) to a summit at Ni-62 (8.795 MeV, with Fe-56 close behind at 8.790 MeV) and slopes gently down to U-235 (7.591 MeV). Moving toward that tighter-bound peak from EITHER side converts a tiny fraction of mass into energy (E = mc²): fusing D + T releases 17.6 MeV, splitting U-235 releases ~200 MeV — roughly 50 million times more per reaction than burning carbon (4.1 eV).',
        formula: 'E = delta_m * c²  (c² = 931.494 MeV / u)',
        keyFacts: [
          'Summit of nuclear stability: Ni-62 at 8.795 MeV/nucleon (AME2020).',
          'D-T fusion: 17.6 MeV (3.52 MeV/nucleon); U-235 fission: ~200 MeV (0.85 MeV/nucleon).',
          'Fusion status: NIF reached target-energy ignition (2022) and ITER targets D-T operation in 2039 — not yet commercial grid power.'
        ],
        caution: 'Separate operating fission technology from proposed/experimental fusion milestones.',
        citation: NK_SOURCES.nudat.label + ', ' + NK_SOURCES.iter.label + ' & ' + NK_SOURCES.nif.label,
        misconceptionHint: 'Both fission of heavy nuclei and fusion of light nuclei release energy because both move products closer to the Ni-62/Fe-56 binding-energy summit.'
      };
    } else {
      reply = {
        topic: 'overview',
        title: 'Offline Nuclear & Radiation Physics Coach',
        answer: 'Ask any question about radiation shielding (alpha/beta/gamma vs hydrogen neutron moderation), inverse-square distance (1/d²), half-life & C-14 dating (~50,000 yr ceiling), biological vs physical half-life, Geiger counting noise (sqrt(N)), low-dose risk models (LNT below 100 mSv), or reactor kinetics & decay heat after SCRAM. Every answer is computed 100% offline from this lab\'s verified NNDC, NIST, ICRP, NRC, and UNSCEAR tables.',
        formula: 'N = N0*(1/2)^n  |  I = I0*e^(-mu*x)  |  I ∝ 1/d²  |  1/t_eff = 1/t_p + 1/t_b  |  sigma = sqrt(N)',
        keyFacts: [
          'Shielding: paper stops alpha, plastic/Al stops beta, lead attenuates gamma, hydrogen moderates neutrons.',
          'Distance: doubling distance cuts point-source intensity to 25% (1/4), not 50%.',
          'Safety: SCRAM halts fission immediately, but decay heat still requires active cooling.'
        ],
        caution: '100% deterministic offline physics reference — no generative AI required.',
        citation: NK_SOURCES.nudat.label + ', ' + NK_SOURCES.nist.label + ' & ' + NK_SOURCES.icrp103.label,
        misconceptionHint: 'Try asking: "Why does lead fail to stop neutrons alone?" or "Why does C-14 stop around 50,000 years?"'
      };
    }

    var fullAnswer = liveNote ? reply.answer + ' ' + liveNote : reply.answer;
    var spokenSummary = reply.title + '. ' + fullAnswer + ' Key rule: ' + reply.misconceptionHint;
    return Object.freeze({
      topic: reply.topic,
      title: reply.title,
      answer: fullAnswer,
      formula: reply.formula,
      keyFacts: Object.freeze(reply.keyFacts.slice()),
      caution: reply.caution,
      citation: reply.citation,
      misconceptionHint: reply.misconceptionHint,
      spokenSummary: spokenSummary
    });
  }

  var NuclearLabPure = Object.freeze({
    version: '13.0',
    offlineOnly: true,
    xi: nkXi,
    collisionsToThermal: nkCollisionsToThermal,
    projectedRisk: nkProjected,
    cohortNeeded: nkCohortNeeded,
    distanceIntensity: nkStudioDistanceIntensity,
    effectiveHalfLife: nkEffectiveHalfLife,
    gammaTransmissionPct: nkGammaTransmissionPct,
    muEnAir: nkMuEnAir,
    gammaConst: nkGammaConst,
    integratedDose: nkIntegratedDose,
    timeToDose: nkTimeToDose,
    decayHeat: rxDecayHeat,
    scenarioProgress: rxScenarioProgress,
    safeXpLedger: nkSafeXpLedger,
    isGlobalMuted: isNuclearGlobalMuted,
    diagnoseMisconception: nkDiagnoseMisconception,
    buildOfflinePhysicsCoach: nkBuildOfflinePhysicsCoach
  });
  try {
    if (typeof window !== 'undefined') window.NuclearLabPure = NuclearLabPure;
  } catch (e) {}

  function NuclearOfflinePhysicsCoach(props) {
    var ctx = props.ctx || {};
    var React = ctx.React;
    var h = React.createElement;
    var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
    var surface = props.surface === 'studio' ? 'studio' : 'reference';
    var isContrast = !!props.isContrast;
    var isDark = isContrast || props.isDark !== false;
    var canSpeak = typeof ctx.callTTS === 'function';
    var qState = React.useState('');
    var draft = qState[0], setDraft = qState[1];
    var askedState = React.useState('');
    var asked = askedState[0], setAsked = askedState[1];
    var reply = nkBuildOfflinePhysicsCoach(asked, props.state);
    var inputId = 'nk-coach-input-' + surface;
    var prompts = [
      { id: 'neutrons', label: t('stem.nuclearlab.coach_chip_neutrons', 'Neutrons vs lead'), q: 'Why does lead not stop neutrons alone?' },
      { id: 'invsq', label: t('stem.nuclearlab.coach_chip_invsq', 'Why 25% at 2 m?'), q: 'Why is intensity 25% at 2 m instead of 50%?' },
      { id: 'c14', label: t('stem.nuclearlab.coach_chip_c14', 'C-14 & bio half-life'), q: 'Why does carbon-14 stop at 50,000 years and what is biological half-life?' },
      { id: 'scram', label: t('stem.nuclearlab.coach_chip_scram', 'SCRAM & decay heat'), q: 'Why do reactor pumps stay needed after SCRAM?' },
      { id: 'dose', label: t('stem.nuclearlab.coach_chip_dose', 'Low-dose LNT & counts'), q: 'Why do short Geiger counts vary and why is low-dose risk below 100 mSv uncertain?' }
    ];

    if (surface === 'studio') {
      return h('details', { className: 'ns-notebook ns-coach-panel', 'data-nk-offline-coach': 'studio' },
        h('summary', null, t('stem.nuclearlab.coach_studio_summary', 'Offline physics coach (deterministic reference)')),
        h('p', { className: 'ns-note' }, t('stem.nuclearlab.coach_intro', 'Ask a nuclear physics question or choose a topic. Answers are computed 100% offline from NNDC, NIST, ICRP, NRC, and UNSCEAR tables.')),
        h('div', { className: 'ns-coach-chips', role: 'group', 'aria-label': t('stem.nuclearlab.aria_coach_topics', 'Quick nuclear physics questions') },
          prompts.map(function (p) {
            return h('button', { key: p.id, type: 'button', className: 'ns-choice', 'aria-pressed': asked === p.q ? 'true' : 'false', onClick: function () { setDraft(p.q); setAsked(p.q); } }, p.label);
          })),
        h('div', { className: 'ns-coach-form' },
          h('label', { htmlFor: inputId, className: 'sr-only' }, t('stem.nuclearlab.coach_input_label', 'Ask an offline nuclear physics question')),
          h('input', { id: inputId, type: 'text', value: draft, placeholder: t('stem.nuclearlab.coach_placeholder', 'e.g. Why does water moderate neutrons better than lead?'), 'aria-label': t('stem.nuclearlab.coach_input_label', 'Ask an offline nuclear physics question'), onChange: function (e) { setDraft(e.target.value); }, onKeyDown: function (e) { if (e.key === 'Enter') setAsked(draft); } }),
          h('button', { type: 'button', className: 'ns-secondary', onClick: function () { setAsked(draft); } }, t('stem.nuclearlab.coach_ask_btn', 'Explain physics'))),
        h('div', { className: 'ns-coach-reply', 'data-nk-coach-topic': reply.topic },
          h('p', null, h('strong', null, reply.title)),
          h('p', null, reply.answer),
          h('p', { className: 'ns-note' }, h('strong', null, t('stem.nuclearlab.coach_formula_label', 'Model rule: ')), reply.formula),
          h('ul', null, reply.keyFacts.map(function (fact, idx) { return h('li', { key: idx }, fact); })),
          h('p', { className: 'ns-note', style: { marginTop: 8 } }, h('strong', null, t('stem.nuclearlab.coach_misconception_label', 'Common trap: ')), reply.misconceptionHint),
          h('p', { className: 'ns-note', style: { marginTop: 6, marginBottom: 0 } }, t('stem.nuclearlab.coach_sources_label', 'Sources: ') + reply.citation),
          canSpeak ? h('button', { type: 'button', className: 'ns-secondary ns-read-aloud', 'aria-label': t('stem.nuclearlab.aria_read_coach_reply', 'Read offline physics coach explanation aloud'), onClick: function () { speakNuclear(ctx, reply.spokenSummary); } }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null));
    }

    var cardBg = isContrast ? '#000000' : (isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.96)');
    var panelBg = isContrast ? '#000000' : (isDark ? 'rgba(15,23,42,0.62)' : 'rgba(248,250,252,0.96)');
    var headingCol = isContrast ? '#ffff00' : (isDark ? '#22d3ee' : '#0e7490');
    var bodyCol = isContrast ? '#ffffff' : (isDark ? '#e2e8f0' : '#1e293b');
    var mutedCol = isContrast ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569');
    var borderCol = isContrast ? '#fbbf24' : 'rgba(34,211,238,0.48)';
    return h('div', {
      'data-nk-offline-coach': 'reference',
      className: 'nk-section-card rounded-xl border p-3 mt-4',
      style: { borderColor: borderCol, borderLeft: '4px solid ' + (isContrast ? '#fbbf24' : '#22d3ee'), backgroundColor: cardBg }
    },
      h('h4', { className: 'nk-section-heading font-black mb-2 pb-2', style: { color: headingCol, fontSize: '0.875rem', lineHeight: '1.35rem', borderBottom: '1px solid ' + borderCol } },
        t('stem.nuclearlab.coach_ref_heading', '🧭 Offline Nuclear Physics Coach')),
      h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: mutedCol } },
        t('stem.nuclearlab.coach_intro', 'Ask a nuclear physics question or choose a topic. Answers are computed 100% offline from NNDC, NIST, ICRP, NRC, and UNSCEAR tables.')),
      h('div', { role: 'group', 'aria-label': t('stem.nuclearlab.aria_coach_topics', 'Quick nuclear physics questions'), className: 'flex flex-wrap gap-1.5 mb-2' },
        prompts.map(function (p) {
          var active = asked === p.q;
          return h('button', {
            key: p.id, type: 'button', 'aria-pressed': active ? 'true' : 'false',
            onClick: function () { setDraft(p.q); setAsked(p.q); },
            className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold',
            style: active
              ? (isContrast ? { background: '#000000', color: '#ffff00', border: '2px solid #ffff00' } : (isDark ? { background: '#22d3ee', color: '#0b1020', border: '1px solid #22d3ee' } : { background: '#0e7490', color: '#ffffff', border: '1px solid #0e7490' }))
              : (isContrast ? { background: '#000000', color: '#ffffff', border: '1px solid #fbbf24' } : { background: isDark ? 'rgba(30,41,59,0.92)' : '#ffffff', color: bodyCol, border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.35)') })
          }, p.label);
        })),
      h('div', { className: 'flex flex-wrap items-center gap-2 mb-2' },
        h('label', { htmlFor: inputId, className: 'sr-only' }, t('stem.nuclearlab.coach_input_label', 'Ask an offline nuclear physics question')),
        h('input', {
          id: inputId, type: 'text', value: draft,
          placeholder: t('stem.nuclearlab.coach_placeholder', 'e.g. Why does water moderate neutrons better than lead?'),
          'aria-label': t('stem.nuclearlab.coach_input_label', 'Ask an offline nuclear physics question'),
          onChange: function (e) { setDraft(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter') setAsked(draft); },
          className: 'min-h-11 flex-1 min-w-[12rem] rounded-lg px-3 py-2 text-[0.6875rem]',
          style: { background: isContrast ? '#000000' : (isDark ? 'rgba(15,23,42,0.88)' : '#ffffff'), color: bodyCol, border: '1px solid ' + (isContrast ? '#fbbf24' : (isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.5)')) }
        }),
        h('button', {
          type: 'button',
          onClick: function () { setAsked(draft); },
          className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black',
          style: isContrast ? { background: '#000000', color: '#ffff00', border: '2px solid #ffff00' } : { background: '#0e7490', color: '#ffffff', border: '1px solid #0e7490' }
        }, t('stem.nuclearlab.coach_ask_btn', 'Explain physics'))),
      h('div', { 'data-nk-coach-topic': reply.topic, className: 'rounded-lg border p-2.5', style: { borderColor: borderCol, background: panelBg } },
        h('p', { className: 'text-xs font-black mb-1', style: { color: headingCol } }, reply.title),
        h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: bodyCol } }, reply.answer),
        h('p', { className: 'text-[0.6875rem] font-mono mt-1.5', style: { color: mutedCol } }, reply.formula),
        h('ul', { className: 'mt-1.5 space-y-1 list-disc pl-4 text-[0.6875rem]', style: { color: bodyCol } },
          reply.keyFacts.map(function (fact, idx) { return h('li', { key: idx }, fact); })),
        h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: bodyCol } },
          h('strong', null, t('stem.nuclearlab.coach_misconception_label', 'Common trap: ')), reply.misconceptionHint),
        h('p', { className: 'text-[0.625rem] mt-1.5', style: { color: mutedCol } },
          t('stem.nuclearlab.coach_sources_label', 'Sources: ') + reply.citation),
        canSpeak ? h('button', {
          type: 'button',
          'aria-label': t('stem.nuclearlab.aria_read_coach_reply', 'Read offline physics coach explanation aloud'),
          onClick: function () { speakNuclear(ctx, reply.spokenSummary); },
          className: 'min-h-11 mt-2 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
          style: isContrast ? { background: '#000000', color: '#ffff00', border: '2px solid #ffff00' } : { background: isDark ? 'rgba(30,41,59,0.92)' : '#ffffff', color: bodyCol, border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.45)') }
        }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null));
  }

  // WCAG 1.4.3 high contrast (generated by gen_hc.cjs)
  (function() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('allo-nuclearlab-hc-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-nuclearlab-hc-css';
    st.textContent = ".theme-contrast [data-stem-tool-shell=\"nuclearLab\"] :is(.ns-first [data-ns-prediction-bar=predicted] .ns-case-fill,.ns-nav button[aria-pressed=true],.ns-choice[aria-pressed=true],.ns-atom,.ns-legend i,.ns-primary,.ns-chain-bar,.ns-count-bar,.ns-nucleon,.ns-nucleon[data-particle=neutron],.ns-pair-dot[data-filled=true],.ns-case-fill,.ns-case-chart-row[data-ns-case-bar=mystery] .ns-case-fill,.ns-first-progress li[data-state=current]>span,.ns-first-compare .ns-choice[aria-pressed=true]):not(:empty):not(svg,canvas,video,iframe,object){background-color:#000!important}.theme-contrast [data-stem-tool-shell=\"nuclearLab\"] :is(.ns-nav button[aria-pressed=true],.ns-choice[aria-pressed=true],.ns-primary,.ns-nucleon,.ns-nucleon[data-particle=neutron],.ns-first-progress li[data-state=current]>span,.ns-first-compare .ns-choice[aria-pressed=true]){color:#ffff00!important}.theme-contrast [data-stem-tool-shell=\"nuclearLab\"] a:not([style*=\"background\"]):not([class*=\"bg-\"]:not([class*=\"-50\"],[class*=\"-100\"],[class*=\"bg-white\"])){color:#ffff00!important}";
    document.head.appendChild(st);
  })();
  // end WCAG 1.4.3 high contrast
  window.StemLab.registerTool('nuclearLab', {
    _engine: NuclearLabPure,
    icon: '☢️',
    label: 'Nuclear & Radiation Lab',
    desc: 'Half-life and decay you can run, what actually stops alpha, beta and gamma, how fission and fusion work, radiation doses on a scale you can read, a simulated Geiger counter that shows why one short count lies, an evidence challenge for testing nuclear claims, why the same accident gets two death tolls a hundredfold apart, the three accidents in honest numbers, what to do with the waste, and where small modular reactors really stand.',
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
      'dose reduction factor', 'shielding factor', 'exclusion zone',
      'linear no-threshold', 'LNT', 'hormesis', 'threshold model', 'low-dose risk', 'radiation risk',
      'collective dose', 'person-sievert', 'man-sievert', 'risk coefficient', 'DDREF', 'radiation epidemiology',
      'statistical power', 'sample size', 'INWORKS', 'atomic bomb survivors', 'is a small dose dangerous',
      'neutron shielding', 'moderator', 'moderation', 'removal cross-section', 'thermal neutrons', 'thermalise',
      'elastic scattering', 'polyethylene', 'boron', 'capture gamma', 'why lead does not stop neutrons'],

    questHooks: [
      { id: 'nk_decay', label: 'Run three isotopes through their half-lives', icon: '⏳',
        check: function (d) { return !!(d && nkQuestList(d.isoTried).length >= 3); } },
      { id: 'nk_dating', label: 'Date a sample with carbon-14', icon: '🦴',
        check: function (d) { return !!(d && d.datedOnce); } },
      { id: 'nk_shield', label: 'Shield all four kinds of radiation', icon: '🛡️',
        check: function (d) { return !!(d && nkQuestList(d.radTried).length >= 4); } },
      { id: 'nk_criticality', label: 'Hold a chain reaction critical', icon: '⚛️',
        check: function (d) { return !!(d && d.heldCritical); } },
      { id: 'nk_operate', label: 'Complete a reactor scenario', icon: '🎛️',
        check: function (d) { return !!(d && d.reactorRun); } },
      { id: 'nk_chain', label: 'Follow four steps of the uranium chain', icon: '⛓️',
        check: function (d) { return !!(d && nkQuestList(d.chainSeen).length >= 4); } },
      { id: 'nk_enrich', label: 'Compare three enrichment levels', icon: '🔢',
        check: function (d) { return !!(d && nkQuestList(d.enrSeen).length >= 3); } },
      { id: 'nk_binding', label: 'Work out three reactions from the curve', icon: '⛰️',
        check: function (d) { return !!(d && nkQuestList(d.reactionsSeen).length >= 3); } },
      { id: 'nk_mydose', label: 'Estimate your own annual dose', icon: '🧮',
        check: function (d) { return !!(d && d.doseEstimated); } },
      { id: 'nk_dose', label: 'Compare five doses on the ladder', icon: '📏',
        check: function (d) { return !!(d && nkQuestList(d.dosesSeen).length >= 5); } },
      { id: 'nk_ponder', label: 'Work out three of the lab\'s own questions, then check', icon: '🤔',
        check: function (d) { return !!(d && nkQuestList(d.ponderSeen).length >= 3); } },
      { id: 'nk_lowdose', label: 'Run one exposure through three risk models', icon: '📉',
        check: function (d) { return !!(d && nkQuestList(d.riskModelsTried).length >= 3); } },
      { id: 'nk_collective', label: 'Find where the collective-dose sum stops meaning anything', icon: '➗',
        check: function (d) { return !!(d && nkQuestList(d.ldCasesTried).length >= 3); } },
      { id: 'nk_weighting', label: 'Weight the same joule three ways', icon: '⚖️',
        check: function (d) { return !!(d && d.doseWeighted && nkQuestList(d.wrTried).length >= 3); } },
      { id: 'nk_biohalf', label: 'Compare four nuclides inside a body', icon: '🫀',
        check: function (d) { return !!(d && nkQuestList(d.bioSeen).length >= 4); } },
      { id: 'nk_paths', label: 'Complete two question routes through the lab', icon: '🧭',
        check: function (d) {
          var paths = d && Array.isArray(d.pathsCompleted) ? d.pathsCompleted : [];
          return paths.filter(function (id, i) { return paths.indexOf(id) === i; }).length >= 2;
        } },
      { id: 'nk_shelter', label: 'Find where shelter beats evacuation, and where it stops', icon: '🏠',
        check: function (d) { return !!(d && d.shelterUsed && nkQuestList(d.shSeen).length >= 3); } },
      { id: 'nk_protect', label: 'Work out a stay time with all three levers', icon: '⏱️',
        check: function (d) { return !!(d && d.protectUsed && nkQuestList(d.ptTried).length >= 2); } },
      { id: 'nk_count', label: 'Take a count you could defend — better than ±5%', icon: '🔬',
        check: function (d) { return !!(d && d.countPrecise); } },
      { id: 'nk_invsq', label: 'Measure the same source at three distances', icon: '📐',
        check: function (d) { return !!(d && nkQuestList(d.cdDistTried).length >= 3); } },
      { id: 'nk_incidents', label: 'Read all three accidents in full', icon: '📋',
        check: function (d) { return !!(d && nkQuestList(d.incidentsRead).length >= 3); } },
      { id: 'nk_reactors', label: 'Compare three reactor designs', icon: '🏭',
        check: function (d) { return !!(d && nkQuestList(d.reactorsSeen).length >= 3); } },
      { id: 'nk_waste', label: 'Work through the waste question', icon: '🗄️',
        check: function (d) { return !!(d && nkQuestList(d.wasteSeen).length >= 3); } },
      { id: 'nk_compare', label: 'Predict the death ranking, then check it against the data', icon: '⚖️',
        check: function (d) { return !!(d && d.cmpRevealed && nkQuestList(d.cmpSeen).length >= 4); } },
      { id: 'nk_evidence', label: 'Master all five evidence verdicts', icon: '🔎',
        check: function (d) { return !!(d && nkQuestList(d.evidenceMastered).length >= EVIDENCE_CLAIMS.length); } }
    ],

    render: (function () {
      function Reference(props) { return renderReference(props.ctx); }
      function renderReference(ctx) {
      try { __alloCtx_nuclearlab = ctx; } catch (e) {}
      var React = ctx.React;
      var h = React.createElement;
      var t = (ctx.t && function (k, fb) { var v; try { v = (typeof ctx.t === 'function') ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null || v === k || v === '') ? (fb != null ? fb : k) : v; }) || function (k, fb) { return fb != null ? fb : k; };
      var announceToSR = ctx.announceToSR;
      var setToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var beep = ctx.beep;
      var canSpeak = typeof ctx.callTTS === 'function';
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;
      var isContrast = !!(ctx.isContrast === true || ctx.theme === 'contrast');
      var isDark = isContrast || (ctx.theme === 'light' ? false : (ctx.theme === 'dark' ? true : (typeof ctx.isDark === 'boolean' ? ctx.isDark : true)));

      // All hooks first, unconditionally — a hook after a render-time branch is
      // the crash class that has bitten other tools in this lab on navigation.
      var xpAwardedRef = React.useRef({});
      var decayRef = React.useRef(null);
      var doseRef = React.useRef(null);
      var countRef = React.useRef(null);
      var chainRef = React.useRef(null);
      var protectRef = React.useRef(null);
      var shelterRef = React.useRef(null);
      var bioRef = React.useRef(null);
      var countTakeButtonRef = React.useRef(null);
      var nkRootRef = React.useRef(null);
      var nkSearchStatusRef = React.useRef(null);
      // Route buttons swap whole sections in one React commit. Remember the
      // requested destination so focus moves only after that section exists.
      var nkPendingTargetRef = React.useRef(null);
      // Scroll-spy location is intentionally kept out of React state so reading
      // a long page does not rerender every section. Keeping the last location
      // in a ref still lets unrelated renders preserve the collapsed summary.
      var nkCurrentLocationRef = React.useRef(null);
      // Advancing the evidence challenge removes its Next button. Remember
      // that transition so focus can move into the newly rendered claim rather
      // than falling back to the document body.
      var nkEvidencePendingFocusRef = React.useRef(false);
      var nkShieldSpeechReadyRef = React.useRef(false);
      var nkDoseSpeechReadyRef = React.useRef(false);
      var stNkSystemReducedMotion = React.useState(function () {
        return !!(typeof window !== 'undefined' && window.matchMedia
          && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      });
      var nkSystemReducedMotion = stNkSystemReducedMotion[0];
      var setNkSystemReducedMotion = stNkSystemReducedMotion[1];
      var stNkAutoOpen = React.useState(function () {
        if (typeof window === 'undefined') return true;
        return !((window.innerWidth > 0 && window.innerWidth < 768)
          || (window.innerWidth >= 900 && window.innerHeight > 0 && window.innerHeight <= 768));
      });
      var nkAutoOpen = stNkAutoOpen[0];
      var setNkAutoOpen = stNkAutoOpen[1];
      var stGuess = React.useState('');
      var ageGuess = stGuess[0], setAgeGuess = stGuess[1];
      var stShown = React.useState(false);
      var ageShown = stShown[0], setAgeShown = stShown[1];
      // The guess AS IT WAS when Reveal was pressed. Reading the live input
      // instead would let the margin re-score itself while the reader edits the
      // box, which turns a result into a hint.
      var stShownGuess = React.useState(null);
      var shownGuess = stShownGuess[0], setShownGuess = stShownGuess[1];
      var stNkShieldSpeech = React.useState('');
      var nkShieldSpeech = stNkShieldSpeech[0], setNkShieldSpeech = stNkShieldSpeech[1];
      var stNkDoseSpeech = React.useState('');
      var nkDoseSpeech = stNkDoseSpeech[0], setNkDoseSpeech = stNkDoseSpeech[1];

      var rawRefD = ctx.toolData && ctx.toolData._nuclearLab;
      var d = (rawRefD && typeof rawRefD === 'object' && !Array.isArray(rawRefD)) ? rawRefD : {};
      // Reading preferences are needed by both the DOM and the 3D viewer.
      // Resolve them before effects are declared so the viewer dependency list
      // receives the actual value rather than a hoisted, still-undefined var.
      var nkLargeText = !!d.nkLargeText;
      var nkShowChartData = !!d.nkShowChartData;
      // The learner may request LESS motion, never more than the operating
      // system allows. Keep the system query live so changing it while the lab
      // is open immediately resynchronises the canvas and 3D core.
      var nkHostReducedMotion = !!(ctx && ctx.reduceMotion);
      var nkUserReducedMotion = d.nkReduceMotion === true;
      var nkReduceMotion = nkSystemReducedMotion || nkHostReducedMotion || nkUserReducedMotion;
      React.useEffect(function () {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        var query = window.matchMedia('(prefers-reduced-motion: reduce)');
        var updateSystemMotion = function (event) {
          setNkSystemReducedMotion(!!event.matches);
        };
        if (query.addEventListener) query.addEventListener('change', updateSystemMotion);
        else if (query.addListener) query.addListener(updateSystemMotion);
        return function () {
          if (query.removeEventListener) query.removeEventListener('change', updateSystemMotion);
          else if (query.removeListener) query.removeListener(updateSystemMotion);
        };
      }, []);
      function upd(patch) {
        setToolData(function (prev) {
          var curRaw = prev && prev._nuclearLab;
          var base = (curRaw && typeof curRaw === 'object' && !Array.isArray(curRaw)) ? curRaw : {};
          var cur = Object.assign({}, base, patch);
          if (patch && patch._xpCredited && typeof patch._xpCredited === 'object' && !Array.isArray(patch._xpCredited)) {
            cur._xpCredited = Object.assign(nkSafeXpLedger(base._xpCredited), nkSafeXpLedger(patch._xpCredited));
          }
          var next = Object.assign({}, prev);
          next._nuclearLab = cur;
          return next;
        });
      }
      function nkCelebrate() {
        // Host celebrations may render outside this component, so CSS alone
        // cannot honour the learner's or operating system's motion preference.
        if (!nkReduceMotion && typeof celebrate === 'function') celebrate();
      }
      function pushOnce(key, value) {
        setToolData(function (prev) {
          var curRaw = prev && prev._nuclearLab;
          var base = (curRaw && typeof curRaw === 'object' && !Array.isArray(curRaw)) ? curRaw : {};
          var list = Array.isArray(base[key]) ? base[key] : [];
          if (list.indexOf(value) !== -1) return prev;
          var nextLab = Object.assign({}, base);
          nextLab[key] = list.concat([value]);
          return Object.assign({}, prev, { _nuclearLab: nextLab });
        });
      }

      // ── 21. evidence challenge ──
      // Persist choices per claim so learners can move around without losing
      // their reasoning. Mastered means the best-supported verdict was reached
      // after feedback; it is progress, not a timed score or a one-shot grade.
      var evidenceSavedIndex = nkClamp(
        typeof d.evidenceIndex === 'number' ? Math.floor(d.evidenceIndex) : 0,
        0, EVIDENCE_CLAIMS.length - 1);
      var evidenceRequestedId = typeof d.evidenceClaimId === 'string'
        ? d.evidenceClaimId
        : EVIDENCE_CLAIMS[evidenceSavedIndex].id;
      var evidenceChoices = d.evidenceChoices && typeof d.evidenceChoices === 'object' ? d.evidenceChoices : {};
      var evidenceCheckedMap = d.evidenceChecked && typeof d.evidenceChecked === 'object' ? d.evidenceChecked : {};
      var evidenceRevealedMap = d.evidenceRevealed
        && typeof d.evidenceRevealed === 'object'
        && !Array.isArray(d.evidenceRevealed)
          ? d.evidenceRevealed
          : {};
      var evidenceMastered = Array.isArray(d.evidenceMastered)
        ? d.evidenceMastered.filter(function (id, i, all) {
            return all.indexOf(id) === i && EVIDENCE_CLAIMS.some(function (claim) { return claim.id === id; });
          })
        : [];
      // Global mastery remains cumulative across routes and still powers the
      // five-claim quest and one-time XP award below.

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
      // Fast-neutron removal, from the published cross-section rather than a
      // coefficient chosen to make hydrogen look good. This number now says
      // lead beats water per centimetre, which is true and is the start of the
      // argument rather than the end of it — the collision count below is the
      // other half.
      var neutronThrough = Math.exp(-shield.sigR * thick) * 100;
      var neutronCollisions = nkCollisionsToThermal(shield.modA);
      var neutronHydrogenous = shield.modA <= 1;
      var nkShieldThrough = radId === 'alpha' ? (alphaStopped ? 0 : 100)
        : (radId === 'beta' ? (betaStopped ? 0 : 100)
          : (radId === 'neutron' ? neutronThrough : gammaThrough));
      var nkShieldSpeechText = nkFmt(nkShieldThrough, nkShieldThrough < 1 ? 3 : 1)
        + '% of the ' + rad.name.toLowerCase() + ' gets through '
        + nkFmt(thick, 1) + ' cm of ' + shield.name.toLowerCase();
      React.useEffect(function () {
        if (!nkShieldSpeechReadyRef.current) {
          nkShieldSpeechReadyRef.current = true;
          return;
        }
        var timer = setTimeout(function () { setNkShieldSpeech(nkShieldSpeechText); }, 450);
        return function () { clearTimeout(timer); };
      }, [radId, shieldId, thick]);

      // ── 4. chain reaction ──
      // Start SHUT DOWN, not critical. This defaulted to 50% inserted, which is
      // exactly k = 1.000 — so the section opened on a green "✅ Critical", and
      // the effect below handed out the "Hold a chain reaction critical" quest
      // on mount to anyone who scrolled past it. Both halves of that were
      // wrong: the one thing this section is about is that holding k at exactly
      // 1 is something you DO, and it was being given away before the reader
      // touched the slider. 65% in is a real shutdown state to start up from.
      var rods = typeof d.rods === 'number' ? d.rods : 65;             // percent inserted
      // k rises as rods withdraw. Tuned so critical (k=1) sits at 50%.
      var kEff = 1.30 - 0.006 * rods;
      var kState = kEff < 0.995 ? 'subcritical' : (kEff > 1.005 ? 'supercritical' : 'critical');
      var gens = [];
      var pop = 100;
      for (var g = 0; g < 12; g++) { gens.push(pop); pop = pop * kEff; }

      // Credit requires BOTH a critical core and a rod movement that got it
      // there. The second condition is not redundant with the new default — it
      // is what stops a future change to that default from silently restoring
      // the free pass, which is how this got here in the first place.
      React.useEffect(function () {
        if (kState === 'critical' && d.rodsMoved && !d.heldCritical) upd({ heldCritical: true });
      }, [kState, d.rodsMoved, d.heldCritical]);

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
        var countSec = cdTime;
        var run = { g: nkPoisson((cdTrueNet + GM_BACKGROUND) * countSec), b: nkPoisson(GM_BACKGROUND * countSec), t: countSec, d: cdDist, s: cdSrcId };
        var net = (run.g - run.b) / countSec;
        var sig = Math.sqrt(run.g + run.b) / countSec;
        var ok = (run.g - run.b) > 2.33 * Math.sqrt(2 * Math.max(run.b, 1));
        var patch = { cdRuns: cdRuns.concat([run]).slice(-8), countTaken: true };
        if (ok && net > 0 && sig / net <= 0.05) {
          patch.countPrecise = true;
          if (!nkSafeXpLedger(d._xpCredited).nuclear_count && !xpAwardedRef.current.nuclear_count && !d.countPrecise) {
            xpAwardedRef.current.nuclear_count = true;
            patch._xpCredited = Object.assign(nkSafeXpLedger(d._xpCredited), { nuclear_count: true });
            nkCelebrate();
            if (typeof awardXP === 'function') awardXP('nuclear_count', 10, 'Measured a source to better than 5%');
          }
        }
        if (cdSrcId !== 'none') {
          var seen = Array.isArray(d.cdDistTried) ? d.cdDistTried : [];
          var key = cdSrcId + '@' + Math.round(cdDist);
          if (seen.indexOf(key) === -1) patch.cdDistTried = seen.concat([key]);
        }
        upd(patch);
        if (typeof beep === 'function') beep();
        if (typeof announceToSR === 'function') {
          announceToSR('Counted for ' + countSec + ' seconds. ' + run.g + ' counts with the source, ' +
            run.b + ' counts of background. Net ' + (net).toFixed(3) + ' plus or minus ' + sig.toFixed(3) + ' counts per second.');
        }
      }
      function cdReset(patch) {
        upd(Object.assign({ cdRuns: [] }, patch));
        if (typeof beep === 'function') beep();
      }

      // ── compared with the alternatives ──
      // Section 19 carries the tool's most contested claim and, until now, the
      // least to do: two bar charts and a paragraph. Reading a chart that agrees
      // with you is not evidence you have understood it, so the ranking is a
      // prediction first. Committing to an order before the numbers appear is
      // what makes the coal/nuclear gap land as a surprise rather than a slogan
      // — and the per-source notes below were written long ago and never shown.
      var cmpGuessRaw = d.cmpGuess && typeof d.cmpGuess === 'object' ? d.cmpGuess : null;
      var cmpRevealed = !!d.cmpRevealed;
      var cmpSelId = typeof d.cmpSel === 'string' ? d.cmpSel : '';
      // The two sources people most reliably mis-rank against each other. Coal
      // versus nuclear is the headline; hydro is the one that catches people who
      // have already accepted the headline, because a single 1975 dam failure
      // puts "renewable" hydro above nuclear.
      var CMP_PAIRS = [
        { id: 'coal_nuclear', a: 'Coal', b: 'Nuclear',
          ask: 'Per unit of electricity, which has killed more people?' },
        { id: 'hydro_nuclear', a: 'Hydropower', b: 'Nuclear',
          ask: 'And which of these two?' },
        { id: 'gas_solar', a: 'Natural gas', b: 'Solar',
          ask: 'One more — which of these?' }
      ];
      function cmpValue(name) {
        var row = DEATHS_TWH.filter(function (x) { return x.name === name; })[0];
        return row ? row.v : 0;
      }
      function cmpGuessFor(id) {
        return cmpGuessRaw && typeof cmpGuessRaw[id] === 'string' ? cmpGuessRaw[id] : '';
      }
      // A guess is right when the named source really is the deadlier of the two.
      function cmpCorrect(pair) {
        return cmpValue(pair.a) > cmpValue(pair.b) ? pair.a : pair.b;
      }
      var cmpAnswered = CMP_PAIRS.filter(function (pair) { return cmpGuessFor(pair.id); });
      var cmpRight = cmpAnswered.filter(function (pair) {
        return cmpGuessFor(pair.id) === cmpCorrect(pair);
      });

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
      var ptRate = ptRateAt(ptDist);                                    // initial mSv/h as configured
      var ptFirstHourDose = nkIntegratedDose(ptRate, 1, ptSrc.halfLifeH);
      var ptMaxDose = ptRate > 0 ? ptRate * ptSrc.halfLifeH / Math.LN2 : 0;
      var ptStayH = nkTimeToDose(ptRate, ptLimit.mSv, ptSrc.halfLifeH);
      var ptHalfDoseH = isFinite(ptStayH)
        ? nkTimeToDose(ptRate, ptLimit.mSv / 2, ptSrc.halfLifeH)
        : ptSrc.halfLifeH;
      // Distance and shielding halve the initial rate in this idealised model;
      // the time card instead solves the integrated, decay-aware dose exactly.
      var ptHalfDist = ptDist * Math.SQRT2;
      var ptHvl = ptShield.mu > 0 ? Math.LN2 / ptShield.mu : Infinity;  // cm
      function ptTimeLabel(hours) {
        if (hours > 8760) return nkFmt(hours / 8760, 1) + ' years';
        if (hours >= 24) return nkFmt(hours / 24, hours < 240 ? 1 : 0) + ' days';
        if (hours >= 1) return nkFmt(hours, hours < 10 ? 1 : 0) + ' hours';
        if (hours >= 1 / 60) return nkFmt(hours * 60, 1) + ' minutes';
        return nkFmt(hours * 3600, 0) + ' seconds';
      }

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

      function nkIsContrast() {
        try {
          return !!(ctx.isContrast === true || ctx.theme === 'contrast' || (typeof document !== 'undefined' && (
            (document.documentElement && document.documentElement.classList && document.documentElement.classList.contains('theme-contrast')) ||
            (document.body && document.body.classList && document.body.classList.contains('theme-contrast'))
          )));
        } catch (e) { return false; }
      }

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
        var hc = nkIsContrast();
        var padL = 40 * dpr, padR = 16 * dpr, padT = 16 * dpr, padB = 34 * dpr;
        var pw = W - padL - padR, ph = H - padT - padB;
        var bg = hc ? '#000000' : (isDark ? '#0b1120' : '#f8fafc');
        var axisInk = hc ? '#ffffff' : (isDark ? 'rgba(148,163,184,0.92)' : 'rgba(51,65,85,0.92)');
        var A_COL = hc ? '#ffff00' : ink('#f87171');
        var B_COL = hc ? '#00ff00' : ink('#60a5fa');
        var GAS = hc ? '#ffffff' : ink('#fbbf24');
        c.clearRect(0, 0, W, H);
        c.fillStyle = bg; c.fillRect(0, 0, W, H);

        var nMin = 122, nMax = 148, zMin = 81, zMax = 93;
        function px(n) { return padL + (n - nMin) / (nMax - nMin) * pw; }
        function py(z) { return padT + (1 - (z - zMin) / (zMax - zMin)) * ph; }

        c.strokeStyle = hc ? 'rgba(255,255,0,0.28)' : (isDark ? 'rgba(148,163,184,0.13)' : 'rgba(100,116,139,0.13)');
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

        // Steps, drawn as arrows from parent to daughter with subtle luminous underlay.
        for (var i = 0; i < NK_CHAIN_XY.length - 1; i++) {
          var from = NK_CHAIN_XY[i], to = NK_CHAIN_XY[i + 1];
          var col = from.kind === 'alpha' ? A_COL : B_COL;
          var x0 = px(from.n), y0 = py(from.z), x1 = px(to.n), y1 = py(to.z);
          var ang = Math.atan2(y1 - y0, x1 - x0);
          var back = 6.5 * dpr;                       // stop short of the node
          var sx0 = x0 + Math.cos(ang) * back, sy0 = y0 + Math.sin(ang) * back;
          var ex = x1 - Math.cos(ang) * back, ey = y1 - Math.sin(ang) * back;
          c.lineCap = 'round';
          if (!hc) {
            c.strokeStyle = nkRgba(col, isDark ? 0.24 : 0.16);
            c.lineWidth = 4.6 * dpr;
            c.beginPath(); c.moveTo(sx0, sy0); c.lineTo(ex, ey); c.stroke();
          }
          c.strokeStyle = hc ? col : nkRgba(col, 0.88);
          c.lineWidth = 1.8 * dpr;
          c.beginPath(); c.moveTo(sx0, sy0); c.lineTo(ex, ey); c.stroke();
          var head = 4.5 * dpr;
          c.fillStyle = hc ? col : nkRgba(col, 0.92);
          c.beginPath();
          c.moveTo(ex, ey);
          c.lineTo(ex - Math.cos(ang - 0.42) * head, ey - Math.sin(ang - 0.42) * head);
          c.lineTo(ex - Math.cos(ang + 0.42) * head, ey - Math.sin(ang + 0.42) * head);
          c.closePath(); c.fill();
        }

        // Nodes with glowing radioactive halos for active selection & radon gas node.
        for (var ndi = 0; ndi < NK_CHAIN_XY.length; ndi++) {
          var nd = NK_CHAIN_XY[ndi];
          var x = px(nd.n), y = py(nd.z);
          var sel = pick === nd.i;
          var col = nd.kind === 'stable' ? (hc ? '#ffffff' : (isDark ? '#cbd5e1' : '#475569'))
            : (nd.gas ? GAS : (nd.kind === 'alpha' ? A_COL : B_COL));
          var r = (nd.gas || nd.kind === 'stable') ? 6 * dpr : 4.6 * dpr;
          if (!hc && (sel || nd.gas) && typeof c.createRadialGradient === 'function') {
            var haloR = (sel ? 16 : 12) * dpr;
            var ng = c.createRadialGradient(x, y, r * 0.4, x, y, haloR);
            ng.addColorStop(0, nkRgba(col, sel ? 0.42 : 0.28));
            ng.addColorStop(1, nkRgba(col, 0));
            c.fillStyle = ng;
            c.beginPath(); c.arc(x, y, haloR, 0, 6.2832); c.fill();
          }
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
        }

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
        var hc = nkIsContrast();
        var chartBg = hc ? '#000000' : (isDark ? '#0b1120' : '#f8fafc');
        var axisInk = hc ? '#ffffff' : (isDark ? 'rgba(148,163,184,0.92)' : 'rgba(51,65,85,0.92)');
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
        if (!hc) {
          (cfg.bands || []).forEach(function (b) {
            var x0 = px(Math.max(b.from, cfg.xMin)), x1 = px(Math.min(b.to, cfg.xMax));
            c.fillStyle = b.colour;
            c.fillRect(x0, padT, Math.max(0, x1 - x0), ph);
          });
        }

        c.strokeStyle = hc ? 'rgba(255,255,0,0.3)' : (isDark ? 'rgba(148,163,184,0.18)' : 'rgba(100,116,139,0.18)');
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
        var canQuad = typeof c.quadraticCurveTo === 'function';
        function traceSeriesPath(pts) {
          c.beginPath();
          var nPts = pts.length;
          c.moveTo(px(pts[0][0]), py(pts[0][1]));
          if (canQuad && nPts >= 3) {
            for (var pi = 1; pi < nPts - 1; pi++) {
              var x1 = px(pts[pi][0]), y1 = py(pts[pi][1]);
              var mx = (x1 + px(pts[pi + 1][0])) * 0.5;
              var my = (y1 + py(pts[pi + 1][1])) * 0.5;
              c.quadraticCurveTo(x1, y1, mx, my);
            }
            c.lineTo(px(pts[nPts - 1][0]), py(pts[nPts - 1][1]));
          } else {
            for (var pj = 1; pj < nPts; pj++) c.lineTo(px(pts[pj][0]), py(pts[pj][1]));
          }
        }
        (cfg.series || []).forEach(function (s, sIdx) {
          if (!s.points || !s.points.length) return;
          var sCol = hc ? (sIdx % 2 === 0 ? '#ffff00' : '#00ff00') : s.colour;
          if (s.fill && !hc && typeof c.createLinearGradient === 'function') {
            var g = c.createLinearGradient(0, padT, 0, padT + ph);
            g.addColorStop(0, nkRgba(sCol, 0.34));
            g.addColorStop(1, nkRgba(sCol, 0.02));
            c.fillStyle = g;
            c.beginPath();
            c.moveTo(px(s.points[0][0]), py(yLo));
            for (var fi = 0; fi < s.points.length; fi++) c.lineTo(px(s.points[fi][0]), py(s.points[fi][1]));
            c.lineTo(px(s.points[s.points.length - 1][0]), py(yLo));
            c.closePath(); c.fill();
          }
          // Soft luminous underlay on primary solid curves (bypassed in High-Contrast)
          if (!s.dash && !hc) {
            c.strokeStyle = nkRgba(sCol, isDark ? 0.26 : 0.17);
            c.lineWidth = ((s.width || 2) + 3.8) * dpr;
            c.lineJoin = 'round'; c.lineCap = 'round';
            traceSeriesPath(s.points);
            c.stroke();
          }
          c.strokeStyle = sCol; c.lineWidth = (s.width || 2) * dpr;
          c.lineJoin = 'round'; c.lineCap = 'round';
          if (s.dash) c.setLineDash([6 * dpr, 4 * dpr]);
          traceSeriesPath(s.points);
          c.stroke();
          if (!s.dash && !hc && isDark) {
            c.strokeStyle = 'rgba(255,255,255,0.42)';
            c.lineWidth = Math.max(0.8, 0.75 * dpr);
            traceSeriesPath(s.points);
            c.stroke();
          }
          c.setLineDash([]);
          // Real measured nuclides, drawn as points, so the binding curve reads
          // as data rather than as a formula someone plotted.
          if (s.dots) {
            for (var di = 0; di < s.points.length; di++) {
              var dp = s.points[di];
              c.beginPath(); c.arc(px(dp[0]), py(dp[1]), 2.6 * dpr, 0, 6.2832);
              c.fillStyle = sCol; c.fill();
              c.lineWidth = 1.2 * dpr; c.strokeStyle = chartBg; c.stroke();
            }
          }
        });
        // Half-life step markers + glowing intersection beacons make each halving shine
        (cfg.steps || []).forEach(function (st) {
          var stx = px(st[0]), sty = py(st[1]);
          c.strokeStyle = hc ? '#00ff00' : 'rgba(167,139,250,0.52)';
          c.lineWidth = Math.max(1, dpr);
          c.setLineDash([3 * dpr, 3 * dpr]);
          c.beginPath();
          c.moveTo(stx, py(yLo)); c.lineTo(stx, sty);
          c.lineTo(px(cfg.xMin), sty);
          c.stroke();
          c.setLineDash([]);
          if (!hc) {
            c.beginPath(); c.arc(stx, sty, 5 * dpr, 0, 6.2832);
            c.fillStyle = 'rgba(167,139,250,0.22)'; c.fill();
          }
          c.beginPath(); c.arc(stx, sty, 2.3 * dpr, 0, 6.2832);
          c.fillStyle = hc ? '#00ff00' : '#c4b5fd'; c.fill();
        });
        if (cfg.marker) {
          // Glowing half-life decay curve beacon with radial aura + crisp ring + core
          var mx = px(cfg.marker.x), my = py(cfg.marker.y);
          var mCol = hc ? '#ffff00' : cfg.marker.colour;
          if (!hc && typeof c.createRadialGradient === 'function') {
            var mg = c.createRadialGradient(mx, my, 2 * dpr, mx, my, 15 * dpr);
            mg.addColorStop(0, nkRgba(mCol, isDark ? 0.5 : 0.36));
            mg.addColorStop(0.55, nkRgba(mCol, isDark ? 0.18 : 0.12));
            mg.addColorStop(1, nkRgba(mCol, 0));
            c.fillStyle = mg;
            c.beginPath(); c.arc(mx, my, 15 * dpr, 0, 6.2832); c.fill();
          } else if (!hc) {
            c.beginPath(); c.arc(mx, my, 9.5 * dpr, 0, 6.2832);
            c.fillStyle = nkRgba(mCol, isDark ? 0.24 : 0.18); c.fill();
          }
          c.beginPath(); c.arc(mx, my, 6 * dpr, 0, 6.2832);
          c.fillStyle = chartBg; c.fill();
          c.beginPath(); c.arc(mx, my, 4.2 * dpr, 0, 6.2832);
          c.fillStyle = mCol; c.fill();
          if (!hc) {
            c.beginPath(); c.arc(mx - 1.1 * dpr, my - 1.1 * dpr, 1.4 * dpr, 0, 6.2832);
            c.fillStyle = 'rgba(255,255,255,0.88)'; c.fill();
          }
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
      }, [halves, isoId, isDark, isContrast, d.nkPath]);

      React.useEffect(function () {
        nkChainMap(chainRef.current, d.chainPick);
      }, [d.chainPick, isDark, isContrast, d.nkPath]);

      // Dose against how long it takes to get clear. The shelter line is flat
      // — the plume does not care how fast you drive — and the evacuation line
      // climbs until you are out. Where they cross is the whole decision, so
      // the crossing is drawn rather than described.
      React.useEffect(function () {
        var maxH = 12;
        var evac = [], shel = [];
        for (var hr = 0; hr <= maxH + 0.01; hr += 0.25) {
          evac.push([hr, shEvacDoseAt(hr)]);
          shel.push([hr, shShelterDose]);
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
      }, [shRate, shPlume, shEvac, shPlaceId, isDark, isContrast, d.nkPath]);

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
      }, [ptSrcId, ptDist, ptShieldId, ptThick, isDark, isContrast, d.nkPath]);

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
      }, [cdSrcId, cdDist, cdRuns.length, cdChartMax, cdNet, isDark, isContrast, d.nkPath]);

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
      }, [bioId, isDark, isContrast, d.nkPath]);


      // ── Reactor simulator ────────────────────────────────────────────
      // The sim state lives in a ref and the panel is drawn on canvas, so a
      // 10 Hz physics tick does not re-render the whole tool 10 times a second.
      // React state is only touched when something the CONTROLS depend on
      // changes: the scenario verdict and the quantised rod position for the 3D.
      var rxRef = React.useRef(null);
      var rxCanvasRef = React.useRef(null);
      var rxTelemetryRef = React.useRef(null);
      var rxObjectiveRef = React.useRef(null);
      var rxStartButtonRef = React.useRef(null);
      var rxRetryFocusRef = React.useRef(false);
      var rxAnim = React.useRef(0);
      var rxWakeRef = React.useRef(function () {});
      var rxInitialScenario = d.rxScenario || 'steady';
      var stRx = React.useState({
        running: false, verdict: null, rodStep: 50, hotStep: 0,
        pumps: rxInitialScenario !== 'blackout', scrammed: false
      });
      var rxUi = stRx[0], setRxUi = stRx[1];
      var stRxSnapshot = React.useState('');
      var rxStatusSnapshot = stRxSnapshot[0], setRxStatusSnapshot = stRxSnapshot[1];
      var rxUiRef = React.useRef(rxUi);
      rxUiRef.current = rxUi;
      React.useEffect(function () {
        if (!rxRetryFocusRef.current || rxUi.verdict) return;
        rxRetryFocusRef.current = false;
        var target = rxStartButtonRef.current;
        if (!target) return;
        try { target.focus({ preventScroll: true }); }
        catch (e) { try { target.focus(); } catch (e2) {} }
      }, [rxUi.verdict]);

      function rxPatchUi(patch) {
        setRxUi(function (prev) {
          var next = Object.assign({}, prev, patch);
          rxUiRef.current = next;
          return next;
        });
      }

      var rxMode = d.rxMode || 'modern';
      var rxScenario = rxInitialScenario;
      var rxModeObj = RX_MODES.filter(function (m) { return m.id === rxMode; })[0] || RX_MODES[0];
      var rxScenObj = RX_SCENARIOS.filter(function (s) { return s.id === rxScenario; })[0] || RX_SCENARIOS[0];

      function rxFresh(scenarioId) {
        return {
          rods: 50, pumps: scenarioId !== 'blackout', scrammed: false, power: 100, t: RX_T_REF + 30,
          xe: 1, iod: 1, elapsed: 0, sinceScram: 0, holdOk: 0, phase: 0, peakT: RX_T_REF + 30,
          verdict: null, lastSync: 0
        };
      }
      if (!rxRef.current) rxRef.current = rxFresh(rxScenario);

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

      function rxMetricTone(metric, s, r, running, scen) {
        var rhoPcm = r.total * 1e5;
        var scenarioId = scen && scen.id ? scen.id : (scen || 'steady');
        if (metric === 'power') {
          if (s.power > 150) return { tone: 'danger', label: 'Power excursion' };
          if (s.power > 110) return { tone: 'caution', label: 'High power' };
          if (scenarioId === 'xenon' && s.phase <= 1) {
            if (s.power <= 20) return { tone: 'success', label: 'Low-power goal' };
            return { tone: running ? 'info' : 'neutral', label: running ? 'Lowering power' : 'Ready' };
          }
          if (scenarioId === 'xenon' && s.phase >= 2) {
            if (s.power > 80) return { tone: 'success', label: 'Recovery goal' };
            return { tone: running ? 'info' : 'neutral', label: running ? 'Recovering power' : 'Ready' };
          }
          if (scenarioId === 'blackout') {
            if (s.scrammed) return { tone: 'info', label: 'Decay heat' };
            return { tone: running ? 'caution' : 'neutral', label: running ? 'SCRAM needed' : 'Ready' };
          }
          if (running && s.power >= 95 && s.power <= 105) return { tone: 'success', label: 'Target band' };
          if (running && s.power < 95) return { tone: 'info', label: 'Below band' };
          return { tone: 'neutral', label: running ? 'Adjusting' : 'Ready' };
        }
        if (metric === 'temperature') {
          if (s.t >= RX_T_CLAD) return { tone: 'danger', label: 'Cladding risk' };
          if (s.t > 400) return { tone: 'caution', label: 'Running hot' };
          return { tone: running ? 'success' : 'neutral', label: 'Below 400 °C' };
        }
        if (metric === 'reactivity') {
          if (rhoPcm >= 650 && !s.scrammed) return { tone: 'danger', label: 'Prompt critical' };
          if (s.scrammed) return { tone: 'info', label: 'Shutdown' };
          if (Math.abs(rhoPcm) <= 20) return { tone: 'success', label: 'Balanced' };
          return { tone: 'caution', label: rhoPcm > 0 ? 'Power rising' : 'Power falling' };
        }
        if (metric === 'xenon') {
          if (s.xe > 1.6) return { tone: 'caution', label: 'Elevated' };
          if (s.xe < 0.8) return { tone: 'info', label: 'Low' };
          return { tone: running ? 'success' : 'neutral', label: 'Normal' };
        }
        if (s.verdict) return s.verdict.ok
          ? { tone: 'success', label: 'Complete' }
          : { tone: 'danger', label: 'Ended' };
        if (s.scrammed) return { tone: 'info', label: 'Scrammed' };
        if (running && (s.t >= RX_T_CLAD || s.power > 150 || rhoPcm >= 650)) return { tone: 'danger', label: 'Hazard' };
        if (running && (!s.pumps || s.t > 400 || s.power > 110)) return { tone: 'caution', label: 'Needs action' };
        if (running) return { tone: 'info', label: 'Running' };
        return { tone: 'neutral', label: 'Paused' };
      }

      function rxObjectiveTone(s, progress, running) {
        if (s.verdict) return s.verdict.ok
          ? { tone: 'success', label: 'Complete' }
          : { tone: 'danger', label: 'Run ended' };
        if (!running) return { tone: 'neutral', label: 'Ready to begin' };
        if (s.t >= RX_T_CLAD) return { tone: 'danger', label: 'Act now' };
        if (!s.pumps || s.power > 110) return { tone: 'caution', label: 'Watch conditions' };
        if (s.scrammed) return { tone: 'info', label: 'Decay heat' };
        if (progress.value >= progress.max) return { tone: 'success', label: 'Target reached' };
        return { tone: 'info', label: 'In progress' };
      }

      function rxWriteTelemetry(s, r, running, scen) {
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
        [
          ['rx-live-power', 'power'],
          ['rx-live-temperature', 'temperature'],
          ['rx-live-reactivity', 'reactivity'],
          ['rx-live-xenon', 'xenon'],
          ['rx-live-state', 'state']
        ].forEach(function (item) {
          var card = root.querySelector('[data-rx-metric="' + item[0] + '"]');
          var tone = rxMetricTone(item[1], s, r, running, scen);
          if (card) card.dataset.tone = tone.tone;
          put(item[0] + '-tone', tone.label);
        });
      }

      function rxWriteObjective(s, scen, running) {
        var root = rxObjectiveRef.current;
        if (!root) return;
        var progress = rxScenarioProgress(s, scen);
        function put(id, value) {
          var node = root.querySelector('#' + id);
          if (node && node.textContent !== value) node.textContent = value;
        }
        put('rx-objective-step', progress.label);
        put('rx-objective-detail', progress.detail);
        var tone = rxObjectiveTone(s, progress, running);
        root.dataset.tone = tone.tone;
        put('rx-objective-tone', tone.label);
        var meter = root.querySelector('#rx-objective-meter');
        if (meter) {
          meter.max = progress.max;
          meter.value = progress.value;
          meter.setAttribute('aria-valuetext', progress.detail);
        }
        var previousStage = root.dataset.stage || '';
        if (previousStage && previousStage !== progress.stage && !s.verdict &&
            !(s.scrammed && previousStage === 'blackout-scram') &&
            typeof announceToSR === 'function') {
          announceToSR(progress.label + '. ' + progress.detail);
        }
        root.dataset.stage = progress.stage;
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
          if (rho >= RX_BETA) {
            period = Math.max(0.05, RX_GEN / Math.max(1e-6, rho - RX_BETA));
          } else if (Math.abs(rho) < 1e-7) {
            period = 1e9;
          } else {
            period = (RX_BETA - rho) / (RX_LAMBDA_D * rho);
            if (period > 0 && period < 0.5) period = 0.5;
            if (period < 0 && period > -2) period = -2;
          }
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
        var hCool = s.pumps ? 4.5 : 0.002;
        var tEq = RX_T_REF + (s.power * 0.9) / hCool;
        s.t = tEq + (s.t - tEq) * Math.exp(-hCool * RX_TIME_COMPRESSION * dt);
        s.t = Math.max(20, Math.min(4000, s.t));
        if (s.t > s.peakT) s.peakT = s.t;

        // xenon-135: normalized so (iod=1, xe=1) is the exact steady equilibrium
        // at 100% power (phi=1); builds from iodine when power drops, burns out at high flux
        var phi = s.power / 100;
        var rxXeBurn = 5 * RX_LAM_X;
        var rxXeTimeScale = 600;
        s.iod += RX_LAM_I * (phi - s.iod) * dt * rxXeTimeScale;
        s.iod = Math.max(0, Math.min(10, s.iod));
        s.xe += ((RX_LAM_X + rxXeBurn) * (0.95 * s.iod + 0.05 * phi) - (RX_LAM_X + rxXeBurn * phi) * s.xe) * dt * rxXeTimeScale;
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
            else if (s.phase === 1) {
              // The goal says HOLD at low power, not merely touch 20% once.
              // Any excursion above the target restarts the continuous timer.
              if (s.power <= 20) {
                s.holdOk += dt;
                if (s.holdOk >= 90) s.phase = 2;
              } else s.holdOk = 0;
            }
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
        // Pre-allocated zero-GC pools for thermal-neutron comets & fission shockwave bursts
        var NEUT_MAX = 18;
        var nX = new Float32Array(NEUT_MAX), nY = new Float32Array(NEUT_MAX);
        var nVx = new Float32Array(NEUT_MAX), nVy = new Float32Array(NEUT_MAX);
        var nP1X = new Float32Array(NEUT_MAX), nP1Y = new Float32Array(NEUT_MAX);
        var nP2X = new Float32Array(NEUT_MAX), nP2Y = new Float32Array(NEUT_MAX);
        var nLife = new Float32Array(NEUT_MAX);
        var nActive = new Uint8Array(NEUT_MAX);
        var nCursor = 0;
        var BURST_MAX = 8;
        var bX = new Float32Array(BURST_MAX), bY = new Float32Array(BURST_MAX);
        var bR = new Float32Array(BURST_MAX), bMaxR = new Float32Array(BURST_MAX);
        var bAlpha = new Float32Array(BURST_MAX), bAng = new Float32Array(BURST_MAX);
        var bActive = new Uint8Array(BURST_MAX);
        var bCursor = 0;
        var rxPrng = 1337;
        function rxRand() {
          rxPrng = (rxPrng * 1664525 + 1013904223) >>> 0;
          return rxPrng / 4294967296;
        }
        function spawnNeutron(x0, y0, speedScale) {
          var idx = nCursor;
          nCursor = (nCursor + 1) % NEUT_MAX;
          var ang = rxRand() * 6.2832;
          var spd = (42 + rxRand() * 58) * speedScale * dpr;
          nX[idx] = x0; nY[idx] = y0;
          nP1X[idx] = x0; nP1Y[idx] = y0;
          nP2X[idx] = x0; nP2Y[idx] = y0;
          nVx[idx] = Math.cos(ang) * spd;
          nVy[idx] = Math.sin(ang) * spd;
          nLife[idx] = 0.7 + rxRand() * 0.6;
          nActive[idx] = 1;
        }
        function spawnFissionBurst(fx, fy) {
          var idx = bCursor;
          bCursor = (bCursor + 1) % BURST_MAX;
          bX[idx] = fx; bY[idx] = fy;
          bR[idx] = 3 * dpr;
          bMaxR[idx] = (18 + rxRand() * 14) * dpr;
          bAlpha[idx] = 0.92;
          bAng[idx] = rxRand() * Math.PI;
          bActive[idx] = 1;
        }

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
            var hc = nkIsContrast();

            hist.push(Math.min(200, s.power));
            if (hist.length > 240) hist.shift();

            c.clearRect(0, 0, W, H);
            c.fillStyle = hc ? '#000000' : '#0b1120';
            c.fillRect(0, 0, W, H);

            // Power trace, in a band that runs from just under the banner to
            // just above the readouts. The old layout gave the trace the top
            // 62% and the readouts the bottom 15%, which left a dead strip
            // across the middle AND put 200% power exactly on y=0 — so a real
            // excursion drew itself along the top edge, half-clipped, at the
            // one moment the trace is worth looking at.
            var plotTop = 26 * dpr, plotBot = H - 46 * dpr;
            var plotH = Math.max(1, plotBot - plotTop);
            function pwrY(pw) { return plotBot - (pw / 200) * (plotBot - plotTop); }
            var traceCol = hc ? '#ffff00' : (s.t > RX_T_CLAD ? '#f87171' : (s.power > 110 ? '#fbbf24' : '#34d399'));
            var rodFrac = nkClamp((s.rods || 0) / 100, 0, 1);
            var pwrFrac = nkClamp((s.power || 0) / 120, 0, 1.4);

            // Layered Cherenkov-blue core glow + control-rod neutron-flux attenuation gradients
            if (!hc) {
              if (typeof c.createRadialGradient === 'function') {
                var cherenkovStr = Math.max(0.14, Math.min(0.42, (0.16 + pwrFrac * 0.2) * (1 - rodFrac * 0.45)));
                var amb = c.createRadialGradient(W * 0.5, (plotTop + plotBot) * 0.55, 6 * dpr, W * 0.5, (plotTop + plotBot) * 0.55, Math.max(W * 0.58, H * 0.65));
                if (s.t > RX_T_CLAD) {
                  amb.addColorStop(0, 'rgba(248,113,113,0.22)');
                  amb.addColorStop(0.55, 'rgba(185,28,28,0.08)');
                } else if (s.power > 110) {
                  amb.addColorStop(0, 'rgba(251,191,36,0.20)');
                  amb.addColorStop(0.55, 'rgba(14,165,233,0.08)');
                } else {
                  amb.addColorStop(0, 'rgba(0,229,255,' + (cherenkovStr * 0.68).toFixed(3) + ')');
                  amb.addColorStop(0.48, 'rgba(14,165,233,' + (cherenkovStr * 0.34).toFixed(3) + ')');
                }
                amb.addColorStop(1, 'rgba(11,17,32,0)');
                c.fillStyle = amb;
                c.fillRect(0, 0, W, plotBot + 4 * dpr);
              }
              // Control-rod neutron-flux attenuation columns dropping from top by rod insertion %
              if (rodFrac > 0.02 && typeof c.createLinearGradient === 'function') {
                var rodDepth = plotH * rodFrac * 0.78;
                var rodG = c.createLinearGradient(0, plotTop, 0, plotTop + rodDepth);
                rodG.addColorStop(0, s.scrammed ? 'rgba(56,189,248,0.26)' : 'rgba(51,65,85,0.42)');
                rodG.addColorStop(1, 'rgba(15,23,42,0.03)');
                c.fillStyle = rodG;
                for (var cri = 0; cri < 5; cri++) {
                  var crx = W * (0.14 + cri * 0.18);
                  c.fillRect(crx - 4 * dpr, plotTop, 8 * dpr, rodDepth);
                }
              }
              // Zero-GC live thermal-neutron trajectory comet trails & fission shockwave burst halos
              if (!nkReduceMotion) {
                if (advancing && !s.scrammed && s.power > 4) {
                  var spawnProb = Math.min(0.45, dt * (2.5 + pwrFrac * 9) * (1 - rodFrac * 0.55));
                  if (rxRand() < spawnProb) {
                    spawnNeutron(W * (0.1 + rxRand() * 0.8), plotTop + plotH * (0.15 + rxRand() * 0.7), 0.75 + pwrFrac * 0.55);
                  }
                  if (rxRand() < spawnProb * 0.42) {
                    var fx = W * (0.15 + rxRand() * 0.7);
                    var fy = plotTop + plotH * (0.2 + rxRand() * 0.6);
                    spawnFissionBurst(fx, fy);
                    spawnNeutron(fx, fy, 1.0);
                    spawnNeutron(fx, fy, 0.9);
                  }
                }
                c.save();
                c.beginPath(); c.rect(0, plotTop, W, plotH); c.clip();
                c.lineCap = 'round';
                // Update & draw thermal-neutron comet trails
                for (var ni = 0; ni < NEUT_MAX; ni++) {
                  if (!nActive[ni]) continue;
                  if (advancing) {
                    nP2X[ni] = nP1X[ni]; nP2Y[ni] = nP1Y[ni];
                    nP1X[ni] = nX[ni]; nP1Y[ni] = nY[ni];
                    nX[ni] += nVx[ni] * dt;
                    nY[ni] += nVy[ni] * dt;
                    nLife[ni] -= dt * (0.65 + rodFrac * 0.9);
                  }
                  if (nLife[ni] <= 0 || nX[ni] < 0 || nX[ni] > W || nY[ni] < plotTop || nY[ni] > plotBot) {
                    nActive[ni] = 0;
                    continue;
                  }
                  var na = Math.min(0.75, nLife[ni] * 0.85);
                  c.strokeStyle = 'rgba(56,189,248,' + (na * 0.55).toFixed(3) + ')';
                  c.lineWidth = 1.6 * dpr;
                  c.beginPath(); c.moveTo(nP2X[ni], nP2Y[ni]); c.lineTo(nP1X[ni], nP1Y[ni]); c.lineTo(nX[ni], nY[ni]); c.stroke();
                  c.fillStyle = 'rgba(224,242,254,' + na.toFixed(3) + ')';
                  c.beginPath(); c.arc(nX[ni], nY[ni], 1.7 * dpr, 0, 6.2832); c.fill();
                }
                // Update & draw fission shockwave burst halos + daughter-nucleus recoil streaks
                for (var bi = 0; bi < BURST_MAX; bi++) {
                  if (!bActive[bi]) continue;
                  if (advancing) {
                    bR[bi] += (bMaxR[bi] - bR[bi]) * Math.min(1, dt * 6.5) + 8 * dpr * dt;
                    bAlpha[bi] -= dt * 1.45;
                  }
                  if (bAlpha[bi] <= 0.03 || bR[bi] >= bMaxR[bi]) {
                    bActive[bi] = 0;
                    continue;
                  }
                  var ba = bAlpha[bi];
                  c.strokeStyle = 'rgba(56,189,248,' + (ba * 0.6).toFixed(3) + ')';
                  c.lineWidth = 1.5 * dpr;
                  c.beginPath(); c.arc(bX[bi], bY[bi], bR[bi], 0, 6.2832); c.stroke();
                  // Two opposing daughter-nucleus recoil streaks (Ba-141 / Kr-92)
                  var rLen = bR[bi] * 0.85;
                  var rdx = Math.cos(bAng[bi]) * rLen, rdy = Math.sin(bAng[bi]) * rLen;
                  c.strokeStyle = 'rgba(251,191,36,' + (ba * 0.72).toFixed(3) + ')';
                  c.lineWidth = 1.8 * dpr;
                  c.beginPath();
                  c.moveTo(bX[bi] - rdx * 0.25, bY[bi] - rdy * 0.25); c.lineTo(bX[bi] - rdx, bY[bi] - rdy);
                  c.moveTo(bX[bi] + rdx * 0.25, bY[bi] + rdy * 0.25); c.lineTo(bX[bi] + rdx, bY[bi] + rdy);
                  c.stroke();
                }
                c.restore();
              }
            }

            // Subtle oscilloscope vertical time-base ticks
            c.strokeStyle = hc ? 'rgba(255,255,0,0.22)' : 'rgba(56,189,248,0.08)';
            c.lineWidth = Math.max(1, dpr);
            for (var vti = 1; vti < 8; vti++) {
              var vtx = (vti / 8) * W;
              c.beginPath(); c.moveTo(vtx, plotTop); c.lineTo(vtx, plotBot); c.stroke();
            }
            c.font = '600 ' + (9 * dpr) + 'px system-ui, sans-serif';
            c.textAlign = 'left'; c.textBaseline = 'alphabetic';
            var lvs = [0, 100, 200];
            for (var li = 0; li < lvs.length; li++) {
              var lv = lvs[li];
              c.strokeStyle = hc ? '#00ff00' : (lv === 100 ? 'rgba(56,189,248,0.34)' : 'rgba(148,163,184,0.16)');
              c.lineWidth = Math.max(1, dpr);
              if (lv === 200) c.setLineDash([4 * dpr, 4 * dpr]);
              c.beginPath(); c.moveTo(0, pwrY(lv)); c.lineTo(W, pwrY(lv)); c.stroke();
              c.setLineDash([]);
              if (hc) { c.fillStyle = '#ffffff'; } else { c.fillStyle = 'rgba(148,163,184,0.85)'; }
              c.fillText(lv + '%', 4 * dpr, pwrY(lv) - 3 * dpr);
            }
            // Luminous area gradient beneath the power trace
            var hLen = hist.length;
            if (!hc && hLen > 1 && typeof c.createLinearGradient === 'function') {
              var trGrad = c.createLinearGradient(0, plotTop, 0, plotBot);
              trGrad.addColorStop(0, nkRgba(traceCol, 0.28));
              trGrad.addColorStop(1, nkRgba(traceCol, 0.02));
              c.fillStyle = trGrad;
              c.beginPath();
              c.moveTo(0, plotBot);
              for (var hi = 0; hi < hLen; hi++) c.lineTo((hi / 240) * W, pwrY(hist[hi]));
              c.lineTo(((hLen - 1) / 240) * W, plotBot);
              c.closePath();
              c.fill();
            }
            // Phosphor bloom underlay + crisp quadratic-smoothed instrument trace
            var canQuadRx = typeof c.quadraticCurveTo === 'function';
            function traceHist() {
              c.beginPath();
              if (!hLen) return;
              c.moveTo(0, pwrY(hist[0]));
              if (canQuadRx && hLen >= 3) {
                for (var hj = 1; hj < hLen - 1; hj++) {
                  var hx1 = (hj / 240) * W, hy1 = pwrY(hist[hj]);
                  var hmx = (hx1 + ((hj + 1) / 240) * W) * 0.5;
                  var hmy = (hy1 + pwrY(hist[hj + 1])) * 0.5;
                  c.quadraticCurveTo(hx1, hy1, hmx, hmy);
                }
                c.lineTo(((hLen - 1) / 240) * W, pwrY(hist[hLen - 1]));
              } else {
                for (var hk = 1; hk < hLen; hk++) c.lineTo((hk / 240) * W, pwrY(hist[hk]));
              }
            }
            c.lineJoin = 'round'; c.lineCap = 'round';
            if (!hc) {
              c.strokeStyle = nkRgba(traceCol, 0.28);
              c.lineWidth = 6 * dpr;
              traceHist();
              c.stroke();
            }
            c.strokeStyle = traceCol;
            c.lineWidth = (hc ? 2.6 : 2.2) * dpr;
            traceHist();
            c.stroke();
            // Live trace tip beacon with Cherenkov pulse ring
            if (hLen) {
              var tipX = ((hLen - 1) / 240) * W;
              var tipY = pwrY(hist[hLen - 1]);
              if (!hc) {
                var tipPulse = nkReduceMotion ? 0.5 : (0.5 + 0.5 * Math.sin((ts || 0) * 0.008));
                c.strokeStyle = nkRgba(traceCol, 0.42);
                c.lineWidth = 1.4 * dpr;
                c.beginPath(); c.arc(tipX, tipY, (6 + tipPulse * 4) * dpr, 0, 6.2832); c.stroke();
                c.beginPath(); c.arc(tipX, tipY, 5.5 * dpr, 0, 6.2832);
                c.fillStyle = nkRgba(traceCol, 0.32); c.fill();
              }
              c.beginPath(); c.arc(tipX, tipY, 2.8 * dpr, 0, 6.2832);
              c.fillStyle = traceCol; c.fill();
            }
            // Readout bay top rule + dividers
            c.strokeStyle = hc ? '#ffff00' : 'rgba(56,189,248,0.22)';
            c.lineWidth = Math.max(1, dpr);
            c.beginPath(); c.moveTo(0, H - 44 * dpr); c.lineTo(W, H - 44 * dpr); c.stroke();
            var divs = [0.245, 0.505, 0.765];
            for (var di = 0; di < divs.length; di++) {
              c.strokeStyle = hc ? 'rgba(255,255,0,0.45)' : 'rgba(148,163,184,0.16)';
              c.beginPath(); c.moveTo(W * divs[di], H - 40 * dpr); c.lineTo(W * divs[di], H - 6 * dpr); c.stroke();
            }
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
            // 0..1 across the band that matters: reference coolant temperature up to
            // cladding failure. Twelve steps, so the climb is visible while it
            // happens rather than in two jumps (see rxBuildCore's colour ramp).
            var hotFrac = (s.t - RX_T_REF) / (RX_T_CLAD - RX_T_REF);
            hotFrac = hotFrac < 0 ? 0 : (hotFrac > 1 ? 1 : hotFrac);
            var hotStep = Math.round(hotFrac * 12);
            if (!advancing || !s.lastSync || ts - s.lastSync > 400) {
              s.lastSync = ts;
              var runningNow = el.dataset.running === 'on' && !s.verdict;
              rxWriteTelemetry(s, r, runningNow, scen);
              rxWriteObjective(s, scen, runningNow);
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
        // Watch the whole simulator section, not just the canvas. The controls
        // sit below the dashboard; after the accessible grouping grew taller,
        // a learner could scroll to Start or the rods while the canvas itself
        // was just beyond the margin, which parked the model they were using.
        var visibilityTarget = el.closest('[data-nk-sec="operate"]') || el;
        var io = typeof IntersectionObserver === 'function' ? new IntersectionObserver(function (entries) {
          if (!entries.length) return;
          inView = !!entries[0].isIntersecting;
          if (inView) wake(); else park();
        }, { rootMargin: '200px' }) : null;
        if (io) io.observe(visibilityTarget);
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
      }, [d.nkPath]);

      React.useEffect(function () {
        var el = rxCanvasRef.current;
        if (!el) return;
        el.dataset.mode = rxMode;
        el.dataset.scenario = rxScenario;
        el.dataset.running = rxUi.running ? 'on' : 'off';
        rxWakeRef.current();
      }, [rxMode, rxScenario, rxUi.running, d.nkPath]);

      React.useEffect(function () {
        RX_VIEWER.sync({
          selected: d.rxPart || null,
          dark: isDark,
          contrast: nkIsContrast(),
          reduced: nkReduceMotion,
          sceneProps: { rods: rxUi.rodStep, hot: rxUi.hotStep / 12 },
          sceneKey: rxUi.rodStep + ':' + rxUi.hotStep,
          onPick: function (id) {
            upd({ rxPart: id });
            var p = RX_PARTS.filter(function (x) { return x.id === id; })[0];
            if (p && typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc);
          },
          onStatus: function (n) { upd({ rxStatus: n }); }
        });
        // attach() can finish synchronously when THREE is already available,
        // before sync() installs onStatus. Replay that current status so a
        // loading overlay can never remain over an already-ready core.
        var viewerStatus = typeof RX_VIEWER.status === 'function' ? RX_VIEWER.status() : null;
        if (/^(loading|ready|failed)$/.test(viewerStatus || '') && viewerStatus !== d.rxStatus) {
          upd({ rxStatus: viewerStatus });
        }
      }, [d.rxPart, d.rxStatus, isDark, isContrast, ctx.theme, nkReduceMotion, rxUi.rodStep, rxUi.hotStep]);

      React.useEffect(function () {
        if (rxUi.verdict && rxUi.verdict.ok && !nkSafeXpLedger(d._xpCredited).nuclear_operate && !xpAwardedRef.current.nuclear_operate && !d.reactorRun) {
          xpAwardedRef.current.nuclear_operate = true;
          upd({ reactorRun: true, _xpCredited: Object.assign(nkSafeXpLedger(d._xpCredited), { nuclear_operate: true }) });
          nkCelebrate();
          if (typeof awardXP === 'function') awardXP('nuclear_operate', 15, 'Completed a reactor scenario');
        }
      }, [rxUi.verdict, d.reactorRun, d._xpCredited]);

      function rxSet(patch) {
        var s = rxRef.current;
        Object.keys(patch).forEach(function (k) { s[k] = patch[k]; });
        rxWakeRef.current();
      }
      function rxRestart(scenarioId) {
        var targetScenario = scenarioId || rxScenario;
        var fresh = rxFresh(targetScenario);
        rxRef.current = fresh;
        rxPatchUi({
          running: false, verdict: null, rodStep: 50, hotStep: 0,
          pumps: fresh.pumps, scrammed: false
        });
        rxWakeRef.current();
        if (typeof announceToSR === 'function') {
          announceToSR(targetScenario === 'blackout'
            ? 'Station blackout reset to 50% rods, full power, coolant pumps offline.'
            : 'Reactor reset to 50% rods, full power, pumps running.');
        }
      }
      var rxRead = rxRef.current;
      var rxReadR = rxReactivity(rxRead, rxModeObj);
      var rxReadRhoPcm = rxReadR.total * 1e5;
      var rxObjective = rxScenarioProgress(rxRead, rxScenObj);
      var rxObjectiveVisualTone = rxObjectiveTone(rxRead, rxObjective, rxUi.running);
      var rxViewerStatus = typeof RX_VIEWER.status === 'function' ? RX_VIEWER.status() : d.rxStatus;
      var rxReadState = rxUi.verdict
        ? (rxUi.verdict.ok ? 'Scenario complete' : 'Run ended')
        : (rxUi.scrammed ? 'Scrammed — decay heat only' : (rxUi.running ? 'Running' : 'Paused'));

      function rxAnnounceStatus() {
        var s = rxRef.current;
        var r = rxReactivity(s, rxModeObj);
        var rhoPcm = r.total * 1e5;
        var objective = rxScenarioProgress(s, rxScenObj);
        var state = s.verdict
          ? (s.verdict.ok ? 'scenario complete' : 'run ended')
          : (s.scrammed ? 'scrammed, decay heat only' : (rxUiRef.current.running ? 'running' : 'paused'));
        var message = 'Reactor status: ' + state + '. Power ' + nkFmt(s.power, s.power < 10 ? 1 : 0)
          + ' percent. Fuel temperature ' + nkFmt(s.t, 0) + ' degrees Celsius. Net reactivity '
          + (rhoPcm >= 0 ? 'plus ' : 'minus ') + nkFmt(Math.abs(rhoPcm), 0) + ' pcm. Xenon '
          + nkFmt(s.xe, 2) + ' times normal. Objective: ' + objective.label + '. ' + objective.detail;
        setRxStatusSnapshot(message);
        if (typeof announceToSR === 'function') announceToSR(message);
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
      }, [isDark, isContrast, d.nkPath]);

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
      React.useEffect(function () {
        if (!nkDoseSpeechReadyRef.current) {
          nkDoseSpeechReadyRef.current = true;
          return;
        }
        var timer = setTimeout(function () {
          setNkDoseSpeech('Estimated annual dose: ' + nkFmt(dsTotal, 2) + ' millisieverts.');
        }, 450);
        return function () { clearTimeout(timer); };
      }, [dsTotal]);

      // ── low-dose risk: the same exposure under four models ──
      var ldModel = RISK_MODELS.filter(function (m) { return m.id === d.ldModel; })[0] || RISK_MODELS[0];
      var ldCase = COLLECTIVE_CASES.filter(function (c) { return c.id === d.ldCase; })[0]
        || COLLECTIVE_CASES.filter(function (c) { return c.id === 'city'; })[0];
      var ldDeaths = nkProjected(ldModel, ldCase.people, ldCase.mSv);
      var ldPersonSv = ldCase.people * ldCase.mSv / 1000;
      // Per-person lifetime risk under this model, as a 1-in-N. Threshold model
      // returns 0 below its cut, which has no reciprocal — say so rather than
      // rendering Infinity.
      var ldPerPerson = ldModel.coeff == null
        ? null
        : ((ldModel.threshold && ldCase.mSv < ldModel.threshold) ? 0 : (ldCase.mSv / 1000) * ldModel.coeff);
      // Three tiers, keyed on the INDIVIDUAL dose, because that is what decides
      // whether the sum means anything — not how big the population is.
      var ldTier = ldCase.mSv >= 100
        ? { id: 'measured', colour: '#f87171', label: 'Measured territory',
            what: 'At and above 100 mSv the excess has actually been observed in survivor studies, so the projection is an estimate of something real. Look at what the four models do here: the threshold model, which returns zero at every dose below this line, now returns the SAME answer as the regulator\'s, and only the dose-rate discount still separates them — a factor of two. The models agree wherever anyone can check them. They diverge by a hundredfold only where nobody can. That is the whole shape of this argument.' }
        : (ldCase.mSv >= 1
          ? { id: 'planning', colour: '#fbbf24', label: 'A planning quantity, not a body count',
              what: 'Between about 1 and 100 mSv the number is below what epidemiology can resolve, but the individual doses are still large enough to be worth managing. Use it to COMPARE options — shelter against evacuate, scan against no scan — and not as a prediction of identifiable deaths.' }
          : { id: 'improper', colour: '#e879f9', label: 'Outside what the sum can support',
              what: 'The individual dose here is smaller than the amount natural background varies between one town and the next. ICRP — the body that publishes the coefficient being used — states directly that computing numbers of deaths by multiplying trivial individual doses across large populations should be avoided. The arithmetic still works; that is exactly the problem.' });

      // ── why it does not resolve: the cohort you would need ──
      // Log slider, 0.1 to 100 mSv in ten steps per decade, because the point
      // is a power law and a linear axis would hide two of its three decades.
      var ldPowIdx = typeof d.ldPow === 'number' ? d.ldPow : 20;
      var ldPowMSv = 0.1 * Math.pow(10, ldPowIdx / 10);
      var ldCohort = nkCohortNeeded(ldPowMSv, 0.055);
      // Population counts here run from 1 to eight billion, and a raw
      // toLocaleString at the top of that range is a wall of digits nobody
      // reads. Words above a million, digits below.
      var ldBig = function (n) {
        if (n == null) return '—';
        if (!isFinite(n)) return 'more people than exist';
        if (n >= 1e9) return nkFmt(n / 1e9, 2) + ' billion';
        if (n >= 1e6) return nkFmt(n / 1e6, 1) + ' million';
        if (n >= 1000) return nkFmt(n, 0);
        if (n >= 1) return nkFmt(n, 1);
        if (n > 0) return nkFmt(n, 4);
        return '0';
      };
      // NOT nkFmt. nkFmt ends in toLocaleString, which caps at three fraction
      // digits regardless of the rounding it just did, so the banana case
      // printed "0.037 mSv" beside a total computed from 0.0365 — and a reader
      // who multiplied the two numbers on screen got 16,280 against the 16,060
      // displayed. The dose is the one figure here that has to be quotable.
      var ldDose = function (v) {
        return v < 0.1 ? String(Number(v.toFixed(4))) : nkFmt(v, 2);
      };
      var ldOneIn = function (risk) {
        if (risk == null) return 'no number';
        if (!(risk > 0)) return 'zero, under this model';
        return '1 in ' + nkFmt(Math.round(1 / risk), 0);
      };

      // ── shared UI ──
      // Accent in, readable text colour out. Pass-through for anything not in
      // the table (rgba strings, already-theme-aware ternaries, '#0b1020'),
      // so it is safe to wrap any colour expression with it.
      var ink = function (c) {
        var pair = typeof c === 'string' && NK_INK[c.toLowerCase()];
        return pair ? (isContrast ? '#ffff00' : (isDark ? pair[0] : pair[1])) : c;
      };
      var card = function (accent) {
        var children = Array.prototype.slice.call(arguments, 1);
        // Spread the children as separate arguments. Passing the array itself
        // makes React treat them as a dynamic LIST and warn that every one needs
        // a key — they are static siblings, not a list.
        return h.apply(null, ['div', { className: 'nk-section-card rounded-xl border p-3 mt-4', style: {
          borderColor: isContrast ? '#fbbf24' : accent + '55',
          borderLeft: '4px solid ' + (isContrast ? '#fbbf24' : accent),
          backgroundColor: isContrast ? '#000000' : (isDark ? 'rgba(15,23,42,0.78)' : 'rgba(255,255,255,0.96)'),
          backgroundImage: isContrast ? 'none' : ('linear-gradient(135deg, ' + accent + (isDark ? '18' : '12') + ' 0%, transparent 38%)'),
          boxShadow: isContrast ? 'none' : (isDark
            ? 'inset 0 1px 0 rgba(255,255,255,0.035), 0 16px 34px -26px rgba(0,0,0,0.85)'
            : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 34px -26px rgba(15,23,42,0.55)')
        } }].concat(children));
      };
      // Same card, plus the anchor the topic index jumps to. scroll-margin keeps
      // the heading clear of the sticky index bar instead of hiding under it.
      var sec = function (id, accent) {
        if (d.nkView === 'reactor' && id !== 'operate') return null;
        // Route mode is progressive disclosure, not only a navigation reorder:
        // keep unrelated sections out of the DOM so a learner following one
        // question sees a short, coherent path. The all-topics/search/category
        // modes continue to render every matching section.
        if (typeof nkPath !== 'undefined' && nkPath && nkPath.steps.indexOf(id) === -1) return null;
        var children = Array.prototype.slice.call(arguments, 2);
        var headingId = 'nkheading-' + id;
        var hasHeading = false;
        children = children.map(function (child) {
          if (!hasHeading && React.isValidElement(child) && child.type === 'h4') {
            hasHeading = true;
            return React.cloneElement(child, { id: headingId });
          }
          return child;
        });
        // A route was only walkable from the index: read a step, scroll back up,
        // open the drawer, find the next one. Sections on the active route now
        // carry their own step footer, so it can be followed straight through.
        var routeAt = typeof nkPath !== 'undefined' && nkPath ? nkPath.steps.indexOf(id) : -1;
        // Keep the journey itself visually stable while the section heading
        // retains the subject colour inside the card.
        var frameAccent = routeAt >= 0 && nkPath.accent ? nkPath.accent : accent;
        var footer = nkRouteFooter(id, frameAccent);
        var routeKickerId = routeAt >= 0 ? 'nk-route-step-' + id : undefined;
        var routeKicker = routeAt >= 0 ? h('div', {
          id: routeKickerId,
          'data-nk-route-step': id,
          className: 'nk-route-kicker flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mb-3 pb-2.5',
          style: { borderBottom: '1px solid ' + frameAccent + '44' }
        },
          h('span', {
            className: 'nk-route-kicker-badge inline-flex items-center rounded-full px-2.5 py-1 text-[0.625rem] font-black uppercase tracking-wide',
            style: { background: frameAccent + '20', border: '1px solid ' + frameAccent + '66', color: ink(frameAccent) }
          }, nkPath.icon + ' Route step ' + (routeAt + 1) + ' of ' + nkPath.steps.length),
          h('span', {
            className: 'nk-route-kicker-question min-w-0 text-[0.6875rem] font-bold',
            style: { color: isDark ? '#cbd5e1' : '#475569' }
          }, nkPath.q)
        ) : null;
        var body = routeKicker ? [routeKicker].concat(children) : children;
        var node = card.apply(null, [frameAccent].concat(footer ? body.concat([footer]) : body));
        return React.cloneElement(node, {
          key: 'nksec-' + id,
          id: 'nksec-' + id,
          'data-nk-sec': id,
          className: node.props.className + (routeAt >= 0 ? ' nk-route-section' : ''),
          // A programmatically focused div does not inherit the name of a child
          // heading. Give the focus destination an explicit accessible name.
          // Short routes can also be useful landmarks; the 22-section full lab
          // uses groups so landmark navigation does not become another long list.
          role: nkPath ? 'region' : undefined,
          'aria-labelledby': hasHeading ? headingId : undefined,
          'aria-describedby': routeKickerId,
          // tabIndex -1 so nkGoTo can move FOCUS here, not just the viewport.
          // Scrolling alone left a keyboard user's focus back on the index
          // button: the page moved, the next Tab went to the next index button,
          // and the section they asked for was unreachable without tabbing
          // through everything above it. -1 keeps it out of the tab order.
          tabIndex: -1,
          // Keep a visible focus ring. Programmatic focus is still focus, and
          // removing its outline made a successful keyboard jump look broken.
          style: Object.assign({}, node.props.style, { scrollMarginTop: '96px' })
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
        // Route kickers already provide the meaningful step order. Omit the
        // separate full-lab ordinal in route mode so one journey never appears
        // to have two competing sequences.
        var visibleText = nkPath
          ? String(text).replace(/^((?:\S+\s+)?)\d+\.\s+/, '$1')
          : text;
        return h('h4', {
          className: 'nk-section-heading font-black mb-3 pb-2',
          style: {
            color: ink(accent),
            fontSize: '0.875rem',
            lineHeight: '1.35rem',
            letterSpacing: '-0.01em',
            borderBottom: '1px solid ' + accent + '44'
          }
        }, visibleText);
      };
      var pill = function (on, accent, label, onClick, aria, itemKey, explored) {
        var visibleLabel = (explored ? 'Seen: ' : '') + label;
        return h('button', {
          key: itemKey || label, type: 'button', 'aria-pressed': on ? 'true' : 'false',
          'aria-label': visibleLabel + (aria && aria !== label ? '. ' + aria : ''),
          'data-nk-explored': explored ? 'true' : 'false',
          onClick: onClick,
          className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold transition-colors',
          style: on
            ? { background: accent, color: '#0b1020', border: '1px solid ' + accent }
            : (explored
              ? { background: accent + '16', color: ink(accent), border: '1px solid ' + accent }
              : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') })
        }, explored ? h('span', { 'aria-hidden': 'true' }, 'Seen: ') : null, label);
      };
      function nkExploredIds(key, validIds) {
        var raw = Array.isArray(d[key]) ? d[key] : [];
        return validIds.filter(function (id, i) {
          return validIds.indexOf(id) === i && raw.indexOf(id) !== -1;
        });
      }
      function nkExplorationProgress(key, validIds, target, label, accent) {
        var explored = nkExploredIds(key, validIds);
        var needed = Math.min(target, validIds.length);
        var value = Math.min(explored.length, needed);
        var complete = value >= needed;
        return h('div', {
          'data-nk-exploration-progress': key,
          className: 'nk-exploration-progress flex flex-wrap items-center gap-2 mb-2 rounded-lg border px-2.5 py-1.5',
          style: {
            borderColor: complete ? 'rgba(52,211,153,0.55)' : accent + '55',
            background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(248,250,252,0.94)'
          }
        },
          h('span', {
            className: 'text-[0.625rem] font-black',
            style: { color: ink(complete ? '#34d399' : accent) }
          }, value === 0 ? 'Try another option' : (complete ? 'Comparison goal reached' : 'Keep comparing')),
          h('progress', {
            value: value,
            max: needed,
            'aria-label': t('stem.nuclearlab.aria_compared_progress', '{value} of {needed} {label} deliberately compared').replace('{value}', String(value)).replace('{needed}', String(needed)).replace('{label}', label),
            className: 'flex-1 min-w-[7rem] h-2',
            style: { accentColor: complete ? '#059669' : accent }
          }),
          h('span', {
            className: 'text-[0.625rem] font-bold',
            style: { color: isDark ? '#cbd5e1' : '#475569' }
          }, value + ' of ' + needed + ' ' + label + ' deliberately compared')
        );
      }
      var slider = function (id, label, min, max, stepv, value, onChange, suffix) {
        var valueText = suffix == null ? String(value) : String(suffix);
        return h('div', { className: 'nk-slider flex items-center gap-2 mt-1.5' },
          h('label', { htmlFor: id, className: 'text-[0.6875rem] font-bold w-28 flex-shrink-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, label),
          h('input', {
            id: id, type: 'range', min: min, max: max, step: stepv, value: value,
            onChange: onChange, 'aria-valuetext': valueText,
            className: 'nk-slider-input flex-1 min-w-0 min-h-11 accent-violet-500'
          }),
          h('output', { htmlFor: id, className: 'text-[0.6875rem] font-bold w-24 text-right', style: { color: isDark ? '#c4b5fd' : '#6d28d9' } }, valueText));
      };
      var stat = function (label, value, colour) {
        return h('div', { key: label, className: 'rounded-lg p-2 text-center', style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.09)', border: '1px solid ' + colour + '50' } },
          h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, label),
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
        var disclosureId = 'nk-expand-' + String(key).replace(/[^a-zA-Z0-9_-]/g, '-');
        return h('div', {
          key: key, className: 'rounded-lg border transition-colors',
          style: on ? { background: accent + '1f', borderColor: accent }
            : { background: isDark ? 'rgba(148,163,184,0.07)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.22)' : 'rgba(100,116,139,0.2)' }
        },
          h('button', {
            type: 'button', 'aria-expanded': on ? 'true' : 'false',
            'aria-controls': on ? disclosureId : undefined,
            onClick: onClick,
            className: 'min-h-11 w-full text-left px-2.5 py-2 rounded-lg'
          },
            h('span', { className: 'flex items-center gap-2' },
              h('span', { className: 'flex-1' },
                h('span', { className: 'block text-[0.6875rem] font-bold', style: { color: isDark ? '#fff' : '#1e293b' } }, title),
                sub ? h('span', { className: 'block text-[0.6875rem]', style: { color: isDark ? '#cbd5e1' : '#475569' } }, sub) : null),
              h('span', { className: 'text-[0.6875rem] font-bold', 'aria-hidden': 'true', style: { color: ink(accent) } }, on ? '▾' : '›'))),
          on ? h('div', { id: disclosureId, className: 'px-2.5 pb-2 -mt-0.5' }, body) : null);
      };
      // ── Think first, then check ────────────────────────────────────────
      // Five sections ended on a "🤔" question and then stopped. They are good
      // questions — that is the problem. A reader with a teacher asks them; a
      // reader in independent mode, which is most of them, hits a dead end and
      // has no way to find out whether the thing they worked out was right.
      // Only one of the five was answered anywhere, and its answer sat in an
      // EARLIER section with nothing linking the two.
      //
      // The beat is still think-first: the question stays on screen on its own,
      // and the answer is one deliberate press away. The revealed text is a
      // sibling AFTER the button rather than inside it, for the reason recorded
      // on expandRow above — an aria-label on the button would otherwise become
      // the accessible name and swallow the prose it wraps.
      var ponder = function (id, accent, question, answer) {
        var open = !!(d.ponderOpen || {})[id];
        var answerId = 'nk-ponder-answer-' + id;
        return h('div', {
          key: 'ponder-' + id, className: 'mt-2 rounded-lg border p-2.5',
          style: { borderColor: accent + '55', background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.75)' }
        },
          h('p', { className: 'text-[0.6875rem] font-bold leading-relaxed', style: { color: ink(accent) } }, '🤔 ' + question),
          h('button', {
            type: 'button',
            'aria-expanded': open ? 'true' : 'false',
            'aria-controls': open ? answerId : undefined,
            onClick: function () {
              var map = Object.assign({}, d.ponderOpen || {});
              map[id] = !open;
              upd({ ponderOpen: map });
              if (!open) pushOnce('ponderSeen', id);
              if (typeof beep === 'function') beep();
            },
            className: 'min-h-11 mt-1.5 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
            style: {
              background: open ? 'transparent' : accent,
              color: open ? ink(accent) : '#0b1020',
              border: '1px solid ' + accent
            }
          }, open ? 'Hide the answer' : 'Worked it out? Check'),
          open ? h('div', { id: answerId },
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, answer),
            canSpeak ? h('button', {
              type: 'button',
              'aria-label': t('stem.nuclearlab.aria_read_ponder_answer', 'Read explanation aloud'),
              onClick: function () { speakNuclear(ctx, question + ' ' + answer); },
              className: 'min-h-11 mt-2 px-3 py-1.5 rounded-lg text-[0.6875rem] font-bold',
              style: isContrast ? { background: '#000000', color: ink('#fbbf24'), border: '2px solid #ffff00' } : { background: isDark ? 'rgba(30,41,59,0.92)' : '#ffffff', color: isDark ? '#e2e8f0' : '#1e293b', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.45)' : 'rgba(100,116,139,0.4)') }
            }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null) : null);
      };
      var para = function (txt, colour) {
        return h('span', { className: 'block text-[0.6875rem] leading-relaxed mt-1', style: { color: ink(colour) || (isDark ? '#e2e8f0' : '#334155') } }, txt);
      };
      var sourceNote = function (keys) {
        var items = keys.map(function (key) { return NK_SOURCES[key]; }).filter(Boolean);
        return h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
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
        return h('aside', { role: 'note', 'aria-label': t('stem.nuclearlab.educational_safety_notice','Educational safety notice'), className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(248,113,113,0.6)', background: isDark ? 'rgba(69,10,10,0.35)' : 'rgba(254,242,242,0.95)' } },
          h('p', { className: 'text-[0.6875rem] font-black', style: { color: ink('#ef4444') } }, 'Educational model — not emergency or medical instructions'),
          h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#fecaca' : '#7f1d1d' } }, detail),
          h('a', { href: NK_SOURCES.nrc.url, target: '_blank', rel: 'noopener noreferrer', className: 'inline-block mt-1 text-[0.6875rem] font-bold underline', style: { color: ink('#ef4444') } }, 'Official NRC emergency guidance ↗'));
      };

      // ── topic index ──
      // Twenty-one sections is a long scroll to hunt through. Order here MUST match DOM
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
        { id: 'shielding', grp: 'radiation', icon: '🛡️', label: 'Shielding', kw: 'alpha beta gamma neutron lead concrete paper stopping attenuation moderation moderator removal cross-section thermalise thermalize elastic scattering hydrogen polyethylene boron capture gamma layered shield half-value layer why lead does not stop neutrons' },
        { id: 'criticality', grp: 'reactors', icon: '⚛️', label: 'Chain reaction', kw: 'critical subcritical supercritical k neutron multiplication moderator control' },
        { id: 'binding', grp: 'decay', icon: '⛰️', label: 'Binding energy', kw: 'curve iron-56 fission fusion mass defect e=mc2 nucleon why energy' },
        { id: 'weighting', grp: 'radiation', icon: '🎚️', label: 'Gray vs sievert', kw: 'absorbed equivalent effective dose weighting factor icrp 103 gray gy sievert sv wr wt tissue organ why alpha is worse units' },
        { id: 'biohalf', grp: 'radiation', icon: '🫀', label: 'Half-life inside a body', kw: 'biological effective half-life excretion internal contamination caesium potassium iodide ki tablets thyroid strontium bone plutonium ingestion' },
        { id: 'mydose', grp: 'radiation', icon: '🧮', label: 'Your annual dose', kw: 'personal estimate radon flights scans altitude millisievert msv background' },
        { id: 'doseladder', grp: 'radiation', icon: '📏', label: 'Dose ladder', kw: 'sievert banana flight ct scan lethal acute compare how much is a lot' },
        { id: 'lowdose', grp: 'radiation', icon: '📉', label: 'How risky is a small dose?', kw: 'linear no-threshold lnt hormesis threshold collective dose person-sievert man-sievert icrp risk coefficient ddref statistical power epidemiology inworks chernobyl projection why the numbers disagree banana is a small dose dangerous' },
        { id: 'detect', grp: 'radiation', icon: '🔬', label: 'Measure it: counts vs dose', kw: 'geiger counter cpm cps becquerel activity counting statistics poisson inverse square distance background subtraction detection limit uncertainty error bars' },
        { id: 'protect', grp: 'radiation', icon: '⏱️', label: 'Time, distance, shielding', kw: 'protection alara stay time dose rate gamma constant sealed source patient nuclear medicine half value layer worker limit how long can i stand here' },
        { id: 'accidents', grp: 'society', icon: '📋', label: 'The three accidents', kw: 'chernobyl fukushima three mile island deaths tmi meltdown numbers' },
        { id: 'shelter', grp: 'society', icon: '🏠', label: 'Shelter or evacuate?', kw: 'emergency protective action evacuation sheltering plume dose reduction factor fukushima pag epa iaea basement decision' },
        { id: 'reactors', grp: 'reactors', icon: '🏭', label: 'Reactor designs & SMRs', kw: 'pwr bwr candu rbmk smr molten salt fusion small modular status' },
        { id: 'waste', grp: 'society', icon: '🗄️', label: 'The waste question', kw: 'spent fuel repository onkalo storage geological million years disposal' },
        { id: 'compare', grp: 'society', icon: '⚖️', label: 'Compared with alternatives', kw: 'deaths per twh coal gas solar wind carbon co2 lifecycle safest predict ranking guess which kills more banqiao hydro dam risk perception' },
        { id: 'operate', grp: 'reactors', icon: '🎛️', label: 'Operate a reactor', kw: 'simulator control rods scram xenon blackout scenario 3d core hands on' },
        { id: 'evidence', grp: 'society', icon: '🔎', label: 'Evidence challenge', kw: 'claim evidence supported contradicted uncertainty critical thinking misconception check mastery' }
      ];
      // ── Question-led routes through the tool ─────────────────────────────
      // Twenty-one sections and a very long page, ordered by physics: start
      // at half-life, end at a reactor simulator. That order is right for
      // someone reading it through and wrong for almost everyone who arrives,
      // because people do not turn up wanting "section 8" — they turn up
      // wanting to know whether the scan they just had matters, or whether
      // nuclear power is safe, and the sections that answer those questions are
      // scattered across the document by design.
      //
      // These are focused reading orders across the same topic set. Nothing is
      // duplicated: a route is a filter over the index, so a student can take
      // one, ignore them all, or search as before. Every route closes with the
      // same evidence challenge so reading ends in an active judgement.
      var NK_PATHS = [
        { id: 'safe', q: 'Is nuclear power safe?', icon: '⚖️', accent: '#fbbf24',
          why: 'Start with the comparison, then the three accidents that shape how people feel about it, then why their death tolls are quoted so differently, then the two problems that are genuinely unsolved.',
          steps: ['compare', 'accidents', 'lowdose', 'shelter', 'waste', 'reactors', 'evidence'] },
        { id: 'me', q: 'Does this dose matter to me?', icon: '🧍', accent: '#e879f9',
          why: 'What a sievert actually is, what happens once something is inside you, your own yearly total, where it all sits on a scale, and what a small number on that scale does and does not mean.',
          steps: ['weighting', 'biohalf', 'mydose', 'doseladder', 'lowdose', 'evidence'] },
        { id: 'safety', q: 'How would I protect myself?', icon: '🛡️', accent: '#38bdf8',
          why: 'What stops each kind of radiation, the three levers you can actually pull, and the one emergency decision that is genuinely a judgement call.',
          steps: ['shielding', 'protect', 'shelter', 'evidence'] },
        { id: 'works', q: 'How does any of it work?', icon: '⚛️', accent: '#a78bfa',
          why: 'The one rule that never changes, the curve behind both fission and fusion, the chain reaction, and then run one yourself.',
          steps: ['halflife', 'binding', 'criticality', 'enrichment', 'operate', 'evidence'] },
        { id: 'know', q: 'How do we know all this?', icon: '🔬', accent: '#2dd4bf',
          why: 'Every number in this tool came from an instrument. This is what those instruments are and what they can and cannot tell you.',
          steps: ['detect', 'dating', 'chain', 'evidence'] }
      ];
      // Open when the available panel is comfortably wide and tall. Compact on
      // phones, embedded narrow panels and short laptops, where the expanded
      // drawer would take over the first screen. An explicit choice always wins.
      var nkOpen = typeof d.nkOpen === 'boolean' ? d.nkOpen : nkAutoOpen;
      // Only a real string may be searched. `(d.nkQuery || '').trim()` throws
      // for a saved number, object, array or true, and this runs in the render
      // path, so a corrupted save blanked the entire lab instead of ignoring
      // one bad field. Anything that is not a string searches for nothing.
      var nkQueryRaw = typeof d.nkQuery === 'string' ? d.nkQuery : '';
      var nkQuery = nkQueryRaw.trim().toLowerCase();
      var nkGroup = d.nkGroup || 'all';
      var nkPathId = d.nkPath || null;
      var nkPath = nkPathId ? NK_PATHS.filter(function (p) { return p.id === nkPathId; })[0] : null;
      // A short route should assess the evidence it actually taught. Global
      // browsing keeps all five claims; a question route keeps only claims
      // whose supporting section is present on that route. Mastery itself stays
      // global, so work carries across routes and the five-claim quest remains.
      function nkEvidenceClaimsFor(route) {
        return route
          ? EVIDENCE_CLAIMS.filter(function (claim) {
              return route.steps.indexOf(claim.section) !== -1;
            })
          : EVIDENCE_CLAIMS;
      }
      function nkEvidenceCompleteFor(route, mastered) {
        var claims = nkEvidenceClaimsFor(route);
        return claims.length > 0 && claims.every(function (claim) {
          return mastered.indexOf(claim.id) !== -1;
        });
      }
      var evidenceClaims = nkEvidenceClaimsFor(nkPath);
      // Route definitions are regression-tested to prevent this fallback. It is
      // still safer than crashing an old saved session if a future route is
      // accidentally published without a supporting evidence claim.
      if (!evidenceClaims.length) evidenceClaims = EVIDENCE_CLAIMS;
      var evidenceIndex = evidenceClaims.findIndex(function (claim) {
        return claim.id === evidenceRequestedId;
      });
      if (evidenceIndex < 0) evidenceIndex = 0;
      var evidenceClaim = evidenceClaims[evidenceIndex];
      var evidenceChoice = evidenceChoices[evidenceClaim.id] || '';
      var evidenceIsChecked = !!evidenceCheckedMap[evidenceClaim.id];
      var evidenceCorrect = evidenceIsChecked && evidenceChoice === evidenceClaim.verdict;
      var evidenceAnswerVisible = evidenceCorrect
        || evidenceMastered.indexOf(evidenceClaim.id) !== -1
        || !!evidenceRevealedMap[evidenceClaim.id];
      var evidenceVerdict = EVIDENCE_VERDICTS.filter(function (v) {
        return v.id === evidenceClaim.verdict;
      })[0];
      var activeEvidenceMastered = evidenceClaims.filter(function (claim) {
        return evidenceMastered.indexOf(claim.id) !== -1;
      });
      var activeEvidenceComplete = activeEvidenceMastered.length === evidenceClaims.length;
      // A route should resume rather than forget. Store only section ids from
      // that route, in route order, and keep completion separate from exposure:
      // every step must have opened AND the evidence challenge must be mastered.
      // This also makes the route quest truthful; selecting two pills is no
      // longer enough to claim that two routes were completed.
      var nkRouteSeenMap = d.nkRouteSeen
        && typeof d.nkRouteSeen === 'object'
        && !Array.isArray(d.nkRouteSeen)
          ? d.nkRouteSeen
          : {};
      var nkPathsCompleted = Array.isArray(d.pathsCompleted)
        ? d.pathsCompleted.filter(function (id, i, all) {
            return all.indexOf(id) === i && NK_PATHS.some(function (route) { return route.id === id; });
          })
        : [];
      function nkRouteSeenFor(route) {
        var raw = Array.isArray(nkRouteSeenMap[route.id]) ? nkRouteSeenMap[route.id] : [];
        return route.steps.filter(function (id) { return raw.indexOf(id) !== -1; });
      }
      function nkRouteProgressFor(route) {
        var seen = nkRouteSeenFor(route);
        var everComplete = nkPathsCompleted.indexOf(route.id) !== -1;
        var complete = seen.length === route.steps.length
          && nkEvidenceCompleteFor(route, evidenceMastered);
        var nextId = route.steps.filter(function (id) { return seen.indexOf(id) === -1; })[0]
          || (complete ? route.steps[0] : route.steps[route.steps.length - 1]);
        return {
          seen: seen,
          count: seen.length,
          total: route.steps.length,
          nextId: nextId,
          complete: complete,
          everComplete: everComplete
        };
      }
      function nkRecordRouteStep(routeId, sectionId) {
        var route = NK_PATHS.filter(function (item) { return item.id === routeId; })[0];
        if (!route || route.steps.indexOf(sectionId) === -1) return false;
        var before = nkRouteProgressFor(route);
        var afterCount = before.count + (before.seen.indexOf(sectionId) === -1 ? 1 : 0);
        var willComplete = !before.complete
          && nkEvidenceCompleteFor(route, evidenceMastered)
          && afterCount === route.steps.length;

        setToolData(function (prev) {
          var base = (prev && prev._nuclearLab) || {};
          var rawMap = base.nkRouteSeen
            && typeof base.nkRouteSeen === 'object'
            && !Array.isArray(base.nkRouteSeen)
              ? base.nkRouteSeen
              : {};
          var rawSeen = Array.isArray(rawMap[routeId]) ? rawMap[routeId] : [];
          var seen = route.steps.filter(function (id) { return rawSeen.indexOf(id) !== -1; });
          var seenChanged = seen.indexOf(sectionId) === -1;
          if (seenChanged) {
            seen = route.steps.filter(function (id) {
              return id === sectionId || rawSeen.indexOf(id) !== -1;
            });
          }

          var mastered = Array.isArray(base.evidenceMastered)
            ? base.evidenceMastered.filter(function (id, i, all) {
                return all.indexOf(id) === i
                  && EVIDENCE_CLAIMS.some(function (claim) { return claim.id === id; });
              })
            : [];
          var completed = Array.isArray(base.pathsCompleted)
            ? base.pathsCompleted.filter(function (id, i, all) {
                return all.indexOf(id) === i && NK_PATHS.some(function (item) { return item.id === id; });
              })
            : [];
          var completionChanged = seen.length === route.steps.length
            && nkEvidenceCompleteFor(route, mastered)
            && completed.indexOf(routeId) === -1;
          if (!seenChanged && !completionChanged) return prev;

          var cur = Object.assign({}, base);
          if (seenChanged) {
            var nextMap = Object.assign({}, rawMap);
            nextMap[routeId] = seen;
            cur.nkRouteSeen = nextMap;
          }
          if (completionChanged) cur.pathsCompleted = completed.concat([routeId]);
          var next = Object.assign({}, prev);
          next._nuclearLab = cur;
          return next;
        });
        return willComplete;
      }
      var nkActiveRouteProgress = nkPath ? nkRouteProgressFor(nkPath) : null;
      var nkActiveRouteNext = nkPath && !nkActiveRouteProgress.complete
        ? NK_SECTIONS.filter(function (section) {
            return section.id === nkActiveRouteProgress.nextId;
          })[0]
        : null;
      // Reflections are kept separately for each question-led route. Completing
      // one question should not make an old answer appear under a different one;
      // the all-topics view gets its own general-lab note.
      var nkReflectionKey = nkPath ? nkPath.id : 'all';
      var nkReflections = d.nkReflections
        && typeof d.nkReflections === 'object'
        && !Array.isArray(d.nkReflections)
          ? d.nkReflections
          : {};
      var nkSavedReflection = nkReflections[nkReflectionKey]
        && typeof nkReflections[nkReflectionKey] === 'object'
          ? nkReflections[nkReflectionKey]
          : {};
      function nkSaveReflection(reflection) {
        var allowed = ['building', 'growing', 'explain'];
        var clean = {
          confidence: allowed.indexOf(reflection.confidence) !== -1 ? reflection.confidence : '',
          idea: String(reflection.idea || '').trim().slice(0, 280),
          question: String(reflection.question || '').trim().slice(0, 280)
        };
        if (!(clean.confidence || clean.idea || clean.question)) return;
        var next = Object.assign({}, nkReflections);
        next[nkReflectionKey] = clean;
        upd({ nkReflections: next });
      }
      function nkClearReflection() {
        var next = Object.assign({}, nkReflections);
        delete next[nkReflectionKey];
        upd({ nkReflections: next });
      }
      // ── what the student actually worked out ──
      // Twenty-one sections of predictions, estimates and verdicts, and until
      // now none of it left the tool: a student closed the tab and it was gone,
      // and a teacher had no way to see that any of it happened. This gathers
      // only work the student genuinely did — every line is omitted when the
      // underlying section was never touched, so an untouched tool produces an
      // empty summary rather than a page of defaults presented as findings.
      function nkSummaryLines() {
        var out = [];
        if (d.doseEstimated) {
          out.push({
            label: 'My estimated annual dose',
            value: nkFmt(dsTotal, 2) + ' mSv/year',
            detail: 'Largest single contributor: ' + dsParts.slice().sort(function (a, b) {
              return b.v - a.v;
            })[0].name + '. World average is about 2.4 mSv/year.'
          });
        }
        if (cmpRevealed) {
          out.push({
            label: 'Deaths-per-TWh prediction',
            value: cmpRight.length + ' of ' + CMP_PAIRS.length + ' correct',
            detail: CMP_PAIRS.map(function (pair) {
              var guess = cmpGuessFor(pair.id);
              if (!guess) return null;
              return pair.a + ' vs ' + pair.b + ': said ' + guess
                + (guess === cmpCorrect(pair) ? ' (right)' : ' (actually ' + cmpCorrect(pair) + ')');
            }).filter(Boolean).join('; ')
          });
        }
        if (evidenceMastered.length) {
          out.push({
            label: 'Evidence claims judged so far',
            value: evidenceMastered.length + ' of ' + EVIDENCE_CLAIMS.length + ' worked through',
            detail: 'Each one reached the best-supported verdict after weighing what the evidence does and does not show. The challenge is untimed and can be revisited, so this is progress rather than a score.'
          });
        }
        if (nkPathsCompleted.length) {
          out.push({
            label: 'Question routes completed',
            value: String(nkPathsCompleted.length),
            detail: nkPathsCompleted.map(function (id) {
              var route = NK_PATHS.filter(function (r) { return r.id === id; })[0];
              return route ? route.q : id;
            }).join(' · ')
          });
        }
        if (d.countPrecise) {
          out.push({
            label: 'Counting statistics',
            value: 'Took a measurement better than ±5%',
            detail: 'Counting longer narrows the uncertainty as the square root of the number of counts, not linearly.'
          });
        }
        if (d.heldCritical) {
          out.push({
            label: 'Chain reaction',
            value: 'Held a reactor critical (k = 1)',
            detail: 'Critical means self-sustaining and steady — not an accident condition.'
          });
        }
        return out;
      }
      var nkSummary = nkSummaryLines();
      // The reflection lives under the evidence challenge and is the only free
      // text in the tool, so it belongs in anything the student carries out.
      var nkSummaryReflection = nkSavedReflection && typeof nkSavedReflection === 'object'
        ? nkSavedReflection
        : null;
      function nkSummaryText() {
        var lines = ['Nuclear & Radiation Lab — what I worked out', ''];
        nkSummary.forEach(function (row) {
          lines.push('- ' + row.label + ': ' + row.value);
          if (row.detail) lines.push('  ' + row.detail);
        });
        if (nkSummaryReflection && nkSummaryReflection.idea) {
          lines.push('', 'The idea I would explain to someone else:', nkSummaryReflection.idea);
        }
        if (nkSummaryReflection && nkSummaryReflection.question) {
          lines.push('', 'What I still want to know:', nkSummaryReflection.question);
        }
        lines.push('', 'Figures reviewed ' + NK_REVIEWED
          + '. Half-lives NNDC NuDat 3; dose context UNSCEAR, ICRP 103, NCRP 160.');
        return lines.join('\n');
      }

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
      // The lab can live inside a narrow host panel even when the browser
      // itself is wide. Let the available container width participate in the
      // automatic disclosure choice until the learner explicitly opens or
      // closes the index.
      var nkHasOpenPreference = typeof d.nkOpen === 'boolean';
      React.useEffect(function () {
        if (nkHasOpenPreference || typeof window === 'undefined') return;
        var root = nkRootRef.current;
        if (!root) return;
        // ResizeObserver also fires for height-only changes (for example when a
        // learner saves a reflection). Track the last WIDTH-derived decision
        // outside React so those observations do not request a redundant
        // parent render before React can bail out of a same-value state update.
        var lastAutoOpen = nkAutoOpen;
        function updateAutoOpen() {
          var rect = root.getBoundingClientRect ? root.getBoundingClientRect() : null;
          var available = rect && rect.width ? rect.width : (root.clientWidth || window.innerWidth || 0);
          var compact = (window.innerWidth > 0 && window.innerWidth < 768)
            || (available > 0 && available < 640)
            || (window.innerWidth >= 900 && window.innerHeight > 0 && window.innerHeight <= 768);
          var nextAutoOpen = !compact;
          if (nextAutoOpen === lastAutoOpen) return;
          lastAutoOpen = nextAutoOpen;
          setNkAutoOpen(nextAutoOpen);
        }
        updateAutoOpen();
        var observer = typeof ResizeObserver === 'function' ? new ResizeObserver(updateAutoOpen) : null;
        if (observer) observer.observe(root);
        window.addEventListener('resize', updateAutoOpen);
        return function () {
          if (observer) observer.disconnect();
          window.removeEventListener('resize', updateAutoOpen);
        };
      }, [nkHasOpenPreference]);
      // Keep the visible result count immediate, but debounce the live message
      // so typing a word does not queue one screen-reader announcement per key.
      React.useEffect(function () {
        var status = nkSearchStatusRef.current;
        if (!status) return;
        if (nkPathId || !nkQuery) {
          status.textContent = '';
          return;
        }
        var timer = setTimeout(function () {
          status.textContent = nkVisible.length
            ? nkVisible.length + ' topic' + (nkVisible.length === 1 ? '' : 's') + ' match the search.'
            : 'No topics match the search.';
        }, 350);
        return function () { clearTimeout(timer); };
      }, [nkQuery, nkVisible.length, nkPathId]);
      function nkLandOn(s) {
        var target = typeof document !== 'undefined' && document.getElementById('nksec-' + s.id);
        var routeCompletedNow = false;
        if (target) {
          if (nkPath && nkPath.steps.indexOf(s.id) !== -1) {
            routeCompletedNow = nkRecordRouteStep(nkPath.id, s.id);
          }
          // The index has already folded before this runs. Measure that actual
          // compact height instead of guessing one scroll margin for a phone,
          // laptop, large-text mode and every translation.
          var nav = document.querySelector('[data-nuclear-lab] .nk-topic-nav');
          if (nav) target.style.scrollMarginTop = Math.ceil(nav.getBoundingClientRect().height + 12) + 'px';
          try { target.scrollIntoView({ behavior: nkReduceMotion ? 'auto' : 'smooth', block: 'start' }); }
          catch (e) { target.scrollIntoView(); }
          // Then take focus with it, so Tab continues from the section the
          // reader asked for. preventScroll keeps focus() from fighting the
          // smooth scroll that just started.
          try { target.focus({ preventScroll: true }); }
          catch (e2) { try { target.focus(); } catch (e3) {} }
        }
        // Programmatic focus already speaks the named section and its route
        // context. Only completion is new information worth a live message.
        if (routeCompletedNow && typeof announceToSR === 'function') {
          announceToSR('Route complete: ' + nkPath.q);
        }
      }
      function nkGoTo(s) {
        // Collapse first, then measure and scroll after React commits the
        // compact masthead. Scrolling under the expanded drawer caused the
        // destination to shift while smooth scrolling and could hide its focus
        // outline under the sticky bar.
        if (nkOpen) {
          nkPendingTargetRef.current = s;
          upd({ nkOpen: false });
          return;
        }
        nkLandOn(s);
      }
      function nkReviewTopic(id) {
        var section = NK_SECTIONS.filter(function (s) { return s.id === id; })[0];
        if (!section) return;
        var target = typeof document !== 'undefined' && document.getElementById('nksec-' + id);
        if (target) {
          nkGoTo(section);
          return;
        }
        // The requested evidence lives outside the current progressive route.
        // Leave the route, then let the existing post-commit focus handoff land
        // on the newly mounted section.
        nkPendingTargetRef.current = section;
        upd({ nkPath: null, nkQuery: '', nkGroup: 'all', nkOpen: false });
      }
      // A route's first section is absent until React commits the route change.
      // Moving focus in the click handler races that commit and leaves keyboard
      // focus on a route button that is about to disappear with the folded
      // index. Complete the jump after the destination has mounted instead.
      React.useEffect(function () {
        var pending = nkPendingTargetRef.current;
        if (!pending || typeof document === 'undefined') return;
        if (!document.getElementById('nksec-' + pending.id)) return;
        if (nkOpen) {
          upd({ nkOpen: false });
          return;
        }
        nkPendingTargetRef.current = null;
        nkLandOn(pending);
      }, [nkPathId, nkOpen]);
      function nkFocusEvidenceClaim() {
        if (typeof document === 'undefined') return;
        var target = document.getElementById('nk-evidence-claim');
        if (!target) return;
        try { target.focus({ preventScroll: true }); }
        catch (e) { try { target.focus(); } catch (e2) {} }
      }
      // Next is intentionally revealed only after feedback. Because that button
      // unmounts when the next unchecked claim appears, explicitly carry focus
      // into the newly rendered, named fieldset. Numbered claim navigation uses
      // the same handoff so every way of changing claims has one predictable
      // destination and one complete spoken description.
      React.useEffect(function () {
        if (!nkEvidencePendingFocusRef.current || typeof document === 'undefined') return;
        nkEvidencePendingFocusRef.current = false;
        nkFocusEvidenceClaim();
      }, [evidenceClaim.id]);
      // ── Scroll-spy ───────────────────────────────────────────────────────
      // Twenty-one sections and a very long page. Once the index folds
      // there is nothing telling a reader where in the document they are, and
      // "where am I" is the question a long page has to keep answering.
      //
      // Written imperatively on purpose. Routing the highlight through React
      // state would re-render all twenty-one sections on every boundary crossed.
      // In all-topics mode the observer still touches only the two buttons that
      // change. On a short question route, a section that remains current for
      // 900 ms is persisted once so ordinary scrolling can resume later too.
      React.useEffect(function () {
        if (typeof IntersectionObserver !== 'function' || typeof document === 'undefined') return;
        var root = document.querySelector('[data-nuclear-lab]');
        if (!root) return;
        var targets = root.querySelectorAll('[data-nk-sec]');
        if (!targets.length) return;
        var current = null;
        var visible = {};
        var dwellTimer = null;

        function updateLocation(id) {
          var section = NK_SECTIONS.filter(function (item) { return item.id === id; })[0];
          if (!section) return;
          var sequence = nkPath ? nkPath.steps : NK_SECTIONS.map(function (item) { return item.id; });
          var at = sequence.indexOf(id);
          if (at < 0) return;
          nkCurrentLocationRef.current = { pathKey: nkPathId || 'all', id: id };
          var summary = root.querySelector('[data-nk-current-summary]');
          if (!summary) return;
          var total = sequence.length;
          var position = at + 1;
          var label = summary.querySelector('[data-nk-current-label]');
          var meter = summary.querySelector('[data-nk-current-meter]');
          var count = summary.querySelector('[data-nk-current-count]');
          var locationText = nkPath
            ? 'Step ' + position + ' of ' + total + ' · ' + section.label
            : '§ ' + position + ' of ' + total + ' · ' + section.label;
          if (label) label.textContent = locationText;
          if (meter) {
            meter.max = nkPath ? nkActiveRouteProgress.total : total;
            meter.value = nkPath ? nkActiveRouteProgress.count : position;
            meter.setAttribute('aria-label', nkPath
              ? nkPath.q + ': ' + nkActiveRouteProgress.count + ' of ' + nkActiveRouteProgress.total + ' steps opened'
              : locationText);
          }
          if (count) count.textContent = nkPath
            ? ' · ' + nkActiveRouteProgress.count + '/' + nkActiveRouteProgress.total + ' opened'
            : ' · ' + position + '/' + total;
        }

        function paint(id, on) {
          if (on) updateLocation(id);
          var btn = root.querySelector('[data-nk-jump="' + id + '"]');
          if (!btn) return;                       // filtered out of the index
          if (on) {
            btn.setAttribute('aria-current', 'location');
          } else {
            btn.removeAttribute('aria-current');
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
          if (dwellTimer) {
            clearTimeout(dwellTimer);
            dwellTimer = null;
          }
          if (current) paint(current, false);
          current = best;
          if (current) paint(current, true);
          if (current && nkPathId) {
            var dwellId = current;
            dwellTimer = setTimeout(function () {
              nkRecordRouteStep(nkPathId, dwellId);
              dwellTimer = null;
            }, 900);
          }
        }, { rootMargin: '-25% 0px -60% 0px', threshold: 0 });

        for (var i = 0; i < targets.length; i++) io.observe(targets[i]);
        return function () {
          if (dwellTimer) clearTimeout(dwellTimer);
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
        var routeProgress = nkRouteProgressFor(nkPath);
        var sectionOf = function (sid) {
          return NK_SECTIONS.filter(function (x) { return x.id === sid; })[0];
        };
        var prev = at > 0 ? sectionOf(nkPath.steps[at - 1]) : null;
        var next = at < nkPath.steps.length - 1 ? sectionOf(nkPath.steps[at + 1]) : null;
        var stepBtn = function (s, dir) {
          return h('button', {
            key: dir, type: 'button',
            onClick: function () { nkGoTo(s); },
            'aria-label': (dir === 'prev'
              ? t('stem.nuclearlab.aria_back_to_step', 'Back to step {step}: {label}').replace('{step}', String(at))
              : t('stem.nuclearlab.aria_on_to_step', 'On to step {step}: {label}').replace('{step}', String(at + 2))).replace('{label}', s.label),
            className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.92)',
              color: isDark ? '#e2e8f0' : '#334155',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
            }
          }, dir === 'prev' ? '← ' + s.label : s.label + ' →');
        };
        return h('nav', {
          key: 'routefoot',
          'aria-label': t('stem.nuclearlab.aria_route_footer_nav', '{question}, route progress, step {step} of {total}').replace('{question}', nkPath.q).replace('{step}', String(at + 1)).replace('{total}', String(nkPath.steps.length)),
          className: 'flex flex-wrap items-center gap-2 mt-3 pt-2',
          style: { borderTop: '1px dashed ' + accent + '66' }
        },
          h('span', {
            'data-nk-route-footer-count': id,
            'aria-hidden': 'true',
            className: 'text-[0.625rem] font-black',
            style: { color: ink(routeProgress.complete ? '#34d399' : accent) }
          }, routeProgress.count + '/' + routeProgress.total + ' opened'),
          h('progress', {
            value: routeProgress.count, max: nkPath.steps.length,
            'aria-label': t('stem.nuclearlab.aria_route_footer_progress', '{question}: {count} of {total} steps opened; currently at step {step}').replace('{question}', nkPath.q).replace('{count}', String(routeProgress.count)).replace('{total}', String(nkPath.steps.length)).replace('{step}', String(at + 1)),
            className: 'nk-route-progress flex-1 min-w-[7rem] h-2',
            style: { accentColor: accent }
          }),
          prev ? stepBtn(prev, 'prev') : null,
          next ? stepBtn(next, 'next')
            : h('span', {
                className: 'text-[0.6875rem] font-bold',
                style: { color: ink(routeProgress.complete ? '#34d399' : '#22d3ee') }
              }, routeProgress.complete
                ? '✓ Route complete'
                : (routeProgress.count < routeProgress.total
                  ? (activeEvidenceComplete
                    ? 'Open every route step to complete this route'
                    : 'Open every route step and finish the evidence challenge')
                  : 'Finish the evidence challenge to complete this route'))
        );
      }

      var nkDisplayToggle = function (on, label, aria, onClick, locked) {
        return h('button', {
          type: 'button', 'aria-pressed': on ? 'true' : 'false',
          'aria-label': label + (aria ? '. ' + aria : ''), onClick: onClick, disabled: !!locked,
          title: locked ? t('stem.nuclearlab.title_follows_os_preference', 'This setting follows your operating-system preference.') : undefined,
          className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold',
          style: Object.assign({}, on
            ? { background: '#22d3ee', color: '#0b1020', border: '1px solid #22d3ee' }
            : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.95)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') },
            locked ? { cursor: 'not-allowed', opacity: 0.78 } : null)
        }, label);
      };

      // Canvas summaries give the shape and the currently selected value. Some
      // readers need the numbers themselves, though: screen-reader users,
      // students who reason better from a table, and anyone checking the model.
      // Keep these tables opt-in so the default long page remains compact and
      // fast. The first column is a row header, not merely a styled data cell.
      function nkChartTable(id, caption, columns, makeRows, accent) {
        if (!nkShowChartData) return null;
        var rows = typeof makeRows === 'function' ? makeRows() : makeRows;
        var rule = isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.24)';
        return h('div', {
          key: 'chart-table-' + id,
          'data-nk-chart-table': id,
          role: 'region',
          tabIndex: 0,
          'aria-label': t('stem.nuclearlab.aria_chart_table_scroll', '{caption}. Scroll horizontally to read every column.').replace('{caption}', caption),
          className: 'nk-chart-table mt-2 rounded-lg border overflow-x-auto',
          style: {
            borderColor: accent + '70',
            background: isDark ? 'rgba(15,23,42,0.72)' : 'rgba(255,255,255,0.96)'
          }
        },
          h('table', { className: 'w-full text-left text-[0.6875rem]', style: { borderCollapse: 'collapse', minWidth: columns.length > 4 ? '42rem' : '30rem' } },
            h('caption', { className: 'px-2.5 py-2 text-left font-black', style: { color: ink(accent) } }, caption),
            h('thead', null,
              h('tr', null, columns.map(function (column, i) {
                return h('th', {
                  key: id + '-head-' + i, scope: 'col',
                  className: 'px-2.5 py-1.5 align-bottom',
                  style: { color: isDark ? '#e2e8f0' : '#334155', borderTop: '1px solid ' + rule, background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(241,245,249,0.95)' }
                }, column);
              }))
            ),
            h('tbody', null, rows.map(function (row, rowIndex) {
              return h('tr', { key: id + '-row-' + rowIndex }, row.map(function (cell, cellIndex) {
                var props = {
                  key: id + '-cell-' + rowIndex + '-' + cellIndex,
                  className: 'px-2.5 py-1.5 align-top',
                  style: { color: isDark ? '#e2e8f0' : '#334155', borderTop: '1px solid ' + rule }
                };
                if (cellIndex === 0) {
                  props.scope = 'row';
                  props.style.fontWeight = 700;
                  return h('th', props, cell);
                }
                return h('td', props, cell);
              }));
            }))
          )
        );
      }

      // Route navigation and reading order must tell the same story. Filtering
      // sections alone left them in the full lab's source order, so browse-mode
      // screen-reader navigation and ordinary scrolling could encounter step 2
      // before step 1. Reorder the actual keyed section elements; fall back to
      // source order if a future route accidentally names a missing section.
      function nkOrderSections() {
        var nodes = Array.prototype.slice.call(arguments).filter(Boolean);
        if (!nkPath) return nodes;
        var byId = {};
        nodes.forEach(function (node) {
          if (node && node.props) byId[node.props['data-nk-sec']] = node;
        });
        var ordered = nkPath.steps.map(function (id) { return byId[id]; }).filter(Boolean);
        return ordered.length === nkPath.steps.length ? ordered : nodes;
      }

      // Every section stays open, so the index is pure navigation — nothing here
      // marks a topic as engaged. The quest hooks still measure real interaction.
      var nkSummarySequence = nkPath ? nkPath.steps : NK_SECTIONS.map(function (item) { return item.id; });
      var nkSummaryPathKey = nkPathId || 'all';
      var nkSavedLocation = nkCurrentLocationRef.current;
      var nkSummaryId = nkSavedLocation
        && nkSavedLocation.pathKey === nkSummaryPathKey
        && nkSummarySequence.indexOf(nkSavedLocation.id) >= 0
          ? nkSavedLocation.id
          : nkSummarySequence[0];
      var nkSummaryAt = Math.max(0, nkSummarySequence.indexOf(nkSummaryId));
      var nkSummarySection = NK_SECTIONS.filter(function (item) { return item.id === nkSummaryId; })[0] || NK_SECTIONS[0];
      var nkSummaryPosition = nkSummaryAt + 1;
      var nkSummaryLabel = nkPath
        ? 'Step ' + nkSummaryPosition + ' of ' + nkSummarySequence.length + ' · ' + nkSummarySection.label
        : '§ ' + nkSummaryPosition + ' of ' + nkSummarySequence.length + ' · ' + nkSummarySection.label;
      var nkSummaryMeterValue = nkPath ? nkActiveRouteProgress.count : nkSummaryPosition;
      var nkSummaryMeterMax = nkPath ? nkActiveRouteProgress.total : nkSummarySequence.length;
      var nkSummaryMeterLabel = nkPath
        ? nkPath.q + ': ' + nkActiveRouteProgress.count + ' of ' + nkActiveRouteProgress.total + ' steps opened'
        : nkSummaryLabel;
      var nkSummaryCount = nkPath
        ? ' · ' + nkActiveRouteProgress.count + '/' + nkActiveRouteProgress.total + ' opened'
        : ' · ' + nkSummaryPosition + '/' + nkSummarySequence.length;

      var nkIndex = h('nav', {
        'aria-label': t('stem.nuclearlab.nuclear_lab_topics','Nuclear lab topics'),
        'data-nk-open': nkOpen ? 'true' : 'false',
        className: 'nk-topic-nav rounded-xl border px-2.5 py-2 mt-1',
        style: {
          position: 'sticky', top: 0, zIndex: 30,
          borderColor: 'rgba(167,139,250,0.4)',
          background: isDark ? 'rgba(15,23,42,0.97)' : 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(6px)',
          boxShadow: isDark
            ? '0 12px 30px -24px rgba(0,0,0,0.9)'
            : '0 12px 30px -24px rgba(15,23,42,0.5)'
        }
      },
        h('div', { className: 'nk-index-header flex flex-wrap items-center gap-2' },
          h('button', {
            type: 'button',
            'aria-expanded': nkOpen ? 'true' : 'false',
            // Only while the body exists. axe tolerates a dangling reference,
            // but aria-expanded already carries the state and pointing at an
            // id that is not in the document is not something to rely on.
            'aria-controls': nkOpen ? 'nk-index-body' : undefined,
            'aria-label': t('stem.nuclearlab.aria_routes_toggle', 'Routes & display. {action} {routes} question routes and the topic index, {topics} topics')
              .replace('{action}', nkOpen ? t('stem.nuclearlab.action_hide', 'Hide') : t('stem.nuclearlab.action_show', 'Show'))
              .replace('{routes}', String(NK_PATHS.length))
              .replace('{topics}', String(NK_SECTIONS.length))
              + (nkPath ? t('stem.nuclearlab.aria_routes_following', ', currently following the route "{route}"').replace('{route}', nkPath.q) : ''),
            onClick: function () { upd({ nkOpen: !nkOpen }); if (typeof beep === 'function') beep(); },
            className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-black',
            style: {
              background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(167,139,250,0.09)',
              color: isDark ? '#c4b5fd' : '#6d28d9',
              border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(167,139,250,0.35)')
            }
          }, '🧭 Routes & display ' + (nkOpen ? '▾' : '▸')),
          !nkOpen
            ? h('div', {
                'data-nk-current-summary': 'true',
                className: 'nk-mobile-route-summary nk-current-summary flex flex-1 min-w-0 items-center gap-2',
                style: { color: ink('#22d3ee') }
              },
                h('span', {
                  'data-nk-current-label': 'true',
                  className: 'nk-mobile-route-label min-w-0 text-[0.6875rem] font-bold'
                }, nkSummaryLabel),
                h('progress', {
                  'data-nk-current-meter': 'true',
                  value: nkSummaryMeterValue,
                  max: nkSummaryMeterMax,
                  'aria-label': nkSummaryMeterLabel,
                  className: 'nk-mobile-route-meter flex-shrink-0',
                  style: { width: '4rem', height: '0.375rem', accentColor: '#22d3ee' }
                }),
                h('span', {
                  'data-nk-current-count': 'true',
                  className: 'nk-mobile-route-count text-[0.625rem] font-black flex-shrink-0'
                }, nkSummaryCount)
              )
            : null,
          h('div', { className: 'nk-index-secondary' },
            h('label', { htmlFor: 'nk-topic-search', className: 'sr-only' }, 'Search topics'),
            h('input', {
              id: 'nk-topic-search', type: 'search', value: nkQueryRaw,
              placeholder: t('stem.nuclearlab.search_topics_placeholder', 'Search topics…'),
              'aria-label': t('stem.nuclearlab.aria_search_topics', 'Search the {count} topics by name or keyword').replace('{count}', String(NK_SECTIONS.length)),
              onChange: function (e) { upd({ nkQuery: e.target.value, nkPath: null }); },
              className: 'min-h-11 flex-1 min-w-[8rem] rounded-lg px-2 py-1 text-[0.6875rem]',
              style: {
                background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.95)',
                color: isDark ? '#e2e8f0' : '#1e293b',
                border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
              }
            }),
            h('span', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } },
              nkPath
                ? (nkActiveRouteProgress.complete
                  ? 'route complete'
                  : 'route: ' + nkActiveRouteProgress.count + ' of ' + nkActiveRouteProgress.total + ' opened')
                : (nkVisible.length === NK_SECTIONS.length ? 'showing all' : 'showing ' + nkVisible.length)),
            h('span', {
              ref: nkSearchStatusRef,
              role: 'status',
              'aria-live': 'polite',
              'aria-atomic': 'true',
              className: 'sr-only'
            }),
            h('div', { role: 'group', 'aria-label': t('stem.nuclearlab.reading_display_options','Reading display options'), className: 'flex flex-wrap gap-1' },
              nkDisplayToggle(nkLargeText, 'A+ Text', 'Use larger text throughout the nuclear lab', function () {
                upd({ nkLargeText: !nkLargeText });
                if (typeof announceToSR === 'function') announceToSR('Larger text ' + (!nkLargeText ? 'on.' : 'off.'));
              }),
              nkDisplayToggle(
                nkReduceMotion,
                nkSystemReducedMotion ? 'Motion: low · system' : (nkReduceMotion ? 'Motion: low' : 'Motion: standard'),
                nkSystemReducedMotion
                  ? 'Low motion is on because the operating system requests reduced motion'
                  : 'Reduce non-essential motion throughout the nuclear lab',
                function () {
                  upd({ nkReduceMotion: !nkUserReducedMotion });
                  if (typeof announceToSR === 'function') announceToSR('Low motion ' + (!nkUserReducedMotion ? 'on.' : 'off.'));
                },
                nkSystemReducedMotion || nkHostReducedMotion
              ),
              nkDisplayToggle(nkShowChartData, 'Chart data', 'Display numerical data tables beneath charts', function () {
                upd({ nkShowChartData: !nkShowChartData });
                if (typeof announceToSR === 'function') announceToSR('Chart data tables ' + (!nkShowChartData ? 'shown.' : 'hidden.'));
              })
            )
          )
        ),
        // Collapsible body. The header row above stays put so the index is
        // always one tap away; everything below folds once it has been used.
        // Belt as well as braces: even expanded, the sticky bar must not take
        // the screen. Bounded here rather than left to the sum of its rows.
        nkOpen ? h('div', {
          id: 'nk-index-body',
          role: 'region',
          tabIndex: 0,
          'aria-label': t('stem.nuclearlab.guided_routes_topic_categories_and_topic_lin','Guided routes, topic categories, and topic links'),
          style: { maxHeight: '42vh', overflowY: 'auto' }
        },
          h('div', { className: 'mt-1.5' },
            h('span', { className: 'block text-[0.625rem] font-black mb-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'START WITH A QUESTION'),
            h('div', { className: 'nk-route-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2' },
              NK_PATHS.map(function (route) {
                var on = nkPathId === route.id;
                var progress = nkRouteProgressFor(route);
                var resume = NK_SECTIONS.filter(function (x) { return x.id === progress.nextId; })[0];
                var savedRouteReflection = nkReflections[route.id]
                  && typeof nkReflections[route.id] === 'object'
                  && !Array.isArray(nkReflections[route.id])
                    ? nkReflections[route.id]
                    : {};
                var reflectionSaved = !!(savedRouteReflection.confidence
                  || savedRouteReflection.idea || savedRouteReflection.question);
                var routeAction = on
                  ? 'Leave this route'
                  : (progress.complete
                    ? 'Review this completed route'
                    : (progress.everComplete
                      ? 'Revisit this previously completed route'
                      : (progress.count ? 'Resume this route' : 'Follow this route')));
                var stateLabel = progress.complete
                  ? 'Complete'
                  : (progress.everComplete ? 'Completed before' : (progress.count ? 'Resume' : 'Start'));
                var detail = progress.complete
                  ? progress.total + ' steps opened'
                  : (progress.everComplete
                    ? progress.total + ' steps opened · revisit evidence'
                    : (progress.count
                      ? progress.count + '/' + progress.total + ' opened · next: ' + (resume ? resume.label : 'evidence')
                      : progress.total + ' guided steps'));
                if (reflectionSaved) detail += ' · Reflection saved';
                return h('button', {
                  key: route.id,
                  type: 'button',
                  'aria-pressed': on ? 'true' : 'false',
                  'data-nk-route-card': route.id,
                  'data-state': progress.complete ? 'complete' : (progress.everComplete ? 'review' : (progress.count ? 'started' : 'new')),
                  onClick: function () {
                    nkPendingTargetRef.current = on ? null : (resume || null);
                    // Taking a route clears the search and the category, because
                    // three filters fighting each other is worse than none.
                    upd({ nkPath: on ? null : route.id, nkQuery: '', nkGroup: 'all' });
                    if (!on) pushOnce('pathsTried', route.id);
                    if (typeof beep === 'function') beep();
                  },
                  className: 'nk-route-card min-h-20 rounded-xl border p-2.5 text-left transition-colors',
                  style: {
                    borderColor: on ? route.accent : (progress.complete ? '#34d399' : (progress.everComplete ? route.accent : (isDark ? 'rgba(148,163,184,0.34)' : 'rgba(100,116,139,0.28)'))),
                    background: on
                      ? (isDark ? route.accent + '20' : route.accent + '12')
                      : (progress.complete
                        ? (isDark ? 'rgba(6,78,59,0.25)' : 'rgba(236,253,245,0.98)')
                        : (progress.everComplete
                          ? (isDark ? route.accent + '14' : route.accent + '0d')
                          : (isDark ? 'rgba(30,41,59,0.82)' : 'rgba(255,255,255,0.98)')))
                  }
                },
                  h('span', { className: 'flex items-start gap-2' },
                    h('span', {
                      className: 'text-sm flex-shrink-0',
                      'aria-hidden': 'true'
                    }, route.icon),
                    h('span', {
                      className: 'flex-1 text-[0.6875rem] font-black leading-snug',
                      style: { color: on ? ink(route.accent) : (isDark ? '#f8fafc' : '#1e293b') }
                    }, route.q),
                    h('span', {
                      className: 'rounded-full border px-1.5 py-0.5 text-[0.625rem] font-black flex-shrink-0',
                      style: {
                        color: ink(progress.complete ? '#34d399' : ((on || progress.everComplete) ? route.accent : '#94a3b8')),
                        borderColor: progress.complete ? '#34d399' : ((on || progress.everComplete) ? route.accent : 'rgba(148,163,184,0.42)')
                      }
                    }, stateLabel)
                  ),
                  h('span', {
                    className: 'block mt-1 text-[0.625rem] leading-snug',
                    style: { color: isDark ? '#cbd5e1' : '#475569' }
                  }, detail),
                  h('progress', {
                    value: progress.count,
                    max: progress.total,
                    'aria-hidden': 'true',
                    className: 'block mt-1.5 w-full h-1.5',
                    style: { accentColor: progress.complete ? '#059669' : route.accent }
                  }),
                  h('span', { className: 'sr-only' }, '. ' + routeAction + '.')
                );
              })
            ),
            nkPath ? h(React.Fragment, null,
              h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                nkPath.why),
              h('div', {
                'data-nk-route-overview': nkPath.id,
                className: 'mt-1.5 flex flex-wrap items-center gap-2 rounded-lg border px-2.5 py-2',
                style: {
                  borderColor: nkActiveRouteProgress.complete ? 'rgba(52,211,153,0.65)' : 'rgba(34,211,238,0.45)',
                  background: isDark ? 'rgba(8,47,73,0.3)' : 'rgba(236,254,255,0.9)'
                }
              },
                h('span', { className: 'text-[0.6875rem] font-black', style: { color: ink(nkActiveRouteProgress.complete ? '#34d399' : '#22d3ee') } },
                  nkActiveRouteProgress.complete
                    ? '✓ Route complete'
                    : nkActiveRouteProgress.count + ' of ' + nkActiveRouteProgress.total + ' steps opened'),
                h('progress', {
                  value: nkActiveRouteProgress.count,
                  max: nkActiveRouteProgress.total,
                  'aria-label': t('stem.nuclearlab.aria_route_overview_progress', '{question}: {count} of {total} steps opened').replace('{question}', nkPath.q).replace('{count}', String(nkActiveRouteProgress.count)).replace('{total}', String(nkActiveRouteProgress.total))
                    + (nkActiveRouteProgress.complete ? t('stem.nuclearlab.aria_route_complete_suffix', ', route complete') : ''),
                  className: 'flex-1 min-w-[8rem] h-2',
                  style: { accentColor: nkActiveRouteProgress.complete ? '#059669' : '#0891b2' }
                }),
                nkActiveRouteNext
                  ? h('button', {
                      type: 'button',
                      onClick: function () { nkGoTo(nkActiveRouteNext); },
                      'aria-label': t('stem.nuclearlab.aria_continue_route', 'Continue: {next}. Continue {question} at step {step}')
                        .replace('{next}', nkActiveRouteNext.label)
                        .replace('{question}', nkPath.q)
                        .replace('{step}', String(nkPath.steps.indexOf(nkActiveRouteNext.id) + 1)),
                      className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
                      style: {
                        background: '#0e7490',
                        color: '#fff',
                        border: '1px solid #0e7490'
                      }
                    }, 'Continue: ' + nkActiveRouteNext.label + ' →')
                  : null
              )
            ) : null
          ),
          // These pills stay fully legible while a route is active. Dimming
          // them read as "disabled" when they are not — they are the way OFF a
          // route — and any opacity drops the contrast of the text inside by
          // the same factor, which is not something to do to a live control.
          nkPath ? h('span', { className: 'block text-[0.625rem] font-black mt-1.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'OR BROWSE BY CATEGORY') : null,
          h('div', { role: 'group', 'aria-label': t('stem.nuclearlab.browse_topics_by_category','Browse topics by category'), className: 'nk-group-filters flex flex-wrap gap-1 mt-1.5' },
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
          h('div', { className: 'nk-topic-jumps flex flex-wrap gap-1 mt-1.5' },
            nkVisible.length === 0
              ? h('span', { className: 'text-[0.6875rem]', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                  'No topic matches “' + nkQueryRaw + '”.')
              : nkVisible.map(function (s, i) {
                  var opened = !!(nkPath && nkActiveRouteProgress.seen.indexOf(s.id) !== -1);
                  var jumpLabel = nkPath
                    ? ((opened ? 'Seen: ' : '') + 'Step ' + (i + 1) + ' — ' + s.label + ' (§' + (NK_SECTIONS.indexOf(s) + 1) + ')')
                    : ((NK_SECTIONS.indexOf(s) + 1) + '. ' + s.label);
                  return h('button', {
                    key: s.id, type: 'button',
                    onClick: function () { nkGoTo(s); },
                    'aria-label': t('stem.nuclearlab.aria_jump_to_topic', '{label} Jump to this topic').replace('{label}', jumpLabel)
                      + (opened ? t('stem.nuclearlab.aria_already_opened_suffix', ', already opened') : ''),
                    // The scroll-spy below marks the section currently in view
                    // by writing to this element directly. It deliberately does
                    // not go through React: a state change here would re-render
                    // all twenty-one sections every time a boundary is crossed,
                    // which measured ~100 ms on a throttled CPU — a hitch on
                    // every scroll, to move a highlight.
                    'data-nk-jump': s.id,
                    'data-nk-opened': opened ? 'true' : 'false',
                    className: 'min-h-11 px-2.5 py-1.5 rounded-lg text-[0.6875rem] font-bold transition-colors',
                    style: {
                      background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(167,139,250,0.09)',
                      color: isDark ? '#e2e8f0' : '#334155',
                      border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.28)' : 'rgba(167,139,250,0.35)')
                    }
                  }, h(React.Fragment, null,
                    h('span', { 'aria-hidden': 'true' }, s.icon + ' '),
                    jumpLabel));
                })
          )
        ) : null
      );

      // The tool paints its OWN ground in dark mode (2026-08-23). It used to
      // inherit whatever surface the host put behind it — and the host renders
      // tools on a white content card even under the dark theme, so every
      // translucent rgba(15,23,42,…) panel composited to a muddy mid-gray and
      // 225 text elements measured below AA in dark. With an opaque root, all
      // inner layers composite over the dark they were designed for. Light mode
      // is unchanged (undefined = the host's white card, as before).
      return h('div', {
        'data-nuclear-lab': 'true',
        'data-nk-theme': isContrast ? 'contrast' : (isDark ? 'dark' : 'light'),
        'data-nk-large-text': nkLargeText ? 'true' : 'false',
        'data-nk-reduce-motion': nkReduceMotion ? 'true' : 'false',
        'data-nk-chart-data': nkShowChartData ? 'true' : 'false',
        ref: nkRootRef,
        className: 'nk-readable relative max-w-5xl mx-auto animate-in fade-in duration-200',
        style: { background: isContrast ? '#000000' : (isDark ? '#0f172a' : undefined), color: isContrast ? '#ffffff' : undefined, borderRadius: isDark ? 12 : undefined, colorScheme: isDark ? 'dark' : 'light', containerType: 'inline-size', '--nk-focus': isContrast ? '#ffff00' : (isDark ? '#fbbf24' : '#6d28d9') }
      },
        h('style', null,
          '.nk-readable button:focus-visible,.nk-readable input:focus-visible,.nk-readable textarea:focus-visible,.nk-readable select:focus-visible,.nk-readable a:focus-visible{outline:3px solid var(--nk-focus)!important;outline-offset:3px}' +
          '.nk-readable [data-nk-sec]:focus{outline:3px solid var(--nk-focus);outline-offset:3px}' +
          '.nk-readable .nk-evidence-claim:focus{outline:3px solid var(--nk-focus);outline-offset:3px}' +
          '.nk-readable .nk-chart-table:focus-visible{outline:3px solid var(--nk-focus);outline-offset:3px}' +
          '.nk-readable #nk-index-body:focus-visible{outline:3px solid var(--nk-focus);outline-offset:-3px}' +
          '.nk-readable #nk-index-body{scrollbar-gutter:stable}' +
          '.nk-readable .nk-skip-link{position:absolute;inset-inline-start:.5rem;top:.5rem;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;pointer-events:none;z-index:60;min-height:44px;padding:.5rem .75rem;border-radius:.5rem;background:#fbbf24;color:#0b1020;font-weight:800;border:2px solid #0b1020}' +
          '.nk-readable .nk-skip-link:focus{inset-inline-start:.5rem;width:auto;height:auto;overflow:visible;clip-path:none;white-space:normal;pointer-events:auto}' +
          '.nk-readable .text-\\[11px\\]{font-size:.8125rem!important;line-height:1.25rem!important}' +
          '.nk-readable .text-\\[10px\\]{font-size:.75rem!important;line-height:1.125rem!important}' +
          '.nk-readable .nk-section-heading{font-size:1.0625rem!important;line-height:1.55rem!important}' +
          '.nk-readable .nk-section-card>p.leading-relaxed{max-width:78ch}' +
          '.nk-readable[data-nk-large-text="true"] .text-\\[11px\\]{font-size:1rem!important;line-height:1.55rem!important}' +
          '.nk-readable[data-nk-large-text="true"] .text-\\[10px\\]{font-size:.875rem!important;line-height:1.35rem!important}' +
          '.nk-readable[data-nk-large-text="true"] .nk-section-heading{font-size:1.25rem!important;line-height:1.8rem!important}' +
          '.nk-readable .nk-stat-grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,9rem),1fr))}' +
          '.nk-readable .nk-route-card{box-shadow:0 10px 24px -22px rgba(15,23,42,.75);transition:transform .15s ease,background-color .15s ease,border-color .15s ease}' +
          '.nk-readable[data-nk-reduce-motion="false"] .nk-route-card:hover{transform:translateY(-1px)}' +
          '.nk-readable .nk-topic-jumps button{box-shadow:none;background:' + (isDark ? 'rgba(148,163,184,.07)' : 'rgba(248,250,252,.9)') + '!important;color:' + (isDark ? '#e2e8f0' : '#334155') + '!important;border-color:' + (isDark ? 'rgba(148,163,184,.24)' : 'rgba(100,116,139,.2)') + '!important}' +
          '.nk-readable .nk-topic-jumps button[data-nk-opened="true"]{background:' + (isDark ? 'rgba(6,78,59,.2)' : 'rgba(236,253,245,.96)') + '!important;color:' + (isDark ? '#a7f3d0' : '#047857') + '!important;border-color:#34d399!important}' +
          '.nk-readable .nk-topic-jumps button[aria-current="location"]{background:#22d3ee!important;color:#0b1020!important;border-color:#22d3ee!important}' +
          '.nk-readable .nk-index-secondary{display:contents}' +
          '.nk-readable .nk-topic-nav[data-nk-open="false"] .nk-index-secondary{display:none!important}' +
          '.nk-readable .nk-rx-tone{border:1px solid currentColor;background:rgba(148,163,184,.08)}' +
          '.nk-readable .nk-rx-metric[data-tone="neutral"],.nk-readable .nk-rx-objective[data-tone="neutral"]{border-color:' + (isDark ? 'rgba(148,163,184,.38)' : 'rgba(100,116,139,.34)') + '!important;background:' + (isDark ? 'rgba(148,163,184,.08)' : 'rgba(248,250,252,.98)') + '!important}' +
          '.nk-readable .nk-rx-metric[data-tone="neutral"] .nk-rx-value,.nk-readable .nk-rx-metric[data-tone="neutral"] .nk-rx-tone,.nk-readable .nk-rx-objective[data-tone="neutral"] #rx-objective-heading,.nk-readable .nk-rx-objective[data-tone="neutral"] #rx-objective-step,.nk-readable .nk-rx-objective[data-tone="neutral"] #rx-objective-detail,.nk-readable .nk-rx-objective[data-tone="neutral"] .nk-rx-tone{color:' + (isDark ? '#cbd5e1' : '#475569') + '!important}' +
          '.nk-readable .nk-rx-metric[data-tone="info"],.nk-readable .nk-rx-objective[data-tone="info"]{border-color:' + (isDark ? 'rgba(96,165,250,.62)' : 'rgba(37,99,235,.48)') + '!important;background:' + (isDark ? 'rgba(30,58,138,.22)' : 'rgba(239,246,255,.98)') + '!important}' +
          '.nk-readable .nk-rx-metric[data-tone="info"] .nk-rx-value,.nk-readable .nk-rx-metric[data-tone="info"] .nk-rx-tone,.nk-readable .nk-rx-objective[data-tone="info"] #rx-objective-heading,.nk-readable .nk-rx-objective[data-tone="info"] #rx-objective-step,.nk-readable .nk-rx-objective[data-tone="info"] #rx-objective-detail,.nk-readable .nk-rx-objective[data-tone="info"] .nk-rx-tone{color:' + (isDark ? '#bfdbfe' : '#1d4ed8') + '!important}' +
          '.nk-readable .nk-rx-objective[data-tone="info"] progress{accent-color:#2563eb!important}' +
          '.nk-readable .nk-rx-metric[data-tone="success"],.nk-readable .nk-rx-objective[data-tone="success"]{border-color:' + (isDark ? 'rgba(52,211,153,.65)' : 'rgba(5,150,105,.5)') + '!important;background:' + (isDark ? 'rgba(6,78,59,.28)' : 'rgba(236,253,245,.98)') + '!important}' +
          '.nk-readable .nk-rx-metric[data-tone="success"] .nk-rx-value,.nk-readable .nk-rx-metric[data-tone="success"] .nk-rx-tone,.nk-readable .nk-rx-objective[data-tone="success"] #rx-objective-heading,.nk-readable .nk-rx-objective[data-tone="success"] #rx-objective-step,.nk-readable .nk-rx-objective[data-tone="success"] #rx-objective-detail,.nk-readable .nk-rx-objective[data-tone="success"] .nk-rx-tone{color:' + (isDark ? '#6ee7b7' : '#047857') + '!important}' +
          '.nk-readable .nk-rx-objective[data-tone="success"] progress{accent-color:#059669!important}' +
          '.nk-readable .nk-rx-metric[data-tone="caution"],.nk-readable .nk-rx-objective[data-tone="caution"]{border-color:' + (isDark ? 'rgba(251,191,36,.7)' : 'rgba(217,119,6,.55)') + '!important;background:' + (isDark ? 'rgba(120,53,15,.28)' : 'rgba(255,251,235,.98)') + '!important}' +
          '.nk-readable .nk-rx-metric[data-tone="caution"] .nk-rx-value,.nk-readable .nk-rx-metric[data-tone="caution"] .nk-rx-tone,.nk-readable .nk-rx-objective[data-tone="caution"] #rx-objective-heading,.nk-readable .nk-rx-objective[data-tone="caution"] #rx-objective-step,.nk-readable .nk-rx-objective[data-tone="caution"] #rx-objective-detail,.nk-readable .nk-rx-objective[data-tone="caution"] .nk-rx-tone{color:' + (isDark ? '#fde68a' : '#92400e') + '!important}' +
          '.nk-readable .nk-rx-objective[data-tone="caution"] progress{accent-color:#d97706!important}' +
          '.nk-readable .nk-rx-metric[data-tone="danger"],.nk-readable .nk-rx-objective[data-tone="danger"]{border-color:' + (isDark ? 'rgba(248,113,113,.75)' : 'rgba(220,38,38,.58)') + '!important;background:' + (isDark ? 'rgba(127,29,29,.3)' : 'rgba(254,242,242,.98)') + '!important}' +
          '.nk-readable .nk-rx-metric[data-tone="danger"] .nk-rx-value,.nk-readable .nk-rx-metric[data-tone="danger"] .nk-rx-tone,.nk-readable .nk-rx-objective[data-tone="danger"] #rx-objective-heading,.nk-readable .nk-rx-objective[data-tone="danger"] #rx-objective-step,.nk-readable .nk-rx-objective[data-tone="danger"] #rx-objective-detail,.nk-readable .nk-rx-objective[data-tone="danger"] .nk-rx-tone{color:' + (isDark ? '#fecaca' : '#991b1b') + '!important}' +
          '.nk-readable .nk-rx-objective[data-tone="danger"] progress{accent-color:#dc2626!important}' +
          '@media (forced-colors:active){' +
          '.nk-readable{background:Canvas!important;color:CanvasText!important}' +
          '.nk-readable .nk-section-card,.nk-readable .nk-topic-nav,.nk-readable fieldset,.nk-readable aside,.nk-readable [data-nk-route-overview],.nk-readable .nk-exploration-progress{background:Canvas!important;background-image:none!important;color:CanvasText!important;border-color:CanvasText!important;box-shadow:none!important}' +
          '.nk-readable button,.nk-readable input,.nk-readable select,.nk-readable textarea{forced-color-adjust:auto;border-color:ButtonText!important;color:ButtonText!important}' +
          '.nk-readable button[aria-pressed="true"],.nk-readable button[aria-current],.nk-readable button[aria-expanded="true"],.nk-readable button[data-nk-opened="true"]{background:Highlight!important;color:HighlightText!important;border:3px double Highlight!important}' +
          '.nk-readable a{color:LinkText!important}' +
          '.nk-readable *:focus-visible,.nk-readable [data-nk-sec]:focus{outline:3px solid Highlight!important;outline-offset:3px!important}' +
          '.nk-readable progress{forced-color-adjust:auto;accent-color:Highlight!important}' +
          '}' +
          '.nk-readable[data-nk-theme="contrast"]{background:#000000!important;color:#ffffff!important}' +
          '.nk-readable[data-nk-theme="contrast"] *,.nk-readable[data-nk-theme="contrast"] *::before,.nk-readable[data-nk-theme="contrast"] *::after{animation:none!important;transition:none!important}' +
          '.nk-readable[data-nk-theme="contrast"] .nk-section-card,.nk-readable[data-nk-theme="contrast"] .nk-topic-nav{background:#000000!important;color:#ffffff!important;border-color:#fbbf24!important;box-shadow:none!important}' +
          '.nk-readable[data-nk-reduce-motion="true"]{animation:none!important}' +
          '.nk-readable[data-nk-reduce-motion="true"] *,.nk-readable[data-nk-reduce-motion="true"] *::before,.nk-readable[data-nk-reduce-motion="true"] *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}' +
          '@media (prefers-reduced-motion:reduce){.nk-readable{animation:none!important}.nk-readable *,.nk-readable *::before,.nk-readable *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}' +
          '@media (max-height:500px){.nk-readable nav[aria-label="Nuclear lab topics"]{position:static!important}}' +
          '@media (min-width:700px) and (max-height:768px){.nk-readable #nk-index-body{max-height:25vh!important}}' +
          '@media (max-width:1023px){.nk-readable .nk-rx-core-unavailable{height:150px!important}}' +
          '@media (max-width:699px){' +
          '.nk-readable .text-\\[11px\\]{font-size:.875rem!important;line-height:1.35rem!important}' +
          '.nk-readable .text-\\[10px\\]{font-size:.75rem!important;line-height:1.1rem!important}' +
          '.nk-readable canvas{min-height:220px}' +
          '.nk-readable .nk-chart-frame{height:220px!important}' +
          '.nk-readable .nk-chart-frame canvas{min-height:0!important;height:100%!important}' +
          '.nk-readable .nk-slider{display:grid!important;grid-template-columns:minmax(0,1fr) auto;column-gap:.75rem;row-gap:.1rem}' +
          '.nk-readable .nk-slider label{grid-column:1;grid-row:1;width:auto!important;min-width:0}' +
          '.nk-readable .nk-slider input{grid-column:1/-1;grid-row:2;width:100%;min-width:0}' +
          '.nk-readable .nk-slider output{grid-column:2;grid-row:1;width:auto!important;min-width:0}' +
          '.nk-readable .nk-route-progress{flex-basis:100%;order:2}' +
          '.nk-readable .nk-mobile-route-summary{min-width:0;overflow:hidden}' +
          '.nk-readable .nk-mobile-route-label{display:block;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
          '.nk-readable .nk-topic-nav[data-nk-open="true"] .nk-index-secondary{display:flex!important;flex:1 0 100%;flex-wrap:wrap;align-items:center;gap:.375rem}' +
          '.nk-readable .nk-topic-nav[data-nk-open="true"] .nk-index-secondary>input{flex:1 0 100%;min-height:44px}' +
          '.nk-readable .nk-topic-nav[data-nk-open="true"] #nk-index-body{max-height:18vh!important}' +
          '.nk-readable .nk-route-kicker-question{flex-basis:100%}' +
          '.nk-readable .nk-rx-telemetry{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
          '.nk-readable .nk-rx-metric[data-rx-metric="rx-live-state"]{grid-column:1/-1}' +
          '}' +
          '@container (max-width:639px){' +
          '.nk-readable .text-\\[11px\\]{font-size:.875rem!important;line-height:1.35rem!important}' +
          '.nk-readable .text-\\[10px\\]{font-size:.75rem!important;line-height:1.1rem!important}' +
          '.nk-readable canvas{min-height:220px}' +
          '.nk-readable .nk-chart-frame{height:220px!important}' +
          '.nk-readable .nk-chart-frame canvas{min-height:0!important;height:100%!important}' +
          '.nk-readable .nk-slider{display:grid!important;grid-template-columns:minmax(0,1fr) auto;column-gap:.75rem;row-gap:.1rem}' +
          '.nk-readable .nk-slider label{grid-column:1;grid-row:1;width:auto!important;min-width:0}' +
          '.nk-readable .nk-slider input{grid-column:1/-1;grid-row:2;width:100%;min-width:0}' +
          '.nk-readable .nk-slider output{grid-column:2;grid-row:1;width:auto!important;min-width:0}' +
          '.nk-readable .nk-route-progress{flex-basis:100%;order:2}' +
          '.nk-readable .nk-mobile-route-summary{min-width:0;overflow:hidden}' +
          '.nk-readable .nk-mobile-route-label{display:block;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
          '.nk-readable .nk-topic-nav[data-nk-open="true"] .nk-index-secondary{display:flex!important;flex:1 0 100%;flex-wrap:wrap;align-items:center;gap:.375rem}' +
          '.nk-readable .nk-topic-nav[data-nk-open="true"] .nk-index-secondary>input{flex:1 0 100%;min-height:44px}' +
          '.nk-readable .nk-topic-nav[data-nk-open="true"] #nk-index-body{max-height:18vh!important}' +
          '.nk-readable .nk-route-grid{grid-template-columns:minmax(0,1fr)!important}' +
          '.nk-readable .nk-hero-progress{width:100%;margin-left:0!important;justify-content:flex-start!important}' +
          '.nk-readable .nk-route-kicker-question{flex-basis:100%}' +
          '.nk-readable .nk-rx-telemetry{grid-template-columns:repeat(2,minmax(0,1fr))!important}' +
          '.nk-readable .nk-rx-metric[data-rx-metric="rx-live-state"]{grid-column:1/-1}' +
          '}'),

        d.nkView !== 'reactor' && nkVisible.length ? h('button', {
          type: 'button', className: 'nk-skip-link',
          onClick: function () { nkGoTo(nkVisible[0]); }
        }, 'Skip topic controls and start reading') : null,

        h('div', { className: 'relative overflow-hidden rounded-xl border mb-1 px-3 py-3 shadow-lg', style: { background: 'linear-gradient(115deg, #1a0f2e 0%, #2e1065 46%, #0b1a2e 100%)', borderColor: 'rgba(167,139,250,0.48)' } },
          h('div', { className: 'flex flex-wrap items-center gap-3' },
            !ctx.embedded && ArrowLeft ? h('button', {
              type: 'button',
              onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(null); },
              className: 'min-h-11 min-w-11 p-2 rounded-lg transition-colors',
              style: { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(226,232,240,0.18)' },
              'aria-label': t('stem.common.back_to_tools', 'Back to tools')
            }, h(ArrowLeft, { size: 18, className: 'text-slate-100' })) : null,
            h('svg', { width: 42, height: 42, viewBox: '0 0 64 64', className: 'shrink-0', 'aria-hidden': 'true', focusable: 'false' },
              h('rect', { x: 2, y: 2, width: 60, height: 60, rx: 14, fill: 'rgba(15,23,42,0.68)', stroke: 'rgba(167,139,250,0.55)', strokeWidth: 1.5 }),
              h('ellipse', { cx: 32, cy: 32, rx: 21, ry: 8.5, fill: 'none', stroke: '#c4b5fd', strokeWidth: 1.8, transform: 'rotate(-30 32 32)' }),
              h('ellipse', { cx: 32, cy: 32, rx: 21, ry: 8.5, fill: 'none', stroke: '#65e2ce', strokeWidth: 1.8, transform: 'rotate(30 32 32)' }),
              h('circle', { cx: 32, cy: 32, r: 5, fill: '#fbbf24', stroke: '#fef3c7', strokeWidth: 1.2 })
            ),
            h('div', null,
              h('h3', { className: 'text-lg font-black tracking-tight text-white' }, '☢️ Nuclear & Radiation Lab'),
              h('span', { className: 'text-xs', style: { color: 'rgba(196,181,253,0.9)' } }, 'What the numbers actually say — including where they are disputed')
            ),
            h('ul', {
              'aria-label': t('stem.nuclearlab.nuclear_lab_learning_progress','Nuclear lab learning progress'),
              className: 'nk-hero-progress ml-auto flex flex-wrap justify-end gap-1.5'
            },
              h('li', {
                className: 'rounded-full border px-2 py-1 text-[0.625rem] font-bold',
                style: { color: ink('#22d3ee'), borderColor: 'rgba(34,211,238,0.5)', background: 'rgba(8,145,178,0.18)' }
              }, NK_PATHS.length + ' guided questions'),
              h('li', {
                className: 'rounded-full border px-2 py-1 text-[0.625rem] font-bold',
                style: { color: ink('#34d399'), borderColor: 'rgba(52,211,153,0.5)', background: 'rgba(6,78,59,0.24)' }
              }, nkPathsCompleted.length + '/' + NK_PATHS.length + ' routes complete'),
              h('li', {
                className: 'rounded-full border px-2 py-1 text-[0.625rem] font-bold',
                style: { color: ink('#c084fc'), borderColor: 'rgba(192,132,252,0.5)', background: 'rgba(88,28,135,0.22)' }
              }, evidenceMastered.length + '/' + EVIDENCE_CLAIMS.length + ' evidence mastered')
            )
          )
        ),

        d.nkView === 'reactor' ? null : nkIndex,

        nkOrderSections(

        // ── 1. decay ──
        sec('halflife', '#a78bfa',
          heading(ink('#c4b5fd'), '⏳ 1. Half-life: stable under ordinary conditions'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'For a large sample, each half-life leaves half of what was there before — not half the original amount. Under ordinary laboratory and environmental conditions, temperature, pressure and chemistry do not measurably change most nuclear decay rates. Tiny exceptions exist for a few decay modes, especially electron capture, so “unchangeable” is an excellent practical rule rather than a universal law.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            ISOTOPES.map(function (x) {
              return pill(isoId === x.id, '#a78bfa', x.name, function () {
                upd({ isoId: x.id });
                pushOnce('isoTried', x.id);
                if (typeof beep === 'function') beep();
              }, 'Use ' + x.name + ', half-life ' + x.hlText, x.id,
                nkExploredIds('isoTried', ISOTOPES.map(function (item) { return item.id; })).indexOf(x.id) !== -1);
            })
          ),
          nkExplorationProgress('isoTried', ISOTOPES.map(function (item) { return item.id; }), 3, 'isotopes', '#a78bfa'),
          h('div', { 'data-allo-fs-stage': 'true', ref: function (node) { if (node && typeof window.__alloStemFsBind === 'function') window.__alloStemFsBind(node.querySelector('[data-allo-fs-btn]'), node); },
            className: 'nk-chart-frame rounded-lg overflow-hidden border mb-2', style: { position: 'relative', borderColor: 'rgba(167,139,250,0.35)', height: '180px' } },
            h('button', {
              type: 'button',
              'data-allo-fs-btn': 'true',
              'aria-pressed': 'false',
              'aria-label': t('stem.nuclearLab.enter_fullscreen', 'View the decay curve fullscreen'),
              'data-fs-out': t('stem.nuclearLab.enter_fullscreen', 'View the decay curve fullscreen'),
              'data-fs-in': t('stem.nuclearLab.exit_fullscreen', 'Exit fullscreen decay curve (Escape)'),
              style: { position: 'absolute', top: 8, right: 8, zIndex: 20, width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(15,23,42,0.88)', border: '1px solid rgba(167,139,250,0.55)', color: '#ede9fe', fontSize: 16, fontWeight: 700, cursor: 'pointer' }
            }, h('span', { 'aria-hidden': 'true' }, '⛶')),
            h('canvas', { ref: decayRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-decay-description',
              'aria-label': t('stem.nuclearlab.aria_decay_curve', 'Decay curve. After {halves} half-lives, {pct} percent of the {iso} remains. The curve halves at every step and never quite reaches zero.')
                .replace('{halves}', nkFmt(halves, 1))
                .replace('{pct}', nkFmt(remaining * 100, 1))
                .replace('{iso}', iso.name),
              style: { width: '100%', height: '100%', display: 'block' } })),
          slider('nk-halves', 'Half-lives', 0, 10, 0.25, halves,
            function (e) { upd({ halves: parseFloat(e.target.value) }); }, nkFmt(halves, 2)),
          h('div', { className: 'nk-stat-grid mt-2 grid gap-2' },
            stat('Still radioactive', nkFmt(remaining * 100, 2) + '%', ink('#a78bfa')),
            stat('Time passed', nkYears(elapsedYears), ink('#c4b5fd')),
            stat('Half-life', iso.hlText, ink('#fbbf24'))
          ),
          h('p', { id: 'nk-decay-description', className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            h('b', null, iso.name + ' (' + iso.decay + '): '), iso.use),
          nkChartTable(
            'decay',
            'Decay curve values for ' + iso.name + '. Selected point plus half-life landmarks.',
            ['Half-lives elapsed', 'Time elapsed', 'Nuclei remaining'],
            function () {
              var marks = [0, 1, 2, 3, 4, 5, 7, 10];
              var found = false;
              for (var mi = 0; mi < marks.length; mi++) {
                if (Math.abs(marks[mi] - halves) < 1e-9) found = true;
              }
              if (!found) marks.push(halves);
              marks.sort(function (a, b) { return a - b; });
              return marks.map(function (mark) {
                var selected = Math.abs(mark - halves) < 1e-9;
                var whole = Math.abs(mark - Math.round(mark)) < 1e-9;
                return [
                  (selected ? 'Selected: ' : '') + nkFmt(mark, whole ? 0 : 2),
                  nkYears(mark * iso.hl),
                  nkFmt(Math.pow(0.5, mark) * 100, mark >= 7 ? 3 : 2) + '%'
                ];
              });
            },
            '#a78bfa'
          ),
          ponder('halflife', '#a78bfa',
            halves >= 7
              ? 'After ' + nkFmt(halves, 0) + ' half-lives less than 1% is left — but never exactly zero. Why can this curve never actually reach the axis?'
              : 'Set the model to 7 half-lives. What fraction is left, and why is "ten half-lives and it is gone" only roughly true?',
            'Seven half-lives leaves 1/2⁷, about 0.8%; ten leaves 1/2¹⁰, about 0.1%. The curve never reaches the axis because halving something forever never gets you to nothing — that is arithmetic, not physics. Two things follow. First, "gone after ten half-lives" is a CONVENTION (near enough, below 0.1%), not a law, and whether 0.1% is negligible depends entirely on how much you started with: a tonne of caesium-137 after ten half-lives is still a kilogram of caesium-137. Second, the real world does eventually hit zero, because you have a finite number of atoms rather than a smooth curve — decay is a probability per nucleus per second, and once you are down to the last few, one of them decays at some definite moment and there are none left. The smooth exponential is an average over enormous numbers, and it stops being smooth exactly when the numbers get small. That is the same randomness you can watch directly in section 13.')
        ),

        // ── 2. carbon dating ──
        sec('dating', '#22d3ee',
          heading(ink('#22d3ee'), '🦴 2. Read a date out of the decay'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Living things take in carbon-14 while alive and stop at death. Measure how much is left and you can run the half-life backwards to a date.'),
          slider('nk-c14', 'C-14 remaining', 1, 100, 1, c14Frac,
            function (e) { upd({ c14Frac: parseFloat(e.target.value) }); setAgeShown(false); setShownGuess(null); }, c14Frac + '%'),
          h('div', { className: 'flex flex-wrap items-end gap-2 mt-2' },
            h('div', { className: 'flex-1 min-w-[150px]' },
              h('label', { htmlFor: 'nk-age-guess', className: 'block text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Your estimate (years)'),
              h('input', { id: 'nk-age-guess', type: 'number', value: ageGuess, placeholder: t('stem.nuclearlab.e_g_5730','e.g. 5730'),
                onChange: function (e) { setAgeGuess(e.target.value); },
                className: 'w-full min-h-11 px-3 py-2 rounded-lg text-[0.6875rem]',
                style: { border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.32)' : 'rgba(100,116,139,0.3)'), background: isDark ? 'rgba(15,23,42,0.8)' : '#fff', color: isDark ? '#e2e8f0' : '#0f172a' } })),
            h('button', { type: 'button', 'aria-label': t('stem.nuclearlab.aria_calculate_sample_age', '{action}. Calculate the age of the sample').replace('{action}', ageShown ? t('stem.nuclearlab.action_recalculate', 'Recalculate') : t('stem.nuclearlab.action_reveal', 'Reveal')),
              onClick: function () {
                setAgeShown(true);
                var g = parseFloat(ageGuess);
                setShownGuess(isNaN(g) ? null : g);
                var close = !isNaN(g) && (c14Age === 0 ? Math.abs(g) <= 50 : Math.abs(g - c14Age) / c14Age < 0.15);
                var patch = { datedOnce: true };
                // Guarded like the other two XP awards in this file. It was not:
                // pressing Recalculate with a good guess still in the box paid
                // out again every time, so the button was an XP tap.
                if (close && !nkSafeXpLedger(d._xpCredited).nuclear_dating && !xpAwardedRef.current.nuclear_dating && !d.datedClose) {
                  xpAwardedRef.current.nuclear_dating = true;
                  patch.datedClose = true;
                  patch._xpCredited = Object.assign(nkSafeXpLedger(d._xpCredited), { nuclear_dating: true });
                  nkCelebrate();
                  if (typeof awardXP === 'function') awardXP('nuclear_dating', 10, 'Dated a sample from its carbon-14');
                }
                upd(patch);
                if (typeof announceToSR === 'function') {
                  announceToSR('The sample is about ' + nkFmt(c14Age, 0) + ' years old.' +
                    (isNaN(g) ? '' : ' Your estimate was ' + nkFmt(Math.abs(g - c14Age), 0) + ' years ' + (g > c14Age ? 'high' : 'low') + '.'));
                }
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black text-white',
              style: { background: '#0e7490', border: '1px solid #0e7490' } }, ageShown ? 'Recalculate' : 'Reveal')
          ),
          ageShown ? h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(236,254,255,0.9)' } },
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'text-sm font-black', style: { color: ink('#0891b2') } }, 'About ' + nkFmt(c14Age, 0) + ' radiocarbon years old'),
            h('p', { className: 'text-[0.6875rem] mt-1 font-mono', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'age = 5730 × ln(100 / ' + c14Frac + ') / ln 2'),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'This is the idealised radiocarbon age from the measured fraction, not yet a calendar date. Real laboratories correct for contamination and reservoir effects, then use a calibration curve because atmospheric carbon-14 has varied over time.'),
            // Revealing the answer beside a guess and saying nothing about the
            // gap wastes the guess. The margin is the feedback.
            shownGuess != null ? (function () {
              var offBy = shownGuess - c14Age;
              if (c14Age === 0) {
                var isZeroClose = Math.abs(offBy) <= 50;
                var zeroCol = isZeroClose ? '#34d399' : '#fb923c';
                return h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: ink(zeroCol) } },
                  isZeroClose
                    ? '✓ Your estimate of ' + nkFmt(shownGuess, 0) + ' years matches a living (0-year) sample — that counts as dated.'
                    : 'You said ' + nkFmt(shownGuess, 0) + ', which is ' + nkFmt(Math.abs(offBy), 0) + ' years ' +
                      (offBy > 0 ? 'too old' : 'too young') + '. At 100% C-14 remaining, no decay has occurred yet (0 years).');
              }
              var pct = Math.abs(offBy) / c14Age * 100;
              var col = pct < 15 ? '#34d399' : (pct < 40 ? '#fbbf24' : '#fb923c');
              return h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: ink(col) } },
                pct < 15
                  ? '✓ Your estimate of ' + nkFmt(shownGuess, 0) + ' was within ' + nkFmt(pct, 0) + '% — that counts as dated.'
                  : 'You said ' + nkFmt(shownGuess, 0) + ', which is ' + nkFmt(Math.abs(offBy), 0) + ' years ' +
                    (offBy > 0 ? 'too old' : 'too young') + ' (' + nkFmt(pct, 0) + '% out). Halving what is left adds one half-life, not half the age — the clock is logarithmic.');
            })() : null,
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              c14Frac <= 2
                ? 'Below about 1–2% remaining the measurement gets unreliable, which is why radiocarbon runs out at roughly 50,000 years. Older samples need a different clock — uranium-238 for rocks, potassium-argon for volcanic ash.'
                : 'Real dating also corrects for the fact that atmospheric carbon-14 has varied over time. Calibration curves built from tree rings and corals handle that, which is why published dates say "cal BP".')
          ) : null
        ),


        // ── decay chain ──
        sec('chain', '#c084fc',
          heading(ink('#c084fc'), '⛓️ 3. The chain from uranium to lead — and why radon is in basements'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Most heavy nuclei do not reach stability in one step. Uranium-238 takes fourteen, alternating alpha and beta, and finishes as lead. One member of that chain is a gas, and that changes everything.'),
          h('div', { className: 'rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(192,132,252,0.35)', height: '230px' } },
            h('canvas', { ref: chainRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-chain-description',
              'aria-label': t('stem.nuclearlab.the_uranium_238_chain_plotted_on_the_chart_o','The uranium-238 chain plotted on the chart of nuclides, neutrons across and protons up. It starts at uranium-238 with 92 protons and 146 neutrons, top right, and walks down-left to lead-206 with 82 protons and 124 neutrons, bottom left. Each of the eight alpha steps moves two protons down and two neutrons left; each of the six beta steps moves one proton up and one neutron left, which is the zigzag. Radon-222, the only gas, sits in the middle at 86 protons and 136 neutrons.'),
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-chain-description', className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Every alpha step takes the same diagonal down-left; every beta step kicks back up-left at a shallower one. That sawtooth is not decoration — it is why the chain crosses the same elements more than once, and why uranium appears twice in the list below. Choose a row to light up its nucleus here.'),
          h('div', { role: 'list', 'aria-label': t('stem.nuclearlab.uranium_238_decay_chain_steps','Uranium-238 decay chain steps'), className: 'space-y-1 max-h-72 overflow-y-auto pr-1' },
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
                onClick: function () {
                  upd({ chainPick: on ? null : i });
                  if (!on) pushOnce('chainSeen', step.sym);
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors',
                style: on ? { background: col + '22', borderColor: col }
                  : { background: step.gas ? 'rgba(251,191,36,0.09)' : (isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)'),
                      borderColor: step.gas ? 'rgba(251,191,36,0.5)' : (isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)') }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[0.625rem] font-mono w-5 flex-shrink-0', style: { color: isDark ? '#94a3b8' : '#475569' } }, (i + 1)),
                  h('span', { className: 'text-[0.6875rem] font-black w-16 flex-shrink-0', style: { color: ink(col) } }, step.sym),
                  h('span', { className: 'text-[0.6875rem] font-mono flex-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, step.hl),
                  step.gas ? h('span', { className: 'text-[0.625rem] font-black px-1.5 py-0.5 rounded-full', style: { color: ink('#fbbf24'), border: '1px solid rgba(251,191,36,0.6)' } }, 'GAS') : null,
                  h('span', { className: 'text-[0.6875rem] font-bold', style: { color: ink(col) } }, step.kind === 'stable' ? '■' : (step.kind === 'alpha' ? 'α' : 'β'))),
                null),
                on ? h('div', { className: 'px-2.5 pb-1.5 text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, step.note) : null);
            })
          ),
          nkExplorationProgress('chainSeen', U238_CHAIN.map(function (item) { return item.sym; }), 4, 'chain steps', '#c084fc'),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#f59e0b') } }, 'Why the whole chain runs at uranium-238\'s pace'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Every step below the parent is far faster than it, so each daughter decays about as fast as it is made. The chain settles into secular equilibrium and the whole thing ticks along at the rate of the slowest step — 4.47 billion years. That is why radon keeps appearing in a basement year after year and never runs out: it is being made continuously from uranium in the ground beneath, and the supply lasts as long as the planet does.')
          ),
          ponder('chain', '#c084fc',
            'Radon has a half-life of under four days. Sealing a basement for a fortnight would clear what is already there. Why does that not fix the problem?',
            'Because the radon in your basement is not a stock, it is a flow. It is being MADE, continuously, by the radium-226 in the rock and soil underneath — and radium-226 has a half-life of 1,600 years, so on any human timescale the supply never runs down. Clear the room and you have simply made space for the next lot. This is the secular equilibrium above, seen from indoors: the chain delivers radon at whatever rate the uranium below dictates, and it will still be doing it long after the house is gone. That is why radon mitigation is never about sealing. It is about ventilation and sub-slab depressurisation — putting a pipe and a fan under the floor slab and taking the gas away before it gets in. Sealing a basement tight can make matters worse, because it cuts the air exchange that was diluting what arrives.')
        ),

        // ── enrichment ──
        sec('enrichment', '#fb923c',
          heading(ink('#fb923c'), '🔢 4. Enrichment: why reactor fuel is not a bomb'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Natural uranium is 99.3% U-238 and only 0.72% the fissile U-235. Separating them is the hardest industrial step in the whole business — and the reason a power reactor is not a weapon waiting to happen.'),
          h('div', { role: 'list', className: 'space-y-1' },
            ENRICH_LEVELS.map(function (lv, i) {
              var on = d.enrPick === i;
              var col = lv.pct >= 90 ? '#f87171' : (lv.pct >= 20 ? '#fb923c' : '#34d399');
              return h('div', { key: lv.name, role: 'listitem' }, h('button', {
                type: 'button',
                'aria-expanded': on ? 'true' : 'false',
                onClick: function () {
                  upd({ enrPick: on ? null : i });
                  if (!on) pushOnce('enrSeen', lv.name);
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors',
                style: on ? { background: col + '22', borderColor: col }
                  : { background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[0.6875rem] font-black w-14 flex-shrink-0', style: { color: ink(col) } }, lv.pct + '%'),
                  h('span', { className: 'text-[0.6875rem] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, lv.name)),
                h('span', { className: 'block h-1.5 rounded-full mt-1', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-1.5 rounded-full', style: { width: Math.max(1, lv.pct) + '%', background: col } })),
                null),
                on ? h('div', { className: 'px-2.5 pb-1.5 text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, lv.use) : null);
            })
          ),
          nkExplorationProgress('enrSeen', ENRICH_LEVELS.map(function (item) { return item.name; }), 3, 'enrichment levels', '#fb923c'),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(52,211,153,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,244,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#059669') } }, 'The answer to "could a reactor explode like a bomb?"'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'No, and not because of the safety systems. A weapon needs a fast chain reaction in material enriched above about 90%, held together for the microseconds it takes to run. Reactor fuel at 3–5% cannot sustain a fast chain reaction at ANY mass or shape: the U-238 that makes up the other 95% absorbs the fast neutrons before they find a U-235 nucleus. The fuel only works at all because a moderator slows the neutrons down first — and moderated neutrons are far too slow for the runaway a weapon needs. Chernobyl was a steam explosion that wrecked the building, not a nuclear detonation.')
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'This is also why enrichment is what arms-control regimes actually watch. The centrifuge cascade that takes uranium from 0.72% to 5% is most of the way, in separative work, to one that could reach 90% — so the equipment matters more than the material.')
        ),

        // ── 3. shielding ──
        sec('shielding', '#38bdf8',
          heading(ink('#38bdf8'), '🛡️ 5. What actually stops it'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            '"Radiation" is four different things that behave nothing alike. Pick one and try to stop it.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            RAD_TYPES.map(function (x) {
              return pill(radId === x.id, x.colour, x.symbol + ' ' + x.name, function () {
                upd({ radId: x.id });
                pushOnce('radTried', x.id);
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR(x.name + '. ' + x.what + ' Stopped by ' + x.stops);
              }, 'Study ' + x.name + ' radiation', x.id,
                nkExploredIds('radTried', RAD_TYPES.map(function (item) { return item.id; })).indexOf(x.id) !== -1);
            })
          ),
          nkExplorationProgress('radTried', RAD_TYPES.map(function (item) { return item.id; }), 4, 'radiation types', '#38bdf8'),
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
              if (shieldId === 'air') {
                verdict = 'Nothing to hit. Neutrons are uncharged, so they ignore electrons entirely and only interact when they meet a nucleus head on — and air has almost no nuclei in the way. Distance alone is a poor defence here, because that goes on being true for hundreds of metres.';
              } else if (neutronHydrogenous) {
                verdict = 'This is what a neutron shield is for. It takes only about ' + nkFmt(neutronCollisions, 0) +
                  ' collisions with hydrogen to bring a 2 MeV neutron down to thermal energy, because a neutron and a proton have almost the same mass — a head-on hit can take the whole of the neutron\'s energy, which no heavier nucleus can do. Once thermal, it is captured.' +
                  (shieldId === 'concrete'
                    ? ' Concrete is only about 1% hydrogen by weight, so it is doing this with far fewer targets than water — which is exactly why a biological shield is metres thick rather than centimetres.'
                    : ' Note what the removal figure above does NOT say: per centimetre, steel and lead strip fast neutrons out of the beam faster than water does. Water wins on the step after that one.');
              } else {
                verdict = 'Read this one carefully, because the number above is not the whole story and on its own it flatters ' + shield.name.toLowerCase() + '. ' +
                  'Heavy nuclei ARE good at knocking a fast neutron out of the fast group — that is the removal cross-section, and ' + shield.name.toLowerCase() +
                  '\'s is higher per centimetre than water\'s. What they cannot do is SLOW one down: it takes roughly ' + nkFmt(neutronCollisions, 0) +
                  ' collisions with ' + shield.modName + ' to reach thermal energy against about 18 with hydrogen, because a neutron bouncing off a nucleus ' +
                  shield.modA + ' times its mass barely loses any. So you are left with a flux of intermediate-energy neutrons that nothing has captured. Worse, below about 1 MeV the inelastic scattering this material relies on switches off altogether, and removal cross-sections are defined assuming hydrogen sits behind the shield anyway. A slab of ' + shield.name.toLowerCase() + ' on its own is not a neutron shield.';
              }
            } else {
              through = gammaThrough;
              verdict = gammaThrough < 1
                ? 'Down to under 1%, but never to zero. Gamma attenuates exponentially — every extra centimetre cuts it by the same FACTOR, so you can always halve it again and never quite eliminate it.'
                : (gammaThrough < 25
                  ? 'Substantially attenuated. The "half-value layer" for this material is ' + nkFmt(Math.LN2 / shield.mu, 2) + ' cm — every one of those halves the intensity again.'
                  : 'Most of it is still coming through. Gamma needs real thickness of a dense material.');
            }
            var pctClamped = nkClamp(through, 0, 100);
            var thruFrac = pctClamped / 100;
            var slabW5 = shieldId === 'air' ? 140 : Math.max(14, Math.min(150, 14 + (thick / 30) * 136));
            var slabX5 = 186;
            var slabEnd5 = slabX5 + slabW5;
            var shFill5 = shieldId === 'lead' ? ['#475569', '#1e293b']
              : shieldId === 'steel' ? ['#94a3b8', '#475569']
              : shieldId === 'concrete' ? ['#a8a29e', '#57534e']
              : shieldId === 'water' ? ['#38bdf8', '#0284c7']
              : shieldId === 'paper' ? ['#e2e8f0', '#cbd5e1']
              : ['#334155', '#1e293b'];
            var trackYs = [32, 55, 78];
            var trackCol = rad.colour;
            return h('div', { className: 'mt-2' },
              h('svg', {
                viewBox: '0 0 460 110',
                'aria-hidden': 'true',
                focusable: 'false',
                style: {
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  maxHeight: '112px',
                  marginBottom: '8px',
                  borderRadius: '10px',
                  background: isDark ? 'linear-gradient(90deg,#081122 0%,#0b172c 60%,#091325 100%)' : 'linear-gradient(90deg,#0f172a 0%,#16243d 60%,#0f172a 100%)',
                  border: '1px solid ' + (isDark ? 'rgba(56,189,248,0.28)' : 'rgba(15,23,42,0.22)')
                }
              },
                h('defs', null,
                  h('radialGradient', { id: 'nk-s5-src', cx: '50%', cy: '50%', r: '50%' },
                    h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.92 }),
                    h('stop', { offset: '45%', stopColor: trackCol, stopOpacity: 0.85 }),
                    h('stop', { offset: '100%', stopColor: trackCol, stopOpacity: 0 })),
                  h('linearGradient', { id: 'nk-s5-slab', x1: '0%', y1: '0%', x2: '100%', y2: '100%' },
                    h('stop', { offset: '0%', stopColor: shFill5[0], stopOpacity: shieldId === 'air' ? 0.16 : (shieldId === 'water' ? 0.52 : 0.92) }),
                    h('stop', { offset: '100%', stopColor: shFill5[1], stopOpacity: shieldId === 'air' ? 0.1 : (shieldId === 'water' ? 0.68 : 0.96) })),
                  h('linearGradient', { id: 'nk-s5-atten', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                    h('stop', { offset: '0%', stopColor: trackCol, stopOpacity: 0.54 }),
                    h('stop', { offset: '48%', stopColor: trackCol, stopOpacity: Math.max(0.02, 0.34 * Math.sqrt(thruFrac)) }),
                    h('stop', { offset: '100%', stopColor: trackCol, stopOpacity: Math.max(0.01, 0.44 * thruFrac) })),
                  h('radialGradient', { id: 'nk-s5-stop', cx: '50%', cy: '50%', r: '50%' },
                    h('stop', { offset: '0%', stopColor: '#fef9c3', stopOpacity: 0.95 }),
                    h('stop', { offset: '55%', stopColor: trackCol, stopOpacity: 0.45 }),
                    h('stop', { offset: '100%', stopColor: trackCol, stopOpacity: 0 }))),
                // Source housing + glowing radioisotope core
                h('circle', { cx: 42, cy: 55, r: 34, fill: 'url(#nk-s5-src)', opacity: 0.58 }),
                h('circle', { cx: 42, cy: 55, r: 19, fill: trackCol, stroke: '#f8fafc', strokeWidth: 1.6 }),
                h('text', { x: 42, y: 61, textAnchor: 'middle', fill: '#0b1120', fontSize: 17, fontWeight: 800, fontFamily: 'system-ui,sans-serif' }, rad.symbol),
                // Incoming ionizing tracks (alpha dense, beta zigzag, gamma wave, neutron ballistic)
                trackYs.map(function (ty, ti) {
                  var stopX = (radId === 'alpha' && through === 0) ? (shieldId === 'air' ? slabX5 + Math.min(slabW5 * 0.72, 46) : slabX5 + 3)
                    : (radId === 'beta' && through === 0) ? Math.min(slabEnd5 - 2, slabX5 + 12 + ti * 3)
                    : slabX5;
                  var inPath = radId === 'gamma'
                    ? 'M64 ' + ty + ' Q74 ' + (ty - 6) + ' 84 ' + ty + ' T104 ' + ty + ' T124 ' + ty + ' T144 ' + ty + ' T164 ' + ty + ' T184 ' + ty
                    : radId === 'beta'
                      ? 'M64 ' + ty + ' L96 ' + (ty + (ti - 1) * 4) + ' L128 ' + (ty - (ti - 1) * 3) + ' L160 ' + (ty + 2) + ' L' + stopX + ' ' + ty
                      : 'M64 ' + ty + ' H' + stopX;
                  return h('g', { key: 's5-in-' + ti },
                    h('path', { d: inPath, fill: 'none', stroke: trackCol, strokeWidth: radId === 'alpha' ? 8 : 5.5, opacity: 0.22, strokeLinecap: 'round' }),
                    h('path', { d: inPath, fill: 'none', stroke: trackCol, strokeWidth: radId === 'alpha' ? 3.4 : 2.2, strokeDasharray: radId === 'neutron' ? '8 5' : undefined, strokeLinecap: 'round' }),
                    (radId === 'alpha' || radId === 'beta') && through === 0
                      ? h('circle', { cx: stopX, cy: ty, r: radId === 'alpha' ? 9 : 6, fill: 'url(#nk-s5-stop)' })
                      : null);
                }),
                // Shielding slab with smooth exponential attenuation glow inside
                h('rect', { x: slabX5, y: 12, width: slabW5, height: 86, rx: 6, fill: 'url(#nk-s5-slab)', stroke: shieldId === 'air' ? 'rgba(148,163,184,0.45)' : 'rgba(186,230,253,0.6)', strokeWidth: 1.5, strokeDasharray: shieldId === 'air' ? '4 4' : undefined }),
                through > 0 ? h('rect', { x: slabX5 + 1.5, y: 20, width: Math.max(2, slabW5 - 3), height: 70, rx: 4, fill: 'url(#nk-s5-atten)' }) : null,
                // Neutron elastic hydrogen scatter nodes inside hydrogenous shield
                radId === 'neutron' && neutronHydrogenous && shieldId !== 'air' ? [0.22, 0.48, 0.74].map(function (f, ni) {
                  var nx = slabX5 + slabW5 * f, ny = trackYs[ni];
                  return h('g', { key: 'n-hit-' + ni },
                    h('circle', { cx: nx, cy: ny, r: 5, fill: '#38bdf8', opacity: 0.3 }),
                    h('circle', { cx: nx, cy: ny, r: 2.3, fill: '#e0f2fe' }));
                }) : null,
                // Exiting attenuated tracks toward scintillation detector
                thruFrac > 0.005 ? trackYs.map(function (ty, ti) {
                  var exPath = radId === 'gamma'
                    ? 'M' + slabEnd5 + ' ' + ty + ' Q' + (slabEnd5 + 10) + ' ' + (ty - 5) + ' ' + (slabEnd5 + 20) + ' ' + ty + ' T' + (slabEnd5 + 40) + ' ' + ty + ' L408 ' + ty
                    : 'M' + slabEnd5 + ' ' + ty + ' H408';
                  return h('g', { key: 's5-out-' + ti },
                    h('path', { d: exPath, fill: 'none', stroke: trackCol, strokeWidth: 3.5 + 4 * thruFrac, opacity: 0.08 + 0.24 * thruFrac, strokeLinecap: 'round' }),
                    h('path', { d: exPath, fill: 'none', stroke: trackCol, strokeWidth: 1.3 + 2.2 * thruFrac, opacity: 0.22 + 0.78 * thruFrac, strokeDasharray: radId === 'neutron' ? '7 5' : undefined, strokeLinecap: 'round' }));
                }) : null,
                // Scintillation detector with glow proportional to transmission
                h('rect', { x: 407, y: 15, width: 32, height: 80, rx: 8, fill: trackCol, opacity: 0.06 + 0.34 * thruFrac }),
                h('rect', { x: 413, y: 20, width: 20, height: 70, rx: 5, fill: thruFrac > 0.02 ? trackCol : '#1e293b', opacity: thruFrac > 0.02 ? (0.35 + 0.65 * thruFrac) : 0.9, stroke: '#bae6fd', strokeWidth: 1.5 }),
                h('text', { x: slabX5 + slabW5 / 2, y: 105, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10, fontWeight: 700, fontFamily: 'system-ui,sans-serif' }, shield.name + ' · ' + nkFmt(thick, 1) + ' cm')
              ),
              h('div', { className: 'h-4 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                h('div', { style: { height: '100%', width: pctClamped.toFixed(1) + '%', background: rad.colour, borderRadius: '999px', transition: 'width 160ms linear' } })),
              h('p', { className: 'text-[0.6875rem] font-black mt-1', style: { color: ink(rad.colour) } },
                nkFmt(through, through < 1 ? 3 : 1) + '% of the ' + rad.name.toLowerCase() + ' gets through ' + nkFmt(thick, 1) + ' cm of ' + shield.name.toLowerCase()),
              h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only' }, nkShieldSpeech),
              // Neutrons are the one case where a single "% through" bar is not
              // enough to be honest, because two different mechanisms have to
              // both succeed. Show them side by side so the comparison between
              // materials is visible rather than asserted in prose.
              radId === 'neutron' ? h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
                stat('Step 1 · fast neutrons removed per cm',
                  nkFmt(shield.sigR, 3) + ' cm⁻¹', neutronHydrogenous ? '#34d399' : '#fbbf24'),
                stat('Step 2 · collisions to slow one to thermal',
                  shield.sigR < 0.001 ? '—' : nkFmt(neutronCollisions, 0) + ' on ' + shield.modName,
                  neutronHydrogenous ? '#34d399' : '#f87171')
              ) : null,
              h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, verdict));
          })(),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: rad.colour + '60', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink(rad.colour) } }, rad.symbol + '  ' + rad.name),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, rad.what),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, h('b', null, 'Stopped by: '), rad.stops),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#fca5a5' : '#b91c1c' } }, h('b', null, 'Why it matters: '), rad.danger)),
          h('p', { className: 'text-[0.6875rem] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' } }, shield.note),
          // The consequence nobody mentions: capturing the neutron is not the
          // end of it. This is also why the four radiation types on this page
          // are not four independent problems.
          radId === 'neutron' ? h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(167,139,250,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(245,243,255,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#a78bfa') } }, 'And then the shield starts glowing'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'When hydrogen finally captures the thermalised neutron it becomes deuterium and emits a 2.2 MeV gamma — harder than anything caesium-137 produces. So a water shield solves the neutron problem by creating a gamma problem, which is why real shields are built in layers: something hydrogen-rich to slow the neutrons, boron to capture them without a penetrating photon, and then lead for the capture gammas that get made anyway. Neutron shielding is the clearest case in this section that the four kinds of radiation are one problem, not four.')
          ) : null
        ),

        // ── 4. chain reaction ──
        sec('criticality', '#34d399',
          heading(ink('#34d399'), '⚛️ 6. The chain reaction, and what holds it steady'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A uranium-235 nucleus absorbs a neutron, splits, and releases 2 or 3 more. k is how many of those go on to cause another fission. Everything about reactor control is holding k at exactly 1.'),
          h('p', { className: 'text-[0.6875rem] mb-1 font-bold', style: { color: ink(kState === 'critical' ? '#34d399' : (kState === 'supercritical' ? '#f87171' : '#fbbf24')) } },
            kState === 'critical'
              ? '✓ k = 1.000. That is the whole job — and notice it is one position out of a hundred.'
              : (kState === 'supercritical'
                ? 'Power is rising. Insert the rods until k reads exactly 1.000.'
                : 'The core is shut down. Withdraw the rods until k reads exactly 1.000.')),
          slider('nk-rods', 'Control rods in', 0, 100, 1, rods,
            function (e) {
              var v = parseFloat(e.target.value);
              var k = 1.30 - 0.006 * v;
              var state = k < 0.995 ? 'subcritical' : (k > 1.005 ? 'supercritical' : 'critical');
              upd({ rods: v, rodsMoved: true });
              // The slider is the only way to find k = 1, and its value alone
              // ("50%") does not tell a screen-reader user whether they have
              // arrived. Announce the state, and only when it CHANGES, so
              // dragging does not produce a stream of identical messages.
              if (state !== kState && typeof announceToSR === 'function') {
                announceToSR('k is ' + k.toFixed(3) + '. ' + state +
                  (state === 'critical' ? '. Every fission causes exactly one more.' : '.'));
              }
            }, rods + '%'),
          h('div', { className: 'nk-stat-grid mt-2 grid gap-2' },
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
          h('p', { className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Neutrons per generation, on a log scale. Twelve generations is under a thousandth of a second.'),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            kState === 'critical'
              ? '✅ Critical: k = 1. Every fission causes exactly one more, and power holds steady. This is the normal operating state of every reactor on earth — not a warning word, despite what films suggest.'
              : (kState === 'supercritical'
                ? 'Supercritical: k > 1. Power climbs generation after generation. Reactors do this deliberately and briefly when raising power, then settle back to k = 1. What makes it controllable is that about 0.65% of neutrons arrive SECONDS late, from decaying fission products — without those delayed neutrons no mechanical control could ever keep up.'
                : 'Subcritical: k < 1. The chain dies out. This is a shut-down reactor — though it still needs cooling, because decay heat continues for days. That is precisely what went wrong at Fukushima: the reactors shut down correctly and then could not be cooled.')),
          ponder('criticality', '#34d399',
            'A bomb needs k far above 1 with fast neutrons and over 90% enrichment. Reactor fuel is 3–5%. Why can a power reactor not explode like a weapon, whatever else goes wrong?',
            'It cannot, and not because of the safety systems — because of the fuel. A weapon needs a FAST chain reaction, run on unmoderated neutrons and held together for the microseconds it takes to complete. Reactor fuel at 3–5% cannot sustain a fast chain reaction at any mass or in any shape: the U-238 making up the other 95% absorbs fast neutrons before they can find a U-235 nucleus. The fuel only works at all because a moderator slows the neutrons down first, and moderated neutrons are far too slow for the runaway a weapon needs. There is also the delayed-neutron point from this section: reactor control is possible at all only because about 0.65% of neutrons arrive seconds late, and a weapon operates entirely above that margin where nothing arrives late enough to matter. Chernobyl was a steam explosion that destroyed the building, not a nuclear detonation. Section 4 has the enrichment ladder this rests on.')
        ),


        // ── binding energy: the one curve behind both ──
        sec('binding', '#38bdf8',
          heading(ink('#38bdf8'), '⛰️ 7. One curve explains fission AND fusion'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Binding energy per nucleon is how tightly each particle is held. The curve climbs steeply from hydrogen, peaks, then falls slowly — and HIGHER on this curve means more tightly bound. Move toward the peak from either side and the nuclei end up more tightly bound than they started, so the leftover energy comes out. Light nuclei get there by joining; heavy ones get there by splitting. One curve, two industries.'),
          h('div', { className: 'nk-chart-frame rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(56,189,248,0.35)', height: '190px' } },
            h('canvas', { ref: beRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-binding-description',
              'aria-label': t('stem.nuclearlab.binding_energy_per_nucleon_against_mass_numb','Binding energy per nucleon against mass number. It climbs steeply from hydrogen at zero, through helium-4 at 7.07, peaks at nickel-62 at 8.795 MeV, then falls slowly to uranium-238 at 7.57. Light nuclei release energy by fusing up the left slope; heavy nuclei release it by splitting down the right slope.'),
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-binding-description', className: 'text-[0.625rem] mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Mass number across, MeV per nucleon up. The marked peak is where nothing can release energy by changing at all.'),
          nkChartTable(
            'binding',
            'All plotted binding-energy values. Energy is in megaelectronvolts per nucleon.',
            ['Isotope', 'Mass number', 'Binding energy per nucleon'],
            function () {
              return BINDING.map(function (point) {
                return [point.sym, String(point.a), point.be.toFixed(3) + ' MeV'];
              });
            },
            '#38bdf8'
          ),

          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            REACTIONS.map(function (r) {
              var col = r.kind === 'fusion' ? '#f472b6' : (r.kind === 'fission' ? '#a78bfa' : '#94a3b8');
              return pill(bePick === r.id, col, r.name, function () {
                upd({ bePick: r.id });
                pushOnce('reactionsSeen', r.id);
                if (typeof beep === 'function') beep();
              }, 'Work out the energy from ' + r.name, r.id,
                nkExploredIds('reactionsSeen', REACTIONS.map(function (item) { return item.id; })).indexOf(r.id) !== -1);
            })
          ),
          nkExplorationProgress('reactionsSeen', REACTIONS.map(function (item) { return item.id; }), 3, 'reactions', '#38bdf8'),
          h('div', { className: 'rounded-lg border p-2.5', style: { borderColor: (beRxn.kind === 'fusion' ? '#f472b6' : beRxn.kind === 'fission' ? '#a78bfa' : '#94a3b8') + '70', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-mono mb-1.5', style: { color: isDark ? '#e2e8f0' : '#334155' } }, beRxn.eq),
            h('div', { className: 'nk-stat-grid grid gap-2' },
              stat('Energy released', nkFmt(beRxn.mev, beRxn.mev < 1 ? 6 : 1) + ' MeV', ink('#fbbf24')),
              stat('Per nucleon', nkFmt(beMevPerNucleon, beMevPerNucleon < 0.001 ? 7 : 2) + ' MeV', ink('#38bdf8')),
              stat('Mass converted', nkFmt(beMassPct, beMassPct < 0.001 ? 7 : 3) + '%', ink('#f472b6'))
            ),
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, beRxn.note),
            h('p', { className: 'text-[0.6875rem] mt-1.5 font-mono', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'E = Δm c², and 1 atomic mass unit = 931.494 MeV. The mass really is missing — weigh the products and they come out lighter than what went in.')
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'Fusion of deuterium and tritium releases about 3.5 MeV per nucleon; fission of uranium-235 about 0.85. Fusion wins per nucleon by roughly four to one — which is why it is worth the hundred-million-degree problem.'),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#f59e0b') } }, 'A detail almost every textbook gets slightly wrong'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'The peak is usually given as iron-56. The actual maximum is nickel-62 at ' + bePeak.be.toFixed(3) + ' MeV per nucleon, just above iron-58 and then iron-56 at 8.790. Iron-56 is the most ABUNDANT end point, because stellar burning makes nickel-56 which decays to it — that is a statement about supernovae, not about binding. Both facts are true; they are answers to different questions.')
          ),
          ponder('binding', '#38bdf8',
            'Nothing past the peak can release energy by fusing, and nothing before it by splitting. What does that mean for a star once its core is iron and nickel?',
            'It means the star has run out of anything it can burn. A massive star holds itself up against its own gravity with the pressure of the energy pouring out of its core, and it gets that energy by fusing its way up this curve — hydrogen to helium, then carbon, oxygen, silicon, each stage faster than the last. Reach iron and nickel and the curve turns over: fusing them COSTS energy rather than releasing it. So the furnace does not gradually fade, it stops, and with nothing holding it up the core collapses in about a second. The rebound and the flood of neutrinos that follow blow the rest of the star apart — a core-collapse supernova. And that closes a loop with section 3: everything heavier than iron, including the uranium in that decay chain, could not have been built by ordinary fusion, because building it costs energy. It was made in explosions like that one and in colliding neutron stars. The reason there is uranium in the ground under your house is that the peak of this curve is where stars die.')
        ),

        // ── personal dose ──
        // ── what a sievert actually is ──
        sec('weighting', '#e879f9',
          heading(ink('#e879f9'), '🎚️ 8. Gray and sievert: the same joule, weighted twice'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everything below this point is quoted in millisieverts, and a sievert is not a physical measurement. It is a physical measurement multiplied by two judgements about biology. Both multiplications are worth seeing, because alpha has little penetrating power through intact skin but is far more damaging when contamination reaches living tissue.'),

          slider('nk-absorbed', 'Energy absorbed', 0.1, 20, 0.1, absorbedMGy,
            function (e) { upd({ absorbedMGy: parseFloat(e.target.value) }); }, nkFmt(absorbedMGy, 1) + ' mGy'),
          h('p', { className: 'text-[0.625rem] mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'The gray is joules per kilogram of tissue, and nothing else. It does not know what kind of radiation delivered them or which organ received them. It is the one honestly physical quantity here.'),

          h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Delivered by'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            RAD_WEIGHTS.map(function (x) {
              return pill(wrId === x.id, x.colour, x.symbol + ' ' + x.name + '  ×' + x.wr, function () {
                upd({ wrId: x.id });
                pushOnce('wrTried', x.id);
                if (typeof beep === 'function') beep();
              }, x.name + ', radiation weighting factor ' + x.wr, x.id,
                nkExploredIds('wrTried', RAD_WEIGHTS.map(function (item) { return item.id; })).indexOf(x.id) !== -1);
            })
          ),
          nkExplorationProgress('wrTried', RAD_WEIGHTS.map(function (item) { return item.id; }), 3, 'radiation types', '#e879f9'),
          h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, wr.why),

          h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'To which tissue'),
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
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'ABSORBED DOSE'),
              h('p', { className: 'text-sm font-black', style: { color: isDark ? '#e2e8f0' : '#334155' } }, nkFmt(absorbedMGy, 1) + ' mGy'),
              h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'Pure physics: joules per kilogram.')),
            h('div', { className: 'rounded-lg border p-2', style: { borderColor: wr.colour + '80', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'EQUIVALENT DOSE'),
              h('p', { className: 'text-sm font-black', style: { color: ink(wr.colour) } }, nkFmt(equivalentMSv, 1) + ' mSv'),
              h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } }, '× w' + 'ᴿ' + ' = ' + wr.wr + ', for how concentrated the damage is.')),
            h('div', { className: 'rounded-lg border p-2', style: { borderColor: 'rgba(232,121,249,0.6)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(253,244,255,0.9)' } },
              h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'EFFECTIVE DOSE'),
              h('p', { className: 'text-sm font-black', style: { color: ink('#c026d3') } }, nkFmt(effectiveMSv, 2) + ' mSv'),
              h('p', { className: 'text-[0.625rem] mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } }, '× w' + 'ᵀ' + ' = ' + wtFactor.toFixed(2) + ', for how much that tissue contributes to whole-body risk.'))
          ),

          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            wr.wr === 1
              ? 'With gamma or beta the first multiplication does nothing — 1 mGy is 1 mSv, and this is why the two units get used interchangeably and then quietly confused. Switch to alpha and watch what the same joule becomes.'
              : 'The same ' + nkFmt(absorbedMGy, 1) + ' mGy — the same energy, the same joules per kilogram — is now ' + nkFmt(equivalentMSv, 1) + ' mSv, because ' + wr.name.toLowerCase() + ' spends it in a much shorter track. Nothing about the amount of energy changed. Only what it did on the way in.'),
          h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            wtId === 'whole'
              ? 'Irradiate the whole body and every tissue weight applies at once. They are defined to sum to exactly ' + wtSum.toFixed(2) + ', so effective dose and equivalent dose come out equal — the weights apportion risk, they never create or destroy it.'
              : 'Irradiating only the ' + (wt ? wt.name.toLowerCase() : '') + ' carries ' + (wtFactor * 100).toFixed(0) + '% of the whole-body detriment, so the effective dose is ' + (wtFactor * 100).toFixed(0) + '% of the equivalent dose. That is what makes a chest X-ray and a whole-body exposure comparable at all: effective dose is a common currency, deliberately constructed.'),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,146,60,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,247,237,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#ea580c') } }, 'What effective dose is NOT'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'ICRP says this plainly and it is routinely ignored: effective dose is a protection quantity for setting limits and comparing procedures across a population. It is not a measure of harm to a particular person. The weights are averaged over both sexes and all ages, so applying them to one patient — to say "your scan gave you this much risk" — uses the number for something it was never built to do. Every figure in this tool is an effective dose, and that caveat rides along with all of them.')
          ),
          h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Weighting factors from ICRP Publication 103 (2007), Tables 2 and 3. The neutron factor is shown as its ~1 MeV peak; the published value is a continuous function of energy from about 2.5 to 20.')
        ),

        // ── the clock that actually runs inside a person ──
        sec('biohalf', '#f472b6',
          heading(ink('#f472b6'), '🫀 9. Half-life inside a body is a different number'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every half-life so far has been PHYSICAL — how fast the nuclei fall apart, a rate that is effectively fixed under ordinary conditions. But a nuclide inside a person is also being excreted, and the two processes run at once. Decay and excretion are rates, so they add: 1/T' + 'ₑ' + ' = 1/T' + 'ₚ' + ' + 1/T' + 'ᵦ' + '. That makes the effective half-life shorter than EITHER of them — always. When the two are far apart the shorter one very nearly sets it on its own; when they are close, as they are for strontium and polonium below, neither number will do and only the formula gets you there.'),
          h('div', { className: 'flex flex-wrap gap-1 mb-2' },
            BIO_NUCLIDES.map(function (x) {
              return pill(bioId === x.id, x.colour, x.name, function () {
                upd({ bioId: x.id });
                pushOnce('bioSeen', x.id);
                if (typeof beep === 'function') beep();
              }, 'Compare the physical and biological half-life of ' + x.name, x.id,
                nkExploredIds('bioSeen', BIO_NUCLIDES.map(function (item) { return item.id; })).indexOf(x.id) !== -1);
            })
          ),
          nkExplorationProgress('bioSeen', BIO_NUCLIDES.map(function (item) { return item.id; }), 4, 'nuclides', '#f472b6'),
          h('div', { className: 'nk-stat-grid grid gap-2' },
            stat('Physical half-life', nkYears(bio.tp / 365.25), ink('#94a3b8')),
            stat('Biological half-life', nkYears(bio.tb / 365.25), ink('#38bdf8')),
            stat('Effective half-life', nkYears(bioEff / 365.25), ink(bio.colour))
          ),
          h('p', { className: 'text-[0.6875rem] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Where it goes: ' + bio.where + '.'),
          h('div', { className: 'nk-chart-frame rounded-lg overflow-hidden border mt-2', style: { borderColor: bio.colour + '59', height: '175px' } },
            h('canvas', { ref: bioRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-bio-description',
              'aria-label': t('stem.nuclearlab.aria_bio_curve', 'How much {name} is left in the body over time. Radioactive decay alone would leave {decayPct} percent after {span}, but with excretion as well only {effPct} percent remains. The effective half-life is {effHalf}.')
                .replace('{name}', bio.name)
                .replace('{decayPct}', nkFmt(Math.pow(0.5, bioSpanDays / bio.tp) * 100, 1))
                .replace('{span}', nkYears(bioSpanDays / 365.25))
                .replace('{effPct}', nkFmt(Math.pow(0.5, bioSpanDays / bioEff) * 100, 1))
                .replace('{effHalf}', nkYears(bioEff / 365.25)),
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-bio-description', className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Grey: decay alone. Colour: what is actually left, once the body is also getting rid of it.'),
          nkChartTable(
            'biohalf',
            'Body-burden values for ' + bio.name + ' across five effective half-lives.',
            ['Point', 'Time since intake', 'Decay alone', 'Decay plus excretion'],
            function () {
              var rows = [];
              for (var life = 0; life <= 5; life++) {
                var days = life * bioEff;
                rows.push([
                  life === 0 ? 'Intake' : life + ' effective half-' + (life === 1 ? 'life' : 'lives'),
                  nkYears(days / 365.25),
                  nkFmt(Math.pow(0.5, days / bio.tp) * 100, 1) + '%',
                  nkFmt(Math.pow(0.5, days / bioEff) * 100, 1) + '%'
                ]);
              }
              return rows;
            },
            bio.colour
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 font-bold', style: { color: ink(bio.colour) } },
            bioDriver === 'biology'
              ? 'Biology is running this one. The physical half-life is ' + nkFmt(bioRatio, bioRatio > 100 ? 0 : 1) + ' times the biological one, so decay barely enters the calculation and the effective half-life lands within ' + nkFmt(Math.max(bioGapPct, 0.1), 1) + '% of the biological figure alone.'
              : (bioDriver === 'physics'
                ? 'Physics is running this one. The body cannot clear it much faster than it decays, so decay sets the pace and the effective half-life comes out ' + nkFmt(bioGapPct, 0) + '% below the physical half-life.'
                : 'Neither clock is running this one. The two half-lives are within a factor of ' + nkFmt(bioRatio, 1) + ' of each other, so decay and excretion contribute comparably and the effective half-life falls ' + nkFmt(bioGapPct, 0) + '% below even the shorter of them. Quote either number on its own here and you are wrong — this is the case that makes the formula necessary rather than decorative.')),
          h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, bio.note),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(56,189,248,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,249,255,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#0284c7') } }, 'What potassium iodide tablets do, and what they do not'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'KI is one of the most misunderstood things in this entire subject. It is not an anti-radiation pill. It works on exactly one nuclide by exactly one mechanism: it saturates the thyroid with ordinary iodine so there is no room left to take up iodine-131. That is the whole of it. It does nothing about caesium, nothing about external gamma, nothing about any other part of a release — and taken without radioiodine present it is simply a drug with side effects, which is why authorities distribute it in advance and then tell people when to take it rather than leaving it to judgement.'),
            safetyNotice('ki')
          ),
          h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Biological half-lives from the ICRP 30 and ICRP 137 biokinetic models, rounded. Unlike physical half-lives, which are constants of nature, these vary substantially with age, diet, chemical form and the individual — caesium clears roughly twice as fast in a small child as in an adult. Treat them as the right order of magnitude, not as measurements of you.')
        ),

        sec('mydose', '#22d3ee',
          heading(ink('#22d3ee'), '🧮 10. Estimate your own annual dose'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everyone is exposed, all the time, mostly from the ground and from radon. Put your own numbers in and see where yours comes from.'),
          safetyNotice('dose'),
          slider('ds-alt', 'Home altitude', 0, 3000, 50, dsAlt,
            function (e) { upd({ dsAlt: parseFloat(e.target.value), doseEstimated: true }); }, nkFmt(dsAlt, 0) + ' m'),
          slider('ds-fly', 'Flying per year', 0, 200, 2, dsFlights,
            function (e) { upd({ dsFlights: parseFloat(e.target.value), doseEstimated: true }); }, nkFmt(dsFlights, 0) + ' hours'),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Radon at home'),
          h('div', { className: 'flex flex-wrap gap-1' },
            RADON_LEVELS.map(function (r) {
              return pill(dsRadon === r.id, '#f87171', r.name, function () {
                upd({ dsRadon: r.id, doseEstimated: true });
                if (typeof beep === 'function') beep();
              }, 'Set home radon to ' + r.name + ', ' + r.v + ' millisieverts a year');
            })
          ),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Scans this year'),
          h('div', { className: 'space-y-1' },
            SCAN_TYPES.map(function (sc) {
              var n = dsScans[sc.id] || 0;
              return h('div', { key: sc.id, className: 'flex items-center gap-2' },
                h('span', { className: 'text-[0.6875rem] flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, sc.name),
                h('span', { className: 'text-[0.6875rem] font-mono w-16 text-right', style: { color: isDark ? '#94a3b8' : '#475569' } }, sc.v + ' mSv'),
                h('button', { type: 'button', 'aria-label': t('stem.nuclearlab.aria_one_fewer_scan', 'One fewer {scan}').replace('{scan}', sc.name),
                  onClick: function () { var nx = Object.assign({}, dsScans); nx[sc.id] = Math.max(0, n - 1); upd({ dsScans: nx, doseEstimated: true }); },
                  className: 'min-h-11 w-11 rounded-lg text-[0.6875rem] font-black',
                  style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '−'),
                h('span', { className: 'text-[0.6875rem] font-black w-6 text-center', style: { color: ink('#22d3ee') } }, n),
                h('button', { type: 'button', 'aria-label': t('stem.nuclearlab.aria_one_more_scan', 'One more {scan}').replace('{scan}', sc.name),
                  onClick: function () { var nx = Object.assign({}, dsScans); nx[sc.id] = n + 1; upd({ dsScans: nx, doseEstimated: true }); },
                  className: 'min-h-11 w-11 rounded-lg text-[0.6875rem] font-black',
                  style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '+'));
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(236,254,255,0.9)' } },
            h('p', { className: 'text-sm font-black mb-1.5', style: { color: ink('#0891b2') } }, 'About ' + nkFmt(dsTotal, 2) + ' mSv this year'),
            h('p', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', className: 'sr-only' }, nkDoseSpeech),
            h('div', { role: 'list', className: 'space-y-1' },
              dsParts.filter(function (p) { return p.v > 0; }).sort(function (x, y) { return y.v - x.v; }).map(function (p) {
                return h('div', { key: p.name, role: 'listitem', 'aria-label': t('stem.nuclearlab.aria_dose_part_msv', '{name}, {value} millisieverts').replace('{name}', p.name).replace('{value}', p.v.toFixed(2)), className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[0.6875rem] w-32 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, p.name),
                  h('div', { className: 'flex-1 h-2.5 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                    h('div', { style: { height: '100%', width: Math.max(1, (p.v / Math.max(dsTotal, 0.01)) * 100) + '%', background: p.colour, borderRadius: '999px' } })),
                  h('span', { className: 'text-[0.6875rem] font-mono w-14 text-right', style: { color: ink(p.colour) } }, p.v.toFixed(2)));
              })
            ),
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              dsTotal > 6
                ? 'That is well above the 2.4 mSv world average — look at which bar is longest. If it is radon, that is the one worth acting on, and a test kit costs very little.'
                : (dsTotal > 3.5
                  ? 'Somewhat above the 2.4 mSv world average, which is unremarkable. Radon is usually the largest single term and the only one most people can change.'
                  : 'Close to or below the 2.4 mSv world average. Note how little of it is anything anyone chose.')),
            h('p', { className: 'text-[0.6875rem] mt-1.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'For scale, the occupational limit is 20 mSv a year and the lowest dose with a clearly measurable cancer link is around 100 mSv.')
          )
        ),

        // ── 5. dose ──
        sec('doseladder', '#fbbf24',
          heading(ink('#fbbf24'), '📏 11. How much is a lot? The dose ladder'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Doses span eight orders of magnitude, so this scale is logarithmic — each step along it is ten times the last. Choose any row.'),
          h('div', { role: 'list', className: 'space-y-1' },
            DOSES.map(function (dz, i) {
              var on = d.dosePick === i;
              var frac = nkLogFrac(dz.mSv, 0.0001, 16000);
              var col = dz.mSv >= 1000 ? '#f87171' : (dz.mSv >= 20 ? '#fb923c' : (dz.mSv >= 1 ? '#fbbf24' : '#34d399'));
              return h('div', { key: dz.name, role: 'listitem' }, h('button', {
                type: 'button',
                'aria-expanded': on ? 'true' : 'false',
                onClick: function () {
                  upd({ dosePick: on ? null : i });
                  if (!on) pushOnce('dosesSeen', dz.name);
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 w-full text-left rounded-lg px-2.5 py-1.5 border transition-colors',
                style: on ? { background: col + '22', borderColor: col }
                  : { background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[0.6875rem] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, dz.name),
                  h('span', { className: 'text-[0.6875rem] font-mono', style: { color: ink(col) } }, dz.mSv < 1 ? dz.mSv + ' mSv' : nkFmt(dz.mSv, 0) + ' mSv')),
                h('span', { className: 'block h-1.5 rounded-full mt-1', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                  h('span', { className: 'block h-1.5 rounded-full', style: { width: Math.max(1.5, frac * 100) + '%', background: col } })),
                null),
                on ? h('div', { className: 'px-2.5 pb-1.5 text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, dz.note) : null);
            })
          ),
          nkExplorationProgress('dosesSeen', DOSES.map(function (item) { return item.name; }), 5, 'dose examples', '#fbbf24'),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#f59e0b') } }, 'Where the science is genuinely unsettled'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'At and above about 100 mSv, excess cancer risk is measurable in survivor studies. Below that, epidemiological studies have limited statistical power because ordinary cancer is common and the possible addition is small. Regulators use the linear no-threshold model as a cautious protection assumption. Evidence at low dose remains uncertain rather than proving either zero risk or a measured effect; be wary of claims that treat either conclusion as settled.')
          )
        ),

        // ── low-dose risk: the argument behind every number above ──
        sec('lowdose', '#e879f9',
          heading(ink('#e879f9'), '📉 12. How risky is a small dose? Why one event gets two death tolls'),
          h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Everything above 100 mSv on the ladder is measured. Everything below it is modelled — and the model you pick is where the public argument actually lives. Two people can quote the same accident, use the same physics, make no arithmetic error, and differ by a factor of a hundred on the death toll. Here is how.'),

          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Pick an exposure'),
          h('div', { className: 'flex flex-wrap gap-1' },
            COLLECTIVE_CASES.map(function (c) {
              return pill(ldCase.id === c.id, c.colour, c.name, function () {
                upd({ ldCase: c.id });
                pushOnce('ldCasesTried', c.id);
                if (typeof beep === 'function') beep();
              }, 'Use the exposure: ' + c.name + ', ' + ldDose(c.mSv) + ' millisieverts each');
            })
          ),

          // The divergence, always visible. Selecting a model below explains one
          // row; this table is why the reader should care that there is a choice.
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(232,121,249,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(253,244,255,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#e879f9') } },
              ldBig(ldCase.people) + (ldCase.people === 1 ? ' person' : ' people') + ' × ' + ldDose(ldCase.mSv) + ' mSv = ' + nkFmt(ldPersonSv, 2) + ' person-sieverts'),
            h('p', { className: 'text-[0.6875rem] mb-1.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
              ldCase.people === 1
                ? 'One dose. Four ways to turn it into a personal risk.'
                : 'One collective dose. Four ways to turn it into a number of people.'),
            h('div', { role: 'list', className: 'space-y-1' },
              RISK_MODELS.map(function (m) {
                var n = nkProjected(m, ldCase.people, ldCase.mSv);
                var txt = m.coeff == null
                  ? 'no defensible number'
                  : (ldCase.people === 1 ? ldOneIn(n) : (n === 0 ? 'zero' : ldBig(n) + (n >= 2 ? ' deaths' : ' death')));
                return h('div', {
                  key: m.id, role: 'listitem',
                  'aria-label': m.name + ': ' + txt,
                  className: 'flex items-center gap-2 rounded-md px-1.5 py-1',
                  style: ldModel.id === m.id ? { background: m.colour + '1f' } : null
                },
                  h('span', { className: 'text-[0.6875rem] font-bold flex-1', style: { color: isDark ? '#e2e8f0' : '#334155' } }, m.short),
                  h('span', { className: 'text-[0.6875rem] font-mono font-black text-right', style: { color: ink(m.colour) } }, txt));
              })
            ),
            h('div', { className: 'mt-2 rounded-md border p-2', style: { borderColor: ldTier.colour + '88', background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.85)' } },
              h('p', { className: 'text-[0.6875rem] font-black', style: { color: ink(ldTier.colour) } }, 'Can you use this sum? ' + ldTier.label),
              h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, ldTier.what)),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, ldCase.note)
          ),

          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Now read one model properly'),
          h('div', { className: 'flex flex-wrap gap-1' },
            RISK_MODELS.map(function (m) {
              return pill(ldModel.id === m.id, m.colour, m.short, function () {
                upd({ ldModel: m.id });
                pushOnce('riskModelsTried', m.id);
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') {
                  var n = nkProjected(m, ldCase.people, ldCase.mSv);
                  announceToSR(m.name + '. ' + (m.coeff == null
                    ? 'This model produces no number.'
                    : (n === 0 ? 'This model projects zero for this exposure.'
                      : 'Projects ' + ldBig(n) + ' for this exposure.')));
                }
              }, 'Explain the ' + m.name + ' model');
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: ldModel.colour + '77', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.92)' } },
            h('p', { className: 'text-sm font-black', style: { color: ink(ldModel.colour) } }, ldModel.name),
            h('p', { className: 'text-[0.6875rem] font-mono mt-0.5', style: { color: isDark ? '#94a3b8' : '#475569' } },
              ldModel.coeff == null ? 'No agreed coefficient' : nkFmt(ldModel.coeff * 100, 1) + '% per sievert'
                + (ldModel.threshold ? ', and nothing at all below ' + ldModel.threshold + ' mSv' : '')),
            h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2' },
              [{ k: 'What it claims', v: ldModel.says, c: ldModel.colour },
               { k: 'Who uses it', v: ldModel.who, c: '#94a3b8' },
               { k: 'The case for it', v: ldModel.forIt, c: '#34d399' },
               { k: 'The case against it', v: ldModel.against, c: '#f87171' }
              ].map(function (x) {
                return h('div', { key: x.k },
                  h('p', { className: 'text-[0.625rem] font-black', style: { color: ink(x.c) } }, x.k.toUpperCase()),
                  h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, x.v));
              })
            )
          ),

          // The part that is usually left out: not "scientists disagree" but
          // the reason the disagreement cannot be settled by measuring harder.
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(236,254,255,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#0891b2') } }, 'So why not just go and measure it?'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed mb-1', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'People have tried, and the obstacle is not funding or will — it is arithmetic. About a quarter of everyone dies of cancer anyway, so to see a small addition you need an exposed group and a matched unexposed group big enough that the difference is not noise. Set the dose and read off how many people that takes.'),
            slider('ld-pow', 'Dose to detect', 0, 30, 1, ldPowIdx,
              function (e) { upd({ ldPow: parseFloat(e.target.value) }); },
              (ldPowMSv < 1 ? nkFmt(ldPowMSv, 2) : nkFmt(ldPowMSv, ldPowMSv < 10 ? 1 : 0)) + ' mSv'),
            h('div', { className: 'grid grid-cols-2 gap-2 mt-2' },
              stat('People needed in each group', ldBig(ldCohort), '#22d3ee'),
              stat('Both groups together', ldBig(ldCohort * 2), '#a78bfa')),
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Ten times smaller dose, a HUNDRED times the people: the excess enters the sizing squared, so the requirement grows as the inverse square of the dose. At 10 mSv — one CT scan — the answer is already larger than any radiation cohort ever assembled; at 1 mSv it exceeds the population of most countries. Published estimates agree: Brenner and colleagues put the 10 mSv study at roughly 5 million per group under slightly more favourable assumptions.'),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Slide it to 100 mSv and watch what the calculation says: about a hundred thousand people per group. The atomic-bomb survivor study follows roughly that many — and 100 mSv is exactly where this tool says the excess becomes measurable. That is not a coincidence, and it is the check on this arithmetic: the same formula that says the low-dose question is unanswerable correctly predicts where the answer we DO have came from.'),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'Two-proportion sample size at 5% significance and 80% power, against a 25% baseline lifetime cancer mortality, using the ICRP coefficient. It assumes something even a perfect study could not have: that every person\'s dose is known exactly and nothing else differs between the groups. The real requirement is larger.')
          ),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.6)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#f59e0b') } }, 'What this section is NOT saying'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Not that low-dose radiation is harmless: no threshold has ever been demonstrated, and the best evidence at low dose RATE — the pooled nuclear-worker cohorts — is consistent with a straight line rather than a floor. Not that the regulators are wrong either: assuming linearity when you cannot measure is the cautious choice, and caution is what a limit is for. What remains genuinely disputed among radiation biologists is the shape of the curve below about 100 mSv, and the honest answer to "how many will this kill" at those doses is that the arithmetic gives a number and the world may not. Be equally suspicious of anyone who quotes that number as a body count and of anyone who tells you it is zero.'),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'This is where the Chernobyl range in section 15 comes from. Apply the model to the most exposed few hundred thousand people and you get a projection of a few thousand; apply the same model to a whole continent receiving doses smaller than the difference between two towns\' background, and you get tens of thousands. Neither side fabricated anything. They chose a different population, and the model does not know it is being asked something it cannot answer.')
          ),
          safetyNotice('dose'),
          sourceNote(['icrp103', 'inworks', 'unscear'])
        ),

        // ── counting: where every number above actually comes from ──
        sec('detect', '#2dd4bf',
          heading(ink('#2dd4bf'), '🔬 13. Measure it yourself — and why one short count lies'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Every figure above came out of a detector, and a detector does not measure sieverts. It measures clicks — and radioactive decay is random, so the same source counted twice gives two different answers. Neither is wrong. Take some counts and watch it happen.'),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2' },
            [{ u: 'Becquerel (Bq)', w: 'What the SOURCE does', p: 'One decay per second, inside the source. It does not depend on you, your detector, or where you stand.', c: '#a78bfa' },
             { u: 'Counts per second', w: 'What the DETECTOR sees', p: 'Always far less. Most photons miss the window entirely, and the tube ignores most of the ones that arrive. Never quote a count rate without saying which instrument, at what distance.', c: '#2dd4bf' },
             { u: 'Millisievert (mSv)', w: 'What YOUR BODY absorbs', p: 'Energy deposited per kilogram of tissue, weighted for how much damage that kind of radiation does. Getting here from counts needs a calibrated instrument and the photon energy.', c: '#fbbf24' }
            ].map(function (x) {
              return h('div', { key: x.u, className: 'rounded-lg border p-2', style: { borderColor: x.c + '55', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
                h('p', { className: 'text-[0.6875rem] font-black', style: { color: ink(x.c) } }, x.u),
                h('p', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#94a3b8' : '#475569' } }, x.w),
                h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, x.p));
            })
          ),

          h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Put something in front of the tube'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            COUNT_SOURCES.map(function (s) {
              return pill(cdSrcId === s.id, '#2dd4bf', s.name, function () {
                cdReset({ cdSrc: s.id });
              }, 'Measure ' + s.name + '. ' + s.desc);
            })
          ),
          h('p', { className: 'text-[0.6875rem] mb-1 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            cdSrc.bq > 0 ? cdSrc.desc + ' — ' + nkFmt(cdSrc.bq, 0) + ' Bq, giving off about ' + nkFmt(cdSrc.gps, 0) + ' gammas a second in all directions.' : cdSrc.desc),

          slider('nk-cd-dist', 'Distance', 3, 60, 1, cdDist,
            function (e) { cdReset({ cdDist: parseFloat(e.target.value) }); }, nkFmt(cdDist, 0) + ' cm'),
          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Count for'),
          h('div', { className: 'flex flex-wrap gap-1' },
            COUNT_TIMES.map(function (tt) {
              return pill(cdTime === tt, '#2dd4bf', tt < 60 ? tt + ' s' : (tt / 60) + ' min', function () {
                cdReset({ cdTime: tt });
              }, 'Count for ' + tt + ' seconds');
            })
          ),
          h('div', { className: 'flex flex-wrap gap-2 mt-2' },
            h('button', {
              ref: countTakeButtonRef,
              type: 'button', onClick: cdTakeCount,
              'aria-label': t('stem.nuclearlab.aria_take_count', 'Take a count. Measure {source} for {seconds} seconds at {dist} centimetres, with a matching background count')
                .replace('{source}', cdSrc.name)
                .replace('{seconds}', String(cdTime))
                .replace('{dist}', String(cdDist)),
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
              style: { background: '#2dd4bf', color: '#0b1020', border: '1px solid #2dd4bf' }
            }, '⏱️ Take a count'),
            cdRuns.length ? h('button', {
              type: 'button', onClick: function () {
                if (countTakeButtonRef.current && countTakeButtonRef.current.focus) {
                  countTakeButtonRef.current.focus();
                }
                cdReset({});
              },
              'aria-label': t('stem.nuclearlab.aria_clear_counts', 'Clear the {count} counts taken so far').replace('{count}', String(cdRuns.length)),
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
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
            h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              cdSrcId === 'none'
                ? 'Two background counts, one subtracted from the other. The net should be zero and it is not — it lands either side of zero, and a NEGATIVE net is not an error. It is what "measurement noise" means, and it is the floor beneath every other reading you take here.'
                : (!cdDetected
                  ? 'You cannot claim a detection. The net is ' + nkFmt(cdLast.g - cdLast.b, 0) + ' counts, and against this much background the threshold for calling it real is about ' + nkFmt(cdCrit, 0) + '. Count for longer or move closer — background grows in proportion to time, but its NOISE only grows as the square root of time, so the signal wins if you wait.'
                  : (cdRel > 0.10
                    ? 'Detected — but loosely. ±' + nkFmt(cdRel * 100, 0) + '% on the net rate. You could honestly say the source is there; you could not honestly compare it with another reading this close. A four-times-longer count halves this.'
                    : 'Detected and pinned down: ±' + nkFmt(cdRel * 100, 1) + '%. This is a number you could put in a lab report and defend.'))),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'The whole of counting statistics is one rule: a count of N carries an uncertainty of √N. Your ' + nkFmt(cdLast.g, 0) + ' counts are ' + nkFmt(cdLast.g, 0) + ' ± ' + nkFmt(Math.sqrt(cdLast.g), 1) + ', which is ±' + nkFmt(100 / Math.sqrt(Math.max(cdLast.g, 1)), 1) + '% on their own. Precision is bought with time, and only ever at the square root of it.')
          ) : h('p', { className: 'text-[0.6875rem] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'No counts yet. Each press runs the detector twice: once with the source, once with it removed, for the same length of time. That second run is not optional — you cannot subtract a background you never measured.'),

          cdRuns.length > 1 ? (function () {
            var hi = Math.max(cdTrueNet * 2, Math.max.apply(null, cdNets) * 1.15, 1e-4);
            var lo = Math.min(0, Math.min.apply(null, cdNets) * 1.15);
            var span = hi - lo;
            var mn = Math.min.apply(null, cdNets), mx = Math.max.apply(null, cdNets);
            var mean = cdNets.reduce(function (a, b) { return a + b; }, 0) / cdNets.length;
            return h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(45,212,191,0.45)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,250,0.9)' } },
              h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#0d9488') } },
                'Your last ' + cdRuns.length + ' counts, all of the same unchanged source'),
              h('div', { className: 'relative h-8 rounded-lg', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.1)' } },
                h('div', { style: { position: 'absolute', left: nkClamp((cdTrueNet - lo) / span, 0, 1) * 100 + '%', top: 0, bottom: 0, width: '2px', background: '#fbbf24' } }),
                cdNets.map(function (v, i) {
                  return h('div', { key: i, style: { position: 'absolute', left: 'calc(' + nkClamp((v - lo) / span, 0, 1) * 100 + '% - 4px)', top: 'calc(50% - 4px)', width: '8px', height: '8px', borderRadius: '999px', background: '#2dd4bf', opacity: 0.45 + 0.55 * (i / Math.max(1, cdNets.length - 1)) } });
                })
              ),
              h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                'Ranged from ' + mn.toFixed(3) + ' to ' + mx.toFixed(3) + ' counts per second, averaging ' + mean.toFixed(3) + '. The gold line is the rate this source and geometry genuinely produce: ' + cdTrueNet.toFixed(3) + ' /s. Nothing about the source changed between runs. ' +
                (cdTime <= 10
                  ? 'At ' + cdTime + ' seconds a count, that scatter is enormous — this is exactly how a short measurement misleads someone into thinking a reading "went up".'
                  : 'At ' + (cdTime >= 60 ? (cdTime / 60) + ' minutes' : cdTime + ' seconds') + ' a count the dots have pulled in tight around the true value. That is the whole trade: time buys certainty.'))
            );
          })() : null,

          h('div', { className: 'nk-chart-frame rounded-lg overflow-hidden border mt-2', style: { borderColor: 'rgba(45,212,191,0.35)', height: '170px' } },
            h('canvas', { ref: countRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-count-description',
              'aria-label': t('stem.nuclearlab.aria_count_curve', 'Net count rate against distance for {source}. The curve follows the inverse square law: at {dist} centimetres the true rate is {rate} counts per second, and doubling the distance to {doubleDist} centimetres quarters it to {quarterRate}.')
                .replace('{source}', cdSrc.name)
                .replace('{dist}', nkFmt(cdDist, 0))
                .replace('{rate}', cdTrueNet.toFixed(3))
                .replace('{doubleDist}', nkFmt(cdDist * 2, 0))
                .replace('{quarterRate}', cdNetRateAt(cdDist * 2).toFixed(3))
                + (cdLast ? t('stem.nuclearlab.aria_count_curve_last', ' Your last measurement sits at {net}, off the curve by counting noise alone.').replace('{net}', cdNet.toFixed(3)) : ''),
              style: { width: '100%', height: '100%', display: 'block' } })),
          h('p', { id: 'nk-count-description', className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'The curve is the inverse square law, and it is not a property of radiation — it is a property of spheres. The same gammas spread over a surface four times larger when you step twice as far back. Doubling your distance does more than most shielding, costs nothing, and is why the first rule of a radiation area is stand further away.'),
          nkChartTable(
            'counter',
            'Inverse-square model and saved counter runs for ' + cdSrc.name + '.',
            ['Point', 'Distance', 'Count time', 'Source count', 'Background count', 'Net rate'],
            function () {
              var marks = [3, 5, 10, 20, 40, 60];
              var currentFound = false;
              for (var ci = 0; ci < marks.length; ci++) {
                if (Math.abs(marks[ci] - cdDist) < 1e-9) currentFound = true;
              }
              if (!currentFound) marks.push(cdDist);
              marks.sort(function (a, b) { return a - b; });
              var rows = marks.map(function (mark) {
                var selected = Math.abs(mark - cdDist) < 1e-9;
                return [
                  'Model at ' + nkFmt(mark, mark % 1 ? 1 : 0) + ' cm' + (selected ? ' (selected)' : ''),
                  nkFmt(mark, mark % 1 ? 1 : 0) + ' cm',
                  'not applicable',
                  'not applicable',
                  'not applicable',
                  cdNetRateAt(mark).toFixed(3) + ' counts/s (model)'
                ];
              });
              cdRuns.forEach(function (run, runIndex) {
                var runSrc = COUNT_SOURCES.filter(function (source) { return source.id === run.s; })[0] || cdSrc;
                var net = (run.g - run.b) / run.t;
                var sigma = Math.sqrt(run.g + run.b) / run.t;
                rows.push([
                  'Run ' + (runIndex + 1) + ': ' + runSrc.name,
                  nkFmt(run.d, run.d % 1 ? 1 : 0) + ' cm',
                  nkFmt(run.t, 0) + ' s',
                  nkFmt(run.g, 0),
                  nkFmt(run.b, 0),
                  net.toFixed(3) + ' ± ' + sigma.toFixed(3) + ' counts/s'
                ]);
              });
              return rows;
            },
            '#2dd4bf'
          ),
          cdDist < 6 ? h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: ink('#fb923c') } },
            '⚠️ Below about 6 cm the model is stretched. The tube window is no longer small compared with the distance, so the neat 1/d² stops holding and a real measurement would read lower than the curve promises.') : null,

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,146,60,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,247,237,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#ea580c') } }, 'The trap in every cheap counter'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Consumer Geiger counters show a number in µSv/h, which makes them look like dose meters. They are not. The tube counts clicks and the display multiplies by one fixed factor — almost always the one that is correct for caesium-137 at 662 keV. Point the same instrument at a lower-energy source and the reading can be out by a factor of several, in either direction. This is the single most common way a well-meaning measurement ends up wrong on the internet: the instrument is fine, the counting is fine, and the conversion was never valid for what was being measured.')
          ),
          h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'End-window GM tube, 6.16 cm² window, intrinsic efficiency 0.8–1.0% and background 25 counts/min — typical of school apparatus at sea level. Counts are drawn from a Poisson distribution, the real statistics of decay. Detection threshold is the Currie critical level for a paired background, 2.33√(2N_b), a 5% chance of crying wolf. Source activities: 37 kBq check sources, potassium at 31.7 Bq per gram of natural K, K-40 emitting its 1461 keV gamma in 10.6% of decays.')
        ),

        // ── the third lever ──
        sec('protect', '#38bdf8',
          heading(ink('#38bdf8'), '⏱️ 14. Time, distance, shielding — all three levers'),
          safetyNotice('medical'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Section 5 covered what stops radiation and section 13 covered distance. There is a third lever, it is free, and it is the one a radiation worker reaches for first: leave sooner. Dose is dose rate accumulated over time. A steady rate is simple multiplication; when a radionuclide is decaying, the rate must be integrated as it falls.'),

          h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'What are you standing near?'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            PROTECT_SOURCES.map(function (x) {
              return pill(ptSrcId === x.id, x.colour, x.name, function () {
                upd({ ptSrc: x.id });
                pushOnce('ptTried', x.id);
                if (typeof beep === 'function') beep();
              }, x.name + ', ' + x.nuclide + ', ' + x.gbq + ' gigabecquerels');
            })
          ),
          h('p', { className: 'text-[0.6875rem] mb-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            ptSrc.nuclide + ', ' + nkFmt(ptSrc.gbq, 1) + ' GBq — initially ' + nkFmt(ptGamma, 4) + ' mSv/h at 1 metre per GBq, worked out from its decay scheme. Physical half-life: ' + ptTimeLabel(ptSrc.halfLifeH) + '.'),

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

          h('div', { className: 'nk-chart-frame rounded-lg overflow-hidden border mt-2', style: { borderColor: 'rgba(56,189,248,0.35)', height: '175px' } },
            h('canvas', { ref: protectRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-protect-summary',
              'aria-label': t('stem.nuclearlab.aria_protect_curve', 'Initial dose rate against distance for {nuclide} at {gbq} gigabecquerels. Unshielded it is {rate1} millisieverts per hour at 1 metre and {rate5} at 5 metres. At your chosen {dist} metres behind {thick} centimetres of {shield} it is {rate} millisieverts per hour.')
                .replace('{nuclide}', ptSrc.nuclide)
                .replace('{gbq}', String(ptSrc.gbq))
                .replace('{rate1}', nkFmt(ptRateAt(1, 0), 3))
                .replace('{rate5}', nkFmt(ptRateAt(5, 0), 4))
                .replace('{dist}', nkFmt(ptDist, 1))
                .replace('{thick}', nkFmt(ptThick, 1))
                .replace('{shield}', ptShield.name.toLowerCase())
                .replace('{rate}', nkFmt(ptRate, 4)),
              style: { width: '100%', height: '100%', display: 'block' } })),

          h('div', { id: 'nk-protect-summary', className: 'grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2' },
            stat('Initial dose rate', nkFmt(ptRate, ptRate < 1 ? 4 : 2) + ' mSv/h', ink(ptSrc.colour)),
            stat('Shield cuts it to', ptThick > 0 ? nkFmt(ptAtten * 100, ptAtten < 0.01 ? 3 : 1) + '%' : 'no shield', ink('#94a3b8')),
            stat('Dose in first hour', nkFmt(ptFirstHourDose, ptFirstHourDose < 1 ? 4 : 2) + ' mSv', ink('#fbbf24'))
          ),
          nkChartTable(
            'protect',
            'Initial dose-rate values for ' + ptSrc.nuclide + ', unshielded and behind the selected shield.',
            ['Distance', 'Unshielded initial rate', 'With ' + nkFmt(ptThick, 1) + ' cm of ' + ptShield.name.toLowerCase()],
            function () {
              var marks = [0.3, 0.5, 1, 2, 5, 10];
              var found = false;
              for (var pi = 0; pi < marks.length; pi++) {
                if (Math.abs(marks[pi] - ptDist) < 1e-9) found = true;
              }
              if (!found) marks.push(ptDist);
              marks.sort(function (a, b) { return a - b; });
              function rateText(value) {
                return nkFmt(value, value < 0.001 ? 6 : (value < 0.1 ? 4 : (value < 1 ? 3 : 2))) + ' mSv/h';
              }
              return marks.map(function (mark) {
                var selected = Math.abs(mark - ptDist) < 1e-9;
                return [
                  nkFmt(mark, 1) + ' m' + (selected ? ' (selected)' : ''),
                  rateText(ptRateAt(mark, 0)),
                  rateText(ptRateAt(mark))
                ];
              });
            },
            '#38bdf8'
          ),

          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'How long until you reach…'),
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
              isFinite(ptStayH) ? ptTimeLabel(ptStayH) : 'Selected limit not reached'),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              isFinite(ptStayH)
                ? 'to accumulate ' + ptLimit.mSv + ' mSv at ' + nkFmt(ptDist, 1) + ' m'
                  + (ptThick > 0 ? ' behind ' + nkFmt(ptThick, 1) + ' cm of ' + ptShield.name.toLowerCase() : ', unshielded')
                  + ', after physical decay is included.'
                : 'The source is not harmless: it starts at ' + nkFmt(ptRate, ptRate < 1 ? 4 : 2) + ' mSv/h here. But all of its remaining physical activity would deliver about ' + nkFmt(ptMaxDose, ptMaxDose < 1 ? 3 : 1) + ' mSv at this fixed position, below the selected ' + ptLimit.mSv + ' mSv.'),
            (ptSrcId === 'tc99m' || ptSrcId === 'i131') ? h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Conservative simplification: this integrates physical decay only. A patient also clears the nuclide biologically, so a measured external dose rate normally falls faster. Follow the nuclear-medicine team’s written instructions, not this classroom estimate.') : null,
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              ptSrcId === 'tc99m'
                ? 'This is the number families are never given. Sitting an arm\'s length from someone who has just had a scan, all day, does not get near a year\'s background — and the isotope is largely gone by tomorrow anyway. The honest advice is ordinary caution for a day, not distance from the people who need you.'
                : (ptSrcId === 'i131'
                  ? 'Seven times the activity and a harder gamma, which is why this patient sleeps alone and keeps their distance from children for a few days. Not because the risk is dramatic, but because the cost of the precaution is a few days and the cost of skipping it is avoidable dose to someone who gets no benefit from it.'
                  : 'Sealed sources like this are safe because of the housing, not the isotope. Every serious accident with one has the same shape: the source came out of its shielding, or never went back in, and the person nearby had no way to know.')),
            h('p', { className: 'text-[0.6875rem] mt-1.5 font-bold', style: { color: ink('#fbbf24') } },
              '⏱️ With a steady source, halve your time and you halve your dose. A short-lived source changes while you wait, so this calculator integrates the falling rate.')
          ),

          h('div', { className: 'mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2' },
            [{ k: '⏱️ TIME', v: (isFinite(ptStayH) ? 'Half target at ' : 'Half lifetime dose by ') + ptTimeLabel(ptHalfDoseH),
               w: 'Time is the free lever. This value includes radioactive decay instead of assuming the initial rate lasts forever.', c: '#fbbf24' },
             { k: '📏 DISTANCE', v: 'Move to ' + nkFmt(ptHalfDist, 1) + ' m',
               w: 'In the point-source, open-air model, multiply distance by 1.41 and the initial dose rate halves. Nearby extended sources and scattered radiation depart from this rule.', c: '#34d399' },
             { k: '🧱 SHIELDING', v: isFinite(ptHvl) ? '+' + nkFmt(ptHvl, ptHvl < 1 ? 2 : 1) + ' cm of ' + ptShield.name.toLowerCase() : 'not with air',
               w: 'In this narrow-beam model, one half-value layer halves the initial rate again. Scattered photons make real thick shields perform less neatly.', c: '#60a5fa' }
            ].map(function (x) {
              return h('div', { key: x.k, className: 'rounded-lg border p-2', style: { borderColor: x.c + '60', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.9)' } },
                h('p', { className: 'text-[0.625rem] font-black', style: { color: ink(x.c) } }, x.k),
                h('p', { className: 'text-[0.6875rem] font-black mt-0.5', style: { color: isDark ? '#fff' : '#1e293b' } }, x.v),
                h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, x.w));
            })
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'For a source whose rate is effectively steady during a visit, the three halves multiply: 1/2 × 1/2 × 1/2 = 1/8 of the starting dose. The time card above uses decay-aware integration instead of forcing that shortcut onto short-lived medical isotopes.'),
          h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Initial dose rate is computed from each nuclide\'s decay scheme with NIST mass energy-absorption coefficients for air, and time-to-dose integrates its physical half-life. The results sit within 3% of published gamma constants. The shield still uses the 1 MeV coefficients from section 5 and narrow-beam attenuation with no buildup factor, so a real thick shield performs somewhat worse. Patient geometry and biological clearance are also simplified. Treat this as the right order of magnitude and the right shape, never as a stay-time instruction.')
        ),

        // ── 6. accidents ──
        sec('accidents', '#f87171',
          heading(ink('#f87171'), '📋 15. The three accidents, in the actual numbers'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'These are the events that shaped how the world thinks about nuclear power. The figures below come from UNSCEAR and the relevant national reports, and where the range is disputed the tool says so.'),
          h('div', { className: 'space-y-1' },
            INCIDENTS.map(function (inc) {
              var on = d.incPick === inc.id;
              return expandRow(inc.id, on, '#f87171', inc.name + ' (' + inc.year + ')', inc.place + ' · ' + inc.level,
                h('span', null,
                  para(h('b', null, 'What happened: ') ? inc.what : inc.what),
                  h('span', { className: 'block text-[0.6875rem] leading-relaxed mt-1.5', style: { color: isDark ? '#fca5a5' : '#b91c1c' } }, h('b', null, 'The toll: '), inc.toll),
                  h('span', { className: 'block text-[0.6875rem] leading-relaxed mt-1.5', style: { color: isDark ? '#86efac' : '#166534' } }, h('b', null, 'What changed: '), inc.changed)),
                function () {
                  upd({ incPick: on ? null : inc.id });
                  if (!on) pushOnce('incidentsRead', inc.id);
                  if (typeof beep === 'function') beep();
                },
                (on ? 'Hide' : 'Read') + ' the full account of ' + inc.name);
            })
          ),
          h('p', { className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'The evidence supports a narrower pattern: emergency responses can cause substantial non-radiological harm through evacuation, displacement, lost care and psychological distress. At Fukushima that harm is well documented; at Chernobyl its scale relative to projected radiation effects remains model-dependent. This is not an argument that radiation is harmless. It is why emergency planning has to weigh both kinds of harm.'),
          sourceNote(['unscear', 'reconstruction', 'mhlw'])
        ),

        // ── 7. reactors and SMRs ──
        // ── the decision the last section leaves you with ──
        sec('shelter', '#a3e635',
          heading(ink('#84cc16'), '🏠 16. Shelter or evacuate? Work the numbers'),
          safetyNotice('emergency'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Fukushima Prefecture records 2,350 disaster-related deaths through 2025, a broad legal category that includes illness after injury and the physical burden of evacuation life. No acute radiation deaths occurred, and UNSCEAR has documented no resident health effects directly attributable to radiation. Worker compensation decisions are a separate category and do not prove individual causation. These figures cannot be reduced to a simple evacuation-versus-radiation score; they show why emergency choices have costs on both sides.'),
          h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
            'In this deliberately limited dose model, sheltering combines two levers from section 14: a building is shielding, and staying put means less time in the open than driving through a plume. The arithmetic compares those dose paths only; medical vulnerability, changing plume direction and official measurements still govern a real decision.'),

          slider('sh-rate', 'Outdoor dose rate', 0.1, 30, 0.1, shRate,
            function (e) { upd({ shRate: parseFloat(e.target.value) }); }, nkFmt(shRate, 1) + ' mSv/h'),
          slider('sh-plume', 'Release lasts', 1, 72, 1, shPlume,
            function (e) { upd({ shPlume: parseFloat(e.target.value) }); }, nkFmt(shPlume, 0) + ' h'),
          slider('sh-evac', 'Hours to get clear', 0.5, 12, 0.5, shEvac,
            function (e) { upd({ shEvac: parseFloat(e.target.value), shelterUsed: true }); }, nkFmt(shEvac, 1) + ' h'),

          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Where would you be sheltering?'),
          h('div', { className: 'flex flex-wrap gap-1 mb-1' },
            SHELTER_PLACES.map(function (x) {
              return pill(shPlaceId === x.id, x.colour, x.name + '  ×' + x.drf, function () {
                upd({ shPlace: x.id });
                pushOnce('shSeen', x.id);
                if (typeof beep === 'function') beep();
              }, x.name + ', dose reduction factor ' + x.drf);
            })
          ),
          h('p', { className: 'text-[0.6875rem] mb-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, shPlace.note),
          h('p', { className: 'text-[0.625rem] mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Published range for this kind of building: ×' + shPlace.range + '. The tool uses ×' + shPlace.drf + '.'),

          h('div', { className: 'nk-chart-frame rounded-lg overflow-hidden border mb-2', style: { borderColor: 'rgba(163,230,53,0.35)', height: '180px' } },
            h('canvas', { ref: shelterRef, role: 'img',
              'data-a11y-static': 'true',
              'aria-describedby': 'nk-shelter-summary',
              'aria-label': t('stem.nuclearlab.aria_shelter_curve', 'Dose against how long it takes to get clear. Sheltering in a {place} through a {plume} hour release gives a flat {shelterDose} millisieverts. Evacuating gives {evacDose} millisieverts after {evacHours} hours in the open. The two are equal at {breakEven} hours: get clear faster than that and leaving costs less dose, slower and it costs more.')
                .replace('{place}', shPlace.name.toLowerCase())
                .replace('{plume}', nkFmt(shPlume, 0))
                .replace('{shelterDose}', nkFmt(shShelterDose, 1))
                .replace('{evacDose}', nkFmt(shEvacDose, 1))
                .replace('{evacHours}', nkFmt(shEvac, 1))
                .replace('{breakEven}', nkFmt(shBreakEven, 1)),
              style: { width: '100%', height: '100%', display: 'block' } })),

          h('div', { id: 'nk-shelter-summary', className: 'grid grid-cols-2 gap-2' },
            stat('Shelter here', nkFmt(shShelterDose, shShelterDose < 10 ? 1 : 0) + ' mSv', ink(shPlace.colour)),
            stat('Evacuate now', nkFmt(shEvacDose, shEvacDose < 10 ? 1 : 0) + ' mSv', ink('#f87171'))
          ),
          nkChartTable(
            'shelter',
            'Dose comparison for sheltering in ' + shPlace.name.toLowerCase() + ' during a ' + nkFmt(shPlume, 0) + '-hour release.',
            ['Hours to get clear', 'Dose if sheltering', 'Dose if evacuating'],
            function () {
              var marks = [0, 1, 2, 4, 6, 8, 10, 12];
              function addMark(value) {
                if (value < 0 || value > 12) return;
                for (var si = 0; si < marks.length; si++) {
                  if (Math.abs(marks[si] - value) < 1e-9) return;
                }
                marks.push(value);
              }
              addMark(shEvac);
              addMark(shBreakEven);
              marks.sort(function (a, b) { return a - b; });
              function doseText(value) {
                return nkFmt(value, value < 1 ? 3 : (value < 10 ? 2 : 1)) + ' mSv';
              }
              return marks.map(function (mark) {
                var notes = [];
                if (Math.abs(mark - shEvac) < 1e-9) notes.push('selected');
                if (Math.abs(mark - shBreakEven) < 1e-9) notes.push('break-even');
                return [
                  nkFmt(mark, mark % 1 ? 1 : 0) + ' h' + (notes.length ? ' (' + notes.join(', ') + ')' : ''),
                  doseText(shShelterDose),
                  doseText(shEvacDoseAt(mark))
                ];
              });
            },
            '#a3e635'
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(163,230,53,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(247,254,231,0.9)' } },
            h('p', { className: 'text-sm font-black mb-1', style: { color: ink('#65a30d') } },
              shSheltering
                ? 'On dose alone: stay where you are'
                : 'On dose alone: leaving costs less'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Break-even is ' + nkFmt(shBreakEven, 1) + ' hours in the open. '
              + (shSheltering
                ? 'You said it would take ' + nkFmt(shEvac, 1) + ' hours to get clear, which is longer than that, so the drive costs more dose than the walls save. This is the case people find counter-intuitive, and it is the ordinary one when a release is short and the roads are full.'
                : 'You said ' + nkFmt(shEvac, 1) + ' hours, which beats it, so leaving wins on dose. That is the ordinary case when a release goes on for days — no building shields you for a week.')),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Push the release out to several days and watch the answer flip: sheltering is a way of waiting out a plume, not a way of living somewhere contaminated. This classroom comparison cannot issue real guidance: officials may order sheltering or evacuation as measurements and travel conditions change.')
          ),
          sourceNote(['nrc', 'unscear', 'reconstruction', 'mhlw']),

          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Where does that land against the published thresholds?'),
          h('div', { role: 'list', className: 'space-y-1' },
            PAG_LEVELS.map(function (L) {
              var hit = Math.min(shShelterDose, shEvacDose) >= L.mSv;
              return h('div', { key: L.name, role: 'listitem', className: 'rounded-lg px-2.5 py-1.5 border',
                style: hit
                  ? { background: 'rgba(248,113,113,0.14)', borderColor: '#f87171' }
                  : { background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.9)', borderColor: isDark ? 'rgba(148,163,184,0.2)' : 'rgba(100,116,139,0.18)' } },
                h('p', { className: 'text-[0.6875rem] font-bold', style: { color: hit ? ink('#f87171') : (isDark ? '#e2e8f0' : '#334155') } },
                  (hit ? '⚠️ ' : '') + L.name + ' — ' + L.mSv + ' mSv, ' + L.window),
                h('p', { className: 'text-[0.6875rem] mt-0.5 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, L.what));
            })
          ),

          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(248,113,113,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(254,242,242,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#dc2626') } }, 'What this calculation leaves out, and it is the important part'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Everything above is dose, and radiation dose was not identified as the cause of deaths in Fukushima’s disaster-related-death total. Moving a hospital ward or a care home has risks that do not appear anywhere in this arithmetic: disrupted treatment, patients on ventilators, people with dementia moved somewhere unfamiliar, and prolonged displacement. Those stresses contributed to the official 2,350 total, but the legal category does not assign every case to one evacuation order. The lesson was not never evacuate; it was to decide per population rather than per map, because moving a frail patient can be more dangerous than moving a healthy adult.'),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'It also leaves out everything after the plume: contaminated ground, food and water controls, and whether people can return. A dose comparison over the first few days is one input to that decision, not the decision.')
          ),
          h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Shielding factors from FEMA and EPA emergency planning guidance for cloud and ground shine, quoted as the ranges they are given as. Thresholds from the US EPA PAG Manual (2017) and IAEA GSR Part 7. The model is deliberately the simplest one that can flip: constant outdoor rate, a single building factor, and no credit for driving away from the plume rather than along it — which in a real evacuation matters as much as the hours do.')
        ),

        sec('reactors', '#38bdf8',
          heading(ink('#38bdf8'), '🏭 17. Reactor designs, and where SMRs really stand'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
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
                  onClick: function () {
                    upd({ reactorPick: on ? null : r.id });
                    if (!on) pushOnce('reactorsSeen', r.id);
                    if (typeof beep === 'function') beep();
                  },
                  className: 'min-h-11 w-full text-left rounded-lg px-2.5 py-2'
                },
                  h('span', { className: 'flex items-center gap-2 flex-wrap' },
                    h('span', { className: 'text-[0.6875rem] font-bold flex-1', style: { color: isDark ? '#fff' : '#1e293b' } }, r.name),
                    h('span', { className: 'text-[0.625rem] font-black px-1.5 py-0.5 rounded-full', style: { color: badge, border: '1px solid ' + badge + '70' } }, r.status),
                    h('span', { className: 'text-[0.6875rem] font-bold', 'aria-hidden': 'true', style: { color: ink('#38bdf8') } }, on ? '▾' : '›')),
                  h('span', { className: 'block text-[0.6875rem] mt-0.5', style: { color: isDark ? '#cbd5e1' : '#475569' } }, r.share)),
                on ? h('div', { id: bodyId, className: 'px-2.5 pb-2 -mt-0.5' },
                  para(r.how),
                  h('p', { className: 'text-[0.6875rem] leading-relaxed mt-1.5', style: { color: isDark ? '#86efac' : '#166534' } }, h('b', null, 'Safety: '), r.safety),
                  h('p', { className: 'text-[0.6875rem] leading-relaxed mt-1.5', style: { color: isDark ? '#fbbf24' : '#b45309' } }, h('b', null, 'The catch: '), r.catch)
                ) : null);
            })
          ),
          h('div', { className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(251,191,36,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(255,251,235,0.9)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#f59e0b') } }, 'On small modular reactors specifically'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'The engineering case is real: a small core can be cooled by convection and gravity alone, so a station blackout stops being the scenario that keeps operators awake. Factory production should also beat pouring concrete on site, where Western projects have overrun badly. But as of now almost none are operating commercially — China\'s HTR-PM since 2023, and a Russian floating plant. NuScale had the first US design approval and its flagship project was cancelled in 2023 when projected power costs rose from about $58 to $89 per MWh. Factory economics need order volume that does not yet exist, and several designs need HALEU fuel with a supply chain still being built. The right posture is interested, not convinced.'),
            sourceNote(['nuscale', 'iter', 'nif'])
          )
        ),


        // ── 8. waste ──
        sec('waste', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', '🗄️ 18. The waste question, taken seriously'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
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
          heading(ink('#84cc16'), '⚖️ 19. Compared with the alternatives'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Risk only means something next to the risk of the thing you would do instead. Both charts are full life cycle, including mining, construction and accidents.'),

          // ── predict before the chart ──
          h('div', { className: 'rounded-lg border p-2.5 mb-2', style: { borderColor: 'rgba(163,230,53,0.5)', background: isDark ? 'rgba(15,23,42,0.5)' : 'rgba(247,254,231,0.85)' } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#65a30d') } }, 'First, commit to an answer'),
            h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              'Answer these before you look. A chart you already agree with teaches you nothing; the gap between what you expected and what the data says is the part worth having.'),
            CMP_PAIRS.map(function (pair) {
              var guess = cmpGuessFor(pair.id);
              var right = cmpCorrect(pair);
              return h('div', { key: pair.id, className: 'mb-2' },
                h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, pair.ask),
                h('div', { className: 'flex flex-wrap gap-1' },
                  [pair.a, pair.b].map(function (name) {
                    return pill(guess === name, '#84cc16', name, function () {
                      var map = Object.assign({}, cmpGuessRaw || {});
                      map[pair.id] = name;
                      upd({ cmpGuess: map });
                      if (typeof beep === 'function') beep();
                    }, name + ' has caused more deaths per terawatt hour', pair.id + '-' + name);
                  })
                ),
                // Feedback waits for the reveal so the second and third questions
                // are still genuine predictions rather than pattern-matching.
                (guess && cmpRevealed)
                  ? h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed font-bold', style: { color: ink(guess === right ? '#059669' : '#f59e0b') } },
                    guess === right
                      ? ('Right — ' + right + ', at ' + nkFmt(cmpValue(right), 2) + ' against ' + nkFmt(cmpValue(guess === pair.a ? pair.b : pair.a), 2) + ' deaths per TWh.')
                      : ('Actually ' + right + ', at ' + nkFmt(cmpValue(right), 2) + ' against ' + nkFmt(cmpValue(guess), 2) + ' deaths per TWh.'))
                  : null);
            }),
            h('button', {
              type: 'button',
              disabled: cmpAnswered.length < CMP_PAIRS.length,
              onClick: function () {
                upd({ cmpRevealed: true });
                if (typeof beep === 'function') beep();
                if (cmpRight.length === CMP_PAIRS.length) nkCelebrate();
              },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
              style: cmpAnswered.length < CMP_PAIRS.length
                ? { background: 'transparent', color: isDark ? '#94a3b8' : '#64748b', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)'), cursor: 'not-allowed' }
                : { background: '#84cc16', color: '#0b1020', border: '1px solid #84cc16' }
            }, cmpRevealed ? 'Answers shown below' : (cmpAnswered.length < CMP_PAIRS.length
              ? ('Answer all three to compare (' + cmpAnswered.length + ' of ' + CMP_PAIRS.length + ')')
              : 'Show me the data')),
            cmpRevealed
              ? h('p', { role: 'status', className: 'text-[0.6875rem] mt-2 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                cmpRight.length + ' of ' + CMP_PAIRS.length + ' predicted correctly. '
                + (cmpRight.length === CMP_PAIRS.length
                  ? 'You already had the ranking. The harder question is the one at the end of this section: why the ranking persuades so few people.'
                  : 'Whichever you missed is worth sitting with — being wrong here is the ordinary result, not a failure of attention.'))
              : null
          ),
          h('p', { className: 'text-[0.6875rem] font-bold mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Deaths per terawatt-hour of electricity'),
          // Bars stay hidden until the prediction is in. Showing them early
          // would answer the three questions above for free.
          !cmpRevealed
            ? h('p', { className: 'text-[0.6875rem] rounded-lg border border-dashed p-2.5 leading-relaxed', style: { borderColor: isDark ? 'rgba(148,163,184,0.4)' : 'rgba(100,116,139,0.35)', color: isDark ? '#94a3b8' : '#475569' } },
              'The chart appears once you have answered the three questions above.')
            : h('div', { role: 'list', className: 'space-y-1' },
              DEATHS_TWH.map(function (r) {
                var on = cmpSelId === r.name;
                // Each row is a button so the note written for it is reachable
                // by keyboard, not only by eye.
                return h('div', { key: r.name, role: 'listitem' },
                  h('button', {
                    type: 'button',
                    'aria-pressed': on ? 'true' : 'false',
                    'aria-label': t('stem.nuclearlab.aria_deaths_twh', '{name}, {value} deaths per terawatt hour. Show what is behind this number').replace('{name}', r.name).replace('{value}', String(r.v)),
                    onClick: function () {
                      upd({ cmpSel: on ? '' : r.name });
                      if (!on) pushOnce('cmpSeen', r.name);
                      if (typeof beep === 'function') beep();
                    },
                    className: 'w-full min-h-11 flex items-center gap-2 text-left px-1.5 py-1 rounded-lg',
                    style: { background: on ? r.colour + '22' : 'transparent', border: '1px solid ' + (on ? r.colour : 'transparent') }
                  },
                    h('span', { className: 'text-[0.6875rem] font-bold w-24 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.name),
                    h('span', { className: 'flex-1 h-3 rounded-full overflow-hidden block', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                      h('span', { className: 'block', style: { height: '100%', width: Math.max(1, nkLogFrac(r.v, 0.01, 25) * 100) + '%', background: r.colour, borderRadius: '999px' } })),
                    h('span', { className: 'text-[0.6875rem] font-mono w-12 text-right', style: { color: ink(r.colour) } }, r.v)),
                  on ? h('p', { className: 'text-[0.6875rem] px-1.5 pb-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.note) : null);
              })
            ),
          cmpRevealed
            ? nkExplorationProgress('cmpSeen', DEATHS_TWH.map(function (item) { return item.name; }), 4, 'sources', '#84cc16')
            : null,
          h('p', { className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Logarithmic scale. Markandya & Wilkinson (2007) and Sovacool et al. (2016), compiled by Our World in Data. Nuclear\'s figure includes Chernobyl and Fukushima.'),

          cmpRevealed ? h(React.Fragment, null,
            h('p', { className: 'text-[0.6875rem] font-bold mt-3 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Lifecycle CO₂, grams per kWh'),
            h('div', { role: 'list', className: 'space-y-1' },
              CO2_KWH.map(function (r) {
                return h('div', { key: r.name, role: 'listitem', 'aria-label': t('stem.nuclearlab.aria_co2_kwh', '{name}, {value} grams CO2 per kilowatt hour').replace('{name}', r.name).replace('{value}', String(r.v)), className: 'flex items-center gap-2' },
                  h('span', { className: 'text-[0.6875rem] font-bold w-24 flex-shrink-0', style: { color: isDark ? '#e2e8f0' : '#334155' } }, r.name),
                  h('div', { className: 'flex-1 h-3 rounded-full overflow-hidden', 'aria-hidden': 'true', style: { background: isDark ? 'rgba(148,163,184,0.15)' : 'rgba(100,116,139,0.12)' } },
                    h('div', { style: { height: '100%', width: Math.max(1, (r.v / 820) * 100) + '%', background: r.colour, borderRadius: '999px' } })),
                  h('span', { className: 'text-[0.6875rem] font-mono w-12 text-right', style: { color: ink(r.colour) } }, r.v));
              })
            ),
            h('p', { className: 'text-[0.625rem] mt-1', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'Linear scale. IPCC AR5 Annex III medians.'),
          ) : null,

          cmpRevealed ? h(React.Fragment, null,
            h('div', { className: 'mt-3 rounded-lg border p-2.5', style: { borderColor: 'rgba(163,230,53,0.5)', background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(247,254,231,0.9)' } },
              h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink('#65a30d') } }, 'What these charts do and do not settle'),
              h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
                'They show that on deaths and on carbon, nuclear sits with wind and solar rather than with fossil fuels — and that is not a close call. They do not settle the argument, because the real objections to nuclear are mostly not about these two numbers. They are about capital cost, build times that have run to a decade or more in the West, waste policy that no country except Finland has finished, and weapons proliferation. Anyone who tells you the deaths-per-TWh chart ends the debate is skipping the parts that are actually hard.')
            )
          ) : null,
          ponder('compare', '#84cc16',
            'Nuclear power provokes far more fear than several sources that harm more people per unit of energy. What does that tell you about how people weigh a rare, dramatic, involuntary risk against a constant, invisible, familiar one?',
            'That expected deaths are not the thing people are measuring. Risk-perception research — Slovic\'s work in Science in 1987 is the standard reference — finds judgements track a handful of other factors far more strongly: whether the harm is dreaded and catastrophic rather than dispersed, whether it is taken on voluntarily, how familiar it is, how much control you have over it, and whether it falls fairly. Coal scores low on every one. Its deaths arrive one at a time, over decades, from something people have lived beside all their lives. Nuclear scores high on all of them: rare, concentrated, invisible, imposed, and historically tied to weapons. The honest conclusion is NOT that the fear is irrational. Dread, involuntariness and unfairness are real things to weigh, and a society is entitled to decide it would rather carry a larger dispersed harm than a smaller concentrated one. What the research does show is which factors are doing the work — so an argument conducted purely in deaths per terawatt-hour will not move anybody, and neither will one that ignores the numbers.')        ),

        // ── reactor operation simulator ──
        sec('operate', '#34d399',
          heading(ink('#34d399'), '🎛️ 20. Operate a reactor'),
          h('p', { className: 'text-[0.6875rem] mb-2', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'A modern reactor, run properly. The two accident conditions are here as engineering case studies — the point is to watch the physics do it, not to score a disaster.'),

          h('div', { className: 'grid grid-cols-1 lg:grid-cols-2 gap-2' },
            h('div', { className: 'nk-rx-core-view relative rounded-xl overflow-hidden border' + ((rxViewerStatus === 'failed' || (!rxViewerStatus && RX_MISSING === 'host')) ? ' nk-rx-core-unavailable' : ''), style: { borderColor: 'rgba(52,211,153,0.4)', height: '260px', background: isDark ? '#0b1220' : '#dfe6ef' } },
              h('div', {
                ref: rxAttach,
                role: 'img',
                'aria-label': t('stem.nuclearlab.aria_reactor_3d_core', 'Cutaway view of a pressurised water reactor core: containment shell, pressure vessel, coolant, fuel assemblies and control rods. The rods rise and fall with the control setting, and the coolant colours and fills with steam voids as the fuel heats. Everything it shows is also in the readings below, and each part has a button under "Parts of the core".'),
                'aria-describedby': 'rx-live-readings',
                style: { position: 'absolute', inset: 0 }
              }),
              rxViewerStatus !== 'ready' ? h('div', { role: 'status', className: 'absolute inset-0 flex items-center justify-center text-center p-4', style: { background: isDark ? 'rgba(11,18,32,0.92)' : 'rgba(223,230,239,0.92)' } },
                h('p', { className: 'text-[0.6875rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                  rxViewerStatus === 'loading' ? 'Loading the 3D core…'
                    : (RX_MISSING === 'host'
                      ? 'The 3D core needs a newer host module than this build has. The control panel beside it still works in full.'
                      : (rxViewerStatus === 'failed'
                        ? 'The 3D core could not start here, usually because WebGL is blocked. The control panel beside it still works in full.'
                        : 'Preparing the 3D core…')))
              ) : null),
            h('div', { className: 'rounded-xl overflow-hidden border', style: { borderColor: 'rgba(52,211,153,0.4)', height: '260px' } },
              h('canvas', { ref: rxCanvasRef, role: 'img',
                'data-a11y-static': 'true',
                'aria-describedby': 'rx-live-readings rx-objective-progress',
                'aria-label': t('stem.nuclearlab.reactor_control_panel_showing_a_power_trace','Reactor control panel showing a power trace, fuel temperature, net reactivity in pcm and xenon level. Use the controls below; every reading is also given as text under the panel.'),
                style: { width: '100%', height: '100%', display: 'block' } }))
          ),

          h('dl', {
            id: 'rx-live-readings', ref: rxTelemetryRef,
            'aria-label': t('stem.nuclearlab.live_reactor_readings','Live reactor readings'), 'aria-live': 'off',
            className: 'nk-rx-telemetry mt-2 grid grid-cols-2 sm:grid-cols-5 gap-2'
          }, [
            ['rx-live-power', 'Power', nkFmt(rxRead.power, rxRead.power < 10 ? 1 : 0) + '%', 'power'],
            ['rx-live-temperature', 'Fuel temperature', nkFmt(rxRead.t, 0) + ' °C', 'temperature'],
            ['rx-live-reactivity', 'Net reactivity', (rxReadRhoPcm >= 0 ? '+' : '') + nkFmt(rxReadRhoPcm, 0) + ' pcm', 'reactivity'],
            ['rx-live-xenon', 'Xenon level', nkFmt(rxRead.xe, 2) + '×', 'xenon'],
            ['rx-live-state', 'Simulation state', rxReadState, 'state']
          ].map(function (metric) {
            var tone = rxMetricTone(metric[3], rxRead, rxReadR, rxUi.running, rxScenObj);
            return h('div', {
              key: metric[0],
              'data-rx-metric': metric[0],
              'data-tone': tone.tone,
              className: 'nk-rx-metric rounded-lg p-2 text-center',
              style: { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(167,139,250,0.09)', border: '1px solid rgba(52,211,153,0.35)' }
            },
              h('dt', { className: 'text-[0.625rem] font-bold', style: { color: isDark ? '#cbd5e1' : '#475569' } }, metric[1]),
              h('dd', { className: 'nk-rx-value text-sm font-black', style: { color: isDark ? '#6ee7b7' : '#047857' } },
                h('output', { id: metric[0] }, metric[2])),
              h('dd', {
                id: metric[0] + '-tone',
                className: 'nk-rx-tone mt-1 inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-black'
              }, tone.label));
          })),

          h('div', { className: 'mt-2 flex justify-end' },
            h('button', {
              type: 'button',
              'aria-label': t('stem.nuclearlab.show_current_status_read_a_text_snapshot_of','Show current status. Read a text snapshot of the reactor'),
              'aria-controls': 'rx-status-summary',
              onClick: rxAnnounceStatus,
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
              style: {
                background: isDark ? 'rgba(96,165,250,0.14)' : 'rgba(239,246,255,0.96)',
                color: isDark ? '#bfdbfe' : '#1d4ed8',
                border: '1px solid ' + (isDark ? 'rgba(96,165,250,0.55)' : 'rgba(37,99,235,0.4)')
              }
            }, 'Show current status')
          ),
          h('p', {
            id: 'rx-status-summary',
            hidden: !rxStatusSnapshot,
            className: 'mt-2 rounded-lg border p-2.5 text-[0.6875rem] leading-relaxed',
            style: {
              borderColor: isDark ? 'rgba(96,165,250,0.5)' : 'rgba(37,99,235,0.38)',
              background: isDark ? 'rgba(30,58,138,0.16)' : 'rgba(239,246,255,0.96)',
              color: isDark ? '#dbeafe' : '#1e3a8a'
            }
          }, h('b', null, 'Current status · '), rxStatusSnapshot
            ? rxStatusSnapshot.replace(/^Reactor status:\s*/i, '')
            : 'Choose “Show current status” for a text snapshot.'),

          // controls
          h('fieldset', {
            'aria-label': t('stem.nuclearlab.1_choose_scenario','1. Choose scenario'),
            className: 'nk-rx-control-group mt-3 rounded-xl border p-2.5',
            style: { borderColor: 'rgba(52,211,153,0.4)', background: isDark ? 'rgba(6,78,59,0.1)' : 'rgba(240,253,244,0.7)' }
          },
            h('legend', { className: 'px-1.5 text-[0.6875rem] font-black', style: { color: ink('#34d399') } }, '1 · Choose scenario'),
            h('div', { className: 'flex flex-wrap gap-1' },
              RX_SCENARIOS.map(function (s) {
                return pill(rxScenario === s.id, '#34d399', s.name, function () {
                  upd({ rxScenario: s.id });
                  // Pass the destination explicitly: tool-data updates are async,
                  // so closing over rxScenario here would reset the NEW scenario
                  // with the OLD one's starting conditions for one whole commit.
                  rxRestart(s.id);
                  if (typeof beep === 'function') beep();
                }, 'Run the scenario: ' + s.name + '. ' + s.goal);
              })
            ),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              h('b', null, rxScenObj.goal + ' '), rxScenObj.brief),

            h('div', {
            id: 'rx-objective-progress', ref: rxObjectiveRef,
            role: 'group', 'aria-labelledby': 'rx-objective-heading',
            'data-stage': rxObjective.stage,
            'data-tone': rxObjectiveVisualTone.tone,
            className: 'nk-rx-objective mt-2 rounded-lg border p-2.5',
            style: {
              borderColor: 'rgba(52,211,153,0.48)',
              background: isDark ? 'rgba(6,78,59,0.2)' : 'rgba(236,253,245,0.92)'
            }
          },
            h('div', { className: 'flex flex-wrap items-center justify-between gap-2' },
              h('p', {
                id: 'rx-objective-heading', className: 'text-[0.625rem] font-black uppercase tracking-wide',
                style: { color: isDark ? '#6ee7b7' : '#047857' }
              }, 'Objective progress'),
              h('span', {
                id: 'rx-objective-tone',
                className: 'nk-rx-tone inline-flex rounded-full px-2 py-0.5 text-[0.625rem] font-black'
              }, rxObjectiveVisualTone.label)
            ),
            h('p', {
              id: 'rx-objective-step', className: 'mt-1 text-[0.6875rem] font-black',
              style: { color: isDark ? '#d1fae5' : '#065f46' }
            }, rxObjective.label),
            h('progress', {
              id: 'rx-objective-meter', value: rxObjective.value, max: rxObjective.max,
              'aria-labelledby': 'rx-objective-step',
              'aria-describedby': 'rx-objective-detail',
              'aria-valuetext': rxObjective.detail,
              className: 'mt-2 w-full h-3', style: { accentColor: '#059669' }
            }),
            h('output', {
              id: 'rx-objective-detail', className: 'block mt-1 text-[0.6875rem] leading-relaxed',
              style: { color: isDark ? '#d1fae5' : '#166534' }
            }, rxObjective.detail)
            )
          ),

          h('fieldset', {
            'aria-label': t('stem.nuclearlab.2_choose_core_design','2. Choose core design'),
            className: 'nk-rx-control-group mt-2 rounded-xl border p-2.5',
            style: { borderColor: 'rgba(96,165,250,0.4)', background: isDark ? 'rgba(30,58,138,0.1)' : 'rgba(239,246,255,0.72)' }
          },
            h('legend', { className: 'px-1.5 text-[0.6875rem] font-black', style: { color: ink('#60a5fa') } }, '2 · Choose core design'),
            h('div', { className: 'flex flex-wrap gap-1' },
              RX_MODES.map(function (m) {
                return pill(rxMode === m.id, m.id === 'rbmk' ? '#f87171' : '#60a5fa', m.name, function () {
                  upd({ rxMode: m.id });
                  rxRestart(rxScenario);
                  if (typeof beep === 'function') beep();
                  if (typeof announceToSR === 'function') announceToSR(m.name + '. ' + m.blurb);
                }, 'Switch the core to ' + m.name);
              })
            ),
            h('p', { className: 'text-[0.6875rem] mt-1.5 leading-relaxed', style: { color: rxMode === 'rbmk' ? (isDark ? '#fca5a5' : '#b91c1c') : (isDark ? '#cbd5e1' : '#475569') } }, rxModeObj.blurb)
          ),

          h('fieldset', {
            'aria-label': t('stem.nuclearlab.3_operate_the_reactor','3. Operate the reactor'),
            className: 'nk-rx-control-group mt-2 rounded-xl border p-2.5',
            style: { borderColor: 'rgba(251,191,36,0.42)', background: isDark ? 'rgba(120,53,15,0.1)' : 'rgba(255,251,235,0.74)' }
          },
            h('legend', { className: 'px-1.5 text-[0.6875rem] font-black', style: { color: ink('#fbbf24') } }, '3 · Operate the reactor'),
            h('div', { className: 'flex flex-wrap items-center gap-2' },
            h('button', { ref: rxStartButtonRef, type: 'button', 'aria-pressed': rxUi.running ? 'true' : 'false',
              'aria-label': rxUi.running ? t('stem.nuclearlab.aria_pause_sim', 'Pause. Pause the simulation') : t('stem.nuclearlab.aria_run_sim', 'Run. Start the simulation'),
              onClick: function () { rxPatchUi({ running: !rxUi.running }); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black',
              style: rxUi.running ? { background: '#f59e0b', color: '#0b1020', border: '1px solid #f59e0b' } : { background: '#065f46', color: '#fff', border: '1px solid #065f46' }
            }, rxUi.running ? '⏸ Pause' : '▶ Run'),
            h('button', { type: 'button', 'aria-label': t('stem.nuclearlab.scram_drop_every_control_rod_immediately','Scram: drop every control rod immediately'),
              onClick: function () {
                rxSet({ scrammed: true, sinceScram: 0, rods: 100, holdOk: 0 });
                rxPatchUi({ scrammed: true, rodStep: 100 });
                if (typeof beep === 'function') beep();
                if (typeof announceToSR === 'function') announceToSR(__alloT('stem.nuclearlab.sr_scrammed_fission_stopped_decay_heat_continues', 'Scrammed. Fission stopped. Decay heat continues.'));
              },
              className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black text-white',
              style: { background: '#dc2626', border: '1px solid #dc2626' } }, '🛑 SCRAM'),
            h('button', { type: 'button', 'aria-label': t('stem.nuclearlab.reset_return_the_reactor_to_its_starting_con','Reset. Return the reactor to its starting condition'),
              onClick: function () { rxRestart(); if (typeof beep === 'function') beep(); },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
              style: { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') } }, '↺ Reset'),
            h('button', { type: 'button', 'aria-pressed': rxUi.pumps ? 'true' : 'false',
              'aria-label': rxUi.pumps ? t('stem.nuclearlab.aria_stop_pumps', 'Pumps on. Stop the coolant pumps') : t('stem.nuclearlab.aria_restore_pumps', 'Pumps off. Restore the coolant pumps'),
              onClick: function () {
                var pumps = !rxRef.current.pumps;
                rxSet({ pumps: pumps });
                rxPatchUi({ pumps: pumps });
                if (typeof beep === 'function') beep();
              },
              className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
              style: rxUi.pumps
                ? { background: 'rgba(96,165,250,0.18)', color: isDark ? '#bfdbfe' : '#1d4ed8', border: '1px solid #60a5fa' }
                : { background: 'rgba(248,113,113,0.18)', color: isDark ? '#fecaca' : '#b91c1c', border: '1px solid #f87171' }
            }, rxUi.pumps ? '💧 Pumps on' : '💧 Pumps OFF')
            ),

            h('div', { className: 'nk-slider flex items-center gap-2 mt-2' },
            h('label', { htmlFor: 'rx-rods', className: 'text-[0.6875rem] font-bold w-28 flex-shrink-0', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Control rods'),
            h('input', { id: 'rx-rods', type: 'range', min: 0, max: 100, step: 5,
              value: rxUi.rodStep,
              'aria-valuetext': t('stem.nuclearlab.aria_rods_inserted', '{pct} percent inserted').replace('{pct}', String(rxUi.rodStep)),
              onChange: function (e) {
                var value = parseFloat(e.target.value);
                rxSet({ rods: value, scrammed: false });
                rxPatchUi({ rodStep: value, scrammed: false });
              },
              className: 'flex-1 min-h-11 accent-emerald-500' }),
            h('span', { className: 'text-[0.6875rem] font-bold w-24 text-right', style: { color: isDark ? '#6ee7b7' : '#047857' } }, rxUi.rodStep + '% in')
            ),

            rxUi.verdict ? h('div', { role: 'status', className: 'mt-2 rounded-lg border p-2.5',
            style: { borderColor: rxUi.verdict.ok ? 'rgba(52,211,153,0.6)' : 'rgba(248,113,113,0.6)', background: isDark ? 'rgba(15,23,42,0.7)' : (rxUi.verdict.ok ? 'rgba(240,253,244,0.9)' : 'rgba(254,242,242,0.9)') } },
            h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink(rxUi.verdict.ok ? '#059669' : '#dc2626') } }, rxUi.verdict.ok ? '✅ Scenario complete' : '⚠️ Run ended'),
            h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, rxUi.verdict.why),
            h('button', { type: 'button', 'aria-label': t('stem.nuclearlab.try_again_reset_the_reactor_scenario','Try again. Reset the reactor scenario'),
              onClick: function () {
                rxRetryFocusRef.current = true;
                rxRestart();
              },
              className: 'min-h-11 mt-2 px-3 py-2 rounded-lg text-[0.6875rem] font-bold text-white',
              style: { background: '#065f46', border: '1px solid #065f46' } }, 'Try again')
            ) : null
          ),

          h('p', { className: 'text-[0.6875rem] font-bold mt-2 mb-1', style: { color: isDark ? '#cbd5e1' : '#475569' } }, 'Parts of the core'),
          h('div', { className: 'flex flex-wrap gap-1' },
            RX_PARTS.map(function (p) {
              var on = d.rxPart === p.id;
              return h('button', { key: p.id, type: 'button',
                'aria-expanded': on ? 'true' : 'false',
                'aria-controls': 'nk-rx-part-' + p.id,
                onClick: function () {
                  upd({ rxPart: on ? null : p.id });
                  if (!on) { pushOnce('rxPartsSeen', p.id); if (typeof announceToSR === 'function') announceToSR(p.label + '. ' + p.desc); }
                  if (typeof beep === 'function') beep();
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                style: on ? { background: p.color, color: '#0b1020', border: '1px solid ' + p.color }
                  : { background: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(255,255,255,0.9)', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)') }
              }, p.label);
            })
          ),
          (function () {
            var p = RX_PARTS.filter(function (x) { return x.id === d.rxPart; })[0];
            return p ? h('div', { id: 'nk-rx-part-' + p.id, className: 'mt-2 rounded-lg border p-2.5', style: { borderColor: p.color + '80', background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.92)' } },
              h('p', { className: 'text-[0.6875rem] font-black mb-1', style: { color: ink(p.color) } }, p.label),
              h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, p.desc)) : null;
          })(),

          h('p', { className: 'text-[0.625rem] mt-2 leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'One-group point kinetics with the prompt-jump approximation: β = 0.0065, Λ = 10⁻⁴ s, λ = 0.0767 /s. Decay heat uses the Wigner-Way approximation. Temperature, void and xenon feedbacks are order-of-magnitude realistic for teaching, not a licensing model.')
        ),

        // ── evidence challenge ──
        sec('evidence', '#22d3ee',
          heading(ink('#22d3ee'), '🔎 21. Evidence challenge: what does the evidence earn?'),
          h('p', { id: 'nk-evidence-intro', className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
            'Classify each claim using only the evidence given. There is no timer and no penalty for revising an answer. “Not settled” is a full scientific verdict when the evidence cannot distinguish the possibilities.'
              + (nkPath ? ' This route asks only about evidence from the sections you just opened.' : '')),

          h('div', { className: 'flex flex-wrap items-center gap-2 rounded-lg border p-2.5', style: { borderColor: 'rgba(34,211,238,0.45)', background: isDark ? 'rgba(8,47,73,0.3)' : 'rgba(236,254,255,0.9)' } },
            h('span', { className: 'text-[0.6875rem] font-black', style: { color: ink('#22d3ee') } },
              nkPath ? 'Route evidence' : 'Evidence mastery'),
            h('progress', {
              value: activeEvidenceMastered.length, max: evidenceClaims.length,
              'aria-label': t('stem.nuclearlab.aria_evidence_mastered', '{done} of {total} evidence claims mastered').replace('{done}', String(activeEvidenceMastered.length)).replace('{total}', String(evidenceClaims.length)),
              className: 'flex-1 min-w-[8rem] h-3', style: { accentColor: '#0891b2' }
            }),
            h('span', { className: 'text-[0.6875rem] font-bold', style: { color: isDark ? '#e2e8f0' : '#334155' } },
              activeEvidenceMastered.length + ' of ' + evidenceClaims.length + ' mastered')
          ),

          h('nav', { 'aria-label': t('stem.nuclearlab.evidence_challenge_claims','Evidence challenge claims'), className: 'mt-2' },
            h('ol', { className: 'flex flex-wrap gap-1.5' },
              evidenceClaims.map(function (claim, i) {
                var current = i === evidenceIndex;
                var mastered = evidenceMastered.indexOf(claim.id) !== -1;
                return h('li', { key: claim.id },
                  h('button', {
                    type: 'button',
                    'aria-current': current ? 'step' : undefined,
                    'aria-label': t('stem.nuclearlab.aria_claim_nav', 'Claim {num} of {total}').replace('{num}', String(i + 1)).replace('{total}', String(evidenceClaims.length))
                      + (mastered ? t('stem.nuclearlab.aria_claim_mastered', ', mastered') : t('stem.nuclearlab.aria_claim_unmastered', ', not yet mastered')),
                    onClick: function () {
                      nkEvidencePendingFocusRef.current = claim.id !== evidenceClaim.id;
                      upd({
                        evidenceIndex: EVIDENCE_CLAIMS.indexOf(claim),
                        evidenceClaimId: claim.id
                      });
                      if (claim.id === evidenceClaim.id) nkFocusEvidenceClaim();
                    },
                    className: 'min-h-11 min-w-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
                    style: current
                      ? { background: '#22d3ee', color: '#0b1020', border: '1px solid #22d3ee' }
                      : { background: isDark ? 'rgba(148,163,184,0.1)' : 'rgba(255,255,255,0.95)', color: mastered ? ink('#34d399') : (isDark ? '#e2e8f0' : '#334155'), border: '1px solid ' + (mastered ? '#34d399' : (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')) }
                  }, h('span', { 'aria-hidden': 'true' }, mastered ? '✓ ' + (i + 1) : String(i + 1))));
              })
            )
          ),

          h('fieldset', {
            id: 'nk-evidence-claim',
            tabIndex: -1,
            'aria-describedby': 'nk-evidence-statement nk-evidence-question nk-evidence-feedback',
            className: 'nk-evidence-claim mt-2 rounded-xl border p-3',
            style: { borderColor: 'rgba(34,211,238,0.45)', background: isDark ? 'rgba(15,23,42,0.62)' : 'rgba(255,255,255,0.96)' }
          },
            h('legend', { className: 'px-1 text-xs font-black', style: { color: ink('#22d3ee') } },
              'Claim ' + (evidenceIndex + 1) + ' of ' + evidenceClaims.length),
            h('p', { id: 'nk-evidence-statement', className: 'text-sm font-black leading-relaxed', style: { color: isDark ? '#fff' : '#1e293b' } },
              '“' + evidenceClaim.claim + '”'),
            h('p', { id: 'nk-evidence-question', className: 'text-[0.625rem] mt-1 mb-2', style: { color: isDark ? '#94a3b8' : '#475569' } },
              'Which verdict is justified by the evidence in this lab?'),

            h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-2' },
              EVIDENCE_VERDICTS.map(function (verdict) {
                var selected = evidenceChoice === verdict.id;
                return h('label', {
                  key: verdict.id,
                  className: 'min-h-11 flex items-center gap-2 rounded-lg border px-3 py-2 text-[0.6875rem] font-bold cursor-pointer',
                  style: selected
                    ? { background: isDark ? 'rgba(34,211,238,0.2)' : 'rgba(207,250,254,0.95)', color: isDark ? '#cffafe' : '#164e63', borderColor: '#22d3ee' }
                    : { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(248,250,252,0.96)', color: isDark ? '#e2e8f0' : '#334155', borderColor: isDark ? 'rgba(148,163,184,0.28)' : 'rgba(100,116,139,0.25)' }
                },
                  h('input', {
                    type: 'radio', name: 'nk-evidence-verdict', value: verdict.id,
                    'aria-label': verdict.label,
                    checked: selected,
                    onChange: function () {
                      var choices = Object.assign({}, evidenceChoices);
                      var checked = Object.assign({}, evidenceCheckedMap);
                      var revealed = Object.assign({}, evidenceRevealedMap);
                      choices[evidenceClaim.id] = verdict.id;
                      checked[evidenceClaim.id] = false;
                      delete revealed[evidenceClaim.id];
                      upd({ evidenceChoices: choices, evidenceChecked: checked, evidenceRevealed: revealed });
                    },
                    style: { width: '1.15rem', height: '1.15rem', accentColor: '#0891b2', flexShrink: 0 }
                  }),
                  h('span', null, verdict.label));
              })
            ),

            evidenceIsChecked
              ? h(React.Fragment, null,
                  h('div', {
                    id: 'nk-evidence-feedback', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
                    className: 'mt-3 rounded-lg border p-2.5',
                    style: {
                      borderColor: evidenceCorrect ? 'rgba(52,211,153,0.65)' : 'rgba(251,191,36,0.7)',
                      background: isDark ? (evidenceCorrect ? 'rgba(6,78,59,0.28)' : 'rgba(120,53,15,0.28)') : (evidenceCorrect ? 'rgba(236,253,245,0.96)' : 'rgba(255,251,235,0.98)')
                    }
                  },
                    h('p', { className: 'text-[0.6875rem] font-black', style: { color: ink(evidenceCorrect ? '#059669' : '#f59e0b') } },
                      evidenceCorrect ? '✓ Evidence match' : '↺ Take another look'),
                    h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#334155' } }, evidenceClaim.evidence),
                    !evidenceCorrect ? (function () {
                      var claimTopicMap = { 'reactor-bomb': 'reactor', 'inverse-square': 'inverse_square', 'low-dose-zero': 'dose', 'neutron-layers': 'neutron', 'short-count': 'counting' };
                      var claimGuessMap = { 'reactor-bomb': 'grow', 'inverse-square': 'half', 'low-dose-zero': 'low-dose-zero', 'neutron-layers': 'lead-neutrons', 'short-count': 'same' };
                      var evDiag = nkDiagnoseMisconception(claimTopicMap[evidenceClaim.id] || 'general', claimGuessMap[evidenceClaim.id] || evidenceChoice, evidenceClaim.verdict);
                      return h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#334155' } }, evDiag.whyNot);
                    })() : null,
                    !evidenceCorrect && !evidenceAnswerVisible
                      ? h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: ink('#f59e0b') } },
                          'Use that evidence to revise your verdict, or reveal the best-supported answer when you need it.')
                      : null,
                    h('div', { id: 'nk-evidence-answer', hidden: !evidenceAnswerVisible },
                      h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: isDark ? '#f8fafc' : '#1e293b' } },
                        'Best verdict: ' + evidenceVerdict.label + '.'),
                      h('p', { className: 'text-[0.6875rem] mt-1 font-bold', style: { color: ink('#22d3ee') } }, evidenceClaim.takeaway)
                    )
                  ),
                  h('div', { className: 'mt-2 flex flex-wrap gap-2' },
                    h('button', {
                      type: 'button', onClick: function () { nkReviewTopic(evidenceClaim.section); },
                      'aria-label': t('stem.nuclearlab.aria_review_claim_topic', 'Review the supporting topic for claim {num}').replace('{num}', String(evidenceIndex + 1)),
                      className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                      style: { background: isDark ? 'rgba(148,163,184,0.12)' : '#fff', color: isDark ? '#e2e8f0' : '#334155', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)') }
                    }, 'Review the supporting topic'),
                    canSpeak ? h('button', {
                      type: 'button',
                      'aria-label': t('stem.nuclearlab.aria_read_evidence_feedback', 'Read evidence feedback aloud'),
                      onClick: function () { speakNuclear(ctx, evidenceClaim.claim + ' ' + evidenceClaim.evidence + (evidenceAnswerVisible ? ' ' + evidenceClaim.takeaway : '')); },
                      className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                      style: isContrast ? { background: '#000000', color: ink('#fbbf24'), border: '2px solid #ffff00' } : { background: isDark ? 'rgba(30,41,59,0.92)' : '#fff', color: isDark ? '#e2e8f0' : '#1e293b', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)') }
                    }, t('stem.nuclearlab.read_aloud', '🔊 Read aloud')) : null,
                    !evidenceCorrect && evidenceMastered.indexOf(evidenceClaim.id) === -1 ? h('button', {
                      type: 'button',
                      'aria-expanded': evidenceAnswerVisible ? 'true' : 'false',
                      'aria-controls': 'nk-evidence-answer',
                      onClick: function () {
                        var revealed = Object.assign({}, evidenceRevealedMap);
                        revealed[evidenceClaim.id] = !evidenceAnswerVisible;
                        upd({ evidenceRevealed: revealed });
                        if (typeof beep === 'function') beep();
                      },
                      className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                      style: { background: 'transparent', color: isDark ? '#fde68a' : '#92400e', border: '1px solid ' + (isDark ? 'rgba(251,191,36,0.55)' : 'rgba(217,119,6,0.5)') }
                    }, evidenceAnswerVisible ? 'Hide best verdict' : 'Show best verdict') : null
                  )
                )
              : h('p', {
                  id: 'nk-evidence-feedback',
                  className: 'text-[0.625rem] mt-2', style: { color: isDark ? '#94a3b8' : '#475569' }
                }, evidenceChoice ? 'Choice selected. Check the evidence when you are ready.' : 'Choose a verdict to continue.'),

            h('div', { className: 'mt-2 flex flex-wrap gap-2' },
              h('button', {
                type: 'button', disabled: !evidenceChoice,
                'aria-describedby': 'nk-evidence-feedback',
                onClick: function () {
                  var correct = evidenceChoice === evidenceClaim.verdict;
                  var checked = Object.assign({}, evidenceCheckedMap);
                  checked[evidenceClaim.id] = true;
                  var mastered = evidenceMastered;
                  var firstMastery = correct && mastered.indexOf(evidenceClaim.id) === -1;
                  if (firstMastery) mastered = mastered.concat([evidenceClaim.id]);
                  var globalEvidenceNowComplete = firstMastery && mastered.length === EVIDENCE_CLAIMS.length;
                  var firstCompletion = globalEvidenceNowComplete && !d.evidenceAwarded && !nkSafeXpLedger(d._xpCredited).nuclear_evidence && !xpAwardedRef.current.nuclear_evidence;
                  var routeCompletes = correct
                    && nkPath
                    && nkEvidenceCompleteFor(nkPath, mastered)
                    && nkActiveRouteProgress.count === nkActiveRouteProgress.total
                    && !nkActiveRouteProgress.complete;
                  var patch = {
                    evidenceChecked: checked,
                    evidenceMastered: mastered,
                    evidenceAwarded: d.evidenceAwarded || firstCompletion
                  };
                  if (firstCompletion) {
                    xpAwardedRef.current.nuclear_evidence = true;
                    patch._xpCredited = Object.assign(nkSafeXpLedger(d._xpCredited), { nuclear_evidence: true });
                  }
                  if (routeCompletes && nkPathsCompleted.indexOf(nkPath.id) === -1) {
                    patch.pathsCompleted = nkPathsCompleted.concat([nkPath.id]);
                  }
                  upd(patch);
                  // The feedback paragraph is already a polite atomic status.
                  // Repeating that same prose through the host announcer makes
                  // screen readers speak every verdict twice. Only completion
                  // is distinct information that is not in that live region.
                  if (routeCompletes && typeof announceToSR === 'function') {
                    announceToSR('Route complete: ' + nkPath.q);
                  }
                  if (firstCompletion && !d.evidenceAwarded) {
                    nkCelebrate();
                    if (typeof awardXP === 'function') awardXP('nuclear_evidence', 15, 'Mastered the evidence challenge');
                  }
                },
                className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black',
                style: { background: '#0e7490', color: '#fff', border: '1px solid #0e7490', opacity: !evidenceChoice ? 0.55 : 1 }
              }, evidenceIsChecked ? 'Check again' : 'Check the evidence'),
              evidenceIsChecked && evidenceClaims.length > 1 ? h('button', {
                type: 'button',
                onClick: function () {
                  var next = evidenceIndex + 1;
                  if (next >= evidenceClaims.length) {
                    next = evidenceClaims.findIndex(function (claim) {
                      return evidenceMastered.indexOf(claim.id) === -1;
                    });
                    if (next < 0) next = 0;
                  }
                  var nextClaim = evidenceClaims[next];
                  nkEvidencePendingFocusRef.current = nextClaim.id !== evidenceClaim.id;
                  upd({
                    evidenceIndex: EVIDENCE_CLAIMS.indexOf(nextClaim),
                    evidenceClaimId: nextClaim.id
                  });
                  // Focus moves to the newly named fieldset after this commit;
                  // announcing its claim number here would say it twice.
                },
                className: 'min-h-11 px-4 py-2 rounded-lg text-[0.6875rem] font-black',
                style: { background: '#065f46', color: '#fff', border: '1px solid #065f46' }
              }, evidenceIndex < evidenceClaims.length - 1 ? 'Next claim →' : (activeEvidenceComplete ? 'Review claim 1' : 'Review an unfinished claim')) : null,
              h('button', {
                type: 'button',
                onClick: function () {
                  var resetChoices = Object.assign({}, evidenceChoices);
                  var resetChecked = Object.assign({}, evidenceCheckedMap);
                  var resetRevealed = Object.assign({}, evidenceRevealedMap);
                  var resetIds = evidenceClaims.map(function (claim) { return claim.id; });
                  resetIds.forEach(function (id) {
                    delete resetChoices[id];
                    delete resetChecked[id];
                    delete resetRevealed[id];
                  });
                  var firstClaim = evidenceClaims[0];
                  var claimChanges = firstClaim.id !== evidenceClaim.id;
                  nkEvidencePendingFocusRef.current = claimChanges;
                  upd({
                    evidenceIndex: EVIDENCE_CLAIMS.indexOf(firstClaim),
                    evidenceClaimId: firstClaim.id,
                    evidenceChoices: resetChoices,
                    evidenceChecked: resetChecked,
                    evidenceRevealed: resetRevealed,
                    evidenceMastered: evidenceMastered.filter(function (id) {
                      return resetIds.indexOf(id) === -1;
                    })
                  });
                  // If claim 1 was already showing, the id does not change and
                  // the post-commit handoff effect will not run.
                  if (!claimChanges) nkFocusEvidenceClaim();
                },
                className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-bold',
                style: { background: 'transparent', color: isDark ? '#cbd5e1' : '#475569', border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.35)' : 'rgba(100,116,139,0.3)') }
              }, 'Start over')
            )
          ),

          activeEvidenceComplete ? h('aside', {
            role: 'note', 'aria-label': t('stem.nuclearlab.evidence_challenge_complete','Evidence challenge complete'),
            className: 'mt-3 rounded-lg border p-2.5',
            style: { borderColor: 'rgba(52,211,153,0.65)', background: isDark ? 'rgba(6,78,59,0.28)' : 'rgba(236,253,245,0.96)' }
          },
            h('p', { className: 'text-[0.6875rem] font-black', style: { color: ink('#059669') } }, '✓ Challenge complete'),
            h('p', { className: 'text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#d1fae5' : '#065f46' } },
              nkPath
                ? 'You judged the evidence taught on this route. That mastery also carries into the full five-claim challenge.'
                : 'You separated direct support, contradiction, and uncertainty across all five claims. Revisit any number above to compare the reasoning again.')
          ) : null,

          activeEvidenceComplete ? h(NKReflectionEditor, {
            key: 'nk-reflection-' + nkReflectionKey,
            React: React,
            routeKey: nkReflectionKey,
            routeQuestion: nkPath ? nkPath.q : '',
            routeIcon: nkPath ? nkPath.icon : '',
            routeComplete: nkPath ? nkActiveRouteProgress.complete : true,
            routeStepsRemaining: nkPath
              ? Math.max(0, nkActiveRouteProgress.total - nkActiveRouteProgress.count)
              : 0,
            saved: nkSavedReflection,
            isDark: isDark,
            onSave: nkSaveReflection,
            onClear: nkClearReflection
          }) : null
        ),

        // ── bridges ──
        sec('next', '#94a3b8',
          heading(isDark ? '#cbd5e1' : '#475569', '🔗 Take this somewhere'),
          // ── what you worked out ──
          // Shown only when there is something to show. An empty summary would
          // be a worse ending than no summary: it would tell a student who has
          // read a great deal that they have done nothing.
          nkSummary.length || (nkSummaryReflection && (nkSummaryReflection.idea || nkSummaryReflection.question))
            ? h('div', {
              className: 'mb-3 rounded-xl border p-3',
              style: {
                borderColor: 'rgba(52,211,153,0.5)',
                background: isDark ? 'rgba(15,23,42,0.6)' : 'rgba(240,253,244,0.9)'
              }
            },
              h('h5', { className: 'text-[0.8125rem] font-black mb-1', style: { color: ink('#059669') } },
                '🧾 What you worked out'),
              h('p', { className: 'text-[0.6875rem] mb-2 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } },
                'Your own numbers and judgements from this lab, in one place. Copy it into a notebook, an assignment, or a message to your teacher.'),
              h('dl', { className: 'space-y-1.5 mb-2' },
                nkSummary.map(function (row) {
                  return h('div', {
                    key: row.label,
                    className: 'rounded-lg border px-2.5 py-1.5',
                    style: {
                      borderColor: isDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.22)',
                      background: isDark ? 'rgba(148,163,184,0.06)' : 'rgba(255,255,255,0.92)'
                    }
                  },
                    h('dt', { className: 'text-[0.625rem] font-bold uppercase tracking-wide', style: { color: isDark ? '#94a3b8' : '#475569' } }, row.label),
                    h('dd', { className: 'text-[0.6875rem] font-black', style: { color: isDark ? '#e2e8f0' : '#1e293b' } }, row.value),
                    row.detail
                      ? h('dd', { className: 'text-[0.6875rem] mt-0.5 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, row.detail)
                      : null);
                })
              ),
              nkSummaryReflection && nkSummaryReflection.idea
                ? h('div', { className: 'rounded-lg border px-2.5 py-1.5 mb-1.5', style: { borderColor: 'rgba(52,211,153,0.4)', background: isDark ? 'rgba(6,78,59,0.25)' : 'rgba(236,253,245,0.9)' } },
                  h('p', { className: 'text-[0.625rem] font-bold uppercase tracking-wide', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'The idea I would explain'),
                  h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#1e293b' } }, nkSummaryReflection.idea))
                : null,
              nkSummaryReflection && nkSummaryReflection.question
                ? h('div', { className: 'rounded-lg border px-2.5 py-1.5 mb-1.5', style: { borderColor: 'rgba(52,211,153,0.4)', background: isDark ? 'rgba(6,78,59,0.25)' : 'rgba(236,253,245,0.9)' } },
                  h('p', { className: 'text-[0.625rem] font-bold uppercase tracking-wide', style: { color: isDark ? '#94a3b8' : '#475569' } }, 'What I still want to know'),
                  h('p', { className: 'text-[0.6875rem] leading-relaxed', style: { color: isDark ? '#e2e8f0' : '#1e293b' } }, nkSummaryReflection.question))
                : null,
              h('div', { className: 'flex flex-wrap items-center gap-2' },
                h('button', {
                  type: 'button',
                  onClick: function () {
                    var text = nkSummaryText();
                    // Route through the shell: in Gemini Canvas the Clipboard
                    // API is blocked and only the shell's execCommand fallback
                    // lands, so a direct writeText drops the summary silently.
                    var write = (window.StemLab && window.StemLab.writeClipboard)
                      || (navigator.clipboard && navigator.clipboard.writeText
                        ? function (value) { return navigator.clipboard.writeText(value); }
                        : null);
                    function done(ok) {
                      upd({ nkSummaryCopied: ok ? 'ok' : 'failed' });
                      if (typeof announceToSR === 'function') {
                        announceToSR(ok ? 'Summary copied to the clipboard.' : 'Copy failed. The summary is shown below so you can select it yourself.');
                      }
                    }
                    if (!write) { done(false); return; }
                    try {
                      Promise.resolve(write(text)).then(function () { done(true); }, function () { done(false); });
                    } catch (err) { done(false); }
                    if (typeof beep === 'function') beep();
                  },
                  className: 'min-h-11 px-3 py-2 rounded-lg text-[0.6875rem] font-black',
                  style: { background: '#34d399', color: '#0b1020', border: '1px solid #34d399' }
                }, '📋 Copy my summary'),
                d.nkSummaryCopied === 'ok'
                  ? h('span', { role: 'status', className: 'text-[0.6875rem] font-bold', style: { color: ink('#059669') } }, 'Copied.')
                  : null,
                d.nkSummaryCopied === 'failed'
                  ? h('span', { role: 'status', className: 'text-[0.6875rem] font-bold', style: { color: ink('#f59e0b') } }, 'Could not copy — select the text below instead.')
                  : null
              ),
              // A failed copy must still leave the student a way to get the
              // text out, so the fallback is selectable rather than a dead end.
              d.nkSummaryCopied === 'failed'
                ? h('textarea', {
                  readOnly: true,
                  'aria-label': t('stem.nuclearlab.your_summary_text_ready_to_select_and_copy','Your summary text, ready to select and copy'),
                  value: nkSummaryText(),
                  rows: 8,
                  className: 'w-full mt-2 rounded-lg p-2 text-[0.6875rem] font-mono',
                  style: {
                    background: isDark ? 'rgba(2,6,23,0.7)' : 'rgba(255,255,255,0.96)',
                    color: isDark ? '#e2e8f0' : '#1e293b',
                    border: '1px solid ' + (isDark ? 'rgba(148,163,184,0.3)' : 'rgba(100,116,139,0.28)')
                  }
                })
                : null
            )
            : null,
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
            [{ id: 'heatLab', icon: '🌡️', name: 'Heat & Thermodynamics Lab', why: 'A reactor is a heat engine. Carnot caps it at about 33%, which is why two-thirds of the energy goes up the cooling towers.' },
             { id: 'renewablesLab', icon: '⚡', name: 'Renewables Lab', why: 'Put the deaths and carbon figures next to how each source actually generates power.' },
             { id: 'geologyExplorer', icon: '⛰️', name: 'Geology Explorer', why: 'Radiometric dating is the half-life maths above, applied to rock. It is how we know the Earth\'s age.' },
             { id: 'chemBalance', icon: '⚖️', name: 'ChemLab: Reactions & Elements', why: 'Nuclear equations balance mass number and charge, not atoms — and the periodic table atlas lives there.' }
            ].map(function (b) {
              return h('button', {
                key: b.id, type: 'button',
                onClick: function () { if (typeof setStemLabTool === 'function') setStemLabTool(b.id); },
                className: 'min-h-11 text-left rounded-lg p-2.5 border transition-colors',
                style: { background: isDark ? 'rgba(148,163,184,0.08)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? 'rgba(148,163,184,0.26)' : 'rgba(100,116,139,0.24)' }
              },
                h('span', { className: 'flex items-center gap-2' },
                  h('span', { className: 'text-sm', 'aria-hidden': 'true' }, b.icon),
                  h('span', { className: 'text-[0.6875rem] font-black', style: { color: isDark ? '#fff' : '#1e293b' } }, b.name),
                  h('span', { className: 'ml-auto text-[0.6875rem] font-bold', style: { color: ink('#94a3b8') } }, '→')),
                h('span', { className: 'block text-[0.6875rem] mt-1 leading-relaxed', style: { color: isDark ? '#cbd5e1' : '#475569' } }, b.why));
            })
          )
        )
        ),

        d.nkView === 'reactor' ? null : h(NuclearOfflinePhysicsCoach, {
          ctx: ctx,
          surface: 'reference',
          isDark: isDark,
          isContrast: isContrast,
          state: { isoId: isoId, radId: radId, shieldId: shieldId, thick: thick, rods: rods, c14Frac: c14Frac, dsTotal: dsTotal }
        }),

        h('footer', { role: 'none', className: 'mt-3 rounded-lg border p-3 text-center', style: { borderColor: isDark ? 'rgba(148,163,184,.25)' : 'rgba(100,116,139,.22)' } },
          h('p', { className: 'text-[0.625rem] leading-relaxed', style: { color: isDark ? '#94a3b8' : '#475569' } },
            'Reviewed ' + NK_REVIEWED + '. Half-lives use NNDC NuDat 3; attenuation uses NIST XCOM at 1 MeV; dose and accident context uses UNSCEAR, ICRP 103 and NCRP 160. Where a figure is disputed, the tool gives the range rather than choosing.'),
          sourceNote(['nudat', 'nist', 'unscear', 'icrp103', 'inworks', 'nrc', 'iter', 'nif', 'nuscale']))
      );
      }
      return function (ctx) { return ctx.React.createElement(NuclearLabWorkspace, { ctx: ctx, Reference: Reference }); };
    })()
  });
})();
