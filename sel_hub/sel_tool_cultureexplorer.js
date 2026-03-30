// ═══════════════════════════════════════════
// sel_tool_cultureexplorer.js — Culture Explorer
// AI-powered deep dives into world cultures with
// Imagen illustrations, TTS pronunciations, and
// respectful engagement with cultural diversity
// ═══════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); console.log('[SelHub] Registered tool: ' + id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  getRegisteredTools: function() { var self = this; return this._order.map(function(id) { return self._registry[id]; }).filter(Boolean); },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; try { return tool.render(ctx); } catch(e) { console.error('[SelHub] Error rendering ' + id, e); return null; } }
};

(function() {
  'use strict';

  var REGIONS = [
    { id: 'africa', label: 'Africa', emoji: '\uD83C\uDF0D', cultures: ['Maasai (Kenya/Tanzania)', 'Yoruba (Nigeria)', 'Zulu (South Africa)', 'Amazigh/Berber (North Africa)', 'Ashanti (Ghana)', 'Hausa (West Africa)', 'Swahili Coast', 'Ethiopian Highlands', 'San/Bushmen (Southern Africa)', 'Wolof (Senegal)'] },
    { id: 'asia', label: 'Asia', emoji: '\uD83C\uDF0F', cultures: ['Japanese', 'Korean', 'Han Chinese', 'Tamil (South India/Sri Lanka)', 'Balinese (Indonesia)', 'Hmong (Southeast Asia)', 'Mongolian', 'Tibetan', 'Filipino/Tagalog', 'Kurdish', 'Bengali', 'Vietnamese', 'Thai', 'Punjabi'] },
    { id: 'americas-indigenous', label: 'Indigenous Americas', emoji: '\uD83E\uDD85', cultures: ['Navajo (Din\u00e9)', 'Lakota/Sioux', 'Cherokee', 'Maya (Mexico/Guatemala)', 'Quechua (Andes)', 'Inuit (Arctic)', 'Haudenosaunee (Iroquois)', 'Mapuche (Chile/Argentina)', 'Ojibwe/Anishinaabe', 'Haida (Pacific Northwest)', 'Guaran\u00ed (Paraguay)', 'Ta\u00edno (Caribbean)'] },
    { id: 'europe', label: 'Europe', emoji: '\uD83C\uDFF0', cultures: ['S\u00e1mi (Scandinavia)', 'Basque (Spain/France)', 'Romani', 'Irish/Celtic', 'Greek', 'Georgian', 'Sardinian', 'Slavic traditions', 'Norse/Viking heritage', 'Scottish Gaelic'] },
    { id: 'oceania', label: 'Oceania & Pacific', emoji: '\uD83C\uDF0A', cultures: ['M\u0101ori (New Zealand)', 'Aboriginal Australian', 'Hawaiian (Kanaka Maoli)', 'Samoan', 'Tongan', 'Fijian', 'Papua New Guinean', 'Torres Strait Islander'] },
    { id: 'middle-east', label: 'Middle East & Central Asia', emoji: '\uD83D\uDD4C', cultures: ['Persian/Iranian', 'Bedouin', 'Armenian', 'Afghan (Pashtun)', 'Uzbek', 'Druze', 'Assyrian', 'Yemeni'] },
    { id: 'diaspora', label: 'Diasporic Cultures', emoji: '\uD83C\uDF10', cultures: ['African American', 'Afro-Caribbean', 'South Asian diaspora', 'Chinese diaspora', 'Jewish diaspora', 'Latinx', 'Deaf culture (ASL)', 'Cajun/Creole'] },
  ];

  var EXPLORE_ASPECTS = [
    { id: 'traditions', label: 'Traditions & Ceremonies', emoji: '\uD83C\uDFAD', prompt: 'important traditions, ceremonies, and celebrations' },
    { id: 'food', label: 'Food & Cuisine', emoji: '\uD83C\uDF72', prompt: 'traditional foods, cooking methods, and the cultural significance of meals' },
    { id: 'art', label: 'Art & Music', emoji: '\uD83C\uDFA8', prompt: 'traditional art forms, music, dance, and creative expression' },
    { id: 'values', label: 'Values & Philosophy', emoji: '\uD83D\uDCA1', prompt: 'core values, philosophical beliefs, and worldview' },
    { id: 'language', label: 'Language & Stories', emoji: '\uD83D\uDCD6', prompt: 'language, oral traditions, proverbs, and storytelling' },
    { id: 'family', label: 'Family & Community', emoji: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66', prompt: 'family structures, community relationships, and social bonds' },
    { id: 'nature', label: 'Relationship with Nature', emoji: '\uD83C\uDF3F', prompt: 'relationship with the natural world, land, animals, and seasons' },
    { id: 'resilience', label: 'Resilience & History', emoji: '\uD83D\uDCAA', prompt: 'how this culture has survived challenges, adapted, and maintained identity through history' },
  ];

  // ── World Map Region Data (highlights per region) ──
  var WORLD_MAP_DATA = {
    americas: {
      label: 'The Americas', emoji: '\uD83C\uDF0E',
      highlights: [
        { name: 'Brazil', greeting: 'Ol\u00e1 (oh-LAH)', food: 'Feijoada \u2014 black bean stew with pork', music: 'Samba and Capoeira dance', festival: 'Carnival (Rio de Janeiro)', funFact: 'Brazil has the most biodiversity of any country on Earth.' },
        { name: 'Mexico', greeting: '\u00a1Hola! (OH-lah)', food: 'Tamales \u2014 corn dough steamed in husks', music: 'Mariachi bands with trumpets and guitars', festival: 'D\u00eda de los Muertos (Day of the Dead)', funFact: 'Mexico City was built on top of the Aztec capital Tenochtitl\u00e1n.' },
        { name: 'Peru', greeting: 'Allianchu (ah-yahn-CHOO, Quechua)', food: 'Ceviche \u2014 fresh fish cured in citrus', music: 'Huayno folk music with pan flutes', festival: 'Inti Raymi (Festival of the Sun)', funFact: 'Machu Picchu was built without mortar \u2014 stones fit together like a puzzle.' },
        { name: 'Canada (Indigenous)', greeting: 'Aaniin (ah-NEEN, Ojibwe)', food: 'Bannock bread and wild game', music: 'Pow Wow drum circles and regalia dancing', festival: 'National Indigenous Peoples Day', funFact: 'There are over 70 distinct Indigenous languages still spoken in Canada.' },
        { name: 'Jamaica', greeting: 'Wah gwaan (wah GWAHN)', food: 'Jerk chicken with Scotch bonnet peppers', music: 'Reggae music \u2014 Bob Marley put it on the world stage', festival: 'Junkanoo street parade', funFact: 'Jamaica was the first Caribbean country to gain independence in 1962.' }
      ]
    },
    europe: {
      label: 'Europe', emoji: '\uD83C\uDFF0',
      highlights: [
        { name: 'Italy', greeting: 'Ciao (CHOW)', food: 'Pasta al pomodoro \u2014 tomato pasta', music: 'Opera originated in Italy around 1600', festival: 'Carnevale di Venezia (Venice Carnival)', funFact: 'Italy has more UNESCO World Heritage Sites than any other country.' },
        { name: 'Ireland', greeting: 'Dia dhuit (JEE-ah gwit)', food: 'Soda bread and Irish stew', music: 'Celtic fiddle and tin whistle music', festival: 'St. Patrick\'s Day (Lá Fhéile Pádraig)', funFact: 'The Irish language (Gaeilge) is one of the oldest written languages in Europe.' },
        { name: 'Greece', greeting: 'Yia sou (YAH-soo)', food: 'Moussaka \u2014 eggplant and lamb casserole', music: 'Sirtaki and Zebekiko folk dancing', festival: 'Apokries (Greek Carnival)', funFact: 'Ancient Greeks invented the Olympic Games in 776 BCE.' },
        { name: 'Norway', greeting: 'Hei (HEY)', food: 'Lutefisk \u2014 aged whitefish', music: 'Hardanger fiddle with sympathetic strings', festival: 'Syttende Mai (Constitution Day, May 17)', funFact: 'Norway has more fjords than any other country.' },
        { name: 'Romania', greeting: 'Bun\u0103 ziua (BOO-nah ZEE-wah)', food: 'Sarmale \u2014 cabbage rolls with meat and rice', music: 'Hora circle dance at weddings', festival: 'Martisor \u2014 spring celebration on March 1', funFact: 'The Carpathian Mountains shelter Europe\'s largest remaining old-growth forests.' }
      ]
    },
    africa: {
      label: 'Africa', emoji: '\uD83C\uDF0D',
      highlights: [
        { name: 'Kenya', greeting: 'Jambo (JAHM-boh, Swahili)', food: 'Ugali \u2014 cornmeal staple served with sukuma wiki greens', music: 'Benga music blending Luo and pop rhythms', festival: 'Madaraka Day celebrating self-governance', funFact: 'Kenya is home to the Great Rift Valley, visible from space.' },
        { name: 'Nigeria', greeting: 'Bawo ni (BAH-woh nee, Yoruba)', food: 'Jollof rice \u2014 spiced tomato rice loved across West Africa', music: 'Afrobeats \u2014 global music genre born in Lagos', festival: 'Eyo Festival with masquerade processions', funFact: 'Nigeria has over 500 distinct languages \u2014 more than almost any other country.' },
        { name: 'Ethiopia', greeting: 'Selam (seh-LAHM)', food: 'Injera \u2014 spongy flatbread eaten with stews', music: 'Eskista shoulder-shaking dance', festival: 'Timkat (Epiphany celebration)', funFact: 'Ethiopia follows its own calendar with 13 months and is roughly 7 years behind the Gregorian calendar.' },
        { name: 'South Africa', greeting: 'Sawubona (sah-woo-BOH-nah, Zulu)', food: 'Braai \u2014 outdoor barbecue tradition', music: 'Isicathamiya choral singing (Ladysmith Black Mambazo)', festival: 'Heritage Day, September 24', funFact: 'South Africa has 12 official languages \u2014 the most of any country.' },
        { name: 'Morocco', greeting: 'Salam (sah-LAHM)', food: 'Tagine \u2014 slow-cooked stew in a cone-shaped pot', music: 'Gnawa music with spiritual rhythms', festival: 'Eid al-Fitr celebrating the end of Ramadan', funFact: 'The oldest university in the world, al-Qarawiyyin, was founded in Fez in 859 CE.' }
      ]
    },
    asia: {
      label: 'Asia', emoji: '\uD83C\uDF0F',
      highlights: [
        { name: 'Japan', greeting: 'Konnichiwa (koh-NEE-chee-wah)', food: 'Sushi \u2014 vinegared rice with fish or vegetables', music: 'Taiko drumming with giant drums', festival: 'Hanami \u2014 cherry blossom viewing in spring', funFact: 'Japan has over 6,800 islands and the world\'s oldest known company (founded 578 CE).' },
        { name: 'India', greeting: 'Namaste (nah-mah-STAY)', food: 'Biryani \u2014 fragrant rice with spices and meat or vegetables', music: 'Classical Bharatanatyam dance', festival: 'Diwali \u2014 Festival of Lights', funFact: 'India has 22 officially recognized languages and over 1,600 spoken languages.' },
        { name: 'South Korea', greeting: 'Annyeonghaseyo (ahn-nyung-hah-SAY-yo)', food: 'Kimchi \u2014 fermented vegetables eaten at every meal', music: 'Pansori epic storytelling through song', festival: 'Chuseok \u2014 harvest moon festival', funFact: 'South Korea\'s alphabet, Hangul, was scientifically designed by King Sejong in 1443.' },
        { name: 'Vietnam', greeting: 'Xin ch\u00e0o (sin CHOW)', food: 'Pho \u2014 aromatic noodle soup', music: 'Water puppet theater (M\u00faa r\u1ed1i n\u01b0\u1edbc)', festival: 'T\u1ebft Nguy\u00ean \u0110\u00e1n \u2014 Lunar New Year', funFact: 'Ha Long Bay has nearly 2,000 limestone islands and caves.' },
        { name: 'Philippines', greeting: 'Mabuhay (mah-BOO-hi)', food: 'Adobo \u2014 meat braised in vinegar, soy sauce, and garlic', music: 'Tinikling bamboo dance', festival: 'Sinulog \u2014 massive street dance festival in Cebu', funFact: 'The Philippines is made up of 7,641 islands.' }
      ]
    },
    middleeast: {
      label: 'Middle East', emoji: '\uD83D\uDD4C',
      highlights: [
        { name: 'Turkey', greeting: 'Merhaba (MEHR-hah-bah)', food: 'Baklava \u2014 sweet pastry with nuts and honey', music: 'Sufi whirling dervish ceremonies', festival: 'Republic Day (October 29)', funFact: 'Istanbul is the only city in the world that sits on two continents.' },
        { name: 'Iran', greeting: 'Sal\u0101m (sah-LAHM)', food: 'Chelo kabab \u2014 saffron rice with grilled meat', music: 'Tar and setar string instruments', festival: 'Nowruz \u2014 Persian New Year at the spring equinox', funFact: 'Iran\'s civilization dates back over 7,000 years, making it one of the oldest in the world.' },
        { name: 'Egypt', greeting: 'Ahlan (AH-lan)', food: 'Koshari \u2014 lentils, rice, pasta, and tomato sauce', music: 'Raqs sharqi (classical Egyptian dance)', festival: 'Sham el-Nessim \u2014 spring celebration dating back to ancient Egypt', funFact: 'The Great Pyramid of Giza was the tallest structure on Earth for over 3,800 years.' },
        { name: 'Lebanon', greeting: 'Marhaba (MAR-hah-bah)', food: 'Mezze \u2014 shared plates of hummus, tabbouleh, and more', music: 'Dabke \u2014 line dance performed at celebrations', festival: 'Baalbeck International Festival in ancient Roman ruins', funFact: 'Lebanon is home to some of the oldest continuously inhabited cities in the world.' }
      ]
    },
    oceania: {
      label: 'Oceania', emoji: '\uD83C\uDF0A',
      highlights: [
        { name: 'Australia (Aboriginal)', greeting: 'Yaama (YAH-mah, Gamilaraay)', food: 'Bush tucker \u2014 native plants and animals foraged from the land', music: 'Didgeridoo \u2014 one of the oldest instruments on Earth', festival: 'NAIDOC Week celebrating Indigenous culture', funFact: 'Aboriginal Australians have the oldest continuous culture on Earth \u2014 over 65,000 years.' },
        { name: 'New Zealand (M\u0101ori)', greeting: 'Kia ora (kee-ah OH-rah)', food: 'H\u0101ngi \u2014 food cooked in an earth oven', music: 'Haka \u2014 ceremonial war dance and chant', festival: 'Matariki \u2014 M\u0101ori New Year (Pleiades star cluster rising)', funFact: 'M\u0101ori navigators crossed thousands of miles of open Pacific using stars and ocean currents.' },
        { name: 'Hawaii', greeting: 'Aloha (ah-LOH-hah)', food: 'Poi \u2014 taro root paste, a sacred staple', music: 'Slack-key guitar and hula dancing', festival: 'Merrie Monarch Festival (hula competition)', funFact: 'Hawaiian has only 13 letters in its alphabet (8 consonants and 5 vowels).' },
        { name: 'Samoa', greeting: 'Talofa (tah-LOH-fah)', food: 'Oka \u2014 raw fish in coconut cream', music: 'Siva dance with graceful arm movements', festival: 'Teuila Festival \u2014 week-long cultural celebration', funFact: 'Samoan tattooing (tatau) is one of the oldest continuous tattoo traditions in the world.' }
      ]
    }
  };

  // ── Language Corner Data (15+ languages) ──
  var LANGUAGE_DATA = [
    { language: 'Spanish', hello: '\u00a1Hola!', thanks: 'Gracias', friend: 'Amigo/Amiga', pronunciation: 'OH-lah / GRAH-see-ahs / ah-MEE-goh' },
    { language: 'Mandarin Chinese', hello: 'N\u01d0 h\u01ceo', thanks: 'Xi\u00e8xi\u00e8', friend: 'P\u00e9ngy\u01d2u', pronunciation: 'nee HOW / shyeh-shyeh / PUHNG-yoh' },
    { language: 'Arabic', hello: 'As-sal\u0101mu \u02bfalaykum', thanks: 'Shukran', friend: 'Sadiq', pronunciation: 'ahs-sah-LAH-moo ah-LAY-koom / SHOO-krahn / sah-DEEK' },
    { language: 'Hindi', hello: 'Namaste', thanks: 'Dhanyavaad', friend: 'Dost', pronunciation: 'nah-mah-STAY / dhahn-yah-VAHD / DOHST' },
    { language: 'French', hello: 'Bonjour', thanks: 'Merci', friend: 'Ami(e)', pronunciation: 'bohn-ZHOOR / mehr-SEE / ah-MEE' },
    { language: 'Japanese', hello: 'Konnichiwa', thanks: 'Arigatou', friend: 'Tomodachi', pronunciation: 'koh-NEE-chee-wah / ah-ree-GAH-toh / toh-moh-DAH-chee' },
    { language: 'Korean', hello: 'Annyeonghaseyo', thanks: 'Gamsahamnida', friend: 'Chingu', pronunciation: 'ahn-nyung-hah-SAY-yo / kahm-sah-HAHM-nee-dah / CHIN-goo' },
    { language: 'Swahili', hello: 'Jambo', thanks: 'Asante', friend: 'Rafiki', pronunciation: 'JAHM-boh / ah-SAHN-tay / rah-FEE-kee' },
    { language: 'Portuguese', hello: 'Ol\u00e1', thanks: 'Obrigado/a', friend: 'Amigo/Amiga', pronunciation: 'oh-LAH / oh-bree-GAH-doo / ah-MEE-goh' },
    { language: 'Russian', hello: 'Zdravstvuyte', thanks: 'Spasibo', friend: 'Drug', pronunciation: 'ZDRAHST-vooy-tyeh / spah-SEE-bah / DROOG' },
    { language: 'German', hello: 'Hallo', thanks: 'Danke', friend: 'Freund/Freundin', pronunciation: 'HAH-loh / DAHN-kuh / FROYND' },
    { language: 'Italian', hello: 'Ciao', thanks: 'Grazie', friend: 'Amico/Amica', pronunciation: 'CHOW / GRAH-tsee-eh / ah-MEE-koh' },
    { language: 'Turkish', hello: 'Merhaba', thanks: 'Te\u015fekk\u00fcr ederim', friend: 'Arkada\u015f', pronunciation: 'MEHR-hah-bah / teh-sheh-KOOR eh-deh-REEM / ar-kah-DAHSH' },
    { language: 'Tagalog', hello: 'Mabuhay', thanks: 'Salamat', friend: 'Kaibigan', pronunciation: 'mah-BOO-hi / sah-LAH-maht / kai-BEE-gahn' },
    { language: 'Vietnamese', hello: 'Xin ch\u00e0o', thanks: 'C\u1ea3m \u01a1n', friend: 'B\u1ea1n', pronunciation: 'sin CHOW / kahm UHN / BAHN' },
    { language: 'Hawaiian', hello: 'Aloha', thanks: 'Mahalo', friend: 'Hoaaloha', pronunciation: 'ah-LOH-hah / mah-HAH-loh / hoh-ah-ah-LOH-hah' },
    { language: 'Zulu', hello: 'Sawubona', thanks: 'Ngiyabonga', friend: 'Umngane', pronunciation: 'sah-woo-BOH-nah / ngee-yah-BOHN-gah / oom-NGAH-neh' },
    { language: 'Navajo (Din\u00e9)', hello: 'Y\u00e1\u02bc\u00e1t\u02bc\u00e9\u00e9h', thanks: 'Ah\u00e9hee\'', friend: 'Ak\u0027is', pronunciation: 'YAH-ah-tay / ah-HEH-heh / ah-KISS' }
  ];

  // ── Cultural Comparison Topics ──
  var COMPARISON_TOPICS = [
    { id: 'greetings', label: 'Greetings & Etiquette', emoji: '\uD83D\uDC4B' },
    { id: 'family', label: 'Family Structure', emoji: '\uD83C\uDFE0' },
    { id: 'education', label: 'Education', emoji: '\uD83C\uDF93' },
    { id: 'food', label: 'Food Customs', emoji: '\uD83C\uDF7D\uFE0F' },
    { id: 'celebrations', label: 'Celebrations', emoji: '\uD83C\uDF89' },
    { id: 'values', label: 'Core Values', emoji: '\uD83D\uDC96' }
  ];

  // ── Culture Quiz Banks (per grade band) ──
  var QUIZ_BANKS = {
    elementary: [
      { q: 'Which country is famous for cherry blossom viewing called Hanami?', opts: ['China', 'Japan', 'Korea', 'Thailand'], ans: 1 },
      { q: 'What instrument from Australia is one of the oldest in the world?', opts: ['Sitar', 'Didgeridoo', 'Bagpipes', 'Ukulele'], ans: 1 },
      { q: 'Diwali, the Festival of Lights, is celebrated in which country?', opts: ['Egypt', 'Brazil', 'India', 'Japan'], ans: 2 },
      { q: 'What food is a staple in Ethiopia, made from teff flour?', opts: ['Naan', 'Tortilla', 'Injera', 'Pita'], ans: 2 },
      { q: 'The haka is a ceremonial dance from which culture?', opts: ['Hawaiian', 'Samoan', 'M\u0101ori', 'Fijian'], ans: 2 },
      { q: '"Jambo" is a greeting in which language?', opts: ['Swahili', 'Arabic', 'Hindi', 'Tagalog'], ans: 0 },
      { q: 'Which country has more than 7,600 islands?', opts: ['Indonesia', 'Japan', 'Philippines', 'Greece'], ans: 2 },
      { q: 'What is the name of the Mexican holiday honoring loved ones who have passed?', opts: ['Cinco de Mayo', 'D\u00eda de los Muertos', 'Carnival', 'Las Posadas'], ans: 1 },
      { q: 'Kimchi is a traditional food from which country?', opts: ['Japan', 'China', 'Vietnam', 'South Korea'], ans: 3 },
      { q: '"Aloha" is a greeting from which culture?', opts: ['Samoan', 'M\u0101ori', 'Hawaiian', 'Tongan'], ans: 2 }
    ],
    middle: [
      { q: 'Nowruz, celebrated at the spring equinox, is the New Year of which culture?', opts: ['Turkish', 'Persian/Iranian', 'Egyptian', 'Indian'], ans: 1 },
      { q: 'Which African country uses a calendar with 13 months?', opts: ['Nigeria', 'South Africa', 'Ethiopia', 'Kenya'], ans: 2 },
      { q: 'The Hangul alphabet was scientifically designed by a king of which country?', opts: ['Japan', 'China', 'South Korea', 'Vietnam'], ans: 2 },
      { q: 'Which city is the only one that sits on two continents?', opts: ['Cairo', 'Istanbul', 'Moscow', 'Dubai'], ans: 1 },
      { q: 'Gnawa music with spiritual rhythms originates in which country?', opts: ['Turkey', 'Lebanon', 'Morocco', 'Iran'], ans: 2 },
      { q: 'Which culture is known for tatau, one of the oldest tattoo traditions?', opts: ['Japanese', 'M\u0101ori', 'Samoan', 'Celtic'], ans: 2 },
      { q: 'Al-Qarawiyyin, the world\'s oldest university, is in which city?', opts: ['Baghdad', 'Cairo', 'Fez', 'Damascus'], ans: 2 },
      { q: 'Afrobeats is a global music genre that originated in which city?', opts: ['Nairobi', 'Lagos', 'Accra', 'Johannesburg'], ans: 1 },
      { q: 'How many official languages does South Africa have?', opts: ['4', '7', '12', '3'], ans: 2 },
      { q: 'The Great Pyramid was the tallest structure on Earth for approximately how many years?', opts: ['1,000', '2,500', '3,800', '5,000'], ans: 2 }
    ],
    high: [
      { q: 'Aboriginal Australians have maintained continuous culture for approximately how long?', opts: ['10,000 years', '25,000 years', '45,000 years', '65,000+ years'], ans: 3 },
      { q: 'The Haudenosaunee (Iroquois) Confederacy influenced which major document?', opts: ['Magna Carta', 'U.S. Constitution', 'UN Charter', 'Treaty of Westphalia'], ans: 1 },
      { q: 'Capoeira, a martial art disguised as dance, originated among which group?', opts: ['Indigenous Brazilians', 'Enslaved Africans in Brazil', 'Portuguese colonists', 'Japanese immigrants'], ans: 1 },
      { q: 'Which empire had the largest contiguous land territory in history?', opts: ['Roman Empire', 'British Empire', 'Mongol Empire', 'Ottoman Empire'], ans: 2 },
      { q: 'The concept of "ubuntu" (I am because we are) comes from which cultural tradition?', opts: ['Hindu philosophy', 'Confucianism', 'Southern African philosophy', 'Sufi tradition'], ans: 2 },
      { q: 'Which ancient trade route connected East Asia to the Mediterranean for over 1,500 years?', opts: ['Spice Route', 'Silk Road', 'Trans-Saharan Route', 'Amber Road'], ans: 1 },
      { q: 'The Rosetta Stone allowed scholars to decipher which ancient writing system?', opts: ['Cuneiform', 'Egyptian hieroglyphs', 'Sanskrit', 'Linear B'], ans: 1 },
      { q: 'Which Pacific Island culture navigated thousands of miles using stars and wave patterns?', opts: ['Japanese', 'Filipino', 'Polynesian', 'Melanesian'], ans: 2 },
      { q: 'Griot oral historians are central to the cultural traditions of which region?', opts: ['East Asia', 'West Africa', 'South America', 'Scandinavia'], ans: 1 },
      { q: 'The concept of "wabi-sabi" (beauty in imperfection) originates from which culture?', opts: ['Korean', 'Chinese', 'Japanese', 'Vietnamese'], ans: 2 }
    ]
  };

  // ── Journal Prompts ──
  var JOURNAL_PROMPTS = [
    { id: 'tradition', prompt: 'A cultural tradition I want to learn more about...', emoji: '\uD83C\uDF1F' },
    { id: 'appreciate', prompt: 'Something I appreciate about a culture different from mine...', emoji: '\uD83D\uDC9B' },
    { id: 'perspective', prompt: 'How has learning about other cultures changed my perspective?', emoji: '\uD83D\uDD2E' },
    { id: 'connection', prompt: 'A connection I found between two different cultures...', emoji: '\uD83E\uDD1D' },
    { id: 'food', prompt: 'A food from another culture I would love to try (or have tried)...', emoji: '\uD83C\uDF7D\uFE0F' },
    { id: 'language', prompt: 'A word or phrase from another language that I love...', emoji: '\uD83D\uDCAC' }
  ];

  // ── Badges ──
  var BADGES = [
    { id: 'world_traveler', label: 'World Traveler', emoji: '\u2708\uFE0F', desc: 'Explore all 6 world map regions', check: function(d) { return (d.mapRegionsVisited || []).length >= 6; } },
    { id: 'language_learner', label: 'Language Learner', emoji: '\uD83D\uDDE3\uFE0F', desc: 'Practice greetings in 8+ languages', check: function(d) { return (d.langPracticed || []).length >= 8; } },
    { id: 'culture_connector', label: 'Culture Connector', emoji: '\uD83E\uDD1D', desc: 'Complete 3 cultural comparisons', check: function(d) { return (d.comparisonsCompleted || 0) >= 3; } },
    { id: 'comparison_expert', label: 'Comparison Expert', emoji: '\uD83D\uDD0D', desc: 'Complete 6 cultural comparisons', check: function(d) { return (d.comparisonsCompleted || 0) >= 6; } },
    { id: 'global_citizen', label: 'Global Citizen', emoji: '\uD83C\uDF0D', desc: 'Explore 10+ cultures with AI deep dives', check: function(d) { return (d.explored || []).length >= 10; } },
    { id: 'quiz_master', label: 'Quiz Master', emoji: '\uD83C\uDFC6', desc: 'Score 80%+ on the Culture Quiz', check: function(d) { return d.quizBestScore >= 8; } },
    { id: 'journal_writer', label: 'Journal Writer', emoji: '\uD83D\uDCD3', desc: 'Complete 3 journal reflections', check: function(d) { return (d.journalCount || 0) >= 3; } },
    { id: 'deep_diver', label: 'Deep Diver', emoji: '\uD83E\uDD3F', desc: 'Ask 10+ follow-up questions about cultures', check: function(d) { return (d.questionsAsked || 0) >= 10; } },
    { id: 'polyglot_starter', label: 'Polyglot Starter', emoji: '\uD83C\uDDFA\uD83C\uDDF3', desc: 'Win the language matching game', check: function(d) { return d.langMatchWon; } },
    { id: 'appreciation_pro', label: 'Appreciation Pro', emoji: '\uD83C\uDF1F', desc: 'Complete all 6 journal prompts', check: function(d) { return (d.journalPromptsCompleted || []).length >= 6; } }
  ];

  // ── Helper: shuffle array (Fisher-Yates) ──
  function shuffleArray(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ── Registration ──

  window.SelHub.registerTool('cultureExplorer', {
    icon: '\uD83C\uDF0D',
    label: 'Culture Explorer',
    desc: 'Take AI-powered deep dives into world cultures. Discover traditions, art, values, and stories with illustrations and audio.',
    color: 'cyan',
    category: 'social-awareness',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var d = (ctx.toolData && ctx.toolData['cultureExplorer']) || {};
      var upd = function(key, val) { ctx.update('cultureExplorer', key, val); };
      var updMulti = function(obj) { ctx.updateMulti('cultureExplorer', obj); };
      var ArrowLeft = ctx.icons.ArrowLeft;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var callImagen = ctx.callImagen;
      var gradeLevel = ctx.gradeLevel;
      var gradeBand = ctx.gradeBand || 'elementary';

      var tab = d.tab || 'choose';
      var selectedCulture = d.culture || null;
      var selectedAspect = d.aspect || null;
      var cultureData = d.cultureData || null;
      var cultureImage = d.cultureImage || null;
      var aiLoading = d.aiLoading || false;
      var imageLoading = d.imageLoading || false;
      var exploredCultures = d.explored || [];
      var customCulture = d.customCulture || '';
      var greeting = d.greeting || null;
      var questionsAsked = d.questionsAsked || 0;

      // World Map state
      var mapRegion = d.mapRegion || null;
      var mapRegionsVisited = d.mapRegionsVisited || [];

      // Language Corner state
      var langPracticed = d.langPracticed || [];
      var langMatchActive = d.langMatchActive || false;
      var langMatchPairs = d.langMatchPairs || [];
      var langMatchSelected = d.langMatchSelected || null;
      var langMatchMatched = d.langMatchMatched || [];
      var langMatchWon = d.langMatchWon || false;

      // Comparison state
      var compCulture1 = d.compCulture1 || '';
      var compCulture2 = d.compCulture2 || '';
      var compTopic = d.compTopic || 'greetings';
      var compResult = d.compResult || null;
      var comparisonsCompleted = d.comparisonsCompleted || 0;

      // Journal state
      var journalEntries = d.journalEntries || {};
      var journalCount = d.journalCount || 0;
      var journalPromptsCompleted = d.journalPromptsCompleted || [];

      // Quiz state
      var quizActive = d.quizActive || false;
      var quizQuestions = d.quizQuestions || [];
      var quizIndex = d.quizIndex || 0;
      var quizScore = d.quizScore || 0;
      var quizAnswer = d.quizAnswer;
      var quizDone = d.quizDone || false;
      var quizBestScore = d.quizBestScore || 0;

      // ── Badge checker ──
      var checkBadges = function(newData) {
        var merged = {};
        var k;
        for (k in d) { if (d.hasOwnProperty(k)) merged[k] = d[k]; }
        for (k in newData) { if (newData.hasOwnProperty(k)) merged[k] = newData[k]; }
        var earned = d.badgesEarned || [];
        var newBadges = [];
        BADGES.forEach(function(badge) {
          if (earned.indexOf(badge.id) < 0 && badge.check(merged)) {
            newBadges.push(badge.id);
          }
        });
        if (newBadges.length > 0) {
          var allEarned = earned.concat(newBadges);
          upd('badgesEarned', allEarned);
          newBadges.forEach(function(bid) {
            var b = BADGES.find(function(x) { return x.id === bid; });
            if (b) {
              addToast('Badge earned: ' + b.emoji + ' ' + b.label + '!', 'success');
              ctx.awardXP(15);
              if (ctx.celebrate) ctx.celebrate();
            }
          });
        }
      };

      // ── Explore a culture + aspect ──
      var exploreCulture = function(culture, aspect) {
        if (!callGemini) return;
        updMulti({ aiLoading: true, cultureData: null, cultureImage: null, greeting: null });

        var aspectInfo = EXPLORE_ASPECTS.find(function(a) { return a.id === aspect; }) || EXPLORE_ASPECTS[0];

        var prompt = 'You are a knowledgeable, respectful cultural educator teaching a ' + (gradeLevel || '5th grade') + ' student about ' + culture + '.\n\n' +
          'Focus on: ' + aspectInfo.prompt + '.\n\n' +
          'IMPORTANT GUIDELINES:\n' +
          '- Show diversity WITHIN this culture \u2014 avoid monolithic descriptions\n' +
          '- Distinguish between historical and contemporary practices\n' +
          '- Note when practices vary by region, family, or individual\n' +
          '- Use respectful, accurate terminology (use names people call themselves)\n' +
          '- Include voices and perspectives from people within this culture when possible\n' +
          '- Acknowledge if you are simplifying complex realities\n' +
          '- If the culture has experienced oppression, acknowledge it honestly without centering the oppressor\n\n' +
          'Return ONLY JSON:\n' +
          '{\n' +
          '  "title": "Culture Name \u2014 Aspect Title",\n' +
          '  "greeting": "A greeting in the culture\'s primary language with pronunciation guide",\n' +
          '  "overview": "2-3 paragraph overview of this aspect of the culture",\n' +
          '  "keyFacts": ["Fact 1", "Fact 2", "Fact 3", "Fact 4", "Fact 5"],\n' +
          '  "voices": "A quote or saying from someone within this culture (attributed)",\n' +
          '  "reflection": "A thoughtful question connecting this culture to the student\'s own experience",\n' +
          '  "imagePrompt": "A respectful, detailed image prompt depicting a beautiful scene related to this cultural aspect. NO text, NO stereotypes, NO caricatures. Focus on art, landscape, architecture, or daily life.",\n' +
          '  "learnMore": "One book, film, or resource by someone from this culture that the student could explore"\n' +
          '}';

        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var data = JSON.parse(cleaned);
            var newExplored = exploredCultures.indexOf(culture) < 0 ? exploredCultures.concat([culture]) : exploredCultures;
            updMulti({ cultureData: data, aiLoading: false, explored: newExplored, greeting: data.greeting, questionsAsked: questionsAsked + 1 });
            ctx.awardXP(8);
            checkBadges({ explored: newExplored, questionsAsked: questionsAsked + 1 });

            // Generate illustration
            if (callImagen && data.imagePrompt) {
              upd('imageLoading', true);
              var safePrompt = data.imagePrompt + ' Respectful, accurate, beautiful illustration. NO text, NO labels, NO stereotypes. Fine art quality, warm lighting.';
              callImagen(safePrompt, 400, 0.8).then(function(img) {
                updMulti({ cultureImage: img, imageLoading: false });
              }).catch(function() { upd('imageLoading', false); });
            }
          } catch(e) {
            console.warn('Culture data parse failed', e);
            upd('aiLoading', false);
            addToast('Could not load culture data \u2014 try again', 'error');
          }
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Ask a follow-up question ──
      var askFollowUp = function(question) {
        if (!callGemini || !question) return;
        upd('aiLoading', true);
        var prompt = 'A ' + (gradeLevel || '5th grade') + ' student is learning about ' + selectedCulture + '. They ask: "' + question + '"\n\n' +
          'Answer respectfully and accurately in 2-3 paragraphs. Acknowledge complexity. ' +
          'If the question touches on sensitive topics, address them honestly and age-appropriately. ' +
          'End with a follow-up question to deepen their thinking.';
        callGemini(prompt).then(function(resp) {
          var newQ = questionsAsked + 1;
          updMulti({ followUpAnswer: resp, aiLoading: false, questionsAsked: newQ });
          ctx.awardXP(5);
          checkBadges({ questionsAsked: newQ });
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Cultural Comparison ──
      var runComparison = function() {
        if (!callGemini || !compCulture1.trim() || !compCulture2.trim()) return;
        updMulti({ aiLoading: true, compResult: null });
        var topicObj = COMPARISON_TOPICS.find(function(t) { return t.id === compTopic; }) || COMPARISON_TOPICS[0];
        var depth = gradeBand === 'high' ? 'Provide historically grounded analysis with nuance.'
          : gradeBand === 'middle' ? 'Provide cultural context and explain why differences exist.'
          : 'Use fun, simple language a young student can understand.';
        var prompt = 'You are a respectful cultural educator. Compare ' + compCulture1.trim() + ' and ' + compCulture2.trim() + ' on the topic of: ' + topicObj.label + '.\n\n' +
          depth + '\n\n' +
          'Return ONLY JSON:\n' +
          '{\n' +
          '  "culture1Name": "' + compCulture1.trim() + '",\n' +
          '  "culture2Name": "' + compCulture2.trim() + '",\n' +
          '  "topic": "' + topicObj.label + '",\n' +
          '  "culture1Points": ["Unique point 1", "Unique point 2", "Unique point 3"],\n' +
          '  "culture2Points": ["Unique point 1", "Unique point 2", "Unique point 3"],\n' +
          '  "similarities": ["Shared trait 1", "Shared trait 2", "Shared trait 3"],\n' +
          '  "insight": "A thoughtful observation about what this comparison reveals",\n' +
          '  "reflection": "A question for the student to think about"\n' +
          '}';
        callGemini(prompt, true).then(function(resp) {
          try {
            var cleaned = resp.trim();
            if (cleaned.indexOf('```') !== -1) { var parts = cleaned.split('```'); cleaned = parts[1] || parts[0]; if (cleaned.indexOf('\n') !== -1) cleaned = cleaned.split('\n').slice(1).join('\n'); if (cleaned.lastIndexOf('```') !== -1) cleaned = cleaned.substring(0, cleaned.lastIndexOf('```')); }
            var result = JSON.parse(cleaned);
            var newCount = comparisonsCompleted + 1;
            updMulti({ compResult: result, aiLoading: false, comparisonsCompleted: newCount });
            ctx.awardXP(10);
            checkBadges({ comparisonsCompleted: newCount });
          } catch(e) {
            upd('aiLoading', false);
            addToast('Could not generate comparison \u2014 try again', 'error');
          }
        }).catch(function() { upd('aiLoading', false); });
      };

      // ── Start Language Match Game ──
      var startLangMatch = function() {
        var subset = shuffleArray(LANGUAGE_DATA).slice(0, 6);
        var cards = [];
        subset.forEach(function(lang) {
          cards.push({ id: lang.language + '_lang', type: 'language', text: lang.language, match: lang.language });
          cards.push({ id: lang.language + '_hello', type: 'greeting', text: lang.hello, match: lang.language });
        });
        cards = shuffleArray(cards);
        updMulti({ langMatchActive: true, langMatchPairs: cards, langMatchSelected: null, langMatchMatched: [], langMatchWon: false });
      };

      // ── Handle Language Match Selection ──
      var handleLangMatchSelect = function(card) {
        if (langMatchMatched.indexOf(card.match + '_done') >= 0) return;
        if (langMatchSelected && langMatchSelected.id === card.id) {
          upd('langMatchSelected', null);
          return;
        }
        if (!langMatchSelected) {
          upd('langMatchSelected', card);
          return;
        }
        // Check match
        if (langMatchSelected.match === card.match && langMatchSelected.type !== card.type) {
          var newMatched = langMatchMatched.concat([card.match + '_done']);
          var won = newMatched.length >= 6;
          updMulti({ langMatchMatched: newMatched, langMatchSelected: null, langMatchWon: won });
          addToast('Match! ' + card.match, 'success');
          ctx.awardXP(3);
          if (won) {
            addToast('You matched all the greetings!', 'success');
            ctx.awardXP(10);
            if (ctx.celebrate) ctx.celebrate();
            checkBadges({ langMatchWon: true });
          }
        } else {
          upd('langMatchSelected', null);
          addToast('Not a match \u2014 try again!', 'info');
        }
      };

      // ── Start Quiz ──
      var startQuiz = function() {
        var bank = QUIZ_BANKS[gradeBand] || QUIZ_BANKS.elementary;
        var questions = shuffleArray(bank).slice(0, 10);
        updMulti({ quizActive: true, quizQuestions: questions, quizIndex: 0, quizScore: 0, quizAnswer: undefined, quizDone: false });
      };

      // ── Handle Quiz Answer ──
      var handleQuizAnswer = function(optIndex) {
        if (quizAnswer !== undefined) return;
        var current = quizQuestions[quizIndex];
        var correct = optIndex === current.ans;
        var newScore = correct ? quizScore + 1 : quizScore;
        upd('quizAnswer', optIndex);
        if (correct) {
          ctx.awardXP(3);
          addToast('Correct!', 'success');
        } else {
          addToast('The answer was: ' + current.opts[current.ans], 'info');
        }
        // Auto-advance after delay via state
        updMulti({ quizAnswer: optIndex, quizScore: newScore });
      };

      // ── Next Quiz Question ──
      var nextQuizQuestion = function() {
        var nextIdx = quizIndex + 1;
        if (nextIdx >= quizQuestions.length) {
          var best = Math.max(quizBestScore, quizScore);
          updMulti({ quizDone: true, quizBestScore: best, quizAnswer: undefined });
          checkBadges({ quizBestScore: best });
        } else {
          updMulti({ quizIndex: nextIdx, quizAnswer: undefined });
        }
      };

      // ═══ RENDER ═══
      var badgesEarned = d.badgesEarned || [];

      return h('div', { className: 'space-y-4 animate-in fade-in duration-200' },

        // Header
        h('div', { className: 'flex items-center gap-3' },
          h('button', Object.assign({ className: 'p-2 rounded-full hover:bg-cyan-100 text-cyan-600 transition-colors' }, ctx.a11yClick(function() { ctx.setSelHubTool(null); })), h(ArrowLeft, { size: 20 })),
          h('div', { className: 'flex-1' },
            h('h2', { className: 'text-xl font-black text-slate-800' }, '\uD83C\uDF0D Culture Explorer'),
            h('p', { className: 'text-xs text-slate-500' }, 'Every culture holds wisdom. What will you discover?')
          ),
          exploredCultures.length > 0 && h('span', { className: 'bg-cyan-100 text-cyan-700 px-3 py-1 rounded-full text-xs font-bold' }, exploredCultures.length + ' explored')
        ),

        // Tabs (expanded)
        h('div', { className: 'flex flex-wrap gap-1 bg-cyan-50 rounded-xl p-1 border border-cyan-200' },
          [
            { id: 'choose', label: '\uD83D\uDDFA\uFE0F Cultures' },
            { id: 'worldmap', label: '\uD83C\uDF0E World Map' },
            { id: 'language', label: '\uD83D\uDDE3\uFE0F Languages' },
            { id: 'compare', label: '\uD83D\uDD0D Compare' },
            { id: 'explore', label: '\uD83D\uDD2C Explore' },
            { id: 'quiz', label: '\uD83C\uDFC6 Quiz' },
            { id: 'journal', label: '\uD83D\uDCD3 Journal' },
            { id: 'badges', label: '\uD83C\uDFC5 Badges' }
          ].map(function(t) {
            return h('button', { key: t.id, onClick: function() { upd('tab', t.id); },
              className: 'flex-1 min-w-[70px] px-2 py-2 rounded-lg text-[10px] font-bold transition-all ' + (tab === t.id ? 'bg-white text-cyan-700 shadow-sm' : 'text-cyan-600/60 hover:text-cyan-700')
            }, t.label);
          })
        ),

        // ═══ CHOOSE CULTURE ═══
        tab === 'choose' && h('div', { className: 'space-y-4' },

          // Important framing
          h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-3 text-center' },
            h('p', { className: 'text-xs text-amber-800 leading-relaxed' },
              '\uD83C\uDF31 Remember: Every culture is complex and diverse. What you learn here is an introduction, not a complete picture. ',
              'People within any culture are individuals with their own experiences and perspectives.'
            )
          ),

          // Custom culture search
          h('div', { className: 'bg-white rounded-xl border border-cyan-200 p-4' },
            h('label', { className: 'text-xs font-bold text-cyan-700 block mb-1' }, '\uD83D\uDD0D Search any culture or community:'),
            h('div', { className: 'flex gap-2' },
              h('input', { type: 'text', value: customCulture, onChange: function(e) { upd('customCulture', e.target.value); },
                placeholder: 'e.g., Hmong, Somali diaspora, Deaf culture, Cajun...',
                className: 'flex-1 text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300',
                onKeyDown: function(e) { if (e.key === 'Enter' && customCulture.trim()) { updMulti({ culture: customCulture.trim(), tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(customCulture.trim(), 'traditions'); } },
                'aria-label': 'Search for a culture'
              }),
              h('button', { onClick: function() { if (customCulture.trim()) { updMulti({ culture: customCulture.trim(), tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(customCulture.trim(), 'traditions'); } },
                disabled: !customCulture.trim(),
                className: 'px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 disabled:opacity-40 transition-colors'
              }, 'Explore')
            )
          ),

          // Region grid
          REGIONS.map(function(region) {
            return h('div', { key: region.id, className: 'bg-white rounded-2xl border border-slate-200 overflow-hidden' },
              h('div', { className: 'px-4 py-3 bg-gradient-to-r from-cyan-50 to-teal-50 border-b border-slate-200' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, region.emoji, ' ', region.label)
              ),
              h('div', { className: 'p-3 flex flex-wrap gap-2' },
                region.cultures.map(function(culture) {
                  var isExplored = exploredCultures.indexOf(culture) >= 0;
                  return h('button', { key: culture,
                    onClick: function() { updMulti({ culture: culture, tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(culture, 'traditions'); },
                    className: 'px-3 py-1.5 rounded-full text-xs font-bold border transition-all hover:scale-105 ' +
                      (isExplored ? 'bg-cyan-100 border-cyan-300 text-cyan-700' : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300 hover:bg-cyan-50')
                  }, (isExplored ? '\u2713 ' : '') + culture);
                })
              )
            );
          })
        ),

        // ═══ WORLD MAP EXPLORER ═══
        tab === 'worldmap' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDF0E World Map Explorer'),
            h('p', { className: 'text-sm text-slate-500' }, 'Select a region to discover cultural highlights from around the world')
          ),

          // Region selector grid
          !mapRegion && h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 gap-3' },
            Object.keys(WORLD_MAP_DATA).map(function(key) {
              var reg = WORLD_MAP_DATA[key];
              var visited = mapRegionsVisited.indexOf(key) >= 0;
              return h('button', { key: key, onClick: function() {
                  var newVisited = mapRegionsVisited.indexOf(key) < 0 ? mapRegionsVisited.concat([key]) : mapRegionsVisited;
                  updMulti({ mapRegion: key, mapRegionsVisited: newVisited });
                  ctx.awardXP(3);
                  checkBadges({ mapRegionsVisited: newVisited });
                },
                className: 'bg-white rounded-2xl border-2 p-4 text-center transition-all hover:scale-105 hover:shadow-md ' +
                  (visited ? 'border-cyan-400 bg-cyan-50' : 'border-slate-200')
              },
                h('div', { className: 'text-3xl mb-2' }, reg.emoji),
                h('div', { className: 'text-sm font-bold text-slate-800' }, reg.label),
                visited && h('div', { className: 'text-[10px] text-cyan-600 font-bold mt-1' }, '\u2713 Visited')
              );
            })
          ),

          // Region detail view
          mapRegion && WORLD_MAP_DATA[mapRegion] && h('div', { className: 'space-y-4' },
            h('button', { onClick: function() { upd('mapRegion', null); }, className: 'text-xs text-cyan-500 hover:text-cyan-700 font-bold' }, '\u2190 All Regions'),
            h('div', { className: 'bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl border border-cyan-200 p-4 text-center' },
              h('div', { className: 'text-3xl mb-1' }, WORLD_MAP_DATA[mapRegion].emoji),
              h('h3', { className: 'text-lg font-black text-slate-800' }, WORLD_MAP_DATA[mapRegion].label),
              h('p', { className: 'text-xs text-slate-500 mt-1' }, WORLD_MAP_DATA[mapRegion].highlights.length + ' cultural highlights to explore')
            ),

            WORLD_MAP_DATA[mapRegion].highlights.map(function(hl, idx) {
              var depthLabel = gradeBand === 'high' ? 'Historical Significance' : gradeBand === 'middle' ? 'Cultural Context' : 'Fun Fact';
              return h('div', { key: idx, className: 'bg-white rounded-2xl border border-slate-200 overflow-hidden' },
                h('div', { className: 'px-4 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white' },
                  h('h4', { className: 'font-bold' }, hl.name)
                ),
                h('div', { className: 'p-4 space-y-3' },
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-sm shrink-0' }, '\uD83D\uDC4B'),
                    h('div', null,
                      h('span', { className: 'text-[10px] font-bold text-slate-400 uppercase' }, 'Greeting'),
                      h('p', { className: 'text-sm font-bold text-slate-800' }, hl.greeting),
                      callTTS && h('button', { onClick: function() { callTTS(hl.greeting.split('(')[0].trim()); }, className: 'text-[10px] text-cyan-500 hover:text-cyan-700 font-bold' }, '\uD83D\uDD0A Hear it')
                    )
                  ),
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-sm shrink-0' }, '\uD83C\uDF72'),
                    h('div', null,
                      h('span', { className: 'text-[10px] font-bold text-slate-400 uppercase' }, 'Traditional Food'),
                      h('p', { className: 'text-sm text-slate-700' }, hl.food)
                    )
                  ),
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-sm shrink-0' }, '\uD83C\uDFB6'),
                    h('div', null,
                      h('span', { className: 'text-[10px] font-bold text-slate-400 uppercase' }, 'Music & Dance'),
                      h('p', { className: 'text-sm text-slate-700' }, hl.music)
                    )
                  ),
                  h('div', { className: 'flex items-start gap-2' },
                    h('span', { className: 'text-sm shrink-0' }, '\uD83C\uDF89'),
                    h('div', null,
                      h('span', { className: 'text-[10px] font-bold text-slate-400 uppercase' }, 'Festival'),
                      h('p', { className: 'text-sm text-slate-700' }, hl.festival)
                    )
                  ),
                  h('div', { className: 'flex items-start gap-2 bg-amber-50 rounded-lg p-2' },
                    h('span', { className: 'text-sm shrink-0' }, '\u2728'),
                    h('div', null,
                      h('span', { className: 'text-[10px] font-bold text-amber-600 uppercase' }, depthLabel),
                      h('p', { className: 'text-sm text-amber-800' }, hl.funFact)
                    )
                  ),
                  // Deep dive button
                  h('button', { onClick: function() {
                      updMulti({ culture: hl.name, tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null });
                      exploreCulture(hl.name, 'traditions');
                    },
                    className: 'w-full mt-1 px-3 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors'
                  }, '\uD83D\uDD2C AI Deep Dive into ' + hl.name)
                )
              );
            })
          )
        ),

        // ═══ LANGUAGE CORNER ═══
        tab === 'language' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDDE3\uFE0F Language Corner'),
            h('p', { className: 'text-sm text-slate-500' }, 'Learn basic greetings in ' + LANGUAGE_DATA.length + ' languages')
          ),

          // Greeting cards grid
          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            LANGUAGE_DATA.map(function(lang) {
              var practiced = langPracticed.indexOf(lang.language) >= 0;
              return h('div', { key: lang.language, className: 'bg-white rounded-xl border border-slate-200 p-3 ' + (practiced ? 'ring-2 ring-cyan-300' : '') },
                h('div', { className: 'flex items-center justify-between mb-2' },
                  h('span', { className: 'text-sm font-bold text-slate-800' }, lang.language),
                  practiced && h('span', { className: 'text-[10px] bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-bold' }, '\u2713 Practiced')
                ),
                h('div', { className: 'space-y-1' },
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-[10px] font-bold text-slate-400 w-14' }, 'Hello:'),
                    h('span', { className: 'text-sm font-bold text-cyan-700' }, lang.hello)
                  ),
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-[10px] font-bold text-slate-400 w-14' }, 'Thanks:'),
                    h('span', { className: 'text-sm text-slate-700' }, lang.thanks)
                  ),
                  h('div', { className: 'flex items-center gap-2' },
                    h('span', { className: 'text-[10px] font-bold text-slate-400 w-14' }, 'Friend:'),
                    h('span', { className: 'text-sm text-slate-700' }, lang.friend)
                  )
                ),
                h('div', { className: 'mt-2 text-[10px] text-slate-500 italic' }, '\uD83D\uDD09 ' + lang.pronunciation),
                callTTS && h('button', { onClick: function() {
                    callTTS(lang.hello + '. ' + lang.thanks + '. ' + lang.friend);
                    if (langPracticed.indexOf(lang.language) < 0) {
                      var newPracticed = langPracticed.concat([lang.language]);
                      upd('langPracticed', newPracticed);
                      ctx.awardXP(2);
                      checkBadges({ langPracticed: newPracticed });
                    }
                  },
                  className: 'mt-2 w-full px-3 py-1.5 bg-cyan-50 border border-cyan-200 rounded-lg text-xs font-bold text-cyan-700 hover:bg-cyan-100 transition-colors'
                }, '\uD83D\uDD0A Hear Pronunciation')
              );
            })
          ),

          // Language Match Game section
          h('div', { className: 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-indigo-700 mb-1' }, '\uD83C\uDFAE Language Matching Game'),
            h('p', { className: 'text-xs text-indigo-600 mb-3' }, 'Match each greeting to its language! Tap two cards to find pairs.'),

            !langMatchActive && h('button', { onClick: startLangMatch,
              className: 'w-full px-4 py-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors'
            }, '\u25B6 Start Matching Game'),

            langMatchActive && h('div', { className: 'space-y-3' },
              h('div', { className: 'flex justify-between text-xs font-bold' },
                h('span', { className: 'text-indigo-600' }, 'Matched: ' + langMatchMatched.length + '/6'),
                langMatchWon && h('span', { className: 'text-green-600' }, '\u2713 Complete!')
              ),
              h('div', { className: 'grid grid-cols-3 sm:grid-cols-4 gap-2' },
                langMatchPairs.map(function(card) {
                  var isMatched = langMatchMatched.indexOf(card.match + '_done') >= 0;
                  var isSelected = langMatchSelected && langMatchSelected.id === card.id;
                  return h('button', { key: card.id,
                    onClick: function() { if (!isMatched && !langMatchWon) handleLangMatchSelect(card); },
                    disabled: isMatched,
                    className: 'p-2 rounded-lg text-xs font-bold border-2 transition-all min-h-[48px] ' +
                      (isMatched ? 'bg-green-100 border-green-300 text-green-700 opacity-60' :
                       isSelected ? 'bg-indigo-200 border-indigo-500 text-indigo-800 scale-105' :
                       'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50')
                  }, isMatched ? '\u2713 ' + card.text : card.text);
                })
              ),
              (langMatchWon || langMatchMatched.length >= 6) && h('button', { onClick: startLangMatch,
                className: 'w-full mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700'
              }, '\uD83D\uDD04 Play Again')
            )
          ),

          // Practiced count
          langPracticed.length > 0 && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-3 text-center' },
            h('span', { className: 'text-xs font-bold text-cyan-700' }, '\uD83C\uDF1F You\'ve practiced ' + langPracticed.length + ' of ' + LANGUAGE_DATA.length + ' languages!')
          )
        ),

        // ═══ CULTURAL COMPARISON ═══
        tab === 'compare' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDD0D Cultural Comparison'),
            h('p', { className: 'text-sm text-slate-500' }, 'Compare two cultures side by side to discover similarities and differences')
          ),

          // Culture inputs
          h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 space-y-3' },
            h('div', { className: 'grid grid-cols-2 gap-3' },
              h('div', null,
                h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Culture 1'),
                h('input', { type: 'text', value: compCulture1, onChange: function(e) { upd('compCulture1', e.target.value); },
                  placeholder: 'e.g., Japanese', className: 'w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300',
                  'aria-label': 'First culture to compare'
                })
              ),
              h('div', null,
                h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Culture 2'),
                h('input', { type: 'text', value: compCulture2, onChange: function(e) { upd('compCulture2', e.target.value); },
                  placeholder: 'e.g., Mexican', className: 'w-full text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300',
                  'aria-label': 'Second culture to compare'
                })
              )
            ),

            // Topic selector
            h('div', null,
              h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Topic'),
              h('div', { className: 'flex flex-wrap gap-2' },
                COMPARISON_TOPICS.map(function(topic) {
                  return h('button', { key: topic.id, onClick: function() { upd('compTopic', topic.id); },
                    className: 'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ' +
                      (compTopic === topic.id ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300')
                  }, topic.emoji + ' ' + topic.label);
                })
              )
            ),

            // Compare button
            h('button', { onClick: runComparison,
              disabled: aiLoading || !compCulture1.trim() || !compCulture2.trim(),
              className: 'w-full px-4 py-3 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 disabled:opacity-40 transition-colors'
            }, aiLoading ? 'Comparing...' : '\uD83D\uDD0D Compare Cultures')
          ),

          // Loading
          aiLoading && !compResult && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-2xl p-8 text-center' },
            h('div', { className: 'text-3xl mb-2 animate-pulse' }, '\uD83D\uDD0D'),
            h('p', { className: 'text-cyan-700 font-bold' }, 'Analyzing cultural connections...')
          ),

          // Comparison result (Venn diagram style)
          compResult && h('div', { className: 'space-y-4' },
            h('div', { className: 'text-center mb-2' },
              h('h4', { className: 'text-sm font-bold text-slate-800' }, compResult.culture1Name + ' vs. ' + compResult.culture2Name),
              h('p', { className: 'text-xs text-slate-500' }, 'Topic: ' + compResult.topic)
            ),

            // Three-column layout
            h('div', { className: 'grid grid-cols-3 gap-2' },
              // Culture 1 unique
              h('div', { className: 'bg-blue-50 border border-blue-200 rounded-xl p-3' },
                h('h5', { className: 'text-[10px] font-bold text-blue-700 uppercase text-center mb-2' }, compResult.culture1Name),
                (compResult.culture1Points || []).map(function(pt, i) {
                  return h('div', { key: i, className: 'text-xs text-blue-800 mb-1.5 flex items-start gap-1' },
                    h('span', { className: 'text-blue-400 shrink-0' }, '\u25CF'),
                    h('span', null, pt)
                  );
                })
              ),
              // Similarities (middle)
              h('div', { className: 'bg-green-50 border border-green-200 rounded-xl p-3' },
                h('h5', { className: 'text-[10px] font-bold text-green-700 uppercase text-center mb-2' }, 'Shared'),
                (compResult.similarities || []).map(function(sim, i) {
                  return h('div', { key: i, className: 'text-xs text-green-800 mb-1.5 flex items-start gap-1' },
                    h('span', { className: 'text-green-400 shrink-0' }, '\u25CF'),
                    h('span', null, sim)
                  );
                })
              ),
              // Culture 2 unique
              h('div', { className: 'bg-purple-50 border border-purple-200 rounded-xl p-3' },
                h('h5', { className: 'text-[10px] font-bold text-purple-700 uppercase text-center mb-2' }, compResult.culture2Name),
                (compResult.culture2Points || []).map(function(pt, i) {
                  return h('div', { key: i, className: 'text-xs text-purple-800 mb-1.5 flex items-start gap-1' },
                    h('span', { className: 'text-purple-400 shrink-0' }, '\u25CF'),
                    h('span', null, pt)
                  );
                })
              )
            ),

            // Insight
            compResult.insight && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
              h('p', { className: 'text-xs font-bold text-amber-600 mb-1' }, '\uD83D\uDCA1 Insight'),
              h('p', { className: 'text-sm text-amber-800 leading-relaxed' }, compResult.insight)
            ),

            // Reflection
            compResult.reflection && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4' },
              h('p', { className: 'text-xs font-bold text-teal-600 mb-1' }, '\uD83E\uDD14 Reflect'),
              h('p', { className: 'text-sm text-teal-800 italic' }, compResult.reflection),
              h('textarea', { value: d.compReflection || '', onChange: function(e) { upd('compReflection', e.target.value); },
                placeholder: 'Write your thoughts...', className: 'mt-2 w-full text-sm p-3 border border-teal-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-teal-300',
                'aria-label': 'Comparison reflection'
              })
            ),

            // Compare completed count
            h('div', { className: 'text-center text-xs text-slate-500' },
              '\uD83D\uDCCA ' + comparisonsCompleted + ' comparison' + (comparisonsCompleted !== 1 ? 's' : '') + ' completed'
            )
          )
        ),

        // ═══ EXPLORE ═══
        tab === 'explore' && h('div', { className: 'space-y-4' },

          // Culture header + back
          h('div', { className: 'flex items-center gap-2' },
            h('button', { onClick: function() { upd('tab', 'choose'); }, className: 'text-xs text-cyan-500 hover:text-cyan-700 font-bold' }, '\u2190 All Cultures'),
            h('h3', { className: 'text-lg font-black text-slate-800' }, selectedCulture || 'Select a culture')
          ),

          // Aspect selector
          h('div', { className: 'flex flex-wrap gap-2' },
            EXPLORE_ASPECTS.map(function(aspect) {
              return h('button', { key: aspect.id,
                onClick: function() { updMulti({ aspect: aspect.id, cultureData: null, cultureImage: null, followUpAnswer: null }); exploreCulture(selectedCulture, aspect.id); },
                className: 'px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ' +
                  (selectedAspect === aspect.id ? 'bg-cyan-600 text-white border-cyan-600 shadow-md' : 'bg-white border-slate-200 text-slate-600 hover:border-cyan-300')
              }, aspect.emoji + ' ' + aspect.label);
            })
          ),

          // Loading
          aiLoading && !cultureData && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-2xl p-12 text-center' },
            h('div', { className: 'text-4xl mb-3 animate-pulse' }, '\uD83C\uDF0D'),
            h('p', { className: 'text-cyan-700 font-bold' }, 'Discovering ' + selectedCulture + '...')
          ),

          // Culture data display
          cultureData && h('div', { className: 'space-y-4' },

            // Greeting
            greeting && h('div', { className: 'bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl border border-cyan-200 p-4 text-center' },
              h('div', { className: 'text-xs font-bold text-cyan-600 uppercase tracking-widest mb-1' }, 'Greeting'),
              h('p', { className: 'text-lg font-black text-slate-800' }, greeting),
              callTTS && h('button', { onClick: function() { callTTS(greeting); }, className: 'mt-1 text-[10px] text-cyan-500 hover:text-cyan-700 font-bold' }, '\uD83D\uDD0A Hear pronunciation')
            ),

            // Image + Overview
            h('div', { className: 'bg-white rounded-2xl border-2 border-cyan-200 overflow-hidden' },
              (cultureImage || imageLoading) && h('div', { className: 'w-full' },
                imageLoading ? h('div', { className: 'w-full h-48 bg-cyan-50 flex items-center justify-center' }, h('span', { className: 'text-2xl animate-pulse' }, '\uD83C\uDFA8'))
                : cultureImage && h('img', { src: cultureImage, alt: 'Illustration of ' + selectedCulture, className: 'w-full h-48 object-cover' })
              ),
              h('div', { className: 'p-5' },
                h('h4', { className: 'text-sm font-bold text-slate-800 mb-2' }, cultureData.title || selectedCulture),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, cultureData.overview)
              )
            ),

            // Key Facts
            cultureData.keyFacts && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
              h('h4', { className: 'text-xs font-bold text-slate-600 uppercase tracking-widest mb-2' }, '\u2728 Key Facts'),
              h('div', { className: 'space-y-2' },
                cultureData.keyFacts.map(function(fact, i) {
                  return h('div', { key: i, className: 'flex items-start gap-2 text-xs text-slate-700' },
                    h('span', { className: 'text-cyan-500 font-bold mt-0.5 shrink-0' }, '\u2022'),
                    h('span', { className: 'leading-relaxed' }, fact)
                  );
                })
              )
            ),

            // Voice from the culture
            cultureData.voices && h('div', { className: 'bg-amber-50 border border-amber-200 rounded-xl p-4' },
              h('p', { className: 'text-sm text-amber-800 italic leading-relaxed' }, '\uD83D\uDCAC ', cultureData.voices),
              callTTS && h('button', { onClick: function() { callTTS(cultureData.voices); }, className: 'mt-1 text-[10px] text-amber-500 hover:text-amber-700 font-bold' }, '\uD83D\uDD0A Hear this')
            ),

            // Reflection
            cultureData.reflection && h('div', { className: 'bg-teal-50 border border-teal-200 rounded-xl p-4' },
              h('p', { className: 'text-xs font-bold text-teal-600 mb-1' }, '\uD83E\uDD14 Reflect'),
              h('p', { className: 'text-sm text-teal-800 italic' }, cultureData.reflection),
              h('textarea', { value: d.reflectionText || '', onChange: function(e) { upd('reflectionText', e.target.value); },
                placeholder: 'Write your reflection...', className: 'mt-2 w-full text-sm p-3 border border-teal-200 rounded-lg resize-none h-16 outline-none focus:ring-2 focus:ring-teal-300', 'aria-label': 'Culture reflection' })
            ),

            // Learn more
            cultureData.learnMore && h('div', { className: 'bg-indigo-50 border border-indigo-200 rounded-xl p-3' },
              h('p', { className: 'text-xs text-indigo-700' }, '\uD83D\uDCDA Learn more: ', h('strong', null, cultureData.learnMore))
            ),

            // Follow-up question
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
              h('label', { className: 'text-xs font-bold text-slate-600 block mb-1' }, '\u2753 Ask a follow-up question:'),
              h('div', { className: 'flex gap-2' },
                h('input', { type: 'text', value: d.followUpQ || '', onChange: function(e) { upd('followUpQ', e.target.value); },
                  onKeyDown: function(e) { if (e.key === 'Enter' && d.followUpQ && d.followUpQ.trim()) { askFollowUp(d.followUpQ); upd('followUpQ', ''); } },
                  placeholder: 'What else would you like to know?',
                  className: 'flex-1 text-sm p-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-cyan-300',
                  'aria-label': 'Follow-up question'
                }),
                h('button', { onClick: function() { if (d.followUpQ && d.followUpQ.trim()) { askFollowUp(d.followUpQ); upd('followUpQ', ''); } },
                  disabled: aiLoading, className: 'px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 disabled:opacity-40 transition-colors'
                }, aiLoading ? '...' : 'Ask')
              )
            ),

            // Follow-up answer
            d.followUpAnswer && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-4' },
              h('div', { className: 'flex items-start gap-2' },
                h(Sparkles, { size: 14, className: 'text-cyan-500 mt-0.5 shrink-0' }),
                h('p', { className: 'text-sm text-slate-700 leading-relaxed whitespace-pre-line' }, d.followUpAnswer)
              )
            ),

            // Regenerate image
            callImagen && h('button', { onClick: function() {
              upd('imageLoading', true);
              var newPrompt = 'Beautiful illustration representing ' + selectedCulture + ' culture, ' + (EXPLORE_ASPECTS.find(function(a) { return a.id === selectedAspect; }) || {}).label + '. Respectful, accurate, fine art quality, warm lighting. NO text, NO stereotypes.';
              callImagen(newPrompt, 400, 0.8).then(function(img) { updMulti({ cultureImage: img, imageLoading: false }); }).catch(function() { upd('imageLoading', false); });
            }, disabled: imageLoading, className: 'text-[10px] text-cyan-500 hover:text-cyan-700 font-bold disabled:opacity-40' }, imageLoading ? '\uD83C\uDFA8 Generating...' : '\uD83C\uDFA8 Generate new illustration')
          )
        ),

        // ═══ CULTURE QUIZ ═══
        tab === 'quiz' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFC6 Culture Quiz'),
            h('p', { className: 'text-sm text-slate-500' }, '10 questions about cultures around the world (' + gradeBand + ' level)')
          ),

          // Quiz not started
          !quizActive && h('div', { className: 'bg-white rounded-2xl border-2 border-cyan-200 p-8 text-center space-y-4' },
            h('div', { className: 'text-5xl' }, '\uD83C\uDF0D'),
            h('p', { className: 'text-sm text-slate-600' }, 'Test your knowledge of world cultures! Answer 10 multiple-choice questions.'),
            quizBestScore > 0 && h('p', { className: 'text-xs text-cyan-600 font-bold' }, '\uD83C\uDFC6 Best score: ' + quizBestScore + '/10'),
            h('button', { onClick: startQuiz,
              className: 'px-6 py-3 bg-cyan-600 text-white rounded-lg text-sm font-bold hover:bg-cyan-700 transition-colors'
            }, '\u25B6 Start Quiz')
          ),

          // Quiz in progress
          quizActive && !quizDone && quizQuestions[quizIndex] && h('div', { className: 'space-y-4' },
            // Progress bar
            h('div', { className: 'flex items-center gap-3' },
              h('div', { className: 'flex-1 bg-slate-200 rounded-full h-2' },
                h('div', { className: 'bg-cyan-600 h-2 rounded-full transition-all', style: { width: ((quizIndex + 1) / quizQuestions.length * 100) + '%' } })
              ),
              h('span', { className: 'text-xs font-bold text-slate-500' }, (quizIndex + 1) + '/' + quizQuestions.length)
            ),

            // Score
            h('div', { className: 'text-center' },
              h('span', { className: 'text-xs font-bold text-cyan-600' }, 'Score: ' + quizScore)
            ),

            // Question
            h('div', { className: 'bg-white rounded-2xl border-2 border-cyan-200 p-5' },
              h('p', { className: 'text-sm font-bold text-slate-800 mb-4' }, quizQuestions[quizIndex].q),
              h('div', { className: 'space-y-2' },
                quizQuestions[quizIndex].opts.map(function(opt, oi) {
                  var isCorrect = oi === quizQuestions[quizIndex].ans;
                  var isChosen = quizAnswer === oi;
                  var answered = quizAnswer !== undefined;
                  var btnClass = 'w-full px-4 py-3 rounded-lg text-sm font-bold text-left border-2 transition-all ';
                  if (answered && isCorrect) {
                    btnClass += 'bg-green-100 border-green-400 text-green-800';
                  } else if (answered && isChosen && !isCorrect) {
                    btnClass += 'bg-red-100 border-red-400 text-red-800';
                  } else if (answered) {
                    btnClass += 'bg-slate-50 border-slate-200 text-slate-400';
                  } else {
                    btnClass += 'bg-white border-slate-200 text-slate-700 hover:border-cyan-300 hover:bg-cyan-50';
                  }
                  return h('button', { key: oi, onClick: function() { handleQuizAnswer(oi); }, disabled: answered,
                    className: btnClass
                  }, String.fromCharCode(65 + oi) + '. ' + opt);
                })
              ),

              // Next button
              quizAnswer !== undefined && h('button', { onClick: nextQuizQuestion,
                className: 'w-full mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors'
              }, quizIndex + 1 >= quizQuestions.length ? 'See Results' : 'Next Question \u2192')
            )
          ),

          // Quiz done
          quizActive && quizDone && h('div', { className: 'bg-white rounded-2xl border-2 border-cyan-200 p-8 text-center space-y-4' },
            h('div', { className: 'text-5xl' }, quizScore >= 8 ? '\uD83C\uDFC6' : quizScore >= 5 ? '\u2B50' : '\uD83D\uDCDA'),
            h('h4', { className: 'text-lg font-black text-slate-800' }, 'Quiz Complete!'),
            h('p', { className: 'text-3xl font-black ' + (quizScore >= 8 ? 'text-green-600' : quizScore >= 5 ? 'text-amber-600' : 'text-slate-600') }, quizScore + '/10'),
            h('p', { className: 'text-sm text-slate-600' },
              quizScore >= 9 ? 'Amazing! You are a true culture expert!' :
              quizScore >= 7 ? 'Great job! You know a lot about world cultures!' :
              quizScore >= 5 ? 'Good effort! Keep exploring to learn more!' :
              'Keep exploring! Every culture has something to teach us.'
            ),
            h('div', { className: 'flex gap-3 justify-center' },
              h('button', { onClick: startQuiz,
                className: 'px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors'
              }, '\uD83D\uDD04 Try Again'),
              h('button', { onClick: function() { upd('tab', 'choose'); },
                className: 'px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors'
              }, '\uD83C\uDF0D Explore More Cultures')
            )
          )
        ),

        // ═══ JOURNAL (enhanced with guided prompts) ═══
        tab === 'journal' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83D\uDCD3 Culture Journal'),
            h('p', { className: 'text-sm text-slate-500' }, 'Record what you have learned and what it means to you')
          ),

          // Stats
          h('div', { className: 'grid grid-cols-3 gap-3' },
            h('div', { className: 'bg-cyan-50 rounded-xl border border-cyan-200 p-3 text-center' },
              h('div', { className: 'text-2xl font-black text-cyan-600' }, exploredCultures.length),
              h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Cultures Explored')
            ),
            h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-3 text-center' },
              h('div', { className: 'text-2xl font-black text-teal-600' }, questionsAsked),
              h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Questions Asked')
            ),
            h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-3 text-center' },
              h('div', { className: 'text-2xl font-black text-amber-600' }, comparisonsCompleted),
              h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Comparisons')
            )
          ),

          // Guided Journal Prompts (Cultural Appreciation Journal)
          h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl border border-amber-200 p-4' },
            h('h4', { className: 'text-sm font-bold text-amber-700 mb-3' }, '\uD83C\uDF1F Cultural Appreciation Journal'),
            h('p', { className: 'text-xs text-amber-600 mb-3' }, 'Reflect on your cultural learning with these guided prompts:'),
            h('div', { className: 'space-y-3' },
              JOURNAL_PROMPTS.map(function(jp) {
                var completed = journalPromptsCompleted.indexOf(jp.id) >= 0;
                var entryVal = journalEntries[jp.id] || '';
                return h('div', { key: jp.id, className: 'bg-white rounded-xl border border-amber-200 p-3 ' + (completed ? 'ring-1 ring-amber-300' : '') },
                  h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', null, jp.emoji),
                    h('span', { className: 'text-xs font-bold text-slate-700 flex-1' }, jp.prompt),
                    completed && h('span', { className: 'text-[10px] text-amber-600 font-bold' }, '\u2713')
                  ),
                  h('textarea', { value: entryVal, onChange: function(e) {
                      var newEntries = {};
                      var k;
                      for (k in journalEntries) { if (journalEntries.hasOwnProperty(k)) newEntries[k] = journalEntries[k]; }
                      newEntries[jp.id] = e.target.value;
                      upd('journalEntries', newEntries);
                    },
                    placeholder: 'Write your thoughts...',
                    className: 'w-full text-sm p-2 border border-slate-200 rounded-lg resize-none h-14 outline-none focus:ring-2 focus:ring-amber-300',
                    'aria-label': jp.prompt
                  }),
                  entryVal.length > 20 && !completed && h('button', { onClick: function() {
                      var newCompleted = journalPromptsCompleted.concat([jp.id]);
                      var newCount = journalCount + 1;
                      updMulti({ journalPromptsCompleted: newCompleted, journalCount: newCount });
                      ctx.awardXP(8);
                      addToast('Reflection saved!', 'success');
                      checkBadges({ journalPromptsCompleted: newCompleted, journalCount: newCount });
                    },
                    className: 'mt-1 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold hover:bg-amber-600 transition-colors'
                  }, '\uD83D\uDCBE Save Reflection')
                );
              })
            ),
            // Progress
            h('div', { className: 'mt-3 text-center text-xs text-amber-600 font-bold' },
              journalPromptsCompleted.length + '/' + JOURNAL_PROMPTS.length + ' prompts completed')
          ),

          // Explored cultures list
          exploredCultures.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4' },
            h('h4', { className: 'text-xs font-bold text-slate-600 mb-2' }, 'Cultures You\'ve Explored:'),
            h('div', { className: 'flex flex-wrap gap-2' },
              exploredCultures.map(function(c) {
                return h('button', { key: c, onClick: function() { updMulti({ culture: c, tab: 'explore', aspect: 'traditions', cultureData: null, cultureImage: null }); exploreCulture(c, 'traditions'); },
                  className: 'px-3 py-1.5 bg-cyan-100 border border-cyan-300 rounded-full text-xs font-bold text-cyan-700 hover:bg-cyan-200 transition-colors'
                }, '\u2713 ' + c);
              })
            )
          ),

          // Big free-form reflection
          h('div', { className: 'bg-gradient-to-r from-cyan-50 to-teal-50 rounded-2xl border border-cyan-200 p-5' },
            h('h4', { className: 'text-sm font-bold text-cyan-700 mb-2' }, '\uD83C\uDF0D What have you learned about the world \u2014 and about yourself?'),
            h('textarea', { value: d.journalEntry || '', onChange: function(e) { upd('journalEntry', e.target.value); },
              placeholder: 'What surprised you? What connections did you find between cultures? How does learning about others change how you see yourself?',
              className: 'w-full text-sm p-3 border border-cyan-200 rounded-lg resize-none h-32 outline-none focus:ring-2 focus:ring-cyan-300', 'aria-label': 'Culture journal entry'
            }),
            d.journalEntry && d.journalEntry.length > 30 && h('button', {
              onClick: function() {
                var newCount = journalCount + 1;
                updMulti({ journalCount: newCount });
                ctx.awardXP(10);
                addToast('Journal saved!', 'success');
                if (ctx.celebrate) ctx.celebrate();
                checkBadges({ journalCount: newCount });
              },
              className: 'mt-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-xs font-bold hover:bg-cyan-700 transition-colors'
            }, '\uD83D\uDC9B Save Journal Entry')
          ),

          // Closing thought
          h('div', { className: 'bg-slate-50 border border-slate-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-sm text-slate-600 italic leading-relaxed' },
              '"The beauty of the world lies in the diversity of its people." \u2014 Unknown'
            ),
            h('p', { className: 'text-[10px] text-slate-400 mt-1' },
              'Every culture on this list represents millions of unique individuals. Learning about cultures is a beginning, not an end.'
            )
          )
        ),

        // ═══ BADGES ═══
        tab === 'badges' && h('div', { className: 'space-y-4' },
          h('div', { className: 'text-center mb-2' },
            h('h3', { className: 'text-lg font-black text-slate-800' }, '\uD83C\uDFC5 Badges'),
            h('p', { className: 'text-sm text-slate-500' }, 'Earn badges by exploring cultures, learning languages, and reflecting')
          ),

          h('div', { className: 'text-center mb-3' },
            h('span', { className: 'text-2xl font-black text-cyan-600' }, badgesEarned.length),
            h('span', { className: 'text-sm text-slate-500 ml-1' }, '/ ' + BADGES.length + ' badges earned')
          ),

          h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3' },
            BADGES.map(function(badge) {
              var earned = badgesEarned.indexOf(badge.id) >= 0;
              return h('div', { key: badge.id, className: 'bg-white rounded-xl border-2 p-4 flex items-center gap-3 transition-all ' +
                  (earned ? 'border-amber-300 bg-amber-50' : 'border-slate-200 opacity-60')
                },
                h('div', { className: 'text-2xl' }, earned ? badge.emoji : '\uD83D\uDD12'),
                h('div', { className: 'flex-1' },
                  h('div', { className: 'text-sm font-bold ' + (earned ? 'text-slate-800' : 'text-slate-500') }, badge.label),
                  h('div', { className: 'text-[10px] ' + (earned ? 'text-amber-700' : 'text-slate-400') }, badge.desc)
                ),
                earned && h('span', { className: 'text-green-500 text-lg font-bold' }, '\u2713')
              );
            })
          ),

          // Motivational message
          badgesEarned.length < BADGES.length && h('div', { className: 'bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center' },
            h('p', { className: 'text-xs text-cyan-700' },
              badgesEarned.length === 0 ? 'Start exploring to earn your first badge!' :
              badgesEarned.length < 5 ? 'Great progress! Keep exploring to earn more badges.' :
              'Almost there! Just a few more badges to collect!'
            )
          ),

          badgesEarned.length >= BADGES.length && h('div', { className: 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-300 rounded-2xl p-6 text-center' },
            h('div', { className: 'text-4xl mb-2' }, '\uD83C\uDF1F'),
            h('h4', { className: 'text-lg font-black text-amber-700' }, 'All Badges Earned!'),
            h('p', { className: 'text-sm text-amber-600' }, 'You are a true global explorer and cultural ambassador!')
          )
        )
      );
    }
  });
})();

console.log('[SelHub] sel_tool_cultureexplorer.js loaded');
