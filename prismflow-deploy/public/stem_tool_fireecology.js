// ═══════════════════════════════════════════
// stem_tool_fireecology.js — Fire Ecology & Indigenous Land Stewardship
// Cultural burning simulator, fire science explorer, prescribed burn planner,
// indigenous knowledge map, forest succession model, fire-adapted ecosystems.
// Centers 65,000+ years of Indigenous fire stewardship knowledge.
// ═══════════════════════════════════════════

// ═══ Defensive StemLab guard ═══
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[StemLab] Registered tool: ' + id); },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[StemLab] Error rendering ' + id, e); return null; } }
};
// ═══ End Guard ═══

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('fireEcology'))) {

(function() {
  'use strict';
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-fireecology')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-fireecology';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();


  // ── Grade band helpers ──
  var getGradeBand = function(ctx) {
    var g = parseInt(ctx.gradeLevel, 10);
    if (isNaN(g) || g <= 2) return 'k2';
    if (g <= 5) return 'g35';
    if (g <= 8) return 'g68';
    return 'g912';
  };

  var getGradeIntro = function(band) {
    if (band === 'k2') return 'Welcome! Some forests NEED fire to stay healthy. Let\u2019s learn how fire helps nature grow!';
    if (band === 'g35') return 'For thousands of years, Indigenous peoples have used fire to care for the land. Explore how cultural burning keeps forests healthy and prevents wildfires.';
    if (band === 'g68') return 'Investigate fire ecology \u2014 how fire shapes ecosystems, why Indigenous fire stewardship outperforms suppression, and how to plan a prescribed burn using weather, fuel, and terrain data.';
    return 'Analyze fire regime ecology, Indigenous land management systems spanning 65,000+ years, prescribed burn modeling with fuel moisture calculations, and the policy failures of total fire suppression.';
  };

  // ── Sound effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    return _audioCtx;
  }

  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.10, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }

  function playSound(type) {
    try {
      switch(type) {
        case 'ignite':
          playTone(180, 0.15, 'sawtooth', 0.08);
          setTimeout(function() { playTone(220, 0.12, 'sawtooth', 0.06); }, 80);
          setTimeout(function() { playTone(330, 0.18, 'sine', 0.10); }, 160);
          break;
        case 'rain':
          playTone(800, 0.04, 'sine', 0.06);
          setTimeout(function() { playTone(600, 0.04, 'sine', 0.05); }, 50);
          setTimeout(function() { playTone(900, 0.04, 'sine', 0.04); }, 100);
          break;
        case 'grow':
          playTone(440, 0.08, 'sine', 0.06);
          setTimeout(function() { playTone(554, 0.08, 'sine', 0.06); }, 60);
          setTimeout(function() { playTone(659, 0.12, 'sine', 0.08); }, 120);
          break;
        case 'quizCorrect':
          playTone(523, 0.1, 'sine', 0.12);
          setTimeout(function() { playTone(659, 0.1, 'sine', 0.12); }, 80);
          setTimeout(function() { playTone(784, 0.15, 'sine', 0.14); }, 160);
          break;
        case 'quizWrong':
          playTone(220, 0.25, 'sawtooth', 0.08);
          break;
        case 'badge':
          playTone(523, 0.08, 'sine', 0.1);
          setTimeout(function() { playTone(659, 0.08, 'sine', 0.1); }, 70);
          setTimeout(function() { playTone(784, 0.08, 'sine', 0.1); }, 140);
          setTimeout(function() { playTone(1047, 0.2, 'sine', 0.14); }, 210);
          break;
        case 'wildfire':
          playTone(100, 0.3, 'sawtooth', 0.12);
          setTimeout(function() { playTone(150, 0.25, 'sawtooth', 0.10); }, 100);
          setTimeout(function() { playTone(80, 0.4, 'sawtooth', 0.08); }, 200);
          break;
        case 'snapshot':
          playTone(1200, 0.04, 'sine', 0.08);
          setTimeout(function() { playTone(800, 0.06, 'sine', 0.06); }, 50);
          break;
        default:
          playTone(440, 0.08, 'sine', 0.06);
      }
    } catch(e) {}
  }

  // ── Badge definitions (14 total) ──
  var BADGES = [
    { id: 'firstBurn', icon: '\uD83D\uDD25', label: 'First Cultural Burn', desc: 'Complete your first prescribed burn' },
    { id: 'firekeeper', icon: '\uD83E\uDEF6', label: 'Firekeeper', desc: 'Successfully manage 5 cultural burns' },
    { id: 'indigenousScholar', icon: '\uD83C\uDF0D', label: 'Indigenous Scholar', desc: 'Study fire practices from 8 different nations' },
    { id: 'ecologyExplorer', icon: '\uD83C\uDF32', label: 'Ecology Explorer', desc: 'Explore all 6 fire-adapted ecosystems' },
    { id: 'burnPlanner', icon: '\uD83D\uDCCB', label: 'Burn Planner', desc: 'Create a safe prescribed burn plan' },
    { id: 'successionWatcher', icon: '\uD83C\uDF31', label: 'Succession Watcher', desc: 'Observe 50 years of forest succession' },
    { id: 'quizMaster', icon: '\uD83C\uDFC6', label: 'Fire Quiz Master', desc: 'Answer 8 quiz questions correctly' },
    { id: 'aiScholar', icon: '\uD83E\uDD16', label: 'AI Fire Scholar', desc: 'Use the AI tutor 3 times' },
    { id: 'suppressionLesson', icon: '\u26A0\uFE0F', label: 'Suppression Lesson', desc: 'Witness the consequences of 50 years of fire suppression' },
    { id: 'mosaicMaster', icon: '\uD83D\uDFE9', label: 'Mosaic Master', desc: 'Create a healthy mosaic burn pattern' },
    { id: 'carbonTracker', icon: '\u2601\uFE0F', label: 'Carbon Tracker', desc: 'Compare carbon outcomes of cultural burning vs. wildfire' },
    { id: 'seedSprouter', icon: '\uD83C\uDF3E', label: 'Seed Sprouter', desc: 'Trigger fire-dependent seed germination' },
    { id: 'waterProtector', icon: '\uD83D\uDCA7', label: 'Water Protector', desc: 'Learn how cultural burning protects watersheds' },
    { id: 'knowledgeKeeper', icon: '\u2728', label: 'Knowledge Keeper', desc: 'Complete all learning tabs' },
    { id: 'caseStudyScholar', icon: '\uD83D\uDCF0', label: 'Case Study Scholar', desc: 'Study all 5 wildfire case studies' },
    { id: 'smokeSignal', icon: '\uD83D\uDCA8', label: 'Smoke Signal', desc: 'Learn about smoke-responsive seed germination' },
    { id: 'comparisonChamp', icon: '\u2194\uFE0F', label: 'Comparison Champion', desc: 'Run the side-by-side forest comparison for 50+ years' },
    { id: 'factCollector', icon: '\uD83D\uDCDA', label: 'Fact Collector', desc: 'Read 10 fire facts' }
  ];

  // ═══════════════════════════════════════════
  // INDIGENOUS FIRE KNOWLEDGE DATABASE
  // Research-based; sources include Indigenous-led organizations,
  // peer-reviewed fire ecology literature, and tribal publications.
  // ═══════════════════════════════════════════

  var INDIGENOUS_FIRE_NATIONS = [
    {
      id: 'aboriginal_au',
      nation: 'Aboriginal Australians',
      region: 'Australia (continent-wide)',
      icon: '\uD83C\uDDE6\uD83C\uDDFA',
      years: '65,000+',
      practice: 'Cultural Burning / Fire-Stick Farming',
      description: 'Aboriginal Australians developed the world\u2019s oldest known land management system. \u201CFire-stick farming\u201D uses low-intensity mosaic burns \u2014 small, cool fires lit at different times across the landscape \u2014 to create a patchwork of vegetation at various stages of regrowth. This promotes plant diversity, creates habitat corridors for animals, and prevents catastrophic wildfires by reducing fuel loads.',
      science: 'Mosaic burning creates a landscape of different successional stages. Early-successional patches attract grazing animals (kangaroos, wallabies) to fresh green shoots, while mature patches provide shelter and seed banks. The patchwork pattern acts as a natural firebreak, preventing any single fire from covering large areas. Research shows Aboriginal-managed lands had 40-60% less area burned by uncontrolled wildfire.',
      keyPractices: [
        'Cool-season burns when fuel moisture is higher, producing slow, low-intensity fires',
        'Burn small patches (hectares, not square kilometers) in rotating mosaic patterns',
        'Time burns to the lifecycle of key food plants (yams, grass seeds, cycads)',
        'Use fire to create \u201Cgreen pick\u201D \u2014 fresh growth that attracts game animals',
        'Maintain songlines and ceremonial pathways through strategic burning'
      ],
      plants: ['Spinifex grass', 'Banksia (fire-triggered seed release)', 'Cycad palms', 'Bush tomato', 'Eucalyptus (fire-adapted bark)'],
      legacy: 'The 2019-2020 Australian bushfires burned 46 million acres \u2014 a direct consequence of the cessation of Aboriginal burning practices after colonization. The Australian government now partners with Aboriginal ranger groups to reintroduce cultural burning. Victor Steffensen\u2019s work through the National Emerging Technologies Fund has revitalized these practices.',
      color: '#dc2626'
    },
    {
      id: 'karuk_yurok',
      nation: 'Karuk, Yurok & Hupa',
      region: 'Northern California, USA (Klamath River)',
      icon: '\uD83C\uDF32',
      years: '10,000+',
      practice: 'Cultural Burning / \u201CGood Fire\u201D',
      description: 'The Karuk, Yurok, and Hupa peoples of the Klamath River basin used intentional, low-intensity fire to manage forests, meadows, and riverbanks. Fire maintained tanoak groves for acorn production, encouraged hazel growth for basket-weaving materials, and created open understory habitat for deer and elk. Fire also reduced fuels around villages, protecting communities from wildfire.',
      science: 'Low-intensity surface fires consume leaf litter and small fuels (1-hour and 10-hour fuels) while leaving mature trees unharmed. This reduces \u201Cfuel ladders\u201D \u2014 the continuous vertical path of vegetation that allows surface fires to climb into the canopy and become devastating crown fires. Karuk burning created open, park-like forests with 40-80 trees per acre instead of the 400+ per acre seen after a century of fire suppression.',
      keyPractices: [
        'Burn in late fall and early spring when conditions are cool and moist',
        'Target specific understory plants: burn to promote hazel, beargrass, and sourberry',
        'Create and maintain prairies in forest gaps for deer forage and root crops',
        'Burn along ridgelines to create firebreaks protecting villages in valleys',
        'Train new fire practitioners through multi-generational knowledge transfer'
      ],
      plants: ['Tanoak (acorn food source)', 'Hazel (basket weaving)', 'Beargrass (ceremonial regalia)', 'Huckleberry', 'Camas lily'],
      legacy: 'The Karuk Tribe\u2019s Department of Natural Resources now operates one of the most active cultural burning programs in the US. The Karuk Climate Adaptation Plan explicitly identifies the restoration of cultural burning as essential to ecosystem health. Collaborations with the US Forest Service are reintroducing Indigenous fire to federal lands for the first time in over a century.',
      color: '#16a34a'
    },
    {
      id: 'martu',
      nation: 'Martu',
      region: 'Western Desert, Australia',
      icon: '\uD83C\uDFDC\uFE0F',
      years: '50,000+',
      practice: 'Hunting Fires / Mosaic Patch Burning',
      description: 'Martu women use fire as a hunting tool, burning spinifex grasslands to flush sand monitor lizards from burrows. This practice creates a fine-grained mosaic of burned and unburned patches across the desert. Research by Rebecca Bliege Bird (Penn State) demonstrated that Martu burning dramatically increases biodiversity \u2014 landscapes managed by Martu hunters supported 70% more species than unmanaged areas.',
      science: 'The mosaic of burn ages creates diverse microhabitats. Recently burned areas attract seed-eating birds; regrowing patches shelter small mammals; mature spinifex rings house reptiles. Without Martu burning, spinifex grows into vast, continuous stands that fuel massive, uncontrollable wildfires during lightning storms. Martu fire management fragments fuel continuity, making the landscape resilient to catastrophic fire.',
      keyPractices: [
        'Burn small patches of spinifex (often less than 1 hectare) during hunting walks',
        'Light fires at the edge of mature spinifex rings to flush prey',
        'Leave unburned refugia so animals have shelter and can recolonize',
        'Burn in cooler months when fire intensity remains low',
        'Coordinate burns across family groups to manage landscape-scale patterns'
      ],
      plants: ['Spinifex (Triodia)', 'Desert oak', 'Bush banana', 'Sand fig', 'Desert raisin'],
      legacy: 'Bliege Bird\u2019s research demonstrated that where Martu people were removed from their lands (during forced relocation), catastrophic wildfires increased and biodiversity crashed. This is one of the strongest scientific demonstrations that Indigenous fire management actively increases ecosystem health.',
      color: '#ea580c'
    },
    {
      id: 'plains_nations',
      nation: 'Blackfeet, Lakota, Comanche & Plains Nations',
      region: 'Great Plains, North America',
      icon: '\uD83E\uDD2C',
      years: '8,000+',
      practice: 'Prairie Burning / Bison Management',
      description: 'The great grasslands of North America were not a \u201Cnatural\u201D wilderness \u2014 they were actively managed by Indigenous peoples using fire. Plains nations burned vast areas to attract bison to nutritious new grass growth, to drive bison toward hunting grounds, and to prevent the encroachment of woody shrubs and trees that would convert grassland to forest. Without fire, the Great Plains would have been largely woodland.',
      science: 'Grassland fires kill woody seedlings but stimulate deep-rooted grasses. Bunchgrasses like big bluestem have growing points below ground level, protected from fire. Within days of a burn, new green shoots emerge \u2014 higher in protein than mature grass. Bison preferentially graze recently burned areas, gaining 10-15% more weight than those on unburned range. This \u201Cpyric herbivory\u201D interaction between fire and grazers maintained grassland ecosystems across 500,000+ square miles.',
      keyPractices: [
        'Large-scale burns in late fall or early spring to clear dead thatch',
        'Strategic burning to funnel bison herds toward hunting camps',
        'Ring fires to encircle and concentrate bison on the open plain',
        'Rotation burns across territories to ensure fresh grass throughout the season',
        'Signal fires to communicate between bands during communal hunts'
      ],
      plants: ['Big bluestem', 'Switchgrass', 'Indian grass', 'Prairie clover', 'Coneflower (Echinacea)'],
      legacy: 'The near-extinction of bison and the cessation of Indigenous prairie burning after colonization allowed woody encroachment across millions of acres. Modern tallgrass prairie restoration projects (like the Tallgrass Prairie National Preserve) now use prescribed fire to maintain grassland, following the same principles Indigenous peoples practiced for millennia.',
      color: '#854d0e'
    },
    {
      id: 'southeast_nations',
      nation: 'Cherokee, Creek, Seminole & Southeast Nations',
      region: 'Southeastern United States',
      icon: '\uD83C\uDF33',
      years: '7,000+',
      practice: 'Pine Savanna / Understory Burning',
      description: 'The longleaf pine ecosystem \u2014 once the largest ecosystem in North America, stretching 90 million acres from Virginia to Texas \u2014 was maintained by Indigenous fire. Cherokee, Creek, Muscogee, and Seminole peoples burned the understory of longleaf pine forests every 1-3 years. This created open, park-like savannas with rich ground-cover plants including blueberries, wild strawberries, and medicinal herbs.',
      science: 'Longleaf pine is a fire-dependent species with remarkable adaptations. Seedlings spend 5-7 years in a \u201Cgrass stage,\u201D looking like a clump of grass, with a thick root storing energy. When the root is large enough, the seedling \u201Cbolts\u201D upward 3-6 feet in a single season, racing its growing tip above fire height. Mature longleaf bark is 2-3 inches thick and nearly fireproof. Without fire, shade-tolerant oaks and sweetgum overtop longleaf seedlings, killing them. Only 3% of the original longleaf ecosystem remains.',
      keyPractices: [
        'Annual to triennial understory burns during dormant season (winter)',
        'Maintain open savanna structure for wild fruit, tuber, and herb harvest',
        'Burn to promote wiregrass (the \u201Cfuel\u201D that carries surface fire through longleaf)',
        'Create open habitats for white-tailed deer, turkey, and quail',
        'Burn around village sites to reduce pest insects (ticks, chiggers) and snakes'
      ],
      plants: ['Longleaf pine', 'Wiregrass', 'Saw palmetto', 'Wild blueberry', 'Pitcher plants (carnivorous)'],
      legacy: 'The longleaf pine ecosystem is one of the most endangered in North America. Indigenous-led prescribed burn programs and organizations like the Longleaf Alliance are working to restore this ecosystem. The endangered red-cockaded woodpecker, gopher tortoise, and over 30 other threatened species depend on the fire-maintained open structure that Indigenous peoples created.',
      color: '#059669'
    },
    {
      id: 'coast_salish',
      nation: 'Coast Salish, Kalapuya & Pacific Northwest Nations',
      region: 'Pacific Northwest, North America',
      icon: '\uD83C\uDF3A',
      years: '6,000+',
      practice: 'Prairie & Meadow Burning / Camas Management',
      description: 'In the Pacific Northwest \u2014 one of the wettest regions in North America \u2014 Indigenous peoples used fire to maintain prairies and oak savannas in a landscape that would otherwise be dense coniferous forest. The Kalapuya of the Willamette Valley burned annually to maintain vast camas lily meadows. Coast Salish peoples maintained Garry oak prairies on Vancouver Island and the San Juan Islands. These fire-maintained ecosystems supported some of the most productive food systems on the continent.',
      science: 'Camas bulbs (a primary food staple) require full sunlight and cannot compete with conifers. Annual fall burning killed Douglas-fir seedlings, recycled nutrients into the soil, and stimulated camas bulb division and growth. Studies show camas production increases 3-5x in burned vs. unburned meadows. Garry oak savannas are now critically endangered in British Columbia because without fire, Douglas-fir overtops and shades out the oaks within decades.',
      keyPractices: [
        'Annual fall burning of camas prairies after harvest (September-October)',
        'Maintain Garry oak savannas by burning out encroaching Douglas-fir',
        'Burn bracken fern patches to encourage edible fiddlehead production',
        'Create berry patches (salal, huckleberry, Oregon grape) at forest edges',
        'Coordinate burns across villages to manage the entire Willamette Valley landscape'
      ],
      plants: ['Camas lily (staple food)', 'Garry oak', 'Salal', 'Oregon grape', 'Bracken fern'],
      legacy: 'When Euro-American settlers arrived in the Willamette Valley, they described it as a \u201Cnatural paradise\u201D of open grasslands and scattered oaks \u2014 not recognizing it as a carefully managed landscape. Today, Garry oak savannas are one of the most endangered ecosystems in Canada, and the Kalapuya are working with conservation organizations to restore cultural burning to Willamette Valley prairies.',
      color: '#7c3aed'
    },
    {
      id: 'amazon_terra_preta',
      nation: 'Indigenous Amazonian Peoples',
      region: 'Amazon Basin, South America',
      icon: '\uD83C\uDF0E',
      years: '7,000+',
      practice: 'Terra Preta / Managed Fire for Soil Creation',
      description: 'Indigenous peoples of the Amazon created \u201Cterra preta\u201D (dark earth) \u2014 some of the most fertile soil on Earth \u2014 through centuries of managed burning, charcoal production, and composting. Amazonian soils are naturally poor (leached by heavy rain), but terra preta patches remain extraordinarily fertile thousands of years after they were created. This represents one of the most sophisticated examples of fire-based land management in human history.',
      science: 'Terra preta is 2-3 times richer in carbon, nitrogen, and phosphorus than surrounding oxisol soils. The key ingredient is biochar \u2014 charcoal produced by low-oxygen smoldering fires. Biochar\u2019s porous structure provides habitat for soil microbes, retains water and nutrients, and persists in soil for 1,000-4,000+ years. Terra preta soils self-regenerate: they grow at ~1 cm per year when managed, suggesting an active biological process.',
      keyPractices: [
        'Low-temperature smoldering fires to produce charcoal (biochar) rather than ash',
        'Mix charcoal with organic waste (fish bones, shells, food scraps) to create terra preta',
        'Use slash-and-char (not slash-and-burn) to clear forest patches sustainably',
        'Maintain terra preta gardens for generations through continuous charcoal addition',
        'Manage forest-garden mosaics (agroforestry) using fire as a tool for clearing and enrichment'
      ],
      plants: ['Brazil nut (managed groves)', 'A\u00E7a\u00ED palm', 'Cacao', 'Cassava/Manioc', 'Peach palm'],
      legacy: 'Modern soil scientists are studying terra preta to develop \u201Cbiochar agriculture\u201D \u2014 adding charcoal to degraded soils to restore fertility and sequester carbon. Terra preta research has shown that pre-Columbian Amazonia supported millions of people in sophisticated agricultural societies, challenging the colonial myth of the Amazon as \u201Cpristine wilderness.\u201D',
      color: '#065f46'
    },
    {
      id: 'maori_nz',
      nation: 'M\u0101ori',
      region: 'Aotearoa / New Zealand',
      icon: '\uD83C\uDDF3\uD83C\uDDFF',
      years: '700+',
      practice: 'Landscape Burning / Bracken Fern Management',
      description: 'M\u0101ori used fire extensively after arriving in Aotearoa to convert dense forest to fernland and grassland for food production. Bracken fern (aruhe) rhizomes were a major carbohydrate source, and burning stimulated vigorous fern regrowth. M\u0101ori also used fire to maintain open hunting grounds and to manage wetlands for bird habitat (critical for harvesting m\u0101tauranga-based food systems).',
      science: 'Bracken fern is a pyrophyte \u2014 a plant that thrives after fire. Its deep rhizomes survive burning, and the removal of competing vegetation triggers rapid regrowth. Burned fernlands produce rhizomes 2-3x larger than unburned areas. M\u0101ori burning also created grasslands that supported kiore (Pacific rat) populations, an important protein source. Palynological (pollen core) studies confirm a dramatic shift from forest to fernland coinciding with M\u0101ori settlement.',
      keyPractices: [
        'Burn bracken fern patches on rotation (2-3 year cycle) to maximize rhizome production',
        'Clear forest edges to expand productive fernland and garden space',
        'Maintain wetland edges through controlled burning for bird habitat',
        'Burn to create open areas for kumara (sweet potato) cultivation',
        'Use fire as part of rongoaa M\u0101ori (traditional medicine) landscape management'
      ],
      plants: ['Bracken fern (aruhe)', 'Harakeke (flax)', 'Kumara (sweet potato)', 'Cabbage tree (t\u012B k\u014Duka)', 'M\u0101nuka'],
      legacy: 'M\u0101ori fire management transformed the New Zealand landscape. Today, m\u0101tauranga M\u0101ori (traditional knowledge) is increasingly integrated into conservation management. M\u0101nuka \u2014 a fire-adapted pioneer species \u2014 has become globally famous for its medicinal honey, another legacy of Indigenous landscape management through fire.',
      color: '#0369a1'
    },
    {
      id: 'paiute',
      nation: 'Paiute & Great Basin Peoples',
      region: 'Great Basin, Nevada & Eastern California, USA',
      icon: '\uD83C\uDFD4\uFE0F',
      years: '8,000+',
      practice: 'Pine Nut Forest & Meadow Burning',
      description: 'The Paiute peoples of the Great Basin managed pi\u00F1on-juniper woodlands and montane meadows with fire. Pi\u00F1on pine nuts were the single most important food source \u2014 a calorie-dense, storable staple that sustained families through harsh winters. Paiute burning maintained open, productive pi\u00F1on stands and kept mountain meadows free of encroaching conifers, maximizing edible root, seed, and game production across an arid landscape.',
      science: 'Pi\u00F1on pines produce heavier cone crops in open stands with less competition. Paiute burning removed juniper (a heavy water user) and dead fuels, reducing competition for scarce moisture. Burned meadows produced abundant biscuitroot, yampa, and other edible tubers. Without fire, juniper encroaches into meadows at rates of 0.5-1 acre/year, fragmenting sage-grouse habitat and reducing water table levels by 15-30% due to increased transpiration.',
      keyPractices: [
        'Burn beneath pi\u00F1on stands to clear competing juniper and reduce fuel ladders',
        'Maintain montane meadows by burning encroaching conifers at forest edges',
        'Burn sagebrush patches on rotation to promote fresh browse for deer and pronghorn',
        'Time burns to late fall after pi\u00F1on harvest when fuels are drier but nights are cool',
        'Use fire to drive jackrabbits and other game toward hunting parties in communal drives'
      ],
      plants: ['Pi\u00F1on pine (nut harvest)', 'Mountain sagebrush', 'Biscuitroot', 'Yampa', 'Indian ricegrass'],
      legacy: 'Western juniper encroachment \u2014 a direct result of fire suppression \u2014 is now the #1 threat to sage-grouse habitat across the Great Basin. Over 40 million acres of sagebrush steppe have been invaded by juniper since the cessation of Indigenous burning. The Bureau of Land Management now spends millions annually on juniper removal programs that replicate what Paiute fire management accomplished for millennia.',
      color: '#78716c'
    },
    {
      id: 'ojibwe',
      nation: 'Ojibwe / Anishinaabe',
      region: 'Great Lakes Region, North America',
      icon: '\uD83C\uDF0A',
      years: '5,000+',
      practice: 'Berry Patch, Wild Rice & Forest Edge Burning',
      description: 'The Ojibwe (Anishinaabe) peoples of the Great Lakes region used fire to manage a mosaic landscape of boreal forest, wild rice wetlands, berry patches, and birch groves. Fire maintained the blueberry and cranberry barrens critical for food and medicine, kept forest edges open for hunting, and enhanced birch bark quality by promoting vigorous young growth essential for canoe-building and shelter construction.',
      science: 'Blueberry (Vaccinium) species produce maximum berry crops 2-4 years after low-intensity fire. Fire removes competing shrubs and trees, recycles nutrients into acidic soil, and triggers prolific sprouting from underground rhizomes. Jack pine barrens \u2014 maintained by Ojibwe burning \u2014 were the sole nesting habitat for the now-endangered Kirtland\u2019s warbler. Wild rice (manoomin) beds benefit indirectly: fire-maintained forests reduce nutrient runoff that causes algal blooms in rice lakes.',
      keyPractices: [
        'Burn blueberry and cranberry barrens on 3-5 year rotation for maximum berry production',
        'Maintain jack pine barrens through periodic fire to sustain culturally important landscapes',
        'Burn forest edges and clearings to create browse for moose and deer',
        'Burn around birch groves to stimulate new growth with superior bark quality',
        'Protect wild rice lakes by maintaining forested buffer zones with periodic understory burns'
      ],
      plants: ['Wild blueberry', 'Wild cranberry', 'Jack pine', 'Paper birch', 'Wild rice (manoomin)'],
      legacy: 'The decline of Kirtland\u2019s warbler (down to 167 pairs by 1987) is directly linked to fire suppression eliminating young jack pine stands that Ojibwe burning maintained. Intensive prescribed burn programs in Michigan have since recovered the population to over 2,000 pairs. Ojibwe communities now advocate for co-management of fire on ceded lands.',
      color: '#0891b2'
    },
    {
      id: 'san_bushmen',
      nation: 'San (Bushmen)',
      region: 'Kalahari & Southern Africa',
      icon: '\uD83C\uDDE7\uD83C\uDDFC',
      years: '20,000+',
      practice: 'Veldt Burning / Hunter-Gatherer Fire Management',
      description: 'The San peoples of southern Africa \u2014 among the oldest continuous cultures on Earth \u2014 have used fire to manage the Kalahari veldt and surrounding savannas for at least 20,000 years. Fire was used to attract game to fresh green growth, to flush prey from dense vegetation, to clear camping areas of dangerous snakes and insects, and to maintain the mosaic of grassland and woodland that supports the extraordinary biodiversity of southern African savannas.',
      science: 'San burning practices create a landscape-scale mosaic of burn ages that maximizes edge habitat \u2014 the transition zone between vegetation types where biodiversity is highest. Recently burned patches attract grazing species (springbok, gemsbok, wildebeest), while unburned patches provide cover for predator-sensitive species. Ethnobotanical studies show San fire management maintained over 300 edible plant species across the landscape by preventing any single vegetation type from dominating.',
      keyPractices: [
        'Burn dry grassland patches during the late dry season to attract game to green regrowth',
        'Create firebreaks around camps and water sources for safety and visibility',
        'Burn in strips to drive game toward hunting positions',
        'Maintain berry-producing shrublands by burning encroaching trees',
        'Coordinate burns across band territories to ensure landscape-scale mosaic patterns'
      ],
      plants: ['Mongongo nut tree', 'Hoodia (appetite suppressant)', 'Tsamma melon', 'Shepherd\u2019s tree', 'Kalahari truffle (nabas)'],
      legacy: 'Where San communities have been displaced from their ancestral lands (often for game reserves), bush encroachment has followed. The bitter irony: the wildlife reserves created by removing San peoples have less biodiversity than the landscapes San fire management maintained. Conservation biology is increasingly recognizing that the \u201Cpristine wilderness\u201D these reserves were meant to protect was, in fact, a human-managed landscape.',
      color: '#a16207'
    },
    {
      id: 'sami',
      nation: 'S\u00E1mi',
      region: 'Northern Scandinavia & Finland (S\u00E1pmi)',
      icon: '\u2744\uFE0F',
      years: '4,000+',
      practice: 'Reindeer Pasture & Forest Burning',
      description: 'The S\u00E1mi people of northern Scandinavia used fire to manage reindeer pasture across the boreal and sub-arctic zones of S\u00E1pmi. Burning opened dense forest to encourage lichen growth (the primary winter food for reindeer), promoted berry-producing shrubs (cloudberry, lingonberry), and maintained open birch woodlands used for summer grazing. S\u00E1mi fire management was integrated into the seasonal migration cycle of reindeer herding \u2014 one of the few remaining pastoral nomadic systems in Europe.',
      science: 'Reindeer lichens (Cladonia) grow best in open conditions with high light levels. Dense forest canopy reduces lichen productivity by 60-80%. S\u00E1mi burning opened canopy gaps and killed competing mosses, stimulating lichen regrowth over 20-40 year cycles. Cloudberry (Rubus chamaemorus) production increases 3x in burned vs. unburned bogs. Fire also controlled reindeer parasites (warble flies, nose bot flies) by burning larval habitat in the soil surface.',
      keyPractices: [
        'Burn spruce and pine forest patches on long rotation (30-50 years) to regenerate lichen pasture',
        'Maintain open birch woodlands by burning encroaching conifers',
        'Burn bog edges to promote cloudberry and lingonberry production',
        'Coordinate burning with seasonal reindeer migration routes (siida system)',
        'Use fire to create open areas that allow wind to reduce insect harassment of reindeer herds in summer'
      ],
      plants: ['Reindeer lichen (Cladonia)', 'Cloudberry', 'Lingonberry', 'Mountain birch', 'Dwarf willow'],
      legacy: 'Swedish and Finnish forestry policies suppressed S\u00E1mi burning in the 19th-20th centuries, leading to dense forest regrowth that has drastically reduced lichen pasture. Combined with industrial logging and mining, this has threatened S\u00E1mi reindeer herding. S\u00E1mi communities are now pushing for recognition of traditional fire management rights as part of broader Indigenous land rights movements in Scandinavia.',
      color: '#4338ca'
    }
  ];

  // ═══════════════════════════════════════════
  // FIRE-ADAPTED ECOSYSTEMS
  // ═══════════════════════════════════════════

  var FIRE_ECOSYSTEMS = [
    {
      id: 'longleafPine',
      name: 'Longleaf Pine Savanna',
      icon: '\uD83C\uDF32',
      region: 'Southeastern USA',
      fireInterval: '1\u20133 years',
      description: 'Once 90 million acres, now reduced to 3% by fire suppression. The most fire-dependent ecosystem in North America.',
      fireRole: 'Surface fires clear understory, recycle nutrients, kill competing hardwoods, and maintain open savanna structure. Longleaf pine has fire-resistant bark (2-3 inches thick) and a unique \u201Cgrass stage\u201D seedling that survives fire.',
      adaptations: [
        { species: 'Longleaf Pine', adaptation: 'Thick bark, grass-stage seedling with protected terminal bud, self-pruning lower branches' },
        { species: 'Wiregrass', adaptation: 'Burns readily to carry fire; regrows from underground rhizomes within days' },
        { species: 'Gopher Tortoise', adaptation: 'Deep burrows (up to 40 feet) provide fire refugia for 350+ species including indigo snakes and burrowing owls' },
        { species: 'Red-cockaded Woodpecker', adaptation: 'Nests only in living longleaf pine; resin wells around nest hole repel rat snakes. Requires open, fire-maintained forest' },
        { species: 'Pitcher Plant', adaptation: 'Carnivorous plant of fire-maintained bogs; dies when shaded by woody plants in fire-suppressed conditions' }
      ],
      withoutFire: 'Within 5-10 years of fire suppression, hardwood midstory develops. Within 20 years, longleaf seedlings cannot establish. Within 50 years, the savanna converts to closed-canopy hardwood forest, eliminating 90% of the original species.',
      color: '#16a34a'
    },
    {
      id: 'chaparral',
      name: 'California Chaparral',
      icon: '\uD83D\uDD25',
      region: 'Mediterranean California',
      fireInterval: '30\u2013100 years',
      description: 'Dense, drought-adapted shrublands that experience high-intensity crown fires. Many species require fire for seed germination.',
      fireRole: 'Stand-replacing fires clear old, senescent shrubs and trigger mass germination of soil seed banks. Some seeds require heat scarification; others respond to chemicals in smoke (karrikinolide). Post-fire landscapes explode with wildflowers in the first spring.',
      adaptations: [
        { species: 'Chamise', adaptation: 'Resprouts from lignotuber (underground root burl) within weeks of fire; seeds require heat to germinate' },
        { species: 'Manzanita', adaptation: 'Seeds dormant in soil for decades; fire heat cracks the seed coat, triggering germination. Some species are \u201Cobligate seeders\u201D (killed by fire, regenerate only from seed)' },
        { species: 'Fire Poppy', adaptation: 'Seeds lie dormant for 50+ years; germinate ONLY after fire, creating spectacular post-fire wildflower displays' },
        { species: 'Ceanothus', adaptation: 'Nitrogen-fixing root nodules; fire-stimulated germination enriches post-fire soil for other species' },
        { species: 'California Gnatcatcher', adaptation: 'Nests in coastal sage scrub adjacent to chaparral; requires mosaic of burn ages for habitat diversity' }
      ],
      withoutFire: 'Old-growth chaparral becomes decadent \u2014 dead wood accumulates, living cover thins. When fire eventually occurs (from lightning or human ignition), the extreme fuel load produces unnaturally intense fires that sterilize soil and cause debris flows.',
      color: '#dc2626'
    },
    {
      id: 'boreal',
      name: 'Boreal Forest (Taiga)',
      icon: '\u2744\uFE0F',
      region: 'Canada, Alaska, Scandinavia, Siberia',
      fireInterval: '50\u2013200 years',
      description: 'The largest terrestrial biome on Earth. Fire is the primary agent of forest renewal, creating a landscape mosaic essential for caribou, lynx, and boreal birds.',
      fireRole: 'Crown fires kill canopy trees but trigger mass release of serotinous seeds (pine cones sealed with resin that melts in fire). Fire exposes mineral soil needed for seed germination and releases nutrients locked in thick moss and organic layers. Post-fire stands of jack pine and black spruce are critical habitat for species like the Kirtland\u2019s warbler.',
      adaptations: [
        { species: 'Jack Pine', adaptation: 'Serotinous cones sealed with resin; only open when heated to 50\u00B0C (122\u00B0F), releasing seeds onto freshly burned mineral soil' },
        { species: 'Black Spruce', adaptation: 'Semi-serotinous cones; thick organic layer beneath spruce forests burns and prepares seedbed. Can also layer (clone) from lower branches' },
        { species: 'Fireweed', adaptation: 'Wind-dispersed seeds colonize burns within weeks; name reflects its role as the first plant to appear after fire' },
        { species: 'Morel Mushroom', adaptation: 'Mass fruiting in the spring following forest fire; mycorrhizal networks expand in post-fire conditions' },
        { species: 'Black-backed Woodpecker', adaptation: 'Specially adapted to feed on wood-boring beetles that colonize fire-killed trees; depends entirely on recent burns' }
      ],
      withoutFire: 'Without fire, boreal forests accumulate deep organic layers that insulate permafrost and acidify soil. Paludification (peat accumulation) eventually converts forest to bog. Fire resets this cycle, maintaining productive forest.',
      color: '#0369a1'
    },
    {
      id: 'savanna',
      name: 'African Savanna',
      icon: '\uD83E\uDD81',
      region: 'Sub-Saharan Africa',
      fireInterval: '1\u20135 years',
      description: 'The world\u2019s most extensive fire-maintained ecosystem. Annual fires maintain the grass-tree balance that supports Earth\u2019s greatest concentrations of large mammals.',
      fireRole: 'Dry-season fires burn dead grass, killing tree seedlings and preventing woodland enclosure. Grasses have growing points at or below ground level and recover within weeks. Large herbivores (elephants, buffalo) and fire work together as \u201Cengineers\u201D maintaining open savanna. Without both, savanna converts to dense woodland.',
      adaptations: [
        { species: 'Elephant Grass', adaptation: 'Growing point below soil surface; fire removes dead thatch, stimulating nutrient-rich regrowth within 2 weeks' },
        { species: 'Baobab', adaptation: 'Thick, fire-resistant bark (up to 4 inches); stores water in trunk; can survive repeated burns for 1,000+ years' },
        { species: 'Protea', adaptation: 'Woody seedheads open after fire; some species are serotinous. Fire stimulates mass flowering' },
        { species: 'Secretarybird', adaptation: 'Hunts in recently burned areas where prey (snakes, rodents) are exposed and fleeing' },
        { species: 'Termite Mounds', adaptation: 'Fire-resistant structures serve as refugia during burns; become nutrient hotspots and seedling nurseries' }
      ],
      withoutFire: 'Bush encroachment: without fire, woody plants overtake grasslands. This has occurred across millions of hectares in southern Africa, collapsing grazing capacity, reducing water tables, and threatening savanna-dependent megafauna.',
      color: '#ca8a04'
    },
    {
      id: 'eucalyptus',
      name: 'Eucalyptus Forest',
      icon: '\uD83C\uDDE6\uD83C\uDDFA',
      region: 'Australia',
      fireInterval: '5\u201330 years',
      description: 'Eucalyptus forests are among the most fire-adapted on Earth. Eucalyptus trees actively promote fire through volatile oils, shedding bark, and canopy architecture \u2014 an evolutionary strategy to eliminate competitors.',
      fireRole: 'Eucalyptus sheds ribbons of oily bark that carry fire across the landscape. Volatile oils in leaves (cineole, pinene) make canopies highly flammable. After fire, eucalyptus resprouts from epicormic buds beneath bark or from lignotubers at the base \u2014 faster than any competitor. Fire is not something eucalyptus merely survives; it is something eucalyptus has evolved to CREATE.',
      adaptations: [
        { species: 'Mountain Ash (E. regnans)', adaptation: 'World\u2019s tallest flowering plant (100m+). Obligate seeder: killed by fire but drops millions of seeds from crown. Seedlings require full-sun post-fire conditions' },
        { species: 'Scribbly Gum', adaptation: 'Epicormic buds beneath bark sprout within 2-3 weeks of fire, producing a full canopy before competitors can germinate' },
        { species: 'Grass Tree (Xanthorrhoea)', adaptation: 'Blackened trunk insulates growing point; flowers prolifically after fire (10x more than unburned). Aboriginal people used the resin as adhesive' },
        { species: 'Lyrebird', adaptation: 'Forages in recently burned leaf litter; spreads soil fungi through the burn scar, accelerating forest recovery' },
        { species: 'Banksia', adaptation: 'Woody follicles open ONLY after fire; seeds dispersed onto bare mineral soil for maximum germination success' }
      ],
      withoutFire: 'Fuel accumulates to extreme levels. When fire inevitably occurs (from lightning), it burns at catastrophic intensity, killing even fire-adapted species and sterilizing soil. The 2019-2020 Black Summer fires were a direct result of fuel accumulation from decades of reduced burning.',
      color: '#ea580c'
    },
    {
      id: 'tallgrass',
      name: 'Tallgrass Prairie',
      icon: '\uD83C\uDF3E',
      region: 'Central North America',
      fireInterval: '1\u20134 years',
      description: 'The tallgrass prairie once covered 170 million acres of central North America. Less than 4% remains. Fire was the primary force maintaining grassland against forest encroachment.',
      fireRole: 'Spring fires remove dead thatch, warm the soil 10-15\u00B0F earlier, and stimulate deep-rooted warm-season grasses. Fire kills invading tree seedlings (especially eastern red cedar) whose growing points are above ground. The resulting nutrient flush produces grass growth 30-50% greater than unburned areas.',
      adaptations: [
        { species: 'Big Bluestem', adaptation: 'Roots extend 6-10 feet deep; growing point is below ground. Fire removes thatch and triggers explosive spring growth' },
        { species: 'Compass Plant', adaptation: 'Taproot 15+ feet deep survives any fire; leaves orient north-south to maximize photosynthesis (hence the name)' },
        { species: 'Prairie Chicken', adaptation: 'Males display (boom) on recently burned open ground; requires mosaic of burned and unburned patches for nesting cover' },
        { species: 'Bison', adaptation: 'Preferentially graze recently burned areas (pyric herbivory); wallowing creates depressions that hold rainwater and support unique plant communities' },
        { species: 'Eastern Red Cedar', adaptation: 'FIRE-SENSITIVE invader: without fire, cedar overtakes prairie within 20-30 years, shading out all grasses and wildflowers' }
      ],
      withoutFire: 'Eastern red cedar invasion is the #1 threat to remaining tallgrass prairie. Cedar canopy closes within 20 years without fire, eliminating grassland birds, wildflowers, and grazing capacity. Oklahoma alone loses 762 acres of grassland to cedar PER DAY.',
      color: '#854d0e'
    }
  ];

  // ═══════════════════════════════════════════
  // FIRE SCIENCE CONCEPTS
  // ═══════════════════════════════════════════

  var FIRE_SCIENCE = [
    {
      id: 'fireTriangle',
      name: 'The Fire Triangle',
      icon: '\u25B3',
      description: 'Every fire requires three elements: heat (ignition source), fuel (organic material), and oxygen. Remove any one element and the fire goes out. Indigenous fire practitioners manipulate all three: choosing ignition timing (heat), managing fuel loads through regular burning (fuel), and burning when humidity/moisture reduces oxygen availability.',
      elements: [
        { name: 'Heat', icon: '\uD83C\uDF21\uFE0F', desc: 'Ignition temperature for wood is ~300\u00B0C (572\u00B0F). Indigenous practitioners use wind, slope, and time of day to control fire intensity.' },
        { name: 'Fuel', icon: '\uD83C\uDF3F', desc: 'Dead leaves, branches, grass, and woody debris. Fuel moisture content determines if fire will carry. Regular cultural burning keeps fuel loads LOW.' },
        { name: 'Oxygen', icon: '\uD83D\uDCA8', desc: 'Wind provides oxygen and drives fire spread. Burning in calm conditions or when humidity is high (early morning, after light rain) keeps fire intensity low.' }
      ]
    },
    {
      id: 'fireBehavior',
      name: 'Fire Behavior',
      icon: '\uD83D\uDD25',
      description: 'Fire behaves differently depending on where it burns in the forest structure. Understanding these types is key to both Indigenous fire management and modern prescribed burning.',
      elements: [
        { name: 'Ground Fire', icon: '\uD83E\uDEA8', desc: 'Smolders in organic soil layers (duff, peat). Very slow, hard to detect, can burn for weeks. Used by Amazonian peoples to create biochar.' },
        { name: 'Surface Fire', icon: '\uD83C\uDF42', desc: 'Burns leaf litter and small fuels on the forest floor. LOW intensity. This is the type used in cultural burning \u2014 gentle enough that animals can walk away and trees survive.' },
        { name: 'Crown Fire', icon: '\uD83C\uDF32', desc: 'Burns through tree canopies. HIGH intensity, often lethal. Crown fires occur when fuel ladders (understory buildup from fire suppression) allow surface fire to climb into the canopy.' }
      ]
    },
    {
      id: 'fuelMoisture',
      name: 'Fuel Moisture & Fire Weather',
      icon: '\uD83D\uDCA7',
      description: 'Fuel moisture content is the single most important factor in fire behavior. Indigenous practitioners have always understood this \u2014 choosing to burn when moisture levels allow controlled, low-intensity fire.',
      elements: [
        { name: '1-Hour Fuels', icon: '\uD83C\uDF43', desc: 'Fine twigs < 0.25 inches. Respond to weather within 1 hour. Dry out fastest. Primary carrier of surface fire in cultural burns.' },
        { name: '10-Hour Fuels', icon: '\uD83E\uDEB5', desc: 'Branches 0.25-1 inch. Take ~10 hours to adjust moisture. Important for sustained burning.' },
        { name: '100-Hour Fuels', icon: '\uD83E\uDE9A', desc: 'Branches 1-3 inches. Heavy fuels that burn only in dry conditions. Cultural burning rarely consumes these.' },
        { name: '1000-Hour Fuels', icon: '\uD83C\uDF33', desc: 'Logs > 3 inches. Only burn in severe drought. When these ignite, fire is too intense to control \u2014 this is wildfire territory.' }
      ]
    },
    {
      id: 'succession',
      name: 'Post-Fire Succession',
      icon: '\uD83C\uDF31',
      description: 'After fire, ecosystems recover in predictable stages. Indigenous fire practitioners understood and managed these stages to maximize biodiversity and food production.',
      elements: [
        { name: 'Stage 1: Pioneer (0\u20132 years)', icon: '\uD83C\uDF3E', desc: 'Fireweed, grasses, and annual wildflowers colonize bare ground. Soil fungi (morels!) fruit. Highest plant diversity.' },
        { name: 'Stage 2: Shrub (3\u201310 years)', icon: '\uD83C\uDF3F', desc: 'Shrubs (huckleberry, ceanothus, hazel) establish. Berry production peaks. Deer and elk browse heavily.' },
        { name: 'Stage 3: Young Forest (10\u201350 years)', icon: '\uD83C\uDF32', desc: 'Trees overtop shrubs. Canopy begins to close. Shade-intolerant species decline. Berry production drops.' },
        { name: 'Stage 4: Mature Forest (50\u2013200+ years)', icon: '\uD83C\uDF33', desc: 'Closed canopy. Deep shade eliminates understory diversity. Fuel accumulates. Without fire, this stage is \u201Cstuck\u201D and vulnerable to catastrophic wildfire.' }
      ]
    },
    {
      id: 'carbonCycle',
      name: 'Fire & the Carbon Cycle',
      icon: '\u2601\uFE0F',
      description: 'A common misconception is that fire releases carbon and is therefore \u201Cbad for climate.\u201D The reality is more nuanced \u2014 especially when comparing cultural burning to catastrophic wildfire.',
      elements: [
        { name: 'Cultural Burn Carbon', icon: '\uD83C\uDF31', desc: 'Low-intensity surface fires release small amounts of CO\u2082 from leaf litter. Trees survive and continue sequestering carbon. Soil carbon is preserved. Net effect: near carbon-neutral.' },
        { name: 'Wildfire Carbon', icon: '\uD83D\uDCA5', desc: 'High-intensity crown fires kill trees (releasing stored carbon), burn soil organic matter (releasing ancient carbon), and sterilize soil microbes (reducing future carbon uptake). Net: massive carbon release.' },
        { name: 'Biochar Carbon', icon: '\u26AB', desc: 'Charcoal produced by low-intensity fire (terra preta technique) locks carbon in soil for 1,000-4,000+ years. Cultural burning is actually a carbon SEQUESTRATION strategy.' },
        { name: 'The Math', icon: '\uD83D\uDCCA', desc: 'One acre of wildfire releases 20-60 tons of CO\u2082. The same acre under cultural burning releases 2-5 tons. Preventing one wildfire acre through cultural burning saves 15-55 tons of carbon.' }
      ]
    },
    {
      id: 'suppressionHistory',
      name: 'The Suppression Era & Its Consequences',
      icon: '\u26D4',
      description: 'For over a century, Western governments pursued total fire suppression \u2014 banning Indigenous burning practices and fighting every wildfire. The consequences have been devastating.',
      elements: [
        { name: '1910: The Big Blowup', icon: '\uD83D\uDCC5', desc: 'Massive wildfires across Idaho/Montana killed 85 firefighters and burned 3 million acres. Catalyzed the US policy of suppressing ALL fires \u2014 a policy that directly contradicted millennia of Indigenous fire management.' },
        { name: 'The Fuel Debt', icon: '\uD83D\uDCE6', desc: 'Every year without fire adds fuel to the forest floor. After 100 years of suppression, forests hold 10-50x more fuel than they did under Indigenous management. This is called the \u201Cfuel debt.\u201D' },
        { name: 'The Megafire Era', icon: '\uD83D\uDD25', desc: 'Since 2000, wildfire seasons have grown 78 days longer. The area burned annually has quadrupled. Fire suppression did not prevent fire \u2014 it made fire catastrophic.' },
        { name: 'The Paradigm Shift', icon: '\uD83D\uDD04', desc: 'Land management agencies are now acknowledging that Indigenous fire practices were superior. Prescribed burning budgets are increasing, and co-management agreements with tribal nations are expanding.' }
      ]
    }
  ];

  // ═══════════════════════════════════════════
  // FOREST SIMULATION MODEL
  // ═══════════════════════════════════════════

  var SIM_DEFAULTS = {
    year: 0,
    fuelLoad: 15,           // tons/acre (natural with Indigenous burning: 5-15; suppressed: 30-80)
    canopyCover: 60,        // percent
    understoryDensity: 20,  // percent (low = open, park-like; high = thicket)
    soilHealth: 80,         // 0-100
    biodiversity: 85,       // 0-100
    carbonStored: 50,       // tons/acre
    waterYield: 80,         // percent of precipitation that reaches streams
    yearsSinceLastBurn: 0,
    totalBurns: 0,
    wildfires: 0,
    strategy: 'indigenous', // 'indigenous' | 'suppress' | 'prescribe'
    eventLog: [],
    decade: []              // array of decade snapshots for the graph
  };

  // ═══════════════════════════════════════════
  // QUIZ QUESTIONS
  // ═══════════════════════════════════════════

  var QUIZ_QUESTIONS = [
    { q: 'How long have Aboriginal Australians used fire to manage the landscape?', choices: ['500 years', '5,000 years', '65,000+ years', '200 years'], answer: 2 },
    { q: 'What is a \u201Cserotinous\u201D cone?', choices: ['A cone that opens in water', 'A cone sealed with resin that opens only with fire heat', 'A cone that is poisonous', 'A cone that grows underground'], answer: 1 },
    { q: 'What happens when fire is completely suppressed in a forest for 50+ years?', choices: ['The forest becomes healthier', 'Fuel accumulates, making catastrophic wildfire inevitable', 'Trees grow faster', 'Animals thrive'], answer: 1 },
    { q: 'What is \u201Cterra preta\u201D?', choices: ['A type of volcanic rock', 'Extremely fertile dark soil created by Indigenous Amazonian peoples using fire and charcoal', 'A fire-resistant tree species', 'A Spanish word for fire'], answer: 1 },
    { q: 'The longleaf pine savanna once covered 90 million acres. What percentage remains today?', choices: ['50%', '25%', '3%', '75%'], answer: 2 },
    { q: 'Why did Plains Nations burn the prairie?', choices: ['To destroy enemy camps', 'To attract bison to nutritious new grass growth', 'To create charcoal', 'To signal for rain'], answer: 1 },
    { q: 'What is a \u201Cfuel ladder\u201D?', choices: ['A tool firefighters use to climb trees', 'Continuous vertical vegetation that allows surface fire to climb into the tree canopy', 'A type of fire escape', 'A device that measures fuel moisture'], answer: 1 },
    { q: 'What type of fire is used in cultural burning?', choices: ['Crown fire', 'Ground fire', 'Low-intensity surface fire', 'Firestorm'], answer: 2 },
    { q: 'Which plant produces seeds that ONLY germinate after fire?', choices: ['Oak', 'Maple', 'California Fire Poppy', 'Rose'], answer: 2 },
    { q: 'How does cultural burning compare to wildfire for carbon emissions?', choices: ['Cultural burning releases MORE carbon', 'They release the same amount', 'Cultural burning releases 5-10x LESS carbon per acre', 'Cultural burning releases no carbon at all'], answer: 2 },
    { q: 'What did Coast Salish peoples burn prairies to maintain?', choices: ['Cotton fields', 'Camas lily meadows for food harvest', 'Tobacco crops', 'Corn fields'], answer: 1 },
    { q: 'The US policy of total fire suppression began after which event?', choices: ['The Civil War', 'The 1910 Big Blowup fires', 'World War II', 'The Yellowstone fires of 1988'], answer: 1 },
    { q: 'Biochar (charcoal in soil) can store carbon for how long?', choices: ['1-5 years', '10-50 years', '1,000-4,000+ years', 'It releases carbon immediately'], answer: 2 },
    { q: 'What does \u201Cpyric herbivory\u201D mean?', choices: ['Animals that eat fire-adapted plants', 'The interaction between fire and grazing animals like bison', 'Burning herbs for medicine', 'Plants that are poisonous after fire'], answer: 1 },
    { q: 'Eucalyptus trees promote fire by:', choices: ['Calling lightning', 'Shedding oily bark and releasing volatile oils from leaves', 'Growing near volcanoes', 'Absorbing all moisture from soil'], answer: 1 },
    { q: 'Why are Garry oak savannas endangered in British Columbia?', choices: ['Climate change made it too cold', 'Without Indigenous burning, Douglas-fir overtops and shades out the oaks', 'People cut down all the oaks', 'Invasive insects killed them'], answer: 1 }
  ];

  // ═══════════════════════════════════════════
  // PRESCRIBED BURN PLANNER
  // ═══════════════════════════════════════════

  var BURN_WEATHER = {
    temperature: { min: 40, max: 80, ideal: [50, 70], unit: '\u00B0F', label: 'Temperature' },
    humidity: { min: 20, max: 80, ideal: [30, 55], unit: '%', label: 'Relative Humidity' },
    windSpeed: { min: 0, max: 25, ideal: [3, 12], unit: 'mph', label: 'Wind Speed' },
    fuelMoisture: { min: 5, max: 40, ideal: [12, 25], unit: '%', label: 'Fuel Moisture' }
  };

  // ═══════════════════════════════════════════
  // SMOKE ECOLOGY & FIRE-DEPENDENT GERMINATION
  // ═══════════════════════════════════════════

  var SMOKE_ECOLOGY = {
    title: 'Smoke Ecology: How Smoke Triggers Life',
    intro: 'For decades, scientists assumed fire-dependent seeds responded to heat alone. The discovery of karrikinolide (KAR\u2081) in 2004 revealed a far more elegant system: specific chemicals IN SMOKE act as germination signals. This means plants don\u2019t just survive fire \u2014 they listen for it.',
    chemicals: [
      { name: 'Karrikinolide (KAR\u2081)', formula: 'C\u2088H\u2086O\u2083', desc: 'Discovered in smoke from burned vegetation. Triggers germination in over 1,200 plant species worldwide. Active at concentrations as low as 1 part per billion. Works by binding to KAI2 receptor proteins in seeds.', color: '#f97316' },
      { name: 'Cyanohydrin (Glyceronitrile)', formula: 'C\u2083H\u2085NO\u2082', desc: 'A second smoke-derived germination trigger discovered in 2020. Works synergistically with karrikinolide. May be responsible for germination in species that don\u2019t respond to KAR\u2081 alone.', color: '#3b82f6' },
      { name: 'Nitric Oxide (NO)', formula: 'NO', desc: 'Produced during combustion. Breaks seed dormancy in some species by mimicking natural dormancy-breaking signals. Also promotes root growth in seedlings.', color: '#22c55e' },
      { name: 'Ethylene', formula: 'C\u2082H\u2084', desc: 'Gaseous plant hormone concentrated in smoke. Triggers fruit ripening and seed maturation. May signal seeds that fire conditions have created open habitat.', color: '#a855f7' }
    ],
    fireSeeds: [
      { species: 'California Fire Poppy (Papaver californicum)', strategy: 'Seeds dormant 50-100+ years in soil. Germinate ONLY after fire. Entire hillsides turn orange the first spring after wildfire.', type: 'smoke-responsive', icon: '\uD83C\uDF3A' },
      { species: 'Giant Sequoia (Sequoiadendron giganteum)', strategy: 'Cones open from fire heat; seeds need bare mineral soil and sunlight. Seedlings cannot establish without fire clearing the forest floor.', type: 'serotinous + heat', icon: '\uD83C\uDF32' },
      { species: 'Jack Pine (Pinus banksiana)', strategy: 'Serotinous cones sealed with resin that melts at 50\u00B0C (122\u00B0F). Seeds released onto fire-prepared mineral seedbed.', type: 'serotinous', icon: '\uD83C\uDF32' },
      { species: 'Banksia (multiple species)', strategy: 'Woody follicles held in canopy for years. Fire melts resin seal, releasing seeds onto bare ground below. Some Banksia die in fire and regenerate only from seed (obligate seeders).', type: 'serotinous', icon: '\uD83C\uDF3F' },
      { species: 'Whispering Bells (Emmenanthe penduliflora)', strategy: 'Named for the sound dried seed capsules make in wind. Seeds respond to karrikinolide in smoke. Mass germination creates \u201Cfire follower\u201D meadows.', type: 'smoke-responsive', icon: '\uD83D\uDD14' },
      { species: 'Ceanothus (multiple species)', strategy: 'Hard seed coat cracked by fire heat (scarification). Nitrogen-fixing roots enrich post-fire soil. Critical nurse plant for forest recovery.', type: 'heat-scarified', icon: '\uD83C\uDF3F' },
      { species: 'Lodgepole Pine (Pinus contorta)', strategy: 'Semi-serotinous cones \u2014 some open without fire, but mass release occurs after fire. Colonizes burns in dense, even-aged stands.', type: 'semi-serotinous', icon: '\uD83C\uDF32' },
      { species: 'Fireweed (Chamerion angustifolium)', strategy: 'Wind-dispersed seeds colonize burns within days. Named for being the first plant visible after fire. Roots can also survive underground.', type: 'pioneer wind-dispersal', icon: '\uD83C\uDF3A' },
      { species: 'Grass Tree (Xanthorrhoea, Australia)', strategy: 'Flowers 10x more prolifically after fire. Aboriginal Australians used the fire-induced flowering to time resin collection. One of the most recognizable fire-adapted plants on Earth.', type: 'fire-stimulated flowering', icon: '\uD83C\uDF34' },
      { species: 'Protea (South Africa)', strategy: 'Woody seedheads protect seeds in canopy. Fire opens seedheads and clears competitors. Some species are \u201Csprouters\u201D (resprout from rootstock); others are \u201Cseeders\u201D (killed, regenerate from seed only).', type: 'canopy seed bank', icon: '\uD83C\uDF3B' }
    ],
    strategies: [
      { name: 'Serotiny', desc: 'Cones/fruits sealed with resin that melts in fire heat, releasing stored seeds onto freshly prepared ground. Examples: Jack pine, lodgepole pine, Banksia.', icon: '\uD83C\uDF32' },
      { name: 'Smoke-Responsive Germination', desc: 'Seeds contain KAI2 receptor proteins that detect karrikinolide and other smoke chemicals, breaking dormancy. Seeds may wait decades for the fire signal. Examples: fire poppy, whispering bells.', icon: '\uD83D\uDCA8' },
      { name: 'Heat Scarification', desc: 'Hard seed coat must be cracked by fire temperature (typically 80-120\u00B0C) before water can enter and germination begin. Examples: Ceanothus, Acacia, many legumes.', icon: '\uD83C\uDF21\uFE0F' },
      { name: 'Epicormic Sprouting', desc: 'Dormant buds beneath bark activate after fire kills the canopy. New shoots emerge directly from trunk and branches within weeks. Examples: eucalyptus, coast live oak.', icon: '\uD83C\uDF3F' },
      { name: 'Lignotuber Resprouting', desc: 'Massive underground woody root burl stores energy and contains hundreds of dormant buds. Even if the entire aboveground plant is killed, the lignotuber resprouts. Examples: manzanita, chamise, many eucalyptus.', icon: '\uD83E\uDEB5' },
      { name: 'Fire-Stimulated Flowering', desc: 'Plants produce far more flowers and seeds after fire than in unburned conditions. Fire provides nutrient flush and full sunlight. Examples: grass tree, many orchids, Watsonia.', icon: '\uD83C\uDF3A' }
    ]
  };

  // ═══════════════════════════════════════════
  // WATERSHED & WATER SCIENCE
  // ═══════════════════════════════════════════

  var WATERSHED_SCIENCE = {
    title: 'Fire & Water: How Burning Protects Watersheds',
    intro: 'Counterintuitively, regular low-intensity fire is one of the best ways to protect clean water. Catastrophic wildfire is one of the worst threats to water quality. Indigenous fire keepers understood this connection \u2014 protecting water by managing fire.',
    concepts: [
      { name: 'Cultural Burn \u2192 Healthy Watershed', icon: '\uD83D\uDCA7', desc: 'Low-intensity fire thins understory, reducing water competition. Mature trees survive and stabilize soil with deep roots. Soil structure is preserved, maintaining infiltration capacity. Stream flows increase 10-20% after understory thinning.', impact: 'positive', color: '#22c55e' },
      { name: 'Wildfire \u2192 Watershed Devastation', icon: '\u26A0\uFE0F', desc: 'High-intensity fire kills trees, burns root systems, and creates hydrophobic (water-repellent) soil layers. With no roots or litter to slow runoff, the next rain causes flash floods and debris flows. Sediment loads in streams increase 100-1000x.', impact: 'negative', color: '#ef4444' },
      { name: 'Hydrophobic Soil Layer', icon: '\uD83E\uDEA8', desc: 'When intense fire vaporizes organic compounds in soil, the gases condense below the surface creating a waxy, water-repellent layer. This \u201Chydrophobic\u201D layer prevents rain from infiltrating, causing catastrophic surface runoff even in moderate storms.', impact: 'negative', color: '#dc2626' },
      { name: 'Post-Fire Debris Flows', icon: '\uD83C\uDF0A', desc: 'After high-severity wildfire, rainstorms mobilize loose ash, soil, and dead vegetation into fast-moving debris flows. The 2018 Montecito debris flow (CA) killed 23 people after the Thomas Fire burned the watershed above the town. Low-intensity cultural burning prevents this chain of events.', impact: 'negative', color: '#b91c1c' },
      { name: 'Municipal Water Supply', icon: '\uD83D\uDEB0', desc: 'Over 60% of US fresh water originates in forested watersheds. Denver, Portland, Seattle, and many cities depend on forested mountains for drinking water. Catastrophic wildfire in these watersheds costs hundreds of millions in water treatment and infrastructure repair.', impact: 'negative', color: '#0369a1' },
      { name: 'Indigenous Water-Fire Connection', icon: '\u2728', desc: 'Many Indigenous cultures explicitly connect fire and water stewardship. The Karuk word for \u201Cgood fire\u201D is linked to concepts of clean water flowing downstream. Australian Aboriginal burning protects water holes by preventing uncontrolled fire from reaching them. The lesson: managing fire IS managing water.', impact: 'positive', color: '#7c3aed' }
    ],
    comparison: {
      culturalBurn: { sediment: '0.1-0.5 tons/acre', waterTemp: '+0-1\u00B0F', aquaticLife: 'Minimal impact', recovery: 'Immediate', runoff: 'No increase' },
      wildfire: { sediment: '10-100 tons/acre', waterTemp: '+5-15\u00B0F (lethal to trout)', aquaticLife: 'Fish kills, invertebrate loss', recovery: '5-20 years', runoff: '200-500% increase' }
    }
  };

  // ═══════════════════════════════════════════
  // CASE STUDIES: REAL-WORLD WILDFIRE EVENTS
  // ═══════════════════════════════════════════

  var CASE_STUDIES = [
    {
      id: 'blackSummer',
      name: '2019-2020 Australian Black Summer',
      icon: '\uD83C\uDDE6\uD83C\uDDFA',
      year: '2019-2020',
      location: 'Australia (NSW, Victoria, SA, QLD)',
      stats: { acresBurned: '46 million', structuresDestroyed: '5,900+', deaths: '34 direct, 445 smoke-related', animalDeaths: '~3 billion', cost: 'AUD $100+ billion' },
      description: 'The most destructive wildfire season in recorded Australian history. Fires burned continuously for months across southeastern Australia, creating pyrocumulonimbus clouds (fire-generated thunderstorms) that spawned new fires via lightning. Smoke reached South America and New Zealand.',
      indigenousContext: 'Aboriginal fire practitioners had warned for decades that the cessation of cultural burning after colonization was creating a catastrophic fuel load. Victor Steffensen, a Tagalaka man and fire practitioner, had been advocating for the return of Indigenous fire management. After Black Summer, the Australian government finally began funding Aboriginal cultural burning programs at scale.',
      lesson: 'Black Summer was not a natural disaster \u2014 it was the predictable consequence of removing Indigenous fire management from a fire-adapted landscape. 65,000 years of Aboriginal burning had prevented exactly this scenario. One century of colonial fire suppression undid it.',
      scienceNote: 'Several eucalyptus forests burned so intensely that even fire-adapted species were killed \u2014 an unprecedented event suggesting fire severity exceeded the adaptive range of the ecosystem. Normally, epicormic sprouting allows eucalyptus to recover within weeks. When fire is hot enough to kill even these buds, recovery takes decades.',
      color: '#dc2626'
    },
    {
      id: 'campFire',
      name: '2018 Camp Fire (Paradise, CA)',
      icon: '\uD83C\uDDFA\uD83C\uDDF8',
      year: '2018',
      location: 'Butte County, California, USA',
      stats: { acresBurned: '153,336 acres', structuresDestroyed: '18,804', deaths: '85', displaced: '50,000+', cost: '$16.5 billion' },
      description: 'The deadliest and most destructive wildfire in California history. The Camp Fire destroyed the town of Paradise in less than 4 hours, moving at up to 80 football fields per minute. Many residents had no time to evacuate. The fire was driven by extreme winds and decades of fuel accumulation.',
      indigenousContext: 'The Konkow Maidu people \u2014 the original inhabitants of the Paradise area \u2014 practiced regular cultural burning of the foothill woodlands. Maidu burning maintained open, park-like forests with low fuel loads. After Maidu removal and a century of fire suppression, the same landscape became a dense, fuel-heavy tinderbox. Maidu elder and fire practitioner Trina Cunningham has advocated for returning cultural burning to the Butte County landscape.',
      lesson: 'Paradise was built in a landscape shaped by millennia of Maidu fire management, then stripped of that management for a century. The fuels that burned Paradise had been accumulating since the Maidu were displaced. Rebuilding without restoring Indigenous fire management is rebuilding to burn again.',
      scienceNote: 'The Camp Fire produced ember transport up to 1 mile ahead of the fire front. Structures ignited from ember rain, not direct flame contact. This \u201Cspot fire\u201D behavior is characteristic of extreme fuel loads \u2014 the kind that would not exist under regular cultural burning.',
      color: '#ea580c'
    },
    {
      id: 'yellowstone1988',
      name: '1988 Yellowstone Fires',
      icon: '\uD83E\uDD2C',
      year: '1988',
      location: 'Yellowstone National Park, Wyoming, USA',
      stats: { acresBurned: '793,880 acres (36% of park)', structuresDestroyed: '67', deaths: '0 civilian', cost: '$120 million (firefighting)', firefighters: '25,000 deployed' },
      description: 'The Yellowstone fires of 1988 were a turning point in American fire policy. After decades of total suppression, nearly 800,000 acres burned in a single season. The fires shocked the public but became a landmark case study in fire ecology \u2014 the park recovered faster and more beautifully than anyone expected.',
      indigenousContext: 'Before the park was created in 1872, the Crow, Shoshone, Blackfeet, and Bannock peoples all managed the Yellowstone landscape with fire. The \u201Cpristine wilderness\u201D that park founders sought to preserve was, in fact, a fire-managed landscape. When Indigenous burning was replaced by suppression, fuel accumulated for over a century until 1988.',
      lesson: 'Yellowstone 1988 forced the US to confront a fundamental truth: fire suppression does not prevent fire \u2014 it delays and intensifies it. The fires also demonstrated the resilience of fire-adapted ecosystems. By 1990, burned areas were already covered in fireweed, lodgepole seedlings, and wildflowers. The \u201Cdevastated\u201D landscape became a laboratory for ecological recovery.',
      scienceNote: 'Lodgepole pine serotinous cones released an estimated 50,000-1,000,000 seeds per acre after the fires. By 2000, burned areas supported twice as many plant species as unburned old-growth. Moose, elk, and bison populations thrived on the nutritious regrowth. The fires created the Yellowstone we enjoy today.',
      color: '#f59e0b'
    },
    {
      id: 'montecito2018',
      name: '2018 Montecito Debris Flow',
      icon: '\uD83C\uDF0A',
      year: '2018',
      location: 'Montecito, Santa Barbara County, CA',
      stats: { deaths: '23', structuresDestroyed: '130', damaged: '300+', displaced: '30,000', debrisVolume: '500,000+ cubic yards', rainfall: '0.5 inches in 5 minutes' },
      description: 'One month after the Thomas Fire burned the steep slopes above Montecito, a brief rainstorm triggered catastrophic debris flows that buried homes under 15 feet of mud, boulders, and debris. The connection between wildfire and flood was devastating: fire burned the vegetation and soil, then rain mobilized everything downhill.',
      indigenousContext: 'The Chumash people managed the Santa Barbara coastal mountains with fire for thousands of years. Chumash burning maintained low fuel loads and preserved root systems that stabilized slopes. The Thomas Fire that set the stage for the debris flow was fueled by decades of suppression-era fuel accumulation \u2014 fuel that would not have existed under Chumash fire management.',
      lesson: 'Montecito demonstrates that fire and water are connected systems. You cannot separate wildfire policy from flood and debris flow risk. Cultural burning prevents the cascade: no fuel accumulation \u2192 no catastrophic fire \u2192 no hydrophobic soil \u2192 no debris flow. The 23 deaths in Montecito were, ultimately, a consequence of fire suppression.',
      scienceNote: 'The debris flow was triggered by less than 0.5 inches of rain in 5 minutes. Normally, this would cause no damage. But the Thomas Fire had created a hydrophobic (water-repellent) soil layer on the slopes above Montecito. With no vegetation to slow runoff and no soil infiltration capacity, even modest rain became lethal.',
      color: '#0369a1'
    },
    {
      id: 'oregonLabor2020',
      name: '2020 Oregon Labor Day Fires',
      icon: '\uD83C\uDF32',
      year: '2020',
      location: 'Western Oregon, USA',
      stats: { acresBurned: '1.1 million acres', structuresDestroyed: '4,000+', deaths: '9', displaced: '500,000 (10% of state under evacuation notice)', towns: 'Detroit, Blue River, Vida, Phoenix, Talent' },
      description: 'An unprecedented east wind event drove multiple fires simultaneously through the Cascade Range and into the Willamette Valley, destroying entire towns in hours. The fires burned through 100+ years of accumulated fuels in landscapes that historically burned every 5-15 years under Indigenous management.',
      indigenousContext: 'The Kalapuya people burned the Willamette Valley annually for at least 6,000 years, maintaining the prairie and oak savanna ecosystem. The Molalla people burned the Cascade foothills. After colonization, fire suppression allowed dense Douglas-fir regrowth across the entire landscape. The 2020 fires burned through forests that had been accumulating fuel since the Kalapuya were displaced in the 1850s \u2014 170 years of fuel debt.',
      lesson: 'The 2020 Oregon fires burned areas where Indigenous peoples had maintained open, fire-resistant landscapes for millennia. The towns destroyed (Detroit, Blue River) were built in narrow canyons that the Molalla had kept clear through regular burning. Without that burning, the canyons became chimneys of accumulated fuel.',
      scienceNote: 'Wind speeds of 40-60 mph pushed fire through 100,000+ acres in a single day. Fire behavior modeling showed that fuel loads were 3-5x what they would have been under pre-colonial Indigenous burning regimes. At Indigenous fuel levels, the same wind event would have produced fast but survivable surface fires.',
      color: '#16a34a'
    }
  ];

  // ═══════════════════════════════════════════
  // CARBON CALCULATOR DATA
  // ═══════════════════════════════════════════

  var CARBON_DATA = {
    culturalBurn: {
      label: 'Cultural Burn (Indigenous)',
      color: '#22c55e',
      co2PerAcre: 3,           // tons CO2/acre
      treeSurvival: 95,        // percent
      soilCarbon: 'preserved', // soil C intact
      biocharCreated: 0.5,     // tons biochar/acre (locks carbon for millennia)
      recoveryTime: 0,         // years (trees survive)
      netCarbon10yr: -2,       // net sequestration (negative = carbon sink) per acre over 10 years
      description: 'Low-intensity surface fire. Trees survive and continue growing. Soil carbon preserved. Biochar (charcoal) created in soil locks carbon for 1,000+ years. Net result over 10 years: carbon SINK.'
    },
    prescribedBurn: {
      label: 'Prescribed Burn (Western)',
      color: '#f59e0b',
      co2PerAcre: 5,
      treeSurvival: 90,
      soilCarbon: 'mostly preserved',
      biocharCreated: 0.3,
      recoveryTime: 1,
      netCarbon10yr: 0,
      description: 'Slightly higher intensity than cultural burn. Most trees survive. Some soil disturbance. Less biochar produced due to different ignition patterns. Net result over 10 years: approximately carbon-neutral.'
    },
    wildfire: {
      label: 'Catastrophic Wildfire',
      color: '#ef4444',
      co2PerAcre: 40,
      treeSurvival: 15,
      soilCarbon: 'destroyed',
      biocharCreated: 0,
      recoveryTime: 30,
      netCarbon10yr: 50,
      description: 'Crown fire kills 85% of trees, releasing all stored carbon. Soil organic matter combusted. Hydrophobic soil layer prevents revegetation. No biochar (too hot). Net result over 10 years: massive carbon source. Takes 30-50 years to re-sequester released carbon.'
    },
    suppression50yr: {
      label: '50 Years of Suppression then Wildfire',
      color: '#7f1d1d',
      co2PerAcre: 65,
      treeSurvival: 5,
      soilCarbon: 'sterilized',
      biocharCreated: 0,
      recoveryTime: 50,
      netCarbon10yr: 80,
      description: 'Half a century of fuel accumulation produces fire intensity beyond any species\u2019 adaptive range. Soil sterilized to depth. Seed banks destroyed. May convert forest to shrubland or grassland permanently (type conversion). The worst possible carbon outcome.'
    }
  };

  // ═══════════════════════════════════════════
  // FIRE FACTS
  // ═══════════════════════════════════════════

  var FIRE_FACTS = [
    '\uD83D\uDD25 Aboriginal Australians have managed fire for 65,000+ years \u2014 making cultural burning the oldest continuous land management system on Earth.',
    '\uD83C\uDF32 The giant sequoia cannot reproduce without fire. Its tiny seeds need bare mineral soil and sunlight that only fire provides.',
    '\uD83D\uDCA8 Karrikinolide, the smoke chemical that triggers seed germination, is active at just 1 part per BILLION \u2014 seeds can literally \u201Csmell\u201D fire from miles away.',
    '\uD83E\uDD2C More species live in recently burned forests than in old-growth forests. Fire creates the habitat diversity that supports biodiversity.',
    '\uD83C\uDF3E The American tallgrass prairie was NOT a natural wilderness. It was actively maintained by Indigenous burning for 8,000+ years. Without fire, it would be forest.',
    '\u2601\uFE0F One acre of catastrophic wildfire releases 20-60 tons of CO\u2082. The same acre under cultural burning releases just 2-5 tons. Fire management IS climate action.',
    '\uD83D\uDCA7 After severe wildfire, even 0.5 inches of rain can trigger deadly debris flows. Cultural burning prevents this by keeping trees alive and soil intact.',
    '\uD83C\uDF44 Morel mushrooms fruit prolifically the spring after forest fire. Fire creates ideal conditions for mycorrhizal fungi networks to expand.',
    '\uD83C\uDFD4\uFE0F Oklahoma loses 762 acres of grassland to eastern red cedar encroachment EVERY DAY \u2014 because fire suppression allows this invasive tree to take over prairie.',
    '\uD83D\uDC26 The Kirtland\u2019s warbler went down to 167 pairs because fire suppression eliminated the young jack pine stands it needs. Prescribed burning has recovered it to 2,000+ pairs.',
    '\uD83E\uDEB5 Terra preta \u2014 dark soil created by Indigenous Amazonian peoples using fire and charcoal \u2014 is STILL the most fertile soil on Earth, 4,000+ years after it was made.',
    '\uD83C\uDDE6\uD83C\uDDFA Eucalyptus trees don\u2019t just survive fire \u2014 they PROMOTE it. Volatile oils and shedding bark evolved specifically to carry fire and eliminate competitors.',
    '\uD83E\uDD81 Without fire, African savannas would be dense woodland. Fire and elephants together maintain the open grasslands that support Earth\u2019s greatest animal concentrations.',
    '\u2744\uFE0F The S\u00E1mi people of northern Scandinavia burned boreal forest to grow reindeer lichen \u2014 connecting fire management to one of Europe\u2019s last nomadic pastoral traditions.',
    '\uD83E\uDD97 The black-backed woodpecker depends ENTIRELY on recently burned forest. It can detect fires from 50+ miles away and flies toward them to colonize newly burned trees.',
    '\uD83C\uDF3A California fire poppies can remain dormant in soil for over 50 years, waiting for the smoke signal to germinate. When they do, entire hillsides turn orange overnight.',
    '\uD83D\uDCCA The US fire suppression budget has grown from $1 billion/year in 2000 to over $4 billion/year \u2014 and fire seasons have only gotten worse. Suppression doesn\u2019t work.',
    '\uD83C\uDF3F The gopher tortoise\u2019s 40-foot-deep burrows provide fire refugia for over 350 other species, including indigo snakes, burrowing owls, and gopher frogs.',
    '\uD83C\uDF0D Martu women in the Western Desert of Australia use fire as a hunting tool. Research shows their burning increases biodiversity by 70% compared to unmanaged lands.',
    '\u26AB Biochar (charcoal) in soil sequesters carbon for 1,000-4,000+ years AND improves soil fertility. Indigenous Amazonian fire management was both agriculture AND climate engineering.'
  ];

  // ═══════════════════════════════════════════
  // ADDITIONAL QUIZ QUESTIONS
  // ═══════════════════════════════════════════

  // Append to main QUIZ_QUESTIONS
  QUIZ_QUESTIONS.push(
    { q: 'What is karrikinolide?', choices: ['A type of fire extinguisher', 'A smoke chemical that triggers seed germination in 1,200+ plant species', 'An Indigenous fire tool', 'A fire-resistant mineral'], answer: 1 },
    { q: 'The Ojibwe burned blueberry barrens because:', choices: ['They wanted to clear land for farming', 'Fire stimulates blueberry production 2-4 years after burning', 'Blueberries are fire-resistant', 'It was accidental'], answer: 1 },
    { q: 'What happened one month after the Thomas Fire burned slopes above Montecito, CA?', choices: ['The forest immediately recovered', 'Brief rain triggered debris flows that killed 23 people', 'A second fire started', 'Nothing \u2014 the danger was over'], answer: 1 },
    { q: 'The San (Bushmen) of the Kalahari have used fire for approximately:', choices: ['500 years', '2,000 years', '20,000+ years', '100 years'], answer: 2 },
    { q: 'What is a hydrophobic soil layer?', choices: ['Soil that absorbs extra water', 'A water-repellent layer created by intense fire that causes devastating runoff', 'Soil near rivers', 'Frozen soil'], answer: 1 },
    { q: 'How many animal deaths were estimated in Australia\u2019s 2019-2020 Black Summer fires?', choices: ['10,000', '1 million', '~3 billion', '500'], answer: 2 },
    { q: 'The S\u00E1mi people burned boreal forest to promote:', choices: ['Pine nut harvest', 'Reindeer lichen growth for reindeer pasture', 'Gold mining', 'Whale hunting'], answer: 1 },
    { q: 'Giant sequoia seeds need fire because:', choices: ['Heat makes them taste better', 'They need bare mineral soil and sunlight that only fire creates', 'Fire makes them grow faster', 'They are fireproof'], answer: 1 },
    { q: 'What is \u201Cepicormic sprouting\u201D?', choices: ['Seeds germinating after fire', 'Dormant buds beneath bark that sprout new growth after fire kills the canopy', 'A type of fire spread', 'Mushrooms growing after rain'], answer: 1 },
    { q: 'Cultural burning protects watersheds by:', choices: ['Building dams', 'Keeping trees alive so roots stabilize soil and prevent debris flows', 'Adding chemicals to streams', 'Increasing snowpack'], answer: 1 },
    { q: 'In the 2018 Camp Fire, the town of Paradise was destroyed in:', choices: ['3 days', 'Less than 4 hours', '2 weeks', '1 month'], answer: 1 },
    { q: 'What is the \u201Cfuel debt\u201D?', choices: ['Money owed for firefighting', 'The accumulated fuel load from decades of fire suppression that makes catastrophic wildfire inevitable', 'The cost of prescribed burns', 'A tax on logging'], answer: 1 },
    { q: 'How do beaver dams help during wildfire?', choices: ['Beavers fight fires', 'Beaver ponds create fireproof wetland refugia where vegetation stays green', 'Beavers warn other animals', 'They don\u2019t help at all'], answer: 1 },
    { q: 'Emily Fairfax\u2019s satellite research showed that during wildfire, beaver-dammed areas:', choices: ['Burned faster than surrounding land', 'Stayed green and acted as fire refugia for wildlife', 'Dried up completely', 'Were abandoned by all animals'], answer: 1 },
    { q: 'The fur trade\u2019s near-elimination of beavers across North America:', choices: ['Had no ecological effect', 'Drained millions of acres of wetlands, increasing wildfire vulnerability', 'Made forests healthier', 'Increased beaver populations'], answer: 1 },
    { q: 'What is a Beaver Dam Analog (BDA)?', choices: ['A computer model of beaver behavior', 'A human-built structure that mimics a beaver dam to restore wetlands in fire-prone areas', 'A type of fire extinguisher', 'A beaver-shaped robot'], answer: 1 }
  );

  // ═══════════════════════════════════════════
  // BEAVER & FIRE RESILIENCE
  // ═══════════════════════════════════════════

  var BEAVER_FIRE = {
    title: 'Nature\u2019s Firefighters: How Beavers Protect Landscapes from Wildfire',
    intro: 'The North American beaver (Castor canadensis) is increasingly recognized as one of the most important allies in wildfire resilience. Beaver dams create wetlands that act as fireproof refugia, store water that sustains landscapes through drought, and slow post-fire debris flows. Indigenous peoples across North America managed beaver populations as part of their holistic land stewardship \u2014 and the fur trade\u2019s near-elimination of beavers is directly linked to increased wildfire vulnerability.',
    science: [
      {
        name: 'Beaver Ponds as Fire Refugia',
        icon: '\uD83D\uDCA7',
        desc: 'In 2020, fire ecologist Emily Fairfax (California State University Channel Islands) published groundbreaking satellite research showing that during wildfires, beaver-dammed river corridors stayed green and lush while everything around them burned. Beaver ponds raise the water table, saturating surrounding soil and vegetation. This creates a \u201Cfireproof\u201D ribbon of green along waterways that wildlife can shelter in during fire.',
        stat: 'Beaver-dammed areas had 3x more green vegetation during wildfire than similar undammed streams.',
        color: '#0ea5e9'
      },
      {
        name: 'Water Storage & Drought Resilience',
        icon: '\uD83D\uDEB0',
        desc: 'A single beaver dam stores 3,000-10,000+ gallons of water. A colony with multiple dams can store millions of gallons. This water slowly recharges the water table, keeping soils moist and vegetation hydrated through dry seasons. In fire-prone landscapes, this moisture buffer is the difference between vegetation that can burn and vegetation that can\u2019t.',
        stat: 'Beaver complexes raise water tables by 1-3 feet across adjacent floodplains.',
        color: '#22c55e'
      },
      {
        name: 'Post-Fire Debris Flow Prevention',
        icon: '\uD83C\uDF0A',
        desc: 'After wildfire burns a watershed, the next rainstorm can trigger lethal debris flows (see: Montecito 2018). Beaver dams act as natural check dams, slowing water velocity, trapping sediment, and preventing the catastrophic runoff that causes debris flows. A series of beaver dams along a stream can reduce peak flows by 30-50%.',
        stat: 'Beaver dams reduce downstream sediment transport by 50-90% after fire.',
        color: '#f59e0b'
      },
      {
        name: 'Wildlife Refugia During Fire',
        icon: '\uD83E\uDD86',
        desc: 'Beaver ponds serve as emergency refuge for wildlife during wildfire. Fish, amphibians, waterfowl, deer, elk, and even bears seek out beaver ponds as safe zones. The moist, green vegetation surrounding beaver ponds provides cover and food when surrounding landscapes are scorched. Post-fire, beaver ponds accelerate ecosystem recovery by maintaining seed banks, soil moisture, and aquatic food webs.',
        stat: 'Beaver ponds support 5-10x more species per acre than adjacent unbuffered streams.',
        color: '#a855f7'
      },
      {
        name: 'The Fur Trade & Ecological Collapse',
        icon: '\u26A0\uFE0F',
        desc: 'Before European colonization, an estimated 100-400 million beavers lived in North America. By 1900, the fur trade had reduced the population to approximately 100,000 \u2014 a 99.9% decline. This eliminated millions of beaver dams, draining an estimated 40-80 million acres of wetlands. The loss of these wetlands dried out landscapes, lowered water tables, and removed the natural fire resilience that beaver-maintained waterways provided.',
        stat: 'The fur trade destroyed an estimated 25 million beaver dams, draining an area the size of California.',
        color: '#ef4444'
      },
      {
        name: 'Indigenous Beaver-Fire Connection',
        icon: '\uD83C\uDF0D',
        desc: 'Many Indigenous nations understood the connection between beavers, water, and fire resilience. The Blackfeet, Shoshone, and many other nations did not trap beavers to local extinction the way the fur trade did \u2014 they managed beaver populations sustainably as part of the same holistic land stewardship that included cultural burning. Beavers and fire were managed together because Indigenous peoples understood they were parts of the same system: beavers protect water, fire manages fuel, and together they create resilient landscapes.',
        stat: 'Indigenous-managed landscapes had both intact beaver populations AND regular cultural burning \u2014 a dual resilience system.',
        color: '#7c3aed'
      },
      {
        name: 'Beaver Dam Analogs (BDAs)',
        icon: '\uD83D\uDEE0\uFE0F',
        desc: 'Land managers are now building Beaver Dam Analogs (BDAs) \u2014 simple structures of wooden posts and woven branches that mimic the function of beaver dams \u2014 in fire-prone watersheds. BDAs slow stream flow, raise water tables, re-wet floodplains, and create conditions that encourage real beavers to recolonize. Several post-fire restoration projects now install BDAs as a first step in watershed recovery.',
        stat: 'BDAs cost $200-500 each to install and can raise water tables by 1+ feet within a single season.',
        color: '#16a34a'
      }
    ]
  };

  // ═══════════════════════════════════════════
  // FIREKEEPER CHALLENGE GAME
  // ═══════════════════════════════════════════

  var GAME_EVENTS = [
    // ── Weather & Climate ──
    { id: 'drought', name: 'Severe Drought', icon: '\u2600\uFE0F', desc: 'A multi-year drought has dried fuels to critical levels.', effects: { fuelLoad: 8, soilHealth: -5, waterYield: -12, biodiversity: -3 }, urgent: true, category: 'weather' },
    { id: 'lightning', name: 'Lightning Storm', icon: '\u26A1', desc: 'Dry lightning strikes ignite several small fires in the forest.', effects: { fuelLoad: -5 }, wildfire_chance: 0.3, urgent: true, category: 'weather' },
    { id: 'wetSpring', name: 'Wet Spring', icon: '\uD83C\uDF27\uFE0F', desc: 'Heavy spring rains soak the forest floor and recharge streams.', effects: { soilHealth: 8, waterYield: 10, fuelLoad: 3 }, urgent: false, category: 'weather' },
    { id: 'heatwave', name: 'Record Heat Wave', icon: '\uD83C\uDF21\uFE0F', desc: 'Record-breaking temperatures persist for weeks. Fuel moisture drops to critical levels across the region.', effects: { fuelLoad: 5, waterYield: -8, soilHealth: -3 }, urgent: true, category: 'weather' },
    { id: 'windstorm', name: 'Windstorm', icon: '\uD83C\uDF2C\uFE0F', desc: 'A powerful windstorm topples trees, creating heavy fuel on the forest floor.', effects: { fuelLoad: 12, canopyCover: -8 }, urgent: false, category: 'weather' },
    { id: 'atmosphericRiver', name: 'Atmospheric River', icon: '\uD83C\uDF0A', desc: 'A massive rain system delivers 6 inches of rain in 48 hours. Streams overflow, but moisture is good for fire prevention.', effects: { waterYield: 15, soilHealth: 5, fuelLoad: -3 }, urgent: false, category: 'weather' },
    { id: 'earlyFreeze', name: 'Early Hard Freeze', icon: '\u2744\uFE0F', desc: 'An unusual early freeze kills many understory plants before they can set seed. Some species are weakened.', effects: { biodiversity: -4, understoryDensity: -5 }, urgent: false, category: 'weather' },
    // ── Ecological ──
    { id: 'barkBeetle', name: 'Bark Beetle Outbreak', icon: '\uD83D\uDC1E', desc: 'Mountain pine beetles have killed 30% of mature conifers, creating standing dead fuel.', effects: { fuelLoad: 15, canopyCover: -15, biodiversity: -5 }, urgent: true, category: 'ecology' },
    { id: 'cedarInvasion', name: 'Cedar Encroachment', icon: '\uD83C\uDF32', desc: 'Eastern red cedar is spreading rapidly into prairie openings.', effects: { biodiversity: -8, understoryDensity: 15, waterYield: -5 }, urgent: true, category: 'ecology' },
    { id: 'invasiveGrass', name: 'Cheatgrass Invasion', icon: '\uD83C\uDF3E', desc: 'Invasive cheatgrass has established in disturbed areas, creating continuous fine fuel that burns easily.', effects: { fuelLoad: 10, biodiversity: -6 }, urgent: true, category: 'ecology' },
    { id: 'fungalBloom', name: 'Post-Burn Morel Bloom', icon: '\uD83C\uDF44', desc: 'Morel mushrooms fruit prolifically in areas you recently burned. Mycorrhizal networks expanding!', effects: { soilHealth: 10, biodiversity: 5 }, condition: 'recentBurn', urgent: false, category: 'ecology' },
    { id: 'eagleNest', name: 'Bald Eagle Nesting', icon: '\uD83E\uDD85', desc: 'A pair of bald eagles has nested in a fire-scarred old-growth tree \u2014 a sign of healthy ecosystem structure.', effects: { biodiversity: 6 }, condition: 'highBio', urgent: false, category: 'ecology' },
    { id: 'beaverReturn', name: 'Beaver Colony Establishes!', icon: '\uD83E\uDDAB', desc: 'Beavers have built dams in the main creek, raising the water table and creating wetland fire breaks.', effects: { waterYield: 15, biodiversity: 8, fuelLoad: -3 }, urgent: false, category: 'ecology' },
    { id: 'wolfReturn', name: 'Wolf Pack Returns', icon: '\uD83D\uDC3A', desc: 'A wolf pack has recolonized the forest! By controlling elk and deer, they reduce overbrowsing of young trees, improving forest regeneration after burns.', effects: { biodiversity: 10, canopyCover: 3, soilHealth: 2 }, condition: 'highBio', urgent: false, category: 'ecology' },
    { id: 'salmonRun', name: 'Salmon Run Returns', icon: '\uD83D\uDC1F', desc: 'Salmon have returned to streams in your watershed. Their spawning brings marine nutrients deep into the forest ecosystem through bears, eagles, and decomposition.', effects: { biodiversity: 8, soilHealth: 6, waterYield: 3 }, condition: 'highWater', urgent: false, category: 'ecology' },
    { id: 'fireweed', name: 'Fireweed Explosion', icon: '\uD83C\uDF3A', desc: 'After your recent burn, fireweed has colonized the burn scar in spectacular fashion. Pollinators are thriving in the open habitat.', effects: { biodiversity: 7, soilHealth: 4 }, condition: 'recentBurn', urgent: false, category: 'ecology' },
    { id: 'owlDecline', name: 'Spotted Owl Decline', icon: '\uD83E\uDD89', desc: 'Northern spotted owls are declining. Dense, fire-suppressed forest is being invaded by barred owls. Open-canopy management could help.', effects: { biodiversity: -5 }, condition: 'highUnderstory', urgent: true, category: 'ecology' },
    { id: 'tortoiseThrive', name: 'Gopher Tortoise Colony Thriving', icon: '\uD83D\uDC22', desc: 'Your open, fire-maintained forest is perfect for gopher tortoises. Their burrows now shelter 350+ other species!', effects: { biodiversity: 12 }, condition: 'lowUnderstory', urgent: false, category: 'ecology' },
    // ── Human / Political ──
    { id: 'elderVisit', name: 'Elder Fire Keeper Visit', icon: '\uD83C\uDF0D', desc: 'An Indigenous fire keeper shares traditional burning knowledge with your team. Cultural burn effectiveness increases!', effects: { biodiversity: 5, soilHealth: 3 }, bonus: 'culturalBurnBoost', urgent: false, category: 'human' },
    { id: 'development', name: 'Housing Development Proposed', icon: '\uD83C\uDFE0', desc: 'A developer wants to build homes at the forest edge. Community pressure to suppress all fire increases.', effects: { biodiversity: -2 }, pressure: 'suppress', urgent: false, category: 'human' },
    { id: 'budgetCut', name: 'Fire Management Budget Cut', icon: '\uD83D\uDCB8', desc: 'Budget cuts reduce your ability to conduct burns this decade.', effects: { fuelLoad: 5 }, urgent: false, category: 'human' },
    { id: 'communityBurn', name: 'Community Burn Day', icon: '\uD83E\uDD1D', desc: 'Community members join your cultural burn day! Fuel reduction is extra effective and public support grows.', effects: { fuelLoad: -6, biodiversity: 3 }, urgent: false, category: 'human' },
    { id: 'mediaStory', name: 'Media Feature Story', icon: '\uD83D\uDCF0', desc: 'A journalist publishes a positive story about your cultural burning program. Public support for prescribed fire surges!', effects: { biodiversity: 2 }, bonus: 'publicSupport', urgent: false, category: 'human' },
    { id: 'smokeComplaint', name: 'Smoke Complaints', icon: '\uD83D\uDE37', desc: 'Residents downwind complain about smoke from your cultural burn. Political pressure to stop burning builds.', effects: {}, pressure: 'suppress', urgent: false, category: 'human', teachingMoment: 'A few days of managed smoke prevents months of catastrophic wildfire smoke. Cultural burns produce 10-50x LESS total smoke than the wildfire they prevent.' },
    { id: 'tribalPartnership', name: 'Tribal Co-Management Agreement', icon: '\uD83E\uDD1D', desc: 'A local tribal nation has signed a co-management agreement! Indigenous fire practitioners will lead burns on your land.', effects: { biodiversity: 8, soilHealth: 5, fuelLoad: -5 }, bonus: 'tribalPartner', condition: 'highBio', urgent: false, category: 'human' },
    { id: 'researchGrant', name: 'Fire Ecology Research Grant', icon: '\uD83D\uDD2C', desc: 'A university team has received a grant to study fire ecology on your land. They discover your cultural burning has increased soil carbon by 20%!', effects: { soilHealth: 5, biodiversity: 3 }, urgent: false, category: 'human' },
    { id: 'schoolVisit', name: 'School Field Trip', icon: '\uD83C\uDFEB', desc: 'A class of students visits to learn about fire ecology. Teaching the next generation of fire keepers!', effects: { biodiversity: 1 }, bonus: 'education', urgent: false, category: 'human' },
    { id: 'insuranceCrisis', name: 'Insurance Crisis', icon: '\uD83D\uDCB0', desc: 'Insurance companies are dropping coverage for homes near the forest due to wildfire risk. Your fire management record determines the outcome.', effects: {}, condition: 'any', urgent: true, category: 'human' }
  ];

  // ── Decision Events (player must choose) ──
  var GAME_DECISIONS = [
    {
      id: 'neighborFire',
      name: 'Neighbor\u2019s Land Burning',
      icon: '\uD83D\uDD25',
      desc: 'An uncontrolled fire is approaching from neighboring unmanaged land. Your forest\u2019s fuel load will determine the severity if it reaches you.',
      choices: [
        { label: '\uD83D\uDD25 Emergency backburn at the edge', desc: 'Burn a firebreak ahead of the approaching fire', effects: { fuelLoad: -8 }, risk: 0.1, points: 15 },
        { label: '\uD83D\uDE92 Call in firefighters', desc: 'Suppress the fire at the boundary', effects: { fuelLoad: 2 }, risk: 0.3, points: 5 },
        { label: '\u23F3 Wait and watch', desc: 'Trust your low fuel loads to slow the fire', effects: {}, risk: 0.5, points: 0, needsLowFuel: true }
      ]
    },
    {
      id: 'politicalPressure',
      name: 'Governor Calls for Fire Suppression',
      icon: '\uD83C\uDFDB\uFE0F',
      desc: 'After a wildfire in another state, the governor demands total fire suppression on all public lands. Your program is under threat.',
      choices: [
        { label: '\uD83D\uDCE2 Advocate publicly for cultural burning', desc: 'Risk political backlash but stand up for science', effects: { biodiversity: 3 }, risk: 0, points: 20 },
        { label: '\uD83E\uDD1D Compromise: reduce burn acreage', desc: 'Burn less to keep the program alive', effects: { fuelLoad: 5 }, risk: 0, points: 8 },
        { label: '\u26D4 Comply and suppress', desc: 'Stop burning this decade to avoid conflict', effects: { fuelLoad: 12, biodiversity: -5 }, risk: 0, points: -5 }
      ]
    },
    {
      id: 'waterRights',
      name: 'Water Rights Dispute',
      icon: '\uD83D\uDCA7',
      desc: 'A downstream agricultural operation wants to remove beaver dams to increase water flow to their irrigation system. Your beaver-maintained wetlands are at risk.',
      choices: [
        { label: '\uD83E\uDDAB Protect the beaver dams', desc: 'Defend the watershed — your fire resilience depends on it', effects: { waterYield: 5, biodiversity: 3 }, risk: 0, points: 15 },
        { label: '\u2696\uFE0F Negotiate a compromise', desc: 'Allow partial dam removal in exchange for a water-sharing agreement', effects: { waterYield: -5 }, risk: 0, points: 5 },
        { label: '\uD83D\uDEE0\uFE0F Allow removal', desc: 'Let the dams be destroyed to avoid conflict', effects: { waterYield: -15, biodiversity: -8, fuelLoad: 5 }, risk: 0, points: -10 }
      ]
    },
    {
      id: 'beetleResponse',
      name: 'Bark Beetle Strategy',
      icon: '\uD83D\uDC1E',
      desc: 'Bark beetles have arrived in your forest. Dead trees are accumulating. How do you respond?',
      choices: [
        { label: '\uD83D\uDD25 Burn beetle-killed stands', desc: 'Use cultural burning to consume dead fuel and reset succession', effects: { fuelLoad: -12, biodiversity: 6, canopyCover: -10 }, risk: 0, points: 18 },
        { label: '\uD83E\uDE93 Salvage log dead trees', desc: 'Remove dead timber for revenue, but disturb soil and compact ground', effects: { fuelLoad: -8, soilHealth: -8, canopyCover: -12 }, risk: 0, points: 8 },
        { label: '\uD83C\uDF3F Leave them standing', desc: 'Let nature take its course — snags provide wildlife habitat but are extreme fire hazards', effects: { fuelLoad: 10, biodiversity: 4 }, risk: 0, points: 3 }
      ]
    },
    {
      id: 'carbonCredits',
      name: 'Carbon Credit Offer',
      icon: '\u2601\uFE0F',
      desc: 'A company offers to buy carbon credits from your forest — but only if you promise NOT to burn for the next 20 years. The payment could fund other conservation work.',
      choices: [
        { label: '\u274C Decline the offer', desc: 'Cultural burning sequesters MORE carbon long-term than suppression. Explain the science.', effects: { soilHealth: 3 }, risk: 0, points: 20 },
        { label: '\uD83D\uDCB0 Accept with conditions', desc: 'Take the money but negotiate a cultural burning exemption for a small area', effects: { fuelLoad: 6 }, risk: 0, points: 8 },
        { label: '\uD83D\uDCB0 Accept fully', desc: 'Stop all burning. Cash in now, worry later.', effects: { fuelLoad: 15, biodiversity: -5 }, risk: 0, points: -8 }
      ]
    },
    {
      id: 'schoolCurriculum',
      name: 'Fire Education Opportunity',
      icon: '\uD83C\uDFEB',
      desc: 'The local school district asks you to help design a fire ecology curriculum. This takes time away from field work but could build the next generation of fire keepers.',
      choices: [
        { label: '\uD83D\uDCDA Full curriculum partnership', desc: 'Invest heavily in education. Less field time but long-term community support.', effects: { biodiversity: 2, fuelLoad: 3 }, risk: 0, points: 15, bonus: 'education' },
        { label: '\uD83C\uDFEB Host a field day', desc: 'One-day event. Less impact but no lost field time.', effects: {}, risk: 0, points: 8 },
        { label: '\u23F3 Decline — too busy', desc: 'Focus on field work this decade.', effects: { fuelLoad: -2 }, risk: 0, points: 2 }
      ]
    }
  ];

  // ── Game Achievements ──
  var GAME_ACHIEVEMENTS = [
    { id: 'centurion', name: 'Centurion', icon: '\uD83C\uDFC6', desc: 'Survive 100 years', condition: function(gs) { return gs.year >= 100; } },
    { id: 'zeroBurn', name: 'Zero Wildfires', icon: '\uD83D\uDEE1\uFE0F', desc: 'Complete the game with no catastrophic wildfires', condition: function(gs, go) { return go && gs.wildfires === 0; } },
    { id: 'masterBurner', name: 'Master Burner', icon: '\uD83D\uDD25', desc: 'Perform 10+ cultural burns in a single game', condition: function(gs) { return gs.totalBurns >= 10; } },
    { id: 'biodiversityChamp', name: 'Biodiversity Champion', icon: '\uD83E\uDD8B', desc: 'Maintain biodiversity above 85 for 50+ years', condition: function(gs) { return gs.highBioYears >= 50; } },
    { id: 'waterKeeper', name: 'Water Keeper', icon: '\uD83D\uDCA7', desc: 'Maintain water yield above 80 for 50+ years', condition: function(gs) { return gs.highWaterYears >= 50; } },
    { id: 'beaverAlly', name: 'Beaver Ally', icon: '\uD83E\uDDAB', desc: 'Install beaver dams 3+ times', condition: function(gs) { return gs.beaverDams >= 3; } },
    { id: 'diplomatFirekeeper', name: 'Diplomat Firekeeper', icon: '\uD83E\uDD1D', desc: 'Successfully navigate 3+ decision events', condition: function(gs) { return gs.decisionsWon >= 3; } },
    { id: 'comebackKid', name: 'Comeback Kid', icon: '\uD83D\uDCAA', desc: 'Recover biodiversity to 70+ after a wildfire', condition: function(gs) { return gs.recoveredFromFire; } },
    { id: 'perfectDecade', name: 'Perfect Decade', icon: '\u2B50', desc: 'Score 25+ points in a single decade', condition: function(gs) { return gs.bestDecadeScore >= 25; } },
    { id: 'tribalPartner', name: 'Tribal Partnership', icon: '\uD83C\uDF0D', desc: 'Earn the tribal co-management event', condition: function(gs) { return gs.tribalPartner; } },
    { id: 'resilientForest', name: 'Resilient Forest', icon: '\uD83C\uDF32', desc: 'Keep fuel below 30 for 80+ years', condition: function(gs) { return gs.lowFuelYears >= 80; } },
    { id: 'educator', name: 'Fire Educator', icon: '\uD83C\uDFEB', desc: 'Invest in education 2+ times', condition: function(gs) { return gs.educationCount >= 2; } }
  ];

  // ── Advisor Tips ──
  var ADVISOR_TIPS = [
    { condition: function(gs) { return gs.fuelLoad > 50; }, tip: '\u26A0\uFE0F Elder Advisor: "The land is crying out for fire. Every year without burning adds another layer of danger. Our ancestors would have burned this years ago."', icon: '\uD83C\uDF0D' },
    { condition: function(gs) { return gs.fuelLoad > 35 && gs.yearsSinceLastBurn > 20; }, tip: '\uD83D\uDD25 Fire Science Advisor: "20+ years without fire. Fuel ladders are developing \u2014 understory growth now connects the ground to the canopy. A surface fire could become a crown fire."', icon: '\uD83D\uDD2C' },
    { condition: function(gs) { return gs.waterYield < 50; }, tip: '\uD83D\uDCA7 Watershed Advisor: "Water yield is dangerously low. Consider beaver dam analogs \u2014 they\u2019re the cheapest and most effective way to raise water tables in fire-prone landscapes."', icon: '\uD83E\uDDAB' },
    { condition: function(gs) { return gs.biodiversity > 85 && gs.fuelLoad < 20; }, tip: '\u2B50 Elder Advisor: "The land is healthy \u2014 diverse, moist, open. This is what our ancestors maintained for thousands of years. You are walking the right path."', icon: '\uD83C\uDF0D' },
    { condition: function(gs) { return gs.wildfires > 0 && gs.biodiversity < 50; }, tip: '\uD83C\uDF31 Ecology Advisor: "After wildfire, the land needs gentle care. Cultural burning actually HELPS recovery by stimulating fire-adapted seeds and clearing debris. Don\u2019t be afraid to use good fire."', icon: '\uD83C\uDF3F' },
    { condition: function(gs) { return gs.understoryDensity > 60; }, tip: '\uD83C\uDF32 Forestry Advisor: "Understory density is dangerously high. This is the fuel ladder that turns gentle surface fires into catastrophic crown fires. Burning or thinning the understory is the single most important action right now."', icon: '\uD83E\uDE93' },
    { condition: function(gs) { return gs.totalBurns === 0 && gs.year >= 30; }, tip: '\u26D4 Elder Advisor: "30 years and no fire? The forest is forgetting what fire means. The longer you wait, the harder the first burn becomes. Start small \u2014 but start."', icon: '\uD83C\uDF0D' },
    { condition: function(gs) { return gs.villageHealth < 60; }, tip: '\uD83C\uDFE0 Community Advisor: "The village is losing faith. Another wildfire could be the end. Every burn you do now is an investment in their safety \u2014 show them that good fire prevents bad fire."', icon: '\uD83E\uDD1D' },
    { condition: function(gs) { return gs.soilHealth < 40; }, tip: '\uD83E\uDEB5 Soil Advisor: "Soil health is critically low. Years of intense fire or no fire have depleted the soil microbiome. Cultural burning with biochar production could begin rebuilding it \u2014 the Amazonian terra preta approach."', icon: '\uD83C\uDF3F' },
    { condition: function(gs) { return gs.beaverDams >= 2 && gs.waterYield > 80; }, tip: '\uD83E\uDDAB Watershed Advisor: "Your beaver dam investment is paying off! Water table is high, streams are flowing, and those green riparian corridors will act as firebreaks during the next dry season. Well played."', icon: '\uD83D\uDCA7' }
  ];

  // ── Game Ranks (based on final score) ──
  var GAME_RANKS = [
    { min: 300, name: 'Legendary Fire Keeper', icon: '\uD83C\uDF1F', desc: 'Your land management rivals the greatest Indigenous fire practitioners in history.' },
    { min: 220, name: 'Master Fire Keeper', icon: '\uD83D\uDD25', desc: 'You truly understand the relationship between fire, water, land, and community.' },
    { min: 150, name: 'Skilled Fire Keeper', icon: '\uD83C\uDF32', desc: 'The forest thrives under your care. Keep learning from the land.' },
    { min: 80, name: 'Journeyman Fire Keeper', icon: '\uD83C\uDF3F', desc: 'You\u2019re on the right path. Remember: fire is medicine, not enemy.' },
    { min: 0, name: 'Apprentice Fire Keeper', icon: '\uD83C\uDF31', desc: 'Every fire keeper starts here. The land is a patient teacher.' },
    { min: -999, name: 'Fire Suppressor', icon: '\u26D4', desc: 'You fought fire instead of working with it. The forest paid the price.' }
  ];

  var GAME_DIFFICULTIES = {
    easy: { label: 'Apprentice Fire Keeper', eventChance: 0.4, decisionChance: 0.15, wildfireThreshold: 65, targetYears: 100, description: 'Fewer events. Wildfires only at extreme fuel levels.', climateEscalation: false },
    medium: { label: 'Journeyman Fire Keeper', eventChance: 0.6, decisionChance: 0.25, wildfireThreshold: 55, targetYears: 100, description: 'Regular events + decision moments. Standard fire risk.', climateEscalation: false },
    hard: { label: 'Master Fire Keeper', eventChance: 0.8, decisionChance: 0.35, wildfireThreshold: 45, targetYears: 150, description: 'Frequent events. Climate change escalation. 150-year survival.', climateEscalation: true }
  };

  // ═══════════════════════════════════════════
  // MAIN TOOL REGISTRATION
  // ═══════════════════════════════════════════

  window.StemLab.registerTool('fireEcology', {
    icon: '\uD83D\uDD25',
    label: 'Fire Ecology & Indigenous Stewardship',
    desc: 'Explore 65,000+ years of Indigenous fire knowledge, fire-adapted ecosystems, and forest management science.',
    color: 'orange',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var setStemLabTab = ctx.setStemLabTab;
      var stemLabTab = ctx.stemLabTab || 'explore';
      var stemLabTool = ctx.stemLabTool;
      var toolSnapshots = ctx.toolSnapshots;
      var setToolSnapshots = ctx.setToolSnapshots;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Calculator = ctx.icons.Calculator;
      var Sparkles = ctx.icons.Sparkles;
      var X = ctx.icons.X;
      var GripVertical = ctx.icons.GripVertical;
      var announceToSR = ctx.announceToSR;
      var awardStemXP = ctx.awardXP;
      var getStemXP = ctx.getXP;
      var stemCelebrate = ctx.celebrate;
      var stemBeep = ctx.beep;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var callGeminiVision = ctx.callGeminiVision;
      var gradeLevel = ctx.gradeLevel;
      var srOnly = ctx.srOnly;
      var a11yClick = ctx.a11yClick;
      var renderTutorial = ctx.renderTutorial || function() { return null; };
      var props = ctx.props;
      var canvasNarrate = ctx.canvasNarrate;

      return (function() {
        var d = (labToolData.fireEcology) || {};

          // ── Canvas narration: init ──
          if (typeof canvasNarrate === 'function') {
            canvasNarrate('fireEcology', 'init', {
              first: 'Fire Ecology and Indigenous Land Stewardship loaded. Explore 65,000 plus years of cultural burning practices, fire-adapted ecosystems, and prescribed burn planning.',
              repeat: 'Fire Ecology active.',
              terse: 'Fire Ecology.'
            }, { debounce: 800 });
          }

        var upd = function(key, val) {
          var _k = {};
          _k[key] = val;
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { fireEcology: Object.assign({}, prev.fireEcology || {}, _k) });
          });
        };

        var updMulti = function(obj) {
          setLabToolData(function(prev) {
            return Object.assign({}, prev, { fireEcology: Object.assign({}, prev.fireEcology || {}, obj) });
          });
        };

        // ── State ──
        var tab = d.tab || 'indigenous';  // 'indigenous' | 'ecosystems' | 'simulator' | 'burnPlan' | 'science' | 'quiz'
        var selectedNation = d.selectedNation || null;
        var selectedEcosystem = d.selectedEcosystem || null;
        var selectedScience = d.selectedScience || null;
        var nationsViewed = d.nationsViewed || {};
        var ecosystemsViewed = d.ecosystemsViewed || {};

        // Simulator state
        var sim = d.sim || Object.assign({}, SIM_DEFAULTS);

        // Burn planner state
        var burnTemp = typeof d.burnTemp === 'number' ? d.burnTemp : 60;
        var burnHumidity = typeof d.burnHumidity === 'number' ? d.burnHumidity : 40;
        var burnWind = typeof d.burnWind === 'number' ? d.burnWind : 6;
        var burnFuelMoisture = typeof d.burnFuelMoisture === 'number' ? d.burnFuelMoisture : 18;
        var burnResult = d.burnResult || null;

        // Quiz state
        var quizIdx = d.quizIdx || 0;
        var quizScore = d.quizScore || 0;
        var quizTotal = d.quizTotal || 0;
        var quizAnswer = typeof d.quizAnswer === 'number' ? d.quizAnswer : -1;
        var quizStreak = d.quizStreak || 0;
        var quizBest = d.quizBest || 0;

        // Badge state
        var badges = d.badges || {};
        var aiUseCount = d.aiUseCount || 0;
        var quizCorrectCount = d.quizCorrectCount || 0;

        // AI state
        var aiQuestion = d.aiQuestion || '';
        var aiResponse = d.aiResponse || '';
        var aiLoading = d.aiLoading || false;

        // Case studies state
        var selectedCase = d.selectedCase || null;
        var casesViewed = d.casesViewed || {};

        // Smoke/Seeds state
        var selectedSeed = d.selectedSeed || null;

        // Carbon calculator state
        var carbonAcres = typeof d.carbonAcres === 'number' ? d.carbonAcres : 100;
        var carbonCalculated = d.carbonCalculated || false;

        // Fire fact
        var factIdx = d.factIdx || Math.floor(Math.random() * FIRE_FACTS.length);

        // Comparison simulator state
        var comparisonMode = d.comparisonMode || false;
        var simB = d.simB || Object.assign({}, SIM_DEFAULTS);

        // Game state
        var gameActive = d.gameActive || false;
        var gameDifficulty = d.gameDifficulty || 'medium';
        var gameState = d.gameState || null;
        var gameEvent = d.gameEvent || null;
        var gameScore = d.gameScore || 0;
        var gameBestScore = d.gameBestScore || 0;
        var gameOver = d.gameOver || false;
        var gameHistory = d.gameHistory || [];

        var band = getGradeBand(ctx);

        // ── Badge checker ──
        function checkBadge(id) {
          if (badges[id]) return;
          var newBadges = Object.assign({}, badges);
          newBadges[id] = true;
          upd('badges', newBadges);
          var b = BADGES.filter(function(bb) { return bb.id === id; })[0];
          if (b && addToast) {
            playSound('badge');
            addToast(b.icon + ' Badge: ' + b.label + ' \u2014 ' + b.desc, 'success');
            awardStemXP('fire_badge_' + id, 25, b.label);
          }
          if (announceToSR) announceToSR('Badge earned: ' + (b ? b.label : id));
        }

        // ── Helpers ──
        function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

        function gauge(label, value, max, color, unit) {
          var pct = Math.round((value / max) * 100);
          return h('div', { style: { marginBottom: 8 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 2 } },
              h('span', null, label),
              h('span', { style: { fontWeight: 600 } }, value + (unit || ''))
            ),
            h('div', { style: { height: 10, background: '#1e293b', borderRadius: 5, overflow: 'hidden' } },
              h('div', { style: { width: pct + '%', height: '100%', background: color, borderRadius: 5, transition: 'width 0.4s' } })
            )
          );
        }

        // ── Tab Navigation ──
        var TABS = [
          { id: 'indigenous', icon: '\uD83C\uDF0D', label: 'Indigenous Knowledge' },
          { id: 'ecosystems', icon: '\uD83C\uDF32', label: 'Fire Ecosystems' },
          { id: 'simulator', icon: '\uD83C\uDFAE', label: 'Forest Simulator' },
          { id: 'burnPlan', icon: '\uD83D\uDCCB', label: 'Burn Planner' },
          { id: 'science', icon: '\uD83D\uDD2C', label: 'Fire Science' },
          { id: 'smokeSeeds', icon: '\uD83C\uDF3A', label: 'Smoke & Seeds' },
          { id: 'watershed', icon: '\uD83D\uDCA7', label: 'Watersheds' },
          { id: 'caseStudies', icon: '\uD83D\uDCF0', label: 'Case Studies' },
          { id: 'carbon', icon: '\u2601\uFE0F', label: 'Carbon Calculator' },
          { id: 'beavers', icon: '\uD83E\uDDAB', label: 'Beavers & Fire' },
          { id: 'game', icon: '\uD83C\uDFAE', label: 'Firekeeper Challenge' },
          { id: 'quiz', icon: '\uD83C\uDFC6', label: 'Quiz' }
        ];

        function renderTabNav() {
          return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }, role: 'tablist', 'aria-label': 'Fire Ecology sections' },
            TABS.map(function(tt) {
              var active = tab === tt.id;
              return h('button', { 'aria-label': 'Change tab',
                key: tt.id,
                onClick: function() { upd('tab', tt.id); },
                role: 'tab', 'aria-selected': active,
                style: {
                  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: active ? '#ea580c' : '#1e293b',
                  color: active ? '#fff' : '#94a3b8',
                  fontWeight: active ? 700 : 500, fontSize: 13,
                  transition: 'all 0.2s'
                }
              }, tt.icon + ' ' + tt.label);
            })
          );
        }

        // ══════════════════════════════════════
        // TAB: INDIGENOUS KNOWLEDGE
        // ══════════════════════════════════════

        function renderIndigenousTab() {
          if (selectedNation) {
            var nation = INDIGENOUS_FIRE_NATIONS.filter(function(n) { return n.id === selectedNation; })[0];
            if (!nation) { upd('selectedNation', null); return null; }

            // Track viewing
            if (!nationsViewed[nation.id]) {
              var nv = Object.assign({}, nationsViewed);
              nv[nation.id] = true;
              upd('nationsViewed', nv);
              awardStemXP('fire_nation_' + nation.id, 15, nation.nation);
              if (Object.keys(nv).length >= 8) checkBadge('indigenousScholar');
            }

            return h('div', null,
              h('button', { 'aria-label': 'Back to All Nations',
                onClick: function() { upd('selectedNation', null); },
                style: { background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontSize: 14, marginBottom: 12, padding: 0 }
              }, '\u2190 Back to All Nations'),

              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid ' + nation.color + '44' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
                  h('span', { style: { fontSize: 32 } }, nation.icon),
                  h('div', null,
                    h('h3', { style: { margin: 0, color: nation.color, fontSize: 20 } }, nation.nation),
                    h('div', { style: { color: '#94a3b8', fontSize: 13 } }, nation.region + ' \u2022 ' + nation.years + ' years of fire stewardship')
                  )
                ),

                h('div', { style: { background: nation.color + '15', borderRadius: 8, padding: 14, marginBottom: 16, borderLeft: '3px solid ' + nation.color } },
                  h('div', { style: { fontWeight: 700, marginBottom: 6, color: nation.color } }, '\uD83D\uDD25 ' + nation.practice),
                  h('p', { style: { margin: 0, lineHeight: 1.6, color: '#e2e8f0', fontSize: 14 } }, nation.description)
                ),

                h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 16 } },
                  h('div', { style: { fontWeight: 700, marginBottom: 8, color: '#38bdf8' } }, '\uD83D\uDD2C The Science'),
                  h('p', { style: { margin: 0, lineHeight: 1.6, color: '#cbd5e1', fontSize: 14 } }, nation.science)
                ),

                h('div', { style: { marginBottom: 16 } },
                  h('div', { style: { fontWeight: 700, marginBottom: 8, color: '#fbbf24' } }, '\uD83D\uDEE0\uFE0F Key Practices'),
                  nation.keyPractices.map(function(kp, ki) {
                    return h('div', { key: ki, style: { display: 'flex', gap: 8, marginBottom: 6, fontSize: 14, color: '#e2e8f0' } },
                      h('span', { style: { color: '#f97316', flexShrink: 0 } }, '\u2022'),
                      h('span', null, kp)
                    );
                  })
                ),

                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 } },
                  h('div', { style: { fontWeight: 700, marginBottom: 4, color: '#4ade80', width: '100%' } }, '\uD83C\uDF31 Fire-Managed Plants'),
                  nation.plants.map(function(p, pi) {
                    return h('span', { key: pi, style: { background: '#065f4620', border: '1px solid #065f4640', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: '#4ade80' } }, p);
                  })
                ),

                h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 14, borderLeft: '3px solid #f59e0b' } },
                  h('div', { style: { fontWeight: 700, marginBottom: 6, color: '#f59e0b' } }, '\u2728 Living Legacy'),
                  h('p', { style: { margin: 0, lineHeight: 1.6, color: '#cbd5e1', fontSize: 14 } }, nation.legacy)
                )
              )
            );
          }

          // Nation cards grid
          return h('div', null,
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #f97316' } },
              h('p', { style: { margin: 0, lineHeight: 1.6, color: '#e2e8f0', fontSize: 14 } },
                'For tens of thousands of years, Indigenous peoples around the world have used fire as a sophisticated land management tool. These are not \u201Cprimitive\u201D practices \u2014 they represent deep ecological knowledge refined over hundreds of generations. Modern fire science is only now beginning to understand what Indigenous fire keepers have always known: ',
                h('strong', { style: { color: '#f97316' } }, 'fire is not the enemy of healthy ecosystems \u2014 the absence of fire is.')
              )
            ),

            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              INDIGENOUS_FIRE_NATIONS.map(function(nation) {
                var viewed = nationsViewed[nation.id];
                return h('button', { 'aria-label': 'Change selected nation',
                  key: nation.id,
                  onClick: function() { upd('selectedNation', nation.id); },
                  style: {
                    background: viewed ? nation.color + '18' : '#0f172a',
                    border: '1px solid ' + nation.color + '44',
                    borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                    h('span', { style: { fontSize: 28 } }, nation.icon),
                    h('div', null,
                      h('div', { style: { fontWeight: 700, color: nation.color, fontSize: 15 } }, nation.nation),
                      h('div', { style: { fontSize: 12, color: '#94a3b8' } }, nation.region)
                    )
                  ),
                  h('div', { style: { fontSize: 13, color: '#f59e0b', marginBottom: 6 } }, '\uD83D\uDD25 ' + nation.practice),
                  h('div', { style: { fontSize: 12, color: '#94a3b8' } }, nation.years + ' years of fire stewardship'),
                  viewed ? h('div', { style: { fontSize: 11, color: '#4ade80', marginTop: 6 } }, '\u2713 Studied') : null
                );
              })
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: FIRE ECOSYSTEMS
        // ══════════════════════════════════════

        function renderEcosystemsTab() {
          if (selectedEcosystem) {
            var eco = FIRE_ECOSYSTEMS.filter(function(e) { return e.id === selectedEcosystem; })[0];
            if (!eco) { upd('selectedEcosystem', null); return null; }

            if (!ecosystemsViewed[eco.id]) {
              var ev = Object.assign({}, ecosystemsViewed);
              ev[eco.id] = true;
              upd('ecosystemsViewed', ev);
              awardStemXP('fire_eco_' + eco.id, 15, eco.name);
              if (Object.keys(ev).length >= 6) checkBadge('ecologyExplorer');
            }

            return h('div', null,
              h('button', { 'aria-label': 'Back to All Ecosystems',
                onClick: function() { upd('selectedEcosystem', null); },
                style: { background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontSize: 14, marginBottom: 12, padding: 0 }
              }, '\u2190 Back to All Ecosystems'),

              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid ' + eco.color + '44' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
                  h('span', { style: { fontSize: 32 } }, eco.icon),
                  h('div', null,
                    h('h3', { style: { margin: 0, color: eco.color, fontSize: 20 } }, eco.name),
                    h('div', { style: { color: '#94a3b8', fontSize: 13 } }, eco.region + ' \u2022 Fire return interval: ' + eco.fireInterval)
                  )
                ),

                h('p', { style: { lineHeight: 1.6, color: '#e2e8f0', fontSize: 14, marginBottom: 16 } }, eco.description),

                h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 16 } },
                  h('div', { style: { fontWeight: 700, marginBottom: 8, color: '#f97316' } }, '\uD83D\uDD25 Role of Fire'),
                  h('p', { style: { margin: 0, lineHeight: 1.6, color: '#cbd5e1', fontSize: 14 } }, eco.fireRole)
                ),

                h('div', { style: { marginBottom: 16 } },
                  h('div', { style: { fontWeight: 700, marginBottom: 10, color: '#38bdf8' } }, '\uD83E\uDDEC Fire Adaptations'),
                  eco.adaptations.map(function(a, ai) {
                    return h('div', { key: ai, style: { background: '#1e293b', borderRadius: 8, padding: 12, marginBottom: 8 } },
                      h('div', { style: { fontWeight: 700, color: eco.color, marginBottom: 4, fontSize: 14 } }, a.species),
                      h('div', { style: { color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 } }, a.adaptation)
                    );
                  })
                ),

                h('div', { style: { background: '#7f1d1d20', borderRadius: 8, padding: 14, borderLeft: '3px solid #ef4444' } },
                  h('div', { style: { fontWeight: 700, marginBottom: 6, color: '#ef4444' } }, '\u26A0\uFE0F Without Fire'),
                  h('p', { style: { margin: 0, lineHeight: 1.6, color: '#fca5a5', fontSize: 14 } }, eco.withoutFire)
                )
              )
            );
          }

          return h('div', null,
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #16a34a' } },
              h('p', { style: { margin: 0, lineHeight: 1.6, color: '#e2e8f0', fontSize: 14 } },
                'Many of Earth\u2019s most biodiverse ecosystems are ',
                h('strong', { style: { color: '#4ade80' } }, 'fire-dependent'),
                ' \u2014 they evolved WITH fire and cannot survive without it. From Australian eucalyptus forests to American tallgrass prairies, fire is as essential as rain or sunlight.'
              )
            ),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              FIRE_ECOSYSTEMS.map(function(eco) {
                var viewed = ecosystemsViewed[eco.id];
                return h('button', { 'aria-label': 'Change selected ecosystem',
                  key: eco.id,
                  onClick: function() { upd('selectedEcosystem', eco.id); },
                  style: {
                    background: viewed ? eco.color + '18' : '#0f172a',
                    border: '1px solid ' + eco.color + '44',
                    borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                    h('span', { style: { fontSize: 28 } }, eco.icon),
                    h('div', null,
                      h('div', { style: { fontWeight: 700, color: eco.color, fontSize: 15 } }, eco.name),
                      h('div', { style: { fontSize: 12, color: '#94a3b8' } }, eco.region)
                    )
                  ),
                  h('div', { style: { fontSize: 13, color: '#f97316', marginBottom: 4 } }, '\uD83D\uDD04 Fire interval: ' + eco.fireInterval),
                  h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.4 } }, eco.description.substring(0, 100) + '...'),
                  viewed ? h('div', { style: { fontSize: 11, color: '#4ade80', marginTop: 6 } }, '\u2713 Explored') : null
                );
              })
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: FOREST SIMULATOR
        // ══════════════════════════════════════

        function renderSimulatorTab() {
          var s = sim;

          // Canvas data attributes for live visualization
          function renderCanvas() {
            var burning = s.eventLog && s.eventLog.length > 0 && s.eventLog[s.eventLog.length - 1].event && s.eventLog[s.eventLog.length - 1].event.indexOf('CATASTROPHIC') >= 0;
            return h('div', { style: { marginBottom: 16 } },
              h('canvas', {
                ref: forestCanvasRef,
                'data-fuel': s.fuelLoad,
                'data-canopy': s.canopyCover,
                'data-bio': s.biodiversity,
                'data-understory': s.understoryDensity,
                'data-burning': burning ? '1' : '0',
                style: { width: '100%', height: 200, borderRadius: 12, background: '#0f172a', display: 'block' },
                'aria-label': 'Forest visualization showing current fuel load, canopy cover, and biodiversity'
              })
            );
          }

          function advanceDecade(action) {
            var newSim = Object.assign({}, s);
            var event = '';

            if (action === 'culturalBurn') {
              // Cultural burn: low-intensity, reduces fuel, boosts biodiversity
              newSim.fuelLoad = clamp(s.fuelLoad - 8, 3, 100);
              newSim.understoryDensity = clamp(s.understoryDensity - 15, 5, 100);
              newSim.biodiversity = clamp(s.biodiversity + 8, 0, 100);
              newSim.soilHealth = clamp(s.soilHealth + 5, 0, 100);
              newSim.waterYield = clamp(s.waterYield + 5, 0, 100);
              newSim.carbonStored = clamp(s.carbonStored - 2, 0, 200);
              newSim.yearsSinceLastBurn = 0;
              newSim.totalBurns = s.totalBurns + 1;
              event = '\uD83D\uDD25 Cultural burn performed. Fuel reduced, understory opened, biodiversity thriving.';
              playSound('ignite');
              awardStemXP('fire_sim_burn', 10, 'Cultural burn');
              if (newSim.totalBurns === 1) checkBadge('firstBurn');
              if (newSim.totalBurns >= 5) checkBadge('firekeeper');
            } else if (action === 'suppress') {
              // Suppress: fuel accumulates, biodiversity drops
              newSim.fuelLoad = clamp(s.fuelLoad + 12, 0, 100);
              newSim.understoryDensity = clamp(s.understoryDensity + 18, 0, 100);
              newSim.biodiversity = clamp(s.biodiversity - 8, 0, 100);
              newSim.soilHealth = clamp(s.soilHealth - 3, 0, 100);
              newSim.waterYield = clamp(s.waterYield - 6, 0, 100);
              newSim.carbonStored = clamp(s.carbonStored + 5, 0, 200);
              newSim.yearsSinceLastBurn = s.yearsSinceLastBurn + 10;
              event = '\u26D4 Fire suppressed. Fuel accumulating, understory thickening, biodiversity declining.';

              // Wildfire risk check
              if (newSim.fuelLoad > 55 && Math.random() < (newSim.fuelLoad - 40) / 80) {
                // Catastrophic wildfire!
                var severity = newSim.fuelLoad / 100;
                newSim.canopyCover = clamp(s.canopyCover - Math.round(severity * 60), 0, 100);
                newSim.fuelLoad = clamp(newSim.fuelLoad - 30, 0, 100); // fire consumed the fuel
                newSim.biodiversity = clamp(newSim.biodiversity - 25, 0, 100);
                newSim.soilHealth = clamp(newSim.soilHealth - 20, 0, 100);
                newSim.waterYield = clamp(newSim.waterYield - 15, 0, 100);
                newSim.carbonStored = clamp(newSim.carbonStored - 30, 0, 200);
                newSim.wildfires = s.wildfires + 1;
                newSim.yearsSinceLastBurn = 0;
                event = '\uD83D\uDCA5 CATASTROPHIC WILDFIRE! Decades of fuel accumulation erupted into an uncontrollable crown fire. Canopy, soil, and biodiversity devastated.';
                playSound('wildfire');
                checkBadge('suppressionLesson');
              }
            } else if (action === 'prescribe') {
              // Modern prescribed burn (less effective than cultural burning but still beneficial)
              newSim.fuelLoad = clamp(s.fuelLoad - 5, 3, 100);
              newSim.understoryDensity = clamp(s.understoryDensity - 10, 5, 100);
              newSim.biodiversity = clamp(s.biodiversity + 4, 0, 100);
              newSim.soilHealth = clamp(s.soilHealth + 2, 0, 100);
              newSim.waterYield = clamp(s.waterYield + 3, 0, 100);
              newSim.carbonStored = clamp(s.carbonStored - 1, 0, 200);
              newSim.yearsSinceLastBurn = 0;
              newSim.totalBurns = s.totalBurns + 1;
              event = '\uD83D\uDCCB Prescribed burn completed. Moderate fuel reduction. (Cultural burning with Indigenous knowledge is more effective.)';
              playSound('ignite');
            }

            // Natural recovery
            newSim.canopyCover = clamp(newSim.canopyCover + (newSim.canopyCover < 40 ? 8 : 2), 0, 95);
            newSim.year = s.year + 10;

            // Decade snapshot
            var snapshots = (s.decade || []).concat([{
              year: newSim.year,
              fuel: newSim.fuelLoad,
              biodiversity: newSim.biodiversity,
              canopy: newSim.canopyCover,
              carbon: newSim.carbonStored,
              water: newSim.waterYield,
              soil: newSim.soilHealth
            }]);
            newSim.decade = snapshots;

            // Event log
            newSim.eventLog = (s.eventLog || []).concat([{ year: newSim.year, event: event }]);

            updMulti({ sim: newSim });

            if (newSim.year >= 50) checkBadge('successionWatcher');

            if (addToast) addToast(event, event.indexOf('CATASTROPHIC') >= 0 ? 'error' : 'success');
          }

          // Danger level indicator
          var dangerLevel = s.fuelLoad < 20 ? { label: 'Low', color: '#22c55e' } :
                            s.fuelLoad < 40 ? { label: 'Moderate', color: '#f59e0b' } :
                            s.fuelLoad < 60 ? { label: 'High', color: '#f97316' } :
                            { label: 'EXTREME', color: '#ef4444' };

          return h('div', null,
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #f97316' } },
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.5 } },
                'Manage a forest over decades. Choose your strategy each decade: ',
                h('strong', { style: { color: '#4ade80' } }, 'Cultural Burn'),
                ' (Indigenous method), ',
                h('strong', { style: { color: '#f59e0b' } }, 'Prescribed Burn'),
                ' (Western forestry), or ',
                h('strong', { style: { color: '#ef4444' } }, 'Suppress'),
                ' (fight all fire). Watch what happens over time.'
              )
            ),

            // Canvas visualization
            renderCanvas(),

            // Comparison mode toggle
            h('button', { 'aria-label': 'Year',
              onClick: function() { updMulti({ comparisonMode: !comparisonMode }); },
              style: { background: comparisonMode ? '#7c3aed' : '#1e293b', border: '1px solid ' + (comparisonMode ? '#7c3aed' : '#334155'), borderRadius: 8, padding: '8px 16px', color: comparisonMode ? '#fff' : '#94a3b8', cursor: 'pointer', fontSize: 13, marginBottom: 12 }
            }, comparisonMode ? '\u2716 Exit Comparison Mode' : '\u2194\uFE0F Compare: Cultural Burn vs. Suppression'),

            // Stats dashboard
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
              h('div', { style: { background: '#0f172a', borderRadius: 8, padding: 12 } },
                h('div', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 4 } }, '\uD83D\uDCC5 Year'),
                h('div', { style: { color: '#fff', fontSize: 24, fontWeight: 700 } }, s.year)
              ),
              h('div', { style: { background: '#0f172a', borderRadius: 8, padding: 12 } },
                h('div', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 4 } }, '\u26A0\uFE0F Wildfire Risk'),
                h('div', { style: { color: dangerLevel.color, fontSize: 20, fontWeight: 700 } }, dangerLevel.label)
              )
            ),

            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 8, padding: 14, marginBottom: 16 } },
              gauge('Fuel Load', Math.round(s.fuelLoad), 100, s.fuelLoad > 50 ? '#ef4444' : s.fuelLoad > 30 ? '#f59e0b' : '#22c55e', ' tons/acre'),
              gauge('Canopy Cover', Math.round(s.canopyCover), 100, '#16a34a', '%'),
              gauge('Understory Density', Math.round(s.understoryDensity), 100, s.understoryDensity > 60 ? '#ef4444' : '#f59e0b', '%'),
              gauge('Biodiversity', Math.round(s.biodiversity), 100, '#3b82f6', '/100'),
              gauge('Soil Health', Math.round(s.soilHealth), 100, '#854d0e', '/100'),
              gauge('Water Yield', Math.round(s.waterYield), 100, '#0ea5e9', '%'),
              gauge('Carbon Stored', Math.round(s.carbonStored), 100, '#64748b', ' tons')
            ),

            // Action buttons
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' } },
              h('button', { 'aria-label': 'Cultural Burn (+10 yrs)',
                onClick: function() { advanceDecade('culturalBurn'); },
                style: { flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#16a34a', color: '#fff', fontWeight: 700, fontSize: 14 }
              }, '\uD83D\uDD25 Cultural Burn (+10 yrs)'),
              h('button', { 'aria-label': 'Prescribed Burn (+10 yrs)',
                onClick: function() { advanceDecade('prescribe'); },
                style: { flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f59e0b', color: '#000', fontWeight: 700, fontSize: 14 }
              }, '\uD83D\uDCCB Prescribed Burn (+10 yrs)'),
              h('button', { 'aria-label': 'Suppress Fire (+10 yrs)',
                onClick: function() { advanceDecade('suppress'); },
                style: { flex: 1, minWidth: 140, padding: '12px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontWeight: 700, fontSize: 14 }
              }, '\u26D4 Suppress Fire (+10 yrs)')
            ),

            // Reset
            h('button', { 'aria-label': 'Reset Forest',
              onClick: function() { updMulti({ sim: Object.assign({}, SIM_DEFAULTS), simB: Object.assign({}, SIM_DEFAULTS) }); if (addToast) addToast('Forest reset to starting conditions.', 'info'); },
              style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13, marginBottom: 16 }
            }, '\uD83D\uDD04 Reset Forest'),

            // Side-by-side comparison
            comparisonMode ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, border: '2px solid #7c3aed' } },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#7c3aed', marginBottom: 12, fontSize: 15 } }, '\u2194\uFE0F Side-by-Side: Cultural Burn vs. Suppression'),
              h('p', { style: { margin: '0 0 12px 0', fontSize: 13, color: '#94a3b8' } }, 'Click to advance both forests 10 years \u2014 one managed with cultural burning, one with total fire suppression.'),
              h('button', { 'aria-label': 'Action',
                onClick: function() {
                  // Advance Forest A (cultural burn)
                  var newA = Object.assign({}, sim);
                  newA.fuelLoad = clamp(sim.fuelLoad - 8, 3, 100);
                  newA.understoryDensity = clamp(sim.understoryDensity - 15, 5, 100);
                  newA.biodiversity = clamp(sim.biodiversity + 8, 0, 100);
                  newA.soilHealth = clamp(sim.soilHealth + 5, 0, 100);
                  newA.waterYield = clamp(sim.waterYield + 5, 0, 100);
                  newA.carbonStored = clamp(sim.carbonStored - 2, 0, 200);
                  newA.canopyCover = clamp(newA.canopyCover + 2, 0, 95);
                  newA.year = sim.year + 10;
                  newA.totalBurns = sim.totalBurns + 1;
                  newA.decade = (sim.decade || []).concat([{ year: newA.year, fuel: newA.fuelLoad, biodiversity: newA.biodiversity, canopy: newA.canopyCover }]);

                  // Advance Forest B (suppression)
                  var newB = Object.assign({}, simB);
                  newB.fuelLoad = clamp(simB.fuelLoad + 12, 0, 100);
                  newB.understoryDensity = clamp(simB.understoryDensity + 18, 0, 100);
                  newB.biodiversity = clamp(simB.biodiversity - 8, 0, 100);
                  newB.soilHealth = clamp(simB.soilHealth - 3, 0, 100);
                  newB.waterYield = clamp(simB.waterYield - 6, 0, 100);
                  newB.carbonStored = clamp(simB.carbonStored + 5, 0, 200);
                  newB.yearsSinceLastBurn = simB.yearsSinceLastBurn + 10;
                  newB.year = simB.year + 10;
                  newB.canopyCover = clamp(newB.canopyCover + 2, 0, 95);

                  // Wildfire check for Forest B
                  if (newB.fuelLoad > 55 && Math.random() < (newB.fuelLoad - 40) / 80) {
                    var sev = newB.fuelLoad / 100;
                    newB.canopyCover = clamp(newB.canopyCover - Math.round(sev * 60), 0, 100);
                    newB.fuelLoad = clamp(newB.fuelLoad - 30, 0, 100);
                    newB.biodiversity = clamp(newB.biodiversity - 25, 0, 100);
                    newB.soilHealth = clamp(newB.soilHealth - 20, 0, 100);
                    newB.waterYield = clamp(newB.waterYield - 15, 0, 100);
                    newB.carbonStored = clamp(newB.carbonStored - 30, 0, 200);
                    newB.wildfires = simB.wildfires + 1;
                    if (addToast) addToast('\uD83D\uDCA5 Forest B: Catastrophic wildfire from fuel accumulation!', 'error');
                    playSound('wildfire');
                  }
                  newB.decade = (simB.decade || []).concat([{ year: newB.year, fuel: newB.fuelLoad, biodiversity: newB.biodiversity, canopy: newB.canopyCover }]);

                  updMulti({ sim: newA, simB: newB });
                  playSound('ignite');
                  checkBadge('mosaicMaster');
                  if (newA.year >= 50) checkBadge('comparisonChamp');
                },
                style: { width: '100%', padding: '12px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 14, marginBottom: 16 }
              }, '\u27A1\uFE0F Advance Both Forests +10 Years'),

              // Side by side gauges
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 } },
                h('div', null,
                  h('div', { style: { fontWeight: 700, color: '#22c55e', marginBottom: 8, fontSize: 14 } }, '\uD83D\uDD25 Forest A: Cultural Burn (Year ' + sim.year + ')'),
                  gauge('Fuel Load', Math.round(sim.fuelLoad), 100, '#22c55e', ' t/acre'),
                  gauge('Biodiversity', Math.round(sim.biodiversity), 100, '#3b82f6', '/100'),
                  gauge('Soil Health', Math.round(sim.soilHealth), 100, '#854d0e', '/100'),
                  gauge('Water Yield', Math.round(sim.waterYield), 100, '#0ea5e9', '%'),
                  h('div', { style: { fontSize: 12, color: '#4ade80', marginTop: 4 } }, 'Burns: ' + sim.totalBurns + ' | Wildfires: ' + sim.wildfires)
                ),
                h('div', null,
                  h('div', { style: { fontWeight: 700, color: '#ef4444', marginBottom: 8, fontSize: 14 } }, '\u26D4 Forest B: Suppression (Year ' + simB.year + ')'),
                  gauge('Fuel Load', Math.round(simB.fuelLoad), 100, simB.fuelLoad > 50 ? '#ef4444' : '#f59e0b', ' t/acre'),
                  gauge('Biodiversity', Math.round(simB.biodiversity), 100, '#3b82f6', '/100'),
                  gauge('Soil Health', Math.round(simB.soilHealth), 100, '#854d0e', '/100'),
                  gauge('Water Yield', Math.round(simB.waterYield), 100, '#0ea5e9', '%'),
                  h('div', { style: { fontSize: 12, color: '#fca5a5', marginTop: 4 } }, 'Years since burn: ' + simB.yearsSinceLastBurn + ' | Wildfires: ' + simB.wildfires)
                )
              )
            ) : null,

            // Decade graph
            s.decade && s.decade.length > 0 ? h('div', { style: { background: '#0f172a', borderRadius: 8, padding: 14, marginBottom: 16 } },
              h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 10, fontSize: 14 } }, '\uD83D\uDCCA Forest Health Over Time'),
              h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 } },
                s.decade.map(function(snap, si) {
                  return h('div', { key: si, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } },
                    h('div', { title: 'Biodiversity: ' + snap.biodiversity, style: { width: '100%', height: Math.max(2, snap.biodiversity * 1.1) + 'px', background: '#3b82f6', borderRadius: '2px 2px 0 0', transition: 'height 0.3s' } }),
                    h('div', { title: 'Fuel: ' + snap.fuel, style: { width: '100%', height: Math.max(2, snap.fuel * 1.1) + 'px', background: snap.fuel > 50 ? '#ef4444' : '#f59e0b', borderRadius: '0 0 2px 2px', transition: 'height 0.3s' } }),
                    h('div', { style: { fontSize: 11, color: '#64748b', marginTop: 2 } }, 'Y' + snap.year)
                  );
                })
              ),
              h('div', { style: { display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#94a3b8' } },
                h('span', null, '\u25A0 Biodiversity'),
                h('span', { style: { color: '#f59e0b' } }, '\u25A0 Fuel Load')
              )
            ) : null,

            // Event log
            s.eventLog && s.eventLog.length > 0 ? h('div', { style: { background: '#0f172a', borderRadius: 8, padding: 14 } },
              h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 8, fontSize: 14 } }, '\uD83D\uDCDC Event Log'),
              s.eventLog.slice(-8).reverse().map(function(ev, ei) {
                return h('div', { key: ei, style: { padding: '6px 0', borderBottom: '1px solid #1e293b', fontSize: 13, color: '#cbd5e1' } },
                  h('span', { style: { color: '#f97316', fontWeight: 600 } }, 'Year ' + ev.year + ': '),
                  ev.event
                );
              })
            ) : null
          );
        }

        // ══════════════════════════════════════
        // TAB: BURN PLANNER
        // ══════════════════════════════════════

        function renderBurnPlanTab() {
          function evaluateBurn() {
            var score = 0;
            var notes = [];

            // Temperature
            if (burnTemp >= 50 && burnTemp <= 70) { score += 25; notes.push('\u2705 Temperature in ideal range (50-70\u00B0F)'); }
            else if (burnTemp >= 40 && burnTemp <= 80) { score += 15; notes.push('\u26A0\uFE0F Temperature acceptable but not ideal'); }
            else { score += 0; notes.push('\u274C Temperature too extreme for safe burning'); }

            // Humidity
            if (burnHumidity >= 30 && burnHumidity <= 55) { score += 25; notes.push('\u2705 Humidity in ideal range (30-55%)'); }
            else if (burnHumidity >= 20 && burnHumidity <= 70) { score += 15; notes.push('\u26A0\uFE0F Humidity acceptable but not ideal'); }
            else if (burnHumidity < 20) { score += 0; notes.push('\u274C Humidity too low \u2014 fire will be dangerously intense'); }
            else { score += 5; notes.push('\u26A0\uFE0F High humidity may prevent fire from carrying'); }

            // Wind
            if (burnWind >= 3 && burnWind <= 12) { score += 25; notes.push('\u2705 Wind speed in ideal range (3-12 mph)'); }
            else if (burnWind < 3) { score += 10; notes.push('\u26A0\uFE0F Wind too calm \u2014 smoke won\u2019t disperse, fire may not carry'); }
            else if (burnWind <= 20) { score += 10; notes.push('\u26A0\uFE0F Wind getting strong \u2014 fire may be difficult to control'); }
            else { score += 0; notes.push('\u274C Wind speed dangerous \u2014 DO NOT BURN'); }

            // Fuel moisture
            if (burnFuelMoisture >= 12 && burnFuelMoisture <= 25) { score += 25; notes.push('\u2705 Fuel moisture in ideal range (12-25%)'); }
            else if (burnFuelMoisture >= 8 && burnFuelMoisture < 12) { score += 10; notes.push('\u26A0\uFE0F Fuel moisture low \u2014 fire will burn hot and fast'); }
            else if (burnFuelMoisture < 8) { score += 0; notes.push('\u274C Fuel moisture critically low \u2014 wildfire risk extreme'); }
            else { score += 10; notes.push('\u26A0\uFE0F Fuel moisture high \u2014 fire may not sustain'); }

            var verdict = score >= 85 ? { label: 'GO \u2014 Excellent conditions for cultural burning', color: '#22c55e', icon: '\u2705' } :
                          score >= 60 ? { label: 'CAUTION \u2014 Proceed with extra care', color: '#f59e0b', icon: '\u26A0\uFE0F' } :
                          { label: 'NO-GO \u2014 Conditions unsafe for burning', color: '#ef4444', icon: '\u274C' };

            updMulti({ burnResult: { score: score, notes: notes, verdict: verdict } });
            awardStemXP('fire_burn_plan', 15, 'Burn plan evaluation');
            if (score >= 85) checkBadge('burnPlanner');
            playSound(score >= 85 ? 'quizCorrect' : score >= 60 ? 'ignite' : 'quizWrong');
          }

          function slider(label, value, min, max, step, unit, key, color) {
            return h('div', { style: { marginBottom: 14 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 } },
                h('span', { style: { color: '#e2e8f0' } }, label),
                h('span', { style: { color: color, fontWeight: 700 } }, value + unit)
              ),
              h('input', {
                type: 'range', min: min, max: max, step: step, value: value,
                onChange: function(e) { upd(key, parseFloat(e.target.value)); upd('burnResult', null); },
                style: { width: '100%', accentColor: color }
              })
            );
          }

          return h('div', null,
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #f59e0b' } },
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.5 } },
                'Indigenous fire practitioners read the land, sky, and wind to determine the right moment to burn. Modern prescribed burn planners use the same principles with instruments. Adjust the conditions below and evaluate your burn plan.'
              )
            ),

            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16 } },
              slider('Temperature', burnTemp, 30, 100, 1, '\u00B0F', 'burnTemp', '#ef4444'),
              slider('Relative Humidity', burnHumidity, 10, 90, 1, '%', 'burnHumidity', '#3b82f6'),
              slider('Wind Speed', burnWind, 0, 30, 1, ' mph', 'burnWind', '#94a3b8'),
              slider('Fuel Moisture Content', burnFuelMoisture, 2, 40, 1, '%', 'burnFuelMoisture', '#22c55e')
            ),

            h('button', { 'aria-label': 'Evaluate Burn Plan',
              onClick: evaluateBurn,
              style: { width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 16 }
            }, '\uD83D\uDD25 Evaluate Burn Plan'),

            burnResult ? h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, border: '2px solid ' + burnResult.verdict.color } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                h('span', { style: { fontSize: 28 } }, burnResult.verdict.icon),
                h('div', null,
                  h('div', { style: { fontWeight: 700, color: burnResult.verdict.color, fontSize: 18 } }, burnResult.verdict.label),
                  h('div', { style: { color: '#94a3b8', fontSize: 13 } }, 'Safety score: ' + burnResult.score + '/100')
                )
              ),
              burnResult.notes.map(function(note, ni) {
                return h('div', { key: ni, style: { padding: '4px 0', fontSize: 14, color: '#e2e8f0' } }, note);
              }),
              h('div', { style: { marginTop: 12, padding: 12, background: '#1e293b', borderRadius: 8, fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } },
                h('strong', { style: { color: '#f59e0b' } }, 'Indigenous Wisdom: '),
                'Traditional fire practitioners burn on days with light dew, gentle breeze, and rising humidity. They start fires at the edges and burn toward the center, letting the fire creep slowly. If conditions change, they let the fire die naturally. This patience \u2014 working WITH the weather rather than against it \u2014 is what makes cultural burning so safe and effective.'
              )
            ) : null
          );
        }

        // ══════════════════════════════════════
        // TAB: FIRE SCIENCE
        // ══════════════════════════════════════

        function renderScienceTab() {
          if (selectedScience) {
            var concept = FIRE_SCIENCE.filter(function(c) { return c.id === selectedScience; })[0];
            if (!concept) { upd('selectedScience', null); return null; }

            return h('div', null,
              h('button', { 'aria-label': 'Back to Concepts',
                onClick: function() { upd('selectedScience', null); },
                style: { background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontSize: 14, marginBottom: 12, padding: 0 }
              }, '\u2190 Back to Concepts'),

              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 20 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
                  h('span', { style: { fontSize: 32 } }, concept.icon),
                  h('h3', { style: { margin: 0, color: '#f97316', fontSize: 20 } }, concept.name)
                ),
                h('p', { style: { lineHeight: 1.6, color: '#e2e8f0', fontSize: 14, marginBottom: 16 } }, concept.description),

                concept.elements.map(function(el, ei) {
                  return h('div', { key: ei, style: { background: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 10 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { style: { fontSize: 20 } }, el.icon),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#e2e8f0', fontSize: 15 } }, el.name)
                    ),
                    h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 14, lineHeight: 1.5 } }, el.desc)
                  );
                })
              )
            );
          }

          return h('div', null,
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 } },
              FIRE_SCIENCE.map(function(concept) {
                return h('button', { 'aria-label': 'Change selected science',
                  key: concept.id,
                  onClick: function() { upd('selectedScience', concept.id); },
                  style: {
                    background: '#0f172a', border: '1px solid #334155', borderRadius: 12,
                    padding: 16, cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                    h('span', { style: { fontSize: 28 } }, concept.icon),
                    h('span', { style: { fontWeight: 700, color: '#f97316', fontSize: 15 } }, concept.name)
                  ),
                  h('div', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.4 } }, concept.description.substring(0, 120) + '...'),
                  h('div', { style: { fontSize: 12, color: '#64748b', marginTop: 6 } }, concept.elements.length + ' topics inside')
                );
              })
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: QUIZ
        // ══════════════════════════════════════

        function renderQuizTab() {
          var currentQ = QUIZ_QUESTIONS[quizIdx % QUIZ_QUESTIONS.length];

          function selectAnswer(idx) {
            if (quizAnswer >= 0) return; // already answered
            var correct = idx === currentQ.answer;
            upd('quizAnswer', idx);
            var newTotal = quizTotal + 1;
            var newScore = quizScore + (correct ? 1 : 0);
            var newStreak = correct ? quizStreak + 1 : 0;
            var newBest = Math.max(quizBest, newStreak);
            var newCorrectCount = quizCorrectCount + (correct ? 1 : 0);

            updMulti({
              quizTotal: newTotal,
              quizScore: newScore,
              quizStreak: newStreak,
              quizBest: newBest,
              quizCorrectCount: newCorrectCount
            });

            playSound(correct ? 'quizCorrect' : 'quizWrong');
            awardStemXP('fire_quiz_' + quizIdx, correct ? 15 : 5, correct ? 'Correct!' : 'Keep learning');
            if (newCorrectCount >= 8) checkBadge('quizMaster');
          }

          function nextQuestion() {
            updMulti({
              quizIdx: (quizIdx + 1) % QUIZ_QUESTIONS.length,
              quizAnswer: -1
            });
          }

          return h('div', null,
            // Score header
            h('div', { style: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' } },
              h('div', { style: { background: '#0f172a', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 100 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Score'),
                h('div', { style: { fontSize: 20, fontWeight: 700, color: '#22c55e' } }, quizScore + '/' + quizTotal)
              ),
              h('div', { style: { background: '#0f172a', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 100 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Streak'),
                h('div', { style: { fontSize: 20, fontWeight: 700, color: '#f97316' } }, '\uD83D\uDD25 ' + quizStreak)
              ),
              h('div', { style: { background: '#0f172a', borderRadius: 8, padding: '10px 16px', flex: 1, minWidth: 100 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Best Streak'),
                h('div', { style: { fontSize: 20, fontWeight: 700, color: '#f59e0b' } }, '\u2B50 ' + quizBest)
              )
            ),

            // Question
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 20, marginBottom: 16 } },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 12, color: '#64748b', marginBottom: 8 } }, 'Question ' + ((quizIdx % QUIZ_QUESTIONS.length) + 1) + ' of ' + QUIZ_QUESTIONS.length),
              h('h3', { style: { margin: '0 0 16px 0', color: '#e2e8f0', fontSize: 16, lineHeight: 1.5 } }, currentQ.q),

              currentQ.choices.map(function(choice, ci) {
                var isSelected = quizAnswer === ci;
                var isCorrect = ci === currentQ.answer;
                var answered = quizAnswer >= 0;
                var bg = !answered ? '#1e293b' :
                         (isCorrect ? '#052e16' : (isSelected ? '#450a0a' : '#1e293b'));
                var border = !answered ? '#334155' :
                             (isCorrect ? '#22c55e' : (isSelected ? '#ef4444' : '#334155'));

                return h('button', { 'aria-label': 'Select Answer',
                  key: ci,
                  onClick: function() { selectAnswer(ci); },
                  disabled: answered,
                  style: {
                    display: 'block', width: '100%', padding: '12px 16px', marginBottom: 8,
                    borderRadius: 8, border: '2px solid ' + border,
                    background: bg, color: '#e2e8f0', fontSize: 14,
                    textAlign: 'left', cursor: answered ? 'default' : 'pointer',
                    transition: 'all 0.2s'
                  }
                },
                  (answered && isCorrect ? '\u2705 ' : answered && isSelected ? '\u274C ' : '') + choice
                );
              }),

              quizAnswer >= 0 ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { marginTop: 12 } },
                h('button', { 'aria-label': 'Next Question',
                  onClick: nextQuestion,
                  style: { padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: 14 }
                }, 'Next Question \u2192')
              ) : null
            )
          );
        }

        // ══════════════════════════════════════
        // AI TUTOR
        // ══════════════════════════════════════

        function renderAITutor() {
          function askAI() {
            if (!aiQuestion.trim() || aiLoading) return;
            upd('aiLoading', true);
            var prompt = 'You are a fire ecology educator who deeply respects Indigenous knowledge systems. The student (grade ' + (gradeLevel || '6') + ') asks: "' + aiQuestion + '". ' +
              'Answer in 2-3 paragraphs, emphasizing Indigenous fire stewardship knowledge where relevant. ' +
              'Be scientifically accurate but accessible. If appropriate, name specific Indigenous nations and their practices. ' +
              'Avoid romanticizing or generalizing \u2014 be specific about which peoples and which ecosystems.';

            callGemini(prompt).then(function(response) {
              updMulti({ aiResponse: response, aiLoading: false });
              var newCount = aiUseCount + 1;
              upd('aiUseCount', newCount);
              awardStemXP('fire_ai_' + Date.now(), 10, 'AI consultation');
              if (newCount >= 3) checkBadge('aiScholar');
            }).catch(function() {
              updMulti({ aiResponse: 'Sorry, the AI tutor is unavailable right now.', aiLoading: false });
            });
          }

          return h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginTop: 16 } },
            h('div', { style: { fontWeight: 700, color: '#38bdf8', marginBottom: 10, fontSize: 14 } }, '\uD83E\uDD16 AI Fire Ecology Tutor'),
            h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
              h('input', {
                type: 'text',
                value: aiQuestion,
                onChange: function(e) { upd('aiQuestion', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter') askAI(); },
                placeholder: 'Ask about fire ecology, Indigenous practices, prescribed burning...',
                style: {
                  flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #334155',
                  background: '#1e293b', color: '#e2e8f0', fontSize: 14, outline: 'none'
                },
                onFocus: function(e) { e.target.style.boxShadow = '0 0 0 2px #f97316'; }, onBlur: function(e) { e.target.style.boxShadow = 'none'; }
              }),
              h('button', { 'aria-label': 'Ask A I',
                onClick: askAI,
                disabled: aiLoading,
                style: {
                  padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  background: aiLoading ? '#334155' : '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14
                }
              }, aiLoading ? 'Thinking...' : 'Ask')
            ),
            aiResponse ? h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 14, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, whiteSpace: 'pre-wrap' } }, aiResponse) : null
          );
        }

        // ══════════════════════════════════════
        // TAB: SMOKE & SEEDS
        // ══════════════════════════════════════

        function renderSmokeSeedsTab() {
          return h('div', null,
            // Intro
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #f97316' } },
              h('h3', { style: { margin: '0 0 8px 0', color: '#f97316', fontSize: 16 } }, SMOKE_ECOLOGY.title),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.6 } }, SMOKE_ECOLOGY.intro)
            ),

            // Smoke chemicals
            h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontWeight: 700, color: '#fbbf24', marginBottom: 10, fontSize: 15 } }, '\uD83E\uDDEA Smoke Chemicals That Trigger Life'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 } },
                SMOKE_ECOLOGY.chemicals.map(function(chem, ci) {
                  return h('div', { key: ci, style: { background: '#0f172a', borderRadius: 10, padding: 14, border: '1px solid ' + chem.color + '44' } },
                    h('div', { style: { fontWeight: 700, color: chem.color, fontSize: 14, marginBottom: 2 } }, chem.name),
                    h('div', { style: { fontSize: 12, color: '#64748b', marginBottom: 6, fontFamily: 'monospace' } }, chem.formula),
                    h('div', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 } }, chem.desc)
                  );
                })
              )
            ),

            // Germination strategies
            h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontWeight: 700, color: '#4ade80', marginBottom: 10, fontSize: 15 } }, '\uD83C\uDF31 Fire Survival Strategies'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 } },
                SMOKE_ECOLOGY.strategies.map(function(strat, si) {
                  return h('div', { key: si, style: { background: '#0f172a', borderRadius: 10, padding: 14, border: '1px solid #33415544' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                      h('span', { style: { fontSize: 20 } }, strat.icon),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#e2e8f0', fontSize: 14 } }, strat.name)
                    ),
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5 } }, strat.desc)
                  );
                })
              )
            ),

            // Fire-dependent species gallery
            h('div', null,
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#f97316', marginBottom: 10, fontSize: 15 } }, '\uD83C\uDF3A Fire-Dependent Species Gallery'),
              SMOKE_ECOLOGY.fireSeeds.map(function(seed, si) {
                var expanded = selectedSeed === si;
                return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: si, style: { background: expanded ? '#1e293b' : '#0f172a', borderRadius: 10, padding: expanded ? 16 : 12, marginBottom: 8, border: '1px solid #33415544', cursor: 'pointer', transition: 'all 0.2s' },
                  onClick: function() { upd('selectedSeed', expanded ? null : si); if (!expanded) { awardStemXP('fire_seed_' + si, 5, seed.species); checkBadge('seedSprouter'); } }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { style: { fontSize: 22 } }, seed.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontWeight: 700, color: '#e2e8f0', fontSize: 14 } }, seed.species),
                      h('div', { style: { fontSize: 12, color: '#f97316' } }, seed.type)
                    ),
                    h('span', { style: { color: '#64748b', fontSize: 12 } }, expanded ? '\u25B2' : '\u25BC')
                  ),
                  expanded ? h('div', { style: { marginTop: 10, padding: 12, background: '#0f172a', borderRadius: 8, fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 } }, seed.strategy) : null
                );
              })
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: WATERSHEDS
        // ══════════════════════════════════════

        function renderWatershedTab() {
          return h('div', null,
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #0ea5e9' } },
              h('h3', { style: { margin: '0 0 8px 0', color: '#0ea5e9', fontSize: 16 } }, WATERSHED_SCIENCE.title),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.6 } }, WATERSHED_SCIENCE.intro)
            ),

            // Concepts
            WATERSHED_SCIENCE.concepts.map(function(concept, ci) {
              return h('div', { key: ci, style: { background: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 10, borderLeft: '3px solid ' + concept.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 20 } }, concept.icon),
                  h('span', { style: { fontWeight: 700, color: concept.color, fontSize: 14 } }, concept.name)
                ),
                h('div', { style: { fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 } }, concept.desc)
              );
            }),

            // Comparison table
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginTop: 16, border: '1px solid #334155' } },
              h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 12, fontSize: 15 } }, '\uD83D\uDCCA Watershed Impact: Cultural Burn vs. Wildfire'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0, fontSize: 13 } },
                // Header
                h('div', { style: { padding: 8, fontWeight: 700, color: '#94a3b8', borderBottom: '1px solid #334155' } }, 'Metric'),
                h('div', { style: { padding: 8, fontWeight: 700, color: '#22c55e', borderBottom: '1px solid #334155' } }, '\uD83D\uDD25 Cultural Burn'),
                h('div', { style: { padding: 8, fontWeight: 700, color: '#ef4444', borderBottom: '1px solid #334155' } }, '\uD83D\uDCA5 Wildfire'),
                // Rows
                h('div', { style: { padding: 8, color: '#94a3b8', borderBottom: '1px solid #1e293b' } }, 'Sediment runoff'),
                h('div', { style: { padding: 8, color: '#4ade80', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.culturalBurn.sediment),
                h('div', { style: { padding: 8, color: '#fca5a5', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.wildfire.sediment),
                h('div', { style: { padding: 8, color: '#94a3b8', borderBottom: '1px solid #1e293b' } }, 'Water temp change'),
                h('div', { style: { padding: 8, color: '#4ade80', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.culturalBurn.waterTemp),
                h('div', { style: { padding: 8, color: '#fca5a5', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.wildfire.waterTemp),
                h('div', { style: { padding: 8, color: '#94a3b8', borderBottom: '1px solid #1e293b' } }, 'Aquatic life'),
                h('div', { style: { padding: 8, color: '#4ade80', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.culturalBurn.aquaticLife),
                h('div', { style: { padding: 8, color: '#fca5a5', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.wildfire.aquaticLife),
                h('div', { style: { padding: 8, color: '#94a3b8', borderBottom: '1px solid #1e293b' } }, 'Recovery time'),
                h('div', { style: { padding: 8, color: '#4ade80', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.culturalBurn.recovery),
                h('div', { style: { padding: 8, color: '#fca5a5', borderBottom: '1px solid #1e293b' } }, WATERSHED_SCIENCE.comparison.wildfire.recovery),
                h('div', { style: { padding: 8, color: '#94a3b8' } }, 'Runoff increase'),
                h('div', { style: { padding: 8, color: '#4ade80' } }, WATERSHED_SCIENCE.comparison.culturalBurn.runoff),
                h('div', { style: { padding: 8, color: '#fca5a5' } }, WATERSHED_SCIENCE.comparison.wildfire.runoff)
              ),
              (function() { checkBadge('waterProtector'); return null; })()
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: CASE STUDIES
        // ══════════════════════════════════════

        function renderCaseStudiesTab() {
          if (selectedCase) {
            var cs = CASE_STUDIES.filter(function(c) { return c.id === selectedCase; })[0];
            if (!cs) { upd('selectedCase', null); return null; }

            if (!casesViewed[cs.id]) {
              var cv = Object.assign({}, casesViewed);
              cv[cs.id] = true;
              upd('casesViewed', cv);
              awardStemXP('fire_case_' + cs.id, 15, cs.name);
              if (Object.keys(cv).length >= 5) checkBadge('caseStudyScholar');
            }

            return h('div', null,
              h('button', { 'aria-label': 'Back to Case Studies',
                onClick: function() { upd('selectedCase', null); },
                style: { background: 'none', border: 'none', color: '#f97316', cursor: 'pointer', fontSize: 14, marginBottom: 12, padding: 0 }
              }, '\u2190 Back to Case Studies'),

              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 20, border: '1px solid ' + cs.color + '44' } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
                  h('span', { style: { fontSize: 32 } }, cs.icon),
                  h('div', null,
                    h('h3', { style: { margin: 0, color: cs.color, fontSize: 20 } }, cs.name),
                    h('div', { style: { color: '#94a3b8', fontSize: 13 } }, cs.location + ' \u2022 ' + cs.year)
                  )
                ),

                // Stats grid
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, marginBottom: 16 } },
                  Object.keys(cs.stats).map(function(key) {
                    var label = key.replace(/([A-Z])/g, ' $1').replace(/^./, function(s) { return s.toUpperCase(); });
                    return h('div', { key: key, style: { background: '#1e293b', borderRadius: 8, padding: 10, textAlign: 'center' } },
                      h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 2 } }, label),
                      h('div', { style: { fontSize: 14, fontWeight: 700, color: '#ef4444' } }, cs.stats[key])
                    );
                  })
                ),

                h('p', { style: { lineHeight: 1.6, color: '#e2e8f0', fontSize: 14, marginBottom: 16 } }, cs.description),

                h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 14, marginBottom: 16, borderLeft: '3px solid #f59e0b' } },
                  h('div', { style: { fontWeight: 700, color: '#f59e0b', marginBottom: 6 } }, '\uD83C\uDF0D Indigenous Context'),
                  h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 } }, cs.indigenousContext)
                ),

                h('div', { style: { background: cs.color + '15', borderRadius: 8, padding: 14, marginBottom: 16, borderLeft: '3px solid ' + cs.color } },
                  h('div', { style: { fontWeight: 700, color: cs.color, marginBottom: 6 } }, '\u26A1 The Lesson'),
                  h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.6 } }, cs.lesson)
                ),

                h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 14 } },
                  h('div', { style: { fontWeight: 700, color: '#38bdf8', marginBottom: 6 } }, '\uD83D\uDD2C Science Note'),
                  h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 14, lineHeight: 1.6 } }, cs.scienceNote)
                )
              )
            );
          }

          return h('div', null,
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #ef4444' } },
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.6 } },
                'These are not \u201Cnatural disasters.\u201D Each wildfire case study below reveals the predictable consequences of removing Indigenous fire management from fire-adapted landscapes. The pattern is the same everywhere: ',
                h('strong', { style: { color: '#ef4444' } }, 'suppress fire \u2192 accumulate fuel \u2192 catastrophic wildfire \u2192 devastation that Indigenous burning would have prevented.')
              )
            ),

            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              CASE_STUDIES.map(function(cs) {
                var viewed = casesViewed[cs.id];
                return h('button', { 'aria-label': 'Change selected case',
                  key: cs.id,
                  onClick: function() { upd('selectedCase', cs.id); },
                  style: {
                    background: viewed ? cs.color + '18' : '#0f172a',
                    border: '1px solid ' + cs.color + '44',
                    borderRadius: 12, padding: 16, cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s'
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                    h('span', { style: { fontSize: 28 } }, cs.icon),
                    h('div', null,
                      h('div', { style: { fontWeight: 700, color: cs.color, fontSize: 15 } }, cs.name),
                      h('div', { style: { fontSize: 12, color: '#94a3b8' } }, cs.location + ' \u2022 ' + cs.year)
                    )
                  ),
                  h('div', { style: { fontSize: 13, color: '#ef4444', marginBottom: 4 } }, '\uD83D\uDD25 ' + cs.stats.acresBurned + (cs.stats.deaths ? ' \u2022 ' + cs.stats.deaths + ' deaths' : '')),
                  h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.4 } }, cs.description.substring(0, 120) + '...'),
                  viewed ? h('div', { style: { fontSize: 11, color: '#4ade80', marginTop: 6 } }, '\u2713 Studied') : null
                );
              })
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: CARBON CALCULATOR
        // ══════════════════════════════════════

        function renderCarbonTab() {
          function calculate() {
            updMulti({ carbonCalculated: true });
            awardStemXP('fire_carbon_calc', 15, 'Carbon calculation');
            checkBadge('carbonTracker');
            playSound('quizCorrect');
          }

          var scenarios = ['culturalBurn', 'prescribedBurn', 'wildfire', 'suppression50yr'];

          return h('div', null,
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #64748b' } },
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.6 } },
                'Compare the carbon impact of different fire management strategies. Adjust the acreage and see how cultural burning, prescribed burning, wildfire, and long-term suppression compare for carbon emissions and sequestration.'
              )
            ),

            // Acres slider
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16 } },
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 } },
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: '#e2e8f0' } }, 'Area to Calculate'),
                h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: '#f97316', fontWeight: 700 } }, carbonAcres.toLocaleString() + ' acres')
              ),
              h('input', {
                type: 'range', min: 10, max: 10000, step: 10, value: carbonAcres,
                onChange: function(e) { updMulti({ carbonAcres: parseInt(e.target.value), carbonCalculated: false }); },
                style: { width: '100%', accentColor: '#f97316' }
              }),
              h('button', { 'aria-label': 'Calculate Carbon Impact',
                onClick: calculate,
                style: { width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: 15, marginTop: 12 }
              }, '\u2601\uFE0F Calculate Carbon Impact')
            ),

            // Results
            carbonCalculated ? h('div', null,
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, marginBottom: 16 } },
                scenarios.map(function(key) {
                  var sc = CARBON_DATA[key];
                  var totalCO2 = sc.co2PerAcre * carbonAcres;
                  var net10yr = sc.netCarbon10yr * carbonAcres;
                  var biochar = sc.biocharCreated * carbonAcres;

                  return h('div', { key: key, style: { background: '#0f172a', borderRadius: 12, padding: 16, border: '2px solid ' + sc.color + '44' } },
                    h('div', { style: { fontWeight: 700, color: sc.color, marginBottom: 10, fontSize: 14 } }, sc.label),

                    h('div', { style: { marginBottom: 8 } },
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Immediate CO\u2082 Release'),
                      h('div', { style: { fontSize: 20, fontWeight: 700, color: sc.color } }, totalCO2.toLocaleString() + ' tons')
                    ),

                    h('div', { style: { marginBottom: 8 } },
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Tree Survival'),
                      h('div', { style: { fontSize: 16, fontWeight: 700, color: sc.treeSurvival > 50 ? '#22c55e' : '#ef4444' } }, sc.treeSurvival + '%')
                    ),

                    h('div', { style: { marginBottom: 8 } },
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Soil Carbon'),
                      h('div', { style: { fontSize: 13, fontWeight: 600, color: sc.soilCarbon === 'preserved' ? '#22c55e' : sc.soilCarbon === 'destroyed' ? '#ef4444' : '#f59e0b' } }, sc.soilCarbon)
                    ),

                    biochar > 0 ? h('div', { style: { marginBottom: 8 } },
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Biochar Created (1000+ yr storage)'),
                      h('div', { style: { fontSize: 14, fontWeight: 700, color: '#22c55e' } }, biochar.toLocaleString() + ' tons')
                    ) : null,

                    h('div', { style: { marginBottom: 8 } },
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Net Carbon (10 years)'),
                      h('div', { style: { fontSize: 18, fontWeight: 700, color: net10yr <= 0 ? '#22c55e' : '#ef4444' } },
                        (net10yr <= 0 ? '\u2193 ' : '\u2191 ') + Math.abs(net10yr).toLocaleString() + ' tons',
                        h('span', { style: { fontSize: 12, color: '#94a3b8', marginLeft: 4 } }, net10yr <= 0 ? '(carbon sink)' : '(carbon source)')
                      )
                    ),

                    h('div', { style: { fontSize: 12, color: '#94a3b8' } }, 'Recovery: ' + (sc.recoveryTime === 0 ? 'Immediate' : sc.recoveryTime + ' years'))
                  );
                })
              ),

              // Visual comparison bar
              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16 } },
                h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 12, fontSize: 14 } }, '\uD83D\uDCCA CO\u2082 Release Comparison (' + carbonAcres.toLocaleString() + ' acres)'),
                scenarios.map(function(key) {
                  var sc = CARBON_DATA[key];
                  var totalCO2 = sc.co2PerAcre * carbonAcres;
                  var maxCO2 = CARBON_DATA.suppression50yr.co2PerAcre * carbonAcres;
                  var pct = Math.round((totalCO2 / maxCO2) * 100);
                  return h('div', { key: key, style: { marginBottom: 10 } },
                    h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', marginBottom: 3 } },
                      h('span', null, sc.label),
                      h('span', { style: { color: sc.color, fontWeight: 700 } }, totalCO2.toLocaleString() + ' tons CO\u2082')
                    ),
                    h('div', { style: { height: 16, background: '#1e293b', borderRadius: 8, overflow: 'hidden' } },
                      h('div', { style: { width: Math.max(2, pct) + '%', height: '100%', background: sc.color, borderRadius: 8, transition: 'width 0.5s' } })
                    )
                  );
                }),
                h('div', { style: { marginTop: 12, padding: 12, background: '#052e16', borderRadius: 8, fontSize: 13, color: '#4ade80', lineHeight: 1.5 } },
                  '\u2B50 For ' + carbonAcres.toLocaleString() + ' acres: Cultural burning saves ',
                  h('strong', null, ((CARBON_DATA.wildfire.co2PerAcre - CARBON_DATA.culturalBurn.co2PerAcre) * carbonAcres).toLocaleString() + ' tons of CO\u2082'),
                  ' compared to wildfire. That\u2019s equivalent to taking ',
                  h('strong', null, Math.round(((CARBON_DATA.wildfire.co2PerAcre - CARBON_DATA.culturalBurn.co2PerAcre) * carbonAcres) / 4.6).toLocaleString()),
                  ' cars off the road for a year.'
                )
              )
            ) : null
          );
        }

        // ══════════════════════════════════════
        // CANVAS: FOREST VISUALIZATION
        // ══════════════════════════════════════

        var _lastForestCanvas = null;
        function forestCanvasRef(canvasEl) {
          if (!canvasEl) {
            if (_lastForestCanvas && _lastForestCanvas._fireAnim) {
              cancelAnimationFrame(_lastForestCanvas._fireAnim);
              _lastForestCanvas._fireInit = false;
            }
            _lastForestCanvas = null;
            return;
          }
          _lastForestCanvas = canvasEl;
          if (canvasEl._fireInit) return;
          canvasEl._fireInit = true;

          var cW = canvasEl.width = canvasEl.offsetWidth * 2;
          var cH = canvasEl.height = canvasEl.offsetHeight * 2;
          var cx = canvasEl.getContext('2d');
          var dpr = 2;
          var tick = 0;

          // Parse state from data attributes
          function getAttr(name, def) { var v = parseFloat(canvasEl.getAttribute('data-' + name)); return isNaN(v) ? def : v; }

          // Particles
          var particles = [];
          for (var i = 0; i < 30; i++) {
            particles.push({
              x: Math.random() * cW / dpr,
              y: Math.random() * cH / dpr,
              vx: (Math.random() - 0.5) * 0.3,
              vy: -0.2 - Math.random() * 0.3,
              life: Math.random() * 200,
              type: i < 10 ? 'ember' : i < 20 ? 'leaf' : 'bird'
            });
          }

          function draw() {
            canvasEl._fireAnim = requestAnimationFrame(draw);
            tick++;
            cx.clearRect(0, 0, cW, cH);

            var fuel = getAttr('fuel', 15);
            var canopy = getAttr('canopy', 60);
            var bio = getAttr('bio', 85);
            var understory = getAttr('understory', 20);
            var burning = canvasEl.getAttribute('data-burning') === '1';

            var w = cW / dpr;
            var ht = cH / dpr;
            cx.save();
            cx.scale(dpr, dpr);

            // Sky gradient (changes with conditions)
            var skyGrad = cx.createLinearGradient(0, 0, 0, ht);
            if (burning) {
              skyGrad.addColorStop(0, '#7f1d1d');
              skyGrad.addColorStop(0.5, '#dc2626');
              skyGrad.addColorStop(1, '#451a03');
            } else {
              var haze = Math.min(fuel / 100, 0.5);
              skyGrad.addColorStop(0, 'rgba(30,58,138,' + (1 - haze) + ')');
              skyGrad.addColorStop(0.4, 'rgba(56,189,248,' + (0.3 + haze * 0.3) + ')');
              skyGrad.addColorStop(1, 'rgba(34,197,94,' + (0.2 + bio / 200) + ')');
            }
            cx.fillStyle = skyGrad;
            cx.fillRect(0, 0, w, ht);

            // Ground
            var groundY = ht * 0.65;
            var groundGrad = cx.createLinearGradient(0, groundY, 0, ht);
            groundGrad.addColorStop(0, fuel > 50 ? '#854d0e' : '#365314');
            groundGrad.addColorStop(1, '#1e1b0f');
            cx.fillStyle = groundGrad;
            cx.fillRect(0, groundY, w, ht - groundY);

            // Fuel litter layer
            if (fuel > 10) {
              var litterH = (fuel / 100) * 20;
              cx.fillStyle = 'rgba(139,69,19,' + Math.min(fuel / 80, 0.7) + ')';
              cx.fillRect(0, groundY - litterH * 0.5, w, litterH);
              // Dead branches
              for (var fi = 0; fi < Math.floor(fuel / 8); fi++) {
                var fx = (fi * 37 + 13) % w;
                cx.strokeStyle = 'rgba(120,80,30,' + (fuel / 100) + ')';
                cx.lineWidth = 1 + Math.random();
                cx.beginPath();
                cx.moveTo(fx, groundY - 2);
                cx.lineTo(fx + 8 + Math.random() * 12, groundY - 4 - Math.random() * litterH);
                cx.stroke();
              }
            }

            // Trees (number based on canopy)
            var treeCount = Math.floor(canopy / 7) + 2;
            for (var ti = 0; ti < treeCount; ti++) {
              var tx = (ti / treeCount) * w + (w / treeCount) * 0.5;
              var treeH = 30 + (canopy / 100) * 50 + Math.sin(ti * 3.7) * 10;
              var trunkW = 3 + (canopy / 100) * 4;

              // Trunk
              cx.fillStyle = '#5C4033';
              cx.fillRect(tx - trunkW / 2, groundY - treeH, trunkW, treeH);

              // Canopy
              var crownR = 10 + (canopy / 100) * 18 + Math.sin(ti * 2.3) * 5;
              var crownY = groundY - treeH - crownR * 0.3;
              cx.fillStyle = burning ? 'rgba(220,38,38,0.7)' : (bio > 60 ? '#166534' : bio > 30 ? '#a16207' : '#78716c');
              cx.beginPath();
              cx.arc(tx, crownY, crownR, 0, Math.PI * 2);
              cx.fill();

              // Darker crown center
              cx.fillStyle = burning ? 'rgba(234,88,12,0.5)' : 'rgba(0,0,0,0.15)';
              cx.beginPath();
              cx.arc(tx - 2, crownY + 2, crownR * 0.6, 0, Math.PI * 2);
              cx.fill();

              // Understory (bushes at base)
              if (understory > 15) {
                var bushes = Math.floor(understory / 20);
                for (var bi = 0; bi < bushes; bi++) {
                  var bx = tx + (bi - bushes / 2) * 8;
                  var bR = 4 + (understory / 100) * 8;
                  cx.fillStyle = burning ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,' + Math.min(understory / 100, 0.6) + ')';
                  cx.beginPath();
                  cx.arc(bx, groundY - 2, bR, 0, Math.PI * 2);
                  cx.fill();
                }
              }
            }

            // Fire effect overlay
            if (burning) {
              for (var ei = 0; ei < 25; ei++) {
                var ex = (ei * 41 + tick * 0.5) % w;
                var ey = groundY - Math.random() * 40 - 5;
                var er = 3 + Math.random() * 8;
                cx.fillStyle = 'rgba(251,191,36,' + (0.3 + Math.random() * 0.4) + ')';
                cx.beginPath();
                cx.arc(ex, ey + Math.sin(tick * 0.1 + ei) * 3, er, 0, Math.PI * 2);
                cx.fill();
              }
              // Smoke
              for (var si = 0; si < 15; si++) {
                var sx = (si * 67 + tick * 0.3) % w;
                var sy = groundY - 50 - si * 8 - Math.sin(tick * 0.02 + si) * 15;
                var sr = 8 + si * 3;
                cx.fillStyle = 'rgba(100,100,100,' + (0.15 - si * 0.008) + ')';
                cx.beginPath();
                cx.arc(sx, sy, sr, 0, Math.PI * 2);
                cx.fill();
              }
            }

            // Particles
            particles.forEach(function(p) {
              p.x += p.vx + Math.sin(tick * 0.01 + p.life) * 0.2;
              p.y += p.vy;
              p.life--;
              if (p.life <= 0 || p.y < -10 || p.x < -10 || p.x > w + 10) {
                p.x = Math.random() * w;
                p.y = groundY - Math.random() * 20;
                p.life = 100 + Math.random() * 150;
              }
              if (p.type === 'ember' && burning) {
                cx.fillStyle = 'rgba(251,146,60,' + (p.life / 200) + ')';
                cx.fillRect(p.x, p.y, 2, 2);
              } else if (p.type === 'leaf' && !burning) {
                cx.fillStyle = 'rgba(74,222,128,' + (p.life / 300) + ')';
                cx.fillRect(p.x, p.y, 3, 2);
              } else if (p.type === 'bird' && !burning && bio > 40) {
                cx.fillStyle = 'rgba(56,189,248,0.6)';
                cx.beginPath();
                cx.moveTo(p.x, p.y);
                cx.lineTo(p.x - 3, p.y + 2);
                cx.lineTo(p.x + 3, p.y + 2);
                cx.fill();
              }
            });

            // Info overlay
            cx.fillStyle = 'rgba(0,0,0,0.5)';
            cx.fillRect(4, 4, 140, 56);
            cx.font = '10px sans-serif';
            cx.fillStyle = '#94a3b8';
            cx.fillText('Fuel: ' + Math.round(fuel) + ' t/acre', 10, 16);
            cx.fillText('Canopy: ' + Math.round(canopy) + '%', 10, 28);
            cx.fillText('Biodiversity: ' + Math.round(bio) + '/100', 10, 40);
            cx.fillText('Understory: ' + Math.round(understory) + '%', 10, 52);

            cx.restore();
          }

          draw();
        }

        // ══════════════════════════════════════
        // TAB: BEAVERS & FIRE
        // ══════════════════════════════════════

        function renderBeaverTab() {
          return h('div', null,
            h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16, borderLeft: '3px solid #0ea5e9' } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 } },
                h('span', { style: { fontSize: 36 } }, '\uD83E\uDDAB'),
                h('h3', { style: { margin: 0, color: '#0ea5e9', fontSize: 18 } }, BEAVER_FIRE.title)
              ),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 } }, BEAVER_FIRE.intro)
            ),

            // Interactive beaver-dam diagram
            h('div', { style: { background: '#0c1929', borderRadius: 12, padding: 16, marginBottom: 16, textAlign: 'center', border: '1px solid #1e3a5f' } },
              h('div', { style: { fontWeight: 700, color: '#38bdf8', marginBottom: 12, fontSize: 15 } }, '\uD83C\uDF0A How Beaver Dams Create Fire Refugia'),
              h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 12 } },
                // Visual cross-section
                [
                  { emoji: '\uD83D\uDD25', label: 'Burned\nForest', bg: '#7f1d1d', w: 60 },
                  { emoji: '\uD83C\uDF32', label: 'Fire\nEdge', bg: '#854d0e', w: 40 },
                  { emoji: '\uD83C\uDF3F', label: 'Green\nBuffer', bg: '#14532d', w: 50 },
                  { emoji: '\uD83E\uDDAB', label: 'Beaver\nPond', bg: '#0c4a6e', w: 70 },
                  { emoji: '\uD83D\uDCA7', label: 'Saturated\nSoil', bg: '#164e63', w: 50 },
                  { emoji: '\uD83C\uDF3F', label: 'Green\nBuffer', bg: '#14532d', w: 50 },
                  { emoji: '\uD83C\uDF32', label: 'Fire\nEdge', bg: '#854d0e', w: 40 },
                  { emoji: '\uD83D\uDD25', label: 'Burned\nForest', bg: '#7f1d1d', w: 60 }
                ].map(function(zone, zi) {
                  return h('div', { key: zi, style: { width: zone.w, padding: '8px 2px', background: zone.bg, borderRadius: zi === 0 ? '8px 0 0 8px' : zi === 7 ? '0 8px 8px 0' : 0, textAlign: 'center' } },
                    h('div', { style: { fontSize: 18, marginBottom: 2 } }, zone.emoji),
                    h('div', { style: { fontSize: 11, color: '#cbd5e1', whiteSpace: 'pre-line', lineHeight: 1.2 } }, zone.label)
                  );
                })
              ),
              h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic' } }, 'Cross-section: Beaver pond creates a green, fire-resistant corridor even when surrounding forest burns')
            ),

            // Science cards
            BEAVER_FIRE.science.map(function(item, idx) {
              return h('div', { key: idx, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: '3px solid ' + item.color } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                  h('span', { style: { fontSize: 22 } }, item.icon),
                  h('span', { style: { fontWeight: 700, color: item.color, fontSize: 15 } }, item.name)
                ),
                h('p', { style: { margin: '0 0 8px 0', color: '#cbd5e1', fontSize: 14, lineHeight: 1.6 } }, item.desc),
                h('div', { style: { background: item.color + '15', borderRadius: 6, padding: '8px 12px', fontSize: 13, color: item.color, fontWeight: 600 } },
                  '\uD83D\uDCCA ' + item.stat
                )
              );
            }),

            // Key takeaway
            h('div', { style: { background: '#052e16', borderRadius: 12, padding: 16, border: '1px solid #16a34a44' } },
              h('div', { style: { fontWeight: 700, color: '#4ade80', marginBottom: 8, fontSize: 15 } }, '\u2B50 The Integrated Vision: Fire + Beavers + Indigenous Knowledge'),
              h('p', { style: { margin: 0, color: '#bbf7d0', fontSize: 14, lineHeight: 1.7 } },
                'The most fire-resilient landscapes on Earth share three features: ',
                h('strong', null, 'regular low-intensity fire'),
                ' managed by knowledgeable practitioners, ',
                h('strong', null, 'intact beaver populations'),
                ' maintaining wetland corridors, and ',
                h('strong', null, 'Indigenous stewardship'),
                ' that understands fire, water, and wildlife as interconnected systems. Restoring all three together \u2014 not just one in isolation \u2014 is the most effective strategy for building landscape resilience in an era of increasing wildfire risk.'
              )
            )
          );
        }

        // ══════════════════════════════════════
        // TAB: FIREKEEPER CHALLENGE GAME
        // ══════════════════════════════════════

        function renderGameTab() {
          var diff = GAME_DIFFICULTIES[gameDifficulty];
          var pendingDecision = d.pendingDecision || null;

          function startGame() {
            var initial = {
              year: 0, fuelLoad: 20, canopyCover: 65, understoryDensity: 25,
              soilHealth: 75, biodiversity: 80, carbonStored: 50, waterYield: 75,
              yearsSinceLastBurn: 5, totalBurns: 0, wildfires: 0, villageHealth: 100,
              beaverDams: 0, decisionsWon: 0, educationCount: 0, tribalPartner: false,
              recoveredFromFire: false, highBioYears: 0, highWaterYears: 0,
              lowFuelYears: 0, bestDecadeScore: 0, species: [],
              eventLog: [], decade: []
            };
            updMulti({ gameActive: true, gameState: initial, gameEvent: null, gameScore: 0, gameOver: false, gameHistory: [], pendingDecision: null });
            playSound('ignite');
            if (addToast) addToast('\uD83D\uDD25 Firekeeper Challenge begins! Manage the forest wisely.', 'success');
          }

          function getRandomEvent() {
            if (Math.random() > diff.eventChance) return null;
            var pool = GAME_EVENTS.filter(function(ev) {
              if (!gameState) return !ev.condition;
              if (ev.condition === 'recentBurn' && gameState.yearsSinceLastBurn > 10) return false;
              if (ev.condition === 'highBio' && gameState.biodiversity < 70) return false;
              if (ev.condition === 'highWater' && gameState.waterYield < 70) return false;
              if (ev.condition === 'highUnderstory' && gameState.understoryDensity < 55) return false;
              if (ev.condition === 'lowUnderstory' && gameState.understoryDensity > 30) return false;
              return true;
            });
            return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
          }

          function getDecisionEvent() {
            if (Math.random() > diff.decisionChance) return null;
            return GAME_DECISIONS[Math.floor(Math.random() * GAME_DECISIONS.length)];
          }

          function resolveDecision(choiceIdx) {
            if (!pendingDecision || !gameState) return;
            var choice = pendingDecision.choices[choiceIdx];
            var gs = Object.assign({}, gameState);
            var log = '\uD83C\uDFDB\uFE0F Decision: ' + pendingDecision.name + ' \u2192 ' + choice.label;
            var pts = choice.points || 0;

            // Apply choice effects
            if (choice.effects) {
              Object.keys(choice.effects).forEach(function(k) {
                if (typeof gs[k] === 'number') gs[k] = clamp(gs[k] + choice.effects[k], 0, 100);
              });
            }

            // Risk-based wildfire from poor choices
            if (choice.risk > 0 && gs.fuelLoad > 30) {
              if (Math.random() < choice.risk * (gs.fuelLoad / 60)) {
                gs.canopyCover = clamp(gs.canopyCover - 30, 5, 100);
                gs.biodiversity = clamp(gs.biodiversity - 15, 0, 100);
                gs.fuelLoad = clamp(gs.fuelLoad - 20, 0, 100);
                gs.wildfires++;
                gs.villageHealth = clamp(gs.villageHealth - 25, 0, 100);
                pts -= 15;
                log += ' \uD83D\uDCA5 Fire broke through!';
                playSound('wildfire');
              } else {
                log += ' \u2705 Your strategy held!';
                pts += 5;
              }
            }
            if (choice.needsLowFuel && gs.fuelLoad > 30) {
              pts -= 10;
              log += ' \u26A0\uFE0F Fuel was too high to simply wait \u2014 fire spread!';
              gs.fuelLoad = clamp(gs.fuelLoad - 15, 0, 100);
              gs.biodiversity = clamp(gs.biodiversity - 10, 0, 100);
            }

            if (choice.bonus === 'education') gs.educationCount = (gs.educationCount || 0) + 1;
            gs.decisionsWon = (gs.decisionsWon || 0) + 1;
            if (pendingDecision.id === 'tribalPartnership') gs.tribalPartner = true;

            gs.eventLog = (gs.eventLog || []).concat([{ year: gs.year, event: log }]);
            var newScore = gameScore + pts;
            gs.bestDecadeScore = Math.max(gs.bestDecadeScore || 0, pts);

            updMulti({ gameState: gs, gameScore: newScore, pendingDecision: null, gameBestScore: Math.max(gameBestScore, newScore) });
            if (addToast) addToast(log, pts >= 10 ? 'success' : 'info');
            playSound(pts >= 10 ? 'quizCorrect' : 'ignite');
            awardStemXP('fire_decision_' + gs.year, Math.max(5, pts), 'Decision made');
          }

          function gameAdvance(action) {
            if (!gameState || gameOver || pendingDecision) return;
            var gs = Object.assign({}, gameState);
            var points = 0;
            var log = '';

            // Climate change escalation (hard mode)
            var climateBonus = 0;
            if (diff.climateEscalation && gs.year > 50) {
              climateBonus = Math.floor((gs.year - 50) / 30) * 3;
              gs.fuelLoad = clamp(gs.fuelLoad + climateBonus, 0, 100);
              if (climateBonus > 0) log += '\uD83C\uDF21\uFE0F Climate change: +' + climateBonus + ' fuel pressure. ';
            }

            // Apply player action
            if (action === 'culturalBurn') {
              var boost = gs.tribalPartner ? 1.3 : 1;
              gs.fuelLoad = clamp(gs.fuelLoad - Math.round(10 * boost), 3, 100);
              gs.understoryDensity = clamp(gs.understoryDensity - Math.round(15 * boost), 5, 100);
              gs.biodiversity = clamp(gs.biodiversity + Math.round(8 * boost), 0, 100);
              gs.soilHealth = clamp(gs.soilHealth + 5, 0, 100);
              gs.waterYield = clamp(gs.waterYield + 4, 0, 100);
              gs.yearsSinceLastBurn = 0;
              gs.totalBurns++;
              points += 15;
              log += '\uD83D\uDD25 Cultural burn' + (gs.tribalPartner ? ' (tribal-led, enhanced!)' : '') + ' performed successfully.';
              playSound('ignite');
            } else if (action === 'prescribe') {
              gs.fuelLoad = clamp(gs.fuelLoad - 6, 3, 100);
              gs.understoryDensity = clamp(gs.understoryDensity - 10, 5, 100);
              gs.biodiversity = clamp(gs.biodiversity + 4, 0, 100);
              gs.soilHealth = clamp(gs.soilHealth + 2, 0, 100);
              gs.yearsSinceLastBurn = 0;
              gs.totalBurns++;
              points += 8;
              log += '\uD83D\uDCCB Prescribed burn completed.';
              playSound('ignite');
            } else if (action === 'thin') {
              gs.fuelLoad = clamp(gs.fuelLoad - 4, 3, 100);
              gs.understoryDensity = clamp(gs.understoryDensity - 8, 5, 100);
              gs.canopyCover = clamp(gs.canopyCover - 5, 10, 95);
              points += 5;
              log += '\uD83E\uDE93 Mechanical thinning: some fuel removed, but missed fine fuels.';
            } else if (action === 'nothing') {
              gs.fuelLoad = clamp(gs.fuelLoad + 8, 0, 100);
              gs.understoryDensity = clamp(gs.understoryDensity + 12, 0, 100);
              gs.biodiversity = clamp(gs.biodiversity - 4, 0, 100);
              points -= 2;
              log += '\u23F8\uFE0F No action. Fuel accumulates.';
            } else if (action === 'beavers') {
              gs.waterYield = clamp(gs.waterYield + 10, 0, 100);
              gs.biodiversity = clamp(gs.biodiversity + 5, 0, 100);
              gs.fuelLoad = clamp(gs.fuelLoad - 2, 3, 100);
              gs.beaverDams = (gs.beaverDams || 0) + 1;
              points += 10;
              log += '\uD83E\uDDAB Installed Beaver Dam Analogs! Water table rising.';
              playSound('rain');
            } else if (action === 'plantSeeds') {
              gs.biodiversity = clamp(gs.biodiversity + 6, 0, 100);
              gs.soilHealth = clamp(gs.soilHealth + 3, 0, 100);
              gs.canopyCover = clamp(gs.canopyCover + 3, 0, 95);
              points += 7;
              log += '\uD83C\uDF31 Native seeds and fire-adapted species planted across burn scars.';
              playSound('grow');
            } else if (action === 'educate') {
              gs.educationCount = (gs.educationCount || 0) + 1;
              gs.villageHealth = clamp(gs.villageHealth + 8, 0, 100);
              points += 8;
              log += '\uD83C\uDFEB Community fire education program! Village support for burning grows.';
            } else if (action === 'firebreak') {
              gs.fuelLoad = clamp(gs.fuelLoad - 3, 3, 100);
              gs.villageHealth = clamp(gs.villageHealth + 5, 0, 100);
              points += 6;
              log += '\uD83D\uDEE1\uFE0F Defensible space and firebreaks created around the village.';
            }

            gs.year += 10;
            if (action !== 'culturalBurn' && action !== 'prescribe') gs.yearsSinceLastBurn += 10;
            gs.canopyCover = clamp(gs.canopyCover + (gs.canopyCover < 40 ? 6 : 2), 0, 95);

            // Track streaks for achievements
            if (gs.biodiversity > 85) gs.highBioYears = (gs.highBioYears || 0) + 10;
            if (gs.waterYield > 80) gs.highWaterYears = (gs.highWaterYears || 0) + 10;
            if (gs.fuelLoad < 30) gs.lowFuelYears = (gs.lowFuelYears || 0) + 10;

            // Beaver passive benefit (ongoing)
            if (gs.beaverDams >= 1) {
              gs.waterYield = clamp(gs.waterYield + 2, 0, 100);
              gs.fuelLoad = clamp(gs.fuelLoad - 1, 3, 100);
            }

            // Random event
            var event = getRandomEvent();
            if (event) {
              Object.keys(event.effects).forEach(function(k) {
                if (typeof gs[k] === 'number') gs[k] = clamp(gs[k] + event.effects[k], 0, 100);
              });
              log += ' | ' + event.icon + ' ' + event.name;
              if (event.teachingMoment) log += ' \uD83D\uDCA1 ' + event.teachingMoment;

              // Species tracking from ecology events
              if (event.id === 'wolfReturn') gs.species = (gs.species || []).concat(['Wolf Pack']);
              if (event.id === 'salmonRun') gs.species = (gs.species || []).concat(['Salmon']);
              if (event.id === 'eagleNest') gs.species = (gs.species || []).concat(['Bald Eagle']);
              if (event.id === 'tortoiseThrive') gs.species = (gs.species || []).concat(['Gopher Tortoise']);
              if (event.id === 'beaverReturn') gs.species = (gs.species || []).concat(['Beaver Colony']);
              if (event.bonus === 'tribalPartner') gs.tribalPartner = true;

              // Lightning wildfire
              if (event.wildfire_chance && gs.fuelLoad > 30) {
                if (Math.random() < event.wildfire_chance * (gs.fuelLoad / 60)) {
                  var sev = gs.fuelLoad / 100;
                  gs.canopyCover = clamp(gs.canopyCover - Math.round(sev * 50), 5, 100);
                  gs.biodiversity = clamp(gs.biodiversity - 20, 0, 100);
                  gs.soilHealth = clamp(gs.soilHealth - 15, 0, 100);
                  gs.waterYield = clamp(gs.waterYield - 12, 0, 100);
                  gs.fuelLoad = clamp(gs.fuelLoad - 25, 0, 100);
                  gs.wildfires++;
                  gs.villageHealth = clamp(gs.villageHealth - 30, 0, 100);
                  points -= 20;
                  log += ' \uD83D\uDCA5 WILDFIRE!';
                  playSound('wildfire');
                }
              }
              upd('gameEvent', event);
            } else { upd('gameEvent', null); }

            // Fuel accumulation wildfire
            if (!event || !event.wildfire_chance) {
              var threshold = diff.wildfireThreshold - (diff.climateEscalation && gs.year > 80 ? 8 : 0);
              if (gs.fuelLoad > threshold && Math.random() < (gs.fuelLoad - threshold + 10) / 100) {
                var oldBio = gs.biodiversity;
                var sev2 = gs.fuelLoad / 100;
                gs.canopyCover = clamp(gs.canopyCover - Math.round(sev2 * 55), 5, 100);
                gs.biodiversity = clamp(gs.biodiversity - 22, 0, 100);
                gs.soilHealth = clamp(gs.soilHealth - 18, 0, 100);
                gs.waterYield = clamp(gs.waterYield - 14, 0, 100);
                gs.fuelLoad = clamp(gs.fuelLoad - 28, 0, 100);
                gs.wildfires++;
                gs.villageHealth = clamp(gs.villageHealth - 35, 0, 100);
                points -= 25;
                log += ' \uD83D\uDCA5 WILDFIRE from fuel buildup!';
                playSound('wildfire');
                // Track for comeback achievement
                if (oldBio >= 70) gs._preFireBio = oldBio;
              }
            }

            // Comeback tracking
            if (gs._preFireBio && gs.biodiversity >= 70) { gs.recoveredFromFire = true; delete gs._preFireBio; }

            // Score bonuses
            if (gs.biodiversity > 70) points += 5;
            if (gs.soilHealth > 70) points += 3;
            if (gs.waterYield > 70) points += 3;
            if (gs.fuelLoad < 25) points += 5;
            if (gs.villageHealth >= 90) points += 2;
            gs.bestDecadeScore = Math.max(gs.bestDecadeScore || 0, points);

            var newScore = gameScore + points;
            gs.decade = (gs.decade || []).concat([{ year: gs.year, fuel: gs.fuelLoad, biodiversity: gs.biodiversity, canopy: gs.canopyCover, water: gs.waterYield, village: gs.villageHealth }]);
            gs.eventLog = (gs.eventLog || []).concat([{ year: gs.year, event: log }]);

            // Decision event check
            var decision = getDecisionEvent();

            // Check game over
            var isOver = false;
            var endMsg = '';
            if (gs.year >= diff.targetYears) { isOver = true; endMsg = '\uD83C\uDFC6 Survived ' + diff.targetYears + ' years! Score: ' + newScore; playSound('badge'); }
            if (gs.villageHealth <= 0) { isOver = true; endMsg = '\uD83D\uDCA5 Village devastated. Score: ' + newScore; playSound('quizWrong'); }
            if (gs.biodiversity <= 5) { isOver = true; endMsg = '\uD83D\uDC80 Ecosystem collapsed. Score: ' + newScore; playSound('quizWrong'); }

            var newBest = Math.max(gameBestScore, newScore);

            updMulti({
              gameState: gs, gameScore: newScore, gameBestScore: newBest,
              gameOver: isOver, pendingDecision: (!isOver && decision) ? decision : null,
              gameHistory: (gameHistory || []).concat([{ action: action, year: gs.year, score: points }])
            });

            if (isOver && addToast) addToast(endMsg, gs.year >= diff.targetYears ? 'success' : 'error');
            if (gs.year >= diff.targetYears && gs.wildfires === 0) { checkBadge('firekeeper'); checkBadge('knowledgeKeeper'); }
            awardStemXP('fire_game_' + gs.year, Math.max(5, points), 'Firekeeper turn');
          }

          // ── Get advisor tip ──
          function getAdvisorTip(gs) {
            if (!gs) return null;
            for (var i = 0; i < ADVISOR_TIPS.length; i++) {
              if (ADVISOR_TIPS[i].condition(gs)) return ADVISOR_TIPS[i];
            }
            return null;
          }

          // ── Check achievements ──
          function getAchievements(gs, isOver) {
            return GAME_ACHIEVEMENTS.filter(function(a) { try { return a.condition(gs, isOver); } catch(e) { return false; } });
          }

          // ── Get rank ──
          function getRank(score) {
            for (var i = 0; i < GAME_RANKS.length; i++) {
              if (score >= GAME_RANKS[i].min) return GAME_RANKS[i];
            }
            return GAME_RANKS[GAME_RANKS.length - 1];
          }

          // ═══ START SCREEN ═══
          if (!gameActive || !gameState) {
            return h('div', null,
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 24, marginBottom: 16, textAlign: 'center' } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 48, marginBottom: 8 } }, '\uD83D\uDD25'),
                h('h3', { style: { margin: '0 0 8px 0', color: '#f97316', fontSize: 22 } }, 'The Firekeeper Challenge'),
                h('p', { style: { margin: '0 0 16px 0', color: '#cbd5e1', fontSize: 14, lineHeight: 1.6, maxWidth: 550, marginLeft: 'auto', marginRight: 'auto' } },
                  'You are a fire keeper tasked with managing a forest and protecting a village for ' + diff.targetYears + ' years. Choose your strategy each decade: cultural burn, prescribed burn, thinning, plant native seeds, install beaver dams, build firebreaks, educate the community, or do nothing. Random events and decision moments will test your wisdom. Earn achievements by mastering fire ecology.'
                ),
                gameBestScore > 0 ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 14, color: '#f59e0b', marginBottom: 12 } }, '\u2B50 Personal Best: ' + gameBestScore + ' points') : null,
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 8 } }, 'Select Difficulty:'),
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' } },
                  Object.keys(GAME_DIFFICULTIES).map(function(key) {
                    var gd = GAME_DIFFICULTIES[key];
                    var active = gameDifficulty === key;
                    return h('button', { 'aria-label': 'Start Game', key: key, onClick: function() { upd('gameDifficulty', key); },
                      style: { padding: '10px 16px', borderRadius: 8, border: '2px solid ' + (active ? '#f97316' : '#334155'), background: active ? '#431407' : '#0f172a', color: active ? '#fb923c' : '#94a3b8', cursor: 'pointer', fontSize: 13, fontWeight: active ? 700 : 500, maxWidth: 200 }
                    },
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700 } }, gd.label),
                      h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 11, marginTop: 2, lineHeight: 1.3 } }, gd.description)
                    );
                  })
                ),
                h('button', { 'aria-label': 'Begin the Challenge', onClick: startGame,
                  style: { padding: '14px 40px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: 18 }
                }, '\uD83D\uDD25 Begin the Challenge')
              )
            );
          }

          // ═══ DECISION EVENT OVERLAY ═══
          if (pendingDecision) {
            return h('div', null,
              h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#1e1b4b', borderRadius: 12, padding: 20, border: '2px solid #6366f1' } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                  h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 32 } }, pendingDecision.icon),
                  h('div', null,
                    h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#a5b4fc', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 } }, 'DECISION EVENT'),
                    h('h3', { style: { margin: 0, color: '#e0e7ff', fontSize: 18 } }, pendingDecision.name)
                  )
                ),
                h('p', { style: { color: '#c7d2fe', fontSize: 14, lineHeight: 1.6, marginBottom: 16 } }, pendingDecision.desc),
                pendingDecision.choices.map(function(ch, ci) {
                  return h('button', { 'aria-label': 'Resolve Decision', key: ci, onClick: function() { resolveDecision(ci); },
                    style: { display: 'block', width: '100%', padding: 14, marginBottom: 10, borderRadius: 10, border: '2px solid #4f46e544', background: '#0f172a', textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s' }
                  },
                    h('div', { style: { fontWeight: 700, color: '#e0e7ff', fontSize: 14, marginBottom: 2 } }, ch.label),
                    h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.4 } }, ch.desc)
                  );
                })
              )
            );
          }

          // ═══ GAME IN PROGRESS ═══
          var gs = gameState;
          var dangerLevel = gs.fuelLoad < 25 ? { label: 'Low', color: '#22c55e' } : gs.fuelLoad < 40 ? { label: 'Moderate', color: '#f59e0b' } : gs.fuelLoad < 60 ? { label: 'High', color: '#f97316' } : { label: 'EXTREME', color: '#ef4444' };
          var advisorTip = getAdvisorTip(gs);
          var achievements = getAchievements(gs, gameOver);

          // ═══ GAME OVER SCREEN ═══
          if (gameOver) {
            var rank = getRank(gameScore);
            return h('div', null,
              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 24, textAlign: 'center', marginBottom: 16 } },
                h('div', { style: { fontSize: 48, marginBottom: 8 } }, gs.year >= diff.targetYears ? rank.icon : '\uD83D\uDCA5'),
                h('h3', { style: { margin: '0 0 4px 0', color: gs.year >= diff.targetYears ? '#22c55e' : '#ef4444', fontSize: 22 } }, gs.year >= diff.targetYears ? 'Challenge Complete!' : 'Game Over'),
                h('div', { style: { fontSize: 16, color: '#f59e0b', marginBottom: 4 } }, rank.name),
                h('div', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16, fontStyle: 'italic' } }, rank.desc),
                h('div', { style: { fontSize: 36, fontWeight: 700, color: '#f97316', marginBottom: 16 } }, gameScore + ' points')
              ),

              // Report card
              h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16 } },
                h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 12, fontSize: 15 } }, '\uD83D\uDCCB Report Card'),
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 } },
                  [
                    { label: 'Years Survived', value: gs.year, color: '#fff' },
                    { label: 'Cultural Burns', value: gs.totalBurns, color: '#22c55e' },
                    { label: 'Wildfires', value: gs.wildfires, color: gs.wildfires === 0 ? '#22c55e' : '#ef4444' },
                    { label: 'Beaver Dams', value: gs.beaverDams || 0, color: '#0ea5e9' },
                    { label: 'Decisions Won', value: gs.decisionsWon || 0, color: '#a855f7' },
                    { label: 'Final Biodiversity', value: Math.round(gs.biodiversity), color: gs.biodiversity > 70 ? '#22c55e' : '#f59e0b' },
                    { label: 'Final Soil Health', value: Math.round(gs.soilHealth), color: gs.soilHealth > 70 ? '#22c55e' : '#f59e0b' },
                    { label: 'Village Health', value: Math.round(gs.villageHealth || 0) + '%', color: (gs.villageHealth || 0) > 50 ? '#22c55e' : '#ef4444' },
                    { label: 'Species Returned', value: (gs.species || []).length, color: '#4ade80' },
                    { label: 'Best Decade', value: '+' + (gs.bestDecadeScore || 0), color: '#f59e0b' }
                  ].map(function(stat) {
                    return h('div', { key: stat.label, style: { background: '#1e293b', borderRadius: 8, padding: 10, textAlign: 'center' } },
                      h('div', { style: { fontSize: 20, fontWeight: 700, color: stat.color } }, stat.value),
                      h('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2 } }, stat.label)
                    );
                  })
                )
              ),

              // Species that returned
              gs.species && gs.species.length > 0 ? h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16 } },
                h('div', { style: { fontWeight: 700, color: '#4ade80', marginBottom: 8, fontSize: 14 } }, '\uD83E\uDD8B Species That Returned to Your Forest'),
                h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                  gs.species.filter(function(s, i, arr) { return arr.indexOf(s) === i; }).map(function(sp) {
                    return h('span', { key: sp, style: { background: '#052e16', border: '1px solid #16a34a44', borderRadius: 6, padding: '4px 10px', fontSize: 13, color: '#4ade80' } }, sp);
                  })
                )
              ) : null,

              // Achievements earned
              achievements.length > 0 ? h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 16 } },
                h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#f59e0b', marginBottom: 8, fontSize: 14 } }, '\uD83C\uDFC5 Achievements Earned'),
                achievements.map(function(a) {
                  return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, key: a.id, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontSize: 20 } }, a.icon),
                    h('div', null,
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#e2e8f0', fontSize: 13 } }, a.name),
                      h('span', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { color: '#64748b', fontSize: 12, marginLeft: 6 } }, ' \u2014 ' + a.desc)
                    )
                  );
                })
              ) : null,

              h('button', { 'aria-label': 'Play Again', onClick: function() { updMulti({ gameActive: false, gameState: null, gameEvent: null, gameScore: 0, gameOver: false, gameHistory: [], pendingDecision: null }); },
                style: { width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: '#ea580c', color: '#fff', fontWeight: 700, fontSize: 16 }
              }, '\uD83D\uDD04 Play Again')
            );
          }

          // ═══ ACTIVE GAME ═══
          return h('div', null,
            // Header stats
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' } },
              [
                { label: 'Year', value: gs.year + '/' + diff.targetYears, color: '#fff' },
                { label: 'Score', value: gameScore, color: '#f97316' },
                { label: 'Fire Risk', value: dangerLevel.label, color: dangerLevel.color },
                { label: 'Wildfires', value: gs.wildfires, color: gs.wildfires > 0 ? '#ef4444' : '#22c55e' },
                { label: 'Village', value: (gs.villageHealth || 100) + '%', color: (gs.villageHealth || 100) > 50 ? '#22c55e' : '#ef4444' }
              ].map(function(s) {
                return h('div', { key: s.label, style: { background: '#0f172a', borderRadius: 8, padding: '6px 12px', flex: 1, minWidth: 70 } },
                  h('div', { style: { fontSize: 11, color: '#64748b' } }, s.label),
                  h('div', { style: { fontSize: 16, fontWeight: 700, color: s.color } }, s.value)
                );
              })
            ),

            // Advisor tip
            advisorTip ? h('div', { style: { background: '#1e1b0f', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid #854d0e44', display: 'flex', gap: 8, alignItems: 'flex-start' } },
              h('span', { style: { fontSize: 20, flexShrink: 0 } }, advisorTip.icon),
              h('div', { style: { fontSize: 13, color: '#fbbf24', lineHeight: 1.5, fontStyle: 'italic' } }, advisorTip.tip)
            ) : null,

            // Current event
            gameEvent ? h('div', { style: { background: gameEvent.urgent ? '#451a03' : '#0f172a', borderRadius: 10, padding: 12, marginBottom: 12, border: '1px solid ' + (gameEvent.urgent ? '#f97316' : '#334155') } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 20 } }, gameEvent.icon),
                h('div', null,
                  h('div', { style: { fontWeight: 700, color: gameEvent.urgent ? '#fb923c' : '#e2e8f0', fontSize: 13 } }, gameEvent.name),
                  h('div', { style: { fontSize: 12, color: '#94a3b8' } }, gameEvent.desc)
                )
              ),
              gameEvent.teachingMoment ? h('div', { style: { marginTop: 6, padding: 8, background: '#0f172a', borderRadius: 6, fontSize: 12, color: '#fbbf24' } }, '\uD83D\uDCA1 ' + gameEvent.teachingMoment) : null
            ) : null,

            // Species tracker
            gs.species && gs.species.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 } },
              h('span', { style: { fontSize: 11, color: '#64748b', marginRight: 4 } }, 'Species returned:'),
              gs.species.filter(function(s, i, arr) { return arr.indexOf(s) === i; }).map(function(sp) {
                return h('span', { key: sp, style: { background: '#052e16', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#4ade80' } }, sp);
              })
            ) : null,

            // Gauges
            h('div', { style: { background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 12 } },
              gauge('Fuel Load', Math.round(gs.fuelLoad), 100, gs.fuelLoad > 50 ? '#ef4444' : gs.fuelLoad > 30 ? '#f59e0b' : '#22c55e', ' t/acre'),
              gauge('Canopy', Math.round(gs.canopyCover), 100, '#16a34a', '%'),
              gauge('Understory', Math.round(gs.understoryDensity), 100, gs.understoryDensity > 60 ? '#ef4444' : '#f59e0b', '%'),
              gauge('Biodiversity', Math.round(gs.biodiversity), 100, '#3b82f6', '/100'),
              gauge('Soil Health', Math.round(gs.soilHealth), 100, '#854d0e', '/100'),
              gauge('Water Yield', Math.round(gs.waterYield), 100, '#0ea5e9', '%')
            ),

            // Action buttons — 8 options now
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 6, fontSize: 13 } }, '\uD83C\uDFAE Choose Your Action:'),
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6, marginBottom: 14 } },
              [
                { action: 'culturalBurn', label: '\uD83D\uDD25 Cultural Burn', desc: 'Best: fuel + biodiversity' + (gs.tribalPartner ? ' (ENHANCED)' : ''), color: '#16a34a' },
                { action: 'prescribe', label: '\uD83D\uDCCB Prescribed Burn', desc: 'Good fuel reduction', color: '#f59e0b' },
                { action: 'thin', label: '\uD83E\uDE93 Mech. Thin', desc: 'Remove heavy fuel', color: '#64748b' },
                { action: 'plantSeeds', label: '\uD83C\uDF31 Plant Natives', desc: 'Biodiversity + soil', color: '#4ade80' },
                { action: 'beavers', label: '\uD83E\uDDAB Beaver Dams', desc: 'Water + fire breaks', color: '#0ea5e9' },
                { action: 'firebreak', label: '\uD83D\uDEE1\uFE0F Firebreaks', desc: 'Protect village', color: '#a855f7' },
                { action: 'educate', label: '\uD83C\uDFEB Educate', desc: 'Village support +', color: '#f472b6' },
                { action: 'nothing', label: '\u23F8\uFE0F Do Nothing', desc: 'Fuel accumulates...', color: '#ef4444' }
              ].map(function(opt) {
                return h('button', { 'aria-label': 'Select option', key: opt.action, onClick: function() { gameAdvance(opt.action); },
                  style: { background: '#0f172a', border: '2px solid ' + opt.color + '33', borderRadius: 10, padding: 10, cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s' }
                },
                  h('div', { style: { fontWeight: 700, color: opt.color, fontSize: 13, marginBottom: 2 } }, opt.label),
                  h('div', { style: { fontSize: 10, color: '#64748b', lineHeight: 1.2 } }, opt.desc)
                );
              })
            ),

            // Mini achievements tracker
            achievements.length > 0 ? h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 } },
              achievements.slice(0, 5).map(function(a) {
                return h('span', { key: a.id, title: a.name + ': ' + a.desc, style: { background: '#1e293b', borderRadius: 6, padding: '3px 8px', fontSize: 11, color: '#f59e0b' } }, a.icon + ' ' + a.name);
              })
            ) : null,

            // History graph
            gs.decade && gs.decade.length > 0 ? h('div', { style: { background: '#0f172a', borderRadius: 10, padding: 12, marginBottom: 10 } },
              h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 6, fontSize: 12 } }, '\uD83D\uDCCA Timeline'),
              h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 70 } },
                gs.decade.map(function(snap, si) {
                  return h('div', { key: si, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 } },
                    h('div', { title: 'Bio: ' + snap.biodiversity, style: { width: '100%', height: Math.max(2, snap.biodiversity * 0.6), background: '#3b82f6', borderRadius: '2px 2px 0 0' } }),
                    h('div', { title: 'Fuel: ' + snap.fuel, style: { width: '100%', height: Math.max(2, snap.fuel * 0.6), background: snap.fuel > 50 ? '#ef4444' : '#f59e0b', borderRadius: '0 0 2px 2px' } }),
                    h('div', { style: { fontSize: 7, color: '#475569', marginTop: 1 } }, snap.year)
                  );
                })
              ),
              h('div', { style: { display: 'flex', gap: 10, marginTop: 4, fontSize: 10, color: '#64748b' } },
                h('span', null, '\u25A0 Biodiversity'), h('span', { style: { color: '#f59e0b' } }, '\u25A0 Fuel Load')
              )
            ) : null,

            // Event log
            gs.eventLog && gs.eventLog.length > 0 ? h('div', { style: { background: '#0f172a', borderRadius: 10, padding: 12 } },
              h('div', { style: { fontWeight: 700, color: '#e2e8f0', marginBottom: 6, fontSize: 12 } }, '\uD83D\uDCDC Log'),
              gs.eventLog.slice(-5).reverse().map(function(ev, ei) {
                return h('div', { key: ei, style: { padding: '3px 0', borderBottom: '1px solid #1e293b', fontSize: 11, color: '#94a3b8', lineHeight: 1.4 } },
                  h('span', { style: { color: '#f97316', fontWeight: 600 } }, 'Y' + ev.year + ': '),
                  ev.event
                );
              })
            ) : null
          );
        }

        // ══════════════════════════════════════
        // FIRE FACT BANNER
        // ══════════════════════════════════════

        function renderFireFact() {
          var fact = FIRE_FACTS[factIdx % FIRE_FACTS.length];
          return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { background: '#1c1917', borderRadius: 10, padding: 12, marginTop: 16, border: '1px solid #44403c', display: 'flex', alignItems: 'center', gap: 10 } },
            h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { flex: 1, fontSize: 13, color: '#d6d3d1', lineHeight: 1.5 } },
              h('strong', { style: { color: '#f97316' } }, 'Did You Know? '),
              fact
            ),
            h('button', { 'aria-label': 'Next fact',
              onClick: function() {
                var newIdx = (factIdx + 1) % FIRE_FACTS.length;
                upd('factIdx', newIdx);
                // Track facts viewed for badge
                var factsRead = (d.factsRead || 0) + 1;
                upd('factsRead', factsRead);
                if (factsRead >= 10) checkBadge('factCollector');
              },
              style: { background: '#292524', border: '1px solid #44403c', borderRadius: 6, padding: '6px 10px', color: '#a8a29e', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }
            }, 'Next fact \u2192')
          );
        }

        // ══════════════════════════════════════
        // BADGES PANEL
        // ══════════════════════════════════════

        function renderBadges() {
          var earned = Object.keys(badges).length;
          return h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 16, marginTop: 16 } },
            h('div', { style: { fontWeight: 700, color: '#f59e0b', marginBottom: 10, fontSize: 14 } },
              '\uD83C\uDFC5 Badges (' + earned + '/' + BADGES.length + ')'
            ),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              BADGES.map(function(b) {
                var earned = badges[b.id];
                return h('div', {
                  key: b.id,
                  title: b.desc,
                  style: {
                    width: 48, height: 48, borderRadius: 8,
                    background: earned ? '#1e293b' : '#0f172a',
                    border: '1px solid ' + (earned ? '#f59e0b44' : '#1e293b'),
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: earned ? 22 : 14,
                    opacity: earned ? 1 : 0.3,
                    transition: 'all 0.3s'
                  }
                }, earned ? b.icon : '\uD83D\uDD12');
              })
            )
          );
        }

        // ══════════════════════════════════════
        // MAIN RENDER
        // ══════════════════════════════════════

        var intro = getGradeIntro(band);

        return h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { maxWidth: 900, margin: '0 auto' } },
          // Header
          h('div', { role: 'button', tabIndex: 0, onKeyDown: function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.target.click(); } }, style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 } },
            h('button', {
              onClick: function() { setStemLabTool(null); },
              'aria-label': 'Back to STEM Lab',
              style: { background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#94a3b8' }
            }, h(ArrowLeft, { size: 20 })),
            h('span', { style: { fontSize: 28 } }, '\uD83D\uDD25'),
            h('h2', { style: { margin: 0, color: '#f97316', fontSize: 22 } }, 'Fire Ecology & Indigenous Stewardship')
          ),

          // Grade intro
          h('div', { style: { background: '#431407', borderRadius: 10, padding: 14, marginBottom: 16, borderLeft: '3px solid #ea580c' } },
            h('p', { style: { margin: 0, color: '#fed7aa', fontSize: 14, lineHeight: 1.5 } }, intro)
          ),

          // Acknowledgment
          h('div', { style: { background: '#0c0a09', borderRadius: 10, padding: 12, marginBottom: 16, border: '1px solid #44403c', fontSize: 13, color: '#a8a29e', lineHeight: 1.5 } },
            h('strong', { style: { color: '#d6d3d1' } }, 'Acknowledgment: '),
            'This tool honors the fire stewardship knowledge of Indigenous peoples worldwide, developed over tens of thousands of years. We recognize that this knowledge belongs to these nations and is shared here with the intent of education and respect, not appropriation. We encourage learners to seek out and support Indigenous-led fire management organizations and to listen to Indigenous fire keepers as the primary authorities on these practices.'
          ),

          // Tab navigation
          renderTabNav(),

          // Tab content
          tab === 'indigenous' ? renderIndigenousTab() :
          tab === 'ecosystems' ? renderEcosystemsTab() :
          tab === 'simulator' ? renderSimulatorTab() :
          tab === 'burnPlan' ? renderBurnPlanTab() :
          tab === 'science' ? renderScienceTab() :
          tab === 'smokeSeeds' ? renderSmokeSeedsTab() :
          tab === 'watershed' ? renderWatershedTab() :
          tab === 'caseStudies' ? renderCaseStudiesTab() :
          tab === 'carbon' ? renderCarbonTab() :
          tab === 'beavers' ? renderBeaverTab() :
          tab === 'game' ? renderGameTab() :
          tab === 'quiz' ? renderQuizTab() : null,

          // Fire Fact banner
          renderFireFact(),

          // AI Tutor (always available)
          renderAITutor(),

          // Badges (always visible)
          renderBadges()
        );

      })();
    }
  });

})();

} // end dedup guard