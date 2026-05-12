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
    { id: 'apprentice', label: 'Stewardship Apprentice', minComplete: 1, icon: '🌱', desc: 'Complete one full campaign.' },
    { id: 'practitioner', label: 'Stewardship Practitioner', minComplete: 3, icon: '🌿', desc: 'Complete three full campaigns.' },
    { id: 'master', label: 'Maine Stewardship Mastery', minComplete: 5, icon: '🏆', desc: 'Complete all five environmental campaigns.' },
    { id: 'grandmaster', label: 'Stewardship Grandmaster', minComplete: 5, requireTopTier: true, icon: '🌟', desc: 'Complete all five campaigns at top-tier outcomes.' }
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

  // ── Tool registration ──
  window.StemLab.registerTool('stewardshipHub', {
    icon: '🌍',
    label: 'Maine Stewardship Campaigns',
    desc: 'Cross-campaign launcher: pick from five environmental stewardship sims (Cultural Mosaic, Conservation Manager, Outbreak Response, Watershed Steward, Climate Policy Pathways) and track progress across all five.',
    color: 'emerald',
    category: 'science',
    questHooks: [
      { id: 'launch_any_campaign', label: 'Launch any environmental campaign', icon: '🌍', check: function(d) { var hub = (d && d.stewardshipHub) || {}; return !!hub.launchedAny; }, progress: function(d) { var hub = (d && d.stewardshipHub) || {}; return hub.launchedAny ? 'Done!' : 'Not yet'; } },
      { id: 'complete_one', label: 'Complete one campaign', icon: '🌱', check: function(d) { return countCompletedFromTopLevel(d) >= 1; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/1 complete'; } },
      { id: 'complete_three', label: 'Complete three campaigns', icon: '🌿', check: function(d) { return countCompletedFromTopLevel(d) >= 3; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/3 complete'; } },
      { id: 'complete_all_five', label: 'Complete all five campaigns', icon: '🏆', check: function(d) { return countCompletedFromTopLevel(d) >= 5; }, progress: function(d) { return countCompletedFromTopLevel(d) + '/5 complete'; } }
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

      // ── First-time onboarding tutorial ──
      // Five-step walkthrough that introduces the universal campaign
      // pattern before students pick a campaign. Auto-shows on first
      // hub visit. Returning players can re-launch via "Take the tour"
      // in the header. Dismissible at any step.
      var TUTORIAL_STEPS = [
        {
          icon: '🌍',
          title: 'Five Maine environmental campaigns',
          body: 'You are about to manage one of five Maine campaigns: Wabanaki fire stewardship (Cultural Mosaic), wildlife conservation (Conservation Manager), public health response (Outbreak Response), watershed restoration (Watershed Steward), or climate policy (Climate Pathways). Each is a multi-period simulation grounded in documented Maine work. They share a structural pattern; the underlying science is different in each one.'
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
          title: 'Choose your first campaign',
          body: 'There is no required order. Conservation Manager has the cleanest feedback rules for first-timers and the most familiar species. Cultural Mosaic offers the deepest cultural grounding. Outbreak Response runs fastest (26 weeks instead of years). Watershed Steward is the most hands-on environmental work. Climate Pathways is the longest time horizon. Whichever you pick, the patterns transfer to the others. After 2 completions, the hub will show you cross-campaign patterns you would not see from any single run.'
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
              h('h2', { style: { margin: 0, color: '#86efac', fontSize: 22, fontWeight: 900 } }, '🌍 Welcome to Maine Stewardship Campaigns'),
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'A 5-step tour before your first campaign.')
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
              border: '1px solid rgba(134,239,172,0.4)', borderLeft: '4px solid #86efac',
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
            'Generated by Maine Stewardship Campaigns · AlloFlow · Campaign data is a teaching simplification grounded in documented Maine practice.'
          )
        );
      }

      // Compute state snapshots for each campaign
      var snapshots = CAMPAIGNS.map(function(c) {
        return { campaign: c, state: readCampaignState(labToolData, c) };
      });
      var completedCount = snapshots.filter(function(s) { return s.state.status === 'complete'; }).length;
      var inProgressCount = snapshots.filter(function(s) { return s.state.status === 'inProgress'; }).length;
      var topTierCount = snapshots.filter(function(s) { return s.state.status === 'complete' && isTopTier(s.state.outcome); }).length;
      var earnedTiers = STEWARDSHIP_TIERS.filter(function(t) {
        if (t.requireTopTier) return topTierCount >= t.minComplete;
        return completedCount >= t.minComplete;
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

      // If the user is viewing a campaign report, render that instead of the main hub
      if (hub.viewingReport) {
        return renderCampaignReport(hub.viewingReport);
      }

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
        'aria-label': 'Maine Stewardship Campaigns hub'
      },
        // Header
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' } },
          ArrowLeft ? h('button', { onClick: function() { setStemLabTool(null); }, 'aria-label': 'Back to STEM Lab',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back') : null,
          h('div', { style: { flex: 1, minWidth: 280 } },
            h('h2', { style: { margin: 0, color: '#86efac', fontSize: 22, fontWeight: 900 } }, '🌍 Maine Stewardship Campaigns'),
            h('div', { style: { fontSize: 13, color: '#94a3b8', marginTop: 4, maxWidth: 700, lineHeight: 1.5 } }, 'Five environmental campaigns across Maine. Each is a multi-period simulation with its own pedagogical core (fire-return intervals, trophic cascades, public-health feedback, hydrological cascades, climate-policy interdependence). Same structural pattern across all five: setup, periodic decisions, review, debrief.')
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
            border: '1px solid rgba(134,239,172,0.4)', borderLeft: '4px solid #16a34a',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10
          }
        },
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Campaigns complete'),
            h('div', { style: { fontSize: 26, fontWeight: 900, color: '#86efac' } }, completedCount + ' / 5')
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'In progress'),
            h('div', { style: { fontSize: 26, fontWeight: 900, color: '#fbbf24' } }, inProgressCount)
          ),
          h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Top-tier outcomes'),
            h('div', { style: { fontSize: 26, fontWeight: 900, color: '#a855f7' } }, topTierCount + ' / 5')
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
              var earned = t.requireTopTier ? topTierCount >= t.minComplete : completedCount >= t.minComplete;
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
              border: '1px solid rgba(168,85,247,0.4)', borderLeft: '4px solid #a855f7'
            }
          },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
              h('span', { style: { fontSize: 24 } }, '🧠'),
              h('div', null,
                h('h3', { style: { margin: 0, color: '#c4b5fd', fontSize: 16, fontWeight: 800 } }, 'Cross-Campaign Synthesis'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, 'Patterns that show up across the campaigns you have completed (' + completedCount + ' / 5). These are the structural insights the five campaigns are designed to teach together.')
              )
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

        // Campaign tiles
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 12 } },
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

        // Pedagogy framing for educators
        h('details', {
          style: { marginTop: 16, padding: '10px 14px', borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b' }
        },
          h('summary', { style: { fontSize: 12, fontWeight: 700, color: '#94a3b8', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: 0.5 } }, '📝 Notes for educators'),
          h('div', { style: { marginTop: 10, fontSize: 13, lineHeight: 1.6, color: '#cbd5e1' } },
            h('p', { style: { margin: '0 0 8px' } },
              'All five campaigns share the same structural pattern: setup, periodic decisions (year, week, or 5-year period), random events, feedback rules that tie entities together, end-of-period review, and debrief. A student who learns one campaign knows how to play all five.'
            ),
            h('p', { style: { margin: '0 0 8px' } },
              h('strong', { style: { color: '#fbbf24' } }, 'What differs across campaigns is the domain physics:'),
              ' fire-return intervals across habitats; trophic cascades between species; trust feedback in public health; hydrological cascades through a watershed; inter-sector policy dependence in climate planning.'
            ),
            h('p', { style: { margin: '0 0 8px' } },
              h('strong', { style: { color: '#fbbf24' } }, 'Real Maine grounding:'),
              ' the Cultural Mosaic builds on documented Wabanaki practice. The Conservation Manager references Yellowstone wolves, Penobscot River dam removal, and beaver recovery. Outbreak Response uses Maine county scale and references Wabanaki Public Health and Wellness work. Watershed Steward references Edwards Dam, Veazie Dam, Sebasticook river herring, and the Penobscot River Restoration Project. Climate Pathways grounds in Maine\'s heat-pump program, NECEC transmission fight, and Justice40 framework.'
            ),
            h('p', { style: { margin: '0 0 8px' } },
              h('strong', { style: { color: '#fbbf24' } }, 'Discussion prompts after multiple campaigns:'),
            ),
            h('ul', { style: { margin: '0 0 0 18px', padding: 0 } },
              h('li', null, 'Which feedback rule across all five domains feels most like real life to you, and why?'),
              h('li', null, 'In which campaign was equity / public support most load-bearing for everything else?'),
              h('li', null, 'Where did the "do-nothing baseline" surprise you most when compared with your campaign?'),
              h('li', null, 'In each campaign there is a Wabanaki disclaimer for the AI Reading feature. Why do you think these disclaimers are written the way they are?')
            ),
            h('p', { style: { margin: '8px 0 0', color: '#94a3b8', fontStyle: 'italic' } },
              'Each campaign has its own per-entity deep-dive panels with documented case work, a year-1 coaching tip, artifact translations to tangible Maine units, a do-nothing baseline at debrief, a multi-line trend chart, and a carefully-framed AI Reading feature. Hours-per-period budgets vary by chosen difficulty.'
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
    return count;
  }

})();
}
