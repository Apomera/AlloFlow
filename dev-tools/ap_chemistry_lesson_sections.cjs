#!/usr/bin/env node
'use strict';

// Second and third native lesson sections for each AP Chemistry unit.
//
// Before this file each unit had one lesson section and every item in the unit
// (roughly seventy-eight) routed to it. These sections split each unit by public
// framework topic so an item's "Read the lesson first" control lands on the
// lesson about its own topic. Same shape and review boundary as the existing
// section-01 specs in build_ap_chemistry_foundation.cjs and as the Biology
// backfill in ap_biology_lesson_sections.cjs.
//
// Original text written from the public framework topic list and standard
// introductory chemistry; no CED, OpenStax, or assessment content reproduced.
// Knowledge-check answer positions are spread across all four slots on purpose.

const AP_CHEMISTRY_UNIT_SECTIONS = Object.freeze([
  // Unit 1: Atomic Structure and Properties
  {
    unit: 1,
    section1Topics: ['1.1', '1.2', '1.3', '1.4'],
    sections: [
      {
        heading: 'Atomic structure and electron configuration',
        topics: ['1.5', '1.6'],
        content: 'The quantum model places electrons in shells and subshells of increasing energy. Electron configurations fill lower-energy subshells first, and the outermost, or valence, electrons determine most chemical behavior. Coulomb’s law explains the pattern: an electron is held more strongly when it is closer to the nucleus and when the effective nuclear charge it experiences is larger. Photoelectron spectroscopy measures the energy needed to remove electrons from each subshell; the position of a peak reports binding energy and the relative height reports how many electrons occupy that subshell, so a spectrum is direct evidence for shell structure.',
        keyTerms: ['subshell', 'valence electron', 'effective nuclear charge', 'Coulomb’s law', 'binding energy'],
        rich: {
          examples: ['A photoelectron spectrum of neon shows three peaks with relative heights of 2, 2, and 6, matching the 1s, 2s, and 2p subshells.', 'Removing the first electron from sodium takes far less energy than removing the second, because the second comes from a filled inner shell.'],
          nonExamples: ['A higher peak in a photoelectron spectrum does not mean higher binding energy; height reports electron count and position reports energy.', 'Electrons in the same shell are not all held with equal energy; subshells within a shell differ.'],
          misconception: 'Electron shielding and effective nuclear charge explain why outer electrons are easier to remove; the outer electrons are not farther away simply because there are more of them.',
          dataHeaders: ['Spectral observation', 'Supports', 'Does not establish'],
          dataRows: [['Two peaks at different energies with heights in a 1 to 3 ratio.', 'Two subshells holding electrons in a 1 to 3 ratio, such as 2s and 2p.', 'The identity of the element without the absolute energies.'], ['The lowest-energy peak shifts to higher energy across a period.', 'Effective nuclear charge on valence electrons increases across the period.', 'That atomic radius has increased.']],
          retrieval: ['Write the electron configuration for an element in period 3 and identify its valence electrons.', 'Explain what peak position and peak height each report in a photoelectron spectrum.', 'Use Coulomb’s law to explain why a core electron has higher binding energy than a valence electron.'],
          transfer: 'When a spectrum or ionization energy is given, ask which shell and subshell the electron came from and how much nuclear charge it experienced before comparing values.',
        },
        check: {
          prompt: 'A photoelectron spectrum shows a peak for an element’s 1s electrons at much higher binding energy than for its 2s electrons. Which statement best explains the difference?',
          choices: ['The 2s electrons are shielded from the nucleus by the 1s electrons and experience a smaller effective nuclear charge', 'There are more 2s electrons than 1s electrons', 'The 1s electrons are farther from the nucleus', 'The 2s electrons have been removed by the instrument first'],
          answerIndex: 0,
          rationale: 'Inner electrons shield outer ones, so outer electrons experience a smaller effective nuclear charge and are held less tightly.',
        },
      },
      {
        heading: 'Periodic trends and valence electrons',
        topics: ['1.7', '1.8'],
        content: 'Periodic trends follow from electron configuration and Coulomb’s law. Across a period, effective nuclear charge rises while the outer shell stays the same, so atomic radius decreases and ionization energy and electronegativity generally increase. Down a group, added shells place valence electrons farther out and more shielded, so radius increases and ionization energy decreases. Ions follow the same logic: cations are smaller than their parent atoms and anions are larger. Elements in the same group share valence electron counts and therefore similar reactivity and typical ionic charges, which is why the periodic table predicts formulas and properties.',
        keyTerms: ['atomic radius', 'ionization energy', 'electronegativity', 'shielding', 'group'],
        rich: {
          examples: ['Chlorine has a smaller radius than sodium in the same period because its valence electrons experience a larger effective nuclear charge.', 'The chloride ion is larger than the chlorine atom because the added electron increases repulsion in the same shell.'],
          nonExamples: ['A larger atomic mass does not mean a larger radius; fluorine is heavier than lithium and smaller.', 'Ionization energy increasing across a period is a general trend, not a rule without exceptions, and small reversals occur at subshell changes.'],
          misconception: 'Atoms in the same group have similar chemistry because they share the same number of valence electrons, not because they have similar masses or sizes.',
          dataHeaders: ['Comparison', 'Supports', 'Does not establish'],
          dataRows: [['The first ionization energy of potassium is lower than that of sodium.', 'The valence electron of potassium is farther out and more shielded.', 'That potassium is less reactive than sodium.'], ['Magnesium forms a 2+ ion and chlorine forms a 1- ion.', 'Ions form to reach the electron count of the nearest noble gas.', 'The ratio in which the two combine without considering charge balance.']],
          retrieval: ['State how atomic radius changes across a period and down a group, and why.', 'Compare the size of an atom with its cation and its anion.', 'Predict the typical ion charge for an element in group 2 and in group 16.'],
          transfer: 'For any trend question, locate the elements on the table, decide whether the comparison is across a period or down a group, and reason from effective nuclear charge and shell count rather than memorized rankings.',
        },
        check: {
          prompt: 'Which of the following correctly orders the species from smallest to largest radius?',
          choices: ['Na, Na+, Cl, Cl-', 'Cl-, Cl, Na+, Na', 'Na+, Cl, Cl-, Na', 'Na+, Cl, Na, Cl-'],
          answerIndex: 2,
          rationale: 'Na+ has lost its outer shell and is smallest; Cl is smaller than Cl-, which gains an electron; Na, with its lone outer electron far from the nucleus, is largest among these.',
        },
      },
    ],
  },
  // Unit 2: Compound Structure and Properties
  {
    unit: 2,
    section1Topics: ['2.5', '2.6', '2.7'],
    sections: [
      {
        heading: 'Types of bonds and bond energy',
        topics: ['2.1', '2.2'],
        content: 'Bond type depends on the electronegativity of the atoms involved. Large differences give ionic bonds in which electrons transfer and ions attract; small differences give covalent bonds in which electrons are shared, polar when the sharing is unequal. Metals bond through a lattice of cations in a sea of delocalized electrons. A covalent bond forms because the potential energy of the atoms is lowest at a particular separation: too close and the nuclei repel, too far and the attraction weakens. Bond length is that lowest-energy distance and bond energy is the depth of the well, so shorter, multiple bonds are generally stronger.',
        keyTerms: ['electronegativity difference', 'ionic bond', 'polar covalent bond', 'bond length', 'bond energy'],
        rich: {
          examples: ['A carbon-oxygen double bond is shorter and stronger than a carbon-oxygen single bond.', 'Hydrogen fluoride is polar covalent because fluorine attracts the shared electrons much more strongly than hydrogen.'],
          nonExamples: ['A compound containing a metal is not automatically ionic; some metal-nonmetal combinations have significant covalent character.', 'A polar bond does not guarantee a polar molecule; molecular geometry can cancel bond dipoles.'],
          misconception: 'Energy is released when a bond forms and required to break one; breaking a bond never releases energy on its own.',
          dataHeaders: ['Potential energy curve feature', 'Supports', 'Does not establish'],
          dataRows: [['The minimum of the curve sits at 0.074 nm for H2.', 'The equilibrium bond length is 0.074 nm.', 'The bond energy without reading the depth of the well.'], ['Curve A has a deeper minimum than curve B.', 'Bond A is stronger than bond B.', 'That bond A is also longer than bond B.']],
          retrieval: ['Classify a bond as ionic, polar covalent, or nonpolar covalent from an electronegativity difference.', 'Describe why a potential energy curve has a minimum.', 'Relate bond order to bond length and bond energy.'],
          transfer: 'For a bonding question, compare electronegativities first to classify the bond, then use the potential energy picture to reason about length and strength.',
        },
        check: {
          prompt: 'On a potential energy versus internuclear distance graph for two atoms, the distance at the minimum of the curve represents',
          choices: ['the point where the atoms have no attraction', 'the bond length at which the bond is most stable', 'the distance at which the bond breaks', 'the average distance between atoms in the gas phase'],
          answerIndex: 1,
          rationale: 'The minimum is where attraction and repulsion balance and potential energy is lowest, which defines the equilibrium bond length.',
        },
      },
      {
        heading: 'Ionic and metallic solids, and alloys',
        topics: ['2.3', '2.4'],
        content: 'In an ionic solid, cations and anions occupy a repeating lattice held by electrostatic attraction in every direction. Lattice energy grows with ion charge and shrinks as ion size increases, which explains high melting points and brittleness: shifting the lattice brings like charges together and it fractures. Ionic solids conduct only when melted or dissolved, when the ions are free to move. Metals are lattices of cations surrounded by delocalized electrons, which makes them conductive, malleable, and ductile because layers can slide without breaking bonds. Alloys are mixtures of metals; substitutional alloys replace some atoms with others of similar size, and interstitial alloys fit small atoms into the gaps, typically making the material harder.',
        keyTerms: ['lattice energy', 'brittleness', 'delocalized electrons', 'substitutional alloy', 'interstitial alloy'],
        rich: {
          examples: ['Magnesium oxide melts at a far higher temperature than sodium chloride because its ions carry twice the charge.', 'Steel is harder than pure iron because carbon atoms in the interstitial spaces resist the sliding of iron layers.'],
          nonExamples: ['An ionic solid conducting electricity when dissolved does not mean the solid conducts; the ions must be mobile.', 'A metal being shiny is not what makes it conductive; both properties come from delocalized electrons, but they are separate observations.'],
          misconception: 'Ionic compounds are not molecules; a formula such as NaCl gives the simplest ratio of ions in the lattice, not a discrete two-atom unit.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A solid does not conduct electricity but its aqueous solution does.', 'The solid is ionic, with ions that become mobile on dissolving.', 'The identity of the ions.'], ['Brass is harder than either copper or zinc alone.', 'Atoms of different size disrupt the regular lattice and resist slipping.', 'That brass conducts better than copper.']],
          retrieval: ['Predict which of two ionic compounds has the higher lattice energy from ion charges and sizes.', 'Explain why ionic solids are brittle and metals are malleable.', 'Distinguish substitutional from interstitial alloys.'],
          transfer: 'When a property of a solid is asked, name the particles and the forces holding them, then decide whether those forces permit movement of charge or of layers.',
        },
        check: {
          prompt: 'Which pair of properties is best explained by the presence of delocalized electrons in a solid?',
          choices: ['High melting point and brittleness', 'Electrical conductivity in the solid state and malleability', 'Solubility in water and low density', 'Conductivity only when dissolved and a fixed crystal shape'],
          answerIndex: 1,
          rationale: 'Mobile delocalized electrons carry charge in the solid and let metal cation layers slide past each other without breaking the bonding.',
        },
      },
    ],
  },
  // Unit 3: Properties of Substances and Mixtures
  {
    unit: 3,
    section1Topics: ['3.1', '3.2', '3.3'],
    sections: [
      {
        heading: 'Gases: the ideal gas law and kinetic molecular theory',
        topics: ['3.4', '3.5', '3.6'],
        content: 'The ideal gas law, PV equals nRT, relates pressure, volume, amount, and temperature for a gas whose particles are treated as points that do not attract one another. Kinetic molecular theory supplies the picture: particles move randomly, collisions with the walls create pressure, and average kinetic energy depends only on temperature, so at a given temperature lighter particles move faster. Dalton’s law gives the total pressure of a mixture as the sum of partial pressures. Real gases deviate from ideal behavior at high pressure, where particle volume matters, and at low temperature, where attractions slow particles and lower the pressure below the ideal prediction.',
        keyTerms: ['ideal gas law', 'partial pressure', 'kinetic molecular theory', 'Maxwell-Boltzmann distribution', 'non-ideal behavior'],
        rich: {
          examples: ['At the same temperature, helium atoms have a higher average speed than argon atoms because they have less mass.', 'A gas compressed to very high pressure occupies more volume than the ideal gas law predicts because its molecules take up space.'],
          nonExamples: ['Two gases at the same temperature do not have the same average speed; they have the same average kinetic energy.', 'Doubling the temperature in degrees Celsius does not double the pressure; the gas laws use kelvin.'],
          misconception: 'Heating a gas raises its pressure at constant volume because particles strike the walls harder and more often, not because the particles themselves expand.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A gas sample gives PV divided by nRT of 0.90 at high pressure.', 'Intermolecular attractions are reducing the pressure below the ideal value.', 'That the gas has liquefied.'], ['The speed distribution curve for a gas broadens and shifts right when heated.', 'Average kinetic energy and the spread of speeds both increase with temperature.', 'That every particle now moves faster than before.']],
          retrieval: ['State what each variable in PV equals nRT represents and the units used with R.', 'Explain why temperature, not mass, sets average kinetic energy.', 'Describe the two conditions under which a real gas deviates most from ideal behavior.'],
          transfer: 'For a gas problem, fix which variables are held constant, convert temperature to kelvin, and then decide whether kinetic molecular theory or a deviation from it is being tested.',
        },
        check: {
          prompt: 'Two rigid containers of equal volume at the same temperature hold one mole of helium and one mole of xenon respectively. Which statement is correct?',
          choices: ['The xenon exerts higher pressure because its atoms are heavier', 'The helium atoms have higher average kinetic energy', 'The two gases exert the same pressure and have the same average kinetic energy', 'The helium exerts higher pressure because its atoms move faster'],
          answerIndex: 2,
          rationale: 'Pressure depends on n, V, and T, which are equal, and average kinetic energy depends only on temperature; helium atoms move faster but strike with less mass.',
        },
      },
      {
        heading: 'Solutions, separations, and spectroscopy',
        topics: ['3.7', '3.8', '3.9', '3.10', '3.11', '3.12', '3.13'],
        content: 'A solution is a homogeneous mixture whose composition is expressed as molarity, moles of solute per liter of solution. Particle-level pictures show solvent molecules surrounding dissolved ions or molecules; solubility depends on whether solute-solvent attractions compete with the attractions each had before mixing, which is why polar solutes dissolve in polar solvents. Mixtures are separated by exploiting differences in properties: distillation uses boiling points, chromatography uses differing attraction to a stationary phase, and filtration uses particle size. Light interacts with matter in ways that identify and quantify substances: different regions of the electromagnetic spectrum excite electronic, vibrational, or rotational changes, the photoelectric effect shows that light delivers energy in quanta proportional to frequency, and the Beer-Lambert law relates absorbance to concentration and path length.',
        keyTerms: ['molarity', 'solvation', 'chromatography', 'photoelectric effect', 'Beer-Lambert law'],
        rich: {
          examples: ['A dye that moves farther up a paper chromatogram has a weaker attraction to the paper than one that stays near the origin.', 'Doubling the concentration of a colored solution in the same cuvette doubles its absorbance.'],
          nonExamples: ['A saturated solution is not necessarily concentrated; a sparingly soluble salt saturates at a very low molarity.', 'Increasing the intensity of light below the threshold frequency does not eject electrons; only the frequency determines whether it can.'],
          misconception: 'Molarity is defined per liter of solution, not per liter of solvent, so adding solute to a fixed volume of water gives a total volume that is not exactly that of the water.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Absorbance rises linearly with concentration across the measured range.', 'The Beer-Lambert relationship holds and can be used as a calibration curve.', 'That the relationship stays linear at much higher concentrations.'], ['Two liquids separate cleanly by distillation.', 'Their boiling points differ enough to vaporize one before the other.', 'That either liquid is pure after a single distillation.']],
          retrieval: ['Calculate the molarity of a solution from mass of solute and volume of solution.', 'Explain what property each of distillation, chromatography, and filtration exploits.', 'State the two quantities that absorbance depends on at a fixed wavelength.'],
          transfer: 'When a question involves a mixture, decide first whether it asks about composition, separation, or measurement by light, then apply the one relationship that governs that step.',
        },
        check: {
          prompt: 'A solution of a colored compound has an absorbance of 0.30 in a 1.0 cm cell. The solution is diluted to half its original concentration and measured in the same cell. The expected absorbance is',
          choices: ['0.60', '0.30', '0.15', '0.09'],
          answerIndex: 2,
          rationale: 'Absorbance is directly proportional to concentration at fixed path length and wavelength, so halving the concentration halves the absorbance.',
        },
      },
    ],
  },
  // Unit 4: Chemical Reactions
  {
    unit: 4,
    section1Topics: ['4.1', '4.2', '4.3', '4.4'],
    sections: [
      {
        heading: 'Stoichiometry and titration',
        topics: ['4.5', '4.6'],
        content: 'A balanced equation gives mole ratios between reactants and products, and stoichiometry uses those ratios with molar masses and molarities to convert between masses, moles, volumes of solution, and volumes of gas. When reactants are not present in the exact ratio, the limiting reactant is consumed first and sets the maximum product; the other reactant is in excess. Percent yield compares the actual amount obtained to that theoretical maximum. Titration applies stoichiometry to solutions: a solution of known concentration is added to one of unknown concentration until an indicator or a measurement shows the equivalence point, where the moles of titrant match the stoichiometric requirement.',
        keyTerms: ['mole ratio', 'limiting reactant', 'theoretical yield', 'titrant', 'equivalence point'],
        rich: {
          examples: ['Burning 2 mol of hydrogen with 2 mol of oxygen produces 2 mol of water and leaves 1 mol of oxygen unreacted, because hydrogen is limiting.', 'If 25.0 mL of 0.100 M sodium hydroxide neutralizes 20.0 mL of an acid, the acid concentration follows from the mole ratio in the balanced equation.'],
          nonExamples: ['The reactant present in the smaller mass is not necessarily limiting; the comparison must be made in moles against the balanced ratio.', 'The endpoint shown by an indicator is not identical to the equivalence point; a well-chosen indicator makes them very close.'],
          misconception: 'Coefficients in a balanced equation are mole ratios, not mass ratios, so equal masses of reactants almost never react completely.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['Adding more of reactant A to a mixture does not increase the product.', 'A was in excess and another reactant limits the reaction.', 'Which other reactant is limiting without amounts.'], ['A titration curve shows a sharp rise in pH after 22.4 mL of base is added.', 'The equivalence point is near 22.4 mL.', 'The identity of the acid or whether it is strong or weak from this point alone.']],
          retrieval: ['Convert grams of one reactant to grams of a product using a balanced equation.', 'Identify the limiting reactant from given amounts of two reactants.', 'Calculate an unknown concentration from titration data.'],
          transfer: 'For every stoichiometry problem, convert to moles first, apply the balanced ratio, and only then convert to the unit the question wants.',
        },
        check: {
          prompt: 'A reaction requires 2 mol of A for every 1 mol of B. If 3 mol of A and 2 mol of B are mixed, which is the limiting reactant and how much of the other remains?',
          choices: ['B is limiting; 1 mol of A remains', 'A is limiting; 0.5 mol of B remains', 'Neither; both are consumed completely', 'A is limiting; 1 mol of B remains'],
          answerIndex: 1,
          rationale: '3 mol of A reacts with 1.5 mol of B, so A runs out first and 0.5 mol of B is left over.',
        },
      },
      {
        heading: 'Reaction types: acid-base and redox',
        topics: ['4.7', '4.8', '4.9'],
        content: 'Chemical reactions are classified by what is transferred or rearranged. Precipitation reactions form an insoluble product from dissolved ions. Acid-base reactions transfer a proton from a Brønsted-Lowry acid to a base; strong acids and bases dissociate completely in water and weak ones only partially. Oxidation-reduction reactions transfer electrons: the species that loses electrons is oxidized and is the reducing agent, and the species that gains them is reduced and is the oxidizing agent. Oxidation numbers track electrons through a reaction, and half-reactions show the oxidation and reduction separately so that electrons balance when they are combined.',
        keyTerms: ['precipitation', 'Brønsted-Lowry base', 'oxidation number', 'oxidizing agent', 'half-reaction'],
        rich: {
          examples: ['When zinc metal is placed in copper sulfate solution, zinc is oxidized to zinc ions and copper ions are reduced to copper metal.', 'Ammonia acts as a base by accepting a proton from water, producing ammonium and hydroxide ions.'],
          nonExamples: ['A reaction involving oxygen is not necessarily a redox reaction in the sense of electron transfer, and many redox reactions involve no oxygen at all.', 'A strong acid is not the same as a concentrated acid; strength describes the degree of dissociation, concentration describes the amount per liter.'],
          misconception: 'The oxidizing agent is the species that is itself reduced; it causes oxidation of something else, so its own oxidation number decreases.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A copper wire in silver nitrate solution grows silver crystals and the solution turns blue.', 'Copper is oxidized and silver ions are reduced.', 'The exact number of electrons transferred per atom without oxidation numbers.'], ['Mixing two clear solutions produces a white solid.', 'A precipitation reaction formed an insoluble ionic compound.', 'The identity of the solid without solubility rules or further testing.']],
          retrieval: ['Assign oxidation numbers to each element in a simple compound.', 'Identify the acid, base, and conjugate pairs in a proton-transfer reaction.', 'Write and balance the two half-reactions for a single-displacement redox reaction.'],
          transfer: 'When classifying a reaction, ask whether a proton moved, whether electrons moved, or whether ions combined into a solid; that decides the type and the rules to apply.',
        },
        check: {
          prompt: 'In the reaction Zn + Cu2+ → Zn2+ + Cu, which species is the oxidizing agent?',
          choices: ['Zn, because it loses electrons', 'Zn2+, because it is the product of oxidation', 'Cu, because it is a metal', 'Cu2+, because it gains electrons and is reduced'],
          answerIndex: 3,
          rationale: 'The oxidizing agent accepts electrons and is itself reduced; Cu2+ gains two electrons to become Cu.',
        },
      },
    ],
  },
  // Unit 5: Kinetics
  {
    unit: 5,
    section1Topics: ['5.1', '5.2', '5.3'],
    sections: [
      {
        heading: 'Collision model and reaction energy profiles',
        topics: ['5.4', '5.5', '5.6'],
        content: 'An elementary reaction happens in a single step, and its rate law follows directly from its molecularity: a unimolecular step is first order and a bimolecular step is second order overall. The collision model explains why: reaction requires particles to collide with enough energy to overcome the activation barrier and with a suitable orientation. Raising temperature increases the fraction of collisions with sufficient energy, which is why rates rise steeply with temperature. A reaction energy profile plots potential energy along the reaction coordinate; the peak is the transition state, the height of the peak above the reactants is the activation energy, and the difference between products and reactants is the overall energy change.',
        keyTerms: ['elementary reaction', 'molecularity', 'collision model', 'activation energy', 'transition state'],
        rich: {
          examples: ['A bimolecular elementary step A + B → C has the rate law rate equals k[A][B] by inspection.', 'Warming a reaction by ten degrees can double its rate because many more collisions clear the activation barrier.'],
          nonExamples: ['The rate law of an overall reaction cannot be read from its balanced equation unless the reaction is a single elementary step.', 'A reaction with a large negative energy change is not necessarily fast; the activation barrier, not the overall change, sets the rate.'],
          misconception: 'Raising the temperature does not mainly increase the number of collisions; it increases the fraction of collisions energetic enough to react, which has a far larger effect.',
          dataHeaders: ['Energy profile feature', 'Supports', 'Does not establish'],
          dataRows: [['The products sit below the reactants on the profile.', 'The reaction releases energy overall.', 'That the reaction is fast.'], ['The peak is much higher for the reverse direction than the forward direction.', 'The reverse reaction has a larger activation energy and is slower at the same temperature.', 'The absolute rate of either direction without a rate constant.']],
          retrieval: ['Write the rate law for a given elementary step.', 'Name the two requirements a collision must meet to lead to reaction.', 'Label activation energy, transition state, and overall energy change on a profile.'],
          transfer: 'For a rate question, decide whether the step given is elementary; if it is, read the rate law from its molecularity, and if not, look for the slow step or experimental data instead.',
        },
        check: {
          prompt: 'For the elementary reaction 2 NO2 → N2O4, the rate law is',
          choices: ['rate = k[NO2]', 'rate = k[NO2]2', 'rate = k[N2O4]', 'rate = k[NO2]/[N2O4]'],
          answerIndex: 1,
          rationale: 'An elementary step involving two NO2 molecules is bimolecular, so the rate is proportional to the square of the NO2 concentration.',
        },
      },
      {
        heading: 'Reaction mechanisms and catalysis',
        topics: ['5.7', '5.8', '5.9', '5.10', '5.11'],
        content: 'A mechanism is a sequence of elementary steps that adds up to the overall reaction. Species that appear in one step and are consumed in a later one are intermediates; they never appear in the overall equation. The slowest step, the rate-determining step, controls the rate, and a proposed mechanism must give a rate law consistent with experiment. When the slow step follows a fast equilibrium, intermediates in its rate law are replaced using the equilibrium relationship. A multistep reaction has an energy profile with one peak per step and valleys for intermediates. A catalyst provides a different pathway with lower activation energy; it is consumed in one step and regenerated in another, so it appears in the mechanism but not in the overall equation, and it does not change the position of equilibrium.',
        keyTerms: ['reaction mechanism', 'intermediate', 'rate-determining step', 'catalyst', 'multistep energy profile'],
        rich: {
          examples: ['A proposed mechanism whose slow step is A + B → C predicts rate equals k[A][B]; if experiment shows first order in A only, the mechanism is rejected.', 'An enzyme lowers the activation energy for a biochemical reaction, speeding both the forward and reverse rates equally.'],
          nonExamples: ['An intermediate is not a catalyst; the catalyst enters first and returns at the end, while the intermediate is made first and used up.', 'A catalyst does not increase the yield of a reaction at equilibrium; it only shortens the time to reach it.'],
          misconception: 'A mechanism consistent with the rate law is supported, not proven; more than one mechanism can predict the same rate law.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['The experimental rate law has an order that does not match the coefficients of the overall equation.', 'The reaction occurs in more than one step.', 'The identity of the slow step without more data.'], ['Adding a small amount of substance X speeds a reaction and X is recovered unchanged.', 'X is acting as a catalyst.', 'That X lowers the overall energy change of the reaction.']],
          retrieval: ['Identify the intermediates and the catalyst in a given mechanism.', 'Derive the rate law from a mechanism with a slow first step.', 'Sketch an energy profile for a two-step reaction and label the intermediate.'],
          transfer: 'For a mechanism question, add the steps to confirm they give the overall reaction, find the slow step, write its rate law, and then check that law against the data before accepting the mechanism.',
        },
        check: {
          prompt: 'In a two-step mechanism, a species is produced in step 1 and consumed in step 2. It does not appear in the overall balanced equation. This species is',
          choices: ['a catalyst', 'the rate-determining reactant', 'an intermediate', 'a product'],
          answerIndex: 2,
          rationale: 'A species formed in one step and consumed in a later one is an intermediate; a catalyst is consumed first and regenerated afterward.',
        },
      },
    ],
  },
  // Unit 6: Thermochemistry
  {
    unit: 6,
    section1Topics: ['6.1', '6.2', '6.3'],
    sections: [
      {
        heading: 'Calorimetry and the energy of phase changes',
        topics: ['6.4', '6.5'],
        content: 'Heat capacity is the energy needed to raise the temperature of an object by one kelvin, and specific heat capacity is the same quantity per gram. The heat transferred in a temperature change is the mass times the specific heat times the temperature change, q equals mcΔT. Calorimetry measures the energy change of a process from the temperature change of a known mass of water or of a calorimeter, assuming energy is conserved between the system and its surroundings. During a phase change the temperature stays constant while energy goes into overcoming intermolecular attractions, so the energy of melting or vaporizing is the amount per mole times the amount of substance and does not involve ΔT. A heating curve shows sloped segments for temperature changes and flat segments for phase changes.',
        keyTerms: ['specific heat capacity', 'calorimetry', 'heat of fusion', 'heat of vaporization', 'heating curve'],
        rich: {
          examples: ['Water’s high specific heat means a lake warms and cools slowly compared with the surrounding land.', 'Steam at 100 degrees Celsius causes worse burns than liquid water at the same temperature because it releases its heat of vaporization on condensing.'],
          nonExamples: ['A flat segment on a heating curve does not mean no energy is being added; it means the energy is changing the phase rather than the temperature.', 'Two objects at the same temperature do not necessarily hold the same thermal energy; the one with the greater heat capacity holds more.'],
          misconception: 'Heat flows because of a temperature difference, not because one object contains more heat; heat is energy in transfer, not a substance stored in a body.',
          dataHeaders: ['Calorimetry observation', 'Supports', 'Does not establish'],
          dataRows: [['Water in a coffee-cup calorimeter warms by 3.2 degrees when a salt dissolves.', 'The dissolving process released energy to the water.', 'The exact enthalpy of solution without accounting for heat absorbed by the cup.'], ['A metal sample cools by 40 degrees while the water it was placed in warms by 2 degrees.', 'The metal has a much smaller heat capacity than the water sample.', 'The identity of the metal without its mass.']],
          retrieval: ['Calculate the heat required to warm a given mass of water by a given amount.', 'Explain why the temperature stays constant during melting.', 'Describe how a calorimeter is used to find the energy change of a reaction.'],
          transfer: 'For a heating or cooling problem, break the path into temperature changes and phase changes, apply mcΔT to the first kind and moles times the phase-change energy to the second, and add them.',
        },
        check: {
          prompt: 'A 50.0 g sample of a metal at 90.0 degrees Celsius is placed in 100.0 g of water at 20.0 degrees Celsius, and both reach 22.0 degrees Celsius. Which conclusion is best supported?',
          choices: ['The metal has a higher specific heat than water', 'The metal released the same amount of heat that the water absorbed', 'The water released heat to the metal', 'The metal and water exchanged no energy'],
          answerIndex: 1,
          rationale: 'Energy is conserved; the heat lost by the metal equals the heat gained by the water, and the small water temperature change with the large metal change shows the metal has the lower specific heat.',
        },
      },
      {
        heading: 'Enthalpy of reaction: bond enthalpies, formation, and Hess’s law',
        topics: ['6.6', '6.7', '6.8', '6.9'],
        content: 'The enthalpy change of a reaction is the energy transferred as heat at constant pressure, negative for exothermic and positive for endothermic reactions, and it scales with the amount of reaction that occurs. It can be estimated from bond enthalpies: energy is required to break the bonds in the reactants and released when the bonds in the products form, so ΔH is approximately the sum of bonds broken minus the sum of bonds formed. It can be calculated exactly from standard enthalpies of formation as the sum for products minus the sum for reactants, because the formation enthalpy of an element in its standard state is zero. Hess’s law states that enthalpy is a state function, so the enthalpy change of a reaction is the same whether it occurs in one step or in several, which lets known reactions be combined to find an unknown one.',
        keyTerms: ['enthalpy of reaction', 'bond enthalpy', 'standard enthalpy of formation', 'state function', 'Hess’s law'],
        rich: {
          examples: ['Combustion of methane is exothermic because the strong carbon-oxygen and oxygen-hydrogen bonds formed release more energy than breaking the carbon-hydrogen and oxygen-oxygen bonds requires.', 'Reversing a reaction changes the sign of its enthalpy change, and doubling its coefficients doubles the magnitude.'],
          nonExamples: ['Bond enthalpy estimates are averages across many compounds, so a result from them is approximate rather than exact.', 'A negative enthalpy change does not guarantee a reaction happens; favorability also depends on entropy.'],
          misconception: 'Bond breaking always requires energy and bond forming always releases it; the sign of the reaction enthalpy depends on which total is larger, not on breaking alone.',
          dataHeaders: ['Calculation input', 'Supports', 'Does not establish'],
          dataRows: [['Bonds broken total 2,800 kJ and bonds formed total 3,200 kJ per mole of reaction.', 'The reaction is exothermic by roughly 400 kJ per mole.', 'The exact enthalpy change, since bond enthalpies are averages.'], ['Two known reactions add to give the target reaction after one is reversed.', 'The target enthalpy is the sum of the first and the negative of the second.', 'Anything about the rate of the target reaction.']],
          retrieval: ['Estimate a reaction enthalpy from a table of bond enthalpies.', 'Calculate a reaction enthalpy from standard enthalpies of formation.', 'Combine two given reactions using Hess’s law to obtain a third.'],
          transfer: 'When asked for a reaction enthalpy, identify which data are given, bond enthalpies, formation enthalpies, or other reactions, and use the one method that matches, keeping track of signs and coefficients.',
        },
        check: {
          prompt: 'The enthalpy change for reaction A is +50 kJ and for reaction B is −120 kJ. The target reaction equals reaction A plus the reverse of reaction B. Its enthalpy change is',
          choices: ['−70 kJ', '+170 kJ', '−170 kJ', '+70 kJ'],
          answerIndex: 1,
          rationale: 'Reversing B changes its sign to +120 kJ; adding +50 kJ gives +170 kJ by Hess’s law.',
        },
      },
    ],
  },
  // Unit 7: Equilibrium
  {
    unit: 7,
    section1Topics: ['7.1', '7.2', '7.3', '7.9', '7.10'],
    sections: [
      {
        heading: 'Calculating and interpreting the equilibrium constant',
        topics: ['7.4', '7.5', '7.6', '7.7', '7.8'],
        content: 'The equilibrium constant K is the ratio of product concentrations to reactant concentrations at equilibrium, each raised to its coefficient, with pure solids and liquids omitted. A very large K means the reaction goes nearly to completion and a very small K means it barely proceeds; a K near 1 means substantial amounts of both remain. K depends only on temperature. Reversing a reaction takes the reciprocal of K, multiplying coefficients raises K to that power, and adding reactions multiplies their constants. An ICE table organizes initial concentrations, the change in terms of a single variable, and the equilibrium concentrations so that K can be calculated or equilibrium amounts predicted; when K is very small the change is often negligible compared with the initial amount, which simplifies the algebra. Particle diagrams and graphs of concentration against time show the same equilibrium quantitatively.',
        keyTerms: ['equilibrium expression', 'magnitude of K', 'ICE table', 'small-x approximation', 'equilibrium representation'],
        rich: {
          examples: ['For N2 + 3 H2 ⇌ 2 NH3, K equals [NH3]2 divided by [N2][H2]3, and the reverse reaction has K equal to the reciprocal.', 'A weak acid with K of 1.8 × 10−5 dissociates so little that the change can be neglected relative to a 0.10 M starting concentration.'],
          nonExamples: ['A large K does not mean the reaction is fast; K describes the position of equilibrium, not how quickly it is reached.', 'Concentrations in an equilibrium expression are those at equilibrium, not the initial concentrations.'],
          misconception: 'Solids and pure liquids are left out of the equilibrium expression because their concentrations are constant, not because they do not participate in the reaction.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A concentration-versus-time graph shows all curves leveling off at the same time.', 'The system has reached equilibrium.', 'That the forward and reverse reactions have stopped.'], ['A particle diagram at equilibrium shows far more product particles than reactant particles.', 'K is greater than 1 for this reaction.', 'The numerical value of K without counting and the stoichiometry.']],
          retrieval: ['Write the equilibrium expression for a reaction involving a solid and a gas.', 'Set up an ICE table for a reaction starting from known initial concentrations.', 'State how K changes when a reaction is reversed and when it is doubled.'],
          transfer: 'For an equilibrium calculation, write the expression first, then the ICE table, and check whether K is small enough to approximate before solving.',
        },
        check: {
          prompt: 'For the reaction A ⇌ 2 B, K = 4.0 at a certain temperature. What is K for the reaction 2 B ⇌ A at the same temperature?',
          choices: ['4.0', '0.25', '2.0', '16'],
          answerIndex: 1,
          rationale: 'Reversing a reaction gives the reciprocal of K, and 1 divided by 4.0 is 0.25.',
        },
      },
      {
        heading: 'Solubility equilibria and the common-ion effect',
        topics: ['7.11', '7.12'],
        content: 'A sparingly soluble ionic solid establishes an equilibrium with its dissolved ions, described by the solubility product Ksp, which is the product of the ion concentrations raised to their coefficients. Ksp can be found from a measured solubility and, in reverse, molar solubility can be calculated from Ksp using the stoichiometry of dissolution. Comparing the ion product Q with Ksp predicts whether a precipitate forms: if Q exceeds Ksp the solution is supersaturated and solid forms. Adding a solution that already contains one of the ions, the common-ion effect, shifts the equilibrium toward the solid and lowers solubility, exactly as Le Chatelier’s principle predicts.',
        keyTerms: ['solubility product', 'molar solubility', 'ion product', 'precipitation prediction', 'common-ion effect'],
        rich: {
          examples: ['Silver chloride is far less soluble in a sodium chloride solution than in pure water because the added chloride shifts the equilibrium toward the solid.', 'Mixing two solutions whose ion product exceeds the Ksp of a salt produces a precipitate of that salt.'],
          nonExamples: ['A larger Ksp does not always mean greater molar solubility when the salts have different formulas; the stoichiometry changes the relationship.', 'The common-ion effect lowers solubility; it does not change the value of Ksp, which depends only on temperature.'],
          misconception: 'Ksp is a constant at a given temperature; adding a common ion lowers the solubility but leaves Ksp unchanged, because the other ion’s concentration falls to compensate.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A salt has a measured molar solubility of 1.0 × 10−4 M and dissolves into one cation and one anion.', 'Ksp is about 1.0 × 10−8.', 'Its solubility in a solution already containing one of its ions.'], ['No precipitate forms when two solutions are mixed.', 'Q is at or below Ksp for every possible salt.', 'That the solution is unsaturated by a wide margin.']],
          retrieval: ['Write the Ksp expression for a salt that dissolves into two cations and one anion.', 'Calculate molar solubility from a given Ksp.', 'Predict whether a precipitate forms from Q and Ksp.'],
          transfer: 'For a solubility question, write the dissolution equation with its coefficients before anything else; every step, from Ksp to the common-ion effect, follows from that stoichiometry.',
        },
        check: {
          prompt: 'Solid barium sulfate is in equilibrium with its ions in water. Sodium sulfate is then dissolved in the solution. Which change is expected?',
          choices: ['Ksp of barium sulfate increases', 'The concentration of dissolved barium ions decreases', 'More barium sulfate dissolves', 'The solution becomes unsaturated'],
          answerIndex: 1,
          rationale: 'Added sulfate is a common ion; the equilibrium shifts toward the solid, lowering the barium ion concentration while Ksp stays constant.',
        },
      },
    ],
  },
  // Unit 8: Acids and Bases
  {
    unit: 8,
    section1Topics: ['8.1', '8.2', '8.3'],
    sections: [
      {
        heading: 'Acid-base titrations and the molecular structure of acids',
        topics: ['8.4', '8.5', '8.6'],
        content: 'Neutralization between an acid and a base produces water and a salt, and the pH of the resulting solution depends on whether the reactants were strong or weak. A titration curve of pH against volume of titrant reveals this: a strong acid with a strong base gives an equivalence point at pH 7, while a weak acid gives an equivalence point above 7 because its conjugate base remains. For a weak acid, the region before the equivalence point is a buffer, and at the half-equivalence point the pH equals the pKa. Molecular structure explains acid strength: a bond to hydrogen that is more polar or weaker releases the proton more readily, and electronegative atoms near the acidic hydrogen or resonance in the conjugate base stabilize the negative charge and make the acid stronger.',
        keyTerms: ['neutralization', 'titration curve', 'half-equivalence point', 'conjugate base stability', 'inductive effect'],
        rich: {
          examples: ['Trichloroacetic acid is a much stronger acid than acetic acid because the chlorine atoms pull electron density away from the acidic bond.', 'A weak acid titrated with a strong base reaches pH equal to pKa when half the acid has been neutralized.'],
          nonExamples: ['An equivalence point is not always at pH 7; only a strong acid with a strong base gives a neutral solution there.', 'A more concentrated acid is not a stronger acid; strength is about the fraction that dissociates.'],
          misconception: 'The steepest part of a titration curve, not its highest point, marks the equivalence point, and for a weak acid that point lies above pH 7.',
          dataHeaders: ['Titration observation', 'Supports', 'Does not establish'],
          dataRows: [['The pH at the equivalence point is 8.7.', 'A weak acid was titrated with a strong base.', 'The pKa of the acid without the half-equivalence reading.'], ['The pH at half the equivalence volume is 4.8.', 'The pKa of the acid is about 4.8.', 'The concentration of the acid without the equivalence volume.']],
          retrieval: ['Sketch the titration curve of a weak acid with a strong base and label the equivalence and half-equivalence points.', 'Explain why the equivalence point of a weak acid titration is basic.', 'Predict which of two structurally similar acids is stronger and why.'],
          transfer: 'For a titration curve, find the steep region first to get the equivalence volume, then use half that volume to read the pKa, and classify the acid from the equivalence pH.',
        },
        check: {
          prompt: 'A 0.10 M solution of a weak acid is titrated with 0.10 M sodium hydroxide. At the equivalence point the pH is most likely',
          choices: ['exactly 7, because the moles of acid and base are equal', 'below 7, because excess acid remains', 'above 7, because the conjugate base of the weak acid is present', 'equal to the pKa of the acid'],
          answerIndex: 2,
          rationale: 'At equivalence only the conjugate base and water remain; the conjugate base of a weak acid is weakly basic, so the pH is above 7.',
        },
      },
      {
        heading: 'Buffers: pKa, Henderson-Hasselbalch, capacity, and solubility',
        topics: ['8.7', '8.8', '8.9', '8.10', '8.11'],
        content: 'A buffer is a solution of a weak acid and its conjugate base, or a weak base and its conjugate acid, that resists changes in pH. Added acid is consumed by the conjugate base and added base by the weak acid, so the ratio of the two changes only slightly. The Henderson-Hasselbalch equation, pH equals pKa plus the logarithm of the base-to-acid ratio, gives the pH of a buffer and shows that pH equals pKa when the two components are equal. A buffer is most effective near its pKa, and its capacity, the amount of acid or base it can absorb, depends on the absolute concentrations of the components. Because pH controls whether an ion is protonated, the solubility of salts of weak acids or bases changes with pH: a salt of a weak acid dissolves more in acidic solution because the anion is removed as the acid forms.',
        keyTerms: ['buffer', 'Henderson-Hasselbalch equation', 'buffer capacity', 'pH and solubility', 'protonation'],
        rich: {
          examples: ['Blood is buffered near pH 7.4 by carbonic acid and bicarbonate, absorbing acid produced by metabolism.', 'Calcium carbonate dissolves in acidic solution because the carbonate ion is converted to bicarbonate and carbonic acid.'],
          nonExamples: ['A strong acid with its conjugate base is not a buffer; the conjugate base of a strong acid is too weak to absorb added acid.', 'A buffer does not hold pH perfectly constant; it limits the change until its capacity is exceeded.'],
          misconception: 'The pH of a buffer depends on the ratio of base to acid, not on their absolute amounts, but the capacity to resist change depends on the absolute amounts.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A buffer with equal acid and base concentrations has pH 4.76.', 'The pKa of the weak acid is 4.76.', 'How much strong base the buffer can absorb without knowing the concentrations.'], ['A sparingly soluble salt dissolves noticeably more in a solution of pH 3 than at pH 7.', 'The anion of the salt is a weak base that is protonated in acid.', 'That the salt would also dissolve more in basic solution.']],
          retrieval: ['Calculate the pH of a buffer from its pKa and the base-to-acid ratio.', 'Explain what happens in a buffer when a small amount of strong acid is added.', 'Predict how lowering the pH affects the solubility of a salt of a weak acid.'],
          transfer: 'For a buffer question, identify the weak acid and its conjugate base, write the ratio, apply Henderson-Hasselbalch, and check whether the added amount exceeds the smaller component before trusting the result.',
        },
        check: {
          prompt: 'A buffer contains 0.20 M acetic acid and 0.20 M sodium acetate; the pKa of acetic acid is 4.76. A second buffer contains 0.020 M of each. Which statement is correct?',
          choices: ['The two buffers have the same pH but the first has greater capacity', 'The first buffer has a higher pH because it is more concentrated', 'The second buffer has greater capacity because it is dilute', 'The two buffers have different pH values and equal capacity'],
          answerIndex: 0,
          rationale: 'Equal acid-to-base ratios give the same pH, equal to the pKa; the more concentrated buffer can absorb more added acid or base.',
        },
      },
    ],
  },
  // Unit 9: Applications of Thermodynamics
  {
    unit: 9,
    section1Topics: ['9.1', '9.2', '9.3'],
    sections: [
      {
        heading: 'Free energy, equilibrium, and coupled reactions',
        topics: ['9.4', '9.5', '9.6'],
        content: 'A reaction can be thermodynamically favorable yet proceed imperceptibly slowly if its activation energy is large, so favorability and rate are separate questions: thermodynamic control asks whether products are lower in free energy, and kinetic control asks whether the barrier can be crossed. The standard free energy change is related to the equilibrium constant by ΔG° equals −RT ln K, so a negative ΔG° means K is greater than 1 and products are favored at equilibrium, while ΔG° of zero means K equals 1. Under nonstandard conditions the free energy change depends on the reaction quotient and drives the system toward equilibrium from either side. A thermodynamically unfavorable reaction can be made to occur by coupling it to a favorable one that shares an intermediate, so the combined free energy change is negative, which is how cells use the hydrolysis of ATP and how metals are extracted from ores.',
        keyTerms: ['thermodynamic favorability', 'kinetic control', 'free energy and K', 'reaction quotient', 'coupled reaction'],
        rich: {
          examples: ['Diamond converting to graphite is thermodynamically favorable but does not occur at an observable rate because the activation barrier is immense.', 'The unfavorable formation of glucose-6-phosphate is driven by coupling it to the favorable hydrolysis of ATP.'],
          nonExamples: ['A negative ΔG° does not mean the reaction goes to completion; it means K is greater than 1, and reactants still remain at equilibrium.', 'A positive ΔG° does not mean no product forms; it means the equilibrium mixture contains more reactant than product.'],
          misconception: 'ΔG° tells you the direction and extent under standard conditions; the actual free energy change at a given moment depends on Q, and it reaches zero at equilibrium.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A reaction has ΔG° of −40 kJ per mole but no product appears over a week at room temperature.', 'The reaction is under kinetic control with a high activation energy.', 'That the reaction would not be favorable at a different temperature.'], ['Two reactions with ΔG° of +30 kJ and −50 kJ share an intermediate.', 'The coupled process has ΔG° of −20 kJ and is favorable.', 'That either reaction alone is fast.']],
          retrieval: ['Relate the sign of ΔG° to whether K is greater than or less than 1.', 'Distinguish a reaction that is thermodynamically favorable from one that is kinetically accessible.', 'Explain how coupling makes an unfavorable reaction occur.'],
          transfer: 'When asked whether a reaction will occur, answer two separate questions, whether it is favorable and whether it is fast, and do not let the answer to one substitute for the other.',
        },
        check: {
          prompt: 'A reaction has a standard free energy change of −15 kJ per mole. Which conclusion is correct?',
          choices: ['The reaction is fast at room temperature', 'The reaction goes to completion with no reactant remaining', 'K is greater than 1 and products are favored at equilibrium', 'K is less than 1 and reactants are favored at equilibrium'],
          answerIndex: 2,
          rationale: 'A negative ΔG° corresponds to K greater than 1; it says nothing about the rate and does not imply complete conversion.',
        },
      },
      {
        heading: 'Electrochemical cells and electrolysis',
        topics: ['9.7', '9.8', '9.9', '9.10', '9.11'],
        content: 'An electrochemical cell separates the oxidation and reduction halves of a redox reaction so that electrons flow through an external circuit. In a galvanic cell the reaction is favorable and produces electrical energy: oxidation occurs at the anode, reduction at the cathode, electrons flow from anode to cathode, and a salt bridge keeps the solutions electrically neutral. The standard cell potential is the difference between the standard reduction potentials of the cathode and anode, and a positive potential corresponds to a negative free energy change through ΔG° equals −nFE°. Under nonstandard conditions the cell potential shifts with the reaction quotient and falls to zero at equilibrium. In an electrolytic cell an external source forces an unfavorable reaction to occur; the same electrode definitions apply, and Faraday’s law relates the quantity of substance produced to the current and time through the moles of electrons transferred.',
        keyTerms: ['galvanic cell', 'standard reduction potential', 'cell potential', 'electrolytic cell', 'Faraday’s law'],
        rich: {
          examples: ['A zinc-copper cell has a standard potential of about 1.10 V, the difference between the copper and zinc reduction potentials.', 'Passing 2 mol of electrons through molten sodium chloride deposits 2 mol of sodium and releases 1 mol of chlorine gas.'],
          nonExamples: ['The anode is not always negative; it is negative in a galvanic cell and positive in an electrolytic cell, but oxidation occurs there in both.', 'Multiplying a half-reaction by a coefficient does not multiply its reduction potential; potentials are intensive.'],
          misconception: 'Electrons do not travel through the salt bridge; they move through the external wire, while ions move through the salt bridge to balance charge.',
          dataHeaders: ['Observation', 'Supports', 'Does not establish'],
          dataRows: [['A cell’s voltage drops slowly as it operates and reaches zero.', 'The reaction has approached equilibrium and Q has risen toward K.', 'That the electrodes have been consumed entirely.'], ['A current of 2.0 A for 965 s deposits 0.010 mol of a metal.', 'Two moles of electrons are needed per mole of metal, so the ion carries a 2+ charge.', 'The identity of the metal without its mass.']],
          retrieval: ['Identify the anode and cathode of a galvanic cell from standard reduction potentials and calculate its potential.', 'State the relationship between cell potential and free energy change.', 'Calculate the mass of metal deposited by a given current over a given time.'],
          transfer: 'For any cell question, write the two half-reactions, decide which is reduction from the potentials or from the applied source, and only then trace electron flow and calculate potential or quantity.',
        },
        check: {
          prompt: 'In an operating galvanic cell, which statement correctly describes the flow of charge?',
          choices: ['Electrons move through the salt bridge from cathode to anode', 'Electrons move through the external wire from anode to cathode, and ions move through the salt bridge', 'Cations move through the wire toward the anode', 'Electrons move through the external wire from cathode to anode'],
          answerIndex: 1,
          rationale: 'Oxidation at the anode releases electrons that travel through the wire to the cathode; the salt bridge carries ions to keep each half-cell neutral.',
        },
      },
    ],
  },
]);

module.exports = { AP_CHEMISTRY_UNIT_SECTIONS };
