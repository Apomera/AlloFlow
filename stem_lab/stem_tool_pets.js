// ── Reduced motion CSS (WCAG 2.3.3) — shared across all STEM Lab tools ──
(function() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('allo-stem-motion-reduce-css')) return;
  var st = document.createElement('style');
  st.id = 'allo-stem-motion-reduce-css';
  st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
  if (document.head) document.head.appendChild(st);
})();

// ═══════════════════════════════════════════
// stem_tool_pets.js — Science of Pets Lab
// Companion-animal SCIENCE: physiology, ethology, nutrition, genetics,
// domestication evolution, zoonoses, service-animal welfare.
// Sister to BehaviorLab (operant theory + Skinner box) — this tool ASSUMES
// that theory and applies it to real-world pet training across species.
// Cross-link to EvolutionLab for natural selection (we own artificial
// selection / domestication). Cross-link to Aquarium for fish ecology
// (we cover fish-as-pet husbandry briefly in Pet Picker).
// Distinguishing UDL angle: Service & Support Animals — no other AlloFlow
// tool covers service dog vs ESA vs therapy animal distinctions.
// All clinical / behavioral citations to AVMA, AAFCO, IAADP, ASAB, CDC,
// House Rabbit Society, Bradshaw, Karen Pryor, Mech 2000.
// ═══════════════════════════════════════════

