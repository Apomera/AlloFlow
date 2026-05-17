// =============================================================================
// language_matcher_module.js — fuzzy language input matcher
// =============================================================================
// Exposes window.AlloLangMatcher.match(userInput) which:
//   1. Normalizes input (lowercase, strip punctuation, collapse whitespace)
//   2. Checks the aliases table (handles "Spanish" → "Spanish (Latin America)",
//      "Chinese" → "Chinese (Simplified)", "Mandarin" → "Chinese (Simplified)",
//      and ~200 known misspellings + endonyms like "soomaali" → "Somali")
//   3. Falls back to Levenshtein-distance scoring against the manifest of
//      available packs
//   4. Returns { slug, display, confidence } or null
//
// The runtime in AlloFlowANTI.txt uses this to canonicalize what the user
// typed before checking the CDN. If we can't match well enough, the runtime
// falls through to live generation with the user's raw input.
// =============================================================================
(function () {
  'use strict';
  if (window.AlloLangMatcher) { return; }

  // ─── Endonyms + common misspellings + variants → canonical display name ───
  // Endonym = what speakers call their own language. We accept both endonyms
  // and English names. New entries can be added without touching the matching
  // logic; just add to ALIASES.
  const ALIASES = {
    // Spanish family
    'spanish': 'Spanish (Latin America)',
    'spanis': 'Spanish (Latin America)',
    'spainish': 'Spanish (Latin America)',
    'español': 'Spanish (Latin America)',
    'espanol': 'Spanish (Latin America)',
    'castellano': 'Spanish (Castilian)',
    'castilian': 'Spanish (Castilian)',
    'spanish (spain)': 'Spanish (Castilian)',
    'spanish (mexico)': 'Spanish (Latin America)',
    'spanish (mexican)': 'Spanish (Latin America)',
    'mexican spanish': 'Spanish (Latin America)',
    'latin spanish': 'Spanish (Latin America)',

    // French family
    'french': 'French',
    'francais': 'French',
    'français': 'French',
    'french canadian': 'French (Canadian)',
    'canadian french': 'French (Canadian)',
    'quebecois': 'French (Canadian)',
    'québécois': 'French (Canadian)',

    // Portuguese family
    'portuguese': 'Portuguese (Brazil)',
    'portugese': 'Portuguese (Brazil)',
    'português': 'Portuguese (Brazil)',
    'brazilian': 'Portuguese (Brazil)',
    'brasileiro': 'Portuguese (Brazil)',
    'portuguese (angola)': 'Portuguese (Angola)',
    'angolan portuguese': 'Portuguese (Angola)',
    'portuguese (portugal)': 'Portuguese (Portugal)',
    'european portuguese': 'Portuguese (Portugal)',

    // Chinese family
    'chinese': 'Chinese (Simplified)',
    'mandarin': 'Chinese (Simplified)',
    'mandarin chinese': 'Chinese (Simplified)',
    '中文': 'Chinese (Simplified)',
    '普通话': 'Chinese (Simplified)',
    'simplified chinese': 'Chinese (Simplified)',
    'traditional chinese': 'Chinese (Traditional)',
    '繁體中文': 'Chinese (Traditional)',
    '繁体中文': 'Chinese (Traditional)',
    'cantonese': 'Cantonese',
    'guangdonghua': 'Cantonese',
    '粵語': 'Cantonese',
    '粤语': 'Cantonese',
    'hokkien': 'Hokkien',
    'taiwanese': 'Taiwanese (Hokkien)',

    // Haitian / French creoles
    'haitian': 'Haitian Creole',
    'haitan': 'Haitian Creole',
    'haitan creole': 'Haitian Creole',
    'kreyol': 'Haitian Creole',
    'kreyòl': 'Haitian Creole',
    'kreyol ayisyen': 'Haitian Creole',
    'creole': 'Haitian Creole',

    // Somali / Horn of Africa
    'somali': 'Somali',
    'somolian': 'Somali',
    'somalian': 'Somali',
    'soomaali': 'Somali',
    'af-soomaali': 'Somali',
    'amharic': 'Amharic',
    'amaric': 'Amharic',
    'amharik': 'Amharic',
    'አማርኛ': 'Amharic',
    'tigrinya': 'Tigrinya',
    'tigrigna': 'Tigrinya',
    'ትግርኛ': 'Tigrinya',
    'oromo': 'Oromo',
    'afaan oromoo': 'Oromo',

    // East/Central Africa
    'swahili': 'Swahili',
    'kiswahili': 'Swahili',
    'lingala': 'Lingala',
    'lingála': 'Lingala',
    'kinyarwanda': 'Kinyarwanda',
    'rwandan': 'Kinyarwanda',
    'kirundi': 'Kirundi',
    'burundian': 'Kirundi',
    'luganda': 'Luganda',
    'ganda': 'Luganda',

    // West Africa
    'yoruba': 'Yoruba',
    'igbo': 'Igbo',
    'hausa': 'Hausa',
    'fulani': 'Fulani',
    'fula': 'Fulani',
    'pulaar': 'Fulani',
    'wolof': 'Wolof',
    'twi': 'Twi',
    'akan': 'Akan',
    'ga': 'Ga',
    'ewe': 'Ewe',

    // Arabic + regional variants
    'arabic': 'Arabic',
    'arab': 'Arabic',
    'arabik': 'Arabic',
    'العربية': 'Arabic',
    'modern standard arabic': 'Arabic',
    'msa': 'Arabic',
    'levantine arabic': 'Arabic (Levantine)',
    'egyptian arabic': 'Arabic (Egyptian)',
    'maghrebi arabic': 'Arabic (Maghrebi)',
    'gulf arabic': 'Arabic (Gulf)',
    'sudanese arabic': 'Arabic (Sudanese)',

    // Central/South Asia
    'pashto': 'Pashto',
    'pushto': 'Pashto',
    'pakhto': 'Pashto',
    'پښتو': 'Pashto',
    'dari': 'Dari',
    'persian dari': 'Dari',
    'farsi': 'Farsi',
    'persian': 'Farsi',
    'فارسی': 'Farsi',
    'urdu': 'Urdu',
    'اردو': 'Urdu',
    'punjabi': 'Punjabi',
    'pakistani punjabi': 'Punjabi',
    'panjabi': 'Punjabi',
    'ਪੰਜਾਬੀ': 'Punjabi',
    'hindi': 'Hindi',
    'हिन्दी': 'Hindi',
    'bengali': 'Bengali',
    'bangla': 'Bengali',
    'বাংলা': 'Bengali',
    'tamil': 'Tamil',
    'தமிழ்': 'Tamil',
    'telugu': 'Telugu',
    'తెలుగు': 'Telugu',
    'malayalam': 'Malayalam',
    'kannada': 'Kannada',
    'marathi': 'Marathi',
    'gujarati': 'Gujarati',
    'sinhala': 'Sinhala',
    'sinhalese': 'Sinhala',
    'nepali': 'Nepali',
    'nepalese': 'Nepali',
    'नेपाली': 'Nepali',

    // Southeast Asia
    'vietnamese': 'Vietnamese',
    'tiếng việt': 'Vietnamese',
    'tieng viet': 'Vietnamese',
    'thai': 'Thai',
    'ภาษาไทย': 'Thai',
    'lao': 'Lao',
    'laotian': 'Lao',
    'ລາວ': 'Lao',
    'khmer': 'Khmer',
    'cambodian': 'Khmer',
    'ខ្មែរ': 'Khmer',
    'burmese': 'Burmese',
    'myanmar': 'Burmese',
    'မြန်မာ': 'Burmese',
    'karen': 'Karen',
    'sgaw karen': 'Karen',
    'hmong': 'Hmong',
    'mong': 'Hmong',
    'tagalog': 'Tagalog',
    'filipino': 'Tagalog',
    'pilipino': 'Tagalog',
    'cebuano': 'Cebuano',
    'bisaya': 'Cebuano',
    'ilocano': 'Ilocano',
    'indonesian': 'Indonesian',
    'bahasa indonesia': 'Indonesian',
    'malay': 'Malay',
    'bahasa melayu': 'Malay',

    // East Asia
    'korean': 'Korean',
    '한국어': 'Korean',
    'hangugeo': 'Korean',
    'japanese': 'Japanese',
    '日本語': 'Japanese',
    'nihongo': 'Japanese',
    'mongolian': 'Mongolian',
    'монгол': 'Mongolian',

    // Slavic family
    'russian': 'Russian',
    'ruski': 'Russian',
    'русский': 'Russian',
    'ukrainian': 'Ukrainian',
    'українська': 'Ukrainian',
    'belarusian': 'Belarusian',
    'belorussian': 'Belarusian',
    'polish': 'Polish',
    'polski': 'Polish',
    'czech': 'Czech',
    'čeština': 'Czech',
    'slovak': 'Slovak',
    'slovenčina': 'Slovak',
    'serbian': 'Serbian',
    'српски': 'Serbian',
    'croatian': 'Croatian',
    'hrvatski': 'Croatian',
    'bosnian': 'Bosnian',
    'bosanski': 'Bosnian',
    'bulgarian': 'Bulgarian',
    'български': 'Bulgarian',
    'macedonian': 'Macedonian',
    'slovene': 'Slovenian',
    'slovenian': 'Slovenian',

    // Romance languages (other)
    'italian': 'Italian',
    'italiano': 'Italian',
    'romanian': 'Romanian',
    'română': 'Romanian',
    'catalan': 'Catalan',
    'català': 'Catalan',

    // Germanic family
    'german': 'German',
    'deutsch': 'German',
    'dutch': 'Dutch',
    'nederlands': 'Dutch',
    'flemish': 'Dutch',
    'swedish': 'Swedish',
    'svenska': 'Swedish',
    'norwegian': 'Norwegian',
    'norsk': 'Norwegian',
    'danish': 'Danish',
    'dansk': 'Danish',
    'finnish': 'Finnish',
    'suomi': 'Finnish',
    'icelandic': 'Icelandic',
    'íslenska': 'Icelandic',

    // Celtic / British Isles
    'irish': 'Irish',
    'gaeilge': 'Irish',
    'irish gaelic': 'Irish',
    'welsh': 'Welsh',
    'cymraeg': 'Welsh',
    'scottish gaelic': 'Scottish Gaelic',
    'gàidhlig': 'Scottish Gaelic',

    // Other Europe
    'greek': 'Greek',
    'ελληνικά': 'Greek',
    'turkish': 'Turkish',
    'türkçe': 'Turkish',
    'kurdish': 'Kurdish',
    'kurdî': 'Kurdish',
    'kurmanji': 'Kurdish (Kurmanji)',
    'sorani': 'Kurdish (Sorani)',
    'armenian': 'Armenian',
    'հայերեն': 'Armenian',
    'azerbaijani': 'Azerbaijani',
    'azərbaycan': 'Azerbaijani',
    'azeri': 'Azerbaijani',
    'georgian': 'Georgian',
    'ქართული': 'Georgian',
    'albanian': 'Albanian',
    'shqip': 'Albanian',
    'maltese': 'Maltese',
    'malti': 'Maltese',
    'hungarian': 'Hungarian',
    'magyar': 'Hungarian',
    'estonian': 'Estonian',
    'eesti': 'Estonian',
    'latvian': 'Latvian',
    'latviešu': 'Latvian',
    'lithuanian': 'Lithuanian',
    'lietuvių': 'Lithuanian',

    // Hebrew / Yiddish
    'hebrew': 'Hebrew',
    'ivrit': 'Hebrew',
    'עברית': 'Hebrew',
    'yiddish': 'Yiddish',
    'אידיש': 'Yiddish',

    // Indigenous Americas
    'quechua': 'Quechua',
    'kichwa': 'Quechua',
    'runa simi': 'Quechua',
    'aymara': 'Aymara',
    'nahuatl': 'Nahuatl',
    'mexica': 'Nahuatl',
    'mayan': 'Mayan',
    'kʼicheʼ': 'Mayan (Kʼicheʼ)',
    'mam': 'Mayan (Mam)',
    'yucatec': 'Mayan (Yucatec)',
    'guarani': 'Guarani',
    'guaraní': 'Guarani',
    'navajo': 'Navajo',
    'diné bizaad': 'Navajo',

    // English variants
    'english': 'English',
    'british english': 'English',
    'american english': 'English',
    'aave': 'English (AAVE)',

    // Less common but PPS-relevant
    'rohingya': 'Rohingya',
    'shan': 'Shan',
    'jingpho': 'Jingpho',
    'kayah': 'Kayah',
    'kachin': 'Kachin',
    'mizo': 'Mizo',
    'chin': 'Chin',
    'falam chin': 'Chin (Falam)',
    'matu': 'Chin (Matu)',
    'hakha chin': 'Chin (Hakha)',
    'zomi': 'Zomi',

    // Pacific
    'samoan': 'Samoan',
    'gagana samoa': 'Samoan',
    'tongan': 'Tongan',
    'lea fakatonga': 'Tongan',
    'fijian': 'Fijian',
    'hawaiian': 'Hawaiian',
    'ʻōlelo hawaiʻi': 'Hawaiian',
    'maori': 'Maori',
    'māori': 'Maori',
    'chamorro': 'Chamorro',
    'marshallese': 'Marshallese',

    // Sign languages (text descriptions, since UI strings)
    'asl': 'American Sign Language (ASL)',
    'american sign language': 'American Sign Language (ASL)'
  };

  // Manifest — populated at load time from /lang/manifest.json. Until then,
  // we have only ALIASES to work with. Once the manifest loads, fuzzy
  // matching falls back to Levenshtein over the actual available packs.
  let _MANIFEST = { available: [], by_slug: {} };
  let _manifestReady = null;

  function _slugify(s) {
    return s.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
  function _normalize(s) {
    return (s || '').toLowerCase().trim().replace(/[\s\-_]+/g, ' ').replace(/[^\p{L}\p{N}\s]/gu, '');
  }

  // Levenshtein distance (iterative, O(mn)). Used as fallback ranker.
  function _lev(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    let v0 = new Array(b.length + 1);
    let v1 = new Array(b.length + 1);
    for (let i = 0; i <= b.length; i++) v0[i] = i;
    for (let i = 0; i < a.length; i++) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j++) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      const swap = v0; v0 = v1; v1 = swap;
    }
    return v0[b.length];
  }

  async function _loadManifest() {
    if (_manifestReady) return _manifestReady;
    _manifestReady = (async () => {
      const URLS = [
        'https://alloflow-cdn.pages.dev/lang/manifest.json',
        'https://raw.githubusercontent.com/Apomera/AlloFlow/main/lang/manifest.json'
      ];
      for (const u of URLS) {
        try {
          const r = await fetch(u);
          if (!r.ok) continue;
          const m = await r.json();
          if (m && Array.isArray(m.available)) {
            _MANIFEST = { available: m.available, by_slug: {} };
            m.available.forEach((entry) => {
              if (entry && entry.slug) _MANIFEST.by_slug[entry.slug] = entry;
            });
            return;
          }
        } catch (_) {}
      }
      // Silent fallback — matcher still works on ALIASES alone
    })();
    return _manifestReady;
  }

  // Public: match(userInput) → { slug, display, confidence } or null
  async function match(userInput) {
    if (!userInput || typeof userInput !== 'string') return null;
    const raw = userInput.trim();
    const norm = _normalize(raw);
    if (!norm) return null;

    // 1) Exact-alias hit (case-insensitive normalized)
    if (ALIASES[norm]) {
      const display = ALIASES[norm];
      return { slug: _slugify(display), display, confidence: 1.0, source: 'alias-exact' };
    }

    // 2) Exact display-name match against the alias VALUES (so user typing
    //    "Spanish (Latin America)" works)
    for (const v of Object.values(ALIASES)) {
      if (_normalize(v) === norm) {
        return { slug: _slugify(v), display: v, confidence: 1.0, source: 'display-exact' };
      }
    }

    // 3) Wait for manifest then try slug-exact against available packs
    await _loadManifest();
    const wantSlug = _slugify(raw);
    if (_MANIFEST.by_slug[wantSlug]) {
      const e = _MANIFEST.by_slug[wantSlug];
      return { slug: wantSlug, display: e.display || raw, confidence: 1.0, source: 'manifest-exact' };
    }

    // 4) Fuzzy: Levenshtein distance vs (alias keys + alias values + manifest displays).
    //    Threshold: similarity ≥ 0.7 (normalized by length). Returns the best.
    const candidates = new Set();
    Object.keys(ALIASES).forEach((k) => candidates.add(k));
    Object.values(ALIASES).forEach((v) => candidates.add(_normalize(v)));
    Object.values(_MANIFEST.by_slug).forEach((e) => { if (e.display) candidates.add(_normalize(e.display)); });

    let best = null;
    let bestScore = 0;
    candidates.forEach((cand) => {
      if (!cand) return;
      const dist = _lev(norm, cand);
      const sim = 1 - dist / Math.max(norm.length, cand.length);
      if (sim > bestScore) {
        bestScore = sim;
        best = cand;
      }
    });
    if (best && bestScore >= 0.7) {
      // Resolve to display name
      let display = null;
      if (ALIASES[best]) display = ALIASES[best];
      if (!display) {
        const matchVal = Object.values(ALIASES).find((v) => _normalize(v) === best);
        if (matchVal) display = matchVal;
      }
      if (!display) {
        const manEntry = Object.values(_MANIFEST.by_slug).find((e) => _normalize(e.display || '') === best);
        if (manEntry) display = manEntry.display;
      }
      if (!display) display = best;
      return { slug: _slugify(display), display, confidence: bestScore, source: 'fuzzy' };
    }

    // 5) Nothing matched — return null so the caller falls through to live
    //    generation with the user's raw input.
    return null;
  }

  // Public: list of canonical language names (display strings). Used by the
  // language selector to populate a "did you mean...?" hint, and by the
  // build script to enumerate target locales.
  function knownDisplayNames() {
    const set = new Set(Object.values(ALIASES));
    Object.values(_MANIFEST.by_slug).forEach((e) => { if (e.display) set.add(e.display); });
    return Array.from(set).sort();
  }

  // Public: list of slugs we have packs for (manifest-backed)
  async function availableSlugs() {
    await _loadManifest();
    return Object.keys(_MANIFEST.by_slug);
  }

  window.AlloLangMatcher = {
    match: match,
    knownDisplayNames: knownDisplayNames,
    availableSlugs: availableSlugs,
    _ALIASES: ALIASES,  // exposed for tests + debugging
    _slugify: _slugify,
    _normalize: _normalize,
    _lev: _lev
  };
  console.log('[AlloFlow] Language matcher ready (' + Object.keys(ALIASES).length + ' aliases)');
})();
