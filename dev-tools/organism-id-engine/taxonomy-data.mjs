/**
 * taxonomy-data.mjs — the SINGLE SOURCE for the Taxonomy Explorer's tree,
 * lookalike edges, and explainer copy. `build-explorer.mjs` injects this into
 * the HTML template, so the published artifact can never drift from the data,
 * and `test.mjs` asserts every tier-bearing taxon in hazard-rules.json appears
 * here (add a hazard rule ⇒ the coverage test fails until the map includes it).
 */
const N = (n, r, x = {}, kids) => ({ n, r, ...x, kids });

export const TREE = N("Life", "domain", { note: "Every living thing shares a single common ancestor ~3.5–4 billion years ago. The ranks below are labels we add to the branches — useful, but not laws of nature." }, [
  N("Fungi", "kingdom", { tier: "DEADLY", rule: "category net — never forage wild fungi", note: "Until about 1969, fungi were filed under 'plants.' They're actually closer to animals: both are opisthokonts. A whole kingdom was re-drawn within living memory." }, [
    N("Basidiomycota", "phylum", {}, [
      N("Agaricales", "order", { note: "Both the edible Agaricus and the deadly Amanita live in this one order — the lethal difference appears only one rank down, at family." }, [
        N("Agaricaceae", "family", {}, [
          N("Agaricus", "genus", { tier: "SAFE", common: "button / portobello / meadow", group: "amanita", ex: [["Agaricus bisporus", "portobello"], ["Agaricus campestris", "meadow mushroom"]], note: "The cultivated ones are edible — but wild lookalikes are not, and no photo can tell them apart safely." }),
          N("Chlorophyllum", "genus", { tier: "DEADLY", common: "green-spored parasol", note: "The single most common cause of mushroom poisoning in North America — mistaken for edible parasols. Tell: green spore print." }),
          N("Lepiota", "genus", { tier: "DEADLY", common: "some deadly dapperlings", note: "Small and innocuous-looking; several carry the same amatoxins as the death cap." }),
          N("Lycoperdon", "genus", { tier: "SAFE", common: "puffball", group: "amanita", note: "Edible when uniformly white inside — but a young Amanita 'egg' looks identical from outside. Always cut it open." }),
        ]),
        N("Amanitaceae", "family", {}, [
          N("Amanita", "genus", { tier: "DEADLY", common: "death cap / destroying angel", group: "amanita", ex: [["Amanita phalloides", "death cap"], ["Amanita bisporigera", "destroying angel"]], note: "Amatoxins. Onset delayed 6–24h (a false 'all clear'), then liver failure. A single cap can kill; there is no reliable home test. Tell: white spore print + a volva (cup) at the base." }),
        ]),
        N("Pleurotaceae", "family", {}, [N("Pleurotus", "genus", { tier: "SAFE", common: "oyster mushroom", ex: [["Pleurotus ostreatus", "oyster"]], note: "A benign example — yet the tool still raises the blanket 'no wild fungus is safe from a photo' caution. Fail-safe by design." })]),
        N("Cortinariaceae", "family", {}, [N("Cortinarius", "genus", { tier: "DEADLY", common: "deadly webcap", note: "Orellanine attacks the kidneys with onset delayed DAYS to WEEKS — long after any 'it was fine.'" })]),
        N("Omphalotus", "genus", { tier: "MILD", common: "jack-o'-lantern", note: "Glows faintly in the dark; mistaken for chanterelles. True gills (not blunt ridges) give it away." }),
      ]),
      N("Boletales", "order", {}, [N("Boletus", "genus", { tier: "SAFE", common: "porcini / king bolete", note: "Choice edible — but some red-pored, blue-staining relatives cause serious GI illness." })]),
    ]),
    N("Ascomycota", "phylum", {}, [N("Morchella", "genus", { tier: "SAFE", common: "true morel", note: "Hollow tip-to-base. The 'false morel' (Gyromitra) is chambered inside and contains a rocket-fuel relative." }), N("Gyromitra", "genus", { tier: "DEADLY", common: "false morel" })]),
  ]),
  N("Animalia", "kingdom", {}, [
    N("Arthropoda", "phylum", {}, [
      N("Insecta", "class", {}, [
        N("Lepidoptera", "order", {}, [
          N("Nymphalidae", "family", {}, [
            N("Danaus", "genus", { tier: "INFO", common: "monarch", ex: [["Danaus plexippus", "monarch"]], note: "The monarch and the viceroy (Limenitis) mimic each other despite belonging to different genera — resemblance by convergent evolution, not close kinship. Nature's own lookalike lesson." }),
            N("Limenitis", "genus", { tier: "INFO", common: "viceroy", note: "Tell it from a monarch by the extra black line crossing each hindwing." }),
          ]),
          N("Megalopyge", "genus", { tier: "CONTACT", common: "puss caterpillar", note: "The fuzziest, most 'pettable'-looking caterpillar hides venomous spines." }),
        ]),
        N("Arachnida", "class", {}, [N("Latrodectus", "genus", { tier: "CONTACT", common: "black widow" }), N("Loxosceles", "genus", { tier: "CONTACT", common: "brown recluse" })]),
      ]),
    ]),
    N("Chordata", "phylum", {}, [
      N("Squamata", "class", { tier: "CONTACT", common: "snakes & lizards", note: "GBIF ranks Squamata as a CLASS with an empty 'order' — other systems call it an order, or place snakes in the suborder Serpentes. The tool's snake rule was silently dead until it was re-keyed to class. A live reminder that ranks are conventions, not facts." }, [
        N("Elapidae", "family", {}, [N("Micrurus", "genus", { tier: "DEADLY", common: "coral snake", note: "The 'red-touches-yellow' rhyme only works in the US. Mimicked by harmless king/milk snakes. Never handle any snake from an ID." })]),
        N("Viperidae", "family", {}, [N("Crotalus", "genus", { tier: "DEADLY", common: "rattlesnake" })]),
      ]),
      N("Tetraodontidae", "family", { tier: "DEADLY", common: "pufferfish", note: "Tetrodotoxin — no antidote, and no home preparation makes it safe." }),
      N("Pterois", "genus", { tier: "CONTACT", common: "lionfish", note: "Showy venomous fin-spines; admire from a distance." }),
    ]),
    N("Mollusca", "phylum", {}, [
      N("Conus", "genus", { tier: "DEADLY", common: "cone snail", note: "Fires a venomous harpoon; the big ones are nicknamed 'cigarette snails.' A beautiful shell is not worth it." }),
      N("Hapalochlaena", "genus", { tier: "DEADLY", common: "blue-ringed octopus", note: "Venom with no antivenom; small, in tide pools. The blue rings flash only once it's already provoked." }),
    ]),
    N("Cnidaria", "phylum", {}, [N("Physalia", "genus", { tier: "CONTACT", common: "Portuguese man o' war", note: "Not even one organism — it's a colony of specialised bodies. Stings severely even when beached." })]),
  ]),
  N("Plantae", "kingdom", {}, [
    N("Apiaceae", "family", { tier: "DEADLY", common: "carrot / parsley family", rule: "category net — never forage this family", note: "Holds both the wild carrot and the two most lethal plants in North America (water & poison hemlock), which share the same lacy leaves and umbrella flowers." }, [
      N("Daucus", "genus", { tier: "SAFE", common: "wild carrot / Queen Anne's lace" }),
      N("Cicuta", "genus", { tier: "DEADLY", common: "water hemlock", note: "Cicutoxin: violent seizures within an hour, often fatal." }),
      N("Conium", "genus", { tier: "DEADLY", common: "poison hemlock", note: "Coniine — the poison that killed Socrates." }),
      N("Heracleum", "genus", { tier: "CONTACT", common: "giant hogweed", note: "Sap causes burns and blistering in sunlight; can blind you." }),
    ]),
    N("Apocynaceae", "family", {}, [N("Nerium", "genus", { tier: "DEADLY", common: "oleander", note: "One of the most poisonous common garden plants; even smoke from burning it is dangerous." })]),
    N("Solanaceae", "family", { common: "nightshade family" }, [
      N("Atropa", "genus", { tier: "DEADLY", common: "deadly nightshade" }),
      N("Datura", "genus", { tier: "DEADLY", common: "jimsonweed", note: "Tropane alkaloids; poisonings often follow curiosity about the seeds." }),
    ]),
    N("Euphorbiaceae", "family", {}, [
      N("Ricinus", "genus", { tier: "DEADLY", common: "castor bean", note: "Seeds contain ricin — a single chewed seed can be lethal, and they're often strung into jewelry." }),
      N("Hippomane", "genus", { tier: "DEADLY", common: "manchineel", note: "The 'little apple of death.' Its sap burns; standing under it in the rain injures you." }),
    ]),
    N("Plantaginaceae", "family", {}, [N("Digitalis", "genus", { tier: "DEADLY", common: "foxglove", note: "Cardiac glycosides can stop the heart. Its pre-flower rosette mimics edible comfrey." })]),
  ]),
]);

