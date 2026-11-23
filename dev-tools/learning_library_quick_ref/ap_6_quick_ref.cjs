'use strict';

const ap_biology_foundation_pilot = [
  {
    id: 'ap-bio-reference-01',
    domainId: 'chemistry-of-life',
    domainLabel: 'Chemistry of Life',
    title: 'Water Properties & Macromolecule Structure',
    purpose: 'Anchors how hydrogen bonding, polymer assembly, and directional monomer linkages dictate biological structure and function on AP Biology items.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Identify whether the prompt focuses on polar water interactions or covalent linkages inside a specific macromolecule class.',
      'Check polymer directionality (N-terminus to C-terminus for polypeptides; 5\' to 3\' for nucleic acids) before interpreting structural diagrams.',
      'Trace how a change in R-group polarity, charge, or pH alters tertiary folding rather than primary amino acid sequence.'
    ],
    formulas: [
      'Water properties from H-bonding: cohesion (transpiration pull), adhesion, high specific heat, evaporative cooling, and lower solid density (ice floats).',
      'Dehydration synthesis removes H2O to join monomers (glycosidic, ester, peptide, phosphodiester bonds); hydrolysis consumes H2O to cleave polymers.',
      'Protein hierarchy: primary (peptide bonds), secondary (backbone H-bonds: alpha-helices/beta-sheets), tertiary (R-group interactions), quaternary (multi-subunit).',
      'Nucleic acids: antiparallel DNA strands pair A-T (2 H-bonds) and G-C (3 H-bonds); RNA uses ribose, uracil, and typically folds single-stranded.'
    ],
    decisionRules: [
      'When you see a point mutation replacing a hydrophilic charged R-group with a nonpolar R-group → predict disrupted surface folding or altered active-site binding.',
      'When you see a double-stranded DNA sample with a higher G-C percentage → choose a higher melting temperature due to more hydrogen bonds per base pair.',
      'When you see a lipid with cis double bonds in its hydrocarbon tails → interpret kinks that prevent tight packing and increase membrane fluidity.',
      'When you see a coastal climate moderating temperature swings or organisms cooling via sweating → attribute the effect to hydrogen bonds requiring high heat energy to break.'
    ],
    cautions: [
      'Hydrogen bonds between water molecules or DNA base pairs are intermolecular/noncovalent attractions, not covalent bonds within a single water molecule.',
      'Denaturation unfolds secondary, tertiary, and quaternary protein structure by disrupting weak R-group/backbone interactions, leaving primary peptide bonds intact.',
      'Lipids are hydrophobic macromolecules assembled from glycerol and fatty acids (or steroid rings), not true repeating-monomer polymers.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-02',
    domainId: 'cells',
    domainLabel: 'Cells',
    title: 'Compartmentalization, Transport & Water Potential',
    purpose: 'Links organelle trafficking, surface-area-to-volume limits, membrane permeability, and quantitative water potential calculations.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Determine whether solute movement goes down its electrochemical gradient (passive) or against it using ATP or a coupled gradient (active).',
      'Check if solutes are permeable or impermeable to the membrane before predicting net osmotic water movement.',
      'Verify temperature is converted to Kelvin (K = °C + 273) and ionization constant i matches electrolyte dissociation before solving water potential.'
    ],
    formulas: [
      'Surface-area-to-volume ratios: cube SA/V = 6/s and sphere SA/V = 3/r; smaller cells or folded membranes maximize exchange efficiency.',
      'Water potential: Ψ = Ψp + Ψs, where solute potential Ψs = −iCRT with R = 0.0831 L·bar/(mol·K) and water always flows from higher Ψ to lower Ψ.',
      'Endomembrane export pathway: rough ER ribosome synthesis → transport vesicle → cis-to-trans Golgi modification → secretory vesicle exocytosis.',
      'Endosymbiotic evidence for mitochondria and chloroplasts: double membranes, circular DNA, independent binary-like division, and bacterial-type ribosomes.'
    ],
    decisionRules: [
      'When you see a plant cell placed in a solution with a more negative Ψ than the cell interior → predict net water efflux, loss of turgor pressure, and plasmolysis.',
      'When you see small nonpolar molecules (O2, CO2, steroid hormones) crossing a phospholipid bilayer → choose simple diffusion without transport proteins.',
      'When you see ions or polar molecules moving down their gradient across a hydrophobic bilayer core → choose facilitated diffusion via channel or carrier proteins.',
      'When you see a cell line with extensive rough ER and Golgi stacks → interpret specialization for synthesizing and secreting proteins.'
    ],
    cautions: [
      'Adding solute always makes solute potential Ψs more negative; pure water in an open beaker has Ψp = 0 and Ψs = 0.',
      'Do not confuse hypertonic with high water potential: a hypertonic solution has higher solute concentration and therefore lower (more negative) water potential.',
      'Prokaryotes lack membrane-bound organelles, but they still possess a plasma membrane, cytosol, circular DNA, and ribosomes.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-03',
    domainId: 'cellular-energetics',
    domainLabel: 'Cellular Energetics',
    title: 'Enzymes, Photosynthesis & Cellular Respiration',
    purpose: 'Organizes enzyme catalysis kinetics alongside the compartmentalized inputs, outputs, and proton-gradient coupling of photosynthesis and respiration.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Separate reaction rate changes caused by substrate/inhibitor concentration from structural enzyme denaturation caused by extreme heat or pH.',
      'Pinpoint the exact sub-organelle compartment (cytosol, mitochondrial matrix, cristae, thylakoid membrane, or stroma) where each energetic step occurs.',
      'Track electron carriers (NADH, FADH2, NADPH) to distinguish ATP-generating chemiosmosis from carbon-fixing or substrate-level steps.'
    ],
    formulas: [
      'Enzyme catalysis: lowers activation energy (Ea) by stabilizing the transition state without altering overall ΔG of reactants and products.',
      'Photosynthesis: thylakoid light reactions split H2O to produce O2, ATP, and NADPH; stroma Calvin cycle uses ATP, NADPH, and Rubisco to fix CO2 into G3P.',
      'Aerobic respiration: glycolysis (cytosol) → pyruvate oxidation & citric acid cycle (matrix) → ETC + chemiosmosis across inner mitochondrial membrane (O2 → H2O).',
      'Fermentation (lactic acid or alcoholic): occurs anaerobically in cytosol solely to oxidize NADH back to NAD+ so glycolysis can continue producing 2 net ATP.'
    ],
    decisionRules: [
      'When you see reaction rate restored to maximum Vmax by flooding the assay with excess substrate → identify competitive inhibition at the active site.',
      'When you see a protonophore making the inner mitochondrial or thylakoid membrane leaky to H+ → predict collapsed proton motive force, halted ATP synthase output, and continued electron flow as heat.',
      'When you see leaves placed in darkness after light exposure → predict light reactions stop immediately and the Calvin cycle soon stalls once ATP and NADPH run out.',
      'When you see O2 removed from facultative anaerobes → predict the mitochondrial ETC backs up and cells switch to fermentation to regenerate NAD+.'
    ],
    cautions: [
      'Enzymes never make an endergonic reaction exergonic; they speed approach to equilibrium without changing ΔG.',
      'Plants perform both photosynthesis and cellular respiration continuously (respiration runs in light and dark alike).',
      'Fermentation produces zero additional ATP beyond glycolysis; its metabolic role is regenerating the NAD+ pool.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-04',
    domainId: 'cell-communication-and-cell-cycle',
    domainLabel: 'Cell Communication and Cell Cycle',
    title: 'Signal Transduction, Feedback & Cell Cycle Control',
    purpose: 'Connects ligand-receptor specificity, second-messenger amplification, homeostatic feedback loops, and checkpoint regulation of mitosis.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Check whether the signaling ligand is hydrophilic (binds plasma-membrane receptor) or hydrophobic/steroid (crosses membrane to intracellular receptor).',
      'Trace upstream vs. downstream components in a transduction pathway to predict which step still activates if a mutation locks one protein ON or OFF.',
      'Distinguish interphase preparation (G1, S, G2) from mitotic nuclear division (PMAT) and cytokinesis before counting DNA content or chromatids.'
    ],
    formulas: [
      'Signal transduction stages: reception (ligand-receptor conformational change) → transduction (phosphorylation cascade, cAMP/Ca2+ second messengers) → cellular response.',
      'Signaling range: direct contact (gap junctions, plasmodesmata, immune APCs), local (paracrine/synaptic), and long-distance (endocrine hormones in bloodstream).',
      'Feedback loops: negative feedback opposes deviations to restore a set point (insulin/glucagon blood glucose); positive feedback amplifies a process to completion (oxytocin in labor, ethylene fruit ripening).',
      'Cell cycle control: G1, G2, and M (spindle) checkpoints governed by oscillating cyclins binding constant CDKs; DNA damage triggers p53 arrest or apoptosis.'
    ],
    decisionRules: [
      'When you see two different target cell types exposed to the same hormone producing distinct responses → attribute the difference to distinct receptor isoforms or intracellular relay proteins.',
      'When you see a drug blocking a downstream kinase while the receptor still binds its ligand → predict signal amplification halts downstream of the blocked kinase.',
      'When you see loss-of-function mutations in both alleles of a tumor suppressor gene (like p53) or gain-of-function in a proto-oncogene → predict checkpoint bypass and uncontrolled proliferation.',
      'When you see rising product concentration inhibiting an early pathway step to stabilize an internal variable → classify the mechanism as negative feedback.'
    ],
    cautions: [
      'A ligand does not enter the cell during GPCR or RTK signaling; only conformational information is relayed across the membrane.',
      'DNA replication occurs during S phase of interphase, not during prophase or metaphase of mitosis.',
      'Positive feedback is not inherently harmful or "good"; it simply amplifies change away from baseline until a terminating event occurs.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-05',
    domainId: 'heredity',
    domainLabel: 'Heredity',
    title: 'Meiosis, Pedigrees & Chi-Square Genetics',
    purpose: 'Guides chromosome segregation accounting, inheritance-pattern deduction, and statistical hypothesis testing with chi-square distributions.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Identify whether a cross tests independent assortment, sex linkage, autosomal linkage, or non-nuclear maternal inheritance before calculating expected ratios.',
      'Count degrees of freedom as phenotypic categories minus one (df = n − 1) and use the p = 0.05 row unless the prompt specifies another alpha level.',
      'Verify whether pedigree traits skip generations (recessive) or affect fathers-to-all-daughters (X-linked dominant) versus carrier mothers-to-sons (X-linked recessive).'
    ],
    formulas: [
      'Meiosis variation mechanisms: prophase I crossing over (chiasmata), metaphase I independent assortment (2^n combinations), and random fertilization.',
      'Probability laws: multiplication rule P(A and B) = P(A) × P(B) for independent events; addition rule P(A or B) = P(A) + P(B) for mutually exclusive outcomes.',
      'Chi-square goodness-of-fit: χ² = Σ((O − E)² / E), df = n − 1; reject the null hypothesis when calculated χ² exceeds the critical value at p = 0.05.',
      'Gene linkage: recombination frequency = (recombinant offspring / total offspring) × 100%; frequencies below 50% indicate genes linked on the same chromosome.'
    ],
    decisionRules: [
      'When you see a dihybrid testcross yielding far more parental phenotypes than recombinant phenotypes → conclude the two loci are physically linked on the same chromosome.',
      'When you see every offspring of an affected mother inherit a trait regardless of the father\'s phenotype → identify mitochondrial or chloroplast (extranuclear) inheritance.',
      'When you see calculated χ² smaller than the p = 0.05 critical value → fail to reject the null hypothesis and conclude deviations are consistent with random chance.',
      'When you see genetically identical plants showing different flower colors in acidic vs. alkaline soil → identify phenotypic plasticity driven by environmental interaction.'
    ],
    cautions: [
      'Never say a low chi-square value "proves" the null hypothesis; AP rubrics require "fail to reject the null hypothesis."',
      'Homologous chromosomes separate in anaphase I (halving ploidy 2n → n), whereas sister chromatids separate in anaphase II.',
      'Nondisjunction in meiosis I produces all four gametes with abnormal chromosome numbers, whereas nondisjunction in meiosis II leaves half the gametes normal.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-06',
    domainId: 'gene-expression-and-regulation',
    domainLabel: 'Gene Expression and Regulation',
    title: 'DNA Replication, Transcription, Operons & Biotech',
    purpose: 'Synthesizes nucleic acid polarity rules, prokaryotic vs. eukaryotic gene regulation, mutation effects, and core molecular biotechnology assays.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Confirm strand labels (3\'→5\' template vs. 5\'→3\' coding/mRNA) before transcribing codons or reading the genetic code table.',
      'Check whether the organism is prokaryotic (coupled transcription-translation, operons, no introns) or eukaryotic (nuclear mRNA processing, enhancers, chromatin remodeling).',
      'Examine how a single nucleotide insertion or deletion shifts the downstream reading frame relative to a base substitution.'
    ],
    formulas: [
      'Semiconservative DNA replication: helicase unwinds, topoisomerase relieves supercoiling, primase lays RNA primer, DNA polymerase III extends 5\'→3\' (leading continuous; lagging Okazaki fragments), ligase seals nicks.',
      'Eukaryotic mRNA processing: 5\' GTP cap, 3\' poly-A tail, and spliceosome intron removal; alternative splicing generates distinct protein isoforms from one gene.',
      'Prokaryotic operons: lac operon (inducible: allolactose inactivates repressor; high cAMP-CAP boosts transcription when glucose is low); trp operon (repressible: tryptophan activates repressor).',
      'Chromatin epigenetics: histone acetylation loosens nucleosomes to increase transcription; DNA/histone methylation typically condenses chromatin and silences expression.'
    ],
    decisionRules: [
      'When you see DNA fragments separated on an agarose gel → read smaller fragments closer to the positive (anode) end because negatively charged DNA migrates faster when shorter.',
      'When you see a bacterial transformation plate with LB + ampicillin + arabinose showing glowing colonies → confirm bacteria took up the plasmid carrying both ampR and an inducible reporter gene.',
      'When you see a base substitution changing a sense codon into UAA, UAG, or UGA → classify it as a nonsense mutation producing a truncated, usually nonfunctional polypeptide.',
      'When you see a eukaryotic liver cell and neuron expressing different proteins despite identical genomes → explain differential expression via cell-specific transcription factors binding enhancers.'
    ],
    cautions: [
      'DNA and RNA polymerases ALWAYS synthesize new nucleic acid strands in the 5\'→3\' direction by reading the template strand 3\'→5\'.',
      'Retroviruses use reverse transcriptase to make cDNA from an RNA template, which does not violate the broader flow of genetic information once integrated into host DNA.',
      'Introns are spliced out of eukaryotic pre-mRNA and are not translated; exons are the retained sequences expressed in mature mRNA.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-07',
    domainId: 'natural-selection',
    domainLabel: 'Natural Selection',
    title: 'Evolutionary Mechanisms, Hardy-Weinberg & Phylogenies',
    purpose: 'Anchors quantitative allele-frequency equilibrium checks, modes of selection and speciation, and rigorous phylogenetic tree reading.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Determine whether given percentages represent genotype frequencies (q², 2pq, p²) or allele frequencies (p, q) before solving Hardy-Weinberg problems.',
      'Check if a trait reflects shared ancestry (homologous/synapomorphy) or independent adaptation to similar environments (convergent/analogous).',
      'Verify evolutionary statements act on populations over generations rather than individuals intentionally adapting during their lifetimes.'
    ],
    formulas: [
      'Hardy-Weinberg equilibrium: p + q = 1 and p² + 2pq + q² = 1; requires large population, random mating, no mutation, no gene flow, and no natural selection.',
      'Evolutionary drivers: natural selection (adaptive), genetic drift (random bottleneck/founder effects strongest in small populations), gene flow (homogenizes populations), and mutation (source of new alleles).',
      'Speciation modes: allopatric (geographic barrier isolates gene pools) vs. sympatric (polyploidy, habitat/behavioral isolation without physical barrier), maintained by prezygotic or postzygotic barriers.',
      'Phylogenetics: nodes represent most recent common ancestors; rotating branches around a node leaves evolutionary relationships unchanged; parsimony favors the fewest evolutionary events.'
    ],
    decisionRules: [
      'When you see 16% of a population displaying a recessive phenotype in Hardy-Weinberg equilibrium → set q² = 0.16, take q = 0.4, find p = 0.6, and compute heterozygote frequency 2pq = 0.48.',
      'When you see two taxa sharing the most recent node on a cladogram → identify them as sister taxa regardless of visual left-to-right tip spacing.',
      'When you see pesticide resistance emerging rapidly after spraying → explain that pre-existing resistant variants survived and reproduced more, shifting allele frequencies.',
      'When you see an allele rapidly fixed or lost following a hurricane that leaves only 15 survivors → attribute the shift to a population bottleneck (genetic drift), not selection.'
    ],
    cautions: [
      'Never take the square root of the dominant phenotype frequency (p² + 2pq) to find p; always start from the homozygous recessive frequency q².',
      'Antibiotics and pesticides do not cause targeted resistance mutations; random mutations arise prior to selection.',
      'Cladogram branch tip proximity does not measure relatedness; always trace back to the most recent shared internal node.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-bio-reference-08',
    domainId: 'ecology',
    domainLabel: 'Ecology',
    title: 'Population Growth, Energy Flow & Community Dynamics',
    purpose: 'Links differential population models, diversity indices, trophic energy budgets, and ecological disruption cascades.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Core mechanisms & pathways',
    checklist: [
      'Check whether population data show unrestricted exponential acceleration or a plateau approaching carrying capacity K.',
      'Distinguish primary productivity terms (GPP, NPP, cellular respiration R) and ensure energy units match across trophic levels.',
      'Trace both direct predation and indirect trophic cascade ripples across food webs before predicting species abundance shifts.'
    ],
    formulas: [
      'Exponential growth: dN/dt = rmax·N (J-curve with abundant resources); Logistic growth: dN/dt = rmax·N·((K − N)/K) (S-curve, fastest growth at N = K/2).',
      'Simpson\'s Diversity Index: SDI = 1 − Σ(n/N)², ranging from 0 to 1; higher values signify greater species richness and evenness and stronger ecosystem resilience.',
      'Primary productivity & trophic transfer: NPP = GPP − R; roughly 10% of assimilated energy transfers to the next trophic level while ~90% is lost as metabolic heat and waste.',
      'Community structure: competitive exclusion prevents identical-niche coexistence; resource partitioning enables coexistence; keystone species exert disproportionate control over biodiversity.'
    ],
    decisionRules: [
      'When you see a population size N exceed carrying capacity K → predict dN/dt turns negative and population declines due to density-dependent resource limits.',
      'When you see removal of a top predator followed by herbivore explosion and kelp/plant collapse → identify a top-down trophic cascade indicating a keystone predator.',
      'When you see a non-native species expanding exponentially in a new habitat → attribute its success to release from native predators, pathogens, and competitors.',
      'When you see an animal sacrificing personal reproduction to help siblings raise offspring → explain the behavior via kin selection and inclusive fitness.'
    ],
    cautions: [
      'Energy flows one-way through ecosystems and dissipates as heat, whereas matter (carbon, nitrogen, phosphorus, water) recycles continuously.',
      'In logistic growth, per-capita growth rate decreases continuously as N approaches K, while total population growth rate dN/dt peaks at N = K/2.',
      'A species with the largest biomass (foundation species/dominant producer) is not automatically a keystone species, whose impact is disproportionate to its low abundance.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
];

const ap_chemistry_foundation_pilot = [
  {
    id: 'ap-chem-reference-01',
    domainId: 'atomic-structure-and-properties',
    domainLabel: 'Atomic Structure and Properties',
    title: 'Moles, Mass Spec, PES & Periodic Trends',
    purpose: 'Grounds stoichiometric mass-mole conversions, isotopic abundance math, photoelectron spectroscopy reading, and Coulombic explanations of periodic trends.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Convert all sample masses or percentages into moles before comparing atom ratios or determining empirical formulas.',
      'Read photoelectron spectroscopy (PES) x-axis orientation carefully because binding energy often runs high-to-low from left to right.',
      'Justify periodic trends using nuclear charge (Zeff), energy level/shielding shells (n), and distance in Coulomb\'s law rather than citing a trend direction alone.'
    ],
    formulas: [
      'Mole relations: n = m / M and N = n × NA, where Avogadro\'s constant NA = 6.022 × 10²³ mol⁻¹.',
      'Average atomic mass = Σ(isotopic mass × fractional abundance); molecular formula multiplier = molar mass / empirical formula mass.',
      'Coulomb\'s law attraction: F ∝ (q1·q2) / r²; higher Zeff or smaller shell distance r increases binding energy and first ionization energy.',
      'Electron configuration order follows Aufbau, Hund\'s rule, and Pauli exclusion; transition-metal cations lose outer ns electrons before (n − 1)d electrons.'
    ],
    decisionRules: [
      'When you see a PES spectrum with peak heights in a 2:2:6:2:3 ratio → assign 1s² 2s² 2p⁶ 3s² 3p³ (phosphorus) from highest to lowest binding energy.',
      'When you see a huge jump between the 2nd and 3rd successive ionization energies → conclude the element has 2 valence electrons (Group 2) and the 3rd removes a core electron.',
      'When you see first ionization energy dip slightly from Group 15 (N/P) to Group 16 (O/S) → explain electron-electron repulsion in the first paired p orbital.',
      'When you see an isoelectronic series (such as O²⁻, F⁻, Na⁺, Mg²⁺) → rank radius smallest for the ion with the greatest nuclear charge (most protons).'
    ],
    cautions: [
      'Never justify a periodic trend on an AP FRQ by saying "it is further right on the periodic table"; always cite effective nuclear charge, shell count, and Coulombic attraction.',
      'In a mass spectrum, peak height/area gives relative isotopic abundance, not the number of valence electrons.',
      'Ionization of Fe ([Ar] 4s² 3d⁶) to Fe²⁺ removes the 4s electrons first to give [Ar] 3d⁶, not 4s² 3d⁴.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-02',
    domainId: 'compound-structure-and-properties',
    domainLabel: 'Compound Structure and Properties',
    title: 'Bonding, Lattice Energy, Lewis & VSEPR Geometry',
    purpose: 'Connects ionic vs. covalent bond energy models with formal-charge Lewis selection, resonance bond orders, hybridization, and molecular polarity.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Sum total valence electrons accurately (adding for anions, subtracting for cations) before placing bonds and lone pairs.',
      'Distinguish electron-domain geometry (counts lone pairs + bonding regions) from molecular geometry (atoms only) before stating bond angles.',
      'Evaluate molecular polarity by combining individual bond dipoles with 3D molecular symmetry rather than bond electronegativity alone.'
    ],
    formulas: [
      'Formal charge: FC = (valence e⁻) − (nonbonding e⁻) − (½ × bonding e⁻); best Lewis structure minimizes |FC| and places negative FC on the most electronegative atom.',
      'Lattice energy: |U| ∝ |q1·q2| / (r_cation + r_anion); higher ionic charges dominate first, then smaller ionic radii increase melting point.',
      'Resonance bond order = (total bonding pairs across equivalent bonds) / (number of bond locations); single = 1σ, double = 1σ + 1π, triple = 1σ + 2π.',
      'Hybridization from steric number (bonded atoms + lone pairs): 2 → sp (180°), 3 → sp² (120°), 4 → sp³ (109.5°; lone pairs compress angles to ~107° or ~104.5°).'
    ],
    decisionRules: [
      'When you see a potential-energy vs. internuclear-distance curve → read the minimum x-value as equilibrium bond length and depth below zero as bond dissociation energy.',
      'When you see two ionic solids like MgO and NaF with similar internuclear distances → pick MgO for much higher melting point because (+2)(−2) doubles the charge product.',
      'When you see equivalent resonance forms (such as CO3²⁻ or NO3⁻) → state that all C-O or N-O bonds have equal intermediate length and strength, not flipping single/double bonds.',
      'When you see a central atom with polar bonds arranged symmetrically (CO2, BF3, CF4, SF6) → conclude bond dipoles cancel and the overall molecule is nonpolar.'
    ],
    cautions: [
      'AP Chemistry explicitly excludes sp³d and sp³d² hybridization for expanded octets; identify VSEPR geometry only for 5- and 6-domain species.',
      'Interstitial alloys insert small atoms (like C in steel) into lattice holes to stiffen the metal, whereas substitutional alloys swap similarly sized metal atoms (like brass).',
      'Covalent bonds break only during chemical reactions, not when molecular substances melt or boil.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-03',
    domainId: 'properties-of-substances-and-mixtures',
    domainLabel: 'Properties of Substances and Mixtures',
    title: 'IMFs, Gases, Solutions & Spectroscopy',
    purpose: 'Links intermolecular attractions to phase properties and separations while organizing gas laws, molarity, and spectroscopic Beer-Lambert analysis.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Match gas constant R units to pressure and volume (0.08206 L·atm/(mol·K) vs. 62.36 L·torr/(mol·K)) and always convert Celsius to Kelvin.',
      'Identify the bonding class (molecular, ionic, metallic, covalent network) before comparing boiling or melting points.',
      'Verify cuvette wavelength matches λmax and absorbance stays in the linear calibration region when applying Beer-Lambert law.'
    ],
    formulas: [
      'Ideal Gas Law & Mixtures: PV = nRT; Dalton\'s Law P_total = ΣP_i and P_i = X_i·P_total; molar mass from gas density M = dRT / P.',
      'Kinetic Molecular Theory: KE_avg = (3/2)RT depends only on Kelvin temperature; lighter gases move faster (u_rms ∝ √(T/M)) at the same T.',
      'Solution concentration & dilution: M = mol solute / L solution and M1V1 = M2V2 (conserves moles of solute).',
      'Spectroscopy: E = hν = hc / λ (h = 6.626 × 10⁻³⁴ J·s, c = 2.998 × 10⁸ m/s); Beer-Lambert Law A = εbc (absorbance proportional to concentration).'
    ],
    decisionRules: [
      'When you see two nonpolar molecules with very different boiling points (such as I2 vs. F2) → explain higher boiling point via larger electron cloud, greater polarizability, and stronger London dispersion forces.',
      'When you see a real gas deviating below ideal PV/nRT at low temperature and moderate pressure → attribute the dip to intermolecular attractions reducing wall-collision force.',
      'When you see UV-Vis spectroscopy vs. IR vs. microwave spectra → match UV-Vis to electronic transitions, IR to bond vibrations, and microwave to molecular rotations.',
      'When you see a paper chromatography spot traveling close to a nonpolar solvent front → conclude that component is less polar and interacts more strongly with the mobile phase than the polar stationary phase.'
    ],
    cautions: [
      'Hydrogen bonding requires H covalently bonded directly to F, O, or N (not merely an H atom anywhere in a molecule containing O, like dimethyl ether).',
      'All molecules exhibit London dispersion forces; large nonpolar molecules can have stronger total LDFs than small polar or H-bonding molecules.',
      'Rinsing a cuvette with deionized water instead of the sample solution dilutes the sample and lowers measured absorbance A.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-04',
    domainId: 'chemical-reactions',
    domainLabel: 'Chemical Reactions',
    title: 'Net Ionic Equations, Stoichiometry & Redox',
    purpose: 'Structures balanced net ionic writing, limiting-reactant mole accounting, gravimetric/titration assays, and oxidation-reduction half-reactions.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Write the balanced molecular equation and dissociate only strong electrolytes (aqueous strong acids, strong bases, soluble salts) before canceling spectators.',
      'Compare mole ratios of all reactants against stoichiometric coefficients to confirm the limiting reactant before predicting product yield.',
      'Verify both atom balance and total electric charge balance in every net ionic and redox half-reaction.'
    ],
    formulas: [
      'Solubility guarantee rule: all sodium (Na+), potassium (K+), ammonium (NH4+), and nitrate (NO3−) salts are soluble in water.',
      'Percent yield = (actual yield / theoretical yield) × 100%; percent error = (|measured − accepted| / accepted) × 100%.',
      'Titration stoichiometry at equivalence: (mol analyte / coeff_analyte) = (mol titrant / coeff_titrant), with mol = M × V(L).',
      'Redox tracking: oxidation increases oxidation number (loses electrons at anode); reduction decreases oxidation number (gains electrons at cathode); balance O with H2O and H with H+ in acid.'
    ],
    decisionRules: [
      'When you see a precipitation reaction producing a white solid after mixing two aqueous salts → eliminate soluble spectator ions (such as Na+ and NO3−) and keep only the ions forming the solid.',
      'When you see a weak acid reacting with a strong base in a net ionic equation → keep the weak acid molecular (HA) on the reactant side and show OH− producing A− and H2O.',
      'When you see a gravimetric precipitate weighed before being completely dried → predict an artificially high calculated mass percent of the target ion.',
      'When you see an element\'s oxidation state change from reactant to product (such as MnO4− to Mn2+) → classify as redox rather than acid-base or precipitation.'
    ],
    cautions: [
      'Do not split weak acids (like HF or CH3COOH), solids, liquids, or gases into ions in a net ionic equation.',
      'The reactant with the smaller starting mass is not necessarily the limiting reactant; always compare moles divided by stoichiometric coefficients.',
      'In basic redox balancing, finish balancing in acidic solution first, then add equal OH− to both sides to neutralize H+ into H2O.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-05',
    domainId: 'kinetics',
    domainLabel: 'Kinetics',
    title: 'Rate Laws, Integrated Plots & Reaction Mechanisms',
    purpose: 'Links experimental initial-rate tables, linearized concentration-time plots, collision theory, and multistep mechanism validation.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Never infer reaction order directly from overall balanced equation coefficients; read exponents from experimental data or an elementary step.',
      'Check which integrated plot (Concentration vs. t, ln[A] vs. t, or 1/[A] vs. t) produces a straight line before assigning order and slope sign.',
      'Confirm that proposed elementary steps sum to the overall balanced reaction and that no intermediate appears in the final derived rate law.'
    ],
    formulas: [
      'Relative rate for aA + bB → cC: Rate = −(1/a)(Δ[A]/Δt) = −(1/b)(Δ[B]/Δt) = +(1/c)(Δ[C]/Δt).',
      'Integrated rate laws: 0th order [A]t − [A]0 = −kt; 1st order ln[A]t − ln[A]0 = −kt (constant half-life t1/2 = 0.693 / k); 2nd order 1/[A]t − 1/[A]0 = +kt.',
      'Rate constant units for overall order n: k has units M^(1−n)·s⁻¹ (0th: M·s⁻¹, 1st: s⁻¹, 2nd: M⁻¹·s⁻¹).',
      'Collision model & catalysis: rate depends on collision frequency, proper orientation, and fraction exceeding Ea (k = A·e^(−Ea/RT)); catalysts lower Ea via an alternate pathway.'
    ],
    decisionRules: [
      'When you see concentration double while initial rate quadruples (holding other reactants constant) → assign 2nd order with respect to that reactant.',
      'When you see half-life remain identical across successive 50% drops in concentration → identify 1st-order kinetics and compute k = 0.693 / t1/2.',
      'When you see a slow step following a fast reversible equilibrium step → write the slow-step rate law and substitute the intermediate using the fast-step equilibrium expression.',
      'When you see a species consumed in step 1 and regenerated in a later step → identify it as a catalyst, whereas one formed then consumed is a reaction intermediate.'
    ],
    cautions: [
      'Raising temperature increases rate constant k primarily because a much larger fraction of molecules exceeds activation energy Ea, not merely because collisions are slightly more frequent.',
      'A catalyst lowers activation energy Ea for both forward and reverse steps equally without changing overall ΔH or ΔG.',
      'For a 2nd-order reaction, plotting 1/[A] vs. t has a positive slope (+k), whereas 0th and 1st order linear plots have negative slopes (−k).'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-06',
    domainId: 'thermochemistry',
    domainLabel: 'Thermochemistry',
    title: 'Calorimetry, Phase Changes, Hess\'s Law & Bond Enthalpy',
    purpose: 'Organizes sign conventions for heat transfer, coffee-cup calorimetry calculations, phase-transition plateaus, and three independent paths to ΔH°rxn.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Verify system vs. surroundings signs: if solution temperature rises, q_solution is positive and q_rxn = −q_solution is negative (exothermic).',
      'Convert joules from q = mcΔT to kilojoules and divide by moles of the limiting reactant (per reaction stoichiometry) to report ΔHrxn in kJ/mol_rxn.',
      'Check the formula direction: products minus reactants for ΔH°f, but bonds broken (reactants) minus bonds formed (products) for bond enthalpies.'
    ],
    formulas: [
      'Sensible heat & calorimetry: q = m·c·ΔT (water c = 4.184 J/(g·°C)); constant-pressure calorimetry ΔH_rxn = −q_soln / n_rxn.',
      'Phase transitions at constant temperature: q = n·ΔH_fus (melting/freezing) or q = n·ΔH_vap (vaporizing/condensing); sum heating segments separately.',
      'Standard enthalpies of formation: ΔH°_rxn = Σ[n·ΔH°_f(products)] − Σ[m·ΔH°_f(reactants)]; ΔH°_f = 0 for elements in their standard reference states.',
      'Bond enthalpy approximation: ΔH_rxn ≈ Σ(D_bonds broken in reactants) − Σ(D_bonds formed in products); breaking bonds is endothermic (+), forming bonds is exothermic (−).'
    ],
    decisionRules: [
      'When you see a heating curve plateau where added heat produces zero temperature rise → recognize potential energy increasing to overcome intermolecular forces during a phase change.',
      'When you see Hess\'s Law steps that must be reversed or scaled → flip the sign of ΔH when reversing an equation and multiply ΔH by the same scaling factor.',
      'When you see a reaction releasing heat because product bonds are stronger than reactant bonds → predict a negative ΔH_rxn (exothermic).',
      'When you see heat escaping from an uninsulated coffee-cup calorimeter during an exothermic dissolution → conclude the measured |ΔT| and calculated |ΔH| will be smaller than the true value.'
    ],
    cautions: [
      'In aqueous solution calorimetry, mass m in q = mcΔT is the total mass of the combined solution (solute + solvent), not just the limiting reactant mass.',
      'Breaking chemical bonds ALWAYS requires energy input (endothermic); energy is released when new bonds form, never when bonds break.',
      'Bond-enthalpy calculations give approximate gas-phase ΔH values because tabulated bond energies are averages across different molecules.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-07',
    domainId: 'equilibrium',
    domainLabel: 'Equilibrium',
    title: 'K, Q, Le Châtelier & Solubility Product (Ksp)',
    purpose: 'Anchors equilibrium expression setup, Q-vs-K reaction-direction proofs, RICE-table math, disturbance analysis, and precipitation equilibria.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Omit pure solids (s) and pure liquids (l) from Kc, Kp, Q, and Ksp expressions; include only aqueous (aq) and gaseous (g) species.',
      'Distinguish whether a disturbance changes Q at constant K (concentration/volume) or changes the numerical value of K itself (temperature only).',
      'Track stoichiometric exponents carefully when converting between molar solubility s and Ksp (for example, AB2 gives Ksp = 4s³).'
    ],
    formulas: [
      'Law of mass action for aA + bB ⇌ cC + dD: Kc = ([C]^c [D]^d) / ([A]^a [B]^b); Kp uses partial pressures in atm.',
      'Manipulating K: reversing a reaction yields 1/K; multiplying stoichiometry by n yields K^n; adding reactions yields K_net = K1 × K2.',
      'Reaction quotient test: Q less than K → net forward shift; Q equals K → dynamic equilibrium; Q greater than K → net reverse shift.',
      'Solubility equilibrium for M_x X_y(s) ⇌ x M^(y+) + y X^(x−): Ksp = [M^(y+)]^x [X^(x−)]^y; precipitate forms if Qsp exceeds Ksp.'
    ],
    decisionRules: [
      'When you see container volume halved at constant temperature → double all gas concentrations/pressures, compute Q vs. K, and shift toward the side with fewer moles of gas.',
      'When you see temperature increased on an exothermic equilibrium (ΔH negative) → treat heat as a product, so K decreases and the reaction shifts toward reactants.',
      'When you see a sparingly soluble salt placed into a solution already containing one of its ions → apply the common-ion effect to predict reduced molar solubility while Ksp stays constant.',
      'When you see Ksp values compared between salts of different stoichiometries (like AgCl vs. Ag2CrO4) → solve for molar solubility s explicitly instead of comparing raw Ksp magnitudes.'
    ],
    cautions: [
      'Adding more solid reactant or product never shifts equilibrium and does not alter Q, provided some solid was already present.',
      'Adding an inert gas at constant volume leaves all partial pressures unchanged, so Q stays equal to K with zero shift.',
      'Temperature is the ONLY factor that changes the numerical value of an equilibrium constant K.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-08',
    domainId: 'acids-and-bases',
    domainLabel: 'Acids and Bases',
    title: 'pH, Buffers, Titrations & Molecular Acid Strength',
    purpose: 'Separates strong vs. weak acid-base stoichiometry, Henderson-Hasselbalch buffer reasoning, titration curve landmarks, and structural pKa trends.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Classify every acid and base as strong or weak first, and perform stoichiometry in moles before converting back to molarity with the new total volume.',
      'Identify the titration zone (initial, buffer region, half-equivalence, equivalence, or excess titrant) before choosing an equilibrium equation.',
      'Check temperature when using pH + pOH = 14, because Kw = 1.0 × 10⁻¹⁴ applies strictly at 25 °C.'
    ],
    formulas: [
      'Water autoionization & conjugates (25 °C): Kw = [H3O+][OH−] = 1.0 × 10⁻¹⁴, pH = −log[H3O+], pH + pOH = 14, and Ka × Kb = Kw.',
      'Henderson-Hasselbalch buffer equation: pH = pKa + log([A−] / [HA]); optimal buffer range is pKa ± 1, with capacity increasing at higher conjugate concentrations.',
      'Titration landmarks for weak acid HA + strong base OH−: at half-equivalence [HA] = [A−] so pH = pKa; at equivalence only weak base A− remains so pH exceeds 7.',
      'Acid strength structure rules: binary acids strengthen down a group (weaker H-X bond) and across a period (more polar); oxyacids strengthen with more O atoms or more electronegative central atom.'
    ],
    decisionRules: [
      'When you see [A−] exceeding [HA] in a buffer or indicator solution → immediately determine that pH is greater than pKa (and vice versa when [HA] exceeds [A−]).',
      'When you see a weak base titrated with a strong acid → expect the equivalence point pH to be below 7 because the conjugate acid BH+ hydrolyzes water.',
      'When you see a pH indicator selection prompt → choose an indicator whose pKa sits closest to the equivalence point pH of the titration.',
      'When you see equal volumes of 0.10 M HCl and 0.10 M CH3COOH titrated with 0.10 M NaOH → recognize both require the exact same volume of NaOH to reach equivalence.'
    ],
    cautions: [
      'Strong acids and bases (HCl, HBr, HI, HNO3, H2SO4 first proton, HClO4; Group 1 and heavy Group 2 hydroxides) ionize ~100% and do not use ICE tables.',
      'At higher temperatures where Kw exceeds 10⁻¹⁴, pure neutral water has pH below 7 yet remains strictly neutral because [H3O+] still equals [OH−].',
      'Adding water to dilute a buffer keeps the [A−]/[HA] ratio unchanged (pH nearly constant) while reducing its buffer capacity.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-chem-reference-09',
    domainId: 'thermodynamics-and-electrochemistry',
    domainLabel: 'Thermodynamics and Electrochemistry',
    title: 'Entropy, Gibbs Free Energy & Electrochemical Cells',
    purpose: 'Unifies spontaneity criteria across ΔG°, K, and E°cell alongside galvanic vs. electrolytic cell operation, Nernst shifts, and Faraday electrolysis.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Reconcile energy units before computing ΔG° = ΔH° − TΔS° by converting ΔS° from J/(mol·K) to kJ/(mol·K) and T to Kelvin.',
      'Verify standard reduction potentials are NOT multiplied by stoichiometric coefficients when computing E°cell = E°cathode − E°anode.',
      'Confirm electron flow (anode → cathode externally) and ion migration in the salt bridge (anions → anode, cations → cathode) match cell type.'
    ],
    formulas: [
      'Gibbs free energy & spontaneity: ΔG° = ΔH° − TΔS° and ΔG° = −RT ln K (R = 8.314 J/(mol·K)); thermodynamically favored when ΔG° negative, K greater than 1, and E°cell positive.',
      'Cell potential & work: E°cell = E°red(cathode) − E°red(anode); ΔG° = −nFE°cell where F = 96,485 C/mol e⁻ and 1 V = 1 J/C.',
      'Nonstandard cell potential (Nernst): Ecell = E°cell − (RT / nF) ln Q; raising reactant concentration lowers Q and increases Ecell.',
      'Faraday electrolysis stoichiometry: q = I·t (coulombs = amperes × seconds), mol e⁻ = (I·t) / F, and mass deposited = (mol e⁻ / n) × molar mass.'
    ],
    decisionRules: [
      'When you see ΔH° positive and ΔS° positive → conclude the reaction is thermodynamically favored only at high temperatures where TΔS° exceeds ΔH°.',
      'When you see a thermodynamically favored reaction (ΔG° strongly negative) proceeding undetectably slowly → cite kinetic control caused by a large activation energy Ea.',
      'When you see an electrochemical cell with E°cell negative → classify it as nonspontaneous and require an external power source (electrolytic cell) to drive it.',
      'When you see a galvanic cell running until it reaches equilibrium ("dead battery") → set Q = K and Ecell = 0 V.'
    ],
    cautions: [
      'Never multiply E°red values when balancing half-reactions; cell potential is an intensive ratio of joules per coulomb.',
      'In both galvanic and electrolytic cells, oxidation ALWAYS occurs at the anode (AN OX) and reduction ALWAYS occurs at the cathode (RED CAT).',
      'Watch the factor of 1000 between joules (from R = 8.314 J/(mol·K) or F = 96,485 C/mol) and kilojoules reported for ΔG° and ΔH°.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
];

const ap_physics_1_foundation_pilot = [
  {
    id: 'ap-phys1-reference-01',
    domainId: 'kinematics',
    domainLabel: 'Kinematics',
    title: '1D Motion, Motion Graphs & 2D Projectiles',
    purpose: 'Anchors constant-acceleration kinematics, slope/area graph translations, independent projectile axes, and relative velocity vector addition.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Define explicit positive x and y coordinate axes before assigning signs to displacement, initial velocity, and gravitational acceleration.',
      'Verify acceleration is constant over the entire interval before applying the Big Three kinematic equations.',
      'Separate horizontal (ax = 0) and vertical (ay = −g) motion into two independent tables linked only by time t.'
    ],
    formulas: [
      'Constant-acceleration kinematics: vx = vx0 + ax·t, x = x0 + vx0·t + ½ax·t², and vx² = vx0² + 2ax(x − x0).',
      'Graphical kinematics: slope of x-t graph = velocity; slope of v-t graph = acceleration; signed area under v-t = displacement Δx; signed area under a-t = Δv.',
      'Projectile components: vx = v0·cos θ (constant), vy = v0·sin θ − g·t, with g ≈ 9.8 m/s² (or 10 m/s² on AP Physics 1 estimates).',
      'Relative velocity vector sum: v_AC = v_AB + v_BC (add components algebraically in each axis).'
    ],
    decisionRules: [
      'When you see a velocity-time graph crossing the time axis from positive to negative → identify an instant of zero velocity where the object reverses direction, even if acceleration stays constant and nonzero.',
      'When you see velocity and acceleration pointing in opposite directions (opposite signs) → conclude the object is slowing down, regardless of whether acceleration is positive or negative.',
      'When you see two projectiles launched from the same height with identical vy0 (such as one dropped and one launched horizontally) → conclude they hit flat ground at the exact same time.',
      'When you see an object at the apex of a parabolic trajectory → set vy = 0 while keeping vx = v0·cos θ and vertical acceleration ay = −g downward.'
    ],
    cautions: [
      'Negative acceleration does not automatically mean slowing down; an object moving in the negative direction with negative acceleration speeds up.',
      'Total distance traveled adds absolute values of areas under a v-t graph, whereas displacement Δx sums signed positive and negative areas.',
      'Never plug a 2D launch speed v0 directly into a vertical kinematic equation without taking the vertical component v0·sin θ.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-02',
    domainId: 'force-and-translational-dynamics',
    domainLabel: 'Force and Translational Dynamics',
    title: 'Newton\'s Laws, FBDs, Friction & Circular Motion',
    purpose: 'Structures free-body diagrams, system vs. single-object Newton\'s second law equations, inclined planes, Hooke\'s law, and centripetal dynamics.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Draw a clean free-body diagram showing only real external contact and field forces acting ON the chosen object or system.',
      'Align axes with the direction of acceleration (parallel/perpendicular to an incline, or radial/tangential for circular motion) before decomposing forces.',
      'Check whether surfaces are slipping (kinetic friction fk = μk·FN) or stationary relative to each other (static friction fs ≤ μs·FN).'
    ],
    formulas: [
      'Newton\'s 2nd Law: a_sys = ΣF_ext / m_sys; internal tension or normal forces cancel when treating coupled blocks as one system.',
      'Gravity & springs: near-Earth Fg = mg; universal gravitation Fg = G·m1·m2 / r² (g = G·M / r²); Hooke\'s law |Fs| = k·|Δx|.',
      'Friction models: kinetic friction fk = μk·FN opposes relative sliding; static friction fs ≤ μs·FN adjusts to prevent slipping up to its maximum.',
      'Uniform circular motion: centripetal acceleration ac = v² / r = ω²·r directed radially inward, supplied by ΣF_radial = m·v² / r.'
    ],
    decisionRules: [
      'When you see a multi-block Atwood or pulley problem asking for acceleration first → treat all connected blocks as a single system to eliminate internal tension, then isolate one block to find tension.',
      'When you see a block resting on an incline without sliding → set static friction equal to m·g·sin θ rather than automatically plugging in μs·m·g·cos θ.',
      'When you see an object moving at constant speed in a vertical or horizontal circle → set net inward radial force equal to mv²/r and check normal/tension directions at top vs. bottom.',
      'When you see two colliding or pushing objects of very different masses → apply Newton\'s 3rd law to confirm the interaction forces have equal magnitude and opposite direction.'
    ],
    cautions: [
      'Never draw "centripetal force," "ma," or velocity vectors on a free-body diagram; centripetal force is simply the net inward sum of real forces like tension, gravity, normal, or friction.',
      'Normal force FN equals mg only on a horizontal surface with zero vertical acceleration and no angled applied forces; on a frictionless incline FN = mg cos θ.',
      'Newton\'s 3rd-law force pairs always act on two DIFFERENT objects, so they never cancel each other on a single object\'s free-body diagram.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-03',
    domainId: 'work-energy-and-power',
    domainLabel: 'Work, Energy, and Power',
    title: 'Work-Energy Theorem, Conservation & Power',
    purpose: 'Organizes system-boundary selection, mechanical energy conservation, force-displacement work integration, and instantaneous vs. average power.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Declare the system explicitly (such as block-Earth-spring vs. block alone) because potential energy exists only when the interacting field/spring is inside the system.',
      'Check whether any external forces do work or internal friction dissipates mechanical energy into thermal energy (ΔE_thermal = fk·d).',
      'Pick a convenient zero-height reference (y = 0) and keep it consistent across initial and final states.'
    ],
    formulas: [
      'Work: W = F_∥·d = F·d·cos θ = signed area under a Force vs. Position (F-x) graph; ΔE_sys = W_ext.',
      'Mechanical energies: translational kinetic K = ½mv²; gravitational potential ΔUg = mgΔy (universal Ug = −G·m1·m2 / r); elastic potential Us = ½k(Δx)².',
      'Conservation with dissipation: Ki + Ui + W_ext = Kf + Uf + ΔE_thermal (mechanical energy conserved when W_ext = 0 and no nonconservative dissipation).',
      'Power: P_avg = ΔE / Δt = W / Δt; instantaneous power P = F_∥·v = F·v·cos θ (measured in watts, 1 W = 1 J/s).'
    ],
    decisionRules: [
      'When you see a curved track, ramp, or pendulum where direction changes continuously → use conservation of energy rather than constant-acceleration kinematics.',
      'When you see a force acting perpendicular to instantaneous displacement (like normal force on a track or centripetal force in circular orbit) → set work done by that force equal to zero.',
      'When you see a spring compressed by distance 2x instead of x → predict stored elastic energy Us quadruples (scales as x²) and launch speed doubles (scales as x).',
      'When you see a single-block system excluding Earth falling downward → account for gravity as positive external work Wg = +mgh increasing the block\'s kinetic energy, rather than Ug.'
    ],
    cautions: [
      'Kinetic energy and potential energy are scalars; kinetic energy is never negative, while gravitational potential energy can be negative depending on the chosen y = 0 reference.',
      'If a block-Earth system includes gravity internally, do not double-count gravity as both ΔUg and external work Wg.',
      'Stopping distance with constant braking friction scales with v² (because ½mv² = fk·d), so doubling speed quadruples stopping distance.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-04',
    domainId: 'linear-momentum',
    domainLabel: 'Linear Momentum',
    title: 'Impulse, Momentum Conservation & Collisions',
    purpose: 'Links force-time impulse integrals, center-of-mass motion, vector momentum conservation, and elastic vs. inelastic kinetic energy outcomes.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Treat linear momentum and impulse as signed vectors; assign consistent +/- directions (and separate x/y components in 2D collisions).',
      'Verify ΣF_ext = 0 along the axis of interest during the collision before setting Σpi = Σpf.',
      'Never assume kinetic energy is conserved in a collision unless the problem explicitly states the collision is elastic.'
    ],
    formulas: [
      'Linear momentum & center of mass: p = m·v; x_cm = Σ(mi·xi) / Σmi; v_cm = Σ(mi·vi) / Σmi = p_total / M_total.',
      'Impulse-momentum theorem: J = F_avg·Δt = Δp = m(vf − vi) = signed area under an F-t graph.',
      'Conservation of momentum: if ΣF_ext = 0, then Σpi = Σpf and v_cm remains constant before, during, and after internal interactions.',
      'Collision types: elastic conserves p and K; inelastic conserves p while K decreases; perfectly inelastic (objects stick) conserves p with maximum allowed K loss.'
    ],
    decisionRules: [
      'When you see an object bouncing back elastically off a wall instead of sticking → recognize Δp = m(−v − v) = −2mv has twice the magnitude of the sticking impulse.',
      'When you see an airbag or crumple zone extending collision duration Δt for the same Δp → conclude impulse J stays identical while average impact force F_avg = Δp/Δt drops.',
      'When you see a ballistic pendulum (bullet embeds in block, then swings up) → split into two stages: conserve momentum ONLY during the inelastic impact, then conserve mechanical energy ONLY during the upward swing.',
      'When you see two carts pushed apart by an internal spring on a frictionless track → conclude both experience equal impulse magnitudes and v_cm stays zero.'
    ],
    cautions: [
      'In a 1D rebound, forgetting the negative sign on final velocity yields Δp = 0 instead of ±2mv.',
      'External forces (like friction or a pivot pin) can break momentum conservation even over short intervals if their impulse is non-negligible.',
      'Explosions and spring releases conserve total momentum (often zero) while INCREASING total kinetic energy from stored internal potential energy.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-05',
    domainId: 'torque-and-rotational-dynamics',
    domainLabel: 'Torque and Rotational Dynamics',
    title: 'Rotational Kinematics, Torque, Inertia & Equilibrium',
    purpose: 'Maps translational dynamics onto rotational analogs, lever-arm torque computation, rotational inertia distribution, and static equilibrium conditions.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Keep angular quantities in radians (rad, rad/s, rad/s²) whenever linking linear and rotational motion via v = rω or a_t = rα.',
      'Choose a rotational pivot point strategically in static equilibrium (usually through an unknown hinge or support force) to eliminate that unknown torque.',
      'Define counterclockwise (CCW) vs. clockwise (CW) torque sign conventions explicitly before summing Στ.'
    ],
    formulas: [
      'Rotational kinematics (constant α): ω = ω0 + αt, θ = θ0 + ω0·t + ½αt², ω² = ω0² + 2αΔθ; no-slip rolling links s = rθ, v_cm = rω, a_cm = rα.',
      'Torque: τ = r_⊥·F = r·F·sin θ, where r_⊥ is the perpendicular lever arm from the pivot to the line of action of force F.',
      'Newton\'s 2nd law for rotation & inertia: α = Στ / I; point masses I = Σ(mi·ri²); parallel-axis theorem I = I_cm + M·d².',
      'Static equilibrium conditions: ΣFx = 0, ΣFy = 0, AND Στ = 0 about any axis.'
    ],
    decisionRules: [
      'When you see a hoop (I = MR²), solid cylinder (I = ½MR²), and solid sphere (I = 2/5 MR²) rolling down an incline without slipping → rank the smallest coefficient of I (solid sphere) fastest because less energy goes into rotation.',
      'When you see a pulley with non-negligible mass I turning with a rope → recognize the tensions on the two sides of the pulley are NOT equal because their difference supplies net torque (T1 − T2)R = Iα.',
      'When you see mass redistributed farther from the rotation axis → predict larger rotational inertia I and smaller angular acceleration α for the same applied torque.',
      'When you see a force line of action passing directly through the pivot → set its torque equal to zero because r_⊥ = 0.'
    ],
    cautions: [
      'For a rolling object, static friction provides the torque needed to maintain rolling without slipping, whereas kinetic friction occurs only if the object slips.',
      'Zero net force does not guarantee zero net torque (a force couple produces pure rotation), and zero net torque does not guarantee zero net force.',
      'Tangential acceleration a_t = rα changes speed along a circle, whereas centripetal acceleration ac = rω² points radially inward.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-06',
    domainId: 'energy-and-momentum-of-rotating-systems',
    domainLabel: 'Energy and Momentum of Rotating Systems',
    title: 'Rolling Energy, Angular Impulse & Angular Momentum',
    purpose: 'Connects rotational kinetic energy, no-slip rolling budgets, point-mass and rigid-body angular momentum, and rotational collisions.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Include BOTH translational (½mv_cm²) and rotational (½I_cm·ω²) kinetic energy whenever an object rolls without slipping.',
      'Check whether an external net torque exists about the chosen pivot before applying conservation of angular momentum Li = Lf.',
      'Use the perpendicular distance r_⊥ from the pivot to the velocity line when computing point-mass angular momentum L = r_⊥·m·v.'
    ],
    formulas: [
      'Rotational kinetic energy & work: K_rot = ½Iω² = L² / (2I); rotational work W = τ·Δθ; total rolling energy K_total = ½m·v_cm² + ½I_cm·ω².',
      'Angular momentum: rigid body L = I·ω; point particle moving past a pivot L = r_⊥·p = r·m·v·sin θ.',
      'Angular impulse-momentum theorem: ΔL = τ_avg·Δt = signed area under a Torque vs. Time (τ-t) graph.',
      'Conservation of angular momentum: when Στ_ext = 0 about an axis, I_i·ω_i = I_f·ω_f (for orbits, r1·v1 = r2·v2 at perihelion/aphelion).'
    ],
    decisionRules: [
      'When you see a spinning skater or turntable pulling mass inward with zero external torque → keep L constant, decrease I, increase ω, and conclude K_rot = L²/(2I) INCREASES because internal muscles do positive work.',
      'When you see a clay ball striking and sticking to a pivoted rod → conserve angular momentum about the pivot (linear momentum is NOT conserved because the pivot exerts an external impulse).',
      'When you see a ball rolling without slipping up a ramp vs. sliding up a frictionless ramp with the same initial speed v0 → predict the rolling ball reaches a higher height because it starts with extra rotational kinetic energy ½Iω².',
      'When you see a satellite moving from apogee to perigee in an elliptical orbit → conserve angular momentum (gravitational torque about the central planet is zero) and mechanical energy so speed increases as r decreases.'
    ],
    cautions: [
      'Static friction on a wheel rolling without slipping does ZERO net mechanical work because the instantaneous point of contact is at rest relative to the ground.',
      'A point mass traveling in a straight line still has nonzero angular momentum L = r_⊥·mv about any pivot not lying on its line of motion.',
      'In an inelastic rotational collision (such as dropping a non-rotating disk onto a spinning disk), angular momentum is conserved while rotational kinetic energy decreases.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-07',
    domainId: 'oscillations',
    domainLabel: 'Oscillations',
    title: 'Simple Harmonic Motion, Period & Energy Exchange',
    purpose: 'Links linear restoring forces, spring and pendulum period scaling laws, phase-shifted sinusoidal graphs, and SHM mechanical energy conservation.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Confirm the restoring force is proportional to displacement from equilibrium (F = −kx) before applying SHM period formulas.',
      'Distinguish equilibrium position (x = 0: max speed, zero net force) from turning points (x = ±A: zero speed, max acceleration and restoring force).',
      'Verify whether a change alters mass, spring constant, length, gravity, or amplitude before predicting how period T responds.'
    ],
    formulas: [
      'SHM restoring condition: F_net = −k·x and a = −(k/m)·x = −ω²·x; position x(t) = A·cos(2πft) = A·cos(ωt).',
      'Mass-spring period: Ts = 2π√(m / k); independent of amplitude A and gravitational field g (works horizontally and vertically).',
      'Simple pendulum period (small angles): Tp = 2π√(l / g); independent of bob mass m and small amplitude.',
      'SHM energy budget: E_total = ½kA² = ½mv² + ½kx²; frequency f = 1 / T and v_max = A√(k / m).'
    ],
    decisionRules: [
      'When you see a mass-spring oscillator moved from Earth to the Moon → predict its equilibrium stretch shortens, while its oscillation period Ts = 2π√(m/k) stays completely unchanged.',
      'When you see pendulum length quadrupled or bob mass doubled → predict quadrupling l doubles period Tp (√4 = 2), whereas doubling mass leaves Tp unchanged.',
      'When you see amplitude doubled on a frictionless spring oscillator → predict period stays unchanged, maximum speed doubles, and total mechanical energy quadruples.',
      'When you see a cosine position-time graph for SHM → expect acceleration to be an inverted cosine (−Aω²cos ωt) and velocity to be a negative sine shifted by a quarter period.'
    ],
    cautions: [
      'For a vertical hanging spring, gravity shifts the equilibrium position downward by mg/k but does NOT change the period Ts = 2π√(m/k).',
      'At the equilibrium point x = 0, acceleration is zero while velocity magnitude and kinetic energy reach their maximum values.',
      'Total mechanical energy of an SHM oscillator splits 50/50 between kinetic and potential energy at x = A / √2 ≈ 0.707A, NOT at x = A/2.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-phys1-reference-08',
    domainId: 'fluids',
    domainLabel: 'Fluids',
    title: 'Hydrostatics, Buoyancy, Continuity & Bernoulli Flow',
    purpose: 'Covers AP Physics 1 Unit 8 fluid statics and ideal fluid dynamics: depth pressure, Archimedes buoyancy, continuity, and Bernoulli energy conservation.',
    checklistLabel: 'Before calculating',
    formulasLabel: 'Core equations & relationships',
    checklist: [
      'Separate static-fluid problems (Pascal/hydrostatic/buoyancy) from steady ideal-flow problems (continuity + Bernoulli).',
      'Check whether pressure values are absolute (P = P0 + ρgh) or gauge pressure (P_gauge = ρgh) before comparing or solving.',
      'Use ρ_fluid and V_submerged (NOT object density or total object volume if floating) inside the buoyant force formula.'
    ],
    formulas: [
      'Density & pressure: ρ = m / V; P = F_⊥ / A (1 Pa = 1 N/m²); hydrostatic pressure at depth h: P = P0 + ρ·g·h.',
      'Archimedes\' principle: buoyant force Fb = ρ_fluid·V_submerged·g = weight of displaced fluid; floating fraction V_sub / V_obj = ρ_obj / ρ_fluid.',
      'Continuity equation (incompressible steady flow): volume flow rate Q = A1·v1 = A2·v2 (narrower cross-section forces higher speed).',
      'Bernoulli\'s equation (ideal non-viscous flow): P1 + ρ·g·y1 + ½ρ·v1² = P2 + ρ·g·y2 + ½ρ·v2²; open-tank efflux speed v = √(2gh).'
    ],
    decisionRules: [
      'When you see two containers of different shapes filled to the exact same vertical depth with the same liquid → conclude hydrostatic pressure at the bottom is identical regardless of total water volume.',
      'When you see a floating block pushed completely underwater or a sunken object lowered deeper → note Fb increases as submerged volume grows, then stays constant once fully submerged even as depth increases.',
      'When you see a horizontal pipe narrowing to half its diameter (one-fourth its area) → conclude fluid speed quadruples and static pressure drops by Bernoulli\'s equation.',
      'When you see an object suspended from a scale while submerged in water → calculate apparent weight as F_T = m·g − Fb.'
    ],
    cautions: [
      'Buoyant force on a fully submerged incompressible object does NOT increase with depth, because pressure rises equally on both top and bottom faces so ΔP stays constant.',
      'Faster fluid flow at constant height corresponds to LOWER internal static pressure, not higher pressure.',
      'In continuity A1v1 = A2v2, area scales with radius squared (πr²), so halving pipe radius multiplies speed by 4, not 2.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
];

const ap_psychology_pilot = [
  {
    id: 'ap-psych-reference-01',
    domainId: 'biological-bases-of-behavior',
    domainLabel: 'Unit 1: Biological Bases of Behavior',
    title: 'Neurobiology, Brain Systems, Sleep & Sensation',
    purpose: 'Anchors neural firing, neurotransmitter drug action, cortical/subcortical localization, sleep architecture, and sensory transduction models in Unit 1.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key constructs & designs',
    checklist: [
      'Trace whether a symptom involves peripheral autonomic arousal (sympathetic vs. parasympathetic) or a specific central brain structure.',
      'Distinguish chemical agonist action (mimics/enhances neurotransmitter or blocks reuptake) from antagonist action (blocks receptors or inhibits release).',
      'Separate physical stimulus transduction (sensation) from cognitive interpretation (perception) when diagnosing visual or auditory phenomena.'
    ],
    formulas: [
      'Action potential sequence: resting potential (~ −70 mV) → threshold depolarization (Na+ rushes in, all-or-none) → repolarization (K+ exits) → refractory period; myelin speeds saltatory conduction.',
      'Key neurotransmitters: ACh (muscle/memory), dopamine (reward/movement), serotonin (mood/sleep), GABA (main inhibitory), glutamate (main excitatory), norepinephrine (alertness), endorphins (pain relief).',
      'Brain localization & imaging: medulla (vital functions), cerebellum (coordination), amygdala (fear/emotion), hippocampus (explicit memory consolidation), prefrontal cortex (executive control); fMRI tracks blood-oxygen activity while EEG tracks electrical timing.',
      'Sensory theories: Weber\'s law (just-noticeable difference is a constant proportion); vision (trichromatic RGB cones + opponent-process afterimages); audition (place theory for high pitches, frequency/volley for low pitches); gate-control theory of pain.'
    ],
    decisionRules: [
      'When you see a split-brain patient shown an image solely in the left visual field → predict the right hemisphere processes it, so the patient cannot verbally name it (left Broca\'s area) but can pick it up with the left hand.',
      'When you see a drug blocking serotonin reuptake transporters (like an SSRI) → classify it as a functional agonist because more serotonin stays active in the synaptic cleft.',
      'When you see rapid eye movements, vivid dreaming, high EEG brain activity, and skeletal muscle paralysis → identify REM (paradoxical) sleep rather than NREM-3 delta slow-wave sleep.',
      'When you see a heritability statistic of 0.70 for a trait → interpret it as 70% of the variation across a population attributable to genetics, not 70% of one individual\'s trait.'
    ],
    cautions: [
      'Neurons fire with identical peak voltage regardless of stimulus intensity (all-or-none law); stronger stimuli increase firing frequency and recruit more neurons.',
      'Damage to the hippocampus impairs forming NEW explicit memories (anterograde amnesia) without erasing old childhood memories or procedural motor skills.',
      'Broca\'s area (left frontal lobe) governs speech production, whereas Wernicke\'s area (left temporal lobe) governs language comprehension.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-psych-reference-02',
    domainId: 'cognition',
    domainLabel: 'Unit 2: Cognition',
    title: 'Perception, Memory Systems, Heuristics & Psychometrics',
    purpose: 'Connects perceptual organization, working and long-term memory mechanics, cognitive biases, and intelligence test validity/reliability.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key constructs & designs',
    checklist: [
      'Check whether a memory failure occurred at encoding (attention), storage (consolidation), or retrieval (cue mismatch/interference).',
      'Distinguish whether old information blocks new recall (proactive interference) or new learning disrupts old memories (retroactive interference).',
      'Identify whether a measurement critique targets consistency (reliability) or accuracy in measuring the intended construct (validity).'
    ],
    formulas: [
      'Processing & perception: bottom-up (data-driven features) vs. top-down (schemas/expectations); Gestalt grouping (proximity, similarity, closure, figure-ground); binocular retinal disparity vs. monocular depth cues.',
      'Memory architecture: Baddeley\'s working memory (central executive, phonological loop, visuospatial sketchpad); explicit LTM (episodic events, semantic facts) vs. implicit LTM (procedural skills, priming).',
      'Decision heuristics & obstacles: availability heuristic (vivid/recent examples), representativeness heuristic (prototype matching), confirmation bias, framing effect, mental set, and functional fixedness.',
      'Psychometrics: Spearman\'s g, fluid (novel reasoning) vs. crystallized (accumulated knowledge) intelligence; standardization norms, test-retest/split-half reliability, construct/predictive validity, and Flynn effect.'
    ],
    decisionRules: [
      'When you see someone overestimate shark-attack risk right after watching dramatic news coverage → identify the availability heuristic.',
      'When you see a student who learned Spanish last year accidentally using Spanish vocabulary during a new French quiz → diagnose proactive interference (old disrupts new).',
      'When you see an eyewitness incorporate misleading post-event phrasing ("smashed" vs. "hit") into their recall → identify Elizabeth Loftus\'s misinformation effect (memory reconsolidation distortion).',
      'When you see a bathroom scale consistently reading 5 pounds too heavy every morning → classify it as high reliability but low validity.'
    ],
    cautions: [
      'Negative reinforcement is NOT punishment, and similarly, semantic encoding (deep meaning) outperforms shallow phonemic or structural maintenance rehearsal.',
      'Primacy effect reflects transfer into long-term memory, whereas recency effect reflects items still active in working memory (and disappears after a delay).',
      'A test can be reliable without being valid, but it cannot be valid without first being reliable.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-psych-reference-03',
    domainId: 'development-and-learning',
    domainLabel: 'Unit 3: Development and Learning',
    title: 'Lifespan Development, Conditioning & Social Learning',
    purpose: 'Integrates developmental stage frameworks and research designs with classical conditioning, operant schedules, and observational learning.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key constructs & designs',
    checklist: [
      'Check whether the learning scenario involves an involuntary reflex paired with a neutral cue (classical) or a voluntary behavior shaped by its consequence (operant).',
      'For operant items, ask two separate questions: does the behavior increase (reinforcement) or decrease (punishment), and is a stimulus added (positive) or removed (negative)?',
      'Match developmental milestones to Piagetian cognitive operations versus Eriksonian psychosocial crises.'
    ],
    formulas: [
      'Developmental designs & frameworks: longitudinal (tracks same cohort over time, costly/attrition) vs. cross-sectional (compares ages at once, cohort-effect risk); Bronfenbrenner\'s ecological systems.',
      'Cognitive & social development: Piaget (sensorimotor/object permanence → preoperational/egocentrism → concrete operational/conservation → formal operational/abstract); Vygotsky ZPD & scaffolding; Ainsworth attachment & Baumrind authoritative vs. authoritarian/permissive parenting.',
      'Classical conditioning: UCS → UCR; pairing NS + UCS yields CS → CR; key phenomena include acquisition, extinction, spontaneous recovery, stimulus generalization/discrimination, and Garcia biological taste aversion.',
      'Operant schedules: fixed-ratio (scallop pause-run), variable-ratio (highest steady rate, most resistant to extinction), fixed-interval (scalloped ramp near deadline), variable-interval (slow steady rate).'
    ],
    decisionRules: [
      'When you see a driver buckling a seatbelt to stop an annoying dashboard chime → classify as negative reinforcement (removing an aversive stimulus increases buckling).',
      'When you see a child pouring water into a taller thin glass and insisting it now holds more liquid → place the child in Piaget\'s preoperational stage (lacking conservation).',
      'When you see slot-machine play persisting despite long losing streaks → identify a variable-ratio schedule producing high resistance to extinction.',
      'When you see rats navigating a maze without reward and suddenly running it rapidly once food appears → identify Tolman\'s latent learning via cognitive maps.'
    ],
    cautions: [
      'In operant conditioning, "positive" means ADDING a stimulus and "negative" means REMOVING a stimulus—never "good" or "bad."',
      'Authoritative parenting (high warmth + clear, reasoned boundaries) is distinct from authoritarian parenting (low warmth + rigid obedience).',
      'Cross-sectional studies cannot separate true aging effects from generational cohort differences.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-psych-reference-04',
    domainId: 'social-psychology-and-personality',
    domainLabel: 'Unit 4: Social Psychology and Personality',
    title: 'Social Influence, Attributions, Personality & Motivation',
    purpose: 'Clarifies attribution errors, conformity and group dynamics, personality frameworks, and core motivational and emotional theories.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key constructs & designs',
    checklist: [
      'Identify whether an attribution explains another person\'s mistake (fundamental attribution error) versus one\'s own success/failure (self-serving bias).',
      'Check whether group presence involves individual evaluated performance (social facilitation) or pooled unidentifiable effort (social loafing).',
      'Verify which personality perspective (psychodynamic, humanistic, social-cognitive, or Big Five trait) matches the prompt\'s mechanism.'
    ],
    formulas: [
      'Attributions & persuasion: fundamental attribution error (overweighting dispositional traits for others), actor-observer bias, cognitive dissonance (attitude shifts to match behavior), central (logic) vs. peripheral (cues) persuasion.',
      'Group & compliance dynamics: Asch conformity (normative vs. informational influence), Milgram obedience, group polarization, groupthink (harmony overrides critique), bystander effect (diffusion of responsibility), foot-in-the-door vs. door-in-the-face.',
      'Personality theories: Big Five OCEAN (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism); Bandura reciprocal determinism & self-efficacy; Rogers unconditional positive regard; Freud defense mechanisms.',
      'Motivation & emotion: Yerkes-Dodson law (moderate arousal optimal; lower for complex tasks, higher for simple tasks), intrinsic vs. extrinsic motivation (overjustification effect), Lewin approach-avoidance conflicts, facial-feedback hypothesis.'
    ],
    decisionRules: [
      'When you see a like-minded committee end a discussion holding a more extreme stance than members started with → identify group polarization (distinct from groupthink\'s suppression of dissent).',
      'When you see someone agree to put a giant billboard in their yard after first agreeing to a small window sticker → identify the foot-in-the-door compliance technique.',
      'When you see an expert musician play faster in front of an audience while a novice stumbles → identify social facilitation (audience boosts dominant well-learned responses).',
      'When you see children stop drawing for fun once external prizes for drawing are removed → diagnose the overjustification effect undermining intrinsic motivation.'
    ],
    cautions: [
      'Do not confuse prejudice (an unjustified attitude), stereotype (a generalized belief), and discrimination (unjust behavior toward a group).',
      'Negative reinforcement is behavioral, whereas cognitive dissonance requires internal psychological tension between conflicting beliefs and actions.',
      'High scores on Big Five neuroticism indicate emotional instability/reactivity, not clinical neurosis.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-psych-reference-05',
    domainId: 'mental-and-physical-health',
    domainLabel: 'Unit 5: Mental and Physical Health',
    title: 'Stress, Positive Psych, Disorders & Evidence-Based Care',
    purpose: 'Links stress physiology, DSM-5-TR diagnostic frameworks, psychological and biomedical treatments, and experimental evaluation of treatment efficacy.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key constructs & designs',
    checklist: [
      'Evaluate symptoms through the biopsychosocial and diathesis-stress lenses rather than attributing disorders to a single biological or environmental cause.',
      'Distinguish positive symptoms of schizophrenia (added experiences like hallucinations/delusions) from negative symptoms (diminished speech, flat affect, avolition).',
      'Check experimental rigor (random assignment, double-blind placebo control, operational definitions) when judging whether a therapy study supports causation.'
    ],
    formulas: [
      'Stress & positive psychology: Selye\'s General Adaptation Syndrome (alarm → resistance → exhaustion); problem-focused vs. emotion-focused coping; positive psychology (resilience, signature strengths, gratitude, posttraumatic growth).',
      'Diagnostic framework (DSM-5-TR): dysfunction, distress, and deviance from cultural norms; major categories include neurodevelopmental, schizophrenia spectrum, depressive/bipolar, anxiety/OCD/PTSD, dissociative, eating, and personality disorders.',
      'Psychotherapies: CBT (reframes maladaptive thoughts + behavioral activation), exposure/systematic desensitization (counterconditioning for phobias), client-centered humanistic (empathy, active listening), psychodynamic (insight).',
      'Biomedical interventions: SSRIs (prolong serotonin for depression/anxiety), antipsychotics (block dopamine D2 receptors), anxiolytics (enhance GABA inhibition), lithium (mood stabilizer for bipolar), ECT/TMS for treatment-resistant depression.'
    ],
    decisionRules: [
      'When you see a patient pairing progressive muscle relaxation with a gradual hierarchy of feared stimuli → identify systematic desensitization (behavioral counterconditioning).',
      'When you see a client alternating between weeks of severe hopeless depression and episodes of sleepless, euphoric, impulsive grandiosity → diagnose bipolar disorder rather than major depressive disorder.',
      'When you see intrusive unwanted obsessions temporarily relieved by repetitive ritualistic behaviors → identify obsessive-compulsive disorder maintained via negative reinforcement.',
      'When you see a clinical trial using random assignment to CBT vs. waitlist control and double-blind outcome raters → conclude causal evidence of treatment efficacy while controlling experimenter bias.'
    ],
    cautions: [
      'In schizophrenia, "positive" symptoms mean ADDED abnormal behaviors (hallucinations, delusions), NOT beneficial symptoms; "negative" symptoms mean ABSENT normal functions (flat affect, avolition).',
      'Dissociative identity disorder (two or more distinct identity states) is completely separate from schizophrenia (psychosis/split from reality).',
      'Correlational studies of stress and illness cannot establish causation because of third-variable confounds and bidirectional relationships.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
];

const ap_us_government_foundation_pilot = [
  {
    id: 'ap-usgov-reference-01',
    domainId: 'foundations-of-american-democracy',
    domainLabel: 'Foundations of American Democracy',
    title: 'Constitutional Foundations, Factions & Federalism',
    purpose: 'Anchors Enlightenment theory, foundational Federalist/Anti-Federalist debates, constitutional compromises, and the shifting balance of federal-state power.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key laws, clauses & cases',
    checklist: [
      'Identify which constitutional clause (Supremacy, Necessary and Proper, Commerce, or 10th Amendment) anchors the dispute over federal vs. state authority.',
      'Match each ideological argument directly to the required foundational document (Declaration, Articles, Constitution, Federalist 10/51, or Brutus 1).',
      'Distinguish fiscal federalism tools by state discretion: categorical grants (strict strings) vs. block grants (broad flexibility) vs. unfunded mandates.'
    ],
    formulas: [
      'Foundational documents: Declaration of Independence (natural rights, social contract, popular sovereignty); Articles of Confederation (weak unicameral Congress, no tax/commerce power); U.S. Constitution (Great, Three-Fifths, and Electoral Compromises).',
      'Federalist No. 10 (Madison) argues a large republic controls the mischief of factions; Brutus No. 1 warns a large central government using the Necessary & Proper and Supremacy Clauses will crush state power and liberty.',
      'Federalist No. 51 (Madison): "Ambition must be made to counteract ambition" justifies separation of powers and checks and balances across branches.',
      'Required federalism SCOTUS cases: McCulloch v. Maryland (1819) upheld implied powers via Necessary & Proper and federal supremacy over state taxation; United States v. Lopez (1995) limited Congress\'s Commerce Clause power.'
    ],
    decisionRules: [
      'When you see a prompt contrasting participatory, pluralist, and elite democracy → link participatory to citizen initiatives/town halls, pluralist to competing interest groups, and elite to filtered representation like the Electoral College.',
      'When you see Congress tying highway funding to a 21-year-old drinking age → classify it as a categorical grant condition expanding federal influence over states.',
      'When you see a SCOTUS ruling striking down a federal law for intruding on local non-economic activity → connect the reasoning to United States v. Lopez (1995) and the 10th Amendment.',
      'When you see a state attempting to tax or obstruct a federal agency → apply McCulloch v. Maryland (1819) and the Supremacy Clause to rule in favor of federal authority.'
    ],
    cautions: [
      'Federalist No. 10 does NOT argue for eliminating factions (which would destroy liberty); it argues for controlling their effects in an extended republic.',
      'Do not confuse block grants (preferred by states for broad discretion) with categorical grants (preferred by Congress for targeted strings).',
      'Under the Articles of Confederation, there was no independent executive branch or national judiciary, and amendments required unanimous approval of all 13 states.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-usgov-reference-02',
    domainId: 'interactions-among-branches',
    domainLabel: 'Interactions Among Branches of Government',
    title: 'Congress, Presidency, Judiciary & Federal Bureaucracy',
    purpose: 'Organizes institutional powers, inter-branch checks, judicial review, redistricting rulings, and bureaucratic rulemaking and oversight.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key laws, clauses & cases',
    checklist: [
      'Distinguish chamber-specific powers: House (revenue bills, impeachment, Rules Committee, 2-year terms) vs. Senate (advice and consent for treaties/nominations, impeachment trial, filibuster/60-vote cloture, 6-year terms).',
      'Separate formal presidential powers in Article II (veto, commander-in-chief, appointments, treaties) from informal powers (executive orders, executive agreements, signing statements, bully pulpit).',
      'Identify the specific constitutional check each branch can exercise over a bureaucratic agency or federal court ruling.'
    ],
    formulas: [
      'Redistricting SCOTUS cases: Baker v. Carr (1962) made malapportionment justiciable ("one person, one vote"); Shaw v. Reno (1993) struck down racial gerrymandering under the 14th Amendment Equal Protection Clause.',
      'Executive & Judicial documents: Federalist No. 70 (Hamilton) defends an energetic single executive for accountability and decisiveness; Federalist No. 78 (Hamilton) defends judicial independence via life tenure and judicial review.',
      'Marbury v. Madison (1803): established judicial review empowering federal courts to declare acts of Congress or the executive unconstitutional.',
      'Bureaucracy & oversight: civil service merit system (Pendleton Act), delegated discretionary rulemaking authority, iron triangles (agency + congressional committee + interest group) vs. fluid issue networks, checked via congressional oversight hearings and power of the purse.'
    ],
    decisionRules: [
      'When you see Congress unable to pass a bill and a president issuing a directive to federal agencies → identify an executive order (informal power) that can be reversed by a future president, overridden by statute, or struck down by courts.',
      'When you see a Supreme Court decision unpopular with Congress → identify valid congressional checks as passing new statutory legislation, proposing a constitutional amendment, altering court jurisdiction, or confirming new justices.',
      'When you see mandatory spending (Social Security, Medicare, interest on debt) rising → recognize it shrinks discretionary budget room because entitlements are set by existing law rather than annual appropriations.',
      'When you see a legislator voting strictly according to constituent polls vs. personal judgment → distinguish delegate model (constituent wishes) from trustee model (independent judgment) and politico model (blends both).'
    ],
    cautions: [
      'Congress—not the President—holds the formal power to declare war, though the War Powers Resolution (1973) sought to constrain presidential troop deployments.',
      'Executive agreements with foreign leaders do not require two-thirds Senate ratification, unlike formal treaties, and are not binding on future presidents.',
      'Federal judges hold life tenure during "good behavior" specifically to insulate them from partisan election pressure, not because they are immune from impeachment.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-usgov-reference-03',
    domainId: 'civil-liberties-and-civil-rights',
    domainLabel: 'Civil Liberties and Civil Rights',
    title: 'Bill of Rights, Selective Incorporation & Equal Protection',
    purpose: 'Maps the 14th Amendment selective incorporation doctrine and required Supreme Court precedents protecting speech, religion, due process, and equality.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key laws, clauses & cases',
    checklist: [
      'Distinguish civil liberties (constitutional protections FROM government intrusion, mostly Bill of Rights) from civil rights (equal protection UNDER the law via the 14th Amendment and federal statutes).',
      'Pinpoint the exact constitutional clause in play: Establishment vs. Free Exercise (1st), Due Process vs. Equal Protection (14th), or 2nd/4th/5th/6th Amendment.',
      'Check whether the challenged law is federal or state/local so you remember to cite selective incorporation via the 14th Amendment Due Process Clause when states are bound.'
    ],
    formulas: [
      '1st Amendment Religion: Engel v. Vitale (1962) barred state-sponsored school prayer under the Establishment Clause; Wisconsin v. Yoder (1972) exempted Amish students from compulsory high school under the Free Exercise Clause.',
      '1st Amendment Speech & Press: Tinker v. Des Moines (1969) protected student symbolic speech absent substantial disruption; Schenck v. U.S. (1919) allowed wartime speech limits ("clear and present danger"); New York Times Co. v. U.S. (1971) set a heavy presumption against prior restraint.',
      'Selective incorporation & rights of the accused: Gideon v. Wainwright (1963) incorporated 6th Amendment right to counsel for indigent felony defendants; McDonald v. Chicago (2010) incorporated 2nd Amendment individual gun rights against states via 14th Due Process.',
      'Civil Rights anchors: Brown v. Board of Education (1954) ended de jure school segregation under Equal Protection; MLK Jr.\'s Letter from Birmingham Jail (1963) justified nonviolent civil disobedience against unjust laws; Civil Rights Act (1964), Voting Rights Act (1965), and Title IX (1972).'
    ],
    decisionRules: [
      'When you see a public school punishing peaceful student protest symbols that do not disrupt classes → apply Tinker v. Des Moines (1969) to protect the symbolic speech.',
      'When you see the federal government trying to block a newspaper from publishing leaked documents before print → apply New York Times Co. v. U.S. (1971) against prior restraint.',
      'When you see a state or municipal law restricting a Bill of Rights guarantee → connect the ruling to selective incorporation through the 14th Amendment Due Process Clause (as in Gideon or McDonald).',
      'When you see a prompt asking how social movements drove statutory change → link Letter from Birmingham Jail and grassroots protests to the Civil Rights Act of 1964 and Voting Rights Act of 1965.'
    ],
    cautions: [
      'Do not confuse the Establishment Clause (government cannot endorse or sponsor religion: Engel) with the Free Exercise Clause (government cannot unduly burden religious practice: Yoder).',
      'Selective incorporation applies Bill of Rights protections to states case-by-case through the 14th Amendment Due Process Clause—not automatically all at once.',
      'De jure segregation (enforced by law) was struck down in Brown v. Board, whereas de facto segregation (arising from housing patterns and income) persists without explicit statutory mandates.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-usgov-reference-04',
    domainId: 'american-political-ideologies-and-beliefs',
    domainLabel: 'American Political Ideologies and Beliefs',
    title: 'Political Socialization, Polling & Economic Policy',
    purpose: 'Links American political culture, public-opinion survey methodology, ideological cleavages, and fiscal vs. monetary economic policy tools.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key laws, clauses & cases',
    checklist: [
      'Evaluate polling data for scientific rigor first: random/stratified sampling, adequate sample size, neutral question wording, and overlapping margins of error.',
      'Distinguish fiscal policy (taxing and spending by Congress and the President) from monetary policy (money supply and interest rates by the independent Federal Reserve).',
      'Verify whether a candidate\'s position reflects liberal, conservative, or libertarian priorities on BOTH economic regulation and social issues.'
    ],
    formulas: [
      'Core American political culture: individualism, equality of opportunity (not guaranteed outcome), free enterprise, rule of law, and limited government.',
      'Political socialization agents: family (strongest early predictor), schools, peers, media, religious institutions, lifecycle effects (aging shifts), and generational effects (shared major historical events).',
      'Polling methodology: random sampling ensures representativeness; sampling error (typically ±3%) means a 48% vs. 46% race is a statistical tie; types include benchmark, tracking, entrance, and exit polls.',
      'Macroeconomic frameworks: Keynesian fiscal policy uses deficit spending/tax cuts to boost demand in recessions; supply-side favors lower taxes/deregulation; Federal Reserve monetary policy uses open-market bond operations, discount rate, and reserve requirements.'
    ],
    decisionRules: [
      'When you see a poll showing Candidate A at 51% and Candidate B at 48% with a ±3% margin of error → interpret the race as statistically tied because the confidence intervals overlap.',
      'When you see an online voluntary opt-in survey or loaded question phrasing → reject the poll as non-scientific due to selection bias or question-wording bias.',
      'When you see inflation rising and the Federal Reserve raising interest rates or selling government bonds → classify the move as contractionary monetary policy independent of Congress.',
      'When you see a platform favoring minimal government intervention in both markets AND personal social choices → classify it as libertarian rather than traditional conservative or liberal.'
    ],
    cautions: [
      'Generational effects reflect a shared historical cohort event (like coming of age during the Great Depression or 9/11), whereas lifecycle effects occur naturally as any cohort ages.',
      'The Federal Reserve controls monetary policy, NOT federal tax rates or congressional appropriations.',
      'A larger sample size cannot fix a non-random biased sampling frame.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-usgov-reference-05',
    domainId: 'political-participation',
    domainLabel: 'Political Participation',
    title: 'Voting, Parties, Interest Groups, Campaigns & Media',
    purpose: 'Synthesizes suffrage expansions, voter-choice models, linkage institutions, campaign finance jurisprudence, and modern media dynamics.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key laws, clauses & cases',
    checklist: [
      'Identify which linkage institution (political party, interest group, election, or media) connects citizens to policymakers in the scenario.',
      'Match voting-rights amendments and statutes to the exact barrier removed (race, gender, poll tax, age, direct Senate election).',
      'Separate hard-money direct candidate contributions (capped by FEC) from unlimited independent expenditures by Super PACs.'
    ],
    formulas: [
      'Suffrage amendments: 15th (race), 17th (direct election of senators), 19th (women), 24th (bans poll taxes), and 26th (lowers voting age to 18); Voter behavior models: rational-choice, retrospective, prospective, and party-line.',
      'Party & election structure: single-member winner-take-all districts (Duverger\'s law) entrench the two-party system and hinder third parties; open vs. closed primaries; Electoral College awards 270-vote majority.',
      'Citizens United v. FEC (2010): ruled 1st Amendment free speech protects unlimited independent political expenditures by corporations and unions, fueling Super PACs (cannot coordinate directly with candidates).',
      'Interest groups & media: lobbying, iron triangles, amicus curiae briefs, and overcoming the free-rider problem via selective incentives; media acts as gatekeeper, watchdog, and horse-race scorekeeper amid partisan fragmentation.'
    ],
    decisionRules: [
      'When you see a voter punishing an incumbent president because unemployment rose over the past two years → classify the decision as retrospective voting.',
      'When you see an interest group offering travel discounts or magazines exclusively to dues-paying members → recognize selective material benefits designed to solve the free-rider problem.',
      'When you see a state switching from closed primaries to open primaries → predict broader independent voter participation and potentially more moderate nominees.',
      'When you see news outlets emphasizing poll standings and campaign gaffes over policy substance → identify horse-race journalism.'
    ],
    cautions: [
      'Super PACs may raise and spend unlimited sums independently under Citizens United, but they are legally prohibited from contributing directly to or coordinating with candidate campaigns.',
      'Political parties seek to win elections and control government broadly, whereas interest groups seek to influence specific policies without running candidates under their own ballot label.',
      'Midterm congressional elections consistently see lower voter turnout than presidential election years, often favoring older, more educated, and more partisan voters.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
];

const ap_us_history_foundation_pilot = [
  {
    id: 'ap-ush-reference-01',
    domainId: 'period-1-1491-1607',
    domainLabel: 'Unit 1: Period 1: 1491-1607',
    title: 'Pre-Columbian Societies & the Columbian Exchange',
    purpose: 'Anchors environmental adaptation among Indigenous nations, Spanish imperial labor systems, and transatlantic biological and demographic transformation.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Connect each pre-1492 Indigenous society directly to its regional environment (arid Southwest, Great Plains, Northeast woodlands, or Pacific Northwest).',
      'Trace bidirectional Columbian Exchange flows carefully: New World crops went east, while Old World livestock and epidemic diseases came west.',
      'Distinguish Spanish crown motives (wealth, Catholic conversion, imperial prestige) from how Spanish colonists actually treated Indigenous and African labor.'
    ],
    formulas: [
      'Regional Indigenous diversity (pre-1492): maize irrigation among Southwest Pueblo; mobile bison hunting on Great Plains; Three Sisters agriculture & Iroquois Confederacy in Northeast; maritime fishing/plank houses in Pacific Northwest.',
      'Columbian Exchange (post-1492): American maize, potatoes, and cassava fueled European/African population growth; European horses transformed Plains hunting while smallpox/measles caused catastrophic Indigenous mortality.',
      'Spanish colonial labor & hierarchy: encomienda system extracted Indigenous tribute/labor; casta system ranked peninsulares, criollos, mestizos, and mulattoes; declining Indigenous populations spurred the transatlantic African slave trade (asiento).',
      'Valladolid Debate (1550–1551): Bartolomé de las Casas challenged Juan Ginés de Sepúlveda over Indigenous humanity and harsh encomienda abuses, leading to the New Laws of 1542.'
    ],
    decisionRules: [
      'When you see an APUSH prompt asking why European populations grew rapidly after 1500 → cite calorie-dense New World crops (potatoes, maize) and silver bullion shifting Europe from feudalism toward capitalism.',
      'When you see an excerpt comparing Pueblo irrigation villages with Great Plains nomadic camps → argue that local climate and resource availability shaped distinct economic and social structures.',
      'When you see Spanish authorities transitioning from encomienda labor toward African chattel slavery → link the shift to Indigenous demographic collapse from disease, resistance, and Las Casas\'s advocacy.',
      'When you see joint-stock companies mentioned alongside 16th-century exploration → identify pooled investor capital spreading maritime risk as Spain\'s silver influx reshaped European trade.'
    ],
    cautions: [
      'Do not treat pre-Columbian Native Americans as a single uniform culture; APUSH rubrics reward specific regional contrasts tied to ecology.',
      'Horses were NOT native to the Americas in 1491; Spanish introduction reshaped Great Plains bison hunting after European contact.',
      'Period 1 ends in 1607 with Jamestown—do not pull Puritan Massachusetts Bay (1630) or Bacon\'s Rebellion (1676) back into Period 1.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-02',
    domainId: 'period-2-1607-1754',
    domainLabel: 'Unit 2: Period 2: 1607-1754',
    title: 'Colonial Regions, Labor Shifts & Atlantic Worlds',
    purpose: 'Contrasts European imperial models and British colonial regions while tracking the rise of chattel slavery, mercantilism, and religious revival.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Compare European empires by settlement pattern: Spanish extraction/missions, French/Dutch fur-trade alliances, and British populous settler agriculture.',
      'Differentiate Chesapeake/Southern plantation colonies, New England Puritan communities, and diverse Middle Colonies by economy, family structure, and labor system.',
      'Keep Period 2 strictly before the Seven Years\' War (1754)—colonies operated under mercantilist Navigation Acts paired with loose salutary neglect.'
    ],
    formulas: [
      'British regional divergence: Jamestown (1607) & Chesapeake tobacco monoculture; Plymouth (1620) & Massachusetts Bay (1630) Puritan family towns; Middle Colonies ("breadbasket") with Quaker/Dutch religious tolerance; Caribbean sugar plantations.',
      'Transition to racialized chattel slavery: Bacon\'s Rebellion (1676) alarmed Virginia planters over landless former indentured servants, accelerating reliance on enslaved Africans codified in strict slave codes; Stono Rebellion (1739) spurred harsher controls.',
      'Indigenous resistance: Metacom\'s / King Philip\'s War (1675–1676) devastated New England Algonquian power; Pueblo Revolt (1680) led by Popé temporarily expelled Spanish rule from New Mexico and won greater religious accommodation.',
      'Transatlantic currents: Navigation Acts enforced mercantilism amid salutary neglect; First Great Awakening (Jonathan Edwards, George Whitefield) challenged clerical authority alongside Enlightenment natural-rights print culture.'
    ],
    decisionRules: [
      'When you see a question explaining why Virginia planters shifted from white indentured servants to enslaved Africans after 1676 → cite Bacon\'s Rebellion, rising European wages shrinking servant supply, and permanent hereditary labor codes.',
      'When you see a comparison of French and British relations with Native Americans → emphasize that smaller French fur-trading populations relied on intermarriage and military alliances, whereas land-hungry British settlers displaced tribes.',
      'When you see a 1740s sermon emphasizing emotional personal conversion and questioning established ministers → link it to the First Great Awakening fostering intercolonial identity and challenges to hierarchy.',
      'When you see colonial assemblies like the Virginia House of Burgesses or New England town meetings → connect self-governance to salutary neglect and distance from London.'
    ],
    cautions: [
      'Slavery existed in ALL thirteen British colonies (including New York and New England), though plantation economies in the Chesapeake, Carolinas, and West Indies relied on it most heavily.',
      'Puritans in Massachusetts Bay sought religious freedom for themselves, NOT broad religious toleration for dissenters like Roger Williams or Anne Hutchinson.',
      'The First Great Awakening did not directly call for American independence in the 1740s; rather, it habituated colonists to questioning institutional authority.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-03',
    domainId: 'period-3-1754-1800',
    domainLabel: 'Unit 3: Period 3: 1754-1800',
    title: 'Imperial Crisis, Revolution & the Early Republic',
    purpose: 'Traces the pivot from the Seven Years\' War to independence, constitutional design, and the ideological clash of the First Party System.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Anchor 1763 as the decisive turning point ending salutary neglect because British war debt triggered direct parliamentary taxation and western settlement limits.',
      'Trace the structural leap from the Articles of Confederation (state sovereignty, no taxing power) to the 1787 Constitution (federalism, checks and balances).',
      'Separate Hamiltonian Federalists (national bank, loose construction, pro-British trade) from Jeffersonian Democratic-Republicans (agrarianism, strict construction, pro-French).'
    ],
    formulas: [
      'Road to Revolution (1754–1776): Seven Years\' War → Proclamation of 1763, Stamp Act (1765), Townshend Duties, Boston Tea Party (1773), Coercive Acts → Thomas Paine\'s Common Sense & Declaration of Independence (1776).',
      'Revolutionary War & aftermath: Battle of Saratoga (1777) secured the decisive French alliance; Treaty of Paris (1783) recognized U.S. independence; Republican Motherhood expanded women\'s civic role in educating virtuous citizens.',
      'Confederation to Constitution: Northwest Ordinance (1787) created orderly statehood and banned slavery in Northwest Territory, while Shays\' Rebellion (1786–1787) exposed federal weakness → 1787 Constitution & 1791 Bill of Rights.',
      'Early Republic First Party System (1790s): Hamilton\'s Financial Plan (debt assumption, BUS, tariffs), Whiskey Rebellion (1794), Washington\'s Farewell Address (1796 warning against factions and permanent foreign alliances), Alien & Sedition Acts (1798) and Virginia/Kentucky Resolutions.'
    ],
    decisionRules: [
      'When you see a 1760s colonial protest citing "no taxation without representation" → note colonists rejected British "virtual representation" while initially seeking restored imperial rights, not immediate independence.',
      'When you see a comparison of Shays\' Rebellion (1786) and the Whiskey Rebellion (1794) → contrast Articles helplessness with Washington\'s decisive federal enforcement under the new Constitution.',
      'When you see Virginia and Kentucky Resolutions (1798) responding to the Alien and Sedition Acts → identify early states\'-rights nullification arguments contesting federal overreach.',
      'When you see a prompt on Revolutionary War limitations → note gradual northern emancipation contrasted with constitutional protections for slavery (Three-Fifths Compromise, 1808 slave-trade clause) and westward displacement of Native allies.'
    ],
    cautions: [
      'The Stamp Act (1765) provoked fierce unity because it was a direct internal tax on printed paper, unlike earlier external customs duties regulating trade.',
      'Washington\'s Farewell Address warned against permanent foreign alliances and partisan factions, NOT against international commercial trade.',
      'The Bill of Rights was added in 1791 as a concession to Anti-Federalist ratification concerns, not included in the original 1787 Philadelphia draft.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-04',
    domainId: 'period-4-1800-1848',
    domainLabel: 'Unit 4: Period 4: 1800-1848',
    title: 'Market Revolution, Jacksonian Democracy & Reform',
    purpose: 'Links economic transformation, expanding white male suffrage, sectional compromises, and Second Great Awakening reform movements.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Connect transportation/industrial innovations (Erie Canal, steamboats, railroads, cotton gin) directly to regional specialization across North, Midwest, and South.',
      'Track how Jacksonian Democracy expanded voting for white men while excluding women, African Americans, and forcibly removing Native nations.',
      'Distinguish Period 4\'s Missouri Compromise (1820) and Second Party System (Democrats vs. Whigs) from Period 5\'s post-1848 sectional breakdown.'
    ],
    formulas: [
      'Jeffersonian Republic & Nationalism: Election of 1800 peaceful transfer; Marbury v. Madison (1803); Louisiana Purchase (1803); War of 1812 (Hartford Convention doomed Federalists); Monroe Doctrine (1823).',
      'Market Revolution & American System: Erie Canal (1825), Lowell textile mills, interchangeable parts, and cotton gin linked Northern factories, Western grain, and Southern cotton; Clay\'s American System pushed tariffs, Second BUS, and internal improvements.',
      'Jacksonian Era & Second Party System: universal white male suffrage; Democrats (Jackson) vs. Whigs (Clay); Nullification Crisis (1832–1833), Bank War, and Indian Removal Act (1830) leading to the Trail of Tears.',
      'Reform & Sectionalism: Second Great Awakening fueled abolitionism (Garrison\'s Liberator, Frederick Douglass), Seneca Falls Convention (1848 Declaration of Sentiments), temperance, and public schooling; Missouri Compromise (1820) drew the 36°30\' slavery line.'
    ],
    decisionRules: [
      'When you see the cotton gin (1793) paired with Northern textile mills → explain how industrialization in New England depended on and entrenched plantation slavery across the Deep South.',
      'When you see South Carolina threatening to nullify the Tariff of 1828/1832 → connect Calhoun\'s theory to regional resentment of Northern industrial protectionism and Jackson\'s Force Bill asserting federal supremacy.',
      'When you see women organizing temperance, asylum reform, and abolition societies under the "cult of domesticity" → explain how moral-guardian ideology paradoxically propelled women into public activism and Seneca Falls (1848).',
      'When you see Marshall Court decisions (McCulloch, Gibbons v. Ogden, Dartmouth College) → recognize a consistent pattern strengthening federal authority and contract/market stability over state laws.'
    ],
    cautions: [
      'The Missouri Compromise (1820) applied ONLY to the Louisiana Purchase territory—not to later lands acquired from Mexico in 1848.',
      'Early abolitionists like William Lloyd Garrison remained a vocal minority in the North during Period 4; most Northern whites opposed slavery\'s westward expansion (Free Soil) rather than immediate racial equality.',
      'Jackson opposed the Second Bank of the United States and federal internal improvements like the Maysville Road, yet strongly defended federal union during the Nullification Crisis.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-05',
    domainId: 'period-5-1844-1877',
    domainLabel: 'Unit 5: Period 5: 1844-1877',
    title: 'Manifest Destiny, Civil War & Reconstruction',
    purpose: 'Follows how territorial expansion shattered sectional compromises, how Union victory ended slavery, and why Reconstruction both transformed and fell short of equality.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Trace each 1850s crisis directly back to the core question: whether Congress could prohibit slavery in newly acquired western territories.',
      'Distinguish wartime strategic turning points (Antietam/Emancipation Proclamation, Gettysburg, Vicksburg) from constitutional changes (13th, 14th, 15th Amendments).',
      'Evaluate Reconstruction by weighing real breakthroughs (citizenship, Black officeholders, Freedmen\'s Bureau schools) against Southern backlash and Northern retreat.'
    ],
    formulas: [
      'Expansion ignites crisis: Manifest Destiny, Texas annexation (1845), Mexican-American War (1846–1848) & Treaty of Guadalupe Hidalgo → Mexican Cession sparked Wilmot Proviso and Compromise of 1850 (California free, harsh Fugitive Slave Act).',
      'Breakdown of Union (1854–1860): Kansas-Nebraska Act (1854, popular sovereignty repealed 36°30\' line → Bleeding Kansas & Republican Party); Dred Scott v. Sandford (1857) denied Black citizenship and voided congressional bans on territorial slavery; Election of 1860 triggered secession.',
      'Civil War (1861–1865): Union advantages in industry, railroads, and manpower; Emancipation Proclamation (1863) redefined war aims to end slavery in rebelling states and blocked British/French intervention; Gettysburg & Vicksburg (1863) shifted momentum.',
      'Reconstruction (1865–1877): 13th (abolition), 14th (birthright citizenship & equal protection), and 15th (Black male voting) Amendments; Radical Reconstruction & Freedmen\'s Bureau opposed by Black Codes, KKK, and sharecropping until Compromise of 1877 withdrew federal troops.'
    ],
    decisionRules: [
      'When you see why Lincoln\'s 1860 election caused immediate Southern secession despite his pledge not to touch slavery where it existed → explain that the Republican Free-Soil platform blocked slavery\'s westward expansion and threatened Southern political power.',
      'When you see the Emancipation Proclamation evaluated as a primary source → note it freed enslaved people ONLY in Confederate-held states (not loyal border states) while authorizing Black Union soldiers and transforming war aims.',
      'When you see women\'s-rights leaders like Stanton and Anthony splitting over the 15th Amendment → cite frustration that voting rights explicitly protected race while excluding sex.',
      'When you see Southern sharecropping contracts in the 1870s → interpret them as economic continuity trapping freedpeople and poor whites in debt peonage after chattel slavery ended.'
    ],
    cautions: [
      'The Emancipation Proclamation did NOT legally abolish slavery nationwide; the 13th Amendment (1865) accomplished permanent nationwide abolition.',
      'Lincoln did NOT run in 1860 as an immediate abolitionist; he opposed the expansion of slavery into western territories.',
      'The Compromise of 1877 ended federal military Reconstruction in the South—it did not formally repeal the 14th or 15th Amendments, which were instead narrowed by court rulings and state disenfranchisement.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-06',
    domainId: 'period-6-1865-1898',
    domainLabel: 'Unit 6: Period 6: 1865-1898',
    title: 'Gilded Age Industry, Immigration, West & Populism',
    purpose: 'Organizes corporate consolidation, labor unrest, New Immigration, New South segregation, western assimilation, and agrarian Populist protest.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Keep Period 6 (1865–1898) distinct from Period 7\'s Progressive Era: Gilded Age federal policy remained largely laissez-faire and pro-business despite rising protest.',
      'Compare labor unions by membership and strategy: Knights of Labor (inclusive, broad reform) vs. AFL (skilled craft workers, "bread-and-butter" wages/hours).',
      'Connect industrial capitalism, urban immigration, western railroad expansion, and Southern Jim Crow as interlocking features of one era.'
    ],
    formulas: [
      'Industrial capitalism: transcontinental railroad (1869) created national markets; Carnegie (vertical integration, Gospel of Wealth) and Rockefeller (horizontal trusts) defended laissez-faire alongside Social Darwinism; Interstate Commerce Act (1887) and Sherman Antitrust Act (1890) saw weak early enforcement.',
      'Labor & urban immigration: Great Railroad Strike (1877), Haymarket (1886), Homestead (1892), Pullman (1894); New Immigrants from Southern/Eastern Europe settled ethnic neighborhoods assisted by political machines (Tammany Hall) and Jane Addams\'s Hull House; Chinese Exclusion Act (1882).',
      'New South & Jim Crow: limited textile/steel industrialization alongside persistent sharecropping; disenfranchisement (poll taxes, literacy tests) and Plessy v. Ferguson (1896, "separate but equal"); Booker T. Washington (vocational accommodation) vs. Ida B. Wells & W.E.B. Du Bois (civil rights advocacy).',
      'The West & Populism: Homestead Act (1862), Dawes Severalty Act (1887 forced tribal land allotment/assimilation), Wounded Knee (1890); Grange & Farmers\' Alliances formed the Populist Party (1892 Omaha Platform: free silver, direct Senate election, graduated income tax, rail regulation).'
    ],
    decisionRules: [
      'When you see western farmers demanding "free silver" (16:1 silver-to-gold coinage) in 1896 → explain that inflation eased fixed mortgage debt burdens while eastern bankers favored the deflationary gold standard.',
      'When you see federal troops breaking the 1894 Pullman Strike under an antitrust injunction → conclude the Gilded Age federal government routinely sided with corporate management over organized labor.',
      'When you see the Dawes Act (1887) and Carlisle Indian Industrial School → identify federal policy aiming to erase tribal sovereignty and assimilate Native Americans into individual yeoman farmers.',
      'When you see Populist Party planks like direct election of senators and graduated income tax failing in 1896 → note continuity as Progressives later enacted many Populist reforms via the 16th and 17th Amendments.'
    ],
    cautions: [
      'Do not confuse Social Darwinism (survival of the fittest opposing charity) with Carnegie\'s Gospel of Wealth (wealthy philanthropists morally obligated to fund libraries/universities for self-help).',
      'The Sherman Antitrust Act of 1890 was initially used more effectively against labor unions than against corporate monopolies until Theodore Roosevelt\'s presidency in Period 7.',
      'New Immigrants (1880s–1920s) came largely from Southern and Eastern Europe (Italy, Poland, Russia), contrasting with Old Immigrants (1840s–1850s) from Ireland and Germany.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-07',
    domainId: 'period-7-1890-1945',
    domainLabel: 'Unit 7: Period 7: 1890-1945',
    title: 'Imperialism, Progressivism, New Deal & World Wars',
    purpose: 'Synthesizes America\'s rise to global power, Progressive state regulation, 1920s cultural clashes, New Deal safety nets, and WWII mobilization.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Contrast Progressive Era reforms (regulating capitalism to curb corporate/urban abuses) with the New Deal (direct federal relief, jobs, and financial safety nets during collapse).',
      'Track the swing in U.S. foreign policy: 1898 imperialism → 1917 WWI intervention → 1920s–1930s isolationism/Neutrality Acts → 1941 WWII global leadership.',
      'Evaluate wartime home fronts for both expanded opportunities (Great Migration, Rosie the Riveter) and civil-liberties restrictions (Espionage/Sedition Acts, Japanese American internment).'
    ],
    formulas: [
      'Overseas expansion & Progressivism: Spanish-American War (1898: Philippines, Puerto Rico, Guam), Open Door Policy, Roosevelt Corollary; muckrakers (Sinclair, Tarbell), Pure Food & Drug Act (1906), Federal Reserve (1913), and 16th/17th/18th/19th Amendments.',
      'WWI & 1920s cultural tensions: 1917 U.S. entry (unrestricted submarine warfare, Zimmermann Telegram), Great Migration, Senate rejection of Treaty of Versailles/League of Nations; 1920s mass consumerism, Harlem Renaissance, Scopes Trial, First Red Scare, and 1921/1924 Immigration Quota Acts.',
      'Great Depression & New Deal (1929–1939): crash exposed overproduction, credit speculation, and weak banks; FDR\'s Relief-Recovery-Reform (FDIC, CCC, AAA, WPA, Social Security Act 1935, Wagner Act/NLRA) forged the New Deal coalition and expanded federal responsibility.',
      'World War II (1941–1945): Lend-Lease → Pearl Harbor (Dec 7, 1941); wartime production ended the Depression; Double V campaign; Executive Order 9066 & Korematsu v. U.S. (1944) internment; D-Day, Pacific island hopping, and atomic bombs (August 1945).'
    ],
    decisionRules: [
      'When you see why the Senate rejected the Treaty of Versailles in 1919 → cite Article X of the League of Nations, which Henry Cabot Lodge argued infringed on Congress\'s constitutional power to declare war.',
      'When you see critics attacking the New Deal from both left and right → pair Huey Long/Francis Townsend (demanding deeper redistribution) against conservative Liberty League/Supreme Court objections to federal overreach.',
      'When you see the 1924 National Origins Act alongside the Scopes Trial and revival of the KKK → frame the 1920s as a clash between urban modernism/diversity and rural traditionalist/nativist anxieties.',
      'When you see why New Deal programs did not fully end the Great Depression → explain that massive federal WWII defense mobilization after 1941 finally eliminated mass unemployment.'
    ],
    cautions: [
      'Progressive reformers were mostly urban middle-class professionals—not agrarian Populists—and many Progressives ignored or endorsed racial segregation.',
      'Social Security (1935) initially excluded agricultural and domestic workers, disproportionately leaving out Black and Mexican American laborers.',
      'The U.S. did NOT join the League of Nations after WWI, marking a key contrast with U.S. leadership in founding the United Nations in 1945.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-08',
    domainId: 'period-8-1945-1980',
    domainLabel: 'Unit 8: Period 8: 1945-1980',
    title: 'Cold War Containment, Civil Rights & Great Society',
    purpose: 'Connects global containment strategy, postwar suburban prosperity, landmark civil rights victories, liberal Great Society programs, and 1970s disillusionment.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Track Cold War containment strategies across administrations: Truman economic/military aid, Eisenhower brinkmanship/covert ops, Kennedy/LBJ flexible response in Vietnam, and Nixon détente.',
      'Connect legal, grassroots, and legislative prongs of the Civil Rights Movement (NAACP courts + SCLC/SNCC direct action + 1964/1965 federal statutes).',
      'Identify why postwar liberal consensus fractured after 1968: Vietnam credibility gap, urban unrest, stagflation, Watergate, and conservative backlash.'
    ],
    formulas: [
      'Early Cold War & 1950s society: Containment (Kennan), Truman Doctrine (1947), Marshall Plan, Berlin Airlift, NATO (1949), Korean War (1950–1953), Second Red Scare/McCarthyism; GI Bill, Levittown suburbs, Baby Boom, Sun Belt growth, and Interstate Highway Act (1956).',
      'Civil Rights Movement: Brown v. Board (1954), Montgomery Bus Boycott (1955–1956), Little Rock Nine, Sit-ins & Freedom Rides, March on Washington (1963), Civil Rights Act (1964), Voting Rights Act (1965), and later shift toward Black Power.',
      'Great Society, Warren Court & Vietnam: LBJ\'s Medicare/Medicaid, War on Poverty, and Immigration and Nationality Act (1965 abolishing 1924 quotas); Warren Court expanded individual rights; Gulf of Tonkin (1964) → Tet Offensive (1968) → War Powers Act (1973).',
      '1970s rights & crises: Feminist (NOW, Title IX 1972), Chicano (UFW/César Chávez), AIM, Environmental (EPA 1970), and LGBTQ (Stonewall 1969) movements alongside Nixon détente (China/SALT I), Watergate (1972–1974), OPEC oil shocks, and stagflation.'
    ],
    decisionRules: [
      'When you see why the Civil Rights Act of 1964 and Voting Rights Act of 1965 passed after decades of delay → pair televised violence (Birmingham, Selma) and Cold War image pressure with LBJ\'s legislative leverage.',
      'When you see the 1968 Tet Offensive referenced in a Vietnam prompt → emphasize that although militarily repelled by U.S. forces, it shattered public trust ("credibility gap") and eroded support for escalation.',
      'When you see the 1965 Immigration and Nationality Act → link it to a dramatic demographic shift away from European quotas toward Latin American and Asian immigration.',
      'When you see white Southern Democrats shifting toward the Republican Party after 1964 → explain Nixon\'s Southern Strategy and conservative reaction against federal civil rights enforcement and Great Society liberalism.'
    ],
    cautions: [
      'Do not confuse the First Red Scare (1919–1920 Palmer Raids against anarchists/radicals) with the Second Red Scare (1947–1954 HUAC/McCarthyism targeting alleged Soviet spies).',
      'Cold War containment aimed to stop the SPREAD of communism rather than roll back existing Soviet control in Eastern Europe.',
      'Stagflation in the 1970s combined stagnant growth/high unemployment WITH high inflation simultaneously, defying traditional Keynesian trade-offs.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
  {
    id: 'ap-ush-reference-09',
    domainId: 'period-9-1980-present',
    domainLabel: 'Unit 9: Period 9: 1980-Present',
    title: 'Conservatism, Globalization & Post-Cold War America',
    purpose: 'Anchors the Reagan conservative realignment, end of the Cold War, digital/global economic restructuring, demographic shifts, and post-9/11 policy.',
    checklistLabel: 'Before answering',
    formulasLabel: 'Key periods & turning points',
    checklist: [
      'Evaluate Reagan-era conservatism across three pillars: supply-side tax cuts/deregulation, assertive anti-Soviet defense buildup, and Religious Right social politics.',
      'Distinguish conservative rhetoric about shrinking government from persistent entitlement spending (Social Security, Medicare) and rising federal deficits.',
      'Connect post-1980 manufacturing decline, NAFTA/globalization, and digital tech growth to widening wage inequality and regional political realignment.'
    ],
    formulas: [
      'Reagan Revolution (1980–1988): coalition of fiscal conservatives, Sun Belt voters, and Moral Majority; supply-side "Reaganomics" (1981 tax cuts, deregulation, PATCO strike) cut inflation alongside Volcker\'s Fed while defense spending expanded federal deficits.',
      'End of the Cold War: Reagan paired defense buildup (SDI) and anti-communist proxy support with diplomacy alongside Gorbachev (glasnost/perestroika, 1987 INF Treaty) → fall of Berlin Wall (1989) and Soviet collapse (1991).',
      'Economic & demographic transformation: shift from Rust Belt manufacturing to service/IT/internet economy; NAFTA (1994) and WTO expanded global trade; post-1965 Latin American/Asian immigration and Sun Belt migration reshaped electoral maps.',
      '21st-century challenges: September 11, 2001 attacks launched the War on Terror (Afghanistan 2001, Iraq 2003, USA PATRIOT Act security-vs-privacy debate), 2008 Great Recession, Affordable Care Act (2010), and climate/energy debates.'
    ],
    decisionRules: [
      'When you see a prompt asking how Reagan\'s policies succeeded AND faced limits → note major tax-rate reductions and deregulation succeeded, while Social Security, Medicare, and overall federal deficits remained large.',
      'When you see Rust Belt factory closures paired with Silicon Valley growth after 1980 → attribute the shift to automation, digital productivity gains, and globalized free-trade supply chains.',
      'When you see the USA PATRIOT Act (2001) compared to earlier crises → draw a historical parallel to wartime civil-liberties debates (Alien & Sedition Acts, Espionage Act, EO 9066).',
      'When you see political influence shifting toward Texas, Florida, and the Mountain West after 1980 → connect electoral-vote gains to postwar and late-20th-century Sun Belt population migration.'
    ],
    cautions: [
      'Supply-side Reaganomics did NOT balance the federal budget in the 1980s; tax cuts combined with steep defense spending and intact entitlements tripled the national debt.',
      'The Cold War did not end solely via military confrontation; Soviet economic stagnation, Gorbachev\'s reforms, and diplomatic arms treaties interacted with U.S. pressure.',
      'Period 9 emphasizes continuity as well as change: debates over immigration, federal safety nets, and executive war powers echo earlier APUSH periods.'
    ],
    originalStudyAid: true,
    officialExamReference: false,
    releaseEligible: false,
  },
];

module.exports = {
  ap_biology_foundation_pilot,
  ap_chemistry_foundation_pilot,
  ap_physics_1_foundation_pilot,
  ap_psychology_pilot,
  ap_us_government_foundation_pilot,
  ap_us_history_foundation_pilot,
};
