'use strict';

// Lexical-leakage fixes for all 179 AP Biology foundation pilot items
// flagged by `key-stem-lexical-leakage` in dev-tools/non_eppp_warning_checks.cjs.
// Distractors are left untouched; answers stay strictly shorter than maxD.

module.exports = {
  'ap-bio-u2-007': {
    answer: 'The ratio decreases as interior capacity outpaces outer surface.',
  },
  'ap-bio-u4-023': {
    answer: 'Active cyclin-Cdk complexes are likely driving M-phase progression.',
  },
  'ap-bio-u4-024': {
    answer: 'The blocked cell responds less, while cells with other receptors respond normally.',
  },
  'ap-bio-u6-037': {
    answer: 'Primers that anneal on opposite sides of the target segment',
  },
  'ap-bio-u7-042': {
    answer: 'X and Y share a closer common ancestor with each other than with other shown lineages.',
  },
  'ap-bio-u7-044': {
    answer: 'Treatment selects for variants carrying heritable resistance, increasing their frequency.',
  },
  'ap-bio-u8-050': {
    answer: 'Native prey decrease more on invaded islands than on similar uninvaded ones.',
  },
  'ap-bio-u1-051': {
    answer: 'Biosynthesis incorporates nitrogen into cellular proteins and nucleic acids.',
  },
  'ap-bio-u1-056': {
    answer: 'The enzyme shows its highest observed activity near pH 7 in this test.',
  },
  'ap-bio-u1-057': {
    answer: 'Repeat with matched masses, uniform energy supply, and replicated trials tracking temperature change.',
  },
  'ap-bio-u2-062': {
    answer: 'Transmembrane cation gradients slowly dissipate, impairing ion-dependent functions.',
  },
  'ap-bio-u2-064': {
    answer: 'Mitochondria retain ribosomal features resembling prokaryotic translation machinery.',
  },
  'ap-bio-u4-071': {
    answer: 'Receptor-expressing cells respond while matched receptor-negative cells do not.',
  },
  'ap-bio-u4-073': {
    answer: 'The pathway generates a transient response peaking near the 5-minute mark.',
  },
  'ap-bio-u4-074': {
    answer: 'Positive feedback amplifies the response until the clot forms.',
  },
  'ap-bio-u4-076': {
    answer: 'Compare proliferation rates with active versus inactive inhibitor under matched growth conditions.',
  },
  'ap-bio-u6-088': {
    answer: 'Paired primers are needed to flank the target region for exponential copying.',
  },
  'ap-bio-u8-098': {
    answer: 'Disease is density dependent, while the thermal event is density independent.',
  },
  'ap-bio-u1-103': {
    answer: 'Run separate peptide and nucleotide assays, each with positive and negative controls.',
  },
  'ap-bio-u1-105': {
    answer: 'The lipid has large hydrophobic regions interacting favorably with organic solvents rather than water.',
  },
  'ap-bio-u2-108': {
    prompt: 'Two cells enclose the same interior capacity, but one is spherical and the other has many narrow extensions. The extended cell exchanges dissolved substances more rapidly. Which explanation is most reasonable?',
  },
  'ap-bio-u2-109': {
    answer: 'Cholesterol buffers fluidity by preventing tight packing at low temperatures and curbing motion in heat.',
  },
  'ap-bio-u2-110': {
    answer: 'The blocker inhibits protein-mediated chloride transport but not simple oxygen flow.',
  },
  'ap-bio-u2-111': {
    prompt: 'Cells internalize a fluorescent ligand, yet internalization falls sharply when its target docking protein is absent. Which process is most consistent with the result?',
  },
  'ap-bio-u3-117': {
    answer: 'Living sprouting seeds consume oxygen via aerobic respiration in this setup.',
  },
  'ap-bio-u3-118': {
    answer: 'Fermentation regenerates NAD+ so glycolysis can continue under anaerobic conditions.',
  },
  'ap-bio-u4-119': {
    answer: 'Direct cell-to-cell signaling via linked cytosolic junctions such as gap junctions.',
  },
  'ap-bio-u4-121': {
    answer: 'The inhibited enzyme functions downstream of the receptor and is needed to relay the signal fully.',
  },
  'ap-bio-u4-122': {
    answer: 'Negative feedback, because the response opposes the initial temperature increase.',
  },
  'ap-bio-u4-123': {
    answer: 'Cells finished DNA synthesis yet arrest in G2 or mitosis before completing cytokinesis.',
  },
  'ap-bio-u5-127': {
    answer: 'The offspring counts match a 9:3:3:1 independent-assortment model within sampling error.',
  },
  'ap-bio-u5-129': {
    answer: 'Offspring can inherit alleles producing type A, type B, type AB, or type O blood.',
  },
  'ap-bio-u5-130': {
    answer: 'Grow each genotype across every soil type in randomized replicates to separate genetic and soil roles.',
  },
  'ap-bio-u6-132': {
    answer: 'Guanine-cytosine pairs form three hydrogen bonds, requiring more heat to denature strands.',
  },
  'ap-bio-u6-134': {
    answer: 'Alternative RNA splicing joins distinct sets of exons from a single pre-mRNA.',
  },
  'ap-bio-u6-136': {
    answer: 'The mutant operon stays active without an activating molecule, unlike wild type.',
  },
  'ap-bio-u6-137': {
    answer: 'The substitution likely altered binding-pocket geometry or interactions needed for catalysis.',
  },
  'ap-bio-u8-144': {
    answer: 'The fish showed the lowest measured ventilation rate near 15 ppt in this study.',
  },
  'ap-bio-u8-145': {
    answer: 'Slower decomposition reduces nutrient recycling back into mineral forms usable by producers.',
  },
  'ap-bio-u1-153': {
    answer: 'Polymer X exposes more nonreducing tips for simultaneous enzymatic cleavage.',
  },
  'ap-bio-u2-158': {
    answer: 'The microvilli cell has greater plasma-membrane area available for exchange with its surroundings.',
  },
  'ap-bio-u2-159': {
    answer: 'Measure bilayer fluidity while independently varying fatty-acid unsaturation and temperature across replicated matched cultures.',
  },
  'ap-bio-u2-162': {
    answer: 'Water will enter the cell, moving from the less negative to more negative side.',
  },
  'ap-bio-u3-164': {
    answer: 'The enzyme has its highest measured activity near pH 6 under these assay conditions.',
  },
  'ap-bio-u4-169': {
    answer: 'Restore receptor R expression in receptor-null cells and check whether the response to L returns.',
  },
  'ap-bio-u5-176': {
    answer: 'Independent assortment of homologs during meiosis',
  },
  'ap-bio-u5-177': {
    answer: 'Genotype affected and non-expressing relatives across several pedigrees to test which inheritance pattern fits.',
  },
  'ap-bio-u5-180': {
    answer: 'Environment drives height variation because clonal cuttings were raised across contrasting substrates.',
  },
  'ap-bio-u6-184': {
    answer: 'The deletion caused a frameshift that shifted the reading frame for subsequent codons.',
  },
  'ap-bio-u6-186': {
    answer: 'Both cells share an identical genome yet express distinct genes via cell-specific regulation.',
  },
  'ap-bio-u7-188': {
    answer: 'The antibiotic selected for preexisting heritable resistance, raising its frequency in later cultures.',
  },
  'ap-bio-u8-195': {
    answer: 'Photoperiod is a cue that can regulate breeding timing differently among distinct species.',
  },
  'ap-bio-u8-199': {
    prompt: 'Two species rely on the same limiting seed supply. When both are placed together, one species declines, yet they coexist when seed size is experimentally divided between them. Which concept best explains the result?',
  },
  'ap-bio-u1-201': {
    answer: 'Nitrogen limited chlorophyll below 5 mM, while another factor may limit pigment output above that point.',
  },
  'ap-bio-u1-203': {
    answer: 'Cellulose has beta linkages forming rigid fibers, while branched glycogen exposes many enzyme-accessible ends.',
  },
  'ap-bio-u1-206': {
    answer: 'The mutation likely altered a regulatory or conformational site, lowering catalysis yet preserving levels.',
  },
  'ap-bio-u2-207': {
    answer: 'Include a bilayer-impermeable dye baseline and compare recovery across untreated, chemically linked, and detergent groups.',
  },
  'ap-bio-u2-208': {
    answer: 'Facilitated diffusion via a carrier protein from higher to lower glucose concentration',
  },
  'ap-bio-u2-209': {
    answer: 'The inhibitor may reduce the number or turnover speed of functional carrier proteins.',
  },
  'ap-bio-u2-210': {
    answer: 'Exocytosis of synaptic vesicles triggered by Ca2+ entry',
  },
  'ap-bio-u2-211': {
    answer: 'Lysosomes keep an acidic lumen for optimal catalysis while isolating enzymes from cytosolic proteins.',
  },
  'ap-bio-u3-214': {
    answer: 'Cool both samples to 37 degrees C before assaying activity against an enzyme-amount control.',
  },
  'ap-bio-u3-216': {
    answer: 'Light-absorbing pigments use red and shorter-wavelength visible light better than green light.',
  },
  'ap-bio-u4-222': {
    answer: 'Cyclin B degradation is part of the regulatory process that permits leaving mitosis.',
  },
  'ap-bio-u4-223': {
    answer: 'The response is negative feedback because it counters the original osmolarity rise.',
  },
  'ap-bio-u5-229': {
    answer: 'Run a replicated factorial study randomly assigning both lines to both nitrogen levels to test if their gap shifts with soil.',
  },
  'ap-bio-u5-230': {
    answer: 'The genes are about 12 map units apart, assuming standard two-point mapping rules.',
  },
  'ap-bio-u6-232': {
    answer: 'Measure the same mRNAs in biological replicates of both lineages, normalizing cell count and depth.',
  },
  'ap-bio-u6-234': {
    answer: 'The mutant makes a shortened protein that may lack domains required for proper function.',
  },
  'ap-bio-u6-235': {
    answer: 'The repair pathway normally lowers mutations persisting following ultraviolet damage.',
  },
  'ap-bio-u6-236': {
    prompt: 'A researcher uses a CRISPR nuclease to edit a target gene. Which comparison design is strongest for attributing a phenotype to the intended edit?',
  },
  'ap-bio-u7-238': {
    answer: 'Drought conditions favored heritable deep-beak variation in the exposed birds.',
  },
  'ap-bio-u7-241': {
    answer: 'The bones are vestigial traits indicating descent from ancestors with functional rear limbs.',
  },
  'ap-bio-u7-242': {
    answer: 'Taxa A and B are sister taxa sharing a closer common ancestor than either with C.',
  },
  'ap-bio-u7-243': {
    answer: 'The tree requiring five evolutionary trait changes.',
  },
  'ap-bio-u8-246': {
    answer: 'Species richness is nearing a discovery plateau, so extra quadrats will likely add fewer species.',
  },
  'ap-bio-u8-250': {
    answer: 'Mutualism because both the plant and fungus gain a net benefit.',
  },
  'ap-bio-u1-253': {
    answer: 'Both are beta-linked polysaccharides aligning into hydrogen-bonded strands, with the latter containing nitrogen.',
  },
  'ap-bio-u2-257': {
    answer: 'The organelles support digestion and processing of material engulfed during defensive phagocytosis.',
  },
  'ap-bio-u2-260': {
    answer: 'A sodium-glucose cotransporter couples downhill sodium influx to uphill glucose import.',
  },
  'ap-bio-u2-262': {
    answer: 'Compare organelle genes and rRNA with prokaryotic and eukaryotic homologs, mapping nuclear versus organelle gene locations.',
  },
  'ap-bio-u3-266': {
    answer: 'Chemiosmotic ATP production falls as the proton gradient dissipates.',
  },
  'ap-bio-u3-267': {
    answer: 'Feedback regulation controls the sequence via an allosteric shift in the first enzyme.',
  },
  'ap-bio-u4-272': {
    answer: 'The responses are negative feedback because they oppose the initial cooling trend.',
  },
  'ap-bio-u4-273': {
    answer: 'The poison disrupts microtubule apparatus or checkpoint exit, stalling M-phase division.',
  },
  'ap-bio-u5-275': {
    answer: 'Nondisjunction gave one product an extra chromosome and a second one fewer than the normal haploid count.',
  },
  'ap-bio-u6-281': {
    answer: 'Semiconservative replication, where each daughter DNA molecule contains one template strand and one nascent strand.',
  },
  'ap-bio-u6-283': {
    answer: 'The inhibitor acts during polypeptide assembly or later rather than eliminating the mRNA.',
  },
  'ap-bio-u6-284': {
    answer: 'Glucose reduces cyclic AMP, limiting CAP activation of the lac operon via catabolite repression.',
  },
  'ap-bio-u6-285': {
    answer: 'Fuse the enhancer to a reporter construct and compare output in hepatic and neural lines with promoter controls.',
  },
  'ap-bio-u6-287': {
    answer: 'Repeat the run with fresh reagents and controls because the blank band suggests contamination.',
  },
  'ap-bio-u7-292': {
    answer: 'Natural selection alters the relative fitness of phenotypes depending on environmental context.',
  },
  'ap-bio-u8-297': {
    answer: 'The population may grow as the large juvenile group reaches breeding age.',
  },
  'ap-bio-u1-302': {
    answer: 'Phosphate limitation constrains ATP and nucleic-acid synthesis, limiting overall growth.',
  },
  'ap-bio-u1-303': {
    answer: 'This hydrolase recognizes a glycosidic bond present in starch and glycogen, not cellulose.',
  },
  'ap-bio-u1-305': {
    answer: 'Fragment X should melt at a higher temperature because its GC pairs have stronger hydrogen-bonding stability.',
  },
  'ap-bio-u2-308': {
    answer: 'Receptor-mediated endocytosis selectively internalizes the paired ligand and receptor.',
  },
  'ap-bio-u2-309': {
    answer: 'Approximately 0.25 M sucrose, because that solution produces no net mass shift.',
  },
  'ap-bio-u3-313': {
    prompt: 'A multi-site enzyme has a high reaction rate when ATP is scarce and a lower rate when ATP accumulates, while a similar enzyme lacking the regulatory site shows no change. Which conclusion is best supported?',
  },
  'ap-bio-u3-318': {
    answer: 'Measure redox-carrier intermediates and proton gradients with and without the inhibitor under matched light and artificial donors.',
  },
  'ap-bio-u4-321': {
    answer: 'The mutated component acts upstream of the added kinase in a pathway promoting cell-cycle entry.',
  },
  'ap-bio-u4-324': {
    answer: 'It is a tumor suppressor that typically restrains transcription of genes for DNA synthesis',
  },
  'ap-bio-u5-325': {
    answer: 'Nondisjunction in anaphase I or II gave one daughter cell an extra chromosome.',
  },
  'ap-bio-u5-328': {
    answer: 'One-half type B offspring and one-half type AB offspring.',
  },
  'ap-bio-u5-329': {
    answer: 'Plant both cultivars in randomized replicated blocks at each site and analyze joint effects.',
  },
  'ap-bio-u7-338': {
    answer: 'Genetic drift caused a large random shift in allele frequency within the tiny group.',
  },
  'ap-bio-u7-341': {
    answer: 'Add homologous characters, verify outgroup and alignment, and test whether common traits reflect convergence.',
  },
  'ap-bio-u7-342': {
    answer: 'Sequence homologous genes from the new species, X, Y, and an outgroup, then assess tree topology support via replicates.',
  },
  'ap-bio-u7-344': {
    answer: 'Assay preexisting resistance prior to dosing across replicate exposed, unexposed, and ancestral control lineages.',
  },
  'ap-bio-u8-348': {
    answer: 'Dropping below 1,800 can raise growth rate, slowing again as the population nears carrying capacity.',
  },
  'ap-bio-u1-351': {
    answer: 'Hydrogen bonding creates cohesion among water molecules and adhesion to vessel walls.',
  },
  'ap-bio-u1-352': {
    answer: 'Absorbed nitrogen enters proteins and peptide monomers, whereas starch consists of glucose polymers lacking nitrogen.',
  },
  'ap-bio-u1-353': {
    answer: 'The polymer is DNA, a nucleic acid whose complementary chains are stabilized by base pairing.',
  },
  'ap-bio-u1-354': {
    answer: 'Distinct glycosidic-linkage geometry gives the structural polymer a shape the storage-digesting catalyst cannot bind.',
  },
  'ap-bio-u1-355': {
    answer: 'Apply equal wax, vehicle, or no treatment to leaves matched for area and stomatal density, tracking weight loss.',
  },
  'ap-bio-u2-358': {
    answer: 'Double bonds kink tails, preventing tight packing and keeping bilayers fluid.',
  },
  'ap-bio-u2-361': {
    answer: 'Water permeability rises, allowing more water to move down its osmotic gradient into the cytosol.',
  },
  'ap-bio-u2-362': {
    answer: 'An ancestral photosynthetic endosymbiont kept select genes and transferred others to the host nucleus.',
  },
  'ap-bio-u3-367': {
    answer: 'Complex I oxidizes the reduced coenzyme, and downstream electron donors partly bypass the block.',
  },
  'ap-bio-u4-372': {
    answer: 'Positive feedback, as released factors amplify platelet recruitment to form a clot.',
  },
  'ap-bio-u4-373': {
    answer: 'Cyclin B promotes entry into mitosis, yet a DNA-damage checkpoint can still halt cycle progression.',
  },
  'ap-bio-u5-376': {
    answer: 'Genes B and C, because their crossover frequency is the smallest.',
  },
  'ap-bio-u5-378': {
    answer: 'Nine deeply pigmented, three lightly pigmented, and four white offspring, giving a 9:3:4 pattern.',
  },
  'ap-bio-u6-381': {
    answer: 'The samples are distinct nucleic acids digested selectively by target-specific nucleases.',
  },
  'ap-bio-u6-384': {
    answer: 'Anticodon-mRNA base pairing during translation, determining which residue is delivered to a ribosome.',
  },
  'ap-bio-u6-385': {
    answer: 'Promoter methylation represses expression here, and reducing methylation resumes transcription.',
  },
  'ap-bio-u6-386': {
    answer: "Variant Y's active-site substitution impairs catalytic function without altering total protein amount.",
  },
  'ap-bio-u6-387': {
    answer: 'Test independent guides and controls, sequence target and off-target sites, and rescue with a guide-resistant construct.',
  },
  'ap-bio-u7-388': {
    answer: 'Heritable alleles for deeper beak size may increase in frequency via differential reproduction.',
  },
  'ap-bio-u7-389': {
    answer: 'Proportions deviate from Hardy-Weinberg expectations, without identifying the violated assumption.',
  },
  'ap-bio-u7-390': {
    answer: 'Shared skeletal structure supports common ancestry, while varied roles reflect divergence.',
  },
  'ap-bio-u7-392': {
    answer: 'Approximately 6 million years, because a 12 percent divergence is 1.5 times the reference 8 percent.',
  },
  'ap-bio-u7-393': {
    answer: 'Allopatric divergence has produced reproductive isolation following geographic separation.',
  },
  'ap-bio-u7-394': {
    answer: 'Compare empty, inert-RNA, and noncatalytic-RNA compartments while tracking retention, catalysis, and RNA replication.',
  },
  'ap-bio-u8-400': {
    answer: 'Use replicated enclosures with random added nutrients and controls, tracking algae, O2 levels, and fish survival.',
  },
  'ap-bio-u1-402': {
    answer: 'Sulfur limitation reduces sulfur-containing amino acid synthesis while sparing carbohydrate storage.',
  },
  'ap-bio-u1-403': {
    answer: 'Primary structure, because peptide linkages define the amino-acid sequence of a polypeptide.',
  },
  'ap-bio-u1-406': {
    answer: 'Hydrogen bonds between paired bases break upon heating and reform upon cooling.',
  },
  'ap-bio-u2-409': {
    answer: 'Approximately -0.5 megapascals, where the tissue shows no net mass shift.',
  },
  'ap-bio-u3-414': {
    answer: 'Both temperature and pH affect catalysis, with heat and alkaline pH together disrupting active-site structure most.',
  },
  'ap-bio-u3-415': {
    answer: 'Oxygen enables electron transport and oxidative phosphorylation, generating far more ATP than substrate-level routes.',
  },
  'ap-bio-u3-417': {
    answer: 'The poison blocks an early electron-transfer carrier, which downstream donors can partly bypass.',
  },
  'ap-bio-u4-422': {
    answer: 'Compare blood glucose in animals with active versus blocked receptors plus vehicle controls under equal glucose.',
  },
  'ap-bio-u4-424': {
    answer: 'The tumor cells evade protease-dependent apoptosis, and reintroducing caspases reactivates regulated death.',
  },
  'ap-bio-u5-425': {
    answer: 'Meiosis I separates homologs, leaving metaphase-II cells haploid with joined sister chromatids.',
  },
  'ap-bio-u5-426': {
    answer: 'Use three or more loci to score two-event crossover progeny by comparing the central locus with original and single types.',
  },
  'ap-bio-u5-428': {
    answer: 'The result stays near the predicted 75:25 split and fits the model under sampling variation.',
  },
  'ap-bio-u6-432': {
    answer: 'Track replication-fork speed and newly synthesized DNA length at initiation sites.',
  },
  'ap-bio-u6-433': {
    answer: 'Mutate the enhancer binding site and compare intact, mutant, depleted, and rescue assays in both lines.',
  },
  'ap-bio-u6-435': {
    answer: 'Reversible phosphorylation controls factor nuclear localization and response duration.',
  },
  'ap-bio-u6-437': {
    answer: 'The first sample is likely homozygous wild-type (cut), and the second homozygous variant (uncut).',
  },
  'ap-bio-u7-438': {
    answer: 'Genetic drift dominates in small populations, whereas consistent shifts in larger groups reflect selection.',
  },
  'ap-bio-u7-441': {
    answer: 'Balancing selection can maintain two alleles because heterozygotes have the highest relative fitness.',
  },
  'ap-bio-u7-442': {
    answer: 'The continents were once connected or closer, giving a historical biogeographic basis for shared remains.',
  },
  'ap-bio-u7-443': {
    answer: 'Gene flow brought the alternative allele, and local selection subsequently raised heat-tolerance prevalence.',
  },
  'ap-bio-u7-444': {
    answer: 'Compare mate preference and hybrid fitness across overlapping sympatric and isolated allopatric populations.',
  },
  'ap-bio-u8-445': {
    answer: 'Present prey at fixed densities, time pursuit and processing, and compare choices to predicted energy per unit time.',
  },
  'ap-bio-u8-447': {
    answer: '0.10, because the net gain of 50 divided by the starting 500 animals equals 0.10.',
  },
  'ap-bio-u8-448': {
    answer: 'The population should stay steady or grow slowly because most members are of breeding age.',
  },
  'ap-bio-u1-453': {
    answer: 'Tertiary or quaternary structure is disrupted while the primary sequence stays unbroken.',
  },
  'ap-bio-u1-457': {
    answer: 'Extreme pH reversibly altered R-group ionization and folding without changing primary structure.',
  },
  'ap-bio-u2-459': {
    answer: 'Compare water flow through bilayers with and without water channels at constant lipids and osmotic gradient.',
  },
  'ap-bio-u2-460': {
    answer: 'Water will move into the cell because its -0.3 megapascals potential is lower than the external medium.',
  },
  'ap-bio-u2-462': {
    answer: 'Facilitated diffusion via a finite number of glucose transporters likely mediates this entry.',
  },
  'ap-bio-u2-463': {
    answer: 'Potassium lowers guard-cell water potential, drawing water in so turgor opens the pore.',
  },
  'ap-bio-u3-465': {
    answer: 'The enzyme is allosterically regulated since occupying a distinct site alters catalysis.',
  },
  'ap-bio-u3-466': {
    answer: 'Enzyme activity shows a temperature-by-pH interaction, peaking among tested groups at 40°C and pH 8.',
  },
  'ap-bio-u3-467': {
    answer: 'NAD+ is required as an electron acceptor in glycolysis, and fermentation normally recycles reduced carriers.',
  },
  'ap-bio-u4-473': {
    answer: 'Quorum-sensing autoinducers build up with crowding and activate shared bioluminescent loci at high levels.',
  },
  'ap-bio-u4-474': {
    answer: 'The mutant receptor retains hormone binding yet fails to activate regulated transcription.',
  },
  'ap-bio-u4-476': {
    answer: 'Positive feedback amplifies the initial stimulus until birth ends the cycle.',
  },
  'ap-bio-u4-479': {
    answer: "Phosphodiesterase degrades cAMP, so blocking it extends the second messenger's lifetime.",
  },
  'ap-bio-u5-484': {
    answer: 'One-half of the sons, because each inherits his X chromosome maternally.',
  },
  'ap-bio-u6-488': {
    answer: 'Okazaki fragments form on the lagging strand because DNA polymerase builds DNA in the 5-prime to 3-prime direction.',
  },
  'ap-bio-u6-491': {
    answer: 'Contamination introduced a target DNA sequence into the buffers or workflow.',
  },
  'ap-bio-u7-493': {
    answer: 'Species A and B are sister taxa, without implying one evolved from the other.',
  },
  'ap-bio-u8-496': {
    answer: 'The lizard alters behavior in response to its environment to maintain thermal balance.',
  },
  'ap-bio-u8-497': {
    answer: 'About 10 percent of autotroph energy entered herbivore tissue, and about 10 percent of that reached the next trophic level.',
  },
  'ap-bio-u8-500': {
    answer: 'Sea otters act as a keystone predator whose removal disproportionately shifts the ecosystem.',
  },
};