export const EDGES = [
  ["DEADLY", ["Portobello / button", "Agaricus bisporus"], ["Death cap / destroying angel", "Amanita phalloides"], "Agaricus is chocolate-brown-spored with no cup; a deadly Amanita is white-spored with a volva at the base. They split at the family level."],
  ["DEADLY", ["Puffball", "Lycoperdon"], ["Amanita 'egg' (button)", "Amanita spp."], "Cut it open: a puffball is uniform white; a young Amanita shows a gilled mushroom forming inside."],
  ["DEADLY", ["Paddy straw", "Volvariella"], ["Death cap", "Amanita"], "Both rise from a volva — a leading cause of fatal poisonings among foragers who know paddy straw from home."],
  ["DEADLY", ["Honey mushroom", "Armillaria"], ["Funeral bell", "Galerina marginata"], "Both cluster on wood; Galerina carries the death cap's amatoxins."],
  ["DEADLY", ["True morel", "Morchella"], ["False morel", "Gyromitra esculenta"], "A true morel is hollow throughout; a false morel is chambered and contains a rocket-fuel relative."],
  ["DEADLY", ["Wild carrot", "Daucus carota"], ["Water / poison hemlock", "Cicuta · Conium"], "The carrot family's deadly members share the same lacy leaves and umbels — the most lethal foraging confusion on the continent."],
  ["DEADLY", ["Wild onion", "Allium"], ["Death camas", "Toxicoscordion"], "A true Allium always smells of onion; death camas does not — but scent is not a life-and-death test."],
  ["DEADLY", ["Comfrey", "Symphytum"], ["Foxglove", "Digitalis"], "Before flowering, foxglove's leaf rosette closely resembles comfrey — and foxglove can stop your heart."],
  ["DEADLY", ["Milk / king snake", "Lampropeltis"], ["Coral snake", "Micrurus"], "The color rhyme fails outside the US. Never handle any snake from an ID."],
  ["MILD", ["Chanterelle", "Cantharellus"], ["Jack-o'-lantern", "Omphalotus"], "True chanterelles have blunt forking ridges; the toxic mimic has true, sharp gills and grows on wood."],
  ["CONTACT", ["Cow parsnip", "Heracleum maximum"], ["Giant hogweed", "Heracleum mantegazzianum"], "Younger hogweed resembles harmless cow parsnip; its sap burns and blisters in sunlight."],
  ["INFO", ["Monarch", "Danaus plexippus"], ["Viceroy", "Limenitis archippus"], "A mimicry pair from different genera — look for the viceroy's extra hindwing line. (No hazard — a teaching case.)"],
];

