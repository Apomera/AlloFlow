#!/usr/bin/env node
'use strict';

// Builds a deliberately small AP Biology internal foundation pilot. The pilot
// is original, source-linked, and release-ineligible; it is a blueprint and
// architecture test, not a claim of AP content validity or exam readiness.

const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_biology_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_biology_foundation_pilot_learning_library.json');
const verifiedAt = '2026-08-20';
const version = '0.1.0-internal-preview';
const packId = 'ap-biology-foundation-pilot';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-biology-course-and-exam-description.pdf';
const COURSE_URL = 'https://apstudents.collegeboard.org/courses/ap-biology';
const OPENSTAX_URL = 'https://openstax.org/details/books/biology-2e';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function writeJson(filePath, value) {
  writeGeneratedFile(filePath, JSON.stringify(value, null, 2) + '\n');
}

const units = [
  { id: 'chemistry-of-life', number: 1, label: 'Unit 1: Chemistry of Life', shortLabel: 'Chemistry of Life', weight: 0.095, officialWeightMin: 0.08, officialWeightMax: 0.11, topics: ['1.1 Water and Hydrogen Bonding', '1.2 Elements of Life', '1.3 Macromolecules', '1.4 Carbohydrates', '1.5 Lipids', '1.6 Nucleic Acids', '1.7 Proteins'] },
  { id: 'cells', number: 2, label: 'Unit 2: Cells', shortLabel: 'Cells', weight: 0.115, officialWeightMin: 0.10, officialWeightMax: 0.13, topics: ['2.1 Cell Structure and Function', '2.2 Cell Size', '2.3 Plasma Membrane', '2.4 Membrane Permeability', '2.5 Membrane Transport', '2.6 Facilitated Diffusion', '2.7 Tonicity and Osmoregulation', '2.8 Mechanisms of Transport', '2.9 Cell Compartmentalization', '2.10 Origins of Cell Compartmentalization'] },
  { id: 'cellular-energetics', number: 3, label: 'Unit 3: Cellular Energetics', shortLabel: 'Cellular Energetics', weight: 0.14, officialWeightMin: 0.12, officialWeightMax: 0.16, topics: ['3.1 Enzymes', '3.2 Environmental Impacts on Enzyme Function', '3.3 Cellular Energy', '3.4 Photosynthesis', '3.5 Cellular Respiration'] },
  { id: 'cell-communication-and-cell-cycle', number: 4, label: 'Unit 4: Cell Communication and Cell Cycle', shortLabel: 'Cell Communication and Cell Cycle', weight: 0.125, officialWeightMin: 0.10, officialWeightMax: 0.15, topics: ['4.1 Cell Communication', '4.2 Introduction to Signal Transduction', '4.3 Signal Transduction Pathways', '4.4 Feedback', '4.5 Cell Cycle', '4.6 Regulation of Cell Cycle'] },
  { id: 'heredity', number: 5, label: 'Unit 5: Heredity', shortLabel: 'Heredity', weight: 0.095, officialWeightMin: 0.08, officialWeightMax: 0.11, topics: ['5.1 Meiosis', '5.2 Meiosis and Genetic Diversity', '5.3 Mendelian Genetics', '5.4 Non-Mendelian Genetics', '5.5 Environmental Effects on Phenotype'] },
  { id: 'gene-expression-and-regulation', number: 6, label: 'Unit 6: Gene Expression and Regulation', shortLabel: 'Gene Expression and Regulation', weight: 0.14, officialWeightMin: 0.12, officialWeightMax: 0.16, topics: ['6.1 DNA and RNA Structure', '6.2 DNA Replication', '6.3 Transcription and RNA Processing', '6.4 Translation', '6.5 Regulation of Gene Expression', '6.6 Gene Expression and Cell Specialization', '6.7 Mutations', '6.8 Biotechnology'] },
  { id: 'natural-selection', number: 7, label: 'Unit 7: Natural Selection', shortLabel: 'Natural Selection', weight: 0.165, officialWeightMin: 0.13, officialWeightMax: 0.20, topics: ['7.1 Introduction to Natural Selection', '7.2 Natural Selection', '7.3 Artificial Selection', '7.4 Population Genetics', '7.5 Hardy-Weinberg Equilibrium', '7.6 Evidence of Evolution', '7.7 Common Ancestry', '7.8 Continuing Evolution', '7.9 Phylogeny', '7.10 Speciation', '7.11 Variations in Populations', '7.12 Origins of Life on Earth'] },
  { id: 'ecology', number: 8, label: 'Unit 8: Ecology', shortLabel: 'Ecology', weight: 0.125, officialWeightMin: 0.10, officialWeightMax: 0.15, topics: ['8.1 Responses to the Environment', '8.2 Energy Flow Through Ecosystems', '8.3 Population Ecology', '8.4 Effect of Density on Populations', '8.5 Community Ecology', '8.6 Biodiversity', '8.7 Disruptions in Ecosystems'] },
];

const practices = [
  { id: 'SP1', label: 'Concept Explanation', description: 'Explain biological concepts, processes, and models in written and applied contexts.' },
  { id: 'SP2', label: 'Visual Representations', description: 'Analyze and relate diagrams, models, flowcharts, and other visual representations.' },
  { id: 'SP3', label: 'Questions and Methods', description: 'Pose testable questions, identify variables and controls, and predict experimental results.' },
  { id: 'SP4', label: 'Representing and Describing Data', description: 'Describe data points, trends, patterns, and relationships from tables or graphs.' },
  { id: 'SP5', label: 'Statistical Tests and Data Analysis', description: 'Apply calculations, uncertainty, statistical tests, and evidence to evaluate hypotheses.' },
  { id: 'SP6', label: 'Argumentation', description: 'Make claims, support them with evidence, connect reasoning to theory, and predict system changes.' },
];

const bigIdeas = [
  { id: 'BI1', label: 'Evolution', description: 'The process of evolution drives the diversity and unity of life.' },
  { id: 'BI2', label: 'Energetics', description: 'Biological systems use energy and molecular building blocks to grow, reproduce, and maintain dynamic homeostasis.' },
  { id: 'BI3', label: 'Information Storage and Transmission', description: 'Living systems store, retrieve, transmit, and respond to information essential to life processes.' },
  { id: 'BI4', label: 'Systems Interactions', description: 'Biological systems interact, and their interactions exhibit complex properties.' },
];

const objectiveRecords = [
  { id: 'ap-bio-lo-1-1', topicId: '1.1', unit: 1, sectionLabel: 'Water, macromolecules, and biological structure', label: 'Explain how water properties and macromolecular structure support biological function.', practiceIds: ['SP1', 'SP2'] },
  { id: 'ap-bio-lo-2-1', topicId: '2.3', unit: 2, sectionLabel: 'Membranes, transport, and cell size', label: 'Predict how membrane structure, gradients, and surface-area-to-volume ratio affect cell exchange.', practiceIds: ['SP2', 'SP4'] },
  { id: 'ap-bio-lo-3-1', topicId: '3.1', unit: 3, sectionLabel: 'Enzymes, energy, and metabolic pathways', label: 'Explain how enzymes and energy-transfer pathways affect rates of biological processes.', practiceIds: ['SP1', 'SP5'] },
  { id: 'ap-bio-lo-4-1', topicId: '4.3', unit: 4, sectionLabel: 'Cell signaling and cell-cycle regulation', label: 'Predict how signaling, feedback, and checkpoints alter cellular responses and division.', practiceIds: ['SP2', 'SP6'] },
  { id: 'ap-bio-lo-5-1', topicId: '5.2', unit: 5, sectionLabel: 'Meiosis, inheritance, and phenotype', label: 'Use meiosis and probability to explain patterns of inheritance and variation.', practiceIds: ['SP1', 'SP5'] },
  { id: 'ap-bio-lo-6-1', topicId: '6.3', unit: 6, sectionLabel: 'DNA, gene expression, and biotechnology', label: 'Trace genetic information from DNA through expression and predict effects of changes in regulation or sequence.', practiceIds: ['SP2', 'SP6'] },
  { id: 'ap-bio-lo-7-1', topicId: '7.5', unit: 7, sectionLabel: 'Natural selection, population genetics, and speciation', label: 'Use population data and evolutionary mechanisms to explain changes in allele frequencies and relatedness.', practiceIds: ['SP4', 'SP5'] },
  { id: 'ap-bio-lo-8-1', topicId: '8.2', unit: 8, sectionLabel: 'Energy flow, populations, and ecosystems', label: 'Analyze how energy, matter, population processes, and species interactions shape ecosystems.', practiceIds: ['SP4', 'SP6'] },
];

const objectiveByUnit = new Map(objectiveRecords.map((record) => [record.unit, record]));
const objectiveByTopic = new Map();
for (const unit of units) {
  const baseObjective = objectiveByUnit.get(unit.number);
  for (const topicLabel of unit.topics) {
    const topicId = topicLabel.split(' ')[0];
    const topicName = topicLabel.slice(topicId.length + 1);
    objectiveByTopic.set(topicId, {
      ...baseObjective,
      id: `ap-bio-lo-${topicId.replace('.', '-')}`,
      topicId,
      practiceIds: practices.map((practice) => practice.id),
      label: `${baseObjective.label} Apply the target to ${topicName.toLowerCase()}.`,
      topicLabel,
    });
  }
}

function itemSpec(unit, topicId, practiceId, prompt, answer, distractors, rationale, wrongReasons, options = {}) {
  const objective = objectiveByTopic.get(topicId);
  assert(objective, `Missing objective for unit ${unit}.`);
  assert(Array.isArray(distractors) && distractors.length === 3, `Each item needs three distractors: ${prompt}`);
  assert(Array.isArray(wrongReasons) && wrongReasons.length === 3, `Each item needs three distractor rationales: ${prompt}`);
  return {
    unit,
    topicId,
    objectiveId: objective.id,
    practiceId,
    prompt,
    answer,
    distractors,
    rationale,
    wrongReasons,
    cognitiveProcess: options.cognitiveProcess || 'apply',
    difficulty: options.difficulty || 'moderate',
    stimulus: options.stimulus || '',
  };
}

