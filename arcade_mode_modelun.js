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
        nuclear_nonprolif:  'P5 member; supports NPT and CTBT; opposes Iran and North Korea programs.',
        food_security:      'Major aid donor through USAID and WFP; supports market-based ag reform; resists tariff-only solutions.',
        cybersecurity:      'Pushes liberal-democratic norms; CISA-led private-sector partnerships; cool on UN cybercrime treaty.',
        migration_compact:  'Did not sign GCM; bilateral border deals; oscillating asylum + enforcement posture.',
        womens_rights:      'Signed but never ratified CEDAW; Title IX domestic anchor; Mexico City Policy oscillates by admin.'
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
        nuclear_nonprolif:  'P5; modernizing arsenal; opposes US/UK tactical deployments to Asia-Pacific.',
        food_security:      'Aggressive grain-stockpile strategy; BRI ag investments; resists Western ag-subsidy framings.',
        cybersecurity:      'Cyber-sovereignty doctrine; pushes UN-led framework via SCO; rejects US-led norms.',
        migration_compact:  'Did not sign GCM; rejects refugee burden-sharing; tight border policies.',
        womens_rights:      'Demographic focus reshaping policy; resists LGBTQ+ inclusion in international working groups.'
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
        nuclear_nonprolif:  'P5; doctrine flexibility; opposes NATO eastern deployments.',
        food_security:      'Major grain exporter; weaponizes wheat exports; periodically blocks Black Sea corridor.',
        cybersecurity:      'Resists Western attribution norms; advances own UN cybercrime convention; sovereignty-first.',
        migration_compact:  'Limited GCM engagement; CIS bilateral labor framework preferred over global compact.',
        womens_rights:      'Decriminalized domestic violence (2017); "LGBT propaganda" expanded ban; conservative bloc lead.'
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
        nuclear_nonprolif:  'P5; modernizing deterrent; supports NPT.',
        food_security:      'Strong FCDO development funder; backs nutrition-sensitive agriculture; G7 food task force.',
        cybersecurity:      'NCSC + Five Eyes; offensive cyber capability disclosed; international norms advocate.',
        migration_compact:  'Did not sign GCM; tightened asylum; Rwanda removal scheme controversy.',
        womens_rights:      'Women-Peace-Security advocate; backs CEDAW; gender-mainstreaming in development policy.'
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
        nuclear_nonprolif:  'P5; smallest declared arsenal among nuclear powers; supports NPT.',
        food_security:      'Backs EU CAP green pivot; advocates fair trade in Africa; defends agricultural sovereignty.',
        cybersecurity:      'ANSSI-led EU resilience push; Paris Call for Trust and Security in Cyberspace champion.',
        migration_compact:  'Signed GCM; supports orderly EU intake; tightened domestic asylum.',
        womens_rights:      'Feminist foreign policy advocate; Generation Equality Forum host; abortion-rights advocate.'
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
        nuclear_nonprolif:  'Non-nuclear NATO host (US weapons); supports NPT.',
        food_security:      'Hosts Global Forum for Food and Agriculture; backs Africa-EU agri-investment; resists CAP rollback.',
        cybersecurity:      'BSI domestic lead; EU Cybersecurity Act backer; opposes broad surveillance powers.',
        migration_compact:  'Signed GCM; integration-funding leader; Skilled Immigration Act expansion.',
        womens_rights:      'Adopted feminist foreign policy (2023); pay-gap legislation; CEDAW compliance review.'
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
        nuclear_nonprolif:  'Non-nuclear; under US extended deterrence; supports NPT.',
        food_security:      'Low self-sufficiency anxiety; rice diplomacy in Asia; G7 food-security task force backer.',
        cybersecurity:      'Active Cyber Defense pivot (2024); Quad cyber partnership; resilience focus.',
        migration_compact:  'Signed GCM; Specified Skilled Worker program expanding; demographic-driven.',
        womens_rights:      'Womenomics initiative; persistent OECD-low pay/leadership gap; gradual reform.'
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
        nuclear_nonprolif:  'Non-NPT nuclear state; pushes for full membership including NSG.',
        food_security:      'PDS subsidy defender at WTO; Right to Food Act; opposes WTO ag-subsidy caps.',
        cybersecurity:      'Digital sovereignty + data localization push; cautious on UN cybercrime treaty overreach.',
        migration_compact:  'Did not sign GCM; CAA citizenship law controversial; large diaspora protection focus.',
        womens_rights:      'Beti Bachao Beti Padhao campaign; constitutional reservation; uneven implementation.'
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
        nuclear_nonprolif:  'Latin America nuclear-free zone; supports NPT.',
        food_security:      'Major exporter; Zero Hunger program legacy; Lula re-prioritized Family Farm Program.',
        cybersecurity:      'LGPD data-protection law; multilateral approach; favors UN-led cyber norms.',
        migration_compact:  'Signed GCM; humanitarian visa for Venezuelans and Haitians; Roraima emergency response.',
        womens_rights:      'High GBV rates; Ministry of Women restored 2023; femicide criminalized.'
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
        nuclear_nonprolif:  'Non-nuclear; uranium supplier; supports NPT strongly.',
        food_security:      'Cairns Group founder; Feminist International Assistance Policy ties food to gender.',
        cybersecurity:      'CSE + Five Eyes; ransomware-payment policy debates; critical infrastructure focus.',
        migration_compact:  'Signed GCM; high per-capita intake target; Express Entry economic stream.',
        womens_rights:      'Original feminist foreign policy adopter; backs UN Women; gender-based-analysis-plus framework.'
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
        nuclear_nonprolif:  'Non-nuclear; AUKUS submarines (conventional warheads).',
        food_security:      'Cairns Group major exporter; aid focus on Pacific food resilience.',
        cybersecurity:      'ASD + Five Eyes; Critical Infrastructure Act; AUKUS Pillar II cyber.',
        migration_compact:  'Did not sign GCM; offshore processing controversy; modest humanitarian intake.',
        womens_rights:      'National Action Plan on Women, Peace and Security; strong CEDAW backer.'
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
        nuclear_nonprolif:  'Non-nuclear; under US extended deterrence; supports NPT.',
        food_security:      'Low self-sufficiency anxiety; backs ASEAN+3 Emergency Rice Reserve.',
        cybersecurity:      'K-CSIRT capacity; offensive doctrine vs DPRK; private-sector innovation.',
        migration_compact:  'Signed GCM; F-visa skilled-worker expansion; demographic pressure.',
        womens_rights:      'Persistent OECD-low gender pay gap; #MeToo legislative reforms; demographic crisis dimension.'
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
        nuclear_nonprolif:  'Voluntarily disarmed (only country to do so); strong NPT supporter.',
        food_security:      'Land-reform policy drives production debate; backs African Continental ag integration.',
        cybersecurity:      'POPIA data-protection law; African Cyber Union supporter.',
        migration_compact:  'Signed GCM with reservations; persistent xenophobic violence; AU Free Movement protocol delays.',
        womens_rights:      'High femicide rate (4x global avg); strong constitutional protections; implementation gap.'
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
        nuclear_nonprolif:  'Non-nuclear; Pelindaba Treaty signatory; NPT supporter.',
        food_security:      'Africa\'s largest food producer and importer; Anchor Borrowers\' Program; Boko Haram disrupts north.',
        cybersecurity:      'Cybercrime Act 2015; ECOWAS cyber strategy backer; bank-fraud focus.',
        migration_compact:  'Signed GCM; remittance-dependent diaspora; ECOWAS free movement member.',
        womens_rights:      'Constitutional protections; Northern Sharia states variance; child-marriage hotspot.'
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
        nuclear_nonprolif:  'Non-nuclear; Pelindaba Treaty.',
        food_security:      'Drought-recovery + food-import dependence; smallholder maize farmer focus; GMO debate.',
        cybersecurity:      'Computer Misuse Act 2018; African Union cyber lead; Konza Tech City build-out.',
        migration_compact:  'Signed GCM; major refugee host (Somali/South Sudanese); Dadaab/Kakuma camps.',
        womens_rights:      'Constitutional gender protections; FGM/C banned 2011; political-representation quotas.'
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
        nuclear_nonprolif:  'Non-nuclear; advocates for nuclear-weapon-free Middle East.',
        food_security:      'Largest wheat importer globally; bread-subsidy political stakes; Black Sea corridor critical.',
        cybersecurity:      'Cybercrime Law 2018 chilling effect concerns; Arab cyber strategy participant.',
        migration_compact:  'Signed GCM; transit + host country; African Union migration coordinator.',
        womens_rights:      'CEDAW with reservations; FGM/C banned 2008 (uneven enforcement); inheritance reform debates.'
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
        nuclear_nonprolif:  'Non-nuclear; hinted at matching Iran capability if needed.',
        food_security:      'Massive food importer; Vision 2030 ag-investment abroad; halal supply chain emphasis.',
        cybersecurity:      'NCA national authority; reactive posture after Aramco attack; cool on liberal-democratic norms.',
        migration_compact:  'Signed GCM; kafala labor reform pace contested; migrant-worker majority workforce.',
        womens_rights:      'Vision 2030 reforms (driving 2018, guardianship loosened); persistent advocacy crackdowns.'
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
        nuclear_nonprolif:  'NPT member; insists program is civilian; opposes Israeli ambiguity.',
        food_security:      'Sanctions-exemption advocate; water-scarcity crisis driving internal migration.',
        cybersecurity:      'APT35/APT39 attributions; halal-internet policy; opposes Western frameworks.',
        migration_compact:  'Signed GCM; world\'s largest refugee host (Afghans); chronically under-funded.',
        womens_rights:      'Mahsa Amini protests legacy; mandatory hijab; international advocacy crackdown.'
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
        nuclear_nonprolif:  'Undeclared nuclear state; not NPT signatory; ambiguity policy.',
        food_security:      'Ag-tech exporter (drip irrigation); strong food-security narrative; Gaza access controversy.',
        cybersecurity:      'Unit 8200 expertise; Iron Dome cyber-defense exporter; INCD national agency.',
        migration_compact:  'Did not sign GCM; restrictive asylum (esp. African); Russian/Ukrainian intake.',
        womens_rights:      'Gender-equal IDF service; persistent religious-secular tension; pay-gap legislation.'
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
        nuclear_nonprolif:  'NATO host (US weapons); non-nuclear; supports NPT.',
        food_security:      'Black Sea Grain corridor mediator; aid to Syrian-host regions; ag self-sufficiency push.',
        cybersecurity:      'USOM coordination; NATO ally with sovereignty caveats; cyber-norms ambivalence.',
        migration_compact:  'Signed GCM; world\'s largest single-country refugee host (Syrians); EU readmission deal.',
        womens_rights:      'Istanbul Convention withdrawal (2021); rising femicide; civil-society pushback.'
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
        nuclear_nonprolif:  'Tlatelolco Treaty leader; strong NPT supporter.',
        food_security:      'GMO-corn import dispute with US; smallholder farmer protection; SADER agricultural strategy.',
        cybersecurity:      'Limited offensive capacity; PEMEX attack legacy; USMCA-framed US cooperation.',
        migration_compact:  'Signed GCM; transit + destination + origin country; US-Mexico bilateral pressure.',
        womens_rights:      'Femicide crisis high-visibility; gender-parity in Congress; abortion decriminalization wave.'
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
        nuclear_nonprolif:  'Tlatelolco Treaty; civilian nuclear program; NPT.',
        food_security:      'Top-5 grain/beef exporter; tension between Vaca Muerta extraction and ag land; G20 ag voice.',
        cybersecurity:      'PDP data-protection law; OAS CICTE backer; limited offensive doctrine.',
        migration_compact:  'Signed GCM; Latin America Compact contributor; Venezuelan/Bolivian intake.',
        womens_rights:      'Abortion legalized 2020 (regional leader); persistent femicide concerns; gender-violence prevention law.'
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
        nuclear_nonprolif:  'Non-nuclear; Bangkok Treaty (SE Asia NWFZ).',
        food_security:      'Rice self-sufficiency mandate; palm-oil export tension with EU; smallholder support.',
        cybersecurity:      'BSSN national agency; UU PDP 2022 data law; ASEAN cyber capacity-building.',
        migration_compact:  'Signed GCM; major sending country (domestic workers); Rohingya transit concerns.',
        womens_rights:      'Strong national women\'s ministry; persistent FGM/C; child-marriage reform.'
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
        nuclear_nonprolif:  'Non-nuclear; Bangkok Treaty.',
        food_security:      'Top rice exporter; Mekong climate vulnerability; ag-product diversification push.',
        cybersecurity:      'Cybersecurity Law 2019 controversial (data localization, content control); APT32 attribution.',
        migration_compact:  'Signed GCM; labor migration to JP/KR/Taiwan; remittance economy.',
        womens_rights:      'Gender equality in constitution; female leadership in legislature; rural gap persists.'
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
        nuclear_nonprolif:  'Non-nuclear; Bangkok Treaty.',
        food_security:      'Rice importer; tropical-cyclone supply disruption; ASEAN+3 Emergency Rice Reserve member.',
        cybersecurity:      'DICT Cybersecurity Plan; persistent Chinese APT concern; press-freedom chilling effects.',
        migration_compact:  'Signed GCM; OFW economy backbone; remittance-dependent; bilateral labor agreements.',
        womens_rights:      'Magna Carta of Women (2009); divorce-prohibition reform pending; RH Law debates ongoing.'
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
        nuclear_nonprolif:  'Non-nuclear; NATO host; supports NPT.',
        food_security:      'EU CAP recipient; Ukrainian grain transit disputes 2023-24; rising ag-protectionism.',
        cybersecurity:      'NASK + cyber command; NATO Cooperative Cyber Defence CoE host; RU APT focus.',
        migration_compact:  'Did not sign GCM (2018); Ukrainian intake 2022+; Belarus border crisis posture.',
        womens_rights:      'Near-total abortion ban (2020); 2023 government shift loosening stance; pay-gap legislation.'
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
        nuclear_nonprolif:  'Voluntarily disarmed under Budapest Memorandum; NPT supporter.',
        food_security:      'Pre-war 10% of global wheat exports; Black Sea Grain Initiative champion; corridor advocacy.',
        cybersecurity:      'Battlefield cyber-warfare experience; NATO cyber-coalition partnership; CERT-UA active.',
        migration_compact:  'Signed GCM; 6M+ displaced since 2022; reconstruction migration policy in flux.',
        womens_rights:      'Combat service expansion; conflict-related GBV documentation focus; CEDAW commitments.'
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
        nuclear_nonprolif:  'Non-nuclear; NATO; strong NPT supporter.',
        food_security:      'Major aquaculture exporter; Svalbard Global Seed Vault host; high food-import dependence.',
        cybersecurity:      'NSM + NATO partner; offensive-cyber transparency advocate; private-sector resilience focus.',
        migration_compact:  'Did not sign GCM (2018); EEA-aligned asylum; integration-focused intake.',
        womens_rights:      'Gender board quotas (40%); strong parental-leave policy; feminist foreign policy advocate.'
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
        nuclear_nonprolif:  'Non-nuclear; mediator on Iran deal; supports NPT.',
        food_security:      'Geneva HQ for WFP/FAO ops; strong humanitarian funding; ag-protectionism domestic.',
        cybersecurity:      'NCSC + neutrality balance; GovWare ban; ICT-supply-chain caution.',
        migration_compact:  'Signed GCM; strict asylum + integration framework; ICRC HQ duty.',
        womens_rights:      'Late voting franchise (1971); gender-equality act 1996; CEDAW periodic review.'
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
        nuclear_nonprolif:  'Nuclear-free zone (1987 Act); strong NPT + TPNW supporter.',
        food_security:      'Cairns Group; agricultural export powerhouse; methane-reduction ag policy.',
        cybersecurity:      'GCSB + Five Eyes; supply-chain caution (Huawei 5G ban); Pacific cyber capacity-building.',
        migration_compact:  'Signed GCM; humanitarian intake under refugee-resettlement strategy.',
        womens_rights:      'First country with women\'s suffrage (1893); strong pay-gap framework; gender-mainstreaming.'
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
    },
    { id: 'food_security', title: 'Global Food Security', emoji: '🌾',
      background: 'Approximately 783 million people face hunger globally. Climate change, conflict, and supply-chain disruptions compound the crisis. The World Food Programme reports record demand against falling donor support.',
      keyQuestions: [
        'How are emergency food-aid contributions allocated and triggered?',
        'What role do agricultural subsidies in wealthy nations play in distorting global markets?',
        'How is climate-resilient agriculture funded for smallholder farmers?',
        'What protections exist for food-systems workers and indigenous food sovereignty?'
      ],
      sampleClauses: [
        'Calls upon Member States to scale annual contributions to the World Food Programme by 30%;',
        'Establishes a Climate-Resilient Agriculture Trust Fund prioritizing smallholder farmers in least-developed countries;',
        'Urges removal of trade-distorting agricultural subsidies inconsistent with WTO commitments by 2030.'
      ]
    },
    { id: 'cybersecurity', title: 'Cybersecurity & Sovereignty in Cyberspace', emoji: '🔐',
      background: 'State and non-state cyberattacks on critical infrastructure (hospitals, power grids, election systems) are accelerating. Existing international law applies in cyberspace, but operational norms remain contested. Recent ransomware incidents have caused billions in damages.',
      keyQuestions: [
        'What state behavior in cyberspace constitutes an armed attack triggering self-defense rights?',
        'How is critical infrastructure protected through international cooperation?',
        'What responsibility do states bear for non-state actors operating from their territory?',
        'How are vulnerabilities disclosed responsibly between researchers and vendors?'
      ],
      sampleClauses: [
        'Reaffirms that existing international law, including the UN Charter, applies in cyberspace;',
        'Establishes a UN Cybersecurity Incident Response Coordination Center for cross-border attacks on critical infrastructure;',
        'Calls upon Member States to refrain from cyber operations targeting election systems and civilian infrastructure.'
      ]
    },
    { id: 'migration_compact', title: 'Global Migration Compact Implementation', emoji: '🌍',
      background: 'The Global Compact for Safe, Orderly and Regular Migration (2018) set 23 objectives for managed mobility. Implementation varies widely; receiving and origin countries continue to disagree on responsibility-sharing. Climate displacement is reshaping migration flows.',
      keyQuestions: [
        'How are remittance flows (~$650B annually) protected and made cheaper?',
        'What pathways exist for skilled vs unskilled labor migration?',
        'How is climate displacement integrated with existing migration frameworks?',
        'What protections apply to migrant children and unaccompanied minors?'
      ],
      sampleClauses: [
        'Reaffirms commitments under the Global Compact for Safe, Orderly and Regular Migration;',
        'Calls upon Member States to reduce average remittance transfer costs below 3% by 2030 per SDG 10.c;',
        'Establishes a Climate Mobility Coordination Mechanism to integrate climate displacement with existing migration governance.'
      ]
    },
    { id: 'womens_rights', title: 'Women, Peace & Security Agenda', emoji: '⚖️',
      background: 'UN Security Council Resolution 1325 (2000) and follow-ons recognize the disproportionate impact of conflict on women + the underrepresentation of women in peace processes. Progress is uneven; gender-based violence in conflict zones persists.',
      keyQuestions: [
        'What targets ensure meaningful participation of women in peace negotiations?',
        'How is conflict-related sexual violence accountability strengthened?',
        'What economic recovery measures specifically support women in post-conflict reconstruction?',
        'How is access to reproductive healthcare protected during humanitarian crises?'
      ],
      sampleClauses: [
        'Reaffirms commitments under UN Security Council Resolution 1325 and its follow-on resolutions;',
        'Calls upon Member States to establish national action plans with measurable participation targets for women in peace processes;',
        'Urges that humanitarian response plans include comprehensive sexual and reproductive health services as a core component.'
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
  // DATA — Voting blocs. Real Model UN runs on bloc politics; coalitions
  // co-sponsor resolutions and trade amendments. Color is used for the
  // BlocsPanel visualization in the Draft phase.
  // ═══════════════════════════════════════════
  var BLOCS = [
    { id: 'p5',         name: 'P5 (Security Council Permanent)', color: '#dc2626', members: ['USA','CHN','RUS','GBR','FRA'] },
    { id: 'nato',       name: 'NATO',                             color: '#1d4ed8', members: ['USA','GBR','FRA','DEU','CAN','POL','NOR','TUR'] },
    { id: 'eu',         name: 'European Union',                   color: '#fbbf24', members: ['FRA','DEU','POL','CHE'] }, // CHE isn't EU but Western Europe anchor here
    { id: 'g7',         name: 'G7',                               color: '#0ea5e9', members: ['USA','GBR','FRA','DEU','JPN','CAN'] },
    { id: 'brics',      name: 'BRICS',                            color: '#a855f7', members: ['BRA','RUS','IND','CHN','ZAF','EGY','IRN','SAU'] },
    { id: 'african',    name: 'African Group',                    color: '#10b981', members: ['ZAF','NGA','KEN','EGY'] },
    { id: 'latam',      name: 'Latin America & Caribbean (GRULAC)', color: '#f97316', members: ['BRA','MEX','ARG'] },
    { id: 'asean',      name: 'ASEAN',                            color: '#06b6d4', members: ['IDN','VNM','PHL'] },
    { id: 'arab',       name: 'Arab League',                      color: '#84cc16', members: ['SAU','EGY'] },
    { id: 'quad',       name: 'Quad',                             color: '#3b82f6', members: ['USA','JPN','IND','AUS'] },
    { id: 'nam',        name: 'Non-Aligned Movement',             color: '#ec4899', members: ['IND','BRA','ZAF','NGA','KEN','EGY','IDN','VNM','PHL','SAU','ARG','IRN'] },
    { id: 'cairns',     name: 'Cairns Group (ag exporters)',      color: '#65a30d', members: ['ARG','AUS','BRA','CAN','NZL','ZAF','IDN','VNM'] }
  ];

  function blocsForCountry(iso) {
    var out = [];
    for (var i = 0; i < BLOCS.length; i++) {
      if (BLOCS[i].members.indexOf(iso) !== -1) out.push(BLOCS[i]);
    }
    return out;
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
    POSITION_PAPER:  'position_paper',
    OPENING_SPEECHES:'opening_speeches',
    MOD_CAUCUS:      'mod_caucus',
    UNMOD_CAUCUS:    'unmod_caucus',     // future
    DRAFT:           'draft',
    AMEND:           'amend',            // (handled inline via AmendmentModal)
    VOTE:            'vote',
    DEBRIEF:         'debrief'
  };

  // ═══════════════════════════════════════════
  // GLOSSARY — MUN procedural + agenda vocabulary
  // Each entry: { term, definition, phaseTags: ['setup', 'speeches', ...] }
  // Surfaced via the HelpPanel modal, opened by the "?" button in each phase header.
  // UDL move: just-in-time vocabulary support without cluttering the UI.
  // ═══════════════════════════════════════════
  var GLOSSARY = [
    // Procedural terms
    { term: 'Delegate', def: 'A person representing a country in the committee. You speak and vote on behalf of your assigned country, not your personal beliefs.', phases: ['setup', 'briefing', 'speeches', 'caucus', 'draft', 'vote'] },
    { term: 'Chair / Dais', def: 'The student or teacher running the committee. The Chair recognizes speakers, manages time, calls votes, and rules on motions.', phases: ['setup', 'briefing', 'speeches', 'caucus', 'draft', 'vote'] },
    { term: 'Recognition', def: 'When the Chair gives a delegate the floor — i.e., permission to speak. You can\'t speak until you are recognized.', phases: ['speeches', 'caucus'] },
    { term: 'Yielding the floor', def: 'When a speaker finishes early, they can yield remaining time to (a) another delegate, (b) questions, or (c) back to the Chair.', phases: ['speeches', 'caucus'] },
    { term: 'Roll Call', def: 'The opening procedure where the Chair confirms each delegation\'s presence and voting status (Present / Present and Voting).', phases: ['briefing', 'vote'] },
    // Speech / debate terms
    { term: 'Opening Speech', def: 'Your first formal speech: a 1-2 minute statement of your country\'s position on the agenda. Covers history, interests, and proposals.', phases: ['speeches'] },
    { term: 'Moderated Caucus', def: 'A focused mini-debate on a specific sub-topic. The Chair calls on speakers in turn; each gets a short fixed time (30-60s typical).', phases: ['speeches', 'caucus'] },
    { term: 'Unmoderated Caucus', def: 'Informal time when delegates leave their seats to talk freely — for coalition-building and clause-drafting. (Not yet implemented in this sim.)', phases: ['speeches', 'caucus'] },
    { term: 'Motion', def: 'A formal proposal to do something procedural — e.g., "I move for a moderated caucus on climate finance, 8 minutes, 30 seconds speaking time."', phases: ['speeches', 'caucus', 'draft'] },
    { term: 'Point of Order', def: 'A formal interruption to flag a procedural error or improper conduct. Always recognized by the Chair.', phases: ['speeches', 'caucus', 'vote'] },
    // Resolution / clause terms
    { term: 'Resolution', def: 'The formal document the committee tries to pass. Composed of preambulatory clauses (context/justification) + operative clauses (actions).', phases: ['draft', 'vote'] },
    { term: 'Preambulatory Clause', def: 'A clause that provides context, history, or moral framing. Begins with -ing or -ed words like "Recognizing," "Recalling," "Concerned by," "Acknowledging,".', phases: ['draft', 'vote'] },
    { term: 'Operative Clause', def: 'A numbered clause that calls for specific action. Begins with verbs like "Calls upon," "Urges," "Establishes," "Requests," "Encourages,".', phases: ['draft', 'vote'] },
    { term: 'Amendment', def: 'A change to a clause already on the floor. Three kinds: STRIKE (delete), ADD (insert), or MODIFY (rewrite). Voted on separately.', phases: ['draft', 'vote'] },
    { term: 'Sponsor', def: 'A delegation that publicly endorses a draft resolution. Sponsors typically support all clauses; signatories support its consideration but may vote no.', phases: ['draft'] },
    // Voting terms
    { term: 'Vote: Yes / Aye / Y', def: 'You support the resolution as currently written. A simple majority of cast votes (Y > N) passes most resolutions.', phases: ['vote'] },
    { term: 'Vote: No / Nay / N', def: 'You oppose the resolution. Even a single P5 No can block a Security Council resolution (veto).', phases: ['vote'] },
    { term: 'Vote: Abstain / A', def: 'You don\'t want to take sides. Abstentions don\'t count toward Yes or No tallies — they reduce the threshold neither way.', phases: ['vote'] },
    { term: 'Roll Call Vote', def: 'A vote where each delegate is called by name and states their vote publicly. Slower but more transparent than a simple vote.', phases: ['vote'] },
    // Agenda-specific
    { term: 'NPT', def: 'Nuclear Non-Proliferation Treaty (1968). 191 members. Three pillars: non-proliferation, disarmament, peaceful use. Five recognized nuclear-weapon states (P5).', phases: ['briefing'] },
    { term: 'UNCLOS', def: 'United Nations Convention on the Law of the Sea (1982). The legal framework for all maritime activities — territorial waters, EEZs, freedom of navigation.', phases: ['briefing'] },
    { term: 'P5 / Permanent Five', def: 'The five permanent members of the UN Security Council: United States, China, Russia, United Kingdom, France. Each has veto power.', phases: ['briefing', 'vote'] },
    { term: 'Loss & Damage', def: 'Climate-finance term for compensation/support to climate-vulnerable countries for unavoidable harms (rising seas, displacement). COP27 established a fund.', phases: ['briefing'] },
    { term: 'Non-refoulement', def: 'Principle of international refugee law: states may not return refugees to a country where they would face persecution. Foundational to the 1951 Convention.', phases: ['briefing'] },
    { term: 'JETP', def: 'Just Energy Transition Partnership. Multi-billion-dollar deals between G7 countries and coal-dependent developing economies (South Africa, Indonesia, Vietnam) to fund coal phase-out.', phases: ['briefing'] }
  ];

  // Filter glossary by phase tag
  function glossaryForPhase(phaseKey) {
    return GLOSSARY.filter(function(t) { return t.phases.indexOf(phaseKey) !== -1; });
  }

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
          progress: function() { return (window.__alloHavenModelUNStats.totalClauses || 0) + '/3'; } },
        { id: 'position_paper',   label: 'Submit a written position paper',    icon: '📝',
          check: function() { return (window.__alloHavenModelUNStats.positionPapersSubmitted || 0) >= 1; },
          progress: function() { return (window.__alloHavenModelUNStats.positionPapersSubmitted || 0) >= 1 ? 'Done!' : 'Not yet'; } },
        { id: 'crisis_responder', label: 'React to a breaking-news crisis',    icon: '🚨',
          check: function() { return (window.__alloHavenModelUNStats.crisisResponsesGiven || 0) >= 1; },
          progress: function() { return (window.__alloHavenModelUNStats.crisisResponsesGiven || 0) >= 1 ? 'Done!' : 'Not yet'; } },
        { id: 'consistency_master', label: 'Hit 90+ on diplomatic consistency', icon: '📐',
          check: function() { return (window.__alloHavenModelUNStats.bestConsistencyScore || 0) >= 90; },
          progress: function() { return (window.__alloHavenModelUNStats.bestConsistencyScore || 0) + '/90'; } },
        { id: 'backchannel_diplomat', label: 'Pass a private backchannel note', icon: '📬',
          check: function() { return (window.__alloHavenModelUNStats.backchannelMessagesSent || 0) >= 1; },
          progress: function() { return (window.__alloHavenModelUNStats.backchannelMessagesSent || 0) >= 1 ? 'Done!' : 'Not yet'; } }
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

    // Floating helpers visible in all active-debate phases (not setup/assignment).
    // Wrap any active-phase view + the floating Coach + Notes so they appear
    // everywhere a delegate might be working.
    function withFloatingHelpers(viewElement) {
      return h(React.Fragment, null,
        viewElement,
        h(AICoachButton,  { ctx: ctx, modelUn: modelUn, sessionState: sessionState, isSolo: isSolo }),
        h(DelegateNotes,  { ctx: ctx, modelUn: modelUn, isSolo: isSolo })
      );
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
      return withFloatingHelpers(h(BriefingView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState }));
    }
    if (phase === PHASES.POSITION_PAPER) {
      return withFloatingHelpers(h(PositionPaperView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState }));
    }
    if (phase === PHASES.OPENING_SPEECHES) {
      return withFloatingHelpers(h(OpeningSpeechesView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState }));
    }
    if (phase === PHASES.MOD_CAUCUS) {
      return withFloatingHelpers(h(ModCaucusView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState }));
    }
    if (phase === PHASES.DRAFT) {
      return withFloatingHelpers(h(DraftResolutionView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState }));
    }
    if (phase === PHASES.VOTE) {
      return withFloatingHelpers(h(VotingView, { ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost || isSolo, isSolo: isSolo, sessionState: sessionState }));
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

    var myUid = isSolo ? 'me' : (ctx.userId || 'me');
    var myIso = assigned[myUid];
    var myCountry = myIso ? countryById(myIso) : null;

    var helpTuple = useState(false);
    var helpOpen = helpTuple[0];
    var setHelpOpen = helpTuple[1];

    return h('div', { style: { padding: 18, color: '#e2e8f0', maxWidth: 900, margin: '0 auto', position: 'relative' } },
      helpOpen && h(HelpPanel, { phaseKey: 'briefing', onClose: function() { setHelpOpen(false); } }),
      // Top banner with help button
      h('div', { style: { marginBottom: 16, padding: 14, background: 'linear-gradient(135deg, #0c4a6e 0%, #155e75 100%)', borderRadius: 12, position: 'relative' } },
        h('button', {
          onClick: function() { setHelpOpen(true); },
          'aria-label': 'Open vocabulary help panel',
          style: { position: 'absolute', top: 10, right: 10, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }
        }, '? Help'),
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
          onClick: function() { updateMUN({ phase: PHASES.POSITION_PAPER }); },
          style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Open Position Papers →')
      ),
      !isHost && h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', marginTop: 12 } },
        'Waiting for the Chair to advance the debate…'
      )
    );
  }

  // ═══════════════════════════════════════════
  // PositionPaperView — pre-debate research scaffold.
  // Each delegate fills out a 4-field paper (background, stance, solutions,
  // allies). Stored under modelUn.positionPapers[uid]. The paper becomes the
  // grounding source for that delegate's AI speech-starter — making the AI
  // sound like THIS student's analysis instead of generic country talking
  // points. Pedagogically: retrieval practice + UDL multi-means-of-expression.
  // ═══════════════════════════════════════════
  function PositionPaperView(props) {
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
    var papers = modelUn.positionPapers || {};

    var myUid = isSolo ? 'me' : (ctx.userId || 'me');
    var myIso = assigned[myUid];
    var myCountry = myIso ? countryById(myIso) : null;
    var myPaper = papers[myUid] || { background: '', stance: '', solutions: '', allies: '' };

    var formTuple = useState(myPaper);
    var form = formTuple[0];
    var setForm = formTuple[1];

    var statusTuple = useState({ saving: false, drafting: false, critiquing: false, critique: null });
    var status = statusTuple[0];
    var setStatus = statusTuple[1];

    var helpTuple = useState(false);
    var helpOpen = helpTuple[0];
    var setHelpOpen = helpTuple[1];

    var humanUids = Object.keys(assigned).filter(function(uid) { return uid.indexOf('ai_') !== 0; });
    var submittedCount = humanUids.filter(function(uid) { return papers[uid] && papers[uid].savedAt; }).length;

    function patchField(field, value) {
      var next = Object.assign({}, form);
      next[field] = (value || '').slice(0, 1500); // doc-budget cap per field
      setForm(next);
    }

    function savePaper() {
      if (!myCountry) return;
      setStatus(Object.assign({}, status, { saving: true }));
      var nextPapers = Object.assign({}, papers);
      nextPapers[myUid] = {
        background: form.background || '',
        stance: form.stance || '',
        solutions: form.solutions || '',
        allies: form.allies || '',
        savedAt: Date.now()
      };
      updateMUN({ positionPapers: nextPapers });
      setTimeout(function() { setStatus(Object.assign({}, status, { saving: false })); }, 400);
      bumpStat('positionPapersSubmitted', 1);
    }

    function aiDraft() {
      if (!myCountry || !agenda) return;
      setStatus(Object.assign({}, status, { drafting: true }));
      aiDraftPositionPaper(ctx, myCountry, agenda, committee).then(function(draft) {
        setStatus(Object.assign({}, status, { drafting: false }));
        if (!draft) {
          if (typeof ctx.addToast === 'function') ctx.addToast('AI starter unavailable; please draft manually.');
          return;
        }
        setForm({
          background: draft.background || '',
          stance: draft.stance || '',
          solutions: draft.solutions || '',
          allies: draft.allies || ''
        });
      });
    }

    function aiCritique() {
      if (!myCountry || !agenda) return;
      if (!form.stance || form.stance.length < 30) {
        if (typeof ctx.addToast === 'function') ctx.addToast('Write at least a stance sentence before requesting AI feedback.');
        return;
      }
      setStatus(Object.assign({}, status, { critiquing: true, critique: null }));
      aiCritiquePositionPaper(ctx, myCountry, agenda, form).then(function(result) {
        setStatus(Object.assign({}, status, { critiquing: false, critique: result }));
      });
    }

    function exportPrint() {
      try {
        var name = myCountry ? myCountry.name : 'Delegation';
        var w = window.open('', '_blank', 'width=820,height=900');
        if (!w) return;
        var html =
          '<!doctype html><html><head><meta charset="utf-8"><title>Position Paper — ' + name + '</title>' +
          '<style>body{font-family:Georgia,serif;max-width:760px;margin:36px auto;color:#1f2937;line-height:1.55;padding:0 16px}' +
          'h1{font-size:22px;margin-bottom:0}h2{font-size:14px;color:#0f766e;text-transform:uppercase;letter-spacing:1px;margin-top:24px;margin-bottom:6px}' +
          '.meta{color:#6b7280;font-size:12px}p{white-space:pre-wrap;font-size:13px}' +
          '@media print{body{margin:0}}</style></head><body>' +
          '<h1>Position Paper — ' + name + '</h1>' +
          '<div class="meta">' + (committee ? committee.name : '') + ' · ' + (agenda ? agenda.title : '') + '</div>' +
          '<h2>Country Background</h2><p>' + escapeHtml(form.background || '(not yet drafted)') + '</p>' +
          '<h2>Position / Stance</h2><p>' + escapeHtml(form.stance || '(not yet drafted)') + '</p>' +
          '<h2>Proposed Solutions</h2><p>' + escapeHtml(form.solutions || '(not yet drafted)') + '</p>' +
          '<h2>Allied Delegations</h2><p>' + escapeHtml(form.allies || '(not yet drafted)') + '</p>' +
          '<div class="meta" style="margin-top:32px">Generated by AlloFlow Model UN.</div>' +
          '</body></html>';
        w.document.open(); w.document.write(html); w.document.close();
        setTimeout(function() { try { w.print(); } catch (e) {} }, 500);
      } catch (e) { /* silent */ }
    }

    function fieldBox(label, hint, value, field, rows) {
      return h('div', { style: { marginBottom: 12 } },
        h('label', {
          htmlFor: 'mun_pp_' + field,
          style: { display: 'block', fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }
        }, label),
        h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 6, fontStyle: 'italic' } }, hint),
        h('textarea', {
          id: 'mun_pp_' + field,
          value: value || '',
          onChange: function(e) { patchField(field, e.target.value); },
          rows: rows || 4,
          style: { width: '100%', padding: 10, fontSize: 13, lineHeight: 1.5, background: 'rgba(0,0,0,0.25)', color: '#f1f5f9', border: '1px solid #475569', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit' },
          maxLength: 1500
        }),
        h('div', { style: { fontSize: 10, color: '#64748b', textAlign: 'right' } }, (value || '').length + ' / 1500')
      );
    }

    return h('div', { style: { padding: 18, color: '#e2e8f0', maxWidth: 920, margin: '0 auto', position: 'relative' } },
      helpOpen && h(HelpPanel, { phaseKey: 'briefing', onClose: function() { setHelpOpen(false); } }),

      h('div', { style: { marginBottom: 16, padding: 14, background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 100%)', borderRadius: 12, position: 'relative' } },
        h('button', {
          onClick: function() { setHelpOpen(true); },
          'aria-label': 'Open vocabulary help panel',
          style: { position: 'absolute', top: 10, right: 10, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }
        }, '? Help'),
        h('div', { style: { fontSize: 11, color: '#ddd6fe', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, 'Position Paper Phase'),
        h('h2', { style: { fontSize: 20, fontWeight: 800, marginTop: 4 } }, '📝 Draft your delegation\'s position paper'),
        h('p', { style: { fontSize: 12, color: '#ddd6fe', marginTop: 6 } },
          'In real Model UN, every delegate writes a position paper before debate. Today you do the same: research, take a stance, propose solutions. Your paper becomes the grounding for your AI speech starter.'
        )
      ),

      // My-country reminder card
      myCountry && h('div', { style: { padding: 12, background: 'rgba(16,185,129,0.10)', border: '2px solid #10b981', borderRadius: 12, marginBottom: 16 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12 } },
          h('span', { style: { fontSize: 36 } }, myCountry.flag),
          h('div', null,
            h('div', { style: { fontWeight: 800, fontSize: 16 } }, myCountry.name + ' on ' + (agenda ? agenda.title : '')),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } },
              'Reminder stance: ' + ((myCountry.defaultPositions && agenda && myCountry.defaultPositions[agenda.id]) || 'develop your own.')
            )
          )
        )
      ),

      // AI starter row
      myCountry && agenda && h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 } },
        h('button', {
          onClick: aiDraft,
          disabled: status.drafting,
          'aria-busy': status.drafting,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: status.drafting ? '#475569' : '#a855f7', color: '#fff', border: 'none', borderRadius: 8, cursor: status.drafting ? 'wait' : 'pointer' }
        }, status.drafting ? '⏳ Drafting…' : '🤖 AI starter draft'),
        h('button', {
          onClick: aiCritique,
          disabled: status.critiquing || !form.stance,
          'aria-busy': status.critiquing,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: status.critiquing ? '#475569' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: status.critiquing ? 'wait' : 'pointer' }
        }, status.critiquing ? '⏳ Reviewing…' : '🔎 AI feedback'),
        h('button', {
          onClick: exportPrint,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }
        }, '🖨️ Print / PDF')
      ),

      // Form fields
      myCountry && h('div', { style: { padding: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid #334155', borderRadius: 12, marginBottom: 14 } },
        fieldBox(
          '1 · Country Background',
          'What history, geography, or economic factors shape your country\'s view on this agenda?',
          form.background, 'background', 4
        ),
        fieldBox(
          '2 · Position / Stance',
          'In 2–3 sentences, what does your country want this committee to do — and what does it oppose?',
          form.stance, 'stance', 4
        ),
        fieldBox(
          '3 · Proposed Solutions',
          'List 2–3 specific actions you will push for in resolution clauses (funding, treaty, technology transfer, oversight body, etc.).',
          form.solutions, 'solutions', 5
        ),
        fieldBox(
          '4 · Likely Allies',
          'Which delegations are most likely to co-sponsor your clauses? Why?',
          form.allies, 'allies', 3
        ),
        h('div', { style: { display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' } },
          h('button', {
            onClick: savePaper,
            disabled: status.saving || !form.stance,
            style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: status.saving ? '#475569' : '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: status.saving ? 'wait' : 'pointer' }
          }, status.saving ? '⏳ Saving…' : (papers[myUid] && papers[myUid].savedAt ? '✓ Update paper' : '💾 Submit paper'))
        )
      ),

      // AI critique card
      status.critique && h('div', { style: { padding: 14, background: 'rgba(14,165,233,0.10)', border: '1px solid #0ea5e9', borderRadius: 12, marginBottom: 14 } },
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 } }, '🔎 AI feedback on your paper'),
        Array.isArray(status.critique.strengths) && status.critique.strengths.length > 0 && h('div', { style: { marginBottom: 8 } },
          h('div', { style: { fontSize: 12, color: '#10b981', fontWeight: 700, marginBottom: 4 } }, 'Strengths'),
          h('ul', { style: { fontSize: 12, color: '#cbd5e1', paddingLeft: 18, margin: 0, lineHeight: 1.6 } },
            status.critique.strengths.map(function(s, i) { return h('li', { key: i }, s); })
          )
        ),
        Array.isArray(status.critique.weaknesses) && status.critique.weaknesses.length > 0 && h('div', { style: { marginBottom: 8 } },
          h('div', { style: { fontSize: 12, color: '#fbbf24', fontWeight: 700, marginBottom: 4 } }, 'Sharpen these'),
          h('ul', { style: { fontSize: 12, color: '#fef3c7', paddingLeft: 18, margin: 0, lineHeight: 1.6 } },
            status.critique.weaknesses.map(function(s, i) { return h('li', { key: i }, s); })
          )
        ),
        Array.isArray(status.critique.followUpQuestions) && status.critique.followUpQuestions.length > 0 && h('div', null,
          h('div', { style: { fontSize: 12, color: '#a855f7', fontWeight: 700, marginBottom: 4 } }, 'Questions a rival delegate might ask'),
          h('ul', { style: { fontSize: 12, color: '#ddd6fe', paddingLeft: 18, margin: 0, lineHeight: 1.6, fontStyle: 'italic' } },
            status.critique.followUpQuestions.map(function(s, i) { return h('li', { key: i }, s); })
          )
        )
      ),

      // Host roster of submissions
      isHost && h('div', { style: { padding: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid #334155', borderRadius: 12, marginBottom: 14 } },
        h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 } },
          'Submission Tracker (' + submittedCount + ' / ' + humanUids.length + ' human delegates)'
        ),
        humanUids.length === 0 && h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: 0 } }, 'No human delegates assigned (AI delegates skip the paper phase).'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6 } },
          humanUids.map(function(uid) {
            var iso = assigned[uid];
            var country = countryById(iso);
            if (!country) return null;
            var paper = papers[uid];
            var submitted = !!(paper && paper.savedAt);
            var roster = (sessionState && sessionState.roster) || {};
            var name = roster[uid] ? roster[uid].name : (isSolo && uid === 'me' ? (ctx.studentNickname || 'You') : uid);
            return h('div', {
              key: uid,
              style: { padding: 8, background: 'rgba(0,0,0,0.18)', borderRadius: 6, borderLeft: '3px solid ' + (submitted ? '#10b981' : '#fbbf24'), fontSize: 11 }
            },
              h('div', null, country.flag + ' ', h('strong', null, country.name)),
              h('div', { style: { fontSize: 10, color: submitted ? '#10b981' : '#fbbf24', marginTop: 2 } },
                (submitted ? '✓ Submitted' : '… Drafting') + ' · ' + name
              )
            );
          })
        )
      ),

      // Phase nav
      h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 } },
        isHost && h('button', {
          onClick: function() { updateMUN({ phase: PHASES.BRIEFING }); },
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }
        }, '← Back to Briefing'),
        isHost && h('button', {
          onClick: function() { updateMUN({ phase: PHASES.OPENING_SPEECHES, currentSpeakerUid: null, speechCount: 0 }); },
          style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Begin Opening Speeches →'),
        !isHost && h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', flex: 1, marginTop: 8 } },
          (papers[myUid] && papers[myUid].savedAt ? 'Paper saved. ' : '') + 'Chair will start opening speeches when ready.'
        )
      )
    );
  }

  // Tiny HTML-escape for the print-window export
  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Draft a starter position paper for the student to EDIT.
  // Not a final paper — a scaffold. Students should rewrite in their own voice.
  // Returns { background, stance, solutions, allies } or null.
  // ═══════════════════════════════════════════
  function aiDraftPositionPaper(ctx, country, agenda, committee) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda) {
      return Promise.resolve(null);
    }
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var prompt = [
      'You are an AI research assistant helping a student delegate draft a starter position paper.',
      'The student plays ' + country.name + ' in the ' + (committee ? committee.name : 'committee') + ' on agenda "' + agenda.title + '".',
      '',
      'Country profile:',
      '- Government: ' + country.gov,
      '- Region: ' + country.region,
      '- Alliances: ' + (country.alliances || []).join(', '),
      '- Current events anchor: ' + country.currentEvents,
      '- Default stance on this agenda: ' + stance,
      '',
      'Agenda background: ' + (agenda.background || ''),
      '',
      'Write a SHORT DRAFT (the student will edit and personalize). Return JSON in this exact shape:',
      '{',
      '  "background": "2-3 sentences on what historical/economic/geographic context shapes this country\'s view",',
      '  "stance": "2-3 sentences: what we want this committee to do, and what we oppose",',
      '  "solutions": "2-3 numbered or bulleted concrete proposals (treaty mechanism, funding figure, oversight body, etc.)",',
      '  "allies": "1-2 sentences naming 2-4 likely co-sponsor delegations and why"',
      '}',
      '',
      'Each field MAX 400 chars. Plain text only inside JSON values. No markdown formatting inside the strings.',
      'Return JSON only — no code fences, no commentary.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var sliced = raw.substring(s, e + 1);
      var parsed; try { parsed = JSON.parse(sliced); } catch (err) { return null; }
      if (!parsed || typeof parsed.stance !== 'string') return null;
      return {
        background: String(parsed.background || '').slice(0, 1500),
        stance:     String(parsed.stance || '').slice(0, 1500),
        solutions:  String(parsed.solutions || '').slice(0, 1500),
        allies:     String(parsed.allies || '').slice(0, 1500)
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Critique a position paper the student wrote.
  // Returns { strengths: [], weaknesses: [], followUpQuestions: [] } or null.
  // ═══════════════════════════════════════════
  function aiCritiquePositionPaper(ctx, country, agenda, paper) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda || !paper) {
      return Promise.resolve(null);
    }
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var prompt = [
      'You are a Model UN advisor reviewing a student\'s position paper for ' + country.name + ' on "' + agenda.title + '".',
      '',
      'The country\'s default stance on this agenda is: ' + stance,
      '',
      'The student wrote:',
      '- Background: ' + (paper.background || '(blank)'),
      '- Stance: ' + (paper.stance || '(blank)'),
      '- Solutions: ' + (paper.solutions || '(blank)'),
      '- Allies: ' + (paper.allies || '(blank)'),
      '',
      'Give honest, encouraging feedback. Return JSON:',
      '{',
      '  "strengths": ["1-3 specific things the paper does well"],',
      '  "weaknesses": ["1-3 specific things to sharpen — be CONCRETE, not vague"],',
      '  "followUpQuestions": ["2-3 questions a rival delegate might ask during caucus to challenge this paper"]',
      '}',
      '',
      'Each bullet MAX 160 chars. Plain text. Diplomatic but honest tone.',
      'Return JSON only.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var sliced = raw.substring(s, e + 1);
      var parsed; try { parsed = JSON.parse(sliced); } catch (err) { return null; }
      if (!parsed || typeof parsed !== 'object') return null;
      return {
        strengths:         Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).map(function(x) { return String(x).slice(0, 200); }) : [],
        weaknesses:        Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 5).map(function(x) { return String(x).slice(0, 200); }) : [],
        followUpQuestions: Array.isArray(parsed.followUpQuestions) ? parsed.followUpQuestions.slice(0, 5).map(function(x) { return String(x).slice(0, 200); }) : []
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Generate a delegate speech in-character.
  // Uses jsonMode=true with the proven Sage/SpaceExplorer parsing pattern:
  // strip code fences, extract by outer braces, validate shape, silent fallback.
  // ═══════════════════════════════════════════
  function aiGenerateDelegateSpeech(ctx, country, agenda, committee, recentSpeeches, caucusTopic, userPaper) {
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
    var isCaucus = !!caucusTopic;
    var paperBlock = '';
    if (userPaper && (userPaper.stance || userPaper.solutions || userPaper.background)) {
      // The student wrote a position paper — make the AI starter speak from
      // THEIR analysis, not the generic country line. This is the whole point
      // of the position-paper phase.
      paperBlock = [
        'CRITICAL — this delegate authored the following position paper. The speech MUST reflect these specific arguments and proposals:',
        userPaper.background ? '- Background framing: ' + String(userPaper.background).slice(0, 500) : '',
        userPaper.stance ? '- Position: ' + String(userPaper.stance).slice(0, 500) : '',
        userPaper.solutions ? '- Proposed solutions: ' + String(userPaper.solutions).slice(0, 500) : '',
        userPaper.allies ? '- Coalition allies named: ' + String(userPaper.allies).slice(0, 300) : '',
        ''
      ].filter(Boolean).join('\n');
    }
    var prompt = [
      'You are the delegate from ' + country.name + ' speaking on "' + agenda.title + '" in the ' + (committee ? committee.name : 'committee') + '.',
      isCaucus ? ('Current MODERATED CAUCUS sub-topic: "' + caucusTopic + '"') : '',
      '',
      'Your country profile:',
      '- Government: ' + country.gov,
      '- Region: ' + country.region,
      '- Alliances: ' + (country.alliances || []).join(', '),
      '- Current events: ' + country.currentEvents,
      '',
      'Your country\'s default stance on this agenda: ' + stance,
      '',
      paperBlock,
      recentSpeeches && recentSpeeches.length > 0 ? 'Recent speeches in the chamber:\n' + historyText + '\n' : '',
      isCaucus
        ? 'Give a FOCUSED MODERATED CAUCUS speech in diplomatic Model UN style. Address ONLY the caucus sub-topic. 50-80 words total. One concrete point, one specific proposal. Speak in first person plural.'
        : 'Give a 2-3 paragraph OPENING SPEECH in diplomatic Model UN style. Include:\n  1. One specific argument grounded in your country\'s national interest\n  2. One acknowledgment of an opposing view (diplomatic concession)\n  3. One concrete proposal or call to action\n\nSpeak in first person plural ("We", "Our delegation", "The delegate of ' + country.name + '"). 120-180 words total.',
      '',
      'Return ONLY a JSON object in this exact shape:',
      '{',
      '  "text": "the full speech body",',
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
  // AI HELPER — Review a student-drafted clause for MUN format compliance,
  // strength, and risks. Returns { verdict, formatIssues, strengthen, risks }
  // or null. Used by ClauseReviewPanel before the student submits the clause.
  // ═══════════════════════════════════════════
  function aiReviewClause(ctx, payload) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !payload || !payload.draft || !payload.agenda || !payload.country) {
      return Promise.resolve(null);
    }
    var draft = String(payload.draft).slice(0, 1200);
    var type = payload.type === 'preamble' ? 'preamble' : 'operative';
    var country = payload.country;
    var agenda = payload.agenda;
    var existing = payload.existingClauses || [];
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var existingBlock = existing.length > 0
      ? 'Other clauses already on the floor:\n' + existing.slice(0, 6).map(function(c, i) { return (i + 1) + '. [' + (c.type || 'op') + '] ' + (c.text || '').slice(0, 180); }).join('\n') + '\n'
      : '';

    var prompt = [
      'You are reviewing a Model UN resolution clause drafted by a student delegate from ' + country.name + ' on agenda "' + agenda.title + '".',
      '',
      'Country baseline stance: ' + stance,
      'Clause type: ' + type.toUpperCase(),
      '',
      'STUDENT\'S DRAFT:',
      '"' + draft + '"',
      '',
      existingBlock,
      'Evaluate the draft. Be honest and specific. Identify:',
      '  - MUN format issues (preamble must start with -ing/-ed participle; operative must start with a numbered action verb and end with a semicolon)',
      '  - 1-2 ways to STRENGTHEN it (concrete edit, not vague advice)',
      '  - 1-2 RISKS (which delegations might oppose this, how it might be amended hostilely)',
      '',
      'Return JSON only:',
      '{',
      '  "verdict": "strong" | "workable" | "weak",',
      '  "verdictReason": "<one short sentence>",',
      '  "formatIssues": ["<concrete issue 1>", "..."]  // empty array if none',
      '  "strengthen": ["<specific edit 1>", "..."],',
      '  "risks": ["<who might oppose + why, 1 sentence>", "..."]',
      '}',
      '',
      'Each item MAX 180 chars. Plain text. Diplomatic but honest tone.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed) return null;
      var verdict = String(parsed.verdict || '').toLowerCase();
      if (verdict !== 'strong' && verdict !== 'workable' && verdict !== 'weak') verdict = 'workable';
      var arr = function(x) { return Array.isArray(x) ? x.slice(0, 5).map(function(v) { return String(v).slice(0, 250); }) : []; };
      return {
        verdict: verdict,
        verdictReason: String(parsed.verdictReason || '').slice(0, 300),
        formatIssues: arr(parsed.formatIssues),
        strengthen:   arr(parsed.strengthen),
        risks:        arr(parsed.risks)
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Score a single student's MUN performance on 5 rubric domains.
  // For each domain returns a 1-4 score (1=Beginning, 2=Developing, 3=Proficient,
  // 4=Advanced) plus a one-sentence rationale. Teacher can override scores.
  // Used by TeacherRubricPanel in the Debrief.
  // ═══════════════════════════════════════════
  function aiGradeStudentRubric(ctx, payload) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !payload || !payload.country || !payload.agenda) {
      return Promise.resolve(null);
    }
    var country = payload.country;
    var agenda = payload.agenda;
    var paper = payload.paper || null;
    var ownSpeeches = payload.ownSpeeches || [];
    var ownClauses = payload.ownClauses || [];
    var crisisResp = payload.crisisResponse || null;
    var vote = payload.vote || null;
    var passed = !!payload.passed;
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';

    var paperBlock = paper && paper.stance
      ? 'Position paper submitted:\n- Background: ' + String(paper.background || '').slice(0, 300) + '\n- Stance: ' + String(paper.stance).slice(0, 300) + '\n- Solutions: ' + String(paper.solutions || '').slice(0, 300) + '\n- Allies: ' + String(paper.allies || '').slice(0, 200) + '\n'
      : 'NO position paper submitted.\n';
    var speechBlock = ownSpeeches.length > 0
      ? 'Speeches delivered (' + ownSpeeches.length + '):\n' + ownSpeeches.slice(0, 5).map(function(s, i) { return '(' + (i + 1) + ') ' + (s.text || '').slice(0, 280); }).join('\n\n') + '\n'
      : 'NO speeches delivered.\n';
    var clauseBlock = ownClauses.length > 0
      ? 'Clauses proposed (' + ownClauses.length + '):\n' + ownClauses.slice(0, 4).map(function(c, i) { return '(' + (i + 1) + ') [' + (c.type || 'op') + '] ' + (c.text || '').slice(0, 220); }).join('\n') + '\n'
      : 'NO clauses proposed.\n';
    var crisisBlock = crisisResp ? 'Crisis response: ' + String(crisisResp).slice(0, 280) + '\n' : 'Did not respond to crisis (if one occurred).\n';
    var voteBlock = vote ? 'Final vote cast: ' + vote + ' on a resolution that ' + (passed ? 'PASSED' : 'FAILED') + '.' : 'Did not cast a final vote.';

    var prompt = [
      'You are grading a Model UN student delegate from ' + country.name + ' on agenda "' + agenda.title + '".',
      '',
      'Country baseline stance: ' + stance,
      '',
      paperBlock,
      speechBlock,
      clauseBlock,
      crisisBlock,
      voteBlock,
      '',
      'Score each domain on a 1-4 scale: 1=Beginning, 2=Developing, 3=Proficient, 4=Advanced.',
      'Be fair but honest. Use the actual evidence above. Cite specifics in rationales.',
      '',
      'Domains:',
      '  - preparation: Quality of position paper (background, stance, solutions, allies). 1 if missing.',
      '  - speechQuality: Diplomatic register, structure, persuasiveness across speeches. 1 if no speeches.',
      '  - diplomaticConsistency: Did the delegate stay true to their country\'s actual policy line?',
      '  - coalitionBuilding: Evidence of seeking allies, naming partner delegations, working with blocs.',
      '  - resolutionContribution: Quality + impact of clauses proposed + final vote alignment.',
      '',
      'Return JSON only:',
      '{',
      '  "preparation":           { "score": 1-4, "rationale": "<one short sentence with evidence>" },',
      '  "speechQuality":         { "score": 1-4, "rationale": "..." },',
      '  "diplomaticConsistency": { "score": 1-4, "rationale": "..." },',
      '  "coalitionBuilding":     { "score": 1-4, "rationale": "..." },',
      '  "resolutionContribution":{ "score": 1-4, "rationale": "..." },',
      '  "overall":               { "score": 1-4, "rationale": "<one sentence summary>" }',
      '}',
      '',
      'Each rationale MAX 220 chars.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed) return null;
      var pick = function(key) {
        var d = parsed[key];
        if (!d || typeof d !== 'object') return { score: 0, rationale: '' };
        var sc = parseInt(d.score, 10);
        if (isNaN(sc) || sc < 1) sc = 1;
        if (sc > 4) sc = 4;
        return { score: sc, rationale: String(d.rationale || '').slice(0, 300) };
      };
      return {
        preparation:            pick('preparation'),
        speechQuality:          pick('speechQuality'),
        diplomaticConsistency:  pick('diplomaticConsistency'),
        coalitionBuilding:      pick('coalitionBuilding'),
        resolutionContribution: pick('resolutionContribution'),
        overall:                pick('overall')
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
  // AI HELPER — Suggest 3 hot caucus sub-topics based on the debate so far.
  // Returns [{ topic, rationale }, ...] (3 items) or null.
  // Used by the CaucusMotionModal to give the host meaningful options instead
  // of a blank text prompt.
  // ═══════════════════════════════════════════
  function aiSuggestCaucusTopics(ctx, agenda, recentSpeeches, news) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !agenda) return Promise.resolve(null);
    var historyText = (recentSpeeches || []).slice(-8).map(function(s) {
      return '- ' + (s.country || '') + ': ' + (s.text || '').slice(0, 200);
    }).join('\n');
    var newsBlock = news && news.headline ? 'Recent breaking news: ' + news.headline + ' — ' + (news.body || '').slice(0, 240) : '';
    var prompt = [
      'You are a Model UN chair planning the next moderated caucus on agenda "' + agenda.title + '".',
      '',
      'Agenda background: ' + (agenda.background || ''),
      '',
      historyText ? 'Recent speeches in the chamber:\n' + historyText + '\n' : '',
      newsBlock,
      '',
      'Suggest 3 SPECIFIC, CONTESTED sub-topics that would force delegations to take a clear position. Avoid vague framings.',
      'Examples of good: "Climate finance: $100B/yr loss-and-damage fund eligibility", "AI red lines: pre-deployment audit requirements"',
      'Examples of bad: "Climate change", "AI ethics" (too broad)',
      '',
      'Return JSON only:',
      '{ "suggestions": [',
      '  { "topic": "<specific contested sub-topic, 80 chars max>", "rationale": "<one sentence on why this is the right next moderated caucus>" },',
      '  ... 3 items total',
      '] }'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || !Array.isArray(parsed.suggestions)) return null;
      return parsed.suggestions.slice(0, 3).map(function(it) {
        return {
          topic: String((it && it.topic) || '').slice(0, 200),
          rationale: String((it && it.rationale) || '').slice(0, 300)
        };
      }).filter(function(it) { return it.topic.length > 3; });
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — In-context coach advice for a stuck/curious student.
  // Phase-aware: knows where the student is, what they've done, what's next.
  // Returns { advice: "...", nextSteps: [...] } or null.
  // ═══════════════════════════════════════════
  function aiCoachAdvice(ctx, payload) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !payload || !payload.country || !payload.agenda) {
      return Promise.resolve(null);
    }
    var country = payload.country;
    var agenda = payload.agenda;
    var phase = payload.phase || 'unknown';
    var paper = payload.paper || null;
    var ownSpeeches = payload.ownSpeeches || [];
    var recentChamber = payload.recentChamber || [];
    var clauses = payload.clauses || [];
    var consistency = payload.consistency || null;
    var blocs = payload.blocs || [];
    var question = payload.question || null;

    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';

    // Phase-specific anchor
    var phaseHint = {
      'briefing':         'They are reading the agenda briefing and country profile before any speeches.',
      'position_paper':   'They are drafting their pre-debate position paper.',
      'opening_speeches': 'They are in the opening-speeches round — each delegate gives a 120-180 word position speech.',
      'mod_caucus':       'They are in a moderated caucus on a specific sub-topic — speeches are 50-80 words and focused.',
      'draft':            'They are drafting resolution clauses with the committee.',
      'vote':             'They are about to vote on the final resolution.',
      'debrief':          'The debate is over; they are reviewing their performance.'
    }[phase] || 'They are in an unknown phase.';

    var paperBlock = paper && paper.stance ? 'Their position paper stance: ' + String(paper.stance).slice(0, 400) + '\n' : '';
    var speechBlock = ownSpeeches.length > 0
      ? 'Their recent speeches:\n' + ownSpeeches.slice(-2).map(function(s, i) { return '(' + (i + 1) + ') ' + (s.text || '').slice(0, 200); }).join('\n') + '\n'
      : 'They have not yet spoken.';
    var chamberBlock = recentChamber.length > 0
      ? 'Recent chamber speeches:\n' + recentChamber.slice(-3).map(function(s) { return '- ' + s.country + ': ' + (s.text || '').slice(0, 120); }).join('\n') + '\n'
      : '';
    var blocBlock = blocs.length > 0 ? 'Their blocs: ' + blocs.map(function(b) { return b.name; }).join(', ') + '\n' : '';
    var consBlock = consistency && typeof consistency.score === 'number'
      ? 'Their diplomatic consistency score: ' + consistency.score + '/100' + (consistency.summary ? ' (' + consistency.summary + ')' : '') + '\n'
      : '';
    var qBlock = question ? 'They specifically asked: "' + String(question).slice(0, 200) + '"\n' : '';

    var prompt = [
      'You are a kind, plain-spoken Model UN coach for a middle-school or high-school student delegate.',
      'Be concrete and specific. Use short sentences. Acknowledge difficulty, then give 1 next-step they can do RIGHT NOW.',
      '',
      'Student is the delegate from ' + country.name + ' on agenda "' + agenda.title + '".',
      'Country\'s baseline stance: ' + stance,
      blocBlock + paperBlock + consBlock,
      phaseHint,
      '',
      speechBlock,
      chamberBlock,
      qBlock,
      'Return JSON only:',
      '{',
      '  "advice": "<3-4 sentence coaching note. Friendly, encouraging, specific to THIS student\'s situation.>",',
      '  "nextSteps": ["<concrete action 1>", "<concrete action 2>", "<concrete action 3>"]',
      '}',
      '',
      'Each next-step MAX 100 chars. No generic platitudes — refer to actual countries/clauses/topics from the context.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.advice !== 'string') return null;
      return {
        advice:    parsed.advice.slice(0, 800),
        nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps.slice(0, 5).map(function(x) { return String(x).slice(0, 200); }) : []
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Predict the vote tally on the current resolution.
  // Reads the seated countries' stances, adopted clauses, and recent speeches,
  // then estimates per-country votes. Returns { tally: { Y, N, A }, predictions: [{ iso, vote, reasoning }], summary } or null.
  // Used by the VoteWhipPanel BEFORE the actual vote — students see the gap and can lobby.
  // ═══════════════════════════════════════════
  function aiPredictVoteTally(ctx, payload) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !payload || !payload.committee || !payload.agenda) {
      return Promise.resolve(null);
    }
    var committee = payload.committee;
    var agenda = payload.agenda;
    var assigned = payload.assigned || {};
    var clauses = payload.clauses || [];
    var recentSpeeches = payload.recentSpeeches || [];

    var seatedIsos = Object.keys(assigned).map(function(uid) { return assigned[uid]; });
    var seatedSummaries = seatedIsos.map(function(iso) {
      var c = countryById(iso);
      if (!c) return null;
      var stance = (c.defaultPositions && c.defaultPositions[agenda.id]) || 'standard';
      return '- ' + iso + ' (' + c.name + ', alliances: ' + (c.alliances || []).join(',') + '): ' + stance.slice(0, 220);
    }).filter(Boolean).join('\n');

    var clauseBlock = clauses.length > 0
      ? 'Adopted resolution clauses:\n' + clauses.slice(0, 12).map(function(cl, i) { return '(' + (i + 1) + ') [' + (cl.type || 'op') + '] ' + (cl.text || '').slice(0, 220); }).join('\n') + '\n'
      : 'No clauses adopted yet (vote is on the current draft).\n';
    var speechBlock = recentSpeeches.length > 0
      ? 'Recent speeches:\n' + recentSpeeches.slice(-8).map(function(s) { return '- ' + s.country + ': ' + (s.text || '').slice(0, 120); }).join('\n')
      : '';

    var prompt = [
      'You are a Model UN whip estimating how the committee is likely to vote on the current resolution draft.',
      '',
      'Committee: ' + committee.name,
      'Agenda: ' + agenda.title,
      '',
      'Seated delegations and their baseline stances:',
      seatedSummaries,
      '',
      clauseBlock,
      speechBlock,
      '',
      'For EACH seated delegation, predict Y / N / A based on whether the adopted clauses align with their stance.',
      'Lean Y for countries whose stance matches the clauses. Lean N for countries whose stance conflicts. Use A only when genuinely ambivalent.',
      '',
      'Return JSON only:',
      '{',
      '  "predictions": [',
      '    { "iso": "USA", "vote": "Y" | "N" | "A", "reasoning": "<one short sentence>" }',
      '  ],',
      '  "summary": "<one sentence: who needs lobbying to flip this>"',
      '}',
      '',
      'Cover EVERY seated delegation. Reasoning MAX 120 chars each.'
    ].join('\n');

    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || !Array.isArray(parsed.predictions)) return null;
      var preds = parsed.predictions.slice(0, 30).map(function(p) {
        var v = String((p && p.vote) || '').toUpperCase().charAt(0);
        if (v !== 'Y' && v !== 'N' && v !== 'A') v = 'A';
        return {
          iso: String((p && p.iso) || '').slice(0, 8).toUpperCase(),
          vote: v,
          reasoning: String((p && p.reasoning) || '').slice(0, 200)
        };
      }).filter(function(p) { return p.iso.length === 3; });
      var tally = { Y: 0, N: 0, A: 0 };
      preds.forEach(function(p) { tally[p.vote]++; });
      return {
        predictions: preds,
        tally: tally,
        summary: String(parsed.summary || '').slice(0, 300)
      };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Generate a delegate's CRISIS RESPONSE in 25-50 words.
  // Short, urgent, reactive. Returns { text } or null.
  // ═══════════════════════════════════════════
  function aiGenerateCrisisResponse(ctx, country, agenda, news) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda || !news) {
      return Promise.resolve(null);
    }
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var prompt = [
      'BREAKING — a news event just landed during a Model UN debate. As the delegate from ' + country.name + ', deliver a CRISIS RESPONSE.',
      '',
      'News:',
      '- Headline: ' + (news.headline || ''),
      '- Body: ' + (news.body || ''),
      '',
      'Agenda: ' + agenda.title,
      'Your country profile: ' + country.gov + ', region ' + country.region + ', alliances ' + (country.alliances || []).join(', '),
      'Your country\'s stance on this agenda: ' + stance,
      '',
      'Write a 25-50 word REACTIVE statement. Diplomatic but urgent. First person plural ("Our delegation…", "We call upon…"). One concrete proposal or position.',
      '',
      'Return JSON only: { "text": "the statement" }'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.text !== 'string' || parsed.text.length < 10) return null;
      return { text: parsed.text.slice(0, 400) };
    }).catch(function() { return null; });
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Score one delegate's recent speeches for DIPLOMATIC CONSISTENCY.
  // Returns { score: 0-100, summary, drift?: ['point'] } or null.
  // Used by ConsistencyBadge; fire-and-forget — UI degrades gracefully on null.
  // ═══════════════════════════════════════════
  function aiScoreConsistency(ctx, country, agenda, paper, recentOwnSpeeches) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda) {
      return Promise.resolve(null);
    }
    if (!recentOwnSpeeches || recentOwnSpeeches.length === 0) return Promise.resolve(null);
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var speechBlock = recentOwnSpeeches.slice(-3).map(function(s, i) {
      return '(' + (i + 1) + ') ' + (s.text || '').slice(0, 400);
    }).join('\n\n');
    var paperBlock = '';
    if (paper && paper.stance) {
      paperBlock = 'The delegate\'s position paper stance is: ' + String(paper.stance).slice(0, 400) + '\n';
    }
    var prompt = [
      'You are a Model UN judge scoring DIPLOMATIC CONSISTENCY for the delegate from ' + country.name + ' on agenda "' + agenda.title + '".',
      '',
      'Country\'s baseline stance: ' + stance,
      paperBlock,
      'The delegate\'s last speeches:',
      speechBlock,
      '',
      'Score 0-100 how consistent the speeches are with the country\'s baseline stance AND with each other.',
      '- 90-100: rock-solid, on-message, internally consistent.',
      '- 70-89: mostly aligned, minor drift.',
      '- 50-69: noticeable drift or off-message claims.',
      '- 0-49: contradicts country position outright or self-contradicts.',
      '',
      'Return JSON only:',
      '{ "score": <integer 0-100>, "summary": "<one short sentence>", "drift": ["<1-2 specific drift points if any>"] }'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.score !== 'number') return null;
      var score = Math.max(0, Math.min(100, Math.round(parsed.score)));
      return {
        score: score,
        summary: String(parsed.summary || '').slice(0, 300),
        drift: Array.isArray(parsed.drift) ? parsed.drift.slice(0, 4).map(function(x) { return String(x).slice(0, 200); }) : []
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
      totalClauses: 0,
      crisisResponsesGiven: 0,
      bestConsistencyScore: 0,
      backchannelMessagesSent: 0
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

    // Caucus motion modal toggle (v0.11: replaces native prompt() flow)
    var caucusModalTuple = useState(false);
    var caucusModalOpen = caucusModalTuple[0];
    var setCaucusModalOpen = caucusModalTuple[1];

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

    // Help panel state
    var helpTuple = useState(false);
    var helpOpen = helpTuple[0];
    var setHelpOpen = helpTuple[1];

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      helpOpen && h(HelpPanel, { phaseKey: 'speeches', onClose: function() { setHelpOpen(false); } }),
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
        h('button', {
          onClick: function() { setHelpOpen(true); },
          'aria-label': 'Open vocabulary help panel',
          style: { padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }
        }, '? Help'),
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
        }, 'Skip to Drafting →'),
        isHost && h('button', {
          onClick: function() { setCaucusModalOpen(true); },
          style: { padding: '6px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(251,191,36,0.18)', color: '#fbbf24', border: '1px solid #fbbf24', borderRadius: 6, cursor: 'pointer' }
        }, '⚖️ Motion for Caucus')
      ),

      // Caucus motion modal (host only, replaces native prompt flow)
      caucusModalOpen && h(CaucusMotionModal, {
        ctx: ctx, agenda: agenda, recentSpeeches: orderedSpeeches, news: modelUn.news,
        onClose: function() { setCaucusModalOpen(false); },
        onSubmit: function(motion) {
          setCaucusModalOpen(false);
          updateMUN({
            phase: PHASES.MOD_CAUCUS,
            caucusTopic: motion.topic,
            caucusStartedAt: new Date().toISOString(),
            caucusDurationMin: motion.durationMin,
            caucusSpeeches: {}
          });
        }
      }),

      // ── News Desk banner (active when modelUn.news is set) ──
      h(NewsDeskBanner, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost, isSolo: isSolo,
        agenda: agenda, committee: committee, recentSpeeches: orderedSpeeches
      }),

      // ── Diplomatic Consistency badge (student-facing) ──
      myCountry && h('div', { style: { marginBottom: 12 } },
        h(ConsistencyBadge, {
          ctx: ctx,
          country: myCountry,
          agenda: agenda,
          paper: (modelUn.positionPapers || {})[myUid] || null,
          ownSpeeches: orderedSpeeches.filter(function(s) { return s.country === myIso; })
        })
      ),

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
          userPaper: (modelUn.positionPapers || {})[myUid] || null,
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
                  return h(SpeechCard, { key: sp.id, ctx: ctx, speech: sp, myCountry: myCountry });
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
    var caucusTopic = props.caucusTopic || null;
    var shortForm = !!props.shortForm;
    var userPaper = props.userPaper || null;
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
      aiGenerateDelegateSpeech(ctx, country, agenda, committee, recentSpeeches, caucusTopic, userPaper).then(function(r) {
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
      var minLen = shortForm ? 15 : 30;
      if (t.length < minLen) { ctx.addToast(shortForm ? 'Caucus speech is too short' : 'Speech is too short — aim for 100+ words'); return; }
      onSubmit(t);
      setText('');
    }

    var wordCount = (text || '').trim().split(/\s+/).filter(function(w) { return w.length; }).length;
    var targetLow = shortForm ? 30 : 100;
    var targetHigh = shortForm ? 100 : 200;
    var wcColor = (wordCount >= targetLow && wordCount <= targetHigh) ? '#10b981' : wordCount > 0 ? '#fbbf24' : '#94a3b8';

    return h('div', { style: { background: 'rgba(0,0,0,0.18)', padding: 10, borderRadius: 8, marginTop: 8 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
        h('span', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } },
          shortForm
            ? ('You have the floor — focused caucus speech (50-80 words on "' + (caucusTopic || 'sub-topic') + '")')
            : 'You have the floor — compose your opening speech (120-180 words)'
        ),
        h('button', {
          onClick: getStarter,
          disabled: loading,
          title: userPaper && userPaper.stance ? 'AI starter will use your position paper as grounding' : 'AI starter draws from your country profile',
          style: {
            marginLeft: 'auto',
            padding: '4px 10px', fontSize: 11, fontWeight: 600,
            background: loading ? '#475569' : (userPaper && userPaper.stance ? '#16a34a' : '#7c3aed'), color: '#fff',
            border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer'
          }
        }, loading ? '⏳ Generating…' : (userPaper && userPaper.stance ? '✨ AI starter (from your paper)' : '✨ AI starter'))
      ),
      h('textarea', {
        value: text,
        onChange: function(e) { setText(e.target.value); },
        placeholder: shortForm
          ? ('Focused point on "' + (caucusTopic || 'sub-topic') + '" — one specific argument + one proposal')
          : 'Mr./Madam Chair, distinguished delegates… (speak in first person plural; ground your argument in your country\'s national interest)',
        rows: shortForm ? 3 : 6,
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
          wordCount + ' word' + (wordCount !== 1 ? 's' : '') + (wordCount > 0 && (wordCount < targetLow || wordCount > targetHigh) ? (' (target ' + (shortForm ? '50-80' : '120-180') + ')') : '')
        ),
        h('button', {
          onClick: handleSubmit,
          disabled: text.trim().length < (shortForm ? 15 : 30),
          style: {
            marginLeft: 'auto',
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: text.trim().length >= (shortForm ? 15 : 30) ? '#10b981' : '#475569',
            color: '#fff', border: 'none', borderRadius: 8,
            cursor: text.trim().length >= (shortForm ? 15 : 30) ? 'pointer' : 'not-allowed'
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
    // AI clause review state
    var reviewTuple = useState({ loading: false, result: null });
    var review = reviewTuple[0];
    var setReview = reviewTuple[1];

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

    // Help panel state for draft phase
    var helpDraftTuple = useState(false);
    var draftHelpOpen = helpDraftTuple[0];
    var setDraftHelpOpen = helpDraftTuple[1];

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      draftHelpOpen && h(HelpPanel, { phaseKey: 'draft', onClose: function() { setDraftHelpOpen(false); } }),
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
        h('button', {
          onClick: function() { setDraftHelpOpen(true); },
          'aria-label': 'Open vocabulary help panel',
          style: { padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }
        }, '? Help'),
        isHost && h('button', {
          onClick: advanceToVote,
          style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, 'Move to Vote →')
      ),

      // ── News Desk banner ──
      h(NewsDeskBanner, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost, isSolo: isSolo,
        agenda: agenda, committee: committee, recentSpeeches: []
      }),

      // ── Voting Blocs panel ── (coalition map for the chamber)
      h(BlocsPanel, {
        ctx: ctx, modelUn: modelUn, committee: committee, myCountry: myCountry
      }),

      // ── Vote Whip Prediction (AI estimates the upcoming tally) ──
      h(VoteWhipPanel, {
        ctx: ctx, modelUn: modelUn, committee: committee, agenda: agenda
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
            h('div', { style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' } },
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
                onClick: function() {
                  if (!myCountry || !text || text.trim().length < 15) {
                    if (typeof ctx.addToast === 'function') ctx.addToast('Write at least a sentence before requesting AI review.');
                    return;
                  }
                  if (review.loading) return;
                  setReview({ loading: true, result: null });
                  aiReviewClause(ctx, {
                    draft: text,
                    type: clauseType,
                    country: myCountry,
                    agenda: agenda,
                    existingClauses: orderedClauses
                  }).then(function(r) {
                    setReview({ loading: false, result: r });
                    if (!r && typeof ctx.addToast === 'function') ctx.addToast('AI reviewer unavailable — try again.');
                  }).catch(function() { setReview({ loading: false, result: null }); });
                },
                disabled: review.loading || text.trim().length < 15,
                style: {
                  padding: '6px 12px', fontSize: 11, fontWeight: 600,
                  background: review.loading ? '#475569' : (text.trim().length >= 15 ? '#0ea5e9' : '#1e293b'),
                  color: '#fff', border: 'none', borderRadius: 6,
                  cursor: review.loading ? 'wait' : (text.trim().length >= 15 ? 'pointer' : 'not-allowed')
                }
              }, review.loading ? '⏳ Reviewing…' : '🔎 AI review'),
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
            ),
            // AI review result panel
            review.result && (function() {
              var r = review.result;
              var col = r.verdict === 'strong' ? '#10b981' : r.verdict === 'weak' ? '#dc2626' : '#fbbf24';
              return h('div', { style: { marginTop: 10, padding: 10, background: 'rgba(14,165,233,0.10)', border: '1px solid ' + col, borderRadius: 8 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 11, fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🔎 AI review · ' + r.verdict),
                  h('button', {
                    onClick: function() { setReview({ loading: false, result: null }); },
                    style: { marginLeft: 'auto', padding: '2px 6px', fontSize: 10, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 4, cursor: 'pointer' }
                  }, '✕')
                ),
                r.verdictReason && h('p', { style: { fontSize: 11, color: '#e2e8f0', margin: '0 0 6px 0', lineHeight: 1.5, fontStyle: 'italic' } }, '"' + r.verdictReason + '"'),
                r.formatIssues && r.formatIssues.length > 0 && h('div', { style: { marginTop: 6 } },
                  h('div', { style: { fontSize: 10, color: '#dc2626', fontWeight: 700, marginBottom: 2 } }, 'Format issues'),
                  h('ul', { style: { margin: 0, paddingLeft: 16, fontSize: 11, color: '#fecaca', lineHeight: 1.5 } },
                    r.formatIssues.map(function(s, i) { return h('li', { key: i }, s); })
                  )
                ),
                r.strengthen && r.strengthen.length > 0 && h('div', { style: { marginTop: 6 } },
                  h('div', { style: { fontSize: 10, color: '#0ea5e9', fontWeight: 700, marginBottom: 2 } }, 'Strengthen'),
                  h('ul', { style: { margin: 0, paddingLeft: 16, fontSize: 11, color: '#bae6fd', lineHeight: 1.5 } },
                    r.strengthen.map(function(s, i) { return h('li', { key: i }, s); })
                  )
                ),
                r.risks && r.risks.length > 0 && h('div', { style: { marginTop: 6 } },
                  h('div', { style: { fontSize: 10, color: '#f59e0b', fontWeight: 700, marginBottom: 2 } }, 'Risks'),
                  h('ul', { style: { margin: 0, paddingLeft: 16, fontSize: 11, color: '#fef3c7', lineHeight: 1.5 } },
                    r.risks.map(function(s, i) { return h('li', { key: i }, s); })
                  )
                )
              );
            })()
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
  // CaucusMotionModal — host moves the committee into a moderated caucus.
  // Replaces the previous browser-prompt flow. Offers AI-suggested sub-topics
  // (button) and a duration picker; host can pick a suggestion or type a
  // custom topic. Modal returns the chosen topic + duration via onSubmit.
  // ═══════════════════════════════════════════
  function CaucusMotionModal(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var agenda = props.agenda;
    var recentSpeeches = props.recentSpeeches || [];
    var news = props.news || null;
    var onClose = props.onClose;
    var onSubmit = props.onSubmit;

    var topicTuple = useState('');
    var topic = topicTuple[0];
    var setTopic = topicTuple[1];
    var durTuple = useState(8);
    var duration = durTuple[0];
    var setDuration = durTuple[1];
    var suggestTuple = useState(null);
    var suggestions = suggestTuple[0];
    var setSuggestions = suggestTuple[1];
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    function requestSuggestions() {
      if (loading) return;
      setLoading(true);
      aiSuggestCaucusTopics(ctx, agenda, recentSpeeches, news).then(function(r) {
        setLoading(false);
        if (r && r.length > 0) setSuggestions(r);
        else if (typeof ctx.addToast === 'function') ctx.addToast('AI suggestions unavailable — type a topic manually.');
      }).catch(function() { setLoading(false); });
    }

    function submit() {
      var t = (topic || '').trim();
      if (t.length < 3) {
        if (typeof ctx.addToast === 'function') ctx.addToast('Sub-topic required (3+ characters)');
        return;
      }
      var d = parseInt(duration, 10) || 8;
      if (d < 1 || d > 30) d = 8;
      onSubmit({ topic: t.slice(0, 200), durationMin: d });
    }

    return h('div', {
      style: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: 16
      },
      role: 'dialog', 'aria-label': 'Motion for moderated caucus',
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', {
        style: {
          width: 560, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto',
          background: '#0f172a', border: '2px solid #fbbf24', borderRadius: 12,
          padding: 18, color: '#e2e8f0', boxShadow: '0 24px 64px rgba(0,0,0,0.6)'
        }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
          h('span', { style: { fontSize: 28 } }, '⚖️'),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'Motion for'),
            h('div', { style: { fontSize: 18, fontWeight: 800 } }, 'Moderated Caucus')
          ),
          h('button', {
            onClick: onClose,
            'aria-label': 'Close',
            style: { padding: '4px 10px', fontSize: 14, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
          }, '✕')
        ),

        // AI suggestions row
        h('div', { style: { marginBottom: 12 } },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 } },
            h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'AI Suggestions'),
            h('button', {
              onClick: requestSuggestions,
              disabled: loading,
              style: { padding: '4px 10px', fontSize: 11, fontWeight: 700, background: loading ? '#475569' : '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'wait' : 'pointer' }
            }, loading ? '⏳ Thinking…' : suggestions ? '↻ Refresh' : '✨ Suggest topics')
          ),
          !suggestions && !loading && h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
            'Tap "Suggest topics" for 3 AI-generated sub-topics grounded in what your delegates have actually said.'
          ),
          suggestions && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
            suggestions.map(function(s, i) {
              var picked = topic === s.topic;
              return h('button', {
                key: i,
                onClick: function() { setTopic(s.topic); },
                style: {
                  textAlign: 'left', padding: 10, fontSize: 12,
                  background: picked ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.04)',
                  color: '#e2e8f0',
                  border: '1px solid ' + (picked ? '#fbbf24' : '#475569'),
                  borderRadius: 8, cursor: 'pointer'
                }
              },
                h('div', { style: { fontWeight: 700, color: picked ? '#fbbf24' : '#fef3c7', marginBottom: 4 } }, s.topic),
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, s.rationale)
              );
            })
          )
        ),

        // Manual topic input
        h('label', { htmlFor: 'mun_caucus_topic', style: { display: 'block', fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } }, 'Sub-topic'),
        h('textarea', {
          id: 'mun_caucus_topic',
          value: topic,
          onChange: function(e) { setTopic(e.target.value); },
          placeholder: 'e.g., Climate finance: who pays for loss-and-damage in small island states?',
          rows: 3,
          style: { width: '100%', padding: 8, fontSize: 12, lineHeight: 1.5, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }
        }),

        // Duration picker
        h('label', { htmlFor: 'mun_caucus_dur', style: { display: 'block', fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } }, 'Total caucus duration (minutes)'),
        h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
          [5, 8, 10, 15].map(function(m) {
            return h('button', {
              key: m,
              onClick: function() { setDuration(m); },
              style: {
                flex: 1, padding: '8px 6px', fontSize: 12, fontWeight: 700,
                background: duration === m ? '#0ea5e9' : 'rgba(255,255,255,0.04)',
                color: duration === m ? '#fff' : '#cbd5e1',
                border: '1px solid ' + (duration === m ? '#0ea5e9' : '#475569'),
                borderRadius: 6, cursor: 'pointer'
              }
            }, m + ' min');
          })
        ),

        // Submit / cancel
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
          h('button', {
            onClick: onClose,
            style: { padding: '8px 14px', fontSize: 12, fontWeight: 600, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 8, cursor: 'pointer' }
          }, 'Cancel'),
          h('button', {
            onClick: submit,
            disabled: topic.trim().length < 3,
            style: { padding: '8px 18px', fontSize: 13, fontWeight: 700, background: topic.trim().length >= 3 ? '#fbbf24' : '#475569', color: topic.trim().length >= 3 ? '#0f172a' : '#94a3b8', border: 'none', borderRadius: 8, cursor: topic.trim().length >= 3 ? 'pointer' : 'not-allowed' }
          }, '⚖️ Open caucus')
        )
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

    // Help panel state for vote phase
    var voteHelpTuple = useState(false);
    var voteHelpOpen = voteHelpTuple[0];
    var setVoteHelpOpen = voteHelpTuple[1];

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      voteHelpOpen && h(HelpPanel, { phaseKey: 'vote', onClose: function() { setVoteHelpOpen(false); } }),
      // Header
      h('div', { style: { padding: 12, marginBottom: 14, background: 'linear-gradient(135deg, #7f1d1d 0%, #b91c1c 100%)', borderRadius: 10, position: 'relative' } },
        h('button', {
          onClick: function() { setVoteHelpOpen(true); },
          'aria-label': 'Open vocabulary help panel',
          style: { position: 'absolute', top: 10, right: 10, padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }
        }, '? Help'),
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

    // Transcript export — produces a printable HTML window. Variant 'personal'
    // includes only the viewer's own artifacts; 'class' includes the full
    // committee record.
    function exportTranscript(variant) {
      try {
        var roster = (sessionState && sessionState.roster) || {};
        var papers = modelUn.positionPapers || {};
        var crisisResp = (modelUn.crisisResponse && modelUn.crisisResponse.responses) || {};
        var allSpeeches = Object.keys(speeches).map(function(id) { return Object.assign({ id: id }, speeches[id]); }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });
        var clauses = modelUn.clauses || {};
        var clauseList = Object.keys(clauses).map(function(id) { return Object.assign({ id: id }, clauses[id]); });

        var isPersonal = variant === 'personal';
        var title = (isPersonal ? 'Personal Transcript — ' + (myCountry ? myCountry.name : 'Delegate') : 'Class Transcript — ' + (committee ? committee.name : 'Committee')) + (agenda ? ' · ' + agenda.title : '');

        var bodyHtml = '';
        bodyHtml += '<h1>' + escapeHtml(title) + '</h1>';
        bodyHtml += '<div class="meta">Outcome: ' + escapeHtml(modelUn.voteOutcome === 'passed' ? 'Resolution ADOPTED' : modelUn.voteOutcome === 'failed' ? 'Resolution FAILED' : 'Debate concluded') + '</div>';
        if (agenda) bodyHtml += '<div class="meta">Agenda background: ' + escapeHtml(agenda.background) + '</div>';

        // Roster
        bodyHtml += '<h2>Roll Call</h2><table class="roster"><tr><th>Country</th><th>Delegate</th><th>Final Vote</th></tr>';
        Object.keys(assigned).forEach(function(uid) {
          var iso = assigned[uid];
          var c = countryById(iso);
          if (!c) return;
          var isAi = uid.indexOf('ai_') === 0;
          var name = isAi ? 'AI delegate' : (roster[uid] ? roster[uid].name : (isSolo && uid === 'me' ? 'You' : uid));
          var v = finalVotes[iso];
          var voteLabel = v ? (v.vote === 'Y' ? 'Yes' : v.vote === 'N' ? 'No' : 'Abstain') : '—';
          bodyHtml += '<tr><td>' + escapeHtml(c.name) + '</td><td>' + escapeHtml(name) + '</td><td>' + escapeHtml(voteLabel) + '</td></tr>';
        });
        bodyHtml += '</table>';

        // Position papers
        if (isPersonal) {
          var pp = papers[myUid];
          if (pp) {
            bodyHtml += '<h2>My Position Paper</h2>';
            ['background', 'stance', 'solutions', 'allies'].forEach(function(f) {
              if (pp[f]) bodyHtml += '<h3>' + escapeHtml(f.charAt(0).toUpperCase() + f.slice(1)) + '</h3><p>' + escapeHtml(pp[f]) + '</p>';
            });
          }
        } else {
          var paperUids = Object.keys(papers);
          if (paperUids.length > 0) {
            bodyHtml += '<h2>Position Papers</h2>';
            paperUids.forEach(function(uid) {
              var iso = assigned[uid]; var c = countryById(iso); if (!c) return;
              var p = papers[uid];
              var nm = roster[uid] ? roster[uid].name : (isSolo && uid === 'me' ? 'You' : uid);
              bodyHtml += '<h3>' + escapeHtml(c.name) + ' — ' + escapeHtml(nm) + '</h3>';
              ['background', 'stance', 'solutions', 'allies'].forEach(function(f) {
                if (p[f]) bodyHtml += '<p><strong>' + escapeHtml(f.charAt(0).toUpperCase() + f.slice(1)) + ':</strong> ' + escapeHtml(p[f]) + '</p>';
              });
            });
          }
        }

        // Speeches
        var speechSet = isPersonal
          ? allSpeeches.filter(function(s) { return s.uid === myUid; })
          : allSpeeches;
        if (speechSet.length > 0) {
          bodyHtml += '<h2>' + (isPersonal ? 'My Speeches' : 'Speech Transcript') + '</h2>';
          speechSet.forEach(function(s) {
            var c = countryById(s.country);
            var when = s.at ? new Date(s.at).toLocaleTimeString() : '';
            bodyHtml += '<div class="speech"><div class="speech-head">' + escapeHtml((c ? c.name : s.country)) + (when ? ' · ' + escapeHtml(when) : '') + '</div>';
            bodyHtml += '<p>' + escapeHtml(s.text || '') + '</p></div>';
          });
        }

        // Clauses (class only)
        if (!isPersonal && clauseList.length > 0) {
          bodyHtml += '<h2>Resolution Clauses</h2>';
          clauseList.forEach(function(cl) {
            var sponsorCountry = countryById(cl.proposer);
            bodyHtml += '<div class="clause"><div class="meta">' +
              escapeHtml(cl.type || 'operative') + ' · sponsored by ' +
              escapeHtml(sponsorCountry ? sponsorCountry.name : (cl.proposer || 'unknown')) +
              ' · status: ' + escapeHtml(cl.status || 'proposed') +
              '</div><p>' + escapeHtml(cl.text || '') + '</p></div>';
          });
        }

        // Crisis responses
        if (isPersonal && crisisResp[myUid]) {
          bodyHtml += '<h2>My Crisis Response</h2><p>"' + escapeHtml(crisisResp[myUid].text || '') + '"</p>';
        } else if (!isPersonal && Object.keys(crisisResp).length > 0 && modelUn.news) {
          bodyHtml += '<h2>Crisis Event: ' + escapeHtml(modelUn.news.headline || '') + '</h2>';
          bodyHtml += '<p class="meta">' + escapeHtml(modelUn.news.body || '') + '</p>';
          Object.keys(crisisResp).forEach(function(uid) {
            var iso = crisisResp[uid].country; var c = countryById(iso);
            bodyHtml += '<div class="speech"><div class="speech-head">' + escapeHtml(c ? c.name : iso) + (crisisResp[uid].isAi ? ' (AI)' : '') + '</div>';
            bodyHtml += '<p>' + escapeHtml(crisisResp[uid].text || '') + '</p></div>';
          });
        }

        bodyHtml += '<div class="meta" style="margin-top:32px">Generated by AlloFlow Model UN · ' + escapeHtml(new Date().toLocaleString()) + '</div>';

        var html = '<!doctype html><html><head><meta charset="utf-8"><title>' + escapeHtml(title) + '</title>' +
          '<style>body{font-family:Georgia,serif;max-width:760px;margin:32px auto;padding:0 20px;color:#1f2937;line-height:1.55}' +
          'h1{font-size:22px;border-bottom:2px solid #0f766e;padding-bottom:6px}h2{font-size:16px;color:#0f766e;text-transform:uppercase;letter-spacing:1px;margin-top:28px;border-bottom:1px solid #d1d5db;padding-bottom:4px}h3{font-size:13px;color:#374151;margin-top:14px;margin-bottom:4px}' +
          '.meta{color:#6b7280;font-size:11px;margin-bottom:8px}p{font-size:13px;white-space:pre-wrap;margin:6px 0}' +
          'table.roster{width:100%;border-collapse:collapse;font-size:12px}table.roster th,table.roster td{border:1px solid #d1d5db;padding:4px 8px;text-align:left}table.roster th{background:#f3f4f6}' +
          '.speech{margin:10px 0;padding:8px 10px;background:#f9fafb;border-left:3px solid #0f766e}.speech-head{font-size:11px;color:#0f766e;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}' +
          '.clause{margin:8px 0;padding:8px;background:#fefce8;border-left:3px solid #ca8a04}' +
          '@media print{body{margin:0;padding:8px 16px}h2{page-break-after:avoid}.speech,.clause{page-break-inside:avoid}}</style></head><body>' +
          bodyHtml + '</body></html>';
        var w = window.open('', '_blank', 'width=820,height=900');
        if (!w) {
          if (typeof ctx.addToast === 'function') ctx.addToast('Browser blocked the export window — allow popups for this site.');
          return;
        }
        w.document.open(); w.document.write(html); w.document.close();
        setTimeout(function() { try { w.print(); } catch (e) {} }, 600);
      } catch (e) {
        if (typeof ctx.addToast === 'function') ctx.addToast('Transcript export failed.');
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

      // Personal Position Paper recap (closes the loop on the assessment artifact)
      myCountry && (modelUn.positionPapers || {})[myUid] && h('div', { style: { padding: 12, marginBottom: 14, background: 'rgba(76,29,149,0.10)', border: '1px solid #7c3aed', borderRadius: 8 } },
        h('div', { style: { fontSize: 10, color: '#c4b5fd', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📝 Your Position Paper'),
        (function() {
          var pp = modelUn.positionPapers[myUid];
          return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
            ['background', 'stance', 'solutions', 'allies'].map(function(field) {
              var labels = { background: 'Background', stance: 'Position', solutions: 'Solutions', allies: 'Allies' };
              if (!pp[field]) return null;
              return h('div', { key: field, style: { padding: 8, background: 'rgba(0,0,0,0.18)', borderRadius: 6 } },
                h('div', { style: { fontSize: 9, color: '#a78bfa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 } }, labels[field]),
                h('p', { style: { fontSize: 11, color: '#e2e8f0', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap' } }, pp[field].slice(0, 600))
              );
            })
          );
        })()
      ),

      // Crisis Response participation
      myCountry && modelUn.crisisResponse && (modelUn.crisisResponse.responses || {})[myUid] && h('div', { style: { padding: 12, marginBottom: 14, background: 'rgba(250,204,21,0.10)', border: '1px solid #facc15', borderRadius: 8 } },
        h('div', { style: { fontSize: 10, color: '#fde047', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🚨 Your Crisis Response'),
        h('p', { style: { fontSize: 12, color: '#fefce8', margin: 0, lineHeight: 1.55, fontStyle: 'italic' } },
          '"' + (modelUn.crisisResponse.responses[myUid].text || '') + '"'
        )
      ),

      // Teacher rubric grading (host/solo only — the assessment artifact)
      (isHost || isSolo) && h('div', { style: { marginBottom: 14 } },
        h(TeacherRubricPanel, { ctx: ctx, modelUn: modelUn, sessionState: sessionState, committee: committee, agenda: agenda })
      ),

      // Replay timeline — chronological scrubber across the whole debate
      h('div', { style: { marginBottom: 14 } },
        h(ReplayTimeline, { modelUn: modelUn })
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

      // Bloc voting alignment (which blocs held together, which split)
      Object.keys(finalVotes).length > 0 && h('div', { style: { padding: 12, marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 8 } },
        h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, '🤝 Bloc Voting Alignment'),
        (function() {
          var seatedIsos = Object.keys(assigned).map(function(uid) { return assigned[uid]; });
          var blocAnalysis = BLOCS.map(function(bloc) {
            var seatedInBloc = bloc.members.filter(function(iso) { return seatedIsos.indexOf(iso) !== -1; });
            if (seatedInBloc.length < 2) return null;
            var ys = 0, ns = 0, abs = 0, missing = 0;
            seatedInBloc.forEach(function(iso) {
              var v = finalVotes[iso];
              if (!v) { missing++; return; }
              if (v.vote === 'Y') ys++;
              else if (v.vote === 'N') ns++;
              else abs++;
            });
            var cast = ys + ns + abs;
            if (cast === 0) return null;
            var dominant = Math.max(ys, ns, abs);
            var unanimity = cast > 0 ? Math.round((dominant / cast) * 100) : 0;
            return { bloc: bloc, ys: ys, ns: ns, abs: abs, total: seatedInBloc.length, unanimity: unanimity };
          }).filter(Boolean).sort(function(a, b) { return b.unanimity - a.unanimity; });
          return h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 } },
            blocAnalysis.length === 0
              ? h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'No multi-member blocs voted in this committee.')
              : blocAnalysis.map(function(b) {
                  var label = b.unanimity >= 90 ? 'Unanimous' : b.unanimity >= 65 ? 'Aligned' : 'Split';
                  var col = b.unanimity >= 90 ? '#10b981' : b.unanimity >= 65 ? '#0ea5e9' : '#fbbf24';
                  return h('div', {
                    key: b.bloc.id,
                    style: { padding: 8, background: 'rgba(0,0,0,0.18)', borderLeft: '4px solid ' + b.bloc.color, border: '1px solid #334155', borderRadius: 6 }
                  },
                    h('div', { style: { fontSize: 11, fontWeight: 700, color: b.bloc.color, marginBottom: 4 } }, b.bloc.name),
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#cbd5e1' } },
                      h('span', { style: { color: '#10b981' } }, b.ys + '✓'),
                      h('span', { style: { color: '#dc2626' } }, b.ns + '✗'),
                      h('span', { style: { color: '#94a3b8' } }, b.abs + '○'),
                      h('span', { style: { marginLeft: 'auto', color: col, fontWeight: 700 } }, label + ' · ' + b.unanimity + '%')
                    )
                  );
                })
          );
        })()
      ),

      // Transcript export (personal + class)
      h('div', { style: { padding: 12, marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 8 } },
        h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📄 Transcript Export'),
        h('p', { style: { fontSize: 11, color: '#cbd5e1', margin: '0 0 10px 0', lineHeight: 1.5 } },
          'Generate a printable record of the debate. Open in a new window — use your browser\'s Print → Save as PDF for an artifact you can hand in or send home.'
        ),
        h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
          myCountry && h('button', {
            onClick: function() { exportTranscript('personal'); },
            style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
          }, '📄 My Personal Transcript'),
          (isHost || isSolo) && h('button', {
            onClick: function() { exportTranscript('class'); },
            style: { padding: '8px 14px', fontSize: 12, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
          }, '📚 Full Class Transcript')
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
  // ModCaucusView — moderated caucus on a chair-set sub-topic.
  // Each delegate can speak ~once; AI delegates auto-speak when called on.
  // Speeches stored in modelUn.caucusSpeeches (separate from opening speeches
  // so the opening-floor history stays clean).
  // ═══════════════════════════════════════════
  function ModCaucusView(props) {
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
    var subTopic = modelUn.caucusTopic || '(untitled)';
    var caucusSpeeches = modelUn.caucusSpeeches || {};
    var orderedSpeeches = Object.keys(caucusSpeeches).map(function(id) {
      return Object.assign({ id: id }, caucusSpeeches[id]);
    }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });

    var currentSpeakerUid = modelUn.caucusSpeakerUid || null;
    var currentSpeakerCountry = currentSpeakerUid ? countryById(assigned[currentSpeakerUid]) : null;

    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    var iAmCurrentSpeaker = !!currentSpeakerUid && currentSpeakerUid === myUid;

    var aiInFlightTuple = useState({});
    var aiInFlight = aiInFlightTuple[0];
    var setAiInFlight = aiInFlightTuple[1];

    function giveFloorTo(uid) {
      if (!isHost && !isSolo) return;
      var iso = assigned[uid];
      if (!iso) return;
      updateMUN({ caucusSpeakerUid: uid });
      if (uid.indexOf('ai_') === 0) triggerAiSpeech(uid, iso);
    }
    function triggerAiSpeech(uid, iso) {
      if (aiInFlight[uid]) return;
      var country = countryById(iso);
      if (!country) return;
      setAiInFlight(function(prev) { var n = Object.assign({}, prev); n[uid] = true; return n; });
      // Pass caucusTopic to the AI prompt for sub-topic focus
      aiGenerateDelegateSpeech(ctx, country, agenda, committee, orderedSpeeches, subTopic).then(function(result) {
        setAiInFlight(function(prev) { var n = Object.assign({}, prev); delete n[uid]; return n; });
        if (!result) {
          ctx.addToast('AI caucus speech failed for ' + country.name);
          return;
        }
        commitCaucusSpeech(uid, iso, result.text, result.keyPoints || [], true);
      }).catch(function() {
        setAiInFlight(function(prev) { var n = Object.assign({}, prev); delete n[uid]; return n; });
      });
    }
    function commitCaucusSpeech(uid, iso, text, keyPoints, isAi) {
      var country = countryById(iso);
      var speechId = 'cs_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var newSpeech = {
        uid: uid,
        country: country ? country.name : iso,
        iso: iso,
        flag: country ? country.flag : '🌐',
        text: (text || '').slice(0, 1000),
        keyPoints: keyPoints || [],
        isAi: !!isAi,
        at: Date.now()
      };
      var nextSpeeches = Object.assign({}, caucusSpeeches);
      nextSpeeches[speechId] = newSpeech;
      var keys = Object.keys(nextSpeeches).map(function(k) { return { k: k, at: nextSpeeches[k].at }; }).sort(function(a, b) { return a.at - b.at; });
      if (keys.length > 40) {
        var trimmed = {};
        keys.slice(-40).forEach(function(x) { trimmed[x.k] = nextSpeeches[x.k]; });
        nextSpeeches = trimmed;
      }
      updateMUN({ caucusSpeeches: nextSpeeches, caucusSpeakerUid: null });
      // Bump speech stat (caucus speeches also count)
      if (!isAi) {
        bumpStat('totalSpeeches');
      }
    }
    function skipSpeaker() {
      updateMUN({ caucusSpeakerUid: null });
    }
    function endCaucus(target) {
      // target: 'opening' | 'draft'
      updateMUN({ phase: target === 'draft' ? PHASES.DRAFT : PHASES.OPENING_SPEECHES, caucusSpeakerUid: null });
    }

    // Speaker eligibility — in a moderated caucus, delegates can be recognized
    // multiple times, but UX-wise we'll suggest those who haven't spoken yet.
    var spokenUids = {};
    orderedSpeeches.forEach(function(s) { spokenUids[s.uid] = true; });
    var eligibleDelegates = Object.keys(assigned).map(function(uid) {
      return { uid: uid, iso: assigned[uid], isAi: uid.indexOf('ai_') === 0, spoken: !!spokenUids[uid] };
    }).sort(function(a, b) {
      // Unspoken delegates first; AI last among unspoken so humans get priority
      if (a.spoken !== b.spoken) return a.spoken ? 1 : -1;
      if (a.isAi !== b.isAi) return a.isAi ? 1 : -1;
      return 0;
    });

    return h('div', { style: { padding: 16, color: '#e2e8f0', maxWidth: 1000, margin: '0 auto' } },
      // Header — distinctive caucus banner
      h('div', { style: { padding: 14, marginBottom: 14, background: 'linear-gradient(135deg, #78350f 0%, #b45309 100%)', borderRadius: 10 } },
        h('div', { style: { fontSize: 10, color: '#fde68a', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } },
          (committee ? committee.name : '') + ' · MODERATED CAUCUS'
        ),
        h('div', { style: { fontSize: 17, fontWeight: 800, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', null, '⚖️'),
          h('span', null, 'Sub-topic: ', h('em', null, subTopic))
        ),
        h('div', { style: { fontSize: 11, color: '#fef3c7', marginTop: 4 } },
          orderedSpeeches.length + ' caucus speech' + (orderedSpeeches.length !== 1 ? 'es' : '') + ' delivered · ' + (modelUn.caucusDurationMin || 8) + ' min budget'
        ),
        isHost && h('div', { style: { display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' } },
          h('button', {
            onClick: function() { endCaucus('opening'); },
            style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, cursor: 'pointer' }
          }, '↩ End caucus → Opening floor'),
          h('button', {
            onClick: function() { endCaucus('draft'); },
            style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
          }, '📜 End caucus → Drafting')
        )
      ),

      // News banner (if active)
      h(NewsDeskBanner, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN, isHost: isHost, isSolo: isSolo,
        agenda: agenda, committee: committee, recentSpeeches: orderedSpeeches
      }),

      // Backchannel diplomacy panel — private 1:1 notes during caucus
      h(BackchannelPanel, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN,
        isHost: isHost, isSolo: isSolo, sessionState: sessionState
      }),

      // Diplomatic consistency badge
      myCountry && h('div', { style: { marginBottom: 12 } },
        h(ConsistencyBadge, {
          ctx: ctx,
          country: myCountry,
          agenda: agenda,
          paper: (modelUn.positionPapers || {})[myUid] || null,
          ownSpeeches: orderedSpeeches.filter(function(s) { return s.country === myIso; })
        })
      ),

      // Current speaker spotlight
      currentSpeakerUid && currentSpeakerCountry && h('div', {
        style: { marginBottom: 14, padding: 14, background: 'rgba(251, 191, 36, 0.10)', border: '2px solid #fbbf24', borderRadius: 10 }
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
          h('span', { style: { fontSize: 32 } }, currentSpeakerCountry.flag),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } }, '🎤 Now Speaking on "' + subTopic + '"'),
            h('div', { style: { fontSize: 16, fontWeight: 800 } }, currentSpeakerCountry.name),
            currentSpeakerUid.indexOf('ai_') === 0 && h('div', { style: { fontSize: 10, color: '#a855f7' } },
              aiInFlight[currentSpeakerUid] ? '🤖 AI delegate composing…' : '🤖 AI delegate'
            )
          ),
          (isHost || isSolo) && h('button', {
            onClick: skipSpeaker,
            style: { padding: '4px 10px', fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.18)', color: '#fca5a5', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }
          }, 'Skip')
        ),
        // Human speaker compose
        iAmCurrentSpeaker && currentSpeakerUid.indexOf('ai_') !== 0 && h(SpeechComposeBox, {
          ctx: ctx,
          country: myCountry,
          agenda: agenda,
          committee: committee,
          recentSpeeches: orderedSpeeches,
          caucusTopic: subTopic,
          shortForm: true,
          userPaper: (modelUn.positionPapers || {})[myUid] || null,
          onSubmit: function(text) { commitCaucusSpeech(myUid, myIso, text, [], false); }
        }),
        // Watching speaker
        !iAmCurrentSpeaker && currentSpeakerUid.indexOf('ai_') !== 0 && h('p', { style: { fontSize: 12, color: '#cbd5e1', fontStyle: 'italic' } },
          (sessionState && sessionState.roster && sessionState.roster[currentSpeakerUid] ? sessionState.roster[currentSpeakerUid].name : 'Delegate') + ' is composing…'
        ),
        // AI in flight / manual trigger
        currentSpeakerUid.indexOf('ai_') === 0 && aiInFlight[currentSpeakerUid] && h('div', { style: { padding: 8, fontSize: 12, color: '#a855f7', fontStyle: 'italic' } },
          '🤖 Generating focused caucus speech…'
        ),
        currentSpeakerUid.indexOf('ai_') === 0 && !aiInFlight[currentSpeakerUid] && (isHost || isSolo) && h('button', {
          onClick: function() { triggerAiSpeech(currentSpeakerUid, assigned[currentSpeakerUid]); },
          style: { padding: '6px 12px', fontSize: 12, fontWeight: 700, background: '#a855f7', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }
        }, '🤖 Generate AI speech')
      ),

      // Two-column layout: queue (left) + feed (right)
      h('div', { style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 14 } },
        // Speaker queue
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Recognition Queue'
          ),
          eligibleDelegates.map(function(q) {
            var country = countryById(q.iso);
            if (!country) return null;
            var roster = (sessionState && sessionState.roster) || {};
            var rosterEntry = q.isAi ? null : (roster[q.uid] || (isSolo && q.uid === 'me' ? { name: ctx.studentNickname || 'You' } : null));
            var canRecognize = (isHost || isSolo) && !currentSpeakerUid;
            return h('button', {
              key: 'cq-' + q.uid,
              onClick: canRecognize ? function() { giveFloorTo(q.uid); } : null,
              disabled: !canRecognize,
              style: {
                width: '100%', textAlign: 'left', padding: 8, marginBottom: 6,
                background: q.isAi ? 'rgba(167,139,250,0.06)' : 'rgba(255,255,255,0.04)',
                border: '1px solid ' + (q.isAi ? '#7c3aed' : '#475569'),
                borderRadius: 8, color: '#e2e8f0',
                cursor: canRecognize ? 'pointer' : 'default',
                opacity: q.spoken ? 0.5 : (currentSpeakerUid ? 0.55 : 1)
              }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                h('span', { style: { fontSize: 18 } }, country.flag),
                h('div', { style: { flex: 1, fontSize: 12, fontWeight: 600 } }, country.name),
                q.spoken && h('span', { style: { fontSize: 10, color: '#94a3b8' } }, '✓ spoke'),
                !q.spoken && canRecognize && h('span', { style: { fontSize: 10, color: '#fcd34d' } }, 'Give floor →')
              ),
              h('div', { style: { fontSize: 10, marginTop: 2, color: q.isAi ? '#a855f7' : '#10b981' } },
                q.isAi ? '🤖 AI delegate' : ('👤 ' + (rosterEntry ? rosterEntry.name : q.uid))
              )
            );
          })
        ),

        // Speech feed
        h('div', null,
          h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 } },
            'Caucus Speeches on "' + subTopic + '"'
          ),
          orderedSpeeches.length === 0
            ? h('div', { style: { padding: 18, fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: 8 } },
                isHost || isSolo
                  ? 'Recognize a delegate from the queue to begin.'
                  : 'Waiting for the Chair to recognize the first speaker…'
              )
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                orderedSpeeches.slice().reverse().map(function(sp) {
                  return h(SpeechCard, { key: sp.id, ctx: ctx, speech: sp, myCountry: myCountry });
                })
              )
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // SpeechCard — one entry in the live speech feed.
  // v0.13: includes a TTS read-aloud button when ctx.callTTS is available.
  // Pure UDL accessibility — auditory channel for any speech in the feed.
  // ═══════════════════════════════════════════
  function SpeechCard(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useRef = React.useRef;
    var ctx = props.ctx || {};
    var sp = props.speech;
    var myCountry = props.myCountry;
    var isMine = myCountry && sp.iso === myCountry.iso;

    var ttsStateTuple = useState({ loading: false, playing: false });
    var ttsState = ttsStateTuple[0];
    var setTtsState = ttsStateTuple[1];
    var audioRef = useRef(null);

    function toggleTTS() {
      if (typeof ctx.callTTS !== 'function') return;
      // Stop any in-progress playback
      if (audioRef.current && ttsState.playing) {
        try { audioRef.current.pause(); audioRef.current.currentTime = 0; } catch (e) {}
        setTtsState({ loading: false, playing: false });
        return;
      }
      if (ttsState.loading) return;
      setTtsState({ loading: true, playing: false });
      var text = sp.text || '';
      Promise.resolve(ctx.callTTS(text.slice(0, 1500), 'Kore', 1.0)).then(function(audioUrl) {
        if (!audioUrl) {
          setTtsState({ loading: false, playing: false });
          if (typeof ctx.addToast === 'function') ctx.addToast('TTS unavailable for this speech.');
          return;
        }
        var audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.onended = function() { setTtsState({ loading: false, playing: false }); };
        audio.onerror = function() { setTtsState({ loading: false, playing: false }); };
        setTtsState({ loading: false, playing: true });
        audio.play().catch(function() {
          setTtsState({ loading: false, playing: false });
        });
      }).catch(function() {
        setTtsState({ loading: false, playing: false });
      });
    }

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
        ),
        typeof ctx.callTTS === 'function' && h('button', {
          onClick: toggleTTS,
          'aria-label': ttsState.playing ? 'Stop read-aloud' : 'Read this speech aloud',
          title: ttsState.playing ? 'Stop' : 'Read aloud',
          disabled: ttsState.loading,
          style: {
            padding: '4px 8px', fontSize: 11, fontWeight: 700,
            background: ttsState.playing ? '#dc2626' : (ttsState.loading ? '#475569' : 'rgba(14,165,233,0.18)'),
            color: ttsState.playing ? '#fff' : '#7dd3fc',
            border: '1px solid ' + (ttsState.playing ? '#dc2626' : '#0ea5e9'),
            borderRadius: 6, cursor: ttsState.loading ? 'wait' : 'pointer'
          }
        }, ttsState.loading ? '⏳' : ttsState.playing ? '⏹ Stop' : '🔊 Listen')
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
  // HelpPanel — modal overlay listing glossary terms relevant to the current
  // phase. Triggered by the "?" button in each phase header. UDL: just-in-time
  // vocabulary support without cluttering the main UI.
  // ═══════════════════════════════════════════
  function HelpPanel(props) {
    var React = window.React;
    var h = React.createElement;
    var phaseKey = props.phaseKey || 'briefing';
    var onClose = props.onClose;
    var terms = glossaryForPhase(phaseKey);
    return h('div', {
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'mun-help-title',
      style: {
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflow: 'auto'
      },
      onClick: function(e) { if (e.target === e.currentTarget) onClose(); }
    },
      h('div', {
        style: {
          maxWidth: 600, width: '100%', maxHeight: '85vh', overflowY: 'auto',
          background: '#0f172a', border: '2px solid #38bdf8', borderRadius: 12, color: '#e2e8f0'
        }
      },
        h('div', { style: { padding: 14, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #334155', position: 'sticky', top: 0, background: '#0f172a', zIndex: 1 } },
          h('span', { style: { fontSize: 26 } }, '📖'),
          h('div', { style: { flex: 1 } },
            h('div', { id: 'mun-help-title', style: { fontSize: 15, fontWeight: 800 } }, 'Vocabulary & Procedure Help'),
            h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } },
              terms.length + ' term' + (terms.length !== 1 ? 's' : '') + ' relevant to this phase'
            )
          ),
          h('button', {
            onClick: onClose,
            'aria-label': 'Close help panel',
            style: { padding: '4px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer', fontSize: 14 }
          }, '✕')
        ),
        h('div', { style: { padding: 14 } },
          terms.length === 0
            ? h('p', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'No specific terms for this phase yet.')
            : h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                terms.map(function(t, i) {
                  return h('div', {
                    key: 'term-' + i,
                    style: { padding: 10, background: 'rgba(56, 189, 248, 0.06)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: 8 }
                  },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: '#7dd3fc', marginBottom: 4 } }, t.term),
                    h('p', { style: { fontSize: 12, lineHeight: 1.6, color: '#cbd5e1', margin: 0 } }, t.def)
                  );
                })
              )
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // BlocsPanel — coalition map for the current chamber.
  // For each bloc, shows which seated delegations belong to it. Highlights
  // the bloc(s) the viewer's own country is part of (in green border). Big
  // pedagogical value: coalition politics IS Model UN, and most students new
  // to MUN miss it entirely. Showing this in the Draft phase makes "who do
  // I need to talk to to get my clause through?" visible.
  // ═══════════════════════════════════════════
  function BlocsPanel(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var modelUn = props.modelUn;
    var committee = props.committee;
    var myCountry = props.myCountry;
    var seatedIsos = Object.keys(modelUn.assignedCountries || {}).map(function(uid) { return modelUn.assignedCountries[uid]; });
    var collapsedTuple = useState(false);
    var collapsed = collapsedTuple[0];
    var setCollapsed = collapsedTuple[1];

    var myBlocIds = myCountry ? blocsForCountry(myCountry.iso).map(function(b) { return b.id; }) : [];

    var blocsWithPresence = BLOCS.map(function(bloc) {
      var seated = bloc.members.filter(function(iso) { return seatedIsos.indexOf(iso) !== -1; });
      return Object.assign({}, bloc, { seated: seated });
    }).filter(function(b) { return b.seated.length > 0; });

    return h('div', { style: { padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 10, marginBottom: 14 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: collapsed ? 0 : 10 } },
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, '🤝 Voting Blocs in this Chamber'),
          h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } },
            myCountry
              ? ('Your delegation ' + myCountry.flag + ' is in ' + (myBlocIds.length || 'no') + ' bloc' + (myBlocIds.length !== 1 ? 's' : '') + '. Coalitions co-sponsor clauses and trade amendments.')
              : 'Coalitions co-sponsor clauses and trade amendments.'
          )
        ),
        h('button', {
          onClick: function() { setCollapsed(!collapsed); },
          style: { padding: '4px 10px', fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
        }, collapsed ? 'Show' : 'Hide')
      ),
      !collapsed && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 } },
        blocsWithPresence.length === 0
          ? h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'No bloc members seated yet.')
          : blocsWithPresence.map(function(bloc) {
              var iAmIn = myBlocIds.indexOf(bloc.id) !== -1;
              return h('div', {
                key: bloc.id,
                style: {
                  padding: 8,
                  background: 'rgba(0,0,0,0.18)',
                  borderLeft: '4px solid ' + bloc.color,
                  border: iAmIn ? '1px solid #10b981' : '1px solid #334155',
                  borderLeftWidth: 4,
                  borderRadius: 6
                }
              },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: bloc.color, marginBottom: 4 } },
                  bloc.name + (iAmIn ? ' ✓' : '')
                ),
                h('div', { style: { fontSize: 11, color: '#cbd5e1', lineHeight: 1.5 } },
                  bloc.seated.map(function(iso) {
                    var c = countryById(iso);
                    return c ? c.flag + ' ' : iso + ' ';
                  }).join('')
                ),
                h('div', { style: { fontSize: 9, color: '#64748b', marginTop: 4 } },
                  bloc.seated.length + ' / ' + bloc.members.length + ' members seated'
                )
              );
            })
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
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var agenda = props.agenda;
    var committee = props.committee;
    var recentSpeeches = props.recentSpeeches || [];

    var news = modelUn.news;
    var crisis = modelUn.crisisResponse || null; // { newsAt, deadline, responses: { uid: { country, text, at } } }
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    // Crisis countdown tick — re-renders every second while crisis open
    var nowTuple = useState(Date.now());
    var setNow = nowTuple[1];
    useEffect(function() {
      if (!crisis || !crisis.deadline) return;
      var i = setInterval(function() { setNow(Date.now()); }, 1000);
      return function() { clearInterval(i); };
    }, [crisis && crisis.deadline]);

    function generateNews() {
      if (loading) return;
      setLoading(true);
      aiBreakingNews(ctx, agenda, recentSpeeches, committee).then(function(r) {
        setLoading(false);
        if (r) {
          updateMUN({ news: r });
          if (typeof ctx.addToast === 'function') ctx.addToast('📰 Breaking news broadcast to all delegates');
          // If Imagen is available, fire-and-forget a wire-photo-style image
          // to attach to the banner. Doesn't block the news drop.
          if (typeof ctx.callImagen === 'function') {
            var imagePrompt = 'A photojournalistic wire-service news photo for this UN news report. Subject: ' + r.headline + '. ' + r.body + '. Photorealistic, news photography style, no text overlays, no captions, neutral lighting, documentary tone. 16:9 aspect.';
            Promise.resolve(ctx.callImagen(imagePrompt)).then(function(imageUrl) {
              if (imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0) {
                // Re-read current news to avoid clobbering if it was dismissed
                if (modelUn.news && modelUn.news.at === r.at) {
                  updateMUN({ news: Object.assign({}, r, { imageUrl: imageUrl }) });
                }
              }
            }).catch(function() { /* silent */ });
          }
        } else {
          if (typeof ctx.addToast === 'function') ctx.addToast('News generation failed. Try again.');
        }
      }).catch(function() {
        setLoading(false);
      });
    }
    function dismissNews() {
      updateMUN({ news: null, crisisResponse: null });
    }

    // Host opens a crisis-response window (delegates must respond in 90s)
    function openCrisis() {
      if (!news) return;
      updateMUN({ crisisResponse: {
        newsAt: news.at || Date.now(),
        openedAt: Date.now(),
        deadline: Date.now() + 90 * 1000,
        responses: {}
      }});
      if (typeof ctx.addToast === 'function') ctx.addToast('🚨 Crisis response window OPEN (90 seconds)');
      // Kick off AI delegate responses (one per AI seat) — fire and forget
      var assigned = modelUn.assignedCountries || {};
      Object.keys(assigned).forEach(function(uid) {
        if (uid.indexOf('ai_') !== 0) return;
        var country = countryById(assigned[uid]);
        if (!country) return;
        // Stagger AI responses to feel organic (random 2-12s)
        var delay = 2000 + Math.floor(Math.random() * 10000);
        setTimeout(function() {
          aiGenerateCrisisResponse(ctx, country, agenda, news).then(function(r) {
            if (!r || !r.text) return;
            // Re-read current modelUn — note: stale closure is OK because
            // updateMUN re-merges with the latest session doc.
            var nextResp = Object.assign({}, (modelUn.crisisResponse && modelUn.crisisResponse.responses) || {});
            nextResp[uid] = { country: country.iso, text: r.text.slice(0, 400), at: Date.now(), isAi: true };
            updateMUN({ crisisResponse: Object.assign({}, modelUn.crisisResponse, { responses: nextResp }) });
          }).catch(function() {});
        }, delay);
      });
    }
    function closeCrisis() {
      updateMUN({ crisisResponse: null });
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

    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? (modelUn.assignedCountries || {})[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    var crisisActive = !!(crisis && crisis.deadline && Date.now() < crisis.deadline);
    var crisisClosed = !!(crisis && crisis.deadline && Date.now() >= crisis.deadline);
    var responses = (crisis && crisis.responses) || {};
    var responseCount = Object.keys(responses).length;
    var timeLeftMs = crisis && crisis.deadline ? Math.max(0, crisis.deadline - Date.now()) : 0;
    var timeLeftSec = Math.ceil(timeLeftMs / 1000);
    var alreadyResponded = !!(myUid && responses[myUid]);

    return h('div', null,
      // Main news card
      h('div', {
        style: {
          marginBottom: crisis ? 8 : 12,
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
            news.imageUrl && h('img', {
              src: news.imageUrl,
              alt: 'Wire-photo for ' + news.headline,
              style: { display: 'block', width: '100%', maxWidth: 480, marginTop: 8, borderRadius: 6, border: '1px solid rgba(255,255,255,0.18)' }
            }),
            h('p', { style: { fontSize: 12, lineHeight: 1.6, margin: '6px 0 0 0', color: '#fee2e2' } }, news.body),
            affectedFlags && h('div', { style: { fontSize: 10, color: '#fecaca', marginTop: 6, fontStyle: 'italic' } },
              'Most directly affected: ' + affectedFlags
            )
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-end' } },
            isHost && !crisis && h('button', {
              onClick: openCrisis,
              'aria-label': 'Open crisis response window — 90 seconds',
              style: {
                padding: '6px 10px', fontSize: 11, fontWeight: 700,
                background: '#facc15', color: '#7c2d12',
                border: 'none', borderRadius: 6, cursor: 'pointer'
              }
            }, '🚨 Crisis Response (90s)'),
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
        )
      ),

      // Crisis response panel
      crisis && h(CrisisResponsePanel, {
        ctx: ctx, modelUn: modelUn, updateMUN: updateMUN,
        news: news, crisis: crisis, myUid: myUid, myCountry: myCountry,
        agenda: agenda, isHost: isHost, isSolo: isSolo,
        timeLeftSec: timeLeftSec, crisisActive: crisisActive,
        crisisClosed: crisisClosed, responseCount: responseCount,
        responses: responses, alreadyResponded: alreadyResponded,
        onClose: closeCrisis
      })
    );
  }

  // ═══════════════════════════════════════════
  // CrisisResponsePanel — student/host UI for the 90-second crisis window.
  // Each delegate composes a 25-50 word reactive statement; AI delegates
  // auto-respond. The response feed streams live; after deadline, the panel
  // becomes a read-only summary.
  // ═══════════════════════════════════════════
  function CrisisResponsePanel(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var news = props.news;
    var crisis = props.crisis;
    var myUid = props.myUid;
    var myCountry = props.myCountry;
    var agenda = props.agenda;
    var isHost = props.isHost;
    var timeLeftSec = props.timeLeftSec;
    var crisisActive = props.crisisActive;
    var crisisClosed = props.crisisClosed;
    var responseCount = props.responseCount;
    var responses = props.responses || {};
    var alreadyResponded = props.alreadyResponded;
    var onClose = props.onClose;

    var textTuple = useState('');
    var text = textTuple[0];
    var setText = textTuple[1];

    function submitResponse() {
      if (!myCountry || !myUid) return;
      var t = (text || '').trim();
      if (t.length < 15) {
        if (typeof ctx.addToast === 'function') ctx.addToast('Crisis response too short — aim for 25-50 words.');
        return;
      }
      var nextResp = Object.assign({}, responses);
      nextResp[myUid] = { country: myCountry.iso, text: t.slice(0, 400), at: Date.now() };
      updateMUN({ crisisResponse: Object.assign({}, crisis, { responses: nextResp }) });
      bumpStat('crisisResponsesGiven', 1);
      setText('');
      if (typeof ctx.addToast === 'function') ctx.addToast('✓ Crisis response submitted');
    }

    return h('div', {
      style: {
        marginBottom: 12, padding: 12,
        background: 'linear-gradient(135deg, #422006 0%, #713f12 100%)',
        border: '2px solid ' + (crisisActive ? '#facc15' : '#92400e'),
        borderRadius: 10, color: '#fefce8'
      },
      role: 'region',
      'aria-label': 'Crisis Response Window'
    },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
        h('span', { style: { fontSize: 22 } }, '🚨'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 11, color: '#fde047', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' } },
            crisisActive ? 'Crisis Response Open · ' + responseCount + ' responses · ' + timeLeftSec + 's left' : 'Crisis Response Closed · ' + responseCount + ' total responses'
          ),
          crisisActive && h('div', { style: { fontSize: 11, color: '#fef9c3', marginTop: 2, fontStyle: 'italic' } },
            'Every delegation has 90 seconds to react. Diplomatic but urgent. 25-50 words.'
          ),
          crisisClosed && h('div', { style: { fontSize: 11, color: '#fef9c3', marginTop: 2, fontStyle: 'italic' } },
            'Window closed. The Chair may now incorporate responses into the debate or move on.'
          )
        ),
        isHost && h('button', {
          onClick: onClose,
          style: { padding: '4px 8px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.12)', color: '#fef9c3', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, cursor: 'pointer' }
        }, crisisClosed ? '✕ Close' : '⏹ End early')
      ),

      // My-delegate compose (only while active and not yet responded)
      crisisActive && myCountry && !alreadyResponded && h('div', { style: { padding: 10, background: 'rgba(0,0,0,0.25)', borderRadius: 8, marginBottom: 10 } },
        h('div', { style: { fontSize: 11, color: '#fde047', fontWeight: 700, marginBottom: 6 } },
          myCountry.flag + ' ' + myCountry.name + ' — react in 25-50 words'
        ),
        h('textarea', {
          value: text,
          onChange: function(e) { setText(e.target.value); },
          placeholder: 'Our delegation… (one urgent position + one concrete call to action)',
          rows: 3,
          style: { width: '100%', padding: 8, fontSize: 12, lineHeight: 1.5, fontFamily: 'inherit', background: 'rgba(0,0,0,0.4)', color: '#fefce8', border: '1px solid #ca8a04', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 6 } },
          h('span', { style: { fontSize: 10, color: '#fef9c3' } }, (text.trim().split(/\s+/).filter(Boolean).length) + ' word' + (text.trim().split(/\s+/).filter(Boolean).length !== 1 ? 's' : '')),
          h('button', {
            onClick: submitResponse,
            disabled: text.trim().length < 15,
            style: { marginLeft: 'auto', padding: '6px 14px', fontSize: 12, fontWeight: 700, background: text.trim().length >= 15 ? '#facc15' : '#475569', color: '#422006', border: 'none', borderRadius: 6, cursor: text.trim().length >= 15 ? 'pointer' : 'not-allowed' }
          }, '🎤 Submit response')
        )
      ),

      crisisActive && alreadyResponded && h('div', { style: { padding: 8, background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', borderRadius: 6, fontSize: 11, color: '#a7f3d0', marginBottom: 10 } },
        '✓ Your response is on the feed. Watch other delegations react…'
      ),

      // Response feed
      responseCount > 0 && h('div', { style: { maxHeight: 240, overflowY: 'auto', paddingRight: 4 } },
        h('div', { style: { fontSize: 10, color: '#fde047', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 } }, 'Live response feed'),
        Object.keys(responses).sort(function(a, b) { return (responses[a].at || 0) - (responses[b].at || 0); }).map(function(uid) {
          var r = responses[uid];
          var country = countryById(r.country);
          return h('div', { key: uid, style: { padding: 8, background: 'rgba(0,0,0,0.22)', borderRadius: 6, marginBottom: 6, borderLeft: '3px solid ' + (r.isAi ? '#a855f7' : '#facc15') } },
            h('div', { style: { fontSize: 11, fontWeight: 700, color: '#fef9c3', marginBottom: 3 } },
              (country ? country.flag + ' ' + country.name : r.country) + (r.isAi ? ' 🤖' : '')
            ),
            h('p', { style: { fontSize: 12, color: '#fefce8', margin: 0, lineHeight: 1.5 } }, r.text)
          );
        })
      )
    );
  }

  // ═══════════════════════════════════════════
  // ConsistencyBadge — student-facing live diplomatic-consistency meter.
  // Re-scores via aiScoreConsistency() each time the user submits a new
  // speech in their session. Quiet on first load (no speeches yet → null).
  // ═══════════════════════════════════════════
  function ConsistencyBadge(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var useRef = React.useRef;
    var ctx = props.ctx;
    var country = props.country;
    var agenda = props.agenda;
    var paper = props.paper || null;
    var ownSpeeches = props.ownSpeeches || []; // array, ordered

    var scoreTuple = useState(null);
    var score = scoreTuple[0];
    var setScore = scoreTuple[1];
    var detailTuple = useState(false);
    var detailOpen = detailTuple[0];
    var setDetailOpen = detailTuple[1];
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];
    var lastScoredKey = useRef(null);

    var speechSignature = ownSpeeches.map(function(s) { return (s.id || '') + ':' + ((s.text || '').length); }).join('|');

    useEffect(function() {
      if (!country || !agenda) return;
      if (!ownSpeeches || ownSpeeches.length === 0) return;
      if (lastScoredKey.current === speechSignature) return;
      lastScoredKey.current = speechSignature;
      setLoading(true);
      aiScoreConsistency(ctx, country, agenda, paper, ownSpeeches).then(function(r) {
        setLoading(false);
        if (r) {
          setScore(r);
          if (r.score > (window.__alloHavenModelUNStats.bestConsistencyScore || 0)) {
            window.__alloHavenModelUNStats.bestConsistencyScore = r.score;
          }
          if (r.score >= 90 && !window.__alloHavenModelUNStats.consistencyMaster) {
            window.__alloHavenModelUNStats.consistencyMaster = true;
            if (typeof ctx.addToast === 'function') ctx.addToast('🏅 Achievement: Consistency Master (90+ diplomatic score)');
          }
        }
      }).catch(function() { setLoading(false); });
    }, [speechSignature]);

    if (!country || !agenda) return null;
    if (!ownSpeeches || ownSpeeches.length === 0) {
      return h('div', { style: { padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px dashed #475569', borderRadius: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
        '📐 Diplomatic Consistency: speak first, then the AI will score your alignment with ' + country.name + '\'s baseline stance.'
      );
    }

    if (loading && !score) {
      return h('div', { style: { padding: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid #475569', borderRadius: 8, fontSize: 11, color: '#94a3b8' } },
        '📐 Scoring diplomatic consistency…'
      );
    }
    if (!score) return null;

    var s = score.score || 0;
    var color = s >= 90 ? '#10b981' : s >= 70 ? '#0ea5e9' : s >= 50 ? '#fbbf24' : '#ef4444';
    var label = s >= 90 ? 'Rock-solid' : s >= 70 ? 'Mostly aligned' : s >= 50 ? 'Drifting' : 'Off-message';

    return h('div', { style: { padding: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid ' + color, borderRadius: 8 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('div', {
          style: {
            width: 48, height: 48, borderRadius: '50%',
            background: 'conic-gradient(' + color + ' ' + (s * 3.6) + 'deg, rgba(255,255,255,0.05) 0deg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }
        },
          h('div', { style: { width: 38, height: 38, borderRadius: '50%', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: color } }, s + '%')
        ),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 11, color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, '📐 Diplomatic Consistency'),
          h('div', { style: { fontSize: 13, fontWeight: 700, color: color, marginTop: 2 } }, label),
          score.summary && h('p', { style: { fontSize: 11, color: '#cbd5e1', margin: '4px 0 0 0', lineHeight: 1.5 } }, score.summary)
        ),
        h('button', {
          onClick: function() { setDetailOpen(!detailOpen); },
          style: { padding: '4px 8px', fontSize: 10, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
        }, detailOpen ? 'Hide' : 'Details')
      ),
      detailOpen && score.drift && score.drift.length > 0 && h('div', { style: { marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.18)', borderRadius: 6 } },
        h('div', { style: { fontSize: 10, color: '#fbbf24', fontWeight: 700, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 } }, 'Drift detected'),
        h('ul', { style: { fontSize: 11, color: '#fef3c7', margin: 0, paddingLeft: 16, lineHeight: 1.5 } },
          score.drift.map(function(d, i) { return h('li', { key: i }, d); })
        )
      ),
      detailOpen && (!score.drift || score.drift.length === 0) && h('div', { style: { marginTop: 8, padding: 8, background: 'rgba(0,0,0,0.18)', borderRadius: 6, fontSize: 11, color: '#a7f3d0', fontStyle: 'italic' } },
        'No drift detected — every recent speech matches your country\'s baseline.'
      )
    );
  }

  // ═══════════════════════════════════════════
  // AICoachButton — floating help button that gives phase-aware in-character
  // coaching. Always visible to the student. Opens a panel with the AI's
  // advice + actionable next steps. UDL: a persistent scaffold for students
  // who get stuck or anxious during live debate.
  // ═══════════════════════════════════════════
  function AICoachButton(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var sessionState = props.sessionState;
    var isSolo = props.isSolo;

    var assigned = modelUn.assignedCountries || {};
    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    if (!myCountry) return null; // host (no country) doesn't need the coach

    var openTuple = useState(false);
    var open = openTuple[0];
    var setOpen = openTuple[1];
    var questionTuple = useState('');
    var question = questionTuple[0];
    var setQuestion = questionTuple[1];
    var resultTuple = useState(null);
    var result = resultTuple[0];
    var setResult = resultTuple[1];
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    function askCoach(specificQuestion) {
      if (loading || !myCountry) return;
      setLoading(true);
      setResult(null);
      var agenda = agendaById(modelUn.agendaId);
      var speeches = modelUn.speeches || {};
      var allSpeeches = Object.keys(speeches).map(function(id) { return speeches[id]; }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });
      var ownSpeeches = allSpeeches.filter(function(s) { return s.country === myIso; });
      var clauses = modelUn.clauses ? Object.keys(modelUn.clauses).map(function(id) { return modelUn.clauses[id]; }) : [];
      aiCoachAdvice(ctx, {
        country: myCountry,
        agenda: agenda,
        phase: modelUn.phase,
        paper: (modelUn.positionPapers || {})[myUid] || null,
        ownSpeeches: ownSpeeches,
        recentChamber: allSpeeches,
        clauses: clauses,
        blocs: blocsForCountry(myIso),
        question: specificQuestion || question || null
      }).then(function(r) {
        setLoading(false);
        if (r) {
          setResult(r);
          if (!window.__alloHavenModelUNStats.coachUsed) {
            window.__alloHavenModelUNStats.coachUsed = true;
            if (typeof ctx.addToast === 'function') ctx.addToast('🏅 Achievement: Asked for AI coaching (UDL!)');
          }
        } else if (typeof ctx.addToast === 'function') {
          ctx.addToast('Coach is taking a break — try again in a moment.');
        }
      }).catch(function() { setLoading(false); });
    }

    return h(React.Fragment, null,
      // Floating trigger
      !open && h('button', {
        onClick: function() { setOpen(true); },
        'aria-label': 'Open AI coach',
        style: {
          position: 'fixed', right: 16, bottom: 16, zIndex: 1000,
          padding: '12px 16px', fontSize: 13, fontWeight: 700,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          color: '#fff', border: 'none', borderRadius: 999,
          boxShadow: '0 8px 24px rgba(99,102,241,0.4)', cursor: 'pointer'
        }
      }, '🧠 Coach'),

      // Panel
      open && h('div', {
        style: {
          position: 'fixed', right: 16, bottom: 16, zIndex: 1000,
          width: 360, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 60px)',
          background: '#0f172a', border: '2px solid #6366f1', borderRadius: 12,
          padding: 14, color: '#e2e8f0', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(99,102,241,0.4)'
        },
        role: 'dialog', 'aria-label': 'AI Model UN Coach'
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
          h('span', { style: { fontSize: 20 } }, '🧠'),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'AI Coach'),
            h('div', { style: { fontSize: 13, fontWeight: 700 } }, myCountry.flag + ' ' + myCountry.name)
          ),
          h('button', {
            onClick: function() { setOpen(false); },
            'aria-label': 'Close coach',
            style: { padding: '4px 8px', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
          }, '✕')
        ),

        // Quick prompts
        !result && !loading && h('div', { style: { marginBottom: 10 } },
          h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 } }, 'Quick asks'),
          [
            { label: '🎤 What should I say next?',     q: 'What is the strongest thing I could say in my next speech?' },
            { label: '🤝 Who should I ally with?',     q: 'Which delegations should I try to caucus with to build a coalition?' },
            { label: '⚠️ Am I off-message?',           q: 'Have my recent speeches drifted from my country\'s actual position?' },
            { label: '📜 How do I write a clause?',    q: 'Walk me through writing a strong operative clause in proper MUN format.' }
          ].map(function(item, i) {
            return h('button', {
              key: i,
              onClick: function() { askCoach(item.q); },
              style: { display: 'block', width: '100%', textAlign: 'left', padding: '6px 10px', marginBottom: 4, fontSize: 12, fontWeight: 600, background: 'rgba(99,102,241,0.10)', color: '#c4b5fd', border: '1px solid #4f46e5', borderRadius: 6, cursor: 'pointer' }
            }, item.label);
          })
        ),

        // Custom question
        !result && !loading && h('div', { style: { marginBottom: 8 } },
          h('label', { htmlFor: 'mun_coach_q', style: { display: 'block', fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } }, 'Or ask anything'),
          h('textarea', {
            id: 'mun_coach_q',
            value: question,
            onChange: function(e) { setQuestion(e.target.value); },
            placeholder: 'e.g., How do I push back on China without escalating?',
            rows: 2,
            style: { width: '100%', padding: 8, fontSize: 12, lineHeight: 1.4, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }
          }),
          h('button', {
            onClick: function() { askCoach(); },
            disabled: !question || question.trim().length < 5,
            style: { marginTop: 6, padding: '8px 14px', fontSize: 12, fontWeight: 700, background: question && question.trim().length >= 5 ? '#6366f1' : '#475569', color: '#fff', border: 'none', borderRadius: 6, cursor: question && question.trim().length >= 5 ? 'pointer' : 'not-allowed' }
          }, 'Ask coach')
        ),

        loading && h('div', { style: { padding: 14, textAlign: 'center', fontSize: 12, color: '#c4b5fd', fontStyle: 'italic' } },
          '⏳ Coach is thinking through your situation…'
        ),

        result && h('div', null,
          h('div', { style: { padding: 10, background: 'rgba(99,102,241,0.10)', border: '1px solid #6366f1', borderRadius: 8, marginBottom: 8 } },
            h('p', { style: { fontSize: 12, color: '#e2e8f0', margin: 0, lineHeight: 1.55 } }, result.advice)
          ),
          result.nextSteps && result.nextSteps.length > 0 && h('div', { style: { marginBottom: 8 } },
            h('div', { style: { fontSize: 10, color: '#a7f3d0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 } }, 'Try right now'),
            h('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.5, color: '#d1fae5' } },
              result.nextSteps.map(function(step, i) { return h('li', { key: i }, step); })
            )
          ),
          h('button', {
            onClick: function() { setResult(null); setQuestion(''); },
            style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
          }, '↻ Ask another question')
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // VoteWhipPanel — pre-vote AI prediction of how each seated delegation
  // will vote. Renders in the DraftResolutionView (before the host moves to
  // the official vote). High-pedagogy: students see the gap and have to
  // strategize about who to lobby.
  // ═══════════════════════════════════════════
  function VoteWhipPanel(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var committee = props.committee;
    var agenda = props.agenda;

    var resultTuple = useState(null);
    var result = resultTuple[0];
    var setResult = resultTuple[1];
    var loadingTuple = useState(false);
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    function predict() {
      if (loading || !committee || !agenda) return;
      setLoading(true);
      var clauses = modelUn.clauses ? Object.keys(modelUn.clauses).map(function(id) { return modelUn.clauses[id]; }).filter(function(c) { return c.status !== 'rejected'; }) : [];
      var speeches = modelUn.speeches || {};
      var allSpeeches = Object.keys(speeches).map(function(id) { return speeches[id]; }).sort(function(a, b) { return (a.at || 0) - (b.at || 0); });
      aiPredictVoteTally(ctx, {
        committee: committee,
        agenda: agenda,
        assigned: modelUn.assignedCountries || {},
        clauses: clauses,
        recentSpeeches: allSpeeches
      }).then(function(r) {
        setLoading(false);
        if (r) setResult(r);
        else if (typeof ctx.addToast === 'function') ctx.addToast('Whip prediction unavailable — try again.');
      }).catch(function() { setLoading(false); });
    }

    if (!result && !loading) {
      return h('div', { style: { padding: 10, background: 'rgba(14,165,233,0.08)', border: '1px dashed #0ea5e9', borderRadius: 8, marginBottom: 12 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { fontSize: 20 } }, '🗳️'),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 11, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'AI Whip'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, 'Estimate the vote tally on the current draft before the Chair calls the vote.')
          ),
          h('button', {
            onClick: predict,
            style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
          }, '🔍 Predict tally')
        )
      );
    }

    if (loading) {
      return h('div', { style: { padding: 10, background: 'rgba(14,165,233,0.08)', border: '1px solid #0ea5e9', borderRadius: 8, marginBottom: 12, fontSize: 12, color: '#7dd3fc', fontStyle: 'italic', textAlign: 'center' } },
        '⏳ AI whip is reading the room and predicting how each delegation will vote…'
      );
    }

    var tally = result.tally || { Y: 0, N: 0, A: 0 };
    var total = tally.Y + tally.N + tally.A;
    var passProspect = tally.Y > tally.N ? 'Likely to pass' : tally.Y < tally.N ? 'Likely to fail' : 'Razor close';
    var passColor = tally.Y > tally.N ? '#10b981' : tally.Y < tally.N ? '#dc2626' : '#fbbf24';

    return h('div', { style: { padding: 12, background: 'rgba(14,165,233,0.10)', border: '2px solid #0ea5e9', borderRadius: 10, marginBottom: 12 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
        h('span', { style: { fontSize: 22 } }, '🗳️'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'AI Whip — Vote Prediction'),
          h('div', { style: { fontSize: 14, fontWeight: 800, color: passColor, marginTop: 2 } }, passProspect)
        ),
        h('button', {
          onClick: function() { setResult(null); },
          style: { padding: '4px 10px', fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
        }, '↻ Refresh')
      ),
      // Tally bars
      h('div', { style: { display: 'flex', gap: 6, marginBottom: 10 } },
        ['Y', 'N', 'A'].map(function(v) {
          var n = tally[v];
          var pct = total > 0 ? Math.round((n / total) * 100) : 0;
          var col = v === 'Y' ? '#10b981' : v === 'N' ? '#dc2626' : '#94a3b8';
          var lbl = v === 'Y' ? 'Yes' : v === 'N' ? 'No' : 'Abstain';
          return h('div', { key: v, style: { flex: 1, padding: 8, background: col + '15', border: '1px solid ' + col, borderRadius: 6, textAlign: 'center' } },
            h('div', { style: { fontSize: 18, fontWeight: 900, color: col } }, n),
            h('div', { style: { fontSize: 10, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: 0.5 } }, lbl + ' · ' + pct + '%')
          );
        })
      ),
      result.summary && h('div', { style: { padding: 8, background: 'rgba(0,0,0,0.18)', borderRadius: 6, fontSize: 12, color: '#e2e8f0', marginBottom: 8, fontStyle: 'italic' } },
        '"' + result.summary + '"'
      ),
      // Per-country chips
      h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 4 } },
        result.predictions.map(function(p) {
          var c = countryById(p.iso);
          var col = p.vote === 'Y' ? '#10b981' : p.vote === 'N' ? '#dc2626' : '#94a3b8';
          var emoji = p.vote === 'Y' ? '✓' : p.vote === 'N' ? '✗' : '○';
          return h('div', {
            key: p.iso,
            title: p.reasoning,
            style: { padding: 6, background: col + '12', border: '1px solid ' + col, borderRadius: 6, fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }
          },
            h('span', null, c ? c.flag : '🏳️'),
            h('span', { style: { flex: 1, fontWeight: 600 } }, c ? c.name : p.iso),
            h('span', { style: { fontWeight: 900, color: col } }, emoji)
          );
        })
      )
    );
  }

  // ═══════════════════════════════════════════
  // ReplayTimeline — chronological scrubber for the Debrief view.
  // Renders every speech, clause, news event, and vote as a dot on a single
  // horizontal axis spanning the debate's duration. Click a dot to read the
  // moment. Great teacher artifact: see the SHAPE of the debate at a glance.
  // ═══════════════════════════════════════════
  // ═══════════════════════════════════════════
  // TeacherRubricPanel — host-only grading interface in Debrief.
  // AI auto-fills a 5-domain rubric for every human student; teacher can
  // override any score. Exportable as CSV for gradebook import.
  // 5 domains × 4-point scale (Beginning / Developing / Proficient / Advanced).
  // ═══════════════════════════════════════════
  var RUBRIC_DOMAINS = [
    { key: 'preparation',            label: 'Preparation',             icon: '📝', color: '#a855f7' },
    { key: 'speechQuality',          label: 'Speech Quality',          icon: '🎤', color: '#0ea5e9' },
    { key: 'diplomaticConsistency',  label: 'Diplomatic Consistency',  icon: '📐', color: '#10b981' },
    { key: 'coalitionBuilding',      label: 'Coalition Building',      icon: '🤝', color: '#fbbf24' },
    { key: 'resolutionContribution', label: 'Resolution Contribution', icon: '📜', color: '#f97316' }
  ];
  var RUBRIC_SCORE_LABELS = ['—', 'Beginning', 'Developing', 'Proficient', 'Advanced'];

  function TeacherRubricPanel(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var sessionState = props.sessionState;
    var committee = props.committee;
    var agenda = props.agenda;

    var assigned = modelUn.assignedCountries || {};
    var papers = modelUn.positionPapers || {};
    var speeches = modelUn.speeches || {};
    var clauses = modelUn.clauses || {};
    var finalVotes = modelUn.finalVotes || {};
    var crisisResp = (modelUn.crisisResponse && modelUn.crisisResponse.responses) || {};
    var passed = modelUn.voteOutcome === 'passed';

    // Only human students get graded (AI delegates excluded)
    var humanUids = Object.keys(assigned).filter(function(uid) { return uid.indexOf('ai_') !== 0; });

    var gradesTuple = useState({}); // { uid: rubricResult }
    var grades = gradesTuple[0];
    var setGrades = gradesTuple[1];
    var loadingTuple = useState({}); // { uid: true }
    var loading = loadingTuple[0];
    var setLoading = loadingTuple[1];

    function gradeOne(uid) {
      if (loading[uid] || !agenda) return;
      var iso = assigned[uid];
      var country = countryById(iso);
      if (!country) return;
      var nextLoad = Object.assign({}, loading); nextLoad[uid] = true;
      setLoading(nextLoad);
      var ownSpeeches = Object.keys(speeches).map(function(id) { return speeches[id]; }).filter(function(s) { return s.uid === uid; });
      var ownClauses = Object.keys(clauses).map(function(id) { return clauses[id]; }).filter(function(c) { return c.proposer === iso || c.proposer === country.name; });
      var voteRec = finalVotes[iso];
      aiGradeStudentRubric(ctx, {
        country: country,
        agenda: agenda,
        paper: papers[uid],
        ownSpeeches: ownSpeeches,
        ownClauses: ownClauses,
        crisisResponse: crisisResp[uid] && crisisResp[uid].text,
        vote: voteRec ? voteRec.vote : null,
        passed: passed
      }).then(function(r) {
        var done = Object.assign({}, loading); delete done[uid];
        setLoading(done);
        if (r) {
          var nextGrades = Object.assign({}, grades);
          nextGrades[uid] = r;
          setGrades(nextGrades);
        } else if (typeof ctx.addToast === 'function') {
          ctx.addToast('AI grader unavailable for that delegate.');
        }
      }).catch(function() {
        var done = Object.assign({}, loading); delete done[uid];
        setLoading(done);
      });
    }

    function gradeAll() {
      humanUids.forEach(function(uid, i) {
        if (grades[uid]) return; // skip already graded
        setTimeout(function() { gradeOne(uid); }, i * 250);
      });
    }

    function overrideScore(uid, domainKey, newScore) {
      var rubric = grades[uid];
      if (!rubric) return;
      var nextRubric = Object.assign({}, rubric);
      nextRubric[domainKey] = Object.assign({}, rubric[domainKey], { score: newScore, overridden: true });
      var nextGrades = Object.assign({}, grades);
      nextGrades[uid] = nextRubric;
      setGrades(nextGrades);
    }

    function exportCsv() {
      var roster = (sessionState && sessionState.roster) || {};
      var lines = [];
      lines.push(['Delegate', 'Country', 'Preparation', 'Speech Quality', 'Diplomatic Consistency', 'Coalition Building', 'Resolution Contribution', 'Overall'].join(','));
      humanUids.forEach(function(uid) {
        var iso = assigned[uid]; var country = countryById(iso); if (!country) return;
        var name = roster[uid] ? roster[uid].name : (uid === 'me' ? 'You' : uid);
        var r = grades[uid] || {};
        var cell = function(d) { return r[d] ? r[d].score : ''; };
        lines.push([
          '"' + String(name).replace(/"/g, '""') + '"',
          '"' + country.name.replace(/"/g, '""') + '"',
          cell('preparation'),
          cell('speechQuality'),
          cell('diplomaticConsistency'),
          cell('coalitionBuilding'),
          cell('resolutionContribution'),
          cell('overall')
        ].join(','));
      });
      var csv = lines.join('\n');
      try {
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'model-un-grades-' + (committee ? committee.id : 'committee') + '-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      } catch (e) {
        if (typeof ctx.addToast === 'function') ctx.addToast('CSV export failed in this browser.');
      }
    }

    if (humanUids.length === 0) {
      return h('div', { style: { padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 8, fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
        'No human delegates in this committee — nothing to grade.'
      );
    }

    var anyGraded = Object.keys(grades).length > 0;

    return h('div', { style: { padding: 14, background: 'rgba(124,58,237,0.08)', border: '2px solid #7c3aed', borderRadius: 10 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
        h('span', { style: { fontSize: 22 } }, '📋'),
        h('div', { style: { flex: 1 } },
          h('div', { style: { fontSize: 10, color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'Teacher Rubric Grading'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 2 } },
            humanUids.length + ' human delegate' + (humanUids.length !== 1 ? 's' : '') + ' · 5 domains · 4-point scale · scores are editable'
          )
        ),
        h('div', { style: { display: 'flex', gap: 6 } },
          h('button', {
            onClick: gradeAll,
            style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
          }, '🤖 AI-grade all'),
          anyGraded && h('button', {
            onClick: exportCsv,
            style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: '#10b981', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
          }, '📥 Export CSV')
        )
      ),

      h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        humanUids.map(function(uid) {
          var iso = assigned[uid]; var country = countryById(iso); if (!country) return null;
          var roster = (sessionState && sessionState.roster) || {};
          var name = roster[uid] ? roster[uid].name : (uid === 'me' ? 'You' : uid);
          var r = grades[uid];
          var isLoading = !!loading[uid];

          return h('div', {
            key: uid,
            style: { padding: 10, background: 'rgba(0,0,0,0.18)', border: '1px solid #334155', borderRadius: 8 }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: r ? 8 : 0 } },
              h('span', { style: { fontSize: 20 } }, country.flag),
              h('div', { style: { flex: 1 } },
                h('div', { style: { fontWeight: 700, fontSize: 13 } }, country.name),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, name)
              ),
              !r && !isLoading && h('button', {
                onClick: function() { gradeOne(uid); },
                style: { padding: '6px 12px', fontSize: 11, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }
              }, '🤖 Grade'),
              isLoading && h('span', { style: { fontSize: 11, color: '#c4b5fd', fontStyle: 'italic' } }, '⏳ Grading…'),
              r && r.overall && h('div', {
                style: {
                  padding: '4px 10px', fontSize: 11, fontWeight: 800,
                  background: r.overall.score >= 4 ? '#10b981' : r.overall.score >= 3 ? '#0ea5e9' : r.overall.score >= 2 ? '#fbbf24' : '#ef4444',
                  color: '#fff', borderRadius: 999
                }
              }, RUBRIC_SCORE_LABELS[r.overall.score] + ' (' + r.overall.score + '/4)')
            ),

            r && h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 6 } },
              RUBRIC_DOMAINS.map(function(d) {
                var dd = r[d.key];
                if (!dd) return null;
                return h('div', {
                  key: d.key,
                  style: { padding: 8, background: 'rgba(255,255,255,0.04)', borderLeft: '3px solid ' + d.color, borderRadius: 6 }
                },
                  h('div', { style: { fontSize: 10, color: d.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 } },
                    d.icon + ' ' + d.label + (dd.overridden ? ' (edited)' : '')
                  ),
                  h('div', { style: { display: 'flex', gap: 3, marginBottom: 4 } },
                    [1, 2, 3, 4].map(function(s) {
                      var picked = dd.score === s;
                      return h('button', {
                        key: s,
                        onClick: function() { overrideScore(uid, d.key, s); },
                        'aria-label': 'Set ' + d.label + ' to ' + RUBRIC_SCORE_LABELS[s],
                        style: {
                          flex: 1, padding: '3px 0', fontSize: 11, fontWeight: 700,
                          background: picked ? d.color : 'rgba(255,255,255,0.04)',
                          color: picked ? '#fff' : '#94a3b8',
                          border: '1px solid ' + (picked ? d.color : '#475569'),
                          borderRadius: 4, cursor: 'pointer'
                        }
                      }, s);
                    })
                  ),
                  dd.rationale && h('p', { style: { fontSize: 10, color: '#cbd5e1', margin: 0, lineHeight: 1.4 } }, dd.rationale)
                );
              })
            )
          );
        })
      ),

      h('p', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginTop: 10, marginBottom: 0 } },
        '🎯 Scores: 1 Beginning · 2 Developing · 3 Proficient · 4 Advanced. AI suggestions are starting points — your professional judgment is final. Click any number to override.'
      )
    );
  }

  // ═══════════════════════════════════════════
  // BackchannelPanel — private 1:1 diplomatic notes between delegations
  // during the moderated-caucus phase. Real MUN: delegates pass notes in
  // huddles. Here: stored under modelUn.backchannel keyed by msgId; visible
  // only to sender, recipient, and host (moderation role).
  // Capped at 30 messages per session for doc-size budget.
  // ═══════════════════════════════════════════
  function BackchannelPanel(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var updateMUN = props.updateMUN;
    var isHost = props.isHost;
    var isSolo = props.isSolo;
    var sessionState = props.sessionState;

    var assigned = modelUn.assignedCountries || {};
    var backchannel = modelUn.backchannel || {};
    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;

    var openTuple = useState(false);
    var open = openTuple[0];
    var setOpen = openTuple[1];
    var toUidTuple = useState('');
    var toUid = toUidTuple[0];
    var setToUid = toUidTuple[1];
    var textTuple = useState('');
    var text = textTuple[0];
    var setText = textTuple[1];

    if (!myCountry && !isHost) return null;

    // Visible messages: ones where I'm sender OR recipient; or all if host
    var allMsgIds = Object.keys(backchannel);
    var visibleMsgs = allMsgIds.map(function(id) {
      return Object.assign({ id: id }, backchannel[id]);
    }).filter(function(m) {
      if (isHost) return true;
      return m.from === myUid || m.to === myUid;
    }).sort(function(a, b) { return (b.at || 0) - (a.at || 0); }).slice(0, 30);

    var unreadCount = visibleMsgs.filter(function(m) { return m.to === myUid && !m.readBy || (m.readBy && m.readBy.indexOf(myUid) === -1); }).length;

    // Possible recipients: any seated delegate that isn't me
    var recipientOptions = Object.keys(assigned).filter(function(uid) { return uid !== myUid; }).map(function(uid) {
      var iso = assigned[uid]; var c = countryById(iso);
      var isAi = uid.indexOf('ai_') === 0;
      var roster = (sessionState && sessionState.roster) || {};
      var label = (c ? c.flag + ' ' + c.name : iso) + (isAi ? ' 🤖' : '') + (!isAi && roster[uid] ? ' (' + roster[uid].name + ')' : '');
      return { uid: uid, label: label, iso: iso, country: c, isAi: isAi };
    }).filter(function(r) { return !!r.country; });

    function sendMessage() {
      var t = (text || '').trim();
      if (!t || t.length < 3 || !toUid || !myCountry) return;
      var msgId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      var msg = {
        from: myUid,
        fromIso: myIso,
        to: toUid,
        toIso: assigned[toUid],
        text: t.slice(0, 400),
        at: Date.now(),
        readBy: [myUid]
      };
      var nextBc = Object.assign({}, backchannel);
      // Doc budget: keep latest 30 across the whole channel
      var keys = Object.keys(nextBc);
      if (keys.length >= 30) {
        keys.sort(function(a, b) { return (nextBc[a].at || 0) - (nextBc[b].at || 0); });
        delete nextBc[keys[0]];
      }
      nextBc[msgId] = msg;
      updateMUN({ backchannel: nextBc });
      setText('');
      bumpStat('backchannelMessagesSent', 1);
      if (typeof ctx.addToast === 'function') {
        var rec = recipientOptions.filter(function(r) { return r.uid === toUid; })[0];
        ctx.addToast('📬 Note sent to ' + (rec && rec.country ? rec.country.name : 'delegation'));
      }

      // If recipient is AI, queue a short auto-reply (3-9 seconds)
      var rec = recipientOptions.filter(function(r) { return r.uid === toUid; })[0];
      if (rec && rec.isAi && rec.country && agendaById(modelUn.agendaId)) {
        var agenda = agendaById(modelUn.agendaId);
        setTimeout(function() {
          aiGenerateBackchannelReply(ctx, rec.country, agenda, t, myCountry).then(function(reply) {
            if (!reply || !reply.text) return;
            var replyId = 'msg_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
            var nextBc2 = Object.assign({}, modelUn.backchannel || {});
            var keys2 = Object.keys(nextBc2);
            if (keys2.length >= 30) {
              keys2.sort(function(a, b) { return (nextBc2[a].at || 0) - (nextBc2[b].at || 0); });
              delete nextBc2[keys2[0]];
            }
            nextBc2[replyId] = {
              from: toUid, fromIso: rec.iso,
              to: myUid, toIso: myIso,
              text: reply.text, at: Date.now(),
              readBy: [toUid], isAi: true
            };
            updateMUN({ backchannel: nextBc2 });
          }).catch(function() {});
        }, 3000 + Math.floor(Math.random() * 6000));
      }
    }

    return h('div', { style: { marginBottom: 12 } },
      h('div', { style: { padding: 10, background: 'rgba(99,102,241,0.10)', border: '1px solid #6366f1', borderRadius: 8 } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
          h('span', { style: { fontSize: 18 } }, '📬'),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } },
              'Backchannel · ' + visibleMsgs.length + ' note' + (visibleMsgs.length !== 1 ? 's' : '') + (unreadCount > 0 ? ' · ' + unreadCount + ' new' : '')
            ),
            h('div', { style: { fontSize: 11, color: '#cbd5e1', marginTop: 2 } },
              isHost ? 'Moderator view — you see ALL private notes.' : 'Private 1:1 notes between delegations. Only you, the recipient, and the Chair see each note.'
            )
          ),
          h('button', {
            onClick: function() { setOpen(!open); },
            style: { padding: '4px 12px', fontSize: 11, fontWeight: 700, background: open ? '#6366f1' : 'rgba(255,255,255,0.06)', color: open ? '#fff' : '#cbd5e1', border: '1px solid ' + (open ? '#6366f1' : '#475569'), borderRadius: 6, cursor: 'pointer' }
          }, open ? '× Close' : '✉ Open')
        ),

        open && h('div', { style: { marginTop: 10 } },
          // Send form (only for delegates with a country)
          myCountry && !isHost && h('div', { style: { padding: 8, background: 'rgba(0,0,0,0.25)', borderRadius: 6, marginBottom: 8 } },
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 6 } },
              h('select', {
                value: toUid,
                onChange: function(e) { setToUid(e.target.value); },
                'aria-label': 'Recipient delegation',
                style: { flex: 1, padding: 6, fontSize: 12, background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4 }
              },
                h('option', { value: '' }, '— Pick recipient —'),
                recipientOptions.map(function(r) {
                  return h('option', { key: r.uid, value: r.uid }, r.label);
                })
              )
            ),
            h('textarea', {
              value: text,
              onChange: function(e) { setText(e.target.value); },
              placeholder: 'Discreet diplomatic note (e.g., "Will you co-sponsor if we add a sunset clause?")',
              rows: 2,
              style: { width: '100%', padding: 6, fontSize: 12, lineHeight: 1.4, fontFamily: 'inherit', background: 'rgba(255,255,255,0.04)', color: '#e2e8f0', border: '1px solid #475569', borderRadius: 4, resize: 'vertical', boxSizing: 'border-box' }
            }),
            h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 4 } },
              h('span', { style: { fontSize: 10, color: '#94a3b8' } }, text.length + ' / 400'),
              h('button', {
                onClick: sendMessage,
                disabled: !toUid || text.trim().length < 3,
                style: { marginLeft: 'auto', padding: '4px 12px', fontSize: 11, fontWeight: 700, background: (toUid && text.trim().length >= 3) ? '#6366f1' : '#475569', color: '#fff', border: 'none', borderRadius: 4, cursor: (toUid && text.trim().length >= 3) ? 'pointer' : 'not-allowed' }
              }, '✉ Send note')
            )
          ),

          // Messages feed
          h('div', { style: { maxHeight: 280, overflowY: 'auto' } },
            visibleMsgs.length === 0
              ? h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', margin: 0 } }, 'No backchannel notes yet.')
              : visibleMsgs.map(function(m) {
                  var fromCountry = countryById(m.fromIso);
                  var toCountry = countryById(m.toIso);
                  var mine = m.from === myUid;
                  var direction = mine ? 'to ' + (toCountry ? toCountry.flag + ' ' + toCountry.name : m.toIso) : 'from ' + (fromCountry ? fromCountry.flag + ' ' + fromCountry.name : m.fromIso);
                  return h('div', {
                    key: m.id,
                    style: {
                      padding: 8, marginBottom: 6,
                      background: mine ? 'rgba(99,102,241,0.10)' : 'rgba(255,255,255,0.04)',
                      borderLeft: '3px solid ' + (mine ? '#6366f1' : (m.isAi ? '#a855f7' : '#10b981')),
                      borderRadius: 4
                    }
                  },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 3 } },
                      (mine ? 'You · ' : '') + direction + (m.isAi ? ' 🤖' : '') + ' · ' + (m.at ? new Date(m.at).toLocaleTimeString() : '')
                    ),
                    h('p', { style: { fontSize: 12, color: '#e2e8f0', margin: 0, lineHeight: 1.5 } }, m.text)
                  );
                })
          )
        )
      )
    );
  }

  // ═══════════════════════════════════════════
  // AI HELPER — Generate a short diplomatic backchannel reply from an AI
  // delegate. ~20-50 words. Returns { text } or null.
  // ═══════════════════════════════════════════
  function aiGenerateBackchannelReply(ctx, country, agenda, incomingText, senderCountry) {
    if (!ctx || typeof ctx.callGemini !== 'function' || !country || !agenda) return Promise.resolve(null);
    var stance = (country.defaultPositions && country.defaultPositions[agenda.id]) || 'standard diplomatic engagement';
    var prompt = [
      'You are the delegate from ' + country.name + ' in a Model UN moderated caucus.',
      'Your country\'s baseline stance on "' + agenda.title + '": ' + stance,
      '',
      'Another delegation (' + (senderCountry ? senderCountry.name : 'a peer') + ') just passed you this PRIVATE backchannel note:',
      '"' + String(incomingText).slice(0, 400) + '"',
      '',
      'Reply briefly (20-50 words) with diplomatic but direct private-channel tone. You CAN be more candid than in public — backchannels are where deals happen. Either: agree to negotiate, set a condition, decline politely, or counter-propose.',
      '',
      'Return JSON only: { "text": "your reply" }'
    ].join('\n');
    return Promise.resolve(ctx.callGemini(prompt, true)).then(function(result) {
      var raw = typeof result === 'string' ? result : (result && result.text ? result.text : String(result || ''));
      raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var s = raw.indexOf('{'); var e = raw.lastIndexOf('}');
      if (s < 0 || e <= s) return null;
      var parsed; try { parsed = JSON.parse(raw.substring(s, e + 1)); } catch (err) { return null; }
      if (!parsed || typeof parsed.text !== 'string' || parsed.text.length < 5) return null;
      return { text: parsed.text.slice(0, 400) };
    }).catch(function() { return null; });
  }

  function ReplayTimeline(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var modelUn = props.modelUn;
    var assigned = modelUn.assignedCountries || {};

    // Collect events
    var events = [];
    var speeches = modelUn.speeches || {};
    Object.keys(speeches).forEach(function(id) {
      var s = speeches[id];
      var c = countryById(s.country);
      events.push({
        type: 'speech',
        at: s.at || 0,
        label: (c ? c.flag + ' ' + c.name : s.country) + ' speech',
        body: (s.text || '').slice(0, 400),
        color: '#0ea5e9',
        icon: '🎤',
        isAi: !!s.isAi
      });
    });
    var caucusSpeeches = modelUn.caucusSpeeches || {};
    Object.keys(caucusSpeeches).forEach(function(id) {
      var s = caucusSpeeches[id];
      var c = countryById(s.country);
      events.push({
        type: 'caucus',
        at: s.at || 0,
        label: (c ? c.flag + ' ' + c.name : s.country) + ' (caucus)',
        body: (s.text || '').slice(0, 400),
        color: '#fbbf24',
        icon: '⚖️',
        isAi: !!s.isAi
      });
    });
    var clauses = modelUn.clauses || {};
    Object.keys(clauses).forEach(function(id) {
      var cl = clauses[id];
      events.push({
        type: 'clause',
        at: cl.at || cl.proposedAt || 0,
        label: 'Clause proposed — ' + (cl.proposer || 'unknown') + ' (' + (cl.type || 'op') + ')',
        body: (cl.text || '').slice(0, 400),
        color: '#a855f7',
        icon: '📜',
        status: cl.status
      });
    });
    if (modelUn.news && modelUn.news.at) {
      events.push({
        type: 'news',
        at: modelUn.news.at,
        label: '📰 Breaking: ' + (modelUn.news.headline || ''),
        body: modelUn.news.body || '',
        color: '#dc2626',
        icon: '📰'
      });
    }
    if (modelUn.crisisResponse && modelUn.crisisResponse.openedAt) {
      events.push({
        type: 'crisis',
        at: modelUn.crisisResponse.openedAt,
        label: '🚨 Crisis response window opened',
        body: 'Delegates given 90 seconds to react. ' + Object.keys(modelUn.crisisResponse.responses || {}).length + ' responded.',
        color: '#facc15',
        icon: '🚨'
      });
    }
    if (modelUn.voteRevealedAt || modelUn.voteOutcome) {
      events.push({
        type: 'vote',
        at: modelUn.voteRevealedAt || (modelUn.endedAt ? new Date(modelUn.endedAt).getTime() : Date.now()),
        label: '🗳️ Vote: ' + (modelUn.voteOutcome === 'passed' ? 'ADOPTED' : modelUn.voteOutcome === 'failed' ? 'FAILED' : 'CONCLUDED'),
        body: 'Final roll call recorded.',
        color: modelUn.voteOutcome === 'passed' ? '#10b981' : '#dc2626',
        icon: '🗳️'
      });
    }
    events = events.filter(function(e) { return e.at > 0; }).sort(function(a, b) { return a.at - b.at; });

    var selectedTuple = useState(null);
    var selected = selectedTuple[0];
    var setSelected = selectedTuple[1];

    if (events.length === 0) {
      return h('div', { style: { padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 8, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } },
        'No timeline events recorded.'
      );
    }
    var tStart = events[0].at;
    var tEnd = events[events.length - 1].at;
    var span = Math.max(1, tEnd - tStart);
    var durationMin = Math.round(span / 60000);

    return h('div', { style: { padding: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid #334155', borderRadius: 8 } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 } },
        h('div', { style: { fontSize: 10, color: '#7dd3fc', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, '📊 Replay Timeline'),
        h('div', { style: { fontSize: 10, color: '#94a3b8', marginLeft: 'auto' } }, events.length + ' events · ' + durationMin + ' min span')
      ),

      // Track
      h('div', { style: { position: 'relative', height: 40, background: 'rgba(0,0,0,0.25)', borderRadius: 6, marginBottom: 10 } },
        h('div', { style: { position: 'absolute', left: 0, right: 0, top: '50%', height: 2, background: '#334155', transform: 'translateY(-50%)' } }),
        events.map(function(ev, i) {
          var pct = ((ev.at - tStart) / span) * 100;
          var isSel = selected && selected.at === ev.at && selected.label === ev.label;
          return h('button', {
            key: i,
            onClick: function() { setSelected(ev); },
            'aria-label': ev.label,
            title: ev.label,
            style: {
              position: 'absolute', top: '50%', left: pct + '%',
              transform: 'translate(-50%, -50%)',
              width: isSel ? 24 : 18, height: isSel ? 24 : 18,
              padding: 0,
              borderRadius: '50%',
              background: ev.color, color: '#fff',
              border: isSel ? '2px solid #fff' : '2px solid rgba(0,0,0,0.4)',
              fontSize: isSel ? 11 : 9,
              fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: isSel ? 2 : 1
            }
          }, ev.icon);
        })
      ),

      // Selected event detail
      selected && h('div', { style: { padding: 10, background: 'rgba(0,0,0,0.18)', borderLeft: '3px solid ' + selected.color, borderRadius: 6 } },
        h('div', { style: { fontSize: 11, color: selected.color, fontWeight: 700, marginBottom: 4 } },
          selected.icon + ' ' + selected.label + (selected.at ? ' · ' + new Date(selected.at).toLocaleTimeString() : '')
        ),
        selected.body && h('p', { style: { fontSize: 12, color: '#e2e8f0', margin: 0, lineHeight: 1.55, whiteSpace: 'pre-wrap' } }, selected.body)
      ),
      !selected && h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
        'Tap any dot to read that moment.'
      )
    );
  }

  // ═══════════════════════════════════════════
  // DelegateNotes — private per-student note pad. Stored in localStorage
  // keyed by session+user. Never synced to Firestore (private by design).
  // Renders as a collapsible drawer pinned to the bottom-left of any phase.
  // Real MUN: every delegate keeps a notebook. UDL: external memory aid.
  // ═══════════════════════════════════════════
  function DelegateNotes(props) {
    var React = window.React;
    var h = React.createElement;
    var useState = React.useState;
    var useEffect = React.useEffect;
    var ctx = props.ctx;
    var modelUn = props.modelUn;
    var isSolo = props.isSolo;

    var assigned = modelUn.assignedCountries || {};
    var myUid = isSolo ? 'me' : (ctx.userId || null);
    var myIso = myUid ? assigned[myUid] : null;
    var myCountry = myIso ? countryById(myIso) : null;
    if (!myCountry) return null;

    var sessionCode = (ctx.session && ctx.session.code) || 'solo';
    var storageKey = 'mun_notes:' + sessionCode + ':' + myUid;

    var initial = '';
    try { initial = (typeof localStorage !== 'undefined' && localStorage.getItem(storageKey)) || ''; } catch (e) {}

    var notesTuple = useState(initial);
    var notes = notesTuple[0];
    var setNotes = notesTuple[1];
    var openTuple = useState(false);
    var open = openTuple[0];
    var setOpen = openTuple[1];

    useEffect(function() {
      try { if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, notes); } catch (e) {}
    }, [notes]);

    var hasNotes = !!(notes && notes.trim().length > 0);

    return h(React.Fragment, null,
      !open && h('button', {
        onClick: function() { setOpen(true); },
        'aria-label': 'Open private notes',
        style: {
          position: 'fixed', left: 16, bottom: 16, zIndex: 999,
          padding: '10px 14px', fontSize: 12, fontWeight: 700,
          background: hasNotes ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'rgba(217,119,6,0.20)',
          color: hasNotes ? '#fff' : '#fbbf24',
          border: hasNotes ? 'none' : '1px dashed #d97706',
          borderRadius: 999,
          boxShadow: hasNotes ? '0 6px 18px rgba(217,119,6,0.4)' : 'none',
          cursor: 'pointer'
        }
      }, '📓 Private Notes' + (hasNotes ? ' (' + Math.min(99, notes.trim().split(/\s+/).filter(Boolean).length) + 'w)' : '')),

      open && h('div', {
        style: {
          position: 'fixed', left: 16, bottom: 16, zIndex: 999,
          width: 320, maxWidth: 'calc(100vw - 32px)',
          background: '#0f172a', border: '2px solid #d97706', borderRadius: 12,
          padding: 12, color: '#e2e8f0',
          boxShadow: '0 24px 64px rgba(217,119,6,0.4)'
        },
        role: 'region', 'aria-label': 'Private delegate notes'
      },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
          h('span', { style: { fontSize: 18 } }, '📓'),
          h('div', { style: { flex: 1 } },
            h('div', { style: { fontSize: 10, color: '#fcd34d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 } }, 'Private notes'),
            h('div', { style: { fontSize: 11, color: '#cbd5e1' } }, myCountry.flag + ' ' + myCountry.name + ' · only you see this')
          ),
          h('button', {
            onClick: function() { setOpen(false); },
            'aria-label': 'Close notes',
            style: { padding: '4px 8px', fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid #475569', borderRadius: 6, cursor: 'pointer' }
          }, '✕')
        ),
        h('textarea', {
          value: notes,
          onChange: function(e) { setNotes(e.target.value.slice(0, 4000)); },
          placeholder: 'Priorities, allies, talking points, names…\n\nExamples:\n- Push $100B fund\n- Ally with BRA, KEN\n- Watch CHN amendment',
          rows: 10,
          style: { width: '100%', padding: 8, fontSize: 12, lineHeight: 1.5, fontFamily: 'ui-monospace, Menlo, monospace', background: 'rgba(0,0,0,0.25)', color: '#fef3c7', border: '1px solid #b45309', borderRadius: 6, resize: 'vertical', boxSizing: 'border-box' }
        }),
        h('div', { style: { display: 'flex', alignItems: 'center', marginTop: 6, fontSize: 10, color: '#94a3b8' } },
          h('span', null, notes.length + ' / 4000'),
          h('button', {
            onClick: function() {
              if (typeof confirm === 'function' && !confirm('Clear all notes for this session?')) return;
              setNotes('');
            },
            style: { marginLeft: 'auto', padding: '4px 8px', fontSize: 10, fontWeight: 700, background: 'rgba(220,38,38,0.18)', color: '#fca5a5', border: '1px solid #dc2626', borderRadius: 6, cursor: 'pointer' }
          }, 'Clear')
        )
      )
    );
  }

  // Hot-reload guard — re-attach the launcher card data if needed
  if (typeof console !== 'undefined') {
    console.log('[arcade_mode_modelun] Plugin v0.12 loaded — ' + COUNTRIES.length + ' countries, ' + AGENDAS.length + ' agendas, ' + COMMITTEES.length + ' committees, ' + GLOSSARY.length + ' glossary terms.');
  }

})();
