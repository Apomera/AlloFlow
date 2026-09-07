#!/usr/bin/env node
'use strict';

// Second and third native lesson sections for each AP Biology unit.
//
// Before this file each unit had exactly one lesson section, and every item in
// the unit (roughly sixty) routed to it. Every other AP pack gives a unit three.
// These sections split each unit by public framework topic so an item's
// "Read the lesson first" control lands on the lesson about its own topic.
//
// Everything here is original text written from the public framework topic
// list and standard introductory biology; no CED prose, OpenStax prose, or
// assessment content is reproduced. The voice, block structure, and review
// boundary match the existing section-01 specs in build_ap_biology_50_bank.cjs.
// Knowledge-check answer positions are spread across all four slots on purpose.
//
// `section1Topics` says which framework topics stay routed to the existing
// first section; each new section lists the topics it takes.

const AP_BIOLOGY_UNIT_SECTIONS = Object.freeze([
  // Unit 1: Chemistry of Life
  {
    unit: 1,
    section1Topics: ['1.1', '1.2', '1.3'],
    sections: [
      {
        heading: 'Carbohydrates and lipids',
        topics: ['1.4', '1.5'],
        content: 'Carbohydrates are built from monosaccharide monomers joined by dehydration synthesis into disaccharides and polysaccharides. The same monomer can produce polymers with different properties: starch and glycogen store energy in plants and animals, while cellulose forms plant cell walls because its linkages create straight, hydrogen-bonded fibers that most animal enzymes cannot digest. Lipids are not true polymers. Fats store energy in long hydrocarbon chains, phospholipids have a hydrophilic head and hydrophobic tails that drive bilayer formation in water, and steroids are ring structures that serve as membrane components and signaling molecules. Saturated chains pack tightly and are solid at room temperature; unsaturated chains have kinks from double bonds that keep membranes and oils fluid.',
        keyTerms: ['monosaccharide', 'polysaccharide', 'cellulose', 'phospholipid', 'saturated fatty acid'],
        rich: {
          examples: ['Glycogen branches let an animal cell release glucose from many chain ends at once when demand rises.', 'Cold-water fish keep membranes fluid by increasing the proportion of unsaturated fatty acids.'],
          nonExamples: ['A polysaccharide made of glucose is not automatically a food source; cellulose and starch are both glucose polymers with different digestibility.', 'A molecule being hydrophobic does not make it a lipid; the lipid class is defined by structure, and many lipids have hydrophilic regions.'],
          misconception: 'Lipids are not polymers assembled from repeating identical monomers, so fat structure is explained by fatty-acid chains and a glycerol backbone rather than by a monomer-to-polymer chain.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Amylase digests starch but not cellulose in a test tube.', 'Enzyme specificity depends on the linkage geometry between glucose units.', 'That cellulose has no biological role or that no organism can digest it.'], ['A membrane with more unsaturated tails stays fluid at lower temperature.', 'Kinks in unsaturated chains reduce tight packing.', 'That saturated fats are never present in cold-adapted membranes.']],
          retrieval: ['Explain why starch and cellulose behave differently even though both are glucose polymers.', 'Describe how a phospholipid orients itself in water and why.', 'Predict how membrane fluidity changes with saturation and temperature.'],
          transfer: 'When a question names a carbohydrate or lipid, identify the monomer or chain structure first, then reason from packing, branching, or polarity to the property being asked about.',
        },
        check: {
          prompt: 'A plant stores glucose as starch while a cellulose fiber in the same cell wall resists digestion by the plant’s own enzymes. What best explains the difference?',
          choices: ['Starch is made of fructose and cellulose is made of glucose', 'Cellulose is a lipid rather than a carbohydrate', 'The two polymers differ in the geometry of the linkages between glucose units, which enzymes recognize', 'Starch molecules are far smaller than cellulose molecules'],
          answerIndex: 2,
          rationale: 'Both are glucose polymers; the linkage geometry differs, so an enzyme shaped for one linkage does not act on the other.',
        },
      },
      {
        heading: 'Nucleic acids and proteins',
        topics: ['1.6', '1.7'],
        content: 'Nucleic acids are polymers of nucleotides, each with a sugar, a phosphate, and a nitrogenous base. DNA uses deoxyribose and thymine and forms an antiparallel double helix held by base pairing; RNA uses ribose and uracil and is usually single-stranded. The sequence of bases stores information and directs protein synthesis. Proteins are polymers of amino acids joined by peptide bonds. The primary sequence determines how the chain folds into secondary structures, a tertiary three-dimensional shape, and sometimes a quaternary arrangement of several chains. Because function depends on shape, a change in sequence, pH, or temperature can alter or destroy activity by changing the interactions that hold the fold together.',
        keyTerms: ['nucleotide', 'antiparallel', 'peptide bond', 'tertiary structure', 'denaturation'],
        rich: {
          examples: ['A single amino-acid substitution in hemoglobin changes how the protein aggregates under low oxygen.', 'Heating an enzyme past its optimum reduces activity because the weak interactions holding its shape break.'],
          nonExamples: ['A nucleotide sequence is not itself a protein; information must be transcribed and translated before a folded product exists.', 'Two proteins with the same length and amino-acid composition do not necessarily have the same function, because order and folding differ.'],
          misconception: 'Denaturation changes shape by breaking the weak interactions that hold a fold together; it does not break the peptide bonds of the primary sequence.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['An enzyme regains activity after being returned from a mildly altered pH to its optimum.', 'The primary sequence stayed intact and the fold could re-form.', 'That every denatured protein can refold or that the peptide backbone was affected.'], ['A DNA sample contains 30 percent adenine.', 'Thymine is also about 30 percent because adenine pairs with thymine.', 'The exact percentage of guanine without further data on the remaining bases.']],
          retrieval: ['List the three parts of a nucleotide and state what differs between DNA and RNA.', 'Explain how primary structure leads to tertiary structure.', 'Describe one condition that denatures a protein and what it changes.'],
          transfer: 'For a protein question, trace the chain from sequence to fold to function and ask at which level the described change acts before predicting the outcome.',
        },
        check: {
          prompt: 'A researcher changes a single base in a gene, and the resulting protein has one different amino acid in its interior. The protein loses most of its activity. Which level of structure was most directly altered first?',
          choices: ['Primary structure, which then changed the fold', 'Quaternary structure, because subunits separated', 'Only the secondary structure, leaving the fold intact', 'None; a single base change cannot alter a protein'],
          answerIndex: 0,
          rationale: 'The amino-acid sequence is primary structure; changing it can change the interactions that produce the higher-level fold.',
        },
      },
    ],
  },
  // Unit 2: Cells
  {
    unit: 2,
    section1Topics: ['2.4', '2.5', '2.6'],
    sections: [
      {
        heading: 'Cell structure, cell size, and the plasma membrane',
        topics: ['2.1', '2.2', '2.3'],
        content: 'Eukaryotic cells organize work into membrane-bound compartments: ribosomes build proteins, the endoplasmic reticulum and Golgi modify and route them, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA. Prokaryotic cells lack these internal compartments but still carry out the same essential chemistry. Cell size is constrained by surface area relative to volume, because materials enter and leave across the surface while demand scales with volume; folded membranes and small size increase the surface available for exchange. The plasma membrane is a fluid mosaic of phospholipids with embedded proteins and cholesterol, which together control what passes and let the cell respond to its environment.',
        keyTerms: ['organelle', 'compartmentalization', 'surface-area-to-volume ratio', 'fluid mosaic model', 'prokaryote'],
        rich: {
          examples: ['Cells lining the small intestine fold their membranes into microvilli, multiplying the surface available for absorption.', 'A mitochondrion folds its inner membrane into cristae so more electron-transport proteins fit in a small volume.'],
          nonExamples: ['A larger cell does not exchange materials faster; its surface grows more slowly than its volume, so exchange per unit volume falls.', 'The absence of a nucleus in a prokaryote does not mean the absence of DNA or of organized metabolism.'],
          misconception: 'Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally, which is why it is described as a mosaic.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A cube with 1 cm sides has a surface-to-volume ratio of 6; a cube with 3 cm sides has a ratio of 2.', 'Ratio decreases as size increases.', 'That a real cell is a cube or that shape has no effect.'], ['A cell with more folded internal membrane shows higher rates of a membrane-bound reaction.', 'More membrane surface can hold more of the relevant proteins.', 'That the folds alone caused the rate change without considering protein density.']],
          retrieval: ['Match three organelles to the process each performs.', 'Explain why surface-area-to-volume ratio limits cell size.', 'Describe the components of the fluid mosaic model.'],
          transfer: 'When a structure is described, ask what surface, compartment, or protein it provides, then connect that to the rate or specificity of the process the question is about.',
        },
        check: {
          prompt: 'Two spherical cells have radii of 1 unit and 4 units. Compared with the small cell, the large cell has a surface-area-to-volume ratio that is',
          choices: ['sixteen times larger', 'four times larger', 'the same, because both are spheres', 'one quarter as large'],
          answerIndex: 3,
          rationale: 'For a sphere the ratio is 3 divided by the radius, so multiplying the radius by four divides the ratio by four.',
        },
      },
      {
        heading: 'Tonicity, osmoregulation, and the origins of cells',
        topics: ['2.7', '2.8', '2.9', '2.10'],
        content: 'Tonicity describes how a solution affects a cell’s water balance. In a hypotonic solution water enters; animal cells may burst while walled cells become turgid. In a hypertonic solution water leaves and cells shrink or plasmolyze. Water potential combines solute and pressure effects and predicts the direction of net water movement. Organisms manage this balance with contractile vacuoles, ion pumps, and kidneys. Transport mechanisms range from passive diffusion down a gradient, through facilitated diffusion using channels and carriers, to active transport that uses ATP to move substances against a gradient, and bulk transport by endocytosis and exocytosis. The endosymbiotic theory explains mitochondria and chloroplasts as descendants of free-living prokaryotes, supported by their own circular DNA, ribosomes, and double membranes.',
        keyTerms: ['tonicity', 'water potential', 'plasmolysis', 'active transport', 'endosymbiosis'],
        rich: {
          examples: ['A freshwater protist pumps out water with a contractile vacuole because its cytoplasm is hypertonic to the pond.', 'Chloroplast ribosomes resemble bacterial ribosomes more than the ribosomes in the surrounding cytoplasm.'],
          nonExamples: ['A solution being concentrated does not by itself tell you the direction of water movement; the comparison to the cell interior does.', 'A membrane protein moving a substance is not necessarily active transport; channels and carriers can move substances passively.'],
          misconception: 'Water moves toward the region of lower water potential, which usually means higher solute concentration, and it does not move because solutes attract it in any direct sense.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Potato cores gain mass in distilled water and lose mass in 0.6 M sucrose.', 'The tissue water potential lies between the two solutions.', 'The exact solute concentration of the tissue without an intermediate series.'], ['Mitochondria have circular DNA and divide independently of the cell cycle.', 'A prokaryotic ancestry consistent with endosymbiosis.', 'That mitochondria could survive outside a eukaryotic cell today.']],
          retrieval: ['Predict what happens to an animal cell and a plant cell in a hypotonic solution.', 'State the two components of water potential and how each changes it.', 'List three lines of evidence for the endosymbiotic origin of mitochondria.'],
          transfer: 'For any water-movement question, write the water potential on each side, decide which is lower, and only then describe what the cell does about it.',
        },
        check: {
          prompt: 'A plant cell is placed in a solution and its cytoplasm pulls away from the cell wall. The external solution is best described as',
          choices: ['hypotonic to the cell', 'hypertonic to the cell', 'isotonic with the cell', 'pure water'],
          answerIndex: 1,
          rationale: 'Plasmolysis occurs when water leaves the cell, which happens when the outside solution has lower water potential, that is, when it is hypertonic.',
        },
      },
    ],
  },
  // Unit 3: Cellular Energetics
  {
    unit: 3,
    section1Topics: ['3.1', '3.2', '3.3'],
    sections: [
      {
        heading: 'Photosynthesis',
        topics: ['3.4'],
        content: 'Photosynthesis converts light energy into chemical energy in two linked stages. In the light-dependent reactions, pigments in the thylakoid membranes absorb light, water is split to release oxygen, electrons move through an electron transport chain that pumps protons into the thylakoid space, and the resulting gradient drives ATP synthase; NADP+ is reduced to NADPH. In the Calvin cycle in the stroma, ATP and NADPH power the fixation of carbon dioxide by rubisco and the reduction of the resulting molecules into sugars, regenerating the starting acceptor. Factors that limit either stage, such as light intensity, carbon dioxide availability, or temperature, limit the whole process.',
        keyTerms: ['thylakoid', 'photosystem', 'NADPH', 'Calvin cycle', 'rubisco'],
        rich: {
          examples: ['Oxygen bubbles from an aquatic plant increase with light intensity until another factor becomes limiting.', 'A plant kept in air with little carbon dioxide accumulates ATP and NADPH but makes less sugar.'],
          nonExamples: ['The oxygen released comes from water, not from carbon dioxide.', 'The Calvin cycle does not require darkness; it depends on products of the light reactions and runs while they are available.'],
          misconception: 'Plants do not photosynthesize instead of respiring; they do both, and sugar made by photosynthesis is later broken down by respiration to power the plant’s own cells.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Oxygen production plateaus above a certain light intensity.', 'A factor other than light, such as carbon dioxide or enzyme capacity, has become limiting.', 'That light is no longer being absorbed.'], ['Isotopically labeled oxygen in water appears in the oxygen gas released.', 'Water is the source of the released oxygen.', 'That carbon dioxide plays no role in the process.']],
          retrieval: ['Name the inputs and outputs of the light-dependent reactions.', 'Explain how a proton gradient leads to ATP synthesis.', 'State what the Calvin cycle needs from the light reactions and why.'],
          transfer: 'When a photosynthesis question changes one condition, decide which stage that condition feeds, then trace the effect forward to the product the question asks about.',
        },
        check: {
          prompt: 'A student supplies a plant with water containing a heavy isotope of oxygen and later detects that isotope in the oxygen gas the plant releases. This result supports the claim that',
          choices: ['the Calvin cycle produces oxygen directly', 'the released oxygen comes from water split during the light reactions', 'carbon dioxide is the source of the released oxygen', 'the plant is not carrying out photosynthesis'],
          answerIndex: 1,
          rationale: 'The label travels from water into released oxygen, which is what splitting water in the light-dependent reactions predicts.',
        },
      },
      {
        heading: 'Cellular respiration and fermentation',
        topics: ['3.5'],
        content: 'Cellular respiration releases the chemical energy of glucose in stages. Glycolysis in the cytosol splits glucose into pyruvate, producing a small amount of ATP and NADH without oxygen. In the mitochondrial matrix, pyruvate is oxidized and the citric acid cycle transfers electrons to NADH and FADH2 while releasing carbon dioxide. Those carriers deliver electrons to the electron transport chain in the inner membrane, which pumps protons into the intermembrane space; oxygen accepts the electrons at the end of the chain, and the proton gradient drives ATP synthase. Without oxygen, fermentation regenerates NAD+ so glycolysis can continue, producing lactate or ethanol and carbon dioxide but far less ATP.',
        keyTerms: ['glycolysis', 'citric acid cycle', 'electron transport chain', 'chemiosmosis', 'fermentation'],
        rich: {
          examples: ['Muscle cells during intense exercise produce lactate when oxygen delivery cannot keep pace with demand.', 'A poison that blocks the electron transport chain stops most ATP production even though glucose is available.'],
          nonExamples: ['Fermentation is not a way to make more ATP than respiration; it is a way to keep glycolysis running when oxygen is absent.', 'Oxygen is not consumed in glycolysis or the citric acid cycle; its role is as the final electron acceptor.'],
          misconception: 'Most ATP in aerobic respiration comes from chemiosmosis driven by the proton gradient, not directly from the citric acid cycle.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Yeast in a sealed flask with sugar produce carbon dioxide and ethanol.', 'Fermentation is occurring in the absence of oxygen.', 'That the yeast cannot respire aerobically when oxygen is present.'], ['A compound that makes the inner membrane leaky to protons increases oxygen use but reduces ATP.', 'The proton gradient, not electron flow alone, is what drives ATP synthesis.', 'That electron transport has stopped.']],
          retrieval: ['State where glycolysis, the citric acid cycle, and the electron transport chain occur.', 'Explain why oxygen is needed for the electron transport chain.', 'Describe what fermentation accomplishes for a cell.'],
          transfer: 'For a respiration question, locate the stage affected, ask whether it blocks electron flow, the proton gradient, or NAD+ regeneration, and predict ATP yield from that.',
        },
        check: {
          prompt: 'A drug allows protons to cross the inner mitochondrial membrane freely without passing through ATP synthase. Which result is expected?',
          choices: ['ATP production falls even though oxygen consumption continues', 'Glycolysis stops immediately', 'ATP production increases because electrons flow faster', 'The citric acid cycle switches to producing lactate'],
          answerIndex: 0,
          rationale: 'Electron transport and oxygen use can continue, but without a proton gradient through ATP synthase, most ATP synthesis is lost.',
        },
      },
    ],
  },
  // Unit 4: Cell Communication and Cell Cycle
  {
    unit: 4,
    section1Topics: ['4.1', '4.2', '4.3'],
    sections: [
      {
        heading: 'Feedback and homeostasis',
        topics: ['4.4'],
        content: 'Organisms maintain internal conditions within a range using feedback. In negative feedback, a change in a regulated variable triggers a response that opposes the change, returning the variable toward its set point, as when insulin lowers blood glucose after a meal and glucagon raises it during fasting. In positive feedback, a change triggers a response that amplifies it, driving a process rapidly to completion, as in the contractions of childbirth or the clotting cascade. Feedback loops have a sensor, a control center, and an effector, and disrupting any part can push a variable out of range.',
        keyTerms: ['negative feedback', 'positive feedback', 'set point', 'effector', 'homeostasis'],
        rich: {
          examples: ['A rise in body temperature triggers sweating and vasodilation that lower it again.', 'Ripening fruit releases ethylene that speeds ripening in neighboring fruit.'],
          nonExamples: ['Negative feedback is not a harmful process; the word refers to opposing the change, not to a bad outcome.', 'Positive feedback does not mean an improvement; it means the response pushes the variable further in the same direction.'],
          misconception: 'A regulated variable in negative feedback is not held perfectly constant; it oscillates within a range around the set point as the loop repeatedly corrects it.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Blood glucose rises after a meal and returns to baseline within about two hours.', 'A negative feedback loop is restoring the variable.', 'Which hormone was responsible without further measurement.'], ['Uterine contractions grow stronger and more frequent until birth.', 'A positive feedback loop amplifies the stimulus.', 'That positive feedback continues indefinitely after the process completes.']],
          retrieval: ['Contrast negative and positive feedback in one sentence each.', 'Identify the sensor, control center, and effector in temperature regulation.', 'Give one example where positive feedback is useful.'],
          transfer: 'When a question describes a response, ask whether the response opposes or amplifies the original change; that single decision classifies the loop and predicts what happens next.',
        },
        check: {
          prompt: 'After a person eats, a hormone is released that causes cells to take up glucose, and blood glucose falls back toward its usual level. This sequence is an example of',
          choices: ['positive feedback amplifying the glucose rise', 'a failure of homeostasis', 'a feedforward reflex with no sensor', 'negative feedback restoring a variable to its range'],
          answerIndex: 3,
          rationale: 'The response opposes the initial change and returns the variable toward its set point, which defines negative feedback.',
        },
      },
      {
        heading: 'The cell cycle and its regulation',
        topics: ['4.5', '4.6'],
        content: 'The eukaryotic cell cycle moves through interphase, in which the cell grows in G1, replicates its DNA in S, and prepares in G2, and then through mitosis and cytokinesis, which divide the copied chromosomes and the cytoplasm into two genetically identical cells. Cells that stop dividing rest in G0. Progress is controlled at checkpoints where cyclins and cyclin-dependent kinases decide whether conditions allow the next phase, checking for DNA damage, complete replication, and correct attachment of chromosomes to the spindle. When these controls fail, cells may divide without limit, which is one basis of cancer, or may be directed into programmed cell death.',
        keyTerms: ['interphase', 'mitosis', 'checkpoint', 'cyclin-dependent kinase', 'apoptosis'],
        rich: {
          examples: ['A cell with damaged DNA is held at a checkpoint until repair is complete or it is signaled to undergo apoptosis.', 'A mutation that keeps a growth signal permanently on can let cells pass a checkpoint without the normal go-ahead.'],
          nonExamples: ['Mitosis is not the entire cell cycle; most of a dividing cell’s time is spent in interphase.', 'Cytokinesis is not part of mitosis proper; it divides the cytoplasm after the chromosomes have been separated.'],
          misconception: 'DNA is replicated once, during S phase, before mitosis begins; it is not copied during mitosis itself.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Most cells in a growing root tip are seen in interphase rather than in a mitotic stage.', 'Interphase occupies the majority of the cycle.', 'That interphase cells are inactive.'], ['Cells lacking a functional checkpoint protein divide even when DNA is damaged.', 'The checkpoint normally prevents division under those conditions.', 'That every cancer involves this particular protein.']],
          retrieval: ['Name the phases of interphase and what happens in each.', 'Explain what a checkpoint decides and what information it uses.', 'Describe how a loss of cell-cycle control can contribute to cancer.'],
          transfer: 'For a cell-cycle question, place the described event on the cycle first, then ask which checkpoint would normally catch it and what happens if that checkpoint fails.',
        },
        check: {
          prompt: 'A cell has finished replicating its DNA but has not yet begun to condense its chromosomes. It is most likely in',
          choices: ['G1', 'G2', 'anaphase', 'G0'],
          answerIndex: 1,
          rationale: 'G2 follows S phase, when replication is complete, and precedes mitosis, when chromosomes condense.',
        },
      },
    ],
  },
  // Unit 5: Heredity
  {
    unit: 5,
    section1Topics: ['5.1', '5.2'],
    sections: [
      {
        heading: 'Mendelian genetics and probability',
        topics: ['5.3'],
        content: 'Mendel’s work shows that traits are passed by discrete units, now called alleles, that separate during gamete formation and recombine at fertilization. The law of segregation states that each gamete receives one allele of each gene; the law of independent assortment states that alleles of different genes on different chromosomes sort independently. A Punnett square is a way of applying the product rule to the probabilities of gametes, and the addition rule combines the probabilities of alternative outcomes. Dominance describes which phenotype appears in a heterozygote and says nothing about how common an allele is in a population.',
        keyTerms: ['allele', 'segregation', 'independent assortment', 'product rule', 'heterozygote'],
        rich: {
          examples: ['Crossing two heterozygotes for one gene gives a 3 to 1 phenotypic ratio when one allele is fully dominant.', 'The chance of an offspring being homozygous recessive for two independent genes from two double heterozygotes is 1/4 times 1/4.'],
          nonExamples: ['A dominant allele is not necessarily the most common allele; dominance is about phenotype in heterozygotes, not frequency.', 'A 3 to 1 ratio in a small family is not guaranteed; the ratio is a probability, not a fixed outcome.'],
          misconception: 'Independent assortment applies to genes on different chromosomes or far apart on the same one; genes close together on a chromosome tend to be inherited together and do not assort independently.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A cross of two purple-flowered plants produces about one white-flowered offspring in four.', 'Both parents were heterozygous for a recessive white allele.', 'The exact genotype of any single purple offspring.'], ['Two traits appear together in offspring far more often than the product rule predicts.', 'The genes are likely linked on the same chromosome.', 'That either gene is dominant over the other.']],
          retrieval: ['State the law of segregation and the law of independent assortment.', 'Calculate the probability of two independent events both occurring.', 'Explain what a test cross reveals.'],
          transfer: 'For a genetics problem, write the parental gametes first, apply the product rule to each combination, and only then assign phenotypes using the dominance relationship given.',
        },
        check: {
          prompt: 'Two plants that are both heterozygous for two independently assorting genes are crossed. What fraction of the offspring is expected to be homozygous recessive for both genes?',
          choices: ['1/16', '1/4', '9/16', '1/2'],
          answerIndex: 0,
          rationale: 'Each gene independently gives a 1/4 chance of homozygous recessive offspring; the product rule gives 1/4 times 1/4.',
        },
      },
      {
        heading: 'Non-Mendelian inheritance and environmental effects',
        topics: ['5.4', '5.5'],
        content: 'Many traits do not follow simple dominant-recessive patterns. In incomplete dominance the heterozygote shows an intermediate phenotype, and in codominance both alleles are expressed. Some genes have multiple alleles in a population, as in the ABO blood groups. Sex-linked genes on the X chromosome produce different inheritance patterns in males and females. Polygenic traits depend on many genes and show continuous variation. Genes located near each other on a chromosome are linked and are separated only by crossing over, so recombination frequency indicates their distance apart. Mitochondrial and chloroplast genes are usually inherited from the maternal parent. Finally, the environment influences phenotype, so the same genotype can produce different traits under different conditions.',
        keyTerms: ['incomplete dominance', 'codominance', 'sex-linked', 'linkage', 'phenotypic plasticity'],
        rich: {
          examples: ['Hydrangea flowers on genetically identical plants are blue in acidic soil and pink in alkaline soil.', 'Red-green color blindness appears far more often in males because the responsible gene is on the X chromosome.'],
          nonExamples: ['An intermediate phenotype does not mean the alleles have blended and been lost; each allele is passed on unchanged.', 'A trait being influenced by the environment does not make it non-heritable; genes and environment act together.'],
          misconception: 'Recombination frequency reflects the distance between linked genes, so a low frequency indicates genes that are close together rather than genes that are unlinked.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A cross between red and white flowers yields all pink offspring.', 'Incomplete dominance at this gene.', 'That the red and white alleles have merged; a pink by pink cross recovers both colors.'], ['Two genes recombine in 2 percent of offspring.', 'The genes are tightly linked on one chromosome.', 'That either gene is on a sex chromosome.']],
          retrieval: ['Distinguish incomplete dominance from codominance with an example of each.', 'Explain why X-linked recessive traits appear more often in males.', 'Describe how recombination frequency is used to map genes.'],
          transfer: 'When a ratio departs from Mendelian expectations, test the alternatives in order: intermediate phenotype, both alleles shown, sex-linkage, linkage, many genes, or an environmental effect.',
        },
        check: {
          prompt: 'Genetically identical plants grown at different altitudes differ markedly in height. Which statement best explains this observation?',
          choices: ['The plants have different alleles for height', 'The plants at higher altitude experienced more mutations', 'The environment influences the expression of the same genotype', 'Height is controlled by a single dominant allele'],
          answerIndex: 2,
          rationale: 'The genotypes are identical, so the difference in phenotype must come from environmental conditions acting on gene expression and growth.',
        },
      },
    ],
  },
  // Unit 6: Gene Expression and Regulation
  {
    unit: 6,
    section1Topics: ['6.1', '6.2'],
    sections: [
      {
        heading: 'Transcription, translation, and gene regulation',
        topics: ['6.3', '6.4', '6.5', '6.6'],
        content: 'Gene expression begins with transcription, in which RNA polymerase reads a DNA template strand and synthesizes a complementary messenger RNA. In eukaryotes the transcript is capped, given a poly-A tail, and spliced to remove introns before it leaves the nucleus. In translation, ribosomes read the mRNA in codons; transfer RNAs carrying specific amino acids pair with each codon through their anticodons, and the growing polypeptide is linked by peptide bonds until a stop codon is reached. Regulation determines when and how much of a gene is expressed: in bacteria, operons let a repressor or activator control a group of genes together; in eukaryotes, transcription factors, enhancers, chromatin structure, DNA methylation, RNA processing, and RNA interference all shape expression. Differential gene expression lets cells with the same genome become different cell types.',
        keyTerms: ['RNA polymerase', 'codon', 'intron', 'operon', 'transcription factor'],
        rich: {
          examples: ['The lac operon in a bacterium is transcribed when lactose is present and glucose is scarce.', 'Alternative splicing lets one gene produce several related proteins in different tissues.'],
          nonExamples: ['A gene being present in a cell does not mean it is being expressed; every cell carries genes it never transcribes.', 'The template strand is not the coding strand; the mRNA matches the coding strand’s sequence with uracil in place of thymine.'],
          misconception: 'A tRNA anticodon pairs with the mRNA codon, not with the DNA; the amino acid it carries is determined by that codon, not by the amino acid attaching to the mRNA directly.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A mutation in a promoter reduces the amount of protein produced but the protein sequence is unchanged.', 'The mutation affected transcription initiation, not the coding sequence.', 'That the protein is fully functional at the reduced level.'], ['Adding a chemical that removes methyl groups from DNA turns on a previously silent gene.', 'Methylation was contributing to keeping the gene off.', 'That methylation is the only control acting on that gene.']],
          retrieval: ['List the three processing steps a eukaryotic pre-mRNA undergoes.', 'Explain how a tRNA links a codon to an amino acid.', 'Describe one way eukaryotes regulate transcription that bacteria do not use.'],
          transfer: 'For an expression question, locate the step affected on the path from DNA to protein, then ask whether the change alters how much product is made, its sequence, or its timing.',
        },
        check: {
          prompt: 'A mutation destroys the binding site for a transcription factor that normally activates a gene. The most direct expected result is',
          choices: ['a protein with a different amino-acid sequence', 'transcription of the gene at a reduced rate', 'failure of the ribosome to bind the mRNA', 'removal of the introns from the gene'],
          answerIndex: 1,
          rationale: 'Loss of an activator binding site lowers transcription initiation without changing the coding sequence or later steps.',
        },
      },
      {
        heading: 'Mutations and biotechnology',
        topics: ['6.7', '6.8'],
        content: 'Mutations are changes in DNA sequence. A point mutation may be silent if the new codon specifies the same amino acid, missense if it changes an amino acid, or nonsense if it creates a stop codon. Insertions or deletions that are not a multiple of three shift the reading frame and usually disrupt the protein. Larger changes rearrange or duplicate chromosome segments. Mutations arise from replication errors and from mutagens, and they are the raw material for variation on which natural selection acts. Biotechnology manipulates DNA directly: restriction enzymes cut at specific sequences, gel electrophoresis separates fragments by size, the polymerase chain reaction amplifies a target sequence, plasmids carry genes into bacteria, and sequencing reads the order of bases so genes can be compared across organisms.',
        keyTerms: ['frameshift', 'nonsense mutation', 'restriction enzyme', 'gel electrophoresis', 'polymerase chain reaction'],
        rich: {
          examples: ['A single-base deletion early in a gene shifts every downstream codon and typically yields a nonfunctional protein.', 'PCR with primers flanking a gene produces millions of copies from a tiny sample in a few hours.'],
          nonExamples: ['A mutation is not automatically harmful; many are neutral, and some are beneficial in a given environment.', 'A larger DNA fragment does not travel farther in a gel; smaller fragments move farther because they pass through the matrix more easily.'],
          misconception: 'A silent mutation changes the DNA but not the amino-acid sequence, so an unchanged protein does not mean the DNA is unchanged.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A gene with an inserted single base produces a much shorter protein.', 'The insertion shifted the reading frame and introduced an early stop codon.', 'Where in the gene the insertion occurred without sequencing.'], ['Two DNA samples cut with the same enzyme give different band patterns on a gel.', 'The samples differ in sequence at one or more restriction sites.', 'Which specific bases differ.']],
          retrieval: ['Classify a point mutation as silent, missense, or nonsense from its effect on the codon.', 'Explain why a frameshift is usually more disruptive than a substitution.', 'Describe what PCR requires and what it produces.'],
          transfer: 'For a mutation question, translate the change into its effect on codons first, then predict the protein; for a biotechnology question, name what each tool separates, cuts, copies, or reads.',
        },
        check: {
          prompt: 'Which change in a coding sequence is most likely to produce a protein with almost every amino acid after the change altered?',
          choices: ['A substitution that changes one codon to a synonymous codon', 'A substitution that changes one amino acid', 'A substitution that creates a stop codon near the end of the gene', 'A deletion of one base near the start of the gene'],
          answerIndex: 3,
          rationale: 'Deleting a single base shifts the reading frame so every codon downstream is read differently.',
        },
      },
    ],
  },
  // Unit 7: Natural Selection
  {
    unit: 7,
    section1Topics: ['7.1', '7.2', '7.3'],
    sections: [
      {
        heading: 'Population genetics and Hardy-Weinberg',
        topics: ['7.4', '7.5'],
        content: 'Evolution is a change in allele frequencies in a population over generations. The Hardy-Weinberg principle describes a population in which frequencies do not change: no mutation, no migration, a very large population, random mating, and no selection. Under those conditions, if p and q are the frequencies of two alleles, then p plus q equals 1 and the genotype frequencies are p squared, 2pq, and q squared. Real populations depart from these conditions, and measuring how far observed genotype frequencies differ from the expectation is a way to detect that evolution is occurring. Genetic drift changes frequencies by chance, most strongly in small populations, and founder effects and bottlenecks are drift in action; gene flow moves alleles between populations.',
        keyTerms: ['allele frequency', 'Hardy-Weinberg equilibrium', 'genetic drift', 'bottleneck', 'gene flow'],
        rich: {
          examples: ['In a population where 16 percent of individuals show a recessive trait, q is 0.4 and the heterozygote frequency is expected to be 0.48.', 'A population reduced to a few survivors by a storm carries only the alleles those survivors happened to have.'],
          nonExamples: ['A rare allele is not necessarily being selected against; drift and low starting frequency can keep an allele rare without any fitness difference.', 'Meeting Hardy-Weinberg expectations does not prove the population never evolves; it shows frequencies were stable across the generations measured.'],
          misconception: 'Dominant alleles do not increase in frequency simply because they are dominant; frequency changes only through selection, drift, mutation, or migration.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A population shows far fewer heterozygotes than p squared, 2pq, q squared predicts.', 'At least one Hardy-Weinberg condition is not met, such as nonrandom mating or selection.', 'Which condition is violated without further data.'], ['Allele frequencies in a small island population drift widely from year to year.', 'Chance sampling has a large effect in small populations.', 'That the island environment is selecting for any allele.']],
          retrieval: ['List the five conditions of Hardy-Weinberg equilibrium.', 'Calculate allele frequencies from the frequency of a recessive phenotype.', 'Explain why drift matters more in small populations.'],
          transfer: 'When given a phenotype frequency, find q from the recessive phenotype first, derive p, then compute the genotype frequencies and compare them with what is observed.',
        },
        check: {
          prompt: 'In a large, randomly mating population, 9 percent of individuals are homozygous recessive for a trait. Assuming Hardy-Weinberg conditions, what fraction is expected to be heterozygous?',
          choices: ['0.09', '0.21', '0.42', '0.70'],
          answerIndex: 2,
          rationale: 'q squared is 0.09, so q is 0.3 and p is 0.7; the heterozygote frequency 2pq is 2 times 0.7 times 0.3, which is 0.42.',
        },
      },
      {
        heading: 'Evidence, phylogeny, speciation, and the origin of life',
        topics: ['7.6', '7.7', '7.8', '7.9', '7.10', '7.11', '7.12'],
        content: 'Evidence for evolution comes from fossils, comparative anatomy including homologous and vestigial structures, embryology, biogeography, and molecular comparisons of DNA and proteins. Shared features that reflect common ancestry are used to build phylogenetic trees, in which nodes represent common ancestors and branch lengths may represent time or amount of change. Speciation occurs when populations become reproductively isolated, either by geographic separation or by barriers that arise within a shared range, and it can be gradual or punctuated. Populations remain variable because mutation and recombination keep generating differences, and variation is what lets them respond to changing environments. Hypotheses for the origin of life propose that simple organic molecules formed and assembled into self-replicating systems, possibly RNA, before the first cells.',
        keyTerms: ['homologous structure', 'phylogenetic tree', 'reproductive isolation', 'allopatric speciation', 'RNA world'],
        rich: {
          examples: ['The forelimbs of a bat, a whale, and a human share the same bones arranged differently, which reflects common descent.', 'Two frog populations separated by a river accumulate differences until their mating calls no longer attract each other.'],
          nonExamples: ['Similar function does not prove common ancestry; wings of insects and birds are analogous, not homologous.', 'Being placed on the same tree does not mean one living species descended from another living species; both descend from a shared ancestor at the node.'],
          misconception: 'Phylogenetic trees show relationships, not a ladder of progress; a species near the top of a printed tree is not more advanced than one drawn lower.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Two species share 98 percent of a protein sequence while a third shares 85 percent.', 'The first two share a more recent common ancestor.', 'The absolute time since divergence without a calibrated rate.'], ['Laboratory conditions modeled on early Earth produce amino acids from simple gases.', 'Organic building blocks can form without living organisms.', 'That this is exactly how life on Earth began.']],
          retrieval: ['Name four lines of evidence for evolution.', 'Explain what a node on a phylogenetic tree represents.', 'Describe one prezygotic and one postzygotic barrier to reproduction.'],
          transfer: 'For a phylogeny question, find the most recent shared node for the taxa named before deciding which are more closely related; for a speciation question, identify the barrier before naming the mode.',
        },
        check: {
          prompt: 'On a phylogenetic tree, species A and B share a node that is more recent than the node A shares with species C. This indicates that',
          choices: ['A and B share a more recent common ancestor than A and C', 'B evolved from A', 'C is more advanced than A and B', 'A and C cannot interbreed'],
          answerIndex: 0,
          rationale: 'A more recent shared node means a more recent common ancestor; trees show relatedness, not ancestry between living species or any ranking.',
        },
      },
    ],
  },
  // Unit 8: Ecology
  {
    unit: 8,
    section1Topics: ['8.1', '8.2'],
    sections: [
      {
        heading: 'Population and community ecology',
        topics: ['8.3', '8.4', '8.5'],
        content: 'A population grows exponentially when resources are unlimited, but in real environments growth slows as it approaches the carrying capacity, producing a logistic curve. Density-dependent factors such as competition, predation, and disease act more strongly as a population becomes crowded; density-independent factors such as storms and temperature act regardless of size. Communities are shaped by interactions: competition for shared resources, predation and herbivory, and symbioses including mutualism, commensalism, and parasitism. Species with the same niche cannot coexist indefinitely, so competing species tend to partition resources. Keystone species have effects on community structure far larger than their abundance suggests, and removing one can reorganize the whole community.',
        keyTerms: ['carrying capacity', 'logistic growth', 'density-dependent factor', 'niche', 'keystone species'],
        rich: {
          examples: ['A deer population that outgrows its food supply shows lower birth rates and higher death rates until it falls back toward carrying capacity.', 'Removing sea stars from a rocky shore lets mussels crowd out most other species.'],
          nonExamples: ['A population reaching carrying capacity does not stop changing; it fluctuates around that level as conditions vary.', 'Two species eating the same food are not necessarily competing strongly if they feed at different times or places.'],
          misconception: 'Carrying capacity is not a fixed property of a species; it depends on the environment and can rise or fall as resources change.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Growth rate of a bacterial culture slows as the culture becomes dense.', 'A density-dependent limit such as nutrient depletion or waste buildup is acting.', 'Which specific factor is responsible.'], ['Two warbler species feed in different parts of the same tree.', 'Resource partitioning reduces competition between them.', 'That the species never competed in the past.']],
          retrieval: ['Sketch exponential and logistic growth curves and label carrying capacity.', 'Give one density-dependent and one density-independent limiting factor.', 'Explain what makes a species a keystone species.'],
          transfer: 'For a population question, decide whether the limiting factor depends on density, then predict whether the effect strengthens as numbers rise; for a community question, name the interaction before predicting the outcome.',
        },
        check: {
          prompt: 'A population of rabbits in a meadow declines sharply after an unusually severe late-spring freeze kills much of the vegetation regardless of how many rabbits were present. The freeze is best classified as',
          choices: ['a density-dependent factor', 'a density-independent factor', 'a keystone effect', 'a carrying-capacity increase'],
          answerIndex: 1,
          rationale: 'The freeze acts on the population regardless of its size, which is the definition of a density-independent factor.',
        },
      },
      {
        heading: 'Biodiversity and ecosystem disruption',
        topics: ['8.6', '8.7'],
        content: 'Biodiversity includes the number of species in a community, their relative abundance, and the genetic variation within them. Communities with higher diversity tend to recover more readily from disturbance because different species respond differently and some can fill roles others lose. Ecosystems are disrupted by natural events and by human activity, including habitat loss, invasive species, overharvesting, pollution, and climate change. Invasive species often spread because they arrive without the predators and competitors that limited them at home. After a disturbance, succession gradually rebuilds a community, beginning with pioneer species on bare substrate or with surviving soil and seeds after a less severe event. Changes in one part of an ecosystem propagate through food webs and nutrient cycles to others.',
        keyTerms: ['species richness', 'resilience', 'invasive species', 'succession', 'habitat fragmentation'],
        rich: {
          examples: ['A plot with many plant species keeps more of its biomass through a drought than a plot with one species.', 'Kudzu spreads across the southeastern United States because few local organisms eat it.'],
          nonExamples: ['A large number of individuals is not the same as high biodiversity; a field of one crop species has low diversity however dense it is.', 'A non-native species is not automatically invasive; the label applies when it spreads and causes harm.'],
          misconception: 'Ecosystem recovery after a disturbance is not a return to an identical earlier state; succession produces a community that may differ in composition from the one that was lost.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Species-rich grassland plots lost less productivity during a drought than species-poor plots.', 'Diversity contributes to resilience.', 'That any particular species is responsible for the effect.'], ['An introduced fish species increases while several native fish decline.', 'The introduced species is likely competing with or preying on the natives.', 'Which mechanism is acting without further study.']],
          retrieval: ['Name three components of biodiversity.', 'Explain why an invasive species can spread rapidly in a new range.', 'Distinguish primary from secondary succession.'],
          transfer: 'For a disruption question, trace the change through at least one trophic link or nutrient pathway before predicting the wider effect, and check whether diversity would buffer it.',
        },
        check: {
          prompt: 'After a volcanic eruption covers an island in fresh lava, the first organisms to establish are lichens and mosses. This process is best described as',
          choices: ['secondary succession, because soil was already present', 'a keystone species effect', 'primary succession, beginning on bare substrate without soil', 'an invasive-species outbreak'],
          answerIndex: 2,
          rationale: 'Colonization of bare rock with no existing soil is primary succession, and lichens and mosses are typical pioneers.',
        },
      },
    ],
  },
]);

module.exports = { AP_BIOLOGY_UNIT_SECTIONS };