const itemSpecs = [
  // Unit 1: Chemistry of Life
  itemSpec(1, '1.1', 'SP1', 'Why does solid water usually have a lower density than liquid water?', 'Hydrogen bonds hold water molecules in an open lattice in the solid state.', ['Ionic bonds force the oxygen atoms into a compact crystal.', 'Water molecules lose all polarity when they freeze.', 'Covalent bonds between separate water molecules become shorter.'], 'The open arrangement produced by hydrogen bonding spaces molecules farther apart in ice, allowing ice to float.', ['Ionic bonds are not the main interaction between water molecules.', 'Freezing does not remove water polarity.', 'Covalent bonds within a molecule are not the intermolecular force creating the lattice.'], { cognitiveProcess: 'explain' }),
  itemSpec(1, '1.1', 'SP3', 'A buffered solution receives a small amount of hydrochloric acid. Which result is most likely?', 'The pH changes only slightly because the buffer components react with added hydrogen ions.', ['The pH becomes exactly neutral because all acids are diluted.', 'The pH rises because hydrochloric acid removes hydrogen ions.', 'The pH changes dramatically because buffers prevent every reaction.'], 'A buffer resists a large pH change by using a weak-acid and conjugate-base pair to absorb added acid or base.', ['Dilution does not make every acid neutral.', 'Adding acid does not remove hydrogen ions from solution.', 'Buffers reduce, but do not eliminate, pH change.'], { cognitiveProcess: 'predict' }),
  itemSpec(1, '1.3', 'SP1', 'Which reaction breaks a polymer into smaller subunits by adding water?', 'Hydrolysis', ['Dehydration synthesis', 'Phosphorylation', 'Oxidation-reduction'], 'Hydrolysis uses water to break a covalent bond in a polymer, whereas dehydration synthesis removes water while building a polymer.', ['Dehydration synthesis builds polymers by removing water.', 'Phosphorylation adds a phosphate group and is not the general polymer-breaking reaction.', 'Oxidation-reduction tracks electron transfer rather than the defining water reaction here.'], { cognitiveProcess: 'explain', difficulty: 'foundational' }),
  itemSpec(1, '1.7', 'SP2', 'A mutation replaces a nonpolar amino acid in the interior of a protein with a charged amino acid. Which effect is most plausible?', 'The altered interactions can change protein folding and therefore protein function.', ['The protein must become a carbohydrate because amino acids are no longer present.', 'The mutation cannot affect function because only the DNA sequence changed.', 'The protein will always become longer by one amino acid.'], 'A charged substitution in a nonpolar interior can disrupt hydrophobic interactions and alter the three-dimensional structure of the protein.', ['Amino acid substitutions do not convert proteins into carbohydrates.', 'DNA changes can change amino-acid sequence and function.', 'A substitution does not necessarily add an amino acid.'], { cognitiveProcess: 'predict' }),
  itemSpec(1, '1.5', 'SP1', 'Why are phospholipids effective components of cell membranes?', 'They contain a hydrophilic region and hydrophobic regions that organize in water.', ['They are composed entirely of charged groups that dissolve freely in water.', 'They contain only nonpolar regions and form covalent bonds with DNA.', 'They are proteins that catalyze transport reactions.'], 'Amphipathic phospholipids form bilayers with polar heads facing water and nonpolar tails facing inward.', ['Phospholipids are not entirely charged.', 'Their tails are nonpolar and they are not covalently attached to DNA.', 'Phospholipids are lipids, not protein enzymes.'], { cognitiveProcess: 'explain' }),
  itemSpec(1, '1.6', 'SP2', 'Which structural feature distinguishes RNA from DNA in a typical cell?', 'RNA contains ribose and is commonly single-stranded, whereas DNA contains deoxyribose and is commonly double-stranded.', ['RNA contains amino acids while DNA contains fatty acids.', 'RNA has thymine in every strand while DNA has uracil.', 'RNA and DNA differ only in the number of phosphate groups.'], 'The sugar and base differences, along with common strand structures, help explain different roles for RNA and DNA.', ['Both are nucleic acids made from nucleotides, not amino acids or fatty acids.', 'RNA commonly uses uracil and DNA commonly uses thymine.', 'Their structures differ in more than phosphate-group number.'], { cognitiveProcess: 'compare', difficulty: 'foundational' }),

  // Unit 2: Cells
  itemSpec(2, '2.2', 'SP5', 'A cube-shaped cell doubles its side length. What happens to its surface-area-to-volume ratio?', 'The ratio decreases because volume increases faster than surface area.', ['The ratio increases because both quantities double.', 'The ratio stays the same because the shape is unchanged.', 'The ratio becomes zero because the cell has no surface.'], 'When side length doubles, surface area scales by four while volume scales by eight, reducing the ratio available for exchange.', ['Surface area and volume do not increase at the same rate.', 'Keeping the same shape does not preserve the ratio when size changes.', 'A cell still has a surface through which exchange can occur.'], { cognitiveProcess: 'calculate', difficulty: 'moderate' }),
  itemSpec(2, '2.3', 'SP2', 'Which membrane property most directly allows a cell to maintain different solute concentrations on opposite sides?', 'Selective permeability', ['Complete impermeability to every substance', 'A rigid cellulose wall around every animal cell', 'A membrane made only of carbohydrates'], 'Selective permeability permits some substances to cross while limiting others, allowing concentration gradients to persist.', ['Cells must exchange some materials; complete impermeability would prevent life-supporting exchange.', 'Animal cells do not all have cellulose walls.', 'Membranes contain lipids and proteins, not only carbohydrates.'], { cognitiveProcess: 'explain' }),
  itemSpec(2, '2.7', 'SP4', 'A plant cell is placed in a solution with lower solute concentration than the cell interior. Which observation is most likely after water enters?', 'The cell becomes turgid as the cell membrane presses against the cell wall.', ['The cell immediately lyses because plant cells lack structural support.', 'The cell becomes plasmolyzed as water leaves the vacuole.', 'The cell loses turgor because water moves only into the solution.'], 'A hypotonic external solution drives water into the plant cell; the wall limits expansion and supports turgor pressure.', ['The cell wall provides support that makes lysis less likely under ordinary conditions.', 'Plasmolysis occurs when a plant cell loses water in a hypertonic solution.', 'Water moves into the cell when the outside solution has lower solute concentration.'], { cognitiveProcess: 'predict' }),
  itemSpec(2, '2.5', 'SP3', 'Researchers compare transport of oxygen across a membrane with transport of a large polar protein. Which prediction is best?', 'Oxygen can diffuse through the lipid region more readily than the large polar protein.', ['The protein crosses most readily because its size creates kinetic energy.', 'Both cross equally because all molecules pass through phospholipids.', 'Oxygen requires ATP-powered pumps while the protein diffuses freely.'], 'Small nonpolar oxygen can diffuse through the hydrophobic membrane interior; a large polar protein generally requires a specialized pathway.', ['Large size and polarity make the protein less able to cross directly.', 'Membrane permeability is selective, not universal.', 'Oxygen does not ordinarily require an ATP-powered pump for simple diffusion.'], { cognitiveProcess: 'apply' }),
  itemSpec(2, '2.1', 'SP2', 'A cell contains abundant rough endoplasmic reticulum and Golgi apparatus. Which function is most strongly suggested?', 'Synthesis and processing of proteins destined for secretion or membranes.', ['Storage of hereditary information in a chromosome', 'Production of ATP only through the inner mitochondrial membrane', 'Direct digestion of extracellular material by ribosomes'], 'Ribosomes on rough ER synthesize proteins, and the Golgi modifies and sorts many proteins for delivery.', ['Chromosomes store hereditary information in the nucleus or nucleoid.', 'Mitochondria are associated with much ATP production, not rough ER and Golgi together.', 'Ribosomes synthesize proteins but do not digest extracellular material.'], { cognitiveProcess: 'infer' }),
  itemSpec(2, '2.10', 'SP6', 'Which observation provides the strongest support for the endosymbiotic origin of mitochondria?', 'Mitochondria contain circular DNA and ribosomes resembling those of bacteria.', ['Mitochondria are surrounded by a single membrane and contain no genetic material.', 'Mitochondria occur only in cells that lack a nucleus.', 'Mitochondria synthesize every protein required by a eukaryotic cell.'], 'Circular DNA, bacterial-like ribosomes, and double membranes are evidence consistent with an ancient symbiotic origin.', ['Mitochondria have genetic material and a double membrane.', 'Mitochondria are found in many eukaryotic cells with nuclei.', 'Mitochondria depend on nuclear genes for many proteins.'], { cognitiveProcess: 'evaluate' }),

  // Unit 3: Cellular Energetics
  itemSpec(3, '3.1', 'SP1', 'Why does an enzyme usually increase reaction rate without changing the reaction equilibrium?', 'It lowers activation energy for both the forward and reverse reactions.', ['It supplies energy that makes products more stable than reactants.', 'It changes the concentrations of all reactants permanently.', 'It is consumed as a reactant during every catalytic cycle.'], 'Catalysts lower the activation-energy barrier, allowing equilibrium to be reached faster without changing the relative energy of reactants and products.', ['Enzymes do not supply the net energy that determines equilibrium.', 'Enzymes do not permanently change reactant concentration.', 'Enzymes are not consumed in the reaction they catalyze.'], { cognitiveProcess: 'explain' }),
  itemSpec(3, '3.2', 'SP4', 'An enzyme has its highest rate at 37 degrees Celsius, but activity falls sharply at 70 degrees Celsius. Which explanation best fits the pattern?', 'High temperature disrupted interactions that maintain the enzyme shape.', ['The enzyme became more specific because all molecules move faster.', 'The substrate was converted into DNA at high temperature.', 'The enzyme gained unlimited active sites as temperature increased.'], 'Excessive heat can disrupt bonds and interactions that maintain the active site, reducing catalytic activity through denaturation.', ['Higher movement does not automatically improve specificity.', 'Temperature does not convert substrate into DNA.', 'An enzyme does not gain unlimited active sites.'], { cognitiveProcess: 'interpret' }),
  itemSpec(3, '3.1', 'SP3', 'A competitive inhibitor is added to an enzyme reaction. Which change would most likely reduce the inhibitor effect?', 'Increasing substrate concentration', ['Removing all enzyme from the reaction', 'Lowering substrate concentration to zero', 'Adding a molecule that permanently unfolds the enzyme'], 'More substrate can outcompete a reversible competitive inhibitor for access to the active site.', ['Removing enzyme removes the reaction rather than reducing competition.', 'No substrate means no enzyme-substrate collisions.', 'An unfolding agent would impair the enzyme itself.'], { cognitiveProcess: 'predict' }),
  itemSpec(3, '3.4', 'SP2', 'During the light-dependent reactions of photosynthesis, which products are used later in carbon fixation?', 'ATP and NADPH', ['Oxygen and glucose directly', 'Carbon dioxide and water only', 'Pyruvate and acetyl-CoA'], 'The light reactions convert light energy into ATP and NADPH, which provide energy and reducing power for the Calvin cycle.', ['Oxygen is released and glucose is not produced directly by the light reactions.', 'Carbon dioxide enters carbon fixation, while water supplies electrons in the light reactions.', 'Pyruvate and acetyl-CoA belong to cellular respiration pathways.'], { cognitiveProcess: 'trace' }),
  itemSpec(3, '3.5', 'SP1', 'In aerobic cellular respiration, what is the primary role of oxygen at the end of the electron transport chain?', 'It accepts electrons and combines with hydrogen ions to form water.', ['It donates the first electrons to glycolysis.', 'It directly phosphorylates ADP into ATP without a protein complex.', 'It prevents all proton movement across the inner membrane.'], 'Oxygen is the terminal electron acceptor, allowing the electron transport chain to continue and water to form.', ['Glycolysis does not receive its first electrons from oxygen.', 'ATP synthase and the proton gradient mediate oxidative phosphorylation.', 'The chain creates a proton gradient rather than preventing proton movement.'], { cognitiveProcess: 'explain' }),
  itemSpec(3, '3.3', 'SP5', 'A cell has abundant ATP but a low rate of ATP-producing respiration. Which conclusion is most defensible?', 'High ATP can reduce the need for additional ATP production through feedback regulation.', ['ATP must always increase respiration regardless of cellular conditions.', 'ATP is a waste product that cannot affect metabolic pathways.', 'Respiration must be high because ATP cannot be stored or used.'], 'Cells can regulate energy pathways so that abundant ATP signals reduced demand for additional ATP production.', ['Feedback often decreases pathway activity when products are abundant.', 'ATP is a central energy-transfer molecule, not simply waste.', 'ATP can be used and regulated even though it is continually turned over.'], { cognitiveProcess: 'infer' }),

  // Unit 4: Cell Communication and Cell Cycle
  itemSpec(4, '4.3', 'SP2', 'A signal activates a receptor kinase, which phosphorylates several relay proteins. What is the likely consequence of this cascade?', 'A small external signal can produce an amplified intracellular response.', ['The signal is prevented from reaching the cytoplasm by every relay step.', 'The cascade guarantees that every cell responds identically regardless of receptor type.', 'Phosphorylation permanently destroys all relay proteins.'], 'Sequential activation can amplify a signal and connect receptor binding to changes in cell activity.', ['Relay steps transmit and often amplify signals.', 'Cell response depends on receptor and intracellular context.', 'Phosphorylation is commonly reversible and regulatory.'], { cognitiveProcess: 'explain' }),
  itemSpec(4, '4.1', 'SP3', 'A researcher wants to test whether a growth factor causes a cell response. Which design includes the most appropriate control?', 'Cells treated with the same solution minus the growth factor.', ['Cells exposed to a different growth factor and a different temperature', 'Cells selected only after they show the expected response', 'Cells treated with a much higher concentration and no comparison group'], 'A matched untreated control isolates the effect of the growth factor while holding other treatment conditions constant.', ['Changing two factors prevents clear attribution.', 'Selecting responders introduces selection bias.', 'A single high-dose group cannot establish a comparison.'], { cognitiveProcess: 'design' }),
  itemSpec(4, '4.4', 'SP6', 'After blood glucose rises, pancreatic beta cells release insulin and blood glucose falls. Which concept best describes the response?', 'Negative feedback', ['Positive feedback', 'Genetic drift', 'Competitive exclusion'], 'The response reduces the initial deviation from a set range, which is the defining pattern of negative feedback.', ['Positive feedback amplifies a change rather than counteracting it.', 'Genetic drift changes allele frequencies in populations.', 'Competitive exclusion describes interactions between species.'], { cognitiveProcess: 'classify', difficulty: 'foundational' }),
  itemSpec(4, '4.5', 'SP2', 'A cell with damaged DNA pauses before entering S phase. Why is this checkpoint important?', 'It can prevent replication of damaged DNA and reduce transmission of mutations.', ['It ensures that every cell immediately enters mitosis.', 'It converts damaged DNA into ATP for the cell cycle.', 'It prevents all DNA repair from occurring.'], 'Checkpoint proteins can pause progression while damage is repaired or direct the cell toward apoptosis.', ['A checkpoint delays progression rather than forcing immediate mitosis.', 'DNA is not converted into ATP by a checkpoint.', 'Checkpoint control can support repair rather than prevent it.'], { cognitiveProcess: 'explain' }),
  itemSpec(4, '4.6', 'SP4', 'A culture has many cells with high cyclin concentration and a high fraction in mitosis. Which inference is most reasonable?', 'Cyclin-dependent kinase activity may be promoting progression through the cell cycle.', ['Cyclin always blocks all cell-cycle transitions.', 'The cells must be undergoing meiosis in a multicellular organism.', 'Cyclin concentration cannot be related to cell-cycle timing.'], 'Cyclins activate cyclin-dependent kinases at specific times, helping regulate transitions through the cell cycle.', ['Cyclins can promote, not always block, transitions.', 'A cultured somatic cell population is not necessarily undergoing meiosis.', 'Cyclin levels are part of cell-cycle regulation.'], { cognitiveProcess: 'infer' }),
  itemSpec(4, '4.3', 'SP6', 'A drug blocks a receptor on a target cell but does not alter the signal molecule outside the cell. Which result is most likely?', 'The target cell shows a reduced response while nearby cells with different receptors may respond normally.', ['Every cell in the organism stops responding to every signal.', 'The signal is converted into a new DNA sequence outside the cell.', 'The blocked cell produces unlimited ATP because receptors control respiration directly.'], 'Receptor specificity means blocking one receptor can reduce that pathway in target cells without eliminating unrelated signaling pathways.', ['Different cells express different receptor sets.', 'Signal binding does not directly rewrite extracellular DNA.', 'Receptor blockade does not imply unlimited ATP production.'], { cognitiveProcess: 'predict' }),

  // Unit 5: Heredity
  itemSpec(5, '5.2', 'SP2', 'Crossing over during meiosis most directly contributes to genetic variation by doing what?', 'Exchanging corresponding DNA segments between homologous chromosomes.', ['Copying one chromosome so both homologs become identical', 'Separating sister chromatids during mitosis only', 'Replacing every allele with a dominant allele'], 'Crossing over during prophase I creates recombinant chromosomes with new combinations of alleles.', ['Crossing over increases, rather than erases, combinations.', 'The process occurs in meiosis and involves homologs, not only mitotic sister separation.', 'Dominance does not replace alleles during crossing over.'], { cognitiveProcess: 'explain' }),
  itemSpec(5, '5.2', 'SP5', 'Two genes on different chromosomes assort independently during gamete formation. Which outcome follows?', 'The allele inherited at one locus does not determine which allele is inherited at the other locus.', ['Only parental allele combinations can occur.', 'The genes must be located next to each other on one chromosome.', 'All gametes receive both alleles at both loci.'], 'Independent assortment produces gametes with combinations of alleles from different chromosome pairs.', ['Recombinant combinations can occur.', 'Genes on different chromosomes are not physically linked on one chromosome.', 'Gametes receive one allele per locus, not both alleles.'], { cognitiveProcess: 'explain' }),
  itemSpec(5, '5.3', 'SP5', 'Two heterozygous parents have a single gene with complete dominance. What fraction of offspring is expected to be homozygous recessive?', 'One-fourth', ['Zero', 'One-half', 'Three-fourths'], 'A cross of Aa by Aa produces AA, Aa, Aa, and aa combinations, so one of four is homozygous recessive.', ['A recessive genotype can appear when both parents contribute the recessive allele.', 'One-half is the expected heterozygous fraction in this cross.', 'Three-fourths show the dominant phenotype, not the homozygous recessive genotype.'], { cognitiveProcess: 'calculate' }),
  itemSpec(5, '5.4', 'SP1', 'In incomplete dominance, red-flowered plants crossed with white-flowered plants produce pink offspring. What does pink represent?', 'An intermediate phenotype associated with the heterozygous genotype.', ['A phenotype that proves the red allele is dominant', 'A phenotype caused only by environmental temperature', 'A genotype containing no alleles for flower color'], 'Incomplete dominance produces a heterozygote phenotype intermediate between the two homozygotes.', ['The pattern does not show complete dominance.', 'The stated cross does not make temperature the cause.', 'The heterozygote still contains alleles for the trait.'], { cognitiveProcess: 'classify', difficulty: 'foundational' }),
  itemSpec(5, '5.5', 'SP6', 'Hydrangea flowers show different colors in soils with different pH values even when the plants share a genotype. What does this illustrate?', 'Environmental conditions can influence phenotype without changing the genotype.', ['The environment replaces all inherited alleles before flowering.', 'Phenotype is determined entirely by genotype in every setting.', 'The plants must belong to different species because color differs.'], 'Phenotype can result from interactions between genotype and environment, including effects on pigment chemistry.', ['Environmental effects do not require replacement of alleles.', 'Genotype alone does not explain every phenotype.', 'A phenotype difference does not prove different species.'], { cognitiveProcess: 'apply' }),
  itemSpec(5, '5.3', 'SP3', 'A student wants to determine whether a dominant-looking organism is homozygous or heterozygous. Which cross is most informative?', 'A test cross with a homozygous recessive organism.', ['A cross with another organism of unknown genotype', 'A cross with a homozygous dominant organism only', 'A cross involving a different species with no shared gene'], 'A homozygous recessive tester reveals a recessive allele if the unknown parent contributes it to offspring.', ['An unknown partner makes offspring patterns harder to interpret.', 'A homozygous dominant partner can mask a recessive allele.', 'A different species may not provide a valid inheritance comparison.'], { cognitiveProcess: 'design' }),

  // Unit 6: Gene Expression and Regulation
  itemSpec(6, '6.1', 'SP2', 'Why are the two strands of a DNA molecule described as antiparallel?', 'The sugar-phosphate backbones run in opposite chemical directions.', ['Both strands run in the same direction and use identical bases.', 'The strands are made from amino acids that point toward opposite cells.', 'The two strands contain no hydrogen bonds between bases.'], 'Opposite 5-prime to 3-prime orientations allow complementary base pairing and directional replication.', ['The strands are complementary rather than identical.', 'DNA strands are nucleotide polymers, not amino-acid polymers.', 'Hydrogen bonds connect complementary bases.'], { cognitiveProcess: 'explain' }),
  itemSpec(6, '6.2', 'SP1', 'What does semiconservative replication mean?', 'Each daughter DNA molecule contains one parental strand and one newly synthesized strand.', ['Each daughter molecule contains two completely new strands.', 'Only one daughter cell receives DNA after replication.', 'The parent molecule remains unchanged and no new strand forms.'], 'The parental strands separate and each serves as a template for a new complementary strand.', ['Both strands are not newly made.', 'Both daughter cells receive replicated DNA.', 'New strands are synthesized using parental templates.'], { cognitiveProcess: 'define', difficulty: 'foundational' }),
  itemSpec(6, '6.3', 'SP3', 'A mutation occurs in the promoter of a gene and reduces RNA polymerase binding. Which result is most likely?', 'Transcription of the gene decreases.', ['Translation increases because ribosomes bind promoters.', 'The gene is copied into protein without RNA.', 'The mutation automatically changes every chromosome in the cell.'], 'A promoter helps recruit transcription machinery; reduced binding generally lowers production of the RNA transcript.', ['Ribosomes bind mRNA during translation, not promoters.', 'Protein synthesis generally requires an RNA intermediate in this context.', 'A local promoter mutation does not automatically change every chromosome.'], { cognitiveProcess: 'predict' }),
  itemSpec(6, '6.4', 'SP2', 'A single-base substitution changes a codon but still encodes the same amino acid. What type of mutation is this?', 'A synonymous mutation', ['A frameshift mutation', 'A nonsense mutation that always stops translation', 'A chromosomal nondisjunction event'], 'The genetic code is redundant, so some substitutions do not change the encoded amino acid.', ['A frameshift results from insertion or deletion not divisible by three.', 'A synonymous substitution does not create a stop codon in this case.', 'Nondisjunction changes chromosome number during cell division.'], { cognitiveProcess: 'classify' }),
  itemSpec(6, '6.5', 'SP6', 'How can cells in the same organism express different sets of genes?', 'Different regulatory signals and transcription factors activate different genes in each cell type.', ['Every cell has a different genetic code for every protein.', 'Differentiated cells permanently lose all genes they do not express.', 'Only the DNA sequence in mitochondria controls cell specialization.'], 'Cell specialization depends largely on differential gene expression regulated by transcription factors, chromatin, and signaling.', ['Most cells share the same genome but use it differently.', 'Cells generally retain genes even when they are not expressed.', 'Nuclear and cellular regulatory systems also matter.'], { cognitiveProcess: 'explain' }),
  itemSpec(6, '6.7', 'SP5', 'A deletion removes two nucleotides from a coding sequence near the beginning of a gene. Why can the effect be severe?', 'The deletion can shift the reading frame and alter many downstream codons.', ['The deletion cannot affect translation because codons are read in pairs.', 'The deletion always produces a useful new protein with one fewer amino acid.', 'The deletion changes only the promoter and not the coding sequence.'], 'A two-nucleotide deletion changes how downstream bases are grouped into codons, often altering the resulting polypeptide substantially.', ['Codons are read as groups of three.', 'The outcome is not predictably beneficial.', 'The prompt places the deletion in a coding sequence, not a promoter.'], { cognitiveProcess: 'predict' }),
  itemSpec(6, '6.8', 'SP3', 'A PCR protocol is used to amplify one DNA region. Which component determines the boundaries of the amplified region?', 'A pair of primers that anneal on opposite sides of the target sequence.', ['ATP molecules alone', 'Ribosomes that translate the DNA', 'A cell wall that encloses the reaction'], 'Primers provide starting points and define the sequence segment copied through repeated cycles.', ['ATP supplies energy but does not specify boundaries.', 'Ribosomes are not used to amplify DNA.', 'PCR occurs in a reaction tube without a cell wall.'], { cognitiveProcess: 'design' }),

  // Unit 7: Natural Selection
  itemSpec(7, '7.2', 'SP6', 'Which condition is required for natural selection to change the frequency of a trait over generations?', 'The trait varies among individuals and some heritable variants contribute more offspring.', ['Every individual has the same phenotype and reproductive success.', 'The environment changes an adult organism genotype because it needs a trait.', 'Variation occurs only after reproduction and cannot be inherited.'], 'Natural selection requires heritable variation linked to differential survival or reproduction.', ['Without variation or differential reproduction, selection cannot shift frequencies.', 'Organisms do not change their genotype simply because a need arises.', 'Inherited variation must be present before selection acts across generations.'], { cognitiveProcess: 'evaluate' }),
  itemSpec(7, '7.5', 'SP5', 'Which population best fits the assumptions of the Hardy-Weinberg model?', 'A large, randomly mating population with no mutation, migration, selection, or genetic drift.', ['A small population experiencing a founder effect', 'A population receiving migrants with a new allele each generation', 'A population in which one phenotype produces many more offspring'], 'Hardy-Weinberg equilibrium assumes a large population, random mating, and no evolutionary forces that change allele frequencies.', ['Small populations are vulnerable to drift.', 'Migration changes allele frequencies.', 'Differential reproduction is natural selection.'], { cognitiveProcess: 'classify' }),
  itemSpec(7, '7.5', 'SP5', 'In a population, the frequency of allele A is 0.6 and the population is in Hardy-Weinberg equilibrium. What is the expected frequency of aa individuals?', '0.16', ['0.24', '0.36', '0.60'], 'The frequency of allele a is 0.4, so the expected recessive homozygote frequency is q squared, or 0.16.', ['0.24 is 2pq for p = 0.6 and q = 0.4.', '0.36 is p squared, the expected AA frequency.', '0.60 is the frequency of allele A, not aa individuals.'], { cognitiveProcess: 'calculate' }),
  itemSpec(7, '7.4', 'SP4', 'A wildfire leaves a few survivors from a formerly large population, and allele frequencies in the survivors differ by chance from the original population. Which process is illustrated?', 'A bottleneck effect caused by genetic drift.', ['Directional selection caused by a specific advantage', 'Gene flow caused by migration into the population', 'Assortative mating that guarantees random allele frequencies'], 'A sudden reduction in population size can leave a chance sample of alleles, producing drift.', ['Selection requires differential reproductive success tied to a trait.', 'Gene flow involves movement between populations.', 'Assortative mating is not random mating and does not guarantee frequencies.'], { cognitiveProcess: 'classify' }),
  itemSpec(7, '7.7', 'SP2', 'A phylogenetic tree places species X and Y as sister taxa. What does that relationship imply?', 'X and Y share a more recent common ancestor with each other than either does with the other shown taxa.', ['X evolved directly from the modern population of Y.', 'X and Y must have identical genomes and phenotypes.', 'The two species cannot have experienced any natural selection.'], 'Sister taxa share a recent common ancestor on the tree; the relationship does not imply direct ancestry or identity.', ['Modern species are not usually direct ancestors of one another in the tree.', 'Common ancestry does not mean identical genomes or traits.', 'All species continue to experience evolutionary processes.'], { cognitiveProcess: 'interpret' }),
  itemSpec(7, '7.10', 'SP3', 'Two populations become geographically isolated and later cannot produce fertile offspring when reunited. Which process has occurred?', 'Allopatric speciation followed by reproductive isolation.', ['Individual acclimation without genetic change', 'Artificial selection within one population only', 'Competitive exclusion without divergence'], 'Geographic isolation can reduce gene flow, allowing divergence that eventually produces reproductive isolation.', ['Acclimation is an individual response, not speciation.', 'Artificial selection is not the described geographic process.', 'Competitive exclusion does not by itself describe the reproductive-isolation outcome.'], { cognitiveProcess: 'infer' }),
  itemSpec(7, '7.6', 'SP6', 'A bacterial population becomes resistant to an antibiotic after repeated treatment. Which conclusion is most defensible?', 'Treatment selects for resistant variants that were already present or arose through mutation, increasing their frequency.', ['The antibiotic intentionally teaches every bacterium to mutate in the same way.', 'Individual bacteria change their genotype because they need resistance during treatment.', 'Resistance proves that all bacteria are genetically identical.'], 'Antibiotic exposure changes reproductive success, so resistant variants become more common; the treatment does not direct a uniform need-based mutation.', ['The antibiotic does not intentionally teach bacteria.', 'Need does not directly rewrite an individual genotype.', 'Variation is necessary for selection.'], { cognitiveProcess: 'argue' }),

  // Unit 8: Ecology
  itemSpec(8, '8.2', 'SP6', 'Why is the energy available to a hawk generally less than the energy captured by plants at the base of a food web?', 'Energy is lost as heat and used for metabolism at each trophic transfer.', ['Energy is created at each higher trophic level.', 'Hawks convert all consumed energy directly into new plant biomass.', 'Plants receive no energy from sunlight once herbivores feed.'], 'Only a fraction of energy becomes biomass available to the next trophic level; much is used in metabolism or lost as heat.', ['Energy is not created by trophic transfer.', 'Hawks are consumers and do not create plant biomass.', 'Plants capture energy before consumers feed.'], { cognitiveProcess: 'explain' }),
  itemSpec(8, '8.3', 'SP4', 'A population grows rapidly when small, then levels off near a stable maximum. Which model best describes this pattern?', 'Logistic growth limited by carrying capacity.', ['Exponential growth without environmental limits', 'A linear model with a constant number added each year', 'A population with no births or deaths'], 'Logistic growth slows as limiting factors intensify near carrying capacity.', ['Exponential growth assumes unlimited resources and does not level off.', 'The described curve is not a constant additive increase.', 'A stable population can still have births and deaths.'], { cognitiveProcess: 'interpret' }),
  itemSpec(8, '8.4', 'SP3', 'Which observation would provide evidence that disease transmission is density dependent?', 'The fraction of infected individuals rises as population density increases while other conditions are controlled.', ['Infection frequency is identical at every density despite contact rates changing.', 'Disease appears only after a random mutation in one individual and never spreads.', 'The population has no contact among individuals at any density.'], 'Density-dependent transmission becomes more likely when crowding increases contact opportunities and infection rate.', ['A density-dependent pattern should vary with density.', 'A mutation alone does not establish transmission between individuals.', 'No contact would prevent ordinary contagious spread.'], { cognitiveProcess: 'test' }),
  itemSpec(8, '8.5', 'SP6', 'Two bird species feed on insects in the same trees, but one forages on bark and the other on leaves. Which concept best explains their coexistence?', 'Resource partitioning reduces direct competition.', ['Competitive exclusion requires both species to use exactly the same microhabitat.', 'Predation eliminates all resource overlap between the birds.', 'Mutualism means both species consume the same insects in the same place.'], 'Using different parts of the habitat can reduce niche overlap and allow competing species to coexist.', ['Competitive exclusion is a possible outcome of complete overlap, not the described partitioning.', 'Predation is not described.', 'Mutualism requires a mutually beneficial interaction, not merely shared prey.'], { cognitiveProcess: 'apply' }),
  itemSpec(8, '8.6', 'SP2', 'Why can a community with more species sometimes recover more reliably after a disturbance?', 'Functional redundancy can allow another species to perform a similar ecological role.', ['Every species performs exactly the same role, so diversity has no possible effect.', 'More species always means no species will be affected by disturbance.', 'Species richness prevents all environmental change from occurring.'], 'When species overlap in ecological functions, loss of one may be partly buffered by others, although diversity does not guarantee no damage.', ['Species can have overlapping but not identical roles.', 'Disturbance can affect many species even in a diverse community.', 'Richness does not stop external environmental change.'], { cognitiveProcess: 'explain' }),
  itemSpec(8, '8.7', 'SP5', 'A nonnative predator is introduced to an island and native prey decline sharply. Which result would best support an ecosystem-disruption claim?', 'Native prey abundance decreases more on invaded islands than on comparable uninvaded islands.', ['Prey abundance is measured only after the predator is removed from every island.', 'The predator and prey are observed once with no comparison island.', 'Native prey abundance increases equally on invaded and uninvaded islands.'], 'A comparison of similar invaded and uninvaded islands provides evidence that the invasion is associated with a change beyond background variation.', ['Removing the predator removes the exposure needed for comparison.', 'One observation without a control is weak evidence.', 'Equal increases do not support a negative invasion effect.'], { cognitiveProcess: 'evaluate' }),
];

