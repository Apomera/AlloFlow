(function () {
  // ═══════════════════════════════════════════
  // arcade_mode_modelun.js — AlloHaven Arcade plugin (v0.1)
  //
  // Model UN simulator. Teacher chairs the committee; students each play
  // one country; AI fills any country not assigned to a student.
  //
  // v0.1 SCOPE (this file):
  //   - Data layer: 30 countries, 6 agendas, 3 committees
  //   - Launcher card: solo + class-host start + class-student join
  //   - Setup wizard (teacher): committee + agenda + assignment mode
  //   - Country-assignment phase: AI fills empty seats, teacher locks roster
  //   - Briefing phase: country profile + agenda background visible to all
  //   - Multiplayer plumbing: session doc `modelUn` key, subscribe + update
  //
  // Future phases (v0.2+):
  //   - Position-paper draft (AI starter)
  //   - Live debate phase (speech compose + AI delegate auto-speak)
  //   - Resolution drafting + amendments
  //   - Voting
  //   - Debrief with smart CTAs
  //
  // Plugin contract: window.AlloHavenArcade.registerMode (mirrors the
  // boss-encounter pattern). render(ctx) returns either the launcher card
  // (no Model UN session active) or the active simulator UI.
  // ═══════════════════════════════════════════

  function waitForRegistry(cb) {
    if (window.AlloHavenArcade && typeof window.AlloHavenArcade.registerMode === 'function') {
      cb(); return;
    }
    var attempts = 0;
    var iv = setInterval(function () {
      attempts++;
      if (window.AlloHavenArcade && typeof window.AlloHavenArcade.registerMode === 'function') {
        clearInterval(iv); cb();
      } else if (attempts > 50) {
        clearInterval(iv);
        if (typeof console !== 'undefined') {
          console.warn('[arcade_mode_modelun] AlloHavenArcade registry not found after 5s — plugin not registered.');
        }
      }
    }, 100);
  }

  waitForRegistry(function () {
    if (window.AlloHavenArcade.isRegistered && window.AlloHavenArcade.isRegistered('model-un')) {
      return;
    }
    register();
  });

  // ═══════════════════════════════════════════
  // DATA — Countries (~30 chosen for geographic + political diversity)
  // Each country has:
  //   - iso, name, region, flag emoji
  //   - gov: short label of govt structure
  //   - gdp_band: 'high' | 'middle' | 'lower-middle' | 'low'
  //   - alliances: short list of bloc memberships (e.g., 'EU', 'NATO', 'G7', 'BRICS')
  //   - currentEvents: 1-2 sentence anchor for "what's been in the news"
  //   - defaultPositions: keyed by agenda id → terse stance phrase
  // ═══════════════════════════════════════════
  var COUNTRIES = [
    { iso: 'USA', name: 'United States',     flag: '🇺🇸', region: 'North America', gov: 'Federal republic',
      gdp_band: 'high', alliances: ['NATO', 'G7', 'P5'],
      currentEvents: 'Active in climate accords; tensions with China over trade and tech.',
      defaultPositions: {
        climate_action:     'Re-engaged in global climate cooperation; pushes private-sector innovation alongside regulation.',
        refugee_crisis:     'Supports asylum frameworks but limits direct intake; funds regional partners.',
        ai_governance:      'Favors a light-touch federal framework; resists global pre-deployment review.',
        maritime_disputes:  'Defends freedom-of-navigation operations, particularly in the South China Sea.',
        pandemic_prep:      'Funds WHO + bilateral aid; emphasizes mRNA stockpiles and warm-base manufacturing.',
        nuclear_nonprolif:  'P5 member; supports NPT and CTBT; opposes Iran and North Korea programs.'
      }
    },
    { iso: 'CHN', name: 'China',             flag: '🇨🇳', region: 'East Asia', gov: 'One-party state',
      gdp_band: 'high', alliances: ['BRICS', 'SCO', 'P5'],
      currentEvents: 'Massive renewable buildout; assertive territorial stance in maritime zones.',
      defaultPositions: {
        climate_action:     'Largest renewable installer; insists on "common but differentiated responsibilities."',
        refugee_crisis:     'Rejects international intervention in domestic populations; limited intake.',
        ai_governance:      'Strong domestic AI regulation; resists Western-led global frameworks.',
        maritime_disputes:  'Asserts nine-dash line in South China Sea; rejects UNCLOS rulings.',
        pandemic_prep:      'Emphasizes sovereignty; resists external inspection mandates.',
        nuclear_nonprolif:  'P5; modernizing arsenal; opposes US/UK tactical deployments to Asia-Pacific.'
      }
    },
    { iso: 'RUS', name: 'Russia',            flag: '🇷🇺', region: 'Eurasia', gov: 'Federal semi-presidential',
      gdp_band: 'middle', alliances: ['BRICS', 'CSTO', 'P5'],
      currentEvents: 'Ukraine war ongoing; energy leverage with EU diminished.',
      defaultPositions: {
        climate_action:     'Treats Arctic warming as opportunity; lukewarm on emission cuts.',
        refugee_crisis:     'Opposes binding refugee quotas; bilateral resettlement preferred.',
        ai_governance:      'Sovereignty-first; resists Western-led oversight bodies.',
        maritime_disputes:  'Defends Arctic claims; supports Northern Sea Route control.',
        pandemic_prep:      'Self-reliance emphasis; bilateral vaccine diplomacy.',
        nuclear_nonprolif:  'P5; doctrine flexibility; opposes NATO eastern deployments.'
      }
    },
    { iso: 'GBR', name: 'United Kingdom',    flag: '🇬🇧', region: 'Europe', gov: 'Constitutional monarchy',
      gdp_band: 'high', alliances: ['NATO', 'G7', 'P5', 'Commonwealth'],
      currentEvents: 'Post-Brexit recalibration; close US ally; AUKUS partner.',
      defaultPositions: {
        climate_action:     'Net-zero 2050 legal mandate; champions climate finance for vulnerable states.',
        refugee_crisis:     'Tightened asylum policy; controversial Rwanda removal scheme.',
        ai_governance:      'Hosted first AI Safety Summit; favors voluntary frontier-model standards.',
        maritime_disputes:  'Freedom of navigation supporter; defends Falklands claim.',
        pandemic_prep:      'Strong R&D base; supports pandemic treaty negotiations.',
        nuclear_nonprolif:  'P5; modernizing deterrent; supports NPT.'
      }
    },
    { iso: 'FRA', name: 'France',            flag: '🇫🇷', region: 'Europe', gov: 'Semi-presidential republic',
      gdp_band: 'high', alliances: ['NATO', 'EU', 'G7', 'P5'],
      currentEvents: 'EU strategic-autonomy advocate; nuclear energy expansion.',
      defaultPositions: {
        climate_action:     'Strong nuclear-energy advocate; co-leads on green industrial policy.',
        refugee_crisis:     'Supports EU-level burden sharing; tightened domestic asylum.',
        ai_governance:      'Co-architect of EU AI Act; favors risk-tiered regulation.',
        maritime_disputes:  'Indo-Pacific presence (territories); freedom of navigation.',
        pandemic_prep:      'WHO supporter; vaccine equity advocate via COVAX successor.',
        nuclear_nonprolif:  'P5; smallest declared arsenal among nuclear powers; supports NPT.'
      }
    },
    { iso: 'DEU', name: 'Germany',           flag: '🇩🇪', region: 'Europe', gov: 'Federal parliamentary republic',
      gdp_band: 'high', alliances: ['NATO', 'EU', 'G7'],
      currentEvents: 'Coal phaseout accelerating; defense spending rising post-Ukraine.',
      defaultPositions: {
        climate_action:     'Energiewende leader; balancing coal exit and energy security.',
        refugee_crisis:     'Largest EU host; supports orderly intake with integration funding.',
        ai_governance:      'EU AI Act backer; data-protection-first framing.',
        maritime_disputes:  'Indo-Pacific guidelines; supports rules-based maritime order.',
        pandemic_prep:      'Global Health Initiative leader; backs WHO funding.',
        nuclear_nonprolif:  'Non-nuclear NATO host (US weapons); supports NPT.'
      }
    },
    { iso: 'JPN', name: 'Japan',             flag: '🇯🇵', region: 'East Asia', gov: 'Constitutional monarchy',
      gdp_band: 'high', alliances: ['G7', 'Quad', 'US alliance'],
      currentEvents: 'Energy diversification post-Fukushima; demographic pressure.',
      defaultPositions: {
        climate_action:     'Hydrogen and nuclear back online; methane/HFC reduction focus.',
        refugee_crisis:     'Historically restrictive; small recent humanitarian intake.',
        ai_governance:      'Hiroshima AI Process champion; light-touch + ethical guidelines.',
        maritime_disputes:  'Senkaku/Diaoyu Islands disputes with China; freedom of navigation.',
        pandemic_prep:      'Strong WHO partner; bilateral vaccine donations.',
        nuclear_nonprolif:  'Non-nuclear; under US extended deterrence; supports NPT.'
      }
    },
    { iso: 'IND', name: 'India',             flag: '🇮🇳', region: 'South Asia', gov: 'Federal parliamentary republic',
      gdp_band: 'middle', alliances: ['BRICS', 'Quad', 'G20'],
      currentEvents: 'Largest population; renewable buildout but coal-heavy near-term.',
      defaultPositions: {
        climate_action:     'Common-but-differentiated; demands climate finance and tech transfer.',
        refugee_crisis:     'Hosts Tibetans, Rohingya, Tamils; no formal refugee law.',
        ai_governance:      'Pro-innovation; opposes restrictive global frameworks; data-sovereignty.',
        maritime_disputes:  'Indian Ocean primacy; tensions with China over border + maritime.',
        pandemic_prep:      'Vaccine Maitri donor; supports WHO + South-South cooperation.',
        nuclear_nonprolif:  'Non-NPT nuclear state; pushes for full membership including NSG.'
      }
    },
    { iso: 'BRA', name: 'Brazil',            flag: '🇧🇷', region: 'South America', gov: 'Federal presidential republic',
      gdp_band: 'middle', alliances: ['BRICS', 'G20', 'Mercosur'],
      currentEvents: 'Lula renewing Amazon protections; champions Global South voice.',
      defaultPositions: {
        climate_action:     'Amazon protection leader; demands climate finance for forest stewardship.',
        refugee_crisis:     'Hosts large Venezuelan inflow; humanitarian framework.',
        ai_governance:      'Pro-Global-South seat in any global AI body.',
        maritime_disputes:  'South Atlantic peace zone advocate.',
        pandemic_prep:      'SUS public-health model; WHO supporter.',
        nuclear_nonprolif:  'Latin America nuclear-free zone; supports NPT.'
      }
    },
    { iso: 'CAN', name: 'Canada',            flag: '🇨🇦', region: 'North America', gov: 'Federal parliamentary',
      gdp_band: 'high', alliances: ['NATO', 'G7', 'Commonwealth'],
      currentEvents: 'Wildfire seasons intensifying; refugee resettlement leader per-capita.',
      defaultPositions: {
        climate_action:     'Carbon-pricing model; balancing oil-sand industry with net-zero.',
        refugee_crisis:     'High per-capita intake; private-sponsorship model praised globally.',
        ai_governance:      'AIDA legislation; multilateral cooperation supporter.',
        maritime_disputes:  'Arctic sovereignty (Northwest Passage); supports UNCLOS.',
        pandemic_prep:      'WHO supporter; pandemic-treaty negotiator.',
        nuclear_nonprolif:  'Non-nuclear; uranium supplier; supports NPT strongly.'
      }
    },
    { iso: 'AUS', name: 'Australia',         flag: '🇦🇺', region: 'Oceania', gov: 'Federal parliamentary',
      gdp_band: 'high', alliances: ['Quad', 'AUKUS', 'Commonwealth'],
      currentEvents: 'Pacific climate leadership; AUKUS submarine program.',
      defaultPositions: {
        climate_action:     'Renewable export ambition; Pacific climate-finance leader.',
        refugee_crisis:     'Offshore processing controversy; targeted resettlement.',
        ai_governance:      'Voluntary safety framework; aligned with US/UK.',
        maritime_disputes:  'Pacific freedom of navigation; Indo-Pacific strategy.',
        pandemic_prep:      'Regional surveillance + bilateral aid in Pacific.',
        nuclear_nonprolif:  'Non-nuclear; AUKUS submarines (conventional warheads).'
      }
    },
    { iso: 'KOR', name: 'South Korea',       flag: '🇰🇷', region: 'East Asia', gov: 'Presidential republic',
      gdp_band: 'high', alliances: ['G20', 'US alliance'],
      currentEvents: 'Semiconductor industry leader; navigating US-China tech rivalry.',
      defaultPositions: {
        climate_action:     'Net-zero 2050 commitment; nuclear + renewable mix.',
        refugee_crisis:     'Low intake historically; recent yemenis case shifted policy.',
        ai_governance:      'Promotes K-AI governance model; voluntary norms.',
        maritime_disputes:  'Defends Dokdo/Takeshima claim with Japan.',
        pandemic_prep:      'COVID response praised; transparency advocate.',
        nuclear_nonprolif:  'Non-nuclear; under US extended deterrence; supports NPT.'
      }
    },
    { iso: 'ZAF', name: 'South Africa',      flag: '🇿🇦', region: 'Africa', gov: 'Parliamentary republic',
      gdp_band: 'middle', alliances: ['BRICS', 'AU', 'G20'],
      currentEvents: 'Just-energy-transition partnership; load-shedding crisis.',
      defaultPositions: {
        climate_action:     'Just-transition advocate; demands climate finance for coal exit.',
        refugee_crisis:     'Hosts large continental displacement; xenophobia tensions.',
        ai_governance:      'Pro-Global-South seat; data-sovereignty.',
        maritime_disputes:  'African Maritime Strategy supporter.',
        pandemic_prep:      'Africa CDC supporter; vaccine equity advocate.',
        nuclear_nonprolif:  'Voluntarily disarmed (only country to do so); strong NPT supporter.'
      }
    },
    { iso: 'NGA', name: 'Nigeria',           flag: '🇳🇬', region: 'Africa', gov: 'Federal presidential',
      gdp_band: 'lower-middle', alliances: ['AU', 'ECOWAS', 'OPEC'],
      currentEvents: 'Largest African economy; tinubu reforms; security challenges.',
      defaultPositions: {
        climate_action:     'Climate-finance demand; energy access central; gas-as-transition.',
        refugee_crisis:     'Sahel displacement host; ECOWAS protocols.',
        ai_governance:      'Pro-Global-South representation; bridge regulator.',
        maritime_disputes:  'Gulf of Guinea security; counter-piracy.',
        pandemic_prep:      'Africa CDC partner; vaccine manufacturing ambition.',
        nuclear_nonprolif:  'Non-nuclear; Pelindaba Treaty signatory; NPT supporter.'
      }
    },
    { iso: 'KEN', name: 'Kenya',             flag: '🇰🇪', region: 'Africa', gov: 'Presidential republic',
      gdp_band: 'lower-middle', alliances: ['AU', 'EAC'],
      currentEvents: 'Africa Climate Summit host; geothermal energy leader.',
      defaultPositions: {
        climate_action:     'Africa Climate Summit host; 100% renewable by 2030 target.',
        refugee_crisis:     'Hosts Somali + South Sudanese refugees; Kakuma + Dadaab camps.',
        ai_governance:      'Africa AI Strategy backer.',
        maritime_disputes:  'Indian Ocean blue economy.',
        pandemic_prep:      'Regional health hub.',
        nuclear_nonprolif:  'Non-nuclear; Pelindaba Treaty.'
      }
    },
    { iso: 'EGY', name: 'Egypt',             flag: '🇪🇬', region: 'Middle East / N Africa', gov: 'Presidential republic',
      gdp_band: 'lower-middle', alliances: ['AU', 'Arab League'],
      currentEvents: 'COP27 host; Nile water-security; economic strain.',
      defaultPositions: {
        climate_action:     'COP27 host; loss-and-damage fund champion.',
        refugee_crisis:     'Major Sudanese refugee host post-2023; bilateral framework.',
        ai_governance:      'African AI capacity-building.',
        maritime_disputes:  'Eastern Mediterranean gas; Nile Basin disputes.',
        pandemic_prep:      'Vaccine manufacturing hub ambition.',
        nuclear_nonprolif:  'Non-nuclear; advocates for nuclear-weapon-free Middle East.'
      }
    },
    { iso: 'SAU', name: 'Saudi Arabia',      flag: '🇸🇦', region: 'Middle East', gov: 'Absolute monarchy',
      gdp_band: 'high', alliances: ['GCC', 'OPEC', 'Arab League'],
      currentEvents: 'Vision 2030 diversification; normalization talks with Israel.',
      defaultPositions: {
        climate_action:     'Net-zero 2060 pledge; pushes carbon-capture over oil phaseout.',
        refugee_crisis:     'Hosts large guest-worker pop; not 1951 Convention signatory.',
        ai_governance:      'Project Transcendence; light-touch domestic regulation.',
        maritime_disputes:  'Red Sea security; Strait of Hormuz interests.',
        pandemic_prep:      'Hajj-driven surveillance investments.',
        nuclear_nonprolif:  'Non-nuclear; hinted at matching Iran capability if needed.'
      }
    },
    { iso: 'IRN', name: 'Iran',              flag: '🇮🇷', region: 'Middle East', gov: 'Theocratic republic',
      gdp_band: 'middle', alliances: ['SCO (joining)', 'BRICS'],
      currentEvents: 'Nuclear program escalation; regional proxy support.',
      defaultPositions: {
        climate_action:     'Sanctions-constrained; resistant to external mandates.',
        refugee_crisis:     'Hosts ~3.4M Afghans; one of world\'s largest refugee populations.',
        ai_governance:      'Sovereignty-first; resists Western frameworks.',
        maritime_disputes:  'Strait of Hormuz primacy; Persian Gulf claims.',
        pandemic_prep:      'Self-sufficiency emphasis under sanctions.',
        nuclear_nonprolif:  'NPT member; insists program is civilian; opposes Israeli ambiguity.'
      }
    },
    { iso: 'ISR', name: 'Israel',            flag: '🇮🇱', region: 'Middle East', gov: 'Parliamentary democracy',
      gdp_band: 'high', alliances: ['US alliance', 'Abraham Accords'],
      currentEvents: 'Gaza conflict; regional normalization continues.',
      defaultPositions: {
        climate_action:     'Cleantech innovation hub; supports adaptation finance.',
        refugee_crisis:     'Strict intake; humanitarian aid abroad.',
        ai_governance:      'Innovation-friendly; aligned with US framework.',
        maritime_disputes:  'Eastern Mediterranean gas; Levantine basin.',
        pandemic_prep:      'Strong R&D; early COVID booster pioneer.',
        nuclear_nonprolif:  'Undeclared nuclear state; not NPT signatory; ambiguity policy.'
      }
    },
    { iso: 'TUR', name: 'Türkiye',           flag: '🇹🇷', region: 'Middle East / Europe', gov: 'Presidential republic',
      gdp_band: 'middle', alliances: ['NATO', 'G20'],
      currentEvents: 'Hosts largest Syrian refugee population; inflation crisis.',
      defaultPositions: {
        climate_action:     'Ratified Paris late; renewable buildout accelerating.',
        refugee_crisis:     'Hosts ~3.6M Syrians; demands more EU burden-sharing.',
        ai_governance:      'Bridge between EU + non-EU frameworks.',
        maritime_disputes:  'Eastern Mediterranean claims; Cyprus dispute.',
        pandemic_prep:      'Regional vaccine producer (TURKOVAC).',
        nuclear_nonprolif:  'NATO host (US weapons); non-nuclear; supports NPT.'
      }
    },
    { iso: 'MEX', name: 'Mexico',            flag: '🇲🇽', region: 'North America', gov: 'Federal presidential',
      gdp_band: 'middle', alliances: ['G20', 'OECD', 'USMCA'],
      currentEvents: 'Migration corridor pressure; energy nationalism debate.',
      defaultPositions: {
        climate_action:     'Renewable potential vast; state energy company priorities tension.',
        refugee_crisis:     'Transit + destination country; Title 42 follow-ons.',
        ai_governance:      'Pro-Global-South voice; data-protection framework.',
        maritime_disputes:  'Gulf of Mexico cooperation with US.',
        pandemic_prep:      'COVAX participant; vaccine manufacturing.',
        nuclear_nonprolif:  'Tlatelolco Treaty leader; strong NPT supporter.'
      }
    },
    { iso: 'ARG', name: 'Argentina',         flag: '🇦🇷', region: 'South America', gov: 'Federal presidential',
      gdp_band: 'middle', alliances: ['G20', 'Mercosur'],
      currentEvents: 'Milei economic shock therapy; pulled back from BRICS+ joining.',
      defaultPositions: {
        climate_action:     'Vaca Muerta shale tension with climate goals.',
        refugee_crisis:     'Bolsonaro/Venezuelan migration; relatively open.',
        ai_governance:      'Latin American AI bloc participant.',
        maritime_disputes:  'Falklands/Malvinas claim ongoing.',
        pandemic_prep:      'mRNA tech-transfer hub ambition.',
        nuclear_nonprolif:  'Tlatelolco Treaty; civilian nuclear program; NPT.'
      }
    },
    { iso: 'IDN', name: 'Indonesia',         flag: '🇮🇩', region: 'Southeast Asia', gov: 'Presidential republic',
      gdp_band: 'middle', alliances: ['ASEAN', 'G20'],
      currentEvents: 'New capital Nusantara; just-transition deal with G7.',
      defaultPositions: {
        climate_action:     'Just-transition deal recipient; coal-exit pathway negotiated.',
        refugee_crisis:     'Rohingya arrivals; not 1951 Convention signatory.',
        ai_governance:      'ASEAN AI guide architect; sovereignty + innovation balance.',
        maritime_disputes:  'South China Sea (Natuna); freedom of navigation.',
        pandemic_prep:      'Regional vaccine producer; ASEAN cooperation.',
        nuclear_nonprolif:  'Non-nuclear; Bangkok Treaty (SE Asia NWFZ).'
      }
    },
    { iso: 'VNM', name: 'Vietnam',           flag: '🇻🇳', region: 'Southeast Asia', gov: 'Communist state',
      gdp_band: 'lower-middle', alliances: ['ASEAN'],
      currentEvents: 'Just-transition deal recipient; balancing China + US.',
      defaultPositions: {
        climate_action:     'JETP recipient; coal-exit pathway with G7 support.',
        refugee_crisis:     'Limited refugee framework.',
        ai_governance:      'Innovation-friendly; ASEAN bloc.',
        maritime_disputes:  'South China Sea (Paracel/Spratly) claims contested with China.',
        pandemic_prep:      'COVID response praised early; ASEAN cooperation.',
        nuclear_nonprolif:  'Non-nuclear; Bangkok Treaty.'
      }
    },
    { iso: 'PHL', name: 'Philippines',       flag: '🇵🇭', region: 'Southeast Asia', gov: 'Presidential republic',
      gdp_band: 'lower-middle', alliances: ['ASEAN', 'US alliance'],
      currentEvents: 'Marcos Jr. tilting closer to US; West Philippine Sea tensions.',
      defaultPositions: {
        climate_action:     'Highly vulnerable to typhoons; loss-and-damage champion.',
        refugee_crisis:     'Limited intake; bilateral arrangements.',
        ai_governance:      'ASEAN bloc participant.',
        maritime_disputes:  'West Philippine Sea (vs China nine-dash); UNCLOS-ruling supporter.',
        pandemic_prep:      'Regional cooperation.',
        nuclear_nonprolif:  'Non-nuclear; Bangkok Treaty.'
      }
    },
    { iso: 'POL', name: 'Poland',            flag: '🇵🇱', region: 'Europe', gov: 'Parliamentary republic',
      gdp_band: 'high', alliances: ['NATO', 'EU'],
      currentEvents: 'Major aid corridor for Ukraine; Russia-border defenses.',
      defaultPositions: {
        climate_action:     'Coal exit slower than EU peers; nuclear program expanding.',
        refugee_crisis:     'Hosted 1M+ Ukrainians; selective on others.',
        ai_governance:      'EU AI Act compliant; security-tilted.',
        maritime_disputes:  'Baltic security focus.',
        pandemic_prep:      'EU framework participant.',
        nuclear_nonprolif:  'Non-nuclear; NATO host; supports NPT.'
      }
    },
    { iso: 'UKR', name: 'Ukraine',           flag: '🇺🇦', region: 'Europe', gov: 'Semi-presidential republic',
      gdp_band: 'middle', alliances: ['EU candidate', 'NATO partner'],
      currentEvents: 'Active war; territorial defense; EU membership trajectory.',
      defaultPositions: {
        climate_action:     'Reconstruction-as-green opportunity; demands climate-aware rebuild aid.',
        refugee_crisis:     'Largest displacement event in Europe since WWII; intake of returnees.',
        ai_governance:      'AI in defense innovation; EU alignment.',
        maritime_disputes:  'Black Sea grain corridor; Crimea status.',
        pandemic_prep:      'WHO regional cooperation.',
        nuclear_nonprolif:  'Voluntarily disarmed under Budapest Memorandum; NPT supporter.'
      }
    },
    { iso: 'NOR', name: 'Norway',            flag: '🇳🇴', region: 'Europe', gov: 'Constitutional monarchy',
      gdp_band: 'high', alliances: ['NATO', 'EEA'],
      currentEvents: 'Sovereign wealth divesting from fossil; EV adoption leader.',
      defaultPositions: {
        climate_action:     'Sovereign wealth fund climate-criteria; 2030 fossil-car ban achieved early.',
        refugee_crisis:     'Generous historically; recent tightening.',
        ai_governance:      'EU AI Act adoption; ethics-first.',
        maritime_disputes:  'Arctic stewardship; Svalbard treaty.',
        pandemic_prep:      'WHO leader; CEPI co-founder.',
        nuclear_nonprolif:  'Non-nuclear; NATO; strong NPT supporter.'
      }
    },
    { iso: 'CHE', name: 'Switzerland',       flag: '🇨🇭', region: 'Europe', gov: 'Federal directorial',
      gdp_band: 'high', alliances: ['EFTA'],
      currentEvents: 'Neutrality test under EU sanctions on Russia; Geneva diplomacy hub.',
      defaultPositions: {
        climate_action:     'Glacier loss visible; net-zero 2050 legal target.',
        refugee_crisis:     'Generous; integration-conditional.',
        ai_governance:      'Neutral convening venue; favors voluntary norms.',
        maritime_disputes:  'Landlocked; mediator role.',
        pandemic_prep:      'WHO host; CEPI partner.',
        nuclear_nonprolif:  'Non-nuclear; mediator on Iran deal; supports NPT.'
      }
    },
    { iso: 'NZL', name: 'New Zealand',       flag: '🇳🇿', region: 'Oceania', gov: 'Parliamentary democracy',
      gdp_band: 'high', alliances: ['Five Eyes', 'Commonwealth'],
      currentEvents: 'Pacific climate-leadership voice; nuclear-free legacy.',
      defaultPositions: {
        climate_action:     'Carbon-neutral 2050; Pacific leadership on loss-and-damage.',
        refugee_crisis:     'Per-capita resettlement leader; family reunification focus.',
        ai_governance:      'Algorithm Charter; ethics-first.',
        maritime_disputes:  'Pacific Islands diplomacy; freedom of navigation.',
        pandemic_prep:      'COVID early elimination strategy; WHO partner.',
        nuclear_nonprolif:  'Nuclear-free zone (1987 Act); strong NPT + TPNW supporter.'
      }
    }
  ];

  function countryById(iso) {
    for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].iso === iso) return COUNTRIES[i];
    return null;
  }

  // ═══════════════════════════════════════════
  // DATA — Agendas (6 substantial topics)
  // Each has:
  //   - id, title, emoji
  //   - background: 2-3 sentence framing for student briefing
  //   - keyQuestions: ~4 questions a delegate should be ready to address
  //   - sampleClauses: 2-3 example resolution clauses (real Model UN language)
  // ═══════════════════════════════════════════
  var AGENDAS = [
    { id: 'climate_action', title: 'Climate Action', emoji: '🌍',
      background: 'Global emissions remain above 1.5°C-compatible trajectories. Loss-and-damage funding pledges have only partly materialized. Tensions persist between developed-country historical responsibility and developing-country growth imperatives.',
      keyQuestions: [
        'How should historical emissions be weighed against current emissions?',
        'Who funds loss-and-damage compensation, and on what criteria?',
        'What mechanisms enforce national emission commitments?',
        'How are just-transition workforce impacts addressed?'
      ],
      sampleClauses: [
        'Calls upon Member States to submit revised Nationally Determined Contributions consistent with the 1.5°C pathway by [date];',
        'Establishes a Loss and Damage Coordination Body to disburse the $100 billion annual climate-finance commitment, with a transparent allocation formula;',
        'Urges development banks to align all new lending portfolios with the Paris Agreement temperature goals.'
      ]
    },
    { id: 'refugee_crisis', title: 'Refugee Crisis & Forced Migration', emoji: '🚶',
      background: 'A record 117 million people are forcibly displaced globally. The 1951 Refugee Convention burden-sharing remains uneven. New climate-displacement and conflict-displacement flows strain host countries.',
      keyQuestions: [
        'How is intake responsibility allocated between countries?',
        'Should climate displacement receive formal refugee protection?',
        'What is the role of regional resettlement frameworks vs global ones?',
        'How are protracted refugee situations (10+ years) addressed?'
      ],
      sampleClauses: [
        'Reaffirms the principle of non-refoulement under the 1951 Convention and 1967 Protocol;',
        'Establishes a Global Climate Displacement Compact with parallel obligations to the Global Compact for Migration;',
        'Urges Member States to expand resettlement quotas by 25% over the next five years.'
      ]
    },
    { id: 'ai_governance', title: 'AI Governance & Frontier Model Risks', emoji: '🤖',
      background: 'Frontier AI systems advance faster than regulatory frameworks. The EU AI Act, US executive orders, and Hiroshima Process diverge in approach. Concerns span misuse, autonomous weapons, labor displacement, and disinformation.',
      keyQuestions: [
        'What is the role of pre-deployment safety evaluations?',
        'How do we govern dual-use research and open-weight models?',
        'Should AI-generated content require labeling under international law?',
        'What protections exist for workers facing AI-driven displacement?'
      ],
      sampleClauses: [
        'Establishes an International AI Safety Institute with mandate for frontier-model evaluation;',
        'Calls upon Member States to require provenance metadata on synthetic media in public elections;',
        'Urges binding limits on lethal autonomous weapons systems consistent with international humanitarian law.'
      ]
    },
    { id: 'maritime_disputes', title: 'Maritime Disputes & Freedom of Navigation', emoji: '⚓',
      background: 'Competing territorial claims in the South China Sea, Eastern Mediterranean, and Arctic strain regional stability. UNCLOS rulings have been unevenly accepted. Critical shipping lanes carry rising commercial and military traffic.',
      keyQuestions: [
        'How should UNCLOS rulings be enforced when major powers reject them?',
        'What status do exclusive economic zones have in disputed waters?',
        'How are Arctic claims to be reconciled with environmental stewardship?',
        'What confidence-building measures reduce naval-incident risk?'
      ],
      sampleClauses: [
        'Reaffirms the centrality of UNCLOS as the legal framework for all maritime activities;',
        'Calls upon all parties in the South China Sea to refrain from unilateral construction and militarization of disputed features;',
        'Establishes a Hotline Mechanism for naval-incident de-escalation in contested waters.'
      ]
    },
    { id: 'pandemic_prep', title: 'Pandemic Preparedness & Health Equity', emoji: '🦠',
      background: 'COVID-19 exposed deep inequities in vaccine access and surveillance capacity. WHO Pandemic Treaty negotiations continue. Antimicrobial resistance and zoonotic spillover risks are rising.',
      keyQuestions: [
        'How are pandemic-counter-measures (vaccines, therapeutics) allocated globally?',
        'What surveillance and reporting obligations apply to all countries?',
        'How is technology transfer for vaccine manufacturing structured?',
        'What is the role of independent inspection of suspected outbreaks?'
      ],
      sampleClauses: [
        'Reaffirms WHO authority as the lead coordinating body for pandemic response;',
        'Establishes a Pandemic Equity Mechanism guaranteeing 30% of pandemic counter-measures to low- and middle-income countries;',
        'Urges Member States to ratify the Pandemic Treaty currently under negotiation.'
      ]
    },
    { id: 'nuclear_nonprolif', title: 'Nuclear Non-Proliferation & Disarmament', emoji: '☢️',
      background: 'The NPT review process faces strain from modernization programs in all five recognized nuclear-weapon states, plus undeclared and threshold states. The TPNW divides nuclear-host states from disarmament advocates.',
      keyQuestions: [
        'How is NPT Article VI (disarmament obligation) verified?',
        'What is the relationship between NPT and TPNW?',
        'How are nuclear-weapon-free zones strengthened?',
        'What confidence-building measures reduce escalation risk?'
      ],
      sampleClauses: [
        'Reaffirms commitments under all three pillars of the NPT;',
        'Calls upon all nuclear-weapon states to refrain from arsenal modernization beyond current stockpile size;',
        'Urges convening of a Conference on a Middle East Zone Free of Weapons of Mass Destruction.'
      ]
    }
  ];

  function agendaById(id) {
    for (var i = 0; i < AGENDAS.length; i++) if (AGENDAS[i].id === id) return AGENDAS[i];
    return null;
  }

  // ═══════════════════════════════════════════
  // DATA — Committees (3 standard MUN committees)
  // Members are ISO codes. Smaller committees = fewer voices but more depth.
  // ═══════════════════════════════════════════
  var COMMITTEES = [
    { id: 'general_assembly', name: 'General Assembly',
      desc: 'The UN\'s main deliberative body — 193 members, one vote each. Broad agenda. Best for full-class debates with diverse positions.',
      capacity: 18, // we cap the simulated GA at 18 countries for usable debate
      members: ['USA','CHN','RUS','GBR','FRA','DEU','JPN','IND','BRA','CAN','AUS','KOR','ZAF','NGA','SAU','MEX','POL','NOR']
    },
    { id: 'security_council', name: 'Security Council',
      desc: 'The body responsible for international peace and security. 15 members: 5 permanent (P5) with veto, 10 rotating. Tense, high-stakes.',
      capacity: 15,
      members: ['USA','CHN','RUS','GBR','FRA','JPN','KOR','BRA','ZAF','MEX','POL','EGY','VNM','PHL','UKR']
    },
    { id: 'human_rights_council', name: 'Human Rights Council',
      desc: 'Promotes and protects human rights globally. 47 members rotating. Often debates refugee, civil-liberty, and accountability issues.',
      capacity: 15,
      members: ['DEU','FRA','GBR','BRA','MEX','ZAF','NGA','KEN','EGY','ARG','IDN','PHL','POL','NOR','NZL']
    }
  ];

  function committeeById(id) {
    for (var i = 0; i < COMMITTEES.length; i++) if (COMMITTEES[i].id === id) return COMMITTEES[i];
    return null;
  }

  // ═══════════════════════════════════════════
  // DEBATE PHASES — state machine identifiers
  // v0.1 implements: setup → assignment → briefing
  // v0.2+ adds: opening_speeches → moderated_caucus → unmod_caucus → draft → amend → vote → debrief
  // ═══════════════════════════════════════════
  var PHASES = {
    SETUP:           'setup',
    ASSIGNMENT:      'assignment',
    BRIEFING:        'briefing',
    OPENING_SPEECHES:'opening_speeches', // future
    MOD_CAUCUS:      'mod_caucus',       // future
    UNMOD_CAUCUS:    'unmod_caucus',     // future
    DRAFT:           'draft',            // future
    AMEND:           'amend',            // future
    VOTE:            'vote',             // future
    DEBRIEF:         'debrief'           // future
  };

  // ═══════════════════════════════════════════
  // Register the plugin with AlloHaven Arcade.
  // ═══════════════════════════════════════════
  function register() {
    window.AlloHavenArcade.registerMode('model-un', {
      label: 'Model UN',
      icon: '🌐',
      blurb: 'Chair a UN committee, assign countries to your students, and run a class-wide debate. AI fills any seats no student is playing.',
      timeCost: 15,
      partnerRequired: false,
      ready: true,
      // Achievement quest hooks — surfaced wherever AlloHaven lists arcade quests.
      // Each hook checks the module-level stats mirror (set by bumpStat in
      // commitSpeech, commitClause, castVote, and reveal-tally).
      questHooks: [
        { id: 'first_speech',     label: 'Deliver your first opening speech',  icon: '🎤',
          check: function() { return !!window.__alloHavenModelUNStats.firstSpeechDelivered; },
          progress: function() { return window.__alloHavenModelUNStats.firstSpeechDelivered ? 'Done!' : 'Not yet'; } },
        { id: 'first_clause',     label: 'Propose your first resolution clause', icon: '📜',
          check: function() { return !!window.__alloHavenModelUNStats.firstClauseProposed; },
          progress: function() { return window.__alloHavenModelUNStats.firstClauseProposed ? 'Done!' : 'Not yet'; } },
        { id: 'first_vote',       label: 'Cast a vote on a resolution',        icon: '🗳',
          check: function() { return !!window.__alloHavenModelUNStats.voteCast; },
          progress: function() { return window.__alloHavenModelUNStats.voteCast ? 'Done!' : 'Not yet'; } },
        { id: 'ai_scaffold',      label: 'Use the AI starter to scaffold a speech (UDL)', icon: '✨',
          check: function() { return !!window.__alloHavenModelUNStats.aiStarterUsed; },
          progress: function() { return window.__alloHavenModelUNStats.aiStarterUsed ? 'Done!' : 'Not yet'; } },
        { id: 'resolution_passed', label: 'Be part of a passed resolution',     icon: '✅',
          check: function() { return (window.__alloHavenModelUNStats.resolutionsPassed || 0) >= 1; },
          progress: function() { return (window.__alloHavenModelUNStats.resolutionsPassed || 0) + ' passed'; } },
        { id: 'three_speeches',   label: 'Deliver 3 speeches total',           icon: '🎙',
          check: function() { return (window.__alloHavenModelUNStats.totalSpeeches || 0) >= 3; },
          progress: function() { return (window.__alloHavenModelUNStats.totalSpeeches || 0) + '/3'; } },
        { id: 'three_clauses',    label: 'Propose 3 clauses total',            icon: '📚',
          check: function() { return (window.__alloHavenModelUNStats.totalClauses || 0) >= 3; },
          progress: function() { return (window.__alloHavenModelUNStats.totalClauses || 0) + '/3'; } }
      ],
      render: function (ctx) {
        var React = ctx.React || window.React;
        var session = ctx.session;
        var inActiveSession = !!(session && session.modeId === 'model-un');
        if (inActiveSession) {
          return React.createElement(ModelUNMain, {
            key: 'mun-' + session.startedAt,
            ctx: ctx
          });
        }
        return React.createElement(ModelUNLauncherCard, { ctx: ctx });
      }
    });
  }

  // ═══════════════════════════════════════════
  // LauncherCard — shown on the arcade hub when no Model UN session active.
  // Follows the boss-encounter launcher's host-vs-student branching pattern.
  // ═══════════════════════════════════════════
  function ModelUNLauncherCard(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var palette = ctx.palette || {};
    var session = ctx.session;
    var disabled = !!session;
    var minutesAsked = 15;
    var tokensCost = Math.ceil(minutesAsked / (ctx.minutesPerToken || 5));
    var canAfford = ctx.tokens >= tokensCost;

    // Subscribe to session to detect class-mode Model UN started by host.
    var sessionStateTuple = useState(null);
    var sessionState = sessionStateTuple[0];
    var setSessionState = sessionStateTuple[1];
    useEffect(function () {
      if (!ctx.sessionCode || typeof ctx.sessionSubscribe !== 'function') return;
      var unsubscribe = ctx.sessionSubscribe(function (data) { setSessionState(data); });
      return typeof unsubscribe === 'function' ? unsubscribe : function () {};
    }, [ctx.sessionCode]);

    var classMUN = sessionState && sessionState.modelUn;
    var hasOpenClassMUN = !!(classMUN && classMUN.status === 'open');
    var isInSession = !!ctx.sessionCode;

    function handleSoloLaunch() {
      if (disabled) return;
      window.__alloHavenModelUNClassMode = null;
      ctx.onLaunch(minutesAsked);
    }
    function handleStartClassSession() {
      if (disabled) return;
      if (typeof ctx.sessionUpdate !== 'function') {
        ctx.addToast('Class mode unavailable — Firestore plumbing missing.');
        return;
      }
      window.__alloHavenModelUNClassMode = {
        role: 'host',
        hostNickname: ctx.studentNickname || 'Chair',
        startedAt: new Date().toISOString()
      };
      ctx.onLaunch(minutesAsked);
    }
    function handleJoinClassSession() {
      if (disabled) return;
      if (!classMUN) {
        ctx.addToast('No Model UN session is active right now.');
        return;
      }
      window.__alloHavenModelUNClassMode = {
        role: 'student',
        hostNickname: classMUN.hostNickname || 'Chair',
        joinFromSession: true,
        startedAt: new Date().toISOString()
      };
      ctx.onLaunch(minutesAsked);
    }

    var bg = palette.surface || '#1e293b';
    var border = palette.surfaceBorder || '#334155';
    var text = palette.textPrimary || '#e2e8f0';
    var textMuted = palette.textSecondary || '#94a3b8';
    var accent = '#0ea5e9';

    return h('div', {
      style: {
        padding: '14px',
        background: bg,
        border: '1px solid ' + border,
        borderRadius: '14px',
        color: text,
        opacity: disabled ? 0.5 : 1
      }
    },
      // Header
      h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' } },
        h('span', { style: { fontSize: '28px' } }, '🌐'),
        h('div', null,
          h('div', { style: { fontWeight: 800, fontSize: '15px' } }, 'Model UN'),
          h('div', { style: { fontSize: '11px', color: textMuted } }, tokensCost + ' 🪙 · ~' + minutesAsked + ' min')
        )
      ),
      h('p', { style: { fontSize: '12px', color: textMuted, lineHeight: 1.55, marginBottom: '12px' } },
        'Chair a UN committee. Each student plays a country; AI fills any seats no student is playing. Pick a committee, an agenda, and run the debate.'),

      // Host class-session CTA
      isInSession && ctx.isHost && !hasOpenClassMUN && h('button', {
        onClick: handleStartClassSession,
        disabled: disabled || !canAfford,
        'aria-label': 'Start a class Model UN session for session ' + ctx.sessionCode,
        style: {
          width: '100%', padding: '10px 12px',
          background: accent, color: '#fff', border: 'none',
          borderRadius: '10px', fontWeight: 700, fontSize: '13px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          marginBottom: '8px'
        }
      },
        '🌐 Start class Model UN (session ' + ctx.sessionCode + ')'
      ),

      // Student join CTA
      isInSession && !ctx.isHost && hasOpenClassMUN && h('button', {
        onClick: handleJoinClassSession,
        disabled: disabled,
        'aria-label': 'Join the class Model UN: ' + (classMUN && classMUN.agenda ? classMUN.agenda : ''),
        style: {
          width: '100%', padding: '10px 12px',
          background: '#16a34a', color: '#fff', border: 'none',
          borderRadius: '10px', fontWeight: 700, fontSize: '13px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          marginBottom: '8px'
        }
      },
        '🌐 Join class Model UN'
      ),

      // Solo CTA
      h('button', {
        onClick: handleSoloLaunch,
        disabled: disabled || !canAfford,
        'aria-label': 'Start a solo Model UN simulation',
        style: {
          width: '100%', padding: '10px 12px',
          background: 'rgba(14,165,233,0.18)', color: text,
          border: '1px solid ' + accent,
          borderRadius: '10px', fontWeight: 600, fontSize: '12px',
          cursor: (disabled || !canAfford) ? 'not-allowed' : 'pointer'
        }
      },
        canAfford ? '🎓 Solo simulation (you + AI delegates)' : 'Need ' + tokensCost + ' 🪙 to start'
      ),

      // In-session status footer
      isInSession && h('div', { style: { marginTop: '10px', fontSize: '11px', color: textMuted } },
        'In session ', h('strong', null, ctx.sessionCode), '. ',
        ctx.isHost ? '(Host — you can start a class session.)' : (hasOpenClassMUN ? '(A class Model UN is in progress.)' : '(Waiting for host.)')
      )
    );
  }

  // ═══════════════════════════════════════════
  // ModelUNMain — the active encounter component.
  // Internally branches by `phase`: setup → assignment → briefing → … (v0.2+)
  // ═══════════════════════════════════════════
  function ModelUNMain(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var palette = ctx.palette || {};
    var classModeFlag = window.__alloHavenModelUNClassMode || null;
    var isHost = !!(classModeFlag && classModeFlag.role === 'host');
    var isClassStudent = !!(classModeFlag && classModeFlag.role === 'student');
    var isSolo = !classModeFlag;

    // Subscribe to session doc for live updates (class mode only).
    var sessionStateTuple = useState(null);
    var sessionState = sessionStateTuple[0];
    var setSessionState = sessionStateTuple[1];
    useEffect(function () {
      if (isSolo || !ctx.sessionCode || typeof ctx.sessionSubscribe !== 'function') return;
      var unsubscribe = ctx.sessionSubscribe(function (data) { setSessionState(data); });
      return typeof unsubscribe === 'function' ? unsubscribe : function () {};
    }, [ctx.sessionCode, isSolo]);

    // Local-only state for solo mode (mirror of what would live in session for class).
    var localStateTuple = useState({
      status: 'open',
      committeeId: null,
      agendaId: null,
      phase: PHASES.SETUP,
      assignedCountries: {}, // { uid → iso }   in solo: { 'me' → iso, ai_NOR → 'NOR', ... }
      aiFillsEmpty: true,
      assignmentMode: 'teacher', // 'teacher' | 'random' | 'student-pick'
      startedAt: classModeFlag ? classModeFlag.startedAt : new Date().toISOString()
    });
    var localState = localStateTuple[0];
    var setLocalState = localStateTuple[1];

    // The state we display is either the session state (class mode) or local (solo).
    var modelUn = isSolo ? localState : (sessionState && sessionState.modelUn) || null;

    // For class students who arrive before host has initialized state.
    if (!modelUn) {
      if (isClassStudent) {
        return h('div', { style: { padding: 20, textAlign: 'center', color: '#cbd5e1' } },
          h('div', { style: { fontSize: 36, marginBottom: 10 } }, '🌐'),
          h('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'Waiting for the Chair…'),
          h('p', { style: { fontSize: 12, color: '#94a3b8' } }, 'The teacher is setting up the committee. Your country assignment will appear here when ready.')
        );
      }
      // Host fallthrough — initialize session
      if (isHost && typeof ctx.sessionUpdate === 'function') {
        var initState = {
          status: 'open',
          modeId: 'model-un',
          hostNickname: classModeFlag.hostNickname,
          startedAt: classModeFlag.startedAt,
          committeeId: null, agendaId: null, phase: PHASES.SETUP,
          assignedCountries: {},
          aiFillsEmpty: true,
          assignmentMode: 'teacher'
        };
        ctx.sessionUpdate({ modelUn: initState });
      }
      // Show loading
      return h('div', { style: { padding: 20, textAlign: 'center', color: '#cbd5e1' } }, 'Setting up…');
    }

    // Helper: write to session (class) or local (solo)
    function updateMUN(patch) {
      if (isSolo) {
        setLocalState(function (prev) {
          var next = Object.assign({}, prev, patch);
          // Nested merge for assignedCountries
          if (patch.assignedCountries) {
            next.assignedCountries = Object.assign({}, prev.assignedCountries || {}, patch.assignedCountries);
          }
          return next;
        });
      } else if (typeof ctx.sessionUpdate === 'function') {
        var merged = Object.assign({}, modelUn, patch);
        if (patch.assignedCountries) {
          merged.assignedCountries = Object.assign({}, modelUn.assignedCountries || {}, patch.assignedCountries);
        }
        ctx.sessionUpdate({ modelUn: merged });
      }
    }

    // Phase branching
    var phase = modelUn.phase || PHASES.SETUP;
    if (phase === PHASES.SETUP) {
      return h(SetupView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, classModeFlag: classModeFlag });
    }
    if (phase === PHASES.ASSIGNMENT) {
      return h(AssignmentView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState });
    }
    if (phase === PHASES.BRIEFING) {
      return h(BriefingView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState });
    }
    if (phase === PHASES.OPENING_SPEECHES) {
      return h(OpeningSpeechesView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState });
    }
    if (phase === PHASES.DRAFT) {
      return h(DraftResolutionView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState });
    }
    if (phase === PHASES.VOTE) {
      return h(VotingView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState });
    }
    if (phase === PHASES.DEBRIEF) {
      return h(DebriefView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState });
    }

    // Future phases — placeholder
    return h('div', { style: { padding: 20, textAlign: 'center', color: '#cbd5e1' } },
      h('div', { style: { fontSize: 40, marginBottom: 8 } }, '🚧'),
      h('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'Phase "' + phase + '" coming soon'),
      h('p', { style: { fontSize: 12, color: '#94a3b8' } }, 'Caucus, voting, and debrief phases ship in the next update. For now, opening speeches are the end of v0.2.'),
      (isHost || isSolo) && h('button', {
        onClick: function() { updateMUN({ phase: PHASES.OPENING_SPEECHES }); },
        style: { marginTop: 12, padding: '8px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }
      }, '← Back to Opening Speeches')
    );
  }

  // ═══════════════════════════════════════════
  // SetupView — host (or solo) picks committee + agenda
  // ═══════════════════════════════════════════
  function SetupView(props) {
    var React = window.React;
    var h = React.createElement;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;

    function pickCommittee(id) { updateMUN({ committeeId: id }); }
    function pickAgenda(id) { updateMUN({ agendaId: id }); }
    function pickAssignmentMode(mode) { updateMUN({ assignmentMode: mode }); }
    function toggleAIFills() { updateMUN({ aiFillsEmpty: !modelUn.aiFillsEmpty }); }
    function advance() {
      if (!modelUn.committeeId) { ctx.addToast('Pick a committee first'); return; }
      if (!modelUn.agendaId) { ctx.addToast('Pick an agenda first'); return; }
      updateMUN({ phase: PHASES.ASSIGNMENT });
    }

    if (!isHost) {
      return h('div', { style: { padding: 20, textAlign: 'center', color: '#cbd5e1' } },
        h('div', { style: { fontSize: 36 } }, '⏳'),
        h('div', { style: { marginTop: 8, fontWeight: 700 } }, 'Chair is configuring the committee…'),
        h('p', { style: { fontSize: 12, color: '#94a3b8' } }, 'You\'ll see the agenda and your assignment shortly.')
      );
    }

    return h('div', { style: { padding: '18px', color: '#e2e8f0', maxWidth: 720, margin: '0 auto' } },
      h('h2', { style: { fontSize: 22, fontWeight: 800, marginBottom: 4 } }, '🌐 Model UN Setup'),
      h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 20 } },
        props.isSolo
          ? 'Solo mode — you\'ll play one country; AI plays the rest.'
          : 'You are chairing the committee. Students join with code ' + (ctx.sessionCode || '—') + '.'
      ),

      // Step 1 — Committee
      h('h3', { style: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#7dd3fc' } }, '1. Pick a committee'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 22 } },
        COMMITTEES.map(function(c) {
          var picked = modelUn.committeeId === c.id;
          return h('button', {
            key: c.id, onClick: function() { pickCommittee(c.id); },
            style: {
              padding: 12, textAlign: 'left',
              background: picked ? 'rgba(14,165,233,0.18)' : 'rgba(255,255,255,0.04)',
              border: '2px solid ' + (picked ? '#0ea5e9' : '#334155'),
              borderRadius: 10, color: '#e2e8f0', cursor: 'pointer'
            }
          },
            h('div', { style: { fontWeight: 800, fontSize: 13 } }, c.name),
            h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, c.capacity + ' seats'),
            h('div', { style: { fontSize: 11, marginTop: 6, lineHeight: 1.4, color: '#cbd5e1' } }, c.desc)
          );
        })
      ),

      // Step 2 — Agenda
      h('h3', { style: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#7dd3fc' } }, '2. Pick an agenda'),
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10, marginBottom: 22 } },
        AGENDAS.map(function(a) {
          var picked = modelUn.agendaId === a.id;
          return h('button', {
            key: a.id, onClick: function() { pickAgenda(a.id); },
            style: {
              padding: 10, textAlign: 'left',
              background: picked ? 'rgba(14,165,233,0.18)' : 'rgba(255,255,255,0.04)',
              border: '2px solid ' + (picked ? '#0ea5e9' : '#334155'),
              borderRadius: 10, color: '#e2e8f0', cursor: 'pointer'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13 } },
              h('span', null, a.emoji), h('span', null, a.title)
            ),
            h('div', { style: { fontSize: 11, marginTop: 6, lineHeight: 1.4, color: '#cbd5e1' } }, a.background)
          );
        })
      ),

      // Step 3 — Assignment mode + AI toggle
      h('h3', { style: { fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#7dd3fc' } }, '3. Country assignment'),
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' } },
        [
          { id: 'teacher', label: 'I\'ll assign each student' },
          { id: 'random',  label: 'Randomize for me' },
          { id: 'student-pick', label: 'Students pick (first-come)' }
        ].map(function(m) {
          var picked = modelUn.assignmentMode === m.id;
          return h('button', {
            key: m.id, onClick: function() { pickAssignmentMode(m.id); },
            style: {
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              background: picked ? '#0ea5e9' : 'rgba(255,255,255,0.04)',
              color: picked ? '#fff' : '#cbd5e1',
              border: '1px solid ' + (picked ? '#0ea5e9' : '#334155'),
              borderRadius: 8, cursor: 'pointer'
            }
          }, m.label);
        })
      ),
      h('label', { style: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1', marginBottom: 24, cursor: 'pointer' } },
        h('input', {
          type: 'checkbox', checked: !!modelUn.aiFillsEmpty, onChange: toggleAIFills
        }),
        'AI plays any country not assigned to a student (recommended)'
      ),

      // Advance
      h('button', {
        onClick: advance,
        disabled: !modelUn.committeeId || !modelUn.agendaId,
        style: {
          padding: '10px 18px', fontSize: 14, fontWeight: 700,
          background: (modelUn.committeeId && modelUn.agendaId) ? '#0ea5e9' : '#475569',
          color: '#fff', border: 'none', borderRadius: 10,
          cursor: (modelUn.committeeId && modelUn.agendaId) ? 'pointer' : 'not-allowed'
        }
      }, 'Continue to Assignment →')
    );
  }

  // ═══════════════════════════════════════════
  // AssignmentView — committee roster with country chips.
  // Host clicks an empty chip + a student name to assign. Or "Randomize all".
  // AI fills any unassigned chips when host clicks "Lock roster".
  // ═══════════════════════════════════════════
  function AssignmentView(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var sessionState = props.sessionState;

    var committee = committeeById(modelUn.committeeId);
    var agenda = agendaById(modelUn.agendaId);
    var assigned = modelUn.assignedCountries || {};

    // Roster of human participants from session
    var roster = (sessionState && sessionState.roster) || {};
    var rosterEntries = Object.keys(roster).map(function(uid) { return { uid: uid, name: (roster[uid] && roster[uid].name) || uid }; });
    if (props.isSolo) {
      // Solo: one human (the player), the rest filled by AI
      rosterEntries = [{ uid: 'me', name: ctx.studentNickname || 'You' }];
    }

    // selectedStudent for the host's "click chip → assign this student" flow
    var selStuTuple = useState(null);
    var selectedStu = selStuTuple[0];
    var setSelectedStu = selStuTuple[1];

    function assignTo(iso, uid) {
      var next = {};
      // Remove any previous assignment for this uid OR this iso (re-assignments)
      Object.keys(assigned).forEach(function(k) {
        if (assigned[k] === iso || k === uid) return;
        next[k] = assigned[k];
      });
      next[uid] = iso;
      updateMUN({ assignedCountries: next });
      setSelectedStu(null);
    }
    function unassign(iso) {
      var owner = null;
      Object.keys(assigned).forEach(function(k) { if (assigned[k] === iso) owner = k; });
      if (!owner) return;
      var next = {};
      Object.keys(assigned).forEach(function(k) { if (k !== owner) next[k] = assigned[k]; });
      updateMUN({ assignedCountries: next });
    }
    function randomizeAll() {
      // Randomly assign one country per student. Capped at min(students, committee.capacity).
      var pool = committee.members.slice();
      // Shuffle
      for (var i = pool.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
      }
      var next = {};
      rosterEntries.forEach(function(stu, idx) {
        if (idx < pool.length) next[stu.uid] = pool[idx];
      });
      updateMUN({ assignedCountries: next });
    }
    function lockRosterAndAdvance() {
      // Fill empty seats with AI if toggle is on
      if (modelUn.aiFillsEmpty) {
        var taken = {};
        Object.keys(assigned).forEach(function(uid) { taken[assigned[uid]] = true; });
        var aiAssignments = {};
        committee.members.forEach(function(iso) {
          if (!taken[iso]) aiAssignments['ai_' + iso] = iso;
        });
        updateMUN({ assignedCountries: aiAssignments, phase: PHASES.BRIEFING });
      } else {
        updateMUN({ phase: PHASES.BRIEFING });
      }
    }

    if (!isHost) {
      // Student view of assignment
      var myUid = ctx.userId || 'me';
      var myIso = assigned[myUid];
      var myCountry = myIso ? countryById(myIso) : null;
      return h('div', { style: { padding: 20, color: '#cbd5e1', textAlign: 'center' } },
        h('div', { style: { fontSize: 40 } }, agenda ? agenda.emoji : '🌐'),
        h('h2', { style: { fontSize: 18, fontWeight: 800, marginTop: 8 } }, agenda ? agenda.title : 'Model UN'),
        h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, committee ? committee.name : ''),
        myCountry
          ? h('div', { style: { marginTop: 24, padding: 16, background: 'rgba(16,185,129,0.12)', border: '2px solid #10b981', borderRadius: 12, maxWidth: 400, margin: '24px auto' } },
              h('div', { style: { fontSize: 11, color: '#10b981', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, 'You are the delegate for'),
              h('div', { style: { fontSize: 36, marginTop: 8 } }, myCountry.flag),
              h('div', { style: { fontSize: 20, fontWeight: 800, marginTop: 4 } }, myCountry.name),
              h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 8 } }, myCountry.gov + ' · ' + myCountry.region)
            )
          : h('div', { style: { marginTop: 24, color: '#94a3b8', fontSize: 13 } }, 'Awaiting your assignment from the Chair…')
      );
    }

    return h('div', { style: { padding: '18px', color: '#e2e8f0', maxWidth: 900, margin: '0 auto' } },
      h('h2', { style: { fontSize: 20, fontWeight: 800, marginBottom: 4 } },
        (agenda ? agenda.emoji + ' ' : '') + (committee ? committee.name : 'Committee') + ' — Country Assignment'
      ),
      h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 16 } },
        'Tap a student → tap a country chip to assign. Or use Randomize. AI will fill any empty seats when you lock the roster.'
      ),

      // Quick actions
      h('div', { style: { display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' } },
        h('button', {
          onClick: randomizeAll,
          style: { padding: '6px 14px', fontSize: 12, fontWeight: 700, background: '#a855f7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, '🎲 Randomize all students'),
        h('button', {
          onClick: function() { updateMUN({ assignedCountries: {} }); setSelectedStu(null); },
          style: { padding: '6px 14px', fontSize: 12, fontWeight: 700, background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer' }
        }, '↻ Clear assignments')
      ),

      // Students column
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 } },
        // Left — students
        h('div', null,
          h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Students (' + rosterEntries.length + ')'
          ),
          rosterEntries.length === 0
            ? h('div', { style: { padding: 12, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } },
                'No students joined yet. Share session code ' + (ctx.sessionCode || '') + '.')
            : rosterEntries.map(function(stu) {
                var stuIso = assigned[stu.uid];
                var stuCountry = stuIso ? countryById(stuIso) : null;
                var isSelected = selectedStu === stu.uid;
                return h('button', {
                  key: stu.uid,
                  onClick: function() { setSelectedStu(isSelected ? null : stu.uid); },
                  style: {
                    width: '100%', textAlign: 'left', padding: 10, marginBottom: 6,
                    background: isSelected ? 'rgba(14,165,233,0.2)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid ' + (isSelected ? '#0ea5e9' : '#334155'),
                    borderRadius: 8, color: '#e2e8f0', cursor: 'pointer'
                  }
                },
                  h('div', { style: { fontSize: 13, fontWeight: 700 } }, stu.name),
                  stuCountry
                    ? h('div', { style: { fontSize: 11, color: '#10b981', marginTop: 2 } }, stuCountry.flag + ' ' + stuCountry.name)
                    : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, 'Unassigned')
                );
              })
        ),
        // Right — country chips
        h('div', null,
          h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            committee ? committee.name + ' seats (' + committee.members.length + ')' : 'Seats'
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 6 } },
            committee && committee.members.map(function(iso) {
              var country = countryById(iso);
              if (!country) return null;
              var ownerUid = null;
              Object.keys(assigned).forEach(function(k) { if (assigned[k] === iso) ownerUid = k; });
              var ownerName = ownerUid ? (rosterEntries.find ? rosterEntries.find(function(s) { return s.uid === ownerUid; }) : null) : null;
              var isAiSeat = ownerUid && ownerUid.indexOf('ai_') === 0;
              var assignedTaken = !!ownerUid;
              return h('button', {
                key: iso,
                onClick: function() {
                  if (selectedStu) {
                    if (assignedTaken) return; // already assigned
                    assignTo(iso, selectedStu);
                  } else if (assignedTaken) {
                    unassign(iso);
                  }
                },
                style: {
                  padding: 8, textAlign: 'center',
                  background: assignedTaken
                    ? (isAiSeat ? 'rgba(167,139,250,0.15)' : 'rgba(16,185,129,0.15)')
                    : (selectedStu ? 'rgba(14,165,233,0.10)' : 'rgba(255,255,255,0.03)'),
                  border: '1px solid ' + (assignedTaken
                    ? (isAiSeat ? '#a855f7' : '#10b981')
                    : (selectedStu ? '#0ea5e9' : '#334155')),
                  borderRadius: 6, color: '#e2e8f0',
                  cursor: (selectedStu || assignedTaken) ? 'pointer' : 'default',
                  fontSize: 11, fontWeight: 600
                },
                title: country.name + (ownerName ? ' (' + ownerName.name + ')' : '')
              },
                h('div', { style: { fontSize: 20 } }, country.flag),
                h('div', { style: { fontSize: 10, marginTop: 2 } }, country.iso),
                ownerName && h('div', { style: { fontSize: 9, color: '#10b981', marginTop: 2 } }, ownerName.name.slice(0, 10))
              );
            })
          )
        )
      ),

      // Lock + advance
      h('div', { style: { marginTop: 24, display: 'flex', gap: 8, justifyContent: 'flex-end' } },
        h('button', {
          onClick: function() { updateMUN({ phase: PHASES.SETUP }); },
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }
        }, '← Back to Setup'),
        h('button', {
          onClick: lockRosterAndAdvance,
          style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Lock roster → Briefing →')
      )
    );
  }

  // ═══════════════════════════════════════════
  // BriefingView — country profile (your seat) + agenda background visible to all.
  // For the host: list of all assignments + agenda details.
  // For students: their own country profile prominent + agenda background.
  // ═══════════════════════════════════════════
  function BriefingView(props) {
    var React = window.React;
    var h = React.createElement;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var sessionState = props.sessionState;

    var committee = committeeById(modelUn.committeeId);
    var agenda = agendaById(modelUn.agendaId);
    var assigned = modelUn.assignedCountries || {};

    var myUid = isSolo ? 'me' : (ctx.userId || 'me');
    var myIso = assigned[myUid];
    var myCountry = myIso ? countryById(myIso) : null;

    return h('div', { style: { padding: 18, color: '#e2e8f0', maxWidth: 900, margin: '0 auto' } },
      // Top banner
      h('div', { style: { marginBottom: 16, padding: 14, background: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 100%)', borderRadius: 12 } },
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, committee ? committee.name : ''),
        h('h2', { style: { fontSize: 22, fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 } },
          agenda && h('span', null, agenda.emoji),
          h('span', null, agenda ? agenda.title : 'Agenda')
        )
      ),

      // My-country card (for student / solo) at top
      myCountry && h('div', { style: { padding: 16, background: 'rgba(16,185,129,0.10)', border: '2px solid #10b981', borderRadius: 12, marginBottom: 16 } },
        h('div', { style: { fontSize: 11, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 } },
          'You are the delegate for'
        ),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('span', { style: { fontSize: 44 } }, myCountry.flag),
          h('div', null,
            h('div', { style: { fontWeight: 800, fontSize: 18 } }, myCountry.name),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } },
              myCountry.gov + ' · ' + myCountry.region + ' · ' + (myCountry.alliances || []).join(', ')
            )
          )
        ),
        h('div', { style: { marginTop: 12, padding: 10, background: 'rgba(0,0,0,0.18)', borderRadius: 8 } },
          h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } }, 'Current Events Anchor'),
          h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#cbd5e1', margin: 0 } }, myCountry.currentEvents)
        ),
        agenda && myCountry.defaultPositions && myCountry.defaultPositions[agenda.id] && h('div', { style: { marginTop: 10, padding: 10, background: 'rgba(0,0,0,0.18)', borderRadius: 8 } },
          h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } }, 'Your country\'s default stance on this agenda'),
          h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#fef3c7', margin: 0 } }, myCountry.defaultPositions[agenda.id])
        )
      ),

      // Agenda briefing card
      agenda && h('div', { style: { padding: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 } }, 'Agenda Background'),
        h('p', { style: { fontSize: 13, lineHeight: 1.7, color: '#cbd5e1' } }, agenda.background),
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 6 } }, 'Key Questions'),
        h('ul', { style: { fontSize: 12, lineHeight: 1.7, color: '#cbd5e1', paddingLeft: 18, margin: 0 } },
          agenda.keyQuestions.map(function(q, qi) { return h('li', { key: qi }, q); })
        ),
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 6 } }, 'Sample Operative Clauses (real MUN format)'),
        h('ul', { style: { fontSize: 12, lineHeight: 1.7, color: '#fef3c7', paddingLeft: 18, margin: 0, fontStyle: 'italic' } },
          agenda.sampleClauses.map(function(c, ci) { return h('li', { key: ci }, c); })
        )
      ),

      // Host roster overview
      isHost && h('div', { style: { padding: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid #334155', borderRadius: 12, marginBottom: 16 } },
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 } },
          'Roll Call (' + Object.keys(assigned).length + ' / ' + (committee ? committee.members.length : 0) + ' seats filled)'
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 6 } },
          Object.keys(assigned).map(function(uid) {
            var iso = assigned[uid];
            var country = countryById(iso);
            if (!country) return null;
            var isAi = uid.indexOf('ai_') === 0;
            var roster = (sessionState && sessionState.roster) || {};
            var name = isAi ? 'AI' : (roster[uid] ? roster[uid].name : (isSolo && uid === 'me' ? (ctx.studentNickname || 'You') : uid));
            return h('div', {
              key: uid,
              style: {
                padding: 8, background: 'rgba(0,0,0,0.18)', borderRadius: 6,
                borderLeft: '3px solid ' + (isAi ? '#a855f7' : '#10b981'),
                fontSize: 11
              }
            },
              h('div', null, country.flag + ' ', h('strong', null, country.name)),
              h('div', { style: { color: isAi ? '#a855f7' : '#10b981', fontSize: 10, marginTop: 2 } }, isAi ? '🤖 AI delegate' : '👤 ' + name)
            );
          })
        )
      ),

      // Continue / Phase navigation
      isHost && h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between' } },
        h('button', {
          onClick: function() { updateMUN({ phase: PHASES.ASSIGNMENT }); },
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }
        }, '← Back to Assignment'),
        h('button', {
          onClick: function() { updateMUN({ phase: PHASES.OPENING_SPEECHES, currentSpeakerUid: null, speechCount: 0 }); },
          style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Begin Opening Speeches →')
      ),
      !isHost && h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 12 } },
        'Waiting for the Chair to open the debate…'
      )
    );
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Generate a delegate speech in-character.
  // Uses jsonMode=true with the proven Sage/SpaceExplorer parsing pattern:
  // strip code fences, extract by outer braces, validate shape, silent fallback.
  // ═══════════════════════════════════════════
  function aiGenerateDelegateSpeech(ctx, country, agenda, committee, recentSpeeches) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda) {
      return Promise.resolve(null);
    }
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var historyText = '';
    if (recentSpeeches && recentSpeeches.length > 0) {
      historyText = recentSpeeches.slice(-3).map(function(s) {
        return '- ' + s.country + ': ' + (s.text || '').slice(0, 200) + (s.text && s.text.length > 200 ? '…' : '');
      }).join('\n');
    }
    var prompt = [
      'You are the delegate from ' + country.name + ' speaking on "' + agenda.title + '" in the ' + (committee ? committee.name : 'committee') + '.',
      '',
      'Your country profile:',
      '- Government: ' + country.gov,
      '- Region: ' + country.region,
      '- Alliances: ' + (country.alliances || []).join(', '),
      '- Current events: ' + country.currentEvents,
      '',
      'Your country\'s default stance on this agenda: ' + stance,
      '',
      recentSpeeches && recentSpeeches.length > 0 ? 'Recent speeches in the chamber:\n' + historyText + '\n' : '',
      'Give a 2-3 paragraph OPENING SPEECH in diplomatic Model UN style. Include:',
      '  1. One specific argument grounded in your country\'s national interest',
      '  2. One acknowledgment of an opposing view (diplomatic concession)',
      '  3. One concrete proposal or call to action',
      '',
      'Speak in first person plural ("We", "Our delegation", "The delegate of ' + country.name + '"). 120-180 words total.',
      '',
      'Return ONLY a JSON object in this exact shape:',
      '{',
      '  "text": "the full speech body (120-180 words)",',
      '  "keyPoints": ["one-line argument", "one-line concession", "one-line proposal"]',
      '}',
      '',
      'No markdown, no code fences. JSON only.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var sliced = raw.substring(s, e + 1);
      var parsed; try { parsed = JSON.parse(sliced); } catch (err) { return null; }
      if (!parsed || typeof parsed.text !== 'string' || parsed.text.length < 30) return null;
      return {
        text: parsed.text.slice(0, 1500), // cap length per session-doc budget
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 5).map(String) : []
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Suggest a resolution clause in proper MUN format.
  // Returns { text, type: 'preamble'|'operative', perspective } or null.
  // ═══════════════════════════════════════════
  function aiSuggestResolutionClause(ctx, fromCountry, agenda, committee, existingClauses) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !agenda) return Promise.resolve(null);
    var stance = (fromCountry && fromCountry.defaultPositions && fromCountry.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var existingText = (existingClauses || []).slice(0, 8).map(function(c, i) {
      return (i + 1) + '. ' + (c.text || '').slice(0, 200);
    }).join('\n');
    var prompt = [
      'You are drafting a resolution clause for a Model UN ' + (committee ? committee.name : 'committee') + ' debate on "' + agenda.title + '".',
      fromCountry ? ('Drafting from the perspective of ' + fromCountry.name + ' (stance: ' + stance + ').') : '',
      '',
      existingText ? 'Existing clauses already on the floor:\n' + existingText + '\n' : '',
      'Propose ONE NEW clause in proper Model UN format. Choose either:',
      '  - PREAMBULATORY (starts with an italicized -ing or -ed word like "Acknowledging,", "Recognizing,", "Recalling,", "Concerned by,")',
      '  - OPERATIVE (starts with a numbered action verb like "Calls upon", "Urges", "Establishes", "Encourages", "Requests")',
      '',
      'Constraints:',
      '- 25-70 words',
      '- Must be substantive, not boilerplate',
      '- Should ADD a new dimension, not restate existing clauses',
      fromCountry ? ('- Reflect ' + fromCountry.name + '\'s diplomatic interests credibly') : '',
      '',
      'Return ONLY a JSON object:',
      '{',
      '  "text": "the full clause text",',
      '  "type": "preamble" or "operative",',
      '  "perspective": "1-sentence explanation of which countries this clause favors and why"',
      '}'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.text !== 'string' || parsed.text.length < 15) return null;
      var type = parsed.type === 'preamble' ? 'preamble' : 'operative';
      return {
        text: parsed.text.slice(0, 500),
        type: type,
        perspective: typeof parsed.perspective === 'string' ? parsed.perspective.slice(0, 200) : ''
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — How does an AI-played country vote on the resolution?
  // Returns { vote: 'Y'|'N'|'A', reasoning } or a deterministic fallback.
  // ═══════════════════════════════════════════
  function aiVoteDelegate(ctx, country, agenda, clauses) {
    // Fast path: if no AI, fall back to a deterministic stance-based vote.
    function fallback() {
      // Crude: count operative clauses with words that match country stance keywords.
      // Default to abstention to keep the simulation tame.
      return Promise.resolve({ vote: 'A', reasoning: '(AI unavailable — defaulted to abstention)' });
    }
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda) return fallback();
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var clauseText = (clauses || []).map(function(c, i) {
      return (i + 1) + '. [' + (c.type === 'preamble' ? 'PRE' : 'OP') + '] ' + (c.text || '').slice(0, 280);
    }).join('\n');
    var prompt = [
      'You are the delegate from ' + country.name + ' voting on a Model UN resolution about "' + agenda.title + '".',
      'Your country\'s default stance: ' + stance,
      'Country alliances: ' + (country.alliances || []).join(', '),
      '',
      'Full draft resolution clauses:',
      clauseText || '(no clauses)',
      '',
      'Cast your vote: Y (yes), N (no), or A (abstain). Be consistent with your country\'s national interest and stance.',
      '',
      'Return ONLY a JSON object:',
      '{',
      '  "vote": "Y" or "N" or "A",',
      '  "reasoning": "1-2 sentence diplomatic explanation in first person plural"',
      '}'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return fallback();
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return fallback(); }
      var vote = (parsed && parsed.vote || '').toString().toUpperCase().charAt(0);
      if (vote !== 'Y' && vote !== 'N' && vote !== 'A') return fallback();
      return {
        vote: vote,
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 300) : ''
      };
    }).catch(function() { return fallback(); });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Coach feedback for the student at debrief.
  // Analyzes consistency between speeches + final vote + country position.
  // ═══════════════════════════════════════════
  function aiCoachFeedback(ctx, country, agenda, mySpeeches, myVote, classOutcome) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda) {
      return Promise.resolve({
        strengths: ['Participated as ' + (country ? country.name : 'a delegate') + ' through the full debate.'],
        areas: ['No AI coach available — review your speeches against your country\'s stance manually.'],
        consistencyScore: null
      });
    }
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var speechText = (mySpeeches || []).map(function(s, i) {
      return 'Speech ' + (i + 1) + ': ' + (s.text || '').slice(0, 400);
    }).join('\n\n') || '(no speeches given)';
    var prompt = [
      'You are a Model UN coach evaluating a student delegate.',
      '',
      'Student played: ' + country.name + ' on the agenda "' + agenda.title + '".',
      'Country\'s default stance: ' + stance,
      '',
      'Student\'s speeches:',
      speechText,
      '',
      'Student\'s final vote on the resolution: ' + (myVote || '(did not vote)'),
      'Resolution outcome: ' + (classOutcome || 'unknown'),
      '',
      'Evaluate the student\'s performance with HONESTY (not just praise). Look for:',
      '- Diplomatic consistency: did their statements match their country\'s stance?',
      '- Did their vote align with their stated positions?',
      '- Were arguments specific (cited national interest, alliances, real-world context) or generic?',
      '- Did they engage with opposing views (concessions, counterproposals)?',
      '',
      'Return ONLY a JSON object:',
      '{',
      '  "consistencyScore": 0-100,',
      '  "strengths": ["2-3 specific strength bullets, each one sentence"],',
      '  "areas": ["1-3 specific growth bullets, each one sentence"],',
      '  "verdict": "1-2 sentence overall coaching note"',
      '}'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed) return null;
      return {
        consistencyScore: typeof parsed.consistencyScore === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.consistencyScore))) : null,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
        areas: Array.isArray(parsed.areas) ? parsed.areas.slice(0, 4).map(String) : [],
        verdict: typeof parsed.verdict === 'string' ? parsed.verdict.slice(0, 400) : ''
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Suggest an amendment to an existing clause.
  // Three amendment types in real MUN: STRIKE (delete), ADD (insert), MODIFY (rewrite).
  // Returns { type: 'strike'|'add'|'modify', text, rationale } or null.
  // ═══════════════════════════════════════════
  function aiSuggestAmendment(ctx, fromCountry, agenda, originalClause) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !originalClause) return Promise.resolve(null);
    var stance = (fromCountry && fromCountry.defaultPositions && fromCountry.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var prompt = [
      'You are proposing an AMENDMENT to a Model UN resolution clause.',
      fromCountry ? ('You are the delegate from ' + fromCountry.name + '. Your stance: ' + stance) : '',
      'Agenda: ' + agenda.title,
      '',
      'Original clause (' + (originalClause.type === 'preamble' ? 'preambulatory' : 'operative') + '):',
      '"' + originalClause.text + '"',
      '',
      'Propose ONE amendment that meaningfully changes the clause to better reflect your country\'s interests OR address a gap. Choose one type:',
      '  - "strike": delete a specific phrase (specify the phrase to remove)',
      '  - "add": insert a new phrase or sub-clause (specify the addition)',
      '  - "modify": rewrite the whole clause with a small but real change',
      '',
      'Constraints:',
      '  - Amendments must be SUBSTANTIVE (not just wording polish)',
      '  - Must be diplomatically credible for ' + (fromCountry ? fromCountry.name : 'a delegate'),
      '',
      'Return ONLY a JSON object:',
      '{',
      '  "type": "strike" or "add" or "modify",',
      '  "text": "the amendment text (the phrase to strike, the addition to make, or the new full clause)",',
      '  "rationale": "1 sentence diplomatic justification"',
      '}'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.text !== 'string' || parsed.text.length < 5) return null;
      var t = parsed.type === 'strike' ? 'strike' : parsed.type === 'add' ? 'add' : 'modify';
      return {
        type: t,
        text: parsed.text.slice(0, 500),
        rationale: typeof parsed.rationale === 'string' ? parsed.rationale.slice(0, 200) : ''
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Generate a breaking-news event the chair can broadcast.
  // Returns { headline, body, affectedIsos: [iso...] } or null.
  // Pedagogically: real diplomacy shifts under news; this tests adaptability.
  // ═══════════════════════════════════════════
  function aiBreakingNews(ctx, agenda, recentSpeeches, committee) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !agenda) return Promise.resolve(null);
    var historyText = (recentSpeeches || []).slice(-5).map(function(s) {
      return '- ' + s.country + ': ' + (s.text || '').slice(0, 120);
    }).join('\n');
    var prompt = [
      'You are generating a BREAKING NEWS event for an ongoing Model UN debate.',
      '',
      'Committee: ' + (committee ? committee.name : 'UN committee'),
      'Agenda: ' + agenda.title,
      'Background: ' + agenda.background,
      '',
      historyText ? 'Recent speeches in the chamber:\n' + historyText + '\n' : '',
      'Generate a realistic, time-stamped news event that:',
      '  1. Is plausible (could appear in real wire reporting)',
      '  2. Changes the calculus of the debate in some way',
      '  3. Names 2-4 countries most directly affected (use ISO 3-letter codes)',
      '',
      'Tone: clipped wire-service style. No commentary. ~40 words for the body.',
      '',
      'Return ONLY a JSON object:',
      '{',
      '  "headline": "ALL CAPS HEADLINE (60 chars max, no period at end)",',
      '  "body": "Wire-service style report, 2-3 sentences",',
      '  "affectedIsos": ["USA", "BRA", ...]',
      '}'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.headline !== 'string' || typeof parsed.body !== 'string') return null;
      return {
        headline: parsed.headline.slice(0, 120).toUpperCase(),
        body: parsed.body.slice(0, 400),
        affectedIsos: Array.isArray(parsed.affectedIsos) ? parsed.affectedIsos.slice(0, 6).map(String) : [],
        at: Date.now()
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // Helper for the achievement system: read the user's per-mode achievement flags
  // from window.__alloHavenModelUNStats (a module-level mirror of the user's stats).
  // Updates are fire-and-forget; achievements UI can render anywhere.
  // ═══════════════════════════════════════════
  if (!window.__alloHavenModelUNStats) {
    window.__alloHavenModelUNStats = {
      firstSpeechDelivered: false,
      firstClauseProposed: false,
      voteCast: false,
      aiStarterUsed: false,
      resolutionsPassed: 0,
      totalSpeeches: 0,
      totalClauses: 0
    };
  }
  function bumpStat(key, by) {
    var s = window.__alloHavenModelUNStats;
    if (typeof s[key] === 'number') s[key] = (s[key] || 0) + (by || 1);
    else s[key] = true;
  }

  // ═══════════════════════════════════════════
  // OpeningSpeechesView — every delegate gives an opening speech.
  // Host clicks "Give floor → [delegate]" to advance through the speaker queue.
  // Human delegates type their speech; AI delegates auto-generate when called on.
  // All speeches stream to a shared live feed (session-synced).
  // ═══════════════════════════════════════════
  function OpeningSpeechesView(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var sessionState = props.sessionState;

    var committee = committeeById(modelUn.committeeId);
    var agenda = agendaById(modelUn.agendaId);
    var assigned = modelUn.assignedCountries || {};
    var speeches = modelUn.speeches || {};
    // Stable speech order — sort by `at` timestamp
    var orderedSpeeches = Object.keys(speeches).map(function(id) {
      return Object.assign({ id: id }, speeches[id]);
    }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });
    // Cap displayed speeches at 50 (per plan's 1MB doc budget guard)
    if (orderedSpeeches.length > 50) orderedSpeeches = orderedSpeeches.slice(-50);

    var currentSpeakerUid = modelUn.currentSpeakerUid || null;
    var currentSpeakerCountry = currentSpeakerUid ? countryById(assigned[currentSpeakerUid]) : null;

    // Identify "me" — student's UID or 'me' for solo
    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    var iAmCurrentSpeaker = !!currentSpeakerUid && currentSpeakerUid === myUid;

    // Track AI-generation in-flight to prevent double-fires
    var aiGenTuple = useState({});
    var aiInFlight = aiGenTuple[0];
    var setAiInFlight = aiGenTuple[1];

    // Host action: give the floor to a delegate
    function giveFloorTo(uid) {
      if (!isHost && !isSolo) return;
      var iso = assigned[uid];
      if (!iso) { ctx.addToast('That seat is empty'); return; }
      updateMUN({ currentSpeakerUid: uid, speakerStartedAt: new Date().toISOString() });
      // If AI, kick off generation immediately
      if (uid.indexOf('ai_') === 0) {
        triggerAiSpeech(uid, iso);
      }
    }
    function triggerAiSpeech(uid, iso) {
      if (aiInFlight[uid]) return;
      var country = countryById(iso);
      if (!country) return;
      setAiInFlight(function(prev) { var n = Object.assign({}, prev); n[uid] = true; return n; });
      // Build the recent-speeches history list
      var recent = orderedSpeeches.map(function(s) { return s; });
      aiGenerateDelegateSpeech(ctx, country, agenda, committee, recent).then(function(result) {
        setAiInFlight(function(prev) { var n = Object.assign({}, prev); delete n[uid]; return n; });
        if (!result) {
          ctx.addToast('AI speech generation failed for ' + country.name + '. Skip or retry.');
          return;
        }
        commitSpeech(uid, iso, result.text, result.keyPoints || [], true);
      }).catch(function() {
        setAiInFlight(function(prev) { var n = Object.assign({}, prev); delete n[uid]; return n; });
      });
    }
    function commitSpeech(uid, iso, text, keyPoints, isAi) {
      var country = countryById(iso);
      var speechId = 'sp_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var newSpeech = {
        uid: uid,
        country: country ? country.name : iso,
        iso: iso,
        flag: country ? country.flag : '🌐',
        text: (text || '').slice(0, 1500),
        keyPoints: keyPoints || [],
        isAi: !!isAi,
        at: Date.now()
      };
      var nextSpeeches = Object.assign({}, speeches);
      nextSpeeches[speechId] = newSpeech;
      // Cap at 50 most recent
      var keys = Object.keys(nextSpeeches).map(function(k) { return { k: k, at: nextSpeeches[k].at }; }).sort(function(a, b) { return a.at - b.at; });
      if (keys.length > 50) {
        var trimmed = {};
        keys.slice(-50).forEach(function(x) { trimmed[x.k] = nextSpeeches[x.k]; });
        nextSpeeches = trimmed;
      }
      updateMUN({
        speeches: nextSpeeches,
        currentSpeakerUid: null,
        speakerStartedAt: null,
        speechCount: (modelUn.speechCount || 0) + 1
      });
      // Achievement triggers (local stats — host-side, but also fires for solo)
      if (!isAi) {
        bumpStat('totalSpeeches');
        if (!window.__alloHavenModelUNStats.firstSpeechDelivered) {
          bumpStat('firstSpeechDelivered');
          if (typeof ctx.addToast === 'function') ctx.addToast('🏅 Achievement: First Speech Delivered');
        }
      }
    }
    function skipSpeaker() {
      updateMUN({ currentSpeakerUid: null, speakerStartedAt: null });
    }

    // Speaker queue — every assigned UID that hasn't spoken yet
    var spokenUids = {};
    orderedSpeeches.forEach(function(s) { spokenUids[s.uid] = true; });
    var queue = Object.keys(assigned).filter(function(uid) { return !spokenUids[uid]; }).map(function(uid) {
      return { uid: uid, iso: assigned[uid], isAi: uid.indexOf('ai_') === 0 };
    });

    // Phase advance — when all delegates have spoken
    var allSpoken = queue.length === 0;

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      // Header
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, padding: 12, background: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 100%)', borderRadius: 10 } },
        h('div', { style: { fontSize: 32 } }, agenda ? agenda.emoji : '🌐'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } },
            (committee ? committee.name : '') + ' · OPENING SPEECHES'
          ),
          h('div', { style: { fontSize: 17, fontWeight: 800, marginTop: 2 } }, agenda ? agenda.title : ''),
          h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 4 } },
            orderedSpeeches.length + ' speech' + (orderedSpeeches.length !== 1 ? 'es' : '') + ' given · ' + queue.length + ' delegate' + (queue.length !== 1 ? 's' : '') + ' remaining'
          )
        ),
        // Phase advance
        isHost && allSpoken && h('button', {
          onClick: function() { updateMUN({ phase: PHASES.DRAFT }); },
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Advance to Resolution Drafting →'),
        isHost && !allSpoken && h('button', {
          onClick: function() {
            if (typeof confirm === 'function' && !confirm('Skip to Resolution Drafting? Some delegates have not spoken yet.')) return;
            updateMUN({ phase: PHASES.DRAFT });
          },
          style: { padding: '6px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
        }, 'Skip to Drafting →')
      ),

      // ── News Desk banner (active when modelUn.news is set) ──
      h(NewsDeskBanner, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost,
        agenda: agenda, committee: committee, recentSpeeches: orderedSpeeches
      }),

      // Current speaker spotlight
      currentSpeakerUid && currentSpeakerCountry && h('div', {
        style: { marginBottom: 14, padding: 14, background: 'rgba(251, 191, 36, 0.10)', border: '2px solid #fbbf24', borderRadius: 10 }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
          h('span', { style: { fontSize: 32 } }, currentSpeakerCountry.flag),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, '🎤 Now Speaking'),
            h('div', { style: { fontSize: 16, fontWeight: 800 } }, currentSpeakerCountry.name),
            currentSpeakerUid.indexOf('ai_') === 0 && h('div', { style: { fontSize: 10, color: '#a855f7' } },
              aiInFlight[currentSpeakerUid] ? '🤖 AI delegate composing speech…' : '🤖 AI delegate'
            )
          ),
          (isHost || isSolo) && h('button', {
            onClick: skipSpeaker,
            style: { padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }
          }, 'Skip')
        ),

        // Human speaker → compose box
        iAmCurrentSpeaker && currentSpeakerUid.indexOf('ai_') !== 0 && h(SpeechComposeBox, {
          ctx: ctx,
          country: myCountry,
          agenda: agenda,
          committee: committee,
          recentSpeeches: orderedSpeeches,
          onSubmit: function(text) { commitSpeech(myUid, myIso, text, [], false); }
        }),

        // Watching speaker (host or other students)
        !iAmCurrentSpeaker && currentSpeakerUid.indexOf('ai_') !== 0 && h('p', { style: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' } },
          (sessionState && sessionState.roster && sessionState.roster[currentSpeakerUid] ? sessionState.roster[currentSpeakerUid].name : 'Delegate') + ' is composing their speech…'
        ),

        // AI in flight
        currentSpeakerUid.indexOf('ai_') === 0 && aiInFlight[currentSpeakerUid] && h('div', { style: { padding: 8, fontSize: 12, color: '#a855f7', fontStyle: 'italic' } },
          '🤖 Generating speech in character… (this takes 3-6 seconds)'
        ),
        currentSpeakerUid.indexOf('ai_') === 0 && !aiInFlight[currentSpeakerUid] && (isHost || isSolo) && h('button', {
          onClick: function() { triggerAiSpeech(currentSpeakerUid, assigned[currentSpeakerUid]); },
          style: { padding: '6px 12px', fontSize: 12, fontWeight: 700, background: '#a855f7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, '🤖 Generate AI speech')
      ),

      // Two-column layout: queue (left) + feed (right)
      h('div', { style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14 } },

        // ── Speaker queue (host visible) ──
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Speaker Queue (' + queue.length + ')'
          ),
          allSpoken && h('div', { style: { padding: 14, fontSize: 12, color: '#10b981', fontStyle: 'italic', textAlign: 'center', background: 'rgba(16,185,129,0.08)', borderRadius: 8 } },
            '✓ All delegates have spoken'
          ),
          queue.map(function(q) {
            var country = countryById(q.iso);
            if (!country) return null;
            var roster = (sessionState && sessionState.roster) || {};
            var rosterEntry = q.isAi ? null : (roster[q.uid] || (isSolo && q.uid === 'me' ? { name: ctx.studentNickname || 'You' } : null));
            var canRecognize = (isHost || isSolo) && !currentSpeakerUid;
            return h('button', {
              key: 'q-' + q.uid,
              onClick: canRecognize ? function() { giveFloorTo(q.uid); } : null,
              disabled: !canRecognize,
              style: {
                width: '100%', textAlign: 'left', padding: 8, marginBottom: 6,
                background: q.isAi ? 'rgba(167,139,250,0.08)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (q.isAi ? '#7c3aed' : '#334155'),
                borderRadius: 8, color: '#e2e8f0',
                cursor: canRecognize ? 'pointer' : 'default',
                opacity: currentSpeakerUid ? 0.55 : 1
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 18 } }, country.flag),
                h('div', { style: { flex: 1, fontSize: 12, fontWeight: 600 } }, country.name),
                canRecognize && h('span', { style: { fontSize: 10, color: '#7dd3fc' } }, 'Give floor →')
              ),
              h('div', { style: { fontSize: 10, marginTop: 2, color: q.isAi ? '#a855f7' : '#10b981' } },
                q.isAi ? '🤖 AI delegate' : ('👤 ' + (rosterEntry ? rosterEntry.name : q.uid))
              )
            );
          })
        ),

        // ── Speech feed ──
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Live Speech Feed'
          ),
          orderedSpeeches.length === 0
            ? h('div', { style: { padding: 18, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8 } },
                isHost || isSolo
                  ? 'Recognize a delegate from the queue to begin opening speeches.'
                  : 'Waiting for the Chair to recognize the first speaker…'
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                orderedSpeeches.slice().reverse().map(function(sp) {
                  return h(SpeechCard, { key: sp.id, speech: sp, myCountry: myCountry });
                })
              )
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // SpeechComposeBox — student's compose UI when they have the floor.
  // Optional "✨ AI starter" button generates a draft to edit (not paste-replace).
  // ═══════════════════════════════════════════
  function SpeechComposeBox(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var country = props.country;
    var agenda = props.agenda;
    var committee = props.committee;
    var recentSpeeches = props.recentSpeeches;
    var onSubmit = props.onSubmit;

    var textTuple = useState('');
    var text = textTuple[0];
    var setText = textTuple[1];
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    function getStarter() {
      if (loading || !country || !agenda) return;
      setLoading(true);
      aiGenerateDelegateSpeech(ctx, country, agenda, committee, recentSpeeches).then(function(r) {
        setLoading(false);
        if (r && r.text) {
          setText(r.text);
          // Achievement (UDL scaffold usage)
          if (!window.__alloHavenModelUNStats.aiStarterUsed) {
            bumpStat('aiStarterUsed');
            if (typeof ctx.addToast === 'function') ctx.addToast('🏅 Achievement: AI Scaffold Used (UDL!)');
          }
          ctx.addToast('AI starter ready — edit before submitting');
        } else {
          ctx.addToast('AI starter failed. Try again or write your own.');
        }
      }).catch(function() {
        setLoading(false);
        ctx.addToast('AI starter failed. Try again or write your own.');
      });
    }
    function handleSubmit() {
      var t = (text || '').trim();
      if (t.length < 30) { ctx.addToast('Speech is too short — aim for 100+ words'); return; }
      onSubmit(t);
      setText('');
    }

    var wordCount = (text || '').trim().split(/\s+/).filter(function(w) { return w.length; }).length;
    var wcColor = wordCount >= 100 && wordCount <= 200 ? '#10b981' : wordCount > 0 ? '#fbbf24' : '#94a3b8';

    return h('div', { style: { background: 'rgba(0,0,0,0.18)', padding: 10, borderRadius: 8, marginTop: 8 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
        h('span', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } },
          'You have the floor — compose your opening speech (120-180 words)'
        ),
        h('button', {
          onClick: getStarter,
          disabled: loading,
          style: {
            marginLeft: 'auto',
            padding: '4px 10px', fontSize: 11, fontWeight: 600,
            background: loading ? '#475569' : '#7c3aed', color: '#fff',
            border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer'
          }
        }, loading ? '⏳ Generating…' : '✨ AI starter')
      ),
      h('textarea', {
        value: text,
        onChange: function(e) { setText(e.target.value); },
        placeholder: 'Mr./Madam Chair, distinguished delegates… (speak in first person plural; ground your argument in your country\'s national interest)',
        rows: 6,
        style: {
          width: '100%', padding: 8, fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6,
          background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
          border: '1px solid #475569', borderRadius: 6, resize: 'vertical',
          boxSizing: 'border-box'
        },
        'aria-label': 'Compose your opening speech'
      }),
      h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 6 } },
        h('span', { style: { fontSize: 10, color: wcColor, fontWeight: 600 } },
          wordCount + ' word' + (wordCount !== 1 ? 's' : '') + (wordCount > 0 && (wordCount < 100 || wordCount > 200) ? ' (target 120-180)' : '')
        ),
        h('button', {
          onClick: handleSubmit,
          disabled: text.trim().length < 30,
          style: {
            marginLeft: 'auto',
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: text.trim().length >= 30 ? '#10b981' : '#475569',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: text.trim().length >= 30 ? 'pointer' : 'not-allowed'
          }
        }, '🎤 Deliver speech')
      )
    );
  }

  // ═══════════════════════════════════════════
  // DraftResolutionView — collaborative clause building.
  // Each delegate (human or AI-suggested) can propose ONE clause at a time.
  // Host can mark clauses adopted or removed; voting happens after.
  // ═══════════════════════════════════════════
  function DraftResolutionView(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var sessionState = props.sessionState;

    var committee = committeeById(modelUn.committeeId);
    var agenda = agendaById(modelUn.agendaId);
    var assigned = modelUn.assignedCountries || {};
    var clauses = modelUn.clauses || {};
    var orderedClauses = Object.keys(clauses).map(function(id) {
      return Object.assign({ id: id }, clauses[id]);
    }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });

    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;

    var textTuple = useState('');
    var text = textTuple[0];
    var setText = textTuple[1];
    var typeTuple = useState('operative');
    var clauseType = typeTuple[0];
    var setClauseType = typeTuple[1];
    var aiLoadTuple = useState(false);
    var aiLoading = aiLoadTuple[0];
    var setAiLoading = aiLoadTuple[1];
    // Amendment modal state — open clauseId or null
    var amOpenTuple = useState(null);
    var amOpenId = amOpenTuple[0];
    var setAmOpenId = amOpenTuple[1];

    function commitClause(authorIso, authorCountryName, txt, type, isAi) {
      var clauseId = 'cl_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var newClause = {
        text: txt.slice(0, 500),
        type: type === 'preamble' ? 'preamble' : 'operative',
        proposer: authorCountryName,
        iso: authorIso,
        status: 'open', // 'open' | 'adopted' | 'rejected'
        isAi: !!isAi,
        at: Date.now()
      };
      var next = Object.assign({}, clauses);
      next[clauseId] = newClause;
      // Cap at 20 (per plan's 1MB doc guard)
      var keys = Object.keys(next).map(function(k) { return { k: k, at: next[k].at }; }).sort(function(a, b) { return a.at - b.at; });
      if (keys.length > 20) {
        var trimmed = {};
        keys.slice(-20).forEach(function(x) { trimmed[x.k] = next[x.k]; });
        next = trimmed;
      }
      updateMUN({ clauses: next });
      // Achievement triggers
      if (!isAi) {
        bumpStat('totalClauses');
        if (!window.__alloHavenModelUNStats.firstClauseProposed) {
          bumpStat('firstClauseProposed');
          if (typeof ctx.addToast === 'function') ctx.addToast('🏅 Achievement: First Clause Proposed');
        }
      }
    }
    function handleProposeAsHuman() {
      var t = (text || '').trim();
      if (t.length < 15) { ctx.addToast('Clause is too short — aim for 25-70 words'); return; }
      if (!myCountry) { ctx.addToast('You are not assigned a country'); return; }
      commitClause(myCountry.iso, myCountry.name, t, clauseType, false);
      setText('');
    }
    function handleAIStarter() {
      if (aiLoading) return;
      setAiLoading(true);
      aiSuggestResolutionClause(ctx, myCountry, agenda, committee, orderedClauses).then(function(r) {
        setAiLoading(false);
        if (r && r.text) {
          setText(r.text);
          setClauseType(r.type);
          ctx.addToast('AI clause ready — edit before proposing');
        } else {
          ctx.addToast('AI clause generation failed. Try again or write your own.');
        }
      }).catch(function() {
        setAiLoading(false);
        ctx.addToast('AI clause generation failed.');
      });
    }
    function handleAIPropose(forIso, forName) {
      // Host action: AI delegate proposes a clause directly to the floor
      var country = countryById(forIso);
      if (!country) return;
      setAiLoading(true);
      aiSuggestResolutionClause(ctx, country, agenda, committee, orderedClauses).then(function(r) {
        setAiLoading(false);
        if (r && r.text) {
          commitClause(country.iso, country.name, r.text, r.type, true);
          ctx.addToast(country.flag + ' ' + country.name + ' proposed a clause');
        } else {
          ctx.addToast('AI proposal failed for ' + country.name);
        }
      }).catch(function() {
        setAiLoading(false);
        ctx.addToast('AI proposal failed');
      });
    }
    function setClauseStatus(clauseId, status) {
      var next = Object.assign({}, clauses);
      if (next[clauseId]) {
        next[clauseId] = Object.assign({}, next[clauseId], { status: status });
        updateMUN({ clauses: next });
      }
    }
    function removeClause(clauseId) {
      var next = Object.assign({}, clauses);
      delete next[clauseId];
      updateMUN({ clauses: next });
    }
    function advanceToVote() {
      var adopted = orderedClauses.filter(function(c) { return c.status === 'adopted'; });
      if (adopted.length === 0) {
        if (typeof confirm === 'function' && !confirm('No clauses adopted yet. Proceed to vote on the full draft anyway?')) return;
      }
      updateMUN({ phase: PHASES.VOTE, finalVotes: {} });
    }

    var allDelegates = Object.keys(assigned).map(function(uid) {
      return { uid: uid, iso: assigned[uid], isAi: uid.indexOf('ai_') === 0, country: countryById(assigned[uid]) };
    }).filter(function(d) { return d.country; });

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      // Header
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14, padding: 12, background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)', borderRadius: 10 } },
        h('div', { style: { fontSize: 32 } }, '📜'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } },
            (committee ? committee.name : '') + ' · RESOLUTION DRAFTING'
          ),
          h('div', { style: { fontSize: 17, fontWeight: 800, marginTop: 2 } }, agenda ? agenda.title : ''),
          h('div', { style: { fontSize: 11, color: '#ddd6fe', marginTop: 4 } },
            orderedClauses.length + ' clause' + (orderedClauses.length !== 1 ? 's' : '') + ' on the floor · ' +
            orderedClauses.filter(function(c) { return c.status === 'adopted'; }).length + ' adopted'
          )
        ),
        isHost && h('button', {
          onClick: advanceToVote,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Move to Vote →')
      ),

      // ── News Desk banner ──
      h(NewsDeskBanner, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost,
        agenda: agenda, committee: committee, recentSpeeches: []
      }),

      // Two-column layout
      h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 } },

        // ── LEFT: Propose a clause (delegate compose) ──
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#c4b5fd', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            myCountry ? ('Propose a clause as ' + myCountry.flag + ' ' + myCountry.name) : 'Propose a clause'
          ),
          myCountry && h('div', { style: { padding: 10, background: 'rgba(124, 58, 237, 0.10)', border: '1px solid #7c3aed', borderRadius: 10 } },
            // Clause type toggle
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
              [{ id: 'operative', label: 'Operative', hint: 'Calls upon / Urges / Establishes…' },
               { id: 'preamble',  label: 'Preambulatory', hint: 'Recognizing / Recalling / Concerned by…' }
              ].map(function(t) {
                var picked = clauseType === t.id;
                return h('button', {
                  key: t.id, onClick: function() { setClauseType(t.id); },
                  style: {
                    flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 600,
                    background: picked ? '#7c3aed' : 'rgba(255,255,255,0.04)',
                    color: picked ? '#fff' : '#cbd5e1',
                    border: '1px solid ' + (picked ? '#7c3aed' : '#475569'),
                    borderRadius: 6, cursor: 'pointer'
                  },
                  title: t.hint
                }, t.label);
              })
            ),
            h('textarea', {
              value: text,
              onChange: function(e) { setText(e.target.value); },
              placeholder: clauseType === 'operative'
                ? 'e.g., Calls upon Member States to submit revised Nationally Determined Contributions consistent with the 1.5°C pathway by 2026;'
                : 'e.g., Recognizing the disproportionate impact of climate change on small island developing states,',
              rows: 5,
              style: {
                width: '100%', padding: 8, fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6,
                background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
                border: '1px solid #475569', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box'
              }
            }),
            h('div', { style: { display: 'flex', gap: 6, marginTop: 8 } },
              h('button', {
                onClick: handleAIStarter,
                disabled: aiLoading,
                style: {
                  padding: '6px 12px', fontSize: 11, fontWeight: 600,
                  background: aiLoading ? '#475569' : '#a855f7', color: '#fff',
                  border: 'none', borderRadius: 6, cursor: aiLoading ? 'not-allowed' : 'pointer'
                }
              }, aiLoading ? '⏳ Generating…' : '✨ AI starter'),
              h('button', {
                onClick: handleProposeAsHuman,
                disabled: text.trim().length < 15,
                style: {
                  marginLeft: 'auto',
                  padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  background: text.trim().length >= 15 ? '#10b981' : '#475569',
                  color: '#fff', border: 'none', borderRadius: 6,
                  cursor: text.trim().length >= 15 ? 'pointer' : 'not-allowed'
                }
              }, '📜 Propose clause')
            )
          ),
          !myCountry && h('div', { style: { padding: 12, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255,255,255,0.03)', borderRadius: 8 } },
            'You are not assigned a country in this committee. You can still watch the drafting.'
          ),

          // Host helper: AI delegate auto-propose
          isHost && h('div', { style: { marginTop: 14 } },
            h('div', { style: { fontSize: 10, color: '#c4b5fd', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } },
              'Have an AI delegate propose'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 4 } },
              allDelegates.filter(function(d) { return d.isAi; }).map(function(d) {
                return h('button', {
                  key: 'aip-' + d.uid,
                  onClick: function() { handleAIPropose(d.iso, d.country.name); },
                  disabled: aiLoading,
                  title: d.country.name + ' (AI proposes a clause)',
                  style: {
                    padding: 4, fontSize: 10,
                    background: 'rgba(167,139,250,0.10)',
                    border: '1px solid #a855f7',
                    borderRadius: 4, color: '#e9d5ff',
                    cursor: aiLoading ? 'wait' : 'pointer'
                  }
                },
                  h('div', { style: { fontSize: 16 } }, d.country.flag),
                  h('div', { style: { fontSize: 9 } }, d.country.iso)
                );
              })
            )
          )
        ),

        // ── RIGHT: Clause list ──
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#c4b5fd', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Clauses on the Floor'
          ),
          orderedClauses.length === 0
            ? h('div', { style: { padding: 14, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8 } },
                'No clauses yet. Propose one from the left, or have an AI delegate draft the first one.'
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' } },
                orderedClauses.map(function(c, idx) {
                  var country = countryById(c.iso);
                  return h(ClauseCard, {
                    key: c.id,
                    clause: c,
                    index: idx + 1,
                    country: country,
                    canEdit: isHost,
                    onAdopt: function() { setClauseStatus(c.id, c.status === 'adopted' ? 'open' : 'adopted'); },
                    onReject: function() { setClauseStatus(c.id, c.status === 'rejected' ? 'open' : 'rejected'); },
                    onOpenAmendments: function() { setAmOpenId(c.id); },
                    onRemove: function() {
                      if (typeof confirm !== 'function' || confirm('Remove this clause?')) removeClause(c.id);
                    }
                  });
                })
              )
        )
      ),

      // Amendment modal — overlay when a clause is opened for amending
      amOpenId && clauses[amOpenId] && h(AmendmentModal, {
        ctx: ctx,
        modelUn: modelUn,
        updateMUN: updateMUN,
        clauseId: amOpenId,
        clause: clauses[amOpenId],
        myCountry: myCountry,
        isHost: isHost,
        agenda: agenda,
        onClose: function() { setAmOpenId(null); }
      })
    );
  }

  // Individual clause card with status badges + host actions
  function ClauseCard(props) {
    var React = window.React;
    var h = React.createElement;
    var c = props.clause;
    var country = props.country;
    var statusBg = c.status === 'adopted' ? '#10b981' : c.status === 'rejected' ? '#dc2626' : 'rgba(255,255,255,0.04)';
    var statusBorder = c.status === 'adopted' ? '#10b981' : c.status === 'rejected' ? '#dc2626' : '#475569';
    var statusOpacity = c.status === 'rejected' ? 0.55 : 1;
    return h('div', {
      style: {
        padding: 10,
        background: c.status === 'adopted' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
        border: '1px solid ' + statusBorder,
        borderRadius: 8, opacity: statusOpacity
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
        h('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, '#' + props.index),
        country && h('span', { style: { fontSize: 16 } }, country.flag),
        h('span', { style: { flex: 1, fontSize: 11, fontWeight: 700, color: '#cbd5e1' } },
          c.proposer + (c.isAi ? ' 🤖' : '')
        ),
        h('span', {
          style: {
            fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
            background: c.type === 'preamble' ? 'rgba(251,191,36,0.18)' : 'rgba(14,165,233,0.18)',
            color: c.type === 'preamble' ? '#fbbf24' : '#7dd3fc',
            textTransform: 'uppercase', letterSpacing: 0.5
          }
        }, c.type === 'preamble' ? 'Preamble' : 'Operative'),
        c.status === 'adopted' && h('span', { style: { fontSize: 10, fontWeight: 700, color: '#10b981' } }, '✓ Adopted'),
        c.status === 'rejected' && h('span', { style: { fontSize: 10, fontWeight: 700, color: '#dc2626' } }, '✗ Rejected')
      ),
      h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#e2e8f0', margin: 0, fontStyle: c.type === 'preamble' ? 'italic' : 'normal' } }, c.text),

      // ── Adopted amendments rendered inline (live changes visible) ──
      c.amendments && Object.keys(c.amendments).length > 0 && h('div', { style: { marginTop: 6, paddingTop: 6, borderTop: '1px dashed rgba(255,255,255,0.15)' } },
        h('div', { style: { fontSize: 9, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
          'Amendments (' + Object.keys(c.amendments).length + ')'
        ),
        Object.keys(c.amendments).map(function(amId) {
          var am = c.amendments[amId];
          var amColor = am.status === 'adopted' ? '#10b981' : am.status === 'rejected' ? '#dc2626' : '#fbbf24';
          var amIcon = am.type === 'strike' ? '➖' : am.type === 'add' ? '➕' : '✏️';
          return h('div', {
            key: amId,
            style: {
              fontSize: 10, lineHeight: 1.5, marginTop: 2, padding: '4px 6px',
              borderLeft: '2px solid ' + amColor,
              background: am.status === 'adopted' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              borderRadius: 3, opacity: am.status === 'rejected' ? 0.5 : 1
            }
          },
            h('span', { style: { color: amColor, fontWeight: 700, marginRight: 4 } },
              amIcon + ' ' + am.type.toUpperCase() + ' by ' + (am.proposer || '?') + (am.isAi ? ' 🤖' : '')
            ),
            am.status === 'adopted' && h('span', { style: { color: '#10b981', fontSize: 9, fontWeight: 700, marginRight: 4 } }, '✓'),
            am.status === 'rejected' && h('span', { style: { color: '#dc2626', fontSize: 9, fontWeight: 700, marginRight: 4 } }, '✗'),
            h('span', { style: { color: '#cbd5e1' } }, '"' + am.text + '"'),
            am.rationale && h('div', { style: { color: '#94a3b8', fontStyle: 'italic', marginTop: 2 } }, am.rationale)
          );
        })
      ),

      props.canEdit && h('div', { style: { display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' } },
        h('button', {
          onClick: props.onAdopt,
          style: {
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            background: c.status === 'adopted' ? '#10b981' : 'rgba(16,185,129,0.15)',
            color: c.status === 'adopted' ? '#fff' : '#10b981',
            border: '1px solid #10b981', borderRadius: 4, cursor: 'pointer'
          }
        }, c.status === 'adopted' ? '✓ Adopted' : 'Adopt'),
        h('button', {
          onClick: props.onReject,
          style: {
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            background: c.status === 'rejected' ? '#dc2626' : 'rgba(220,38,38,0.15)',
            color: c.status === 'rejected' ? '#fff' : '#fca5a5',
            border: '1px solid #dc2626', borderRadius: 4, cursor: 'pointer'
          }
        }, c.status === 'rejected' ? '✗ Rejected' : 'Reject'),
        h('button', {
          onClick: props.onOpenAmendments,
          style: {
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            background: 'rgba(251,191,36,0.18)', color: '#fbbf24',
            border: '1px solid #fbbf24', borderRadius: 4, cursor: 'pointer'
          },
          'aria-label': 'Open amendments for this clause'
        }, '✏️ Amend'),
        h('button', {
          onClick: props.onRemove,
          style: {
            marginLeft: 'auto',
            padding: '3px 8px', fontSize: 10, fontWeight: 700,
            background: 'transparent', color: '#94a3b8',
            border: '1px solid #475569', borderRadius: 4, cursor: 'pointer'
          }
        }, '🗑 Remove')
      )
    );
  }

  // ═══════════════════════════════════════════
  // AmendmentModal — overlay for proposing + reviewing amendments to a clause.
  // Students propose; host adopts/rejects.
  // ═══════════════════════════════════════════
  function AmendmentModal(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var clauseId = props.clauseId;
    var clause = props.clause;
    var myCountry = props.myCountry;
    var isHost = props.isHost;
    var agenda = props.agenda;
    var onClose = props.onClose;

    var typeTuple = useState('modify');
    var amType = typeTuple[0];
    var setAmType = typeTuple[1];
    var textTuple = useState('');
    var text = textTuple[0];
    var setText = textTuple[1];
    var rationaleTuple = useState('');
    var rationale = rationaleTuple[0];
    var setRationale = rationaleTuple[1];
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    var amendments = (clause && clause.amendments) || {};
    var orderedAmendments = Object.keys(amendments).map(function(id) {
      return Object.assign({ id: id }, amendments[id]);
    }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });

    function writeAmendmentsBack(nextAmendments) {
      var nextClauses = Object.assign({}, modelUn.clauses || {});
      nextClauses[clauseId] = Object.assign({}, clause, { amendments: nextAmendments });
      updateMUN({ clauses: nextClauses });
    }
    function commitAmendment(proposer, iso, txt, rat, type, isAi) {
      var amId = 'am_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var next = Object.assign({}, amendments);
      next[amId] = {
        proposer: proposer,
        iso: iso,
        type: type,
        text: txt.slice(0, 500),
        rationale: (rat || '').slice(0, 200),
        status: 'open',
        isAi: !!isAi,
        at: Date.now()
      };
      writeAmendmentsBack(next);
    }
    function setAmendmentStatus(amId, status) {
      var next = Object.assign({}, amendments);
      if (next[amId]) {
        next[amId] = Object.assign({}, next[amId], { status: status });
        writeAmendmentsBack(next);
      }
    }
    function handleSubmit() {
      var t = (text || '').trim();
      if (t.length < 5) { ctx.addToast('Amendment text is too short'); return; }
      if (!myCountry) { ctx.addToast('You are not assigned a country'); return; }
      commitAmendment(myCountry.name, myCountry.iso, t, rationale, amType, false);
      setText(''); setRationale('');
      if (typeof ctx.addToast === 'function') ctx.addToast('Amendment proposed');
    }
    function handleAIStarter() {
      if (loading) return;
      setLoading(true);
      aiSuggestAmendment(ctx, myCountry, agenda, clause).then(function(r) {
        setLoading(false);
        if (r) {
          setAmType(r.type);
          setText(r.text);
          setRationale(r.rationale || '');
        } else {
          ctx.addToast('AI amendment suggestion failed.');
        }
      }).catch(function() { setLoading(false); });
    }

    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'amend-title',
      style: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.7)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflow: 'auto'
      },
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', {
        style: {
          maxWidth: 640, width: '100%', maxHeight: '90vh', overflowY: 'auto',
          background: '#0f172a', border: '2px solid #fbbf24', borderRadius: 12, color: '#e2e8f0'
        }
      },
        // Header
        h('div', { style: { padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #334155' } },
          h('span', { style: { fontSize: 28 } }, '✏️'),
          h('div', { style: { flex: 1 } },
            h('div', { id: 'amend-title', style: { fontSize: 16, fontWeight: 800 } }, 'Amend Clause'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } },
              'Proposed by ' + (clause && clause.proposer)
            )
          ),
          h('button', {
            onClick: onClose,
            'aria-label': 'Close amendments panel',
            style: { padding: '4px 8px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
          }, '✕')
        ),
        // Original clause
        h('div', { style: { padding: 12, background: 'rgba(255,255,255,0.03)', margin: 14, borderRadius: 8, border: '1px solid #334155' } },
          h('div', { style: { fontSize: 9, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Original Clause'),
          h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#cbd5e1', margin: 0, fontStyle: clause && clause.type === 'preamble' ? 'italic' : 'normal' } },
            clause && clause.text
          )
        ),
        // Propose new amendment (if user has country)
        myCountry && h('div', { style: { padding: 14 } },
          h('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Propose an amendment as ' + myCountry.flag + ' ' + myCountry.name
          ),
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 8 } },
            [{ id: 'strike', label: '➖ Strike', hint: 'Delete a specific phrase' },
             { id: 'add',    label: '➕ Add',    hint: 'Insert a new phrase' },
             { id: 'modify', label: '✏️ Modify', hint: 'Rewrite the clause' }
            ].map(function(t) {
              var picked = amType === t.id;
              return h('button', {
                key: t.id, onClick: function() { setAmType(t.id); },
                title: t.hint,
                style: {
                  flex: 1, padding: '6px 8px', fontSize: 11, fontWeight: 700,
                  background: picked ? '#fbbf24' : 'rgba(255,255,255,0.04)',
                  color: picked ? '#000' : '#cbd5e1',
                  border: '1px solid ' + (picked ? '#fbbf24' : '#475569'),
                  borderRadius: 6, cursor: 'pointer'
                }
              }, t.label);
            })
          ),
          h('textarea', {
            value: text,
            onChange: function(e) { setText(e.target.value); },
            placeholder: amType === 'strike'
              ? 'Phrase to delete from the clause (paste it)…'
              : amType === 'add'
                ? 'New phrase or sub-clause to insert…'
                : 'Rewritten clause text…',
            rows: 4,
            style: {
              width: '100%', padding: 8, fontFamily: 'inherit', fontSize: 12, lineHeight: 1.6,
              background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
              border: '1px solid #475569', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box',
              marginBottom: 6
            }
          }),
          h('input', {
            type: 'text', value: rationale,
            onChange: function(e) { setRationale(e.target.value); },
            placeholder: 'Diplomatic rationale (1 sentence, optional)',
            style: {
              width: '100%', padding: 6, fontSize: 11, fontFamily: 'inherit',
              background: 'rgba(255,255,255,0.04)', color: '#e2e8f0',
              border: '1px solid #475569', borderRadius: 6, boxSizing: 'border-box',
              marginBottom: 8
            }
          }),
          h('div', { style: { display: 'flex', gap: 6 } },
            h('button', {
              onClick: handleAIStarter,
              disabled: loading,
              style: {
                padding: '6px 10px', fontSize: 11, fontWeight: 600,
                background: loading ? '#475569' : '#a855f7', color: '#fff',
                border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer'
              }
            }, loading ? '⏳ Generating…' : '✨ AI suggest'),
            h('button', {
              onClick: handleSubmit,
              disabled: text.trim().length < 5,
              style: {
                marginLeft: 'auto',
                padding: '6px 14px', fontSize: 12, fontWeight: 700,
                background: text.trim().length >= 5 ? '#10b981' : '#475569',
                color: '#fff', border: 'none', borderRadius: 6,
                cursor: text.trim().length >= 5 ? 'pointer' : 'not-allowed'
              }
            }, '✏️ Propose amendment')
          )
        ),
        // Existing amendments
        orderedAmendments.length > 0 && h('div', { style: { padding: '0 14px 14px' } },
          h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, marginTop: 14, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Amendments on the floor (' + orderedAmendments.length + ')'
          ),
          orderedAmendments.map(function(am) {
            var amCountry = countryById(am.iso);
            var amColor = am.status === 'adopted' ? '#10b981' : am.status === 'rejected' ? '#dc2626' : '#fbbf24';
            return h('div', {
              key: am.id,
              style: {
                marginBottom: 8, padding: 10,
                background: am.status === 'adopted' ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.03)',
                border: '1px solid ' + amColor,
                borderRadius: 8,
                opacity: am.status === 'rejected' ? 0.55 : 1
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                amCountry && h('span', { style: { fontSize: 16 } }, amCountry.flag),
                h('span', { style: { fontSize: 11, fontWeight: 700 } }, (am.proposer || '?') + (am.isAi ? ' 🤖' : '')),
                h('span', {
                  style: {
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(251,191,36,0.18)', color: '#fbbf24',
                    textTransform: 'uppercase', letterSpacing: 0.5, marginLeft: 'auto'
                  }
                }, am.type),
                am.status === 'adopted' && h('span', { style: { fontSize: 10, fontWeight: 700, color: '#10b981' } }, '✓ Adopted'),
                am.status === 'rejected' && h('span', { style: { fontSize: 10, fontWeight: 700, color: '#dc2626' } }, '✗ Rejected')
              ),
              h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#e2e8f0', margin: 0 } }, '"' + am.text + '"'),
              am.rationale && h('p', { style: { fontSize: 10, lineHeight: 1.5, color: '#94a3b8', margin: '4px 0 0 0', fontStyle: 'italic' } }, am.rationale),
              isHost && h('div', { style: { display: 'flex', gap: 4, marginTop: 6 } },
                h('button', {
                  onClick: function() { setAmendmentStatus(am.id, am.status === 'adopted' ? 'open' : 'adopted'); },
                  style: {
                    padding: '3px 8px', fontSize: 10, fontWeight: 700,
                    background: am.status === 'adopted' ? '#10b981' : 'rgba(16,185,129,0.15)',
                    color: am.status === 'adopted' ? '#fff' : '#10b981',
                    border: '1px solid #10b981', borderRadius: 4, cursor: 'pointer'
                  }
                }, am.status === 'adopted' ? '✓ Adopted' : 'Adopt'),
                h('button', {
                  onClick: function() { setAmendmentStatus(am.id, am.status === 'rejected' ? 'open' : 'rejected'); },
                  style: {
                    padding: '3px 8px', fontSize: 10, fontWeight: 700,
                    background: am.status === 'rejected' ? '#dc2626' : 'rgba(220,38,38,0.15)',
                    color: am.status === 'rejected' ? '#fff' : '#fca5a5',
                    border: '1px solid #dc2626', borderRadius: 4, cursor: 'pointer'
                  }
                }, am.status === 'rejected' ? '✗ Rejected' : 'Reject')
              )
            );
          })
        ),
        orderedAmendments.length === 0 && h('div', { style: { padding: '0 14px 14px', fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' } },
          'No amendments yet. Propose the first one above.'
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // VotingView — final vote on the resolution.
  // Humans cast Y/N/A via a modal panel; AI delegates auto-vote in parallel.
  // Host clicks "Reveal tally" → animated reveal of every delegate's vote.
  // ═══════════════════════════════════════════
  function VotingView(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var sessionState = props.sessionState;

    var committee = committeeById(modelUn.committeeId);
    var agenda = agendaById(modelUn.agendaId);
    var assigned = modelUn.assignedCountries || {};
    var clauses = modelUn.clauses || {};
    var adoptedClauses = Object.keys(clauses).map(function(id) {
      return Object.assign({ id: id }, clauses[id]);
    }).filter(function(c) { return c.status === 'adopted'; }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });

    var finalVotes = modelUn.finalVotes || {};
    var revealMode = !!modelUn.voteRevealed;

    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    var myVote = myCountry ? finalVotes[myCountry.iso] : null;

    var aiInFlightTuple = useState({});
    var aiInFlight = aiInFlightTuple[0];
    var setAiInFlight = aiInFlightTuple[1];

    function castVote(iso, vote, reasoning, isAi) {
      var next = Object.assign({}, finalVotes);
      next[iso] = { vote: vote, reasoning: reasoning || '', isAi: !!isAi, at: Date.now() };
      updateMUN({ finalVotes: next });
      // Achievement: voteCast
      if (!isAi && !window.__alloHavenModelUNStats.voteCast) {
        bumpStat('voteCast');
        if (typeof ctx.addToast === 'function') ctx.addToast('🏅 Achievement: Vote Cast');
      }
    }
    function castMyVote(vote) {
      if (!myCountry) return;
      castVote(myCountry.iso, vote, '', false);
    }
    function triggerAllAIVotes() {
      var pending = Object.keys(assigned).filter(function(uid) {
        var iso = assigned[uid];
        return uid.indexOf('ai_') === 0 && !finalVotes[iso] && !aiInFlight[iso];
      });
      if (pending.length === 0) return;
      var newInFlight = Object.assign({}, aiInFlight);
      pending.forEach(function(uid) { newInFlight[assigned[uid]] = true; });
      setAiInFlight(newInFlight);
      pending.forEach(function(uid) {
        var iso = assigned[uid];
        var country = countryById(iso);
        if (!country) return;
        aiVoteDelegate(ctx, country, agenda, adoptedClauses).then(function(r) {
          if (r && r.vote) castVote(iso, r.vote, r.reasoning, true);
          setAiInFlight(function(prev) { var n = Object.assign({}, prev); delete n[iso]; return n; });
        }).catch(function() {
          setAiInFlight(function(prev) { var n = Object.assign({}, prev); delete n[iso]; return n; });
        });
      });
    }
    function revealAndAdvance() {
      // Reveal mode + compute outcome
      var yCount = 0, nCount = 0, aCount = 0;
      Object.keys(finalVotes).forEach(function(iso) {
        var v = finalVotes[iso].vote;
        if (v === 'Y') yCount++;
        else if (v === 'N') nCount++;
        else if (v === 'A') aCount++;
      });
      var passed = yCount > nCount; // simple majority of cast votes
      var outcome = passed ? 'passed' : 'failed';
      updateMUN({ voteRevealed: true, voteOutcome: outcome });
      // Achievement: resolution passed (counted only when you participated)
      if (passed) {
        bumpStat('resolutionsPassed');
        if (window.__alloHavenModelUNStats.resolutionsPassed === 1 && typeof ctx.addToast === 'function') {
          ctx.addToast('🏅 Achievement: First Resolution Passed');
        }
      }
    }
    function advanceToDebrief() { updateMUN({ phase: PHASES.DEBRIEF }); }

    // Tally
    var allDelegates = Object.keys(assigned).map(function(uid) {
      var iso = assigned[uid];
      var country = countryById(iso);
      return { uid: uid, iso: iso, country: country, isAi: uid.indexOf('ai_') === 0, vote: finalVotes[iso] };
    }).filter(function(d) { return d.country; });
    var voted = allDelegates.filter(function(d) { return !!d.vote; });
    var unvoted = allDelegates.filter(function(d) { return !d.vote; });
    var tally = { Y: 0, N: 0, A: 0 };
    voted.forEach(function(d) { var v = d.vote.vote; if (tally[v] != null) tally[v]++; });
    var allVoted = voted.length === allDelegates.length;

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      // Header
      h('div', { style: { padding: 12, marginBottom: 14, background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)', borderRadius: 10 } },
        h('div', { style: { fontSize: 11, color: '#fecaca', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } },
          (committee ? committee.name : '') + ' · FINAL VOTE'
        ),
        h('div', { style: { fontSize: 17, fontWeight: 800, marginTop: 2 } }, agenda ? agenda.title : ''),
        h('div', { style: { fontSize: 11, color: '#fecaca', marginTop: 4 } },
          voted.length + ' / ' + allDelegates.length + ' delegates voted · ' + adoptedClauses.length + ' clause' + (adoptedClauses.length !== 1 ? 's' : '') + ' in the resolution'
        )
      ),

      // Resolution summary (collapsible-feel)
      adoptedClauses.length > 0 && h('div', { style: { padding: 10, marginBottom: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid #334155', borderRadius: 8 } },
        h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } },
          'The resolution before you'
        ),
        h('div', { style: { fontSize: 11, lineHeight: 1.6, color: '#cbd5e1' } },
          adoptedClauses.map(function(c, i) {
            return h('div', { key: c.id, style: { marginBottom: 4, fontStyle: c.type === 'preamble' ? 'italic' : 'normal' } },
              h('span', { style: { color: '#94a3b8', marginRight: 4 } }, (i + 1) + '.'),
              c.text
            );
          })
        )
      ),

      // My vote panel
      myCountry && !revealMode && h('div', {
        style: { padding: 14, marginBottom: 14, background: 'rgba(16,185,129,0.10)', border: '2px solid #10b981', borderRadius: 10 }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
          h('span', { style: { fontSize: 24 } }, myCountry.flag),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'Cast your vote as'),
            h('div', { style: { fontWeight: 800, fontSize: 14 } }, myCountry.name)
          )
        ),
        myVote
          ? h('div', { style: { fontSize: 13, fontWeight: 700, color: '#10b981' } },
              'You voted: ' + (myVote.vote === 'Y' ? '✓ YES' : myVote.vote === 'N' ? '✗ NO' : '○ ABSTAIN'),
              h('button', {
                onClick: function() {
                  var next = Object.assign({}, finalVotes);
                  delete next[myCountry.iso];
                  updateMUN({ finalVotes: next });
                },
                style: { marginLeft: 8, padding: '3px 8px', fontSize: 10, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 4, cursor: 'pointer' }
              }, '↻ Change vote')
            )
          : h('div', { style: { display: 'flex', gap: 8 } },
              [{ vote: 'Y', label: '✓ YES', color: '#10b981' },
               { vote: 'N', label: '✗ NO', color: '#dc2626' },
               { vote: 'A', label: '○ ABSTAIN', color: '#94a3b8' }
              ].map(function(opt) {
                return h('button', {
                  key: opt.vote, onClick: function() { castMyVote(opt.vote); },
                  style: {
                    flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 700,
                    background: opt.color, color: '#fff', border: 'none',
                    borderRadius: 8, cursor: 'pointer'
                  }
                }, opt.label);
              })
            )
      ),

      // Host controls
      isHost && h('div', { style: { display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' } },
        h('button', {
          onClick: triggerAllAIVotes,
          disabled: Object.keys(aiInFlight).length > 0,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#a855f7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, '🤖 Cast all AI votes (' + unvoted.filter(function(d) { return d.isAi; }).length + ')'),
        !revealMode && h('button', {
          onClick: revealAndAdvance,
          disabled: voted.length === 0,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: voted.length === 0 ? '#475569' : '#fbbf24', color: '#000', border: 'none', borderRadius: 8, cursor: voted.length === 0 ? 'not-allowed' : 'pointer' }
        }, '🗳 Reveal tally'),
        revealMode && h('button', {
          onClick: advanceToDebrief,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Continue to Debrief →')
      ),

      // Tally summary (always visible if any votes)
      voted.length > 0 && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 14 } },
        [{ v: 'Y', label: 'Yes', color: '#10b981' },
         { v: 'N', label: 'No', color: '#dc2626' },
         { v: 'A', label: 'Abstain', color: '#94a3b8' }
        ].map(function(t) {
          return h('div', { key: t.v, style: { padding: 10, background: t.color + '20', border: '1px solid ' + t.color, borderRadius: 8, textAlign: 'center' } },
            h('div', { style: { fontSize: 11, color: t.color, fontWeight: 700, textTransform: 'uppercase' } }, t.label),
            h('div', { style: { fontSize: 28, fontWeight: 900, marginTop: 4 } }, tally[t.v])
          );
        })
      ),

      // Outcome banner when revealed
      revealMode && h('div', {
        style: {
          padding: 14, marginBottom: 14, textAlign: 'center',
          background: modelUn.voteOutcome === 'passed' ? 'rgba(16,185,129,0.12)' : 'rgba(220,38,38,0.12)',
          border: '2px solid ' + (modelUn.voteOutcome === 'passed' ? '#10b981' : '#dc2626'),
          borderRadius: 10
        }
      },
        h('div', { style: { fontSize: 24 } }, modelUn.voteOutcome === 'passed' ? '✅' : '❌'),
        h('div', { style: { fontSize: 16, fontWeight: 800, marginTop: 4 } },
          'Resolution ' + (modelUn.voteOutcome === 'passed' ? 'ADOPTED' : 'FAILED')
        ),
        h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 4 } },
          tally.Y + ' yes · ' + tally.N + ' no · ' + tally.A + ' abstain'
        )
      ),

      // Roll-call grid
      h('div', null,
        h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
          'Roll Call'
        ),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 6 } },
          allDelegates.map(function(d) {
            var rev = revealMode;
            var voteColor = d.vote
              ? (d.vote.vote === 'Y' ? '#10b981' : d.vote.vote === 'N' ? '#dc2626' : '#94a3b8')
              : '#475569';
            return h('div', {
              key: 'rc-' + d.uid,
              style: {
                padding: 8,
                background: d.vote && rev ? voteColor + '15' : 'rgba(255,255,255,0.03)',
                border: '1px solid ' + (d.vote ? voteColor : '#334155'),
                borderRadius: 6
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 18 } }, d.country.flag),
                h('div', { style: { flex: 1, fontSize: 11, fontWeight: 700 } }, d.country.iso),
                d.vote && rev && h('span', { style: { fontSize: 14, fontWeight: 900, color: voteColor } },
                  d.vote.vote === 'Y' ? '✓' : d.vote.vote === 'N' ? '✗' : '○'
                ),
                d.vote && !rev && h('span', { style: { fontSize: 10, color: '#94a3b8' } }, 'voted'),
                !d.vote && h('span', { style: { fontSize: 10, color: '#475569', fontStyle: 'italic' } },
                  aiInFlight[d.iso] ? '⏳' : 'pending'
                )
              ),
              d.vote && rev && d.vote.reasoning && h('div', { style: { fontSize: 10, color: '#cbd5e1', marginTop: 4, lineHeight: 1.4, fontStyle: 'italic' } },
                '"' + d.vote.reasoning + '"'
              )
            );
          })
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // DebriefView — AI coach feedback + smart CTAs + reflection prompt.
  // Mirrors Sage's Phase 8 debrief pattern: smart-CTA + reflection journal.
  // ═══════════════════════════════════════════
  function DebriefView(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var sessionState = props.sessionState;

    var committee = committeeById(modelUn.committeeId);
    var agenda = agendaById(modelUn.agendaId);
    var assigned = modelUn.assignedCountries || {};
    var speeches = modelUn.speeches || {};
    var finalVotes = modelUn.finalVotes || {};

    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    var mySpeeches = Object.keys(speeches).map(function(k) { return speeches[k]; }).filter(function(s) { return s.uid === myUid; });
    var myVote = myCountry ? finalVotes[myCountry.iso] : null;
    var classOutcome = modelUn.voteOutcome || 'unknown';

    // AI feedback state
    var fbTuple = useState(null);
    var feedback = fbTuple[0];
    var setFeedback = fbTuple[1];
    var fbLoadTuple = useState(false);
    var fbLoading = fbLoadTuple[0];
    var setFbLoading = fbLoadTuple[1];

    function generateFeedback() {
      if (fbLoading || !myCountry) return;
      setFbLoading(true);
      aiCoachFeedback(ctx, myCountry, agenda, mySpeeches, myVote ? myVote.vote : null, classOutcome).then(function(r) {
        setFbLoading(false);
        if (r) setFeedback(r); else ctx.addToast('AI coach unavailable — feedback skipped.');
      }).catch(function() {
        setFbLoading(false);
      });
    }

    function exitToLauncher() {
      // End the session — for a teacher this lets them close out cleanly.
      if (isHost && typeof ctx.sessionUpdate === 'function') {
        ctx.sessionUpdate({ modelUn: Object.assign({}, modelUn, { status: 'ended', endedAt: new Date().toISOString() }) });
      }
      // For solo, just go back to setup
      if (isSolo) {
        updateMUN({ phase: PHASES.SETUP, committeeId: null, agendaId: null, assignedCountries: {}, speeches: {}, clauses: {}, finalVotes: {}, voteRevealed: false });
      }
    }

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 900, margin: '0 auto' } },
      // Header
      h('div', { style: { padding: 14, marginBottom: 14, background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)', borderRadius: 10, textAlign: 'center' } },
        h('div', { style: { fontSize: 42, marginBottom: 6 } }, modelUn.voteOutcome === 'passed' ? '🎉' : modelUn.voteOutcome === 'failed' ? '📋' : '🌐'),
        h('div', { style: { fontSize: 11, color: '#a7f3d0', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, 'Debrief'),
        h('div', { style: { fontSize: 20, fontWeight: 800, marginTop: 4 } },
          'Resolution ' + (modelUn.voteOutcome === 'passed' ? 'ADOPTED' : modelUn.voteOutcome === 'failed' ? 'FAILED' : 'CONCLUDED')
        ),
        h('div', { style: { fontSize: 12, color: '#d1fae5', marginTop: 6 } },
          (committee ? committee.name : '') + ' · ' + (agenda ? agenda.title : '')
        )
      ),

      // Personal coach panel
      myCountry && h('div', { style: { padding: 14, marginBottom: 14, background: 'rgba(14,165,233,0.10)', border: '2px solid #0ea5e9', borderRadius: 10 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
          h('span', { style: { fontSize: 32 } }, myCountry.flag),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'Your performance as'),
            h('div', { style: { fontSize: 16, fontWeight: 800 } }, myCountry.name)
          ),
          // Personal stats
          h('div', { style: { textAlign: 'right' } },
            h('div', { style: { fontSize: 18, fontWeight: 800, color: '#fbbf24' } }, mySpeeches.length + ' speech' + (mySpeeches.length !== 1 ? 'es' : '')),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } },
              myVote ? ('Final vote: ' + (myVote.vote === 'Y' ? '✓ Yes' : myVote.vote === 'N' ? '✗ No' : '○ Abstain')) : 'No vote cast'
            )
          )
        ),

        // AI coach feedback (lazy-load via button)
        !feedback && !fbLoading && h('button', {
          onClick: generateFeedback,
          style: { width: '100%', padding: '10px 14px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, '🧠 Get AI coach feedback'),

        fbLoading && h('div', { style: { padding: 14, textAlign: 'center', fontSize: 12, color: '#7dd3fc', fontStyle: 'italic' } },
          '⏳ Analyzing your speeches, votes, and consistency with your country\'s stance…'
        ),

        feedback && h('div', null,
          // Consistency score
          typeof feedback.consistencyScore === 'number' && h('div', { style: { padding: 10, marginBottom: 10, background: 'rgba(0,0,0,0.18)', borderRadius: 8 } },
            h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Diplomatic Consistency'),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('div', { style: { flex: 1, height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden' } },
                h('div', {
                  style: {
                    width: feedback.consistencyScore + '%', height: '100%',
                    background: feedback.consistencyScore >= 75 ? '#10b981' : feedback.consistencyScore >= 50 ? '#fbbf24' : '#dc2626'
                  }
                })
              ),
              h('div', { style: { fontSize: 18, fontWeight: 900 } }, feedback.consistencyScore + '%')
            )
          ),
          feedback.verdict && h('div', { style: { padding: 10, marginBottom: 10, background: 'rgba(0,0,0,0.18)', borderRadius: 8, fontStyle: 'italic', fontSize: 12, color: '#cbd5e1' } },
            '"' + feedback.verdict + '"'
          ),
          feedback.strengths && feedback.strengths.length > 0 && h('div', { style: { marginBottom: 10 } },
            h('div', { style: { fontSize: 10, color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '✓ Strengths'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: '#d1fae5' } },
              feedback.strengths.map(function(s, i) { return h('li', { key: i }, s); })
            )
          ),
          feedback.areas && feedback.areas.length > 0 && h('div', null,
            h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, '↗ Growth Areas'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.6, color: '#fef3c7' } },
              feedback.areas.map(function(s, i) { return h('li', { key: i }, s); })
            )
          )
        )
      ),

      // Final roll call
      h('div', { style: { padding: 12, marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 8 } },
        h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Final Roll Call'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 4 } },
          Object.keys(assigned).map(function(uid) {
            var iso = assigned[uid];
            var country = countryById(iso);
            if (!country) return null;
            var v = finalVotes[iso];
            var col = v ? (v.vote === 'Y' ? '#10b981' : v.vote === 'N' ? '#dc2626' : '#94a3b8') : '#475569';
            return h('div', {
              key: 'fc-' + uid,
              style: {
                padding: 4, fontSize: 10, background: col + '15', border: '1px solid ' + col, borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 4
              }
            },
              h('span', null, country.flag),
              h('span', { style: { flex: 1, fontWeight: 700 } }, country.iso),
              h('span', { style: { fontWeight: 900, color: col } }, v ? (v.vote === 'Y' ? '✓' : v.vote === 'N' ? '✗' : '○') : '—')
            );
          })
        )
      ),

      // Exit
      h('div', { style: { display: 'flex', justifyContent: 'center', gap: 8 } },
        h('button', {
          onClick: exitToLauncher,
          style: { padding: '10px 18px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, isSolo ? '🌐 Run another simulation' : '🌐 Close session')
      )
    );
  }

  // ═══════════════════════════════════════════
  // SpeechCard — one entry in the live speech feed.
  // ═══════════════════════════════════════════
  function SpeechCard(props) {
    var React = window.React;
    var h = React.createElement;
    var sp = props.speech;
    var myCountry = props.myCountry;
    var isMine = myCountry && sp.iso === myCountry.iso;
    return h('div', {
      style: {
        padding: 12,
        background: isMine ? 'rgba(16,185,129,0.10)' : 'rgba(255,255,255,0.04)',
        border: '1px solid ' + (isMine ? '#10b981' : '#334155'),
        borderRadius: 10
      }
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
        h('span', { style: { fontSize: 22 } }, sp.flag),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontWeight: 700, fontSize: 13 } }, sp.country),
          h('div', { style: { fontSize: 10, color: sp.isAi ? '#a855f7' : '#10b981', marginTop: 2 } },
            sp.isAi ? '🤖 AI delegate' : '👤 Delegate',
            isMine && ' · your speech'
          )
        )
      ),
      h('p', { style: { fontSize: 12, lineHeight: 1.7, color: '#cbd5e1', margin: 0 } }, sp.text),
      sp.keyPoints && sp.keyPoints.length > 0 && h('div', { style: { marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(255,255,255,0.12)' } },
        h('div', { style: { fontSize: 9, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } }, 'Key Points'),
        h('ul', { style: { margin: 0, paddingLeft: 16, fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
          sp.keyPoints.map(function(kp, i) { return h('li', { key: i }, kp); })
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // NewsDeskBanner — renders an AI-generated breaking-news event above the
  // current phase content. Host can trigger via button; everyone in session
  // sees the same banner (it lives in session.modelUn.news).
  // ═══════════════════════════════════════════
  function NewsDeskBanner(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var agenda = props.agenda;
    var committee = props.committee;
    var recentSpeeches = props.recentSpeeches || [];

    var news = modelUn.news;
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    function generateNews() {
      if (loading) return;
      setLoading(true);
      aiBreakingNews(ctx, agenda, recentSpeeches, committee).then(function(r) {
        setLoading(false);
        if (r) {
          updateMUN({ news: r });
          if (typeof ctx.addToast === 'function') ctx.addToast('📰 Breaking news broadcast to all delegates');
        } else {
          if (typeof ctx.addToast === 'function') ctx.addToast('News generation failed. Try again.');
        }
      }).catch(function() {
        setLoading(false);
      });
    }
    function dismissNews() {
      updateMUN({ news: null });
    }

    // No active news — host sees a small "📰 Breaking News" trigger button
    if (!news) {
      if (!isHost) return null;
      return h('button', {
        onClick: generateNews,
        disabled: loading,
        style: {
          padding: '6px 12px', fontSize: 11, fontWeight: 700,
          background: loading ? '#475569' : 'rgba(220,38,38,0.18)',
          color: loading ? '#94a3b8' : '#fca5a5',
          border: '1px dashed #dc2626', borderRadius: 6,
          cursor: loading ? 'wait' : 'pointer',
          marginBottom: 10
        },
        'aria-label': 'Broadcast a breaking news event to all delegates'
      }, loading ? '⏳ Generating breaking news…' : '📰 Inject breaking news (AI)');
    }

    // Active news — visible to everyone
    var affectedFlags = (news.affectedIsos || []).map(function(iso) {
      var c = countryById(iso); return c ? c.flag + ' ' + c.iso : iso;
    }).join(' · ');

    return h('div', {
      style: {
        marginBottom: 12,
        padding: 12,
        background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
        border: '2px solid #ef4444',
        borderRadius: 10,
        color: '#fef2f2'
      },
      role: 'alert',
      'aria-live': 'polite'
    },
      h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
        h('span', { style: { fontSize: 24 } }, '📰'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 9, color: '#fca5a5', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } },
            'Breaking · UN News Desk'
          ),
          h('div', { style: { fontSize: 15, fontWeight: 900, marginTop: 2, lineHeight: 1.3 } }, news.headline),
          h('p', { style: { fontSize: 12, lineHeight: 1.6, margin: '6px 0 0 0', color: '#fee2e2' } }, news.body),
          affectedFlags && h('div', { style: { fontSize: 10, color: '#fecaca', marginTop: 6, fontStyle: 'italic' } },
            'Most directly affected: ' + affectedFlags
          )
        ),
        isHost && h('button', {
          onClick: dismissNews,
          'aria-label': 'Dismiss news',
          style: {
            padding: '4px 8px', fontSize: 11, fontWeight: 700,
            background: 'rgba(255,255,255,0.12)', color: '#fee2e2',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, cursor: 'pointer'
          }
        }, '✕ Dismiss')
      )
    );
  }

  // Hot-reload guard — re-attach the launcher card data if needed
  if (typeof console !== 'undefined') {
    console.log('[arcade_mode_modelun] Plugin v0.5 loaded — ' + COUNTRIES.length + ' countries, ' + AGENDAS.length + ' agendas, ' + COMMITTEES.length + ' committees; full loop + AI news desk + 7 achievement hooks + amendments (strike/add/modify).');
  }

})();
