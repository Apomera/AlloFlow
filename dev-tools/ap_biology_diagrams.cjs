'use strict';
// Original text-first accessible reasoning-flow diagrams for AP Biology (1 per unit).
// Optional study aids with ordered text equivalents; not required for comprehension,
// not official College Board figures, unscored, and release-blocked.

const AP_BIOLOGY_DIAGRAM_SPECS = [
  {
    unitNumber: 1,
    domainId: 'chemistry-of-life',
    title: 'Water polarity and macromolecule structure-to-function flow',
    nodes: [
      { id: 'bonds', label: 'Polar covalent bonds & hydrogen bonding' },
      { id: 'monomers', label: 'Dehydration synthesis links monomers' },
      { id: 'folding', label: 'R-group & base interactions set 3D shape' },
      { id: 'function', label: 'Shape & polarity govern biological function' },
    ],
    textEquivalent: [
      'Polar covalent bonds create partial charges and hydrogen bonding networks in water and functional groups.',
      'Dehydration synthesis removes water to join monomers into directional polymers, whereas hydrolysis breaks them.',
      'Noncovalent interactions and covalent disulfide bridges fold proteins and pair nucleic acid strands into specific 3D structures.',
      'Changing monomer sequence, pH, or temperature alters structure and therefore alters catalytic, transport, or information function.',
    ],
  },
  {
    unitNumber: 2,
    domainId: 'cells',
    title: 'Membrane selectivity, compartmentalization, and water potential flow',
    nodes: [
      { id: 'bilayer', label: 'Amphipathic phospholipid bilayer + proteins' },
      { id: 'gradient', label: 'Solute & electrochemical gradients' },
      { id: 'transport', label: 'Passive diffusion vs. ATP-driven active transport' },
      { id: 'homeostasis', label: 'Water potential & compartmentalized homeostasis' },
    ],
    textEquivalent: [
      'The amphipathic phospholipid bilayer restricts large or charged solutes while embedded proteins provide selective channels and pumps.',
      'Concentration, charge, and solute gradients establish the direction of passive movement and the solute potential component of water potential.',
      'Passive transport moves solutes down gradients without direct ATP input, whereas active transport uses energy to move solutes against gradients.',
      'Net water flows from higher to lower water potential, and eukaryotic organelles maintain distinct internal environments for incompatible reactions.',
    ],
  },
  {
    unitNumber: 3,
    domainId: 'cellular-energetics',
    title: 'Enzyme catalysis and coupled energy-transfer flow',
    nodes: [
      { id: 'enzyme', label: 'Enzyme lowers activation energy via active site' },
      { id: 'capture', label: 'Light reactions & oxidation harvest high-energy electrons' },
      { id: 'chemiosmosis', label: 'Proton gradient drives ATP synthase' },
      { id: 'coupling', label: 'ATP & electron carriers power cellular work' },
    ],
    textEquivalent: [
      'Enzymes stabilize transition states to lower activation energy without changing overall free-energy change, and respond to inhibitors, pH, and temperature.',
      'Photosynthesis captures light energy into ATP and NADPH, while cellular respiration oxidizes organic molecules to load NADH and FADH2.',
      'Electron transport chains pump protons across thylakoid or inner mitochondrial membranes so chemiosmosis drives ATP synthesis.',
      'Cells couple exergonic ATP hydrolysis to endergonic biosynthesis, transport, and carbon fixation while conserving matter and energy.',
    ],
  },
  {
    unitNumber: 4,
    domainId: 'cell-communication-and-cell-cycle',
    title: 'Signal transduction, feedback, and cell-cycle checkpoint flow',
    nodes: [
      { id: 'reception', label: 'Ligand binds specific membrane or intracellular receptor' },
      { id: 'transduction', label: 'Phosphorylation cascade & second messengers amplify' },
      { id: 'response', label: 'Gene expression, enzyme activity, or checkpoint control' },
      { id: 'feedback', label: 'Negative or positive feedback regulates the system' },
    ],
    textEquivalent: [
      'A chemical signal binds a complementary receptor on the plasma membrane or inside the target cell, triggering a conformational change.',
      'Relay proteins, phosphorylation cascades, and second messengers amplify and route the signal to specific intracellular targets.',
      'Target responses alter enzyme activity, open channels, change transcription, or advance cyclin-CDK cell-cycle checkpoints (G1, G2, M).',
      'Negative feedback restores a set point, positive feedback amplifies a transition, and checkpoint failure permits unregulated division.',
    ],
  },
  {
    unitNumber: 5,
    domainId: 'heredity',
    title: 'Meiotic variation and inheritance-pattern evidence flow',
    nodes: [
      { id: 'meiosis', label: 'Crossing over & independent assortment in Meiosis I' },
      { id: 'gametes', label: 'Haploid gametes unite randomly at fertilization' },
      { id: 'ratios', label: 'Compare observed progeny to expected ratios' },
      { id: 'model', label: 'Distinguish Mendelian, linked, sex-linked, or non-nuclear' },
    ],
    textEquivalent: [
      'Meiosis halves chromosome number while crossing over and independent assortment generate genetically diverse combinations of alleles.',
      'Random fertilization combines haploid gametes to produce diploid offspring with predictable probability distributions.',
      'Chi-square tests compare observed phenotype counts against expected genetic ratios to evaluate whether chance alone explains deviations.',
      'Systematic departures point to gene linkage, sex-linked inheritance, epistasis, incomplete dominance, environmental effects, or mitochondrial inheritance.',
    ],
  },
  {
    unitNumber: 6,
    domainId: 'gene-expression-and-regulation',
    title: 'Replication, gene expression, and regulatory control flow',
    nodes: [
      { id: 'dna', label: 'Semiconservative 5-to-3 DNA replication' },
      { id: 'transcription', label: 'RNA polymerase transcribes & eukaryotic mRNA processes' },
      { id: 'translation', label: 'Ribosome & tRNAs translate codons into polypeptide' },
      { id: 'regulation', label: 'Operons, transcription factors, & epigenetics tune output' },
    ],
    textEquivalent: [
      'DNA polymerases synthesize complementary strands 5-prime to 3-prime on leading and lagging strands using base-pairing rules.',
      'RNA polymerase transcribes DNA into RNA; eukaryotes add a 5-prime cap, poly-A tail, and splice introns to generate mature or alternative mRNAs.',
      'Ribosomes read mRNA codons sequentially with charged tRNAs to assemble amino acids into polypeptides whose mutations vary by codon impact.',
      'Prokaryotic operons and eukaryotic chromatin remodeling, enhancers, and microRNAs regulate when and how much protein each cell produces.',
    ],
  },
  {
    unitNumber: 7,
    domainId: 'natural-selection',
    title: 'Population variation, evolutionary mechanisms, and phylogeny flow',
    nodes: [
      { id: 'variation', label: 'Random mutation & recombination create heritable variation' },
      { id: 'mechanisms', label: 'Selection, genetic drift, & gene flow shift allele frequencies' },
      { id: 'equilibrium', label: 'Test allele frequencies against Hardy-Weinberg null model' },
      { id: 'speciation', label: 'Reproductive isolation drives divergence & cladograms' },
    ],
    textEquivalent: [
      'Mutations and sexual recombination arise randomly with respect to need, supplying heritable phenotypic variation within a population.',
      'Natural selection favors traits increasing relative reproductive success in a given environment, while drift and gene flow alter frequencies non-adaptively.',
      'Hardy-Weinberg equations provide a non-evolving baseline; sustained departures indicate at least one evolutionary mechanism is acting.',
      'Reproductive barriers split lineages into distinct species, whose shared derived characters and molecular data support phylogenetic hypotheses.',
    ],
  },
  {
    unitNumber: 8,
    domainId: 'ecology',
    title: 'Energy flow, population dynamics, and community stability flow',
    nodes: [
      { id: 'energy', label: 'Primary producers fix energy; ~10% transfers per trophic level' },
      { id: 'populations', label: 'Exponential vs. carrying-capacity-limited logistic growth' },
      { id: 'interactions', label: 'Competition, predation, mutualism, & keystone effects' },
      { id: 'resilience', label: 'Biodiversity & disturbance shape ecosystem stability' },
    ],
    textEquivalent: [
      'Autotrophs convert solar or chemical energy into biomass while heat loss at each trophic step limits food-chain energy transfer.',
      'Unconstrained populations grow exponentially, whereas density-dependent limits slow growth toward carrying capacity K in logistic models.',
      'Species interactions—including keystone predators and invasive competitors—restructure trophic cascades and realized niches.',
      'Higher genetic and species diversity generally buffers ecosystems against environmental disturbances and supports nutrient cycling.',
    ],
  },
];

function buildApBiologyDiagrams(chapters) {
  const edgeLabels = ['shapes', 'drives', 'governs'];
  const diagrams = AP_BIOLOGY_DIAGRAM_SPECS.map((spec, index) => {
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
      id: `ap-bio-flow-${String(spec.unitNumber).padStart(2, '0')}`,
      chapterId: chapter.id,
      domainId: spec.domainId,
      title: spec.title,
      type: 'optional-concept-flow',
      diagramType: 'directed-concept-flow',
      learnerPurpose: `Trace the Unit ${spec.unitNumber} sequence connecting core biological mechanisms from molecular or population inputs to system-level outcomes.`,
      caption: `An original AP Biology Unit ${spec.unitNumber} concept flow summarizing ${spec.title.toLowerCase()}.`,
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
        shortAlt: `Four-step AP Biology Unit ${spec.unitNumber} concept flow: ${nodes.map((n) => n.label).join(' -> ')}.`,
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

  const diagramPlacements = AP_BIOLOGY_DIAGRAM_SPECS.map((spec, index) => ({
    id: `ap-bio-placement-${String(spec.unitNumber).padStart(2, '0')}`,
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

module.exports = { AP_BIOLOGY_DIAGRAM_SPECS, buildApBiologyDiagrams };
