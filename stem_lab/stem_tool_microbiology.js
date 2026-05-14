/* eslint-disable */
// stem_tool_microbiology.js — Microbiology Lab
// NGSS MS-LS1, HS-LS1, HS-LS3, HS-LS4. The microbial world: bacteria,
// viruses, microscopy, antibiotic resistance evolution, the microbiome,
// immune system + vaccines, fermentation, classic case studies (Snow's
// cholera map, Fleming's penicillin, MRSA, COVID, fecal transplants).
(function() {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) {
    console.warn('[StemLab] stem_tool_microbiology.js loaded before StemLab registry — bailing');
    return;
  }

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
      where: 'Oceans, freshwater, soil, ice. Some 3.5 billion years old — among the first life on Earth.',
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
      sciFact: 'MRSA evolved primarily through horizontal gene transfer (acquiring resistance genes from other bacteria, not just vertical mutation). One reason resistance can spread fast.'
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
      sciFact: 'The first eukaryotic genome ever sequenced (1996). About 30% of its ~6,000 genes have direct human homologs — yeast is so similar to us that many discoveries in yeast translate to human cell biology. The 2001, 2009, 2013, and 2016 Nobel Prizes in Medicine all involved yeast research.'
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
      what: 'Usually harmless — kept in check by bacterial neighbors + immune system. Overgrowth (after antibiotics destroy bacterial competitors, or in immunocompromise) causes thrush (mouth), yeast infections (vaginal), invasive candidiasis (bloodstream, life-threatening).',
      sciFact: 'Candida can switch between a round yeast form and a filamentous "hyphal" form, depending on conditions. The hyphal form is more invasive — Candida can probe and invade tissues. The "yeast-to-hypha switch" is a key research target for antifungal drugs.'
    },
    {
      id: 'aspergillus', name: 'Aspergillus', kind: 'filamentous mold',
      role: 'varies',
      where: 'Soil, decaying organic matter, damp buildings, grain storage. Spores in the air everywhere.',
      what: 'A. niger is used industrially to make citric acid (in most soft drinks, candy). A. oryzae is the koji used to make soy sauce + miso + sake. A. fumigatus causes aspergillosis (a serious lung infection) in immunocompromised people. A. flavus produces aflatoxins, the most potent natural carcinogens known — contaminating peanuts + corn improperly stored.',
      sciFact: 'Citric acid in nearly every processed food is fermented by A. niger in giant industrial vats — about 2 million tons per year globally. The same group of fungi makes both your food and (in different conditions) one of the deadliest natural toxins.'
    },
    {
      id: 'mycorrhiza', name: 'Mycorrhizal fungi (Arbuscular, Ectomycorrhizal)', kind: 'soil-dwelling filamentous fungi',
      role: 'beneficial',
      where: 'Forming symbiotic networks with about 90% of land plant species. The "wood-wide web" of mycorrhizae extends through every healthy forest soil.',
      what: 'Plant roots and fungal mycelium grow together. The fungus brings up water + phosphorus + other minerals; the plant gives the fungus sugars. Without mycorrhizae, most plants would die. The relationship is at least 460 million years old — possibly the reason plants colonized land.',
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
  // DATA: Protists (single-celled eukaryotes — the diverse 4th kingdom)
  // ──────────────────────────────────────────────────────────────────
  var PROTISTS = [
    {
      id: 'plasmodium', name: 'Plasmodium (malaria)', kind: 'apicomplexan parasite',
      role: 'pathogenic',
      where: 'Spread by Anopheles mosquitoes in tropical + subtropical regions. About 240 million cases / 600,000 deaths per year, mostly children under 5 in sub-Saharan Africa.',
      what: 'Causes malaria. Has a complex two-host life cycle (mosquito + human), with different life stages in liver, blood, and mosquito gut. Five species infect humans; P. falciparum is the most lethal.',
      sciFact: 'Sickle cell trait (one copy of the sickle hemoglobin gene) protects against P. falciparum, which is why it persists at high frequency in populations from malaria-endemic regions. The 2015 Nobel Prize was awarded for artemisinin (Tu Youyou) and ivermectin (Campbell + Ōmura) — antiparasitic drugs that saved millions of lives.'
    },
    {
      id: 'amoeba', name: 'Amoeba proteus', kind: 'free-living amoeba',
      role: 'mostly-beneficial (and rare-pathogenic relatives)',
      where: 'Freshwater ponds, soil, decaying matter. Each cell moves by extending pseudopods ("false feet") — temporary blob-like extensions of cytoplasm.',
      what: 'A textbook microbiology specimen. Feeds by surrounding prey with its body and engulfing it (phagocytosis). The same mechanism your white blood cells use to eat bacteria — except the amoeba IS the whole organism.',
      sciFact: 'A close relative, Naegleria fowleri ("brain-eating amoeba"), lives in warm freshwater and can rarely enter the brain through the nose — almost always fatal. Different relatives include Entamoeba histolytica (amoebic dysentery) and Acanthamoeba (eye infection in contact-lens wearers).'
    },
    {
      id: 'paramecium', name: 'Paramecium', kind: 'ciliate',
      role: 'beneficial / educational',
      where: 'Pond water and slow streams worldwide. The "slipper-shaped" microbe that introductory biology students see under their first microscope.',
      what: 'Covered in thousands of tiny hair-like cilia that beat in coordinated waves, propelling it through water. Has TWO nuclei: a large macronucleus controlling everyday functions and a small micronucleus reserved for genetic exchange.',
      sciFact: 'Paramecia reproduce by binary fission for many generations, then engage in "conjugation" — two cells pair up and exchange genetic material from their micronuclei. Rejuvenates the line; without conjugation, paramecium clones age and die. A clue to why sexual reproduction evolved.'
    },
    {
      id: 'euglena', name: 'Euglena', kind: 'flagellate (mixotrophic)',
      role: 'beneficial / educational',
      where: 'Freshwater ponds, especially nutrient-rich ones. Sometimes blooms green.',
      what: 'Has chloroplasts (photosynthesizes in light) AND can eat organic matter (heterotrophic in the dark). One cell, two metabolisms. Swims with a long whip-like flagellum. Has a primitive "eyespot" that lets it move toward light.',
      sciFact: 'A famous category problem: is Euglena a plant (it photosynthesizes) or an animal (it moves + eats)? Modern taxonomy says neither — it\'s in its own group (Excavata, kingdom Protista). The category itself is a 19th-century artifact. Today we group by ancestry, not appearance.'
    },
    {
      id: 'diatom', name: 'Diatoms', kind: 'photosynthetic algae',
      role: 'beneficial (massively)',
      where: 'Oceans + freshwater worldwide. Especially abundant in cold + nutrient-rich waters like the Gulf of Maine.',
      what: 'Single-celled algae with rigid cell walls of silica (glass) — each species has a uniquely sculpted geometric shell. Photosynthesizes. Probably the most abundant photosynthesizers in the ocean.',
      sciFact: 'Diatoms produce roughly 20% of all oxygen on Earth — more than all the rainforests combined. When they die and sink, their silica shells accumulate; over millions of years they form diatomaceous earth (used in toothpaste, swimming pool filters, abrasives). They are also why the Gulf of Maine\'s spring phytoplankton bloom supports the entire food web up to whales.'
    },
    {
      id: 'giardia', name: 'Giardia lamblia (intestinalis)', kind: 'flagellated parasite',
      role: 'pathogenic',
      where: 'Contaminated water (streams, lakes, poorly treated water supplies). The most common parasitic intestinal infection in the US — and the reason hikers should treat backcountry water.',
      what: 'Causes giardiasis: prolonged greasy diarrhea, gas, fatigue, weight loss. Has a tear-drop shape with a "face" — two large nuclei and a sucker-disk that attaches to the intestinal wall. Resistant cysts survive in cold water for months.',
      sciFact: 'Giardia diverged very early in eukaryotic evolution — for a long time it was suspected to be a "missing link" between prokaryotes and eukaryotes. Detailed sequencing later showed it does have mitochondrial remnants (mitosomes); just very reduced. A reminder that "simple" can be a result of long evolution toward parasitism, not necessarily an ancient state.'
    }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Archaea
  // ──────────────────────────────────────────────────────────────────
  var ARCHAEA = [
    {
      id: 'methano', name: 'Methanogens', kind: 'methane-producing archaea',
      where: 'Cow rumens, termite guts, deep-sea sediments, wetlands, rice paddies, your own gut (about half of humans carry them).',
      what: 'Produce methane (CH₄) by combining CO₂ and hydrogen. Strict anaerobes — oxygen kills them. About 70% of atmospheric methane is biological in origin; methanogens make most of it.',
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
      where: 'Black smokers — deep-sea hydrothermal vents at the Atlantic Mid-Ocean Ridge.',
      what: 'Lives at temperatures up to 113°C — far above the boiling point of water at the surface (water doesn\'t boil at the deep-sea pressure). Was thought to set the upper temperature limit for life, until Strain 121 was discovered.',
      sciFact: 'Astrobiology takes extremophiles seriously. If life exists on Europa (Jupiter\'s ice moon with a subsurface ocean), it might live near similar hydrothermal vents. Mars\'s ancient warm wet conditions could have hosted thermophilic life that retreated underground as Mars cooled.'
    },
    {
      id: 'halobacterium', name: 'Halobacterium salinarum', kind: 'salt-loving archaean (halophile)',
      where: 'Salt flats, salt evaporation ponds, the Dead Sea (so salty it shows up pink from the carotenoid pigments). Lives at >15% salt — saltier than seawater.',
      what: 'Uses a light-driven proton pump (bacteriorhodopsin) for energy — a primitive form of photosynthesis that uses retinal (the same molecule in your eyes) instead of chlorophyll.',
      sciFact: 'Bacteriorhodopsin is the basis of "optogenetics" — using light to control neuron activity in research. Halobacterium proteins are being studied as bio-computers, light-driven solar cells, and astrobiology models for life on a different chemical foundation.'
    },
    {
      id: 'crenarcheota', name: 'Marine Crenarchaeota', kind: 'ocean-dwelling archaea',
      where: 'Throughout the ocean, especially below the surface zone. Recently discovered to be vastly more abundant than thought.',
      what: 'Oxidize ammonia to nitrite — a key step in the global nitrogen cycle. Were originally thought to be only in hot springs; we now know they make up about 20% of all microbial cells in the ocean.',
      sciFact: 'For 100 years biologists ignored archaea as a curiosity of extreme places. Then in 1992 Norman Pace started using DNA sequencing on ocean water and found archaea everywhere — making up trillions of cells in any given liter of seawater. They turn out to drive global biogeochemical cycles. Three domains of life, not two.'
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
      story: 'Identified in December 2019. Caused a global pandemic that killed at least 7 million people directly (likely far more counting excess mortality). mRNA vaccines developed in less than a year — the fastest vaccine in history.'
    },
    {
      id: 'flu', name: 'Influenza A', genome: 'segmented single-stranded RNA',
      structure: 'Enveloped, ~100 nm. Hemagglutinin (H) and Neuraminidase (N) surface proteins — hence H1N1, H3N2.',
      hosts: 'Humans, birds, pigs, horses, dogs, others. Cross-species jumps cause pandemics.',
      story: 'Mutates constantly (antigenic drift) requiring new vaccines each year. Occasional dramatic genome reshuffling between species (antigenic shift) causes pandemics — 1918, 1957, 1968, 2009.'
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
      story: 'Most abundant biological entity on Earth (estimated 10³¹ phages — a one with 31 zeros). "Phage therapy" using phages to treat antibiotic-resistant infections is being revived, especially in Eastern Europe and Georgia.'
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
    { id: 'ocean', name: 'Ocean', count: '~10 million per mL', species: '~unknown — millions+',
      what: 'About half of all Earth\'s photosynthesis happens here. Cycles carbon, nitrogen, sulfur globally. Marine viruses kill ~20% of marine microbes daily — recycling nutrients on a planetary scale.',
      shaped: 'Temperature, salinity, light, nutrient availability. Climate change is restructuring ocean microbiomes; we don\'t fully know the consequences yet.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Fermentation
  // ──────────────────────────────────────────────────────────────────
  var FERMENTS = [
    { id: 'sourdough', name: 'Sourdough bread', cultures: 'Wild yeasts + Lactobacillus',
      how: 'Flour + water mixed and left for a few days. The yeasts and bacteria already on the grain wake up and multiply. The bacteria make lactic + acetic acid (the sour); the yeast makes CO₂ (the rise).',
      story: 'Predates baker\'s yeast by ~5,000 years. Every bakery\'s starter is slightly different — some San Francisco starters have been kept alive continuously for over 150 years.' },
    { id: 'yogurt', name: 'Yogurt', cultures: 'Streptococcus thermophilus + Lactobacillus bulgaricus',
      how: 'Milk heated to about 110°F (43°C), the bacteria added (or a spoonful from the last batch), held warm for 4-12 hours. Bacteria turn milk sugar (lactose) into lactic acid; acid coagulates the milk proteins.',
      story: 'Probably invented by accident when nomadic peoples carried milk in animal-stomach containers — natural bacteria from the stomach acidified the milk into a preserved food. Every yogurt culture in human history descends from accidents like that.' },
    { id: 'kimchi', name: 'Kimchi', cultures: 'Leuconostoc + Lactobacillus + Weissella',
      how: 'Cabbage and vegetables salted to draw out water, then mixed with chili paste, garlic, ginger. Fermented at room temperature for a few days, then cold. Lactic acid fermentation.',
      story: 'A Korean tradition over 1,000 years old. Fermentation peaks around day 14-21 at refrigerator temperature, then slows. Good kimchi is a thousand-year-old microbiological experiment.' },
    { id: 'sauerkraut', name: 'Sauerkraut', cultures: 'Leuconostoc → Lactobacillus succession',
      how: 'Cabbage shredded and salted (about 2% salt by weight). The salt draws out water and inhibits unwanted microbes. Lactobacillus takes over. Fermented 2-4 weeks.',
      story: 'A succession of microbial communities — Leuconostoc dominates the first few days, then yields to more acid-tolerant Lactobacillus. The pH drops from 6 to about 3.5. Watching it ferment is watching ecology in real time.' },
    { id: 'kombucha', name: 'Kombucha', cultures: 'Acetobacter + Saccharomyces + others (SCOBY)',
      how: 'Sweet tea + a "SCOBY" (Symbiotic Culture Of Bacteria and Yeast) — a rubbery mat that floats on the surface. Yeast eats sugar → ethanol; bacteria eat ethanol → acetic acid. Held 7-14 days.',
      story: 'Origin probably in northeast China about 2,000 years ago. The SCOBY is itself a community ecology — a biofilm where multiple species depend on each other\'s metabolic byproducts.' },
    { id: 'cheese', name: 'Cheese', cultures: 'Varies by cheese (Lactobacillus, Penicillium roqueforti / camemberti, others)',
      how: 'Milk acidified by bacteria, then a coagulant (rennet) added to form curd. Curd drained, salted, aged. Different bacteria + molds during aging produce different cheeses.',
      story: 'Probably invented around 7,000 BCE in the Fertile Crescent. The blue veins in Roquefort? Penicillium roqueforti. The white rind on Camembert? Penicillium camemberti. Both are fungi, deliberately added.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // DATA: Case studies — public-health + biology turning points
  // ──────────────────────────────────────────────────────────────────
  var CASES = [
    {
      id: 'snow', name: 'John Snow & the Broad Street Pump', year: 1854, icon: '🗺️',
      what: 'In a cholera outbreak in London\'s Soho district, physician John Snow mapped every death. The deaths clustered around the Broad Street water pump. He persuaded local authorities to remove the pump handle. The outbreak ended.',
      why: 'Cholera was thought to be airborne ("miasma"). Snow\'s map proved water-borne transmission. The case is the founding moment of epidemiology AND of data visualization — the dot map is still studied in stats and design classes.',
      lesson: 'Patterns in data can reveal causes that prevailing theory misses. Public health requires both science AND the willingness to act on uncertain evidence.'
    },
    {
      id: 'penicillin', name: 'Fleming\'s Penicillin', year: 1928, icon: '🍄',
      what: 'Alexander Fleming returned from holiday to find a Petri dish of Staphylococcus contaminated with Penicillium mold. The bacteria around the mold had died. Fleming named the active substance "penicillin."',
      why: 'Florey + Chain at Oxford turned the discovery into a usable drug a decade later. Mass production began in 1942-44 in the US. By war\'s end, penicillin had saved hundreds of thousands of lives from bacterial infections.',
      lesson: 'Serendipity favors the prepared mind (Pasteur). Fleming noticed something most would have washed down the drain. But also: the gap between "discovery" and "drug for patients" is enormous — Fleming gets the credit, but Florey, Chain, Heatley, and many others did the work of making it real.'
    },
    {
      id: 'mrsa', name: 'MRSA — antibiotic resistance evolves', year: '1959-present', icon: '🦠',
      what: 'Methicillin introduced in 1959 to treat penicillin-resistant Staph aureus. The first methicillin-resistant strain appeared in 1960. By the 1990s, MRSA was widespread in hospitals; by the 2000s, in the community ("community-acquired MRSA").',
      why: 'Antibiotics select for resistance. Every time we use an antibiotic, we kill the susceptible bacteria and let the resistant survivors multiply. Overuse + misuse (incomplete courses, antibiotics in animal feed) accelerates resistance.',
      lesson: 'Evolution is not in the past. It is happening right now, in your bathroom, on hospital walls, in factory farms. We are losing antibiotics faster than we can develop new ones. The CDC calls antibiotic resistance one of the great public-health threats of our century.'
    },
    {
      id: 'covid', name: 'COVID-19 + mRNA vaccines', year: '2019-present', icon: '💉',
      what: 'SARS-CoV-2 emerged in late 2019. mRNA vaccines (Pfizer-BioNTech, Moderna) were authorized for emergency use within 12 months — the fastest vaccine development in history. The mRNA platform had been developed for decades by Katalin Karikó, Drew Weissman, and others.',
      why: 'mRNA vaccines deliver instructions for cells to make a viral protein themselves. The immune system learns to recognize it. The technology is modular — any new pathogen with a known protein sequence can have a vaccine designed in days.',
      lesson: 'Basic science is the foundation of crisis response. The mRNA technology that saved millions in 2020-2021 was 30 years of patient research that often looked like a dead end. The 2023 Nobel Prize went to Karikó and Weissman.'
    },
    {
      id: 'fmt', name: 'Fecal Microbiota Transplant (FMT)', year: '2013-present', icon: '🧪',
      what: 'For recurrent Clostridium difficile infections (deadly hospital-acquired diarrhea, often after antibiotic use destroys the gut microbiome), transplanting fecal microbes from a healthy donor cures the infection in over 90% of cases — better than any antibiotic.',
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
      limit: 'Sample must be in a vacuum (no live cells). Sample preparation is destructive. Very expensive. The pictures are gray (no color — electrons don\'t have wavelength visible to eyes).' },
    { id: 'afm', name: 'Atomic force microscope', range: '0.1 nm - 100 µm',
      what: 'A microscopic stylus drags over the sample surface, recording height. Like a tiny phonograph needle. Gets atomic-scale resolution on the surface of samples.',
      limit: 'Only sees surfaces, not interior structure. Slow to scan.' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // Quiz
  // ──────────────────────────────────────────────────────────────────
  var QUIZ_QUESTIONS = [
    { q: 'Why are viruses NOT classified as alive by most biologists?', choices: ['They\'re too small', 'They can\'t reproduce without hijacking a host cell\'s machinery', 'They\'re made of plastic', 'They don\'t have DNA'], answer: 1, explain: 'Viruses can\'t metabolize, can\'t reproduce on their own, and have no cellular structure. They\'re genetic material wrapped in protein, that turns into "alive" behavior only when inside a host cell. Some biologists argue they\'re a kind of life; others see them as biological chemistry. Either way, they\'re very different from cells.' },
    { q: 'How does antibiotic resistance evolve?', choices: ['Bacteria deliberately learn to fight antibiotics', 'Random mutations + antibiotic selection: the few resistant survivors multiply', 'It\'s genetic engineering in farms', 'Bacteria adapt during your treatment'], answer: 1, explain: 'Mutations are random. When antibiotic is present, susceptible bacteria die and resistant survivors live to reproduce. Selection — not learning, not intention — drives resistance. Antibiotic overuse (and use in animal feed) accelerates the process.' },
    { q: 'About how many microbial cells live in or on a healthy human body?', choices: ['About the same as human cells (~37 trillion each)', 'About 100 trillion microbial cells (~3 microbes per human cell)', 'About 1 billion microbial cells', 'Microbes are bad — a healthy body has none'], answer: 1, explain: 'Most healthy humans carry about 100 trillion microbial cells, with about 99% in the gut. The 1972 estimate of "10 microbes per human cell" was wrong; the 2016 revision is closer to 1.3 to 1, or roughly equal. Either way, you are as much microbial as human, by cell count.' },
    { q: 'What is the difference between a bacterium and a virus?', choices: ['Both are alive but viruses are smaller', 'Bacteria are cells with their own machinery; viruses are genetic material that needs a host cell to reproduce', 'They\'re the same thing', 'Bacteria are dead, viruses are alive'], answer: 1, explain: 'Bacteria are living cells. They have a cell membrane, DNA, ribosomes, and can grow and reproduce on their own (given food). Viruses are not cellular — they are DNA or RNA in a protein shell. To reproduce, they must enter a host cell and hijack the cell\'s machinery.' },
    { q: 'How does a vaccine work?', choices: ['Kills the pathogen if you\'ve already got it', 'Teaches the immune system to recognize a pathogen before you\'re infected', 'Disinfects your skin', 'Replaces antibodies you have lost'], answer: 1, explain: 'A vaccine exposes the immune system to a harmless version of part of the pathogen (an inactivated virus, a protein subunit, or — for mRNA vaccines — instructions to make a viral protein). The immune system makes memory cells that recognize the real pathogen if encountered. Vaccines prevent disease; they don\'t treat existing infection.' },
    { q: 'In sourdough bread, what causes the sour flavor AND the rise?', choices: ['Both are caused by yeast', 'Lactic acid bacteria make the sour; yeast makes the CO₂ that rises the bread', 'It\'s the salt', 'A chemical leavener like baking powder'], answer: 1, explain: 'Sourdough relies on two organisms working together: lactic acid bacteria (Lactobacillus) make the sour by fermenting sugars into lactic acid, and wild yeast makes CO₂ that lifts the dough. Commercial yeast bread skips the bacteria — it rises fast but doesn\'t develop the sour flavor or the same digestibility.' },
    { q: 'How did John Snow identify the cause of the 1854 London cholera outbreak?', choices: ['He examined victims under a microscope', 'He mapped the deaths and saw they clustered around a specific water pump', 'He ran a laboratory experiment', 'He surveyed survivors'], answer: 1, explain: 'Snow drew a dot map of every cholera death in the Soho district. The pattern showed deaths clustering around the Broad Street pump. He persuaded local officials to remove the pump handle and the outbreak ended. The work founded both modern epidemiology AND data visualization as a discipline.' },
    { q: 'Why did Fleming\'s 1928 penicillin discovery take 14+ years to become a usable drug?', choices: ['Patents took time', 'Mass production of pure penicillin required years of work by Florey, Chain, Heatley, and a whole team', 'Fleming did not publish', 'Penicillin was banned'], answer: 1, explain: 'Fleming\'s observation in 1928 was important but he could not produce or purify penicillin in any quantity. Howard Florey, Ernst Chain, Norman Heatley, and colleagues at Oxford figured out purification and mass production starting in 1939. US wartime industrial scale-up made it widely available by 1944. Most "discoveries" become real through the work of many.' },
    { q: 'About how big is a typical bacterium compared to a typical animal cell?', choices: ['Same size', 'Bacteria are about 10-100 times smaller', 'Bacteria are bigger', 'Bacteria are 1000 times smaller'], answer: 1, explain: 'Typical bacterium: ~1-5 micrometers (µm) long. Typical animal cell: ~10-30 µm. About 10x smaller, or 1000x less volume. Most bacteria are at the resolution limit of a good light microscope at 1000x.' },
    { q: 'What feeds your gut microbiome?', choices: ['Protein and meat', 'Refined sugar', 'Probiotic pills', 'Dietary fiber from plants'], answer: 3, explain: 'Most of your gut microbes ferment fiber that you cannot digest, producing short-chain fatty acids that nourish the colon lining. A diverse plant-rich diet feeds a diverse microbiome. Refined carbohydrates and sugar are absorbed in the small intestine — they don\'t reach the gut microbes. Probiotic pills are a tiny dose; food is the main intervention.' },
    { q: 'Why does fermented food (yogurt, sauerkraut, kimchi) NOT spoil quickly even at room temperature?', choices: ['Magic', 'Lactic acid bacteria lower the pH, inhibiting spoilage organisms', 'It was canned at high heat', 'Preservatives'], answer: 1, explain: 'Lactic acid fermentation drops the pH from ~6 to ~3.5. Most spoilage organisms cannot grow at that pH. The food is preserved without refrigeration — which is why fermentation predates refrigeration in every culture that has it.' },
    { q: 'Which microbes are descended from bacteria that were engulfed by larger cells about 1.5 billion years ago?', choices: ['All bacteria', 'Mitochondria and chloroplasts inside our cells (and plant cells)', 'Viruses', 'Archaea'], answer: 1, explain: 'Mitochondria (in all eukaryotic cells) and chloroplasts (in plant cells) were originally free-living bacteria. They were engulfed and became permanent residents inside larger cells — the endosymbiotic theory, proposed by Lynn Margulis. They still have their own DNA. You are, in a real sense, a community of organisms.' },
    { q: 'Genetically, which group are fungi closest to?', choices: ['Plants', 'Bacteria', 'Animals', 'Viruses'], answer: 2, explain: 'Despite looking more plant-like (rooted, can\'t move), fungi are evolutionary cousins of animals. We share a common ancestor about 1.1 billion years ago — more recent than the split with plants. Fungi have chitin cell walls (like insect exoskeletons), not cellulose. They cannot photosynthesize. They digest externally.' },
    { q: 'How many DOMAINS of cellular life do biologists recognize today?', choices: ['One', 'Two (prokaryotes and eukaryotes)', 'Three (Bacteria, Archaea, Eukarya)', 'Six (one per kingdom)'], answer: 2, explain: 'Carl Woese\'s 1977 ribosomal RNA work showed Archaea are as different from bacteria as bacteria are from us. The three-domain framework (Bacteria, Archaea, Eukarya) is the foundation of modern biology. Archaea were originally classified with bacteria because they look similar under the microscope, but they are biochemically distinct.' },
    { q: 'Why do antibiotics that target the bacterial cell wall (like penicillin) NOT work against viruses?', choices: ['The antibiotics are too big to fit in the virus', 'Viruses do not have cell walls — they have no equivalent target', 'Viruses move too fast', 'The dose has to be much higher'], answer: 1, explain: 'Viruses have no cell wall, no ribosomes, no DNA replication machinery of their own — they hijack the host\'s. They have NO equivalent target for any antibiotic. This is why prescribing antibiotics "just in case" for a viral cold or flu is useless (and accelerates resistance for the bacteria that ARE in your body).' }
  ];

  // ──────────────────────────────────────────────────────────────────
  // Plugin registration
  // ──────────────────────────────────────────────────────────────────
  window.StemLab.registerTool('microbiology', {
    icon: '🦠',
    label: 'Microbiology Lab',
    desc: 'NGSS MS-LS1 + HS-LS1 + HS-LS3 + HS-LS4. The microbial world: bacteria (beneficial + pathogenic), viruses (incl. COVID, flu, HIV, phages, measles), microscopy (light + phase + fluorescent + EM + AFM), antibiotic resistance evolution, the human + soil + ocean microbiome, immune system + vaccines, fermentation (sourdough, yogurt, kimchi, sauerkraut, kombucha, cheese), classic case studies (Snow\'s cholera map, Fleming\'s penicillin, MRSA, COVID/mRNA, FMT), AP-style quiz, printable lab safety + key microbes card.',
    color: 'emerald',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;

      if (!labToolData || !labToolData.microbiology) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { microbiology: {
            tab: 'home',
            selectedBacterium: 'ecoli',
            selectedVirus: 'covid',
            selectedScope: 'lightbright',
            selectedMicrobiome: 'gut',
            selectedFerment: 'sourdough',
            selectedCase: 'snow',
            magnification: 100,
            quizIdx: 0, quizAnswers: [], quizSubmitted: false, quizCorrect: 0
          }});
        });
        return h('div', { style: { padding: 24, color: '#94a3b8', textAlign: 'center' } }, '🦠 Initializing Microbiology Lab...');
      }
      var d = labToolData.microbiology;

      function upd(patch) {
        setLabToolData(function(prev) {
          var s = Object.assign({}, (prev && prev.microbiology) || {}, patch);
          return Object.assign({}, prev, { microbiology: s });
        });
      }

      var EMERALD = '#10b981', EMERALD_DARK = '#064e3b';
      var BG = '#0f172a';

      var TABS = [
        { id: 'home',       icon: '🦠', label: 'Home' },
        { id: 'bacteria',   icon: '🧫', label: 'Bacteria' },
        { id: 'viruses',    icon: '🧬', label: 'Viruses' },
        { id: 'fungi',      icon: '🍄', label: 'Fungi' },
        { id: 'protists',   icon: '🦠', label: 'Protists' },
        { id: 'archaea',    icon: '♨️', label: 'Archaea' },
        { id: 'microscope', icon: '🔬', label: 'Microscope' },
        { id: 'resistance', icon: '⚠️', label: 'Resistance' },
        { id: 'microbiome', icon: '🌱', label: 'Microbiome' },
        { id: 'plantmicro', icon: '🌿', label: 'Plant Microbes' },
        { id: 'biofilms',   icon: '🟢', label: 'Biofilms' },
        { id: 'biotech',    icon: '🏭', label: 'Biotech' },
        { id: 'immune',     icon: '🛡️', label: 'Vaccines' },
        { id: 'ferment',    icon: '🥖', label: 'Fermentation' },
        { id: 'cases',      icon: '📚', label: 'Case Studies' },
        { id: 'quiz',       icon: '📝', label: 'Quiz' },
        { id: 'print',      icon: '🖨', label: 'Print' }
      ];

      var tabBar = h('div', {
        role: 'tablist', 'aria-label': 'Microbiology sections',
        style: { display: 'flex', gap: 4, padding: '10px 12px', borderBottom: '1px solid #1e293b', overflowX: 'auto', flexShrink: 0, background: '#0a0e1a' }
      },
        TABS.map(function(t) {
          var active = d.tab === t.id;
          return h('button', { key: t.id, role: 'tab', 'aria-selected': active, 'aria-label': t.label,
            onClick: function() { upd({ tab: t.id }); },
            style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: active ? 'rgba(16,185,129,0.25)' : 'transparent', color: active ? '#6ee7b7' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' }
          }, t.icon + ' ' + t.label);
        })
      );

      function sectionCard(title, children, accent) {
        accent = accent || EMERALD;
        return h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + accent, marginBottom: 12 } },
          title ? h('div', { style: { fontSize: 14, fontWeight: 800, color: '#e2e8f0', marginBottom: 8 } }, title) : null,
          children
        );
      }

      // HOME
      function renderHome() {
        return h('div', { style: { padding: 16 } },
          sectionCard('🦠 The microbial world is the dominant life on Earth',
            h('div', null,
              h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'About 99% of all the cells on Earth are microbial. Bacteria, archaea, single-celled eukaryotes (protists), and fungi. They drive most of the planet\'s chemistry: carbon, nitrogen, sulfur, oxygen all cycle through microbial metabolism. Plants and animals exist within a microbial world, not the other way around.'
              ),
              h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'You are about as much microbial as human, by cell count. Your gut microbiome is its own organ, doing things your own cells cannot. Your immune system is trained by microbes from birth. Most of the time, the relationship is mutual — they get a home, you get vitamins, digestion, protection. Occasionally one becomes pathogenic.'
              )
            )
          ),
          sectionCard('The three domains of cellular life + viruses',
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 } },
              [
                { name: 'Bacteria', desc: 'Single cells without a nucleus. The most common form of life. ~1 trillion species (most uncharacterized).', accent: EMERALD },
                { name: 'Archaea', desc: 'Single cells without a nucleus, but as different from bacteria as bacteria are from us. The third domain of life, only fully recognized since 1977.', accent: '#ef4444' },
                { name: 'Eukaryotes (incl. fungi + protists)', desc: 'Cells WITH a nucleus + organelles (mitochondria, chloroplasts). Includes single-celled fungi (yeast), filamentous fungi (mold), protists (amoeba, Plasmodium), and all plants + animals.', accent: '#a855f7' },
                { name: 'Viruses (not cellular)', desc: 'Genetic material in a protein shell. Cannot reproduce without a host cell. Most biologists do not classify them as alive — but they certainly behave like life when inside cells.', accent: '#0ea5e9' }
              ].map(function(g, i) {
                return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + g.accent } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e2e8f0', marginBottom: 4 } }, g.name),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55 } }, g.desc)
                );
              })
            )
          ),
          sectionCard('Where microbes live',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.85 } },
              h('li', null, h('strong', null, 'Inside you. '), 'Gut, mouth, skin, every surface that meets the outside world. ~100 trillion cells.'),
              h('li', null, h('strong', null, 'In soil. '), '~50 billion cells per gram. The most diverse community on Earth.'),
              h('li', null, h('strong', null, 'In the ocean. '), '~10 million per mL. Half of all photosynthesis happens here.'),
              h('li', null, h('strong', null, 'In extreme places. '), 'Deep-sea vents at 113°C. Antarctic ice. Acidic lakes. The deep crust kilometers below ground. Life finds a way.'),
              h('li', null, h('strong', null, 'Inside other organisms. '), 'Every plant and animal carries microbes. Termites can\'t digest wood without their gut bacteria. Cows can\'t digest grass. Plants depend on root microbes for nitrogen.')
            )
          ),
          sectionCard('Why understanding microbes matters',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              'Antibiotic resistance is killing more people every year and rising. New viruses cross from animals into humans (COVID, HIV, Ebola). The microbiome is being reshaped by industrial agriculture, antibiotics, and processed food, with health consequences we are only beginning to understand. Microbial literacy is now a public health competency, not a specialist topic.'
            )
          ),

          sectionCard('🌍 The origins of life — 4.6 billion years in 12 steps',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'For most of Earth\'s history, microbes were the ONLY life. Plants and animals are a relatively recent addition. Understanding microbial evolution is understanding the deep history of life on this planet.'
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                [
                  { age: '4.6 Gya', name: 'Earth forms', desc: 'From the disk around the young Sun. Molten surface; no atmosphere except primordial gases.', color: '#ef4444' },
                  { age: '4.5 Gya', name: 'Moon-forming impact', desc: 'A Mars-sized body strikes the proto-Earth. Debris coalesces into the Moon. Stabilizes Earth\'s rotation axis, which becomes important for climate stability later.', color: '#94a3b8' },
                  { age: '4.4 Gya', name: 'First oceans condense', desc: 'Surface cools enough for water vapor to liquefy. Continuous oceans by ~4.3 Gya. Atmosphere has no free oxygen.', color: '#0ea5e9' },
                  { age: '4.0 Gya', name: 'Late Heavy Bombardment ends', desc: 'A long episode of intense asteroid impacts ends around now. Surface conditions stabilize enough that life can persist if it formed.', color: '#94a3b8' },
                  { age: '4.0-3.5 Gya', name: 'Origin of life', desc: 'Somewhere here. We don\'t know exactly where (hydrothermal vents? warm tide pools? clay surfaces?) or exactly how. The RNA world hypothesis: RNA, which can both store information AND catalyze reactions, came before DNA + protein. Self-replicating RNA molecules → enclosed in lipid vesicles → first cells.', color: '#a855f7' },
                  { age: '3.5 Gya', name: 'LUCA — Last Universal Common Ancestor', desc: 'A single-celled organism that is the ancestor of every living thing on Earth. We have its inferred genome (from comparing all life): it had a membrane, DNA, ribosomes, ATP, the genetic code. All life since is descended from this one cell.', color: '#fbbf24' },
                  { age: '3.5 Gya', name: 'First confirmed microbial fossils', desc: 'Stromatolites — layered structures built by mats of cyanobacteria-like microbes. Modern stromatolites still grow at Shark Bay, Australia. They are essentially unchanged in 3.5 billion years.', color: '#10b981' },
                  { age: '2.5-2.4 Gya', name: 'Great Oxygenation Event (GOE)', desc: 'Cyanobacteria have been producing O₂ as a byproduct of photosynthesis for several hundred million years. Once iron in the oceans is fully oxidized, free O₂ accumulates in the atmosphere. Disaster for most existing life (oxygen is toxic to anaerobes); enables more energy-dense aerobic metabolism for the survivors.', color: '#06b6d4' },
                  { age: '2.1 Gya', name: 'First eukaryotes', desc: 'A larger archaeal cell engulfs a free-living aerobic bacterium that becomes the mitochondrion (endosymbiosis, Lynn Margulis). The combination is the first eukaryote. Much later (~1.5 Gya), a similar event with a cyanobacterium produces the first plant cell with a chloroplast.', color: '#7c3aed' },
                  { age: '1.5-1.0 Gya', name: 'First multicellular life', desc: 'Multiple lineages evolve multicellularity independently — fungi, plants, animals all separately. Cells in a colony with division of labor. The transition is biologically subtle but evolutionarily enormous.', color: '#22c55e' },
                  { age: '540 Mya', name: 'Cambrian explosion', desc: 'Suddenly, most major animal body plans appear in the fossil record within ~25 million years. The explanation is contested (genuine evolutionary rapid radiation? earlier soft-bodied ancestors that didn\'t fossilize? oxygen reaching critical levels?). Either way, the era of large multicellular animals begins.', color: '#f59e0b' },
                  { age: '~300 kya', name: 'Homo sapiens', desc: 'Our species appears in Africa about 300,000 years ago. We are recent newcomers; microbes have been here for ~14,000× longer.', color: '#a78bfa' }
                ].map(function(e, i) {
                  return h('div', { key: i, style: { display: 'grid', gridTemplateColumns: '90px 1fr', gap: 12, padding: 8, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + e.color } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: e.color, paddingTop: 2 } }, e.age),
                    h('div', null,
                      h('div', { style: { fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 } }, e.name),
                      h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55 } }, e.desc)
                    )
                  );
                })
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, 'A perspective trick: '),
                'compress all 4.6 billion years of Earth history into one calendar year. January 1 = Earth forms. February = oceans. March-April = first life. October = first eukaryotes. November = multicellular. December 14 = Cambrian explosion. December 26 = dinosaurs. December 31, 11:58 pm = first humans. The entire history of recorded civilization fits in the last 13 seconds of that cosmic year.'
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, 'The RNA world hypothesis: '),
                'how do you get a self-replicating cell from chemistry? The current best guess: RNA can both store information (like DNA) AND catalyze chemical reactions (like enzymes). RNA molecules that happen to catalyze their own copying are selected for; over millions of years, increasingly elaborate RNA chemistry could have evolved before DNA and proteins took over. The 1989 Nobel Prize (Cech + Altman) was for proving RNA can act as an enzyme — direct lab evidence for the RNA-world idea.'
              )
            ),
            '#a855f7'
          ),

          sectionCard('🌲 Microbes in Maine',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 } },
                'Place-based microbiology. The microbes here in Maine are particular: shaped by the Gulf of Maine, the boreal-northern temperate forests, the lakes and peatlands, and the climate. Several are clinically important; several are economically critical; one is reshaping the lobster industry.'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                [
                  { name: 'Borrelia burgdorferi (Lyme disease)', kind: 'Tick-borne bacterium', color: '#ef4444',
                    desc: 'The spirochete bacterium carried by deer ticks (Ixodes scapularis). Maine has among the highest Lyme rates per capita in the US — over 1,400 confirmed cases / 100,000 in some years. The pathogen has expanded northward with warming winters; ticks no longer die back hard in Maine winters. Early-stage Lyme (with the bullseye rash) responds well to doxycycline. Late-stage Lyme is harder to treat.',
                    prevention: 'Long pants tucked into socks. Permethrin-treated clothing. Daily tick checks. Cool-shower-and-tumble-dryer-the-clothes-on-high after time in the woods. Removing a tick within 24-36 hours of attachment usually prevents transmission.' },
                  { name: 'Vibrio parahaemolyticus + V. vulnificus', kind: 'Marine bacteria', color: '#0ea5e9',
                    desc: 'Naturally present in seawater + shellfish, especially in warmer months. Maine\'s Vibrio cases have grown along with the warming Gulf of Maine (which is warming faster than 99% of the world ocean). Causes severe gastroenteritis or, in immunocompromised people, life-threatening sepsis. The same warming that\'s reshaping Maine\'s coast is making Vibrio more common locally.',
                    prevention: 'Maine raw oysters are extensively tested + cold-chained. Restaurants follow strict refrigeration protocols. Immunocompromised people should avoid raw shellfish.' },
                  { name: 'Eastern Equine Encephalitis virus (EEE)', kind: 'Mosquito-borne virus', color: '#a855f7',
                    desc: 'Rare but among the deadliest mosquito-borne viruses in the US: ~30% mortality in human cases, plus permanent neurological damage in survivors. Maintained in a swamp cycle (mosquitoes + songbirds) in freshwater wetlands. Bridge-vector mosquitoes occasionally transmit to humans, deer, horses. Maine has had occasional cases. Most years zero; some years a handful.',
                    prevention: 'Mosquito repellent (DEET, picaridin). Long sleeves at dusk + dawn in late summer. Removing standing water. Maine Public Health monitors mosquito populations + warns of high-risk periods.' },
                  { name: 'Epizootic Shell Disease (American Lobster)', kind: 'Polymicrobial', color: '#f59e0b',
                    desc: 'A complex disease where multiple bacteria erode lobster shells. Prevalent in Long Island Sound and southern New England; spreading into Gulf of Maine waters with warming. Some Maine areas now seeing 5-10% of lobsters with shell disease, up from near-zero a decade ago. Affects lobsters\' ability to molt, makes them unmarketable. Climate stress = immune weakening + faster bacterial growth = more disease.',
                    prevention: 'Larger picture: cooling waters again. Local picture: research on resistant lobster populations + early-warning surveillance.' },
                  { name: 'Sphagnum bog microbiome', kind: 'Acid-loving + nitrogen-fixing', color: '#10b981',
                    desc: 'Maine\'s peat bogs (Caribou Bog, Big Heath, etc.) host a unique acid-tolerant community: Sphagnum moss + associated fungi + nitrogen-fixing cyanobacteria + bacterial communities that survive at pH 3-4. The bogs store enormous amounts of carbon — undisturbed peat is one of the world\'s most efficient carbon sinks per acre. Climate-relevant.',
                    prevention: '(not a pathogen — these are protected ecosystems. Maine has dozens of preserved peatland sites studied for climate research.)' },
                  { name: 'Saccharomyces (Maine cider + beer)', kind: 'Beneficial yeasts', color: '#22c55e',
                    desc: 'Maine\'s apple-growing tradition produces a robust cider industry; Maine breweries are among the highest density per capita in the US. Local yeasts adapted to Maine apples are still being domesticated by Maine fermentation labs. Each cidery + brewery cultivates particular yeast strains that survive cool Maine fermentation temperatures.',
                    prevention: '(not a pathogen — economically important.)' }
                ].map(function(m, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + m.color } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8, flexWrap: 'wrap' } },
                      h('div', { style: { fontSize: 12.5, fontWeight: 800, color: m.color } }, m.name),
                      h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 } }, m.kind)
                    ),
                    h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55, marginBottom: 6 } }, m.desc),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', fontStyle: 'italic', lineHeight: 1.5 } }, h('strong', null, 'Prevention / context: '), m.prevention)
                  );
                })
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11.5, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, 'Climate and Maine microbes: '),
                'The Gulf of Maine is warming faster than 99% of the world ocean. This is reshaping bacterial communities in shellfish, the geographic range of tick-borne pathogens, the timing of mosquito-borne disease seasons, and the disease ecology of the lobster fishery. Public health and ecological microbiology are converging in Maine in real time.'
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

        // SVG of bacterial cell wall — one for Gram-positive, one for Gram-negative
        function gramSvg(kind) {
          var isPos = kind === 'positive';
          var dyeColor = isPos ? '#7c3aed' : '#ec4899';
          var label = isPos ? 'Gram-positive' : 'Gram-negative';
          return h('svg', { viewBox: '0 0 240 200', width: '100%', height: 200, role: 'img', 'aria-labelledby': 'g' + kind + 'Title g' + kind + 'Desc' },
            h('title', { id: 'g' + kind + 'Title' }, label + ' bacterial cell wall'),
            h('desc', { id: 'g' + kind + 'Desc' }, isPos ? 'A Gram-positive cell wall: thick layer (about 20-80 nanometers) of peptidoglycan outside a single plasma membrane. Stains purple with crystal violet.' : 'A Gram-negative cell wall: thin peptidoglycan layer (about 5-10 nm) sandwiched between two membranes, with the outer membrane containing lipopolysaccharide (LPS, also called endotoxin). Stains pink after counterstain.'),
            // Background — cytoplasm
            h('rect', { x: 0, y: 0, width: 240, height: 200, fill: '#1e293b' }),
            // Cytoplasm label
            h('text', { x: 30, y: 30, fill: '#94a3b8', fontSize: 10, fontStyle: 'italic' }, 'Cytoplasm'),
            // Plasma membrane (inner phospholipid bilayer)
            h('rect', { x: 0, y: 80, width: 240, height: 16, fill: '#fde68a', opacity: 0.85 }),
            h('text', { x: 120, y: 92, textAnchor: 'middle', fill: '#92400e', fontSize: 9, fontWeight: 700 }, 'Plasma membrane'),
            // Peptidoglycan layer — thick for positive, thin for negative
            isPos
              ? h('g', null,
                  // Big thick wall
                  h('rect', { x: 0, y: 30, width: 240, height: 50, fill: dyeColor, opacity: 0.45 }),
                  // Cross-link patterns
                  [0, 1, 2, 3, 4, 5].map(function(i) {
                    return h('line', { key: 'cl' + i, x1: 20 + i * 40, y1: 35, x2: 20 + i * 40, y2: 76, stroke: '#fff', strokeWidth: 1, opacity: 0.4 });
                  }),
                  h('text', { x: 120, y: 60, textAnchor: 'middle', fill: '#fff', fontSize: 11, fontWeight: 800 }, 'Peptidoglycan (thick: 20-80 nm)')
                )
              : h('g', null,
                  // Thin peptidoglycan layer in middle of two membranes
                  h('rect', { x: 0, y: 55, width: 240, height: 8, fill: dyeColor, opacity: 0.55 }),
                  h('text', { x: 120, y: 50, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 9 }, 'Peptidoglycan (thin: 5-10 nm)'),
                  // Outer membrane (lipid bilayer with LPS)
                  h('rect', { x: 0, y: 18, width: 240, height: 30, fill: '#fbbf24', opacity: 0.6 }),
                  // LPS spikes from outer membrane
                  [10, 30, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230].map(function(x, i) {
                    return h('g', { key: 'lps' + i },
                      h('line', { x1: x, y1: 18, x2: x, y2: 5, stroke: '#fbbf24', strokeWidth: 1 }),
                      h('circle', { cx: x, cy: 4, r: 2, fill: dyeColor, opacity: 0.9 })
                    );
                  }),
                  h('text', { x: 120, y: 36, textAnchor: 'middle', fill: '#92400e', fontSize: 9, fontWeight: 700 }, 'Outer membrane + LPS')
                ),
            // Outside / environment
            h('text', { x: 120, y: 115, textAnchor: 'middle', fill: '#94a3b8', fontSize: 10, fontStyle: 'italic' }, 'Periplasm / environment outside →'),
            // Label
            h('rect', { x: 0, y: 175, width: 240, height: 25, fill: dyeColor, opacity: 0.4 }),
            h('text', { x: 120, y: 192, textAnchor: 'middle', fill: '#fff', fontSize: 13, fontWeight: 800 }, label + ' (stains ' + (isPos ? 'purple' : 'pink') + ')')
          );
        }

        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Bacteria are single-celled organisms without a nucleus. There are roughly a trillion species; we have characterized only a few thousand. They come in shapes (cocci=spheres, bacilli=rods, spirilla=spirals), with cell wall types (gram-positive thick / gram-negative thin), and metabolic strategies (aerobic, anaerobic, fermenters, chemoautotrophs).'
          ),

          // CRISPR — bacterial immunity that became gene editing
          sectionCard('✂️ CRISPR — bacterial immunity that rewrote biology',
            (function() {
              var step = d.crisprStep || 'overview';
              var STEPS = [
                { id: 'overview', name: 'What it is' },
                { id: 'immunity', name: 'Bacterial immunity' },
                { id: 'mechanism', name: 'How Cas9 cuts' },
                { id: 'tool', name: 'Adapted as a tool' },
                { id: 'ethics', name: 'Ethics + frontier' }
              ];
              var content = {
                overview: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                    'CRISPR (Clustered Regularly Interspaced Short Palindromic Repeats) is a bacterial immune system that scientists noticed in the 1990s, partially understood by 2007, and adapted as a programmable gene editor in 2012. It is the biggest revolution in molecular biology since PCR.'
                  ),
                  h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                    h('strong', { style: { color: '#6ee7b7' } }, 'The 2020 Nobel Prize in Chemistry '),
                    'went to Jennifer Doudna (UC Berkeley) and Emmanuelle Charpentier (Max Planck Institute) for showing that CRISPR-Cas9 could be programmed to cut any DNA sequence. The first all-female Nobel science laureate pair. Their 2012 paper is one of the most-cited biology papers of all time.'
                  )
                ),
                immunity: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                    'Bacteria have always been under attack from bacteriophages (viruses that infect bacteria) — there are about 10× as many phages as bacteria in any given habitat. CRISPR is a bacterial immune system that REMEMBERS past phage attacks and protects against future ones.'
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, 'The bacterial CRISPR-Cas system in 3 stages:'),
                    h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.75 } },
                      h('li', null, h('strong', null, 'Acquisition (the memory): '), 'When a phage injects DNA, Cas proteins clip a small piece of the invader\'s DNA and integrate it into the bacterium\'s own genome at a special locus called the CRISPR array. Each piece is a "spacer." The bacterium now carries a record of the attack.'),
                      h('li', null, h('strong', null, 'Expression (the surveillance): '), 'The CRISPR array gets transcribed into RNA, then processed into short "guide RNAs" (crRNAs). Each crRNA matches one past invader. The crRNAs combine with Cas proteins to make patrol complexes scanning every DNA molecule in the cell.'),
                      h('li', null, h('strong', null, 'Interference (the kill): '), 'If a guide RNA finds a matching sequence in invading DNA, the Cas protein cuts the DNA. The phage is destroyed before it can replicate. The bacterium survives the second attack.')
                    )
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                    h('strong', null, 'Why this is remarkable: '),
                    'Bacteria are SUPPOSED to have only "innate" immunity — fast, general, no memory. CRISPR is true ADAPTIVE immunity (specific, with memory) in a single-celled organism. It is the oldest adaptive immune system on Earth, evolving in microbes about 2.6 billion years before T cells + B cells did in vertebrates.'
                  )
                ),
                mechanism: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                    'Cas9 (CRISPR-associated protein 9) is the most famous bacterial CRISPR enzyme. It is a molecular machine that, when loaded with the right guide RNA, can find and cut any matching DNA sequence in the cell.'
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, 'How Cas9 works (4 steps):'),
                    h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.75 } },
                      h('li', null, h('strong', null, 'Loading: '), 'Cas9 binds a guide RNA. The guide RNA has a ~20-nucleotide section matching the target sequence.'),
                      h('li', null, h('strong', null, 'Scanning: '), 'The Cas9 + gRNA complex scans DNA. It first looks for a short PAM sequence (typically "NGG") next to a potential target.'),
                      h('li', null, h('strong', null, 'Pairing: '), 'When it finds a PAM, it tries to base-pair the guide RNA with the adjacent DNA. If 20 bases match (or close to it), Cas9 commits.'),
                      h('li', null, h('strong', null, 'Cutting: '), 'Cas9 makes a double-strand break ~3 nucleotides upstream of the PAM. The cell then tries to repair the break — either error-prone (knockout) or template-guided (precise edit). This is the molecular handle gene editing uses.')
                    )
                  )
                ),
                tool: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                    'Doudna + Charpentier showed in 2012 that you can swap the guide RNA for any sequence you want — turning a bacterial defense into a programmable gene editor. Order a synthetic guide RNA, mix with Cas9, deliver to cells. Cas9 will cut at your chosen location in the genome.'
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 } },
                    [
                      { name: 'Medicine', desc: 'First CRISPR therapy approved Dec 2023: Casgevy for sickle cell disease + beta-thalassemia. Edits bone-marrow cells to reactivate fetal hemoglobin. ~$2.2 million per patient. Many more in trials: muscular dystrophy, cancer immunotherapies (CAR-T), genetic blindness.' },
                      { name: 'Agriculture', desc: 'CRISPR-edited mushrooms that don\'t brown. Disease-resistant rice. Hornless dairy cattle. Drought-tolerant maize. Considered "non-GMO" in some jurisdictions because no foreign DNA is added — just precise edits to native DNA.' },
                      { name: 'Diagnostics', desc: 'SHERLOCK + DETECTR: CRISPR-based diagnostic tests that detect specific DNA or RNA sequences from pathogens within an hour. Used for COVID, Zika, dengue, Lassa. Pocket-sized + low-cost.' },
                      { name: 'Basic research', desc: 'Knocking out a gene used to take a graduate student\'s entire PhD. With CRISPR it takes a week. Functional studies of every gene in the human genome are now feasible. Most biology labs in the world use CRISPR daily.' }
                    ].map(function(a, i) {
                      return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + EMERALD } },
                        h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#6ee7b7', marginBottom: 4 } }, a.name),
                        h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55 } }, a.desc)
                      );
                    })
                  )
                ),
                ethics: h('div', null,
                  h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                    'CRISPR makes things easy that used to be hard. That includes things we may not want to do.'
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.35)', borderLeft: '3px solid #ef4444', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#fca5a5', marginBottom: 6 } }, 'He Jiankui (2018): the first edited human babies'),
                    h('p', { style: { margin: 0, fontSize: 12, color: '#fee2e2', lineHeight: 1.65 } },
                      'A Chinese researcher used CRISPR to edit twin embryos (knocking out the CCR5 gene to try to confer HIV resistance) and bring them to term in 2018. The international scientific community condemned the work as deeply unethical: no medical need, no informed consent that could meet the bar, no way to ensure no off-target edits, no plan for the lifetime of the twins. He was sentenced to 3 years in prison. The case prompted broad agreement that germline editing (changes that pass to future generations) is not currently ethically defensible.'
                    )
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', borderLeft: '3px solid #f59e0b', marginBottom: 10 } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#fbbf24', marginBottom: 6 } }, 'Somatic vs germline editing'),
                    h('p', { style: { margin: 0, fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                      'SOMATIC editing changes DNA in body cells of a living person. The edits affect that person only; not their children. (Casgevy for sickle cell is somatic.) GERMLINE editing changes DNA in sperm, eggs, or embryos. The edits pass to every cell of the resulting person AND to their descendants. The scientific consensus is: somatic editing is ethically OK for treating disease; germline editing is not currently OK because we cannot anticipate the consequences across generations.'
                    )
                  ),
                  h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.35)', borderLeft: '3px solid #a855f7' } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#d8b4fe', marginBottom: 6 } }, 'Gene drives'),
                    h('p', { style: { margin: 0, fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                      'CRISPR-based gene drives can spread a gene through a wild population in a few generations, even if the gene reduces fitness. Proposed uses: eradicate malaria-carrying mosquitoes; eliminate invasive species. Risk: once released, hard or impossible to undo. International conversations are ongoing about whether + how to ever deploy a gene drive in the wild.'
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
                content[step]
              );
            })(),
            EMERALD
          ),

          // Gram stain visualizer
          sectionCard('🟣 Gram stain — the foundational microbiology test',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Developed by Hans Christian Gram in 1884. Still the first test run on most clinical bacterial samples — within hours of a culture growing. Splits bacteria into two groups by their cell-wall structure. The choice of antibiotic depends partly on whether the bacterium is Gram-positive or Gram-negative.'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 } },
                gramSvg('positive'),
                gramSvg('negative')
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 6 } }, 'The 4-step procedure (~3 minutes):'),
                h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.7 } },
                  h('li', null, h('strong', null, 'Crystal violet '), '(purple primary stain) — soaks all bacteria, all turn purple.'),
                  h('li', null, h('strong', null, 'Iodine '), '(mordant) — locks crystal violet onto the cell.'),
                  h('li', null, h('strong', null, 'Alcohol or acetone '), '(decolorizer, ~3 seconds) — the critical step. Gram-positive cells with thick peptidoglycan TRAP the dye. Gram-negative cells with thin peptidoglycan + outer membrane RELEASE the dye and become colorless.'),
                  h('li', null, h('strong', null, 'Safranin '), '(pink counterstain) — recolors the now-colorless Gram-negative cells pink. Gram-positives stay purple.')
                )
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(124,58,237,0.10)', borderLeft: '3px solid #7c3aed' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#c4b5fd', marginBottom: 4 } }, 'Gram-positive examples'),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } }, 'Staphylococcus aureus (incl. MRSA), Streptococcus pneumoniae, Streptococcus pyogenes (strep throat), Bacillus anthracis (anthrax), Clostridium difficile, C. tetani, C. botulinum, Listeria, Enterococcus.'),
                  h('div', { style: { fontSize: 11, color: '#a78bfa', marginTop: 6, fontStyle: 'italic' } }, 'Generally susceptible to: penicillin, vancomycin (last-line), cephalosporins.')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(236,72,153,0.10)', borderLeft: '3px solid #ec4899' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbcfe8', marginBottom: 4 } }, 'Gram-negative examples'),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.6 } }, 'E. coli, Salmonella, Klebsiella, Pseudomonas aeruginosa, Vibrio (cholera + Maine shellfish Vibrios), Helicobacter pylori (ulcers), Neisseria gonorrhoeae + meningitidis, Haemophilus influenzae.'),
                  h('div', { style: { fontSize: 11, color: '#ec4899', marginTop: 6, fontStyle: 'italic' } }, 'Generally tougher to treat — outer membrane blocks many antibiotics. Often need fluoroquinolones, aminoglycosides, or specific β-lactams that penetrate the outer membrane.')
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.6 } },
                h('strong', null, 'Why this matters clinically: '),
                'A sample of urine, blood, sputum, or CSF can be Gram-stained in 3 minutes. The result alone narrows the field of suspected pathogens dramatically. Empirical antibiotic therapy (started before full identification) is chosen partly based on the Gram result. Endotoxin (the LPS on Gram-negative cells) is a major driver of septic shock — a Gram-negative bloodstream infection is medically more dangerous in some ways than a Gram-positive one.'
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #475569', fontSize: 11, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' } },
                h('strong', null, 'A few exceptions: '),
                'Mycobacterium tuberculosis (TB) has a waxy mycolic-acid cell wall that resists Gram staining; it requires acid-fast staining (Ziehl-Neelsen). Mycoplasma have NO cell wall at all and stain neither way. Some bacteria are "Gram-variable" — they stain inconsistently because their cell walls are atypical.'
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
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, b.name),
                h('div', { style: { fontSize: 10, color: roleColor[b.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, roleLabel[b.role] || b.role)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + (roleColor[selected.role] || EMERALD) } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } }, 'Shape: ' + selected.shape + ' · ', h('span', { style: { color: roleColor[selected.role], fontWeight: 700, textTransform: 'uppercase' } }, roleLabel[selected.role])),
            infoBlock('Where', selected.where, '#94a3b8'),
            infoBlock('What it does', selected.what, EMERALD),
            infoBlock('Science note', selected.sciFact, '#38bdf8')
          )
        );
        function infoBlock(title, body, color) {
          return h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid ' + color, marginBottom: 8 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, title),
            h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, body)
          );
        }
      }

      // VIRUSES
      function renderViruses() {
        var selected = VIRUSES.find(function(v) { return v.id === d.selectedVirus; }) || VIRUSES[0];
        var TRANSMISSION = [
          {
            id: 'airborne', name: 'Airborne / respiratory', color: '#0ea5e9', icon: '💨',
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
            id: 'blood', name: 'Bloodborne', color: '#7f1d1d', icon: '🩸',
            how: 'Pathogen in blood of an infected person enters another person\'s bloodstream. Needle reuse, transfusion of contaminated blood, mother-to-baby at birth, occupational needle-sticks.',
            examples: 'HIV, hepatitis B, hepatitis C, syphilis (also sexual + congenital), some hemorrhagic fevers (Ebola via close contact with blood/body fluids).',
            prevent: 'Universal precautions (treat every blood as potentially infectious). Single-use needles + syringes. Blood-bank screening (mandatory testing for HIV, HBV, HCV since the 1980s-90s). Hepatitis B vaccination. PrEP (pre-exposure prophylaxis) for HIV.'
          },
          {
            id: 'sexual', name: 'Sexual (STI)', color: '#ec4899', icon: '💞',
            how: 'Direct mucous-membrane or genital-skin contact during sexual activity. Pathogens that thrive in warm moist mucosal surfaces.',
            examples: 'HIV, gonorrhea, chlamydia, syphilis, herpes (HSV), HPV (linked to cervical + throat cancer), trichomoniasis, hepatitis B.',
            prevent: 'Condoms (reduce most STIs substantially but not 100% for those spread by skin contact like HPV + HSV). Vaccination (HPV, hepatitis B). Regular screening if sexually active. PrEP for HIV. Treatment of partners.'
          },
          {
            id: 'contact', name: 'Direct + indirect contact', color: '#f59e0b', icon: '🤝',
            how: 'Skin-to-skin contact, or contact with contaminated surfaces (fomites) like doorknobs, phones, towels. The pathogen survives outside the body long enough to transmit on touch.',
            examples: 'MRSA (skin-to-skin in athletes, healthcare), scabies, lice, ringworm + athlete\'s foot (fungal), warts (HPV), conjunctivitis ("pink eye"), some common-cold viruses (rhinovirus survives on surfaces).',
            prevent: 'Handwashing. Don\'t share towels or razors. Clean shared surfaces. Cover open wounds. Treat the source.'
          },
          {
            id: 'vertical', name: 'Vertical (mother → child)', color: '#a855f7', icon: '🤰',
            how: 'Pathogen crosses the placenta, infects during delivery, or transmits in breast milk.',
            examples: 'HIV (without treatment ~25% transmission; with antiretrovirals + C-section + formula feeding, <1%). Syphilis (TORCH infections). Cytomegalovirus, rubella, toxoplasmosis. Hepatitis B.',
            prevent: 'Prenatal screening for all the TORCH pathogens. Antiretrovirals during pregnancy for HIV+ mothers (drops transmission to <1%). Hepatitis B vaccine + immunoglobulin to babies born to infected mothers within 12 hours of birth. Rubella vaccination before pregnancy.'
          },
          {
            id: 'zoonotic', name: 'Zoonotic (animal → human)', color: '#16a34a', icon: '🦇',
            how: 'A pathogen normally living in an animal jumps to humans. May or may not then spread human-to-human. Most new emerging human diseases are zoonoses.',
            examples: 'COVID-19 (probably bat → intermediate host → human). HIV (chimps → humans, early 20th c.). Ebola (bats). Rabies (any mammal). Plague (rodents → fleas → humans). Avian flu (birds). Salmonella (chickens, reptiles). Anthrax (livestock).',
            prevent: 'Wildlife habitat protection (less wildlife stress = less spillover). Surveillance of animal pathogens. Personal protection in occupational settings (veterinarians, wildlife biologists, slaughterhouse workers). Vaccinate pets (rabies). Keep wild animals wild.'
          }
        ];
        var selT = TRANSMISSION.find(function(t) { return t.id === d.selectedTransmission; }) || TRANSMISSION[0];

        return h('div', { style: { padding: 16 } },
          sectionCard('What viruses are (and are not)',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              'Viruses are NOT cells. They have no metabolism of their own. They are genetic material (DNA or RNA) wrapped in a protein coat (capsid), sometimes with a lipid envelope. They reproduce only by entering a host cell and hijacking its machinery to make copies of themselves. Most biologists do not classify them as alive — though they certainly behave like life when inside a cell.'
            )
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 14 } },
            VIRUSES.map(function(v) {
              var active = d.selectedVirus === v.id;
              return h('button', { key: v.id,
                onClick: function() { upd({ selectedVirus: v.id }); },
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800 } }, v.name)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('h3', { style: { margin: '0 0 8px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginBottom: 10 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Genome'),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.genome)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Hosts'),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.hosts)
              )
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } },
              h('strong', { style: { color: '#6ee7b7' } }, 'Structure: '), selected.structure
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Story'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.story)
            )
          ),

          // Disease transmission modes — applies to viruses + bacteria + parasites
          sectionCard('🦠 How infectious diseases spread — 8 transmission modes',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Public health is largely about interrupting transmission. Different pathogens spread through different routes; the same pathogen may use more than one. Knowing the route(s) for a given disease tells you the highest-yield prevention strategy.'
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
              h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + selT.color } },
                h('div', { style: { fontSize: 15, fontWeight: 800, color: selT.color, marginBottom: 8 } }, selT.icon + ' ' + selT.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How it spreads'),
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, selT.how)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Examples'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, selT.examples)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Prevention'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, selT.prevent)
                )
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, 'R₀: the basic reproduction number. '),
                'How many new infections one infected person causes in a fully-susceptible population, on average. Measles ~12-18 (extremely high). Smallpox ~5-7. Original COVID-19 ~2-3 (with Omicron variants 8+). Ebola ~1.5-2.5. Flu ~1.3. R₀ < 1 means the outbreak dies out. R₀ > 1 means it grows. Public health interventions (vaccination, masks, sanitation, vector control) reduce the EFFECTIVE R below R₀.'
              )
            ),
            '#0ea5e9'
          ),

          // ─── Prions + neurodegenerative disease ──────────────────
          sectionCard('🧬 Prions — proteins that infect',
            (function() {
              var PRION_TOPICS = [
                { id: 'what', name: 'What a prion is', emoji: '🧩',
                  body: 'A prion is a protein that has folded into a wrong shape — and which can convert other copies of the same protein in the brain into that same wrong shape. There is no DNA or RNA involved. No replication of a genome. A misfolded protein meets a normally-folded protein, and the misfolded shape spreads. Stanley Prusiner proposed this in 1982, faced ~15 years of strong skepticism (a "protein-only" infectious agent contradicted the central dogma of molecular biology), and was awarded the Nobel Prize in 1997 once the evidence became overwhelming.',
                  caveat: 'Calling prions "infectious" requires a careful definition. They do not reproduce themselves like a microbe. They CATALYZE the misfolding of host proteins. The result looks infectious — a small dose can grow into a brain full of misfolded protein — but the mechanism is fundamentally different from any other known pathogen.'
                },
                { id: 'shape', name: 'PrP^C vs PrP^Sc (the shape switch)', emoji: '🔀',
                  body: 'The prion protein, PrP, is a normal cellular protein found especially in neurons (its normal function is still poorly understood — possibly copper binding, synapse maintenance, myelin integrity). The healthy form PrP^C (cellular) is mostly α-helix. The disease form PrP^Sc (scrapie, named for the first known prion disease in sheep) is mostly β-sheet. When PrP^Sc contacts PrP^C, it forces it to refold into the β-sheet shape. β-sheet rich proteins aggregate into amyloid fibrils — sticky, insoluble plaques that resist all normal cellular degradation machinery.',
                  caveat: 'The β-sheet/aggregation theme connects prion disease to a much larger family of "protein misfolding" diseases (Alzheimer\'s amyloid-β, Parkinson\'s α-synuclein, Huntington\'s mutant huntingtin, ALS TDP-43 + SOD1). The mechanism of aggregation is similar; whether non-prion diseases are TRULY transmissible in the prion sense is still debated.'
                },
                { id: 'cjd', name: 'Creutzfeldt-Jakob disease', emoji: '🧠',
                  body: 'CJD is the most common human prion disease, affecting ~1 in 1,000,000 people per year worldwide. Three categories: sporadic CJD (sCJD, ~85% of cases — no known cause, may be a spontaneous misfolding event); familial/genetic CJD (~10-15%, mutations in the PRNP gene); and acquired CJD (<1% — iatrogenic from contaminated surgical instruments or hormone preparations, or variant CJD from BSE-contaminated beef). Symptoms: rapidly progressive dementia, myoclonus (involuntary jerks), ataxia, visual disturbances. Median survival from first symptom is about 4-5 months. There is no treatment that alters disease course.',
                  caveat: 'Prion-contaminated surgical instruments are a real concern because standard sterilization (autoclaving at 121°C) does NOT destroy prions. Specialized protocols require autoclaving at 134°C combined with 1 M NaOH soak. Single-use disposable instruments are now standard for any neurosurgery on a suspected CJD patient.'
                },
                { id: 'bse', name: 'BSE + vCJD (the mad cow outbreak)', emoji: '🐄',
                  body: 'Bovine Spongiform Encephalopathy (BSE, "mad cow disease") emerged in UK cattle in the 1980s. The likely origin: rendering practices that fed protein supplements made from sheep/cattle byproducts (including nervous-system tissue) back to cattle, recycling the prion. ~200,000+ cattle developed clinical BSE; an estimated several million were exposed. The UK eventually banned the practice, slaughtered millions of cattle, and reformed the feed chain. Variant CJD in humans (vCJD) emerged in 1996, traced to consumption of BSE-contaminated beef. ~178 confirmed cases in the UK to date (deaths peaked 2000). Far less than the worst-case projections of the early 2000s, but a real and ongoing concern.',
                  caveat: 'vCJD has an incubation period that may exceed 50 years. Blood transfusion from infected donors has transmitted vCJD in at least 4 documented cases (UK). Several countries still impose blood-donation restrictions on people who lived in the UK during the 1980s-90s outbreak years.'
                },
                { id: 'kuru', name: 'Kuru — the laughing death', emoji: '🌿',
                  body: 'Kuru was a prion disease epidemic in the Fore people of Papua New Guinea, peaking in the 1950s. Symptoms included tremor, ataxia, dementia, and a characteristic uncontrolled laughter near death (the name comes from a Fore word for "trembling with fear or cold"). Carleton Gajdusek + colleagues traced transmission to a traditional mortuary practice in which (primarily) women and children consumed parts of deceased relatives, including brain tissue, as an act of respect and grief. Once that practice ended (by ~1960), new cases stopped appearing in the next generation. Gajdusek shared the 1976 Nobel for the demonstration that prion disease was transmissible.',
                  caveat: 'The Fore people had no concept of "prion" or "contamination." The mortuary practice was a meaningful cultural act of love. Discussions of kuru should be respectful of that context, not exoticized. The legacy: kuru ALSO showed that genetic variants of PRNP (codon 129 heterozygotes) confer partial protection — evolutionary selection in action.'
                },
                { id: 'alzheimers', name: 'Alzheimer\'s — prion-LIKE?', emoji: '🌫️',
                  body: 'Alzheimer\'s disease (AD) involves two protein aggregates: extracellular amyloid-β plaques and intracellular tau tangles. Both spread through the brain in stereotyped patterns (Braak staging for tau). Laboratory experiments have shown that injecting brain extract from AD patients into mice can SEED amyloid-β plaques in the mouse brain. This led to debate: is AD "prion-like"? Most researchers say yes in terms of the molecular mechanism (templated misfolding + seeding + spread), but NO in the sense of person-to-person transmission. No epidemiological evidence supports natural transmission of AD. Some iatrogenic cases (human growth hormone from cadaveric pituitaries, ~1958-1985) have shown amyloid-β seeding decades later in patients who otherwise should not have it.',
                  caveat: 'AD is multifactorial: aging, APOE-ε4 genotype, vascular health, sleep, cardiovascular disease, inflammation, and many other contributors. The "prion-like" framing is mechanistically illuminating but should not panic anyone. AD is not contagious in any everyday sense — kissing, sharing meals, caregiving are entirely safe. The iatrogenic concern is limited to neurosurgical instruments and certain biologic products.'
                },
                { id: 'parkinson', name: 'Parkinson\'s + α-synuclein spread', emoji: '🌀',
                  body: 'Parkinson\'s disease (PD) involves aggregation of α-synuclein protein into Lewy bodies, beginning in the brainstem (sometimes peripherally in the gut) and spreading through the brain in a stereotyped pattern over years. Heiko Braak proposed (2003) that PD pathology may even ORIGIN in the gut + olfactory bulb and travel up the vagus nerve to the brainstem. Vagotomy (surgical cutting of the vagus nerve) appears to slightly reduce PD risk in epidemiological studies — supportive but not definitive. Like AD, α-synuclein behaves "prion-like" in lab models (seeded aggregation, templated spread) but is not naturally transmissible person-to-person.',
                  caveat: 'The "gut-first" PD hypothesis is being actively investigated. It is NOT yet established. What is established: PD is closely linked to enteric nervous system disease (constipation often appears years before motor symptoms). This is a hot research area; expect framings to shift over the next decade.'
                },
                { id: 'detection', name: 'Detection + research', emoji: '🔬',
                  body: 'New ultrasensitive assays (RT-QuIC, real-time quaking-induced conversion; PMCA, protein misfolding cyclic amplification) can detect tiny amounts of prion seeds in cerebrospinal fluid, nasal brushings, or even skin biopsies. This has revolutionized antemortem diagnosis of CJD and is being adapted for α-synuclein in PD + Lewy body dementia (SAA, seed amplification assay). For the first time, neurodegenerative diseases can be detected biochemically before the brain is destroyed. Therapeutic strategies under investigation: antibodies (lecanemab + donanemab now approved for early AD), antisense oligonucleotides (e.g., tofersen for SOD1-ALS), small molecules that stabilize the native fold, vaccines.',
                  caveat: 'Anti-amyloid antibodies for AD produced modest clinical-trial benefit, real but small (about a 5-month delay in cognitive decline over 18 months) and with significant brain-bleed risks. They are not a cure. They are the first disease-modifying treatments to clear FDA review for AD — important as proof that the amyloid pathway CAN be modified, less certain as treatments that change patients\' lives in major ways.'
                }
              ];
              var sel = d.selectedPrion || 'what';
              var topic = PRION_TOPICS.find(function(t) { return t.id === sel; }) || PRION_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'Prions sit at a strange boundary. They are not alive. They have no genome. Yet they spread through tissue, cause progressive fatal disease, and can be transmitted by surgery, transfusion, or (rarely) dietary exposure. They also illuminate something larger: a whole class of "protein misfolding" diseases, including the most common neurodegenerative conditions, may share the same fundamental mechanism — proteins teaching other proteins to fold wrong.'
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
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 11.5, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'The bigger pattern: '),
                  'Proteins fold into shapes determined by their amino-acid sequence. When that folding goes wrong, even slightly, the consequences can be catastrophic. Prions are the extreme case (one misfolded protein can convert thousands of others). The same biophysics, in milder form, may underlie much of what kills humans late in life — Alzheimer\'s, Parkinson\'s, Huntington\'s, ALS. Understanding prions is not a niche curiosity; it is foundational to one of the largest health challenges of an aging world.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)', fontSize: 11.5, color: '#fca5a5', lineHeight: 1.65 } },
                  h('strong', null, 'A note on hope vs hype: '),
                  'Anti-amyloid antibodies for Alzheimer\'s are real progress AND have real limits. Calling them either "a cure" or "a scam" is wrong. They are the first treatments that modify disease biology, with modest effect sizes, real side effects, and high cost. For people with a parent or grandparent affected by AD, this is genuine forward motion — but not yet the breakthrough family caregivers most need.'
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
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 8px' } }, 'Fungi are eukaryotes (cells with nuclei) — like us, but in their own kingdom. Genetically, fungi are closer to animals than to plants. They have cell walls made of chitin (the same stuff as insect exoskeletons), not cellulose like plants. They cannot photosynthesize. They digest their food externally, releasing enzymes into the environment and absorbing the dissolved nutrients.'),
              h('p', { style: { margin: 0 } }, 'Most fungi are filamentous (multicellular): a tangled mass of thread-like cells (hyphae) forming a network (mycelium). Mushrooms are just the reproductive parts — most of the fungus lives underground. Yeasts are the exception: single-celled fungi.')
            ),
            '#a855f7'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
            FUNGI.map(function(f) {
              var active = (d.selectedFungus || FUNGI[0].id) === f.id;
              return h('button', { key: f.id,
                onClick: function() { upd({ selectedFungus: f.id }); },
                'aria-label': f.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(168,85,247,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#a855f7' : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, f.name),
                h('div', { style: { fontSize: 10, color: roleColor[f.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, f.role)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + (roleColor[selected.role] || '#a855f7') } },
            h('h3', { style: { margin: '0 0 4px', color: '#d8b4fe', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } }, 'Kind: ' + selected.kind + ' · ', h('span', { style: { color: roleColor[selected.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, selected.role)),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #94a3b8', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Where'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.where)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What it does'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.what)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Science note'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.sciFact)
            )
          ),
          emergingFungalSection()
        );

        function emergingFungalSection() {
          var FUNGI_TOPICS = [
            { id: 'whyrising', name: 'Why fungal infections are rising', emoji: '📈',
              body: 'Invasive fungal infections have grown into one of the most concerning emerging health threats of the past 20 years. The WHO published its first-ever "fungal priority pathogens list" in 2022, naming 19 species (most people had never heard of any of them). Reasons for the rise: (1) Growing populations of immunocompromised patients — chemotherapy, organ transplants, HIV, biologic immunosuppressants, autoimmune medications, ICU stays — all create hosts where opportunistic fungi can thrive. (2) Climate change — some fungi adapted to mammalian body temperature only because warming environments selected for heat-tolerant strains (the Candida auris hypothesis). (3) Antifungal resistance — agricultural azole use selects for resistant Aspergillus + others. (4) COVID-19 collateral damage — mucormycosis, "black fungus," exploded in India during the 2021 COVID wave among diabetic patients on steroids.',
              caveat: 'Most fungal exposure is harmless. Healthy immune systems clear nearly all opportunistic fungal exposures. The rise is real but the absolute numbers (a few hundred thousand serious infections per year globally) are dwarfed by bacterial + viral disease. The concern is the trajectory + the high mortality (often 30-60%) when serious fungal infections DO occur.'
            },
            { id: 'cauris', name: 'Candida auris — the new superbug', emoji: '🚨',
              body: 'Candida auris was first identified in 2009 (Japan, ear canal of an elderly patient). It then appeared independently on four continents within a few years — suggesting parallel emergence rather than a single source spreading. C. auris is unusually resistant (often multidrug-resistant to all three major antifungal classes), persists on surfaces for weeks (unlike most Candida), causes outbreaks in healthcare facilities, and has 30-60% mortality in invasive cases. CDC declared it an "urgent threat" in 2019 + reported that US cases tripled from 2019 to 2021 (~3,000+ cases) + continued rising through 2024. Standard cleaning chemicals do not kill it reliably; hospitals need bleach-based or hydrogen-peroxide-based disinfectants applied specifically.',
              caveat: 'The leading hypothesis for C. auris\'s simultaneous global emergence: climate warming. Most fungal species cannot grow at human body temperature (one of our innate defenses — mammals are too hot for most fungi). C. auris may have evolved heat tolerance recently in response to environmental warming, then jumped to colonizing humans. Arturo Casadevall + colleagues (Johns Hopkins) have made this argument most strongly; it is not yet proven but is gaining acceptance.'
            },
            { id: 'aspergillus', name: 'Aspergillus + agricultural resistance', emoji: '🌾',
              body: 'Aspergillus fumigatus is a common soil mold whose spores you inhale thousands of times per day. Healthy lungs clear them easily; immunocompromised lungs sometimes cannot, leading to invasive aspergillosis (mortality 30-50%). The first-line treatment is azole antifungals (voriconazole). Problem: agricultural azole fungicides (used on wheat, grapes, tulips, and many other crops) drive the SAME resistance mechanism. Patients in countries with heavy agricultural azole use now present with azole-resistant invasive aspergillosis before they have ever taken an azole medication. In the Netherlands, ~20% of clinical Aspergillus isolates are now azole-resistant. The original resistance evolved in tulip-bulb fields + spread globally.',
              caveat: 'This is an under-appreciated public health crisis. The WHO\'s One Health framework explicitly names agricultural antimicrobial use as a driver of human clinical resistance — true for bacteria (livestock antibiotics → human-pathogen resistance) AND for fungi (crop azoles → human-pathogen resistance). Restrictions on agricultural azoles are politically difficult; tulip cultivation in particular is a major Dutch industry. There are no current alternatives that won\'t collapse those industries.'
            },
            { id: 'mucor', name: 'Mucormycosis (black fungus)', emoji: '⚫',
              body: 'Mucormycosis is caused by fungi in the order Mucorales (Rhizopus, Mucor, Lichtheimia, others). Spores are ubiquitous in soil + decaying plant matter. Infection in immunocompetent people is rare; mucormycosis is almost entirely a disease of severely immunocompromised + uncontrolled-diabetic patients. The fungi invade blood vessels, causing tissue death + the characteristic black necrotic appearance. Treatment requires emergency surgical debridement + amphotericin B; mortality is 40-80% even with treatment. India saw a massive mucormycosis outbreak in 2021 during the second COVID wave: ~50,000 cases reported (vs ~50 in a typical pre-pandemic year), driven by the combination of widespread corticosteroid use for COVID + the very high rate of uncontrolled diabetes in India + heavy environmental fungal spore loads.',
              caveat: 'Mucormycosis is sometimes sensationalized as "flesh-eating fungus" in news coverage. The reality is grim but specific: it is essentially never a threat to immunocompetent people. The COVID-mucormycosis wave was a tragic intersection of multiple comorbidities. Sustained public health investment in diabetes control + judicious corticosteroid use would prevent most cases.'
            },
            { id: 'crypto', name: 'Cryptococcus + HIV', emoji: '🦠',
              body: 'Cryptococcus neoformans is a yeast found in pigeon droppings + decaying tree material worldwide. Inhalation is common; clinical disease is rare in healthy immune systems. In HIV/AIDS patients with low CD4 counts, however, Cryptococcus crosses the blood-brain barrier + causes cryptococcal meningitis. Untreated mortality is 100%; even with optimal treatment, mortality remains 20-40%. Cryptococcal meningitis kills an estimated 150,000-200,000 people per year globally, predominantly in sub-Saharan Africa where HIV treatment access is incomplete. WHO recommends screening all newly-diagnosed advanced HIV patients for cryptococcal antigen + treating asymptomatic carriers preemptively.',
              caveat: 'Cryptococcal meningitis is one of the biggest AIDS-related deaths in low- + middle-income countries — far more than tuberculosis or pneumonia in some settings. Antiretroviral access is the long-term answer; cryptococcal antigen screening + preemptive fluconazole treatment is the immediate one. This is a curable, preventable disease that kills people because the systems to deliver care aren\'t reaching them.'
            },
            { id: 'valley', name: 'Valley fever — coccidioidomycosis', emoji: '🌵',
              body: 'Coccidioides immitis + C. posadasii are soil fungi endemic to the arid southwestern US (California Central Valley, Arizona) + parts of Mexico + Latin America. Inhalation of spores from disturbed dust causes "Valley fever" — a flu-like illness that resolves on its own in most cases. About 5-10% of infected people develop chronic pulmonary disease; <1% develop life-threatening disseminated infection (meningitis, bone, skin). The fungus is expanding northward + eastward with climate change; cases now reported in Washington State + parts of the Midwest that were never endemic before. California reported ~9,000 cases in 2022, a 50% increase from a decade earlier.',
              caveat: 'Valley fever is genuinely under-diagnosed nationally. People who develop it after a trip to the Southwest are often misdiagnosed (it looks like influenza, then like pneumonia, then like cancer). The fungus is reportable in 26 states, but awareness varies hugely. Climate-driven range expansion is making this a national rather than regional concern. Several Valley fever vaccines are in clinical trials.'
            },
            { id: 'chytrid', name: 'Chytrid + amphibian extinction', emoji: '🐸',
              body: 'Batrachochytrium dendrobatidis (Bd) is a chytrid fungus that infects amphibian skin, disrupting electrolyte balance + causing death by cardiac arrest. First identified in 1998, it has driven population declines in over 500 amphibian species worldwide + has been definitively linked to the extinction of at least 90 species since 1980 — the worst single pathogen-driven extinction event in recorded history. Its origin is believed to be Korea, spread globally by the international amphibian trade. Bsal (B. salamandrivorans), a related species discovered in 2013, threatens salamanders + has so far been kept out of the Americas by trade restrictions, though it has devastated European fire salamander populations.',
              caveat: 'Chytrid is the strongest case study for "fungi as a major extinction driver" — historically that role was attributed mostly to habitat loss + climate change. The pathogen lens doesn\'t replace those drivers, but adds a critical third factor. The case also illustrates that international wildlife trade has been a major emerging-disease vector, and continues to be despite repeated warnings from disease ecologists.'
            },
            { id: 'treat', name: 'The narrow antifungal arsenal', emoji: '💊',
              body: 'Compared to antibiotics (dozens of classes), antifungals are a small + slow field. There are essentially three major classes in clinical use: (1) Polyenes (amphotericin B, nystatin) — broad-spectrum, but amphotericin causes serious kidney toxicity. (2) Azoles (fluconazole, voriconazole, itraconazole, isavuconazole, posaconazole) — work by blocking ergosterol synthesis; widely resistant in some species now. (3) Echinocandins (caspofungin, micafungin, anidulafungin) — block cell-wall synthesis; the newest class (first approved 2001), with C. auris already showing resistance in some isolates. A new class, fosmanogepix (in trials 2024), targets fungal mannoprotein anchors — first novel antifungal mechanism in 20+ years.',
              caveat: 'The pharma economics for new antifungals are bad. Each new antifungal needs years of trials + capital investment, but invasive fungal infections affect relatively small patient populations (compared to bacterial infections), making return on investment difficult. The result: a dangerously thin pipeline. Several companies have abandoned antifungal development entirely. The WHO + governments are exploring push-pull incentives (advance market commitments, subscription pricing) to fix this; results so far are limited.'
            }
          ];
          var sel = d.selectedFungalE || 'whyrising';
          var topic = FUNGI_TOPICS.find(function(t) { return t.id === sel; }) || FUNGI_TOPICS[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#d8b4fe', fontSize: 16 } }, '🍄 Emerging fungal infections — the underrecognized threat'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'When people picture an emerging infectious disease, they picture a virus. But the past 20 years have seen fungi rise into a serious + underappreciated category of human + ecological pathogen. Climate change, agricultural fungicide overuse, expanding immunocompromised populations, and very thin antifungal pipelines have combined to create a problem we are only beginning to take seriously.'
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
            h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
              h('div', { style: { fontSize: 14, fontWeight: 800, color: '#d8b4fe', marginBottom: 8 } }, topic.emoji + ' ' + topic.name),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
              h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                h('strong', null, 'Honest framing: '), topic.caveat
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 11.5, color: '#dcfce7', lineHeight: 1.65 } },
              h('strong', null, 'A note on proportionality: '),
              'Fungi cause an estimated 1.5-2 million deaths globally per year — comparable to tuberculosis. They get a fraction of the research funding, awareness, or media coverage that bacterial + viral pathogens receive. This is changing slowly. School psychologists + educators may encounter fungal infections in immunocompromised students (cancer survivors, transplant recipients, severe asthma on inhaled steroids); awareness of the basics serves those students well.'
            )
          );
        }
      }

      // PROTISTS
      function renderProtists() {
        var selected = (d.selectedProtist && PROTISTS.find(function(p) { return p.id === d.selectedProtist; })) || PROTISTS[0];
        var roleColor = { beneficial: '#22c55e', 'beneficial / educational': '#86efac', 'beneficial (massively)': '#22c55e', 'mostly-beneficial': '#86efac', 'mostly-beneficial (and rare-pathogenic relatives)': '#86efac', pathogenic: '#ef4444' };
        return h('div', { style: { padding: 16 } },
          sectionCard('🦠 Protists — the diverse leftovers',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 8px' } }, '"Protist" is what biologists call all the single-celled eukaryotes that aren\'t plants, fungi, or animals. It is a wastebasket category — protists do not share a common ancestor that excludes other eukaryotes. The kingdom is being broken up as DNA sequencing reveals true relationships. But the term is still useful for talking about this incredibly diverse group: photosynthetic algae, mobile predators, parasites, mixotrophs that do both.'),
              h('p', { style: { margin: 0 } }, 'Protists include the most abundant photosynthesizers in the ocean (diatoms) and the most lethal infectious organisms on Earth (Plasmodium, the malaria parasite). They sit between bacteria and the multicellular life that descended from them.')
            ),
            '#0ea5e9'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8, marginBottom: 14 } },
            PROTISTS.map(function(p) {
              var active = (d.selectedProtist || PROTISTS[0].id) === p.id;
              return h('button', { key: p.id,
                onClick: function() { upd({ selectedProtist: p.id }); },
                'aria-label': p.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(14,165,233,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#0ea5e9' : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, p.name),
                h('div', { style: { fontSize: 10, color: roleColor[p.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, p.role.split(' (')[0])
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + (roleColor[selected.role] || '#0ea5e9') } },
            h('h3', { style: { margin: '0 0 4px', color: '#7dd3fc', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } }, 'Kind: ' + selected.kind + ' · ', h('span', { style: { color: roleColor[selected.role] || '#94a3b8', fontWeight: 700, textTransform: 'uppercase' } }, selected.role)),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #94a3b8', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Where'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.where)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #0ea5e9', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What it does'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.what)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Science note'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.sciFact)
            )
          )
        );
      }

      // ARCHAEA
      function renderArchaea() {
        var selected = (d.selectedArchaeon && ARCHAEA.find(function(a) { return a.id === d.selectedArchaeon; })) || ARCHAEA[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('♨️ Archaea — the third domain of life',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              h('p', { style: { margin: '0 0 8px' } }, 'For most of the 20th century, biology recognized two domains of cellular life: bacteria + everything else. In 1977, Carl Woese used ribosomal RNA sequencing to discover that "everything else" actually splits into TWO completely separate groups: archaea + eukaryotes. The two had been classified together because archaea look like bacteria under a microscope. They are not.'),
              h('p', { style: { margin: 0 } }, 'Archaea are as different from bacteria as bacteria are from us. Different membrane lipids, different cell wall chemistry, different gene transcription machinery. Archaea live in your gut and in the ocean. Many are extremophiles — surviving boiling temperatures, supersaline salt flats, or extreme acidity. The "three domains of life" framework is the foundation of modern biology, and we owe it to archaea.')
            ),
            '#ef4444'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, marginBottom: 14 } },
            ARCHAEA.map(function(a) {
              var active = (d.selectedArchaeon || ARCHAEA[0].id) === a.id;
              return h('button', { key: a.id,
                onClick: function() { upd({ selectedArchaeon: a.id }); },
                'aria-label': a.name,
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(239,68,68,0.20)' : '#1e293b', border: '1px solid ' + (active ? '#ef4444' : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
              },
                h('div', { style: { fontSize: 12, fontWeight: 800, marginBottom: 2 } }, a.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, a.kind)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid #ef4444' } },
            h('h3', { style: { margin: '0 0 4px', color: '#fca5a5', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } }, selected.kind),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #94a3b8', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Where it lives'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.where)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #ef4444', marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What it does'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.what)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Why it matters'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.sciFact)
            )
          ),
          extremophilesAstrobiologySection()
        );

        function extremophilesAstrobiologySection() {
          var EXT = [
            { id: 'classes', name: 'Classes of extremophiles', emoji: '🌡️',
              body: 'Extremophiles are organisms that thrive in environments hostile to most life. The major classes (often combined in one organism): THERMOPHILES grow above 45°C; HYPERTHERMOPHILES above 80°C (the current record holder, Methanopyrus kandleri, grows at 122°C, well above water\'s normal boiling point — sustained by hydrostatic pressure at hydrothermal vents). PSYCHROPHILES grow below 15°C, including some that grow at -20°C in saline brines inside Antarctic sea ice. ACIDOPHILES grow at pH below 5 (Picrophilus oshimae grows at pH 0.06, more acidic than battery acid). ALKALIPHILES grow above pH 9 (soda lakes). HALOPHILES grow in saturated salt (Halobacterium needs >2 M NaCl). PIEZOPHILES (barophiles) grow at high pressures, including the bottom of the Mariana Trench (1100 atm, 11 km depth). RADIATION-RESISTANT organisms like Deinococcus radiodurans survive 5000 Gy of ionizing radiation — about 3000× the lethal dose for humans.',
              caveat: 'The "extremophile" label is anthropocentric. From the organism\'s perspective, ITS environment is normal, and the moderate-temperature surface biosphere we live in is the strange edge case. Some extremophile environments (deep-sea hydrothermal vents, subsurface basalt, deep aquifers) are far more common on Earth + likely in the universe than the conditions we consider familiar.'
            },
            { id: 'vents', name: 'Hydrothermal vents + life origins', emoji: '🌋',
              body: 'Discovered in 1977 by the Alvin submersible at the Galápagos Rift, hydrothermal vents support entire ecosystems based on CHEMOSYNTHESIS — bacteria + archaea that oxidize hydrogen sulfide (instead of using sunlight) to fix carbon, supporting tube worms, clams, shrimp, and crabs. This was the first proof that complex life can exist without sunlight. Black-smoker vents at mid-ocean ridges reach 400°C, with mineral-rich fluids reacting with cold seawater to precipitate iron + zinc sulfides. White-smoker vents are cooler + dominated by barium + calcium minerals. The Lost City hydrothermal field (Atlantic, 2000) is an alkaline serpentinite-driven vent system — possibly closer to where life on Earth originated, because serpentinization produces hydrogen + methane + organic precursors in conditions favorable to early metabolism (Mike Russell + Bill Martin\'s "alkaline vent" hypothesis).',
              caveat: 'Whether life on Earth originated AT vents is debated. Competing hypotheses include warm shallow tidal pools (Darwin\'s original guess), volcanic islands, mineral-templated surfaces, and even subsurface aquifers. Vents have the right chemistry; the kinetics + thermodynamics of life\'s first steps remain hard to reconstruct in lab simulations.'
            },
            { id: 'subsurface', name: 'The deep biosphere', emoji: '⛏️',
              body: 'About 1.6 × 10²⁹ microbial cells live in the upper few kilometers of Earth\'s crust — roughly equal to the total cell count in the surface biosphere, possibly more. This "deep biosphere" was unsuspected until the 1990s; it has since been documented in deep mines (the Mponeng mine in South Africa at 3.6 km depth has 60°C basalt aquifers full of bacteria + archaea), oil reservoirs, the seabed sediments down to 1+ km, and even basalt cores from drilling expeditions. These organisms grow EXTREMELY slowly (some have estimated doubling times of centuries to millennia), feeding on hydrogen produced by radiolysis of water from natural uranium + thorium decay, or on serpentinization-derived hydrogen + methane. The deep biosphere may be the LARGEST single ecosystem on Earth by biomass.',
              caveat: 'Sample contamination is a constant problem in deep biosphere science. Drilling fluids, packers, even the drill string carry surface microbes down with them. Distinguishing genuine indigenous deep-life from contamination requires multiple geochemical controls + meticulous procedures. The field has gradually built credibility but each new "deep life" claim still faces scrutiny.'
            },
            { id: 'tardigrade', name: 'Tardigrades + survival extremes', emoji: '🐻',
              body: 'Tardigrades ("water bears") are tiny invertebrates (~0.5 mm) that can survive desiccation, freezing to -200°C, heating to 150°C, vacuum + UV (briefly), and ~1000× the radiation dose lethal to humans. Their survival mechanism involves a state called CRYPTOBIOSIS: nearly complete shutdown of metabolism, replacement of cellular water with trehalose (a sugar that stabilizes proteins), and protective Damage-Suppressing (Dsup) proteins that wrap around DNA. Tardigrades survived a 2007 ESA experiment that exposed them to open space for 10 days; most revived after rehydration. Tardigrades are NOT technically extremophiles (they live in damp moss + lake sediments, which are not extreme), but they CAN survive extreme exposures via cryobiosis.',
              caveat: 'Tardigrades are wildly over-represented in popular astrobiology narratives. They cannot GROW or REPRODUCE in extreme conditions; they can only survive them as inert cysts. A tardigrade does not represent a colonizing life form for Mars or Europa. They DO represent useful proof that complex eukaryotic life can survive transport through space, which is relevant for panspermia + planetary protection.'
            },
            { id: 'mars', name: 'Mars + the search for past life', emoji: '🔴',
              body: 'Mars almost certainly had liquid water on its surface 3-4 billion years ago + may still have it intermittently in subsurface aquifers. The Perseverance rover (landed 2021 in Jezero Crater) is selecting samples for a future Mars Sample Return mission (planned 2030s — schedule + budget uncertain). Curiosity rover detected organic molecules + methane plumes (varying seasonally, intriguingly) in Gale Crater. The chemistry of Mars is consistent with past microbial life, but no biosignatures have been confirmed. If past life existed on Mars, the most likely habitat was the subsurface (where liquid water + warmth could persist) — and we have not yet directly sampled deep enough.',
              caveat: 'Mars surface today is severely hostile: ~6 mbar atmosphere (less than 1% of Earth), surface temperature -60°C average, perchlorate-laced regolith (toxic to most Earth life), heavy UV + cosmic radiation. Direct surface life today is implausible. Subsurface life — if it exists — would be at temperatures + chemistries similar to deep Earth biosphere. Conclusively detecting it would be one of the biggest scientific events in history; conclusively ruling it out is impossible without much deeper drilling than current missions can do.'
            },
            { id: 'europa', name: 'Europa + ocean worlds', emoji: '🌊',
                  body: 'Europa is Jupiter\'s ice-covered moon. Beneath ~20-30 km of water ice lies a global liquid-water ocean estimated at 100+ km deep — more liquid water than all of Earth\'s oceans combined. Tidal heating from Jupiter\'s gravity keeps the ocean liquid. The Europa Clipper mission (launched October 2024, arriving 2030) will conduct ~50 close flybys to characterize the ice + ocean chemistry. Enceladus (Saturn moon) has similar geology + has been observed venting water + organic molecules + hydrogen from south-pole jets — direct sampling of subsurface ocean material was achieved by the Cassini mission (2005-2017). Titan (also Saturn) has methane lakes + a presumed subsurface water ocean. Triton (Neptune), Ganymede (Jupiter), Callisto (Jupiter) all probably have subsurface oceans.',
                  caveat: 'Detecting life in a subsurface ocean is hard — we would need to either find it venting through the ice (Enceladus already gives us samples) or drill through 20+ km of ice (decades of technology development at minimum). Europa Clipper is NOT a life-detection mission. It is preparing the ground for a future lander. Setting realistic expectations matters: even a successful Clipper mission probably will not "find life on Europa."'
            },
            { id: 'panspermia', name: 'Panspermia + planetary protection', emoji: '🚀',
              body: 'Panspermia is the hypothesis that life on Earth originated elsewhere + was delivered here by meteorites, comets, or interstellar dust. Tardigrades + bacterial spores can plausibly survive space transit (proven experimentally). Mars meteorites HAVE reached Earth via natural impact ejection. So the mechanism is feasible; the question is whether it happened. Most astrobiologists are agnostic — there is no positive evidence FOR panspermia + the alternative (independent origin on Earth) requires no special mechanism. Planetary protection is the related practical concern: NASA + ESA spend significant effort sterilizing spacecraft going to Mars or Europa, both to avoid contaminating those worlds with Earth life + to avoid false-positive biosignature detections from hitchhiking microbes. The COSPAR (Committee on Space Research) Planetary Protection Policy categorizes missions by destination + contamination risk.',
              caveat: 'Some flavors of panspermia (Hoyle + Wickramasinghe\'s strong version, or Loeb\'s recent speculations on \'Oumuamua + IM1) are not seriously considered. The mild version — that organic precursors reached early Earth from comets — is well-supported by the chemistry of carbonaceous chondrite meteorites. Full living-cell panspermia is plausible but unsupported.'
            },
            { id: 'biosig', name: 'Biosignatures + agnostic biology', emoji: '🔬',
              body: 'A biosignature is something only living processes can produce. On Earth, the giveaways are: chiral homochirality (life uses only L-amino acids + D-sugars; chemistry produces racemic mixtures), isotopic fractionation (life prefers lighter carbon-12 over carbon-13 by ~25 parts per thousand), specific gas combinations far from equilibrium (oxygen + methane together), patterned mineralogy (biologically-produced minerals like the magnetite chains in magnetotactic bacteria), and specific complex molecules (chlorophyll, hopanes, biopolymers). The challenge: alien life might not use the same chemistry. "Agnostic biosignatures" — patterns that any complex molecular system would create regardless of underlying biochemistry — are an active research area (Sara Walker + Lee Cronin\'s "assembly theory" is one current candidate).',
              caveat: 'The history of "we have detected life on Mars" claims is humbling. Viking 1976 labeled-release experiments → debated for 50 years, still unsettled. ALH84001 meteorite microfossils 1996 → mostly abiotic explanations now accepted. Mars methane plumes → not yet linked to biology. Any future claim will face an extremely high burden of proof; the field has earned its caution the hard way.'
            }
          ];
          var sel = d.selectedExtremo || 'classes';
          var topic = EXT.find(function(t) { return t.id === sel; }) || EXT[0];
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.25)' } },
            h('h3', { style: { margin: '0 0 6px', color: '#a5b4fc', fontSize: 16 } }, '🌌 Extremophiles + astrobiology'),
            h('p', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, margin: '0 0 12px' } },
              'The discovery of extremophiles on Earth — life in boiling springs, frozen brine, deep crustal rock, salt-saturated lakes, acidic vents — has expanded our sense of where life CAN exist. Every new extremophile habitat we find on Earth opens a new candidate habitat in the solar system + beyond. This is microbiology meeting astronomy in the most literal way.'
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
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
              h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                h('strong', null, 'Honest framing: '), topic.caveat
              )
            ),
            h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11.5, color: '#fde68a', lineHeight: 1.65 } },
              h('strong', null, 'The cross-tool connection: '),
              'This section pairs naturally with the Astronomy tool\'s exoplanet + habitable-zone + Drake-equation sections. The biology side (what kind of life COULD exist) and the astronomy side (where habitable worlds COULD be) are now converging into a single field called ASTROBIOLOGY. NASA + ESA both have active astrobiology programs (NASA has the Astrobiology Institute + NExSS network; ESA has the ExoMars + planned ENVISION missions). It is one of the most genuinely interdisciplinary fields in modern science.'
            )
          );
        }
      }

      // MICROSCOPE — scale visualizer
      function renderMicroscope() {
        var mag = d.magnification || 100;
        var selected = SCOPES.find(function(s) { return s.id === d.selectedScope; }) || SCOPES[0];

        // Reference scale targets: human hair (~80 µm), red blood cell (10 µm), typical bacterium (2 µm), small virus (100 nm = 0.1 µm)
        var targets = [
          { name: 'Human hair', sizeUm: 80 },
          { name: 'Red blood cell', sizeUm: 10 },
          { name: 'E. coli bacterium', sizeUm: 2 },
          { name: 'COVID virus', sizeUm: 0.12 },
          { name: 'Protein molecule', sizeUm: 0.01 }
        ];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Microscopy. The history of microbiology IS the history of better microscopes. Each improvement opened a whole new biology.'
          ),

          // Magnification slider
          sectionCard('Scale: what can you see at different magnifications?',
            h('div', null,
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 6 } }, 'Magnification: ', h('strong', { style: { color: EMERALD, fontSize: 14 } }, mag + 'x')),
              h('input', { type: 'range', min: 1, max: 100000, step: 1, value: mag,
                onChange: function(e) { upd({ magnification: parseInt(e.target.value, 10) }); },
                'aria-label': 'Magnification',
                style: { width: '100%', accentColor: EMERALD, marginBottom: 12 }
              }),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 } },
                targets.map(function(t, i) {
                  // Apparent size when viewed at mag — pretend pixel-size = real-size * mag / 1000 µm per visible-width
                  var apparentMm = t.sizeUm * mag / 100; // mm at this magnification (assuming 100x makes 1µm = 1mm on screen)
                  var visible = apparentMm >= 0.1 && apparentMm <= 1000;
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid ' + (visible ? EMERALD : '#334155'), opacity: visible ? 1 : 0.5 } },
                    h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0', marginBottom: 2 } }, t.name),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, t.sizeUm + ' µm actual'),
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
              return h('button', { key: s.id,
                onClick: function() { upd({ selectedScope: s.id }); },
                style: { padding: '6px 12px', borderRadius: 8, background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), color: active ? '#6ee7b7' : '#cbd5e1', fontSize: 12, fontWeight: 700, cursor: 'pointer' }
              }, s.name);
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 17 } }, selected.name),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } }, 'Resolution range: ' + selected.range),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, selected.what),
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.55 } },
              h('strong', null, 'Limit: '), selected.limit
            )
          )
        );
      }

      // RESISTANCE
      function renderResistance() {
        return h('div', { style: { padding: 16 } },
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.35)', borderLeft: '3px solid #ef4444', marginBottom: 12, fontSize: 12.5, color: '#fecaca', lineHeight: 1.65 } },
            h('strong', null, '⚠️ Antibiotic resistance is a global health crisis. '),
            'Antibiotic-resistant infections killed at least 1.27 million people in 2019, with millions more deaths in which resistance contributed. The CDC ranks it among the top global health threats of this century.'
          ),
          sectionCard('How resistance evolves (in 5 steps)',
            h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.85 } },
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'Random mutation. '), 'A bacterium\'s DNA copies with rare errors. Most are harmful or neutral. Occasionally, one happens to make the bacterium less sensitive to an antibiotic.'),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'Antibiotic exposure. '), 'Patient takes the antibiotic. Susceptible bacteria die in massive numbers. The few that happen to be resistant survive.'),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'Selection. '), 'The resistant survivors have all the food and space to themselves. They reproduce. Within hours to days, the surviving population is mostly resistant.'),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'Spread. '), 'Resistant bacteria spread person-to-person, hospital-to-community, country-to-country. Bacteria can also transfer resistance genes between species via plasmids (horizontal gene transfer).'),
              h('li', null, h('strong', { style: { color: '#6ee7b7' } }, 'The antibiotic stops working. '), 'For everyone. The drug that saved millions becomes useless. Each lost antibiotic narrows medicine\'s toolkit.')
            )
          ),
          sectionCard('🔁 Horizontal gene transfer — how bacteria share resistance',
            (function() {
              var MECHS = [
                { id: 'transform', name: 'Transformation', color: '#0ea5e9',
                  what: 'A bacterium picks up FREE DNA from its environment (released when other bacteria die + lyse). If the bacterium is "competent" — its membrane lets DNA in — the new DNA may integrate into its chromosome.',
                  how: 'Discovered by Frederick Griffith in 1928. He showed that dead virulent Streptococcus pneumoniae could transform live non-virulent strains into virulent ones — somehow "transferring" the virulence. Avery, MacLeod, McCarty (1944) showed the transforming agent was DNA. This experiment proved DNA carries genetic information.',
                  examples: 'Streptococcus pneumoniae, Neisseria, Bacillus subtilis. Some species are "naturally competent" — they take up DNA constantly. Others can be made competent in the lab (this is how you genetically transform bacteria for biotech experiments).',
                  rate: 'Limited to neighbors. Free DNA fragments don\'t travel far. But in dense communities like biofilms, every cell is a potential donor + recipient.'
                },
                { id: 'transduce', name: 'Transduction (phage-mediated)', color: '#a855f7',
                  what: 'A bacteriophage virus infects a bacterium, replicates inside, packages some of the host\'s DNA by mistake into a new phage particle, then carries it to another bacterium when it next infects. The recipient gets the donor\'s DNA delivered like a postal package.',
                  how: 'Discovered by Joshua Lederberg + Norton Zinder in 1952 (Lederberg shared the 1958 Nobel for this + other work). Two types: GENERALIZED (any host DNA can be packaged) and SPECIALIZED (only DNA next to the phage integration site).',
                  examples: 'How methicillin resistance + staphylococcal toxin genes spread among Staphylococcus aureus strains. How some virulence genes spread in cholera + diphtheria + scarlet fever. Phage-mediated gene transfer is rampant in marine bacteria — about 10²⁴ transduction events globally PER SECOND in the oceans.',
                  rate: 'Can cross significant distances (wherever phages spread, transduced DNA spreads). Some phages have very narrow host range (one species); others can infect across species.'
                },
                { id: 'conjugate', name: 'Conjugation (pilus-mediated)', color: '#22c55e',
                  what: 'A donor bacterium grows a hollow tube (sex pilus, or "F pilus") that contacts a recipient bacterium. The pilus retracts, bringing the cells together. A PLASMID (a small circular DNA loop, separate from the main chromosome) is then copied from donor to recipient through the connection.',
                  how: 'Discovered by Lederberg + Tatum in 1946 (the same Lederberg, then a 22-year-old grad student). They showed that two E. coli strains, when grown together, could exchange genetic markers. The F (fertility) plasmid encodes the pilus + makes a cell a donor.',
                  examples: 'The dominant mechanism by which antibiotic resistance genes spread in healthcare-associated bacteria. The "R plasmids" carry resistance to multiple antibiotics + can transfer between species — so a Klebsiella that has carbapenem resistance can transfer it to an E. coli in the same patient.',
                  rate: 'Fast + far-reaching. Conjugative plasmids can cross genus + family boundaries. NDM-1 (a carbapenem-resistance gene first identified in India 2008) has spread to ~6 continents via conjugative plasmids in ~15 years.'
                }
              ];
              var sel = MECHS.find(function(m) { return m.id === d.selectedHGT; }) || MECHS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'Bacteria don\'t just inherit genes from parents (VERTICAL transmission). They also SHARE genes with neighbors + sometimes with completely unrelated species (HORIZONTAL gene transfer). This is why antibiotic resistance spreads so fast: a resistance gene that evolves in one bacterium can be in a hundred different species within years. There are three main mechanisms.'
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
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What happens'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Discovery + science'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.how)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Examples / where it matters'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.examples)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Speed + reach'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.rate)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'Why HGT shapes the resistance crisis: '),
                  'A resistance gene only needs to evolve ONCE in any bacterium anywhere on Earth. From there, conjugation can spread it across hundreds of species. By the time clinicians notice the resistance in patients, the gene may already be present in dozens of bacterial species worldwide. The NDM-1 gene first identified in 2008 is now found in ~70 countries + multiple bacterial families. This is why the "spread to other countries" is essentially guaranteed once a resistance gene exists.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, 'HGT in evolution: '),
                  'The traditional "tree of life" with clean branches works for animals + plants — they mostly inherit genes vertically. Bacterial + archaeal evolution is more like a "web of life" because of constant horizontal transfer. About 8% of the human genome is virus-derived (from past retroviral infections); some of those genes are now essential (placenta development uses retroviral genes). HGT is not just a curiosity — it has shaped the genomes of every organism on Earth, including us.'
                )
              );
            })(),
            '#0ea5e9'
          ),

          sectionCard('💊 How antibiotics actually work (and what resistance breaks)',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'Antibiotics are NOT all the same. Each class attacks a different essential bacterial function. Bacteria can evolve resistance to one mechanism without losing susceptibility to others. Knowing which class is which is the foundation of antibiotic stewardship — and the reason we still have working drugs.'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 } },
                [
                  { name: 'Beta-lactams (penicillin, amoxicillin, cephalosporins, carbapenems)', target: 'Cell wall (peptidoglycan synthesis)',
                    how: 'Block the enzyme that cross-links peptidoglycan strands. The bacterium tries to divide, can\'t build a wall, ruptures. Only works on actively dividing bacteria.',
                    resists: 'Bacteria produce β-lactamase enzymes that destroy the antibiotic. ESBL (extended-spectrum) and carbapenemase-producing bacteria break almost all β-lactams.',
                    color: '#22c55e' },
                  { name: 'Aminoglycosides (gentamicin, streptomycin, tobramycin)', target: 'Protein synthesis (30S ribosome)',
                    how: 'Bind the 30S ribosome subunit and cause mistranslation. Bacterial proteins fold wrong; cell dies.',
                    resists: 'Bacteria acquire enzymes that chemically modify the antibiotic before it can bind. Or change the ribosome target. Or pump it out.',
                    color: '#0ea5e9' },
                  { name: 'Tetracyclines (doxycycline, minocycline)', target: 'Protein synthesis (30S ribosome)',
                    how: 'Block the binding of tRNA to the ribosome. Protein synthesis stops.',
                    resists: 'Efflux pumps that physically remove the antibiotic from the cell. Ribosomal protection proteins. Most tetracycline resistance is plasmid-borne.',
                    color: '#0ea5e9' },
                  { name: 'Macrolides (azithromycin, erythromycin)', target: 'Protein synthesis (50S ribosome)',
                    how: 'Bind the 50S ribosome subunit and block protein elongation. The growing peptide can\'t exit the ribosome.',
                    resists: 'Methylation of the ribosomal RNA (so the antibiotic can\'t bind). Efflux pumps. Often co-resistance with clindamycin (D-test).',
                    color: '#a855f7' },
                  { name: 'Fluoroquinolones (ciprofloxacin, levofloxacin)', target: 'DNA replication (DNA gyrase + topoisomerase)',
                    how: 'Block the enzymes that supercoil + uncoil bacterial DNA during replication. Replication forks collapse. Cell dies.',
                    resists: 'Mutations in the gyrA/parC genes change the target. Efflux pumps. Quinolone resistance has risen dramatically in the last 20 years.',
                    color: '#f59e0b' },
                  { name: 'Sulfonamides + trimethoprim', target: 'Folate synthesis',
                    how: 'Block two steps of bacterial folate (vitamin B9) synthesis. Without folate, bacteria can\'t make DNA. Humans get folate from food — we are not affected.',
                    resists: 'Acquired enzymes with altered active sites that the drugs can\'t inhibit. Folate uptake systems.',
                    color: '#ec4899' },
                  { name: 'Glycopeptides (vancomycin)', target: 'Cell wall (D-Ala-D-Ala terminus)',
                    how: 'Bind directly to the D-Ala-D-Ala terminus of peptidoglycan precursors, physically blocking wall assembly. Last-line drug for MRSA + many Gram-positives.',
                    resists: 'VanA/VanB resistance changes the terminus to D-Ala-D-Lac, which vancomycin can\'t bind. VRE (vancomycin-resistant Enterococcus) and VRSA (vancomycin-resistant Staph) are growing problems.',
                    color: '#ef4444' }
                ].map(function(c, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + c.color } },
                    h('div', { style: { fontSize: 12.5, fontWeight: 800, color: c.color, marginBottom: 4 } }, c.name),
                    h('div', { style: { fontSize: 10.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, 'Target: ' + c.target),
                    h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55, marginBottom: 6 } }, h('strong', null, 'How it works: '), c.how),
                    h('div', { style: { fontSize: 11, color: '#fca5a5', lineHeight: 1.5, fontStyle: 'italic' } }, h('strong', null, 'How resistance breaks it: '), c.resists)
                  );
                })
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.35)', fontSize: 12, color: '#fde68a', lineHeight: 1.6 } },
                h('strong', null, 'Key insight: '),
                'Antibiotics that work via the cell wall (β-lactams, vancomycin) are useless against organisms without a typical bacterial cell wall — including all viruses, fungi, and humans. This is why antibiotics don\'t treat the flu or a cold. The body has no equivalent target.'
              )
            ),
            '#fbbf24'
          ),
          sectionCard('What accelerates resistance',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.8 } },
              h('li', null, 'Antibiotics prescribed for viral infections (antibiotics don\'t work on viruses).'),
              h('li', null, 'Not finishing the full course (kills the susceptible, leaves the partially-resistant).'),
              h('li', null, 'Antibiotics in animal feed for growth promotion (now banned in EU; still common elsewhere).'),
              h('li', null, 'Poor sanitation + crowded conditions in hospitals + jails + refugee camps.'),
              h('li', null, 'Lack of new antibiotic development. The pipeline has slowed for 40 years.')
            )
          ),
          sectionCard('What helps',
            h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.8 } },
              h('li', null, h('strong', null, 'For you: '), 'Take antibiotics only when prescribed; finish the course exactly. Don\'t demand antibiotics for colds or flu. Don\'t take leftover antibiotics or someone else\'s.'),
              h('li', null, h('strong', null, 'For the world: '), 'Public investment in new antibiotic development. Restrictions on agricultural use. Phage therapy research. Better infection control in hospitals. Vaccines that prevent infection in the first place.'),
              h('li', null, h('strong', null, 'Big picture: '), 'Stop treating antibiotics as a renewable resource. Each one is a one-shot weapon; once resistance is widespread, that antibiotic is gone forever.')
            )
          ),

          sectionCard('🎯 Phage therapy — the antibiotic alternative',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Bacteriophages (or just "phages") are viruses that infect bacteria — and ONLY bacteria, never human cells. The most abundant biological entity on Earth (~10³¹ of them). They were discovered in 1915-17 + used as antibacterial therapy in the Soviet Union throughout the 20th century. Western medicine largely abandoned them after antibiotics took off in the 1940s — but the antibiotic resistance crisis is bringing phage therapy back.'
              ),
              h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #6ee7b7', marginBottom: 10 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, 'Why phages are uniquely promising:'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.75 } },
                  h('li', null, h('strong', null, 'Self-replicating: '), 'A single phage multiplies inside the bacterial host. One dose can grow into trillions, kill the infection, then disappear as targets run out.'),
                  h('li', null, h('strong', null, 'Highly specific: '), 'Each phage strain targets only one (or a few) bacterial species — no collateral damage to the gut microbiome. Antibiotics kill broadly; phages are surgical.'),
                  h('li', null, h('strong', null, 'Evolvable in real time: '), 'When bacteria evolve resistance to a phage, scientists can re-isolate phages from sewage or soil that have already evolved counter-resistance. The arms race never stops.'),
                  h('li', null, h('strong', null, 'Active against biofilms: '), 'Phages can penetrate biofilms where antibiotics fail. Several phage cocktails specifically target biofilm-forming pathogens.'),
                  h('li', null, h('strong', null, 'Free of antibiotic resistance: '), 'A phage that kills MRSA does so by an entirely different mechanism than methicillin. The MRSA bacteria\'s resistance to the antibiotic is irrelevant.')
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65, marginBottom: 10 } },
                h('strong', null, 'The complications: '),
                h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                  h('li', null, h('strong', null, 'Identification needed: '), 'Treatment requires knowing the exact bacterial strain + having a phage that targets it. Takes days for the lab work — sometimes longer than antibiotic empirical treatment would.'),
                  h('li', null, h('strong', null, 'Regulatory pathway: '), 'Each phage cocktail is its own biological product. The FDA + EMA frameworks are designed for chemical drugs, not self-evolving viruses. "Compassionate use" + Phase I/II trials are progressing.'),
                  h('li', null, h('strong', null, 'Immune response: '), 'The body produces antibodies against the phage over time, neutralizing it. Multiple-dose regimens face this challenge.'),
                  h('li', null, h('strong', null, 'Bacterial defense: '), 'Bacteria evolve resistance to phages too (CRISPR is one of their defenses!). Phage cocktails — multiple phages with different targets — are used to slow this.')
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                h('strong', null, 'Where it stands clinically: '),
                'Georgia + Russia have continued phage therapy clinically since the 1920s (Eliava Institute in Tbilisi treats ~5,000 patients/year). In the US + EU, phage therapy is currently "expanded access" / compassionate use only — given case-by-case for life-threatening multi-drug-resistant infections. ~100+ patients have been treated this way in the US since 2016. Several Phase II clinical trials are running in 2024-25 (Locus Biosciences, Armata Pharmaceuticals, Adaptive Phage Therapeutics, BiomX). First FDA-approved phage product is widely expected within ~5 years.'
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, 'A famous case (2017, San Diego): '),
                'Tom Patterson, a UCSD psychiatry professor, contracted a multidrug-resistant Acinetobacter baumannii infection while traveling in Egypt. After 9 months in a coma + every available antibiotic failing, his wife (epidemiologist Steffanie Strathdee) coordinated with Navy + UCSD researchers to compile a personalized phage cocktail from sewage samples around the world. He recovered. The case (documented in their 2019 book "The Perfect Predator") was a turning point in US medical interest in phage therapy.'
              )
            ),
            '#6ee7b7'
          )
        );
      }

      // MICROBIOME
      function renderMicrobiome() {
        var selected = MICROBIOME.find(function(m) { return m.id === d.selectedMicrobiome; }) || MICROBIOME[0];
        var STAGES = [
          { id: 'preg', name: 'In utero', age: '0-9 months', color: '#a855f7',
            what: 'Long believed STERILE, this view is now being revised. Some bacterial DNA has been detected in placenta + amniotic fluid (still contested — may be contamination). The fetus is largely shielded from environmental microbes. The mother\'s microbiome shapes what the baby will be exposed to at birth.',
            shape: 'Maternal diet during pregnancy, antibiotic use, gestational diabetes, mode of stress all influence the baby\'s eventual microbiome trajectory.'
          },
          { id: 'birth', name: 'Birth + first 6 months', age: '0-6 mo', color: '#ec4899',
            what: 'The critical seeding event. VAGINAL birth coats the baby in maternal vaginal + fecal microbes (Lactobacillus, Bifidobacterium dominate). CESAREAN birth seeds primarily skin microbes (Staphylococcus, Streptococcus) — a very different community. Breast milk delivers Bifidobacterium PLUS specific oligosaccharides (HMOs) that ONLY those bacteria can digest — milk literally feeds the bacteria that protect the baby.',
            shape: 'Mode of birth, antibiotic exposure (intrapartum or postnatal), breastfeeding vs formula, family pets, household biodiversity. The first 6 months of microbiome establishment correlate strongly with later asthma + allergy risk.'
          },
          { id: 'weaning', name: 'Solid food introduction', age: '6 mo - 2 yr', color: '#22c55e',
            what: 'Solid food → diversification. The infant gut goes from a milk-adapted community (Bifidobacterium-dominated) to an adult-like community (Bacteroidetes + Firmicutes-dominated). Fiber arrives + feeds fiber-fermenters. The full adult microbial diversity is reached around age 3.',
            shape: 'Diet variety, sugar consumption (high sugar suppresses Bifidobacterium), antibiotic courses (each one can permanently shift the trajectory), household + childcare environment.'
          },
          { id: 'child', name: 'Childhood + teens', age: '2-18', color: '#10b981',
            what: 'Microbiome composition is relatively stable but plastic. Each major dietary change (more carbs, more protein, more sugar, more fiber) shifts community composition within days. The "core" microbiome — about 30-40 species making up the majority — persists in most people.',
            shape: 'Diet (the biggest single lever), antibiotic use, physical activity (active kids have more diverse gut microbiomes), pets + outdoor time, stress, sleep.'
          },
          { id: 'adult', name: 'Adulthood', age: '18-65', color: '#0ea5e9',
            what: 'Relatively stable in a healthy person on a stable diet. Major life events (giving birth, immigration to a new country, severe illness, sustained dietary change) can shift the community for years. The Western "industrialized" microbiome (low fiber, high processed food) is consistently less diverse than traditional or non-industrialized populations.',
            shape: 'Diet remains dominant. Geography + culture + occupation. Acute illness + antibiotics. Major life stress. Pregnancy (for those who carry it) is the biggest natural perturbation.'
          },
          { id: 'preg2', name: 'Pregnancy (the pregnant adult)', age: 'during pregnancy', color: '#fbbf24',
            what: 'Maternal microbiome shifts dramatically — gut Bifidobacterium increases, vaginal Lactobacillus increases, oral microbiome shifts toward inflammation-promoting species (which is why dental care matters in pregnancy). These shifts likely tune the maternal immune system to tolerate the developing fetus.',
            shape: 'Maternal diet, weight gain, antibiotic exposure, pre-existing conditions. The microbiome the mother carries during pregnancy is what seeds the baby at birth.'
          },
          { id: 'aging', name: 'Aging (65+)', age: '65+', color: '#94a3b8',
            what: 'Microbiome diversity tends to DECLINE with age in industrialized populations. Specific bacteria associated with anti-inflammatory function (Faecalibacterium, Akkermansia) decrease. "Inflammaging" — chronic low-grade inflammation — is partly mediated by microbiome changes. Diet quality + activity level have outsized impact in older adults.',
            shape: 'Diet (especially fiber + plant variety, since older adults often reduce diversity unintentionally), polypharmacy (most drugs alter the gut microbiome), constipation, hospitalization, social isolation (less microbial exchange).'
          },
          { id: 'centenarian', name: 'Centenarians', age: '100+', color: '#f59e0b',
            what: 'People who reach 100+ in good health have distinctive microbiomes — often retaining diversity + anti-inflammatory bacteria more typical of much younger people. Studies of centenarian populations in Italy, Japan, Sardinia, and Costa Rica show similar "youthful microbiome" patterns despite different diets.',
            shape: 'Lifelong diet + activity + stress + genetics + sociality. Centenarians often have particularly rich social networks, which correlates with microbial diversity (social contact = microbial exchange).'
          }
        ];
        var sel = STAGES.find(function(s) { return s.id === d.selectedLifeStage; }) || STAGES[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'A microbiome is the community of microbes in a particular environment. The human microbiome is now recognized as an organ — collectively essential for health, with disruption linked to obesity, diabetes, autoimmune disease, allergies, and mood disorders. Different from any individual organ: it is many species cooperating + competing + co-evolving with the host.'
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
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginBottom: 12 } },
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Count'),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.count)
              ),
              h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a' } },
                h('div', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' } }, 'Species'),
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#e2e8f0' } }, selected.species)
              )
            ),
            h('p', { style: { margin: '0 0 8px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } }, selected.what),
            h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'What shapes it'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.shaped)
            )
          ),

          sectionCard('🌱 The microbiome across a lifespan',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'The gut microbiome assembles in infancy, reaches adult-like complexity around age 3, remains relatively stable through adulthood, and tends to decline in diversity with age. Each life stage has characteristic microbial patterns + characteristic interventions that shape them.'
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
              h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8, flexWrap: 'wrap' } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color } }, sel.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, sel.age)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What\'s happening'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.65 } }, sel.what)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What shapes it'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.65 } }, sel.shape)
                )
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, 'The first 1,000 days: '),
                'Conception → 2nd birthday. The most consequential window for microbiome shaping. Vaginal vs cesarean birth, breastfeeding duration, antibiotic exposure, daycare attendance, household pets — all influence the microbiome the child carries into adulthood. Many adult health outcomes (asthma, allergies, autoimmune conditions, obesity risk) correlate with first-1,000-day microbial events. Interventions to support healthy infant microbiome assembly (vaginal seeding for C-section babies, careful antibiotic stewardship, breastfeeding support) are actively researched + sometimes practiced.'
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                h('strong', null, 'What you can do, at any life stage: '),
                'Eat 30+ different plant species per week (the strongest single predictor of gut microbiome diversity in the American Gut Project + similar studies). Limit antibiotic use to clear medical necessity. Sleep enough. Maintain social contact + outdoor time. Manage chronic stress. Consume fermented foods regularly. Reduce ultra-processed foods. The microbiome is one of the most modifiable aspects of human health — most days you make food + lifestyle choices that shape it.'
              )
            ),
            '#a855f7'
          ),

          // ─── Human virome ────────────────────────────────────────
          sectionCard('🧬 The human virome — viruses inside us all the time',
            (function() {
              var VIROME_TOPICS = [
                { id: 'overview', name: 'What the virome is', emoji: '🌐',
                  body: 'When we talk about "the microbiome," most coverage is about bacteria. But for every bacterial cell in or on the human body, there are roughly 10× more virus particles. The human virome is the total collection of viruses living in us: bacteriophages (viruses that infect our gut + skin + oral bacteria, vastly outnumbering everything else), eukaryotic viruses (those that infect our human cells, including persistent latent ones), and endogenous retroviruses (viral DNA permanently integrated into our genome from infections in our distant ancestors). Most virome residents are not making us sick. Many appear to be neutral or even beneficial. We are walking, eating, sleeping ecosystems.',
                  caveat: 'Virome science is younger + harder than bacterial-microbiome science. Viruses have no universal gene (no equivalent to bacterial 16S rRNA) you can amplify to ID them. Sequencing approaches must shotgun-sequence everything + then try to identify viral sequences against incomplete databases. Most virome sequences are STILL unidentified ("viral dark matter"); a typical gut virome metagenomic survey returns 50-90% sequences with no database match.'
                },
                { id: 'phages', name: 'Bacteriophages in us', emoji: '🦠',
                  body: 'Bacteriophages ("phages") are viruses that infect bacteria. They are the most numerous biological entities on Earth — about 10³¹ phage particles globally, more than all bacteria + plants + animals combined. The human gut alone contains an estimated 10¹⁴ phage particles, dwarfing our ~10¹³ bacterial cells. Most are dsDNA phages of the Caudovirales (tailed phages); a smaller fraction are crAssphage + other newly-discovered groups. Phages are constantly killing some gut bacteria + leaving others alone, shaping bacterial community composition at the species + strain level. Some phages are "temperate" (they integrate into the bacterial genome + sometimes carry virulence or antibiotic-resistance genes around).',
                  caveat: 'Phage therapy (using specific phages to kill specific pathogenic bacteria) is being re-explored for antibiotic-resistant infections. Western medicine largely abandoned it in the 1940s when antibiotics came along; Eastern European countries (especially Georgia, the Eliava Institute in Tbilisi) continued. As antibiotic resistance worsens, Western interest has returned. A handful of dramatic case reports (e.g., the 2017 Patterson case at UC San Diego, where a phage cocktail saved a man dying of multidrug-resistant Acinetobacter) have driven new clinical trials. Real promise; not yet a mainstream therapy.'
                },
                { id: 'latent', name: 'Latent persistent viruses', emoji: '😴',
                  body: 'After acute infection, many viruses do not actually leave. Herpes simplex (HSV-1, HSV-2), varicella-zoster (chickenpox, which reactivates as shingles), Epstein-Barr (mononucleosis), cytomegalovirus (CMV), and human herpesviruses 6/7/8 all establish lifelong latent infections. They are usually controlled by the immune system + cause no disease, but can reactivate during immunosuppression, stress, or aging. Adult Americans typically carry at least 4-8 different lifelong viral infections without symptoms. Anelloviruses (Torque Teno Virus + relatives) are present in essentially 100% of healthy adults at varying titers; their function is unknown.',
                  caveat: 'The line between "harmless lifelong passenger" + "subtly contributing to chronic disease" is fuzzy. EBV → multiple sclerosis (Bjornevik 2022). HHV-6A → MS + possibly some cases of chronic fatigue syndrome. CMV → modest accelerated immunosenescence + cardiovascular risk. We do not yet know how much of "normal aging" is partly driven by the lifelong work of suppressing latent viruses.'
                },
                { id: 'ervs', name: 'Endogenous retroviruses (the genome\'s past)', emoji: '🧬',
                  body: 'About 8% of the human genome consists of endogenous retroviruses (ERVs) — DNA sequences from ancient retroviral infections that successfully integrated into germ-line cells (sperm + eggs) of our distant ancestors, were passed on, and have remained in the genome ever since. To put 8% in perspective: only about 1.5% of the genome is protein-coding genes. We carry more ancient retrovirus DNA than we carry the DNA that codes for our proteins. Most ERVs are degraded by mutation + no longer make functional viruses, but some retain partial function. ERV proteins are USED by our cells for some normal functions — the syncytin proteins (from ancient retroviruses) are essential for forming the placenta in mammals; without them, mammalian pregnancy as we know it could not exist.',
                  caveat: 'ERVs occasionally reactivate in disease states — some cancers, some autoimmune conditions (lupus, MS), some neurodegenerative diseases show elevated ERV transcription. Whether ERVs are CAUSING those conditions or merely co-traveling with the dysregulation is mostly unsettled. Don\'t panic about ERV transcription; investigate it.'
                },
                { id: 'whoseviome', name: 'Whose virome are you?', emoji: '👥',
                  body: 'Each person\'s virome is highly individualized. Two people sharing a household for years end up with overlapping but not identical bacterial AND viral communities. Partners + family members share more phage strains than strangers. Diet, geography, antibiotic history, and (probably) genetics + ethnicity all shape virome composition. Newborns get their first viruses from mom (vaginal + breastmilk transmission of phages + some eukaryotic viruses); children diverge from their mothers\' viromes over years of independent acquisition. By adulthood, your virome is more uniquely yours than your bacterial microbiome (because viral strains evolve fast in vivo).',
                  caveat: 'Forensic identification by virome signature has been demonstrated experimentally — your unique phage fingerprint could in principle identify you. This is interesting science + has obvious privacy implications. Currently impractical for routine forensics, but as sequencing gets cheaper, the ethics conversation is worth starting now rather than after the fact.'
                },
                { id: 'disease', name: 'When the virome goes wrong', emoji: '⚠️',
                  body: 'Specific virome shifts have been associated with several diseases. (a) Inflammatory bowel disease (Crohn\'s, ulcerative colitis) shows expanded Caudovirales phage diversity in some studies — possibly cause, possibly consequence of the disease. (b) Type 1 diabetes onset has been linked to enterovirus infections, particularly Coxsackie B viruses, in some prospective cohort studies (TEDDY study). (c) Chronic fatigue syndrome / ME has been linked to multiple viral triggers (EBV, HHV-6A, enteroviruses, and most recently SARS-CoV-2) — likely a heterogeneous syndrome with multiple potential triggers + a common downstream pathway. (d) Long COVID appears in at least some patients to involve persistent viral reservoirs + immune dysregulation; emerging evidence suggests reactivation of latent EBV + HHV-6 in subsets.',
                  caveat: 'The replicability problem is real. Many "the virome causes disease X" studies do not replicate in independent cohorts. The field is grappling with technical (sequencing artifacts, contamination, viral databases incomplete) + biological (the virome varies day-to-day; one snapshot may be unrepresentative) limits. Take any single virome-disease headline with appropriate skepticism + wait for replication.'
                },
                { id: 'covid', name: 'What COVID taught us', emoji: '🦠',
                  body: 'SARS-CoV-2 has been the most-studied virome event in human history. Real-time tracking via wastewater + genomic sequencing showed virome biology at a scale + speed previously unimaginable. Lessons: (a) Persistent infection happens (long COVID; viral RNA detected in tissues months-years after acute illness in some patients). (b) Latent virus reactivation is a real phenomenon (EBV, VZV, HHV-6 reactivation rates appear elevated in long COVID). (c) Coronaviruses + other respiratory viruses leave epigenetic + immune-cell-population imprints that may last years (the "immune dysregulation" framing). (d) The next pandemic will probably come from the virome — either a re-emergence of a known virus in a new host, or a spillover from animal reservoirs we have been undersurveying.',
                  caveat: 'COVID also showed how fragile public-health trust is, how badly scientific uncertainty communicates in real-time crises, and how political the "follow the science" framing actually is. As school psychologists + educators we owe students an honest account: science behaved as designed (revising as evidence accumulated) while the politics + communication around it were often poor.'
                },
                { id: 'limits', name: 'Honest limits of virome science', emoji: '🚧',
                  body: 'We can sequence viral genomes by the millions per year. We can NOT yet (a) culture most of the viruses we detect (they only grow on their natural hosts, which we cannot maintain in lab), (b) confidently distinguish "viral signal" from "lab contamination + reagent kit ambient virus," (c) interpret the function of most viral genes (the proteins look like nothing we have studied), (d) reliably tell whether a virus seen in a sample is causative, opportunistic, or just a passenger. Microbiome studies have hit the same wall + been partly transformed by better controls; virome science is roughly where microbiome science was 15 years ago. The next decade should be transformative.',
                  caveat: 'Be skeptical of confident claims about "the role of the virome" in any specific disease. Be open to surprises. Both can be true at once. The honest professional stance is: this is a frontier; the answers are coming; we are not there yet.'
                }
              ];
              var sel = d.selectedVirome || 'overview';
              var topic = VIROME_TOPICS.find(function(t) { return t.id === sel; }) || VIROME_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'You are not just you. You are also a few hundred trillion virus particles, a few thousand viral species, the descendants of ancient retroviruses written permanently into your DNA, and a handful of latent infections kept quiet by your immune system. The virome is the OTHER half of microbiome biology — and one of the fastest-moving frontiers in medicine.'
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
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                )
              );
            })(),
            '#8b5cf6'
          ),

          // ─── Gut-brain axis ──────────────────────────────────────
          sectionCard('🧠 The gut-brain axis — bacteria and behavior',
            (function() {
              var GBA_TOPICS = [
                { id: 'overview', name: 'What the gut-brain axis is', emoji: '🛤️',
                  body: 'The gut + the brain are connected by several physical channels, all running constantly. The vagus nerve carries about 100 million sensory neurons from the gut to the brainstem (about 80% of vagus fibers go UP from gut → brain, only 20% go DOWN from brain → gut). The enteric nervous system itself — about 500 million neurons in the gut wall, sometimes called the "second brain" — operates with substantial autonomy. Gut bacteria + their metabolites enter the bloodstream + cross or signal across the blood-brain barrier. Immune signaling from gut-resident immune cells communicates with the brain via cytokines. Hormonal signaling (e.g., bacteria-influenced bile acids, hormones from gut endocrine cells) feeds back into central regulation. This is not one pathway; it is many parallel pathways running in both directions.',
                  caveat: 'The phrase "gut-brain axis" sometimes makes it sound like a single new system. It is actually a useful umbrella for known anatomy + biochemistry, much of which we have known about for decades. What is newer is the recognition that BACTERIA in the gut actively shape this signaling — that the microbiome is a participant, not just a passenger.'
                },
                { id: 'vagus', name: 'The vagus nerve as the highway', emoji: '🛣️',
                  body: 'The vagus is the 10th cranial nerve, the longest nerve in the autonomic nervous system. It innervates the heart, lungs, and most of the digestive tract. It carries information about gut wall stretch, pH, immune activation, hormone signals, and bacterial metabolites to brainstem nuclei (nucleus tractus solitarius), which then communicate to higher brain regions (insula, amygdala, prefrontal cortex). Vagal afferent signaling is part of how you know you are full, how nausea is generated, why stomach distress affects mood, and how stress shows up in the gut. Vagus nerve stimulation (VNS) is FDA-approved for treatment-resistant epilepsy + depression, with the underlying mechanism still being mapped.',
                  caveat: 'The 80/20 gut → brain ratio for vagal fibers is sometimes stated as overwhelming evidence that "the gut controls the brain." That overstates the case. The brain has many other input streams (vision, hearing, every other sensory + interoceptive channel) AND has very strong descending control. The gut-brain conversation is genuinely two-way; the vagal asymmetry is one data point, not the whole story.'
                },
                { id: 'metabolites', name: 'Bacterial metabolites that act like drugs', emoji: '💊',
                  body: 'Gut bacteria produce many small molecules that enter circulation + affect brain function. Short-chain fatty acids (SCFAs — acetate, propionate, butyrate) are made by bacterial fermentation of dietary fiber. Butyrate is the main energy source for colon cells + has anti-inflammatory effects throughout the body, including reduced microglial activation in the brain. Tryptophan metabolism is dramatically influenced by gut bacteria — some species shunt tryptophan toward serotonin precursors, others toward the kynurenine pathway (which produces both protective + neurotoxic compounds). Lipopolysaccharide (LPS), from Gram-negative bacterial cell walls, leaks across an inflamed gut barrier ("leaky gut") + triggers low-grade systemic inflammation that influences mood + cognition. Bile acid metabolism is co-regulated by liver + bacteria; bile acid signaling reaches the brain.',
                  caveat: 'Most bacterial-metabolite-to-brain pathways are characterized in mice + cell culture, with limited human evidence. The signals are real; the magnitude of effect in humans is still being measured. Be cautious of supplements claiming to "boost gut-brain butyrate." The body produces butyrate locally in the colon in large quantities; oral supplements have very poor bioavailability + minimal evidence of brain effect.'
                },
                { id: 'depression', name: 'Microbiome + depression', emoji: '😞',
                  body: 'Patients with major depressive disorder show measurable differences in gut microbiome composition compared to non-depressed controls (lower diversity, lower abundance of Faecalibacterium prausnitzii + several Bacteroides species, altered Firmicutes/Bacteroidetes ratio). Fecal microbiota transplant from depressed humans to germ-free mice transfers some depressive-like behaviors (Kelly 2016, Zheng 2016). Specific probiotics (mostly Lactobacillus + Bifidobacterium strains, sometimes called "psychobiotics") have shown modest antidepressant effects in some randomized trials. The strongest single dietary signal: a Mediterranean-style diet, with high fiber + plant diversity + fermented foods, is associated with lower depression risk in multiple longitudinal cohorts (PREDIMED, SMILES, Helfimed trials).',
                  caveat: 'Causality vs correlation remains hard. Depression itself changes eating + sleep + activity patterns, which change the microbiome. Disentangling cause from effect requires longitudinal + interventional studies, which are slow + expensive. Be honest with families: "your gut bacteria may matter for mood" is reasonable; "your depression is caused by your microbiome" is not yet supported. The strongest evidence-based mental health interventions (CBT, exercise, sleep, medication when indicated, social connection) remain primary.'
                },
                { id: 'anxiety', name: 'Anxiety + stress reactivity', emoji: '😰',
                  body: 'Germ-free mice (raised completely without bacteria) show EXAGGERATED stress responses (elevated cortisol, exaggerated HPA-axis activation) compared to conventionally-colonized mice. Colonizing germ-free mice with specific bacterial communities can normalize stress responses. In humans, a small but growing set of trials has shown that specific probiotic blends (e.g., Lactobacillus helveticus + Bifidobacterium longum) modestly reduce self-reported anxiety + cortisol response to a stressor. The mechanism appears to involve vagal afferent signaling + altered tryptophan metabolism. Most effects are small in magnitude + variable across studies.',
                  caveat: 'School psychologists + counselors should NOT prescribe probiotics for anxiety. But it is reasonable to discuss with families that diet quality, fiber intake, and gut health appear to influence stress reactivity, alongside the evidence-based interventions (CBT, exposure therapy, parent training, mindfulness, sleep hygiene). The microbiome conversation is an addition to, not a substitute for, the things we already know help.'
                },
                { id: 'autism', name: 'Autism + the gut — careful framing', emoji: '🌈',
                  body: 'Autistic children show, on average, gut microbiome differences from non-autistic peers (lower diversity, altered Clostridia abundance, etc.) + significantly higher rates of GI symptoms (constipation, diarrhea, food selectivity). Several small open-label studies of fecal microbiota transplant in autistic children (Kang 2017, 2019) reported reductions in GI symptoms and in some behavioral measures. Larger controlled trials are ongoing. The mechanism could be direct (gut bacteria affect brain via vagus + metabolites) or indirect (less GI pain → fewer behavioral disruptions; better nutrition → better functioning).',
                  caveat: 'This area has been MASSIVELY oversold by alternative-medicine practitioners. "Heal the gut, cure autism" is not what the evidence supports + the framing is harmful. Autism is a neurodevelopmental difference, not a disease to be cured. The respectful, identity-first framing is: many autistic children have GI symptoms that deserve real medical attention, and addressing those symptoms may improve quality of life — without changing who they are. The autistic community has been clear about preferring identity-first language ("autistic person") + has been harmed by past "treatment" cultures that emphasized "fixing" rather than supporting. School psychologists should default to this framing.'
                },
                { id: 'pdpark', name: 'Parkinson\'s starts in the gut?', emoji: '🌀',
                  body: 'Heiko Braak proposed in 2003 that Parkinson\'s disease pathology may begin in the enteric nervous system + olfactory bulb, then travel via the vagus nerve up to the brainstem + spread through the brain. Several lines of evidence support this. (a) Constipation is one of the EARLIEST symptoms of PD, often appearing 10-20 years before motor symptoms. (b) Lewy body pathology (α-synuclein aggregates) is found in the gut nervous system of PD patients. (c) Vagotomy (surgical cutting of the vagus nerve, historically done for ulcer treatment) appears to slightly reduce PD risk in long-term epidemiological follow-up (Svensson 2015 Danish cohort, supportive Liu 2017 Swedish cohort). (d) The gut microbiomes of PD patients differ from controls before motor symptoms develop. PD may be partly a disease that originates in the gut + spreads to the brain over years.',
                  caveat: 'The Braak hypothesis remains contested. PD almost certainly has multiple subtypes — some "gut-first" + some "brain-first." Single-cause framing oversimplifies. But the hypothesis is taken seriously enough that prevention research is exploring gut-targeted interventions (early treatment of H. pylori + SIBO, fiber-rich diets, fecal microbiota approaches) as possible PD-risk-reducing strategies. None established yet.'
                },
                { id: 'practical', name: 'What this means for everyday life', emoji: '🥗',
                  body: 'The strongest evidence-based practical takeaways from gut-brain research: (1) High-fiber + high-plant-diversity diets are associated with better mood + lower depression risk, and with measurable favorable microbiome composition. (2) Fermented foods (yogurt, kefir, kimchi, sauerkraut) modestly increase microbiome diversity + lower inflammatory markers (Sonnenburg lab, Stanford, 2021 published in Cell). (3) Antibiotic stewardship matters — every course of antibiotics has measurable effects on the gut microbiome lasting months to years. Use them when needed; don\'t take them when not. (4) Sleep, exercise, social connection, time outdoors all affect the microbiome alongside their direct effects on mental health. (5) For school-age kids, the strongest microbiome-supportive interventions look exactly like the interventions we already recommend for general health.',
                  caveat: 'The gut-brain axis is not a magic supplement aisle. Probiotic pills bought at a pharmacy have inconsistent strain composition + dose + survival, and most clinical trials show small effects at best. Whole-diet interventions consistently outperform single-strain probiotics. The interventions that work are the unglamorous ones: vegetables, beans, whole grains, fermented foods, sleep, exercise, fewer ultra-processed snacks.'
                }
              ];
              var sel = d.selectedGBA || 'overview';
              var topic = GBA_TOPICS.find(function(t) { return t.id === sel; }) || GBA_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'The idea that our gut bacteria influence our mood + behavior was treated as fringe in the 1990s. It is now a mainstream + rapidly growing research area, with thousands of papers + multiple textbooks. The science is real, the magnitude of effects in humans is still being measured, and the area is also being heavily oversold by supplement marketing. The respectful position: take the science seriously, separate hype from evidence, do not abandon what already works.'
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
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.3)', fontSize: 11.5, color: '#fda4af', lineHeight: 1.65 } },
                  h('strong', null, 'A note for educators + counselors: '),
                  'Students + families sometimes encounter aggressive marketing of probiotics, "gut healing protocols," restrictive diets, and supplements claiming to cure mental health conditions. The respectful response is not to dismiss interest in gut-brain biology (the science is real) but to redirect toward evidence-based whole-diet patterns + the standard mental health toolkit. Honor the curiosity; protect the family budget from snake oil; never frame a child as broken-and-needing-fixing.'
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
          { id: 'oil', name: 'Oil spill cleanup', color: '#fbbf24',
            microbe: 'Alcanivorax borkumensis, Pseudomonas putida, certain Rhodococcus species — collectively "hydrocarbon-degrading bacteria."',
            how: 'These naturally-occurring marine bacteria use hydrocarbons as their energy source. After an oil spill, populations bloom + chew through petroleum compounds, converting them to CO₂ + water + biomass. Often supplemented with nitrogen + phosphorus to stimulate growth.',
            example: '1989 Exxon Valdez (Alaska) + 2010 Deepwater Horizon (Gulf of Mexico). Bioremediation accelerated cleanup of both. About 50% of the Deepwater Horizon oil was degraded by microbes within months — far faster than any mechanical recovery could have done. Light + medium fractions degrade fastest; heavy + aromatic compounds slower.',
            limits: 'Cold water + lack of oxygen + lack of nitrogen all slow microbial degradation. Cannot dissolve into solid asphalt-like residues. Not effective in deep sediments where oxygen is absent.'
          },
          { id: 'plastic', name: 'Plastic-degrading enzymes', color: '#0ea5e9',
            microbe: 'Ideonella sakaiensis 201-F6 (discovered 2016 in a Japanese recycling facility) + engineered variants of its enzymes PETase + MHETase.',
            how: 'Naturally evolved to digest PET (polyethylene terephthalate — the plastic in water bottles + polyester). The enzymes hydrolyze PET\'s ester bonds into the constituent monomers (terephthalic acid + ethylene glycol) which can be re-polymerized into new PET. Effectively closed-loop recycling — without burning, without virgin petroleum.',
            example: 'French company Carbios is operating a pilot facility that demonstrates ~90% PET-to-monomer conversion in hours. Engineered "FAST-PETase" + similar variants are 10-100× more efficient than the original. Full industrial-scale plant scheduled for 2025-26.',
            limits: 'Only works on PET. Polyethylene (PE), polypropylene (PP), polystyrene (PS), PVC — the bulk of plastic waste — currently has no good enzymatic solution. Active research on enzymes for the other plastics.'
          },
          { id: 'mining', name: 'Bioleaching (biomining)', color: '#a16207',
            microbe: 'Acidithiobacillus ferrooxidans + thiooxidans, Leptospirillum ferrooxidans, Sulfolobus (a thermophilic archaeon).',
            how: 'These bacteria oxidize iron + sulfur in ore minerals. The process releases the metal of interest (copper, gold, uranium) into solution, which can be collected. Operates at extremely low pH (~1-2) where these acidophilic + chemolithotrophic microbes thrive.',
            example: 'About 20% of global copper production now uses bioleaching. Chuquicamata + Escondida mines (Chile) extract billions of dollars of copper this way. Recovery is slower than conventional smelting but uses far less energy + emits less SO₂.',
            limits: 'Slow (~months for typical operation). Requires the right ore type. Best for low-grade ore where conventional methods are uneconomic.'
          },
          { id: 'fuel', name: 'Biofuels', color: '#22c55e',
            microbe: 'Saccharomyces cerevisiae (yeast) for ethanol; Zymomonas mobilis for ethanol; engineered Cyanobacteria + algae for biodiesel.',
            how: 'First-generation: yeast ferments corn or sugarcane sugars → ethanol. Second-generation: bacteria break down cellulose from non-food plants → ethanol. Third-generation: algae grow in tanks, accumulating lipids that are extracted as biodiesel.',
            example: 'Brazil is the leader in ethanol-from-sugarcane (~28% of fuel mix). The US uses corn ethanol heavily (~10% of gasoline). Cellulosic ethanol from straw + wood chips is operational but more expensive. Algal biodiesel remains a research focus more than a commercial reality.',
            limits: 'First-gen biofuels compete with food production. Net energy ratios are sometimes only ~1.5:1 (you put in nearly as much energy as you get out). Land + water use considerable.'
          },
          { id: 'pharma', name: 'Pharmaceutical production', color: '#a855f7',
            microbe: 'Mostly E. coli, but also yeast (Saccharomyces, Pichia pastoris), CHO cells (mammalian for antibody production).',
            how: 'Engineered to produce a specific human protein from inserted human genes. The microbe grows in bioreactors; the desired protein is harvested + purified. Pioneered by Genentech in 1978 with recombinant human insulin.',
            example: 'Insulin — nearly all therapeutic insulin worldwide is now produced by recombinant E. coli or yeast. Vaccines (hepatitis B subunit, mRNA vaccine components). Therapeutic antibodies (~$200 billion/year market) like adalimumab, trastuzumab, pembrolizumab. Industrial enzymes (washing-powder enzymes, food enzymes).',
            limits: 'Some human proteins don\'t fold or glycosylate correctly in bacteria — need yeast or mammalian cells, which are slower + more expensive. Antibody production typically uses CHO cells in bioreactors.'
          },
          { id: 'mercury', name: 'Heavy metal + radionuclide cleanup', color: '#7c3aed',
            microbe: 'Geobacter, Shewanella, Pseudomonas, Bacillus, Deinococcus radiodurans.',
            how: 'Certain bacteria can reduce or sequester heavy metals (uranium, chromium, arsenic, mercury) into insoluble or less-toxic forms. Geobacter reduces dissolved uranium(VI) to insoluble uranium(IV), preventing groundwater migration.',
            example: 'Department of Energy uranium-contaminated sites at Rifle, Colorado + Old Rifle, Colorado have demonstrated successful in-situ Geobacter remediation. Deinococcus radiodurans, the "world\'s toughest bacterium" (survives radiation doses 1000× lethal for humans), is being engineered to clean up radioactive contaminated sites.',
            limits: 'Slow. Requires injecting nutrients (often a carbon source like acetate) to stimulate the microbes. Long-term stability depends on environmental conditions remaining favorable.'
          }
        ];
        var sel = APPS.find(function(a) { return a.id === d.selectedBiotechApp; }) || APPS[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('🏭 Microbes as industrial workhorses',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'Beyond medicine + food, microbes are doing real work — cleaning pollution, mining metals, making fuels, recycling plastics, producing pharmaceuticals. About $300 billion/year of the global economy is microbe-driven biotechnology, and growing. Many problems we previously addressed with brute force + chemistry (oil spills, mining waste, plastic landfill) now have biological solutions that are slower but cleaner.'
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
              h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Microbes used'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.microbe)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How it works'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.how)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Real-world example'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.example)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(220,38,38,0.08)', borderLeft: '3px solid #dc2626' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Limits + honest caveats'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.limits)
                )
              )
            ),
            '#22c55e'
          ),

          sectionCard('🧪 Synthetic biology — engineering organisms from scratch',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } },
                'Modern biotechnology no longer just FINDS useful microbes — it ENGINEERS them. Synthetic biology assembles genetic circuits + custom metabolic pathways from interchangeable parts. The Registry of Standard Biological Parts (BioBricks, 2003+) catalogs thousands of reusable DNA modules. Computer-designed organisms exist.'
              ),
              h('p', { style: { margin: '0 0 8px' } },
                h('strong', { style: { color: '#a7f3d0' } }, 'Famous examples: '),
                'Artemisinin (antimalarial drug) produced in yeast by Jay Keasling\'s group at UC Berkeley — saved hundreds of millions of dollars vs extraction from sweet wormwood. Spider silk produced in goats (Nexia) + bacteria (Bolt Threads). Synthetic vanilla flavor produced by engineered yeast. Insulin in E. coli (1978, Genentech) was the first major commercial synthetic biology product.'
              ),
              h('p', { style: { margin: 0 } },
                h('strong', { style: { color: '#a7f3d0' } }, 'Where it\'s going: '),
                'Synthetic carbon-capture organisms (engineered cyanobacteria producing biofuels from CO₂ + sunlight). Designer probiotics (engineered gut bacteria producing therapeutic molecules in the gut). Cellular agriculture (lab-grown meat from cultured animal cells, no animal needed). Self-replicating diagnostics. The field is younger than CRISPR + moving extremely fast.'
              )
            ),
            '#a7f3d0'
          ),

          // ─── Infectious causes of cancer ─────────────────────────
          sectionCard('🎗️ When microbes cause cancer — infectious oncogenesis',
            (function() {
              var CANCER_TOPICS = [
                { id: 'overview', name: 'How big is this?', emoji: '📊',
                  body: 'About 13% of cancers worldwide (over 2 million cases per year) are caused by infectious agents. The biggest contributors: Helicobacter pylori (stomach cancer + MALT lymphoma), HPV (cervical, anal, oropharyngeal, penile, vulvar, vaginal), Hepatitis B + C virus (liver cancer), Epstein-Barr virus (Burkitt + Hodgkin lymphoma, nasopharyngeal carcinoma, some gastric cancer), HHV-8/KSHV (Kaposi sarcoma), HTLV-1 (adult T-cell leukemia), Schistosoma haematobium (bladder cancer), Opisthorchis + Clonorchis liver flukes (bile-duct cancer). All except HPV + HBV were essentially invisible to oncology before molecular biology — many cancers we used to call idiopathic, we now know are infectious.',
                  caveat: 'These cancers are HIGHLY preventable compared to cancers of unknown cause. Vaccines (HPV, HBV), antibiotics (H. pylori), antivirals (HCV cure since 2014), and clean water (schistosomiasis, liver flukes) prevent or eliminate the underlying infection. The global cancer burden could fall by a measurable fraction if these interventions reached everyone.'
                },
                { id: 'hpv', name: 'HPV — the most preventable cancer', emoji: '💉',
                  body: 'Harald zur Hausen proved in the 1980s that human papillomavirus causes cervical cancer (Nobel Prize 2008). Specifically, HPV strains 16 + 18 cause about 70% of cervical cancers worldwide; eight other high-risk strains cause another 20%. HPV is sexually transmitted, and most sexually active adults are exposed at some point; most clear it within 2 years. A small percentage develop persistent infection that, over decades, progresses through cervical dysplasia (CIN1 → CIN2 → CIN3 → invasive cancer). HPV-related cancers are also rising in oropharyngeal sites (back of throat), particularly in men. The 9-valent HPV vaccine (Gardasil 9) protects against the strains causing ~90% of cervical + anal + oropharyngeal HPV-caused cancers.',
                  caveat: 'The HPV vaccine is one of the most effective cancer-prevention tools ever developed. In countries with high coverage (Australia, UK, Scandinavia), cervical cancer is on track for elimination. In the US, coverage is lower (~62% completion in adolescents 2023), largely due to misinformation and the framing as a "sex disease" rather than as a cancer vaccine. School psychologists, pediatricians, and counselors who support vaccine uptake are doing primary cancer prevention.'
                },
                { id: 'hpylori', name: 'H. pylori + the Nobel that was earned', emoji: '🍶',
                  body: 'For most of the 20th century, doctors believed gastric ulcers were caused by stress, spicy food, and stomach acid. Treatment was bland diet + antacids. Barry Marshall + Robin Warren (Perth, Australia, 1982) noticed a spiral bacterium in ulcer-patient stomach biopsies. Marshall, frustrated by the rejection of his hypothesis, in 1984 famously DRANK a culture of H. pylori himself, developed gastritis within days, cultured the bacterium back from his own stomach, and cured himself with antibiotics. The medical community grudgingly began to test the hypothesis. By the late 1990s the evidence was overwhelming: H. pylori causes >90% of duodenal ulcers and ~70% of gastric ulcers, AND about 80% of gastric cancer cases worldwide. Marshall + Warren won the Nobel in 2005.',
                  caveat: 'About half the world\'s population is colonized by H. pylori, but only a small fraction develop cancer. Strain virulence (cagA-positive strains are higher-risk), host genetics, diet (high salt + low fresh produce), and co-infection all modulate risk. Treating EVERY carrier is not done, because of antibiotic resistance + microbiome disruption. Treating SYMPTOMATIC carriers and those with family history of gastric cancer is now standard.'
                },
                { id: 'ebv', name: 'EBV — the universal mostly-harmless cancer virus', emoji: '😮‍💨',
                  body: 'About 95% of adults worldwide carry Epstein-Barr virus, usually acquired in childhood (often asymptomatic) or adolescence (causing "mononucleosis," a.k.a. mono/kissing disease — fatigue, swollen lymph nodes, fever lasting weeks). EBV is a herpesvirus that establishes lifelong latent infection in B-lymphocytes. In a small minority it drives Burkitt lymphoma (especially in equatorial Africa, co-factor with malaria), nasopharyngeal carcinoma (especially in South China + Southeast Asia, co-factor with diet/genetics), Hodgkin lymphoma (~40% of cases EBV+), some gastric cancers (~10%), and post-transplant lymphoproliferative disease (in immunosuppressed organ-transplant recipients). EBV has also been implicated as a likely contributing cause of MULTIPLE SCLEROSIS (Bjornevik et al., Science 2022, with cohort data from 10 million US military personnel showing 32-fold increased MS risk after EBV seroconversion).',
                  caveat: 'There is currently no approved EBV vaccine, but several are in clinical trials. Given EBV\'s role in cancer + MS + chronic fatigue syndrome (suggested), an effective EBV vaccine could be one of the biggest medical advances of the coming decade. The fact that virtually all of us carry EBV makes its causal role hard to study epidemiologically — Bjornevik\'s 2022 paper exploited a rare cohort of seronegative adults who later seroconverted, which is hard to recreate.'
                },
                { id: 'hcv', name: 'Hepatitis C — the cure story', emoji: '🩸',
                  body: 'Hepatitis B + C are the leading viral causes of liver cancer (hepatocellular carcinoma). HBV has had an effective vaccine since 1981, given at birth in most countries, and has dramatically reduced HBV-related liver cancer in vaccinated cohorts. HCV had no vaccine; chronic infection (~60-80% of those exposed) progressed silently to cirrhosis + liver cancer over 20-30 years. Then in 2014, direct-acting antiviral drugs (sofosbuvir, ledipasvir + their successors) achieved CURE rates >95% with 8-12 weeks of oral pills. This is genuinely revolutionary. Sofosbuvir was approved in 2013; in 2020, Michael Houghton + Harvey Alter + Charles Rice won the Nobel for HCV discovery + treatment groundwork.',
                  caveat: 'HCV cure has been priced controversially high in many countries ($84,000 for a 12-week course at launch). Pricing came down over time; Egypt, Australia, and India have run effective national elimination programs. The technology to eliminate HCV exists; the political + economic will to use it has been uneven. Hepatitis C deaths globally peaked around 2015 and are now declining — the first viral disease ever brought under control without a vaccine.'
                },
                { id: 'mech', name: 'How microbes cause cancer (the mechanisms)', emoji: '🧬',
                  body: 'There are several distinct routes. (1) Direct viral oncoproteins: HPV E6 + E7 proteins bind + degrade host tumor-suppressor proteins p53 (E6) and Rb (E7), removing the brakes on cell division. EBV LMP1 + EBNA proteins mimic constitutive signaling. (2) Chronic inflammation: H. pylori, HBV, HCV, schistosomiasis all cause decades of inflammation, repair, and proliferation. Each cycle adds mutations. Eventually one cell accumulates the right mutations + escapes. (3) Immune suppression: HIV does not directly cause cancer, but by destroying CD4 T-cells, it allows opportunistic oncogenic viruses (EBV, HHV-8, HPV) to proliferate unchecked, dramatically increasing AIDS-related lymphoma + Kaposi sarcoma. (4) Genome integration: HBV integrates into the host genome at semi-random sites; some integrations disrupt tumor suppressors. (5) Microbiome disruption: emerging evidence that dysbiosis (especially Fusobacterium in colorectal cancer) may CONTRIBUTE to cancer biology, though direct causation is still debated.',
                  caveat: 'Cancer is almost never one cause. Even with a strong viral driver, additional mutations from radiation, environmental carcinogens, diet, and chance are usually required. This is why most people exposed to oncogenic microbes never develop cancer.'
                },
                { id: 'limits', name: 'What this framing cannot do', emoji: '⚖️',
                  body: 'Not all cancers are infectious. The majority of cancers in high-income countries have no known infectious cause (most breast cancer, prostate cancer, colorectal cancer, lung cancer not from infection). Smoking remains the single largest preventable cancer cause globally. Genetics + age + radiation + obesity + alcohol + air pollution all contribute. The "infectious cancer" framing is not a unified theory of cancer; it is one important slice — the slice that public health can address with vaccines + antibiotics + clean water.',
                  caveat: 'Public health framing also matters. Telling someone with cervical cancer "you should have gotten the vaccine" is cruel and unhelpful; HPV exposure is ubiquitous, and most people did not have the vaccine available in their adolescence (Gardasil was approved 2006). Honoring the patient in front of you is more important than scoring epidemiological points.'
                }
              ];
              var sel = d.selectedCancer || 'overview';
              var topic = CANCER_TOPICS.find(function(t) { return t.id === sel; }) || CANCER_TOPICS[0];
              return h('div', null,
                h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65, marginBottom: 12 } },
                  'For most of the 20th century, cancer was understood almost entirely in terms of genetic mutation, radiation, chemistry, and inheritance. In the past 40 years, a different story has emerged: a significant fraction of cancers globally are caused, fully or partly, by chronic infection with specific microbes. Some of those infections are vaccine-preventable. Others are curable with antibiotics or antivirals. This is genuinely good news — and it changes how we think about cancer prevention.'
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
                  h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 10 } }, topic.body),
                  h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.65, padding: 10, borderRadius: 8, background: 'rgba(0,0,0,0.25)', fontStyle: 'italic' } },
                    h('strong', null, 'What we should not overstate: '), topic.caveat
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 11.5, color: '#a7f3d0', lineHeight: 1.65 } },
                  h('strong', null, 'The actionable summary: '),
                  'The HPV vaccine prevents most cervical, anal, and oropharyngeal cancers. The Hep B vaccine prevents most hepatitis-B-driven liver cancer. Hep C is curable in 8-12 weeks of pills. H. pylori is curable in 10-14 days of antibiotics. None of these is a future technology; all of them exist now. Their barriers are access, awareness, and political will — not science.'
                )
              );
            })(),
            '#f43f5e'
          )
        );
      }

      // PLANT-MICROBE SYMBIOSIS + NITROGEN CYCLE
      function renderPlantMicrobe() {
        var STEPS = [
          { id: 'fix', name: 'Nitrogen fixation', color: '#22c55e',
            actor: 'Rhizobium, Bradyrhizobium, Azospirillum, Frankia, cyanobacteria',
            process: 'N₂ (atmospheric nitrogen, 78% of air) → NH₃ (ammonia). Requires the enzyme NITROGENASE + ~16 ATP per N₂ molecule. Only bacteria + archaea can do this — no eukaryote can fix nitrogen on its own.',
            where: 'In legume root nodules (clover, soybean, peanut, alfalfa). In free-living soil bacteria. In cyanobacteria of aquatic ecosystems + rice paddies. In the symbiotic Frankia of nitrogen-fixing trees (alder, bayberry).',
            note: 'Earth\'s entire biosphere depends on this single biochemical step. Without it, no proteins; without proteins, no life.'
          },
          { id: 'nitrify', name: 'Nitrification', color: '#0ea5e9',
            actor: 'Nitrosomonas + Nitrosospira (NH₃ → NO₂⁻), then Nitrobacter + Nitrospira (NO₂⁻ → NO₃⁻)',
            process: 'Two-step oxidation of ammonia to nitrate. Most plants take up nitrogen as NITRATE (NO₃⁻), so this conversion makes biological nitrogen available to plants.',
            where: 'Aerobic soils. The plant rhizosphere. Anywhere oxygen + ammonia coexist.',
            note: 'Nitrification can be disrupted by waterlogging (no oxygen) — explains why rice paddies retain ammonium. Excessive nitrification in farmland accelerates nitrogen leaching to groundwater + ocean dead zones.'
          },
          { id: 'plant', name: 'Plant uptake', color: '#84cc16',
            actor: 'Plants (via roots + mycorrhizal partners)',
            process: 'Roots absorb NO₃⁻ + NH₄⁺ from soil water. Mycorrhizal fungi extend the effective root surface 100-1,000×. Inside the plant, nitrogen is incorporated into amino acids → proteins → DNA/RNA.',
            where: 'Every plant\'s root system. About 90% of plant species have mycorrhizal partners (Glomeromycota for most; ectomycorrhizal Basidiomycota + Ascomycota for forest trees).',
            note: 'Plants also get carbon-for-nitrogen trades: they send 10-30% of photosynthesized sugars below ground to feed root + mycorrhizal partners. The "wood-wide web" of mycorrhizal connections lets trees + plants share resources across the forest floor.'
          },
          { id: 'cons', name: 'Consumption + decomposition', color: '#f59e0b',
            actor: 'Herbivores, predators, decomposer bacteria + fungi',
            process: 'Animals eat plant proteins → animal proteins. When organisms die, decomposers break protein → amino acids → ammonia (ammonification). The nitrogen re-enters the cycle.',
            where: 'Every food web on Earth. Forest floor decomposition is mostly fungi + bacteria recycling N from leaves + wood.',
            note: 'A leaf falling in a forest is recycled back into soil nitrogen by ~1 year in a temperate climate; faster in a tropical rainforest, slower in a boreal forest where cold limits decomposition.'
          },
          { id: 'denit', name: 'Denitrification', color: '#7c3aed',
            actor: 'Pseudomonas, Paracoccus, Thiobacillus (and many others)',
            process: 'NO₃⁻ → N₂ (back to atmosphere). Anaerobic bacteria use nitrate as the terminal electron acceptor when oxygen is unavailable. Closes the cycle by returning nitrogen to the atmospheric N₂ pool.',
            where: 'Waterlogged soils, swamps, deep sediments, sewage treatment plants (a wanted reaction), the human gut (a side effect).',
            note: 'Agricultural fertilizer overuse → too much nitrate in soil → denitrification produces N₂O (nitrous oxide), a potent greenhouse gas (~300× CO₂). Modern precision farming aims to minimize this loss.'
          }
        ];
        var sel = STEPS.find(function(s) { return s.id === d.selectedNStep; }) || STEPS[0];
        return h('div', { style: { padding: 16 } },
          sectionCard('🌱 Plants don\'t feed themselves — microbes do',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'Plants cannot fix nitrogen + most cannot effectively gather phosphorus + many other nutrients on their own. They depend on microbial partners. The roots of nearly every plant species are sites of intense microbial activity. Without these partnerships, terrestrial ecosystems as we know them would not exist.'
            ),
            '#22c55e'
          ),
          sectionCard('♻️ The nitrogen cycle — bacteria run the show',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Nitrogen is 78% of the atmosphere — and almost completely unusable for life in that form (N₂ is held together by a very strong triple bond). The biological nitrogen cycle solves this through a sequence of microbial steps. About half of the biologically-fixed nitrogen feeding the world comes from microbes; the other half from industrial Haber-Bosch fixation (which itself uses ~1-2% of all energy on Earth).'
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
              h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                h('div', { style: { fontSize: 15, fontWeight: 800, color: sel.color, marginBottom: 4 } }, sel.name),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Microbes responsible'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.actor)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Process'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.process)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Where it happens'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.where)
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7' } },
                  h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Why it matters'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.note)
                )
              )
            ),
            '#22c55e'
          ),

          sectionCard('🍄 Mycorrhizae — the underground partnership',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } }, 'About 90% of plant species form a partnership called MYCORRHIZA: roots and fungal hyphae grow together. The fungus extends the effective root system 100-1,000×, accessing water + phosphorus + other minerals the plant cannot reach. The plant gives the fungus sugars from photosynthesis. Probably the oldest symbiosis on land — about 460 million years old, and may be the reason plants colonized land in the first place.'),
              h('p', { style: { margin: '0 0 8px' } },
                h('strong', { style: { color: '#a7f3d0' } }, 'Two main types: '),
                h('em', null, 'Arbuscular mycorrhizal (AM)'),
                ' — fungal hyphae penetrate plant root cells, forming branched "arbuscules" for exchange. Found in ~80% of land plants including most crops + grasses. ',
                h('em', null, 'Ectomycorrhizal (ECM)'),
                ' — fungal hyphae form a sheath around root tips without entering cells. Found mostly in temperate + boreal forest trees (oak, pine, spruce, beech).'
              ),
              h('p', { style: { margin: 0 } },
                h('strong', { style: { color: '#a7f3d0' } }, 'Suzanne Simard\'s wood-wide web (1997+): '),
                'Mycorrhizal networks can connect trees of different species. "Mother trees" (large old trees) appear to share photosynthate with seedlings through these networks. The forest floor is a single interconnected organism in some functional sense. Disturbance + clear-cutting + tilling destroys these networks; restoration takes years to decades.'
              )
            ),
            '#a7f3d0'
          ),

          sectionCard('🌽 Agricultural implications',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              h('p', { style: { margin: '0 0 8px' } }, 'Industrial agriculture depends on biological nitrogen fixation in three forms: leguminous crop rotations (alfalfa, clover, soybean) for organic nitrogen, Rhizobium-inoculated seed treatments, and supplementary Haber-Bosch synthetic fertilizers. Each option has trade-offs.'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 8 } },
                h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #22c55e' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#86efac', marginBottom: 4 } }, 'Crop rotation'),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55 } }, 'Plant legumes one season to "fix" nitrogen; plant nitrogen-hungry crops the next. Indigenous "three sisters" agriculture (corn + beans + squash) used this for millennia. Slow + reliable + low-input.')
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #0ea5e9' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#7dd3fc', marginBottom: 4 } }, 'Rhizobium inoculants'),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55 } }, 'Seed-coat soybeans, peanuts, peas with the right strain of Rhizobium before planting. Targeted, effective, used at industrial scale.')
                ),
                h('div', { style: { padding: 8, borderRadius: 6, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #f59e0b' } },
                  h('div', { style: { fontSize: 12, fontWeight: 800, color: '#fbbf24', marginBottom: 4 } }, 'Synthetic fertilizer (Haber-Bosch)'),
                  h('div', { style: { fontSize: 11.5, color: '#e2e8f0', lineHeight: 1.55 } }, 'Industrial process (1909) converts N₂ + H₂ → NH₃ at high temperature + pressure. Currently feeds about half the world. Uses 1-2% of all global energy. Largest single contributor to anthropogenic reactive nitrogen on Earth.')
                )
              ),
              h('p', { style: { margin: 0 } },
                h('strong', { style: { color: '#fbbf24' } }, 'The nitrogen pollution problem: '),
                'Synthetic fertilizer + manure run off into rivers → coastal eutrophication → algal blooms → dead zones. The Gulf of Mexico dead zone (~15,000 km² in summer) is largely fed by Mississippi River nitrogen runoff. Smaller dead zones exist in Chesapeake Bay, Long Island Sound, and the Baltic. Precision agriculture + cover cropping + restored wetlands are the main responses.'
              )
            ),
            '#fbbf24'
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
            h('title', { id: 'biofilmTitle' }, 'Biofilm formation visualization'),
            h('desc', { id: 'biofilmDesc' }, 'A surface with ' + density + ' bacterial cells. At low density, cells behave individually. At quorum-sensing threshold (~100 cells/area), they coordinate into a biofilm community with shared protective matrix.'),
            // Substrate
            h('rect', { x: 0, y: 180, width: svgW, height: 20, fill: '#475569' }),
            h('text', { x: svgW / 2, y: 196, textAnchor: 'middle', fill: '#cbd5e1', fontSize: 10 }, 'Surface (catheter, tooth, lung, rock, anything)'),
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
            // Matrix (EPS) — only visible above threshold
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
            active ? h('text', { x: svgW / 2, y: 30, textAnchor: 'middle', fill: '#86efac', fontSize: 14, fontWeight: 800 }, '✓ Quorum reached — biofilm activated') :
              h('text', { x: svgW / 2, y: 30, textAnchor: 'middle', fill: '#fbbf24', fontSize: 14, fontWeight: 800 }, '... cells behave individually (' + pctOfThreshold.toFixed(0) + '% of quorum)')
          );
        }

        return h('div', { style: { padding: 16 } },
          sectionCard('🦠 Biofilms — when bacteria become a city',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Most bacteria in nature do NOT live as isolated single cells. They live in BIOFILMS — communities attached to surfaces, embedded in a shared protective matrix of polysaccharides + proteins + DNA. Dental plaque is a biofilm. Hospital catheter infections are biofilms. The pink slime in your shower drain is a biofilm. The slippery rocks in a stream are biofilms.'
              ),
              biofilmSvg(),
              h('div', { style: { marginTop: 10, padding: 8, borderRadius: 6, background: '#1e293b', border: '1px solid #334155' } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                  h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, 'Cell density'),
                  h('span', { style: { fontSize: 13, color: active ? '#86efac' : '#fbbf24', fontWeight: 800 } }, density + ' cells/area · ' + pctOfThreshold.toFixed(0) + '% of quorum')
                ),
                h('input', { type: 'range', min: 5, max: 200, step: 5, value: density,
                  onChange: function(e) { upd({ biofilmDensity: parseInt(e.target.value, 10) }); },
                  'aria-label': 'Cell density',
                  style: { width: '100%', accentColor: EMERALD }
                })
              )
            ),
            EMERALD
          ),

          sectionCard('📡 Quorum sensing — bacterial chemical communication',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Each bacterium constantly releases small "autoinducer" molecules into its surroundings. When the local concentration of these molecules crosses a threshold (= many bacteria nearby), gene expression changes. Behaviors that don\'t make sense at low density (biofilm formation, virulence, light production, sporulation) only activate when there are enough cells around to do them collectively.'
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 800, color: '#6ee7b7', marginBottom: 6 } }, '4 examples of quorum sensing in action:'),
                h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.75 } },
                  h('li', null, h('strong', null, 'Vibrio fischeri (bioluminescence): '), 'Lives in the light organ of the Hawaiian bobtail squid. Below quorum, no light (wastes energy). At high density inside the squid, the bacteria glow — providing the squid with counter-illumination camouflage. Foundational discovery of quorum sensing (Nealson + Hastings 1970s).'),
                  h('li', null, h('strong', null, 'Pseudomonas aeruginosa (virulence): '), 'A bacterium that infects cystic fibrosis lungs + burn wounds + immunocompromised patients. Stays "stealthy" at low density; releases tissue-damaging toxins only after biofilm + quorum. Disrupting quorum signaling is an active drug-development strategy.'),
                  h('li', null, h('strong', null, 'Streptococcus mutans (dental plaque): '), 'Quorum sensing triggers biofilm formation + acid production. The acid demineralizes tooth enamel → cavities. Brushing disrupts the biofilm; fluoride raises remineralization threshold.'),
                  h('li', null, h('strong', null, 'Bacillus subtilis (spore formation): '), 'Under starvation + high density, this soil bacterium forms tough spores that survive for thousands of years. Quorum tells the colony whether to commit to sporulation.')
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                h('strong', null, 'Why biofilms make antibiotic resistance worse: '),
                'A bacterium inside a biofilm is 100-1000× more resistant to antibiotics than the same bacterium swimming free. Three reasons: (1) the matrix physically blocks antibiotic penetration; (2) cells deep inside grow slowly + many antibiotics only work on growing cells; (3) close contact enables rapid horizontal gene transfer of resistance genes. Many chronic infections (cystic fibrosis lung, prosthetic joint, endocarditis) are biofilm infections — they cannot be cured by antibiotics alone + often require surgical removal of the infected device.'
              )
            ),
            '#fbbf24'
          ),

          sectionCard('💉 The medical reality of biofilms',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
              'The CDC estimates that ',
              h('strong', { style: { color: '#fca5a5' } }, '65-80% of all human bacterial infections involve biofilms'),
              '. Common sites: catheters (urinary, central venous), prosthetic joints + heart valves, contact lenses, lungs of people with cystic fibrosis, periodontitis (gum disease). Successful treatment often means removing the infected device + a long antibiotic course. Research is active on enzymatic biofilm disruptors, quorum-sensing inhibitors, phage therapy, and engineered surface coatings that resist biofilm formation.'
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
            { id: 'cells',  name: 'White blood cells' },
            { id: 'ab',     name: 'Antibody structure' },
            { id: 'tcells', name: 'T cells + MHC' },
            { id: 'memory', name: 'Memory + clonal selection' }
          ];

          // Antibody Y-shape SVG
          function antibodySvg() {
            var svgW = 280, svgH = 240;
            return h('svg', { viewBox: '0 0 ' + svgW + ' ' + svgH, width: '100%', height: svgH, role: 'img', 'aria-labelledby': 'abTitle abDesc' },
              h('title', { id: 'abTitle' }, 'Antibody structure'),
              h('desc', { id: 'abDesc' }, 'A Y-shaped antibody molecule with two identical heavy chains forming the trunk + arms, and two identical light chains on the arm tips. The arm tips form variable regions that bind specific antigens; the trunk is the constant region that signals other immune cells.'),
              // Constant region (Fc — trunk)
              h('rect', { x: 110, y: 130, width: 60, height: 80, rx: 8, fill: '#3b82f6', stroke: '#1e40af', strokeWidth: 1.5 }),
              h('text', { x: 140, y: 230, textAnchor: 'middle', fill: '#bfdbfe', fontSize: 11, fontWeight: 700 }, 'Fc (constant)'),
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
              h('text', { x: 140, y: 105, textAnchor: 'middle', fill: '#fda4af', fontSize: 9 }, 'binds antigen'),
              // Hinge region
              h('rect', { x: 130, y: 120, width: 20, height: 12, fill: '#475569' }),
              h('text', { x: 175, y: 128, fill: '#94a3b8', fontSize: 9 }, 'hinge')
            );
          }

          var content;
          if (topic === 'cells') {
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'Every white blood cell does a specific job. About 1% of your blood by volume is white blood cells; you have ~30 billion of them at any moment, and bone marrow produces hundreds of billions per day.'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 } },
                [
                  { name: 'Neutrophils', arm: 'innate', role: 'First responders. Most abundant white cell. Phagocytose bacteria + fungi. Lifespan: hours. The pus in an infection is mostly dead neutrophils.', color: '#fbbf24' },
                  { name: 'Macrophages', arm: 'innate', role: 'Long-lived tissue patrollers. Eat pathogens + debris. Present chewed-up antigens to T cells (a hand-off to adaptive immunity). Live months to years.', color: '#fbbf24' },
                  { name: 'Dendritic cells', arm: 'innate (bridge)', role: 'The professional antigen-presenters. Sample what\'s in tissues; migrate to lymph nodes; show T cells what they found. The key link between innate detection + adaptive response.', color: '#a855f7' },
                  { name: 'Natural Killer (NK) cells', arm: 'innate', role: 'Kill cells that "look wrong" — virus-infected or cancerous. Detect a missing self-MHC signal. No memory; act on what\'s in front of them.', color: '#fbbf24' },
                  { name: 'B cells', arm: 'adaptive', role: 'Make antibodies. Each B cell expresses one antibody specificity (about 10¹¹ possible specificities exist across all your B cells). Activated B cells become plasma cells (antibody factories) or memory B cells.', color: EMERALD },
                  { name: 'T helper cells (CD4+)', arm: 'adaptive', role: 'Conductors of the immune orchestra. Activate B cells, killer T cells, macrophages. HIV destroys CD4+ T cells, which is what causes AIDS.', color: EMERALD },
                  { name: 'Cytotoxic / Killer T cells (CD8+)', arm: 'adaptive', role: 'Kill infected cells. Each recognizes one antigen + MHC class I combination. Critical for clearing viral + cancerous cells.', color: EMERALD },
                  { name: 'Regulatory T cells (Tregs)', arm: 'adaptive', role: 'Brakes on the immune response. Stop responses to self-antigens (preventing autoimmunity). Defective Tregs are implicated in many autoimmune diseases.', color: EMERALD }
                ].map(function(c, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + c.color } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 } },
                      h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#e2e8f0' } }, c.name),
                      h('div', { style: { fontSize: 9.5, color: c.color, textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5 } }, c.arm)
                    ),
                    h('div', { style: { fontSize: 11.5, color: '#cbd5e1', lineHeight: 1.55 } }, c.role)
                  );
                })
              )
            );
          } else if (topic === 'ab') {
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'Antibodies (immunoglobulins) are Y-shaped proteins made by B cells. Each has two identical "arms" (Fab regions) that bind a specific antigen, joined to a "stem" (Fc region) that signals other immune cells. About 10¹¹ different antibody specificities can be generated by your B cells through random rearrangement of antibody gene segments (V, D, J recombination — 1987 Nobel to Tonegawa).'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 12, alignItems: 'start' } },
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0a0e1a', border: '1px solid #334155' } }, antibodySvg()),
                h('div', null,
                  h('div', { style: { fontSize: 12.5, fontWeight: 700, color: '#6ee7b7', marginBottom: 8 } }, 'The five antibody classes:'),
                  h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11.5 } },
                    h('thead', null, h('tr', null,
                      ['Class', 'Where', 'Job'].map(function(c, i) {
                        return h('th', { key: i, style: { padding: 5, textAlign: 'left', borderBottom: '1px solid #334155', color: '#94a3b8', fontWeight: 800 } }, c);
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
                          h('td', { style: { padding: 5, color: '#e2e8f0' } }, r.w),
                          h('td', { style: { padding: 5, color: '#cbd5e1' } }, r.j)
                        );
                      })
                    )
                  )
                )
              ),
              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.65 } },
                h('strong', null, 'How antibodies stop pathogens (4 mechanisms): '),
                h('ol', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.65 } },
                  h('li', null, h('strong', null, 'Neutralization: '), 'Blocks the pathogen from binding its target cell. (How antiviral antibodies prevent infection.)'),
                  h('li', null, h('strong', null, 'Opsonization: '), 'Coats the pathogen, making it easier for phagocytes to recognize + eat.'),
                  h('li', null, h('strong', null, 'Complement activation: '), 'Triggers a cascade of blood proteins that drill holes in bacteria.'),
                  h('li', null, h('strong', null, 'ADCC: '), 'Antibody-dependent cellular cytotoxicity — NK cells or macrophages destroy antibody-coated targets.')
                )
              )
            );
          } else if (topic === 'tcells') {
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'T cells don\'t see pathogens directly. They see fragments of pathogens presented on the surface of other cells. The presenting molecule is called MHC (Major Histocompatibility Complex; also called HLA in humans). Two classes; two T cell types.'
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 } },
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #38bdf8' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 6 } }, 'MHC class I'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } },
                    h('strong', null, 'Where: '), 'On almost every nucleated cell.', h('br'),
                    h('strong', null, 'Shows: '), 'Fragments of proteins made INSIDE that cell (so if a virus is replicating inside, viral proteins get shown).', h('br'),
                    h('strong', null, 'Detected by: '), 'CD8+ killer T cells. If they see a foreign peptide on MHC-I, they kill the cell.'
                  )
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid #ec4899' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fbcfe8', marginBottom: 6 } }, 'MHC class II'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } },
                    h('strong', null, 'Where: '), 'Mainly on professional antigen-presenting cells (dendritic cells, macrophages, B cells).', h('br'),
                    h('strong', null, 'Shows: '), 'Fragments of proteins INGESTED from the environment (bacteria, dead cells, debris).', h('br'),
                    h('strong', null, 'Detected by: '), 'CD4+ helper T cells. If they see a foreign peptide on MHC-II, they activate B cells + other immune responses.'
                  )
                )
              ),
              h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                h('strong', null, 'Why organ transplants are rejected: '),
                'Each person has a unique combination of MHC alleles (your "HLA type"). T cells are trained to ignore your own MHC + react against everyone else\'s. A transplanted organ\'s MHC molecules look "foreign" and trigger massive T-cell rejection. Transplant matching looks for the closest HLA match; immunosuppressants block T-cell activation. Identical twins can transplant without immunosuppression because their HLA is identical.'
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.65 } },
                h('strong', null, 'Checkpoint inhibitors — cancer immunotherapy: '),
                'Cancer cells often present "abnormal" peptides on MHC-I + would be killed by T cells. Many cancers evade this by displaying CTLA-4 + PD-L1, which act as "brakes" on T cells. Checkpoint inhibitor drugs (pembrolizumab, nivolumab) release those brakes. The 2018 Nobel went to James Allison + Tasuku Honjo for this discovery. Has revolutionized treatment of melanoma, lung cancer, and others — sometimes curing previously-fatal disease.'
              )
            );
          } else { // memory
            content = h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'How does the immune system remember? Through CLONAL SELECTION — the central insight of modern immunology, proposed by Burnet in 1957 and proved over the next two decades.'
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', marginBottom: 10 } },
                h('div', { style: { fontSize: 12.5, fontWeight: 800, color: '#6ee7b7', marginBottom: 8 } }, 'Clonal selection in 4 steps:'),
                h('ol', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#e2e8f0', lineHeight: 1.75 } },
                  h('li', null, h('strong', null, 'Diversity: '), 'Before any infection, your body has B cells + T cells with ~10¹¹ different antigen receptors. Each lymphocyte makes ONE specificity, generated randomly through V(D)J recombination. Most of those random specificities will never encounter their target.'),
                  h('li', null, h('strong', null, 'Selection: '), 'When a pathogen enters, only the lymphocytes whose receptors happen to fit react. They get activated. The other 99.99...% sit out the infection.'),
                  h('li', null, h('strong', null, 'Expansion (clonal): '), 'The few activated lymphocytes divide rapidly — generating thousands or millions of identical "clones," all making the same pathogen-fitting receptor. Effector cells (plasma cells making antibodies, cytotoxic T cells killing infected cells) clear the infection.'),
                  h('li', null, h('strong', null, 'Memory: '), 'A subset of the expanded clones differentiate into MEMORY cells. They\'re long-lived (decades), waiting. When the same pathogen returns, they activate within hours instead of days. This is why second infections are usually milder + why vaccines work.')
                )
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65, marginBottom: 8 } },
                h('strong', null, 'Why vaccines work: '),
                'A vaccine introduces pathogen pieces (or instructions for cells to make pathogen pieces, like mRNA vaccines). Clonal selection activates the matching lymphocytes. Memory cells form. When the real pathogen later arrives, response is in hours, not days. The pathogen is cleared before causing disease.'
              ),
              h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                h('strong', null, 'When memory fails: '),
                'Some pathogens evolve fast enough to outrun memory (flu changes the H + N proteins annually — antigenic drift). Some hide inside cells where antibodies can\'t reach (HIV in T cells, herpes in nerves). Some actively destroy the memory itself (measles causes "immune amnesia," erasing immune memory of prior infections for 2-3 years). Vaccination + post-exposure prophylaxis are how we manage each of these.'
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
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid #fbbf24' } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#fde68a', marginBottom: 4 } }, 'Innate immunity'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'The fast, general defense. Skin, mucus, stomach acid, macrophages, neutrophils, natural killer cells. Acts within minutes to hours. Same response to any pathogen — no specific memory.')
                ),
                h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid ' + EMERALD } },
                  h('div', { style: { fontSize: 13, fontWeight: 800, color: '#6ee7b7', marginBottom: 4 } }, 'Adaptive immunity'),
                  h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'The slow, specific defense. B cells (make antibodies) and T cells (kill infected cells + coordinate). Takes days the first time, but creates MEMORY cells that respond in hours on re-exposure. The basis of vaccination.')
                )
              )
            )
          ),
          sectionCard('How vaccines work',
            h('div', null,
              h('p', { style: { margin: '0 0 10px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'A vaccine shows your immune system a safe preview of a pathogen so it can build memory cells WITHOUT you having to get sick from the real thing. When the real pathogen arrives, your immune system recognizes it instantly and responds in hours instead of days.'
              ),
              h('p', { style: { margin: 0, fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                'Vaccines do NOT treat existing infection. They prevent infection (or prevent severe disease). The "safe preview" can be: a killed pathogen (flu shot), a weakened live pathogen (MMR), a protein fragment (hepatitis B), or instructions for your cells to make a viral protein themselves (mRNA vaccines).'
              )
            )
          ),
          sectionCard('🛡️ Immune system deep-dive',
            immuneDive,
            EMERALD
          ),

          sectionCard('🧬 CAR-T cell therapy — using immunity to cure cancer',
            (function() {
              var STEPS = [
                { id: 'collect', name: '1. Collect T cells', color: '#0ea5e9',
                  what: 'Blood is drawn from the patient. Using apheresis (similar to platelet donation), T cells are separated + frozen. The rest of the blood goes back to the patient.',
                  detail: 'Most CAR-T treatments are AUTOLOGOUS — the patient\'s own cells are used. This avoids immune rejection but is slow + expensive. ALLOGENEIC CAR-T (cells from a healthy donor, available off-the-shelf) is in development.'
                },
                { id: 'engineer', name: '2. Engineer the cells', color: '#a855f7',
                  what: 'T cells are sent to a manufacturing facility. A disabled virus (lentivirus or retrovirus) delivers a custom GENE for a Chimeric Antigen Receptor (CAR) — a synthetic protein with two parts: an outside region that binds a cancer-specific antigen, and an inside region that activates the T cell.',
                  detail: 'For B-cell cancers (leukemia, lymphoma), CAR-T cells target CD19 — a protein on the surface of all B cells. The CAR-T cells will destroy both cancerous AND healthy B cells, which is acceptable because B cell loss is manageable with IV immunoglobulin.'
                },
                { id: 'expand', name: '3. Expand to billions', color: '#22c55e',
                  what: 'The engineered T cells multiply in culture for 10-21 days, producing hundreds of millions to billions of cells.',
                  detail: 'Manufacturing must be tightly controlled — each patient\'s cells are a unique product. Yields vary; some patients\' cells expand poorly, sometimes requiring a second collection.'
                },
                { id: 'infuse', name: '4. Infuse back into the patient', color: '#fbbf24',
                  what: 'After a brief lymphodepleting chemotherapy (3-5 days, to make immune space for the new cells), the CAR-T cells are infused back into the patient through an IV line. Total infusion takes about an hour.',
                  detail: 'Once inside, the CAR-T cells circulate, find cancer cells expressing the target antigen, bind to them, kill them, and reproduce. A single dose can lead to weeks-to-months of cancer-killing activity.'
                },
                { id: 'monitor', name: '5. Monitor + manage side effects', color: '#dc2626',
                  what: 'For 2-4 weeks, the patient is monitored in or near the hospital. The main side effects are CYTOKINE RELEASE SYNDROME (CRS) — a flu-like to life-threatening immune response from the rapid cell killing — and NEUROTOXICITY (ICANS).',
                  detail: 'CRS is managed with tocilizumab (anti-IL-6) + steroids. Most patients have manageable CRS; severe CRS occurs in ~10-30% + can be fatal. ICANS (confusion, seizures) responds to steroids.'
                },
                { id: 'outcome', name: '6. The outcome', color: '#86efac',
                  what: 'In B-cell lymphoma + leukemia, ~50% of patients who had run out of all other options achieve durable remission — many still cancer-free after 5+ years. A single infusion is the entire treatment.',
                  detail: 'Currently FDA-approved CAR-T products: Kymriah (2017, first), Yescarta, Tecartus, Breyanzi, Carvykti (multiple myeloma), Abecma. Cost is $300,000-$500,000+ per dose. Solid tumors (breast, lung, etc.) remain much harder — fewer obvious tumor-specific antigens + the tumor microenvironment suppresses T cells.'
                }
              ];
              var sel = STEPS.find(function(s) { return s.id === d.selectedCarTStep; }) || STEPS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'CAR-T therapy is a "living drug" — your own T cells genetically engineered to recognize + destroy cancer. The first approval (Kymriah, 2017, for acute lymphoblastic leukemia) brought ~80% remission rates in children who had relapsed after every other treatment failed. The technology was developed primarily at the University of Pennsylvania (Carl June + colleagues) starting in the early 2010s.'
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
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What happens'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Detail'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.detail)
                  )
                ),

                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'Emily Whitehead — the first CAR-T patient: '),
                  'In 2012, 6-year-old Emily Whitehead was dying of acute lymphoblastic leukemia. She had already failed every standard treatment. Her family enrolled her in Penn\'s experimental CAR-T trial. After a near-fatal CRS reaction (which they treated with tocilizumab — the FIRST time it was used for CRS), Emily achieved remission. As of 2024, she is in her late teens + remains cancer-free over a decade later. Her case made the field credible + led to the 2017 Kymriah approval.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'The honest challenges: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.65 } },
                    h('li', null, h('strong', null, 'Cost: '), '$300,000-$500,000+ per dose, plus ~$100K for hospital + side-effect management. Total can exceed $1M. Insurance + Medicare coverage exists but access is limited globally.'),
                    h('li', null, h('strong', null, 'Solid tumors: '), 'CAR-T works dramatically for blood cancers because B-cell + plasma-cell antigens are well-defined. Solid tumors hide their antigens, suppress local T cells, and have heterogeneous antigens — harder targets. Active research, but no breakthrough yet.'),
                    h('li', null, h('strong', null, 'Manufacturing: '), 'Each patient\'s cells are a unique batch — slow + expensive. Off-the-shelf "allogeneic" CAR-T from healthy donors is being developed (CRISPR + base-edited T cells to avoid rejection).'),
                    h('li', null, h('strong', null, 'Relapse: '), 'Some cancers evolve to LOSE the targeted antigen (CD19-negative relapse). New CAR-T designs target multiple antigens simultaneously to head this off.')
                  )
                )
              );
            })(),
            '#a855f7'
          ),

          sectionCard('⚠️ When the immune system gets it wrong — autoimmunity + allergies',
            (function() {
              var HSENS = [
                {
                  type: 'Type I (Immediate hypersensitivity)', color: '#ef4444',
                  who: '~30% of Americans (allergies + asthma).',
                  mech: 'IgE antibodies bind innocuous antigens (peanut protein, cat dander, pollen). On re-exposure, IgE on mast cells triggers massive histamine release within minutes. Vasodilation, smooth muscle contraction, mucus production.',
                  examples: 'Hay fever, asthma, food allergies, allergic rhinitis, anaphylaxis (potentially fatal — epinephrine reverses it).',
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
                  examples: 'Systemic lupus erythematosus (SLE) — antibodies against your own DNA + nuclear proteins form complexes that lodge in kidneys, skin, joints. Rheumatoid arthritis. Serum sickness. Post-streptococcal glomerulonephritis.',
                  treat: 'Immunosuppression (steroids, methotrexate, biologics like rituximab + belimumab). Specific organ support (dialysis, joint care). Lifestyle modifications. Biologic therapies have transformed lupus + RA outcomes in the last 20 years.'
                },
                {
                  type: 'Type IV (Delayed, T-cell-mediated)', color: '#22c55e',
                  who: 'Many autoimmune diseases + delayed allergic reactions.',
                  mech: 'T cells (specifically Th1 + CD8+ cytotoxic) react against an antigen — host or environmental. Reaction develops over 24-72 hours (slower than antibody-driven). No antibody involvement.',
                  examples: 'Contact dermatitis (poison ivy, nickel allergy). Type 1 diabetes (T cells destroy pancreatic beta cells). Multiple sclerosis (T cells attack myelin in CNS). Rheumatoid arthritis (mixed Type III + IV). Tuberculin skin test positive reaction. Transplant rejection.',
                  treat: 'For autoimmune: immunosuppression (cyclosporine, tacrolimus, anti-TNF biologics like infliximab + adalimumab). For T1D: insulin replacement (autoimmune destruction is generally irreversible — but immunotherapy to delay onset is in clinical trials). For contact dermatitis: avoid trigger, topical steroids.'
                }
              ];
              var selT = HSENS.find(function(t, i) { return ('h' + i) === d.selectedHsens; }) || HSENS[0];
              var selIdx = HSENS.findIndex(function(t, i) { return selT === t; });

              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'The immune system is constantly making decisions: friend or foe, hurt or help. When it gets those decisions wrong, the result is autoimmunity (attacking self) or allergy (overreacting to harmless triggers). Coombs + Gell classified these errors into four types in 1963; the classification is still used today.'
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
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + selT.color } },
                  h('div', { style: { fontSize: 15, fontWeight: 800, color: selT.color, marginBottom: 8 } }, selT.type),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'How common'),
                    h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.6 } }, selT.who)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(168,85,247,0.08)', borderLeft: '3px solid #a855f7', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#d8b4fe', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Mechanism'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, selT.mech)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Examples'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, selT.examples)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(34,197,94,0.08)', borderLeft: '3px solid #22c55e' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Treatment approach'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, selT.treat)
                  )
                ),
                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.10)', border: '1px solid rgba(99,102,241,0.3)', fontSize: 12, color: '#c7d2fe', lineHeight: 1.65 } },
                  h('strong', null, 'The hygiene hypothesis (and what replaced it): '),
                  'Allergies + autoimmune diseases have risen dramatically in industrialized countries over the last 50-70 years. The "hygiene hypothesis" (Strachan 1989) proposed that less infection exposure in childhood under-trains the immune system. The current refinement is broader: the "OLD FRIENDS" hypothesis (Rook 2003) and microbiome research suggest that loss of biodiversity in our microbial exposures — soil microbes, helminths, commensal bacteria from natural birth + breastfeeding + farm life — leaves the immune system poorly calibrated. Not "too clean," but "missing key training partners." Many ongoing studies look at probiotic + helminth therapies for autoimmune conditions.'
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, 'Why women are more susceptible: '),
                  'Most autoimmune diseases hit women 2-10× more than men (lupus 9:1, MS 3:1, RA 2-3:1, Hashimoto thyroiditis 7:1). The XX chromosome dose, estrogen effects on the immune system, microchimerism from pregnancy, and X-linked gene inactivation patterns all contribute. Active research area; not fully understood.'
                )
              );
            })(),
            '#ef4444'
          ),

          sectionCard('Why some kids cannot be vaccinated, and why herd immunity matters',
            h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.75 } },
              'Some children cannot be vaccinated: too young, immunocompromised (from chemo, transplant, certain genetic conditions), severe allergic reactions to specific vaccines. They depend on the people around them being vaccinated — pathogens cannot spread through a vaccinated population. This is herd immunity. The threshold varies by pathogen: measles needs ~95% vaccination, polio ~80-85%. When vaccination rates drop, outbreaks return.'
            )
          ),
          sectionCard('Vaccine timeline (US)',
            h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.7 } },
              h('strong', null, '1796: '), 'Edward Jenner develops smallpox vaccination from cowpox.', h('br'),
              h('strong', null, '1885: '), 'Louis Pasteur develops rabies vaccine.', h('br'),
              h('strong', null, '1955: '), 'Salk\'s killed-virus polio vaccine licensed.', h('br'),
              h('strong', null, '1963: '), 'Measles vaccine licensed; cases drop from ~500,000/year to a handful.', h('br'),
              h('strong', null, '1980: '), 'WHO declares smallpox eradicated — the only human disease eliminated.', h('br'),
              h('strong', null, '2006: '), 'HPV vaccine (prevents most cervical cancer).', h('br'),
              h('strong', null, '2020: '), 'mRNA COVID-19 vaccines authorized for emergency use.'
            )
          ),

          sectionCard('💉 CDC childhood + adolescent vaccine schedule (US)',
            h('div', null,
              h('p', { style: { margin: '0 0 12px', fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                'The standard schedule for children + teens in the US. Each row is one vaccine; each column is an age window. Dots mark when each dose is recommended. The schedule is updated annually by the CDC + AAP based on current evidence.'
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
                    { name: 'Tdap',     dis: 'Booster for DTaP',    schedule: [0, 0, 0, 0, 0, 0, 0, 1, 0] },
                    { name: 'Hib',      dis: 'Haemophilus influenzae b', schedule: [0, 1, 1, 1, 1, 0, 0, 0, 0] },
                    { name: 'PCV',      dis: 'Pneumococcal',  schedule: [0, 1, 1, 1, 1, 0, 0, 0, 0] },
                    { name: 'IPV',      dis: 'Polio',         schedule: [0, 1, 1, 1, 0, 0, 1, 0, 0] },
                    { name: 'Influenza',dis: 'Flu (yearly)',  schedule: [0, 0, 0, 1, 1, 1, 1, 1, 1] },
                    { name: 'MMR',      dis: 'Measles, mumps, rubella', schedule: [0, 0, 0, 0, 1, 0, 1, 0, 0] },
                    { name: 'Varicella',dis: 'Chickenpox',    schedule: [0, 0, 0, 0, 1, 0, 1, 0, 0] },
                    { name: 'HepA',     dis: 'Hepatitis A',   schedule: [0, 0, 0, 0, 1, 1, 0, 0, 0] },
                    { name: 'HPV',      dis: 'Human papillomavirus (cancer prevention)', schedule: [0, 0, 0, 0, 0, 0, 0, 1, 0] },
                    { name: 'MenACWY',  dis: 'Meningococcal (4 serogroups)', schedule: [0, 0, 0, 0, 0, 0, 0, 1, 1] },
                    { name: 'MenB',     dis: 'Meningococcal B', schedule: [0, 0, 0, 0, 0, 0, 0, 0, 2] },
                    { name: 'COVID-19', dis: 'SARS-CoV-2',    schedule: [0, 0, 0, 1, 1, 1, 1, 1, 1] }
                  ];
                  return h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 720 } },
                    h('thead', null, h('tr', null,
                      h('th', { style: { padding: 6, textAlign: 'left', background: '#0a0e1a', color: '#6ee7b7', borderBottom: '2px solid ' + EMERALD, fontWeight: 800 } }, 'Vaccine'),
                      h('th', { style: { padding: 6, textAlign: 'left', background: '#0a0e1a', color: '#6ee7b7', borderBottom: '2px solid ' + EMERALD, fontWeight: 800, minWidth: 160 } }, 'Disease'),
                      ages.map(function(a, i) {
                        return h('th', { key: i, style: { padding: 6, textAlign: 'center', background: '#0a0e1a', color: '#6ee7b7', borderBottom: '2px solid ' + EMERALD, fontWeight: 800, minWidth: 56 } }, a);
                      })
                    )),
                    h('tbody', null,
                      vaccines.map(function(v, i) {
                        return h('tr', { key: v.name, style: { background: i % 2 === 0 ? '#0f172a' : '#1e293b' } },
                          h('td', { style: { padding: 6, fontWeight: 700, color: '#e2e8f0' } }, v.name),
                          h('td', { style: { padding: 6, color: '#cbd5e1', fontSize: 10.5 } }, v.dis),
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
              h('div', { style: { marginTop: 8, fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } },
                h('span', { style: { color: '#6ee7b7', fontWeight: 800 } }, '●'), ' = standard dose · ',
                h('span', { style: { color: '#c4b5fd', fontWeight: 800 } }, '○'), ' = recommended by shared decision / risk-based'
              ),

              h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.3)', fontSize: 12, color: '#a7f3d0', lineHeight: 1.6 } },
                h('strong', null, 'Why so many in the first 2 years? '),
                'The infant immune system is still learning what is dangerous + what is not. The diseases on this schedule were once major killers of children: pertussis (whooping cough), Hib meningitis, measles, polio. Spacing the doses follows the immune system\'s development. Multiple antigens in the same shot (DTaP, MMR, PCV) is well-tolerated — the immune system encounters thousands of antigens daily from microbes everywhere; vaccines add a tiny calibrated set.'
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 12, color: '#fde68a', lineHeight: 1.6 } },
                h('strong', null, 'Disease coverage thresholds (herd immunity): '),
                'Measles needs ~95% population vaccination. Pertussis, ~92%. Polio, ~80-85%. Varicella, ~85-90%. When coverage drops below the threshold, outbreaks return — as Maine + neighboring New Hampshire have seen with pertussis. The schedule reflects what protects both the individual + the community.'
              ),
              h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.55, fontStyle: 'italic' } },
                'Schedule simplified for education. The full CDC immunization schedule includes catch-up provisions, conditions for delayed doses, accelerated schedules, and contraindications. Always reference the current CDC schedule (cdc.gov/vaccines/schedules) or consult a clinician. Updated annually.'
              )
            ),
            EMERALD
          )
        );
      }

      // FERMENTATION
      function renderFerment() {
        var selected = FERMENTS.find(function(f) { return f.id === d.selectedFerment; }) || FERMENTS[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Fermentation is microbiology you can taste. Every culture in the world has fermented food. The microbes are doing the cooking; you set the conditions.'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginBottom: 14 } },
            FERMENTS.map(function(f) {
              var active = d.selectedFerment === f.id;
              return h('button', { key: f.id,
                onClick: function() { upd({ selectedFerment: f.id }); },
                style: { padding: 10, borderRadius: 8, textAlign: 'left', background: active ? 'rgba(16,185,129,0.20)' : '#1e293b', border: '1px solid ' + (active ? EMERALD : '#334155'), cursor: 'pointer', color: '#e2e8f0' }
              },
                h('div', { style: { fontSize: 13, fontWeight: 800, marginBottom: 2 } }, f.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, f.cultures)
              );
            })
          ),
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.name),
            h('div', { style: { fontSize: 11, color: '#fde68a', marginBottom: 10, fontStyle: 'italic' } }, 'Cultures: ' + selected.cultures),
            h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid ' + EMERALD, marginBottom: 8 } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#6ee7b7', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'How it works'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.how)
            ),
            h('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(56,189,248,0.10)', borderLeft: '3px solid #38bdf8' } },
              h('div', { style: { fontSize: 11, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'The story'),
              h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, selected.story)
            )
          )
        );
      }

      // CASE STUDIES
      function renderCases() {
        var selected = CASES.find(function(c) { return c.id === d.selectedCase; }) || CASES[0];
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12, lineHeight: 1.6 } },
            'Microbiology has changed human history more than any technology. These five cases are turning points.'
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
          h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', borderLeft: '3px solid ' + EMERALD } },
            h('h3', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 18 } }, selected.icon + ' ' + selected.name + ' (' + selected.year + ')'),
            infoBlock('What happened', selected.what, '#94a3b8'),
            infoBlock('Why it mattered', selected.why, EMERALD),
            infoBlock('Lesson', selected.lesson, '#f59e0b')
          ),

          sectionCard('🌐 One Health + pandemic preparedness',
            (function() {
              var PILLARS = [
                { id: 'animal', name: 'Animal health', color: '#fbbf24',
                  what: 'Veterinary medicine, wildlife biology, livestock husbandry. 70-75% of emerging human pathogens come from animals (zoonotic spillover). Surveillance of animal populations is early warning for human disease.',
                  example: 'PREDICT project (USAID, 2009-2019) surveyed ~140,000 animals + identified ~1,200 new viruses. Avian flu monitoring in poultry + wild birds. Maine\'s Cooperative Wildlife Disease Center monitors deer for chronic wasting disease + tick-borne pathogens.'
                },
                { id: 'human', name: 'Human health', color: '#0ea5e9',
                  what: 'Clinical medicine, public health, epidemiology, hospital infection control. The traditional "health" focus — but increasingly recognized as only one pillar.',
                  example: 'Sequencing of every COVID variant within days of emergence. Wastewater epidemiology (used widely during COVID + now for polio, RSV, mpox surveillance). The CDC + state public health labs as the front line.'
                },
                { id: 'env', name: 'Environmental health', color: '#22c55e',
                  what: 'Ecosystem health, biodiversity, climate, water quality, soil quality, urban planning. Habitat disruption + climate change drive spillover events; biodiverse + healthy ecosystems are buffer zones.',
                  example: 'Forest fragmentation + roads bring humans into closer contact with wildlife. The Nipah virus outbreaks in Malaysia (1998-99) followed deforestation that drove fruit bats into pig farms; pigs then infected humans. Climate change is expanding tick + mosquito ranges (Maine has seen this).'
                },
                { id: 'food', name: 'Food + water systems', color: '#a855f7',
                  what: 'Agricultural practices, food processing, water treatment. Industrial animal agriculture + global food supply chains can amplify + spread pathogens; sustainable food systems can buffer against this.',
                  example: 'Antibiotic use in livestock accelerates resistance (50%+ of US antibiotic use is agricultural). Concentrated animal feeding operations (CAFOs) are pandemic risk amplifiers. Aquaculture biosecurity. The 2011 German E. coli O104:H4 outbreak from sprouts killed 53.'
                }
              ];
              var sel = PILLARS.find(function(p) { return p.id === d.selectedOneHealth; }) || PILLARS[0];
              return h('div', null,
                h('p', { style: { margin: '0 0 12px', fontSize: 13, color: '#e2e8f0', lineHeight: 1.7 } },
                  'One Health is the WHO/FAO/WOAH framework recognizing that human health, animal health, and environmental health are inseparable. Most emerging infectious diseases (COVID, HIV, Ebola, Zika, MERS, SARS, Lyme, West Nile) come from animals + are amplified by environmental change. You cannot prepare for the next pandemic by focusing only on human medicine.'
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
                h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', borderLeft: '3px solid ' + sel.color } },
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: sel.color, marginBottom: 8 } }, sel.name),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(56,189,248,0.08)', borderLeft: '3px solid #38bdf8', marginBottom: 8 } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'What it covers'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.what)
                  ),
                  h('div', { style: { padding: 8, borderRadius: 6, background: 'rgba(245,158,11,0.08)', borderLeft: '3px solid #f59e0b' } },
                    h('div', { style: { fontSize: 10.5, fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 } }, 'Real-world example'),
                    h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, sel.example)
                  )
                ),

                h('div', { style: { marginTop: 12, padding: 10, borderRadius: 8, background: 'rgba(168,85,247,0.10)', border: '1px solid rgba(168,85,247,0.3)', fontSize: 12, color: '#e9d5ff', lineHeight: 1.65 } },
                  h('strong', null, 'Pandemic preparedness — what works: '),
                  h('ul', { style: { margin: '6px 0 0 22px', padding: 0, lineHeight: 1.7 } },
                    h('li', null, h('strong', null, 'Global surveillance: '), 'WHO Global Outbreak Alert + Response Network (GOARN); CDC Global Disease Detection Centers; the Wildlife Conservation Society\'s One Health monitoring. Most pandemics are caught in the first weeks → can be contained if local response is fast.'),
                    h('li', null, h('strong', null, 'Wastewater epidemiology: '), 'Pathogens shed in stool are detectable in sewage long before clinical cases peak. Used in real time for COVID, polio, RSV, mpox. Maine has wastewater surveillance in several treatment plants.'),
                    h('li', null, h('strong', null, 'mRNA vaccine platforms: '), 'COVID showed mRNA vaccines could be designed within days + manufactured at scale within months. Now being readied for flu pandemic preparedness + other pathogens. Stockpiled "prototype" vaccines for priority families exist.'),
                    h('li', null, h('strong', null, 'Genome sequencing capacity: '), 'GISAID database (Global Initiative on Sharing All Influenza Data) collected ~17 million COVID genomes from 200+ countries. Real-time variant tracking enabled rapid response.'),
                    h('li', null, h('strong', null, 'Protected wild habitat: '), 'Biodiverse intact ecosystems are pandemic firewalls. The cheapest pandemic prevention is forest conservation + restricted wildlife trade.'),
                    h('li', null, h('strong', null, 'Honest political will: '), 'No technical solution overcomes politicization of public health. The 2024 WHO Pandemic Treaty negotiations stalled on equity issues + national sovereignty concerns; these conversations are unfinished business.')
                  )
                ),
                h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(220,38,38,0.10)', border: '1px solid rgba(220,38,38,0.3)', fontSize: 12, color: '#fecaca', lineHeight: 1.65 } },
                  h('strong', null, 'The next pandemic: '),
                  'Epidemiologists do NOT know whether it will be influenza, coronavirus, paramyxovirus, filovirus, or something not yet known. They DO know the conditions: more frequent spillovers (3-4× more documented zoonoses now vs 50 years ago) + globalized travel + denser cities + climate-driven habitat shifts + lower vaccination + accelerating antibiotic resistance. Preparedness investment looks expensive until you compare it to the COVID-19 cost (~$16 trillion globally + 7+ million direct deaths + many millions more indirect).'
                )
              );
            })(),
            '#22c55e'
          )
        );
        function infoBlock(title, body, color) {
          return h('div', { style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid ' + color, marginTop: 8 } },
            h('div', { style: { fontSize: 11, fontWeight: 800, color: color, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, title),
            h('div', { style: { fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.65 } }, body)
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
            h('div', { style: { padding: 20, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', textAlign: 'center', marginBottom: 16 } },
              h('div', { style: { fontSize: 36, marginBottom: 4 } }, pct >= 80 ? '🧬' : pct >= 60 ? '🦠' : '🔬'),
              h('h2', { style: { margin: '0 0 4px', color: '#6ee7b7', fontSize: 22 } }, correct + ' / ' + QUIZ_QUESTIONS.length),
              h('div', { style: { fontSize: 14, color: '#94a3b8' } }, pct + '%')
            ),
            QUIZ_QUESTIONS.map(function(q, i) {
              var got = answers[i] === q.answer;
              return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid ' + (got ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'), borderLeft: '3px solid ' + (got ? '#22c55e' : '#ef4444'), marginBottom: 10 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: got ? '#86efac' : '#fca5a5', marginBottom: 4 } }, (got ? '✓ ' : '✗ ') + 'Q' + (i + 1)),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 6 } }, q.q),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 4 } }, 'Correct: ', h('strong', null, q.choices[q.answer])),
                !got ? h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 4 } }, 'Your answer: ', q.choices[answers[i] != null ? answers[i] : 0]) : null,
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, fontStyle: 'italic' } }, q.explain)
              );
            }),
            h('button', { onClick: reset, style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: EMERALD, color: '#fff', fontWeight: 700, cursor: 'pointer' } }, 'Retake quiz')
          );
        }
        var allAnswered = QUIZ_QUESTIONS.every(function(_, i) { return answers[i] != null; });
        return h('div', { style: { padding: 16 } },
          h('p', { style: { color: '#cbd5e1', fontSize: 13, marginBottom: 12 } }, QUIZ_QUESTIONS.length + ' questions on bacteria, viruses, vaccines, antibiotic resistance, microbiome, and history.'),
          QUIZ_QUESTIONS.map(function(q, i) {
            return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 10 } },
              h('div', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 8, lineHeight: 1.55 } }, h('strong', { style: { color: '#6ee7b7' } }, 'Q' + (i + 1) + '. '), q.q),
              q.choices.map(function(c, ci) {
                var picked = answers[i] === ci;
                return h('button', { key: ci,
                  onClick: function() { select(i, ci); },
                  style: { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 6, marginBottom: 4, background: picked ? 'rgba(16,185,129,0.20)' : '#0f172a', border: '1px solid ' + (picked ? EMERALD : '#334155'), color: '#e2e8f0', fontSize: 12.5, cursor: 'pointer', lineHeight: 1.5 }
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
          h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.4)', borderLeft: '3px solid ' + EMERALD, marginBottom: 12, fontSize: 12.5, color: '#a7f3d0', lineHeight: 1.65 } },
            h('strong', null, '🖨 Microbiology lab reference. '),
            'A one-page take-along: lab safety (BSL levels, handling), bacteria/virus reference, antibiotic stewardship checklist, and the microbiome do/don\'t list.'
          ),
          h('div', { className: 'no-print', style: { marginBottom: 14, textAlign: 'center' } },
            h('button', { onClick: function() { try { window.print(); } catch (e) {} },
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #047857 0%, #10b981 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF')
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
              h('h2', { style: { margin: 0, fontSize: 22, fontWeight: 900, color: '#0f172a' } }, 'Microbiology Reference'),
              h('div', { style: { fontSize: 11, color: '#475569' } }, 'NGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4')
            ),

            h('div', { style: { padding: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: 14, fontSize: 12, lineHeight: 1.55, color: '#7f1d1d' } },
              h('strong', null, 'Lab safety: '),
              'Wash hands before AND after every microbiology activity. Wear closed-toe shoes. No eating or drinking. Treat all cultures as if pathogenic. Autoclave or bleach all materials before disposal. Tell a teacher immediately if you cut yourself or get a spill.'
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Biosafety Levels (BSL)'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.7 } },
                h('li', null, h('strong', null, 'BSL-1: '), 'Non-pathogenic. E. coli K-12, Bacillus subtilis, baker\'s yeast. Standard handwashing + bench surface disinfection.'),
                h('li', null, h('strong', null, 'BSL-2: '), 'Moderate-risk human pathogens. Salmonella, S. aureus, HIV cultures. Biosafety cabinet, gloves, eye protection.'),
                h('li', null, h('strong', null, 'BSL-3: '), 'Serious airborne pathogens. M. tuberculosis, SARS-CoV-2 (in labs), West Nile. Negative pressure rooms, respirators.'),
                h('li', null, h('strong', null, 'BSL-4: '), 'Lethal, no vaccine. Ebola, Marburg, Lassa. Full positive-pressure suits, air locks, only a few labs in the world.')
              ),
              h('div', { style: { fontSize: 11, color: '#475569', fontStyle: 'italic', marginTop: 4 } }, 'School labs operate at BSL-1. Anything else is for trained professional labs.')
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Quick microbe reference'),
              h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 11 } },
                h('thead', null, h('tr', null,
                  ['Microbe', 'Type', 'Where', 'Role'].map(function(c, i) {
                    return h('th', { key: i, style: { padding: 5, textAlign: 'left', background: '#f1f5f9', border: '1px solid #cbd5e1', fontWeight: 800 } }, c);
                  })
                )),
                h('tbody', null,
                  BACTERIA.concat(VIRUSES.map(function(v) { return { name: v.name, shape: '(virus)', where: v.hosts, role: 'pathogen' }; })).map(function(m, i) {
                    return h('tr', { key: i },
                      h('td', { style: { padding: 5, border: '1px solid #cbd5e1', fontWeight: 700 } }, m.name),
                      h('td', { style: { padding: 5, border: '1px solid #cbd5e1' } }, m.shape || '—'),
                      h('td', { style: { padding: 5, border: '1px solid #cbd5e1' } }, (m.where || '').substring(0, 80)),
                      h('td', { style: { padding: 5, border: '1px solid #cbd5e1' } }, m.role)
                    );
                  })
                )
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Antibiotic stewardship checklist'),
              h('ul', { style: { margin: 0, padding: '0 0 0 22px', fontSize: 12, color: '#0f172a', lineHeight: 1.7 } },
                h('li', null, '□ Antibiotics only when prescribed by a clinician.'),
                h('li', null, '□ Antibiotics never for viral infections (colds, flu, most sore throats, most ear infections). Ask if it could be viral.'),
                h('li', null, '□ Finish the FULL course exactly as prescribed, even if you feel better.'),
                h('li', null, '□ Never share antibiotics or take leftover doses.'),
                h('li', null, '□ Ask what specific bacterium is being treated and whether a narrow-spectrum option is available.'),
                h('li', null, '□ Don\'t demand antibiotics. Trust the diagnosis.')
              )
            ),

            h('div', { style: { padding: 12, border: '2px solid #0f172a', borderRadius: 10, marginBottom: 12, pageBreakInside: 'avoid' } },
              h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 8 } }, 'Microbiome — what helps and what hurts'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 11.5, color: '#0f172a', lineHeight: 1.55 } },
                h('div', { style: { padding: 8, background: '#ecfdf5', border: '1px solid #6ee7b7', borderRadius: 6 } },
                  h('strong', null, 'Helps:'),
                  h('ul', { style: { margin: '4px 0 0 18px', padding: 0 } },
                    h('li', null, 'Diverse plant-rich diet (fiber)'),
                    h('li', null, 'Fermented foods'),
                    h('li', null, 'Vaginal birth + breastfeeding'),
                    h('li', null, 'Time outdoors + with animals'),
                    h('li', null, 'Sleep + low stress')
                  )
                ),
                h('div', { style: { padding: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6 } },
                  h('strong', null, 'Hurts:'),
                  h('ul', { style: { margin: '4px 0 0 18px', padding: 0 } },
                    h('li', null, 'Unnecessary antibiotics'),
                    h('li', null, 'Highly processed / low-fiber diet'),
                    h('li', null, 'Excessive sanitation (esp. in kids)'),
                    h('li', null, 'Chronic stress'),
                    h('li', null, 'Most artificial sweeteners (research evolving)')
                  )
                )
              )
            ),

            h('div', { style: { marginTop: 14, padding: 10, borderTop: '2px solid #0f172a', fontSize: 10.5, color: '#475569', lineHeight: 1.5 } },
              'Sources: CDC (cdc.gov/antibiotic-use) · NIH Human Microbiome Project (commonfund.nih.gov/hmp) · Madigan et al., Brock Biology of Microorganisms (15th ed.) · Mukherjee, S. (2022), The Song of the Cell · Yong, E. (2016), I Contain Multitudes. Printed from AlloFlow STEM Lab.'
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
        default:           body = renderHome();
      }

      return h('div', { className: 'selh-microbiology', style: { display: 'flex', flexDirection: 'column', height: '100%', background: BG, color: '#e2e8f0' } },
        h('div', { style: { padding: '12px 16px', borderBottom: '1px solid #1e293b', background: 'linear-gradient(135deg, #064e3b, #0f172a)', display: 'flex', alignItems: 'center', gap: 12 } },
          h('div', { style: { fontSize: 28 }, 'aria-hidden': 'true' }, '🦠'),
          h('div', null,
            h('h2', { style: { margin: 0, color: '#6ee7b7', fontSize: 20, fontWeight: 900 } }, 'Microbiology Lab'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 2 } }, 'NGSS MS-LS1 · HS-LS1 · HS-LS3 · HS-LS4')
          )
        ),
        tabBar,
        h('div', { style: { flex: 1, overflow: 'auto' } }, body)
      );
    }
  });

  console.log('[StemLab] stem_tool_microbiology.js loaded — Microbiology Lab');
})();
