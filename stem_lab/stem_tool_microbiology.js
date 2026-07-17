/* eslint-disable */
// stem_tool_microbiology.js - Microbiology Lab
// NGSS MS-LS1, HS-LS1, HS-LS3, HS-LS4. The microbial world: bacteria,
// viruses, microscopy, antibiotic resistance evolution, the microbiome,
// immune system + vaccines, fermentation, classic case studies (Snow's
// cholera map, Fleming's penicillin, MRSA, COVID, fecal transplants).
(function() {
  'use strict';
  // ═══ Defensive StemLab guard ═══
  window.StemLab = window.StemLab || {
    _registry: {}, _order: [],
    registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
    isRegistered: function(id) { return !!this._registry[id]; },
    renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
  };

  // ──────────────────────────────────────────────────────────────────
  // DATA: Bacteria
  // ──────────────────────────────────────────────────────────────────
  var BACTERIA = [
    {
      id: 'ecoli', name: 'Escherichia coli (E. coli)', shape: 'rod (bacillus)',
      role: 'mostly-beneficial',
      where: 'Lives in the gut of most mammals including humans. About 0.1% of human gut bacteria.',
      what: 'Most strains are harmless or actively helpful (vitamin K production, competitive exclusion of pathogens). A few strains (O157:H7, enterohemorrhagic) cause severe foodborne illness.',
      sciFact: 'The lab workhorse of molecular biology. We learned how DNA replicates, how genes are regulated, and how proteins are made largely by studying E. coli. The 1958 Meselson-Stahl experiment used E. coli to prove DNA replicates semi-conservatively.'
    },
    {
      id: 'lactobacillus', name: 'Lactobacillus', shape: 'rod',
      role: 'beneficial',
      where: 'Yogurt, sauerkraut, kimchi, sourdough, the human gut and vagina, soil.',
      what: 'Ferments sugars into lactic acid. The acid lowers pH and prevents spoilage organisms from growing. The reason yogurt and sauerkraut keep for weeks.',
      sciFact: 'Cooperates with Streptococcus thermophilus in yogurt: each species produces compounds the other needs, faster than either alone. A textbook example of mutualism between two species of bacteria.'
    },
    {
      id: 'cyanobacteria', name: 'Cyanobacteria (blue-green algae)', shape: 'varies',
      role: 'beneficial',
      where: 'Oceans, freshwater, soil, ice. Some 3.5 billion years old - among the first life on Earth.',
      what: 'Photosynthesizes. Produced the oxygen in our atmosphere starting about 2.4 billion years ago (the Great Oxygenation Event). Without cyanobacteria, no oxygen-breathing life.',
      sciFact: 'Chloroplasts in plant cells are descended from cyanobacteria that were engulfed by larger cells about 1.5 billion years ago (endosymbiotic theory, Lynn Margulis). The "primary endosymbiosis" event is one of the most important events in the history of life.'
    },
    {
      id: 'mtb', name: 'Mycobacterium tuberculosis', shape: 'rod',
      role: 'pathogenic',
      where: 'Spread human-to-human via airborne droplets. Roughly 1.5 million deaths/year globally.',
      what: 'Causes tuberculosis (TB). Has a waxy mycolic-acid cell wall that resists most antibiotics. Has co-evolved with humans for tens of thousands of years.',
      sciFact: 'Robert Koch identified M. tuberculosis in 1882 and won the 1905 Nobel Prize. The "Koch\'s postulates" he developed to prove a microbe causes a disease are still in use.'
    },
    {
      id: 'staph', name: 'Staphylococcus aureus', shape: 'cocci (spheres in clusters)',
      role: 'mostly-pathogenic',
      where: 'About 30% of healthy people carry it harmlessly on skin or in the nose. Can cause infection if it gets through the skin.',
      what: 'Causes skin infections, food poisoning, sepsis, MRSA. The methicillin-resistant strain (MRSA) is a leading hospital-acquired infection.',
      sciFact: 'MRSA acquired the mecA resistance determinant through mobile genetic elements, while mutation, selection, clonal spread, and horizontal gene transfer all shape antimicrobial resistance.'
    },
    {
      id: 'rhizobium', name: 'Rhizobium', shape: 'rod',
      role: 'beneficial',
      where: 'Soil; forms nodules on the roots of legume plants (beans, peas, clover).',
      what: 'Fixes atmospheric nitrogen (N₂) into ammonia (NH₃) the plant can use. In exchange the plant gives the bacteria sugars. About half of all biological nitrogen fixation on Earth.',
      sciFact: 'Industrial nitrogen fixation (the Haber-Bosch process, 1909) feeds about half of the world. Bacterial nitrogen fixation feeds the other half. Both are essential to modern agriculture.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Fungi
  // ──────────────────────────────────────────────────────────────────
  var FUNGI = [
    {
      id: 'yeast', name: 'Saccharomyces cerevisiae (baker\'s yeast)', kind: 'single-celled fungus (yeast)',
      role: 'beneficial',
      where: 'On grain, fruit, every kitchen counter. Domesticated for ~10,000 years for bread, beer, wine.',
      what: 'Eats sugars and produces CO₂ (which rises bread) and ethanol (which makes beer + wine). Reproduces by budding when food is plentiful, by sexual spores when stressed.',
      sciFact: 'The first eukaryotic genome ever sequenced (1996). About 30% of its ~6,000 genes have direct human homologs - yeast is so similar to us that many discoveries in yeast translate to human cell biology. The 2001, 2009, 2013, and 2016 Nobel Prizes in Medicine all involved yeast research.'
    },
    {
      id: 'penicillium', name: 'Penicillium (chrysogenum / roqueforti / camemberti)', kind: 'filamentous mold (multicellular)',
      role: 'beneficial',
      where: 'In soil, on decaying fruit, on aging cheeses (Roquefort, Camembert, Brie). Different species in each context.',
      what: 'P. chrysogenum produces penicillin, the first antibiotic. P. roqueforti makes blue cheese veins. P. camemberti makes the white rind on Camembert + Brie. All are filamentous: long strands of cells (hyphae) tangled into a mat (mycelium).',
      sciFact: 'Fleming\'s 1928 discovery turned a kitchen mold into a global medical revolution by 1944. Penicillin and its descendants (semi-synthetic ampicillin, amoxicillin) save millions of lives every year. But Penicillium also taught us how short the lifespan of a new antibiotic can be: penicillin-resistant Staph appeared within years.'
    },
    {
      id: 'candida', name: 'Candida albicans', kind: 'yeast (and filamentous form)',
      role: 'mostly-beneficial',
      where: 'A normal member of the gut + mouth + skin + vaginal microbiome in most people.',
      what: 'Usually harmless - kept in check by bacterial neighbors + immune system. Overgrowth (after antibiotics destroy bacterial competitors, or in immunocompromise) causes thrush (mouth), yeast infections (vaginal), invasive candidiasis (bloodstream, life-threatening).',
      sciFact: 'Candida can switch between a round yeast form and a filamentous "hyphal" form, depending on conditions. The hyphal form is more invasive - Candida can probe and invade tissues. The "yeast-to-hypha switch" is a key research target for antifungal drugs.'
    },
    {
      id: 'aspergillus', name: 'Aspergillus', kind: 'filamentous mold',
      role: 'varies',
      where: 'Soil, decaying organic matter, damp buildings, grain storage. Spores in the air everywhere.',
      what: 'A. niger is used industrially to make citric acid (in most soft drinks, candy). A. oryzae is the koji used to make soy sauce + miso + sake. A. fumigatus causes aspergillosis (a serious lung infection) in immunocompromised people. A. flavus produces aflatoxins, the most potent natural carcinogens known - contaminating peanuts + corn improperly stored.',
      sciFact: 'Citric acid in nearly every processed food is fermented by A. niger in giant industrial vats - about 2 million tons per year globally. The same group of fungi makes both your food and (in different conditions) one of the deadliest natural toxins.'
    },
    {
      id: 'mycorrhiza', name: 'Mycorrhizal fungi (Arbuscular, Ectomycorrhizal)', kind: 'soil-dwelling filamentous fungi',
      role: 'beneficial',
      where: 'Forming symbiotic networks with about 90% of land plant species. The "wood-wide web" of mycorrhizae extends through every healthy forest soil.',
      what: 'Plant roots and fungal mycelium grow together. The fungus brings up water + phosphorus + other minerals; the plant gives the fungus sugars. Without mycorrhizae, most plants would die. The relationship is at least 460 million years old - possibly the reason plants colonized land.',
      sciFact: 'Suzanne Simard\'s research (1997-) showed that mycorrhizal networks connect different trees, allowing them to share nutrients across species. "Mother trees" support their seedlings and even support neighboring trees of other species. The forest is one organism, in some sense.'
    },
    {
      id: 'ergot', name: 'Claviceps purpurea (ergot)', kind: 'filamentous fungus',
      role: 'pathogenic (with medical descendants)',
      where: 'Infects rye + other grains. Historical scourge of medieval Europe where contaminated bread caused mass outbreaks of "Saint Anthony\'s Fire."',
      what: 'Produces alkaloids (LSA, ergotamine) that cause hallucinations, gangrenous extremities (loss of fingers, toes), miscarriage. Periodic outbreaks killed tens of thousands.',
      sciFact: 'Albert Hofmann was studying ergot alkaloids for medical use when he synthesized LSD-25 in 1938. Ergot derivatives are still used today: ergotamine for migraines, ergonovine to control postpartum bleeding. The molecule that brought medieval villages to mass psychosis became modern medicine.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Protists (single-celled eukaryotes - the diverse 4th kingdom)
  // ──────────────────────────────────────────────────────────────────
  var PROTISTS = [
    {
      id: 'plasmodium', name: 'Plasmodium (malaria)', kind: 'apicomplexan parasite',
      role: 'pathogenic',
      where: 'Spread by Anopheles mosquitoes in tropical + subtropical regions. About 240 million cases / 600,000 deaths per year, mostly children under 5 in sub-Saharan Africa.',
      what: 'Causes malaria. Has a complex two-host life cycle (mosquito + human), with different life stages in liver, blood, and mosquito gut. Five species infect humans; P. falciparum is the most lethal.',
      sciFact: 'Sickle cell trait (one copy of the sickle hemoglobin gene) protects against P. falciparum, which is why it persists at high frequency in populations from malaria-endemic regions. The 2015 Nobel Prize was awarded for artemisinin (Tu Youyou) and ivermectin (Campbell + Ōmura) - antiparasitic drugs that saved millions of lives.'
    },
    {
      id: 'amoeba', name: 'Amoeba proteus', kind: 'free-living amoeba',
      role: 'mostly-beneficial (and rare-pathogenic relatives)',
      where: 'Freshwater ponds, soil, decaying matter. Each cell moves by extending pseudopods ("false feet") - temporary blob-like extensions of cytoplasm.',
      what: 'A textbook microbiology specimen. Feeds by surrounding prey with its body and engulfing it (phagocytosis). The same mechanism your white blood cells use to eat bacteria - except the amoeba IS the whole organism.',
      sciFact: 'A close relative, Naegleria fowleri ("brain-eating amoeba"), lives in warm freshwater and can rarely enter the brain through the nose - almost always fatal. Different relatives include Entamoeba histolytica (amoebic dysentery) and Acanthamoeba (eye infection in contact-lens wearers).'
    },
    {
      id: 'paramecium', name: 'Paramecium', kind: 'ciliate',
      role: 'beneficial / educational',
      where: 'Pond water and slow streams worldwide. The "slipper-shaped" microbe that introductory biology students see under their first microscope.',
      what: 'Covered in thousands of tiny hair-like cilia that beat in coordinated waves, propelling it through water. Has TWO nuclei: a large macronucleus controlling everyday functions and a small micronucleus reserved for genetic exchange.',
      sciFact: 'Paramecia reproduce by binary fission for many generations, then engage in "conjugation" - two cells pair up and exchange genetic material from their micronuclei. Rejuvenates the line; without conjugation, paramecium clones age and die. A clue to why sexual reproduction evolved.'
    },
    {
      id: 'euglena', name: 'Euglena', kind: 'flagellate (mixotrophic)',
      role: 'beneficial / educational',
      where: 'Freshwater ponds, especially nutrient-rich ones. Sometimes blooms green.',
      what: 'Has chloroplasts (photosynthesizes in light) AND can eat organic matter (heterotrophic in the dark). One cell, two metabolisms. Swims with a long whip-like flagellum. Has a primitive "eyespot" that lets it move toward light.',
      sciFact: 'A famous category problem: is Euglena a plant (it photosynthesizes) or an animal (it moves + eats)? Modern taxonomy says neither - it\'s in its own group (Excavata, kingdom Protista). The category itself is a 19th-century artifact. Today we group by ancestry, not appearance.'
    },
    {
      id: 'diatom', name: 'Diatoms', kind: 'photosynthetic algae',
      role: 'beneficial (massively)',
      where: 'Oceans + freshwater worldwide. Especially abundant in cold + nutrient-rich waters like the Gulf of Maine.',
      what: 'Single-celled algae with rigid cell walls of silica (glass) - each species has a uniquely sculpted geometric shell. Photosynthesizes. Probably the most abundant photosynthesizers in the ocean.',
      sciFact: 'Diatoms produce roughly 20% of all oxygen on Earth - more than all the rainforests combined. When they die and sink, their silica shells accumulate; over millions of years they form diatomaceous earth (used in toothpaste, swimming pool filters, abrasives). They are also why the Gulf of Maine\'s spring phytoplankton bloom supports the entire food web up to whales.'
    },
    {
      id: 'giardia', name: 'Giardia lamblia (intestinalis)', kind: 'flagellated parasite',
      role: 'pathogenic',
      where: 'Contaminated water (streams, lakes, poorly treated water supplies). The most common parasitic intestinal infection in the US - and the reason hikers should treat backcountry water.',
      what: 'Causes giardiasis: prolonged greasy diarrhea, gas, fatigue, weight loss. Has a tear-drop shape with a "face" - two large nuclei and a sucker-disk that attaches to the intestinal wall. Resistant cysts survive in cold water for months.',
      sciFact: 'Giardia diverged very early in eukaryotic evolution - for a long time it was suspected to be a "missing link" between prokaryotes and eukaryotes. Detailed sequencing later showed it does have mitochondrial remnants (mitosomes); just very reduced. A reminder that "simple" can be a result of long evolution toward parasitism, not necessarily an ancient state.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Archaea
  // ──────────────────────────────────────────────────────────────────
  var ARCHAEA = [
    {
      id: 'methano', name: 'Methanogens', kind: 'methane-producing archaea',
      where: 'Cow rumens, termite guts, deep-sea sediments, wetlands, rice paddies, your own gut (about half of humans carry them).',
      what: 'Produce methane (CH₄) by combining CO₂ and hydrogen. Strict anaerobes - oxygen kills them. About 70% of atmospheric methane is biological in origin; methanogens make most of it.',
      sciFact: 'Methane is a greenhouse gas about 80× more potent than CO₂ over 20 years. Cattle methane is methanogens working in the rumen. Reducing meat consumption + improving rice cultivation are climate interventions because of methanogen biology.'
    },
    {
      id: 'thermophile', name: 'Thermus aquaticus (extreme heat lover)', kind: 'thermophilic bacterium (note: bacterium, but a similar story to archaea extremophiles)',
      where: 'Hot springs at Yellowstone National Park, discovered 1969 by Thomas Brock.',
      what: 'Lives at 70-80°C. Its DNA polymerase enzyme (Taq polymerase) works at those temperatures.',
      sciFact: 'Taq polymerase is the engine of PCR (polymerase chain reaction), which lets scientists rapidly copy DNA at high temperatures. PCR underlies modern genetic testing, DNA forensics, COVID PCR tests, and most molecular biology. Yellowstone hot spring biology → trillion-dollar biotech industry.'
    },
    {
      id: 'pyrolobus', name: 'Pyrolobus fumarii (super-hyperthermophile)', kind: 'archaean',
      where: 'Black smokers - deep-sea hydrothermal vents at the Atlantic Mid-Ocean Ridge.',
      what: 'Lives at temperatures up to 113°C - far above the boiling point of water at the surface (water doesn\'t boil at the deep-sea pressure). Was thought to set the upper temperature limit for life, until Strain 121 was discovered.',
      sciFact: 'Astrobiology takes extremophiles seriously. If life exists on Europa (Jupiter\'s ice moon with a subsurface ocean), it might live near similar hydrothermal vents. Mars\'s ancient warm wet conditions could have hosted thermophilic life that retreated underground as Mars cooled.'
    },
    {
      id: 'halobacterium', name: 'Halobacterium salinarum', kind: 'salt-loving archaean (halophile)',
      where: 'Salt flats, salt evaporation ponds, the Dead Sea (so salty it shows up pink from the carotenoid pigments). Lives at >15% salt - saltier than seawater.',
      what: 'Uses a light-driven proton pump (bacteriorhodopsin) for energy - a primitive form of photosynthesis that uses retinal (the same molecule in your eyes) instead of chlorophyll.',
      sciFact: 'Bacteriorhodopsin is the basis of "optogenetics" - using light to control neuron activity in research. Halobacterium proteins are being studied as bio-computers, light-driven solar cells, and astrobiology models for life on a different chemical foundation.'
    },
    {
      id: 'crenarcheota', name: 'Marine Crenarchaeota', kind: 'ocean-dwelling archaea',
      where: 'Throughout the ocean, especially below the surface zone. Recently discovered to be vastly more abundant than thought.',
      what: 'Oxidize ammonia to nitrite - a key step in the global nitrogen cycle. Were originally thought to be only in hot springs; we now know they make up about 20% of all microbial cells in the ocean.',
      sciFact: 'For 100 years biologists ignored archaea as a curiosity of extreme places. Then in 1992 Norman Pace started using DNA sequencing on ocean water and found archaea everywhere - making up trillions of cells in any given liter of seawater. They turn out to drive global biogeochemical cycles. Three domains of life, not two.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Viruses
  // ──────────────────────────────────────────────────────────────────
  var VIRUSES = [
    {
      id: 'covid', name: 'SARS-CoV-2 (COVID-19)', genome: 'single-stranded RNA',
      structure: 'Enveloped, ~120 nm. Spike protein binds the ACE2 receptor on human cells.',
      hosts: 'Humans, with crossover from bats. Many other animals can be infected secondarily.',
      story: 'Identified in December 2019. Caused a global pandemic that killed at least 7 million people directly (likely far more counting excess mortality). mRNA vaccines developed in less than a year - the fastest vaccine in history.'
    },
    {
      id: 'flu', name: 'Influenza A', genome: 'segmented single-stranded RNA',
      structure: 'Enveloped, ~100 nm. Hemagglutinin (H) and Neuraminidase (N) surface proteins - hence H1N1, H3N2.',
      hosts: 'Humans, birds, pigs, horses, dogs, others. Cross-species jumps cause pandemics.',
      story: 'Mutates constantly (antigenic drift) requiring new vaccines each year. Occasional dramatic genome reshuffling between species (antigenic shift) causes pandemics - 1918, 1957, 1968, 2009.'
    },
    {
      id: 'hiv', name: 'HIV (Human Immunodeficiency Virus)', genome: 'single-stranded RNA, retrovirus',
      structure: 'Enveloped, ~120 nm. Uses reverse transcriptase to integrate its genome into the host DNA.',
      hosts: 'Humans only. Originally crossed from chimpanzees in central Africa, probably in the early 20th century.',
      story: 'Causes AIDS. About 40 million people living with HIV today. Modern antiretroviral therapy (ART) makes HIV a manageable chronic condition. People on consistent ART with undetectable viral load cannot transmit the virus (U=U).'
    },
    {
      id: 'phage', name: 'Bacteriophage (T4)', genome: 'double-stranded DNA',
      structure: 'Distinctive geometric head + tail + leg structure. ~200 nm. Looks like a lunar lander.',
      hosts: 'Bacteria only (no risk to humans). Each phage targets specific bacteria.',
      story: 'Most abundant biological entity on Earth (estimated 10³¹ phages - a one with 31 zeros). "Phage therapy" using phages to treat antibiotic-resistant infections is being revived, especially in Eastern Europe and Georgia.'
    },
    {
      id: 'measles', name: 'Measles', genome: 'single-stranded RNA',
      structure: 'Enveloped, ~150 nm. Highly contagious through airborne droplets.',
      hosts: 'Humans only.',
      story: 'One of the most contagious diseases known: R₀ ≈ 12-18 (one person infects 12-18 others without immunity). Was eliminated from the Americas by vaccination in 2000; has resurged with falling vaccination rates. Causes pneumonia, brain swelling, and immune amnesia (erases the immune system\'s memory of prior infections).'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Microbiome regions
  // ──────────────────────────────────────────────────────────────────
  var MICROBIOME = [
    { id: 'gut', name: 'Human gut', count: '~100 trillion microbes', species: '~1,000 species',
      what: 'The largest microbial community in your body. Helps digest food, produces vitamins (K, B12), trains the immune system, communicates with the brain (the "gut-brain axis").',
      shaped: 'Birth method (vaginal vs C-section), breastfeeding, diet (fiber feeds the diverse community; sugar + refined carbs starve it), antibiotic use, geography, age.' },
    { id: 'skin', name: 'Human skin', count: '~1 trillion microbes', species: '~1,000+ species',
      what: 'Different microbes on different body regions (the oily face vs the dry forearm vs the moist armpit are different ecosystems). Helps regulate skin pH, prevents pathogen colonization.',
      shaped: 'Hygiene habits, antibiotics, climate, age, hormones.' },
    { id: 'mouth', name: 'Human mouth', count: '~10 billion microbes', species: '~700 species',
      what: 'Second most diverse microbiome in the body. Starts breaking down food. Some species (like Streptococcus mutans) cause cavities.',
      shaped: 'Diet, oral hygiene, smoking, antibiotics.' },
    { id: 'soil', name: 'Soil', count: '~50 billion per gram', species: '~10,000+ species per gram',
      what: 'The most diverse microbial community on Earth. Fixes nitrogen, decomposes organic matter, provides plant nutrients. Healthy soil is alive.',
      shaped: 'Plant species, weather, organic matter, agriculture practices (tillage destroys soil microbial communities; no-till farming preserves them).' },
    { id: 'ocean', name: 'Ocean', count: '~10 million per mL', species: '~unknown - millions+',
      what: 'About half of all Earth\'s photosynthesis happens here. Cycles carbon, nitrogen, sulfur globally. Marine viruses kill ~20% of marine microbes daily - recycling nutrients on a planetary scale.',
      shaped: 'Temperature, salinity, light, nutrient availability. Climate change is restructuring ocean microbiomes; we don\'t fully know the consequences yet.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Fermentation
  // ──────────────────────────────────────────────────────────────────
  var FERMENTS = [
    { id: 'sourdough', name: 'Sourdough bread', cultures: 'Wild yeasts + Lactobacillus',
      how: 'Flour + water mixed and left for a few days. The yeasts and bacteria already on the grain wake up and multiply. The bacteria make lactic + acetic acid (the sour); the yeast makes CO₂ (the rise).',
      story: 'Predates baker\'s yeast by ~5,000 years. Every bakery\'s starter is slightly different - some San Francisco starters have been kept alive continuously for over 150 years.' },
    { id: 'yogurt', name: 'Yogurt', cultures: 'Streptococcus thermophilus + Lactobacillus bulgaricus',
      how: 'Milk heated to about 110°F (43°C), the bacteria added (or a spoonful from the last batch), held warm for 4-12 hours. Bacteria turn milk sugar (lactose) into lactic acid; acid coagulates the milk proteins.',
      story: 'Probably invented by accident when nomadic peoples carried milk in animal-stomach containers - natural bacteria from the stomach acidified the milk into a preserved food. Every yogurt culture in human history descends from accidents like that.' },
    { id: 'kimchi', name: 'Kimchi', cultures: 'Leuconostoc + Lactobacillus + Weissella',
      how: 'Cabbage and vegetables salted to draw out water, then mixed with chili paste, garlic, ginger. Fermented at room temperature for a few days, then cold. Lactic acid fermentation.',
      story: 'A Korean tradition over 1,000 years old. Fermentation peaks around day 14-21 at refrigerator temperature, then slows. Good kimchi is a thousand-year-old microbiological experiment.' },
    { id: 'sauerkraut', name: 'Sauerkraut', cultures: 'Leuconostoc → Lactobacillus succession',
      how: 'Cabbage shredded and salted (about 2% salt by weight). The salt draws out water and inhibits unwanted microbes. Lactobacillus takes over. Fermented 2-4 weeks.',
      story: 'A succession of microbial communities - Leuconostoc dominates the first few days, then yields to more acid-tolerant Lactobacillus. The pH drops from 6 to about 3.5. Watching it ferment is watching ecology in real time.' },
    { id: 'kombucha', name: 'Kombucha', cultures: 'Acetobacter + Saccharomyces + others (SCOBY)',
      how: 'Sweet tea + a "SCOBY" (Symbiotic Culture Of Bacteria and Yeast) - a rubbery mat that floats on the surface. Yeast eats sugar → ethanol; bacteria eat ethanol → acetic acid. Held 7-14 days.',
      story: 'Origin probably in northeast China about 2,000 years ago. The SCOBY is itself a community ecology - a biofilm where multiple species depend on each other\'s metabolic byproducts.' },
    { id: 'cheese', name: 'Cheese', cultures: 'Varies by cheese (Lactobacillus, Penicillium roqueforti / camemberti, others)',
      how: 'Milk acidified by bacteria, then a coagulant (rennet) added to form curd. Curd drained, salted, aged. Different bacteria + molds during aging produce different cheeses.',
      story: 'Probably invented around 7,000 BCE in the Fertile Crescent. The blue veins in Roquefort? Penicillium roqueforti. The white rind on Camembert? Penicillium camemberti. Both are fungi, deliberately added.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Case studies - public-health + biology turning points
  // ──────────────────────────────────────────────────────────────────
  var CASES = [
    {
      id: 'snow', name: 'John Snow & the Broad Street Pump', year: 1854, icon: '🗺️',
      what: 'In a cholera outbreak in London\'s Soho district, physician John Snow mapped every death. The deaths clustered around the Broad Street water pump. He persuaded local authorities to remove the pump handle. The outbreak ended.',
      why: 'Cholera was thought to be airborne ("miasma"). Snow\'s map proved water-borne transmission. The case is the founding moment of epidemiology AND of data visualization - the dot map is still studied in stats and design classes.',
      lesson: 'Patterns in data can reveal causes that prevailing theory misses. Public health requires both science AND the willingness to act on uncertain evidence.'
    },
    {
      id: 'penicillin', name: 'Fleming\'s Penicillin', year: 1928, icon: '🍄',
      what: 'Alexander Fleming returned from holiday to find a Petri dish of Staphylococcus contaminated with Penicillium mold. The bacteria around the mold had died. Fleming named the active substance "penicillin."',
      why: 'Florey + Chain at Oxford turned the discovery into a usable drug a decade later. Mass production began in 1942-44 in the US. By war\'s end, penicillin had saved hundreds of thousands of lives from bacterial infections.',
      lesson: 'Serendipity favors the prepared mind (Pasteur). Fleming noticed something most would have washed down the drain. But also: the gap between "discovery" and "drug for patients" is enormous - Fleming gets the credit, but Florey, Chain, Heatley, and many others did the work of making it real.'
    },
    {
      id: 'mrsa', name: 'MRSA - antibiotic resistance evolves', year: '1959-present', icon: '🦠',
      what: 'Methicillin introduced in 1959 to treat penicillin-resistant Staph aureus. The first methicillin-resistant strain appeared in 1960. By the 1990s, MRSA was widespread in hospitals; by the 2000s, in the community ("community-acquired MRSA").',
      why: 'Antibiotics create selection pressure: susceptible bacteria are removed more readily while resistant survivors can reproduce. Unnecessary use and misuse - including the wrong drug, dose, or duration - accelerate resistance.',
      lesson: 'Evolution is not in the past. It is happening right now, in your bathroom, on hospital walls, in factory farms. We are losing antibiotics faster than we can develop new ones. The CDC calls antibiotic resistance one of the great public-health threats of our century.'
    },
    {
      id: 'covid', name: 'COVID-19 + mRNA vaccines', year: '2019-present', icon: '💉',
      what: 'SARS-CoV-2 emerged in late 2019. mRNA vaccines (Pfizer-BioNTech, Moderna) were authorized for emergency use within 12 months - the fastest vaccine development in history. The mRNA platform had been developed for decades by Katalin Karikó, Drew Weissman, and others.',
      why: 'mRNA vaccines deliver instructions for cells to make a viral protein themselves. The immune system learns to recognize it. The technology is modular - any new pathogen with a known protein sequence can have a vaccine designed in days.',
      lesson: 'Basic science is the foundation of crisis response. The mRNA technology that saved millions in 2020-2021 was 30 years of patient research that often looked like a dead end. The 2023 Nobel Prize went to Karikó and Weissman.'
    },
    {
      id: 'fmt', name: 'Fecal Microbiota Transplant (FMT)', year: '2013-present', icon: '🧪',
      what: 'For recurrent Clostridium difficile infections (deadly hospital-acquired diarrhea, often after antibiotic use destroys the gut microbiome), transplanting fecal microbes from a healthy donor cures the infection in over 90% of cases - better than any antibiotic.',
      why: 'C. difficile takes over when the normal gut community is destroyed. Restoring a healthy community is more effective than killing the C. difficile. The microbiome itself is the medicine.',
      lesson: 'The microbiome is now treated as an organ. We are at the beginning of a wave of microbiome-based therapies. Diet matters more for gut health than supplements; fiber feeds the diverse community that protects us.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Microscope types
  // ──────────────────────────────────────────────────────────────────
  var SCOPES = [
    { id: 'lightbright', name: 'Light microscope (brightfield)', range: '0.2-2000 µm',
      what: 'Uses visible light. Magnifies up to ~1000x. Most bacteria are visible at 1000x with oil immersion. The basic tool of microbiology since van Leeuwenhoek in 1670s.',
      limit: 'Cannot resolve smaller than ~200 nm (half the wavelength of visible light). Viruses (typically 20-300 nm) are mostly out of reach.' },
    { id: 'phase', name: 'Phase contrast microscope', range: '0.2-2000 µm',
      what: 'Same physical limit as brightfield, but uses interference patterns to make transparent live cells visible without staining. Allows watching live cells move and divide.',
      limit: 'Still limited by light wavelength. Sample preparation is easier.' },
    { id: 'fluorescent', name: 'Fluorescent microscope', range: '0.2-2000 µm + targeted labels',
      what: 'Specimens stained with dyes that glow under specific wavelengths of light. Can highlight specific structures (DNA, particular proteins, organelles). Live cells too, often.',
      limit: 'Photobleaching (the dyes fade with exposure). Some samples auto-fluoresce confusing the signal.' },
    { id: 'em', name: 'Electron microscope', range: '0.1 nm - 100 µm',
      what: 'Uses electrons instead of light. Wavelength is much smaller, so resolution is much better. Can image viruses, individual proteins, even atoms.',
      limit: 'Sample must be in a vacuum (no live cells). Sample preparation is destructive. Very expensive. The pictures are gray (no color - electrons don\'t have wavelength visible to eyes).' },
    { id: 'afm', name: 'Atomic force microscope', range: '0.1 nm - 100 µm',
      what: 'A microscopic stylus drags over the sample surface, recording height. Like a tiny phonograph needle. Gets atomic-scale resolution on the surface of samples.',
      limit: 'Only sees surfaces, not interior structure. Slow to scan.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // Quiz
  // ──────────────────────────────────────────────────────────────────
  var QUIZ_QUESTIONS = [
    { q: 'Why are viruses NOT classified as alive by most biologists?', choices: ['They\'re too small', 'They can\'t reproduce without hijacking a host cell\'s machinery', 'They\'re made of plastic', 'They don\'t have DNA'], answer: 1, explain: 'Viruses can\'t metabolize, can\'t reproduce on their own, and have no cellular structure. They\'re genetic material wrapped in protein, that turns into "alive" behavior only when inside a host cell. Some biologists argue they\'re a kind of life; others see them as biological chemistry. Either way, they\'re very different from cells.' },
    { q: 'How does antibiotic resistance evolve?', choices: ['Bacteria deliberately learn to fight antibiotics', 'Random mutations + antibiotic selection: the few resistant survivors multiply', 'It\'s genetic engineering in farms', 'Bacteria adapt during your treatment'], answer: 1, explain: 'Mutations are random. When antibiotic is present, susceptible bacteria die and resistant survivors live to reproduce. Selection - not learning, not intention - drives resistance. Antibiotic overuse (and use in animal feed) accelerates the process.' },
    { q: 'About how many microbial cells live in or on a healthy human body?', choices: ['About the same as human cells (~37 trillion each)', 'About 100 trillion microbial cells (~3 microbes per human cell)', 'About 1 billion microbial cells', 'Microbes are bad - a healthy body has none'], answer: 1, explain: 'Most healthy humans carry about 100 trillion microbial cells, with about 99% in the gut. The 1972 estimate of "10 microbes per human cell" was wrong; the 2016 revision is closer to 1.3 to 1, or roughly equal. Either way, you are as much microbial as human, by cell count.' },
    { q: 'What is the difference between a bacterium and a virus?', choices: ['Both are alive but viruses are smaller', 'Bacteria are cells with their own machinery; viruses are genetic material that needs a host cell to reproduce', 'They\'re the same thing', 'Bacteria are dead, viruses are alive'], answer: 1, explain: 'Bacteria are living cells. They have a cell membrane, DNA, ribosomes, and can grow and reproduce on their own (given food). Viruses are not cellular - they are DNA or RNA in a protein shell. To reproduce, they must enter a host cell and hijack the cell\'s machinery.' },
    { q: 'How does a vaccine work?', choices: ['Kills the pathogen if you\'ve already got it', 'Teaches the immune system to recognize a pathogen before you\'re infected', 'Disinfects your skin', 'Replaces antibodies you have lost'], answer: 1, explain: 'A vaccine exposes the immune system to a harmless version of part of the pathogen (an inactivated virus, a protein subunit, or - for mRNA vaccines - instructions to make a viral protein). The immune system makes memory cells that recognize the real pathogen if encountered. Vaccines prevent disease; they don\'t treat existing infection.' },
    { q: 'In sourdough bread, what causes the sour flavor AND the rise?', choices: ['Both are caused by yeast', 'Lactic acid bacteria make the sour; yeast makes the CO₂ that rises the bread', 'It\'s the salt', 'A chemical leavener like baking powder'], answer: 1, explain: 'Sourdough relies on two organisms working together: lactic acid bacteria (Lactobacillus) make the sour by fermenting sugars into lactic acid, and wild yeast makes CO₂ that lifts the dough. Commercial yeast bread skips the bacteria - it rises fast but doesn\'t develop the sour flavor or the same digestibility.' },
    { q: 'How did John Snow identify the cause of the 1854 London cholera outbreak?', choices: ['He examined victims under a microscope', 'He mapped the deaths and saw they clustered around a specific water pump', 'He ran a laboratory experiment', 'He surveyed survivors'], answer: 1, explain: 'Snow drew a dot map of every cholera death in the Soho district. The pattern showed deaths clustering around the Broad Street pump. He persuaded local officials to remove the pump handle and the outbreak ended. The work founded both modern epidemiology AND data visualization as a discipline.' },
    { q: 'Why did Fleming\'s 1928 penicillin discovery take 14+ years to become a usable drug?', choices: ['Patents took time', 'Mass production of pure penicillin required years of work by Florey, Chain, Heatley, and a whole team', 'Fleming did not publish', 'Penicillin was banned'], answer: 1, explain: 'Fleming\'s observation in 1928 was important but he could not produce or purify penicillin in any quantity. Howard Florey, Ernst Chain, Norman Heatley, and colleagues at Oxford figured out purification and mass production starting in 1939. US wartime industrial scale-up made it widely available by 1944. Most "discoveries" become real through the work of many.' },
    { q: 'About how big is a typical bacterium compared to a typical animal cell?', choices: ['Same size', 'Bacteria are about 10-100 times smaller', 'Bacteria are bigger', 'Bacteria are 1000 times smaller'], answer: 1, explain: 'Typical bacterium: ~1-5 micrometers (µm) long. Typical animal cell: ~10-30 µm. About 10x smaller, or 1000x less volume. Most bacteria are at the resolution limit of a good light microscope at 1000x.' },
    { q: 'What feeds your gut microbiome?', choices: ['Protein and meat', 'Refined sugar', 'Probiotic pills', 'Dietary fiber from plants'], answer: 3, explain: 'Most of your gut microbes ferment fiber that you cannot digest, producing short-chain fatty acids that nourish the colon lining. A diverse plant-rich diet feeds a diverse microbiome. Refined carbohydrates and sugar are absorbed in the small intestine - they don\'t reach the gut microbes. Probiotic pills are a tiny dose; food is the main intervention.' },
    { q: 'Why does fermented food (yogurt, sauerkraut, kimchi) NOT spoil quickly even at room temperature?', choices: ['Magic', 'Lactic acid bacteria lower the pH, inhibiting spoilage organisms', 'It was canned at high heat', 'Preservatives'], answer: 1, explain: 'Lactic acid fermentation drops the pH from ~6 to ~3.5. Most spoilage organisms cannot grow at that pH. The food is preserved without refrigeration - which is why fermentation predates refrigeration in every culture that has it.' },
    { q: 'Which microbes are descended from bacteria that were engulfed by larger cells about 1.5 billion years ago?', choices: ['All bacteria', 'Mitochondria and chloroplasts inside our cells (and plant cells)', 'Viruses', 'Archaea'], answer: 1, explain: 'Mitochondria (in all eukaryotic cells) and chloroplasts (in plant cells) were originally free-living bacteria. They were engulfed and became permanent residents inside larger cells - the endosymbiotic theory, proposed by Lynn Margulis. They still have their own DNA. You are, in a real sense, a community of organisms.' },
    { q: 'Genetically, which group are fungi closest to?', choices: ['Plants', 'Bacteria', 'Animals', 'Viruses'], answer: 2, explain: 'Despite looking more plant-like (rooted, can\'t move), fungi are evolutionary cousins of animals. We share a common ancestor about 1.1 billion years ago - more recent than the split with plants. Fungi have chitin cell walls (like insect exoskeletons), not cellulose. They cannot photosynthesize. They digest externally.' },
    { q: 'How many DOMAINS of cellular life do biologists recognize today?', choices: ['One', 'Two (prokaryotes and eukaryotes)', 'Three (Bacteria, Archaea, Eukarya)', 'Six (one per kingdom)'], answer: 2, explain: 'Carl Woese\'s 1977 ribosomal RNA work showed Archaea are as different from bacteria as bacteria are from us. The three-domain framework (Bacteria, Archaea, Eukarya) is the foundation of modern biology. Archaea were originally classified with bacteria because they look similar under the microscope, but they are biochemically distinct.' },
    { q: 'Why do antibiotics that target the bacterial cell wall (like penicillin) NOT work against viruses?', choices: ['The antibiotics are too big to fit in the virus', 'Viruses do not have cell walls - they have no equivalent target', 'Viruses move too fast', 'The dose has to be much higher'], answer: 1, explain: 'Viruses have no cell wall, no ribosomes, no DNA replication machinery of their own - they hijack the host\'s. They have NO equivalent target for any antibiotic. This is why prescribing antibiotics "just in case" for a viral cold or flu is useless (and accelerates resistance for the bacteria that ARE in your body).' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // INTERACTIVE WIDGETS (module scope)
  // Three React components hoisted out of render(ctx) so their useState
  // persists across re-renders. AlloFlow runtime guarantees window.React
  // with hooks. Components: AntibioticResistanceSim (petri-dish evolution),
  // SnowCholeraMap (1854 Soho intervention experiment), VirtualMicroscope
  // (zoom + slide swap with rendered organisms).
  // ──────────────────────────────────────────────────────────────────
  var R = (typeof window !== 'undefined' && window.React) ? window.React : null;
  var hh = R ? R.createElement : null;

  // ── 1. ANTIBIOTIC RESISTANCE EVOLUTION SIM ──
  function getResistanceKillProbabilities(dose) {
    var sensitive = Math.max(0, Math.min(1, (Number(dose) || 0) / 100));
    var resistant = sensitive === 0 ? 0 : Math.min(0.05, sensitive * 0.15);
    return { sensitive: sensitive, resistant: resistant };
  }
  function classifyResistanceTrend(initialPct, finalPct) {
    var change = (Number(finalPct) || 0) - (Number(initialPct) || 0);
    return change > 5 ? 'increase' : change < -5 ? 'decrease' : 'similar';
  }
  function evaluateResistancePrediction(initialPct, finalPct, prediction) {
    var observed = classifyResistanceTrend(initialPct, finalPct);
    var labels = { increase: 'increased', similar: 'stayed about the same', decrease: 'decreased' };
    return { correct: prediction === observed, observed: observed, observedLabel: labels[observed], change: (Number(finalPct) || 0) - (Number(initialPct) || 0) };
  }
  function evaluateResistanceExplanation(initialPct, choice) {
    var expected = Number(initialPct) > 0 ? 'selection' : 'variation-required';
    var feedback = expected === 'selection' ? 'Pre-existing resistant cells survived exposure more often, so their descendants became a larger share. The bacteria did not choose or learn resistance.' : 'No resistant variant was present, and this model omits mutation and gene transfer. Selection cannot favor a variant that is absent.';
    return { correct: choice === expected, expected: expected, feedback: feedback };
  }
  window.__MicrobiologyCore = { getResistanceKillProbabilities: getResistanceKillProbabilities, classifyResistanceTrend: classifyResistanceTrend, evaluateResistancePrediction: evaluateResistancePrediction, evaluateResistanceExplanation: evaluateResistanceExplanation };

  function AntibioticResistanceSim(props) {
    if (!R) return null;
    var awardXP = props.awardXP;
    var ds = R.useState(60);    var dose = ds[0];      var setDose = ds[1];
    var ts = R.useState(14);    var duration = ts[0];  var setDuration = ts[1];
    var rs = R.useState(3);     var initRes = rs[0];   var setInitRes = rs[1];
    var prs = R.useState(null); var prediction = prs[0]; var setPrediction = prs[1];
    var es = R.useState(null); var explanation = es[0]; var setExplanation = es[1];
    var ers = R.useState(null); var explanationReview = ers[0]; var setExplanationReview = ers[1];
    var ps = R.useState(false); var playing = ps[0];   var setPlaying = ps[1];
    var ks = R.useState(0);     var day = ks[0];       var setDay = ks[1];
    var hs = R.useState([]);    var history = hs[0];   var setHistory = hs[1];
    var bs = R.useState([]);    var bact = bs[0];      var setBact = bs[1];
    var awardedRef = R.useRef(false);
    var explanationAwardedRef = R.useRef(false);

    R.useEffect(function() { if (bact.length === 0) seed(); }, []);

    function seed() {
      var pop = []; var n = 80;
      for (var i = 0; i < n; i++) {
        var angle = Math.random() * Math.PI * 2;
        var radius = Math.sqrt(Math.random()) * 92;
        pop.push({ x: 100 + radius * Math.cos(angle), y: 100 + radius * Math.sin(angle), resistant: Math.random() * 100 < initRes, alive: true, jitter: Math.random() * 0.6 + 0.7 });
      }
      setBact(pop); setDay(0);
      setHistory([{ day: 0, sensitive: pop.filter(function(b) { return !b.resistant; }).length, resistant: pop.filter(function(b) { return b.resistant; }).length }]);
      awardedRef.current = false;
    }

    function step() {
      if (day >= duration) { setPlaying(false); return; }
      var nextDay = day + 1;
      var killProbabilities = getResistanceKillProbabilities(dose);
      var killSens = killProbabilities.sensitive;
      var killRes = killProbabilities.resistant;
      var newBact = bact.map(function(b) {
        if (!b.alive) return b;
        var p = b.resistant ? killRes : killSens;
        if (Math.random() < p) return Object.assign({}, b, { alive: false });
        return b;
      });
      var alive = newBact.filter(function(b) { return b.alive; });
      var dead  = newBact.filter(function(b) { return !b.alive; });
      var open = dead.slice();
      for (var i = 0; i < alive.length && open.length > 0; i++) {
        if (Math.random() < 0.25) {
          var parent = alive[i]; var child = open.shift();
          newBact[newBact.indexOf(child)] = { x: parent.x + (Math.random() - 0.5) * 12, y: parent.y + (Math.random() - 0.5) * 12, resistant: parent.resistant, alive: true, jitter: Math.random() * 0.6 + 0.7 };
        }
      }
      setBact(newBact);
      var sens = newBact.filter(function(b) { return b.alive && !b.resistant; }).length;
      var res  = newBact.filter(function(b) { return b.alive && b.resistant; }).length;
      setHistory(function(h2) { return h2.concat([{ day: nextDay, sensitive: sens, resistant: res }]); });
      setDay(nextDay);
      if (nextDay >= duration && !awardedRef.current) {
        awardedRef.current = true;
        if (awardXP) awardXP(3);
      }
    }

    R.useEffect(function() {
      if (!playing) return;
      var t = setTimeout(step, 600);
      return function() { clearTimeout(t); };
    }, [playing, day, bact]);

    function reset() { setPlaying(false); setPrediction(null); setExplanation(null); setExplanationReview(null); explanationAwardedRef.current = false; seed(); }

    var totalAlive = bact.filter(function(b) { return b.alive; }).length;
    var totalRes   = bact.filter(function(b) { return b.alive && b.resistant; }).length;
    var pctRes = totalAlive > 0 ? Math.round((totalRes / totalAlive) * 100) : 0;
    var initialPct = history.length > 0 ? Math.round((history[0].resistant / Math.max(1, (history[0].sensitive + history[0].resistant))) * 100) : initRes;
    var predictionReview = day >= duration && history.length > 1 && prediction ? evaluateResistancePrediction(initialPct, pctRes, prediction) : null;
    var investigationReady = !!prediction;
    function submitExplanation() {
      if (!explanation || explanationReview) return;
      var review = evaluateResistanceExplanation(initialPct, explanation);
      setExplanationReview(review);
      if (review.correct && !explanationAwardedRef.current) { explanationAwardedRef.current = true; if (awardXP) awardXP(2); }
    }

    return hh('div', { style: { background: 'var(--allo-stem-deeper, rgba(15,23,42,0.7))', borderRadius: 12, padding: 16, marginBottom: 14, borderTop: '1px solid rgba(239,68,68,0.30)', borderRight: '1px solid rgba(239,68,68,0.30)', borderBottom: '1px solid rgba(239,68,68,0.30)', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 20px rgba(239,68,68,0.10)' } },
      hh('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        hh('div', { 'aria-hidden': 'true', style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(239,68,68,0.18)', border: '1.5px solid #ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 } }, '🧫'),
        hh('div', { style: { flex: 1, minWidth: 200 } },
          hh('div', { style: { fontSize: 13, fontWeight: 800, color: '#fca5a5' } }, 'Antibiotic resistance - petri-dish evolution sim'),
          hh('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, 'Model selection acting on pre-existing resistant cells across repeated exposure rounds.')
        )
      ),
      hh('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) minmax(180px, 1fr)', gap: 12, marginBottom: 12 } },
        hh('div', { style: { background: 'var(--allo-stem-deeper, rgba(2,6,23,0.7))', borderRadius: 10, padding: 8 } },
          hh('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4, textAlign: 'center' } }, 'Petri dish · Round ' + day + ' of ' + duration),
          hh('svg', { viewBox: '0 0 200 200', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Petri dish model at exposure round ' + day + '. ' + totalAlive + ' cells remain; ' + pctRes + '% are resistant. Circles are sensitive cells and diamonds are resistant cells.', style: { width: '100%', maxWidth: 240, display: 'block', margin: '0 auto' } },
            hh('defs', null, hh('radialGradient', { id: 'dishBg', cx: '50%', cy: '50%', r: '50%' }, hh('stop', { offset: '0%', stopColor: '#1e293b' }), hh('stop', { offset: '100%', stopColor: '#0f172a' }))),
            hh('circle', { cx: 100, cy: 100, r: 95, fill: 'url(#dishBg)', stroke: '#475569', strokeWidth: 1.5 }),
            day < duration && day > 0 ? hh('circle', { cx: 100, cy: 100, r: 95, fill: '#fbbf24', opacity: 0.04 + (dose / 100) * 0.10 }) : null,
            bact.map(function(b, i) {
              if (!b.alive) return hh('circle', { key: 'b-' + i, cx: b.x, cy: b.y, r: 1.2, fill: '#475569', opacity: 0.18 });
              if (b.resistant) {
                var size = 3.2 * b.jitter;
                return hh('rect', { key: 'b-' + i, x: b.x - size / 2, y: b.y - size / 2, width: size, height: size, fill: '#ef4444', stroke: '#fecaca', strokeWidth: 0.45, opacity: 0.9, transform: 'rotate(45 ' + b.x + ' ' + b.y + ')' });
              }
              return hh('circle', { key: 'b-' + i, cx: b.x, cy: b.y, r: 2.2 * b.jitter, fill: '#22d3ee', opacity: 0.85 });
            })
          ),
          hh('div', { style: { display: 'flex', justifyContent: 'center', gap: 12, marginTop: 6, fontSize: 9, color: 'var(--allo-stem-text-soft, #94a3b8)' } },
            hh('span', null, hh('span', { style: { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22d3ee', marginRight: 4, verticalAlign: 'middle' } }), 'sensitive circles'),
            hh('span', null, hh('span', { style: { display: 'inline-block', width: 7, height: 7, background: '#ef4444', border: '1px solid #fecaca', transform: 'rotate(45deg)', marginRight: 5, verticalAlign: 'middle' } }), 'resistant diamonds')
          )
        ),
        hh('div', { style: { background: 'var(--allo-stem-deeper, rgba(2,6,23,0.7))', borderRadius: 10, padding: 10 } },
          hh('div', { style: { fontSize: 10, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, textAlign: 'center' } }, '% resistant over time'),
          hh('svg', { viewBox: '0 0 100 60', preserveAspectRatio: 'none', role: 'img', 'aria-label': 'Resistance trend from round 0 to round ' + day + '. Current resistant share is ' + pctRes + '%.', style: { width: '100%', height: 100, display: 'block' } },
            hh('line', { x1: 4, y1: 56, x2: 96, y2: 56, stroke: 'rgba(148,163,184,0.30)', strokeWidth: 0.4 }),
            hh('line', { x1: 4, y1: 4, x2: 4, y2: 56, stroke: 'rgba(148,163,184,0.30)', strokeWidth: 0.4 }),
            hh('line', { x1: 4, y1: 4, x2: 96, y2: 4, stroke: 'rgba(239,68,68,0.20)', strokeWidth: 0.3, strokeDasharray: '1,1' }),
            history.length > 1 ? hh('polyline', { points: history.map(function(p, i) { var alive = p.sensitive + p.resistant; var pct = alive > 0 ? p.resistant / alive : 0; var x = 4 + (i / Math.max(1, duration)) * 92; var y = 56 - pct * 52; return x + ',' + y; }).join(' '), fill: 'none', stroke: '#ef4444', strokeWidth: 1.2 }) : null,
            hh('circle', { cx: 4 + (day / Math.max(1, duration)) * 92, cy: 56 - (pctRes / 100) * 52, r: 1.8, fill: '#ef4444', stroke: '#fff', strokeWidth: 0.4 }),
            hh('text', { x: 6, y: 8, fontSize: 3.5, fill: '#fca5a5' }, '100%'),
            hh('text', { x: 6, y: 54, fontSize: 3.5, fill: '#94a3b8' }, '0%'),
            hh('text', { x: 50, y: 59, fontSize: 3, fill: '#94a3b8', textAnchor: 'middle' }, 'exposure rounds')
          ),
          hh('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 } },
            hh('div', { style: { padding: 6, borderRadius: 6, background: 'rgba(34,211,238,0.10)', border: '1px solid rgba(34,211,238,0.30)' } },
              hh('div', { style: { fontSize: 8, fontWeight: 800, color: '#67e8f9', textTransform: 'uppercase' } }, 'Alive'),
              hh('div', { style: { fontSize: 14, fontWeight: 900, color: '#22d3ee' } }, totalAlive)
            ),
            hh('div', { style: { padding: 6, borderRadius: 6, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' } },
              hh('div', { style: { fontSize: 8, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase' } }, '% Resistant'),
              hh('div', { style: { fontSize: 14, fontWeight: 900, color: '#ef4444' } }, pctRes + '%')
            )
          )
        )
      ),
      hh('div', { role: 'note', style: { padding: 9, marginBottom: 10, borderRadius: 7, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.28)', color: '#fde68a', fontSize: 10.5, lineHeight: 1.5 } }, 'Model boundary: resistant cells are present only when initial resistance is above zero. The simulation omits mutation, horizontal gene transfer, drug concentration over time, immune responses, and patient dosing. It demonstrates selection, not a treatment recommendation.'),
      hh('fieldset', { disabled: day > 0, style: { margin: '0 0 10px', padding: 10, borderRadius: 8, border: '1px solid rgba(167,243,208,0.38)', opacity: day > 0 ? 0.72 : 1 } },
        hh('legend', { style: { padding: '0 6px', color: '#a7f3d0', fontSize: 11, fontWeight: 800 } }, '1. Predict the resistant share after exposure'),
        hh('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 7 } }, [{ id: 'increase', label: 'Increase' }, { id: 'similar', label: 'Stay about the same' }, { id: 'decrease', label: 'Decrease' }].map(function(option) {
          return hh('label', { key: option.id, style: { display: 'flex', alignItems: 'center', gap: 7, padding: 8, borderRadius: 6, background: prediction === option.id ? 'rgba(16,185,129,0.22)' : 'rgba(2,6,23,0.35)', color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 11, cursor: day > 0 ? 'default' : 'pointer' } }, hh('input', { type: 'radio', name: 'micro-resistance-prediction', value: option.id, checked: prediction === option.id, onChange: function() { setPrediction(option.id); }, style: { accentColor: '#10b981' } }), option.label);
        }))
      ),
      hh('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 } },
        hh('label', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)' } },
          hh('div', { style: { marginBottom: 4 } }, 'Exposure strength: ', hh('strong', { style: { color: '#fbbf24' } }, dose + '/100')),
          hh('input', { type: 'range', 'aria-label': 'Antibiotic exposure strength in the teaching model', 'aria-valuetext': dose + ' out of 100', min: 0, max: 100, step: 5, value: dose, disabled: day > 0, onChange: function(e) { setDose(parseInt(e.target.value, 10)); }, style: { width: '100%', accentColor: '#fbbf24', opacity: day > 0 ? 0.5 : 1 } })
        ),
        hh('label', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)' } },
          hh('div', { style: { marginBottom: 4 } }, 'Exposure rounds: ', hh('strong', { style: { color: '#22d3ee' } }, duration)),
          hh('input', { type: 'range', 'aria-label': 'Number of exposure rounds in the teaching model', 'aria-valuetext': duration + ' exposure rounds', min: 3, max: 30, step: 1, value: duration, disabled: day > 0, onChange: function(e) { setDuration(parseInt(e.target.value, 10)); }, style: { width: '100%', accentColor: '#22d3ee', opacity: day > 0 ? 0.5 : 1 } })
        ),
        hh('label', { style: { fontSize: 10, color: 'var(--allo-stem-text, #cbd5e1)' } },
          hh('div', { style: { marginBottom: 4 } }, 'Initial resistance: ', hh('strong', { style: { color: '#ef4444' } }, initRes + '%')),
          hh('input', { type: 'range', 'aria-label': 'Initial resistance', 'aria-valuetext': initRes + '% initially resistant', min: 0, max: 15, step: 1, value: initRes, disabled: day > 0, onChange: function(e) { setInitRes(parseInt(e.target.value, 10)); }, style: { width: '100%', accentColor: '#ef4444', opacity: day > 0 ? 0.5 : 1 } })
        )
      ),
      hh('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' } },
        hh('button', { type: 'button', onClick: function() { if (day === 0) seed(); setPlaying(function(p) { return !p; }); }, disabled: !investigationReady || day >= duration, style: { padding: '8px 18px', borderRadius: 8, background: playing ? '#ef4444' : 'rgba(239,68,68,0.18)', color: playing ? '#fff' : '#fca5a5', border: '1.5px solid #ef4444', fontSize: 11, fontWeight: 800, cursor: !investigationReady || day >= duration ? 'default' : 'pointer', opacity: !investigationReady || day >= duration ? 0.4 : 1 } }, playing ? '⏸ Pause' : '▶ Play'),
        hh('button', { type: 'button', onClick: function() { setPlaying(false); step(); }, disabled: !investigationReady || day >= duration, style: { padding: '8px 14px', borderRadius: 8, background: 'rgba(148,163,184,0.10)', color: 'var(--allo-stem-text, #cbd5e1)', border: '1px solid rgba(148,163,184,0.30)', fontSize: 11, fontWeight: 700, cursor: !investigationReady || day >= duration ? 'default' : 'pointer', opacity: !investigationReady || day >= duration ? 0.4 : 1 } }, 'Step round'),
        hh('button', { type: 'button', onClick: reset, style: { padding: '8px 14px', borderRadius: 8, background: 'rgba(148,163,184,0.10)', color: 'var(--allo-stem-text-soft, #94a3b8)', border: '1px solid rgba(148,163,184,0.30)', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '↺ Reset')
      ),
      !investigationReady && day === 0 ? hh('div', { role: 'status', style: { marginBottom: 10, color: '#fde68a', fontSize: 10.5, textAlign: 'center', fontWeight: 700 } }, 'Choose a prediction to unlock the culture controls.') : null,
      day >= duration && history.length > 1 ? hh('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6 } },
        hh('div', { role: 'status', 'aria-live': 'polite', style: { marginBottom: 8, paddingBottom: 7, borderBottom: '1px solid rgba(167,243,208,0.25)' } }, hh('strong', { style: { color: predictionReview && predictionReview.correct ? '#86efac' : '#fde68a' } }, predictionReview && predictionReview.correct ? 'Prediction matched. ' : 'Prediction review. '), predictionReview && predictionReview.observed === 'similar' ? 'The resistant share stayed about the same (a ' + Math.abs(predictionReview.change) + '-point change).' : 'The resistant share ' + (predictionReview ? predictionReview.observedLabel : 'was not classified') + ' by ' + Math.abs(predictionReview ? predictionReview.change : 0) + ' percentage points.'),
        hh('strong', { style: { color: '#22c55e' } }, '2. Observe: '),
        'The dish started with ' + initialPct + '% resistant cells. After ' + duration + ' exposure rounds at strength ' + dose + '/100, ' + totalAlive + ' cells remain and ' + pctRes + '% of them are resistant. ',
        initialPct === 0 ? 'No resistant lineage appeared because mutation and gene transfer are outside this model. ' : 'Susceptible cells were removed more often, so resistant survivors contributed a larger share of later rounds. ',
        (pctRes >= 80 ? 'Selection strongly changed the population composition.' : pctRes >= 40 ? 'Selection produced a clear resistance shift.' : 'The resistance shift was modest in this run.'),
        ' Real resistance also emerges and spreads through mutation and horizontal gene transfer. For personal care, antibiotics should be taken exactly as prescribed by a clinician.',
        hh('fieldset', { style: { margin: '10px 0 8px', padding: 9, borderRadius: 7, border: '1px solid rgba(125,211,252,0.35)' } },
          hh('legend', { style: { padding: '0 5px', color: '#bae6fd', fontSize: 11, fontWeight: 800 } }, '3. Explain the observed pattern'),
          [{ id: 'selection', label: 'Pre-existing resistant cells survived more often and left more descendants.' }, { id: 'variation-required', label: 'No resistant variant was present, so selection had nothing resistant to favor.' }, { id: 'learned', label: 'Individual bacteria learned resistance during the run.' }, { id: 'caused', label: 'The exposure deliberately created every resistant cell.' }].map(function(option) {
            return hh('label', { key: option.id, style: { display: 'flex', alignItems: 'flex-start', gap: 7, marginTop: 6, color: 'var(--allo-stem-text, #e2e8f0)', fontSize: 10.5, lineHeight: 1.4, cursor: explanationReview ? 'default' : 'pointer' } }, hh('input', { type: 'radio', name: 'micro-resistance-explanation', value: option.id, checked: explanation === option.id, disabled: !!explanationReview, onChange: function() { setExplanation(option.id); }, style: { marginTop: 2, accentColor: '#38bdf8' } }), option.label);
          })
        ),
        explanationReview ? hh('div', { role: 'status', 'aria-live': 'polite', style: { padding: 8, borderRadius: 6, background: explanationReview.correct ? 'rgba(16,185,129,0.14)' : 'rgba(245,158,11,0.14)', color: explanationReview.correct ? '#a7f3d0' : '#fde68a', fontSize: 10.5, lineHeight: 1.45 } }, (explanationReview.correct ? 'Explanation confirmed. ' : 'Explanation review. ') + explanationReview.feedback) : hh('button', { type: 'button', onClick: submitExplanation, disabled: !explanation, style: { padding: '8px 14px', borderRadius: 7, border: '1px solid rgba(125,211,252,0.55)', background: explanation ? '#0e7490' : '#334155', color: '#f0f9ff', fontSize: 10.5, fontWeight: 800, cursor: explanation ? 'pointer' : 'not-allowed' } }, 'Submit explanation')
      ) : null
    );
  }

  // ── 2. SNOW'S CHOLERA MAP (1854 Soho outbreak) ──
  function SnowCholeraMap(props) {
    if (!R) return null;
    var awardXP = props.awardXP;
    var ws = R.useState(0);     var week = ws[0];          var setWeek = ws[1];
    var hs = R.useState(false); var handleRemoved = hs[0]; var setHandleRemoved = hs[1];
    var sho = R.useState(true); var showDeaths = sho[0];   var setShowDeaths = sho[1];
    var ov = R.useState('none'); var overlay = ov[0];      var setOverlay = ov[1];
    var pumping = R.useState(false); var isPumping = pumping[0]; var setIsPumping = pumping[1];
    var tooltip = R.useState(null); var activeTooltip = tooltip[0]; var setActiveTooltip = tooltip[1];
    var awardedRef = R.useRef(false);

    var WEEKS = [
      { label: 'Aug 31', deaths: 12, note: 'Outbreak begins. Mostly miasma theory in play.' },
      { label: 'Sept 1', deaths: 70, note: 'Cases spike. Snow already mapping addresses.' },
      { label: 'Sept 2', deaths: 127, note: 'Peak day. Snow notes pump as common factor.' },
      { label: 'Sept 5', deaths: 76, note: 'Cases dropping (people fleeing Soho).' },
      { label: 'Sept 8', deaths: 38, note: 'Snow persuades parish to remove pump handle.' },
      { label: 'Sept 12', deaths: 15, note: 'Case rate continues to fall.' },
      { label: 'Sept 15', deaths: 6, note: 'Outbreak nearly contained.' }
    ];
    var w = WEEKS[week];

    var DEATHS = (function() {
      var seed = 7;
      function rng() { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }
      var dots = []; var n = 220;
      var streetList = [
        'Broad Street', 'Wardour Street', 'Berwick Street', 'Marshall Street', 
        'Brewer Street', 'Lexington Street', 'Poland Street', 'Great Pulteney Street',
        'Husband Street', 'Silver Street', 'Carnaby Street'
      ];
      for (var i = 0; i < n; i++) {
        var nearPump = rng() < 0.78; var x, y;
        if (nearPump) { var angle = rng() * Math.PI * 2; var rad = Math.pow(rng(), 1.5) * 55; x = 200 + rad * Math.cos(angle); y = 150 + rad * Math.sin(angle); }
        else { x = 30 + rng() * 340; y = 30 + rng() * 240; }
        
        var street = streetList[Math.floor(rng() * streetList.length)];
        var num = Math.floor(rng() * 45) + 1;
        var victims = Math.floor(rng() * 3) + 1;
        dots.push({ x: x, y: y, address: num + ' ' + street, victims: victims });
      }
      return dots;
    })();

    var totalDeaths = WEEKS.reduce(function(s, w) { return s + w.deaths; }, 0);
    var seenSoFar = WEEKS.slice(0, week + 1).reduce(function(s, w) { return s + w.deaths; }, 0);
    var cumDeathFraction = seenSoFar / totalDeaths;

    R.useEffect(function() {
      if (handleRemoved && week >= 4 && !awardedRef.current) {
        awardedRef.current = true;
        if (awardXP) awardXP(2);
      }
    }, [handleRemoved, week]);

    var tooltipEl = null;
    if (activeTooltip) {
      tooltipEl = hh('div', {
        style: {
          position: 'absolute',
          top: (activeTooltip.y / 3) + '%',
          left: (activeTooltip.x / 4) + '%',
          transform: 'translate(-50%, -120%)',
          background: 'var(--allo-stem-deeper, rgba(15, 23, 42, 0.95))',
          border: '1.5px solid #a855f7',
          padding: '6px 10px',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '9.5px',
          pointerEvents: 'none',
          zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          minWidth: '100px',
          textAlign: 'center'
        }
      },
        hh('div', { style: { fontWeight: 800, color: '#d8b4fe' } }, activeTooltip.address),
        hh('div', { style: { marginTop: 2 } }, activeTooltip.victims + (activeTooltip.victims === 1 ? ' death' : ' deaths'))
      );
    }

    return hh('div', { style: { background: 'var(--allo-stem-deeper, rgba(15,23,42,0.7))', borderRadius: 12, padding: 16, marginBottom: 14, borderTop: '1px solid rgba(168,85,247,0.30)', borderRight: '1px solid rgba(168,85,247,0.30)', borderBottom: '1px solid rgba(168,85,247,0.30)', borderLeft: '4px solid #a855f7' } },
      hh('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        hh('div', { 'aria-hidden': 'true', style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(168,85,247,0.18)', border: '1.5px solid #a855f7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 } }, '🗺️'),
        hh('div', { style: { flex: 1, minWidth: 200 } },
          hh('div', { style: { fontSize: 13, fontWeight: 800, color: '#d8b4fe' } }, 'Snow\'s map · Soho cholera outbreak, 1854'),
          hh('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, 'Walk through 6 weeks of the outbreak. Try removing the Broad Street pump handle. Watch the data move.')
        )
      ),
      hh('div', { style: { position: 'relative', background: 'var(--allo-stem-deeper, rgba(2,6,23,0.7))', borderRadius: 10, padding: 8, marginBottom: 10 } },
        hh('svg', { viewBox: '0 0 400 300', preserveAspectRatio: 'xMidYMid meet', 'aria-label': '1854 Soho map showing cholera deaths clustered around Broad Street water pump', style: { width: '100%', maxHeight: 300, display: 'block' } },
          hh('rect', { x: 0, y: 0, width: 400, height: 300, fill: '#1a1410', onClick: function() { setActiveTooltip(null); } }),
          hh('rect', { x: 0, y: 0, width: 400, height: 300, fill: '#3d2f1f', opacity: 0.4, onClick: function() { setActiveTooltip(null); } }),
          hh('g', { stroke: '#9ca3af', strokeWidth: 6, fill: 'none', opacity: 0.5 },
            hh('line', { x1: 30, y1: 150, x2: 370, y2: 150 }),
            hh('line', { x1: 100, y1: 30, x2: 100, y2: 270 }),
            hh('line', { x1: 230, y1: 30, x2: 230, y2: 270 }),
            hh('line', { x1: 320, y1: 30, x2: 320, y2: 270 }),
            hh('line', { x1: 30, y1: 80, x2: 370, y2: 80 }),
            hh('line', { x1: 30, y1: 220, x2: 370, y2: 220 })
          ),
          hh('g', { fill: '#ca8a04', fontSize: 6, fontFamily: 'Georgia, serif', fontStyle: 'italic' },
            hh('text', { x: 200, y: 145, textAnchor: 'middle' }, 'BROAD STREET'),
            hh('text', { x: 95, y: 28 }, 'Wardour'),
            hh('text', { x: 225, y: 28 }, 'Berwick'),
            hh('text', { x: 315, y: 28 }, 'Marshall'),
            hh('text', { x: 30, y: 78 }, 'Brewer'),
            hh('text', { x: 30, y: 218 }, 'Lexington')
          ),
          
          overlay === 'miasma' ? hh('g', { opacity: 0.25 },
            [
              { cx: 100, cy: 90, r: 40 },
              { cx: 300, cy: 80, r: 50 },
              { cx: 200, cy: 200, r: 60 },
              { cx: 80, cy: 220, r: 45 }
            ].map(function(c, i) {
              return hh('circle', {
                key: 'm-cloud-' + i,
                cx: c.cx,
                cy: c.cy,
                r: c.r,
                fill: '#22c55e',
                filter: 'blur(10px)',
                className: 'miasma-cloud-float'
              });
            })
          ) : null,

          overlay === 'waterborne' ? hh('g', { stroke: '#38bdf8', strokeWidth: 1.5, fill: 'none', strokeLinecap: 'round', opacity: 0.8 },
            hh('path', {
              d: 'M 200 150 L 200 120 M 200 150 L 200 180 M 200 150 L 100 150 M 200 150 L 320 150',
              strokeDasharray: '4,2',
              className: 'water-pipe-flow'
            }),
            hh('path', { d: 'M 100 150 L 100 80 M 100 150 L 100 220 M 230 150 L 230 80 M 230 150 L 230 220 M 320 150 L 320 80 M 320 150 L 320 220' }),
            DEATHS.slice(0, 45).map(function(d, i) {
              return hh('line', {
                key: 'pipe-conn-' + i,
                x1: d.x,
                y1: d.y,
                x2: d.x > 200 ? (d.x > 270 ? 320 : 230) : 100,
                y2: d.y,
                strokeWidth: 0.6,
                opacity: 0.5
              });
            })
          ) : null,

          showDeaths ? hh('g', null, DEATHS.map(function(d, i) {
            var visible = (i / DEATHS.length) <= cumDeathFraction;
            if (!visible) return null;
            var nearPump = Math.hypot(d.x - 200, d.y - 150) < 60;
            var lateInOutbreak = (i / DEATHS.length) > 0.6;
            var faded = handleRemoved && nearPump && lateInOutbreak;
            var isSel = activeTooltip && activeTooltip.index === i;
            return hh('circle', {
              key: 'd-' + i,
              cx: d.x,
              cy: d.y,
              r: isSel ? 4.5 : 2.4,
              fill: isSel ? '#fde047' : '#dc2626',
              opacity: faded ? 0.15 : 0.85,
              stroke: '#fff',
              strokeWidth: 0.3,
              cursor: 'pointer',
              onClick: function(e) {
                e.stopPropagation();
                setActiveTooltip({ index: i, x: d.x, y: d.y, address: d.address, victims: d.victims });
              }
            });
          })) : null,

          hh('g', null, [{ x: 80, y: 90 }, { x: 320, y: 90 }, { x: 350, y: 200 }, { x: 80, y: 240 }, { x: 240, y: 240 }].map(function(p, i) {
            return hh('g', { key: 'op-' + i },
              hh('rect', { x: p.x - 4, y: p.y - 6, width: 8, height: 12, fill: '#64748b', stroke: '#1f2937', strokeWidth: 0.5 }),
              hh('text', { x: p.x, y: p.y + 18, fontSize: 4, fill: '#94a3b8', textAnchor: 'middle', fontFamily: 'Georgia, serif' }, 'other pump')
            );
          })),

          hh('g', {
            style: { cursor: handleRemoved ? 'not-allowed' : 'pointer' },
            onClick: function() {
              if (handleRemoved) return;
              setIsPumping(true);
              setTimeout(function() { setIsPumping(false); }, 400);
            }
          },
            hh('path', { d: 'M 194 146 L 184 149 L 184 151 L 194 148 Z', fill: '#475569', stroke: '#1e293b', strokeWidth: 0.5 }),
            isPumping ? hh('g', null,
              hh('path', { d: 'M 185 151 Q 183 158 184 165', fill: 'none', stroke: '#38bdf8', strokeWidth: 1.5, strokeDasharray: '2,2', className: 'water-flow-anim' }),
              hh('ellipse', { cx: 184, cy: 165, rx: 3, ry: 1, fill: '#38bdf8', opacity: 0.7 })
            ) : null,
            hh('rect', { x: 194, y: 138, width: 12, height: 26, fill: '#334155', stroke: '#0f172a', strokeWidth: 0.8, rx: 1 }),
            hh('path', { d: 'M 192 138 L 208 138 L 204 134 L 196 134 Z', fill: '#1e293b', stroke: '#0f172a', strokeWidth: 0.5 }),
            hh('line', {
              x1: 204,
              y1: 141,
              x2: handleRemoved ? 204 : (isPumping ? 222 : 226),
              y2: handleRemoved ? 141 : (isPumping ? 148 : 134),
              stroke: handleRemoved ? '#475569' : '#b45309',
              strokeWidth: 2,
              strokeLinecap: 'round'
            }),
            !handleRemoved ? hh('circle', {
              cx: isPumping ? 222 : 226,
              cy: isPumping ? 148 : 134,
              r: 2.5,
              fill: '#b45309'
            }) : null,
            hh('text', {
              x: 200,
              y: 172,
              fontSize: 6,
              fill: handleRemoved ? '#94a3b8' : '#fde047',
              textAnchor: 'middle',
              fontFamily: 'Georgia, serif',
              fontWeight: 700
            }, handleRemoved ? '✗ pump handle removed' : 'BROAD ST PUMP (Click to Pump)')
          )
        ),
        tooltipEl
      ),
      hh('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 10, flexWrap: 'wrap' } },
        [
          { id: 'none', label: 'None' },
          { id: 'miasma', label: '💨 Miasma Theory' },
          { id: 'waterborne', label: '💧 Waterborne Theory' }
        ].map(function(opt) {
          var active = overlay === opt.id;
          return hh('button', {
            key: 'o-' + opt.id,
            onClick: function() { setOverlay(opt.id); },
            style: {
              padding: '6px 12px',
              borderRadius: 6,
              background: active ? '#a855f7' : 'rgba(168,85,247,0.1)',
              color: active ? '#0f172a' : '#d8b4fe',
              border: '1.5px solid #a855f7',
              fontSize: 10,
              fontWeight: 700,
              cursor: 'pointer'
            }
          }, opt.label);
        })
      ),
      hh('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' } },
        hh('span', { style: { fontSize: 10, fontWeight: 700, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', whiteSpace: 'nowrap' } }, w.label),
        hh('input', { type: 'range', min: 0, max: WEEKS.length - 1, step: 1, value: week, 'aria-valuetext': (WEEKS[week] && WEEKS[week].label ? WEEKS[week].label : ('week ' + week)), 'aria-label': 'Outbreak week', onChange: function(e) { setWeek(parseInt(e.target.value, 10)); }, style: { flex: 1, minWidth: 120, accentColor: '#a855f7' } }),
        hh('div', { style: { padding: '4px 10px', borderRadius: 999, background: 'rgba(220,38,38,0.18)', color: '#fca5a5', fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', border: '1px solid rgba(220,38,38,0.40)' } }, w.deaths + ' deaths')
      ),
      hh('div', { style: { padding: '10px 12px', borderRadius: 8, marginBottom: 10, background: 'var(--allo-stem-deeper, rgba(2,6,23,0.5))', borderLeft: '3px solid #a855f7' } },
        hh('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, w.note)
      ),
      hh('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 10 } },
        hh('button', { onClick: function() { setHandleRemoved(function(h2) { return !h2; }); }, style: { padding: '10px 16px', borderRadius: 8, background: handleRemoved ? 'rgba(148,163,184,0.18)' : '#fbbf24', color: handleRemoved ? '#cbd5e1' : '#0f172a', border: '1.5px solid #fbbf24', fontSize: 11, fontWeight: 800, cursor: 'pointer' } }, handleRemoved ? '↺ Replace pump handle' : '🔧 Remove pump handle (Snow\'s intervention)'),
        hh('button', { onClick: function() { setShowDeaths(function(s) { return !s; }); }, style: { padding: '10px 14px', borderRadius: 8, background: 'rgba(148,163,184,0.10)', color: 'var(--allo-stem-text-soft, #94a3b8)', border: '1px solid rgba(148,163,184,0.30)', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, showDeaths ? '👁 Hide death dots' : '👁 Show death dots'),
        hh('button', { onClick: function() { setWeek(0); setHandleRemoved(false); setOverlay('none'); }, style: { padding: '10px 14px', borderRadius: 8, background: 'rgba(148,163,184,0.10)', color: 'var(--allo-stem-text-soft, #94a3b8)', border: '1px solid rgba(148,163,184,0.30)', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '↺ Restart outbreak')
      ),
      handleRemoved && week >= 4 ? hh('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.30)', fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6 } },
        hh('strong', { style: { color: '#22c55e' } }, '🎓 What Snow proved: '),
        'The clustering of deaths around ONE pump, while other neighborhoods served by other pumps had few deaths, was inconsistent with airborne ("miasma") transmission. The dot map made the pattern visible. Removing the handle removed the source. Cholera fell. The case founded BOTH modern epidemiology AND data visualization. Tufte calls Snow\'s map "the most important data visualization ever made." (Honest footnote: case rate was already declining before removal because residents had fled - but the geographical pattern was the real evidence.)'
      ) : null
    );
  }

  // ── 3. VIRTUAL MICROSCOPE - organism slide swap ──
  function VirtualMicroscope(props) {
    if (!R) return null;
    var awardXP = props.awardXP;
    var d = props.d || {};
    var upd = props.upd || function() {};

    var organism = d.scopeOrganism || 'ecoli';
    var setOrganism = function(val) { upd({ scopeOrganism: val }); };
    var mag = d.magnification != null ? d.magnification : 400;
    var setMag = function(val) { upd({ magnification: val }); };

    var ss = R.useState(new Set()); var seen = ss[0];     var setSeen = ss[1];

    var ORGANISMS = [
      { id: 'ecoli', name: 'E. coli', icon: '🦠', kingdom: 'Bacterium · 2 µm', minVisibleMag: 200, color: '#22d3ee', shape: 'rod', sizeAt100: 0.6,
        info: 'Rod-shaped bacterium ~2 µm long. At 400-1000× you see the cell shape. To see flagella or pili you need EM. Has a single circular chromosome (no nucleus), ribosomes (smaller than ours, which is why erythromycin works against E. coli but not us), and flagella for swimming.' },
      { id: 'strep', name: 'Streptococcus', icon: '🟢', kingdom: 'Bacterium · 1 µm', minVisibleMag: 400, color: '#a855f7', shape: 'cocci_chain', sizeAt100: 0.4,
        info: 'Spherical bacteria (cocci) that divide along one axis, producing chains. Streptococcus pyogenes causes strep throat + scarlet fever. Streptococcus pneumoniae is the leading cause of bacterial pneumonia. Some species are beneficial fermenters (yogurt).' },
      { id: 'parame', name: 'Paramecium', icon: '🐛', kingdom: 'Protist · 250 µm', minVisibleMag: 40, color: '#22c55e', shape: 'paramecium', sizeAt100: 4,
        info: 'Single-celled eukaryote. Visible as a moving slipper-shaped blob even at 100×. Covered in cilia for swimming + feeding (sweep food into a "mouth"). Has TWO nuclei: macronucleus for everyday RNA, micronucleus for sex/exchange. Found in pond water everywhere.' },
      { id: 'plasmo', name: 'Plasmodium', icon: '🩸', kingdom: 'Protist · 5 µm', minVisibleMag: 600, color: '#dc2626', shape: 'plasmodium', sizeAt100: 0.7,
        info: 'Causes malaria. Lives inside red blood cells (visible as dark inclusion in stained smear). Five species infect humans; P. falciparum is deadliest. Has mosquito + human stages of life cycle. Killed an estimated half of all humans who ever lived (modern estimate, mostly children under 5).' },
      { id: 'phage', name: 'T4 Bacteriophage', icon: '🚀', kingdom: 'Virus · 0.2 µm', minVisibleMag: 50000, color: '#fbbf24', shape: 'phage', sizeAt100: 0.05,
        info: 'A virus that infects E. coli. Has icosahedral head + contractile tail + base plate with tail fibers. Lands on bacterium, injects DNA through tail like a syringe. Hijacks cell to make more phages. Visible only by electron microscopy. Phage therapy is being explored as antibiotic alternative.' }
    ];
    var sel = ORGANISMS.filter(function(o) { return o.id === organism; })[0] || ORGANISMS[0];
    
    // Focus calculation
    var focusVal = d.microscopeFocus != null ? d.microscopeFocus : 10;
    var targetFocus = d.microscopeTargetFocus != null ? d.microscopeTargetFocus : 50;
    var focusDiff = Math.abs(focusVal - targetFocus);
    var isFocused = focusDiff <= 4;
    var blurPx = Math.min(8, focusDiff * 0.15);

    var canSee = mag >= sel.minVisibleMag;
    var apparentSize = Math.min(180, sel.sizeAt100 * (mag / 100) * 12);
    var labels = mag >= sel.minVisibleMag * 2;

    R.useEffect(function() {
      if (canSee && isFocused && !seen.has(organism)) {
        var ns = new Set(seen); ns.add(organism); setSeen(ns);
        if (awardXP && ns.size === 1) awardXP(1);
        if (awardXP && ns.size === 5) awardXP(2);
      }
    }, [organism, canSee, isFocused]);

    function renderOrganism(o, size, showLabels) {
      var c = o.color; var s = size; var cx = 100, cy = 100;
      if (o.shape === 'rod') {
        return hh('g', null,
          hh('rect', { x: cx - s * 0.7, y: cy - s * 0.18, width: s * 1.4, height: s * 0.36, rx: s * 0.18, fill: c, stroke: '#0f172a', strokeWidth: 0.6, opacity: 0.85 }),
          showLabels ? hh('g', null,
            hh('circle', { cx: cx - s * 0.5, cy: cy, r: s * 0.06, fill: '#7c3aed' }),
            hh('text', { x: cx - s * 0.5, y: cy - s * 0.3, fontSize: 6, fill: '#a78bfa', textAnchor: 'middle' }, 'nucleoid'),
            hh('g', { stroke: '#fbbf24', strokeWidth: 0.4, fill: 'none' },
              hh('path', { d: 'M ' + (cx + s * 0.7) + ' ' + (cy - 1) + ' Q ' + (cx + s * 1.2) + ' ' + (cy - 6) + ' ' + (cx + s * 1.5) + ' ' + (cy - 2) }),
              hh('path', { d: 'M ' + (cx + s * 0.7) + ' ' + cy + ' Q ' + (cx + s * 1.3) + ' ' + (cy + 5) + ' ' + (cx + s * 1.6) + ' ' + cy }),
              hh('path', { d: 'M ' + (cx + s * 0.7) + ' ' + (cy + 1) + ' Q ' + (cx + s * 1.2) + ' ' + (cy + 8) + ' ' + (cx + s * 1.5) + ' ' + (cy + 3) })
            ),
            hh('text', { x: cx + s * 1.6, y: cy + 8, fontSize: 6, fill: '#fde047' }, 'flagella')
          ) : null
        );
      }
      if (o.shape === 'cocci_chain') {
        var chain = [];
        for (var i = 0; i < 5; i++) {
          chain.push(hh('circle', { key: 'c-' + i, cx: cx + (i - 2) * s * 0.5, cy: cy, r: s * 0.22, fill: c, stroke: '#0f172a', strokeWidth: 0.5, opacity: 0.85 }));
        }
        return hh('g', null, chain, showLabels ? hh('text', { x: cx, y: cy + s * 0.6, fontSize: 6, fill: '#d8b4fe', textAnchor: 'middle' }, 'chain of cocci') : null);
      }
      if (o.shape === 'paramecium') {
        var cilia = [];
        for (var ii = 0; ii < 24; ii++) {
          var ang = (ii / 24) * Math.PI * 2;
          var rx = s * 0.6, ry = s * 0.3;
          var x1 = cx + rx * Math.cos(ang); var y1 = cy + ry * Math.sin(ang);
          var x2 = cx + (rx + 4) * Math.cos(ang); var y2 = cy + (ry + 4) * Math.sin(ang);
          cilia.push(hh('line', { key: 'ci-' + ii, x1: x1, y1: y1, x2: x2, y2: y2 }));
        }
        return hh('g', null,
          hh('ellipse', { cx: cx, cy: cy, rx: s * 0.6, ry: s * 0.3, fill: c, stroke: '#0f172a', strokeWidth: 0.6, opacity: 0.7 }),
          hh('g', { stroke: '#22c55e', strokeWidth: 0.4 }, cilia),
          hh('ellipse', { cx: cx - s * 0.05, cy: cy, rx: s * 0.18, ry: s * 0.10, fill: '#16a34a', opacity: 0.7 }),
          hh('circle', { cx: cx + s * 0.15, cy: cy - s * 0.05, r: s * 0.04, fill: '#15803d' }),
          hh('path', { d: 'M ' + (cx - s * 0.3) + ' ' + cy + ' Q ' + (cx - s * 0.1) + ' ' + (cy - s * 0.18) + ' ' + (cx + s * 0.1) + ' ' + (cy - s * 0.15), fill: 'none', stroke: '#15803d', strokeWidth: 0.6 }),
          showLabels ? hh('g', null,
            hh('text', { x: cx - s * 0.05, y: cy - s * 0.4, fontSize: 5, fill: '#86efac', textAnchor: 'middle' }, 'macronucleus'),
            hh('text', { x: cx + s * 0.5, y: cy + s * 0.5, fontSize: 5, fill: '#86efac', textAnchor: 'middle' }, 'cilia'),
            hh('text', { x: cx - s * 0.3, y: cy + s * 0.5, fontSize: 5, fill: '#86efac', textAnchor: 'middle' }, 'oral groove')
          ) : null
        );
      }
      if (o.shape === 'plasmodium') {
        return hh('g', null,
          hh('circle', { cx: cx, cy: cy, r: s * 0.7, fill: '#fca5a5', stroke: '#7f1d1d', strokeWidth: 0.5, opacity: 0.6 }),
          hh('circle', { cx: cx, cy: cy, r: s * 0.25, fill: '#7f1d1d', opacity: 0.4 }),
          hh('circle', { cx: cx + s * 0.25, cy: cy - s * 0.1, r: s * 0.18, fill: 'none', stroke: c, strokeWidth: s * 0.08, opacity: 0.9 }),
          hh('circle', { cx: cx + s * 0.25 + s * 0.12, cy: cy - s * 0.18, r: s * 0.05, fill: '#0f172a' }),
          showLabels ? hh('g', null,
            hh('text', { x: cx, y: cy + s * 0.95, fontSize: 5, fill: '#fca5a5', textAnchor: 'middle' }, 'red blood cell host'),
            hh('text', { x: cx + s * 0.7, y: cy - s * 0.3, fontSize: 5, fill: '#fecaca' }, 'parasite (ring stage)')
          ) : null
        );
      }
      if (o.shape === 'phage') {
        return hh('g', null,
          hh('polygon', { points: (cx - s * 0.25) + ',' + (cy - s * 0.5) + ' ' + (cx + s * 0.25) + ',' + (cy - s * 0.5) + ' ' + (cx + s * 0.4) + ',' + (cy - s * 0.25) + ' ' + (cx + s * 0.25) + ',' + cy + ' ' + (cx - s * 0.25) + ',' + cy + ' ' + (cx - s * 0.4) + ',' + (cy - s * 0.25), fill: c, stroke: '#0f172a', strokeWidth: 0.6, opacity: 0.9 }),
          hh('rect', { x: cx - s * 0.06, y: cy, width: s * 0.12, height: s * 0.4, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 0.4 }),
          hh('line', { x1: cx - s * 0.07, y1: cy + s * 0.1, x2: cx + s * 0.07, y2: cy + s * 0.1, stroke: '#0f172a', strokeWidth: 0.3 }),
          hh('line', { x1: cx - s * 0.07, y1: cy + s * 0.2, x2: cx + s * 0.07, y2: cy + s * 0.2, stroke: '#0f172a', strokeWidth: 0.3 }),
          hh('line', { x1: cx - s * 0.07, y1: cy + s * 0.3, x2: cx + s * 0.07, y2: cy + s * 0.3, stroke: '#0f172a', strokeWidth: 0.3 }),
          hh('rect', { x: cx - s * 0.18, y: cy + s * 0.4, width: s * 0.36, height: s * 0.05, fill: '#92400e' }),
          hh('g', { stroke: '#92400e', strokeWidth: 0.6, fill: 'none' },
            hh('path', { d: 'M ' + (cx - s * 0.15) + ' ' + (cy + s * 0.45) + ' L ' + (cx - s * 0.3) + ' ' + (cy + s * 0.7) }),
            hh('path', { d: 'M ' + (cx + s * 0.15) + ' ' + (cy + s * 0.45) + ' L ' + (cx + s * 0.3) + ' ' + (cy + s * 0.7) }),
            hh('path', { d: 'M ' + (cx - s * 0.05) + ' ' + (cy + s * 0.45) + ' L ' + (cx - s * 0.15) + ' ' + (cy + s * 0.75) }),
            hh('path', { d: 'M ' + (cx + s * 0.05) + ' ' + (cy + s * 0.45) + ' L ' + (cx + s * 0.15) + ' ' + (cy + s * 0.75) })
          ),
          showLabels ? hh('g', null,
            hh('text', { x: cx + s * 0.5, y: cy - s * 0.35, fontSize: 5, fill: '#fde047' }, 'head (DNA inside)'),
            hh('text', { x: cx + s * 0.5, y: cy + s * 0.7, fontSize: 5, fill: '#92400e' }, 'tail fibers')
          ) : null
        );
      }
      return null;
    }

    return hh('div', { style: { background: 'var(--allo-stem-deeper, rgba(15,23,42,0.7))', borderRadius: 12, padding: 16, marginBottom: 14, borderTop: '1px solid rgba(16,185,129,0.30)', borderRight: '1px solid rgba(16,185,129,0.30)', borderBottom: '1px solid rgba(16,185,129,0.30)', borderLeft: '4px solid #10b981' } },
      hh('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
        hh('div', { 'aria-hidden': 'true', style: { width: 36, height: 36, borderRadius: '50%', background: 'rgba(16,185,129,0.18)', border: '1.5px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 } }, '🔬'),
        hh('div', { style: { flex: 1, minWidth: 200 } },
          hh('div', { style: { fontSize: 13, fontWeight: 800, color: '#6ee7b7' } }, 'Virtual microscope · swap slides'),
          hh('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2, fontStyle: 'italic' } }, 'Schematic teaching slides, not micrographs. Compare scale, visibility threshold, and focus.')
        ),
        hh('div', { style: { padding: '4px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.12)', color: '#6ee7b7', fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', border: '1px solid rgba(16,185,129,0.40)' } }, 'Slides seen: ' + seen.size + '/5')
      ),
      hh('div', { role: 'group', 'aria-label': 'Organism slides', style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
        ORGANISMS.map(function(o) {
          var active = o.id === organism;
          return hh('button', {
            key: 'sl-' + o.id,
            type: 'button',
            'aria-current': active ? 'true' : undefined,
            onClick: function() {
              setOrganism(o.id);
              // Randomize focus target so each slide starts slightly out of focus
              upd({ microscopeTargetFocus: Math.floor(Math.random() * 60) + 20 });
            },
            className: 'microscope-slide-btn' + (active ? ' active' : ''),
            style: { '--slide-color': o.color }
          },
            hh('div', { 'aria-hidden': 'true', style: { fontSize: 16, marginBottom: 2 } }, o.icon),
            hh('div', null, o.name),
            hh('div', { style: { fontSize: 8, opacity: 0.7, marginTop: 2 } }, o.kingdom)
          );
        })
      ),
      hh('div', { style: { background: 'var(--allo-stem-deeper, #0a0e1a)', borderRadius: '50%', width: '100%', maxWidth: 320, height: 280, margin: '0 auto 12px', position: 'relative', overflow: 'hidden', border: '4px solid #1f2937', boxShadow: 'inset 0 0 55px rgba(0,0,0,0.45), inset 0 0 40px rgba(16,185,129,0.10), 0 0 30px rgba(0,0,0,0.5)' } },
        hh('svg', { viewBox: '0 0 200 200', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Microscope teaching illustration of ' + sel.name + ' at ' + mag + 'x magnification. ' + (canSee ? (isFocused ? 'The specimen is in focus.' : 'The specimen is visible but out of focus.') : 'The specimen is below the visibility threshold.'), style: { width: '100%', height: '100%', display: 'block' } },
          hh('defs', null, hh('pattern', { id: 'mscope-grid', x: 0, y: 0, width: 20, height: 20, patternUnits: 'userSpaceOnUse' }, hh('path', { d: 'M 20 0 L 0 0 0 20', fill: 'none', stroke: '#1e293b', strokeWidth: 0.3 }))),
          hh('rect', { x: 0, y: 0, width: 200, height: 200, fill: 'url(#mscope-grid)' }),
          canSee ? hh('g', {
            className: sel.id === 'parame' ? 'micro-swim' : (sel.id === 'phage' ? 'micro-phage-float' : 'micro-wiggle'),
            style: { filter: 'blur(' + blurPx + 'px)', transformOrigin: '100px 100px', transition: 'filter 100ms ease' }
          }, renderOrganism(sel, apparentSize, labels && isFocused)) : hh('g', null,
            hh('text', { x: 100, y: 90, fontSize: 8, fill: '#94a3b8', textAnchor: 'middle' }, 'Below visibility threshold'),
            hh('text', { x: 100, y: 105, fontSize: 6, fill: '#64748b', textAnchor: 'middle' }, sel.name + ' needs ≥' + sel.minVisibleMag + '×'),
            hh('text', { x: 100, y: 130, fontSize: 24, textAnchor: 'middle' }, '·')
          )
        ),
        hh('div', { style: { position: 'absolute', top: 10, right: 14, padding: '4px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.20)', color: '#6ee7b7', fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, Menlo, monospace', border: '1px solid rgba(16,185,129,0.40)' } }, mag + '×')
      ),
      hh('div', { style: { padding: '0 4px', marginBottom: 10 } },
        hh('input', { type: 'range', min: 10, max: 100000, step: 10, value: mag, 'aria-valuetext': mag + 'x magnification', 'aria-label': 'Magnification', onChange: function(e) { setMag(parseInt(e.target.value, 10)); }, style: { width: '100%', accentColor: '#10b981' } }),
        hh('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--allo-stem-text-soft, #64748b)', marginTop: 2, fontFamily: 'ui-monospace, Menlo, monospace' } },
          hh('span', null, '10× (eye)'), hh('span', null, '400× (light)'), hh('span', null, '2000× (oil)'), hh('span', null, '100,000× (EM)')
        )
      ),
      hh('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12, flexWrap: 'wrap' } },
        [10, 100, 400, 1000, 10000, 100000].map(function(level) {
          return hh('button', { key: 'q-' + level, type: 'button', 'aria-pressed': mag === level, onClick: function() { setMag(level); }, style: { padding: '4px 10px', borderRadius: 6, background: mag === level ? '#10b981' : 'rgba(16,185,129,0.10)', color: mag === level ? '#0f172a' : '#6ee7b7', border: '1px solid #10b981', fontSize: 10, fontWeight: 700, cursor: 'pointer' } }, level >= 1000 ? (level / 1000) + 'k×' : level + '×');
        })
      ),
      hh('div', { style: { padding: '0 4px', marginBottom: 14 } },
        hh('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
          hh('span', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', fontWeight: 600 } }, '🔬 Fine Focus Dial:'),
          hh('span', { style: { fontSize: 11, fontWeight: 800, color: isFocused ? '#4ade80' : '#fbbf24' } }, isFocused ? '🟢 Focused (details visible)' : '🟡 Blurry (adjust dial to resolve)')
        ),
        hh('input', {
          type: 'range',
          min: 0,
          max: 100,
          step: 1,
          value: focusVal,
          'aria-valuetext': focusVal + ' percent focus', 'aria-label': 'Fine Focus',
          onChange: function(e) { upd({ microscopeFocus: parseInt(e.target.value, 10) }); },
          style: { width: '100%', accentColor: '#10b981' }
        })
      ),
      hh('div', { style: { padding: '10px 12px', borderRadius: 8, background: 'var(--allo-stem-deeper, rgba(2,6,23,0.5))', borderLeft: '3px solid ' + sel.color } },
        hh('div', { style: { fontSize: 11, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.icon + ' ' + sel.name + ' · ' + sel.kingdom),
        hh('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6 } }, sel.info)
      )
    );
  }

  // ──────────────────────────────────────────────────────────────────
  // Plugin registration
  // ──────────────────────────────────────────────────────────────────
  var DEFAULT_MICROBIOLOGY_STATE = {
    tab: 'home',
    showMicroLibrary: false,
    selectedBacterium: 'ecoli',
    selectedVirus: 'covid',
    selectedScope: 'lightbright',
    selectedMicrobiome: 'gut',
    selectedFerment: 'sourdough',
    selectedCase: 'snow',
    scopeOrganism: 'ecoli',
    magnification: 400,
    microscopeFocus: 10,
    microscopeTargetFocus: 50,
    gramStep: 0,
    quizIdx: 0,
    quizAnswers: [],
    quizSubmitted: false,
    quizCorrect: 0,
    growthLab: {
      profile: 'ecoli',
      tempC: 30,
      pH: 7,
      oxygen: 50,
      hypothesis: '',
      stuckRevealed: false,
      understood: false,
      explanation: '',
      log: []
    }
  };

  window.StemLab.registerTool('microbiology', {
    icon: '🦠',
    label: 'Microbiology Lab',
    desc: 'NGSS MS-LS1 + HS-LS1 + HS-LS3 + HS-LS4. The microbial world: bacteria (beneficial + pathogenic), viruses (incl. COVID, flu, HIV, phages, measles), microscopy (light + phase + fluorescent + EM + AFM, plus a virtual-microscope slide-swap with rendered E. coli / Streptococcus / Paramecium / Plasmodium / T4 phage), antibiotic resistance evolution (interactive petri-dish selection-pressure sim), the human + soil + ocean microbiome, immune system + vaccines, fermentation (sourdough, yogurt, kimchi, sauerkraut, kombucha, cheese), classic case studies (Snow\'s 1854 cholera map as walkable interactive, Fleming\'s penicillin, MRSA, COVID/mRNA, FMT), AP-style quiz, printable lab safety + key microbes card.',
    color: 'emerald',
    category: 'science',
    render: function(ctx) {
      var __alloT = function (k, fb) { var v; try { v = (typeof ctx.t === "function") ? ctx.t(k, fb) : null; } catch (e) { v = null; } return (v == null) ? (fb != null ? fb : k) : v; };
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;

      var savedMicrobiology = (labToolData && labToolData.microbiology) || {};
      var d = Object.assign({}, DEFAULT_MICROBIOLOGY_STATE, savedMicrobiology);
      d.quizAnswers = Array.isArray(savedMicrobiology.quizAnswers) ? savedMicrobiology.quizAnswers : DEFAULT_MICROBIOLOGY_STATE.quizAnswers;
      d.growthLab = Object.assign({}, DEFAULT_MICROBIOLOGY_STATE.growthLab, savedMicrobiology.growthLab || {});

      function upd(patch) {
        setLabToolData(function(prev) {
          var prior = Object.assign({}, DEFAULT_MICROBIOLOGY_STATE, (prev && prev.microbiology) || {});
          var s = Object.assign({}, prior, patch);
          if (patch && patch.growthLab) {
            s.growthLab = Object.assign({}, DEFAULT_MICROBIOLOGY_STATE.growthLab, prior.growthLab || {}, patch.growthLab);
          }
          return Object.assign({}, prev, { microbiology: s });
        });
      }

      function renderMicroscopeLink(type, id) {
        var mapping = {
          ecoli: { slide: 'ecoli', mag: 1000, scope: 'lightbright' },
          phage: { slide: 'phage', mag: 100000, scope: 'em' },
          plasmodium: { slide: 'plasmo', mag: 1000, scope: 'lightbright' },
          paramecium: { slide: 'parame', mag: 400, scope: 'lightbright' }
        };

        var link = mapping[id];
        if (!link) return null;

        var displayNames = {
          ecoli: 'E. coli slide',
          strep: 'Streptococcus slide',
          parame: 'Paramecium slide',
          plasmo: 'Plasmodium slide',
          phage: 'T4 Phage slide'
        };
        var slideName = displayNames[link.slide] || link.slide;

        return h('div', { style: { marginTop: 12, display: 'flex', justifyContent: 'flex-end' } },
          h('button', {
            type: 'button',
            onClick: function() {
              upd({
                tab: 'microscope',
                scopeOrganism: link.slide,
                magnification: link.mag,
                selectedScope: link.scope,
                microscopeFocus: 10,
                microscopeTargetFocus: Math.floor(Math.random() * 60) + 20
              });
              if (addToast) {
                addToast('🔬 Mounted and focused ' + slideName + '!', 'success');
              }
            },
            style: { padding: '6px 12px', borderRadius: 6, background: '#10b981', color: '#0f172a', border: 'none', fontSize: 10.5, fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }
          }, __alloT('stem.microbiology.observe_under_microscope', '🔬 Observe under microscope →'))
        );
      }

      var EMERALD = '#10b981', EMERALD_DARK = '#064e3b';
      var BG = '#0f172a';

      var TABS = [
        { id: 'home',       icon: '🦠', label: __alloT('stem.microbiology.home', 'Home') },
        { id: 'bacteria',   icon: '🧫', label: __alloT('stem.microbiology.bacteria', 'Bacteria') },
        { id: 'viruses',    icon: '🧬', label: __alloT('stem.microbiology.viruses', 'Viruses') },
        { id: 'fungi',      icon: '🍄', label: __alloT('stem.microbiology.fungi', 'Fungi') },
        { id: 'protists',   icon: '🦠', label: __alloT('stem.microbiology.protists', 'Protists') },
        { id: 'archaea',    icon: '♨️', label: __alloT('stem.microbiology.archaea', 'Archaea') },
        { id: 'microscope', icon: '🔬', label: __alloT('stem.microbiology.microscope', 'Microscope') },
        { id: 'resistance', icon: '⚠️', label: __alloT('stem.microbiology.resistance', 'Resistance') },
        { id: 'microbiome', icon: '🌱', label: __alloT('stem.microbiology.microbiome', 'Microbiome') },
        { id: 'plantmicro', icon: '🌿', label: __alloT('stem.microbiology.plant_microbes', 'Plant Microbes') },
        { id: 'biofilms',   icon: '🟢', label: __alloT('stem.microbiology.biofilms', 'Biofilms') },
        { id: 'biotech',    icon: '🏭', label: __alloT('stem.microbiology.biotech', 'Biotech') },
        { id: 'immune',     icon: '🛡️', label: __alloT('stem.microbiology.vaccines', 'Vaccines') },
        { id: 'ferment',    icon: '🥖', label: __alloT('stem.microbiology.fermentation', 'Fermentation') },
        { id: 'cases',      icon: '📚', label: __alloT('stem.microbiology.case_studies', 'Case Studies') },
        { id: 'quiz',       icon: '📝', label: __alloT('stem.microbiology.quiz', 'Quiz') },
        { id: 'print',      icon: '🖨', label: __alloT('stem.microbiology.print', 'Print') },
        { id: 'growthLab',  icon: '📈', label: __alloT('stem.microbiology.growth_lab', 'Growth Lab') }
      ];

      var MICRO_CORE_TABS = ['home', 'microscope', 'bacteria', 'viruses', 'resistance', 'microbiome', 'growthLab', 'quiz'];
      var showFullMicroNav = !!d.showMicroLibrary || MICRO_CORE_TABS.indexOf(d.tab) === -1;
      var visibleMicroTabs = showFullMicroNav ? TABS : TABS.filter(function(tab) { return MICRO_CORE_TABS.indexOf(tab.id) !== -1; });
      var currentMicroTab = TABS.find(function(tab) { return tab.id === d.tab; }) || TABS[0];
      var microAnsweredCount = Array.isArray(d.quizAnswers) ? d.quizAnswers.filter(function(ans) { return ans != null; }).length : 0;
      var MICRO_SCOPE_LABELS = {
        lightbright: __alloT('stem.microbiology.scope_brightfield_short', 'Brightfield'),
        phase: __alloT('stem.microbiology.scope_phase_short', 'Phase contrast'),
        fluorescent: __alloT('stem.microbiology.scope_fluorescence_short', 'Fluorescence'),
        em: __alloT('stem.microbiology.scope_electron_short', 'Electron'),
        afm: __alloT('stem.microbiology.scope_afm_short', 'AFM')
      };
      var MICRO_ORGANISM_LABELS = {
        ecoli: 'E. coli',
        strep: 'Strep',
        parame: 'Paramecium',
        plasmo: 'Plasmodium',
        phage: 'T4 phage'
      };
      var MICRO_GROWTH_PROFILES = {
        ecoli: {
          id: 'ecoli', label: 'E. coli (facultative anaerobe)', short: 'E. coli',
          temp: [8, 37, 45], pH: [4.5, 7, 9], oxygenMode: 'facultative',
          oxygenNote: 'Grows with or without oxygen, but this teaching profile grows faster when oxygen is available.'
        },
        lactobacillus: {
          id: 'lactobacillus', label: 'Lactobacillus (aerotolerant fermenter)', short: 'Lactobacillus',
          temp: [10, 37, 45], pH: [3.5, 5.5, 7.5], oxygenMode: 'aerotolerant',
          oxygenNote: 'Relies mainly on fermentation; oxygen is tolerated rather than required in this teaching profile.'
        },
        methanogen: {
          id: 'methanogen', label: 'Mesophilic methanogen (obligate anaerobe)', short: 'Methanogen',
          temp: [20, 37, 45], pH: [6, 7, 8.2], oxygenMode: 'anaerobe',
          oxygenNote: 'Oxygen suppresses growth. Methanogens are archaea, not bacteria.'
        },
        thermus: {
          id: 'thermus', label: 'Thermus aquaticus (thermophilic aerobe)', short: 'T. aquaticus',
          temp: [40, 70, 80], pH: [5, 7.5, 9], oxygenMode: 'aerobe',
          oxygenNote: 'High temperature is favored; oxygen supports aerobic growth in this teaching profile.'
        }
      };
      function microEnvelopeScore(value, envelope) {
        var min = envelope[0], optimum = envelope[1], max = envelope[2];
        if (value <= min || value >= max) return 0;
        if (value === optimum) return 1;
        return value < optimum ? (value - min) / (optimum - min) : (max - value) / (max - optimum);
      }
      function microOxygenScore(value, mode) {
        var oxygen = Math.max(0, Math.min(100, value || 0));
        if (mode === 'anaerobe') return oxygen >= 10 ? 0 : 1 - oxygen / 10;
        if (mode === 'aerotolerant') return 0.85;
        if (mode === 'facultative') return 0.65 + 0.35 * (oxygen / 100);
        return 0.15 + 0.85 * (oxygen / 100);
      }
      function microGrowthScoreFor(values, profile) {
        return microEnvelopeScore(values.tempC, profile.temp) *
          microEnvelopeScore(values.pH, profile.pH) *
          microOxygenScore(values.oxygen, profile.oxygenMode);
      }
      function microProfileDefaults(profile) {
        return {
          tempC: profile.temp[1],
          pH: profile.pH[1],
          oxygen: profile.oxygenMode === 'anaerobe' ? 0 : (profile.oxygenMode === 'aerotolerant' ? 20 : 80)
        };
      }
      var microGrowthLab = d.growthLab || DEFAULT_MICROBIOLOGY_STATE.growthLab;
      var microGrowthProfile = MICRO_GROWTH_PROFILES[microGrowthLab.profile] || MICRO_GROWTH_PROFILES.ecoli;
      var microGrowthScore = microGrowthScoreFor(microGrowthLab, microGrowthProfile);
      var microGrowthLabel = microGrowthScore < 0.05 ? __alloT('stem.microbiology.growth_status_none', 'No growth') :
        (microGrowthScore < 0.25 ? __alloT('stem.microbiology.growth_status_slow', 'Slow') :
        (microGrowthScore < 0.6 ? __alloT('stem.microbiology.growth_status_healthy', 'Healthy') :
        __alloT('stem.microbiology.growth_status_optimal', 'Optimal')));
      var microScopeLabel = MICRO_SCOPE_LABELS[d.selectedScope] || d.selectedScope || MICRO_SCOPE_LABELS.lightbright;
      var microOrganismLabel = MICRO_ORGANISM_LABELS[d.scopeOrganism] || 'E. coli';
      var microStatusCards = [
        { label: __alloT('stem.microbiology.status_mode', 'Mode'), value: currentMicroTab.label || 'Home', note: showFullMicroNav ? __alloT('stem.microbiology.full_library_visible', 'Full library visible') : __alloT('stem.microbiology.core_tools_visible', 'Core tools visible') },
        { label: __alloT('stem.microbiology.status_specimen', 'Specimen'), value: microOrganismLabel, note: microScopeLabel + ' at ' + (d.magnification || DEFAULT_MICROBIOLOGY_STATE.magnification) + 'x' },
        { label: __alloT('stem.microbiology.status_growth', 'Growth'), value: microGrowthLabel, note: microGrowthProfile.short + ': ' + (microGrowthLab.tempC || 0) + 'C, pH ' + (microGrowthLab.pH || 0) + ', O2 ' + (microGrowthLab.oxygen || 0) + '%' },
        { label: __alloT('stem.microbiology.status_quiz', 'Quiz'), value: microAnsweredCount + '/' + QUIZ_QUESTIONS.length, note: d.quizSubmitted ? __alloT('stem.microbiology.quiz_submitted', 'Submitted') : __alloT('stem.microbiology.quiz_in_progress', 'In progress') }
      ];
      var MICRO_ROUTES = [
        { id: 'microscope', tag: 'Observe', accent: '#38bdf8', title: __alloT('stem.microbiology.route_microscope', 'Microscope'), copy: __alloT('stem.microbiology.route_microscope_copy', 'Mount a slide and compare what each instrument can resolve.') },
        { id: 'bacteria', tag: 'Classify', accent: '#10b981', title: __alloT('stem.microbiology.route_bacteria', 'Bacteria'), copy: __alloT('stem.microbiology.route_bacteria_copy', 'Study shape, Gram behavior, and helpful/pathogenic roles.') },
        { id: 'resistance', tag: 'Evolve', accent: '#f59e0b', title: __alloT('stem.microbiology.route_resistance', 'Resistance'), copy: __alloT('stem.microbiology.route_resistance_copy', 'Run selection-pressure thinking without digging through the library.') },
        { id: 'microbiome', tag: 'Connect', accent: '#a78bfa', title: __alloT('stem.microbiology.route_microbiome', 'Microbiome'), copy: __alloT('stem.microbiology.route_microbiome_copy', 'Compare gut, soil, ocean, and built-environment communities.') },
        { id: 'growthLab', tag: 'Test', accent: '#34d399', title: __alloT('stem.microbiology.route_growth', 'Growth Lab'), copy: __alloT('stem.microbiology.route_growth_copy', 'Adjust temperature, pH, and oxygen to test a hypothesis.') }
      ];

      var tabBar = h('nav', {
        'aria-label': __alloT('stem.microbiology.microbiology_sections', 'Microbiology sections'),
        className: 'micro-tab-list'
      },
        visibleMicroTabs.map(function(t) {
          var active = d.tab === t.id;
          return h('button', { key: t.id, type: 'button', 'aria-current': active ? 'page' : undefined, 'aria-label': t.label,
            className: 'micro-tab-btn' + (active ? ' active' : ''),
            onClick: function() { upd({ tab: t.id }); }
          }, t.icon + ' ' + t.label);
        })
      );

      function sectionCard(title, children, accent) {
        accent = accent || EMERALD;
        return h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + accent, boxShadow: '0 2px 10px rgba(0,0,0,0.20)', marginBottom: 12 } },
          title ? h('div', { style: { fontSize: 14, fontWeight: 800, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 8 } }, title) : null,
          children
        );
      }

      // HOME
      function renderHome() {
        return h('div', { style: { padding: 16 } },
          sectionCard('🦠 The microbial world is the dominant life on Earth',
            h('div', null,
              h('p', { style: { margin: '0 0 8px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.about_99_of_all_the_cells_on_earth_are', 'About 99% of all the cells on Earth are microbial. Bacteria, archaea, single-celled eukaryotes (protists), and fungi. They drive most of the planet\'s chemistry: carbon, nitrogen, sulfur, oxygen all cycle through microbial metabolism. Plants and animals exist within a microbial world, not the other way around.')
              ),
              h('p', { style: { margin: 0, fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                'You are about as much microbial as human, by cell count. Your gut microbiome is its own organ, doing things your own cells cannot. Your immune system is trained by microbes from birth. Most of the time, the relationship is mutual - they get a home, you get vitamins, digestion, protection. Occasionally one becomes pathogenic.'
              )
            )
          ),
          sectionCard('The three domains of cellular life + viruses',
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 } },
              [
                { name: __alloT('stem.microbiology.bacteria_2', 'Bacteria'), desc: __alloT('stem.microbiology.single_cells_without_a_nucleus_the_mos', 'Single cells without a nucleus. The most common form of life. ~1 trillion species (most uncharacterized).'), accent: EMERALD },
                { name: __alloT('stem.microbiology.archaea_2', 'Archaea'), desc: __alloT('stem.microbiology.single_cells_without_a_nucleus_but_as_', 'Single cells without a nucleus, but as different from bacteria as bacteria are from us. The third domain of life, only fully recognized since 1977.'), accent: '#ef4444' },
                { name: __alloT('stem.microbiology.eukaryotes_incl_fungi_protists', 'Eukaryotes (incl. fungi + protists)'), desc: __alloT('stem.microbiology.cells_with_a_nucleus_organelles_mitoch', 'Cells WITH a nucleus + organelles (mitochondria, chloroplasts). Includes single-celled fungi (yeast), filamentous fungi (mold), protists (amoeba, Plasmodium), and all plants + animals.'), accent: '#a855f7' },
                { name: __alloT('stem.microbiology.viruses_not_cellular', 'Viruses (not cellular)'), desc: __alloT('stem.microbiology.genetic_material_in_a_protein_shell_ca', 'Genetic material in a protein shell. Cannot reproduce without a host cell. Most biologists do not classify them as alive - but they certainly behave like life when inside cells.'), accent: '#0ea5e9' }
              ].map(function(g, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + g.accent } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 4 } }, g.name),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, g.desc)
                );
              })
            )
          ),
          sectionCard('Where microbes live',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.85 } },
              h('li', null, h('strong', null, __alloT('stem.microbiology.inside_you', 'Inside you. ')), __alloT('stem.microbiology.gut_mouth_skin_every_surface_that_meet', 'Gut, mouth, skin, every surface that meets the outside world. ~100 trillion cells.')),
              h('li', null, h('strong', null, __alloT('stem.microbiology.in_soil', 'In soil. ')), __alloT('stem.microbiology.50_billion_cells_per_gram_the_most_div', '~50 billion cells per gram. The most diverse community on Earth.')),
              h('li', null, h('strong', null, __alloT('stem.microbiology.in_the_ocean', 'In the ocean. ')), __alloT('stem.microbiology.10_million_per_ml_half_of_all_photosyn', '~10 million per mL. Half of all photosynthesis happens here.')),
              h('li', null, h('strong', null, __alloT('stem.microbiology.in_extreme_places', 'In extreme places. ')), __alloT('stem.microbiology.deep_sea_vents_at_113_c_antarctic_ice_', 'Deep-sea vents at 113°C. Antarctic ice. Acidic lakes. The deep crust kilometers below ground. Life finds a way.')),
              h('li', null, h('strong', null, __alloT('stem.microbiology.inside_other_organisms', 'Inside other organisms. ')), __alloT('stem.microbiology.every_plant_and_animal_carries_microbe', 'Every plant and animal carries microbes. Termites can\'t digest wood without their gut bacteria. Cows can\'t digest grass. Plants depend on root microbes for nitrogen.'))
            )
          ),
          sectionCard('Why understanding microbes matters',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
              __alloT('stem.microbiology.antibiotic_resistance_is_killing_more_', 'Antibiotic resistance is killing more people every year and rising. New viruses cross from animals into humans (COVID, HIV, Ebola). The microbiome is being reshaped by industrial agriculture, antibiotics, and processed food, with health consequences we are only beginning to understand. Microbial literacy is now a public health competency, not a specialist topic.')
            )
          ),

          sectionCard('🌍 The origins of life - 4.6 billion years in 12 steps',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.for_most_of_earth_s_history_microbes_w', 'For most of Earth\'s history, microbes were the ONLY life. Plants and animals are a relatively recent addition. Understanding microbial evolution is understanding the deep history of life on this planet.')
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                [
                  { age: '4.6 Gya', name: __alloT('stem.microbiology.earth_forms', 'Earth forms'), desc: __alloT('stem.microbiology.from_the_disk_around_the_young_sun_mol', 'From the disk around the young Sun. Molten surface; no atmosphere except primordial gases.'), color: '#ef4444' },
                  { age: '4.5 Gya', name: __alloT('stem.microbiology.moon_forming_impact', 'Moon-forming impact'), desc: __alloT('stem.microbiology.a_mars_sized_body_strikes_the_proto_ea', 'A Mars-sized body strikes the proto-Earth. Debris coalesces into the Moon. Stabilizes Earth\'s rotation axis, which becomes important for climate stability later.'), color: 'var(--allo-stem-text-soft, #94a3b8)' },
                  { age: '4.4 Gya', name: __alloT('stem.microbiology.first_oceans_condense', 'First oceans condense'), desc: __alloT('stem.microbiology.surface_cools_enough_for_water_vapor_t', 'Surface cools enough for water vapor to liquefy. Continuous oceans by ~4.3 Gya. Atmosphere has no free oxygen.'), color: '#0ea5e9' },
                  { age: '4.0 Gya', name: __alloT('stem.microbiology.late_heavy_bombardment_ends', 'Late Heavy Bombardment ends'), desc: __alloT('stem.microbiology.a_long_episode_of_intense_asteroid_imp', 'A long episode of intense asteroid impacts ends around now. Surface conditions stabilize enough that life can persist if it formed.'), color: 'var(--allo-stem-text-soft, #94a3b8)' },
                  { age: '4.0-3.5 Gya', name: __alloT('stem.microbiology.origin_of_life', 'Origin of life'), desc: __alloT('stem.microbiology.somewhere_here_we_don_t_know_exactly_w', 'Somewhere here. We don\'t know exactly where (hydrothermal vents? warm tide pools? clay surfaces?) or exactly how. The RNA world hypothesis: RNA, which can both store information AND catalyze reactions, came before DNA + protein. Self-replicating RNA molecules → enclosed in lipid vesicles → first cells.'), color: '#a855f7' },
                  { age: '3.5 Gya', name: __alloT('stem.microbiology.luca_last_universal_common_ancestor', 'LUCA - Last Universal Common Ancestor'), desc: __alloT('stem.microbiology.a_single_celled_organism_that_is_the_a', 'A single-celled organism that is the ancestor of every living thing on Earth. We have its inferred genome (from comparing all life): it had a membrane, DNA, ribosomes, ATP, the genetic code. All life since is descended from this one cell.'), color: '#fbbf24' },
                  { age: '3.5 Gya', name: __alloT('stem.microbiology.first_confirmed_microbial_fossils', 'First confirmed microbial fossils'), desc: __alloT('stem.microbiology.stromatolites_layered_structures_built', 'Stromatolites - layered structures built by mats of cyanobacteria-like microbes. Modern stromatolites still grow at Shark Bay, Australia. They are essentially unchanged in 3.5 billion years.'), color: '#10b981' },
                  { age: '2.5-2.4 Gya', name: __alloT('stem.microbiology.great_oxygenation_event_goe', 'Great Oxygenation Event (GOE)'), desc: __alloT('stem.microbiology.cyanobacteria_have_been_producing_o_as', 'Cyanobacteria have been producing O₂ as a byproduct of photosynthesis for several hundred million years. Once iron in the oceans is fully oxidized, free O₂ accumulates in the atmosphere. Disaster for most existing life (oxygen is toxic to anaerobes); enables more energy-dense aerobic metabolism for the survivors.'), color: '#06b6d4' },
                  { age: '2.1 Gya', name: __alloT('stem.microbiology.first_eukaryotes', 'First eukaryotes'), desc: __alloT('stem.microbiology.a_larger_archaeal_cell_engulfs_a_free_', 'A larger archaeal cell engulfs a free-living aerobic bacterium that becomes the mitochondrion (endosymbiosis, Lynn Margulis). The combination is the first eukaryote. Much later (~1.5 Gya), a similar event with a cyanobacterium produces the first plant cell with a chloroplast.'), color: '#7c3aed' },
                  { age: '1.5-1.0 Gya', name: __alloT('stem.microbiology.first_multicellular_life', 'First multicellular life'), desc: __alloT('stem.microbiology.multiple_lineages_evolve_multicellular', 'Multiple lineages evolve multicellularity independently - fungi, plants, animals all separately. Cells in a colony with division of labor. The transition is biologically subtle but evolutionarily enormous.'), color: '#22c55e' },
                  { age: '540 Mya', name: __alloT('stem.microbiology.cambrian_explosion', 'Cambrian explosion'), desc: __alloT('stem.microbiology.suddenly_most_major_animal_body_plans_', 'Suddenly, most major animal body plans appear in the fossil record within ~25 million years. The explanation is contested (genuine evolutionary rapid radiation? earlier soft-bodied ancestors that didn\'t fossilize? oxygen reaching critical levels?). Either way, the era of large multicellular animals begins.'), color: '#f59e0b' },
                  { age: '~300 kya', name: __alloT('stem.microbiology.homo_sapiens', 'Homo sapiens'), desc: __alloT('stem.microbiology.our_species_appears_in_africa_about_30', 'Our species appears in Africa about 300,000 years ago. We are recent newcomers; microbes have been here for ~14,000× longer.'), color: '#a78bfa' }
                ].map(function(e, i) {
                  return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, padding: 8, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + e.color } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: e.color, paddingTop: 2 } }, e.age),
                    h('div', null,
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 2 } }, e.name),
                      h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, e.desc)
                    )
                  );
                })
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.a_perspective_trick', 'A perspective trick: ')),
                __alloT('stem.microbiology.compress_all_4_6_billion_years_of_eart', 'compress all 4.6 billion years of Earth history into one calendar year. January 1 = Earth forms. February = oceans. March-April = first life. October = first eukaryotes. November = multicellular. December 14 = Cambrian explosion. December 26 = dinosaurs. December 31, 11:58 pm = first humans. The entire history of recorded civilization fits in the last 13 seconds of that cosmic year.')
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.the_rna_world_hypothesis', 'The RNA world hypothesis: ')),
                __alloT('stem.microbiology.how_do_you_get_a_self_replicating_cell', 'how do you get a self-replicating cell from chemistry? The current best guess: RNA can both store information (like DNA) AND catalyze chemical reactions (like enzymes). RNA molecules that happen to catalyze their own copying are selected for; over millions of years, increasingly elaborate RNA chemistry could have evolved before DNA and proteins took over. The 1989 Nobel Prize (Cech + Altman) was for proving RNA can act as an enzyme - direct lab evidence for the RNA-world idea.')
              )
            ),
            '#a855f7'
          ),

          sectionCard('🌲 Microbes in Maine',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.place_based_microbiology_the_microbes_', 'Place-based microbiology. The microbes here in Maine are particular: shaped by the Gulf of Maine, the boreal-northern temperate forests, the lakes and peatlands, and the climate. Several are clinically important; several are economically critical; one is reshaping the lobster industry.')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                [
                  { name: __alloT('stem.microbiology.borrelia_burgdorferi_lyme_disease', 'Borrelia burgdorferi (Lyme disease)'), kind: 'Tick-borne bacterium', color: '#ef4444',
                    desc: __alloT('stem.microbiology.the_spirochete_bacterium_carried_by_de', 'The spirochete bacterium carried by deer ticks (Ixodes scapularis). Maine has among the highest Lyme rates per capita in the US - over 1,400 confirmed cases / 100,000 in some years. The pathogen has expanded northward with warming winters; ticks no longer die back hard in Maine winters. Early-stage Lyme (with the bullseye rash) responds well to doxycycline. Late-stage Lyme is harder to treat.'),
                    prevention: 'Long pants tucked into socks. Permethrin-treated clothing. Daily tick checks. Cool-shower-and-tumble-dryer-the-clothes-on-high after time in the woods. Removing a tick within 24-36 hours of attachment usually prevents transmission.' },
                  { name: __alloT('stem.microbiology.vibrio_parahaemolyticus_v_vulnificus', 'Vibrio parahaemolyticus + V. vulnificus'), kind: 'Marine bacteria', color: '#0ea5e9',
                    desc: __alloT('stem.microbiology.naturally_present_in_seawater_shellfis', 'Naturally present in seawater + shellfish, especially in warmer months. Maine\'s Vibrio cases have grown along with the warming Gulf of Maine (which is warming faster than 99% of the world ocean). Causes severe gastroenteritis or, in immunocompromised people, life-threatening sepsis. The same warming that\'s reshaping Maine\'s coast is making Vibrio more common locally.'),
                    prevention: 'Maine raw oysters are extensively tested + cold-chained. Restaurants follow strict refrigeration protocols. Immunocompromised people should avoid raw shellfish.' },
                  { name: __alloT('stem.microbiology.eastern_equine_encephalitis_virus_eee', 'Eastern Equine Encephalitis virus (EEE)'), kind: 'Mosquito-borne virus', color: '#a855f7',
                    desc: __alloT('stem.microbiology.rare_but_among_the_deadliest_mosquito_', 'Rare but among the deadliest mosquito-borne viruses in the US: ~30% mortality in human cases, plus permanent neurological damage in survivors. Maintained in a swamp cycle (mosquitoes + songbirds) in freshwater wetlands. Bridge-vector mosquitoes occasionally transmit to humans, deer, horses. Maine has had occasional cases. Most years zero; some years a handful.'),
                    prevention: 'Mosquito repellent (DEET, picaridin). Long sleeves at dusk + dawn in late summer. Removing standing water. Maine Public Health monitors mosquito populations + warns of high-risk periods.' },
                  { name: __alloT('stem.microbiology.epizootic_shell_disease_american_lobst', 'Epizootic Shell Disease (American Lobster)'), kind: 'Polymicrobial', color: '#f59e0b',
                    desc: __alloT('stem.microbiology.a_complex_disease_where_multiple_bacte', 'A complex disease where multiple bacteria erode lobster shells. Prevalent in Long Island Sound and southern New England; spreading into Gulf of Maine waters with warming. Some Maine areas now seeing 5-10% of lobsters with shell disease, up from near-zero a decade ago. Affects lobsters\' ability to molt, makes them unmarketable. Climate stress = immune weakening + faster bacterial growth = more disease.'),
                    prevention: 'Larger picture: cooling waters again. Local picture: research on resistant lobster populations + early-warning surveillance.' },
                  { name: __alloT('stem.microbiology.sphagnum_bog_microbiome', 'Sphagnum bog microbiome'), kind: 'Acid-loving + nitrogen-fixing', color: '#10b981',
                    desc: __alloT('stem.microbiology.maine_s_peat_bogs_caribou_bog_big_heat', 'Maine\'s peat bogs (Caribou Bog, Big Heath, etc.) host a unique acid-tolerant community: Sphagnum moss + associated fungi + nitrogen-fixing cyanobacteria + bacterial communities that survive at pH 3-4. The bogs store enormous amounts of carbon - undisturbed peat is one of the world\'s most efficient carbon sinks per acre. Climate-relevant.'),
                    prevention: '(not a pathogen - these are protected ecosystems. Maine has dozens of preserved peatland sites studied for climate research.)' },
                  { name: __alloT('stem.microbiology.saccharomyces_maine_cider_beer', 'Saccharomyces (Maine cider + beer)'), kind: 'Beneficial yeasts', color: '#22c55e',
                    desc: __alloT('stem.microbiology.maine_s_apple_growing_tradition_produc', 'Maine\'s apple-growing tradition produces a robust cider industry; Maine breweries are among the highest density per capita in the US. Local yeasts adapted to Maine apples are still being domesticated by Maine fermentation labs. Each cidery + brewery cultivates particular yeast strains that survive cool Maine fermentation temperatures.'),
                    prevention: '(not a pathogen - economically important.)' }
                ].map(function(m, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + m.color } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8, flexWrap: 'wrap' } },
                      h('div', { style: { fontSize: 12.5, fontWeight: 800, color: m.color } }, m.name),
                      h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5 } }, m.kind)
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginBottom: 6 } }, m.desc),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #cbd5e1)', fontStyle: 'italic', lineHeight: 1.5 } }, h('strong', null, __alloT('stem.microbiology.prevention_context', 'Prevention / context: ')), m.prevention)
                  );
                })
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11.5, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.climate_and_maine_microbes', 'Climate and Maine microbes: ')),
                __alloT('stem.microbiology.the_gulf_of_maine_is_warming_faster_th', 'The Gulf of Maine is warming faster than 99% of the world ocean. This is reshaping bacterial communities in shellfish, the geographic range of tick-borne pathogens, the timing of mosquito-borne disease seasons, and the disease ecology of the lobster fishery. Public health and ecological microbiology are converging in Maine in real time.')
              )
            ),
            '#10b981'
          )
        );
      }

      // BACTERIA
      function renderBacteria() {
        var selected = BACTERIA.find(function(b) { return b.id === d.selectedBacterium; }) || BACTERIA[0];
        var roleColor = { beneficial: '#22c55e', 'mostly-beneficial': '#86efac', 'mostly-pathogenic': '#f59e0b', pathogenic: '#ef4444' };
        var roleLabel = { beneficial: 'beneficial', 'mostly-beneficial': 'mostly beneficial', 'mostly-pathogenic': 'mostly pathogenic', pathogenic: 'pathogenic' };

        // SVG of bacterial cell wall - one for Gram-positive, one for Gram-negative
        function gramSvg(kind) {
          var isPos = kind === 'positive';
          var dyeColor = isPos ? '#7c3aed' : '#ec4899';
          var label = isPos ? 'Gram-positive' : 'Gram-negative';
          return h('svg', { viewBox: '0 0 240 200', width: '100%', height: 200, role: 'img', 'aria-labelledby': 'g' + kind + 'Title g' + kind + 'Desc' },
            h('title', { id: 'g' + kind + 'Title' }, label + ' bacterial cell wall'),
            h('desc', { id: 'g' + kind + 'Desc' }, isPos ? 'A Gram-positive cell wall: thick layer (about 20-80 nanometers) of peptidoglycan outside a single plasma membrane. Stains purple with crystal violet.' : 'A Gram-negative cell wall: thin peptidoglycan layer (about 5-10 nm) sandwiched between two membranes, with the outer membrane containing lipopolysaccharide (LPS, also called endotoxin). Stains pink after counterstain.'),
            // Background - cytoplasm
            h('rect', { x: 0, y: 0, width: 240, height: 200, fill: '#1e293b' }),
            // Cytoplasm label
            h('text', { x: 30, y: 30, fill: '#94a3b8', fontSize: 10, fontStyle: 'italic' }, __alloT('stem.microbiology.cytoplasm', 'Cytoplasm')),
            // Plasma membrane (inner phospholipid bilayer)
            h('rect', { x: 0, y: 80, width: 240, height: 16, fill: '#fde68a', opacity: 0.85 }),
            h('text', { x: 120, y: 92, textAnchor: 'middle', fill: '#92400e', fontSize: 9, fontWeight: 700 }, __alloT('stem.microbiology.plasma_membrane', 'Plasma membrane')),
            // Peptidoglycan layer - thick for positive, thin for negative
            isPos
              ? h('g', null,
                  // Big thick wall
                  h('rect', { x: 0, y: 30, width: 240, height: 50, fill: dyeColor, opacity: 0.45 }),
                  // Cross-link patterns
                  [0, 1, 2, 3, 4, 5].map(function(i) {
                    return h('line', { key: 'cl' + i, x1: 20 + i * 40, y1: 35, x2: 20 + i * 40, y2: 76, stroke: '#fff', strokeWidth: 1, opacity: 0.4 });
                  }),
                  h('text', { x: 120, y: 60, textAnchor: 'middle', fill: '#fff', fontSize: 11, fontWeight: 800 }, __alloT('stem.microbiology.peptidoglycan_thick_20_80_nm', 'Peptidoglycan (thick: 20-80 nm)'))
                )
              : h('g', null,
                  // Thin peptidoglycan layer in middle of two membranes
                  h('rect', { x: 0, y: 55, width: 240, height: 8, fill: dyeColor, opacity: 0.55 }),
                  h('text', { x: 120, y: 50, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 9 }, __alloT('stem.microbiology.peptidoglycan_thin_5_10_nm', 'Peptidoglycan (thin: 5-10 nm)')),
                  // Outer membrane (lipid bilayer with LPS)
                  h('rect', { x: 0, y: 18, width: 240, height: 30, fill: '#fbbf24', opacity: 0.6 }),
                  // LPS spikes from outer membrane
                  [10, 30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230].map(function(x, i) {
                    return h('g', { key: 'lps' + i },
                      h('line', { x1: x, y1: 18, x2: x, y2: 5, stroke: '#fbbf24', strokeWidth: 1 }),
                      h('circle', { cx: x, cy: 4, r: 2, fill: dyeColor, opacity: 0.9 })
                    );
                  }),
                  h('text', { x: 120, y: 36, textAnchor: 'middle', fill: '#92400e', fontSize: 9, fontWeight: 700 }, __alloT('stem.microbiology.outer_membrane_lps', 'Outer membrane + LPS'))
                ),
            // Outside / environment
            h('text', { x: 120, y: 115, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10, fontStyle: 'italic' }, __alloT('stem.microbiology.periplasm_environment_outside', 'Periplasm / environment outside →')),
            // Label
            h('rect', { x: 0, y: 175, width: 240, height: 25, fill: dyeColor, opacity: 0.4 }),
            h('text', { x: 120, y: 192, textAnchor: 'middle', fill: '#fff', fontSize: 13, fontWeight: 800 }, label + ' (stains ' + (isPos ? 'purple' : 'pink') + ')')
          );
        }

        function interactiveGramStain() {
          var step = d.gramStep != null ? d.gramStep : 0;
          var stepLabels = ['1. Crystal Violet', '2. Iodine Mordant', '3. Decolorizer Wash', '4. Safranin Counterstain'];
          var stepDescriptions = [
            'Apply crystal violet primary dye. The dye penetrates the cell walls of both Gram-positive and Gram-negative bacteria, staining all cells deep purple.',
            'Apply iodine (mordant). Iodine molecules bind with the crystal violet, forming large CV-I complexes inside the cytoplasm of all cells. They remain purple.',
            'Wash with alcohol decolorizer. This dissolves the lipopolysaccharide outer membrane of Gram-negative cells, causing their thin peptidoglycan layer to release the CV-I dye, leaving them colorless. The thick peptidoglycan wall of Gram-positive cells shrinks and traps the dye, keeping them purple.',
            'Apply safranin counterstain. Safranin stains the now-colorless Gram-negative cells pink, while having no visible effect on the already purple Gram-positive cells.'
          ];

          var posColor = step === 0 ? '#475569' : '#7c3aed';
          var negColor = (step === 0 || step === 3) ? '#475569' : (step === 4 ? '#ec4899' : '#7c3aed');
          var posOpacity = step === 0 ? 0.3 : 0.9;
          var negOpacity = (step === 0 || step === 3) ? 0.3 : 0.9;

          return h('div', { style: { background: 'var(--allo-stem-deeper, rgba(15,23,42,0.4))', padding: 12, borderRadius: 12, border: '1px solid rgba(124,58,237,0.2)', marginBottom: 12 } },
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 } },
              h('div', null,
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#c4b5fd', marginBottom: 6, display: 'flex', justifyContent: 'space-between' } },
                  h('span', null, __alloT('stem.microbiology.slide_smear_1000x_oil_immersion', '🔬 Slide Smear (1000x Oil Immersion)')),
                  h('span', { style: { color: '#a78bfa' } }, step === 0 ? 'Step 0: Heat-Fixed Smear' : 'Step ' + step + ': ' + stepLabels[step - 1])
                ),
                h('svg', { viewBox: '0 0 200 150', style: { width: '100%', height: 160, display: 'block', background: 'var(--allo-stem-deeper, #070a13)', borderRadius: 8, border: '1px solid #334155' } },
                  h('circle', { cx: 100, cy: 75, r: 72, fill: 'none', stroke: '#1e293b', strokeWidth: 0.5 }),
                  h('line', { x1: 100, y1: 3, x2: 100, y2: 147, stroke: '#1e293b', strokeWidth: 0.3, strokeDasharray: '2,2' }),
                  h('line', { x1: 25, y1: 75, x2: 175, y2: 75, stroke: '#1e293b', strokeWidth: 0.3, strokeDasharray: '2,2' }),
                  h('g', null,
                    [0, 1, 2, 3, 4].map(function(i) {
                      return h('circle', { key: 'gpc1-' + i, cx: 50 + i * 7, cy: 50 + Math.sin(i) * 2, r: 4, fill: posColor, opacity: posOpacity, stroke: 'var(--allo-stem-deeper, #070a13)', strokeWidth: 0.3 });
                    }),
                    [0, 1, 2, 3].map(function(i) {
                      return h('circle', { key: 'gpc2-' + i, cx: 120 + i * 7, cy: 90 + Math.cos(i) * 2, r: 4, fill: posColor, opacity: posOpacity, stroke: 'var(--allo-stem-deeper, #070a13)', strokeWidth: 0.3 });
                    }),
                    h('text', { x: 50, y: 41, fill: posColor, fontSize: 5.5, fontWeight: 700, opacity: posOpacity }, __alloT('stem.microbiology.gram_positive_cocci', 'Gram-positive (cocci)'))
                  ),
                  h('g', null,
                    h('rect', { x: 45, y: 85, width: 14, height: 6, rx: 3, transform: 'rotate(15 52 88)', fill: negColor, opacity: negOpacity, stroke: 'var(--allo-stem-deeper, #070a13)', strokeWidth: 0.3 }),
                    h('rect', { x: 130, y: 45, width: 14, height: 6, rx: 3, transform: 'rotate(-30 137 48)', fill: negColor, opacity: negOpacity, stroke: 'var(--allo-stem-deeper, #070a13)', strokeWidth: 0.3 }),
                    h('rect', { x: 90, y: 65, width: 14, height: 6, rx: 3, transform: 'rotate(45 97 68)', fill: negColor, opacity: negOpacity, stroke: 'var(--allo-stem-deeper, #070a13)', strokeWidth: 0.3 }),
                    h('text', { x: 110, y: 38, fill: negColor, fontSize: 5.5, fontWeight: 700, opacity: negOpacity }, __alloT('stem.microbiology.gram_negative_bacilli', 'Gram-negative (bacilli)'))
                  )
                )
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8 } },
                h('div', null,
                  h('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', marginBottom: 6 } }, __alloT('stem.microbiology.reagents', 'Reagents')),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 8 } },
                    [
                      { stepVal: 1, label: __alloT('stem.microbiology.crystal_violet', '🟣 Crystal Violet'), desc: __alloT('stem.microbiology.primary_stain', 'Primary Stain') },
                      { stepVal: 2, label: __alloT('stem.microbiology.iodine', '🟤 Iodine'), desc: __alloT('stem.microbiology.mordant', 'Mordant') },
                      { stepVal: 3, label: __alloT('stem.microbiology.alcohol_wash', '⚪ Alcohol Wash'), desc: __alloT('stem.microbiology.decolorizer', 'Decolorizer') },
                      { stepVal: 4, label: __alloT('stem.microbiology.safranin', '🔴 Safranin'), desc: __alloT('stem.microbiology.counterstain', 'Counterstain') }
                    ].map(function(btn) {
                      var isNext = step === btn.stepVal - 1;
                      var isDone = step >= btn.stepVal;
                      return h('button', {
                        key: 'gbtn-' + btn.stepVal,
                        onClick: function() { if (isNext || isDone) upd({ gramStep: btn.stepVal }); },
                        disabled: !isNext && !isDone,
                        style: {
                          padding: '6px 4px',
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 700,
                          cursor: (isNext || isDone) ? 'pointer' : 'not-allowed',
                          background: isDone ? 'rgba(34,197,94,0.15)' : (isNext ? '#7c3aed' : 'rgba(30,41,59,0.3)'),
                          color: isDone ? '#4ade80' : (isNext ? '#fff' : '#475569'),
                          border: '1px solid ' + (isDone ? '#22c55e' : (isNext ? '#a78bfa' : '#334155')),
                          textAlign: 'center',
                          opacity: (isNext || isDone) ? 1 : 0.4
                        }
                      },
                        h('div', null, btn.label),
                        h('div', { style: { fontSize: 7, opacity: 0.7, marginTop: 1, fontWeight: 500 } }, btn.desc)
                      );
                    })
                  ),
                  h('button', {
                    onClick: function() { upd({ gramStep: 0 }); },
                    style: { width: '100%', padding: 4, borderRadius: 4, background: 'rgba(148,163,184,0.1)', color: 'var(--allo-stem-text-soft, #94a3b8)', border: '1px solid rgba(148,163,184,0.2)', fontSize: 9, fontWeight: 700, cursor: 'pointer' }
                  }, __alloT('stem.microbiology.clear_smear', '↺ Clear Smear'))
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-deeper, #0a0e1a)', border: '1px solid #1e293b' } },
                  h('div', { style: { fontSize: 9, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: 2 } }, __alloT('stem.microbiology.stain_chemistry', 'Stain chemistry')),
                  h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.4 } },
                    step === 0 ? 'Select a reagent bottle to start the staining procedure on your heat-fixed slide smear.' : stepDescriptions[step - 1]
                  )
                )
              )
            )
          );
        }

        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            __alloT('stem.microbiology.bacteria_are_single_celled_organisms_w', 'Bacteria are single-celled organisms without a nucleus. There are roughly a trillion species; we have characterized only a few thousand. They come in shapes (cocci=spheres, bacilli=rods, spirilla=spirals), with cell wall types (gram-positive thick / gram-negative thin), and metabolic strategies (aerobic, anaerobic, fermenters, chemoautotrophs).')
          ),

          // CRISPR - bacterial immunity that became gene editing
          sectionCard('✂️ CRISPR - bacterial immunity that rewrote biology',
            (function() {
              var step = d.crisprStep || 'overview';
              var STEPS = [
                { id: 'overview', name: __alloT('stem.microbiology.what_it_is', 'What it is') },
                { id: 'immunity', name: __alloT('stem.microbiology.bacterial_immunity', 'Bacterial immunity') },
                { id: 'mechanism', name: __alloT('stem.microbiology.how_cas9_cuts', 'How Cas9 cuts') },
                { id: 'tool', name: __alloT('stem.microbiology.adapted_as_a_tool', 'Adapted as a tool') },
                { id: 'ethics', name: __alloT('stem.microbiology.ethics_frontier', 'Ethics + frontier') }
              ];
              var content = {
                overview: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                    __alloT('stem.microbiology.crispr_clustered_regularly_interspaced', 'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a bacterial immune system that scientists noticed in the 1990s, partially understood by 2007, and adapted as a programmable gene editor in 2012. It is the biggest revolution in molecular biology since PCR.')
                  ),
                  h('p', { style: { margin: 0, fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                    h('strong', { style: { color: '#6ee7b7' } }, __alloT('stem.microbiology.the_2020_nobel_prize_in_chemistry', 'The 2020 Nobel Prize in Chemistry ')),
                    __alloT('stem.microbiology.went_to_jennifer_doudna_uc_berkeley_an', 'went to Jennifer Doudna (UC Berkeley) and Emmanuelle Charpentier (Max Planck Institute) for showing that CRISPR-Cas9 could be programmed to cut any DNA sequence. The first all-female Nobel science laureate pair. Their 2012 paper is one of the most-cited biology papers of all time.')
                  )
                ),
                immunity: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                    __alloT('stem.microbiology.bacteria_have_always_been_under_attack', 'Bacteria have always been under attack from bacteriophages (viruses that infect bacteria) - there are about 10× as many phages as bacteria in any given habitat. CRISPR is a bacterial immune system that REMEMBERS past phage attacks and protects against future ones.')
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, __alloT('stem.microbiology.the_bacterial_crispr_cas_system_in_3_s', 'The bacterial CRISPR-Cas system in 3 stages:')),
                    h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
                      h('li', null, h('strong', null, __alloT('stem.microbiology.acquisition_the_memory', 'Acquisition (the memory): ')), __alloT('stem.microbiology.when_a_phage_injects_dna_cas_proteins_', 'When a phage injects DNA, Cas proteins clip a small piece of the invader\'s DNA and integrate it into the bacterium\'s own genome at a special locus called the CRISPR array. Each piece is a "spacer." The bacterium now carries a record of the attack.')),
                      h('li', null, h('strong', null, __alloT('stem.microbiology.expression_the_surveillance', 'Expression (the surveillance): ')), __alloT('stem.microbiology.the_crispr_array_gets_transcribed_into', 'The CRISPR array gets transcribed into RNA, then processed into short "guide RNAs" (crRNAs). Each crRNA matches one past invader. The crRNAs combine with Cas proteins to make patrol complexes scanning every DNA molecule in the cell.')),
                      h('li', null, h('strong', null, __alloT('stem.microbiology.interference_the_kill', 'Interference (the kill): ')), __alloT('stem.microbiology.if_a_guide_rna_finds_a_matching_sequen', 'If a guide RNA finds a matching sequence in invading DNA, the Cas protein cuts the DNA. The phage is destroyed before it can replicate. The bacterium survives the second attack.'))
                    )
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                    h('strong', null, __alloT('stem.microbiology.why_this_is_remarkable', 'Why this is remarkable: ')),
                    __alloT('stem.microbiology.bacteria_are_supposed_to_have_only_inn', 'Bacteria are SUPPOSED to have only "innate" immunity - fast, general, no memory. CRISPR is true ADAPTIVE immunity (specific, with memory) in a single-celled organism. It is the oldest adaptive immune system on Earth, evolving in microbes about 2.6 billion years before T cells + B cells did in vertebrates.')
                  )
                ),
                mechanism: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                    __alloT('stem.microbiology.cas9_crispr_associated_protein_9_is_th', 'Cas9 (CRISPR-associated protein 9) is the most famous bacterial CRISPR enzyme. It is a molecular machine that, when loaded with the right guide RNA, can find and cut any matching DNA sequence in the cell.')
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, __alloT('stem.microbiology.how_cas9_works_4_steps', 'How Cas9 works (4 steps):')),
                    h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
                      h('li', null, h('strong', null, 'Loading: '), __alloT('stem.microbiology.cas9_binds_a_guide_rna_the_guide_rna_h', 'Cas9 binds a guide RNA. The guide RNA has a ~20-nucleotide section matching the target sequence.')),
                      h('li', null, h('strong', null, 'Scanning: '), __alloT('stem.microbiology.the_cas9_grna_complex_scans_dna_it_fir', 'The Cas9 + gRNA complex scans DNA. It first looks for a short PAM sequence (typically "NGG") next to a potential target.')),
                      h('li', null, h('strong', null, 'Pairing: '), __alloT('stem.microbiology.when_it_finds_a_pam_it_tries_to_base_p', 'When it finds a PAM, it tries to base-pair the guide RNA with the adjacent DNA. If 20 bases match (or close to it), Cas9 commits.')),
                      h('li', null, h('strong', null, 'Cutting: '), __alloT('stem.microbiology.cas9_makes_a_double_strand_break_3_nuc', 'Cas9 makes a double-strand break ~3 nucleotides upstream of the PAM. The cell then tries to repair the break - either error-prone (knockout) or template-guided (precise edit). This is the molecular handle gene editing uses.'))
                    )
                  )
                ),
                tool: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                    __alloT('stem.microbiology.doudna_charpentier_showed_in_2012_that', 'Doudna + Charpentier showed in 2012 that you can swap the guide RNA for any sequence you want - turning a bacterial defense into a programmable gene editor. Order a synthetic guide RNA, mix with Cas9, deliver to cells. Cas9 will cut at your chosen location in the genome.')
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 } },
                    [
                      { name: __alloT('stem.microbiology.medicine', 'Medicine'), desc: __alloT('stem.microbiology.first_crispr_therapy_approved_dec_2023', 'First CRISPR therapy approved Dec 2023: Casgevy for sickle cell disease + beta-thalassemia. Edits bone-marrow cells to reactivate fetal hemoglobin. ~$2.2 million per patient. Many more in trials: muscular dystrophy, cancer immunotherapies (CAR-T), genetic blindness.') },
                      { name: __alloT('stem.microbiology.agriculture', 'Agriculture'), desc: __alloT('stem.microbiology.crispr_edited_mushrooms_that_don_t_bro', 'CRISPR-edited mushrooms that don\'t brown. Disease-resistant rice. Hornless dairy cattle. Drought-tolerant maize. Considered "non-GMO" in some jurisdictions because no foreign DNA is added - just precise edits to native DNA.') },
                      { name: __alloT('stem.microbiology.diagnostics', 'Diagnostics'), desc: __alloT('stem.microbiology.sherlock_detectr_crispr_based_diagnost', 'SHERLOCK + DETECTR: CRISPR-based diagnostic tests that detect specific DNA or RNA sequences from pathogens within an hour. Used for COVID, Zika, dengue, Lassa. Pocket-sized + low-cost.') },
                      { name: __alloT('stem.microbiology.basic_research', 'Basic research'), desc: __alloT('stem.microbiology.knocking_out_a_gene_used_to_take_a_gra', 'Knocking out a gene used to take a graduate student\'s entire PhD. With CRISPR it takes a week. Functional studies of every gene in the human genome are now feasible. Most biology labs in the world use CRISPR daily.') }
                    ].map(function(a, i) {
                      return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + EMERALD } },
                        h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#6ee7b7', marginBottom: 4 } }, a.name),
                        h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, a.desc)
                      );
                    })
                  )
                ),
                ethics: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                    __alloT('stem.microbiology.crispr_makes_things_easy_that_used_to_', 'CRISPR makes things easy that used to be hard. That includes things we may not want to do.')
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', borderTop: '1px solid rgba(220,38,38,0.35)', borderRight: '1px solid rgba(220,38,38,0.35)', borderBottom: '1px solid rgba(220,38,38,0.35)', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, __alloT('stem.microbiology.he_jiankui_2018_the_first_edited_human', 'He Jiankui (2018): the first edited human babies')),
                    h('p', { style: { margin: 0, fontSize: 12, color: '#fee2e2', lineHeight: 1.65 } },
                      __alloT('stem.microbiology.a_chinese_researcher_used_crispr_to_ed', 'A Chinese researcher used CRISPR to edit twin embryos (knocking out the CCR5 gene to try to confer HIV resistance) and bring them to term in 2018. The international scientific community condemned the work as deeply unethical: no medical need, no informed consent that could meet the bar, no way to ensure no off-target edits, no plan for the lifetime of the twins. He was sentenced to 3 years in prison. The case prompted broad agreement that germline editing (changes that pass to future generations) is not currently ethically defensible.')
                    )
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', borderTop: '1px solid rgba(245,158,11,0.35)', borderRight: '1px solid rgba(245,158,11,0.35)', borderBottom: '1px solid rgba(245,158,11,0.35)', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#fbbf24', marginBottom: 6 } }, __alloT('stem.microbiology.somatic_vs_germline_editing', 'Somatic vs germline editing')),
                    h('p', { style: { margin: 0, fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65 } },
                      __alloT('stem.microbiology.somatic_editing_changes_dna_in_body_ce', 'SOMATIC editing changes DNA in body cells of a living person. The edits affect that person only; not their children. (Casgevy for sickle cell is somatic.) GERMLINE editing changes DNA in sperm, eggs, or embryos. The edits pass to every cell of the resulting person AND to their descendants. The scientific consensus is: somatic editing is ethically OK for treating disease; germline editing is not currently OK because we cannot anticipate the consequences across generations.')
                    )
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.35)', borderRight: '1px solid rgba(168,85,247,0.35)', borderBottom: '1px solid rgba(168,85,247,0.35)', borderLeft: '3px solid #a855f7' } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#d8b4fe', marginBottom: 6 } }, __alloT('stem.microbiology.gene_drives', 'Gene drives')),
                    h('p', { style: { margin: 0, fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                      __alloT('stem.microbiology.crispr_based_gene_drives_can_spread_a_', 'CRISPR-based gene drives can spread a gene through a wild population in a few generations, even if the gene reduces fitness. Proposed uses: eradicate malaria-carrying mosquitoes; eliminate invasive species. Risk: once released, hard or impossible to undo. International conversations are ongoing about whether + how to ever deploy a gene drive in the wild.')
                    )
                  )
                )
              };

              return h('div', null,
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  STEPS.map(function(s) {
                    var active = step === s.id;
                    return h('button', { key: s.id,
                      onClick: function() { upd({ crisprStep: s.id }); },
                      style: { padding: '6px 12px', borderRadius: 8, background: active ? 'rgba(16,185,129,0.25)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), color: active ? '#6ee7b7' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, s.name);
                  })
                ),
                content[step],
                h('div', { style: { marginTop: 14, padding: 12, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px dashed rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' } },
                  h('div', { style: { flex: 1, minWidth: 200 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 2 } }, __alloT('stem.microbiology.interactive_crispr_gene_editor', '🔬 Interactive CRISPR Gene Editor')),
                    h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.4 } }, __alloT('stem.microbiology.ready_to_perform_a_real_gene_edit_use_', 'Ready to perform a real gene edit? Use the full molecular editor in our DNA Lab to scan, find target PAM sites, and apply precise cuts and repairs.'))
                  ),
                  h('button', {
                    onClick: function() {
                      if (ctx.setStemLabTool) {
                        ctx.setStemLabTool('dnaLab');
                        if (ctx.setStemLabTab) {
                          ctx.setStemLabTab('explore');
                        }
                        ctx.setToolData(function(prev) {
                          var dnaState = Object.assign({}, (prev && prev.dnaLab) || {});
                          dnaState.tab = 'crispr';
                          return Object.assign({}, prev, { dnaLab: dnaState });
                        });
                        if (ctx.addToast) {
                          ctx.addToast('✂️ Switched to DNA Lab CRISPR Gene Editor', 'success');
                        }
                      }
                    },
                    style: { padding: '8px 14px', borderRadius: 6, background: '#10b981', color: '#0f172a', border: 'none', fontSize: 11, fontWeight: 800, cursor: 'pointer', transition: 'all 0.15s ease' }
                  }, __alloT('stem.microbiology.go_to_crispr_editor', 'Go to CRISPR Editor →'))
                )
              );
            })(),
            EMERALD
          ),

          // Gram stain visualizer
          sectionCard('🟣 Gram stain - the foundational microbiology test',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.developed_by_hans_christian_gram_in_18', 'Developed by Hans Christian Gram in 1884. Still the first test run on most clinical bacterial samples - within hours of a culture growing. Splits bacteria into two groups by their cell-wall structure. The choice of antibiotic depends partly on whether the bacterium is Gram-positive or Gram-negative.')
              ),
              interactiveGramStain(),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 6 } }, __alloT('stem.microbiology.the_4_step_procedure_3_minutes', 'The 4-step procedure (~3 minutes):')),
                h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                  h('li', null, h('strong', null, __alloT('stem.microbiology.crystal_violet_2', 'Crystal violet ')), __alloT('stem.microbiology.purple_primary_stain_soaks_all_bacteri', '(purple primary stain) - soaks all bacteria, all turn purple.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.iodine_2', 'Iodine ')), __alloT('stem.microbiology.mordant_locks_crystal_violet_onto_the_', '(mordant) - locks crystal violet onto the cell.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.alcohol_or_acetone', 'Alcohol or acetone ')), __alloT('stem.microbiology.decolorizer_3_seconds_the_critical_ste', '(decolorizer, ~3 seconds) - the critical step. Gram-positive cells with thick peptidoglycan TRAP the dye. Gram-negative cells with thin peptidoglycan + outer membrane RELEASE the dye and become colorless.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.safranin_2', 'Safranin ')), __alloT('stem.microbiology.pink_counterstain_recolors_the_now_col', '(pink counterstain) - recolors the now-colorless Gram-negative cells pink. Gram-positives stay purple.'))
                )
              ),
              h('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', marginBottom: 8 } }, __alloT('stem.microbiology.cell_wall_macromolecular_structure_ref', 'Cell wall macromolecular structure reference:')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 } },
                gramSvg('positive'),
                gramSvg('negative')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(124,58,237,0.10)', borderLeft: '3px solid #7c3aed' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#c4b5fd', marginBottom: 4 } }, __alloT('stem.microbiology.gram_positive_examples', 'Gram-positive examples')),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, __alloT('stem.microbiology.staphylococcus_aureus_incl_mrsa_strept', 'Staphylococcus aureus (incl. MRSA), Streptococcus pneumoniae, Streptococcus pyogenes (strep throat), Bacillus anthracis (anthrax), Clostridium difficile, C. tetani, C. botulinum, Listeria, Enterococcus.')),
                  h('div', { style: { fontSize: 11, color: '#a78bfa', marginTop: 6, fontStyle: 'italic' } }, __alloT('stem.microbiology.generally_susceptible_to_penicillin_va', 'Generally susceptible to: penicillin, vancomycin (last-line), cephalosporins.'))
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(236,72,153,0.10)', borderLeft: '3px solid #ec4899' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbcfe8', marginBottom: 4 } }, __alloT('stem.microbiology.gram_negative_examples', 'Gram-negative examples')),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, __alloT('stem.microbiology.e_coli_salmonella_klebsiella_pseudomon', 'E. coli, Salmonella, Klebsiella, Pseudomonas aeruginosa, Vibrio (cholera + Maine shellfish Vibrios), Helicobacter pylori (ulcers), Neisseria gonorrhoeae + meningitidis, Haemophilus influenzae.')),
                  h('div', { style: { fontSize: 11, color: '#ec4899', marginTop: 6, fontStyle: 'italic' } }, __alloT('stem.microbiology.generally_tougher_to_treat_outer_membr', 'Generally tougher to treat - outer membrane blocks many antibiotics. Often need fluoroquinolones, aminoglycosides, or specific β-lactams that penetrate the outer membrane.'))
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.6 } },
                h('strong', null, __alloT('stem.microbiology.why_this_matters_clinically', 'Why this matters clinically: ')),
                __alloT('stem.microbiology.a_sample_of_urine_blood_sputum_or_csf_', 'A sample of urine, blood, sputum, or CSF can be Gram-stained in 3 minutes. The result alone narrows the field of suspected pathogens dramatically. Empirical antibiotic therapy (started before full identification) is chosen partly based on the Gram result. Endotoxin (the LPS on Gram-negative cells) is a major driver of septic shock - a Gram-negative bloodstream infection is medically more dangerous in some ways than a Gram-positive one.')
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #475569)', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55, fontStyle: 'italic' } },
                h('strong', null, __alloT('stem.microbiology.a_few_exceptions', 'A few exceptions: ')),
                __alloT('stem.microbiology.mycobacterium_tuberculosis_tb_has_a_wa', 'Mycobacterium tuberculosis (TB) has a waxy mycolic-acid cell wall that resists Gram staining; it requires acid-fast staining (Ziehl-Neelsen). Mycoplasma have NO cell wall at all and stain neither way. Some bacteria are "Gram-variable" - they stain inconsistently because their cell walls are atypical.')
              )
            ),
            '#7c3aed'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
            BACTERIA.map(function(b) {
              var active = d.selectedBacterium === b.id;
              return h('button', { key: b.id,
                onClick: function() { upd({ selectedBacterium: b.id }); },
                'aria-label': b.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), cursor: 'pointer', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, b.name),
                h('div', { style: { fontSize: 10, color: roleColor[b.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, roleLabel[b.role] || b.role)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + (roleColor[selected.role] || EMERALD) } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 12 } }, 'Shape: ' + selected.shape + ' · ', h('span', { style: { color: roleColor[selected.role], fontWeight: 700, textTransform: 'uppercase' } }, roleLabel[selected.role])),
            infoBlock('Where', selected.where, '#94a3b8'),
            infoBlock('What it does', selected.what, EMERALD),
            infoBlock('Science note', selected.sciFact, '#38bdf8'),
            renderMicroscopeLink('bacteria', selected.id)
          )
        );
        function infoBlock(title, body, color) {
          return h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid ' + color, marginBottom: 8 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, title),
            h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, body)
          );
        }
      }

      // VIRUSES
      function renderViruses() {
        var selected = VIRUSES.find(function(v) { return v.id === d.selectedVirus; }) || VIRUSES[0];
        var TRANSMISSION = [
          {
            id: 'airborne', name: __alloT('stem.microbiology.airborne_respiratory', 'Airborne / respiratory'), color: '#0ea5e9', icon: '💨',
            how: 'Tiny droplets + aerosols expelled when you breathe, talk, cough, sneeze. Hang in the air for minutes to hours. Inhaled by others.',
            examples: 'Measles (R₀ 12-18, the most contagious common infection), COVID-19, influenza, tuberculosis, RSV, common cold.',
            prevent: 'Ventilation + air filtration (HEPA, MERV-13+). Masks (N95 > surgical > cloth). Vaccination. Distance helps for droplets but matters less for aerosols (which fill the room).'
          },
          {
            id: 'fecaloral', name: 'Fecal-oral', color: '#a16207', icon: '🚽',
            how: 'Pathogen in stool of an infected person → contaminates water, food, surfaces, hands → ingested by another person. Often involves inadequate sanitation OR handwashing.',
            examples: 'Cholera, hepatitis A, rotavirus, norovirus (cruise-ship + nursing-home outbreaks), Salmonella, E. coli O157:H7, Giardia, Shigella, polio.',
            prevent: 'Handwashing with soap + water (the single highest-yield public-health intervention in history). Clean drinking water. Safe sewage disposal. Cook food thoroughly. Pasteurize milk + juice.'
          },
          {
            id: 'vector', name: 'Vector-borne', color: '#dc2626', icon: '🦟',
            how: 'An insect, tick, or other animal carries the pathogen between hosts. The vector is itself an essential part of the pathogen\'s life cycle.',
            examples: 'Malaria + dengue + Zika + West Nile + chikungunya + yellow fever (mosquitoes). Lyme + Anaplasma + Babesia (Maine ticks). Plague (fleas, historically). Trypanosomiasis / Chagas (kissing bugs). Eastern Equine Encephalitis (mosquitoes; Maine has cases).',
            prevent: 'Reduce vector populations (drain standing water, environmental management). Personal protection (DEET, picaridin, permethrin clothing, long sleeves at dusk). Bed nets in malaria zones. Tick checks. Vaccination where available (yellow fever, dengue in some places).'
          },
          {
            id: 'blood', name: __alloT('stem.microbiology.bloodborne', 'Bloodborne'), color: '#7f1d1d', icon: '🩸',
            how: 'Pathogen in blood of an infected person enters another person\'s bloodstream. Needle reuse, transfusion of contaminated blood, mother-to-baby at birth, occupational needle-sticks.',
            examples: 'HIV, hepatitis B, hepatitis C, syphilis (also sexual + congenital), some hemorrhagic fevers (Ebola via close contact with blood/body fluids).',
            prevent: 'Universal precautions (treat every blood as potentially infectious). Single-use needles + syringes. Blood-bank screening (mandatory testing for HIV, HBV, HCV since the 1980s-90s). Hepatitis B vaccination. PrEP (pre-exposure prophylaxis) for HIV.'
          },
          {
            id: 'sexual', name: __alloT('stem.microbiology.sexual_sti', 'Sexual (STI)'), color: '#ec4899', icon: '💞',
            how: 'Direct mucous-membrane or genital-skin contact during sexual activity. Pathogens that thrive in warm moist mucosal surfaces.',
            examples: 'HIV, gonorrhea, chlamydia, syphilis, herpes (HSV), HPV (linked to cervical + throat cancer), trichomoniasis, hepatitis B.',
            prevent: 'Condoms (reduce most STIs substantially but not 100% for those spread by skin contact like HPV + HSV). Vaccination (HPV, hepatitis B). Regular screening if sexually active. PrEP for HIV. Treatment of partners.'
          },
          {
            id: 'contact', name: __alloT('stem.microbiology.direct_indirect_contact', 'Direct + indirect contact'), color: '#f59e0b', icon: '🤝',
            how: 'Skin-to-skin contact, or contact with contaminated surfaces (fomites) like doorknobs, phones, towels. The pathogen survives outside the body long enough to transmit on touch.',
            examples: 'MRSA (skin-to-skin in athletes, healthcare), scabies, lice, ringworm + athlete\'s foot (fungal), warts (HPV), conjunctivitis ("pink eye"), some common-cold viruses (rhinovirus survives on surfaces).',
            prevent: 'Handwashing. Don\'t share towels or razors. Clean shared surfaces. Cover open wounds. Treat the source.'
          },
          {
            id: 'vertical', name: __alloT('stem.microbiology.vertical_mother_child', 'Vertical (mother → child)'), color: '#a855f7', icon: '🤰',
            how: 'Pathogen crosses the placenta, infects during delivery, or transmits in breast milk.',
            examples: 'HIV (without treatment ~25% transmission; with antiretrovirals + C-section + formula feeding, <1%). Syphilis (TORCH infections). Cytomegalovirus, rubella, toxoplasmosis. Hepatitis B.',
            prevent: 'Prenatal screening for all the TORCH pathogens. Antiretrovirals during pregnancy for HIV+ mothers (drops transmission to <1%). Hepatitis B vaccine + immunoglobulin to babies born to infected mothers within 12 hours of birth. Rubella vaccination before pregnancy.'
          },
          {
            id: 'zoonotic', name: __alloT('stem.microbiology.zoonotic_animal_human', 'Zoonotic (animal → human)'), color: '#16a34a', icon: '🦇',
            how: 'A pathogen normally living in an animal jumps to humans. May or may not then spread human-to-human. Most new emerging human diseases are zoonoses.',
            examples: 'COVID-19 (probably bat → intermediate host → human). HIV (chimps → humans, early 20th c.). Ebola (bats). Rabies (any mammal). Plague (rodents → fleas → humans). Avian flu (birds). Salmonella (chickens, reptiles). Anthrax (livestock).',
            prevent: 'Wildlife habitat protection (less wildlife stress = less spillover). Surveillance of animal pathogens. Personal protection in occupational settings (veterinarians, wildlife biologists, slaughterhouse workers). Vaccinate pets (rabies). Keep wild animals wild.'
          }
        ];
        var selT = TRANSMISSION.find(function(t) { return t.id === d.selectedTransmission; }) || TRANSMISSION[0];

        return h('div', { style: { padding: 16 } },
          sectionCard('What viruses are (and are not)',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
              __alloT('stem.microbiology.viruses_are_not_cells_they_have_no_met', 'Viruses are NOT cells. They have no metabolism of their own. They are genetic material (DNA or RNA) wrapped in a protein coat (capsid), sometimes with a lipid envelope. They reproduce only by entering a host cell and hijacking its machinery to make copies of themselves. Most biologists do not classify them as alive - though they certainly behave like life when inside a cell.')
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 14 } },
            VIRUSES.map(function(v) {
              var active = d.selectedVirus === v.id;
              return h('button', { key: v.id,
                onClick: function() { upd({ selectedVirus: v.id }); },
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), cursor: 'pointer', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800 } }, v.name)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)' } },
            h('h3', { style: { margin: '0 0 8px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 10 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)' } },
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase' } }, __alloT('stem.microbiology.genome', 'Genome')),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)' } }, selected.genome)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)' } },
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase' } }, __alloT('stem.microbiology.hosts', 'Hosts')),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)' } }, selected.hosts)
              )
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } },
              h('strong', { style: { color: '#6ee7b7' } }, 'Structure: '), selected.structure
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.story', 'Story')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.story)
            ),
            renderMicroscopeLink('viruses', selected.id)
          ),

          // Disease transmission modes - applies to viruses + bacteria + parasites
          sectionCard('🦠 How infectious diseases spread - 8 transmission modes',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.public_health_is_largely_about_interru', 'Public health is largely about interrupting transmission. Different pathogens spread through different routes; the same pathogen may use more than one. Knowing the route(s) for a given disease tells you the highest-yield prevention strategy.')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                TRANSMISSION.map(function(t) {
                  var active = (d.selectedTransmission || 'airborne') === t.id;
                  return h('button', { key: t.id,
                    onClick: function() { upd({ selectedTransmission: t.id }); },
                    style: { padding: '8px 12px', borderRadius: 8, background: active ? t.color + '33' : '#1e293b', border: '1px solid ' + (active ? t.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                  }, t.icon + ' ' + t.name);
                })
              ),
              h('div', { style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + selT.color } },
                h('div', { style: { fontSize: 15, fontWeight: 800, color: selT.color, marginBottom: 8 } }, selT.icon + ' ' + selT.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.how_it_spreads', 'How it spreads')),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.how)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.examples', 'Examples')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.examples)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.prevention', 'Prevention')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.prevent)
                )
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.r_the_basic_reproduction_number', 'R₀: the basic reproduction number. ')),
                __alloT('stem.microbiology.how_many_new_infections_one_infected_p', 'How many new infections one infected person causes in a fully-susceptible population, on average. Measles ~12-18 (extremely high). Smallpox ~5-7. Original COVID-19 ~2-3 (with Omicron variants 8+). Ebola ~1.5-2.5. Flu ~1.3. R₀ < 1 means the outbreak dies out. R₀ > 1 means it grows. Public health interventions (vaccination, masks, sanitation, vector control) reduce the EFFECTIVE R below R₀.')
              )
            ),
            '#0ea5e9'
          ),

          // ─── Prions + neurodegenerative disease ──────────────────
          sectionCard('🧬 Prions - proteins that infect',
            (function() {
              var PRION_TOPICS = [
                { id: 'what', name: __alloT('stem.microbiology.what_a_prion_is', 'What a prion is'), emoji: '🧩',
                  body: __alloT('stem.microbiology.a_prion_is_a_protein_that_has_folded_i', 'A prion is a protein that has folded into a wrong shape - and which can convert other copies of the same protein in the brain into that same wrong shape. There is no DNA or RNA involved. No replication of a genome. A misfolded protein meets a normally-folded protein, and the misfolded shape spreads. Stanley Prusiner proposed this in 1982, faced ~15 years of strong skepticism (a "protein-only" infectious agent contradicted the central dogma of molecular biology), and was awarded the Nobel Prize in 1997 once the evidence became overwhelming.'),
                  caveat: 'Calling prions "infectious" requires a careful definition. They do not reproduce themselves like a microbe. They CATALYZE the misfolding of host proteins. The result looks infectious - a small dose can grow into a brain full of misfolded protein - but the mechanism is fundamentally different from any other known pathogen.'
                },
                { id: 'shape', name: __alloT('stem.microbiology.prp_c_vs_prp_sc_the_shape_switch', 'PrP^C vs PrP^Sc (the shape switch)'), emoji: '🔀',
                  body: __alloT('stem.microbiology.the_prion_protein_prp_is_a_normal_cell', 'The prion protein, PrP, is a normal cellular protein found especially in neurons (its normal function is still poorly understood - possibly copper binding, synapse maintenance, myelin integrity). The healthy form PrP^C (cellular) is mostly α-helix. The disease form PrP^Sc (scrapie, named for the first known prion disease in sheep) is mostly β-sheet. When PrP^Sc contacts PrP^C, it forces it to refold into the β-sheet shape. β-sheet rich proteins aggregate into amyloid fibrils - sticky, insoluble plaques that resist all normal cellular degradation machinery.'),
                  caveat: 'The β-sheet/aggregation theme connects prion disease to a much larger family of "protein misfolding" diseases (Alzheimer\'s amyloid-β, Parkinson\'s α-synuclein, Huntington\'s mutant huntingtin, ALS TDP-43 + SOD1). The mechanism of aggregation is similar; whether non-prion diseases are TRULY transmissible in the prion sense is still debated.'
                },
                { id: 'cjd', name: __alloT('stem.microbiology.creutzfeldt_jakob_disease', 'Creutzfeldt-Jakob disease'), emoji: '🧠',
                  body: __alloT('stem.microbiology.cjd_is_the_most_common_human_prion_dis', 'CJD is the most common human prion disease, affecting ~1 in 1,000,000 people per year worldwide. Three categories: sporadic CJD (sCJD, ~85% of cases - no known cause, may be a spontaneous misfolding event); familial/genetic CJD (~10-15%, mutations in the PRNP gene); and acquired CJD (<1% - iatrogenic from contaminated surgical instruments or hormone preparations, or variant CJD from BSE-contaminated beef). Symptoms: rapidly progressive dementia, myoclonus (involuntary jerks), ataxia, visual disturbances. Median survival from first symptom is about 4-5 months. There is no treatment that alters disease course.'),
                  caveat: 'Prion-contaminated surgical instruments are a real concern because standard sterilization (autoclaving at 121°C) does NOT destroy prions. Specialized protocols require autoclaving at 134°C combined with 1 M NaOH soak. Single-use disposable instruments are now standard for any neurosurgery on a suspected CJD patient.'
                },
                { id: 'bse', name: __alloT('stem.microbiology.bse_vcjd_the_mad_cow_outbreak', 'BSE + vCJD (the mad cow outbreak)'), emoji: '🐄',
                  body: __alloT('stem.microbiology.bovine_spongiform_encephalopathy_bse_m', 'Bovine Spongiform Encephalopathy (BSE, "mad cow disease") emerged in UK cattle in the 1980s. The likely origin: rendering practices that fed protein supplements made from sheep/cattle byproducts (including nervous-system tissue) back to cattle, recycling the prion. ~200,000+ cattle developed clinical BSE; an estimated several million were exposed. The UK eventually banned the practice, slaughtered millions of cattle, and reformed the feed chain. Variant CJD in humans (vCJD) emerged in 1996, traced to consumption of BSE-contaminated beef. ~178 confirmed cases in the UK to date (deaths peaked 2000). Far less than the worst-case projections of the early 2000s, but a real and ongoing concern.'),
                  caveat: 'vCJD has an incubation period that may exceed 50 years. Blood transfusion from infected donors has transmitted vCJD in at least 4 documented cases (UK). Several countries still impose blood-donation restrictions on people who lived in the UK during the 1980s-90s outbreak years.'
                },
                { id: 'kuru', name: __alloT('stem.microbiology.kuru_the_laughing_death', 'Kuru - the laughing death'), emoji: '🌿',
                  body: __alloT('stem.microbiology.kuru_was_a_prion_disease_epidemic_in_t', 'Kuru was a prion disease epidemic in the Fore people of Papua New Guinea, peaking in the 1950s. Symptoms included tremor, ataxia, dementia, and a characteristic uncontrolled laughter near death (the name comes from a Fore word for "trembling with fear or cold"). Carleton Gajdusek + colleagues traced transmission to a traditional mortuary practice in which (primarily) women and children consumed parts of deceased relatives, including brain tissue, as an act of respect and grief. Once that practice ended (by ~1960), new cases stopped appearing in the next generation. Gajdusek shared the 1976 Nobel for the demonstration that prion disease was transmissible.'),
                  caveat: 'The Fore people had no concept of "prion" or "contamination." The mortuary practice was a meaningful cultural act of love. Discussions of kuru should be respectful of that context, not exoticized. The legacy: kuru ALSO showed that genetic variants of PRNP (codon 129 heterozygotes) confer partial protection - evolutionary selection in action.'
                },
                { id: 'alzheimers', name: __alloT('stem.microbiology.alzheimer_s_prion_like', 'Alzheimer\'s - prion-LIKE?'), emoji: '🌫️',
                  body: __alloT('stem.microbiology.alzheimer_s_disease_ad_involves_two_pr', 'Alzheimer\'s disease (AD) involves two protein aggregates: extracellular amyloid-β plaques and intracellular tau tangles. Both spread through the brain in stereotyped patterns (Braak staging for tau). Laboratory experiments have shown that injecting brain extract from AD patients into mice can SEED amyloid-β plaques in the mouse brain. This led to debate: is AD "prion-like"? Most researchers say yes in terms of the molecular mechanism (templated misfolding + seeding + spread), but NO in the sense of person-to-person transmission. No epidemiological evidence supports natural transmission of AD. Some iatrogenic cases (human growth hormone from cadaveric pituitaries, ~1958-1985) have shown amyloid-β seeding decades later in patients who otherwise should not have it.'),
                  caveat: 'AD is multifactorial: aging, APOE-ε4 genotype, vascular health, sleep, cardiovascular disease, inflammation, and many other contributors. The "prion-like" framing is mechanistically illuminating but should not panic anyone. AD is not contagious in any everyday sense - kissing, sharing meals, caregiving are entirely safe. The iatrogenic concern is limited to neurosurgical instruments and certain biologic products.'
                },
                { id: 'parkinson', name: __alloT('stem.microbiology.parkinson_s_synuclein_spread', 'Parkinson\'s + α-synuclein spread'), emoji: '🌀',
                  body: __alloT('stem.microbiology.parkinson_s_disease_pd_involves_aggreg', 'Parkinson\'s disease (PD) involves aggregation of α-synuclein protein into Lewy bodies, beginning in the brainstem (sometimes peripherally in the gut) and spreading through the brain in a stereotyped pattern over years. Heiko Braak proposed (2003) that PD pathology may even ORIGIN in the gut + olfactory bulb and travel up the vagus nerve to the brainstem. Vagotomy (surgical cutting of the vagus nerve) appears to slightly reduce PD risk in epidemiological studies - supportive but not definitive. Like AD, α-synuclein behaves "prion-like" in lab models (seeded aggregation, templated spread) but is not naturally transmissible person-to-person.'),
                  caveat: 'The "gut-first" PD hypothesis is being actively investigated. It is NOT yet established. What is established: PD is closely linked to enteric nervous system disease (constipation often appears years before motor symptoms). This is a hot research area; expect framings to shift over the next decade.'
                },
                { id: 'detection', name: __alloT('stem.microbiology.detection_research', 'Detection + research'), emoji: '🔬',
                  body: __alloT('stem.microbiology.new_ultrasensitive_assays_rt_quic_real', 'New ultrasensitive assays (RT-QuIC, real-time quaking-induced conversion; PMCA, protein misfolding cyclic amplification) can detect tiny amounts of prion seeds in cerebrospinal fluid, nasal brushings, or even skin biopsies. This has revolutionized antemortem diagnosis of CJD and is being adapted for α-synuclein in PD + Lewy body dementia (SAA, seed amplification assay). For the first time, neurodegenerative diseases can be detected biochemically before the brain is destroyed. Therapeutic strategies under investigation: antibodies (lecanemab + donanemab now approved for early AD), antisense oligonucleotides (e.g., tofersen for SOD1-ALS), small molecules that stabilize the native fold, vaccines.'),
                  caveat: 'Anti-amyloid antibodies for AD produced modest clinical-trial benefit, real but small (about a 5-month delay in cognitive decline over 18 months) and with significant brain-bleed risks. They are not a cure. They are the first disease-modifying treatments to clear FDA review for AD - important as proof that the amyloid pathway CAN be modified, less certain as treatments that change patients\' lives in major ways.'
                }
              ];
              var sel = d.selectedPrion || 'what';
              var topic = PRION_TOPICS.find(function(t) { return t.id === sel; }) || PRION_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.prions_sit_at_a_strange_boundary_they_', 'Prions sit at a strange boundary. They are not alive. They have no genome. Yet they spread through tissue, cause progressive fatal disease, and can be transmitted by surgery, transfusion, or (rarely) dietary exposure. They also illuminate something larger: a whole class of "protein misfolding" diseases, including the most common neurodegenerative conditions, may share the same fundamental mechanism - proteins teaching other proteins to fold wrong.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  PRION_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedPrion: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#10b981' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #10b981' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#6ee7b7', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.what_we_should_not_overstate', 'What we should not overstate: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_bigger_pattern', 'The bigger pattern: ')),
                  __alloT('stem.microbiology.proteins_fold_into_shapes_determined_b', 'Proteins fold into shapes determined by their amino-acid sequence. When that folding goes wrong, even slightly, the consequences can be catastrophic. Prions are the extreme case (one misfolded protein can convert thousands of others). The same biophysics, in milder form, may underlie much of what kills humans late in life - Alzheimer\'s, Parkinson\'s, Huntington\'s, ALS. Understanding prions is not a niche curiosity; it is foundational to one of the largest health challenges of an aging world.')
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, color: '#fca5a5', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.a_note_on_hope_vs_hype', 'A note on hope vs hype: ')),
                  __alloT('stem.microbiology.anti_amyloid_antibodies_for_alzheimer_', 'Anti-amyloid antibodies for Alzheimer\'s are real progress AND have real limits. Calling them either "a cure" or "a scam" is wrong. They are the first treatments that modify disease biology, with modest effect sizes, real side effects, and high cost. For people with a parent or grandparent affected by AD, this is genuine forward motion - but not yet the breakthrough family caregivers most need.')
                )
              );
            })(),
            '#10b981'
          )
        );
      }

      // FUNGI
      function renderFungi() {
        var selected = (d.selectedFungus && FUNGI.find(function(f) { return f.id === d.selectedFungus; })) || FUNGI[0];
        var roleColor = { beneficial: '#22c55e', 'mostly-beneficial': '#86efac', varies: '#f59e0b', pathogenic: '#ef4444', 'pathogenic (with medical descendants)': '#a855f7' };
        return h('div', { style: { padding: 16 } },
          sectionCard('🍄 Fungi are not plants',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 8px' } }, __alloT('stem.microbiology.fungi_are_eukaryotes_cells_with_nuclei', 'Fungi are eukaryotes (cells with nuclei) - like us, but in their own kingdom. Genetically, fungi are closer to animals than to plants. They have cell walls made of chitin (the same stuff as insect exoskeletons), not cellulose like plants. They cannot photosynthesize. They digest their food externally, releasing enzymes into the environment and absorbing the dissolved nutrients.')),
              h('p', { style: { margin: 0 } }, __alloT('stem.microbiology.most_fungi_are_filamentous_multicellul', 'Most fungi are filamentous (multicellular): a tangled mass of thread-like cells (hyphae) forming a network (mycelium). Mushrooms are just the reproductive parts - most of the fungus lives underground. Yeasts are the exception: single-celled fungi.'))
            ),
            '#a855f7'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
            FUNGI.map(function(f) {
              var active = (d.selectedFungus || FUNGI[0].id) === f.id;
              return h('button', { key: f.id,
                onClick: function() { upd({ selectedFungus: f.id }); },
                'aria-label': f.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(168,85,247,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#a855f7' : '#334155'), cursor: 'pointer', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, f.name),
                h('div', { style: { fontSize: 10, color: roleColor[f.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, f.role)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + (roleColor[selected.role] || '#a855f7') } },
            h('h3', { style: { margin: '0 0 4px', color: '#d8b4fe', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 12 } }, 'Kind: ' + selected.kind + ' · ', h('span', { style: { color: roleColor[selected.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, selected.role)),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #94a3b8', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.where', 'Where')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.where)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.what_it_does', 'What it does')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.what)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.science_note', 'Science note')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.sciFact)
            ),
            renderMicroscopeLink('fungi', selected.id)
          ),
          emergingFungalSection()
        );

        function emergingFungalSection() {
          var FUNGI_TOPICS = [
            { id: 'whyrising', name: __alloT('stem.microbiology.why_fungal_infections_are_rising', 'Why fungal infections are rising'), emoji: '📈',
              body: __alloT('stem.microbiology.invasive_fungal_infections_have_grown_', 'Invasive fungal infections have grown into one of the most concerning emerging health threats of the past 20 years. The WHO published its first-ever "fungal priority pathogens list" in 2022, naming 19 species (most people had never heard of any of them). Reasons for the rise: (1) Growing populations of immunocompromised patients - chemotherapy, organ transplants, HIV, biologic immunosuppressants, autoimmune medications, ICU stays - all create hosts where opportunistic fungi can thrive. (2) Climate change - some fungi adapted to mammalian body temperature only because warming environments selected for heat-tolerant strains (the Candida auris hypothesis). (3) Antifungal resistance - agricultural azole use selects for resistant Aspergillus + others. (4) COVID-19 collateral damage - mucormycosis, "black fungus," exploded in India during the 2021 COVID wave among diabetic patients on steroids.'),
              caveat: 'Most fungal exposure is harmless. Healthy immune systems clear nearly all opportunistic fungal exposures. The rise is real but the absolute numbers (a few hundred thousand serious infections per year globally) are dwarfed by bacterial + viral disease. The concern is the trajectory + the high mortality (often 30-60%) when serious fungal infections DO occur.'
            },
            { id: 'cauris', name: __alloT('stem.microbiology.candida_auris_the_new_superbug', 'Candida auris - the new superbug'), emoji: '🚨',
              body: __alloT('stem.microbiology.candida_auris_was_first_identified_in_', 'Candida auris was first identified in 2009 (Japan, ear canal of an elderly patient). It then appeared independently on four continents within a few years - suggesting parallel emergence rather than a single source spreading. C. auris is unusually resistant (often multidrug-resistant to all three major antifungal classes), persists on surfaces for weeks (unlike most Candida), causes outbreaks in healthcare facilities, and has 30-60% mortality in invasive cases. CDC declared it an "urgent threat" in 2019 + reported that US cases tripled from 2019 to 2021 (~3,000+ cases) + continued rising through 2024. Standard cleaning chemicals do not kill it reliably; hospitals need bleach-based or hydrogen-peroxide-based disinfectants applied specifically.'),
              caveat: 'The leading hypothesis for C. auris\'s simultaneous global emergence: climate warming. Most fungal species cannot grow at human body temperature (one of our innate defenses - mammals are too hot for most fungi). C. auris may have evolved heat tolerance recently in response to environmental warming, then jumped to colonizing humans. Arturo Casadevall + colleagues (Johns Hopkins) have made this argument most strongly; it is not yet proven but is gaining acceptance.'
            },
            { id: 'aspergillus', name: __alloT('stem.microbiology.aspergillus_agricultural_resistance', 'Aspergillus + agricultural resistance'), emoji: '🌾',
              body: __alloT('stem.microbiology.aspergillus_fumigatus_is_a_common_soil', 'Aspergillus fumigatus is a common soil mold whose spores you inhale thousands of times per day. Healthy lungs clear them easily; immunocompromised lungs sometimes cannot, leading to invasive aspergillosis (mortality 30-50%). The first-line treatment is azole antifungals (voriconazole). Problem: agricultural azole fungicides (used on wheat, grapes, tulips, and many other crops) drive the SAME resistance mechanism. Patients in countries with heavy agricultural azole use now present with azole-resistant invasive aspergillosis before they have ever taken an azole medication. In the Netherlands, ~20% of clinical Aspergillus isolates are now azole-resistant. The original resistance evolved in tulip-bulb fields + spread globally.'),
              caveat: 'This is an under-appreciated public health crisis. The WHO\'s One Health framework explicitly names agricultural antimicrobial use as a driver of human clinical resistance - true for bacteria (livestock antibiotics → human-pathogen resistance) AND for fungi (crop azoles → human-pathogen resistance). Restrictions on agricultural azoles are politically difficult; tulip cultivation in particular is a major Dutch industry. There are no current alternatives that won\'t collapse those industries.'
            },
            { id: 'mucor', name: __alloT('stem.microbiology.mucormycosis_black_fungus', 'Mucormycosis (black fungus)'), emoji: '⚫',
              body: __alloT('stem.microbiology.mucormycosis_is_caused_by_fungi_in_the', 'Mucormycosis is caused by fungi in the order Mucorales (Rhizopus, Mucor, Lichtheimia, others). Spores are ubiquitous in soil + decaying plant matter. Infection in immunocompetent people is rare; mucormycosis is almost entirely a disease of severely immunocompromised + uncontrolled-diabetic patients. The fungi invade blood vessels, causing tissue death + the characteristic black necrotic appearance. Treatment requires emergency surgical debridement + amphotericin B; mortality is 40-80% even with treatment. India saw a massive mucormycosis outbreak in 2021 during the second COVID wave: ~50,000 cases reported (vs ~50 in a typical pre-pandemic year), driven by the combination of widespread corticosteroid use for COVID + the very high rate of uncontrolled diabetes in India + heavy environmental fungal spore loads.'),
              caveat: 'Mucormycosis is sometimes sensationalized as "flesh-eating fungus" in news coverage. The reality is grim but specific: it is essentially never a threat to immunocompetent people. The COVID-mucormycosis wave was a tragic intersection of multiple comorbidities. Sustained public health investment in diabetes control + judicious corticosteroid use would prevent most cases.'
            },
            { id: 'crypto', name: __alloT('stem.microbiology.cryptococcus_hiv', 'Cryptococcus + HIV'), emoji: '🦠',
              body: __alloT('stem.microbiology.cryptococcus_neoformans_is_a_yeast_fou', 'Cryptococcus neoformans is a yeast found in pigeon droppings + decaying tree material worldwide. Inhalation is common; clinical disease is rare in healthy immune systems. In HIV/AIDS patients with low CD4 counts, however, Cryptococcus crosses the blood-brain barrier + causes cryptococcal meningitis. Untreated mortality is 100%; even with optimal treatment, mortality remains 20-40%. Cryptococcal meningitis kills an estimated 150,000-200,000 people per year globally, predominantly in sub-Saharan Africa where HIV treatment access is incomplete. WHO recommends screening all newly-diagnosed advanced HIV patients for cryptococcal antigen + treating asymptomatic carriers preemptively.'),
              caveat: 'Cryptococcal meningitis is one of the biggest AIDS-related deaths in low- + middle-income countries - far more than tuberculosis or pneumonia in some settings. Antiretroviral access is the long-term answer; cryptococcal antigen screening + preemptive fluconazole treatment is the immediate one. This is a curable, preventable disease that kills people because the systems to deliver care aren\'t reaching them.'
            },
            { id: 'valley', name: __alloT('stem.microbiology.valley_fever_coccidioidomycosis', 'Valley fever - coccidioidomycosis'), emoji: '🌵',
              body: __alloT('stem.microbiology.coccidioides_immitis_c_posadasii_are_s', 'Coccidioides immitis + C. posadasii are soil fungi endemic to the arid southwestern US (California Central Valley, Arizona) + parts of Mexico + Latin America. Inhalation of spores from disturbed dust causes "Valley fever" - a flu-like illness that resolves on its own in most cases. About 5-10% of infected people develop chronic pulmonary disease; <1% develop life-threatening disseminated infection (meningitis, bone, skin). The fungus is expanding northward + eastward with climate change; cases now reported in Washington State + parts of the Midwest that were never endemic before. California reported ~9,000 cases in 2022, a 50% increase from a decade earlier.'),
              caveat: 'Valley fever is genuinely under-diagnosed nationally. People who develop it after a trip to the Southwest are often misdiagnosed (it looks like influenza, then like pneumonia, then like cancer). The fungus is reportable in 26 states, but awareness varies hugely. Climate-driven range expansion is making this a national rather than regional concern. Several Valley fever vaccines are in clinical trials.'
            },
            { id: 'chytrid', name: __alloT('stem.microbiology.chytrid_amphibian_extinction', 'Chytrid + amphibian extinction'), emoji: '🐸',
              body: __alloT('stem.microbiology.batrachochytrium_dendrobatidis_bd_is_a', 'Batrachochytrium dendrobatidis (Bd) is a chytrid fungus that infects amphibian skin, disrupting electrolyte balance + causing death by cardiac arrest. First identified in 1998, it has driven population declines in over 500 amphibian species worldwide + has been definitively linked to the extinction of at least 90 species since 1980 - the worst single pathogen-driven extinction event in recorded history. Its origin is believed to be Korea, spread globally by the international amphibian trade. Bsal (B. salamandrivorans), a related species discovered in 2013, threatens salamanders + has so far been kept out of the Americas by trade restrictions, though it has devastated European fire salamander populations.'),
              caveat: 'Chytrid is the strongest case study for "fungi as a major extinction driver" - historically that role was attributed mostly to habitat loss + climate change. The pathogen lens doesn\'t replace those drivers, but adds a critical third factor. The case also illustrates that international wildlife trade has been a major emerging-disease vector, and continues to be despite repeated warnings from disease ecologists.'
            },
            { id: 'treat', name: __alloT('stem.microbiology.the_narrow_antifungal_arsenal', 'The narrow antifungal arsenal'), emoji: '💊',
              body: __alloT('stem.microbiology.compared_to_antibiotics_dozens_of_clas', 'Compared to antibiotics (dozens of classes), antifungals are a small + slow field. There are essentially three major classes in clinical use: (1) Polyenes (amphotericin B, nystatin) - broad-spectrum, but amphotericin causes serious kidney toxicity. (2) Azoles (fluconazole, voriconazole, itraconazole, isavuconazole, posaconazole) - work by blocking ergosterol synthesis; widely resistant in some species now. (3) Echinocandins (caspofungin, micafungin, anidulafungin) - block cell-wall synthesis; the newest class (first approved 2001), with C. auris already showing resistance in some isolates. A new class, fosmanogepix (in trials 2024), targets fungal mannoprotein anchors - first novel antifungal mechanism in 20+ years.'),
              caveat: 'The pharma economics for new antifungals are bad. Each new antifungal needs years of trials + capital investment, but invasive fungal infections affect relatively small patient populations (compared to bacterial infections), making return on investment difficult. The result: a dangerously thin pipeline. Several companies have abandoned antifungal development entirely. The WHO + governments are exploring push-pull incentives (advance market commitments, subscription pricing) to fix this; results so far are limited.'
            }
          ];
          var sel = d.selectedFungalE || 'whyrising';
          var topic = FUNGI_TOPICS.find(function(t) { return t.id === sel; }) || FUNGI_TOPICS[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#d8b4fe', fontSize: 16 } }, __alloT('stem.microbiology.emerging_fungal_infections_the_underre', '🍄 Emerging fungal infections - the underrecognized threat')),
            h('p', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, margin: '0 0 12px' } },
              __alloT('stem.microbiology.when_people_picture_an_emerging_infect', 'When people picture an emerging infectious disease, they picture a virus. But the past 20 years have seen fungi rise into a serious + underappreciated category of human + ecological pathogen. Climate change, agricultural fungicide overuse, expanding immunocompromised populations, and very thin antifungal pipelines have combined to create a problem we are only beginning to take seriously.')
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              FUNGI_TOPICS.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedFungalE: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#a855f7' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #a855f7' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#d8b4fe', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
              h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                h('strong', null, __alloT('stem.microbiology.honest_framing', 'Honest framing: ')), topic.caveat
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
              h('strong', null, __alloT('stem.microbiology.a_note_on_proportionality', 'A note on proportionality: ')),
              __alloT('stem.microbiology.fungi_cause_an_estimated_1_5_2_million', 'Fungi cause an estimated 1.5-2 million deaths globally per year - comparable to tuberculosis. They get a fraction of the research funding, awareness, or media coverage that bacterial + viral pathogens receive. This is changing slowly. School psychologists + educators may encounter fungal infections in immunocompromised students (cancer survivors, transplant recipients, severe asthma on inhaled steroids); awareness of the basics serves those students well.')
            )
          );
        }
      }

      // PROTISTS
      function renderProtists() {
        var selected = (d.selectedProtist && PROTISTS.find(function(p) { return p.id === d.selectedProtist; })) || PROTISTS[0];
        var roleColor = { beneficial: '#22c55e', 'beneficial / educational': '#86efac', 'beneficial (massively)': '#22c55e', 'mostly-beneficial': '#86efac', 'mostly-beneficial (and rare-pathogenic relatives)': '#86efac', pathogenic: '#ef4444' };
        return h('div', { style: { padding: 16 } },
          sectionCard('🦠 Protists - the diverse leftovers',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 8px' } }, __alloT('stem.microbiology.protist_is_what_biologists_call_all_th', '"Protist" is what biologists call all the single-celled eukaryotes that aren\'t plants, fungi, or animals. It is a wastebasket category - protists do not share a common ancestor that excludes other eukaryotes. The kingdom is being broken up as DNA sequencing reveals true relationships. But the term is still useful for talking about this incredibly diverse group: photosynthetic algae, mobile predators, parasites, mixotrophs that do both.')),
              h('p', { style: { margin: 0 } }, __alloT('stem.microbiology.protists_include_the_most_abundant_pho', 'Protists include the most abundant photosynthesizers in the ocean (diatoms) and the most lethal infectious organisms on Earth (Plasmodium, the malaria parasite). They sit between bacteria and the multicellular life that descended from them.'))
            ),
            '#0ea5e9'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 14 } },
            PROTISTS.map(function(p) {
              var active = (d.selectedProtist || PROTISTS[0].id) === p.id;
              return h('button', { key: p.id,
                onClick: function() { upd({ selectedProtist: p.id }); },
                'aria-label': p.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(14,165,233,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#0ea5e9' : '#334155'), cursor: 'pointer', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, p.name),
                h('div', { style: { fontSize: 10, color: roleColor[p.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, p.role.split(' (')[0])
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + (roleColor[selected.role] || '#0ea5e9') } },
            h('h3', { style: { margin: '0 0 4px', color: '#7dd3fc', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 12 } }, 'Kind: ' + selected.kind + ' · ', h('span', { style: { color: roleColor[selected.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, selected.role)),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #94a3b8', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.where_2', 'Where')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.where)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #0ea5e9', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.what_it_does_2', 'What it does')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.what)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.science_note_2', 'Science note')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.sciFact)
            ),
            renderMicroscopeLink('protists', selected.id)
          )
        );
      }

      // ARCHAEA
      function renderArchaea() {
        var selected = (d.selectedArchaeon && ARCHAEA.find(function(a) { return a.id === d.selectedArchaeon; })) || ARCHAEA[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('♨️ Archaea - the third domain of life',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 8px' } }, __alloT('stem.microbiology.for_most_of_the_20th_century_biology_r', 'For most of the 20th century, biology recognized two domains of cellular life: bacteria + everything else. In 1977, Carl Woese used ribosomal RNA sequencing to discover that "everything else" actually splits into TWO completely separate groups: archaea + eukaryotes. The two had been classified together because archaea look like bacteria under a microscope. They are not.')),
              h('p', { style: { margin: 0 } }, __alloT('stem.microbiology.archaea_are_as_different_from_bacteria', 'Archaea are as different from bacteria as bacteria are from us. Different membrane lipids, different cell wall chemistry, different gene transcription machinery. Archaea live in your gut and in the ocean. Many are extremophiles - surviving boiling temperatures, supersaline salt flats, or extreme acidity. The "three domains of life" framework is the foundation of modern biology, and we owe it to archaea.'))
            ),
            '#ef4444'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
            ARCHAEA.map(function(a) {
              var active = (d.selectedArchaeon || ARCHAEA[0].id) === a.id;
              return h('button', { key: a.id,
                onClick: function() { upd({ selectedArchaeon: a.id }); },
                'aria-label': a.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(239,68,68,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#ef4444' : '#334155'), cursor: 'pointer', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, a.name),
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, a.kind)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #ef4444' } },
            h('h3', { style: { margin: '0 0 4px', color: '#fca5a5', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 12 } }, selected.kind),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #94a3b8', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.where_it_lives', 'Where it lives')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.where)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #ef4444', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.what_it_does_3', 'What it does')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.what)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.why_it_matters', 'Why it matters')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.sciFact)
            ),
            renderMicroscopeLink('archaea', selected.id)
          ),
          extremophilesAstrobiologySection()
        );

        function extremophilesAstrobiologySection() {
          var EXT = [
            { id: 'classes', name: __alloT('stem.microbiology.classes_of_extremophiles', 'Classes of extremophiles'), emoji: '🌡️',
              body: __alloT('stem.microbiology.extremophiles_are_organisms_that_thriv', 'Extremophiles are organisms that thrive in environments hostile to most life. The major classes (often combined in one organism): THERMOPHILES grow above 45°C; HYPERTHERMOPHILES above 80°C (the current record holder, Methanopyrus kandleri, grows at 122°C, well above water\'s normal boiling point - sustained by hydrostatic pressure at hydrothermal vents). PSYCHROPHILES grow below 15°C, including some that grow at -20°C in saline brines inside Antarctic sea ice. ACIDOPHILES grow at pH below 5 (Picrophilus oshimae grows at pH 0.06, more acidic than battery acid). ALKALIPHILES grow above pH 9 (soda lakes). HALOPHILES grow in saturated salt (Halobacterium needs >2 M NaCl). PIEZOPHILES (barophiles) grow at high pressures, including the bottom of the Mariana Trench (1100 atm, 11 km depth). RADIATION-RESISTANT organisms like Deinococcus radiodurans survive 5000 Gy of ionizing radiation - about 3000× the lethal dose for humans.'),
              caveat: 'The "extremophile" label is anthropocentric. From the organism\'s perspective, ITS environment is normal, and the moderate-temperature surface biosphere we live in is the strange edge case. Some extremophile environments (deep-sea hydrothermal vents, subsurface basalt, deep aquifers) are far more common on Earth + likely in the universe than the conditions we consider familiar.'
            },
            { id: 'vents', name: __alloT('stem.microbiology.hydrothermal_vents_life_origins', 'Hydrothermal vents + life origins'), emoji: '🌋',
              body: __alloT('stem.microbiology.discovered_in_1977_by_the_alvin_submer', 'Discovered in 1977 by the Alvin submersible at the Galápagos Rift, hydrothermal vents support entire ecosystems based on CHEMOSYNTHESIS - bacteria + archaea that oxidize hydrogen sulfide (instead of using sunlight) to fix carbon, supporting tube worms, clams, shrimp, and crabs. This was the first proof that complex life can exist without sunlight. Black-smoker vents at mid-ocean ridges reach 400°C, with mineral-rich fluids reacting with cold seawater to precipitate iron + zinc sulfides. White-smoker vents are cooler + dominated by barium + calcium minerals. The Lost City hydrothermal field (Atlantic, 2000) is an alkaline serpentinite-driven vent system - possibly closer to where life on Earth originated, because serpentinization produces hydrogen + methane + organic precursors in conditions favorable to early metabolism (Mike Russell + Bill Martin\'s "alkaline vent" hypothesis).'),
              caveat: 'Whether life on Earth originated AT vents is debated. Competing hypotheses include warm shallow tidal pools (Darwin\'s original guess), volcanic islands, mineral-templated surfaces, and even subsurface aquifers. Vents have the right chemistry; the kinetics + thermodynamics of life\'s first steps remain hard to reconstruct in lab simulations.'
            },
            { id: 'subsurface', name: __alloT('stem.microbiology.the_deep_biosphere', 'The deep biosphere'), emoji: '⛏️',
              body: __alloT('stem.microbiology.about_1_6_10_microbial_cells_live_in_t', 'About 1.6 × 10²⁹ microbial cells live in the upper few kilometers of Earth\'s crust - roughly equal to the total cell count in the surface biosphere, possibly more. This "deep biosphere" was unsuspected until the 1990s; it has since been documented in deep mines (the Mponeng mine in South Africa at 3.6 km depth has 60°C basalt aquifers full of bacteria + archaea), oil reservoirs, the seabed sediments down to 1+ km, and even basalt cores from drilling expeditions. These organisms grow EXTREMELY slowly (some have estimated doubling times of centuries to millennia), feeding on hydrogen produced by radiolysis of water from natural uranium + thorium decay, or on serpentinization-derived hydrogen + methane. The deep biosphere may be the LARGEST single ecosystem on Earth by biomass.'),
              caveat: 'Sample contamination is a constant problem in deep biosphere science. Drilling fluids, packers, even the drill string carry surface microbes down with them. Distinguishing genuine indigenous deep-life from contamination requires multiple geochemical controls + meticulous procedures. The field has gradually built credibility but each new "deep life" claim still faces scrutiny.'
            },
            { id: 'tardigrade', name: __alloT('stem.microbiology.tardigrades_survival_extremes', 'Tardigrades + survival extremes'), emoji: '🐻',
              body: __alloT('stem.microbiology.tardigrades_water_bears_are_tiny_inver', 'Tardigrades ("water bears") are tiny invertebrates (~0.5 mm) that can survive desiccation, freezing to -200°C, heating to 150°C, vacuum + UV (briefly), and ~1000× the radiation dose lethal to humans. Their survival mechanism involves a state called CRYPTOBIOSIS: nearly complete shutdown of metabolism, replacement of cellular water with trehalose (a sugar that stabilizes proteins), and protective Damage-Suppressing (Dsup) proteins that wrap around DNA. Tardigrades survived a 2007 ESA experiment that exposed them to open space for 10 days; most revived after rehydration. Tardigrades are NOT technically extremophiles (they live in damp moss + lake sediments, which are not extreme), but they CAN survive extreme exposures via cryobiosis.'),
              caveat: 'Tardigrades are wildly over-represented in popular astrobiology narratives. They cannot GROW or REPRODUCE in extreme conditions; they can only survive them as inert cysts. A tardigrade does not represent a colonizing life form for Mars or Europa. They DO represent useful proof that complex eukaryotic life can survive transport through space, which is relevant for panspermia + planetary protection.'
            },
            { id: 'mars', name: __alloT('stem.microbiology.mars_the_search_for_past_life', 'Mars + the search for past life'), emoji: '🔴',
              body: __alloT('stem.microbiology.mars_almost_certainly_had_liquid_water', 'Mars almost certainly had liquid water on its surface 3-4 billion years ago + may still have it intermittently in subsurface aquifers. The Perseverance rover (landed 2021 in Jezero Crater) is selecting samples for a future Mars Sample Return mission (planned 2030s - schedule + budget uncertain). Curiosity rover detected organic molecules + methane plumes (varying seasonally, intriguingly) in Gale Crater. The chemistry of Mars is consistent with past microbial life, but no biosignatures have been confirmed. If past life existed on Mars, the most likely habitat was the subsurface (where liquid water + warmth could persist) - and we have not yet directly sampled deep enough.'),
              caveat: 'Mars surface today is severely hostile: ~6 mbar atmosphere (less than 1% of Earth), surface temperature -60°C average, perchlorate-laced regolith (toxic to most Earth life), heavy UV + cosmic radiation. Direct surface life today is implausible. Subsurface life - if it exists - would be at temperatures + chemistries similar to deep Earth biosphere. Conclusively detecting it would be one of the biggest scientific events in history; conclusively ruling it out is impossible without much deeper drilling than current missions can do.'
            },
            { id: 'europa', name: __alloT('stem.microbiology.europa_ocean_worlds', 'Europa + ocean worlds'), emoji: '🌊',
                  body: __alloT('stem.microbiology.europa_is_jupiter_s_ice_covered_moon_b', 'Europa is Jupiter\'s ice-covered moon. Beneath ~20-30 km of water ice lies a global liquid-water ocean estimated at 100+ km deep - more liquid water than all of Earth\'s oceans combined. Tidal heating from Jupiter\'s gravity keeps the ocean liquid. The Europa Clipper mission (launched October 2024, arriving 2030) will conduct ~50 close flybys to characterize the ice + ocean chemistry. Enceladus (Saturn moon) has similar geology + has been observed venting water + organic molecules + hydrogen from south-pole jets - direct sampling of subsurface ocean material was achieved by the Cassini mission (2005-2017). Titan (also Saturn) has methane lakes + a presumed subsurface water ocean. Triton (Neptune), Ganymede (Jupiter), Callisto (Jupiter) all probably have subsurface oceans.'),
                  caveat: 'Detecting life in a subsurface ocean is hard - we would need to either find it venting through the ice (Enceladus already gives us samples) or drill through 20+ km of ice (decades of technology development at minimum). Europa Clipper is NOT a life-detection mission. It is preparing the ground for a future lander. Setting realistic expectations matters: even a successful Clipper mission probably will not "find life on Europa."'
            },
            { id: 'panspermia', name: __alloT('stem.microbiology.panspermia_planetary_protection', 'Panspermia + planetary protection'), emoji: '🚀',
              body: __alloT('stem.microbiology.panspermia_is_the_hypothesis_that_life', 'Panspermia is the hypothesis that life on Earth originated elsewhere + was delivered here by meteorites, comets, or interstellar dust. Tardigrades + bacterial spores can plausibly survive space transit (proven experimentally). Mars meteorites HAVE reached Earth via natural impact ejection. So the mechanism is feasible; the question is whether it happened. Most astrobiologists are agnostic - there is no positive evidence FOR panspermia + the alternative (independent origin on Earth) requires no special mechanism. Planetary protection is the related practical concern: NASA + ESA spend significant effort sterilizing spacecraft going to Mars or Europa, both to avoid contaminating those worlds with Earth life + to avoid false-positive biosignature detections from hitchhiking microbes. The COSPAR (Committee on Space Research) Planetary Protection Policy categorizes missions by destination + contamination risk.'),
              caveat: 'Some flavors of panspermia (Hoyle + Wickramasinghe\'s strong version, or Loeb\'s recent speculations on \'Oumuamua + IM1) are not seriously considered. The mild version - that organic precursors reached early Earth from comets - is well-supported by the chemistry of carbonaceous chondrite meteorites. Full living-cell panspermia is plausible but unsupported.'
            },
            { id: 'biosig', name: __alloT('stem.microbiology.biosignatures_agnostic_biology', 'Biosignatures + agnostic biology'), emoji: '🔬',
              body: __alloT('stem.microbiology.a_biosignature_is_something_only_livin', 'A biosignature is something only living processes can produce. On Earth, the giveaways are: chiral homochirality (life uses only L-amino acids + D-sugars; chemistry produces racemic mixtures), isotopic fractionation (life prefers lighter carbon-12 over carbon-13 by ~25 parts per thousand), specific gas combinations far from equilibrium (oxygen + methane together), patterned mineralogy (biologically-produced minerals like the magnetite chains in magnetotactic bacteria), and specific complex molecules (chlorophyll, hopanes, biopolymers). The challenge: alien life might not use the same chemistry. "Agnostic biosignatures" - patterns that any complex molecular system would create regardless of underlying biochemistry - are an active research area (Sara Walker + Lee Cronin\'s "assembly theory" is one current candidate).'),
              caveat: 'The history of "we have detected life on Mars" claims is humbling. Viking 1976 labeled-release experiments → debated for 50 years, still unsettled. ALH84001 meteorite microfossils 1996 → mostly abiotic explanations now accepted. Mars methane plumes → not yet linked to biology. Any future claim will face an extremely high burden of proof; the field has earned its caution the hard way.'
            }
          ];
          var sel = d.selectedExtremo || 'classes';
          var topic = EXT.find(function(t) { return t.id === sel; }) || EXT[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#a5b4fc', fontSize: 16 } }, __alloT('stem.microbiology.extremophiles_astrobiology', '🌌 Extremophiles + astrobiology')),
            h('p', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, margin: '0 0 12px' } },
              __alloT('stem.microbiology.the_discovery_of_extremophiles_on_eart', 'The discovery of extremophiles on Earth - life in boiling springs, frozen brine, deep crustal rock, salt-saturated lakes, acidic vents - has expanded our sense of where life CAN exist. Every new extremophile habitat we find on Earth opens a new candidate habitat in the solar system + beyond. This is microbiology meeting astronomy in the most literal way.')
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              EXT.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedExtremo: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#6366f1' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #6366f1' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.35)' } },
              h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#c7d2fe', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
              h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                h('strong', null, __alloT('stem.microbiology.honest_framing_2', 'Honest framing: ')), topic.caveat
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65 } },
              h('strong', null, __alloT('stem.microbiology.the_cross_tool_connection', 'The cross-tool connection: ')),
              __alloT('stem.microbiology.this_section_pairs_naturally_with_the_', 'This section pairs naturally with the Astronomy tool\'s exoplanet + habitable-zone + Drake-equation sections. The biology side (what kind of life COULD exist) and the astronomy side (where habitable worlds COULD be) are now converging into a single field called ASTROBIOLOGY. NASA + ESA both have active astrobiology programs (NASA has the Astrobiology Institute + NExSS network; ESA has the ExoMars + planned ENVISION missions). It is one of the most genuinely interdisciplinary fields in modern science.')
            )
          );
        }
      }

      // MICROSCOPE - scale visualizer
      function renderMicroscope() {
        var mag = d.magnification || 100;
        var selected = SCOPES.find(function(s) { return s.id === d.selectedScope; }) || SCOPES[0];

        // Reference scale targets: human hair (~80 µm), red blood cell (10 µm), typical bacterium (2 µm), small virus (100 nm = 0.1 µm)
        var targets = [
          { name: __alloT('stem.microbiology.human_hair', 'Human hair'), sizeUm: 80 },
          { name: __alloT('stem.microbiology.red_blood_cell', 'Red blood cell'), sizeUm: 10 },
          { name: __alloT('stem.microbiology.e_coli_bacterium', 'E. coli bacterium'), sizeUm: 2 },
          { name: __alloT('stem.microbiology.covid_virus', 'COVID virus'), sizeUm: 0.12 },
          { name: __alloT('stem.microbiology.protein_molecule', 'Protein molecule'), sizeUm: 0.01 }
        ];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            __alloT('stem.microbiology.microscopy_the_history_of_microbiology', 'Microscopy. The history of microbiology IS the history of better microscopes. Each improvement opened a whole new biology.')
          ),

          h(VirtualMicroscope, { awardXP: awardXP, d: d, upd: upd }),

          // Magnification slider
          sectionCard('Scale: what can you see at different magnifications?',
            h('div', null,
              h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 6 } }, 'Magnification: ', h('strong', { style: { color: EMERALD, fontSize: 14 } }, mag + 'x')),
              h('input', { type: 'range', 'aria-valuetext': mag + 'x', min: 1, max: 100000, step: 1, value: mag,
                onChange: function(e) { upd({ magnification: parseInt(e.target.value, 10) }); },
                'aria-label': __alloT('stem.microbiology.magnification', 'Magnification'),
                style: { width: '100%', accentColor: EMERALD, marginBottom: 12 }
              }),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 } },
                targets.map(function(t, i) {
                  // Apparent size when viewed at mag - pretend pixel-size = real-size * mag / 1000 µm per visible-width
                  var apparentMm = t.sizeUm * mag / 100; // mm at this magnification (assuming 100x makes 1µm = 1mm on screen)
                  var visible = apparentMm >= 0.1 && apparentMm <= 1000;
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid ' + (visible ? EMERALD : '#334155'), opacity: visible ? 1 : 0.5 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 2 } }, t.name),
                    h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)' } }, t.sizeUm + ' µm actual'),
                    h('div', { style: { fontSize: 11, color: visible ? '#6ee7b7' : '#64748b', marginTop: 4 } }, visible ? '✓ visible' : (apparentMm < 0.1 ? 'too small' : 'too big to fit'))
                  );
                })
              )
            )
          ),

          // Scope type selector
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            SCOPES.map(function(s) {
              var active = d.selectedScope === s.id;
              return h('button', { key: s.id, type: 'button', 'aria-pressed': active,
                onClick: function() { upd({ selectedScope: s.id }); },
                style: { padding: '6px 12px', borderRadius: 8, background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), color: active ? '#6ee7b7' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, s.name);
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)' } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 17 } }, selected.name),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 10 } }, 'Resolution range: ' + selected.range),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, selected.what),
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.55 } },
              h('strong', null, 'Limit: '), selected.limit
            )
          ),
          diagnosticTechniquesSection()
        );

        function diagnosticTechniquesSection() {
          var DX = [
            { id: 'culture', name: __alloT('stem.microbiology.culture_classical', 'Culture (classical)'), emoji: '🧫',
              speed: 'Hours to days', cost: 'Low',
              how: 'A clinical sample (blood, urine, sputum, wound swab, CSF) is streaked onto culture media (blood agar, MacConkey, chocolate agar, Sabouraud, etc.) + incubated at 35-37°C for 18-72 hours. Colonies that grow are then identified by colony morphology, Gram stain, biochemistry, and antimicrobial susceptibility testing (Kirby-Bauer disk diffusion or automated platforms like VITEK + Phoenix + MicroScan).',
              when: 'Still the workhorse of clinical microbiology for bacterial + fungal identification. Required for definitive antimicrobial susceptibility testing on the actual patient isolate. Slow-growing organisms (TB, fungi, anaerobes) may take weeks.',
              limit: 'Slow. ~50% of clinical infections culture-negative - either because the organism does not grow on standard media, because the patient already had antibiotics, or because the sample was inadequate. Some pathogens (Mycobacterium tuberculosis: weeks; Tropheryma whipplei: months) effectively cannot be cultured outside research labs.'
            },
            { id: 'gram', name: __alloT('stem.microbiology.gram_stain_microscopy', 'Gram stain + microscopy'), emoji: '🔍',
              speed: 'Minutes', cost: 'Very low',
              how: 'A sample smear on a glass slide is heat-fixed + stained sequentially: crystal violet (purple), Lugol\'s iodine (mordant), alcohol (decolorizer), safranin (counterstain). Gram-POSITIVE bacteria retain the violet (thick peptidoglycan). Gram-NEGATIVE bacteria decolorize + stain pink (thin peptidoglycan + outer membrane). Combined with morphology (cocci, rods, chains, clusters) + the Ziehl-Neelsen stain for acid-fast bacilli (M. tuberculosis), this still drives most initial antibiotic decisions in suspected infection.',
              when: 'Used by every clinical lab + emergency department on every suspected infection sample, before culture results are available. Costs essentially nothing per test.',
              limit: 'Gram stain misclassifies some bacteria (a few "Gram-variable" species), cannot identify down to species level, and gives no antibiotic susceptibility information. False negative if too few organisms in sample. Requires trained microscopist.'
            },
            { id: 'pcr', name: __alloT('stem.microbiology.pcr_qpcr_multiplex', 'PCR + qPCR + multiplex'), emoji: '🧬',
              speed: '1-3 hours', cost: 'Medium ($20-200/test)',
              how: 'Polymerase Chain Reaction (Kary Mullis 1983, Nobel 1993) amplifies a specific DNA target by ~10⁹-fold using a thermal-cycler + DNA polymerase + primers + nucleotides. Quantitative PCR (qPCR) adds a fluorescent probe that releases signal proportional to target copies, allowing concentration estimates. Multiplex PCR amplifies many targets simultaneously. Modern syndromic panels (BioFire, GenMark) detect 20+ respiratory pathogens or 20+ GI pathogens in a single 1-hour test.',
              when: 'Standard for viral diagnostics (COVID, flu, RSV, HIV viral load, hepatitis), for pathogens that culture poorly (Chlamydia, gonorrhea, syphilis), for syndromic respiratory or GI workups in hospitalized patients, and for detection of resistance genes (mecA for MRSA, vanA for VRE).',
              limit: 'PCR detects DNA/RNA - including from dead organisms, environmental contamination, or recent infections that have already cleared. Does not give antimicrobial susceptibility (except by detecting known resistance genes). False positives from contamination are a real lab problem. Cost per test is dropping but remains 10-100× higher than Gram stain.'
            },
            { id: 'maldi', name: __alloT('stem.microbiology.maldi_tof_mass_spectrometry', 'MALDI-TOF mass spectrometry'), emoji: '⚖️',
              speed: 'Minutes (after isolate grown)', cost: 'High capital, low per-sample',
              how: 'Matrix-Assisted Laser Desorption / Ionization, Time-of-Flight mass spectrometry. A bacterial or fungal colony is mixed with a chemical matrix on a target plate. A laser ionizes the proteins; they fly down a vacuum tube + a detector measures time-of-flight (which depends on mass). Each species produces a characteristic "protein fingerprint" mass spectrum, matched against a database of ~3000+ species. Identification accuracy: ~95-99% for common pathogens, in under 5 minutes per colony.',
              when: 'Has revolutionized clinical microbiology since ~2010. Most US + European clinical labs now have MALDI-TOF instruments (Bruker MALDI Biotyper, bioMérieux VITEK MS). Replaces ~80% of traditional biochemical-identification panels. Faster, cheaper, more accurate. Especially valuable for fungi + difficult-to-identify gram-negative rods.',
              limit: 'MALDI-TOF still requires a culture step first (you need biomass to test). Cannot distinguish closely-related species in some genera (Streptococcus pneumoniae vs S. mitis is hard; closely related Bacillus + Listeria species can be ambiguous). Capital cost ~$200-400K but per-test cost is now <$1.'
            },
            { id: 'sequencing', name: __alloT('stem.microbiology.whole_genome_sequencing', 'Whole-genome sequencing'), emoji: '🧪',
              speed: '12-48 hours', cost: 'Medium-high ($50-500/isolate)',
              how: 'Next-generation sequencing (Illumina short-read, Oxford Nanopore long-read, PacBio HiFi) reads the complete bacterial genome from an isolate or directly from a patient sample (metagenomic NGS, mNGS). Bioinformatics pipelines compare the sequence to reference databases for species identification, virulence factor detection, resistance gene profiling, and outbreak strain-typing. Used by PulseNet for foodborne outbreak detection + by hospital infection-prevention teams for hospital outbreak investigation.',
              when: 'Increasingly used for: outbreak investigation (multistate foodborne, hospital outbreaks), antimicrobial resistance surveillance, diagnosis of severe undiagnosed CNS infections via mNGS (CSF metagenomics), tuberculosis drug-resistance prediction. Routine clinical diagnostic use is still limited by cost + turnaround.',
              limit: 'mNGS on clinical samples produces ~99% human DNA + ~1% pathogen DNA - bioinformatic filtering must separate them. Contamination from the lab + the patient\'s microbiome is a constant issue. Interpretation requires specialized expertise that small labs do not have. Cost continues to fall but is not yet at "first-line" diagnostic levels.'
            },
            { id: 'serology', name: __alloT('stem.microbiology.antibody_serology_tests', 'Antibody (serology) tests'), emoji: '🩸',
              speed: '15 minutes to hours', cost: 'Low ($1-30/test)',
              how: 'Detects ANTIBODIES (host immune response) rather than the pathogen itself. ELISA, lateral flow (the strip tests like home COVID tests + pregnancy tests), Western blot, complement fixation. Used to determine PRIOR exposure (IgG) or RECENT/CURRENT infection (IgM, IgA, rising titer). Major applications: HIV screening, hepatitis B + C diagnosis, syphilis screening, Lyme disease confirmation, measles + mumps + rubella immunity status, COVID antibody studies.',
              when: 'Particularly useful when the pathogen is hard to culture (HIV, hepatitis viruses) or has cleared but left detectable immune response (mononucleosis, dengue, prior COVID). Lateral flow rapid tests have transformed home + point-of-care testing.',
              limit: 'Antibodies take days to weeks to develop after infection (window period). Cross-reactivity between related pathogens can cause false positives. Cannot distinguish past from current infection by IgG alone. A negative result during early infection does not rule out the disease.'
            },
            { id: 'poc', name: __alloT('stem.microbiology.point_of_care_testing', 'Point-of-care testing'), emoji: '🏥',
              speed: '5-30 minutes', cost: 'Medium ($5-50/test)',
              how: 'Tests done at the bedside, in the clinic, in pharmacies, or at home, without sending samples to a central lab. Examples: rapid strep test, rapid flu test, rapid HIV (OraQuick), home COVID antigen tests, finger-stick blood glucose, urine pregnancy. Technologies: lateral flow immunoassay, isothermal nucleic-acid amplification (LAMP), microfluidic cassettes (cobas Liat, GeneXpert, ID NOW), simple antigen detection.',
              when: 'When fast actionable results matter more than maximum accuracy. Routine in emergency departments, urgent care, sexual health clinics, mass-screening contexts. The Abbott BinaxNOW + GeneXpert MTB/RIF have transformed tuberculosis diagnosis in low-resource settings (Xpert gives TB + rifampicin-resistance in 90 minutes, vs months for culture).',
              limit: 'Lower sensitivity than central-lab tests (rapid strep ~70% vs culture ~95%; rapid COVID antigen ~50-70% vs PCR). False negatives can delay correct treatment. Quality control + operator training are often weak outside formal labs. Worth using when speed clearly outweighs the sensitivity tradeoff; not the default for serious infections.'
            },
            { id: 'future', name: __alloT('stem.microbiology.what_is_coming', 'What is coming'), emoji: '🚀',
              speed: 'Approaching minutes', cost: 'Approaching $1-10',
              how: 'CRISPR-based detection (SHERLOCK, DETECTR - Cas12 + Cas13 enzymes that fluoresce when finding a target sequence), portable nanopore sequencing (a USB-stick-sized sequencer that can read pathogens at the bedside), AI-image-based bacterial identification (a microscope app that identifies organisms from a Gram stain via deep learning), microbiome-aware diagnostics (interpreting findings in the context of the normal microbiome), wearable + breath-based screening (exhaled volatile biomarkers indicating infection).',
              when: 'Most of these are in trials or limited clinical use. The COVID-19 pandemic accelerated many; SHERLOCK got emergency FDA authorization in 2020. Within 5-10 years, expect bedside molecular diagnosis to be routine + cost-effective. The economic + workflow changes will be larger than any single technology.',
              limit: 'New tests need to demonstrate clinical UTILITY - does using them lead to better patient outcomes? Many promising diagnostics fail at this hurdle. They are technically impressive + clinically uninformative. The bar is not "can it detect the bug" but "does detecting it change what the doctor does + does that change benefit the patient."'
            }
          ];
          var sel = d.selectedDx || 'culture';
          var topic = DX.find(function(t) { return t.id === sel; }) || DX[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#6ee7b7', fontSize: 16 } }, __alloT('stem.microbiology.diagnostic_microbiology_how_labs_actua', '🔬 Diagnostic microbiology - how labs actually identify pathogens')),
            h('p', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, margin: '0 0 12px' } },
              __alloT('stem.microbiology.every_time_someone_is_treated_for_a_re', 'Every time someone is treated for a real infection, a clinical microbiology lab has gone through specific identification + susceptibility testing steps to determine WHICH organism is causing it + what will kill it. These methods range from a 19th-century Gram stain (cost: pennies) to whole-genome sequencing (cost: hundreds of dollars). Each has a place in the workflow; combining them is the art.')
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              DX.map(function(t) {
                var on = t.id === sel;
                return h('button', {
                  key: t.id,
                  onClick: function() { upd({ selectedDx: t.id }); },
                  style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#10b981' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #10b981' : '1px solid #334155' }
                }, t.emoji + ' ' + t.name);
              })
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#6ee7b7', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 10, fontStyle: 'italic' } }, 'Speed: ' + topic.speed + ' · Cost: ' + topic.cost),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.how_it_works', 'How it works')),
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, topic.how)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.when_to_use_it', 'When to use it')),
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, topic.when)
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.honest_limits', 'Honest limits')),
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, topic.limit)
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
              h('strong', null, __alloT('stem.microbiology.the_integrated_workflow', 'The integrated workflow: ')),
              __alloT('stem.microbiology.a_real_clinical_lab_does_not_choose_on', 'A real clinical lab does NOT choose ONE technique. A blood culture grows; MALDI-TOF identifies the organism in minutes; an automated susceptibility panel runs in 6-8 hours; PCR for specific resistance genes runs in parallel; sequencing happens for outbreak investigations or unusual organisms. Each test has its place; combining them rapidly + interpreting them well is what separates a good lab from a great one. School psychologists + counselors who understand the diagnostic landscape can have more useful conversations with families about WHY a test takes 3 days, WHY it might be repeated, and WHY a treating clinician changes antibiotics partway through a course.')
            )
          );
        }
      }

      // RESISTANCE
      function renderResistance() {
        return h('div', { style: { padding: 16 } },
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', borderTop: '1px solid rgba(239,68,68,0.35)', borderRight: '1px solid rgba(239,68,68,0.35)', borderBottom: '1px solid rgba(239,68,68,0.35)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
            h('strong', null, __alloT('stem.microbiology.antibiotic_resistance_is_a_global_heal', '⚠️ Antibiotic resistance is a global health crisis. ')),
            __alloT('stem.microbiology.antibiotic_resistant_infections_killed', 'Antibiotic-resistant infections killed at least 1.27 million people in 2019, with millions more deaths in which resistance contributed. The CDC ranks it among the top global health threats of this century.')
          ),
          h(AntibioticResistanceSim, { awardXP: awardXP }),
          sectionCard('How resistance evolves (in 5 steps)',
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, __alloT('stem.microbiology.random_mutation', 'Random mutation. ')), __alloT('stem.microbiology.a_bacterium_s_dna_copies_with_rare_err', 'A bacterium\'s DNA copies with rare errors. Most are harmful or neutral. Occasionally, one happens to make the bacterium less sensitive to an antibiotic.')),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, __alloT('stem.microbiology.antibiotic_exposure', 'Antibiotic exposure. ')), __alloT('stem.microbiology.patient_takes_the_antibiotic_susceptib', 'Patient takes the antibiotic. Susceptible bacteria die in massive numbers. The few that happen to be resistant survive.')),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'Selection. '), __alloT('stem.microbiology.the_resistant_survivors_have_all_the_f', 'The resistant survivors have all the food and space to themselves. They reproduce. Within hours to days, the surviving population is mostly resistant.')),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'Spread. '), __alloT('stem.microbiology.resistant_bacteria_spread_person_to_pe', 'Resistant bacteria spread person-to-person, hospital-to-community, country-to-country. Bacteria can also transfer resistance genes between species via plasmids (horizontal gene transfer).')),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, __alloT('stem.microbiology.the_antibiotic_stops_working', 'The antibiotic stops working. ')), __alloT('stem.microbiology.for_everyone_the_drug_that_saved_milli', 'For everyone. The drug that saved millions becomes useless. Each lost antibiotic narrows medicine\'s toolkit.'))
            )
          ),
          sectionCard('🔁 Horizontal gene transfer - how bacteria share resistance',
            (function() {
              var MECHS = [
                { id: 'transform', name: __alloT('stem.microbiology.transformation', 'Transformation'), color: '#0ea5e9',
                  what: 'A bacterium picks up FREE DNA from its environment (released when other bacteria die + lyse). If the bacterium is "competent" - its membrane lets DNA in - the new DNA may integrate into its chromosome.',
                  how: 'Discovered by Frederick Griffith in 1928. He showed that dead virulent Streptococcus pneumoniae could transform live non-virulent strains into virulent ones - somehow "transferring" the virulence. Avery, MacLeod, McCarty (1944) showed the transforming agent was DNA. This experiment proved DNA carries genetic information.',
                  examples: 'Streptococcus pneumoniae, Neisseria, Bacillus subtilis. Some species are "naturally competent" - they take up DNA constantly. Others can be made competent in the lab (this is how you genetically transform bacteria for biotech experiments).',
                  rate: 'Limited to neighbors. Free DNA fragments don\'t travel far. But in dense communities like biofilms, every cell is a potential donor + recipient.'
                },
                { id: 'transduce', name: __alloT('stem.microbiology.transduction_phage_mediated', 'Transduction (phage-mediated)'), color: '#a855f7',
                  what: 'A bacteriophage virus infects a bacterium, replicates inside, packages some of the host\'s DNA by mistake into a new phage particle, then carries it to another bacterium when it next infects. The recipient gets the donor\'s DNA delivered like a postal package.',
                  how: 'Discovered by Joshua Lederberg + Norton Zinder in 1952 (Lederberg shared the 1958 Nobel for this + other work). Two types: GENERALIZED (any host DNA can be packaged) and SPECIALIZED (only DNA next to the phage integration site).',
                  examples: 'How methicillin resistance + staphylococcal toxin genes spread among Staphylococcus aureus strains. How some virulence genes spread in cholera + diphtheria + scarlet fever. Phage-mediated gene transfer is rampant in marine bacteria - about 10²⁴ transduction events globally PER SECOND in the oceans.',
                  rate: 'Can cross significant distances (wherever phages spread, transduced DNA spreads). Some phages have very narrow host range (one species); others can infect across species.'
                },
                { id: 'conjugate', name: __alloT('stem.microbiology.conjugation_pilus_mediated', 'Conjugation (pilus-mediated)'), color: '#22c55e',
                  what: 'A donor bacterium grows a hollow tube (sex pilus, or "F pilus") that contacts a recipient bacterium. The pilus retracts, bringing the cells together. A PLASMID (a small circular DNA loop, separate from the main chromosome) is then copied from donor to recipient through the connection.',
                  how: 'Discovered by Lederberg + Tatum in 1946 (the same Lederberg, then a 22-year-old grad student). They showed that two E. coli strains, when grown together, could exchange genetic markers. The F (fertility) plasmid encodes the pilus + makes a cell a donor.',
                  examples: 'The dominant mechanism by which antibiotic resistance genes spread in healthcare-associated bacteria. The "R plasmids" carry resistance to multiple antibiotics + can transfer between species - so a Klebsiella that has carbapenem resistance can transfer it to an E. coli in the same patient.',
                  rate: 'Fast + far-reaching. Conjugative plasmids can cross genus + family boundaries. NDM-1 (a carbapenem-resistance gene first identified in India 2008) has spread to ~6 continents via conjugative plasmids in ~15 years.'
                }
              ];
              var sel = MECHS.find(function(m) { return m.id === d.selectedHGT; }) || MECHS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                  __alloT('stem.microbiology.bacteria_don_t_just_inherit_genes_from', 'Bacteria don\'t just inherit genes from parents (VERTICAL transmission). They also SHARE genes with neighbors + sometimes with completely unrelated species (HORIZONTAL gene transfer). This is why antibiotic resistance spreads so fast: a resistance gene that evolves in one bacterium can be in a hundred different species within years. There are three main mechanisms.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  MECHS.map(function(m) {
                    var active = (d.selectedHGT || MECHS[0].id) === m.id;
                    return h('button', { key: m.id,
                      onClick: function() { upd({ selectedHGT: m.id }); },
                      style: { padding: '8px 14px', borderRadius: 8, background: active ? m.color + '33' : '#1e293b', border: '1px solid ' + (active ? m.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, m.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.what_happens', 'What happens')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.discovery_science', 'Discovery + science')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.how)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.examples_where_it_matters', 'Examples / where it matters')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.examples)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.speed_reach', 'Speed + reach')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.rate)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.why_hgt_shapes_the_resistance_crisis', 'Why HGT shapes the resistance crisis: ')),
                  __alloT('stem.microbiology.a_resistance_gene_only_needs_to_evolve', 'A resistance gene only needs to evolve ONCE in any bacterium anywhere on Earth. From there, conjugation can spread it across hundreds of species. By the time clinicians notice the resistance in patients, the gene may already be present in dozens of bacterial species worldwide. The NDM-1 gene first identified in 2008 is now found in ~70 countries + multiple bacterial families. This is why the "spread to other countries" is essentially guaranteed once a resistance gene exists.')
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.hgt_in_evolution', 'HGT in evolution: ')),
                  __alloT('stem.microbiology.the_traditional_tree_of_life_with_clea', 'The traditional "tree of life" with clean branches works for animals + plants - they mostly inherit genes vertically. Bacterial + archaeal evolution is more like a "web of life" because of constant horizontal transfer. About 8% of the human genome is virus-derived (from past retroviral infections); some of those genes are now essential (placenta development uses retroviral genes). HGT is not just a curiosity - it has shaped the genomes of every organism on Earth, including us.')
                )
              );
            })(),
            '#0ea5e9'
          ),

          sectionCard('💊 How antibiotics actually work (and what resistance breaks)',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65 } },
                __alloT('stem.microbiology.antibiotics_are_not_all_the_same_each_', 'Antibiotics are NOT all the same. Each class attacks a different essential bacterial function. Bacteria can evolve resistance to one mechanism without losing susceptibility to others. Knowing which class is which is the foundation of antibiotic stewardship - and the reason we still have working drugs.')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                [
                  { name: __alloT('stem.microbiology.beta_lactams_penicillin_amoxicillin_ce', 'Beta-lactams (penicillin, amoxicillin, cephalosporins, carbapenems)'), target: 'Cell wall (peptidoglycan synthesis)',
                    how: 'Block the enzyme that cross-links peptidoglycan strands. The bacterium tries to divide, can\'t build a wall, ruptures. Only works on actively dividing bacteria.',
                    resists: 'Bacteria produce β-lactamase enzymes that destroy the antibiotic. ESBL (extended-spectrum) and carbapenemase-producing bacteria break almost all β-lactams.',
                    color: '#22c55e' },
                  { name: __alloT('stem.microbiology.aminoglycosides_gentamicin_streptomyci', 'Aminoglycosides (gentamicin, streptomycin, tobramycin)'), target: 'Protein synthesis (30S ribosome)',
                    how: 'Bind the 30S ribosome subunit and cause mistranslation. Bacterial proteins fold wrong; cell dies.',
                    resists: 'Bacteria acquire enzymes that chemically modify the antibiotic before it can bind. Or change the ribosome target. Or pump it out.',
                    color: '#0ea5e9' },
                  { name: __alloT('stem.microbiology.tetracyclines_doxycycline_minocycline', 'Tetracyclines (doxycycline, minocycline)'), target: 'Protein synthesis (30S ribosome)',
                    how: 'Block the binding of tRNA to the ribosome. Protein synthesis stops.',
                    resists: 'Efflux pumps that physically remove the antibiotic from the cell. Ribosomal protection proteins. Most tetracycline resistance is plasmid-borne.',
                    color: '#0ea5e9' },
                  { name: __alloT('stem.microbiology.macrolides_azithromycin_erythromycin', 'Macrolides (azithromycin, erythromycin)'), target: 'Protein synthesis (50S ribosome)',
                    how: 'Bind the 50S ribosome subunit and block protein elongation. The growing peptide can\'t exit the ribosome.',
                    resists: 'Methylation of the ribosomal RNA (so the antibiotic can\'t bind). Efflux pumps. Often co-resistance with clindamycin (D-test).',
                    color: '#a855f7' },
                  { name: __alloT('stem.microbiology.fluoroquinolones_ciprofloxacin_levoflo', 'Fluoroquinolones (ciprofloxacin, levofloxacin)'), target: 'DNA replication (DNA gyrase + topoisomerase)',
                    how: 'Block the enzymes that supercoil + uncoil bacterial DNA during replication. Replication forks collapse. Cell dies.',
                    resists: 'Mutations in the gyrA/parC genes change the target. Efflux pumps. Quinolone resistance has risen dramatically in the last 20 years.',
                    color: '#f59e0b' },
                  { name: __alloT('stem.microbiology.sulfonamides_trimethoprim', 'Sulfonamides + trimethoprim'), target: 'Folate synthesis',
                    how: 'Block two steps of bacterial folate (vitamin B9) synthesis. Without folate, bacteria can\'t make DNA. Humans get folate from food - we are not affected.',
                    resists: 'Acquired enzymes with altered active sites that the drugs can\'t inhibit. Folate uptake systems.',
                    color: '#ec4899' },
                  { name: __alloT('stem.microbiology.glycopeptides_vancomycin', 'Glycopeptides (vancomycin)'), target: 'Cell wall (D-Ala-D-Ala terminus)',
                    how: 'Bind directly to the D-Ala-D-Ala terminus of peptidoglycan precursors, physically blocking wall assembly. Last-line drug for MRSA + many Gram-positives.',
                    resists: 'VanA/VanB resistance changes the terminus to D-Ala-D-Lac, which vancomycin can\'t bind. VRE (vancomycin-resistant Enterococcus) and VRSA (vancomycin-resistant Staph) are growing problems.',
                    color: '#ef4444' }
                ].map(function(c, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + c.color } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: c.color, marginBottom: 4 } }, c.name),
                    h('div', { style: { fontSize: 10.5, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, 'Target: ' + c.target),
                    h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55, marginBottom: 6 } }, h('strong', null, __alloT('stem.microbiology.how_it_works_2', 'How it works: ')), c.how),
                    h('div', { style: { fontSize: 11, color: '#fca5a5', lineHeight: 1.5, fontStyle: 'italic' } }, h('strong', null, __alloT('stem.microbiology.how_resistance_breaks_it', 'How resistance breaks it: ')), c.resists)
                  );
                })
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.6 } },
                h('strong', null, __alloT('stem.microbiology.key_insight', 'Key insight: ')),
                __alloT('stem.microbiology.antibiotics_that_work_via_the_cell_wal', 'Antibiotics that work via the cell wall (β-lactams, vancomycin) are useless against organisms without a typical bacterial cell wall - including all viruses, fungi, and humans. This is why antibiotics don\'t treat the flu or a cold. The body has no equivalent target.')
              )
            ),
            '#fbbf24'
          ),
          sectionCard('What accelerates resistance',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.8 } },
              h('li', null, __alloT('stem.microbiology.antibiotics_prescribed_for_viral_infec', 'Antibiotics prescribed for viral infections (antibiotics don\'t work on viruses).')),
              h('li', null, __alloT('stem.microbiology.not_finishing_the_full_course_kills_th', 'Using the wrong antibiotic, dose, or duration - including changing a prescription without clinical guidance.')),
              h('li', null, __alloT('stem.microbiology.antibiotics_in_animal_feed_for_growth_', 'Antibiotics in animal feed for growth promotion (now banned in EU; still common elsewhere).')),
              h('li', null, __alloT('stem.microbiology.poor_sanitation_crowded_conditions_in_', 'Poor sanitation + crowded conditions in hospitals + jails + refugee camps.')),
              h('li', null, __alloT('stem.microbiology.lack_of_new_antibiotic_development_the', 'Lack of new antibiotic development. The pipeline has slowed for 40 years.'))
            )
          ),
          sectionCard('What helps',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.8 } },
              h('li', null, h('strong', null, __alloT('stem.microbiology.for_you', 'For you: ')), __alloT('stem.microbiology.take_antibiotics_only_when_prescribed_', 'Use antibiotics only when prescribed and take them exactly as directed. Do not shorten, extend, share, save, or reuse them without clinical guidance.')),
              h('li', null, h('strong', null, __alloT('stem.microbiology.for_the_world', 'For the world: ')), __alloT('stem.microbiology.public_investment_in_new_antibiotic_de', 'Public investment in new antibiotic development. Restrictions on agricultural use. Phage therapy research. Better infection control in hospitals. Vaccines that prevent infection in the first place.')),
              h('li', null, h('strong', null, __alloT('stem.microbiology.big_picture', 'Big picture: ')), __alloT('stem.microbiology.stop_treating_antibiotics_as_a_renewab', 'Stop treating antibiotics as a renewable resource. Each one is a one-shot weapon; once resistance is widespread, that antibiotic is gone forever.'))
            )
          ),

          sectionCard('🎯 Phage therapy - the antibiotic alternative',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.bacteriophages_or_just_phages_are_viru', 'Bacteriophages (or just "phages") are viruses that infect bacteria - and ONLY bacteria, never human cells. The most abundant biological entity on Earth (~10³¹ of them). They were discovered in 1915-17 + used as antibacterial therapy in the Soviet Union throughout the 20th century. Western medicine largely abandoned them after antibiotics took off in the 1940s - but the antibiotic resistance crisis is bringing phage therapy back.')
              ),
              h('div', { style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #6ee7b7', marginBottom: 10 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, __alloT('stem.microbiology.why_phages_are_uniquely_promising', 'Why phages are uniquely promising:')),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
                  h('li', null, h('strong', null, 'Self-replicating: '), __alloT('stem.microbiology.a_single_phage_multiplies_inside_the_b', 'A single phage multiplies inside the bacterial host. One dose can grow into trillions, kill the infection, then disappear as targets run out.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.highly_specific', 'Highly specific: ')), __alloT('stem.microbiology.each_phage_strain_targets_only_one_or_', 'Each phage strain targets only one (or a few) bacterial species - no collateral damage to the gut microbiome. Antibiotics kill broadly; phages are surgical.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.evolvable_in_real_time', 'Evolvable in real time: ')), __alloT('stem.microbiology.when_bacteria_evolve_resistance_to_a_p', 'When bacteria evolve resistance to a phage, scientists can re-isolate phages from sewage or soil that have already evolved counter-resistance. The arms race never stops.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.active_against_biofilms', 'Active against biofilms: ')), __alloT('stem.microbiology.phages_can_penetrate_biofilms_where_an', 'Phages can penetrate biofilms where antibiotics fail. Several phage cocktails specifically target biofilm-forming pathogens.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.free_of_antibiotic_resistance', 'Free of antibiotic resistance: ')), __alloT('stem.microbiology.a_phage_that_kills_mrsa_does_so_by_an_', 'A phage that kills MRSA does so by an entirely different mechanism than methicillin. The MRSA bacteria\'s resistance to the antibiotic is irrelevant.'))
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65, marginBottom: 10 } },
                h('strong', null, __alloT('stem.microbiology.the_complications', 'The complications: ')),
                h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                  h('li', null, h('strong', null, __alloT('stem.microbiology.identification_needed', 'Identification needed: ')), __alloT('stem.microbiology.treatment_requires_knowing_the_exact_b', 'Treatment requires knowing the exact bacterial strain + having a phage that targets it. Takes days for the lab work - sometimes longer than antibiotic empirical treatment would.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.regulatory_pathway', 'Regulatory pathway: ')), __alloT('stem.microbiology.each_phage_cocktail_is_its_own_biologi', 'Each phage cocktail is its own biological product. The FDA + EMA frameworks are designed for chemical drugs, not self-evolving viruses. "Compassionate use" + Phase I/II trials are progressing.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.immune_response', 'Immune response: ')), __alloT('stem.microbiology.the_body_produces_antibodies_against_t', 'The body produces antibodies against the phage over time, neutralizing it. Multiple-dose regimens face this challenge.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.bacterial_defense', 'Bacterial defense: ')), __alloT('stem.microbiology.bacteria_evolve_resistance_to_phages_t', 'Bacteria evolve resistance to phages too (CRISPR is one of their defenses!). Phage cocktails - multiple phages with different targets - are used to slow this.'))
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.where_it_stands_clinically', 'Where it stands clinically: ')),
                __alloT('stem.microbiology.georgia_russia_have_continued_phage_th', 'Georgia + Russia have continued phage therapy clinically since the 1920s (Eliava Institute in Tbilisi treats ~5,000 patients/year). In the US + EU, phage therapy is currently "expanded access" / compassionate use only - given case-by-case for life-threatening multi-drug-resistant infections. ~100+ patients have been treated this way in the US since 2016. Several Phase II clinical trials are running in 2024-25 (Locus Biosciences, Armata Pharmaceuticals, Adaptive Phage Therapeutics, BiomX). First FDA-approved phage product is widely expected within ~5 years.')
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.a_famous_case_2017_san_diego', 'A famous case (2017, San Diego): ')),
                __alloT('stem.microbiology.tom_patterson_a_ucsd_psychiatry_profes', 'Tom Patterson, a UCSD psychiatry professor, contracted a multidrug-resistant Acinetobacter baumannii infection while traveling in Egypt. After 9 months in a coma + every available antibiotic failing, his wife (epidemiologist Steffanie Strathdee) coordinated with Navy + UCSD researchers to compile a personalized phage cocktail from sewage samples around the world. He recovered. The case (documented in their 2019 book "The Perfect Predator") was a turning point in US medical interest in phage therapy.')
              )
            ),
            '#6ee7b7'
          ),

          // ─── Antibiotic chemistry + history + pipeline ──────────
          sectionCard('💊 Antibiotic classes - chemistry, history, and the pipeline problem',
            (function() {
              var ABX = [
                { id: 'beta', name: __alloT('stem.microbiology.beta_lactams_penicillin_family', 'Beta-lactams (penicillin family)'), emoji: '🧪', year: '1928',
                  who: 'Alexander Fleming (penicillin, 1928); Howard Florey + Ernst Chain (purification, 1940); Norman Heatley (production)',
                  chem: 'A four-membered β-lactam ring fused to a five- or six-membered ring. Penicillins (penicillin G, amoxicillin), cephalosporins (cephalexin, ceftriaxone, cefepime, ceftaroline), carbapenems (meropenem, ertapenem), monobactams (aztreonam). The β-lactam ring covalently binds + inactivates penicillin-binding proteins (PBPs) - enzymes that crosslink peptidoglycan in the bacterial cell wall. Bacteria die because they cannot maintain cell-wall integrity during growth.',
                  use: 'Still the largest single class of antibiotics by prescription volume + by infections covered. Carbapenems are "last-line" for many gram-negative infections. Cephalosporins span generations from very narrow-spectrum (1st gen, skin infections) to extended-spectrum (3rd gen, meningitis + sepsis) to anti-MRSA (5th gen, ceftaroline).',
                  resist: 'Bacteria fight back with β-lactamases - enzymes that hydrolyze the β-lactam ring. Extended-spectrum β-lactamases (ESBLs) + carbapenemases (KPC, NDM, OXA-48) defeat even carbapenems. β-lactamase inhibitors (clavulanic acid, tazobactam, avibactam, vaborbactam) restore activity by inhibiting the enzymes.'
                },
                { id: 'amino', name: __alloT('stem.microbiology.aminoglycosides', 'Aminoglycosides'), emoji: '⚙️', year: '1944',
                  who: 'Selman Waksman + Albert Schatz (streptomycin, 1944; Nobel 1952)',
                  chem: 'Sugar-amino-cyclitol compounds. Streptomycin, gentamicin, tobramycin, amikacin, neomycin. They bind irreversibly to the 30S bacterial ribosomal subunit, causing misreading of mRNA + production of nonfunctional proteins. Bactericidal at higher concentrations.',
                  use: 'Streptomycin was the FIRST effective antibiotic against tuberculosis. Modern aminoglycosides are used for serious gram-negative infections (sepsis, hospital-acquired pneumonia, complicated UTI) often in combination with β-lactams. Tobramycin nebulized is standard for cystic fibrosis Pseudomonas infections.',
                  resist: 'Toxicities limit dosing: ototoxicity (permanent hearing loss in 10-30% with prolonged use), nephrotoxicity, neuromuscular blockade. Aminoglycoside-modifying enzymes are the dominant resistance mechanism. Aminoglycoside resistance is rising globally; new derivatives (plazomicin, FDA-approved 2018) extend the class but with the same toxicity profile.'
                },
                { id: 'tetra', name: __alloT('stem.microbiology.tetracyclines_glycylcyclines', 'Tetracyclines + glycylcyclines'), emoji: '🟡', year: '1948',
                  who: 'Benjamin Duggar (chlortetracycline from Streptomyces aureofaciens, 1948)',
                  chem: 'Four fused 6-membered rings - hence "tetra-cycline." Doxycycline (the most-prescribed), minocycline, tetracycline, the newer tigecycline + omadacycline + eravacycline (glycylcyclines, extended-spectrum versions). They bind the 30S ribosomal subunit at a different site than aminoglycosides, blocking tRNA binding. Bacteriostatic - they STOP growth but rely on the immune system to clear the infection.',
                  use: 'Doxycycline is workhorse for Lyme disease, atypical pneumonia (Mycoplasma, Chlamydia), acne, malaria prophylaxis, anthrax post-exposure. Tigecycline is reserved for multi-drug-resistant infections. The class is increasingly important as gram-negative resistance grows.',
                  resist: 'Tetracycline efflux pumps + ribosomal protection proteins are the main resistance mechanisms. Resistance is widespread because tetracyclines have been used in livestock for decades; agricultural use selects for human-pathogen resistance via the One Health pathway.'
                },
                { id: 'macro', name: __alloT('stem.microbiology.macrolides_lincosamides', 'Macrolides + lincosamides'), emoji: '🔄', year: '1952',
                  who: 'Erythromycin discovered by Filipino chemist Abelardo Aguilar working at Eli Lilly (1949-1952); not credited at the time',
                  chem: 'Large macrocyclic lactone rings. Erythromycin, azithromycin (the "Z-pack"), clarithromycin, fidaxomicin. They bind the 50S ribosomal subunit + block protein chain elongation. Mostly bacteriostatic; azithromycin has a long tissue half-life (so 5-day courses give 10-day antibiotic exposure).',
                  use: 'Azithromycin is the most-prescribed antibiotic in the US for outpatient respiratory infections (often inappropriately). Erythromycin + clarithromycin are used for atypical pneumonia, pertussis, gastroparesis. Fidaxomicin is selective for Clostridioides difficile (replaces vancomycin in some C. diff cases).',
                  resist: 'Macrolide resistance is now ~30-50% in US Streptococcus pneumoniae + 50%+ in Mycoplasma genitalium. The "Z-pack overuse" problem is a key driver - most viral respiratory infections do NOT benefit from azithromycin but it is prescribed anyway. FDA + CDC have pushed for antibiotic stewardship campaigns since the 2010s with partial success.'
                },
                { id: 'fluoro', name: __alloT('stem.microbiology.fluoroquinolones', 'Fluoroquinolones'), emoji: '⚡', year: '1962',
                  who: 'George Lesher at Sterling-Winthrop (nalidixic acid, 1962); ciprofloxacin developed by Bayer in 1981',
                  chem: 'Fluorinated quinolone ring system. Ciprofloxacin, levofloxacin, moxifloxacin, delafloxacin. They inhibit bacterial DNA gyrase + topoisomerase IV, blocking DNA replication. Bactericidal across a broad spectrum.',
                  use: 'Once heavily prescribed for UTI, prostatitis, atypical pneumonia, anthrax, travelers\' diarrhea. Now used much more cautiously. The FDA has issued multiple Black Box Warnings since 2016 - tendon rupture (especially Achilles), peripheral neuropathy, retinal detachment, aortic aneurysm + dissection, mental health effects. Some patients develop permanent disability ("floxed" community organizes around fluoroquinolone toxicity).',
                  resist: 'Resistance accumulates by point mutations in gyrase + topo IV. E. coli UTI resistance to ciprofloxacin is now ~25-35% in the US, making it an unreliable first-line choice. The new agent delafloxacin (FDA 2017) has good activity vs MRSA but the class as a whole has been demoted in many guidelines.'
                },
                { id: 'glyco', name: __alloT('stem.microbiology.glycopeptides_lipoglycopeptides', 'Glycopeptides + lipoglycopeptides'), emoji: '🛡️', year: '1958',
                  who: 'Vancomycin isolated from Streptomyces orientalis (Borneo soil sample, 1953); approved 1958',
                  chem: 'Large glycopeptide molecules. Vancomycin, teicoplanin, telavancin, oritavancin, dalbavancin. They bind the D-Ala-D-Ala terminus of peptidoglycan precursors, preventing crosslinking - a different mechanism than β-lactams.',
                  use: 'Vancomycin has been the workhorse for MRSA + serious gram-positive infections for 60+ years. It is given IV for systemic infections + orally for severe C. difficile colitis. Daptomycin (FDA 2003), a lipopeptide, is now another major MRSA option.',
                  resist: 'Vancomycin-resistant Enterococcus (VRE) emerged in the 1980s; vancomycin-resistant Staphylococcus aureus (VRSA) is rare but exists (~16 confirmed cases worldwide). The resistance mechanism (changing D-Ala-D-Ala to D-Ala-D-Lac) was likely acquired by horizontal transfer from soil organisms that naturally make vancomycin-like compounds.'
                },
                { id: 'newer', name: __alloT('stem.microbiology.newer_classes_oxazolidinones_others', 'Newer classes (oxazolidinones + others)'), emoji: '🆕', year: '2000',
                  who: 'Linezolid (Pharmacia, 2000); newer agents over the past 25 years',
                  chem: 'Linezolid + tedizolid (oxazolidinones, bind 50S ribosome at a unique site). Lefamulin (pleuromutilin, FDA 2019). Eravacycline + omadacycline (extended tetracyclines). Plazomicin (aminoglycoside, 2018). Cefiderocol (siderophore cephalosporin, 2019 - hijacks bacterial iron-uptake to deliver itself across the outer membrane of gram-negatives).',
                  use: 'Mostly reserved for multi-drug-resistant or otherwise-difficult cases. Cefiderocol is among the few options against carbapenem-resistant Acinetobacter + Pseudomonas. Linezolid is used for VRE + MRSA when other options fail.',
                  resist: 'Linezolid resistance has appeared (cfr gene mediates it). Resistance to every new agent emerges within years of introduction. The pace of new antibiotic discovery has slowed dramatically: the last truly novel antibiotic class (pleuromutilins for systemic use was lefamulin in 2019) was approved 5+ years ago, and the pipeline is alarmingly thin.'
                },
                { id: 'pipeline', name: __alloT('stem.microbiology.why_the_pipeline_is_empty', 'Why the pipeline is empty'), emoji: '🏚️', year: 'Ongoing crisis',
                  who: 'The pharmaceutical-economics problem',
                  chem: 'New antibiotic development is unprofitable. A new chronic-disease medicine generates $1-10B+ over its patent lifetime; a new antibiotic typically generates $20-100M. Reasons: (1) antibiotics are SHORT-COURSE (5-14 days, not lifelong), (2) doctors RESERVE new antibiotics for resistant cases, reducing volume, (3) generics dominate the market once patents expire (the older antibiotics are mostly off-patent + cheap).',
                  use: 'In the past 20 years, 6 of the world\'s top 10 pharma companies have EXITED antibiotic research entirely (Roche, Eli Lilly, GSK, Sanofi, Novartis, Bristol-Myers Squibb). Small biotechs that develop new antibiotics often go bankrupt before or shortly after FDA approval (Achaogen + Aradigm + Tetraphase all failed despite approved products). The vacuum is genuine + dangerous.',
                  resist: 'Solutions being tried: PUSH funding (NIH BARDA + CARB-X grants for early R&D), PULL funding (UK NHS subscription model paying for access rather than per-dose, EU + US PASTEUR Act proposals). Phage therapy + monoclonal antibodies + anti-virulence drugs offer adjuncts but cannot replace the antibiotic class. Antibiotic stewardship (using existing drugs more carefully to slow resistance) is the most actionable short-term lever. None of this is a fix; collectively it may slow the crisis enough that new mechanisms emerge.'
                }
              ];
              var sel = d.selectedAbx || 'beta';
              var topic = ABX.find(function(t) { return t.id === sel; }) || ABX[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.antibiotics_are_not_a_single_drug_they', 'Antibiotics are not a single drug; they are roughly a dozen chemical classes with completely different mechanisms, spectrums, toxicities, and resistance patterns. Understanding the classes helps make sense of why doctors prescribe what they do, why courses sometimes change, and why the world is facing a slow-motion crisis in antibiotic discovery + use.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  ABX.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedAbx: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#6ee7b7' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #6ee7b7' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(110,231,183,0.06)', border: '1px solid rgba(110,231,183,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#6ee7b7', marginBottom: 2 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 10, fontStyle: 'italic' } }, 'First introduced: ' + topic.year + ' · ' + topic.who),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(59,130,246,0.06)', borderLeft: '3px solid #3b82f6', marginBottom: 8 } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.chemistry_mechanism', 'Chemistry + mechanism')),
                    h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, topic.chem)
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.06)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.clinical_use', 'Clinical use')),
                    h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, topic.use)
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', borderLeft: '3px solid #ef4444' } },
                    h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.resistance_limits', 'Resistance + limits')),
                    h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, topic.resist)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_honest_stewardship_message', 'The honest stewardship message: ')),
                  __alloT('stem.microbiology.the_most_important_thing_any_individua', 'The most important thing any individual + healthcare system can do is USE EXISTING ANTIBIOTICS APPROPRIATELY: not for viral infections (most colds, flu, most sore throats, most bronchitis), only for the right organism in the right dose for the right duration, with culture confirmation when possible. Every inappropriate course shortens the useful life of the entire class. CDC Be Antibiotics Aware + WHO World Antimicrobial Awareness Week campaigns reinforce this. School nurses + counselors are positioned to support family conversations about this without dismissing genuine illness.')
                )
              );
            })(),
            '#6ee7b7'
          ),

          // ─── Public health surveillance ──────────────────────────
          sectionCard('🏛️ Public health surveillance - how we watch for outbreaks',
            (function() {
              var SURV_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.what_surveillance_is', 'What surveillance is'), emoji: '🔭',
                  body: __alloT('stem.microbiology.public_health_surveillance_is_the_ongo', 'Public health surveillance is the ongoing systematic collection, analysis, and interpretation of health data - used to plan, implement, and evaluate public health practice. It is the immune system of a community. Categories: PASSIVE surveillance (clinicians report cases to health departments - standard for ~100+ reportable diseases including TB, HIV, measles, salmonella, hepatitis), ACTIVE surveillance (health workers proactively go look for cases - used during outbreaks), SYNDROMIC surveillance (counting symptoms or hospital visits in real time, sometimes before specific diagnosis - used after 9/11 + during COVID), SENTINEL surveillance (selected clinics report intensively, used for flu via the US Influenza Sentinel Provider Network), and ENVIRONMENTAL surveillance (wastewater, air, water, food testing).'),
                  caveat: 'Surveillance only works if (a) clinicians + labs report cases (often hard to enforce; in some US states reporting rates for certain diseases are below 50%), (b) the data gets to public health staff with time to act, (c) public health authorities have the power + capacity to respond. A surveillance system that detects an outbreak but cannot trigger a response is a tragic kind of theater.'
                },
                { id: 'wastewater', name: __alloT('stem.microbiology.wastewater_surveillance', 'Wastewater surveillance'), emoji: '🚰',
                  body: __alloT('stem.microbiology.sewage_carries_traces_of_every_infecti', 'Sewage carries traces of every infection passing through a community\'s gut + respiratory tract. By sampling wastewater treatment plant influent + analyzing it with quantitative PCR or sequencing, public health can detect polio, hepatitis A, salmonella, norovirus, and (since 2020) SARS-CoV-2 - often days BEFORE clinical cases peak. The CDC National Wastewater Surveillance System (NWSS) now covers ~1500 sites across all 50 states + the District of Columbia. Wastewater data caught the second + third COVID waves, the 2022-2023 RSV surge, mpox in 2022, polio reintroduction in New York 2022, and is now monitoring for H5N1 (bird flu) routinely.'),
                  caveat: 'Wastewater surveillance is anonymous + non-invasive, which is a real strength. It is also limited: small communities don\'t have central sewer systems; rural + tribal areas are systematically undercovered; some pathogens don\'t shed reliably in stool. Wastewater tells you "something is happening in this community" but cannot identify WHO. That is a feature for privacy, a limit for targeted intervention.'
                },
                { id: 'contact', name: __alloT('stem.microbiology.contact_tracing', 'Contact tracing'), emoji: '🕸️',
                  body: __alloT('stem.microbiology.contact_tracing_identifies_notifies_pe', 'Contact tracing identifies + notifies people who have been exposed to a confirmed case so they can monitor symptoms, quarantine, get tested, or get prophylactic treatment. The technique was pioneered for syphilis in the 1930s + scaled massively for tuberculosis + HIV. Effective for diseases with relatively long incubation + identifiable exposure events. COVID-19 contact tracing was attempted at large scale in 2020-2021 with mixed results: where infection rates stayed low (initial wave, Vermont, New Zealand), it worked; where infection became widespread, the workforce was overwhelmed + contacts had often already exposed others before being notified. Effective contact tracing requires trust between communities + public health (often missing for marginalized populations) + adequate workforce.'),
                  caveat: 'Contact-tracing apps (Apple/Google Exposure Notification, various national apps) were tried during COVID. Their performance was mixed - uptake was generally too low to substantially change transmission dynamics. Privacy concerns + accuracy concerns were both real. The lesson: technology can supplement human tracing but cannot replace community trust + adequate staffing.'
                },
                { id: 'pulsenet', name: __alloT('stem.microbiology.genomic_surveillance_pulsenet', 'Genomic surveillance + PulseNet'), emoji: '🧬',
                  body: __alloT('stem.microbiology.pulsenet_is_a_network_of_us_public_hea', 'PulseNet is a network of US public health + food regulatory labs that fingerprint bacterial isolates from foodborne illness cases. Starting with pulsed-field gel electrophoresis in 1996 + now using whole-genome sequencing, PulseNet routinely identifies clusters of genetically related cases across multiple states - revealing outbreaks that would have been invisible (each state seeing only a few cases). PulseNet has detected hundreds of multistate outbreaks of E. coli, salmonella, listeria, campylobacter, cyclospora. The network catches contamination at central food processors + has cut typical outbreak detection time from weeks to days. GenomeTrakr is the parallel network for environmental + food samples.'),
                  caveat: 'Genomic surveillance is now standard for foodborne disease in the US + many wealthy countries. It is much less developed in low- + middle-income countries, where the disease burden is much higher. WHO\'s Global Antimicrobial Resistance Surveillance System (GLASS) is trying to extend coverage but capacity remains uneven. The pathogens that emerge globally typically emerge from regions with the weakest surveillance.'
                },
                { id: 'onehealth', name: __alloT('stem.microbiology.one_health_framework', 'One Health framework'), emoji: '🌍',
                  body: __alloT('stem.microbiology.most_emerging_human_infections_come_fr', 'Most emerging human infections come from animals - Ebola, HIV, SARS, MERS, COVID-19, mpox, influenza, Lyme, West Nile, hantavirus. The One Health framework recognizes that human + animal + environmental health are inseparable: pathogens cross species barriers, antibiotic use in livestock drives resistance in human pathogens, climate change shifts disease vectors, deforestation increases human-wildlife contact. CDC, USDA, FDA, EPA, WHO, FAO, and OIE (World Organisation for Animal Health) increasingly coordinate. Practical examples: monitoring wildlife reservoirs for spillover risk (the Predict program, 2009-2020, identified ~1000 new viruses), surveillance of pig + poultry farms for novel influenza strains, watching tick populations for emerging Borrelia + Babesia species.'),
                  caveat: 'One Health is intellectually sound + funding-poor. Most public health infrastructure was built around human-only categories; integrating animal + environmental surveillance requires breaking institutional silos. Progress is real but slow. Pandemic risk is genuinely reducible with adequate One Health investment; the world\'s collective investment is genuinely inadequate.'
                },
                { id: 'mortality', name: __alloT('stem.microbiology.excess_mortality_cause_of_death_survei', 'Excess mortality + cause-of-death surveillance'), emoji: '📋',
                  body: __alloT('stem.microbiology.excess_mortality_is_the_difference_bet', 'Excess mortality is the difference between observed deaths (during a crisis or pandemic) + the expected baseline. It is a key surveillance output, often more accurate than confirmed-case counting (which depends on testing + reporting capacity that can be overwhelmed). The COVID-19 pandemic excess-mortality estimate worldwide is ~20-30 million deaths (2020-2024), well above the ~7 million CONFIRMED COVID deaths. Many of those excess deaths were COVID; some were collateral (delayed cancer treatment, disrupted maternal care, untreated chronic disease, mental health crises). Some were UNDERCOUNTING countries with weak vital statistics. The Economist + Lancet COVID Commission both produce excess-mortality dashboards.'),
                  caveat: 'Excess mortality is a clearer signal of total pandemic impact than confirmed-case counts. But it does not distinguish DIRECT vs INDIRECT effects without further analysis. And in countries without solid baseline vital statistics, the baseline itself is uncertain. The number remains the best single integrative measure of "what really happened" during a major health event.'
                },
                { id: 'epi', name: __alloT('stem.microbiology.epidemiologists_do_this_work', 'Epidemiologists do this work'), emoji: '🩺',
                  body: __alloT('stem.microbiology.the_professionals_who_run_surveillance', 'The professionals who run surveillance systems are epidemiologists, infection-prevention specialists, biostatisticians, lab scientists, public health nurses, and the Disease Detectives (CDC Epidemic Intelligence Service, EIS). EIS is a 2-year postdoctoral program founded in 1951; alumni have led most major US outbreak investigations of the past 70 years (the 1976 Legionnaire\'s outbreak, the 1981 HIV cluster recognition, the 1993 Sin Nombre hantavirus outbreak, the 2014 Ebola response, COVID-19). State + local health departments do the bulk of routine surveillance with thin budgets + small teams. CDC + FDA provide reference labs + multi-state outbreak coordination.'),
                  caveat: 'Public health workforce in the US has shrunk steadily for decades. ~50,000 state + local public health workers lost between 2008 + 2019; partial regrowth post-COVID. Many counties have 1-2 public-health staff covering 100,000+ population. The workforce gap is one reason the US response to COVID was uneven; it remains a serious vulnerability for the next emergency.'
                },
                { id: 'trust', name: __alloT('stem.microbiology.the_trust_politics_layer', 'The trust + politics layer'), emoji: '⚖️',
                  body: __alloT('stem.microbiology.surveillance_depends_on_public_trust_p', 'Surveillance depends on public trust + political support. Both are fragile. The COVID-19 era saw historic erosion of public health trust in the US, with sustained attacks on public health agencies + workers (CDC, state health officers, Fauci, local school nurses). Vaccination rates for routine childhood diseases (measles, whooping cough) have dropped since 2020; measles outbreaks in unvaccinated communities are now annual events. Surveillance data shared publicly during COVID was sometimes weaponized by political actors against vulnerable communities. Building back trust is a long-term + uncertain project. School psychologists + counselors are sometimes the most-trusted public-health-adjacent figures in a community; that role matters.'),
                  caveat: 'Public health is inherently political in the sense that it concerns COLLECTIVE health + requires COLLECTIVE action. That is not a flaw; that is its nature. But politicization that undermines surveillance, vaccination, or response capacity costs lives. Honest engagement with skepticism (rather than dismissal) + careful communication of what is known vs uncertain are the only paths forward. Lecturing + shaming have a long track record of failure.'
                }
              ];
              var sel = d.selectedSurv || 'overview';
              var topic = SURV_TOPICS.find(function(t) { return t.id === sel; }) || SURV_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.you_do_not_see_public_health_surveilla', 'You do not see public health surveillance until it fails. The systems that scan wastewater for polio, sequence E. coli outbreaks to find their source, trace contacts during an Ebola scare, and track excess mortality in real time during a pandemic are how a society defends itself against infectious disease. They are also chronically underfunded, institutionally fragmented, and politically vulnerable. School-based health workers + counselors are often the closest most students get to the system.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  SURV_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedSurv: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#0ea5e9' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #0ea5e9' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#7dd3fc', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_3', 'Honest framing: ')), topic.caveat
                  )
                )
              );
            })(),
            '#0ea5e9'
          )
        );
      }

      // MICROBIOME
      function renderMicrobiome() {
        var selected = MICROBIOME.find(function(m) { return m.id === d.selectedMicrobiome; }) || MICROBIOME[0];
        var STAGES = [
          { id: 'preg', name: __alloT('stem.microbiology.in_utero', 'In utero'), age: '0-9 months', color: '#a855f7',
            what: 'Long believed STERILE, this view is now being revised. Some bacterial DNA has been detected in placenta + amniotic fluid (still contested - may be contamination). The fetus is largely shielded from environmental microbes. The mother\'s microbiome shapes what the baby will be exposed to at birth.',
            shape: 'Maternal diet during pregnancy, antibiotic use, gestational diabetes, mode of stress all influence the baby\'s eventual microbiome trajectory.'
          },
          { id: 'birth', name: __alloT('stem.microbiology.birth_first_6_months', 'Birth + first 6 months'), age: '0-6 mo', color: '#ec4899',
            what: 'The critical seeding event. VAGINAL birth coats the baby in maternal vaginal + fecal microbes (Lactobacillus, Bifidobacterium dominate). CESAREAN birth seeds primarily skin microbes (Staphylococcus, Streptococcus) - a very different community. Breast milk delivers Bifidobacterium PLUS specific oligosaccharides (HMOs) that ONLY those bacteria can digest - milk literally feeds the bacteria that protect the baby.',
            shape: 'Mode of birth, antibiotic exposure (intrapartum or postnatal), breastfeeding vs formula, family pets, household biodiversity. The first 6 months of microbiome establishment correlate strongly with later asthma + allergy risk.'
          },
          { id: 'weaning', name: __alloT('stem.microbiology.solid_food_introduction', 'Solid food introduction'), age: '6 mo - 2 yr', color: '#22c55e',
            what: 'Solid food → diversification. The infant gut goes from a milk-adapted community (Bifidobacterium-dominated) to an adult-like community (Bacteroidetes + Firmicutes-dominated). Fiber arrives + feeds fiber-fermenters. The full adult microbial diversity is reached around age 3.',
            shape: 'Diet variety, sugar consumption (high sugar suppresses Bifidobacterium), antibiotic courses (each one can permanently shift the trajectory), household + childcare environment.'
          },
          { id: 'child', name: __alloT('stem.microbiology.childhood_teens', 'Childhood + teens'), age: '2-18', color: '#10b981',
            what: 'Microbiome composition is relatively stable but plastic. Each major dietary change (more carbs, more protein, more sugar, more fiber) shifts community composition within days. The "core" microbiome - about 30-40 species making up the majority - persists in most people.',
            shape: 'Diet (the biggest single lever), antibiotic use, physical activity (active kids have more diverse gut microbiomes), pets + outdoor time, stress, sleep.'
          },
          { id: 'adult', name: __alloT('stem.microbiology.adulthood', 'Adulthood'), age: '18-65', color: '#0ea5e9',
            what: 'Relatively stable in a healthy person on a stable diet. Major life events (giving birth, immigration to a new country, severe illness, sustained dietary change) can shift the community for years. The Western "industrialized" microbiome (low fiber, high processed food) is consistently less diverse than traditional or non-industrialized populations.',
            shape: 'Diet remains dominant. Geography + culture + occupation. Acute illness + antibiotics. Major life stress. Pregnancy (for those who carry it) is the biggest natural perturbation.'
          },
          { id: 'preg2', name: __alloT('stem.microbiology.pregnancy_the_pregnant_adult', 'Pregnancy (the pregnant adult)'), age: 'during pregnancy', color: '#fbbf24',
            what: 'Maternal microbiome shifts dramatically - gut Bifidobacterium increases, vaginal Lactobacillus increases, oral microbiome shifts toward inflammation-promoting species (which is why dental care matters in pregnancy). These shifts likely tune the maternal immune system to tolerate the developing fetus.',
            shape: 'Maternal diet, weight gain, antibiotic exposure, pre-existing conditions. The microbiome the mother carries during pregnancy is what seeds the baby at birth.'
          },
          { id: 'aging', name: __alloT('stem.microbiology.aging_65', 'Aging (65+)'), age: '65+', color: 'var(--allo-stem-text-soft, #94a3b8)',
            what: 'Microbiome diversity tends to DECLINE with age in industrialized populations. Specific bacteria associated with anti-inflammatory function (Faecalibacterium, Akkermansia) decrease. "Inflammaging" - chronic low-grade inflammation - is partly mediated by microbiome changes. Diet quality + activity level have outsized impact in older adults.',
            shape: 'Diet (especially fiber + plant variety, since older adults often reduce diversity unintentionally), polypharmacy (most drugs alter the gut microbiome), constipation, hospitalization, social isolation (less microbial exchange).'
          },
          { id: 'centenarian', name: __alloT('stem.microbiology.centenarians', 'Centenarians'), age: '100+', color: '#f59e0b',
            what: 'People who reach 100+ in good health have distinctive microbiomes - often retaining diversity + anti-inflammatory bacteria more typical of much younger people. Studies of centenarian populations in Italy, Japan, Sardinia, and Costa Rica show similar "youthful microbiome" patterns despite different diets.',
            shape: 'Lifelong diet + activity + stress + genetics + sociality. Centenarians often have particularly rich social networks, which correlates with microbial diversity (social contact = microbial exchange).'
          }
        ];
        var sel = STAGES.find(function(s) { return s.id === d.selectedLifeStage; }) || STAGES[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            __alloT('stem.microbiology.a_microbiome_is_the_community_of_micro', 'A microbiome is the community of microbes in a particular environment. The human microbiome is now recognized as an organ - collectively essential for health, with disruption linked to obesity, diabetes, autoimmune disease, allergies, and mood disorders. Different from any individual organ: it is many species cooperating + competing + co-evolving with the host.')
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
            MICROBIOME.map(function(m) {
              var active = d.selectedMicrobiome === m.id;
              return h('button', { key: m.id,
                onClick: function() { upd({ selectedMicrobiome: m.id }); },
                style: { padding: '6px 12px', borderRadius: 8, background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), color: active ? '#6ee7b7' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, m.name);
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)' } },
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase' } }, __alloT('stem.microbiology.count', 'Count')),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)' } }, selected.count)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)' } },
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', textTransform: 'uppercase' } }, __alloT('stem.microbiology.species', 'Species')),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)' } }, selected.species)
              )
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } }, selected.what),
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.what_shapes_it', 'What shapes it')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.shaped)
            )
          ),

          sectionCard('🌱 The microbiome across a lifespan',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.the_gut_microbiome_assembles_in_infanc', 'The gut microbiome assembles in infancy, reaches adult-like complexity around age 3, remains relatively stable through adulthood, and tends to decline in diversity with age. Each life stage has characteristic microbial patterns + characteristic interventions that shape them.')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                STAGES.map(function(s) {
                  var active = (d.selectedLifeStage || STAGES[0].id) === s.id;
                  return h('button', { key: s.id,
                    onClick: function() { upd({ selectedLifeStage: s.id }); },
                    style: { padding: '8px 12px', borderRadius: 8, background: active ? s.color + '33' : '#1e293b', border: '1px solid ' + (active ? s.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                  },
                    h('div', null, s.name),
                    h('div', { style: { fontSize: 10, opacity: 0.75, fontWeight: 500, marginTop: 2 } }, s.age)
                  );
                })
              ),
              h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap' } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color } }, sel.name),
                  h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } }, sel.age)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.what_s_happening', 'What\'s happening')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, sel.what)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.what_shapes_it_2', 'What shapes it')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, sel.shape)
                )
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.the_first_1_000_days', 'The first 1,000 days: ')),
                __alloT('stem.microbiology.conception_2nd_birthday_the_most_conse', 'Conception → 2nd birthday. The most consequential window for microbiome shaping. Vaginal vs cesarean birth, breastfeeding duration, antibiotic exposure, daycare attendance, household pets - all influence the microbiome the child carries into adulthood. Many adult health outcomes (asthma, allergies, autoimmune conditions, obesity risk) correlate with first-1,000-day microbial events. Interventions to support healthy infant microbiome assembly (vaginal seeding for C-section babies, careful antibiotic stewardship, breastfeeding support) are actively researched + sometimes practiced.')
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.what_you_can_do_at_any_life_stage', 'What you can do, at any life stage: ')),
                __alloT('stem.microbiology.eat_30_different_plant_species_per_wee', 'Eat 30+ different plant species per week (the strongest single predictor of gut microbiome diversity in the American Gut Project + similar studies). Limit antibiotic use to clear medical necessity. Sleep enough. Maintain social contact + outdoor time. Manage chronic stress. Consume fermented foods regularly. Reduce ultra-processed foods. The microbiome is one of the most modifiable aspects of human health - most days you make food + lifestyle choices that shape it.')
              )
            ),
            '#a855f7'
          ),

          // ─── Human virome ────────────────────────────────────────
          sectionCard('🧬 The human virome - viruses inside us all the time',
            (function() {
              var VIROME_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.what_the_virome_is', 'What the virome is'), emoji: '🌐',
                  body: __alloT('stem.microbiology.when_we_talk_about_the_microbiome_most', 'When we talk about "the microbiome," most coverage is about bacteria. But for every bacterial cell in or on the human body, there are roughly 10× more virus particles. The human virome is the total collection of viruses living in us: bacteriophages (viruses that infect our gut + skin + oral bacteria, vastly outnumbering everything else), eukaryotic viruses (those that infect our human cells, including persistent latent ones), and endogenous retroviruses (viral DNA permanently integrated into our genome from infections in our distant ancestors). Most virome residents are not making us sick. Many appear to be neutral or even beneficial. We are walking, eating, sleeping ecosystems.'),
                  caveat: 'Virome science is younger + harder than bacterial-microbiome science. Viruses have no universal gene (no equivalent to bacterial 16S rRNA) you can amplify to ID them. Sequencing approaches must shotgun-sequence everything + then try to identify viral sequences against incomplete databases. Most virome sequences are STILL unidentified ("viral dark matter"); a typical gut virome metagenomic survey returns 50-90% sequences with no database match.'
                },
                { id: 'phages', name: __alloT('stem.microbiology.bacteriophages_in_us', 'Bacteriophages in us'), emoji: '🦠',
                  body: __alloT('stem.microbiology.bacteriophages_phages_are_viruses_that', 'Bacteriophages ("phages") are viruses that infect bacteria. They are the most numerous biological entities on Earth - about 10³¹ phage particles globally, more than all bacteria + plants + animals combined. The human gut alone contains an estimated 10¹⁴ phage particles, dwarfing our ~10¹³ bacterial cells. Most are dsDNA phages of the Caudovirales (tailed phages); a smaller fraction are crAssphage + other newly-discovered groups. Phages are constantly killing some gut bacteria + leaving others alone, shaping bacterial community composition at the species + strain level. Some phages are "temperate" (they integrate into the bacterial genome + sometimes carry virulence or antibiotic-resistance genes around).'),
                  caveat: 'Phage therapy (using specific phages to kill specific pathogenic bacteria) is being re-explored for antibiotic-resistant infections. Western medicine largely abandoned it in the 1940s when antibiotics came along; Eastern European countries (especially Georgia, the Eliava Institute in Tbilisi) continued. As antibiotic resistance worsens, Western interest has returned. A handful of dramatic case reports (e.g., the 2017 Patterson case at UC San Diego, where a phage cocktail saved a man dying of multidrug-resistant Acinetobacter) have driven new clinical trials. Real promise; not yet a mainstream therapy.'
                },
                { id: 'latent', name: __alloT('stem.microbiology.latent_persistent_viruses', 'Latent persistent viruses'), emoji: '😴',
                  body: __alloT('stem.microbiology.after_acute_infection_many_viruses_do_', 'After acute infection, many viruses do not actually leave. Herpes simplex (HSV-1, HSV-2), varicella-zoster (chickenpox, which reactivates as shingles), Epstein-Barr (mononucleosis), cytomegalovirus (CMV), and human herpesviruses 6/7/8 all establish lifelong latent infections. They are usually controlled by the immune system + cause no disease, but can reactivate during immunosuppression, stress, or aging. Adult Americans typically carry at least 4-8 different lifelong viral infections without symptoms. Anelloviruses (Torque Teno Virus + relatives) are present in essentially 100% of healthy adults at varying titers; their function is unknown.'),
                  caveat: 'The line between "harmless lifelong passenger" + "subtly contributing to chronic disease" is fuzzy. EBV → multiple sclerosis (Bjornevik 2022). HHV-6A → MS + possibly some cases of chronic fatigue syndrome. CMV → modest accelerated immunosenescence + cardiovascular risk. We do not yet know how much of "normal aging" is partly driven by the lifelong work of suppressing latent viruses.'
                },
                { id: 'ervs', name: __alloT('stem.microbiology.endogenous_retroviruses_the_genome_s_p', 'Endogenous retroviruses (the genome\'s past)'), emoji: '🧬',
                  body: __alloT('stem.microbiology.about_8_of_the_human_genome_consists_o', 'About 8% of the human genome consists of endogenous retroviruses (ERVs) - DNA sequences from ancient retroviral infections that successfully integrated into germ-line cells (sperm + eggs) of our distant ancestors, were passed on, and have remained in the genome ever since. To put 8% in perspective: only about 1.5% of the genome is protein-coding genes. We carry more ancient retrovirus DNA than we carry the DNA that codes for our proteins. Most ERVs are degraded by mutation + no longer make functional viruses, but some retain partial function. ERV proteins are USED by our cells for some normal functions - the syncytin proteins (from ancient retroviruses) are essential for forming the placenta in mammals; without them, mammalian pregnancy as we know it could not exist.'),
                  caveat: 'ERVs occasionally reactivate in disease states - some cancers, some autoimmune conditions (lupus, MS), some neurodegenerative diseases show elevated ERV transcription. Whether ERVs are CAUSING those conditions or merely co-traveling with the dysregulation is mostly unsettled. Don\'t panic about ERV transcription; investigate it.'
                },
                { id: 'whoseviome', name: __alloT('stem.microbiology.whose_virome_are_you', 'Whose virome are you?'), emoji: '👥',
                  body: __alloT('stem.microbiology.each_person_s_virome_is_highly_individ', 'Each person\'s virome is highly individualized. Two people sharing a household for years end up with overlapping but not identical bacterial AND viral communities. Partners + family members share more phage strains than strangers. Diet, geography, antibiotic history, and (probably) genetics + ethnicity all shape virome composition. Newborns get their first viruses from mom (vaginal + breastmilk transmission of phages + some eukaryotic viruses); children diverge from their mothers\' viromes over years of independent acquisition. By adulthood, your virome is more uniquely yours than your bacterial microbiome (because viral strains evolve fast in vivo).'),
                  caveat: 'Forensic identification by virome signature has been demonstrated experimentally - your unique phage fingerprint could in principle identify you. This is interesting science + has obvious privacy implications. Currently impractical for routine forensics, but as sequencing gets cheaper, the ethics conversation is worth starting now rather than after the fact.'
                },
                { id: 'disease', name: __alloT('stem.microbiology.when_the_virome_goes_wrong', 'When the virome goes wrong'), emoji: '⚠️',
                  body: __alloT('stem.microbiology.specific_virome_shifts_have_been_assoc', 'Specific virome shifts have been associated with several diseases. (a) Inflammatory bowel disease (Crohn\'s, ulcerative colitis) shows expanded Caudovirales phage diversity in some studies - possibly cause, possibly consequence of the disease. (b) Type 1 diabetes onset has been linked to enterovirus infections, particularly Coxsackie B viruses, in some prospective cohort studies (TEDDY study). (c) Chronic fatigue syndrome / ME has been linked to multiple viral triggers (EBV, HHV-6A, enteroviruses, and most recently SARS-CoV-2) - likely a heterogeneous syndrome with multiple potential triggers + a common downstream pathway. (d) Long COVID appears in at least some patients to involve persistent viral reservoirs + immune dysregulation; emerging evidence suggests reactivation of latent EBV + HHV-6 in subsets.'),
                  caveat: 'The replicability problem is real. Many "the virome causes disease X" studies do not replicate in independent cohorts. The field is grappling with technical (sequencing artifacts, contamination, viral databases incomplete) + biological (the virome varies day-to-day; one snapshot may be unrepresentative) limits. Take any single virome-disease headline with appropriate skepticism + wait for replication.'
                },
                { id: 'covid', name: __alloT('stem.microbiology.what_covid_taught_us', 'What COVID taught us'), emoji: '🦠',
                  body: __alloT('stem.microbiology.sars_cov_2_has_been_the_most_studied_v', 'SARS-CoV-2 has been the most-studied virome event in human history. Real-time tracking via wastewater + genomic sequencing showed virome biology at a scale + speed previously unimaginable. Lessons: (a) Persistent infection happens (long COVID; viral RNA detected in tissues months-years after acute illness in some patients). (b) Latent virus reactivation is a real phenomenon (EBV, VZV, HHV-6 reactivation rates appear elevated in long COVID). (c) Coronaviruses + other respiratory viruses leave epigenetic + immune-cell-population imprints that may last years (the "immune dysregulation" framing). (d) The next pandemic will probably come from the virome - either a re-emergence of a known virus in a new host, or a spillover from animal reservoirs we have been undersurveying.'),
                  caveat: 'COVID also showed how fragile public-health trust is, how badly scientific uncertainty communicates in real-time crises, and how political the "follow the science" framing actually is. As school psychologists + educators we owe students an honest account: science behaved as designed (revising as evidence accumulated) while the politics + communication around it were often poor.'
                },
                { id: 'limits', name: __alloT('stem.microbiology.honest_limits_of_virome_science', 'Honest limits of virome science'), emoji: '🚧',
                  body: __alloT('stem.microbiology.we_can_sequence_viral_genomes_by_the_m', 'We can sequence viral genomes by the millions per year. We can NOT yet (a) culture most of the viruses we detect (they only grow on their natural hosts, which we cannot maintain in lab), (b) confidently distinguish "viral signal" from "lab contamination + reagent kit ambient virus," (c) interpret the function of most viral genes (the proteins look like nothing we have studied), (d) reliably tell whether a virus seen in a sample is causative, opportunistic, or just a passenger. Microbiome studies have hit the same wall + been partly transformed by better controls; virome science is roughly where microbiome science was 15 years ago. The next decade should be transformative.'),
                  caveat: 'Be skeptical of confident claims about "the role of the virome" in any specific disease. Be open to surprises. Both can be true at once. The honest professional stance is: this is a frontier; the answers are coming; we are not there yet.'
                }
              ];
              var sel = d.selectedVirome || 'overview';
              var topic = VIROME_TOPICS.find(function(t) { return t.id === sel; }) || VIROME_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  'You are not just you. You are also a few hundred trillion virus particles, a few thousand viral species, the descendants of ancient retroviruses written permanently into your DNA, and a handful of latent infections kept quiet by your immune system. The virome is the OTHER half of microbiome biology - and one of the fastest-moving frontiers in medicine.'
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  VIROME_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedVirome: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#8b5cf6' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #8b5cf6' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.what_we_should_not_overstate_2', 'What we should not overstate: ')), topic.caveat
                  )
                )
              );
            })(),
            '#8b5cf6'
          ),

          // ─── Gut-brain axis ──────────────────────────────────────
          sectionCard('🧠 The gut-brain axis - bacteria and behavior',
            (function() {
              var GBA_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.what_the_gut_brain_axis_is', 'What the gut-brain axis is'), emoji: '🛤️',
                  body: __alloT('stem.microbiology.the_gut_the_brain_are_connected_by_sev', 'The gut + the brain are connected by several physical channels, all running constantly. The vagus nerve carries about 100 million sensory neurons from the gut to the brainstem (about 80% of vagus fibers go UP from gut → brain, only 20% go DOWN from brain → gut). The enteric nervous system itself - about 500 million neurons in the gut wall, sometimes called the "second brain" - operates with substantial autonomy. Gut bacteria + their metabolites enter the bloodstream + cross or signal across the blood-brain barrier. Immune signaling from gut-resident immune cells communicates with the brain via cytokines. Hormonal signaling (e.g., bacteria-influenced bile acids, hormones from gut endocrine cells) feeds back into central regulation. This is not one pathway; it is many parallel pathways running in both directions.'),
                  caveat: 'The phrase "gut-brain axis" sometimes makes it sound like a single new system. It is actually a useful umbrella for known anatomy + biochemistry, much of which we have known about for decades. What is newer is the recognition that BACTERIA in the gut actively shape this signaling - that the microbiome is a participant, not just a passenger.'
                },
                { id: 'vagus', name: __alloT('stem.microbiology.the_vagus_nerve_as_the_highway', 'The vagus nerve as the highway'), emoji: '🛣️',
                  body: __alloT('stem.microbiology.the_vagus_is_the_10th_cranial_nerve_th', 'The vagus is the 10th cranial nerve, the longest nerve in the autonomic nervous system. It innervates the heart, lungs, and most of the digestive tract. It carries information about gut wall stretch, pH, immune activation, hormone signals, and bacterial metabolites to brainstem nuclei (nucleus tractus solitarius), which then communicate to higher brain regions (insula, amygdala, prefrontal cortex). Vagal afferent signaling is part of how you know you are full, how nausea is generated, why stomach distress affects mood, and how stress shows up in the gut. Vagus nerve stimulation (VNS) is FDA-approved for treatment-resistant epilepsy + depression, with the underlying mechanism still being mapped.'),
                  caveat: 'The 80/20 gut → brain ratio for vagal fibers is sometimes stated as overwhelming evidence that "the gut controls the brain." That overstates the case. The brain has many other input streams (vision, hearing, every other sensory + interoceptive channel) AND has very strong descending control. The gut-brain conversation is genuinely two-way; the vagal asymmetry is one data point, not the whole story.'
                },
                { id: 'metabolites', name: __alloT('stem.microbiology.bacterial_metabolites_that_act_like_dr', 'Bacterial metabolites that act like drugs'), emoji: '💊',
                  body: __alloT('stem.microbiology.gut_bacteria_produce_many_small_molecu', 'Gut bacteria produce many small molecules that enter circulation + affect brain function. Short-chain fatty acids (SCFAs - acetate, propionate, butyrate) are made by bacterial fermentation of dietary fiber. Butyrate is the main energy source for colon cells + has anti-inflammatory effects throughout the body, including reduced microglial activation in the brain. Tryptophan metabolism is dramatically influenced by gut bacteria - some species shunt tryptophan toward serotonin precursors, others toward the kynurenine pathway (which produces both protective + neurotoxic compounds). Lipopolysaccharide (LPS), from Gram-negative bacterial cell walls, leaks across an inflamed gut barrier ("leaky gut") + triggers low-grade systemic inflammation that influences mood + cognition. Bile acid metabolism is co-regulated by liver + bacteria; bile acid signaling reaches the brain.'),
                  caveat: 'Most bacterial-metabolite-to-brain pathways are characterized in mice + cell culture, with limited human evidence. The signals are real; the magnitude of effect in humans is still being measured. Be cautious of supplements claiming to "boost gut-brain butyrate." The body produces butyrate locally in the colon in large quantities; oral supplements have very poor bioavailability + minimal evidence of brain effect.'
                },
                { id: 'depression', name: __alloT('stem.microbiology.microbiome_depression', 'Microbiome + depression'), emoji: '😞',
                  body: __alloT('stem.microbiology.patients_with_major_depressive_disorde', 'Patients with major depressive disorder show measurable differences in gut microbiome composition compared to non-depressed controls (lower diversity, lower abundance of Faecalibacterium prausnitzii + several Bacteroides species, altered Firmicutes/Bacteroidetes ratio). Fecal microbiota transplant from depressed humans to germ-free mice transfers some depressive-like behaviors (Kelly 2016, Zheng 2016). Specific probiotics (mostly Lactobacillus + Bifidobacterium strains, sometimes called "psychobiotics") have shown modest antidepressant effects in some randomized trials. The strongest single dietary signal: a Mediterranean-style diet, with high fiber + plant diversity + fermented foods, is associated with lower depression risk in multiple longitudinal cohorts (PREDIMED, SMILES, Helfimed trials).'),
                  caveat: 'Causality vs correlation remains hard. Depression itself changes eating + sleep + activity patterns, which change the microbiome. Disentangling cause from effect requires longitudinal + interventional studies, which are slow + expensive. Be honest with families: "your gut bacteria may matter for mood" is reasonable; "your depression is caused by your microbiome" is not yet supported. The strongest evidence-based mental health interventions (CBT, exercise, sleep, medication when indicated, social connection) remain primary.'
                },
                { id: 'anxiety', name: __alloT('stem.microbiology.anxiety_stress_reactivity', 'Anxiety + stress reactivity'), emoji: '😰',
                  body: __alloT('stem.microbiology.germ_free_mice_raised_completely_witho', 'Germ-free mice (raised completely without bacteria) show EXAGGERATED stress responses (elevated cortisol, exaggerated HPA-axis activation) compared to conventionally-colonized mice. Colonizing germ-free mice with specific bacterial communities can normalize stress responses. In humans, a small but growing set of trials has shown that specific probiotic blends (e.g., Lactobacillus helveticus + Bifidobacterium longum) modestly reduce self-reported anxiety + cortisol response to a stressor. The mechanism appears to involve vagal afferent signaling + altered tryptophan metabolism. Most effects are small in magnitude + variable across studies.'),
                  caveat: 'School psychologists + counselors should NOT prescribe probiotics for anxiety. But it is reasonable to discuss with families that diet quality, fiber intake, and gut health appear to influence stress reactivity, alongside the evidence-based interventions (CBT, exposure therapy, parent training, mindfulness, sleep hygiene). The microbiome conversation is an addition to, not a substitute for, the things we already know help.'
                },
                { id: 'autism', name: __alloT('stem.microbiology.autism_the_gut_careful_framing', 'Autism + the gut - careful framing'), emoji: '🌈',
                  body: __alloT('stem.microbiology.autistic_children_show_on_average_gut_', 'Autistic children show, on average, gut microbiome differences from non-autistic peers (lower diversity, altered Clostridia abundance, etc.) + significantly higher rates of GI symptoms (constipation, diarrhea, food selectivity). Several small open-label studies of fecal microbiota transplant in autistic children (Kang 2017, 2019) reported reductions in GI symptoms and in some behavioral measures. Larger controlled trials are ongoing. The mechanism could be direct (gut bacteria affect brain via vagus + metabolites) or indirect (less GI pain → fewer behavioral disruptions; better nutrition → better functioning).'),
                  caveat: 'This area has been MASSIVELY oversold by alternative-medicine practitioners. "Heal the gut, cure autism" is not what the evidence supports + the framing is harmful. Autism is a neurodevelopmental difference, not a disease to be cured. The respectful, identity-first framing is: many autistic children have GI symptoms that deserve real medical attention, and addressing those symptoms may improve quality of life - without changing who they are. The autistic community has been clear about preferring identity-first language ("autistic person") + has been harmed by past "treatment" cultures that emphasized "fixing" rather than supporting. School psychologists should default to this framing.'
                },
                { id: 'pdpark', name: __alloT('stem.microbiology.parkinson_s_starts_in_the_gut', 'Parkinson\'s starts in the gut?'), emoji: '🌀',
                  body: __alloT('stem.microbiology.heiko_braak_proposed_in_2003_that_park', 'Heiko Braak proposed in 2003 that Parkinson\'s disease pathology may begin in the enteric nervous system + olfactory bulb, then travel via the vagus nerve up to the brainstem + spread through the brain. Several lines of evidence support this. (a) Constipation is one of the EARLIEST symptoms of PD, often appearing 10-20 years before motor symptoms. (b) Lewy body pathology (α-synuclein aggregates) is found in the gut nervous system of PD patients. (c) Vagotomy (surgical cutting of the vagus nerve, historically done for ulcer treatment) appears to slightly reduce PD risk in long-term epidemiological follow-up (Svensson 2015 Danish cohort, supportive Liu 2017 Swedish cohort). (d) The gut microbiomes of PD patients differ from controls before motor symptoms develop. PD may be partly a disease that originates in the gut + spreads to the brain over years.'),
                  caveat: 'The Braak hypothesis remains contested. PD almost certainly has multiple subtypes - some "gut-first" + some "brain-first." Single-cause framing oversimplifies. But the hypothesis is taken seriously enough that prevention research is exploring gut-targeted interventions (early treatment of H. pylori + SIBO, fiber-rich diets, fecal microbiota approaches) as possible PD-risk-reducing strategies. None established yet.'
                },
                { id: 'practical', name: __alloT('stem.microbiology.what_this_means_for_everyday_life', 'What this means for everyday life'), emoji: '🥗',
                  body: __alloT('stem.microbiology.the_strongest_evidence_based_practical', 'The strongest evidence-based practical takeaways from gut-brain research: (1) High-fiber + high-plant-diversity diets are associated with better mood + lower depression risk, and with measurable favorable microbiome composition. (2) Fermented foods (yogurt, kefir, kimchi, sauerkraut) modestly increase microbiome diversity + lower inflammatory markers (Sonnenburg lab, Stanford, 2021 published in Cell). (3) Antibiotic stewardship matters - every course of antibiotics has measurable effects on the gut microbiome lasting months to years. Use them when needed; don\'t take them when not. (4) Sleep, exercise, social connection, time outdoors all affect the microbiome alongside their direct effects on mental health. (5) For school-age kids, the strongest microbiome-supportive interventions look exactly like the interventions we already recommend for general health.'),
                  caveat: 'The gut-brain axis is not a magic supplement aisle. Probiotic pills bought at a pharmacy have inconsistent strain composition + dose + survival, and most clinical trials show small effects at best. Whole-diet interventions consistently outperform single-strain probiotics. The interventions that work are the unglamorous ones: vegetables, beans, whole grains, fermented foods, sleep, exercise, fewer ultra-processed snacks.'
                }
              ];
              var sel = d.selectedGBA || 'overview';
              var topic = GBA_TOPICS.find(function(t) { return t.id === sel; }) || GBA_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.the_idea_that_our_gut_bacteria_influen', 'The idea that our gut bacteria influence our mood + behavior was treated as fringe in the 1990s. It is now a mainstream + rapidly growing research area, with thousands of papers + multiple textbooks. The science is real, the magnitude of effects in humans is still being measured, and the area is also being heavily oversold by supplement marketing. The respectful position: take the science seriously, separate hype from evidence, do not abandon what already works.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  GBA_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedGBA: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#06b6d4' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #06b6d4' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#67e8f9', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.what_we_should_not_overstate_3', 'What we should not overstate: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.3)', fontSize: 11.5, color: '#fda4af', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.a_note_for_educators_counselors', 'A note for educators + counselors: ')),
                  __alloT('stem.microbiology.students_families_sometimes_encounter_', 'Students + families sometimes encounter aggressive marketing of probiotics, "gut healing protocols," restrictive diets, and supplements claiming to cure mental health conditions. The respectful response is not to dismiss interest in gut-brain biology (the science is real) but to redirect toward evidence-based whole-diet patterns + the standard mental health toolkit. Honor the curiosity; protect the family budget from snake oil; never frame a child as broken-and-needing-fixing.')
                )
              );
            })(),
            '#06b6d4'
          )
        );
      }

      // BIOREMEDIATION + BIOTECHNOLOGY
      function renderBiotech() {
        var APPS = [
          { id: 'oil', name: __alloT('stem.microbiology.oil_spill_cleanup', 'Oil spill cleanup'), color: '#fbbf24',
            microbe: 'Alcanivorax borkumensis, Pseudomonas putida, certain Rhodococcus species - collectively "hydrocarbon-degrading bacteria."',
            how: 'These naturally-occurring marine bacteria use hydrocarbons as their energy source. After an oil spill, populations bloom + chew through petroleum compounds, converting them to CO₂ + water + biomass. Often supplemented with nitrogen + phosphorus to stimulate growth.',
            example: '1989 Exxon Valdez (Alaska) + 2010 Deepwater Horizon (Gulf of Mexico). Bioremediation accelerated cleanup of both. About 50% of the Deepwater Horizon oil was degraded by microbes within months - far faster than any mechanical recovery could have done. Light + medium fractions degrade fastest; heavy + aromatic compounds slower.',
            limits: 'Cold water + lack of oxygen + lack of nitrogen all slow microbial degradation. Cannot dissolve into solid asphalt-like residues. Not effective in deep sediments where oxygen is absent.'
          },
          { id: 'plastic', name: __alloT('stem.microbiology.plastic_degrading_enzymes', 'Plastic-degrading enzymes'), color: '#0ea5e9',
            microbe: 'Ideonella sakaiensis 201-F6 (discovered 2016 in a Japanese recycling facility) + engineered variants of its enzymes PETase + MHETase.',
            how: 'Naturally evolved to digest PET (polyethylene terephthalate - the plastic in water bottles + polyester). The enzymes hydrolyze PET\'s ester bonds into the constituent monomers (terephthalic acid + ethylene glycol) which can be re-polymerized into new PET. Effectively closed-loop recycling - without burning, without virgin petroleum.',
            example: 'French company Carbios is operating a pilot facility that demonstrates ~90% PET-to-monomer conversion in hours. Engineered "FAST-PETase" + similar variants are 10-100× more efficient than the original. Full industrial-scale plant scheduled for 2025-26.',
            limits: 'Only works on PET. Polyethylene (PE), polypropylene (PP), polystyrene (PS), PVC - the bulk of plastic waste - currently has no good enzymatic solution. Active research on enzymes for the other plastics.'
          },
          { id: 'mining', name: __alloT('stem.microbiology.bioleaching_biomining', 'Bioleaching (biomining)'), color: '#a16207',
            microbe: 'Acidithiobacillus ferrooxidans + thiooxidans, Leptospirillum ferrooxidans, Sulfolobus (a thermophilic archaeon).',
            how: 'These bacteria oxidize iron + sulfur in ore minerals. The process releases the metal of interest (copper, gold, uranium) into solution, which can be collected. Operates at extremely low pH (~1-2) where these acidophilic + chemolithotrophic microbes thrive.',
            example: 'About 20% of global copper production now uses bioleaching. Chuquicamata + Escondida mines (Chile) extract billions of dollars of copper this way. Recovery is slower than conventional smelting but uses far less energy + emits less SO₂.',
            limits: 'Slow (~months for typical operation). Requires the right ore type. Best for low-grade ore where conventional methods are uneconomic.'
          },
          { id: 'fuel', name: __alloT('stem.microbiology.biofuels', 'Biofuels'), color: '#22c55e',
            microbe: 'Saccharomyces cerevisiae (yeast) for ethanol; Zymomonas mobilis for ethanol; engineered Cyanobacteria + algae for biodiesel.',
            how: 'First-generation: yeast ferments corn or sugarcane sugars → ethanol. Second-generation: bacteria break down cellulose from non-food plants → ethanol. Third-generation: algae grow in tanks, accumulating lipids that are extracted as biodiesel.',
            example: 'Brazil is the leader in ethanol-from-sugarcane (~28% of fuel mix). The US uses corn ethanol heavily (~10% of gasoline). Cellulosic ethanol from straw + wood chips is operational but more expensive. Algal biodiesel remains a research focus more than a commercial reality.',
            limits: 'First-gen biofuels compete with food production. Net energy ratios are sometimes only ~1.5:1 (you put in nearly as much energy as you get out). Land + water use considerable.'
          },
          { id: 'pharma', name: __alloT('stem.microbiology.pharmaceutical_production', 'Pharmaceutical production'), color: '#a855f7',
            microbe: 'Mostly E. coli, but also yeast (Saccharomyces, Pichia pastoris), CHO cells (mammalian for antibody production).',
            how: 'Engineered to produce a specific human protein from inserted human genes. The microbe grows in bioreactors; the desired protein is harvested + purified. Pioneered by Genentech in 1978 with recombinant human insulin.',
            example: 'Insulin - nearly all therapeutic insulin worldwide is now produced by recombinant E. coli or yeast. Vaccines (hepatitis B subunit, mRNA vaccine components). Therapeutic antibodies (~$200 billion/year market) like adalimumab, trastuzumab, pembrolizumab. Industrial enzymes (washing-powder enzymes, food enzymes).',
            limits: 'Some human proteins don\'t fold or glycosylate correctly in bacteria - need yeast or mammalian cells, which are slower + more expensive. Antibody production typically uses CHO cells in bioreactors.'
          },
          { id: 'mercury', name: __alloT('stem.microbiology.heavy_metal_radionuclide_cleanup', 'Heavy metal + radionuclide cleanup'), color: '#7c3aed',
            microbe: 'Geobacter, Shewanella, Pseudomonas, Bacillus, Deinococcus radiodurans.',
            how: 'Certain bacteria can reduce or sequester heavy metals (uranium, chromium, arsenic, mercury) into insoluble or less-toxic forms. Geobacter reduces dissolved uranium(VI) to insoluble uranium(IV), preventing groundwater migration.',
            example: 'Department of Energy uranium-contaminated sites at Rifle, Colorado + Old Rifle, Colorado have demonstrated successful in-situ Geobacter remediation. Deinococcus radiodurans, the "world\'s toughest bacterium" (survives radiation doses 1000× lethal for humans), is being engineered to clean up radioactive contaminated sites.',
            limits: 'Slow. Requires injecting nutrients (often a carbon source like acetate) to stimulate the microbes. Long-term stability depends on environmental conditions remaining favorable.'
          }
        ];
        var sel = APPS.find(function(a) { return a.id === d.selectedBiotechApp; }) || APPS[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('🏭 Microbes as industrial workhorses',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
              __alloT('stem.microbiology.beyond_medicine_food_microbes_are_doin', 'Beyond medicine + food, microbes are doing real work - cleaning pollution, mining metals, making fuels, recycling plastics, producing pharmaceuticals. About $300 billion/year of the global economy is microbe-driven biotechnology, and growing. Many problems we previously addressed with brute force + chemistry (oil spills, mining waste, plastic landfill) now have biological solutions that are slower but cleaner.')
            ),
            '#22c55e'
          ),
          sectionCard('🔬 Six application areas',
            h('div', null,
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                APPS.map(function(a) {
                  var active = (d.selectedBiotechApp || APPS[0].id) === a.id;
                  return h('button', { key: a.id,
                    onClick: function() { upd({ selectedBiotechApp: a.id }); },
                    style: { padding: '8px 12px', borderRadius: 8, background: active ? a.color + '33' : '#1e293b', border: '1px solid ' + (active ? a.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                  }, a.name);
                })
              ),
              h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.microbes_used', 'Microbes used')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.microbe)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.how_it_works_3', 'How it works')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.how)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.real_world_example', 'Real-world example')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.example)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.limits_honest_caveats', 'Limits + honest caveats')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.limits)
                )
              )
            ),
            '#22c55e'
          ),

          sectionCard('🧪 Synthetic biology - engineering organisms from scratch',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } },
                __alloT('stem.microbiology.modern_biotechnology_no_longer_just_fi', 'Modern biotechnology no longer just FINDS useful microbes - it ENGINEERS them. Synthetic biology assembles genetic circuits + custom metabolic pathways from interchangeable parts. The Registry of Standard Biological Parts (BioBricks, 2003+) catalogs thousands of reusable DNA modules. Computer-designed organisms exist.')
              ),
              h('p', { style: { margin: '0 0 8px' } },
                h('strong', { style: { color: '#a7f3d0' } }, __alloT('stem.microbiology.famous_examples', 'Famous examples: ')),
                __alloT('stem.microbiology.artemisinin_antimalarial_drug_produced', 'Artemisinin (antimalarial drug) produced in yeast by Jay Keasling\'s group at UC Berkeley - saved hundreds of millions of dollars vs extraction from sweet wormwood. Spider silk produced in goats (Nexia) + bacteria (Bolt Threads). Synthetic vanilla flavor produced by engineered yeast. Insulin in E. coli (1978, Genentech) was the first major commercial synthetic biology product.')
              ),
              h('p', { style: { margin: 0 } },
                h('strong', { style: { color: '#a7f3d0' } }, __alloT('stem.microbiology.where_it_s_going', 'Where it\'s going: ')),
                __alloT('stem.microbiology.synthetic_carbon_capture_organisms_eng', 'Synthetic carbon-capture organisms (engineered cyanobacteria producing biofuels from CO₂ + sunlight). Designer probiotics (engineered gut bacteria producing therapeutic molecules in the gut). Cellular agriculture (lab-grown meat from cultured animal cells, no animal needed). Self-replicating diagnostics. The field is younger than CRISPR + moving extremely fast.')
              )
            ),
            '#a7f3d0'
          ),

          // ─── Infectious causes of cancer ─────────────────────────
          sectionCard('🎗️ When microbes cause cancer - infectious oncogenesis',
            (function() {
              var CANCER_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.how_big_is_this', 'How big is this?'), emoji: '📊',
                  body: __alloT('stem.microbiology.about_13_of_cancers_worldwide_over_2_m', 'About 13% of cancers worldwide (over 2 million cases per year) are caused by infectious agents. The biggest contributors: Helicobacter pylori (stomach cancer + MALT lymphoma), HPV (cervical, anal, oropharyngeal, penile, vulvar, vaginal), Hepatitis B + C virus (liver cancer), Epstein-Barr virus (Burkitt + Hodgkin lymphoma, nasopharyngeal carcinoma, some gastric cancer), HHV-8/KSHV (Kaposi sarcoma), HTLV-1 (adult T-cell leukemia), Schistosoma haematobium (bladder cancer), Opisthorchis + Clonorchis liver flukes (bile-duct cancer). All except HPV + HBV were essentially invisible to oncology before molecular biology - many cancers we used to call idiopathic, we now know are infectious.'),
                  caveat: 'These cancers are HIGHLY preventable compared to cancers of unknown cause. Vaccines (HPV, HBV), antibiotics (H. pylori), antivirals (HCV cure since 2014), and clean water (schistosomiasis, liver flukes) prevent or eliminate the underlying infection. The global cancer burden could fall by a measurable fraction if these interventions reached everyone.'
                },
                { id: 'hpv', name: __alloT('stem.microbiology.hpv_the_most_preventable_cancer', 'HPV - the most preventable cancer'), emoji: '💉',
                  body: __alloT('stem.microbiology.harald_zur_hausen_proved_in_the_1980s_', 'Harald zur Hausen proved in the 1980s that human papillomavirus causes cervical cancer (Nobel Prize 2008). Specifically, HPV strains 16 + 18 cause about 70% of cervical cancers worldwide; eight other high-risk strains cause another 20%. HPV is sexually transmitted, and most sexually active adults are exposed at some point; most clear it within 2 years. A small percentage develop persistent infection that, over decades, progresses through cervical dysplasia (CIN1 → CIN2 → CIN3 → invasive cancer). HPV-related cancers are also rising in oropharyngeal sites (back of throat), particularly in men. The 9-valent HPV vaccine (Gardasil 9) protects against the strains causing ~90% of cervical + anal + oropharyngeal HPV-caused cancers.'),
                  caveat: 'The HPV vaccine is one of the most effective cancer-prevention tools ever developed. In countries with high coverage (Australia, UK, Scandinavia), cervical cancer is on track for elimination. In the US, coverage is lower (~62% completion in adolescents 2023), largely due to misinformation and the framing as a "sex disease" rather than as a cancer vaccine. School psychologists, pediatricians, and counselors who support vaccine uptake are doing primary cancer prevention.'
                },
                { id: 'hpylori', name: __alloT('stem.microbiology.h_pylori_the_nobel_that_was_earned', 'H. pylori + the Nobel that was earned'), emoji: '🍶',
                  body: __alloT('stem.microbiology.for_most_of_the_20th_century_doctors_b', 'For most of the 20th century, doctors believed gastric ulcers were caused by stress, spicy food, and stomach acid. Treatment was bland diet + antacids. Barry Marshall + Robin Warren (Perth, Australia, 1982) noticed a spiral bacterium in ulcer-patient stomach biopsies. Marshall, frustrated by the rejection of his hypothesis, in 1984 famously DRANK a culture of H. pylori himself, developed gastritis within days, cultured the bacterium back from his own stomach, and cured himself with antibiotics. The medical community grudgingly began to test the hypothesis. By the late 1990s the evidence was overwhelming: H. pylori causes >90% of duodenal ulcers and ~70% of gastric ulcers, AND about 80% of gastric cancer cases worldwide. Marshall + Warren won the Nobel in 2005.'),
                  caveat: 'About half the world\'s population is colonized by H. pylori, but only a small fraction develop cancer. Strain virulence (cagA-positive strains are higher-risk), host genetics, diet (high salt + low fresh produce), and co-infection all modulate risk. Treating EVERY carrier is not done, because of antibiotic resistance + microbiome disruption. Treating SYMPTOMATIC carriers and those with family history of gastric cancer is now standard.'
                },
                { id: 'ebv', name: __alloT('stem.microbiology.ebv_the_universal_mostly_harmless_canc', 'EBV - the universal mostly-harmless cancer virus'), emoji: '😮‍💨',
                  body: __alloT('stem.microbiology.about_95_of_adults_worldwide_carry_eps', 'About 95% of adults worldwide carry Epstein-Barr virus, usually acquired in childhood (often asymptomatic) or adolescence (causing "mononucleosis," a.k.a. mono/kissing disease - fatigue, swollen lymph nodes, fever lasting weeks). EBV is a herpesvirus that establishes lifelong latent infection in B-lymphocytes. In a small minority it drives Burkitt lymphoma (especially in equatorial Africa, co-factor with malaria), nasopharyngeal carcinoma (especially in South China + Southeast Asia, co-factor with diet/genetics), Hodgkin lymphoma (~40% of cases EBV+), some gastric cancers (~10%), and post-transplant lymphoproliferative disease (in immunosuppressed organ-transplant recipients). EBV has also been implicated as a likely contributing cause of MULTIPLE SCLEROSIS (Bjornevik et al., Science 2022, with cohort data from 10 million US military personnel showing 32-fold increased MS risk after EBV seroconversion).'),
                  caveat: 'There is currently no approved EBV vaccine, but several are in clinical trials. Given EBV\'s role in cancer + MS + chronic fatigue syndrome (suggested), an effective EBV vaccine could be one of the biggest medical advances of the coming decade. The fact that virtually all of us carry EBV makes its causal role hard to study epidemiologically - Bjornevik\'s 2022 paper exploited a rare cohort of seronegative adults who later seroconverted, which is hard to recreate.'
                },
                { id: 'hcv', name: __alloT('stem.microbiology.hepatitis_c_the_cure_story', 'Hepatitis C - the cure story'), emoji: '🩸',
                  body: __alloT('stem.microbiology.hepatitis_b_c_are_the_leading_viral_ca', 'Hepatitis B + C are the leading viral causes of liver cancer (hepatocellular carcinoma). HBV has had an effective vaccine since 1981, given at birth in most countries, and has dramatically reduced HBV-related liver cancer in vaccinated cohorts. HCV had no vaccine; chronic infection (~60-80% of those exposed) progressed silently to cirrhosis + liver cancer over 20-30 years. Then in 2014, direct-acting antiviral drugs (sofosbuvir, ledipasvir + their successors) achieved CURE rates >95% with 8-12 weeks of oral pills. This is genuinely revolutionary. Sofosbuvir was approved in 2013; in 2020, Michael Houghton + Harvey Alter + Charles Rice won the Nobel for HCV discovery + treatment groundwork.'),
                  caveat: 'HCV cure has been priced controversially high in many countries ($84,000 for a 12-week course at launch). Pricing came down over time; Egypt, Australia, and India have run effective national elimination programs. The technology to eliminate HCV exists; the political + economic will to use it has been uneven. Hepatitis C deaths globally peaked around 2015 and are now declining - the first viral disease ever brought under control without a vaccine.'
                },
                { id: 'mech', name: __alloT('stem.microbiology.how_microbes_cause_cancer_the_mechanis', 'How microbes cause cancer (the mechanisms)'), emoji: '🧬',
                  body: __alloT('stem.microbiology.there_are_several_distinct_routes_1_di', 'There are several distinct routes. (1) Direct viral oncoproteins: HPV E6 + E7 proteins bind + degrade host tumor-suppressor proteins p53 (E6) and Rb (E7), removing the brakes on cell division. EBV LMP1 + EBNA proteins mimic constitutive signaling. (2) Chronic inflammation: H. pylori, HBV, HCV, schistosomiasis all cause decades of inflammation, repair, and proliferation. Each cycle adds mutations. Eventually one cell accumulates the right mutations + escapes. (3) Immune suppression: HIV does not directly cause cancer, but by destroying CD4 T-cells, it allows opportunistic oncogenic viruses (EBV, HHV-8, HPV) to proliferate unchecked, dramatically increasing AIDS-related lymphoma + Kaposi sarcoma. (4) Genome integration: HBV integrates into the host genome at semi-random sites; some integrations disrupt tumor suppressors. (5) Microbiome disruption: emerging evidence that dysbiosis (especially Fusobacterium in colorectal cancer) may CONTRIBUTE to cancer biology, though direct causation is still debated.'),
                  caveat: 'Cancer is almost never one cause. Even with a strong viral driver, additional mutations from radiation, environmental carcinogens, diet, and chance are usually required. This is why most people exposed to oncogenic microbes never develop cancer.'
                },
                { id: 'limits', name: __alloT('stem.microbiology.what_this_framing_cannot_do', 'What this framing cannot do'), emoji: '⚖️',
                  body: __alloT('stem.microbiology.not_all_cancers_are_infectious_the_maj', 'Not all cancers are infectious. The majority of cancers in high-income countries have no known infectious cause (most breast cancer, prostate cancer, colorectal cancer, lung cancer not from infection). Smoking remains the single largest preventable cancer cause globally. Genetics + age + radiation + obesity + alcohol + air pollution all contribute. The "infectious cancer" framing is not a unified theory of cancer; it is one important slice - the slice that public health can address with vaccines + antibiotics + clean water.'),
                  caveat: 'Public health framing also matters. Telling someone with cervical cancer "you should have gotten the vaccine" is cruel and unhelpful; HPV exposure is ubiquitous, and most people did not have the vaccine available in their adolescence (Gardasil was approved 2006). Honoring the patient in front of you is more important than scoring epidemiological points.'
                }
              ];
              var sel = d.selectedCancer || 'overview';
              var topic = CANCER_TOPICS.find(function(t) { return t.id === sel; }) || CANCER_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.for_most_of_the_20th_century_cancer_wa', 'For most of the 20th century, cancer was understood almost entirely in terms of genetic mutation, radiation, chemistry, and inheritance. In the past 40 years, a different story has emerged: a significant fraction of cancers globally are caused, fully or partly, by chronic infection with specific microbes. Some of those infections are vaccine-preventable. Others are curable with antibiotics or antivirals. This is genuinely good news - and it changes how we think about cancer prevention.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  CANCER_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedCancer: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#f43f5e' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #f43f5e' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#fda4af', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.what_we_should_not_overstate_4', 'What we should not overstate: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11.5, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_actionable_summary', 'The actionable summary: ')),
                  __alloT('stem.microbiology.the_hpv_vaccine_prevents_most_cervical', 'The HPV vaccine prevents most cervical, anal, and oropharyngeal cancers. The Hep B vaccine prevents most hepatitis-B-driven liver cancer. Hep C is curable in 8-12 weeks of pills. H. pylori is curable in 10-14 days of antibiotics. None of these is a future technology; all of them exist now. Their barriers are access, awareness, and political will - not science.')
                )
              );
            })(),
            '#f43f5e'
          ),

          // ─── Synthetic biology + engineered organisms ───────────
          sectionCard('🧬 Synthetic biology - engineering microbes as factories + platforms',
            (function() {
              var SB_TOPICS = [
                { id: 'whatis', name: __alloT('stem.microbiology.what_synthetic_biology_is', 'What synthetic biology is'), emoji: '⚙️',
                  body: __alloT('stem.microbiology.synthetic_biology_applies_engineering_', 'Synthetic biology applies ENGINEERING principles to biology - designing + building new biological parts, devices, and systems, or redesigning existing ones for useful purposes. The core insight: DNA can be treated as code, biological functions as modules, and microbes as programmable factories. The field emerged around 2000 from convergence of genetic engineering, computer science, + nanotechnology. Key institutions: the iGEM competition (International Genetically Engineered Machine, MIT-founded 2003, now thousands of student teams annually), the BioBricks Foundation (standard parts registry), Ginkgo Bioworks + Twist Bioscience + Zymergen (commercial platforms), the J. Craig Venter Institute.'),
                  caveat: 'Synthetic biology is often hyped beyond what it currently delivers. The metaphor of "biology as software" is useful but partial - biological systems have evolved billions of years of context-dependency that no engineering abstraction fully captures. "Build it like LEGO" works for some genetic parts + fails spectacularly for others. The most productive applications combine engineering ambition with biological humility.'
                },
                { id: 'insulin', name: __alloT('stem.microbiology.recombinant_insulin_the_first_big_win', 'Recombinant insulin (the first big win)'), emoji: '💉',
                  body: __alloT('stem.microbiology.in_1978_genentech_engineered_e_coli_ba', 'In 1978, Genentech engineered E. coli bacteria to produce human insulin by inserting the human insulin gene into a bacterial plasmid. Approved by FDA in 1982 as Humulin (Eli Lilly), this was the first commercial product of recombinant DNA technology. Before recombinant insulin, diabetics used animal-derived insulin (pig or cow), with significant allergic reactions + supply limitations. Recombinant insulin is identical to human insulin + can be produced in unlimited quantities. This single product proved that engineered microbes could safely make human medicines + opened the door to the entire biopharmaceutical industry.'),
                  caveat: 'Recombinant insulin remains the most-prescribed engineered-organism product in history. But ongoing problems: 1.4 million US adults with diabetes have rationed insulin due to cost ($600-1000+/month at list price); the technology is decades old but the market is concentrated (3 companies = ~95% of US insulin); biosimilar insulins are entering slowly. Synthetic biology can make insulin cheaply; the social systems around it have failed many patients.'
                },
                { id: 'artemisinin', name: __alloT('stem.microbiology.artemisinin_saving_malaria_patients', 'Artemisinin - saving malaria patients'), emoji: '🌿',
                  body: __alloT('stem.microbiology.artemisinin_from_the_sweet_wormwood_pl', 'Artemisinin (from the sweet wormwood plant Artemisia annua) is the most effective antimalarial drug + the basis of modern combination treatments that have saved millions of lives. Traditional extraction from plants is slow + expensive + supply varies wildly with weather. Jay Keasling\'s lab (UC Berkeley + the Joint BioEnergy Institute) engineered yeast (Saccharomyces cerevisiae) to produce artemisinic acid (a precursor that can be chemically converted to artemisinin) using genes pulled from the plant. Sanofi licensed the technology + produced ~50-100 tons of semisynthetic artemisinic acid annually starting 2013 - supplementing the natural-supply chain + stabilizing prices for the World Health Organization malaria program.'),
                  caveat: 'The artemisinin project is a major + understated success of synthetic biology. It is also instructive about LIMITS: the engineered yeast required multiple optimization passes to reach economic yields; the technology had to compete with natural extraction; market dynamics ultimately determined how much synthetic artemisinin gets produced. Engineering biology to make a known drug is hard; engineering biology to discover a NEW drug is harder still.'
                },
                { id: 'biobricks', name: __alloT('stem.microbiology.parts_devices_systems', 'Parts, devices, systems'), emoji: '🧩',
                  body: __alloT('stem.microbiology.the_biobrick_standard_tom_knight_mit_2', 'The BioBrick standard (Tom Knight, MIT, 2003) tried to standardize DNA parts so that biological engineers could combine them like electronic components. A promoter + a ribosome binding site + a coding sequence + a terminator forms a basic "device" - a single transcribed gene. Multiple devices combine into "systems." The Registry of Standard Biological Parts (parts.igem.org) catalogs ~ 20,000 parts contributed by iGEM teams + research labs. In practice, COMBINATORIAL ASSEMBLY is hard: parts that work in isolation often misbehave when combined; standards have evolved (BioBrick → MoClo → Gibson Assembly → Golden Gate); commercial platforms (Twist Bioscience) now synthesize entire gene constructs from scratch rather than assembling from parts.'),
                  caveat: 'The BioBrick vision of "biology as LEGO" has not been fully realized. Reality is more like writing software with parts that have hidden dependencies + sometimes don\'t play nice together. Modern synthetic biology often skips the parts catalog + designs DNA from scratch using computational tools, then has it synthesized commercially. The conceptual contribution of BioBricks (modularity, standardization, sharing) endures even where the specific standard does not.'
                },
                { id: 'cellag', name: __alloT('stem.microbiology.cellular_agriculture_lab_grown_meat', 'Cellular agriculture + lab-grown meat'), emoji: '🥩',
                  body: __alloT('stem.microbiology.cellular_agriculture_grows_animal_cell', 'Cellular agriculture grows animal-cell products (meat, leather, dairy) without raising whole animals. The technology starts with a small biopsy of muscle cells from a living donor animal, cultures them in stainless-steel bioreactors with growth media + scaffolds, + harvests the cultured meat. Singapore (the first country to approve cell-cultured meat for sale, 2020) + the US (FDA approval 2022 for cultured chicken from Upside Foods + GOOD Meat) are leading markets. Companies: Mosa Meat (the first cultured beef, 2013), Memphis Meats / UPSIDE Foods, Eat Just / GOOD Meat, Aleph Farms. Major investments: Bill Gates, Tyson Foods, Cargill, JBS.'),
                  caveat: 'Cell-cultured meat at scale is technically demanding + economically uncertain. Current production costs are 100-1000× conventional meat (down from 1,000,000× in 2013 - real progress but still far from price-parity). Energy-use estimates suggest scaled cellular agriculture may not be more environmentally favorable than well-managed conventional livestock in all metrics. The story is genuinely promising AND deserves skepticism about timelines + economics.'
                },
                { id: 'biofuels', name: __alloT('stem.microbiology.biofuels_bioplastics', 'Biofuels + bioplastics'), emoji: '🛢️',
                  body: __alloT('stem.microbiology.engineered_microbes_can_produce_biofue', 'Engineered microbes can produce biofuels + bioplastics from renewable carbon sources (sugar, cellulose, even CO2). Companies: LS9 (now part of REG, engineered fatty-acid biofuels), Amyris (farnesene for jet fuel), Genomatica (1,4-butanediol for nylon), Mango Materials (PHA bioplastic from methane), Newlight (AirCarbon from greenhouse gases). The first generation of biofuel companies (2006-2015) mostly struggled commercially due to low petroleum prices; the second wave is focused on higher-value specialty chemicals + materials where the price competition is less brutal.'),
                  caveat: 'Biofuels-as-climate-solution remains contested. First-generation corn-ethanol biofuels have unclear net climate benefits + compete with food crops. Cellulosic biofuels (from plant waste) have struggled to reach economic scale. The most credible bioenergy applications are in aviation + maritime where electrification is hardest + biofuels with verified low-carbon supply chains can substitute. Bioplastics are growing slowly + face their own end-of-life problems (most "biodegradable" plastics only degrade under industrial composting conditions).'
                },
                { id: 'genome', name: __alloT('stem.microbiology.minimum_genomes_designer_organisms', 'Minimum genomes + designer organisms'), emoji: '🧬',
                  body: __alloT('stem.microbiology.the_j_craig_venter_institute_synthesiz', 'The J. Craig Venter Institute synthesized the first fully synthetic bacterial genome (Mycoplasma mycoides, 2010) + transplanted it into a recipient cell, creating the first organism with an entirely synthetic genome ("Synthia"). They then created Syn3.0 (2016) - a minimal organism with only 473 genes (the smallest known free-living organism), of which ~ 149 have UNKNOWN function despite being essential. The minimal-genome work is foundational research toward designed organisms tailored for specific industrial purposes. Yeast 2.0 (synthetic Saccharomyces cerevisiae project, international collaboration) is the parallel eukaryotic effort, ongoing 2008-present.'),
                  caveat: 'Synthetic genomes have not yet led to commercially transformative organisms. Syn3.0 is a research tool, not a production strain. The 149 unknown-function essential genes are a humbling reminder of how much we DON\'T know about even the simplest cells. The dream of designed-from-scratch organisms with desired traits remains a research goal more than a product.'
                },
                { id: 'safety', name: __alloT('stem.microbiology.biosafety_biosecurity', 'Biosafety + biosecurity'), emoji: '🛡️',
                  body: __alloT('stem.microbiology.synthetic_biology_raises_genuine_biosa', 'Synthetic biology raises genuine biosafety + biosecurity concerns. BIOSAFETY: an engineered organism escapes the lab + colonizes natural ecosystems (extensive containment requirements + auxotrophy-based "kill switches" mitigate this). BIOSECURITY: deliberate misuse to create a pathogen ("dual use research of concern" - the 2011 H5N1 transmissibility studies were the most publicized case, now requiring NIH special review). DESIGN-build-test-LEARN cycles at increasingly fast speed could outpace regulatory oversight. The 2010 Presidential Commission on Bioethical Issues reviewed synthetic biology + recommended a "prudent vigilance" framework that is largely in place today.'),
                  caveat: 'The actual track record of synthetic-biology disasters is currently empty - no environmental escape, no engineered-pathogen attack of consequence. This may reflect good controls, may reflect luck, may reflect that the worst scenarios are harder than feared. Reasonable scientists disagree about how much restriction is appropriate. Reasonable citizens deserve to be part of the conversation about what limits to impose, especially as the technology becomes more accessible (a bench-top DNA synthesizer + a $50K equipment setup can now do work that required $10M of infrastructure in 2010).'
                },
                { id: 'future', name: __alloT('stem.microbiology.near_term_long_term_outlook', 'Near-term + long-term outlook'), emoji: '🚀',
                  body: __alloT('stem.microbiology.near_term_5_10_years_more_pharmaceutic', 'Near-term (5-10 years): more pharmaceuticals + specialty chemicals from engineered microbes (replacing chemical synthesis + plant extraction), continued growth in lab-grown meat, more synthetic biology in agriculture (microbial inoculants, biopesticides), better biosensors. Medium-term: programmable cell therapies (CAR-T already exists; T cells engineered to do more sophisticated immune tasks). Long-term (20+ years): xenobiology (organisms with non-standard genetic codes), genome-scale design, custom organisms for terraforming-scale applications (CO2-fixing organisms, methane-consuming organisms). The field has been promising "ten years" for forty years; pace + direction matter more than timing.'),
                  caveat: 'Synthetic biology in 2026 is roughly where electronics was in 1965 - the basic tools exist, early applications are real + transformative for specific cases, the broad transformation is still ahead. Predictions about timelines have a poor track record. What is reliable: continued exponential cost reduction in DNA synthesis + sequencing means EVERY year, what was prohibitively expensive last year becomes possible this year.'
                }
              ];
              var sel = d.selectedSynBio || 'whatis';
              var topic = SB_TOPICS.find(function(t) { return t.id === sel; }) || SB_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.synthetic_biology_asks_can_we_engineer', 'Synthetic biology asks: can we engineer living things the way we engineer software? The answer so far is "partially, sometimes spectacularly, with surprising failures." Engineered microbes make insulin, malaria drugs, jet fuel, leather, cheese, fragrance compounds. Cell-cultured meat is now legal to sell in three countries. The field is real, commercially significant, and intellectually + ethically demanding in ways students entering biology in 2026 will need to engage with.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  SB_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedSynBio: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#a7f3d0' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #a7f3d0' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(167,243,208,0.08)', border: '1px solid rgba(167,243,208,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#a7f3d0', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_4', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.for_aspiring_students', 'For aspiring students: ')),
                  __alloT('stem.microbiology.igem_igem_org_is_the_entry_point_for_h', 'iGEM (igem.org) is the entry point for high-school + college students into synthetic biology. Teams design + execute a research project each summer, present at a Giant Jamboree, + win medals based on documentation quality + lab achievement. King Middle students could start with a Maine-based summer program (the Bigelow Laboratory, MDI Biological Lab Junior Investigators, Jackson Lab Maine Summer Student Program) + work toward iGEM in high school + college. The field is unusually welcoming to undergraduates + has clear paths from teen interest to research career.')
                )
              );
            })(),
            '#a7f3d0'
          ),

          // ─── AI in biology + AlphaFold ───────────────────────────
          sectionCard('🤖 AI in biology + AlphaFold - protein structure + beyond',
            (function() {
              var AI_TOPICS = [
                { id: 'problem', name: __alloT('stem.microbiology.the_protein_folding_problem', 'The protein folding problem'), emoji: '🧩',
                  body: __alloT('stem.microbiology.a_protein_s_amino_acid_sequence_determ', 'A protein\'s amino acid sequence determines its 3D structure, and the 3D structure determines its function. Predicting the structure from the sequence was one of biology\'s grand challenges for ~ 50 years (Anfinsen formulated it in 1972, won Nobel for the basic principle). Until 2020, the only reliable way to determine a protein\'s structure was painstaking experimental methods: X-ray crystallography (~ months to years per protein), cryo-electron microscopy (cryo-EM, faster but still slow), or NMR. The Protein Data Bank had ~ 170,000 experimental structures as of 2020 - but humans + microbes have HUNDREDS OF MILLIONS of proteins. Most proteins had unknown structure + therefore poorly-understood function.'),
                  caveat: 'The problem was not just technical - it was foundational. Without knowing protein structures, drug design depended on trial-and-error + lucky discoveries. Antibiotic resistance research, enzyme engineering, vaccine design, understanding of disease mechanism - all bottlenecked by the structure problem. CASP (Critical Assessment of protein Structure Prediction, biennial competitions since 1994) tracked the slow progress: until 2020, no computational method came close to experimental accuracy.'
                },
                { id: 'alphafold', name: __alloT('stem.microbiology.alphafold_2_november_2020', 'AlphaFold 2 - November 2020'), emoji: '🚀',
                  body: __alloT('stem.microbiology.google_deepmind_s_alphafold_2_won_casp', 'Google DeepMind\'s AlphaFold 2 won CASP14 (November 2020) with a median accuracy approaching EXPERIMENTAL precision. The architecture: a deep neural network combining evolutionary information from multiple sequence alignments (homologous proteins across species reveal which amino acids "talk" to each other when the protein folds), pair representation of inter-residue distances, and an iterative attention mechanism. The result: structures predicted in HOURS rather than YEARS, at accuracy roughly equivalent to mid-resolution X-ray crystallography. John Jumper, Demis Hassabis, + the AlphaFold team won the 2024 Nobel Prize in Chemistry (shared with David Baker for RoseTTAFold + protein design work).'),
                  caveat: 'AlphaFold is the biggest single advance in computational biology since DNA sequencing. It is also not a complete solution: it predicts STRUCTURE, not necessarily FUNCTION; it does best on globular proteins + struggles with intrinsically-disordered regions + large protein complexes + protein-DNA interactions. Verification by experimental methods remains important; AlphaFold has known systematic errors that experienced users learn to recognize. Still, the field changed fundamentally in November 2020.'
                },
                { id: 'database', name: __alloT('stem.microbiology.the_alphafold_protein_structure_databa', 'The AlphaFold Protein Structure Database'), emoji: '💾',
                  body: __alloT('stem.microbiology.in_2021_deepmind_embl_ebi_released_the', 'In 2021, DeepMind + EMBL-EBI released the AlphaFold Protein Structure Database (alphafold.ebi.ac.uk), with predicted structures for ESSENTIALLY EVERY protein from ESSENTIALLY EVERY sequenced organism. The database started with the human proteome + 20 model organisms (~ 365,000 structures). By July 2022 it had expanded to ~ 200 million structures - covering essentially every cataloged protein on Earth. Free to use, no registration required, downloadable in bulk. Within months, hundreds of research labs were applying these structures to long-standing biology problems.'),
                  caveat: 'The 200M-structure release is one of the largest open data acts in scientific history. It came with confidence scores (pLDDT) that flag low-confidence regions, helping researchers know when to trust the prediction. Some scientists wished DeepMind had released the code more openly (the original AlphaFold 2 code IS open, but newer models like AlphaFold 3 have more restricted access). The accessibility debate is ongoing.'
                },
                { id: 'af3', name: __alloT('stem.microbiology.alphafold_3_the_broader_frontier', 'AlphaFold 3 + the broader frontier'), emoji: '🌐',
                  body: __alloT('stem.microbiology.alphafold_3_may_2024_extended_capabili', 'AlphaFold 3 (May 2024) extended capability to protein-PROTEIN complexes, protein-DNA, protein-RNA, protein-ligand, protein-ion interactions. The output models predict how molecules INTERACT, not just single-protein structures. This dramatically broadens what AI can contribute to drug discovery + biology. Parallel work: ESM (Meta\'s evolutionary scale model, language-model approach to protein understanding), RoseTTAFold (David Baker\'s lab at UW, alternative to AlphaFold with strong protein-design capabilities), AlphaProteo (DeepMind 2024, designs new proteins binding specified targets).'),
                  caveat: 'AlphaFold 3 was released with a web-only interface + limited access initially - a controversial step backward in openness compared to AF2. The pharmaceutical industry has eagerly adopted these tools, but small academic groups have less access. The community pushback was significant + DeepMind has loosened access policies somewhat. The pattern (rapid capability advance + uneven access) is repeating with other AI-in-biology tools.'
                },
                { id: 'drug', name: __alloT('stem.microbiology.ai_driven_drug_discovery', 'AI-driven drug discovery'), emoji: '💊',
                  body: __alloT('stem.microbiology.ai_tools_have_transformed_early_stage_', 'AI tools have transformed early-stage drug discovery. EXAMPLES: Insilico Medicine designed an idiopathic pulmonary fibrosis drug ENTIRELY in silico (target identification + chemistry); it entered Phase 2 trials in 2024 - first AI-discovered drug to reach late-stage human trials. Recursion Pharmaceuticals uses high-throughput cell imaging + AI to find drug candidates for rare diseases. The Schrödinger + Atomwise + Exscientia + Isomorphic Labs (DeepMind spinoff, 2021) all use AI for drug design. None have yet shipped an approved drug, but they have collectively accelerated drug discovery timelines from ~ 5 years for hit-to-clinical-candidate to ~ 1-2 years for some programs.'),
                  caveat: 'AI-driven drug discovery is REAL + EARLY. The biggest claim - "AI will replace traditional drug discovery" - has not yet been delivered. AI is being integrated alongside conventional methods, not replacing them. The clinical-trial success rate for AI-designed drugs is not yet known; we will not have enough data to compare AI-driven vs traditional discovery until the early 2030s. The current state is "promising tools, real efficiency gains in early stages, still proving themselves in the hard later stages."'
                },
                { id: 'genome', name: __alloT('stem.microbiology.ai_genome_interpretation', 'AI + genome interpretation'), emoji: '🧬',
                  body: __alloT('stem.microbiology.a_human_genome_has_3_billion_base_pair', 'A human genome has ~ 3 billion base pairs but only ~ 1-2% codes for proteins. The REGULATORY GENOME (which genes are turned on when, how variants affect disease risk, what the non-coding regions do) is largely unexplored. AI methods are now interpreting this: DeepMind\'s ENFORMER predicts gene expression from DNA sequence; Google\'s AlphaMissense (2023) predicts pathogenicity of every possible missense variant across the human proteome; Illumina + Stanford developed PrimateAI for variant interpretation. These tools support genetic-disease diagnosis + rare-disease research. For families navigating rare-genetic diagnoses, AI-based variant interpretation is now part of clinical workflow.'),
                  caveat: 'Variant interpretation AI has the same limits as any AI on out-of-distribution data: it works best on variants similar to ones it has seen, struggles on truly novel patterns. False positives ("AI says this variant causes disease") in clinical contexts can lead to unnecessary anxiety + sometimes inappropriate treatment. Best practice: AI variant interpretation supplements but does not replace expert clinical genetics review.'
                },
                { id: 'sequencing', name: __alloT('stem.microbiology.ai_sequencing_analysis', 'AI + sequencing analysis'), emoji: '🔬',
                  body: __alloT('stem.microbiology.modern_dna_rna_sequencing_produces_mas', 'Modern DNA + RNA sequencing produces massive datasets that no human can fully analyze manually. AI is now central in: basecalling (converting raw sequencer signal to nucleotide identity - Nanopore platforms increasingly use neural networks for this), variant calling (identifying mutations against reference genome), de novo assembly (reconstructing genomes from short reads), metagenomics (classifying mixed-species DNA samples). DeepVariant (Google, 2017) was an early AI variant caller with significantly improved accuracy over traditional methods. The combination of cheaper sequencing + better AI analysis is rapidly making genome-scale studies feasible for routine clinical + research use.'),
                  caveat: 'Sequencing AI has steadily improved + is now part of essentially every modern sequencing pipeline. The main risk is OPAQUE-BOX adoption - using AI tools without understanding their failure modes. Different AI tools have different biases (training data, model architecture); using multiple tools in parallel + cross-checking is standard best practice for important variant calls.'
                },
                { id: 'limits', name: __alloT('stem.microbiology.what_ai_cannot_do_yet', 'What AI cannot do (yet)'), emoji: '🚧',
                  body: __alloT('stem.microbiology.ai_in_biology_has_genuine_limits_open_', 'AI in biology has genuine limits + open challenges. (1) MECHANISTIC INTERPRETATION: AI tells you WHAT but rarely WHY at the level of underlying physics + chemistry. A predicted structure does not explain its evolutionary path or its catalytic mechanism. (2) NOVEL ARCHITECTURES: AI struggles with proteins very different from training data (intrinsically-disordered proteins, designer proteins, completely novel folds). (3) DYNAMICS: most AI predicts STATIC structures; proteins are dynamic + their motion is essential to function. (4) CONTEXT: a protein in isolation behaves differently than one in a cellular environment with other molecules. (5) VALIDATION: AI predictions still need experimental verification for important conclusions. (6) EQUITABLE ACCESS: best tools require expensive compute + dataset access that smaller labs + low-income-country researchers cannot always afford.'),
                  caveat: 'AI is not magic + has not "solved biology." The honest framing: AI has dramatically accelerated SOME parts of biological research (structure prediction, sequence analysis, image classification) while leaving OTHER parts (causal mechanism, dynamic behavior, organism-level emergent behavior) where they were. Biology remains a hard, deeply experimental science. AI is a powerful new tool, not a replacement for the underlying biological inquiry.'
                }
              ];
              var sel = d.selectedAI || 'problem';
              var topic = AI_TOPICS.find(function(t) { return t.id === sel; }) || AI_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.in_november_2020_alphafold_2_solved_a_', 'In November 2020, AlphaFold 2 solved a 50-year-old grand challenge in biology. The 2024 Nobel Prize in Chemistry recognized this + the parallel protein-design work at the Baker Lab. AI is now central to most areas of biological research - protein structure, drug discovery, genome interpretation, variant calling, metagenomic classification, microscopy image analysis. The field is moving so fast that the relationship between biology + computation is being reshaped year by year.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  AI_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedAI: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#8b5cf6' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #8b5cf6' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#c4b5fd', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_5', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.try_it_yourself_today', 'Try it yourself today: ')),
                  __alloT('stem.microbiology.alphafold_protein_structure_database_a', 'AlphaFold Protein Structure Database (alphafold.ebi.ac.uk) is free + searchable. Type any gene name + see the predicted protein structure rotating in 3D in your browser. ColabFold (free, runs in Google Colab) lets you input a protein sequence + get a structure in ~ 30 minutes. Foldit (fold.it) is a citizen-science game where players solve protein folds + sometimes outperform algorithms. For middle + high school students, these are the entry points into modern computational biology - no expensive equipment, just curiosity + a browser.')
                )
              );
            })(),
            '#8b5cf6'
          )
        );
      }

      // PLANT-MICROBE SYMBIOSIS + NITROGEN CYCLE
      function renderPlantMicrobe() {
        var STEPS = [
          { id: 'fix', name: __alloT('stem.microbiology.nitrogen_fixation', 'Nitrogen fixation'), color: '#22c55e',
            actor: 'Rhizobium, Bradyrhizobium, Azospirillum, Frankia, cyanobacteria',
            process: 'N₂ (atmospheric nitrogen, 78% of air) → NH₃ (ammonia). Requires the enzyme NITROGENASE + ~16 ATP per N₂ molecule. Only bacteria + archaea can do this - no eukaryote can fix nitrogen on its own.',
            where: 'In legume root nodules (clover, soybean, peanut, alfalfa). In free-living soil bacteria. In cyanobacteria of aquatic ecosystems + rice paddies. In the symbiotic Frankia of nitrogen-fixing trees (alder, bayberry).',
            note: __alloT('stem.microbiology.earth_s_entire_biosphere_depends_on_th', 'Earth\'s entire biosphere depends on this single biochemical step. Without it, no proteins; without proteins, no life.')
          },
          { id: 'nitrify', name: __alloT('stem.microbiology.nitrification', 'Nitrification'), color: '#0ea5e9',
            actor: 'Nitrosomonas + Nitrosospira (NH₃ → NO₂⁻), then Nitrobacter + Nitrospira (NO₂⁻ → NO₃⁻)',
            process: 'Two-step oxidation of ammonia to nitrate. Most plants take up nitrogen as NITRATE (NO₃⁻), so this conversion makes biological nitrogen available to plants.',
            where: 'Aerobic soils. The plant rhizosphere. Anywhere oxygen + ammonia coexist.',
            note: __alloT('stem.microbiology.nitrification_can_be_disrupted_by_wate', 'Nitrification can be disrupted by waterlogging (no oxygen) - explains why rice paddies retain ammonium. Excessive nitrification in farmland accelerates nitrogen leaching to groundwater + ocean dead zones.')
          },
          { id: 'plant', name: __alloT('stem.microbiology.plant_uptake', 'Plant uptake'), color: '#84cc16',
            actor: 'Plants (via roots + mycorrhizal partners)',
            process: 'Roots absorb NO₃⁻ + NH₄⁺ from soil water. Mycorrhizal fungi extend the effective root surface 100-1,000×. Inside the plant, nitrogen is incorporated into amino acids → proteins → DNA/RNA.',
            where: 'Every plant\'s root system. About 90% of plant species have mycorrhizal partners (Glomeromycota for most; ectomycorrhizal Basidiomycota + Ascomycota for forest trees).',
            note: __alloT('stem.microbiology.plants_also_get_carbon_for_nitrogen_tr', 'Plants also get carbon-for-nitrogen trades: they send 10-30% of photosynthesized sugars below ground to feed root + mycorrhizal partners. The "wood-wide web" of mycorrhizal connections lets trees + plants share resources across the forest floor.')
          },
          { id: 'cons', name: __alloT('stem.microbiology.consumption_decomposition', 'Consumption + decomposition'), color: '#f59e0b',
            actor: 'Herbivores, predators, decomposer bacteria + fungi',
            process: 'Animals eat plant proteins → animal proteins. When organisms die, decomposers break protein → amino acids → ammonia (ammonification). The nitrogen re-enters the cycle.',
            where: 'Every food web on Earth. Forest floor decomposition is mostly fungi + bacteria recycling N from leaves + wood.',
            note: __alloT('stem.microbiology.a_leaf_falling_in_a_forest_is_recycled', 'A leaf falling in a forest is recycled back into soil nitrogen by ~1 year in a temperate climate; faster in a tropical rainforest, slower in a boreal forest where cold limits decomposition.')
          },
          { id: 'denit', name: __alloT('stem.microbiology.denitrification', 'Denitrification'), color: '#7c3aed',
            actor: 'Pseudomonas, Paracoccus, Thiobacillus (and many others)',
            process: 'NO₃⁻ → N₂ (back to atmosphere). Anaerobic bacteria use nitrate as the terminal electron acceptor when oxygen is unavailable. Closes the cycle by returning nitrogen to the atmospheric N₂ pool.',
            where: 'Waterlogged soils, swamps, deep sediments, sewage treatment plants (a wanted reaction), the human gut (a side effect).',
            note: __alloT('stem.microbiology.agricultural_fertilizer_overuse_too_mu', 'Agricultural fertilizer overuse → too much nitrate in soil → denitrification produces N₂O (nitrous oxide), a potent greenhouse gas (~300× CO₂). Modern precision farming aims to minimize this loss.')
          }
        ];
        var sel = STEPS.find(function(s) { return s.id === d.selectedNStep; }) || STEPS[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('🌱 Plants don\'t feed themselves - microbes do',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
              __alloT('stem.microbiology.plants_cannot_fix_nitrogen_most_cannot', 'Plants cannot fix nitrogen + most cannot effectively gather phosphorus + many other nutrients on their own. They depend on microbial partners. The roots of nearly every plant species are sites of intense microbial activity. Without these partnerships, terrestrial ecosystems as we know them would not exist.')
            ),
            '#22c55e'
          ),
          sectionCard('♻️ The nitrogen cycle - bacteria run the show',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.nitrogen_is_78_of_the_atmosphere_and_a', 'Nitrogen is 78% of the atmosphere - and almost completely unusable for life in that form (N₂ is held together by a very strong triple bond). The biological nitrogen cycle solves this through a sequence of microbial steps. About half of the biologically-fixed nitrogen feeding the world comes from microbes; the other half from industrial Haber-Bosch fixation (which itself uses ~1-2% of all energy on Earth).')
              ),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                STEPS.map(function(s) {
                  var active = (d.selectedNStep || STEPS[0].id) === s.id;
                  return h('button', { key: s.id,
                    onClick: function() { upd({ selectedNStep: s.id }); },
                    style: { padding: '8px 14px', borderRadius: 8, background: active ? s.color + '33' : '#1e293b', border: '1px solid ' + (active ? s.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                  }, s.name);
                })
              ),
              h('div', { style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.microbes_responsible', 'Microbes responsible')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.actor)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.process', 'Process')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.process)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.where_it_happens', 'Where it happens')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.where)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.why_it_matters_2', 'Why it matters')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.note)
                )
              )
            ),
            '#22c55e'
          ),

          sectionCard('🍄 Mycorrhizae - the underground partnership',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } }, __alloT('stem.microbiology.about_90_of_plant_species_form_a_partn', 'About 90% of plant species form a partnership called MYCORRHIZA: roots and fungal hyphae grow together. The fungus extends the effective root system 100-1,000×, accessing water + phosphorus + other minerals the plant cannot reach. The plant gives the fungus sugars from photosynthesis. Probably the oldest symbiosis on land - about 460 million years old, and may be the reason plants colonized land in the first place.')),
              h('p', { style: { margin: '0 0 8px' } },
                h('strong', { style: { color: '#a7f3d0' } }, __alloT('stem.microbiology.two_main_types', 'Two main types: ')),
                h('em', null, __alloT('stem.microbiology.arbuscular_mycorrhizal_am', 'Arbuscular mycorrhizal (AM)')),
                __alloT('stem.microbiology.fungal_hyphae_penetrate_plant_root_cel', ' - fungal hyphae penetrate plant root cells, forming branched "arbuscules" for exchange. Found in ~80% of land plants including most crops + grasses. '),
                h('em', null, __alloT('stem.microbiology.ectomycorrhizal_ecm', 'Ectomycorrhizal (ECM)')),
                __alloT('stem.microbiology.fungal_hyphae_form_a_sheath_around_roo', ' - fungal hyphae form a sheath around root tips without entering cells. Found mostly in temperate + boreal forest trees (oak, pine, spruce, beech).')
              ),
              h('p', { style: { margin: 0 } },
                h('strong', { style: { color: '#a7f3d0' } }, __alloT('stem.microbiology.suzanne_simard_s_wood_wide_web_1997', 'Suzanne Simard\'s wood-wide web (1997+): ')),
                __alloT('stem.microbiology.mycorrhizal_networks_can_connect_trees', 'Mycorrhizal networks can connect trees of different species. "Mother trees" (large old trees) appear to share photosynthate with seedlings through these networks. The forest floor is a single interconnected organism in some functional sense. Disturbance + clear-cutting + tilling destroys these networks; restoration takes years to decades.')
              )
            ),
            '#a7f3d0'
          ),

          sectionCard('🌽 Agricultural implications',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } }, __alloT('stem.microbiology.industrial_agriculture_depends_on_biol', 'Industrial agriculture depends on biological nitrogen fixation in three forms: leguminous crop rotations (alfalfa, clover, soybean) for organic nitrogen, Rhizobium-inoculated seed treatments, and supplementary Haber-Bosch synthetic fertilizers. Each option has trade-offs.')),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 8 } },
                h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#86efac', marginBottom: 4 } }, __alloT('stem.microbiology.crop_rotation', 'Crop rotation')),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, __alloT('stem.microbiology.plant_legumes_one_season_to_fix_nitrog', 'Plant legumes one season to "fix" nitrogen; plant nitrogen-hungry crops the next. Indigenous "three sisters" agriculture (corn + beans + squash) used this for millennia. Slow + reliable + low-input.'))
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #0ea5e9' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#7dd3fc', marginBottom: 4 } }, __alloT('stem.microbiology.rhizobium_inoculants', 'Rhizobium inoculants')),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, __alloT('stem.microbiology.seed_coat_soybeans_peanuts_peas_with_t', 'Seed-coat soybeans, peanuts, peas with the right strain of Rhizobium before planting. Targeted, effective, used at industrial scale.'))
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #f59e0b' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, __alloT('stem.microbiology.synthetic_fertilizer_haber_bosch', 'Synthetic fertilizer (Haber-Bosch)')),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.55 } }, __alloT('stem.microbiology.industrial_process_1909_converts_n_h_n', 'Industrial process (1909) converts N₂ + H₂ → NH₃ at high temperature + pressure. Currently feeds about half the world. Uses 1-2% of all global energy. Largest single contributor to anthropogenic reactive nitrogen on Earth.'))
                )
              ),
              h('p', { style: { margin: 0 } },
                h('strong', { style: { color: '#fbbf24' } }, __alloT('stem.microbiology.the_nitrogen_pollution_problem', 'The nitrogen pollution problem: ')),
                __alloT('stem.microbiology.synthetic_fertilizer_manure_run_off_in', 'Synthetic fertilizer + manure run off into rivers → coastal eutrophication → algal blooms → dead zones. The Gulf of Mexico dead zone (~15,000 km² in summer) is largely fed by Mississippi River nitrogen runoff. Smaller dead zones exist in Chesapeake Bay, Long Island Sound, and the Baltic. Precision agriculture + cover cropping + restored wetlands are the main responses.')
              )
            ),
            '#fbbf24'
          ),

          // ─── Microbes + climate change ───────────────────────────
          sectionCard('🌡️ Microbes + climate change',
            (function() {
              var CC_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.microbes_shape_the_climate', 'Microbes shape the climate'), emoji: '🌐',
                  body: __alloT('stem.microbiology.microorganisms_produce_consume_most_of', 'Microorganisms produce + consume most of Earth\'s greenhouse gases. They emit methane (CH4) from wetlands + rice paddies + animal guts + landfills. They emit nitrous oxide (N2O) from agricultural soils + livestock manure + sewage. They consume methane (methanotrophs in soils + oceans). They lock atmospheric CO2 into oceans via the biological pump (phytoplankton photosynthesis → particulate carbon → ocean depths). They release CO2 from soil + ocean respiration. Aggregate microbial activity dwarfs many human emission categories: soil microbial respiration alone emits about 60-90 Gt of CO2 per year, ten times more than all human fossil-fuel + cement emissions combined. The net climate effect depends on the BALANCE between microbial sources + sinks, which climate change is itself shifting.'),
                  caveat: 'It is critical to distinguish FLUXES (gross emissions) from NET balance. Microbes have been driving carbon + nitrogen cycles for billions of years; the natural fluxes are huge but were near steady state. Anthropogenic climate change is causing those fluxes to fall out of balance. Soil + ocean microbes are responding to warming + acidification + nutrient enrichment + drought in ways that mostly amplify warming (positive feedbacks). The microbial response is not a separate climate problem; it is the AMPLIFIER on the human one.'
                },
                { id: 'permafrost', name: __alloT('stem.microbiology.the_permafrost_methane_bomb', 'The permafrost methane bomb'), emoji: '❄️',
                  body: __alloT('stem.microbiology.northern_permafrost_soils_hold_an_esti', 'Northern permafrost soils hold an estimated 1500 Gt of organic carbon - roughly twice as much carbon as is currently in the atmosphere. As warming thaws permafrost, dormant microbes (some of which can revive after thousands of years frozen) begin metabolizing previously-locked organic matter. In oxic conditions they produce CO2; in anoxic waterlogged conditions (the more common case in thawing peatland) they produce METHANE, which is ~80× more powerful as a greenhouse gas than CO2 over 20 years. The Yukon, Siberia, Alaska, and northern Canada are all warming 2-4× faster than the global average. Methane bubbling from thaw lakes is now directly observable + measurable. Estimated cumulative permafrost emissions through 2100 could be 100-300 Gt of carbon equivalent - comparable to a major industrial-sector\'s entire historical emissions.'),
                  caveat: 'The permafrost carbon timeline is uncertain. Some carbon will release fast (decades); much may take centuries. Some thawed organic matter may be partially re-stabilized by new vegetation growth (boreal forest expansion) + microbial communities that immobilize carbon. The "abrupt thaw" pathway (where ice-rich soils collapse + drain into large thaw lakes) releases methane far faster than the "gradual thaw" pathway. Current climate models are bad at handling abrupt thaw; observed emissions are running higher than modeled in some Siberian sites.'
                },
                { id: 'ocean', name: __alloT('stem.microbiology.ocean_acidification_phytoplankton', 'Ocean acidification + phytoplankton'), emoji: '🌊',
                  body: __alloT('stem.microbiology.the_ocean_has_absorbed_about_30_of_ant', 'The ocean has absorbed about 30% of anthropogenic CO2 emissions since 1750, increasing seawater acidity by ~0.1 pH units (a 30% increase in hydrogen ion concentration). This affects shell-forming organisms (coccolithophores, foraminifera, pteropods, coral, mollusks) by making calcium carbonate precipitation more difficult. Some species are migrating poleward; others are facing population collapse. Microbial PHYTOPLANKTON drive ~50% of Earth\'s photosynthesis + are the base of the marine food web. Warming surface waters stratify more strongly, REDUCING nutrient mixing from deep water to the surface, REDUCING phytoplankton biomass in most ocean regions over the past 30 years (Boyce et al. 2010, debated; more recent studies confirm a decline in chlorophyll in subtropical gyres). At the same time, polar phytoplankton communities are responding to ice retreat with shifted timing + sometimes higher biomass.'),
                  caveat: 'Net marine carbon storage is changing in complex ways that are hard to summarize. The biological pump (sinking particulate carbon) may be slowing in some regions + holding steady in others. Marine microbes can adapt evolutionarily on relatively fast timescales (some species double in hours). Predictions about ocean carbon storage in 2100 vary substantially between models. The high-confidence statement: ocean ecosystems are changing fast + losing biodiversity, regardless of net carbon flux uncertainty.'
                },
                { id: 'methanotroph', name: __alloT('stem.microbiology.methanotrophs_the_methane_sink', 'Methanotrophs - the methane sink'), emoji: '🧫',
                  body: __alloT('stem.microbiology.methanotrophs_are_bacteria_that_use_me', 'Methanotrophs are bacteria that use methane as their sole carbon + energy source, oxidizing it to CO2 + water. They live in soils (especially well-drained forest + grassland soils), water columns above sediments, and aerobic zones in landfills + sewage. Globally, methanotrophs consume ~30-50 Tg of methane per year - about 5-10% of total methane emissions. This is a "free" climate-mitigation service. Disturbance (tillage, drainage, nitrogen fertilizer, urbanization) reduces methanotroph populations + their methane uptake; one of the most measurable land-use-change effects on greenhouse gas balance. Engineered methanotroph systems are being trialed for landfill cover + livestock-barn off-gas treatment.'),
                  caveat: 'Methanotroph protection is a cheap climate intervention that gets little attention. Industrial agriculture practices that destroy soil structure also destroy methanotroph habitat; regenerative + conservation agriculture practices that preserve soil structure ALSO preserve methanotrophs. The same management practices that increase soil organic carbon (no-till, cover cropping, diverse rotations, agroforestry) generally also boost methane uptake. Microbe-friendly farming is climate-friendly farming.'
                },
                { id: 'fungi', name: __alloT('stem.microbiology.mycorrhizal_fungi_soil_carbon', 'Mycorrhizal fungi + soil carbon'), emoji: '🍄',
                  body: __alloT('stem.microbiology.mycorrhizal_fungi_form_mutualistic_ass', 'Mycorrhizal fungi form mutualistic associations with about 80% of terrestrial plant species, extending the plant\'s nutrient-absorbing surface area through fine hyphae that infiltrate soil pores too small for plant roots. The fungi receive ~10-20% of the plant\'s photosynthate sugars; the plant receives phosphorus, micronutrients, and water. Importantly, the carbon delivered to the fungi is partly stabilized as long-lived soil organic matter (via glomalin, a fungal glycoprotein that binds soil aggregates). Mycorrhizal fungi store an estimated 13 Gt of CO2 equivalent in soils PER YEAR - about 36% of annual fossil-fuel emissions. They are a major + previously underappreciated component of the terrestrial carbon sink.'),
                  caveat: 'Soil disturbance (especially tillage) breaks the mycorrhizal network + accelerates carbon decomposition. The "no-till revolution" of the past 30 years has measurably increased soil carbon + mycorrhizal biomass on millions of US acres, but adoption is incomplete + reversal during droughts (when farmers may till to control weeds) erases years of gains in a single season. Climate-smart agriculture programs (USDA Climate-Smart Commodities, EU CAP eco-schemes) increasingly target mycorrhizal-friendly practices, but funding + verification remain incomplete.'
                },
                { id: 'livestock', name: __alloT('stem.microbiology.livestock_methane_the_rumen_microbiome', 'Livestock methane + the rumen microbiome'), emoji: '🐄',
                  body: __alloT('stem.microbiology.ruminants_cattle_sheep_goats_buffalo_p', 'Ruminants (cattle, sheep, goats, buffalo) produce methane through their forestomach microbiome - a community of archaea + bacteria + protozoa + fungi that ferment plant fiber into volatile fatty acids the animal can absorb. Methanogenic archaea use hydrogen from this fermentation to reduce CO2 to methane (CH4), which the animal then burps + farts out. Globally, ruminant methane is ~32% of all anthropogenic methane (rice paddies + landfills + fossil-fuel leaks + wastewater make up the rest). Interventions that DO work in trials: red seaweed (Asparagopsis taxiformis) added to feed at ~1% concentration reduces methane emissions by 50-90%. 3-NOP (Bovaer, approved in EU + Brazil + Australia, FDA review ongoing) reduces ~30%. Selective breeding for low-methane cattle is feasible + multiplicative with feed additives.'),
                  caveat: 'Methane-reduction additives are real + promising, but DEPLOY at scale + verify in commercial practice is harder than in controlled trials. Some additives (3-NOP) face consumer-acceptance concerns. Asparagopsis cultivation at the needed scale is unproven. Cattle population reduction (eating less beef) would also reduce emissions but faces obvious cultural + economic resistance. There is no single silver bullet; a combination of feed additives, breeding, methane-capturing barns, and dietary shifts will be needed if the sector is to meet climate commitments.'
                },
                { id: 'evolve', name: __alloT('stem.microbiology.microbes_will_evolve_to_cope', 'Microbes will evolve to cope'), emoji: '🧬',
                  body: __alloT('stem.microbiology.microbes_have_far_shorter_generation_t', 'Microbes have far shorter generation times than plants or animals (minutes to hours rather than years). They can respond evolutionarily to environmental change much faster. Warming + acidification + new substrate availability all select for variants that thrive under the new conditions. Marine bacteria have evolved measurable temperature tolerance shifts in just ~20 years of observation. Soil microbial communities reshuffle within a single growing season. This adaptability is a partial good news story (microbes will not "go extinct" the way large vertebrates might) + a partial bad news story (we cannot predict what NEW microbial-driven feedbacks will emerge as ecosystems reorganize).'),
                  caveat: 'Microbial evolution does not save us. The communities that evolve in response to anthropogenic stresses may be productive in the wrong ways (more methane, less carbon storage, more pathogens, fewer mutualisms). Counting on microbes to "adapt and save the climate" is wishful thinking. The honest framing: microbes are central actors in the climate system, their behavior IS the climate-feedback story, and protecting their healthy functioning (intact soils, healthy oceans, undisturbed permafrost) is a major climate priority that has been historically under-funded relative to its importance.'
                }
              ];
              var sel = d.selectedClimate || 'overview';
              var topic = CC_TOPICS.find(function(t) { return t.id === sel; }) || CC_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.when_people_picture_climate_change_the', 'When people picture climate change, they picture smokestacks + cars + coal plants. The microbial layer is invisible + far larger. Microorganisms produce + consume most of Earth\'s greenhouse gases; soil + ocean microbes set the carbon-cycle balance; permafrost microbes hold a billion-year-old carbon stockpile that is now waking up. Climate science + microbial ecology are inseparable.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  CC_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedClimate: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#22c55e' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #22c55e' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#86efac', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_6', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.cross_tool_connection', 'Cross-tool connection: ')),
                  __alloT('stem.microbiology.for_king_middle_s_el_education_place_b', 'For King Middle\'s EL Education place-based pedagogy: Maine\'s salt marshes, bogs, forests, and Gulf of Maine waters all participate in these microbial-climate cycles. The Wells Reserve, the Schoodic Institute at Acadia, and the University of Maine Climate Change Institute run citizen-science programs that students can join. This section pairs with ClimateExplorer + Stewardship Studio in the broader AlloFlow curriculum.')
                )
              );
            })(),
            '#22c55e'
          )
        );
      }

      // BIOFILMS + QUORUM SENSING
      function renderBiofilm() {
        var density = d.biofilmDensity != null ? d.biofilmDensity : 50;
        // Quorum-sensing threshold: cells start coordinated behavior at high density
        var threshold = 100;
        var pctOfThreshold = (density / threshold) * 100;
        var active = density >= threshold;

        function biofilmSvg() {
          var svgW = 600, svgH = 200;
          // Substrate (surface) along bottom
          var nCells = density;
          var cells = [];
          for (var i = 0; i < nCells; i++) {
            cells.push({
              x: 20 + Math.random() * (svgW - 40),
              y: 130 + Math.random() * 50,
              r: 3 + Math.random() * 2
            });
          }
          return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'biofilmTitle biofilmDesc' },
            h('title', { id: 'biofilmTitle' }, __alloT('stem.microbiology.biofilm_formation_visualization', 'Biofilm formation visualization')),
            h('desc', { id: 'biofilmDesc' }, 'A surface with ' + density + ' bacterial cells. At low density, cells behave individually. At quorum-sensing threshold (~100 cells/area), they coordinate into a biofilm community with shared protective matrix.'),
            // Substrate
            h('rect', { x: 0, y: 180, width: svgW, height: 20, fill: '#475569' }),
            h('text', { x: svgW / 2, y: 196, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10 }, __alloT('stem.microbiology.surface_catheter_tooth_lung_rock_anyth', 'Surface (catheter, tooth, lung, rock, anything)')),
            // Quorum signal molecules (small dots floating between cells when density rises)
            density > 30 ? (function() {
              var sigs = [];
              for (var k = 0; k < Math.min(40, density / 3); k++) {
                sigs.push(h('circle', { key: 's' + k,
                  cx: 20 + Math.random() * (svgW - 40),
                  cy: 100 + Math.random() * 70,
                  r: 1.2,
                  fill: '#fbbf24', opacity: 0.6
                }));
              }
              return h('g', null, sigs);
            })() : null,
            // Matrix (EPS) - only visible above threshold
            active ? (function() {
              var pts = [];
              for (var j = 0; j < 30; j++) {
                pts.push((20 + (j / 29) * (svgW - 40)) + ',' + (110 + Math.sin(j * 0.4) * 8 + Math.random() * 5));
              }
              return h('path', { d: 'M 20,180 L ' + pts.join(' L ') + ' L ' + (svgW - 20) + ',180 Z', fill: '#10b981', opacity: 0.25, stroke: '#10b981', strokeWidth: 1, strokeOpacity: 0.5 });
            })() : null,
            // Cells
            cells.map(function(c, i) {
              return h('circle', { key: 'c' + i, cx: c.x, cy: c.y, r: c.r, fill: active ? '#86efac' : '#fde68a', stroke: active ? '#065f46' : '#92400e', strokeWidth: 0.5, opacity: 0.9 });
            }),
            // Activated communication signals between cells (when active)
            active ? h('text', { x: svgW / 2, y: 30, textAnchor: 'middle', fill: '#86efac', fontSize: 14, fontWeight: 800 }, __alloT('stem.microbiology.quorum_reached_biofilm_activated', '✓ Quorum reached - biofilm activated')) :
              h('text', { x: svgW / 2, y: 30, textAnchor: 'middle', fill: '#fbbf24', fontSize: 14, fontWeight: 800 }, '... cells behave individually (' + pctOfThreshold.toFixed(0) + '% of quorum)')
          );
        }

        return h('div', { style: { padding: 16 } },
          sectionCard('🦠 Biofilms - when bacteria become a city',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.most_bacteria_in_nature_do_not_live_as', 'Most bacteria in nature do NOT live as isolated single cells. They live in BIOFILMS - communities attached to surfaces, embedded in a shared protective matrix of polysaccharides + proteins + DNA. Dental plaque is a biofilm. Hospital catheter infections are biofilms. The pink slime in your shower drain is a biofilm. The slippery rocks in a stream are biofilms.')
              ),
              biofilmSvg(),
              h('div', { style: { marginTop: 10, padding: 8, borderRadius: 6, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  h('span', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 700 } }, __alloT('stem.microbiology.cell_density', 'Cell density')),
                  h('span', { style: { fontSize: 13, color: active ? '#86efac' : '#fbbf24', fontWeight: 800 } }, density + ' cells/area · ' + pctOfThreshold.toFixed(0) + '% of quorum')
                ),
                h('input', { type: 'range', 'aria-valuetext': density + ' cells per area', min: 5, max: 200, step: 5, value: density,
                  onChange: function(e) { upd({ biofilmDensity: parseInt(e.target.value, 10) }); },
                  'aria-label': __alloT('stem.microbiology.cell_density_2', 'Cell density'),
                  style: { width: '100%', accentColor: EMERALD }
                })
              )
            ),
            EMERALD
          ),

          sectionCard('📡 Quorum sensing - bacterial chemical communication',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.each_bacterium_constantly_releases_sma', 'Each bacterium constantly releases small "autoinducer" molecules into its surroundings. When the local concentration of these molecules crosses a threshold (= many bacteria nearby), gene expression changes. Behaviors that don\'t make sense at low density (biofilm formation, virulence, light production, sporulation) only activate when there are enough cells around to do them collectively.')
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 6 } }, __alloT('stem.microbiology.4_examples_of_quorum_sensing_in_action', '4 examples of quorum sensing in action:')),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
                  h('li', null, h('strong', null, __alloT('stem.microbiology.vibrio_fischeri_bioluminescence', 'Vibrio fischeri (bioluminescence): ')), __alloT('stem.microbiology.lives_in_the_light_organ_of_the_hawaii', 'Lives in the light organ of the Hawaiian bobtail squid. Below quorum, no light (wastes energy). At high density inside the squid, the bacteria glow - providing the squid with counter-illumination camouflage. Foundational discovery of quorum sensing (Nealson + Hastings 1970s).')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.pseudomonas_aeruginosa_virulence', 'Pseudomonas aeruginosa (virulence): ')), __alloT('stem.microbiology.a_bacterium_that_infects_cystic_fibros', 'A bacterium that infects cystic fibrosis lungs + burn wounds + immunocompromised patients. Stays "stealthy" at low density; releases tissue-damaging toxins only after biofilm + quorum. Disrupting quorum signaling is an active drug-development strategy.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.streptococcus_mutans_dental_plaque', 'Streptococcus mutans (dental plaque): ')), __alloT('stem.microbiology.quorum_sensing_triggers_biofilm_format', 'Quorum sensing triggers biofilm formation + acid production. The acid demineralizes tooth enamel → cavities. Brushing disrupts the biofilm; fluoride raises remineralization threshold.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.bacillus_subtilis_spore_formation', 'Bacillus subtilis (spore formation): ')), __alloT('stem.microbiology.under_starvation_high_density_this_soi', 'Under starvation + high density, this soil bacterium forms tough spores that survive for thousands of years. Quorum tells the colony whether to commit to sporulation.'))
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.why_biofilms_make_antibiotic_resistanc', 'Why biofilms make antibiotic resistance worse: ')),
                __alloT('stem.microbiology.a_bacterium_inside_a_biofilm_is_100_10', 'A bacterium inside a biofilm is 100-1000× more resistant to antibiotics than the same bacterium swimming free. Three reasons: (1) the matrix physically blocks antibiotic penetration; (2) cells deep inside grow slowly + many antibiotics only work on growing cells; (3) close contact enables rapid horizontal gene transfer of resistance genes. Many chronic infections (cystic fibrosis lung, prosthetic joint, endocarditis) are biofilm infections - they cannot be cured by antibiotics alone + often require surgical removal of the infected device.')
              )
            ),
            '#fbbf24'
          ),

          sectionCard('💉 The medical reality of biofilms',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
              __alloT('stem.microbiology.the_cdc_estimates_that', 'The CDC estimates that '),
              h('strong', { style: { color: '#fca5a5' } }, __alloT('stem.microbiology.65_80_of_all_human_bacterial_infection', '65-80% of all human bacterial infections involve biofilms')),
              __alloT('stem.microbiology.common_sites_catheters_urinary_central', '. Common sites: catheters (urinary, central venous), prosthetic joints + heart valves, contact lenses, lungs of people with cystic fibrosis, periodontitis (gum disease). Successful treatment often means removing the infected device + a long antibiotic course. Research is active on enzymatic biofilm disruptors, quorum-sensing inhibitors, phage therapy, and engineered surface coatings that resist biofilm formation.')
            ),
            '#fca5a5'
          )
        );
      }

      // IMMUNE + VACCINES
      function renderImmune() {
        // Deep-dive content for the immune system
        var immuneDive = (function() {
          var topic = d.immuneTopic || 'cells';
          var TOPICS = [
            { id: 'cells',  name: __alloT('stem.microbiology.white_blood_cells', 'White blood cells') },
            { id: 'ab',     name: __alloT('stem.microbiology.antibody_structure', 'Antibody structure') },
            { id: 'tcells', name: __alloT('stem.microbiology.t_cells_mhc', 'T cells + MHC') },
            { id: 'memory', name: __alloT('stem.microbiology.memory_clonal_selection', 'Memory + clonal selection') }
          ];

          // Antibody Y-shape SVG
          function antibodySvg() {
            var svgW = 280, svgH = 240;
            return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'abTitle abDesc' },
              h('title', { id: 'abTitle' }, __alloT('stem.microbiology.antibody_structure_2', 'Antibody structure')),
              h('desc', { id: 'abDesc' }, __alloT('stem.microbiology.a_y_shaped_antibody_molecule_with_two_', 'A Y-shaped antibody molecule with two identical heavy chains forming the trunk + arms, and two identical light chains on the arm tips. The arm tips form variable regions that bind specific antigens; the trunk is the constant region that signals other immune cells.')),
              // Constant region (Fc - trunk)
              h('rect', { x: 110, y: 130, width: 60, height: 80, rx: 8, fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 1.5 }),
              h('text', { x: 140, y: 230, textAnchor: 'middle', fill: '#bfdbfe', fontSize: 11, fontWeight: 700 }, __alloT('stem.microbiology.fc_constant', 'Fc (constant)')),
              // Heavy chains (arms)
              h('polygon', { points: '140,130 70,40 110,40 140,90', fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 1.5 }),
              h('polygon', { points: '140,130 210,40 170,40 140,90', fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 1.5 }),
              // Light chains (variable tips, different color)
              h('polygon', { points: '70,40 60,20 100,20 110,40', fill: '#fbbf24', stroke: '#b45309', strokeWidth: 1.5 }),
              h('polygon', { points: '210,40 220,20 180,20 170,40', fill: '#fbbf24', stroke: '#b45309', strokeWidth: 1.5 }),
              // Antigen-binding labels
              h('text', { x: 80, y: 14, textAnchor: 'middle', fill: '#fde68a', fontSize: 10, fontWeight: 700 }, 'Fab'),
              h('text', { x: 200, y: 14, textAnchor: 'middle', fill: '#fde68a', fontSize: 10, fontWeight: 700 }, 'Fab'),
              h('text', { x: 80, y: 80, textAnchor: 'middle', fill: '#bfdbfe', fontSize: 9 }, 'heavy'),
              h('text', { x: 200, y: 80, textAnchor: 'middle', fill: '#bfdbfe', fontSize: 9 }, 'heavy'),
              h('text', { x: 30, y: 30, fill: '#fde68a', fontSize: 9 }, 'light'),
              h('text', { x: 230, y: 30, fill: '#fde68a', fontSize: 9 }, 'light'),
              // Antigen binding indicator
              h('circle', { cx: 80, cy: 5, r: 5, fill: '#ef4444', stroke: '#7f1d1d', strokeWidth: 1 }),
              h('circle', { cx: 200, cy: 5, r: 5, fill: '#ef4444', stroke: '#7f1d1d', strokeWidth: 1 }),
              h('text', { x: 140, y: 105, textAnchor: 'middle', fill: '#fda4af', fontSize: 9 }, __alloT('stem.microbiology.binds_antigen', 'binds antigen')),
              // Hinge region
              h('rect', { x: 130, y: 120, width: 20, height: 12, fill: '#475569' }),
              h('text', { x: 175, y: 128, fill: '#94a3b8', fontSize: 9 }, 'hinge')
            );
          }

          var content;
          if (topic === 'cells') {
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65 } },
                __alloT('stem.microbiology.every_white_blood_cell_does_a_specific', 'Every white blood cell does a specific job. About 1% of your blood by volume is white blood cells; you have ~30 billion of them at any moment, and bone marrow produces hundreds of billions per day.')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 } },
                [
                  { name: __alloT('stem.microbiology.neutrophils', 'Neutrophils'), arm: 'innate', role: 'First responders. Most abundant white cell. Phagocytose bacteria + fungi. Lifespan: hours. The pus in an infection is mostly dead neutrophils.', color: '#fbbf24' },
                  { name: __alloT('stem.microbiology.macrophages', 'Macrophages'), arm: 'innate', role: 'Long-lived tissue patrollers. Eat pathogens + debris. Present chewed-up antigens to T cells (a hand-off to adaptive immunity). Live months to years.', color: '#fbbf24' },
                  { name: __alloT('stem.microbiology.dendritic_cells', 'Dendritic cells'), arm: 'innate (bridge)', role: 'The professional antigen-presenters. Sample what\'s in tissues; migrate to lymph nodes; show T cells what they found. The key link between innate detection + adaptive response.', color: '#a855f7' },
                  { name: __alloT('stem.microbiology.natural_killer_nk_cells', 'Natural Killer (NK) cells'), arm: 'innate', role: 'Kill cells that "look wrong" - virus-infected or cancerous. Detect a missing self-MHC signal. No memory; act on what\'s in front of them.', color: '#fbbf24' },
                  { name: __alloT('stem.microbiology.b_cells', 'B cells'), arm: 'adaptive', role: 'Make antibodies. Each B cell expresses one antibody specificity (about 10¹¹ possible specificities exist across all your B cells). Activated B cells become plasma cells (antibody factories) or memory B cells.', color: EMERALD },
                  { name: __alloT('stem.microbiology.t_helper_cells_cd4', 'T helper cells (CD4+)'), arm: 'adaptive', role: 'Conductors of the immune orchestra. Activate B cells, killer T cells, macrophages. HIV destroys CD4+ T cells, which is what causes AIDS.', color: EMERALD },
                  { name: __alloT('stem.microbiology.cytotoxic_killer_t_cells_cd8', 'Cytotoxic / Killer T cells (CD8+)'), arm: 'adaptive', role: 'Kill infected cells. Each recognizes one antigen + MHC class I combination. Critical for clearing viral + cancerous cells.', color: EMERALD },
                  { name: __alloT('stem.microbiology.regulatory_t_cells_tregs', 'Regulatory T cells (Tregs)'), arm: 'adaptive', role: 'Brakes on the immune response. Stop responses to self-antigens (preventing autoimmunity). Defective Tregs are implicated in many autoimmune diseases.', color: EMERALD }
                ].map(function(c, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + c.color } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 } },
                      h('div', { style: { fontSize: 12.5, fontWeight: 800, color: 'var(--allo-stem-text, #e2e8f0)' } }, c.name),
                      h('div', { style: { fontSize: 9.5, color: c.color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 } }, c.arm)
                    ),
                    h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.55 } }, c.role)
                  );
                })
              )
            );
          } else if (topic === 'ab') {
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65 } },
                __alloT('stem.microbiology.antibodies_immunoglobulins_are_y_shape', 'Antibodies (immunoglobulins) are Y-shaped proteins made by B cells. Each has two identical "arms" (Fab regions) that bind a specific antigen, joined to a "stem" (Fc region) that signals other immune cells. About 10¹¹ different antibody specificities can be generated by your B cells through random rearrangement of antibody gene segments (V, D, J recombination - 1987 Nobel to Tonegawa).')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' } },
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0a0e1a', border: '1px solid var(--allo-stem-border, #334155)' } }, antibodySvg()),
                h('div', null,
                  h('div', { style: { fontSize: 12.5, fontWeight: 700, color: '#6ee7b7', marginBottom: 8 } }, __alloT('stem.microbiology.the_five_antibody_classes', 'The five antibody classes:')),
                  h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 } },
                    h('thead', null, h('tr', null,
                      ['Class', 'Where', 'Job'].map(function(c, i) {
                        return h('th', { key: i, style: { padding: 5, textAlign: 'left', borderBottom: '1px solid var(--allo-stem-border, #334155)', color: 'var(--allo-stem-text-soft, #94a3b8)', fontWeight: 800 } }, c);
                      })
                    )),
                    h('tbody', null,
                      [
                        { c: 'IgG', w: 'Most abundant in blood (75%)', j: 'Long-term immunity. Crosses placenta to protect babies. Most vaccine-induced antibodies are IgG.' },
                        { c: 'IgM', w: 'First made during infection', j: 'Early response. Pentamer (5 Y\'s joined) for high avidity.' },
                        { c: 'IgA', w: 'Mucous membranes + breast milk', j: 'Mucosal immunity. Protects gut, lungs, breastfed babies\' guts.' },
                        { c: 'IgE', w: 'Trace amount in blood', j: 'Allergic reactions + parasite defense. Binds mast cells.' },
                        { c: 'IgD', w: 'B-cell surface marker', j: 'Role still being understood. Helps activate B cells.' }
                      ].map(function(r, i) {
                        return h('tr', { key: i, style: { background: i % 2 === 0 ? '#0f172a' : '#1e293b' } },
                          h('td', { style: { padding: 5, fontWeight: 700, color: '#6ee7b7' } }, r.c),
                          h('td', { style: { padding: 5, color: 'var(--allo-stem-text, #e2e8f0)' } }, r.w),
                          h('td', { style: { padding: 5, color: 'var(--allo-stem-text, #cbd5e1)' } }, r.j)
                        );
                      })
                    )
                  )
                )
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.how_antibodies_stop_pathogens_4_mechan', 'How antibodies stop pathogens (4 mechanisms): ')),
                h('ol', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.65 } },
                  h('li', null, h('strong', null, 'Neutralization: '), __alloT('stem.microbiology.blocks_the_pathogen_from_binding_its_t', 'Blocks the pathogen from binding its target cell. (How antiviral antibodies prevent infection.)')),
                  h('li', null, h('strong', null, 'Opsonization: '), __alloT('stem.microbiology.coats_the_pathogen_making_it_easier_fo', 'Coats the pathogen, making it easier for phagocytes to recognize + eat.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.complement_activation', 'Complement activation: ')), __alloT('stem.microbiology.triggers_a_cascade_of_blood_proteins_t', 'Triggers a cascade of blood proteins that drill holes in bacteria.')),
                  h('li', null, h('strong', null, 'ADCC: '), __alloT('stem.microbiology.antibody_dependent_cellular_cytotoxici', 'Antibody-dependent cellular cytotoxicity - NK cells or macrophages destroy antibody-coated targets.'))
                )
              )
            );
          } else if (topic === 'tcells') {
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65 } },
                __alloT('stem.microbiology.t_cells_don_t_see_pathogens_directly_t', 'T cells don\'t see pathogens directly. They see fragments of pathogens presented on the surface of other cells. The presenting molecule is called MHC (Major Histocompatibility Complex; also called HLA in humans). Two classes; two T cell types.')
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #38bdf8' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 6 } }, __alloT('stem.microbiology.mhc_class_i', 'MHC class I')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } },
                    h('strong', null, 'Where: '), __alloT('stem.microbiology.on_almost_every_nucleated_cell', 'On almost every nucleated cell.'), h('br'),
                    h('strong', null, 'Shows: '), __alloT('stem.microbiology.fragments_of_proteins_made_inside_that', 'Fragments of proteins made INSIDE that cell (so if a virus is replicating inside, viral proteins get shown).'), h('br'),
                    h('strong', null, __alloT('stem.microbiology.detected_by', 'Detected by: ')), __alloT('stem.microbiology.cd8_killer_t_cells_if_they_see_a_forei', 'CD8+ killer T cells. If they see a foreign peptide on MHC-I, they kill the cell.')
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid #ec4899' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 6 } }, __alloT('stem.microbiology.mhc_class_ii', 'MHC class II')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } },
                    h('strong', null, 'Where: '), __alloT('stem.microbiology.mainly_on_professional_antigen_present', 'Mainly on professional antigen-presenting cells (dendritic cells, macrophages, B cells).'), h('br'),
                    h('strong', null, 'Shows: '), __alloT('stem.microbiology.fragments_of_proteins_ingested_from_th', 'Fragments of proteins INGESTED from the environment (bacteria, dead cells, debris).'), h('br'),
                    h('strong', null, __alloT('stem.microbiology.detected_by_2', 'Detected by: ')), __alloT('stem.microbiology.cd4_helper_t_cells_if_they_see_a_forei', 'CD4+ helper T cells. If they see a foreign peptide on MHC-II, they activate B cells + other immune responses.')
                  )
                )
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.why_organ_transplants_are_rejected', 'Why organ transplants are rejected: ')),
                __alloT('stem.microbiology.each_person_has_a_unique_combination_o', 'Each person has a unique combination of MHC alleles (your "HLA type"). T cells are trained to ignore your own MHC + react against everyone else\'s. A transplanted organ\'s MHC molecules look "foreign" and trigger massive T-cell rejection. Transplant matching looks for the closest HLA match; immunosuppressants block T-cell activation. Identical twins can transplant without immunosuppression because their HLA is identical.')
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.checkpoint_inhibitors_cancer_immunothe', 'Checkpoint inhibitors - cancer immunotherapy: ')),
                __alloT('stem.microbiology.cancer_cells_often_present_abnormal_pe', 'Cancer cells often present "abnormal" peptides on MHC-I + would be killed by T cells. Many cancers evade this by displaying CTLA-4 + PD-L1, which act as "brakes" on T cells. Checkpoint inhibitor drugs (pembrolizumab, nivolumab) release those brakes. The 2018 Nobel went to James Allison + Tasuku Honjo for this discovery. Has revolutionized treatment of melanoma, lung cancer, and others - sometimes curing previously-fatal disease.')
              )
            );
          } else { // memory
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65 } },
                __alloT('stem.microbiology.how_does_the_immune_system_remember_th', 'How does the immune system remember? Through CLONAL SELECTION - the central insight of modern immunology, proposed by Burnet in 1957 and proved over the next two decades.')
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 10 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, __alloT('stem.microbiology.clonal_selection_in_4_steps', 'Clonal selection in 4 steps:')),
                h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
                  h('li', null, h('strong', null, 'Diversity: '), __alloT('stem.microbiology.before_any_infection_your_body_has_b_c', 'Before any infection, your body has B cells + T cells with ~10¹¹ different antigen receptors. Each lymphocyte makes ONE specificity, generated randomly through V(D)J recombination. Most of those random specificities will never encounter their target.')),
                  h('li', null, h('strong', null, 'Selection: '), __alloT('stem.microbiology.when_a_pathogen_enters_only_the_lympho', 'When a pathogen enters, only the lymphocytes whose receptors happen to fit react. They get activated. The other 99.99...% sit out the infection.')),
                  h('li', null, h('strong', null, __alloT('stem.microbiology.expansion_clonal', 'Expansion (clonal): ')), __alloT('stem.microbiology.the_few_activated_lymphocytes_divide_r', 'The few activated lymphocytes divide rapidly - generating thousands or millions of identical "clones," all making the same pathogen-fitting receptor. Effector cells (plasma cells making antibodies, cytotoxic T cells killing infected cells) clear the infection.')),
                  h('li', null, h('strong', null, 'Memory: '), __alloT('stem.microbiology.a_subset_of_the_expanded_clones_differ', 'A subset of the expanded clones differentiate into MEMORY cells. They\'re long-lived (decades), waiting. When the same pathogen returns, they activate within hours instead of days. This is why second infections are usually milder + why vaccines work.'))
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65, marginBottom: 8 } },
                h('strong', null, __alloT('stem.microbiology.why_vaccines_work', 'Why vaccines work: ')),
                __alloT('stem.microbiology.a_vaccine_introduces_pathogen_pieces_o', 'A vaccine introduces pathogen pieces (or instructions for cells to make pathogen pieces, like mRNA vaccines). Clonal selection activates the matching lymphocytes. Memory cells form. When the real pathogen later arrives, response is in hours, not days. The pathogen is cleared before causing disease.')
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                h('strong', null, __alloT('stem.microbiology.when_memory_fails', 'When memory fails: ')),
                __alloT('stem.microbiology.some_pathogens_evolve_fast_enough_to_o', 'Some pathogens evolve fast enough to outrun memory (flu changes the H + N proteins annually - antigenic drift). Some hide inside cells where antibodies can\'t reach (HIV in T cells, herpes in nerves). Some actively destroy the memory itself (measles causes "immune amnesia," erasing immune memory of prior infections for 2-3 years). Vaccination + post-exposure prophylaxis are how we manage each of these.')
              )
            );
          }

          return h('div', null,
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } },
              TOPICS.map(function(t) {
                var active = topic === t.id;
                return h('button', { key: t.id,
                  onClick: function() { upd({ immuneTopic: t.id }); },
                  style: { padding: '6px 12px', borderRadius: 8, background: active ? 'rgba(16,185,129,0.25)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), color: active ? '#6ee7b7' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                }, t.name);
              })
            ),
            content
          );
        })();

        return h('div', { style: { padding: 16 } },
          sectionCard('Two arms of the immune system',
            h('div', null,
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid #fbbf24' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: 'var(--allo-stem-text, #fde68a)', marginBottom: 4 } }, __alloT('stem.microbiology.innate_immunity', 'Innate immunity')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, __alloT('stem.microbiology.the_fast_general_defense_skin_mucus_st', 'The fast, general defense. Skin, mucus, stomach acid, macrophages, neutrophils, natural killer cells. Acts within minutes to hours. Same response to any pathogen - no specific memory.'))
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid ' + EMERALD } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#6ee7b7', marginBottom: 4 } }, __alloT('stem.microbiology.adaptive_immunity', 'Adaptive immunity')),
                  h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, __alloT('stem.microbiology.the_slow_specific_defense_b_cells_make', 'The slow, specific defense. B cells (make antibodies) and T cells (kill infected cells + coordinate). Takes days the first time, but creates MEMORY cells that respond in hours on re-exposure. The basis of vaccination.'))
                )
              )
            )
          ),
          sectionCard('How vaccines work',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.a_vaccine_shows_your_immune_system_a_s', 'A vaccine shows your immune system a safe preview of a pathogen so it can build memory cells WITHOUT you having to get sick from the real thing. When the real pathogen arrives, your immune system recognizes it instantly and responds in hours instead of days.')
              ),
              h('p', { style: { margin: 0, fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                __alloT('stem.microbiology.vaccines_do_not_treat_existing_infecti', 'Vaccines do NOT treat existing infection. They prevent infection (or prevent severe disease). The "safe preview" can be: a killed pathogen (flu shot), a weakened live pathogen (MMR), a protein fragment (hepatitis B), or instructions for your cells to make a viral protein themselves (mRNA vaccines).')
              )
            )
          ),
          sectionCard('🛡️ Immune system deep-dive',
            immuneDive,
            EMERALD
          ),

          sectionCard('🧬 CAR-T cell therapy - using immunity to cure cancer',
            (function() {
              var STEPS = [
                { id: 'collect', name: __alloT('stem.microbiology.1_collect_t_cells', '1. Collect T cells'), color: '#0ea5e9',
                  what: 'Blood is drawn from the patient. Using apheresis (similar to platelet donation), T cells are separated + frozen. The rest of the blood goes back to the patient.',
                  detail: __alloT('stem.microbiology.most_car_t_treatments_are_autologous_t', 'Most CAR-T treatments are AUTOLOGOUS - the patient\'s own cells are used. This avoids immune rejection but is slow + expensive. ALLOGENEIC CAR-T (cells from a healthy donor, available off-the-shelf) is in development.')
                },
                { id: 'engineer', name: __alloT('stem.microbiology.2_engineer_the_cells', '2. Engineer the cells'), color: '#a855f7',
                  what: 'T cells are sent to a manufacturing facility. A disabled virus (lentivirus or retrovirus) delivers a custom GENE for a Chimeric Antigen Receptor (CAR) - a synthetic protein with two parts: an outside region that binds a cancer-specific antigen, and an inside region that activates the T cell.',
                  detail: __alloT('stem.microbiology.for_b_cell_cancers_leukemia_lymphoma_c', 'For B-cell cancers (leukemia, lymphoma), CAR-T cells target CD19 - a protein on the surface of all B cells. The CAR-T cells will destroy both cancerous AND healthy B cells, which is acceptable because B cell loss is manageable with IV immunoglobulin.')
                },
                { id: 'expand', name: __alloT('stem.microbiology.3_expand_to_billions', '3. Expand to billions'), color: '#22c55e',
                  what: 'The engineered T cells multiply in culture for 10-21 days, producing hundreds of millions to billions of cells.',
                  detail: __alloT('stem.microbiology.manufacturing_must_be_tightly_controll', 'Manufacturing must be tightly controlled - each patient\'s cells are a unique product. Yields vary; some patients\' cells expand poorly, sometimes requiring a second collection.')
                },
                { id: 'infuse', name: __alloT('stem.microbiology.4_infuse_back_into_the_patient', '4. Infuse back into the patient'), color: '#fbbf24',
                  what: 'After a brief lymphodepleting chemotherapy (3-5 days, to make immune space for the new cells), the CAR-T cells are infused back into the patient through an IV line. Total infusion takes about an hour.',
                  detail: __alloT('stem.microbiology.once_inside_the_car_t_cells_circulate_', 'Once inside, the CAR-T cells circulate, find cancer cells expressing the target antigen, bind to them, kill them, and reproduce. A single dose can lead to weeks-to-months of cancer-killing activity.')
                },
                { id: 'monitor', name: __alloT('stem.microbiology.5_monitor_manage_side_effects', '5. Monitor + manage side effects'), color: '#dc2626',
                  what: 'For 2-4 weeks, the patient is monitored in or near the hospital. The main side effects are CYTOKINE RELEASE SYNDROME (CRS) - a flu-like to life-threatening immune response from the rapid cell killing - and NEUROTOXICITY (ICANS).',
                  detail: __alloT('stem.microbiology.crs_is_managed_with_tocilizumab_anti_i', 'CRS is managed with tocilizumab (anti-IL-6) + steroids. Most patients have manageable CRS; severe CRS occurs in ~10-30% + can be fatal. ICANS (confusion, seizures) responds to steroids.')
                },
                { id: 'outcome', name: __alloT('stem.microbiology.6_the_outcome', '6. The outcome'), color: '#86efac',
                  what: 'In B-cell lymphoma + leukemia, ~50% of patients who had run out of all other options achieve durable remission - many still cancer-free after 5+ years. A single infusion is the entire treatment.',
                  detail: __alloT('stem.microbiology.currently_fda_approved_car_t_products_', 'Currently FDA-approved CAR-T products: Kymriah (2017, first), Yescarta, Tecartus, Breyanzi, Carvykti (multiple myeloma), Abecma. Cost is $300,000-$500,000+ per dose. Solid tumors (breast, lung, etc.) remain much harder - fewer obvious tumor-specific antigens + the tumor microenvironment suppresses T cells.')
                }
              ];
              var sel = STEPS.find(function(s) { return s.id === d.selectedCarTStep; }) || STEPS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                  __alloT('stem.microbiology.car_t_therapy_is_a_living_drug_your_ow', 'CAR-T therapy is a "living drug" - your own T cells genetically engineered to recognize + destroy cancer. The first approval (Kymriah, 2017, for acute lymphoblastic leukemia) brought ~80% remission rates in children who had relapsed after every other treatment failed. The technology was developed primarily at the University of Pennsylvania (Carl June + colleagues) starting in the early 2010s.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  STEPS.map(function(s) {
                    var active = (d.selectedCarTStep || STEPS[0].id) === s.id;
                    return h('button', { key: s.id,
                      onClick: function() { upd({ selectedCarTStep: s.id }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? s.color + '33' : '#1e293b', border: '1px solid ' + (active ? s.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, s.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.what_happens_2', 'What happens')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.detail', 'Detail')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.detail)
                  )
                ),

                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.emily_whitehead_the_first_car_t_patien', 'Emily Whitehead - the first CAR-T patient: ')),
                  __alloT('stem.microbiology.in_2012_6_year_old_emily_whitehead_was', 'In 2012, 6-year-old Emily Whitehead was dying of acute lymphoblastic leukemia. She had already failed every standard treatment. Her family enrolled her in Penn\'s experimental CAR-T trial. After a near-fatal CRS reaction (which they treated with tocilizumab - the FIRST time it was used for CRS), Emily achieved remission. As of 2024, she is in her late teens + remains cancer-free over a decade later. Her case made the field credible + led to the 2017 Kymriah approval.')
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_honest_challenges', 'The honest challenges: ')),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.65 } },
                    h('li', null, h('strong', null, 'Cost: '), __alloT('stem.microbiology.300_000_500_000_per_dose_plus_100k_for', '$300,000-$500,000+ per dose, plus ~$100K for hospital + side-effect management. Total can exceed $1M. Insurance + Medicare coverage exists but access is limited globally.')),
                    h('li', null, h('strong', null, __alloT('stem.microbiology.solid_tumors', 'Solid tumors: ')), __alloT('stem.microbiology.car_t_works_dramatically_for_blood_can', 'CAR-T works dramatically for blood cancers because B-cell + plasma-cell antigens are well-defined. Solid tumors hide their antigens, suppress local T cells, and have heterogeneous antigens - harder targets. Active research, but no breakthrough yet.')),
                    h('li', null, h('strong', null, 'Manufacturing: '), __alloT('stem.microbiology.each_patient_s_cells_are_a_unique_batc', 'Each patient\'s cells are a unique batch - slow + expensive. Off-the-shelf "allogeneic" CAR-T from healthy donors is being developed (CRISPR + base-edited T cells to avoid rejection).')),
                    h('li', null, h('strong', null, 'Relapse: '), __alloT('stem.microbiology.some_cancers_evolve_to_lose_the_target', 'Some cancers evolve to LOSE the targeted antigen (CD19-negative relapse). New CAR-T designs target multiple antigens simultaneously to head this off.'))
                  )
                )
              );
            })(),
            '#a855f7'
          ),

          sectionCard('⚠️ When the immune system gets it wrong - autoimmunity + allergies',
            (function() {
              var HSENS = [
                {
                  type: 'Type I (Immediate hypersensitivity)', color: '#ef4444',
                  who: '~30% of Americans (allergies + asthma).',
                  mech: 'IgE antibodies bind innocuous antigens (peanut protein, cat dander, pollen). On re-exposure, IgE on mast cells triggers massive histamine release within minutes. Vasodilation, smooth muscle contraction, mucus production.',
                  examples: 'Hay fever, asthma, food allergies, allergic rhinitis, anaphylaxis (potentially fatal - epinephrine reverses it).',
                  treat: 'Avoidance of the trigger. Antihistamines (block histamine receptors). Inhaled corticosteroids for asthma. Oral immunotherapy + allergen desensitization (build up tolerance). Epinephrine auto-injectors for anaphylaxis. Biologics (omalizumab) for severe asthma + chronic hives.'
                },
                {
                  type: 'Type II (Antibody-mediated)', color: '#f59e0b',
                  who: 'Specific autoimmune diseases + transfusion reactions.',
                  mech: 'IgG or IgM antibodies bind to antigens on the surface of cells, marking them for destruction by complement or NK cells. The cell itself becomes the target.',
                  examples: 'Autoimmune hemolytic anemia (RBCs destroyed), Graves disease (antibody activates thyroid → hyperthyroid), myasthenia gravis (antibodies block acetylcholine receptors at neuromuscular junction → muscle weakness), Rh hemolytic disease of the newborn.',
                  treat: 'Immunosuppression. Plasmapheresis (filter out the bad antibodies). Beta-blockers for Graves. Acetylcholinesterase inhibitors for myasthenia. Anti-D immunoglobulin during pregnancy for Rh prevention.'
                },
                {
                  type: 'Type III (Immune complex)', color: '#a855f7',
                  who: 'Several autoimmune + drug reactions.',
                  mech: 'Antibody-antigen complexes form in the blood + deposit in small blood vessels (especially kidneys, joints, skin). Complement activation at the deposition site causes inflammation + tissue damage.',
                  examples: 'Systemic lupus erythematosus (SLE) - antibodies against your own DNA + nuclear proteins form complexes that lodge in kidneys, skin, joints. Rheumatoid arthritis. Serum sickness. Post-streptococcal glomerulonephritis.',
                  treat: 'Immunosuppression (steroids, methotrexate, biologics like rituximab + belimumab). Specific organ support (dialysis, joint care). Lifestyle modifications. Biologic therapies have transformed lupus + RA outcomes in the last 20 years.'
                },
                {
                  type: 'Type IV (Delayed, T-cell-mediated)', color: '#22c55e',
                  who: 'Many autoimmune diseases + delayed allergic reactions.',
                  mech: 'T cells (specifically Th1 + CD8+ cytotoxic) react against an antigen - host or environmental. Reaction develops over 24-72 hours (slower than antibody-driven). No antibody involvement.',
                  examples: 'Contact dermatitis (poison ivy, nickel allergy). Type 1 diabetes (T cells destroy pancreatic beta cells). Multiple sclerosis (T cells attack myelin in CNS). Rheumatoid arthritis (mixed Type III + IV). Tuberculin skin test positive reaction. Transplant rejection.',
                  treat: 'For autoimmune: immunosuppression (cyclosporine, tacrolimus, anti-TNF biologics like infliximab + adalimumab). For T1D: insulin replacement (autoimmune destruction is generally irreversible - but immunotherapy to delay onset is in clinical trials). For contact dermatitis: avoid trigger, topical steroids.'
                }
              ];
              var selT = HSENS.find(function(t, i) { return ('h' + i) === d.selectedHsens; }) || HSENS[0];
              var selIdx = HSENS.findIndex(function(t, i) { return selT === t; });

              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                  __alloT('stem.microbiology.the_immune_system_is_constantly_making', 'The immune system is constantly making decisions: friend or foe, hurt or help. When it gets those decisions wrong, the result is autoimmunity (attacking self) or allergy (overreacting to harmless triggers). Coombs + Gell classified these errors into four types in 1963; the classification is still used today.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  HSENS.map(function(t, i) {
                    var active = ('h' + i) === d.selectedHsens || (selIdx === i && !d.selectedHsens && i === 0);
                    return h('button', { key: i,
                      onClick: function() { upd({ selectedHsens: 'h' + i }); },
                      style: { padding: '8px 12px', borderRadius: 8, background: active ? t.color + '33' : '#1e293b', border: '1px solid ' + (active ? t.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', maxWidth: 230, textAlign: 'left' } },
                      t.type
                    );
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + selT.color } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: selT.color, marginBottom: 8 } }, selT.type),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.how_common', 'How common')),
                    h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.who)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.mechanism', 'Mechanism')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.mech)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.examples_2', 'Examples')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.examples)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.treatment_approach', 'Treatment approach')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, selT.treat)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_hygiene_hypothesis_and_what_replac', 'The hygiene hypothesis (and what replaced it): ')),
                  __alloT('stem.microbiology.allergies_autoimmune_diseases_have_ris', 'Allergies + autoimmune diseases have risen dramatically in industrialized countries over the last 50-70 years. The "hygiene hypothesis" (Strachan 1989) proposed that less infection exposure in childhood under-trains the immune system. The current refinement is broader: the "OLD FRIENDS" hypothesis (Rook 2003) and microbiome research suggest that loss of biodiversity in our microbial exposures - soil microbes, helminths, commensal bacteria from natural birth + breastfeeding + farm life - leaves the immune system poorly calibrated. Not "too clean," but "missing key training partners." Many ongoing studies look at probiotic + helminth therapies for autoimmune conditions.')
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.why_women_are_more_susceptible', 'Why women are more susceptible: ')),
                  __alloT('stem.microbiology.most_autoimmune_diseases_hit_women_2_1', 'Most autoimmune diseases hit women 2-10× more than men (lupus 9:1, MS 3:1, RA 2-3:1, Hashimoto thyroiditis 7:1). The XX chromosome dose, estrogen effects on the immune system, microchimerism from pregnancy, and X-linked gene inactivation patterns all contribute. Active research area; not fully understood.')
                )
              );
            })(),
            '#ef4444'
          ),

          sectionCard('Why some kids cannot be vaccinated, and why herd immunity matters',
            h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.75 } },
              __alloT('stem.microbiology.some_children_cannot_be_vaccinated_too', 'Some children cannot be vaccinated: too young, immunocompromised (from chemo, transplant, certain genetic conditions), severe allergic reactions to specific vaccines. They depend on the people around them being vaccinated - pathogens cannot spread through a vaccinated population. This is herd immunity. The threshold varies by pathogen: measles needs ~95% vaccination, polio ~80-85%. When vaccination rates drop, outbreaks return.')
            )
          ),
          sectionCard('Vaccine timeline (US)',
            h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.7 } },
              h('strong', null, '1796: '), __alloT('stem.microbiology.edward_jenner_develops_smallpox_vaccin', 'Edward Jenner develops smallpox vaccination from cowpox.'), h('br'),
              h('strong', null, '1885: '), __alloT('stem.microbiology.louis_pasteur_develops_rabies_vaccine', 'Louis Pasteur develops rabies vaccine.'), h('br'),
              h('strong', null, '1955: '), __alloT('stem.microbiology.salk_s_killed_virus_polio_vaccine_lice', 'Salk\'s killed-virus polio vaccine licensed.'), h('br'),
              h('strong', null, '1963: '), __alloT('stem.microbiology.measles_vaccine_licensed_cases_drop_fr', 'Measles vaccine licensed; cases drop from ~500,000/year to a handful.'), h('br'),
              h('strong', null, '1980: '), __alloT('stem.microbiology.who_declares_smallpox_eradicated_the_o', 'WHO declares smallpox eradicated - the only human disease eliminated.'), h('br'),
              h('strong', null, '2006: '), __alloT('stem.microbiology.hpv_vaccine_prevents_most_cervical_can', 'HPV vaccine (prevents most cervical cancer).'), h('br'),
              h('strong', null, '2020: '), __alloT('stem.microbiology.mrna_covid_19_vaccines_authorized_for_', 'mRNA COVID-19 vaccines authorized for emergency use.')
            )
          ),

          sectionCard('💉 CDC childhood + adolescent vaccine schedule (US)',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65 } },
                __alloT('stem.microbiology.the_standard_schedule_for_children_tee', 'The standard schedule for children + teens in the US. Each row is one vaccine; each column is an age window. Dots mark when each dose is recommended. The schedule is updated annually by the CDC + AAP based on current evidence.')
              ),
              h('div', { style: { overflowX: 'auto' } },
                (function() {
                  // Age columns
                  var ages = ['Birth', '2 mo', '4 mo', '6 mo', '12 mo', '15-18 mo', '4-6 yr', '11-12 yr', '16+ yr'];
                  // Vaccines + which age windows they're given (1 = standard dose, 2 = optional/catchup, 0 = not given)
                  var vaccines = [
                    { name: 'HepB',     dis: 'Hepatitis B',   schedule: [1, 1, 0, 1, 0, 0, 0, 0, 0] },
                    { name: 'RV',       dis: 'Rotavirus',     schedule: [0, 1, 1, 1, 0, 0, 0, 0, 0] },
                    { name: 'DTaP',     dis: 'Diphtheria, tetanus, pertussis', schedule: [0, 1, 1, 1, 0, 1, 1, 0, 0] },
                    { name: __alloT('stem.microbiology.tdap', 'Tdap'),     dis: 'Booster for DTaP',    schedule: [0, 0, 0, 0, 0, 0, 0, 1, 0] },
                    { name: 'Hib',      dis: 'Haemophilus influenzae b', schedule: [0, 1, 1, 1, 1, 0, 0, 0, 0] },
                    { name: 'PCV',      dis: 'Pneumococcal',  schedule: [0, 1, 1, 1, 1, 0, 0, 0, 0] },
                    { name: 'IPV',      dis: 'Polio',         schedule: [0, 1, 1, 1, 0, 0, 1, 0, 0] },
                    { name: __alloT('stem.microbiology.influenza', 'Influenza'),dis: 'Flu (yearly)',  schedule: [0, 0, 0, 1, 1, 1, 1, 1, 1] },
                    { name: 'MMR',      dis: 'Measles, mumps, rubella', schedule: [0, 0, 0, 0, 1, 0, 1, 0, 0] },
                    { name: __alloT('stem.microbiology.varicella', 'Varicella'),dis: 'Chickenpox',    schedule: [0, 0, 0, 0, 1, 0, 1, 0, 0] },
                    { name: 'HepA',     dis: 'Hepatitis A',   schedule: [0, 0, 0, 0, 1, 1, 0, 0, 0] },
                    { name: 'HPV',      dis: 'Human papillomavirus (cancer prevention)', schedule: [0, 0, 0, 0, 0, 0, 0, 1, 0] },
                    { name: 'MenACWY',  dis: 'Meningococcal (4 serogroups)', schedule: [0, 0, 0, 0, 0, 0, 0, 1, 1] },
                    { name: 'MenB',     dis: 'Meningococcal B', schedule: [0, 0, 0, 0, 0, 0, 0, 0, 2] },
                    { name: 'COVID-19', dis: 'SARS-CoV-2',    schedule: [0, 0, 0, 1, 1, 1, 1, 1, 1] }
                  ];
                  return h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 720 } },
                    h('thead', null, h('tr', null,
                      h('th', { style: { padding: 6, textAlign: 'left', background: '#0a0e1a', color: '#6ee7b7', borderBottom: '2px solid ' + EMERALD, fontWeight: 800 } }, __alloT('stem.microbiology.vaccine', 'Vaccine')),
                      h('th', { style: { padding: 6, textAlign: 'left', background: '#0a0e1a', color: '#6ee7b7', borderBottom: '2px solid ' + EMERALD, fontWeight: 800, minWidth: 160 } }, __alloT('stem.microbiology.disease', 'Disease')),
                      ages.map(function(a, i) {
                        return h('th', { key: i, style: { padding: 6, textAlign: 'center', background: '#0a0e1a', color: '#6ee7b7', borderBottom: '2px solid ' + EMERALD, fontWeight: 800, minWidth: 56 } }, a);
                      })
                    )),
                    h('tbody', null,
                      vaccines.map(function(v, i) {
                        return h('tr', { key: v.name, style: { background: i % 2 === 0 ? '#0f172a' : '#1e293b' } },
                          h('td', { style: { padding: 6, fontWeight: 700, color: 'var(--allo-stem-text, #e2e8f0)' } }, v.name),
                          h('td', { style: { padding: 6, color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 10.5 } }, v.dis),
                          v.schedule.map(function(s, ai) {
                            var bg = s === 1 ? EMERALD : s === 2 ? '#a78bfa' : 'transparent';
                            var content = s === 1 ? '●' : s === 2 ? '○' : '';
                            return h('td', { key: ai, style: { padding: 6, textAlign: 'center', color: '#fff', background: s === 1 ? 'rgba(16,185,129,0.18)' : s === 2 ? 'rgba(167,139,250,0.18)' : 'transparent', fontWeight: 800, fontSize: 14 } }, content);
                          })
                        );
                      })
                    )
                  );
                })()
              ),
              h('div', { style: { marginTop: 8, fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.6 } },
                h('span', { style: { color: '#6ee7b7', fontWeight: 800 } }, '●'), __alloT('stem.microbiology.standard_dose', ' = standard dose · '),
                h('span', { style: { color: '#c4b5fd', fontWeight: 800 } }, '○'), __alloT('stem.microbiology.recommended_by_shared_decision_risk_ba', ' = recommended by shared decision / risk-based')
              ),

              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.6 } },
                h('strong', null, __alloT('stem.microbiology.why_so_many_in_the_first_2_years', 'Why so many in the first 2 years? ')),
                __alloT('stem.microbiology.the_infant_immune_system_is_still_lear', 'The infant immune system is still learning what is dangerous + what is not. The diseases on this schedule were once major killers of children: pertussis (whooping cough), Hib meningitis, measles, polio. Spacing the doses follows the immune system\'s development. Multiple antigens in the same shot (DTaP, MMR, PCV) is well-tolerated - the immune system encounters thousands of antigens daily from microbes everywhere; vaccines add a tiny calibrated set.')
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: 'var(--allo-stem-text, #fde68a)', lineHeight: 1.6 } },
                h('strong', null, __alloT('stem.microbiology.disease_coverage_thresholds_herd_immun', 'Disease coverage thresholds (herd immunity): ')),
                __alloT('stem.microbiology.measles_needs_95_population_vaccinatio', 'Measles needs ~95% population vaccination. Pertussis, ~92%. Polio, ~80-85%. Varicella, ~85-90%. When coverage drops below the threshold, outbreaks return - as Maine + neighboring New Hampshire have seen with pertussis. The schedule reflects what protects both the individual + the community.')
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid var(--allo-stem-border, #334155)', fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', lineHeight: 1.55, fontStyle: 'italic' } },
                __alloT('stem.microbiology.schedule_simplified_for_education_the_', 'Schedule simplified for education. The full CDC immunization schedule includes catch-up provisions, conditions for delayed doses, accelerated schedules, and contraindications. Always reference the current CDC schedule (cdc.gov/vaccines/schedules) or consult a clinician. Updated annually.')
              )
            ),
            EMERALD
          ),

          // ─── Therapeutic antibodies + mAbs ──────────────────────
          sectionCard('🛡️ Therapeutic monoclonal antibodies - biology as medicine',
            (function() {
              var MAB_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.what_therapeutic_mabs_are', 'What therapeutic mAbs are'), emoji: '🧬',
                  body: __alloT('stem.microbiology.a_monoclonal_antibody_mab_is_a_laborat', 'A monoclonal antibody (mAb) is a laboratory-produced version of an antibody - the Y-shaped immune molecule the body uses to recognize + neutralize specific targets. Therapeutic mAbs are engineered to bind a SPECIFIC protein (a cancer-cell receptor, an inflammatory cytokine, a viral surface protein) + either block its function, mark it for immune destruction, or deliver a payload to it. mAbs are now the largest single drug class by sales globally - about $200+ billion per year + growing fast. The 10 top-selling mAbs include Humira (rheumatoid arthritis), Keytruda (cancer immunotherapy), Dupixent (asthma + eczema), and several others.'),
                  caveat: 'Therapeutic mAbs are NOT a cure-all. Each one is highly specific to a single target; the breadth of conditions they treat is large but the depth of cure is variable. They are also extremely expensive - typically $5,000-$150,000+ per year of treatment, with no generic option until the patent expires. The economics shape access dramatically.'
                },
                { id: 'history', name: __alloT('stem.microbiology.how_they_were_invented', 'How they were invented'), emoji: '🔬',
                  body: __alloT('stem.microbiology.k_hler_milstein_cambridge_1975_figured', 'Köhler + Milstein (Cambridge, 1975) figured out how to make CLONAL antibody-producing cell lines: fuse an antibody-producing B cell with an immortal myeloma cell, producing a hybridoma that grows forever + secretes one specific antibody. Nobel Prize 1984. Köhler famously did not patent the technique - he believed it should be freely available - which contributed to the explosion of mAb research over the following decades. The first FDA-approved therapeutic mAb (muromonab-CD3, for organ transplant rejection) came in 1986.'),
                  caveat: 'Early therapeutic mAbs were MOUSE antibodies, which the human immune system saw as foreign + cleared rapidly (HAMA response - Human Anti-Mouse Antibody). The clinical breakthrough required HUMANIZATION: replacing mouse constant regions with human ones (chimeric mAbs, then humanized, then fully-human mAbs). This was an engineering achievement, not a clinical one - but it transformed the field.'
                },
                { id: 'cancer', name: __alloT('stem.microbiology.cancer_treatment_mabs', 'Cancer treatment mAbs'), emoji: '🎗️',
                  body: __alloT('stem.microbiology.the_cancer_mab_revolution_accelerated_', 'The cancer-mAb revolution accelerated after rituximab (Rituxan, 1997) - a chimeric mAb targeting CD20 on B cells, transformed treatment of non-Hodgkin lymphoma. Trastuzumab (Herceptin, 1998) targets HER2 on breast cancers, dramatically improving outcomes in HER2-positive cases (~15-20% of breast cancers). Pembrolizumab (Keytruda, 2014) + nivolumab (Opdivo, 2014) are CHECKPOINT INHIBITORS - they block proteins (PD-1 / PD-L1) that cancer cells use to hide from T cells, "releasing the brakes" on the immune system. This restored long-term remission in a fraction of patients with melanoma, lung cancer, kidney cancer, and many other types - formerly almost-uniformly fatal cases. James Allison + Tasuku Honjo won the 2018 Nobel for the discovery of checkpoint inhibition.'),
                  caveat: 'Checkpoint inhibitors work spectacularly in ~15-25% of cancer patients (the "long tail" of long-term survivors) + minimally or not at all in the rest. Predicting WHO will respond is still imperfect. Immune-related adverse events (autoimmune-like toxicities affecting skin, gut, liver, lungs, thyroid, even heart) can be severe + sometimes permanent. The technology is a major advance + not the universal cancer answer.'
                },
                { id: 'autoimmune', name: __alloT('stem.microbiology.autoimmune_inflammatory_mabs', 'Autoimmune + inflammatory mAbs'), emoji: '🛡️',
                  body: __alloT('stem.microbiology.autoimmune_diseases_are_driven_by_infl', 'Autoimmune diseases are driven by inflammatory CYTOKINES - proteins that signal between immune cells. Therapeutic mAbs that block specific cytokines have transformed treatment. Anti-TNF (adalimumab/Humira, infliximab/Remicade, etanercept/Enbrel - a fusion protein, not strictly a mAb) revolutionized rheumatoid arthritis, ankylosing spondylitis, psoriatic arthritis, Crohn\'s + ulcerative colitis. Anti-IL-17 (ixekizumab/Taltz, secukinumab/Cosentyx) for psoriasis. Anti-IL-6 (tocilizumab/Actemra) for giant-cell arteritis + severe COVID. Anti-IL-23 (ustekinumab/Stelara, guselkumab/Tremfya) for psoriasis + IBD. Anti-IgE (omalizumab/Xolair) for severe allergic asthma. Anti-IL-5 (mepolizumab/Nucala) for eosinophilic asthma.'),
                  caveat: 'Cytokine-blocking mAbs change quality of life dramatically for many patients - Humira alone treats over a million people in the US for rheumatoid arthritis, IBD, + skin conditions. They also increase infection risk (especially TB reactivation), are immunosuppressive in non-trivial ways, + cost $4000-$8000/month at list price (sometimes reduced by rebates that primarily benefit insurers + pharmacy benefit managers, not patients).'
                },
                { id: 'covid', name: __alloT('stem.microbiology.mabs_during_covid_19', 'mAbs during COVID-19'), emoji: '🦠',
                  body: __alloT('stem.microbiology.during_covid_19_monoclonal_antibodies_', 'During COVID-19, monoclonal antibodies became a major treatment + prevention tool, then quickly lost much of their utility as the virus evolved. Bamlanivimab + casirivimab/imdevimab (Regeneron) + sotrovimab + bebtelovimab were each developed against the SARS-CoV-2 spike protein. Each was effective against the strain it was designed for + lost activity against the next major variant within months. This is the SELECTION-PRESSURE problem: anti-viral mAbs target a single epitope; the virus evolves around it. By mid-2022, no anti-SARS-CoV-2 mAb retained activity against circulating Omicron lineages. Tixagevimab + cilgavimab (Evusheld, used for prophylaxis in immunocompromised patients) was withdrawn in 2023 for the same reason.'),
                  caveat: 'The COVID mAb experience showed both the promise + the limits of the technology. Speed: developed + deployed in record time (months from variant emergence to FDA EUA). Limit: viral evolution outpaced the development cycle. Cocktail mAbs (binding multiple epitopes) hold up longer than single-mAb products but are more expensive + complex. The technology is being adapted for influenza + RSV + other rapidly-evolving viruses with similar tradeoffs.'
                },
                { id: 'adc', name: __alloT('stem.microbiology.antibody_drug_conjugates_adcs', 'Antibody-drug conjugates (ADCs)'), emoji: '💉',
                  body: __alloT('stem.microbiology.an_adc_is_an_antibody_chemically_linke', 'An ADC is an antibody chemically linked to a toxic chemotherapy payload. The antibody finds cancer cells expressing a specific surface marker; the chemo gets delivered selectively to those cells; healthy cells without the marker are mostly spared. Brentuximab vedotin (Adcetris, 2011, for Hodgkin lymphoma + anaplastic large-cell lymphoma) was the first FDA-approved ADC. Trastuzumab deruxtecan (Enhertu, 2019) revolutionized HER2-low + HER2-positive breast cancer; trial results in 2022 changed clinical practice. Sacituzumab govitecan (Trodelvy, 2020) treats triple-negative breast cancer.'),
                  caveat: 'ADCs are powerful but tricky. The linker chemistry must be stable in the bloodstream + release the payload only inside cancer cells. Linker engineering is most of the design work; the antibody + payload are individually old technology. Toxicities include neuropathy, ocular toxicity, interstitial lung disease - sometimes serious + sometimes lifelong. ADCs are not "gentle alternatives" to chemotherapy; they are more-targeted versions of it with their own toxicity profiles.'
                },
                { id: 'bispecific', name: __alloT('stem.microbiology.bispecifics_engagers', 'Bispecifics + engagers'), emoji: '🔗',
                  body: __alloT('stem.microbiology.a_bispecific_antibody_binds_two_differ', 'A BISPECIFIC antibody binds TWO different targets at once. The most clinically transformative class so far is T-CELL ENGAGERS (BiTEs): one arm grabs a tumor antigen, the other arm grabs CD3 on a T cell, physically forcing the immune cell to kill the cancer cell. Blinatumomab (Blincyto, 2014) for relapsed acute lymphoblastic leukemia (ALL) was the first to be approved + transformed pediatric leukemia care. Newer T-cell engagers (teclistamab, talquetamab, elranatamab) target multiple myeloma + are reshaping that field rapidly since 2022-2023.'),
                  caveat: 'T-cell engagers can cause severe CYTOKINE RELEASE SYNDROME (a sudden inflammatory storm during initial doses) requiring hospital monitoring. They are also expensive + complex to administer. The early-2020s expansion of approved bispecific + tri-specific therapies has been one of the fastest-moving areas in clinical oncology.'
                },
                { id: 'production', name: __alloT('stem.microbiology.how_they_are_manufactured', 'How they are manufactured'), emoji: '🏭',
                  body: __alloT('stem.microbiology.therapeutic_mabs_are_produced_in_mamma', 'Therapeutic mAbs are produced in mammalian cell culture, typically Chinese Hamster Ovary (CHO) cells, in stirred bioreactors of 2,000-25,000 liters. The cells are engineered to produce + secrete the desired antibody; the antibody is then purified via Protein-A affinity chromatography + multiple downstream purification steps. A single batch can yield kilograms of pure antibody worth tens to hundreds of millions of dollars. Manufacturing facilities are heavily regulated + run continuously; building a new one takes 3-5 years + costs $500M-$2B.'),
                  caveat: 'Mammalian-cell mAb production is one of the most demanding bioprocesses in industry. Bacterial cells (E. coli) cannot make properly-folded + glycosylated full antibodies. Yeast can but rarely match CHO output. Manufacturing capacity is a real bottleneck during pandemics + supply emergencies; COVID drove massive expansion that the industry is now somewhat oversupplied with. Biosimilars (cheaper "generic-like" mAbs allowed once a brand-name mAb\'s patent expires) are gradually entering the market but face strong incumbent + regulatory headwinds.'
                }
              ];
              var sel = d.selectedMab || 'overview';
              var topic = MAB_TOPICS.find(function(t) { return t.id === sel; }) || MAB_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.monoclonal_antibodies_are_now_the_domi', 'Monoclonal antibodies are now the dominant drug class by sales + one of the most active areas of biomedical research. They use the immune system\'s own protein technology to treat cancer, autoimmune disease, asthma, COVID, organ rejection, + many other conditions. The technology connects directly to the immune-system biology in the rest of this tab - but turned into precision medicine that is among the most expensive in healthcare.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  MAB_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedMab: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#0ea5e9' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #0ea5e9' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#7dd3fc', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_7', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_access_question', 'The access question: ')),
                  __alloT('stem.microbiology.mabs_are_extraordinarily_effective_for', 'mAbs are extraordinarily effective for many patients + extraordinarily expensive. List prices of $5,000-$500,000+ per year of treatment are common. Insurance coverage in the US is uneven + patient cost-share can still be unaffordable. Globally, most patients with diseases mAbs could treat cannot access them at all. Biosimilars + tiered pricing in lower-income countries help slowly. School psychologists working with families navigating these treatments may need to help with prior-authorization paperwork, copay-assistance programs, + the emotional reality of a family-bankrupting-but-life-saving drug.')
                )
              );
            })(),
            '#0ea5e9'
          ),

          // ─── mRNA vaccines + lipid nanoparticles ────────────────
          sectionCard('💉 mRNA vaccines + lipid nanoparticles - the technology behind COVID + beyond',
            (function() {
              var MRNA_TOPICS = [
                { id: 'overview', name: __alloT('stem.microbiology.what_an_mrna_vaccine_is', 'What an mRNA vaccine is'), emoji: '🧬',
                  body: __alloT('stem.microbiology.a_traditional_vaccine_introduces_an_in', 'A traditional vaccine introduces an inactivated/attenuated pathogen or a piece of one (a protein) to train your immune system. An mRNA vaccine instead delivers GENETIC INSTRUCTIONS - a strand of messenger RNA - that gets your OWN cells to temporarily make the pathogen\'s key protein. Your immune system sees that protein, mounts a response, + remembers it. The mRNA itself degrades within hours to days; the immune memory persists. Pfizer-BioNTech BNT162b2 + Moderna mRNA-1273, both for COVID-19, were the first mRNA vaccines authorized for human use anywhere - Pfizer in December 2020 (UK first, then US EUA December 11), Moderna a week later.'),
                  caveat: 'Speed of development was the headline. mRNA vaccine PLATFORMS had been in development since the 1990s; what was new for COVID was applying the platform to a specific pathogen + scaling to billions of doses. The "new" technology is roughly 30 years old in the lab; the FIRST clinical product was new in 2020.'
                },
                { id: 'kariko', name: __alloT('stem.microbiology.karik_weissman_the_unsung_breakthrough', 'Karikó + Weissman - the unsung breakthrough'), emoji: '🏆',
                  body: __alloT('stem.microbiology.katalin_karik_hungarian_biochemist_dre', 'Katalin Karikó (Hungarian biochemist) + Drew Weissman (immunologist) at the University of Pennsylvania spent ~20 years working on mRNA therapeutics, often in obscurity + with limited funding. Karikó was demoted, denied tenure, + nearly forced out of academia in the mid-1990s for persisting with mRNA when grant agencies considered it a dead end. Their key 2005 breakthrough: replacing uridine with pseudouridine in synthetic mRNA dramatically reduced inflammatory response + increased protein production. Without this modification, every previous attempt at therapeutic mRNA had triggered too much innate immune activation to be useful. They won the 2023 Nobel Prize in Medicine for this work - finally vindicated.'),
                  caveat: 'The Karikó/Weissman story illustrates how scientific funding + career structures can almost prevent transformative discoveries. Karikó was rejected for promotions, denied grants, repeatedly told her line of research was hopeless. Without persistence + a series of small breakthroughs that finally clicked together, COVID mRNA vaccines almost certainly would not have been ready in 2020. The mRNA vaccine story is also a story about scientific institutions falling short of supporting genuinely innovative work.'
                },
                { id: 'lnp', name: __alloT('stem.microbiology.lipid_nanoparticles_the_delivery_vehic', 'Lipid nanoparticles - the delivery vehicle'), emoji: '🧪',
                  body: __alloT('stem.microbiology.mrna_is_fragile_naked_mrna_injected_in', 'mRNA is fragile. Naked mRNA injected into a person gets degraded by RNases in seconds + cannot enter cells anyway. The mRNA must be ENCAPSULATED in a delivery vehicle that protects it + delivers it intracellularly. LIPID NANOPARTICLES (LNPs) are the current answer: tiny lipid bilayer spheres ~80-100 nm in diameter containing 4 distinct lipid types in a specific ratio. (1) IONIZABLE CATIONIC LIPID (the patented ALC-0315 by Pfizer, SM-102 by Moderna) that becomes charged at low pH + helps mRNA escape the endosome after cellular uptake. (2) STRUCTURAL PHOSPHOLIPID (like DSPC) for membrane formation. (3) CHOLESTEROL for membrane fluidity. (4) PEG-LIPID for stability + circulation half-life. Manufacturing requires precise microfluidic mixing under tightly controlled conditions.'),
                  caveat: 'LNP technology is the harder-than-mRNA part of the mRNA-vaccine story. Manufacturing has been a bottleneck globally; the patent landscape around ionizable lipids is contested (Acuitas Therapeutics + Arbutus Biopharma + Genevant have ongoing litigation against Moderna). The technology also has limits: current LNPs preferentially go to the liver after intramuscular injection; getting them to other tissues requires further engineering.'
                },
                { id: 'covid', name: __alloT('stem.microbiology.covid_19_development_timeline', 'COVID-19 development timeline'), emoji: '⏱️',
                  body: __alloT('stem.microbiology.january_10_2020_sars_cov_2_genome_sequ', 'January 10, 2020: SARS-CoV-2 genome sequence published online by Chinese scientists. January 11 (Pfizer/BioNTech start) + January 13 (Moderna start): vaccine design teams begin work. By mid-March 2020: candidate vaccines are in animal trials. March 16: first human Phase 1 dose (Moderna). November 9: Pfizer/BioNTech reports Phase 3 efficacy ~95%. November 16: Moderna reports similar Phase 3 results. December 2: UK MHRA first emergency authorization (Pfizer). December 11: US FDA EUA. December 14: first dose administered in a NY hospital (ICU nurse Sandra Lindsay). The cycle from genome sequence to authorized vaccine was 11 months - by far the fastest vaccine development in history.'),
                  caveat: 'The speed was real + not magic. It worked because: (a) decades of mRNA + LNP research had already happened; (b) Operation Warp Speed + similar programs pre-funded manufacturing capacity for vaccines that were not yet known to work; (c) trials were run in parallel rather than sequentially; (d) the pandemic provided huge case counts that made efficacy detectable quickly. None of these compromised scientific rigor. The trials were the same Phase 1/2/3 design + sample sizes as routine vaccine development; what was compressed was logistical, not scientific.'
                },
                { id: 'efficacy', name: __alloT('stem.microbiology.how_well_they_worked_still_work', 'How well they worked + still work'), emoji: '📊',
                  body: __alloT('stem.microbiology.initial_efficacy_against_covid_19_infe', 'Initial efficacy against COVID-19 infection: ~95% for Pfizer + Moderna against the original Wuhan strain. Against severe disease + hospitalization + death, efficacy remained very high (~90%+) for many months. Against new variants (Delta, Omicron + sub-variants), efficacy against INFECTION dropped substantially (to ~30-50% against Omicron after a few months) but efficacy against SEVERE outcomes remained good (~70-90% protection from hospitalization with up-to-date boosters). Estimated lives saved in the first 12 months of US vaccination: ~700,000 (Watson 2022 Lancet); globally ~14-20 million in the first year (Watson et al. 2022).'),
                  caveat: 'Talking honestly about waning effectiveness is important + politically difficult. Anti-vaccine actors weaponized waning data + reduced infection-blocking efficacy against newer variants to claim the vaccines "do not work." The honest framing: they reliably prevent severe disease + death; they do not reliably prevent every infection; the protection wanes over months requiring updated boosters; the benefit-risk ratio remains overwhelmingly favorable. School psychologists fielding vaccine questions from families benefit from being able to articulate this nuance.'
                },
                { id: 'safety', name: __alloT('stem.microbiology.safety_profile', 'Safety profile'), emoji: '🛡️',
                  body: __alloT('stem.microbiology.most_common_side_effects_arm_soreness_', 'Most common side effects: arm soreness, fatigue, headache, muscle aches, fever - typically resolving within 1-3 days, more pronounced after the second dose. Rare serious events: myocarditis / pericarditis (~1-10 per 100,000 vaccinations, much higher rate in young adult males after second mRNA dose, almost all cases mild + resolving - the same condition is far more common after COVID infection itself). Anaphylaxis (~3-5 per million doses). No causal link to fertility issues, no link to long-term unknown effects (the mRNA degrades in days; LNPs in weeks; what remains is the immune memory). Surveillance systems (VAERS in US, EudraVigilance in EU, V-safe pregnancy registry) have monitored billions of doses.'),
                  caveat: 'Safety monitoring at this scale is unprecedented. Real adverse events have been identified (myocarditis was identified in spring 2021 + properly characterized + dosing guidance updated). The system worked as designed. Misinformation persists; some claims are recycled anti-vaccine themes from earlier eras (mercury, autism, microchip - none of which apply to mRNA vaccines). Honest engagement with families means acknowledging real adverse events while contextualizing them against the much-larger risks of unmitigated COVID.'
                },
                { id: 'future', name: __alloT('stem.microbiology.mrna_beyond_covid', 'mRNA beyond COVID'), emoji: '🚀',
                  body: __alloT('stem.microbiology.the_mrna_platform_is_now_being_adapted', 'The mRNA platform is now being adapted for many other diseases. INFLUENZA mRNA vaccines (Moderna mRNA-1010, Pfizer + others) are in Phase 3 trials - potentially offering better effectiveness than the long-standing egg-based annual flu shot. RSV mRNA vaccines are in late-stage trials. CMV (cytomegalovirus, a major cause of birth defects + transplant complications) Moderna mRNA-1647 in Phase 3. ZIKA, EBV (Epstein-Barr virus), HIV, MALARIA - all have mRNA candidates in development. The biggest potential leap: CANCER VACCINES. Moderna mRNA-4157 + Merck partnership has shown promising results in melanoma; the strategy is to identify neoantigens unique to a patient\'s tumor + create a personalized mRNA vaccine teaching the immune system to find + destroy those specific cells. The personalized cancer-vaccine field is moving rapidly.'),
                  caveat: 'Many mRNA candidates in development will not work. Disease biology matters more than platform - RSV may be a good mRNA target while HIV remains very hard. The mRNA platform is a tool, not a magic. The biggest near-term commercial promise (combined influenza + COVID seasonal mRNA shot) faces real regulatory + uptake challenges. And mRNA vaccines do nothing for diseases that require non-protein antigens (most polysaccharide-encapsulated bacteria) or for which neutralizing antibodies do not protect.'
                },
                { id: 'access', name: __alloT('stem.microbiology.the_access_equity_problem', 'The access + equity problem'), emoji: '🌍',
                  body: __alloT('stem.microbiology.mrna_vaccines_for_covid_19_were_uneven', 'mRNA vaccines for COVID-19 were unevenly distributed globally. By end of 2021, ~75% of wealthy-country adults had been vaccinated while ~5% of low-income-country adults had been. COVAX (the WHO + GAVI + CEPI joint initiative) aimed for equitable distribution + fell far short of its goals due to manufacturing constraints + wealthy-country hoarding. South Africa + India sought patent waivers under WTO TRIPS provisions; the negotiation was slow + the outcome partial. mRNA technology transfer hubs (the WHO mRNA Vaccine Technology Transfer Hub at Afrigen in Cape Town, established 2021) are working to build manufacturing capacity in lower-income countries; first vaccine candidates went into Phase 1 trials in 2024.'),
                  caveat: 'mRNA vaccines saved millions of lives + the rollout deepened global health inequity in ways that are still being analyzed. The COVAX experience has spurred ongoing reforms in pandemic preparedness, vaccine financing, + technology transfer. The pandemic preparedness treaty negotiations at WHO (ongoing 2024-2025) include provisions for equitable access during future pandemics. Whether the final treaty has real teeth or is mostly aspirational remains to be seen.'
                }
              ];
              var sel = d.selectedMrna || 'overview';
              var topic = MRNA_TOPICS.find(function(t) { return t.id === sel; }) || MRNA_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.mrna_vaccines_went_from_never_before_u', 'mRNA vaccines went from never-before-used-in-humans to billions of doses administered in under three years. The technology was decades in the making - and almost did not happen because the scientific establishment dismissed it for years. Understanding mRNA vaccines means understanding the biology, the engineering, the history of how it was developed, and the social context in which it was deployed.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  MRNA_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedMrna: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#ec4899' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #ec4899' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(236,72,153,0.08)', border: '1px solid rgba(236,72,153,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#f9a8d4', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_8', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.for_school_psychologists_counselors', 'For school psychologists + counselors: ')),
                  __alloT('stem.microbiology.vaccine_conversations_with_families_be', 'Vaccine conversations with families benefit from speaking specifics rather than generalities. Knowing what mRNA is, how it differs from older vaccine technologies, what real (not imagined) adverse events look like, how the technology was developed + by whom, and where the genuine uncertainties lie - all of these support honest conversations that respect both science + family decision-making. Dismissing vaccine concerns rarely changes minds; engaging the substance often does.')
                )
              );
            })(),
            '#ec4899'
          ),

          // ─── Hygiene hypothesis + allergies/asthma ──────────────
          sectionCard('🤧 The hygiene hypothesis - why allergies + asthma are rising',
            (function() {
              var HH_TOPICS = [
                { id: 'pattern', name: __alloT('stem.microbiology.the_rising_disease_pattern', 'The rising-disease pattern'), emoji: '📈',
                  body: __alloT('stem.microbiology.over_the_past_50_100_years_allergic_au', 'Over the past 50-100 years, ALLERGIC + AUTOIMMUNE diseases have risen dramatically in high-income countries. ASTHMA prevalence in US children: ~ 3% in 1980 → ~ 8% in 2020. PEANUT ALLERGY: ~ 0.4% in 1997 → ~ 2.5% in 2017 (US children). ATOPIC DERMATITIS (eczema): now affects ~ 15-20% of children, up from ~ 2-3% in the 1960s. CELIAC DISEASE: 4× increase since the 1950s. TYPE 1 DIABETES (autoimmune): 3-5% annual increase in many countries. INFLAMMATORY BOWEL DISEASE: ~ 2× increase since 1990. The pattern is real, well-documented, + much more pronounced in WEALTHIER + URBANIZED populations.'),
                  caveat: 'These are correlations + the changes are happening too fast for genetic explanation. The trend is consistent across many countries with different healthcare systems + diagnostic practices, so it is not just better diagnosis. The rising pattern is the SETUP for various hypotheses about causation; the cause itself is debated.'
                },
                { id: 'strachan', name: __alloT('stem.microbiology.strachan_1989_the_original_hypothesis', 'Strachan 1989 + the original hypothesis'), emoji: '👶',
                  body: __alloT('stem.microbiology.david_strachan_london_epidemiologist_p', 'David Strachan (London epidemiologist) published a 1989 study finding that children with MORE SIBLINGS had LOWER rates of hay fever + allergic disease. He hypothesized that early-life exposure to common infections (more readily caught from siblings) helped the immune system develop properly, preventing it from misdirecting against harmless allergens later. The "hygiene hypothesis" was born. The framing caught on culturally: "kids today are too clean." Decades of follow-up research has both confirmed PARTS of the original idea + complicated others significantly.'),
                  caveat: 'Strachan\'s original hypothesis was a snapshot + simple. He later expanded + refined it (2000, 2017). The "too clean" pop-culture version is mostly WRONG - modern handwashing + sanitation save lives + are not the problem. The problem is more specific: changes in microbial EXPOSURE during early development, including absence of beneficial commensal microbes, not generic hygiene.'
                },
                { id: 'oldfriends', name: __alloT('stem.microbiology.the_old_friends_hypothesis', 'The "Old Friends" hypothesis'), emoji: '🤝',
                  body: __alloT('stem.microbiology.graham_rook_ucl_2003_refined_strachan_', 'Graham Rook (UCL, 2003) refined Strachan\'s framework into the "Old Friends" hypothesis. The key insight: humans evolved alongside a set of microbes ("old friends") for hundreds of thousands of years - soil microbes, helminths (parasitic worms), enteric bacteria, environmental fungi. These microbes were ABUNDANT in our ancestral environment + helped train the developing immune system to distinguish friend from foe. In modern high-income environments, exposure to old friends has dropped dramatically - fewer soil contacts, indoor lifestyles, processed food, water disinfection, mass deworming, urbanization. The immune system that didn\'t get its training mistakes harmless pollen + dust + foods for enemies.'),
                  caveat: 'The "Old Friends" framing is biologically sophisticated + supported by accumulating evidence. The Amish + Hutterite communities provide quasi-natural experiments - both have similar genetics + are mostly farm-based, but Amish (more direct farm-animal contact) have ~ 5× lower asthma prevalence than Hutterites (more isolated from livestock). Helminth-deworming has correlated with rising allergic disease in some populations. Specific mechanisms: gut microbiota influence regulatory T-cell development; environmental microbes influence skin barrier development.'
                },
                { id: 'gut', name: __alloT('stem.microbiology.gut_microbiome_early_life', 'Gut microbiome + early life'), emoji: '🦠',
                  body: __alloT('stem.microbiology.the_first_1_000_days_of_life_conceptio', 'The first 1,000 days of life (conception through age 2) is critical for gut microbiome establishment + immune development. Several modern practices may disrupt this: (a) CESAREAN SECTIONS (now ~ 32% of US births vs ~ 5% in 1970) bypass the vaginal microbiome transfer that establishes baby\'s gut bacteria. (b) FORMULA FEEDING (vs breastfeeding) provides different nutrition + microbiota. (c) EARLY ANTIBIOTICS in infancy (1 in 3 US infants gets antibiotics by age 1) disrupt gut bacterial community for months to years. (d) PROCESSED-FOOD diets lack the fiber + plant diversity that maintain healthy gut bacteria. Each correlates with increased allergic + autoimmune disease risk in cohort studies.'),
                  caveat: 'These are CORRELATIONS, not proven causes. C-sections are sometimes life-saving + the right choice. Formula feeding is sometimes the only option. Some antibiotics in infancy are absolutely necessary. The relevant question is not "avoid C-section" but "if doing C-section, can we minimize the microbial disruption?" Some hospitals now offer "vaginal seeding" (swabbing C-section babies with maternal vaginal fluid) - initial trials show microbiome benefit; long-term outcomes still being studied.'
                },
                { id: 'farm', name: __alloT('stem.microbiology.the_farm_effect', 'The farm effect'), emoji: '🐄',
                  body: __alloT('stem.microbiology.rural_farm_raised_children_have_consis', 'Rural farm-raised children have CONSISTENTLY lower rates of asthma + allergies than non-farm rural children + much lower than urban children. The "farm effect" has been documented across Europe (PASTURE study), the US (Wisconsin Amish, Indiana Hutterite), and developing countries. The protective elements appear to be: (a) UNPROCESSED MILK consumption (raw milk has been shown to reduce asthma risk; pasteurized milk does not - though raw-milk-borne infections remain a real risk); (b) early-life livestock contact (specific microbial exposures); (c) hay + bedding dust exposure; (d) outdoor + farm-environment microbial diversity in early years. The protective effect appears strongest if exposure starts BEFORE age 1 + ideally in utero (via maternal exposures).'),
                  caveat: 'Public health does NOT recommend drinking raw milk for allergy prevention - the protective effect is modest + the foodborne-illness risk is real. Some specific milk components (whey proteins, fatty acids, microbial signatures) may be the active factors + might be safely added to processed milk. Active research at Helsinki, Munich, NIH. The farm effect informs broader thinking but does not yet translate to a population-level intervention recommendation.'
                },
                { id: 'dual', name: __alloT('stem.microbiology.dual_exposure_for_food_allergy', 'Dual-exposure for food allergy'), emoji: '🥜',
                  body: __alloT('stem.microbiology.for_food_allergies_specifically_a_more', 'For FOOD ALLERGIES specifically, a more refined model has emerged: the DUAL-ALLERGEN-EXPOSURE HYPOTHESIS (Gideon Lack 2015). Children develop food allergies through SKIN exposure to food proteins (especially through eczema-disrupted skin), but develop ORAL tolerance through early EATING of those same foods. So: early peanut introduction in babies\' DIET reduces peanut allergy; PROTECTING peanuts from baby\'s skin reduces sensitization. This was demonstrated by the LEAP trial (2015, Lack et al.): introducing peanut to high-risk infants at 4-11 months reduced peanut allergy by 86% vs avoidance. The 2017 + 2021 US guidelines now recommend EARLY INTRODUCTION of peanut + other allergenic foods at 4-6 months, completely reversing previous "avoid until age 3" recommendations.'),
                  caveat: 'The LEAP-trial reversal is one of the clearest examples of pediatric medicine getting better through rigorous trials. School psychologists + counselors should know about it for family conversations about feeding practices. The American Academy of Pediatrics 2017 + the NIH Allergic Diseases Sciences research initiative 2021 reflect the updated science. Families with older children who avoided peanuts under previous guidance + now have allergies should NOT blame themselves - the guidance was based on the evidence available at the time.'
                },
                { id: 'eczema', name: __alloT('stem.microbiology.eczema_the_atopic_march', 'Eczema + the atopic march'), emoji: '🌡️',
                  body: __alloT('stem.microbiology.eczema_atopic_dermatitis_is_the_most_c', 'ECZEMA (atopic dermatitis) is the most common skin condition of childhood + often the FIRST step in the "atopic march" - eczema → food allergies → asthma → allergic rhinitis. The skin barrier disruption in eczema allows allergen sensitization through the skin. Genetic factors include FILAGGRIN gene mutations (FLG, ~ 30% of severe eczema patients). Environmental factors include: low humidity + cold winters (Maine winters are tough for eczema), harsh soaps + detergents, hard water, certain fabrics. Modern eczema management focuses on RESTORING + PROTECTING the skin barrier (emollient moisturizers from birth in high-risk infants, gentle cleansers, avoiding triggers).'),
                  caveat: 'Some studies have shown that AGGRESSIVE infant skin moisturization may reduce eczema risk in high-risk infants - though the most rigorous large trials (PreventADALL 2020, BEEP 2020) have shown smaller effects than earlier pilot studies suggested. Current recommendations are: regular emollient use is safe + reasonable in high-risk infants but is not a proven intervention. Avoiding fragrance + harsh cleansers in baby products is uncontroversially good practice.'
                },
                { id: 'practical', name: __alloT('stem.microbiology.what_this_means_for_families_schools', 'What this means for families + schools'), emoji: '🏠',
                  body: __alloT('stem.microbiology.the_hygiene_hypothesis_suggests_some_d', 'The hygiene hypothesis suggests SOME directions for families with prevention concerns: (1) BREASTFEEDING when possible, for at least 6 months. (2) EARLY introduction of common food allergens (peanut, egg, tree nuts) at 4-6 months for healthy babies - particularly important for high-risk infants. (3) Outdoor + nature exposure (some "dirt" is good). (4) Diverse high-fiber + plant-rich diet for the whole family. (5) Antibiotic stewardship - only use when medically necessary. (6) Pet ownership in early life may be protective (multiple studies show modest effects). (7) Avoid both extremes of cleanliness - neither sterile-clean nor unclean is optimal.'),
                  caveat: 'These are GENERAL principles, not prescriptions. Individual cases vary. Children with diagnosed food allergies need to AVOID their triggers + carry epinephrine; the "early introduction" advice is for healthy babies, not allergic children. Each family\'s situation is different. Pediatricians + allergists + dietitians provide individual guidance. School psychologists + nurses see children across the asthma + allergy spectrum + can support families navigating both prevention questions + active management.'
                }
              ];
              var sel = d.selectedHH || 'pattern';
              var topic = HH_TOPICS.find(function(t) { return t.id === sel; }) || HH_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.asthma_eczema_peanut_allergy_type_1_di', 'Asthma, eczema, peanut allergy, type 1 diabetes, inflammatory bowel disease - all have risen sharply in wealthy countries over the past 50-100 years. Genetics have not changed; something in our environment has. The "hygiene hypothesis" + its refinements suggest the answer involves disruption of early-life microbial exposure. School psychologists + nurses + counselors regularly meet children + families navigating these conditions; understanding the science supports better conversations.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  HH_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedHH: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#06b6d4' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #06b6d4' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#67e8f9', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_9', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.school_considerations', 'School considerations: ')),
                  __alloT('stem.microbiology.school_policies_often_address_food_all', 'School policies often address food allergies (peanut-free zones, EpiPen training, lunch protocols) + asthma management (inhaler access, recess + PE accommodations) + eczema (sunscreen + lotion use). These conditions affect ~ 10-25% of students across categories. Schools that handle them well: clear written plans, trained school nurses, family-school-clinic communication, accessible epinephrine. Schools that handle them poorly: outdated information, single-event focus rather than systematic accommodation, family anxiety. School psychologists + counselors are often the trusted bridge between clinical + school systems for these students.')
                )
              );
            })(),
            '#06b6d4'
          )
        );
      }

      // FERMENTATION
      function renderFerment() {
        var selected = FERMENTS.find(function(f) { return f.id === d.selectedFerment; }) || FERMENTS[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            __alloT('stem.microbiology.fermentation_is_microbiology_you_can_t', 'Fermentation is microbiology you can taste. Every culture in the world has fermented food. The microbes are doing the cooking; you set the conditions.')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
            FERMENTS.map(function(f) {
              var active = d.selectedFerment === f.id;
              return h('button', { key: f.id,
                onClick: function() { upd({ selectedFerment: f.id }); },
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), cursor: 'pointer', color: 'var(--allo-stem-text, #e2e8f0)' }
              },
                h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 2 } }, f.name),
                h('div', { style: { fontSize: 10, color: 'var(--allo-stem-text-soft, #94a3b8)', fontStyle: 'italic' } }, f.cultures)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)' } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text, #fde68a)', marginBottom: 10, fontStyle: 'italic' } }, 'Cultures: ' + selected.cultures),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid ' + EMERALD, marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.how_it_works_4', 'How it works')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.how)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, __alloT('stem.microbiology.the_story', 'The story')),
              h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, selected.story)
            )
          )
        );
      }

      // CASE STUDIES
      function renderCases() {
        var selected = CASES.find(function(c) { return c.id === d.selectedCase; }) || CASES[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            __alloT('stem.microbiology.microbiology_has_changed_human_history', 'Microbiology has changed human history more than any technology. These five cases are turning points.')
          ),
          h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
            CASES.map(function(c) {
              var active = d.selectedCase === c.id;
              return h('button', { key: c.id,
                onClick: function() { upd({ selectedCase: c.id }); },
                style: { padding: '8px 12px', borderRadius: 8, background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), color: active ? '#6ee7b7' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer', textAlign: 'left' }
              },
                h('div', null, c.icon + ' ' + c.name),
                h('div', { style: { fontSize: 10, opacity: 0.7 } }, c.year)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + EMERALD } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.icon + ' ' + selected.name + ' (' + selected.year + ')'),
            infoBlock('What happened', selected.what, '#94a3b8'),
            infoBlock('Why it mattered', selected.why, EMERALD),
            infoBlock('Lesson', selected.lesson, '#f59e0b')
          ),

          // Interactive Snow's cholera map appears when the Snow case is selected
          d.selectedCase === 'snow' ? h('div', { style: { marginTop: 12 } }, h(SnowCholeraMap, { awardXP: awardXP })) : null,

          sectionCard('🌐 One Health + pandemic preparedness',
            (function() {
              var PILLARS = [
                { id: 'animal', name: __alloT('stem.microbiology.animal_health', 'Animal health'), color: '#fbbf24',
                  what: 'Veterinary medicine, wildlife biology, livestock husbandry. 70-75% of emerging human pathogens come from animals (zoonotic spillover). Surveillance of animal populations is early warning for human disease.',
                  example: 'PREDICT project (USAID, 2009-2019) surveyed ~140,000 animals + identified ~1,200 new viruses. Avian flu monitoring in poultry + wild birds. Maine\'s Cooperative Wildlife Disease Center monitors deer for chronic wasting disease + tick-borne pathogens.'
                },
                { id: 'human', name: __alloT('stem.microbiology.human_health', 'Human health'), color: '#0ea5e9',
                  what: 'Clinical medicine, public health, epidemiology, hospital infection control. The traditional "health" focus - but increasingly recognized as only one pillar.',
                  example: 'Sequencing of every COVID variant within days of emergence. Wastewater epidemiology (used widely during COVID + now for polio, RSV, mpox surveillance). The CDC + state public health labs as the front line.'
                },
                { id: 'env', name: __alloT('stem.microbiology.environmental_health', 'Environmental health'), color: '#22c55e',
                  what: 'Ecosystem health, biodiversity, climate, water quality, soil quality, urban planning. Habitat disruption + climate change drive spillover events; biodiverse + healthy ecosystems are buffer zones.',
                  example: 'Forest fragmentation + roads bring humans into closer contact with wildlife. The Nipah virus outbreaks in Malaysia (1998-99) followed deforestation that drove fruit bats into pig farms; pigs then infected humans. Climate change is expanding tick + mosquito ranges (Maine has seen this).'
                },
                { id: 'food', name: __alloT('stem.microbiology.food_water_systems', 'Food + water systems'), color: '#a855f7',
                  what: 'Agricultural practices, food processing, water treatment. Industrial animal agriculture + global food supply chains can amplify + spread pathogens; sustainable food systems can buffer against this.',
                  example: 'Antibiotic use in livestock accelerates resistance (50%+ of US antibiotic use is agricultural). Concentrated animal feeding operations (CAFOs) are pandemic risk amplifiers. Aquaculture biosecurity. The 2011 German E. coli O104:H4 outbreak from sprouts killed 53.'
                }
              ];
              var sel = PILLARS.find(function(p) { return p.id === d.selectedOneHealth; }) || PILLARS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7 } },
                  __alloT('stem.microbiology.one_health_is_the_who_fao_woah_framewo', 'One Health is the WHO/FAO/WOAH framework recognizing that human health, animal health, and environmental health are inseparable. Most emerging infectious diseases (COVID, HIV, Ebola, Zika, MERS, SARS, Lyme, West Nile) come from animals + are amplified by environmental change. You cannot prepare for the next pandemic by focusing only on human medicine.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  PILLARS.map(function(p) {
                    var active = (d.selectedOneHealth || PILLARS[0].id) === p.id;
                    return h('button', { key: p.id,
                      onClick: function() { upd({ selectedOneHealth: p.id }); },
                      style: { padding: '8px 14px', borderRadius: 8, background: active ? p.color + '33' : '#1e293b', border: '1px solid ' + (active ? p.color : '#334155'), color: active ? '#fff' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
                    }, p.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 12, background: 'var(--allo-stem-canvas, #0f172a)', borderTop: '1px solid var(--allo-stem-border, #334155)', borderRight: '1px solid var(--allo-stem-border, #334155)', borderBottom: '1px solid var(--allo-stem-border, #334155)', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.what_it_covers', 'What it covers')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, __alloT('stem.microbiology.real_world_example_2', 'Real-world example')),
                    h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.6 } }, sel.example)
                  )
                ),

                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.pandemic_preparedness_what_works', 'Pandemic preparedness - what works: ')),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, __alloT('stem.microbiology.global_surveillance', 'Global surveillance: ')), __alloT('stem.microbiology.who_global_outbreak_alert_response_net', 'WHO Global Outbreak Alert + Response Network (GOARN); CDC Global Disease Detection Centers; the Wildlife Conservation Society\'s One Health monitoring. Most pandemics are caught in the first weeks → can be contained if local response is fast.')),
                    h('li', null, h('strong', null, __alloT('stem.microbiology.wastewater_epidemiology', 'Wastewater epidemiology: ')), __alloT('stem.microbiology.pathogens_shed_in_stool_are_detectable', 'Pathogens shed in stool are detectable in sewage long before clinical cases peak. Used in real time for COVID, polio, RSV, mpox. Maine has wastewater surveillance in several treatment plants.')),
                    h('li', null, h('strong', null, __alloT('stem.microbiology.mrna_vaccine_platforms', 'mRNA vaccine platforms: ')), __alloT('stem.microbiology.covid_showed_mrna_vaccines_could_be_de', 'COVID showed mRNA vaccines could be designed within days + manufactured at scale within months. Now being readied for flu pandemic preparedness + other pathogens. Stockpiled "prototype" vaccines for priority families exist.')),
                    h('li', null, h('strong', null, __alloT('stem.microbiology.genome_sequencing_capacity', 'Genome sequencing capacity: ')), __alloT('stem.microbiology.gisaid_database_global_initiative_on_s', 'GISAID database (Global Initiative on Sharing All Influenza Data) collected ~17 million COVID genomes from 200+ countries. Real-time variant tracking enabled rapid response.')),
                    h('li', null, h('strong', null, __alloT('stem.microbiology.protected_wild_habitat', 'Protected wild habitat: ')), __alloT('stem.microbiology.biodiverse_intact_ecosystems_are_pande', 'Biodiverse intact ecosystems are pandemic firewalls. The cheapest pandemic prevention is forest conservation + restricted wildlife trade.')),
                    h('li', null, h('strong', null, __alloT('stem.microbiology.honest_political_will', 'Honest political will: ')), __alloT('stem.microbiology.no_technical_solution_overcomes_politi', 'No technical solution overcomes politicization of public health. The 2024 WHO Pandemic Treaty negotiations stalled on equity issues + national sovereignty concerns; these conversations are unfinished business.'))
                  )
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.the_next_pandemic', 'The next pandemic: ')),
                  __alloT('stem.microbiology.epidemiologists_do_not_know_whether_it', 'Epidemiologists do NOT know whether it will be influenza, coronavirus, paramyxovirus, filovirus, or something not yet known. They DO know the conditions: more frequent spillovers (3-4× more documented zoonoses now vs 50 years ago) + globalized travel + denser cities + climate-driven habitat shifts + lower vaccination + accelerating antibiotic resistance. Preparedness investment looks expensive until you compare it to the COVID-19 cost (~$16 trillion globally + 7+ million direct deaths + many millions more indirect).')
                )
              );
            })(),
            '#22c55e'
          ),

          // ─── Microbial forensics ────────────────────────────────
          sectionCard('🔎 Microbial forensics - pathogen DNA as evidence',
            (function() {
              var FOR_TOPICS = [
                { id: 'what', name: __alloT('stem.microbiology.what_microbial_forensics_is', 'What microbial forensics is'), emoji: '🧬',
                  body: __alloT('stem.microbiology.microbial_forensics_applies_genomic_ep', 'Microbial forensics applies genomic + epidemiological analysis to investigate microbial-disease incidents - whether natural outbreaks, accidental release, or deliberate attacks. The discipline emerged distinctly in response to the 2001 anthrax letters: the same DNA-sequencing tools used in microbiology research were turned to ATTRIBUTION questions (where did this pathogen come from?). It now spans foodborne-outbreak source tracing, hospital-outbreak investigation, environmental contamination tracking, biosecurity incident response, even biological-warfare attribution.'),
                  caveat: 'Microbial forensics is technically demanding + legally hazardous. Sequencing tells you ONE thing (the pathogen\'s genetic identity). Inferring the source requires comparing against reference databases + reasoning about evolutionary distance + sampling completeness. Wrongful attribution has serious consequences. The Amerithrax investigation (FBI, 2001-2010, $100M+) eventually concluded a single suspect but the conclusion remains debated; the FBI\'s case was technically robust but always indirect.'
                },
                { id: 'anthrax', name: __alloT('stem.microbiology.the_2001_anthrax_letters', 'The 2001 anthrax letters'), emoji: '✉️',
                  body: __alloT('stem.microbiology.in_september_october_2001_immediately_', 'In September-October 2001, immediately after 9/11, letters containing weaponized Bacillus anthracis spores were mailed to news organizations + two US Senators. Five people died, 17 sickened. The FBI investigation became the largest single criminal probe in US history. Initial suspect (Steven Hatfill) was wrongfully accused + later cleared with a $5.8M settlement. Eventually, microbial forensics traced the anthrax strain to a specific flask (RMR-1029) at the US Army Medical Research Institute of Infectious Diseases (USAMRIID, Fort Detrick MD). The FBI named Bruce Ivins, a USAMRIID researcher, as the lone suspect; he died by suicide in 2008 before charges were filed. The National Academy of Sciences 2011 review concluded the genetic + circumstantial evidence was "consistent with" Ivins\'s guilt but not definitive.'),
                  caveat: 'Amerithrax demonstrated both the POWER + the LIMITS of microbial forensics. The genetic analysis was groundbreaking - using whole-genome sequencing + 4-marker characterization to trace the anthrax to a specific stock. But genetic identity does not prove who SPRAYED the letters. Many scientists remain unconvinced of Ivins\'s sole guilt. The case is required reading in forensic + biosecurity ethics courses.'
                },
                { id: 'foodborne', name: __alloT('stem.microbiology.foodborne_outbreak_tracing_pulsenet', 'Foodborne outbreak tracing (PulseNet)'), emoji: '🍔',
                  body: __alloT('stem.microbiology.most_modern_microbial_forensics_is_not', 'Most modern microbial forensics is NOT about bioterrorism - it is about FOOD SAFETY. PulseNet (covered briefly in the surveillance section) uses whole-genome sequencing of foodborne-pathogen isolates from sick people to identify CLUSTERS of genetically-identical isolates across multiple states. When 30 Salmonella cases in 12 states share an indistinguishable genome, they likely came from a single contamination source. PulseNet has cracked hundreds of outbreaks: E. coli in spinach (2006), Listeria in cantaloupe (2011), Salmonella in cucumbers (2015), the ongoing investigations of organic carrots + flour + cilantro. Tracing the genome to a specific FACTORY or FARM uses additional environmental sequencing + interviews + records.'),
                  caveat: 'PulseNet works because the US has cooperative federal-state-local public health infrastructure + standardized procedures + funded surveillance. Most of the world does not. Where PulseNet exists, outbreaks are detected in days + interventions happen in weeks. Where it does not, outbreaks may spread for months before any pattern is recognized. Maine is a participating state; the Maine CDC contributes to the national network.'
                },
                { id: 'covid', name: __alloT('stem.microbiology.covid_origins_genomic_forensics', 'COVID origins + genomic forensics'), emoji: '🦠',
                  body: __alloT('stem.microbiology.the_origin_of_sars_cov_2_remains_one_o', 'The origin of SARS-CoV-2 remains one of the most consequential + contested questions in microbial forensics. The two main hypotheses: ZOONOTIC SPILLOVER from the Huanan Seafood Market in Wuhan (via intermediate animal hosts, similar to SARS-CoV-1 from civets in 2002-2003) vs RESEARCH-RELATED INCIDENT involving the Wuhan Institute of Virology (which conducted coronavirus research nearby). Multiple peer-reviewed analyses + intelligence-community assessments + WHO investigations have weighed in. Genomic forensics has compared SARS-CoV-2 to viral genomes from market animals + bat coronaviruses + WIV samples. As of 2024-2025: most published peer-reviewed evidence favors zoonotic origin centered on the Huanan market; minority opinion + some intelligence assessments favor lab-related origin. The question may never be definitively resolved.'),
                  caveat: 'The COVID origins debate is a microcosm of the political stakes around microbial forensics. Scientific evidence is uncertain enough to allow good-faith disagreement; political stakes are high enough to push some commenters past what evidence supports. School psychologists encountering family questions on this: the honest answer is "we don\'t know with certainty, the most-supported scientific hypothesis is zoonotic, lab-origin remains plausible but unproven, both hypotheses motivate the same biosafety + surveillance reforms." Dismissing either side without evidence is not scientific honesty.'
                },
                { id: 'hospital', name: __alloT('stem.microbiology.hospital_outbreak_investigation', 'Hospital outbreak investigation'), emoji: '🏥',
                  body: __alloT('stem.microbiology.when_a_hospital_sees_unexpected_cluste', 'When a hospital sees unexpected clusters of MRSA, C. difficile, Candida auris, or other healthcare-associated infections, the infection-prevention team uses microbial forensics to trace transmission. Whole-genome sequencing distinguishes between (a) coincidental cases (different strains), (b) common-source transmission (all from one contaminated piece of equipment, water source, or asymptomatic carrier), (c) person-to-person spread via healthcare workers. The Mid-Atlantic Region NHSN Healthcare Reporting database connects to genomic surveillance via the CDC. The investigation guides specific interventions: equipment replacement, deep cleaning, staff testing, patient cohorting.'),
                  caveat: 'Hospital outbreak investigation is expensive + time-consuming + reveals problems no one wants found. Some institutions have been criticized for underreporting outbreaks. Modern best practice (UK NHS, many US academic medical centers, CMS conditions of participation) increasingly requires transparent outbreak reporting + public disclosure. The trade-off: better data improves quality but may discourage timely reporting if penalties are punitive.'
                },
                { id: 'environment', name: __alloT('stem.microbiology.environmental_forensics', 'Environmental forensics'), emoji: '🌊',
                  body: __alloT('stem.microbiology.microbial_forensics_applies_to_environ', 'Microbial forensics applies to ENVIRONMENTAL incidents too. AFTER A SPILL: did this petroleum contamination come from local refineries or imported oil? (microbial communities differ by source). HARMFUL ALGAL BLOOMS: which algal species + which environmental conditions triggered this bloom (genomic + nutrient analysis). CONTAMINATED WATER SUPPLIES: where did the pathogens enter the system (sampling along the distribution + sewer system + environmental waters). WILDLIFE PATHOGEN MOVEMENT: chytrid fungus, white-nose syndrome in bats, sudden oak death - all use microbial forensics to track pathogen spread + identify hotspots.'),
                  caveat: 'Environmental forensics requires extensive baseline sampling - knowing what microbial communities are NORMAL for a given site before contamination. Many sites lack this baseline; first-time investigations have to work from regional analogs. Climate change is also rapidly changing baseline microbial communities, complicating "before vs after" comparisons in long-term studies.'
                },
                { id: 'tools', name: __alloT('stem.microbiology.the_forensic_toolkit', 'The forensic toolkit'), emoji: '🧰',
                  body: __alloT('stem.microbiology.modern_microbial_forensics_uses_1_whol', 'Modern microbial forensics uses: (1) WHOLE-GENOME SEQUENCING - to characterize the pathogen down to single-nucleotide differences. (2) METAGENOMIC SEQUENCING - to identify all microbes in a sample without prior knowledge. (3) PHYLOGENETIC ANALYSIS - to reconstruct evolutionary relationships + transmission chains. (4) MOLECULAR-CLOCK estimation - to date the most recent common ancestor of a cluster. (5) ENVIRONMENTAL DNA (eDNA) sampling - to detect microbes from water, soil, surfaces. (6) ISOTOPIC ANALYSIS - to trace geographic origin of microbial material from elemental signatures. (7) STATISTICAL BAYESIAN INFERENCE - to quantify the probability of competing source hypotheses.'),
                  caveat: 'Each tool has standards + limits. The forensic standard requires: chain of custody for samples, validated laboratory procedures, blind technical replicates, peer-reviewed reference databases, statistical confidence statements. Casework-quality work is often slower + more expensive than research-quality work. The 2009 NAS report "Strengthening Forensic Science in the United States" called out gaps in microbial-forensics standards that the field is still working to address.'
                },
                { id: 'ethics', name: __alloT('stem.microbiology.biosecurity_dual_use', 'Biosecurity + dual-use'), emoji: '🛡️',
                  body: __alloT('stem.microbiology.microbial_forensics_enables_both_attri', 'Microbial forensics enables both ATTRIBUTION (catching bad actors after attacks) + DETERRENCE (knowing attribution will follow may deter attacks). It is also a DUAL-USE technology: the same sequencing skills + reference databases that enable forensics could in principle help bad actors evade attribution. The biosecurity community has navigated this: (a) reference databases of high-consequence pathogen genomes are LIMITED to vetted institutions; (b) the Federal Select Agent Program tracks lab possessions of dangerous pathogens; (c) "gain-of-function" research is reviewed by the Cares Act P3CO panel; (d) the Biological Weapons Convention prohibits states from weaponizing pathogens (though enforcement is weak). Microbial-forensics ethics is taught in biosecurity programs at Harvard, Hopkins, Georgetown, + others.'),
                  caveat: 'Biosecurity is genuinely hard. Most pathogens with bioterrorism potential are common in nature + freely studied for medical purposes. Restricting research too much hurts our ability to develop vaccines + treatments. Not restricting it enough increases proliferation risk. Reasonable scientists + policymakers disagree on the right balance, + the conversation is ongoing. Students interested should engage with the actual debates rather than the simplified versions in popular media.'
                }
              ];
              var sel = d.selectedForensics || 'what';
              var topic = FOR_TOPICS.find(function(t) { return t.id === sel; }) || FOR_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, marginBottom: 12 } },
                  __alloT('stem.microbiology.when_a_pathogen_kills_people_microbial', 'When a pathogen kills people, microbial forensics asks: where did it come from? The discipline traces foodborne-outbreak sources, hospital-acquired infections, environmental contamination, and (rarely + consequentially) deliberate attacks. The 2001 anthrax letters launched the field; foodborne-outbreak investigations + COVID origins debates have shaped its modern practice. The science is real, the political stakes are sometimes enormous, and the limits of attribution from genome data are real + worth understanding.')
                ),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 } },
                  FOR_TOPICS.map(function(t) {
                    var on = t.id === sel;
                    return h('button', {
                      key: t.id,
                      onClick: function() { upd({ selectedForensics: t.id }); },
                      style: { padding: '6px 10px', borderRadius: 8, fontSize: 11.5, fontWeight: 600, cursor: 'pointer', background: on ? '#dc2626' : '#1e293b', color: on ? '#0f172a' : '#e2e8f0', border: on ? '2px solid #dc2626' : '1px solid #334155' }
                    }, t.emoji + ' ' + t.name);
                  })
                ),
                h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.35)' } },
                  h('div', { style: { fontSize: 13.5, fontWeight: 700, color: '#fca5a5', marginBottom: 6 } }, topic.emoji + ' ' + topic.name),
                  h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, __alloT('stem.microbiology.honest_framing_10', 'Honest framing: ')), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 11.5, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, __alloT('stem.microbiology.for_students_considering_this_field', 'For students considering this field: ')),
                  __alloT('stem.microbiology.microbial_forensics_careers_combine_mo', 'Microbial forensics careers combine molecular biology + bioinformatics + public health + sometimes criminal-justice work. Training paths: bachelor\'s in microbiology / biochemistry / public health → graduate work in epidemiology or computational biology → PhD or MPH for research roles, or join state public health labs / CDC / FBI labs / Department of Defense USAMRIID / Lawrence Livermore National Laboratory. The work matters + the field needs more practitioners. For Maine students: UMaine\'s School of Biology + Ecology + the Jackson Laboratory + Bigelow Lab all have research connections.')
                )
              );
            })(),
            '#dc2626'
          )
        );
        function infoBlock(title, body, color) {
          return h('div', { style: { padding: 10, borderRadius: 8, background: 'var(--allo-stem-canvas, #0f172a)', borderLeft: '3px solid ' + color, marginTop: 8 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, title),
            h('div', { style: { fontSize: 12.5, color: 'var(--allo-stem-text, #e2e8f0)', lineHeight: 1.65 } }, body)
          );
        }
      }

      // QUIZ
      function renderQuiz() {
        var answers = d.quizAnswers || [];
        var done = d.quizSubmitted;
        function select(qIdx, cIdx) {
          var na = answers.slice(); na[qIdx] = cIdx;
          upd({ quizAnswers: na });
        }
        function submit() {
          var c = 0;
          QUIZ_QUESTIONS.forEach(function(q, i) { if (answers[i] === q.answer) c++; });
          upd({ quizSubmitted: true, quizCorrect: c });
          if (addToast) addToast('Quiz: ' + c + '/' + QUIZ_QUESTIONS.length, c >= 9 ? 'success' : 'info');
          if (awardXP) awardXP(c * 5);
        }
        function reset() { upd({ quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0 }); }

        if (done) {
          var correct = d.quizCorrect || 0;
          var pct = Math.round(correct / QUIZ_QUESTIONS.length * 100);
          return h('div', { style: { padding: 16 } },
            (function() {
              var radius = 40;
              var circumference = 2 * Math.PI * radius;
              var strokeDashoffset = circumference - (pct / 100) * circumference;
              var strokeColor = pct >= 80 ? '#10b981' : (pct >= 60 ? '#38bdf8' : '#fbbf24');
              return h('div', { style: { padding: 20, borderRadius: 12, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 16 } },
                h('div', { style: { fontSize: 32, marginBottom: 8 } }, pct >= 80 ? '🧬' : pct >= 60 ? '🦠' : '🔬'),
                h('svg', { width: 100, height: 100, style: { transform: 'rotate(-90deg)' } },
                  h('circle', { cx: 50, cy: 50, r: radius, fill: 'none', stroke: '#0f172a', strokeWidth: 8 }),
                  h('circle', {
                    cx: 50,
                    cy: 50,
                    r: radius,
                    fill: 'none',
                    stroke: strokeColor,
                    strokeWidth: 8,
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeDashoffset,
                    strokeLinecap: 'round',
                    style: { transition: 'stroke-dashoffset 0.8s ease-in-out' }
                  })
                ),
                h('div', { style: { marginTop: -62, marginBottom: 35, textAlign: 'center', zIndex: 2 } },
                  h('div', { style: { fontSize: 20, fontWeight: 900, color: strokeColor } }, pct + '%'),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, correct + '/' + QUIZ_QUESTIONS.length)
                ),
                h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 10 } }, pct >= 80 ? 'Excellent job! You mastered microbiology!' : (pct >= 60 ? 'Good work! Review the wrong answers to improve.' : 'Keep studying the lab and try again!'))
              );
            })(),
            QUIZ_QUESTIONS.map(function(q, i) {
              var got = answers[i] === q.answer;
              return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-canvas, #0f172a)', border: '1px solid ' + (got ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'), borderLeft: '3px solid ' + (got ? '#22c55e' : '#ef4444'), marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: got ? '#86efac' : '#fca5a5', marginBottom: 4 } }, (got ? '✓ ' : '✗ ') + 'Q' + (i + 1)),
                h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 6 } }, q.q),
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', marginBottom: 4 } }, 'Correct: ', h('strong', null, q.choices[q.answer])),
                !got ? h('div', { style: { fontSize: 11, color: 'var(--allo-stem-text-soft, #94a3b8)', marginBottom: 4 } }, __alloT('stem.microbiology.your_answer', 'Your answer: '), q.choices[answers[i] != null ? answers[i] : 0]) : null,
                h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text, #cbd5e1)', lineHeight: 1.6, fontStyle: 'italic' } }, q.explain)
              );
            }),
            h('button', { onClick: reset, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: EMERALD, color: '#fff', fontWeight: 700, cursor: 'pointer' } }, __alloT('stem.microbiology.retake_quiz', 'Retake quiz'))
          );
        }
        var allAnswered = QUIZ_QUESTIONS.every(function(_, i) { return answers[i] != null; });
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: 'var(--allo-stem-text, #cbd5e1)', fontSize: 13, marginBottom: 12 } }, QUIZ_QUESTIONS.length + ' questions on bacteria, viruses, vaccines, antibiotic resistance, microbiome, and history.'),
          QUIZ_QUESTIONS.map(function(q, i) {
            return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: 'var(--allo-stem-panel, #1e293b)', border: '1px solid var(--allo-stem-border, #334155)', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, color: 'var(--allo-stem-text, #e2e8f0)', marginBottom: 8, lineHeight: 1.55 } }, h('strong', { style: { color: '#6ee7b7' } }, 'Q' + (i + 1) + '. '), q.q),
              q.choices.map(function(c, ci) {
                var picked = answers[i] === ci;
                return h('button', { key: ci,
                  onClick: function() { select(i, ci); },
                  className: 'quiz-choice-card' + (picked ? ' selected' : ''),
                  'aria-label': 'Option: ' + c
                }, c);
              })
            );
          }),
          h('button', { onClick: submit, disabled: !allAnswered,
            style: { padding: '10px 24px', borderRadius: 8, border: 'none', background: allAnswered ? EMERALD : '#475569', color: '#fff', fontWeight: 800, fontSize: 14, cursor: allAnswered ? 'pointer' : 'not-allowed' }
          }, allAnswered ? 'Submit quiz' : 'Answer all questions (' + answers.filter(function(a) { return a != null; }).length + '/' + QUIZ_QUESTIONS.length + ')')
        );
      }

      // PRINT
      function renderPrint() {
        return h('div', { style: { padding: 16 } },
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.10)', borderTop: '1px solid rgba(16,185,129,0.4)', borderRight: '1px solid rgba(16,185,129,0.4)', borderBottom: '1px solid rgba(16,185,129,0.4)', borderLeft: '3px solid ' + EMERALD, marginBottom: 12, fontSize: 12.5, color: '#a7f3d0', lineHeight: 1.65 } },
            h('strong', null, __alloT('stem.microbiology.microbiology_lab_reference', '🖨 Microbiology lab reference. ')),
            __alloT('stem.microbiology.a_one_page_take_along_lab_safety_bsl_l', 'A one-page take-along: lab safety (BSL levels, handling), bacteria/virus reference, antibiotic stewardship checklist, and the microbiome do/don\'t list.')
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: function() { try { window.print(); } catch (e) {} },
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, __alloT('stem.microbiology.print_save_as_pdf', '🖨 Print / Save as PDF'))
          ),
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#micro-print-region, #micro-print-region * { visibility: visible !important; } ' +
            '#micro-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; background: #fff !important; color: #0f172a !important; } ' +
            '#micro-print-region * { background: transparent !important; color: #0f172a !important; border-color: #888 !important; } ' +
            '.no-print { display: none !important; } }'
          ),
          h('div', { id: 'micro-print-region', style: { padding: 18, borderRadius: 12, background: '#ffffff', color: '#0f172a', border: '1px solid #e2e8f0' } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #0f172a', paddingBottom: 8, marginBottom: 14 } },
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, __alloT('stem.microbiology.microbiology_reference', 'Microbiology Reference')),
              h('div', { style: { fontSize: 11, color: '#475569' } }, __alloT('stem.microbiology.ngss_ms_ls1_hs_ls1_hs_ls3_hs_ls4', 'NGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4'))
            ),

            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' } },
              h('strong', null, __alloT('stem.microbiology.lab_safety', 'Lab safety: ')),
              __alloT('stem.microbiology.wash_hands_before_and_after_every_micr', 'Wash hands before AND after every microbiology activity. Wear closed-toe shoes. No eating or drinking. Treat all cultures as if pathogenic. Autoclave or bleach all materials before disposal. Tell a teacher immediately if you cut yourself or get a spill.')
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, __alloT('stem.microbiology.biosafety_levels_bsl', 'Biosafety Levels (BSL)')),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.7 } },
                h('li', null, h('strong', null, 'BSL-1: '), __alloT('stem.microbiology.non_pathogenic_e_coli_k_12_bacillus_su', 'Non-pathogenic. E. coli K-12, Bacillus subtilis, baker\'s yeast. Standard handwashing + bench surface disinfection.')),
                h('li', null, h('strong', null, 'BSL-2: '), __alloT('stem.microbiology.moderate_risk_human_pathogens_salmonel', 'Moderate-risk human pathogens. Salmonella, S. aureus, HIV cultures. Biosafety cabinet, gloves, eye protection.')),
                h('li', null, h('strong', null, 'BSL-3: '), __alloT('stem.microbiology.serious_airborne_pathogens_m_tuberculo', 'Serious airborne pathogens. M. tuberculosis, SARS-CoV-2 (in labs), West Nile. Negative pressure rooms, respirators.')),
                h('li', null, h('strong', null, 'BSL-4: '), __alloT('stem.microbiology.lethal_no_vaccine_ebola_marburg_lassa_', 'Lethal, no vaccine. Ebola, Marburg, Lassa. Full positive-pressure suits, air locks, only a few labs in the world.'))
              ),
              h('div', { style: { fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 4 } }, __alloT('stem.microbiology.school_labs_operate_at_bsl_1_anything_', 'School labs operate at BSL-1. Anything else is for trained professional labs.'))
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, __alloT('stem.microbiology.quick_microbe_reference', 'Quick microbe reference')),
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                h('thead', null, h('tr', null,
                  ['Microbe', 'Type', 'Where', 'Role'].map(function(c, i) {
                    return h('th', { key: i, style: { padding: 5, textAlign: 'left', background: '#f1f5f9', border: '1px solid var(--allo-stem-border, #cbd5e1)', fontWeight: 800 } }, c);
                  })
                )),
                h('tbody', null,
                  BACTERIA.concat(VIRUSES.map(function(v) { return { name: v.name, shape: '(virus)', where: v.hosts, role: 'pathogen' }; })).map(function(m, i) {
                    return h('tr', { key: i },
                      h('td', { style: { padding: 5, border: '1px solid var(--allo-stem-border, #cbd5e1)', fontWeight: 700 } }, m.name),
                      h('td', { style: { padding: 5, border: '1px solid var(--allo-stem-border, #cbd5e1)' } }, m.shape || '-'),
                      h('td', { style: { padding: 5, border: '1px solid var(--allo-stem-border, #cbd5e1)' } }, (m.where || '').substring(0, 80)),
                      h('td', { style: { padding: 5, border: '1px solid var(--allo-stem-border, #cbd5e1)' } }, m.role)
                    );
                  })
                )
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, __alloT('stem.microbiology.antibiotic_stewardship_checklist', 'Antibiotic stewardship checklist')),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.7 } },
                h('li', null, __alloT('stem.microbiology.antibiotics_only_when_prescribed_by_a_', '□ Antibiotics only when prescribed by a clinician.')),
                h('li', null, __alloT('stem.microbiology.antibiotics_never_for_viral_infections', '□ Antibiotics do not treat viral infections such as colds and flu. Some ear and sinus infections improve without antibiotics; ask a clinician.')),
                h('li', null, __alloT('stem.microbiology.finish_the_full_course_exactly_as_pres', '□ Take antibiotics exactly as prescribed. Do not change the dose or duration without clinical guidance.')),
                h('li', null, __alloT('stem.microbiology.never_share_antibiotics_or_take_leftov', '□ Never share antibiotics or take leftover doses.')),
                h('li', null, __alloT('stem.microbiology.ask_what_specific_bacterium_is_being_t', '□ Ask what specific bacterium is being treated and whether a narrow-spectrum option is available.')),
                h('li', null, __alloT('stem.microbiology.don_t_demand_antibiotics_trust_the_dia', '□ Don\'t demand antibiotics. Trust the diagnosis.'))
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, __alloT('stem.microbiology.microbiome_what_helps_and_what_hurts', 'Microbiome - what helps and what hurts')),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5, color: '#0f172a', lineHeight: 1.55 } },
                h('div', { style: { padding: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6 } },
                  h('strong', null, 'Helps:'),
                  h('ul', { style: { margin: '4px 0 0 18px', padding: 0 } },
                    h('li', null, __alloT('stem.microbiology.diverse_plant_rich_diet_fiber', 'Diverse plant-rich diet (fiber)')),
                    h('li', null, __alloT('stem.microbiology.fermented_foods', 'Fermented foods')),
                    h('li', null, __alloT('stem.microbiology.vaginal_birth_breastfeeding', 'Vaginal birth + breastfeeding')),
                    h('li', null, __alloT('stem.microbiology.time_outdoors_with_animals', 'Time outdoors + with animals')),
                    h('li', null, __alloT('stem.microbiology.sleep_low_stress', 'Sleep + low stress'))
                  )
                ),
                h('div', { style: { padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 } },
                  h('strong', null, 'Hurts:'),
                  h('ul', { style: { margin: '4px 0 0 18px', padding: 0 } },
                    h('li', null, __alloT('stem.microbiology.unnecessary_antibiotics', 'Unnecessary antibiotics')),
                    h('li', null, __alloT('stem.microbiology.highly_processed_low_fiber_diet', 'Highly processed / low-fiber diet')),
                    h('li', null, __alloT('stem.microbiology.excessive_sanitation_esp_in_kids', 'Excessive sanitation (esp. in kids)')),
                    h('li', null, __alloT('stem.microbiology.chronic_stress', 'Chronic stress')),
                    h('li', null, __alloT('stem.microbiology.most_artificial_sweeteners_research_ev', 'Most artificial sweeteners (research evolving)'))
                  )
                )
              )
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              __alloT('stem.microbiology.sources_cdc_cdc_gov_antibiotic_use_nih', 'Sources: CDC (cdc.gov/antibiotic-use) · NIH Human Microbiome Project (commonfund.nih.gov/hmp) · Madigan et al., Brock Biology of Microorganisms (15th ed.) · Mukherjee, S. (2022), The Song of the Cell · Yong, E. (2016), I Contain Multitudes. Printed from AlloFlow STEM Lab.')
            )
          )
        );
      }

      var body;
      switch (d.tab) {
        case 'bacteria':   body = renderBacteria(); break;
        case 'viruses':    body = renderViruses(); break;
        case 'fungi':      body = renderFungi(); break;
        case 'protists':   body = renderProtists(); break;
        case 'archaea':    body = renderArchaea(); break;
        case 'microscope': body = renderMicroscope(); break;
        case 'resistance': body = renderResistance(); break;
        case 'microbiome': body = renderMicrobiome(); break;
        case 'plantmicro': body = renderPlantMicrobe(); break;
        case 'biofilms':   body = renderBiofilm(); break;
        case 'biotech':    body = renderBiotech(); break;
        case 'immune':     body = renderImmune(); break;
        case 'ferment':    body = renderFerment(); break;
        case 'cases':      body = renderCases(); break;
        case 'quiz':       body = renderQuiz(); break;
        case 'print':      body = renderPrint(); break;
        case 'growthLab':  body = (function() {
          var iq = d.growthLab || DEFAULT_MICROBIOLOGY_STATE.growthLab;
          function setIQ(patch) { upd({ growthLab: Object.assign({}, iq, patch) }); }
          var profile = MICRO_GROWTH_PROFILES[iq.profile] || MICRO_GROWTH_PROFILES.ecoli;
          var growth = microGrowthScoreFor(iq, profile);
          var state;
          if (growth < 0.05) state = 'noGrowth';
          else if (growth < 0.25) state = 'slow';
          else if (growth < 0.6) state = 'normal';
          else state = 'optimal';
          var sm = {
            noGrowth: { label: __alloT('stem.microbiology.no_growth', 'No growth predicted'), color: '#f87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.45)', desc: 'One or more conditions fall outside this profile\'s teaching envelope.' },
            slow:     { label: __alloT('stem.microbiology.slow_growth', 'Slow growth predicted'), color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.45)', desc: 'Conditions are tolerated, but at least one is far from the profile optimum.' },
            normal:   { label: __alloT('stem.microbiology.healthy_growth', 'Strong growth predicted'), color: '#34d399', bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.45)', desc: 'The selected conditions fit most of this organism profile\'s envelope.' },
            optimal:  { label: __alloT('stem.microbiology.optimal_growth', 'Near-optimum growth predicted'), color: '#a78bfa', bg: 'rgba(167,139,250,0.14)', border: 'rgba(167,139,250,0.5)', desc: 'Temperature, pH, and oxygen are all near this profile\'s modeled optimum.' }
          }[state];
          var H = React.createElement;
          return H('div', { style: { padding: 20, maxWidth: 900, margin: '0 auto' } },
            H('div', { style: { padding: 16, background: '#0f172a', borderRadius: 10, color: '#e2e8f0', border: '1px solid #34d399' } },
              H('h3', { style: { fontSize: 14, fontWeight: 800, color: '#34d399', margin: '0 0 6px 0' } }, 'Microbial growth discovery'),
              H('p', { style: { fontSize: 12, color: '#cbd5e1', margin: '0 0 12px' } }, 'Compare organism-specific teaching profiles. Oxygen can help, be tolerated, or prevent growth depending on metabolism.'),
              H('label', { htmlFor: 'gl-profile', style: { display: 'grid', gap: 4, marginBottom: 10, fontSize: 11, fontWeight: 700, color: '#cbd5e1' } },
                H('span', null, 'Organism profile'),
                H('select', {
                  id: 'gl-profile',
                  value: profile.id,
                  onChange: function(e) {
                    var nextProfile = MICRO_GROWTH_PROFILES[e.target.value] || MICRO_GROWTH_PROFILES.ecoli;
                    var defaults = microProfileDefaults(nextProfile);
                    setIQ({
                      profile: nextProfile.id,
                      tempC: defaults.tempC,
                      pH: defaults.pH,
                      oxygen: defaults.oxygen,
                      log: [],
                      hypothesis: '',
                      stuckRevealed: false,
                      understood: false,
                      explanation: ''
                    });
                  },
                  style: { width: '100%', padding: '7px 9px', borderRadius: 6, border: '1px solid rgba(52,211,153,0.45)', background: '#1e293b', color: '#e2e8f0', fontSize: 12 }
                },
                  Object.keys(MICRO_GROWTH_PROFILES).map(function(key) {
                    var item = MICRO_GROWTH_PROFILES[key];
                    return H('option', { key: item.id, value: item.id }, item.label);
                  })
                )
              ),
              H('div', { role: 'status', 'aria-live': 'polite', style: { padding: 12, borderRadius: 8, textAlign: 'center', background: sm.bg, border: '2px solid ' + sm.border, marginBottom: 10 } },
                H('div', { style: { fontSize: 14, fontWeight: 900, color: sm.color } }, sm.label + ' - ' + profile.short),
                H('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 4 } }, sm.desc)
              ),
              H('div', { role: 'note', style: { padding: 9, borderRadius: 6, background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.25)', color: '#bae6fd', fontSize: 11, lineHeight: 1.5, marginBottom: 10 } }, profile.oxygenNote),
              H('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 } },
                [{ k: 'tempC', l: 'Temperature', unit: '°C', mn: 0, mx: 90, st: 1 },
                 { k: 'pH', l: 'pH', unit: '', mn: 3, mx: 10, st: 0.1 },
                 { k: 'oxygen', l: 'Oxygen', unit: '%', mn: 0, mx: 100, st: 5 }].map(function(s) {
                  return H('label', { key: s.k, htmlFor: 'gl-' + s.k, style: { display: 'grid', gap: 4, fontSize: 11, fontWeight: 700, color: '#cbd5e1' } },
                    H('span', null, s.l + ': ', H('span', { style: { color: '#34d399', fontFamily: 'monospace' } }, iq[s.k] + s.unit)),
                    H('input', {
                      id: 'gl-' + s.k,
                      type: 'range',
                      'aria-valuetext': iq[s.k] + (s.unit ? ' ' + s.unit : ''),
                      min: s.mn, max: s.mx, step: s.st, value: iq[s.k],
                      onChange: function(e) { var patch = {}; patch[s.k] = parseFloat(e.target.value); setIQ(patch); },
                      style: { width: '100%' }
                    })
                  );
                })
              ),
              H('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 } },
                H('button', {
                  type: 'button',
                  onClick: function() {
                    setIQ({ log: (iq.log || []).concat([{ profile: profile.short, t: iq.tempC, p: iq.pH, o: iq.oxygen, state: sm.label }]).slice(-8) });
                  },
                  style: { padding: '6px 10px', background: '#1e293b', color: '#cbd5e1', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }
                }, 'Log conditions'),
                H('button', {
                  type: 'button',
                  onClick: function() {
                    var defaults = microProfileDefaults(profile);
                    setIQ({ tempC: defaults.tempC, pH: defaults.pH, oxygen: defaults.oxygen, log: [], hypothesis: '', stuckRevealed: false, understood: false, explanation: '' });
                  },
                  style: { padding: '6px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 6, fontSize: 11, cursor: 'pointer' }
                }, 'Reset profile')
              ),
              (iq.log || []).length > 0 && H('div', {
                role: 'log',
                'aria-live': 'polite',
                'aria-label': 'Recent growth condition profiles',
                style: { padding: 8, marginBottom: 10, borderRadius: 6, background: '#111827', border: '1px solid #334155', fontSize: 10, color: '#cbd5e1', lineHeight: 1.5 }
              },
                iq.log.map(function(entry, index) {
                  return H('div', { key: index }, entry.profile + ': ' + entry.t + '°C, pH ' + entry.p + ', O2 ' + entry.o + '% - ' + entry.state);
                })
              ),
              H('label', { htmlFor: 'gl-hypothesis', style: { display: 'grid', gap: 4, fontSize: 11, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 } },
                H('span', null, 'Hypothesis: Which condition most restricts this organism?'),
                H('textarea', {
                  id: 'gl-hypothesis',
                  value: iq.hypothesis || '',
                  onChange: function(e) { setIQ({ hypothesis: e.target.value }); },
                  style: { width: '100%', minHeight: 50, padding: 6, background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(100,116,139,0.4)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' },
                  rows: 2
                })
              ),
              !iq.stuckRevealed && H('button', {
                type: 'button',
                onClick: function() { setIQ({ stuckRevealed: true }); },
                style: { padding: '6px 10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.5)', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }
              }, 'Show investigation prompts'),
              iq.stuckRevealed && H('div', { style: { padding: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6, fontSize: 11, color: '#cbd5e1', marginBottom: 8 } },
                H('ul', { style: { margin: 0, paddingLeft: 18 } },
                  H('li', null, 'Keep temperature and pH constant. What changes when oxygen moves from 0% to 100%?'),
                  H('li', null, 'Apply the same conditions to two profiles. Which metabolic difference explains the result?'),
                  H('li', null, 'Move one variable just beyond the profile envelope. Which boundary is sharpest?')
                )
              ),
              H('label', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#34d399', cursor: 'pointer' } },
                H('input', { type: 'checkbox', checked: !!iq.understood, onChange: function(e) { setIQ({ understood: e.target.checked }); } }),
                H('span', null, 'I can explain this organism\'s growth envelope')
              ),
              iq.understood && H('label', { htmlFor: 'gl-explanation', style: { display: 'grid', gap: 4, marginTop: 6, fontSize: 11, color: '#cbd5e1' } },
                H('span', null, 'Explanation'),
                H('textarea', {
                  id: 'gl-explanation',
                  value: iq.explanation || '',
                  onChange: function(e) { setIQ({ explanation: e.target.value }); },
                  style: { width: '100%', minHeight: 60, padding: 6, background: '#1e293b', color: '#e2e8f0', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontSize: 12, fontFamily: 'monospace' },
                  rows: 3
                })
              ),
              H('div', { role: 'note', style: { marginTop: 8, fontSize: 10, fontStyle: 'italic', color: '#94a3b8' } }, 'Illustrative relative-growth model only. It does not predict colony-forming units, doubling time, infection risk, or clinical outcomes.')
            )
          );
        })(); break;        default:           body = renderHome();
      }

      return h('div', { className: 'selh-microbiology', 'data-microbiology-tool': 'true', style: { display: 'flex', flexDirection: 'column', height: '100%', background: BG, color: 'var(--allo-stem-text, #e2e8f0)' } },
        h('style', null,
          '.micro-focus-panel { position: relative; overflow: hidden; margin: 12px 16px 10px; padding: 14px; border-radius: 8px; border: 1px solid rgba(16,185,129,0.30); background: linear-gradient(135deg, rgba(6,78,59,0.84), rgba(8,47,73,0.90) 55%, rgba(15,23,42,0.96)); box-shadow: 0 18px 42px rgba(2,8,23,0.28); }\n' +
          '.micro-focus-panel::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 4px; background: linear-gradient(90deg, #10b981, #38bdf8, #f59e0b, #a78bfa); }\n' +
          '.micro-focus-grid { position: relative; display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(250px, 0.8fr); gap: 14px; align-items: stretch; }\n' +
          '.micro-focus-kicker { margin: 0 0 4px; font-size: 10px; font-weight: 900; letter-spacing: 0; text-transform: uppercase; color: #6ee7b7; }\n' +
          '.micro-focus-title { margin: 0; font-size: 21px; line-height: 1.15; font-weight: 900; color: #ecfdf5; }\n' +
          '.micro-focus-copy { margin: 7px 0 12px; max-width: 68ch; font-size: 12px; line-height: 1.55; color: #cbd5e1; }\n' +
          '.micro-route-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(132px, 1fr)); gap: 8px; }\n' +
          '.micro-route-card { position: relative; min-height: 88px; padding: 10px; text-align: left; border-radius: 8px; border: 1px solid rgba(110,231,183,0.22); background: rgba(15,23,42,0.62); color: #d1fae5; cursor: pointer; overflow: hidden; transition: transform 160ms ease, border-color 160ms ease, background 160ms ease; }\n' +
          '.micro-route-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--micro-route-accent, #10b981); opacity: 0.85; }\n' +
          '.micro-route-card:hover { transform: translateY(-1px); border-color: rgba(110,231,183,0.48); background: rgba(15,23,42,0.78); }\n' +
          '.micro-route-card[aria-pressed="true"] { background: rgba(16,185,129,0.18); border-color: rgba(110,231,183,0.62); box-shadow: 0 0 0 2px rgba(16,185,129,0.18); }\n' +
          '.micro-route-tag { display: inline-flex; margin-bottom: 6px; padding: 2px 6px; border-radius: 999px; background: rgba(255,255,255,0.08); color: var(--micro-route-accent, #6ee7b7); font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0; }\n' +
          '.micro-route-title { display: block; margin-bottom: 3px; font-size: 12px; font-weight: 900; color: #f8fafc; }\n' +
          '.micro-route-copy { display: block; font-size: 10px; line-height: 1.35; color: #a7f3d0; }\n' +
          '.micro-status-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }\n' +
          '.micro-status-card { min-height: 70px; padding: 9px; border-radius: 8px; border: 1px solid rgba(148,163,184,0.18); background: rgba(2,6,23,0.38); }\n' +
          '.micro-status-label { margin: 0 0 4px; font-size: 10px; font-weight: 900; letter-spacing: 0; text-transform: uppercase; color: #94a3b8; }\n' +
          '.micro-status-value { margin: 0; font-size: 15px; font-weight: 900; color: #f8fafc; }\n' +
          '.micro-status-note { margin: 4px 0 0; font-size: 10px; line-height: 1.35; color: #a7f3d0; }\n' +
          '.micro-scope-stage { position: relative; min-height: 118px; margin-bottom: 9px; border-radius: 8px; border: 1px solid rgba(56,189,248,0.22); background: linear-gradient(145deg, rgba(8,47,73,0.42), rgba(2,6,23,0.48)); overflow: hidden; }\n' +
          '.micro-scope-stage::before { content: ""; position: absolute; inset: 13px; border-radius: 999px; border: 1px solid rgba(125,211,252,0.24); box-shadow: inset 0 0 34px rgba(56,189,248,0.12); }\n' +
          '.micro-scope-cross { position: absolute; inset: 50% 14px auto; height: 1px; background: rgba(125,211,252,0.18); }\n' +
          '.micro-scope-cross::after { content: ""; position: absolute; left: 50%; top: -45px; width: 1px; height: 90px; background: rgba(125,211,252,0.18); }\n' +
          '.micro-scope-cell { position: absolute; display: block; border-radius: 999px; background: #6ee7b7; border: 1px solid rgba(2,6,23,0.55); box-shadow: 0 0 14px rgba(110,231,183,0.34); }\n' +
          '.micro-library-toggle { width: 100%; margin-top: 8px; padding: 8px 10px; border-radius: 8px; border: 1px solid rgba(110,231,183,0.32); background: rgba(16,185,129,0.10); color: #a7f3d0; font-size: 11px; font-weight: 900; cursor: pointer; }\n' +
          '@media (max-width: 760px) { .micro-focus-grid { grid-template-columns: 1fr; } .micro-status-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }\n' +
          '.micro-tab-list { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 16px; border-bottom: 1px solid rgba(30, 41, 59, 0.5); flex-shrink: 0; background: rgba(10, 14, 26, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }\n' +
          '.micro-tab-list::-webkit-scrollbar { display: none; }\n' +
          '.micro-tab-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid transparent; background: transparent; color: #94a3b8; font-weight: 500; font-size: 13px; cursor: pointer; white-space: nowrap; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 6px; position: relative; }\n' +
          '.micro-tab-btn:hover { background: rgba(16, 185, 129, 0.08); color: #a7f3d0; border-color: rgba(16, 185, 129, 0.15); }\n' +
          '.micro-tab-btn.active { background: rgba(16, 185, 129, 0.15); color: #6ee7b7; font-weight: 700; border-color: rgba(16, 185, 129, 0.3); box-shadow: 0 0 12px rgba(16, 185, 129, 0.1); }\n' +
          '.micro-tab-btn.active::after { content: ""; position: absolute; bottom: 0px; left: 15%; right: 15%; height: 2.5px; background: #10b981; border-radius: 999px; box-shadow: 0 0 8px #10b981; }\n' +
          '.micro-tab-btn:focus-visible { outline: 2px solid #10b981 !important; outline-offset: 2px !important; }\n' +
          '.microscope-slide-btn { flex: 1 1 100px; min-width: 80px; padding: 8px 6px; border-radius: 8px; background: var(--allo-stem-deeper, rgba(15, 23, 42, 0.5)); color: #94a3b8; border: 1px solid rgba(100, 116, 139, 0.2); font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; text-align: center; }\n' +
          '.microscope-slide-btn:hover { background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.3); color: #e2e8f0; }\n' +
          '.microscope-slide-btn.active { background: rgba(16, 185, 129, 0.12); border-color: var(--slide-color, #10b981); color: var(--slide-color, #10b981); font-weight: 700; box-shadow: 0 0 10px rgba(16, 185, 129, 0.05); }\n' +
          '.microscope-slide-btn:focus-visible { outline: 2px solid var(--slide-color, #10b981) !important; outline-offset: 2px !important; }\n' +
          '@keyframes microBrownian { 0% { transform: translate(0, 0) rotate(0deg); } 20% { transform: translate(-0.8px, 0.6px) rotate(-0.5deg); } 40% { transform: translate(0.7px, -0.7px) rotate(0.8deg); } 60% { transform: translate(-0.5px, -0.5px) rotate(-0.3deg); } 80% { transform: translate(0.6px, 0.5px) rotate(0.4deg); } 100% { transform: translate(0, 0) rotate(0deg); } }\n' +
          '.micro-wiggle { animation: microBrownian 0.8s infinite ease-in-out; }\n' +
          '@keyframes microSwim { 0% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(12px, -8px) rotate(15deg); } 50% { transform: translate(4px, 15px) rotate(5deg); } 75% { transform: translate(-10px, 5px) rotate(-15deg); } 100% { transform: translate(0, 0) rotate(0deg); } }\n' +
          '.micro-swim { animation: microSwim 9s infinite ease-in-out; }\n' +
          '@keyframes microPhageFloat { 0% { transform: translate(0, 0); } 50% { transform: translate(-3px, -6px); } 100% { transform: translate(0, 0); } }\n' +
          '.micro-phage-float { animation: microPhageFloat 4s infinite ease-in-out; }\n' +
          '@keyframes waterFlow { to { stroke-dashoffset: -8; } }\n' +
          '.water-flow-anim { animation: waterFlow 0.5s infinite linear; }\n' +
          '@keyframes pipeFlow { to { stroke-dashoffset: -12; } }\n' +
          '.water-pipe-flow { animation: pipeFlow 1.5s infinite linear; }\n' +
          '@keyframes miasmaFloat { 0% { transform: translate(0, 0) scale(1); } 50% { transform: translate(6px, -4px) scale(1.05); } 100% { transform: translate(0, 0) scale(1); } }\n' +
          '.miasma-cloud-float { animation: miasmaFloat 10s infinite ease-in-out; }\n' +
          '@media (prefers-reduced-motion: reduce) { .micro-wiggle, .micro-swim, .micro-phage-float, .water-flow-anim, .water-pipe-flow, .miasma-cloud-float { animation: none !important; } .micro-route-card, .micro-tab-btn, .microscope-slide-btn, .quiz-choice-card { transition: none !important; transform: none !important; } }\n' +
          '.quiz-choice-card { display: block; width: 100%; text-align: left; padding: 10px 14px; border-radius: 8px; margin-bottom: 6px; background: #0f172a; border: 1px solid #334155; color: var(--allo-stem-text, #e2e8f0); font-size: 13px; cursor: pointer; line-height: 1.5; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1); }\n' +
          '.quiz-choice-card:hover { background: rgba(16, 185, 129, 0.05); border-color: rgba(16, 185, 129, 0.4); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.05); }\n' +
          '.quiz-choice-card.selected { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #6ee7b7; font-weight: 600; box-shadow: 0 0 12px rgba(16, 185, 129, 0.1); }\n' +
          '.quiz-choice-card:focus-visible { outline: 2px solid #10b981 !important; outline-offset: 2px !important; }'
        ),
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid var(--allo-stem-border, #1e293b)', background: 'linear-gradient(135deg, #064e3b, var(--allo-stem-canvas, #0f172a))', display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, '🦠'),
          h('div', null,
            h('h2', { style: { margin: 0, color: '#6ee7b7', fontSize: 20, fontWeight: 900 } }, __alloT('stem.microbiology.microbiology_lab', 'Microbiology Lab')),
            h('div', { style: { fontSize: 12, color: 'var(--allo-stem-text-soft, #94a3b8)', marginTop: 2 } }, __alloT('stem.microbiology.ngss_ms_ls1_hs_ls1_hs_ls3_hs_ls4_2', 'NGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4'))
          )
        ),
        h('section', { className: 'micro-focus-panel', 'data-microbiology-focus': 'true', 'aria-labelledby': 'microbiology-focus-title' },
          h('div', { className: 'micro-focus-grid' },
            h('div', null,
              h('p', { className: 'micro-focus-kicker' }, __alloT('stem.microbiology.lab_mission', 'Lab mission')),
              h('h3', { id: 'microbiology-focus-title', className: 'micro-focus-title' }, currentMicroTab.label || __alloT('stem.microbiology.microbiology_lab', 'Microbiology Lab')),
              h('p', { className: 'micro-focus-copy' }, __alloT('stem.microbiology.lab_mission_copy', 'Start with a lab action: observe a specimen, classify evidence, test growth conditions, or model resistance before opening the full topic library.')),
              h('div', { className: 'micro-route-grid', 'data-microbiology-route-grid': 'true' },
                MICRO_ROUTES.map(function(route) {
                  var active = d.tab === route.id;
                  return h('button', {
                    key: route.id,
                    type: 'button',
                    className: 'micro-route-card',
                    style: { '--micro-route-accent': route.accent },
                    'aria-pressed': active ? 'true' : 'false',
                    onClick: function() { upd({ tab: route.id }); }
                  },
                    h('span', { className: 'micro-route-tag' }, route.tag),
                    h('span', { className: 'micro-route-title' }, route.title),
                    h('span', { className: 'micro-route-copy' }, route.copy)
                  );
                })
              )
            ),
            h('div', null,
              h('div', { className: 'micro-scope-stage', 'aria-hidden': 'true' },
                h('span', { className: 'micro-scope-cross' }),
                h('span', { className: 'micro-scope-cell micro-wiggle', style: { width: 38, height: 12, left: '19%', top: '31%', transform: 'rotate(14deg)' } }),
                h('span', { className: 'micro-scope-cell micro-wiggle', style: { width: 15, height: 15, left: '57%', top: '23%', background: '#fbbf24' } }),
                h('span', { className: 'micro-scope-cell micro-wiggle', style: { width: 32, height: 10, left: '62%', top: '62%', background: '#38bdf8', transform: 'rotate(-28deg)' } }),
                h('span', { className: 'micro-scope-cell micro-wiggle', style: { width: 18, height: 18, left: '33%', top: '67%', background: '#a78bfa' } })
              ),
              h('div', { className: 'micro-status-grid' },
                microStatusCards.map(function(card) {
                  return h('div', { key: card.label, className: 'micro-status-card' },
                    h('p', { className: 'micro-status-label' }, card.label),
                    h('p', { className: 'micro-status-value' }, card.value),
                    h('p', { className: 'micro-status-note' }, card.note)
                  );
                })
              ),
              h('button', {
                type: 'button',
                className: 'micro-library-toggle',
                'aria-expanded': showFullMicroNav ? 'true' : 'false',
                onClick: function() { upd({ showMicroLibrary: !d.showMicroLibrary }); }
              }, showFullMicroNav ? __alloT('stem.microbiology.hide_topic_library', 'Hide topic library') : __alloT('stem.microbiology.show_topic_library', 'Show topic library'))
            )
          )
        ),
        tabBar,
        h('section', { role: 'region', 'aria-label': currentMicroTab.label, style: { flex: 1, overflow: 'auto', minWidth: 0 } }, body)
      );
    }
  });

  console.log('[StemLab] stem_tool_microbiology.js loaded - Microbiology Lab');
})();
