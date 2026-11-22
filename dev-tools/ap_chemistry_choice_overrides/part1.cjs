'use strict';

// Choice-length parity, asymmetric-extreme distractor, and recall-stem overrides
// for AP Chemistry item bank slice 1 (excluding pure numeric/formula/unit/name ties).

module.exports = {
  'ap-chem-u1-003': {
    answer: 'The element has two isotopes, with the mass-35 isotope in greater abundance.',
  },
  'ap-chem-u1-004': {
    answer: 'Both peaks correspond to the same isotope mass, not a different isotope.',
  },
  'ap-chem-u1-006': {
    distractorReplacements: {
      'The color of the solid only': 'The visible color of the solid',
      'The volume of the container only': 'The total volume of the container',
    },
  },
  'ap-chem-u1-011': {
    answer: 'Electrons closest to the nucleus and most strongly attracted',
  },
  'ap-chem-u1-012': {
    answer: 'The larger peak represents twice as many electrons at that energy.',
  },
  'ap-chem-u1-016': {
    answer: 'Increasing the charge on both ions while keeping sizes similar',
  },
  'ap-chem-u1-018': {
    answer: 'The valence electron is farther from the nucleus and more easily removed as atoms grow larger.',
  },
  'ap-chem-u1-019': {
    answer: 'Molar masses of water and anhydrous salt',
  },
  'ap-chem-u2-021': {
    answer: 'An ionic compound with ions fixed in a solid lattice',
  },
  'ap-chem-u2-022': {
    answer: 'A polar covalent bond with electrons shifted to the more electronegative atom',
  },
  'ap-chem-u2-023': {
    answer: 'The minimum marks where attractive and repulsive forces balance at equilibrium bond length.',
  },
  'ap-chem-u2-024': {
    answer: 'Increasing the bond order from a single bond to a double bond',
  },
  'ap-chem-u2-025': {
    answer: 'Strong electrostatic attractions hold oppositely charged ions in a 3D crystal lattice.',
  },
  'ap-chem-u2-027': {
    answer: 'Delocalized electrons move freely through the lattice while letting metal atom layers slide.',
  },
  'ap-chem-u2-028': {
    answer: 'Substituted atoms disrupt the lattice and hinder layer sliding, reducing ductility.',
  },
  'ap-chem-u2-031': {
    answer: 'A single delocalized electron arrangement, not rapidly switching structures.',
  },
  'ap-chem-u2-035': {
    answer: 'Two lone pairs on oxygen repel bonding pairs strongly, compressing the angle.',
  },
  'ap-chem-u2-037': {
    answer: 'A triple bond counts as one VSEPR electron domain, giving the central atom three domains.',
    distractorReplacements: {
      'A triple bond always counts as three separate electron domains when the domains are counted.':
        'A triple bond counts as three separate electron domains when the central domains are counted.',
      'A single bond contributes no electron domain at all because only lone pairs affect the geometry.':
        'A single bond contributes no electron domain because lone pairs alone determine the geometry.',
      'Electron domains can be counted only after every atom has been assigned its own formal charge.':
        'Electron domains can be counted after every atom in the drawing is assigned a formal charge.',
    },
  },
  'ap-chem-u2-038': {
    answer: 'The molecular solid is held together by intermolecular forces weaker than ionic attractions.',
    distractorReplacements: {
      'Ionic solids are held together only by temporary dipoles that form between neighboring ions.':
        'Ionic solids are held together mainly by temporary dipoles that form between neighboring ions.',
      'Molecular solids always have the greater lattice energy because their molecules contain more atoms.':
        'Molecular solids typically have greater lattice energy because their molecules contain more atoms.',
    },
  },
  'ap-chem-u2-039': {
    answer: 'The structure with smaller formal charges and less charge separation, all else comparable',
  },
  'ap-chem-u2-040': {
    answer: 'Shifting a layer aligns like charges, causing strong repulsion and fracture.',
  },
  'ap-chem-u3-041': {
    answer: 'Methanol forms hydrogen bonds, while methane experiences weaker dispersion forces.',
  },
  'ap-chem-u3-043': {
    answer: 'Atoms are linked by strong covalent bonds throughout an extended 3D crystal network.',
  },
  'ap-chem-u3-044': {
    distractorReplacements: {
      'The particles stop absorbing energy completely.': 'The particles stop absorbing thermal energy.',
      'The thermometer must be malfunctioning because temperature can never remain constant.':
        'The thermometer must be malfunctioning because temperature cannot remain constant here.',
    },
  },
  'ap-chem-u3-045': {
    answer: 'At 35 degrees Celsius, more molecules have enough kinetic energy to escape.',
  },
  'ap-chem-u3-047': {
    answer: 'Pressure increases as volume decreases since pressure and volume vary inversely.',
  },
  'ap-chem-u3-048': {
    answer: 'The gases have the same average kinetic energy, though average speeds can differ.',
  },
  'ap-chem-u3-049': {
    answer: 'Particles hit container walls more often and with greater momentum change.',
  },
  'ap-chem-u3-056': {
    answer: 'The solid is more soluble at 60 degrees Celsius in water.',
  },
  'ap-chem-u3-057': {
    answer: 'More gas collisions with the liquid surface raise dissolution until equilibrium returns.',
  },
  'ap-chem-u4-066': {
    answer: 'Mixing two colorless solutions produces a gas with a different composition from either reactant.',
  },
  'ap-chem-u4-067': {
    answer: 'The dissolving involves energy transfer, but cooling alone does not prove a new substance formed.',
  },
  'ap-chem-u4-068': {
    answer: 'O2 is limiting; 1.0 mol O2 uses 2.0 mol H2, leaving H2 in excess.',
  },
  'ap-chem-u4-070': {
    answer: 'Initial moles of monoprotic acid, about 0.00250 mol',
  },
  'ap-chem-u4-071': {
    answer: 'Repeat trials with a calibrated buret and add titrant dropwise near the endpoint.',
  },
  'ap-chem-u4-079': {
    answer: 'Carbonate reacts with H+ ions to form carbon dioxide and water.',
  },
  'ap-chem-u5-082': {
    answer: 'Increase the concentration of one reactant while holding other conditions constant.',
  },
  'ap-chem-u5-086': {
    answer: 'The reaction is first order in A, and the slope magnitude equals the rate constant.',
  },
  'ap-chem-u5-088': {
    answer: 'An elementary step is one molecular event, whereas an overall reaction may span multiple steps.',
    distractorReplacements: {
      'Overall reactions never have rate laws at all, because reaction rates cannot be measured in practice.':
        'Overall reactions lack rate laws because experimental reaction rates cannot be measured in practice.',
      'Elementary steps contain no reactants at all, and so their rates are always constant values.':
        'Elementary steps contain no reactants at all, so their reaction rates remain constant values.',
      'The overall equation includes only catalysts and intermediates, and both of those are always measurable.':
        'The overall equation lists catalysts and intermediates, and both species are directly measurable.',
    },
  },
  'ap-chem-u5-089': {
    answer: 'A larger fraction of collisions reaches the activation energy needed to react.',
  },
  'ap-chem-u5-090': {
    answer: 'The surface area for collisions',
  },
  'ap-chem-u5-091': {
    answer: 'It lowers the activation barrier by 30 kJ/mol while keeping reaction enthalpy fixed.',
  },
  'ap-chem-u5-092': {
    answer: 'Both forward and reverse rates increase equally while equilibrium remains unchanged.',
    distractorReplacements: {
      'Only the forward reaction becomes faster, shifting equilibrium permanently to products.':
        'The forward reaction speeds up alone, shifting equilibrium permanently toward products.',
      'Only the reverse reaction becomes faster, shifting equilibrium permanently to reactants.':
        'The reverse reaction speeds up alone, shifting equilibrium permanently toward reactants.',
      'Neither direction changes because catalysts affect only irreversible reactions.':
        'Neither reaction rate changes because catalysts act on irreversible reactions alone.',
    },
  },
  'ap-chem-u5-094': {
    answer: 'Whether the mechanism-derived rate law matches the experimentally measured rate law.',
  },
  'ap-chem-u5-095': {
    answer: 'It expresses the rate law using measurable reactant concentrations instead of the intermediate.',
  },
  'ap-chem-u5-096': {
    distractorReplacements: {
      'The highest peak on the energy profile only': 'The highest transition-state peak on the profile',
      'The starting reactant energy level on the left only': 'The starting reactant energy level shown on the left',
    },
  },
  'ap-chem-u5-097': {
    answer: 'The catalyst speeds up the reaction without changing enthalpy or equilibrium constant.',
  },
  'ap-chem-u5-098': {
    answer: 'The slower reaction has a higher activation-energy barrier or less favorable kinetic pathway.',
  },
  'ap-chem-u6-102': {
    answer: 'The system absorbs heat from its surroundings under these conditions.',
  },
  'ap-chem-u6-104': {
    answer: 'The overall reaction enthalpy change',
  },
  'ap-chem-u6-106': {
    answer: 'The rate at which the temperature difference between contents and room decreases',
  },
  'ap-chem-u6-109': {
    answer: 'Added energy increases potential energy by disrupting the solid instead of raising average kinetic energy.',
  },
  'ap-chem-u6-114': {
    answer: 'Average bond enthalpies vary with context, while formation enthalpies are species-specific values.',
  },
  'ap-chem-u6-117': {
    answer: 'Enthalpy is a state function determined by initial and final states, not path.',
  },
  'ap-chem-u6-119': {
    answer: 'Run a standard trial in the same calorimeter and compare measured heat transfer to expected value.',
  },
  'ap-chem-u7-121': {
    answer: 'Forward and reverse rates match, so reactant and product concentrations remain constant.',
  },
  'ap-chem-u7-125': {
    answer: 'Products strongly dominate at equilibrium, though some reactants remain.',
  },
  'ap-chem-u7-127': {
    answer: 'The constant activity of a pure solid is incorporated into the constant Kc.',
  },
  'ap-chem-u7-130': {
    answer: 'The system has reached dynamic equilibrium for this reaction.',
  },
  'ap-chem-u7-131': {
    answer: 'The equilibrium is product-favored and has a relatively large equilibrium constant here.',
  },
  'ap-chem-u7-132': {
    answer: 'The system shifts toward products, consuming part of the added reactant.',
  },
  'ap-chem-u7-134': {
    answer: 'Added heat acts like a reactant, shifting the equilibrium toward more products.',
    distractorReplacements: {
      'The system shifts exothermically because heat is always treated as a product.':
        'The system shifts exothermically because heat acts as a product in the reaction.',
      'The products form faster, but the equilibrium composition stays entirely unchanged.':
        'The products form faster, but the overall equilibrium composition stays unchanged.',
    },
  },
  'ap-chem-u7-135': {
    answer: 'Add a known soluble chloride salt to matched saturated samples and measure dissolved [Ag+].',
  },
  'ap-chem-u7-136': {
    answer: 'Ag+ concentration decreases as added Cl- shifts equilibrium toward solid AgCl.',
  },
  'ap-chem-u7-137': {
    answer: 'The mixture remains at equilibrium if the dilution leaves the reaction quotient Q equal to K.',
  },
  'ap-chem-u7-139': {
    answer: 'Neither side dominates strongly; appreciable amounts of both are present.',
    distractorReplacements: {
      'Only the products are present in the mixture once equilibrium is reached.':
        'Products alone remain in the reaction mixture once equilibrium is reached.',
      'Only the reactants are present in the mixture once equilibrium is reached.':
        'Reactants alone remain in the reaction mixture once equilibrium is reached.',
    },
  },
  'ap-chem-u8-146': {
    answer: 'Toward forming the weaker conjugate acid and weaker conjugate base.',
  },
  'ap-chem-u8-148': {
    answer: 'The point where stoichiometrically equal moles of acid and OH- react',
  },
  'ap-chem-u8-153': {
    answer: 'Substantial amounts of acetic acid and acetate',
    distractorReplacements: {
      'Only hydrochloric acid and some pure water': 'Hydrochloric acid diluted in pure distilled water',
      'Only sodium chloride dissolved in pure water': 'Aqueous sodium chloride dissolved in pure water',
    },
  },
  'ap-chem-u8-154': {
    distractorReplacements: {
      'The sodium ion only': 'The spectator sodium ion',
      'The chloride ion only': 'The spectator chloride ion',
    },
  },
  'ap-chem-u8-157': {
    answer: 'Buffer X can neutralize more added acid or base before its pH shifts markedly.',
  },
  'ap-chem-u8-158': {
    answer: 'Add equal small increments of strong acid to equal buffer volumes and record each pH shift.',
  },
  'ap-chem-u8-159': {
    answer: 'The common ion raises the concentration of a dissolved product, shifting equilibrium toward the solid.',
  },
  'ap-chem-u8-160': {
    answer: 'An indicator whose transition range lies in the basic steep equivalence region',
  },
  'ap-chem-u9-162': {
    answer: 'More moles of gas create more microstates, so delta S is positive.',
  },
  'ap-chem-u9-167': {
    answer: 'The reaction has a large activation barrier even though products are thermodynamically favored.',
  },
  'ap-chem-u9-171': {
    answer: 'The entropy increase is large enough to make delta G negative.',
  },
  'ap-chem-u9-172': {
    answer: 'The sum of delta G values for the coupled steps is negative.',
  },
  'ap-chem-u9-175': {
    answer: 'It allows ion migration to maintain electrical neutrality in each half-cell.',
  },
  'ap-chem-u9-176': {
    distractorReplacements: {
      'Electrons are never transferred in the cell.': 'No electrons are transferred within the cell.',
      'The salt bridge must always be absent from every electrolytic setup.':
        'A salt bridge must be omitted from every standard electrolytic setup.',
    },
  },
  'ap-chem-u9-178': {
    answer: 'Standard Gibbs free-energy change is negative.',
  },
  'ap-chem-u9-179': {
    answer: 'The cell potential decreases as the reaction quotient Q increases.',
  },
  'ap-chem-u1-187': {
    answer: 'Filter out sand, then evaporate the filtrate to recover sodium chloride.',
  },
  'ap-chem-u1-190': {
    answer: 'F- has the larger radius because fewer protons attract its ten electrons.',
  },
  'ap-chem-u1-192': {
    answer: 'Element B valence electrons are more strongly attracted to its nucleus as measured.',
  },
  'ap-chem-u1-193': {
    answer: 'Aluminum loses a higher-energy, less-penetrating 3p electron than magnesium 3s electrons.',
  },
  'ap-chem-u1-196': {
    answer: 'Compare similar ionic solids with different ion charges while keeping ion sizes as close as possible.',
  },
  'ap-chem-u1-199': {
    answer: 'Magnesium loses its 3s electrons, removing the n=3 shell and lowering electron-electron repulsion.',
  },
  'ap-chem-u2-201': {
    distractorReplacements: {
      'Graphite has no bonding within each layer and therefore evaporates immediately.':
        'Graphite has no bonding within each layer and therefore evaporates spontaneously.',
      'Graphite conducts only when its atoms are converted into isolated gases.':
        'Graphite conducts electricity once its atoms are converted into isolated gases.',
    },
  },
  'ap-chem-u2-202': {
    answer: 'A polar covalent bond with unequal electron sharing',
  },
  'ap-chem-u2-207': {
    answer: 'Size mismatch disrupts layer sliding through the metal lattice.',
  },
  'ap-chem-u2-209': {
    answer: 'Consider a valid alternative reducing charge separation while preserving atoms and overall charge.',
  },
  'ap-chem-u2-212': {
    prompt: 'Using VSEPR theory, which molecular geometry matches an SF4 molecule with four bonding pairs and one lone pair?',
  },
  'ap-chem-u2-213': {
    answer: 'Tetrahedral electron-domain; trigonal-pyramidal molecular geometry',
  },
  'ap-chem-u2-215': {
    answer: 'Its symmetric tetrahedral shape causes the four equal bond dipoles to cancel.',
  },
  'ap-chem-u2-220': {
    answer: 'The equilibrium bond distance where attractions and repulsions balance.',
  },
  'ap-chem-u3-221': {
    answer: 'Glycerol has multiple hydroxyl groups that form strong hydrogen bonds and resist flow.',
  },
  'ap-chem-u3-222': {
    answer: 'The more elongated molecule, since it has greater surface contact with neighbors.',
  },
  'ap-chem-u3-224': {
    answer: 'It separates particles and overcomes intermolecular forces during vaporization.',
  },
  'ap-chem-u3-225': {
    answer: 'All samples have the same average kinetic energy per particle at equal temperature.',
    distractorReplacements: {
      'The heaviest gas particles always have greater average kinetic energy.':
        'The heaviest gas particles possess greater average kinetic energy here.',
      'The liquid particles always have greater average kinetic energy than gas particles.':
        'The liquid particles typically have greater average kinetic energy than gas particles.',
    },
  },
  'ap-chem-u3-228': {
    answer: 'Gas particles take up negligible container volume and undergo elastic collisions.',
  },
  'ap-chem-u3-229': {
    distractorReplacements: {
      'High temperature and high pressure only because particles move faster':
        'High temperature and high pressure mainly because particles move faster',
      'Low temperature and low pressure only because particles are far apart':
        'Low temperature and low pressure mainly because particles are far apart',
    },
  },
};
