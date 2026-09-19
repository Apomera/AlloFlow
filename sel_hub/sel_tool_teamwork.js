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

  // ── Live region (WCAG 4.1.3) ──
  (function() {
    if (document.getElementById('allo-live-teamwork')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-teamwork'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

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
  // Original quiz records below are retained only to interpret earlier saved answers.
  var TEAMWORK_PRACTICE = [
  {
    "id": "sc1",
    "title": "Making room for ideas",
    "situations": {
      "elementary": "A group is planning a class poster. One child keeps starting to speak before others finish. Two children have not shared an idea yet.",
      "middle": "A project group is choosing its topic. One member interrupts and announces a choice before everyone has contributed. Some ideas remain unheard.",
      "high": "A student project coordinator closes a planning discussion before quieter members contribute. The coordinator also controls the shared document, so others cannot add their ideas afterward."
    },
    "check": "We can notice interruptions and who has had a way to contribute. We do not yet know why someone interrupted or whether everyone wants to speak aloud.",
    "routes": [
      {
        "id": "route1",
        "title": "Offer ways to share",
        "helps": "Try spoken turns with a pass option, a written idea or a drawing. This creates more than one way into the discussion.",
        "limits": "A turn is only useful if ideas are considered. Do not require someone to speak or explain why they pass."
      },
      {
        "id": "route2",
        "title": "Ask to pause the decision",
        "helps": "Name the process: \"We have not heard every idea yet. Can we pause before choosing?\"",
        "limits": "A pause alone does not change who has access or influence. Agree on how ideas will be reviewed and how the group will decide."
      },
      {
        "id": "route3",
        "title": "Ask for adult support",
        "helps": "A teacher or facilitator can help reopen the process, restore access and protect participation.",
        "limits": "Students do not have to confront someone first. Tell the adult what happened and ask for a specific change rather than a label for the person."
      }
    ],
    "change": "A member says they would rather add an idea in writing. The group agrees to read it, but then moves on without discussing it.",
    "model": "Ask the group to put every submitted idea into the comparison before deciding. If that is ignored, request a teacher-supported review. Check whether the idea influenced the discussion; receiving a turn is not the same as being heard."
  },
  {
    "id": "sc2",
    "title": "Finding a way to contribute",
    "situations": {
      "elementary": "A group is making a model. One child has been quiet, and the group cannot find their part. The teacher says there is one more work period.",
      "middle": "A group cannot find one member's section in the shared project. The member has been quiet during meetings. The deadline is approaching.",
      "high": "A team sees no contribution from one member in its main document. Participation affects the group assessment, but the team has not checked for offline work or access problems."
    },
    "check": "Quietness does not show how much someone understands or cares. Check what work exists, whether instructions and materials are accessible, and what the person is willing to share.",
    "routes": [
      {
        "id": "route1",
        "title": "Check what is already done",
        "helps": "Ask privately, or through a chosen communication method, whether work is stored elsewhere and what is still needed.",
        "limits": "Do not demand a personal explanation. Offer time to respond; a public spotlight may make participation harder."
      },
      {
        "id": "route2",
        "title": "Offer a workable contribution",
        "helps": "Agree on a clear, manageable part with a choice of format and the resources to do it.",
        "limits": "Offering only leftover or low-status jobs can still exclude someone. Ask which contribution fits and make its purpose clear."
      },
      {
        "id": "route3",
        "title": "Make a plan with the teacher",
        "helps": "A teacher can check access, clarify learning expectations and help the group plan within the time available.",
        "limits": "Seeking help is a valid first step, especially when students cannot solve an access or assessment issue themselves."
      }
    ],
    "change": "The member has useful notes on paper but cannot open the shared file.",
    "model": "Ask how they want their notes included and give accurate credit. Request help with access or an agreed alternative. Check that they can continue contributing; fixing the file should not become a test of willingness."
  },
  {
    "id": "sc3",
    "title": "Choosing a project format",
    "situations": {
      "elementary": "A group can make a poster or a short video. Some children like each idea. They have time to finish only one.",
      "middle": "A group is divided between a poster and a video. Both could meet the assignment, but time and equipment are limited.",
      "high": "A project team must choose a format for an audience presentation. Members disagree about impact, production time and whether everyone can access the editing tools."
    },
    "check": "Separate preferences from requirements: what must the work show, what tools are available, and how can each person participate? Feelings about the choice are relevant information.",
    "routes": [
      {
        "id": "route1",
        "title": "Compare against shared needs",
        "helps": "List the assignment requirements, time, audience and access needs, then compare each format.",
        "limits": "A list does not remove feelings or automatically produce a fair answer. Discuss what matters and whose constraints the comparison misses."
      },
      {
        "id": "route2",
        "title": "Try a small sample",
        "helps": "Make a short sketch or test clip to learn what each format would involve.",
        "limits": "Keep the test small enough to be useful. Do not spend the whole work period preparing two complete versions."
      },
      {
        "id": "route3",
        "title": "Agree on a decision process",
        "helps": "After checking access and requirements, agree to use a vote, a trial or a teacher-supported decision.",
        "limits": "A majority vote cannot remove someone's access needs. Explain how people can raise a concern and when the choice can be reviewed."
      }
    ],
    "change": "The preferred video editor does not work with one member's access tools. A simpler format could meet the learning goal.",
    "model": "Ask the teacher about an accessible alternative and compare it with the poster. Choose a format everyone can use meaningfully. Review whether the work shows the intended learning, not whether everyone initially preferred the format."
  },
  {
    "id": "sc4",
    "title": "Giving accurate credit",
    "situations": {
      "elementary": "During a presentation, a child says \"I made this\" about a part two children made together. The other child wants their work noticed.",
      "middle": "A group presentation credits one person for an idea developed by several members. The slides are about to be shared with the class.",
      "high": "A team submission lists one member as the creator of shared work. The credit may affect assessment and future opportunities, and the public version has not been corrected."
    },
    "check": "Check the actual contributions and what was said or written. An inaccurate credit needs correction even when you cannot know whether it was intentional.",
    "routes": [
      {
        "id": "route1",
        "title": "Make a brief factual correction",
        "helps": "If it feels workable, add: \"Several of us developed that part; here is who contributed.\"",
        "limits": "You may ask someone to support you. Correcting the record publicly is not automatically wrong when the inaccurate credit was public."
      },
      {
        "id": "route2",
        "title": "Request a corrected record",
        "helps": "Ask for the slides, credits or submission to describe contributions accurately.",
        "limits": "Replacing every name with \"we\" can hide specific work. Check how contributors want their work acknowledged."
      },
      {
        "id": "route3",
        "title": "Ask the teacher to help",
        "helps": "Bring the draft or contribution record to a teacher and ask for accurate credit and fair assessment.",
        "limits": "You do not need a private confrontation first. Avoid sharing unrelated messages or personal details as proof."
      }
    ],
    "change": "The group apologizes, but the shared slides still show the wrong credit.",
    "model": "Agree who will correct the shared version and when. Check the actual revision and ask the teacher for help if needed. An apology and an accurate record are separate parts of repair."
  },
  {
    "id": "sc5",
    "title": "Facing an unfinished section",
    "situations": {
      "elementary": "A group project has an unfinished part. The last classroom work time is nearly over. The group is worried it will not be ready.",
      "middle": "A project is due tomorrow and one section is unfinished. The group does not yet know what remains or what support is available. Members have other commitments tonight.",
      "high": "A team is near a deadline with one section incomplete. Members have different work and care commitments, and taking on extra hours may not be possible. The reason for the delay is unclear."
    },
    "check": "Check what is unfinished, what is essential and who has capacity. An unfinished task alone does not establish that someone is lazy or does not care.",
    "routes": [
      {
        "id": "route1",
        "title": "Agree on limited shared help",
        "helps": "Offer a specific piece of help only if people have the time and resources. Agree who will do what.",
        "limits": "No one has to give up sleep or other essential commitments to prove they are a teammate. Do not quietly transfer all the work to one person."
      },
      {
        "id": "route2",
        "title": "Ask to change the deadline or scope",
        "helps": "A teacher can help decide what is essential and whether the deadline, task size or assessment needs adjustment.",
        "limits": "Explain the work remaining and propose a realistic plan. Students should not have to negotiate assessment fairness on their own."
      },
      {
        "id": "route3",
        "title": "Show what is complete",
        "helps": "If more work is not feasible, ask how to submit the finished parts with a factual note about what is still needed.",
        "limits": "Check the assignment expectations with the teacher. Avoid a public blame list or claiming that incomplete work is finished."
      }
    ],
    "change": "The teacher allows a smaller final product if the group identifies the essential learning and reports remaining work honestly.",
    "model": "Choose the essential parts with the teacher, divide only the work people can realistically do, and record what remains. Set a brief check-in during available work time. A smaller honest product can be a responsible plan."
  },
  {
    "id": "sc6",
    "title": "Repairing a message mix-up",
    "situations": {
      "elementary": "A teacher-supported class group reads different instructions and makes two versions of the same part. A message says, \"You did it wrong.\" One child stops joining in.",
      "middle": "A shared document and a group message give different instructions. Two people duplicate work, and a harsh message follows. Some members have not replied.",
      "high": "A remote project team has conflicting instructions in different channels. After a critical message, replies stop. Members have different schedules and access to calls."
    },
    "check": "Check which instructions were current and what the message actually said. A delayed reply does not prove someone is refusing to help. Both unclear instructions and hurtful communication can need attention.",
    "routes": [
      {
        "id": "route1",
        "title": "Write a clear reset",
        "helps": "Create one agreed task list, acknowledge the conflicting instructions and set a realistic time for replies.",
        "limits": "Clear tasks do not repair the harsh message by themselves. Name its impact and ask for respectful communication."
      },
      {
        "id": "route2",
        "title": "Offer a choice of check-in",
        "helps": "Ask whether written replies, a supported conversation or a call would work for the group.",
        "limits": "Video is not automatically better. Do not require cameras, immediate replies or a communication method someone cannot access."
      },
      {
        "id": "route3",
        "title": "Get supported repair",
        "helps": "Ask a teacher or facilitator to help clarify roles and address hurtful messages.",
        "limits": "A student who was targeted does not have to mediate or meet privately with the sender. Support can happen separately."
      }
    ],
    "change": "One member can respond in writing but cannot join a call. Another says they need the harsh message addressed before returning.",
    "model": "Use an agreed written check-in and ask the facilitator to address the message separately. Confirm one task list and a reasonable response window. Check whether people can rejoin with boundaries respected, not merely whether the chat becomes busy."
  },
  {
    "id": "sc7",
    "title": "Recognizing different contributions",
    "situations": {
      "elementary": "A child adds ideas with drawings instead of talking much. Another child says, \"You are not helping because you do not talk.\"",
      "middle": "A teammate contributes written ideas but rarely speaks during fast discussions. Another member says their silence means they are not doing enough.",
      "high": "A team judges participation mainly by speaking time. A member has added useful written ideas, but those contributions are missing from the group's account of the work."
    },
    "check": "Notice the actual work and how the group recognizes it. Do not infer a person's ability, culture, confidence or interest from how much they speak.",
    "routes": [
      {
        "id": "route1",
        "title": "Name the contribution",
        "helps": "Point to the drawing, note or other contribution: \"That helped our plan. Talking is one way to contribute.\"",
        "limits": "Ask before sharing private work. Acknowledgment should lead to considering the idea, not treating it as a token contribution."
      },
      {
        "id": "route2",
        "title": "Change the participation process",
        "helps": "Offer written, drawn and spoken ways to contribute, with time to think and a pass option.",
        "limits": "Do not require a diagnosis or explanation to use a different format. Agree how all formats feed into the decision."
      },
      {
        "id": "route3",
        "title": "Ask for fair recognition",
        "helps": "Ask the teacher to help the group recognize contributions and address the dismissive comment.",
        "limits": "The person excluded should not have to educate the group or reveal personal information to receive support."
      }
    ],
    "change": "The teacher says contributions in different formats can count, but the group still reads only spoken ideas into its plan.",
    "model": "Add time to review written and drawn ideas before deciding, and record how each was considered. Ask the teacher to check participation if exclusion continues. Offering a format is only a start; the contribution needs a real place in the work."
  },
  {
    "id": "sc8",
    "title": "Sharing coordination",
    "situations": {
      "elementary": "A group picked someone to keep track of the plan, but nobody knows what to do next. Two work times have passed without a clear list.",
      "middle": "A group coordinator has canceled meetings and has not shared a task plan. Members are unsure about responsibilities, and the deadline is getting closer.",
      "high": "A project coordinator controls scheduling but repeatedly cancels without an alternative. Other members lack the permissions and information needed to keep the project moving."
    },
    "check": "Check what the coordination role actually included, what tools or support were provided and which decisions need shared access. Do not assume a title came with clear instructions.",
    "routes": [
      {
        "id": "route1",
        "title": "Clarify the next small step",
        "helps": "Ask what is blocked and agree on one immediate task with an owner and a check-in time.",
        "limits": "Clarifying a task is not the same as taking on the whole coordination role. Keep your own capacity visible."
      },
      {
        "id": "route2",
        "title": "Share the coordination tasks",
        "helps": "With the group, divide scheduling, record keeping and resource access instead of assigning everything to one person.",
        "limits": "People need to agree to the roles and have the means to do them. Shared responsibility still needs clear ownership."
      },
      {
        "id": "route3",
        "title": "Ask the teacher to reset the plan",
        "helps": "A teacher can clarify roles, restore access or help change the coordinator when needed.",
        "limits": "Getting help is not going behind someone's back. Be specific about blocked work and the support required, rather than judging the person."
      }
    ],
    "change": "The coordinator says they were never shown how to use the planning tool. The teacher can offer a simple shared checklist.",
    "model": "Use the checklist, agree on a small set of coordination tasks and decide who has access. Ask the teacher to demonstrate the tool. Review whether people can find their next step and whether the workload is manageable."
  },
  {
    "id": "sc9",
    "title": "Reviewing changes together",
    "situations": {
      "elementary": "A child changes another child's part of a poster without asking. The original maker says their idea has disappeared.",
      "middle": "A teammate repeatedly rewrites shared work without discussion. Some edits fix errors, while others change the group's meaning or style.",
      "high": "A team member replaces other contributions shortly before submission. The edits mix factual corrections and personal preferences, and the originals are difficult to recover."
    },
    "check": "Check what changed and why it matters. Quality concerns can be real, and changing another person's work without a process can still remove their voice.",
    "routes": [
      {
        "id": "route1",
        "title": "Pause and compare versions",
        "helps": "Keep or recover earlier work and review the changes together before submission.",
        "limits": "Do not undo a valid factual correction just to restore ownership. Separate evidence of an error from a style preference."
      },
      {
        "id": "route2",
        "title": "Agree on review rules",
        "helps": "Use suggestions or comments and agree which edits need discussion, using the assignment criteria.",
        "limits": "Rules need to be usable under time pressure. Make sure all contributors can access and understand the review process."
      },
      {
        "id": "route3",
        "title": "Get a supported review",
        "helps": "Ask the teacher to help resolve disputed edits or restore access to the work.",
        "limits": "The student whose work was replaced does not have to prove the editor had bad intentions before asking for help."
      }
    ],
    "change": "One edit fixes a calculation error, while another removes a teammate's explanation without changing the facts.",
    "model": "Keep the correction after checking it, and discuss the explanation with its author using the task criteria. Agree who approves the final version. Review both accuracy and whether contributors had a meaningful voice."
  },
  {
    "id": "sc10",
    "title": "Rebalancing the workload",
    "situations": {
      "elementary": "A group split a project into four parts. One part turns out to take much longer. The child doing it asks for help.",
      "middle": "A group divided a project into equal numbers of sections, but one section needs far more time and resources. Its owner feels overwhelmed, and the deadline is in three days.",
      "high": "A team divided the work by section count. Research access and technical demands make one section much larger than expected. Other members also have fixed limits on their time."
    },
    "check": "Compare actual effort, access and complexity instead of only counting sections. Rebalancing should consider everyone's capacity and the support the task requires.",
    "routes": [
      {
        "id": "route1",
        "title": "Make the remaining work visible",
        "helps": "List the smaller tasks, what is blocked and which parts are essential.",
        "limits": "Estimates are for planning, not proving who worked hardest. Do not require someone to disclose private reasons for a limit."
      },
      {
        "id": "route2",
        "title": "Agree on a realistic redistribution",
        "helps": "Ask who can take on a specific task or offer a resource, then update the shared plan.",
        "limits": "Redistribution is not fair if it overloads another person. Keep limits explicit and get agreement before assigning more work."
      },
      {
        "id": "route3",
        "title": "Ask to adjust the assignment",
        "helps": "A teacher can reduce scope, provide resources or review timing when the work exceeds the group's capacity.",
        "limits": "It is appropriate to question task design. Students are not responsible for making an unworkable assignment feasible through extra time outside the agreed work periods."
      }
    ],
    "change": "After listing the work, the group finds that nobody can take on all the remaining tasks within the available time.",
    "model": "Take the task list to the teacher and ask which parts can be reduced or supported. Agree on a revised plan and review actual progress at the next work period. Fairness can require changing the task, not just moving it to another person."
  }
];

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
    { id: 'scenario_pro',      icon: '\uD83C\uDFAF', name: 'Scenario Pro',         desc: 'Earlier quiz: answered the teamwork scenarios' },
    { id: 'ai_coach',          icon: '\u2728',        name: 'AI Team Coach',        desc: 'Get advice from the AI team coach' },
    { id: 'reflective_leader', icon: '\uD83D\uDCDD', name: 'Reflective Leader',    desc: 'Write a team role reflection' },
    { id: 'full_explorer',     icon: '\uD83D\uDE80', name: 'Full Explorer',        desc: 'Visit all 4 tabs' },
    { id: 'teamwork_champion', icon: '\uD83C\uDFC6', name: 'Teamwork Champion',    desc: 'Earn 7 or more badges' },
    { id: 'perfect_scenarios', icon: '\u2B50',        name: 'Perfect Insight',      desc: 'Earlier quiz: received full scenario ratings' },
    { id: 'streak_3',          icon: '\uD83D\uDD25', name: 'Teamwork Streak',      desc: 'Practice 3 days in a row' },
    { id: 'skills_assessor',   icon: '\uD83D\uDCCA', name: 'Skills Assessor',      desc: 'Complete the Team Skills Quiz' },
    { id: 'contract_creator',  icon: '\uD83D\uDCDC', name: 'Contract Creator',     desc: 'Earlier activity: built a team contract' },
    { id: 'challenge_champ',   icon: '\uD83E\uDD47', name: 'Challenge Champion',   desc: 'Complete 5 collaborative challenges' },
    { id: 'all_challenges',    icon: '\uD83C\uDF1F', name: 'All Challenges Done',  desc: 'Complete every challenge in your grade band' },
    { id: 'teamwork_guru',     icon: '\uD83E\uDDD8', name: 'Teamwork Guru',        desc: 'Earn 12 or more badges' },
    { id: 'comm_style',        icon: '\uD83D\uDDE3\uFE0F', name: 'Communication Style', desc: 'Earlier activity: completed the communication questionnaire' },
    { id: 'virtual_team_pro',  icon: '\uD83D\uDCBB', name: 'Virtual Team Pro',    desc: 'Earlier activity: completed the virtual-team quiz' },
    { id: 'conflict_converter', icon: '\u267B\uFE0F', name: 'Conflict Converter',  desc: 'Earlier activity: requested three conflict-coach responses' },
    { id: 'retro_runner',      icon: '\uD83D\uDD04', name: 'Retrospective Runner', desc: 'Earlier activity: completed a team retrospective' },
    { id: 'master_collaborator', icon: '\uD83C\uDF1F', name: 'Master Collaborator', desc: 'Earn 18 or more badges' },
    { id: 'virtual_scenario_1', icon: '\uD83D\uDCF1', name: 'Remote Ready',        desc: 'Earlier activity: answered a virtual-team scenario' },
    { id: 'retro_exporter',    icon: '\uD83D\uDCE4', name: 'Retro Exporter',      desc: 'Earlier activity: exported a retrospective as text' }
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
  // Authored communication planning practice; no personality classification.
  var COMMUNICATION_PLANS = {
  "elementary": [
    {
      "id": "game",
      "title": "Explain a new game",
      "situation": "A child says, \"Take a turn,\" but a new player does not know what to do with the game piece. The group wants everyone to be able to join.",
      "focus": "A clear message tells someone what to do next and gives them a way to ask or show a question. A nod or a smile does not always mean the instructions are clear.",
      "moves": {
        "purpose": "Help the new player understand one turn, rather than explain every rule at once.",
        "message": "\"On your turn, choose a piece and move it one square. I can show you a turn first.\"",
        "access": "Show a short example or use a picture. Ask whether the player wants to move the piece, point or have someone help. Give them time to choose.",
        "check": "Ask, \"Should I show another turn, or would you like to show me what comes next?\" A player can ask again or pass; this is not a test."
      },
      "change": "The player says the picture helped, but they still do not know when their turn begins.",
      "repair": "Keep the picture and add a clear turn signal that the player can notice. Try a practice round together, then ask whether the signal works. Change the explanation rather than blame the player."
    },
    {
      "id": "help",
      "title": "Ask for a clearer instruction",
      "situation": "A classmate says, \"Sort these for our project.\" A child sees many cards but does not know whether to group them by color, shape or something else.",
      "focus": "Asking a question can help the whole group. Someone can need a clearer instruction even if others already understand it.",
      "moves": {
        "purpose": "Find out how the cards should be grouped before doing a lot of work.",
        "message": "\"I am not sure what sort means here. Are we making color groups, shape groups or something else?\"",
        "access": "Point to two cards, draw possible groups or ask a teacher to help with the question. Nobody needs to look at another person's eyes to show they are listening.",
        "check": "Show one possible group and ask, \"Is this the kind of group we need?\" If the answer is different, try one together."
      },
      "change": "The classmate is also unsure. They were repeating an instruction they heard quickly.",
      "repair": "Take two cards to the teacher and ask for a short example of the task. Share that example with the group, then check the first group of cards together. Neither child needs to pretend to know."
    }
  ],
  "middle": [
    {
      "id": "handoff",
      "title": "Make a task handoff clear",
      "situation": "A group message says, \"Finish the slides soon.\" Members do not know which slides they own, what finished means or when the group will review them.",
      "focus": "A useful handoff names the task, resources and a realistic review point. A short message can be clear; a longer message can still leave the important details missing.",
      "moves": {
        "purpose": "Agree on who can do each remaining part and what needs to be ready for the next class.",
        "message": "\"The diagram slide still needs labels. Could someone take that part? We can review a draft at the start of our next science class. Please say if the task or timing does not work.\"",
        "access": "Keep the task list in a place everyone can use, with a paper or other agreed alternative. Confirm that a person accepts a task before assigning it.",
        "check": "Ask members to confirm their own next step in their chosen format. Check whether everyone has the resources and whether the proposed time is workable; no reply is not agreement."
      },
      "change": "A member can work during class but cannot access the slides at home.",
      "repair": "Plan that part for classroom work time or offer an accessible offline option by agreement. Update the task list and review time so the team sees the same plan. Ask the teacher for support if the assignment requires access the team does not have."
    },
    {
      "id": "feedback",
      "title": "Make feedback usable",
      "situation": "A teammate says, \"This poster is confusing.\" The creator does not know which part to change. Both want classmates to understand the project.",
      "focus": "Useful feedback connects a specific observation to the purpose of the work and invites a response. Clear wording does not guarantee agreement, and a concern can be valid even when its delivery needs repair.",
      "moves": {
        "purpose": "Help a reader find the main result without telling the creator their work or ability is bad.",
        "message": "\"I could not tell which label belongs to the blue bar. Could we look at that part together? Would a note on the draft or a short conversation work better?\"",
        "access": "Give feedback in an agreed format and allow time to consider it. The creator may want a written comment, a demonstration or teacher support.",
        "check": "Ask what the creator understood the concern to be, and invite a correction if the feedback missed something. Try the revised label with a willing reader; agreeing with the suggestion is not the only sign of understanding."
      },
      "change": "The creator points out that the key is on another page. The problem is where readers look first, rather than a missing label.",
      "repair": "Acknowledge the correction and revise the feedback: \"The key exists; I did not know where to find it.\" Compare adding a pointer with moving the key, then check whether a reader can find it. Keep the useful observation while changing the proposed fix."
    }
  ],
  "high": [
    {
      "id": "decision",
      "title": "Record a group decision accurately",
      "situation": "A student committee ends a meeting with \"We all agree, then.\" Several members have not spoken, and one has not had time to review the proposal. The notes will guide the next stage of work.",
      "focus": "Shared understanding, agreement and permission are different things. A person can understand a proposal and disagree with it; silence alone establishes none of these.",
      "moves": {
        "purpose": "Record what is actually decided, what remains open and how people can raise unresolved concerns.",
        "message": "\"Before we record agreement, here is the proposal and what it changes. Please mark support, concern or needing more information in the shared notes, or respond through the adviser. Can everyone use that process by the agreed review time?\"",
        "access": "Provide the proposal in an accessible format and agree on a realistic response window. Offer a private supported route when power differences make public disagreement difficult.",
        "check": "Ask someone to summarize the decision in their own chosen format and invite corrections. Separately confirm positions and permissions. Do not treat a majority vote as consent to share a person's information or ignore an access need."
      },
      "change": "One member understands the proposal but needs more information about a cost before taking a position.",
      "repair": "Record the question as unresolved, identify who will obtain the information and set a new review point. Clarify which limited steps, if any, are already authorized. Do not rewrite \"needs information\" as either support or opposition."
    },
    {
      "id": "concern",
      "title": "Raise a concern with support",
      "situation": "A student notices that an event notice leaves out an accessible entrance. The student coordinator says the notice is already approved and asks everyone to stop making changes.",
      "focus": "Directness, politeness and communication format do not tell you whether a concern is valid. A clear request may help, but the person raising an access concern should not have to manage resistance alone.",
      "moves": {
        "purpose": "Get accurate entrance information into the notice before people use it, while identifying who can authorize the correction.",
        "message": "\"The notice lists one entrance but leaves out the accessible entrance. Who can approve a correction before it is shared? I would like the adviser to help us confirm the details.\"",
        "access": "Choose a written request, an accompanied conversation or direct adviser support. Do not require the student to disclose a disability or confront the coordinator privately.",
        "check": "Ask the responsible adult to confirm the correct information and review the actual revised notice. A friendly reply is not evidence that the correction has been made."
      },
      "change": "The coordinator agrees to add a link, but the entrance information behind it is out of date.",
      "repair": "Ask the responsible adult to verify the current entrance details and make the notice usable without relying on the outdated page. Review the correction before circulation. The communication plan now needs an information check as well as an agreed action."
    }
  ]
};

  // Original questionnaire definitions retained for earlier project records.
  
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
  // Authored remote collaboration practice. Original quiz records follow for compatibility.
  var CONFLICT_PRACTICE = [
  {
    "id": "ideas",
    "title": "Different ideas for the same task",
    "supportFirst": false,
    "setups": {
      "elementary": "Two children want different designs for a class model. Both want to share their ideas, but they keep interrupting.",
      "middle": "A team is split between a video and a live presentation. Members have different reasons, but they have not checked the task requirements together.",
      "high": "A project group disagrees about its final format. Some want a polished video; others want a format that can be completed and accessed with the available time and equipment."
    },
    "notice": "A different preference is not proof of bad intent. Ask about the goal and constraints rather than guessing motives. A conversation is an option only when people can take part voluntarily and question the plan.",
    "talk": "If everyone is willing, compare the formats against the task goal, time and access needs. Try: \"Can we each explain one reason, then check which options meet the task?\" Combining ideas is an option, not an obligation.",
    "pause": "Pause the discussion and agree, where workable, when and how to return with the requirements in view. Ask a facilitator for help if interruptions continue. A pause needs a next step; it is not a way to dismiss a concern.",
    "support": "Ask the teacher to clarify the task constraints and help everyone contribute. Support can be requested before anyone has tried to settle the disagreement alone.",
    "change": "The group learns that only one shared device is available and it cannot be taken home.",
    "adjust": "Reconsider the options using the actual access constraint. Ask about in-class equipment or a different format. Do not treat the person naming the barrier as uncooperative."
  },
  {
    "id": "workload",
    "title": "Work is missing and the reasons are unclear",
    "supportFirst": false,
    "setups": {
      "elementary": "A part of the group poster is unfinished. One child says, \"You did not help.\" The group has not checked whether everyone had the needed materials.",
      "middle": "A teammate has not added their section to a shared report. Others want to reassign everything, but nobody has checked the instructions, file access or time available.",
      "high": "A deadline is approaching and two sections are missing. Some members assume a lack of effort, while others say the handoff and success criteria were unclear."
    },
    "notice": "Separate a missing contribution from an explanation for it. Workload, instructions, access and choices may all matter. Ask what is needed without demanding a personal disclosure, and name the impact of the missing work.",
    "talk": "If it is safe and voluntary, ask a specific question: \"The section is still missing. What is blocking it, and what is a feasible next step?\" Discuss time and support before agreeing on a new task or deadline.",
    "pause": "If people are too frustrated to listen, pause the discussion and ask for a supported check-in. Make sure urgent work is noticed without automatically handing it to the most available teammate.",
    "support": "Ask the responsible adult to help clarify expectations, resources and workload. They can help address repeated problems or decisions about credit; peers should not invent grade penalties.",
    "change": "The missing files become accessible, but there is not enough time for the original scope.",
    "adjust": "Agree on a realistic scope or revised timeline with the responsible adult. Restoring access addresses one barrier; it does not create extra time or make one teammate responsible for every unfinished part."
  },
  {
    "id": "pressure",
    "title": "Repeated pressure and exclusion",
    "supportFirst": true,
    "setups": {
      "elementary": "A child is repeatedly told they cannot join unless they do another child's work. They are worried about saying no.",
      "middle": "A student is repeatedly excluded from group decisions and told they must do extra work to be included. They worry that objecting will make things worse.",
      "high": "A teammate uses control over the group chat and a threat of rumors to demand extra work. The targeted student does not feel able to refuse safely."
    },
    "notice": "Repeated pressure, threats and unequal power require support. This example is not a mutual disagreement to solve by compromise. The person affected does not have to confront the other person or prove a label before asking for help.",
    "talk": "",
    "pause": "Step away from the interaction if that is possible and seek adult support. A pause alone does not address repeated pressure; ask for a plan that protects participation and avoids leaving the person affected to manage it alone.",
    "support": "Tell a trusted adult what was said or done and what help is needed now. Try: \"I am being pressured to do extra work to be included, and I am worried about what happens if I say no. Can you help me plan the next step?\" Ask who will know and what happens next; do not rely on a promise of secrecy.",
    "change": "The first adult minimizes the concern and says the students should work it out together.",
    "adjust": "Try another trusted adult or the school's established support route, with help from a caregiver if useful. Describe the repeated behavior and the concern about retaliation. A joint meeting, apology or forgiveness is not a required first step."
  }
];

  var AGREEMENT_EXAMPLES = [
  {
    "id": "respect",
    "title": "Make respect observable",
    "setups": {
      "elementary": "A group says, \"Be respectful.\" One child thinks this means being quiet. Another wants to disagree with an idea.",
      "middle": "A project group writes, \"Respect every idea.\" Members disagree about whether asking questions counts as criticism.",
      "high": "A team proposes, \"Stay positive and respect every idea.\" A member worries that this could prevent honest disagreement about the plan."
    },
    "initial": "Be respectful and stay positive.",
    "problem": "A shared word can mean different things. Requiring positivity can silence concerns; agreement should not depend on a particular facial expression, tone or amount of speech.",
    "proposal": "Discuss the idea without insulting a person. Ask what the idea is trying to achieve, then give a specific reason for keeping or changing it. Offer written, spoken or supported ways to contribute. A concern can be raised without first giving praise.",
    "test": "Someone offers a written concern after the discussion has moved on.",
    "revision": "Agree on a workable window for written input and how to reopen a decision when new information matters. A turn to speak is useful only if the group considers the contribution."
  },
  {
    "id": "timing",
    "title": "Make timing workable",
    "setups": {
      "elementary": "A group wants everyone to finish a drawing at home. One child can only use the materials at school.",
      "middle": "A team proposes replying to every group message the same evening. Members have different schedules and access to devices.",
      "high": "A team proposes daily evening updates with penalties for late replies. Some members rely on school devices or cannot reliably join after-school discussions."
    },
    "initial": "Everyone must reply the same evening.",
    "problem": "A uniform deadline can hide different access and responsibilities. Ask what timing is workable without requiring personal explanations. Faster replies are not proof of greater commitment.",
    "proposal": "Use the agreed class workspace and check it during the next available class period. Identify what needs a reply and what can wait. Provide an accessible alternative through the teacher if the channel is unavailable. Confirm the timing with the group before treating it as an agreement.",
    "test": "The platform stops working just before the agreed check-in.",
    "revision": "Use the planned alternative and reset the timeline with support. Check access before attributing a missing reply to effort. Keep a clear next step and ownership; an access barrier should not trigger a peer penalty."
  },
  {
    "id": "repair",
    "title": "Plan support when work gets stuck",
    "setups": {
      "elementary": "A group says anyone who forgets materials cannot help with the next activity. A child forgot the shared supplies.",
      "middle": "A group wants to remove a teammate after a missed task. The instructions were unclear, and the teammate did not know how to ask for help.",
      "high": "A team proposes escalating penalties for missed contributions, including deciding who deserves credit. Some expectations and support routes have not been discussed."
    },
    "initial": "Miss a task and lose your place in the group.",
    "problem": "Accountability needs clear expectations, impact and a supported next step. Peers should not invent grade penalties or force someone into a public explanation. Support can coexist with boundaries.",
    "proposal": "Check what was expected, what happened and what support is needed. Agree on a feasible next step with the people involved and a review time. Ask the responsible adult to address repeated problems, allocation of work or credit; do not make one teammate carry all the repair.",
    "test": "A teammate reports repeated intimidation and does not feel safe discussing it with the group.",
    "revision": "Use a trusted adult or another established support route now. A private peer talk or group meeting is not a required first step. Protect participation and boundaries while the adult addresses the concern; do not promise secrecy or guaranteed cooperation."
  }
];

  var RETRO_PRACTICE = [
  {
    "id": "turns",
    "title": "More voices, but whose ideas counted?",
    "setups": {
      "elementary": "A group made a poster. Everyone got a turn to talk, but the poster used only the first idea. One child says, \"I had a turn, but we did not try my idea.\"",
      "middle": "A group used timed turns to plan a presentation. Everyone spoke, but the final plan kept only the first proposal. A teammate says the turns felt fair; another says their contribution made no difference.",
      "high": "A project team introduced equal speaking turns. Attendance and speaking counts improved, but the final decisions still came from the same two members. Some members value the new structure; others question whose ideas shape the work."
    },
    "notice": "Speaking counts show opportunities to speak, not whether ideas were considered. Both accounts may describe part of the experience. Ask about the decision process without guessing motives.",
    "plan": "Keep an accessible way to offer ideas. Before deciding, compare the proposals against shared project goals and record why an idea is used, combined or set aside. Ask a facilitator to help invite written or spoken feedback; no one has to disclose a personal reason for their format.",
    "later": "At the next meeting, three proposals were compared and combined. One teammate still says the reasons for the decision were hard to follow.",
    "adjust": "The process changed, but it did not work equally well for everyone. Keep the comparison and add a short, accessible explanation of the decision. Ask whether that explanation addresses the concern; more contributions alone do not settle the question."
  },
  {
    "id": "deadline",
    "title": "Finished on time, at whose cost?",
    "setups": {
      "elementary": "The group finished a model before class ended. One child did most of the building while the others waited for materials. The group says finishing early means the plan worked.",
      "middle": "The group handed in a report on time. One teammate stayed late to redo sections because the instructions and shared files were unclear. Others thought everything was going well until the final day.",
      "high": "A team met its deadline after one member quietly took over unfinished work. Access to files and expectations for a finished section were uneven. The result looks successful, but the workload and learning opportunities were not shared."
    },
    "notice": "Meeting a deadline is one outcome. It does not show who could participate, whose time was used or what support was missing. Describe the work and conditions rather than labeling someone lazy or heroic.",
    "plan": "Try a small shared checkpoint before the deadline. Make the materials and success criteria usable, ask each person what is feasible and agree who will arrange support if work is blocked. Redistributing tasks needs discussion; the most available teammate is not automatically responsible.",
    "later": "The checkpoint revealed a missing file early. After access was fixed, two members completed their parts, but the final editor still had more work than expected.",
    "adjust": "Earlier access helped with one barrier. Editing time still needs a realistic allocation and support. Discuss a smaller scope or shared editing with the teacher rather than assuming one person should work longer. Review both the result and the workload next time."
  },
  {
    "id": "quiet",
    "title": "A quiet review is not automatic agreement",
    "setups": {
      "elementary": "After a game, an adult asks what the group could change. Nobody answers. Later, one child draws a picture showing that they could not reach the materials.",
      "middle": "At the end of a group task, nobody names a problem aloud. Later, an anonymous note says the shared materials were hard to use. The group is unsure whether the silence meant agreement.",
      "high": "A team reviews an activity in front of its group leader. No one raises a concern. Later, written feedback describes an access barrier and worry about being seen as difficult."
    },
    "notice": "Silence can have several explanations; it is not evidence of agreement or safety. A missing viewpoint remains unknown. A private route should not promise anonymity or secrecy that the setting cannot provide.",
    "plan": "Offer time and more than one way to reflect, including a private conversation with a trusted adult. Explain who can read any written feedback and how it will be used. Check the reported access barrier without asking a student to identify themselves publicly or prove discomfort.",
    "later": "An adult checks the materials and arranges another usable format. More feedback arrives, but one student still does not want to discuss their experience with the group.",
    "adjust": "Act on the access issue and respect the boundary. Check whether the new format works through an agreed route. Increased feedback does not prove everyone feels safe, and a group retrospective should not be used to make someone discuss repeated harm with the person involved."
  }
];

  var VIRTUAL_TEAM_PRACTICE = [
  {
    "id": "vt1",
    "title": "Clarify a short message",
    "setups": {
      "elementary": "In a teacher-supported project, a child writes, \"That part needs work.\" Another child replies, \"Fine.\" The group does not know what that reply means.",
      "middle": "A teammate receives \"That section needs work\" in the group chat and replies \"Fine.\" They have not sent another message. The group needs to clarify the feedback.",
      "high": "A remote project team exchanges brief comments on a draft. After an unclear criticism and a one-word reply, members disagree about whether there is a conflict or simply a pause in responses."
    },
    "notice": "A short reply or silence does not tell you someone's feelings or intentions. The original feedback is vague. Clarify the actual issue and offer a workable way to respond without demanding an explanation for a delayed reply.",
    "routes": [
      {
        "id": "plan1",
        "title": "Clarify in writing",
        "helps": "Name the specific issue: \"I meant the chart label is hard to read. Would a note on the draft help?\" Invite correction and allow an agreed time to reply.",
        "limits": "Adding emojis or saying \"just a suggestion\" does not repair hurtful wording by itself. If the message caused harm, acknowledge that as well as clarifying the task."
      },
      {
        "id": "plan2",
        "title": "Offer a supported conversation",
        "helps": "Ask whether an audio conversation, a teacher-supported discussion or another method would help. Keep a brief agreed record of the next step.",
        "limits": "A call is an option, not an upgrade everyone can use. Check timing, access and willingness; cameras and immediate responses are not required to prove care."
      }
    ],
    "change": "The teammate says they prefer written comments and need until the next class to review the draft.",
    "model": "Respect that format and timing. Leave one specific comment and agree to check it during class. If the wording was hurtful, acknowledge it without requiring a call. Review whether the feedback is now usable rather than counting message speed."
  },
  {
    "id": "vt2",
    "title": "Coordinate different schedules",
    "setups": {
      "elementary": "Two classes are sharing a project online. Their teachers have different class times, so the children cannot all meet at once.",
      "middle": "A group suggests evening meetings, but some members have family commitments or no device then. The team needs everyone's input before choosing a final idea.",
      "high": "A student partnership spans different time zones and work schedules. The proposed meeting time repeatedly falls outside one member's available hours. Decisions are being made before they can respond."
    },
    "notice": "Begin with the decision and the available times, not an attendance judgment. A fair process may use shared updates instead of a meeting. Rotating an impossible time does not make it possible for everyone.",
    "routes": [
      {
        "id": "plan1",
        "title": "Use shared updates with a response window",
        "helps": "Put the proposal and open questions in an accessible shared place. Agree when input is needed and how absent members can contribute before a decision.",
        "limits": "A shared document is useful only if everyone can access it and their input is considered. Name dates and time zones when relevant; do not interpret missing replies as agreement."
      },
      {
        "id": "plan2",
        "title": "Use a brief meeting where it is workable",
        "helps": "If a live discussion helps, choose a mutually workable time, share the agenda early and provide another route for input. A teacher can coordinate the schedule.",
        "limits": "Do not require missed sleep or private explanations of availability. A written recap may be enough; joining a meeting does not mean agreeing to be recorded."
      }
    ],
    "change": "There is no time when all members can meet, but everyone can respond during their own class period before the agreed review point.",
    "model": "Use the proposal and question list during each class period. Assign someone to gather responses and a teacher to help resolve missing access or timing. Confirm the decision after that window and share an accessible recap; no recording or live attendance is needed for this plan."
  },
  {
    "id": "vt3",
    "title": "Participate without showing a camera",
    "setups": {
      "elementary": "During a teacher-led online activity, a child keeps the camera off and shares an answer another way. A classmate says a camera must be on to count.",
      "middle": "A group wants to make cameras mandatory for a project discussion. Some members prefer not to show their room or face, and others have unreliable connections.",
      "high": "A project team is preparing a presentation. Members want evidence of participation, but their proposed camera rule would expose private spaces and exclude people with limited bandwidth."
    },
    "notice": "Camera use is not a reliable measure of attention, effort or trust. Ask what the activity actually needs and how each person can contribute without having to disclose why a camera is off.",
    "routes": [
      {
        "id": "plan1",
        "title": "Agree on several participation methods",
        "helps": "Offer audio, chat, an accessible shared document or a contribution before or after the meeting. Decide how each contribution will enter the work.",
        "limits": "An alternative is not meaningful if it is ignored or assessed as less valuable. Confirm that people can access it and get a response."
      },
      {
        "id": "plan2",
        "title": "Plan a task-specific alternative with the teacher",
        "helps": "If the task needs a demonstration, ask what must be shown and whether a diagram, object-only view, prerecorded work by agreement or a supported demonstration can meet the goal.",
        "limits": "Do not turn an exception into a demand for personal disclosure. Before any recording, agree with the responsible adult what is captured, who can use it and whether a non-recorded option works."
      }
    ],
    "change": "The live connection keeps dropping, but a member can contribute a diagram and written explanation through the class platform.",
    "model": "Use the diagram and explanation as part of the group's actual work and give accurate credit. Check that teammates understand it and can ask follow-up questions during an agreed window. Keep the camera off; the learning goal is the contribution, not proof of presence."
  },
  {
    "id": "vt4",
    "title": "Make online turns usable",
    "setups": {
      "elementary": "During a class call, two children speak at once and a drawing shared in the chat is missed. The teacher wants every idea to have a way into the plan.",
      "middle": "A group call has interruptions, connection delays and overlooked chat messages. A member who uses more time to form a response keeps losing their turn.",
      "high": "A remote team uses a fast speaking queue and a strict timer. Chat contributions are not reviewed, and someone using a communication aid cannot finish within the same short limit."
    },
    "notice": "Speaking queues and timers do not automatically make participation fair. Connection delay, response time, communication aids and access to chat can change what a useful turn looks like.",
    "routes": [
      {
        "id": "plan1",
        "title": "Use a flexible facilitated discussion",
        "helps": "Ask a facilitator to pause for responses, watch the queue and offer a pass or a later turn. Agree on flexible time based on what contributors need.",
        "limits": "Do not spotlight a person who has not spoken or require a public explanation. The facilitator may need teacher support and should not carry every coordination task alone."
      },
      {
        "id": "plan2",
        "title": "Gather ideas before deciding",
        "helps": "Invite ideas in a shared accessible format before or after the call. Assign someone to bring those ideas into the decision and check what was missed.",
        "limits": "Written, drawn or recorded input needs time and a real response. Multiple channels can create extra work, so agree which record the team will use."
      }
    ],
    "change": "A teammate says the queue helps, but their written ideas still do not appear in the final plan.",
    "model": "Pause the decision and review the submitted ideas with the group. Ask the contributor how they want their idea represented and record what changed. Check influence and access, not equal minutes of speaking; involve the teacher if exclusion continues."
  },
  {
    "id": "vt5",
    "title": "Build trust without forced sharing",
    "setups": {
      "elementary": "A class group finishes online tasks together. One child enjoys games before the work, while another wants to skip personal questions and still be part of the group.",
      "middle": "A team plans a virtual hangout to feel more connected. Some members cannot attend extra sessions or do not want to share personal stories. They still want to collaborate.",
      "high": "A remote student team treats frequent informal messages and personal check-ins as signs of commitment. Members with limited time or different boundaries worry that their actual work is being overlooked."
    },
    "notice": "Trust can grow through clear commitments, follow-through, fair credit and repair. Social activities can help some people connect, but attendance, personal disclosure and constant availability are not tests of belonging.",
    "routes": [
      {
        "id": "plan1",
        "title": "Make the work dependable",
        "helps": "Agree on manageable tasks, response expectations and what to do when plans change. Acknowledge contributions and correct mistakes or missed commitments.",
        "limits": "Reliable does not mean always available or never needing help. Check whether the workload and tools are realistic before interpreting a missed update."
      },
      {
        "id": "plan2",
        "title": "Offer genuinely optional connection",
        "helps": "Invite a short game, shared interest or low-pressure check-in with a pass option and no expectation of personal details.",
        "limits": "Skipping must not cost someone information, roles or belonging. Keep important project decisions in the agreed work channel, not in the optional hangout."
      }
    ],
    "change": "A member skips the social check-in and then finds that the group assigned roles and changed the deadline during it.",
    "model": "Move the decisions back into the agreed work process, give everyone time to respond and correct any unfair assignment. Make the hangout optional in practice as well as in name. Check whether members can participate fully without sharing personal information."
  }
];

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
      // ── Host theme remap (INVERSE: dark-base) — dark = identity, +light/high-contrast ──
      var _teaT = (ctx && ctx.theme) || {};
      var _teaHC = !!_teaT.isContrast, _teaL = !_teaHC && !_teaT.isDark;
      var _tea_BGL = {'#0f172a':'#f8fafc','#1e293b':'#ffffff','#334155':'#e2e8f0'}, _tea_BGH = {'#0f172a':'#000000','#1e293b':'#000000','#334155':'#000000','#b45309':'#000000','#3b82f6':'#000000'};
      var _tea_FGL = {'#94a3b8':'#64748b','#e2e8f0':'#1e293b','#cbd5e1':'#334155','#f1f5f9':'#0f172a','#818cf8':'#4338ca','#a78bfa':'#6d28d9'}, _tea_FGH = {'#94a3b8':'#ffff00','#e2e8f0':'#ffff00','#0f172a':'#ffff00','#cbd5e1':'#ffff00','#f1f5f9':'#ffff00','#fff':'#ffff00','#818cf8':'#ffff00','#8b5cf6':'#ffff00','#f59e0b':'#ffff00','#ef4444':'#ffff00','#22c55e':'#ffff00','#3b82f6':'#ffff00','#475569':'#ffff00','#facc15':'#ffff00','#06b6d4':'#ffff00','#a78bfa':'#ffff00','#ec4899':'#ffff00','#22d3ee':'#ffff00'};
      var _tea_BDL = {'#334155':'#e2e8f0'}, _tea_BDH = {'#334155':'#ffff00'};
      var _teaBg = function(h){ return _teaHC ? (_tea_BGH[h]||h) : (_teaL ? (_tea_BGL[h]||h) : h); };
      var _teaFg = function(h){ return _teaHC ? (_tea_FGH[h]||h) : (_teaL ? (_tea_FGL[h]||h) : h); };
      var _teaBd = function(h){ return _teaHC ? (_tea_BDH[h]||h) : (_teaL ? (_tea_BDL[h]||h) : h); };
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
        var selectedRoles = (Array.isArray(d.selectedRoles) ? d.selectedRoles : []);
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
        var scenarioAnswers = d.scenarioAnswers && typeof d.scenarioAnswers === 'object' && !Array.isArray(d.scenarioAnswers) ? d.scenarioAnswers : {};
        var scenarioRevealed = d.scenarioRevealed || {};

        // AI Coach state
        var coachPrompt   = d.coachPrompt || '';
        var coachResponse = d.coachResponse || null;
        var coachLoading  = d.coachLoading || false;

        // Skills Quiz state
        var quizRatings    = d.quizRatings || {};
        var quizSubmitted  = d.quizSubmitted || false;

        // Team Contract state
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
        var vtAnswers         = d.vtAnswers && typeof d.vtAnswers === 'object' && !Array.isArray(d.vtAnswers) ? d.vtAnswers : {};
        var vtRevealed        = d.vtRevealed || {};

        // Conflict-to-Collaboration state
        var conflictCount     = d.conflictCount || 0;

        // Retrospective state
        var retroSaved        = d.retroSaved || false;

        // Practice log & badges
        var practiceLog    = d.practiceLog || [];
        var earnedBadges   = d.earnedBadges || {};
        var showBadgePopup = d.showBadgePopup || null;
        // Hand focus back where it came from when the badge dialog closes. Without
        // this the dialog just unmounts and focus falls to the body, dropping a
        // keyboard user at the top of the page instead of where they were working.
        var badgeDialogRef = React.useRef(null);
        var badgeOpenerRef = React.useRef(null);
        var badgeDialogOpen = !!showBadgePopup;
        React.useEffect(function() {
          if (!badgeDialogOpen) return undefined;
          // Captured BEFORE focus moves. autoFocus would defeat this: it runs during
          // commit, so the "opener" would come out as the dialog's own button.
          var opener = document.activeElement;
          if (opener && typeof opener.focus === 'function') badgeOpenerRef.current = opener;
          var focusTimer = setTimeout(function() {
            var dlg = badgeDialogRef.current;
            if (!dlg) return;
            var first = dlg.querySelector('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
            if (first) first.focus(); else dlg.focus();
          }, 0);
          return function() {
            clearTimeout(focusTimer);
            var previous = badgeOpenerRef.current;
            badgeOpenerRef.current = null;
            // isConnected guards the case where the opener itself went away.
            if (previous && previous.isConnected !== false && typeof previous.focus === 'function') {
              setTimeout(function() { previous.focus(); }, 0);
            }
          };
        }, [badgeDialogOpen]);
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
            if (announceToSR) announceToSR('Badge earned: ' + badge.name);
            awardXP(25);
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
            stars.push(h('span', { key: i, style: { color: i <= rating ? _teaFg('#facc15') : _teaBg('#334155'), fontSize: 18 } }, '\u2B50'));
          }
          return h('span', null, stars);
        }

        // ── Quick Reflection Prompt (reusable) ──
        function renderQuickReflection(activityType) {
          return h('div', { style: { marginTop: 16, padding: 14, borderRadius: 12, background: _teaBg('#0f172a'), border: '1px solid #334155' } },
          h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),
            h('div', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 8 } }, '\uD83D\uDCDD Quick Reflection'),
            h('div', { style: { fontSize: 12, color: _teaFg('#94a3b8'), marginBottom: 8 } }, 'What teamwork skill did you practice?'),
            h('select', {
              value: reflectionSkill,
              'aria-label': 'Teamwork skill practiced',
              onChange: function(e) { upd('reflectionSkill', e.target.value); },
              style: { width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: _teaBg('#1e293b'), color: _teaFg('#e2e8f0'), fontSize: 12, marginBottom: 8 }
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
              style: { width: '100%', padding: 8, borderRadius: 8, border: '1px solid #334155', background: _teaBg('#1e293b'), color: _teaFg('#e2e8f0'), fontSize: 12, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
            }),
            h('button', { 'aria-label': 'Save teamwork reflection',
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
              style: { padding: '6px 14px', borderRadius: 8, border: 'none', background: ACCENT, color: _teaFg('#0f172a'), fontWeight: 600, fontSize: 11, cursor: 'pointer' }
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
          { id: 'commstyle',   label: '\uD83D\uDDE3\uFE0F Communication Plan' },
          { id: 'virtualteam', label: '\uD83D\uDCBB Virtual Team' },
          { id: 'conflicttool', label: '\u267B\uFE0F Conflict Plan' },
          { id: 'retro',       label: '\uD83D\uDD04 Retro' },
          { id: 'quiz',        label: '\uD83D\uDCCA Quiz' },
          { id: 'contract',    label: '\uD83D\uDCDC Contract' },
          { id: 'progress',    label: '\uD83D\uDCC8 Progress' }
        ];

        var selectTeamworkTab = function(nextTab) {
          var next = tabs.find(function(item) { return item.id === nextTab; });
          if (!next) return;
          upd('activeTab', next.id);
          trackTab(next.id);
          if (soundEnabled) sfxClick();
          if (announceToSR) announceToSR(next.label + ' tab selected');
        };

        var tabBar = h('div', {
          style: { display: 'flex', alignItems: 'center', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'hidden' }
        },
          h('div', { role: 'tablist', 'aria-label': 'Teamwork & Collaboration tabs',
            style: { display: 'flex', flex: 1, gap: 2, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
          },
          tabs.map(function(t) {
            var isActive = activeTab === t.id;
            return h('button', { 'aria-label': t.label,
              key: t.id,
              id: 'teamwork-tab-' + t.id,
              'data-teamwork-tab': t.id,
              onClick: function() { selectTeamworkTab(t.id); },
              onKeyDown: function(e) {
                if (e.key !== 'ArrowRight' && e.key !== 'ArrowDown' && e.key !== 'ArrowLeft' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return;
                e.preventDefault();
                var currentIdx = tabs.findIndex(function(item) { return item.id === t.id; });
                var nextIdx;
                if (e.key === 'Home') nextIdx = 0;
                else if (e.key === 'End') nextIdx = tabs.length - 1;
                else nextIdx = (currentIdx + ((e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1) + tabs.length) % tabs.length;
                var nextTab = tabs[nextIdx];
                selectTeamworkTab(nextTab.id);
                var nextButton = e.currentTarget && e.currentTarget.parentNode && e.currentTarget.parentNode.querySelector ? e.currentTarget.parentNode.querySelector('[data-teamwork-tab="' + nextTab.id + '"]') : null;
                if (nextButton && nextButton.focus) nextButton.focus();
              },
              'aria-selected': isActive,
              'aria-controls': 'teamwork-tab-panel',
              'tabIndex': isActive ? 0 : -1,
              role: 'tab',
              style: {
                padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
                background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : _teaFg('#94a3b8'),
                transition: 'all 0.15s'
              }
            }, t.label);
          })
          ),
          // Sound toggle
          h('button', { 'aria-label': 'Sound effects', 'aria-pressed': !!soundEnabled,
            onClick: function() { upd('soundEnabled', !soundEnabled); },
            style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: _teaFg('#94a3b8') },
            title: soundEnabled ? 'Mute sounds' : 'Enable sounds'
          }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
          // Badge counter
          h('button', { 'aria-label': Object.keys(earnedBadges).length + '/' + BADGES.length + ' badges earned', 'aria-expanded': !!showBadgesPanel,
            onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
            style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: _teaFg('#94a3b8'), position: 'relative' }
          },
            '\uD83C\uDFC5',
            Object.keys(earnedBadges).length > 0 && h('span', {
              style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: _teaFg('#0f172a'), borderRadius: '50%', width: 14, height: 14, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }
            }, Object.keys(earnedBadges).length)
          )
        );

        // ── Topic-accent hero band per tab ──
        var heroBand = (function() {
          var TAB_META = {
            roles:        { accent: '#fbbf24', soft: 'rgba(251,191,36,0.14)', icon: '\uD83D\uDC51', title: 'Roles \u2014 Belbin\u2019s 9 team archetypes',                  hint: 'Belbin 1981: Plant, Resource Investigator, Coordinator, Shaper, Monitor Evaluator, Teamworker, Implementer, Completer Finisher, Specialist. Balanced teams beat all-stars; complementary roles outperform homogeneous talent.' },
            challenges:   { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', icon: '\uD83C\uDFD7', title: 'Challenges \u2014 the 5 dysfunctions',                       hint: 'Lencioni 2002: absence of trust \u2192 fear of conflict \u2192 lack of commitment \u2192 avoidance of accountability \u2192 inattention to results. Each layer rests on the one below; teams fail bottom-up.' },
            scenarios:    { accent: '#9333ea', soft: 'rgba(147,51,234,0.14)', icon: '\uD83C\uDFAD', title: 'Scenarios — rehearse a supported response', hint: 'Notice what happened, compare possible routes and plan a workable next step. Consider access, boundaries and shared responsibility; asking for help is part of teamwork.' },
            commstyle:    { accent: '#10b981', soft: 'rgba(16,185,129,0.14)', icon: '\uD83D\uDDE3', title: 'Communication Plan — choose what fits this situation', hint: 'Clarify the purpose, make the message usable, allow different ways to respond and check understanding. Adapt the plan when the conditions change.' },
            virtualteam:  { accent: '#0891b2', soft: 'rgba(8,145,178,0.14)', icon: '\uD83D\uDCBB', title: 'Virtual Team — agree on workable participation', hint: 'Plan for access, privacy and different schedules. Compare communication options and check that contributions reach the work; camera use and reply speed do not prove commitment.' },
            conflicttool: { accent: '#dc2626', soft: 'rgba(220,38,38,0.14)', icon: '\u267B', title: 'Conflict planning — choose the support needed', hint: 'Check what happened, what remains uncertain and whether a voluntary conversation is appropriate. Repeated pressure and harm call for support, not an obligation to compromise.' },
            retro:        { accent: '#a855f7', soft: 'rgba(168,85,247,0.14)', icon: '\uD83D\uDD04', title: 'Retrospective — learn from the group process', hint: 'Look at what happened, hear different experiences, plan one supported change and check what happens next. Finishing a task or writing a plan does not show that the process worked for everyone.' },
            quiz:         { accent: '#16a34a', soft: 'rgba(22,163,74,0.14)',  icon: '\uD83D\uDCCA', title: 'Quiz \u2014 self-knowledge check',                          hint: 'When are you the team accelerator? When are you the bottleneck? Both are normal. Pattern recognition turns reactive collaboration into deliberate. The quiz is a mirror, not a verdict.' },
            contract:     { accent: '#d97706', soft: 'rgba(217,119,6,0.14)', icon: '\uD83D\uDCDC', title: 'Agreement — a proposal the team can shape', hint: 'Clarify what people will do, what makes participation workable and how to ask for support or revision. A written draft or signature does not establish shared understanding or consent.' },
            progress:     { accent: '#ea580c', soft: 'rgba(234,88,12,0.14)',  icon: '\uD83D\uDCC8', title: 'Progress \u2014 team-skill growth over time',              hint: 'Track which collaboration skills you\u2019ve flexed. Progress is invisible without measurement. Show the chart to your team \u2014 vulnerability about growth predicts trust (Brown 2018).' }
          };
          var meta = TAB_META[activeTab] || TAB_META.roles;
          return h('div', {
            style: {
              margin: '8px 12px 12px',
              padding: '12px 14px',
              borderRadius: 12,
              background: 'linear-gradient(135deg, ' + meta.soft + ' 0%, rgba(15,23,42,0) 100%), #0f172a',
              border: '1px solid ' + meta.accent + '55',
              borderLeft: '4px solid ' + meta.accent,
              display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap'
            }
          },
            h('div', { style: { fontSize: 28, flexShrink: 0 }, 'aria-hidden': 'true' }, meta.icon),
            h('div', { style: { flex: 1, minWidth: 220 } },
              h('h3', { style: { color: meta.accent, fontSize: 15, fontWeight: 900, margin: 0, lineHeight: 1.2 } }, meta.title),
              h('p', { style: { margin: '3px 0 0', color: _teaFg('#cbd5e1'), fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
            )
          );
        })();

        // ── Badge Popup ──
        var badgePopup = null;
        if (showBadgePopup) {
          var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
          if (popBadge) {
            badgePopup = h('div', {
            ref: badgeDialogRef,
            role: 'alertdialog',
            'aria-modal': 'true',
            'aria-label': 'Badge earned: ' + popBadge.name,
            tabIndex: -1,
            // Escape closes it. The 3s auto-dismiss this replaced was a WCAG 2.2.1
            // failure: three seconds is the whole interaction for anyone reading
            // slowly, listening to a screen reader, or working a switch.
            onKeyDown: function(e) {
              if (e.key === 'Escape') { e.preventDefault(); upd('showBadgePopup', null); return; }
              // Honour aria-modal: keep Tab inside the dialog. One control here,
              // so first === last and Tab holds focus on it.
              if (e.key !== 'Tab') return;
              var f = e.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])');
              if (!f.length) return;
              var first = f[0], last = f[f.length - 1];
              var act = e.currentTarget.ownerDocument.activeElement;
              if (e.shiftKey && (act === first || act === e.currentTarget)) { e.preventDefault(); last.focus(); }
              else if (!e.shiftKey && act === last) { e.preventDefault(); first.focus(); }
            },
            style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)', animation: 'fadeIn 0.3s' }
            },
              h('div', { style: { background: _teaBg('#1e293b'), borderRadius: 20, padding: 32, textAlign: 'center', border: '2px solid ' + ACCENT, maxWidth: 300, boxShadow: '0 0 40px ' + ACCENT + '44' } },
                h('div', { style: { fontSize: 48, marginBottom: 12 } }, popBadge.icon),
                h('div', { style: { fontSize: 18, fontWeight: 700, color: _teaFg('#f1f5f9'), marginBottom: 6 } }, popBadge.name),
                h('div', { style: { fontSize: 13, color: _teaFg('#94a3b8') } }, popBadge.desc),
              h('button', {
                type: 'button',
                onClick: function() { upd('showBadgePopup', null); },
                style: { marginTop: 18, padding: '9px 22px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.85)', background: 'rgba(255,255,255,0.14)', color: '#ffffff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }
              }, 'Nice')
              )
            );
          }
        }

        // ── Badge Panel (when toggled) ──
        if (showBadgesPanel) {
          var panelContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: _teaFg('#f1f5f9'), fontSize: 18 } }, '\uD83C\uDFC5 Badges'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', {                   key: b.id,
                  style: { padding: 14, borderRadius: 12, background: earned ? _teaBg('#1e293b') : '#0f172a', border: '1px solid ' + (earned ? ACCENT + '66' : _teaBg('#334155')), textAlign: 'center', opacity: earned ? 1 : 0.5 }
                },
                  h('div', { style: { fontSize: 28 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: earned ? _teaFg('#f1f5f9') : _teaFg('#94a3b8'), marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 10, color: _teaFg('#94a3b8'), marginTop: 2 } }, b.desc)
                );
              })
            ),
            h('button', { 'aria-label': 'Close',
              onClick: function() { upd('showBadgesPanel', false); },
              style: { display: 'block', margin: '16px auto 0', padding: '8px 20px', borderRadius: 8, border: 'none', background: _teaBg('#334155'), color: _teaFg('#f1f5f9'), cursor: 'pointer', fontSize: 12 }
            }, 'Close')
          );

          return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
            tabBar, badgePopup, h('div', { id: 'teamwork-tab-panel', role: 'tabpanel', 'aria-labelledby': 'teamwork-tab-' + activeTab, style: { flex: 1, overflow: 'auto' } }, panelContent)
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Roles ──
        // ══════════════════════════════════════════════════════════
        var rolesContent = null;
        if (activeTab === 'roles') {
          var roles = TEAM_ROLES[band] || TEAM_ROLES.elementary;

          rolesContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _teaFg('#f1f5f9'), fontSize: 18 } }, '\uD83D\uDC51 Team Role Discovery'),
            h('p', { style: { textAlign: 'center', color: _teaFg('#94a3b8'), fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'Every team needs different people! Tap on a role to learn about it, then pick the ones that sound like YOU.' :
              band === 'middle' ? 'Strong teams need diverse skills. Explore each role and identify which ones match your strengths.' :
              'Effective collaboration requires self-awareness about your natural tendencies. Discover your role profile.'
            ),

            // Role cards
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 } },
              roles.map(function(role) {
                var isExpanded = expandedRole === role.id;
                var isSelected = selectedRoles.indexOf(role.id) !== -1;
                // \u2500\u2500 Disclosure, not a button inside a button \u2500\u2500
                // The card was a role="button" (via a11yClick) that WRAPPED the
                // real "That's Me" button. Nested interactive elements are
                // invalid: assistive tech may never expose the inner control,
                // and for pointer users the two activation targets overlap.
                // The card is now a plain container holding two SIBLING
                // controls: a disclosure button for the role, and the toggle.
                var toggleExpand = function() {
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
                };
                return h('div', {
                  key: role.id,
                  style: { padding: 14, borderRadius: 12, background: isSelected ? _teaBg('#1e293b') : '#0f172a', border: '1px solid ' + (isSelected ? ACCENT + '88' : _teaBg('#334155')), transition: 'all 0.2s' }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
                    h('button', {
                      type: 'button',
                      'aria-expanded': isExpanded ? 'true' : 'false',
                      'aria-controls': 'teamwork-role-panel-' + role.id,
                      onClick: toggleExpand,
                      style: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0, padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', font: 'inherit' }
                    },
                      h('span', { 'aria-hidden': 'true', style: { fontSize: 24 } }, role.emoji),
                      h('span', { style: { fontSize: 14, fontWeight: 600, color: _teaFg('#f1f5f9') } }, role.name)
                    ),
                    h('button', {
                      type: 'button',
                      // Was labelled 'Your Team Role Profile' - the heading of a
                      // different section further down the panel, which overrode
                      // the visible text for screen readers. The name now keeps
                      // the visible words and adds which role they apply to.
                      'aria-label': (isSelected ? '\u2713 Selected' : 'That\'s Me') + ': ' + role.name,
                      'aria-pressed': isSelected ? 'true' : 'false',
                      onClick: function(e) {
                        e.stopPropagation();
                        var newSel = selectedRoles.slice();
                        var idx = newSel.indexOf(role.id);
                        if (idx !== -1) { newSel.splice(idx, 1); } else { newSel.push(role.id); }
                        upd('selectedRoles', newSel);
                        if (soundEnabled) sfxTeam();
                        tryAwardBadge('team_player');
                      },
                      style: { padding: '6px 14px', borderRadius: 8, border: '1px solid ' + (isSelected ? ACCENT : _teaFg('#475569')), background: isSelected ? ACCENT_DIM : 'transparent', color: isSelected ? ACCENT : _teaFg('#94a3b8'), fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }
                    }, isSelected ? '\u2713 Selected' : 'That\'s Me')
                  ),
                  isExpanded && h('div', { id: 'teamwork-role-panel-' + role.id, style: { marginTop: 8 } },
                    h('p', { style: { fontSize: 12, color: _teaFg('#cbd5e1'), lineHeight: 1.6, marginBottom: 8 } }, role.desc),
                    h('div', { style: { fontSize: 12, color: ACCENT, fontStyle: 'italic', padding: '8px 12px', background: ACCENT_DIM, borderRadius: 8 } },
                      '\uD83D\uDCAC Sounds like: ' + role.soundsLike
                    )
                  )
                );
              })
            ),

            // Selected summary
            selectedRoles.length > 0 && h('div', { style: { padding: 16, borderRadius: 12, background: _teaBg('#1e293b'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, '\uD83C\uDFAF Your Team Role Profile'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 } },
                selectedRoles.map(function(rid) {
                  var r = roles.find(function(x) { return x.id === rid; });
                  return r ? h('span', { key: rid, style: { padding: '4px 10px', borderRadius: 20, background: ACCENT_DIM, color: ACCENT, fontSize: 12, fontWeight: 600 } }, r.emoji + ' ' + r.name) : null;
                })
              ),
              // Reflection
              h('div', { style: { fontSize: 12, color: _teaFg('#94a3b8'), marginBottom: 8 } }, '\uD83D\uDCDD My Best Team Role \u2014 Reflection:'),
              h('textarea', {
                value: roleReflection,
                'aria-label': 'Role reflection',
                onChange: function(e) { upd('roleReflection', e.target.value); upd('roleReflectionSaved', false); },
                placeholder: band === 'elementary' ? 'Why did you pick these roles? When do you act like this in a team?' : band === 'middle' ? 'Describe a time you played one of these roles. How did it affect the team?' : 'Analyze how your role preferences shape your collaboration style. What blind spots might you have?',
                rows: 3,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: _teaBg('#0f172a'), color: _teaFg('#e2e8f0'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }
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
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: roleReflectionSaved ? _teaBg('#334155') : ACCENT, color: roleReflectionSaved ? _teaFg('#94a3b8') : '#0f172a', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
                }, roleReflectionSaved ? '\u2713 Saved' : 'Save Reflection'),
                // AI Coach button
                h('button', { 'aria-label': coachLoading ? 'Team coach is responding' : 'Ask team role coach',
                  onClick: function() {
                    if (!roleReflection.trim()) { addToast('Write your reflection first!', 'info'); return; }
                    if (!callGemini) { addToast('AI not available.', 'error'); return; }
                    upd('coachLoading', true);
                    upd('coachResponse', null);
                    var selNames = selectedRoles.map(function(rid) {
                      var r = roles.find(function(x) { return x.id === rid; });
                      return r ? r.name : rid;
                    }).join(', ');
                    // Safety pre-check on role-reflection free-text.
                    var rrSafety = (window.SelHub && window.SelHub.safeRehearseCheck)
                      ? window.SelHub.safeRehearseCheck(roleReflection, { toolId: 'teamwork_role', onSafetyFlag: (ctx && ctx.onSafetyFlag) || null })
                      : { action: 'continue' };
                    if (rrSafety.action === 'block') {
                      upd('coachResponse', window.SelHub.rehearseBreakCharacterText(rrSafety.severity));
                      upd('coachLoading', false);
                      upd('_lastTier', 3);
                      return;
                    }
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
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: coachLoading ? _teaBg('#334155') : '#6366f1', color: _teaFg('#fff'), fontWeight: 600, fontSize: 12, cursor: coachLoading ? 'default' : 'pointer' }
                }, coachLoading ? 'Thinking...' : '\u2728 AI Coach')
              ),
              // AI response \u2014 always-rendered live region so SR users get notified
              h('div', { role: 'region', 'aria-label': 'Team role coach response', 'aria-live': 'polite', 'aria-atomic': 'true', 'aria-busy': coachLoading ? 'true' : 'false' },
                coachResponse && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: _teaBg('#0f172a'), border: '1px solid #6366f144' } },
                  h('p', { style: { fontSize: 10, color: _teaFg('#818cf8'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\u2728 Team Coach'),
                  h('div', { style: { fontSize: 13, color: _teaFg('#e2e8f0'), lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, coachResponse)
                )
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
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _teaFg('#f1f5f9'), fontSize: 18 } }, '\uD83C\uDFD7\uFE0F Collaborative Challenges'),
            h('p', { role: 'status', style: { textAlign: 'center', color: _teaFg('#94a3b8'), fontSize: 12, marginBottom: 16 } },
              'Challenge ' + ((challengeIdx % chList.length) + 1) + ' of ' + chList.length
            ),

            // Challenge card
            h('div', { style: { padding: 20, borderRadius: 14, background: _teaBg('#1e293b'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 } },
                h('span', { style: { fontSize: 28 } }, curCh.icon),
                h('h4', { style: { fontSize: 16, fontWeight: 700, color: _teaFg('#f1f5f9'), margin: 0 } }, curCh.title)
              ),
              h('p', { style: { fontSize: 13, color: _teaFg('#cbd5e1'), lineHeight: 1.7, marginBottom: 14 } }, curCh.desc),

              // Skills involved
              h('div', { style: { display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 } },
                curCh.skills.map(function(s) {
                  return h('span', { key: s, style: { padding: '3px 10px', borderRadius: 20, background: _teaBg('#334155'), color: _teaFg('#94a3b8'), fontSize: 11 } }, s);
                })
              ),

              // Discussion prompts
              h('div', { style: { fontSize: 12, fontWeight: 600, color: ACCENT, marginBottom: 8 } }, '\uD83D\uDCAC Discussion Prompts:'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
                curCh.prompts.map(function(p, i) {
                  return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: _teaBg('#0f172a'), fontSize: 12, color: _teaFg('#e2e8f0'), lineHeight: 1.6 } },
                    (i + 1) + '. ' + p
                  );
                })
              ),

              // Skill self-rating
              h('div', { style: { fontSize: 12, fontWeight: 600, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, '\uD83C\uDFAF Rate Your Team Skills:'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 } },
                curCh.skills.map(function(s) {
                  var r = chRatings[s] || 0;
                  return h('div', { key: s, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: _teaBg('#0f172a') } },
                    h('span', { style: { fontSize: 12, color: _teaFg('#cbd5e1'), flex: 1, textTransform: 'capitalize' } }, s.replace(/-/g, ' ')),
                    [1, 2, 3, 4, 5].map(function(star) {
                      return h('button', { 'aria-label': 'Rate ' + s.replace(/-/g, ' ') + ': ' + star + ' star' + (star === 1 ? '' : 's'),
                        key: star,
                        onClick: function() {
                          var newRatings = Object.assign({}, challengeRatings);
                          var curRats = Object.assign({}, newRatings[curCh.id] || {});
                          curRats[s] = star;
                          newRatings[curCh.id] = curRats;
                          upd('challengeRatings', newRatings);
                          if (soundEnabled) sfxClick();
                        },
                        style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: 0, color: star <= r ? _teaFg('#facc15') : _teaBg('#334155') }
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
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: _teaBg('#0f172a'), color: _teaFg('#e2e8f0'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 12 }
              }),

              // Navigation
              h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
                challengeIdx > 0 && h('button', { 'aria-label': 'Previous',
                  onClick: function() { upd({ challengeIdx: challengeIdx - 1, challengeDiscussion: '' }); if (soundEnabled) sfxClick(); },
                  style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: _teaBg('#334155'), color: _teaFg('#f1f5f9'), fontWeight: 600, fontSize: 12, cursor: 'pointer' }
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
                  style: { padding: '8px 20px', borderRadius: 8, border: 'none', background: ACCENT, color: _teaFg('#0f172a'), fontWeight: 600, fontSize: 12, cursor: 'pointer' }
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
          function teamScenarioRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
          var scenarioSelections = teamScenarioRecord(d.scenarioSelections);
          var oldScenarioIndex = typeof scenarioIdx === 'number' && isFinite(scenarioIdx) && scenarioIdx >= 0 ? Math.floor(scenarioIdx) % TEAMWORK_PRACTICE.length : 0;
          var selectedScenarioId = Object.prototype.hasOwnProperty.call(scenarioSelections, band) ? scenarioSelections[band] : null;
          var curTeamScenario = TEAMWORK_PRACTICE.find(function(item) { return item.id === selectedScenarioId; }) || TEAMWORK_PRACTICE[oldScenarioIndex];
          var teamScenarioKey = band + ':' + curTeamScenario.id;
          var scenarioDrafts = teamScenarioRecord(d.scenarioDrafts);
          var scenarioDraft = teamScenarioRecord(Object.prototype.hasOwnProperty.call(scenarioDrafts, teamScenarioKey) ? scenarioDrafts[teamScenarioKey] : null);
          var scenarioSurface = _teaHC ? '#000000' : _teaL ? '#ffffff' : '#0f172a';
          var scenarioInk = _teaHC ? '#ffff00' : _teaL ? '#0f172a' : '#e2e8f0';
          var scenarioEdge = _teaHC ? '#ffff00' : '#64748b';
          var scenarioControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + scenarioEdge, borderRadius: 8, background: scenarioSurface, color: scenarioInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var scenarioDisclosure = { borderTop: '1px solid ' + scenarioEdge };
          var scenarioSummary = { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' };
          function updateTeamScenario(key, value) {
            var next = Object.assign({}, scenarioDrafts);
            next[teamScenarioKey] = Object.assign({}, scenarioDraft);
            next[teamScenarioKey][key] = value;
            upd('scenarioDrafts', next);
          }
          function teamScenarioNote(key, label, help) {
            var id = 'teamwork-scenario-note-' + key;
            var value = Object.prototype.hasOwnProperty.call(scenarioDraft, key) && typeof scenarioDraft[key] === 'string' ? scenarioDraft[key] : '';
            return h('div', { style: { margin: '12px 0' } },
              h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label + ' (optional)'),
              h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, help),
              h('textarea', { id: id, rows: 3, value: value, 'aria-describedby': id + '-help', onChange: function(e) { updateTeamScenario(key, e.target.value); }, style: Object.assign({}, scenarioControl, { resize: 'vertical', lineHeight: 1.6 }) }));
          }
          var chosenTeamRoute = curTeamScenario.routes.some(function(route) { return route.id === scenarioDraft.route; }) || scenarioDraft.route === 'own' ? scenarioDraft.route : '';
          var oldScenarioResponses = teamScenarioRecord(scenarioAnswers);
          var earlierTeamChoices = SCENARIOS.filter(function(item) { var value = oldScenarioResponses[item.id]; return Number.isInteger(value) && value >= 0 && value < item.choices.length; });
          scenariosContent = h('div', null,
            h('section', { role: 'region', 'aria-label': 'Teamwork scenario practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: scenarioSurface, color: scenarioInk, border: '1px solid ' + scenarioEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
              h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Work through a teamwork challenge'),
              h('p', null, band === 'elementary' ? 'Read a made-up situation together. Open an idea to see how it might help and what to be careful about. You can talk, draw, write or ask an adult to help. There is no score.' : 'Explore a fictional situation, compare possible responses and rehearse a next step. You can think, talk, draw or write. There is no single best script or score.'),
              h('p', null, 'You can ask a teacher or trusted adult for help at any point. If there are threats, repeated targeting or unsafe pressure, seek support; you do not have to confront someone or mediate first.'),
              h('label', { htmlFor: 'teamwork-scenario-choice', style: { display: 'block', fontWeight: 700 } }, 'Choose a teamwork situation'),
              h('select', { id: 'teamwork-scenario-choice', value: curTeamScenario.id, onChange: function(e) { var next = Object.assign({}, scenarioSelections); next[band] = e.target.value; upd('scenarioSelections', next); }, style: scenarioControl }, TEAMWORK_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
              h('div', { key: teamScenarioKey },
                h('h3', { style: { fontSize: 18 } }, curTeamScenario.title),
                h('p', null, curTeamScenario.situations[band] || curTeamScenario.situations.elementary),
                h('details', { style: scenarioDisclosure },
                  h('summary', { style: scenarioSummary }, 'Notice what we know and what to check'),
                  h('p', null, curTeamScenario.check)),
                h('h4', { style: { fontSize: 16 } }, 'Compare possible routes'),
                h('p', null, 'Open any route to consider how it could help and what it needs. You may combine routes or propose another. Respect for access, safety and boundaries still matters.'),
                curTeamScenario.routes.map(function(route) {
                  return h('details', { key: route.id, style: scenarioDisclosure },
                    h('summary', { style: scenarioSummary }, route.title),
                    h('p', null, h('strong', null, 'How it could help: '), route.helps),
                    h('p', null, h('strong', null, 'What to watch for: '), route.limits));
                }),
                h('details', { style: scenarioDisclosure },
                  h('summary', { style: scenarioSummary }, 'Build a response (optional)'),
                  h('p', null, 'Use the fictional situation or another example you choose. Personal disclosure is optional. Your words can be spoken, written or shared with support.'),
                  h('label', { htmlFor: 'teamwork-scenario-route', style: { display: 'block', fontWeight: 700 } }, 'A route to rehearse (optional)'),
                  h('select', { id: 'teamwork-scenario-route', value: chosenTeamRoute, onChange: function(e) { updateTeamScenario('route', e.target.value); }, style: scenarioControl },
                    h('option', { value: '' }, 'Still deciding'), curTeamScenario.routes.map(function(route) { return h('option', { key: route.id, value: route.id }, route.title); }), h('option', { value: 'own' }, 'Combine routes or use my own')),
                  teamScenarioNote('notice', 'What I notice without guessing motives', band === 'elementary' ? 'What happened? Say what someone did, rather than calling them a name.' : 'Separate what was seen or recorded from assumptions about effort, intentions or personality.'),
                  teamScenarioNote('check', 'What I need to check', band === 'elementary' ? 'What is missing from the story? Who could help you find out?' : 'Name an unknown, an access need or a task expectation. Ask only for information needed to plan; no personal explanation is required.'),
                  teamScenarioNote('words', 'Words or another way to respond', band === 'elementary' ? 'What could you say, write or show? You can ask an adult to help.' : 'Rehearse a specific observation and request. Choose a communication method and support that are workable for the people involved.'),
                  teamScenarioNote('support', 'A boundary or support we need', band === 'elementary' ? 'What should stay safe or fair? Who can help? You do not have to fix this alone.' : 'Name a limit, permission, resource or adult responsibility. Consider power differences and whether direct discussion is appropriate.'),
                  teamScenarioNote('plan', 'A next step and check-in', band === 'elementary' ? 'Who will do what next? When can you check whether it helped?' : 'Agree on a realistic action, who owns it and when to review. Look for changed participation, access or workload, not just agreement.')),
                h('details', { style: scenarioDisclosure },
                  h('summary', { style: scenarioSummary }, 'Try a changed situation'),
                  h('p', null, curTeamScenario.change),
                  teamScenarioNote('review', 'What I would keep or change, and why', band === 'elementary' ? 'Does the new detail change your idea? What help is needed now?' : 'Reconsider the route and needed support. Explain what to keep or revise and what evidence would show the new plan is working.')),
                h('details', { style: scenarioDisclosure },
                  h('summary', { style: scenarioSummary }, 'Compare one possible plan'),
                  h('p', null, curTeamScenario.model),
                  h('p', null, 'This plan responds to the changed situation. It is an example to discuss, not a promise of cooperation or an answer key. Other plans need reasons and attention to the people affected.')),
                h('p', null, 'Notes stay with this situation and grade band in the current project. Use the hub save or export controls to keep them beyond this session. Review personal details before sharing.')
              ),
              earlierTeamChoices.length > 0 && h('details', { style: scenarioDisclosure },
                h('summary', { style: scenarioSummary }, 'Earlier scenario choices'),
                h('p', null, 'These choices came from the earlier scored quiz. They are historical records, not recommended responses or a measure of teamwork skill. They have not been copied into the new practice.'),
                earlierTeamChoices.map(function(item) { return h('p', { key: item.id }, h('strong', null, TEAMWORK_PRACTICE.find(function(current) { return current.id === item.id; }).title + ': '), item.choices[oldScenarioResponses[item.id]].label); }))
            ),
            h('details', { style: { margin: '16px auto', padding: 16, maxWidth: 760, background: scenarioSurface, color: scenarioInk, border: '1px solid ' + scenarioEdge, borderRadius: 12 } },
              h('summary', { style: scenarioSummary }, 'Optional AI teamwork coach'),
              h('p', null, 'Use a fictional or non-identifying example if you choose to ask the coach. Select Ask Coach to request a response. Your rehearsal notes are not added to the coach prompt.'),
// AI Team Coach section
            h('div', { style: { padding: 16, borderRadius: 14, background: _teaBg('#1e293b'), border: '1px solid #6366f133' } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, '\u2728 AI Team Coach'),
              h('p', { style: { fontSize: 12, color: _teaFg('#94a3b8'), marginBottom: 10 } }, 'Ask the AI coach about any teamwork challenge you\'re facing.'),
              h('textarea', {
                value: coachPrompt,
                'aria-label': 'Describe your teamwork challenge',
                onChange: function(e) { upd('coachPrompt', e.target.value); },
                placeholder: band === 'elementary' ? 'Describe a teamwork problem you\'re having...' : band === 'middle' ? 'What teamwork challenge are you facing? Be specific...' : 'Describe the collaboration issue. Include context about your role and the team dynamics...',
                rows: 2,
                style: { width: '100%', padding: 10, borderRadius: 8, border: '1px solid #334155', background: _teaBg('#0f172a'), color: _teaFg('#e2e8f0'), fontSize: 13, resize: 'vertical', boxSizing: 'border-box', marginBottom: 8 }
              }),
              h('button', { 'aria-label': coachLoading ? 'Thinking...' : '\u2728 Ask Coach',
                onClick: function() {
                  if (!coachPrompt.trim()) { addToast('Describe your teamwork challenge first!', 'info'); return; }
                  if (!callGemini) { addToast('AI not available.', 'error'); return; }
                  // Safety pre-check on the teamwork-challenge free-text.
                  var cpSafety = (window.SelHub && window.SelHub.safeRehearseCheck)
                    ? window.SelHub.safeRehearseCheck(coachPrompt, { toolId: 'teamwork_coach', onSafetyFlag: (ctx && ctx.onSafetyFlag) || null })
                    : { action: 'continue' };
                  if (cpSafety.action === 'block') {
                    upd('coachResponse', window.SelHub.rehearseBreakCharacterText(cpSafety.severity));
                    upd('coachLoading', false);
                    upd('_lastTier', 3);
                    return;
                  }
                  upd('coachLoading', true);
                  upd('coachResponse', null);
                  var prompt = 'You are a warm, knowledgeable teamwork coach for ' + band + ' school students.\n\n' +
                    'STUDENT\'S TEAMWORK CHALLENGE: "' + coachPrompt + '"\n\n' +
                    'Respond with:\n1. Validate their experience\n2. Name the specific teamwork skill involved (communication, delegation, conflict resolution, etc.)\n3. Give 2-3 concrete strategies they can try immediately\n4. End with encouragement\n\n' +
                    'Use ' + (band === 'elementary' ? 'simple, friendly language for ages 5-10.' : band === 'middle' ? 'supportive, practical language for ages 11-14.' : 'professional coaching language for ages 15-18.') +
                    '\nDo not infer motives from quietness or unfinished work. Offer conditional options rather than one best script. Respect access, consent, safety and realistic capacity. Asking a teacher or trusted adult for help can be a first step; do not require confrontation, mediation or extra work outside agreed limits.\nKeep it under 180 words.';
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
                style: { padding: '8px 18px', borderRadius: 8, border: 'none', background: coachLoading ? _teaBg('#334155') : '#6366f1', color: _teaFg('#fff'), fontWeight: 600, fontSize: 12, cursor: coachLoading ? 'default' : 'pointer' }
              }, coachLoading ? 'Thinking...' : '\u2728 Ask Coach'),
              h('div', { role: 'region', 'aria-label': 'Teamwork challenge coach response', 'aria-live': 'polite', 'aria-atomic': 'true', 'aria-busy': coachLoading ? 'true' : 'false' },
                coachResponse && h('div', { style: { marginTop: 12, padding: 14, borderRadius: 10, background: _teaBg('#0f172a'), border: '1px solid #6366f144' } },
                  h('p', { style: { fontSize: 10, color: _teaFg('#818cf8'), textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\u2728 Coach Says'),
                  h('div', { style: { fontSize: 13, color: _teaFg('#e2e8f0'), lineHeight: 1.7, whiteSpace: 'pre-wrap' } }, coachResponse)
                )
              )
            )
            )
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Skills Quiz ──
        // ══════════════════════════════════════════════════════════
        var quizContent = null;
        if (activeTab === 'quiz') {
          var quizDone = Object.keys(quizRatings).length === QUIZ_SKILLS.length;

          quizContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: _teaFg('#f1f5f9'), fontSize: 18 } }, '\uD83D\uDCCA Team Skills Self-Assessment'),
            h('p', { style: { textAlign: 'center', color: _teaFg('#94a3b8'), fontSize: 12, marginBottom: 16 } },
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
                  style: { padding: 14, borderRadius: 12, background: _teaBg('#1e293b'), border: '1px solid ' + (rating > 0 ? ACCENT + '44' : _teaBg('#334155')) }
                },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 } },
                    h('span', { style: { fontSize: 20 } }, skill.icon),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { fontSize: 13, fontWeight: 600, color: _teaFg('#f1f5f9') } }, skill.name),
                      h('div', { style: { fontSize: 11, color: _teaFg('#94a3b8'), marginTop: 2 } }, skill.desc)
                    )
                  ),
                  h('div', { style: { display: 'flex', gap: 6, alignItems: 'center' } },
                    h('span', { style: { fontSize: 10, color: _teaFg('#94a3b8'), marginRight: 4 } }, 'Low'),
                    [1, 2, 3, 4, 5].map(function(val) {
                      var isSelected = rating === val;
                      return h('button', {
                        key: val,
                        onClick: function() {
                          if (quizSubmitted) return;
                          var newRatings = Object.assign({}, quizRatings);
                          newRatings[skill.id] = val;
                          upd('quizRatings', newRatings);
                          if (soundEnabled) sfxClick();
                        },
                        style: {
                          width: 32, height: 32, borderRadius: '50%', border: '2px solid ' + (isSelected ? ACCENT : _teaBg('#334155')),
                          background: isSelected ? ACCENT_DIM : '#0f172a', color: isSelected ? ACCENT : _teaFg('#94a3b8'),
                          fontWeight: 700, fontSize: 13, cursor: quizSubmitted ? 'default' : 'pointer', transition: 'all 0.15s'
                        }
                      }, String(val));
                    }),
                    h('span', { style: { fontSize: 10, color: _teaFg('#94a3b8'), marginLeft: 4 } }, 'High')
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
              style: { display: 'block', width: '100%', padding: '12px 20px', borderRadius: 10, border: 'none', background: quizDone ? ACCENT : _teaBg('#334155'), color: quizDone ? '#0f172a' : _teaFg('#94a3b8'), fontWeight: 700, fontSize: 14, cursor: quizDone ? 'pointer' : 'default', marginBottom: 20 }
            }, quizDone ? '\u2705 Submit My Assessment' : 'Rate all 8 skills to continue'),

            // Results visualization (bar chart)
            quizSubmitted && h('div', { style: { padding: 16, borderRadius: 14, background: _teaBg('#1e293b'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 14, fontWeight: 700, color: _teaFg('#f1f5f9'), marginBottom: 12, textAlign: 'center' } }, '\uD83D\uDCCA Your Skills Profile'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                QUIZ_SKILLS.map(function(skill) {
                  var myRating = quizRatings[skill.id] || 0;
                  var idealRating = IDEAL_PROFILE[skill.id] || 4;
                  var barWidthMy = (myRating / 5) * 100;
                  var barWidthIdeal = (idealRating / 5) * 100;
                  return h('div', { key: skill.id },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 } },
                      h('span', { style: { fontSize: 14 } }, skill.icon),
                      h('span', { style: { fontSize: 11, color: _teaFg('#cbd5e1'), flex: 1, minWidth: 100 } }, skill.name),
                      h('span', { style: { fontSize: 11, color: ACCENT, fontWeight: 600, width: 24, textAlign: 'right' } }, String(myRating))
                    ),
                    // My rating bar
                    h('div', { style: { position: 'relative', height: 10, borderRadius: 5, background: _teaBg('#0f172a'), overflow: 'hidden', marginBottom: 2 } },
                      h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: barWidthMy + '%', background: ACCENT, borderRadius: 5, transition: 'width 0.5s' } })
                    ),
                    // Ideal bar (subtle reference line)
                    h('div', { style: { position: 'relative', height: 4, borderRadius: 2, background: _teaBg('#0f172a'), overflow: 'hidden' } },
                      h('div', { style: { position: 'absolute', top: 0, left: 0, height: '100%', width: barWidthIdeal + '%', background: '#6366f144', borderRadius: 2 } })
                    )
                  );
                })
              ),
              h('div', { style: { display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12, fontSize: 10, color: _teaFg('#94a3b8') } },
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
                return h('div', { style: { marginTop: 14, padding: 12, borderRadius: 10, background: _teaBg('#0f172a'), border: '1px solid #334155' } },
                  h('div', { style: { fontSize: 12, fontWeight: 600, color: _teaFg('#f1f5f9'), marginBottom: 6 } }, '\uD83D\uDCCB Summary'),
                  h('div', { style: { fontSize: 12, color: _teaFg('#cbd5e1'), lineHeight: 1.8 } },
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
                style: { display: 'block', margin: '12px auto 0', padding: '6px 14px', borderRadius: 8, border: '1px solid #334155', background: 'transparent', color: _teaFg('#94a3b8'), fontSize: 11, cursor: 'pointer' }
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
          function agreementRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
          var agreementDrafts = agreementRecord(d.agreementDrafts);
          var agreementDraft = agreementRecord(Object.prototype.hasOwnProperty.call(agreementDrafts, band) ? agreementDrafts[band] : null);
          var agreementExamples = agreementRecord(d.agreementExamples);
          var agreementExample = AGREEMENT_EXAMPLES.find(function(item) { return item.id === agreementExamples[band]; }) || AGREEMENT_EXAMPLES[0];
          var agreementFields = [
            { key: 'purpose', label: 'What this agreement is for', help: band === 'elementary' ? 'What will the group do together? What do you want the plan to help with?' : 'Name the shared task and the collaboration problem this proposal should address. Keep it specific enough to revisit.' },
            { key: 'voices', label: 'Whose input is still needed', help: band === 'elementary' ? 'Who needs a chance to help make the plan? How can someone ask to change it?' : 'How can everyone consider, question or suggest changes to the proposal? Include absent members and private or supported feedback routes. Silence and signatures alone do not show understanding or agreement.' },
            { key: 'practice', label: 'What we propose doing', help: band === 'elementary' ? 'What could people actually do? For example: ask before changing a shared picture.' : 'Describe observable actions and when they apply. Replace vague demands such as "be positive" with a process that allows disagreement and questions.' },
            { key: 'access', label: 'Ways to participate and get support', help: band === 'elementary' ? 'Could someone talk, draw, write or ask for help? What if the materials or plan do not work for them?' : 'Plan usable formats, materials, response windows and alternatives. Ask what support is needed without requiring diagnoses or personal explanations.' },
            { key: 'roles', label: 'Responsibilities to discuss', help: band === 'elementary' ? 'What jobs need doing? Ask what people can try and what help they need. Use role names instead of people\'s names.' : 'Use role labels to propose who does what, with time and support. Check capacity and willingness; include learning opportunities and a way to revisit workload.' },
            { key: 'repair', label: 'If the agreement is not working', help: band === 'elementary' ? 'How could you check what happened and get help? You can ask a trusted adult right away if you feel unsafe.' : 'Check the expectation, impact and barriers, then propose support and a feasible next step. A student need not confront someone causing harm before seeking adult help. Do not invent peer grade penalties or promise secrecy.' },
            { key: 'review', label: 'When and how we will revisit it', help: band === 'elementary' ? 'When will you ask if the plan helps? Who can help you change it?' : 'Set a review point and name what to look for: access, manageable workload, contribution or decision influence. Explain how changes will be discussed with the group.' }
          ];
          var agreementChecks = [
            { key: 'clear', title: 'Clear enough to try', help: 'Can someone tell what to do, when it applies and what is still undecided?' },
            { key: 'workable', title: 'Workable ways to join', help: 'Are time, formats, materials and support realistic? Is there a usable alternative?' },
            { key: 'voice', title: 'Room to question and revise', help: 'Can people disagree, ask for help or suggest a change without pressure or forced disclosure?' },
            { key: 'followup', title: 'Support and a review point', help: 'Is there a supported next step when the plan fails, with clear responsibility and time to look again?' }
          ];
          var agreementReviews = agreementRecord(agreementDraft.reviews);
          function agreementValue(key) { return Object.prototype.hasOwnProperty.call(agreementDraft, key) && typeof agreementDraft[key] === 'string' ? agreementDraft[key] : ''; }
          function agreementReview(key) { var value = agreementReviews[key]; return value === 'revise' || value === 'discuss' ? value : ''; }
          function changeAgreement(key, value) {
            var next = Object.assign({}, agreementDrafts), draft = Object.assign({}, agreementDraft);
            if (key === 'reviews') { draft.reviews = value; }
            else {
              draft[key] = value;
              var hadReview = agreementChecks.some(function(check) { return agreementReview(check.key); });
              var reviews = Object.assign({}, agreementReviews); agreementChecks.forEach(function(check) { delete reviews[check.key]; }); draft.reviews = reviews;
              if (hadReview && announceToSR) announceToSR('Draft changed. Review choices reset so you can check the new wording.');
            }
            next[band] = draft; upd('agreementDrafts', next);
          }
          var agreementSurface = _teaHC ? '#000000' : _teaL ? '#ffffff' : '#0f172a';
          var agreementInk = _teaHC ? '#ffff00' : _teaL ? '#0f172a' : '#e2e8f0';
          var agreementEdge = _teaHC ? '#ffff00' : '#64748b';
          var agreementControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + agreementEdge, borderRadius: 8, background: agreementSurface, color: agreementInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var agreementSummary = { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 };
          var agreementDetails = { borderTop: '1px solid ' + agreementEdge };
          function agreementNote(field) {
            var id = 'teamwork-agreement-' + field.key;
            return h('div', { key: field.key, style: { margin: '14px 0' } }, h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'), h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, field.help), h('textarea', { id: id, rows: 3, value: agreementValue(field.key), 'aria-describedby': id + '-help', onChange: function(e) { changeAgreement(field.key, e.target.value); }, style: Object.assign({}, agreementControl, { lineHeight: 1.6, resize: 'vertical' }) }));
          }
          var agreementReviewLabels = { '': 'Still to check', revise: 'Needs revision', discuss: 'Ready to discuss' };
          var agreementText = 'WORKING TEAM AGREEMENT — DRAFT FOR DISCUSSION\nThis is a personal proposal, not a record of team consent.\n\n' + agreementFields.map(function(field) { return field.label + ':\n' + (agreementValue(field.key) || '(still open)'); }).join('\n\n') + '\n\nMY REVIEW CHOICES (not team approval)\n' + agreementChecks.map(function(check) { return check.title + ': ' + agreementReviewLabels[agreementReview(check.key)]; }).join('\n');
          var earlierAgreement = [
            { label: 'Earlier agreements', items: Array.isArray(d.contractAgreements) ? d.contractAgreements.filter(function(item) { return typeof item === 'string' && item.trim(); }) : [] },
            { label: 'Earlier roles', items: Array.isArray(d.contractRoles) ? d.contractRoles.filter(function(item) { return typeof item === 'string' && item.trim(); }) : [] },
            { label: 'Earlier communication plan', items: typeof d.contractComms === 'string' && d.contractComms ? [d.contractComms] : [] },
            { label: 'Earlier accountability text', items: typeof d.contractConsequence === 'string' && d.contractConsequence ? [d.contractConsequence] : [] }
          ];
          contractContent = h('section', { role: 'region', 'aria-label': 'Working team agreement', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: agreementSurface, color: agreementInk, border: '1px solid ' + agreementEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
            h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Draft a workable team agreement'),
            h('p', null, band === 'elementary' ? 'Make a plan people can help shape. You can talk, draw or write with an adult. Start with one useful idea; every box is optional.' : 'Turn broad expectations into a proposal people can understand, use and revise. Start with the parts that matter for your group; every field is optional.'),
            h('p', null, 'Writing or reviewing a draft does not mean the team has agreed. Use a fictional group or role labels and leave out identifying details.'),
            h('div', { key: band },
              h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, 'Compare and test example agreements'),
                h('p', null, 'Examples are for comparison. Changing the example does not replace your draft.'),
                h('label', { htmlFor: 'teamwork-agreement-example', style: { display: 'block', fontWeight: 700 } }, 'Choose an agreement example'),
                h('select', { id: 'teamwork-agreement-example', value: agreementExample.id, style: agreementControl, onChange: function(e) { var next = Object.assign({}, agreementExamples); next[band] = e.target.value; upd('agreementExamples', next); } }, AGREEMENT_EXAMPLES.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
                h('div', { key: agreementExample.id }, h('h3', { style: { fontSize: 18 } }, agreementExample.title), h('p', null, agreementExample.setups[band] || agreementExample.setups.elementary),
                  h('p', null, h('strong', null, 'Starting wording: '), agreementExample.initial), h('p', null, agreementExample.problem),
                  h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, 'Compare a more workable proposal'), h('p', null, agreementExample.proposal)),
                  h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, 'Test it when circumstances change'), h('p', null, agreementExample.test), h('p', null, h('strong', null, 'A possible adjustment: '), agreementExample.revision)))),
              h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, '1. Purpose and participation'), agreementFields.slice(0, 2).map(agreementNote)),
              h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, '2. Practices, access and responsibilities'), agreementFields.slice(2, 5).map(agreementNote)),
              h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, '3. Support and revision'), agreementFields.slice(5).map(agreementNote)),
              h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, 'Check my draft before discussing it'),
                h('p', null, 'These are your own review choices, not a score or team approval. Changing any note resets these choices so you can check the new wording. No choice is required to keep your draft.'),
                agreementChecks.map(function(check) { var id = 'teamwork-agreement-check-' + check.key; return h('div', { key: check.key, style: { margin: '14px 0' } }, h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, check.title), h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, check.help), h('select', { id: id, value: agreementReview(check.key), 'aria-describedby': id + '-help', style: agreementControl, onChange: function(e) { var next = Object.assign({}, agreementReviews); next[check.key] = e.target.value; changeAgreement('reviews', next); } }, h('option', { value: '' }, 'Still to check'), h('option', { value: 'revise' }, 'Needs revision'), h('option', { value: 'discuss' }, 'Ready to discuss'))); })),
              h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, 'Review my proposal'),
                h('p', null, 'This preview contains your notes and review choices, not the example wording. You can select and copy it. Review private details before sharing; nothing is sent to teammates.'),
                h('label', { htmlFor: 'teamwork-agreement-preview', style: { display: 'block', fontWeight: 700 } }, 'Proposal text to review or copy'),
                h('textarea', { id: 'teamwork-agreement-preview', rows: 12, readOnly: true, value: agreementText, style: Object.assign({}, agreementControl, { lineHeight: 1.6, resize: 'vertical' }) })),
              h('p', null, 'Your draft stays with this grade band in the current project. Use the hub save or export controls to keep it beyond this session. You can return and change it without a completion score.')
            ),
            earlierAgreement.some(function(group) { return group.items.length; }) && h('details', { style: agreementDetails }, h('summary', { style: agreementSummary }, 'Earlier contract records'), h('p', null, 'These earlier entries are preserved as historical records. They are not proof of consent or recommended consequences, and have not been copied into your new proposal.'), earlierAgreement.map(function(group) { return group.items.length > 0 && h('div', { key: group.label }, h('h3', { style: { fontSize: 16 } }, group.label), group.items.map(function(item, index) { return h('p', { key: index, style: { whiteSpace: 'pre-wrap' } }, item); })); }))
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Communication Styles ──
        // ══════════════════════════════════════════════════════════
        var commStyleContent = null;
        if (activeTab === 'commstyle') {
          function commPlanRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
          var commCases = COMMUNICATION_PLANS[band] || COMMUNICATION_PLANS.elementary;
          var commSelections = commPlanRecord(d.communicationSelections);
          var selectedCommId = Object.prototype.hasOwnProperty.call(commSelections, band) ? commSelections[band] : null;
          var commCase = commCases.find(function(item) { return item.id === selectedCommId; }) || commCases[0];
          var commKey = band + ':' + commCase.id;
          var commDrafts = commPlanRecord(d.communicationDrafts);
          var commDraft = commPlanRecord(Object.prototype.hasOwnProperty.call(commDrafts, commKey) ? commDrafts[commKey] : null);
          var commSupports = commPlanRecord(commDraft.supports);
          var commSurface = _teaHC ? '#000000' : _teaL ? '#ffffff' : '#0f172a';
          var commInk = _teaHC ? '#ffff00' : _teaL ? '#0f172a' : '#e2e8f0';
          var commEdge = _teaHC ? '#ffff00' : '#64748b';
          var commControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + commEdge, borderRadius: 8, background: commSurface, color: commInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var commDisclosure = { borderTop: '1px solid ' + commEdge };
          var commSummary = { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' };
          var commSupportChoices = [
            { key: 'time', label: 'Time to think or reply', help: 'Agree when a response is needed and what happens if someone needs more time.' },
            { key: 'formats', label: 'More than one way to respond', help: 'Offer speech, writing, drawing, a communication aid or another workable method. Ask what fits.' },
            { key: 'backup', label: 'A clear example or record', help: 'Use a demonstration, visual guide or shared note that people can access and correct.' },
            { key: 'support', label: 'A private or supported conversation', help: 'Offer a trusted adult or another agreed support person. Personal disclosure is optional.' }
          ];
          var commFields = band === 'elementary' ? [
            { key: 'purpose', label: 'Who needs to know what', help: 'Use the made-up example or another idea. What does someone need to understand or do?' },
            { key: 'message', label: 'My message or demonstration', help: 'What could you say, write, draw or show? Keep the next step clear.' },
            { key: 'access', label: 'Ways to take part', help: 'How can people ask or answer? What help or materials would make it easier?' },
            { key: 'timing', label: 'Time and response plan', help: 'When can people think and reply? Ask an adult to help choose a fair time.' },
            { key: 'check', label: 'How we will check understanding', help: 'How could you find out what is clear? Try one step together, ask a question or invite another explanation. Nobody has to agree just to show they understand.' }
          ] : [
            { key: 'purpose', label: 'Who needs to know what', help: 'Identify the audience, purpose and needed information. Separate sharing information, requesting action, inviting input and seeking permission.' },
            { key: 'message', label: 'My message or demonstration', help: 'Draft a specific observation, question or next step. Explain key terms and leave room for the other person to correct an assumption.' },
            { key: 'access', label: 'Ways to take part', help: 'Agree on usable formats, language support, resources and privacy. Do not infer preferences from a personality label or require someone to justify an access need.' },
            { key: 'timing', label: 'Time and response plan', help: 'Set a realistic response window and a follow-up route. Account for schedules, processing time and access; silence is not automatic agreement.' },
            { key: 'check', label: 'How we will check understanding', help: 'Invite a summary, example, question or demonstration in an agreed format. Distinguish understanding from agreement and consent; check the resulting action when relevant.' }
          ];
          function updateCommPlan(key, value) {
            var next = Object.assign({}, commDrafts);
            next[commKey] = Object.assign({}, commDraft);
            next[commKey][key] = value;
            upd('communicationDrafts', next);
          }
          function commText(key) { return Object.prototype.hasOwnProperty.call(commDraft, key) && typeof commDraft[key] === 'string' ? commDraft[key] : ''; }
          function commPlanNote(field) {
            var id = 'teamwork-comm-note-' + field.key;
            return h('div', { key: field.key, style: { margin: '12px 0' } },
              h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
              h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, field.help),
              h('textarea', { id: id, rows: 3, value: commText(field.key), 'aria-describedby': id + '-help', onChange: function(e) { updateCommPlan(field.key, e.target.value); }, style: Object.assign({}, commControl, { resize: 'vertical', lineHeight: 1.6 }) }));
          }
          var commReviewField = { key: 'review', label: 'What I would adjust and why', help: band === 'elementary' ? 'What new detail changes your plan? What could you try or ask for next?' : 'Use the changed situation or feedback on your own plan. Identify what to keep, revise or ask for, and how to check whether the change helped.' };
          var oldCommAnswers = commPlanRecord(commStyleAnswers);
          var oldCommRecords = [];
          COMM_STYLE_QUESTIONS.forEach(function(question, index) {
            if (!Object.prototype.hasOwnProperty.call(oldCommAnswers, index)) return;
            var option = question.options.find(function(item) { return item.style === oldCommAnswers[index]; });
            if (option) oldCommRecords.push({ question: question.q, answer: option.text });
          });
          commStyleContent = h('section', { role: 'region', 'aria-label': 'Communication planning practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: commSurface, color: commInk, border: '1px solid ' + commEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
            h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Make a communication plan'),
            h('p', null, band === 'elementary' ? 'What will help people understand each other? Read an example together, then try a message or a way to show your idea. You can think, talk, draw or write. There is no score.' : 'Choose how to communicate for a purpose and a situation. Preferences can change with the task, people and setting. This practice does not assign personality types or tell you which teammates to choose.'),
            h('label', { htmlFor: 'teamwork-comm-choice', style: { display: 'block', fontWeight: 700 } }, 'Choose a communication example'),
            h('select', { id: 'teamwork-comm-choice', value: commCase.id, onChange: function(e) { var next = Object.assign({}, commSelections); next[band] = e.target.value; upd('communicationSelections', next); }, style: commControl }, commCases.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
            h('div', { key: commKey },
              h('h3', { style: { fontSize: 18 } }, commCase.title), h('p', null, commCase.situation), h('p', null, commCase.focus),
              h('details', { style: commDisclosure },
                h('summary', { style: commSummary }, 'Compare a worked plan'),
                [['purpose', 'Start with the purpose'], ['message', 'Make the message specific'], ['access', 'Make participation possible'], ['check', 'Check shared understanding']].map(function(part) {
                  return h('div', { key: part[0] }, h('h4', { style: { fontSize: 16 } }, part[1]), h('p', null, commCase.moves[part[0]]));
                }),
                h('p', null, 'This is one possible plan, not a required script. Ask what fits the people and situation.')),
              h('details', { style: commDisclosure },
                h('summary', { style: commSummary }, 'Build my plan (optional)'),
                h('p', null, 'Use the fictional example or a situation you choose. You can leave any part blank and discuss it instead; personal disclosure is optional.'),
                commPlanNote(commFields[0]), commPlanNote(commFields[1]),
                h('fieldset', { style: { border: '1px solid ' + commEdge, padding: 12, margin: '16px 0', borderRadius: 8, minWidth: 0 } },
                  h('legend', { style: { fontWeight: 700 } }, 'Supports to consider (optional)'),
                  h('p', null, 'Mark any that might help here, then describe how in your plan. You can change these choices. They are possibilities to agree on, not promises that support is already in place.'),
                  commSupportChoices.map(function(item) {
                    var id = 'teamwork-comm-support-' + item.key;
                    return h('div', { key: item.key, style: { margin: '8px 0' } },
                      h('label', { htmlFor: id, style: { display: 'flex', alignItems: 'center', gap: 10, minHeight: 44, cursor: 'pointer', fontWeight: 700 } },
                        h('input', { id: id, type: 'checkbox', checked: Object.prototype.hasOwnProperty.call(commSupports, item.key) && commSupports[item.key] === true, 'aria-describedby': id + '-help', onChange: function(e) { var next = Object.assign({}, commSupports); next[item.key] = e.target.checked; updateCommPlan('supports', next); }, style: { width: 22, height: 22, flexShrink: 0, accentColor: _teaHC ? '#ffff00' : '#4338ca' } }), item.label),
                      h('p', { id: id + '-help', style: { margin: '0 0 8px' } }, item.help));
                  })),
                commFields.slice(2).map(commPlanNote),
                h('p', null, 'You can ask a teacher or trusted adult for help. Clear wording does not make you responsible for harmful behavior by someone else or a refusal to provide access.')),
              h('details', { style: commDisclosure },
                h('summary', { style: commSummary }, 'Try a changed situation'), h('p', null, commCase.change),
                commPlanNote(commReviewField),
                h('details', { style: commDisclosure }, h('summary', { style: commSummary }, 'Compare a possible adjustment'), h('p', null, commCase.repair))),
              h('details', { style: commDisclosure },
                h('summary', { style: commSummary }, 'Review my communication plan'),
                h('p', null, 'This review uses only the choices and notes you added for this example. Nothing is scored, completed or sent by opening it.'),
                commFields.concat([commReviewField]).map(function(field) { return h('div', { key: field.key }, h('h4', { style: { fontSize: 16 } }, field.label), h('p', { style: { whiteSpace: 'pre-wrap' } }, commText(field.key).trim() ? commText(field.key) : 'No note added.')); }),
                h('h4', { style: { fontSize: 16 } }, 'Supports I am considering'),
                commSupportChoices.some(function(item) { return Object.prototype.hasOwnProperty.call(commSupports, item.key) && commSupports[item.key] === true; }) ? h('ul', null, commSupportChoices.filter(function(item) { return Object.prototype.hasOwnProperty.call(commSupports, item.key) && commSupports[item.key] === true; }).map(function(item) { return h('li', { key: item.key }, item.label); })) : h('p', null, 'No supports selected. You can still name another support in your notes.')),
              h('p', null, 'Choices and notes stay with this example and grade band in the current project. Use the hub save or export controls to keep them beyond this session. Review private details before sharing.')
            ),
            oldCommRecords.length > 0 && h('details', { style: commDisclosure },
              h('summary', { style: commSummary }, 'Earlier communication questionnaire'),
              h('p', null, 'These are answers from the earlier questionnaire, not a fixed communication type. Old results and generated advice remain in project data; they are not used to build this plan.'),
              oldCommRecords.map(function(record, index) { return h('div', { key: index }, h('h4', { style: { fontSize: 16 } }, record.question), h('p', { style: { whiteSpace: 'pre-wrap' } }, record.answer)); }))
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Virtual Team Simulator ──
        // ══════════════════════════════════════════════════════════
        var virtualTeamContent = null;
        if (activeTab === 'virtualteam') {
          function virtualRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
          var virtualSelections = virtualRecord(d.virtualSelections);
          var oldVirtualIndex = typeof vtScenarioIdx === 'number' && isFinite(vtScenarioIdx) && vtScenarioIdx >= 0 ? Math.floor(vtScenarioIdx) % VIRTUAL_TEAM_PRACTICE.length : 0;
          var virtualSelectedId = Object.prototype.hasOwnProperty.call(virtualSelections, band) ? virtualSelections[band] : null;
          var virtualCase = VIRTUAL_TEAM_PRACTICE.find(function(item) { return item.id === virtualSelectedId; }) || VIRTUAL_TEAM_PRACTICE[oldVirtualIndex];
          var virtualKey = band + ':' + virtualCase.id;
          var virtualDrafts = virtualRecord(d.virtualDrafts);
          var virtualDraft = virtualRecord(Object.prototype.hasOwnProperty.call(virtualDrafts, virtualKey) ? virtualDrafts[virtualKey] : null);
          var virtualSurface = _teaHC ? '#000000' : _teaL ? '#ffffff' : '#0f172a';
          var virtualInk = _teaHC ? '#ffff00' : _teaL ? '#0f172a' : '#e2e8f0';
          var virtualEdge = _teaHC ? '#ffff00' : '#64748b';
          var virtualControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + virtualEdge, borderRadius: 8, background: virtualSurface, color: virtualInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var virtualDisclosure = { borderTop: '1px solid ' + virtualEdge };
          var virtualSummary = { minHeight: 44, padding: '12px 0', fontWeight: 700, cursor: 'pointer' };
          function updateVirtualDraft(key, value) {
            var next = Object.assign({}, virtualDrafts);
            next[virtualKey] = Object.assign({}, virtualDraft);
            next[virtualKey][key] = value;
            upd('virtualDrafts', next);
          }
          function virtualNote(key, label, help) {
            var id = 'teamwork-virtual-note-' + key;
            var value = Object.prototype.hasOwnProperty.call(virtualDraft, key) && typeof virtualDraft[key] === 'string' ? virtualDraft[key] : '';
            return h('div', { style: { margin: '12px 0' } },
              h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, label + ' (optional)'),
              h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, help),
              h('textarea', { id: id, rows: 3, value: value, 'aria-describedby': id + '-help', onChange: function(e) { updateVirtualDraft(key, e.target.value); }, style: Object.assign({}, virtualControl, { resize: 'vertical', lineHeight: 1.6 }) }));
          }
          var virtualRoute = virtualCase.routes.some(function(route) { return route.id === virtualDraft.route; }) || virtualDraft.route === 'own' ? virtualDraft.route : '';
          var oldVirtualAnswers = virtualRecord(vtAnswers);
          var earlierVirtual = VIRTUAL_TEAM_SCENARIOS.filter(function(item) { var answer = oldVirtualAnswers[item.id]; return Number.isInteger(answer) && answer >= 0 && answer < item.choices.length; });
          virtualTeamContent = h('section', { role: 'region', 'aria-label': 'Virtual teamwork practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: virtualSurface, color: virtualInk, border: '1px solid ' + virtualEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
            h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Plan how to work together online'),
            h('p', null, band === 'elementary' ? 'Read a made-up example together. Think about how everyone can join the work, then try a plan with help from a teacher. You can talk, draw or write. There is no score.' : 'Compare workable ways to collaborate across screens, schedules and access needs. Cameras, quick replies and social activity are not measures of trust or effort. You can discuss an example without writing.'),
            h('label', { htmlFor: 'teamwork-virtual-choice', style: { display: 'block', fontWeight: 700 } }, 'Choose a virtual teamwork situation'),
            h('select', { id: 'teamwork-virtual-choice', value: virtualCase.id, onChange: function(e) { var next = Object.assign({}, virtualSelections); next[band] = e.target.value; upd('virtualSelections', next); }, style: virtualControl }, VIRTUAL_TEAM_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); })),
            h('div', { key: virtualKey },
              h('h3', { style: { fontSize: 18 } }, virtualCase.title), h('p', null, virtualCase.setups[band] || virtualCase.setups.elementary),
              h('details', { style: virtualDisclosure }, h('summary', { style: virtualSummary }, 'Notice the conditions before judging'), h('p', null, virtualCase.notice)),
              h('h4', { style: { fontSize: 16 } }, 'Compare possible approaches'),
              h('p', null, 'Either approach may need support or adjustment. You can combine them or propose another; there is no ranked answer.'),
              virtualCase.routes.map(function(route) { return h('details', { key: route.id, style: virtualDisclosure },
                h('summary', { style: virtualSummary }, route.title),
                h('p', null, h('strong', null, 'How it could help: '), route.helps),
                h('p', null, h('strong', null, 'What it needs: '), route.limits)); }),
              h('details', { style: virtualDisclosure },
                h('summary', { style: virtualSummary }, 'Draft a team agreement (optional)'),
                h('p', null, 'Use the fictional situation or another example you choose. Leave out identifying details. A draft is a proposal to discuss, not an agreement others have already accepted.'),
                h('label', { htmlFor: 'teamwork-virtual-route', style: { display: 'block', fontWeight: 700 } }, 'An approach to try (optional)'),
                h('select', { id: 'teamwork-virtual-route', value: virtualRoute, onChange: function(e) { updateVirtualDraft('route', e.target.value); }, style: virtualControl }, h('option', { value: '' }, 'Still deciding'), virtualCase.routes.map(function(route) { return h('option', { key: route.id, value: route.id }, route.title); }), h('option', { value: 'own' }, 'Combine approaches or use my own')),
                virtualNote('access', 'Access and boundaries to plan for', band === 'elementary' ? 'What would help people join in? What should stay private? Ask a teacher to help.' : 'Consider devices, connection, usable formats, response time, privacy and power differences. Ask what is needed without demanding personal reasons.'),
                virtualNote('agreement', 'Our proposed agreement', band === 'elementary' ? 'How could the group work together? Say how someone can join without being on camera or answering right away.' : 'Name the work channel, a workable response window and another way to contribute. Describe how everyone can consider the proposal before it becomes an agreement.'),
                virtualNote('followup', 'Who will check, and when', band === 'elementary' ? 'Who can help check the plan? When will you see whether everyone has a way to join?' : 'Identify the next check-in and who owns it. Plan what happens if access fails, a reply is missing or someone needs support. Check contributions and influence rather than visible presence.')),
              h('details', { style: virtualDisclosure },
                h('summary', { style: virtualSummary }, 'Try a changed condition'), h('p', null, virtualCase.change),
                virtualNote('revision', 'What I would revise, and why', band === 'elementary' ? 'What changed? What could you try or ask a teacher to help with now?' : 'Explain what to keep or revise, whose input is needed and how you would check that the revised process actually works.')),
              h('details', { style: virtualDisclosure }, h('summary', { style: virtualSummary }, 'Compare one possible adjustment'), h('p', null, virtualCase.model), h('p', null, 'This is one response to the changed condition. It is not a promise of cooperation. If there is repeated exclusion, pressure or harm, involve a trusted adult; a student does not have to solve it alone.')),
              h('p', null, 'Choices and notes stay with this situation and grade band in the current project. Use the hub save or export controls to keep them beyond this session. Review private details before sharing.')
            ),
            earlierVirtual.length > 0 && h('details', { style: virtualDisclosure },
              h('summary', { style: virtualSummary }, 'Earlier virtual-team choices'),
              h('p', null, 'These choices came from the earlier scored activity. They are historical records, not recommended norms or a measure of collaboration skill. They have not been copied into your new agreement.'),
              earlierVirtual.map(function(item) { return h('p', { key: item.id }, h('strong', null, VIRTUAL_TEAM_PRACTICE.find(function(current) { return current.id === item.id; }).title + ': '), item.choices[oldVirtualAnswers[item.id]].text); }))
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Conflict-to-Collaboration Converter ──
        // ══════════════════════════════════════════════════════════
        var conflictToolContent = null;
        if (activeTab === 'conflicttool') {
          function conflictRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
          var conflictSelections = conflictRecord(d.conflictSelections);
          var conflictSelected = Object.prototype.hasOwnProperty.call(conflictSelections, band) ? conflictSelections[band] : 'ideas';
          var conflictCase = CONFLICT_PRACTICE.find(function(item) { return item.id === conflictSelected; });
          if (!conflictCase && conflictSelected !== 'own') { conflictCase = CONFLICT_PRACTICE[0]; conflictSelected = conflictCase.id; }
          var conflictKey = band + ':' + conflictSelected;
          var conflictDrafts = conflictRecord(d.conflictDrafts);
          var conflictDraft = conflictRecord(Object.prototype.hasOwnProperty.call(conflictDrafts, conflictKey) ? conflictDrafts[conflictKey] : null);
          var supportFirst = !!(conflictCase && conflictCase.supportFirst);
          var conflictRoutes = [
            { id: 'talk', title: 'A voluntary conversation', text: 'Only when people can participate safely and freely: describe what you noticed, ask about the other account and compare workable next steps. Do not require agreement, forgiveness or personal disclosure. Stop and seek support if pressure or threats appear.' },
            { id: 'pause', title: 'Pause and arrange a next step', text: 'A pause can create space to think. Identify when and how to return or who can help. If there is pressure, harm or uncertainty about safety, include trusted-adult support rather than delaying help.' },
            { id: 'support', title: 'Get support from a trusted adult', text: 'Describe observable behavior and its impact, then ask for specific help. You do not have to confront the other person first. Ask who can help, who will know and when someone will follow up. If the first response does not help, try another trusted adult or the established support route.' },
            { id: 'unsure', title: 'I am unsure what support is needed', text: 'You do not need to decide whether the situation has a particular label. Ask a trusted adult to help work out what is happening and what support would be useful. Avoid guessing another person\'s motives or promising to manage the situation alone.' }
          ].filter(function(route) { return !supportFirst || route.id !== 'talk'; });
          var conflictRoute = conflictRoutes.find(function(route) { return route.id === conflictDraft.route; });
          var conflictFields = [
            { key: 'observations', label: 'What I noticed and what I do not know', help: band === 'elementary' ? 'What did you see or hear? What would you need help finding out? You can talk or draw first.' : 'Separate specific observations from assumptions. Use role labels, leave out identifying details and keep unknowns open.' },
            { key: 'needs', label: 'Needs, boundaries and support', help: band === 'elementary' ? 'What would help? What should stop? Who could help you?' : 'Name what matters and what support or boundary is needed. Do not require someone to reveal private reasons or accept harm as a compromise.' },
            { key: 'words', label: 'Words I could use or ask for help saying', help: supportFirst || !conflictRoute || conflictRoute.id !== 'talk' ? 'You can write a request for adult help or a supported pause. A direct conversation is not required. You may leave this blank.' : 'Try an observation, a specific question and a possible request. The other person may disagree; wording alone does not ensure cooperation.' },
            { key: 'next', label: 'One next step and who can help', help: band === 'elementary' ? 'What could you try with help? Who can help make it happen?' : 'Choose a feasible next step, a support person or role and what you need from them. Do not assign all the repair work to the person affected.' },
            { key: 'review', label: 'What I will check, and when', help: band === 'elementary' ? 'When will you check whether the plan helped? What if you still need help?' : 'Name a follow-up point and what would show improvement. Consider safety, access, workload and whether concerns are heard. Plan another support route if nothing changes.' }
          ];
          function conflictValue(key) { return Object.prototype.hasOwnProperty.call(conflictDraft, key) && typeof conflictDraft[key] === 'string' ? conflictDraft[key] : ''; }
          function changeConflictDraft(key, value) { var next = Object.assign({}, conflictDrafts); next[conflictKey] = Object.assign({}, conflictDraft); next[conflictKey][key] = value; upd('conflictDrafts', next); }
          var conflictSurface = _teaHC ? '#000000' : _teaL ? '#ffffff' : '#0f172a';
          var conflictInk = _teaHC ? '#ffff00' : _teaL ? '#0f172a' : '#e2e8f0';
          var conflictEdge = _teaHC ? '#ffff00' : '#64748b';
          var conflictControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + conflictEdge, borderRadius: 8, background: conflictSurface, color: conflictInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var conflictDetails = { borderTop: '1px solid ' + conflictEdge };
          var conflictSummary = { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 };
          var conflictPreview = 'CONFLICT PLAN — POSSIBLE NEXT STEPS\n' + (conflictCase ? 'Fictional example: ' + conflictCase.title : 'My own example') + '\nSupport route: ' + (conflictRoute ? conflictRoute.title : 'Still deciding') + '\nThis plan is not evidence that the situation is resolved.\n\n' + conflictFields.map(function(field) { return field.label + ':\n' + (conflictValue(field.key) || '(not recorded)'); }).join('\n\n');
          var oldConflictHistory = Array.isArray(d.conflictHistory) ? d.conflictHistory.filter(function(entry) { return entry && typeof entry === 'object' && (typeof entry.input === 'string' || typeof entry.result === 'string'); }) : [];
          var oldConflictInput = typeof d.conflictInput === 'string' ? d.conflictInput : '';
          var oldConflictResult = typeof d.conflictResult === 'string' ? d.conflictResult : '';
          conflictToolContent = h('section', { role: 'region', 'aria-label': 'Conflict planning practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: conflictSurface, color: conflictInk, border: '1px solid ' + conflictEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
            h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Choose a supported next step'),
            h('p', null, band === 'elementary' ? 'Use a made-up example or your own. You can talk, draw or write with help. A plan is something to try, not proof that a problem is fixed.' : 'Distinguish a disagreement from pressure or repeated harm, consider the support needed and plan a possible next step. You can practice with an example without writing personal details.'),
            h('p', null, 'You can seek adult help without first confronting someone. For threats, coercion or repeated harm, prioritize support and boundaries rather than compromise. These notes are not monitored and do not request help from anyone.'),
            h('label', { htmlFor: 'teamwork-conflict-context', style: { display: 'block', fontWeight: 700 } }, 'Choose a conflict practice context'),
            h('select', { id: 'teamwork-conflict-context', value: conflictSelected, style: conflictControl, onChange: function(e) { var next = Object.assign({}, conflictSelections); next[band] = e.target.value; upd('conflictSelections', next); } }, CONFLICT_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }), h('option', { value: 'own' }, 'My own example')),
            h('div', { key: conflictKey },
              h('h3', { style: { fontSize: 18 } }, conflictCase ? conflictCase.title : 'My own example'),
              h('p', null, conflictCase ? conflictCase.setups[band] || conflictCase.setups.elementary : 'Use only the details needed to think about a next step. This tool cannot determine safety or another person\'s intentions. If you are unsure, ask a trusted adult for help.'),
              conflictCase && h('p', null, conflictCase.notice),
              supportFirst && h('p', { style: { fontWeight: 700 } }, 'This example calls for adult support. Direct-conversation rehearsal is not offered for repeated pressure and exclusion.'),
              h('label', { htmlFor: 'teamwork-conflict-route', style: { display: 'block', fontWeight: 700 } }, 'A support route to consider'),
              h('select', { id: 'teamwork-conflict-route', value: conflictRoute ? conflictRoute.id : '', style: conflictControl, onChange: function(e) { changeConflictDraft('route', e.target.value); } }, h('option', { value: '' }, 'Still deciding'), conflictRoutes.map(function(route) { return h('option', { key: route.id, value: route.id }, route.title); })),
              h('div', { role: 'status', 'aria-live': 'polite', style: { margin: '12px 0' } }, conflictRoute ? conflictRoute.text : 'You can read and plan without choosing. If you are unsure, involve a trusted adult; you do not have to work it out alone.'),
              conflictRoute && conflictCase && h('details', { key: conflictRoute.id, style: conflictDetails }, h('summary', { style: conflictSummary }, 'Consider this route in the example'), h('p', null, conflictCase[conflictRoute.id] || conflictCase.support), h('p', null, 'This is one possible next step, not a promise of agreement or resolution.')),
              h('details', { style: conflictDetails }, h('summary', { style: conflictSummary }, 'Build a plan (optional)'),
                h('p', null, 'All fields are optional. Changing the support route keeps your notes; review whether they still fit.'),
                conflictFields.map(function(field) { var id = 'teamwork-conflict-' + field.key; return h('div', { key: field.key, style: { margin: '14px 0' } }, h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'), h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, field.help), h('textarea', { id: id, rows: 3, value: conflictValue(field.key), 'aria-describedby': id + '-help', onChange: function(e) { changeConflictDraft(field.key, e.target.value); }, style: Object.assign({}, conflictControl, { lineHeight: 1.6, resize: 'vertical' }) })); })),
              conflictCase && h('details', { style: conflictDetails }, h('summary', { style: conflictSummary }, 'Reconsider when something changes'), h('p', null, conflictCase.change), h('p', null, h('strong', null, 'A possible adjustment: '), conflictCase.adjust)),
              h('details', { style: conflictDetails }, h('summary', { style: conflictSummary }, 'Review my possible next steps'), h('p', null, 'Only your current context notes and route appear here. You can select and copy the text after reviewing private details. No message is sent, and no AI response is requested.'), h('label', { htmlFor: 'teamwork-conflict-preview', style: { display: 'block', fontWeight: 700 } }, 'Plan text to review or copy'), h('textarea', { id: 'teamwork-conflict-preview', readOnly: true, rows: 12, value: conflictPreview, style: Object.assign({}, conflictControl, { lineHeight: 1.6, resize: 'vertical' }) })),
              h('p', null, 'Notes and route choices stay with this context and grade band in the current project. Use the hub save or export controls to keep them beyond this session. There is no score for choosing a route or writing a plan.')
            ),
            (oldConflictInput || oldConflictResult || oldConflictHistory.length > 0) && h('details', { style: conflictDetails }, h('summary', { style: conflictSummary }, 'Earlier conflict-coach records'), h('p', null, 'These are records from the earlier AI activity, not verified advice or evidence that a conflict was resolved. They have not been copied into your new plan.'),
              oldConflictInput && h('div', null, h('h3', { style: { fontSize: 16 } }, 'Earlier input'), h('p', { style: { whiteSpace: 'pre-wrap' } }, oldConflictInput)),
              oldConflictResult && h('div', null, h('h3', { style: { fontSize: 16 } }, 'Earlier generated response'), h('p', { style: { whiteSpace: 'pre-wrap' } }, oldConflictResult)),
              oldConflictHistory.map(function(entry, index) { return h('details', { key: index, style: conflictDetails }, h('summary', { style: conflictSummary }, 'Earlier record ' + (index + 1)), typeof entry.input === 'string' && h('p', { style: { whiteSpace: 'pre-wrap' } }, entry.input), typeof entry.result === 'string' && h('p', { style: { whiteSpace: 'pre-wrap' } }, entry.result)); }))
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Team Retrospective Tool ──
        // ══════════════════════════════════════════════════════════
        var retroContent = null;
        if (activeTab === 'retro') {
          function retroRecord(value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; }
          var retroSelections = retroRecord(d.retroSelections);
          var retroChoice = Object.prototype.hasOwnProperty.call(retroSelections, band) ? retroSelections[band] : 'turns';
          var retroCase = RETRO_PRACTICE.find(function(item) { return item.id === retroChoice; });
          if (!retroCase && retroChoice !== 'own') { retroCase = RETRO_PRACTICE[0]; retroChoice = retroCase.id; }
          var retroKey = band + ':' + retroChoice;
          var retroDrafts = retroRecord(d.retroDrafts);
          var retroDraft = retroRecord(Object.prototype.hasOwnProperty.call(retroDrafts, retroKey) ? retroDrafts[retroKey] : null);
          var retroFields = [
            { key: 'evidence', label: 'What happened, and what helped', help: band === 'elementary' ? 'What did you see or hear? What helped the group? You can draw or talk first.' : 'Describe a specific event and useful conditions. Separate observations from explanations; include what is still unknown.' },
            { key: 'perspectives', label: 'Different perspectives and missing voices', help: band === 'elementary' ? 'Could someone have had a different experience? What could you ask, without making them answer?' : 'Whose experience is represented or missing? Keep different accounts separate. Do not write a guessed feeling as a fact or treat silence as agreement.' },
            { key: 'change', label: 'One change to try', help: band === 'elementary' ? 'What small change might help? What should you keep? Ask the group before calling it an agreement.' : 'Connect one feasible change to the evidence. Say what to keep, what to change and whose input is needed before trying it.' },
            { key: 'support', label: 'Support and shared responsibility', help: band === 'elementary' ? 'Who could help? What do they need? A teacher can help share the work fairly.' : 'Propose who will do what and what time, materials or adult support they need. Check capacity and agreement; do not assign extra repair work to the person affected.' },
            { key: 'check', label: 'When and how to review', help: band === 'elementary' ? 'When will you look again? What could show the change helped? Who can help you ask?' : 'Name a check-in point, a useful sign of improvement and a way to hear different experiences. Include workload, access or influence alongside the task result.' },
            { key: 'revision', label: 'What happened next, and what to revise', help: band === 'elementary' ? 'Leave this blank until you try the plan, or imagine a result for the made-up example. What helped? What still needs help?' : 'After trying the change, compare what happened with your review plan. Note benefits, limits and unexpected effects. Decide what to keep, adjust or stop; mark imagined outcomes as hypothetical.' }
          ];
          function retroValue(key) { return Object.prototype.hasOwnProperty.call(retroDraft, key) && typeof retroDraft[key] === 'string' ? retroDraft[key] : ''; }
          function updateRetroDraft(key, value) {
            var next = Object.assign({}, retroDrafts); next[retroKey] = Object.assign({}, retroDraft); next[retroKey][key] = value; upd('retroDrafts', next);
          }
          var retroSurface = _teaHC ? '#000000' : _teaL ? '#ffffff' : '#0f172a';
          var retroInk = _teaHC ? '#ffff00' : _teaL ? '#0f172a' : '#e2e8f0';
          var retroEdge = _teaHC ? '#ffff00' : '#64748b';
          var retroControl = { width: '100%', minHeight: 44, padding: 10, border: '1px solid ' + retroEdge, borderRadius: 8, background: retroSurface, color: retroInk, font: 'inherit', fontSize: 16, boxSizing: 'border-box' };
          var retroSummary = { minHeight: 44, padding: '12px 0', cursor: 'pointer', fontWeight: 700 };
          var retroDetails = { borderTop: '1px solid ' + retroEdge };
          function retroNote(field) {
            var id = 'teamwork-retro-' + field.key;
            return h('div', { key: field.key, style: { margin: '14px 0' } },
              h('label', { htmlFor: id, style: { display: 'block', fontWeight: 700 } }, field.label + ' (optional)'),
              h('p', { id: id + '-help', style: { margin: '4px 0 8px' } }, field.help),
              h('textarea', { id: id, rows: 3, value: retroValue(field.key), 'aria-describedby': id + '-help', onChange: function(e) { updateRetroDraft(field.key, e.target.value); }, style: Object.assign({}, retroControl, { lineHeight: 1.6, resize: 'vertical' }) }));
          }
          var retroTitle = retroCase ? retroCase.title : 'My own group experience';
          var retroReviewText = 'TEAM RETROSPECTIVE — PERSONAL WORKING NOTES\n' + retroTitle + '\n' + (retroCase ? 'Fictional practice example' : 'Own example; review private details before sharing') + '\nNot a record of team consent. Blank sections are still open.\n\n' + retroFields.map(function(field) { return field.label + ':\n' + (retroValue(field.key) || '(not recorded)'); }).join('\n\n');
          var earlierRetro = [{ label: 'What went well', value: d.retroGreen }, { label: 'What could improve', value: d.retroYellow }, { label: 'Action items for next time', value: d.retroBlue }].map(function(group) { return { label: group.label, items: Array.isArray(group.value) ? group.value.filter(function(item) { return typeof item === 'string'; }) : [] }; });
          var earlierRetroInputs = [d.retroGreenInput, d.retroYellowInput, d.retroBlueInput].filter(function(item) { return typeof item === 'string' && item; });
          retroContent = h('section', { role: 'region', 'aria-label': 'Team retrospective practice', style: { padding: 16, maxWidth: 760, margin: '0 auto', background: retroSurface, color: retroInk, border: '1px solid ' + retroEdge, borderRadius: 12, fontSize: 14, lineHeight: 1.65, overflowWrap: 'anywhere', minWidth: 0 } },
            h('h2', { style: { fontSize: 22, lineHeight: 1.3, marginTop: 0 } }, 'Look back, try a change, check again'),
            h('p', null, band === 'elementary' ? 'Think about how the group worked. Use a made-up example or your own. You can talk, draw or write with help. You do not have to fill every box.' : 'A retrospective connects evidence about the group process to a supported change and a later check. Use an example or your own experience; all notes are optional.'),
            h('p', null, 'These are your working notes, not a statement that everyone agrees. Leave out identifying details. You can pass on sharing or ask a trusted adult for help with repeated exclusion, pressure or harm.'),
            h('label', { htmlFor: 'teamwork-retro-choice', style: { display: 'block', fontWeight: 700 } }, 'Choose a retrospective context'),
            h('select', { id: 'teamwork-retro-choice', value: retroChoice, style: retroControl, onChange: function(e) { var next = Object.assign({}, retroSelections); next[band] = e.target.value; upd('retroSelections', next); } }, RETRO_PRACTICE.map(function(item) { return h('option', { key: item.id, value: item.id }, item.title); }), h('option', { value: 'own' }, 'My own group experience')),
            h('div', { key: retroKey },
              h('h3', { style: { fontSize: 18 } }, retroTitle),
              h('p', null, retroCase ? retroCase.setups[band] || retroCase.setups.elementary : 'Choose one specific group experience. Include enough context to understand the work, without naming people. You may leave unknowns open.'),
              retroCase && h('details', { style: retroDetails }, h('summary', { style: retroSummary }, 'Examine the example'), h('p', null, retroCase.notice)),
              h('details', { style: retroDetails }, h('summary', { style: retroSummary }, '1. Look back: evidence and perspectives'), retroFields.slice(0, 2).map(retroNote)),
              h('details', { style: retroDetails }, h('summary', { style: retroSummary }, '2. Plan one supported change'), retroFields.slice(2, 5).map(retroNote)),
              retroCase && h('details', { style: retroDetails }, h('summary', { style: retroSummary }, 'Compare a possible plan'), h('p', null, retroCase.plan), h('p', null, 'This is a proposal to discuss and adapt, not a guaranteed solution.')),
              h('details', { style: retroDetails }, h('summary', { style: retroSummary }, '3. Return after trying it'),
                h('p', null, 'It is fine to leave this part open until there is something to review. A plan is not evidence that a change has worked.'),
                retroCase && h('details', { style: retroDetails }, h('summary', { style: retroSummary }, 'Explore a fictional follow-up'), h('p', null, retroCase.later), h('p', null, h('strong', null, 'One possible revision: '), retroCase.adjust)),
                retroNote(retroFields[5])),
              h('details', { style: retroDetails }, h('summary', { style: retroSummary }, 'Review or copy my notes'),
                h('p', null, 'Only your current context notes are included. Review them before sharing. Copying does not submit them to anyone. You can also select this text and copy it yourself.'),
                h('label', { htmlFor: 'teamwork-retro-copy', style: { display: 'block', fontWeight: 700 } }, 'Review text to copy'),
                h('textarea', { id: 'teamwork-retro-copy', readOnly: true, rows: 10, value: retroReviewText, style: Object.assign({}, retroControl, { lineHeight: 1.6, resize: 'vertical' }) }),
                h('button', { type: 'button', style: Object.assign({}, retroControl, { margin: '10px 0', cursor: 'pointer', fontWeight: 700 }), onClick: function() {
                  function copyResult(ok) {
                    var message = ok ? 'Retrospective notes copied.' : 'Copy unavailable. Select the review text and copy it manually.';
                    if (typeof addToast === 'function') addToast(message, ok ? 'success' : 'info');
                    if (announceToSR) announceToSR(message);
                  }
                  try {
                    var copying = window.SelHub && typeof window.SelHub.copyText === 'function' ? window.SelHub.copyText(retroReviewText) : navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(retroReviewText).then(function() { return true; }) : false;
                    Promise.resolve(copying).then(function(ok) { copyResult(ok === true); }).catch(function() { copyResult(false); });
                  } catch (e) { copyResult(false); }
                } }, 'Copy review text')),
              h('p', null, 'Notes stay with this context and grade band in the current project. Use the hub save or export controls to keep them beyond this session. There is no completion score or required number of notes.')
            ),
            (earlierRetro.some(function(group) { return group.items.length; }) || earlierRetroInputs.length > 0) && h('details', { style: retroDetails },
              h('summary', { style: retroSummary }, 'Earlier retrospective cards'),
              h('p', null, 'Your earlier cards and unfinished card text are preserved here. They have not been assigned to a new context or copied into these notes. Earlier saved status and awards remain historical records.'),
              earlierRetro.map(function(group) { return group.items.length > 0 && h('div', { key: group.label }, h('h3', { style: { fontSize: 16 } }, group.label), group.items.map(function(item, index) { return h('p', { key: index, style: { whiteSpace: 'pre-wrap' } }, item); })); }),
              earlierRetroInputs.length > 0 && h('div', null, h('h3', { style: { fontSize: 16 } }, 'Unfinished card text'), earlierRetroInputs.map(function(item, index) { return h('p', { key: index }, item); })))
          );
        }

        // ══════════════════════════════════════════════════════════
        // ── TAB: Progress ──
        // ══════════════════════════════════════════════════════════
        var progressContent = null;
        if (activeTab === 'progress') {
          var roles2 = TEAM_ROLES[band] || TEAM_ROLES.elementary;
          var chList2 = CHALLENGES[band] || CHALLENGES.elementary;
          var answeredScenarios = SCENARIOS.filter(function(s) { var a = scenarioAnswers[s.id]; return Number.isInteger(a) && a >= 0 && a < s.choices.length; }).length;
          var perfectScenarios = 0;
          SCENARIOS.forEach(function(s) {
            var a = scenarioAnswers[s.id];
            if (Number.isInteger(a) && a >= 0 && a < s.choices.length && s.choices[a].rating === 3) perfectScenarios++;
          });
          var totalStars = 0;
          SCENARIOS.forEach(function(s) {
            var a = scenarioAnswers[s.id];
            if (Number.isInteger(a) && a >= 0 && a < s.choices.length) totalStars += s.choices[a].rating;
          });

          var vtAnsweredTotal = VIRTUAL_TEAM_SCENARIOS.filter(function(item) { var answer = vtAnswers[item.id]; return Number.isInteger(answer) && answer >= 0 && answer < item.choices.length; }).length;
          var stats = [
            { icon: '\uD83D\uDC51', label: 'Roles Selected', value: selectedRoles.length + '/' + roles2.length, color: ACCENT },
            { icon: '\uD83C\uDFD7\uFE0F', label: 'Challenges Done', value: String(challengesCompleted), color: _teaFg('#f59e0b') },
            { icon: '\uD83C\uDFAD', label: 'Earlier scenario answers', value: answeredScenarios + '/' + SCENARIOS.length, color: _teaFg('#8b5cf6') },
            { icon: '\u2B50', label: 'Earlier scenario stars', value: totalStars + '/' + (SCENARIOS.length * 3), color: _teaFg('#facc15') },
            { icon: '\uD83D\uDDE3\uFE0F', label: 'Earlier communication quiz', value: commStyleDone ? 'Completed' : 'No earlier completion', color: _teaFg('#ef4444') },
            { icon: '\uD83D\uDCBB', label: 'Earlier virtual-team answers', value: vtAnsweredTotal + '/' + VIRTUAL_TEAM_SCENARIOS.length, color: _teaFg('#3b82f6') },
            { icon: '\u267B\uFE0F', label: 'Earlier conflict-coach requests', value: String(conflictCount), color: _teaFg('#f59e0b') },
            { icon: '\uD83D\uDD04', label: 'Earlier retrospective', value: retroSaved ? 'Saved earlier' : 'No earlier save', color: _teaFg('#06b6d4') },
            { icon: '\uD83D\uDCCA', label: 'Quiz', value: quizSubmitted ? 'Done' : 'Not yet', color: _teaFg('#06b6d4') },
            { icon: '\uD83D\uDCDC', label: 'Earlier contract', value: contractSaved ? 'Saved earlier' : 'No earlier save', color: _teaFg('#a78bfa') },
            { icon: '\uD83C\uDFC5', label: 'Badges', value: Object.keys(earnedBadges).length + '/' + BADGES.length, color: _teaFg('#ec4899') },
            { icon: '\uD83D\uDCDD', label: 'Reflections', value: String(reflectionLog.length), color: _teaFg('#22d3ee') },
            { icon: '\uD83D\uDD25', label: 'Activities', value: String(practiceLog.length), color: _teaFg('#ef4444') }
          ];

          progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: _teaFg('#f1f5f9'), fontSize: 18 } }, '\uD83D\uDCCA Your Teamwork Progress'),

            // Stats grid
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 } },
              stats.map(function(s) {
                return h('div', {
                  key: s.label,
                  style: { padding: 12, borderRadius: 12, background: _teaBg('#1e293b'), border: '1px solid ' + s.color + '44', textAlign: 'center' }
                },
                  h('div', { style: { fontSize: 20 } }, s.icon),
                  h('div', { style: { fontSize: 18, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                  h('div', { style: { fontSize: 10, color: _teaFg('#94a3b8') } }, s.label)
                );
              })
            ),

            // Role profile
            selectedRoles.length > 0 && h('div', { style: { padding: 16, borderRadius: 12, background: _teaBg('#1e293b'), border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, '\uD83D\uDC51 Your Role Profile'),
              h('div', { style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
                selectedRoles.map(function(rid) {
                  var r = roles2.find(function(x) { return x.id === rid; });
                  return r ? h('span', { key: rid, style: { padding: '4px 10px', borderRadius: 20, background: ACCENT_DIM, color: ACCENT, fontSize: 12, fontWeight: 600 } }, r.emoji + ' ' + r.name) : null;
                })
              ),
              roleReflectionSaved && roleReflection && h('div', { style: { marginTop: 10, padding: 10, borderRadius: 8, background: _teaBg('#0f172a'), fontSize: 12, color: _teaFg('#94a3b8'), fontStyle: 'italic', lineHeight: 1.6 } },
                '\uD83D\uDCDD "' + roleReflection + '"'
              )
            ),

            // Badges earned
            h('div', { style: { marginBottom: 16 } },
              h('div', { style: { fontSize: 13, fontWeight: 600, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, '\uD83C\uDFC5 Badges Earned'),
              h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 } },
                BADGES.map(function(b) {
                  var earned = !!earnedBadges[b.id];
                  return h('div', {
                    key: b.id,
                    style: { padding: 10, borderRadius: 10, background: earned ? _teaBg('#1e293b') : '#0f172a', border: '1px solid ' + (earned ? ACCENT + '44' : _teaBg('#1e293b')), textAlign: 'center', opacity: earned ? 1 : 0.4 }
                  },
                    h('div', { style: { fontSize: 22 } }, earned ? b.icon : '\uD83D\uDD12'),
                    h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? _teaFg('#f1f5f9') : _teaFg('#475569'), marginTop: 2 } }, b.name)
                  );
                })
              )
            ),

            // Quick Reflections log
            reflectionLog.length > 0 && h('div', { style: { marginBottom: 16 } },
              h('h4', { style: { fontSize: 14, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, '\uD83D\uDCDD Quick Reflections'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                reflectionLog.slice(-6).reverse().map(function(entry, i) {
                  return h('div', {
                    key: i,
                    style: { padding: '8px 12px', borderRadius: 8, background: _teaBg('#0f172a'), fontSize: 12, border: '1px solid #334155' }
                  },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 } },
                      h('span', { style: { padding: '2px 8px', borderRadius: 12, background: ACCENT_DIM, color: ACCENT, fontSize: 10, fontWeight: 600 } }, entry.skill),
                      h('span', { style: { fontSize: 10, color: _teaFg('#94a3b8'), marginLeft: 'auto' } }, entry.activity + ' \u00B7 ' + new Date(entry.timestamp).toLocaleDateString())
                    ),
                    entry.note && h('div', { style: { fontSize: 11, color: _teaFg('#94a3b8'), fontStyle: 'italic' } }, '"' + entry.note + '"')
                  );
                })
              )
            ),

            // Recent practice log
            practiceLog.length > 0 && h('div', null,
              h('h4', { style: { fontSize: 14, color: _teaFg('#f1f5f9'), marginBottom: 8 } }, 'Recent Practice'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                practiceLog.slice(-8).reverse().map(function(entry, i) {
                  var icons = { role_explore: '\uD83D\uDC51', reflection: '\uD83D\uDCDD', challenge: '\uD83C\uDFD7\uFE0F', scenario: '\uD83C\uDFAD', ai_coach: '\u2728', quiz: '\uD83D\uDCCA', contract: '\uD83D\uDCDC', quick_reflection: '\uD83D\uDCDD', comm_style: '\uD83D\uDDE3\uFE0F', virtual_team: '\uD83D\uDCBB', conflict_convert: '\u267B\uFE0F', retro: '\uD83D\uDD04' };
                  var labels = { role_explore: 'Role Explored', reflection: 'Reflection', challenge: 'Challenge', scenario: 'Scenario', ai_coach: 'AI Coach', quiz: 'Skills Quiz', contract: 'Team Contract', quick_reflection: 'Quick Reflection', comm_style: 'Comm Style', virtual_team: 'Virtual Team', conflict_convert: 'Conflict Converted', retro: 'Retrospective' };
                  return h('div', {
                    key: i,
                    style: { padding: '8px 12px', borderRadius: 8, background: _teaBg('#0f172a'), display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }
                  },
                    h('span', null, icons[entry.type] || '\uD83D\uDCDD'),
                    h('span', { style: { color: _teaFg('#e2e8f0'), fontWeight: 500 } }, labels[entry.type] || entry.type),
                    h('span', { style: { marginLeft: 'auto', color: _teaFg('#94a3b8'), fontSize: 11 } }, new Date(entry.timestamp).toLocaleString())
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
          h('div', { role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),
          (window.SelHubStandards && window.SelHubStandards.render ? window.SelHubStandards.render('teamwork', h, ctx) : null),
          tabBar,
          heroBand,
          // Surface 988 / Crisis Text Line block when any AI-input turn was tier-3.
          // Persists across tab navigation until reset.
          (d._lastTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) && window.SelHub.renderCrisisResources(h, band),
          badgePopup,
          h('div', { id: 'teamwork-tab-panel', role: 'tabpanel', 'aria-labelledby': 'teamwork-tab-' + activeTab, style: { flex: 1, overflow: 'auto' } }, content)
        );
      })();
    }
  });

  console.log('[SelHub] sel_tool_teamwork.js loaded');
})();
