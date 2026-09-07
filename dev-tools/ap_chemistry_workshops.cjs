#!/usr/bin/env node
'use strict';

// Original, unscored written-response planning workshops for AP Chemistry, one
// per unit, in the shape the Hub's written-response renderer reads: three task
// parts, a four-step planning frame, four success criteria, four common
// pitfalls, a three-point sample outline, and an original synthetic stimulus.
//
// Planning and self-check resources only. Not official AP free-response
// questions, College Board rubrics, scored responses, or predictions; stimuli
// are invented for practice. Original text; no CED, OpenStax, or assessment
// content reproduced.

const REVIEW_NOTE = 'Original unscored planning workshop with a synthetic stimulus. AlloFlow does not score written responses. Not an official AP Chemistry free-response question, rubric, or score; AP Chemistry subject-expert, laboratory, accessibility, and rights review remain pending.';

const AP_CHEMISTRY_WORKSHOPS = Object.freeze([
  {
    unit: 1, topicIds: ['1.6', '1.7'], taskType: 'Evidence from spectra and trends',
    title: 'Identify an element from a photoelectron spectrum',
    prompt: 'Plan a response that uses a photoelectron spectrum to determine an element’s electron configuration, justifies the identification, and predicts one periodic property from it. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic data: A photoelectron spectrum of a neutral atom shows four peaks. In order of decreasing binding energy their relative heights are 2, 2, 6, and 1. The lowest-energy peak sits at a noticeably smaller binding energy than the peak of height 6.',
    taskParts: [
      'Assign each peak to a subshell and write the electron configuration the spectrum supports, explaining how peak height and position were used.',
      'Identify the element and justify the identification from the total electron count and the configuration.',
      'Predict whether this element’s first ionization energy is higher or lower than that of the element immediately before it in the periodic table, and explain using Coulomb’s law.',
    ],
    planningFrame: [
      { label: 'Read', guidance: 'Match each peak height to an electron count and each position to a shell distance from the nucleus.' },
      { label: 'Configure', guidance: 'Write the subshells in order of decreasing binding energy and total the electrons.' },
      { label: 'Identify', guidance: 'Use the electron count of a neutral atom to name the element.' },
      { label: 'Predict', guidance: 'Compare effective nuclear charge and shell for the property asked, then state the direction.' },
    ],
    successCriteria: [
      'Peaks are assigned as 1s, 2s, 2p, and 3s with heights matching electron counts of 2, 2, 6, and 1.',
      'The element is identified as sodium from eleven electrons in a neutral atom.',
      'The single 3s electron is recognized as being in a new shell, more shielded and farther from the nucleus.',
      'The ionization energy prediction is lower than neon’s and is justified by shielding and distance, not by mass.',
    ],
    commonPitfalls: [
      'Reading a taller peak as a higher binding energy rather than as more electrons.',
      'Placing the 3s electron in the same shell as the 2p electrons because its peak is adjacent.',
      'Identifying the element from the number of peaks instead of the total electron count.',
      'Predicting the ionization trend from atomic mass rather than from effective nuclear charge.',
    ],
    sampleOutline: [
      'Configuration: 1s2 2s2 2p6 3s1 from heights 2, 2, 6, 1 in order of binding energy.',
      'Identity: eleven electrons in a neutral atom, so sodium.',
      'Prediction: the 3s electron is well shielded and far from the nucleus, so first ionization energy is much lower than neon’s.',
    ],
  },
  {
    unit: 2, topicIds: ['2.5', '2.7'], taskType: 'Structure to property argument',
    title: 'Predict polarity from a Lewis structure',
    prompt: 'Plan a response that draws a molecule’s Lewis structure, uses geometry to decide whether it is polar, and connects that decision to an observable property. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: Two compounds have the formulas CF4 and CH2F2. A student measures that CH2F2 has a boiling point about 100 degrees higher than CF4 even though CF4 has the greater molar mass, and asks why.',
    taskParts: [
      'Draw or describe the Lewis structure and molecular geometry of each compound, including the electron-domain arrangement around carbon.',
      'Determine whether each molecule has a net dipole moment and justify the answer from bond polarity and geometry.',
      'Explain the boiling point difference using intermolecular forces, and identify which comparison the molar masses alone would have predicted.',
    ],
    planningFrame: [
      { label: 'Structure', guidance: 'Count valence electrons, place bonds and lone pairs, and name the electron-domain geometry.' },
      { label: 'Bond dipoles', guidance: 'Mark each polar bond with its direction from electronegativity differences.' },
      { label: 'Net dipole', guidance: 'Decide whether the bond dipoles cancel by symmetry or add to a net moment.' },
      { label: 'Property', guidance: 'Link a net dipole to dipole-dipole forces and to the boiling point, then note what mass alone predicts.' },
    ],
    successCriteria: [
      'Both molecules are described as tetrahedral around carbon with four bonding domains and no lone pairs on carbon.',
      'CF4 is identified as nonpolar because four equal carbon-fluorine dipoles cancel, and CH2F2 as polar because they do not.',
      'The boiling point difference is attributed to dipole-dipole attractions in CH2F2 in addition to dispersion forces.',
      'The response notes that dispersion forces and molar mass alone would predict the opposite order.',
    ],
    commonPitfalls: [
      'Concluding a molecule is polar because it contains polar bonds, without checking geometry.',
      'Describing CH2F2 as having a different electron-domain geometry from CF4.',
      'Attributing the higher boiling point to hydrogen bonding, which CH2F2 cannot form.',
      'Ignoring that CF4 has stronger dispersion forces from its greater electron count.',
    ],
    sampleOutline: [
      'Structures: both tetrahedral; CF4 has four identical polar bonds, CH2F2 has two carbon-fluorine and two carbon-hydrogen bonds.',
      'Polarity: CF4 dipoles cancel by symmetry; CH2F2 dipoles reinforce toward the fluorines, giving a net dipole.',
      'Property: dipole-dipole attraction raises the boiling point of CH2F2 above what its smaller dispersion forces would give.',
    ],
  },
  {
    unit: 3, topicIds: ['3.4', '3.13'], taskType: 'Quantitative reasoning from measurements',
    title: 'Use a calibration curve and the ideal gas law',
    prompt: 'Plan a response that determines an unknown concentration from absorbance data and then uses gas measurements to find an amount of substance, stating assumptions at each step. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic data: Standard solutions of a blue dye give absorbances of 0.10, 0.20, 0.40, and 0.60 at concentrations of 0.050, 0.100, 0.200, and 0.300 millimolar in a 1.00 cm cell. An unknown solution reads 0.28. Separately, a reaction releases a gas that is collected over water; the collected gas occupies 245 milliliters at 298 kelvin and a total pressure of 101.3 kilopascals, and the vapor pressure of water at that temperature is 3.2 kilopascals.',
    taskParts: [
      'Determine the concentration of the unknown dye solution from the calibration data and state the relationship you relied on.',
      'Calculate the moles of gas collected, showing how the water vapor pressure is handled.',
      'Identify one assumption behind each calculation and describe an observation that would show the assumption had failed.',
    ],
    planningFrame: [
      { label: 'Relationship', guidance: 'Name the law that links absorbance to concentration and check that the standards are linear.' },
      { label: 'Interpolate', guidance: 'Find the concentration whose absorbance matches the unknown, staying within the calibrated range.' },
      { label: 'Correct', guidance: 'Subtract water vapor pressure to get the partial pressure of the collected gas before using the gas law.' },
      { label: 'Assume', guidance: 'State the ideal-gas and linear-absorbance assumptions and what would violate each.' },
    ],
    successCriteria: [
      'The unknown is found near 0.14 millimolar by linear interpolation using the Beer-Lambert relationship.',
      'The gas pressure used is 98.1 kilopascals after subtracting water vapor pressure.',
      'The gas calculation gives about 0.0097 moles using consistent units for R, pressure, and volume.',
      'Each assumption is paired with a specific failure sign, such as a curved calibration plot or deviation at high pressure.',
    ],
    commonPitfalls: [
      'Using the total pressure without subtracting the water vapor contribution.',
      'Extrapolating the calibration curve beyond the highest standard.',
      'Mixing kilopascals with a value of R expressed in atmospheres.',
      'Stating that absorbance is proportional to concentration without noting the fixed path length and wavelength.',
    ],
    sampleOutline: [
      'Dye: absorbance is proportional to concentration; 0.28 falls between 0.20 and 0.40, giving about 0.14 millimolar.',
      'Gas: partial pressure 101.3 minus 3.2 equals 98.1 kilopascals; n equals PV divided by RT, about 0.0097 mol.',
      'Assumptions: linear response within the calibrated range; ideal behavior at near-atmospheric pressure.',
    ],
  },
  {
    unit: 4, topicIds: ['4.5', '4.9'], taskType: 'Stoichiometry and reaction analysis',
    title: 'Analyze a redox reaction quantitatively',
    prompt: 'Plan a response that balances a redox reaction, identifies the limiting reactant from given amounts, and predicts the observable outcome. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: A strip of aluminum with mass 0.540 grams is placed in 100.0 milliliters of 0.400 molar copper(II) sulfate solution. The aluminum is oxidized to aluminum ions and copper ions are reduced to copper metal. The solution is initially blue.',
    taskParts: [
      'Write the balanced net ionic equation, identify the species oxidized and reduced, and state the number of electrons transferred per formula unit of reaction.',
      'Determine which reactant is limiting and calculate the mass of copper metal that can form.',
      'Predict what the solution and the strip will look like when the reaction stops, and justify the prediction from the limiting reactant.',
    ],
    planningFrame: [
      { label: 'Half-reactions', guidance: 'Write the oxidation and reduction halves and balance electrons before combining.' },
      { label: 'Moles', guidance: 'Convert the aluminum mass and the copper ion solution to moles.' },
      { label: 'Compare', guidance: 'Use the balanced ratio to find which reactant runs out first.' },
      { label: 'Observe', guidance: 'Translate the leftover reactant into what would be seen in the beaker.' },
    ],
    successCriteria: [
      'The net ionic equation is 2 Al + 3 Cu2+ → 2 Al3+ + 3 Cu with six electrons transferred.',
      'Aluminum is 0.0200 mol and copper ions are 0.0400 mol, and copper ion is identified as limiting by the 2 to 3 ratio.',
      'The mass of copper formed is about 2.54 grams from 0.0400 mol of copper ions.',
      'The prediction states that the blue color fades and some aluminum remains, because copper ion is consumed.',
    ],
    commonPitfalls: [
      'Comparing moles directly without applying the 2 to 3 stoichiometric ratio.',
      'Treating the reactant with fewer moles as limiting without the ratio.',
      'Reporting the electrons per atom of aluminum as the total transferred in the balanced equation.',
      'Predicting the solution stays blue when the limiting reactant is the copper ion.',
    ],
    sampleOutline: [
      'Equation: 2 Al + 3 Cu2+ → 2 Al3+ + 3 Cu; aluminum oxidized, copper ion reduced.',
      'Limiting: 0.0200 mol Al needs 0.0300 mol Cu2+; 0.0400 mol Cu2+ needs 0.0267 mol Al, so Cu2+ limits.',
      'Outcome: 0.0400 mol Cu, about 2.54 g; blue fades, aluminum strip partly remains.',
    ],
  },
  {
    unit: 5, topicIds: ['5.2', '5.8'], taskType: 'Rate law from data and mechanism',
    title: 'Derive a rate law and test a mechanism',
    prompt: 'Plan a response that determines a rate law from initial-rate data, then evaluates whether a proposed mechanism is consistent with it. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic data for the reaction 2 NO + O2 → 2 NO2. Trial 1: [NO] 0.010 M, [O2] 0.010 M, rate 2.5 × 10−5 M/s. Trial 2: [NO] 0.020 M, [O2] 0.010 M, rate 1.0 × 10−4 M/s. Trial 3: [NO] 0.010 M, [O2] 0.020 M, rate 5.0 × 10−5 M/s. A proposed mechanism has a fast equilibrium 2 NO ⇌ N2O2 followed by a slow step N2O2 + O2 → 2 NO2.',
    taskParts: [
      'Determine the order with respect to each reactant and write the rate law with the value of the rate constant.',
      'Derive the rate law predicted by the proposed mechanism, explaining how the intermediate is handled.',
      'Decide whether the mechanism is consistent with the data, and state clearly what consistency does and does not prove.',
    ],
    planningFrame: [
      { label: 'Compare', guidance: 'Change one concentration at a time between trials and read the effect on rate.' },
      { label: 'Rate law', guidance: 'Write orders as exponents, then solve one trial for k with units.' },
      { label: 'Mechanism', guidance: 'Write the slow-step rate law, then replace the intermediate using the fast equilibrium.' },
      { label: 'Judge', guidance: 'Match the derived law to the experimental one and state the limit of that evidence.' },
    ],
    successCriteria: [
      'The reaction is found to be second order in NO and first order in O2, giving rate equals k[NO]2[O2].',
      'The rate constant is about 25 M−2 s−1, with units derived rather than assumed.',
      'The intermediate N2O2 is replaced using K[NO]2 from the fast equilibrium, giving the same form.',
      'The response states the mechanism is consistent with, but not proven by, the data.',
    ],
    commonPitfalls: [
      'Reading the orders from the coefficients of the overall equation.',
      'Leaving the intermediate in the final rate law.',
      'Reporting k without units or with units for the wrong overall order.',
      'Claiming the data prove the mechanism rather than that they fail to rule it out.',
    ],
    sampleOutline: [
      'Data: doubling NO quadruples the rate, second order; doubling O2 doubles it, first order.',
      'Rate law: rate equals k[NO]2[O2], k equals 2.5 × 10−5 divided by (0.010)2(0.010), about 25 M−2 s−1.',
      'Mechanism: slow step gives k2[N2O2][O2]; substituting [N2O2] equals K[NO]2 matches the observed form.',
    ],
  },
  {
    unit: 6, topicIds: ['6.4', '6.9'], taskType: 'Calorimetry and enthalpy calculation',
    title: 'Determine an enthalpy change two ways',
    prompt: 'Plan a response that finds a reaction enthalpy from calorimetry data, checks it against a Hess’s law calculation, and explains the difference. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic data: 50.0 milliliters of 1.00 molar hydrochloric acid and 50.0 milliliters of 1.00 molar sodium hydroxide, both at 22.0 degrees Celsius, are mixed in a foam cup. The temperature rises to 28.6 degrees Celsius. Assume the solution has the density and specific heat of water, 1.00 g/mL and 4.18 J/g·K. Separately, standard enthalpies of formation are given: H+(aq) 0, OH−(aq) −230 kJ/mol, H2O(l) −286 kJ/mol.',
    taskParts: [
      'Calculate the heat absorbed by the solution and the enthalpy change per mole of water formed from the calorimetry data.',
      'Calculate the enthalpy change for the neutralization from the enthalpies of formation.',
      'Compare the two values, propose the most likely reason for any difference, and describe how the experiment could be modified to reduce it.',
    ],
    planningFrame: [
      { label: 'Heat', guidance: 'Use the total solution mass, the specific heat, and the temperature change to find q, then attach the sign for the reaction.' },
      { label: 'Per mole', guidance: 'Find the moles of water formed from the limiting amounts and divide.' },
      { label: 'Formation', guidance: 'Apply products minus reactants with the given formation enthalpies.' },
      { label: 'Reconcile', guidance: 'Attribute a gap to heat lost to the cup or air and name a fix.' },
    ],
    successCriteria: [
      'q for the solution is about 2,760 joules from 100 g, 4.18 J/g·K, and 6.6 K.',
      'The reaction enthalpy is about −55 kJ per mole of water, negative because the reaction released heat.',
      'The formation calculation gives −56 kJ per mole from −286 minus (0 plus −230).',
      'The difference is attributed to heat absorbed by the cup or lost to the surroundings, and a calorimeter constant or insulation is proposed.',
    ],
    commonPitfalls: [
      'Using only 50 g of solution instead of the combined 100 g.',
      'Reporting the enthalpy change as positive when the temperature rose.',
      'Forgetting that the enthalpy of formation of aqueous H+ is defined as zero.',
      'Attributing the gap to measurement error without naming where heat could have gone.',
    ],
    sampleOutline: [
      'Calorimetry: q equals 100 g × 4.18 J/g·K × 6.6 K, about 2.76 kJ; 0.0500 mol water formed; ΔH about −55 kJ/mol.',
      'Formation: −286 − (0 + −230) equals −56 kJ/mol.',
      'Reconcile: the calorimeter absorbed some heat; determine its heat capacity or improve insulation.',
    ],
  },
  {
    unit: 7, topicIds: ['7.7', '7.9'], taskType: 'Equilibrium calculation and prediction',
    title: 'Calculate equilibrium amounts and predict a shift',
    prompt: 'Plan a response that finds equilibrium concentrations from an initial mixture and an equilibrium constant, then predicts and justifies the direction of change after a disturbance. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic scenario: For the gas-phase reaction A ⇌ 2 B, K is 4.0 × 10−4 at a fixed temperature. A container initially holds 0.500 molar A and no B. After equilibrium is reached, the volume of the container is halved at constant temperature.',
    taskParts: [
      'Set up an ICE table and calculate the equilibrium concentrations of A and B, justifying any approximation used.',
      'Determine the direction the reaction shifts when the volume is halved, using the reaction quotient.',
      'Explain what happens to the value of K during this change and why.',
    ],
    planningFrame: [
      { label: 'Table', guidance: 'Write initial, change, and equilibrium rows with the change in terms of one variable and the coefficients.' },
      { label: 'Solve', guidance: 'Write the K expression, decide whether x is small compared with 0.500, and solve.' },
      { label: 'Quotient', guidance: 'Compute Q immediately after the disturbance and compare it with K.' },
      { label: 'Constant', guidance: 'State that K depends only on temperature and did not change.' },
    ],
    successCriteria: [
      'The change row is −x for A and +2x for B, and K equals (2x)2 divided by (0.500 − x).',
      'The small-x approximation is justified because K is small, giving x about 0.0071 and [B] about 0.014 molar.',
      'Halving the volume doubles both concentrations, making Q greater than K, so the reaction shifts toward A.',
      'The response states that K is unchanged because temperature is constant.',
    ],
    commonPitfalls: [
      'Writing the change in B as +x rather than +2x.',
      'Using the approximation without checking that x is small relative to the initial concentration.',
      'Claiming the shift is toward more moles of gas when pressure increases.',
      'Saying K changed because the concentrations changed.',
    ],
    sampleOutline: [
      'ICE: A 0.500 − x, B 2x; (2x)2 / 0.500 ≈ 4.0 × 10−4 gives x ≈ 0.0071; [B] ≈ 0.014 M.',
      'Disturbance: concentrations double, Q = (0.028)2 / 0.986 ≈ 8 × 10−4 > K, so the reaction shifts left toward A.',
      'Constant: K is unchanged; only temperature changes K.',
    ],
  },
  {
    unit: 8, topicIds: ['8.5', '8.9'], taskType: 'Titration and buffer analysis',
    title: 'Interpret a weak-acid titration curve',
    prompt: 'Plan a response that extracts an acid’s pKa and concentration from titration data, identifies the buffer region, and calculates the pH at a point within it. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic data: 25.0 milliliters of a weak monoprotic acid is titrated with 0.100 molar sodium hydroxide. The pH is 2.9 at the start, 4.2 after 10.0 milliliters of base, and rises steeply near 20.0 milliliters, reaching 8.9 at the equivalence point. The half-equivalence pH is 4.2.',
    taskParts: [
      'Determine the concentration of the acid from the equivalence volume and the pKa from the half-equivalence point.',
      'Explain why the pH at the equivalence point is above 7, naming the species responsible.',
      'Calculate the pH after 15.0 milliliters of base has been added and explain why this region resists pH change.',
    ],
    planningFrame: [
      { label: 'Equivalence', guidance: 'Use the moles of base at equivalence to find the moles and concentration of acid.' },
      { label: 'pKa', guidance: 'Read the pH at half the equivalence volume; that value is the pKa.' },
      { label: 'Species', guidance: 'Identify what remains in solution at equivalence and whether it is acidic or basic.' },
      { label: 'Buffer', guidance: 'Find the moles of acid and conjugate base after 15.0 milliliters, then apply Henderson-Hasselbalch.' },
    ],
    successCriteria: [
      'The acid concentration is 0.0800 molar from 0.00200 mol of base in 25.0 milliliters.',
      'The pKa is 4.2, read at 10.0 milliliters, half the equivalence volume.',
      'The basic equivalence point is attributed to the conjugate base accepting protons from water.',
      'The pH at 15.0 milliliters is about 4.7 from the ratio 3 to 1 of conjugate base to acid.',
    ],
    commonPitfalls: [
      'Reading the pKa at the equivalence point instead of the half-equivalence point.',
      'Assuming the equivalence pH is 7 because moles of acid and base are equal.',
      'Using the initial acid concentration in Henderson-Hasselbalch instead of the remaining moles.',
      'Describing the buffer region as having constant pH rather than a slowly changing pH.',
    ],
    sampleOutline: [
      'Concentration: 0.0200 L × 0.100 M equals 0.00200 mol acid in 0.0250 L, so 0.0800 M; pKa 4.2 at half-equivalence.',
      'Equivalence: only the conjugate base remains; it is a weak base, so pH 8.9.',
      'Buffer point: 0.00150 mol base formed, 0.00050 mol acid left; pH equals 4.2 plus log 3, about 4.7.',
    ],
  },
  {
    unit: 9, topicIds: ['9.3', '9.8'], taskType: 'Thermodynamic and electrochemical argument',
    title: 'Judge favorability and design a galvanic cell',
    prompt: 'Plan a response that decides whether a reaction is thermodynamically favorable, builds a galvanic cell from it, and relates the cell potential to free energy. This is a planning exercise, not an official AP prompt or scored response.',
    stimulus: 'Original synthetic data: Standard reduction potentials are given as Ag+ + e− → Ag, +0.80 V, and Ni2+ + 2 e− → Ni, −0.25 V. For a separate reaction, ΔH° is −92 kJ/mol and ΔS° is −199 J/mol·K.',
    taskParts: [
      'Determine whether the separate reaction is thermodynamically favorable at 298 kelvin and at 600 kelvin, showing the free-energy reasoning.',
      'Identify the anode, cathode, and overall reaction of a galvanic cell built from the silver and nickel half-reactions, and calculate its standard potential.',
      'Relate the cell potential to the standard free energy change and state what a positive potential implies about K.',
    ],
    planningFrame: [
      { label: 'Free energy', guidance: 'Compute ΔG° equals ΔH° minus TΔS° at each temperature with consistent units.' },
      { label: 'Cell', guidance: 'Assign reduction to the more positive potential and oxidation to the other, then balance electrons.' },
      { label: 'Potential', guidance: 'Subtract the anode reduction potential from the cathode reduction potential without scaling for coefficients.' },
      { label: 'Link', guidance: 'Use ΔG° equals −nFE° and the sign of ΔG° to infer whether K exceeds 1.' },
    ],
    successCriteria: [
      'ΔG° is about −33 kJ/mol at 298 kelvin and about +27 kJ/mol at 600 kelvin, so favorability reverses with temperature.',
      'Silver is the cathode and nickel the anode, with overall reaction Ni + 2 Ag+ → Ni2+ + 2 Ag.',
      'The standard cell potential is 1.05 V, with the silver potential not doubled.',
      'A positive potential gives a negative ΔG° through −nFE° with n equal to 2, so K is greater than 1.',
    ],
    commonPitfalls: [
      'Mixing kilojoules and joules when combining ΔH° and TΔS°.',
      'Doubling the silver reduction potential because its half-reaction is multiplied by two.',
      'Assigning the anode to the more positive potential.',
      'Concluding that a favorable reaction must also be fast.',
    ],
    sampleOutline: [
      'Favorability: at 298 K, −92 − (298)(−0.199) ≈ −33 kJ; at 600 K, −92 − (600)(−0.199) ≈ +27 kJ.',
      'Cell: cathode Ag+/Ag, anode Ni/Ni2+; E° equals 0.80 − (−0.25) equals 1.05 V.',
      'Link: ΔG° equals −2 × 96,485 × 1.05, about −203 kJ, so K is much greater than 1.',
    ],
  },
]);

module.exports = { AP_CHEMISTRY_WORKSHOPS, AP_CHEMISTRY_WORKSHOP_REVIEW_NOTE: REVIEW_NOTE };
