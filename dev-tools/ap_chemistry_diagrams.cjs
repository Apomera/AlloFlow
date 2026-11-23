'use strict';
// Original text-first accessible reasoning-flow diagrams for AP Chemistry (1 per unit).
// Optional study aids with ordered text equivalents; not required for comprehension,
// not official College Board figures, unscored, and release-blocked.

const AP_CHEMISTRY_DIAGRAM_SPECS = [
  {
    unitNumber: 1,
    domainId: 'atomic-structure-and-properties',
    title: 'Coulombic attraction, electron configuration, and periodic trend flow',
    nodes: [
      { id: 'evidence', label: 'Mass spec & PES reveal isotopes and subshell energies' },
      { id: 'config', label: 'Write electron configuration & valence shell' },
      { id: 'coulomb', label: 'Compare effective nuclear charge & shell distance' },
      { id: 'trends', label: 'Justify radius, ionization energy, and electronegativity' },
    ],
    textEquivalent: [
      'Mass spectra establish isotopic abundance and average atomic mass, while photoelectron spectra show subshell binding energies and electron counts.',
      'Ground-state electron configurations identify occupied shells, valence electrons, and core shielding.',
      'Coulomb law links stronger attraction to higher effective nuclear charge across a period and weaker attraction to greater shell distance down a group.',
      'Those electrostatic comparisons explain atomic and ionic radii, ionization-energy jumps, electron affinity, and periodic reactivity.',
    ],
  },
  {
    unitNumber: 2,
    domainId: 'compound-structure-and-properties',
    title: 'Bonding model, Lewis structure, and VSEPR geometry flow',
    nodes: [
      { id: 'bonding', label: 'Classify ionic, metallic, or covalent by electronegativity' },
      { id: 'lewis', label: 'Draw Lewis structure, formal charges, & resonance' },
      { id: 'vsepr', label: 'Determine electron domains, hybridization, & shape' },
      { id: 'polarity', label: 'Combine bond dipoles & symmetry to predict polarity' },
    ],
    textEquivalent: [
      'Electronegativity differences and elemental classes distinguish ionic lattices, delocalized metallic bonding, and localized covalent sharing.',
      'Lewis structures minimize formal charges and represent delocalized bonding with equivalent resonance forms of fractional bond order.',
      'VSEPR counts bonding and nonbonding electron domains around central atoms to assign molecular geometry, bond angles, and hybridization.',
      'Vector addition of bond dipoles across the 3D geometry determines whether the molecule has a net dipole moment.',
    ],
  },
  {
    unitNumber: 3,
    domainId: 'properties-of-substances-and-mixtures',
    title: 'Intermolecular forces, gas behavior, and solution-spectroscopy flow',
    nodes: [
      { id: 'imf', label: 'Rank LDF, dipole-dipole, H-bonding, & ion-dipole forces' },
      { id: 'macro', label: 'Connect IMF strength to boiling point, vapor pressure, & solubility' },
      { id: 'gases', label: 'Apply KMT, PV=nRT, Dalton partial pressures, & deviations' },
      { id: 'beer', label: 'Use Beer-Lambert law A=ebc & chromatography for mixtures' },
    ],
    textEquivalent: [
      'Molecular polarizability, permanent dipoles, and N/O/F-H donors determine the intermolecular forces acting between particles.',
      'Stronger intermolecular attractions raise boiling points, lower vapor pressures, and govern like-dissolves-like solubility and chromatography retention.',
      'Kinetic molecular theory links temperature to average kinetic energy, while real gases deviate from PV=nRT at high pressure and low temperature.',
      'Spectrophotometry relates absorbance linearly to molar concentration (A=ebc) when path length and wavelength are held constant.',
    ],
  },
  {
    unitNumber: 4,
    domainId: 'chemical-reactions',
    title: 'Net ionic equation, stoichiometry, and redox balancing flow',
    nodes: [
      { id: 'classify', label: 'Identify precipitation, acid-base, or oxidation-reduction' },
      { id: 'netionic', label: 'Write balanced net ionic equation without spectators' },
      { id: 'limiting', label: 'Convert masses/molarities to moles & find limiting reactant' },
      { id: 'yield', label: 'Predict product amounts, excess left, or titration equivalence' },
    ],
    textEquivalent: [
      'Compare reactants and oxidation states to classify the reaction as precipitation, proton transfer, or electron-transfer redox.',
      'Dissociate strong electrolytes and remove unchanged spectator ions to write a charge- and atom-balanced net ionic equation.',
      'Convert given masses, volumes, or gas measurements to moles and divide by stoichiometric coefficients to identify the limiting reactant.',
      'Use mole ratios from the limiting reactant to calculate theoretical yield, remaining excess reactant, or unknown titration molarity.',
    ],
  },
  {
    unitNumber: 5,
    domainId: 'kinetics',
    title: 'Rate law determination, collision theory, and mechanism validation flow',
    nodes: [
      { id: 'data', label: 'Use initial-rate ratios or integrated linear plots for order' },
      { id: 'ratelaw', label: 'Write rate = k[A]^m[B]^n with consistent units for k' },
      { id: 'collision', label: 'Link temperature & catalysts to activation energy Ea' },
      { id: 'mechanism', label: 'Verify elementary steps sum to overall & match rate law' },
    ],
    textEquivalent: [
      'Initial-rate experiments isolate each reactant order, while linear plots of [A], ln[A], or 1/[A] vs. time identify 0th, 1st, or 2nd order.',
      'Combine experimentally determined orders into the rate law and match the units of rate constant k to the overall order.',
      'Higher temperature increases collision frequency and the fraction of molecules exceeding Ea, whereas a catalyst provides an alternate lower-Ea pathway.',
      'A valid mechanism sums to the overall balanced equation and its slow step (after substituting any fast-equilibrium intermediate) reproduces the experimental rate law.',
    ],
  },
  {
    unitNumber: 6,
    domainId: 'thermochemistry',
    title: 'Energy conservation, calorimetry, and enthalpy-calculation flow',
    nodes: [
      { id: 'system', label: 'Define system vs. surroundings & track sign of q' },
      { id: 'calorimetry', label: 'Compute q = mc delta T & phase-change heat' },
      { id: 'enthalpy', label: 'Calculate delta H via Hess law, formations, or bond energies' },
      { id: 'molar', label: 'Scale delta H by limiting moles & verify endo/exothermic' },
    ],
    textEquivalent: [
      'Separate the reacting system from the surrounding water or calorimeter so heat lost by one equals heat gained by the other (q_sys = -q_surr).',
      'Apply q = m c delta T during temperature changes and use molar enthalpy of fusion or vaporization during constant-temperature phase transitions.',
      'Determine reaction enthalpy via Hess law, standard enthalpies of formation (products minus reactants), or bond energies (broken minus formed).',
      'Divide measured heat by moles of limiting reactant to report molar delta H with the correct sign and kilojoules-per-mole units.',
    ],
  },
  {
    unitNumber: 7,
    domainId: 'equilibrium',
    title: 'Reaction quotient Q vs. K, ICE tables, and Le Chatelier flow',
    nodes: [
      { id: 'expression', label: 'Write Q and K excluding pure solids and liquids' },
      { id: 'compare', label: 'Compare Q to K to predict forward or reverse shift' },
      { id: 'ice', label: 'Set up ICE table with stoichiometry & solve for x' },
      { id: 'stress', label: 'Distinguish concentration/pressure shifts from T changing K' },
    ],
    textEquivalent: [
      'Write the mass-action expression Q or K using aqueous concentrations or partial pressures raised to stoichiometric coefficients, omitting pure solids and liquids.',
      'Compare initial Q to K: Q < K shifts forward toward products, Q > K shifts reverse toward reactants, and Q = K is at dynamic equilibrium.',
      'Use an ICE table (and verify any small-x approximation) to compute equilibrium concentrations or molar solubility from Ksp.',
      'Concentration, volume, and common-ion stresses change Q while K stays constant; only changing temperature alters the equilibrium constant K itself.',
    ],
  },
  {
    unitNumber: 8,
    domainId: 'acids-and-bases',
    title: 'Acid-base strength, titration curve, and buffer-capacity flow',
    nodes: [
      { id: 'species', label: 'Identify strong vs. weak acid/base & conjugate pair' },
      { id: 'stoich', label: 'Run limiting-reactant neutralization in moles first' },
      { id: 'equil', label: 'Select Ka/Kb ICE, Henderson-Hasselbalch, or hydrolysis' },
      { id: 'curve', label: 'Check half-equivalence (pH=pKa), equivalence pH, & buffer range' },
    ],
    textEquivalent: [
      'Distinguish strong acids and bases that dissociate completely from weak conjugate pairs governed by Ka, Kb, and Kw = Ka Kb.',
      'When acid and base mix, perform stoichiometric neutralization in moles first before applying equilibrium expressions.',
      'Use Henderson-Hasselbalch (pH = pKa + log([A-]/[HA])) inside the buffer region, and conjugate hydrolysis ICE tables at the equivalence point.',
      'Verify that pH equals pKa at half-equivalence, equivalence pH reflects the surviving conjugate ion, and higher conjugate concentrations raise buffer capacity.',
    ],
  },
  {
    unitNumber: 9,
    domainId: 'thermodynamics-and-electrochemistry',
    title: 'Entropy, Gibbs free energy, equilibrium K, and electrochemical cell flow',
    nodes: [
      { id: 'deltaG', label: 'Combine delta H and delta S via delta G = delta H - T delta S' },
      { id: 'linkK', label: 'Connect delta G° = -RT ln K to thermodynamic favorability' },
      { id: 'cell', label: 'Compute E°_cell = E°_cathode - E°_anode & delta G° = -nFE°' },
      { id: 'faraday', label: 'Use Nernst trends for Q and I*t = nF for electrolysis' },
    ],
    textEquivalent: [
      'Evaluate enthalpy and entropy signs in delta G = delta H - T delta S to decide whether a process is favorable at all, high, low, or no temperatures.',
      'Link standard free energy to equilibrium via delta G° = -RT ln K (delta G° < 0 corresponds to K > 1), while recognizing kinetics still controls rate.',
      'In galvanic cells, reduction occurs at the cathode and oxidation at the anode with positive E°_cell and negative delta G° = -nFE°.',
      'Use Q vs. 1 to predict Nernst voltage shifts under nonstandard concentrations, and use charge Q = I t with Faraday constant F for electrolytic stoichiometry.',
    ],
  },
];

