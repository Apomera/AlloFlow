'use strict';

// Surgical, single-match, idempotent scientific & quantitative accuracy fixes for:
//   1. test_prep/ap_biology_foundation_pilot_learning_library.json
//   2. test_prep/ap_psychology_pilot_learning_library.json
//
// Each rule's `find` string matches EXACTLY ONCE in its target library JSON file.
// Applying a rule once replaces the exact error; re-applying finds 0 matches (idempotent).

module.exports = {
  ap_biology_foundation_pilot: [
    // 1a-c. ap-bio-workshop-05: Incomplete dominance cross 1 parental phenotype, observed counts, and cross 2 terminology
    {
      pathHint: 'constructedResponseWorkshops[4].stimulus (ap-bio-workshop-05)',
      find: '"stimulus": "Original synthetic scenario: In a plant species, a cross between two red-flowered plants produces 121 red, 62 pink, and 58 white offspring. A separate cross between a pink plant and a white plant produces 48 pink and 51 white offspring."',
      replace: '"stimulus": "Original synthetic scenario: In a plant species, a cross between two pink-flowered plants produces 62 red, 121 pink, and 58 white offspring. A separate cross between a pink plant and a white plant produces 48 pink and 51 white offspring."',
      reason: 'Under incomplete dominance (RR red, RW pink, WW white), two red-flowered parents (RR x RR) would yield 100% red offspring rather than red/pink/white, and 121 red : 62 pink : 58 white is a 2:1:1 ratio (chi^2 = 89.73 vs 1:2:1) rather than the RW x RW 1:2:1 ratio (62 red, 121 pink, 58 white; total 241, expected ~60:120:60, chi^2 = 0.13) described in successCriteria and sampleOutline.',
    },
    {
      pathHint: 'constructedResponseWorkshops[4].sampleOutline[1] (ap-bio-workshop-05)',
      find: '"Cross 1: RW × RW gives 1 RR, 2 RW, 1 WW; expected about 60, 120, 60 versus observed 121, 62, 58."',
      replace: '"Cross 1: RW × RW gives 1 RR, 2 RW, 1 WW; expected about 60, 120, 60 versus observed 62, 121, 58."',
      reason: 'Align Cross 1 observed counts (62 RR, 121 RW, 58 WW) with the 1:2:1 incomplete-dominance expectation (about 60, 120, 60).',
    },
    {
      pathHint: 'constructedResponseWorkshops[4].successCriteria[2] (ap-bio-workshop-05)',
      find: '"The second cross is treated as heterozygote by homozygous recessive, giving an expected 1 to 1 ratio."',
      replace: '"The second cross is treated as heterozygote by homozygous white, giving an expected 1 to 1 ratio."',
      reason: 'In incomplete dominance (RR red, RW pink, WW white), neither allele is dominant or recessive; WW is homozygous white, not homozygous recessive.',
    },

    // 2. ap-bio-ch-01-section-03: Chargaff's rules contradiction in workedDataExample + contentBlocks table
    {
      pathHint: 'chapters[0].sections[2].contentBlocks[table].rows[2].cells[2].text (ap-bio-ch-01-section-03)',
      find: '"kind": "cell",\n                      "text": "The exact percentage of guanine without further data on the remaining bases."',
      replace: '"kind": "cell",\n                      "text": "The specific sequence of bases or which genes the DNA encodes."',
      reason: 'When double-stranded DNA has 30% adenine and A=T pairing gives ~30% thymine, Chargaff\'s rules (A+T+G+C=100%, G=C) directly establish ~20% guanine and ~20% cytosine; what 30% adenine does not establish is the base sequence or gene content.',
    },
    {
      pathHint: 'chapters[0].sections[2].contentBlocks[table].rows[2].cells[2].runs[0].text (ap-bio-ch-01-section-03)',
      find: '"type": "text",\n                          "text": "The exact percentage of guanine without further data on the remaining bases."',
      replace: '"type": "text",\n                          "text": "The specific sequence of bases or which genes the DNA encodes."',
      reason: 'Keep contentBlocks table cell run synchronized with Chargaff\'s-rule correction in ap-bio-ch-01-section-03.',
    },
    {
      pathHint: 'chapters[0].sections[2].workedDataExample.rows[1][2] (ap-bio-ch-01-section-03)',
      find: '"Thymine is also about 30 percent because adenine pairs with thymine.",\n                "The exact percentage of guanine without further data on the remaining bases."',
      replace: '"Thymine is also about 30 percent because adenine pairs with thymine.",\n                "The specific sequence of bases or which genes the DNA encodes."',
      reason: 'Keep workedDataExample synchronized with Chargaff\'s-rule correction in ap-bio-ch-01-section-03.',
    },

    // 3. ap-bio-ch-05-section-01: Clones vs. genotype-difference contradiction in workedDataExample + contentBlocks table
    {
      pathHint: 'chapters[4].sections[0].contentBlocks[table].rows[3].cells[0].text (ap-bio-ch-05-section-01)',
      find: '"kind": "cell",\n                      "text": "Clones grown in a shared environment remain different in height."',
      replace: '"kind": "cell",\n                      "text": "Genetically distinct plant lines grown in a shared environment remain different in height."',
      reason: 'Clones share an identical genotype, so height differences among clones in a shared environment cannot support the claim that genotype contributes to the phenotype difference; a common-garden comparison of genetically distinct lines does.',
    },
    {
      pathHint: 'chapters[4].sections[0].contentBlocks[table].rows[3].cells[0].runs[0].text (ap-bio-ch-05-section-01)',
      find: '"type": "text",\n                          "text": "Clones grown in a shared environment remain different in height."',
      replace: '"type": "text",\n                          "text": "Genetically distinct plant lines grown in a shared environment remain different in height."',
      reason: 'Keep contentBlocks table cell run synchronized with clones-vs-genotype correction in ap-bio-ch-05-section-01.',
    },
    {
      pathHint: 'chapters[4].sections[0].workedDataExample.rows[2][0] (ap-bio-ch-05-section-01)',
      find: '"Clones grown in a shared environment remain different in height.",\n                "Genotype contributes to the phenotype difference."',
      replace: '"Genetically distinct plant lines grown in a shared environment remain different in height.",\n                "Genotype contributes to the phenotype difference."',
      reason: 'Keep workedDataExample synchronized with clones-vs-genotype correction in ap-bio-ch-05-section-01.',
    },

    // 4. ap-bio-ch-02-section-02 & ap-bio-card-02-s2: Ribosomes misclassified as eukaryotic membrane-bound compartments
    {
      pathHint: 'chapters[1].sections[1].content (ap-bio-ch-02-section-02)',
      find: '"content": "Eukaryotic cells organize work into membrane-bound compartments: ribosomes build proteins, the endoplasmic reticulum and Golgi modify and route them, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      replace: '"content": "In eukaryotic cells, ribosomes build proteins while membrane-bound compartments organize specialized work: the endoplasmic reticulum and Golgi modify and route proteins, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      reason: 'Ribosomes are non-membrane-bound ribonucleoprotein complexes present in both prokaryotes and eukaryotes, not eukaryotic membrane-bound compartments lacking in prokaryotes.',
    },
    {
      pathHint: 'chapters[1].sections[1].contentBlocks[0].text (ap-bio-ch-02-section-02)',
      find: '"type": "paragraph",\n              "text": "Eukaryotic cells organize work into membrane-bound compartments: ribosomes build proteins, the endoplasmic reticulum and Golgi modify and route them, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      replace: '"type": "paragraph",\n              "text": "In eukaryotic cells, ribosomes build proteins while membrane-bound compartments organize specialized work: the endoplasmic reticulum and Golgi modify and route proteins, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      reason: 'Keep contentBlocks[0].text synchronized with non-membrane-bound ribosome correction in ap-bio-ch-02-section-02.',
    },
    {
      pathHint: 'chapters[1].sections[1].contentBlocks[0].runs[0].text (ap-bio-ch-02-section-02)',
      find: '"type": "text",\n                  "text": "Eukaryotic cells organize work into membrane-bound compartments: ribosomes build proteins, the endoplasmic reticulum and Golgi modify and route them, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      replace: '"type": "text",\n                  "text": "In eukaryotic cells, ribosomes build proteins while membrane-bound compartments organize specialized work: the endoplasmic reticulum and Golgi modify and route proteins, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      reason: 'Keep contentBlocks[0].runs[0].text synchronized with non-membrane-bound ribosome correction in ap-bio-ch-02-section-02.',
    },
    {
      pathHint: 'flashcards[4].back (ap-bio-card-02-s2)',
      find: '"back": "Eukaryotic cells organize work into membrane-bound compartments: ribosomes build proteins, the endoplasmic reticulum and Golgi modify and route them, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      replace: '"back": "In eukaryotic cells, ribosomes build proteins while membrane-bound compartments organize specialized work: the endoplasmic reticulum and Golgi modify and route proteins, lysosomes digest, mitochondria and chloroplasts transform energy, and the nucleus houses DNA.',
      reason: 'Keep flashcard ap-bio-card-02-s2 synchronized with non-membrane-bound ribosome correction.',
    },

    // 5. ap-bio-ch-02-section-01: Nonexistent biological term "Negative tonicity"
    {
      pathHint: 'chapters[1].sections[0].contentBlocks[list].items[1].text (ap-bio-ch-02-section-01)',
      find: '"text": "Negative tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance.",\n                  "runs":',
      replace: '"text": "Tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance.",\n                  "runs":',
      reason: 'Tonicity is qualitative (hypotonic, isotonic, hypertonic), not signed positive/negative (water/solute potential is signed); "Negative tonicity" is a nonexistent biological term.',
    },
    {
      pathHint: 'chapters[1].sections[0].contentBlocks[list].items[1].runs[0].text (ap-bio-ch-02-section-01)',
      find: '"type": "text",\n                      "text": "Negative tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance."',
      replace: '"type": "text",\n                      "text": "Tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance."',
      reason: 'Keep contentBlocks list run synchronized with tonicity terminology correction in ap-bio-ch-02-section-01.',
    },
    {
      pathHint: 'chapters[1].sections[0].nonExamples[1] (ap-bio-ch-02-section-01)',
      find: '"Water movement does not mean every solute crosses the membrane with water.",\n            "Negative tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance."',
      replace: '"Water movement does not mean every solute crosses the membrane with water.",\n            "Tonicity is not a transport mechanism; tonicity describes the effect of a solution on cell water balance."',
      reason: 'Keep nonExamples[1] synchronized with tonicity terminology correction in ap-bio-ch-02-section-01.',
    },

    // 6. ap-bio-ch-02-section-02: Fluid vs. mosaic model definition swap in commonMisconceptions + contentBlocks
    {
      pathHint: 'chapters[1].sections[1].contentBlocks[misconception].text (ap-bio-ch-02-section-02)',
      find: 'Common misconception.Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally, which is why it is described as a mosaic.',
      replace: 'Common misconception. Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally (making it fluid), while diverse embedded proteins and cholesterol form a mosaic.',
      reason: 'In the fluid mosaic model, lateral movement of lipids and proteins explains why the membrane is "fluid", whereas diverse embedded proteins, glycoproteins, and cholesterol explain why it is a "mosaic".',
    },
    {
      pathHint: 'chapters[1].sections[1].contentBlocks[misconception].runs[1].text (ap-bio-ch-02-section-02)',
      find: '"text": "Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally, which is why it is described as a mosaic."\n                }\n              ]',
      replace: '"text": " Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally (making it fluid), while diverse embedded proteins and cholesterol form a mosaic."\n                }\n              ]',
      reason: 'Keep contentBlocks misconception run synchronized with fluid-vs-mosaic correction in ap-bio-ch-02-section-02.',
    },
    {
      pathHint: 'chapters[1].sections[1].commonMisconceptions[0] (ap-bio-ch-02-section-02)',
      find: '"Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally, which is why it is described as a mosaic."\n          ],\n          "workedDataExample"',
      replace: '"Membrane proteins are not fixed in place; the membrane is a fluid layer in which lipids and many proteins move laterally (making it fluid), while diverse embedded proteins and cholesterol form a mosaic."\n          ],\n          "workedDataExample"',
      reason: 'Keep commonMisconceptions[0] synchronized with fluid-vs-mosaic correction in ap-bio-ch-02-section-02.',
    },
  ],

  ap_psychology_pilot: [
    // 1. quickReference[2] (ap-psych-reference-03): Fixed-ratio schedule mislabeled as "scallop"
    {
      pathHint: 'quickReference[2].formulas[3] (ap-psych-reference-03)',
      find: 'Operant schedules: fixed-ratio (scallop pause-run), variable-ratio (highest steady rate, most resistant to extinction), fixed-interval (scalloped ramp near deadline)',
      replace: 'Operant schedules: fixed-ratio (high rate with post-reinforcement pause), variable-ratio (highest steady rate, most resistant to extinction), fixed-interval (scalloped ramp near deadline)',
      reason: 'A scalloped cumulative-record curve is the signature of a fixed-interval (FI) schedule, not a fixed-ratio (FR) schedule; FR produces a high steady rate with a brief post-reinforcement pause (break-and-run / stair-step pattern).',
    },

    // 2. ap-psych-ch-01-section-02 workedExample: Beta-adrenergic receptors misclassified as ligand-gated ion channels
    {
      pathHint: 'chapters[0].sections[1].workedExample.steps[1] (ap-psych-ch-01-section-02)',
      find: 'Step 2: Trace the neural pathway: blocking receptor binding prevents ligand-gated ion channels from depolarizing target cells to threshold, dampening downstream sympathetic fight-or-flight responses such as elevated heart rate.',
      replace: 'Step 2: Trace the neural pathway: blocking adrenergic receptor binding prevents norepinephrine and epinephrine from activating intracellular signaling in target organs, dampening downstream sympathetic fight-or-flight responses such as elevated heart rate.',
      reason: 'Beta-adrenergic receptors are G-protein-coupled (metabotropic) receptors, not ligand-gated (ionotropic) ion channels; beta-blockers inhibit norepinephrine/epinephrine-driven GPCR/cAMP signaling in cardiac and sympathetic target tissues.',
    },

    // 3. ap-psych-ch-01-section-02: Action potential amplitude stated as "2 mV" instead of ~100 mV (4 synchronized occurrences)
    {
      pathHint: 'chapters[0].sections[1].content (ap-psych-ch-01-section-02)',
      find: 'Worked data moment: Spike amplitude remains near 2 mV while firing rate rises from 10 to 30 spikes/second.',
      replace: 'Worked data moment: Spike amplitude remains near 100 mV while firing rate rises from 10 to 30 spikes/second.',
      reason: 'Intracellular neuronal action potentials span roughly -70 mV resting potential to +30 mV peak (~100 mV amplitude), matching ap-psych-reference-01; 2 mV is off by ~50x on the AP Psychology membrane-potential scale.',
    },
    {
      pathHint: 'chapters[0].sections[1].contentBlocks[table].rows[1].cells[0].text (ap-psych-ch-01-section-02)',
      find: '"kind": "cell",\n                      "text": "Spike amplitude remains near 2 mV while firing rate rises from 10 to 30 spikes/second."',
      replace: '"kind": "cell",\n                      "text": "Spike amplitude remains near 100 mV while firing rate rises from 10 to 30 spikes/second."',
      reason: 'Keep contentBlocks table cell text synchronized with ~100 mV action-potential amplitude correction in ap-psych-ch-01-section-02.',
    },
    {
      pathHint: 'chapters[0].sections[1].contentBlocks[table].rows[1].cells[0].runs[0].text (ap-psych-ch-01-section-02)',
      find: '"type": "text",\n                          "text": "Spike amplitude remains near 2 mV while firing rate rises from 10 to 30 spikes/second."',
      replace: '"type": "text",\n                          "text": "Spike amplitude remains near 100 mV while firing rate rises from 10 to 30 spikes/second."',
      reason: 'Keep contentBlocks table cell run synchronized with ~100 mV action-potential amplitude correction in ap-psych-ch-01-section-02.',
    },
    {
      pathHint: 'chapters[0].sections[1].workedDataExample.rows[0][0] (ap-psych-ch-01-section-02)',
      find: '"rows": [\n              [\n                "Spike amplitude remains near 2 mV while firing rate rises from 10 to 30 spikes/second."',
      replace: '"rows": [\n              [\n                "Spike amplitude remains near 100 mV while firing rate rises from 10 to 30 spikes/second."',
      reason: 'Keep workedDataExample synchronized with ~100 mV action-potential amplitude correction in ap-psych-ch-01-section-02.',
    },
  ],
};
