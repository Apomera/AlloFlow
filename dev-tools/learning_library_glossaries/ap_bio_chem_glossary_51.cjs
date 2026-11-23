'use strict';

const AP_BIO_REFS = [
  'https://apcentral.collegeboard.org/media/pdf/ap-biology-course-and-exam-description.pdf',
  'https://apstudents.collegeboard.org/courses/ap-biology',
];

const AP_CHEM_REFS = [
  'https://apcentral.collegeboard.org/media/pdf/ap-chemistry-course-and-exam-description.pdf',
  'https://apstudents.collegeboard.org/courses/ap-chemistry',
];

function makeEntry({
  id,
  term,
  definition,
  aliases,
  chapterId,
  chapterTitle,
  domainId,
  sectionId,
  sectionHeading,
  references,
}) {
  return {
    id,
    term,
    definition,
    aliases,
    chapterIds: [chapterId],
    domainIds: [domainId],
    linkage: {
      occurrences: [
        {
          chapterId,
          chapterTitle,
          domainId,
          domain: chapterTitle,
          sectionId,
          sectionHeading,
        },
      ],
    },
    reviewStatus: 'source-reviewed-editorial-pass',
    references: references.slice(),
  };
}

const ap_biology_foundation_pilot = [
  // Unit 1: Chemistry of Life
  makeEntry({
    id: 'ap-bio-gloss-01',
    term: 'Hydrogen bonding',
    definition:
      'Weak electrostatic attraction between a partially positive hydrogen covalently bonded to O, N, or F and an electronegative atom, giving water cohesion, high specific heat, and stabilizing protein and DNA structure.',
    aliases: ['H-bonding'],
    chapterId: 'ap-bio-ch-01',
    chapterTitle: 'Unit 1: Chemistry of Life',
    domainId: 'chemistry-of-life',
    sectionId: 'ap-bio-ch-01-section-01',
    sectionHeading: 'Water, macromolecules, and structure-function reasoning',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-02',
    term: 'Dehydration synthesis',
    definition:
      'Enzymatic reaction that links monomers into biological polymers such as polysaccharides, proteins, or nucleic acids by forming a covalent bond while removing a water molecule; reversed by hydrolysis.',
    aliases: ['Condensation reaction'],
    chapterId: 'ap-bio-ch-01',
    chapterTitle: 'Unit 1: Chemistry of Life',
    domainId: 'chemistry-of-life',
    sectionId: 'ap-bio-ch-01-section-02',
    sectionHeading: 'Carbohydrates and lipids',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-03',
    term: 'Protein denaturation',
    definition:
      'Loss of a protein’s native tertiary or quaternary three-dimensional structure—and thus biological function—when heat, pH shifts, or salinity disrupt noncovalent R-group interactions while leaving peptide bonds intact.',
    aliases: ['Denaturation'],
    chapterId: 'ap-bio-ch-01',
    chapterTitle: 'Unit 1: Chemistry of Life',
    domainId: 'chemistry-of-life',
    sectionId: 'ap-bio-ch-01-section-03',
    sectionHeading: 'Nucleic acids and proteins',
    references: AP_BIO_REFS,
  }),

  // Unit 2: Cells
  makeEntry({
    id: 'ap-bio-gloss-04',
    term: 'Surface-area-to-volume ratio',
    definition:
      'Quotient of plasma membrane surface area divided by cytoplasmic volume (SA/V); decreases as cell size increases, limiting passive exchange rates and favoring small cells, membrane folding, or compartmentalization.',
    aliases: ['SA/V ratio'],
    chapterId: 'ap-bio-ch-02',
    chapterTitle: 'Unit 2: Cells',
    domainId: 'cells',
    sectionId: 'ap-bio-ch-02-section-01',
    sectionHeading: 'Membranes, transport, and cell size',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-05',
    term: 'Fluid mosaic model',
    definition:
      'Structural model of biological membranes depicting a dynamic phospholipid bilayer embedded with amphipathic proteins, cholesterol buffers, and glycoproteins that allow lateral mobility and selective permeability.',
    aliases: ['Phospholipid bilayer model'],
    chapterId: 'ap-bio-ch-02',
    chapterTitle: 'Unit 2: Cells',
    domainId: 'cells',
    sectionId: 'ap-bio-ch-02-section-02',
    sectionHeading: 'Cell structure, cell size, and the plasma membrane',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-06',
    term: 'Water potential',
    definition:
      'Measure of the potential energy of water per unit volume (Ψ = Ψs + Ψp) that predicts net osmotic flow; water always diffuses passively from regions of higher (less negative) to lower water potential.',
    aliases: ['Ψ'],
    chapterId: 'ap-bio-ch-02',
    chapterTitle: 'Unit 2: Cells',
    domainId: 'cells',
    sectionId: 'ap-bio-ch-02-section-03',
    sectionHeading: 'Tonicity, osmoregulation, and the origins of cells',
    references: AP_BIO_REFS,
  }),

  // Unit 3: Cellular Energetics
  makeEntry({
    id: 'ap-bio-gloss-07',
    term: 'Allosteric regulation',
    definition:
      'Control of enzyme catalysis when a regulatory molecule binds a site distinct from the active site, inducing a conformational shift that stabilizes either the active or inactive state of the enzyme.',
    aliases: ['Allosteric modulation'],
    chapterId: 'ap-bio-ch-03',
    chapterTitle: 'Unit 3: Cellular Energetics',
    domainId: 'cellular-energetics',
    sectionId: 'ap-bio-ch-03-section-01',
    sectionHeading: 'Enzymes, energy, and metabolic pathways',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-08',
    term: 'Calvin cycle',
    definition:
      'Light-independent photosynthetic pathway in the chloroplast stroma where rubisco fixes CO2 into organic intermediates, consuming ATP and NADPH from the light reactions to produce G3P sugars.',
    aliases: ['Light-independent reactions'],
    chapterId: 'ap-bio-ch-03',
    chapterTitle: 'Unit 3: Cellular Energetics',
    domainId: 'cellular-energetics',
    sectionId: 'ap-bio-ch-03-section-02',
    sectionHeading: 'Photosynthesis',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-09',
    term: 'Chemiosmosis',
    definition:
      'Energy-coupling mechanism in which an electrochemical H+ gradient across the inner mitochondrial or thylakoid membrane drives ATP synthesis as protons flow down their gradient through ATP synthase.',
    aliases: ['Proton-motive ATP synthesis'],
    chapterId: 'ap-bio-ch-03',
    chapterTitle: 'Unit 3: Cellular Energetics',
    domainId: 'cellular-energetics',
    sectionId: 'ap-bio-ch-03-section-03',
    sectionHeading: 'Cellular respiration and fermentation',
    references: AP_BIO_REFS,
  }),

  // Unit 4: Cell Communication and Cell Cycle
  makeEntry({
    id: 'ap-bio-gloss-10',
    term: 'Signal transduction pathway',
    definition:
      'Multistep molecular relay converting an extracellular ligand binding a specific receptor into an amplified intracellular response, commonly via G proteins, second messengers such as cAMP, and phosphorylation cascades.',
    aliases: ['Signal transduction'],
    chapterId: 'ap-bio-ch-04',
    chapterTitle: 'Unit 4: Cell Communication and Cell Cycle',
    domainId: 'cell-communication-and-cell-cycle',
    sectionId: 'ap-bio-ch-04-section-01',
    sectionHeading: 'Signal transduction and cell-cycle control',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-11',
    term: 'Negative feedback',
    definition:
      'Homeostatic control loop in which an effector response counteracts the initial stimulus to restore an internal variable toward its set point, such as insulin lowering elevated blood glucose.',
    aliases: ['Negative feedback loop'],
    chapterId: 'ap-bio-ch-04',
    chapterTitle: 'Unit 4: Cell Communication and Cell Cycle',
    domainId: 'cell-communication-and-cell-cycle',
    sectionId: 'ap-bio-ch-04-section-02',
    sectionHeading: 'Feedback and homeostasis',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-12',
    term: 'Cyclin-dependent kinase',
    definition:
      'Regulatory kinase that phosphorylates target proteins to drive progression through cell-cycle checkpoints (G1, G2, M) only when complexed with its periodically synthesized cyclin partner.',
    aliases: ['Cdk'],
    chapterId: 'ap-bio-ch-04',
    chapterTitle: 'Unit 4: Cell Communication and Cell Cycle',
    domainId: 'cell-communication-and-cell-cycle',
    sectionId: 'ap-bio-ch-04-section-03',
    sectionHeading: 'The cell cycle and its regulation',
    references: AP_BIO_REFS,
  }),

  // Unit 5: Heredity
  makeEntry({
    id: 'ap-bio-gloss-13',
    term: 'Crossing over',
    definition:
      'Reciprocal exchange of corresponding DNA segments between nonsister chromatids of homologous chromosomes during prophase I of meiosis, generating recombinant chromatids and increased gametic variation.',
    aliases: ['Genetic recombination'],
    chapterId: 'ap-bio-ch-05',
    chapterTitle: 'Unit 5: Heredity',
    domainId: 'heredity',
    sectionId: 'ap-bio-ch-05-section-01',
    sectionHeading: 'Meiosis, inheritance, and phenotype',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-14',
    term: 'Law of independent assortment',
    definition:
      'Mendelian principle stating that alleles of genes located on different chromosomes segregate independently during metaphase I of meiosis, yielding predictable multi-trait probabilities via the product rule.',
    aliases: ['Independent assortment'],
    chapterId: 'ap-bio-ch-05',
    chapterTitle: 'Unit 5: Heredity',
    domainId: 'heredity',
    sectionId: 'ap-bio-ch-05-section-02',
    sectionHeading: 'Mendelian genetics and probability',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-15',
    term: 'Phenotypic plasticity',
    definition:
      'Capacity of a single genotype to produce distinct observable phenotypes in response to environmental factors such as temperature, nutrition, or soil pH without changing the underlying DNA sequence.',
    aliases: [],
    chapterId: 'ap-bio-ch-05',
    chapterTitle: 'Unit 5: Heredity',
    domainId: 'heredity',
    sectionId: 'ap-bio-ch-05-section-03',
    sectionHeading: 'Non-Mendelian inheritance and environmental effects',
    references: AP_BIO_REFS,
  }),

  // Unit 6: Gene Expression and Regulation
  makeEntry({
    id: 'ap-bio-gloss-16',
    term: 'Semiconservative replication',
    definition:
      'Mechanism of DNA synthesis in which each parental strand serves as a template for DNA polymerase elongating a new complementary 5’→3’ strand, producing daughter duplexes with one old and one new strand.',
    aliases: ['DNA replication'],
    chapterId: 'ap-bio-ch-06',
    chapterTitle: 'Unit 6: Gene Expression and Regulation',
    domainId: 'gene-expression-and-regulation',
    sectionId: 'ap-bio-ch-06-section-01',
    sectionHeading: 'DNA, gene expression, and regulation',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-17',
    term: 'Operon',
    definition:
      'Prokaryotic regulatory cluster comprising a promoter, an operator binding site, and functionally related structural genes transcribed together into one polycistronic mRNA, exemplified by the lac and trp operons.',
    aliases: ['Bacterial operon'],
    chapterId: 'ap-bio-ch-06',
    chapterTitle: 'Unit 6: Gene Expression and Regulation',
    domainId: 'gene-expression-and-regulation',
    sectionId: 'ap-bio-ch-06-section-02',
    sectionHeading: 'Transcription, translation, and gene regulation',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-18',
    term: 'Polymerase chain reaction',
    definition:
      'Cyclic in vitro method using thermal denaturation, sequence-specific primers, and thermostable Taq DNA polymerase to exponentially amplify a targeted DNA segment for electrophoresis or sequencing.',
    aliases: ['PCR'],
    chapterId: 'ap-bio-ch-06',
    chapterTitle: 'Unit 6: Gene Expression and Regulation',
    domainId: 'gene-expression-and-regulation',
    sectionId: 'ap-bio-ch-06-section-03',
    sectionHeading: 'Mutations and biotechnology',
    references: AP_BIO_REFS,
  }),

  // Unit 7: Natural Selection
  makeEntry({
    id: 'ap-bio-gloss-19',
    term: 'Genetic drift',
    definition:
      'Random, non-adaptive changes in population allele frequencies across generations caused by chance sampling, exerting its strongest evolutionary effects in small populations during bottlenecks or founder events.',
    aliases: [],
    chapterId: 'ap-bio-ch-07',
    chapterTitle: 'Unit 7: Natural Selection',
    domainId: 'natural-selection',
    sectionId: 'ap-bio-ch-07-section-01',
    sectionHeading: 'Natural selection, population genetics, and speciation',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-20',
    term: 'Hardy-Weinberg equilibrium',
    definition:
      'Null population-genetics model predicting constant allele and genotype frequencies (p + q = 1; p^2 + 2pq + q^2 = 1) when a population is large, mates randomly, and experiences no mutation, gene flow, or selection.',
    aliases: ['HWE'],
    chapterId: 'ap-bio-ch-07',
    chapterTitle: 'Unit 7: Natural Selection',
    domainId: 'natural-selection',
    sectionId: 'ap-bio-ch-07-section-02',
    sectionHeading: 'Population genetics and Hardy-Weinberg',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-21',
    term: 'Allopatric speciation',
    definition:
      'Divergence of one ancestral population into reproductively isolated species after a geographic barrier interrupts gene flow, allowing independent mutation, genetic drift, and natural selection to accumulate differences.',
    aliases: ['Geographic speciation'],
    chapterId: 'ap-bio-ch-07',
    chapterTitle: 'Unit 7: Natural Selection',
    domainId: 'natural-selection',
    sectionId: 'ap-bio-ch-07-section-03',
    sectionHeading: 'Evidence, phylogeny, speciation, and the origin of life',
    references: AP_BIO_REFS,
  }),

  // Unit 8: Ecology
  makeEntry({
    id: 'ap-bio-gloss-22',
    term: 'Trophic efficiency',
    definition:
      'Percentage of net chemical energy transferred from one trophic level to the next (typically about 10%), because most assimilated energy is dissipated as metabolic heat during respiration or remains unconsumed.',
    aliases: ['10% rule'],
    chapterId: 'ap-bio-ch-08',
    chapterTitle: 'Unit 8: Ecology',
    domainId: 'ecology',
    sectionId: 'ap-bio-ch-08-section-01',
    sectionHeading: 'Energy flow, populations, and ecosystems',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-23',
    term: 'Carrying capacity',
    definition:
      'Maximum population size (K) an environment can sustainably support over time, causing logistic growth (dN/dt = rmax N((K - N)/K)) to decelerate and plateau as density-dependent limiting factors intensify.',
    aliases: ['K'],
    chapterId: 'ap-bio-ch-08',
    chapterTitle: 'Unit 8: Ecology',
    domainId: 'ecology',
    sectionId: 'ap-bio-ch-08-section-02',
    sectionHeading: 'Population and community ecology',
    references: AP_BIO_REFS,
  }),
  makeEntry({
    id: 'ap-bio-gloss-24',
    term: 'Ecological succession',
    definition:
      'Directional change in community species composition after disturbance, progressing from hardy pioneer organisms to more diverse assemblages via primary succession on bare substrate or faster secondary succession on intact soil.',
    aliases: ['Primary and secondary succession'],
    chapterId: 'ap-bio-ch-08',
    chapterTitle: 'Unit 8: Ecology',
    domainId: 'ecology',
    sectionId: 'ap-bio-ch-08-section-03',
    sectionHeading: 'Biodiversity and ecosystem disruption',
    references: AP_BIO_REFS,
  }),
];

