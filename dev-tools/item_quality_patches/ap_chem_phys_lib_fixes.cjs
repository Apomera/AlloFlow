'use strict';

// Verified mathematical, chemistry, and physics accuracy fixes for:
// 1. test_prep/ap_chemistry_foundation_pilot_learning_library.json
// 2. test_prep/ap_physics_1_foundation_pilot_learning_library.json
//
// Every rule's `find` matches EXACTLY ONCE in the raw target JSON string,
// produces valid JSON after replacement, preserves all IDs/uniqueness, and
// fixes a confirmed mathematical, stoichiometric, equilibrium, or physics error.
module.exports = {
  ap_chemistry_foundation_pilot: [
    {
      pathHint: 'quickReference[1] (ap-chem-reference-02).decisionRules[1]',
      find: 'because (+2)(−2) doubles the charge product.',
      replace: 'because (+2)(−2) quadruples the charge product.',
      reason: 'MgO has |q1·q2| = |(+2)(-2)| = 4 vs. NaF |(+1)(-1)| = 1; doubling each ion charge quadruples (4x) the charge product, not doubles (2x).',
    },
    {
      pathHint: 'chapters[3].sections[1] (ap-chem-ch-04-section-02).workedExample.steps[0]',
      find: 'n(Cl2) = 14.2 / 70.90 = 0.200 mol Cl2.',
      replace: 'n(Cl2) = 14.2 / 70.90 = 0.2003 mol Cl2.',
      reason: 'Keep the 4th guard digit (14.2 / 70.90 = 0.200282 -> 0.2003 mol) so Step 2 matches 0.2003 * (2/3) = 0.1335 mol and yields exact 3-sig-fig 17.8 g AlCl3.',
    },
    {
      pathHint: 'chapters[3].sections[1] (ap-chem-ch-04-section-02).workedExample.steps[1]',
      find: 'while Cl2 gives 0.200 × (2/3) = 0.1335 mol, so Cl2 is limiting.',
      replace: 'while Cl2 gives 0.2003 × (2/3) = 0.1335 mol, so Cl2 is limiting.',
      reason: '0.200 * (2/3) = 0.1333, not 0.1335; using the unrounded guard value 0.2003 mol Cl2 makes 0.2003 * (2/3) = 0.1335 mol arithmetically exact.',
    },
    {
      pathHint: 'constructedResponseWorkshops[1] (ap-chem-workshop-02).stimulus',
      find: 'CH2F2 has a boiling point about 100 degrees higher than CF4',
      replace: 'CH2F2 has a boiling point about 76 degrees higher than CF4',
      reason: 'Actual normal boiling points are CF4 = -127.8 °C and CH2F2 = -51.7 °C, a difference of 76.1 °C (not ~100 °C).',
    },
    {
      pathHint: 'constructedResponseWorkshops[3] (ap-chem-workshop-04).successCriteria[1]',
      find: 'Aluminum is 0.0200 mol and copper ions are 0.0400 mol, and copper ion is identified as limiting by the 2 to 3 ratio.',
      replace: 'Aluminum is 0.0200 mol and copper ions are 0.0400 mol, and aluminum is identified as limiting by the 2 to 3 ratio.',
      reason: 'In 2 Al + 3 Cu2+ -> 2 Al3+ + 3 Cu, 0.0200 mol Al requires 0.0300 mol Cu2+ (leaving 0.0100 mol Cu2+ excess), while 0.0400 mol Cu2+ requires 0.0267 mol Al; Al is the limiting reactant, not Cu2+.',
    },
    {
      pathHint: 'constructedResponseWorkshops[3] (ap-chem-workshop-04).successCriteria[2]',
      find: 'The mass of copper formed is about 2.54 grams from 0.0400 mol of copper ions.',
      replace: 'The mass of copper formed is about 1.91 grams from 0.0300 mol of copper produced by limiting aluminum.',
      reason: 'Limiting 0.020015 mol Al forms (3/2) * 0.020015 = 0.03002 mol Cu -> 0.03002 * 63.55 = 1.91 g Cu (not 0.0400 mol / 2.54 g).',
    },
    {
      pathHint: 'constructedResponseWorkshops[3] (ap-chem-workshop-04).successCriteria[3]',
      find: 'The prediction states that the blue color fades and some aluminum remains, because copper ion is consumed.',
      replace: 'The prediction states that the aluminum strip is completely consumed and the solution fades to a lighter blue, because excess copper ions remain.',
      reason: 'Because Al is limiting, all Al dissolves and 0.0100 mol Cu2+ remains in solution, so the blue color lightens rather than vanishing and no aluminum strip remains.',
    },
    {
      pathHint: 'constructedResponseWorkshops[3] (ap-chem-workshop-04).commonPitfalls[3]',
      find: 'Predicting the solution stays blue when the limiting reactant is the copper ion.',
      replace: 'Predicting the solution turns completely colorless or that aluminum remains when aluminum is the limiting reactant.',
      reason: 'Align pitfall with the true limiting reactant (Al), where excess Cu2+ keeps the solution light blue and Al is fully consumed.',
    },
    {
      pathHint: 'constructedResponseWorkshops[3] (ap-chem-workshop-04).sampleOutline[1]',
      find: 'Limiting: 0.0200 mol Al needs 0.0300 mol Cu2+; 0.0400 mol Cu2+ needs 0.0267 mol Al, so Cu2+ limits.',
      replace: 'Limiting: 0.0200 mol Al needs 0.0300 mol Cu2+ (leaving 0.0100 mol Cu2+ excess); 0.0400 mol Cu2+ needs 0.0267 mol Al, so Al limits.',
      reason: 'Sample outline itself showed 0.0400 mol Cu2+ needs 0.0267 mol Al > 0.0200 mol available, which proves Al (not Cu2+) is limiting.',
    },
    {
      pathHint: 'constructedResponseWorkshops[3] (ap-chem-workshop-04).sampleOutline[2]',
      find: 'Outcome: 0.0400 mol Cu, about 2.54 g; blue fades, aluminum strip partly remains.',
      replace: 'Outcome: 0.0300 mol Cu, about 1.91 g; aluminum strip is consumed and solution fades to a lighter blue.',
      reason: 'Limiting Al yields 0.0300 mol (1.91 g) Cu, consumes the Al strip completely, and leaves 0.0100 mol Cu2+ in solution.',
    },
    {
      pathHint: 'constructedResponseWorkshops[7] (ap-chem-workshop-08).stimulus',
      find: 'The pH is 2.9 at the start, 4.2 after 10.0 milliliters of base, and rises steeply near 20.0 milliliters, reaching 8.9 at the equivalence point.',
      replace: 'The pH is 2.7 at the start, 4.2 after 10.0 milliliters of base, and rises steeply near 20.0 milliliters, reaching 8.4 at the equivalence point.',
      reason: 'For 0.0800 M weak acid with pKa = 4.2 (Ka = 6.31e-5) at 25 °C: initial [H3O+] = 2.215e-3 M gives pH = 2.65 (~2.7, not 2.9), and equivalence [A-] = 0.04444 M with Kb = 1.585e-10 gives [OH-] = 2.654e-6 M, pH = 8.42 (~8.4, not 8.9).',
    },
    {
      pathHint: 'constructedResponseWorkshops[7] (ap-chem-workshop-08).sampleOutline[1]',
      find: 'Equivalence: only the conjugate base remains; it is a weak base, so pH 8.9.',
      replace: 'Equivalence: only the conjugate base remains; it is a weak base, so pH 8.4.',
      reason: 'Keep sampleOutline consistent with the corrected equivalence pH = 8.42 (~8.4) for 0.0444 M conjugate base with pKa = 4.2 at 25 °C.',
    },
  ],
  ap_physics_1_foundation_pilot: [
    {
      pathHint: 'chapters[0].sections[2] (ap-physics-1-ch-01-section-03).contentBlocks[4].items[2]',
      find: '"text": "Changing frames does not change the physical displacement between events.",\n                  "runs": [\n                    {\n                      "text": "Changing frames does not change the physical displacement between events."',
      replace: '"text": "Changing inertial frames does not change acceleration, even though velocity and displacement over time depend on the frame.",\n                  "runs": [\n                    {\n                      "text": "Changing inertial frames does not change acceleration, even though velocity and displacement over time depend on the frame."',
      reason: 'Under Galilean relativity (Δx\' = Δx - v_rel·Δt), displacement between non-simultaneous events DOES change with reference frame; acceleration (not displacement over time) is invariant across inertial frames.',
    },
    {
      pathHint: 'chapters[0].sections[2] (ap-physics-1-ch-01-section-03).nonExamples[2]',
      find: '"A residual pattern is not random noise by definition.",\n            "Changing frames does not change the physical displacement between events."',
      replace: '"A residual pattern is not random noise by definition.",\n            "Changing inertial frames does not change acceleration, even though velocity and displacement over time depend on the frame."',
      reason: 'Keep nonExamples[2] synchronized with contentBlocks[4].items[2]; displacement over a nonzero time interval is frame-dependent under Galilean transformations.',
    },
    {
      pathHint: 'chapters[1].sections[1] (ap-physics-1-ch-02-section-02).contentBlocks[7].rows[0].cells[1]',
      find: '"text": "External interaction",\n                      "runs": [\n                        {\n                          "text": "External interaction"',
      replace: '"text": "Key interaction",\n                      "runs": [\n                        {\n                          "text": "Key interaction"',
      reason: 'Row 2 of this table lists "block plus Earth" with "gravity" labeled "internal energy interaction", contradicting the column header "External interaction" (gravity is internal to the block-Earth system).',
    },
    {
      pathHint: 'chapters[1].sections[1] (ap-physics-1-ch-02-section-02).workedDataExample.rows[0][1]',
      find: '"System",\n                "External interaction",\n                "Model role"',
      replace: '"System",\n                "Key interaction",\n                "Model role"',
      reason: 'Keep workedDataExample table header synchronized with contentBlocks[7] so gravity in the "block plus Earth" system is not misclassified as an external interaction.',
    },
  ],
};
