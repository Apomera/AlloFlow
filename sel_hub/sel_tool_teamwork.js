// ═══════════════════════════════════════════════════════════════
// sel_tool_teamwork.js — Teamwork Builder Plugin (v1.0)
// Team role discovery, collaborative challenges, teamwork
// conflict scenarios, and AI team coach.
// Registered tool ID: "teamwork"
// Category: relationship-skills
// Grade-adaptive: uses ctx.gradeBand for vocabulary & depth
// ═══════════════════════════════════════════════════════════════

window.SelHub = window.SelHub || {
  _registry: {}, _order: [],
  registerTool: function(id, config) { config.id = id; config.ready = config.ready !== false; this._registry[id] = config; if (this._order.indexOf(id) === -1) this._order.push(id); },
  isRegistered: function(id) { return !!this._registry[id]; },
  renderTool: function(id, ctx) { var tool = this._registry[id]; if (!tool || !tool.render) return null; return tool.render(ctx); }
};

(function() {
  'use strict';

  // ══════════════════════════════════════════════════════════════
  // ── Sound Effects Engine (Web Audio API) ──
  // ══════════════════════════════════════════════════════════════
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {}
    }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = type || 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function sfxClick() { playTone(880, 0.04, 'sine', 0.05); }
  function sfxCorrect() { playTone(523, 0.1, 'sine', 0.08); setTimeout(function() { playTone(659, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 160); }
  function sfxWrong() { playTone(330, 0.15, 'sawtooth', 0.06); setTimeout(function() { playTone(262, 0.2, 'sawtooth', 0.05); }, 100); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxReveal() { playTone(392, 0.1, 'sine', 0.06); setTimeout(function() { playTone(494, 0.1, 'sine', 0.06); }, 80); setTimeout(function() { playTone(588, 0.15, 'sine', 0.08); }, 160); }
  function sfxTeam() { playTone(330, 0.1, 'sine', 0.06); setTimeout(function() { playTone(440, 0.1, 'sine', 0.07); }, 80); setTimeout(function() { playTone(554, 0.12, 'sine', 0.08); }, 160); setTimeout(function() { playTone(660, 0.18, 'sine', 0.09); }, 260); }

  // ══════════════════════════════════════════════════════════════
  // ── Team Roles Data (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var TEAM_ROLES = {
    elementary: [
      { id: 'leader', name: 'Leader', emoji: '\uD83D\uDC51', desc: 'Helps the group stay on track and makes sure everyone gets a turn.', soundsLike: '"Let\'s hear from everyone before we decide."' },
      { id: 'helper', name: 'Helper', emoji: '\uD83E\uDD1D', desc: 'Notices when someone needs support and jumps in to assist.', soundsLike: '"Need a hand with that? I can help!"' },
      { id: 'encourager', name: 'Encourager', emoji: '\uD83C\uDF1F', desc: 'Cheers people on and notices good ideas, even quiet ones.', soundsLike: '"That was a great idea! Keep going!"' },
      { id: 'ideaPerson', name: 'Idea Person', emoji: '\uD83D\uDCA1', desc: 'Comes up with creative ideas and new ways to solve problems.', soundsLike: '"What if we tried it THIS way instead?"' },
      { id: 'organizer', name: 'Organizer', emoji: '\uD83D\uDCCB', desc: 'Keeps supplies ready, tracks what needs to happen next.', soundsLike: '"Okay, first we need to do this, then that."' },
      { id: 'peacemaker', name: 'Peacemaker', emoji: '\uD83D\uDD4A\uFE0F', desc: 'Helps solve disagreements and makes sure nobody feels left out.', soundsLike: '"I think you both have good points. Let\'s find a way to combine them."' }
    ],
    middle: [
      { id: 'facilitator', name: 'Facilitator', emoji: '\uD83C\uDFAF', desc: 'Guides discussion, ensures balanced participation, and keeps the group focused on goals.', soundsLike: '"We have 15 minutes left. Let\'s make sure we cover everyone\'s input."' },
      { id: 'noteTaker', name: 'Note-Taker', emoji: '\uD83D\uDCDD', desc: 'Documents ideas, decisions, and action items so nothing gets lost.', soundsLike: '"Let me write that down so we remember it for next time."' },
      { id: 'timekeeper', name: 'Timekeeper', emoji: '\u23F0', desc: 'Monitors time and helps the group pace themselves to meet deadlines.', soundsLike: '"We\'re halfway through. We should move to the next section."' },
      { id: 'devilsAdvocate', name: 'Devil\'s Advocate', emoji: '\uD83E\uDD14', desc: 'Asks tough questions and challenges assumptions to make ideas stronger.', soundsLike: '"That\'s a good plan, but what if it doesn\'t work? What\'s our backup?"' },
      { id: 'mediator', name: 'Mediator', emoji: '\u2696\uFE0F', desc: 'Finds common ground when opinions clash and helps the group reach consensus.', soundsLike: '"I hear both sides. What if we tried a compromise?"' },
      { id: 'researcher', name: 'Researcher', emoji: '\uD83D\uDD0D', desc: 'Finds facts, gathers information, and brings evidence to support decisions.', soundsLike: '"I looked it up and here\'s what the data says..."' },
      { id: 'presenter', name: 'Presenter', emoji: '\uD83C\uDFA4', desc: 'Communicates the group\'s work clearly and confidently to others.', soundsLike: '"Our group decided to... and here\'s why it matters."' }
    ],
    high: [
      { id: 'projectManager', name: 'Project Manager', emoji: '\uD83D\uDCCA', desc: 'Coordinates tasks, sets milestones, delegates responsibility, and ensures accountability across the team.', soundsLike: '"Let\'s break this into phases. Who owns each deliverable?"' },
      { id: 'creativeDirector', name: 'Creative Director', emoji: '\uD83C\uDFA8', desc: 'Drives the vision and ensures the final product is cohesive, original, and compelling.', soundsLike: '"The concept is strong, but the execution needs more polish. Let\'s elevate this."' },
      { id: 'analyst', name: 'Analyst', emoji: '\uD83D\uDCCA', desc: 'Evaluates options using data, identifies risks, and provides evidence-based recommendations.', soundsLike: '"Based on the research, option B has a higher success rate. Here\'s the breakdown."' },
      { id: 'communicator', name: 'Communicator', emoji: '\uD83D\uDDE3\uFE0F', desc: 'Manages internal and external communication, ensuring clarity and alignment across stakeholders.', soundsLike: '"Let me draft the update to make sure everyone\'s on the same page."' },
      { id: 'qualityChecker', name: 'Quality Checker', emoji: '\u2705', desc: 'Reviews work for accuracy, consistency, and completeness before submission.', soundsLike: '"Before we submit, let me double-check the requirements against our work."' },
      { id: 'innovator', name: 'Innovator', emoji: '\uD83D\uDE80', desc: 'Pushes boundaries, proposes unconventional solutions, and keeps the team from settling for safe answers.', soundsLike: '"Everyone\'s doing it that way. What if we approached it from a completely different angle?"' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Collaborative Challenges Data (grade-adaptive) ──
  // ══════════════════════════════════════════════════════════════
  var CHALLENGES = {
    elementary: [
      { id: 'ch1', title: 'Build the Tallest Tower', icon: '\uD83C\uDFD7\uFE0F', desc: 'Your team has 20 craft sticks, tape, and one sheet of paper. Plan how to build the tallest tower possible without it falling over.',
        prompts: ['Who should be in charge of holding the base?', 'What happens if someone\'s idea doesn\'t work? How do you respond?', 'Did everyone get to contribute? How do you know?'],
        skills: ['planning', 'communication', 'encouragement'] },
      { id: 'ch2', title: 'Lost at Sea', icon: '\uD83C\uDF0A', desc: 'Your boat sank! You can only save 5 items from a list of 10. Work together to rank what\'s most important for survival.',
        prompts: ['How did you decide what was most important?', 'Did anyone disagree? How did you handle it?', 'Would you change your list if you could do it again?'],
        skills: ['prioritizing', 'compromise', 'listening'] },
      { id: 'ch3', title: 'Design a Playground', icon: '\uD83C\uDFB2', desc: 'Your school is building a new playground. Design one that is fun for ALL students, including those with disabilities.',
        prompts: ['How did you make sure everyone\'s ideas were included?', 'What did you include for students who use wheelchairs?', 'How did you compromise when people wanted different things?'],
        skills: ['inclusion', 'compromise', 'creativity'] }
    ],
    middle: [
      { id: 'ch4', title: 'Stranded on an Island', icon: '\uD83C\uDFDD\uFE0F', desc: 'Your group is stranded with limited resources: 3 tarps, rope, 2 water bottles, a knife, and matches. Plan your first 48 hours. Assign roles and justify every decision.',
        prompts: ['How did you decide who does what?', 'What happens if two people disagree about priorities?', 'Which teamwork skills were most important here?'],
        skills: ['delegation', 'resource-allocation', 'decision-making'] },
      { id: 'ch5', title: 'Plan a School Event', icon: '\uD83C\uDF89', desc: 'Plan a school-wide event with a $200 budget. You need entertainment, food, decorations, and a way to include ALL students.',
        prompts: ['How did you divide responsibilities?', 'What trade-offs did you make with the budget?', 'How did you handle it when someone wanted to spend more on their part?'],
        skills: ['budgeting', 'delegation', 'negotiation'] },
      { id: 'ch6', title: 'Debate Prep', icon: '\uD83D\uDDE3\uFE0F', desc: 'Prepare for a debate where HALF your team argues FOR and half argues AGAINST the same topic: "Social media does more harm than good." You must collaborate even while disagreeing.',
        prompts: ['How did you research the opposing view respectfully?', 'What did you learn from the side you didn\'t agree with?', 'How is debating different from arguing?'],
        skills: ['perspective-taking', 'research', 'respectful-disagreement'] }
    ],
    high: [
      { id: 'ch7', title: 'Startup Pitch', icon: '\uD83D\uDCBC', desc: 'Your team has 30 minutes to develop a startup concept that solves a real community problem. You need a name, mission statement, target audience, revenue model, and a 2-minute pitch. Every team member must present part of the pitch.',
        prompts: ['How did you leverage each person\'s strengths?', 'What was the hardest part of collaborating under time pressure?', 'How did you handle creative differences about the vision?'],
        skills: ['innovation', 'time-management', 'presentation'] },
      { id: 'ch8', title: 'Crisis Management', icon: '\u26A0\uFE0F', desc: 'Your team runs a fictional company. Breaking news: a product defect has been discovered. You have 20 minutes to draft a public response, assign media roles, plan a recall, and prepare for customer backlash. Decisions must be unanimous.',
        prompts: ['How did you make decisions under pressure?', 'What happened when someone disagreed with the group?', 'How did requiring unanimous decisions change the process?'],
        skills: ['pressure-management', 'consensus-building', 'accountability'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Teamwork Conflict Scenarios (5 scenarios, 3 choices each) ──
  // ══════════════════════════════════════════════════════════════
  var SCENARIOS = [
    { id: 'sc1', title: 'The Dominator', icon: '\uD83D\uDDE3\uFE0F',
      setup: 'One person in your group keeps talking over everyone else. They make all the decisions without asking and get frustrated when anyone disagrees.',
      choices: [
        { label: 'Let them lead \u2014 it\'s easier than fighting.', rating: 1, feedback: 'Avoiding conflict lets one person control the whole group. Other voices and ideas are lost, and resentment builds silently.' },
        { label: 'Confront them: "You\'re being bossy and nobody likes it."', rating: 2, feedback: 'Honest but harsh. Calling someone "bossy" puts them on the defensive. The real message gets lost in the attack.' },
        { label: 'Say: "I notice you have strong ideas. Can we go around so everyone shares before we decide?"', rating: 3, feedback: 'You acknowledged their contribution while creating space for others. Structure (going around) is more effective than blame.' }
      ] },
    { id: 'sc2', title: 'The Silent Member', icon: '\uD83E\uDD10',
      setup: 'One group member hasn\'t contributed anything. They sit quietly, look at their phone, and shrug when asked for input. The deadline is tomorrow.',
      choices: [
        { label: 'Ignore them and divide their work among the rest of you.', rating: 1, feedback: 'The project gets done, but the silent member never learns to contribute. You also enabled the pattern to continue next time.' },
        { label: 'Tell the teacher they aren\'t doing anything.', rating: 2, feedback: 'Escalating to authority before talking to the person skips an important step. They may have a reason you don\'t know about.' },
        { label: 'Ask them privately: "Hey, I noticed you\'ve been quiet. Is something going on? What part would you feel comfortable working on?"', rating: 3, feedback: 'Checking in privately shows respect. They might be confused, anxious, or dealing with something. Offering a specific task lowers the barrier to participation.' }
      ] },
    { id: 'sc3', title: 'The Direction Disagreement', icon: '\u2194\uFE0F',
      setup: 'Your group is split: half want to do the project as a poster, half want to do a video. Both ideas are good but you can only pick one. Tension is rising.',
      choices: [
        { label: 'The majority should just win. It\'s faster.', rating: 2, feedback: 'Democratic, but the losing side may feel steamrolled. Fast decisions aren\'t always fair ones.' },
        { label: 'Argue until the other side gives up.', rating: 1, feedback: 'Wearing people down isn\'t persuasion. It\'s exhaustion. The "winners" didn\'t actually convince anyone.' },
        { label: 'List the pros and cons of each option together, then see if there\'s a creative combination or a fair way to choose.', rating: 3, feedback: 'Structured comparison removes emotion from the decision. Sometimes a hybrid (video with poster elements) is even better than either original idea.' }
      ] },
    { id: 'sc4', title: 'The Credit Thief', icon: '\uD83C\uDFC6',
      setup: 'During the presentation, one group member takes credit for ideas that weren\'t theirs. They say "I came up with..." for things the whole group created together.',
      choices: [
        { label: 'Call them out in front of the class: "That was MY idea!"', rating: 1, feedback: 'Public confrontation embarrasses everyone and derails the presentation. The audience remembers the drama, not the project.' },
        { label: 'Say nothing and just feel angry about it.', rating: 2, feedback: 'Silence protects the moment but builds resentment. The behavior will repeat because there were no consequences.' },
        { label: 'After the presentation, talk to them: "When you said \'I came up with...\' it felt unfair. Can we agree to say \'we\' next time?"', rating: 3, feedback: 'Addressing it privately and proposing a solution is mature and effective. Using "I felt" language keeps it about impact, not blame.' }
      ] },
    { id: 'sc5', title: 'The Deadline Crunch', icon: '\u23F0',
      setup: 'Your group project is due tomorrow and one person\'s section isn\'t done. They say they "forgot" but you suspect they just didn\'t prioritize it. The rest of you worked hard.',
      choices: [
        { label: 'Do their section for them so the grade doesn\'t suffer.', rating: 2, feedback: 'You saved the grade but enabled the behavior. They learn that someone will always bail them out.' },
        { label: 'Refuse to help and let the project be incomplete.', rating: 1, feedback: 'Principled but costly. Everyone\'s grade suffers for one person\'s mistake. Sometimes the team needs to absorb and address it later.' },
        { label: 'Help them finish it tonight, but then have an honest conversation: "We all need to be accountable. Next time, let\'s set check-in dates."', rating: 3, feedback: 'You protected the team\'s work AND addressed the root cause. Proposing check-ins creates structure that prevents repeat problems.' }
      ] }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'team_player',       icon: '\uD83E\uDD1D', name: 'Team Player',          desc: 'Complete your first teamwork activity' },
    { id: 'role_finder',       icon: '\uD83D\uDC51', name: 'Role Finder',          desc: 'Discover your best team role' },
    { id: 'challenge_accepted', icon: '\uD83C\uDFD7\uFE0F', name: 'Challenge Accepted', desc: 'Complete a collaborative challenge' },
    { id: 'collab_expert',     icon: '\uD83C\uDF1F', name: 'Collaboration Expert', desc: 'Complete 3 collaborative challenges' },
    { id: 'all_roles',         icon: '\uD83C\uDFAD', name: 'All Roles Explored',   desc: 'Explore every role in your grade band' },
    { id: 'scenario_pro',      icon: '\uD83C\uDFAF', name: 'Scenario Pro',         desc: 'Answer all 5 teamwork scenarios' },
    { id: 'ai_coach',          icon: '\u2728',        name: 'AI Team Coach',        desc: 'Get advice from the AI team coach' },
    { id: 'reflective_leader', icon: '\uD83D\uDCDD', name: 'Reflective Leader',    desc: 'Write a team role reflection' },
    { id: 'full_explorer',     icon: '\uD83D\uDE80', name: 'Full Explorer',        desc: 'Visit all 4 tabs' },
    { id: 'teamwork_champion', icon: '\uD83C\uDFC6', name: 'Teamwork Champion',    desc: 'Earn 7 or more badges' },
    { id: 'perfect_scenarios', icon: '\u2B50',        name: 'Perfect Insight',      desc: 'Get 3 stars on all scenarios' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Teamwork Streak',      desc: 'Practice 3 days in a row' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('teamwork', {
    icon: '\uD83E\uDD1C\uD83E\uDD1B',
    label: 'Teamwork Builder',
    desc: 'Discover your team role, tackle collaborative challenges, navigate teamwork conflicts, and grow as a collaborator.',
    color: 'lime',
    category: 'relationship-skills',
    render: function(ctx) {
      return (function() {
        var React = ctx.React;
        var h = React.createElement;
        var addToast = ctx.addToast;
        var awardXP = ctx.awardXP;
        var celebrate = ctx.celebrate;
        var callGemini = ctx.callGemini;
        var band = ctx.gradeBand || 'elementary';

        // ── Tool-scoped state ──
        var d = (ctx.toolData && ctx.toolData.teamwork) || {};
        var upd = function(key, val) {
          if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('teamwork', key); }
          else { if (ctx.update) ctx.update('teamwork', key, val); }
        };

        // Navigation
        var activeTab     = d.activeTab || 'roles';
        var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

        // Roles state
        var selectedRoles = d.selectedRoles || [];
        var roleReflection = d.roleReflection || '';
        var roleReflectionSaved = d.roleReflectionSaved || false;
        var expandedRole  = d.expandedRole || null;

        // Challenges state
        var challengeIdx  = d.challengeIdx || 0;
        var challengeDiscussion = d.challengeDiscussion || '';
        var challengeRatings = d.challengeRatings || {};
        var challengesCompleted = d.challengesCompleted || 0;

        // Scenarios state
        var scenarioIdx   = d.scenarioIdx || 0;
        var scenarioAnswers = d.scenarioAnswers || {};
        var scenarioRevealed = d.scenarioRevealed || {};

        // AI Coach state
        var coachPrompt   = d.coachPrompt || '';
        var coachResponse = d.coachResponse || null;
        var coachLoading  = d.coachLoading || false;

        // Practice log & badges
        var practiceLog    = d.practiceLog || [];
        var earnedBadges   = d.earnedBadges || {};
        var showBadgePopup = d.showBadgePopup || null;
        var showBadgesPanel = d.showBadgesPanel || false;
        var visitedTabs    = d.visitedTabs || {};

        // ── Helpers ──
        var ACCENT = '#84cc16';
        var ACCENT_DIM = '#84cc1622';
        var ACCENT_MED = '#84cc1644';

        function tryAwardBadge(badgeId) {
          if (earnedBadges[badgeId]) return;
          var newBadges = Object.assign({}, earnedBadges);
          newBadges[badgeId] = Date.now();
          upd('earnedBadges', newBadges);
          var badge = BADGES.find(function(b) { return b.id === badgeId; });
          if (badge) {
            upd('showBadgePopup', badgeId);
            if (soundEnabled) sfxBadge();
            addToast(badge.icon + ' Badge earned: ' + badge.name + '!', 'success');
            awardXP(25);
            setTimeout(function() { upd('showBadgePopup', null); }, 3000);
          }
          // Check for champion
          var totalBadges = Object.keys(newBadges).length;
          if (totalBadges >= 7 && !newBadges.teamwork_champion) {
            setTimeout(function() { tryAwardBadge('teamwork_champion'); }, 3200);
          }
        }

        function logPractice(type, id) {
          var entry = { type: type, id: id, timestamp: Date.now() };
          var newLog = practiceLog.concat([entry]);
          upd('practiceLog', newLog);
          var daySet = {};
          newLog.forEach(function(e) { daySet[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
          var today = new Date();
          var streak = 0;
          for (var si = 0; si < 30; si++) {
            var chk = new Date(today);
            chk.setDate(chk.getDate() - si);
            if (daySet[chk.toISOString().slice(0,10)]) { streak++; } else if (si > 0) { break; }
          }
          if (streak >= 3) tryAwardBadge('streak_3');
        }

        function trackTab(tabId) {
          var newVisited = Object.assign({}, visitedTabs);
          newVisited[tabId] = true;
          upd('visitedTabs', newVisited);
          if (newVisited.roles && newVisited.challenges && newVisited.scenarios && newVisited.progress) {
            tryAwardBadge('full_explorer');
          }
        }

        function renderStars(rating) {
          var stars = [];
          for (var i = 1; i <= 3; i++) {
            stars.push(h('span', { key: i, style: { color: i <= rating ? '#facc15' : '#334155', fontSize: 18 } }, '\u2B50'));
          }
          return h('span', null, stars);
        }

        // ══════════════════════════════════════════════════════════
        // ── Tab Bar ──
        // ══════════════════════════════════════════════════════════
        var tabs = [
          { id: 'roles',      label: '\uD83D\uDC51 Roles' },
          { id: 'challenges', label: '\uD83C\uDFD7\uFE0F Challenges' },
          { id: 'scenarios',  label: '\uD83C\uDFAD Scenarios' },
          { id: 'progress',   label: '\uD83D\uDCCA Progress' }
        ];

        var tabBar = h('div', {
          style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
        },
          tabs.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', {
              key: t.id,
              onClick: function() { upd('activeTab', t.id); trackTab(t.id); if (soundEnabled) sfxClick(); },
              'aria-selected': isActive,
              role: 'tab',
              style: {
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8',
                transition: 'all 0.15s'
              }
            }, t.label);
          }),
          // Sound toggle
          h('button', {
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b' },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
          // Badge counter
          h('button', {
            onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
            style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#64748b', position: 'relative' }
          },
            '\uD83C\uDFC5',
            Object.keys(earnedBadges).length > 0 && h('span', {
              style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: '#0f172a', borderRadius: '50%', width: 14, height: 14, fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, Object.keys(earnedBadges).length)
          )
        );

        // ── Badge Popup ──
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', {
              style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)', animation: 'fadeIn 0.3s' }
            },
              h('div', { style: { background: '#1e293b', borderRadius: 20, padding: 32, textAlign: 'center', border: '2px solid ' + ACCENT, maxWidth: 300, boxShadow: '0 0 40px ' + ACCENT + '44' } },
                h('div', { style: { fontSize: 48, marginBottom: 12 } }, popBadge.icon),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
                h('div', { style: { fontSize: 13, color: '#94a3b8' } }, popBadge.desc)
              )
            );
          }
        }

        // ── Badge Panel (when toggled) ──
        if (showBadgesPanel) {
          var panelContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFC5 Badges'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', {
                  key: b.id,
                  style: { padding: 14, borderRadius: 12, background: earned ? '#1e293b' : '#0f172a', border: '1px solid ' + (earned ? ACCENT + '66' : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.5 }
                },
                  h('div', { style: { fontSize: 28 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: earned ? '#f1f5f9' : '#64748b', marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 10, color: '#64748b', marginTop: 2 } }, b.desc)
                );
              })
            ),
            h('button', {
              onClick: function() { upd('showBadgesPanel', false); },
              style: { display: 'block', margin: '16px auto 0', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', cursor: 'pointer', fontSize: 12 }
            }, 'Close')
          );

          return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
            tabBar, badgePopup, h('div', { style: { flex: 1, overflow: 'auto' } }, panelContent)
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Roles ──
        // ══════════════════════════════════════════════════════════
        var rolesContent = null;
        if (activeTab === 'roles') {
          var roles = TEAM_ROLES[band] || TEAM_ROLES.elementary;

          rolesContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDC51 Team Role Discovery'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Every team needs different people! Tap on a role to learn about it, then pick the ones that sound like YOU.' :
              band === 'middle' ? 'Strong teams need diverse skills. Explore each role and identify which ones match your strengths.' :
              'Effective collaboration requires self-awareness about your natural tendencies. Discover your role profile.'
            ),

            // Role cards
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 } },
              roles.map(function(role) {
                var isExpanded = expandedRole === role.id;
                var isSelected = selectedRoles.indexOf(role.id) !== -1;
                return h('div', {
                  key: role.id,
                  style: { padding: 14, borderRadius: 12, background: isSelected ? '#1e293b' : '#0f172a', border: '1px solid ' + (isSelected ? ACCENT + '88' : '#334155'), cursor: 'pointer', transition: 'all 0.2s' },
                  onClick: function() {
                    upd('expandedRole', isExpanded ? null : role.id);
                    if (soundEnabled) sfxClick();
                    logPractice('role_explore', role.id);
                    // Check if all roles explored
                    var allExplored = true;
                    roles.forEach(function(r) {
                      var found = false;
                      practiceLog.concat([{ type: 'role_explore', id: role.id }]).forEach(function(e) {
                        if (e.type === 'role_explore' && e.id === r.id) found = true;
                      });
                      if (!found) allExplored = false;
                    });
                    if (allExplored) tryAwardBadge('all_roles');
                  }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { style: { fontSize: 24 } }, role.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 14, fontWeight: 600, color: '#f1f5f9' } }, role.name),
                      isExpanded && h('div', { style: { marginTop: 8 } },
                        h('p', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, marginBottom: 8 } }, role.desc),
                        h('div', { style: { fontSize: 12, color: ACCENT, fontStyle: 'italic', padding: '8px 12px', background: ACCENT_DIM, borderRadius: 8 } },
                          '\uD83D\uDCAC Sounds like: ' + role.soundsLike
                        )
                      )
                    ),
                    h('button', {
                      onClick: function(e) {
                        e.stopPropagation();
                        var newSel = selectedRoles.slice();
                        var idx = newSel.indexOf(role.id);
                        if (idx !== -1) { newSel.splice(idx, 1); } else { newSel.push(role.id); }
                        upd('selectedRoles', newSel);
                        if (soundEnabled) sfxTeam();
                        tryAwardBadge('team_player');
                      },
                      style: { padding: '6px 14px', borderRadius: 8, border: '1px solid ' + (isSelected ? ACCENT : '#475569'), background: isSelected ? ACCENT_DIM : 'transparent', color: isSelected ? ACCENT : '#94a3b8', fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
                    }, isSelected ? '\u2713 Selected' : 'That\'s Me')
                  )
                );
              })
            ),

            // Selected summary
            selectedRoles.length > 0 && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\uD83C\uDFAF Your Team Role Profile'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
                selectedRoles.map(function(rid) {
                  var r = roles.find(function(x) { return x.id === rid; });
                  return r ? h('span', { key: rid, style: { padding: '4px 10px', borderRadius: 20, background: ACCENT_DIM, color: ACCENT, fontSize: 12, fontWeight: 600 } }, r.emoji + ' ' + r.name) : null;
                })
              ),
              // Reflection
              h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8 } }, '\uD83D\uDCDD My Best Team Role \u2014 Reflection:'),
              h('textarea', {
                value: roleReflection,
                onChange: function(e) { upd('roleReflection', e.target.value); upd('roleReflectionSaved', false); },
                placeholder: band === 'elementary' ? 'Why did you pick these roles? When do you act like this in a team?' : band === 'middle' ? 'Describe a time you played one of these roles. How did it affect the team?' : 'Analyze how your role preferences shape your collaboration style. What blind spots might you have?',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }
              }),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                h('button', {
                  onClick: function() {
                    if (!roleReflection.trim()) { addToast('Write a reflection first!', 'info'); return; }
                    upd('roleReflectionSaved', true);
                    logPractice('reflection', 'role');
                    tryAwardBadge('role_finder');
                    tryAwardBadge('reflective_leader');
                    if (soundEnabled) sfxCorrect();
                    awardXP(15);
                    addToast('Reflection saved!', 'success');
                    ctx.announceToSR && ctx.announceToSR('Reflection saved');
                  },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: roleReflectionSaved ? '#334155' : ACCENT, color: roleReflectionSaved ? '#94a3b8' : '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, roleReflectionSaved ? '\u2713 Saved' : 'Save Reflection'),
                // AI Coach button
                h('button', {
                  onClick: function() {
                    if (!roleReflection.trim()) { addToast('Write your reflection first!', 'info'); return; }
                    if (!callGemini) { addToast('AI not available.', 'error'); return; }
                    upd('coachLoading', true);
                    upd('coachResponse', null);
                    var selNames = selectedRoles.map(function(rid) {
                      var r = roles.find(function(x) { return x.id === rid; });
                      return r ? r.name : rid;
                    }).join(', ');
                    var prompt = 'You are a supportive teamwork coach for ' + band + ' school students.\n\n' +
                      'The student identified their team roles as: ' + selNames + '\n' +
                      'Their reflection: "' + roleReflection + '"\n\n' +
                      'Respond warmly with:\n1. Affirm their self-awareness about these roles\n2. Share one strength of their role combination\n3. Suggest one growth area or complementary skill to develop\n4. End with an encouraging team-building tip\n\n' +
                      'Use ' + (band === 'elementary' ? 'simple, encouraging language for ages 5-10.' : band === 'middle' ? 'relatable, motivating language for ages 11-14.' : 'mature, coaching-style language for ages 15-18.') +
                      '\nKeep it under 150 words.';
                    callGemini(prompt).then(function(result) {
                      var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                      upd('coachResponse', resp);
                      upd('coachLoading', false);
                      tryAwardBadge('ai_coach');
                    }).catch(function(err) {
                      upd('coachLoading', false);
                      addToast('Error: ' + err.message, 'error');
                    });
                  },
                  disabled: coachLoading,
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: coachLoading ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 12, cursor: coachLoading ? 'default' : 'pointer' }
                }, coachLoading ? 'Thinking...' : '\u2728 AI Coach')
              ),
              // AI response
              coachResponse && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #6366f144' } },
                h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\u2728 Team Coach'),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, coachResponse)
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Challenges ──
        // ══════════════════════════════════════════════════════════
        var challengesContent = null;
        if (activeTab === 'challenges') {
          var chList = CHALLENGES[band] || CHALLENGES.elementary;
          var curCh = chList[challengeIdx % chList.length];
          var chRatings = challengeRatings[curCh.id] || {};

          challengesContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFD7\uFE0F Collaborative Challenges'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              'Challenge ' + ((challengeIdx % chList.length) + 1) + ' of ' + chList.length
            ),

            // Challenge card
            h('div', { style: { padding: 20, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                h('span', { style: { fontSize: 28 } }, curCh.icon),
                h('h4', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 } }, curCh.title)
              ),
              h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 14 } }, curCh.desc),

              // Skills involved
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
                curCh.skills.map(function(s) {
                  return h('span', { key: s, style: { padding: '3px 10px', borderRadius: 20, background: '#334155', color: '#94a3b8', fontSize: 11 } }, s);
                })
              ),

              // Discussion prompts
              h('div', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 8 } }, '\uD83D\uDCAC Discussion Prompts:'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
                curCh.prompts.map(function(p, i) {
                  return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } },
                    (i + 1) + '. ' + p
                  );
                })
              ),

              // Skill self-rating
              h('div', { style: { fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\uD83C\uDFAF Rate Your Team Skills:'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
                curCh.skills.map(function(s) {
                  var r = chRatings[s] || 0;
                  return h('div', { key: s, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#0f172a' } },
                    h('span', { style: { fontSize: 12, color: '#cbd5e1', flex: 1, textTransform: 'capitalize' } }, s.replace(/-/g, ' ')),
                    [1, 2, 3, 4, 5].map(function(star) {
                      return h('button', {
                        key: star,
                        onClick: function() {
                          var newRatings = Object.assign({}, challengeRatings);
                          var curRats = Object.assign({}, newRatings[curCh.id] || {});
                          curRats[s] = star;
                          newRatings[curCh.id] = curRats;
                          upd('challengeRatings', newRatings);
                          if (soundEnabled) sfxClick();
                        },
                        style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, color: star <= r ? '#facc15' : '#334155' }
                      }, '\u2B50');
                    })
                  );
                })
              ),

              // Discussion notes
              h('textarea', {
                value: challengeDiscussion,
                onChange: function(e) { upd('challengeDiscussion', e.target.value); },
                placeholder: 'Write your team\'s discussion notes here...',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 12 }
              }),

              // Navigation
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                challengeIdx > 0 && h('button', {
                  onClick: function() { upd({ challengeIdx: challengeIdx - 1, challengeDiscussion: '' }); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, '\u2190 Previous'),
                h('button', {
                  onClick: function() {
                    var newCompleted = challengesCompleted + 1;
                    upd('challengesCompleted', newCompleted);
                    logPractice('challenge', curCh.id);
                    awardXP(20);
                    tryAwardBadge('challenge_accepted');
                    if (newCompleted >= 3) tryAwardBadge('collab_expert');
                    if (soundEnabled) sfxCorrect();
                    addToast('Challenge completed! +20 XP', 'success');
                    upd({ challengeIdx: challengeIdx + 1, challengeDiscussion: '' });
                    ctx.announceToSR && ctx.announceToSR('Challenge completed');
                  },
                  style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, 'Complete & Next \u2192')
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Scenarios ──
        // ══════════════════════════════════════════════════════════
        var scenariosContent = null;
        if (activeTab === 'scenarios') {
          var curSc = SCENARIOS[scenarioIdx % SCENARIOS.length];
          var answered = scenarioAnswers[curSc.id] != null;
          var revealed = !!scenarioRevealed[curSc.id];
          var answeredCount = Object.keys(scenarioAnswers).length;

          scenariosContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFAD Teamwork Scenarios'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              'Scenario ' + ((scenarioIdx % SCENARIOS.length) + 1) + ' of ' + SCENARIOS.length + ' \u00B7 ' + answeredCount + ' answered'
            ),

            // Scenario card
            h('div', { style: { padding: 20, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                h('span', { style: { fontSize: 28 } }, curSc.icon),
                h('h4', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 } }, curSc.title)
              ),
              h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 16 } }, curSc.setup),

              // Choices
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                curSc.choices.map(function(ch, ci) {
                  var isChosen = scenarioAnswers[curSc.id] === ci;
                  var showFeedback = revealed && isChosen;
                  return h('div', { key: ci },
                    h('button', {
                      onClick: function() {
                        if (answered) return;
                        var newAnswers = Object.assign({}, scenarioAnswers);
                        newAnswers[curSc.id] = ci;
                        var newRevealed = Object.assign({}, scenarioRevealed);
                        newRevealed[curSc.id] = true;
                        upd({ scenarioAnswers: newAnswers, scenarioRevealed: newRevealed });
                        logPractice('scenario', curSc.id);
                        awardXP(10);
                        if (ch.rating === 3) {
                          if (soundEnabled) sfxCorrect();
                          addToast('\u2B50\u2B50\u2B50 Great choice!', 'success');
                        } else if (ch.rating === 2) {
                          if (soundEnabled) sfxReveal();
                          addToast('\u2B50\u2B50 Good thinking!', 'info');
                        } else {
                          if (soundEnabled) sfxWrong();
                          addToast('\u2B50 There\'s a better approach.', 'info');
                        }
                        // Check all answered
                        var totalAnswered = Object.keys(newAnswers).length;
                        if (totalAnswered >= SCENARIOS.length) tryAwardBadge('scenario_pro');
                        // Check all perfect
                        if (totalAnswered >= SCENARIOS.length) {
                          var allPerfect = true;
                          SCENARIOS.forEach(function(s) {
                            var a = newAnswers[s.id];
                            if (a == null || s.choices[a].rating !== 3) allPerfect = false;
                          });
                          if (allPerfect) tryAwardBadge('perfect_scenarios');
                        }
                        ctx.announceToSR && ctx.announceToSR('Choice selected. ' + ch.rating + ' out of 3 stars.');
                      },
                      disabled: answered,
                      style: {
                        width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid ' + (isChosen ? (ch.rating === 3 ? '#22c55e' : ch.rating === 2 ? '#f59e0b' : '#ef4444') : '#334155'),
                        background: isChosen ? (ch.rating === 3 ? '#22c55e11' : ch.rating === 2 ? '#f59e0b11' : '#ef444411') : '#0f172a',
                        color: '#e2e8f0', fontSize: 13, textAlign: 'left', cursor: answered ? 'default' : 'pointer', lineHeight: 1.5
                      }
                    },
                      h('span', null, ch.label),
                      isChosen && h('span', { style: { marginLeft: 8 } }, renderStars(ch.rating))
                    ),
                    showFeedback && h('div', { style: { padding: '10px 14px', borderRadius: '0 0 10px 10px', background: '#0f172a', borderLeft: '3px solid ' + (ch.rating === 3 ? '#22c55e' : ch.rating === 2 ? '#f59e0b' : '#ef4444'), marginTop: -2, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 } },
                      ch.feedback
                    )
                  );
                })
              ),

              // Show all feedback after answering
              revealed && h('div', { style: { marginTop: 12, padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
                h('div', { style: { fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 } }, 'All response ratings:'),
                curSc.choices.map(function(ch, ci) {
                  var isChosen = scenarioAnswers[curSc.id] === ci;
                  return h('div', { key: ci, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11, color: isChosen ? '#f1f5f9' : '#64748b' } },
                    renderStars(ch.rating),
                    h('span', { style: { marginLeft: 4 } }, ch.label.substring(0, 50) + (ch.label.length > 50 ? '...' : '')),
                    isChosen && h('span', { style: { color: ACCENT, marginLeft: 4, fontWeight: 700 } }, '\u2190 your pick')
                  );
                })
              ),

              // Navigation
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 } },
                scenarioIdx > 0 && h('button', {
                  onClick: function() { upd('scenarioIdx', scenarioIdx - 1); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, '\u2190 Previous'),
                scenarioIdx < SCENARIOS.length - 1 && h('button', {
                  onClick: function() { upd('scenarioIdx', scenarioIdx + 1); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, 'Next \u2192')
              )
            ),

            // AI Team Coach section
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #6366f133' } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\u2728 AI Team Coach'),
              h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10 } }, 'Ask the AI coach about any teamwork challenge you\'re facing.'),
              h('textarea', {
                value: coachPrompt,
                onChange: function(e) { upd('coachPrompt', e.target.value); },
                placeholder: band === 'elementary' ? 'Describe a teamwork problem you\'re having...' : band === 'middle' ? 'What teamwork challenge are you facing? Be specific...' : 'Describe the collaboration issue. Include context about your role and the team dynamics...',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', outline: 'none', boxSizing: 'border-box', marginBottom: 8 }
              }),
              h('button', {
                onClick: function() {
                  if (!coachPrompt.trim()) { addToast('Describe your teamwork challenge first!', 'info'); return; }
                  if (!callGemini) { addToast('AI not available.', 'error'); return; }
                  upd('coachLoading', true);
                  upd('coachResponse', null);
                  var prompt = 'You are a warm, knowledgeable teamwork coach for ' + band + ' school students.\n\n' +
                    'STUDENT\'S TEAMWORK CHALLENGE: "' + coachPrompt + '"\n\n' +
                    'Respond with:\n1. Validate their experience\n2. Name the specific teamwork skill involved (communication, delegation, conflict resolution, etc.)\n3. Give 2-3 concrete strategies they can try immediately\n4. End with encouragement\n\n' +
                    'Use ' + (band === 'elementary' ? 'simple, friendly language for ages 5-10.' : band === 'middle' ? 'supportive, practical language for ages 11-14.' : 'professional coaching language for ages 15-18.') +
                    '\nKeep it under 180 words.';
                  callGemini(prompt).then(function(result) {
                    var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                    upd('coachResponse', resp);
                    upd('coachLoading', false);
                    logPractice('ai_coach', 'scenario');
                    tryAwardBadge('ai_coach');
                  }).catch(function(err) {
                    upd('coachLoading', false);
                    addToast('Error: ' + err.message, 'error');
                  });
                },
                disabled: coachLoading,
                style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: coachLoading ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 12, cursor: coachLoading ? 'default' : 'pointer' }
              }, coachLoading ? 'Thinking...' : '\u2728 Ask Coach'),
              coachResponse && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #6366f144' } },
                h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\u2728 Coach Says'),
                h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, coachResponse)
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Progress ──
        // ══════════════════════════════════════════════════════════
        var progressContent = null;
        if (activeTab === 'progress') {
          var roles2 = TEAM_ROLES[band] || TEAM_ROLES.elementary;
          var chList2 = CHALLENGES[band] || CHALLENGES.elementary;
          var answeredScenarios = Object.keys(scenarioAnswers).length;
          var perfectScenarios = 0;
          SCENARIOS.forEach(function(s) {
            var a = scenarioAnswers[s.id];
            if (a != null && s.choices[a].rating === 3) perfectScenarios++;
          });
          var totalStars = 0;
          SCENARIOS.forEach(function(s) {
            var a = scenarioAnswers[s.id];
            if (a != null) totalStars += s.choices[a].rating;
          });

          var stats = [
            { icon: '\uD83D\uDC51', label: 'Roles Selected', value: selectedRoles.length + '/' + roles2.length, color: ACCENT },
            { icon: '\uD83C\uDFD7\uFE0F', label: 'Challenges Done', value: String(challengesCompleted), color: '#f59e0b' },
            { icon: '\uD83C\uDFAD', label: 'Scenarios Answered', value: answeredScenarios + '/' + SCENARIOS.length, color: '#8b5cf6' },
            { icon: '\u2B50', label: 'Stars Earned', value: totalStars + '/' + (SCENARIOS.length * 3), color: '#facc15' },
            { icon: '\uD83C\uDFC5', label: 'Badges', value: Object.keys(earnedBadges).length + '/' + BADGES.length, color: '#ec4899' },
            { icon: '\uD83D\uDD25', label: 'Activities', value: String(practiceLog.length), color: '#ef4444' }
          ];

          progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Teamwork Progress'),

            // Stats grid
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 } },
              stats.map(function(s) {
                return h('div', {
                  key: s.label,
                  style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + s.color + '44', textAlign: 'center' }
                },
                  h('div', { style: { fontSize: 24 } }, s.icon),
                  h('div', { style: { fontSize: 22, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                  h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.label)
                );
              })
            ),

            // Role profile
            selectedRoles.length > 0 && h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\uD83D\uDC51 Your Role Profile'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                selectedRoles.map(function(rid) {
                  var r = roles2.find(function(x) { return x.id === rid; });
                  return r ? h('span', { key: rid, style: { padding: '4px 10px', borderRadius: 20, background: ACCENT_DIM, color: ACCENT, fontSize: 12, fontWeight: 600 } }, r.emoji + ' ' + r.name) : null;
                })
              ),
              roleReflectionSaved && roleReflection && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: '#0f172a', fontSize: 12, color: '#94a3b8', fontStyle: 'italic', lineHeight: 1.6 } },
                '\uD83D\uDCDD "' + roleReflection + '"'
              )
            ),

            // Badges earned
            h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\uD83C\uDFC5 Badges Earned'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
                BADGES.map(function(b) {
                  var earned = !!earnedBadges[b.id];
                  return h('div', {
                    key: b.id,
                    style: { padding: 10, borderRadius: 10, background: earned ? '#1e293b' : '#0f172a', border: '1px solid ' + (earned ? ACCENT + '44' : '#1e293b'), textAlign: 'center', opacity: earned ? 1 : 0.4 }
                  },
                    h('div', { style: { fontSize: 22 } }, earned ? b.icon : '\uD83D\uDD12'),
                    h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#f1f5f9' : '#475569', marginTop: 2 } }, b.name)
                  );
                })
              )
            ),

            // Recent practice log
            practiceLog.length > 0 && h('div', null,
              h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Practice'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                practiceLog.slice(-8).reverse().map(function(entry, i) {
                  var icons = { role_explore: '\uD83D\uDC51', reflection: '\uD83D\uDCDD', challenge: '\uD83C\uDFD7\uFE0F', scenario: '\uD83C\uDFAD', ai_coach: '\u2728' };
                  var labels = { role_explore: 'Role Explored', reflection: 'Reflection', challenge: 'Challenge', scenario: 'Scenario', ai_coach: 'AI Coach' };
                  return h('div', {
                    key: i,
                    style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }
                  },
                    h('span', null, icons[entry.type] || '\uD83D\uDCDD'),
                    h('span', { style: { color: '#e2e8f0', fontWeight: 500 } }, labels[entry.type] || entry.type),
                    h('span', { style: { marginLeft: 'auto', color: '#64748b', fontSize: 11 } }, new Date(entry.timestamp).toLocaleString())
                  );
                })
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── Final Render ──
        // ══════════════════════════════════════════════════════════
        var content = rolesContent || challengesContent || scenariosContent || progressContent;

        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
          tabBar,
          badgePopup,
          h('div', { style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });

  console.log('[SelHub] sel_tool_teamwork.js loaded');
})();
