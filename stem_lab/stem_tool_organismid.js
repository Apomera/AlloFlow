/**
 * stem_tool_organismid.js — Taxonomy Explorer
 * ---------------------------------------------------------------------------
 * The teaching half of the Organism ID tool. The engine that turns a student's
 * photograph into a ranked identification lives in dev-tools/organism-id-engine/
 * (16 modules, 46 tests) and is NOT bundled here on purpose:
 *
 *   hazard-rules.json carries 24 DEADLY + 8 CONTACT entries and every one of
 *   them is still flagged needsExpertReview:true with no reviewedBy. That copy
 *   tells children which mushrooms can kill them. The engine's own data gate
 *   treats unsigned deadly copy as a ship blocker, and so do we. See
 *   dev-tools/organism-id-engine/REVIEW.md for the mycologist checklist.
 *
 * What ships here is the classification pedagogy, which carries no life-safety
 * instruction: the ranked tree, the lookalike pairs, and the "ranks are
 * conventions, not facts" explainer. The organism notes below describe hazards
 * so students understand WHY resemblance is dangerous — they never tell anyone
 * that something is safe to touch or eat, and the tool's standing rule is that
 * no photograph and no app can make a wild organism safe.
 *
 * Data source of truth: dev-tools/organism-id-engine/taxonomy-data.mjs. The
 * engine's test suite asserts every hazard rule appears in that tree, so when
 * the photo path is unblocked, re-sync TREE/EDGES/EXPLAIN from that file.
 *
 * i18n policy (mirrors allo-adapter.mjs): UI chrome is translated normally via
 * __alloT. Organism notes, lookalike tells, and the safety banner are NOT keyed
 * for runtime translation — an unreviewed machine translation of safety text is
 * more dangerous than English. They become translatable once a native-speaking
 * expert signs them off, exactly like the English.
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  if (typeof window === 'undefined') return;

  window.StemLab = window.StemLab || {
    _registry: {},
    _order: [],
    registerTool: function (id, config) {
      config.id = id;
      config.ready = config.ready !== false;
      this._registry[id] = config;
      if (this._order.indexOf(id) === -1) this._order.push(id);
    },
    isRegistered: function (id) { return !!this._registry[id]; },
    getRegisteredTools: function () {
      var self = this;
      return this._order.map(function (id) { return self._registry[id]; }).filter(Boolean);
    },
    renderTool: function (id, ctx) {
      var tool = this._registry[id];
      return tool && typeof tool.render === 'function' ? tool.render(ctx) : null;
    }
  };

  if (window.StemLab.isRegistered && window.StemLab.isRegistered('organismId')) return;

  // The photo-identification path stays dark until every DEADLY/CONTACT entry in
  // hazard-rules.json carries a named reviewer. Flipping this to true is NOT
  // sufficient on its own — the engine still has to be bundled in. See REVIEW.md.
  var PHOTO_ID_ENABLED = false;

  // ── Taxonomy data ─────────────────────────────────────────────────────────
  // Transcribed from dev-tools/organism-id-engine/taxonomy-data.mjs.
  function N(name, rank, extra, kids) {
    var node = { name: name, rank: rank, kids: kids || null };
    if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) node[k] = extra[k];
    return node;
  }

  var TREE = N('Life', 'domain', { note: 'Every living thing shares a single common ancestor about 3.5 to 4 billion years ago. The ranks below are labels we add to the branches — useful, but not laws of nature.' }, [
    N('Fungi', 'kingdom', { tier: 'DEADLY', rule: 'category net — never forage wild fungi', note: 'Until about 1969, fungi were filed under "plants." They are actually closer to animals: both are opisthokonts. A whole kingdom was re-drawn within living memory.' }, [
      N('Basidiomycota', 'phylum', null, [
        N('Agaricales', 'order', { note: 'Both the edible Agaricus and the deadly Amanita live in this one order — the lethal difference appears only one rank down, at family.' }, [
          N('Agaricaceae', 'family', null, [
            N('Agaricus', 'genus', { tier: 'SAFE', common: 'button / portobello / meadow', group: 'amanita', ex: [['Agaricus bisporus', 'portobello'], ['Agaricus campestris', 'meadow mushroom']], note: 'The cultivated ones are edible — but wild lookalikes are not, and no photo can tell them apart safely.' }),
            N('Chlorophyllum', 'genus', { tier: 'DEADLY', common: 'green-spored parasol', note: 'The single most common cause of mushroom poisoning in North America — mistaken for edible parasols. Tell: green spore print.' }),
            N('Lepiota', 'genus', { tier: 'DEADLY', common: 'some deadly dapperlings', note: 'Small and innocuous-looking; several carry the same amatoxins as the death cap.' }),
            N('Lycoperdon', 'genus', { tier: 'SAFE', common: 'puffball', group: 'amanita', note: 'Edible when uniformly white inside — but a young Amanita "egg" looks identical from outside. Always cut it open.' })
          ]),
          N('Amanitaceae', 'family', null, [
            N('Amanita', 'genus', { tier: 'DEADLY', common: 'death cap / destroying angel', group: 'amanita', ex: [['Amanita phalloides', 'death cap'], ['Amanita bisporigera', 'destroying angel']], note: 'Amatoxins. Onset delayed 6 to 24 hours (a false "all clear"), then liver failure. A single cap can kill; there is no reliable home test. Tell: white spore print plus a volva (cup) at the base.' })
          ]),
          N('Pleurotaceae', 'family', null, [
            N('Pleurotus', 'genus', { tier: 'SAFE', common: 'oyster mushroom', ex: [['Pleurotus ostreatus', 'oyster']], note: 'A benign example — yet the tool still raises the blanket "no wild fungus is safe from a photo" caution. Fail-safe by design.' })
          ]),
          N('Cortinariaceae', 'family', null, [
            N('Cortinarius', 'genus', { tier: 'DEADLY', common: 'deadly webcap', note: 'Orellanine attacks the kidneys with onset delayed DAYS to WEEKS — long after any "it was fine."' })
          ]),
          N('Omphalotus', 'genus', { tier: 'MILD', common: "jack-o'-lantern", note: 'Glows faintly in the dark; mistaken for chanterelles. True gills (not blunt ridges) give it away.' })
        ]),
        N('Boletales', 'order', null, [
          N('Boletus', 'genus', { tier: 'SAFE', common: 'porcini / king bolete', note: 'Choice edible — but some red-pored, blue-staining relatives cause serious gastrointestinal illness.' })
        ])
      ]),
      N('Ascomycota', 'phylum', null, [
        N('Morchella', 'genus', { tier: 'SAFE', common: 'true morel', note: 'Hollow tip-to-base. The "false morel" (Gyromitra) is chambered inside and contains a rocket-fuel relative.' }),
        N('Gyromitra', 'genus', { tier: 'DEADLY', common: 'false morel' })
      ])
    ]),
    N('Animalia', 'kingdom', null, [
      N('Arthropoda', 'phylum', null, [
        N('Insecta', 'class', null, [
          N('Lepidoptera', 'order', null, [
            N('Nymphalidae', 'family', null, [
              N('Danaus', 'genus', { tier: 'INFO', common: 'monarch', ex: [['Danaus plexippus', 'monarch']], note: 'The monarch and the viceroy (Limenitis) mimic each other despite belonging to different genera — resemblance by convergent evolution, not close kinship. Nature’s own lookalike lesson.' }),
              N('Limenitis', 'genus', { tier: 'INFO', common: 'viceroy', note: 'Tell it from a monarch by the extra black line crossing each hindwing.' })
            ]),
            N('Megalopyge', 'genus', { tier: 'CONTACT', common: 'puss caterpillar', note: 'The fuzziest, most "pettable"-looking caterpillar hides venomous spines.' })
          ])
        ]),
        N('Arachnida', 'class', null, [
          N('Latrodectus', 'genus', { tier: 'CONTACT', common: 'black widow' }),
          N('Loxosceles', 'genus', { tier: 'CONTACT', common: 'brown recluse' })
        ])
      ]),
      N('Chordata', 'phylum', null, [
        N('Squamata', 'class', { tier: 'CONTACT', common: 'snakes & lizards', note: 'GBIF ranks Squamata as a CLASS with an empty "order" — other systems call it an order, or place snakes in the suborder Serpentes. The tool’s snake rule was silently dead until it was re-keyed to class. A live reminder that ranks are conventions, not facts.' }, [
          N('Elapidae', 'family', null, [
            N('Micrurus', 'genus', { tier: 'DEADLY', common: 'coral snake', note: 'The "red-touches-yellow" rhyme only works in the US. Mimicked by harmless king and milk snakes. Never handle any snake from an ID.' })
          ]),
          N('Viperidae', 'family', null, [
            N('Crotalus', 'genus', { tier: 'DEADLY', common: 'rattlesnake' })
          ])
        ]),
        N('Tetraodontidae', 'family', { tier: 'DEADLY', common: 'pufferfish', note: 'Tetrodotoxin — no antidote, and no home preparation makes it safe.' }),
        N('Pterois', 'genus', { tier: 'CONTACT', common: 'lionfish', note: 'Showy venomous fin-spines; admire from a distance.' })
      ]),
      N('Mollusca', 'phylum', null, [
        N('Conus', 'genus', { tier: 'DEADLY', common: 'cone snail', note: 'Fires a venomous harpoon; the big ones are nicknamed "cigarette snails." A beautiful shell is not worth it.' }),
        N('Hapalochlaena', 'genus', { tier: 'DEADLY', common: 'blue-ringed octopus', note: 'Venom with no antivenom; small, in tide pools. The blue rings flash only once it is already provoked.' })
      ]),
      N('Cnidaria', 'phylum', null, [
        N('Physalia', 'genus', { tier: 'CONTACT', common: 'Portuguese man o’ war', note: 'Not even one organism — it is a colony of specialised bodies. Stings severely even when beached.' })
      ])
    ]),
    N('Plantae', 'kingdom', null, [
      N('Apiaceae', 'family', { tier: 'DEADLY', common: 'carrot / parsley family', rule: 'category net — never forage this family', note: 'Holds both the wild carrot and the two most lethal plants in North America (water and poison hemlock), which share the same lacy leaves and umbrella flowers.' }, [
        N('Daucus', 'genus', { tier: 'SAFE', common: "wild carrot / Queen Anne's lace" }),
        N('Cicuta', 'genus', { tier: 'DEADLY', common: 'water hemlock', note: 'Cicutoxin: violent seizures within an hour, often fatal.' }),
        N('Conium', 'genus', { tier: 'DEADLY', common: 'poison hemlock', note: 'Coniine — the poison that killed Socrates.' }),
        N('Heracleum', 'genus', { tier: 'CONTACT', common: 'giant hogweed', note: 'Sap causes burns and blistering in sunlight; can blind you.' })
      ]),
      N('Apocynaceae', 'family', null, [
        N('Nerium', 'genus', { tier: 'DEADLY', common: 'oleander', note: 'One of the most poisonous common garden plants; even smoke from burning it is dangerous.' })
      ]),
      N('Solanaceae', 'family', { common: 'nightshade family' }, [
        N('Atropa', 'genus', { tier: 'DEADLY', common: 'deadly nightshade' }),
        N('Datura', 'genus', { tier: 'DEADLY', common: 'jimsonweed', note: 'Tropane alkaloids; poisonings often follow curiosity about the seeds.' })
      ]),
      N('Euphorbiaceae', 'family', null, [
        N('Ricinus', 'genus', { tier: 'DEADLY', common: 'castor bean', note: 'Seeds contain ricin — a single chewed seed can be lethal, and they are often strung into jewelry.' }),
        N('Hippomane', 'genus', { tier: 'DEADLY', common: 'manchineel', note: 'The "little apple of death." Its sap burns; standing under it in the rain injures you.' })
      ]),
      N('Plantaginaceae', 'family', null, [
        N('Digitalis', 'genus', { tier: 'DEADLY', common: 'foxglove', note: 'Cardiac glycosides can stop the heart. Its pre-flower rosette mimics edible comfrey.' })
      ])
    ])
  ]);

  var EDGES = [
    { tier: 'DEADLY', safe: ['Portobello / button', 'Agaricus bisporus'], danger: ['Death cap / destroying angel', 'Amanita phalloides'], tell: 'Agaricus is chocolate-brown-spored with no cup; a deadly Amanita is white-spored with a volva at the base. They split at the family level.' },
    { tier: 'DEADLY', safe: ['Puffball', 'Lycoperdon'], danger: ['Amanita "egg" (button)', 'Amanita spp.'], tell: 'Cut it open: a puffball is uniform white; a young Amanita shows a gilled mushroom forming inside.' },
    { tier: 'DEADLY', safe: ['Paddy straw', 'Volvariella'], danger: ['Death cap', 'Amanita'], tell: 'Both rise from a volva — a leading cause of fatal poisonings among foragers who know paddy straw from home.' },
    { tier: 'DEADLY', safe: ['Honey mushroom', 'Armillaria'], danger: ['Funeral bell', 'Galerina marginata'], tell: 'Both cluster on wood; Galerina carries the death cap’s amatoxins.' },
    { tier: 'DEADLY', safe: ['True morel', 'Morchella'], danger: ['False morel', 'Gyromitra esculenta'], tell: 'A true morel is hollow throughout; a false morel is chambered and contains a rocket-fuel relative.' },
    { tier: 'DEADLY', safe: ['Wild carrot', 'Daucus carota'], danger: ['Water / poison hemlock', 'Cicuta · Conium'], tell: 'The carrot family’s deadly members share the same lacy leaves and umbels — the most lethal foraging confusion on the continent.' },
    { tier: 'DEADLY', safe: ['Wild onion', 'Allium'], danger: ['Death camas', 'Toxicoscordion'], tell: 'A true Allium always smells of onion; death camas does not — but scent is not a life-and-death test.' },
    { tier: 'DEADLY', safe: ['Comfrey', 'Symphytum'], danger: ['Foxglove', 'Digitalis'], tell: 'Before flowering, foxglove’s leaf rosette closely resembles comfrey — and foxglove can stop your heart.' },
    { tier: 'DEADLY', safe: ['Milk / king snake', 'Lampropeltis'], danger: ['Coral snake', 'Micrurus'], tell: 'The color rhyme fails outside the US. Never handle any snake from an ID.' },
    { tier: 'MILD', safe: ['Chanterelle', 'Cantharellus'], danger: ["Jack-o'-lantern", 'Omphalotus'], tell: 'True chanterelles have blunt forking ridges; the toxic mimic has true, sharp gills and grows on wood.' },
    { tier: 'CONTACT', safe: ['Cow parsnip', 'Heracleum maximum'], danger: ['Giant hogweed', 'Heracleum mantegazzianum'], tell: 'Younger hogweed resembles harmless cow parsnip; its sap burns and blisters in sunlight.' },
    { tier: 'INFO', safe: ['Monarch', 'Danaus plexippus'], danger: ['Viceroy', 'Limenitis archippus'], tell: 'A mimicry pair from different genera — look for the viceroy’s extra hindwing line. (No hazard — a teaching case.)' }
  ];

  // Rich text uses a deliberately tiny markup: <b>, <i>, and nesting of the two.
  // Anything else is literal text, so no HTML ever reaches the DOM.
  var EXPLAIN = [
    {
      title: 'Ranks are conventions, not facts',
      blocks: [
        { kind: 'p', text: 'Kingdom, phylum, class, order, family, genus, species — the ladder feels absolute, but the rungs are human agreements about where to draw lines on a continuously branching tree. Different authorities draw them differently.' },
        { kind: 'callout', text: 'Real example from this very tool: <b>GBIF ranks Squamata (snakes and lizards) as a <i>class</i></b>, leaving the "order" field empty. Other systems call Squamata an order, and place snakes in the suborder Serpentes. Our snake-safety rule was silently dead until we re-keyed it to <i>class</i> — because a rank is a label, and labels disagree.' },
        { kind: 'p', text: 'The number of ranks is not fixed either: biologists sprinkle in super-, sub-, and infra- ranks whenever the seven are not enough.' }
      ]
    },
    {
      title: 'Three ways to draw the same tree',
      blocks: [
        { kind: 'p', text: '<b>Linnaean ranks</b> (1735) sort life into nested boxes. <b>Cladistics</b> ignores rank and groups strictly by shared ancestry — every group must contain an ancestor and <i>all</i> its descendants. By that rule, "reptiles" is not a real group unless you include birds, and "fish" is not one unless you include us.' },
        { kind: 'p', text: '<b>The three-domain system</b> (Bacteria, Archaea, Eukarya) reorganised the top of the tree in 1990 around molecular data, demoting the old "five kingdoms." GBIF’s backbone — what the ID engine resolves against — is yet another synthesis, stitched from many sources.' },
        { kind: 'callout', text: 'None of these is "wrong." They answer different questions: how do we file it, versus how is it related?' }
      ]
    },
    {
      title: 'What even is a species?',
      blocks: [
        { kind: 'p', text: 'The word does a lot of quiet work. The <b>biological</b> species concept says a species is a group that interbreeds — but that fails for anything asexual, for fossils, and for organisms that hybridise. The <b>morphological</b> concept sorts by appearance — but <b>cryptic species</b> look identical yet cannot interbreed, and a single species can look wildly different by age, sex, or season.' },
        { kind: 'p', text: '<b>Ring species</b> break it outright: neighbouring populations around a ring all interbreed, except where the two ends meet — so they are one species and two at the same time.' },
        { kind: 'callout', text: 'This is exactly why a photo ID has honest limits: many organisms simply cannot be told apart by eye, which is why the engine shows a <i>range</i> of candidates and narrows confidence down the ladder rather than faking a single answer.' }
      ]
    },
    {
      title: 'The organisms that break the boxes',
      blocks: [
        { kind: 'p', text: '<b>Fungi</b> were classified as plants until about 1969; they are closer to animals. <b>Lichens</b> are not one organism at all — a fungus and an alga (or cyanobacterium) living as one. <b>Viruses</b> may not even be "alive," and sit awkwardly outside the tree. Bacteria swap genes sideways by <b>horizontal gene transfer</b>, so their "tree" is really a web.' },
        { kind: 'p', text: 'And charismatic misfits abound: the <b>platypus</b> (a mammal that lays eggs), the <b>red panda</b> (reshuffled among bears, raccoons, and finally its own family), <b>whales</b> (hoofed mammals nested inside the group that includes hippos).' }
      ]
    },
    {
      title: 'When lookalikes are not relatives',
      blocks: [
        { kind: 'p', text: '<b>Convergent evolution</b> makes unrelated organisms resemble each other because the same problem has the same good solutions. <b>Mimicry</b> takes it further: harmless species evolve to copy dangerous ones, or two defended species converge on one warning look.' },
        { kind: 'callout', text: 'This is the whole reason organism identification leads with safety. A resemblance can jump across huge evolutionary distances — so "it looks like the edible one" is never enough. The monarch and viceroy make the lesson friendly; the edible mushroom and its deadly twin make it deadly serious.' },
        { kind: 'p', text: 'So classification is not trivia. Knowing <i>how confidently</i> we can place an organism — and where the tree is genuinely uncertain — is the difference between a snack and a poisoning.' }
      ]
    }
  ];

  var TIER_ORDER = ['DEADLY', 'CONTACT', 'MILD', 'INFO', 'SAFE'];
  var TIER_LABEL = {
    DEADLY: 'Can kill',
    CONTACT: 'Harmful to touch',
    MILD: 'Makes you ill',
    INFO: 'Teaching case',
    SAFE: 'No hazard rule'
  };
  var TIER_BLURB = {
    DEADLY: 'A confusion here has killed people. The tree is not a permission slip.',
    CONTACT: 'Touching or brushing against it causes injury — no eating required.',
    MILD: 'Not lethal, but a genuinely bad day.',
    INFO: 'No hazard at all. Here to teach how resemblance works.',
    SAFE: 'No hazard rule attached — which is not the same as "safe to eat."'
  };
  var RANK_LABEL = {
    domain: 'Domain', kingdom: 'Kingdom', phylum: 'Phylum', class: 'Class',
    order: 'Order', family: 'Family', genus: 'Genus', species: 'Species'
  };
  var RANK_LADDER = ['kingdom', 'phylum', 'class', 'order', 'family', 'genus', 'species'];

  var SAFETY_BANNER = 'Never eat, taste, or handle a wild organism based on this app. When in doubt, ask a human expert.';

  // ── Derived indexes (built once) ──────────────────────────────────────────
  var NODE_BY_NAME = Object.create(null);
  var PARENT_OF = Object.create(null);
  var ALL_NODES = [];

  (function indexTree(node, parent) {
    NODE_BY_NAME[node.name] = node;
    PARENT_OF[node.name] = parent ? parent.name : null;
    ALL_NODES.push(node);
    var kids = node.kids || [];
    for (var i = 0; i < kids.length; i++) indexTree(kids[i], node);
  })(TREE, null);

  function lineageOf(name) {
    var chain = [];
    var cursor = name;
    while (cursor && NODE_BY_NAME[cursor]) {
      chain.unshift(NODE_BY_NAME[cursor]);
      cursor = PARENT_OF[cursor];
    }
    return chain;
  }

  function tieredNodes(tier) {
    return ALL_NODES.filter(function (node) { return node.tier === tier; });
  }

  function groupMembers(groupKey, excludeName) {
    return ALL_NODES.filter(function (node) {
      return node.group === groupKey && node.name !== excludeName;
    });
  }

  // ── Tree traversal for the roving-tabindex tree ───────────────────────────
  // The flattened list of node names a sighted user can currently SEE, in
  // document order, honouring the collapsed map. ArrowUp/ArrowDown walk this
  // list, which is what makes the keyboard order and the visual order the same
  // thing rather than two things that happen to agree.
  function visibleTreeNames(collapsedMap) {
    collapsedMap = collapsedMap || {};
    var out = [];
    (function walk(node) {
      out.push(node.name);
      if (collapsedMap[node.name]) return;
      var kids = node.kids || [];
      for (var i = 0; i < kids.length; i++) walk(kids[i]);
    })(TREE);
    return out;
  }

  function treeDomId(name) {
    return 'oid-node-' + String(name).replace(/[^A-Za-z0-9]+/g, '-');
  }

  // ── Tiny rich-text parser: <b> and <i> only, nesting allowed ──────────────
  function richText(h, text, keyPrefix) {
    var out = [];
    var cursor = 0;
    var counter = 0;
    var pattern = /<(b|i)>([\s\S]*?)<\/\1>/g;
    var match;
    while ((match = pattern.exec(text)) !== null) {
      if (match.index > cursor) out.push(text.slice(cursor, match.index));
      var tag = match[1] === 'b' ? 'strong' : 'em';
      out.push(h(tag, { key: keyPrefix + '-' + (counter++) }, richText(h, match[2], keyPrefix + '-' + counter)));
      cursor = match.index + match[0].length;
    }
    if (cursor < text.length) out.push(text.slice(cursor));
    return out;
  }


  // A closed teaching key. The outputs group the six examples; they are not species identification.
  var OBSERVATION_EXAMPLES = [
    {id:'field',name:'My own field observation',evidence:'Observe from a distance and describe visible features. This entry is a field note, with no identification from the teaching key.',group:'Unclassified field observation'},
    {id:'bird',name:'Feathered visitor',evidence:'Feathers cover the body. Two wings and two legs are visible.',group:'Bird example'},
    {id:'insect',name:'Six-legged visitor',evidence:'Six jointed legs and two antennae are visible. The body has a head, thorax, and abdomen.',group:'Insect example'},
    {id:'arachnid',name:'Eight-legged visitor',evidence:'Eight jointed legs are visible. No antennae are visible.',group:'Arachnid example'},
    {id:'fern',name:'Frond-bearing plant',evidence:'Green fronds unfold from curled young growth. Small spore-bearing patches appear beneath a mature frond.',group:'Fern example'},
    {id:'fungus',name:'Cap-and-stalk growth',evidence:'A cap and stalk are visible. There are no green leaves. This lesson card describes a fungal fruiting body.',group:'Mushroom example'},
    {id:'moss',name:'Low green cushion',evidence:'Tiny leafy shoots form a cushion. Slender stalks with capsules rise above it. This lesson card describes moss.',group:'Moss example'}
  ];
  var OBSERVATION_KEY = {
    feathers:{question:'Are feathers described?',yes:'Bird example',no:'legs'},
    legs:{question:'Are jointed legs described?',yes:'six',no:'fronds'},
    six:{question:'Are six legs described?',yes:'Insect example',no:'eight'},
    eight:{question:'Are eight legs described?',yes:'Arachnid example',no:'Unresolved'},
    fronds:{question:'Are fronds and spore-bearing patches described?',yes:'Fern example',no:'cap'},
    cap:{question:'Is a cap-and-stalk fungal fruiting body described?',yes:'Mushroom example',no:'capsules'},
    capsules:{question:'Are leafy cushions and stalked capsules described?',yes:'Moss example',no:'Unresolved'}
  };
  function observationRoute(answers) {
    var key='feathers',path=[],input=Array.isArray(answers)?answers:[];
    for(var i=0;i<input.length && OBSERVATION_KEY[key] && i<7;i++){
      var choice=input[i];if(choice!=='yes'&&choice!=='no'&&choice!=='unsure')break;
      path.push({question:OBSERVATION_KEY[key].question,answer:choice});
      if(choice==='unsure')return {path:path,result:'Unresolved',question:null};
      key=OBSERVATION_KEY[key][choice];
    }
    return {path:path,result:OBSERVATION_KEY[key]?null:key,question:OBSERVATION_KEY[key]?OBSERVATION_KEY[key].question:null};
  }

  function observationExampleId(row) {
    var examples=OBSERVATION_EXAMPLES;
    if(examples.some(function(e){return e.id===row.exampleId;}))return row.exampleId;
    // A field note may have the same title as a lesson card. Its claim takes precedence over a title.
    if(row.claim==='Unclassified field observation')return 'field';
    var match=examples.find(function(e){return e.id!=='field'&&e.name===row.subject;});
    return match?match.id:'field';
  }
  function observationEvidenceReview(exampleId, answers) {
    var expected={bird:['yes'],insect:['no','yes','yes'],arachnid:['no','yes','no','yes'],fern:['no','no','yes'],fungus:['no','no','no','yes'],moss:['no','no','no','no','yes']};
    if(!Object.prototype.hasOwnProperty.call(expected,exampleId))return {status:'field',detail:'Field notes are not checked against the teaching key. Record what you can observe and what evidence you still need.'};
    var route=observationRoute(answers),target=expected[exampleId];
    for(var i=0;i<route.path.length;i++){
      if(route.path[i].answer==='unsure')return {status:'uncertain',decision:i,detail:'You marked decision '+(i+1)+' as uncertain. Reread the example and record which feature would resolve this question.'};
      if(route.path[i].answer!==target[i])return {status:'revisit',decision:i,detail:'Revisit decision '+(i+1)+': '+route.path[i].question+' Compare your answer with the description. This checks what the card describes, not whether an unmentioned feature is absent in nature.'};
    }
    if(!route.result)return {status:'incomplete',detail:'The decisions so far match the example. Continue the key or record what is uncertain.'};
    return {status:'supported',detail:'Your key decisions match the teaching example. Cite the observable feature that supports your group claim; the key does not establish a species identification.'};
  }

  function observationJournal(value) {
    return (Array.isArray(value)?value:[]).filter(function(r){return r&&typeof r==='object'&&typeof r.note==='string';}).slice(-60).map(function(r){
      return {exampleId:observationExampleId(r),nextEvidence:String(r.nextEvidence||'').slice(0,700),context:String(r.context||'').slice(0,300),reviewed:r.reviewed===true,id:String(r.id||'').slice(0,100),previousId:String(r.previousId||'').slice(0,100),date:String(r.date||'').slice(0,40),subject:String(r.subject||'Observation').slice(0,100),note:r.note.slice(0,2000),reason:String(r.reason||'').slice(0,500),claim:String(r.claim||'Unresolved').slice(0,100),path:(Array.isArray(r.path)?r.path:[]).filter(function(step){return step&&typeof step==='object';}).slice(0,7).map(function(step){return {question:String(step.question||'').slice(0,150),answer:String(step.answer||'').slice(0,10)};})};
    });
  }
  function compareObservations(before, after) {
    var pair=observationJournal([before,after]);
    if(pair.length!==2)return [];
    var a=pair[0],b=pair[1],changes=[];
    function add(label,oldValue,newValue){if(oldValue!==newValue)changes.push({label:label,before:oldValue||'Not recorded.',after:newValue||'Not recorded.'});}
    [['subject','Title'],['note','Observation'],['claim','Tentative group'],['context','Context'],['nextEvidence','Next evidence']].forEach(function(field){add(field[1],a[field[0]],b[field[0]]);});
    var questions=Array.from(new Set(a.path.concat(b.path).map(function(step){return step.question;})));
    function answer(row,question){var step=row.path.find(function(item){return item.question===question;});return !step?'Not asked':step.answer==='unsure'?'Not sure':step.answer==='yes'?'Yes':step.answer==='no'?'No':step.answer;}
    questions.forEach(function(question){add('Key decision: '+question,answer(a,question),answer(b,question));});
    function review(row){return row.reviewed?observationEvidenceReview(row.exampleId,row.path.map(function(step){return step.answer;})).detail:'Not requested.';}
    add('Evidence review',review(a),review(b));
    return changes;
  }
  function observationMarkdown(rows) {
    var journal=observationJournal(rows);
    return ['# Taxonomy observation journal','Teaching-key groups are not field identifications.',''].concat(journal.map(function(r){
      var previous=journal.find(function(row){return row.id===r.previousId;}),changes=previous?compareObservations(previous,r):[];
      var comparison=r.previousId?'\n\nRevision comparison:\n'+(previous?(changes.length?changes.map(function(change){return '- '+change.label+': '+change.before+' → '+change.after;}).join('\n'):'No recorded evidence fields or key decisions changed.'):'The earlier entry is not available in this journal.'):'';
      return '## '+r.subject+'\n'+r.date+'\n\nEntry ID: '+r.id+'\n\nObservation: '+r.note+'\n\nTentative teaching group: '+r.claim+'\n\nObservation context: '+(r.context||'Not recorded.')+'\n\nNext evidence to seek: '+(r.nextEvidence||'Not recorded.')+'\n\nEvidence review: '+(r.reviewed?observationEvidenceReview(r.exampleId,r.path.map(function(step){return step.answer;})).detail:'Not requested.')+'\n\nKey evidence:\n'+r.path.map(function(step){return '- '+step.question+' '+step.answer;}).join('\n')+(r.previousId?'\n\nRevision of '+r.previousId+'. What changed: '+r.reason:'')+comparison;
    })).join('\n\n');
  }

  // ── The tool ──────────────────────────────────────────────────────────────
  var VIEWS = [
    ['tree', '🌳', 'Tree Explorer'],
    ['groups', '🔴', 'Hazard Tiers'],
    ['lookalikes', '👥', 'Lookalikes'],
    ['learn', '📖', 'Taxonomy 101'],
    ['observe', '🔎', 'Observe & Record'],
    ['photo', '📷', 'Photo ID']
  ];

  function renderOrganismId(ctx) {
    var React = ctx.React || window.React;
    if (!React || !React.createElement) return null;
    var h = React.createElement;
    var __alloT = (typeof ctx.t === 'function') ? ctx.t : function (key, fallback) { return fallback; };

    var d = (ctx.toolData && ctx.toolData.organismId) || {};
    var viewIds = VIEWS.map(function (v) { return v[0]; });
    var activeView = viewIds.indexOf(d.activeView) !== -1 ? d.activeView : 'tree';
    if (activeView === 'photo' && !PHOTO_ID_ENABLED && d.activeView !== 'photo') activeView = 'tree';
    var selectedName = NODE_BY_NAME[d.selected] ? d.selected : 'Amanita';
    var collapsed = d.collapsed || {};
    var openSection = typeof d.openSection === 'number' ? d.openSection : 0;

    var dark = !!ctx.isDark;
    var contrast = !!ctx.isContrast;
    var C = contrast ? {
      bg: '#000000', panel: '#000000', raised: '#111111', text: '#ffffff', muted: '#f8fafc',
      border: '#facc15', controlBorder: '#facc15', accent: '#facc15', accentText: '#000000', focus: '#ffffff',
      DEADLY: '#fca5a5', CONTACT: '#fdba74', MILD: '#fde047', INFO: '#93c5fd', SAFE: '#86efac'
    } : dark ? {
      bg: '#0f130e', panel: '#161b14', raised: '#1c2218', text: '#e6eadf', muted: '#aeb6a6',
      border: '#3b4530', controlBorder: '#829077', accent: '#66bb9d', accentText: '#0f130e', focus: '#fbbf24',
      DEADLY: '#ec6155', CONTACT: '#e68a41', MILD: '#deb04a', INFO: '#78abcd', SAFE: '#66bb9d'
    } : {
      bg: '#f4f7f1', panel: '#ffffff', raised: '#eef2e9', text: '#16201a', muted: '#48544a',
      border: '#bfc8b5', controlBorder: '#65745f', accent: '#2f6b57', accentText: '#ffffff', focus: '#2f6b57',
      DEADLY: '#9f1f1a', CONTACT: '#9c4d10', MILD: '#755607', INFO: '#2f5872', SAFE: '#2f6b57'
    };

    function tierColor(tier) { return C[tier] || C.muted; }

    injectOrganismStyles();

    function patchState(patch, announcement) {
      if (typeof ctx.setToolData === 'function') {
        ctx.setToolData(function (prev) {
          var root = prev || {};
          var current = Object.assign({}, root.organismId || {});
          var nextPatch = typeof patch === 'function' ? patch(current) : patch;
          return Object.assign({}, root, { organismId: Object.assign(current, nextPatch || {}) });
        });
      }
      if (announcement && typeof ctx.announceToSR === 'function') ctx.announceToSR(announcement);
    }

    function focusObservation(id) {
      var focus = function () {
        var target = document.getElementById(id);
        if (target && typeof target.focus === 'function') target.focus();
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(focus);
      else window.setTimeout(focus, 0);
    }

    function selectView(view) {
      // Announce the human label, not the internal id -- 'Hazard Tiers view
      // selected', not 'groups view selected'.
      var meta = null;
      for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i][0] === view) meta = VIEWS[i];
      patchState({ activeView: view }, (meta ? meta[2] : view) + ' view selected');
    }

    function handleTabKeyDown(event, index) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || (event.nativeEvent && event.nativeEvent.isComposing)) return;
      var nextIndex = index;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % VIEWS.length;
      else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + VIEWS.length) % VIEWS.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = VIEWS.length - 1;
      else return;
      event.preventDefault();
      var nextView = VIEWS[nextIndex][0];
      selectView(nextView);
      if (typeof document !== 'undefined' && window.setTimeout) {
        window.setTimeout(function () {
          var tab = document.getElementById('oid-tab-' + nextView);
          if (tab && typeof tab.focus === 'function') tab.focus();
        }, 0);
      }
    }

    function selectNode(name) {
      var node = NODE_BY_NAME[name];
      if (!node) return;
      patchState(function (current) {
        var seen = Object.assign({}, current.seen || {});
        seen[name] = true;
        return { selected: name, seen: seen };
      }, node.name + ', ' + (RANK_LABEL[node.rank] || node.rank) + ' selected');
    }

    function toggleCollapsed(name) {
      patchState(function (current) {
        var next = Object.assign({}, current.collapsed || {});
        if (next[name]) delete next[name]; else next[name] = true;
        return { collapsed: next };
      });
    }

    function showSelectedBranch() {
      patchState(function (current) {
        var next = Object.assign({}, current.collapsed || {});
        var ancestor = PARENT_OF[selectedName];
        while (ancestor) {
          delete next[ancestor];
          ancestor = PARENT_OF[ancestor];
        }
        return { collapsed: next, treeFocus: selectedName };
      });
      focusObservation(treeDomId(selectedName));
    }

    // ── Tree view ───────────────────────────────────────────────────────────
    // ── WAI-ARIA tree (roving tabindex) ─────────────────────────────────────
    // This used to be a flat list of buttons: 2 tab stops per visible row, ~90
    // stops from top to bottom, and no arrow keys. Now the whole tree is ONE tab
    // stop. Arrows move focus (without selecting), ArrowRight expands or enters,
    // ArrowLeft collapses or exits to the parent, Home/End jump, and Enter/Space
    // select via the button's native click. Focus and selection are deliberately
    // separate so a student can scan the tree without churning the detail panel.
    var treeVisible = visibleTreeNames(collapsed);
    var treeFocusName = (function () {
      if (d.treeFocus && treeVisible.indexOf(d.treeFocus) !== -1) return d.treeFocus;
      if (treeVisible.indexOf(selectedName) !== -1) return selectedName;
      return treeVisible[0];
    })();

    function moveTreeFocus(nextName) {
      if (!nextName || nextName === treeFocusName) return;
      patchState({ treeFocus: nextName });
      if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.setTimeout) {
        window.setTimeout(function () {
          var el = document.getElementById(treeDomId(nextName));
          if (el && typeof el.focus === 'function') el.focus();
        }, 0);
      }
    }

    function handleTreeKeyDown(event, node) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || (event.nativeEvent && event.nativeEvent.isComposing)) return;
      var visible = visibleTreeNames(collapsed);
      var index = visible.indexOf(node.name);
      var hasKids = !!(node.kids && node.kids.length);
      var isCollapsed = !!collapsed[node.name];
      var key = event.key;
      if (key === 'ArrowDown') {
        if (index < visible.length - 1) moveTreeFocus(visible[index + 1]);
      } else if (key === 'ArrowUp') {
        if (index > 0) moveTreeFocus(visible[index - 1]);
      } else if (key === 'ArrowRight') {
        if (hasKids && isCollapsed) toggleCollapsed(node.name);
        else if (hasKids) moveTreeFocus(node.kids[0].name);
        else return;
      } else if (key === 'ArrowLeft') {
        if (hasKids && !isCollapsed) toggleCollapsed(node.name);
        else if (PARENT_OF[node.name]) moveTreeFocus(PARENT_OF[node.name]);
        else return;
      } else if (key === 'Home') {
        moveTreeFocus(visible[0]);
      } else if (key === 'End') {
        moveTreeFocus(visible[visible.length - 1]);
      } else {
        return; // Enter/Space fall through to the button's native click = select
      }
      event.preventDefault();
    }

    function renderTreeNode(node, depth, position, count) {
      var kids = node.kids || [];
      var hasKids = kids.length > 0;
      var isCollapsed = !!collapsed[node.name];
      var isSelected = node.name === selectedName;
      var isFocusable = node.name === treeFocusName;
      var color = node.tier ? tierColor(node.tier) : null;
      var nodeId = treeDomId(node.name);

      return h('li', { key: node.name, className: 'oid-tree-item', role: 'none' },
        h('div', { className: 'oid-node-row' },
          // This decorative pointer target shares the treeitem's keyboard action.
          // It must never receive focus while hidden from the accessibility tree.
          hasKids ? h('span', {
            className: 'oid-caret',
            'aria-hidden': 'true',
            onClick: function () {
              toggleCollapsed(node.name);
              patchState({ treeFocus: node.name });
              focusObservation(nodeId);
            },
            style: { color: C.muted, borderColor: 'transparent' }
          }, isCollapsed ? '▸' : '▾') : h('span', { className: 'oid-caret oid-caret-empty', 'aria-hidden': 'true' }),
          h('button', {
            type: 'button',
            id: nodeId,
            role: 'treeitem',
            'aria-level': depth + 1,
            'aria-posinset': position,
            'aria-setsize': count,
            'aria-labelledby': nodeId + '-name ' + nodeId + '-rank' + (node.tier ? ' ' + nodeId + '-hazard' : ''),
            // The native button owns its sibling group without including child names in its label.
            'aria-owns': hasKids && !isCollapsed ? nodeId + '-children' : undefined,
            'aria-expanded': hasKids ? !isCollapsed : undefined,
            'aria-selected': isSelected ? 'true' : 'false',
            tabIndex: isFocusable ? 0 : -1,
            className: 'oid-node' + (isSelected ? ' is-selected' : ''),
            'aria-current': isSelected ? 'true' : undefined,
            onClick: function () { selectNode(node.name); if (node.name !== treeFocusName) patchState({ treeFocus: node.name }); },
            onKeyDown: function (event) { handleTreeKeyDown(event, node); },
            style: {
              color: C.text,
              borderColor: isSelected ? C.accent : 'transparent',
              background: isSelected ? C.raised : 'transparent'
            }
          },
            node.tier
              ? h('span', { className: 'oid-tier-dot', style: { background: color }, 'aria-hidden': 'true' })
              : h('span', { className: 'oid-tier-dot oid-tier-dot-empty', 'aria-hidden': 'true' }),
            h('span', { id: nodeId + '-name', className: 'oid-node-name' + (node.rank === 'genus' ? ' is-latin' : '') }, node.name),
            h('span', { id: nodeId + '-rank', className: 'oid-node-rank', style: { color: C.muted } }, RANK_LABEL[node.rank] || node.rank),
            node.tier ? h('span', { id: nodeId + '-hazard', className: 'sr-only' }, ', hazard tier: ' + TIER_LABEL[node.tier]) : null
          )
        ),
        hasKids && !isCollapsed ? h('ul', { id: nodeId + '-children', className: 'oid-tree-children', role: 'group', style: { borderColor: C.border } },
          kids.map(function (kid, index) { return renderTreeNode(kid, depth + 1, index + 1, kids.length); })
        ) : null
      );
    }

    function renderSpecimenPlate(node) {
      if (!node) return null;
      var col = node.tier ? tierColor(node.tier) : C.accent;
      var n = node.name;
      var chainNames = lineageOf(n).map(function (x) { return x.name; });
      var isFungi = chainNames.indexOf('Fungi') !== -1;
      var isPlant = chainNames.indexOf('Plantae') !== -1;
      var bg = C.raised;
      var stroke = C.text;
      var muted = C.muted;
      var acc = C.accent;

      var inner;
      var caption = 'Morphology & diagnostic trait plate';

      if (n === 'Amanita' || n === 'Amanitaceae') {
        caption = 'Volva cup at base + white gills + ring';
        inner = [
          // Cap
          h('path', { key: 'cap', d: 'M82 62 C82 28 198 28 198 62 Z', fill: col, fillOpacity: 0.22, stroke: col, strokeWidth: 2 }),
          // White gills
          h('path', { key: 'gills', d: 'M86 62 L194 62', stroke: stroke, strokeWidth: 1.5, strokeDasharray: '4 3' }),
          // Stalk
          h('rect', { key: 'stalk', x: 130, y: 62, width: 20, height: 52, rx: 4, fill: bg, stroke: stroke, strokeWidth: 1.8 }),
          // Annulus ring
          h('path', { key: 'ring', d: 'M122 80 Q140 89 158 80', fill: 'none', stroke: col, strokeWidth: 2.2 }),
          // Volva cup at base
          h('path', { key: 'volva', d: 'M118 102 C116 122 126 128 140 128 C154 128 164 122 162 102 L152 108 L140 103 L128 108 Z', fill: col, fillOpacity: 0.3, stroke: col, strokeWidth: 2 }),
          // Callout lines & labels (well inside 280x144)
          h('line', { key: 'l1', x1: 186, y1: 58, x2: 212, y2: 46, stroke: muted, strokeWidth: 1 }),
          h('text', { key: 't1', x: 215, y: 49, fill: stroke, fontSize: 9, fontWeight: '700' }, 'White gills'),
          h('line', { key: 'l2', x1: 158, y1: 81, x2: 212, y2: 78, stroke: muted, strokeWidth: 1 }),
          h('text', { key: 't2', x: 215, y: 81, fill: stroke, fontSize: 9, fontWeight: '700' }, 'Ring skirt'),
          h('line', { key: 'l3', x1: 162, y1: 114, x2: 212, y2: 114, stroke: col, strokeWidth: 1.3 }),
          h('text', { key: 't3', x: 215, y: 117, fill: col, fontSize: 9.5, fontWeight: '800' }, 'Volva cup')
        ];
      } else if (n === 'Agaricus' || n === 'Agaricaceae') {
        caption = 'Chocolate-brown gills, clean base (no volva)';
        inner = [
          h('path', { key: 'cap', d: 'M86 66 C86 30 194 30 194 66 Z', fill: acc, fillOpacity: 0.2, stroke: stroke, strokeWidth: 2 }),
          h('path', { key: 'gills', d: 'M90 66 Q140 74 190 66', fill: '#7c4a2d', fillOpacity: 0.5, stroke: stroke, strokeWidth: 1.5 }),
          h('rect', { key: 'stalk', x: 130, y: 66, width: 20, height: 54, rx: 5, fill: bg, stroke: stroke, strokeWidth: 1.8 }),
          h('line', { key: 'gnd', x1: 102, y1: 120, x2: 178, y2: 120, stroke: muted, strokeWidth: 1.2, strokeDasharray: '4 3' }),
          h('line', { key: 'l1', x1: 184, y1: 68, x2: 206, y2: 56, stroke: muted, strokeWidth: 1 }),
          h('text', { key: 't1', x: 208, y: 59, fill: stroke, fontSize: 9, fontWeight: '700' }, 'Brown gills'),
          h('line', { key: 'l2', x1: 152, y1: 112, x2: 206, y2: 108, stroke: acc, strokeWidth: 1.2 }),
          h('text', { key: 't2', x: 208, y: 111, fill: acc, fontSize: 9, fontWeight: '800' }, 'No volva')
        ];
      } else if (n === 'Lycoperdon') {
        caption = 'Cut-open check: uniform interior vs hidden cap';
        inner = [
          h('circle', { key: 'a', cx: 88, cy: 74, r: 34, fill: acc, fillOpacity: 0.16, stroke: acc, strokeWidth: 2 }),
          h('text', { key: 'at', x: 88, y: 77, textAnchor: 'middle', fill: stroke, fontSize: 9, fontWeight: '700' }, 'Uniform'),
          h('text', { key: 'al', x: 88, y: 124, textAnchor: 'middle', fill: acc, fontSize: 9, fontWeight: '800' }, 'Puffball'),
          h('circle', { key: 'b', cx: 192, cy: 74, r: 34, fill: C.DEADLY, fillOpacity: 0.12, stroke: C.DEADLY, strokeWidth: 2, strokeDasharray: '4 3' }),
          h('path', { key: 'bcap', d: 'M172 72 C172 52 212 52 212 72 Z', fill: C.DEADLY, fillOpacity: 0.3, stroke: C.DEADLY, strokeWidth: 1.5 }),
          h('rect', { key: 'bst', x: 186, y: 72, width: 12, height: 24, rx: 3, fill: bg, stroke: C.DEADLY, strokeWidth: 1.5 }),
          h('text', { key: 'bl', x: 192, y: 124, textAnchor: 'middle', fill: C.DEADLY, fontSize: 9, fontWeight: '800' }, 'Amanita egg')
        ];
      } else if (n === 'Morchella' || n === 'Gyromitra' || n === 'Ascomycota') {
        caption = 'Cross-section: hollow morel vs chambered brain cap';
        inner = [
          h('path', { key: 'm1', d: 'M72 98 L72 64 C72 32 108 32 108 64 L108 98 Z', fill: acc, fillOpacity: 0.15, stroke: acc, strokeWidth: 2 }),
          h('path', { key: 'm1i', d: 'M82 94 L82 64 C82 46 98 46 98 64 L98 94 Z', fill: bg, stroke: acc, strokeWidth: 1.3, strokeDasharray: '3 2' }),
          h('text', { key: 'mt', x: 90, y: 118, textAnchor: 'middle', fill: acc, fontSize: 9, fontWeight: '800' }, 'Hollow (Morchella)'),
          h('path', { key: 'g1', d: 'M162 66 C158 34 218 32 214 66 C214 78 202 80 198 98 L178 98 C174 80 162 78 162 66 Z', fill: C.DEADLY, fillOpacity: 0.18, stroke: C.DEADLY, strokeWidth: 2 }),
          h('path', { key: 'g1i', d: 'M172 56 Q188 46 204 56 M174 68 Q188 76 202 68', fill: 'none', stroke: C.DEADLY, strokeWidth: 1.6 }),
          h('text', { key: 'gt', x: 188, y: 118, textAnchor: 'middle', fill: C.DEADLY, fontSize: 9, fontWeight: '800' }, 'Chambered (Gyromitra)')
        ];
      } else if (n === 'Danaus' || n === 'Limenitis' || n === 'Nymphalidae' || n === 'Lepidoptera') {
        caption = 'Mimicry tell: Viceroy carries an extra black hindwing line';
        var showLine = n !== 'Danaus';
        inner = [
          // Left & right forewings
          h('path', { key: 'fw1', d: 'M136 68 C108 30 56 30 62 66 C66 84 102 82 136 74 Z', fill: '#f97316', fillOpacity: 0.45, stroke: stroke, strokeWidth: 2 }),
          h('path', { key: 'fw2', d: 'M144 68 C172 30 224 30 218 66 C214 84 178 82 144 74 Z', fill: '#f97316', fillOpacity: 0.45, stroke: stroke, strokeWidth: 2 }),
          // Left & right hindwings
          h('path', { key: 'hw1', d: 'M136 76 C106 78 74 96 86 116 C98 128 128 112 136 86 Z', fill: '#fb923c', fillOpacity: 0.45, stroke: stroke, strokeWidth: 2 }),
          h('path', { key: 'hw2', d: 'M144 76 C174 78 206 96 194 116 C182 128 152 112 144 86 Z', fill: '#fb923c', fillOpacity: 0.45, stroke: stroke, strokeWidth: 2 }),
          // Body + antennae
          h('rect', { key: 'bd', x: 136, y: 56, width: 8, height: 42, rx: 4, fill: stroke }),
          h('path', { key: 'ant', d: 'M138 56 Q128 40 120 38 M142 56 Q152 40 160 38', fill: 'none', stroke: stroke, strokeWidth: 1.5 }),
          // Viceroy postmedian line
          showLine ? h('path', { key: 'vl1', d: 'M92 94 Q112 104 126 98', fill: 'none', stroke: stroke, strokeWidth: 2.6 }) : null,
          showLine ? h('path', { key: 'vl2', d: 'M188 94 Q168 104 154 98', fill: 'none', stroke: stroke, strokeWidth: 2.6 }) : null,
          h('text', { key: 'lbl', x: 140, y: 135, textAnchor: 'middle', fill: col, fontSize: 9, fontWeight: '800' },
            n === 'Danaus' ? 'Monarch: veins radiate without cross-bar' : 'Viceroy: extra black line crosses hindwing')
        ];
      } else if (n === 'Latrodectus' || n === 'Loxosceles' || n === 'Arachnida') {
        caption = 'Arachnid morphology: 8 jointed legs, 2 body segments, no antennae';
        inner = [
          h('circle', { key: 'ceph', cx: 124, cy: 70, r: 13, fill: col, fillOpacity: 0.25, stroke: stroke, strokeWidth: 2 }),
          h('ellipse', { key: 'abd', cx: 158, cy: 70, rx: 22, ry: 17, fill: col, fillOpacity: 0.35, stroke: col, strokeWidth: 2 }),
          h('path', { key: 'hg', d: 'M152 64 L164 64 L158 70 L164 76 L152 76 L158 70 Z', fill: col }),
          // 8 jointed legs
          h('path', { key: 'legs', d: 'M118 60 L92 36 L68 48 M120 65 L86 56 L62 72 M120 75 L86 84 L62 98 M118 80 L94 106 L72 114 M130 60 L146 34 L172 30 M132 64 L158 44 L192 44 M132 76 L158 96 L192 96 M130 80 L146 106 L172 110', fill: 'none', stroke: stroke, strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }),
          h('text', { key: 't1', x: 140, y: 133, textAnchor: 'middle', fill: stroke, fontSize: 9, fontWeight: '700' }, '8 jointed legs · 2 segments · 0 antennae')
        ];
      } else if (n === 'Squamata' || n === 'Elapidae' || n === 'Viperidae' || n === 'Micrurus' || n === 'Crotalus') {
        caption = 'Banded warning pattern — color rhymes fail across regions';
        inner = [
          h('path', { key: 's1', d: 'M42 96 C66 42 112 42 138 78 C164 114 206 112 232 62', fill: 'none', stroke: stroke, strokeWidth: 16, strokeLinecap: 'round' }),
          h('path', { key: 's2', d: 'M42 96 C66 42 112 42 138 78 C164 114 206 112 232 62', fill: 'none', stroke: col, strokeWidth: 11, strokeLinecap: 'round', strokeDasharray: '14 14' }),
          h('circle', { key: 'eye', cx: 234, cy: 59, r: 2.5, fill: bg }),
          h('text', { key: 't1', x: 140, y: 128, textAnchor: 'middle', fill: col, fontSize: 9, fontWeight: '800' }, 'GBIF ranks Squamata as Class · Never handle wild snakes')
        ];
      } else if (n === 'Hapalochlaena' || n === 'Conus' || n === 'Pterois' || n === 'Tetraodontidae' || n === 'Physalia' || n === 'Mollusca' || n === 'Cnidaria') {
        caption = 'Marine hazard specimen — observe only from a safe distance';
        inner = [
          h('ellipse', { key: 'm', cx: 140, cy: 54, rx: 32, ry: 22, fill: col, fillOpacity: 0.22, stroke: col, strokeWidth: 2 }),
          h('circle', { key: 'r1', cx: 126, cy: 52, r: 5, fill: 'none', stroke: C.INFO, strokeWidth: 2 }),
          h('circle', { key: 'r2', cx: 152, cy: 48, r: 5, fill: 'none', stroke: C.INFO, strokeWidth: 2 }),
          h('circle', { key: 'r3', cx: 140, cy: 62, r: 4, fill: 'none', stroke: C.INFO, strokeWidth: 2 }),
          h('path', { key: 'arms', d: 'M116 70 Q94 94 76 104 M128 74 Q114 102 106 116 M140 76 Q140 104 140 118 M152 74 Q166 102 174 116 M164 70 Q186 94 204 104', fill: 'none', stroke: col, strokeWidth: 2.2, strokeLinecap: 'round' }),
          h('text', { key: 't1', x: 140, y: 134, textAnchor: 'middle', fill: stroke, fontSize: 9, fontWeight: '700' }, 'Marine defense anatomy · Observe without contact')
        ];
      } else if (isPlant && (n === 'Apiaceae' || n === 'Daucus' || n === 'Cicuta' || n === 'Conium' || n === 'Heracleum')) {
        caption = 'Compound umbel flower head — shared by carrot & deadly hemlock';
        inner = [
          // Main stem
          h('line', { key: 'st', x1: 140, y1: 122, x2: 140, y2: 64, stroke: acc, strokeWidth: 2.5 }),
          // Umbel spokes
          h('path', { key: 'umb', d: 'M140 66 L94 42 M140 66 L116 34 M140 66 L140 30 M140 66 L164 34 M140 66 L186 42', stroke: acc, strokeWidth: 1.6 }),
          [94, 116, 140, 164, 186].map(function (cx, idx) {
            var cy = [40, 32, 28, 32, 40][idx];
            return h('circle', { key: 'fl-' + idx, cx: cx, cy: cy, r: 9, fill: col, fillOpacity: 0.25, stroke: col, strokeWidth: 1.5 });
          }),
          // Lacy leaf
          h('path', { key: 'lf', d: 'M140 94 L106 86 M140 98 L174 90 M118 89 L112 78 M162 93 L168 82', stroke: acc, strokeWidth: 1.5, strokeLinecap: 'round' }),
          h('text', { key: 't1', x: 140, y: 136, textAnchor: 'middle', fill: col, fontSize: 9, fontWeight: '800' }, 'Umbrella cluster (umbel) · High-risk family')
        ];
      } else if (isPlant) {
        caption = 'Botanical foliage & floral trait sketch';
        inner = [
          h('line', { key: 'st', x1: 140, y1: 120, x2: 140, y2: 34, stroke: acc, strokeWidth: 2.4 }),
          h('path', { key: 'l1', d: 'M140 96 C104 94 86 76 92 64 C112 66 128 76 140 96 Z', fill: acc, fillOpacity: 0.22, stroke: acc, strokeWidth: 1.8 }),
          h('path', { key: 'l2', d: 'M140 96 C176 94 194 76 188 64 C168 66 152 76 140 96 Z', fill: acc, fillOpacity: 0.22, stroke: acc, strokeWidth: 1.8 }),
          h('path', { key: 'fl', d: 'M126 56 C126 32 154 32 154 56 L146 66 L134 66 Z', fill: col, fillOpacity: 0.28, stroke: col, strokeWidth: 2 }),
          h('text', { key: 't1', x: 140, y: 135, textAnchor: 'middle', fill: stroke, fontSize: 9, fontWeight: '700' }, node.common || node.name)
        ];
      } else if (isFungi && !(node.kids && node.kids.length)) {
        caption = 'Fungal fruiting body morphology (cap, gills/pores, stalk)';
        inner = [
          h('path', { key: 'cap', d: 'M84 68 C86 30 194 30 196 68 Z', fill: col, fillOpacity: 0.24, stroke: col, strokeWidth: 2 }),
          h('path', { key: 'under', d: 'M88 68 Q140 76 192 68', fill: 'none', stroke: stroke, strokeWidth: 1.5, strokeDasharray: '4 3' }),
          h('rect', { key: 'st', x: 130, y: 68, width: 20, height: 50, rx: 5, fill: bg, stroke: stroke, strokeWidth: 1.8 }),
          h('text', { key: 't1', x: 140, y: 135, textAnchor: 'middle', fill: stroke, fontSize: 9, fontWeight: '700' }, 'No wild fungus can be cleared from a photo')
        ];
      } else {
        // Higher clade / branching phylogenetic mini-tree
        var kids = (node.kids || []).slice(0, 4);
        caption = 'Taxonomic branch overview (' + kids.length + ' shown child branch' + (kids.length === 1 ? '' : 'es') + ')';
        inner = [
          !contrast ? h('rect', { key: 'root-sh', x: 18, y: 56, width: 88, height: 28, rx: 7, fill: col, opacity: 0.14 }) : null,
          h('rect', { key: 'root', x: 18, y: 54, width: 88, height: 28, rx: 7, fill: col, fillOpacity: 0.2, stroke: col, strokeWidth: 1.8 }),
          h('text', { key: 'rt', x: 62, y: 71, textAnchor: 'middle', fill: stroke, fontSize: 9.5, fontWeight: '800' }, node.name.slice(0, 12)),
          kids.map(function (kid, ki) {
            var ky = kids.length === 1 ? 68 : (22 + ki * (92 / Math.max(1, kids.length - 1)));
            var kcol = kid.tier ? tierColor(kid.tier) : acc;
            var dBranch = 'M106 68 C132 68 134 ' + ky + ' 156 ' + ky;
            return h('g', { key: kid.name },
              !contrast ? h('path', { d: dBranch, fill: 'none', stroke: kcol, strokeWidth: 5, strokeLinecap: 'round', opacity: 0.16 }) : null,
              h('path', { d: dBranch, fill: 'none', stroke: kcol, strokeWidth: 1.9, strokeLinecap: 'round' }),
              !contrast ? h('circle', { cx: 158, cy: ky, r: 7.5, fill: kcol, opacity: 0.18 }) : null,
              h('circle', { cx: 158, cy: ky, r: 4.2, fill: kcol, stroke: C.panel, strokeWidth: 1.2 }),
              !contrast ? h('circle', { cx: 156.8, cy: ky - 1.2, r: 1.1, fill: '#ffffff', opacity: 0.65 }) : null,
              h('text', { x: 168, y: ky + 3, fill: stroke, fontSize: 9.5, fontWeight: '700' }, kid.name.slice(0, 15))
            );
          }),
          h('text', { key: 'cl', x: 140, y: 136, textAnchor: 'middle', fill: muted, fontSize: 8.5, fontWeight: '700' }, 'Rank: ' + (RANK_LABEL[node.rank] || node.rank) + ' · Branches are conventions')
        ];
      }

      return h('figure', { className: 'oid-plate', style: { background: C.raised, borderColor: C.border } },
        h('svg', { viewBox: '0 0 280 144', role: 'img', 'aria-label': node.name + ' morphology plate: ' + caption },
          !contrast ? h('defs', null,
            h('radialGradient', { id: 'oid-plate-spot', cx: '50%', cy: '46%', r: '56%' },
              h('stop', { offset: '0%', stopColor: col, stopOpacity: dark ? 0.18 : 0.12 }),
              h('stop', { offset: '70%', stopColor: C.panel, stopOpacity: 0.04 }),
              h('stop', { offset: '100%', stopColor: C.panel, stopOpacity: 0 })
            ),
            h('linearGradient', { id: 'oid-plate-bg', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: C.panel }),
              h('stop', { offset: '100%', stopColor: C.raised })
            )
          ) : null,
          h('rect', { x: 1, y: 1, width: 278, height: 142, rx: 8, fill: contrast ? C.panel : 'url(#oid-plate-bg)', stroke: C.border, strokeWidth: 1 }),
          !contrast ? h('rect', { x: 2, y: 2, width: 276, height: 140, rx: 7, fill: 'url(#oid-plate-spot)' }) : null,
          // Naturalist optical-loupe corner brackets & subtle plate reticle
          !contrast ? h('g', { fill: 'none', stroke: col, strokeWidth: 1.1, opacity: 0.35 },
            h('path', { d: 'M8 18 L8 8 L18 8' }),
            h('path', { d: 'M262 8 L272 8 L272 18' }),
            h('path', { d: 'M8 126 L8 136 L18 136' }),
            h('path', { d: 'M262 136 L272 136 L272 126' }),
            h('circle', { cx: 140, cy: 68, r: 54, strokeDasharray: '3 5', opacity: 0.55 })
          ) : null,
          inner
        ),
        h('figcaption', { className: 'oid-plate-cap', style: { color: C.muted } }, caption)
      );
    }

    function renderLookalikeDiagram(edge) {
      var col = tierColor(edge.tier);
      var safeName = (edge.safe && edge.safe[0]) || '';
      var isFungus = /portobello|puffball|paddy|honey|morel|chanterelle/i.test(safeName);
      var isPlant = /carrot|onion|comfrey|parsnip/i.test(safeName);
      var isButterfly = /monarch/i.test(safeName);
      var isSnake = /snake/i.test(safeName);
      var safeGradId = 'oid-la-s-' + (edge.tier || 'x') + '-' + safeName.replace(/[^a-z0-9]/gi, '').slice(0, 8);
      var riskGradId = 'oid-la-r-' + (edge.tier || 'x') + '-' + safeName.replace(/[^a-z0-9]/gi, '').slice(0, 8);
      return h('svg', {
        className: 'oid-edge-viz',
        viewBox: '0 0 360 66',
        'aria-hidden': 'true',
        focusable: 'false'
      },
        !contrast ? h('defs', null,
          h('radialGradient', { id: safeGradId, cx: '20%', cy: '50%', r: '36%' },
            h('stop', { offset: '0%', stopColor: C.accent, stopOpacity: 0.16 }),
            h('stop', { offset: '100%', stopColor: C.accent, stopOpacity: 0 })
          ),
          h('radialGradient', { id: riskGradId, cx: '68%', cy: '50%', r: '36%' },
            h('stop', { offset: '0%', stopColor: col, stopOpacity: 0.2 }),
            h('stop', { offset: '100%', stopColor: col, stopOpacity: 0 })
          )
        ) : null,
        h('rect', { x: 1, y: 1, width: 358, height: 64, rx: 8, fill: C.raised, stroke: C.border, strokeWidth: 1 }),
        !contrast ? h('rect', { x: 2, y: 2, width: 177, height: 62, rx: 7, fill: 'url(#' + safeGradId + ')' }) : null,
        !contrast ? h('rect', { x: 181, y: 2, width: 177, height: 62, rx: 7, fill: 'url(#' + riskGradId + ')' }) : null,
        // Optical loupe rings framing left & right specimens
        !contrast ? h('circle', { cx: 60, cy: 33, r: 24, fill: 'none', stroke: C.accent, strokeWidth: 1, strokeDasharray: '2 3', opacity: 0.4 }) : null,
        !contrast ? h('circle', { cx: 236, cy: 33, r: 24, fill: 'none', stroke: col, strokeWidth: 1.2, strokeDasharray: '3 2', opacity: 0.55 }) : null,
        // Left specimen glyph
        isButterfly ? h('g', null,
          h('path', { d: 'M58 34 C44 16 26 18 32 34 C30 46 46 48 58 38 Z', fill: '#f97316', fillOpacity: 0.45, stroke: C.text, strokeWidth: 1.4 }),
          h('path', { d: 'M62 34 C76 16 94 18 88 34 C90 46 74 48 62 38 Z', fill: '#f97316', fillOpacity: 0.45, stroke: C.text, strokeWidth: 1.4 })
        ) : isSnake ? h('path', { d: 'M28 42 C42 20 62 20 74 36 C82 46 92 42 98 28', fill: 'none', stroke: C.accent, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: '8 6' })
          : isPlant ? h('g', null,
              h('line', { x1: 60, y1: 54, x2: 60, y2: 26, stroke: C.accent, strokeWidth: 2 }),
              h('path', { d: 'M60 28 L42 18 M60 28 L60 15 M60 28 L78 18', stroke: C.accent, strokeWidth: 1.6 }),
              h('circle', { cx: 60, cy: 17, r: 5, fill: C.accent, fillOpacity: 0.35 })
            )
          : h('g', null,
              h('path', { d: 'M38 34 C38 14 82 14 82 34 Z', fill: C.accent, fillOpacity: 0.25, stroke: C.accent, strokeWidth: 1.8 }),
              h('rect', { x: 55, y: 34, width: 10, height: 20, rx: 3, fill: C.panel, stroke: C.text, strokeWidth: 1.4 })
            ),
        h('text', { x: 106, y: 29, fill: C.text, fontSize: 9.5, fontWeight: '700' }, safeName.slice(0, 18)),
        h('text', { x: 106, y: 44, fill: C.muted, fontSize: 8.5 }, 'Superficial match'),
        // Center comparison divider
        h('line', { x1: 180, y1: 12, x2: 180, y2: 54, stroke: C.border, strokeWidth: 1, strokeDasharray: '3 3' }),
        h('circle', { cx: 180, cy: 33, r: 10, fill: C.panel, stroke: col, strokeWidth: 1.6 }),
        h('text', { x: 180, y: 36, textAnchor: 'middle', fill: col, fontSize: 9, fontWeight: '900' }, 'VS'),
        // Right specimen glyph (with diagnostic highlight ring)
        isButterfly ? h('g', null,
          h('path', { d: 'M234 34 C220 16 202 18 208 34 C206 46 222 48 234 38 Z', fill: '#f97316', fillOpacity: 0.45, stroke: C.text, strokeWidth: 1.4 }),
          h('path', { d: 'M238 34 C252 16 270 18 264 34 C266 46 250 48 238 38 Z', fill: '#f97316', fillOpacity: 0.45, stroke: C.text, strokeWidth: 1.4 }),
          h('line', { x1: 214, y1: 40, x2: 230, y2: 40, stroke: col, strokeWidth: 2.2 }),
          h('line', { x1: 242, y1: 40, x2: 258, y2: 40, stroke: col, strokeWidth: 2.2 })
        ) : isSnake ? h('path', { d: 'M204 42 C218 20 238 20 250 36 C258 46 268 42 274 28', fill: 'none', stroke: col, strokeWidth: 6, strokeLinecap: 'round', strokeDasharray: '8 6' })
          : isPlant ? h('g', null,
              h('line', { x1: 236, y1: 54, x2: 236, y2: 26, stroke: col, strokeWidth: 2 }),
              h('path', { d: 'M236 28 L218 18 M236 28 L236 15 M236 28 L254 18', stroke: col, strokeWidth: 1.6 }),
              h('circle', { cx: 236, cy: 17, r: 5, fill: col, fillOpacity: 0.4 })
            )
          : h('g', null,
              h('path', { d: 'M214 32 C214 12 258 12 258 32 Z', fill: col, fillOpacity: 0.28, stroke: col, strokeWidth: 1.8 }),
              h('rect', { x: 231, y: 32, width: 10, height: 18, rx: 3, fill: C.panel, stroke: C.text, strokeWidth: 1.4 }),
              isFungus ? h('path', { d: 'M225 46 C225 56 247 56 247 46', fill: 'none', stroke: col, strokeWidth: 2 }) : null
            ),
        h('text', { x: 274, y: 29, fill: col, fontSize: 9.5, fontWeight: '800' }, ((edge.danger && edge.danger[0]) || '').slice(0, 15)),
        h('text', { x: 274, y: 44, fill: C.muted, fontSize: 8.5 }, edge.tier + ' risk')
      );
    }

    function renderExampleSpecimenSvg(exampleId) {
      var acc = C.accent;
      var stk = C.text;
      var inner;
      if (exampleId === 'bird') {
        inner = [
          h('ellipse', { key: 'b', cx: 56, cy: 48, rx: 22, ry: 14, fill: acc, fillOpacity: 0.25, stroke: stk, strokeWidth: 1.8 }),
          h('circle', { key: 'h', cx: 78, cy: 36, r: 9, fill: acc, fillOpacity: 0.25, stroke: stk, strokeWidth: 1.8 }),
          h('path', { key: 'bk', d: 'M86 34 L98 37 L86 40 Z', fill: C.MILD, stroke: stk, strokeWidth: 1.2 }),
          h('path', { key: 'w', d: 'M42 46 Q56 32 70 46', fill: 'none', stroke: acc, strokeWidth: 2 }),
          h('path', { key: 'l', d: 'M52 62 L50 76 M62 62 L64 76', stroke: stk, strokeWidth: 1.8 })
        ];
      } else if (exampleId === 'insect') {
        inner = [
          h('circle', { key: 'h', cx: 34, cy: 44, r: 8, fill: acc, fillOpacity: 0.3, stroke: stk, strokeWidth: 1.6 }),
          h('ellipse', { key: 't', cx: 52, cy: 44, rx: 11, ry: 9, fill: acc, fillOpacity: 0.25, stroke: stk, strokeWidth: 1.6 }),
          h('ellipse', { key: 'a', cx: 76, cy: 44, rx: 15, ry: 10, fill: acc, fillOpacity: 0.2, stroke: stk, strokeWidth: 1.6 }),
          h('path', { key: 'ant', d: 'M28 38 L16 26 M28 50 L16 62', stroke: stk, strokeWidth: 1.4 }),
          h('path', { key: 'legs', d: 'M46 35 L40 20 M52 35 L52 18 M58 35 L66 20 M46 53 L40 68 M52 53 L52 70 M58 53 L66 68', stroke: stk, strokeWidth: 1.5 })
        ];
      } else if (exampleId === 'arachnid') {
        inner = [
          h('circle', { key: 'c', cx: 46, cy: 44, r: 10, fill: C.CONTACT, fillOpacity: 0.25, stroke: stk, strokeWidth: 1.6 }),
          h('ellipse', { key: 'a', cx: 70, cy: 44, rx: 15, ry: 12, fill: C.CONTACT, fillOpacity: 0.3, stroke: stk, strokeWidth: 1.6 }),
          h('path', { key: 'legs', d: 'M40 36 L22 20 M44 34 L34 16 M48 34 L56 16 M52 36 L70 20 M40 52 L22 68 M44 54 L34 72 M48 54 L56 72 M52 52 L70 68', stroke: stk, strokeWidth: 1.5 })
        ];
      } else if (exampleId === 'fern') {
        inner = [
          h('path', { key: 's', d: 'M55 76 Q54 44 58 14', fill: 'none', stroke: acc, strokeWidth: 2.2 }),
          h('path', { key: 'f', d: 'M55 62 L32 54 M55 62 L78 54 M55 48 L30 38 M55 48 L80 38 M56 34 L38 26 M56 34 L74 26', stroke: acc, strokeWidth: 2, strokeLinecap: 'round' }),
          h('circle', { key: 'sp1', cx: 40, cy: 44, r: 2, fill: C.MILD }),
          h('circle', { key: 'sp2', cx: 70, cy: 44, r: 2, fill: C.MILD })
        ];
      } else if (exampleId === 'fungus') {
        inner = [
          h('path', { key: 'c', d: 'M24 46 C26 16 84 16 86 46 Z', fill: C.MILD, fillOpacity: 0.28, stroke: stk, strokeWidth: 1.8 }),
          h('rect', { key: 'st', x: 48, y: 46, width: 14, height: 28, rx: 4, fill: C.panel, stroke: stk, strokeWidth: 1.6 })
        ];
      } else if (exampleId === 'moss') {
        inner = [
          h('path', { key: 'm', d: 'M18 68 C26 48 84 48 92 68 Z', fill: acc, fillOpacity: 0.35, stroke: acc, strokeWidth: 1.8 }),
          h('path', { key: 's', d: 'M40 54 L38 28 M56 50 L56 22 M72 54 L74 30', stroke: stk, strokeWidth: 1.5 }),
          h('ellipse', { key: 'c1', cx: 38, cy: 26, rx: 3, ry: 5, fill: C.MILD }),
          h('ellipse', { key: 'c2', cx: 56, cy: 20, rx: 3, ry: 5, fill: C.MILD }),
          h('ellipse', { key: 'c3', cx: 74, cy: 28, rx: 3, ry: 5, fill: C.MILD })
        ];
      } else {
        inner = [
          h('circle', { key: 'l', cx: 48, cy: 42, r: 18, fill: acc, fillOpacity: 0.14, stroke: acc, strokeWidth: 2 }),
          h('line', { key: 'h', x1: 62, y1: 56, x2: 80, y2: 74, stroke: acc, strokeWidth: 3.5, strokeLinecap: 'round' }),
          h('text', { key: 'q', x: 48, y: 47, textAnchor: 'middle', fill: stk, fontSize: 16, fontWeight: '800' }, '?')
        ];
      }
      var exGradId = 'oid-ex-lens-' + String(exampleId || 'field').replace(/[^a-z0-9]/gi, '');
      return h('svg', {
        className: 'oid-example-svg',
        viewBox: '0 0 110 88',
        'aria-hidden': 'true',
        focusable: 'false'
      },
        !contrast ? h('defs', null,
          h('radialGradient', { id: exGradId, cx: '46%', cy: '40%', r: '58%' },
            h('stop', { offset: '0%', stopColor: C.panel }),
            h('stop', { offset: '75%', stopColor: C.raised }),
            h('stop', { offset: '100%', stopColor: C.accent, stopOpacity: 0.14 })
          )
        ) : null,
        h('rect', { x: 1, y: 1, width: 108, height: 86, rx: 10, fill: contrast ? C.raised : 'url(#' + exGradId + ')', stroke: C.border, strokeWidth: 1 }),
        // Optical loupe circular specimen bezel & specular glass arc
        !contrast ? h('circle', { cx: 55, cy: 44, r: 36, fill: 'none', stroke: C.accent, strokeWidth: 1.1, strokeDasharray: '4 3', opacity: 0.35 }) : null,
        !contrast ? h('path', { d: 'M 26 28 A 34 34 0 0 1 54 10', fill: 'none', stroke: '#ffffff', strokeWidth: 1.4, strokeLinecap: 'round', opacity: dark ? 0.22 : 0.6 }) : null,
        inner
      );
    }

    function renderDichotomousKeySvg(route, example) {
      if (example.id === 'field') return null;
      var steps = [
        { id: 'feathers', label: 'Feathers?', yesOut: 'Bird', x: 58 },
        { id: 'legs', label: 'Jointed legs?', yesOut: '6 vs 8 legs', x: 162 },
        { id: 'fronds', label: 'Fronds?', yesOut: 'Fern', x: 274 },
        { id: 'cap', label: 'Cap & stalk?', yesOut: 'Mushroom', x: 382 },
        { id: 'capsules', label: 'Cushion?', yesOut: 'Moss', x: 488 }
      ];
      var answered = {};
      (route.path || []).forEach(function (st) { answered[st.question] = st.answer; });
      var activeQ = route.question;
      return h('figure', { className: 'oid-key-diagram', style: { background: C.raised, borderColor: C.border } },
        h('svg', {
          viewBox: '0 0 560 140',
          role: 'img',
          'aria-label': 'Visual dichotomous key flowchart showing current progress through the teaching key. Current status: ' + (route.question || route.result || 'Start')
        },
          !contrast ? h('defs', null,
            h('linearGradient', { id: 'oid-key-well', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: C.panel }),
              h('stop', { offset: '100%', stopColor: C.raised })
            ),
            h('linearGradient', { id: 'oid-key-sheen', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
              h('stop', { offset: '0%', stopColor: '#ffffff', stopOpacity: 0.32 }),
              h('stop', { offset: '100%', stopColor: '#ffffff', stopOpacity: 0 })
            )
          ) : null,
          // Recessed naturalist key stage well
          h('rect', { x: 2, y: 4, width: 556, height: 132, rx: 10, fill: contrast ? C.panel : 'url(#oid-key-well)', stroke: C.border, strokeWidth: 1 }),
          // Connecting horizontal "No" spine (dual-pass luminous active pathway)
          steps.slice(0, -1).map(function (st, idx) {
            var next = steps[idx + 1];
            var q = OBSERVATION_KEY[st.id].question;
            var wentNo = answered[q] === 'no';
            var xStart = st.x + 42, xEnd = next.x - 42;
            return h('g', { key: 'sp-' + st.id },
              (wentNo && !contrast) ? h('line', { x1: xStart, y1: 42, x2: xEnd, y2: 42, stroke: C.accent, strokeWidth: 6.5, strokeLinecap: 'round', opacity: 0.22 }) : null,
              h('line', { x1: xStart, y1: 42, x2: xEnd, y2: 42, stroke: wentNo ? C.accent : C.border, strokeWidth: wentNo ? 2.6 : 1.5, strokeLinecap: 'round' }),
              h('polygon', { points: xEnd + ',42 ' + (xEnd - 6) + ',38.5 ' + (xEnd - 6) + ',45.5', fill: wentNo ? C.accent : C.border }),
              h('text', { x: (st.x + next.x) / 2, y: 33, textAnchor: 'middle', fill: wentNo ? C.accent : C.muted, fontSize: 8.5, fontWeight: '800' }, 'No')
            );
          }),
          steps.map(function (st) {
            var q = OBSERVATION_KEY[st.id].question;
            var ans = answered[q];
            var isCur = activeQ === q || (st.id === 'legs' && (activeQ === OBSERVATION_KEY.six.question || activeQ === OBSERVATION_KEY.eight.question));
            var wentYes = ans === 'yes';
            var nodeStroke = isCur ? C.accent : (ans ? C.accent : C.border);
            var nodeFill = isCur ? C.accent : C.panel;
            var labelFill = isCur ? C.accentText : C.text;
            var outActive = wentYes || (st.id === 'legs' && (route.result === 'Insect example' || route.result === 'Arachnid example'));
            var outText = st.id === 'legs' && route.result === 'Insect example' ? 'Insect'
              : st.id === 'legs' && route.result === 'Arachnid example' ? 'Arachnid'
              : st.yesOut;
            return h('g', { key: st.id },
              // Active decision beacon halo
              (isCur && !contrast) ? h('rect', { x: st.x - 46, y: 20, width: 92, height: 44, rx: 11, fill: C.accent, opacity: 0.18 }) : null,
              !contrast ? h('rect', { x: st.x - 42, y: 26, width: 84, height: 36, rx: 8, fill: nodeStroke, opacity: 0.14 }) : null,
              h('rect', { x: st.x - 42, y: 24, width: 84, height: 36, rx: 8, fill: nodeFill, stroke: nodeStroke, strokeWidth: isCur ? 2.4 : 1.4 }),
              (!contrast && isCur) ? h('rect', { x: st.x - 40, y: 25.5, width: 80, height: 14, rx: 6, fill: 'url(#oid-key-sheen)' }) : null,
              h('text', { x: st.x, y: 45, textAnchor: 'middle', fill: labelFill, fontSize: 9.5, fontWeight: '800' }, st.label),
              // Downward Yes branch (dual-pass luminous when active)
              (outActive && !contrast) ? h('line', { x1: st.x, y1: 60, x2: st.x, y2: 92, stroke: C.accent, strokeWidth: 6.5, strokeLinecap: 'round', opacity: 0.22 }) : null,
              h('line', { x1: st.x, y1: 60, x2: st.x, y2: 92, stroke: outActive ? C.accent : C.border, strokeWidth: outActive ? 2.6 : 1.3, strokeDasharray: outActive ? undefined : '3 3', strokeLinecap: 'round' }),
              h('polygon', { points: st.x + ',92 ' + (st.x - 3.5) + ',86 ' + (st.x + 3.5) + ',86', fill: outActive ? C.accent : C.border }),
              h('text', { x: st.x + 12, y: 79, fill: outActive ? C.accent : C.muted, fontSize: 8.5, fontWeight: '800' }, 'Yes'),
              // Endpoint outcome pill with glowing halo when reached
              (outActive && !contrast) ? h('rect', { x: st.x - 40, y: 88, width: 80, height: 36, rx: 18, fill: C.accent, opacity: 0.2 }) : null,
              h('rect', { x: st.x - 36, y: 92, width: 72, height: 28, rx: 14, fill: outActive ? C.accent : C.panel, stroke: outActive ? C.accent : C.border, strokeWidth: outActive ? 2 : 1.2 }),
              (!contrast && outActive) ? h('rect', { x: st.x - 33, y: 93.5, width: 66, height: 11, rx: 5.5, fill: 'url(#oid-key-sheen)' }) : null,
              h('text', { x: st.x, y: 109, textAnchor: 'middle', fill: outActive ? C.accentText : C.muted, fontSize: 9.5, fontWeight: '800' }, outText)
            );
          })
        ),
        h('figcaption', { className: 'oid-plate-cap', style: { color: C.muted } },
          route.question ? 'Active step highlighted in the branching key.' : ('Key endpoint reached: ' + route.result))
      );
    }

    function renderDetail() {
      var node = NODE_BY_NAME[selectedName];
      if (!node) return null;
      var chain = lineageOf(node.name);
      var siblings = node.group ? groupMembers(node.group, node.name) : [];
      var color = node.tier ? tierColor(node.tier) : C.muted;

      return h('aside', {
        className: 'oid-detail',
        'aria-label': __alloT('stem.organismid.aria_details_for', 'Details for') + ' ' + node.name,
        style: { background: C.panel, borderColor: C.border, color: C.text }
      },
        h('h2', { id: 'oid-detail-heading', tabIndex: -1, 'data-oid-focus': true, className: 'oid-detail-name' + (node.rank === 'genus' ? ' is-latin' : '') }, node.name),
        h('p', { className: 'oid-detail-rank', style: { color: C.muted } },
          (RANK_LABEL[node.rank] || node.rank) + (node.common ? ' · ' + node.common : '')),
        renderSpecimenPlate(node),
        h('button', { id: 'oid-show-in-tree', type: 'button', className: 'oid-show-in-tree',
          onClick: showSelectedBranch,
          style: { background: C.raised, borderColor: C.controlBorder, color: C.text }
        }, __alloT('stem.organismid.show_in_tree', 'Go to this branch')),

        node.tier ? h('p', { className: 'oid-detail-tier' },
          h('span', { className: 'oid-badge', style: { color: color, borderColor: color } }, node.tier),
          h('span', { style: { color: C.muted } }, ' ' + TIER_LABEL[node.tier])
        ) : null,

        node.rule ? h('p', { className: 'oid-detail-rule', style: { color: C.muted } },
          h('strong', { style: { color: C.text } }, __alloT('stem.organismid.blanket_rule', 'Blanket rule') + ': '), node.rule) : null,

        node.note ? h('p', { className: 'oid-note', style: { background: C.raised, borderColor: C.border } }, node.note) : null,

        node.ex && node.ex.length ? h('div', { className: 'oid-detail-block' },
          h('h3', null, __alloT('stem.organismid.species_in_genus', 'Species in this genus')),
          h('ul', { className: 'oid-species-list' }, node.ex.map(function (pair) {
            return h('li', { key: pair[0] },
              h('span', { className: 'is-latin' }, pair[0]),
              h('span', { style: { color: C.muted } }, ' — ' + pair[1]));
          }))
        ) : null,

        siblings.length ? h('div', { className: 'oid-detail-block' },
          h('h3', null, __alloT('stem.organismid.confused_with', 'Confused with')),
          h('ul', { className: 'oid-species-list' }, siblings.map(function (sib) {
            return h('li', { key: sib.name },
              h('button', {
                type: 'button', className: 'oid-link',
                style: { color: C.accent },
                onClick: function () { selectNode(sib.name); focusObservation('oid-detail-heading'); }
              }, sib.name),
              sib.common ? h('span', { style: { color: C.muted } }, ' — ' + sib.common) : null);
          }))
        ) : null,

        h('div', { className: 'oid-detail-block' },
          h('h3', null, __alloT('stem.organismid.where_it_sits', 'Where it sits')),
          h('ol', { className: 'oid-lineage' }, chain.map(function (step, i) {
            var isLast = i === chain.length - 1;
            return h('li', { key: step.name, style: { color: isLast ? C.text : C.muted } },
              h('span', { className: 'oid-lineage-rank' }, RANK_LABEL[step.rank] || step.rank),
              isLast
                ? h('span', { className: 'oid-lineage-name' }, step.name)
                : h('button', {
                    type: 'button', className: 'oid-link oid-lineage-name',
                    style: { color: C.accent },
                    onClick: function () { selectNode(step.name); focusObservation('oid-detail-heading'); }
                  }, step.name)
            );
          }))
        )
      );
    }

    function renderTreeView() {
      return h('div', { className: 'oid-view' },
        h('p', { className: 'oid-intro', style: { color: C.muted } },
          __alloT('stem.organismid.tree_intro', 'Walk the ranked tree. Coloured dots mark where a hazard rule attaches — notice how often a deadly branch sits one rank away from an edible one.')),
        renderLegend(),
        h('p', { id: 'oid-tree-help', className: 'oid-tree-help', style: { color: C.muted } },
          __alloT('stem.organismid.tree_keyboard_help', 'Use Up and Down to move, Right to expand, and Left to collapse or go back. Enter or Space shows details. Home and End move to the first and last visible branch.')),
        h('div', { className: 'oid-explorer' },
          h('div', { className: 'oid-treewrap' },
            h('ul', { className: 'oid-tree', role: 'tree', 'aria-label': __alloT('stem.organismid.aria_tree', 'Tree of life'), 'aria-describedby': 'oid-tree-help' }, renderTreeNode(TREE, 0, 1, 1))
          ),
          renderDetail()
        )
      );
    }

    function renderLegend() {
      return h('ul', { className: 'oid-legend', 'aria-label': __alloT('stem.organismid.aria_legend', 'Hazard tier legend') }, TIER_ORDER.map(function (tier) {
        return h('li', { key: tier },
          h('span', { className: 'oid-swatch', style: { background: tierColor(tier) }, 'aria-hidden': 'true' }),
          h('span', { style: { color: C.muted } }, tier + ' · ' + TIER_LABEL[tier]));
      }));
    }

    // ── Hazard tiers view ───────────────────────────────────────────────────
    function renderGroupsView() {
      return h('div', { className: 'oid-view' },
        h('p', { className: 'oid-intro', style: { color: C.muted } },
          __alloT('stem.organismid.groups_intro', 'The same organisms, sorted by what a mistake costs rather than by ancestry. A warning fires on the stakes of being wrong, never on how confident an identification feels.')),
        h('div', { className: 'oid-catgrid' }, TIER_ORDER.map(function (tier) {
          var members = tieredNodes(tier);
          if (!members.length) return null;
          var color = tierColor(tier);
          return h('section', {
            key: tier, className: 'oid-catblock',
            style: { background: C.panel, borderColor: C.border, borderLeftColor: color, color: C.text }
          },
            h('h2', null,
              h('span', { className: 'oid-badge', style: { color: color, borderColor: color } }, tier),
              h('span', null, TIER_LABEL[tier])),
            h('p', { className: 'oid-cat-desc', style: { color: C.muted } }, TIER_BLURB[tier]),
            h('ul', { className: 'oid-chips' }, members.map(function (node) {
              return h('li', { key: node.name },
                h('button', {
                  type: 'button', className: 'oid-chip',
                  style: { background: C.raised, borderColor: C.border, color: C.text },
                  onClick: function () { selectNode(node.name); selectView('tree'); focusObservation('oid-detail-heading'); }
                },
                  h('span', { className: node.rank === 'genus' ? 'is-latin' : '' }, node.name),
                  node.common ? h('span', { style: { color: C.muted } }, ' · ' + node.common) : null));
            }))
          );
        }))
      );
    }

    // ── Lookalikes view ─────────────────────────────────────────────────────
    function renderLookalikesView() {
      var tierFilter = d.lookalikeTierFilter || 'ALL';
      var shownEdges = tierFilter === 'ALL' ? EDGES : EDGES.filter(function (e) { return e.tier === tierFilter; });
      return h('div', { className: 'oid-view' },
        h('p', { className: 'oid-intro', style: { color: C.muted } },
          __alloT('stem.organismid.lookalikes_intro', 'Pairs that fool people. Read the tell, then find both in the tree — several of these pairs are not even close relatives, which is the whole lesson.')),
        h('div', { className: 'oid-filter-bar', role: 'group', 'aria-label': __alloT('stem.organismid.filter_lookalikes', 'Filter lookalike pairs by hazard tier') },
          ['ALL', 'DEADLY', 'CONTACT', 'MILD', 'INFO'].map(function (tierKey) {
            var active = tierFilter === tierKey;
            var count = tierKey === 'ALL' ? EDGES.length : EDGES.filter(function (e) { return e.tier === tierKey; }).length;
            var tCol = tierKey === 'ALL' ? C.accent : tierColor(tierKey);
            return h('button', {
              key: tierKey, type: 'button', className: 'oid-filter-chip',
              'aria-pressed': active ? 'true' : 'false',
              onClick: function () { patchState({ lookalikeTierFilter: tierKey }, (tierKey === 'ALL' ? 'All' : tierKey) + ' lookalike pairs shown'); },
              style: {
                background: active ? C.raised : C.panel,
                borderColor: active ? tCol : C.border,
                color: active ? C.text : C.muted
              }
            }, (tierKey === 'ALL' ? __alloT('stem.organismid.filter_all', 'All pairs') : tierKey) + ' (' + count + ')');
          })
        ),
        h('ul', { className: 'oid-edges' }, shownEdges.map(function (edge, i) {
          var color = tierColor(edge.tier);
          return h('li', {
            key: edge.safe[0] + '-' + i, className: 'oid-edge',
            style: { background: C.panel, borderColor: C.border, borderTopColor: color, color: C.text }
          },
            h('div', { className: 'oid-edge-viz-wrap' }, renderLookalikeDiagram(edge)),
            h('div', { className: 'oid-edge-side' },
              h('span', { className: 'oid-edge-label', style: { color: C.muted } }, __alloT('stem.organismid.often_taken_for', 'Often taken for')),
              h('span', { className: 'oid-edge-common' }, edge.safe[0]),
              h('span', { className: 'oid-edge-latin is-latin', style: { color: C.muted } }, edge.safe[1])),
            h('div', { className: 'oid-edge-vs', style: { color: C.muted } },
              h('span', { className: 'oid-edge-arrow', style: { color: color } }, '⇄'),
              h('span', null, edge.tier)),
            h('div', { className: 'oid-edge-side' },
              h('span', { className: 'oid-edge-label', style: { color: C.muted } }, __alloT('stem.organismid.but_may_actually_be', 'But may actually be')),
              h('span', { className: 'oid-edge-common', style: { color: color } }, edge.danger[0]),
              h('span', { className: 'oid-edge-latin is-latin', style: { color: C.muted } }, edge.danger[1])),
            h('p', { className: 'oid-edge-tell', style: { color: C.muted, borderColor: C.border } },
              h('strong', { style: { color: C.text } }, 'Tell: '), edge.tell)
          );
        }))
      );
    }

    // ── Taxonomy 101 view ───────────────────────────────────────────────────
    function renderLearnView() {
      return h('div', { className: 'oid-view' },
        h('p', { className: 'oid-intro', style: { color: C.muted } },
          __alloT('stem.organismid.learn_intro', 'Five things about classification that textbooks tend to state too confidently.')),
        h('div', { className: 'oid-explain' }, EXPLAIN.map(function (section, i) {
          var isOpen = openSection === i;
          return h('section', {
            key: section.title, className: 'oid-expcard',
            style: { background: C.panel, borderColor: C.border, color: C.text }
          },
            h('h2', { className: 'oid-exp-heading' },
              h('button', {
                id: 'oid-lesson-toggle-' + i, type: 'button', className: 'oid-exp-head',
                'aria-expanded': isOpen,
                'aria-controls': 'oid-lesson-panel-' + i,
                onClick: function () {
                  patchState({ openSection: isOpen ? -1 : i }, isOpen ? 'Section collapsed' : section.title + ' expanded');
                }
              },
                h('span', { className: 'oid-exp-index', style: { color: C.accent } }, '0' + (i + 1)),
                h('span', { className: 'oid-exp-title' }, section.title),
                h('span', { className: 'oid-exp-toggle', style: { color: C.muted }, 'aria-hidden': 'true' }, isOpen ? '−' : '+'))),
            h('div', { id: 'oid-lesson-panel-' + i, className: 'oid-exp-body', role: 'region',
              'aria-labelledby': 'oid-lesson-toggle-' + i, hidden: !isOpen }, isOpen ? section.blocks.map(function (block, bi) {
              if (block.kind === 'callout') {
                return h('p', {
                  key: bi, className: 'oid-callout',
                  style: { background: C.raised, borderColor: C.accent, color: C.text }
                }, richText(h, block.text, 'c' + i + '-' + bi));
              }
              return h('p', { key: bi, style: { color: C.muted } }, richText(h, block.text, 'p' + i + '-' + bi));
            }) : null)
          );
        })),
        h('div', { className: 'oid-ladder-card', style: { background: C.panel, borderColor: C.border, color: C.text } },
          h('h2', null, __alloT('stem.organismid.ladder_title', 'The seven ranks, narrowing')),
          h('ol', { className: 'oid-ladder' }, RANK_LADDER.map(function (rank, i) {
            var width = 100 - (i * 12);
            return h('li', { key: rank },
              h('span', {
                className: 'oid-ladder-bar',
                style: { width: width + '%', background: C.accent, opacity: 0.25 + (i * 0.1) },
                'aria-hidden': 'true'
              }),
              h('span', { className: 'oid-ladder-label' }, RANK_LABEL[rank]));
          })),
          h('p', { style: { color: C.muted } },
            __alloT('stem.organismid.ladder_note', 'An honest identification narrows as it descends: confident at kingdom, hedged at species. A tool that reports the same confidence at every rank is not telling you the truth.'))
        )
      );
    }

    // ── Photo ID view (dark until expert review clears) ──────────────────────
    function renderPhotoView() {
      if (PHOTO_ID_ENABLED) {
        return h('div', { className: 'oid-view' },
          h('p', { className: 'oid-intro', style: { color: C.muted } },
            'Photo identification is enabled. Bundle the engine from dev-tools/organism-id-engine/ to render this view.'));
      }
      return h('div', { className: 'oid-view' },
        h('div', {
          className: 'oid-pending',
          style: { background: C.panel, borderColor: C.border, borderLeftColor: C.CONTACT, color: C.text }
        },
          h('h2', null, __alloT('stem.organismid.photo_pending_title', 'Photo identification is not switched on yet')),
          h('p', { style: { color: C.muted } },
            __alloT('stem.organismid.photo_pending_body', 'The identification engine is built and tested: a photograph goes in, and a ranked list of candidates comes back with a confidence ladder, verified GBIF and Wikipedia links, and warnings that fire on how bad a mistake would be rather than on how sure the model feels.')),
          h('p', { style: { color: C.muted } },
            __alloT('stem.organismid.photo_pending_why', 'It stays off because its deadly-organism warnings have not been reviewed by a mycologist or naturalist. Copy that tells a child which mushroom will kill them has to be signed off by a person who knows, not shipped because the code passes its tests.')),
          h('ul', { className: 'oid-pending-list' },
            h('li', null, __alloT('stem.organismid.photo_pending_1', 'Built and passing: 46 tests, offline safety fallback, EXIF and GPS scrubbing before any image leaves the device.')),
            h('li', null, __alloT('stem.organismid.photo_pending_2', 'Blocked on: expert sign-off for 24 deadly and 8 contact-hazard entries.')),
            h('li', null, __alloT('stem.organismid.photo_pending_3', 'Meanwhile: everything in this tool teaches the reasoning the photo path depends on.'))
          )
        )
      );
    }


    function renderObservationView() {
      var example=OBSERVATION_EXAMPLES.find(function(e){return e.id===d.observationExample;})||OBSERVATION_EXAMPLES[1];
      var route=example.id==='field'?{path:[],result:'Unclassified field observation',question:null}:observationRoute(d.observationAnswers),journal=observationJournal(d.observationJournal);
      var reviewKey=JSON.stringify([example.id,route.path.map(function(step){return step.answer;})]);
      var reviewVisible=d.observationReviewKey===reviewKey;
      var evidenceReview=observationEvidenceReview(example.id,route.path.map(function(step){return step.answer;}));
      var box={background:C.panel,color:C.text,border:'1px solid '+C.border,borderRadius:10,padding:14,marginBottom:12};
      var inputStyle={width:'100%',boxSizing:'border-box',display:'block',background:C.raised,color:C.text,border:'1px solid '+C.controlBorder,borderRadius:6,padding:10};
      var errors=d.observationErrors||{};
      var requiredLabel=__alloT('stem.organismid.observation_required','(required)');
      var noteError=__alloT('stem.organismid.observation_note_error','Write an observation before saving.');
      var reasonError=__alloT('stem.organismid.observation_reason_error','Describe what changed before saving a revision.');
      function action(label,fn,disabled){return h('button',{type:'button',onClick:fn,disabled:!!disabled,style:{padding:'10px 14px',minHeight:44,margin:'4px 6px 4px 0',background:C.raised,color:C.text,border:'1px solid '+C.border,borderRadius:7}},label);}
      function exportObservations(rows,filename){
        var url=URL.createObjectURL(new Blob([observationMarkdown(rows)],{type:'text/markdown;charset=utf-8'})),a=document.createElement('a');
        a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);
      }
      function saveObservation(){
        if(journal.length>=60){patchState({observationNotice:'The journal has 60 entries. Export a copy, then remove an entry before saving. Your draft is still here.'});focusObservation('oid-observation-notice');return;}
        var invalid={note:!String(d.observationNote||'').trim(),reason:!!d.observationPreviousId&&!String(d.observationReason||'').trim()};
        if(invalid.note||invalid.reason){
          patchState({observationErrors:invalid,observationNotice:''});
          focusObservation(invalid.note?'oid-observation-note':'oid-observation-reason');
          return;
        }
        var now=new Date().toISOString();
        var row={exampleId:example.id,context:d.observationContext||'',nextEvidence:d.observationNextEvidence||'',reviewed:reviewVisible,id:now+'-'+Math.random().toString(36).slice(2,9),date:now,subject:example.id==='field'?String(d.observationSubject||'Field observation').slice(0,100):example.name,note:String(d.observationNote).trim(),claim:route.result||'Key unfinished',path:route.path,previousId:d.observationPreviousId||'',reason:d.observationReason||''};
        patchState({observationJournal:observationJournal(journal.concat([row])),observationPreviousId:'',observationReason:'',observationNote:'',observationNextEvidence:'',observationErrors:{},observationNotice:'Observation saved in this project. Export a copy for your field notebook.'});
      }
      return h('div',{'data-taxonomy-observation':true,style:{maxWidth:1000,minWidth:0,margin:'auto',padding:16,overflowWrap:'anywhere'}},
        h('section',{style:box},
          h('h2',null,'Observe before naming'),
          h('p',null,'Practice a branching key on six teaching examples. Each answer must come from the description. The key groups these examples; it cannot identify a wild organism. Choose “Not sure” when evidence is missing.'),
          h('label',{htmlFor:'oid-observation-example'},'Teaching example'),
          h('select',{id:'oid-observation-example',value:example.id,style:inputStyle,onChange:function(e){
            var nextExample=OBSERVATION_EXAMPLES.find(function(item){return item.id===e.target.value;})||OBSERVATION_EXAMPLES[1];
            var prompt=nextExample.id==='field'?'Tentative teaching group: Unclassified field observation.':observationRoute([]).question;
            patchState({observationExample:nextExample.id,observationAnswers:[],observationNote:'',observationPreviousId:'',observationReason:'',observationNotice:'',observationErrors:{},observationContext:'',observationNextEvidence:'',observationReviewKey:null},
              __alloT('stem.organismid.observation_example_changed','{example} selected. {prompt}').replace('{example}',nextExample.name).replace('{prompt}',prompt));
          }},
            OBSERVATION_EXAMPLES.map(function(e){return h('option',{key:e.id,value:e.id},e.name);})),
          h('div', { className: 'oid-example-preview', style: { background: C.raised, borderColor: C.border } },
            renderExampleSpecimenSvg(example.id),
            h('p', { id: 'oid-observation-example-evidence', 'data-example-evidence': true, style: { margin: 0, flex: '1 1 220px', minWidth: 0 } }, example.evidence)
          ),
          example.id==='field'?h('label',null,'Observation title',h('input',{type:'text',maxLength:100,value:d.observationSubject||'',style:inputStyle,onChange:function(e){patchState({observationSubject:e.target.value});}})):null,
          renderDichotomousKeySvg(route, example),
          h('ol',null,route.path.map(function(step,i){return h('li',{key:i},step.question+' '+(step.answer==='unsure'?'Not sure':step.answer));})),
          h('section',{id:'oid-observation-step',role:'region',tabIndex:-1,'data-oid-focus':true,
            'aria-labelledby':'oid-observation-step-title','aria-describedby':'oid-observation-example-evidence oid-observation-step-help'},
            h('h3',{id:'oid-observation-step-title','data-key-result':route.question?undefined:true},route.question||('Tentative teaching group: '+route.result+'.')),
            h('p',{id:'oid-observation-step-help'},route.question
              ?__alloT('stem.organismid.observation_answer_help','Choose an answer using the teaching example description.')
              :(route.result==='Unresolved'?'Gather another observation; a missing feature is not evidence that it is absent.':'Check every decision against the example before saving your claim.')),
            route.question?h('div',{role:'group','aria-labelledby':'oid-observation-step-title'},['yes','no','unsure'].map(function(choice){
              return h('button',{key:choice,type:'button',style:{padding:12,minHeight:44,margin:4,background:C.raised,color:C.text,border:'1px solid '+C.border,borderRadius:7},onClick:function(){
                patchState({observationAnswers:(d.observationAnswers||[]).slice(0,route.path.length).concat([choice]),observationReviewKey:null});
                focusObservation('oid-observation-step');
              }},choice==='unsure'?'Not sure':choice==='yes'?'Yes':'No');
            })):null),
          action('Back one decision',function(){patchState({observationAnswers:(d.observationAnswers||[]).slice(0,-1),observationReviewKey:null});focusObservation('oid-observation-step');},!route.path.length),

          action('Restart key',function(){patchState({observationAnswers:[],observationReviewKey:null});focusObservation('oid-observation-step');}),
          example.id!=='field' ? action('Review my evidence',function(){patchState({observationReviewKey:reviewKey});focusObservation('oid-observation-review');},!route.path.length) : null,
          reviewVisible && example.id!=='field' ? h('section',{id:'oid-observation-review',role:'region',tabIndex:-1,'data-oid-focus':true,
            'aria-labelledby':'oid-observation-review-title','aria-describedby':'oid-observation-review-detail','data-observation-evidence-review':evidenceReview.status,style:box},
            h('h3',{id:'oid-observation-review-title'},'Evidence check'),
            h('p',{id:'oid-observation-review-detail'},evidenceReview.detail),
            typeof evidenceReview.decision==='number' ? action('Return to this decision',function(){
              patchState({observationAnswers:(d.observationAnswers||[]).slice(0,evidenceReview.decision),observationReviewKey:null});
              focusObservation('oid-observation-step');
            }) : null
          ) : null,
          h('label',{htmlFor:'oid-observation-context'},'Observation context (optional: habitat, conditions, or lesson setting)'),
          h('input',{id:'oid-observation-context',type:'text',maxLength:300,value:d.observationContext||'',style:inputStyle,onChange:function(e){patchState({observationContext:e.target.value});}}),

          h('label',{htmlFor:'oid-observation-note'},'What did you observe, and what is still uncertain? '+requiredLabel),
          h('textarea',{id:'oid-observation-note',rows:4,maxLength:2000,value:d.observationNote||'',style:inputStyle,'aria-required':'true',
            'aria-invalid':errors.note?'true':undefined,'aria-describedby':errors.note?'oid-observation-note-error':undefined,
            onChange:function(e){patchState({observationNote:e.target.value,observationNotice:'',observationErrors:Object.assign({},errors,{note:!!errors.note&&!e.target.value.trim()})});}}),
          errors.note?h('p',{id:'oid-observation-note-error'},noteError):null,

          h('label',{htmlFor:'oid-next-evidence'},'What evidence would you look for next?'),
          h('textarea',{id:'oid-next-evidence',rows:2,maxLength:700,value:d.observationNextEvidence||'',style:inputStyle,onChange:function(e){patchState({observationNextEvidence:e.target.value});}}),
          d.observationPreviousId?h('div',null,
            h('label',{htmlFor:'oid-observation-reason'},'What changed in this revision? '+requiredLabel),
            h('textarea',{id:'oid-observation-reason',rows:2,maxLength:500,value:d.observationReason||'',style:inputStyle,'aria-required':'true',
              'aria-invalid':errors.reason?'true':undefined,'aria-describedby':errors.reason?'oid-observation-reason-error':undefined,
              onChange:function(e){patchState({observationReason:e.target.value,observationNotice:'',observationErrors:Object.assign({},errors,{reason:!!errors.reason&&!e.target.value.trim()})});}}),
            errors.reason?h('p',{id:'oid-observation-reason-error'},reasonError):null):null,
          action(d.observationPreviousId?'Save observation revision':'Save observation',saveObservation),
          h('p',{id:'oid-observation-notice',role:'status','aria-atomic':'true',tabIndex:-1,'data-oid-focus':true,style:{margin:d.observationNotice?undefined:0}},d.observationNotice||'')),
        h('section',{'data-observation-journal':true,style:box},h('h2',{id:'oid-journal-heading',tabIndex:-1,'data-oid-focus':true,'aria-describedby':'oid-journal-summary'},'Observation journal'),
          h('p',{id:'oid-journal-summary'},journal.length+'/60 entries. '+(journal.length>=60?'Journal full. Export a copy and remove an entry to make room.':'Saving a revision adds an entry and keeps the earlier observation.')),
          h('p',null,'Revisit an entry to refine your evidence. Earlier observations remain beside their revisions. Save the AlloFlow project to retain this journal between sessions.'),
          action('Export observation journal',function(){exportObservations(journal,'taxonomy-observations.md');},!journal.length),
          d.observationRemoved && action('Export removed observation',function(){exportObservations([d.observationRemoved.row],'taxonomy-removed-observation.md');}),
          d.observationRemoved && action('Undo observation removal',function(){
            if(journal.length>=60){patchState({observationNotice:'The journal has 60 entries. Export the removed observation to keep a separate copy; another removal will replace this undo.'});focusObservation('oid-observation-notice');return;}
            var restored=journal.slice(),removed=d.observationRemoved;
            restored.splice(Math.max(0,Math.min(restored.length,removed.index)),0,removed.row);
            patchState({observationJournal:observationJournal(restored),observationRemoved:null,observationNotice:'Observation restored in its original journal position.'});
            focusObservation('oid-journal-heading');
          }),
          journal.length?journal.slice().reverse().map(function(row){
            var previous=journal.find(function(r){return r.id===row.previousId;});
            return h('article',{key:row.id,style:box},h('h3',null,row.subject),h('p',null,row.date),h('p',null,row.note),h('p',null,'Claim: '+row.claim),
              row.context?h('p',null,'Context: '+row.context):null,
              row.nextEvidence?h('p',null,'Next evidence: '+row.nextEvidence):null,
              row.reviewed?h('p',null,'Evidence check at save: '+observationEvidenceReview(row.exampleId,row.path.map(function(step){return step.answer;})).detail):null,
              row.previousId ? h('details',{'data-observation-comparison':true},h('summary',null,'Compare with earlier observation'),
                previous ? (function(){var changes=compareObservations(previous,row);return changes.length?h('ul',null,changes.map(function(change,i){return h('li',{key:i,style:{marginBottom:12,overflowWrap:'anywhere'}},h('strong',null,change.label),h('p',null,'Before: '+change.before),h('p',null,'After: '+change.after));})):h('p',null,'No recorded evidence fields or key decisions changed.');})() : h('p',null,'The earlier entry is not available in this journal.')) : null,

              row.reason?h('p',null,'What changed: '+row.reason):null,
              action('Remove '+row.subject,function(){
                var index=journal.indexOf(row);
                patchState({observationJournal:journal.filter(function(item,i){return i!==index;}),observationRemoved:{row:row,index:index},observationNotice:'Observation removed. Undo is available for the most recent removal.'});
                focusObservation('oid-journal-heading');
              }),
              action('Revisit '+row.subject,function(){var ex=OBSERVATION_EXAMPLES.find(function(e){return e.id===row.exampleId;})||OBSERVATION_EXAMPLES[0];patchState({observationContext:row.context,observationNextEvidence:row.nextEvidence,observationReviewKey:null,observationExample:ex.id,observationSubject:ex.id==='field'?row.subject:'',observationAnswers:row.path.map(function(st){return st.answer;}),observationNote:row.note,observationPreviousId:row.id,observationReason:'',observationErrors:{},observationNotice:'Revise the evidence above, then explain what changed.'});focusObservation('oid-observation-note');}));
          }):h('p',null,'No observations yet. Save your first evidence note above.'))
      );
    }

    var body;
    if (activeView === 'observe') body = renderObservationView();
    else if (activeView === 'groups') body = renderGroupsView();
    else if (activeView === 'lookalikes') body = renderLookalikesView();
    else if (activeView === 'learn') body = renderLearnView();
    else if (activeView === 'photo') body = renderPhotoView();
    else body = renderTreeView();

      var seenCount = Object.keys((d && d.seen) || {}).length;
      var journalCount = observationJournal(d && d.observationJournal).length;

      return h('main', {
      className: 'organism-id-lab',
      'aria-label': __alloT('stem.organismid.aria_main', 'Taxonomy Explorer'),
      style: { background: C.bg, color: C.text, '--oid-focus': C.focus, '--oid-border': C.border, '--oid-muted': C.muted }
    },
      h('header', { className: 'oid-hero' },
        h('span', { className: 'oid-hero-icon', 'aria-hidden': 'true' }, '🧬'),
        h('div', { className: 'oid-hero-copy' },
          h('p', { className: 'oid-kicker' }, __alloT('stem.organismid.kicker', 'CLASSIFICATION')),
          h('h1', null, __alloT('stem.organismid.title', 'Taxonomy Explorer')),
          h('p', null, __alloT('stem.organismid.subtitle', 'How biologists sort life into boxes, why the boxes keep moving, and why a lookalike can be the difference between dinner and a liver transplant.')),
          h('div', { className: 'oid-hero-pills', role: 'list', 'aria-label': __alloT('stem.organismid.aria_stats', 'Field taxonomy summary') },
            h('span', { className: 'oid-hero-pill', role: 'listitem' }, seenCount + '/' + ALL_NODES.length + ' ' + __alloT('stem.organismid.stat_taxa', 'taxa explored')),
            h('span', { className: 'oid-hero-pill', role: 'listitem' }, EDGES.length + ' ' + __alloT('stem.organismid.stat_pairs', 'lookalike pairs')),
            h('span', { className: 'oid-hero-pill', role: 'listitem' }, journalCount + ' ' + __alloT('stem.organismid.stat_notes', 'field notes'))
          ))
      ),

      // Not keyed for runtime translation on purpose — see the i18n policy at the
      // top of this file. English is safe; an unreviewed machine translation is not.
      h('p', { className: 'oid-safety', style: { background: C.raised, borderColor: C.DEADLY, color: C.text }, role: 'note' },
        h('strong', null, 'Field rule: '), SAFETY_BANNER),

      h('div', { className: 'oid-tabs', role: 'tablist', 'aria-label': __alloT('stem.organismid.aria_tabs', 'Taxonomy Explorer views') },
        VIEWS.map(function (view, index) {
          var isActive = view[0] === activeView;
          return h('button', {
            key: view[0], id: 'oid-tab-' + view[0], type: 'button', role: 'tab',
            'aria-selected': isActive, 'aria-controls': 'oid-view-panel', tabIndex: isActive ? 0 : -1,
            className: 'oid-tab' + (isActive ? ' is-active' : ''),
            onClick: function () { selectView(view[0]); },
            onKeyDown: function (event) { handleTabKeyDown(event, index); },
            style: {
              background: isActive ? C.raised : C.panel,
              borderColor: isActive ? C.accent : C.border,
              color: isActive ? C.text : C.muted
            }
          },
            h('span', { 'aria-hidden': 'true' }, view[1]),
            h('span', null, view[2]),
            view[0] === 'photo' && !PHOTO_ID_ENABLED
              ? h('span', { className: 'sr-only' }, ' (not available yet)')
              : null);
        })),

      h('div', { id: 'oid-view-panel', role: 'tabpanel', tabIndex: 0, 'data-oid-focus': true, 'aria-labelledby': 'oid-tab-' + activeView }, body),

      h('p', { className: 'oid-footer', style: { color: C.muted } },
        __alloT('stem.organismid.footer', 'Taxonomy Explorer · Ranks are conventions · No photograph makes a wild organism safe'))
    );
  }

  function injectOrganismStyles() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('organism-id-lab-styles')) return;
    var style = document.createElement('style');
    style.id = 'organism-id-lab-styles';
    style.textContent = [
      '.organism-id-lab{min-height:100%;padding:18px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.55}',
      '.organism-id-lab *{box-sizing:border-box}',
      '.organism-id-lab button{font:inherit;cursor:pointer}',
      '.organism-id-lab :is(button,a,input,select,textarea,summary):focus-visible,.organism-id-lab [data-oid-focus]:focus{outline:3px solid var(--oid-focus);outline-offset:3px}',
      '@media(forced-colors:active){.organism-id-lab :is(button,a,input,select,textarea,summary):focus-visible,.organism-id-lab [data-oid-focus]:focus{outline-color:Highlight}}',
      '.organism-id-lab .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
      '.organism-id-lab .is-latin{font-family:Georgia,"Iowan Old Style",Palatino,serif;font-style:italic}',
      '.oid-hero{display:flex;flex-wrap:wrap;gap:16px;align-items:center;padding:20px;border-radius:18px;background:linear-gradient(135deg,#14532d,#2f6b57 55%,#155e75);color:#fff;box-shadow:0 14px 30px rgba(20,83,45,.22)}',
      // The gradient makes axe mark the three hero text nodes INCOMPLETE, so the
      // contrast is verified by hand instead (2026-08-23): white text against every
      // stop, at the lowest opacity used, is 5.05:1 at worst (#fff@.85 on #2f6b57,
      // the lightest stop) and 9.11:1 at best -- all clear AA. The other 28
      // "incomplete" nodes are the caret/dot glyphs, which axe skips as non-text.
      '.oid-hero-icon{display:grid;place-items:center;width:64px;height:64px;flex:0 0 64px;border:1px solid rgba(255,255,255,.4);border-radius:16px;background:rgba(255,255,255,.14);font-size:34px}',
      '.oid-hero-copy{flex:1 1 14em;min-width:0;overflow-wrap:anywhere}.oid-kicker{margin:0;font-size:11px;font-weight:900;letter-spacing:.14em;opacity:.9}',
      '.oid-hero h1{margin:2px 0 4px;font-size:clamp(24px,4vw,38px);line-height:1.1}',
      '.oid-hero p{margin:0;max-width:720px;font-size:14px;opacity:.95}',
      '.oid-hero-pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}',
      '.oid-hero-pill{display:inline-flex;align-items:center;padding:3px 10px;border:1px solid rgba(255,255,255,.38);border-radius:999px;background:rgba(0,0,0,.22);color:#ffffff;font-size:11px;font-weight:800}',
      '.oid-plate{margin:0 0 12px;padding:8px;border:1px solid;border-radius:11px}',
      '.oid-plate svg{display:block;width:100%;height:auto}',
      '.oid-plate-cap{margin:6px 2px 0;font-size:11px;line-height:1.4;font-weight:600}',
      '.oid-filter-bar{display:flex;flex-wrap:wrap;gap:7px;margin:0 0 14px}',
      '.oid-filter-chip{min-height:36px;padding:5px 12px;border:1px solid;border-radius:999px;font-size:12px;font-weight:750;transition:border-color .15s,background .15s}',
      '.oid-edge-viz-wrap{grid-column:1/-1;margin-bottom:4px}',
      '.oid-edge-viz{display:block;width:100%;max-width:440px;height:auto}',
      '.oid-example-preview{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:10px 0 12px;padding:10px 12px;border:1px solid;border-radius:10px}',
      '.oid-example-svg{width:110px;height:88px;flex:0 0 110px;display:block}',
      '.oid-key-diagram{margin:10px 0 12px;padding:10px;border:1px solid;border-radius:11px}',
      '.oid-key-diagram svg{display:block;width:100%;height:auto}',
      '.oid-safety{display:block;margin:14px 0 0;padding:11px 13px;border:1px solid;border-left-width:5px;border-radius:10px;font-size:13px}',
      '.oid-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 16px}',
      '.oid-tab{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:8px 14px;border:1px solid;border-radius:10px;font-size:13px;font-weight:700}',
      '.oid-tab.is-active{font-weight:900}',
      '.oid-intro{max-width:70ch;margin:0 0 14px;font-size:14px}',
      '.oid-legend{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 14px;padding:0;list-style:none;font-size:11px}',
      '.oid-legend li{display:inline-flex;align-items:center;gap:6px}',
      '.oid-swatch{width:10px;height:10px;flex:0 0 10px;border-radius:3px}',
      '.oid-explorer{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}',
      '.oid-tree-help{margin:0 0 14px;font-size:13px;max-width:75ch}',
      '.oid-treewrap{min-width:0;padding:6px}',
      '.oid-tree,.oid-tree ul{margin:0;padding:0;list-style:none}',
      '.oid-tree .oid-tree-children{margin-left:clamp(3px,1vw,10px);padding-left:clamp(3px,1vw,6px);border-left:1px solid}',
      '.oid-node-row{display:flex;align-items:center;gap:2px}',
      '.oid-caret{display:grid;place-items:center;width:26px;height:34px;flex:0 0 26px;border:1px solid transparent;border-radius:6px;background:none;font-size:11px;cursor:pointer}',
      '.oid-caret-empty{cursor:default}',
      '.oid-node{display:grid;grid-template-columns:9px minmax(0,1fr) auto;align-items:center;column-gap:9px;row-gap:2px;flex:1;min-width:0;min-height:34px;padding:4px 9px;border:1px solid;border-radius:8px;text-align:left}',
      '.oid-tier-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%}',
      '.oid-tier-dot-empty{background:transparent}',
      '.oid-node-name{min-width:0;overflow-wrap:anywhere;font-size:14px;font-weight:600}',
      '.oid-node-rank{min-width:0;overflow-wrap:anywhere;font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
      '.oid-detail{position:sticky;top:12px;padding:16px;border:1px solid;border-radius:13px}',
      '.oid-detail-name{margin:0;font-size:19px;font-weight:700}',
      '.oid-detail-rank{margin:3px 0 12px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
      '.oid-show-in-tree{display:block;max-width:100%;min-height:44px;padding:8px 12px;margin:0 0 12px;border:1px solid;border-radius:8px;white-space:normal;overflow-wrap:anywhere}',
      '.oid-detail-tier{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:12px}',
      '.oid-detail-rule{margin:0 0 8px;font-size:12px}',
      '.oid-badge{padding:2px 7px;border:1px solid;border-radius:5px;font-size:9px;font-weight:900;letter-spacing:.08em}',
      '.oid-note{margin:10px 0 0;padding:10px 12px;border:1px solid;border-radius:9px;font-size:13px;line-height:1.5}',
      '.oid-detail-block{margin-top:14px}',
      '.oid-detail-block h3{margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.oid-species-list{margin:0;padding:0;list-style:none;font-size:13px}',
      '.oid-species-list li{margin:4px 0}',
      '.oid-link{display:inline-flex;align-items:center;min-width:24px;min-height:24px;padding:0;border:0;background:none;font-weight:700;text-decoration:underline;text-underline-offset:2px}',
      '.oid-lineage{margin:0;padding:0;list-style:none;font-size:12px}',
      '.oid-lineage li{display:flex;gap:8px;align-items:baseline;margin:3px 0}',
      '.oid-lineage-rank{flex:0 0 64px;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}',
      '.oid-lineage-name{font-weight:650}',
      '.oid-catgrid{display:grid;gap:13px}',
      '.oid-catblock{padding:15px 16px;border:1px solid;border-left-width:5px;border-radius:12px}',
      '.oid-catblock h2{display:flex;align-items:center;gap:9px;margin:0 0 4px;font-size:15px}',
      '.oid-cat-desc{margin:0 0 11px;font-size:13px}',
      '.oid-chips{display:flex;flex-wrap:wrap;gap:7px;margin:0;padding:0;list-style:none}',
      '.oid-chip{min-height:34px;padding:5px 11px;border:1px solid;border-radius:999px;font-size:12.5px}',
      '.oid-edges{display:grid;gap:11px;margin:0;padding:0;list-style:none}',
      '.oid-edge{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:12px;align-items:center;padding:13px 15px;border:1px solid;border-radius:12px}',
      '.oid-edge-side{min-width:0;display:grid;gap:1px}',
      '.oid-edge-label{font-size:9px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}',
      '.oid-edge-common{font-size:14px;font-weight:650}',
      '.oid-edge-latin{font-size:12.5px}',
      '.oid-edge-vs{display:grid;justify-items:center;gap:2px;font-size:9px;font-weight:800;letter-spacing:.07em}',
      '.oid-edge-arrow{font-size:17px}',
      '.oid-edge-tell{grid-column:1/-1;margin:3px 0 0;padding-top:9px;border-top:1px dashed;font-size:13px}',
      '.oid-explain{display:grid;gap:10px}',
      '.oid-expcard{border:1px solid;border-radius:12px;overflow:hidden}',
      '.oid-exp-heading{margin:0;font-size:inherit;font-weight:inherit}',
      '.oid-exp-head{display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:14px 16px;border:0;background:none;color:inherit;text-align:left}',
      // Keep the ring inside the clipped card, including the host's important focus offset.
      '.organism-id-lab .oid-exp-head:focus-visible{outline-offset:-4px!important}',
      '.oid-exp-index{font-size:11px;font-weight:900;letter-spacing:.06em}',
      '.oid-exp-title{flex:1;font-size:15px;font-weight:700}',
      '.oid-exp-toggle{font-size:17px;font-weight:700}',
      '.oid-exp-body{padding:0 16px 16px;font-size:13.5px}',
      '.oid-exp-body p{margin:0 0 10px;line-height:1.6}',
      '.oid-callout{padding:11px 13px;border:1px solid;border-left-width:4px;border-radius:9px}',
      '.oid-ladder-card{margin-top:14px;padding:15px 16px;border:1px solid;border-radius:12px}',
      '.oid-ladder-card h2{margin:0 0 10px;font-size:15px}',
      '.oid-ladder{display:grid;gap:5px;margin:0 0 11px;padding:0;list-style:none}',
      '.oid-ladder li{display:flex;align-items:center;gap:10px}',
      '.oid-ladder-bar{height:13px;border-radius:4px}',
      '.oid-ladder-label{flex:0 0 auto;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}',
      '.oid-pending{padding:17px 18px;border:1px solid;border-left-width:5px;border-radius:13px}',
      '.oid-pending h2{margin:0 0 8px;font-size:17px}',
      '.oid-pending p{margin:0 0 10px;font-size:13.5px;line-height:1.6;max-width:72ch}',
      '.oid-pending-list{margin:0;padding-left:20px;font-size:13px;line-height:1.6}',
      '.oid-footer{margin:16px 0 0;text-align:center;font-size:10px}',
      '@media(max-width:900px){.oid-explorer{grid-template-columns:1fr}.oid-detail{position:static}}',
      '@media(max-width:620px){.organism-id-lab{padding:11px}.oid-hero{align-items:flex-start;padding:15px}.oid-edge{grid-template-columns:1fr}.oid-edge-vs{justify-items:start}.oid-lineage li{flex-wrap:wrap}.oid-node{grid-template-columns:9px minmax(0,1fr)}.oid-node-rank{grid-column:2}}',
      '@media(prefers-reduced-motion:reduce){.organism-id-lab *{transition:none!important}}',
      '.theme-contrast .oid-hero{background:#000000!important;border:2px solid #facc15;box-shadow:none;color:#ffff00}',
      '.theme-contrast .oid-hero-pill{background:#000000!important;border-color:#facc15;color:#ffff00}',
      '@media(forced-colors:active){.organism-id-lab *{forced-color-adjust:auto}.oid-hero{background:Canvas;color:CanvasText}.oid-tier-dot,.oid-swatch{border:1px solid CanvasText}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  window.StemLab.registerTool('organismId', {
    label: 'Taxonomy Explorer',
    title: 'Taxonomy Explorer',
    icon: '\uD83D\uDC1E',
    desc: 'Explore the ranked tree of life, the lookalike pairs that fool people, and why classification keeps changing.',
    description: 'Explore the ranked tree of life, the lookalike pairs that fool people, and why classification keeps changing.',
    category: 'science',
    color: 'emerald',
    gradeRange: '4-12',
    aliases: ['taxonomy', 'classification', 'organism id', 'identify organism', 'linnaean', 'cladistics', 'species', 'kingdom phylum class', 'lookalikes', 'mimicry', 'dichotomous key', 'tree of life', 'genus', 'mushroom identification'],
    questDataKey: 'organismId',
    questHooks: [
      {
        id: 'explore_tree', label: 'Open ten branches of the tree', icon: '🌳',
        check: function (d) { return Object.keys((d && d.seen) || {}).length >= 10; },
        progress: function (d) { return Math.min(10, Object.keys((d && d.seen) || {}).length) + '/10'; }
      },
      {
        id: 'find_amanita', label: 'Find the family where edible and deadly split apart', icon: '🍄',
        check: function (d) { return !!(d && d.seen && d.seen.Amanita && d.seen.Agaricus); },
        progress: function (d) {
          var seen = (d && d.seen) || {};
          return ((seen.Amanita ? 1 : 0) + (seen.Agaricus ? 1 : 0)) + '/2';
        }
      },
      {
        id: 'read_explainer', label: 'Read a Taxonomy 101 section', icon: '📖',
        check: function (d) { return typeof (d && d.openSection) === 'number' && d.openSection >= 0; },
        progress: function (d) { return (typeof (d && d.openSection) === 'number' && d.openSection >= 0) ? 'Done!' : 'Not yet'; }
      }
    ],
    testHooks: {
      observationEvidenceReview:observationEvidenceReview, observationExampleId:observationExampleId,
      observationRoute: observationRoute, compareObservations: compareObservations, observationJournal: observationJournal, observationMarkdown: observationMarkdown,
      photoIdEnabled: function () { return PHOTO_ID_ENABLED; },
      tierOrder: TIER_ORDER.slice(),
      rankLadder: RANK_LADDER.slice(),
      nodeNames: function () { return ALL_NODES.map(function (n) { return n.name; }); },
      nodeByName: function (name) { return NODE_BY_NAME[name] || null; },
      lineageOf: function (name) { return lineageOf(name).map(function (n) { return n.name; }); },
      tieredNodes: function (tier) { return tieredNodes(tier).map(function (n) { return n.name; }); },
      groupMembers: function (key, exclude) { return groupMembers(key, exclude).map(function (n) { return n.name; }); },
      visibleTreeNames: function (collapsedMap) { return visibleTreeNames(collapsedMap); },
      treeDomId: function (name) { return treeDomId(name); },
      edgeCount: EDGES.length,
      edgeTiers: EDGES.map(function (e) { return e.tier; }),
      explainTitles: EXPLAIN.map(function (s) { return s.title; }),
      safetyBanner: SAFETY_BANNER,
      // Every tier used by the data must have a label and a blurb, or the legend
      // and the tier view silently render blanks.
      tiersInData: function () {
        var found = {};
        ALL_NODES.forEach(function (n) { if (n.tier) found[n.tier] = true; });
        EDGES.forEach(function (e) { found[e.tier] = true; });
        return Object.keys(found).sort();
      }
    },
    render: function (ctx) {
      return renderOrganismId(ctx || {});
    }
  });

  console.log('[StemLab Plugin] Loaded: stem_lab/stem_tool_organismid.js');
})();
