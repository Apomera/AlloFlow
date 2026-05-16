// ═══════════════════════════════════════════════════════
// stem_tool_stewardship.js — Maine Stewardship Campaigns hub
// Cross-campaign launcher and progress dashboard. Surfaces all five
// environmental campaigns (Cultural Mosaic, Conservation Manager,
// Outbreak Response, Watershed Steward, Climate Policy Pathways) as
// one cohesive offering with state inspection, navigation, and
// cross-campaign mastery achievements.
// ═══════════════════════════════════════════════════════

// Defensive StemLab guard
window.StemLab = window.StemLab || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.StemLab.isRegistered && window.StemLab.isRegistered('stewardshipHub'))) {
(function() {
  'use strict';

  // ── Reduced motion CSS ──
  (function() {
    if (document.getElementById('allo-stem-motion-reduce-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-stem-motion-reduce-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    if (document.head) document.head.appendChild(st);
  })();

  // ── The five campaigns and their navigation targets ──
  // Each entry knows how to read its own state out of labToolData and
  // how to navigate the user into the right tool + tab/mode.
  var CAMPAIGNS = [
    {
      id: 'mosaic', label: 'Cultural Mosaic', icon: '🧩', color: '#15803d',
      hostTool: 'fireEcology', toolDataKey: 'fireEcology', stateField: 'mosaic',
      tabField: 'tab', tabValue: 'mosaic',
      scale: '8 years · 7 zones', mechanic: 'Fire-return intervals',
      desc: 'Steward a Wabanaki territory in Maine. Six stewardship techniques, seasonal cycles (Sigwan-Nipon and Toqaq-Pun), and the cultural craft of mosaic burning.',
      yearField: 'year', maxYearsField: 'maxYears', defaultMaxYears: 8,
      outcomeField: 'finalOutcome'
    },
    {
      id: 'conserve', label: 'Conservation Manager', icon: '🌲', color: '#16a34a',
      hostTool: 'ecosystem', toolDataKey: 'ecosystem', stateField: 'conserve',
      tabField: 'tab', tabValue: 'conserve',
      scale: '10 years · 6 species', mechanic: 'Trophic cascades',
      desc: 'Manage a Maine ecosystem across 10 years. Six species with population, habitat, and public support metrics tied together by trophic-cascade feedback rules.',
      yearField: 'year', maxYearsField: 'maxYears', defaultMaxYears: 10,
      outcomeField: 'finalOutcome'
    },
    {
      id: 'outbreak', label: 'Outbreak Response', icon: '🏥', color: '#0ea5e9',
      hostTool: 'epidemicSim', toolDataKey: 'epidemicSim', stateField: 'outbreak',
      tabField: 'tab', tabValue: 'outbreak',
      scale: '26 weeks · 4 demographics', mechanic: 'Trust feedback loops',
      desc: 'You are the County Public Health Officer in Maine. 26 weeks of decisions across four demographic groups, with hospital strain, trust, and vaccine uptake tied together.',
      yearField: 'week', maxYearsField: 'maxWeeks', defaultMaxYears: 26,
      outcomeField: 'finalOutcome'
    },
    {
      id: 'steward', label: 'Watershed Steward', icon: '💧', color: '#0ea5e9',
      hostTool: 'waterCycle', toolDataKey: 'waterCycle', stateField: 'steward',
      tabField: 'wcMode', tabValue: 'steward',     // Water Cycle uses wcMode, not tab
      scale: '10 years · 6 components', mechanic: 'Hydrological cascades',
      desc: 'Watershed Coordinator for a central Maine river system. Six watershed components (headwaters, mainstem, beaver wetlands, buffers, ag, suburban) and 10 years of decisions.',
      yearField: 'year', maxYearsField: 'maxYears', defaultMaxYears: 10,
      outcomeField: 'finalOutcome'
    },
    {
      id: 'pathway', label: 'Climate Policy Pathways', icon: '🗺️', color: '#15803d',
      hostTool: 'climateExplorer', toolDataKey: 'climateExplorer', stateField: 'pathway',
      tabField: 'tab', tabValue: 'pathways',
      scale: '40 years · 6 sectors', mechanic: 'Inter-sector policy feedback',
      desc: 'Maine\'s lead climate strategist, 2025 to 2065 in 5-year periods. Six policy sectors (grid, transport, buildings, working lands, adaptation, justice) tied by feedback rules.',
      yearField: 'year', maxYearsField: 'maxYears', defaultMaxYears: 8,
      outcomeField: 'finalOutcome'
    }
  ];

  // ── Read campaign state out of labToolData ──
  function readCampaignState(labToolData, campaign) {
    var slot = (labToolData && labToolData[campaign.toolDataKey]) || {};
    var state = slot[campaign.stateField];
    if (!state) return { status: 'notStarted', phase: null, year: 0, maxYears: campaign.defaultMaxYears, outcome: null, difficulty: null };
    var phase = state.phase || 'setup';
    var year = state[campaign.yearField] || 0;
    var maxYears = state[campaign.maxYearsField] || campaign.defaultMaxYears;
    var outcome = state[campaign.outcomeField] || null;
    var status;
    if (phase === 'setup') status = 'notStarted';
    else if (phase === 'debrief' && outcome) status = 'complete';
    else status = 'inProgress';
    return { status: status, phase: phase, year: year, maxYears: maxYears, outcome: outcome, difficulty: state.difficulty || null, seed: state.seed || null };
  }

  function statusLabel(status) {
    if (status === 'notStarted') return 'Not started';
    if (status === 'inProgress') return 'In progress';
    if (status === 'complete') return 'Complete';
    return status;
  }
  function statusColor(status) {
    if (status === 'notStarted') return '#64748b';
    if (status === 'inProgress') return '#fbbf24';
    if (status === 'complete') return '#86efac';
    return '#94a3b8';
  }

  // ── Cross-campaign mastery achievements ──
  var STEWARDSHIP_TIERS = [
    { id: 'apprentice',   label: 'Stewardship Apprentice',   minComplete: 1,  icon: '🌱', desc: 'Complete one campaign or scenario.' },
    { id: 'practitioner', label: 'Stewardship Practitioner', minComplete: 3,  icon: '🌿', desc: 'Complete three campaigns or scenarios.' },
    { id: 'regional',     label: 'Regional Specialist',      minComplete: 5,  icon: '🏆', desc: 'Complete five — for example all Maine anchors, or one from each of the five mechanic families.' },
    { id: 'global',       label: 'Cross-Region Steward',     minComplete: 8,  icon: '🌍', desc: 'Complete eight — including cross-region scenarios from at least three mechanic families.' },
    { id: 'multiregion',  label: 'Multi-Region Steward',     minComplete: 12, icon: '🪶', desc: 'Complete twelve — both Maine and at least one cross-region scenario from each of the five mechanic families.' },
    { id: 'grandmaster',  label: 'Stewardship Grandmaster',  minComplete: 15, requireTopTier: true, icon: '🌟', desc: 'Complete all fifteen with top-tier outcomes.' }
  ];

  function isTopTier(outcome) {
    if (!outcome) return false;
    var t = outcome.tier;
    // Each campaign uses a different best-tier label
    return t === 'excellent' || t === 'mastery' || t === 'recovery' || t === 'netzero';
  }

  // ── Cross-campaign synthesis patterns ──
  // Each pattern is a structural insight that shows up across multiple
  // campaigns. When the student has completed 2+ campaigns the panel
  // surfaces the patterns where at least one pair of completed campaigns
  // both participate.
  var SYNTHESIS_PATTERNS = [
    {
      id: 'loadBearingSupport',
      title: 'The "support" metric is load-bearing in every campaign',
      campaigns: ['conserve', 'outbreak', 'steward', 'pathway'],
      insight: 'Public support is not a flavor metric. In Conservation Manager, wolf support gates reintroduction. In Outbreak Response, working-age trust below 40 triggers vaccine refusal. In Watershed Steward, low support stalls dam removal. In Climate Pathways, the entire policy pathway collapses if climate-justice support drops below 40. In every campaign with a population, the social contract is structural to the science.'
    },
    {
      id: 'foundationalEquity',
      title: 'Equity / community is the foundation, not the topping',
      campaigns: ['mosaic', 'conserve', 'outbreak', 'pathway'],
      insight: 'Cultural Mosaic centers Wabanaki stewardship as the primary practice, not as a bolt-on. Conservation Manager makes public support load-bearing for any intervention. Outbreak Response\'s equity-PHO badge requires elderly vaccination AND maintained trust. Climate Pathways has an entire policy sector dedicated to Climate Justice with a feedback rule that drags every other sector down if you neglect it. Equity is upstream of effectiveness, not a moral add-on.'
    },
    {
      id: 'keystoneCascades',
      title: 'Keystone entities trigger cascade effects across the system',
      campaigns: ['conserve', 'steward', 'pathway'],
      insight: 'Wolves suppress deer which lets forests recover (Conservation Manager). Beaver wetlands raise water tables which cool streams which feed brook trout (Watershed Steward). Clean grid unlocks transportation and building electrification (Climate Pathways). One healthy keystone entity changes the math everywhere downstream. Identifying YOUR keystone is the first move in each campaign.'
    },
    {
      id: 'doNothingNotNeutral',
      title: 'Do-nothing is not neutral; it has a trajectory',
      campaigns: ['mosaic', 'conserve', 'outbreak', 'steward', 'pathway'],
      insight: 'Every campaign\'s do-nothing baseline shows a system drift. Mosaic land degrades. Deer hyperabundance ruins habitats. Pandemics burn through populations. Watersheds slip into ag-runoff dominance. Climate sectors decarbonize partially via market forces alone but adaptation and equity collapse. The choice is never "act vs do nothing"; it is "actively steward vs passively allow whatever direction the system already wants to go."'
    },
    {
      id: 'timeLagsMatter',
      title: 'Time lags determine which early moves matter most',
      campaigns: ['mosaic', 'conserve', 'pathway'],
      insight: 'Cultural Mosaic\'s coppice work pays off in basket splints years later. Conservation Manager\'s wolf reintroduction requires 2 to 4 years of habitat protection and support building first. Climate Pathways\' clean grid feedback rule only fires when grid decarb crosses 70, which can take 3 to 4 periods to set up. The campaigns reward strategists who play the long game.'
    },
    {
      id: 'wabanakiSafeFraming',
      title: 'AI features carry the same hard-constrained framing',
      campaigns: ['mosaic', 'conserve', 'outbreak', 'steward', 'pathway'],
      insight: 'The AI Reading feature in every campaign is built with the same hard constraints: never claim to be a Wabanaki person, never claim to be a real practitioner (PHO / wildlife biologist / watershed coordinator / climate strategist), never invent quotes, never invoke sacred or ceremonial claims, never romanticize. The visible disclaimer in every campaign points to Wabanaki-led organizations and agencies for authoritative voice. This is not a code-reuse pattern; it is a deliberate stance about who has authority to speak about real people and real practice.'
    }
  ];

  // ════════════════════════════════════════════════════════════
  // ── Scenarios Library: non-Maine case studies, fully playable ──
  // ════════════════════════════════════════════════════════════
  // Each family (fire/conservation/outbreak/watershed/climate) has
  // a Maine anchor (the original hosted-tool campaign above) PLUS
  // 1+ self-contained scenarios that play INSIDE the hub. The hub
  // owns scenario state, so we don't touch the 5 host tools.
  //
  // Scenario play model: linear sequence of 4-5 decisions, each
  // option mutates entity values, final state → outcome tier.
  // Same pedagogical spine as the Maine campaigns, smaller scale.
  // ════════════════════════════════════════════════════════════

  var FAMILY_COLORS = {
    fire:        { primary: '#15803d', accent: '#86efac', label: 'Fire stewardship',     mechanic: 'Fire-return intervals' },
    conservation:{ primary: '#16a34a', accent: '#86efac', label: 'Wildlife conservation', mechanic: 'Trophic cascades' },
    outbreak:    { primary: '#0ea5e9', accent: '#7dd3fc', label: 'Public health',        mechanic: 'Trust feedback loops' },
    watershed:   { primary: '#0ea5e9', accent: '#7dd3fc', label: 'Watershed restoration', mechanic: 'Hydrological cascades' },
    climate:     { primary: '#15803d', accent: '#86efac', label: 'Climate policy',       mechanic: 'Inter-sector feedback' }
  };

  // ── Map each Maine anchor campaign into a family for grouping ──
  var CAMPAIGN_FAMILY = {
    mosaic:   'fire',
    conserve: 'conservation',
    outbreak: 'outbreak',
    steward:  'watershed',
    pathway:  'climate'
  };

  // ── Tier thresholds for self-contained scenarios ──
  // Average entity score across all entities → tier
  function scenarioTierFromAvg(avg) {
    if (avg >= 78) return { tier: 'mastery',  label: 'Mastery outcome',   color: '#a855f7', icon: '🌟', desc: 'Every entity in the system reached a healthy stable state. Top-tier outcome.' };
    if (avg >= 62) return { tier: 'strong',   label: 'Strong stewardship', color: '#86efac', icon: '🌿', desc: 'Most entities recovered well. A few have unresolved tension you would address in a real follow-up plan.' };
    if (avg >= 45) return { tier: 'mixed',    label: 'Mixed outcome',     color: '#fbbf24', icon: '🌾', desc: 'Some entities recovered, others stalled. The system is stable but not flourishing.' };
    if (avg >= 28) return { tier: 'stressed', label: 'Stressed system',   color: '#f97316', icon: '🍂', desc: 'Significant unresolved damage across the system. Recovery is possible but will take another cycle of work.' };
    return                  { tier: 'collapse', label: 'System collapse',   color: '#dc2626', icon: '🔥', desc: 'The system passed an irreversible tipping point on your watch. In real life this is the outcome stewards work hardest to avoid.' };
  }

  // ── SCENARIOS LIBRARY ──
  // Each scenario is self-contained: briefing → 4-5 decisions → debrief.
  // Stored in hub.scenarioStates[id]. Counts toward mastery tiers.
  var SCENARIOS_LIBRARY = [
    // ────────────── FIRE FAMILY ──────────────
    {
      id: 'yarralin',
      family: 'fire',
      icon: '🪃',
      region: 'Yarralin community lands · Victoria River District',
      regionFlag: '🇦🇺',
      label: 'Yarralin Mosaic Burns',
      scale: '1 dry season · 5 zones',
      yearLabel: 'Phase',
      color: FAMILY_COLORS.fire.primary,
      shortDesc: 'Karangpurru and Mudburra-Jingili rangers steward mosaic cool burning across spinifex country and floodplains in Australia\'s Top End. Same principle as Wabanaki fire stewardship; vastly different country and seasons.',
      briefing: 'You are working alongside the Yarralin Aboriginal Corporation Indigenous Ranger team in the Victoria River District of Australia\'s Northern Territory, on Karangpurru and Mudburra-Jingili country. The 2024-25 dry season is starting. Without early-dry cool burning, the late dry season brings high-intensity wildfires that strip biodiversity and release stored carbon. With it, the country stays mosaic — patches of recently burned, mid-recovery, and long-unburned ground that support different species. You have 5 zones, 5 phases of the year (Wuwarl / Bowartla / Dudju / Warninbada / Magala), and 4 decisions to make.',
      entities: [
        { id: 'spinifex',   name: 'Spinifex Plain',         icon: '🌾', init: 55, label: 'patchwork health' },
        { id: 'stone',      name: 'Stone Country',          icon: '⛰️', init: 60, label: 'refuge condition' },
        { id: 'floodplain', name: 'Floodplain',             icon: '🦆', init: 50, label: 'wetland mosaic' },
        { id: 'riparian',   name: 'Pandanus Riparian',      icon: '🌿', init: 65, label: 'corridor health' },
        { id: 'community',  name: 'Ranger team capacity',   icon: '🤝', init: 60, label: 'people on country' }
      ],
      decisions: [
        {
          period: 'Wuwarl (early dry, May–June)',
          prompt: 'Country is still moist from the wet season. The window for cool burning is opening. Ranger team can deploy on foot, by quad, or by chopper. What is your priority?',
          options: [
            { id: 'a', label: 'Helicopter mosaic ignition across spinifex plains (efficient, big coverage)', effects: { spinifex: 18, stone: 3, floodplain: 0, riparian: 0, community: -5 }, narrative: 'Aerial ignition lays a strong early-dry mosaic across spinifex. Rangers on ground criticise reliance on helicopters — less learning, more diesel.' },
            { id: 'b', label: 'On-country foot patrols led by senior Karangpurru and Mudburra-Jingili knowledge holders, with rangers learning ignition cues from elders', effects: { spinifex: 10, stone: 8, riparian: 5, community: 18, floodplain: 3 }, narrative: 'Slower coverage, but intergenerational knowledge transfer. Younger rangers learn which grasses, winds, and times signal a cool burn.' },
            { id: 'c', label: 'Skip Wuwarl burning; wait for Bowartla (mid dry) when the team has more capacity', effects: { spinifex: -8, stone: -3, community: 5 }, narrative: 'Country dries out further. The cool-burn window narrows; the late-dry wildfire risk climbs.' }
          ]
        },
        {
          period: 'Bowartla–Dudju (mid to hot dry, July–September)',
          prompt: 'Spinifex is brittle. A neighbouring station accidentally ignites a wildfire that runs 8 km toward your floodplain zone. You can deploy any of:',
          options: [
            { id: 'a', label: 'Direct attack on the fire front with all 6 rangers + state fire service support', effects: { floodplain: 8, community: -10, riparian: 0, spinifex: -2 }, narrative: 'Fire contained at floodplain edge. Rangers exhausted; two weeks of other work pushed back.' },
            { id: 'b', label: 'Back-burn from existing Wuwarl burn scars to starve the fire', effects: { floodplain: 15, spinifex: 5, community: 3, riparian: 5 }, narrative: 'Early-dry mosaic pays off. The wildfire hits a recent cool-burn scar and starves. This is exactly why you burn in Wuwarl.' },
            { id: 'c', label: 'Let it burn; focus rangers on protecting cultural sites in stone country instead', effects: { floodplain: -25, stone: 10, riparian: -10 }, narrative: 'Floodplain takes a hot hit. Cultural sites preserved, but pandanus corridor scorched.' }
          ]
        },
        {
          period: 'Warninbada (build-up, October–November)',
          prompt: 'Air is heating up; storms are building. A national park manager from a neighbouring jurisdiction asks Yarralin rangers to consult on a fire-management plan for their adjoining country. How do you respond?',
          options: [
            { id: 'a', label: 'Decline; ranger team is already stretched and country comes first', effects: { community: 5, spinifex: 0, stone: 0 }, narrative: 'Boundaries held. The park burns hot two months later.' },
            { id: 'b', label: 'Accept under a paid Indigenous knowledge consultancy contract; senior knowledge holders lead, rangers translate', effects: { community: 20, spinifex: 5, stone: 5, riparian: 5, floodplain: 5 }, narrative: 'Income flows back into the ranger program. Cool-burn practice spreads across the jurisdiction. Yarralin rangers gain regional standing.' },
            { id: 'c', label: 'Accept as a free favour; rangers deploy without pay', effects: { community: -12, spinifex: 0 }, narrative: 'Goodwill burned. Ranger team has less capacity for own-country work next dry season.' }
          ]
        },
        {
          period: 'Magala (late wet, January–February)',
          prompt: 'Wet season has come. Country is greening. The team is debriefing what worked. NAILSMA and the Indigenous Land and Sea Corporation want to know what to fund for next year. What do you ask for?',
          options: [
            { id: 'a', label: 'More helicopter hours for next dry season', effects: { spinifex: 5, community: -5 }, narrative: 'Capacity up. Knowledge transfer flat. The program leans more on contractors.' },
            { id: 'b', label: 'A two-year intergenerational ranger training program: elders teaching younger Karangpurru and Mudburra-Jingili rangers full seasonal cycle', effects: { community: 25, spinifex: 8, stone: 8, riparian: 8, floodplain: 8 }, narrative: 'Funded. The Yarralin ranger team becomes a multi-generational institution, not just a project.' },
            { id: 'c', label: 'New ranger station infrastructure (vehicles, satellite comms, refuge huts)', effects: { community: 10, spinifex: 3, stone: 3 }, narrative: 'Better tools. The team is faster but still small.' }
          ]
        }
      ],
      synthesis: 'Yarralin and Wabanaki mosaic stewardship are the same practice on opposite sides of the world. Both interrupt the wildfire-fuel-accumulation cycle with low-intensity patchwork fire. Both center Indigenous knowledge as primary, not consultative. Both treat fire as a relationship, not a tool. The differences (spinifex vs blueberry barrens; Wuwarl vs Sigwan-Nipon; helicopters vs hand-tools) are local adaptations of one universal pattern: the people who lived with this country for tens of thousands of years know the cool-burn windows the climate models are only now confirming.',
      sources: [
        'Yarralin Aboriginal Corporation',
        'North Australian Indigenous Land and Sea Management Alliance (NAILSMA)',
        'Indigenous Land and Sea Corporation (ILSC)',
        'CSIRO Northern Australia · Tropical Savanna Fire Project',
        'Russell-Smith et al., "Bushfires Down Under" (2007)',
        'West Arnhem Land Fire Abatement (WALFA) program documentation'
      ],
      aiDisclaimer: 'AI scenario coach for teaching. Not a Karangpurru or Mudburra-Jingili person, not a Yarralin ranger, not NAILSMA staff. Real authority belongs to the cited organisations and the senior knowledge holders on country.'
    },

    // ────────────── CONSERVATION FAMILY ──────────────
    {
      id: 'yellowstone',
      family: 'conservation',
      icon: '🐺',
      region: 'Greater Yellowstone Ecosystem · Wyoming/Montana/Idaho',
      regionFlag: '🇺🇸',
      label: 'Yellowstone Wolf Restoration',
      scale: '30 years · 5 entities',
      yearLabel: 'Period',
      color: FAMILY_COLORS.conservation.primary,
      shortDesc: 'In 1995, 14 wolves from Jasper National Park were released into Lamar Valley after a 70-year absence. You are coordinating the recovery across NPS, USFWS, state agencies, and ranching communities. Textbook trophic cascade case.',
      briefing: 'January 12, 1995: 14 gray wolves from Jasper National Park, Canada, arrive at Yellowstone\'s Crystal Bench acclimation pen. They are the first wolves on the landscape since the federal government finished exterminating them in 1926. You are now the lead recovery coordinator for the next 30 years (1995–2025), working across the National Park Service, US Fish and Wildlife Service, three state wildlife agencies, ranching communities, and tribal nations. Your job: re-establish the trophic cascade Aldo Leopold described in "Thinking Like a Mountain" — and keep it intact through ESA delisting, lawsuits, livestock conflicts, and political reversals.',
      entities: [
        { id: 'wolf',     name: 'Gray Wolf packs',       icon: '🐺', init: 14, label: 'pack health' },
        { id: 'elk',      name: 'Elk herd pressure',     icon: '🦌', init: 88, label: 'overgrazing — INVERTED: lower is better' },
        { id: 'willow',   name: 'Riparian willows',      icon: '🌳', init: 22, label: 'regrowth' },
        { id: 'beaver',   name: 'Beaver colonies',       icon: '🦫', init: 8,  label: 'wetland building' },
        { id: 'support',  name: 'Rancher / public trust',icon: '🤝', init: 40, label: 'social license' }
      ],
      entityInverted: { elk: true }, // higher is worse for elk pressure
      decisions: [
        {
          period: '1995–2000 · Reintroduction',
          prompt: 'First five years. Wolves are still federally protected. Livestock losses are visible but small (~50 head/year regionally). Ranchers are organising politically. What is your top priority?',
          options: [
            { id: 'a', label: 'Build a robust state + private livestock-compensation program (Defenders of Wildlife model) and personally meet with ranching families', effects: { support: 28, wolf: 5, elk: -5 }, narrative: 'Trust capital built early. Ranchers grudging but engaged. The "Wolves Eat Cattle" narrative loses some ground.' },
            { id: 'b', label: 'Enforce ESA protections aggressively. Prosecute every illegal kill. Litigate state pushback.', effects: { wolf: 22, support: -22, elk: -8 }, narrative: 'Wolf population grows fast. Political backlash brewing. Several state legislators introduce anti-wolf bills.' },
            { id: 'c', label: 'Focus on corridor protection between Yellowstone and Glacier so wolves disperse naturally; minimal intervention', effects: { wolf: 12, elk: -8, willow: 6, support: -5 }, narrative: 'Wolves spread further but the political and social work falls behind the biology.' }
          ]
        },
        {
          period: '2000–2010 · Cascade emerging',
          prompt: 'Elk numbers are dropping. Wolf packs are stable. Researchers notice willows recovering along streams for the first time in 70 years. Beavers are slowly returning. State wildlife agencies want to delist the wolf. What do you support?',
          options: [
            { id: 'a', label: 'Push for delisting + state management with strict quota caps and federal oversight', effects: { support: 18, wolf: -8, willow: 8, beaver: 5, elk: 5 }, narrative: 'States gain authority. Hunting quotas kick in. Wolf numbers stabilise; cascade continues but slower.' },
            { id: 'b', label: 'Oppose delisting; wolves are not yet recovered in adjacent ranges', effects: { wolf: 15, support: -18, willow: 10, beaver: 6 }, narrative: 'Wolves keep growing. Rural communities feel ignored. ESA litigation enters a decade-long phase.' },
            { id: 'c', label: 'Negotiate a "soft delisting" — federal endangered status removed but mandatory federal monitoring continues for 10 years', effects: { wolf: 8, support: 12, willow: 8, beaver: 5, elk: -3 }, narrative: 'A middle path. Both sides grumble. Cascade continues. State agencies build internal capacity.' }
          ]
        },
        {
          period: '2010–2018 · The cascade catches',
          prompt: 'Aspen and cottonwood are returning. Songbird species counts have doubled along riparian corridors. But three states are hosting public hunts. A 2014 study shows the cascade is real but uneven — works in Lamar Valley, less in Hayden Valley. What now?',
          options: [
            { id: 'a', label: 'Invest in long-term research stations across all valleys; publish openly; refuse to spin uneven results', effects: { willow: 10, beaver: 12, support: 8, wolf: 0 }, narrative: 'The science gets cleaner. Honest reporting builds trust with ranchers AND scientists. The cascade is now textbook.' },
            { id: 'b', label: 'Emphasise the Lamar Valley results in public communication; downplay Hayden complications', effects: { support: -8, wolf: 0, willow: 5, beaver: 5 }, narrative: 'Short-term win. Long-term credibility cost. A 2017 Nature retraction-watch piece flags methodological cherry-picking.' },
            { id: 'c', label: 'Shift focus from wolves to beavers as a "second keystone" — fund beaver dam analogue projects across the watershed', effects: { beaver: 22, willow: 12, support: 5 }, narrative: 'A whole new ecological intervention emerges. Beaver-based stream restoration spreads beyond Yellowstone.' }
          ]
        },
        {
          period: '2018–2025 · Politics swing',
          prompt: 'A new federal administration delists wolves across the lower 48 (2020). Idaho passes a law authorising 90% wolf reduction. Montana removes wolf hunt quotas. The cascade is at risk. What is your move?',
          options: [
            { id: 'a', label: 'Coordinate with tribal nations (Crow, Northern Cheyenne, Confederated Salish and Kootenai) on tribal-land wolf refuges', effects: { wolf: 18, support: 15, willow: 8, beaver: 8 }, narrative: 'Tribal sovereignty creates protected zones the states cannot touch. Wolves persist. Long-term partnership formed.' },
            { id: 'b', label: 'Sue. Litigate every state action. Mobilise national environmental groups.', effects: { wolf: 8, support: -22, willow: 5 }, narrative: 'Some legal wins, but the political polarisation around wolves deepens. Rural community trust erodes further.' },
            { id: 'c', label: 'Accept the political reset; focus all remaining effort on monitoring and education so the next reintroduction (Colorado, 2024) inherits good data', effects: { wolf: -8, support: 18, willow: 0, beaver: 3 }, narrative: 'Yellowstone wolf numbers drop. But Colorado\'s 2024 reintroduction succeeds with cleaner public engagement, citing Yellowstone lessons learned.' }
          ]
        }
      ],
      synthesis: 'Yellowstone is the most-cited trophic cascade in conservation biology and the most-contested wildlife policy in American politics. The biology is unambiguous: wolves came back, elk redistributed, willows regrew, beavers returned, songbirds returned. The politics are unresolved: 30 years in, every state still fights about who owns wolf management. Aldo Leopold wrote "Thinking Like a Mountain" in 1949 after watching a mother wolf die — and recognising he had spent a career being wrong about predators. Yellowstone is the proof, at landscape scale, that he was right.',
      sources: [
        'Yellowstone Wolf Project (National Park Service)',
        'US Fish and Wildlife Service · Mountain-Prairie Region',
        'Aldo Leopold, "Thinking Like a Mountain" in A Sand County Almanac (1949)',
        'Cristina Eisenberg, "The Wolf\'s Tooth: Keystone Predators, Trophic Cascades, and Biodiversity" (2010)',
        'Doug Smith et al., annual NPS Wolf Project reports',
        'Beschta and Ripple, "Wolves and the Ecology of Fear" Bioscience (2004)',
        'Defenders of Wildlife livestock compensation program documentation'
      ],
      aiDisclaimer: 'AI scenario coach. Not an NPS biologist, USFWS officer, state wildlife manager, rancher, or tribal nation representative. For real expertise consult the cited organizations.'
    },

    // ────────────── OUTBREAK FAMILY ──────────────
    {
      id: 'mumbai',
      family: 'outbreak',
      icon: '🦟',
      region: 'Greater Mumbai · Maharashtra, India',
      regionFlag: '🇮🇳',
      label: 'Monsoon Dengue Response',
      scale: '20 weeks · 4 demographics',
      yearLabel: 'Phase',
      color: FAMILY_COLORS.outbreak.primary,
      shortDesc: 'You are a public health officer in the Brihanmumbai Municipal Corporation during a monsoon dengue surge. 4 demographics, multilingual communication, mobile clinics, monsoon water-vector pressure. Different scale, same trust mechanics as Maine.',
      briefing: 'You are a public health officer in the Brihanmumbai Municipal Corporation (BMC), the public-health agency for greater Mumbai (population 20 million). It is the start of the 2024 monsoon season. Dengue cases are doubling weekly. Aedes aegypti mosquitoes breed in standing water — and the city is full of it. You have 20 weeks until the monsoon ends and the vector pressure drops. Four demographic groups, each with different trust dynamics, different language preferences, different exposure profiles, and different relationships with the BMC.',
      entities: [
        { id: 'slum',     name: 'Slum-resident families',  icon: '🏚️', init: 28, label: 'health + trust' },
        { id: 'middle',   name: 'Urban middle class',      icon: '🏢', init: 55, label: 'health + trust' },
        { id: 'migrant',  name: 'Migrant labour',          icon: '🚚', init: 22, label: 'health + access' },
        { id: 'workers',  name: 'Healthcare workers',      icon: '🩺', init: 60, label: 'capacity + morale' }
      ],
      decisions: [
        {
          period: 'Weeks 1–5 · Surveillance',
          prompt: 'Cases are doubling. Cluster mapping shows hot spots in Dharavi (slum), Bandra (middle class), Vasai-Virar fringe (migrant labour camps). Your team has limited capacity. What do you fund first?',
          options: [
            { id: 'a', label: 'Larvicide spraying campaign in middle-class areas where political pressure is highest', effects: { middle: 18, slum: -8, migrant: -8, workers: 0 }, narrative: 'Middle-class case counts drop. Slum and migrant clusters explode. Trust collapses where it was already thinnest.' },
            { id: 'b', label: 'Community health workers in Dharavi, Marathi/Hindi/Urdu/Bhojpuri outreach, mobile clinics in migrant camps', effects: { slum: 22, migrant: 20, workers: -5, middle: 5 }, narrative: 'Cases drop in highest-risk demographics. Middle-class media complains. CHW network strained but mobilised.' },
            { id: 'c', label: 'Centralised hospital expansion: more beds, more IV fluids, more critical care', effects: { workers: 12, slum: 5, middle: 8, migrant: 3 }, narrative: 'Severe cases survive. Prevention lags. The system manages downstream consequences, not upstream causes.' }
          ]
        },
        {
          period: 'Weeks 6–10 · Vector control',
          prompt: 'Monsoon at peak. Standing water everywhere. Local landlords are refusing to clean overflow tanks (a known mosquito source). What is your enforcement strategy?',
          options: [
            { id: 'a', label: 'BMC inspectors with fining power; coordinate with media for public shaming of repeat-offender landlords', effects: { slum: 12, middle: 8, migrant: 5, workers: 5 }, narrative: 'Enforcement bites. Landlord lobby pushes back. A few high-profile fines change behaviour citywide.' },
            { id: 'b', label: 'Voluntary "blue dot" campaign: households mark cleaned tanks with paint; community pride, no fines', effects: { slum: 15, middle: 12, migrant: -3 }, narrative: 'Strong middle-class uptake. Migrant communities (rented, transient) cannot participate meaningfully.' },
            { id: 'c', label: 'Partner with SEWA (Self-Employed Women\'s Association) to pay community women as tank-cleaning auditors', effects: { slum: 22, migrant: 12, workers: 5, middle: 5 }, narrative: 'Income flows to women who already know every household. Tank-clean rates climb 40%. SEWA reports widely.' }
          ]
        },
        {
          period: 'Weeks 11–15 · The surge',
          prompt: 'A second wave of severe dengue (hemorrhagic) hits. Hospital ICU beds in Dharavi-adjacent wards are at 130% capacity. Healthcare workers are striking over pay and conditions. What is your move?',
          options: [
            { id: 'a', label: 'Cross-subsidy: redirect ICU beds from private hospitals via the BMC emergency-powers ordinance', effects: { workers: 8, slum: 12, migrant: 12, middle: -10 }, narrative: 'Private hospitals furious. ICU access opens for the underserved. Lawsuits filed.' },
            { id: 'b', label: 'Triple healthcare-worker hazard pay + meals + transport for monsoon duration', effects: { workers: 28, slum: 8, middle: 5, migrant: 5 }, narrative: 'Strike ends. Morale recovers. Budget overruns flagged for next-year audit.' },
            { id: 'c', label: 'Decline the strike demands; deploy state-government medical interns to plug gaps', effects: { workers: -22, slum: -8, migrant: -10 }, narrative: 'Interns inexperienced. Care quality drops. Healthcare worker trust collapses for next outbreak too.' }
          ]
        },
        {
          period: 'Weeks 16–20 · Tail and learning',
          prompt: 'Monsoon ending. Cases falling. The press wants a "victory" story. The Lancet South Asia wants your data. What do you publish?',
          options: [
            { id: 'a', label: 'Full open-data release including ALL demographic breakdowns, including the slum/migrant case spikes', effects: { slum: 12, migrant: 10, middle: 5, workers: 8 }, narrative: 'Honest reporting. Some political cost. Lancet piece becomes a methodological reference for South Asian urban outbreak response.' },
            { id: 'b', label: 'A "BMC success story" press release focused on overall case-trajectory; ICU bottlenecks framed as resolved', effects: { middle: 8, workers: -5, slum: -8, migrant: -8 }, narrative: 'Short-term political win. Long-term institutional learning lost. Next monsoon, same gaps.' },
            { id: 'c', label: 'Independent academic audit (Tata Institute of Social Sciences) of BMC response, full disclosure, published in 6 months', effects: { slum: 8, migrant: 8, middle: 8, workers: 12 }, narrative: 'Slower process. Deeper learning. Reforms move forward across multiple departments.' }
          ]
        }
      ],
      synthesis: 'Mumbai and rural Maine outbreak response operate on the same trust mechanic at vastly different scale. In both, the equity-PHO badge requires that the most-vulnerable demographic receives the most-targeted intervention AND that trust is maintained, not just outcomes. In both, the political ease of an aggressive media response trades against the long-term cost of suppressed honest reporting. The dengue vector is Aedes aegypti, monsoon water, and dense crowded housing; the underlying social physics — multilingual outreach, community health workers, transparent data — is identical.',
      sources: [
        'Brihanmumbai Municipal Corporation Public Health Department',
        'World Health Organization · South-East Asia Regional Office',
        'The Lancet · Regional Health Southeast Asia',
        'Self-Employed Women\'s Association (SEWA)',
        'Tata Institute of Social Sciences · Centre for Health and Mental Health',
        'Indian Council of Medical Research · National Institute of Virology',
        'Gupta and Pattanayak, "Climate Change and Vector-Borne Disease in South Asia" (2019)'
      ],
      aiDisclaimer: 'AI scenario coach. Not a BMC officer, ICMR researcher, SEWA worker, or a person who lives in any of the demographics named. For real expertise consult the cited organisations and Marathi/Hindi/Urdu-language local journalism.'
    },

    // ────────────── WATERSHED FAMILY ──────────────
    {
      id: 'klamath',
      family: 'watershed',
      icon: '🐟',
      region: 'Klamath River Basin · Oregon / California',
      regionFlag: '🇺🇸',
      label: 'Klamath River Restoration',
      scale: '10 years · 6 components',
      yearLabel: 'Year',
      color: FAMILY_COLORS.watershed.primary,
      shortDesc: 'Largest dam removal in US history (4 dams, 2023-24). You coordinate restoration across Yurok, Karuk, Klamath Tribes, agricultural water users, and federal agencies, with salmon recovery as the load-bearing outcome.',
      briefing: 'The Klamath River drains 16,000 square miles across Oregon and California. Four hydroelectric dams (Iron Gate, Copco 1, Copco 2, JC Boyle) have blocked salmon from 400 miles of historic habitat since the early 1900s. After 20+ years of advocacy led primarily by the Yurok Tribe, Karuk Tribe, and Klamath Tribes, the 2020 settlement authorises removal — the largest dam-removal project in US history. You are now the restoration coordinator working with Klamath River Renewal Corporation (KRRC), the tribes, US Bureau of Reclamation, agricultural water-rights holders in the Klamath Project, and Pacific Coast salmon fishery groups. The dams come out in 2023-24. You have 10 years.',
      entities: [
        { id: 'upper',    name: 'Upper Klamath Lake',      icon: '💧', init: 38, label: 'water quality' },
        { id: 'mainstem', name: 'Mainstem Klamath',        icon: '🌊', init: 28, label: 'fish passage + flow' },
        { id: 'salmon',   name: 'Salmon runs',             icon: '🐟', init: 18, label: 'returns' },
        { id: 'tribal',   name: 'Tribal fisheries',        icon: '🪶', init: 30, label: 'access + cultural use' },
        { id: 'ag',       name: 'Klamath Project ag',      icon: '🌾', init: 50, label: 'water access' },
        { id: 'estuary',  name: 'Coastal estuary',         icon: '🦀', init: 35, label: 'ecosystem health' }
      ],
      decisions: [
        {
          period: 'Year 1–2 · Pre-removal',
          prompt: 'Dams scheduled for removal. 15 million cubic yards of sediment behind the reservoirs is the central technical worry. Tribal communities are excited but cautious. Ag is nervous. What do you prioritize?',
          options: [
            { id: 'a', label: 'Pre-removal sediment characterization and downstream-impact modelling, with tribal monitors paid as co-leads', effects: { tribal: 18, mainstem: 12, salmon: 5, estuary: 8 }, narrative: 'Models clarify sediment risks. Tribal sovereignty over monitoring builds long-term trust. The plan tightens.' },
            { id: 'b', label: 'Fast-track removal on the political timeline; manage sediment as it comes', effects: { mainstem: -12, salmon: -8, estuary: -10, tribal: 5 }, narrative: 'Iron Gate comes out. Sediment plume in 2024 is severe. Short-term fish mortality high. Long-term recovery delayed.' },
            { id: 'c', label: 'Sequential removal: Copco first (smallest reservoir, smallest plume), then Iron Gate after 1-year sediment assessment', effects: { mainstem: 8, salmon: 8, estuary: 5, tribal: 12 }, narrative: 'Slower but safer. Sediment plume smaller. Salmon survive the first season. Tribal advisors vindicated.' }
          ]
        },
        {
          period: 'Year 3–4 · The dams come out',
          prompt: 'Dams gone. Salmon are running upstream for the first time in 100 years. But Klamath Project irrigators face a drought-year water cutback. Settled water-rights litigation is exploding. Where do you stand?',
          options: [
            { id: 'a', label: 'Defend tribal water rights as senior; cuts fall on Project agriculture under the 2013 adjudication framework', effects: { tribal: 22, salmon: 15, ag: -25, mainstem: 8 }, narrative: 'Law upheld. Salmon get water. Ranching families furious; political backlash builds in eastern Oregon.' },
            { id: 'b', label: 'Negotiate a temporary drought-emergency settlement: federal water-banking funding + ag transition to dryland farming for some parcels', effects: { tribal: 12, ag: 5, salmon: 8, upper: 5 }, narrative: 'Slow build of trust. Some ranchers transition; others sue. Federal funding becomes the political glue.' },
            { id: 'c', label: 'Prioritize ag through emergency water reallocation; tribal water deferred for one drought year', effects: { ag: 18, tribal: -28, salmon: -15, mainstem: -10 }, narrative: 'Tribal sovereignty violated. Lawsuits filed. Salmon returns crash. The 20 years of advocacy unravel publicly.' }
          ]
        },
        {
          period: 'Year 5–7 · Recovery',
          prompt: 'Salmon are spawning in tributaries unblocked for the first time in a century. But Upper Klamath Lake is suffering severe algal blooms from agricultural nutrient runoff. The estuary is recovering slowly. What is your move?',
          options: [
            { id: 'a', label: 'Fund Upper Klamath wetland restoration on former agricultural land; willing-seller program with the Klamath Tribes', effects: { upper: 25, salmon: 8, tribal: 15, ag: -5 }, narrative: 'Lake quality climbs. The Klamath Tribes regain wetland access. A 30-year nutrient problem starts to reverse.' },
            { id: 'b', label: 'Estuary-focused: kelp forest restoration, eelgrass replanting, coastal salmon-rearing pen sites', effects: { estuary: 22, salmon: 12, tribal: 8 }, narrative: 'Coastal ecosystem responds. Estuary salmon survival climbs. Upper basin nutrient issue continues.' },
            { id: 'c', label: 'Mainstem habitat work: pool-and-riffle restoration, shade plantings, side-channel reconnection', effects: { mainstem: 22, salmon: 18, upper: 0 }, narrative: 'Mid-river habitat thrives. Salmon returns increase faster than projected.' }
          ]
        },
        {
          period: 'Year 8–10 · Institutionalise',
          prompt: 'Project is on track for the most successful dam-removal in history. Permanent stewardship structure now needed. What do you support?',
          options: [
            { id: 'a', label: 'Tribally-led co-management authority (Yurok, Karuk, Klamath Tribes lead; federal agencies advise)', effects: { tribal: 28, salmon: 18, mainstem: 12, upper: 10, estuary: 8 }, narrative: 'Sovereignty institutionalised. The Klamath becomes the national model for Indigenous-led watershed governance.' },
            { id: 'b', label: 'A federal-state-tribal partnership council with rotating chairmanship', effects: { tribal: 12, salmon: 8, ag: 5, mainstem: 5 }, narrative: 'Balanced governance. Decisions slower; politically more durable across administrations.' },
            { id: 'c', label: 'Hand off to existing federal agency (US Bureau of Reclamation) with tribal consultation requirements', effects: { tribal: -10, salmon: 0, ag: 8 }, narrative: 'Tribal voice present but not load-bearing. Subject to political swings of federal administration.' }
          ]
        }
      ],
      synthesis: 'Klamath and central-Maine watershed restoration share the same hydrological cascade physics (flow → habitat → keystone fish → cultural fishery), but Klamath\'s dam-removal scale, water-rights complexity, and tribal-led advocacy timeline make it the most ambitious watershed restoration in US history. The lesson the Maine campaign teaches abstractly — that tribal nations and watershed councils are upstream of every other intervention — Klamath teaches concretely. The Yurok, Karuk, and Klamath Tribes did not get the dams removed by asking nicely; they led 20+ years of organising. Restoration is what comes after, and only because of, that work.',
      sources: [
        'Yurok Tribe (yuroktribe.org)',
        'Karuk Tribe Department of Natural Resources',
        'The Klamath Tribes (klamathtribes.org)',
        'Klamath River Renewal Corporation (klamathrenewal.org)',
        'US Bureau of Reclamation · Klamath Basin Area Office',
        'NOAA Fisheries West Coast · Klamath Basin recovery plan',
        'Atlantic Salmon Federation · Pacific Salmon Foundation comparative reports',
        'Robert Lackey, "Salmon 2100" Oregon State University Press (2006)'
      ],
      aiDisclaimer: 'AI scenario coach. Not a Yurok, Karuk, or Klamath Tribes member, not a KRRC engineer, not a Bureau of Reclamation officer, not an irrigator. For real authority consult the cited tribes and agencies directly.'
    },

    // ────────────── CLIMATE FAMILY ──────────────
    {
      id: 'atoll',
      family: 'climate',
      icon: '🏝️',
      region: 'Marshall Islands · Republic of the Marshall Islands',
      regionFlag: '🇲🇭',
      label: 'Atoll Climate Adaptation',
      scale: '30 years · 6 sectors',
      yearLabel: 'Period',
      color: FAMILY_COLORS.climate.primary,
      shortDesc: 'Republic of the Marshall Islands, 2025–2055. Sea-level rise existential. Migration as policy lever. International climate finance is the budget. Different stakes, same inter-sector feedback mechanics as Maine.',
      briefing: 'You are advising the Office of Environment, Planning and Policy Coordination of the Republic of the Marshall Islands (RMI), a Pacific atoll nation of 60,000 people spread across 29 low-lying coral atolls averaging 2 meters above sea level. IPCC projects 0.6–1.0m of sea-level rise by 2100 under SSP2-4.5. The RMI government adopted "we are not drowning, we are fighting" as national framing in 2017. You are working out the next 30 years (2025–2055) in six 5-year periods across six policy sectors. International climate finance is your central budget tool. Migration is a policy lever, not just a consequence.',
      entities: [
        { id: 'coast',     name: 'Coastal protection',      icon: '🌊', init: 32, label: 'shoreline resilience' },
        { id: 'water',     name: 'Freshwater (lens aquifer)', icon: '💧', init: 40, label: 'aquifer health' },
        { id: 'food',      name: 'Food security',           icon: '🥥', init: 45, label: 'local sufficiency' },
        { id: 'economy',   name: 'Economy + tourism',       icon: '🏖️', init: 38, label: 'GDP + diversification' },
        { id: 'migration', name: 'Migration pathway',       icon: '✈️', init: 50, label: 'Compact-of-Free-Association access + diaspora connection' },
        { id: 'finance',   name: 'Climate finance',         icon: '🌍', init: 42, label: 'international commitment + sovereignty' }
      ],
      decisions: [
        {
          period: '2025–2030',
          prompt: 'First five years. Adaptation budget is $50M/year from a mix of US Compact funds, Green Climate Fund grants, and bilateral agreements. Where do you spend the first wave?',
          options: [
            { id: 'a', label: 'Hard coastal infrastructure: seawalls, reef restoration, raised causeways across Majuro and Ebeye', effects: { coast: 22, finance: -8, water: 0, economy: 5 }, narrative: 'Visible protection of population centers. Outer atolls feel deprioritized. Reef-engineering trials yield mixed results.' },
            { id: 'b', label: 'Soft adaptation: mangrove planting, traditional reef weir restoration, atoll-by-atoll vulnerability assessments led by local communities', effects: { coast: 12, water: 10, food: 12, economy: 5, finance: 5 }, narrative: 'Slower visible progress. Traditional knowledge integrated. Outer atolls feel seen.' },
            { id: 'c', label: 'Aquifer protection: freshwater lens monitoring, rainwater catchment expansion, desalination pilot', effects: { water: 28, coast: 0, food: 5 }, narrative: 'Freshwater secured for next decade. Coastal infrastructure remains thin. Drought-year resilience improves significantly.' }
          ]
        },
        {
          period: '2030–2040',
          prompt: 'A category-5 cyclone hits Mili Atoll. 3 inhabited islets are uninhabitable for 6 months. International press is calling RMI "the canary." Your government must respond. What is your framing?',
          options: [
            { id: 'a', label: 'Frame this as climate-justice claim: tour world capitals demanding loss-and-damage funds from major emitters', effects: { finance: 22, migration: 5, economy: 5, coast: -3 }, narrative: 'Marshall Islands becomes the public face of climate-loss-and-damage diplomacy. Funds increase. Domestic recovery still slow.' },
            { id: 'b', label: 'Frame this as a stewardship challenge: build resilient relocation within RMI; affected families move to Majuro or other atolls with dignity', effects: { coast: 12, migration: 12, food: 8, economy: 0 }, narrative: 'Internal migration carefully managed. Cultural cohesion preserved. International donor fatigue mentioned.' },
            { id: 'c', label: 'Accelerate Compact-of-Free-Association migration to Hawaii / Arkansas Marshallese communities; framed as voluntary, supported', effects: { migration: 22, economy: -8, food: -5, finance: 0 }, narrative: 'Diaspora grows. Domestic population shrinks. The political symbolism shifts: "RMI is becoming a memory, not a nation."' }
          ]
        },
        {
          period: '2040–2050',
          prompt: 'Sea level up 30cm. Saltwater intrusion ruining taro pits and breadfruit. Tuna fishery shifting east as ocean warms. Tourism trying to pivot to "last-chance" climate-witness diving. Hard choices.',
          options: [
            { id: 'a', label: 'Diversify the economy: maritime registration revenue, tuna licensing renegotiation, digital sovereignty initiatives (RMI passport-as-service)', effects: { economy: 22, finance: 8, food: -5 }, narrative: 'New revenue streams. RMI passport gains demand from climate-anxious wealthy purchasers — controversial domestically.' },
            { id: 'b', label: 'Reorient food sovereignty: salt-tolerant crop research, integrated aquaculture, Pacific traditional-food revival programs', effects: { food: 22, water: 5, economy: 0, finance: 5 }, narrative: 'Local food sufficiency rebuilds. International food-aid dependence drops. Slow win.' },
            { id: 'c', label: 'Negotiate climate-witness tourism with strict carrying capacity; revenue funds adaptation', effects: { economy: 12, coast: 5, finance: 5, food: -8 }, narrative: 'Tourism revenue grows. Visitors increase footprint on already-strained atolls. Marshallese hosts grow weary of "doomsday tourists."' }
          ]
        },
        {
          period: '2050–2055',
          prompt: 'Mid-century. Sea level up 40-50cm. Population stable at 60K (some out-migration, some return migration from diaspora). World looks to RMI as a model. What is your closing move for this generation?',
          options: [
            { id: 'a', label: 'Institutionalise tribal-traditional-knowledge climate authority: every adaptation decision requires Iroij (chiefly) council co-approval', effects: { coast: 12, water: 12, food: 15, migration: 8, finance: 10 }, narrative: 'Marshallese sovereignty and traditional governance integrated into climate adaptation. Globally cited as a model.' },
            { id: 'b', label: 'Diaspora-as-strategy: formalize circular-migration pathways with US, Australia, NZ so out-migrants strengthen homeland through remittance and rotation', effects: { migration: 22, economy: 12, finance: 12 }, narrative: 'A nation distributed across the Pacific Rim, anchored in atoll homeland. Cultural and political resilience.' },
            { id: 'c', label: 'Climate-litigation strategy: lead ICJ advisory opinion on state climate obligations, partnership with Vanuatu, build legal precedent for next century', effects: { finance: 22, economy: 0, migration: 0, coast: 5 }, narrative: '2055 ICJ ruling cites RMI prominently. Legal architecture shifts globally. Domestic adaptation still under-funded.' }
          ]
        }
      ],
      synthesis: 'Atoll and Maine climate adaptation operate on the same inter-sector feedback mechanic (sectors strengthen or drag each other across decades) at radically different stakes. Maine\'s climate-justice sector is the load-bearing one in that campaign; for RMI, every sector is load-bearing because the existential stakes are universal. Equally important: international climate finance is upstream of every domestic policy. The "we are not drowning, we are fighting" framing is not rhetoric; it is the operating principle of a sovereign nation refusing to be narrated as a victim by emitters far larger than itself.',
      sources: [
        'Office of Environment, Planning and Policy Coordination · Republic of the Marshall Islands',
        'Pacific Climate Change Centre · Secretariat of the Pacific Regional Environment Programme (SPREP)',
        'Marshall Islands National Climate Adaptation Plan',
        'IPCC AR6 · Working Group II · Small Islands chapter',
        'Tony de Brum (former RMI Foreign Minister) climate diplomacy archive',
        'Vanuatu Ministry of Climate Change · ICJ advisory opinion campaign documentation',
        'Maina Talia, "Pacific Island Climate Diplomacy" (2022)'
      ],
      aiDisclaimer: 'AI scenario coach. Not a Marshallese person, not an RMI government official, not an Iroij council member, not a SPREP officer. For real authority consult the Republic of the Marshall Islands government, the Iroij council, and Marshallese communities in homeland and diaspora.'
    },

    // ────────────── CONSERVATION FAMILY · 2nd scenario ──────────────
    {
      id: 'akagera',
      family: 'conservation',
      icon: '🦁',
      region: 'Akagera National Park · Eastern Rwanda',
      regionFlag: '🇷🇼',
      label: 'Akagera Lion Reintroduction',
      scale: '10 years · 5 entities',
      yearLabel: 'Period',
      color: FAMILY_COLORS.conservation.primary,
      shortDesc: 'Post-1994-genocide Akagera National Park lost its lions. In 2015, seven lions arrived from South Africa under a community-managed park model. You coordinate African Parks, RDB, and surrounding communities through a 10-year recovery in a context Yellowstone never faced.',
      briefing: 'Akagera National Park, eastern Rwanda, 1,122 sq km of savanna and wetland. The 1994 genocide and its aftermath displaced both people and wildlife; by 2009, the last lions had been poisoned by herders defending cattle. In 2010, African Parks took over management in partnership with the Rwanda Development Board (RDB) under a community-revenue-share model. In 2015, seven lions arrived from KwaZulu-Natal — the first lions in Rwanda in 15 years. You are now the recovery coordinator, working across African Parks, RDB, surrounding pastoralist communities, and tourism operators. Your job: re-establish a viable lion population AND keep community trust intact in a country where the human-wildlife conflict carries layered historical weight.',
      entities: [
        { id: 'lions',    name: 'Lion pride',                 icon: '🦁', init: 18, label: 'pride size + viability' },
        { id: 'prey',     name: 'Prey base (impala/zebra/buffalo)', icon: '🦓', init: 60, label: 'population balance' },
        { id: 'fence',    name: 'Predator-proof fence',       icon: '🚧', init: 50, label: 'human-wildlife buffer' },
        { id: 'community',name: 'Surrounding communities',    icon: '🤝', init: 35, label: 'trust + revenue share' },
        { id: 'tourism',  name: 'Tourism revenue',            icon: '📸', init: 30, label: 'GDP contribution' }
      ],
      decisions: [
        {
          period: 'Year 1–2 · Lions arrive',
          prompt: 'The seven lions are released into a 100 sq km holding boma. Pastoralist communities at the southern boundary are anxious. Cattle losses at the southern fence already happen with leopards and crocodiles. What is your first move?',
          options: [
            { id: 'a', label: 'Build the predator-proof perimeter fence first; full release only after fence is complete and tested', effects: { fence: 22, lions: -3, community: 12, prey: 5 }, narrative: 'Fence operational by year 2. Lion release delayed but safer. Community sees concrete proof of investment.' },
            { id: 'b', label: 'Full release immediately; respond to incidents with rapid-response compensation', effects: { lions: 12, community: -15, fence: 5 }, narrative: 'Three cattle killings in first 8 months. Compensation slow. Community trust crashes early.' },
            { id: 'c', label: 'Phased community-fence build using local labour (revenue + employment + ownership), funded by African Parks', effects: { fence: 15, community: 22, lions: 5, tourism: 5 }, narrative: 'Slower fence completion but community-owned. Pastoralists earn wages on a project that protects them. Goodwill compounds.' }
          ]
        },
        {
          period: 'Year 3–5 · Pride forms',
          prompt: 'Lions hunting wild prey successfully. First cubs born. Prey populations dipping at expected pace. A neighbouring community reports two cattle killed by a lone wandering male. Tourism numbers climbing fast. What now?',
          options: [
            { id: 'a', label: 'Compensate fully (140% of market value) + community-livestock-guarding-dog program funded by tourism revenue share', effects: { community: 22, tourism: -5, lions: 5 }, narrative: 'Community partnerships deepen. Some tourism revenue redirected. Guard-dog program reduces future incidents 60%.' },
            { id: 'b', label: 'Move (relocate) the problem male back into core park; warn community to better protect livestock', effects: { lions: -3, community: -8, fence: 3 }, narrative: 'Quick fix. Community feels burden placed on them. Trust shaky.' },
            { id: 'c', label: 'Eliminate the problem male; "rogue individual" framing', effects: { lions: -8, community: 8, tourism: -3 }, narrative: 'Short-term community relief. Conservation community criticises decision. Future pride genetics narrowed.' }
          ]
        },
        {
          period: 'Year 6–7 · Recovery',
          prompt: 'Pride at 18 lions, healthy. Tourism revenue substantial (5x pre-reintroduction). Surrounding community has visible income from park-revenue-share fund. But poachers from across the Tanzanian border are increasing pressure. What is your priority?',
          options: [
            { id: 'a', label: 'Anti-poaching investment: drones, satellite collaring, training Rwandan-led ranger force', effects: { lions: 12, prey: 12, community: 5, tourism: 8 }, narrative: 'Poaching pressure drops. Ranger employment grows. Cross-border collaboration with Tanzania initiated.' },
            { id: 'b', label: 'Expand the lion population: import a second pride from Botswana for genetic diversity', effects: { lions: 18, prey: -8, community: 0 }, narrative: 'Population reaches viable genetic threshold. Some prey pressure. Tourism boom continues.' },
            { id: 'c', label: 'Pivot to broader Akagera mega-fauna: rhino reintroduction next', effects: { tourism: 18, community: 5, lions: 0 }, narrative: 'Rhinos arrive from South Africa year 8. Akagera becomes Big-Five tourism destination. Conservation footprint multiplies.' }
          ]
        },
        {
          period: 'Year 8–10 · Institutionalize',
          prompt: 'A decade after lion return. Park self-financing through tourism + carbon credits + community partnerships. Time to set the model for the next 30 years. What do you commit to?',
          options: [
            { id: 'a', label: 'Locally-led management: phase out African Parks role; transfer leadership to Rwandan staff and community-elected board', effects: { community: 25, tourism: 12, lions: 8, fence: 10 }, narrative: 'Akagera becomes a globally-cited model of African-led, community-owned conservation. Sovereignty + biodiversity aligned.' },
            { id: 'b', label: 'Expand the partnership: African Parks model replicated to Nyungwe and Volcanoes national parks (gorilla habitats)', effects: { tourism: 18, lions: 5, community: 8 }, narrative: 'Rwanda becomes the regional model. Tourism continues growing. Some community concerns about pace.' },
            { id: 'c', label: 'Climate adaptation: rewild buffer zones, expand connectivity corridor to Akagera-Uganda', effects: { prey: 18, lions: 12, community: 5 }, narrative: 'Ecological resilience built. Lion range expands across border. Climate-resilient landscape architecture.' }
          ]
        }
      ],
      synthesis: 'Akagera and Yellowstone are both predator reintroductions producing trophic cascades, but the political and historical contexts could not be more different. Yellowstone reintroduced wolves in a wealthy nation with deep, contested federal protection traditions. Akagera reintroduced lions in a country still recovering from genocide, under a community-managed model that combines conservation with economic recovery. Akagera proves that the trophic-cascade mechanic is universal AND that the social architecture around it must be locally co-designed. African Parks + RDB created a model where the predator AND the community benefit, financially and politically. That is the harder design challenge — and Akagera has done it well enough to be globally cited.',
      sources: [
        'African Parks Network · Akagera Management Company',
        'Rwanda Development Board · Tourism and Conservation Department',
        'Akagera National Park annual reports (2015–present)',
        'IUCN African Lion Working Group',
        'Lion Recovery Fund · Wildlife Conservation Network',
        'Save the Rhino International · Rwanda rhino reintroduction documentation',
        'Maisels et al., "Devastating decline of forest elephants in Central Africa" PLoS One (2013) — contextual'
      ],
      aiDisclaimer: 'AI scenario coach. Not a Rwandan park ranger, not an African Parks staff member, not a community representative from pastoralist groups near Akagera. For real authority consult African Parks, RDB, and the communities directly involved in park co-management.'
    },

    // ────────────── OUTBREAK FAMILY · 2nd scenario ──────────────
    {
      id: 'liberia',
      family: 'outbreak',
      icon: '🩺',
      region: 'Lofa County · Liberia',
      regionFlag: '🇱🇷',
      label: 'Liberia Ebola Response 2014',
      scale: '18 months · 4 demographics',
      yearLabel: 'Phase',
      color: FAMILY_COLORS.outbreak.primary,
      shortDesc: '2014 West African Ebola epidemic, the worst Ebola outbreak in history. You coordinate response in Lofa County, where the outbreak started. Community trust, traditional burial practice, and the WHO/MSF response architecture are all under simultaneous strain.',
      briefing: 'It is March 2014. A 2-year-old child in Meliandou village, Guinea, has died of an unknown illness. By June, cases have crossed into Lofa County in northern Liberia. By the end of the year this will become the worst Ebola epidemic in history: 28,600 cases, 11,300 deaths across West Africa. Liberia\'s health system, recovering from a 14-year civil war (1989–2003), has 50 doctors for 4 million people. You are coordinating Lofa County\'s response, working across the Liberian Ministry of Health, WHO Country Office, Médecins Sans Frontières (MSF), local chiefs, and traditional healers. Trust between communities and the post-war government is fragile. Traditional burial practices include ritual washing of the dead — a major Ebola transmission vector. Your decisions over 18 months will shape recovery for a generation.',
      entities: [
        { id: 'cases',    name: 'Case curve (lower is better)', icon: '📉', init: 25, label: 'epidemic trajectory — INVERTED' },
        { id: 'community',name: 'Community trust',             icon: '🏘️', init: 30, label: 'social license + cooperation' },
        { id: 'healers',  name: 'Traditional healers + chiefs',icon: '👴', init: 32, label: 'cultural partnership' },
        { id: 'health',   name: 'Health system capacity',      icon: '🏥', init: 28, label: 'ETU beds + staff' },
        { id: 'survivors',name: 'Survivor support',            icon: '🌅', init: 20, label: 'reintegration + care' }
      ],
      entityInverted: { cases: true },
      decisions: [
        {
          period: 'Phase 1 · Outbreak emerges (March–July 2014)',
          prompt: 'First cases in Lofa County. International attention minimal. Three options to coordinate the early response. Which?',
          options: [
            { id: 'a', label: 'Quarantine border communities + military checkpoint enforcement (the West Point precedent)', effects: { cases: 5, community: -25, healers: -15, health: 0 }, narrative: 'Cases keep spreading underground. West Point shootings (Monrovia, August 2014) become global news for the wrong reasons. Trust collapses.' },
            { id: 'b', label: 'Community-engagement-first: partner with chiefs and traditional healers from week 1, train them as transmission educators', effects: { healers: 28, community: 22, cases: -8, health: 5 }, narrative: 'Chiefs become the front-line educators. Traditional healers redirect patients to clinics. The "Community Care Centre" model emerges.' },
            { id: 'c', label: 'Build ETUs (Ebola Treatment Units) fast; partner with MSF for clinical capacity', effects: { health: 18, cases: -3, community: -5 }, narrative: 'Clinical capacity grows. Communities still seeing it as "Ebola is a government and foreigner problem." Cases continue.' }
          ]
        },
        {
          period: 'Phase 2 · The surge (August–November 2014)',
          prompt: 'Cases doubling weekly. International press calls Liberia "ground zero." US military deploys ~3,000 troops to build ETUs. WHO declares Public Health Emergency. Burial practice is the central transmission point. What do you support?',
          options: [
            { id: 'a', label: 'Government bans traditional burial; mandatory cremation enforced by police', effects: { cases: 8, community: -28, healers: -22 }, narrative: 'Burials go underground. Community-trust ruptures. The Sirleaf administration is criticised for years afterward. Cases spike.' },
            { id: 'b', label: 'Develop "Safe and Dignified Burial" protocols with traditional healers and Christian / Muslim leaders; train community burial teams', effects: { cases: -22, healers: 22, community: 18, health: 8 }, narrative: 'The single most important intervention of the entire response. Cases drop within 6 weeks. WHO cites this as a global model for future epidemics.' },
            { id: 'c', label: 'Let traditional burial continue; focus all effort on hospital infectious-disease control', effects: { cases: 15, healers: 5, health: -8 }, narrative: 'Cases keep climbing. Healthcare workers infected at scale. Some doctors flee Lofa County.' }
          ]
        },
        {
          period: 'Phase 3 · Curve bends (December 2014–April 2015)',
          prompt: 'Case curve flattening. ETUs running. Community Care Centres scaling. Survivor population growing — and getting stigmatised and ostracised in their villages. What is your priority?',
          options: [
            { id: 'a', label: 'Survivor support program: community reintegration ceremonies, psychological care, scholarships for orphans, mobile-clinic survivor cohort follow-up', effects: { survivors: 28, community: 12, healers: 8 }, narrative: 'Survivors regain place in community. Long-term Ebola sequelae (vision, joint problems) tracked and treated. Hard-earned trust deepens.' },
            { id: 'b', label: 'Focus on getting to zero cases as fast as possible; survivor care can come after', effects: { cases: -8, survivors: -15, community: -5 }, narrative: 'Cases reach near zero by spring. Survivor mental-health crisis intensifies. Some survivors take their own lives.' },
            { id: 'c', label: 'Rebuild the health system: expand training of Liberian doctors, nurses, lab technicians', effects: { health: 25, survivors: 8, community: 5 }, narrative: 'Long-term capacity built. Future-outbreak readiness improves. Surviving healthcare workers feel investment.' }
          ]
        },
        {
          period: 'Phase 4 · Recovery and learning (May 2015 onward)',
          prompt: 'Liberia declared Ebola-free in May 2015 (after a brief re-emergence). 18 months in. What is your closing legacy commitment?',
          options: [
            { id: 'a', label: 'Permanent community-health-worker network: every village has trained CHW for future outbreaks, integrated with traditional healers and chiefs', effects: { community: 25, healers: 18, health: 15, cases: -8 }, narrative: 'Liberia\'s 2018 Lassa fever outbreak and 2020 COVID response leverage this infrastructure. Globally cited as the lesson learned.' },
            { id: 'b', label: 'National Public Health Institute (NPHIL) — a CDC-style federal authority for disease surveillance', effects: { health: 22, community: 5, survivors: 5 }, narrative: 'NPHIL becomes regional leader. International funding flows. Some critics worry it pulls staff from local clinics.' },
            { id: 'c', label: 'International accountability: hold WHO, Western donors, and pharma accountable for the slow vaccine response and the late ZMapp trial controversy', effects: { community: 12, healers: 8, survivors: 8 }, narrative: 'Liberian-led documentation shapes future epidemic ethics. The "African voices first" principle becomes institutional in future global outbreak response.' }
          ]
        }
      ],
      synthesis: 'Liberia 2014 and Mumbai monsoon dengue both run on the trust-feedback mechanic, at vastly different scales of mortality and global attention. Liberia teaches the absolute central lesson: when the outbreak intersects with deeply held cultural practice (traditional burial), the choice between cultural-suppression and cultural-partnership determines the trajectory. The "Safe and Dignified Burial" protocol — a partnership with traditional and religious leaders rather than a ban — was the single most important intervention of the entire West African epidemic. The technical interventions (ETUs, contact tracing, vaccines in late 2015) were necessary; the cultural partnership was load-bearing.',
      sources: [
        'Liberian Ministry of Health · National Public Health Institute of Liberia (NPHIL)',
        'WHO West Africa Region · Ebola Situation Reports 2014–2016',
        'Médecins Sans Frontières (MSF) · "Pushed to the Limit and Beyond" report (2015)',
        'Paul Farmer, "Fevers, Feuds, and Diamonds: Ebola and the Ravages of History" (2020)',
        'Helen Epstein, "Ebola in Liberia: An Epidemic of Rumors" (NYRB)',
        'Sirleaf government archive · post-Ebola reflections',
        'WHO Independent Panel · "After Ebola in West Africa" Lancet (2016)'
      ],
      aiDisclaimer: 'AI scenario coach. Not a Liberian Ministry of Health officer, MSF clinician, traditional chief, healer, or Ebola survivor. For real authority consult the cited Liberian institutions and the survivor-led documentation projects.'
    },

    // ────────────── CLIMATE FAMILY · 2nd scenario ──────────────
    {
      id: 'bangladesh',
      family: 'climate',
      icon: '🌊',
      region: 'Bangladesh Delta · Bangladesh',
      regionFlag: '🇧🇩',
      label: 'Bangladesh Delta Adaptation',
      scale: '20 years · 6 sectors',
      yearLabel: 'Period',
      color: FAMILY_COLORS.climate.primary,
      shortDesc: '170M people in a country that is ~80% delta floodplain. Cyclones, salinity intrusion, internal migration to Dhaka. You advise the Bangladesh Climate Change Strategy and Action Plan team. Same inter-sector physics as Maine and Marshall Islands; vastly larger population and stakes.',
      briefing: 'You are working with the Bangladesh Climate Change Strategy and Action Plan (BCCSAP) team, advising the Department of Environment and the Ministry of Disaster Management. Bangladesh is 80% delta floodplain — the Ganges, Brahmaputra, and Meghna rivers converge in a low-lying country home to 170 million people. Sea-level rise of 0.5m by 2050 (IPCC SSP2-4.5) will displace ~17 million people. Cyclone intensity is increasing. Salinity intrusion is destroying rice paddies. Internal migration to Dhaka and Chittagong is reaching megacity capacity. International climate finance is constrained. You are working out the next 20 years (2025–2045) in four 5-year periods across six policy sectors. Unlike the Marshall Islands, migration cannot solve this — there are too many people, and no single country will absorb them.',
      entities: [
        { id: 'cyclone', name: 'Cyclone shelters + early warning', icon: '🌀', init: 45, label: 'evacuation capacity' },
        { id: 'salt',    name: 'Salinity + freshwater',           icon: '💧', init: 35, label: 'agricultural water access' },
        { id: 'food',    name: 'Food security',                   icon: '🌾', init: 42, label: 'rice + fisheries + aquaculture' },
        { id: 'dhaka',   name: 'Dhaka urban capacity',            icon: '🏙️', init: 30, label: 'megacity infrastructure + climate-migrant absorption' },
        { id: 'coastal', name: 'Coastal protection',              icon: '🌊', init: 40, label: 'embankments + Sundarbans + chars' },
        { id: 'finance', name: 'Climate finance + adaptation budget', icon: '🌍', init: 38, label: 'GCF + bilateral + domestic' }
      ],
      decisions: [
        {
          period: '2025–2030 · Foundation',
          prompt: 'BCCSAP refresh due. $8B/year adaptation gap. International climate finance at $2B/year. Where do you direct the first wave of investment?',
          options: [
            { id: 'a', label: 'Cyclone preparedness: more shelters, mobile evacuation systems, community-based early warning (the proven Bangladesh model)', effects: { cyclone: 25, coastal: 8, food: 5 }, narrative: 'Cyclone mortality continues its multi-decade decline. Bangladesh cited globally as the cyclone-preparedness model. Other sectors lagging.' },
            { id: 'b', label: 'Salinity-resistant agriculture: BRRI salt-tolerant rice varieties, integrated rice-fish-shrimp polyculture, women-led training', effects: { salt: 18, food: 22, dhaka: -3 }, narrative: 'Food production in coastal districts stabilises. Some farmers transition to aquaculture. BRRI becomes a regional research powerhouse.' },
            { id: 'c', label: 'Sundarbans mangrove restoration + coastal embankment overhaul (Polder Master Plan)', effects: { coastal: 25, cyclone: 12, food: 8, salt: 5 }, narrative: 'Nature-based defence layered with engineered protection. Long construction timeline but durable.' }
          ]
        },
        {
          period: '2030–2035 · The migration squeeze',
          prompt: 'Two consecutive cyclones (Cat 4 + Cat 5) hit in 2032 and 2033. Climate displacement accelerating. Dhaka receiving 500K climate migrants/year. The city is at infrastructure breaking point. Your policy lever:',
          options: [
            { id: 'a', label: 'Internal-migration infrastructure: build secondary climate-resilient cities (Khulna, Rajshahi, Sylhet) as alternative destinations to Dhaka', effects: { dhaka: 22, coastal: 8, finance: -8, food: 5 }, narrative: 'Secondary cities receive migration flow. Dhaka pressure eases. Climate-resilient urban planning template emerges.' },
            { id: 'b', label: 'In-place adaptation: massively scale BRAC-led community-based adaptation in vulnerable districts so people can stay', effects: { coastal: 15, food: 15, dhaka: 8, salt: 8 }, narrative: 'People stay in homeland longer. Climate-vulnerable districts strengthen. Dhaka pressure still acute but slowing.' },
            { id: 'c', label: 'International labour mobility agreements: pursue circular-migration pathways to Gulf states, Malaysia, EU under a climate-mobility framework', effects: { dhaka: 12, finance: 18 }, narrative: 'Migration becomes a sanctioned development pathway. Remittances flow. Some scholars critique the "exporting climate vulnerability" framing.' }
          ]
        },
        {
          period: '2035–2040 · Loss and damage',
          prompt: 'COP30 (2025) loss-and-damage fund operationalised. Bangladesh is positioned to be a leading recipient AND a leading voice. Strategic choice ahead:',
          options: [
            { id: 'a', label: 'Lead the V20 (Vulnerable Twenty) coalition; co-chair with Marshall Islands and Mozambique; build the global architecture for loss-and-damage', effects: { finance: 28, coastal: 8, dhaka: 5 }, narrative: 'Bangladesh becomes a global diplomatic leader on climate justice. Loss-and-damage funds flow predictably. Domestic adaptation accelerates.' },
            { id: 'b', label: 'Bilateral focus: maximise direct deals with EU, UK, Norway, US, Japan; less multilateral exposure', effects: { finance: 18, food: 5, coastal: 5 }, narrative: 'Predictable revenue. Bangladesh perceived as transactional rather than principled. Less international solidarity influence.' },
            { id: 'c', label: 'Domestic-finance pivot: green bonds, climate-tax on garment exports, sovereign-wealth-style climate fund', effects: { finance: 22, food: 8, dhaka: 5 }, narrative: 'Reduced international dependence. Garment industry partially co-opted to climate finance. Long-term sovereignty over adaptation.' }
          ]
        },
        {
          period: '2040–2045 · Institutionalise',
          prompt: '20 years in. Bangladesh has the world\'s best cyclone-preparedness system, a global voice on loss-and-damage, a transformed agricultural sector. Final commitment for the next 20 years:',
          options: [
            { id: 'a', label: 'Constitutional climate provisions: enshrine climate adaptation, intergenerational equity, and migrant rights in updated constitution', effects: { coastal: 12, dhaka: 12, food: 12, finance: 12, cyclone: 10, salt: 8 }, narrative: 'Climate sovereignty institutionalised across all sectors. Future political administrations bound to adaptation framework. Cited globally.' },
            { id: 'b', label: 'Mega-engineering: 30-year Coastal Defence Master Plan, Dutch-collaboration polder overhaul, full Sundarbans expansion', effects: { coastal: 28, cyclone: 12, food: 8, finance: -8 }, narrative: 'Engineered protection world-class. Significant cost. Some critique of over-reliance on infrastructure.' },
            { id: 'c', label: 'Diaspora-anchored sovereignty: formalise Bangladeshi diaspora (10M+ globally) as climate-finance and political-advocacy partners', effects: { finance: 22, dhaka: 12, food: 8 }, narrative: 'Diaspora becomes structural to homeland adaptation. Remittance + advocacy + return-investment circuits institutionalised.' }
          ]
        }
      ],
      synthesis: 'Bangladesh and Marshall Islands climate adaptation share the inter-sector feedback mechanic and the existential-stakes framing, but the absolute population scale changes everything. RMI can plausibly relocate its 60K citizens to Hawaii / Arkansas. Bangladesh\'s 170M cannot relocate; no country will absorb 17M climate migrants. Bangladesh\'s solution must be in-place adaptation at unprecedented scale. The lesson Marshall Islands teaches the world through small-island diplomacy, Bangladesh teaches through scale: cyclone-preparedness saves lives at scale, community-based adaptation works at scale, climate-finance can be domestically generated at scale. Both nations show climate justice is not a Western abstraction; it is a national-survival operating principle.',
      sources: [
        'Bangladesh Climate Change Strategy and Action Plan (BCCSAP) · Department of Environment',
        'Bangladesh Rice Research Institute (BRRI) · salt-tolerant variety program',
        'BRAC · community-based adaptation programs (largest NGO globally)',
        'Climate Vulnerable Forum / V20 Group',
        'IPCC AR6 Working Group II · Asia chapter',
        'Saleemul Huq (ICCCAD) — Bangladesh adaptation research',
        'Tasneem Siddiqui (RMMRU) — climate migration research'
      ],
      aiDisclaimer: 'AI scenario coach. Not a Bangladesh government official, BRRI scientist, BRAC field worker, char-dweller, or climate migrant. For real authority consult the cited institutions, ICCCAD, and Bangladeshi climate journalists.'
    },

    // ────────────── FIRE FAMILY · 2nd scenario ──────────────
    {
      id: 'karuk',
      family: 'fire',
      icon: '🌰',
      region: 'Karuk Aboriginal Territory · Klamath–Six Rivers National Forest, Northern California',
      regionFlag: '🇺🇸',
      label: 'Karuk Cultural Fire Partnership',
      scale: '10 years · 5 entities',
      yearLabel: 'Period',
      color: FAMILY_COLORS.fire.primary,
      shortDesc: 'After a century of fire suppression, the Karuk Tribe partners with US Forest Service to restore cultural fire on oak woodlands. Different country from Yarralin (temperate Pacific Northwest vs tropical Top End) and Wabanaki (Pacific vs Atlantic). Same Indigenous-led principle.',
      briefing: 'You are working with the Karuk Tribe Department of Natural Resources on the Klamath River corridor in Northern California, Karuk aboriginal territory since time immemorial. From 1911 until very recently, US Forest Service policy was total fire suppression. The Karuk people had practiced cultural burning (clearing oak woodland understory in the fall, protecting tan oak acorn crops, encouraging fire-following foods like camas and beargrass) for many generations before that. A century of suppression has produced massive fuel loads — and increasingly catastrophic late-summer wildfires (2008 Iron Complex, 2017 Klamathon, 2020 Slater fires). In 2015 the Karuk Tribe DNR signed an MOU with USFS to integrate Karuk fire knowledge into Klamath–Six Rivers management. You are coordinating the next 10 years. Note: this scenario is about the partnership work and the policy choices, NOT a representation of specific cultural fire knowledge, which belongs to the Karuk Tribe.',
      entities: [
        { id: 'oak',         name: 'Oak woodland + acorns',     icon: '🌰', init: 38, label: 'mast productivity' },
        { id: 'tanoak',      name: 'Tan oak (cultural food)',   icon: '🌳', init: 32, label: 'health + sudden-oak-death risk' },
        { id: 'understory',  name: 'Fire-following plants',     icon: '🌾', init: 28, label: 'camas + beargrass + huckleberry' },
        { id: 'partnership', name: 'Karuk DNR–USFS partnership',icon: '🤝', init: 35, label: 'tribal-federal trust' },
        { id: 'fuel',        name: 'Fuel load / wildfire risk', icon: '🔥', init: 78, label: 'tinder accumulated — INVERTED: lower is better' }
      ],
      entityInverted: { fuel: true },
      decisions: [
        {
          period: 'Year 1–2 · Building the MOU',
          prompt: 'MOU signed but fragile. USFS career staff range from enthusiastic to skeptical. Karuk fire practitioners want sovereignty over which knowledge is shared and how. What is your first build?',
          options: [
            { id: 'a', label: 'Co-develop a Karuk-led training program for USFS staff. Karuk Tribe DNR sets curriculum; USFS pays staff time to attend. No knowledge extracted to federal documents.', effects: { partnership: 25, oak: 5, fuel: -8 }, narrative: 'Trust foundation built. Several USFS fire staff become long-term partners. Karuk knowledge sovereignty respected.' },
            { id: 'b', label: 'Push USFS to formally adopt Karuk practices into federal fire-management plan; produce documents and procedures', effects: { partnership: -15, oak: 8, fuel: -10 }, narrative: 'Some technical wins. Karuk Tribe concerned about traditional knowledge being codified in federal documents without consent.' },
            { id: 'c', label: 'Start small: pilot prescribed-burn project on a single watershed, Karuk fire practitioners lead, USFS provides logistical support only', effects: { partnership: 18, oak: 12, understory: 12, fuel: -12 }, narrative: 'Proof of concept on the ground. Karuk practitioners on country. USFS learns by observing, not by directing.' }
          ]
        },
        {
          period: 'Year 3–5 · Scaling fall burns',
          prompt: 'First successful cultural-fire seasons. Oak woodlands responding. But a wildfire near Yreka in 2026 triggers political backlash. State legislators question prescribed-burn safety. What do you do?',
          options: [
            { id: 'a', label: 'Hold the line publicly: Karuk Tribe DNR and USFS jointly release data showing cultural-burn-treated areas reduced wildfire severity', effects: { partnership: 22, fuel: -15, oak: 8 }, narrative: 'Joint communication strengthens the partnership. Data convinces some legislators. Karuk practitioners gain regional standing.' },
            { id: 'b', label: 'Pause prescribed burns for one year while political heat cools', effects: { fuel: 12, oak: -5, partnership: -8 }, narrative: 'Politics calm. Fuel loads climb. Karuk practitioners express frustration that political risk falls on cultural work first.' },
            { id: 'c', label: 'Quietly continue burns under low-profile project codes; minimal communication', effects: { fuel: -10, oak: 5, partnership: -5 }, narrative: 'Work continues. Public narrative drifts. Eventually a journalist surfaces the work; framing is mixed.' }
          ]
        },
        {
          period: 'Year 6–7 · A megafire tests the model',
          prompt: 'A late-August lightning complex ignites in adjacent National Forest. Wildfire approaches Orleans (Karuk community). Cultural-fire-treated areas form a buffer in some directions. What is your strategic response?',
          options: [
            { id: 'a', label: 'Integrated incident-command: Karuk DNR fire practitioners co-lead burn operations with USFS Type 1 incident management team', effects: { partnership: 25, fuel: -18, oak: 5, tanoak: 8 }, narrative: 'Cultural-burn buffers slow the fire. Karuk practitioners save Orleans. Incident-command integration becomes a national model.' },
            { id: 'b', label: 'Defer to federal incident command; Karuk practitioners advise only', effects: { partnership: -8, fuel: 5, oak: -3 }, narrative: 'Fire managed federally. Some Karuk-treated areas saved by good luck. Partnership credibility cooled.' },
            { id: 'c', label: 'Karuk Tribe declares emergency on tribal trust land; tribal-led suppression with USFS providing aerial support only', effects: { partnership: 12, fuel: -8, tanoak: 12 }, narrative: 'Tribal sovereignty visible. Orleans safe. Some federal officials grumble about the precedent.' }
          ]
        },
        {
          period: 'Year 8–10 · Institutionalize',
          prompt: 'Decade in. Cultural fire restored on substantial Karuk aboriginal territory. Karuk Tribe DNR has trained dozens of practitioners. National attention. What is the closing commitment?',
          options: [
            { id: 'a', label: 'Karuk Climate Adaptation Plan implementation: full restoration of cultural fire across watershed, multi-generational practitioner training, food sovereignty linked to acorn + tan oak management', effects: { partnership: 18, oak: 22, tanoak: 22, understory: 18, fuel: -15 }, narrative: 'Cultural fire institutionalized as primary land management. Karuk food sovereignty rebuilt. National model for Indigenous-led fire.' },
            { id: 'b', label: 'Spread the model: support Yurok, Hupa, and other PNW tribes to develop parallel partnerships with their federal-land neighbours', effects: { partnership: 22, oak: 12, fuel: -10 }, narrative: 'Regional network of Indigenous-led fire programs forms. Karuk Tribe DNR becomes consulting hub. Knowledge transfers within Indigenous community, not extracted.' },
            { id: 'c', label: 'Constitutional protection: pursue federal co-management designation for Karuk aboriginal territory, beyond an MOU', effects: { partnership: 15, oak: 8, fuel: -8, tanoak: 5 }, narrative: 'Slow legal process. Some progress under future administrations. Eventually opens the door to genuine co-management.' }
          ]
        }
      ],
      synthesis: 'Karuk and Wabanaki and Yarralin cultural fire stewardship are three points on the same map. All three operate on the same physics (early/cool fire interrupts fuel accumulation that produces destructive late/hot fire). All three were systematically suppressed by colonial fire policies. All three are now being institutionally restored — and in every case the restoration depends on Indigenous-led organising that preceded the federal partnership by decades. Karuk teaches one additional, sharp lesson: traditional knowledge sovereignty is structural. Knowledge can be partnered with, learned from, and applied alongside; it cannot be extracted into federal documents without consent. The MOU model that respects that sovereignty is also the model that produces the most durable on-the-ground stewardship.',
      sources: [
        'Karuk Tribe · Department of Natural Resources',
        'Karuk Tribe · Eco-Cultural Resources Management Plan',
        'Cultural Fire Management Council (Karuk + Yurok partnership)',
        'Indigenous Peoples Burning Network (IPBN)',
        'Frank Lake (Karuk descendant, USFS PSW Research Station) publications',
        'US Forest Service · Klamath National Forest + Six Rivers National Forest',
        'Sarah Hardy (USFS) and Bill Tripp (Karuk DNR), various publications',
        'Norgaard, "Salmon and Acorns Feed Our People: Colonialism, Nature, and Social Action" (2019)'
      ],
      aiDisclaimer: 'AI scenario coach for teaching about the partnership and policy choices, NOT a representation of Karuk cultural fire knowledge, which belongs to the Karuk Tribe and is not appropriate to render in software. Not a Karuk person, not a Karuk Tribe DNR staff member, not a USFS officer. For real authority consult the Karuk Tribe directly.'
    },

    // ────────────── WATERSHED FAMILY · 2nd scenario ──────────────
    {
      id: 'murraydarling',
      family: 'watershed',
      icon: '🪶',
      region: 'Murray–Darling Basin · Australia (NSW, VIC, SA, QLD, ACT)',
      regionFlag: '🇦🇺',
      label: 'Murray–Darling Basin Plan',
      scale: '15 years · 6 components',
      yearLabel: 'Period',
      color: FAMILY_COLORS.watershed.primary,
      shortDesc: 'Largest river basin in Australia, 1M sq km, 7 jurisdictions. Over-allocation through the 20th century, Millennium Drought collapse, 2012 Basin Plan, ongoing political battles. You coordinate between Murray–Darling Basin Authority, MLDRIN/NBAN First Nations, irrigators, and the Lower Lakes communities.',
      briefing: 'You are working with the Murray–Darling Basin Authority (MDBA), the federal agency coordinating water across the 1-million-square-kilometre Murray–Darling Basin — Australia\'s largest river system and the country\'s agricultural heartland. It is 2010. The basin is emerging from the Millennium Drought (2001–2009), the worst drought in Australian recorded history. The Lower Lakes (Lake Alexandrina and Lake Albert at the river\'s mouth in South Australia) were acid-sulfate hellscapes by 2009. Aboriginal and Torres Strait Islander peoples — Barkindji, Ngarrindjeri, Yorta Yorta, Wiradjuri, Murrawarri, and dozens of other Nations — have had unbroken cultural and ceremonial relationships with this river system for tens of thousands of years. Irrigators (cotton, dairy, citrus, rice) hold senior water entitlements. Environmental water managers are a new actor with new powers. The 2012 Basin Plan is being negotiated. You have 15 years.',
      entities: [
        { id: 'headwaters',  name: 'Headwaters / Snowy alpine', icon: '🏔️', init: 55, label: 'flow + snowmelt' },
        { id: 'redgum',      name: 'River red gum forests',     icon: '🌳', init: 35, label: 'flood-dependent health' },
        { id: 'cultural',    name: 'Aboriginal cultural flows', icon: '🪶', init: 22, label: 'access + ceremony + fishery' },
        { id: 'irrigation',  name: 'Irrigation agriculture',    icon: '🚜', init: 60, label: 'allocation + viability' },
        { id: 'lowerlakes',  name: 'Lower Lakes + Coorong',     icon: '🦢', init: 28, label: 'estuary + Ramsar wetland health' },
        { id: 'market',      name: 'Water-trading market',      icon: '💱', init: 50, label: 'transparency + manipulation risk' }
      ],
      decisions: [
        {
          period: '2010–2012 · Basin Plan negotiation',
          prompt: 'Guide to the Basin Plan released October 2010. Irrigators burn copies of it in regional towns. South Australia (downstream, getting almost no water during drought) demands big cuts. First Nations want water rights, not just consultation. What is your negotiating priority?',
          options: [
            { id: 'a', label: 'Hold the line on the science-recommended Sustainable Diversion Limit (~3000–4000 GL recovery for the environment), even if political cost is high', effects: { redgum: 18, lowerlakes: 22, irrigation: -22, cultural: 8 }, narrative: 'Strong environmental outcome enshrined in legislation. Irrigator backlash sustained. Some basin towns hollow out as irrigators sell entitlements.' },
            { id: 'b', label: 'Negotiate down to a politically-survivable 2750 GL with "efficiency offsets" so irrigators keep some allocation through infrastructure upgrades', effects: { redgum: 8, lowerlakes: 12, irrigation: 5, cultural: 3, market: 5 }, narrative: 'Plan passes. Compromise hailed politically. Environmental groups call it inadequate. The 2750 number becomes the political baseline forever.' },
            { id: 'c', label: 'Build the Plan around cultural flows from the start; MLDRIN and NBAN are signatory partners; Aboriginal Nations water entitlements become a separate class', effects: { cultural: 25, redgum: 8, lowerlakes: 8, irrigation: -10 }, narrative: 'Genuinely sovereignty-respecting framework. Politically harder to deliver but globally cited as a model.' }
          ]
        },
        {
          period: '2013–2017 · Implementation and water-buybacks',
          prompt: 'Federal government buying back water entitlements from willing-seller irrigators. Some basin towns losing population. Northern Basin water-theft allegations surface (Four Corners report, 2017). What is your enforcement strategy?',
          options: [
            { id: 'a', label: 'Major federal compliance crackdown: independent water inspectorate, satellite metering, prosecutions', effects: { market: 25, redgum: 8, lowerlakes: 8, irrigation: -8, cultural: 5 }, narrative: 'Compliance regime hardens. Cotton-industry leaders prosecuted. The Northern Basin gets real oversight for the first time.' },
            { id: 'b', label: 'State-level enforcement only; preserve federal-state cooperation', effects: { market: -8, irrigation: 5, redgum: -5 }, narrative: 'State agencies under-resource enforcement. Water theft continues. South Australian premier publicly attacks NSW.' },
            { id: 'c', label: 'Modernize the market: real-time satellite metering for all licensees, full transparency portal, automated compliance', effects: { market: 28, irrigation: 5, redgum: 5, cultural: 8 }, narrative: 'Australia\'s water market becomes the most transparent in the world. Public trust slowly rebuilds.' }
          ]
        },
        {
          period: '2017–2020 · Fish kills and Black Summer',
          prompt: 'Late 2018 / early 2019: mass fish kills at Menindee (Barkindji country) on the Darling River — hundreds of thousands of native fish (Murray cod, golden perch) dead. Royal Commission underway. 2019–2020 Black Summer bushfires hit headwaters. Climate change is no longer abstract. Strategic choice:',
          options: [
            { id: 'a', label: 'Climate-adjust the entire Basin Plan: re-baseline ecological flows on post-2020 hydrology, increase environmental water reserves', effects: { redgum: 22, lowerlakes: 18, cultural: 12, irrigation: -18 }, narrative: 'Plan refreshed for climate reality. Irrigator political revolt sustained but science position strengthened. Globally cited as climate-realist water reform.' },
            { id: 'b', label: 'Emergency cultural-flows partnership with MLDRIN/NBAN: First Nations co-designed Northern Basin recovery, with Barkindji-led monitoring at Menindee', effects: { cultural: 28, redgum: 12, lowerlakes: 5 }, narrative: 'Cultural flows become a permanent program element. Barkindji rangers monitor the Menindee Lakes. Sovereignty + science aligned.' },
            { id: 'c', label: 'Maintain plan; focus on Lower Lakes barrage operations to keep the river mouth open', effects: { lowerlakes: 22, redgum: 5, irrigation: 0 }, narrative: 'Estuary stabilises. Upstream issues continue. South Australia happier; NSW and QLD irrigators unchanged.' }
          ]
        },
        {
          period: '2020–2025 · Long-term governance',
          prompt: '15 years in. Basin Plan delivery is partial, contested, but durable. First Nations have more authority than before but less than they sought. Climate change is making the original recovery targets harder. Closing commitment:',
          options: [
            { id: 'a', label: 'Treaty pathway: integrate cultural flows + Aboriginal water rights into the developing Australian treaty process', effects: { cultural: 28, redgum: 12, lowerlakes: 8, irrigation: -5 }, narrative: 'Cultural flows become legally entrenched in a constitutional way. Globally cited Indigenous-water-rights framework. Slow but durable.' },
            { id: 'b', label: 'Climate-adaptive water market: integrate climate scenarios into entitlement valuations, sovereign-wealth-style basin-recovery fund', effects: { market: 22, irrigation: 12, redgum: 12, lowerlakes: 8 }, narrative: 'Market becomes a true climate-adaptation instrument. Irrigators with marginal land transition out via market signals.' },
            { id: 'c', label: 'Reorient to nature-based solutions: floodplain re-connection, wetland restoration funded by carbon-credit revenue', effects: { redgum: 22, lowerlakes: 22, cultural: 12, market: 8 }, narrative: 'River-red-gum forests recover. Coorong rebuilds. The river system breathes again.' }
          ]
        }
      ],
      synthesis: 'Murray–Darling and Klamath and central-Maine watershed restoration share the same hydrological-cascade physics (flow → habitat → cultural fishery → estuary), but each operates at a different scale and political configuration. Klamath\'s breakthrough was Indigenous-led dam removal at unprecedented scale; Murray–Darling\'s breakthrough is contested cultural-flows policy at continental scale; Maine\'s is integrated state-tribal-federal river restoration. In every case, the political work of organising — Yurok/Karuk/Klamath in the PNW, MLDRIN/NBAN/Barkindji/Ngarrindjeri/Yorta Yorta in Australia, Penobscot Nation in Maine — preceded the engineering. The water comes back when the people who have been organising for generations are finally heard.',
      sources: [
        'Murray–Darling Basin Authority (MDBA)',
        'Murray Lower Darling Rivers Indigenous Nations (MLDRIN)',
        'Northern Basin Aboriginal Nations (NBAN)',
        'Yorta Yorta Nation Aboriginal Corporation',
        'CSIRO Land and Water · Basin science publications',
        'Productivity Commission · Murray–Darling Basin Plan: Five-Year Assessment (2018)',
        'Independent Assessment of the 2018–19 Lower Darling Fish Death Event (Vertessy review)',
        'Mary White, "Listen to the Rivers" (2018)'
      ],
      aiDisclaimer: 'AI scenario coach. Not a MDBA officer, not a member of Barkindji / Ngarrindjeri / Yorta Yorta / Wiradjuri / Murrawarri or any other Basin First Nation, not an irrigator. For real authority consult the cited institutions, the First Nations Boards (MLDRIN, NBAN), and the rivers themselves.'
    }
  ];

  // ── Group scenarios by family for the catalog UI ──
  function scenariosByFamily(familyId) {
    return SCENARIOS_LIBRARY.filter(function(s) { return s.family === familyId; });
  }

  // ── Family Pairing Insight: deep cross-region synthesis ──
  // Surfaces only when a student has completed BOTH a Maine anchor AND
  // at least one cross-region scenario in the same mechanic family.
  // Each is hand-written to land the specific cross-region lesson.
  var FAMILY_PAIRING_INSIGHTS = {
    fire: {
      title: 'Indigenous fire stewardship is a continental practice, not a regional curiosity',
      text: 'You have now stewarded Wabanaki mosaic fire on Maine\'s blueberry barrens, Karangpurru / Mudburra-Jingili cool burning in Australia\'s Top End, AND Karuk cultural fire partnership in the Klamath–Six Rivers National Forest. Three continents, three biomes (Northeast forest, tropical savanna, temperate oak woodland), three different colonial histories of fire suppression, and identical underlying physics: low-intensity early-season patchwork fire interrupts the fuel-accumulation cycle that produces destructive late-season wildfire. All three centre Indigenous knowledge as primary, not consultative. The Karuk scenario adds a sharp lesson: traditional knowledge sovereignty is structural — knowledge can be partnered with and applied alongside but cannot be extracted into federal documents without consent. The IPCC, USFS, NAILSMA, and the CSIRO are all converging on what these knowledge holders have practiced for tens of thousands of years.'
    },
    conservation: {
      title: 'Trophic cascades reorganise systems; the social architecture around them is locally specific',
      text: 'You have now restored wolves in Yellowstone AND lions in Akagera. Both produced trophic cascades. Both required two decades of community work. But the social architectures are completely different: Yellowstone navigated a wealthy nation\'s contested federal-state-tribal jurisdictions and a 70-year political grievance. Akagera navigated post-genocide community recovery, African Parks public-private management, and active community revenue-sharing with pastoralists. The biology was the cleaner part in both cases. The social architecture is where the actual stewardship work happens — and it cannot be imported across borders.'
    },
    outbreak: {
      title: 'Trust feedback is the universal currency of public health',
      text: 'You have now coordinated outbreak response in Maine, Mumbai during dengue monsoon, AND Liberia during the 2014 Ebola epidemic. Different pathogens, different scales (4 demographics vs 20 million vs national survival), different baseline trust. Universal lesson: in every single case, the cultural-partnership intervention beat the cultural-suppression intervention. Mumbai\'s SEWA partnership beat top-down landlord fines. Liberia\'s Safe-and-Dignified-Burial partnership with chiefs and traditional healers beat the burial-ban + military approach. Maine\'s community-health-worker model outperforms top-down mandates. The pattern is so strong it should be called Frieden\'s Law: the technical intervention is downstream of the cultural partnership.'
    },
    watershed: {
      title: 'Watersheds are restored by Indigenous-led organising, not by engineering alone',
      text: 'You have now restored watersheds in Maine, the Klamath, AND the Murray–Darling Basin. Three different scales (one river / 16K sq miles / 1 million sq km), three different problems (dam-blocked salmon / dam-blocked salmon / over-allocated water in a 7-jurisdiction basin), three different First Nations / Tribal leadership traditions. Universal lesson: the celebrated technical work (dam removal, environmental flows, cultural flows) is downstream of Indigenous-led political organising that preceded it by decades. Penobscot Nation organising in Maine; Yurok / Karuk / Klamath Tribes in the PNW; MLDRIN, NBAN, Barkindji, Ngarrindjeri, Yorta Yorta in Australia. The water comes back when the people who have been organising for generations are finally heard.'
    },
    climate: {
      title: 'Climate justice is a national-survival operating principle, not a Western moral overlay',
      text: 'You have now stewarded climate policy across Maine, the Marshall Islands, AND Bangladesh. Three different population scales (1.3M / 60K / 170M), three different sea-level-rise risks (significant / existential / displacement of 17M people). One universal pattern: the climate-justice sector is load-bearing in every single one. Maine\'s Pathway campaign collapses if justice support drops below 40. Marshall Islands\' "we are not drowning, we are fighting" framing is the foundation of every policy. Bangladesh\'s V20 leadership is what produces predictable climate finance. Equity is upstream of effectiveness in climate policy at every scale. The vulnerable nations have taught the wealthy nations this lesson; the wealthy nations are still partially learning it.'
    }
  };

  // Detect which families have both Maine+cross-region completion
  function getPairedFamilies(snapshots, scenarioSnaps) {
    var paired = [];
    Object.keys(FAMILY_PAIRING_INSIGHTS).forEach(function(famId) {
      var maineDone = snapshots.some(function(s) { return s.state.status === 'complete' && CAMPAIGN_FAMILY[s.campaign.id] === famId; });
      var scenarioDone = scenarioSnaps.some(function(s) { return s.state.status === 'complete' && s.scenario.family === famId; });
      if (maineDone && scenarioDone) paired.push(famId);
    });
    return paired;
  }

  // ── Compute a scenario's status from hub state ──
  function readScenarioState(hub, scenario) {
    var st = (hub && hub.scenarioStates && hub.scenarioStates[scenario.id]) || null;
    if (!st) return { status: 'notStarted', phase: 'briefing', step: 0, entities: null, outcome: null };
    if (st.phase === 'debrief' && st.outcome) return { status: 'complete', phase: 'debrief', step: scenario.decisions.length, entities: st.entities, outcome: st.outcome, decisionLog: st.decisionLog || [] };
    if (st.phase === 'playing') return { status: 'inProgress', phase: 'playing', step: st.step || 0, entities: st.entities, outcome: null, decisionLog: st.decisionLog || [] };
    return { status: st.phase === 'briefing' ? 'inProgress' : 'notStarted', phase: st.phase || 'briefing', step: st.step || 0, entities: st.entities || null, outcome: null, decisionLog: st.decisionLog || [] };
  }

  // ── Compute final outcome from entity averages ──
  function computeScenarioOutcome(scenario, entities) {
    var values = scenario.entities.map(function(ent) {
      var v = entities && entities[ent.id] != null ? entities[ent.id] : ent.init;
      v = Math.max(0, Math.min(100, v));
      // Handle inverted entities (e.g., elk pressure — lower is better)
      if (scenario.entityInverted && scenario.entityInverted[ent.id]) v = 100 - v;
      return v;
    });
    var avg = values.reduce(function(a, b) { return a + b; }, 0) / values.length;
    return scenarioTierFromAvg(avg);
  }

  function isScenarioTopTier(outcome) {
    return outcome && (outcome.tier === 'mastery' || outcome.tier === 'strong');
  }

  // ── Tool registration ──
  window.StemLab.registerTool('stewardshipHub', {
    icon: '🌍',
    label: 'Environmental Stewardship Campaigns',
    desc: 'Cross-campaign launcher across multiple regions and biomes. 5 deep Maine campaigns plus 10 cross-region scenarios across all five mechanic families: fire (Yarralin Australia, Karuk Northern California), conservation (Yellowstone wolves, Akagera Rwanda lions), public health (Mumbai dengue, Liberia 2014 Ebola), watershed (Klamath River, Murray–Darling Basin), climate (Marshall Islands atolls, Bangladesh delta). Same universal mechanics taught through grounded regional case studies. Family Pairing Insights unlock as you complete Maine + cross-region scenarios in the same mechanic family.',
    color: 'emerald',
    category: 'science',
    questHooks: [
      { id: 'launch_any_campaign', label: 'Launch any campaign or scenario', icon: '🌍', check: function(d) { var hub = (d && d.stewardshipHub) || {}; return !!hub.launchedAny; }, progress: function(d) { var hub = (d && d.stewardshipHub) || {}; return hub.launchedAny ? 'Done!' : 'Not yet'; } },
      { id: 'complete_one', label: 'Complete one', icon: '🌱', check: function(d) { return countCompletedFromTopLevel(d) >= 1; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/1 complete'; } },
      { id: 'complete_three', label: 'Complete three', icon: '🌿', check: function(d) { return countCompletedFromTopLevel(d) >= 3; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/3 complete'; } },
      { id: 'complete_five', label: 'Complete five — regional specialist', icon: '🏆', check: function(d) { return countCompletedFromTopLevel(d) >= 5; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/5 complete'; } },
      { id: 'complete_eight', label: 'Complete eight — cross-region steward', icon: '🌍', check: function(d) { return countCompletedFromTopLevel(d) >= 8; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/8 complete'; } },
      { id: 'complete_twelve', label: 'Complete twelve — multi-region steward', icon: '🪶', check: function(d) { return countCompletedFromTopLevel(d) >= 12; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/12 complete'; } },
      { id: 'complete_all_fifteen', label: 'Complete all fifteen — grandmaster', icon: '🌟', check: function(d) { return countCompletedFromTopLevel(d) >= 15; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/15 complete'; } }
    ],
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;
      var ArrowLeft = ctx.icons && ctx.icons.ArrowLeft;

      var hub = labToolData.stewardshipHub || {};
      function setHub(patch) {
        setLabToolData(function(prev) {
          return Object.assign({}, prev, { stewardshipHub: Object.assign({}, (prev && prev.stewardshipHub) || {}, patch) });
        });
      }

      // ── Campaign Comparison: pair-specific reflection prompts ──
      // 10 unique pairs from 5 campaigns. Each prompt is hand-written
      // to draw out the specific structural insight that pair surfaces.
      var PAIR_REFLECTIONS = {
        'mosaic+conserve': {
          title: 'Stewardship as multi-generational practice',
          text: 'Cultural Mosaic and Conservation Manager are both multi-year stewardship campaigns where the moves you make in year 2 only pay off in year 7. Mosaic\'s coppice plantings, Conservation Manager\'s wolf-support building. The discipline is the same: invest in slow infrastructure before you need it. What other domains in your life reward this kind of patience?'
        },
        'mosaic+outbreak': {
          title: 'Time scales of stewardship',
          text: 'Cultural Mosaic operates on 8 years; Outbreak Response on 26 weeks. The shorter time scale of pandemic response means your trust capital regenerates more slowly than your fire-return cycles do. Notice how the same kind of decision (a controversial intervention) carries different weight depending on how long the system has to recover. Real Maine planners juggle both time horizons in parallel.'
        },
        'mosaic+steward': {
          title: 'Actively tending land and water',
          text: 'Both campaigns are about active stewardship of physical Maine landscape: fire on the barrens, water in the streams. Both involve Wabanaki-led work as the historical and ongoing foundation. Both reward you for matching technique to season and to specific zones. Mosaic\'s riparian zone (sweetgrass, beaver) is literally the same physical place as Watershed Steward\'s floodplain wetlands.'
        },
        'mosaic+pathway': {
          title: 'Indigenous-led work as primary, not bolt-on',
          text: 'Both Cultural Mosaic and Climate Pathways center Indigenous-led work as foundational. Mosaic IS Wabanaki practice; Pathway\'s Climate Justice sector has the largest feedback-rule reach (low support there drags every other sector down). What pattern do you notice about how systems perform when Indigenous leadership is centered versus appended?'
        },
        'conserve+outbreak': {
          title: 'Trust and support as gating mechanisms',
          text: 'Conservation Manager\'s wolf reintroduction requires habitat 60+ AND public support 50+. Outbreak Response\'s vaccine uptake collapses when working-age trust drops below 40. In both cases, technical feasibility is downstream of social acceptance. The technical move you most want to make is often the one you most have to earn.'
        },
        'conserve+steward': {
          title: 'Keystone entities reshape entire systems',
          text: 'Wolves in Conservation Manager and beavers in Watershed Steward are both keystone species. A small change in their population produces large changes everywhere downstream. The lesson: in any complex system, identify your keystone first. Most of your effort should go into the entity whose effect ripples furthest.'
        },
        'conserve+pathway': {
          title: 'Cascades at the species and sector scale',
          text: 'Conservation Manager\'s trophic cascades (wolf-deer-forest) and Climate Pathway\'s sector cascades (clean-grid-transport-buildings) are structurally identical: high state in one entity unlocks accelerated change in another. The math is the same; only the units differ. This is what makes systems thinking transferable across domains.'
        },
        'outbreak+steward': {
          title: 'Constrained-hours public-resource management',
          text: 'Both Outbreak Response and Watershed Steward run a constrained hours budget per period. Both involve weighing politically expensive moves (mandates, dam removal) against trust-building moves (communication, citizen science). Both expose the same painful truth: the right intervention at the wrong time costs more than it gains.'
        },
        'outbreak+pathway': {
          title: 'Equity as foundation, not topping',
          text: 'Outbreak Response\'s equity-PHO badge requires elderly vaccination above 80 WITH maintained trust. Climate Pathway\'s Justice sector has the biggest feedback-rule reach across all five campaigns. In both, equity is a structural input to system performance, not a moral overlay. Watch what happens to ANY policy in either campaign when equity drops below 40.'
        },
        'steward+pathway': {
          title: 'Land-use decisions compound over decades',
          text: 'Watershed restoration on a 10-year scale and climate policy on a 40-year scale share the same fundamental pattern: land-use decisions compound. Riparian buffer plantings show up as cold-water trout populations 8 years later. Forest carbon protection shows up as adaptation co-benefits two decades later. The decisions feel small at the moment of action and only become visible at scale years later.'
        }
      };

      function pairKey(a, b) {
        var order = ['mosaic', 'conserve', 'outbreak', 'steward', 'pathway'];
        var ia = order.indexOf(a), ib = order.indexOf(b);
        if (ia < 0 || ib < 0 || ia === ib) return null;
        return ia < ib ? a + '+' + b : b + '+' + a;
      }

      function startComparison() { setHub({ comparing: { mode: 'selecting', a: null, b: null } }); }
      function closeComparison() { setHub({ comparing: null }); }
      function pickComparisonCampaign(id) {
        var cmp = hub.comparing || { mode: 'selecting', a: null, b: null };
        if (!cmp.a) {
          setHub({ comparing: { mode: 'selecting', a: id, b: null } });
        } else if (cmp.a === id) {
          // Deselect
          setHub({ comparing: { mode: 'selecting', a: null, b: null } });
        } else {
          setHub({ comparing: { mode: 'viewing', a: cmp.a, b: id } });
        }
      }

      function renderComparison() {
        var cmp = hub.comparing;
        if (!cmp) return null;
        var completedSnaps = snapshots.filter(function(s) { return s.state.status === 'complete'; });

        // ── Selection phase ──
        if (cmp.mode === 'selecting') {
          return h('div', { style: { maxWidth: 800, margin: '0 auto', padding: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
              h('button', { onClick: closeComparison, 'aria-label': 'Cancel comparison',
                style: { background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } }, '← Back to hub'),
              h('h2', { style: { margin: 0, color: '#a855f7', fontSize: 20 } }, '🔀 Compare two campaigns')
            ),
            h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.4)', borderRight: '1px solid rgba(168,85,247,0.4)', borderBottom: '1px solid rgba(168,85,247,0.4)', borderLeft: '3px solid #a855f7', marginBottom: 14, fontSize: 13, color: '#e9d5ff', lineHeight: 1.55 } },
              cmp.a
                ? 'Selected: ' + (CAMPAIGNS.find(function(c) { return c.id === cmp.a; }) || {}).label + '. Pick a second completed campaign to compare against.'
                : 'Pick any two of your completed campaigns. The hub will show them side-by-side with a pair-specific reflection prompt.'
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 } },
              completedSnaps.map(function(snap) {
                var c = snap.campaign;
                var picked = cmp.a === c.id;
                return h('button', { key: c.id, onClick: function() { pickComparisonCampaign(c.id); },
                  style: { padding: 12, borderRadius: 10, border: '2px solid ' + (picked ? c.color : '#334155'), background: picked ? c.color + '22' : '#0f172a', cursor: 'pointer', textAlign: 'left' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { style: { fontSize: 22 } }, c.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontWeight: 800, color: c.color, fontSize: 13 } }, c.label),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, c.scale)
                    ),
                    picked ? h('span', { style: { fontSize: 16, color: c.color } }, '✓') : null
                  )
                );
              })
            ),
            completedSnaps.length < 2 ? h('p', { style: { marginTop: 12, fontSize: 12, color: '#fbbf24', fontStyle: 'italic' } },
              'You need at least 2 completed campaigns to compare. Currently you have ' + completedSnaps.length + '.'
            ) : null
          );
        }

        // ── Viewing phase ──
        if (cmp.mode === 'viewing' && cmp.a && cmp.b) {
          var snapA = snapshots.find(function(s) { return s.campaign.id === cmp.a; });
          var snapB = snapshots.find(function(s) { return s.campaign.id === cmp.b; });
          if (!snapA || !snapB) { closeComparison(); return null; }
          var cA = snapA.campaign, cB = snapB.campaign;
          var sA = snapA.state, sB = snapB.state;
          var key = pairKey(cA.id, cB.id);
          var reflection = key ? PAIR_REFLECTIONS[key] : null;

          // Pull yearLog feedback-rule frequency for each
          var slotA = (labToolData[cA.toolDataKey]) || {};
          var slotB = (labToolData[cB.toolDataKey]) || {};
          var stateA = slotA[cA.stateField] || {};
          var stateB = slotB[cB.stateField] || {};
          var logA = stateA.yearLog || stateA.weekLog || [];
          var logB = stateB.yearLog || stateB.weekLog || [];

          function tallyRules(log) {
            var counts = {};
            log.forEach(function(snap) {
              var cs = snap.cascades || snap.feedbacks || snap.cascadesFired || [];
              cs.forEach(function(c) {
                var k = c.id || c.msg || 'unknown';
                counts[k] = (counts[k] || 0) + 1;
              });
            });
            return counts;
          }
          var rulesA = tallyRules(logA);
          var rulesB = tallyRules(logB);

          function ruleList(counts, color) {
            var keys = Object.keys(counts).sort(function(a, b) { return counts[b] - counts[a]; });
            if (keys.length === 0) return h('div', { style: { fontSize: 12, color: '#64748b', fontStyle: 'italic' } }, 'No feedback rules fired (or no log captured).');
            return h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              keys.map(function(k) {
                return h('div', { key: k, style: { fontSize: 12, color: '#cbd5e1' } },
                  h('span', { style: { color: color, fontWeight: 700, marginRight: 6 } }, '· ' + counts[k] + 'x'),
                  k
                );
              })
            );
          }

          function outcomeChip(c, outcome) {
            if (!outcome) return h('div', { style: { fontSize: 12, color: '#94a3b8' } }, 'No outcome');
            return h('div', { style: { padding: 10, borderRadius: 8, background: (outcome.color || '#86efac') + '15', borderLeft: '3px solid ' + (outcome.color || '#86efac') } },
              h('div', { style: { fontSize: 13, fontWeight: 700, color: outcome.color || '#86efac' } }, (outcome.icon || '🏆') + ' ' + (outcome.label || 'Complete')),
              h('p', { style: { margin: '4px 0 0', color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 } }, outcome.desc || '')
            );
          }

          return h('div', { style: { maxWidth: 900, margin: '0 auto', padding: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
              h('button', { onClick: closeComparison, 'aria-label': 'Back to hub',
                style: { background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } }, '← Back'),
              h('h2', { style: { margin: 0, color: '#a855f7', fontSize: 20 } }, '🔀 Campaign Comparison'),
              h('button', { onClick: function() { setHub({ comparing: { mode: 'selecting', a: null, b: null } }); },
                style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12 } }, 'Pick different pair')
            ),

            // Pair-specific reflection
            reflection ? h('div', {
              style: {
                padding: 14, borderRadius: 12, marginBottom: 14,
                background: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(56,189,248,0.04) 100%)',
                borderTop: '1px solid rgba(168,85,247,0.4)', borderRight: '1px solid rgba(168,85,247,0.4)', borderBottom: '1px solid rgba(168,85,247,0.4)', borderLeft: '4px solid #a855f7'
              }
            },
              h('div', { style: { fontSize: 11, color: '#a855f7', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, 'Pair reflection'),
              h('h3', { style: { margin: '0 0 6px', color: '#e9d5ff', fontSize: 16, fontWeight: 800 } }, reflection.title),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.65 } }, reflection.text)
            ) : null,

            // Side-by-side outcome and state cards
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 } },
              [{ c: cA, s: sA, log: logA, rules: rulesA }, { c: cB, s: sB, log: logB, rules: rulesB }].map(function(side) {
                return h('div', { key: side.c.id,
                  style: { background: '#0f172a', borderRadius: 12, padding: 14, borderLeft: '3px solid ' + side.c.color }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                    h('span', { style: { fontSize: 24 } }, side.c.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontWeight: 800, color: side.c.color, fontSize: 14 } }, side.c.label),
                      h('div', { style: { fontSize: 11, color: '#94a3b8' } }, side.c.scale)
                    )
                  ),
                  outcomeChip(side.c, side.s.outcome),
                  h('div', { style: { marginTop: 10, padding: 8, background: '#1e293b', borderRadius: 6, fontSize: 11, color: '#cbd5e1' } },
                    h('div', null, 'Difficulty: ' + (side.s.difficulty || 'Standard')),
                    h('div', null, 'Periods played: ' + side.log.length),
                    h('div', { style: { color: side.s.outcome && isTopTier(side.s.outcome) ? '#a855f7' : '#64748b', fontWeight: 700, marginTop: 4 } }, side.s.outcome && isTopTier(side.s.outcome) ? '🌟 Top-tier outcome' : '')
                  ),
                  h('div', { style: { marginTop: 10 } },
                    h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, 'Feedback rules fired'),
                    ruleList(side.rules, side.c.color)
                  )
                );
              })
            )
          );
        }

        closeComparison();
        return null;
      }

      // ── First-time onboarding tutorial ──
      // Five-step walkthrough that introduces the universal campaign
      // pattern before students pick a campaign. Auto-shows on first
      // hub visit. Returning players can re-launch via "Take the tour"
      // in the header. Dismissible at any step.
      var TUTORIAL_STEPS = [
        {
          icon: '🌍',
          title: 'Fifteen campaigns, two formats, five mechanic families',
          body: 'You have fifteen campaigns to choose from. Five are deep Maine anchor campaigns (multi-period simulations grounded in documented Maine practice — Wabanaki fire stewardship, wildlife conservation, public health, watershed restoration, climate policy). Ten are self-contained cross-region scenarios (4-decision, 5–10 minute experiences from Yarralin Australia, Karuk Northern California, Yellowstone, Akagera Rwanda, Mumbai monsoon dengue, Liberia 2014 Ebola, Klamath River, Murray–Darling Basin, Marshall Islands, and Bangladesh delta) that teach the same universal mechanic on different country. Same five mechanic families, two case studies per family minimum. Family Pairing Insights unlock as you complete a Maine anchor + a cross-region scenario in the same family.'
        },
        {
          icon: '🔁',
          title: 'The campaign loop',
          body: 'Every campaign cycles through four phases. Setup: pick a difficulty and read about the entities. Period (year, week, or 5-year period depending on the campaign): allocate stewardship hours to interventions on specific entities. Review: see how the system drifted and which events fired. Debrief at the end: see your outcome tier, a do-nothing comparison, and a trend chart. The pattern is the same in every campaign; the moves differ.'
        },
        {
          icon: '🔄',
          title: 'Feedback rules are the campaign\'s spine',
          body: 'Each campaign has 3 to 4 feedback rules that fire AFTER your actions resolve. They tie entities together. Wolves suppress deer (Conservation Manager). Beavers help salmon and brook trout (Watershed Steward). Clean grid unlocks transport electrification (Climate Pathways). Low working-age trust triggers vaccine refusal (Outbreak Response). Read the year-end review for which feedback rules fired this period; that is where the real strategy lives.'
        },
        {
          icon: '🔍',
          title: 'AI Reading: what it is and what it is NOT',
          body: 'Every campaign has a "Read the [land/county/watershed/etc] (AI)" button. This is an AI educator that reads your current state and offers coaching grounded in research and Maine case studies. It is NOT a Wabanaki person, NOT a real Public Health Officer, NOT a wildlife biologist, NOT an agency staff member. Real voices belong to real organizations: Wabanaki Public Health and Wellness, Maine Indian Basketmakers Alliance, Penobscot Nation CHPD, Maine CDC, Atlantic Salmon Federation, and others, named in every AI response disclaimer. The AI is a teaching helper, not an authority.'
        },
        {
          icon: '🌱',
          title: 'Choose your first campaign or scenario',
          body: 'No required order. Conservation Manager (Maine anchor) has the cleanest feedback rules for first-timers. Yellowstone Wolf Restoration is the textbook trophic cascade case study — a great first cross-region scenario after the Maine one. For shorter sessions try a cross-region scenario (5–10 min) first; for longer sessions try a Maine anchor (multi-period campaign). The strongest learning move: pair a Maine anchor with a cross-region scenario in the same mechanic family, then compare. After two completions the hub surfaces cross-campaign patterns you would not see from any single run.'
        }
      ];

      function startTutorial() { setHub({ tutorialStep: 0, tutorialSeen: false }); }
      function advanceTutorial() {
        var step = (hub.tutorialStep || 0);
        if (step + 1 >= TUTORIAL_STEPS.length) {
          setHub({ tutorialStep: null, tutorialSeen: true });
        } else {
          setHub({ tutorialStep: step + 1 });
        }
      }
      function backTutorial() {
        var step = (hub.tutorialStep || 0);
        if (step > 0) setHub({ tutorialStep: step - 1 });
      }
      function dismissTutorial() { setHub({ tutorialStep: null, tutorialSeen: true }); }

      function renderTutorial() {
        var step = hub.tutorialStep || 0;
        if (step >= TUTORIAL_STEPS.length) step = TUTORIAL_STEPS.length - 1;
        var s = TUTORIAL_STEPS[step];
        return h('div', {
          style: { maxWidth: 700, margin: '0 auto', padding: 16 },
          role: 'region', 'aria-label': 'Stewardship Hub onboarding tutorial'
        },
          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 } },
            h('div', null,
              h('h2', { style: { margin: 0, color: '#86efac', fontSize: 22, fontWeight: 900 } }, '🌍 Welcome to Environmental Stewardship Campaigns'),
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'A 5-step tour before your first campaign or scenario.')
            ),
            h('button', { onClick: dismissTutorial, 'aria-label': 'Skip tutorial',
              style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer' } }, 'Skip tour')
          ),

          // Step counter
          h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
            TUTORIAL_STEPS.map(function(_, i) {
              return h('div', { key: i,
                style: { flex: 1, height: 4, borderRadius: 2, background: i <= step ? '#86efac' : '#334155', transition: 'background 0.3s' }
              });
            })
          ),

          // Step content
          h('div', {
            style: {
              padding: 20, borderRadius: 14,
              background: 'linear-gradient(135deg, rgba(134,239,172,0.10) 0%, rgba(56,189,248,0.04) 100%)',
              borderTop: '1px solid rgba(134,239,172,0.4)', borderRight: '1px solid rgba(134,239,172,0.4)', borderBottom: '1px solid rgba(134,239,172,0.4)', borderLeft: '4px solid #86efac',
              marginBottom: 14
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 } },
              h('span', { style: { fontSize: 36 } }, s.icon),
              h('div', null,
                h('div', { style: { fontSize: 11, color: '#86efac', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' } }, 'Step ' + (step + 1) + ' of ' + TUTORIAL_STEPS.length),
                h('h3', { style: { margin: '2px 0 0', color: '#fff', fontSize: 18, fontWeight: 800 } }, s.title)
              )
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 } }, s.body)
          ),

          // Navigation
          h('div', { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } },
            step > 0 ? h('button', { onClick: backTutorial, 'aria-label': 'Previous step',
              style: { padding: '8px 16px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back') : null,
            h('div', { style: { flex: 1 } }),
            h('button', { onClick: advanceTutorial, 'aria-label': step === TUTORIAL_STEPS.length - 1 ? 'Finish tutorial' : 'Next step',
              style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              step === TUTORIAL_STEPS.length - 1 ? 'Got it, take me to the hub →' : 'Next →')
          )
        );
      }

      // ── Printable Campaign Report mode ──
      // When hub.viewingReport is set to a campaign id, the hub renders a
      // clean printable summary of that completed campaign (instead of the
      // main hub view). The report is designed for browser print preview
      // and EL-style "exhibitions of learning" portfolios.
      function viewReport(id) { setHub({ viewingReport: id }); }
      function closeReport() { setHub({ viewingReport: null }); }
      function printReport() { try { window.print(); } catch (e) { /* print not available */ } }

      function renderCampaignReport(campaignId) {
        var c = CAMPAIGNS.find(function(x) { return x.id === campaignId; });
        if (!c) return null;
        var slot = (labToolData[c.toolDataKey]) || {};
        var state = slot[c.stateField] || {};
        var outcome = state.finalOutcome || null;
        var yearLog = state.yearLog || state.weekLog || [];
        var entities = state.zones || state.species || state.groups || state.components || state.sectors || [];

        // Pull the entity definitions from the campaign-specific arrays
        // (these were duplicated in each tool file, so the hub does not
        // import them directly; we render with whatever the state holds).
        var entityFieldMap = {
          mosaic: { name: 'Zone', metricLabel: 'Health' },
          conserve: { name: 'Species', metricLabel: 'Population' },
          outbreak: { name: 'Demographic', metricLabel: 'Vaccinated' },
          steward: { name: 'Component', metricLabel: 'Quality' },
          pathway: { name: 'Sector', metricLabel: 'Decarbonization' }
        };
        var fm = entityFieldMap[campaignId] || { name: 'Entity', metricLabel: 'Score' };

        function primaryMetric(entity) {
          if (campaignId === 'mosaic') return entity.health;
          if (campaignId === 'conserve') return entity.pop;
          if (campaignId === 'outbreak') return entity.vaccinated;
          if (campaignId === 'steward') return entity.quality;
          if (campaignId === 'pathway') return entity.decarb;
          return 0;
        }

        // Collect the year-by-year event log highlights
        var eventHighlights = yearLog.map(function(snap) {
          return {
            label: snap.year ? ('Year/Period ' + snap.year) : 'Period',
            event: (snap.event || snap.eventName || 'quiet'),
            cascades: snap.cascades || snap.feedbacks || snap.cascadesFired || []
          };
        });

        return h('div', {
          id: 'stewardship-campaign-report',
          style: {
            maxWidth: 720, margin: '0 auto', padding: 24,
            background: '#fff', color: '#0f172a',
            borderRadius: 14, border: '1px solid #cbd5e1'
          }
        },
          // Print-only CSS: hide everything except this report
          h('style', null,
            '@media print { body * { visibility: hidden !important; } ' +
            '#stewardship-campaign-report, #stewardship-campaign-report * { visibility: visible !important; } ' +
            '#stewardship-campaign-report { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; } ' +
            '.no-print { display: none !important; } }'
          ),

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingBottom: 14, borderBottom: '2px solid ' + c.color } },
            h('span', { style: { fontSize: 40 } }, c.icon),
            h('div', { style: { flex: 1 } },
              h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } }, 'Maine Stewardship Campaign Report'),
              h('h2', { style: { margin: '4px 0 0', color: c.color, fontSize: 24, fontWeight: 900 } }, c.label),
              h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, c.scale + ' · ' + c.mechanic)
            ),
            h('div', { className: 'no-print', style: { display: 'flex', gap: 6 } },
              h('button', { onClick: printReport, 'aria-label': 'Print this report',
                style: { padding: '6px 14px', borderRadius: 8, border: '1px solid #15803d', background: '#15803d', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 12 } }, '🖨 Print'),
              h('button', { onClick: closeReport, 'aria-label': 'Close report',
                style: { padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 700, fontSize: 12 } }, '← Back')
            )
          ),

          // Final outcome
          outcome ? h('div', {
            style: { padding: 14, borderRadius: 10, marginBottom: 16, background: (outcome.color || '#86efac') + '18', border: '1px solid ' + (outcome.color || '#86efac') + '66' }
          },
            h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, 'Final outcome'),
            h('div', { style: { fontSize: 18, fontWeight: 800, color: outcome.color || '#0f172a' } }, (outcome.icon || '🏆') + ' ' + (outcome.label || 'Complete')),
            h('p', { style: { margin: '6px 0 0', color: '#334155', fontSize: 13, lineHeight: 1.55 } }, outcome.desc || '')
          ) : null,

          // Campaign metadata
          h('div', {
            style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 16, padding: 12, background: '#f1f5f9', borderRadius: 8 }
          },
            h('div', null,
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Difficulty'),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#0f172a' } }, state.difficulty || 'Standard')
            ),
            h('div', null,
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Periods played'),
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#0f172a' } }, yearLog.length + ' of ' + (state.maxYears || state.maxWeeks || c.defaultMaxYears))
            ),
            h('div', null,
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 } }, 'Campaign seed'),
              h('div', { style: { fontSize: 11, fontWeight: 700, fontFamily: 'ui-monospace, monospace', color: '#0f172a' } }, state.seed || 'unsaved')
            )
          ),

          // Final entity state
          entities.length > 0 ? h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Final ' + fm.name + ' State'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 } },
              entities.map(function(e) {
                var pm = primaryMetric(e);
                return h('div', { key: e.id, style: { padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' } },
                  h('div', { style: { fontSize: 12, fontWeight: 700, color: '#0f172a' } }, e.id),
                  h('div', { style: { fontSize: 11, color: '#475569', marginTop: 2 } }, fm.metricLabel + ': ' + Math.round(pm || 0))
                );
              })
            )
          ) : null,

          // Event log highlights
          eventHighlights.length > 0 ? h('div', { style: { marginBottom: 16 } },
            h('div', { style: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Campaign Log'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
              eventHighlights.map(function(eh, i) {
                return h('div', { key: i, style: { padding: '6px 10px', background: '#f8fafc', borderLeft: '3px solid ' + c.color, borderRadius: 4, fontSize: 12, color: '#334155' } },
                  h('strong', null, eh.label + ': '),
                  eh.event,
                  eh.cascades && eh.cascades.length > 0 ? h('div', { style: { marginTop: 2, fontSize: 11, color: '#64748b', fontStyle: 'italic' } },
                    '↳ ' + eh.cascades.map(function(c) { return c.msg; }).join(' · ')
                  ) : null
                );
              })
            )
          ) : null,

          // Signature line
          h('div', {
            style: { marginTop: 24, paddingTop: 16, borderTop: '1px dashed #cbd5e1', display: 'flex', gap: 32, fontSize: 11, color: '#475569' }
          },
            h('div', { style: { flex: 1 } },
              h('div', { style: { borderTop: '1px solid #0f172a', paddingTop: 4 } }, 'Student name'),
              h('div', { style: { marginTop: 16, borderTop: '1px solid #0f172a', paddingTop: 4 } }, 'Date')
            ),
            h('div', { style: { flex: 1 } },
              h('div', { style: { borderTop: '1px solid #0f172a', paddingTop: 4 } }, 'Reflection (one thing you learned)'),
              h('div', { style: { marginTop: 16, borderTop: '1px solid #0f172a', paddingTop: 4 } }, 'Teacher signature')
            )
          ),

          h('div', { style: { marginTop: 18, fontSize: 10, color: '#94a3b8', textAlign: 'center', fontStyle: 'italic' } },
            'Generated by Environmental Stewardship Campaigns · AlloFlow · Campaign data is a teaching simplification grounded in documented practice.'
          )
        );
      }

      // ════════════════════════════════════════════════════════════
      // ── Self-contained scenario player ──
      // Used for non-Maine scenarios stored in SCENARIOS_LIBRARY.
      // State lives entirely in hub.scenarioStates[scenarioId].
      // ════════════════════════════════════════════════════════════
      function setScenarioState(scenarioId, patch) {
        setLabToolData(function(prev) {
          var hubPrev = (prev && prev.stewardshipHub) || {};
          var statesPrev = hubPrev.scenarioStates || {};
          var curr = statesPrev[scenarioId] || {};
          var next = Object.assign({}, curr, patch);
          var newStates = Object.assign({}, statesPrev);
          newStates[scenarioId] = next;
          return Object.assign({}, prev, {
            stewardshipHub: Object.assign({}, hubPrev, { scenarioStates: newStates, launchedAny: true })
          });
        });
      }
      function openScenario(scenarioId) {
        setHub({ playingScenario: scenarioId, launchedAny: true });
        if (announceToSR) announceToSR('Opening scenario');
      }
      function closeScenario() { setHub({ playingScenario: null }); }
      function resetScenario(scenarioId) {
        setLabToolData(function(prev) {
          var hubPrev = (prev && prev.stewardshipHub) || {};
          var statesPrev = hubPrev.scenarioStates || {};
          var newStates = Object.assign({}, statesPrev);
          delete newStates[scenarioId];
          return Object.assign({}, prev, { stewardshipHub: Object.assign({}, hubPrev, { scenarioStates: newStates }) });
        });
      }
      function beginScenarioPlay(scenario) {
        var initial = {};
        scenario.entities.forEach(function(ent) { initial[ent.id] = ent.init; });
        setScenarioState(scenario.id, { phase: 'playing', step: 0, entities: initial, decisionLog: [] });
        if (announceToSR) announceToSR('Scenario started');
      }
      function chooseScenarioOption(scenario, decisionIndex, option) {
        var st = (hub && hub.scenarioStates && hub.scenarioStates[scenario.id]) || {};
        var entities = Object.assign({}, st.entities || {});
        Object.keys(option.effects || {}).forEach(function(k) {
          var curr = entities[k] != null ? entities[k] : 0;
          entities[k] = Math.max(0, Math.min(100, curr + option.effects[k]));
        });
        var newLog = (st.decisionLog || []).concat([{ step: decisionIndex, optionId: option.id, label: option.label, narrative: option.narrative }]);
        var nextStep = decisionIndex + 1;
        if (nextStep >= scenario.decisions.length) {
          var outcome = computeScenarioOutcome(scenario, entities);
          setScenarioState(scenario.id, { phase: 'debrief', step: nextStep, entities: entities, decisionLog: newLog, outcome: outcome });
          if (announceToSR) announceToSR('Scenario complete: ' + outcome.label);
          if (typeof ctx.addXP === 'function') ctx.addXP(20, 'Stewardship scenario complete');
        } else {
          setScenarioState(scenario.id, { phase: 'playing', step: nextStep, entities: entities, decisionLog: newLog });
          if (announceToSR) announceToSR('Decision recorded. Moving to step ' + (nextStep + 1));
        }
      }

      function renderScenarioPlay(scenarioId) {
        var scenario = SCENARIOS_LIBRARY.find(function(s) { return s.id === scenarioId; });
        if (!scenario) return null;
        var st = (hub.scenarioStates && hub.scenarioStates[scenarioId]) || null;
        var phase = st ? st.phase : 'briefing';
        var familyMeta = FAMILY_COLORS[scenario.family] || { primary: '#86efac', accent: '#86efac' };

        // ── Briefing phase ──
        if (!st || phase === 'briefing') {
          return h('div', { style: { maxWidth: 800, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': scenario.label + ' briefing' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
              h('button', { onClick: closeScenario, 'aria-label': 'Back to hub',
                style: { background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } }, '← Back to hub'),
              h('span', { style: { fontSize: 36 } }, scenario.icon),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } }, scenario.regionFlag + ' ' + scenario.region),
                h('h2', { style: { margin: '2px 0 0', color: scenario.color, fontSize: 22, fontWeight: 900 } }, scenario.label),
                h('div', { style: { fontSize: 12, color: '#fbbf24', marginTop: 4, fontStyle: 'italic' } }, scenario.scale + ' · ' + scenario.mechanic)
              )
            ),
            h('div', {
              style: { padding: 16, borderRadius: 12, background: 'rgba(15,23,42,0.7)', border: '1px solid ' + scenario.color + '55', borderLeft: '4px solid ' + scenario.color, marginBottom: 14 }
            },
              h('div', { style: { fontSize: 11, color: scenario.color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, 'Briefing'),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.7 } }, scenario.briefing)
            ),
            h('div', { style: { marginBottom: 14 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Entities you steward'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 } },
                scenario.entities.map(function(ent) {
                  return h('div', { key: ent.id, style: { padding: 10, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                      h('span', { style: { fontSize: 22 } }, ent.icon),
                      h('div', null,
                        h('div', { style: { fontWeight: 800, color: '#cbd5e1', fontSize: 13 } }, ent.name),
                        h('div', { style: { fontSize: 11, color: '#94a3b8' } }, ent.label + ' · starts at ' + ent.init)
                      )
                    )
                  );
                })
              )
            ),
            h('div', {
              style: { padding: 12, borderRadius: 10, background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', marginBottom: 14, fontSize: 12.5, color: '#fef3c7', lineHeight: 1.55 }
            },
              h('strong', null, '⚠️ AI scenario notice: '),
              scenario.aiDisclaimer
            ),
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { onClick: function() { beginScenarioPlay(scenario); }, 'aria-label': 'Begin scenario',
                style: { padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, ' + scenario.color + ' 0%, ' + scenario.color + 'cc 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } }, 'Begin scenario →'),
              h('button', { onClick: closeScenario, 'aria-label': 'Cancel',
                style: { padding: '10px 16px', borderRadius: 10, border: '1px solid #334155', cursor: 'pointer', background: 'transparent', color: '#cbd5e1', fontWeight: 700, fontSize: 13 } }, 'Cancel')
            )
          );
        }

        // ── Playing phase ──
        if (phase === 'playing') {
          var step = st.step || 0;
          var decision = scenario.decisions[step];
          if (!decision) return null;
          return h('div', { style: { maxWidth: 820, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': scenario.label + ', decision ' + (step + 1) },
            // Header bar
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
              h('button', { onClick: closeScenario, 'aria-label': 'Pause and return to hub',
                style: { background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } }, '← Pause'),
              h('span', { style: { fontSize: 28 } }, scenario.icon),
              h('div', { style: { flex: 1, minWidth: 220 } },
                h('div', { style: { fontWeight: 800, color: scenario.color, fontSize: 16 } }, scenario.label),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, scenario.region)
              ),
              h('div', { style: { fontSize: 12, color: '#fbbf24', fontWeight: 700 } }, scenario.yearLabel + ' ' + (step + 1) + ' of ' + scenario.decisions.length)
            ),
            // Progress dots
            h('div', { style: { display: 'flex', gap: 6, marginBottom: 14 } },
              scenario.decisions.map(function(_, i) {
                return h('div', { key: i, style: { flex: 1, height: 4, borderRadius: 2, background: i < step ? scenario.color : (i === step ? '#fbbf24' : '#334155'), transition: 'background 0.3s' } });
              })
            ),
            // Entity strip
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 6, marginBottom: 14, padding: 10, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              scenario.entities.map(function(ent) {
                var v = (st.entities && st.entities[ent.id] != null) ? st.entities[ent.id] : ent.init;
                var inverted = scenario.entityInverted && scenario.entityInverted[ent.id];
                var displayV = Math.round(v);
                var barColor = (inverted ? (100 - v) : v) >= 60 ? '#86efac' : (inverted ? (100 - v) : v) >= 30 ? '#fbbf24' : '#dc2626';
                return h('div', { key: ent.id },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 } },
                    h('span', { style: { fontSize: 14 } }, ent.icon),
                    h('span', { style: { fontSize: 11, color: '#cbd5e1', fontWeight: 700, flex: 1 } }, ent.name),
                    h('span', { style: { fontSize: 11, color: barColor, fontWeight: 800 } }, displayV)
                  ),
                  h('div', { style: { height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' } },
                    h('div', { style: { width: v + '%', height: '100%', background: barColor, transition: 'width 0.5s' } })
                  )
                );
              })
            ),
            // Decision prompt
            h('div', {
              style: { padding: 14, borderRadius: 12, background: 'rgba(15,23,42,0.7)', border: '1px solid ' + scenario.color + '55', borderLeft: '4px solid ' + scenario.color, marginBottom: 14 }
            },
              h('div', { style: { fontSize: 11, color: scenario.color, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, decision.period),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 14, lineHeight: 1.65 } }, decision.prompt)
            ),
            // Options
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              decision.options.map(function(opt) {
                return h('button', { key: opt.id, onClick: function() { chooseScenarioOption(scenario, step, opt); }, 'aria-label': 'Choose: ' + opt.label,
                  style: {
                    padding: 14, borderRadius: 10, border: '1px solid #334155', cursor: 'pointer',
                    background: '#0f172a', color: '#e2e8f0', textAlign: 'left',
                    fontSize: 13.5, lineHeight: 1.55, fontWeight: 600, transition: 'all 0.2s'
                  },
                  onMouseEnter: function(e) { e.target.style.borderColor = scenario.color; e.target.style.background = 'rgba(15,23,42,0.9)'; },
                  onMouseLeave: function(e) { e.target.style.borderColor = '#334155'; e.target.style.background = '#0f172a'; }
                }, opt.label);
              })
            ),
            // Recent decision log
            (st.decisionLog && st.decisionLog.length > 0) ? h('details', { style: { marginTop: 16, padding: '10px 14px', borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              h('summary', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 } }, '📓 Decisions so far'),
              h('div', { style: { marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 } },
                st.decisionLog.map(function(entry, i) {
                  return h('div', { key: i, style: { padding: 8, borderRadius: 6, background: '#1e293b', borderLeft: '3px solid ' + scenario.color } },
                    h('div', { style: { fontSize: 11, color: scenario.color, fontWeight: 700, marginBottom: 2 } }, scenario.yearLabel + ' ' + (entry.step + 1) + ' · ' + (scenario.decisions[entry.step] ? scenario.decisions[entry.step].period : '')),
                    h('div', { style: { fontSize: 12, color: '#cbd5e1', marginBottom: 4 } }, entry.label),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '↳ ' + entry.narrative)
                  );
                })
              )
            ) : null
          );
        }

        // ── Debrief phase ──
        if (phase === 'debrief') {
          var outcome = st.outcome;
          return h('div', { style: { maxWidth: 820, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': scenario.label + ' debrief' },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' } },
              h('button', { onClick: closeScenario, 'aria-label': 'Back to hub',
                style: { background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 } }, '← Back to hub'),
              h('span', { style: { fontSize: 36 } }, scenario.icon),
              h('div', { style: { flex: 1, minWidth: 200 } },
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, scenario.regionFlag + ' ' + scenario.region),
                h('h2', { style: { margin: '2px 0 0', color: scenario.color, fontSize: 20, fontWeight: 900 } }, scenario.label + ' · Debrief')
              )
            ),
            // Outcome tier
            h('div', {
              style: { padding: 18, borderRadius: 12, marginBottom: 16, background: (outcome.color || '#86efac') + '18', border: '2px solid ' + (outcome.color || '#86efac') + '88', borderLeft: '4px solid ' + (outcome.color || '#86efac') }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                h('span', { style: { fontSize: 36 } }, outcome.icon || '🏆'),
                h('div', null,
                  h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 } }, 'Final outcome'),
                  h('h3', { style: { margin: '2px 0 0', color: outcome.color || '#86efac', fontSize: 20, fontWeight: 900 } }, outcome.label)
                )
              ),
              h('p', { style: { margin: '8px 0 0', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.6 } }, outcome.desc)
            ),
            // Final entity state
            h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Final entity state'),
              h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 } },
                scenario.entities.map(function(ent) {
                  var v = (st.entities && st.entities[ent.id] != null) ? st.entities[ent.id] : ent.init;
                  var inverted = scenario.entityInverted && scenario.entityInverted[ent.id];
                  var effective = inverted ? 100 - v : v;
                  var barColor = effective >= 60 ? '#86efac' : effective >= 30 ? '#fbbf24' : '#dc2626';
                  var delta = Math.round(v - ent.init);
                  return h('div', { key: ent.id, style: { padding: 10, borderRadius: 8, background: '#0f172a', border: '1px solid #1e293b' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                      h('span', { style: { fontSize: 18 } }, ent.icon),
                      h('div', { style: { flex: 1 } },
                        h('div', { style: { fontWeight: 700, fontSize: 12, color: '#cbd5e1' } }, ent.name),
                        h('div', { style: { fontSize: 10, color: '#94a3b8' } }, ent.label)
                      ),
                      h('div', { style: { textAlign: 'right' } },
                        h('div', { style: { fontSize: 14, fontWeight: 900, color: barColor } }, Math.round(v)),
                        h('div', { style: { fontSize: 10, color: delta >= 0 ? '#86efac' : '#f87171', fontWeight: 700 } }, (delta >= 0 ? '+' : '') + delta)
                      )
                    ),
                    h('div', { style: { height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden' } },
                      h('div', { style: { width: v + '%', height: '100%', background: barColor } })
                    )
                  );
                })
              )
            ),
            // Decision log
            (st.decisionLog && st.decisionLog.length > 0) ? h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 8 } }, 'Your decision path'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                st.decisionLog.map(function(entry, i) {
                  return h('div', { key: i, style: { padding: 10, borderRadius: 8, background: '#0f172a', borderLeft: '3px solid ' + scenario.color, fontSize: 12.5, color: '#cbd5e1' } },
                    h('div', { style: { fontWeight: 700, color: scenario.color, marginBottom: 3 } }, scenario.yearLabel + ' ' + (entry.step + 1) + ' · ' + (scenario.decisions[entry.step] ? scenario.decisions[entry.step].period : '')),
                    h('div', { style: { marginBottom: 4 } }, entry.label),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '↳ ' + entry.narrative)
                  );
                })
              )
            ) : null,
            // Synthesis
            h('div', {
              style: { padding: 14, borderRadius: 12, marginBottom: 16, background: 'rgba(168,85,247,0.10)', borderTop: '1px solid rgba(168,85,247,0.4)', borderRight: '1px solid rgba(168,85,247,0.4)', borderBottom: '1px solid rgba(168,85,247,0.4)', borderLeft: '3px solid #a855f7' }
            },
              h('div', { style: { fontSize: 11, color: '#a855f7', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 } }, '🧠 Cross-region synthesis'),
              h('p', { style: { margin: 0, color: '#e9d5ff', fontSize: 13.5, lineHeight: 1.65 } }, scenario.synthesis)
            ),
            // Sources
            h('details', { open: false, style: { marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b' } },
              h('summary', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 } }, '📚 Cited organizations and sources'),
              h('ul', { style: { margin: '10px 0 0 18px', padding: 0, fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.65 } },
                scenario.sources.map(function(src, i) { return h('li', { key: i }, src); })
              ),
              h('div', { style: { marginTop: 10, padding: 8, background: '#1e293b', borderRadius: 6, fontSize: 11, color: '#fef3c7', fontStyle: 'italic' } },
                scenario.aiDisclaimer
              )
            ),
            // Actions
            h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
              h('button', { onClick: function() { resetScenario(scenario.id); beginScenarioPlay(scenario); }, 'aria-label': 'Replay scenario',
                style: { padding: '10px 18px', borderRadius: 10, border: '1px solid ' + scenario.color, cursor: 'pointer', background: 'transparent', color: scenario.color, fontWeight: 700, fontSize: 13 } }, '↻ Replay'),
              h('button', { onClick: closeScenario, 'aria-label': 'Back to hub',
                style: { padding: '10px 18px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, ' + scenario.color + ' 0%, ' + scenario.color + 'cc 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '← Back to hub')
            )
          );
        }
        return null;
      }

      // Compute state snapshots for each campaign
      var snapshots = CAMPAIGNS.map(function(c) {
        return { campaign: c, state: readCampaignState(labToolData, c) };
      });
      var completedCount = snapshots.filter(function(s) { return s.state.status === 'complete'; }).length;
      var inProgressCount = snapshots.filter(function(s) { return s.state.status === 'inProgress'; }).length;
      var topTierCount = snapshots.filter(function(s) { return s.state.status === 'complete' && isTopTier(s.state.outcome); }).length;
      // Mastery tiers now count both Maine campaigns AND non-Maine scenarios
      var totalCompleteForTier = completedCount + ((hub.scenarioStates ? Object.keys(hub.scenarioStates) : []).filter(function(id) {
        var st = hub.scenarioStates[id];
        return st && st.phase === 'debrief' && st.outcome;
      }).length);
      var totalTopTierForTier = topTierCount + ((hub.scenarioStates ? Object.keys(hub.scenarioStates) : []).filter(function(id) {
        var st = hub.scenarioStates[id];
        return st && st.phase === 'debrief' && st.outcome && isScenarioTopTier(st.outcome);
      }).length);
      var earnedTiers = STEWARDSHIP_TIERS.filter(function(t) {
        if (t.requireTopTier) return totalTopTierForTier >= t.minComplete;
        return totalCompleteForTier >= t.minComplete;
      });

      function launchCampaign(c) {
        // Pre-set the host tool's tab or mode so the user lands in the right place
        var patch = {};
        var existing = (labToolData[c.toolDataKey]) || {};
        var fieldPatch = Object.assign({}, existing);
        fieldPatch[c.tabField] = c.tabValue;
        patch[c.toolDataKey] = fieldPatch;
        // Also mark that the hub has launched at least one campaign
        patch.stewardshipHub = Object.assign({}, hub, { launchedAny: true });
        setLabToolData(function(prev) { return Object.assign({}, prev, patch); });
        if (addToast) addToast('Launching ' + c.label + '...', 'info');
        if (announceToSR) announceToSR('Opening ' + c.label);
        // Navigate into the host tool
        setTimeout(function() { setStemLabTool(c.hostTool); }, 50);
      }

      // If the user is comparing two campaigns, render that
      if (hub.comparing) {
        return renderComparison();
      }

      // If the user is viewing a campaign report, render that instead of the main hub
      if (hub.viewingReport) {
        return renderCampaignReport(hub.viewingReport);
      }

      // If the user is playing a self-contained scenario, render that
      if (hub.playingScenario) {
        return renderScenarioPlay(hub.playingScenario);
      }

      // Compute scenario snapshots (self-contained scenarios from SCENARIOS_LIBRARY)
      var scenarioSnaps = SCENARIOS_LIBRARY.map(function(sc) {
        return { scenario: sc, state: readScenarioState(hub, sc) };
      });
      var scenarioCompleted = scenarioSnaps.filter(function(s) { return s.state.status === 'complete'; }).length;
      var scenarioTopTier = scenarioSnaps.filter(function(s) { return s.state.status === 'complete' && isScenarioTopTier(s.state.outcome); }).length;

      // Combined counts (Maine campaigns + scenarios) for mastery tier display
      var totalComplete = completedCount + scenarioCompleted;
      var totalTopTier = topTierCount + scenarioTopTier;
      var totalAvailable = CAMPAIGNS.length + SCENARIOS_LIBRARY.length;

      // Tutorial: auto-show on first visit (no tutorialSeen flag AND no launchedAny),
      // OR show when the user explicitly relaunches the tour (tutorialStep is a number).
      var firstTimeUser = !hub.tutorialSeen && !hub.launchedAny && completedCount === 0 && inProgressCount === 0;
      if (hub.tutorialStep !== null && hub.tutorialStep !== undefined) {
        return renderTutorial();
      }
      if (firstTimeUser) {
        // Auto-show tutorial on very first visit
        return renderTutorial();
      }

      return h('div', {
        style: { maxWidth: 900, margin: '0 auto', padding: 16 },
        role: 'region',
        'aria-label': 'Environmental Stewardship Campaigns hub'
      },
        // Header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
          ArrowLeft ? h('button', { onClick: function() { setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back') : null,
          h('div', { style: { flex: 1, minWidth: 280 } },
            h('h2', { style: { margin: 0, color: '#86efac', fontSize: 22, fontWeight: 900 } }, '🌍 Environmental Stewardship Campaigns'),
            h('div', { style: { fontSize: 13, color: '#94a3b8', marginTop: 4, maxWidth: 720, lineHeight: 1.55 } }, 'Fifteen environmental stewardship campaigns across eleven regions. Five deep multi-period Maine anchor campaigns (your case studies for fire-return intervals, trophic cascades, public-health trust, hydrological cascades, climate-policy interdependence) plus ten self-contained cross-region scenarios (Yarralin Australia, Karuk Northern California, Yellowstone wolves, Akagera Rwanda lions, Mumbai monsoon dengue, Liberia 2014 Ebola, Klamath River, Murray–Darling Basin, Marshall Islands atolls, Bangladesh delta) that teach the same universal mechanics on different country. Every mechanic family now has at least two cross-region case studies for direct comparison.')
          ),
          h('button', { onClick: startTutorial, 'aria-label': 'Take the 5-step tour',
            title: 'Re-launch the onboarding tutorial',
            style: { background: 'rgba(134,239,172,0.10)', border: '1px solid #86efac', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#86efac', fontSize: 12, fontWeight: 700 } }, '🧭 Take the tour')
        ),

        // Aggregate progress strip
        h('div', {
          style: {
            padding: 14, borderRadius: 12, marginBottom: 16,
            background: 'linear-gradient(135deg, rgba(21,128,61,0.18) 0%, rgba(56,189,248,0.06) 100%)',
            borderTop: '1px solid rgba(134,239,172,0.4)', borderRight: '1px solid rgba(134,239,172,0.4)', borderBottom: '1px solid rgba(134,239,172,0.4)', borderLeft: '4px solid #16a34a',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10
          }
        },
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Campaigns + scenarios complete'),
            h('div', { style: { fontSize: 26, fontWeight: 900, color: '#86efac' } }, totalComplete + ' / ' + totalAvailable)
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'In progress'),
            h('div', { style: { fontSize: 26, fontWeight: 900, color: '#fbbf24' } }, inProgressCount)
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Top-tier outcomes'),
            h('div', { style: { fontSize: 26, fontWeight: 900, color: '#a855f7' } }, totalTopTier + ' / ' + totalAvailable)
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Stewardship tier'),
            h('div', { style: { fontSize: 16, fontWeight: 900, color: '#86efac' } }, earnedTiers.length > 0 ? earnedTiers[earnedTiers.length - 1].icon + ' ' + earnedTiers[earnedTiers.length - 1].label : '🌑 Not yet earned')
          )
        ),

        // Mastery tier track
        h('div', { style: { background: '#0f172a', borderRadius: 12, padding: 14, marginBottom: 16, border: '1px solid #1e293b' } },
          h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 10 } }, 'Cross-campaign mastery'),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 } },
            STEWARDSHIP_TIERS.map(function(t) {
              var earned = t.requireTopTier ? totalTopTierForTier >= t.minComplete : totalCompleteForTier >= t.minComplete;
              return h('div', {
                key: t.id,
                style: {
                  background: earned ? 'rgba(134,239,172,0.10)' : '#1e293b',
                  border: '1px solid ' + (earned ? '#86efac' : '#334155'),
                  borderRadius: 10, padding: 10, opacity: earned ? 1 : 0.6
                }
              },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                  h('span', { style: { fontSize: 20 } }, t.icon),
                  h('strong', { style: { color: earned ? '#86efac' : '#cbd5e1', fontSize: 13 } }, t.label)
                ),
                h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4 } }, t.desc),
                earned ? h('div', { style: { fontSize: 11, color: '#86efac', marginTop: 4, fontWeight: 700 } }, '✓ Earned') : null
              );
            })
          )
        ),

        // Cross-campaign synthesis (appears at 2+ completions)
        (function() {
          if (completedCount < 2) return null;
          var completedIds = snapshots.filter(function(s) { return s.state.status === 'complete'; }).map(function(s) { return s.campaign.id; });
          // Show patterns where at least 2 of the player's completed campaigns participate
          var applicable = SYNTHESIS_PATTERNS.filter(function(p) {
            var hits = p.campaigns.filter(function(cid) { return completedIds.indexOf(cid) >= 0; });
            return hits.length >= 2;
          });
          if (applicable.length === 0) return null;
          return h('div', {
            style: {
              marginBottom: 16, padding: 16, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.14) 0%, rgba(56,189,248,0.04) 100%)',
              borderTop: '1px solid rgba(168,85,247,0.4)', borderRight: '1px solid rgba(168,85,247,0.4)', borderBottom: '1px solid rgba(168,85,247,0.4)', borderLeft: '4px solid #a855f7'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 24 } }, '🧠'),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('h3', { style: { margin: 0, color: '#c4b5fd', fontSize: 16, fontWeight: 800 } }, 'Cross-Campaign Synthesis'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, 'Patterns that show up across the campaigns you have completed (' + completedCount + ' / 5). These are the structural insights the five campaigns are designed to teach together.')
              ),
              h('button', { onClick: startComparison, 'aria-label': 'Compare two of your completed campaigns side by side',
                style: { background: 'rgba(168,85,247,0.18)', border: '1px solid #a855f7', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', color: '#e9d5ff', fontSize: 12, fontWeight: 700 } }, '🔀 Compare two campaigns')
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 10 } },
              applicable.map(function(p) {
                var hitIds = p.campaigns.filter(function(cid) { return completedIds.indexOf(cid) >= 0; });
                var hitNames = hitIds.map(function(cid) {
                  var c = CAMPAIGNS.find(function(x) { return x.id === cid; });
                  return c ? c.icon + ' ' + c.label : cid;
                });
                return h('div', { key: p.id,
                  style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.7)', border: '1px solid rgba(168,85,247,0.2)' }
                },
                  h('div', { style: { fontSize: 13.5, fontWeight: 800, color: '#e9d5ff', marginBottom: 6 } }, p.title),
                  h('p', { style: { margin: '0 0 8px', color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.55 } }, p.insight),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } },
                    'Visible in your completed runs: ' + hitNames.join(' · ')
                  )
                );
              })
            )
          );
        })(),

        // ─────────── Family Pairing Insights ───────────
        // Surfaces only when student has completed Maine + cross-region in same family
        (function() {
          var paired = getPairedFamilies(snapshots, scenarioSnaps);
          if (paired.length === 0) return null;
          return h('div', {
            style: {
              marginBottom: 16, padding: 16, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(168,85,247,0.16) 0%, rgba(56,189,248,0.06) 100%)',
              borderTop: '1px solid rgba(168,85,247,0.5)', borderRight: '1px solid rgba(168,85,247,0.5)', borderBottom: '1px solid rgba(168,85,247,0.5)', borderLeft: '4px solid #a855f7'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 28 } }, '🪶'),
              h('div', { style: { flex: 1, minWidth: 240 } },
                h('h3', { style: { margin: 0, color: '#c4b5fd', fontSize: 17, fontWeight: 900 } }, 'Cross-Region Pairing Insights'),
                h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 2 } }, 'Unlocked when you complete a Maine anchor AND a cross-region scenario in the same mechanic family. ' + paired.length + ' of 5 families unlocked.')
              )
            ),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr', gap: 10 } },
              paired.map(function(famId) {
                var insight = FAMILY_PAIRING_INSIGHTS[famId];
                var famMeta = FAMILY_COLORS[famId] || {};
                return h('div', { key: famId,
                  style: { padding: 12, borderRadius: 10, background: 'rgba(15,23,42,0.7)', borderTop: '1px solid rgba(168,85,247,0.25)', borderRight: '1px solid rgba(168,85,247,0.25)', borderBottom: '1px solid rgba(168,85,247,0.25)', borderLeft: '3px solid ' + (famMeta.accent || '#a855f7') }
                },
                  h('div', { style: { fontSize: 11, color: famMeta.accent || '#a855f7', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 4 } }, (famMeta.label || famId) + ' · ' + (famMeta.mechanic || '')),
                  h('div', { style: { fontSize: 14, fontWeight: 800, color: '#e9d5ff', marginBottom: 6 } }, insight.title),
                  h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 12.5, lineHeight: 1.65 } }, insight.text)
                );
              })
            )
          );
        })(),

        // ─────────── Maine anchor campaigns ───────────
        h('div', { style: { marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(134,239,172,0.06)', borderLeft: '3px solid #86efac' } },
          h('div', { style: { fontSize: 12, fontWeight: 800, color: '#86efac', textTransform: 'uppercase', letterSpacing: 0.5 } }, '🇺🇸 Maine anchor campaigns'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.5 } }, 'Five deep multi-period simulations grounded in documented Maine practice. Each is a 10–40 period campaign with periodic decisions, random events, and feedback rules. Use these as your deep case study for each mechanic, then try the same mechanic in another region below.')
        ),

        // Campaign tiles
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 12, marginBottom: 16 } },
          snapshots.map(function(snap) {
            var c = snap.campaign;
            var s = snap.state;
            var pct = (s.year && s.maxYears) ? Math.round((s.year / s.maxYears) * 100) : 0;
            var outcome = s.outcome;
            return h('div', {
              key: c.id,
              style: { background: '#0f172a', borderRadius: 12, padding: 14, borderLeft: '3px solid ' + c.color, display: 'flex', flexDirection: 'column', gap: 10 }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 28 } }, c.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontWeight: 800, color: c.color, fontSize: 15 } }, c.label),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, c.scale)
                ),
                h('span', { style: { background: statusColor(s.status) + '22', color: statusColor(s.status), border: '1px solid ' + statusColor(s.status) + '66', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 } }, statusLabel(s.status))
              ),
              // Recommended starter badge for first-timers
              (completedCount === 0 && inProgressCount === 0 && c.id === 'conserve') ? h('div', {
                style: { background: 'rgba(134,239,172,0.15)', border: '1px solid #86efac', borderRadius: 6, padding: '4px 8px', fontSize: 11, color: '#86efac', fontWeight: 700, display: 'inline-block' }
              }, '🌱 Recommended starter') : null,
              h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, 'Mechanic: ' + c.mechanic),
              h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 } }, c.desc),

              // Progress / outcome section
              s.status === 'inProgress' ? h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 8 } },
                h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4, fontWeight: 700 } }, 'Year ' + s.year + ' of ' + s.maxYears + ' (' + pct + '%)' + (s.difficulty ? ' · ' + s.difficulty : '')),
                h('div', { style: { height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' } },
                  h('div', { style: { width: pct + '%', height: '100%', background: c.color, borderRadius: 3, transition: 'width 0.4s' } })
                )
              ) : null,
              s.status === 'complete' && outcome ? h('div', { style: { background: (outcome.color || '#86efac') + '15', borderRadius: 8, padding: 8, borderLeft: '3px solid ' + (outcome.color || '#86efac') } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: outcome.color || '#86efac' } }, (outcome.icon || '🏆') + ' ' + (outcome.label || 'Complete')),
                isTopTier(outcome) ? h('div', { style: { fontSize: 10, color: '#a855f7', marginTop: 2, fontWeight: 700 } }, '🌟 Top-tier outcome') : null
              ) : null,

              h('div', { style: { marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('button', {
                  onClick: function() { launchCampaign(c); },
                  'aria-label': 'Launch ' + c.label,
                  style: {
                    flex: 1, minWidth: 100,
                    padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, ' + c.color + ' 0%, ' + c.color + 'cc 100%)',
                    color: '#fff', fontWeight: 800, fontSize: 13
                  }
                }, s.status === 'inProgress' ? 'Continue →' : (s.status === 'complete' ? 'Replay →' : 'Launch →')),
                s.status === 'complete' ? h('button', {
                  onClick: function() { viewReport(c.id); },
                  'aria-label': 'View printable report for ' + c.label,
                  title: 'View printable campaign report',
                  style: {
                    padding: '10px 12px', borderRadius: 10, border: '1px solid ' + c.color + '88', cursor: 'pointer',
                    background: 'rgba(15,23,42,0.5)', color: c.color, fontWeight: 700, fontSize: 12
                  }
                }, '🖨 Report') : null
              )
            );
          })
        ),

        // ─────────── Cross-region scenarios catalog ───────────
        h('div', { style: { marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(168,85,247,0.06)', borderLeft: '3px solid #a855f7' } },
          h('div', { style: { fontSize: 12, fontWeight: 800, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 0.5 } }, '🌐 Cross-region scenarios'),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 2, lineHeight: 1.5 } }, 'Ten self-contained 4-decision scenarios from other parts of the world. Each takes 5–10 minutes and uses the same universal mechanic as the Maine anchor — different country, different cultures, different stakes. Every mechanic family has at least two cross-region scenarios so you can compare within the same mechanic across two regions, and compare those against the Maine anchor in a three-way analysis.')
        ),

        // Scenarios catalog grid
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 12, marginBottom: 16 } },
          scenarioSnaps.map(function(snap) {
            var sc = snap.scenario;
            var state = snap.state;
            var familyMeta = FAMILY_COLORS[sc.family] || { primary: '#86efac', mechanic: '' };
            var pct = (state.step && sc.decisions.length) ? Math.round((state.step / sc.decisions.length) * 100) : 0;
            return h('div', {
              key: sc.id,
              style: { background: '#0f172a', borderRadius: 12, padding: 14, borderLeft: '3px solid ' + sc.color, display: 'flex', flexDirection: 'column', gap: 10 }
            },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
                h('span', { style: { fontSize: 28 } }, sc.icon),
                h('div', { style: { flex: 1 } },
                  h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700 } }, sc.regionFlag + ' ' + sc.region.split(' · ')[0]),
                  h('div', { style: { fontWeight: 800, color: sc.color, fontSize: 15 } }, sc.label),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, sc.scale)
                ),
                h('span', { style: { background: statusColor(state.status) + '22', color: statusColor(state.status), border: '1px solid ' + statusColor(state.status) + '66', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 } }, statusLabel(state.status))
              ),
              h('div', { style: { fontSize: 11, color: '#fbbf24', fontStyle: 'italic' } }, 'Mechanic: ' + (familyMeta.mechanic || '') + ' · same family as: ' + (CAMPAIGNS.find(function(c) { return CAMPAIGN_FAMILY[c.id] === sc.family; }) || {}).label),
              h('div', { style: { fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 } }, sc.shortDesc),

              // Progress / outcome
              state.status === 'inProgress' && state.phase === 'playing' ? h('div', { style: { background: '#1e293b', borderRadius: 8, padding: 8 } },
                h('div', { style: { fontSize: 11, color: '#fbbf24', marginBottom: 4, fontWeight: 700 } }, sc.yearLabel + ' ' + (state.step + 1) + ' of ' + sc.decisions.length + ' (' + pct + '%)'),
                h('div', { style: { height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' } },
                  h('div', { style: { width: pct + '%', height: '100%', background: sc.color, borderRadius: 3, transition: 'width 0.4s' } })
                )
              ) : null,
              state.status === 'complete' && state.outcome ? h('div', { style: { background: (state.outcome.color || '#86efac') + '15', borderRadius: 8, padding: 8, borderLeft: '3px solid ' + (state.outcome.color || '#86efac') } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: state.outcome.color || '#86efac' } }, (state.outcome.icon || '🏆') + ' ' + state.outcome.label),
                isScenarioTopTier(state.outcome) ? h('div', { style: { fontSize: 10, color: '#a855f7', marginTop: 2, fontWeight: 700 } }, '🌟 Top-tier outcome') : null
              ) : null,

              h('div', { style: { marginTop: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' } },
                h('button', {
                  onClick: function() { openScenario(sc.id); },
                  'aria-label': 'Open ' + sc.label,
                  style: {
                    flex: 1, minWidth: 100,
                    padding: '10px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, ' + sc.color + ' 0%, ' + sc.color + 'cc 100%)',
                    color: '#fff', fontWeight: 800, fontSize: 13
                  }
                }, state.status === 'inProgress' ? 'Continue →' : (state.status === 'complete' ? 'Review →' : 'Begin →')),
                state.status === 'complete' ? h('button', {
                  onClick: function() { resetScenario(sc.id); openScenario(sc.id); },
                  'aria-label': 'Replay ' + sc.label,
                  title: 'Reset and replay this scenario',
                  style: {
                    padding: '10px 12px', borderRadius: 10, border: '1px solid ' + sc.color + '88', cursor: 'pointer',
                    background: 'rgba(15,23,42,0.5)', color: sc.color, fontWeight: 700, fontSize: 12
                  }
                }, '↻') : null
              )
            );
          })
        ),

        // Pedagogy framing for educators
        h('details', {
          style: { marginTop: 16, padding: '10px 14px', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }
        },
          h('summary', { style: { fontSize: 12, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 } }, '📝 Notes for educators'),
          h('div', { style: { marginTop: 10, fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' } },
            h('p', { style: { margin: '0 0 8px' } },
              'All fifteen campaigns and scenarios share the same structural pattern: setup or briefing, periodic decisions, feedback rules / consequences that tie entities together, debrief. A student who learns one knows how to play all fifteen.'
            ),
            h('p', { style: { margin: '0 0 8px' } },
              h('strong', { style: { color: '#fbbf24' } }, 'What differs across mechanic families:'),
              ' fire-return intervals across habitats (Mosaic + Yarralin + Karuk); trophic cascades between species (Conservation Manager + Yellowstone + Akagera); trust feedback in public health (Outbreak + Mumbai + Liberia); hydrological cascades through a watershed (Watershed Steward + Klamath + Murray–Darling); inter-sector policy dependence in climate planning (Pathways + Marshall Islands + Bangladesh).'
            ),
            h('p', { style: { margin: '0 0 8px' } },
              h('strong', { style: { color: '#fbbf24' } }, 'Why pair regions:'),
              ' the Maine anchor campaign in each family is the deep multi-period simulation grounded in documented Maine practice (Wabanaki seasonal cycles, Edwards/Veazie dam removals, central Maine watersheds, NECEC + heat-pump policy fights). The cross-region scenario in the same family teaches the SAME universal mechanic on radically different country, with cited Indigenous-led organisations and regionally-appropriate AI disclaimers. The pairing surfaces both what is universal and what is local.'
            ),
            h('p', { style: { margin: '0 0 8px' } },
              h('strong', { style: { color: '#fbbf24' } }, 'Discussion prompts after a Maine+region pairing in the same family:'),
            ),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0 } },
              h('li', null, 'What stewardship principle showed up in both regions? What was specific to local culture, climate, or history?'),
              h('li', null, 'Whose voice was load-bearing in each? (Wabanaki / Karangpurru / Yurok / Marshallese / etc.) How does the AI disclaimer reflect that?'),
              h('li', null, 'In which mechanic family is the underlying physics most identical across regions? Most different?'),
              h('li', null, 'What would you build to take what you learned in one region and apply it to the other?')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#94a3b8', fontStyle: 'italic' } },
              'Maine campaigns are 10–40 period simulations with do-nothing baselines, trend charts, and AI Reading. Cross-region scenarios are 4-decision self-contained learning experiences (5–10 min each) with cited regional organisations and region-specific AI disclaimers. Both count toward the mastery tiers.'
            )
          )
        )
      );
    }
  });

  // Helper used by questHooks — labToolData is the top-level toolData object
  function countCompletedFromTopLevel(d) {
    if (!d) return 0;
    var count = 0;
    CAMPAIGNS.forEach(function(c) {
      var slot = (d[c.toolDataKey]) || {};
      var state = slot[c.stateField];
      if (state && state.phase === 'debrief' && state[c.outcomeField]) count++;
    });
    // Also count completed self-contained scenarios
    var hubSlot = (d.stewardshipHub) || {};
    var scenarioStates = hubSlot.scenarioStates || {};
    Object.keys(scenarioStates).forEach(function(id) {
      var st = scenarioStates[id];
      if (st && st.phase === 'debrief' && st.outcome) count++;
    });
    return count;
  }

})();
}