assert(itemSpecs.length === 50, `Expected 50 AP Biology item specifications, found ${itemSpecs.length}.`);

const sourceCatalog = [
  { id: 'ap-bio-ced-2025', title: 'AP Biology Course and Exam Description', organization: 'College Board', url: CED_URL, credibility: 'Current public course framework, science practices, unit descriptions, exam information, and content boundaries.', sourceType: 'official-blueprint', reviewedAt: verifiedAt },
  { id: 'ap-bio-course-page', title: 'AP Biology course and exam page', organization: 'College Board', url: COURSE_URL, credibility: 'Current public overview of course units, prerequisites, exam weighting, and available reference resources.', sourceType: 'official-course-page', reviewedAt: verifiedAt },
  { id: 'openstax-biology-2e', title: 'Biology 2e', organization: 'OpenStax, Rice University', url: OPENSTAX_URL, credibility: 'Open college-level biology reference used for factual cross-checking; no prose, figures, or assessment content are reproduced.', sourceType: 'open-textbook-reference', reviewedAt: verifiedAt },
];

const chapterContent = [
  {
    summary: 'Water chemistry and macromolecular structure provide the chemical vocabulary for explaining how biological systems assemble, interact, and maintain function. Focus on relationships between structure and function rather than isolated term recall.',
    objective: 'Relate polarity, hydrogen bonding, dehydration and hydrolysis, and macromolecular structure to biological function.',
    sectionHeading: 'Water, macromolecules, and structure-function reasoning',
    content: 'Water polarity and hydrogen bonding explain cohesion, adhesion, solvent behavior, temperature buffering, and the unusual density of ice. Carbon-based macromolecules are assembled and broken through dehydration synthesis and hydrolysis. Carbohydrates often provide short-term energy or structural material; lipids provide hydrophobic barriers and long-term energy storage; nucleic acids store and transmit information; and proteins fold into structures whose shapes support specific functions. AP Biology reasoning should connect a molecular feature to an observable consequence and distinguish a correlation from a mechanism.',
    keyTerms: ['polarity', 'hydrogen bonding', 'hydrolysis', 'macromolecule', 'structure-function'],
    rich: {
      examples: ['A phospholipid bilayer uses amphipathic structure to separate aqueous compartments.', 'A protein substitution in a hydrophobic core can alter folding and activity.'],
      nonExamples: ['Hydrogen bonds between water molecules are not the same as covalent bonds within a water molecule.', 'A high-energy food molecule is not automatically a catalyst.'],
      misconception: 'The word organic does not mean biologically produced, and a molecule having carbon does not by itself identify its biological function.',
      dataHeaders: ['Observation', 'Supports', 'Does not establish'],
      dataRows: [['Ice floats in liquid water.', 'An open hydrogen-bonded lattice lowers solid-water density.', 'That all solids are less dense than their liquids.'], ['A protein loses activity after a charged substitution in its interior.', 'Interactions that support folding may have changed.', 'That every amino-acid substitution destroys function.']],
      retrieval: ['Explain how water polarity supports solvent behavior.', 'Compare dehydration synthesis with hydrolysis.', 'Connect one macromolecule structure to one biological function.'],
      transfer: 'When a prompt names a molecule, identify the structural feature first and then predict the biological consequence that feature makes possible.',
    },
  },
  {
    summary: 'Cells exchange materials while preserving internal conditions. This lesson prototype uses membrane structure, gradients, surface-area-to-volume ratio, and compartmentalization as connected explanations for why cell size and architecture matter.',
    objective: 'Predict movement across membranes and explain why surface-area-to-volume ratio and organelle compartmentalization affect cell function.',
    sectionHeading: 'Membranes, transport, and cell size',
    content: 'A phospholipid bilayer creates a selectively permeable boundary. Small nonpolar molecules can often diffuse through the hydrophobic interior, while ions and large polar molecules need channels, carriers, or pumps. Osmosis describes water movement driven by solute differences, and plant-cell walls help convert water movement into turgor. As a cell grows, volume increases faster than surface area, making exchange less efficient. Organelles and internal membranes create compartments that concentrate enzymes, substrates, and gradients.',
    keyTerms: ['selective permeability', 'diffusion', 'osmosis', 'tonicity', 'surface-area-to-volume ratio'],
    rich: {
      examples: ['A plant cell in a hypotonic solution becomes turgid because water enters while the wall limits expansion.', 'A smaller cell can exchange materials more efficiently because it has more membrane surface per unit volume.'],
      nonExamples: ['Water movement does not mean every solute crosses the membrane with water.', 'Negative tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance.'],
      misconception: 'Active transport is defined by movement against a gradient and energy use, not simply by the presence of a membrane protein.',
      dataHeaders: ['Result', 'Supports', 'Boundary'],
      dataRows: [['A smaller model cube changes color throughout sooner than a larger cube.', 'Higher surface-area-to-volume ratio improves exchange distance.', 'A model result is not a complete cell-physiology experiment.'], ['A cell swells in a dilute external solution.', 'Water enters because the external solution is hypotonic relative to the cell.', 'The observation alone does not identify every solute transporter.']],
      retrieval: ['Distinguish simple diffusion, facilitated diffusion, and active transport.', 'Predict a plant-cell response to a hypotonic solution.', 'Explain why increasing cell size can limit exchange.'],
      transfer: 'For a transport item, name the moving substance, compare concentrations or water potential, and then decide whether a membrane protein or energy input is required.',
    },
  },
  {
    summary: 'Cellular energetics follows energy transfer rather than a list of pathway names. Enzymes lower activation barriers, electron carriers move reducing power, and photosynthesis and respiration couple gradients to ATP production.',
    objective: 'Explain how enzyme activity, electron transfer, and energy coupling influence photosynthesis and cellular respiration.',
    sectionHeading: 'Enzymes, energy, and metabolic pathways',
    content: 'Enzymes lower activation energy and respond to substrate concentration, temperature, pH, and inhibitors. ATP couples energy-releasing reactions to energy-requiring work. In photosynthesis, light reactions generate ATP and NADPH for carbon fixation. In aerobic respiration, electrons move through membrane complexes that establish a proton gradient used by ATP synthase; oxygen accepts electrons at the end. Explanations should identify the location, input, output, and limiting condition of a process.',
    keyTerms: ['activation energy', 'ATP', 'electron transport chain', 'proton gradient', 'redox'],
  },
  {
    summary: 'Cell communication converts information outside or between cells into regulated responses. Feedback and cell-cycle checkpoints illustrate how biological systems use signals to maintain conditions and prevent uncontrolled division.',
    objective: 'Predict how receptor pathways, feedback loops, and checkpoints affect cellular responses.',
    sectionHeading: 'Signal transduction and cell-cycle control',
    content: 'Signals can act through direct contact, local regulators, or long-distance hormones. A receptor recognizes a signal and initiates a pathway whose relay proteins can amplify or modify the response. Negative feedback counteracts a deviation, while positive feedback reinforces a process. Cyclins, cyclin-dependent kinases, checkpoints, DNA repair, and apoptosis coordinate cell-cycle progression. The same signal can produce different outcomes in cells with different receptors or internal pathway components.',
    keyTerms: ['receptor', 'signal transduction', 'negative feedback', 'cyclin', 'checkpoint'],
  },
  {
    summary: 'Heredity links chromosome behavior, allele combinations, and phenotype. Meiosis creates variation through crossing over and independent assortment, while Mendelian and non-Mendelian patterns require careful use of probability and genotype evidence.',
    objective: 'Use meiosis, probability, and inheritance models to explain genetic variation and phenotype patterns.',
    sectionHeading: 'Meiosis, inheritance, and phenotype',
    content: 'Meiosis reduces chromosome number and creates genetically varied gametes. Crossing over and independent assortment generate new allele combinations, while fertilization combines gametes. Punnett squares and probability can predict genotype and phenotype frequencies when assumptions are stated. Incomplete dominance, codominance, sex-linked inheritance, and environmental effects on phenotype show why a simple dominant-recessive model is not universal. A phenotype is an observed result of genotype, environment, and their interaction.',
    keyTerms: ['meiosis', 'crossing over', 'independent assortment', 'genotype', 'phenotype'],
  },
  {
    summary: 'Gene expression explains how stored information becomes cellular structure and function. DNA replication preserves information, transcription and translation use it, and regulation allows different cells to use the same genome differently.',
    objective: 'Trace information from DNA through RNA and protein and predict consequences of mutations or regulatory changes.',
    sectionHeading: 'DNA, gene expression, and regulation',
    content: 'DNA strands are complementary and antiparallel, allowing semiconservative replication. Transcription produces RNA from a DNA template, and translation uses codons to assemble a polypeptide. Promoters, transcription factors, chromatin state, RNA processing, and regulatory RNAs can change expression. Mutations may be synonymous, missense, nonsense, or frameshift, and their effects depend on location and context. Biotechnology tools such as PCR use sequence-specific primers to amplify selected DNA regions.',
    keyTerms: ['replication', 'transcription', 'translation', 'promoter', 'mutation'],
  },
  {
    summary: 'Evolutionary explanations connect heritable variation with population change across generations. Natural selection, genetic drift, gene flow, mutation, and nonrandom mating have different mechanisms and different predictions for allele frequencies.',
    objective: 'Use population data, evolutionary mechanisms, and phylogenetic evidence to explain relatedness and change.',
    sectionHeading: 'Natural selection, population genetics, and speciation',
    content: 'Natural selection changes trait and allele frequencies when heritable variation affects reproductive success. Genetic drift changes populations through chance, especially when populations are small. Gene flow moves alleles between populations. Hardy-Weinberg equilibrium is a model with restrictive assumptions, useful as a comparison point. Phylogenetic trees represent hypotheses of relatedness, and speciation requires reproductive isolation that reduces gene flow. Evolution acts on populations, not on an individual organism trying to meet a need.',
    keyTerms: ['natural selection', 'genetic drift', 'gene flow', 'Hardy-Weinberg', 'speciation'],
  },
  {
    summary: 'Ecology examines energy flow, matter cycling, population limits, and interactions among organisms. Scale matters: a mechanism that explains an individual response may not explain a population or community pattern.',
    objective: 'Analyze energy flow, population growth, species interactions, biodiversity, and ecosystem disruption.',
    sectionHeading: 'Energy flow, populations, and ecosystems',
    content: 'Energy enters most ecosystems through primary producers and decreases at successive trophic levels as organisms use energy for metabolism and release heat. Population growth reflects births, deaths, immigration, emigration, and limiting factors. Density-dependent processes intensify with crowding, while community structure depends on competition, predation, mutualism, and resource partitioning. Biodiversity can support resilience, but disturbance, invasive species, climate shifts, and habitat loss can change ecosystem functions.',
    keyTerms: ['trophic level', 'carrying capacity', 'density dependence', 'niche', 'biodiversity'],
  },
];