export const EXPLAIN = [
  ["Ranks are conventions, not facts", [
    "<p>Kingdom, phylum, class, order, family, genus, species — the ladder feels absolute, but the rungs are human agreements about where to draw lines on a continuously branching tree. Different authorities draw them differently.</p>",
    "<div class='callout'>Real example from this very tool: <b>GBIF ranks Squamata (snakes & lizards) as a <i>class</i></b>, leaving the 'order' field empty. Other systems call Squamata an order, and place snakes in the suborder Serpentes. Our snake-safety rule was silently dead until we re-keyed it to <i>class</i> — because a rank is a label, and labels disagree.</div>",
    "<p>The number of ranks isn't fixed either: biologists sprinkle in super-, sub-, and infra- ranks whenever the seven aren't enough.</p>",
  ]],
  ["Three ways to draw the same tree", [
    "<p><b>Linnaean ranks</b> (1735) sort life into nested boxes. <b>Cladistics</b> ignores rank and groups strictly by shared ancestry — every group must contain an ancestor and <i>all</i> its descendants. By that rule, 'reptiles' isn't a real group unless you include birds, and 'fish' isn't one unless you include us.</p>",
    "<p><b>The three-domain system</b> (Bacteria, Archaea, Eukarya) reorganised the top of the tree in 1990 around molecular data, demoting the old 'five kingdoms.' GBIF's backbone — what the ID tool resolves against — is yet another synthesis, stitched from many sources.</p>",
    "<div class='callout'>None of these is 'wrong.' They answer different questions: how do we file it, versus how is it related?</div>",
  ]],
  ["What even is a species?", [
    "<p>The word does a lot of quiet work. The <b>biological</b> species concept says a species is a group that interbreeds — but that fails for anything asexual, for fossils, and for organisms that hybridise. The <b>morphological</b> concept sorts by appearance — but <b>cryptic species</b> look identical yet can't interbreed, and a single species can look wildly different by age, sex, or season.</p>",
    "<p><b>Ring species</b> break it outright: neighbouring populations around a ring all interbreed, except where the two ends meet — so they're one species and two at the same time.</p>",
    "<div class='callout'>This is exactly why a photo ID has honest limits: many organisms simply cannot be told apart by eye, which is why the tool shows a <i>range</i> of candidates and narrows confidence down the ladder rather than faking a single answer.</div>",
  ]],
  ["The organisms that break the boxes", [
    "<p><b>Fungi</b> were classified as plants until ~1969; they're closer to animals. <b>Lichens</b> aren't one organism at all — a fungus and an alga (or cyanobacterium) living as one. <b>Viruses</b> may not even be 'alive,' and sit awkwardly outside the tree. Bacteria swap genes sideways by <b>horizontal gene transfer</b>, so their 'tree' is really a web.</p>",
    "<p>And charismatic misfits abound: the <b>platypus</b> (a mammal that lays eggs), the <b>red panda</b> (reshuffled among bears, raccoons, and finally its own family), <b>whales</b> (hoofed mammals nested inside the group that includes hippos).</p>",
  ]],
  ["When lookalikes aren't relatives", [
    "<p><b>Convergent evolution</b> makes unrelated organisms resemble each other because the same problem has the same good solutions. <b>Mimicry</b> takes it further: harmless species evolve to copy dangerous ones, or two defended species converge on one warning look.</p>",
    "<div class='callout'>This is the whole reason the Organism ID tool leads with safety. A resemblance can jump across huge evolutionary distances — so 'it looks like the edible one' is never enough. The monarch and viceroy make the lesson friendly; the edible mushroom and its deadly twin make it deadly serious.</div>",
    "<p>So classification isn't trivia. Knowing <i>how confidently</i> we can place an organism — and where the tree is genuinely uncertain — is the difference between a snack and a poisoning.</p>",
  ]],
];
