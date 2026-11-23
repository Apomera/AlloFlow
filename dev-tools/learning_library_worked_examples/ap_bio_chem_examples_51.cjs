'use strict';

const ap_biology_foundation_pilot = {
  'ap-bio-ch-01-section-01': {
    workedExample: {
      prompt: 'A linear glycogen chain holds 25 glucose monomers joined by glycosidic bonds. Calculate how many water molecules complete hydrolysis consumes, and explain how water polarity aids cleavage.',
      steps: [
        'Step 1: Count covalent linkages in a linear polymer of n monomers using bonds = n − 1, giving 25 − 1 = 24 glycosidic bonds.',
        'Step 2: Complete hydrolysis breaks each glycosidic linkage by adding one H2O (−H to one monomer and −OH to the other), consuming exactly 24 water molecules.',
        'Step 3: Water polarity (δ− oxygen, δ+ hydrogens) stabilizes polar transition states during enzymatic cleavage and forms hydrogen bonds that keep released glucose soluble.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often assume a polymer with n monomers contains n linkages and therefore requires n water molecules for complete hydrolysis.',
        repair: 'Sketch a 3-monomer chain to verify there are only 2 internal bonds, then apply the general rule of n − 1 water molecules for any linear polymer.',
      },
      {
        misconception: 'Many learners confuse polar covalent O−H bonds inside one water molecule with the hydrogen bonds linking neighboring water molecules.',
        repair: 'Distinguish strong intramolecular covalent bonds within H2O from weaker intermolecular hydrogen bonds between δ+ H and δ− O of adjacent molecules.',
      },
    ],
  },

  'ap-bio-ch-01-section-02': {
    workedExample: {
      prompt: 'A cold-water fish increases cis-unsaturated phospholipids in its gill membranes from 35% to 62% as water cools from 20°C to 4°C. Explain how fatty acid structure preserves fluidity.',
      steps: [
        'Step 1: Identify fatty acid geometry: cis carbon-carbon double bonds introduce rigid kinks in hydrocarbon tails, whereas saturated chains remain straight.',
        'Step 2: Kinked unsaturated tails prevent adjacent phospholipids from packing tightly, weakening intermolecular van der Waals attractions between hydrophobic chains.',
        'Step 3: Reduced packing density lowers the membrane solidification temperature, preserving fluidity so transport proteins continue functioning normally at 4°C.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently think starch and cellulose have different properties because they are built from completely different monosaccharide monomers.',
        repair: 'Both polymers are built from glucose, but α-1,4 linkages yield helical digestible starch whereas β-1,4 linkages form straight hydrogen-bonded cellulose fibrils.',
      },
      {
        misconception: 'Some learners assume cis double bonds stiffen phospholipid bilayers and raise the melting temperature of animal membranes in cold water.',
        repair: 'Cis double bonds bend hydrocarbon tails outward, increasing spacing between lipids and lowering the temperature at which a membrane solidifies.',
      },
    ],
  },

  'ap-bio-ch-01-section-03': {
    workedExample: {
      prompt: 'In a cytosolic enzyme, a point mutation replaces an interior nonpolar valine with a positively charged lysine. Predict how tertiary folding and catalytic activity change, citing R-group interactions.',
      steps: [
        'Step 1: Compare R-group chemistry: valine has a hydrophobic nonpolar hydrocarbon side chain, while lysine has a hydrophilic positively charged amine group at cellular pH.',
        'Step 2: Burying a charged side chain inside the nonpolar core is energetically unfavorable, disrupting hydrophobic interactions and shifting local polypeptide folding.',
        'Step 3: Altered tertiary structure distorts the three-dimensional active site geometry, reducing substrate binding affinity and sharply decreasing catalytic rate.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often claim that heat or pH denaturation breaks covalent peptide bonds and destroys a protein\'s primary amino acid sequence.',
        repair: 'Denaturation disrupts noncovalent hydrogen, ionic, and hydrophobic interactions maintaining 3D structure while leaving the primary peptide backbone intact.',
      },
      {
        misconception: 'Learners sometimes think antiparallel DNA strands run 5\' to 3\' in the same spatial direction side by side along the double helix.',
        repair: 'Antiparallel means one DNA strand runs 5\' to 3\' while its complementary partner runs 3\' to 5\', aligning nitrogenous bases for complementary H-bonding.',
      },
    ],
  },

  'ap-bio-ch-02-section-01': {
    workedExample: {
      prompt: 'Compare two cubic cells with side lengths of 2 μm and 6 μm. Calculate each cell\'s surface-area-to-volume (SA:V) ratio and explain how cell size affects passive diffusion efficiency.',
      steps: [
        'Step 1: Compute SA = 6s² and V = s³ for the 2 μm cube: SA = 24 μm², V = 8 μm³, giving SA:V = 24 / 8 = 3.0 μm⁻¹.',
        'Step 2: Compute SA and V for the 6 μm cube: SA = 216 μm², V = 216 μm³, giving SA:V = 216 / 216 = 1.0 μm⁻¹.',
        'Step 3: The 2 μm cell has a 3-fold greater SA:V ratio and shorter diffusion path, allowing faster nutrient uptake and waste removal per unit volume.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often assume larger cells have a higher surface-area-to-volume ratio simply because their total membrane surface area is larger.',
        repair: 'As cell radius grows, volume increases cubically while surface area rises only quadratically, so SA:V decreases and limits transport per unit cytoplasm.',
      },
      {
        misconception: 'Many learners believe small ions like Na+ and K+ cross the hydrophobic phospholipid bilayer freely by simple diffusion because of their tiny size.',
        repair: 'Charged ions are strongly hydrated and repelled by the nonpolar fatty acid core, so they require specific channel or carrier proteins for membrane transport.',
      },
    ],
  },

  'ap-bio-ch-02-section-02': {
    workedExample: {
      prompt: 'Pancreatic acinar cells receive radioactive leucine for 3 minutes, then unlabeled leucine for 60 minutes. Trace the endomembrane organelle sequence that processes and secretes the labeled enzyme.',
      steps: [
        'Step 1: Ribosomes docked on the rough endoplasmic reticulum translate the labeled polypeptide and thread it into the rough ER lumen for folding.',
        'Step 2: Transport vesicles bud from the rough ER and fuse with the cis face of the Golgi apparatus, where enzymes chemically modify and sort the protein.',
        'Step 3: Secretory vesicles pinch off the trans Golgi face and fuse with the plasma membrane via exocytosis, releasing the digestive enzyme extracellularly.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students sometimes state that prokaryotic cells lack ribosomes and plasma membranes because they do not possess eukaryotic organelles.',
        repair: 'All cells share a plasma membrane, cytosol, DNA, and ribosomes; prokaryotes specifically lack a membrane-bound nucleus and internal membrane organelles.',
      },
      {
        misconception: 'Learners frequently assign secretory protein synthesis to the smooth ER instead of distinguishing smooth ER and rough ER functions.',
        repair: 'Rough ER bears bound ribosomes for secretory and membrane proteins, whereas smooth ER synthesizes lipids, detoxifies drugs, and stores Ca2+ ions.',
      },
    ],
  },

  'ap-bio-ch-02-section-03': {
    workedExample: {
      prompt: 'A potato cell (Ψs = −6.2 bar, Ψp = +2.0 bar) is placed in an open beaker of 0.30 M sucrose at 27°C (i = 1, R = 0.0831 L·bar/(mol·K)). Calculate both water potentials and predict net osmosis.',
      steps: [
        'Step 1: Find the potato cell water potential: Ψ_cell = Ψs + Ψp = −6.2 + 2.0 = −4.2 bar; convert temperature to Kelvin: T = 27 + 273 = 300 K.',
        'Step 2: Calculate the open-beaker solution water potential (Ψp = 0): Ψs = −iCRT = −(1)(0.30)(0.0831)(300) = −7.48 bar ≈ −7.5 bar.',
        'Step 3: Water moves from higher (less negative) Ψ (−4.2 bar) to lower (more negative) Ψ (−7.5 bar), exiting the cell into the hypertonic sucrose and causing plasmolysis.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often forget the negative sign in Ψs = −iCRT or predict that water flows toward higher water potential instead of lower water potential.',
        repair: 'Always verify that adding solutes makes Ψs more negative and remember water flows passively from higher (less negative) Ψ to lower (more negative) Ψ.',
      },
      {
        misconception: 'Some learners think mitochondria and chloroplasts arose by plasma membrane infolding just like the nuclear envelope and endoplasmic reticulum.',
        repair: 'Double membranes, circular DNA, and 70S ribosomes show that mitochondria and chloroplasts originated via endosymbiosis of ancestral aerobic and photosynthetic bacteria.',
      },
    ],
  },

  'ap-bio-ch-03-section-01': {
    workedExample: {
      prompt: 'Adding compound X reduces an enzyme\'s reaction rate by 60% at 2 mM substrate, but raising substrate to 50 mM restores the uninhibited maximum velocity. Identify the inhibition type and mechanism.',
      steps: [
        'Step 1: Note the kinetic signature: restoring full Vmax at saturating substrate shows that substrate molecules can outcompete inhibitor X for binding.',
        'Step 2: Compound X is a competitive inhibitor that binds reversibly to the enzyme active site, temporarily blocking substrate entry without permanently denaturing the protein.',
        'Step 3: At 50 mM substrate, high substrate frequency keeps active sites occupied by substrate, allowing normal catalytic lowering of activation energy.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students commonly claim enzymes make endergonic reactions exergonic by changing the overall free-energy difference (ΔG) of the reaction.',
        repair: 'Enzymes lower only the activation energy barrier (Ea) to accelerate reaching equilibrium while leaving the net ΔG between reactants and products unchanged.',
      },
      {
        misconception: 'Learners often assume adding excess substrate will overcome noncompetitive inhibition just as it overcomes competitive inhibition.',
        repair: 'Noncompetitive inhibitors bind allosteric sites and alter active-site shape, reducing functional enzyme capacity and lowering Vmax regardless of substrate excess.',
      },
    ],
  },

  'ap-bio-ch-03-section-02': {
    workedExample: {
      prompt: 'An herbicide blocks electron flow from Photosystem II to the thylakoid electron transport chain in illuminated chloroplasts. Predict immediate effects on lumen pH, O2 release, and Calvin cycle G3P output.',
      steps: [
        'Step 1: Blocking PSII halts water photolysis and stops electron movement through the cytochrome complex that pumps H+ ions from the stroma into the thylakoid lumen.',
        'Step 2: As H+ pumping ceases, the proton gradient collapses so thylakoid lumen pH increases (less acidic), O2 evolution stops, and ATP and NADPH production plummets.',
        'Step 3: Without stromal ATP and NADPH to drive reduction and RuBP regeneration in the Calvin cycle, carbon fixation stalls and G3P synthesis rapidly drops.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently believe the O2 gas released by plants comes from splitting CO2 molecules during the Calvin cycle rather than from water.',
        repair: 'Isotopic 18O tracing confirms that all released O2 comes from splitting H2O at Photosystem II during the light-dependent reactions.',
      },
      {
        misconception: 'Many learners assume the Calvin cycle only runs at night because textbooks historically called it the dark reactions.',
        repair: 'The Calvin cycle depends directly on ATP and NADPH generated by the light reactions, so it operates primarily in the light and stops shortly after darkness.',
      },
    ],
  },

  'ap-bio-ch-03-section-03': {
    workedExample: {
      prompt: 'Dinitrophenol (DNP) makes the inner mitochondrial membrane leaky to H+ ions. Predict how DNP alters O2 consumption, NADH oxidation, and ATP yield per glucose in actively respiring muscle cells.',
      steps: [
        'Step 1: DNP allows protons pumped into the intermembrane space to diffuse directly back into the matrix, bypassing ATP synthase and dissipating the proton-motive force.',
        'Step 2: Because chemiosmosis fails, oxidative phosphorylation ATP output falls sharply, leaving mostly the small substrate-level ATP yield from glycolysis and the citric acid cycle.',
        'Step 3: With proton back-pressure removed, the electron transport chain accelerates NADH oxidation and O2 reduction while releasing the uncoupled energy as heat.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often think fermentation directly generates ATP during pyruvate reduction instead of merely sustaining glycolysis.',
        repair: 'Fermentation produces zero additional ATP itself; its essential role is oxidizing NADH back to NAD+ so glycolysis can continue yielding 2 net ATP per glucose.',
      },
      {
        misconception: 'Learners sometimes claim oxygen directly oxidizes glucose during glycolysis rather than acting at the end of aerobic respiration.',
        repair: 'Glycolysis is oxygen-independent; O2 functions specifically as the terminal electron acceptor of the inner mitochondrial electron transport chain.',
      },
    ],
  },

  'ap-bio-ch-04-section-01': {
    workedExample: {
      prompt: 'A bacterial toxin permanently locks a G-protein alpha subunit in its GTP-bound form inside liver cells stimulated by epinephrine. Predict effects on adenylyl cyclase, cAMP, and glycogenolysis after epinephrine leaves.',
      steps: [
        'Step 1: Normally, G-alpha hydrolyzes GTP to GDP to switch off signaling once ligand unbinds; blocking GTP hydrolysis leaves G-alpha constitutively active.',
        'Step 2: Persistently active G-alpha continually stimulates adenylyl cyclase, maintaining elevated intracellular cAMP that keeps protein kinase A active.',
        'Step 3: The active phosphorylation cascade continuously activates glycogen phosphorylase, driving sustained glycogen breakdown into glucose even without epinephrine.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often think water-soluble peptide hormones diffuse straight across the plasma membrane to bind DNA directly inside the nucleus.',
        repair: 'Hydrophilic ligands cannot cross the nonpolar lipid core and instead bind membrane receptors that trigger intracellular second-messenger cascades.',
      },
      {
        misconception: 'Learners assume every tissue exposed to the same circulating hormone produces the identical cellular response across the entire body.',
        repair: 'Cell-specific responses depend on which receptor subtypes, relay proteins, and target enzymes each differentiated cell expresses.',
      },
    ],
  },

  'ap-bio-ch-04-section-02': {
    workedExample: {
      prompt: 'After a high-carbohydrate meal, a patient\'s blood glucose climbs from 90 mg/dL to 240 mg/dL and stays elevated even though muscle insulin receptors work normally. Identify the disrupted feedback step and outcome.',
      steps: [
        'Step 1: In normal negative feedback, pancreatic beta cells detect elevated blood glucose and secrete insulin to activate glucose uptake by liver and muscle effectors.',
        'Step 2: Because target cell insulin receptors function properly, persistent hyperglycemia points to failure of pancreatic beta cells to produce or secrete insulin.',
        'Step 3: Without insulin signaling to insert GLUT4 channels and stimulate glycogen storage, blood glucose cannot be restored toward the ~90 mg/dL homeostatic set point.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely interpret positive feedback as beneficial and negative feedback as harmful to an organism\'s health.',
        repair: 'Negative feedback counteracts deviations to stabilize a set point (like blood glucose), while positive feedback amplifies a stimulus to drive completion (like childbirth).',
      },
      {
        misconception: 'Learners sometimes believe homeostasis keeps physiological variables frozen at one fixed number without any oscillation.',
        repair: 'Homeostasis maintains dynamic equilibrium where sensors and effectors continuously adjust a variable within a narrow viable range around its set point.',
      },
    ],
  },

  'ap-bio-ch-04-section-03': {
    workedExample: {
      prompt: 'UV light introduces double-strand DNA breaks in a skin cell with homozygous loss-of-function mutations in p53. Predict how G1/S checkpoint arrest and apoptosis differ from a normal cell.',
      steps: [
        'Step 1: In normal cells, DNA damage activates p53, inducing Cdk-inhibitor proteins that pause the G1/S checkpoint for DNA repair or trigger apoptosis if damage is irreparable.',
        'Step 2: Without functional p53, active cyclin-Cdk complexes continue signaling entry into S phase despite unresolved double-strand breaks.',
        'Step 3: Replicating damaged chromosomes while bypassing apoptosis propagates mutations into daughter cells, promoting genomic instability and tumor progression.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently assume cyclin-dependent kinase (Cdk) concentration fluctuates across the cell cycle while cyclin levels stay steady.',
        repair: 'Cdk concentration remains relatively constant throughout the cycle; periodic synthesis and degradation of cyclin subunits is what switches Cdk activity on and off.',
      },
      {
        misconception: 'Many learners state that chromosomal DNA replicates during prophase of mitosis rather than earlier in interphase.',
        repair: 'Complete semiconservative DNA replication occurs during S phase of interphase so sister chromatids are already paired before mitotic prophase begins.',
      },
    ],
  },

  'ap-bio-ch-05-section-01': {
    workedExample: {
      prompt: 'A diploid species has 2n = 12 chromosomes with no crossing over. Calculate the number of genetically distinct gametes possible from independent assortment alone, and give the chromosome count after meiosis I.',
      steps: [
        'Step 1: Determine the haploid chromosome count n = 12 / 2 = 6 homologous pairs that orient randomly along the metaphase I equator.',
        'Step 2: Apply the independent assortment formula 2^n = 2^6 = 64 unique maternal and paternal chromosome combinations in gametes.',
        'Step 3: Because homologous chromosomes separate during anaphase I, each cell completing meiosis I is haploid with n = 6 chromosomes (12 sister chromatids).',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often call cells diploid after meiosis I because each chromosome still consists of two joined sister chromatids.',
        repair: 'Ploidy counts homologous chromosome sets, not chromatids; separating homologs in meiosis I immediately reduces cells from diploid (2n) to haploid (n).',
      },
      {
        misconception: 'Learners sometimes describe crossing over as genetic exchange between identical sister chromatids during mitotic metaphase.',
        repair: 'Crossing over occurs during prophase I of meiosis between nonsister chromatids of homologous chromosomes, producing recombinant allele combinations.',
      },
    ],
  },

  'ap-bio-ch-05-section-02': {
    workedExample: {
      prompt: 'Two parents with genotypes AaBbCc and AaBbcc are crossed for three independently assorting genes. Use the product rule to compute the exact probability of producing an Aabbcc offspring.',
      steps: [
        'Step 1: Decompose the trihybrid cross into three independent single-gene crosses: Aa × Aa, Bb × Bb, and Cc × cc.',
        'Step 2: Find each individual genotype probability: P(Aa) = 1/2, P(bb) = 1/4, and P(cc) = 1/2.',
        'Step 3: Multiply independent probabilities using the product rule: (1/2) × (1/4) × (1/2) = 1/16 (6.25%) probability of genotype Aabbcc.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently add individual gene probabilities instead of multiplying them when finding the probability of a combined multi-locus genotype.',
        repair: 'Use the product rule (multiply) for simultaneous independent events ("and"), and reserve the sum rule (add) for mutually exclusive alternatives ("or").',
      },
      {
        misconception: 'Many learners equate a genetically dominant allele with the most common or most evolutionarily beneficial allele in a population.',
        repair: 'Dominance describes only heterozygote phenotypic expression; dominant alleles (like polydactyly) can be rare while recessive alleles can be widespread.',
      },
    ],
  },

  'ap-bio-ch-05-section-03': {
    workedExample: {
      prompt: 'A fruit fly testcross (BbVv × bbvv) produces 410 gray-normal, 390 black-vestigial, 104 gray-vestigial, and 96 black-normal offspring. Determine linkage and compute the recombination frequency.',
      steps: [
        'Step 1: Sum all offspring (410 + 390 + 104 + 96 = 1,000) and note that parental phenotypes (800) vastly outnumber recombinants (200), ruling out a 1:1:1:1 unlinked ratio.',
        'Step 2: Calculate recombination frequency: (104 + 96) / 1,000 × 100% = 200 / 1,000 × 100% = 20%.',
        'Step 3: Because recombination frequency is significantly below 50%, genes B and V are linked on the same chromosome approximately 20 map units (cM) apart.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students sometimes predict that an affected father can transmit an X-linked recessive allele directly to his biological sons.',
        repair: 'Fathers pass their Y chromosome to sons and their X chromosome exclusively to daughters, so male-to-male transmission immediately rules out X-linkage.',
      },
      {
        misconception: 'Learners frequently confuse codominance with incomplete dominance when interpreting heterozygote phenotypes in non-Mendelian crosses.',
        repair: 'In codominance both alleles express distinctly at once (AB blood antigens), whereas incomplete dominance produces an intermediate blended phenotype (pink snapdragons).',
      },
    ],
  },

  'ap-bio-ch-06-section-01': {
    workedExample: {
      prompt: 'Given the DNA template strand 3\'-TAC GGA CTT ACT-5\', write both the complementary newly synthesized DNA strand from replication and the mRNA sequence produced during transcription.',
      steps: [
        'Step 1: Apply antiparallel base pairing (A-T and C-G for DNA; A-U, T-A, and C-G for RNA), reading the template 3\' to 5\' so new polymers grow 5\' to 3\'.',
        'Step 2: During replication, DNA polymerase III synthesizes the complementary strand 5\'-ATG CCT GAA TGA-3\'.',
        'Step 3: During transcription, RNA polymerase builds 5\'-AUG CCU GAA UGA-3\', which encodes the short polypeptide sequence Met-Pro-Glu-Stop.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often assume DNA polymerase can elongate a new strand in either the 5\' or 3\' direction depending on the replication fork side.',
        repair: 'All nucleic acid polymerases add nucleotides exclusively to a free 3\' hydroxyl group, which is why the lagging strand must be built in Okazaki fragments.',
      },
      {
        misconception: 'Learners frequently transcribe mRNA directly from the 5\'-to-3\' coding DNA strand instead of using the complementary template strand.',
        repair: 'RNA polymerase reads the 3\'-to-5\' template strand to synthesize 5\'-to-3\' mRNA matching the coding strand with U replacing T.',
      },
    ],
  },

  'ap-bio-ch-06-section-02': {
    workedExample: {
      prompt: 'An E. coli strain has a lac operator mutation (lacO^c) that prevents LacI repressor binding. Predict lacZ transcription in high glucose without lactose versus low glucose with lactose.',
      steps: [
        'Step 1: Because the LacI repressor cannot bind the mutated operator, negative transcriptional repression is permanently disabled even when lactose is absent.',
        'Step 2: In high glucose without lactose, low intracellular cAMP leaves CAP inactive, so RNA polymerase initiates only low basal constitutive lacZ transcription.',
        'Step 3: In low glucose with lactose, elevated cAMP activates CAP to bind the promoter region and strongly recruit RNA polymerase, yielding maximal lacZ expression.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely flip splicing vocabulary by claiming introns are expressed as coding regions while exons are excised from pre-mRNA.',
        repair: 'Introns are intervening noncoding segments removed by the spliceosome in the nucleus, while exons are ligated together and exported for translation.',
      },
      {
        misconception: 'Learners sometimes assume bacterial mRNAs undergo nuclear 5\' capping, polyadenylation, and extensive intron splicing before translation.',
        repair: 'Prokaryotes lack a nucleus and couple transcription directly to translation in the cytoplasm without eukaryotic cap, poly-A tail, or spliceosome processing.',
      },
    ],
  },

  'ap-bio-ch-06-section-03': {
    workedExample: {
      prompt: 'A circular 4,800 bp plasmid contains two EcoRI restriction sites spaced 1,300 bp apart. Predict the band sizes after complete EcoRI digestion on an agarose gel and identify which migrates farthest.',
      steps: [
        'Step 1: Cutting a closed circular plasmid at two distinct recognition sites yields exactly two linear double-stranded DNA fragments summing to 4,800 bp.',
        'Step 2: Subtract the shorter arc from the total length to find the band sizes: 1,300 bp and 4,800 − 1,300 = 3,500 bp.',
        'Step 3: Negatively charged DNA travels toward the positive anode, and the smaller 1,300 bp fragment faces less agarose pore resistance so it migrates farthest.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often think inserting a single base pair alters only one amino acid at the mutation site rather than affecting downstream codons.',
        repair: 'Any insertion or deletion not divisible by three shifts the entire downstream triplet reading frame, altering all subsequent amino acids and often creating an early stop codon.',
      },
      {
        misconception: 'Learners sometimes claim larger DNA fragments move faster through gel electrophoresis because they carry a greater total negative phosphate charge.',
        repair: 'Charge-to-mass ratio is uniform across DNA lengths, so separation depends on size sieving through agarose pores where smaller fragments travel much farther.',
      },
    ],
  },

  'ap-bio-ch-07-section-01': {
    workedExample: {
      prompt: 'A colony of 10^8 bacteria contains 50 pre-existing streptomycin-resistant mutants before treatment. After antibiotic exposure, 99% of survivors are resistant. Explain why this demonstrates natural selection.',
      steps: [
        'Step 1: Random DNA replication errors produced heritable resistance alleles before streptomycin was introduced; the antibiotic did not generate the mutation.',
        'Step 2: Streptomycin acted as a selective agent that killed susceptible bacteria while resistant mutants survived and reproduced at a far higher rate.',
        'Step 3: Over generations, differential reproductive success shifted the population allele frequency toward resistance, illustrating population-level evolution.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students commonly argue that antibiotics or environmental stresses cause organisms to mutate specifically to gain traits they need to survive.',
        repair: 'Mutations arise randomly with respect to organismal need; natural selection merely filters pre-existing heritable variation in a given environment.',
      },
      {
        misconception: 'Learners often describe an individual organism as evolving new adaptations during its own lifetime in response to environmental change.',
        repair: 'Individuals can acclimatize physiologically, but biological evolution occurs only when heritable allele frequencies change across generations in a population.',
      },
    ],
  },

  'ap-bio-ch-07-section-02': {
    workedExample: {
      prompt: 'In a meadow of 500 wildflowers in Hardy-Weinberg equilibrium, 45 plants exhibit the recessive white phenotype (aa). Compute q, p, and the expected number of heterozygous carriers (Aa).',
      steps: [
        'Step 1: Find the homozygous recessive genotype frequency q² = 45 / 500 = 0.09, then take the square root to obtain q = 0.30.',
        'Step 2: Apply p + q = 1 to calculate the dominant allele frequency: p = 1 − 0.30 = 0.70.',
        'Step 3: Compute heterozygote frequency 2pq = 2(0.70)(0.30) = 0.42, giving 0.42 × 500 = 210 expected heterozygous Aa plants.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently plug the recessive phenotype proportion directly in as q instead of recognizing that recessive individuals represent q².',
        repair: 'Always equate the recessive phenotype frequency to q² first, take its square root to find q, and then compute p = 1 − q and 2pq.',
      },
      {
        misconception: 'Learners often assume genetic drift changes allele frequencies at the same rate regardless of population size.',
        repair: 'Random sampling fluctuations intensify dramatically in small populations, making bottlenecks and founder events powerful drivers of allele loss.',
      },
    ],
  },

  'ap-bio-ch-07-section-03': {
    workedExample: {
      prompt: 'Four vertebrates possess derived traits as follows: A (jaws), B (jaws, lungs), C (jaws, lungs, amniotic egg), and D (jaws, lungs, amniotic egg, feathers). Identify the closest relatives using synapomorphies.',
      steps: [
        'Step 1: Apply maximum parsimony by ordering nested shared derived traits (synapomorphies) from jaws (all four) to lungs (B, C, D) to amniotic egg (C, D).',
        'Step 2: Taxa C and D uniquely share the amniotic egg synapomorphy, placing them together as sister taxa branching after taxon B.',
        'Step 3: C and D share the most recent common ancestor on the cladogram, while feathers evolved as a derived trait along the lineage leading specifically to D.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely judge evolutionary relatedness by how close two species names sit side by side along the top of a phylogenetic tree.',
        repair: 'Branches can swivel freely around any node without changing relationships; always determine relatedness by locating the most recent common ancestor node.',
      },
      {
        misconception: 'Learners often mistake analogous structures formed by convergent evolution, such as insect and bird wings, for homologous traits from common ancestry.',
        repair: 'Confirm structural and developmental homology (such as vertebrate forelimb bones) before using a shared feature to group taxa into a clade.',
      },
    ],
  },

  'ap-bio-ch-08-section-01': {
    workedExample: {
      prompt: 'A prairie ecosystem fixes 18,000 kJ/m²/yr of gross primary productivity (GPP) while plants use 7,200 kJ/m²/yr in respiration. Calculate NPP and estimate energy reaching secondary consumers at 10% trophic transfer.',
      steps: [
        'Step 1: Calculate net primary productivity using NPP = GPP − R = 18,000 − 7,200 = 10,800 kJ/m²/yr available to herbivores.',
        'Step 2: Apply 10% trophic transfer efficiency to primary consumers: 0.10 × 10,800 = 1,080 kJ/m²/yr.',
        'Step 3: Apply 10% transfer again to secondary consumers: 0.10 × 1,080 = 108 kJ/m²/yr, explaining why ecosystems rarely support more than 4–5 trophic levels.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often claim energy recycles continuously through food webs in the same closed loop as carbon and nitrogen atoms.',
        repair: 'Matter cycles repeatedly through biogeochemical pools, whereas energy flows unidirectionally from sunlight through trophic levels and exits as metabolic heat.',
      },
      {
        misconception: 'Learners frequently treat gross primary productivity as the total biomass energy directly available to primary consumers.',
        repair: 'Producers consume part of GPP for their own cellular respiration, so only net primary productivity (NPP = GPP − R) enters higher trophic levels.',
      },
    ],
  },

  'ap-bio-ch-08-section-02': {
    workedExample: {
      prompt: 'A deer herd has r_max = 0.40 yr⁻¹ and carrying capacity K = 600. Compute the logistic growth rate dN/dt at N = 450 individuals and explain why it is lower than at N = 300.',
      steps: [
        'Step 1: Use the logistic growth equation dN/dt = r_max·N·(K − N)/K with r_max = 0.40 yr⁻¹, N = 450, and K = 600.',
        'Step 2: Substitute values: dN/dt = 0.40 × 450 × (600 − 450)/600 = 180 × 0.25 = 45 deer/yr (compared to 60 deer/yr at N = 300).',
        'Step 3: At N = 450, intensifying density-dependent competition shrinks the unexploited capacity factor (K − N)/K from 0.50 to 0.25, slowing net additions.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often assume a logistic population adds individuals fastest right before reaching carrying capacity K because N is largest there.',
        repair: 'In logistic growth, dN/dt peaks at N = K/2 where population size and remaining resource fraction balance; as N nears K, dN/dt approaches zero.',
      },
      {
        misconception: 'Learners frequently classify natural disasters like floods or severe freezes as density-dependent limiting factors.',
        repair: 'Abiotic disturbances affect mortality regardless of crowding (density-independent), whereas competition, predation, and disease intensify as density increases.',
      },
    ],
  },

  'ap-bio-ch-08-section-03': {
    workedExample: {
      prompt: 'Plot X has 100 trees split evenly across 4 species (25 each), while plot Y has 100 trees with 85 of one species and 5 each of three others. Compute Simpson\'s Diversity Index for both and compare resilience.',
      steps: [
        'Step 1: Apply Simpson\'s Diversity Index = 1 − Σ(n/N)² to plot X: 1 − 4(0.25)² = 1 − 0.25 = 0.75.',
        'Step 2: Compute the index for plot Y: 1 − [(0.85)² + 3(0.05)²] = 1 − (0.7225 + 0.0075) = 1 − 0.73 = 0.27.',
        'Step 3: Although both plots share species richness of 4, plot X\'s higher evenness (0.75 vs 0.27) confers greater functional redundancy and resilience to a species-specific pest.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely equate biodiversity exclusively with species richness while overlooking relative abundance and species evenness.',
        repair: 'A community dominated by one species has low Simpson diversity and weak resilience even if its total species count matches an evenly balanced habitat.',
      },
      {
        misconception: 'Learners sometimes assume secondary succession begins on bare rock without soil and takes as long as primary succession.',
        repair: 'Secondary succession follows disturbances like wildfires that leave soil and seed banks intact, enabling far faster community recovery than primary succession.',
      },
    ],
  },
};