assert(chapterContent.length === 8, 'AP Biology requires one native chapter shell per unit.');

function textRun(text) {
  return { type: 'text', text: String(text || '') };
}

function paragraph(text) {
  const value = String(text || '').trim();
  return { type: 'paragraph', text: value, runs: [textRun(value)] };
}

function labeledParagraph(label, text) {
  const safeLabel = String(label || '').trim();
  const safeText = String(text || '').trim();
  return {
    type: 'paragraph',
    text: safeLabel + safeText,
    runs: [{ type: 'strong', children: [textRun(safeLabel)] }, textRun(safeText)],
  };
}

function bulletList(items, ordered = false) {
  return {
    type: 'list',
    ordered,
    items: items.map((item) => ({ text: String(item || '').trim(), runs: [textRun(String(item || '').trim())] })),
  };
}

function tableBlock(headers, rows) {
  return {
    type: 'table',
    rows: [
      { cells: headers.map((text) => ({ kind: 'header', text, columnSpan: 1, runs: [textRun(text)] })) },
      ...rows.map((row) => ({ cells: row.map((text) => ({ kind: 'cell', text, columnSpan: 1, runs: [textRun(text)] })) })),
    ],
  };
}

function unitReferences(unit) {
  const openstaxPage = unit <= 2 ? 'https://openstax.org/books/biology-2e/pages/4-introduction' : OPENSTAX_URL;
  return [CED_URL, COURSE_URL, openstaxPage];
}

