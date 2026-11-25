// Deterministic CBM-Maze 3-Minute Reading Comprehension Probe builder, self-contained adapter, and reopen reader.
// Plain UMD script for browser pages (window.AlloPacketMaze) and Node (module.exports).
// Zero network, zero storage, zero markup strings. Identical inputs always produce the exact same probe.
(function (root) {
  'use strict';

  var VERSION = 1;
  var DEFAULT_EVERY_N = 7;
  var MIN_EVERY_N = 5;
  var MAX_EVERY_N = 10;
  var DEFAULT_TIME_LIMIT_S = 180;
  var MAX_ITEMS = 50;

  // Curated standalone distractor bank grouped by rough morphological/POS class and length band.
  // Used standalone and blended with word_sounds_wordlist_en when loaded in the browser.
  var CURATED_BANK = {
    ing: [
      'baking', 'jumping', 'singing', 'folding', 'packing', 'painting', 'sailing', 'barking',
      'cooking', 'drifting', 'floating', 'knotting', 'melting', 'mowing', 'peeling', 'rowing',
      'skating', 'smiling', 'spinning', 'tapping', 'waving', 'yawning', 'clapping', 'cheering',
      'digging', 'hopping', 'jogging', 'napping', 'ringing', 'shouting', 'whistling', 'sweeping',
    ],
    ed: [
      'baked', 'jumped', 'folded', 'packed', 'painted', 'sailed', 'barked', 'cooked',
      'drifted', 'floated', 'melted', 'peeled', 'rowed', 'skated', 'smiled', 'tapped',
      'waved', 'yawned', 'clapped', 'cheered', 'hopped', 'jogged', 'napped', 'shouted',
      'whistled', 'brushed', 'climbed', 'danced', 'mended', 'planted', 'splashed', 'zipped',
    ],
    ly: [
      'loudly', 'brightly', 'softly', 'slowly', 'neatly', 'calmly', 'boldly', 'briefly',
      'cleanly', 'deeply', 'faintly', 'firmly', 'gently', 'gladly', 'kindly', 'lightly',
      'nearly', 'plainly', 'proudly', 'quickly', 'quietly', 'rarely', 'sharply', 'smoothly',
      'sweetly', 'warmly', 'widely', 'wildly', 'wisely', 'briskly', 'clearly', 'closely',
    ],
    pl: [
      'apples', 'baskets', 'buttons', 'candles', 'carrots', 'clocks', 'clouds', 'coins',
      'dishes', 'drums', 'feathers', 'fences', 'gloves', 'hammers', 'jackets', 'kettles',
      'ladders', 'lanterns', 'marbles', 'mittens', 'napkins', 'pebbles', 'pencils', 'pillows',
      'pockets', 'puddles', 'ribbons', 'sandals', 'shelves', 'shovels', 'spoons', 'tickets',
      'towels', 'wagons', 'windows', 'zippers', 'anchors', 'blankets', 'cabinets', 'helmets',
    ],
    func: [
      'under', 'beside', 'during', 'before', 'without', 'around', 'behind', 'across',
      'between', 'beyond', 'inside', 'toward', 'unless', 'while', 'above', 'along',
      'among', 'below', 'since', 'until', 'about', 'after', 'through', 'against',
    ],
    base: [
      'apple', 'basket', 'blanket', 'bottle', 'branch', 'bridge', 'bucket', 'button',
      'cabin', 'camera', 'candle', 'carpet', 'carrot', 'castle', 'chair', 'chalk',
      'cherry', 'clock', 'closet', 'cloud', 'clover', 'collar', 'compass', 'cookie',
      'copper', 'cotton', 'crayon', 'curtain', 'cushion', 'desert', 'dinner', 'donkey',
      'drawer', 'drum', 'feather', 'fence', 'fiddle', 'flannel', 'flower', 'forest',
      'fountain', 'garden', 'garlic', 'glacier', 'glove', 'gravel', 'guitar', 'hammer',
      'harbor', 'helmet', 'honey', 'island', 'jacket', 'jungle', 'kettle', 'kitchen',
      'ladder', 'lantern', 'lemon', 'letter', 'lizard', 'locker', 'magnet', 'marble',
      'market', 'meadow', 'melon', 'mirror', 'mitten', 'monkey', 'muffin', 'napkin',
      'needle', 'noodle', 'orange', 'orchard', 'paddle', 'palace', 'pancake', 'parrot',
      'pebble', 'pencil', 'pepper', 'picnic', 'pillow', 'pirate', 'planet', 'pocket',
      'poster', 'potato', 'puddle', 'pumpkin', 'puppet', 'purple', 'puzzle', 'rabbit',
      'radish', 'raisin', 'ribbon', 'rocket', 'saddle', 'salmon', 'sandal', 'scooter',
      'shadow', 'shovel', 'silver', 'singer', 'skillet', 'slipper', 'soccer', 'socket',
      'sparrow', 'spider', 'sponge', 'spoon', 'squirrel', 'staple', 'statue', 'sweater',
      'teapot', 'thimble', 'ticket', 'timber', 'toaster', 'tomato', 'towel', 'tractor',
      'tunnel', 'turkey', 'turnip', 'turtle', 'umbrella', 'valley', 'velvet', 'violin',
      'waffle', 'wagon', 'walnut', 'washer', 'whistle', 'window', 'winter', 'zipper',
      'bright', 'bumpy', 'chilly', 'clever', 'cloudy', 'clumsy', 'crispy', 'curly',
      'dusty', 'empty', 'fluffy', 'foggy', 'frosty', 'gentle', 'glossy', 'golden',
      'grainy', 'hollow', 'humble', 'jolly', 'lively', 'muddy', 'narrow', 'noisy',
      'pebbly', 'plump', 'polish', 'prickly', 'quiet', 'rusty', 'salty', 'shiny',
      'silky', 'sleepy', 'smooth', 'snowy', 'speckled', 'spicy', 'square', 'starry',
      'sticky', 'stormy', 'striped', 'sturdy', 'sunny', 'velvety', 'windy', 'wooden',
      'bounce', 'borrow', 'bundle', 'carve', 'chuckle', 'clatter', 'collect', 'crumble',
      'doodle', 'drizzle', 'fasten', 'flutter', 'gather', 'giggle', 'glimmer', 'grumble',
      'huddle', 'juggle', 'kindle', 'linger', 'mumble', 'nibble', 'paddle', 'patter',
      'polishing', 'rattle', 'rumble', 'scramble', 'shimmer', 'shuffle', 'sketch', 'snuggle',
      'sparkle', 'splatter', 'sprinkle', 'stumble', 'tangle', 'tinker', 'tumble', 'twinkle',
      'wander', 'whisper', 'wiggle', 'wobble', 'wrinkle',
    ],
  };

  var FUNCTION_WORDS = {
    about: 1, above: 1, across: 1, after: 1, against: 1, along: 1, among: 1, around: 1,
    because: 1, before: 1, behind: 1, below: 1, beneath: 1, beside: 1, between: 1, beyond: 1,
    during: 1, every: 1, inside: 1, into: 1, neither: 1, other: 1, outside: 1, over: 1,
    since: 1, some: 1, than: 1, that: 1, their: 1, them: 1, then: 1, there: 1, these: 1,
    they: 1, this: 1, those: 1, through: 1, toward: 1, under: 1, unless: 1, until: 1,
    what: 1, when: 1, where: 1, which: 1, while: 1, with: 1, within: 1, without: 1,
  };

  var STARTER_PASSAGES = [
    {
      id: 'g2_3_pond_helpers',
      bandKey: '2-3',
      form: 'A',
      canonicalId: 'maze-reading-g2-3',
      gradeBand: 'Grades 2-3',
      title: 'The Busy Pond Behind the School',
      summary: 'Form A · Nonfiction passage about frogs, dragonflies, and seasonal pond life (~175 words).',
      everyN: 7,
      passage: [
        'Behind our elementary school sits a quiet little pond ringed by tall green reeds. Every morning before class, students walk along the wooden boardwalk to watch animals wake up in the sunlight.',
        'Tiny green frogs rest on wide lily pads while bright blue dragonflies dart above the clear water. The dragonflies hunt mosquitoes in midair and help keep the outdoor classroom comfortable during warm spring afternoons. Underneath the glassy surface, minnows dart between mossy rocks whenever a shadow passes overhead.',
        'Tall cattails grow along the muddy shore and give red-winged blackbirds a sturdy spot to weave their woven nests. In early summer, ducklings paddle in a neat line behind their mother as they search for tender water plants and small seeds.',
        'When autumn arrives, crisp orange leaves drift onto the pond and sink slowly toward the bottom. Frogs burrow into the soft mud to sleep through the cold winter months. Students record each seasonal change in their science notebooks and wait eagerly for spring to return.',
      ].join('\n\n'),
    },
    {
      id: 'g2_3_garden_pollinators',
      bandKey: '2-3',
      form: 'B',
      canonicalId: 'maze-reading-g2-3',
      gradeBand: 'Grades 2-3',
      title: 'How Backyard Pollinators Help Gardens Grow',
      summary: 'Form B · Parallel nonfiction passage about bees, butterflies, and backyard vegetable gardens (~175 words).',
      everyN: 7,
      passage: [
        'Each spring, neighbors plant rows of bright flowers beside their vegetable gardens to welcome helpful insects. Whenever sunny weather arrives, fuzzy bumblebees hum from blossom to blossom across the yard.',
        'Bees land softly on yellow petals to sip sweet nectar stored deep inside each bloom. While they drink, dusty yellow pollen sticks to their furry legs and back. When a bee flies to the next plant, some pollen brushes off and helps new fruit and seeds begin to grow.',
        'Painted butterflies and tiny hummingbirds also visit tall garden flowers throughout the warm afternoon. Tomato vines, pumpkin plants, and apple trees all depend on these busy visitors to produce crisp harvests. Without animal helpers moving pollen between blooms, many garden beds would grow far fewer vegetables.',
        'Families help local pollinators by leaving shallow dishes of clean water near shady stones. They also plant clover, daisies, and lavender that bloom from early spring until cool autumn evenings. Watching gentle insects work among the leaves shows how plants and animals care for one another.',
      ].join('\n\n'),
    },
    {
      id: 'g2_3_school_library_map',
      bandKey: '2-3',
      form: 'C',
      canonicalId: 'maze-reading-g2-3',
      gradeBand: 'Grades 2-3',
      title: 'Finding Good Books in the School Library',
      summary: 'Form C · Parallel nonfiction passage about library shelves, book guides, and reading corners (~175 words).',
      everyN: 7,
      passage: [
        'Every Thursday afternoon, our class walks quietly down the hallway to visit the sunny school library. Tall wooden shelves hold hundreds of picture books, adventure stories, and nature guides waiting to be explored.',
        'Each shelf wears a neat paper label that shows where different topics belong in the room. Story books sit in alphabetical order by the author last name so readers can locate favorite writers quickly. Information books about space, trains, and ocean creatures rest together along the bright window wall.',
        'When a student searches for a book about volcanoes or baking bread, the librarian points to the simple computer catalog. Typing one topic word reveals the exact shelf number and whether the book is currently available. Colorful baskets near the rug hold new magazines, poetry collections, and puzzle books.',
        'After choosing two books, students carry them to the front desk to scan their library cards. Everyone tucks a paper bookmark inside the cover to remember when to return each book. Reading together on soft cushions turns Thursday into the calmest hour of the week.',
      ].join('\n\n'),
    },
    {
      id: 'g4_5_monarch_journey',
      bandKey: '4-5',
      form: 'A',
      canonicalId: 'maze-reading-g4-5',
      gradeBand: 'Grades 4-5',
      title: 'How Monarch Butterflies Cross a Continent',
      summary: 'Form A · Science passage on monarch migration, milkweed, and navigation (~205 words).',
      everyN: 7,
      passage: [
        'Each autumn, millions of bright orange monarch butterflies begin one of the longest insect journeys on Earth. Even though a single butterfly weighs less than a paper clip, it can glide thousands of miles from northern meadows to warm mountain forests.',
        'Monarchs rely on an internal biological compass to steer southward across wide rivers and busy towns. Tiny sensors in their antennae track the position of the sun across the sky throughout the day. When thick clouds hide the sun, the butterflies can still sense faint magnetic clues from the planet below them.',
        'Along the migration route, flowering gardens provide sweet nectar that fuels each stage of the flight. Milkweed plants play an especially vital role because monarch caterpillars eat only milkweed leaves as they grow. Planting native milkweed patches along roadsides and schoolyards gives traveling insects essential resting places.',
        'No single butterfly completes the entire round trip from north to south and back again. Instead, three or four generations share the northward return each spring. Scientists attach lightweight paper tags to butterfly wings so students and volunteers can map where each traveler lands.',
      ].join('\n\n'),
    },
    {
      id: 'g4_5_beaver_wetlands',
      bandKey: '4-5',
      form: 'B',
      canonicalId: 'maze-reading-g4-5',
      gradeBand: 'Grades 4-5',
      title: 'How Beavers Build Busy Wetland Homes',
      summary: 'Form B · Parallel science passage on beaver dams, lodges, and wetland ecosystems (~205 words).',
      everyN: 7,
      passage: [
        'Along quiet forest streams in North America, North American beavers reshape rushing creeks into calm wetland ponds. Using strong orange front teeth that never stop growing, a beaver chews through sturdy willow and aspen branches before dragging them into the current.',
        'Family members weave wooden poles, river stones, and thick mud together until a curved dam slows the flowing water. Behind that solid barrier, a deep pond spreads across the valley floor and stays liquid beneath winter ice. In the middle of the pool, beavers pile sticks into a dome-shaped lodge with underwater entrances.',
        'These busy builders transform the surrounding habitat for dozens of other woodland creatures. Herons wade through shallow edges to hunt small fish while painted turtles warm themselves on floating logs. Thick reeds and wild grasses filter muddy runoff and hold extra rainwater during heavy summer storms.',
        'During dry seasons, beaver ponds slowly release stored moisture back into downstream creeks and soil. Wildlife biologists sometimes invite beavers back into damaged valleys to restore healthy streams naturally. By simply building shelter for their own kits, beavers create thriving neighborhoods for entire river systems.',
      ].join('\n\n'),
    },
    {
      id: 'g4_5_weather_balloons',
      bandKey: '4-5',
      form: 'C',
      canonicalId: 'maze-reading-g4-5',
      gradeBand: 'Grades 4-5',
      title: 'How Weather Balloons Forecast Approaching Storms',
      summary: 'Form C · Parallel science passage on atmospheric sensors, wind layers, and daily weather forecasts (~205 words).',
      everyN: 7,
      passage: [
        'Twice every day at weather stations around the globe, forecasters release giant white balloons filled with lifting gas into the sky. Beneath each stretchy latex sphere hangs a small instrument box that weighs less than a loaf of bread.',
        'As the balloon climbs higher than commercial jet airplanes, thin air causes the outer shell to expand wider and wider. Along the entire climb, tiny electronic sensors measure air temperature, moisture levels, and atmospheric pressure every single second. A small radio transmitter beams those numbers straight back to computers on the ground.',
        'Tracking how fast the balloon drifts sideways also reveals wind speed and direction at dozens of altitudes. Knowing where warm humid currents collide with cold northern air helps meteorologists predict thunderstorms, snow squalls, and sudden temperature drops. Satellite photos show cloud tops from above, while balloon instruments look directly inside moving air masses.',
        'Nearly twenty miles above Earth, the stretched balloon finally pops and a bright orange parachute opens automatically. The gentle chute lowers the tiny sensor box safely back toward fields or forests below. Each paper label invites anyone who discovers the package to mail the instrument back for careful reuse.',
      ].join('\n\n'),
    },
    {
      id: 'g6_8_tidal_clocks',
      bandKey: '6-8',
      form: 'A',
      canonicalId: 'maze-reading-g6-8',
      gradeBand: 'Grades 6-8',
      title: 'Living by the Rhythm of the Tides',
      summary: 'Form A · Earth science passage exploring ocean tides and intertidal survival (~225 words).',
      everyN: 7,
      passage: [
        'Twice each day along rocky ocean coastlines, seawater slowly retreats to reveal shallow pools teeming with marine life. This steady rise and fall happens because the gravitational pull of the moon and the sun tugs gently on Earth oceans as the planet rotates.',
        'Creatures living inside the intertidal zone must survive two sharply different worlds within a single afternoon. At high tide, crashing waves sweep fresh oxygen and microscopic plankton across the ledges. Hours later at low tide, those same rocks bake under direct sunlight while hungry shorebirds patrol the damp crevices for meals.',
        'To endure these dramatic swings, coastal organisms evolved remarkable structural and behavioral adaptations. Barnacles cement their conical shells tightly onto granite boulders and seal their narrow openings to trap precious moisture inside. Sea anemones pull their feathery tentacles inward until they resemble glossy beads clinging to shaded walls.',
        'Meanwhile, sea stars use hundreds of hydraulic tube feet to grip slippery stone while prying apart sturdy mussel shells. Marine biologists visit low-tide pools with waterproof clipboards to count species across narrow elevation bands. Tracking how those communities shift over several years helps researchers detect subtle changes in coastal water temperatures.',
      ].join('\n\n'),
    },
    {
      id: 'g6_8_cave_ecosystems',
      bandKey: '6-8',
      form: 'B',
      canonicalId: 'maze-reading-g6-8',
      gradeBand: 'Grades 6-8',
      title: 'Surviving Without Sunlight Inside Deep Caves',
      summary: 'Form B · Parallel life science passage examining subterranean food webs and cave adaptations (~225 words).',
      everyN: 7,
      passage: [
        'Far beyond the sunlit entrance of a limestone cavern, total darkness blankets winding tunnels where no green leaf can perform photosynthesis. Yet quiet underground streams and damp mineral walls still support specialized communities of blind fish, pale crayfish, and delicate beetles.',
        'Because sunlight never reaches these deep chambers, cave food webs depend heavily on nutrients imported from the surface world above. Seasonal rainstorms wash decaying autumn leaves, wooden twigs, and soil bacteria down through narrow sinkholes into underground pools. Roosting bats also enrich the cavern floor each evening when they return from hunting moths across open meadows.',
        'Over thousands of generations, permanent cave dwellers developed distinctive traits suited to scarce food and constant cool humidity. Many species lost dark skin pigments and working eyes, conserving vital energy that would be wasted in pitch darkness. In return, these organisms rely on extra-long antennae and sensitive skin receptors to detect tiny ripples in still water.',
        'Because subterranean species grow slowly and reproduce infrequently, cave habitats recover very slowly from pollution or careless disturbance. Hydrologists trace underground streams using harmless vegetable dyes to learn which surface farms and highways drain into fragile caverns. Protecting clean groundwater near cave entrances preserves both unusual wildlife and community drinking supplies.',
      ].join('\n\n'),
    },
    {
      id: 'g6_8_bridge_trusses',
      bandKey: '6-8',
      form: 'C',
      canonicalId: 'maze-reading-g6-8',
      gradeBand: 'Grades 6-8',
      title: 'Why Triangular Trusses Keep Long Bridges Steady',
      summary: 'Form C · Parallel engineering passage examining structural forces, tension, and truss bridge geometry (~225 words).',
      everyN: 7,
      passage: [
        'Whenever heavy freight trucks or commuter trains rumble across a wide river bridge, unseen forces push and pull through every steel beam. Civil engineers must channel that downward weight toward sturdy concrete piers without letting the roadway sag or twist.',
        'A plain flat plank bends easily in the middle when someone stands near its center, stretching the bottom edge while squeezing the top. By arranging straight steel bars into connected triangles called trusses, builders create a rigid skeleton that resists bending far better than solid beams of similar weight. Unlike squares or rectangles, a triangle cannot collapse into a slanted shape unless one of its sides actually stretches or snaps.',
        'Inside a truss bridge, each angled strut shares part of the shifting traffic load across neighboring joints. Top chords usually experience strong compression that pushes steel atoms tighter together, while lower beams carry tension that pulls them lengthwise. Because open triangles let gusty valley winds pass straight through the frame, the structure avoids dangerous sideways swaying during autumn gales.',
        'Before opening a new bridge to daily commuters, inspection teams place electronic strain gauges along critical bolts and steel plates. Measuring tiny microscopic shifts under loaded test trucks confirms that every joint performs within strict engineering margins. Routine painting and winter salt washing keep rust from weakening hidden corners for generations.',
      ].join('\n\n'),
    },
    {
      id: 'g9_12_urban_canopy',
      bandKey: '9-12',
      form: 'A',
      canonicalId: 'maze-reading-g9-12',
      gradeBand: 'Grades 9-12',
      title: 'Designing Cooler Cities With Urban Tree Canopies',
      summary: 'Form A · Informational passage examining urban heat islands and green infrastructure (~240 words).',
      everyN: 7,
      passage: [
        'On clear summer afternoons, neighborhoods packed with dark asphalt roads and flat rooftops often register several degrees hotter than nearby wooded parks. Urban planners call this temperature gap the urban heat island effect, and it places extra strain on local power grids and public health.',
        'Expanding a city tree canopy offers one of the most practical strategies for cooling dense residential blocks. Broad leafy crowns intercept solar radiation before it warms concrete sidewalks and brick walls. At the same time, living leaves release invisible moisture into surrounding air through transpiration, creating a natural cooling breeze along shaded streets.',
        'Well-planned urban forests also perform valuable stormwater management during heavy seasonal rainstorms. Deep root networks loosen compacted soil so rainfall can soak underground instead of rushing straight into overloaded storm drains. Filtering runoff through soil and gravel reduces sediment and oil pollution before streams carry water toward lakes and bays.',
        'Building an equitable canopy requires careful collaboration with local residents rather than planting identical saplings everywhere. Arborists select drought-tolerant native species whose roots will not buckle narrow sidewalks or tangle with overhead utility lines. When community stewards help water young trees during their first three summers, survival rates climb sharply and shaded corridors endure for decades.',
      ].join('\n\n'),
    },
    {
      id: 'g9_12_kelp_forests',
      bandKey: '9-12',
      form: 'B',
      canonicalId: 'maze-reading-g9-12',
      gradeBand: 'Grades 9-12',
      title: 'How Underwater Kelp Forests Buffer Coastal Storms',
      summary: 'Form B · Parallel environmental science passage on kelp ecosystems, wave energy, and coastal resilience (~240 words).',
      everyN: 7,
      passage: [
        'Just offshore along cool temperate coastlines, towering strands of giant kelp anchor to rocky reefs and stretch dozens of feet toward sunlit surface waters. Tiny gas-filled bladders along each flexible blade keep the golden canopy buoyant even as surging swells sweep across the shelf.',
        'Marine ecologists compare dense kelp beds to underwater forests because their layered structure shelters hundreds of fish, crabs, and juvenile shellfish from open-ocean predators. Equally important, thick ribbons of moving algae create friction that dampens incoming storm waves before they strike sandy beaches and harbor seawalls. Slower coastal currents reduce shoreline erosion and allow suspended sand to settle gently back along nearshore coves.',
        'Healthy kelp forests also cycle large quantities of dissolved carbon rapidly during bright spring growing seasons. Unlike slow-growing terrestrial timber, giant kelp can extend more than a foot per day when cold nutrient-rich currents rise from deeper water. Maintaining balance inside this system relies heavily on natural grazers and predators working together.',
        'When warming ocean heatwaves weaken kelp blades or reduce key predators such as sea otters and predatory sea stars, hungry sea urchins can graze wide stretches down to bare stone. Coastal restoration groups now combine long-term reef monitoring with targeted urchin management and spore seeding near sheltered bays. Supporting resilient marine forests protects both local fisheries and coastal neighborhoods facing stronger winter storms.',
      ].join('\n\n'),
    },
    {
      id: 'g9_12_dark_skies',
      bandKey: '9-12',
      form: 'C',
      canonicalId: 'maze-reading-g9-12',
      gradeBand: 'Grades 9-12',
      title: 'Rethinking Streetlights to Protect Nighttime Ecosystems',
      summary: 'Form C · Parallel science and civic design passage on light pollution, nocturnal wildlife, and shielded lighting (~240 words).',
      everyN: 7,
      passage: [
        'For more than a century, expanding electric streetlamps transformed evening travel and extended commercial activity long after sunset across growing metropolitan regions. Yet unshielded fixtures that spill harsh glare sideways and upward have brightened night skies far beyond busy intersections.',
        'Biologists studying nocturnal ecosystems have documented how artificial skyglow disrupts biological rhythms evolved over millions of years of predictable darkness. Migrating songbirds navigating by starlight frequently veer off course around brightly lit glass towers, wasting critical energy reserves during autumn flights. Meanwhile, nocturnal moths and fireflies struggle to locate nectar blossoms or flashing mates beneath intense blue-white floodlights.',
        'Human communities experience unintended drawbacks from poorly aimed outdoor lighting as well. Glaring unshielded bulbs actually reduce visual clarity for pedestrians and drivers by forcing pupils to narrow against bright hotspots while nearby shadows grow deeper. Wasted upward illumination also represents millions of kilowatt-hours of electricity purchased without improving ground-level visibility.',
        'Fortunately, municipal lighting upgrades can preserve clear visibility along crosswalks while dramatically reducing stray skyglow. Full-cutoff fixtures direct light strictly downward where sidewalks and doorways require illumination, and warmer amber spectrum bulbs scatter far less across humid night air. Pairing shielded fixtures with simple motion timers lets towns trim public energy budgets while returning starry horizons and calmer night habitats to surrounding valleys.',
      ].join('\n\n'),
    },
  ];

  // Standard 2-item warm-up sentence used before the 3-minute clock in Check mode.
  var WARMUP_ITEMS = [
    {
      id: 'mz-warmup-1',
      word: 'Warm-up 1',
      practice: true,
      blankNum: 1,
      blankTotal: 2,
      contextLead: '',
      before: 'Every morning, the bakery opens its doors early. Warm bread fills the ',
      after: ' with a sweet smell.',
      choices: ['room', 'swim', 'blue'],
      answer: 'room',
    },
    {
      id: 'mz-warmup-2',
      word: 'Warm-up 2',
      practice: true,
      blankNum: 2,
      blankTotal: 2,
      contextLead: 'Every morning, the bakery opens its doors early. Warm bread fills the room with a sweet smell.',
      before: 'Neighbors stop by to ',
      after: ' fresh loaves before work.',
      choices: ['table', 'buy', 'purple'],
      answer: 'buy',
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

  function hashNum(text) {
    var h = 2166136261 >>> 0;
    var s = String(text || '');
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h >>> 0;
  }

  function slug(text, max) {
    var out = String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return (out || 'maze').slice(0, max || 48).replace(/-+$/, '') || 'maze';
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

  function fileName(title, mode, learner) {
    var base = slug(title || 'maze-probe', 48);
    var suffix = mode === 'probe' || mode === 'check' ? '-maze-check' : '-maze-practice';
    var who = codeName(learner);
    var whoPart = who ? '__' + slug(who, 28) : '';
    return base + suffix + whoPart + '.html';
  }

  // ---------------------------------------------------------------------------
  // Deterministic CBM-Maze Tokenization & Distractor Engine
  // ---------------------------------------------------------------------------
  function classifyWord(word) {
    var low = String(word || '').toLowerCase();
    if (FUNCTION_WORDS[low]) return 'func';
    if (low.length >= 6 && /ing$/.test(low)) return 'ing';
    if (low.length >= 5 && /ed$/.test(low) && !/eed$/.test(low)) return 'ed';
    if (low.length >= 5 && /ly$/.test(low)) return 'ly';
    if (low.length >= 4 && /s$/.test(low) && !/(?:ss|us|is|as|os)$/.test(low)) return 'pl';
    return 'base';
  }

  function matchCase(candidate, model) {
    var w = String(candidate || '').toLowerCase();
    if (!w) return w;
    if (/^[A-Z]/.test(String(model || ''))) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }
    return w;
  }

  var cachedWordlistIndex = null;
  function buildWordlistPool(explicitWordlist) {
    var wl = explicitWordlist || null;
    if (!wl && typeof root.createWordSoundsWordlist === 'function') {
      try { wl = root.createWordSoundsWordlist(); } catch (_) { wl = null; }
    }
    if (!wl || typeof wl.rows !== 'function') return null;
    if (!explicitWordlist && cachedWordlistIndex) return cachedWordlistIndex;
    var buckets = { ing: [], ed: [], ly: [], pl: [], func: [], base: [] };
    var rows = wl.rows();
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (!r || !r.word) continue;
      if (r.blocked || r.nearBlocked || r.dropBlocked || r.british || r.soft) continue;
      var w = String(r.word).toLowerCase();
      if (!/^[a-z]{3,14}$/.test(w)) continue;
      if (!((Number(r.books) || 0) >= 15 || (Number(r.rank) > 0 && Number(r.rank) <= 5000))) continue;
      var cls = classifyWord(w);
      if (buckets[cls].length < 400) buckets[cls].push(w);
    }
    if (!explicitWordlist) cachedWordlistIndex = buckets;
    return buckets;
  }

  function pickDistractors(targetWord, localWordsSet, seedStr, wlBuckets) {
    var low = String(targetWord || '').toLowerCase();
    var cls = classifyWord(low);
    var wantLen = low.length;
    var stem = low.slice(0, Math.min(4, low.length));

    // Blend curated bank + optional wordlist bucket (contrasting meanings, matched length/class).
    var primary = (CURATED_BANK[cls] || CURATED_BANK.base).slice();
    if (wlBuckets && Array.isArray(wlBuckets[cls]) && wlBuckets[cls].length) {
      primary = primary.concat(wlBuckets[cls]);
    }
    // Always include base content bank as secondary pool so distractors have clear meaning contrast.
    var secondary = CURATED_BANK.base.slice();
    if (wlBuckets && Array.isArray(wlBuckets.base) && wlBuckets.base.length) {
      secondary = secondary.concat(wlBuckets.base);
    }

    var isEligible = function (cand, maxDiff) {
      if (!cand || cand === low) return false;
      if (localWordsSet[cand]) return false;
      if (stem.length >= 4 && cand.slice(0, 4) === stem) return false;
      if (Math.abs(cand.length - wantLen) > maxDiff) return false;
      return true;
    };

    var collect = function (pool, maxDiff) {
      var seen = Object.create(null);
      var out = [];
      for (var i = 0; i < pool.length; i++) {
        var c = String(pool[i]).toLowerCase();
        if (seen[c] || !isEligible(c, maxDiff)) continue;
        seen[c] = true;
        out.push(c);
      }
      return out;
    };

    var pool = collect(primary, 2);
    if (pool.length < 6) pool = collect(primary.concat(secondary), 2);
    if (pool.length < 4) pool = collect(primary.concat(secondary), 4);
    if (pool.length < 2) pool = ['apple', 'bridge', 'basket', 'winter'].filter(function (w) { return w !== low; });

    var h1 = hashNum(seedStr + ':d1:' + low);
    var idx1 = h1 % pool.length;
    var d1 = pool[idx1];
    var h2 = hashNum(seedStr + ':d2:' + low);
    var idx2 = h2 % pool.length;
    var guard = 0;
    while ((pool[idx2] === d1 || pool[idx2].slice(0, 3) === d1.slice(0, 3)) && guard < pool.length) {
      idx2 = (idx2 + 1) % pool.length;
      guard++;
    }
    var d2 = pool[idx2];
    return [matchCase(d1, targetWord), matchCase(d2, targetWord)];
  }

  function orderThreeChoices(answer, d1, d2, seedStr) {
    var perms = [
      [answer, d1, d2],
      [d1, answer, d2],
      [d1, d2, answer],
      [answer, d2, d1],
      [d2, answer, d1],
      [d2, d1, answer],
    ];
    return perms[hashNum(seedStr) % perms.length];
  }

  function tokenizePassage(rawText) {
    var text = String(rawText || '').replace(/\r\n?/g, '\n').trim();
    var re = /([A-Za-z]+(?:['’-][A-Za-z]+)*|\d+(?:[.,]\d+)*|\s+|[^\sA-Za-z0-9]+)/g;
    var tokens = [];
    var m;
    while ((m = re.exec(text))) {
      var val = m[0];
      var isWord = /^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(val);
      var isSpace = /^\s+$/.test(val);
      var isSentEnd = !isWord && !isSpace && /[.!?]/.test(val);
      tokens.push({
        text: val,
        isWord: isWord,
        isSpace: isSpace,
        isSentEnd: isSentEnd,
        isParaBreak: isSpace && /\n\s*\n/.test(val),
      });
    }
    return tokens;
  }

  function generateMaze(passageText, options) {
    var opts = options && typeof options === 'object' ? options : {};
    var everyN = Math.max(MIN_EVERY_N, Math.min(MAX_EVERY_N, Math.round(Number(opts.everyN) || DEFAULT_EVERY_N)));
    var maxItems = Math.max(1, Math.min(60, Math.round(Number(opts.maxItems) || MAX_ITEMS)));
    var raw = String(passageText || '').replace(/\r\n?/g, '\n').trim();
    if (!raw) {
      return { passage: '', everyN: everyN, targets: [], items: [], stats: { totalWords: 0, sentenceOneWords: 0, targetCount: 0 } };
    }

    var tokens = tokenizePassage(raw);
    var totalWords = tokens.filter(function (t) { return t.isWord; }).length;

    // 1. Keep the entire first sentence intact (up to first sentence-ending punctuation or 24 words).
    var firstSentEndIdx = -1;
    var wordsInFirst = 0;
    for (var i = 0; i < tokens.length; i++) {
      if (tokens[i].isWord) wordsInFirst++;
      if (tokens[i].isSentEnd && wordsInFirst >= 4) {
        firstSentEndIdx = i;
        break;
      }
      if (wordsInFirst >= 24) {
        firstSentEndIdx = i;
        break;
      }
    }
    if (firstSentEndIdx < 0) firstSentEndIdx = tokens.length - 1;

    var sentenceStartAt = function (tokIdx) {
      for (var k = tokIdx - 1; k >= 0; k--) {
        if (tokens[k].isParaBreak) return true;
        if (tokens[k].isSpace) continue;
        return !!tokens[k].isSentEnd;
      }
      return true;
    };

    var isEligibleTarget = function (tokIdx) {
      var tok = tokens[tokIdx];
      if (!tok || !tok.isWord) return false;
      var w = tok.text;
      if (w.length < 3) return false;
      if (/['’-]/.test(w)) return false;
      if (/^[A-Z]{2,}$/.test(w)) return false; // acronym
      if (/^[A-Z]/.test(w) && !sentenceStartAt(tokIdx)) return false; // likely proper noun
      return true;
    };

    var seedBase = String(opts.seed || fnv1a(raw + '|' + everyN));
    var wlBuckets = buildWordlistPool(opts.wordlist);
    var overrides = opts.overrides && typeof opts.overrides === 'object' ? opts.overrides : {};

    // 2. Select every Nth word after sentence 1 (sliding forward slightly if Nth word is ineligible).
    var targetTokIndices = [];
    var wordStep = 0;
    var pendingDue = false;
    for (var ti = firstSentEndIdx + 1; ti < tokens.length && targetTokIndices.length < maxItems; ti++) {
      if (!tokens[ti].isWord) continue;
      wordStep++;
      if (wordStep >= everyN) pendingDue = true;
      if (pendingDue && isEligibleTarget(ti)) {
        targetTokIndices.push(ti);
        wordStep = 0;
        pendingDue = false;
      }
    }

    var joinTokens = function (fromIdx, toIdx) {
      var out = '';
      for (var k = fromIdx; k < toIdx && k < tokens.length; k++) out += tokens[k].text;
      return out;
    };

    var sentenceSnippetBefore = function (tokIdx) {
      var start = tokIdx;
      var wordsSeen = 0;
      for (var k = tokIdx - 1; k >= 0; k--) {
        if (tokens[k].isWord) wordsSeen++;
        if (tokens[k].isParaBreak && wordsSeen >= 5) { start = k + 1; break; }
        if (tokens[k].isSentEnd && wordsSeen >= 10) { start = k + 1; break; }
        if (wordsSeen >= 22) { start = k; break; }
        start = k;
      }
      return joinTokens(start, tokIdx).replace(/^\s+/, '');
    };

    var targets = [];
    var items = [];
    for (var bi = 0; bi < targetTokIndices.length; bi++) {
      var tIdx = targetTokIndices[bi];
      var prevTarget = bi > 0 ? targetTokIndices[bi - 1] : -1;
      var nextTarget = bi + 1 < targetTokIndices.length ? targetTokIndices[bi + 1] : tokens.length;
      var targetWord = tokens[tIdx].text;

      // Local sentence word set (+/- 6 words) so distractors never duplicate nearby words.
      var localSet = Object.create(null);
      var seenW = 0;
      for (var l = tIdx - 1; l >= 0 && seenW < 6; l--) {
        if (tokens[l].isWord) { localSet[tokens[l].text.toLowerCase()] = true; seenW++; }
      }
      seenW = 0;
      for (var r = tIdx + 1; r < tokens.length && seenW < 6; r++) {
        if (tokens[r].isWord) { localSet[tokens[r].text.toLowerCase()] = true; seenW++; }
      }

      var distractors = pickDistractors(targetWord, localSet, seedBase + ':' + bi, wlBuckets);
      var choices = orderThreeChoices(targetWord, distractors[0], distractors[1], seedBase + ':ord:' + bi);
      var answer = targetWord;

      // Apply teacher manual override for this blank if provided.
      var ov = overrides[bi] || overrides[String(bi)] || overrides['mz-' + (bi + 1)];
      if (ov && typeof ov === 'object') {
        if (Array.isArray(ov.choices)) {
          var cleanChoices = ov.choices.map(function (c) { return str(c, 36); }).filter(Boolean).slice(0, 3);
          if (cleanChoices.length === 3) {
            choices = cleanChoices;
            var ovAns = str(ov.answer, 36);
            if (ovAns && cleanChoices.some(function (c) { return c.toLowerCase() === ovAns.toLowerCase(); })) {
              answer = ovAns;
            } else if (!cleanChoices.some(function (c) { return c.toLowerCase() === answer.toLowerCase(); })) {
              answer = cleanChoices[0];
            }
          }
        }
      }

      var beforeText = joinTokens(prevTarget + 1, tIdx);
      var afterText = joinTokens(tIdx + 1, nextTarget);
      var lead = bi === 0 ? '' : sentenceSnippetBefore(prevTarget + 1);
      var itemId = 'mz-' + (bi + 1);

      targets.push({
        index: bi,
        id: itemId,
        tokenIndex: tIdx,
        answer: answer,
        choices: choices.slice(),
        before: beforeText,
        after: afterText,
      });

      items.push({
        id: itemId,
        word: 'Blank ' + (bi + 1) + ' (' + answer + ')',
        target: answer,
        blankNum: bi + 1,
        blankTotal: targetTokIndices.length,
        contextLead: lead,
        before: beforeText,
        after: afterText,
        choices: choices.slice(),
        answer: answer,
        maxAttempts: 2,
      });
    }

    return {
      passage: raw,
      everyN: everyN,
      targets: targets,
      items: items,
      stats: {
        totalWords: totalWords,
        sentenceOneWords: wordsInFirst,
        targetCount: items.length,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // Self-Contained Student Adapter: maze_reading (ZERO outer closure references!)
  // ---------------------------------------------------------------------------
  var MAZE_LABELS = {
    maze_reading_title: 'Maze Reading',
    maze_reading_directions: 'Read the passage. At each blank, choose the one word out of three that makes the best sense in the sentence.',
    maze_reading_practice_wrong: 'For this sentence, the best fit is "{answer}".',
    mz_group_label: 'Choose the word for blank {n}',
    mz_progress: 'Blank {n} of {total}',
    mz_warmup_badge: 'Warm-up practice',
    mz_key_hint: 'Tip: You can tap a word or press 1, 2, or 3.',
    mz_correct: 'That fits the sentence.',
    mz_try_again: 'Read the sentence again and try another word.',
    mz_missed: 'The best fit here is "{answer}".',
    mz_fit_badge: 'Fits',
    mz_tried_badge: 'Tried',
  };

  function renderMazeReading(item, ctx) {
    var L = ctx.L || {};
    var el = ctx.el;
    var fmt = ctx.fmt;
    var root = ctx.root;
    var isCheck = !!ctx.check;
    var isWarmup = !!ctx.practice || !!item.practice;
    var choices = Array.isArray(item.choices) ? item.choices : [];
    var locked = false;
    var tried = Object.create(null);
    var buttons = [];

    var doc = root && root.ownerDocument;
    var store = ctx.sessionCache || (doc ? (doc.__mzTrail || (doc.__mzTrail = Object.create(null))) : null);
    if (!isWarmup && Number(item.blankNum) === 1 && store) store.mazeTrail = '';
    var trail = store ? (store.mazeTrail || '') : '';
    var headerRow = el('div', { class: 'mz-meta' }, [
      isWarmup ? el('span', { class: 'mz-tag', text: L.mz_warmup_badge || 'Warm-up practice' }) : null,
      item.blankTotal ? el('span', { class: 'muted mz-pos', text: fmt(L.mz_progress || 'Blank {n} of {total}', { n: item.blankNum || 1, total: item.blankTotal }) }) : null,
    ]);

    var inlineGroup = el('span', {
      class: 'mz-inline-group',
      role: 'group',
      'aria-label': fmt(L.mz_group_label || 'Choose the word for blank {n}', { n: item.blankNum || 1 }),
      'data-mz-group': '',
    });

    var recordTrail = function (pickedWord) {
      if (!store || isWarmup) return;
      var piece = String(item.before || '') + String(pickedWord || '');
      var combined = (String(store.mazeTrail || '') + piece).replace(/\s+/g, ' ').trim();
      if (combined.length > 220) {
        var cut = combined.slice(combined.length - 200);
        var sp = cut.indexOf(' ');
        combined = '...' + (sp > 0 ? cut.slice(sp + 1) : cut);
      }
      store.mazeTrail = combined;
    };

    var pickChoice = function (idx) {
      if (locked || idx < 0 || idx >= choices.length) return;
      var word = choices[idx];
      if (!isCheck && tried[idx]) return;

      if (isCheck) {
        var prevTrail = store ? (store.mazeTrail || '') : '';
        recordTrail(word);
        var res = ctx.answer(word);
        if (res === 'recorded' || res === 'correct' || res === 'missed') {
          locked = true;
          buttons.forEach(function (b, bi) {
            b.disabled = true;
            if (bi === idx) b.setAttribute('aria-pressed', 'true');
          });
        } else if (store) {
          store.mazeTrail = prevTrail;
        }
        return;
      }

      var expected = String(item.answer || '').trim().toLowerCase();
      var isRight = String(word || '').trim().toLowerCase() === expected;
      var outcome = ctx.answer(word, isRight, {
        correctText: L.mz_correct || 'That fits the sentence.',
        retryText: L.mz_try_again || 'Read the sentence again and try another word.',
        missedText: fmt(L.mz_missed || 'The best fit here is "{answer}".', { answer: item.answer || '' }),
      });
      if (outcome === 'correct') {
        locked = true;
        recordTrail(word);
        buttons.forEach(function (b, bi) {
          b.disabled = true;
          if (bi === idx) { b.className = 'mz-opt is-right'; b.setAttribute('aria-pressed', 'true'); }
        });
      } else if (outcome === 'retry') {
        tried[idx] = true;
        buttons[idx].className = 'mz-opt is-tried';
        buttons[idx].setAttribute('aria-disabled', 'true');
        for (var next = 0; next < buttons.length; next++) {
          if (!tried[next] && typeof buttons[next].focus === 'function') { buttons[next].focus(); break; }
        }
      } else if (outcome === 'missed') {
        locked = true;
        recordTrail(item.answer || word);
        buttons.forEach(function (b, bi) {
          b.disabled = true;
          if (String(choices[bi] || '').trim().toLowerCase() === expected) b.className = 'mz-opt is-right';
          else if (bi === idx) b.className = 'mz-opt is-tried';
        });
      }
    };

    choices.forEach(function (choiceWord, ci) {
      var btn = el('button', {
        type: 'button',
        class: 'mz-opt',
        'data-mz-choice': String(ci),
        'data-mz-word': choiceWord,
        'aria-label': 'Choice ' + (ci + 1) + ': ' + choiceWord,
        on: {
          click: function () { pickChoice(ci); },
          keydown: function (ev) {
            if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') {
              ev.preventDefault();
              var n1 = buttons[(ci + 1) % buttons.length];
              if (n1 && typeof n1.focus === 'function') n1.focus();
            } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') {
              ev.preventDefault();
              var n2 = buttons[(ci - 1 + buttons.length) % buttons.length];
              if (n2 && typeof n2.focus === 'function') n2.focus();
            }
          },
        },
      }, [
        el('span', { class: 'mz-key', 'aria-hidden': 'true', text: String(ci + 1) }),
        el('span', { class: 'mz-word', text: choiceWord }),
      ]);
      buttons.push(btn);
      inlineGroup.appendChild(btn);
    });

    var leadText = !isWarmup && trail ? trail : String(item.contextLead || '');
    var passageBox = el('div', { class: 'mz-passage', 'data-mz-passage': '' }, [
      leadText ? el('p', { class: 'mz-lead muted', text: leadText }) : null,
      el('p', { class: 'mz-active-line' }, [
        item.before ? el('span', { class: 'mz-before', text: item.before }) : null,
        inlineGroup,
        item.after ? el('span', { class: 'mz-after', text: item.after }) : null,
      ]),
    ]);

    var hintLine = el('p', { class: 'muted mz-hint', text: L.mz_key_hint || 'Tip: Tap a word or press 1, 2, or 3.' });

    root.appendChild(headerRow);
    root.appendChild(passageBox);
    root.appendChild(hintLine);

    if (typeof ctx.keys === 'function') {
      ctx.keys(function (k) {
        if (k === '1' || k === '2' || k === '3') {
          pickChoice(Number(k) - 1);
          return true;
        }
        return false;
      });
    }

    return {
      reveal: function (correctOrAnswer) {
        locked = true;
        var right = typeof correctOrAnswer === 'string' ? correctOrAnswer : (item.answer || '');
        var rightLow = String(right).trim().toLowerCase();
        buttons.forEach(function (b, bi) {
          b.disabled = true;
          if (rightLow && String(choices[bi] || '').trim().toLowerCase() === rightLow) {
            b.className = 'mz-opt is-right';
          }
        });
      },
    };
  }

  function prepareMazeCheck(raw) {
    var r = raw && typeof raw === 'object' ? raw : {};
    var choices = Array.isArray(r.choices) ? r.choices.map(function (c) { return str(c, 40); }).filter(Boolean).slice(0, 3) : [];
    var answer = str(r.answer, 40);
    if (choices.length !== 3 || !answer) {
      return { item: null, missing: ['3 choices and 1 answer'] };
    }
    var n = Number(r.blankNum) || 1;
    var isPractice = !!r.practice;
    return {
      item: {
        id: str(r.id, 40) || ('mz-' + n),
        word: isPractice ? ('Warm-up ' + n) : ('Blank ' + n),
        blankNum: n,
        blankTotal: Number(r.blankTotal) || 1,
        contextLead: isPractice ? str(r.contextLead, 260) : '',
        before: String(r.before || '').slice(0, 600),
        after: String(r.after || '').slice(0, 400),
        choices: choices,
        answer: answer,
      },
    };
  }

  function scoreMazeReading(item, answer, response) {
    var want = String(answer == null ? '' : answer).trim().toLowerCase();
    var got = String(response == null ? '' : response).trim().toLowerCase();
    return { correct: !!want && got === want, digitsCorrect: null, digitsPossible: null };
  }

  var EXTRA_CSS = [
    '.mz-meta{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;margin:0 0 10px}',
    '.mz-tag{display:inline-block;padding:3px 10px;border-radius:999px;font-size:.82rem;font-weight:700;background:var(--soft);color:var(--accent);border:1px solid var(--accent)}',
    '.mz-pos{font-size:.9rem;font-weight:700}',
    '.mz-passage{padding:14px 16px;border-radius:14px;border:1.5px solid var(--line);background:var(--bg);line-height:1.85;font-size:1.08rem}',
    '.mz-lead{margin:0 0 10px;font-size:.95rem;line-height:1.55;border-bottom:1px solid var(--line);padding-bottom:8px}',
    '.mz-active-line{margin:0}',
    '.mz-inline-group{display:inline-flex;flex-wrap:wrap;align-items:center;gap:6px;margin:2px 6px;padding:4px 6px;border-radius:12px;border:2px solid var(--accent);background:var(--card);vertical-align:middle}',
    '.mz-opt{display:inline-flex;align-items:center;gap:6px;min-height:44px;min-width:44px;padding:6px 12px;border-radius:10px;border:1.5px solid var(--line);background:var(--soft);color:var(--ink);font-weight:700;font-size:.98rem;line-height:1.2}',
    '.mz-opt:hover:not(:disabled){border-color:var(--accent)}',
    '.mz-opt.is-right{border-color:var(--ok);background:var(--ok-bg);color:var(--ok)}',
    '.mz-opt.is-tried{border-style:dashed;border-color:var(--warn);background:var(--warn-bg);color:var(--warn);opacity:.72}',
    '.mz-key{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:999px;border:1px solid var(--line);background:var(--card);font-size:.78rem;font-weight:700;color:var(--muted)}',
    '.mz-hint{margin:10px 0 0;font-size:.88rem}',
    '@media (prefers-reduced-motion:reduce){*{scroll-behavior:auto}}',
    '@media (forced-colors:active){.mz-inline-group,.mz-opt.is-right{forced-color-adjust:none;border:2px solid Highlight}}',
    '@media print{.mz-hint,.progress{display:none!important}.card{border:0;box-shadow:none;padding:0}.mz-passage{border:1px solid #000;background:#fff}.mz-inline-group{border:1px solid #000}}',
  ].join('\n');

  var ADAPTERS = {
    maze_reading: {
      title: 'Maze Reading',
      labels: MAZE_LABELS,
      render: renderMazeReading,
      prepare: prepareMazeCheck,
      score: scoreMazeReading,
    },
  };

  // ---------------------------------------------------------------------------
  // CBM-Maze Net Score Computation (correct, incorrect, net = max(0, correct - incorrect))
  // ---------------------------------------------------------------------------
  function computeMazeNetScore(correct, incorrect) {
    var c = Math.max(0, Math.floor(Number(correct) || 0));
    var w = Math.max(0, Math.floor(Number(incorrect) || 0));
    return Math.max(0, c - w);
  }

  function scoreMazeResult(resultObj) {
    var r = resultObj && resultObj.result ? resultObj.result : (resultObj || {});
    var items = Array.isArray(r.items) ? r.items : [];
    var scored = items.filter(function (it) { return it && !it.practice; });
    var correct = 0;
    var incorrect = 0;
    var skipped = 0;
    scored.forEach(function (it) {
      if (!it.done || !(Number(it.attempts) > 0)) return;
      if (it.flag === 'skipped') { skipped++; return; }
      if (it.correct) correct++;
      else incorrect++;
    });
    var attempted = correct + incorrect;
    var netScore = computeMazeNetScore(correct, incorrect);
    var sc = r.score && typeof r.score === 'object' ? r.score : {};
    return {
      measure: sc.measure || 'maze_correct_3m',
      scoreUnit: sc.scoreUnit || 'items_correct',
      correct: correct,
      incorrect: incorrect,
      skipped: skipped,
      attempted: attempted,
      total: scored.length,
      netScore: netScore,
      accuracyPct: attempted ? Math.round((correct / attempted) * 100) : 0,
      elapsedS: sc.elapsedS != null ? Number(sc.elapsedS) : Math.round((Number(r.durationMs) || 0) / 1000),
      timeLimitS: sc.timeLimitS != null ? sc.timeLimitS : null,
      untimed: sc.untimed === true,
    };
  }

  // ---------------------------------------------------------------------------
  // Lesson & Packet Builders + Reopen Reader
  // ---------------------------------------------------------------------------
  function resolveLoader(explicit) {
    if (explicit && typeof explicit.buildHtml === 'function') return explicit;
    if (root.AlloWordSoundsTakeHome && typeof root.AlloWordSoundsTakeHome.buildHtml === 'function') {
      return root.AlloWordSoundsTakeHome;
    }
    throw new Error('AlloWordSoundsTakeHome loader is required.');
  }

  function passages() {
    return STARTER_PASSAGES.map(clone);
  }

  function passageById(id) {
    for (var i = 0; i < STARTER_PASSAGES.length; i++) {
      if (STARTER_PASSAGES[i].id === id) return clone(STARTER_PASSAGES[i]);
    }
    return null;
  }

  function lessonFromMaze(input) {
    var cfg = input && typeof input === 'object' ? input : {};
    var mode = cfg.mode === 'probe' || cfg.mode === 'check' ? 'probe' : 'practice';
    var everyN = Math.max(MIN_EVERY_N, Math.min(MAX_EVERY_N, Math.round(Number(cfg.everyN) || DEFAULT_EVERY_N)));
    var generated = cfg.generated && Array.isArray(cfg.generated.items)
      ? cfg.generated
      : generateMaze(cfg.passage || '', {
        everyN: everyN,
        maxItems: cfg.maxItems || MAX_ITEMS,
        seed: cfg.seed,
        wordlist: cfg.wordlist,
        overrides: cfg.overrides,
      });

    if (!generated.items.length) {
      throw new Error('Passage needs at least two sentences with enough words to build Maze items.');
    }

    var title = str(cfg.title || 'CBM-Maze Reading Probe', 80);
    var untimed = cfg.untimed === true;
    var rawTime = cfg.timeLimitS != null ? Number(cfg.timeLimitS) : DEFAULT_TIME_LIMIT_S;
    var timeLimitS = mode === 'probe' ? (untimed ? null : Math.max(30, Math.min(1800, Math.round(rawTime || DEFAULT_TIME_LIMIT_S)))) : null;
    var includeWarmup = mode === 'probe' && cfg.includeWarmup !== false;

    var finalItems = includeWarmup
      ? WARMUP_ITEMS.map(clone).concat(generated.items.map(clone))
      : generated.items.map(clone);

    var homeLanguages = Array.isArray(cfg.homeLanguages)
      ? cfg.homeLanguages.map(function (c) { return String(c || '').trim().toLowerCase(); }).filter(Boolean).slice(0, 6)
      : [];
    var bilingualGlossary = {};
    if (cfg.bilingualGlossary && typeof cfg.bilingualGlossary === 'object' && !Array.isArray(cfg.bilingualGlossary)) {
      bilingualGlossary = clone(cfg.bilingualGlossary);
    }
    var hasGlossary = Object.keys(bilingualGlossary).length > 0;

    var hasOverrides = !!(cfg.overrides && typeof cfg.overrides === 'object' && Object.keys(cfg.overrides).length);
    var canonical = null;
    if (mode === 'probe' && !hasOverrides) {
      var cleanIn = String(generated.passage || '').trim();
      for (var cp = 0; cp < STARTER_PASSAGES.length; cp++) {
        var sp = STARTER_PASSAGES[cp];
        if (sp.everyN === everyN && sp.passage.trim() === cleanIn) {
          canonical = sp;
          break;
        }
      }
    }
    var formLabel = mode === 'probe' ? str(cfg.form || (canonical ? canonical.form : 'Form A'), 40) : '';

    var basis = JSON.stringify({
      v: VERSION,
      mode: mode,
      title: title,
      everyN: everyN,
      untimed: untimed,
      timeLimitS: timeLimitS,
      includeWarmup: includeWarmup,
      form: formLabel,
      items: finalItems,
      homeLanguages: homeLanguages,
      bilingualGlossary: bilingualGlossary,
      stationMode: !!cfg.stationMode,
    });
    var rev = 'm' + fnv1a(basis);
    var lessonId = canonical ? canonical.canonicalId : (slug(title, 36) + '-maze-' + rev.slice(0, 5));

    var mazeMeta = mode === 'probe'
      ? { everyN: everyN, untimed: untimed, includeWarmup: includeWarmup }
      : { everyN: everyN, passage: generated.passage };
    if (canonical) {
      mazeMeta.passageId = canonical.id;
      mazeMeta.benchmarkBand = canonical.bandKey;
    }

    var lesson = {
      schema: 'alloflow-take-home-lesson/v2',
      player: 'alloflow-word-sounds-take-home/2',
      lessonId: lessonId,
      revision: rev,
      title: title,
      language: 'en',
      mode: mode,
      blocks: [{ activity: 'maze_reading', items: finalItems }],
      activityTitles: { maze_reading: 'Maze Reading' },
      audio: {},
      images: {},
      feedback: { correct: [], retry: null },
      mazeMeta: mazeMeta,
    };

    if (mode === 'probe') {
      lesson.form = formLabel;
      lesson.timeLimitS = timeLimitS;
      lesson.check = {
        measure: 'maze_correct_3m',
        scoreUnit: 'items_correct',
        allowSkip: true,
        scoringVersion: 1,
        formVersion: 1,
        untimed: untimed,
        usualTimeLimitS: DEFAULT_TIME_LIMIT_S,
      };
      if (canonical && canonical.bandKey) lesson.check.grade = canonical.bandKey;
    }
    if (homeLanguages.length) lesson.homeLanguages = homeLanguages;
    if (hasGlossary) lesson.bilingualGlossary = bilingualGlossary;
    if (cfg.stationMode === true) lesson.stationMode = true;
    return lesson;
  }

  function buildMazePacket(options) {
    var opts = options && typeof options === 'object' ? options : {};
    var loader = resolveLoader(opts.loader);
    var lesson = opts.lesson && Array.isArray(opts.lesson.blocks) ? clone(opts.lesson) : lessonFromMaze(opts);
    var isProbe = lesson.mode === 'probe';

    var rawLangs = opts.homeLanguages != null ? opts.homeLanguages : lesson.homeLanguages;
    var hasLangs = Array.isArray(rawLangs) ? rawLangs.length > 0 : !!(typeof rawLangs === 'string' && rawLangs.trim());
    var rawGloss = opts.bilingualGlossary != null ? opts.bilingualGlossary : lesson.bilingualGlossary;
    var hasGloss = !!(rawGloss && typeof rawGloss === 'object' && Object.keys(rawGloss).length > 0);

    var buildOpts = {
      extraAdapters: isProbe ? undefined : ADAPTERS,
      adapters: isProbe ? ADAPTERS : undefined,
      core: isProbe ? { soundAnswerMatches: function () { return false; } } : undefined,
      extraCss: EXTRA_CSS,
      title: opts.title || lesson.title,
      labels: opts.labels,
      teacherCode: opts.teacherCode,
      qrPublicKey: opts.qrPublicKey,
      qrCrypto: opts.qrCrypto,
      stationMode: opts.stationMode === true || lesson.stationMode === true,
      homeLanguages: hasLangs ? rawLangs : undefined,
      bilingualGlossary: hasGloss ? rawGloss : undefined,
      stationBilingual: opts.stationBilingual || root.AlloPacketStationBilingual,
    };

    var baseHtml = loader.buildHtml(lesson, buildOpts);
    var cleanLearner = codeName(opts.learner || '');
    var html = cleanLearner ? withCodeName(baseHtml, cleanLearner) : baseHtml;
    var plain = fileName(lesson.title, lesson.mode, '');
    var name = fileName(lesson.title, lesson.mode, cleanLearner);
    var bytes = typeof TextEncoder === 'function' ? new TextEncoder().encode(html).length : html.length;
    var allItems = (lesson.blocks[0] && lesson.blocks[0].items) || [];
    var scoredCount = allItems.filter(function (it) { return !it.practice; }).length;
    var warmupCount = allItems.length - scoredCount;

    return {
      html: html,
      baseHtml: baseHtml,
      bytes: bytes,
      lesson: lesson,
      name: name,
      plain: plain,
      learner: cleanLearner,
      mode: isProbe ? 'probe' : 'practice',
      itemCount: scoredCount,
      warmupCount: warmupCount,
      revision: lesson.revision,
    };
  }

  function readMazePacket(input, verifyCore) {
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
      return fail('results', 'This is a results file, not a Maze probe file. Add up results reads it.', { href: 'packets-results.html', name: 'Add up results' });
    }
    if (!parts.ok || !parts.lesson) {
      return fail('other', 'This is not a packet file made with this page. Choose the .html file you saved in step 3.');
    }
    var lesson = parts.lesson;
    var manifest = parts.manifest || {};
    var blocks = Array.isArray(lesson.blocks) ? lesson.blocks : [];
    if (!blocks.length || !blocks.every(function (b) { return b && b.activity === 'maze_reading'; })) {
      return fail('other', 'This packet uses another activity type. Open it in the maker page that built it.', { href: 'packets.html', name: 'Packets home' });
    }
    var mode = lesson.mode === 'probe' || (manifest.packet && manifest.packet.mode === 'check') ? 'probe' : 'practice';
    var meta = lesson.mazeMeta && typeof lesson.mazeMeta === 'object' ? lesson.mazeMeta : {};
    var rawItems = Array.isArray(blocks[0].items) ? blocks[0].items : [];
    var scoredItems = rawItems.filter(function (it) { return it && !it.practice; });
    var notes = [];
    var passage = '';
    var overrides = {};

    if (mode === 'practice') {
      passage = typeof meta.passage === 'string' && meta.passage.trim()
        ? meta.passage
        : scoredItems.map(function (it, idx) {
          var tail = idx === scoredItems.length - 1 ? String(it.after || '') : '';
          return String(it.before || '') + String(it.answer || '') + tail;
        }).join('');
      scoredItems.forEach(function (it, idx) {
        if (Array.isArray(it.choices) && it.choices.length === 3 && it.answer) {
          overrides[idx] = { choices: it.choices.slice(), answer: it.answer };
        }
      });
    } else {
      var canonicalRef = meta.passageId ? passageById(meta.passageId) : null;
      if (canonicalRef) {
        passage = canonicalRef.passage;
        notes.push('Restored built-in Form ' + canonicalRef.form + ' benchmark passage text cleanly (answers stay hidden in the student check file).');
      } else {
        passage = scoredItems.map(function (it, idx) {
          var tail = idx === scoredItems.length - 1 ? String(it.after || '') : '';
          var pick = Array.isArray(it.choices) && it.choices[0] ? it.choices[0] : 'word';
          return String(it.before || '') + pick + tail;
        }).join('');
        notes.push('Check mode hides answers inside the file, so review the passage text and target choices before saving again.');
      }
    }

    var teacherCode = !!(lesson.check && lesson.check.lock);
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
      kind: 'maze',
      title: str(lesson.title || manifest.title, 80),
      mode: mode,
      everyN: Math.max(MIN_EVERY_N, Math.min(MAX_EVERY_N, Math.round(Number(meta.everyN) || DEFAULT_EVERY_N))),
      passage: passage,
      overrides: overrides,
      form: str(lesson.form, 40) || 'Form A',
      timeLimitS: lesson.timeLimitS != null ? Number(lesson.timeLimitS) : null,
      untimed: !!(meta.untimed || (lesson.check && lesson.check.untimed)),
      includeWarmup: meta.includeWarmup !== false,
      homeLanguages: homeLanguages,
      bilingualGlossary: lesson.bilingual && lesson.bilingual.glossary && typeof lesson.bilingual.glossary === 'object' ? clone(lesson.bilingual.glossary) : {},
      stationMode: lesson.stationMode === true || manifest.stationMode === true,
      qrPublicKey: (lesson.qr && typeof lesson.qr.k === 'string') ? lesson.qr.k : '',
      learner: codeName(manifest.learner || ''),
      teacherCode: teacherCode,
      passageId: typeof meta.passageId === 'string' ? meta.passageId : '',
      benchmarkBand: typeof meta.benchmarkBand === 'string' ? meta.benchmarkBand : '',
      itemCount: scoredItems.length,
      notes: notes,
    };
  }

  function benchmarkBands() {
    var order = ['2-3', '4-5', '6-8', '9-12'];
    return order.map(function (bk) {
      var list = STARTER_PASSAGES.filter(function (p) { return p.bandKey === bk; }).map(clone);
      return {
        bandKey: bk,
        gradeBand: list[0] ? list[0].gradeBand : ('Grades ' + bk),
        canonicalId: list[0] ? list[0].canonicalId : ('maze-reading-g' + bk),
        forms: list,
      };
    });
  }

  var api = {
    VERSION: VERSION,
    DEFAULT_EVERY_N: DEFAULT_EVERY_N,
    MIN_EVERY_N: MIN_EVERY_N,
    MAX_EVERY_N: MAX_EVERY_N,
    DEFAULT_TIME_LIMIT_S: DEFAULT_TIME_LIMIT_S,
    ADAPTERS: ADAPTERS,
    EXTRA_CSS: EXTRA_CSS,
    MAZE_LABELS: MAZE_LABELS,
    WARMUP_ITEMS: WARMUP_ITEMS,
    passages: passages,
    passageById: passageById,
    benchmarkBands: benchmarkBands,
    generateMaze: generateMaze,
    computeMazeNetScore: computeMazeNetScore,
    scoreMazeResult: scoreMazeResult,
    lessonFromMaze: lessonFromMaze,
    buildMazePacket: buildMazePacket,
    readMazePacket: readMazePacket,
    codeName: codeName,
    withCodeName: withCodeName,
    fileName: fileName,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.AlloPacketMaze = api;
})(typeof window !== 'undefined' ? window : globalThis);
