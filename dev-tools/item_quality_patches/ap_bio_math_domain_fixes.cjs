'use strict';

module.exports = {
  ap_biology_foundation_pilot: {
    'ap-bio-u1-255': {
      prompt:
        'A DNA template strand has the sequence 3-prime-CGA-TAC-5-prime. A substitution changes the second template triplet from TAC to TAT. Which consequence is most likely during transcription and translation?',
      rationale:
        'RNA polymerase reads the DNA template 3-prime to 5-prime to build a complementary 5-prime to 3-prime mRNA: the second template triplet 3-prime-TAC-5-prime yields 5-prime-AUG-3-prime (methionine), while 3-prime-TAT-5-prime yields 5-prime-AUA-3-prime (isoleucine).',
      choiceRationales: [
        'This option is not the best answer because the stated strand is the DNA template, so mRNA is transcribed as its complementary sequence (AUG to AUA) rather than copying template bases directly as UAC to UAU.',
        'This option is not the best answer because a single-base point substitution alters one codon within the existing gene rather than adding a whole chromosome or generating a second separate protein.',
        'RNA polymerase reads the 3-prime to 5-prime DNA template complementarily, so changing the second template triplet from TAC to TAT shifts the mRNA codon from AUG (methionine) to AUA (isoleucine).',
        'This option is not the best answer because a base substitution alters only the nitrogenous base at that nucleotide position and leaves the sugar-phosphate backbone of the mRNA completely intact.',
      ],
    },
    'ap-bio-u2-059': {
      choices: [
        'Exactly 0.00 M, because water enters the model at any low sucrose concentration.',
        'Exactly 0.60 M, because the largest concentration always stops osmosis entirely.',
        'Between 0.20 M and 0.40 M sucrose, near 0.34 M if the trend is roughly linear.',
        'At 0.20 M, because any positive mass change means that no water crosses at all.',
      ],
      rationale:
        'The isotonic concentration occurs where net mass change equals 0 percent, lying between 0.20 M (+5%) and 0.40 M (-2%); linear interpolation gives 0.20 + (5 / 7)(0.20) = 0.343 M, or approximately 0.34 M sucrose.',
      choiceRationales: [
        'This option is not the best answer because 0.00 M is pure water, which is strongly hypotonic and drives substantial net water entry and mass gain rather than isotonic equilibrium.',
        'This option is not the best answer because 0.60 M lies beyond the hypertonic 0.40 M solution where the cell already loses water, so it would cause even greater mass loss rather than zero net osmosis.',
        'The isotonic point occurs at zero net mass change between 0.20 M (+5%) and 0.40 M (-2%); linear interpolation gives 0.20 + (5/7)(0.20) = 0.343 M, or about 0.34 M.',
        'This option is not the best answer because a +5 percent mass gain at 0.20 M demonstrates net water entry into the cell model rather than balanced osmotic equilibrium.',
      ],
    },
    'ap-bio-u2-064': {
      prompt:
        'An antibiotic that inhibits bacterial ribosomes reduces protein synthesis in isolated mitochondria but not on cytosolic ribosomes translating nuclear-encoded mRNAs. Which claim is best supported?',
      rationale:
        'Selective sensitivity of mitochondrial protein synthesis to a bacterial ribosome inhibitor, while eukaryotic cytosolic translation of nuclear-encoded mRNAs remains unaffected, supports endosymbiotic evidence that mitochondria retain prokaryotic-like ribosomes.',
      choiceRationales: [
        'This option is not the best answer because mitochondria contain their own circular DNA and ribosomes to synthesize a subset of organellar proteins while importing most others from the cytosol.',
        'This option is not the best answer because the antibiotic selectively impairs bacterial-like mitochondrial translation rather than indicating that the eukaryotic nucleus has bacterial ancestry or circular chromosomes.',
        'This option is not the best answer because nuclear genes encode the vast majority of mitochondrial proteins, which are translated on cytosolic ribosomes and then imported into the organelle.',
        'Selective sensitivity of mitochondrial translation to a bacterial ribosome inhibitor supports endosymbiotic evidence that mitochondria retain prokaryotic-like translation machinery.',
      ],
    },
    'ap-bio-u3-265': {
      prompt:
        'At 35 degrees Celsius, a C4 plant fixes carbon at 17 units in normal air and 18 units at elevated carbon dioxide. A C3 plant increases from 8 to 15 units under the same change. Which conclusion is best supported?',
      rationale:
        'Comparing the within-plant change between normal and elevated carbon dioxide shows the C3 plant increases by 7 units (from 8 to 15), whereas the C4 plant rises by only 1 unit (from 17 to 18) because its carbon-concentrating pathway already approaches saturation.',
      choiceRationales: [
        'Comparing changes within each plant type shows that C3 fixation rises by 7 units (8 to 15), whereas C4 fixation rises by only 1 unit (17 to 18) under these conditions.',
        'This option is not the best answer because fixing 17 to 18 units of carbon demonstrates active, high-rate photosynthesis at 35 degrees Celsius rather than an inability to photosynthesize.',
        'This option is not the best answer because data from one temperature and two carbon dioxide levels establish a condition-specific comparison rather than a universal rule for every environment.',
        'This option is not the best answer because the C3 plant increased from 8 to 15 units (+7), and comparing response size requires examining the change within each species rather than comparing final totals alone.',
      ],
    },
    'ap-bio-u4-479': {
      rationale:
        'Phosphodiesterase terminates intracellular cAMP signaling by hydrolyzing cAMP into AMP; inhibiting this enzyme prevents breakdown of the second messenger and prolongs the cAMP-dependent reporter response after the hormone pulse ends.',
      choiceRationales: [
        'This option is not the best answer because phosphodiesterase is an intracellular enzyme that degrades cyclic AMP rather than synthesizing extracellular hormones or increasing ligand-receptor binding.',
        'This option is not the best answer because cyclic AMP is a small nucleotide-derived intracellular second messenger, not a structural membrane lipid that can be converted into genomic DNA.',
        'Phosphodiesterase degrades intracellular cAMP into AMP, so inhibiting it slows cAMP clearance and prolongs the second-messenger signal after the hormone pulse.',
        'This option is not the best answer because the observation shows a prolonged reporter response rather than a lowered one, and phosphodiesterase inhibition acts on intracellular cAMP breakdown rather than blocking receptor binding.',
      ],
    },
    'ap-bio-u5-225': {
      prompt:
        'In a species with 2n = 8, homologous chromosomes separate normally in meiosis I, but sister chromatids of one chromosome fail to separate in one meiosis II cell. Which gamete outcomes are expected from that meiosis?',
      choices: [
        'One gamete gets five chromosomes, one gets three, and two get four chromosomes.',
        'All four gametes have four chromosomes because meiosis I proceeded normally.',
        'Two of the gametes have five chromosomes and the other two have three chromosomes.',
        'One gamete has eight chromosomes while the remaining three have none at all.',
      ],
      rationale:
        'For 2n = 8, the normal haploid number is n = 4. After normal meiosis I, sister-chromatid nondisjunction of one chromosome in one meiosis II cell yields one n + 1 (5) and one n - 1 (3) gamete, while the other meiosis II cell produces two normal n = 4 gametes.',
      choiceRationales: [
        'With 2n = 8 (n = 4), meiosis II nondisjunction of one chromosome in one cell yields one gamete with 5 (n + 1) and one with 3 (n - 1), while the normal meiosis II cell yields two gametes with 4 chromosomes.',
        'This option is not the best answer because normal homolog separation during meiosis I does not prevent a sister-chromatid nondisjunction error in meiosis II from producing aneuploid gametes.',
        'This option is not the best answer because two gametes with 5 and two with 3 would result from meiosis I nondisjunction affecting both secondary cells, not from a single meiosis II error.',
        'This option is not the best answer because nondisjunction of one chromosome shifts chromosome counts by one relative to the haploid number four, not by four or eight chromosomes.',
      ],
    },
    'ap-bio-u5-328': {
      prompt:
        'An individual with genotype IAIB has children with an individual of genotype IBi. If IA and IB are codominant and both are dominant over i, which blood-type phenotype proportions are expected among their offspring?',
      choices: [
        'All offspring are type A because the IA allele is dominant over both IB and i.',
        'One-fourth type A, one-fourth type B, and one-half type O offspring.',
        'One-half type O and one-half type AB because both parents pass on i alleles.',
        'One-half type B, one-fourth type A, and one-fourth type AB offspring.',
      ],
      rationale:
        'Crossing IAIB (gametes IA and IB) with IBi (gametes IB and i) yields four equally likely genotypes: 1/4 IAIB (type AB), 1/4 IAi (type A), 1/4 IBIB (type B), and 1/4 IBi (type B), giving 1/2 type B, 1/4 type A, and 1/4 type AB offspring.',
      choiceRationales: [
        'This option is not the best answer because IA and IB are codominant rather than IA masking IB, and gametes carrying IB can combine with IB or i to produce type B offspring as well as type AB.',
        'This option is not the best answer because type O requires the ii genotype, which is impossible when the IAIB parent carries no i allele, and combining IBIB with IBi yields one-half type B rather than one-fourth.',
        'This option is not the best answer because the IAIB parent lacks the recessive i allele altogether, so no child can inherit two i alleles to express type O blood.',
        'The Punnett square for IAIB x IBi produces 1/4 IAIB (type AB), 1/4 IAi (type A), and 2/4 IBIB or IBi (type B), yielding one-half type B, one-fourth type A, and one-fourth type AB.',
      ],
    },
    'ap-bio-u5-380': {
      prompt:
        'A heterozygous pink-flowered plant crossed with another heterozygote produces red, pink, and white offspring in approximately a 1:2:1 ratio. Which inheritance pattern is most consistent?',
      rationale:
        'When heterozygous parents display an intermediate pink phenotype and their cross produces red, pink, and white offspring in a 1:2:1 phenotypic ratio matching the 1:2:1 genotypic ratio, the locus exhibits incomplete dominance.',
      choiceRationales: [
        'This option is not the best answer because complete dominance makes heterozygotes match one homozygous parent and yields a 3:1 phenotypic ratio from a heterozygote cross rather than 1:2:1.',
        'This option is not the best answer because codominance expresses both parental phenotypes distinctly side by side rather than producing a blended intermediate pink color in heterozygotes.',
        'This option is not the best answer because recessive epistasis involves masking between two separate gene loci (such as a 9:3:4 ratio) rather than a single-locus 1:2:1 cross.',
        'Crossing two intermediate pink heterozygotes to obtain 1 red : 2 pink : 1 white offspring matches the genotypic ratio and is the classic signature of incomplete dominance.',
      ],
    },
    'ap-bio-u7-389': {
      prompt:
        'A population has p = 0.60 and q = 0.40, but observed genotype frequencies are 0.50 AA, 0.20 Aa, and 0.30 aa. Which conclusion is most defensible?',
      rationale:
        'The observed genotypes confirm p = 0.50 + 0.20/2 = 0.60 and q = 0.30 + 0.20/2 = 0.40, yet Hardy-Weinberg equilibrium predicts p^2 = 0.36 AA, 2pq = 0.48 Aa, and q^2 = 0.16 aa; this heterozygote deficit shows non-equilibrium without proving which specific assumption failed.',
      choiceRationales: [
        'With p = 0.50 + 0.10 = 0.60 and q = 0.30 + 0.10 = 0.40, expected Hardy-Weinberg frequencies are 0.36 AA, 0.48 Aa, and 0.16 aa; the observed 0.50, 0.20, and 0.30 deviate without identifying the exact cause.',
        'This option is not the best answer because allele frequencies always sum to one (p + q = 1) in any two-allele population, so that sum alone does not establish Hardy-Weinberg genotype equilibrium.',
        'This option is not the best answer because nonrandom mating such as inbreeding, selection, migration, or drift can each produce a heterozygote deficit, so mutation cannot be concluded without additional data.',
        'This option is not the best answer because a population carrying AA, Aa, and aa genotypes can actively reproduce even when its genotype distribution departs from random-mating equilibrium.',
      ],
    },
    'ap-bio-u7-492': {
      choices: [
        '0.04, because the recessive phenotype frequency is the heterozygote frequency.',
        '0.16, because p times q is the expected heterozygote frequency.',
        '0.80, because the dominant allele frequency is the same as the heterozygote frequency.',
        '0.32, because q is 0.20, p is 0.80, and 2pq equals 2 times 0.80 times 0.20.',
      ],
      rationale:
        'Under Hardy-Weinberg equilibrium, the recessive phenotype frequency equals q^2 = 0.04, giving q = sqrt(0.04) = 0.20 and p = 1 - 0.20 = 0.80; therefore the expected heterozygote frequency is 2pq = 2(0.80)(0.20) = 0.32.',
      choiceRationales: [
        'This option is not the best answer because 0.04 equals q squared, the frequency of homozygous recessive individuals rather than the frequency of heterozygous carriers.',
        'This option is not the best answer because 0.16 equals p times q (0.80 times 0.20), omitting the factor of 2 in 2pq required to count both Aa and aA heterozygote allele combinations.',
        'This option is not the best answer because 0.80 is the dominant allele frequency p (1 minus 0.20), which is a single-allele proportion rather than the diploid heterozygote genotype frequency.',
        'Because q^2 = 0.04 gives q = 0.20 and p = 0.80, the expected heterozygote frequency is 2pq = 2(0.80)(0.20) = 0.32.',
      ],
    },
    'ap-bio-u8-146': {
      rationale:
        'Using the Lincoln-Petersen mark-recapture estimator N = (M x C) / R, multiplying 40 initially marked turtles by 50 turtles in the second sample and dividing by 10 marked recaptures gives N = (40 x 50) / 10 = 200 turtles.',
      choiceRationales: [
        'This option is not the best answer because 20 turtles is one-tenth of the Lincoln-Petersen estimate (40 x 50 / 10 = 200), a tenfold error from dividing by 100 instead of the 10 marked recaptures.',
        'Using N = (M x C) / R, multiplying 40 marked turtles by 50 captured turtles and dividing by 10 marked recaptures estimates a population size of 200 turtles.',
        'This option is not the best answer because 90 turtles simply adds the two sample sizes (40 + 50) rather than scaling the marked count by the recapture proportion.',
        'This option is not the best answer because 2,000 turtles equals the raw product M x C (40 times 50) without dividing by the 10 marked turtles recaptured in the second sample.',
      ],
    },
    'ap-bio-u8-199': {
      rationale:
        'Dividing seed sizes reduces niche overlap between the two competing granivore species, lowering direct interspecific competition for the limiting seed supply and enabling stable coexistence via resource partitioning.',
      choiceRationales: [
        'This option is not the best answer because coexistence after dividing seed sizes shows that species can specialize on distinct resource subsets rather than always occupying identical niches.',
        'This option is not the best answer because mutualism requires a net benefit for both interacting species, whereas one species declined when forced to share the undivided seed supply.',
        'Partitioning the limiting seed supply by size reduces niche overlap and weakens interspecific competition, allowing both competing species to coexist.',
        'This option is not the best answer because seeds are a shared food resource consumed by the two competing species, not predators that capture and eat the animals.',
      ],
    },
    'ap-bio-u8-447': {
      choices: [
        '-0.02, because only net migration of 20 immigrants minus 30 emigrants determines growth.',
        '0.22, because the 90 births and 20 immigrants are added without counting any losses.',
        '0.10, because the net gain of 50 divided by the starting 500 animals equals 0.10.',
        '1.10, because the final population of 550 is divided by the initial population size.',
      ],
      rationale:
        'Total population change combines all additions minus removals: delta N = (90 births + 20 immigrants) - (30 deaths + 30 emigrants) = 110 - 60 = +50 fish; dividing by the initial 500 fish gives a per-capita growth rate of 50 / 500 = 0.10 per month.',
      choiceRationales: [
        'This option is not the best answer because -0.02 accounts only for net migration ((20 - 30) / 500) and ignores the 90 births and 30 deaths that produce an overall population increase.',
        'This option is not the best answer because 0.22 sums only additions ((90 + 20) / 500 = 110 / 500) while omitting the 30 deaths and 30 emigrants that must be subtracted.',
        'Net change equals (90 + 20) - (30 + 30) = +50 individuals, and dividing 50 by the initial 500 fish yields a monthly per-capita growth rate of 0.10.',
        'This option is not the best answer because 1.10 is the finite multiplication factor (550 / 500 = 1 + r) rather than the per-capita growth rate r = 0.10.',
      ],
    },
    'ap-bio-u8-497': {
      prompt:
        'A producer community contains 10,000 kilojoules of biomass energy, herbivores contain 1,000 kilojoules, and secondary consumers contain 100 kilojoules. Which conclusion is best supported?',
      rationale:
        'Energy drops from 10,000 kJ in producers to 1,000 kJ in herbivores (primary consumers) to 100 kJ in secondary consumers, showing roughly 10 percent transfer efficiency per trophic step while most energy is dissipated as metabolic heat or left unassimilated.',
      choiceRationales: [
        'The biomass-energy values decline tenfold across successive trophic levels (10,000 to 1,000 to 100 kJ), consistent with roughly 10 percent transfer efficiency per step.',
        'This option is not the best answer because although total energy is conserved thermodynamically, roughly 90 percent is dissipated as metabolic heat or unassimilated waste rather than entering the next trophic level.',
        'This option is not the best answer because available chemical energy decreases sharply from 10,000 kJ in producers down to 100 kJ in secondary consumers rather than concentrating upward.',
        'This option is not the best answer because nutrient atoms are recycled through ecosystems while usable chemical energy dissipates as heat; declining biomass energy does not mean matter is destroyed.',
      ],
    },
  },
};