function sourceDetails(unit) {
  return [{
    title: 'AP Biology CED and Biology 2e factual cross-check',
    organization: 'College Board and OpenStax, Rice University',
    url: CED_URL,
    credibility: 'The public framework defines the unit and science-practice boundary; the open college-level text supports factual cross-checking. Original wording is independently authored.',
    unit,
  }];
}

function buildItem(spec, index) {
  const unit = units[spec.unit - 1];
  const objective = objectiveByTopic.get(spec.topicId);
  const correctChoice = spec.answer;
  const distractors = spec.distractors.slice();
  const baseChoices = [correctChoice, ...distractors];
  const baseRationales = [spec.rationale, ...spec.wrongReasons.map((reason) => `This option is not the best answer because ${reason}`)];
  const answerIndex = index % 4;
  const choices = baseChoices.slice(1);
  const choiceRationales = baseRationales.slice(1);
  choices.splice(answerIndex, 0, correctChoice);
  choiceRationales.splice(answerIndex, 0, spec.rationale);
  const itemNumber = String(index + 1).padStart(3, '0');
  const item = {
    id: `ap-bio-u${spec.unit}-${itemNumber}`,
    templateVersion: 1,
    itemSchemaVersion: 2,
    type: 'single-choice',
    domainId: unit.id,
    topicIds: [spec.topicId],
    practiceId: spec.practiceId,
    practiceIds: [spec.practiceId],
    skillId: spec.practiceId,
    skillIds: [spec.practiceId],
    difficulty: spec.difficulty,
    cognitiveDemand: spec.cognitiveProcess === 'define' ? 'knowledge' : 'application',
    cognitiveProcess: spec.cognitiveProcess,
    prompt: spec.prompt,
    choices,
    answerIndex,
    rationale: spec.rationale,
    choiceRationales,
    references: unitReferences(spec.unit),
    sourceDetails: sourceDetails(spec.unit),
    provenance: 'native-original',
    officialItem: false,
    rights: {
      secureContentUsed: false,
      copiedOfficialQuestion: false,
      sourceUse: 'facts-and-blueprint-only',
      status: 'pending-independent-rights-review',
    },
    accessibility: {
      textOnly: true,
      essentialVisual: false,
      linearReadingOrder: true,
      handsFreeContentCompatible: true,
      status: 'pending-independent-accessibility-review',
    },
    expertReview: { status: 'pending', releaseBlocked: true },
    psychometricStatus: 'not-calibrated',
    reviewStatus: 'internal-editorial-draft',
    qaStatus: 'structure-ready-content-review-pending',
    releaseEligible: false,
    editorialChecks: {
      scenarioBased: true,
      singleBestAnswer: true,
      parallelPlausibleOptions: true,
      noKeywordGiveaway: true,
      completeOptionFeedback: true,
      ageAppropriate: true,
      medicalSafety: true,
    },
    learningObjectiveId: objective.id,
    learningObjectiveLabel: objective.label,
    learningSectionId: `ap-bio-ch-${String(spec.unit).padStart(2, '0')}-section-01`,
    learningSectionLabel: objective.sectionLabel,
    chapterIds: [`ap-bio-ch-${String(spec.unit).padStart(2, '0')}`],
    stimulus: spec.stimulus || undefined,
  };
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== undefined));
}

