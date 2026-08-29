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
          ]),
          N('Arachnida', 'class', null, [
            N('Latrodectus', 'genus', { tier: 'CONTACT', common: 'black widow' }),
            N('Loxosceles', 'genus', { tier: 'CONTACT', common: 'brown recluse' })
          ])
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
  var NODE_BY_NAME = {};
  var PARENT_OF = {};
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
    while (cursor) {
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

  // ── The tool ──────────────────────────────────────────────────────────────
  var VIEWS = [
    ['tree', '🌳', 'Tree Explorer'],
    ['groups', '🔴', 'Hazard Tiers'],
    ['lookalikes', '👥', 'Lookalikes'],
    ['learn', '📖', 'Taxonomy 101'],
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
      border: '#facc15', accent: '#facc15', accentText: '#000000', focus: '#ffffff',
      DEADLY: '#fca5a5', CONTACT: '#fdba74', MILD: '#fde047', INFO: '#93c5fd', SAFE: '#86efac'
    } : dark ? {
      bg: '#0f130e', panel: '#161b14', raised: '#1c2218', text: '#e6eadf', muted: '#aeb6a6',
      border: '#3b4530', accent: '#66bb9d', accentText: '#0f130e', focus: '#fbbf24',
      DEADLY: '#ec6155', CONTACT: '#e68a41', MILD: '#deb04a', INFO: '#78abcd', SAFE: '#66bb9d'
    } : {
      bg: '#f4f7f1', panel: '#ffffff', raised: '#eef2e9', text: '#16201a', muted: '#48544a',
      border: '#bfc8b5', accent: '#2f6b57', accentText: '#ffffff', focus: '#2f6b57',
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

    function selectView(view) {
      // Announce the human label, not the internal id -- 'Hazard Tiers view
      // selected', not 'groups view selected'.
      var meta = null;
      for (var i = 0; i < VIEWS.length; i++) if (VIEWS[i][0] === view) meta = VIEWS[i];
      patchState({ activeView: view }, (meta ? meta[2] : view) + ' view selected');
    }

    function handleTabKeyDown(event, index) {
      var nextIndex = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % VIEWS.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + VIEWS.length) % VIEWS.length;
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

    function renderTreeNode(node, depth) {
      var kids = node.kids || [];
      var hasKids = kids.length > 0;
      var isCollapsed = !!collapsed[node.name];
      var isSelected = node.name === selectedName;
      var isFocusable = node.name === treeFocusName;
      var color = node.tier ? tierColor(node.tier) : null;

      return h('li', { key: node.name, className: 'oid-tree-item', role: 'none' },
        h('div', { className: 'oid-node-row' },
          // The caret stays as a MOUSE affordance only. Keyboard users expand and
          // collapse with ArrowLeft/ArrowRight on the treeitem itself, so the caret
          // leaves the tab order entirely; aria-hidden keeps it from reading as a
          // second, redundant control.
          hasKids ? h('button', {
            type: 'button',
            className: 'oid-caret',
            tabIndex: -1,
            'aria-hidden': 'true',
            onClick: function () { toggleCollapsed(node.name); },
            style: { color: C.muted, borderColor: 'transparent' }
          }, isCollapsed ? '▸' : '▾') : h('span', { className: 'oid-caret oid-caret-empty', 'aria-hidden': 'true' }),
          h('button', {
            type: 'button',
            id: treeDomId(node.name),
            role: 'treeitem',
            'aria-level': depth + 1,
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
            h('span', { className: 'oid-node-name' + (node.rank === 'genus' ? ' is-latin' : '') }, node.name),
            h('span', { className: 'oid-node-rank', style: { color: C.muted } }, RANK_LABEL[node.rank] || node.rank),
            node.tier ? h('span', { className: 'sr-only' }, ', hazard tier: ' + TIER_LABEL[node.tier]) : null
          )
        ),
        hasKids && !isCollapsed ? h('ul', { className: 'oid-tree-children', role: 'group', style: { borderColor: C.border } },
          kids.map(function (kid) { return renderTreeNode(kid, depth + 1); })
        ) : null
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
        h('h2', { className: 'oid-detail-name' + (node.rank === 'genus' ? ' is-latin' : '') }, node.name),
        h('p', { className: 'oid-detail-rank', style: { color: C.muted } },
          (RANK_LABEL[node.rank] || node.rank) + (node.common ? ' · ' + node.common : '')),

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
                onClick: function () { selectNode(sib.name); }
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
                    onClick: function () { selectNode(step.name); }
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
        h('div', { className: 'oid-explorer' },
          h('div', { className: 'oid-treewrap' },
            h('ul', { className: 'oid-tree', role: 'tree', 'aria-label': __alloT('stem.organismid.aria_tree', 'Tree of life') }, renderTreeNode(TREE, 0))
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
                  onClick: function () { selectNode(node.name); selectView('tree'); }
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
      return h('div', { className: 'oid-view' },
        h('p', { className: 'oid-intro', style: { color: C.muted } },
          __alloT('stem.organismid.lookalikes_intro', 'Pairs that fool people. Read the tell, then find both in the tree — several of these pairs are not even close relatives, which is the whole lesson.')),
        h('ul', { className: 'oid-edges' }, EDGES.map(function (edge, i) {
          var color = tierColor(edge.tier);
          return h('li', {
            key: i, className: 'oid-edge',
            style: { background: C.panel, borderColor: C.border, color: C.text }
          },
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
                type: 'button', className: 'oid-exp-head',
                'aria-expanded': isOpen,
                onClick: function () {
                  patchState({ openSection: isOpen ? -1 : i }, isOpen ? 'Section collapsed' : section.title + ' expanded');
                }
              },
                h('span', { className: 'oid-exp-index', style: { color: C.accent } }, '0' + (i + 1)),
                h('span', { className: 'oid-exp-title' }, section.title),
                h('span', { className: 'oid-exp-toggle', style: { color: C.muted }, 'aria-hidden': 'true' }, isOpen ? '−' : '+'))),
            isOpen ? h('div', { className: 'oid-exp-body' }, section.blocks.map(function (block, bi) {
              if (block.kind === 'callout') {
                return h('p', {
                  key: bi, className: 'oid-callout',
                  style: { background: C.raised, borderColor: C.accent, color: C.text }
                }, richText(h, block.text, 'c' + i + '-' + bi));
              }
              return h('p', { key: bi, style: { color: C.muted } }, richText(h, block.text, 'p' + i + '-' + bi));
            })) : null
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

    var body;
    if (activeView === 'groups') body = renderGroupsView();
    else if (activeView === 'lookalikes') body = renderLookalikesView();
    else if (activeView === 'learn') body = renderLearnView();
    else if (activeView === 'photo') body = renderPhotoView();
    else body = renderTreeView();

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
          h('p', null, __alloT('stem.organismid.subtitle', 'How biologists sort life into boxes, why the boxes keep moving, and why a lookalike can be the difference between dinner and a liver transplant.')))
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
            'aria-selected': isActive, tabIndex: isActive ? 0 : -1,
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

      h('div', { role: 'tabpanel', 'aria-labelledby': 'oid-tab-' + activeView }, body),

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
      '.organism-id-lab button:focus-visible,.organism-id-lab a:focus-visible{outline:3px solid var(--oid-focus);outline-offset:3px}',
      '.organism-id-lab .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}',
      '.organism-id-lab .is-latin{font-family:Georgia,"Iowan Old Style",Palatino,serif;font-style:italic}',
      '.oid-hero{display:flex;gap:16px;align-items:center;padding:20px;border-radius:18px;background:linear-gradient(135deg,#14532d,#2f6b57 55%,#155e75);color:#fff;box-shadow:0 14px 30px rgba(20,83,45,.22)}',
      // The gradient makes axe mark the three hero text nodes INCOMPLETE, so the
      // contrast is verified by hand instead (2026-08-23): white text against every
      // stop, at the lowest opacity used, is 5.05:1 at worst (#fff@.85 on #2f6b57,
      // the lightest stop) and 9.11:1 at best -- all clear AA. The other 28
      // "incomplete" nodes are the caret/dot glyphs, which axe skips as non-text.
      '.oid-hero-icon{display:grid;place-items:center;width:64px;height:64px;flex:0 0 64px;border:1px solid rgba(255,255,255,.4);border-radius:16px;background:rgba(255,255,255,.14);font-size:34px}',
      '.oid-hero-copy{min-width:0}.oid-kicker{margin:0;font-size:11px;font-weight:900;letter-spacing:.14em;opacity:.85}',
      '.oid-hero h1{margin:2px 0 4px;font-size:clamp(24px,4vw,38px);line-height:1.1}',
      '.oid-hero p{margin:0;max-width:720px;font-size:14px;opacity:.93}',
      '.oid-safety{display:block;margin:14px 0 0;padding:11px 13px;border:1px solid;border-left-width:5px;border-radius:10px;font-size:13px}',
      '.oid-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:14px 0 16px}',
      '.oid-tab{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:8px 14px;border:1px solid;border-radius:10px;font-size:13px;font-weight:700}',
      '.oid-tab.is-active{font-weight:900}',
      '.oid-intro{max-width:70ch;margin:0 0 14px;font-size:14px}',
      '.oid-legend{display:flex;gap:14px;flex-wrap:wrap;margin:0 0 14px;padding:0;list-style:none;font-size:11px}',
      '.oid-legend li{display:inline-flex;align-items:center;gap:6px}',
      '.oid-swatch{width:10px;height:10px;flex:0 0 10px;border-radius:3px}',
      '.oid-explorer{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:20px;align-items:start}',
      '.oid-treewrap{min-width:0;overflow-x:auto}',
      '.oid-tree,.oid-tree ul{margin:0;padding:0;list-style:none}',
      '.oid-tree-children{margin-left:14px;padding-left:8px;border-left:1px solid}',
      '.oid-node-row{display:flex;align-items:center;gap:2px}',
      '.oid-caret{display:grid;place-items:center;width:26px;height:34px;flex:0 0 26px;border:1px solid transparent;border-radius:6px;background:none;font-size:11px}',
      '.oid-caret-empty{cursor:default}',
      '.oid-node{display:flex;align-items:center;gap:9px;flex:1;min-width:0;min-height:34px;padding:4px 9px;border:1px solid;border-radius:8px;text-align:left}',
      '.oid-tier-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%}',
      '.oid-tier-dot-empty{background:transparent}',
      '.oid-node-name{font-size:14px;font-weight:600}',
      '.oid-node-rank{font-size:9px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
      '.oid-detail{position:sticky;top:12px;padding:16px;border:1px solid;border-radius:13px}',
      '.oid-detail-name{margin:0;font-size:19px;font-weight:700}',
      '.oid-detail-rank{margin:3px 0 12px;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}',
      '.oid-detail-tier{display:flex;align-items:center;gap:8px;margin:0 0 8px;font-size:12px}',
      '.oid-detail-rule{margin:0 0 8px;font-size:12px}',
      '.oid-badge{padding:2px 7px;border:1px solid;border-radius:5px;font-size:9px;font-weight:900;letter-spacing:.08em}',
      '.oid-note{margin:10px 0 0;padding:10px 12px;border:1px solid;border-radius:9px;font-size:13px;line-height:1.5}',
      '.oid-detail-block{margin-top:14px}',
      '.oid-detail-block h4{margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}',
      '.oid-species-list{margin:0;padding:0;list-style:none;font-size:13px}',
      '.oid-species-list li{margin:4px 0}',
      '.oid-link{display:inline-flex;align-items:center;min-width:24px;min-height:24px;padding:0;border:0;background:none;font-weight:700;text-decoration:underline;text-underline-offset:2px}',
      '.oid-lineage{margin:0;padding:0;list-style:none;font-size:12px}',
      '.oid-lineage li{display:flex;gap:8px;align-items:baseline;margin:3px 0}',
      '.oid-lineage-rank{flex:0 0 64px;font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}',
      '.oid-lineage-name{font-weight:650}',
      '.oid-catgrid{display:grid;gap:13px}',
      '.oid-catblock{padding:15px 16px;border:1px solid;border-left-width:5px;border-radius:12px}',
      '.oid-catblock h3{display:flex;align-items:center;gap:9px;margin:0 0 4px;font-size:15px}',
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
      '.oid-exp-index{font-size:11px;font-weight:900;letter-spacing:.06em}',
      '.oid-exp-title{flex:1;font-size:15px;font-weight:700}',
      '.oid-exp-toggle{font-size:17px;font-weight:700}',
      '.oid-exp-body{padding:0 16px 16px;font-size:13.5px}',
      '.oid-exp-body p{margin:0 0 10px;line-height:1.6}',
      '.oid-callout{padding:11px 13px;border:1px solid;border-left-width:4px;border-radius:9px}',
      '.oid-ladder-card{margin-top:14px;padding:15px 16px;border:1px solid;border-radius:12px}',
      '.oid-ladder-card h3{margin:0 0 10px;font-size:15px}',
      '.oid-ladder{display:grid;gap:5px;margin:0 0 11px;padding:0;list-style:none}',
      '.oid-ladder li{display:flex;align-items:center;gap:10px}',
      '.oid-ladder-bar{height:13px;border-radius:4px}',
      '.oid-ladder-label{flex:0 0 auto;font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}',
      '.oid-pending{padding:17px 18px;border:1px solid;border-left-width:5px;border-radius:13px}',
      '.oid-pending h3{margin:0 0 8px;font-size:17px}',
      '.oid-pending p{margin:0 0 10px;font-size:13.5px;line-height:1.6;max-width:72ch}',
      '.oid-pending-list{margin:0;padding-left:20px;font-size:13px;line-height:1.6}',
      '.oid-footer{margin:16px 0 0;text-align:center;font-size:10px}',
      '@media(max-width:900px){.oid-explorer{grid-template-columns:1fr}.oid-detail{position:static}}',
      '@media(max-width:620px){.organism-id-lab{padding:11px}.oid-hero{align-items:flex-start;padding:15px}.oid-edge{grid-template-columns:1fr}.oid-edge-vs{justify-items:start}.oid-lineage li{flex-wrap:wrap}}',
      '@media(forced-colors:active){.organism-id-lab *{forced-color-adjust:auto}.oid-hero{background:Canvas;color:CanvasText}.oid-tier-dot,.oid-swatch{border:1px solid CanvasText}}'
    ].join('\n');
    document.head.appendChild(style);
  }

  window.StemLab.registerTool('organismId', {
    label: 'Taxonomy Explorer',
    title: 'Taxonomy Explorer',
    icon: '\uD83E\uDD8B',
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
