// Builder, curated K-12 starter templates, and reopen reader for Sort, Sequence, Tiered Writing, and Choice Board packets.
// Plain UMD script for browser pages (window.AlloPacketChoice) and Node (module.exports).
// Zero network, zero storage, zero markup strings. Deterministic output: identical choices always produce the same file.
(function (root) {
  'use strict';

  var VERSION = 1;
  var CHOICE_ACTIVITIES = ['concept_sort', 'sequence_order', 'tiered_writing', 'choice_board'];
  var CHECK_CAPABLE = { concept_sort: true, sequence_order: true };

  // Static monochrome 24x24 SVG data URIs (pure geometric strokes, zero scripts, zero external links).
  var SVG_ICONS = {
    sun: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iNCIvPjxwYXRoIGQ9Ik0xMiAydjNNMTIgMTl2M000LjkgNC45bDIuMSAyLjFNMTcgMTdsMi4xIDIuMU0yIDEyaDNNMTkgMTJoM000LjkgMTkuMUw3IDE3TTE3IDdsMi4xLTIuMSIvPjwvc3ZnPg==',
    leaf: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTUgMjFjMi04IDctMTQgMTUtMTYtMiA5LTYgMTQtMTUgMTZ6Ii8+PHBhdGggZD0iTTUgMjFsNy03Ii8+PC9zdmc+',
    drop: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDNzNiA3IDYgMTFhNiA2IDAgMSAxLTEyIDBjMC00IDYtMTEgNi0xMXoiLz48L3N2Zz4=',
    cube: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDNsOCA0LjV2OUwxMiAyMWwtOC00LjV2LTlMMTIgM3oiLz48cGF0aCBkPSJNMTIgMTJsOC00LjVNMTIgMTJ2OU0xMiAxMkw0IDcuNSIvPjwvc3ZnPg==',
    cloud: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTYgMTloMTFhNCA0IDAgMCAwIC41LTcuOUE1LjUgNS41IDAgMCAwIDcgOS41IDMuNSAzLjUgMCAwIDAgNiAxOXoiLz48L3N2Zz4=',
    book: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTQgNWg2YTMgMyAwIDAgMSAzIDN2MTJhMiAyIDAgMCAwLTItMkg0eiIvPjxwYXRoIGQ9Ik0yMCA1aC02YTMgMyAwIDAgMC0zIDN2MTJhMiAyIDAgMCAxIDItMmg3eiIvPjwvc3ZnPg==',
    scale: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjMWQyNDMzIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBhdGggZD0iTTEyIDN2MThNNSA3aDE0TTcgN2wtMyA3aDZ6TTE3IDdsLTMgN2g2ek04IDIxaDgiLz48L3N2Zz4=',
  };

  var STARTER_TEMPLATES = [
    {
      id: 'sci_ecosystems_choice',
      subject: 'Science',
      gradeBand: 'Grades 4-6',
      activity: 'choice_board',
      name: 'Ecosystems Energy Flow (Choice Board)',
      title: 'Ecosystems Energy Flow Choice Board',
      summary: 'One science goal with 3 pathways: Concept Sort, Food Chain Sequence, or Tiered Writing.',
      item: {
        id: 'cb-eco-1',
        word: 'Ecosystems Energy Flow',
        goal: 'Show how energy moves from the sun through producers, consumers, and decomposers.',
        prompt: 'Pick one pathway below to show how energy moves through an ecosystem. You can switch before finishing.',
        pathways: [
          {
            id: 'path_sort',
            kind: 'concept_sort',
            title: 'Sort the Organisms',
            summary: 'Group living things into Producers, Consumers, and Decomposers.',
            data: {
              id: 'eco-sort',
              word: 'Ecosystem Roles',
              prompt: 'Place each organism into its ecosystem role.',
              hint: 'Producers make food from sunlight, consumers eat other living things, and decomposers break down dead material.',
              categories: [
                { id: 'prod', label: 'Producers', description: 'Make food using sunlight', icon: SVG_ICONS.leaf },
                { id: 'cons', label: 'Consumers', description: 'Eat plants or animals', icon: SVG_ICONS.sun },
                { id: 'dec', label: 'Decomposers', description: 'Break down dead matter', icon: SVG_ICONS.drop },
              ],
              cards: [
                { id: 'c1', text: 'Oak tree', detail: 'Uses sunlight to make food', icon: SVG_ICONS.leaf, category: 'prod' },
                { id: 'c2', text: 'Meadow grass', detail: 'Green blades grow in sun', category: 'prod' },
                { id: 'c3', text: 'Red fox', detail: 'Hunts mice and eats berries', category: 'cons' },
                { id: 'c4', text: 'Field mouse', detail: 'Eats seeds and stems', category: 'cons' },
                { id: 'c5', text: 'Forest mushroom', detail: 'Grows on fallen logs', category: 'dec' },
                { id: 'c6', text: 'Earthworm', detail: 'Turns dead leaves into soil', category: 'dec' },
              ],
            },
          },
          {
            id: 'path_seq',
            kind: 'sequence_order',
            title: 'Order the Food Chain',
            summary: 'Put the four steps of energy transfer in order from first to last.',
            data: {
              id: 'eco-seq',
              word: 'Food Chain Order',
              prompt: 'Order how energy travels through a meadow food chain from start to finish.',
              hint: 'Begin with the energy source that powers every plant.',
              steps: [
                { id: 's1', label: 'Sunlight', text: 'Energy from the sun shines on the meadow.' },
                { id: 's2', label: 'Producer', text: 'Clover uses sunlight to grow and store energy.' },
                { id: 's3', label: 'Consumer', text: 'A rabbit eats clover, and a hawk hunts the rabbit.' },
                { id: 's4', label: 'Decomposer', text: 'Bacteria and fungi return nutrients from remains back to soil.' },
              ],
            },
          },
          {
            id: 'path_write',
            kind: 'tiered_writing',
            title: 'Explain Energy Flow',
            summary: 'Write a short explanation with frames, starters, or independent writing.',
            data: {
              id: 'eco-write',
              word: 'Explain Energy Flow',
              prompt: 'Explain how energy starts with the sun and moves through producers, consumers, and decomposers.',
              passageTitle: 'Reference Note: Meadow Energy',
              passage: 'In a meadow ecosystem, green plants capture sunlight to make food. Herbivores and predators gain energy when they eat plants or other animals. When organisms die, decomposers break down their remains and return nutrients to the soil.',
              minWords: 14,
              wordBank: ['sunlight', 'producers', 'consumers', 'decomposers', 'nutrients', 'soil'],
              frames: [
                'Energy in an ecosystem starts with ___, which ___ use to make food.',
                'Next, ___ get energy by eating plants or other animals.',
                'Finally, ___ break down dead matter and return ___ to the soil.',
              ],
              starters: [
                'Energy first enters an ecosystem when...',
                'Producers pass energy to consumers because...',
                'Decomposers complete the cycle by...',
              ],
              checklist: [
                'I named producers, consumers, and decomposers.',
                'I explained how energy starts with sunlight.',
                'I checked my sentences for clear meaning.',
              ],
            },
          },
        ],
      },
    },
    {
      id: 'ela_story_elements_choice',
      subject: 'ELA',
      gradeBand: 'Grades 3-5',
      activity: 'choice_board',
      name: 'Story Elements & Plot Arc (Choice Board)',
      title: 'Story Elements Choice Board',
      summary: 'ELA goal with 3 pathways: Concept Sort, Story Sequence, or Cloze Vocabulary Check.',
      item: {
        id: 'cb-ela-1',
        word: 'Story Elements',
        goal: 'Identify characters, setting, and plot structure in a narrative story.',
        prompt: 'Choose how to show your understanding of story elements. You can switch before finishing.',
        pathways: [
          {
            id: 'path_sort',
            kind: 'concept_sort',
            title: 'Sort Story Parts',
            summary: 'Sort story clues into Characters, Setting, and Plot Events.',
            data: {
              id: 'ela-sort',
              word: 'Story Elements Sort',
              prompt: 'Sort each story detail into Characters, Setting, or Plot Events.',
              hint: 'Ask yourself: Is this WHO is in the story, WHERE/WHEN it happens, or WHAT happens?',
              categories: [
                { id: 'char', label: 'Characters', description: 'People or animals in the story', icon: SVG_ICONS.book },
                { id: 'set', label: 'Setting', description: 'Where and when the story happens' },
                { id: 'plot', label: 'Plot Events', description: 'Key actions and turning points' },
              ],
              cards: [
                { id: 'c1', text: 'Maya, a curious inventor', category: 'char' },
                { id: 'c2', text: 'Barnaby the talking owl', category: 'char' },
                { id: 'c3', text: 'A snowy mountain village in winter', category: 'set' },
                { id: 'c4', text: 'Late evening inside the quiet library', category: 'set' },
                { id: 'c5', text: 'The bridge washes out before the festival', category: 'plot' },
                { id: 'c6', text: 'Friends build a rope pulley to save the supplies', category: 'plot' },
              ],
            },
          },
          {
            id: 'path_seq',
            kind: 'sequence_order',
            title: 'Build the Story Arc',
            summary: 'Order the four stages of a plot from beginning to resolution.',
            data: {
              id: 'ela-seq',
              word: 'Plot Structure Order',
              prompt: 'Put the parts of a story plot in order from start to finish.',
              hint: 'Readers meet the characters first and see the problem solved last.',
              steps: [
                { id: 's1', label: 'Exposition', text: 'Introduce the main characters and the setting.' },
                { id: 's2', label: 'Rising Action', text: 'A problem grows and characters face obstacles.' },
                { id: 's3', label: 'Climax', text: 'The most important turning point arrives.' },
                { id: 's4', label: 'Resolution', text: 'The conflict is solved and loose ends close.' },
              ],
            },
          },
          {
            id: 'path_cloze',
            kind: 'cloze_short',
            title: 'Complete Story Statements',
            summary: 'Fill in key story-structure terms using the word bank.',
            data: {
              prompt: 'Use the word bank or type the term that completes each sentence.',
              hint: 'Read each sentence aloud to check if the term fits.',
              wordBank: ['setting', 'conflict', 'climax', 'resolution'],
              questions: [
                { id: 'q1', text: 'The time and place where a story happens is called the ___.', answers: ['setting'] },
                { id: 'q2', text: 'The main problem a character tries to solve is the ___.', answers: ['conflict'] },
                { id: 'q3', text: 'The turning point of highest tension in a story is the ___.', answers: ['climax'] },
                { id: 'q4', text: 'How the problem works out at the end is the ___.', answers: ['resolution'] },
              ],
            },
          },
        ],
      },
    },
    {
      id: 'ss_civic_branches_choice',
      subject: 'Social Studies',
      gradeBand: 'Grades 5-8',
      activity: 'choice_board',
      name: 'Three Branches of Government (Choice Board)',
      title: 'Three Branches Choice Board',
      summary: 'Civics goal with 3 pathways: Concept Sort, Cloze Checks & Balances, or Tiered Writing.',
      item: {
        id: 'cb-ss-1',
        word: 'Three Branches of Government',
        goal: 'Explain how the legislative, executive, and judicial branches divide and balance power.',
        prompt: 'Pick one pathway to demonstrate how the three branches work together.',
        pathways: [
          {
            id: 'path_sort',
            kind: 'concept_sort',
            title: 'Sort Government Powers',
            summary: 'Match responsibilities to Legislative, Executive, or Judicial.',
            data: {
              id: 'ss-sort',
              word: 'Branches of Government',
              prompt: 'Sort each power into the branch that holds it.',
              hint: 'Legislative writes laws, Executive carries them out, and Judicial interprets them.',
              categories: [
                { id: 'leg', label: 'Legislative', description: 'Makes laws (Congress)', icon: SVG_ICONS.book },
                { id: 'exec', label: 'Executive', description: 'Carries out laws (President)' },
                { id: 'jud', label: 'Judicial', description: 'Interprets laws (Courts)', icon: SVG_ICONS.scale },
              ],
              cards: [
                { id: 'c1', text: 'Writes and debates bills', category: 'leg' },
                { id: 'c2', text: 'Approves the federal budget', category: 'leg' },
                { id: 'c3', text: 'Signs or vetoes bills', category: 'exec' },
                { id: 'c4', text: 'Leads federal agencies', category: 'exec' },
                { id: 'c5', text: 'Reviews whether laws follow the Constitution', category: 'jud' },
                { id: 'c6', text: 'Decides disputes in federal courts', category: 'jud' },
              ],
            },
          },
          {
            id: 'path_cloze',
            kind: 'cloze_short',
            title: 'Checks and Balances Cloze',
            summary: 'Fill in key civic terms about how branches check one another.',
            data: {
              prompt: 'Complete each sentence about checks and balances.',
              hint: 'Think about which branch can veto, override, or review laws.',
              wordBank: ['Congress', 'veto', 'Constitution', 'Supreme Court'],
              questions: [
                { id: 'q1', text: 'The legislative branch, called ___, drafts and votes on national laws.', answers: ['congress'] },
                { id: 'q2', text: 'The president can check the legislature by using a ___ on a bill.', answers: ['veto'] },
                { id: 'q3', text: 'The ___ decides whether laws match the ___.'.replace('the ___.', 'the rule of law.'), answers: ['supreme court'] },
                { id: 'q4', text: 'All three branches must follow the rules written in the ___.', answers: ['constitution'] },
              ],
            },
          },
          {
            id: 'path_write',
            kind: 'tiered_writing',
            title: 'Write a Civics Explanation',
            summary: 'Explain why dividing government power matters using 3 scaffold levels.',
            data: {
              id: 'ss-write',
              word: 'Separation of Powers',
              prompt: 'Why did the framers divide government power among three branches instead of one?',
              passageTitle: 'Primary Idea: Checks and Balances',
              passage: 'The U.S. Constitution splits national power among Congress, the President, and the federal courts. Each branch has tools to limit the others so no single person or group holds all authority.',
              minWords: 15,
              wordBank: ['legislative', 'executive', 'judicial', 'balance', 'Constitution', 'authority'],
              frames: [
                'Power is divided among three branches: ___, ___, and ___.',
                'This system protects citizens because no single branch holds all ___.',
                'For example, one branch can check another to keep a fair ___.',
              ],
              starters: [
                'Dividing power among three branches matters because...',
                'One example of checks and balances is...',
                'Without shared power, a government might...',
              ],
              checklist: [
                'I explained the purpose of dividing power.',
                'I included at least one example of a check or balance.',
                'I reviewed my response for clarity.',
              ],
            },
          },
        ],
      },
    },
    {
      id: 'sci_states_matter_sort',
      subject: 'Science',
      gradeBand: 'Grades 2-5',
      activity: 'concept_sort',
      name: 'States of Matter (Concept Sort)',
      title: 'States of Matter Concept Sort',
      summary: 'Sort everyday examples into Solid, Liquid, and Gas with visual icons.',
      item: {
        id: 'cs-matter-1',
        word: 'States of Matter',
        prompt: 'Sort each example into Solid, Liquid, or Gas.',
        hint: 'Solids hold their shape, liquids pour to fit a container, and gases spread out into the air.',
        categories: [
          { id: 'solid', label: 'Solid', description: 'Keeps its own shape', icon: SVG_ICONS.cube },
          { id: 'liquid', label: 'Liquid', description: 'Flows to fit its container', icon: SVG_ICONS.drop },
          { id: 'gas', label: 'Gas', description: 'Spreads out to fill space', icon: SVG_ICONS.cloud },
        ],
        cards: [
          { id: 'c1', text: 'Ice cube', detail: 'Hard frozen water', icon: SVG_ICONS.cube, category: 'solid' },
          { id: 'c2', text: 'Wooden pencil', detail: 'Stays rigid on a desk', category: 'solid' },
          { id: 'c3', text: 'Orange juice', detail: 'Pours into a cup', icon: SVG_ICONS.drop, category: 'liquid' },
          { id: 'c4', text: 'Rainwater', detail: 'Flows down a sidewalk', category: 'liquid' },
          { id: 'c5', text: 'Steam from soup', detail: 'Rises into the kitchen air', icon: SVG_ICONS.cloud, category: 'gas' },
          { id: 'c6', text: 'Helium inside a balloon', detail: 'Fills the whole balloon', category: 'gas' },
        ],
      },
    },
    {
      id: 'sci_water_cycle_seq',
      subject: 'Science',
      gradeBand: 'Grades 3-6',
      activity: 'sequence_order',
      name: 'Water Cycle Stages (Sequence Order)',
      title: 'Water Cycle Sequence Order',
      summary: 'Order Evaporation, Condensation, Precipitation, and Collection from first to last.',
      item: {
        id: 'sq-water-1',
        word: 'Water Cycle',
        prompt: 'Put the four stages of the water cycle in order starting with sunlight heating water.',
        hint: 'Follow a drop of water as it rises into the sky, forms clouds, falls back down, and gathers.',
        steps: [
          { id: 's1', label: 'Evaporation', text: 'Heat from the sun turns liquid water into water vapor.' },
          { id: 's2', label: 'Condensation', text: 'Rising vapor cools high in the sky to form tiny cloud droplets.' },
          { id: 's3', label: 'Precipitation', text: 'Heavy droplets fall back to Earth as rain, sleet, or snow.' },
          { id: 's4', label: 'Collection', text: 'Water gathers in rivers, lakes, groundwater, and oceans.' },
        ],
      },
    },
    {
      id: 'ss_bill_to_law_seq',
      subject: 'Social Studies',
      gradeBand: 'Grades 5-8',
      activity: 'sequence_order',
      name: 'How a Bill Becomes a Law (Timeline)',
      title: 'How a Bill Becomes a Law',
      summary: 'Arrange five legislative milestones from proposal to signed law.',
      item: {
        id: 'sq-bill-1',
        word: 'How a Bill Becomes a Law',
        prompt: 'Arrange the steps showing how a federal bill becomes a law from first to last.',
        hint: 'A bill starts as an idea in committee before both chambers vote and the president decides.',
        steps: [
          { id: 's1', label: 'Step 1: Proposal', text: 'A member of Congress introduces a bill.' },
          { id: 's2', label: 'Step 2: Committee', text: 'A committee studies, debates, and revises the bill.' },
          { id: 's3', label: 'Step 3: First Chamber', text: 'Members debate and vote in the first chamber.' },
          { id: 's4', label: 'Step 4: Second Chamber', text: 'The other chamber reviews and passes the same version.' },
          { id: 's5', label: 'Step 5: Executive Action', text: 'The president signs the bill into law (or Congress overrides a veto).' },
        ],
      },
    },
    {
      id: 'ela_claim_evidence_write',
      subject: 'ELA',
      gradeBand: 'Grades 6-12',
      activity: 'tiered_writing',
      name: 'Claim & Evidence Response (Tiered Writing)',
      title: 'Claim and Evidence Writing',
      summary: 'Short source reading with 3 student-toggleable writing scaffold levels and self-check rubric.',
      item: {
        id: 'tw-claim-1',
        word: 'School Gardens Argument',
        prompt: 'Should schools add outdoor gardens for science and lunch programs? State a clear claim and support it with evidence from the passage.',
        passageTitle: 'Source Note: Campus Gardens',
        passage: 'Several middle schools planted vegetable gardens beside their science classrooms. Students measured soil moisture, tracked plant growth in math graphs, and donated extra greens to the cafeteria. Teachers noted higher science engagement, though staff also had to schedule summer watering volunteers.',
        minWords: 18,
        wordBank: ['claim', 'evidence', 'engagement', 'cafeteria', 'volunteers', 'hands-on'],
        frames: [
          'My ___ is that schools should add outdoor gardens.',
          'One piece of ___ from the passage is that students showed higher ___.',
          'Even though gardens need summer ___, the ___ learning benefits students.',
        ],
        starters: [
          'Based on the passage, schools should...',
          'The strongest evidence for this view is...',
          'Although maintaining a garden requires...',
        ],
        checklist: [
          'I stated a clear claim.',
          'I used specific evidence from the passage.',
          'I addressed a challenge or detail and checked my punctuation.',
        ],
      },
    },
  ];

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function str(v, max) {
    var s = String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
    return max ? s.slice(0, max) : s;
  }

  function fnv1a(text) {
    var h = 2166136261 >>> 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  function slug(text, max) {
    var out = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (out || 'packet').slice(0, max || 48).replace(/-+$/, '') || 'packet';
  }

  function resolveAdapters(explicit) {
    if (explicit && explicit.ADAPTERS) return explicit;
    if (root.AlloPacketSortWriteAdapters && root.AlloPacketSortWriteAdapters.ADAPTERS) {
      return root.AlloPacketSortWriteAdapters;
    }
    throw new Error('AlloPacketSortWriteAdapters is required.');
  }

  function resolveLoader(explicit) {
    if (explicit && typeof explicit.buildHtml === 'function') return explicit;
    if (root.AlloWordSoundsTakeHome && typeof root.AlloWordSoundsTakeHome.buildHtml === 'function') {
      return root.AlloWordSoundsTakeHome;
    }
    throw new Error('AlloWordSoundsTakeHome loader is required.');
  }

  function templates() {
    return STARTER_TEMPLATES.map(clone);
  }

  function templateById(id) {
    for (var i = 0; i < STARTER_TEMPLATES.length; i++) {
      if (STARTER_TEMPLATES[i].id === id) return clone(STARTER_TEMPLATES[i]);
    }
    return null;
  }

  function codeName(value) {
    var t = typeof value === 'string' ? value : '';
    try {
      return t.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ._-]+/gu, '').replace(/\s+/g, ' ').trim().slice(0, 40).trim();
    } catch (_) {
      return t.replace(/[^A-Za-z0-9 ._-]+/g, '').trim().slice(0, 40);
    }
  }

  function withCodeName(html, name) {
    var clean = codeName(name);
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = typeof html === 'string' ? html.indexOf(openTag) : -1;
    if (at < 0) return html;
    var from = at + openTag.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try {
      manifest = JSON.parse(html.slice(from, to), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
    } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    if (clean) manifest.learner = clean;
    else if (Object.prototype.hasOwnProperty.call(manifest, 'learner')) delete manifest.learner;
    else return html;
    var json = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }

  function withSpeechManifest(html) {
    var openTag = '<script type="application/json" id="packet-manifest">';
    var at = typeof html === 'string' ? html.indexOf(openTag) : -1;
    if (at < 0) return html;
    var from = at + openTag.length;
    var to = html.indexOf('</script>', from);
    if (to < 0) return html;
    var manifest;
    try {
      manifest = JSON.parse(html.slice(from, to), function (k, v) {
        return k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v;
      });
    } catch (_) { return html; }
    if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return html;
    manifest.speech = {
      engine: 'speechSynthesis',
      localOnly: true,
      when: 'only when the learner presses Read aloud',
    };
    var json = JSON.stringify(manifest).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    return html.slice(0, from) + json + html.slice(to);
  }

  function choiceReadAloudWrapper(origRender, activityId) {
    return function (item, ctx) {
      var handle = origRender(item, ctx) || {};
      var root = ctx && ctx.root;
      if (!root) return handle;
      var L = (ctx && ctx.L) || {};
      var doc = root.ownerDocument;
      var view = doc && doc.defaultView;
      var synth = view && view.speechSynthesis && typeof view.speechSynthesis.speak === 'function' ? view.speechSynthesis : null;
      var speaking = false;
      var gen = 0;
      var obs = null;
      var readBtn = null;

      var disconnectObs = function () {
        if (obs) { try { obs.disconnect(); } catch (_) {} obs = null; }
      };

      var setBtnState = function (active) {
        speaking = !!active;
        if (readBtn) {
          readBtn.setAttribute('aria-pressed', speaking ? 'true' : 'false');
          readBtn.textContent = speaking ? 'Stop reading' : 'Read aloud';
        }
        if (!speaking) disconnectObs();
      };

      var stopSpeech = function () {
        gen++;
        var was = speaking;
        setBtnState(false);
        if (synth && (was || synth.speaking || synth.pending)) {
          try { if (typeof synth.cancel === 'function') synth.cancel(); } catch (_) {}
        }
      };

      var readRate = function () {
        var attr = doc && doc.documentElement ? String(doc.documentElement.getAttribute('data-audio-speed') || '').trim().toLowerCase() : '';
        if (attr === 'slow') return 0.75;
        var n = Number(attr);
        if (attr && isFinite(n) && n >= 0.5 && n <= 2) return n;
        if (typeof ctx.speedRate === 'function') {
          var sr = Number(ctx.speedRate());
          if (isFinite(sr) && sr > 0 && sr !== 1) return sr;
        }
        if (typeof ctx.slow === 'function' && ctx.slow()) return 0.75;
        return 1.0;
      };

      var getVisiblePromptText = function () {
        var parts = [];
        var add = function (s) {
          var t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
          if (t && parts.indexOf(t) < 0) parts.push(t);
        };
        if (activityId === 'choice_board') {
          var picker = root.querySelector('[data-cb-picker]');
          var stage = root.querySelector('[data-cb-stage]');
          if (picker && picker.hidden && stage) {
            var pTitle = stage.querySelector('.tw-passage .sw-h3');
            var pBody = stage.querySelector('.tw-passage-body');
            var sPrompt = stage.querySelector('.sw-prompt');
            if (pTitle) add(pTitle.textContent);
            if (pBody) add(pBody.textContent);
            if (sPrompt) add(sPrompt.textContent);
          }
          if (!parts.length) {
            add(item && item.goal);
            add((item && item.prompt) || L.cb_directions);
          }
        } else if (activityId === 'tiered_writing') {
          add(item && item.passageTitle);
          add(item && item.passage);
          add(item && item.prompt);
          add(L.tw_directions);
        } else if (activityId === 'sequence_order') {
          add((item && item.prompt) || L.sq_directions);
          add(L.sq_directions);
        } else {
          add((item && item.prompt) || L.cs_directions);
          add(L.cs_directions);
        }
        return parts.map(function (p) { return /[.!?]$/.test(p) ? p : p + '.'; }).join(' ');
      };

      var cleanup = function () {
        disconnectObs();
        if (doc) {
          doc.removeEventListener('keydown', onKeyDown);
          doc.removeEventListener('click', onDocClick, true);
        }
        if (view) {
          view.removeEventListener('pagehide', onUnload);
          view.removeEventListener('beforeunload', onUnload);
        }
      };

      var onKeyDown = function (ev) {
        if (!root.isConnected) { cleanup(); return; }
        var k = ev && ev.key;
        if ((k === 'Escape' || k === 'Esc') && speaking) stopSpeech();
      };

      var onDocClick = function (ev) {
        if (!root.isConnected) { cleanup(); return; }
        if (!speaking || !ev || !ev.target) return;
        var t = ev.target.closest ? ev.target.closest('button') : null;
        if (!t || t === readBtn) return;
        if (t.hasAttribute('data-stop-audio') || t.hasAttribute('data-cb-switch') || t.hasAttribute('data-cb-pick') || /stop audio/i.test(String(t.textContent || ''))) {
          stopSpeech();
        }
      };

      var onUnload = function () {
        stopSpeech();
        cleanup();
      };

      if (synth && doc) {
        doc.addEventListener('keydown', onKeyDown);
        doc.addEventListener('click', onDocClick, true);
      }
      if (synth && view) {
        view.addEventListener('pagehide', onUnload);
        view.addEventListener('beforeunload', onUnload);
      }

      var speakNow = function () {
        if (!synth) return;
        if (speaking) { stopSpeech(); return; }
        var text = getVisiblePromptText();
        if (!text) return;
        if (typeof ctx.support === 'function') ctx.support('readAloud');
        gen++;
        var mine = gen;
        try { if (typeof synth.cancel === 'function') synth.cancel(); } catch (_) {}
        var Utter = typeof view.SpeechSynthesisUtterance === 'function' ? view.SpeechSynthesisUtterance : null;
        var u = Utter ? new Utter(text) : { text: text, rate: 1.0, lang: 'en-US' };
        u.rate = readRate();
        var lang = (doc && doc.documentElement && doc.documentElement.lang) || 'en-US';
        u.lang = lang;
        try {
          if (typeof synth.getVoices === 'function') {
            var voices = synth.getVoices() || [];
            var want = String(lang).toLowerCase().split('-')[0];
            var local = voices.filter(function (v) {
              return v && v.localService === true && String(v.lang || '').toLowerCase().replace('_', '-').indexOf(want) === 0;
            })[0];
            if (local) { u.voice = local; u.lang = local.lang || lang; }
          }
        } catch (_) {}
        u.onend = function () { if (mine === gen) setBtnState(false); };
        u.onerror = function () { if (mine === gen) setBtnState(false); };
        setBtnState(true);
        if (view && typeof view.MutationObserver === 'function' && doc && doc.body) {
          disconnectObs();
          obs = new view.MutationObserver(function () {
            if (!root.isConnected) { stopSpeech(); cleanup(); }
          });
          try { obs.observe(doc.getElementById('app') || doc.body, { childList: true, subtree: true }); } catch (_) {}
        }
        try {
          synth.speak(u);
        } catch (_) {
          if (mine === gen) setBtnState(false);
        }
      };

      readBtn = ctx.el('button', {
        type: 'button',
        class: 'sw-btn-sm',
        'data-read-aloud-btn': '',
        'aria-pressed': 'false',
        hidden: !synth,
        on: { click: speakNow },
        text: 'Read aloud',
      });

      var toolsRow = root.querySelector('.sw-tools-row');
      if (toolsRow) {
        toolsRow.insertBefore(readBtn, toolsRow.firstChild);
      } else {
        var newRow = ctx.el('div', { class: 'row sw-tools-row' }, [readBtn]);
        var anchor = root.querySelector('.sw-sub') || root.querySelector('.sw-prompt') || root.querySelector('.cb-goal');
        if (anchor && anchor.parentNode === root) {
          root.insertBefore(newRow, anchor.nextSibling);
        } else {
          root.insertBefore(newRow, root.firstChild);
        }
      }

      var origReveal = handle && typeof handle.reveal === 'function' ? handle.reveal : null;
      return Object.assign({}, handle, {
        reveal: function () {
          stopSpeech();
          if (origReveal) return origReveal.apply(handle, arguments);
        },
      });
    };
  }

  function wrapChoiceAdapters(rawAdapters) {
    var out = {};
    Object.keys(rawAdapters || {}).forEach(function (id) {
      var spec = rawAdapters[id];
      if (!spec || typeof spec.render !== 'function') { out[id] = spec; return; }
      var origRender = spec.render;
      var wrapped = function (item, ctx) {
        return choiceReadAloudWrapper(origRender, id)(item, ctx);
      };
      var src = '(' + choiceReadAloudWrapper.toString() + ')(' + origRender.toString() + ',' + JSON.stringify(id) + ')';
      wrapped.toString = function () { return src; };
      out[id] = Object.assign({}, spec, { render: wrapped });
    });
    return out;
  }

  var READ_ALOUD_CSS = '[data-read-aloud-btn][aria-pressed=true]{background:var(--accent);color:var(--accent-ink);border-color:var(--accent);font-weight:700;outline:none}[data-read-aloud-btn]:focus-visible{outline:3px solid var(--focus);outline-offset:2px}@media (forced-colors:active){[data-read-aloud-btn][aria-pressed=true]{forced-color-adjust:none;border:2px solid Highlight;background:Highlight;color:HighlightText}}@media print{[data-read-aloud-btn]{display:none!important}}';

  function fileName(title, mode, learner) {
    var base = slug(title || 'choice-packet', 48);
    var suffix = mode === 'probe' || mode === 'check' ? '-check' : '-practice';
    var who = codeName(learner);
    var whoPart = who ? '__' + slug(who, 28) : '';
    return base + suffix + whoPart + '.html';
  }

  function normalizeItemsForActivity(activity, rawItems, adaptersMod) {
    var list = Array.isArray(rawItems) ? rawItems : [rawItems];
    var out = [];
    list.forEach(function (raw, idx) {
      if (!raw || typeof raw !== 'object') return;
      var norm = null;
      if (activity === 'concept_sort') {
        norm = adaptersMod.normalizeConceptSortItem(raw, idx);
        if (norm.categories.length < 2 || norm.cards.length < 2) return;
      } else if (activity === 'sequence_order') {
        norm = adaptersMod.normalizeSequenceOrderItem(raw, idx);
        if (norm.steps.length < 3) return;
      } else if (activity === 'tiered_writing') {
        norm = adaptersMod.normalizeTieredWritingItem(raw, idx);
      } else if (activity === 'choice_board') {
        norm = adaptersMod.normalizeChoiceBoardItem(raw, idx);
        if (norm.pathways.length < 2) return;
      }
      if (norm) out.push(norm);
    });
    return out;
  }

  function lessonFromChoice(input, explicitAdapters) {
    var cfg = input && typeof input === 'object' ? input : {};
    var adaptersMod = resolveAdapters(explicitAdapters || cfg.adapters);
    var activity = CHOICE_ACTIVITIES.indexOf(cfg.activity) >= 0 ? cfg.activity : 'choice_board';
    var rawMode = cfg.mode === 'probe' || cfg.mode === 'check' ? 'probe' : 'practice';
    var mode = rawMode === 'probe' && CHECK_CAPABLE[activity] ? 'probe' : 'practice';

    var rawItems = Array.isArray(cfg.items) && cfg.items.length ? cfg.items : (cfg.item ? [cfg.item] : [cfg]);
    var items = normalizeItemsForActivity(activity, rawItems, adaptersMod);
    if (!items.length) {
      if (activity === 'concept_sort') throw new Error('Concept Sort needs at least 2 categories and 2 cards.');
      if (activity === 'sequence_order') throw new Error('Sequence Order needs at least 3 steps.');
      if (activity === 'choice_board') throw new Error('Choice Board needs at least 2 complete pathways.');
      throw new Error('At least one complete item is required.');
    }

    var defaultTitles = {
      concept_sort: 'Concept Sort Practice',
      sequence_order: 'Sequence Order Practice',
      tiered_writing: 'Tiered Writing Practice',
      choice_board: 'UDL Choice Board',
    };
    var title = str(cfg.title || (items[0] && items[0].word) || defaultTitles[activity], 80);
    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(Boolean).slice(0, 6)
      : [];
    var bilingualGlossary = {};
    if (Array.isArray(cfg.bilingualGlossary)) {
      cfg.bilingualGlossary.slice(0, 60).forEach(function (entry) {
        if (!entry || typeof entry !== 'object') return;
        var w = str(entry.en || entry.word, 80);
        if (w && entry.translations && typeof entry.translations === 'object') {
          bilingualGlossary[w] = clone(entry.translations);
        }
      });
    } else if (cfg.bilingualGlossary && typeof cfg.bilingualGlossary === 'object') {
      bilingualGlossary = clone(cfg.bilingualGlossary);
    }
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;

    var basis = JSON.stringify({
      v: VERSION,
      activity: activity,
      mode: mode,
      title: title,
      items: items,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
      form: mode === 'probe' ? str(cfg.form || 'Form A', 40) : '',
      timeLimitS: mode === 'probe' && Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null,
    });
    var rev = 'c' + fnv1a(basis);
    var lessonId = slug(title, 36) + '-' + activity.replace(/_/g, '-') + '-' + rev.slice(0, 5);

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: mode,
      blocks: [{ activity: activity, items: items }],
      activityTitles: {},
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
    };
    lesson.activityTitles[activity] = adaptersMod.ADAPTERS[activity].title;
    if (mode === 'probe') {
      lesson.form = str(cfg.form || 'Form A', 40);
      lesson.timeLimitS = Number(cfg.timeLimitS) > 0 ? Math.round(Number(cfg.timeLimitS)) : null;
      lesson.check = {
        measure: activity,
        scoreUnit: 'items_correct',
        allowSkip: true,
        scoringVersion: 1,
        formVersion: 1,
      };
    }
    if (homeLanguages.length) lesson.homeLanguages = homeLanguages;
    if (hasGlossary) lesson.bilingualGlossary = bilingualGlossary;
    if (cfg.stationMode === true) lesson.stationMode = true;
    return lesson;
  }

  function buildChoicePacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var adaptersMod = resolveAdapters(opts.adapters);
    var loader = resolveLoader(opts.loader);
    var lesson = opts.lesson && Array.isArray(opts.lesson.blocks) ? clone(opts.lesson) : lessonFromChoice(opts, adaptersMod);

    var isProbe = lesson.mode === 'probe';
    var rawLangs = opts.homeLanguages != null ? opts.homeLanguages : lesson.homeLanguages;
    var hasLangs = Array.isArray(rawLangs) ? rawLangs.length > 0 : !!(typeof rawLangs === 'string' && rawLangs.trim());
    var rawGloss = opts.bilingualGlossary != null ? opts.bilingualGlossary : lesson.bilingualGlossary;
    var hasGloss = !!(rawGloss && typeof rawGloss === 'object' && Object.keys(rawGloss).length > 0);
    var wrappedAdapters = wrapChoiceAdapters(adaptersMod.ADAPTERS);
    var buildOpts = {
      extraAdapters: isProbe ? undefined : wrappedAdapters,
      adapters: isProbe ? wrappedAdapters : undefined,
      core: isProbe ? { soundAnswerMatches: function () { return false; } } : undefined,
      extraCss: [adaptersMod.EXTRA_CSS, READ_ALOUD_CSS].filter(Boolean).join('\n'),
      title: opts.title || lesson.title,
      labels: opts.labels,
      teacherCode: opts.teacherCode,
      qrPublicKey: opts.qrPublicKey,
      qrCrypto: opts.qrCrypto,
      stationMode: opts.stationMode === true || lesson.stationMode === true,
      homeLanguages: hasLangs ? rawLangs : undefined,
      bilingualGlossary: hasGloss ? rawGloss : undefined,
      stationBilingual: opts.stationBilingual || root.AlloPacketStationBilingual,
      builderMeta: {
        kind: 'choice-sort-write',
        version: VERSION,
        activity: lesson.blocks[0] ? lesson.blocks[0].activity : 'choice_board',
      },
    };

    var baseHtml = withSpeechManifest(loader.buildHtml(lesson, buildOpts));
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var plain = fileName(lesson.title, lesson.mode, '');
    var name = fileName(lesson.title, lesson.mode, cleanLearner);
    var bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(html).length : html.length;
    var activity = lesson.blocks[0] ? lesson.blocks[0].activity : 'choice_board';
    var itemCount = lesson.blocks.reduce(function (n, b) { return n + (Array.isArray(b.items) ? b.items.length : 0); }, 0);

    return {
      html: html,
      baseHtml: baseHtml,
      bytes: bytes,
      lesson: lesson,
      name: name,
      plain: plain,
      learner: cleanLearner,
      activity: activity,
      mode: lesson.mode === 'probe' ? 'probe' : 'practice',
      itemCount: itemCount,
      revision: lesson.revision,
    };
  }

  // Safely inspect an existing .html file created by this maker (reads JSON blocks only, executes nothing).
  function readChoicePacket(input, verifyCore) {
    var verify = verifyCore || root.AlloPacketVerify;
    var fail = function (kind, why, page) {
      return { ok: false, kind: kind, why: why, page: page || null, notes: [] };
    };
    if (!verify || typeof verify.readParts !== 'function') {
      return fail('other', 'This page could not load the file reader. Load the page again.');
    }
    var parts = verify.readParts(input);
    if (parts.refused === 'too_big') return fail('other', 'This file is larger than 60 MB.');
    if (parts.refused === 'empty') return fail('other', 'This file is empty.');
    if (parts.refused) return fail('other', 'This browser could not read the file.');
    if (parts.kind === 'results') {
      return fail('results', 'This is a results file, not a practice file. Add up results reads it.', { href: 'packets-results.html', name: 'Add up results' });
    }
    if (!parts.ok || !parts.lesson) {
      return fail('other', 'This is not a packet file made with this page. Choose the .html file you saved in step 3.');
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest || {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks.filter(function (b) { return b && typeof b.activity === 'string' && Array.isArray(b.items); }) : [];
    if (!blocks.length || !blocks.every(function (b) { return CHOICE_ACTIVITIES.indexOf(b.activity) >= 0; })) {
      return fail('other', 'This packet uses another activity type. Open it in the maker page that built it.', { href: 'packets.html', name: 'Packets home' });
    }
    var activity = blocks[0].activity;
    var mode = lesson.mode === 'probe' || (manifest.packet && manifest.packet.mode === 'check') ? 'probe' : 'practice';
    var notes = [];
    var teacherCode = !!(lesson.check && lesson.check.lock);
    if (mode === 'probe') {
      notes.push('Check mode hides answers inside the file, so review the answer categories or order before saving again.');
    }
    if (teacherCode) {
      notes.push('A teacher code is not stored in plain text inside the file. Enter it again if needed.');
    }
    var homeLanguages = [];
    if (lesson.bilingual && Array.isArray(lesson.bilingual.codes)) {
      homeLanguages = lesson.bilingual.codes.map(function (c) { return String(c || '').toLowerCase(); }).filter(Boolean);
    } else if (Array.isArray(lesson.homeLanguages)) {
      homeLanguages = lesson.homeLanguages.slice();
    }
    return {
      ok: true,
      kind: 'choice',
      title: str(lesson.title || manifest.title, 80),
      activity: activity,
      mode: mode,
      form: str(lesson.form, 40),
      timeLimitS: lesson.timeLimitS || null,
      items: clone(blocks[0].items),
      homeLanguages: homeLanguages,
      bilingualGlossary: lesson.bilingual && lesson.bilingual.glossary && typeof lesson.bilingual.glossary === 'object' ? clone(lesson.bilingual.glossary) : {},
      stationMode: lesson.stationMode === true || manifest.stationMode === true,
      qrPublicKey: (lesson.qr && typeof lesson.qr.k === 'string') ? lesson.qr.k : '',
      learner: codeName(manifest.learner || ''),
      teacherCode: teacherCode,
      notes: notes,
    };
  }

  var api = {
    VERSION: VERSION,
    CHOICE_ACTIVITIES: CHOICE_ACTIVITIES,
    CHECK_CAPABLE: CHECK_CAPABLE,
    SVG_ICONS: SVG_ICONS,
    templates: templates,
    templateById: templateById,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
    lessonFromChoice: lessonFromChoice,
    buildChoicePacket: buildChoicePacket,
    readChoicePacket: readChoicePacket,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketChoice = api;
})(typeof window !== 'undefined' ? window : globalThis);