const ap_chemistry_foundation_pilot = [
  // Unit 1: Atomic Structure and Properties
  makeEntry({
    id: 'ap-chem-gloss-01',
    term: 'Photoelectron spectroscopy',
    definition:
      'Spectroscopic method measuring the binding energy needed to eject electrons from gaseous atoms; peak positions reflect subshell Coulombic attraction and relative peak heights directly indicate electron occupancy.',
    aliases: ['PES'],
    chapterId: 'ap-chem-ch-01',
    chapterTitle: 'Unit 1: Atomic Structure and Properties',
    domainId: 'atomic-structure-and-properties',
    sectionId: 'ap-chem-ch-01-section-01',
    sectionHeading: 'Atomic models and quantitative composition',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-02',
    term: 'Effective nuclear charge',
    definition:
      'Net positive nuclear attraction (Zeff) experienced by a valence electron after accounting for core-electron shielding, explaining decreasing atomic radius and rising ionization energy across a period.',
    aliases: ['Zeff'],
    chapterId: 'ap-chem-ch-01',
    chapterTitle: 'Unit 1: Atomic Structure and Properties',
    domainId: 'atomic-structure-and-properties',
    sectionId: 'ap-chem-ch-01-section-02',
    sectionHeading: 'Atomic structure and electron configuration',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-03',
    term: 'First ionization energy',
    definition:
      'Minimum energy required to remove one mole of the highest-energy electrons from gaseous ground-state atoms; generally increases across a period with higher Zeff and decreases down a group as distance increases.',
    aliases: ['IE1', 'Ionization energy'],
    chapterId: 'ap-chem-ch-01',
    chapterTitle: 'Unit 1: Atomic Structure and Properties',
    domainId: 'atomic-structure-and-properties',
    sectionId: 'ap-chem-ch-01-section-03',
    sectionHeading: 'Periodic trends and valence electrons',
    references: AP_CHEM_REFS,
  }),

  // Unit 2: Compound Structure and Properties
  makeEntry({
    id: 'ap-chem-gloss-04',
    term: 'Resonance structure',
    definition:
      'One of two or more valid Lewis diagrams differing only in the placement of delocalized pi or lone-pair electrons; the actual species is a single hybrid with identical intermediate bond lengths and bond orders.',
    aliases: ['Resonance hybrid'],
    chapterId: 'ap-chem-ch-02',
    chapterTitle: 'Unit 2: Compound Structure and Properties',
    domainId: 'compound-structure-and-properties',
    sectionId: 'ap-chem-ch-02-section-01',
    sectionHeading: 'Bonding and molecular structure',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-05',
    term: 'Bond dissociation energy',
    definition:
      'Endothermic energy required to break one mole of a specific covalent bond in the gas phase; higher bond order and shorter internuclear bond length yield greater bond strength and larger dissociation energy.',
    aliases: ['Bond energy'],
    chapterId: 'ap-chem-ch-02',
    chapterTitle: 'Unit 2: Compound Structure and Properties',
    domainId: 'compound-structure-and-properties',
    sectionId: 'ap-chem-ch-02-section-02',
    sectionHeading: 'Types of bonds and bond energy',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-06',
    term: 'Lattice energy',
    definition:
      'Electrostatic energy stabilizing an ionic solid relative to separated gaseous ions; grows in magnitude with higher ion charges and smaller ionic radii according to Coulomb’s law, raising melting points.',
    aliases: ['Crystal lattice energy'],
    chapterId: 'ap-chem-ch-02',
    chapterTitle: 'Unit 2: Compound Structure and Properties',
    domainId: 'compound-structure-and-properties',
    sectionId: 'ap-chem-ch-02-section-03',
    sectionHeading: 'Ionic and metallic solids, and alloys',
    references: AP_CHEM_REFS,
  }),

  // Unit 3: Properties of Substances and Mixtures
  makeEntry({
    id: 'ap-chem-gloss-07',
    term: 'London dispersion forces',
    definition:
      'Intermolecular attractions arising from temporary, induced dipoles present in all atoms and molecules; strengthen with larger, more polarizable electron clouds and greater contact surface area.',
    aliases: ['LDF', 'Dispersion forces'],
    chapterId: 'ap-chem-ch-03',
    chapterTitle: 'Unit 3: Properties of Substances and Mixtures',
    domainId: 'properties-of-substances-and-mixtures',
    sectionId: 'ap-chem-ch-03-section-01',
    sectionHeading: 'Particles, phases, solutions, and light',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-08',
    term: 'Kinetic molecular theory',
    definition:
      'Microscopic model explaining ideal gas behavior (PV = nRT) through negligible particle volume, elastic collisions, zero intermolecular attractions, and average kinetic energy proportional solely to Kelvin temperature.',
    aliases: ['KMT'],
    chapterId: 'ap-chem-ch-03',
    chapterTitle: 'Unit 3: Properties of Substances and Mixtures',
    domainId: 'properties-of-substances-and-mixtures',
    sectionId: 'ap-chem-ch-03-section-02',
    sectionHeading: 'Gases: the ideal gas law and kinetic molecular theory',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-09',
    term: 'Beer-Lambert law',
    definition:
      'Quantitative spectroscopic relation (A = εbc) linking solution absorbance (A) linearly to molar absorptivity (ε), cuvette path length (b), and analyte molarity (c) at an optimal wavelength.',
    aliases: ['Beer’s law'],
    chapterId: 'ap-chem-ch-03',
    chapterTitle: 'Unit 3: Properties of Substances and Mixtures',
    domainId: 'properties-of-substances-and-mixtures',
    sectionId: 'ap-chem-ch-03-section-03',
    sectionHeading: 'Solutions, separations, and spectroscopy',
    references: AP_CHEM_REFS,
  }),

  // Unit 4: Chemical Reactions
  makeEntry({
    id: 'ap-chem-gloss-10',
    term: 'Net ionic equation',
    definition:
      'Balanced chemical equation displaying only the ions and molecules directly transformed during an aqueous reaction while canceling unchanged spectator ions that appear identically on both sides.',
    aliases: ['NIE'],
    chapterId: 'ap-chem-ch-04',
    chapterTitle: 'Unit 4: Chemical Reactions',
    domainId: 'chemical-reactions',
    sectionId: 'ap-chem-ch-04-section-01',
    sectionHeading: 'Representing chemical reactions',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-11',
    term: 'Limiting reactant',
    definition:
      'Reactant consumed completely first according to balanced stoichiometric mole ratios, thereby capping the maximum theoretical yield of product while leaving all other reactants in excess.',
    aliases: ['Limiting reagent'],
    chapterId: 'ap-chem-ch-04',
    chapterTitle: 'Unit 4: Chemical Reactions',
    domainId: 'chemical-reactions',
    sectionId: 'ap-chem-ch-04-section-02',
    sectionHeading: 'Stoichiometry and titration',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-12',
    term: 'Redox reaction',
    definition:
      'Electron-transfer reaction in which the reducing agent is oxidized (loses electrons, increasing oxidation number) while the oxidizing agent is simultaneously reduced (gains electrons, decreasing oxidation number).',
    aliases: ['Oxidation-reduction reaction'],
    chapterId: 'ap-chem-ch-04',
    chapterTitle: 'Unit 4: Chemical Reactions',
    domainId: 'chemical-reactions',
    sectionId: 'ap-chem-ch-04-section-03',
    sectionHeading: 'Reaction types: acid-base and redox',
    references: AP_CHEM_REFS,
  }),

  // Unit 5: Kinetics
  makeEntry({
    id: 'ap-chem-gloss-13',
    term: 'Rate law',
    definition:
      'Experimentally determined expression (rate = k[A]^m[B]^n) linking reaction rate to reactant concentrations raised to their reaction orders, where the temperature-dependent rate constant k reflects the activation barrier.',
    aliases: ['Differential rate law'],
    chapterId: 'ap-chem-ch-05',
    chapterTitle: 'Unit 5: Kinetics',
    domainId: 'kinetics',
    sectionId: 'ap-chem-ch-05-section-01',
    sectionHeading: 'Reaction rates and mechanisms',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-14',
    term: 'Activation energy',
    definition:
      'Minimum kinetic energy (Ea) that colliding reactant particles must supply in an effective orientation to reach the high-energy transition state and convert into products.',
    aliases: ['Ea'],
    chapterId: 'ap-chem-ch-05',
    chapterTitle: 'Unit 5: Kinetics',
    domainId: 'kinetics',
    sectionId: 'ap-chem-ch-05-section-02',
    sectionHeading: 'Collision model and reaction energy profiles',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-15',
    term: 'Rate-determining step',
    definition:
      'Slowest elementary step in a multistep reaction mechanism that serves as the kinetic bottleneck and dictates the overall rate law; catalysts speed reactions by introducing an alternate lower-Ea pathway.',
    aliases: ['RDS', 'Slow step'],
    chapterId: 'ap-chem-ch-05',
    chapterTitle: 'Unit 5: Kinetics',
    domainId: 'kinetics',
    sectionId: 'ap-chem-ch-05-section-03',
    sectionHeading: 'Reaction mechanisms and catalysis',
    references: AP_CHEM_REFS,
  }),

  // Unit 6: Thermochemistry
  makeEntry({
    id: 'ap-chem-gloss-16',
    term: 'Enthalpy of reaction',
    definition:
      'Heat exchanged between a chemical system and its surroundings at constant pressure (ΔHrxn); negative values denote exothermic heat release to the surroundings and positive values denote endothermic heat absorption.',
    aliases: ['ΔHrxn', 'Heat of reaction'],
    chapterId: 'ap-chem-ch-06',
    chapterTitle: 'Unit 6: Thermochemistry',
    domainId: 'thermochemistry',
    sectionId: 'ap-chem-ch-06-section-01',
    sectionHeading: 'Energy transfer and enthalpy',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-17',
    term: 'Calorimetry',
    definition:
      'Experimental method for quantifying heat flow in a chemical or physical change via q = mcΔT, applying energy conservation so heat lost by the system equals heat gained by the solution (qsys = -qsurr).',
    aliases: ['Constant-pressure calorimetry'],
    chapterId: 'ap-chem-ch-06',
    chapterTitle: 'Unit 6: Thermochemistry',
    domainId: 'thermochemistry',
    sectionId: 'ap-chem-ch-06-section-02',
    sectionHeading: 'Calorimetry and the energy of phase changes',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-18',
    term: 'Hess’s law',
    definition:
      'Thermochemical principle stating that because enthalpy is a path-independent state function, the overall ΔH°rxn equals the algebraic sum of ΔH° values for any set of steps summing to the target equation.',
    aliases: ['Hess law'],
    chapterId: 'ap-chem-ch-06',
    chapterTitle: 'Unit 6: Thermochemistry',
    domainId: 'thermochemistry',
    sectionId: 'ap-chem-ch-06-section-03',
    sectionHeading: 'Enthalpy of reaction: bond enthalpies, formation, and Hess’s law',
    references: AP_CHEM_REFS,
  }),

  // Unit 7: Equilibrium
  makeEntry({
    id: 'ap-chem-gloss-19',
    term: 'Le Chatelier’s principle',
    definition:
      'Predictive rule stating that if a system at dynamic equilibrium is disturbed by changing concentration, partial pressure, volume, or temperature, the reaction shifts in the direction that partially opposes the stress.',
    aliases: ['Le Chatelier principle'],
    chapterId: 'ap-chem-ch-07',
    chapterTitle: 'Unit 7: Equilibrium',
    domainId: 'equilibrium',
    sectionId: 'ap-chem-ch-07-section-01',
    sectionHeading: 'Dynamic equilibrium and response to stress',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-20',
    term: 'Reaction quotient',
    definition:
      'Instantaneous product-to-reactant ratio (Q) written identically to the equilibrium expression K; comparing Q to K predicts shift direction (Q < K proceeds forward, Q > K reverses, and Q = K at equilibrium).',
    aliases: ['Q'],
    chapterId: 'ap-chem-ch-07',
    chapterTitle: 'Unit 7: Equilibrium',
    domainId: 'equilibrium',
    sectionId: 'ap-chem-ch-07-section-02',
    sectionHeading: 'Calculating and interpreting the equilibrium constant',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-21',
    term: 'Common-ion effect',
    definition:
      'Reduction in the molar solubility of a sparingly soluble ionic salt when dissolved in a solution already containing one of its constituent ions, shifting the Ksp equilibrium back toward solid precipitate.',
    aliases: [],
    chapterId: 'ap-chem-ch-07',
    chapterTitle: 'Unit 7: Equilibrium',
    domainId: 'equilibrium',
    sectionId: 'ap-chem-ch-07-section-03',
    sectionHeading: 'Solubility equilibria and the common-ion effect',
    references: AP_CHEM_REFS,
  }),

  // Unit 8: Acids and Bases
  makeEntry({
    id: 'ap-chem-gloss-22',
    term: 'Brønsted-Lowry conjugate pair',
    definition:
      'Acid-base pair differing by a single proton (H+): the acid donates H+ to generate its conjugate base, while the base accepts H+ to form its conjugate acid, with stronger acids paired to weaker conjugate bases.',
    aliases: ['Conjugate acid-base pair'],
    chapterId: 'ap-chem-ch-08',
    chapterTitle: 'Unit 8: Acids and Bases',
    domainId: 'acids-and-bases',
    sectionId: 'ap-chem-ch-08-section-01',
    sectionHeading: 'Proton transfer and aqueous equilibria',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-23',
    term: 'Half-equivalence point',
    definition:
      'Stage in a weak acid–strong base titration where half of the weak acid has been neutralized, making [HA] = [A-] so that pH equals pKa and the solution exhibits optimal buffering against pH shifts.',
    aliases: ['Titration midpoint'],
    chapterId: 'ap-chem-ch-08',
    chapterTitle: 'Unit 8: Acids and Bases',
    domainId: 'acids-and-bases',
    sectionId: 'ap-chem-ch-08-section-02',
    sectionHeading: 'Acid-base titrations and the molecular structure of acids',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-24',
    term: 'Buffer capacity',
    definition:
      'Quantitative capacity of a conjugate weak acid-base buffer to resist pH changes upon adding strong acid or base; increases with higher absolute concentrations of both buffer components near pH = pKa.',
    aliases: [],
    chapterId: 'ap-chem-ch-08',
    chapterTitle: 'Unit 8: Acids and Bases',
    domainId: 'acids-and-bases',
    sectionId: 'ap-chem-ch-08-section-03',
    sectionHeading: 'Buffers: pKa, Henderson-Hasselbalch, capacity, and solubility',
    references: AP_CHEM_REFS,
  }),

  // Unit 9: Thermodynamics and Electrochemistry
  makeEntry({
    id: 'ap-chem-gloss-25',
    term: 'Gibbs free energy',
    definition:
      'Thermodynamic state function (ΔG° = ΔH° - TΔS°) predicting reaction favorability at constant temperature and pressure; ΔG° < 0 denotes a product-favored process (K > 1) whereas ΔG° > 0 is reactant-favored.',
    aliases: ['ΔG°', 'Free energy'],
    chapterId: 'ap-chem-ch-09',
    chapterTitle: 'Unit 9: Thermodynamics and Electrochemistry',
    domainId: 'thermodynamics-and-electrochemistry',
    sectionId: 'ap-chem-ch-09-section-01',
    sectionHeading: 'Free energy and electron transfer',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-26',
    term: 'Thermodynamic favorability',
    definition:
      'Tendency of a chemical process to proceed spontaneously toward products (ΔG° < 0, K > 1, E°cell > 0); independent of reaction rate, since a favored reaction may still be slow under kinetic control.',
    aliases: ['Spontaneity'],
    chapterId: 'ap-chem-ch-09',
    chapterTitle: 'Unit 9: Thermodynamics and Electrochemistry',
    domainId: 'thermodynamics-and-electrochemistry',
    sectionId: 'ap-chem-ch-09-section-02',
    sectionHeading: 'Free energy, equilibrium, and coupled reactions',
    references: AP_CHEM_REFS,
  }),
  makeEntry({
    id: 'ap-chem-gloss-27',
    term: 'Galvanic cell',
    definition:
      'Thermodynamically favored electrochemical cell (E°cell > 0, ΔG° < 0) where oxidation at the anode and reduction at the cathode drive electrons through an external wire while a salt bridge preserves electroneutrality.',
    aliases: ['Voltaic cell'],
    chapterId: 'ap-chem-ch-09',
    chapterTitle: 'Unit 9: Thermodynamics and Electrochemistry',
    domainId: 'thermodynamics-and-electrochemistry',
    sectionId: 'ap-chem-ch-09-section-03',
    sectionHeading: 'Electrochemical cells and electrolysis',
    references: AP_CHEM_REFS,
  }),
];

module.exports = {
  ap_biology_foundation_pilot,
  ap_chemistry_foundation_pilot,
};