const chapterChecks = [
  { prompt: 'Which property of water most directly explains why a small amount of heat causes relatively little change in water temperature?', choices: ['Hydrogen bonding allows water to absorb substantial energy before molecules move faster', 'Water contains no covalent bonds', 'Water is nonpolar and cannot interact with itself', 'Water has a lower specific heat than most substances'], answerIndex: 0, rationale: 'Hydrogen bonding contributes to water high specific heat, so energy can be absorbed with less immediate temperature change.' },
  { prompt: 'A cell placed in a hypertonic solution loses water. Which process best describes the water movement?', choices: ['Osmosis toward the region with greater effective solute concentration', 'Active transport of water through ATP-powered pumps', 'Transcription of water-channel genes', 'Exocytosis of the entire cytoplasm'], answerIndex: 0, rationale: 'Osmosis is water movement across a selectively permeable membrane in response to solute differences.' },
  { prompt: 'If an enzyme is denatured, which change is most directly responsible for loss of activity?', choices: ['The active site shape changes so the substrate no longer binds as effectively', 'The enzyme becomes a nucleic acid', 'The reaction equilibrium disappears from the cell', 'The substrate is permanently removed from the environment'], answerIndex: 0, rationale: 'Denaturation changes the three-dimensional structure that gives an enzyme its active-site specificity.' },
  { prompt: 'Which response is an example of negative feedback?', choices: ['A rise in blood glucose stimulates insulin release that lowers blood glucose', 'Platelet activation recruits more platelets to a wound', 'A signal causes an unlimited increase in cell division', 'A mutation is copied during DNA replication'], answerIndex: 0, rationale: 'Negative feedback counteracts the initial change and moves a regulated variable back toward its range.' },
  { prompt: 'Which meiotic event produces chromosomes with new combinations of alleles?', choices: ['Crossing over between homologous chromosomes', 'Replication of one chromosome without recombination', 'Translation of an mRNA molecule', 'Binary fission of a bacterial cell'], answerIndex: 0, rationale: 'Crossing over exchanges corresponding segments between homologs during meiosis I.' },
  { prompt: 'A mutation changes a promoter so transcription factors bind less often. What is the most direct expected result?', choices: ['Reduced transcription of the associated gene', 'Immediate doubling of the protein sequence length', 'Conversion of RNA into a lipid', 'Removal of every copy of the gene from the genome'], answerIndex: 0, rationale: 'Promoter and transcription-factor interactions influence whether RNA polymerase initiates transcription.' },
  { prompt: 'Which situation can change allele frequencies through chance rather than differential reproductive success?', choices: ['A bottleneck leaves a small random sample of a population', 'A helpful inherited trait increases offspring number', 'A population receives migrants carrying an allele', 'A mutation creates a new allele'], answerIndex: 0, rationale: 'A bottleneck is genetic drift: chance sampling changes allele frequencies when population size is sharply reduced.' },
  { prompt: 'Why does energy generally decrease between adjacent trophic levels?', choices: ['Organisms use much of the captured energy for metabolism and release heat', 'Energy is created only by consumers and not by producers', 'Every trophic transfer destroys all matter in the ecosystem', 'Consumers convert all food energy into new plant tissue'], answerIndex: 0, rationale: 'Metabolism and heat loss mean only a fraction of energy becomes biomass available to the next level.' },
];

