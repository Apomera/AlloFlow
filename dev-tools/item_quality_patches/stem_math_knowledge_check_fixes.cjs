'use strict';

// Verified Knowledge Check accuracy fixes for editable (non-hash-bound) learning libraries.
// Note: 15 additional Praxis Core 5752 knowledge-check rationale/choice findings
// (core5752-ch-02-check-03, ch-05-check-04, and 13 dual-variant math rationales in ch-07..ch-12)
// are logged read-only because praxis_core_5752_learning_library.json is hash-bound to
// dev-tools/authored/non_eppp_eppp_guided_qa_group_*.review.json.
module.exports = {
  ap_chemistry_foundation_pilot: {
    'ap-chem-ch-01-check-03': {
      choices: [
        'O2-, F-, Na+, Mg2+',
        'Na+, Mg2+, O2-, F-',
        'Mg2+, Na+, F-, O2-',
        'F-, O2-, Mg2+, Na+',
      ],
      rationale:
        'All four ions are isoelectronic with 10 electrons (1s2 2s2 2p6). As nuclear charge decreases from Mg2+ (Z = 12) to Na+ (Z = 11), F- (Z = 9), and O2- (Z = 8), Coulombic attraction weakens and the ionic radius increases.',
    },
    'ap-chem-ch-05-check-02': {
      choices: [
        'rate = k[NO2]',
        'rate = k[NO2]^2',
        'rate = k[N2O4]',
        'rate = k[NO2]/[N2O4]',
      ],
      rationale:
        'For the bimolecular elementary step 2 NO2 -> N2O4, molecularity directly sets the reaction order, so the rate law is rate = k[NO2]^2, proportional to the square of [NO2].',
    },
  },
};