const ap_chemistry_foundation_pilot = {
  'ap-chem-ch-01-section-01': {
    workedExample: {
      prompt: 'A mass spectrum of gallium shows Ga-69 (68.926 amu, 60.11%) and Ga-71 (70.925 amu, 39.89%). Calculate gallium\'s average atomic mass and explain why it lies closer to 69 than to 71.',
      steps: [
        'Step 1: Convert percent abundances to decimal fractions: 0.6011 for Ga-69 and 0.3989 for Ga-71.',
        'Step 2: Compute the weighted average: (68.926 × 0.6011) + (70.925 × 0.3989) = 41.431 + 28.292 = 69.72 amu.',
        'Step 3: The weighted average (69.72 amu) matches the periodic table and falls closer to 69 because Ga-69 accounts for roughly 60% of naturally occurring atoms.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often take a simple unweighted arithmetic mean of isotope masses without multiplying each mass by its fractional abundance.',
        repair: 'Weight every isotope mass by its decimal abundance from the mass spectrum and verify that the final atomic mass leans toward the most abundant peak.',
      },
      {
        misconception: 'Learners frequently treat an empirical formula obtained from percent-composition data as the true molecular formula of a covalent compound.',
        repair: 'Divide the experimentally measured molar mass by the empirical formula mass to find the integer multiplier needed for the molecular formula.',
      },
    ],
  },

  'ap-chem-ch-01-section-02': {
    workedExample: {
      prompt: 'A photoelectron spectrum of a neutral atom has five peaks with relative heights 2, 2, 6, 2, and 3 from highest to lowest binding energy. Identify the element and compare its 1s binding energy to oxygen.',
      steps: [
        'Step 1: Assign subshells from highest binding energy (closest to nucleus) outward: 1s² 2s² 2p⁶ 3s² 3p³, totaling 15 electrons, which identifies phosphorus (P).',
        'Step 2: Compare nuclear charges using Coulomb\'s law (F ∝ q1q2/r²): phosphorus has +15 protons versus +8 protons in oxygen.',
        'Step 3: Greater nuclear attraction pulls phosphorus\'s 1s electrons tighter to the nucleus, so its 1s peak appears at a much higher binding energy than oxygen\'s 1s.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely read PES horizontal axes left-to-right as increasing binding energy even when AP plots reverse the axis.',
        repair: 'Always inspect the PES axis numbers first; core 1s electrons appear at the highest binding energy (often on the left), and peak height indicates electron count.',
      },
      {
        misconception: 'Learners often remove 3d electrons before 4s electrons when writing configurations for transition-metal cations like Fe2+.',
        repair: 'Transition metals lose outermost valence s electrons before inner d electrons, so Fe ([Ar]4s²3d⁶) ionizes to Fe2+ as [Ar]3d⁶.',
      },
    ],
  },

  'ap-chem-ch-01-section-03': {
    workedExample: {
      prompt: 'Explain why oxygen (IE1 = 1,314 kJ/mol) has a lower first ionization energy than nitrogen (IE1 = 1,402 kJ/mol) even though oxygen has a larger nuclear charge and smaller atomic radius.',
      steps: [
        'Step 1: Compare valence orbital occupancies: nitrogen is 2s²2p³ (three unpaired 2p electrons), whereas oxygen is 2s²2p⁴ (one paired 2p orbital and two unpaired).',
        'Step 2: In oxygen, placing two electrons in the same 2p orbital introduces extra electron-electron repulsion within that shared spatial region.',
        'Step 3: This pairing repulsion slightly offsets oxygen\'s higher effective nuclear charge, making its fourth 2p electron easier to remove than nitrogen\'s unpaired 2p electron.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often justify periodic trends on AP FRQs merely by restating periodic table position ("further right means smaller").',
        repair: 'Always explain periodic trends using atomic structure and Coulomb\'s law: cite effective nuclear charge across a period and added energy shells (shielding) down a group.',
      },
      {
        misconception: 'Learners sometimes assume isoelectronic species like O2−, F−, Na+, and Mg2+ share the same radius because they have 10 electrons.',
        repair: 'Within an isoelectronic series, identical electron shielding means radius shrinks steadily as proton count increases (O2− > F− > Na+ > Mg2+).',
      },
    ],
  },

  'ap-chem-ch-02-section-01': {
    workedExample: {
      prompt: 'Compare resonance structures for the cyanate ion (OCN−) using formal charge to identify the dominant Lewis structure, then predict its molecular geometry and central-atom hybridization.',
      steps: [
        'Step 1: Count 16 valence electrons (6 + 4 + 5 + 1) and evaluate two low-charge resonance forms: [:O=C=N:]− (FC: O=0, C=0, N=−1) and [:O−C≡N:]− (FC: O=−1, C=0, N=0).',
        'Step 2: Both structures minimize formal charge magnitudes, but :O−C≡N: places the −1 formal charge on the more electronegative oxygen atom, making it the major contributor.',
        'Step 3: Central carbon has two electron domains and zero lone pairs, yielding sp hybridization and a linear molecular geometry (180° bond angle).',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often report electron-domain geometry as molecular geometry, for example labeling NH3 or H2O as tetrahedral.',
        repair: 'Count all domains to find electron geometry, then name molecular shape from bonded atom positions alone (NH3 is trigonal pyramidal; H2O is bent).',
      },
      {
        misconception: 'Learners frequently assume any molecule containing polar covalent bonds must be a polar molecule overall.',
        repair: 'Evaluate 3D vector symmetry first; identical polar bonds cancel completely in symmetric geometries such as linear CO2, trigonal planar BF3, and tetrahedral CCl4.',
      },
    ],
  },

  'ap-chem-ch-02-section-02': {
    workedExample: {
      prompt: 'Compare the potential-energy curves of N2 (triple bond, 110 pm, 945 kJ/mol) and O2 (double bond, 121 pm, 498 kJ/mol). Locate each energy minimum and explain the difference in well depth and position.',
      steps: [
        'Step 1: On a potential-energy versus internuclear distance curve, the trough x-value represents equilibrium bond length and the depth below zero equals bond dissociation energy.',
        'Step 2: N2 shares six bonding electrons (bond order 3) versus four in O2 (bond order 2), generating stronger coulombic attraction that pulls nitrogen nuclei closer together.',
        'Step 3: Therefore, N2 has a much deeper energy well (−945 kJ/mol) shifted to a shorter distance (110 pm) than O2 (−498 kJ/mol at 121 pm).',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often think breaking a chemical bond releases stored energy, especially when recalling biological phrases about ATP.',
        repair: 'Breaking any chemical bond requires energy input (endothermic) to overcome electrostatic attraction; energy is released only when new bonds form.',
      },
      {
        misconception: 'Learners sometimes mark equilibrium bond length where the potential-energy curve crosses zero on the steep repulsive wall.',
        repair: 'Equilibrium bond length occurs strictly at the minimum potential energy (trough bottom), where attractive and repulsive electrostatic forces balance.',
      },
    ],
  },

  'ap-chem-ch-02-section-03': {
    workedExample: {
      prompt: 'Magnesium oxide (MgO, mp 2,852°C) melts far higher than sodium fluoride (NaF, mp 993°C) despite comparable internuclear distances (210 pm vs 231 pm). Justify this difference using Coulomb\'s law.',
      steps: [
        'Step 1: Identify ionic charges in each lattice: MgO contains Mg2+ and O2− (|q1·q2| = 4), whereas NaF contains Na+ and F− (|q1·q2| = 1).',
        'Step 2: By Coulomb\'s law (E ∝ q1q2/r), the 4-fold greater charge product and slightly smaller interionic spacing produce roughly four times stronger electrostatic attraction in MgO.',
        'Step 3: Overcoming MgO\'s much higher lattice energy requires far greater thermal kinetic energy, explaining its dramatically higher melting point.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often claim solid ionic crystals conduct electricity because their lattices are made of positively and negatively charged ions.',
        repair: 'Electrical conduction requires mobile charge carriers; ions locked in a solid crystal cannot move until the salt is melted or dissolved in water.',
      },
      {
        misconception: 'Learners frequently confuse substitutional alloys with interstitial alloys when explaining changes in metal malleability and density.',
        repair: 'Substitutional alloys replace host atoms with similar-sized metals (brass), whereas interstitial alloys insert tiny atoms like carbon into lattice gaps (steel) to restrict slip.',
      },
    ],
  },

  'ap-chem-ch-03-section-01': {
    workedExample: {
      prompt: 'Ethanol (CH3CH2OH, bp 78°C) and dimethyl ether (CH3OCH3, bp −24°C) share the molar mass 46.07 g/mol. Identify all intermolecular forces in each liquid and account for ethanol\'s higher boiling point.',
      steps: [
        'Step 1: Both isomers have identical molar masses and similar electron cloud sizes, giving comparable London dispersion forces alongside dipole-dipole attractions.',
        'Step 2: Ethanol contains a polarized O−H bond that forms strong intermolecular hydrogen bonds between molecules, whereas dimethyl ether lacks H bonded to O, N, or F.',
        'Step 3: Separating ethanol molecules into the gas phase requires breaking those hydrogen bonds, producing a 102°C higher boiling point and lower vapor pressure.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently state that boiling a molecular liquid breaks intramolecular covalent O−H or C−C bonds inside the molecules.',
        repair: 'Phase changes overcome intermolecular attractions between intact molecules; covalent bonds inside H2O or CH3CH2OH remain completely unbroken during boiling.',
      },
      {
        misconception: 'Learners sometimes assume hydrogen-bonding molecules always boil higher than nonpolar molecules regardless of molecular size.',
        repair: 'Large polarizable electron clouds generate very strong London dispersion forces, explaining why nonpolar I2 is a solid at room temperature while H2O is a liquid.',
      },
    ],
  },

  'ap-chem-ch-03-section-02': {
    workedExample: {
      prompt: 'A rigid 4.00 L flask at 298 K holds 0.200 mol He and 0.300 mol N2. Compute total pressure and partial pressure of N2, then compare both gases in average kinetic energy and molecular speed.',
      steps: [
        'Step 1: Sum gas moles (n_tot = 0.500 mol) and apply PV = nRT: P_tot = (0.500 mol)(0.08206 L·atm/(mol·K))(298 K) / 4.00 L = 3.06 atm.',
        'Step 2: Use Dalton\'s law with mole fraction X_N2 = 0.300 / 0.500 = 0.600: P_N2 = 0.600 × 3.057 atm = 1.83 atm.',
        'Step 3: At equal temperature (298 K), He and N2 share identical average kinetic energy, while lighter He (4.00 vs 28.01 g/mol) moves with a much higher average speed.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often believe heavier gas molecules possess higher average kinetic energy than lighter gas molecules in the same container.',
        repair: 'Average translational kinetic energy depends solely on Kelvin temperature (KE_avg = 3/2 RT), so heavier molecules simply move slower to maintain equal energy.',
      },
      {
        misconception: 'Learners sometimes predict gases behave least ideally at high temperature and low pressure rather than under crowded cold conditions.',
        repair: 'Real gases deviate most from PV = nRT at low temperature (intermolecular attractions slow collisions) and high pressure (finite molecular volume reduces free space).',
      },
    ],
  },

  'ap-chem-ch-03-section-03': {
    workedExample: {
      prompt: 'A 0.040 M CuSO4 standard gives absorbance A = 0.48 at 635 nm in a 1.00 cm cuvette. Find molar absorptivity ε, compute the concentration of an unknown with A = 0.30, and predict the effect of water droplets in the cuvette.',
      steps: [
        'Step 1: Rearrange Beer-Lambert law (A = εbc) to solve for molar absorptivity: ε = 0.48 / (1.00 cm × 0.040 M) = 12 M⁻¹·cm⁻¹.',
        'Step 2: Calculate the unknown concentration using the same path length and wavelength: c = A / (εb) = 0.30 / (12 × 1.00) = 0.025 M.',
        'Step 3: Residual distilled water droplets inside the cuvette dilute the unknown solution, decreasing its actual concentration and causing an artificially low absorbance reading.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students sometimes measure spectrophotometric absorbance at a random wavelength rather than selecting the analyte\'s maximum absorbance wavelength.',
        repair: 'Choosing λ_max maximizes sensitivity and ensures a flat absorbance region where slight wavelength drift causes minimal deviation from Beer-Lambert linearity.',
      },
      {
        misconception: 'Learners frequently mix up which electromagnetic region drives electronic transitions versus molecular vibrations or rotations.',
        repair: 'UV-visible light excites electronic transitions, infrared radiation excites covalent bond vibrations, and lower-energy microwaves excite molecular rotations.',
      },
    ],
  },

  'ap-chem-ch-04-section-01': {
    workedExample: {
      prompt: 'Write the balanced net ionic equation when 50.0 mL of 0.20 M Pb(NO3)2(aq) mixes with 50.0 mL of 0.40 M KI(aq) to precipitate PbI2(s), and identify all ions remaining in the filtrate.',
      steps: [
        'Step 1: Dissociate soluble strong electrolytes into aqueous ions: Pb2+ + 2 NO3− + 2 K+ + 2 I− → PbI2(s) + 2 K+ + 2 NO3−.',
        'Step 2: Cancel spectator ions (K+ and NO3−) to obtain the net ionic equation: Pb2+(aq) + 2 I−(aq) → PbI2(s).',
        'Step 3: Check stoichiometry: 0.010 mol Pb2+ reacts completely with 0.020 mol I−, leaving only 0.020 mol K+(aq) and 0.020 mol NO3−(aq) dissolved in the 100.0 mL filtrate.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often keep soluble spectator ions inside net ionic equations or leave strong electrolytes written as intact molecular formulas.',
        repair: 'Dissociate all soluble strong electrolytes first, then cancel ions that appear identically on both sides so only chemically reacting species remain.',
      },
      {
        misconception: 'Learners sometimes split insoluble precipitates, weak acids like HF, or pure liquids like H2O(l) into separate ions in net ionic equations.',
        repair: 'Only soluble strong acids, strong bases, and soluble ionic salts dissociate into ions; keep precipitates, weak electrolytes, gases, and pure liquids intact.',
      },
    ],
  },

  'ap-chem-ch-04-section-02': {
    workedExample: {
      prompt: 'In 2 Al(s) + 3 Cl2(g) → 2 AlCl3(s), 5.40 g Al (26.98 g/mol) reacts with 14.2 g Cl2 (70.90 g/mol). Identify the limiting reactant and calculate the theoretical yield of AlCl3 (133.34 g/mol) in grams.',
      steps: [
        'Step 1: Convert reactant masses to moles: n(Al) = 5.40 / 26.98 = 0.200 mol Al; n(Cl2) = 14.2 / 70.90 = 0.200 mol Cl2.',
        'Step 2: Calculate AlCl3 moles each could form: Al gives 0.200 × (2/2) = 0.200 mol, while Cl2 gives 0.200 × (2/3) = 0.1335 mol, so Cl2 is limiting.',
        'Step 3: Convert limiting product moles to grams: 0.1335 mol × 133.34 g/mol = 17.8 g AlCl3 theoretical yield.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely assume the reactant with the smaller starting mass in grams must be the limiting reactant.',
        repair: 'Always convert masses to moles and divide by stoichiometric coefficients (or compute product moles from each) because molar masses and mole ratios govern consumption.',
      },
      {
        misconception: 'Learners sometimes think a titration equivalence point occurs whenever equal volumes of titrant and analyte have been mixed.',
        repair: 'Equivalence occurs when titrant and analyte reach their exact balanced mole ratio, which yields equal volumes only if concentrations and coefficients match.',
      },
    ],
  },

  'ap-chem-ch-04-section-03': {
    workedExample: {
      prompt: 'Balance MnO4−(aq) + Fe2+(aq) → Mn2+(aq) + Fe3+(aq) in acidic solution via half-reactions, and identify which species is oxidized and which acts as the oxidizing agent.',
      steps: [
        'Step 1: Write balanced half-reactions: oxidation Fe2+ → Fe3+ + e−, and reduction MnO4− + 8 H+ + 5 e− → Mn2+ + 4 H2O.',
        'Step 2: Multiply the oxidation half-reaction by 5 to equalize electron transfer and sum: MnO4− + 5 Fe2+ + 8 H+ → Mn2+ + 5 Fe3+ + 4 H2O.',
        'Step 3: Verify charge (+17 on both sides): Fe2+ loses an electron and is oxidized (reducing agent), while MnO4− gains electrons and acts as the oxidizing agent.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently label the species that gets oxidized as the oxidizing agent instead of identifying it as the reducing agent.',
        repair: 'An oxidizing agent causes another substance to oxidize by accepting electrons itself; therefore the species being reduced is always the oxidizing agent.',
      },
      {
        misconception: 'Learners often check only atom counts when balancing ionic redox equations and overlook unequal net electrical charge.',
        repair: 'A properly balanced redox equation must conserve both atoms and total charge across reactants and products, which half-reaction electron matching guarantees.',
      },
    ],
  },

  'ap-chem-ch-05-section-01': {
    workedExample: {
      prompt: 'For 2 NO(g) + H2(g) → N2O(g) + H2O(g), doubling [NO] quadruples rate while doubling [H2] doubles rate. At [NO] = 0.10 M and [H2] = 0.20 M, rate = 2.4 × 10⁻³ M/s. Find the rate law and k with units.',
      steps: [
        'Step 1: Determine reaction orders from scaling ratios: 2^m = 4 gives m = 2 for NO, and 2^n = 2 gives n = 1 for H2.',
        'Step 2: Write the experimental rate law: rate = k[NO]²[H2], which is third order overall.',
        'Step 3: Solve for k: k = (2.4 × 10⁻³ M/s) / [(0.10 M)²(0.20 M)] = (2.4 × 10⁻³) / (2.0 × 10⁻³) = 1.2 M⁻²·s⁻¹.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely copy stoichiometric coefficients from the overall balanced equation directly as exponents in the rate law.',
        repair: 'Reaction orders must be determined experimentally from rate data or from a validated elementary rate-determining step, never assumed from overall stoichiometry.',
      },
      {
        misconception: 'Learners often attach s⁻¹ to every rate constant k regardless of the overall kinetic order of the reaction.',
        repair: 'Derive units of k directly from rate = k[A]^n using M^(1−n)·s⁻¹: zero order is M·s⁻¹, first order is s⁻¹, second order is M⁻¹·s⁻¹, and third order is M⁻²·s⁻¹.',
      },
    ],
  },

  'ap-chem-ch-05-section-02': {
    workedExample: {
      prompt: 'First-order decomposition of N2O5 at 45°C has a half-life of 20.0 min. Calculate k and the fraction remaining after 60.0 min, then use the collision model to explain why heating increases k.',
      steps: [
        'Step 1: Compute the first-order rate constant from half-life: k = ln(2) / t_1/2 = 0.693 / 20.0 min = 0.0347 min⁻¹.',
        'Step 2: Recognize that 60.0 min equals 3 half-lives (60.0 / 20.0), so the fraction remaining is (1/2)³ = 1/8 = 0.125 (12.5%).',
        'Step 3: Raising temperature shifts the Maxwell-Boltzmann distribution rightward, dramatically increasing the fraction of collisions with energy ≥ Ea and increasing k.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often explain faster reaction rates at higher temperature mainly by citing more frequent collisions rather than activation energy.',
        repair: 'While collision frequency rises modestly with T, the dominant kinetic effect is an exponential increase in the fraction of collisions possessing energy ≥ Ea.',
      },
      {
        misconception: 'Learners sometimes assume every reaction has a constant concentration-independent half-life like radioactive decay.',
        repair: 'Constant half-life is unique to first-order kinetics; second-order half-life (1/(k[A]0)) doubles each time concentration halves, while zero-order half-life shrinks.',
      },
    ],
  },

  'ap-chem-ch-05-section-03': {
    workedExample: {
      prompt: 'Given the mechanism Step 1 (fast eq): 2 NO ⇌ N2O2 and Step 2 (slow): N2O2 + O2 → 2 NO2, identify the intermediate, derive the rate law in terms of reactants, and describe how a catalyst alters the energy profile.',
      steps: [
        'Step 1: Sum both steps to confirm overall 2 NO + O2 → 2 NO2; N2O2 is formed in Step 1 and consumed in Step 2, making it a reaction intermediate.',
        'Step 2: Write the slow-step rate law rate = k2[N2O2][O2] and substitute [N2O2] = (k1/k−1)[NO]² from fast Step 1 equilibrium to obtain rate = k_obs[NO]²[O2].',
        'Step 3: Adding a catalyst introduces an alternative mechanism with a lower activation-energy transition state while leaving overall reactant and product enthalpies unchanged.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently confuse a catalyst with a reaction intermediate when inspecting multistep elementary mechanisms.',
        repair: 'A catalyst enters as a reactant in an early step and is regenerated later, whereas an intermediate is produced first and consumed in a subsequent step.',
      },
      {
        misconception: 'Learners often leave an unstable intermediate concentration inside the final rate law derived from a slow second step.',
        repair: 'Eliminate intermediates from rate laws by expressing their concentration in terms of initial reactants using the preceding fast-equilibrium rate equality.',
      },
    ],
  },

  'ap-chem-ch-06-section-01': {
    workedExample: {
      prompt: 'Mixing 50.0 mL of 1.00 M HCl with 50.0 mL of 1.00 M NaOH (100.0 g total, c = 4.18 J/(g·°C)) raises temperature from 22.0°C to 28.7°C. Calculate ΔH_rxn in kJ/mol of H2O produced.',
      steps: [
        'Step 1: Calculate heat absorbed by the aqueous solution: q_soln = mcΔT = (100.0 g)(4.18 J/(g·°C))(28.7 − 22.0°C) = +2,801 J = +2.80 kJ.',
        'Step 2: Apply conservation of energy to the reaction system: q_rxn = −q_soln = −2.80 kJ (exothermic heat release).',
        'Step 3: Divide by moles of water formed (0.0500 L × 1.00 M = 0.0500 mol): ΔH_rxn = −2.80 kJ / 0.0500 mol = −56.0 kJ/mol.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely report a positive ΔH when solution temperature rises in a coffee-cup calorimeter because ΔT is positive.',
        repair: 'The thermometer measures the surroundings (solution), so a rising temperature means heat left the reaction system and q_rxn = −q_soln is negative.',
      },
      {
        misconception: 'Learners sometimes divide q_rxn by the sum of both reactant moles rather than the moles of limiting reactant or reaction extent.',
        repair: 'Always normalize ΔH_rxn per mole of limiting reactant consumed (or per mole of product matching the balanced equation stoichiometry).',
      },
    ],
  },

  'ap-chem-ch-06-section-02': {
    workedExample: {
      prompt: 'Calculate total heat needed to convert 36.0 g of ice (2.00 mol H2O) at 0.0°C to liquid water at 25.0°C (ΔH_fus = 6.01 kJ/mol, c = 4.18 J/(g·°C)), and explain why temperature stays flat while melting.',
      steps: [
        'Step 1: Compute phase-change energy for melting at 0.0°C: q1 = n·ΔH_fus = (2.00 mol)(6.01 kJ/mol) = 12.02 kJ.',
        'Step 2: Compute warming energy from 0.0°C to 25.0°C: q2 = mcΔT = (36.0 g)(4.18 J/(g·°C))(25.0°C) = 3,762 J = 3.76 kJ.',
        'Step 3: Sum segments (q_tot = 12.02 + 3.76 = 15.8 kJ); temperature stays flat during melting because absorbed heat disrupts H-bonds (potential energy) rather than raising kinetic energy.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often attempt to plug ΔT = 0 into q = mcΔT during a melting or boiling plateau and mistakenly conclude zero heat is transferred.',
        repair: 'Split heating-curve problems into sloped temperature-change segments (q = mcΔT) and flat phase-change plateaus (q = n·ΔH_fus or n·ΔH_vap).',
      },
      {
        misconception: 'Learners sometimes assume temperature stops rising on a heating curve because the heat source was turned off.',
        repair: 'Heat continues entering steadily along a plateau, but that energy increases particle potential energy by overcoming intermolecular attractions instead of molecular speed.',
      },
    ],
  },

  'ap-chem-ch-06-section-03': {
    workedExample: {
      prompt: 'Estimate ΔH°_rxn for H2(g) + Cl2(g) → 2 HCl(g) using bond enthalpies (H−H = 436, Cl−Cl = 243, H−Cl = 431 kJ/mol), and justify why the reaction is exothermic from bond strengths.',
      steps: [
        'Step 1: Sum endothermic energy needed to break reactant bonds: Σ(broken) = 436 + 243 = 679 kJ/mol.',
        'Step 2: Sum exothermic energy released by forming product bonds: Σ(formed) = 2 × 431 = 862 kJ/mol.',
        'Step 3: Compute ΔH°_rxn = Σ(broken) − Σ(formed) = 679 − 862 = −183 kJ/mol; forming two strong H−Cl bonds releases more energy than breaking H−H and Cl−Cl absorbs.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently apply products minus reactants to bond enthalpies just like enthalpies of formation, flipping the sign of ΔH.',
        repair: 'Use products minus reactants for ΔH°_f, but use Σ(bonds broken in reactants) − Σ(bonds formed in products) for bond enthalpies because breaking is positive.',
      },
      {
        misconception: 'Learners often flip or multiply target equations in Hess\'s law without reversing the sign or scaling the corresponding ΔH values.',
        repair: 'Track every algebraic manipulation explicitly: reversing an equation negates ΔH, and multiplying stoichiometric coefficients multiplies ΔH by the same factor.',
      },
    ],
  },

  'ap-chem-ch-07-section-01': {
    workedExample: {
      prompt: 'At equilibrium, N2(g) + 3 H2(g) ⇌ 2 NH3(g) (ΔH° = −92 kJ/mol) is compressed to half its volume at fixed temperature. Use Q vs K to predict the shift, and contrast this with heating the vessel.',
      steps: [
        'Step 1: Halving volume doubles all molarities, so Q = (2[NH3])² / [(2[N2])(2[H2])³] = (4/16)K = 0.25 K, giving Q < K.',
        'Step 2: Because Q < K, the forward rate exceeds the reverse rate and the mixture shifts right toward fewer gas moles (4 → 2) until Q equals unchanged K.',
        'Step 3: In contrast, raising temperature favors the endothermic reverse direction (shifts left) and decreases the numerical value of K itself.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely state that reactant and product concentrations become equal once a chemical system reaches dynamic equilibrium.',
        repair: 'At equilibrium, forward and reverse reaction rates are equal while concentrations remain constant at whatever ratio satisfies K (rarely equal).',
      },
      {
        misconception: 'Learners often claim that adding a catalyst or injecting an inert gas at constant volume shifts equilibrium position toward products.',
        repair: 'A catalyst accelerates both forward and reverse rates equally without altering Q or K, and inert gas at fixed volume leaves all reacting partial pressures unchanged.',
      },
    ],
  },

  'ap-chem-ch-07-section-02': {
    workedExample: {
      prompt: 'A 1.00 L flask initially contains 0.500 M H2(g) and 0.500 M I2(g) at 448°C where Kc = 49.0 for H2(g) + I2(g) ⇌ 2 HI(g). Use an ICE table to calculate equilibrium concentrations of all three gases.',
      steps: [
        'Step 1: Set up ICE equilibrium terms: [H2] = 0.500 − x, [I2] = 0.500 − x, and [HI] = 2x, giving Kc = (2x)² / (0.500 − x)² = 49.0.',
        'Step 2: Take the square root of both sides: 2x / (0.500 − x) = 7.00, so 2x = 3.50 − 7x, yielding 9x = 3.50 and x = 0.389 M.',
        'Step 3: Substitute x back: [H2] = [I2] = 0.111 M and [HI] = 0.778 M; verify (0.778)² / (0.111)² = 49.1 ≈ 49.0.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often include pure solids or liquid water inside equilibrium expressions K alongside aqueous solutes and gases.',
        repair: 'Omit pure solids and pure liquids from K and Q expressions because their densities and thermodynamic activities remain constant (equal to 1).',
      },
      {
        misconception: 'Learners sometimes apply the small-x approximation automatically even when K is moderately large or initial concentration is very dilute.',
        repair: 'Always check the 5% validity rule (x / [initial] < 0.05) after approximating; if x exceeds 5%, solve the exact quadratic or perfect-square equation.',
      },
    ],
  },

  'ap-chem-ch-07-section-03': {
    workedExample: {
      prompt: 'Calculate the molar solubility of AgCl (Ksp = 1.8 × 10⁻¹⁰) in pure water and in 0.10 M NaCl(aq), and explain how the common-ion effect alters solubility without changing Ksp.',
      steps: [
        'Step 1: In pure water, AgCl(s) ⇌ Ag+(aq) + Cl−(aq) gives Ksp = s² = 1.8 × 10⁻¹⁰, so molar solubility s = √(1.8 × 10⁻¹⁰) = 1.3 × 10⁻⁵ M.',
        'Step 2: In 0.10 M NaCl, [Cl−] ≈ 0.10 M (since s << 0.10), so 1.8 × 10⁻¹⁰ = s(0.10), yielding s = 1.8 × 10⁻⁹ M.',
        'Step 3: Added Cl− makes Q > Ksp initially and shifts dissolution left, cutting solubility over 7,000-fold while Ksp remains constant at fixed temperature.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently think introducing a common ion decreases the numerical value of the solubility product constant Ksp.',
        repair: 'Ksp depends solely on temperature; a common ion lowers molar solubility s by increasing one ion concentration so the product still hits the same Ksp.',
      },
      {
        misconception: 'Learners often compare Ksp values directly to rank solubilities of salts with different formulas, such as 1:1 AgCl versus 1:2 PbI2.',
        repair: 'Direct Ksp comparison works only for salts with identical ion stoichiometry; otherwise solve explicitly for molar solubility s from s², 4s³, or 27s⁴.',
      },
    ],
  },

  'ap-chem-ch-08-section-01': {
    workedExample: {
      prompt: 'Calculate the pH and percent ionization of 0.10 M acetic acid (CH3COOH, Ka = 1.8 × 10⁻⁵), and explain why its pH is significantly higher than that of 0.10 M HCl.',
      steps: [
        'Step 1: Set up Ka = [H3O+][CH3COO−]/[CH3COOH] = x²/(0.10 − x) ≈ x²/0.10 = 1.8 × 10⁻⁵, giving x = √(1.8 × 10⁻⁶) = 1.34 × 10⁻³ M.',
        'Step 2: Verify the 5% rule via percent ionization: (1.34 × 10⁻³ / 0.10) × 100% = 1.34% (< 5%, valid).',
        'Step 3: Compute pH = −log(1.34 × 10⁻³) = 2.87; unlike strong acid HCl (100% ionized, pH = 1.00), weak acetic acid remains mostly protonated at equilibrium.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often compute the pH of a weak acid directly as −log([HA]0) as if it dissociated completely like HCl or HNO3.',
        repair: 'Weak acids establish partial equilibrium governed by Ka, so always set up an ICE table to find [H3O+] before taking −log([H3O+]).',
      },
      {
        misconception: 'Learners frequently assume neutral pure water always has pH = 7.00 at every temperature.',
        repair: 'Neutrality means [H3O+] = [OH−]; because water autoionization is endothermic, Kw rises with temperature and neutral pH drops below 7 above 25°C.',
      },
    ],
  },

  'ap-chem-ch-08-section-02': {
    workedExample: {
      prompt: 'A 25.0 mL sample of 0.100 M formic acid (HCOOH, pKa = 3.74) is titrated with 0.100 M NaOH. Determine the pH after 12.5 mL NaOH is added, and explain why the 25.0 mL equivalence point has pH > 7.',
      steps: [
        'Step 1: Equivalence requires 2.50 mmol NaOH (25.0 mL), so 12.5 mL is the half-equivalence point where half the HCOOH has converted to HCOO− ([HCOOH] = [HCOO−]).',
        'Step 2: At half-equivalence, Henderson-Hasselbalch gives pH = pKa + log(1) = 3.74; formic acid is stronger than acetic acid because H lacks an electron-donating methyl group.',
        'Step 3: At 25.0 mL equivalence, only conjugate base HCOO− remains, which hydrolyzes water (HCOO− + H2O ⇌ HCOOH + OH−) to generate excess OH− and pH > 7.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely assume every acid-base titration has an equivalence point pH equal to 7.00.',
        repair: 'Only strong-acid plus strong-base titrations reach pH 7; weak-acid equivalence points are basic (pH > 7) and weak-base equivalence points are acidic (pH < 7).',
      },
      {
        misconception: 'Learners sometimes think oxyacid strength increases with the number of hydrogen atoms rather than with electronegative oxygen atoms.',
        repair: 'Additional oxygen atoms withdraw electron density inductively, polarizing the O−H bond and delocalizing negative charge across the conjugate base to raise Ka.',
      },
    ],
  },

  'ap-chem-ch-08-section-03': {
    workedExample: {
      prompt: 'A 1.00 L buffer holds 0.30 mol CH3COOH (pKa = 4.74) and 0.30 mol CH3COO−. Compute the pH after adding 0.05 mol solid NaOH (no volume change), and explain why a 0.03 M/0.03 M buffer fails under this addition.',
      steps: [
        'Step 1: Perform neutralization stoichiometry first: 0.05 mol OH− converts 0.05 mol CH3COOH into CH3COO−, leaving 0.25 mol HA and 0.35 mol A−.',
        'Step 2: Apply Henderson-Hasselbalch: pH = 4.74 + log(0.35 / 0.25) = 4.74 + log(1.40) = 4.74 + 0.15 = 4.89.',
        'Step 3: The 0.30 M buffer shifts by only +0.15 pH unit, whereas a 0.03 M buffer has insufficient acid capacity (0.03 < 0.05 mol) and leaves excess strong base.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often plug added strong acid or base straight into the Henderson-Hasselbalch equation without updating moles by neutralization.',
        repair: 'Always run a limiting-reactant stoichiometry step in moles first (OH− consumes HA to make A−; H3O+ consumes A− to make HA), then apply Henderson-Hasselbalch.',
      },
      {
        misconception: 'Learners sometimes believe two buffers with the same 1:1 [A−]/[HA] ratio have identical buffer capacity regardless of concentration.',
        repair: 'The ratio fixes the initial pH near pKa, whereas total molar concentration of the conjugate pair determines how much acid or base the buffer can absorb.',
      },
    ],
  },

  'ap-chem-ch-09-section-01': {
    workedExample: {
      prompt: 'For CaCO3(s) → CaO(s) + CO2(g), ΔH° = +178 kJ/mol and ΔS° = +161 J/(mol·K). Calculate ΔG° at 298 K, assess favorability, and find the minimum temperature where decomposition becomes favorable.',
      steps: [
        'Step 1: Convert ΔS° into kJ/(mol·K) to match ΔH°: +161 J/(mol·K) = +0.161 kJ/(mol·K).',
        'Step 2: Compute ΔG° at 298 K: ΔG° = ΔH° − TΔS° = 178 − (298)(0.161) = 178 − 48.0 = +130 kJ/mol (> 0, thermodynamically unfavorable).',
        'Step 3: Set ΔG° = 0 to find crossover T = ΔH°/ΔS° = 178 / 0.161 = 1,106 K (833°C); above 1,106 K, the −TΔS° term dominates and makes ΔG° negative.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students routinely forget to convert ΔS° from J/(mol·K) to kJ/(mol·K) before substituting into ΔG° = ΔH° − TΔS°.',
        repair: 'Check energy units before every Gibbs calculation: divide J/(mol·K) by 1,000 so both ΔH° and TΔS° are expressed consistently in kJ/mol.',
      },
      {
        misconception: 'Learners frequently assume any reaction with a negative ΔG° must proceed rapidly as soon as reactants are mixed.',
        repair: 'Negative ΔG° establishes thermodynamic favorability only; a high activation energy barrier can still hold the process under kinetic control at room temperature.',
      },
    ],
  },

  'ap-chem-ch-09-section-02': {
    workedExample: {
      prompt: 'A process has ΔG° = −11.4 kJ/mol at 298 K (R = 8.314 J/(mol·K)). Compute its equilibrium constant K, and explain how coupling it to a reaction with ΔG° = +8.2 kJ/mol drives net product formation.',
      steps: [
        'Step 1: Convert ΔG° to −11,400 J/mol and rearrange ΔG° = −RT ln K to get ln K = −(−11,400) / (8.314 × 298) = 11,400 / 2,477.6 = 4.601.',
        'Step 2: Exponentiate to obtain K = e^4.601 ≈ 1.0 × 10² (99.6), confirming a strongly product-favored equilibrium (K > 1).',
        'Step 3: Coupling both steps through a shared intermediate sums free energies to ΔG°_net = −11.4 + 8.2 = −3.2 kJ/mol < 0, rendering the overall sequence favorable.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students often claim that ΔG° equals zero at chemical equilibrium instead of distinguishing standard ΔG° from actual ΔG.',
        repair: 'Actual nonstandard ΔG reaches zero at equilibrium (when Q = K), whereas standard ΔG° = −RT ln K equals zero only in the special case where K = 1.',
      },
      {
        misconception: 'Learners sometimes pair a negative ΔG° with K < 1 because both contain small or negative-looking signs.',
        repair: 'Because ΔG° = −RT ln K carries a leading minus sign, negative ΔG° always means ln K > 0 and K > 1 (products favored), while positive ΔG° means K < 1.',
      },
    ],
  },

  'ap-chem-ch-09-section-03': {
    workedExample: {
      prompt: 'In a Zn/Cu galvanic cell, E°(Cu2+/Cu) = +0.34 V and E°(Zn2+/Zn) = −0.76 V. Compute E°_cell and ΔG° (F = 96,485 C/mol e−), then find the mass of Cu (63.55 g/mol) plated by 2.00 A flowing for 965 s.',
      steps: [
        'Step 1: Assign Cu2+ reduction to the cathode and Zn oxidation to the anode (n = 2 e−): E°_cell = E°_cathode − E°_anode = +0.34 − (−0.76) = +1.10 V.',
        'Step 2: Compute standard free energy: ΔG° = −nFE°_cell = −(2)(96,485 C/mol)(1.10 J/C) = −212,267 J/mol = −212 kJ/mol.',
        'Step 3: Apply Faraday\'s law: q = It = (2.00 A)(965 s) = 1,930 C → 1,930 / 96,485 = 0.0200 mol e− → 0.0100 mol Cu × 63.55 g/mol = 0.636 g Cu plated.',
      ],
      original: true,
    },
    misconceptionGuidance: [
      {
        misconception: 'Students frequently multiply standard reduction potentials E° by stoichiometric coefficients when balancing electron transfer between half-cells.',
        repair: 'Voltage is an intensive property (joules per coulomb), so never scale E° by reaction coefficients; instead account for electron count n inside ΔG° = −nFE°.',
      },
      {
        misconception: 'Learners often describe electrons traveling through the aqueous salt bridge to complete the circuit in a galvanic cell.',
        repair: 'Electrons travel exclusively from anode to cathode through the external wire, while anions and cations migrate through the salt bridge to maintain electroneutrality.',
      },
    ],
  },
};

module.exports = {
  ap_biology_foundation_pilot,
  ap_chemistry_foundation_pilot,
};