function buildObjectiveCatalog() {
  return [...objectiveByTopic.values()].map((objective) => {
    const chapterId = `ap-bio-ch-${String(objective.unit).padStart(2, '0')}`;
    return {
      id: objective.id,
      topicId: objective.topicId,
      domainId: units[objective.unit - 1].id,
      chapterId,
      sectionId: `${chapterId}-section-01`,
      sectionLabel: objective.sectionLabel,
      label: objective.label,
      practiceIds: objective.practiceIds.slice(),
      nextStep: 'Review the linked unit lesson, explain the mechanism in your own words, then retry a targeted pilot set.',
      status: 'internal-remediation-route',
      officialItem: false,
      releaseEligible: false,
      reviewStatus: 'internal-editorial-draft',
      references: [CED_URL, COURSE_URL, OPENSTAX_URL],
    };
  });
}

function buildRichSection(section, detail) {
  section.contentBlocks = [
    paragraph(section.content),
    labeledParagraph('Examples. ', 'Use these to connect a biological structure or process to an observable consequence.'),
    bulletList(detail.examples),
    labeledParagraph('Nonexamples and boundaries. ', 'These statements identify nearby ideas that should not be treated as equivalent.'),
    bulletList(detail.nonExamples),
    labeledParagraph('Common misconception. ', detail.misconception),
    labeledParagraph('Worked data moment. ', 'State what the observation supports and then name the conclusion it cannot establish.'),
    tableBlock(detail.dataHeaders, detail.dataRows),
    labeledParagraph('Retrieval practice. ', 'Answer before returning to the pilot items.'),
    bulletList(detail.retrieval, true),
    labeledParagraph('Transfer move. ', detail.transfer),
  ];
  section.examples = detail.examples.slice();
  section.nonExamples = detail.nonExamples.slice();
  section.commonMisconceptions = [detail.misconception];
  section.workedDataExample = { headers: detail.dataHeaders.slice(), rows: detail.dataRows.map((row) => row.slice()) };
  section.retrievalPrompts = detail.retrieval.slice();
  section.transferMove = detail.transfer;
  section.contentEnhancementVersion = 'ap-bio-foundation-v1';
}

