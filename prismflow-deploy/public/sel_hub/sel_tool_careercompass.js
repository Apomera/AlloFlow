// ═══════════════════════════════════════════════════════════════
// sel_tool_careercompass.js — Career Compass
// An interest-exploration tool built on Holland's RIASEC framework
// (Realistic, Investigative, Artistic, Social, Enterprising,
// Conventional). 36-item self-check → top-three Holland code →
// career browsing by code, plus the 16 federal Career Clusters as
// an alternative entry. Cross-links to VIA Strengths and Values &
// Committed Action. Points to the authoritative O*NET Interest
// Profiler (US Department of Labor) for the validated version.
// Registered tool ID: "careerCompass"
// Category: self-direction
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

if (!(window.SelHub.isRegistered && window.SelHub.isRegistered('careerCompass'))) {
(function() {
  'use strict';

  (function() {
    if (document.getElementById('allo-live-careercompass')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-careercompass';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

  // The six RIASEC types
  var TYPES = {
    R: { id: 'R', label: 'Realistic',     icon: '🔧', color: '#d97706', shortName: 'Doers',
         summary: 'People who like working with their hands, tools, machines, animals, or the outdoors. Practical and hands-on.',
         atWork: 'You like to BUILD, FIX, or PHYSICALLY ENGAGE with the world. You\'d rather show me than tell me. Concrete results matter more to you than abstract theory.',
         careers: ['Electrician', 'Auto mechanic', 'Carpenter / construction', 'Farmer or rancher', 'Firefighter / EMT', 'Athlete or coach', 'Pilot or flight crew', 'Forest ranger or conservation', 'Machinist or welder', 'Veterinary tech', 'Plumber', 'HVAC technician', 'Police officer', 'Military', 'Chef'] },
    I: { id: 'I', label: 'Investigative', icon: '🔬', color: '#0ea5e9', shortName: 'Thinkers',
         summary: 'People who like exploring ideas, conducting research, solving puzzles, and understanding how things work.',
         atWork: 'You like to UNDERSTAND why something is the way it is. You\'re curious about systems, data, theories. You enjoy figuring out things that nobody has fully figured out yet.',
         careers: ['Doctor or physician', 'Software engineer / developer', 'Data analyst or scientist', 'Research scientist (any field)', 'Pharmacist', 'Lab technician', 'Mathematician', 'Anthropologist or sociologist', 'Psychologist', 'Engineer (mechanical, civil, etc.)', 'Astronomer', 'Geologist', 'Marine biologist', 'Epidemiologist', 'Forensic scientist'] },
    A: { id: 'A', label: 'Artistic',      icon: '🎨', color: '#a855f7', shortName: 'Creators',
         summary: 'People who like creative expression, making things, and working with imagination and aesthetics.',
         atWork: 'You like to MAKE things that didn\'t exist before. You think in images, sounds, stories, or design. You want freedom to bring your imagination into form.',
         careers: ['Graphic designer', 'Musician or composer', 'Writer / journalist / poet', 'Actor or filmmaker', 'Photographer or videographer', 'Architect', 'Interior or fashion designer', 'Animator or game designer', 'Chef', 'Art teacher', 'Tattoo artist', 'Dancer or choreographer', 'Hairstylist or makeup artist', 'UX / UI designer', 'Curator or art historian'] },
    S: { id: 'S', label: 'Social',        icon: '🤝', color: '#22c55e', shortName: 'Helpers',
         summary: 'People who like helping, teaching, healing, and working closely with others.',
         atWork: 'You\'re drawn to work where you are WITH people. You read other humans well; you can hold someone\'s hard moment. You want to leave people better than you found them.',
         careers: ['Teacher (any level / subject)', 'Nurse', 'School counselor', 'Social worker', 'Therapist or psychologist', 'Coach (sport or life)', 'Physical or occupational therapist', 'Speech-language pathologist', 'Child care provider', 'Healthcare aide', 'Librarian', 'Religious leader', 'Community organizer', 'Special education teacher', 'Hospice or palliative care'] },
    E: { id: 'E', label: 'Enterprising',  icon: '💼', color: '#ef4444', shortName: 'Persuaders',
         summary: 'People who like leading, persuading, starting things, and influencing others.',
         atWork: 'You like to GO FIRST. You see what could exist and want to bring people along. You\'re comfortable making decisions, taking risks, and selling an idea.',
         careers: ['Entrepreneur / founder', 'Lawyer or paralegal', 'Manager or director', 'Sales representative', 'Real estate agent', 'Politician or campaign staff', 'School principal or admin', 'Restaurant or shop owner', 'Event planner', 'Marketing or advertising', 'Stockbroker / financial advisor', 'Journalist (investigative)', 'Public relations', 'Hotel manager', 'Recruiter'] },
    C: { id: 'C', label: 'Conventional',  icon: '📋', color: '#6366f1', shortName: 'Organizers',
         summary: 'People who like working with details, organizing, following procedures, and bringing order to information.',
         atWork: 'You like things in their place. You can spot a typo, a missing detail, a system that\'s out of whack. You\'re reliable; people trust you to handle the things that have to be done RIGHT.',
         careers: ['Accountant or bookkeeper', 'Administrative assistant', 'Paralegal', 'Bank teller or banker', 'Medical records specialist', 'Tax preparer', 'Logistics coordinator', 'Computer programmer (with C)', 'Librarian (with S)', 'Quality control inspector', 'Editor or proofreader', 'Insurance underwriter', 'Court reporter', 'Office manager', 'Data entry / records management'] }
  };

  // 36 interest items (6 per RIASEC type)
  var ITEMS = [
    // R - Realistic
    { id: 'r1', type: 'R', text: 'Build, fix, or repair something with my hands.' },
    { id: 'r2', type: 'R', text: 'Work outdoors, in different weather.' },
    { id: 'r3', type: 'R', text: 'Operate machines, vehicles, or tools.' },
    { id: 'r4', type: 'R', text: 'Take apart electronics or engines to see how they work.' },
    { id: 'r5', type: 'R', text: 'Work with animals: train, care for, or work alongside them.' },
    { id: 'r6', type: 'R', text: 'Use physical strength or coordination as a regular part of work.' },

    // I - Investigative
    { id: 'i1', type: 'I', text: 'Solve a tough math, science, or logic problem.' },
    { id: 'i2', type: 'I', text: 'Conduct an experiment to find out what really happens.' },
    { id: 'i3', type: 'I', text: 'Read or watch in-depth content about science, history, or how things work.' },
    { id: 'i4', type: 'I', text: 'Analyze data to find patterns nobody else has noticed.' },
    { id: 'i5', type: 'I', text: 'Think deeply about why people do what they do.' },
    { id: 'i6', type: 'I', text: 'Investigate a mystery or unanswered question over a long time.' },

    // A - Artistic
    { id: 'a1', type: 'A', text: 'Create art, music, writing, or video as a serious practice.' },
    { id: 'a2', type: 'A', text: 'Decorate, arrange, or design a physical space.' },
    { id: 'a3', type: 'A', text: 'Perform in front of an audience.' },
    { id: 'a4', type: 'A', text: 'Come up with original ideas that nobody else has thought of yet.' },
    { id: 'a5', type: 'A', text: 'Tell stories — through words, images, sound, or movement.' },
    { id: 'a6', type: 'A', text: 'Express my emotions through a creative form rather than talking about them.' },

    // S - Social
    { id: 's1', type: 'S', text: 'Help someone learn something new.' },
    { id: 's2', type: 'S', text: 'Listen to a friend going through something hard.' },
    { id: 's3', type: 'S', text: 'Volunteer in my community on a regular basis.' },
    { id: 's4', type: 'S', text: 'Take care of someone who is sick, hurt, or struggling.' },
    { id: 's5', type: 'S', text: 'Teach children, including the patience that takes.' },
    { id: 's6', type: 'S', text: 'Help two people work through a conflict between them.' },

    // E - Enterprising
    { id: 'e1', type: 'E', text: 'Lead a team or project from start to finish.' },
    { id: 'e2', type: 'E', text: 'Convince other people of an idea or sell them something.' },
    { id: 'e3', type: 'E', text: 'Start a business, club, or organization of my own.' },
    { id: 'e4', type: 'E', text: 'Speak in front of a group, even when nervous.' },
    { id: 'e5', type: 'E', text: 'Set big goals and work toward them with other people.' },
    { id: 'e6', type: 'E', text: 'Take charge when nobody else is stepping up.' },

    // C - Conventional
    { id: 'c1', type: 'C', text: 'Keep records, lists, or files organized and up to date.' },
    { id: 'c2', type: 'C', text: 'Follow detailed instructions carefully and precisely.' },
    { id: 'c3', type: 'C', text: 'Work with numbers, budgets, or schedules.' },
    { id: 'c4', type: 'C', text: 'Notice when something is out of place, inaccurate, or wrong.' },
    { id: 'c5', type: 'C', text: 'Plan and organize an event step-by-step until everything is in order.' },
    { id: 'c6', type: 'C', text: 'Keep track of inventory, supplies, or data over time.' }
  ];

  // The 16 federal Career Clusters
  var CLUSTERS = [
    { id: 'agriculture',    label: 'Agriculture, Food & Natural Resources', icon: '🌾', codes: ['R', 'I'], blurb: 'Working with land, food production, animals, and natural systems.' },
    { id: 'architecture',   label: 'Architecture & Construction', icon: '🏗️', codes: ['R', 'A', 'C'], blurb: 'Designing, building, and maintaining the built environment.' },
    { id: 'arts',           label: 'Arts, A/V Technology & Communications', icon: '🎬', codes: ['A', 'E'], blurb: 'Visual arts, performing arts, media, journalism, broadcasting.' },
    { id: 'business',       label: 'Business Management & Administration', icon: '📊', codes: ['E', 'C'], blurb: 'Running organizations: management, operations, HR, admin.' },
    { id: 'education',      label: 'Education & Training', icon: '🎓', codes: ['S', 'A'], blurb: 'Teaching, coaching, training across all levels.' },
    { id: 'finance',        label: 'Finance', icon: '💰', codes: ['C', 'E'], blurb: 'Banking, investing, insurance, accounting, financial planning.' },
    { id: 'government',     label: 'Government & Public Administration', icon: '🏛️', codes: ['E', 'C', 'S'], blurb: 'Public service in government roles at any level.' },
    { id: 'health',         label: 'Health Science', icon: '⚕️', codes: ['S', 'I', 'R'], blurb: 'Medicine, nursing, allied health, public health, dental, biomedical.' },
    { id: 'hospitality',    label: 'Hospitality & Tourism', icon: '🏨', codes: ['E', 'S', 'C'], blurb: 'Restaurants, hotels, travel, recreation, food service.' },
    { id: 'humanservices',  label: 'Human Services', icon: '🫂', codes: ['S'], blurb: 'Counseling, social work, family services, community work.' },
    { id: 'it',             label: 'Information Technology', icon: '💻', codes: ['I', 'R', 'C'], blurb: 'Software, networks, cybersecurity, data, IT support.' },
    { id: 'law',            label: 'Law, Public Safety & Security', icon: '⚖️', codes: ['E', 'S', 'R'], blurb: 'Law enforcement, fire/EMS, military, corrections, legal services.' },
    { id: 'manufacturing',  label: 'Manufacturing', icon: '🏭', codes: ['R', 'C'], blurb: 'Making physical goods: production, assembly, quality control.' },
    { id: 'marketing',      label: 'Marketing', icon: '📢', codes: ['E', 'A', 'C'], blurb: 'Advertising, sales, market research, branding, digital marketing.' },
    { id: 'stem',           label: 'Science, Technology, Engineering & Math (STEM)', icon: '🔬', codes: ['I', 'R'], blurb: 'Research, engineering, applied math, technical R&D.' },
    { id: 'transportation', label: 'Transportation & Logistics', icon: '🚚', codes: ['R', 'C'], blurb: 'Moving people and goods: drivers, pilots, logistics, supply chain.' }
  ];

  function defaultState() {
    return {
      view: 'home',
      ratings: {},          // itemId -> -1 | 0 | 1
      lastUpdated: null
    };
  }

  function todayISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dd = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dd;
  }

  function computeScores(ratings) {
    var scores = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
    var rated = ratings || {};
    ITEMS.forEach(function(item) {
      var r = rated[item.id];
      if (r !== undefined && r !== null) scores[item.type] += r;
    });
    return scores;
  }

  function rankTypes(scores) {
    return ['R', 'I', 'A', 'S', 'E', 'C'].slice().sort(function(a, b) {
      return scores[b] - scores[a];
    });
  }

  function isComplete(ratings) {
    var rated = ratings || {};
    return ITEMS.every(function(item) { return rated[item.id] !== undefined && rated[item.id] !== null; });
  }

  window.SelHub.registerTool('careerCompass', {
    icon: '🧭',
    label: 'Career Compass',
    desc: 'Explore careers through your interests. A 36-item self-check built on Holland\'s RIASEC framework gives you a top-three Holland code; browse careers by code, the 16 federal Career Clusters, and concrete next steps (shadow days, info interviews, CTE, apprenticeships). Points to the authoritative O*NET Interest Profiler at mynextmove.org.',
    color: 'indigo',
    category: 'self-direction',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var labToolData = ctx.toolData || {};
      var setLabToolData = ctx.setToolData;
      var setSelHubTool = ctx.setSelHubTool;
      var addToast = ctx.addToast;
      var announceToSR = ctx.announceToSR;

      var d = labToolData.careerCompass || defaultState();
      function setCC(patch) {
        setLabToolData(function(prev) {
          var prior = (prev && prev.careerCompass) || defaultState();
          var next = Object.assign({}, prior, patch);
          if (patch.ratings) next.lastUpdated = todayISO();
          return Object.assign({}, prev, { careerCompass: next });
        });
      }
      var view = d.view || 'home';
      function goto(v) { setCC({ view: v }); }
      function printNow() { try { window.print(); } catch (e) {} }

      var scores = computeScores(d.ratings);
      var ranking = rankTypes(scores);
      var topThree = ranking.slice(0, 3);
      var complete = isComplete(d.ratings);

      function header() {
        return h('div', { className: 'no-print', style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
          h('button', { onClick: function() { setSelHubTool(null); }, 'aria-label': 'Back to SEL Hub',
            style: { background: 'rgba(255,255,255,0.05)', border: '1px solid #334155', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#cbd5e1', fontSize: 14 } }, '← Back'),
          h('div', { style: { flex: 1, minWidth: 260 } },
            h('h2', { style: { margin: 0, color: '#a5b4fc', fontSize: 22, fontWeight: 900 } }, '🧭 Career Compass'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.5 } }, 'Explore careers through your interests. Holland\'s RIASEC framework.')
          )
        );
      }

      function navTabs() {
        var tabs = [
          { id: 'home', label: 'Overview', icon: '🧭' },
          { id: 'screener', label: complete ? 'Re-take' : 'Self-check', icon: '✏️' },
          { id: 'results', label: 'My code', icon: '⭐' },
          { id: 'careers', label: 'Careers', icon: '💼' },
          { id: 'clusters', label: 'Clusters', icon: '🗂️' },
          { id: 'nextsteps', label: 'Next steps', icon: '🚶' },
          { id: 'print', label: 'Print', icon: '🖨' },
          { id: 'about', label: 'About', icon: 'ℹ' }
        ];
        return h('div', { className: 'no-print', role: 'tablist', 'aria-label': 'Career Compass sections',
          style: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' } },
          tabs.map(function(t) {
            var active = view === t.id;
            return h('button', { key: t.id, onClick: function() { goto(t.id); },
              role: 'tab', 'aria-selected': active,
              style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (active ? '#818cf8' : '#334155'),
                background: active ? 'rgba(129,140,248,0.18)' : '#1e293b',
                color: active ? '#e0e7ff' : '#cbd5e1', cursor: 'pointer', fontSize: 12, fontWeight: 700 } },
              t.icon + ' ' + t.label);
          })
        );
      }

      function authoritativeBanner() {
        return h('div', { className: 'no-print', style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.4)', borderLeft: '3px solid #818cf8', marginBottom: 12, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.65 } },
          h('strong', null, '🔗 The authoritative version: '),
          'the US Department of Labor\'s O*NET Interest Profiler at ',
          h('a', { href: 'https://www.mynextmove.org/explore/ip', target: '_blank', rel: 'noopener noreferrer',
            style: { color: '#bfdbfe', textDecoration: 'underline', fontWeight: 800 } }, 'mynextmove.org/explore/ip ↗'),
          ' is free, public-domain, and connected to live career data on ~1000 careers. This tool is a brief screener built on the same Holland RIASEC framework; take O*NET\'s version for depth.'
        );
      }

      function softPointer() {
        return h('div', { className: 'no-print',
          style: { marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', fontSize: 11, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' }
        },
          'A Holland code is a starting point, not a prediction. Many people thrive in careers that do not match their dominant type. If career conversations are stirring family pressure, financial worry, or identity questions, that is worth a counselor session. Crisis Text Line: text HOME to 741741.'
        );
      }

      // ═══════════════════════════════════════════════════════════
      // HOME — roadmap + summary
      // ═══════════════════════════════════════════════════════════
      function renderHome() {
        var rated = Object.keys(d.ratings || {}).filter(function(k) { return d.ratings[k] !== null && d.ratings[k] !== undefined; }).length;

        return h('div', null,
          h('div', { style: { padding: 18, borderRadius: 14, background: 'linear-gradient(135deg, rgba(129,140,248,0.16) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', marginBottom: 14 } },
            h('div', { style: { fontSize: 22, fontWeight: 900, color: '#e0e7ff', marginBottom: 4 } }, 'What kind of work fits me?'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.65 } },
              'Career exploration starts with interests, not job titles. The Holland RIASEC framework asks "what activities would I enjoy?" rather than "what should I be?" Most people are a blend of three of the six types; that combination points toward careers where they thrive.'
            )
          ),

          authoritativeBanner(),

          // Roadmap
          stepCard(1, '✏️ Take the self-check (36 items, ~5 minutes)', 'Mark each activity as "Like", "Not sure", or "Don\'t like." No right answers.', rated + ' / 36 rated', function() { goto('screener'); }, '#0ea5e9'),
          stepCard(2, '⭐ See your Holland code', 'Your top 3 types out of R-I-A-S-E-C, plus what each means about how you might work.', complete ? '✓ Ready' : 'Take the screener first', function() { complete ? goto('results') : goto('screener'); }, '#a855f7'),
          stepCard(3, '💼 Browse careers by your code', '~15 careers per Holland type. Education paths, related work, places to look further.', complete ? 'Explore' : 'Take screener first', function() { complete ? goto('careers') : goto('screener'); }, '#22c55e'),
          stepCard(4, '🗂️ Or browse by the 16 Career Clusters', 'Another way in: the US Department of Education\'s 16 career groups.', 'Browse', function() { goto('clusters'); }, '#f59e0b'),
          stepCard(5, '🚶 Take a concrete next step', 'Shadow day, info interview, CTE program, apprenticeship, summer job. Small moves beat a perfect plan.', 'Explore', function() { goto('nextsteps'); }, '#ef4444'),

          softPointer()
        );
      }

      function stepCard(stepNum, title, blurb, status, onClick, color) {
        return h('button', { onClick: onClick, 'aria-label': 'Step ' + stepNum + ': ' + title,
          style: { width: '100%', textAlign: 'left', padding: 14, borderRadius: 10, border: '1px solid #1e293b', borderLeft: '4px solid ' + color, background: '#0f172a', cursor: 'pointer', marginBottom: 8, color: '#e2e8f0' } },
          h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
            h('span', { style: { fontSize: 14, fontWeight: 800, color: color, flex: 1 } }, title),
            h('span', { style: { fontSize: 11, color: color, fontWeight: 700 } }, status)
          ),
          h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.55 } }, blurb)
        );
      }

      // ═══════════════════════════════════════════════════════════
      // SCREENER — 36 items
      // ═══════════════════════════════════════════════════════════
      function renderScreener() {
        function setRating(itemId, val) {
          var r = Object.assign({}, (d.ratings || {}));
          r[itemId] = val;
          setCC({ ratings: r });
        }
        function clearAll() {
          setCC({ ratings: {} });
          if (addToast) addToast('Cleared. Start fresh.', 'info');
        }

        var ratedCount = Object.keys(d.ratings || {}).filter(function(k) { return d.ratings[k] !== null && d.ratings[k] !== undefined; }).length;
        var pct = Math.round((ratedCount / ITEMS.length) * 100);

        // Group items by type for cleaner display
        var typed = {};
        ITEMS.forEach(function(item) {
          typed[item.type] = typed[item.type] || [];
          typed[item.type].push(item);
        });

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', marginBottom: 14, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.65 } },
            h('strong', null, '✏️ How to do this: '),
            'For each statement, mark how you feel about doing the activity for work, not just trying it once. ',
            h('span', { style: { color: '#22c55e', fontWeight: 700 } }, 'Like'), ', ',
            h('span', { style: { color: '#94a3b8', fontWeight: 700 } }, 'Not sure'), ', or ',
            h('span', { style: { color: '#ef4444', fontWeight: 700 } }, 'Don\'t like'),
            '. Honest answers give a more useful result than answers based on what you "should" want.'
          ),

          // Progress
          h('div', { style: { marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, flexWrap: 'wrap' } },
              h('span', { style: { fontSize: 12, color: '#94a3b8' } }, ratedCount + ' of ' + ITEMS.length + ' rated'),
              ratedCount > 0 ? h('button', { onClick: clearAll, 'aria-label': 'Clear all ratings',
                style: { marginLeft: 'auto', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: 6, padding: '2px 8px', cursor: 'pointer', fontSize: 11 } }, 'Clear all') : null
            ),
            h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', overflow: 'hidden' }, role: 'progressbar', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': pct, 'aria-label': 'Self-check progress' },
              h('div', { style: { height: '100%', width: pct + '%', background: 'linear-gradient(90deg, #4f46e5, #818cf8)', transition: 'width 240ms ease' } })
            )
          ),

          // The items, grouped by type
          ['R', 'I', 'A', 'S', 'E', 'C'].map(function(typeId) {
            var type = TYPES[typeId];
            var items = typed[typeId] || [];
            return h('div', { key: typeId, style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + type.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 } },
                h('span', { style: { fontSize: 18 } }, type.icon),
                h('span', { style: { fontSize: 11, color: type.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, type.label + ' · ' + type.shortName)
              ),
              items.map(function(item) {
                var current = (d.ratings || {})[item.id];
                return h('div', { key: item.id, style: { padding: 8, borderRadius: 6, background: '#1e293b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' } },
                  h('div', { style: { flex: 1, minWidth: 200, fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 } }, item.text),
                  h('div', { style: { display: 'flex', gap: 4 }, role: 'radiogroup', 'aria-label': 'Rate: ' + item.text },
                    h('button', { onClick: function() { setRating(item.id, -1); }, role: 'radio', 'aria-checked': current === -1, 'aria-label': 'Don\'t like',
                      style: { padding: '4px 10px', borderRadius: 4, border: '1px solid ' + (current === -1 ? '#ef4444' : '#475569'), background: current === -1 ? '#ef4444' : 'transparent', color: current === -1 ? '#fff' : '#ef4444', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '✕'),
                    h('button', { onClick: function() { setRating(item.id, 0); }, role: 'radio', 'aria-checked': current === 0, 'aria-label': 'Not sure',
                      style: { padding: '4px 10px', borderRadius: 4, border: '1px solid ' + (current === 0 ? '#94a3b8' : '#475569'), background: current === 0 ? '#475569' : 'transparent', color: '#cbd5e1', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '?'),
                    h('button', { onClick: function() { setRating(item.id, 1); }, role: 'radio', 'aria-checked': current === 1, 'aria-label': 'Like',
                      style: { padding: '4px 10px', borderRadius: 4, border: '1px solid ' + (current === 1 ? '#22c55e' : '#475569'), background: current === 1 ? '#22c55e' : 'transparent', color: current === 1 ? '#fff' : '#22c55e', cursor: 'pointer', fontSize: 11, fontWeight: 700 } }, '✓')
                  )
                );
              })
            );
          }),

          // See results button when complete
          complete ? h('div', { style: { display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('results'); }, 'aria-label': 'See my Holland code',
              style: { padding: '12px 24px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '⭐ See my Holland code')
          ) : null,

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // RESULTS — top 3 Holland code
      // ═══════════════════════════════════════════════════════════
      function renderResults() {
        if (!complete) {
          return h('div', null,
            h('div', { style: { padding: 20, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' } },
              h('div', { style: { fontSize: 36, marginBottom: 8 } }, '✏️'),
              h('div', { style: { color: '#cbd5e1', fontSize: 14, marginBottom: 4 } }, 'Take the self-check first'),
              h('div', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Rate all 36 items to see your Holland code.'),
              h('button', { onClick: function() { goto('screener'); }, 'aria-label': 'Go to self-check',
                style: { padding: '8px 16px', borderRadius: 8, border: '1px solid #818cf8', background: 'rgba(129,140,248,0.18)', color: '#e0e7ff', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '→ Take the self-check')
            )
          );
        }

        var codeString = topThree.join('');

        return h('div', null,
          // The code
          h('div', { style: { padding: 24, borderRadius: 14, background: 'linear-gradient(135deg, rgba(129,140,248,0.20) 0%, rgba(15,23,42,0.4) 60%)', border: '1px solid rgba(129,140,248,0.4)', textAlign: 'center', marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 6 } }, 'Your Holland code'),
            h('div', { style: { display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' } },
              topThree.map(function(t, i) {
                var type = TYPES[t];
                return h('div', { key: t, style: { padding: 14, borderRadius: 12, background: type.color + '22', border: '2px solid ' + type.color, minWidth: 100 } },
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 2 } }, '#' + (i + 1)),
                  h('div', { style: { fontSize: 36, marginBottom: 2 } }, type.icon),
                  h('div', { style: { fontSize: 24, fontWeight: 900, color: type.color, fontFamily: 'ui-monospace, monospace' } }, t),
                  h('div', { style: { fontSize: 11, color: '#e2e8f0', fontWeight: 700 } }, type.label),
                  h('div', { style: { fontSize: 10, color: '#94a3b8' } }, type.shortName)
                );
              })
            ),
            h('div', { style: { fontSize: 32, fontWeight: 900, color: '#e0e7ff', fontFamily: 'ui-monospace, monospace', letterSpacing: 4 } }, codeString),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 6 } }, 'Read this on O*NET as: ',
              h('a', { href: 'https://www.mynextmove.org/explore/ip', target: '_blank', rel: 'noopener noreferrer', style: { color: '#bfdbfe', textDecoration: 'underline' } }, codeString + ' on My Next Move ↗')
            )
          ),

          // Per-type descriptions
          topThree.map(function(t, i) {
            var type = TYPES[t];
            return h('div', { key: t, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '4px solid ' + type.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                h('span', { style: { fontSize: 30 } }, type.icon),
                h('div', null,
                  h('div', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 } }, '#' + (i + 1) + ' · ' + t),
                  h('div', { style: { fontSize: 18, fontWeight: 800, color: type.color } }, type.label + ' — ' + type.shortName)
                )
              ),
              h('p', { style: { margin: '0 0 8px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.65 } }, type.summary),
              h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13, lineHeight: 1.65, fontStyle: 'italic' } }, type.atWork)
            );
          }),

          // All 6 scores (so the student can see the full picture)
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 10 } },
            h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'All six types, ranked'),
            ranking.map(function(t, i) {
              var type = TYPES[t];
              var s = scores[t];
              var pct = Math.round(((s + 6) / 12) * 100);  // map -6..+6 to 0..100
              return h('div', { key: t, style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                h('span', { style: { fontSize: 14, fontWeight: 800, color: type.color, fontFamily: 'ui-monospace, monospace', minWidth: 20 } }, t),
                h('span', { style: { fontSize: 12, color: '#cbd5e1', minWidth: 100 } }, type.label),
                h('div', { style: { flex: 1, height: 8, borderRadius: 4, background: '#1e293b', overflow: 'hidden' }, role: 'meter', 'aria-valuenow': pct, 'aria-label': type.label + ' score' },
                  h('div', { style: { height: '100%', width: pct + '%', background: type.color } })
                ),
                h('span', { style: { fontSize: 11, color: '#94a3b8', minWidth: 30, textAlign: 'right' } }, (s > 0 ? '+' : '') + s)
              );
            })
          ),

          h('div', { style: { display: 'flex', gap: 10, flexWrap: 'wrap' } },
            h('button', { onClick: function() { goto('careers'); }, 'aria-label': 'Browse careers',
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 14 } },
              '💼 Browse careers'),
            h('button', { onClick: function() { goto('nextsteps'); }, 'aria-label': 'Next steps',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🚶 Next steps'),
            h('button', { onClick: function() { goto('print'); }, 'aria-label': 'Print',
              style: { padding: '10px 20px', borderRadius: 10, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 14 } }, '🖨 Print')
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CAREERS — careers by Holland code
      // ═══════════════════════════════════════════════════════════
      function renderCareers() {
        // Show all six types but feature the user's top three
        var orderedTypes = complete ? topThree.concat(ranking.slice(3)) : ['R', 'I', 'A', 'S', 'E', 'C'];

        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', marginBottom: 14, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.65 } },
            h('strong', null, '💼 Careers by Holland type. '),
            complete ? 'Your top three are listed first. ' : '',
            'These are sample careers, not complete lists. For depth + salary + education paths, check the linked O*NET pages for each.'
          ),

          orderedTypes.map(function(t, idx) {
            var type = TYPES[t];
            var isTop = complete && topThree.indexOf(t) !== -1;
            return h('div', { key: t, style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid ' + (isTop ? type.color : '#1e293b'), borderLeft: '4px solid ' + type.color, marginBottom: 10 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' } },
                h('span', { style: { fontSize: 22 } }, type.icon),
                h('span', { style: { fontSize: 15, fontWeight: 800, color: type.color, flex: 1 } }, type.label + ' (' + t + ') — ' + type.shortName),
                isTop ? h('span', { style: { fontSize: 10, padding: '2px 8px', borderRadius: 4, background: type.color, color: '#fff', fontWeight: 800, letterSpacing: 0.5 } }, '★ YOUR CODE') : null,
                h('a', { href: 'https://www.onetonline.org/find/quick?s=' + t, target: '_blank', rel: 'noopener noreferrer',
                  style: { fontSize: 11, color: type.color, textDecoration: 'underline', fontWeight: 700 } }, 'O*NET careers ↗')
              ),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic', lineHeight: 1.55 } }, type.summary),
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                type.careers.map(function(c, ci) {
                  return h('a', { key: ci,
                    href: 'https://www.onetonline.org/find/quick?s=' + encodeURIComponent(c),
                    target: '_blank', rel: 'noopener noreferrer',
                    'aria-label': 'Look up ' + c + ' on O*NET',
                    style: { padding: '4px 10px', borderRadius: 14, border: '1px solid ' + type.color + '66', background: 'rgba(15,23,42,0.6)', color: '#cbd5e1', textDecoration: 'none', fontSize: 12 } }, c + ' ↗');
                })
              )
            );
          }),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // CLUSTERS — 16 Career Clusters
      // ═══════════════════════════════════════════════════════════
      function renderClusters() {
        return h('div', null,
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 14, fontSize: 12.5, color: '#fde68a', lineHeight: 1.65 } },
            h('strong', null, '🗂️ The 16 Career Clusters '),
            'are a federal framework from the US Department of Education. They group careers by industry rather than by personality type, and they connect directly to Career and Technical Education (CTE) pathways. Many high schools organize their CTE programs around these clusters.'
          ),

          // Filter clusters that match top Holland types
          complete ? h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #818cf8', marginBottom: 14 } },
            h('div', { style: { fontSize: 12, color: '#e0e7ff', fontWeight: 800, marginBottom: 8 } }, '⭐ Clusters that connect to your Holland code (' + topThree.join('') + ')'),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
              CLUSTERS.filter(function(c) {
                return c.codes.some(function(code) { return topThree.indexOf(code) !== -1; });
              }).map(function(c) {
                return h('span', { key: c.id, style: { padding: '4px 10px', borderRadius: 14, background: 'rgba(129,140,248,0.18)', color: '#e0e7ff', fontSize: 11.5, fontWeight: 700 } }, c.icon + ' ' + c.label);
              })
            )
          ) : null,

          h('div', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 } }, 'All 16 clusters'),

          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 8 } },
            CLUSTERS.map(function(c) {
              var matchesTop = complete && c.codes.some(function(code) { return topThree.indexOf(code) !== -1; });
              return h('div', { key: c.id, style: { padding: 12, borderRadius: 8, background: '#0f172a', border: '1px solid ' + (matchesTop ? '#818cf8' : '#1e293b') } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 } },
                  h('span', { style: { fontSize: 20 } }, c.icon),
                  h('span', { style: { fontSize: 13, fontWeight: 700, color: matchesTop ? '#e0e7ff' : '#e2e8f0', flex: 1 } }, c.label),
                  matchesTop ? h('span', { style: { fontSize: 9, color: '#818cf8', fontWeight: 800 } }, '★') : null
                ),
                h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.55, marginBottom: 6 } }, c.blurb),
                h('div', { style: { display: 'flex', gap: 4, flexWrap: 'wrap' } },
                  c.codes.map(function(code) {
                    var type = TYPES[code];
                    return h('span', { key: code, style: { padding: '2px 6px', borderRadius: 4, background: type.color + '22', color: type.color, fontSize: 10, fontWeight: 800, fontFamily: 'ui-monospace, monospace' } }, code);
                  })
                )
              );
            })
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // NEXT STEPS — concrete moves
      // ═══════════════════════════════════════════════════════════
      function renderNextSteps() {
        return h('div', null,
          h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', borderLeft: '3px solid #ef4444', marginBottom: 14, fontSize: 13, color: '#fecaca', lineHeight: 1.65 } },
            h('strong', null, '🚶 Small moves beat a perfect plan. '),
            'You do not need to pick a career today. You need ONE small move that gets you closer to knowing.'
          ),

          stepGroup('Within the next 2 weeks (no money needed)', '#22c55e', [
            'Search "[a career you are curious about]" + day in the life on YouTube. Watch one video.',
            'Ask one adult what they do all day at work. Just listen.',
            'Look up the career on O*NET (onetonline.org) and write down two things that surprised you.',
            'Take the official O*NET Interest Profiler at mynextmove.org/explore/ip.',
            'Ask your school counselor what CTE / dual enrollment options your school has.'
          ]),

          stepGroup('Within the next 1-2 months', '#3b82f6', [
            'Schedule a 15-minute informational interview with someone in a career you are curious about.',
            'Job-shadow for a half day. Ask your counselor or family to help connect you.',
            'Try a free online course in a field you are curious about (Khan Academy, Coursera, edX have free options).',
            'Volunteer somewhere that does work you might enjoy.',
            'Talk to a senior at your high school who is going into the field.'
          ]),

          stepGroup('This year (if you are in high school or planning ahead)', '#a855f7', [
            'Look at the CTE programs at your school or your district\'s regional CTE center. Many start in 10th or 11th grade.',
            'Look at apprenticeships in your state. The US Department of Labor lists them at apprenticeship.gov.',
            'Look at certifications you could earn before graduation (medical assistant, IT, welding, EMT-Basic, etc.).',
            'Take a class outside your usual track if your schedule allows.',
            'Get a summer job in a field you might enjoy, even if it is entry-level.'
          ]),

          // Maine-specific note (Aaron is in Portland ME)
          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', borderLeft: '3px solid #22c55e', marginBottom: 12, fontSize: 12.5, color: '#bbf7d0', lineHeight: 1.65 } },
            h('strong', null, '🏔 If you are in Maine: '),
            'check out ',
            h('a', { href: 'https://www.maine.gov/doe/cte', target: '_blank', rel: 'noopener noreferrer', style: { color: '#86efac', textDecoration: 'underline', fontWeight: 700 } }, 'Maine DOE Career and Technical Education ↗'),
            ' for the 27 CTE regional centers and high school programs across the state, including Portland Arts and Technology High School (PATHS) for the Greater Portland area. Maine has strong apprenticeship pipelines in skilled trades, healthcare, and IT.'
          ),

          // Cross-links to other AlloFlow tools
          h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid #818cf8', marginBottom: 10 } },
            h('div', { style: { fontSize: 13, fontWeight: 800, color: '#e0e7ff', marginBottom: 8 } }, '🔗 Pair this with other SEL Hub tools'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#cbd5e1', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, h('strong', null, 'VIA Strengths'), ' — your signature character strengths point toward careers where you would thrive (a Social-type with the strength of "Honesty" might be drawn to teaching ethics; with "Bravery", firefighting or social work).'),
              h('li', null, h('strong', null, 'Values & Committed Action'), ' — values and interests are different. You can be Investigative AND value family closeness, which shapes which Investigative careers fit your life.'),
              h('li', null, h('strong', null, 'PATH'), ' — once you have a career direction, PATH walks you backward from the North Star to first steps.'),
              h('li', null, h('strong', null, 'One-Page Profile'), ' — bring your Holland code + a job-shadow reflection to your next IEP or family conversation about your future.')
            )
          ),

          softPointer()
        );
      }

      function stepGroup(title, color, items) {
        return h('div', { style: { padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #1e293b', borderLeft: '3px solid ' + color, marginBottom: 10 } },
          h('div', { style: { fontSize: 13, fontWeight: 800, color: color, marginBottom: 8 } }, title),
          h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#e2e8f0', fontSize: 13, lineHeight: 1.7 } },
            items.map(function(it, i) { return h('li', { key: i, style: { marginBottom: 4 } }, it); })
          )
        );
      }

      // ═══════════════════════════════════════════════════════════
      // PRINT
      // ═══════════════════════════════════════════════════════════
      function renderPrintView() {
        return h('div', null,
          h('div', { className: 'no-print', style: { display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', padding: 12, background: 'rgba(129,140,248,0.10)', borderRadius: 8, border: '1px solid rgba(129,140,248,0.3)' } },
            h('div', { style: { flex: 1, minWidth: 200, fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.55 } },
              h('strong', null, '🖨 Print preview. '),
              'Use your browser\'s print dialog to print or save as PDF.'),
            h('button', { onClick: printNow, 'aria-label': 'Print or save as PDF',
              style: { padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: '#fff', fontWeight: 800, fontSize: 13 } }, '🖨 Print / Save as PDF'),
            h('button', { onClick: function() { goto('home'); }, 'aria-label': 'Back',
              style: { padding: '8px 18px', borderRadius: 8, border: '1px solid #475569', background: '#1e293b', color: '#cbd5e1', cursor: 'pointer', fontWeight: 700, fontSize: 13 } }, '← Back')
          ),

          h('div', {
            id: 'cc-print-region',
            style: { maxWidth: 760, margin: '0 auto', padding: 32, background: '#fff', color: '#0f172a', borderRadius: 8, border: '1px solid #cbd5e1', fontFamily: '"Helvetica Neue", Arial, sans-serif' }
          },
            h('style', null,
              '@media print { body * { visibility: hidden !important; } ' +
              '#cc-print-region, #cc-print-region * { visibility: visible !important; } ' +
              '#cc-print-region { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: none !important; padding: 0 !important; } ' +
              '.no-print { display: none !important; } ' +
              '@page { margin: 0.5in; } }'
            ),

            h('div', { style: { paddingBottom: 14, marginBottom: 20, borderBottom: '3px solid #4f46e5' } },
              h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 2 } }, 'Career Compass · Holland RIASEC'),
              h('h1', { style: { margin: 0, fontSize: 26, fontWeight: 900 } }, complete ? 'My Holland code: ' + topThree.join('') : 'My Career Compass'),
              d.lastUpdated ? h('div', { style: { fontSize: 12, color: '#475569', marginTop: 4 } }, 'Updated ' + d.lastUpdated) : null
            ),

            complete ? h('div', null,
              // Top 3 with descriptions
              h('div', { style: { marginBottom: 18 } },
                h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 6 } }, 'My top three Holland types'),
                topThree.map(function(t, i) {
                  var type = TYPES[t];
                  return h('div', { key: t, style: { marginBottom: 10, padding: 10, borderLeft: '3px solid ' + type.color, background: '#f8fafc' } },
                    h('div', { style: { fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 } }, '#' + (i + 1) + '  ' + type.label + ' (' + t + ') — ' + type.shortName),
                    h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.6, marginBottom: 4 } }, type.summary),
                    h('div', { style: { fontSize: 12, color: '#475569', lineHeight: 1.6, fontStyle: 'italic' } }, type.atWork)
                  );
                })
              ),

              // Sample careers
              h('div', { style: { marginBottom: 18, pageBreakInside: 'avoid' } },
                h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 6 } }, 'Sample careers in my top three types'),
                topThree.map(function(t) {
                  var type = TYPES[t];
                  return h('div', { key: t, style: { marginBottom: 10 } },
                    h('div', { style: { fontSize: 12, fontWeight: 800, color: type.color, marginBottom: 4 } }, type.label + ' (' + t + ')'),
                    h('div', { style: { fontSize: 12, color: '#0f172a', lineHeight: 1.7 } }, type.careers.slice(0, 10).join('  ·  '))
                  );
                })
              ),

              // All six scores
              h('div', { style: { marginBottom: 18 } },
                h('div', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 800, marginBottom: 6 } }, 'All six type scores'),
                h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#0f172a', fontSize: 13, lineHeight: 1.7 } },
                  ranking.map(function(t) {
                    var type = TYPES[t];
                    return h('li', { key: t },
                      h('strong', null, type.label + ' (' + t + ')'),
                      ': ' + (scores[t] > 0 ? '+' : '') + scores[t]
                    );
                  })
                )
              )
            ) : h('div', { style: { padding: 14, fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, 'Self-check not complete yet.'),

            h('div', { style: { marginTop: 20, paddingTop: 12, borderTop: '1px solid #cbd5e1', fontSize: 9, color: '#94a3b8', textAlign: 'center', lineHeight: 1.5 } },
              'Holland\'s RIASEC framework. Career data: take the official O*NET Interest Profiler at mynextmove.org/explore/ip for the validated version. ',
              'Created with AlloFlow SEL Hub.'
            )
          ),

          softPointer()
        );
      }

      // ═══════════════════════════════════════════════════════════
      // ABOUT
      // ═══════════════════════════════════════════════════════════
      function renderAbout() {
        return h('div', null,
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('careerCompass', h, ctx) : null),

          // Authoritative pointer
          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.4)', borderLeft: '4px solid #818cf8', marginBottom: 14 } },
            h('h3', { style: { margin: '0 0 8px', color: '#e0e7ff', fontSize: 16 } }, '🔗 The authoritative version'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13.5, lineHeight: 1.7 } },
              'The US Department of Labor publishes the ',
              h('a', { href: 'https://www.mynextmove.org/explore/ip', target: '_blank', rel: 'noopener noreferrer',
                style: { color: '#bfdbfe', textDecoration: 'underline', fontWeight: 800 } }, 'O*NET Interest Profiler at mynextmove.org ↗'),
              ', a validated 60-item Holland RIASEC assessment connected to the O*NET database of ~1000 careers (with education paths, salary, and growth projections). It is free, public-domain, and the gold standard. This Career Compass tool is a 36-item screener built on the same Holland framework as an entry point; for depth, go to O*NET.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'What this tool is'),
            h('p', { style: { margin: '0 0 10px', color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'Career Compass uses Holland\'s RIASEC framework: a system that organizes work interests into six types (Realistic, Investigative, Artistic, Social, Enterprising, Conventional). The 36-item self-check gives you a top-three Holland code, the standard format for matching to careers in the O*NET database and most US career-counseling practice.'
            ),
            h('p', { style: { margin: 0, color: '#e2e8f0', fontSize: 13.5, lineHeight: 1.7 } },
              'The premise: career exploration starts with what activities you would enjoy, not with job titles. Two people with the same Holland code can end up in very different careers, but they tend to share something about HOW they like to work.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, 'Where Holland\'s framework comes from'),
            h('p', { style: { margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.7 } },
              'John L. Holland was a psychologist and US Army personnel officer who, between the 1950s and 1990s, developed what became the most widely used vocational interest framework in the world. His core claim: people are happier and more successful in work environments that match their interests, and both people and work environments can be described using the same six types. The framework has been validated across decades of research, multiple cultures, and millions of people taking interest inventories. It is the basis of nearly every modern career-interest assessment, including the US Department of Labor\'s official O*NET Interest Profiler.'
            )
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid #1e293b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#a5b4fc', fontSize: 16 } }, '📚 Sources and learn more'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10, lineHeight: 1.55 } }, 'Authoritative resources for career exploration.'),
            sourceCard('O*NET Online (US Department of Labor)', 'onetonline.org', 'The definitive US career database. ~1000 careers, all linked to Holland codes, education paths, salary, growth. Public domain.', 'https://www.onetonline.org/'),
            sourceCard('My Next Move (O*NET Interest Profiler)', 'mynextmove.org/explore/ip', 'The free, validated 60-item Interest Profiler. Take this for your authoritative Holland code.', 'https://www.mynextmove.org/explore/ip'),
            sourceCard('Holland, J. L. (1997)', 'Making Vocational Choices: A Theory of Vocational Personalities and Work Environments (3rd ed.), Psychological Assessment Resources', 'The standard text on Holland\'s framework. Foundational.', null),
            sourceCard('CareerOneStop (US Department of Labor)', 'careeronestop.org', 'Free portal to careers, training programs, and apprenticeships. Spanish + English.', 'https://www.careeronestop.org/'),
            sourceCard('BLS Occupational Outlook Handbook', 'bls.gov/ooh', 'US Bureau of Labor Statistics handbook. Each career with detailed pay, growth, education, day-in-the-life. Public domain.', 'https://www.bls.gov/ooh/'),
            sourceCard('Advance CTE — Career Clusters', 'careertech.org/career-clusters', 'The 16 federal Career Clusters framework. Public domain.', 'https://careertech.org/career-clusters/'),
            sourceCard('Apprenticeship.gov (US DOL)', 'apprenticeship.gov', 'Find registered apprenticeships across the US. Free public resource.', 'https://www.apprenticeship.gov/')
          ),

          h('div', { style: { padding: 16, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderLeft: '3px solid #f59e0b', marginBottom: 12 } },
            h('h3', { style: { margin: '0 0 10px', color: '#fcd34d', fontSize: 15 } }, '⚖️ Honest limits'),
            h('ul', { style: { margin: 0, padding: '0 0 0 20px', color: '#fde68a', fontSize: 13, lineHeight: 1.75 } },
              h('li', null, 'A Holland code is a starting point, not a destiny. Many people thrive in careers outside their top three types; many switch careers in their 20s, 30s, and beyond.'),
              h('li', null, 'Interests are one input. Other huge factors: access to education, family financial situation, the local job market, family expectations, identity-based discrimination, energy and health. Career outcomes are shaped by structures, not just interests.'),
              h('li', null, 'The RIASEC framework was developed in mid-20th-century US labor market. Some categories (Conventional in particular) have shifted with technology; some careers do not map cleanly onto any single type.'),
              h('li', null, 'A 36-item screener (this tool) is briefer than the validated 60-item O*NET Profiler and briefer still than longer instruments like the Strong Interest Inventory. Use it for orientation, not for high-stakes decisions.'),
              h('li', null, 'For students with disabilities, the framework should be paired with accommodations and supports planning, not used to narrow options. A "Realistic" student who uses a wheelchair can still be in skilled-trades or outdoor work; a "Social" autistic student can still be a great teacher. Match the work environment to the person, including accommodations.'),
              h('li', null, 'Interest inventories can be subtly biased by what students have been exposed to. A student who has never seen a Black female astronaut may not endorse "Investigative" items the same way as one who has. Cultural exposure matters.'),
              h('li', null, 'Career exploration that turns into pressure ("you have to pick something NOW") is the wrong use. Pace this work; college, gap years, working a few entry-level jobs, and switching are all valid paths.')
            )
          ),

          h('div', { style: { padding: 12, borderRadius: 10, background: 'rgba(129,140,248,0.10)', border: '1px solid rgba(129,140,248,0.3)', borderLeft: '3px solid #818cf8', fontSize: 12.5, color: '#e0e7ff', lineHeight: 1.6 } },
            h('strong', null, '📝 Notes for educators: '),
            'Career Compass works well as a Crew-time or advisory activity over 1-2 sessions: students take the screener individually, then pair-share their Holland code and one career they want to learn more about. Pair with the official O*NET Interest Profiler for students who want depth. For high school, connect to your CTE counselor and dual-enrollment options. For middle school, the goal is exposure, not commitment.'
          ),

          softPointer()
        );
      }

      function sourceCard(authorYear, title, blurb, url) {
        return h('div', { style: { padding: 10, borderRadius: 8, background: '#1e293b', border: '1px solid #334155', marginBottom: 8 } },
          h('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 700, marginBottom: 2 } }, authorYear),
          url
            ? h('a', { href: url, target: '_blank', rel: 'noopener noreferrer',
                style: { fontSize: 13, color: '#e0e7ff', fontWeight: 700, textDecoration: 'underline', display: 'block', marginBottom: 4 } }, title + ' ↗')
            : h('div', { style: { fontSize: 13, color: '#e0e7ff', fontWeight: 700, marginBottom: 4 } }, title),
          h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.55 } }, blurb)
        );
      }

      var body;
      if (view === 'screener') body = renderScreener();
      else if (view === 'results') body = renderResults();
      else if (view === 'careers') body = renderCareers();
      else if (view === 'clusters') body = renderClusters();
      else if (view === 'nextsteps') body = renderNextSteps();
      else if (view === 'print') body = renderPrintView();
      else if (view === 'about') body = renderAbout();
      else body = renderHome();

      return h('div', { style: { maxWidth: 880, margin: '0 auto', padding: 16 }, role: 'region', 'aria-label': 'Career Compass' },
        header(),
        navTabs(),
        body
      );
    }
  });

})();
}
