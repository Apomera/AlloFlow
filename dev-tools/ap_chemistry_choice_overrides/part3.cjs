'use strict';

// Choice-length parity, extreme-qualifier symmetry, ADV_RECALL prompt,
// and KEY_ECHO rationale overrides for AP Chemistry slice 3
// (ap-chem-u8-469 through ap-chem-u9-700, excluding pure formula exact tie ap-chem-u9-496).

module.exports = {
  'ap-chem-u8-469': {
    prompt: 'After mixing 50.0 mL of 0.100 M HCl with 25.0 mL of 0.100 M NaOH, which value gives the approximate pH of the resulting solution?',
  },
  'ap-chem-u8-471': {
    wrongReasons: [
      '[OH-] is x, not Kb.',
      'The initial concentration is needed in the denominator.',
      'Dividing x squared by 0.100 raises the exponent by one power of ten rather than lowering it.',
    ],
  },
  'ap-chem-u8-472': {
    answer: 'A- is the conjugate base of HA and accepts H+ in reverse.',
  },
  'ap-chem-u8-473': {
    answer: 'Removing the second proton forms a more negative ion, which is less favorable.',
  },
  'ap-chem-u8-475': {
    answer: 'The weak acid conjugate base, spectator ions, and slight excess OH-.',
    distractorReplacements: {
      'Only the original weak acid and none of its own conjugate base at all here': 'The original weak acid with none of its own conjugate base present at all',
      'Only H3O+ ions, because every titration mixture is acidic at this one stage': 'Mostly H3O+ ions, because every titration mixture stays acidic at this stage',
      'Only water molecules, with no dissolved ions of any kind present at all here': 'Neutral water molecules, with no dissolved ions of any kind present at all',
    },
  },
  'ap-chem-u8-476': {
    answer: 'Find half the equivalence titrant volume and read the pH there.',
  },
  'ap-chem-u8-477': {
    answer: 'Adding electronegative oxygens that stabilize the conjugate base.',
  },
  'ap-chem-u8-478': {
    answer: 'Resonance delocalizes the carboxylate charge over two oxygens.',
  },
  'ap-chem-u8-480': {
    answer: 'Acid A’s solution, because its larger Ka yields more hydronium.',
  },
  'ap-chem-u8-481': {
    answer: 'The [A-]/[HA] ratio rises as OH- converts HA into A-.',
  },
  'ap-chem-u8-482': {
    answer: 'A concentrated mix of comparable moles of acetic acid and acetate.',
    distractorReplacements: {
      'A very dilute solution that contains only the acetate ion in the water.': 'A very dilute solution that contains just the acetate ion in the water.',
      'A concentrated solution that contains only acetic acid in the water.': 'A concentrated solution containing acetic acid with no acetate present.',
    },
  },
  'ap-chem-u8-484': {
    answer: 'The equation requires appreciable weak acid and conjugate base, which are absent here.',
  },
  'ap-chem-u8-485': {
    answer: 'A strong-acid strong-base titration with equivalence near pH 7.',
  },
  'ap-chem-u8-487': {
    answer: 'H+ consumes OH-, lowering [OH-] and shifting the hydroxide dissolution toward more ions.',
  },
  'ap-chem-u8-488': {
    answer: 'Molar solubility decreases because the common ion raises Qsp.',
  },
  'ap-chem-u9-489': {
    answer: 'Entropy generally increases because gas particles gain more mixed particle arrangements.',
    distractorReplacements: {
      'The entropy is always exactly zero whenever any substance dissolves in a liquid at all.': 'The entropy stays at exactly zero whenever any substance dissolves in a liquid solvent.',
      'The entropy depends only on the molar mass and not on the particle arrangements at all.': 'The entropy depends just on the molar mass and not on the particle arrangements at all.',
    },
  },
  'ap-chem-u9-492': {
    answer: 'Measure product ratios at short and long times at temperatures allowing interconversion.',
  },
  'ap-chem-u9-494': {
    answer: 'Standard dissolution free energy is positive since delta G° = -RT ln Ksp.',
  },
  'ap-chem-u4-499': {
    answer: 'Dry the precipitate to constant mass and repeat with a reagent blank and the same stoichiometry.',
  },
  'ap-chem-u7-500': {
    answer: 'No shift occurs because the reacting gas partial pressures stay unchanged.',
  },
  'ap-chem-u1-502': {
    answer: 'The two methods agree within normal measurement precision for this composition.',
  },
  'ap-chem-u1-503': {
    answer: 'Component Y has the largest relative amount under the stated calibration.',
  },
  'ap-chem-u1-504': {
    answer: 'The small peak represents fewer, more tightly bound electrons than the larger peak.',
  },
  'ap-chem-u1-505': {
    answer: 'The larger-peak subshell holds 3 electrons for every 2 in the smaller-peak subshell.',
  },
  'ap-chem-u1-506': {
    answer: 'Aluminum loses a higher-energy 3p electron, easier to remove than magnesium’s 3s electron.',
  },
  'ap-chem-u1-507': {
    answer: 'The solid holds fixed charged ions that become mobile when melted or dissolved in water.',
    distractorReplacements: {
      'The solid is metallic because all metals conduct equally well only after melting.': 'The solid is metallic because metals conduct electricity poorly until after melting.',
      'The sample is molecular because molecules always carry charge more effectively in a solid.': 'The sample is molecular because neutral molecules carry charge more effectively in solids.',
      'The conductivity values prove that the sample contains only neutral atoms.': 'The conductivity values prove that the sample consists of neutral atoms.',
    },
  },
  'ap-chem-u1-508': {
    answer: 'Multiplying gives g^2/mol instead of mol, so mass must be divided by molar mass.',
  },
  'ap-chem-u2-509': {
    answer: 'A is metallic, B is ionic, and C is molecular or covalent as tested.',
  },
  'ap-chem-u2-510': {
    answer: 'The bond at the -120 kJ/mol minimum is stronger in this energy model.',
  },
  'ap-chem-u2-511': {
    answer: 'MgO’s higher ion charges and closer spacing produce a much stronger ionic lattice.',
    distractorReplacements: {
      'The melting points are determined only by molar mass, so KBr should be the highest.': 'The melting points are determined just by molar mass, so KBr should be the highest.',
      'The data show that the larger ions always form the stronger ionic attractions here.': 'The data show that the larger ions tend to form the stronger ionic attractions here.',
    },
  },
  'ap-chem-u2-512': {
    answer: 'Lattice distortion hinders layer slip while delocalized electrons still allow conduction.',
  },
  'ap-chem-u2-513': {
    answer: 'Both oxygens share equivalent average bonding and charge in the resonance hybrid.',
  },
  'ap-chem-u2-514': {
    answer: 'Higher electronegativity lets oxygen stabilize negative charge better than carbon.',
    distractorReplacements: {
      'A negative charge is always more stable on the atom with the larger atomic mass.': 'A negative charge is typically more stable on the atom with larger atomic mass.',
      'Formal charge placement never affects the relative plausibility of Lewis structures.': 'Formal charge placement does not affect the relative plausibility of Lewis structures.',
    },
  },
  'ap-chem-u2-516': {
    answer: 'Symmetric trigonal planar BF3 cancels bond dipoles, while trigonal pyramidal NH3 does not.',
  },
  'ap-chem-u3-517': {
    answer: 'Liquid B has higher viscosity because it resists flow for a longer time.',
  },
  'ap-chem-u3-519': {
    answer: 'A phase change occurs as heat alters intermolecular potential energy, not temperature.',
  },
  'ap-chem-u3-520': {
    answer: 'A systematic pressure or volume calibration offset is more likely than a failed gas law.',
  },
  'ap-chem-u3-522': {
    answer: 'Attractions dominate at moderate pressure, while excluded volume and repulsions dominate at high P.',
  },
  'ap-chem-u3-524': {
    answer: 'Mobile ions left solution to form a solid, lowering the concentration of charge carriers.',
  },
  'ap-chem-u3-525': {
    answer: 'At least four components interact differently with the stationary phase.',
  },
  'ap-chem-u3-526': {
    answer: 'Temperature affects salt P’s solubility much more strongly than salt Q’s over this range.',
  },
  'ap-chem-u3-528': {
    distractorReplacements: {
      'The claim is correct because shorter wavelengths always carry less energy.': 'The claim is correct because shorter wavelengths generally carry less energy.',
      'The claim cannot be evaluated because photon energy depends only on intensity.': 'The claim cannot be evaluated because photon energy depends just on intensity.',
      'The claim is correct only for photons emitted by atoms rather than absorbed by molecules.': 'The claim holds true for photons emitted by atoms rather than those absorbed by molecules.',
    },
  },
  'ap-chem-u3-530': {
    answer: 'The data support direct proportionality, with the small gap likely due to apparatus or measurement limits.',
  },
  'ap-chem-u3-531': {
    answer: 'The first solute acts as a strong electrolyte, whereas the second remains molecular.',
  },
  'ap-chem-u3-532': {
    answer: 'The fraction is enriched in the lower-boiling liquid, though the boiling range cannot prove purity.',
    distractorReplacements: {
      'The fraction contains only the higher-boiling component, because it was the one collected first here.': 'The fraction contains solely the higher-boiling component, because it was the one collected first here.',
      'The boiling range proves that the two liquids reacted together to form an entirely new compound.': 'The boiling range proves that the two liquids reacted together to form a distinct new compound.',
    },
  },
  'ap-chem-u4-533': {
    answer: 'The constant mass supports total mass conservation within stated precision.',
  },
  'ap-chem-u4-534': {
    answer: 'The sample holds ions forming a sparingly soluble solid with the reagent, needing further ID.',
  },
  'ap-chem-u4-535': {
    answer: 'A chemical rearrangement conserving atoms and forming new species.',
  },
  'ap-chem-u4-536': {
    answer: 'The carbonate undergoes a gas-forming reaction with acid, though gas identity needs further tests.',
    distractorReplacements: {
      'The control shows that the acid never reacts with any water under any condition at all in the lab.': 'The control shows that the acid does not react with any water under any condition at all in the lab.',
      'The bubbles prove that the solution contains only carbonate and no other dissolved species at all.': 'The bubbles prove that the solution contains just carbonate and no other dissolved species at all.',
    },
  },
  'ap-chem-u4-537': {
    answer: 'The mean yield is 100 percent, and the tight replicate spread reflects good experimental precision.',
  },
  'ap-chem-u4-539': {
    answer: 'Precipitate formation shows a chemical change even without a measured temperature shift.',
  },
  'ap-chem-u4-540': {
    answer: 'Fe2+ is oxidized because it loses an electron to form Fe3+.',
  },
  'ap-chem-u5-543': {
    answer: 'The constant 30-second half-life matches a first-order reaction under these conditions.',
  },
  'ap-chem-u5-544': {
    answer: 'A termolecular elementary step is formally possible but far less probable than bimolecular pathways.',
    distractorReplacements: {
      'The step cannot occur at all, because elementary reactions never involve more than one single particle.': 'The step cannot occur at all, because elementary reactions do not involve more than one single particle.',
      'The step is automatically the overall reaction, because its coefficients are already balanced correctly.': 'The step is necessarily the overall reaction, because its coefficients are already balanced correctly.',
    },
  },
  'ap-chem-u5-545': {
    answer: 'Higher temperature speeds the reaction as a larger fraction of collisions exceed activation energy.',
  },
  'ap-chem-u5-546': {
    answer: 'The catalyst lowers activation energy without altering the overall enthalpy.',
  },
  'ap-chem-u5-548': {
    answer: 'Use the fast equilibrium to substitute for the unmeasured intermediate in the slow-step rate law.',
  },
  'ap-chem-u5-550': {
    answer: 'The catalyst lowers both activation barriers without changing the equilibrium constant.',
  },
  'ap-chem-u6-554': {
    answer: 'Use calibration data to estimate calorimeter heat capacity and correct heat absorption.',
  },
  'ap-chem-u6-555': {
    answer: 'The sample undergoes a phase transition at 60 degrees C at that pressure.',
  },
  'ap-chem-u6-556': {
    answer: 'The reaction enthalpy is -220 kJ, calculated by subtracting the reactant sum from the product sum.',
  },
  'ap-chem-u6-557': {
    answer: 'Average bond enthalpies give an estimate that differs from exact formation-enthalpy data.',
  },
  'ap-chem-u6-558': {
    answer: 'Lower temperatures favor the process because delta H < 0 while -T delta S grows more positive at high T.',
  },
  'ap-chem-u6-560': {
    answer: 'A systematic heat-loss or heat-capacity error is likely skewing the temperature shift.',
  },
  'ap-chem-u6-561': {
    answer: 'The 6.0-kJ plateau interval, where temperature stays constant during melting.',
  },
  'ap-chem-u6-562': {
    answer: 'The sign of q depends on whether the boundary defines the reaction, solution, vessel, or room.',
  },
  'ap-chem-u6-563': {
    answer: 'Average bond enthalpies miss differences in local molecular environment and structure.',
  },
  'ap-chem-u6-564': {
    answer: 'The two paths agree within reasonable rounding or experimental uncertainty, giving delta H near -83 kJ.',
  },
  'ap-chem-u7-565': {
    answer: 'Dynamic equilibrium, with constant macroscopic amounts as forward and reverse reactions continue.',
  },
  'ap-chem-u7-566': {
    answer: 'The reaction shifts toward products because Q is smaller than K.',
  },
  'ap-chem-u7-567': {
    answer: 'Divide the SO3 partial pressure squared by the SO2 pressure squared times the O2 pressure.',
  },
  'ap-chem-u7-568': {
    answer: 'The two trials agree with a single equilibrium constant near 4.9 within measurement precision.',
    distractorReplacements: {
      'The average is invalid because equilibrium constants can never be measured twice.': 'The average is invalid because equilibrium constants cannot be measured repeatedly.',
      'The larger value must be correct because equilibrium always favors the trial with more product.': 'The larger value must be correct because equilibrium tends to favor the trial with more product.',
    },
  },
  'ap-chem-u7-569': {
    answer: 'A large equilibrium constant favors products at equilibrium without reaching full conversion.',
  },
  'ap-chem-u7-570': {
    answer: '6.25, because reversing gives 1/0.40 and doubling coefficients squares it.',
    distractorReplacements: {
      '2.50, because only the reciprocal operation matters.': '2.50, because just the reciprocal operation matters.',
      '0.40, because equilibrium constants never depend on how equations are written.': '0.40, because equilibrium constants do not depend on how equations are written.',
    },
  },
  'ap-chem-u7-572': {
    answer: 'Adding reactant alters Q, and the system shifts until forward and reverse rates match again.',
    distractorReplacements: {
      'The added reactant changes K immediately because every concentration changes.': 'The added reactant changes K right away because every concentration changes.',
      'The system moves toward products because equilibrium always favors the side with more particles.': 'The system moves toward products because equilibrium tends to favor the side with more particles.',
    },
  },
  'ap-chem-u7-573': {
    answer: 'A sudden concentration disturbance followed by a net forward shift to new equilibrium.',
    distractorReplacements: {
      'A temperature change, because every concentration jump changes the value of K automatically.': 'A temperature change, because every concentration jump alters the value of K simultaneously.',
      'A reverse reaction only, because the original reactant concentration later decreases again.': 'A reverse reaction alone, because the original reactant concentration later decreases again.',
    },
  },
  'ap-chem-u7-574': {
    answer: 'Equal gas moles on both sides mean compression affects both equally, so no shift occurs.',
  },
  'ap-chem-u7-575': {
    answer: 'The solution starts unsaturated, reaches saturation, then becomes supersaturated and precipitates.',
  },
  'ap-chem-u7-576': {
    answer: 'Keep CaF2 mass, solvent volume, temperature, mixing, and filtration constant while varying NaF.',
  },
  'ap-chem-u7-578': {
    answer: 'Higher temperature favors the endothermic direction and raises K in the equilibrium energy balance.',
  },
  'ap-chem-u8-579': {
    answer: 'The pH lies in or near the 6.8 to 7.4 transition range, not necessarily at 7.0.',
  },
  'ap-chem-u8-580': {
    answer: 'Calibration drift caused the first error, and the second reading confirms recalibration.',
  },
  'ap-chem-u8-581': {
    answer: 'Dilution lowers [H3O+], yet pH rises by under 1 unit as weak-acid ionization shifts toward ions.',
  },
  'ap-chem-u8-582': {
    answer: 'HA is the acid because it donates a proton forward, while A- is its conjugate base.',
  },
  'ap-chem-u8-584': {
    answer: 'More electronegative oxygen atoms withdraw electron density and stabilize A’s conjugate base.',
    distractorReplacements: {
      'Acid B must be stronger because fewer oxygen atoms always means fewer bonds to break.': 'Acid B must be stronger because fewer oxygen atoms typically mean fewer bonds to break.',
      'The comparison cannot use conjugate-base stability because acids are judged only by molar mass.': 'The comparison cannot use conjugate-base stability because acids are judged just by molar mass.',
    },
  },
  'ap-chem-u8-585': {
    answer: 'The pH 2.90 acid has the larger Ka and is stronger at equal molarity.',
  },
  'ap-chem-u8-587': {
    answer: 'Raising the base-to-acid ratio tenfold increases pH by about one unit.',
  },
  'ap-chem-u8-588': {
    answer: 'Add equal small acid portions to equal buffer volumes and compare pH shifts before exhaustion.',
  },
  'ap-chem-u8-589': {
    answer: 'Protons consume OH-, lowering a dissolution product and shifting more solid to dissolve.',
  },
  'ap-chem-u8-590': {
    answer: 'Verify approximations, activity effects, solution preparation, and probe calibration before rejecting Ka.',
  },
  'ap-chem-u8-591': {
    answer: 'The equivalence volume is near 24.0 mL with high trial precision.',
  },
  'ap-chem-u8-592': {
    answer: 'Use high practical concentration while keeping acid and conjugate-base amounts equal.',
  },
  'ap-chem-u9-593': {
    answer: 'Compression lowers accessible gas arrangements, while uniform mixing increases accessible arrangements.',
  },
  'ap-chem-u9-594': {
    answer: 'The sign is reversed; products minus reactants gives +50 J per mol K.',
  },
  'ap-chem-u9-595': {
    answer: 'The forward process becomes thermodynamically favorable above 400 K under these conditions.',
  },
  'ap-chem-u9-596': {
    answer: 'The initial major product is kinetically favored, while the equilibrated major product is thermodynamically favored.',
  },
  'ap-chem-u9-597': {
    answer: 'Delta G is negative at Q/K = 0.10, zero at Q/K = 1.0, and positive at Q/K = 10.',
  },
  'ap-chem-u9-598': {
    answer: 'The coupled reaction has delta G = -7 kJ/mol and is thermodynamically favorable.',
  },
  'ap-chem-u9-600': {
    answer: 'Check current efficiency, electrode condition, solution composition, and weighing while repeating with controls.',
  },
  'ap-chem-u1-602': {
    answer: 'Most atoms are mass-10, giving an average atomic mass slightly above 10.',
  },
  'ap-chem-u1-604': {
    answer: 'Rising effective nuclear charge pulls occupied valence electrons closer across the period.',
    distractorReplacements: {
      'Added protons always shield one another completely, so the radius should increase across the period.': 'Added protons fully shield one another from electrons, so the radius should increase across periods.',
      'Atomic radius depends only on neutron number and is unrelated to electron attraction.': 'Atomic radius depends just on neutron number and is unrelated to electron attraction.',
    },
  },
  'ap-chem-u1-605': {
    answer: 'Heat replicate samples to constant mass, find water mass lost, and check the mole ratio.',
  },
  'ap-chem-u1-606': {
    answer: 'Filter, rinse, and dry the solid, then evaporate a measured filtrate portion and compare masses.',
    distractorReplacements: {
      'Evaporate the entire sample immediately and use the final measured mass as the mass of the sand alone.': 'Evaporate the entire sample right away and use the final measured mass as the mass of the sand alone.',
      'Filter without rinsing the solid at all, and then identify both of the components only by appearance.': 'Filter without rinsing the solid at all, and then identify both of the components just by appearance.',
    },
  },
  'ap-chem-u1-607': {
    answer: 'Use the same photon energy and calibrate both binding-energy axes to a common reference.',
  },
  'ap-chem-u1-608': {
    answer: 'Determine the metal-to-anion mole ratio via independent quantitative replicate assays.',
  },
  'ap-chem-u2-609': {
    answer: 'In C-F, carbon is partially positive and fluorine is partially negative.',
  },
  'ap-chem-u2-611': {
    answer: 'Carbonate is a resonance hybrid with three equivalent C-O bonds, not rapidly switching structures.',
  },
  'ap-chem-u2-613': {
    answer: 'Measure a bond-sensitive property on equal-purity samples at matched T, concentration, and calibration.',
  },
  'ap-chem-u2-614': {
    answer: 'Measure resistance on replicate wires of equal length and cross-sectional area at one temperature.',
  },
  'ap-chem-u2-615': {
    answer: 'Use structure-sensitive measurements to compare predicted bond angles and geometry with actual shape.',
  },
  'ap-chem-u2-616': {
    answer: 'Measure the purified sample’s dipole moment and compare with the vector sum.',
  },
  'ap-chem-u3-617': {
    answer: 'Stronger intermolecular forces in A require more energy to separate its molecules.',
  },
  'ap-chem-u3-618': {
    answer: 'The rigid lattice shatters when a shifted layer aligns like charges together.',
  },
  'ap-chem-u3-619': {
    answer: 'Added heat changes particle spacing and overcomes attractions during the phase change.',
  },
  'ap-chem-u3-620': {
    answer: 'Pressure is directly proportional to 1/V, matching ideal-gas behavior at constant temperature.',
  },
  'ap-chem-u3-621': {
    answer: 'The hotter gas has higher average kinetic energy and a greater share of fast particles.',
  },
  'ap-chem-u3-622': {
    answer: 'Attractions dominate at moderate P, while particle volume and repulsions dominate at high P.',
  },
  'ap-chem-u3-623': {
    answer: 'The number of ions stays constant as volume and spacing between ions increase.',
  },
  'ap-chem-u3-624': {
    answer: 'Use the unknown absorbance and fitted line, including the intercept, to find concentration.',
  },
  'ap-chem-u3-625': {
    answer: 'Hold solute mass, particle size, solvent volume, T, and time fixed while varying stirring rate.',
  },
  'ap-chem-u3-626': {
    answer: 'Spot mixture and references on one plate, develop together, and compare migration distances.',
  },
  'ap-chem-u3-628': {
    answer: 'Choose a wavelength near the absorbance maximum where solvent and cuvette absorb minimally.',
  },
  'ap-chem-u3-629': {
    answer: 'Measure several known wavelengths on one instrument and compare photon energies from frequency.',
  },
  'ap-chem-u3-630': {
    answer: 'Dilute concentrated standards into the validated linear range and remeasure at equal path length.',
  },
  'ap-chem-u3-631': {
    answer: 'Heat equal small samples slowly with a calibrated probe and record the melting-temperature range.',
  },
  'ap-chem-u4-633': {
    answer: 'Two hydrogen molecules react with one oxygen molecule to produce two water molecules.',
  },
  'ap-chem-u4-636': {
    answer: 'Protons from HCl combine with OH- to form water while Na+ and Cl- stay spectators.',
  },
  'ap-chem-u4-637': {
    answer: 'Weigh and test the heated solid for new substances alongside an unheated control sample.',
  },
  'ap-chem-u4-638': {
    answer: 'Mix measured amounts in replicate, dry the precipitate to constant mass, and compare to stoichiometry.',
  },
  'ap-chem-u4-639': {
    answer: 'Add titrant slowly near the transition while swirling and use blank-corrected replicates.',
  },
  'ap-chem-u4-640': {
    answer: 'Track oxidation-state changes and half-reactions to identify which species gains electrons.',
  },
  'ap-chem-u5-641': {
    answer: 'The instantaneous reactant-consumption rate magnitude starts highest and decreases over time.',
  },
  'ap-chem-u5-642': {
    answer: 'The reaction is second order in A, so the rate law includes [A] squared.',
  },
  'ap-chem-u5-643': {
    answer: 'The collision may fail because effective collisions require sufficient energy and proper orientation.',
    distractorReplacements: {
      'The collision must produce products, because sufficient energy on its own guarantees a reaction here.': 'The collision must produce products, because sufficient energy on its own produces a reaction here.',
      'The collision produces products only if the two molecules happen to have exactly identical masses here.': 'The collision produces products solely if the two molecules happen to have identical molar masses here.',
    },
  },
  'ap-chem-u5-644': {
    answer: 'X is an intermediate, formed in one elementary step and consumed in a later step.',
  },
  'ap-chem-u5-645': {
    answer: 'The catalyst lowers activation energy via a new pathway without altering overall energy change.',
  },
  'ap-chem-u5-646': {
    answer: 'Hold vessel, temperature, mixing, volume, and timing constant while varying the reactant concentration.',
  },
  'ap-chem-u5-647': {
    answer: 'Measure k at several temperatures with the same mixture and plot ln(k) versus 1/T (K).',
  },
  'ap-chem-u5-648': {
    answer: 'Run catalyzed and uncatalyzed trials with equal reactants, T, surface area, and timing.',
  },
  'ap-chem-u5-649': {
    answer: 'Measure initial rates across several [B] values while holding other species and T fixed.',
  },
  'ap-chem-u5-650': {
    answer: 'Withdraw timed aliquots and rapidly quench each before measuring composition.',
  },
  'ap-chem-u6-651': {
    answer: 'The forward process is endothermic, absorbing energy with positive delta H.',
  },
  'ap-chem-u6-652': {
    answer: 'Energy transfers from faster-averaging metal particles to water until both reach one temperature.',
  },
  'ap-chem-u6-654': {
    answer: 'Added heat raises potential energy by separating particles against intermolecular forces.',
  },
  'ap-chem-u6-655': {
    answer: 'Forming two moles of liquid water from H2 and O2 releases 572 kJ under those conditions.',
  },
  'ap-chem-u6-656': {
    answer: 'The estimate depends on the specific bonds broken and formed, not just the total bond count.',
  },
  'ap-chem-u6-657': {
    answer: 'The net enthalpy change is +25 kJ since step enthalpies add algebraically.',
  },
  'ap-chem-u6-658': {
    answer: 'Measure the calorimeter heat capacity with a known heat input before running the reaction.',
  },
  'ap-chem-u6-659': {
    answer: 'Supply equal measured energy to equal masses and record temperature shifts after even mixing.',
  },
  'ap-chem-u6-660': {
    answer: 'Dry surface water from the ice and account for pre-melt warming in the heat balance.',
  },
  'ap-chem-u6-661': {
    answer: 'Compare heat per mole of water formed using calibrated, common limiting reagents.',
  },
  'ap-chem-u6-662': {
    answer: 'Check phases, bond assignments, stoichiometry, and whether average bond enthalpies fit those molecules.',
  },
  'ap-chem-u6-663': {
    answer: 'Confirm intermediates and phases cancel and that each step’s delta H is scaled or reversed to match.',
    distractorReplacements: {
      'Cancel only those elements that appear on both of the sides and ignore the chemical formulas entirely here.': 'Cancel just those elements that appear on both of the sides and ignore the chemical formulas altogether.',
      'Choose the route that has the most equations, because more steps always improve the accuracy of it here.': 'Choose the route that has the most equations, because more steps consistently improve its accuracy here.',
    },
  },
  'ap-chem-u6-664': {
    answer: 'Record temperature continuously and extrapolate the cooling trend back to mixing time.',
  },
  'ap-chem-u7-665': {
    answer: 'Dynamic equilibrium occurs when forward and reverse rates match, not when N2O4 and NO2 counts are equal.',
    distractorReplacements: {
      'The reaction has stopped entirely, because both kinds of particles are present together in the diagram here.': 'The reaction has ceased altogether, because both kinds of particles are present together in the diagram here.',
      'The larger particle population must be the reactant, because the products are always the less abundant ones.': 'The larger particle population must be the reactant, because the products are usually the less abundant ones.',
    },
  },
  'ap-chem-u7-666': {
    answer: 'The forward reaction is favored, converting reactants to products until Q equals K.',
  },
  'ap-chem-u7-667': {
    answer: 'K equals the equilibrium pressure or concentration of CO2 since pure solids are omitted.',
  },
  'ap-chem-u7-668': {
    answer: 'The first reaction strongly favors products at equilibrium, while the second strongly favors reactants.',
  },
  'ap-chem-u7-671': {
    answer: 'Equilibrium is reached as both concentrations level off and forward and reverse rates match.',
  },
  'ap-chem-u7-672': {
    answer: 'Measure initial concentrations, compute Q from the balanced equation, and compare Q with K at that T.',
  },
  'ap-chem-u7-673': {
    answer: 'Add equal measured reactant volumes to matched equilibrium samples and compare against solvent controls.',
  },
  'ap-chem-u7-674': {
    answer: 'The new equilibrium holds a higher fraction of the side with fewer total gas moles.',
    distractorReplacements: {
      'The reaction always shifts toward the side with more gas particles to oppose compression.': 'The reaction shifts toward the side with more gas particles in order to oppose compression.',
      'No composition change is possible because pressure affects only gas speed, not equilibrium.': 'No composition change is possible because pressure affects just gas speed, not equilibrium.',
    },
  },
  'ap-chem-u7-675': {
    answer: 'Filter without disturbing equilibrium, hold temperature constant, and assay replicate filtrates for ions.',
  },
  'ap-chem-u7-676': {
    answer: 'Equilibrate AgCl in pure water and known Cl- solution at one temperature, then measure dissolved Ag+.',
  },
  'ap-chem-u7-677': {
    answer: 'Equilibrate identical mixtures at separate controlled temperatures and find K from equilibrium amounts.',
  },
  'ap-chem-u7-678': {
    answer: 'Check pipette calibration, mixing time, temperature, and absorbance calibration using stock replicates.',
  },
  'ap-chem-u8-679': {
    answer: 'The acid donates a proton, water accepts it, and the products form a conjugate pair.',
  },
  'ap-chem-u8-681': {
    answer: 'The acid ionizes partially, reaching equilibrium between HA and its ions.',
  },
  'ap-chem-u8-683': {
    answer: 'Greater electron withdrawal stabilizes A’s conjugate base, making proton donation more favorable.',
    distractorReplacements: {
      'More oxygen atoms always make the acid stronger, because they increase the molar mass of it only here.': 'More oxygen atoms consistently make the acid stronger, because they increase the molar mass alone here.',
      'Acid strength depends only on the number of hydrogen atoms that are written into the formula here.': 'Acid strength depends just on the number of hydrogen atoms that are written into the formula here.',
    },
  },
  'ap-chem-u8-684': {
    answer: 'The pH approximates pKa because the base-to-acid ratio equals one.',
  },
  'ap-chem-u8-686': {
    answer: 'Calibrate with standards, rinse and blot consistently, and let readings stabilize.',
    distractorReplacements: {
      'Calibrate once with distilled water only and record the first displayed value for each sample.': 'Calibrate once with distilled water alone and record the first displayed value for each sample.',
      'Rinse the probe with the next sample and record immediately to avoid waiting.': 'Rinse the probe with the next sample and record right away to avoid waiting.',
    },
  },
  'ap-chem-u8-687': {
    answer: 'Measure initial acid molarity, equilibrium pH, and temperature across replicate trials.',
  },
  'ap-chem-u8-688': {
    answer: 'Pick an indicator whose transition interval lies in the steep equivalence pH region.',
  },
  'ap-chem-u8-689': {
    answer: 'Add small measured strong acid or base increments and record moles per unit pH shift.',
  },
  'ap-chem-u8-690': {
    answer: 'Add equal measured acid aliquots to equal buffer and water volumes, recording stabilized pH values.',
  },
  'ap-chem-u8-691': {
    answer: 'Prepare identical solutions, equilibrate at each controlled temperature, and measure stabilized pH.',
  },
  'ap-chem-u8-692': {
    answer: 'Measure dissolved metal with and without ligand at equal pH, temperature, and solid area.',
  },
  'ap-chem-u9-693': {
    answer: 'System entropy rises as more independently moving gas particles create more arrangements.',
  },
  'ap-chem-u9-694': {
    answer: 'In delta G = delta H - T delta S, negative delta S makes -T delta S grow positive with T.',
  },
  'ap-chem-u9-695': {
    answer: 'The left electrode is the oxidizing anode, and the right electrode is the reducing cathode.',
  },
  'ap-chem-u9-696': {
    answer: 'A larger Q makes the Nernst subtraction larger, lowering Ecell for the spontaneous forward cell.',
  },
  'ap-chem-u9-697': {
    answer: 'Use clean electrodes, a compatible salt bridge, a high-impedance voltmeter, and record T and molarities.',
  },
  'ap-chem-u9-698': {
    answer: 'Vary total charge while holding ion molarity, electrode area, efficiency, and drying constant.',
  },
  'ap-chem-u9-699': {
    answer: 'Run coupled and separate control trials, track species changes, and compare with net delta G predictions.',
    distractorReplacements: {
      'Run only the favorable reaction and then simply infer that the unfavorable partner must also have occurred here.': 'Run just the favorable reaction and then simply infer that the unfavorable partner must also have occurred here.',
      'Measure only the color of the mixture, because coupled reactions always change their color in this way here.': 'Measure just the color of the mixture, because coupled reactions typically change their color in this way here.',
    },
  },
  'ap-chem-u9-700': {
    answer: 'Compare product ratios at short and long times while confirming interconversion at constant temperature.',
    distractorReplacements: {
      'Compare only the first product that is detected, because early abundance always identifies the most stable product.': 'Compare just the first product that is detected, because early abundance usually identifies the most stable product.',
      'Quench every reaction immediately and use only the final reactant concentration to infer the product stability.': 'Quench every reaction right away and use just the final reactant concentration to infer the product stability.',
    },
  },
};
