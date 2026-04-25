// ═══════════════════════════════════════════════════════════════
// sel_tool_teamwork.js — Teamwork Builder Plugin (v1.1)
// Team role discovery, collaborative challenges, teamwork
// conflict scenarios, skills quiz, team contracts, and AI coach.
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

  // ── Accessibility scaffolding (WCAG 2.3.3 Animation from Interactions) ──
  // Reduced-motion CSS guards animated counters, progress indicators, and transitions.
  (function() {
    if (document.getElementById('allo-teamwork-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-teamwork-a11y-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { .selh-teamwork *, .selh-teamwork *::before, .selh-teamwork *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

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
        skills: ['inclusion', 'compromise', 'creativity'] },
      { id: 'ch_e4', title: 'Design a Class Pet Habitat', icon: '\uD83D\uDC22', desc: 'Your class voted to get a pet turtle! But you only have one small table and $30 for supplies. Work together to design a habitat that keeps the turtle happy and healthy. Everyone must agree on the plan.',
        prompts: ['What does the turtle need to be healthy?', 'How did your team compromise when you disagreed about the design?', 'Did everyone get to share their ideas before the group decided?'],
        skills: ['compromise', 'research', 'planning'] },
      { id: 'ch_e5', title: 'Plan a Class Party with $50', icon: '\uD83C\uDF89', desc: 'Your class has exactly $50 to plan a party. You need snacks, decorations, and one activity. But there are students with food allergies and different interests. Plan a party that works for EVERYONE.',
        prompts: ['How did you make sure the snacks are safe for everyone?', 'What happened when someone wanted to spend all the money on one thing?', 'How did you make the final budget decisions together?'],
        skills: ['budgeting', 'inclusion', 'communication'] },
      { id: 'ch_e6', title: 'Create a Class Song', icon: '\uD83C\uDFB5', desc: 'Write a short class song (4-8 lines) that represents your class. Everyone must contribute at least one word or idea. It has to be something the whole class would want to sing!',
        prompts: ['How did you include shy classmates in the songwriting?', 'What did you do when two people had very different ideas for the song?', 'How does your song represent EVERYONE in the class?'],
        skills: ['creative-collaboration', 'inclusion', 'encouragement'] }
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
        skills: ['perspective-taking', 'research', 'respectful-disagreement'] },
      { id: 'ch_m4', title: 'Mock Trial', icon: '\u2696\uFE0F', desc: 'A student is accused of copying homework. Your group must put on a mock trial. Assign roles: judge, defense attorney, prosecutor, witnesses, and jury. Everyone must stay in character and present evidence fairly.',
        prompts: ['How did you decide who plays each role?', 'Was it hard to argue for a side you disagreed with?', 'What did this teach you about seeing both sides of a conflict?'],
        skills: ['role-assignment', 'perspective-taking', 'fairness'] },
      { id: 'ch_m5', title: 'Design a School Improvement', icon: '\uD83C\uDFEB', desc: 'Your principal wants ONE improvement to the school. Your team must research a real problem (cafeteria lines, bathroom access, hallway crowding), propose a solution with a budget, and present it. Think like systems designers.',
        prompts: ['How did you gather information about the real problem?', 'What trade-offs did you discuss when designing the solution?', 'How did you handle it when someone\'s idea was rejected by the group?'],
        skills: ['systems-thinking', 'research', 'presentation'] },
      { id: 'ch_m6', title: 'Escape Room Planning', icon: '\uD83D\uDD10', desc: 'Design an escape room for another group of students. You need 3 puzzles, a storyline, clues, and a time limit. Each team member must design at least one element. The final product must fit together seamlessly.',
        prompts: ['How did you make sure each person\'s puzzle connected to the story?', 'What creative disagreements came up and how did you resolve them?', 'How did you test whether your escape room was too easy or too hard?'],
        skills: ['creative-problem-solving', 'coordination', 'quality-checking'] }
    ],
    high: [
      { id: 'ch7', title: 'Startup Pitch', icon: '\uD83D\uDCBC', desc: 'Your team has 30 minutes to develop a startup concept that solves a real community problem. You need a name, mission statement, target audience, revenue model, and a 2-minute pitch. Every team member must present part of the pitch.',
        prompts: ['How did you leverage each person\'s strengths?', 'What was the hardest part of collaborating under time pressure?', 'How did you handle creative differences about the vision?'],
        skills: ['innovation', 'time-management', 'presentation'] },
      { id: 'ch8', title: 'Crisis Management', icon: '\u26A0\uFE0F', desc: 'Your team runs a fictional company. Breaking news: a product defect has been discovered. You have 20 minutes to draft a public response, assign media roles, plan a recall, and prepare for customer backlash. Decisions must be unanimous.',
        prompts: ['How did you make decisions under pressure?', 'What happened when someone disagreed with the group?', 'How did requiring unanimous decisions change the process?'],
        skills: ['pressure-management', 'consensus-building', 'accountability'] },
      { id: 'ch_h3', title: 'Model UN Scenario', icon: '\uD83C\uDF0D', desc: 'Each team member represents a different country in a negotiation about climate change policy. You must draft a resolution that ALL countries sign. Each "country" has different economic interests, resources, and priorities. Find common ground.',
        prompts: ['How did you balance your country\'s interests with the global good?', 'What negotiation strategies were most effective?', 'When did you have to sacrifice something your country wanted for the team agreement?'],
        skills: ['negotiation', 'diplomacy', 'perspective-taking'] },
      { id: 'ch_h4', title: 'Social Enterprise Pitch', icon: '\uD83D\uDCA1', desc: 'Create a social enterprise that addresses a real problem in your community (food waste, loneliness, literacy, etc.). Develop a business model, impact metrics, a 3-minute pitch, and a 1-page plan. Every team member owns a functional area.',
        prompts: ['How did you divide ownership of different functional areas?', 'What happened when the business model conflicted with the social mission?', 'How did you give and receive feedback on each other\'s sections?'],
        skills: ['real-world-collaboration', 'strategic-thinking', 'feedback'] },
      { id: 'ch_h5', title: 'Community Needs Assessment', icon: '\uD83D\uDCCB', desc: 'Conduct a mini needs assessment for your school or neighborhood. Design a 5-question survey, identify 3 stakeholder groups, collect data (real or simulated), analyze findings, and present actionable recommendations. Every step requires team coordination.',
        prompts: ['How did you ensure your survey questions were unbiased?', 'What did you learn about the difference between what people say they need and what data shows?', 'How did you resolve disagreements about the final recommendations?'],
        skills: ['research', 'data-analysis', 'action-planning'] }
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
      ] },
    { id: 'sc6', title: 'Remote Communication Breakdown', icon: '\uD83D\uDCBB',
      setup: 'Your team is working on a project over a shared document and group chat. One member misunderstands the instructions and does the wrong section. Another member gets angry and sends a harsh message. Now two people aren\'t responding to the chat at all.',
      choices: [
        { label: 'Send a message blaming the person who messed up: "You should have read the instructions."', rating: 1, feedback: 'Blame increases defensiveness and shuts down communication. The real problem is the system, not one person. Written messages also feel harsher than spoken words.' },
        { label: 'Wait for everyone to cool down and hope it resolves itself.', rating: 2, feedback: 'Giving space can help, but silence in virtual teams often escalates misunderstanding. Without a clear next step, people disengage further.' },
        { label: 'Send a calm group message: "It seems like there was a miscommunication. Let\'s hop on a quick video call to clarify roles and get back on track. No blame \u2014 these things happen with remote work."', rating: 3, feedback: 'Switching from text to a richer communication channel (video/voice) reduces misunderstanding. Naming the problem without blame invites everyone back to the table.' }
      ] },
    { id: 'sc7', title: 'Cultural Misunderstanding', icon: '\uD83C\uDF0D',
      setup: 'During a group project, one team member from a different cultural background stays quiet during brainstorming and only shares ideas when directly asked. Another team member says, "You need to speak up more \u2014 you\'re not pulling your weight." The quiet member looks uncomfortable.',
      choices: [
        { label: 'Agree with the outspoken member \u2014 everyone should participate equally.', rating: 1, feedback: 'Participation looks different across cultures. In some cultures, speaking without being invited is considered rude. Assuming one style is "right" excludes people rather than including them.' },
        { label: 'Tell the outspoken member to stop being rude.', rating: 2, feedback: 'Defending the quiet member is important, but calling someone rude can escalate the conflict. The outspoken member may not realize their bias.' },
        { label: 'Say: "People have different communication styles. Let\'s try a round-robin where everyone gets a turn, and also use a shared doc for ideas so people can contribute in writing too."', rating: 3, feedback: 'You created multiple pathways for participation without singling anyone out. Great teams design systems that work for different communication styles, not just the loudest voice.' }
      ] },
    { id: 'sc8', title: 'When the Leader Isn\'t Leading', icon: '\uD83D\uDC51',
      setup: 'Your group chose a team leader, but they\'re not doing their job. They don\'t set deadlines, they cancel meetings, and when you ask what to do next, they say "I don\'t know, figure it out." The project is falling apart and everyone is frustrated.',
      choices: [
        { label: 'Go to the teacher and ask for a new leader.', rating: 2, feedback: 'The teacher may help, but jumping to authority before talking to the leader misses a chance to practice direct communication. It can also feel like going behind someone\'s back.' },
        { label: 'Just do the leader\'s job yourself without saying anything.', rating: 1, feedback: 'Silently taking over avoids conflict but creates resentment. The "leader" never learns, and you burn out doing two jobs. It also confuses the rest of the team.' },
        { label: 'Talk to the leader privately: "Hey, I noticed we\'re behind. I think the team needs more structure. Can we set up a plan together, or would you prefer to split the leadership tasks?"', rating: 3, feedback: 'Private, respectful, and solution-focused. You gave them a chance to step up or share the responsibility. Offering to help rather than criticize makes it easier for them to accept.' }
      ] },
    { id: 'sc9', title: 'The Perfectionist Bottleneck', icon: '\u270D\uFE0F',
      setup: 'One team member insists on redoing everyone else\'s work because it isn\'t "good enough." They rewrite paragraphs, redesign slides, and redo calculations. The rest of the team feels like their contributions don\'t matter.',
      choices: [
        { label: 'Let them do everything since their work is better anyway.', rating: 1, feedback: 'Quality matters, but a team where one person does everything isn\'t a team. Others stop trying, the perfectionist burns out, and no one learns.' },
        { label: 'Tell them angrily: "Stop changing our work! It\'s a group project, not YOUR project."', rating: 2, feedback: 'The frustration is valid, but anger makes people defensive. The perfectionist likely thinks they\'re helping, not hurting.' },
        { label: 'Say: "I appreciate that you want our work to be great. But when changes happen without discussion, it feels like our input doesn\'t count. Can we agree on quality standards together and review as a team?"', rating: 3, feedback: 'You validated their motivation while naming the impact. Proposing shared standards gives the whole team ownership of quality, not just one person.' }
      ] },
    { id: 'sc10', title: 'Unequal Workload', icon: '\u2696\uFE0F',
      setup: 'Your group of four divided the project into "equal" parts, but one section turned out to be way harder and longer than the others. The person with that section is overwhelmed and the deadline is in three days. The other three members say "that\'s your part."',
      choices: [
        { label: 'Tell the overwhelmed person to just do their best \u2014 fair is fair.', rating: 1, feedback: 'The division seemed fair but wasn\'t. Sticking rigidly to an unfair plan in the name of "fairness" sacrifices both the project quality and a teammate\'s wellbeing.' },
        { label: 'Complain to the teacher that the project wasn\'t designed well.', rating: 2, feedback: 'The project design may have been uneven, but real teams encounter unexpected workload imbalances all the time. Learning to adjust is the skill.' },
        { label: 'Say: "It looks like the sections weren\'t as equal as we thought. Let\'s redistribute some of the work so we all finish together. We\'re a team."', rating: 3, feedback: 'You recognized the systemic problem instead of blaming anyone. Redistributing shows that the team succeeds or fails together. This is exactly how high-functioning teams work.' }
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
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Teamwork Streak',      desc: 'Practice 3 days in a row' },
    { id: 'skills_assessor',   icon: '\uD83D\uDCCA', name: 'Skills Assessor',      desc: 'Complete the Team Skills Quiz' },
    { id: 'contract_creator',  icon: '\uD83D\uDCDC', name: 'Contract Creator',     desc: 'Build a team contract' },
    { id: 'challenge_champ',   icon: '\uD83E\uDD47', name: 'Challenge Champion',   desc: 'Complete 5 collaborative challenges' },
    { id: 'all_challenges',    icon: '\uD83C\uDF1F', name: 'All Challenges Done',  desc: 'Complete every challenge in your grade band' },
    { id: 'teamwork_guru',     icon: '\uD83E\uDDD8', name: 'Teamwork Guru',        desc: 'Earn 12 or more badges' },
    { id: 'comm_style',        icon: '\uD83D\uDDE3\uFE0F', name: 'Communication Style', desc: 'Discover your communication style' },
    { id: 'virtual_team_pro',  icon: '\uD83D\uDCBB', name: 'Virtual Team Pro',    desc: 'Complete all virtual team scenarios' },
    { id: 'conflict_converter', icon: '\u267B\uFE0F', name: 'Conflict Converter',  desc: 'Convert 3 conflicts into collaboration' },
    { id: 'retro_runner',      icon: '\uD83D\uDD04', name: 'Retrospective Runner', desc: 'Complete a team retrospective' },
    { id: 'master_collaborator', icon: '\uD83C\uDF1F', name: 'Master Collaborator', desc: 'Earn 18 or more badges' },
    { id: 'virtual_scenario_1', icon: '\uD83D\uDCF1', name: 'Remote Ready',        desc: 'Complete your first virtual team scenario' },
    { id: 'retro_exporter',    icon: '\uD83D\uDCE4', name: 'Retro Exporter',      desc: 'Export a retrospective as text' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Team Skills Quiz Data ──
  // ══════════════════════════════════════════════════════════════
  var QUIZ_SKILLS = [
    { id: 'communication', name: 'Communication', icon: '\uD83D\uDCAC', desc: 'Sharing ideas clearly and listening to understand others.' },
    { id: 'listening', name: 'Active Listening', icon: '\uD83D\uDC42', desc: 'Paying full attention when others speak, without interrupting.' },
    { id: 'flexibility', name: 'Flexibility', icon: '\uD83E\uDD38', desc: 'Being willing to change plans or try new approaches.' },
    { id: 'reliability', name: 'Reliability', icon: '\u2705', desc: 'Following through on commitments and doing your part on time.' },
    { id: 'problemSolving', name: 'Problem-Solving', icon: '\uD83E\uDDE9', desc: 'Finding creative solutions when the team faces obstacles.' },
    { id: 'encouragement', name: 'Encouragement', icon: '\uD83C\uDF1F', desc: 'Supporting teammates, celebrating wins, and lifting spirits.' },
    { id: 'organization', name: 'Organization', icon: '\uD83D\uDCCB', desc: 'Keeping track of tasks, deadlines, and materials.' },
    { id: 'conflictRes', name: 'Conflict Resolution', icon: '\uD83D\uDD4A\uFE0F', desc: 'Handling disagreements calmly and finding fair solutions.' }
  ];

  var IDEAL_PROFILE = {
    communication: 5, listening: 5, flexibility: 4, reliability: 5,
    problemSolving: 4, encouragement: 4, organization: 4, conflictRes: 4
  };

  // ══════════════════════════════════════════════════════════════
  // ── Communication Styles Data ──
  // ══════════════════════════════════════════════════════════════
  var COMM_STYLES = {
    director: { name: 'Director', icon: '\uD83C\uDFAF', color: '#ef4444',
      desc: 'Task-focused and decisive. You like to get things done efficiently and lead by example.',
      strengths: ['Makes quick decisions', 'Keeps the team on track', 'Results-oriented', 'Confident under pressure'],
      blindSpots: ['May overlook others\u2019 feelings', 'Can seem impatient or controlling', 'Might skip important discussion for speed'],
      workWith: 'Give Directors clear goals and deadlines. Let them take the lead on logistics. Don\u2019t take their directness personally \u2014 they mean well.' },
    collaborator: { name: 'Collaborator', icon: '\uD83E\uDD1D', color: '#22c55e',
      desc: 'Consensus-seeking and inclusive. You want everyone\u2019s voice heard before making decisions.',
      strengths: ['Builds team unity', 'Values every perspective', 'Creates psychological safety', 'Strong relationship builder'],
      blindSpots: ['Decisions may take too long', 'Can struggle with conflict or tough calls', 'Might avoid necessary confrontation'],
      workWith: 'Give Collaborators time for discussion. Acknowledge their efforts to include everyone. Help them set decision deadlines so progress keeps moving.' },
    analyzer: { name: 'Analyzer', icon: '\uD83D\uDD0D', color: '#3b82f6',
      desc: 'Data-driven and careful. You like to research thoroughly before committing to a plan.',
      strengths: ['Thorough and accurate', 'Catches mistakes early', 'Evidence-based thinking', 'Reduces risk'],
      blindSpots: ['Can cause analysis paralysis', 'May seem overly cautious', 'Might frustrate action-oriented teammates'],
      workWith: 'Give Analyzers data and time to review. Ask for their input on quality checks. Help them recognize when \u201Cgood enough\u201D is sufficient.' },
    supporter: { name: 'Supporter', icon: '\uD83D\uDC9A', color: '#f59e0b',
      desc: 'Harmony-focused and encouraging. You keep morale high and make sure nobody feels left out.',
      strengths: ['Excellent listener', 'Boosts team morale', 'Mediates disagreements', 'Creates a positive environment'],
      blindSpots: ['May avoid sharing own opinions', 'Can take on too much to keep peace', 'Might suppress important disagreements'],
      workWith: 'Ask Supporters directly for their opinion \u2014 they may not volunteer it. Appreciate their emotional labor. Help them set boundaries.' }
  };

  var COMM_STYLE_QUESTIONS = [
    { q: 'In a group meeting, I usually...', options: [
      { text: 'Jump in with a plan and assign tasks', style: 'director' },
      { text: 'Ask what everyone thinks before deciding', style: 'collaborator' },
      { text: 'Listen carefully and ask clarifying questions', style: 'analyzer' },
      { text: 'Encourage quieter members to share their ideas', style: 'supporter' }
    ]},
    { q: 'When the team disagrees, I tend to...', options: [
      { text: 'Pick the best option and push forward', style: 'director' },
      { text: 'Find a compromise everyone can live with', style: 'collaborator' },
      { text: 'List pros and cons of each option objectively', style: 'analyzer' },
      { text: 'Make sure nobody feels hurt or dismissed', style: 'supporter' }
    ]},
    { q: 'If a deadline is approaching and we\u2019re behind, I...', options: [
      { text: 'Take charge and redistribute the work', style: 'director' },
      { text: 'Call a team meeting to figure it out together', style: 'collaborator' },
      { text: 'Analyze what went wrong and adjust the timeline', style: 'analyzer' },
      { text: 'Check in on teammates who seem stressed', style: 'supporter' }
    ]},
    { q: 'My ideal role in a group project is...', options: [
      { text: 'Project manager who keeps things moving', style: 'director' },
      { text: 'The person who connects everyone\u2019s ideas', style: 'collaborator' },
      { text: 'Researcher who makes sure facts are right', style: 'analyzer' },
      { text: 'Cheerleader who keeps the team motivated', style: 'supporter' }
    ]},
    { q: 'When someone shares a new idea, I first think...', options: [
      { text: 'How do we implement this quickly?', style: 'director' },
      { text: 'Does everyone agree with this direction?', style: 'collaborator' },
      { text: 'What evidence supports this approach?', style: 'analyzer' },
      { text: 'How will this affect team dynamics?', style: 'supporter' }
    ]},
    { q: 'I get frustrated when teammates...', options: [
      { text: 'Waste time on unnecessary discussion', style: 'director' },
      { text: 'Make decisions without consulting the group', style: 'collaborator' },
      { text: 'Rush without checking their work', style: 'analyzer' },
      { text: 'Are harsh or dismissive to each other', style: 'supporter' }
    ]},
    { q: 'After a project, I\u2019m most proud when...', options: [
      { text: 'We finished on time and hit our goals', style: 'director' },
      { text: 'Everyone felt included and valued', style: 'collaborator' },
      { text: 'Our work was thorough and accurate', style: 'analyzer' },
      { text: 'The team grew closer through the process', style: 'supporter' }
    ]},
    { q: 'In a group chat, my messages tend to be...', options: [
      { text: 'Short and action-oriented: "Let\u2019s do X by Friday"', style: 'director' },
      { text: 'Open-ended: "What does everyone think?"', style: 'collaborator' },
      { text: 'Detailed with links and sources attached', style: 'analyzer' },
      { text: 'Warm and encouraging: "Great work everyone!"', style: 'supporter' }
    ]},
    { q: 'When I see a problem in the project, I...', options: [
      { text: 'Fix it immediately and tell the team after', style: 'director' },
      { text: 'Bring it to the group to solve together', style: 'collaborator' },
      { text: 'Research the issue before raising it', style: 'analyzer' },
      { text: 'Gently bring it up so nobody feels blamed', style: 'supporter' }
    ]},
    { q: 'The best team leaders are people who...', options: [
      { text: 'Set clear goals and hold people accountable', style: 'director' },
      { text: 'Build consensus and make everyone feel heard', style: 'collaborator' },
      { text: 'Make informed decisions based on evidence', style: 'analyzer' },
      { text: 'Create a safe, supportive team environment', style: 'supporter' }
    ]}
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Virtual Team Simulator Data ──
  // ══════════════════════════════════════════════════════════════
  var VIRTUAL_TEAM_SCENARIOS = [
    { id: 'vt1', title: 'Miscommunication Over Text', icon: '\uD83D\uDCAC',
      setup: 'You sent a message in the group chat saying "That section needs work." A teammate replies with "Fine." and goes silent. You can tell they\u2019re upset, but you meant it constructively. Tone got lost in text.',
      choices: [
        { text: 'Send another text: "I didn\u2019t mean it like that!"', rating: 2, feedback: 'Explaining over text can help, but text has the same tone problem. The cycle might repeat.' },
        { text: 'Hop on a quick voice or video call to clarify what you meant and hear their perspective.', rating: 3, feedback: 'Switching to richer communication (voice/video) restores tone, empathy, and nuance. This is the remote work gold standard for resolving text misunderstandings.' },
        { text: 'Ignore it \u2014 they\u2019ll get over it.', rating: 1, feedback: 'Silence breeds resentment in remote teams. Small misunderstandings grow when left unaddressed.' }
      ],
      tip: 'Remote Work Tip: When you sense tension in text, upgrade the channel. A 2-minute call prevents days of awkwardness. Use emojis and explicit tone markers ("just a suggestion!") to soften written feedback.' },
    { id: 'vt2', title: 'Time Zone Coordination', icon: '\u23F0',
      setup: 'Your team is spread across three time zones. One member keeps scheduling meetings during another member\u2019s dinner time. The affected person has stopped attending and just says "send me the notes."',
      choices: [
        { text: 'Tell the person skipping meetings they need to attend no matter what.', rating: 1, feedback: 'Demanding attendance without accommodating their constraints is disrespectful. Time zone equity matters.' },
        { text: 'Create a rotating meeting schedule so no one is always inconvenienced, and use async updates for non-urgent decisions.', rating: 3, feedback: 'Rotating sacrifices shows respect. Async communication (shared docs, recorded updates) ensures everyone can contribute without being live at the same time.' },
        { text: 'Just do everything over email so nobody needs to meet.', rating: 2, feedback: 'Async-only works for some things, but teams lose connection without ANY live interaction. Balance is key.' }
      ],
      tip: 'Remote Work Tip: Use a "time zone overlap" tool to find fair meeting slots. Record meetings for those who can\u2019t attend. Make important decisions in shared documents, not just in meetings.' },
    { id: 'vt3', title: 'Camera On/Off Debate', icon: '\uD83D\uDCF7',
      setup: 'Half your team keeps cameras off during video calls. One teammate says "it\u2019s disrespectful not to show your face." Another says "I shouldn\u2019t have to show my room or my appearance to participate." The team is split.',
      choices: [
        { text: 'Make a rule: cameras on for all meetings, no exceptions.', rating: 1, feedback: 'Mandatory cameras can cause anxiety, exclude people with different living situations, and feel controlling. One size doesn\u2019t fit all.' },
        { text: 'Discuss it as a team: agree on "cameras on" for key meetings (presentations, brainstorms) and "cameras optional" for status updates. Respect personal boundaries.', rating: 3, feedback: 'Context-dependent norms respect both the need for connection and individual comfort. This is how strong remote teams operate.' },
        { text: 'Don\u2019t bring it up \u2014 it\u2019s too personal.', rating: 2, feedback: 'Avoiding the conversation lets resentment build. It\u2019s better to create norms together than let frustration simmer.' }
      ],
      tip: 'Remote Work Tip: Camera norms should be team agreements, not mandates. Consider "cameras on" for relationship-building and "cameras optional" for routine work. Never shame someone for their camera choice.' },
    { id: 'vt4', title: 'Talking Over Everyone', icon: '\uD83C\uDF99\uFE0F',
      setup: 'During video calls, one person dominates the conversation. They interrupt, talk for long stretches, and don\u2019t notice the "hand raise" reactions from others. Other team members have started muting themselves and disengaging.',
      choices: [
        { text: 'Privately message them during the call: "Hey, other people want to talk."', rating: 2, feedback: 'Private nudges can work, but a systemic solution is better than individual corrections every call.' },
        { text: 'Introduce structured turn-taking: a facilitator role that rotates each meeting, a hand-raise queue, and a timer for each speaker.', rating: 3, feedback: 'Structure equalizes participation automatically. The facilitator ensures everyone speaks, and the timer prevents monopolizing. This scales and doesn\u2019t single anyone out.' },
        { text: 'Let it go \u2014 some people are just more talkative.', rating: 1, feedback: 'Accepting domination normalizes it. Quiet team members\u2019 ideas are lost, and engagement drops.' }
      ],
      tip: 'Remote Work Tip: Use the chat for ideas during calls, implement a "stack" (speaking queue), and give the facilitator power to say "Let\u2019s hear from someone who hasn\u2019t spoken yet." Round-robin check-ins at the start help too.' },
    { id: 'vt5', title: 'Building Trust Remotely', icon: '\uD83E\uDD1D',
      setup: 'Your team has been working together for two weeks but you\u2019ve never met in person. Conversations are strictly about tasks. Nobody shares anything personal, and it feels like working with strangers. One member suggests "we should do a virtual social event" but others say "that\u2019s a waste of time."',
      choices: [
        { text: 'Skip the social stuff \u2014 the work is all that matters.', rating: 1, feedback: 'Teams without trust underperform. People who feel like strangers are less likely to ask for help, share ideas, or resolve conflicts.' },
        { text: 'Start meetings with a 5-minute icebreaker or personal check-in. Add an optional 30-minute virtual hangout once a week for non-work chat.', rating: 3, feedback: 'Small, consistent social moments build trust without pressuring introverts. Making it optional respects boundaries while creating opportunities to connect.' },
        { text: 'Just wait \u2014 trust takes time and will happen naturally.', rating: 2, feedback: 'Trust doesn\u2019t build automatically in remote settings like it does in person. Without intentional effort, remote teams can stay distant for months.' }
      ],
      tip: 'Remote Work Tip: Trust is built in small moments: celebrating wins, starting with "How is everyone really doing?", sharing music playlists, or playing a quick 5-minute game. Make connection intentional but never forced.' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Reflection Prompts (post-activity quick reflections) ──
  // ══════════════════════════════════════════════════════════════
  var REFLECTION_SKILLS_DROPDOWN = [
    'Communication', 'Active Listening', 'Flexibility', 'Reliability',
    'Problem-Solving', 'Encouragement', 'Organization', 'Conflict Resolution',
    'Perspective-Taking', 'Delegation', 'Negotiation'
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
        var announceToSR = ctx.announceToSR;
        var a11yClick = ctx.a11yClick;
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

        // Skills Quiz state
        var quizRatings    = d.quizRatings || {};
        var quizSubmitted  = d.quizSubmitted || false;

        // Team Contract state
        var contractAgreements = d.contractAgreements || ['', '', '', '', ''];
        var contractRoles     = d.contractRoles || ['', '', '', ''];
        var contractComms     = d.contractComms || '';
        var contractConsequence = d.contractConsequence || '';
        var contractSaved    = d.contractSaved || false;

        // Quick Reflection state (post-activity)
        var reflectionSkill   = d.reflectionSkill || '';
        var reflectionNote    = d.reflectionNote || '';
        var reflectionLog     = d.reflectionLog || [];

        // Communication Styles state
        var commStyleAnswers = d.commStyleAnswers || {};
        var commStyleDone    = d.commStyleDone || false;
        var commStyleResult  = d.commStyleResult || null;
        var commStyleCoachResp = d.commStyleCoachResp || null;
        var commStyleCoachLoad = d.commStyleCoachLoad || false;

        // Virtual Team Simulator state
        var vtScenarioIdx     = d.vtScenarioIdx || 0;
        var vtAnswers         = d.vtAnswers || {};
        var vtRevealed        = d.vtRevealed || {};

        // Conflict-to-Collaboration state
        var conflictInput     = d.conflictInput || '';
        var conflictResult    = d.conflictResult || null;
        var conflictLoading   = d.conflictLoading || false;
        var conflictCount     = d.conflictCount || 0;
        var conflictHistory   = d.conflictHistory || [];

        // Retrospective state
        var retroGreen        = d.retroGreen || [];
        var retroYellow       = d.retroYellow || [];
        var retroBlue         = d.retroBlue || [];
        var retroGreenInput   = d.retroGreenInput || '';
        var retroYellowInput  = d.retroYellowInput || '';
        var retroBlueInput    = d.retroBlueInput || '';
        var retroSaved        = d.retroSaved || false;

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
          if (totalBadges >= 12 && !newBadges.teamwork_guru) {
            setTimeout(function() { tryAwardBadge('teamwork_guru'); }, 3500);
          }
          if (totalBadges >= 18 && !newBadges.master_collaborator) {
            setTimeout(function() { tryAwardBadge('master_collaborator'); }, 3800);
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
          if (newVisited.roles && newVisited.challenges && newVisited.scenarios && newVisited.progress && newVisited.quiz && newVisited.contract && newVisited.commstyle && newVisited.virtualteam && newVisited.conflicttool && newVisited.retro) {
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

        // ── Quick Reflection Prompt (reusable) ──
        function renderQuickReflection(activityType) {
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),
            h('div', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 8 } }, '\uD83D\uDCDD Quick Reflection'),
            h('div', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 8 } }, 'What teamwork skill did you practice?'),
            h('select', {
              value: reflectionSkill,
              'aria-label': 'Teamwork skill practiced',
              onChange: function(e) { upd('reflectionSkill', e.target.value); },
              style: { width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12, marginBottom: 8 }
            },
              h('option', { value: '' }, '-- Select a skill --'),
              REFLECTION_SKILLS_DROPDOWN.map(function(sk) {
                return h('option', { key: sk, value: sk }, sk);
              })
            ),
            h('textarea', {
              value: reflectionNote,
              'aria-label': 'Teamwork reflection note',
              onChange: function(e) { upd('reflectionNote', e.target.value); },
              placeholder: 'Briefly describe how you used this skill...',
              rows: 2,
              style: { width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
            }),
            h('button', { 'aria-label': 'Save Reflection',
              onClick: function() {
                if (!reflectionSkill) { addToast('Select a skill first!', 'info'); return; }
                var entry = { skill: reflectionSkill, note: reflectionNote, activity: activityType, timestamp: Date.now() };
                var newLog = reflectionLog.concat([entry]);
                upd({ reflectionLog: newLog, reflectionSkill: '', reflectionNote: '' });
                logPractice('quick_reflection', activityType);
                awardXP(5);
                if (soundEnabled) sfxCorrect();
                addToast('Reflection saved! +5 XP', 'success');
              },
              style: { padding: '6px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 600, fontSize: 11, cursor: 'pointer' }
            }, 'Save Reflection')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── Tab Bar ──
        // ══════════════════════════════════════════════════════════
        var tabs = [
          { id: 'roles',       label: '\uD83D\uDC51 Roles' },
          { id: 'challenges',  label: '\uD83C\uDFD7\uFE0F Challenges' },
          { id: 'scenarios',   label: '\uD83C\uDFAD Scenarios' },
          { id: 'commstyle',   label: '\uD83D\uDDE3\uFE0F Comm Style' },
          { id: 'virtualteam', label: '\uD83D\uDCBB Virtual Team' },
          { id: 'conflicttool', label: '\u267B\uFE0F Conflict\u2192Collab' },
          { id: 'retro',       label: '\uD83D\uDD04 Retro' },
          { id: 'quiz',        label: '\uD83D\uDCCA Quiz' },
          { id: 'contract',    label: '\uD83D\uDCDC Contract' },
          { id: 'progress',    label: '\uD83D\uDCC8 Progress' }
        ];

        var tabBar = h('div', {           role: 'tablist', 'aria-label': 'Teamwork & Collaboration tabs',
          style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
        },
          tabs.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', { 'aria-label': t.label,
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
          h('button', { 'aria-label': 'Toggle panel',
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#94a3b8' },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
          // Badge counter
          h('button', { 'aria-label': 'Toggle panel',
            onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
            style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#94a3b8', position: 'relative' }
          },
            '\uD83C\uDFC5',
            Object.keys(earnedBadges).length > 0 && h('span', {
              style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: '#0f172a', borderRadius: '50%', width: 14, height: 14, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }
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
                return h('div', {                   key: b.id,
                  style: { padding: 14, borderRadius: 12, background: earned ? '#1e293b' : '#0f172a', border: '1px solid ' + (earned ? ACCENT + '66' : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.5 }
                },
                  h('div', { style: { fontSize: 28 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: earned ? '#f1f5f9' : '#94a3b8', marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, b.desc)
                );
              })
            ),
            h('button', { 'aria-label': 'Close',
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
                return h('div', {                   key: role.id,
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
                    h('button', { 'aria-label': 'Your Team Role Profile',
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
                'aria-label': 'Role reflection',
                onChange: function(e) { upd('roleReflection', e.target.value); upd('roleReflectionSaved', false); },
                placeholder: band === 'elementary' ? 'Why did you pick these roles? When do you act like this in a team?' : band === 'middle' ? 'Describe a time you played one of these roles. How did it affect the team?' : 'Analyze how your role preferences shape your collaboration style. What blind spots might you have?',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }
              }),
              h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                h('button', { 'aria-label': 'Toggle sound',
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
                h('button', { 'aria-label': 'AI Coach button',
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
            ),

            // Quick reflection for roles
            selectedRoles.length > 0 && renderQuickReflection('roles')
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
                      return h('button', { 'aria-label': 'Toggle sound',
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
                'aria-label': 'Challenge discussion notes',
                onChange: function(e) { upd('challengeDiscussion', e.target.value); },
                placeholder: 'Write your team\'s discussion notes here...',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }
              }),

              // Navigation
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                challengeIdx > 0 && h('button', { 'aria-label': 'Previous',
                  onClick: function() { upd({ challengeIdx: challengeIdx - 1, challengeDiscussion: '' }); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, '\u2190 Previous'),
                h('button', { 'aria-label': 'Complete & Next',
                  onClick: function() {
                    var newCompleted = challengesCompleted + 1;
                    upd('challengesCompleted', newCompleted);
                    logPractice('challenge', curCh.id);
                    awardXP(20);
                    tryAwardBadge('challenge_accepted');
                    if (newCompleted >= 3) tryAwardBadge('collab_expert');
                    if (newCompleted >= 5) tryAwardBadge('challenge_champ');
                    if (newCompleted >= chList.length) tryAwardBadge('all_challenges');
                    if (soundEnabled) sfxCorrect();
                    addToast('Challenge completed! +20 XP', 'success');
                    upd({ challengeIdx: challengeIdx + 1, challengeDiscussion: '' });
                    ctx.announceToSR && ctx.announceToSR('Challenge completed');
                  },
                  style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, 'Complete & Next \u2192')
              ),

              // Quick reflection after challenge
              renderQuickReflection('challenge')
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
                    h('button', { 'aria-label': 'Toggle sound',
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
                  return h('div', { key: ci, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11, color: isChosen ? '#f1f5f9' : '#94a3b8' } },
                    renderStars(ch.rating),
                    h('span', { style: { marginLeft: 4 } }, ch.label.substring(0, 50) + (ch.label.length > 50 ? '...' : '')),
                    isChosen && h('span', { style: { color: ACCENT, marginLeft: 4, fontWeight: 700 } }, '\u2190 your pick')
                  );
                })
              ),

              // Navigation
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 } },
                scenarioIdx > 0 && h('button', { 'aria-label': 'Previous',
                  onClick: function() { upd('scenarioIdx', scenarioIdx - 1); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, '\u2190 Previous'),
                scenarioIdx < SCENARIOS.length - 1 && h('button', { 'aria-label': 'Next',
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
                'aria-label': 'Describe your teamwork challenge',
                onChange: function(e) { upd('coachPrompt', e.target.value); },
                placeholder: band === 'elementary' ? 'Describe a teamwork problem you\'re having...' : band === 'middle' ? 'What teamwork challenge are you facing? Be specific...' : 'Describe the collaboration issue. Include context about your role and the team dynamics...',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
              }),
              h('button', { 'aria-label': coachLoading ? 'Thinking...' : '\u2728 Ask Coach',
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
            ),

            // Quick reflection after scenario
            renderQuickReflection('scenario')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Skills Quiz ──
        // ══════════════════════════════════════════════════════════
        var quizContent = null;
        if (activeTab === 'quiz') {
          var quizDone = Object.keys(quizRatings).length === QUIZ_SKILLS.length;

          quizContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Team Skills Self-Assessment'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Rate yourself on each skill from 1 (I\'m still learning) to 5 (I\'m really good at this!).' :
              band === 'middle' ? 'Honestly rate your ability in each teamwork skill. 1 = needs work, 5 = strong.' :
              'Assess your competency across 8 core teamwork dimensions. Be candid \u2014 self-awareness drives growth.'
            ),

            // Skill rating cards
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 } },
              QUIZ_SKILLS.map(function(skill) {
                var rating = quizRatings[skill.id] || 0;
                return h('div', {
                  key: skill.id,
                  style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid ' + (rating > 0 ? ACCENT + '44' : '#334155') }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 20 } }, skill.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9' } }, skill.name),
                      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, skill.desc)
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    h('span', { style: { fontSize: 10, color: '#94a3b8', marginRight: 4 } }, 'Low'),
                    [1, 2, 3, 4, 5].map(function(val) {
                      var isSelected = rating === val;
                      return h('button', { 'aria-label': 'Toggle sound',
                        key: val,
                        onClick: function() {
                          if (quizSubmitted) return;
                          var newRatings = Object.assign({}, quizRatings);
                          newRatings[skill.id] = val;
                          upd('quizRatings', newRatings);
                          if (soundEnabled) sfxClick();
                        },
                        style: {
                          width: 32, height: 32, borderRadius: '50%', border: '2px solid ' + (isSelected ? ACCENT : '#334155'),
                          background: isSelected ? ACCENT_DIM : '#0f172a', color: isSelected ? ACCENT : '#94a3b8',
                          fontWeight: 700, fontSize: 13, cursor: quizSubmitted ? 'default' : 'pointer', transition: 'all 0.15s'
                        }
                      }, String(val));
                    }),
                    h('span', { style: { fontSize: 10, color: '#94a3b8', marginLeft: 4 } }, 'High')
                  )
                );
              })
            ),

            // Submit quiz
            !quizSubmitted && h('button', { 'aria-label': 'Your Skills Profile',
              onClick: function() {
                if (!quizDone) { addToast('Rate all 8 skills first!', 'info'); return; }
                upd('quizSubmitted', true);
                logPractice('quiz', 'skills_quiz');
                tryAwardBadge('skills_assessor');
                awardXP(20);
                if (soundEnabled) sfxCorrect();
                addToast('Skills assessment complete! +20 XP', 'success');
                celebrate && celebrate();
              },
              style: { display: 'block', width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', background: quizDone ? ACCENT : '#334155', color: quizDone ? '#0f172a' : '#94a3b8', fontWeight: 700, fontSize: 14, cursor: quizDone ? 'pointer' : 'default', marginBottom: 20 }
            }, quizDone ? '\u2705 Submit My Assessment' : 'Rate all 8 skills to continue'),

            // Results visualization (bar chart)
            quizSubmitted && h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, textAlign: 'center' } }, '\uD83D\uDCCA Your Skills Profile'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                QUIZ_SKILLS.map(function(skill) {
                  var myRating = quizRatings[skill.id] || 0;
                  var idealRating = IDEAL_PROFILE[skill.id] || 4;
                  var barWidthMy = (myRating / 5) * 100;
                  var barWidthIdeal = (idealRating / 5) * 100;
                  return h('div', { key: skill.id },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 } },
                      h('span', { style: { fontSize: 14 } }, skill.icon),
                      h('span', { style: { fontSize: 11, color: '#cbd5e1', flex: 1, minWidth: 100 } }, skill.name),
                      h('span', { style: { fontSize: 11, color: ACCENT, fontWeight: 600, width: 24, textAlign: 'right' } }, String(myRating))
                    ),
                    // My rating bar
                    h('div', { style: { position: 'relative', height: 10, borderRadius: 5, background: '#0f172a', overflow: 'hidden', marginBottom: 2 } },
                      h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: barWidthMy + '%', background: ACCENT, borderRadius: 5, transition: 'width 0.5s' } })
                    ),
                    // Ideal bar (subtle reference line)
                    h('div', { style: { position: 'relative', height: 4, borderRadius: 2, background: '#0f172a', overflow: 'hidden' } },
                      h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: barWidthIdeal + '%', background: '#6366f144', borderRadius: 2 } })
                    )
                  );
                })
              ),
              h('div', { style: { display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 10, color: '#94a3b8' } },
                h('span', null, h('span', { style: { display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: ACCENT, marginRight: 4, verticalAlign: 'middle' } }), 'Your Rating'),
                h('span', null, h('span', { style: { display: 'inline-block', width: 10, height: 4, borderRadius: 2, background: '#6366f144', marginRight: 4, verticalAlign: 'middle' } }), 'Ideal Team Player')
              ),

              // Summary
              (function() {
                var total = 0; var count = 0; var strongest = ''; var sMax = 0; var weakest = ''; var wMin = 6;
                QUIZ_SKILLS.forEach(function(skill) {
                  var v = quizRatings[skill.id] || 0;
                  total += v; count++;
                  if (v > sMax) { sMax = v; strongest = skill.name; }
                  if (v < wMin) { wMin = v; weakest = skill.name; }
                });
                var avg = count > 0 ? (total / count).toFixed(1) : '0';
                return h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: '#f1f5f9', marginBottom: 6 } }, '\uD83D\uDCCB Summary'),
                  h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.8 } },
                    '\u2022 Average score: ' + avg + '/5',
                    h('br'),
                    '\u2022 Strongest skill: ' + strongest + ' (' + sMax + '/5)',
                    h('br'),
                    '\u2022 Growth area: ' + weakest + ' (' + wMin + '/5)',
                    h('br'),
                    '\u2022 ' + (parseFloat(avg) >= 4 ? 'You\'re a strong team player! Focus on mentoring others.' : parseFloat(avg) >= 3 ? 'Solid foundation! Target your growth areas for the next level.' : 'Great self-awareness! Pick one skill to practice this week.')
                  )
                );
              })(),

              // Reset quiz
              h('button', { 'aria-label': 'Retake Quiz',
                onClick: function() { upd({ quizRatings: {}, quizSubmitted: false }); if (soundEnabled) sfxClick(); },
                style: { display: 'block', margin: '12px auto 0', padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }
              }, 'Retake Quiz')
            ),

            // Quick reflection
            quizSubmitted && renderQuickReflection('quiz')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Team Contract Builder ──
        // ══════════════════════════════════════════════════════════
        var contractContent = null;
        if (activeTab === 'contract') {
          contractContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCDC Team Contract Builder'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Make promises with your team about how you\'ll work together!' :
              band === 'middle' ? 'Create a team agreement that sets expectations for how you\'ll collaborate.' :
              'Draft a formal team operating agreement that establishes norms, roles, and accountability structures.'
            ),

            // ── Section 1: Team Agreements ──
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 } },
                '\uD83E\uDD1D ' + (band === 'elementary' ? 'We Promise To...' : 'We Agree To...')
              ),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                contractAgreements.map(function(agreement, idx) {
                  return h('div', { key: idx, style: { display: 'flex', alignItems: 'center', gap: 8 } },
                    h('span', { style: { fontSize: 12, color: ACCENT, fontWeight: 700, minWidth: 20 } }, String(idx + 1) + '.'),
                    h('input', {
                      type: 'text',
                      'aria-label': 'Team agreement ' + (idx + 1),
                      value: agreement,
                      onChange: function(e) {
                        var newAgreements = contractAgreements.slice();
                        newAgreements[idx] = e.target.value;
                        upd('contractAgreements', newAgreements);
                        upd('contractSaved', false);
                      },
                      placeholder: idx === 0 ? (band === 'elementary' ? 'Listen when someone is talking' : 'Respect all ideas during brainstorming') :
                                   idx === 1 ? (band === 'elementary' ? 'Take turns sharing ideas' : 'Meet all deadlines or communicate early') :
                                   idx === 2 ? (band === 'elementary' ? 'Help when someone is stuck' : 'Give constructive feedback, not criticism') :
                                   idx === 3 ? (band === 'elementary' ? 'Say kind things about each other\'s work' : 'Share workload equitably') :
                                   (band === 'elementary' ? 'Try our best even when it\'s hard' : 'Address conflicts directly and respectfully'),
                      style: { flex: 1, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }
                    })
                  );
                })
              )
            ),

            // ── Section 2: Role Assignments ──
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12 } }, '\uD83D\uDC65 Role Assignments'),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } }, 'Assign team members to roles (e.g., "Alex \u2014 Note-Taker", "Sam \u2014 Facilitator"):'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                contractRoles.map(function(role, idx) {
                  return h('input', {
                    key: idx,
                    type: 'text',
                    'aria-label': 'Team role assignment ' + (idx + 1),
                    value: role,
                    onChange: function(e) {
                      var newRoles = contractRoles.slice();
                      newRoles[idx] = e.target.value;
                      upd('contractRoles', newRoles);
                      upd('contractSaved', false);
                    },
                    placeholder: 'Team member ' + (idx + 1) + ' \u2014 Role',
                    style: { padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }
                  });
                })
              )
            ),

            // ── Section 3: Communication Expectations ──
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 } }, '\uD83D\uDCAC Communication Plan'),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } },
                band === 'elementary' ? 'How will your team talk to each other during the project?' :
                'How and when will the team communicate? (e.g., daily check-ins, group chat norms, response time expectations)'
              ),
              h('textarea', {
                value: contractComms,
                'aria-label': 'Communication norms',
                onChange: function(e) { upd('contractComms', e.target.value); upd('contractSaved', false); },
                placeholder: band === 'elementary' ? 'We will raise our hands, take turns, and ask before changing someone\'s work.' :
                  band === 'middle' ? 'We\'ll use a group chat for updates. We\'ll respond within 24 hours. We\'ll meet twice a week in person.' :
                  'Communication channels, response-time expectations, meeting cadence, status update format...',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }
              })
            ),

            // ── Section 4: Consequences ──
            h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 } },
                '\u26A0\uFE0F ' + (band === 'elementary' ? 'What Happens If We Forget?' : 'Accountability Plan')
              ),
              h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10 } },
                band === 'elementary' ? 'What will your team do if someone doesn\'t follow the promises?' :
                'What are the agreed-upon consequences if a team member doesn\'t meet expectations?'
              ),
              h('textarea', {
                value: contractConsequence,
                'aria-label': 'Consequence agreement',
                onChange: function(e) { upd('contractConsequence', e.target.value); upd('contractSaved', false); },
                placeholder: band === 'elementary' ? 'We\'ll have a kind talk. If it keeps happening, we\'ll ask the teacher for help.' :
                  band === 'middle' ? 'First: private conversation. Second: group discussion. Third: involve the teacher.' :
                  'Progressive accountability: private check-in, team meeting, escalation path, grade impact discussion.',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12, resize: 'vertical', boxSizing: 'border-box' }
              })
            ),

            // Save / Preview
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 } },
              h('button', { 'aria-label': 'Start New Contract',
                onClick: function() {
                  var filledAgreements = contractAgreements.filter(function(a) { return a.trim(); });
                  if (filledAgreements.length < 2) { addToast('Fill in at least 2 agreements!', 'info'); return; }
                  upd('contractSaved', true);
                  logPractice('contract', 'team_contract');
                  tryAwardBadge('contract_creator');
                  awardXP(20);
                  if (soundEnabled) sfxCorrect();
                  addToast('Team contract saved! +20 XP', 'success');
                  celebrate && celebrate();
                },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: contractSaved ? '#334155' : ACCENT, color: contractSaved ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, contractSaved ? '\u2713 Contract Saved' : '\uD83D\uDCBE Save Contract'),
              contractSaved && h('button', { 'aria-label': 'Start New Contract',
                onClick: function() { upd({ contractAgreements: ['', '', '', '', ''], contractRoles: ['', '', '', ''], contractComms: '', contractConsequence: '', contractSaved: false }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 16px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
              }, 'Start New Contract')
            ),

            // Contract Preview
            contractSaved && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '2px solid ' + ACCENT + '44', marginBottom: 16 } },
              h('div', { style: { textAlign: 'center', marginBottom: 14 } },
                h('div', { style: { fontSize: 20, fontWeight: 700, color: '#f1f5f9' } }, '\uD83D\uDCDC Team Contract'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, 'Created ' + new Date().toLocaleDateString())
              ),
              h('div', { style: { marginBottom: 14 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 6 } }, 'AGREEMENTS:'),
                contractAgreements.filter(function(a) { return a.trim(); }).map(function(a, i) {
                  return h('div', { key: i, style: { fontSize: 12, color: '#cbd5e1', padding: '4px 0', paddingLeft: 12, borderLeft: '2px solid ' + ACCENT + '44' } }, (i + 1) + '. ' + a);
                })
              ),
              contractRoles.filter(function(r) { return r.trim(); }).length > 0 && h('div', { style: { marginBottom: 14 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#8b5cf6', marginBottom: 6 } }, 'ROLES:'),
                contractRoles.filter(function(r) { return r.trim(); }).map(function(r, i) {
                  return h('div', { key: i, style: { fontSize: 12, color: '#cbd5e1', padding: '4px 0', paddingLeft: 12, borderLeft: '2px solid #8b5cf644' } }, r);
                })
              ),
              contractComms.trim() && h('div', { style: { marginBottom: 14 } },
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#f59e0b', marginBottom: 6 } }, 'COMMUNICATION:'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, paddingLeft: 12, borderLeft: '2px solid #f59e0b44' } }, contractComms)
              ),
              contractConsequence.trim() && h('div', null,
                h('div', { style: { fontSize: 12, fontWeight: 700, color: '#ef4444', marginBottom: 6 } }, 'ACCOUNTABILITY:'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6, paddingLeft: 12, borderLeft: '2px solid #ef444444' } }, contractConsequence)
              ),
              h('div', { style: { marginTop: 16, paddingTop: 12, borderTop: '1px dashed #334155', textAlign: 'center' } },
                h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'Signatures: _______________  _______________  _______________  _______________')
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Communication Styles ──
        // ══════════════════════════════════════════════════════════
        var commStyleContent = null;
        if (activeTab === 'commstyle') {
          var totalQuestions = COMM_STYLE_QUESTIONS.length;
          var answeredQuestions = Object.keys(commStyleAnswers).length;

          // Calculate results
          function calcCommStyleResults() {
            var tallies = { director: 0, collaborator: 0, analyzer: 0, supporter: 0 };
            for (var k in commStyleAnswers) {
              if (commStyleAnswers.hasOwnProperty(k)) {
                var style = commStyleAnswers[k];
                tallies[style] = (tallies[style] || 0) + 1;
              }
            }
            var sorted = Object.keys(tallies).sort(function(a, b) { return tallies[b] - tallies[a]; });
            return { tallies: tallies, primary: sorted[0], secondary: sorted[1], sorted: sorted };
          }

          commStyleContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDDE3\uFE0F Communication Style Discovery'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Find out how you like to talk and work with your team! Answer 10 questions.' :
              band === 'middle' ? 'Discover your natural communication style. There are no wrong answers \u2014 every style has strengths!' :
              'Identify your dominant communication tendencies to leverage strengths and address blind spots in team settings.'
            ),
            h('div', { style: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 16 } }, answeredQuestions + ' / ' + totalQuestions + ' questions answered'),

            // Questions (not yet submitted)
            !commStyleDone && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 } },
              COMM_STYLE_QUESTIONS.map(function(q, qi) {
                var answered = commStyleAnswers[qi] != null;
                return h('div', { key: qi, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid ' + (answered ? ACCENT + '44' : '#334155') } },
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 } }, (qi + 1) + '. ' + q.q),
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                    q.options.map(function(opt, oi) {
                      var isSelected = commStyleAnswers[qi] === opt.style;
                      return h('button', { 'aria-label': 'Toggle sound',
                        key: oi,
                        onClick: function() {
                          var newAns = Object.assign({}, commStyleAnswers);
                          newAns[qi] = opt.style;
                          upd('commStyleAnswers', newAns);
                          if (soundEnabled) sfxClick();
                        },
                        style: {
                          padding: '8px 12px', borderRadius: 8, border: '1px solid ' + (isSelected ? ACCENT : '#334155'),
                          background: isSelected ? ACCENT_DIM : '#0f172a', color: isSelected ? ACCENT : '#cbd5e1',
                          fontSize: 12, textAlign: 'left', cursor: 'pointer', lineHeight: 1.5, fontWeight: isSelected ? 600 : 400
                        }
                      }, opt.text);
                    })
                  )
                );
              })
            ),

            // Submit button
            !commStyleDone && h('button', { 'aria-label': 'questions',
              onClick: function() {
                if (answeredQuestions < totalQuestions) { addToast('Answer all ' + totalQuestions + ' questions first!', 'info'); return; }
                var results = calcCommStyleResults();
                upd('commStyleDone', true);
                upd('commStyleResult', results);
                logPractice('comm_style', 'discovery');
                tryAwardBadge('comm_style');
                awardXP(25);
                if (soundEnabled) sfxCorrect();
                addToast('Communication style discovered! +25 XP', 'success');
                celebrate && celebrate();
              },
              style: { display: 'block', width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', background: answeredQuestions === totalQuestions ? ACCENT : '#334155', color: answeredQuestions === totalQuestions ? '#0f172a' : '#94a3b8', fontWeight: 700, fontSize: 14, cursor: answeredQuestions === totalQuestions ? 'pointer' : 'default', marginBottom: 20 }
            }, answeredQuestions === totalQuestions ? '\u2705 Discover My Style' : 'Answer all ' + totalQuestions + ' questions'),

            // Results
            commStyleDone && commStyleResult && (function() {
              var res = commStyleResult;
              var primary = COMM_STYLES[res.primary];
              var secondary = COMM_STYLES[res.secondary];
              var tallies = res.tallies;
              var styleKeys = ['director', 'collaborator', 'analyzer', 'supporter'];

              return h('div', null,
                // Primary & Secondary style cards
                h('div', { style: { padding: 18, borderRadius: 14, background: '#1e293b', border: '2px solid ' + primary.color + '66', marginBottom: 16 } },
                  h('div', { style: { textAlign: 'center', marginBottom: 12 } },
                    h('div', { style: { fontSize: 36 } }, primary.icon),
                    h('div', { style: { fontSize: 18, fontWeight: 700, color: primary.color, marginTop: 4 } }, 'Primary: ' + primary.name),
                    h('div', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4, lineHeight: 1.6 } }, primary.desc)
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 } },
                    h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a' } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 6 } }, '\u2705 STRENGTHS'),
                      primary.strengths.map(function(s, i) {
                        return h('div', { key: i, style: { fontSize: 11, color: '#cbd5e1', padding: '2px 0', lineHeight: 1.5 } }, '\u2022 ' + s);
                      })
                    ),
                    h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a' } },
                      h('div', { style: { fontSize: 11, fontWeight: 700, color: '#f59e0b', marginBottom: 6 } }, '\u26A0\uFE0F BLIND SPOTS'),
                      primary.blindSpots.map(function(s, i) {
                        return h('div', { key: i, style: { fontSize: 11, color: '#cbd5e1', padding: '2px 0', lineHeight: 1.5 } }, '\u2022 ' + s);
                      })
                    )
                  )
                ),

                // Secondary style
                h('div', { style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid ' + secondary.color + '44', marginBottom: 16 } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('span', { style: { fontSize: 24 } }, secondary.icon),
                    h('div', null,
                      h('div', { style: { fontSize: 13, fontWeight: 600, color: secondary.color } }, 'Secondary: ' + secondary.name),
                      h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, secondary.desc)
                    )
                  )
                ),

                // Score bars
                h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 } }, '\uD83D\uDCCA Style Breakdown'),
                  styleKeys.map(function(sk) {
                    var s = COMM_STYLES[sk];
                    var count = tallies[sk] || 0;
                    var pct = Math.round((count / totalQuestions) * 100);
                    return h('div', { key: sk, style: { marginBottom: 8 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 } },
                        h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, s.icon + ' ' + s.name),
                        h('span', { style: { fontSize: 11, color: s.color, fontWeight: 600 } }, count + '/' + totalQuestions + ' (' + pct + '%)')
                      ),
                      h('div', { style: { height: 8, borderRadius: 4, background: '#0f172a', overflow: 'hidden' } },
                        h('div', { style: { height: '100%', width: pct + '%', background: s.color, borderRadius: 4, transition: 'width 0.5s' } })
                      )
                    );
                  })
                ),

                // How to work with each style
                h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 } }, '\uD83E\uDD1D How to Work With Each Style'),
                  styleKeys.map(function(sk) {
                    var s = COMM_STYLES[sk];
                    return h('div', { key: sk, style: { padding: 10, borderRadius: 8, background: '#0f172a', marginBottom: 6, borderLeft: '3px solid ' + s.color } },
                      h('div', { style: { fontSize: 12, fontWeight: 600, color: s.color, marginBottom: 4 } }, s.icon + ' ' + s.name),
                      h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.6 } }, s.workWith)
                    );
                  })
                ),

                // AI team composition advice
                h('div', { style: { padding: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #6366f133', marginBottom: 16 } },
                  h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\u2728 AI Team Composition Advice'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 10 } }, 'Get personalized advice on how your style fits into different team compositions.'),
                  h('button', { 'aria-label': commStyleCoachLoad ? 'Thinking...' : '\u2728 Get Team Advice',
                    onClick: function() {
                      if (!callGemini) { addToast('AI not available.', 'error'); return; }
                      upd('commStyleCoachLoad', true);
                      upd('commStyleCoachResp', null);
                      var prompt = 'You are a teamwork communication coach for ' + band + ' school students.\n\n' +
                        'This student\'s communication style results:\n' +
                        '- Primary style: ' + primary.name + ' (' + (tallies[res.primary] || 0) + '/' + totalQuestions + ' answers)\n' +
                        '- Secondary style: ' + secondary.name + ' (' + (tallies[res.secondary] || 0) + '/' + totalQuestions + ' answers)\n\n' +
                        'Provide:\n1. How their primary + secondary combination works together\n2. What kind of teammates complement their style best\n3. One specific tip for their biggest blind spot\n4. An ideal 4-person team composition that includes their style\n\n' +
                        'Use ' + (band === 'elementary' ? 'simple, encouraging language for ages 5-10.' : band === 'middle' ? 'relatable language for ages 11-14.' : 'professional coaching language for ages 15-18.') +
                        '\nKeep it under 180 words.';
                      callGemini(prompt).then(function(result) {
                        var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                        upd('commStyleCoachResp', resp);
                        upd('commStyleCoachLoad', false);
                        tryAwardBadge('ai_coach');
                      }).catch(function(err) {
                        upd('commStyleCoachLoad', false);
                        addToast('Error: ' + err.message, 'error');
                      });
                    },
                    disabled: commStyleCoachLoad,
                    style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: commStyleCoachLoad ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 12, cursor: commStyleCoachLoad ? 'default' : 'pointer' }
                  }, commStyleCoachLoad ? 'Thinking...' : '\u2728 Get Team Advice'),
                  commStyleCoachResp && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #6366f144' } },
                    h('p', { style: { fontSize: 10, color: '#818cf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\u2728 Team Coach'),
                    h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, commStyleCoachResp)
                  )
                ),

                // Retake
                h('button', { 'aria-label': 'Retake Quiz',
                  onClick: function() { upd({ commStyleAnswers: {}, commStyleDone: false, commStyleResult: null, commStyleCoachResp: null }); if (soundEnabled) sfxClick(); },
                  style: { display: 'block', margin: '0 auto', padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }
                }, 'Retake Quiz')
              );
            })(),

            // Quick reflection
            commStyleDone && renderQuickReflection('commstyle')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Virtual Team Simulator ──
        // ══════════════════════════════════════════════════════════
        var virtualTeamContent = null;
        if (activeTab === 'virtualteam') {
          var curVt = VIRTUAL_TEAM_SCENARIOS[vtScenarioIdx % VIRTUAL_TEAM_SCENARIOS.length];
          var vtAnswered = vtAnswers[curVt.id] != null;
          var vtReveal = !!vtRevealed[curVt.id];
          var vtAnsweredCount = Object.keys(vtAnswers).length;

          virtualTeamContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCBB Virtual Team Simulator'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Practice working with a team when you can\u2019t meet in person!' :
              band === 'middle' ? 'Master the challenges of remote collaboration. 5 realistic scenarios.' :
              'Navigate the complexities of virtual teamwork. Practice async communication, trust-building, and remote conflict resolution.'
            ),
            h('div', { style: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 16 } },
              'Scenario ' + ((vtScenarioIdx % VIRTUAL_TEAM_SCENARIOS.length) + 1) + ' of ' + VIRTUAL_TEAM_SCENARIOS.length + ' \u00B7 ' + vtAnsweredCount + ' completed'
            ),

            // Scenario card
            h('div', { style: { padding: 20, borderRadius: 14, background: '#1e293b', border: '1px solid #3b82f644', marginBottom: 16 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                h('span', { style: { fontSize: 28 } }, curVt.icon),
                h('h4', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', margin: 0 } }, curVt.title)
              ),
              h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.7, marginBottom: 16 } }, curVt.setup),

              // Choices
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                curVt.choices.map(function(ch, ci) {
                  var isChosen = vtAnswers[curVt.id] === ci;
                  var showFeedback = vtReveal && isChosen;
                  return h('div', { key: ci },
                    h('button', { 'aria-label': 'Toggle sound',
                      onClick: function() {
                        if (vtAnswered) return;
                        var newAns = Object.assign({}, vtAnswers);
                        newAns[curVt.id] = ci;
                        var newRev = Object.assign({}, vtRevealed);
                        newRev[curVt.id] = true;
                        upd({ vtAnswers: newAns, vtRevealed: newRev });
                        logPractice('virtual_team', curVt.id);
                        awardXP(15);
                        if (ch.rating === 3) {
                          if (soundEnabled) sfxCorrect();
                          addToast('\u2B50\u2B50\u2B50 Excellent remote teamwork!', 'success');
                        } else if (ch.rating === 2) {
                          if (soundEnabled) sfxReveal();
                          addToast('\u2B50\u2B50 Decent approach!', 'info');
                        } else {
                          if (soundEnabled) sfxWrong();
                          addToast('\u2B50 There\u2019s a better way.', 'info');
                        }
                        tryAwardBadge('virtual_scenario_1');
                        // Check all done
                        var totalVtAnswered = Object.keys(newAns).length;
                        if (totalVtAnswered >= VIRTUAL_TEAM_SCENARIOS.length) tryAwardBadge('virtual_team_pro');
                      },
                      disabled: vtAnswered,
                      style: {
                        width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid ' + (isChosen ? (ch.rating === 3 ? '#22c55e' : ch.rating === 2 ? '#f59e0b' : '#ef4444') : '#334155'),
                        background: isChosen ? (ch.rating === 3 ? '#22c55e11' : ch.rating === 2 ? '#f59e0b11' : '#ef444411') : '#0f172a',
                        color: '#e2e8f0', fontSize: 13, textAlign: 'left', cursor: vtAnswered ? 'default' : 'pointer', lineHeight: 1.5
                      }
                    },
                      h('span', null, ch.text),
                      isChosen && h('span', { style: { marginLeft: 8 } }, renderStars(ch.rating))
                    ),
                    showFeedback && h('div', { style: { padding: '10px 14px', borderRadius: '0 0 10px 10px', background: '#0f172a', borderLeft: '3px solid ' + (ch.rating === 3 ? '#22c55e' : ch.rating === 2 ? '#f59e0b' : '#ef4444'), marginTop: -2, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 } },
                      ch.feedback
                    )
                  );
                })
              ),

              // Show all ratings after answering
              vtReveal && h('div', { style: { marginTop: 12, padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
                h('div', { style: { fontSize: 11, fontWeight: 600, color: '#94a3b8', marginBottom: 6 } }, 'All response ratings:'),
                curVt.choices.map(function(ch, ci) {
                  var isChosen = vtAnswers[curVt.id] === ci;
                  return h('div', { key: ci, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', fontSize: 11, color: isChosen ? '#f1f5f9' : '#94a3b8' } },
                    renderStars(ch.rating),
                    h('span', { style: { marginLeft: 4 } }, ch.text.substring(0, 50) + (ch.text.length > 50 ? '...' : '')),
                    isChosen && h('span', { style: { color: ACCENT, marginLeft: 4, fontWeight: 700 } }, '\u2190 your pick')
                  );
                })
              ),

              // Remote work tip
              vtReveal && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: '#0f172a', border: '1px solid #3b82f633' } },
                h('div', { style: { fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 } }, '\uD83D\uDCA1 Remote Work Tip'),
                h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.6 } }, curVt.tip)
              ),

              // Navigation
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginTop: 16 } },
                vtScenarioIdx > 0 && h('button', { 'aria-label': 'Previous',
                  onClick: function() { upd('vtScenarioIdx', vtScenarioIdx - 1); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, '\u2190 Previous'),
                vtScenarioIdx < VIRTUAL_TEAM_SCENARIOS.length - 1 && h('button', { 'aria-label': 'Next',
                  onClick: function() { upd('vtScenarioIdx', vtScenarioIdx + 1); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, 'Next \u2192')
              )
            ),

            // Quick reflection
            renderQuickReflection('virtualteam')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Conflict-to-Collaboration Converter ──
        // ══════════════════════════════════════════════════════════
        var conflictToolContent = null;
        if (activeTab === 'conflicttool') {
          conflictToolContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u267B\uFE0F Conflict \u2192 Collaboration Converter'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'When your team has a problem, describe it here and we\u2019ll help you turn it into teamwork!' :
              band === 'middle' ? 'Describe a team conflict and AI will reframe it as a collaboration opportunity with concrete steps.' :
              'Transform team friction into productive collaboration. Describe any conflict and receive actionable reframing strategies.'
            ),

            // Input section
            h('div', { style: { padding: 18, borderRadius: 14, background: '#1e293b', border: '1px solid #f59e0b44', marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 10 } }, '\uD83D\uDD25 Describe the Team Conflict'),
              h('textarea', {
                value: conflictInput,
                'aria-label': 'Describe your team conflict',
                onChange: function(e) { upd('conflictInput', e.target.value); },
                placeholder: band === 'elementary' ? 'Example: Two people in my group both want to be the leader and they keep arguing...' :
                  band === 'middle' ? 'Example: Our team is split on the project direction. Half want to do a presentation, half want a video. Nobody will compromise...' :
                  'Describe the conflict in detail: who is involved, what happened, how people feel, and what you\'ve tried so far...',
                rows: 4,
                style: { width: '100%', padding: 12, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }
              }),
              h('button', { 'aria-label': 'professional coaching language for ages 15-18.',
                onClick: function() {
                  if (!conflictInput.trim()) { addToast('Describe the conflict first!', 'info'); return; }
                  if (conflictInput.trim().length < 15) { addToast('Please describe the conflict in more detail.', 'info'); return; }
                  if (!callGemini) { addToast('AI not available.', 'error'); return; }
                  upd('conflictLoading', true);
                  upd('conflictResult', null);
                  var prompt = 'You are a teamwork mediator and collaboration coach for ' + band + ' school students.\n\n' +
                    'TEAM CONFLICT: "' + conflictInput + '"\n\n' +
                    'Respond with EXACTLY this format:\n\n' +
                    'REFRAME: [Restate the conflict as a collaboration opportunity in 1-2 sentences. Start with "This is actually an opportunity to..."]\n\n' +
                    'STEP 1: [First concrete action step to move from conflict to collaboration]\n\n' +
                    'STEP 2: [Second concrete action step]\n\n' +
                    'STEP 3: [Third concrete action step]\n\n' +
                    'KEY INSIGHT: [One sentence about what this conflict teaches about teamwork]\n\n' +
                    'Use ' + (band === 'elementary' ? 'simple, kind language for ages 5-10.' : band === 'middle' ? 'clear, practical language for ages 11-14.' : 'professional coaching language for ages 15-18.') +
                    '\nKeep each section brief (1-2 sentences each). Total under 200 words.';
                  callGemini(prompt).then(function(result) {
                    var resp = typeof result === 'string' ? result : (result && result.text ? result.text : String(result));
                    upd('conflictResult', resp);
                    upd('conflictLoading', false);
                    var newCount = conflictCount + 1;
                    upd('conflictCount', newCount);
                    var newHistory = conflictHistory.concat([{ input: conflictInput, result: resp, timestamp: Date.now() }]);
                    upd('conflictHistory', newHistory);
                    logPractice('conflict_convert', 'conflict_' + newCount);
                    awardXP(20);
                    if (soundEnabled) sfxCorrect();
                    addToast('Conflict converted! +20 XP', 'success');
                    if (newCount >= 3) tryAwardBadge('conflict_converter');
                  }).catch(function(err) {
                    upd('conflictLoading', false);
                    addToast('Error: ' + err.message, 'error');
                  });
                },
                disabled: conflictLoading,
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: conflictLoading ? '#334155' : '#f59e0b', color: conflictLoading ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: 13, cursor: conflictLoading ? 'default' : 'pointer' }
              }, conflictLoading ? '\u2728 Converting...' : '\u267B\uFE0F Convert to Collaboration')
            ),

            // Result
            conflictResult && h('div', { style: { padding: 18, borderRadius: 14, background: '#1e293b', border: '2px solid #22c55e44', marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 12, textAlign: 'center' } }, '\u2705 Collaboration Opportunity'),
              h('div', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap' } }, conflictResult),
              h('button', { 'aria-label': 'Convert Another Conflict',
                onClick: function() { upd({ conflictInput: '', conflictResult: null }); if (soundEnabled) sfxClick(); },
                style: { display: 'block', margin: '14px auto 0', padding: '8px 18px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\u267B\uFE0F Convert Another Conflict')
            ),

            // Conversion counter
            h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', marginBottom: 16, textAlign: 'center' } },
              h('div', { style: { fontSize: 24, fontWeight: 700, color: '#f59e0b' } }, String(conflictCount)),
              h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, 'Conflicts Converted to Collaborations'),
              conflictCount < 3 && h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 4 } }, 'Convert ' + (3 - conflictCount) + ' more to earn the Conflict Converter badge!')
            ),

            // History
            conflictHistory.length > 0 && h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginBottom: 8 } }, '\uD83D\uDCDD Conversion History'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                conflictHistory.slice(-5).reverse().map(function(entry, i) {
                  return h('div', { key: i, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 4 } }, new Date(entry.timestamp).toLocaleString()),
                    h('div', { style: { fontSize: 11, color: '#ef4444', marginBottom: 4, fontStyle: 'italic' } }, '\uD83D\uDD25 "' + (entry.input.length > 80 ? entry.input.substring(0, 80) + '...' : entry.input) + '"'),
                    h('div', { style: { fontSize: 11, color: '#22c55e' } }, '\u2705 Converted successfully')
                  );
                })
              )
            ),

            renderQuickReflection('conflicttool')
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Team Retrospective Tool ──
        // ══════════════════════════════════════════════════════════
        var retroContent = null;
        if (activeTab === 'retro') {
          var retroCategories = [
            { key: 'green', label: 'What Went Well', color: '#22c55e', icon: '\u2705', items: retroGreen, inputVal: retroGreenInput, inputKey: 'retroGreenInput', listKey: 'retroGreen' },
            { key: 'yellow', label: 'What Could Improve', color: '#f59e0b', icon: '\u26A0\uFE0F', items: retroYellow, inputVal: retroYellowInput, inputKey: 'retroYellowInput', listKey: 'retroYellow' },
            { key: 'blue', label: 'Action Items for Next Time', color: '#3b82f6', icon: '\uD83D\uDCCB', items: retroBlue, inputVal: retroBlueInput, inputKey: 'retroBlueInput', listKey: 'retroBlue' }
          ];

          retroContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDD04 Team Retrospective'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'After working with your team, think about what happened! Add cards to each section.' :
              band === 'middle' ? 'Run a team retro: reflect on what worked, what didn\u2019t, and what to do differently next time.' :
              'Conduct a structured retrospective to extract actionable insights from your team\u2019s collaboration experience.'
            ),

            // Three category sections
            retroCategories.map(function(cat) {
              return h('div', { key: cat.key, style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid ' + cat.color + '44', marginBottom: 14 } },
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 } },
                  h('span', { style: { fontSize: 18 } }, cat.icon),
                  h('span', { style: { fontSize: 14, fontWeight: 700, color: cat.color } }, cat.label),
                  h('span', { style: { marginLeft: 'auto', fontSize: 11, color: '#94a3b8', padding: '2px 8px', borderRadius: 12, background: '#0f172a' } }, cat.items.length + ' cards')
                ),

                // Existing cards
                cat.items.length > 0 && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 } },
                  cat.items.map(function(item, idx) {
                    return h('div', { key: idx, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#0f172a', border: '1px solid ' + cat.color + '22' } },
                      h('div', { style: { width: 4, height: 20, borderRadius: 2, background: cat.color, flexShrink: 0 } }),
                      h('span', { style: { fontSize: 12, color: '#e2e8f0', flex: 1, lineHeight: 1.5 } }, item),
                      h('button', { 'aria-label': 'Remove',
                        onClick: function() {
                          var newItems = cat.items.slice();
                          newItems.splice(idx, 1);
                          upd(cat.listKey, newItems);
                          upd('retroSaved', false);
                          if (soundEnabled) sfxClick();
                        },
                        style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: '0 4px' },
                        title: 'Remove'
                      }, '\u00D7')
                    );
                  })
                ),

                // Add new card
                h('div', { style: { display: 'flex', gap: 8 } },
                  h('input', {
                    type: 'text',
                    'aria-label': cat.label + ' retrospective item',
                    value: cat.inputVal,
                    onChange: function(e) { upd(cat.inputKey, e.target.value); },
                    onKeyDown: function(e) {
                      if (e.key === 'Enter' && cat.inputVal.trim()) {
                        var newItems = cat.items.concat([cat.inputVal.trim()]);
                        upd(cat.listKey, newItems);
                        upd(cat.inputKey, '');
                        upd('retroSaved', false);
                        if (soundEnabled) sfxClick();
                      }
                    },
                    placeholder: cat.key === 'green' ? 'Something that went well...' : cat.key === 'yellow' ? 'Something to improve...' : 'An action item for next time...',
                    style: { flex: 1, padding: 8, borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: 12 }
                  }),
                  h('button', { 'aria-label': '+ Add',
                    onClick: function() {
                      if (!cat.inputVal.trim()) return;
                      var newItems = cat.items.concat([cat.inputVal.trim()]);
                      upd(cat.listKey, newItems);
                      upd(cat.inputKey, '');
                      upd('retroSaved', false);
                      if (soundEnabled) sfxClick();
                    },
                    style: { padding: '8px 14px', borderRadius: 8, border: 'none', background: cat.color, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                  }, '+ Add')
                )
              );
            }),

            // Save / Export buttons
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 } },
              h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  var totalCards = retroGreen.length + retroYellow.length + retroBlue.length;
                  if (totalCards < 3) { addToast('Add at least 3 cards total to save!', 'info'); return; }
                  upd('retroSaved', true);
                  logPractice('retro', 'retrospective');
                  tryAwardBadge('retro_runner');
                  awardXP(20);
                  if (soundEnabled) sfxCorrect();
                  addToast('Retrospective saved! +20 XP', 'success');
                  celebrate && celebrate();
                },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: retroSaved ? '#334155' : ACCENT, color: retroSaved ? '#94a3b8' : '#0f172a', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, retroSaved ? '\u2713 Saved' : '\uD83D\uDCBE Save Retrospective'),
              h('button', { 'aria-label': 'success',
                onClick: function() {
                  var totalCards = retroGreen.length + retroYellow.length + retroBlue.length;
                  if (totalCards === 0) { addToast('Add some cards before exporting!', 'info'); return; }
                  var text = '=== TEAM RETROSPECTIVE ===\n';
                  text += 'Date: ' + new Date().toLocaleDateString() + '\n\n';
                  text += '--- WHAT WENT WELL ---\n';
                  retroGreen.forEach(function(item, i) { text += (i + 1) + '. ' + item + '\n'; });
                  if (retroGreen.length === 0) text += '(none)\n';
                  text += '\n--- WHAT COULD IMPROVE ---\n';
                  retroYellow.forEach(function(item, i) { text += (i + 1) + '. ' + item + '\n'; });
                  if (retroYellow.length === 0) text += '(none)\n';
                  text += '\n--- ACTION ITEMS FOR NEXT TIME ---\n';
                  retroBlue.forEach(function(item, i) { text += (i + 1) + '. ' + item + '\n'; });
                  if (retroBlue.length === 0) text += '(none)\n';
                  text += '\n=== END RETROSPECTIVE ===\n';

                  // Copy to clipboard
                  if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(text).then(function() {
                      addToast('Retrospective copied to clipboard!', 'success');
                      tryAwardBadge('retro_exporter');
                    }).catch(function() {
                      addToast('Could not copy. Try again.', 'error');
                    });
                  } else {
                    // Fallback
                    var textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    try { document.execCommand('copy'); addToast('Retrospective copied to clipboard!', 'success'); tryAwardBadge('retro_exporter'); } catch(e) { addToast('Could not copy.', 'error'); }
                    document.body.removeChild(textarea);
                  }
                  if (soundEnabled) sfxTeam();
                },
                style: { padding: '10px 18px', borderRadius: 10, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDCE4 Export as Text'),
              h('button', { 'aria-label': 'Clear All',
                onClick: function() {
                  upd({ retroGreen: [], retroYellow: [], retroBlue: [], retroGreenInput: '', retroYellowInput: '', retroBlueInput: '', retroSaved: false });
                  if (soundEnabled) sfxClick();
                },
                style: { padding: '10px 14px', borderRadius: 10, border: '1px solid #334155', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }
              }, 'Clear All')
            ),

            // Retro preview (when saved)
            retroSaved && h('div', { style: { padding: 18, borderRadius: 14, background: '#0f172a', border: '2px solid ' + ACCENT + '44', marginBottom: 16 } },
              h('div', { style: { textAlign: 'center', marginBottom: 14 } },
                h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9' } }, '\uD83D\uDD04 Retrospective Summary'),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, new Date().toLocaleDateString())
              ),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
                [
                  { color: '#22c55e', icon: '\u2705', label: 'Well', items: retroGreen },
                  { color: '#f59e0b', icon: '\u26A0\uFE0F', label: 'Improve', items: retroYellow },
                  { color: '#3b82f6', icon: '\uD83D\uDCCB', label: 'Actions', items: retroBlue }
                ].map(function(col) {
                  return h('div', { key: col.label, style: { padding: 10, borderRadius: 10, background: '#1e293b', borderTop: '3px solid ' + col.color } },
                    h('div', { style: { fontSize: 11, fontWeight: 700, color: col.color, marginBottom: 6, textAlign: 'center' } }, col.icon + ' ' + col.label),
                    col.items.map(function(item, i) {
                      return h('div', { key: i, style: { fontSize: 10, color: '#cbd5e1', padding: '3px 0', lineHeight: 1.4, borderBottom: '1px solid #334155' } }, '\u2022 ' + item);
                    }),
                    col.items.length === 0 && h('div', { style: { fontSize: 10, color: '#475569', fontStyle: 'italic', textAlign: 'center' } }, '(none)')
                  );
                })
              )
            ),

            renderQuickReflection('retro')
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

          var vtAnsweredTotal = Object.keys(vtAnswers).length;
          var stats = [
            { icon: '\uD83D\uDC51', label: 'Roles Selected', value: selectedRoles.length + '/' + roles2.length, color: ACCENT },
            { icon: '\uD83C\uDFD7\uFE0F', label: 'Challenges Done', value: String(challengesCompleted), color: '#f59e0b' },
            { icon: '\uD83C\uDFAD', label: 'Scenarios Answered', value: answeredScenarios + '/' + SCENARIOS.length, color: '#8b5cf6' },
            { icon: '\u2B50', label: 'Stars Earned', value: totalStars + '/' + (SCENARIOS.length * 3), color: '#facc15' },
            { icon: '\uD83D\uDDE3\uFE0F', label: 'Comm Style', value: commStyleDone ? 'Done' : 'Not yet', color: '#ef4444' },
            { icon: '\uD83D\uDCBB', label: 'Virtual Team', value: vtAnsweredTotal + '/' + VIRTUAL_TEAM_SCENARIOS.length, color: '#3b82f6' },
            { icon: '\u267B\uFE0F', label: 'Conflicts Conv.', value: String(conflictCount), color: '#f59e0b' },
            { icon: '\uD83D\uDD04', label: 'Retrospective', value: retroSaved ? 'Done' : 'Not yet', color: '#06b6d4' },
            { icon: '\uD83D\uDCCA', label: 'Quiz', value: quizSubmitted ? 'Done' : 'Not yet', color: '#06b6d4' },
            { icon: '\uD83D\uDCDC', label: 'Contract', value: contractSaved ? 'Saved' : 'Not yet', color: '#a78bfa' },
            { icon: '\uD83C\uDFC5', label: 'Badges', value: Object.keys(earnedBadges).length + '/' + BADGES.length, color: '#ec4899' },
            { icon: '\uD83D\uDCDD', label: 'Reflections', value: String(reflectionLog.length), color: '#22d3ee' },
            { icon: '\uD83D\uDD25', label: 'Activities', value: String(practiceLog.length), color: '#ef4444' }
          ];

          progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Teamwork Progress'),

            // Stats grid
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 } },
              stats.map(function(s) {
                return h('div', {
                  key: s.label,
                  style: { padding: 12, borderRadius: 12, background: '#1e293b', border: '1px solid ' + s.color + '44', textAlign: 'center' }
                },
                  h('div', { style: { fontSize: 20 } }, s.icon),
                  h('div', { style: { fontSize: 18, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                  h('div', { style: { fontSize: 10, color: '#94a3b8' } }, s.label)
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

            // Quick Reflections log
            reflectionLog.length > 0 && h('div', { style: { marginBottom: 16 } },
              h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, '\uD83D\uDCDD Quick Reflections'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                reflectionLog.slice(-6).reverse().map(function(entry, i) {
                  return h('div', {
                    key: i,
                    style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', fontSize: 12, border: '1px solid #334155' }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                      h('span', { style: { padding: '2px 8px', borderRadius: 12, background: ACCENT_DIM, color: ACCENT, fontSize: 10, fontWeight: 600 } }, entry.skill),
                      h('span', { style: { fontSize: 10, color: '#94a3b8', marginLeft: 'auto' } }, entry.activity + ' \u00B7 ' + new Date(entry.timestamp).toLocaleDateString())
                    ),
                    entry.note && h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '"' + entry.note + '"')
                  );
                })
              )
            ),

            // Recent practice log
            practiceLog.length > 0 && h('div', null,
              h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Practice'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                practiceLog.slice(-8).reverse().map(function(entry, i) {
                  var icons = { role_explore: '\uD83D\uDC51', reflection: '\uD83D\uDCDD', challenge: '\uD83C\uDFD7\uFE0F', scenario: '\uD83C\uDFAD', ai_coach: '\u2728', quiz: '\uD83D\uDCCA', contract: '\uD83D\uDCDC', quick_reflection: '\uD83D\uDCDD', comm_style: '\uD83D\uDDE3\uFE0F', virtual_team: '\uD83D\uDCBB', conflict_convert: '\u267B\uFE0F', retro: '\uD83D\uDD04' };
                  var labels = { role_explore: 'Role Explored', reflection: 'Reflection', challenge: 'Challenge', scenario: 'Scenario', ai_coach: 'AI Coach', quiz: 'Skills Quiz', contract: 'Team Contract', quick_reflection: 'Quick Reflection', comm_style: 'Comm Style', virtual_team: 'Virtual Team', conflict_convert: 'Conflict Converted', retro: 'Retrospective' };
                  return h('div', {
                    key: i,
                    style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }
                  },
                    h('span', null, icons[entry.type] || '\uD83D\uDCDD'),
                    h('span', { style: { color: '#e2e8f0', fontWeight: 500 } }, labels[entry.type] || entry.type),
                    h('span', { style: { marginLeft: 'auto', color: '#94a3b8', fontSize: 11 } }, new Date(entry.timestamp).toLocaleString())
                  );
                })
              )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── Final Render ──
        // ══════════════════════════════════════════════════════════
        var content = rolesContent || challengesContent || scenariosContent || commStyleContent || virtualTeamContent || conflictToolContent || retroContent || quizContent || contractContent || progressContent;

        return h('div', { className: 'selh-teamwork', style: { display: 'flex', flexDirection: 'column', height: '100%' } },
          tabBar,
          badgePopup,
          h('div', { style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });

  console.log('[SelHub] sel_tool_teamwork.js loaded');
})();