window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('petsLab'))) {

(function() {
  'use strict';

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-live-pets')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-pets';
    lr.setAttribute('aria-live', 'polite');
    lr.setAttribute('aria-atomic', 'true');
    lr.setAttribute('role', 'status');
    lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Focus-visible outline (WCAG 2.4.7) ──
  (function() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('allo-pets-focus-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-pets-focus-css';
    st.textContent = '[data-pets-focusable]:focus-visible{outline:3px solid #fbbf24!important;outline-offset:2px!important;border-radius:6px}';
    if (document.head) document.head.appendChild(st);
  })();

  var _petsTimer = null;
  function petsAnnounce(text) {
    if (typeof document === 'undefined') return;
    var lr = document.getElementById('allo-live-pets');
    if (!lr) return;
    if (_petsTimer) clearTimeout(_petsTimer);
    lr.textContent = '';
    _petsTimer = setTimeout(function() { lr.textContent = String(text || ''); _petsTimer = null; }, 25);
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 1: SOURCE CARDS — quick-reference per species
  // Citations: AVMA, AAFP, House Rabbit Society, AAV (avian vets), ARAV (reptile vets).
  // ─────────────────────────────────────────────────────────
  var SOURCE_CARDS = {
    dogs: {
      icon: '🐕', name: 'Dogs (Canis lupus familiaris)',
      principle: 'Domesticated 15–40K years ago from gray wolves',
      oneLiner: 'The first domesticated species. Co-evolved with humans long enough to develop unique communication abilities (reading human pointing gestures, eye contact for bonding). Lifespan inversely correlated with body size: giant breeds 6–8 yr, small breeds 14–16 yr.',
      lifespan: '6–16 years (smaller = longer)',
      brain: '~2 billion cortical neurons (more than cats; bonobo has ~9 billion)',
      cite: 'AVMA + Hare 2017 (Cognition)'
    },
    cats: {
      icon: '🐈', name: 'Cats (Felis catus)',
      principle: 'Self-domesticated ~9,500 years ago in the Fertile Crescent',
      oneLiner: 'Obligate carnivores: cannot synthesize taurine, vitamin A, or arginine internally — they MUST get them from animal protein. Adult-cat meowing evolved AS a domestication artifact specifically to communicate with humans (adult feral cats rarely meow at each other).',
      lifespan: '12–18 years indoor; 2–5 years outdoor (predation, disease, traffic)',
      brain: '~250 million cortical neurons',
      cite: 'AAFP + Bradshaw 2013 (Cat Sense)'
    },
    smallMammals: {
      icon: '🐹', name: 'Small mammals (rabbit, guinea pig, hamster, ferret)',
      principle: 'Highly variable physiology + social needs',
      oneLiner: 'Often bought as "starter pets" but most are LESS forgiving than dogs/cats. Rabbits + guinea pigs are prey species (stress-fragile, hide illness); hamsters are strictly solitary (housing two = fights to death); ferrets are obligate carnivores like cats.',
      lifespan: 'hamster 2–3 yr · guinea pig 5–8 yr · rabbit 8–12 yr · ferret 6–10 yr',
      cite: 'House Rabbit Society + AVMA Companion Animal'
    },
    birds: {
      icon: '🦜', name: 'Companion birds',
      principle: 'Vocal learning + flock psychology + extreme longevity',
      oneLiner: 'Parrots can outlive their owners — macaws + cockatoos hit 50–80 years. Air-sac respiratory anatomy makes them poison-canaries: Teflon (PTFE) overheating kills birds in minutes; aerosols, smoke, and scented candles are toxic. Cognitively complex (Alex the African Grey, Pepperberg).',
      lifespan: 'finch 5–10 yr · cockatiel 15–25 yr · macaw 50–80 yr',
      cite: 'AAV + Pepperberg 2008'
    },
    reptiles: {
      icon: '🦎', name: 'Reptiles & amphibians',
      principle: 'Ectothermic — body temperature follows environment',
      oneLiner: 'Most pet-trade reptiles die young from incorrect husbandry, not disease. They need species-specific UVB lighting + heat gradients (basking spot + cool zone). Salmonella shedding is universal — handwashing required. Amphibians have permeable skin; soap residue on hands kills them.',
      lifespan: 'leopard gecko 15–20 yr · ball python 20–30 yr · tortoise 40–80+ yr',
      cite: 'ARAV + CDC One Health'
    }
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 2: NUTRITION (toxic foods + species requirements)
  // Citations: AVMA Pet Toxin database + AAFCO + ASPCA Animal Poison Control.
  // ─────────────────────────────────────────────────────────
  var TOXIC_FOODS = [
    { id: 'chocolate', icon: '🍫', name: 'Chocolate', species: 'dogs (worst), cats, ferrets, birds',
      mechanism: 'Theobromine + caffeine. Dogs metabolize theobromine slowly → toxic. Dark chocolate is far worse than milk.',
      thresholdNote: '~20 mg/kg theobromine = mild signs; 60 mg/kg = severe; 200 mg/kg potentially lethal.',
      cite: 'ASPCA APCC' },
    { id: 'grapes', icon: '🍇', name: 'Grapes & raisins', species: 'dogs (mechanism unclear), cats',
      mechanism: 'Tartaric acid likely culprit (ASPCA 2021). Causes acute kidney failure unpredictably — even tiny amounts can kill some dogs.',
      thresholdNote: 'No safe threshold identified. Treat ANY ingestion as emergency.',
      cite: 'ASPCA APCC 2021' },
    { id: 'xylitol', icon: '🧪', name: 'Xylitol (sugar substitute)', species: 'dogs, ferrets',
      mechanism: 'Triggers massive insulin release → hypoglycemia + liver failure. Found in sugar-free gum, peanut butter, candy, some children\'s vitamins.',
      thresholdNote: '0.1 g/kg causes hypoglycemia; 0.5 g/kg causes liver failure.',
      cite: 'AVMA 2023' },
    { id: 'onions', icon: '🧅', name: 'Onions / garlic / leeks (Allium)', species: 'dogs, cats (cats more sensitive)',
      mechanism: 'N-propyl disulfide damages red blood cell membranes → hemolytic anemia. Cooking does NOT inactivate.',
      thresholdNote: '15–30 g/kg toxic in dogs; cats much more sensitive.',
      cite: 'Merck Vet Manual' },
    { id: 'macadamia', icon: '🥜', name: 'Macadamia nuts', species: 'dogs',
      mechanism: 'Unknown mechanism. Causes weakness, tremors, hyperthermia, hind-limb ataxia within 12 hr. Usually self-resolves but distressing.',
      thresholdNote: '~2 g/kg.',
      cite: 'ASPCA' },
    { id: 'lily', icon: '🌸', name: 'Lilies (Lilium spp.)', species: 'cats',
      mechanism: 'ALL parts toxic: leaves, petals, pollen, vase water. Causes acute kidney failure. Even pollen brushed off on fur and groomed off can be fatal.',
      thresholdNote: 'No safe exposure. Easter / Tiger / Asiatic lilies all dangerous.',
      cite: 'ASPCA' },
    { id: 'avocado', icon: '🥑', name: 'Avocado', species: 'birds (worst), rabbits',
      mechanism: 'Persin causes cardiac muscle damage in birds; can kill within 24 hr. Dogs/cats relatively tolerant of flesh but pit is GI obstruction risk.',
      cite: 'Avian Welfare Coalition' },
    { id: 'teflon', icon: '🍳', name: 'Teflon (PTFE) fumes', species: 'birds (FATAL)',
      mechanism: 'Overheated nonstick cookware (>500°F) releases polymer fumes that kill birds in MINUTES. Also: scented candles, aerosol cleaners, cigarette smoke.',
      cite: 'AAV' }
  ];
  var SPECIES_NUTRITION = [
    { id: 'cat', name: 'Cats', icon: '🐈', need: 'TAURINE (essential — deficiency → dilated cardiomyopathy + retinal degeneration). Cannot synthesize from precursors. Vegan diet for cats = cruelty + medical neglect.',
      cite: 'AAFP nutrition guidelines' },
    { id: 'dog', name: 'Dogs', icon: '🐕', need: 'Omnivorous. Can thrive on properly-formulated diets including some plant matter. AAFCO statement on label = nutritionally complete + balanced for life stage.',
      cite: 'AAFCO + AVMA' },
    { id: 'rabbit', name: 'Rabbits', icon: '🐰', need: '~80% grass hay (timothy/orchard for adults; alfalfa for young). Pellets are SUPPLEMENT not staple. Iceberg lettuce is mostly water + dangerous in volume.',
      cite: 'House Rabbit Society' },
    { id: 'parrot', name: 'Parrots', icon: '🦜', need: 'Pellet base + fresh veg + small amount fruit. AVOID all-seed diets (cause obesity + fatty liver disease). NO avocado, chocolate, caffeine, onion, alcohol.',
      cite: 'AAV' },
    { id: 'reptile', name: 'Reptiles', icon: '🦎', need: 'Hugely species-specific. Bearded dragons = omnivore (insects + greens; calcium dusting essential to prevent metabolic bone disease). Ball pythons = strict carnivore (mice).',
      cite: 'ARAV' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 3: ZOONOSES + One Health
  // Citations: CDC One Health, Maine CDC for Lyme stats.
  // ─────────────────────────────────────────────────────────
  var ZOONOSES = [
    { id: 'rabies', icon: '🦠', name: 'Rabies', from: 'mammals (esp bats, raccoons, skunks, foxes)',
      severity: 'ALWAYS FATAL once symptoms appear',
      protect: 'Vaccinate dogs + cats. Avoid wildlife. ANY bat indoors = call doctor + animal control. PEP (post-exposure prophylaxis) within hours of suspected exposure.',
      cite: 'CDC + Maine CDC' },
    { id: 'lyme', icon: '🕷️', name: 'Lyme disease + anaplasmosis', from: 'deer ticks (Ixodes scapularis)',
      severity: 'Maine has the highest US incidence rate. Dogs + humans both vulnerable.',
      protect: 'Year-round tick prevention for dogs (oral or topical). Daily tick checks. Lyme vaccine for high-exposure dogs. Don\'t stop checking in winter — adult ticks active any day above ~40°F.',
      cite: 'Maine CDC + AVMA' },
    { id: 'toxo', icon: '🤰', name: 'Toxoplasmosis', from: 'cats (oocysts in feces)',
      severity: 'Concern for pregnancy + immunocompromise. Most cat-owning humans have already been exposed and developed immunity.',
      protect: 'Pregnant people: someone else cleans litter box, OR wear gloves + clean daily (oocysts take 24+ hr to become infective). Cook meat thoroughly. Wash veggies. Indoor cats fed only commercial food are very low risk.',
      cite: 'CDC + ACOG' },
    { id: 'salmonella', icon: '🐢', name: 'Salmonella', from: 'reptiles (universal shedding), raw food, baby chicks',
      severity: 'GI illness; serious in young children, elderly, pregnant, immunocompromised',
      protect: 'No reptiles for kids under 5 (CDC guidance). Wash hands after every handling. Don\'t kiss your turtle. Don\'t feed raw food to immunocompromised humans\' pets.',
      cite: 'CDC' },
    { id: 'ringworm', icon: '⭕', name: 'Ringworm (NOT a worm — fungus)', from: 'cats (asymptomatic carriers), kittens, rabbits',
      severity: 'Skin infection, itchy, contagious to humans + other pets',
      protect: 'Topical antifungal + environmental cleanup (spores survive months). Treat affected pets + screen housemates. Kittens from shelters often shed even when looking healthy.',
      cite: 'CDC + AVMA' },
    { id: 'psittacosis', icon: '🦜', name: 'Psittacosis (parrot fever — Chlamydia psittaci)', from: 'birds, esp parrots + cockatiels',
      severity: 'Pneumonia-like illness in humans; potentially severe',
      protect: 'Quarantine + vet-test new birds. Don\'t share airspace with sick birds. Inhaled dust from droppings is the route — clean cages with damp cloth, not dry sweep.',
      cite: 'CDC' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 4: GLOSSARY (ethology + animal-care terms)
  // ─────────────────────────────────────────────────────────
  var GLOSSARY = [
    { term: 'Operant conditioning', def: 'Learning by consequences — behavior is shaped by what follows it (reinforcement = increases; punishment = decreases). Foundation of modern pet training. (See BehaviorLab for theory deep-dive.)' },
    { term: 'Classical conditioning', def: 'Learning by association — a previously neutral stimulus becomes meaningful by being paired with something biologically significant (Pavlov\'s bell + food).' },
    { term: 'Shaping', def: 'Reinforcing successive approximations of a target behavior. How dolphins learn complex tricks and how dogs learn "go to mat."' },
    { term: 'Socialization period', def: 'Developmental window when young animals form lasting impressions of what is safe vs scary. Puppies: 3–14 wk. Kittens: 2–7 wk. Missing this window = lifelong fearfulness.' },
    { term: 'Imprinting', def: 'Rapid learning during a critical period (Lorenz\'s ducklings following the first moving object). Most relevant in birds + ungulates; less so in dogs/cats.' },
    { term: 'Calming signals', def: 'Subtle dog body language used to defuse social tension: lip-licking, yawning, head turn, "whale eye" (showing whites). Misread by humans as random.' },
    { term: 'Allogrooming', def: 'Mutual grooming between social bondmates. Cats only allogroom individuals they trust; bonded rabbits will groom each other.' },
    { term: 'Pheromone', def: 'Chemical signal that triggers behavior in same-species individuals. Cats have facial pheromones (rubbing on furniture = marking ownership in friendly way).' },
    { term: 'Allelomimetic behavior', def: 'Doing what your group does. Dogs are highly allelomimetic with their human family — they copy your routine.' },
    { term: 'Resource guarding', def: 'Defensive behavior over food, toys, resting spots, or people. Normal evolutionary behavior; manageable with training; never punish — it intensifies.' },
    { term: 'Trigger stacking', def: 'When several mildly-stressful events compound and push an animal over its bite threshold. The bite looks "out of nowhere" but the lead-up was visible.' },
    { term: 'Bite inhibition', def: 'Soft-mouth control learned in puppyhood from littermates. Puppies removed from litters too early (<8 wk) often have poor bite inhibition.' },
    { term: 'Obligate carnivore', def: 'Must eat animal protein to obtain certain nutrients (taurine, arginine, vitamin A). Cats + ferrets. Cannot survive on plant-only diets.' },
    { term: 'Crepuscular', def: 'Most active at dawn + dusk. Cats, rabbits, ferrets. Explains the 5 AM "zoomies" of indoor cats.' },
    { term: 'Brachycephalic', def: 'Short-skulled breeds (pugs, bulldogs, Persians). Often have breathing problems (BOAS), eye problems, dental crowding, inability to thermoregulate. Result of selective breeding for "cute" features.' },
    { term: 'AAFCO statement', def: '"Complete and balanced" wording on pet food labels means it meets American Association of Feed Control Officials nutrient requirements for the named life stage.' },
    { term: 'TNR (Trap-Neuter-Return)', def: 'Community cat management: trap feral cats, sterilize, vaccinate, return to colony. Reduces population over generations without killing.' },
    { term: 'Service dog vs ESA', def: 'Service dog = task-trained for a disability (ADA: full public access). Emotional support animal = comfort by presence (FHA + sometimes DOT only; no public access).' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 5: MYTHS BUSTED (sourced corrections)
  // ─────────────────────────────────────────────────────────
  var MYTHS = [
    { myth: '"You need to be the alpha to control your dog."',
      truth: 'Dominance theory was based on captive-wolf studies that don\'t apply to dogs. L. David Mech (the researcher whose work popularized "alpha wolf") spent decades trying to retract the term. Wild wolf packs are FAMILIES, not status hierarchies. Dogs train best with cooperative reinforcement — not by you "being alpha."',
      source: 'Mech 2000 ("Alpha Status, Dominance, and Division of Labor in Wolf Packs") + AVSAB position statement on dominance' },
    { myth: '"Pit bulls have locking jaws."',
      truth: 'Anatomically false. No dog breed has a jaw-locking mechanism — they\'re built like every other dog. Pit-bull-type bite force is comparable to other large dogs (~235 PSI vs Rottweiler 328 PSI vs Mastiff 552 PSI). Behavior is far more individual than breed-determined.',
      source: 'AVMA + Brady Anti-Discrimination position' },
    { myth: '"Cats can\'t be trained."',
      truth: 'Cats train readily with positive reinforcement — they just don\'t train via social pressure (don\'t care if you\'re disappointed). Use food rewards, short sessions, and target training. Cats can learn sit, high-five, recall, target-touch, even agility. Karen Pryor + John Bradshaw both detail this.',
      source: 'Bradshaw 2013 + Pryor "Reaching the Animal Mind"' },
    { myth: '"Rabbits are easy starter pets for kids."',
      truth: 'Rabbits are arguably the WORST starter pet. Prey-animal nature makes them stress-fragile. They live 8–12 years, need pair bonding, dedicated rabbit-savvy vet care (often >2x dog/cat costs), large enclosures (cages = inhumane), and don\'t generally enjoy being held. House Rabbit Society advises against rabbits for households with young children.',
      source: 'House Rabbit Society + AVMA Companion Animal' },
    { myth: '"Tail wagging means a happy dog."',
      truth: 'Tail wagging means AROUSAL — could be happy, anxious, fearful, or about-to-bite. Read full body language: loose body + soft eyes + relaxed mouth = happy. Stiff body + hard eyes + closed mouth + slow high wag = warning. Whale-eye (whites showing) = fear/discomfort, not playfulness.',
      source: 'AVSAB + Yin "Low Stress Handling"' },
    { myth: '"You can\'t teach an old dog new tricks."',
      truth: 'Adult and senior dogs learn just fine — sometimes BETTER than puppies because they have longer attention spans + impulse control. Cognitive enrichment is medically recommended for senior dogs to slow age-related cognitive dysfunction (canine analog of dementia).',
      source: 'AAHA Senior Care Guidelines' },
    { myth: '"Indoor cats are bored / cruel to keep inside."',
      truth: 'Indoor cats live 3–4× longer (12–18 yr vs 2–5 yr outdoor). Outdoor cats kill ~2.4 BILLION birds and ~12.3 BILLION mammals annually in the US alone. Solution = indoor cats + environmental enrichment (vertical space, food puzzles, window perches, leash-walking, catios). Bored ≠ outside-only fix.',
      source: 'Loss et al. 2013 (Nature Communications) + American Bird Conservancy + AVMA' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 6: CAREER PATHWAYS — animal careers from trade to PhD
  // ─────────────────────────────────────────────────────────
  var CAREER_PATHS = [
    { id: 'vet', icon: '🩺', title: 'Veterinarian (DVM/VMD)',
      salary: '~$110,000 median (2024 BLS)',
      growth: '+19% projected through 2032',
      edu: '4-year DVM after undergrad pre-vet. Highly competitive (~12% admit rate at most schools). State licensure exam (NAVLE).',
      where: 'Maine: Tufts Cummings + Cornell are the closest DVM programs. Dr. Rebecca Hodshon (UMaine pre-vet advising).',
      tags: ['professional', 'doctorate', 'clinical'] },
    { id: 'vetTech', icon: '💉', title: 'Veterinary technician (CVT/RVT/LVT)',
      salary: '~$38,000 median',
      growth: '+20% projected — fastest-growing animal career',
      edu: '2-year AAS in Veterinary Technology + VTNE exam + state credential.',
      where: 'Maine: York County Community College, Northern Maine CC (online/hybrid options too).',
      tags: ['trade', 'AAS', 'clinical'] },
    { id: 'caab', icon: '🧠', title: 'Certified Animal Behaviorist (CAAB / ACAAB)',
      salary: '$50,000–120,000 (varies by clientele)',
      growth: 'High demand; only ~70 CAABs total in North America',
      edu: 'PhD in animal behavior (CAAB) OR Master\'s + supervised practice (ACAAB). Animal Behavior Society credentials.',
      where: 'Universities + private behavior consultancy. Often paired with veterinary practice for severe cases.',
      tags: ['research', 'PhD-track', 'clinical+academic'] },
    { id: 'ccpdt', icon: '🦮', title: 'Certified Dog Trainer (CCPDT-KA / KSA)',
      salary: '$30,000–70,000 (group classes vs private)',
      growth: 'Steady; pet-population-driven',
      edu: 'No degree required. CCPDT exam + 300 hours documented training experience. KPA-CTP and IAABC are also respected paths. Avoid "certifications" from for-profit board-and-train chains.',
      where: 'Independent business or partnerships with shelters / vets. Maine: humane societies often hire trainers.',
      tags: ['cert-driven', 'self-employed-friendly'] },
    { id: 'wildlifeRehab', icon: '🦅', title: 'Wildlife rehabilitator',
      salary: 'Often volunteer or stipend; staff positions $25–40K',
      growth: 'Limited paid roles; high volunteer demand',
      edu: 'State permit (Maine: IFW issues permits; rabies-vector-species permits separate). Apprenticeship with licensed rehabber.',
      where: 'Maine: Avian Haven (Freedom), Center for Wildlife (Cape Neddick), Wind Over Wings.',
      tags: ['cert-driven', 'volunteer-heavy', 'field'] },
    { id: 'shelter', icon: '🏠', title: 'Shelter manager / animal welfare director',
      salary: '$45,000–80,000',
      growth: 'Steady',
      edu: 'BS often required. CAWA (Certified Animal Welfare Administrator) credential. Operations + management experience.',
      where: 'Maine: Animal Refuge League of Greater Portland, Bangor Humane Society, Coastal Humane Society.',
      tags: ['professional', 'BS+', 'mgmt'] },
    { id: 'lab', icon: '🔬', title: 'Laboratory animal veterinarian (DACLAM)',
      salary: '$120,000–180,000+',
      growth: 'Steady; specialized',
      edu: 'DVM + 3-yr residency in laboratory animal medicine + ACLAM board certification.',
      where: 'Universities + biotech + pharma. Jackson Lab in Bar Harbor is a major Maine employer.',
      tags: ['professional', 'doctorate+residency'] },
    { id: 'marine', icon: '🐬', title: 'Marine mammal trainer',
      salary: '$30,000–55,000',
      growth: 'Limited number of positions; very competitive',
      edu: 'BS in biology / animal science + extensive volunteer hours. Strong swimming + SCUBA helpful. IMATA certification path.',
      where: 'Aquariums + marine parks. Some research stations.',
      tags: ['BS+', 'apprenticeship-heavy', 'physical'] }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 7: TAKE ACTION — concrete steps across 4 scales
  // ─────────────────────────────────────────────────────────
  var TAKE_ACTION = {
    home: [
      { id: 'enrichment', icon: '🧩', what: 'Add daily enrichment for your existing pets',
        how: 'Food puzzles, scent work, training sessions (5 min beats 30), window perches for cats, foraging toys for parrots. Boredom drives most "bad" pet behavior.',
        impact: 'A puzzle-fed cat / dog has measurably lower stress hormones (Ellis 2009, J Feline Med Surg).',
        url: null },
      { id: 'firstAid', icon: '🚑', what: 'Memorize ASPCA Animal Poison Control: (888) 426-4435',
        how: 'Save the number in your phone NOW. $95 consult fee, available 24/7. Faster than driving to ER for many ingestions.',
        impact: 'The 30 seconds you save by knowing exactly who to call can change the outcome.',
        url: 'https://www.aspca.org/pet-care/animal-poison-control' },
      { id: 'tickPrevention', icon: '🕷️', what: 'Year-round tick prevention for any dog spending time outside',
        how: 'Talk to your vet about oral (NexGard, Bravecto, Credelio, Simparica) vs topical (Frontline). Adult ticks active any day above ~40°F — Maine winter is NOT a safety period.',
        impact: 'Lyme + anaplasmosis hit Maine dogs hard. Prevention costs ~$15–20/mo; treatment for chronic Lyme costs hundreds.',
        url: 'https://www.maine.gov/dhhs/mecdc/infectious-disease/epi/vector-borne/lyme/' }
    ],
    school: [
      { id: 'classpet', icon: '🐹', what: 'Advocate for thoughtful classroom-pet decisions',
        how: 'Most "classroom pets" (hamsters in tiny cages, untouched fish) suffer. Better: aquarium with appropriate species + filtration, or partner with a local shelter for read-to-shelter-cats programs.',
        impact: 'A classroom that gets animal welfare right teaches it; one that gets it wrong teaches that, too.',
        url: null },
      { id: 'shelterVisit', icon: '🏫', what: 'Organize a humane-society visit or guest speaker',
        how: 'Contact Animal Refuge League of Greater Portland or your local Maine humane society. Most have education programs designed for K-12 visits.',
        impact: 'Hands-on connection to real shelter work changes how kids think about pets-as-products.',
        url: 'https://arlgp.org/community/education/' }
    ],
    community: [
      { id: 'foster', icon: '🏠', what: 'Foster instead of adopt',
        how: 'Lower commitment than adoption; saves shelter space; helps animals decompress in a home environment. Shelters provide food, vet care, supplies.',
        impact: 'Maine shelter overcrowding spikes in summer. A 2-week foster slot literally saves a life.',
        url: 'https://arlgp.org/foster/' },
      { id: 'tnr', icon: '🐈', what: 'Support / volunteer for TNR programs',
        how: 'Trap-Neuter-Return is the only humane + effective community-cat management tool. Maine: SpayMaine (mobile clinic) and most county humane societies run TNR support.',
        impact: 'A single un-spayed feral female + her descendants can produce 100+ cats in 7 years.',
        url: 'https://www.spaymaine.org/' },
      { id: 'shelterNotStore', icon: '⛔', what: 'Adopt-don\'t-shop (and know why)',
        how: 'Pet-store puppies almost universally come from puppy mills (USDA-licensed but minimum-standards). Mills produce purebreds + designer mixes. Reputable breeders don\'t sell to stores.',
        impact: 'Maine has multiple puppy-mill rescue cases per year. Demand drives supply.',
        url: 'https://www.humanesociety.org/all-our-fights/stopping-puppy-mills' }
    ],
    civic: [
      { id: 'breedNeutral', icon: '🏛️', what: 'Advocate for breed-neutral housing + insurance laws',
        how: 'Many landlords + insurers ban "pit bull-type" dogs based on appearance alone. AVMA, ASPCA, and CDC all oppose breed-specific legislation as ineffective + unjust.',
        impact: 'Breed bans separate families from beloved pets and drive shelter intake.',
        url: 'https://www.avma.org/resources-tools/avma-policies/dangerous-animal-legislation' },
      { id: 'puppyMill', icon: '✉️', what: 'Contact your Maine legislators about pet-store sourcing',
        how: 'Maine LD 1432 (passed 2023) restricts pet-store dog sales but enforcement gaps remain. Find your rep at legislature.maine.gov; ask about ongoing animal-welfare bills.',
        impact: 'Most Maine legislators get few constituent contacts on animal-welfare bills. Yours stands out.',
        url: 'https://legislature.maine.gov' }
    ]
  };

  // ─────────────────────────────────────────────────────────
  // SECTION 7.5: FAMOUS ANIMALS IN SCIENCE
  // Cultural + scientific resonance — these are the animals whose names
  // students will encounter in textbooks, news, museums.
  // ─────────────────────────────────────────────────────────
  var FAMOUS_ANIMALS = [
    { id: 'pavlov', tag: 'science', icon: '🐕', name: 'Pavlov\'s dogs',
      where: 'Ivan Pavlov\'s lab, St. Petersburg · 1890s–1903 · Nobel Prize 1904 (digestion)',
      story: 'While studying salivary digestion, Pavlov noticed dogs salivated to the lab assistants\' footsteps before food arrived. He systematically paired a bell with food → dogs eventually salivated to the bell alone. Foundation of CLASSICAL conditioning. (Pavlov never used a bell as much as folklore says — metronomes, tones, light.)' },
    { id: 'skinner', tag: 'science', icon: '🕊️', name: 'Skinner\'s pigeons',
      where: 'B.F. Skinner\'s Harvard lab · 1940s–1970s',
      story: 'Skinner used pigeons in operant chambers ("Skinner boxes") to demonstrate reinforcement schedules — fixed/variable ratio + interval. Project Pigeon (WWII) trained pigeons to pilot guided missiles by pecking at targets through a window. Project was funded but never deployed.' },
    { id: 'alex', tag: 'cognition', icon: '🦜', name: 'Alex the African Grey',
      where: 'Irene Pepperberg lab, Purdue/Brandeis/Harvard · 1977–2007',
      story: 'Demonstrated ABSTRACT concepts (same / different, bigger / smaller, color, shape, number to 6, even zero) through ~30 years of training. His vocabulary topped 100 words, used in context. His last words to Pepperberg: "You be good. See you tomorrow. I love you."' },
    { id: 'koko', tag: 'cognition', icon: '🦍', name: 'Koko the gorilla',
      where: 'Francine Patterson, The Gorilla Foundation · 1971–2018',
      story: 'Western lowland gorilla taught American Sign Language. Working vocabulary ~1,000 signs; understood ~2,000 spoken English words. Famous for kitten "All Ball" and emotional responses to others\' grief. Findings remain debated — was it true language or trained associations? Even the debate raised the bar for animal cognition research.' },
    { id: 'endal', tag: 'service', icon: '🦮', name: 'Endal the Labrador',
      where: 'Allen Parton (UK Royal Navy veteran with brain injury) · 1997–2009',
      story: 'Trained service dog who learned 100+ tasks: card-key insertion at hotels, recovery position when handler had a fit, calling 999 (UK 911) by pressing a phone button. Featured in "Dog of the Millennium" award (BBC). One of the most documented examples of how task-trained service dogs extend a handler\'s independence.' },
    { id: 'hachiko', tag: 'culture', icon: '🐕', name: 'Hachikō the Akita',
      where: 'Tokyo · 1923–1935',
      story: 'Met his owner Professor Ueno at Shibuya Station every evening. After Ueno died at work in 1925, Hachikō continued to wait at the station every day for ~10 years until his own death. Bronze statue at Shibuya Station is one of Tokyo\'s landmarks. The story (and his tissue samples studied posthumously) shaped attachment-research thinking about dog-human bonds.' },
    { id: 'balto', tag: 'service', icon: '🐺', name: 'Balto + Togo (Iditarod precursors)',
      where: '1925 Serum Run · Nome, Alaska',
      story: 'A diphtheria outbreak threatened Nome\'s children; antitoxin was 674 miles away in winter conditions. A relay of 20 mushers + ~150 sled dogs delivered the serum in 5.5 days. Balto led the final leg into Nome (statue in Central Park). Togo, who led the longest + most dangerous leg under Leonhard Seppala, was historically under-credited — recent reappraisals give him equal billing.' },
    { id: 'stubby', tag: 'service', icon: '🐶', name: 'Sergeant Stubby',
      where: 'WWI · US Army 102nd Infantry · 1917–1918',
      story: 'Stray Boston Terrier mix who became the most decorated war dog of WWI. Detected gas attacks, located wounded soldiers, captured a German spy. Awarded multiple medals + met three US Presidents. Buried at the Smithsonian. The first dog to be promoted to sergeant in the US military.' },
    { id: 'belyaev', tag: 'science', icon: '🦊', name: 'Belyaev\'s silver foxes',
      where: 'Soviet Institute of Cytology and Genetics, Novosibirsk · 1959–present',
      story: 'Geneticist Dmitry Belyaev selected silver foxes for ONE trait: tameness around humans. Within ~10 generations, foxes started showing all the classic "domestication syndrome" traits: floppy ears, curly tails, piebald coats, smaller adrenals, longer reproductive seasons. Demonstrated that selection for behavior alone drags physical traits along genetically. Still ongoing 65+ years later.' },
    { id: 'cher-ami', tag: 'service', icon: '🕊️', name: 'Cher Ami the carrier pigeon',
      where: 'WWI · US Army Signal Corps · 1918',
      story: 'Carrier pigeon who delivered a critical message from the trapped "Lost Battalion" of the 77th Division. Shot through the chest, blinded, with a leg nearly severed, she still completed the 25-mile flight in 25 minutes — saving ~194 American soldiers. Awarded the French Croix de Guerre. Mounted body still on display at the Smithsonian.' }
  ];
  var FAMOUS_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'science', label: '🔬 Science' },
    { id: 'cognition', label: '🧠 Cognition' },
    { id: 'service', label: '🦮 Service' },
    { id: 'culture', label: '🌍 Culture' }
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 7.6: AI PRACTICE SCENARIOS + GROUND-TRUTH RUBRICS
  // 6 design scenarios. AI critique constrained by AI_GROUND_TRUTH list
  // so AI cannot hallucinate beyond the science taught in this tool.
  // ─────────────────────────────────────────────────────────
  var AI_SCENARIOS = [
    { id: 'family-pick', icon: '👨‍👩‍👧',
      title: 'Family pet selection',
      prompt: 'A family is considering their first pet. Two kids (ages 4 and 7), a parent with mild cat allergies, an apartment in Portland ME, both parents work 9–5. Budget is moderate. They\'re drawn to "a cute small dog" they saw on Instagram. Help them think through this honestly.',
      rubric: [
        'Acknowledges the cat-allergy + apartment + work-hours constraints',
        'Considers a small dog HONESTLY (still needs daily walks, training, ~$1500–2500/yr; alone-time challenge with both parents working)',
        'Considers alternatives that might fit better (guinea pig pair, fish tank, rabbit pair if they can do exotic-vet costs, pursuing the dog plan with specific accommodations)',
        'Mentions that "cute on Instagram" is a poor selection criterion and asks what they\'ve actually researched',
        'Suggests concrete next steps (visit shelter, talk to allergist, meet specific breeds in person)'
      ],
      hint: 'Don\'t just say "no dog." A good response respects their interest while making the tradeoffs visible. Sometimes the right answer is "wait until X changes" or "yes-with-these-adjustments."' },
    { id: 'service-match', icon: '♿',
      title: 'Service dog exploration for a peer',
      prompt: 'A 14-year-old classmate with type 1 diabetes + occasional unpredictable seizure breakthroughs is asking their family about getting a diabetic-alert service dog. Their parents are skeptical ("just buy a CGM"). The classmate asks for your help thinking it through.',
      rubric: [
        'Distinguishes diabetic-alert dog vs medical-alert task vs ESA vs therapy animal correctly',
        'Acknowledges that CGM (continuous glucose monitor) and a service dog are NOT mutually exclusive — both can be part of a diabetes-care plan',
        'Notes the cost + commitment reality (DAD program waitlists are 2–5 years; placement costs $20–50K; lifespan 8–12 yr)',
        'Mentions seizure-alert science: predictive ability is real but variable; some dogs alert reliably, others don\'t',
        'Suggests connecting with disability + diabetes organizations (ADA + JDRF + Diabetes Alert Dog programs like Can Do Canines)'
      ],
      hint: 'A service dog is not a replacement for a CGM, and vice versa. The honest framing helps the classmate avoid framing it as either-or in a parent conversation.' },
    { id: 'cat-litter', icon: '🐈',
      title: 'Cat behavior crisis',
      prompt: 'Your friend\'s 5-year-old indoor cat has started peeing OUTSIDE the litter box for the past 2 weeks. They\'re thinking about rehoming the cat. Walk them through what to actually do.',
      rubric: [
        'FIRST recommends a vet visit to rule out UTI, crystals, FLUTD — sudden behavior change in cats is medical until proven otherwise',
        'After medical clearance, considers stress / environmental triggers (new pet, new schedule, litter brand change, dirty box, box location)',
        'Litter-box rules: number of boxes = cats + 1; daily scooping; uncovered + low-sided for older cats; quiet location',
        'Advises against punishment / yelling — increases stress + makes elimination problems worse',
        'Mentions that rehoming for litter problems is a common and tragic shelter intake reason — almost always solvable with vet + management'
      ],
      hint: 'Vet first. Don\'t skip it. ~60% of "behavior" cases in cats turn out to have a medical driver.' },
    { id: 'rabbit-stasis', icon: '🐰',
      title: 'Rabbit emergency triage',
      prompt: 'Your friend texts you at 9 PM: "My rabbit hasn\'t eaten anything since this morning and is just sitting hunched in the corner. Should I just wait until morning to call the vet?"',
      rubric: [
        'Identifies this as a likely GI STASIS emergency — life-threatening within hours',
        'Says GO TO AN EMERGENCY EXOTIC VET TONIGHT, not wait for morning',
        'Notes that rabbit GI is fragile + bacteria overgrowth happens fast when motility stops',
        'Tells friend to bring fresh hay + water on the trip (some vets OK gut-stim massage but only if vet-trained)',
        'Provides Maine-specific pointer if possible — most regular vets don\'t do exotics; refer to a real exotic-vet clinic'
      ],
      hint: 'Rabbit GI stasis is the equivalent of a heart attack timing. Hours matter. "Wait until morning" is the wrong answer.' },
    { id: 'parrot-tiktok', icon: '🦜',
      title: 'Talking your friend out of a TikTok parrot',
      prompt: 'Your neighbor wants to buy a baby cockatoo from a local breeder because they keep going viral on TikTok. They have a 1-bedroom apartment, work 50-hour weeks, and admit they "don\'t really know much about birds." Help them think this through.',
      rubric: [
        'States the lifespan reality clearly: cockatoos live 50–80 years — outliving most owners; rehoming is the rule, not exception',
        'Notes the noise + mess reality (cockatoos are LOUD; landlord + neighbor problems are routine)',
        'Mentions the time + attention need: highly social birds, will scream/pluck when ignored',
        'Brings up the Teflon + scented-candle + smoke risks — kitchen overlap with bird = potential death',
        'Suggests alternatives: budgie or cockatiel (smaller, shorter-lived, quieter), or fostering through an avian rescue first'
      ],
      hint: 'Cockatoos are arguably the most surrendered companion bird species precisely because of the gap between TikTok-cuteness and real-life demands.' },
    { id: 'senior-dog', icon: '👴',
      title: 'Senior dog cognitive change',
      prompt: 'Your family\'s 14-year-old labrador-mix has started sleeping more than usual, sometimes seems lost in the kitchen at night, and pees on the floor occasionally even though she\'s house-trained. Your dad says "she\'s just old." Help your family think about this better.',
      rubric: [
        'Identifies these signs as possible Canine Cognitive Dysfunction (CCD) — the dog version of dementia',
        'Recommends vet visit FIRST to rule out medical causes (kidney disease, diabetes, UTI, arthritis, vision loss)',
        'Mentions that early intervention with diet (Hill\'s b/d, Purina Bright Mind), supplements (SAMe, antioxidants), enrichment, and possibly anti-anxiety meds can slow progression',
        'Notes that "she\'s just old" while sometimes true, often misses treatable conditions in seniors',
        'Acknowledges the harder conversation: as a 14-yo Lab she\'s past average lifespan, and quality-of-life planning is appropriate even if she has more years'
      ],
      hint: 'Senior pets get a lot of "she\'s just old" dismissal. Many "old age" symptoms are partially treatable, and intervention now extends both lifespan + quality.' }
  ];
  var AI_GROUND_TRUTH = [
    'Dogs: 15,000–40,000 years from Pleistocene wolf. Olfactory ~300M receptors vs 5M human. Lifespan inversely correlated with size (small 14–16 yr; giant 6–8 yr).',
    'Cats: obligate carnivores requiring taurine, vitamin A, arginine, arachidonic acid from animal protein. Indoor cats live 12–18 yr; outdoor 2–5.',
    'Rabbits: GI stasis is a TRUE EMERGENCY (hours matter). Need exotic-savvy vet. House Rabbit Society advises against rabbits for households with young children.',
    'Birds: respiratory air-sac anatomy makes them sensitive to PTFE/Teflon, aerosols, scented candles, smoke. Cockatoos + macaws live 50–80 years.',
    'Reptiles: ALL shed Salmonella. CDC: no reptiles in households with children under 5. Husbandry (UVB + heat gradient) is most reptile-death cause.',
    'Service dog (ADA): individually task-trained for a disability; full public access; only 2 questions allowed (1) is it a service animal because of a disability (2) what task. ESA: comfort by presence; FHA only; no public access. Therapy: visit-based, no automatic access.',
    'Toxic to dogs: chocolate (theobromine), grapes/raisins, xylitol, onions/garlic, macadamia. Toxic to cats: lilies (any part), onions/garlic. Toxic to birds: avocado, Teflon fumes.',
    'ASPCA Animal Poison Control: (888) 426-4435 ($95 24/7). Pet Poison Helpline: (855) 764-7661.',
    'Maine: Lyme + anaplasmosis density highest in US. Year-round tick prevention is standard veterinary care. ARLGP, Bangor Humane, Avian Haven are major Maine resources.',
    'Operant theory (covered in BehaviorLab): positive reinforcement is primary modality; AVSAB + AVMA oppose dominance-based / punishment-based training.',
    'NEVER recommend specific medications, dosages, or procedures — refer to a veterinarian.',
    'NEVER suggest rehoming a pet without first ruling out medical + manageable behavioral causes.'
  ];

  // ─────────────────────────────────────────────────────────
  // SECTION 8: TOOL REGISTRATION + RENDER (helpers + view router)
  // Render functions added in subsequent edits.
  // ─────────────────────────────────────────────────────────
  window.StemLab.registerTool('petsLab', {
    name: 'Science of Pets Lab',
    icon: '🐾',
    category: 'life-earth-science',
    description: 'Companion-animal SCIENCE: physiology, ethology, nutrition, genetics, domestication, zoonoses, service animals. Cross-species pet training that assumes BehaviorLab\'s operant theory and applies it to real homes. UDL-aligned via Service & Support Animals coverage.',
    tags: ['pets', 'animals', 'biology', 'ethology', 'genetics', 'service-dogs', 'maine'],
    render: function(ctx) {
      try {
        return _renderPets(ctx);
      } catch(e) {
        console.error('[Pets] render error', e);
        return ctx.React.createElement('div', { style: { padding: 16, color: '#fde2e2', background: '#7f1d1d', borderRadius: 8 } },
          'Pets Lab failed to render. ' + (e && e.message ? e.message : ''));
      }
    }
  });

  // _renderPets — the full render function defined below.
  function _renderPets(ctx) {
    var React = ctx.React;
    var h = React.createElement;
    var d = (ctx.toolData && ctx.toolData['petsLab']) || {};
    var upd = function(key, val) { ctx.update('petsLab', key, val); };
    var updMulti = function(obj) {
      if (ctx.updateMulti) ctx.updateMulti('petsLab', obj);
      else Object.keys(obj).forEach(function(k) { upd(k, obj[k]); });
    };
    var addToast = ctx.addToast || function(msg) { console.log('[Pets]', msg); };

    var view = d.view || 'menu';
    var modulesVisited = d.modulesVisited || {};
    var badges = d.badges || {};
    var quizState = d.quizState || { idx: 0, score: 0, answered: false, lastChoice: null };
    // Pet Picker state
    var pickHousing = d.pickHousing || 'house';
    var pickKids = d.pickKids != null ? d.pickKids : false;
    var pickAllergies = d.pickAllergies != null ? d.pickAllergies : false;
    var pickHoursHome = d.pickHoursHome != null ? d.pickHoursHome : 8;
    var pickBudget = d.pickBudget || 'medium';
    var pickExperience = d.pickExperience || 'some';
    // Lifetime cost state
    var costSpecies = d.costSpecies || 'dog-medium';
    var costYears = d.costYears != null ? d.costYears : 12;
    // Famous animals filter
    var famousFilter = d.famousFilter || 'all';
    // AI Practice state
    var aiScenarioId = d.aiScenarioId || null;
    var aiResponse = d.aiResponse || '';
    var aiCritique = d.aiCritique || null; // { text, source }
    var aiLoadingCritique = !!d.aiLoadingCritique;
    // Diagrams view
    var diagramView = d.diagramView || 'skull';

    function awardBadge(id, label) {
      if (badges[id]) return;
      var nextBadges = Object.assign({}, badges);
      nextBadges[id] = { earned: new Date().toISOString(), label: label };
      upd('badges', nextBadges);
      addToast('🏅 Badge: ' + label);
      petsAnnounce('Badge earned: ' + label);
    }
    function markVisited(modId) {
      if (modulesVisited[modId]) return;
      var nextVisited = Object.assign({}, modulesVisited);
      nextVisited[modId] = new Date().toISOString();
      upd('modulesVisited', nextVisited);
      var count = Object.keys(nextVisited).length;
      if (count >= 5) awardBadge('pets_explorer', 'Pet Science Explorer');
      if (count >= 12) awardBadge('pets_pro', 'Pet Science Pro');
    }

    // Theme — warm earth tones (cream + amber + brown)
    var T = {
      bg: '#1f1612', card: '#2d2018', cardAlt: '#181210', border: '#5c4536',
      text: '#fef3e2', muted: '#e8d5b7', dim: '#a89180',
      accent: '#f59e0b', accentHi: '#fbbf24', warm: '#fb923c',
      ok: '#84cc16', danger: '#dc2626', link: '#fcd34d'
    };
    function btn(extra) {
      return Object.assign({
        padding: '10px 16px', borderRadius: 10, border: '1px solid ' + T.border,
        background: T.card, color: T.text, fontSize: 14, fontWeight: 600,
        cursor: 'pointer', textAlign: 'left'
      }, extra || {});
    }
    function btnPrimary(extra) {
      return Object.assign(btn({ background: T.accent, color: '#1f1612', border: '1px solid ' + T.accent }), extra || {});
    }

    // Helpers
    function backBar(title) {
      return h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
        h('button', { 'data-pets-focusable': true,
          'aria-label': 'Back to Pets Lab menu',
          onClick: function() { upd('view', 'menu'); petsAnnounce('Back to menu'); },
          style: btn({ padding: '6px 12px', fontSize: 12 })
        }, '← Menu'),
        h('h2', { style: { margin: 0, fontSize: 20, color: T.text } }, title)
      );
    }
    function footer() {
      return h('div', { role: 'contentinfo', 'aria-label': 'Source attribution',
        style: { marginTop: 18, padding: '10px 14px', borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.border, color: T.dim, fontSize: 11, textAlign: 'center', lineHeight: 1.55 } },
        'Citations: AVMA · AAFP · AAFCO · IAADP · ASAB · CDC · House Rabbit Society · ASPCA · Bradshaw 2013 · Mech 2000. Educational only — for medical questions, see your veterinarian.');
    }
    function sourceCard(srcKey) {
      var s = SOURCE_CARDS[srcKey]; if (!s) return null;
      return h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
          h('span', { 'aria-hidden': 'true', style: { fontSize: 28 } }, s.icon),
          h('div', null,
            h('div', { style: { fontWeight: 700, fontSize: 17, color: T.text } }, s.name),
            h('div', { style: { fontSize: 12, color: T.accentHi } }, s.principle))),
        h('p', { style: { margin: '6px 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } }, s.oneLiner),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 6, fontSize: 11, color: T.dim } },
          s.lifespan && h('div', null, h('strong', { style: { color: T.text } }, 'Lifespan: '), s.lifespan),
          s.brain && h('div', null, h('strong', { style: { color: T.text } }, 'Brain: '), s.brain),
          h('div', { style: { gridColumn: '1 / -1' } }, h('strong', { style: { color: T.text } }, 'Cite: '), s.cite))
      );
    }
    function crossLink(label, body) {
      return h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.accent, marginTop: 12 } },
        h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, '🔗 ' + label),
        h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, body));
    }

    // Menu tile data
    var MENU_TILES = [
      { id: 'dogs',         icon: '🐕', label: 'Dogs',                 desc: 'Domestication, scent science, lifespan, dominance-myth debunked.' },
      { id: 'cats',         icon: '🐈', label: 'Cats',                 desc: 'Obligate carnivore biology, sensory world, vocal evolution.' },
      { id: 'smallMammals', icon: '🐹', label: 'Small mammals',        desc: 'Hamster / guinea pig / rabbit / ferret. Lifespans + social needs.' },
      { id: 'birds',        icon: '🦜', label: 'Birds',                desc: 'Vocal learning, air-sac respiration, decade-spanning lifespans.' },
      { id: 'reptiles',     icon: '🦎', label: 'Reptiles & amphibians', desc: 'Ectothermy, UVB, husbandry kills, Salmonella reality.' },
      { id: 'training',     icon: '🎯', label: 'Pet Training (applied)', desc: 'Cross-species training; assumes BehaviorLab theory.' },
      { id: 'nutrition',    icon: '🥩', label: 'Nutrition Science',    desc: 'Species-specific needs + 8 toxic foods to know.' },
      { id: 'genetics',     icon: '🧬', label: 'Domestication & Breeding', desc: 'Artificial selection, breed traits, inbreeding consequences.' },
      { id: 'zoonoses',     icon: '🦠', label: 'Zoonoses & One Health', desc: 'Diseases that cross species. Maine ticks. Rabies.' },
      { id: 'service',      icon: '♿', label: 'Service & Support Animals', desc: 'Service dog vs ESA vs therapy: legal + scientific distinctions.' },
      { id: 'picker',       icon: '🏠', label: 'Pet Picker',           desc: 'Match species/breed-class to your housing + lifestyle.' },
      { id: 'bodyLang',     icon: '👀', label: 'Body Language Decoder', desc: 'Read dogs, cats, rabbits, birds. Stress + appeasement signals.' },
      { id: 'cost',         icon: '💵', label: 'Lifetime Cost Calc',   desc: 'First-year + annual + emergency fund. Time + space too.' },
      { id: 'diagrams',     icon: '🔬', label: 'Diagrams',             desc: '4 SVG schematics: dog vs cat skull, bird air sacs, operant loop, body language.' },
      { id: 'aiPractice',   icon: '🤖', label: 'AI Practice',          desc: '6 real-world scenarios. AI critiques your reasoning vs welfare rubric.' },
      { id: 'famous',       icon: '🌟', label: 'Famous Animals',       desc: 'Pavlov, Skinner, Alex, Koko, Endal, Hachikō, Balto, Stubby, Belyaev foxes.' },
      { id: 'glossary',     icon: '📖', label: 'Glossary',             desc: '18 ethology + animal-care terms.' },
      { id: 'myths',        icon: '🧐', label: 'Myths Busted',         desc: '7 sourced corrections: alpha theory, pit bull jaws, more.' },
      { id: 'careers',      icon: '🧰', label: 'Career Pathways',      desc: 'Vet, vet tech, behaviorist, trainer, rehabber, more.' },
      { id: 'action',       icon: '🌱', label: 'Take Action',          desc: 'Concrete steps at home, school, community, civically.' },
      { id: 'quiz',         icon: '📝', label: '15-question quiz',     desc: 'Test your understanding across the lab.' },
      { id: 'resources',    icon: '📚', label: 'Resources',            desc: 'Every org cited in this tool.' },
      { id: 'teacher',      icon: '🎓', label: 'Teacher Guide',        desc: 'NGSS alignment, prompts, hands-on activities.' }
    ];

    function renderMenu() {
      var visitedCount = Object.keys(modulesVisited).length;
      function startHereCard() {
        var s;
        if (visitedCount === 0) {
          s = { header: '👋 First time here? Try this 5-tile path:',
                body: 'Start with 🐕 Dogs (most familiar), then 🐈 Cats, then 🦠 Zoonoses (Maine ticks!), then ♿ Service & Support Animals, then 📝 the quiz. About 30 minutes.' };
        } else if (visitedCount < 5) {
          s = { header: '👍 Already started — keep going:',
                body: 'Open 2 more species tiles, then 🎯 Pet Training (applied) and 🧬 Domestication & Breeding to see how operant theory + selective breeding shape modern pets.' };
        } else if (visitedCount < 12) {
          s = { header: '🚀 Branch into applied + values:',
                body: '🏠 Pet Picker (find your match), 💵 Lifetime Cost Calc (be honest with yourself), 🌱 Take Action.' };
        } else {
          s = { header: '🏁 You\'ve gone broad — capstone moves:',
                body: '📝 the 15-Q quiz, 🎓 Teacher Guide, and the 🧐 Myths page if you haven\'t.' };
        }
        return h('div', { role: 'region', 'aria-label': 'Recommended path through the lab',
          style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, s.header),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.6 } }, s.body));
      }
      return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
        h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 10 } },
          h('h2', { style: { margin: 0, fontSize: 22 } }, '🐾 Science of Pets Lab'),
          h('div', { style: { fontSize: 12, color: T.dim } },
            'Modules visited: ', h('strong', { style: { color: T.text } }, visitedCount + ' / ' + (MENU_TILES.length - 2)))),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          'How companion animals actually work — the physiology, behavior, genetics, and welfare science behind the pets in our lives. Pair with ',
          h('strong', { style: { color: T.text } }, 'BehaviorLab'), ' for operant-conditioning theory and ',
          h('strong', { style: { color: T.text } }, 'EvolutionLab'), ' for natural-selection theory.'),
        startHereCard(),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
          MENU_TILES.map(function(tile) {
            var visited = !!modulesVisited[tile.id];
            return h('button', { key: tile.id, role: 'listitem',
              'data-pets-focusable': true,
              'aria-label': tile.label + (visited ? ' (visited)' : ''),
              onClick: function() { upd('view', tile.id); markVisited(tile.id); petsAnnounce('Opening ' + tile.label); },
              style: btn({
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                padding: 14, minHeight: 110, background: T.card, cursor: 'pointer',
                borderColor: visited ? T.accent : T.border
              })
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, width: '100%' } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, tile.icon),
                h('span', { style: { fontWeight: 700, fontSize: 15, flex: 1 } }, tile.label),
                visited && h('span', { 'aria-hidden': 'true', style: { color: T.accent, fontSize: 14 } }, '✓')),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.45 } }, tile.desc));
          })),
        Object.keys(badges).length > 0 && h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border } },
          h('div', { style: { fontSize: 12, fontWeight: 700, color: T.muted, marginBottom: 6 } }, '🏅 Badges earned'),
          h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
            Object.keys(badges).map(function(bid) {
              return h('span', { key: bid, style: { fontSize: 11, padding: '4px 10px', borderRadius: 999, background: T.accent, color: '#1f1612', fontWeight: 700 } }, badges[bid].label || bid);
            }))),
        footer()
      );
    }

    // ─────────────────────────────────────────
    // SPECIES: DOGS
    // ─────────────────────────────────────────
    function renderDogs() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🐕 Dogs'),
        sourceCard('dogs'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Domestication: 15,000–40,000 years ago'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Dogs share a common ancestor with modern gray wolves but were NOT bred from them — both descend from an extinct Pleistocene wolf population. The current best estimate (Frantz 2016, Botigué 2017): ',
            h('strong', { style: { color: T.accentHi } }, 'a single domestication event between 15,000 and 40,000 years ago'),
            ', possibly in eastern Eurasia.'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            h('strong', { style: { color: T.text } }, 'Belyaev fox experiment'),
            ': starting 1959 in Soviet Siberia, geneticist Dmitry Belyaev selected silver foxes for one trait — tameness around humans. Within ~10 generations, foxes started showing all the classic "domestication syndrome" traits: floppy ears, curly tails, piebald coats, smaller adrenal glands, longer reproductive seasons. Showed that selecting for behavior alone drags physical traits along genetically.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'This means the dog\'s "look" and "personality" co-evolved as a package over thousands of generations of selection by ancient humans.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '👃 The dog nose: ~300 million olfactory receptors'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Humans have ~5 million olfactory receptors. Dogs have ~300 million. Their olfactory cortex is ~40× larger relative to brain size. Dogs also have a vomeronasal organ (Jacobson\'s organ) above the roof of the mouth for detecting pheromones.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Practical: a trained detection dog can find ',
            h('strong', { style: { color: T.accentHi } }, 'a teaspoon of sugar in an Olympic swimming pool of water'),
            '. Medical alert dogs detect blood-glucose changes (diabetes), seizure pre-states, and certain cancers — all from scent.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '⚠️ Lifespan paradox: bigger ≠ longer'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Across mammals, larger species generally live longer (mouse 2 yr, elephant 70 yr). But ',
            h('strong', { style: { color: T.text } }, 'within dogs the relationship REVERSES'),
            ': giant breeds (Great Dane, Irish Wolfhound) live 6–8 years; small breeds (Chihuahua, Toy Poodle) live 14–16 years. Hypotheses include accelerated growth → cellular damage and IGF-1 signaling differences.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Maine has a strong working-dog culture: sled dogs (Iditarod-class kennels in Bethel + Greenville), Labrador retrievers everywhere (Lab is named for Labrador, just to the north), coon hounds in rural Maine. Tick + Lyme density is among the highest in the US — see the Zoonoses tile. Cold-climate breeds (Husky, Malamute, Bernese) thrive; brachycephalic breeds (pugs, bulldogs) struggle in summer humidity.')),
        crossLink('Operant theory deep-dive', h('span', null,
          'For the science of how dogs learn — reinforcement schedules, shaping, extinction — open ',
          h('strong', { style: { color: T.text } }, 'BehaviorLab'), '. This tile focuses on dog-specific physiology + history; the Pet Training tile applies BehaviorLab\'s theory to real-world scenarios (housetraining, recall, leash, alone-time).')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: CATS
    // ─────────────────────────────────────────
    function renderCats() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🐈 Cats'),
        sourceCard('cats'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🥩 Obligate carnivore biochemistry'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Cats lost the metabolic ability to synthesize key nutrients during their evolution as strict meat-eaters. They MUST consume animal protein to obtain:'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Taurine'), ' — deficiency causes dilated cardiomyopathy + retinal degeneration. AAFCO commercial cat food guarantees minimums.'),
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Vitamin A'), ' — cats can\'t convert beta-carotene from plants to vitamin A like dogs/humans do.'),
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Arachidonic acid'), ' — required for inflammatory + reproductive function; absent in plant fats.'),
            h('li', null, h('strong', { style: { color: T.accentHi } }, 'Arginine'), ' — without it, ammonia builds up dangerously after a single meat-free meal.')),
          h('p', { style: { margin: '8px 0 0', color: T.warm, fontSize: 12, lineHeight: 1.6, fontStyle: 'italic' } },
            'Vegan diets for cats are not an ethical choice — they\'re medical neglect. (AAFP 2017 position statement.)')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '👁️ Sensory world: built for low-light hunting'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('li', null, h('strong', { style: { color: T.text } }, 'Slit pupils'), ' that close to a vertical line — admit far less light at midday and far more at twilight.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Tapetum lucidum'), ' — reflective layer behind the retina that gives the eyeshine effect, doubling effective sensitivity in low light.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Whiskers (vibrissae)'), ' — embedded in 200+ nerve endings; map gap-width when navigating in the dark. Whisker fatigue from narrow food bowls is real.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Hearing range'), ' to ~64 kHz (human ~20 kHz, dog ~45 kHz) — they hear ultrasonic rodent calls.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Vision'), ' — dichromatic (similar to red-green color blind humans). Trade color for low-light + motion sensitivity.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '🗣️ The meow is for humans'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Adult feral cats almost never meow at each other — they communicate via body language, scent marking, and growls/hisses for conflict. The plaintive adult-cat ',
            h('em', null, '"meow"'),
            ' is a domestication artifact: it\'s acoustically optimized to grab human attention (similar frequency profile to a baby\'s cry — Nicastro 2004). Cats learned that humans respond to it; the trait persisted.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'The ',
            h('strong', { style: { color: T.accentHi } }, 'Maine Coon'),
            ' is the largest domestic cat breed and an actual Maine native — emerged from working farm cats in the late 1800s, with cold-adapted features (large size for thermal mass, water-resistant coat, tufted paws like snowshoes, ear tufts to keep ear canals warm). Official state cat of Maine since 1985. Origin myths (raccoon hybrid, Marie Antoinette\'s cats) are charming but biologically false — Maine Coons are ',
            h('em', null, 'Felis catus'),
            ' selected by Maine winters.')),
        crossLink('Cat training is real', h('span', null,
          'For the operant theory of how cats learn, see ', h('strong', { style: { color: T.text } }, 'BehaviorLab'),
          '. Cats train readily with food rewards + clickers — see the Pet Training tile. The "cats can\'t be trained" myth is in Myths Busted.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: SMALL MAMMALS (rabbit / GP / hamster / ferret bundle)
    // ─────────────────────────────────────────
    function renderSmallMammals() {
      var list = [
        { name: 'Rabbit', icon: '🐰', life: '8–12 yr (indoor)',
          social: 'Bonded pair (rarely solo). Bonding takes weeks of supervised intros.',
          pitfall: 'Cages are inhumane — need a free-roam area or ≥4×4 ft pen. GI stasis is a real emergency: any rabbit not eating for 12+ hr needs a vet IMMEDIATELY.',
          chow: 'Unlimited grass hay (timothy / orchard). Limited pellets. Fresh leafy greens (NOT iceberg). No carrots as staple — too sugary.',
          cite: 'House Rabbit Society' },
        { name: 'Guinea pig', icon: '🐹', life: '5–8 yr',
          social: 'Strict herd animal. ILLEGAL to own solo in Switzerland. Bond a same-sex pair (or trio) — lifelong company.',
          pitfall: 'Vitamin C dependent (like humans + great apes — most mammals make their own). Need fresh bell pepper / parsley / GP-formulated pellets daily or get scurvy.',
          chow: 'Hay (~80% diet) + vitamin-C-stable pellets + fresh veggies daily.',
          cite: 'AVMA Companion Animal' },
        { name: 'Hamster', icon: '🐹', life: '2–3 yr',
          social: 'Strictly solitary. Two hamsters in one cage = fights to the death (especially Syrians).',
          pitfall: 'Most pet-store cages are far too small (need minimum 600 sq in floor space — Syrian hamsters). Wire wheels can damage feet — solid wheels only. Crepuscular: night shift.',
          chow: 'Seed/pellet mix + small fresh veggies. Avoid sugary fruits (diabetes risk in dwarves).',
          cite: 'AVMA + RSPCA' },
        { name: 'Ferret', icon: '🦦', life: '6–10 yr',
          social: 'Group animal — solo ferret = lonely ferret. Most happy in pairs/trios.',
          pitfall: 'Obligate carnivores (like cats — cannot eat plant-based food). Adrenal disease + insulinoma very common in older ferrets — vet care expensive. Strong odor even when descented.',
          chow: 'Ferret-specific kibble (high meat protein, low carb) OR raw/whole prey diet. NEVER dog food.',
          cite: 'AFA + AVMA Exotic Pet' }
      ];
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🐹 Small mammals'),
        sourceCard('smallMammals'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            'Often marketed as "starter pets" but most are LESS forgiving than dogs/cats: prey-species stress, fragile GI tracts, narrow diet windows, and species-specific social rules that the pet-store sells you wrong.')),
        list.map(function(p) {
          return h('div', { key: p.name, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 10 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, p.icon),
              h('strong', { style: { color: T.accentHi, fontSize: 15 } }, p.name),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.warm, fontFamily: 'monospace' } }, p.life)),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.text } }, '👥 Social: '), p.social),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.danger } }, '⚠ Pitfall: '), p.pitfall),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.text } }, '🥗 Diet: '), p.chow),
            h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + p.cite));
        }),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Backyard rabbit + chicken hobby farms are common in rural Maine. Hawks, fishers, and weasels are constant predator pressures — outdoor enclosures need wire FLOORS too, not just sides. Maine winters mean rabbits + GP need above-freezing housing or a heated shed.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: BIRDS
    // ─────────────────────────────────────────
    function renderBirds() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🦜 Birds'),
        sourceCard('birds'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🫁 Air sacs: why birds are poison-canaries'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Birds don\'t breathe like mammals. Instead of two-way lung tidal flow, they have a one-way circulation through ',
            h('strong', { style: { color: T.accentHi } }, '9 air sacs'),
            ' that make every breath a flow-through exchange — vastly more efficient than mammalian breathing.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Side effect: ',
            h('strong', { style: { color: T.danger } }, 'birds inhale far more air per kg than we do'),
            '. Airborne toxins that mildly irritate humans kill birds in minutes. Major risks: ',
            h('strong', { style: { color: T.text } }, 'Teflon (PTFE) overheated cookware'),
            ' (deadly within 5–15 min), aerosol cleaners, scented candles + plug-ins, cigarette + cooking smoke, self-cleaning ovens during the cycle. Pet birds historically alerted miners to carbon monoxide and methane for the same physiological reason.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🧠 Vocal learning + cognition'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Parrots are one of only a handful of vertebrate groups that learn novel vocalizations (others: humans, songbirds, hummingbirds, cetaceans, bats, elephants). They can copy human speech because they can map auditory input to muscle output via a neural circuit similar to our own.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Alex the African Grey (Pepperberg lab, 1977–2007) demonstrated abstract concepts: numerical understanding to 6, "same/different," "bigger/smaller," and zero. His last words to Pepperberg: "You be good. See you tomorrow. I love you."')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '⏱️ Lifespan reality check'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Macaws + cockatoos: ',
            h('strong', { style: { color: T.accentHi } }, '50–80 years'),
            '. African Greys: 40–60. Amazons: 40–60. Cockatiels: 15–25. Budgies: 5–10. Larger parrots routinely outlive their first owner — buyers should plan for the bird\'s rehoming as part of the adoption decision.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Backyard chickens are increasingly common across Maine — productive layers + manageable. Avian influenza (HPAI) outbreaks have hit Maine flocks; biosecurity matters. For wild bird rescue, ',
            h('strong', { style: { color: T.accentHi } }, 'Avian Haven in Freedom, ME'),
            ' is the regional rehab center.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SPECIES: REPTILES & AMPHIBIANS
    // ─────────────────────────────────────────
    function renderReptiles() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🦎 Reptiles & amphibians'),
        sourceCard('reptiles'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🌡️ Ectothermy: temperature is your job'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Reptiles cannot generate body heat from metabolism — their entire physiology depends on environmental temperature. A reptile at the wrong temperature can\'t digest food, fight infection, or move. ',
            h('strong', { style: { color: T.accentHi } }, 'Most pet reptile deaths are husbandry failures, not disease'),
            '.'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Required setup: ',
            h('strong', { style: { color: T.text } }, 'thermal gradient'),
            ' (basking spot at species-specific high; cool zone at species-specific low). UVB lighting for diurnal species (bearded dragons, tortoises) — without UVB the animal can\'t synthesize vitamin D3 → metabolic bone disease (deformed legs, soft jaw, fatal). UVB bulbs LOSE output before they look dim — replace every 6–12 months even if visibly bright.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🦠 Salmonella: not optional'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'CDC: ',
            h('strong', { style: { color: T.accentHi } }, 'all reptiles + amphibians shed Salmonella'),
            ' regardless of how clean they appear. Wash hands every time. CDC actively recommends ',
            h('strong', { style: { color: T.warm } }, 'no reptiles in households with children under 5'),
            ' or immunocompromised members. Don\'t let reptiles roam in food-prep areas. Don\'t kiss your turtle.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.text } }, '🐸 Amphibians: bad pets for kids'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Frog and salamander skin is permeable — they breathe + drink through it. Soap residue on a child\'s hands can poison the animal. Lotion, sunscreen, even tap water with chlorine. Look-don\'t-touch is the right framing.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine angle'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Wild reptiles in Maine are protected — collecting native turtles or snakes for pets is illegal under Maine IFW rules. Released exotic reptiles (red-eared sliders most often) become invasive in southern Maine ponds. The pet-trade-released-into-the-wild pipeline is the #1 invasive-species vector globally (see also: Burmese pythons in Florida Everglades, lionfish in Caribbean).')),
        footer());
    }

    // ─────────────────────────────────────────
    // PET TRAINING (applied — distinct from BehaviorLab)
    // ─────────────────────────────────────────
    function renderTraining() {
      var scenarios = [
        { id: 'house', name: 'Housetraining a puppy',
          principle: 'Reinforce success outdoors; never punish accidents indoors',
          how: 'Puppy out every 1–2 hr + after meals + after waking. Praise + tiny treat WITHIN 3 SECONDS of finishing. Indoor accidents → silent cleanup with enzymatic cleaner. Punishing post-fact teaches "don\'t pee around humans" → harder training.',
          species: 'Dogs (and rabbits — yes, rabbits litter-train naturally)' },
        { id: 'recall', name: 'Reliable recall ("come" works every time)',
          principle: 'Recall must always predict something AMAZING',
          how: 'Practice on long line first. Reward EVERY recall with high-value treat (chicken, cheese, hot dog) for the first 6 months. Never call your dog to do something they hate (bath, leaving the dog park). Fading rewards too early = unreliable recall.',
          species: 'Dogs primarily' },
        { id: 'leash', name: 'Loose-leash walking',
          principle: 'Pulling never works (handler stops; reward when leash slackens)',
          how: 'Handler stops moving the moment the leash goes tight. Wait for any slack — reward + resume. Slow at first, fast with practice. Front-clip harness (Easy Walk) helps mechanically; don\'t use prong / shock / choke (AVSAB position).',
          species: 'Dogs' },
        { id: 'crate', name: 'Crate as positive resting place',
          principle: 'Crate is a den, not a punishment',
          how: 'Feed all meals + chews inside crate with door open. Slowly close door for 5 sec → 30 sec → minutes, always with a stuffed Kong. Never use as discipline. A crate-conditioned puppy chooses the crate as a nap spot for life.',
          species: 'Dogs (and cats — same idea with carriers)' },
        { id: 'alone', name: 'Alone-time tolerance (separation prep)',
          principle: 'Teach alone-time BEFORE you need it',
          how: 'Practice 30 sec → 2 min → 5 min → 30 min absences from puppyhood, paired with a stuffed Kong or chew. Build slowly. Don\'t make a ritual of departures (cue triggers anxiety). Severe separation anxiety needs a vet behaviorist — do NOT crate an actively-panicking dog.',
          species: 'Dogs primarily; some parrots also' },
        { id: 'cat-sit', name: 'Sit / target / high-five (cats)',
          principle: 'Cats learn fine — they just need food rewards + short sessions',
          how: 'Use clicker or marker word. Lure with treat over the head → tail tucks under → "sit" → click + treat. 5 sessions of 2 min each beats one 10-min slog. Cats won\'t work for praise like dogs do — pay them.',
          species: 'Cats' },
        { id: 'parrot-step', name: 'Parrot "step up" + recall',
          principle: 'Bites + flying off = no consequence; stepping up + flying to you = jackpot',
          how: 'Hold finger / perch in front of belly + cue "step up." Reward generously when they step up. NEVER chase a parrot — handle on their schedule. Recall is built with two trainers + treats, increasing distance.',
          species: 'Parrots' }
      ];
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🎯 Pet Training (applied)'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, 'This tile assumes the operant theory'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Reinforcement, schedules, shaping, extinction, and discrimination are covered deeply in ',
            h('strong', { style: { color: T.text } }, 'BehaviorLab'),
            ' (Skinner-box mouse simulator). This tile applies that theory to real homes + cross-species: what mice in a chamber can\'t teach you about working with a 60-lb dog or a parrot or a cat in your living room.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🧠 What pet training adds beyond Skinner box'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
            h('li', null, h('strong', { style: { color: T.text } }, 'Socialization periods (developmental window):'),
              ' Puppies 3–14 wk, kittens 2–7 wk. Animals that don\'t encounter cars / kids / vacuum cleaners / strangers / handling during this window often stay fearful for life. NOT operant — it\'s neurodevelopmental imprinting.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Cross-species cognition differences:'),
              ' Dogs read human pointing gestures from puppyhood; wolves don\'t. Cats discriminate human voices but don\'t care to respond. Parrots use abstract concepts (Alex). One method does NOT fit all species.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Bond + handler relationship:'),
              ' Reinforcement value depends on the relationship — the same treat from a stranger is worth less than from a trusted handler. Skinner box doesn\'t model this.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Stress + trigger stacking:'),
              ' A dog already worried about thunderstorms may snap at the cat tonight even if cat-tolerance is normally fine. Read calming signals; manage stressors before they compound.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Real-world discrimination:'),
              ' "Sit" in your kitchen ≠ "sit" at the vet ≠ "sit" with a squirrel running by. Generalize across many contexts, not just one.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '7 real-world training scenarios'),
          scenarios.map(function(s) {
            return h('div', { key: s.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('strong', { style: { color: T.accentHi, fontSize: 14 } }, s.name),
              h('div', { style: { fontSize: 11, color: T.warm, fontStyle: 'italic', marginTop: 3, marginBottom: 5 } }, '↳ ' + s.principle),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, s.how),
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Species: ' + s.species));
          })),
        h('div', { style: { padding: 14, borderRadius: 10, background: '#3a1a1a', border: '1px solid ' + T.danger, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.warm } }, '⚠️ The dominance / "alpha" myth'),
          h('p', { style: { margin: 0, color: '#fde2e2', fontSize: 13, lineHeight: 1.6 } },
            'Skip "be the alpha." It was based on captive-wolf studies of unrelated wolves forced together (artificial). L. David Mech, the wolf researcher whose work popularized the term, has spent decades trying to retract it. Wild wolf packs are FAMILIES. Modern training (AVSAB, AVMA, AAVSB position) uses cooperative reinforcement — not status-based correction.')),
        crossLink('Theory deep-dive: BehaviorLab', h('span', null,
          'For interactive operant conditioning (reinforcement, schedules, shaping, extinction, chains, discrimination), open ',
          h('strong', { style: { color: T.text } }, 'BehaviorLab'),
          '. This Pet Training tile assumes you have that theory and shows how to apply it to real animals in real homes.')),
        footer());
    }

    // ─────────────────────────────────────────
    // NUTRITION
    // ─────────────────────────────────────────
    function renderNutrition() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🥩 Nutrition Science'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Species-specific requirements'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 } },
            SPECIES_NUTRITION.map(function(n) {
              return h('div', { key: n.id, role: 'listitem',
                style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, n.icon),
                  h('strong', { style: { color: T.accentHi, fontSize: 13 } }, n.name)),
                h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, n.need),
                h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + n.cite));
            }))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '☠️ 8 common toxic foods'),
          TOXIC_FOODS.map(function(f) {
            return h('div', { key: f.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, f.icon),
                h('strong', { style: { color: T.accentHi, fontSize: 14 } }, f.name),
                h('span', { style: { marginLeft: 'auto', fontSize: 10, color: T.warm, fontFamily: 'monospace' } }, '→ ' + f.species)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
                h('strong', { style: { color: T.text } }, 'Mechanism: '), f.mechanism),
              f.thresholdNote && h('div', { style: { fontSize: 11, color: T.warm, marginBottom: 3 } },
                h('strong', null, 'Threshold: '), f.thresholdNote),
              h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + f.cite));
          })),
        h('div', { style: { padding: 14, borderRadius: 10, background: '#3a1a1a', border: '1px solid ' + T.danger } },
          h('h3', { style: { margin: '0 0 6px', fontSize: 14, color: T.warm } }, '🚑 If you suspect ingestion'),
          h('p', { style: { margin: 0, color: '#fde2e2', fontSize: 13, lineHeight: 1.55 } },
            h('strong', null, 'ASPCA Animal Poison Control: (888) 426-4435'),
            ' — $95 consult, 24/7. Often faster than driving to ER and they\'ll triage whether home observation is enough or vet is needed. ',
            h('strong', null, 'Pet Poison Helpline: (855) 764-7661'),
            ' is an alternative.')),
        footer());
    }

    // ─────────────────────────────────────────
    // DOMESTICATION & BREEDING
    // ─────────────────────────────────────────
    function renderGenetics() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🧬 Domestication & Breeding'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, 'This tile owns artificial selection'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'For natural-selection theory (Darwin, Galápagos finches, Hardy-Weinberg, genetic drift), open ',
            h('strong', { style: { color: T.text } }, 'EvolutionLab'),
            '. This tile covers ARTIFICIAL selection — what humans did to dogs, cats, and other companion species across thousands of generations of choosing who breeds with whom.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, 'Domestication timeline'),
          h('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: 12 } },
            h('thead', null,
              h('tr', { style: { background: T.cardAlt } },
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'Species'),
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'When'),
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'From'),
                h('th', { scope: 'col', style: { padding: '6px 8px', textAlign: 'left', color: T.accentHi } }, 'Where'))),
            h('tbody', null,
              [['Dog', '15,000–40,000 yr ago', 'Pleistocene wolf', 'East Eurasia'],
               ['Cat', '~9,500 yr ago', 'Felis silvestris (African wildcat)', 'Fertile Crescent'],
               ['Goat', '~10,000 yr ago', 'Bezoar ibex', 'Zagros Mountains'],
               ['Sheep', '~10,000 yr ago', 'Mouflon', 'Anatolia'],
               ['Pig', '~9,000 yr ago', 'Wild boar', 'Multiple sites'],
               ['Horse', '~5,500 yr ago', 'Eurasian wild horse', 'Pontic-Caspian steppe'],
               ['Chicken', '~8,000 yr ago', 'Red junglefowl', 'SE Asia'],
               ['Rabbit', '~1,500 yr ago', 'European wild rabbit', 'French monasteries'],
               ['Guinea pig', '~7,000 yr ago', 'Cavia tschudii', 'Andes mountains'],
               ['Hamster (Syrian)', '~1930 (essentially modern)', 'Wild Mesocricetus auratus', 'Aleppo, Syria']].map(function(row, i) {
                return h('tr', { key: i, style: { background: i % 2 === 0 ? T.cardAlt : T.card, borderBottom: '1px solid ' + T.border } },
                  row.map(function(cell, j) {
                    return h('td', { key: j, style: { padding: '6px 8px', color: j === 0 ? T.text : T.muted, fontWeight: j === 0 ? 700 : 400 } }, cell);
                  }));
              })))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🦴 Inbreeding consequences (the cost of "purebred")'),
          h('p', { style: { margin: '0 0 8px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Closed studbooks (you can only breed within the registered pool) + selection for extreme features create concentrated genetic problems:'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 13, color: T.muted, lineHeight: 1.65 } },
            h('li', null, h('strong', { style: { color: T.warm } }, 'Brachycephaly'),
              ' (English bulldog, French bulldog, pug, Persian cat): collapsed airways, can\'t exercise, can\'t cool themselves, eye problems, dental crowding. Many can\'t give birth without C-section.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Hip dysplasia'),
              ' (German Shepherd, Labrador, Golden Retriever): malformed hip joint causes lifelong pain. OFA + PennHIP screening before breeding reduces incidence.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Syringomyelia'),
              ' (Cavalier King Charles Spaniel): brain too large for the skull → spinal cord cavities → severe pain. ~70% of CKCS show MRI signs by age 6.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Deafness'),
              ' linked to white-coat genes (Dalmatians, blue-eyed white cats, double-merle dogs). Up to 30% of Dalmatians have hearing loss in at least one ear.'),
            h('li', null, h('strong', { style: { color: T.warm } }, 'Hypertrophic cardiomyopathy'),
              ' (Maine Coon, Ragdoll cats): genetic test exists for the major mutations; reputable breeders screen.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'Designer-breed reality'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'F1 "doodle" hybrids (Goldendoodle, Labradoodle) are genuinely first-generation crosses with hybrid vigor and unpredictable coats / sizes / temperaments. F2+ generations (doodle × doodle) lose the predictability AND can stack health risks from both parents. "Hypoallergenic" is overstated — allergens are in saliva + dander, not just hair, and no breed is truly hypoallergenic.')),
        footer());
    }

    // ─────────────────────────────────────────
    // ZOONOSES & ONE HEALTH
    // ─────────────────────────────────────────
    function renderZoonoses() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🦠 Zoonoses & One Health'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Zoonoses are diseases that cross between humans and other animals. The CDC ',
            h('strong', { style: { color: T.accentHi } }, 'One Health'),
            ' framework recognizes that human, animal, and environmental health are inseparable. About 60% of known infectious diseases are zoonotic; ~75% of newly emerging infectious diseases originate in animals.')),
        ZOONOSES.map(function(z) {
          return h('div', { key: z.id, style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
              h('span', { 'aria-hidden': 'true', style: { fontSize: 20 } }, z.icon),
              h('strong', { style: { color: T.accentHi, fontSize: 14 } }, z.name),
              h('span', { style: { marginLeft: 'auto', fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'from ' + z.from)),
            h('div', { style: { fontSize: 12, color: T.warm, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', null, '⚠ Severity: '), z.severity),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
              h('strong', { style: { color: T.text } }, '🛡 Protect: '), z.protect),
            h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Cite: ' + z.cite));
        }),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine reality'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            'Maine has ',
            h('strong', { style: { color: T.accentHi } }, 'one of the highest US Lyme + anaplasmosis incidence rates'),
            '. Year-round tick prevention is standard veterinary care. Maine CDC tracks tick-borne disease cases — see maine.gov/dhhs/mecdc. Rabies is endemic in Maine wildlife (raccoons, skunks, foxes, bats); annual rabies vaccine is legally required for dogs + cats.')),
        footer());
    }

    // ─────────────────────────────────────────
    // SERVICE & SUPPORT ANIMALS (UDL standout)
    // ─────────────────────────────────────────
    function renderService() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('♿ Service & Support Animals'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, 'Three legally + scientifically distinct categories'),
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'These get conflated constantly in public conversation, but they have very different legal protections, training standards, and access rights. Knowing the difference matters for handlers, businesses, school staff, and bystanders.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🦮 Service dog (ADA, federal)'),
          h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Definition: '),
              'A dog (and in some narrow cases miniature horse) ',
              h('strong', { style: { color: T.text } }, 'individually trained to perform tasks for a person with a disability'),
              '. The disability can be physical, sensory, psychiatric, intellectual, or other.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Access: '),
              'Full public access under the ADA — restaurants, shops, hospitals, schools, planes (separately under ACAA). Businesses may ask only TWO questions: (1) Is the dog a service animal required because of a disability? (2) What work or task has the dog been trained to perform? They CANNOT ask for documentation, demand a demonstration, or ask about the disability.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Tasks include: '),
              'guiding (blind), alerting (deaf), medical alert (blood-glucose drop, oncoming seizure), retrieval, mobility brace, deep-pressure therapy (interrupting psychiatric episodes), reminder-to-take-meds, room searching for PTSD.'),
            h('p', { style: { margin: 0 } },
              h('strong', { style: { color: T.warm } }, 'No federal certification or registration exists. '),
              'The "Amazon vest + ID card" market is a scam — those products mean nothing legally. ADI + IGDF accredit training programs, but a self-trained service dog is equally legal under the ADA.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '💚 Emotional Support Animal (ESA — FHA only)'),
          h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Definition: '),
              'A pet (any species) whose ',
              h('strong', { style: { color: T.text } }, 'presence provides comfort'),
              ' to a person with a documented mental-health diagnosis. ESAs are NOT task-trained. The benefit is companionship, not task performance.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Access: '),
              h('strong', { style: { color: T.text } }, 'NOT a service animal under the ADA'),
              '. Limited protections under the federal Fair Housing Act (no-pet rentals must accommodate with valid ESA letter from a treating mental-health provider). DOT removed ESA accommodation from US airlines in 2021. No public-access right (restaurants, shops, schools can decline).'),
            h('p', { style: { margin: 0 } },
              h('strong', { style: { color: T.warm } }, 'Online "ESA letters" '),
              'sold in 5 minutes are widely considered fraudulent — a legitimate ESA letter requires a real therapeutic relationship with a licensed mental-health provider treating a documented condition.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '🤝 Therapy animal (visit-based)'),
          h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6 } },
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Definition: '),
              'A pet trained + temperament-tested to provide ',
              h('strong', { style: { color: T.text } }, 'comfort visits to OTHERS'),
              ' — hospital patients, school readers, nursing-home residents, courtroom witnesses. The handler is a volunteer; the animal\'s "patient" is the person they\'re visiting, not the handler.'),
            h('p', { style: { margin: '0 0 6px' } },
              h('strong', { style: { color: T.accentHi } }, 'Access: '),
              'No automatic public access. Visits are by invitation of the facility. Pet Partners + Therapy Dogs International + Alliance of Therapy Dogs are the major credentialing bodies (temperament test + handler training + insurance).'),
            h('p', { style: { margin: 0 } },
              h('strong', { style: { color: T.text } }, 'Reading-to-dogs programs '),
              'in libraries + schools improve struggling readers\' fluency by reducing the social-pressure cost of reading aloud (Schmidt 2019). Available at many Maine libraries.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'Service-animal etiquette (handlers + bystanders)'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
            h('li', null, h('strong', { style: { color: T.text } }, 'Don\'t pet a working service dog'),
              ' even if cute — the handler depends on focus. Ask first, expect "no thanks, he\'s working."'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Don\'t distract'),
              ' (eye contact, kissy noises, calling the dog\'s name). A distracted alert dog can miss a medical signal.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Don\'t bring your pet'),
              ' just because you saw a service dog — pet-vs-service-dog confrontations injure handlers regularly.'),
            h('li', null, h('strong', { style: { color: T.text } }, 'Service dogs in training'),
              ' have less protection in many states; Maine recognizes SDIT under state law for handler training.'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🌲 Maine resources'),
          h('p', { style: { margin: 0, fontSize: 12, color: T.muted, lineHeight: 1.55 } },
            h('strong', { style: { color: T.accentHi } }, 'Hero Pups'),
            ' (NH/ME) places service dogs with veterans + first responders. ',
            h('strong', { style: { color: T.accentHi } }, 'NEADS'),
            ' (MA-based, serves Maine) trains hearing + service dogs. ',
            h('strong', { style: { color: T.accentHi } }, 'Pet Partners'),
            ' has Maine-active therapy teams. For ESA letters, work with your existing therapist — not an online vendor.')),
        footer());
    }

    // ─────────────────────────────────────────
    // PET PICKER (interactive matchmaker)
    // ─────────────────────────────────────────
    function renderPicker() {
      // Score candidate species against current inputs.
      var candidates = [
        { id: 'dog-large', name: 'Large dog (Lab, GSD, retriever-class)', icon: '🐕',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'house') s += 3; else if (o.housing === 'apartment') s -= 2;
            if (o.hours <= 4) s += 2; else if (o.hours <= 8) s += 1; else s -= 1;
            if (o.experience === 'lots') s += 2; else if (o.experience === 'some') s += 1;
            if (o.budget === 'low') s -= 2;
            if (o.allergies) s -= 2;
            return s;
          },
          note: 'Needs 1–2 hr/day exercise. Will shed and slobber. Good with kids when raised right.' },
        { id: 'dog-small', name: 'Small dog (terrier, dachshund, toy-class)', icon: '🐕‍🦺',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'apartment') s += 2; else s += 1;
            if (o.hours <= 6) s += 2;
            if (o.experience === 'first') s += 1; // small dogs more first-time-owner friendly
            if (o.budget === 'low') s -= 1;
            if (o.allergies) s -= 2;
            if (o.kids) s -= 1; // small dogs often less kid-tolerant
            return s;
          },
          note: 'Less exercise need but still daily walks + training. Often longer-lived (14–16 yr).' },
        { id: 'cat', name: 'Cat (indoor)', icon: '🐈',
          fit: function(o) {
            var s = 2; // generally easy
            if (o.housing === 'apartment') s += 1;
            if (o.hours >= 6) s += 1;
            if (o.experience === 'first') s += 1;
            if (o.budget === 'low') s += 1;
            if (o.allergies) s -= 3; // cats are biggest allergy risk
            return s;
          },
          note: 'Great match for many lifestyles. Provide vertical space, enrichment, two cats often happier than one.' },
        { id: 'rabbit-pair', name: 'Bonded rabbit pair', icon: '🐰',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'house') s += 2; else s += 1;
            if (o.experience === 'first') s -= 1;
            if (o.budget === 'low') s -= 2;
            if (o.kids && o.kidAge < 8) s -= 2; // small kids + rabbits rarely work
            return s;
          },
          note: 'Need a rabbit-savvy vet (limited in rural Maine). Free-roam or large pen. NOT a starter pet.' },
        { id: 'guinea-pair', name: 'Bonded guinea pig pair', icon: '🐹',
          fit: function(o) {
            var s = 1;
            if (o.experience !== 'lots') s += 1; // forgiving for new owners
            if (o.budget === 'low') s += 0;
            if (o.kids) s += 1; // generally kid-tolerant
            return s;
          },
          note: 'Need vitamin C daily, hay-heavy diet, weekly cage cleaning. Pair MUST be same sex or neutered.' },
        { id: 'reptile-beginner', name: 'Beginner reptile (leopard gecko, corn snake)', icon: '🦎',
          fit: function(o) {
            var s = 0;
            if (o.housing === 'apartment') s += 1; // small footprint
            if (o.allergies) s += 2; // no fur
            if (o.kids && o.kidAge < 5) s -= 3; // CDC says no
            if (o.experience === 'first') s -= 1; // husbandry steep learning curve
            return s;
          },
          note: 'Salmonella shedding (handwashing required). UVB / heat gradient critical. Long-lived (15–25 yr).' },
        { id: 'fish-tank', name: 'Freshwater aquarium', icon: '🐠',
          fit: function(o) {
            var s = 1;
            if (o.allergies) s += 2;
            if (o.budget === 'low') s -= 1; // setup cost real
            if (o.experience === 'first') s += 0;
            return s;
          },
          note: 'See AlloFlow Aquarium tile for ecosystem science. Tank-cycling takes 4–6 weeks BEFORE adding fish.' },
        { id: 'cockatiel', name: 'Cockatiel or budgie (small parrot)', icon: '🦜',
          fit: function(o) {
            var s = 0;
            if (o.hours <= 6) s += 1; // birds want company
            if (o.budget === 'low') s -= 1;
            if (o.allergies) s -= 1;
            if (o.experience !== 'first') s += 1;
            return s;
          },
          note: 'Need flight-time outside cage daily. Lifespan 15–25 yr. Toxic to Teflon + scented candles.' }
      ];
      var inputs = {
        housing: pickHousing,
        kids: pickKids,
        kidAge: pickKids ? 6 : 99,
        allergies: pickAllergies,
        hours: pickHoursHome,
        budget: pickBudget,
        experience: pickExperience
      };
      var scored = candidates.map(function(c) {
        return { id: c.id, name: c.name, icon: c.icon, score: c.fit(inputs), note: c.note };
      }).sort(function(a, b) { return b.score - a.score; });

      function radio(name, val, current, label, onChange) {
        var picked = current === val;
        return h('label', { htmlFor: 'pp-' + name + '-' + val,
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginRight: 6, marginBottom: 4, borderRadius: 999,
            background: picked ? T.accent : T.cardAlt, color: picked ? '#1f1612' : T.text,
            border: '1px solid ' + (picked ? T.accent : T.border), fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
          h('input', { id: 'pp-' + name + '-' + val, 'data-pets-focusable': true, type: 'radio',
            name: 'pp-' + name, checked: picked,
            onChange: function() { onChange(val); },
            style: { position: 'absolute', opacity: 0, pointerEvents: 'none' } }),
          label);
      }
      function checkbox(name, current, label, onChange) {
        return h('label', { htmlFor: 'pp-' + name,
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginRight: 6, marginBottom: 4, borderRadius: 999,
            background: current ? T.accent : T.cardAlt, color: current ? '#1f1612' : T.text,
            border: '1px solid ' + (current ? T.accent : T.border), fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
          h('input', { id: 'pp-' + name, 'data-pets-focusable': true, type: 'checkbox',
            checked: current, onChange: function(e) { onChange(e.target.checked); },
            style: { marginRight: 4, accentColor: T.accent } }),
          label);
      }
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🏠 Pet Picker'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Tell us about your situation; we\'ll suggest species/breed-class matches with honest tradeoffs. This is a science-based matchmaker, not a quiz that always finds you a "winner" — sometimes the right answer is "wait until your situation changes."')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🏘️ Housing'),
          h('div', { role: 'radiogroup', 'aria-label': 'Housing type' },
            radio('housing', 'apartment', pickHousing, 'Apartment / small', function(v) { upd('pickHousing', v); }),
            radio('housing', 'house', pickHousing, 'House with yard', function(v) { upd('pickHousing', v); }),
            radio('housing', 'rural', pickHousing, 'Rural / acreage', function(v) { upd('pickHousing', v); })),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } }, '👨‍👩‍👧 Family'),
          h('div', null,
            checkbox('kids', pickKids, 'Kids under 10 in household', function(v) { upd('pickKids', v); }),
            checkbox('allergies', pickAllergies, 'Allergies in household', function(v) { upd('pickAllergies', v); })),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } },
            '⏰ Hours pet would be alone per day: ',
            h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, pickHoursHome + ' hr')),
          h('input', { id: 'pp-hours', 'data-pets-focusable': true, type: 'range',
            min: 0, max: 14, step: 1, value: pickHoursHome,
            'aria-label': 'Hours alone per day',
            onChange: function(e) { upd('pickHoursHome', parseInt(e.target.value, 10)); },
            style: { width: '100%', accentColor: T.accent } }),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } }, '💵 Budget'),
          h('div', { role: 'radiogroup', 'aria-label': 'Budget' },
            radio('budget', 'low', pickBudget, 'Low (< $1K/yr)', function(v) { upd('pickBudget', v); }),
            radio('budget', 'medium', pickBudget, 'Medium ($1–3K/yr)', function(v) { upd('pickBudget', v); }),
            radio('budget', 'high', pickBudget, 'High ($3K+ /yr)', function(v) { upd('pickBudget', v); })),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginTop: 12, marginBottom: 6 } }, '🎓 Pet experience'),
          h('div', { role: 'radiogroup', 'aria-label': 'Experience level' },
            radio('exp', 'first', pickExperience, 'First-time owner', function(v) { upd('pickExperience', v); }),
            radio('exp', 'some', pickExperience, 'Some experience', function(v) { upd('pickExperience', v); }),
            radio('exp', 'lots', pickExperience, 'Experienced (multiple species)', function(v) { upd('pickExperience', v); }))),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🎯 Your matches'),
          scored.slice(0, 5).map(function(s, i) {
            var color = i === 0 ? T.accent : i < 3 ? T.accentHi : T.dim;
            var label = i === 0 ? 'TOP MATCH' : (s.score >= 2 ? 'good' : s.score >= 0 ? 'consider' : 'probably not');
            return h('div', { key: s.id, style: { padding: 10, borderRadius: 8, background: T.card, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 20 } }, s.icon),
                h('strong', { style: { color: color, fontSize: 14, flex: 1 } }, s.name),
                h('span', { style: { fontSize: 10, color: color, fontFamily: 'monospace', fontWeight: 700 } }, label + ' · ' + s.score)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, s.note));
          })),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, '🤔 Honest checks before any pet'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
            h('li', null, 'Will you (and your circumstances) still want this animal in 5, 10, 15+ years? Pets aren\'t for "right now" only.'),
            h('li', null, 'Have you priced an emergency vet visit ($1K–5K typical)? Do you have a fund or pet insurance for that?'),
            h('li', null, 'Who cares for them when you travel? Boarding + petsitter costs add up.'),
            h('li', null, 'Are you allowed pets where you live (and where you might live next)?'),
            h('li', null, 'Have you actually met the species? Many people get a breed they\'ve only seen on Instagram.'))),
        footer());
    }

    // ─────────────────────────────────────────
    // BODY LANGUAGE DECODER
    // ─────────────────────────────────────────
    function renderBodyLang() {
      var sets = [
        { species: '🐕 Dogs', items: [
          { signal: 'Loose body + soft eyes + open mouth + wagging mid-height tail', meaning: 'Relaxed + happy', color: T.ok },
          { signal: 'Stiff body + closed mouth + hard stare + slow high tail wag', meaning: 'WARNING — back off', color: T.warm },
          { signal: '"Whale eye" (whites of eyes showing as head turns away)', meaning: 'Stress / fear / discomfort — give space', color: T.warm },
          { signal: 'Lip licking / yawning / sniffing the ground in a tense moment', meaning: 'Calming signal — dog is trying to defuse', color: T.accentHi },
          { signal: 'Play bow (front low, butt up)', meaning: 'Invitation to play / "what comes next is fun"', color: T.ok },
          { signal: 'Tucked tail + low body + ears back', meaning: 'Fear / appeasement — do NOT push interaction', color: T.warm },
          { signal: 'Showing belly with relaxed body', meaning: 'Trust / play (not always "rub me!")', color: T.accentHi },
          { signal: 'Showing teeth + low growl + freeze', meaning: 'CLEAR warning — bite is the next step if pressure continues', color: T.danger }
        ]},
        { species: '🐈 Cats', items: [
          { signal: 'Slow blink toward you', meaning: '"Cat kiss" — affection / trust', color: T.ok },
          { signal: 'Tail held straight up (sometimes with curve at tip)', meaning: 'Friendly greeting', color: T.ok },
          { signal: 'Tail flicking back and forth', meaning: 'Annoyed / about to react — back off', color: T.warm },
          { signal: 'Pupils dilated wide in normal light', meaning: 'Aroused (could be play, fear, or aggression — read context)', color: T.warm },
          { signal: 'Ears flattened back / sideways', meaning: 'Fear or aggression', color: T.warm },
          { signal: 'Crouched + tail wrapped tight', meaning: 'Stressed / unwell', color: T.warm },
          { signal: 'Kneading paws + purring', meaning: 'Content (kitten-nursing leftover behavior)', color: T.ok },
          { signal: 'Loud meowing AT you specifically', meaning: 'Demand — for food, attention, or door opening', color: T.accentHi }
        ]},
        { species: '🐰 Rabbits', items: [
          { signal: '"Binky" (sudden midair leap + twist)', meaning: 'Pure joy', color: T.ok },
          { signal: 'Loud thump with hind feet', meaning: 'Alarm — perceived threat (rabbits HEAR something)', color: T.warm },
          { signal: 'Tooth purring (soft chattering)', meaning: 'Content', color: T.ok },
          { signal: 'Tooth grinding (loud grating)', meaning: 'PAIN — vet visit', color: T.danger },
          { signal: 'Flopping over on side', meaning: 'Trust / relaxation (NOT injured)', color: T.ok },
          { signal: 'Hunched + not eating + closed eyes', meaning: 'GI stasis or other illness — EMERGENCY', color: T.danger }
        ]},
        { species: '🦜 Birds', items: [
          { signal: 'Crest feathers raised + relaxed posture', meaning: 'Curious / engaged (in cockatiels)', color: T.ok },
          { signal: 'Eye-pinning (rapid pupil contraction)', meaning: 'Excitement OR aggression — read context', color: T.warm },
          { signal: 'Beak grinding', meaning: 'Content (often before sleep)', color: T.ok },
          { signal: 'Tail bobbing while breathing', meaning: 'Respiratory distress — vet now', color: T.danger },
          { signal: 'Feather plucking / overgrooming', meaning: 'Boredom / stress / medical — needs investigation', color: T.warm }
        ]}
      ];
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('👀 Body Language Decoder'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Most pet bites + stress incidents are predictable from body language minutes in advance. Learning to read these signals is the single highest-impact thing a pet-owning household can do.')),
        sets.map(function(g) {
          return h('div', { key: g.species, style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, g.species),
            g.items.map(function(it, i) {
              return h('div', { key: i, style: { padding: 8, borderRadius: 8, background: T.cardAlt, borderLeft: '3px solid ' + it.color, marginBottom: 6 } },
                h('div', { style: { fontSize: 12, color: T.text, fontWeight: 600, marginBottom: 2 } }, it.signal),
                h('div', { style: { fontSize: 12, color: it.color, lineHeight: 1.5 } }, '↳ ' + it.meaning));
            }));
        }),
        footer());
    }

    // ─────────────────────────────────────────
    // LIFETIME COST CALCULATOR
    // ─────────────────────────────────────────
    function renderCost() {
      var profiles = {
        'dog-large': { name: 'Large dog (Lab/GSD class)', icon: '🐕',
          firstYear: 3500, annual: 2200, emergencyFund: 3000, lifespan: 11, timeDaily: 2,
          notes: 'Includes spay/neuter, vaccines, training class, food, gear. Annual = food + vet + grooming + dental.' },
        'dog-small': { name: 'Small dog', icon: '🐕‍🦺',
          firstYear: 2500, annual: 1500, emergencyFund: 2500, lifespan: 14, timeDaily: 1.5,
          notes: 'Lower food cost; small-breed dental needs raise lifetime vet costs.' },
        'cat-indoor': { name: 'Cat (indoor)', icon: '🐈',
          firstYear: 1800, annual: 1100, emergencyFund: 2500, lifespan: 15, timeDaily: 0.75,
          notes: 'Litter + food + vet + enrichment. Pair of cats often costs less than 2× single (shared resources).' },
        'rabbit-pair': { name: 'Bonded rabbit pair', icon: '🐰',
          firstYear: 1200, annual: 900, emergencyFund: 2000, lifespan: 10, timeDaily: 1.5,
          notes: 'Hay + greens + pellets + exotic-vet visits. Spay/neuter mandatory + can be expensive.' },
        'guinea-pair': { name: 'Bonded GP pair', icon: '🐹',
          firstYear: 600, annual: 700, emergencyFund: 1000, lifespan: 6, timeDaily: 1,
          notes: 'Vitamin-C-stable pellets + daily fresh veg + cage cleaning.' },
        'reptile': { name: 'Beginner reptile (gecko)', icon: '🦎',
          firstYear: 800, annual: 250, emergencyFund: 800, lifespan: 18, timeDaily: 0.25,
          notes: 'Front-loaded setup cost (enclosure + UVB + heat). Low ongoing cost. Exotic vets rare.' },
        'parrot-medium': { name: 'Medium parrot (Conure)', icon: '🦜',
          firstYear: 2500, annual: 1200, emergencyFund: 2000, lifespan: 25, timeDaily: 2,
          notes: 'Cage + food + toys (replaced often) + avian vet. NEEDS daily out-of-cage time.' }
      };
      var p = profiles[costSpecies] || profiles['cat-indoor'];
      var lifetimeCost = p.firstYear + (p.annual * (costYears - 1));
      var lifetimeHours = p.timeDaily * 365 * costYears;
      var dollarsPerYear = lifetimeCost / costYears;

      function radioCost(val, label) {
        var picked = costSpecies === val;
        return h('label', { htmlFor: 'cs-' + val,
          style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', marginRight: 6, marginBottom: 4, borderRadius: 999,
            background: picked ? T.accent : T.cardAlt, color: picked ? '#1f1612' : T.text,
            border: '1px solid ' + (picked ? T.accent : T.border), fontSize: 12, fontWeight: 600, cursor: 'pointer' } },
          h('input', { id: 'cs-' + val, 'data-pets-focusable': true, type: 'radio',
            name: 'cost-species', checked: picked,
            onChange: function() { upd('costSpecies', val); },
            style: { position: 'absolute', opacity: 0, pointerEvents: 'none' } }),
          label);
      }
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('💵 Lifetime Cost & Commitment'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'These are illustrative US averages from AVMA + ASPCA + APPA surveys (2023–2024). Actual costs vary widely by region — Maine rural exotic-vet care can be limited or require driving to Boston. Use as ballpark, not exact estimate.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 8 } }, 'Pick a species'),
          h('div', { role: 'radiogroup', 'aria-label': 'Species' },
            radioCost('dog-large', '🐕 Large dog'),
            radioCost('dog-small', '🐕‍🦺 Small dog'),
            radioCost('cat-indoor', '🐈 Cat'),
            radioCost('rabbit-pair', '🐰 Rabbits'),
            radioCost('guinea-pair', '🐹 Guinea pigs'),
            radioCost('reptile', '🦎 Gecko'),
            radioCost('parrot-medium', '🦜 Conure'))),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4 } },
            'Years of commitment: ',
            h('span', { style: { color: T.accentHi, fontFamily: 'monospace' } }, costYears + ' years'),
            ' (typical lifespan ~', h('strong', null, p.lifespan), ' yr)'),
          h('input', { id: 'cs-years', 'data-pets-focusable': true, type: 'range',
            min: 1, max: 30, step: 1, value: costYears,
            'aria-label': 'Commitment years',
            onChange: function(e) { upd('costYears', parseInt(e.target.value, 10)); },
            style: { width: '100%', accentColor: T.accent } })),
        h('div', { style: { padding: 16, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, p.icon + ' ' + p.name + ' over ' + costYears + ' years'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 } },
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'First year'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.warm, fontFamily: 'monospace' } }, '$' + p.firstYear.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Annual ongoing'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } }, '$' + p.annual.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Emergency fund'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.danger, fontFamily: 'monospace' } }, '$' + p.emergencyFund.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Lifetime cost'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.accent, fontFamily: 'monospace' } }, '$' + lifetimeCost.toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, '$ per year'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'monospace' } }, '$' + Math.round(dollarsPerYear).toLocaleString())),
            h('div', null,
              h('div', { style: { fontSize: 11, color: T.dim } }, 'Total time'),
              h('div', { style: { fontSize: 22, fontWeight: 800, color: T.text, fontFamily: 'monospace' } }, Math.round(lifetimeHours).toLocaleString() + ' hr'))),
          h('p', { style: { margin: '12px 0 0', fontSize: 12, color: T.muted, lineHeight: 1.55, fontStyle: 'italic' } }, p.notes)),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border } },
          h('div', { style: { fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 6 } }, 'What\'s NOT in these numbers'),
          h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
            h('li', null, 'Damage to your stuff (chewed shoes, scratched furniture, accidents on rugs)'),
            h('li', null, 'Pet sitters / boarding when you travel'),
            h('li', null, 'Higher rent / pet-deposit costs'),
            h('li', null, 'Senior-pet costs (last 2–3 years often double the annual budget)'),
            h('li', null, 'Specialty vet care (cardiology, oncology, behaviorist)'))),
        footer());
    }

    // ─────────────────────────────────────────
    // GLOSSARY
    // ─────────────────────────────────────────
    function renderGlossary() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('📖 Glossary'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          'Ethology + animal-care terms used throughout this lab. Skim once to recognize them when they show up in source modules; come back when something\'s fuzzy.'),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 } },
          GLOSSARY.map(function(g, i) {
            return h('div', { key: i, role: 'listitem',
              style: { padding: 12, borderRadius: 10, background: T.card, border: '1px solid ' + T.border } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, g.term),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, g.def));
          })),
        footer());
    }

    // ─────────────────────────────────────────
    // MYTHS BUSTED
    // ─────────────────────────────────────────
    function renderMyths() {
      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🧐 Myths Busted'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          'Seven misconceptions that mislead pet owners. Every correction has a primary-source citation.'),
        MYTHS.map(function(m, i) {
          return h('div', { key: i, style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('div', { style: { fontSize: 13, fontWeight: 700, color: T.warm, marginBottom: 6 } },
              '❌ Myth: ', h('span', { style: { color: T.text } }, m.myth)),
            h('div', { style: { fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 6 } },
              h('strong', { style: { color: T.accentHi } }, '✓ What\'s actually true: '), m.truth),
            h('div', { style: { fontSize: 11, color: T.dim, fontStyle: 'italic' } }, 'Source: ', m.source));
        }),
        footer());
    }

    // ─────────────────────────────────────────
    // CAREER PATHWAYS
    // ─────────────────────────────────────────
    function renderCareers() {
      function tagPill(text) {
        return h('span', { key: text,
          style: { fontSize: 10, padding: '2px 8px', borderRadius: 999, background: T.bg, color: T.text, border: '1px solid ' + T.border, marginRight: 4, marginBottom: 4, display: 'inline-block' } }, text);
      }
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('🧰 Career Pathways'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Animal careers span every level of training: high-school cert programs, 2-year community college, apprenticeships, 4-year degrees, graduate research. Salaries from BLS OEWS 2024 medians where available; growth from BLS 2022–2032 outlook. Maine pipelines highlighted.')),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 } },
          CAREER_PATHS.map(function(c) {
            return h('div', { key: c.id, role: 'listitem',
              style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, c.icon),
                h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, c.title)),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', marginBottom: 8 } },
                c.tags.map(function(t) { return tagPill(t); })),
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                h('strong', { style: { color: T.accent } }, '💵 Salary: '), c.salary),
              h('div', { style: { fontSize: 11, color: T.dim, marginBottom: 4 } },
                h('strong', { style: { color: T.warm } }, '📈 Outlook: '), c.growth),
              h('div', { style: { fontSize: 11, color: T.muted, marginBottom: 4, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '🎓 How to get there: '), c.edu),
              h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55 } },
                h('strong', { style: { color: T.text } }, '📍 Where: '), c.where));
          })),
        crossLink('Pair with retrieval practice', h('span', null,
          'AlloFlow ', h('strong', { style: { color: T.text } }, 'AlloBot Sage'),
          ' uses retrieval-practice combat to drill terminology + facts from this tool — useful for kids who want career-skill reps before transcripts catch up.')),
        footer());
    }

    // ─────────────────────────────────────────
    // TAKE ACTION
    // ─────────────────────────────────────────
    function renderAction() {
      function actionList(title, items) {
        return h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, title),
          items.map(function(a) {
            return h('div', { key: a.id, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, a.icon),
                h('strong', { style: { color: T.text, fontSize: 13, flex: 1 } }, a.what)),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginBottom: 4 } },
                h('strong', { style: { color: T.text } }, 'How: '), a.how),
              h('div', { style: { fontSize: 12, color: T.accentHi, lineHeight: 1.55, marginBottom: a.url ? 4 : 0 } },
                h('strong', null, 'Why: '), a.impact),
              a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                'aria-label': a.what + ' — open resource (new tab)' }, '→ Open resource'));
          }));
      }
      return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
        backBar('🌱 Take Action'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Knowing how cats work doesn\'t change anything by itself. The animal-welfare picture in your community changes when people make small decisions in the same direction. Pick what fits your time + situation.')),
        actionList('🏠 At home', TAKE_ACTION.home),
        actionList('🏫 At school', TAKE_ACTION.school),
        actionList('🌲 In your community', TAKE_ACTION.community),
        actionList('🏛️ In civic life', TAKE_ACTION.civic),
        crossLink('Want depth on civic action?', h('span', null,
          'AlloFlow ', h('strong', { style: { color: T.text } }, 'Civic Action / Rights & Dissent'),
          ' goes deeper on writing effective public comments, planning a school-board ask, and what counts as protected speech.')),
        footer());
    }

    // ─────────────────────────────────────────
    // QUIZ — 15 questions across the lab
    // ─────────────────────────────────────────
    var QUIZ = [
      { id: 'q1', icon: '🐕',
        stem: 'Roughly how long ago do current genetic studies suggest dogs were domesticated from a now-extinct Pleistocene wolf population?',
        choices: ['~500 years', '~3,000 years', '~15,000–40,000 years', '~200,000 years'],
        correct: 2, why: 'Multiple genome studies (Frantz 2016, Botigué 2017) point to a single domestication event between 15,000 and 40,000 years ago, possibly in eastern Eurasia.' },
      { id: 'q2', icon: '🐈',
        stem: 'Why do cats need taurine in their diet but dogs don\'t?',
        choices: ['Taurine is a vitamin only cats need', 'Cats lost the metabolic ability to synthesize taurine; they\'re obligate carnivores', 'Cats absorb taurine through their paws', 'Cats convert taurine from sunlight'],
        correct: 1, why: 'Cats lost the synthesis pathway during their evolution as strict meat-eaters. Without dietary taurine, cats develop dilated cardiomyopathy + retinal degeneration. AAFCO commercial cat foods guarantee minimums.' },
      { id: 'q3', icon: '🐺',
        stem: 'What\'s the modern scientific status of "alpha wolf" / dominance theory for dog training?',
        choices: ['Confirmed by recent wolf studies', 'Discredited — wild wolf packs are families, not status hierarchies', 'Only applies to certain breeds', 'Still used by all major veterinary associations'],
        correct: 1, why: 'L. David Mech (whose work popularized "alpha") spent decades trying to retract it. Wild wolf packs are family units. AVSAB + AVMA position statements oppose dominance-based training.' },
      { id: 'q4', icon: '🐹',
        stem: 'You\'re considering housing two Syrian hamsters together to keep each other company. What does the science say?',
        choices: ['Great idea — hamsters are highly social', 'Only safe if same sex', 'Strictly solitary — two adult hamsters in one cage = serious fighting', 'Only safe with food puzzles'],
        correct: 2, why: 'Syrian (golden) hamsters are strictly solitary. Cohabiting adults typically results in fighting, often fatal. Pet stores often house them together as juveniles, then sell them with bad advice.' },
      { id: 'q5', icon: '🦜',
        stem: 'Why are pet birds so vulnerable to overheated nonstick (Teflon/PTFE) cookware?',
        choices: ['Birds are allergic to PTFE molecules', 'Bird respiratory anatomy uses one-way air sacs that exchange far more air per kg than mammal lungs', 'Bird feathers absorb PTFE fumes', 'Birds have no sense of smell'],
        correct: 1, why: 'Birds have 9 air sacs and one-way airflow through their lungs — vastly more efficient gas exchange than mammals. Same physiology that makes them sensitive coal-mine canaries makes them die in minutes from PTFE fumes.' },
      { id: 'q6', icon: '🦎',
        stem: 'A reptile owner has a leopard gecko that won\'t eat. Most likely first thing to check?',
        choices: ['Whether they\'re lonely', 'Husbandry — temperature gradient + UVB lighting + substrate', 'Whether they want a friend', 'Whether they need a bath'],
        correct: 1, why: 'Most pet-reptile illness is husbandry-driven. Wrong temperature → can\'t digest. Old or missing UVB → metabolic bone disease. Substrate-impaction risks. Always check husbandry before assuming disease.' },
      { id: 'q7', icon: '♿',
        stem: 'Under federal law (ADA), what\'s the SCIENTIFIC distinction between a service dog and an emotional support animal?',
        choices: ['Size of the animal', 'Service dog is task-trained for a disability; ESA provides comfort by presence (no task training)', 'ESA wears a vest; service dog doesn\'t', 'Service dogs are larger breeds'],
        correct: 1, why: 'A service dog is INDIVIDUALLY TRAINED to perform tasks for a person with a disability (mobility brace, medical alert, deep pressure, retrieval, etc.). An ESA provides comfort through presence — no specific tasks. ESAs are not service animals under the ADA.' },
      { id: 'q8', icon: '🥩',
        stem: 'Which of these foods is most universally toxic to dogs, cats, AND ferrets?',
        choices: ['Carrots', 'Bananas', 'Chocolate', 'Plain cooked chicken'],
        correct: 2, why: 'Theobromine + caffeine in chocolate are toxic across many mammals because they metabolize them slowly. Dogs are most affected; cats + ferrets vulnerable too. Dark chocolate is far worse than milk.' },
      { id: 'q9', icon: '🤰',
        stem: 'A pregnant person has an indoor cat. What does the science say about toxoplasmosis risk?',
        choices: ['Rehome the cat immediately', 'Indoor cats fed only commercial food are very low risk; pregnant person should avoid scooping (or wear gloves + scoop daily, since oocysts take 24+ hr to become infective)', 'Cat must be tested daily', 'No risk at all'],
        correct: 1, why: 'Toxoplasmosis is a real concern, but the risk from an indoor commercial-food-fed cat is low. CDC + ACOG guidance: someone else handles the litter, OR daily cleaning with gloves. Higher risks: undercooked meat, unwashed produce.' },
      { id: 'q10', icon: '🧬',
        stem: 'A "purebred" dog from a 200-year-old closed studbook is more likely to have which of the following compared to mixed-breed dogs?',
        choices: ['Stronger immune system', 'Concentrated genetic disorders (hip dysplasia, brachycephaly, etc.)', 'Longer lifespan automatically', 'Better behavior automatically'],
        correct: 1, why: 'Closed studbooks limit the gene pool. Selecting for extreme features (flat faces, certain proportions) concentrates problems. Reputable breeders screen for known conditions (OFA hips, cardiac, eyes), but the structural risks of pedigree breeding are real.' },
      { id: 'q11', icon: '🐈',
        stem: 'A friend says "outdoor cats are happier than indoor cats." What\'s the actual data?',
        choices: ['Outdoor cats live ~3–4× LONGER', 'Indoor cats live ~3–4× longer (12–18 yr vs 2–5 yr); enrichment solves boredom', 'Lifespan is the same', 'Outdoor cats only kill rats'],
        correct: 1, why: 'Outdoor cats face traffic, predators, disease, and weather. Indoor cats average 12–18 years; outdoor 2–5. Outdoor cats also kill an estimated 2.4 BILLION birds per year in the US alone (Loss 2013). Indoor cats + environmental enrichment is the welfare-positive answer.' },
      { id: 'q12', icon: '🐰',
        stem: 'Your friend says "rabbits are easy starter pets for kids." Which is the MOST accurate response?',
        choices: ['Yes, hardy + easy', 'Rabbits are arguably the WORST starter pet — prey-animal stress, fragile GI, 8–12 yr lifespan, exotic-vet costs, dislike being held', 'Only large rabbits are hard', 'Only baby rabbits are hard'],
        correct: 1, why: 'House Rabbit Society advises against rabbits in homes with young children. Rabbits hide illness (prey instinct), need exotic vets (limited in rural Maine), and most don\'t enjoy handling.' },
      { id: 'q13', icon: '🐾',
        stem: 'During a tense interaction between two dogs, one yawns + licks her lips repeatedly. What\'s she communicating?',
        choices: ['She\'s hungry', 'She\'s sleepy', 'A "calming signal" — trying to defuse the social tension', 'She\'s about to bite'],
        correct: 2, why: 'Lip licking, yawning, head turning, and ground sniffing in a tense moment are appeasement / calming signals. Dogs use them to defuse. Recognizing them helps owners intervene before stacked stress becomes a bite.' },
      { id: 'q14', icon: '🦠',
        stem: 'Why does the CDC recommend NO reptiles in households with children under 5?',
        choices: ['Reptiles bite easily', 'Reptiles universally shed Salmonella', 'Reptiles need expensive vets', 'Children are allergic to scales'],
        correct: 1, why: 'Salmonella shedding is universal in reptiles + amphibians (no matter how clean they look). Young children don\'t reliably wash hands and have higher infection-severity risk. Same logic for immunocompromised + pregnant people.' },
      { id: 'q15', icon: '🌲',
        stem: 'Why do Maine vets push year-round tick prevention even in winter?',
        choices: ['Tradition', 'Adult deer ticks (Ixodes scapularis) are active any day above ~40°F — Maine has many such days even in January / February', 'Vets need year-round revenue', 'Lyme bacteria mutate in cold'],
        correct: 1, why: 'Adult Ixodes ticks emerge whenever temperatures briefly rise above ~40°F. Maine has plenty of warm days mid-winter. Year-round prevention has become standard for Maine dogs given Lyme + anaplasmosis density.' }
    ];
    function renderQuiz() {
      var qIdx = quizState.idx || 0;
      var done = qIdx >= QUIZ.length;
      if (done) {
        var score = quizState.score || 0;
        var pct = Math.round((score / QUIZ.length) * 100);
        var label = pct >= 90 ? 'Pet Science Pro' : pct >= 70 ? 'Pet Science Apprentice' : pct >= 50 ? 'Keep going' : 'Back to the source modules';
        if (pct >= 70) awardBadge('pets_quiz_pass', 'Pets Quiz Passed');
        if (pct >= 90) awardBadge('pets_quiz_ace', 'Pets Quiz Ace');
        return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
          backBar('📝 Quiz — Results'),
          h('div', { style: { padding: 24, borderRadius: 14, background: T.card, border: '2px solid ' + T.accent, textAlign: 'center', marginBottom: 14 } },
            h('div', { style: { fontSize: 42, fontWeight: 800, color: T.accentHi, fontFamily: 'monospace' } }, score + ' / ' + QUIZ.length),
            h('div', { style: { fontSize: 18, color: T.text, marginTop: 6 } }, pct + '%'),
            h('div', { style: { fontSize: 14, color: T.accentHi, fontWeight: 700, marginTop: 8 } }, label)),
          h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            h('button', { 'data-pets-focusable': true,
              onClick: function() { upd('quizState', { idx: 0, score: 0, answered: false, lastChoice: null }); petsAnnounce('Quiz reset'); },
              style: btn() }, '🔄 Try again'),
            h('button', { 'data-pets-focusable': true,
              onClick: function() { upd('view', 'menu'); }, style: btnPrimary() }, '← Back to menu')),
          footer());
      }
      var q = QUIZ[qIdx];
      return h('div', { style: { padding: 20, maxWidth: 720, margin: '0 auto', color: T.text } },
        backBar('📝 Quiz'),
        h('div', { style: { fontSize: 12, color: T.dim, marginBottom: 8 } },
          'Question ', h('strong', { style: { color: T.text } }, (qIdx + 1) + ' of ' + QUIZ.length),
          '  ·  Score: ', h('strong', { style: { color: T.accentHi } }, (quizState.score || 0))),
        h('div', { style: { padding: 16, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
            h('span', { 'aria-hidden': 'true', style: { fontSize: 26 } }, q.icon),
            h('div', { style: { fontSize: 14, color: T.text, lineHeight: 1.55, fontWeight: 600 } }, q.stem)),
          q.choices.map(function(c, i) {
            var picked = quizState.lastChoice === i;
            var correct = q.correct === i;
            var bg = T.cardAlt, bd = T.border;
            if (quizState.answered) {
              if (correct) { bg = '#1a3320'; bd = T.ok; }
              else if (picked) { bg = '#3a1a1a'; bd = T.danger; }
            } else if (picked) { bg = T.cardAlt; bd = T.accentHi; }
            return h('button', { key: i, 'data-pets-focusable': true,
              disabled: quizState.answered,
              'aria-label': 'Choice ' + (i + 1) + ': ' + c + (quizState.answered && correct ? ' (correct)' : '') + (quizState.answered && picked && !correct ? ' (your answer, incorrect)' : ''),
              onClick: function() {
                if (quizState.answered) return;
                var isCorrect = i === q.correct;
                upd('quizState', { idx: qIdx, score: (quizState.score || 0) + (isCorrect ? 1 : 0), answered: true, lastChoice: i });
                petsAnnounce(isCorrect ? 'Correct!' : 'Not quite. ' + q.why);
              },
              style: { display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px', marginBottom: 6, borderRadius: 8, background: bg, border: '2px solid ' + bd, color: T.text, fontSize: 13, cursor: quizState.answered ? 'default' : 'pointer' } }, c);
          }),
          quizState.answered && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px dashed ' + T.accent } },
            h('div', { style: { fontSize: 12, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, 'Why:'),
            h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, q.why))),
        quizState.answered && h('button', { 'data-pets-focusable': true,
          onClick: function() { upd('quizState', { idx: qIdx + 1, score: quizState.score || 0, answered: false, lastChoice: null }); },
          style: btnPrimary({ width: '100%' }) }, qIdx + 1 >= QUIZ.length ? '🏁 See results' : 'Next question →'),
        footer());
    }

    // ─────────────────────────────────────────
    // RESOURCES
    // ─────────────────────────────────────────
    function renderResources() {
      var groups = [
        { title: '🩺 Veterinary medicine + welfare standards', items: [
          { name: 'AVMA — American Veterinary Medical Association', url: 'https://www.avma.org', desc: 'US veterinary professional body. Position statements, pet-care guidance.' },
          { name: 'AAFP — American Assoc. of Feline Practitioners', url: 'https://catvets.com', desc: 'Cat-specific clinical + welfare guidelines.' },
          { name: 'AAHA — Animal Hospital Assoc.', url: 'https://www.aaha.org', desc: 'Accredits ~12% of US vet hospitals; publishes pet-owner guidelines.' },
          { name: 'AAFCO — feed-control officials', url: 'https://www.aafco.org', desc: 'Pet-food nutrient profile standards.' }
        ]},
        { title: '🧠 Behavior + training', items: [
          { name: 'ASAB — Animal Behavior Society', url: 'https://www.animalbehaviorsociety.org', desc: 'Certifies CAAB/ACAAB animal behaviorists.' },
          { name: 'IAABC — International Assoc. of Animal Behavior Consultants', url: 'https://iaabc.org', desc: 'Behavior consultant certification.' },
          { name: 'CCPDT — Certification Council for Professional Dog Trainers', url: 'https://www.ccpdt.org', desc: 'CPDT-KA / CPDT-KSA dog-trainer certifications.' },
          { name: 'AVSAB — Veterinary Behavior position statements', url: 'https://avsab.org', desc: 'Position papers on dominance, punishment, choice in training.' },
          { name: 'Karen Pryor Academy', url: 'https://karenpryoracademy.com', desc: 'Clicker-training methodology + KPA-CTP credential.' }
        ]},
        { title: '♿ Service / ESA / therapy animals', items: [
          { name: 'IAADP — Intl. Assoc. of Assistance Dog Partners', url: 'https://iaadp.org', desc: 'Service-dog partners advocacy + standards.' },
          { name: 'ADI — Assistance Dogs International', url: 'https://assistancedogsinternational.org', desc: 'Accredits service-dog training programs.' },
          { name: 'Pet Partners — therapy animal teams', url: 'https://petpartners.org', desc: 'Largest US therapy-animal credentialing body.' },
          { name: 'ADA Service Animal FAQ (US DOJ)', url: 'https://www.ada.gov/topics/service-animals/', desc: 'Authoritative federal guidance on service-animal access.' }
        ]},
        { title: '🦠 Public health + zoonoses', items: [
          { name: 'CDC One Health', url: 'https://www.cdc.gov/onehealth', desc: 'Federal zoonoses + animal-human-environment health.' },
          { name: 'Maine CDC Vector-Borne Disease', url: 'https://www.maine.gov/dhhs/mecdc/infectious-disease/epi/vector-borne/', desc: 'Maine-specific Lyme + anaplasmosis surveillance.' },
          { name: 'ASPCA Animal Poison Control: (888) 426-4435', url: 'https://www.aspca.org/pet-care/animal-poison-control', desc: '$95 24/7 consult for suspected ingestions.' }
        ]},
        { title: '🐰 Species-specific welfare', items: [
          { name: 'House Rabbit Society', url: 'https://rabbit.org', desc: 'Definitive rabbit-welfare resource.' },
          { name: 'AAV — Assoc. of Avian Veterinarians', url: 'https://www.aav.org', desc: 'Pet-bird medicine + welfare.' },
          { name: 'ARAV — Reptile + Amphibian Vets', url: 'https://arav.org', desc: 'Reptile + amphibian medicine.' },
          { name: 'IFTA — Intl. Ferret Trainers Assoc.', url: 'https://www.ferret.org', desc: 'Ferret-specific welfare + behavior.' }
        ]},
        { title: '🌲 Maine animal welfare', items: [
          { name: 'Animal Refuge League of Greater Portland', url: 'https://arlgp.org', desc: 'Largest Maine open-admission shelter.' },
          { name: 'Bangor Humane Society', url: 'https://bangorhumane.org', desc: 'Eastern Maine shelter + wellness clinic.' },
          { name: 'Avian Haven (wild bird rescue)', url: 'https://www.avianhaven.org', desc: 'Wild-bird rehab center, Freedom ME.' },
          { name: 'Maine Veterinary Medical Assoc.', url: 'https://mvma.org', desc: 'State vet professional body.' },
          { name: 'Maine IFW Wildlife', url: 'https://www.maine.gov/ifw/', desc: 'Wildlife rehab permits + native species rules.' }
        ]}
      ];
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('📚 Resources'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
          'Every organization cited in this tool. Bookmark a few — these are the primary sources reputable pet-owner advice traces back to.'),
        groups.map(function(g, gi) {
          return h('div', { key: gi, style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.text } }, g.title),
            g.items.map(function(r, i) {
              return h('div', { key: i, style: { padding: '8px 0', borderBottom: i < g.items.length - 1 ? '1px solid ' + T.border : 'none' } },
                h('a', { href: r.url, target: '_blank', rel: 'noopener',
                  style: { color: T.accentHi, fontWeight: 700, fontSize: 13, textDecoration: 'underline' },
                  'aria-label': r.name + ' (opens in new tab)' }, r.name),
                h('div', { style: { fontSize: 11, color: T.muted, marginTop: 3, lineHeight: 1.5 } }, r.desc));
            }));
        }),
        footer());
    }

    // ─────────────────────────────────────────
    // TEACHER GUIDE
    // ─────────────────────────────────────────
    function renderTeacher() {
      var ngss = [
        { mod: 'Dogs / Cats / Small mammals / Birds / Reptiles', std: 'MS-LS1-4 (structure + function), HS-LS1 (structure + function in living systems)' },
        { mod: 'Domestication & Breeding', std: 'MS-LS3 (heredity), HS-LS3 (heredity), HS-LS4 (selection — both natural + artificial)' },
        { mod: 'Pet Training (applied)', std: 'MS-LS1-8 (sensory processing → memory → response), HS-LS1-3 (homeostasis + feedback)' },
        { mod: 'Nutrition Science', std: 'MS-LS1-7 (matter + energy in organisms), HS-LS1-6 (carbon-based molecules)' },
        { mod: 'Zoonoses', std: 'MS-LS2 (interdependent relationships), HS-LS2-7 (human impact)' },
        { mod: 'Service Animals', std: 'Cross-cutting: science + society + ethics + disability studies' }
      ];
      var prompts = [
        { topic: 'Dogs', items: [
          'If wolf packs are families and not status hierarchies, what does that change about how you\'d train a dog?',
          'Why do small dogs live longer than large dogs when across mammals it\'s usually the opposite?',
          'Belyaev\'s fox experiment showed tameness selection drags physical traits along. What does that tell us about why our dogs look the way they do?'
        ]},
        { topic: 'Cats', items: [
          'Cats can\'t make taurine. What does that tell you about whether a vegan diet is ethical for cats?',
          'Adult-cat meowing only happens at humans. What does that suggest about the evolution of domestication?',
          'Indoor cats live ~3× longer than outdoor cats AND outdoor cats kill billions of birds. What\'s the welfare-positive recommendation, and why is it controversial?'
        ]},
        { topic: 'Service Animals', items: [
          'Why is the legal distinction between service dog, ESA, and therapy animal scientifically meaningful — not just legal hairsplitting?',
          'How would you respond if a stranger reaches to pet a working service dog?',
          'Online "ESA letters" are a $200-million industry. What\'s the harm if they\'re fake?'
        ]},
        { topic: 'Pet Picker', items: [
          'Run the Pet Picker for your actual situation. What surprised you?',
          'Run it for "first apartment after college" vs "house with three young kids." How does the right pet shift?',
          'When is the honest answer "no pet right now"? What changes that?'
        ]},
        { topic: 'Maine angles', items: [
          'Why do Maine vets push year-round tick prevention even in winter?',
          'Why is the Maine Coon breed adapted the way it is?',
          'Where would you take an injured wild bird in Maine?'
        ]}
      ];
      var activities = [
        { name: 'Clicker training a stuffed animal', grade: 'K-5',
          what: 'Use a clicker + treats to "train" a stuffed dog: click when it\'s in the right pose, "treat" with a chip. Teaches the timing + mechanics of operant conditioning before live animals.', url: null },
        { name: 'Body-language flash cards', grade: '3-12',
          what: 'Print or draw 12 dog/cat body postures. Students sort into "happy / stressed / warning / neutral." Discuss what cue made them decide.', url: null },
        { name: 'Breed-trait heritability puzzle', grade: '6-12',
          what: 'Punnett-square exercise crossing two coat-color carriers. Apply to actual breed examples (Labrador yellow vs chocolate vs black).', url: null },
        { name: 'Pet-budget design', grade: '6-12',
          what: 'Use the Lifetime Cost Calc tile + a real Maine vet price list. Students design a complete first-year + emergency fund. Compare to a phone or sneaker budget.', url: null },
        { name: 'Zoonoses hand-washing experiment', grade: '3-8',
          what: 'Glo-Germ powder + black light. Show how poor handwashing leaves pet-handling residue everywhere.', url: 'https://www.cdc.gov/handwashing/' },
        { name: 'Shelter visit / read-to-shelter-cats', grade: 'K-12',
          what: 'Coordinate with Animal Refuge League of Greater Portland or your local Maine humane society. Most have K-12 ed programs.', url: 'https://arlgp.org/community/education/' }
      ];
      var pacing = [
        { label: '1-week unit', body: 'Day 1: Menu + Pet Picker. Day 2: pick 2 species deep-dives (jigsaw groups). Day 3: Pet Training (applied) + Body Language. Day 4: Zoonoses + Nutrition. Day 5: 15-Q quiz.' },
        { label: '2-week unit', body: 'Week 1 same as 1-week, slower. Week 2 adds Domestication & Breeding, Service Animals, Lifetime Cost, Take Action, Career Pathways.' },
        { label: 'Sub day', body: 'Body Language Decoder + Myths Busted + Quiz. Three modules students run independently. Print Pet Picker as a worksheet.' }
      ];
      return h('div', { style: { padding: 20, maxWidth: 1000, margin: '0 auto', color: T.text } },
        backBar('🎓 Teacher Guide'),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.6 } },
            'Resource page for educators. NGSS alignment per module, discussion prompts, hands-on activities, pacing options.')),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14, overflowX: 'auto' } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.text } }, '📐 NGSS alignment'),
          h('table', { 'aria-label': 'NGSS standards alignment',
            style: { width: '100%', minWidth: 540, borderCollapse: 'collapse', fontSize: 12 } },
            h('thead', null,
              h('tr', { style: { background: T.cardAlt } },
                h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi } }, 'Module'),
                h('th', { scope: 'col', style: { padding: '8px 10px', textAlign: 'left', color: T.accentHi } }, 'Standards'))),
            h('tbody', null,
              ngss.map(function(r, i) {
                return h('tr', { key: i, style: { background: i % 2 === 0 ? T.cardAlt : T.card, borderBottom: '1px solid ' + T.border } },
                  h('td', { style: { padding: '8px 10px', color: T.text, fontWeight: 600 } }, r.mod),
                  h('td', { style: { padding: '8px 10px', color: T.muted, fontFamily: 'monospace', fontSize: 11 } }, r.std));
              })))),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '💬 Discussion prompts'),
          prompts.map(function(p) {
            return h('div', { key: p.topic, style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: T.accentHi, marginBottom: 4 } }, p.topic),
              h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, color: T.muted, lineHeight: 1.65 } },
                p.items.map(function(q, i) { return h('li', { key: i, style: { marginBottom: 4 } }, q); })));
          })),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🛠️ Hands-on activities'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 } },
            activities.map(function(a, i) {
              return h('div', { key: i, role: 'listitem',
                style: { padding: 10, borderRadius: 8, background: T.cardAlt, border: '1px solid ' + T.border } },
                h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 } },
                  h('strong', { style: { color: T.accentHi, fontSize: 13 } }, a.name),
                  h('span', { style: { fontSize: 10, color: T.dim, padding: '2px 6px', borderRadius: 4, background: T.bg, border: '1px solid ' + T.border } }, 'Gr ' + a.grade)),
                h('div', { style: { fontSize: 11, color: T.muted, lineHeight: 1.55, marginBottom: 4 } }, a.what),
                a.url && h('a', { href: a.url, target: '_blank', rel: 'noopener',
                  style: { color: T.link, fontSize: 11, textDecoration: 'underline' },
                  'aria-label': a.name + ' resource link (opens in new tab)' }, '→ Open resource'));
            }))),
        h('div', { style: { padding: 14, borderRadius: 12, background: T.cardAlt, border: '1px solid ' + T.accent } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 15, color: T.text } }, '🗓️ Pacing options'),
          pacing.map(function(p, i) {
            return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: T.bg, border: '1px solid ' + T.border, marginBottom: 8 } },
              h('strong', { style: { color: T.accentHi, fontSize: 13 } }, p.label),
              h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55, marginTop: 4 } }, p.body));
          })),
        footer());
    }

    // ─────────────────────────────────────────
    // FAMOUS ANIMALS IN SCIENCE
    // ─────────────────────────────────────────
    function renderFamous() {
      var visible = famousFilter === 'all'
        ? FAMOUS_ANIMALS
        : FAMOUS_ANIMALS.filter(function(a) { return a.tag === famousFilter; });
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('🌟 Famous Animals in Science'),
        h('p', { style: { margin: '0 0 12px', color: T.muted, fontSize: 13, lineHeight: 1.6 } },
          '10 animals you\'ll encounter in textbooks, museums, and culture. Each shaped how we understand animal cognition, training, service work, or human-animal bonds.'),
        h('div', { role: 'group', 'aria-label': 'Filter famous animals by category',
          style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
          FAMOUS_FILTERS.map(function(f) {
            var active = famousFilter === f.id;
            return h('button', { key: f.id, 'data-pets-focusable': true,
              'aria-pressed': active ? 'true' : 'false',
              onClick: function() { upd('famousFilter', f.id); petsAnnounce('Filtered to ' + f.label); },
              style: btn({
                background: active ? T.accent : T.card,
                color: active ? '#1f1612' : T.text,
                border: '1px solid ' + (active ? T.accent : T.border),
                padding: '6px 12px', fontSize: 12
              })
            }, f.label);
          })),
        h('div', { role: 'list',
          style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 } },
          visible.length === 0
            ? [h('div', { key: 'empty', style: { padding: 24, color: T.dim, fontStyle: 'italic', textAlign: 'center', gridColumn: '1 / -1' } }, 'No animals in this filter.')]
            : visible.map(function(a) {
                return h('div', { key: a.id, role: 'listitem',
                  style: { padding: 14, borderRadius: 12, background: T.card, border: '1px solid ' + T.border } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { 'aria-hidden': 'true', style: { fontSize: 22 } }, a.icon),
                    h('h3', { style: { margin: 0, fontSize: 14, color: T.accentHi } }, a.name)),
                  h('div', { style: { fontSize: 11, color: T.warm, fontFamily: 'monospace', marginBottom: 8 } }, a.where),
                  h('div', { style: { fontSize: 12, color: T.muted, lineHeight: 1.55 } }, a.story));
              })),
        h('div', { style: { marginTop: 14, fontSize: 11, color: T.dim, textAlign: 'center' } },
          'Showing ' + visible.length + ' of ' + FAMOUS_ANIMALS.length + ' animals.'),
        footer());
    }

    // ─────────────────────────────────────────
    // AI PRACTICE — design scenarios + Gemini critique with local fallback
    // ─────────────────────────────────────────
    function renderAiPractice() {
      var callGemini = ctx.callGemini || null;
      var scenario = AI_SCENARIOS.filter(function(s) { return s.id === aiScenarioId; })[0] || null;

      function selectScenario(id) {
        updMulti({ aiScenarioId: id, aiResponse: '', aiCritique: null });
        petsAnnounce('Scenario loaded.');
      }

      function getCritique() {
        if (!scenario || !aiResponse.trim()) return;
        if (!callGemini) {
          var resp = aiResponse.toLowerCase();
          var checks = scenario.rubric.map(function(r) {
            var lc = r.toLowerCase();
            var keywords = lc.match(/[a-z][a-z\-]{3,}/g) || [];
            var hits = 0;
            keywords.forEach(function(k) { if (resp.indexOf(k) !== -1) hits++; });
            return { ok: hits >= 2, msg: r };
          });
          var summary = 'Local rubric check (no AI available):\n\n' + checks.map(function(c) {
            return (c.ok ? '✓ ' : '○ ') + c.msg;
          }).join('\n') + '\n\nThe checks above flag whether your response touched on each rubric criterion. They are crude — a real AI critique would do much better.';
          upd('aiCritique', { text: summary, source: 'local' });
          petsAnnounce('Local check ready.');
          return;
        }
        upd('aiLoadingCritique', true);
        petsAnnounce('Getting critique...');
        var prompt = 'You are a veterinary + animal-welfare educator reviewing a student\'s response to a real-world pet-care scenario.\n\n' +
          'SCENARIO:\n' + scenario.prompt + '\n\n' +
          'STUDENT RESPONSE:\n' + aiResponse + '\n\n' +
          'RUBRIC (criteria a sound response hits):\n' + scenario.rubric.map(function(r, i) { return (i + 1) + '. ' + r; }).join('\n') + '\n\n' +
          'GROUND-TRUTH FACTS (do not deviate; if student response conflicts, flag):\n' +
          AI_GROUND_TRUTH.map(function(p, i) { return (i + 1) + '. ' + p; }).join('\n') + '\n\n' +
          'CRITIQUE specifically:\n' +
          '1. Which rubric items did they hit? (cite numbers)\n' +
          '2. Which did they miss?\n' +
          '3. Any factual errors against the ground-truth list?\n' +
          '4. One concrete suggestion to strengthen the response.\n\n' +
          'Tone: warm, specific, like a school counselor + vet hybrid. 5–7 sentences. ' +
          'IMPORTANT: never recommend specific medications, dosages, or veterinary procedures — refer to a veterinarian. ' +
          'End with: "Educational only — for medical decisions see your veterinarian."';
        callGemini(prompt, { maxOutputTokens: 500 })
          .then(function(text) {
            var clean = String(text || '').trim();
            if (!clean) throw new Error('Empty response');
            updMulti({ aiCritique: { text: clean, source: 'ai' }, aiLoadingCritique: false });
            awardBadge('pets_ai_designer', 'AI Practice (got a response critiqued)');
            petsAnnounce('Critique ready.');
          })
          .catch(function(e) {
            console.warn('[Pets] AI critique failed; falling back.', e);
            upd('aiLoadingCritique', false);
            addToast('AI unavailable — try the local check.');
          });
      }

      return h('div', { style: { padding: 20, maxWidth: 880, margin: '0 auto', color: T.text } },
        backBar('🤖 AI Practice'),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('p', { style: { margin: 0, color: T.muted, fontSize: 13, lineHeight: 1.55 } },
            'Pick a scenario. Write 4–8 sentences walking a friend (or yourself) through what you\'d actually do. ',
            h('strong', { style: { color: T.accentHi } }, 'AI critiques your reasoning'),
            ' against a welfare-science rubric and the same ground-truth facts taught throughout this lab.')),
        h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 10px', fontSize: 14, color: T.text } }, '📋 Pick a scenario'),
          h('div', { role: 'list',
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 } },
            AI_SCENARIOS.map(function(s) {
              var picked = aiScenarioId === s.id;
              return h('button', { key: s.id, role: 'listitem',
                'data-pets-focusable': true,
                'aria-label': s.title + (picked ? ' (selected)' : ''),
                'aria-pressed': picked ? 'true' : 'false',
                onClick: function() { selectScenario(s.id); },
                style: btn({
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                  padding: 10, minHeight: 60,
                  background: picked ? T.cardAlt : T.card,
                  borderColor: picked ? T.accent : T.border
                })
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                  h('span', { 'aria-hidden': 'true', style: { fontSize: 18 } }, s.icon),
                  h('span', { style: { fontWeight: 700, fontSize: 13 } }, s.title)));
            }))),
        scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.cardAlt, border: '1px solid ' + T.accent, marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 14, color: T.accentHi } }, scenario.icon + ' ' + scenario.title),
          h('p', { style: { margin: '0 0 8px', color: T.text, fontSize: 13, lineHeight: 1.6 } }, scenario.prompt),
          h('div', { style: { padding: 8, borderRadius: 6, background: T.bg, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.5 } },
            h('strong', { style: { color: T.warm } }, '💡 Hint: '), scenario.hint)),
        scenario && h('div', { style: { padding: 14, borderRadius: 10, background: T.card, border: '1px solid ' + T.border, marginBottom: 14 } },
          h('label', { htmlFor: 'pets-ai-response', style: { display: 'block', fontWeight: 700, fontSize: 14, color: T.text, marginBottom: 6 } },
            '✏️ Your response (4–8 sentences)'),
          h('textarea', { id: 'pets-ai-response', 'data-pets-focusable': true,
            value: aiResponse,
            onChange: function(e) { upd('aiResponse', e.target.value); },
            placeholder: 'Walk through what you\'d do or say. What do you ask first? What do you recommend? What would change your recommendation?',
            'aria-label': 'Your response',
            rows: 6,
            style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid ' + T.border, background: T.bg, color: T.text, fontSize: 13, lineHeight: 1.55, fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' } }),
          h('div', { style: { marginTop: 6, fontSize: 11, color: T.dim, marginBottom: 10 } },
            aiResponse.length, ' characters. Aim for ~300–800.'),
          h('button', { 'data-pets-focusable': true,
            'aria-label': aiLoadingCritique ? 'Getting critique' : 'Get critique of your response',
            'aria-busy': aiLoadingCritique ? 'true' : 'false',
            disabled: aiLoadingCritique || !aiResponse.trim(),
            onClick: getCritique,
            style: btnPrimary({ opacity: (aiLoadingCritique || !aiResponse.trim()) ? 0.6 : 1 })
          }, aiLoadingCritique ? '⏳ Critiquing...' : (callGemini ? '🎓 Get AI critique' : '📋 Local rubric check'))),
        aiCritique && h('div', { style: { padding: 14, borderRadius: 10, background: '#3a2a1a', border: '1px solid ' + T.accent, color: '#fef3e2', marginBottom: 14 } },
          h('h3', { style: { margin: '0 0 8px', fontSize: 15, color: T.accentHi } }, '🎓 Critique'),
          h('div', { style: { whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.6 } }, aiCritique.text),
          h('div', { style: { marginTop: 10, fontSize: 10, opacity: 0.75, fontStyle: 'italic' } },
            aiCritique.source === 'ai' ? 'Critique from AI; constrained against this lab\'s ground-truth.' : 'Local rubric check (AI unavailable).')),
        footer());
    }

    // ─────────────────────────────────────────
    // DIAGRAMS — labeled SVG schematics
    // ─────────────────────────────────────────
    var DIAGRAM_TABS = [
      { id: 'skull', icon: '💀', label: 'Dog vs cat skull' },
      { id: 'airsac', icon: '🦜', label: 'Bird respiratory air sacs' },
      { id: 'operant', icon: '🔁', label: 'Operant conditioning loop' },
      { id: 'bodylang', icon: '🐕', label: 'Dog body language ethogram' }
    ];

    function svgSkullCompare() {
      return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
        role: 'img', 'aria-labelledby': 'svg-skull-title svg-skull-desc',
        style: { background: '#181210', borderRadius: 8 } },
        h('title', { id: 'svg-skull-title' }, 'Dog and cat skull comparison'),
        h('desc', { id: 'svg-skull-desc' }, 'Side-by-side comparison of dog and cat skull anatomy. Dog skull is longer with more grinding molars and larger braincase. Cat skull is shorter with prominent canines, small carnassial teeth, and no flat-grinding molars (obligate carnivore signature).'),
        // Dog skull (left)
        h('text', { x: 150, y: 30, fill: '#fbbf24', fontSize: 14, textAnchor: 'middle', fontWeight: 700 }, '🐕 Dog (omnivore-leaning carnivore)'),
        // Approximate dog skull silhouette
        h('path', { d: 'M 50 180 Q 60 110 130 100 Q 200 95 250 130 Q 270 145 270 175 Q 270 200 250 215 L 220 220 L 200 245 L 170 250 L 100 245 Q 70 240 55 220 Q 50 200 50 180 Z', fill: '#3a2a1f', stroke: '#fbbf24', strokeWidth: 1.5 }),
        // Eye socket
        h('circle', { cx: 150, cy: 160, r: 14, fill: '#181210', stroke: '#fbbf24', strokeWidth: 1 }),
        // Teeth row (dog: more grinding molars)
        h('rect', { x: 195, y: 220, width: 10, height: 15, fill: '#fef3e2' }),
        h('rect', { x: 210, y: 220, width: 10, height: 15, fill: '#fef3e2' }),
        h('rect', { x: 225, y: 220, width: 10, height: 15, fill: '#fef3e2' }),
        h('rect', { x: 240, y: 220, width: 10, height: 15, fill: '#fef3e2' }),
        // Canine
        h('polygon', { points: '180,225 175,250 185,250', fill: '#fef3e2' }),
        // Labels
        h('line', { x1: 110, y1: 130, x2: 80, y2: 70, stroke: '#fbbf24', strokeWidth: 1 }),
        h('text', { x: 80, y: 60, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' }, 'Larger braincase'),
        h('line', { x1: 220, y1: 230, x2: 250, y2: 280, stroke: '#fbbf24', strokeWidth: 1 }),
        h('text', { x: 250, y: 295, fill: '#fbbf24', fontSize: 10, textAnchor: 'middle' }, 'Flat molars'),
        h('text', { x: 250, y: 305, fill: '#fbbf24', fontSize: 9, textAnchor: 'middle' }, '(can grind plant matter)'),
        h('line', { x1: 178, y1: 240, x2: 130, y2: 290, stroke: '#fbbf24', strokeWidth: 1 }),
        h('text', { x: 110, y: 305, fill: '#fbbf24', fontSize: 10 }, 'Canine'),
        // Cat skull (right) — shorter, more rounded
        h('text', { x: 450, y: 30, fill: '#86efac', fontSize: 14, textAnchor: 'middle', fontWeight: 700 }, '🐈 Cat (obligate carnivore)'),
        h('path', { d: 'M 350 180 Q 360 110 430 105 Q 490 105 530 140 Q 545 155 545 180 Q 545 205 525 220 L 500 225 L 480 250 L 450 255 L 400 250 Q 370 245 360 220 Q 350 200 350 180 Z', fill: '#3a2a1f', stroke: '#86efac', strokeWidth: 1.5 }),
        // Eye socket — bigger relative to skull
        h('circle', { cx: 450, cy: 160, r: 18, fill: '#181210', stroke: '#86efac', strokeWidth: 1 }),
        // Teeth — dominant canines, small/sharp molars (carnassials only)
        h('polygon', { points: '470,225 465,255 475,255', fill: '#fef3e2' }),
        h('polygon', { points: '420,225 415,250 425,250', fill: '#fef3e2' }),
        h('polygon', { points: '485,225 482,245 488,245', fill: '#fef3e2' }),
        h('polygon', { points: '500,225 497,243 503,243', fill: '#fef3e2' }),
        // Labels
        h('line', { x1: 470, y1: 160, x2: 510, y2: 75, stroke: '#86efac', strokeWidth: 1 }),
        h('text', { x: 525, y: 60, fill: '#86efac', fontSize: 10 }, 'Larger eyes'),
        h('text', { x: 525, y: 72, fill: '#86efac', fontSize: 9 }, '(better low-light)'),
        h('line', { x1: 470, y1: 245, x2: 500, y2: 285, stroke: '#86efac', strokeWidth: 1 }),
        h('text', { x: 510, y: 300, fill: '#86efac', fontSize: 10, textAnchor: 'middle' }, 'Sharp canines + carnassial'),
        h('text', { x: 510, y: 312, fill: '#86efac', fontSize: 9, textAnchor: 'middle' }, '(slicing only — no grinding)'),
        // Caption
        h('text', { x: 300, y: 345, fill: '#fef3e2', fontSize: 11, textAnchor: 'middle' }, 'Tooth shape reveals diet. Dogs can chew + grind plants; cats only slice. Confirms cats are obligate carnivores anatomically, not just biochemically.')
      );
    }

    function svgAirSac() {
      return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
        role: 'img', 'aria-labelledby': 'svg-airsac-title svg-airsac-desc',
        style: { background: '#181210', borderRadius: 8 } },
        h('title', { id: 'svg-airsac-title' }, 'Bird respiratory air sac system'),
        h('desc', { id: 'svg-airsac-desc' }, 'Schematic of bird respiratory anatomy: 9 air sacs, two-cycle one-way airflow through lungs. Air enters via trachea, fills posterior sacs first (cycle 1), passes through parabronchi (oxygen exchange), then to anterior sacs (cycle 2), exits via trachea. Far more efficient than mammalian tidal-flow lungs.'),
        // Bird outline (simplified perched profile)
        h('path', { d: 'M 80 200 Q 100 130 200 130 Q 280 130 350 160 L 380 175 L 410 175 L 440 165 L 460 180 Q 475 195 470 220 L 450 250 L 420 280 L 380 290 L 320 295 L 250 290 L 180 280 Q 120 270 90 240 Q 75 220 80 200 Z', fill: '#2d2018', stroke: '#fbbf24', strokeWidth: 1.5 }),
        // Trachea (input tube)
        h('path', { d: 'M 440 165 Q 460 130 480 100', stroke: '#7dd3fc', strokeWidth: 4, fill: 'none' }),
        h('text', { x: 495, y: 95, fill: '#7dd3fc', fontSize: 11 }, 'Trachea'),
        // Lung (parabronchi)
        h('rect', { x: 250, y: 175, width: 80, height: 35, fill: '#86efac', stroke: '#22c55e', strokeWidth: 1.5, rx: 6 }),
        h('text', { x: 290, y: 198, fill: '#0f172a', fontSize: 10, textAnchor: 'middle', fontWeight: 700 }, 'Lung (parabronchi)'),
        // Anterior air sacs (front of body — receive air on cycle 2)
        h('ellipse', { cx: 380, cy: 200, rx: 25, ry: 18, fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1 }),
        h('text', { x: 380, y: 205, fill: '#0f172a', fontSize: 9, textAnchor: 'middle' }, 'Anterior'),
        h('ellipse', { cx: 420, cy: 220, rx: 22, ry: 15, fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1 }),
        h('ellipse', { cx: 410, cy: 175, rx: 18, ry: 12, fill: '#bfdbfe', stroke: '#3b82f6', strokeWidth: 1 }),
        // Posterior air sacs (back/tail end — receive air on cycle 1)
        h('ellipse', { cx: 200, cy: 210, rx: 30, ry: 22, fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 1 }),
        h('text', { x: 200, y: 215, fill: '#0f172a', fontSize: 9, textAnchor: 'middle' }, 'Posterior'),
        h('ellipse', { cx: 150, cy: 240, rx: 28, ry: 20, fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 1 }),
        h('ellipse', { cx: 230, cy: 260, rx: 25, ry: 18, fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 1 }),
        h('ellipse', { cx: 290, cy: 245, rx: 22, ry: 15, fill: '#fef3c7', stroke: '#f59e0b', strokeWidth: 1 }),
        // Airflow arrows (one-way)
        h('text', { x: 110, y: 155, fill: '#fbbf24', fontSize: 10, fontWeight: 700 }, 'CYCLE 1 (inhale): air → posterior sacs (yellow)'),
        h('text', { x: 110, y: 320, fill: '#7dd3fc', fontSize: 10, fontWeight: 700 }, 'CYCLE 2 (exhale): posterior → lung → anterior (blue) → out'),
        // Labels
        h('text', { x: 300, y: 30, fill: '#fef3e2', fontSize: 14, textAnchor: 'middle', fontWeight: 700 }, 'Bird respiratory system'),
        h('text', { x: 300, y: 50, fill: '#a89180', fontSize: 11, textAnchor: 'middle' }, '9 air sacs · two-cycle one-way airflow · ~2× more efficient than mammals'),
        // Caption
        h('text', { x: 300, y: 350, fill: '#fb923c', fontSize: 11, textAnchor: 'middle', fontWeight: 700 }, '⚠ This efficiency is why birds die from PTFE / smoke / aerosols in MINUTES.')
      );
    }

    function svgOperantLoop() {
      return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
        role: 'img', 'aria-labelledby': 'svg-operant-title svg-operant-desc',
        style: { background: '#181210', borderRadius: 8 } },
        h('title', { id: 'svg-operant-title' }, 'Operant conditioning loop'),
        h('desc', { id: 'svg-operant-desc' }, 'The three-term contingency: antecedent (cue) → behavior (action) → consequence (reinforcer or punisher). Reinforcement increases the behavior frequency; punishment decreases it. Modern positive-reinforcement training uses cue → desired behavior → reward.'),
        h('text', { x: 300, y: 30, fill: '#fef3e2', fontSize: 14, textAnchor: 'middle', fontWeight: 700 }, 'Operant conditioning loop'),
        h('text', { x: 300, y: 50, fill: '#a89180', fontSize: 11, textAnchor: 'middle' }, '(For full theory + Skinner-box sim, see BehaviorLab)'),
        // ANTECEDENT box (left)
        h('rect', { x: 50, y: 130, width: 130, height: 80, fill: '#3a2a1f', stroke: '#7dd3fc', strokeWidth: 2, rx: 12 }),
        h('text', { x: 115, y: 160, fill: '#7dd3fc', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'ANTECEDENT'),
        h('text', { x: 115, y: 178, fill: '#fef3e2', fontSize: 11, textAnchor: 'middle' }, '(cue / setting)'),
        h('text', { x: 115, y: 195, fill: '#a89180', fontSize: 10, textAnchor: 'middle', fontStyle: 'italic' }, '"sit"'),
        // BEHAVIOR box (center)
        h('rect', { x: 235, y: 130, width: 130, height: 80, fill: '#3a2a1f', stroke: '#fbbf24', strokeWidth: 2, rx: 12 }),
        h('text', { x: 300, y: 160, fill: '#fbbf24', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'BEHAVIOR'),
        h('text', { x: 300, y: 178, fill: '#fef3e2', fontSize: 11, textAnchor: 'middle' }, '(action)'),
        h('text', { x: 300, y: 195, fill: '#a89180', fontSize: 10, textAnchor: 'middle', fontStyle: 'italic' }, 'dog sits'),
        // CONSEQUENCE box (right)
        h('rect', { x: 420, y: 130, width: 130, height: 80, fill: '#3a2a1f', stroke: '#86efac', strokeWidth: 2, rx: 12 }),
        h('text', { x: 485, y: 160, fill: '#86efac', fontSize: 13, textAnchor: 'middle', fontWeight: 700 }, 'CONSEQUENCE'),
        h('text', { x: 485, y: 178, fill: '#fef3e2', fontSize: 11, textAnchor: 'middle' }, '(reinforcer / punisher)'),
        h('text', { x: 485, y: 195, fill: '#a89180', fontSize: 10, textAnchor: 'middle', fontStyle: 'italic' }, 'treat + praise'),
        // Arrows between boxes
        h('line', { x1: 180, y1: 170, x2: 230, y2: 170, stroke: '#fef3e2', strokeWidth: 2 }),
        h('polygon', { points: '232,170 224,166 224,174', fill: '#fef3e2' }),
        h('line', { x1: 365, y1: 170, x2: 415, y2: 170, stroke: '#fef3e2', strokeWidth: 2 }),
        h('polygon', { points: '417,170 409,166 409,174', fill: '#fef3e2' }),
        // Feedback loop arrow (consequence → next antecedent)
        h('path', { d: 'M 485 215 Q 485 290 300 290 Q 115 290 115 215', stroke: '#fb923c', strokeWidth: 2, fill: 'none', strokeDasharray: '5,3' }),
        h('polygon', { points: '115,217 110,209 120,209', fill: '#fb923c' }),
        h('text', { x: 300, y: 310, fill: '#fb923c', fontSize: 11, textAnchor: 'middle', fontStyle: 'italic' }, 'Reinforcement makes the behavior MORE likely next time'),
        // Caption
        h('text', { x: 300, y: 340, fill: '#fef3e2', fontSize: 11, textAnchor: 'middle' }, 'Pet training works the same way mouse-Skinner-box training works.'),
        h('text', { x: 300, y: 354, fill: '#a89180', fontSize: 10, textAnchor: 'middle', fontStyle: 'italic' }, 'The pets-tile shows what changes when you swap the mouse for a real dog in your real living room.')
      );
    }

    function svgEthogram() {
      return h('svg', { viewBox: '0 0 600 360', width: '100%', height: '100%',
        role: 'img', 'aria-labelledby': 'svg-ethogram-title svg-ethogram-desc',
        style: { background: '#181210', borderRadius: 8 } },
        h('title', { id: 'svg-ethogram-title' }, 'Dog body language ethogram'),
        h('desc', { id: 'svg-ethogram-desc' }, 'Reading dog body language: simplified ethogram showing relaxed, alert, fearful, and warning postures via tail position, ear position, body stance, and facial expression.'),
        h('text', { x: 300, y: 28, fill: '#fef3e2', fontSize: 14, textAnchor: 'middle', fontWeight: 700 }, '🐕 Dog body language ethogram'),
        h('text', { x: 300, y: 46, fill: '#a89180', fontSize: 11, textAnchor: 'middle' }, 'Read the WHOLE body, not just the tail'),
        // RELAXED (top-left, green)
        h('rect', { x: 20, y: 60, width: 270, height: 130, fill: '#1a3320', stroke: '#86efac', strokeWidth: 1.5, rx: 8 }),
        h('text', { x: 30, y: 80, fill: '#86efac', fontSize: 12, fontWeight: 700 }, '✓ RELAXED + happy'),
        h('text', { x: 30, y: 100, fill: '#fef3e2', fontSize: 11 }, '• Loose, wiggly body'),
        h('text', { x: 30, y: 116, fill: '#fef3e2', fontSize: 11 }, '• Soft eyes (almond-shaped)'),
        h('text', { x: 30, y: 132, fill: '#fef3e2', fontSize: 11 }, '• Open, slightly hanging mouth'),
        h('text', { x: 30, y: 148, fill: '#fef3e2', fontSize: 11 }, '• Tail mid-height, loose wag'),
        h('text', { x: 30, y: 164, fill: '#fef3e2', fontSize: 11 }, '• Ears in neutral position'),
        h('text', { x: 30, y: 184, fill: '#a89180', fontSize: 10, fontStyle: 'italic' }, 'Safe to greet → ask handler first'),
        // ALERT (top-right, yellow)
        h('rect', { x: 310, y: 60, width: 270, height: 130, fill: '#3a2a1a', stroke: '#fbbf24', strokeWidth: 1.5, rx: 8 }),
        h('text', { x: 320, y: 80, fill: '#fbbf24', fontSize: 12, fontWeight: 700 }, '⚠ ALERT / aroused'),
        h('text', { x: 320, y: 100, fill: '#fef3e2', fontSize: 11 }, '• Body still + forward'),
        h('text', { x: 320, y: 116, fill: '#fef3e2', fontSize: 11 }, '• Eyes fixed on something'),
        h('text', { x: 320, y: 132, fill: '#fef3e2', fontSize: 11 }, '• Ears pricked forward'),
        h('text', { x: 320, y: 148, fill: '#fef3e2', fontSize: 11 }, '• Tail high, can be fast wag'),
        h('text', { x: 320, y: 164, fill: '#fef3e2', fontSize: 11 }, '• Closed mouth'),
        h('text', { x: 320, y: 184, fill: '#a89180', fontSize: 10, fontStyle: 'italic' }, 'Pause + assess, do NOT approach'),
        // FEARFUL (bottom-left, orange)
        h('rect', { x: 20, y: 200, width: 270, height: 130, fill: '#3a1f10', stroke: '#fb923c', strokeWidth: 1.5, rx: 8 }),
        h('text', { x: 30, y: 220, fill: '#fb923c', fontSize: 12, fontWeight: 700 }, '⚠ FEARFUL / appeasing'),
        h('text', { x: 30, y: 240, fill: '#fef3e2', fontSize: 11 }, '• Low body / tucked posture'),
        h('text', { x: 30, y: 256, fill: '#fef3e2', fontSize: 11 }, '• "Whale eye" — whites showing'),
        h('text', { x: 30, y: 272, fill: '#fef3e2', fontSize: 11 }, '• Ears flattened back'),
        h('text', { x: 30, y: 288, fill: '#fef3e2', fontSize: 11 }, '• Tail tucked'),
        h('text', { x: 30, y: 304, fill: '#fef3e2', fontSize: 11 }, '• Lip-licking, yawning, paw-lift'),
        h('text', { x: 30, y: 324, fill: '#a89180', fontSize: 10, fontStyle: 'italic' }, 'Give space — do NOT push interaction'),
        // WARNING / aggressive (bottom-right, red)
        h('rect', { x: 310, y: 200, width: 270, height: 130, fill: '#3a1010', stroke: '#fca5a5', strokeWidth: 1.5, rx: 8 }),
        h('text', { x: 320, y: 220, fill: '#fca5a5', fontSize: 12, fontWeight: 700 }, '🛑 WARNING — back off NOW'),
        h('text', { x: 320, y: 240, fill: '#fef3e2', fontSize: 11 }, '• Stiff body, weight forward'),
        h('text', { x: 320, y: 256, fill: '#fef3e2', fontSize: 11 }, '• Hard, direct stare'),
        h('text', { x: 320, y: 272, fill: '#fef3e2', fontSize: 11 }, '• Closed mouth → showing teeth'),
        h('text', { x: 320, y: 288, fill: '#fef3e2', fontSize: 11 }, '• Tail high + slow stiff wag'),
        h('text', { x: 320, y: 304, fill: '#fef3e2', fontSize: 11 }, '• Low growl, raised hackles'),
        h('text', { x: 320, y: 324, fill: '#fca5a5', fontSize: 10, fontStyle: 'italic' }, 'A bite is the next step. Slowly create distance.'),
        // Caption
        h('text', { x: 300, y: 354, fill: '#a89180', fontSize: 10, textAnchor: 'middle' }, 'Tail wagging means AROUSAL — context (rest of body) tells you which kind.')
      );
    }

    function renderDiagrams() {
      var current = diagramView;
      var svg, caption;
      if (current === 'airsac') {
        svg = svgAirSac();
        caption = 'Bird respiratory anatomy is fundamentally different from mammals. Two-cycle one-way airflow through 9 air sacs gives birds ~2× the gas-exchange efficiency. Same physiology that lets canaries warn coal miners makes pet birds extraordinarily sensitive to airborne toxins (Teflon, scented candles, smoke).';
      } else if (current === 'operant') {
        svg = svgOperantLoop();
        caption = 'The three-term contingency (antecedent → behavior → consequence) is the foundation of operant conditioning. BehaviorLab simulates this with mice in a Skinner box. The Pets Lab shows what changes when you swap the mouse for a real animal in a real environment.';
      } else if (current === 'bodylang') {
        svg = svgEthogram();
        caption = 'Most dog bites are predictable from body language minutes in advance. The 4 quadrants here are simplified; real dogs slide between states. Reading the WHOLE body — not just the tail — is the highest-impact skill for any pet-owning household.';
      } else {
        svg = svgSkullCompare();
        caption = 'Tooth shape reveals diet. Dogs have flat-topped molars (can grind plants) and a longer braincase. Cats have only sharp canines + carnassial teeth (slicing only — no grinding) and proportionally larger eye sockets for low-light hunting. Anatomy confirms what biochemistry already shows: cats are obligate carnivores.';
      }
      return h('div', { style: { padding: 20, maxWidth: 980, margin: '0 auto', color: T.text } },
        backBar('🔬 Diagrams'),
        h('p', { style: { margin: '0 0 14px', color: T.muted, fontSize: 13, lineHeight: 1.55 } },
          '4 labeled schematics for visual learners. Switch tabs to compare different topics covered across the lab.'),
        h('div', { role: 'tablist', 'aria-label': 'Schematic diagrams',
          style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 } },
          DIAGRAM_TABS.map(function(t) {
            var picked = current === t.id;
            return h('button', { key: t.id, role: 'tab',
              'aria-selected': picked ? 'true' : 'false',
              'data-pets-focusable': true,
              onClick: function() { upd('diagramView', t.id); petsAnnounce(t.label + ' diagram'); },
              style: btn({
                background: picked ? T.accent : T.card,
                color: picked ? '#1f1612' : T.text,
                border: '1px solid ' + (picked ? T.accent : T.border),
                padding: '8px 14px', fontSize: 13
              })
            }, t.icon + ' ' + t.label);
          })),
        h('div', { role: 'tabpanel',
          style: { padding: 12, borderRadius: 12, background: T.card, border: '1px solid ' + T.border, marginBottom: 12 } },
          h('div', { style: { width: '100%', maxWidth: 920, margin: '0 auto', aspectRatio: '600 / 360' } }, svg),
          h('p', { style: { margin: '12px 4px 0', fontSize: 13, color: T.muted, lineHeight: 1.6 } }, caption)),
        h('div', { style: { padding: 12, borderRadius: 10, background: T.cardAlt, border: '1px dashed ' + T.border, fontSize: 11, color: T.dim, lineHeight: 1.55 } },
          'Schematics are simplified for learning. For clinical anatomy + behavioral assessment, see the cited primary sources (AVMA, AAV, AVSAB).'),
        footer());
    }

    // VIEW ROUTER
    switch (view) {
      case 'dogs':         return renderDogs();
      case 'cats':         return renderCats();
      case 'smallMammals': return renderSmallMammals();
      case 'birds':        return renderBirds();
      case 'reptiles':     return renderReptiles();
      case 'training':     return renderTraining();
      case 'nutrition':    return renderNutrition();
      case 'genetics':     return renderGenetics();
      case 'zoonoses':     return renderZoonoses();
      case 'service':      return renderService();
      case 'picker':       return renderPicker();
      case 'bodyLang':     return renderBodyLang();
      case 'cost':         return renderCost();
      case 'famous':       return renderFamous();
      case 'aiPractice':   return renderAiPractice();
      case 'diagrams':     return renderDiagrams();
      case 'glossary':     return renderGlossary();
      case 'myths':        return renderMyths();
      case 'careers':      return renderCareers();
      case 'action':       return renderAction();
      case 'quiz':         return renderQuiz();
      case 'resources':    return renderResources();
      case 'teacher':      return renderTeacher();
      case 'menu':
      default:             return renderMenu();
    }
  }

})();

}