function buildApChemistryDiagrams(chapters) {
  const edgeLabels = ['establishes', 'determines', 'predicts'];
  const diagrams = AP_CHEMISTRY_DIAGRAM_SPECS.map((spec, index) => {
    const chapter = chapters[index];
    const nodes = spec.nodes.map((node, nodeIndex) => ({
      id: node.id,
      label: node.label,
      detail: spec.textEquivalent[nodeIndex] || node.label,
    }));
    const edges = [0, 1, 2].map((edgeIndex) => ({
      id: `${nodes[edgeIndex].id}-to-${nodes[edgeIndex + 1].id}`,
      from: nodes[edgeIndex].id,
      to: nodes[edgeIndex + 1].id,
      label: edgeLabels[edgeIndex],
    }));
    return {
      id: `ap-chem-flow-${String(spec.unitNumber).padStart(2, '0')}`,
      chapterId: chapter.id,
      domainId: spec.domainId,
      title: spec.title,
      type: 'optional-concept-flow',
      diagramType: 'directed-concept-flow',
      learnerPurpose: `Connect particulate-level AP Chemistry Unit ${spec.unitNumber} principles to quantitative and macroscopic predictions.`,
      caption: `An original AP Chemistry Unit ${spec.unitNumber} concept flow summarizing ${spec.title.toLowerCase()}.`,
      spec: {
        format: 'alloflow-diagram-v1',
        layout: 'left-to-right',
        nodes,
        edges,
        renderingHints: {
          connectorStyle: 'arrow',
          allowHorizontalScroll: true,
          minimumTextSize: 'user-scalable',
        },
      },
      accessibility: {
        essentialVisualContent: false,
        shortAlt: `Four-step AP Chemistry Unit ${spec.unitNumber} concept flow: ${nodes.map((n) => n.label).join(' -> ')}.`,
        longDescription: `Read from left to right. ${spec.textEquivalent.join(' ')}`,
        textEquivalent: spec.textEquivalent,
        readingOrder: nodes.map((n) => n.id),
        colorIndependent: true,
        shapeIndependentLabels: true,
        fallbackMode: 'ordered-text-equivalent',
        independentReviewStatus: 'pending',
      },
      unscored: true,
      officialItem: false,
      releaseEligible: false,
      reviewStatus: 'source-reviewed-editorial-pass',
      expertReviewStatus: 'pending',
      rights: {
        originalSpecification: true,
        officialFigureReproduced: false,
        sourceFigureReproduced: false,
        thirdPartyArtworkIncluded: false,
      },
    };
  });

  const diagramPlacements = AP_CHEMISTRY_DIAGRAM_SPECS.map((spec, index) => ({
    id: `ap-chem-placement-${String(spec.unitNumber).padStart(2, '0')}`,
    diagramId: diagrams[index].id,
    chapterId: chapters[index].id,
    sectionId: chapters[index].sections[0].id,
    position: 'after-section-content',
    learnerPurpose: diagrams[index].learnerPurpose,
    fallbackMode: 'diagram-text-equivalent',
    requiredForComprehension: false,
    unscored: true,
    reviewStatus: 'source-reviewed-editorial-pass',
    accessibilityReviewStatus: 'pending-independent-review',
    releaseEligible: false,
  }));

  return { diagrams, diagramPlacements };
}

module.exports = { AP_CHEMISTRY_DIAGRAM_SPECS, buildApChemistryDiagrams };
