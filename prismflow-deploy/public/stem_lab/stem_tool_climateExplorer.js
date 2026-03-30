// ═══════════════════════════════════════════
// stem_tool_climateExplorer.js — Climate Explorer
// Carbon calculator, renewables simulator, climate justice, solutions spotlight
// ═══════════════════════════════════════════
(function() {
  'use strict';
  if (!window.StemLab || !window.StemLab.registerTool) return;

  window.StemLab.registerTool('climateExplorer', {
    icon: '\uD83C\uDF0D',
    label: 'Climate Explorer',
    desc: 'Carbon calculator, renewables simulator, climate justice & solutions.',
    color: 'emerald',
    category: 'science',
    render: function(ctx) {
      var React = ctx.React;
      var el = React.createElement;
      var labToolData = ctx.toolData;
      var setLabToolData = ctx.setToolData;
      var setStemLabTool = ctx.setStemLabTool;
      var addToast = ctx.addToast;
      var t = ctx.t;
      var ArrowLeft = ctx.icons.ArrowLeft;
      var awardXP = function(n) { if (ctx.awardXP) ctx.awardXP('climateExplorer', n); };
      var getStemXP = ctx.getXP;
      var callGemini = ctx.callGemini;
      var gradeLevel = ctx.gradeLevel || '5th Grade';

      // ── State ──
      var d = (labToolData && labToolData.climateExplorer) || {};
      function upd(k, v) {
        setLabToolData(function(prev) {
          var copy = Object.assign({}, prev);
          copy.climateExplorer = Object.assign({}, copy.climateExplorer || {}, typeof k === 'object' ? k : (function() { var o = {}; o[k] = v; return o; })());
          return copy;
        });
      }

      var tab = d.tab || 'carbon';
      // Carbon state
      var ccTransport = d.ccTransport || 0;
      var ccFood = d.ccFood || 0;
      var ccEnergy = d.ccEnergy || 0;
      var ccWaste = d.ccWaste || 0;
      var ccScale = d.ccScale || 'school';
      var ccSchoolSize = d.ccSchoolSize || 500;
      // Renewables state
      var rsSolar = d.rsSolar != null ? d.rsSolar : 10;
      var rsWind = d.rsWind != null ? d.rsWind : 5;
      var rsHydro = d.rsHydro != null ? d.rsHydro : 15;
      var rsNuclear = d.rsNuclear != null ? d.rsNuclear : 10;
      var rsTimespan = d.rsTimespan || 25;
      // Justice state
      var cjRegion = d.cjRegion || null;
      var cjView = d.cjView || 'risk';
      // Solutions state
      var ssCategory = d.ssCategory || 'all';
      var ssExpanded = d.ssExpanded || null;
      var ssShowActions = d.ssShowActions || false;
      // AI state
      var aiLoading = d.aiLoading || false;
      var aiResponse = d.aiResponse || null;
      // Quiz
      var quizIdx = d.quizIdx || 0;
      var quizAnswer = d.quizAnswer;
      var quizCorrect = d.quizCorrect || 0;
      var quizTotal = d.quizTotal || 0;
      var quizOpen = d.quizOpen || false;
      // Badges
      var badges = d.badges || {};
      var tabsVisited = d.tabsVisited || {};

      // ── Grade Band ──
      function getGradeBand() {
        var gl = gradeLevel.toLowerCase();
        if (/k|1st|2nd|pre/.test(gl)) return 'k2';
        if (/3rd|4th|5th/.test(gl)) return 'g35';
        if (/6th|7th|8th/.test(gl)) return 'g68';
        return 'g912';
      }
      var gradeBand = getGradeBand();

      // ── Badge helper ──
      function earnBadge(id) {
        if (badges[id]) return;
        var nb = Object.assign({}, badges);
        nb[id] = Date.now();
        upd('badges', nb);
        awardXP(15);
        if (addToast) addToast('\uD83C\uDFC5 Badge earned: ' + id + '!', 'success');
      }

      // ── Track tab visits ──
      function visitTab(tid) {
        upd('tab', tid);
        if (!tabsVisited[tid]) {
          var nv = Object.assign({}, tabsVisited);
          nv[tid] = true;
          upd('tabsVisited', nv);
          awardXP(5);
          if (Object.keys(nv).length >= 4) earnBadge('allTabs');
        }
      }

      // ══════════════════════════════════════
      //  CARBON CALCULATOR DATA
      // ══════════════════════════════════════
      var CARBON = {
        transport: {
          label: 'How do you get to school?', emoji: '\uD83D\uDE8C',
          opts: [
            { label: 'Walk / Bike', emoji: '\uD83D\uDEB6', kg: 0, desc: 'Zero emissions! Your legs are the greenest engine.' },
            { label: 'School Bus', emoji: '\uD83D\uDE8C', kg: 300, desc: 'Shared ride \u2014 about 0.3 kg CO\u2082 per student per trip.' },
            { label: 'Car (alone)', emoji: '\uD83D\uDE97', kg: 1200, desc: 'A car emits ~0.21 kg CO\u2082/km. Solo trips add up fast.' },
            { label: 'Carpool', emoji: '\uD83D\uDE99', kg: 400, desc: 'Splitting rides cuts per-person emissions by 50-75%.' }
          ]
        },
        food: {
          label: 'What do you usually eat?', emoji: '\uD83C\uDF5E',
          opts: [
            { label: 'Mostly plant-based', emoji: '\uD83E\uDD57', kg: 600, desc: 'Fruits, veggies, grains, beans \u2014 lowest food footprint.' },
            { label: 'A mix of everything', emoji: '\uD83C\uDF71', kg: 1200, desc: 'Some meat, some veggies. Average diet.' },
            { label: 'Lots of meat & dairy', emoji: '\uD83E\uDD69', kg: 2500, desc: 'Beef produces 60 kg CO\u2082 per kg of meat.' }
          ]
        },
        energy: {
          label: 'What powers your home?', emoji: '\u26A1',
          opts: [
            { label: 'Solar / Wind', emoji: '\u2600\uFE0F', kg: 200, desc: 'Near-zero operational emissions.' },
            { label: 'Grid average', emoji: '\uD83D\uDD0C', kg: 2000, desc: 'US grid: ~0.4 kg CO\u2082 per kWh.' },
            { label: 'Mostly fossil fuels', emoji: '\uD83C\uDFED', kg: 4000, desc: 'Coal-heavy grids: up to 1 kg CO\u2082/kWh.' }
          ]
        },
        waste: {
          label: 'What happens to your trash?', emoji: '\u267B\uFE0F',
          opts: [
            { label: 'Compost & recycle', emoji: '\uD83C\uDF31', kg: 100, desc: 'Composting diverts methane-producing waste.' },
            { label: 'Recycle some', emoji: '\u267B\uFE0F', kg: 500, desc: 'Recycling saves ~1 ton CO\u2082 per ton of material.' },
            { label: 'Mostly landfill', emoji: '\uD83D\uDDD1\uFE0F', kg: 1000, desc: 'Landfills produce methane (28\u00D7 more potent than CO\u2082).' }
          ]
        }
      };

      var TREES_PER_YEAR = 22; // kg CO2 per tree per year

      function carbonTotal() {
        var tr = CARBON.transport.opts[ccTransport].kg;
        var fd = CARBON.food.opts[ccFood].kg;
        var en = CARBON.energy.opts[ccEnergy].kg;
        var ws = CARBON.waste.opts[ccWaste].kg;
        return { transport: tr, food: fd, energy: en, waste: ws, total: tr + fd + en + ws };
      }

      var ct = carbonTotal();
      var scaleMult = ccScale === 'school' ? ccSchoolSize : ccScale === 'city' ? 100000 : 330000000;
      var scaleLabel = ccScale === 'school' ? ccSchoolSize + ' students' : ccScale === 'city' ? '100K city' : 'USA (330M)';

      // ══════════════════════════════════════
      //  RENEWABLES SIMULATOR
      // ══════════════════════════════════════
      var EMISSIONS_FACTOR = { solar: 40, wind: 11, hydro: 24, nuclear: 12, fossil: 820 }; // g CO2/kWh
      var BASELINE_GT = 37; // Gt CO2/year global energy

      var rsFossil = Math.max(0, 100 - rsSolar - rsWind - rsHydro - rsNuclear);
      var rsGCO2 = (rsSolar / 100 * EMISSIONS_FACTOR.solar + rsWind / 100 * EMISSIONS_FACTOR.wind +
        rsHydro / 100 * EMISSIONS_FACTOR.hydro + rsNuclear / 100 * EMISSIONS_FACTOR.nuclear +
        rsFossil / 100 * EMISSIONS_FACTOR.fossil);
      var rsTargetGt = BASELINE_GT * (rsGCO2 / EMISSIONS_FACTOR.fossil);
      var rsReductionPct = Math.round((1 - rsTargetGt / BASELINE_GT) * 100);

      function buildTimeline() {
        var tl = [];
        for (var y = 0; y <= rsTimespan; y++) {
          var p = rsTimespan > 0 ? y / rsTimespan : 1;
          var eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
          var gt = BASELINE_GT + (rsTargetGt - BASELINE_GT) * eased;
          tl.push({ year: 2025 + y, gt: Math.max(0, gt) });
        }
        return tl;
      }
      var timeline = buildTimeline();
      var cumulativeAvoided = 0;
      for (var ti = 1; ti < timeline.length; ti++) cumulativeAvoided += BASELINE_GT - timeline[ti].gt;

      var SCENARIOS = [
        { label: '100% Solar City', mix: [100, 0, 0, 0], desc: 'Cities like Burlington, VT already run on 100% renewable electricity!', hope: 'Solar is now the cheapest electricity source in history.' },
        { label: 'Balanced Green Mix', mix: [30, 30, 20, 15], desc: 'A diverse portfolio is the most resilient approach.', hope: 'Sweden and France already achieve over 90% clean electricity.' },
        { label: 'Wind-Powered Future', mix: [10, 60, 10, 10], desc: 'Denmark gets 55% of electricity from wind already.', hope: 'Wind turbines can be built on farms \u2014 land beneath still grows crops.' },
        { label: 'Current Pace', mix: [15, 12, 15, 10], desc: 'The world adds renewables faster than ever.', hope: 'Solar capacity doubles every 2-3 years worldwide.' }
      ];

      // ══════════════════════════════════════
      //  CLIMATE JUSTICE DATA
      // ══════════════════════════════════════
      var REGIONS = [
        { id: 'pacific', name: 'Pacific Island Nations', emoji: '\uD83C\uDDEB\uD83C\uDDEF', risk: 'extreme', type: 'Sea level rise, coral bleaching', emPct: 0.03, pop: '12M',
          story: 'Tuvalu, Kiribati, and the Marshall Islands may face severe flooding by 2100, yet produce less than 0.03% of global emissions. Young activists like Litokne Kabua lead advocacy campaigns.',
          resilience: 'Coral reef restoration, floating architecture, legal sovereignty campaigns' },
        { id: 'arctic', name: 'Arctic Communities', emoji: '\u2744\uFE0F', risk: 'extreme', type: 'Permafrost thaw, habitat loss', emPct: 0.1, pop: '4M',
          story: 'Indigenous Arctic peoples have sustained cultures for millennia. Warming is 3-4\u00D7 faster here. Traditional food systems are changing, but communities lead climate monitoring.',
          resilience: 'Traditional ecological knowledge, community monitoring networks, ice cellars' },
        { id: 'sahel', name: 'Sahel Region (Africa)', emoji: '\uD83C\uDDFF\uD83C\uDDE6', risk: 'extreme', type: 'Drought, desertification, food insecurity', emPct: 0.5, pop: '400M',
          story: 'The Sahel spans 5,400 km across Africa. Despite minimal emissions, it faces severe drought cycles. The Great Green Wall project aims to restore 100 million hectares.',
          resilience: 'Great Green Wall reforestation, solar-powered irrigation, drought-resistant crops' },
        { id: 'bangladesh', name: 'Bangladesh & South Asia', emoji: '\uD83C\uDDE7\uD83C\uDDE9', risk: 'extreme', type: 'Flooding, cyclones, displacement', emPct: 0.4, pop: '170M',
          story: 'Bangladesh contributes 0.4% of emissions but faces some of the worst flooding. Millions may be displaced by 2050. Yet Bangladeshi engineers pioneer floating schools and farms.',
          resilience: 'Floating schools, cyclone shelters, mangrove restoration, early warning systems' },
        { id: 'caribbean', name: 'Caribbean Islands', emoji: '\uD83C\uDDF1\uD83C\uDDE8', risk: 'high', type: 'Hurricanes, coral loss, tourism collapse', emPct: 0.2, pop: '44M',
          story: 'Caribbean nations face intensifying hurricanes. Hurricane Maria (2017) devastated Dominica and Puerto Rico. Islands now lead in renewable energy transitions.',
          resilience: 'Hurricane-resilient building codes, community solar, coral nurseries' },
        { id: 'ej_usa', name: 'US Environmental Justice', emoji: '\uD83C\uDDFA\uD83C\uDDF8', risk: 'high', type: 'Air pollution, heat islands, toxic waste', emPct: 15.0, pop: '~40M affected',
          story: 'In the US, communities of color are 75% more likely to live near polluting facilities. Heat islands in cities can be 10\u00B0F hotter. Environmental justice movements fight for equitable protection.',
          resilience: 'Community air monitoring, urban tree canopy programs, clean energy access initiatives' },
        { id: 'seasia', name: 'Southeast Asia Coastal', emoji: '\uD83C\uDDFB\uD83C\uDDF3', risk: 'high', type: 'Typhoons, sea level, saltwater intrusion', emPct: 4.0, pop: '680M',
          story: 'Vietnam, Philippines, and Indonesia face rising seas and intensifying storms. Jakarta is sinking so fast Indonesia is building a new capital. Communities lead mangrove restoration.',
          resilience: 'Mangrove planting, floating communities, aquaculture adaptation' },
        { id: 'andes', name: 'Andean Communities', emoji: '\uD83C\uDDF5\uD83C\uDDEA', risk: 'high', type: 'Glacier retreat, water scarcity', emPct: 1.0, pop: '50M',
          story: 'Andean glaciers provide drinking water for millions. They have lost 30-50% of volume since the 1970s. Indigenous communities combine traditional and modern water management.',
          resilience: 'Ancient qocha (reservoir) systems, glacier monitoring, watershed reforestation' }
      ];

      var riskColors = { extreme: '#ef4444', high: '#f59e0b', moderate: '#3b82f6' };

      // ══════════════════════════════════════
      //  SOLUTIONS SPOTLIGHT
      // ══════════════════════════════════════
      var SOLUTIONS = [
        { id: 'solar', cat: 'energy', emoji: '\u2600\uFE0F', title: 'Solar Power Revolution', what: 'Panels that turn sunlight into electricity \u2014 on roofs, in fields, even floating on lakes.', where: 'Worldwide. India, China, and the US lead in new solar capacity.', impact: 'Solar is now the cheapest electricity in history. Could power 40% of US electricity from rooftops alone.' },
        { id: 'wind', cat: 'energy', emoji: '\uD83C\uDF2C\uFE0F', title: 'Wind Energy', what: 'Turbines that capture wind energy. Offshore wind farms can power entire cities.', where: 'Denmark (55% wind-powered), UK, US, China.', impact: 'One offshore turbine can power 16,000 homes. Wind jobs are among the fastest-growing.' },
        { id: 'evs', cat: 'transport', emoji: '\uD83D\uDE97', title: 'Electric Vehicles', what: 'Cars, buses, and trucks powered by batteries instead of gasoline.', where: 'Norway (80% of new cars are electric), China, Europe, US.', impact: 'EVs produce 50-70% less lifetime emissions than gas cars, improving as grids get cleaner.' },
        { id: 'forests', cat: 'nature', emoji: '\uD83C\uDF33', title: 'Forest Restoration', what: 'Planting billions of trees and protecting existing forests \u2014 nature\'s carbon capture.', where: 'Ethiopia planted 350M trees in one day. Great Green Wall spans Africa.', impact: 'Forests absorb 2.6 billion tons of CO\u2082/year \u2014 about 30% of human emissions.' },
        { id: 'capture', cat: 'capture', emoji: '\uD83C\uDFED', title: 'Carbon Capture', what: 'Machines that pull CO\u2082 from the air and store it underground or turn it into stone.', where: 'Iceland (Climeworks Orca plant), US, Norway.', impact: 'Still early \u2014 current plants capture 36,000 tons/year. Goal: billions by 2050.' },
        { id: 'kelp', cat: 'nature', emoji: '\uD83C\uDF3F', title: 'Ocean Kelp Farms', what: 'Kelp grows 60\u00D7 faster than land trees, absorbing massive CO\u2082 while creating habitat.', where: 'Australia, US Pacific coast, Norway, South Korea.', impact: 'Could sequester 1-10 Gt CO\u2082/year while providing food, fertilizer, and biofuel.' },
        { id: 'cities', cat: 'transport', emoji: '\uD83C\uDFD9\uFE0F', title: 'Green Cities', what: 'Bike lanes, electric buses, urban gardens, green roofs, and walkable neighborhoods.', where: 'Copenhagen, Amsterdam, Singapore, Bogot\u00E1, Portland.', impact: 'Cities produce 70% of emissions. Redesigning them is the highest-impact change.' },
        { id: 'youth', cat: 'all', emoji: '\u270A', title: 'Youth Climate Movement', what: 'Students leading climate action through innovation, activism, and policy advocacy.', where: 'Every continent. Fridays for Future (170+ countries), Sunrise Movement.', impact: 'Youth pressure helped pass the EU Green Deal and influenced the Paris Agreement.', highlight: true }
      ];

      var ACTIONS = [
        { emoji: '\uD83D\uDEB6', text: 'Walk, bike, or bus to school', impact: 'Saves up to 1,200 kg CO\u2082/year', diff: 'easy' },
        { emoji: '\uD83E\uDD57', text: 'Try one meatless meal per week', impact: 'Saves ~200 kg CO\u2082/year', diff: 'easy' },
        { emoji: '\uD83D\uDCA1', text: 'Turn off lights & unplug chargers', impact: 'Saves 100-400 kWh/year', diff: 'easy' },
        { emoji: '\uD83D\uDDE3\uFE0F', text: 'Talk to your family about energy choices', impact: 'One conversation can change household habits', diff: 'medium' },
        { emoji: '\uD83C\uDF31', text: 'Plant a tree or start a school garden', impact: '1 tree absorbs ~22 kg CO\u2082/year', diff: 'medium' },
        { emoji: '\uD83D\uDCDD', text: 'Write a letter to your representative', impact: 'Policy changes affect millions', diff: 'medium' },
        { emoji: '\u267B\uFE0F', text: 'Start a recycling program at school', impact: 'Diverts 30-50% of waste from landfills', diff: 'hard' },
        { emoji: '\uD83D\uDCE2', text: 'Organize a climate awareness event', impact: 'Reaching 100 people multiplies impact 100\u00D7', diff: 'hard' }
      ];

      // ══════════════════════════════════════
      //  QUIZ DATA
      // ══════════════════════════════════════
      var QUIZ = [
        { q: 'What gas do cars produce that warms the Earth?', opts: ['Oxygen', 'Carbon dioxide', 'Nitrogen'], a: 1 },
        { q: 'Which uses less energy: walking or driving?', opts: ['Walking', 'Driving', 'They\'re the same'], a: 0 },
        { q: 'Solar panels get energy from...', opts: ['Wind', 'The Sun', 'Coal'], a: 1 },
        { q: 'How much CO\u2082 does one tree absorb per year?', opts: ['~2 kg', '~22 kg', '~220 kg'], a: 1 },
        { q: 'Which energy source has the LOWEST lifecycle emissions?', opts: ['Natural gas', 'Wind', 'Solar'], a: 1 },
        { q: 'Climate justice means...', opts: ['Weather forecasting', 'Fair distribution of climate impacts', 'Carbon trading'], a: 1 },
        { q: 'The Paris Agreement aims to limit warming to...', opts: ['0.5\u00B0C', '1.5\u00B0C above pre-industrial', '5\u00B0C'], a: 1 },
        { q: 'Which sector produces the most greenhouse emissions?', opts: ['Transportation', 'Energy & electricity', 'Buildings'], a: 1 },
        { q: 'Methane is how many times more potent than CO\u2082?', opts: ['2\u00D7', '10\u00D7', '28\u00D7'], a: 2 },
        { q: 'What is the Great Green Wall?', opts: ['A border wall', 'A reforestation project across Africa', 'A type of solar panel'], a: 1 }
      ];

      // ═══ HELPER: section card ═══
      function card(props, children) {
        return el('div', { style: Object.assign({ padding: 16, borderRadius: 12, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 12 }, props.style || {}) }, children);
      }

      // ═══ HELPER: stat pill ═══
      function pill(label, value, color) {
        return el('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 20, background: color + '15', border: '1px solid ' + color + '30', fontSize: 11, fontWeight: 700, color: color } },
          el('span', null, label + ': '), el('span', { style: { fontWeight: 900 } }, value));
      }

      // ═══ HELPER: option button ═══
      function optBtn(isActive, onClick, emoji, label, sub) {
        return el('button', { onClick: onClick, style: {
          padding: '10px 14px', borderRadius: 10, border: isActive ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
          background: isActive ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1, minWidth: 80, transition: 'all 0.2s'
        } },
          el('span', { style: { fontSize: 20 } }, emoji),
          el('span', { style: { fontSize: 11, fontWeight: 700, color: isActive ? '#4ade80' : '#94a3b8' } }, label),
          sub && el('span', { style: { fontSize: 9, color: '#64748b' } }, sub)
        );
      }

      // ═══ HELPER: slider ═══
      function slider(label, emoji, value, color, onChange) {
        return el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
          el('span', { style: { fontSize: 16, width: 24, textAlign: 'center' } }, emoji),
          el('span', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 60 } }, label),
          el('input', { type: 'range', min: 0, max: 100, value: value, onChange: onChange,
            style: { flex: 1, accentColor: color, height: 6 } }),
          el('span', { style: { fontSize: 13, fontWeight: 900, color: color, width: 40, textAlign: 'right', fontFamily: 'monospace' } }, value + '%')
        );
      }

      // ══════════════════════════════════════════════════
      //  RENDER
      // ══════════════════════════════════════════════════
      return el('div', { style: { background: 'linear-gradient(135deg, #064e3b 0%, #0f172a 50%, #064e3b 100%)', borderRadius: 16, minHeight: '70vh', padding: 0, boxShadow: '0 0 40px rgba(34,197,94,0.15)' } },

        // ── Header ──
        el('div', { style: { padding: '20px 24px 16px', borderBottom: '1px solid rgba(34,197,94,0.2)', display: 'flex', alignItems: 'center', gap: 12 } },
          el('button', { onClick: function() { setStemLabTool(null); }, style: { background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#94a3b8', fontSize: 16 } }, '\u2190'),
          el('div', { style: { fontSize: 28 } }, '\uD83C\uDF0D'),
          el('div', null,
            el('h2', { style: { margin: 0, fontSize: 20, fontWeight: 900, background: 'linear-gradient(90deg, #22c55e, #3b82f6, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' } }, 'Climate Explorer'),
            el('p', { style: { margin: 0, fontSize: 11, color: '#64748b', fontWeight: 600 } }, 'Understand \u2022 Calculate \u2022 Act')
          ),
          el('div', { style: { marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' } },
            el('button', { onClick: function() { upd('quizOpen', !quizOpen); }, style: { padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(168,85,247,0.3)', background: quizOpen ? 'rgba(168,85,247,0.2)' : 'rgba(168,85,247,0.08)', color: '#c084fc', fontSize: 11, fontWeight: 700, cursor: 'pointer' } }, '\uD83E\uDDE0 Quiz'),
            el('div', { style: { padding: '4px 12px', borderRadius: 20, background: 'linear-gradient(135deg, #22c55e, #16a34a)', fontSize: 11, fontWeight: 900, color: '#fff' } }, '\u2B50 ' + (getStemXP ? getStemXP('climateExplorer') : 0) + ' XP'),
            el('div', { style: { padding: '4px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', fontSize: 11, fontWeight: 700, color: '#fbbf24' } }, '\uD83C\uDFC5 ' + Object.keys(badges).length)
          )
        ),

        // ── Tab Bar ──
        el('div', { style: { display: 'flex', borderBottom: '1px solid rgba(34,197,94,0.1)', padding: '0 16px' } },
          [
            { id: 'carbon', icon: '\uD83E\uDDEE', label: 'Carbon Calculator' },
            { id: 'renewables', icon: '\u26A1', label: 'Renewables' },
            { id: 'justice', icon: '\u2696\uFE0F', label: 'Climate Justice' },
            { id: 'solutions', icon: '\uD83D\uDCA1', label: 'Solutions' }
          ].map(function(t) {
            var active = tab === t.id;
            return el('button', { key: t.id, onClick: function() { visitTab(t.id); },
              style: { padding: '12px 16px', border: 'none', borderBottom: active ? '2px solid #22c55e' : '2px solid transparent', background: 'none', color: active ? '#4ade80' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s' } },
              el('span', null, t.icon), t.label);
          })
        ),

        // ── Content ──
        el('div', { style: { padding: 20 } },

          // ═══ QUIZ PANEL ═══
          quizOpen && el('div', { style: { maxWidth: 600, margin: '0 auto 20px', padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(99,102,241,0.1))', border: '1px solid rgba(168,85,247,0.25)' } },
            el('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
              el('div', { style: { color: '#c084fc', fontSize: 14, fontWeight: 900 } }, '\uD83E\uDDE0 Climate Quiz'),
              el('div', { style: { color: '#94a3b8', fontSize: 11 } }, quizCorrect + '/' + quizTotal + ' correct')
            ),
            (function() {
              var q = QUIZ[quizIdx % QUIZ.length];
              return el('div', null,
                el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 700, marginBottom: 12 } }, q.q),
                q.opts.map(function(opt, oi) {
                  var isAnswer = quizAnswer != null;
                  var isCorrect = oi === q.a;
                  var isChosen = oi === quizAnswer;
                  return el('button', { key: oi, disabled: isAnswer,
                    onClick: function() {
                      upd('quizAnswer', oi);
                      upd('quizTotal', quizTotal + 1);
                      if (oi === q.a) { upd('quizCorrect', quizCorrect + 1); awardXP(10); }
                      if (quizCorrect + (oi === q.a ? 1 : 0) >= 8) earnBadge('quizChampion');
                    },
                    style: { display: 'block', width: '100%', padding: '10px 14px', marginBottom: 6, borderRadius: 8, textAlign: 'left',
                      border: isAnswer ? (isCorrect ? '2px solid #22c55e' : isChosen ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.08)') : '1px solid rgba(255,255,255,0.1)',
                      background: isAnswer ? (isCorrect ? 'rgba(34,197,94,0.1)' : isChosen ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.03)') : 'rgba(255,255,255,0.04)',
                      color: isAnswer ? (isCorrect ? '#4ade80' : isChosen ? '#fca5a5' : '#64748b') : '#cbd5e1',
                      fontSize: 12, fontWeight: 600, cursor: isAnswer ? 'default' : 'pointer', transition: 'all 0.2s' } },
                    opt);
                }),
                isAnswer && el('button', { onClick: function() { upd('quizIdx', quizIdx + 1); upd('quizAnswer', undefined); },
                  style: { marginTop: 10, padding: '8px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' } }, 'Next Question \u2192')
              );
              var isAnswer = quizAnswer != null;
            })()
          ),

          // ═══ TAB: CARBON CALCULATOR ═══
          tab === 'carbon' && el('div', { style: { maxWidth: 680, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 20 } },
              el('div', { style: { color: '#4ade80', fontSize: 16, fontWeight: 900 } }, '\uD83E\uDDEE Your Carbon Footprint'),
              el('div', { style: { color: '#64748b', fontSize: 12 } }, 'See how your daily choices add up \u2014 and how small changes make a big difference')
            ),

            // Activity categories
            Object.keys(CARBON).map(function(catKey) {
              var cat = CARBON[catKey];
              var stateKey = catKey === 'transport' ? 'ccTransport' : catKey === 'food' ? 'ccFood' : catKey === 'energy' ? 'ccEnergy' : 'ccWaste';
              var val = catKey === 'transport' ? ccTransport : catKey === 'food' ? ccFood : catKey === 'energy' ? ccEnergy : ccWaste;
              return el('div', { key: catKey, style: { marginBottom: 16 } },
                el('div', { style: { color: '#94a3b8', fontSize: 12, fontWeight: 800, marginBottom: 8 } }, cat.emoji + ' ' + cat.label),
                el('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                  cat.opts.map(function(opt, oi) {
                    return optBtn(val === oi, function() {
                      upd(stateKey, oi);
                      if (!badges.firstCalc) { earnBadge('firstCalc'); }
                    }, opt.emoji, opt.label, opt.kg + ' kg/yr');
                  })
                ),
                el('div', { style: { marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', color: '#64748b', fontSize: 10, fontStyle: 'italic' } },
                  cat.opts[val].desc)
              );
            }),

            // Results
            el('div', { style: { padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.08))', border: '1px solid rgba(34,197,94,0.2)', marginTop: 8 } },
              el('div', { style: { textAlign: 'center', marginBottom: 12 } },
                el('div', { style: { color: ct.total < 2000 ? '#4ade80' : ct.total < 5000 ? '#fbbf24' : '#f87171', fontSize: 36, fontWeight: 900 } }, ct.total.toLocaleString()),
                el('div', { style: { color: '#94a3b8', fontSize: 12, fontWeight: 700 } }, 'kg CO\u2082 per year')
              ),
              // Breakdown bars
              [
                { label: 'Transport', kg: ct.transport, color: '#3b82f6' },
                { label: 'Food', kg: ct.food, color: '#f59e0b' },
                { label: 'Energy', kg: ct.energy, color: '#ef4444' },
                { label: 'Waste', kg: ct.waste, color: '#22c55e' }
              ].map(function(b) {
                var pct = ct.total > 0 ? Math.round(b.kg / ct.total * 100) : 0;
                return el('div', { key: b.label, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  el('span', { style: { fontSize: 10, fontWeight: 700, color: '#94a3b8', width: 60 } }, b.label),
                  el('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                    el('div', { style: { width: pct + '%', height: '100%', borderRadius: 4, background: b.color, transition: 'width 0.5s' } })
                  ),
                  el('span', { style: { fontSize: 10, fontWeight: 700, color: b.color, width: 55, textAlign: 'right' } }, b.kg.toLocaleString() + ' kg')
                );
              }),

              // Tree comparison
              el('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' } },
                el('div', { style: { fontSize: 24 } }, '\uD83C\uDF33'),
                el('div', { style: { color: '#4ade80', fontSize: 14, fontWeight: 900 } }, 'That\'s like ' + Math.round(ct.total / TREES_PER_YEAR) + ' trees working for a whole year'),
                el('div', { style: { color: '#64748b', fontSize: 10, marginTop: 2 } }, 'Each tree absorbs about 22 kg CO\u2082 per year')
              )
            ),

            // Scale toggle
            el('div', { style: { marginTop: 16, padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } },
              el('div', { style: { color: '#a5b4fc', fontSize: 13, fontWeight: 800, marginBottom: 10 } }, '\uD83C\uDF0D What if everyone made your choices?'),
              el('div', { style: { display: 'flex', gap: 6, marginBottom: 12 } },
                ['school', 'city', 'country'].map(function(s) {
                  var labels = { school: '\uD83C\uDFEB School', city: '\uD83C\uDFD9\uFE0F City', country: '\uD83C\uDDFA\uD83C\uDDF8 Country' };
                  return el('button', { key: s, onClick: function() { upd('ccScale', s); awardXP(5); },
                    style: { flex: 1, padding: '8px', borderRadius: 8, border: ccScale === s ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.1)', background: ccScale === s ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', color: ccScale === s ? '#a5b4fc' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                    labels[s]);
                })
              ),
              el('div', { style: { textAlign: 'center' } },
                el('div', { style: { color: '#e2e8f0', fontSize: 20, fontWeight: 900 } }, (ct.total * scaleMult / 1000000).toFixed(1) + ' million tons CO\u2082/yr'),
                el('div', { style: { color: '#64748b', fontSize: 11 } }, 'If all ' + scaleLabel + ' made these choices'),
                ct.total < 2000 && el('div', { style: { marginTop: 8, color: '#4ade80', fontSize: 12, fontWeight: 700 } }, '\u2728 Great job! Your footprint is below average. Imagine if everyone did this!')
              )
            )
          ),

          // ═══ TAB: RENEWABLES SIMULATOR ═══
          tab === 'renewables' && el('div', { style: { maxWidth: 680, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 20 } },
              el('div', { style: { color: '#fbbf24', fontSize: 16, fontWeight: 900 } }, '\u26A1 Renewables Impact Simulator'),
              el('div', { style: { color: '#64748b', fontSize: 12 } }, 'Design an energy mix and see how it changes our future')
            ),

            // Scenario presets
            el('div', { style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
              SCENARIOS.map(function(sc, si) {
                return el('button', { key: si, onClick: function() { upd({ rsSolar: sc.mix[0], rsWind: sc.mix[1], rsHydro: sc.mix[2], rsNuclear: sc.mix[3] }); },
                  style: { padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)', color: '#fbbf24', fontSize: 10, fontWeight: 700, cursor: 'pointer' } },
                  sc.label);
              })
            ),

            // Energy mix sliders
            el('div', { style: { padding: 16, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 16 } },
              el('div', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 800, marginBottom: 10, textTransform: 'uppercase' } }, 'Design Your Energy Mix'),
              slider('Solar', '\u2600\uFE0F', rsSolar, '#f59e0b', function(e) { upd('rsSolar', parseInt(e.target.value)); }),
              slider('Wind', '\uD83C\uDF2C\uFE0F', rsWind, '#60a5fa', function(e) { upd('rsWind', parseInt(e.target.value)); }),
              slider('Hydro', '\uD83D\uDCA7', rsHydro, '#22d3ee', function(e) { upd('rsHydro', parseInt(e.target.value)); }),
              slider('Nuclear', '\u2622\uFE0F', rsNuclear, '#a78bfa', function(e) { upd('rsNuclear', parseInt(e.target.value)); }),
              el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 6, padding: '8px 12px', borderRadius: 8, background: rsFossil > 50 ? 'rgba(239,68,68,0.1)' : rsFossil > 20 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)' } },
                el('span', { style: { fontSize: 16 } }, '\uD83C\uDFED'),
                el('span', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', width: 60 } }, 'Fossil'),
                el('div', { style: { flex: 1, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                  el('div', { style: { width: rsFossil + '%', height: '100%', borderRadius: 4, background: rsFossil > 50 ? '#ef4444' : rsFossil > 20 ? '#f59e0b' : '#22c55e', transition: 'all 0.5s' } })
                ),
                el('span', { style: { fontSize: 13, fontWeight: 900, color: rsFossil > 50 ? '#ef4444' : rsFossil > 20 ? '#f59e0b' : '#22c55e', width: 40, textAlign: 'right', fontFamily: 'monospace' } }, rsFossil + '%')
              ),
              rsFossil <= 5 && !badges.netZero && (function() { earnBadge('netZero'); return null; })()
            ),

            // Timespan selector
            el('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 } },
              [5, 10, 25, 50].map(function(y) {
                return el('button', { key: y, onClick: function() { upd('rsTimespan', y); },
                  style: { padding: '6px 14px', borderRadius: 8, border: rsTimespan === y ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)', background: rsTimespan === y ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)', color: rsTimespan === y ? '#4ade80' : '#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' } },
                  y + ' years');
              })
            ),

            // Results
            el('div', { style: { padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)' } },
              el('div', { style: { display: 'flex', justifyContent: 'space-around', textAlign: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 } },
                el('div', null,
                  el('div', { style: { color: rsReductionPct > 50 ? '#4ade80' : rsReductionPct > 20 ? '#fbbf24' : '#f87171', fontSize: 28, fontWeight: 900 } }, rsReductionPct + '%'),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 600 } }, 'Emissions Reduction')
                ),
                el('div', null,
                  el('div', { style: { color: '#60a5fa', fontSize: 28, fontWeight: 900 } }, cumulativeAvoided.toFixed(0)),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 600 } }, 'Gt CO\u2082 Avoided')
                ),
                el('div', null,
                  el('div', { style: { color: '#a78bfa', fontSize: 28, fontWeight: 900 } }, timeline[timeline.length - 1].gt.toFixed(1)),
                  el('div', { style: { color: '#94a3b8', fontSize: 10, fontWeight: 600 } }, 'Gt/yr by ' + (2025 + rsTimespan))
                )
              ),
              // Simple emissions timeline (text-based)
              el('div', { style: { marginBottom: 12 } },
                el('div', { style: { color: '#64748b', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 } }, 'Emissions Timeline'),
                el('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 } },
                  timeline.filter(function(_, i) { return i % Math.max(1, Math.floor(timeline.length / 20)) === 0 || i === timeline.length - 1; }).map(function(pt, i) {
                    var pct = Math.min(100, pt.gt / BASELINE_GT * 100);
                    var clr = pct > 70 ? '#ef4444' : pct > 40 ? '#f59e0b' : '#22c55e';
                    return el('div', { key: i, style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 } },
                      el('div', { style: { width: '100%', maxWidth: 24, height: Math.max(4, pct * 0.7) + 'px', borderRadius: 3, background: clr, transition: 'height 0.5s' } }),
                      i % 4 === 0 && el('span', { style: { fontSize: 8, color: '#475569' } }, pt.year)
                    );
                  })
                ),
                el('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4 } },
                  el('span', { style: { fontSize: 9, color: '#64748b' } }, 'Today: ' + BASELINE_GT + ' Gt/yr'),
                  el('span', { style: { fontSize: 9, color: rsReductionPct > 50 ? '#4ade80' : '#fbbf24' } }, (2025 + rsTimespan) + ': ' + timeline[timeline.length - 1].gt.toFixed(1) + ' Gt/yr')
                )
              ),

              // Hopeful message
              el('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' } },
                el('div', { style: { color: '#4ade80', fontSize: 13, fontWeight: 800 } },
                  rsReductionPct >= 80 ? '\uD83C\uDF1F Amazing! This mix could help us meet the Paris Agreement goals!' :
                  rsReductionPct >= 50 ? '\u26A1 Great progress! Every percentage point of clean energy compounds over time.' :
                  rsReductionPct >= 20 ? '\uD83C\uDF31 A good start! Try adding more renewables to see bigger impact.' :
                  '\uD83D\uDCA1 The world is transitioning \u2014 try increasing solar and wind to see the difference!'
                ),
                rsReductionPct >= 50 && el('div', { style: { color: '#6ee7b7', fontSize: 11, marginTop: 4 } },
                  'Fun fact: Solar capacity has grown 300\u00D7 since 2000. The clean energy revolution is accelerating.')
              )
            ),

            // AI scenario
            callGemini && el('div', { style: { marginTop: 16, textAlign: 'center' } },
              el('button', { onClick: function() {
                  if (aiLoading) return;
                  upd('aiLoading', true);
                  var prompt = 'You are a hopeful climate science educator for a ' + gradeBand + ' student. They designed an energy mix: ' + rsSolar + '% solar, ' + rsWind + '% wind, ' + rsHydro + '% hydro, ' + rsNuclear + '% nuclear, ' + rsFossil + '% fossil. Give a 2-3 sentence encouraging analysis of their mix. Mention one real-world country or city doing something similar. End with an inspiring fact. Keep it under 80 words. Do NOT use markdown.';
                  callGemini(prompt, true, false, 0.8).then(function(r) { upd({ aiResponse: r, aiLoading: false }); }).catch(function() { upd('aiLoading', false); });
                }, disabled: aiLoading,
                style: { padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(34,197,94,0.3)', background: aiLoading ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.08)', color: '#4ade80', fontSize: 12, fontWeight: 700, cursor: aiLoading ? 'wait' : 'pointer' } },
                aiLoading ? '\u23F3 Analyzing...' : '\uD83E\uDD16 AI Analysis of Your Mix'),
              aiResponse && el('div', { style: { marginTop: 10, padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', color: '#94a3b8', fontSize: 12, lineHeight: 1.7, textAlign: 'left' } }, aiResponse)
            )
          ),

          // ═══ TAB: CLIMATE JUSTICE ═══
          tab === 'justice' && el('div', { style: { maxWidth: 700, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 20 } },
              el('div', { style: { color: '#fbbf24', fontSize: 16, fontWeight: 900 } }, '\u2696\uFE0F Climate Justice'),
              el('div', { style: { color: '#64748b', fontSize: 12 } }, 'Who is most affected by climate change \u2014 and is it fair?')
            ),

            // Key insight
            el('div', { style: { padding: 14, borderRadius: 12, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(239,68,68,0.06))', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, textAlign: 'center' } },
              el('div', { style: { color: '#fbbf24', fontSize: 13, fontWeight: 800 } }, '\uD83D\uDCA1 Key Insight'),
              el('div', { style: { color: '#94a3b8', fontSize: 12, lineHeight: 1.6, marginTop: 4 } },
                'The communities that contribute the LEAST to climate change often face the GREATEST risks. This is what scientists and advocates call climate injustice.')
            ),

            // View toggle
            el('div', { style: { display: 'flex', gap: 6, marginBottom: 16 } },
              [{ id: 'risk', label: '\u26A0\uFE0F Risks' }, { id: 'emissions', label: '\uD83C\uDFED Emissions' }, { id: 'resilience', label: '\uD83D\uDCAA Resilience' }].map(function(v) {
                return el('button', { key: v.id, onClick: function() { upd('cjView', v.id); },
                  style: { flex: 1, padding: '8px 12px', borderRadius: 8, border: cjView === v.id ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.1)', background: cjView === v.id ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.03)', color: cjView === v.id ? '#fbbf24' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                  v.label);
              })
            ),

            // Region cards
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              REGIONS.map(function(r) {
                var isOpen = cjRegion === r.id;
                var regionsViewed = d.regionsViewed || {};
                return el('div', { key: r.id, onClick: function() {
                    upd('cjRegion', isOpen ? null : r.id);
                    if (!regionsViewed[r.id]) {
                      var nv = Object.assign({}, regionsViewed); nv[r.id] = true;
                      upd('regionsViewed', nv);
                      awardXP(5);
                      if (Object.keys(nv).length >= 5) earnBadge('justiceExplorer');
                    }
                  },
                  style: { padding: 14, borderRadius: 12, background: isOpen ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (isOpen ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.08)'), cursor: 'pointer', transition: 'all 0.2s' } },

                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                    el('span', { style: { fontSize: 20 } }, r.emoji),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { color: '#e2e8f0', fontSize: 13, fontWeight: 800 } }, r.name),
                      el('div', { style: { fontSize: 10, color: '#64748b' } }, 'Pop: ' + r.pop)
                    ),
                    el('span', { style: { padding: '2px 8px', borderRadius: 12, background: riskColors[r.risk] + '20', color: riskColors[r.risk], fontSize: 9, fontWeight: 800, textTransform: 'uppercase' } }, r.risk + ' risk')
                  ),

                  // Risk vs emissions bar
                  cjView === 'emissions' && el('div', { style: { marginTop: 6 } },
                    el('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b', marginBottom: 2 } },
                      el('span', null, 'Share of global emissions'), el('span', null, r.emPct + '%')),
                    el('div', { style: { height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                      el('div', { style: { width: Math.min(100, r.emPct * 5) + '%', height: '100%', borderRadius: 3, background: '#ef4444' } })
                    )
                  ),

                  cjView === 'risk' && el('div', { style: { marginTop: 6, color: '#94a3b8', fontSize: 10 } }, '\u26A0\uFE0F ' + r.type),

                  cjView === 'resilience' && el('div', { style: { marginTop: 6, color: '#6ee7b7', fontSize: 10 } }, '\uD83D\uDCAA ' + r.resilience),

                  // Expanded detail
                  isOpen && el('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.08)' } },
                    el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.7, marginBottom: 8 } }, r.story),
                    el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' } },
                      el('div', { style: { color: '#4ade80', fontSize: 10, fontWeight: 800 } }, '\uD83D\uDCAA Community Resilience'),
                      el('div', { style: { color: '#94a3b8', fontSize: 10, lineHeight: 1.5, marginTop: 2 } }, r.resilience)
                    ),
                    r.emPct < 1 && el('div', { style: { marginTop: 8, padding: 8, borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#fca5a5', fontSize: 10, textAlign: 'center' } },
                      '\u26A0\uFE0F This community produces just ' + r.emPct + '% of global emissions but faces ' + r.risk + ' risk \u2014 that\'s climate injustice.')
                  )
                );
              })
            ),

            // Discussion prompt
            el('div', { style: { marginTop: 20, padding: 16, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' } },
              el('div', { style: { color: '#a5b4fc', fontSize: 13, fontWeight: 800, marginBottom: 6 } }, '\uD83D\uDDE3\uFE0F Discussion Questions'),
              el('div', { style: { color: '#94a3b8', fontSize: 11, lineHeight: 1.8 } },
                'Is it fair that the communities least responsible for climate change are most affected?\n' +
                'What responsibilities do high-emitting countries have?\n' +
                'How can we support communities building resilience?')
            )
          ),

          // ═══ TAB: SOLUTIONS SPOTLIGHT ═══
          tab === 'solutions' && el('div', { style: { maxWidth: 700, margin: '0 auto' } },
            el('div', { style: { textAlign: 'center', marginBottom: 20 } },
              el('div', { style: { color: '#22c55e', fontSize: 16, fontWeight: 900 } }, '\uD83D\uDCA1 Solutions Spotlight'),
              el('div', { style: { color: '#64748b', fontSize: 12 } }, 'Real innovations making a real difference \u2014 and what YOU can do')
            ),

            // Category filter
            el('div', { style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', justifyContent: 'center' } },
              [{ id: 'all', label: 'All' }, { id: 'energy', label: '\u26A1 Energy' }, { id: 'transport', label: '\uD83D\uDE8C Transport' }, { id: 'nature', label: '\uD83C\uDF33 Nature' }, { id: 'capture', label: '\uD83C\uDFED Capture' }].map(function(c) {
                return el('button', { key: c.id, onClick: function() { upd('ssCategory', c.id); },
                  style: { padding: '6px 14px', borderRadius: 20, border: ssCategory === c.id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.1)', background: ssCategory === c.id ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.03)', color: ssCategory === c.id ? '#4ade80' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer' } },
                  c.label);
              })
            ),

            // Solution cards
            el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 } },
              SOLUTIONS.filter(function(s) { return ssCategory === 'all' || s.cat === ssCategory || s.cat === 'all'; }).map(function(s) {
                var isExp = ssExpanded === s.id;
                return el('div', { key: s.id, onClick: function() { upd('ssExpanded', isExp ? null : s.id); awardXP(5); },
                  style: { padding: 16, borderRadius: 12, background: s.highlight ? 'linear-gradient(135deg, rgba(34,197,94,0.1), rgba(245,158,11,0.08))' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (s.highlight ? 'rgba(34,197,94,0.25)' : isExp ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.08)'), cursor: 'pointer', transition: 'all 0.2s' } },
                  el('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: isExp ? 10 : 0 } },
                    el('span', { style: { fontSize: 28 } }, s.emoji),
                    el('div', null,
                      el('div', { style: { color: '#e2e8f0', fontSize: 14, fontWeight: 800 } }, s.title),
                      !isExp && el('div', { style: { color: '#64748b', fontSize: 10, marginTop: 2 } }, s.what.substring(0, 60) + '...')
                    )
                  ),
                  isExp && el('div', null,
                    el('div', { style: { marginBottom: 8 } },
                      el('div', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 } }, 'What'),
                      el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 } }, s.what)
                    ),
                    el('div', { style: { marginBottom: 8 } },
                      el('div', { style: { color: '#94a3b8', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 } }, 'Where'),
                      el('div', { style: { color: '#cbd5e1', fontSize: 11, lineHeight: 1.6 } }, s.where)
                    ),
                    el('div', { style: { padding: 10, borderRadius: 8, background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.12)' } },
                      el('div', { style: { color: '#4ade80', fontSize: 11, fontWeight: 800 } }, '\uD83D\uDCC8 Impact'),
                      el('div', { style: { color: '#6ee7b7', fontSize: 11, lineHeight: 1.5, marginTop: 2 } }, s.impact)
                    )
                  )
                );
              })
            ),

            // What Can I Do section
            el('div', { style: { marginTop: 20 } },
              el('button', { onClick: function() { upd('ssShowActions', !ssShowActions); if (!ssShowActions) earnBadge('actionPlanner'); },
                style: { width: '100%', padding: '14px 20px', borderRadius: 12, border: '2px solid rgba(34,197,94,0.3)', background: ssShowActions ? 'rgba(34,197,94,0.12)' : 'rgba(34,197,94,0.04)', color: '#4ade80', fontSize: 14, fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' } },
                (ssShowActions ? '\u25BC' : '\u25B6') + ' What Can I Do?'),

              ssShowActions && el('div', { style: { marginTop: 12 } },
                el('div', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 12, textAlign: 'center' } },
                  'Your choices matter AND systemic changes matter even more. Here\'s how to do both:'),
                ACTIONS.map(function(a, ai) {
                  var diffColors = { easy: '#22c55e', medium: '#f59e0b', hard: '#a855f7' };
                  return el('div', { key: ai, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 6 } },
                    el('span', { style: { fontSize: 20 } }, a.emoji),
                    el('div', { style: { flex: 1 } },
                      el('div', { style: { color: '#e2e8f0', fontSize: 12, fontWeight: 700 } }, a.text),
                      el('div', { style: { color: '#64748b', fontSize: 10, marginTop: 2 } }, a.impact)
                    ),
                    el('span', { style: { padding: '2px 8px', borderRadius: 10, background: diffColors[a.diff] + '20', color: diffColors[a.diff], fontSize: 9, fontWeight: 700 } }, a.diff)
                  );
                }),
                el('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textAlign: 'center' } },
                  el('div', { style: { color: '#a5b4fc', fontSize: 12, fontWeight: 800, marginBottom: 4 } }, '\uD83D\uDCA1 Remember'),
                  el('div', { style: { color: '#94a3b8', fontSize: 11, lineHeight: 1.6 } },
                    'Individual action is powerful AND we need systemic change. Talk to adults, support clean energy, vote for the planet when you\'re old enough. The most impactful thing you can do is inspire others to act.')
                )
              )
            ),

            // Hope footer
            el('div', { style: { marginTop: 20, padding: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(59,130,246,0.06))', border: '1px solid rgba(34,197,94,0.15)', textAlign: 'center' } },
              el('div', { style: { fontSize: 28, marginBottom: 6 } }, '\uD83C\uDF1F'),
              el('div', { style: { color: '#4ade80', fontSize: 14, fontWeight: 900, marginBottom: 6 } }, 'The Future Is Being Written Right Now'),
              el('div', { style: { color: '#94a3b8', fontSize: 12, lineHeight: 1.7, maxWidth: 500, margin: '0 auto' } },
                'Solar is the cheapest energy in history. Electric vehicles outsell gas cars in many countries. Young people are leading the charge. The solutions exist \u2014 we just need to choose them. Every action, every conversation, every vote counts.')
            )
          )
        )
      );
    }
  });
})();
