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

    // Future phases — placeholder
    return h('div', { style: { padding: 20, textAlign: 'center', color: '#cbd5e1' } },
      h('div', { style: { fontSize: 40, marginBottom: 8 } }, '🚧'),
      h('div', { style: { fontWeight: 700, marginBottom: 6 } }, 'Phase "' + phase + '" coming soon'),
      h('p', { style: { fontSize: 12, color: '#94a3b8' } }, 'Debate, voting, and debrief phases ship in the next update. For now, briefing is the end of v0.1.'),
      isHost && h('button', {
        onClick: function() { updateMUN({ phase: PHASES.BRIEFING }); },
        style: { marginTop: 12, padding: '8px 16px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }
      }, '← Back to Briefing')
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
          onClick: function() { updateMUN({ phase: PHASES.OPENING_SPEECHES }); },
          style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Begin Opening Speeches → (v0.2)')
      ),
      !isHost && h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 12 } },
        'Waiting for the Chair to open the debate…'
      )
    );
  }

  // Hot-reload guard — re-attach the launcher card data if needed
  if (typeof console !== 'undefined') {
    console.log('[arcade_mode_modelun] Plugin v0.1 loaded — ' + COUNTRIES.length + ' countries, ' + AGENDAS.length + ' agendas, ' + COMMITTEES.length + ' committees.');
  }

})();