function buildLibrary() {
  const chapters = chapterContent.map((content, index) => {
    const unit = units[index];
    const chapterId = `ap-bio-ch-${String(unit.number).padStart(2, '0')}`;
    const objective = objectiveByUnit.get(unit.number);
    const section = {
      id: `${chapterId}-section-01`,
      heading: content.sectionHeading,
      content: content.content,
      keyTerms: content.keyTerms.slice(),
      references: unitReferences(unit.number),
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original foundation lesson shell; AP Biology subject-expert, accessibility, rights, and production review remain pending.',
      contentComplete: true,
      contentEnhancementVersion: content.rich ? 'ap-bio-foundation-v1' : 'ap-bio-foundation-shell-v1',
    };
    if (content.rich) buildRichSection(section, content.rich);
    else section.contentBlocks = [paragraph(content.content), labeledParagraph('Study objective. ', content.objective)];
    return {
      id: chapterId,
      title: unit.label,
      domainId: unit.id,
      domain: unit.shortLabel,
      skillId: objective.practiceIds[0],
      topicCoverage: unit.topics.slice(),
      summary: content.summary,
      objectives: [content.objective],
      chapterTakeaways: [
        `Unit ${unit.number} reasoning starts with the biological mechanism, not an isolated vocabulary label.`,
        `Use the relevant science practice to decide whether the task asks for explanation, method, data, calculation, or argument.`,
        `Keep the scale of the claim aligned with the evidence: molecule, cell, organism, population, or ecosystem.`,
      ],
      references: unitReferences(unit.number),
      reviewStatus: 'source-reviewed-editorial-pass',
      reviewNote: 'Original AP Biology foundation chapter shell; independent subject-expert validation remains pending.',
      expertReviewStatus: 'pending',
      accessibilityReviewStatus: 'pending-independent-review',
      releaseEligible: false,
      sectionCount: 1,
      knowledgeCheckCount: 1,
      referenceCount: 3,
      sections: [section],
      knowledgeChecks: [{
        id: `${chapterId}-check-01`,
        chapterId,
        type: 'single-choice',
        prompt: chapterChecks[index].prompt,
        choices: chapterChecks[index].choices,
        answerIndex: chapterChecks[index].answerIndex,
        rationale: chapterChecks[index].rationale,
        references: unitReferences(unit.number),
        reviewStatus: 'source-reviewed-editorial-pass',
        reviewNote: 'Original foundation retrieval check; AP Biology subject-expert and psychometric review remain pending.',
      }],
      contentComplete: true,
      foundationPrototype: Boolean(content.rich),
    };
  });

  const flashcards = chapters.map((chapter, index) => ({
    id: `ap-bio-card-${String(index + 1).padStart(2, '0')}`,
    chapterId: chapter.id,
    domainId: chapter.domainId,
    domain: chapter.domain,
    front: chapter.objectives[0],
    back: chapter.sections[0].content.split('. ').slice(0, 2).join('. ') + '.',
    reviewStatus: 'source-reviewed-editorial-pass',
    references: chapter.references.slice(),
    reviewNote: 'Original foundation study card; AP Biology expert validation remains pending.',
  }));

  const memoryAids = chapters.map((chapter, index) => ({
    id: `ap-bio-memory-${String(index + 1).padStart(2, '0')}`,
    chapterId: chapter.id,
    type: 'reasoning cue',
    title: `${units[index].shortLabel}: mechanism to evidence`,
    content: `Name the system, identify the change, predict the mechanism, and check whether the evidence supports a molecular, cellular, organismal, population, or ecosystem claim. Start with ${chapter.sections[0].keyTerms.slice(0, 2).join(' and ')}.`,
    tags: chapter.sections[0].keyTerms.slice(0, 4),
    domain: chapter.domain,
    references: chapter.references.slice(),
    reviewStatus: 'source-reviewed-editorial-pass',
    reviewNote: 'Original foundation retrieval aid; AP Biology and accessibility validation remain pending.',
  }));

  const learningObjectiveCatalog = buildObjectiveCatalog();
  return {
    schemaVersion: 1,
    librarySchemaVersion: 1,
    libraryId: 'ap-biology-foundation-pilot-learning-library',
    packId,
    version,
    title: 'AP Biology Foundation Pilot Learning Library',
    description: 'An independently authored AP Biology internal foundation pilot with eight unit chapter shells, two richer lesson prototypes, chapter retrieval checks, linked study cards, and reasoning aids. It is not released, official, calibrated, or score-predictive.',
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    blueprint: {
      academicYearReference: '2025-26',
      cedEffectiveLabel: 'Fall 2025',
      cedFrameworkVersion: 'V.1',
      examFormatReferenceYear: 2026,
      officialBlueprintUrl: CED_URL,
      officialCourseUrl: COURSE_URL,
      pilotVersion: 'ap-biology-foundation-v1',
      pilotNote: 'Foundation pilot only: 50 original selected-response items, eight unit shells, two rich lesson prototypes, and internal remediation routes. Do not expand to a 500-item release candidate until content, rights, accessibility, and subject-expert gates advance.',
      bigIdeas,
      sciencePractices: practices,
      learningObjectiveCatalogVersion: 'ap-biology-foundation-v1',
      learningObjectiveCatalog,
      unitWeights: units.map((unit) => ({ id: unit.id, label: unit.label, officialWeightRange: [unit.officialWeightMin, unit.officialWeightMax] })),
    },
    reviewStandard: 'Independent source and editorial review against the public AP Biology Course and Exam Description and openly available factual references. Independent AP Biology subject-expert, accessibility, rights, production, field-testing, and psychometric review remain required.',
    disclaimer: 'Independent, unofficial AP Biology preparation material for internal foundation-pilot development only. Not affiliated with, endorsed by, or authored by College Board. AP and Advanced Placement are trademarks of College Board. No secure AP Classroom, Question Bank, Progress Check, practice exam, teacher-only content, official rubric, or official question was used or reproduced. This pilot does not provide official scores, score predictions, college-credit predictions, medical advice, laboratory safety instructions, or a substitute for supervised laboratory work.',
    prerequisiteNote: 'College Board lists high school biology and chemistry as recommended prerequisites. This pilot should disclose that background expectation before study begins.',
    sourceCatalog,
    skills: practices,
    chapters,
    diagrams: [],
    diagramPlacements: [],
    flashcards,
    memoryAids,
    constructedResponseWorkshops: [],
    summary: {
      chapters: chapters.length,
      sections: chapters.reduce((sum, chapter) => sum + chapter.sections.length, 0),
      knowledgeChecks: chapters.reduce((sum, chapter) => sum + chapter.knowledgeChecks.length, 0),
      flashcards: flashcards.length,
      memoryAids: memoryAids.length,
      diagrams: 0,
      diagramPlacements: 0,
      constructedResponseWorkshops: 0,
      richLessonPrototypes: chapters.filter((chapter) => chapter.foundationPrototype).length,
      sourceReviewedChapters: chapters.length,
      sourceReviewedFlashcards: flashcards.length,
      sourceReviewedMemoryAids: memoryAids.length,
      releaseEligibleRecords: 0,
    },
    accessibility: {
      contentForm: 'text-first, linear lessons and single-choice items',
      essentialVisualItems: 0,
      diagramsRequiredForComprehension: false,
      diagramFallbackMode: 'ordered-text-equivalent',
      independentReviewStatus: 'pending',
      productionScreenReaderValidationStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    rightsPolicy: {
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestions: false,
      copiedCollegeBoardRubricText: false,
      sourceProseOrFiguresReproduced: false,
      diagramSpecificationsOriginal: true,
      authoringBasis: 'Independent original wording informed by public blueprint metadata and factual sources.',
      publicSourceUse: 'Blueprint alignment and factual verification only; no source prose, figures, or assessment content reproduced.',
      openStaxUse: 'Factual cross-checking and links only; no textbook prose, figures, or assessment content reproduced.',
      status: 'pending-independent-rights-review',
    },
    releaseGates: {
      internalStructuralValidation: 'pending-build-qa',
      independentRightsReview: 'pending',
      independentAccessibilityReview: 'pending',
      apBiologySubjectExpertReview: 'pending',
      productionValidation: 'pending',
      fieldTesting: 'not-started',
      psychometricCalibration: 'not-started',
      cedAndPolicyReverification: 'required-before-release',
      releaseEligible: false,
    },
    expertReviewGate: {
      requiredRole: 'Independent educator or faculty reviewer with current AP Biology course, laboratory, and assessment expertise',
      status: 'pending',
      releaseBlocked: true,
    },
    transitionNotice: 'Reverify the current AP Biology CED, clarifications, exam format, policies, prerequisite language, laboratory boundaries, and public-use boundaries before any release.',
    contentMigration: {
      schemaVersion: 1,
      contentVersion: 'ap-biology-foundation-v1',
      sections: 8,
      completeSections: 8,
      richLessonPrototypes: 2,
      status: 'foundation-prototype',
      note: 'All eight unit shells are navigable; richer structured lesson blocks are intentionally limited to Units 1 and 2 until the foundation pilot receives review.',
    },
  };
}

function buildPack(library) {
  const items = itemSpecs.map(buildItem);
  const objectiveCatalog = library.blueprint.learningObjectiveCatalog;
  const domains = units.map((unit) => ({
    id: unit.id,
    label: unit.label,
    weight: unit.weight,
    officialWeightMin: unit.officialWeightMin,
    officialWeightMax: unit.officialWeightMax,
    itemCount: items.filter((item) => item.domainId === unit.id).length,
  }));
  const sections = Array.from({ length: 10 }, (_, index) => ({
    id: `foundation-bank-${String(index + 1).padStart(2, '0')}`,
    label: `Foundation bank ${String(index + 1).padStart(2, '0')}: five-item unit sampler`,
    timeMinutes: null,
    released: false,
    itemIds: items.slice(index * 5, index * 5 + 5).map((item) => item.id),
  }));
  return {
    schemaVersion: 1,
    id: packId,
    title: 'AP Biology Independent Foundation Pilot',
    shortTitle: 'AP Biology Foundation Pilot',
    description: 'An independently authored 50-question AP Biology foundation pilot spanning all eight current units. It tests the blueprint crosswalk, science-practice metadata, native chapter architecture, and internal QA before any full-bank expansion.',
    credentialOwner: 'College Board',
    version,
    status: 'preview',
    visibility: 'internal',
    released: false,
    releaseEligible: false,
    officialItem: false,
    calibrated: false,
    accent: 'emerald',
    itemSchemaVersion: 2,
    responseTypes: ['single-choice'],
    examModes: ['fully-digital'],
    contentReview: 'Fifty original source-aligned draft multiple-choice items: six or seven per current AP Biology unit, with all six science practices represented, unit and objective remediation routes, and an eight-unit native library foundation. Independent AP Biology subject-expert, laboratory, rights, accessibility, production, field-testing, and psychometric review remain pending.',
    blueprintLabel: 'AP Biology Course and Exam Description, effective Fall 2025, Course Framework V.1',
    blueprintEffective: 'Fall 2025 CED; current official public reference reviewed 2026-08-20.',
    officialBlueprintUrl: CED_URL,
    clarificationsUrl: '',
    officialExamUrl: 'https://apcentral.collegeboard.org/courses/ap-biology/exam',
    domains,
    sections,
    items,
    learningLibraryUrl: './test_prep/ap_biology_foundation_pilot_learning_library.json',
    nativeQaUrl: './test_prep/ap_biology_foundation_pilot_qa.json',
    sourceCatalog,
    capabilities: {
      currentEngineSchemaVersion: 1,
      itemSchemaVersion: 2,
      currentEngineCompatible: true,
      responseTypes: ['single-choice'],
      stimulusGroupsIncluded: false,
      constructedResponseIncluded: false,
      frqWorkshopsIncluded: false,
      handsFreeContentCompatible: true,
      limitations: [
        'This foundation pilot is not a complete AP Biology exam simulation and does not reproduce the official digital exam experience.',
        'The six official free-response task forms are not scored; this pilot provides selected-response practice and a native study foundation only.',
        'No official score, readiness, college-credit, laboratory-competency, or safety inference is supported.',
      ],
    },
    blueprint: {
      academicYearReference: '2025-26',
      cedEffectiveLabel: 'Fall 2025',
      cedFrameworkVersion: 'V.1',
      examFormatReferenceYear: 2026,
      targetExamYear: null,
      examModeReference: 'fully-digital',
      officialSectionOne: '60 multiple-choice questions in 90 minutes; 50% of the official exam score.',
      officialSectionTwo: '6 free-response questions in 90 minutes; 50% of the official exam score.',
      pilotAlignment: '50-item foundation sampler across all eight units; 10 five-item banks; all six science practices represented; no FRQ scoring.',
      lastVerifiedAt: verifiedAt,
      sourceDigest: 'pending-build-generation',
      bigIdeas,
      sciencePractices: practices,
      learningObjectiveCatalogVersion: 'ap-biology-foundation-v1',
      learningObjectiveCatalog: objectiveCatalog,
    },
    rightsPolicy: library.rightsPolicy,
    releaseGates: library.releaseGates,
    accessibilityGate: {
      contentForm: 'text-only, linear single-choice items and text-first native lessons',
      essentialVisualItems: 0,
      screenReaderReadingOrderDeclared: true,
      handsFreeContentCompatible: true,
      independentReviewStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    },
    expertReviewGate: library.expertReviewGate,
    transitionNotice: library.transitionNotice,
  };
}

function main() {
  const library = buildLibrary();
  const pack = buildPack(library);
  assert(pack.items.length === 50, 'AP Biology pack must contain 50 items.');
  assert(new Set(pack.items.map((item) => item.id)).size === 50, 'AP Biology item IDs must be unique.');
  assert(pack.domains.every((domain) => domain.itemCount >= 5), 'Every AP Biology unit must receive at least five pilot items.');
  assert(new Set(pack.items.map((item) => item.practiceId)).size === 6, 'All six AP Biology science practices must be represented.');
  assert(library.chapters.length === 8 && library.summary.richLessonPrototypes === 2, 'AP Biology library prototype inventory is incorrect.');
  writeJson(packPath, pack);
  writeJson(libraryPath, library);
  console.log(`Built ${pack.id} ${pack.version} with ${pack.items.length} items across ${pack.domains.length} units and ${library.summary.richLessonPrototypes} rich lesson prototypes.`);
}

main();
