// ═══════════════════════════════════════════════════════════════
// sel_tool_strengths.js — Strengths Finder Plugin (v2.5)
// Discover personal strengths through guided reflection, sorting
// activities, strengths cards, growth mindset exercises, AI coach,
// strengths interview, action planner, peer strengths, affirmation
// cards, story builder, role comparison, daily challenges,
// strengths gratitude, and achievement badges.
// Registered tool ID: "strengths"
// Category: self-awareness
// Grade-adaptive: uses gradeBand for vocabulary & depth
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
    if (document.getElementById('allo-live-strengths')) return;
    var lr = document.createElement('div');
    lr.id = 'allo-live-strengths'; lr.setAttribute('aria-live', 'polite'); lr.setAttribute('aria-atomic', 'true'); lr.setAttribute('role', 'status'); lr.className = 'sr-only';
    lr.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(lr);
  })();

  // ── Accessibility scaffolding (WCAG 2.3.3 Animation from Interactions) ──
  // Reduced-motion CSS guards animated badges, progress bars, and transitions.
  (function() {
    if (document.getElementById('allo-strengths-a11y-css')) return;
    var st = document.createElement('style');
    st.id = 'allo-strengths-a11y-css';
    st.textContent = '@media (prefers-reduced-motion: reduce) { .selh-strengths *, .selh-strengths *::before, .selh-strengths *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }';
    document.head.appendChild(st);
  })();

  // ── Sound Effects ──
  var _audioCtx = null;
  function getAudioCtx() {
    if (!_audioCtx) { try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} }
    return _audioCtx;
  }
  function playTone(freq, dur, type, vol) {
    var ac = getAudioCtx(); if (!ac) return;
    try {
      var osc = ac.createOscillator(); var gain = ac.createGain();
      osc.type = type || 'sine'; osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol || 0.1, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + (dur || 0.15));
      osc.connect(gain); gain.connect(ac.destination);
      osc.start(); osc.stop(ac.currentTime + (dur || 0.15));
    } catch(e) {}
  }
  function sfxSelect() { playTone(523, 0.06, 'sine', 0.06); setTimeout(function() { playTone(659, 0.08, 'sine', 0.06); }, 60); }
  function sfxBadge() { playTone(523, 0.12, 'sine', 0.1); setTimeout(function() { playTone(659, 0.12, 'sine', 0.1); }, 100); setTimeout(function() { playTone(784, 0.15, 'sine', 0.1); }, 200); setTimeout(function() { playTone(1047, 0.2, 'sine', 0.12); }, 350); }
  function sfxComplete() { playTone(440, 0.1, 'sine', 0.08); setTimeout(function() { playTone(554, 0.1, 'sine', 0.08); }, 80); setTimeout(function() { playTone(659, 0.15, 'sine', 0.1); }, 160); }
  function sfxReflect() { playTone(392, 0.15, 'sine', 0.06); setTimeout(function() { playTone(494, 0.15, 'sine', 0.06); }, 100); }

  // ═══════════════════════════════════════════════════════════════
  // ── Strengths Data (Grade-Adaptive) ──
  // ═══════════════════════════════════════════════════════════════

  var STRENGTH_CATEGORIES = [
    {
      id: 'character', label: 'Character Strengths', emoji: '\uD83D\uDCAA', color: '#6366f1',
      strengths: {
        elementary: [
          { id: 'kind', label: 'Kindness', emoji: '\u2764\uFE0F', desc: 'Being nice and helpful to others' },
          { id: 'brave', label: 'Bravery', emoji: '\uD83E\uDDB8', desc: 'Doing the right thing even when it\'s scary' },
          { id: 'honest', label: 'Honesty', emoji: '\uD83D\uDC99', desc: 'Telling the truth and being real' },
          { id: 'curious', label: 'Curiosity', emoji: '\uD83D\uDD0D', desc: 'Wanting to learn and ask questions' },
          { id: 'fair', label: 'Fairness', emoji: '\u2696\uFE0F', desc: 'Treating everyone equally' },
          { id: 'grateful', label: 'Gratitude', emoji: '\uD83D\uDE4F', desc: 'Being thankful for what you have' },
          { id: 'funny', label: 'Humor', emoji: '\uD83D\uDE02', desc: 'Making people laugh and smile' },
          { id: 'persevere', label: 'Perseverance', emoji: '\uD83C\uDFAF', desc: 'Not giving up when things are hard' }
        ],
        middle: [
          { id: 'kind', label: 'Kindness', emoji: '\u2764\uFE0F', desc: 'Compassion and generosity toward others' },
          { id: 'brave', label: 'Bravery', emoji: '\uD83E\uDDB8', desc: 'Standing up for your values despite fear' },
          { id: 'honest', label: 'Integrity', emoji: '\uD83D\uDC99', desc: 'Being authentic and trustworthy' },
          { id: 'curious', label: 'Curiosity', emoji: '\uD83D\uDD0D', desc: 'A drive to explore and understand' },
          { id: 'fair', label: 'Fairness', emoji: '\u2696\uFE0F', desc: 'Commitment to justice and equity' },
          { id: 'grateful', label: 'Gratitude', emoji: '\uD83D\uDE4F', desc: 'Recognizing and appreciating the good' },
          { id: 'creative', label: 'Creativity', emoji: '\uD83C\uDFA8', desc: 'Thinking of new ideas and solutions' },
          { id: 'persevere', label: 'Perseverance', emoji: '\uD83C\uDFAF', desc: 'Grit — pushing through setbacks' },
          { id: 'leader', label: 'Leadership', emoji: '\uD83C\uDF1F', desc: 'Inspiring and guiding others' },
          { id: 'humble', label: 'Humility', emoji: '\uD83E\uDD32', desc: 'Being open to growth without ego' }
        ],
        high: [
          { id: 'kind', label: 'Compassion', emoji: '\u2764\uFE0F', desc: 'Deep concern for others\' well-being' },
          { id: 'brave', label: 'Moral Courage', emoji: '\uD83E\uDDB8', desc: 'Acting on convictions despite social pressure' },
          { id: 'honest', label: 'Integrity', emoji: '\uD83D\uDC99', desc: 'Consistency between values and actions' },
          { id: 'curious', label: 'Love of Learning', emoji: '\uD83D\uDD0D', desc: 'Intrinsic drive to understand the world' },
          { id: 'fair', label: 'Justice', emoji: '\u2696\uFE0F', desc: 'Advocacy for equity and systemic fairness' },
          { id: 'perspective', label: 'Perspective', emoji: '\uD83E\uDDE0', desc: 'Wisdom from integrating diverse viewpoints' },
          { id: 'creative', label: 'Creativity', emoji: '\uD83C\uDFA8', desc: 'Original thinking and innovative expression' },
          { id: 'persevere', label: 'Grit', emoji: '\uD83C\uDFAF', desc: 'Sustained effort toward long-term goals' },
          { id: 'leader', label: 'Leadership', emoji: '\uD83C\uDF1F', desc: 'Mobilizing others toward shared purpose' },
          { id: 'transcend', label: 'Transcendence', emoji: '\u2728', desc: 'Finding meaning beyond the self' }
        ]
      }
    },
    {
      id: 'talent', label: 'Talent & Skills', emoji: '\uD83C\uDF1F', color: '#f59e0b',
      strengths: {
        elementary: [
          { id: 'reading', label: 'Reading', emoji: '\uD83D\uDCDA', desc: 'Understanding stories and words' },
          { id: 'math', label: 'Math', emoji: '\uD83E\uDDEE', desc: 'Working with numbers and shapes' },
          { id: 'art', label: 'Art & Drawing', emoji: '\uD83C\uDFA8', desc: 'Creating pictures and crafts' },
          { id: 'music', label: 'Music', emoji: '\uD83C\uDFB5', desc: 'Singing, playing, or listening to music' },
          { id: 'sports', label: 'Sports & Movement', emoji: '\u26BD', desc: 'Running, jumping, playing games' },
          { id: 'helping', label: 'Helping Others', emoji: '\uD83E\uDD1D', desc: 'Being a good friend and helper' },
          { id: 'building', label: 'Building Things', emoji: '\uD83E\uDDF1', desc: 'Making things with blocks, LEGOs, or craft' },
          { id: 'animals', label: 'Nature & Animals', emoji: '\uD83D\uDC3E', desc: 'Caring for animals and exploring outside' }
        ],
        middle: [
          { id: 'writing', label: 'Writing', emoji: '\u270D\uFE0F', desc: 'Expressing ideas through words' },
          { id: 'stem', label: 'STEM', emoji: '\uD83D\uDD2C', desc: 'Science, technology, engineering, math' },
          { id: 'art', label: 'Visual Arts', emoji: '\uD83C\uDFA8', desc: 'Drawing, painting, design, photography' },
          { id: 'music', label: 'Music & Performance', emoji: '\uD83C\uDFB5', desc: 'Instruments, voice, dance, theater' },
          { id: 'sports', label: 'Athletics', emoji: '\u26BD', desc: 'Sports, fitness, and physical activities' },
          { id: 'social', label: 'Social Intelligence', emoji: '\uD83E\uDD1D', desc: 'Reading people and navigating groups' },
          { id: 'tech', label: 'Technology', emoji: '\uD83D\uDCBB', desc: 'Coding, gaming, digital creation' },
          { id: 'nature', label: 'Environmental', emoji: '\uD83C\uDF3F', desc: 'Understanding ecosystems and sustainability' },
          { id: 'language', label: 'Languages', emoji: '\uD83C\uDF10', desc: 'Learning and speaking different languages' },
          { id: 'organize', label: 'Organization', emoji: '\uD83D\uDCCB', desc: 'Planning, scheduling, keeping things in order' }
        ],
        high: [
          { id: 'writing', label: 'Communication', emoji: '\u270D\uFE0F', desc: 'Persuasive writing, public speaking, rhetoric' },
          { id: 'analytical', label: 'Analytical Thinking', emoji: '\uD83D\uDD2C', desc: 'Breaking down complex problems systematically' },
          { id: 'creative_arts', label: 'Creative Expression', emoji: '\uD83C\uDFA8', desc: 'Art, music, film, design as personal expression' },
          { id: 'physical', label: 'Physical Mastery', emoji: '\u26BD', desc: 'Athletic skill, kinesthetic intelligence' },
          { id: 'interpersonal', label: 'Interpersonal Skills', emoji: '\uD83E\uDD1D', desc: 'Mediation, mentoring, emotional intelligence' },
          { id: 'tech', label: 'Digital Fluency', emoji: '\uD83D\uDCBB', desc: 'Programming, data analysis, digital creation' },
          { id: 'entrepreneurial', label: 'Entrepreneurial', emoji: '\uD83D\uDCA1', desc: 'Initiative, resourcefulness, innovation' },
          { id: 'civic', label: 'Civic Engagement', emoji: '\uD83C\uDF10', desc: 'Activism, community organizing, advocacy' }
        ]
      }
    },
    {
      id: 'growth', label: 'Growth Areas', emoji: '\uD83C\uDF31', color: '#22c55e',
      strengths: {
        elementary: [
          { id: 'tryNew', label: 'Trying New Things', emoji: '\uD83C\uDF1F', desc: 'Being willing to do something you\'ve never done' },
          { id: 'patience', label: 'Patience', emoji: '\u23F3', desc: 'Waiting calmly without getting upset' },
          { id: 'listening', label: 'Listening', emoji: '\uD83D\uDC42', desc: 'Paying attention when others talk' },
          { id: 'sharing', label: 'Sharing', emoji: '\uD83E\uDD1D', desc: 'Letting others have a turn or use your things' }
        ],
        middle: [
          { id: 'resilience', label: 'Resilience', emoji: '\uD83C\uDF1F', desc: 'Bouncing back from failure or disappointment' },
          { id: 'selfControl', label: 'Self-Control', emoji: '\u23F3', desc: 'Managing impulses and delaying gratification' },
          { id: 'empathy', label: 'Empathy', emoji: '\uD83D\uDC42', desc: 'Understanding others\' feelings and perspectives' },
          { id: 'advocacy', label: 'Self-Advocacy', emoji: '\uD83D\uDCE3', desc: 'Speaking up for your own needs respectfully' },
          { id: 'flexibility', label: 'Flexibility', emoji: '\uD83E\uDD38', desc: 'Adapting when plans change unexpectedly' }
        ],
        high: [
          { id: 'resilience', label: 'Resilience', emoji: '\uD83C\uDF1F', desc: 'Post-traumatic growth and adaptive coping' },
          { id: 'metacognition', label: 'Metacognition', emoji: '\uD83E\uDDE0', desc: 'Thinking about your own thinking patterns' },
          { id: 'vulnerability', label: 'Vulnerability', emoji: '\uD83D\uDC99', desc: 'Courage to be open about struggles' },
          { id: 'advocacy', label: 'Self-Advocacy', emoji: '\uD83D\uDCE3', desc: 'Negotiating systems and asserting your needs' },
          { id: 'adaptability', label: 'Adaptability', emoji: '\uD83E\uDD38', desc: 'Thriving amid ambiguity and change' }
        ]
      }
    }
  ];

  // ── Reflection Prompts (Grade-Adaptive) ──
  var REFLECTION_PROMPTS = {
    elementary: [
      'What is something you\'re really good at?',
      'When do you feel most proud of yourself?',
      'What do your friends like about you?',
      'What\'s something you helped someone with recently?',
      'What do you love to do after school?',
      'If you could teach someone something, what would it be?',
      'What\'s something hard that you kept trying at?',
      'What makes you special and different from everyone else?'
    ],
    middle: [
      'What activities make you lose track of time because you enjoy them so much?',
      'What do people come to you for help with?',
      'Describe a time you overcame a challenge. What strength did you use?',
      'What values matter most to you? How do your actions reflect them?',
      'If you could spend a whole day doing anything, what would you choose?',
      'What kind of problems do you like solving?',
      'Who do you admire? What strengths do they have that you also see in yourself?',
      'How have you grown as a person this year?'
    ],
    high: [
      'What are the recurring themes in your most meaningful experiences?',
      'When have you felt most "in flow" — fully absorbed and energized?',
      'How do your strengths manifest differently across contexts (school, home, friends)?',
      'What feedback from others has surprised you about your own strengths?',
      'How do your strengths sometimes become weaknesses?',
      'What strength do you want to develop further, and why?',
      'How do your cultural background and identity shape your strengths?',
      'What would you do if you knew you couldn\'t fail?'
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Scenario Data (Grade-Adaptive Branching) ──
  // ═══════════════════════════════════════════════════════════════
  var SCENARIOS = {
    elementary: [
      { id: 'sc1', title: 'The Hard Test', setup: 'You have a big spelling test tomorrow and you don\'t feel ready. What do you do?',
        choices: [
          { text: 'Practice your words again and again until you feel better.', strength: 'persevere', feedback: 'That\'s perseverance! You didn\'t give up even when it felt hard.', rating: 3 },
          { text: 'Ask a family member to quiz you on the words.', strength: 'brave', feedback: 'That takes bravery \u2014 asking for help shows you\'re smart, not weak!', rating: 3 },
          { text: 'Just hope for the best and play instead.', strength: null, feedback: 'It\'s okay to take breaks, but a little practice goes a long way. Which strength could help you?', rating: 1 }
        ] },
      { id: 'sc2', title: 'The New Kid', setup: 'A new student joins your class and doesn\'t know anyone. They look nervous. What do you do?',
        choices: [
          { text: 'Go say hi and ask if they want to sit with you at lunch.', strength: 'kind', feedback: 'That\'s kindness in action! You made someone feel welcome.', rating: 3 },
          { text: 'Smile at them from your seat but don\'t go over.', strength: null, feedback: 'A smile is nice! But going over would use your bravery strength too.', rating: 2 },
          { text: 'Tell the teacher someone should help the new kid.', strength: 'fair', feedback: 'Good thinking! You used fairness to make sure they got help.', rating: 2 }
        ] },
      { id: 'sc3', title: 'The Broken Project', setup: 'You spent a whole week building an amazing art project, and it falls off the table and breaks. What do you do?',
        choices: [
          { text: 'Take a deep breath and start fixing what you can.', strength: 'persevere', feedback: 'Amazing perseverance! You didn\'t let a setback stop you.', rating: 3 },
          { text: 'Ask your teacher if you can have extra time to redo parts.', strength: 'brave', feedback: 'Speaking up for yourself takes courage! That\'s a real strength.', rating: 3 },
          { text: 'Get really upset and say you don\'t want to do art anymore.', strength: null, feedback: 'It\'s okay to feel upset! But which strength could help you bounce back?', rating: 1 }
        ] },
      { id: 'sc4', title: 'The Disagreement', setup: 'You and your best friend both want to be the team leader for a group project. What do you do?',
        choices: [
          { text: 'Suggest you take turns \u2014 one leads the first half, the other leads the second.', strength: 'fair', feedback: 'Brilliant! Fairness means finding solutions that work for everyone.', rating: 3 },
          { text: 'Let your friend be leader because you don\'t want to fight.', strength: 'kind', feedback: 'That\'s kind, but remember \u2014 your ideas matter too!', rating: 2 },
          { text: 'Tell your friend you should be leader because it was your idea.', strength: null, feedback: 'Having confidence is good, but fairness means listening to others too.', rating: 1 }
        ] },
      { id: 'sc5', title: 'The Mistake', setup: 'You accidentally knock over someone\'s water bottle in the hallway and it spills everywhere. What do you do?',
        choices: [
          { text: 'Say sorry right away and help clean it up.', strength: 'honest', feedback: 'That\'s honesty and responsibility! Owning your mistakes is a superpower.', rating: 3 },
          { text: 'Pretend you didn\'t see it and keep walking.', strength: null, feedback: 'It\'s natural to feel embarrassed, but being honest builds trust.', rating: 1 },
          { text: 'Go get paper towels and help clean up without saying anything.', strength: 'kind', feedback: 'Taking action shows kindness! Adding a sorry would use honesty too.', rating: 2 }
        ] }
    ],
    middle: [
      { id: 'sc1', title: 'The Group Freeloader', setup: 'Your group project partner isn\'t doing their share of the work. The deadline is tomorrow. What do you do?',
        choices: [
          { text: 'Talk to them privately and ask what\'s going on \u2014 maybe they\'re struggling.', strength: 'empathy', feedback: 'Empathy first! Understanding the situation before judging shows real maturity.', rating: 3 },
          { text: 'Do their part yourself to make sure the grade is good.', strength: 'persevere', feedback: 'Perseverance gets the job done, but advocating for yourself matters too.', rating: 2 },
          { text: 'Tell the teacher they\'re not helping.', strength: 'advocacy', feedback: 'Self-advocacy is important! Though talking to them first builds better relationships.', rating: 2 }
        ] },
      { id: 'sc2', title: 'The Viral Post', setup: 'Someone posts an embarrassing photo of a classmate in a group chat. Everyone is laughing. What do you do?',
        choices: [
          { text: 'Message the person who posted it and say it\'s not cool.', strength: 'brave', feedback: 'Standing up when everyone is going along takes real moral courage.', rating: 3 },
          { text: 'Don\'t laugh or share it, but don\'t say anything either.', strength: null, feedback: 'Not participating is better than joining in, but speaking up uses your bravery strength.', rating: 2 },
          { text: 'Check on the classmate privately to see if they\'re okay.', strength: 'kind', feedback: 'Compassion in action! You prioritized someone\'s feelings over social pressure.', rating: 3 }
        ] },
      { id: 'sc3', title: 'The Failed Tryout', setup: 'You didn\'t make the basketball team after practicing all summer. What do you do?',
        choices: [
          { text: 'Ask the coach what you can improve and make a plan for next year.', strength: 'resilience', feedback: 'Resilience! Turning rejection into a growth plan is incredibly mature.', rating: 3 },
          { text: 'Try out for a different sport or activity instead.', strength: 'flexibility', feedback: 'Flexibility! Redirecting your energy shows adaptability and self-awareness.', rating: 3 },
          { text: 'Decide sports aren\'t for you and quit trying.', strength: null, feedback: 'Disappointment is valid, but one setback doesn\'t define your abilities.', rating: 1 }
        ] },
      { id: 'sc4', title: 'The Ethical Dilemma', setup: 'You find a completed homework assignment on the floor. It belongs to someone in another class. Your homework is due today and you haven\'t finished it.',
        choices: [
          { text: 'Return the homework to the office and finish your own as best you can.', strength: 'honest', feedback: 'Integrity! Doing the right thing when no one is watching is the truest strength.', rating: 3 },
          { text: 'Copy some answers but do some of your own work too.', strength: null, feedback: 'Tempting, but integrity means your work reflects YOUR learning.', rating: 1 },
          { text: 'Ask your teacher for extra time and explain you\'re struggling.', strength: 'advocacy', feedback: 'Self-advocacy! Asking for help is always stronger than cutting corners.', rating: 3 }
        ] },
      { id: 'sc5', title: 'The Cultural Clash', setup: 'A friend makes a joke about a tradition your family celebrates. They don\'t realize it\'s hurtful.',
        choices: [
          { text: 'Explain calmly why it matters to you and your family.', strength: 'brave', feedback: 'Bravery! Educating others with patience is a powerful strength.', rating: 3 },
          { text: 'Laugh along even though it hurts inside.', strength: null, feedback: 'Your identity matters. Which strength could help you stand up for it?', rating: 1 },
          { text: 'Share something interesting about the tradition instead of confronting.', strength: 'creative', feedback: 'Creative approach! Turning a negative into a learning moment shows wisdom.', rating: 3 }
        ] }
    ],
    high: [
      { id: 'sc1', title: 'The Ethical Leader', setup: 'You\'re student council president and discover that a popular fundraiser idea involves a company with questionable labor practices. The council loves the idea.',
        choices: [
          { text: 'Research the issue and present the facts to the council, proposing alternatives.', strength: 'honest', feedback: 'Integrity-driven leadership. You balanced truth with practical solutions.', rating: 3 },
          { text: 'Go along with it since the fundraiser benefits students.', strength: null, feedback: 'Pragmatism has its place, but your values are your compass. What strength could guide you?', rating: 1 },
          { text: 'Privately suggest alternatives to the advisor without calling out the issue publicly.', strength: 'perspective', feedback: 'Strategic perspective! Sometimes the wisest path isn\'t the loudest one.', rating: 2 }
        ] },
      { id: 'sc2', title: 'The Identity Crossroads', setup: 'You\'re passionate about art, but your family expects you to pursue a "practical" career like engineering. College applications are due soon.',
        choices: [
          { text: 'Have an honest conversation about your passion and propose a path that honors both.', strength: 'brave', feedback: 'Moral courage! Advocating for your authentic self while respecting your family.', rating: 3 },
          { text: 'Apply for engineering but take art classes as electives.', strength: 'adaptability', feedback: 'Adaptability! Finding creative compromises is itself a strength.', rating: 2 },
          { text: 'Apply for art school and tell your family after.', strength: null, feedback: 'Authenticity matters, but relationships do too. What strength helps navigate both?', rating: 1 }
        ] },
      { id: 'sc3', title: 'The Systemic Injustice', setup: 'You notice that students from lower-income neighborhoods consistently get fewer resources and opportunities at your school. What do you do?',
        choices: [
          { text: 'Research the disparity, gather data, and present a proposal to the school board.', strength: 'fair', feedback: 'Justice in action! Using evidence to advocate for systemic change is the highest form of fairness.', rating: 3 },
          { text: 'Start a peer tutoring program to help bridge the gap yourself.', strength: 'leader', feedback: 'Initiative-driven leadership! You didn\'t wait for permission to make a difference.', rating: 3 },
          { text: 'Post about it on social media to raise awareness.', strength: null, feedback: 'Awareness is a start, but action creates change. Which strength could move you beyond posts?', rating: 2 }
        ] },
      { id: 'sc4', title: 'The Burnout', setup: 'You\'ve been overcommitting \u2014 AP classes, clubs, volunteer work, part-time job. You\'re exhausted and your grades are slipping.',
        choices: [
          { text: 'Evaluate priorities and let go of one commitment to protect your well-being.', strength: 'metacognition', feedback: 'Metacognition! Recognizing your own limits and acting on it is profound self-awareness.', rating: 3 },
          { text: 'Push through until the semester ends, then rest.', strength: 'persevere', feedback: 'Grit is admirable, but wisdom knows when perseverance becomes self-harm.', rating: 1 },
          { text: 'Talk to a counselor or trusted adult about feeling overwhelmed.', strength: 'vulnerability', feedback: 'Vulnerability! Asking for help when you\'re struggling is one of the bravest things you can do.', rating: 3 }
        ] }
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Strength Match Quiz Data ──
  // ═══════════════════════════════════════════════════════════════
  var MATCH_QUIZ = {
    elementary: [
      { situation: 'You see a younger kid drop their books. You stop to help pick them up.', answer: 'kind', options: ['kind', 'brave', 'curious'] },
      { situation: 'You keep trying to ride your bike even after falling down three times.', answer: 'persevere', options: ['funny', 'persevere', 'fair'] },
      { situation: 'You tell the truth about breaking the vase even though you might get in trouble.', answer: 'honest', options: ['honest', 'grateful', 'curious'] },
      { situation: 'You want to know how caterpillars turn into butterflies, so you look it up.', answer: 'curious', options: ['brave', 'kind', 'curious'] },
      { situation: 'You make sure everyone gets a turn on the swing at recess.', answer: 'fair', options: ['fair', 'funny', 'honest'] },
      { situation: 'You stand up for a kid who is being teased, even though you\'re nervous.', answer: 'brave', options: ['grateful', 'brave', 'persevere'] },
      { situation: 'You write a thank-you card for your teacher at the end of the year.', answer: 'grateful', options: ['kind', 'honest', 'grateful'] },
      { situation: 'You make funny faces to cheer up your friend who is sad.', answer: 'funny', options: ['funny', 'fair', 'brave'] }
    ],
    middle: [
      { situation: 'You notice a classmate eating alone every day, so you invite them to your table.', answer: 'kind', options: ['kind', 'leader', 'creative'] },
      { situation: 'You rewrite your essay three times to get it right before the deadline.', answer: 'persevere', options: ['humble', 'persevere', 'fair'] },
      { situation: 'You admit to your coach that you missed practice because you overslept, not because you were sick.', answer: 'honest', options: ['honest', 'brave', 'leader'] },
      { situation: 'You volunteer to lead the group project and organize tasks for everyone.', answer: 'leader', options: ['leader', 'creative', 'persevere'] },
      { situation: 'You research multiple sides of a debate before forming your opinion.', answer: 'curious', options: ['humble', 'curious', 'fair'] },
      { situation: 'You create an original design for the school mural instead of copying someone else\'s idea.', answer: 'creative', options: ['creative', 'brave', 'kind'] },
      { situation: 'You accept criticism of your science project without getting defensive.', answer: 'humble', options: ['persevere', 'humble', 'honest'] },
      { situation: 'You advocate for a classmate with a disability to be included in the field trip activities.', answer: 'fair', options: ['kind', 'brave', 'fair'] }
    ],
    high: [
      { situation: 'You challenge a popular opinion in class discussion with a well-researched alternative viewpoint.', answer: 'brave', options: ['brave', 'honest', 'creative'] },
      { situation: 'You mentor a younger student struggling with the same challenges you overcame.', answer: 'kind', options: ['kind', 'leader', 'perspective'] },
      { situation: 'You organize a community service project that addresses a local need you identified.', answer: 'leader', options: ['fair', 'leader', 'persevere'] },
      { situation: 'After failing to get into your first-choice college, you reframe it as an opportunity.', answer: 'resilience', options: ['resilience', 'adaptability', 'vulnerability'] },
      { situation: 'You recognize that your perfectionism is actually holding you back, and you choose to submit "good enough" work.', answer: 'metacognition', options: ['vulnerability', 'metacognition', 'adaptability'] },
      { situation: 'You tell your friend group you need to skip the party to take care of your mental health.', answer: 'vulnerability', options: ['brave', 'vulnerability', 'advocacy'] }
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Strengths Interview Questions (Grade-Adaptive) ──
  // ═══════════════════════════════════════════════════════════════
  var INTERVIEW_QUESTIONS = {
    elementary: [
      { id: 'iq1', question: 'When do you lose track of time because you\'re having so much fun?', hint: 'Think about activities at school, home, or with friends.' },
      { id: 'iq2', question: 'What do your friends ask you for help with?', hint: 'Maybe it\'s homework, playing games, or fixing things.' },
      { id: 'iq3', question: 'What comes easily to you that seems hard for others?', hint: 'Something you don\'t have to try very hard at.' },
      { id: 'iq4', question: 'What do you love to teach other people?', hint: 'Something you enjoy sharing or showing others.' },
      { id: 'iq5', question: 'What makes you feel proud when you finish it?', hint: 'Think about something that gives you a good feeling inside.' },
      { id: 'iq6', question: 'If you could help the world with one thing, what would it be?', hint: 'Anything at all \u2014 big or small!' },
      { id: 'iq7', question: 'What do adults in your life say you\'re really good at?', hint: 'Think about compliments from parents, teachers, or coaches.' },
      { id: 'iq8', question: 'What kind of stories or games do you like the most?', hint: 'Adventure, mystery, helping people, building things?' }
    ],
    middle: [
      { id: 'iq1', question: 'When do you lose track of time because you\'re so absorbed in what you\'re doing?', hint: 'This is called "flow" \u2014 it\'s a clue to your strengths.' },
      { id: 'iq2', question: 'What do friends or family come to you for help with?', hint: 'The things people ask for reveal what they see in you.' },
      { id: 'iq3', question: 'What comes easily to you that seems hard for others?', hint: 'Natural abilities you might take for granted.' },
      { id: 'iq4', question: 'What would you do every day if you had no limits?', hint: 'Dream big \u2014 money, time, and skills are no barrier.' },
      { id: 'iq5', question: 'What kind of problems do you enjoy solving?', hint: 'Technical, social, creative, physical?' },
      { id: 'iq6', question: 'When have you felt most like your true self?', hint: 'A moment where you thought "this is really me."' },
      { id: 'iq7', question: 'What compliments have surprised you the most?', hint: 'Sometimes others see strengths we miss in ourselves.' },
      { id: 'iq8', question: 'What topics could you talk about for hours?', hint: 'Passion is often a sign of underlying strengths.' }
    ],
    high: [
      { id: 'iq1', question: 'When do you experience "flow" \u2014 total absorption where time disappears?', hint: 'Csikszentmihalyi identified flow as the peak of engagement.' },
      { id: 'iq2', question: 'What do others consistently seek your advice or help with?', hint: 'Patterns in how others see you reveal your signature strengths.' },
      { id: 'iq3', question: 'What comes naturally to you that requires significant effort from peers?', hint: 'These effortless abilities are your most authentic strengths.' },
      { id: 'iq4', question: 'If you could solve one problem in the world, what would it be and how would you approach it?', hint: 'Your approach reveals your strength orientation.' },
      { id: 'iq5', question: 'What activities energize you rather than drain you, even when they\'re challenging?', hint: 'Strengths are not just abilities \u2014 they\'re energizers.' },
      { id: 'iq6', question: 'Describe a time you handled a difficult situation well. What qualities did you draw on?', hint: 'Crisis moments often reveal our deepest strengths.' },
      { id: 'iq7', question: 'How would your closest friend describe your greatest strengths differently than you would?', hint: 'The gap between self-perception and others\' view is revealing.' },
      { id: 'iq8', question: 'What legacy do you want to leave? What strengths would that require?', hint: 'Long-term vision connects strengths to purpose.' }
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Strengths Action Planner Data ──
  // ═══════════════════════════════════════════════════════════════
  var ACTION_SUGGESTIONS = {
    // Character strengths
    kind: [
      'Write a kind note to someone who might be having a tough day.',
      'Do a secret act of kindness without telling anyone.',
      'Compliment three people you interact with today.'
    ],
    brave: [
      'Raise your hand to answer a question you\'re not 100% sure about.',
      'Start a conversation with someone you don\'t usually talk to.',
      'Try something you\'ve been putting off because it feels scary.'
    ],
    honest: [
      'When someone asks your opinion, share your real thoughts with kindness.',
      'Admit a small mistake openly and fix it.',
      'Write in a journal about something you\'ve been avoiding being honest about.'
    ],
    curious: [
      'Look up something you\'ve always wondered about and learn 3 new facts.',
      'Ask a thoughtful question in class or at home today.',
      'Try a new hobby or activity you\'ve never done before.'
    ],
    fair: [
      'Make sure everyone gets a turn or a voice in a group activity.',
      'Stand up for someone who is being treated unfairly.',
      'Think about a rule or situation that seems unfair and brainstorm a better way.'
    ],
    grateful: [
      'Write down 3 things you\'re thankful for before bed tonight.',
      'Thank someone who helped you this week and be specific about what they did.',
      'Notice something beautiful or good that you usually take for granted.'
    ],
    funny: [
      'Make someone laugh who seems like they need it.',
      'Write a funny story, joke, or comic strip.',
      'Use humor to lighten a stressful moment (without making fun of anyone).'
    ],
    persevere: [
      'Work on something difficult for 15 minutes without giving up.',
      'Finish a task you started but didn\'t complete.',
      'When you feel like quitting, try one more time before you stop.'
    ],
    creative: [
      'Doodle, draw, or paint for at least 10 minutes.',
      'Solve a problem in an unusual or unexpected way.',
      'Teach someone a concept through a story, picture, or metaphor.'
    ],
    leader: [
      'Organize a group activity or help plan an event.',
      'Help someone who is struggling by breaking down the task for them.',
      'Set a positive example by going first when others are hesitant.'
    ],
    humble: [
      'Ask for feedback on something you made and listen without defending.',
      'Celebrate someone else\'s achievement genuinely.',
      'Admit you don\'t know something and ask for help.'
    ],
    perspective: [
      'Before reacting to a situation, consider it from two other viewpoints.',
      'Ask someone from a different background about their experience.',
      'Read or watch something that challenges your usual way of thinking.'
    ],
    transcend: [
      'Spend 10 minutes in quiet reflection or meditation.',
      'Do something meaningful for someone without any expectation of recognition.',
      'Write about what gives your life meaning or purpose.'
    ],
    // Talent strengths
    reading: ['Read for 15 minutes just for fun today.', 'Share a book recommendation with a friend.', 'Try reading something in a genre you don\'t usually choose.'],
    math: ['Solve a math puzzle or brain teaser for fun.', 'Help someone with a math problem they\'re stuck on.', 'Find math in real life \u2014 estimate distances, costs, or patterns around you.'],
    art: ['Create something visual today, even a quick sketch.', 'Try a new art medium or technique you haven\'t used before.', 'Look at the world around you and find three things that are beautiful.'],
    music: ['Listen mindfully to a song and notice the layers of sound.', 'Hum, sing, or play something that matches your mood.', 'Share a song with someone and explain why you love it.'],
    sports: ['Do a 10-minute physical challenge \u2014 push-ups, running, stretching.', 'Teach someone a sports technique or skill.', 'Try a new physical activity or movement you haven\'t done before.'],
    helping: ['Ask someone "How are you really doing?" and listen carefully.', 'Volunteer your time to help with a task someone else is doing.', 'Notice when someone needs help and offer before they ask.'],
    building: ['Build or construct something with whatever materials you have.', 'Fix or improve something that\'s broken or not working well.', 'Design a solution to a problem you see in your daily life.'],
    animals: ['Spend time outside observing nature for at least 10 minutes.', 'Learn about an animal or plant species you know nothing about.', 'Take care of a living thing \u2014 water a plant, feed a pet, tend a garden.'],
    writing: ['Write for 10 minutes about anything that comes to mind.', 'Craft a short story, poem, or letter to someone.', 'Express an opinion in writing with clear reasoning.'],
    stem: ['Explore a science question and form a hypothesis.', 'Build or code something small but functional.', 'Explain a science concept to someone in simple terms.'],
    social: ['Pay attention to body language in your next conversation.', 'Help resolve a small conflict between friends.', 'Make someone feel included who might be on the outside.'],
    tech: ['Code or build something digital for 20 minutes.', 'Teach someone a tech skill they don\'t have.', 'Learn about a new technology or tool you haven\'t used before.'],
    nature: ['Go outside and identify three plants, birds, or insects.', 'Research an environmental issue and share what you learn.', 'Reduce, reuse, or recycle something today with intention.'],
    language: ['Learn 5 new words in a language you\'re studying.', 'Practice speaking with someone in a different language.', 'Translate a favorite song or poem into another language.'],
    organize: ['Make a plan or to-do list for the rest of the week.', 'Help organize a shared space (classroom, home area).', 'Create a system or schedule to improve how something works.'],
    analytical: ['Break a complex problem into smaller parts and solve each one.', 'Analyze data or information to find a pattern or insight.', 'Evaluate two sides of a debate and form a reasoned position.'],
    creative_arts: ['Create a piece of art that expresses how you feel today.', 'Collaborate with someone on a creative project.', 'Attend or explore a form of art you haven\'t experienced before.'],
    physical: ['Set a personal fitness goal and take the first step today.', 'Teach a physical skill to someone else.', 'Try a new sport or movement practice you\'ve never done.'],
    interpersonal: ['Have a meaningful conversation where you mostly listen.', 'Mediate a disagreement with empathy for all sides.', 'Check in with someone you haven\'t connected with recently.'],
    entrepreneurial: ['Identify a problem and brainstorm 3 possible solutions.', 'Create a small project or initiative from scratch.', 'Interview someone about how they started something from nothing.'],
    civic: ['Learn about a community issue and one thing you can do about it.', 'Volunteer or participate in a community event.', 'Write a letter or email to a decision-maker about something that matters to you.'],
    // Growth strengths
    tryNew: ['Try one new food, activity, or experience today.', 'Say "yes" to something you\'d normally say "no" to.', 'Take a different route or do a routine thing in a new way.'],
    patience: ['Practice waiting calmly for something without checking the time.', 'Take 3 deep breaths before responding when you feel frustrated.', 'Work on a puzzle, craft, or task that requires slow, careful effort.'],
    listening: ['In your next conversation, focus only on listening \u2014 don\'t plan what to say.', 'Ask a follow-up question after someone finishes talking.', 'Listen to a podcast or audiobook about a topic someone else loves.'],
    sharing: ['Share something you value with someone today.', 'Give someone the first turn or the better option.', 'Offer your time, attention, or help to someone who needs it.'],
    resilience: ['Reflect on a past failure and write down what you learned from it.', 'When something goes wrong today, name one positive thing about the situation.', 'Create a "resilience toolkit" \u2014 3 things you do when life gets hard.'],
    selfControl: ['Pause for 10 seconds before reacting to something frustrating.', 'Choose a healthy option when tempted by an easy but less good one.', 'Set a timer and focus on one task without distractions.'],
    empathy: ['Imagine a day in the life of someone very different from you.', 'Ask someone about their feelings and really listen to the answer.', 'Notice when someone around you seems upset and offer support.'],
    advocacy: ['Speak up about something you need in a respectful, clear way.', 'Practice saying "I need..." or "I feel..." in a real conversation.', 'Help someone else find the words to express their needs.'],
    flexibility: ['When plans change unexpectedly, notice your reaction and adapt.', 'Try solving a problem in a completely different way than usual.', 'Embrace an imperfect outcome and find something good in it.'],
    metacognition: ['Spend 5 minutes writing about how you think and learn best.', 'After a conversation, reflect on what you were thinking and why.', 'Notice a thinking pattern (positive or negative) and name it.'],
    vulnerability: ['Share something you\'re struggling with with a trusted person.', 'Admit you don\'t have all the answers about something important.', 'Write about a fear and what it would mean to face it.'],
    adaptability: ['Change your approach to a task mid-way and see what happens.', 'Seek out a situation that\'s outside your comfort zone.', 'When faced with ambiguity, make a decision and adjust as you go.']
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Strengths Affirmation Cards ──
  // ═══════════════════════════════════════════════════════════════
  var AFFIRMATION_CARDS = {
    character: [
      'I am brave enough to do what\'s right, even when it\'s hard.',
      'My kindness makes the world a better place.',
      'I am honest with myself and others, and that is powerful.',
      'My curiosity leads me to discover amazing things.',
      'I treat people fairly because everyone deserves respect.',
      'I choose gratitude, and it fills me with strength.',
      'My sense of humor brings light into dark moments.',
      'I don\'t give up. Every step forward counts.'
    ],
    talent: [
      'My skills grow every time I practice.',
      'I have unique talents that only I can offer the world.',
      'I am creative in ways that surprise even me.',
      'My abilities are real, and I deserve to be proud of them.',
      'Learning comes naturally to me when I follow my passion.',
      'I can do hard things because I have practiced hard things.',
      'My talents are seeds \u2014 with effort, they become forests.',
      'I bring something special to every group I\'m part of.'
    ],
    growth: [
      'Every challenge makes me stronger than I was before.',
      'I am learning, growing, and becoming who I\'m meant to be.',
      'Mistakes are my teachers, not my enemies.',
      'I am patient with myself as I grow.',
      'Asking for help is one of the bravest things I can do.',
      'I can adapt to anything life throws my way.',
      'My struggles today are building my strength for tomorrow.',
      'I am not perfect, and that is perfectly okay.'
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Story Builder Prompts (Grade-Adaptive) ──
  // ═══════════════════════════════════════════════════════════════
  var STORY_PROMPTS = {
    elementary: [
      { id: 'when', label: 'When did this happen?', hint: 'Was it at school, home, or somewhere else? What time of year?' },
      { id: 'challenge', label: 'What was the challenge?', hint: 'What was hard or tricky about the situation?' },
      { id: 'used', label: 'How did you use your [STRENGTH]?', hint: 'What did you do? What did you say?' },
      { id: 'result', label: 'What happened next?', hint: 'Did things get better? What changed?' },
      { id: 'feel', label: 'How did it make you feel?', hint: 'Happy? Proud? Brave? Describe your feelings.' }
    ],
    middle: [
      { id: 'when', label: 'Set the scene \u2014 when and where did this happen?', hint: 'Give us the context. What was going on in your life at that time?' },
      { id: 'challenge', label: 'What was the challenge you faced?', hint: 'What made this situation difficult or important?' },
      { id: 'used', label: 'How did you use your [STRENGTH] to respond?', hint: 'Describe the specific actions you took and why.' },
      { id: 'result', label: 'What was the outcome?', hint: 'How did things turn out? What changed because of your actions?' },
      { id: 'feel', label: 'How did this experience shape you?', hint: 'What did you learn about yourself? How did it make you feel?' }
    ],
    high: [
      { id: 'when', label: 'Set the scene \u2014 context, time, and circumstances.', hint: 'Help us understand the full situation and what was at stake.' },
      { id: 'challenge', label: 'What was the core challenge or tension?', hint: 'What made this moment significant? What values or needs were in conflict?' },
      { id: 'used', label: 'How did your [STRENGTH] manifest in your response?', hint: 'Describe your thought process and actions. How was this strength essential?' },
      { id: 'result', label: 'What were the consequences \u2014 intended and unintended?', hint: 'What ripple effects did your actions have? What surprised you?' },
      { id: 'feel', label: 'How did this experience deepen your self-understanding?', hint: 'What did you learn about this strength and yourself? How have you grown?' }
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Role Profiles for Strengths Comparison ──
  // ═══════════════════════════════════════════════════════════════
  var ROLE_PROFILES = {
    studentLeader: {
      label: 'Student Leader',
      emoji: '\uD83D\uDC51',
      color: '#818cf8',
      desc: 'Someone who inspires, organizes, and guides others toward shared goals.',
      strengths: ['leader', 'brave', 'fair', 'honest', 'persevere', 'advocacy']
    },
    creativeArtist: {
      label: 'Creative Artist',
      emoji: '\uD83C\uDFA8',
      color: '#f472b6',
      desc: 'A person who expresses ideas through art, music, writing, or design.',
      strengths: ['creative', 'art', 'music', 'curious', 'creative_arts', 'writing']
    },
    stemThinker: {
      label: 'STEM Thinker',
      emoji: '\uD83D\uDD2C',
      color: '#34d399',
      desc: 'An analytical mind who loves solving problems with science, math, and technology.',
      strengths: ['curious', 'analytical', 'math', 'stem', 'tech', 'persevere']
    },
    socialConnector: {
      label: 'Social Connector',
      emoji: '\uD83E\uDD1D',
      color: '#fbbf24',
      desc: 'Someone who brings people together, builds friendships, and reads social situations.',
      strengths: ['kind', 'empathy', 'social', 'interpersonal', 'funny', 'helping']
    },
    communityHelper: {
      label: 'Community Helper',
      emoji: '\uD83C\uDF0D',
      color: '#22c55e',
      desc: 'A person who works to make their community better and advocates for others.',
      strengths: ['fair', 'civic', 'helping', 'kind', 'advocacy', 'leader']
    },
    athlete: {
      label: 'Athlete',
      emoji: '\u26BD',
      color: '#f97316',
      desc: 'Someone who excels through physical skill, discipline, and teamwork.',
      strengths: ['sports', 'physical', 'persevere', 'resilience', 'selfControl', 'brave']
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Daily Strength Challenges ──
  // ═══════════════════════════════════════════════════════════════
  var DAILY_CHALLENGES = {
    kind: [
      'Write an anonymous kind note and leave it for someone to find.',
      'Compliment someone you wouldn\u0027t normally talk to.',
      'Help someone with a task before they ask you.'
    ],
    brave: [
      'Raise your hand first in class today, even if you\u0027re unsure.',
      'Start a conversation with someone new.',
      'Share an unpopular opinion respectfully in a group discussion.'
    ],
    honest: [
      'Admit one mistake you made today and take responsibility.',
      'Give someone genuine, kind feedback on their work.',
      'Write in a journal about something you\u0027ve been avoiding.'
    ],
    curious: [
      'Ask three \u0022why?\u0022 questions about something you see today.',
      'Research a topic you know nothing about for 10 minutes.',
      'Try a food, game, or activity you\u0027ve never tried before.'
    ],
    fair: [
      'Make sure everyone in a group gets a chance to speak.',
      'Notice if anyone is left out today and include them.',
      'Think of a rule you disagree with and consider the other side.'
    ],
    grateful: [
      'Tell three people specifically what you appreciate about them.',
      'Write down five things you\u0027re grateful for right now.',
      'Send a thank-you message to someone who helped you recently.'
    ],
    funny: [
      'Make someone laugh who looks like they need it.',
      'Write a silly poem, joke, or comic strip.',
      'Find the humor in a frustrating situation today.'
    ],
    persevere: [
      'Work on your hardest task first thing today.',
      'When you want to quit something, push through for 5 more minutes.',
      'Revisit something you gave up on and try again.'
    ],
    creative: [
      'Doodle or sketch something during your free time today.',
      'Come up with three unusual solutions to an everyday problem.',
      'Express your mood through a short poem or drawing.'
    ],
    leader: [
      'Volunteer to organize or lead a group activity today.',
      'Help someone who\u0027s struggling without being asked.',
      'Set a positive example by being the first to try something.'
    ],
    humble: [
      'Ask someone for honest feedback on something you did.',
      'Celebrate someone else\u0027s achievement out loud today.',
      'Learn something new from someone younger than you.'
    ],
    empathy: [
      'Ask someone \u0022How are you really doing?\u0022 and truly listen.',
      'Try to see a disagreement completely from the other person\u0027s side.',
      'Notice someone\u0027s body language today and check in on them.'
    ],
    resilience: [
      'When something goes wrong today, find one silver lining.',
      'Write about a past failure and what it taught you.',
      'Encourage someone else who is going through a hard time.'
    ],
    sports: [
      'Do a 10-minute physical challenge \u2014 push-ups, stretches, or a jog.',
      'Teach someone a sports skill or movement technique.',
      'Try a brand-new physical activity you\u0027ve never done.'
    ],
    reading: [
      'Read for 15 minutes purely for enjoyment.',
      'Recommend a book or article to a friend today.',
      'Read something outside your usual genre.'
    ],
    math: [
      'Solve a math puzzle or brain teaser just for fun.',
      'Find math in the real world \u2014 estimate, measure, or calculate something.',
      'Help someone with a math concept they\u0027re stuck on.'
    ],
    art: [
      'Create something visual today, even a quick 5-minute sketch.',
      'Find three beautiful things around you and really notice them.',
      'Try a new art technique or medium you haven\u0027t used.'
    ],
    music: [
      'Listen deeply to a song and notice instruments, rhythm, and emotion.',
      'Hum or sing something that matches your mood.',
      'Share a favorite song with someone and tell them why you love it.'
    ],
    helping: [
      'Offer to help with a task without being asked.',
      'Check in with a friend you haven\u0027t talked to recently.',
      'Volunteer 15 minutes of your time to help someone today.'
    ],
    flexibility: [
      'When plans change today, adapt without complaining.',
      'Try doing a routine task in a completely new way.',
      'Say yes to something unexpected that comes up.'
    ],
    selfControl: [
      'Pause for 10 seconds before reacting to frustration today.',
      'Set a timer and focus on one task without checking your phone.',
      'Choose the harder-but-better option when tempted by the easy one.'
    ],
    advocacy: [
      'Speak up about something you need in a clear, respectful way.',
      'Help someone else find words to express what they need.',
      'Practice one \u0022I feel... because...\u0022 statement in a real conversation.'
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Gratitude Prompts (Grade-Adaptive) ──
  // ═══════════════════════════════════════════════════════════════
  var GRATITUDE_PROMPTS = {
    elementary: [
      'I\u0027m grateful that [person] is so [strength] because...',
      'Someone showed me [strength] when they...',
      'I feel lucky to know someone who is really good at [strength] because...',
      'Thank you to the person who used [strength] to help me when...'
    ],
    middle: [
      'I appreciate [person]\u0027s [strength] because it showed me...',
      'Someone\u0027s [strength] made a real difference in my life when...',
      'I\u0027m grateful for the way [person] uses their [strength] to...',
      'I noticed someone\u0027s [strength] today and it mattered because...',
      'The world is better because [person] has the strength of [strength]. Here\u0027s why...'
    ],
    high: [
      'I\u0027m grateful for [person]\u0027s [strength] because it taught me something about...',
      'Someone\u0027s [strength] changed my perspective on...',
      'I want to express gratitude for how [person] uses [strength] to impact others by...',
      'The strength of [strength] in [person] reminds me that...',
      'Reflecting on [person]\u0027s [strength] makes me realize...',
      'I\u0027m deeply grateful for the way [person]\u0027s [strength] creates ripple effects in...'
    ]
  };

  // ═══════════════════════════════════════════════════════════════
  // ── Peer Strengths Prompts ──
  // ═══════════════════════════════════════════════════════════════
  var PEER_PROMPTS = {
    elementary: [
      'Someone in my class is really good at helping others. They always...',
      'I noticed someone being brave today when they...',
      'Someone I know is great at making people laugh because...',
      'A person I admire never gives up, even when...'
    ],
    middle: [
      'I see leadership in someone who...',
      'Someone in my life shows real empathy when they...',
      'I admire someone\'s creativity because they...',
      'Someone I know demonstrates integrity by...',
      'A person in my community shows resilience when...'
    ],
    high: [
      'I observe moral courage in someone who...',
      'Someone in my life models vulnerability by...',
      'A person I respect demonstrates perspective-taking when they...',
      'I see authentic leadership in someone who...',
      'Someone shows adaptability in the way they...'
    ]
  };

  var ASK_FRIEND_TEMPLATES = [
    'If you had to describe my biggest strength in one word, what would it be?',
    'What\'s something I do well that I might not realize?',
    'When have you seen me at my best? What was I doing?',
    'What do you think I\'m naturally good at?',
    'If you needed help with something, what would you come to me for?'
  ];

  // ═══════════════════════════════════════════════════════════════
  // ── Deep Reflection Prompts (Grade-Adaptive, 5+ per band) ──
  // ═══════════════════════════════════════════════════════════════
  var DEEP_REFLECTION_PROMPTS = {
    elementary: [
      'When has being really good at something made things harder for you?',
      'What strength do you see in someone who looks or acts differently from you?',
      'How would your best friend describe what you\'re good at?',
      'If you could give one of your strengths to a friend, which would you pick and why?',
      'What is something you used to be bad at that you\'re getting better at?',
      'Think of someone you admire. What strength do they have that you want to grow?'
    ],
    middle: [
      'When has a strength become a weakness for you? (Example: being too kind and not setting boundaries.)',
      'What strength do you admire in someone from a different background than yours?',
      'How would your best friend describe your strengths vs. how you\'d describe them?',
      'What strength do you hide because you\'re afraid of what people will think?',
      'How does your mood affect which strengths you can access?',
      'If you couldn\'t use your top strength for a week, how would your life change?',
      'What strength do you wish your school valued more?'
    ],
    high: [
      'When has a strength become a weakness for you, and how did you recalibrate?',
      'What strength do you admire in someone from a vastly different background or worldview?',
      'How would your best friend describe your strengths vs. how you\'d describe them? What accounts for the difference?',
      'What strength do you suppress in certain contexts, and why?',
      'How have your strengths evolved over the past few years? What drove those changes?',
      'What is the relationship between your identity and your strengths?',
      'How do power dynamics affect which strengths get recognized in your community?',
      'If your strengths were a team, which one would be the captain and which would be the underdog?'
    ]
  };

  // ── Badges (expanded) ──
  var BADGES = {
    firstCard: { icon: '\u2B50', name: 'First Discovery', desc: 'Select your first strength' },
    fiveCards: { icon: '\uD83C\uDF1F', name: 'Self-Aware', desc: 'Identify 5 strengths' },
    tenCards: { icon: '\uD83D\uDCAA', name: 'Strength Spotter', desc: 'Identify 10 strengths' },
    allCategories: { icon: '\uD83C\uDF08', name: 'Well-Rounded', desc: 'Strengths in all 3 categories' },
    firstReflection: { icon: '\uD83D\uDCDD', name: 'Reflective Mind', desc: 'Complete a reflection' },
    threeReflections: { icon: '\uD83D\uDCD6', name: 'Deep Thinker', desc: 'Complete 3 reflections' },
    growthMindset: { icon: '\uD83C\uDF31', name: 'Growth Mindset', desc: 'Identify a growth area' },
    aiCoach: { icon: '\uD83E\uDD16', name: 'Coaching Session', desc: 'Ask the AI strengths coach' },
    sharedStrengths: { icon: '\uD83D\uDCE4', name: 'Strength Sharer', desc: 'Export your strengths profile' },
    firstScenario: { icon: '\uD83C\uDFAD', name: 'Strength Applier', desc: 'Complete a scenario' },
    threeScenarios: { icon: '\uD83C\uDFC6', name: 'Scenario Pro', desc: 'Complete 3 scenarios with top rating' },
    allScenarios: { icon: '\uD83D\uDC51', name: 'Master Strategist', desc: 'Complete all scenarios' },
    firstQuiz: { icon: '\uD83E\uDDE9', name: 'Strength Detective', desc: 'Score 3+ on the match quiz' },
    perfectQuiz: { icon: '\uD83C\uDFAF', name: 'Perfect Match', desc: 'Get a perfect quiz score' },
    fiveReflections: { icon: '\uD83D\uDCDA', name: 'Philosopher', desc: 'Complete 5 reflections' },
    explorer: { icon: '\uD83D\uDE80', name: 'Full Explorer', desc: 'Visit all tabs' },
    interviewComplete: { icon: '\uD83C\uDF99\uFE0F', name: 'Interview Complete', desc: 'Finish the Strengths Interview' },
    actionPlanner: { icon: '\uD83D\uDCCB', name: 'Action Planner', desc: 'Complete 3 action items' },
    peerObserver: { icon: '\uD83D\uDC41\uFE0F', name: 'Peer Observer', desc: 'Record strengths you see in others' },
    affirmationPractice: { icon: '\uD83D\uDCAC', name: 'Affirmation Practice', desc: 'Read 5 affirmation cards' },
    deepThinkerPlus: { icon: '\uD83E\uDDE0', name: 'Insight Seeker', desc: 'Answer 3 deep reflection prompts' },
    storyWriter: { icon: '\uD83D\uDCDD', name: 'Story Writer', desc: 'Write your first strengths story' },
    roleExplorer: { icon: '\uD83D\uDD0D', name: 'Role Explorer', desc: 'Compare strengths to 3 different roles' },
    dailyChallenger: { icon: '\u26A1', name: 'Daily Challenger', desc: 'Complete 3 daily strength challenges' },
    gratitudeGiver: { icon: '\uD83D\uDE4F', name: 'Gratitude Giver', desc: 'Write 3 gratitude entries for others\u0027 strengths' }
  };

  function checkBadges(d, awardXP, addToast) {
    var earned = d.badges || {};
    var selected = d.selectedStrengths || [];
    var reflections = d.reflections || [];
    var scenariosDone = d.scenariosDone || [];
    var topScenarios = d.topScenarios || 0;
    var quizBest = d.quizBest || 0;
    var changed = false;
    function award(id) {
      if (!BADGES[id] || earned[id]) return;
      earned[id] = true; changed = true;
      sfxBadge();
      if (awardXP) awardXP(10);
      if (addToast) addToast(BADGES[id].icon + ' Badge: ' + BADGES[id].name + ' \u2014 ' + BADGES[id].desc, 'success');
    }
    if (selected.length >= 1) award('firstCard');
    if (selected.length >= 5) award('fiveCards');
    if (selected.length >= 10) award('tenCards');
    if (reflections.length >= 1) award('firstReflection');
    if (reflections.length >= 3) award('threeReflections');
    if (reflections.length >= 5) award('fiveReflections');
    var cats = {};
    selected.forEach(function(s) { if (s.category) cats[s.category] = true; });
    if (Object.keys(cats).length >= 3) award('allCategories');
    if (selected.some(function(s) { return s.category === 'growth'; })) award('growthMindset');
    if (d.aiAsked) award('aiCoach');
    if (d.exported) award('sharedStrengths');
    if (scenariosDone.length >= 1) award('firstScenario');
    if (topScenarios >= 3) award('threeScenarios');
    if (scenariosDone.length >= 5) award('allScenarios');
    if (quizBest >= 3) award('firstQuiz');
    var quizLen = (MATCH_QUIZ.elementary || []).length;
    if (quizBest >= quizLen && quizLen > 0) award('perfectQuiz');
    if (d.tabsVisited && d.tabsVisited.length >= 10) award('explorer');
    if (d.interviewComplete) award('interviewComplete');
    var actionsCompleted = d.actionsCompleted || 0;
    if (actionsCompleted >= 3) award('actionPlanner');
    var peerNotes = d.peerNotes || [];
    if (peerNotes.length >= 1) award('peerObserver');
    var affirmationsRead = d.affirmationsRead || 0;
    if (affirmationsRead >= 5) award('affirmationPractice');
    var deepReflections = d.deepReflections || [];
    if (deepReflections.length >= 3) award('deepThinkerPlus');
    var stories = d.stories || [];
    if (stories.length >= 1) award('storyWriter');
    var rolesExplored = d.rolesExplored || [];
    if (rolesExplored.length >= 3) award('roleExplorer');
    var challengesDone = d.challengesDone || 0;
    if (challengesDone >= 3) award('dailyChallenger');
    var gratitudeEntries = d.gratitudeEntries || [];
    if (gratitudeEntries.length >= 3) award('gratitudeGiver');
    return changed ? earned : null;
  }

  // ═══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ═══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('strengths', {
    icon: '\u2B50',
    label: 'Strengths Finder',
    desc: 'Discover and reflect on personal strengths, talents, and growth areas.',
    color: 'amber',
    category: 'self-awareness',

    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var toolData = ctx.toolData;
      var setToolData = ctx.setToolData;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var gradeLevel = ctx.gradeLevel;
      var t = ctx.t || function(k) { return k; };

      return (function() {
        var d = (toolData && toolData.strengths) || {};
        var upd = function(obj) {
          setToolData(function(prev) {
            var s = Object.assign({}, (prev && prev.strengths) || {}, obj);
            return Object.assign({}, prev, { strengths: s });
          });
        };

        var band = (function() {
          var g = parseInt(gradeLevel) || 5;
          if (g <= 2) return 'elementary';
          if (g <= 5) return 'elementary';
          if (g <= 8) return 'middle';
          return 'high';
        })();

        var tab = d.tab || 'discover';
        var selectedStrengths = d.selectedStrengths || [];
        var reflections = d.reflections || [];
        var reflectionInput = d.reflectionInput || '';
        var currentPromptIdx = d.currentPromptIdx || 0;
        var aiResponse = d.aiResponse || '';
        var aiLoading = d.aiLoading || false;
        var aiInput = d.aiInput || '';
        var showBadges = d.showBadges || false;
        var badges = d.badges || {};
        var badgeCount = Object.keys(badges).length;
        // Scenario state
        var scenariosDone = d.scenariosDone || [];
        var topScenarios = d.topScenarios || 0;
        var scenarioIdx = d.scenarioIdx || 0;
        var scenarioChoice = d.scenarioChoice || null;
        // Quiz state
        var quizActive = d.quizActive || false;
        var quizIdx = d.quizIdx || 0;
        var quizScore = d.quizScore || 0;
        var quizBest = d.quizBest || 0;
        var quizFeedback = d.quizFeedback || null;
        var quizDone = d.quizDone || false;
        // Tab tracking for explorer badge
        var tabsVisited = d.tabsVisited || [];

        // ── Badge check on state change ──
        React.useEffect(function() {
          var newBadges = checkBadges(d, awardXP, addToast);
          if (newBadges) upd({ badges: newBadges });
        }, [selectedStrengths.length, reflections.length, d.aiAsked, d.exported, scenariosDone.length, topScenarios, quizBest, tabsVisited.length, d.interviewComplete, d.actionsCompleted, (d.peerNotes || []).length, d.affirmationsRead, (d.deepReflections || []).length, (d.stories || []).length, (d.rolesExplored || []).length, d.challengesDone, (d.gratitudeEntries || []).length]);

        // ── Toggle strength selection ──
        var toggleStrength = function(strength, categoryId) {
          sfxSelect();
          var exists = selectedStrengths.find(function(s) { return s.id === strength.id && s.category === categoryId; });
          var next;
          if (exists) {
            next = selectedStrengths.filter(function(s) { return !(s.id === strength.id && s.category === categoryId); });
          } else {
            next = selectedStrengths.concat([{ id: strength.id, label: strength.label, emoji: strength.emoji, category: categoryId }]);
          }
          upd({ selectedStrengths: next });
        };

        var isSelected = function(strengthId, categoryId) {
          return selectedStrengths.some(function(s) { return s.id === strengthId && s.category === categoryId; });
        };

        // ── Save reflection ──
        var saveReflection = function() {
          if (!reflectionInput.trim()) return;
          sfxComplete();
          var prompts = REFLECTION_PROMPTS[band] || REFLECTION_PROMPTS.elementary;
          var newReflections = reflections.concat([{
            prompt: prompts[currentPromptIdx % prompts.length],
            response: reflectionInput.trim(),
            timestamp: Date.now()
          }]);
          upd({
            reflections: newReflections,
            reflectionInput: '',
            currentPromptIdx: (currentPromptIdx + 1) % prompts.length
          });
          if (addToast) addToast('\uD83D\uDCDD Reflection saved!', 'success');
        };

        // ── AI Coach ──
        var askAI = function() {
          if (!callGemini || aiLoading) return;
          sfxReflect();
          var question = aiInput.trim() || 'Based on my selected strengths, give me personalized advice.';
          var strengthList = selectedStrengths.map(function(s) { return s.emoji + ' ' + s.label; }).join(', ') || 'None selected yet';
          var prompt = 'You are a warm, encouraging strengths-based coach for a ' + band + ' school student (grade level: ' + gradeLevel + '). ' +
            'Their selected strengths are: ' + strengthList + '. ' +
            'They have completed ' + reflections.length + ' reflections. ' +
            'Their question/request: "' + question + '"\n\n' +
            'Respond in 2-3 sentences. Be specific to their strengths. ' +
            (band === 'elementary' ? 'Use simple, warm language. Add an encouraging emoji.' :
             band === 'middle' ? 'Be relatable and affirming. Reference their specific strengths.' :
             'Be thoughtful and nuanced. Help them see connections between their strengths.');
          upd({ aiLoading: true, aiInput: '' });
          callGemini(prompt, false, false, 0.8).then(function(resp) {
            upd({ aiResponse: resp || 'Great question! Keep exploring your strengths.', aiLoading: false, aiAsked: true });
          }).catch(function() {
            upd({ aiResponse: 'AI coach is unavailable right now. Keep reflecting on your strengths!', aiLoading: false });
          });
        };

        // ── Export Profile ──
        var exportProfile = function() {
          sfxComplete();
          var text = '\u2B50 MY STRENGTHS PROFILE\n\n';
          text += 'Grade: ' + gradeLevel + '\nDate: ' + new Date().toLocaleDateString() + '\n\n';
          text += '\u2500\u2500\u2500 STRENGTHS (' + selectedStrengths.length + ') \u2500\u2500\u2500\n';
          STRENGTH_CATEGORIES.forEach(function(cat) {
            var catStrengths = selectedStrengths.filter(function(s) { return s.category === cat.id; });
            if (catStrengths.length > 0) {
              text += '\n' + cat.emoji + ' ' + cat.label + ':\n';
              catStrengths.forEach(function(s) { text += '  ' + s.emoji + ' ' + s.label + '\n'; });
            }
          });
          if (reflections.length > 0) {
            text += '\n\u2500\u2500\u2500 REFLECTIONS (' + reflections.length + ') \u2500\u2500\u2500\n';
            reflections.forEach(function(r) {
              text += '\nQ: ' + r.prompt + '\nA: ' + r.response + '\n';
            });
          }
          text += '\n\uD83C\uDFC5 Badges: ' + badgeCount + '/' + Object.keys(BADGES).length + '\n';
          navigator.clipboard.writeText(text).then(function() {
            if (addToast) addToast('\uD83D\uDCCB Strengths profile copied to clipboard!', 'success');
          }).catch(function() {});
          upd({ exported: true });
        };

        // ── Speak text ──
        var speak = function(text) {
          if (callTTS) callTTS(text);
        };

        var prompts = REFLECTION_PROMPTS[band] || REFLECTION_PROMPTS.elementary;
        var currentPrompt = prompts[currentPromptIdx % prompts.length];

        // ═══════════════════════════════════════════════════════════
        // ── UI ──
        // ═══════════════════════════════════════════════════════════
        var accentColor = '#f59e0b';
        var bgDark = '#0f172a';

        return h('div', { className: 'selh-strengths', style: { display: 'flex', flexDirection: 'column', height: '100%', background: bgDark, color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },
          h('div', { 'aria-live': 'polite', 'aria-atomic': 'true', style: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap' } }, d._srMsg || ''),

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(135deg, #78350f, #92400e)', borderBottom: '1px solid rgba(245,158,11,0.3)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', { 'aria-label': 'Back', onClick: function() { ctx.setStemLabTool ? ctx.setStemLabTool(null) : (ctx.setSelHubTool && ctx.setSelHubTool(null)); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fde68a', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' } }, '\u2190 Back'),
              h('div', { style: { fontWeight: 'bold', fontSize: 16, color: '#fde68a' } }, '\u2B50 Strengths Finder'),
              h('span', { style: { fontSize: 10, color: 'rgba(253,230,138,0.6)' } }, band === 'elementary' ? 'Elementary' : band === 'middle' ? 'Middle School' : 'High School')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.3)' } }, '\u2B50 ' + selectedStrengths.length + ' strengths'),
              h('button', { 'aria-label': 'Export', onClick: function() { upd({ showBadges: !showBadges }); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '3px 8px', color: '#c4b5fd', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFC5 ' + badgeCount),
              h('button', { 'aria-label': 'Export', onClick: exportProfile, style: { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, padding: '3px 8px', color: '#6ee7b7', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCE4 Export')
            )
          ),

          // Tabs (scrollable row)
          h('div', { role: 'tablist', 'aria-label': 'Strengths Finder tabs', style: { display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(245,158,11,0.15)', background: 'rgba(15,23,42,0.8)', scrollbarWidth: 'none' } },
            [{ id: 'discover', label: '\u2B50 Discover' }, { id: 'interview', label: '\uD83C\uDF99\uFE0F Interview' }, { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' }, { id: 'quiz', label: '\uD83E\uDDE9 Quiz' }, { id: 'reflect', label: '\uD83D\uDCDD Reflect' }, { id: 'stories', label: '\uD83D\uDCD6 Stories' }, { id: 'compare', label: '\uD83D\uDD0D Compare' }, { id: 'challenge', label: '\u26A1 Challenge' }, { id: 'gratitude', label: '\uD83D\uDE4F Gratitude' }, { id: 'planner', label: '\uD83D\uDCCB Planner' }, { id: 'peers', label: '\uD83D\uDC65 Peers' }, { id: 'affirm', label: '\uD83D\uDCAC Affirm' }, { id: 'coach', label: '\uD83E\uDD16 Coach' }, { id: 'profile', label: '\uD83D\uDCCA Profile' }].map(function(t) {
              var active = tab === t.id;
              return h('button', { 'aria-label': 'nowrap', key: t.id, role: 'tab', 'aria-selected': active, onClick: function() { sfxSelect(); var tv = tabsVisited.indexOf(t.id) < 0 ? tabsVisited.concat([t.id]) : tabsVisited; upd({ tab: t.id, tabsVisited: tv }); }, style: { flex: '0 0 auto', padding: '10px 10px', fontSize: 10, fontWeight: 'bold', color: active ? '#fbbf24' : '#94a3b8', background: active ? 'rgba(245,158,11,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' } }, t.label);
            })
          ),

          // Badge panel
          showBadges ? h('div', { style: { padding: 12, background: 'rgba(167,139,250,0.08)', borderBottom: '1px solid rgba(167,139,250,0.15)' } },
            h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 8 } }, '\uD83C\uDFC5 Badges \u2014 ' + badgeCount + '/' + Object.keys(BADGES).length),
            h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
              Object.keys(BADGES).map(function(id) {
                var b = BADGES[id];
                var earned = !!badges[id];
                return h('div', { key: id, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: earned ? 'rgba(167,139,250,0.15)' : 'rgba(255,255,255,0.03)', border: earned ? '1px solid rgba(167,139,250,0.3)' : '1px solid rgba(99,102,241,0.1)', opacity: earned ? 1 : 0.5, fontSize: 11 } },
                  h('span', null, earned ? b.icon : '\uD83D\uDD12'),
                  h('span', { style: { fontWeight: 'bold', color: earned ? '#c4b5fd' : '#94a3b8' } }, b.name)
                );
              })
            )
          ) : null,

          // Content area
          h('div', { style: { flex: 1, overflow: 'auto', padding: 16 } },

            // ── DISCOVER TAB ──
            tab === 'discover' ? h('div', null,
              h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 } },
                band === 'elementary' ? 'Tap the strengths that describe YOU! Everyone has different strengths \u2014 there are no wrong answers.' :
                band === 'middle' ? 'Select the strengths you identify with. Consider what comes naturally, what others notice in you, and what you enjoy.' :
                'Identify your signature strengths. Consider not just what you\'re good at, but what energizes you and aligns with your values.'
              ),
              STRENGTH_CATEGORIES.map(function(cat) {
                var strengths = cat.strengths[band] || cat.strengths.elementary;
                return h('div', { key: cat.id, style: { marginBottom: 20 } },
                  h('div', { style: { fontSize: 13, fontWeight: 'bold', color: cat.color, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 } },
                    h('span', null, cat.emoji), ' ', cat.label
                  ),
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                    strengths.map(function(s) {
                      var sel = isSelected(s.id, cat.id);
                      return h('button', { 'aria-label': 'Toggle option', key: s.id, onClick: function() { toggleStrength(s, cat.id); }, title: s.desc, style: {
                        display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 12,
                        background: sel ? cat.color + '22' : 'rgba(255,255,255,0.04)',
                        border: sel ? '2px solid ' + cat.color : '1px solid rgba(99,102,241,0.15)',
                        color: sel ? cat.color : '#94a3b8',
                        fontWeight: sel ? 'bold' : 'normal', fontSize: 12, cursor: 'pointer',
                        transition: 'all 0.15s', transform: sel ? 'scale(1.02)' : 'scale(1)'
                      } },
                        h('span', { style: { fontSize: 16 } }, s.emoji),
                        h('span', null, s.label),
                        sel ? h('span', { style: { marginLeft: 4, fontSize: 10, color: cat.color } }, '\u2713') : null
                      );
                    })
                  ),
                  // Show descriptions for selected strengths in this category
                  selectedStrengths.filter(function(s) { return s.category === cat.id; }).length > 0 ?
                    h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: cat.color + '0a', border: '1px solid ' + cat.color + '22' } },
                      selectedStrengths.filter(function(s) { return s.category === cat.id; }).map(function(s) {
                        var fullData = (cat.strengths[band] || []).find(function(st) { return st.id === s.id; });
                        return fullData ? h('div', { key: s.id, style: { fontSize: 11, color: '#cbd5e1', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 } },
                          h('span', null, s.emoji),
                          h('strong', { style: { color: cat.color } }, s.label + ': '),
                          h('span', null, fullData.desc),
                          callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(s.label + '. ' + fullData.desc); }, style: { marginLeft: 4, background: 'none', border: 'none', color: '#94a3b8', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A') : null
                        ) : null;
                      })
                    ) : null
                );
              })
            ) : null,

            // ── INTERVIEW TAB ──
            tab === 'interview' ? (function() {
              var questions = INTERVIEW_QUESTIONS[band] || INTERVIEW_QUESTIONS.elementary;
              var interviewAnswers = d.interviewAnswers || {};
              var interviewStep = d.interviewStep || 0;
              var interviewResult = d.interviewResult || null;
              var interviewAnalyzing = d.interviewAnalyzing || false;
              var answeredCount = Object.keys(interviewAnswers).length;
              var allAnswered = answeredCount >= questions.length;

              // Analyze with AI
              var analyzeInterview = function() {
                if (!callGemini || interviewAnalyzing) return;
                sfxReflect();
                var answerText = questions.map(function(q, i) {
                  return 'Q' + (i + 1) + ': ' + q.question + '\nA: ' + (interviewAnswers[q.id] || '(skipped)');
                }).join('\n\n');
                var prompt = 'You are a strengths-based coach analyzing a ' + band + ' school student\'s (grade ' + gradeLevel + ') self-discovery interview.\n\n' +
                  'Their answers:\n' + answerText + '\n\n' +
                  'Based on these answers, identify 3-5 strengths this student likely has. For each strength, explain briefly WHY their answers suggest it.\n' +
                  'Format: Start with "These answers suggest you have:" then list each strength as:\n' +
                  '- **[Strength Name]**: [1-sentence explanation connecting to their answers]\n\n' +
                  (band === 'elementary' ? 'Use simple, encouraging language. Keep explanations to 1 short sentence each.' :
                   band === 'middle' ? 'Be specific and affirming. Reference their actual answers.' :
                   'Be insightful and nuanced. Draw meaningful connections between their answers and recognized character/talent strengths.');
                upd({ interviewAnalyzing: true });
                callGemini(prompt, false, false, 0.8).then(function(resp) {
                  upd({ interviewResult: resp || 'Your answers show real self-awareness! Keep exploring your strengths.', interviewAnalyzing: false, interviewComplete: true });
                }).catch(function() {
                  upd({ interviewResult: 'AI analysis is unavailable right now. Review your answers above \u2014 each one holds clues to your strengths!', interviewAnalyzing: false, interviewComplete: true });
                });
              };

              if (interviewResult) {
                return h('div', null,
                  h('div', { style: { textAlign: 'center', marginBottom: 16 } },
                    h('div', { style: { fontSize: 40, marginBottom: 8 } }, '\uD83C\uDF1F'),
                    h('p', { style: { fontSize: 16, fontWeight: 'bold', color: '#fbbf24' } }, 'Your Strengths Analysis')
                  ),
                  h('div', { style: { padding: 16, borderRadius: 14, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, fontSize: 13, lineHeight: 1.8, color: '#fde68a', whiteSpace: 'pre-wrap' } },
                    interviewResult
                  ),
                  callTTS ? h('button', { 'aria-label': 'Read Analysis Aloud', onClick: function() { speak(interviewResult); }, style: { marginBottom: 12, background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fbbf24', fontSize: 11, cursor: 'pointer' } }, '\uD83D\uDD0A Read Analysis Aloud') : null,
                  h('div', { style: { display: 'flex', gap: 8 } },
                    h('button', { 'aria-label': 'Start Over', onClick: function() { upd({ interviewResult: null, interviewAnswers: {}, interviewStep: 0, interviewComplete: false }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDD04 Start Over'),
                    h('button', { 'aria-label': 'Go Select Strengths', onClick: function() { upd({ tab: 'discover' }); }, style: { padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\u2B50 Go Select Strengths')
                  )
                );
              }

              var q = questions[interviewStep];
              return h('div', null,
                h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 } },
                  band === 'elementary' ? 'Answer these questions to discover strengths you might not know you have!' :
                  'This guided interview helps uncover strengths through self-reflection. Answer honestly \u2014 there are no wrong answers.'
                ),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 12 } },
                  'Question ' + (interviewStep + 1) + ' of ' + questions.length + ' \u2022 ' + answeredCount + ' answered'
                ),
                // Progress bar
                h('div', { style: { width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', marginBottom: 16, overflow: 'hidden' } },
                  h('div', { style: { width: Math.round((interviewStep / questions.length) * 100) + '%', height: '100%', background: '#f59e0b', borderRadius: 3, transition: 'width 0.3s' } })
                ),
                // Question card
                h('div', { style: { padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 16 } },
                  h('p', { style: { fontSize: 15, fontWeight: 'bold', color: '#fde68a', lineHeight: 1.6, marginBottom: 8 } }, q.question),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 12 } }, '\uD83D\uDCA1 ' + q.hint),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(q.question + '. ' + q.hint); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 8px', color: '#fbbf24', fontSize: 10, cursor: 'pointer', marginBottom: 8 } }, '\uD83D\uDD0A Read aloud') : null,
                  h('textarea', { value: interviewAnswers[q.id] || '', 'aria-label': 'Interview answer', onChange: function(e) {
                    var newAnswers = Object.assign({}, interviewAnswers);
                    newAnswers[q.id] = e.target.value;
                    upd({ interviewAnswers: newAnswers });
                  }, placeholder: band === 'elementary' ? 'Type your answer here...' : 'Take your time. Thoughtful answers lead to better insights...', style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } })
                ),
                // Navigation
                h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between' } },
                  h('button', { 'aria-label': 'Previous', onClick: function() { if (interviewStep > 0) upd({ interviewStep: interviewStep - 1 }); }, disabled: interviewStep === 0, style: { padding: '8px 16px', borderRadius: 8, background: interviewStep > 0 ? 'rgba(255,255,255,0.05)' : 'transparent', color: interviewStep > 0 ? '#94a3b8' : '#334155', border: '1px solid ' + (interviewStep > 0 ? 'rgba(99,102,241,0.15)' : 'transparent'), fontSize: 12, cursor: interviewStep > 0 ? 'pointer' : 'default' } }, '\u2190 Previous'),
                  h('div', { style: { display: 'flex', gap: 8 } },
                    interviewStep < questions.length - 1 ?
                      h('button', { 'aria-label': 'Next', onClick: function() { upd({ interviewStep: interviewStep + 1 }); }, style: { padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, 'Next \u2192') :
                      h('button', { 'aria-label': 'Discover My Strengths', onClick: analyzeInterview, disabled: answeredCount < 3 || interviewAnalyzing, style: { padding: '8px 20px', borderRadius: 8, background: answeredCount >= 3 ? '#22c55e' : '#334155', color: answeredCount >= 3 ? '#0f172a' : '#94a3b8', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: answeredCount >= 3 ? 'pointer' : 'default' } }, interviewAnalyzing ? '\u23F3 Analyzing...' : '\uD83C\uDF1F Discover My Strengths')
                  )
                ),
                // Quick answer dots
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 } },
                  questions.map(function(qq, qi) {
                    var hasAnswer = !!(interviewAnswers[qq.id] && interviewAnswers[qq.id].trim());
                    var isCurrent = qi === interviewStep;
                    return h('button', { 'aria-label': '50%', key: qi, onClick: function() { upd({ interviewStep: qi }); }, style: { width: 10, height: 10, borderRadius: '50%', border: isCurrent ? '2px solid #fbbf24' : '1px solid rgba(99,102,241,0.2)', background: hasAnswer ? '#f59e0b' : 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: 0 } });
                  })
                )
              );
            })() : null,

            // ── SCENARIOS TAB ──
            tab === 'scenarios' ? (function() {
              var scenarios = SCENARIOS[band] || SCENARIOS.elementary;
              var sc = scenarios[scenarioIdx % scenarios.length];
              return h('div', null,
                h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } },
                  band === 'elementary' ? 'Read the story and pick the choice that shows YOUR strengths!' :
                  'Choose how you\'d respond. Each choice shows a different strength in action.'
                ),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 12 } },
                  'Scenario ' + ((scenarioIdx % scenarios.length) + 1) + ' of ' + scenarios.length +
                  (scenariosDone.length > 0 ? ' \u2014 ' + scenariosDone.length + ' completed' : '')
                ),
                // Scenario card
                h('div', { style: { padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 16 } },
                  h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24', marginBottom: 8 } }, '\uD83C\uDFAD ' + sc.title),
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 12 } }, sc.setup),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(sc.setup); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 8px', color: '#fbbf24', fontSize: 10, cursor: 'pointer', marginBottom: 12 } }, '\uD83D\uDD0A Read aloud') : null,
                  // Choices
                  !scenarioChoice ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                    sc.choices.map(function(ch, ci) {
                      return h('button', { 'aria-label': 'Choices', key: ci, onClick: function() {
                        sfxSelect();
                        var newDone = scenariosDone.indexOf(sc.id) < 0 ? scenariosDone.concat([sc.id]) : scenariosDone;
                        var newTop = ch.rating === 3 ? topScenarios + 1 : topScenarios;
                        upd({ scenarioChoice: { idx: ci, choice: ch }, scenariosDone: newDone, topScenarios: newTop });
                        if (awardXP) awardXP(ch.rating === 3 ? 10 : ch.rating === 2 ? 5 : 2);
                      }, style: { textAlign: 'left', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#cbd5e1', fontSize: 12, lineHeight: 1.5, cursor: 'pointer', transition: 'all 0.15s' } },
                        h('span', { style: { fontWeight: 'bold', color: '#a5b4fc', marginRight: 6 } }, String.fromCharCode(65 + ci) + '.'),
                        ch.text
                      );
                    })
                  ) :
                  // Feedback after choosing
                  h('div', { style: { padding: 14, borderRadius: 10, background: scenarioChoice.choice.rating === 3 ? 'rgba(52,211,153,0.1)' : scenarioChoice.choice.rating === 2 ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (scenarioChoice.choice.rating === 3 ? 'rgba(52,211,153,0.3)' : scenarioChoice.choice.rating === 2 ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)') } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                      h('span', { style: { fontSize: 16 } }, scenarioChoice.choice.rating === 3 ? '\u2B50\u2B50\u2B50' : scenarioChoice.choice.rating === 2 ? '\u2B50\u2B50' : '\u2B50'),
                      scenarioChoice.choice.strength ? h('span', { style: { padding: '2px 10px', borderRadius: 12, background: 'rgba(245,158,11,0.2)', color: '#fbbf24', fontSize: 10, fontWeight: 'bold' } }, 'Strength: ' + scenarioChoice.choice.strength) : null
                    ),
                    h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, scenarioChoice.choice.feedback),
                    h('div', { style: { display: 'flex', gap: 8, marginTop: 12 } },
                      h('button', { 'aria-label': 'Next Scenario', onClick: function() { upd({ scenarioChoice: null, scenarioIdx: (scenarioIdx + 1) % scenarios.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\u27A1 Next Scenario'),
                      h('button', { 'aria-label': 'Try Again', onClick: function() { upd({ scenarioChoice: null }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDD04 Try Again')
                    )
                  )
                )
              );
            })() : null,

            // ── QUIZ TAB ──
            tab === 'quiz' ? (function() {
              var quizData = MATCH_QUIZ[band] || MATCH_QUIZ.elementary;
              if (!quizActive && !quizDone) {
                return h('div', { style: { textAlign: 'center', padding: 30 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83E\uDDE9'),
                  h('p', { style: { fontSize: 16, fontWeight: 'bold', color: '#fbbf24', marginBottom: 8 } }, 'Strength Match Quiz'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', maxWidth: 350, margin: '0 auto 16px', lineHeight: 1.6 } },
                    'Read each situation and identify which strength is being used. Test how well you can spot strengths in action!'
                  ),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 16 } }, quizData.length + ' questions \u2022 Best score: ' + quizBest + '/' + quizData.length),
                  h('button', { 'aria-label': 'Start Quiz', onClick: function() { upd({ quizActive: true, quizIdx: 0, quizScore: 0, quizFeedback: null, quizDone: false }); }, style: { padding: '12px 30px', borderRadius: 10, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFAE Start Quiz')
                );
              }
              if (quizDone) {
                var pct = Math.round((quizScore / quizData.length) * 100);
                return h('div', { style: { textAlign: 'center', padding: 30 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, pct >= 80 ? '\uD83C\uDFC6' : pct >= 50 ? '\uD83C\uDF1F' : '\uD83D\uDCAA'),
                  h('p', { style: { fontSize: 20, fontWeight: 'bold', color: '#fbbf24', marginBottom: 4 } }, quizScore + ' / ' + quizData.length),
                  h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16 } },
                    pct >= 80 ? 'Outstanding! You\'re a natural strength spotter!' :
                    pct >= 50 ? 'Great work! Keep exploring to sharpen your strength sense.' :
                    'Good start! The more you practice, the better you\'ll get.'
                  ),
                  h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center' } },
                    h('button', { 'aria-label': 'Play Again', onClick: function() { upd({ quizActive: true, quizIdx: 0, quizScore: 0, quizFeedback: null, quizDone: false }); }, style: { padding: '10px 24px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDD04 Play Again'),
                    h('button', { 'aria-label': 'Back', onClick: function() { upd({ quizActive: false, quizDone: false }); }, style: { padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u2190 Back')
                  )
                );
              }
              // Active quiz question
              var q = quizData[quizIdx];
              if (!q) { upd({ quizDone: true }); return null; }
              var shuffled = q.options.slice().sort(function() { return 0.5 - Math.random(); });
              // Use stable order from state
              if (!d._quizOptions || d._quizOptions.join() !== shuffled.join()) {
                // Only shuffle once per question
              }
              return h('div', null,
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 8 } }, 'Question ' + (quizIdx + 1) + ' / ' + quizData.length + ' \u2022 Score: ' + quizScore),
                h('div', { style: { padding: 16, borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 } },
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 4 } }, '\uD83D\uDCA1 ' + q.situation),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', marginTop: 8 } }, 'Which strength is being demonstrated?')
                ),
                quizFeedback ? h('div', { style: { padding: 14, borderRadius: 10, marginBottom: 12, background: quizFeedback.correct ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (quizFeedback.correct ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)') } },
                  h('p', { style: { fontSize: 13, fontWeight: 'bold', color: quizFeedback.correct ? '#34d399' : '#f87171' } }, quizFeedback.correct ? '\u2705 Correct!' : '\u274C Not quite \u2014 the answer is ' + q.answer),
                  h('button', { 'aria-label': 'all 0.15s', onClick: function() {
                    var nextIdx = quizIdx + 1;
                    if (nextIdx >= quizData.length) {
                      var best = Math.max(quizBest, quizScore);
                      upd({ quizDone: true, quizFeedback: null, quizBest: best });
                    } else {
                      upd({ quizIdx: nextIdx, quizFeedback: null });
                    }
                  }, style: { marginTop: 8, padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, quizIdx + 1 >= quizData.length ? '\uD83C\uDFC1 See Results' : '\u27A1 Next')
                ) :
                h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                  q.options.map(function(opt) {
                    return h('button', { 'aria-label': 'Go to reflect', key: opt, onClick: function() {
                      var correct = opt === q.answer;
                      if (correct) sfxComplete(); else sfxReflect();
                      upd({ quizFeedback: { correct: correct, picked: opt }, quizScore: correct ? quizScore + 1 : quizScore });
                    }, style: { textAlign: 'left', padding: '12px 16px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(99,102,241,0.15)', color: '#cbd5e1', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', textTransform: 'capitalize', transition: 'all 0.15s' } },
                      '\uD83D\uDCA0 ' + opt
                    );
                  })
                )
              );
            })() : null,

            // ── REFLECT TAB ──
            tab === 'reflect' ? h('div', null,
              h('div', { style: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16, marginBottom: 16 } },
                h('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 } }, '\uD83D\uDCDD Reflection Prompt'),
                h('p', { style: { fontSize: 14, color: '#fde68a', lineHeight: 1.6, fontWeight: 600, marginBottom: 12 } }, currentPrompt),
                callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(currentPrompt); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px', color: '#fbbf24', fontSize: 10, cursor: 'pointer', marginBottom: 8 } }, '\uD83D\uDD0A Read aloud') : null,
                h('textarea', { value: reflectionInput, 'aria-label': 'Reflection response', onChange: function(e) { upd({ reflectionInput: e.target.value }); }, placeholder: band === 'elementary' ? 'Write your answer here...' : 'Take your time. There\'s no right or wrong answer...', style: { width: '100%', minHeight: 100, padding: 10, borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                  h('button', { 'aria-label': 'Save Reflection', onClick: saveReflection, disabled: !reflectionInput.trim(), style: { padding: '8px 20px', borderRadius: 8, background: reflectionInput.trim() ? '#f59e0b' : '#334155', color: reflectionInput.trim() ? '#0f172a' : '#94a3b8', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: reflectionInput.trim() ? 'pointer' : 'default' } }, '\u2705 Save Reflection'),
                  h('button', { 'aria-label': 'Next Prompt', onClick: function() { upd({ currentPromptIdx: (currentPromptIdx + 1) % prompts.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u27A1 Next Prompt')
                )
              ),
              // ── Deep Reflection Prompts ──
              (function() {
                var deepPrompts = DEEP_REFLECTION_PROMPTS[band] || DEEP_REFLECTION_PROMPTS.elementary;
                var deepReflections = d.deepReflections || [];
                var deepPromptIdx = d.deepPromptIdx || 0;
                var deepInput = d.deepInput || '';
                var currentDeep = deepPrompts[deepPromptIdx % deepPrompts.length];

                var saveDeepReflection = function() {
                  if (!deepInput.trim()) return;
                  sfxComplete();
                  var newDeep = deepReflections.concat([{
                    prompt: currentDeep,
                    response: deepInput.trim(),
                    timestamp: Date.now()
                  }]);
                  upd({
                    deepReflections: newDeep,
                    deepInput: '',
                    deepPromptIdx: (deepPromptIdx + 1) % deepPrompts.length
                  });
                  if (addToast) addToast('\uD83E\uDDE0 Deep reflection saved!', 'success');
                };

                return h('div', { style: { background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 12, padding: 16, marginBottom: 16 } },
                  h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 'bold', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 } }, '\uD83E\uDDE0 Deep Reflection'),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8 } }, 'These prompts go deeper \u2014 explore how strengths really work in your life.'),
                  h('p', { style: { fontSize: 14, color: '#e0d4ff', lineHeight: 1.6, fontWeight: 600, marginBottom: 12 } }, currentDeep),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(currentDeep); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, padding: '4px 10px', color: '#c4b5fd', fontSize: 10, cursor: 'pointer', marginBottom: 8 } }, '\uD83D\uDD0A Read aloud') : null,
                  h('textarea', { value: deepInput, 'aria-label': 'Deep reflection response', onChange: function(e) { upd({ deepInput: e.target.value }); }, placeholder: 'Go deeper... really think about this one.', style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                    h('button', { 'aria-label': 'Save Deep Reflection', onClick: saveDeepReflection, disabled: !deepInput.trim(), style: { padding: '8px 20px', borderRadius: 8, background: deepInput.trim() ? '#8b5cf6' : '#334155', color: deepInput.trim() ? '#fff' : '#94a3b8', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: deepInput.trim() ? 'pointer' : 'default' } }, '\u2705 Save Deep Reflection'),
                    h('button', { 'aria-label': 'Next Deep Prompt', onClick: function() { upd({ deepPromptIdx: (deepPromptIdx + 1) % deepPrompts.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u27A1 Next Deep Prompt')
                  ),
                  deepReflections.length > 0 ? h('div', { style: { marginTop: 12 } },
                    h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#94a3b8', marginBottom: 6 } }, '\uD83E\uDDE0 Deep Reflections (' + deepReflections.length + ')'),
                    deepReflections.slice().reverse().slice(0, 3).map(function(r, i) {
                      return h('div', { key: 'deep' + i, style: { padding: 10, marginBottom: 6, borderRadius: 8, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.1)' } },
                        h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 2 } }, new Date(r.timestamp).toLocaleDateString()),
                        h('div', { style: { fontSize: 11, color: '#c4b5fd', fontWeight: 600, marginBottom: 2 } }, r.prompt),
                        h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 } }, r.response)
                      );
                    })
                  ) : null
                );
              })(),

              // Past reflections
              reflections.length > 0 ? h('div', null,
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, '\uD83D\uDCD6 Past Reflections (' + reflections.length + ')'),
                reflections.slice().reverse().map(function(r, i) {
                  return h('div', { key: i, style: { padding: 12, marginBottom: 8, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
                    h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 4 } }, new Date(r.timestamp).toLocaleDateString()),
                    h('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 } }, r.prompt),
                    h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, r.response)
                  );
                })
              ) : h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, padding: 20 } }, 'No reflections yet. Answer the prompt above to get started!')
            ) : null,

            // ── STORIES TAB (Strengths Story Builder) ──
            tab === 'stories' ? (function() {
              var stories = d.stories || [];
              var storyStrength = d.storyStrength || null;
              var storyDraft = d.storyDraft || {};
              var storyStep = d.storyStep || 0;
              var storyAiResponse = d.storyAiResponse || '';
              var storyAiLoading = d.storyAiLoading || false;
              var storyViewMode = d.storyViewMode || 'write'; // 'write' | 'past'
              var storyPrompts = STORY_PROMPTS[band] || STORY_PROMPTS.elementary;

              if (selectedStrengths.length === 0) {
                return h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83D\uDCD6'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, 'Select some strengths first!'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'Go to the Discover tab to identify your strengths, then come back to write stories about using them.'),
                  h('button', { 'aria-label': 'Go Discover', onClick: function() { upd({ tab: 'discover' }); }, style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u2B50 Go Discover')
                );
              }

              // Toggle between write and past stories
              var modeToggle = h('div', { style: { display: 'flex', gap: 6, marginBottom: 16 } },
                h('button', { 'aria-label': 'Write Story', onClick: function() { upd({ storyViewMode: 'write' }); }, style: { padding: '6px 14px', borderRadius: 20, background: storyViewMode === 'write' ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.04)', border: storyViewMode === 'write' ? '2px solid #f59e0b' : '1px solid rgba(99,102,241,0.15)', color: storyViewMode === 'write' ? '#fbbf24' : '#94a3b8', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\u270D\uFE0F Write Story'),
                h('button', { 'aria-label': 'Past Stories (', onClick: function() { upd({ storyViewMode: 'past' }); }, style: { padding: '6px 14px', borderRadius: 20, background: storyViewMode === 'past' ? 'rgba(167,139,250,0.2)' : 'rgba(255,255,255,0.04)', border: storyViewMode === 'past' ? '2px solid #a78bfa' : '1px solid rgba(99,102,241,0.15)', color: storyViewMode === 'past' ? '#c4b5fd' : '#94a3b8', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCDA Past Stories (' + stories.length + ')')
              );

              if (storyViewMode === 'past') {
                return h('div', null,
                  h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 } }, 'Your collection of strengths stories \u2014 moments when you put your strengths into action.'),
                  modeToggle,
                  stories.length === 0 ?
                    h('div', { style: { textAlign: 'center', padding: 30, color: '#94a3b8' } },
                      h('p', { style: { fontSize: 13 } }, 'No stories yet. Write your first one!'),
                      h('button', { 'aria-label': 'Write a Story', onClick: function() { upd({ storyViewMode: 'write' }); }, style: { marginTop: 10, padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u270D\uFE0F Write a Story')
                    ) :
                    stories.slice().reverse().map(function(story, si) {
                      return h('div', { key: 'story' + si, style: { padding: 14, marginBottom: 12, borderRadius: 12, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' } },
                        h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 } },
                          h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                            h('span', { style: { fontSize: 14 } }, story.strengthEmoji || '\u2B50'),
                            h('span', { style: { fontSize: 13, fontWeight: 'bold', color: '#fbbf24' } }, 'My ' + story.strengthLabel + ' Story')
                          ),
                          h('span', { style: { fontSize: 10, color: '#94a3b8' } }, new Date(story.timestamp).toLocaleDateString())
                        ),
                        Object.keys(story.answers || {}).map(function(key) {
                          var promptData = storyPrompts.find(function(p) { return p.id === key; });
                          return h('div', { key: key, style: { marginBottom: 6 } },
                            h('div', { style: { fontSize: 10, color: '#f59e0b', fontWeight: 'bold', marginBottom: 2 } }, promptData ? promptData.label.replace('[STRENGTH]', story.strengthLabel) : key),
                            h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, story.answers[key])
                          );
                        }),
                        story.aiFeedback ? h('div', { style: { marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' } },
                          h('div', { style: { fontSize: 10, color: '#a5b4fc', fontWeight: 'bold', marginBottom: 4 } }, '\uD83E\uDD16 Coach Feedback'),
                          h('div', { style: { fontSize: 12, color: '#c4b5fd', lineHeight: 1.5 } }, story.aiFeedback)
                        ) : null
                      );
                    })
                );
              }

              // Write mode
              // Step 0: Choose a strength
              if (!storyStrength) {
                return h('div', null,
                  h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 4, lineHeight: 1.6 } },
                    band === 'elementary' ? 'Write a story about a time you used one of YOUR strengths! First, pick the strength:' :
                    'Tell the story of a moment when one of your strengths came to life. Select the strength to write about:'
                  ),
                  modeToggle,
                  h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                    selectedStrengths.map(function(s) {
                      var catData = STRENGTH_CATEGORIES.find(function(c) { return c.id === s.category; });
                      var catColor = catData ? catData.color : '#f59e0b';
                      return h('button', { 'aria-label': '[STRENGTH]', key: s.id + '_' + s.category, onClick: function() {
                        sfxSelect();
                        upd({ storyStrength: s, storyDraft: {}, storyStep: 0, storyAiResponse: '' });
                      }, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, background: catColor + '15', border: '2px solid ' + catColor + '44', color: catColor, fontWeight: 'bold', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' } },
                        h('span', { style: { fontSize: 18 } }, s.emoji),
                        h('span', null, s.label)
                      );
                    })
                  )
                );
              }

              // Story writing wizard
              var currentStoryPrompt = storyPrompts[storyStep];
              var promptLabel = currentStoryPrompt.label.replace('[STRENGTH]', storyStrength.label);
              var allFilled = storyPrompts.every(function(p) { return storyDraft[p.id] && storyDraft[p.id].trim(); });

              var saveStory = function() {
                if (!allFilled) return;
                sfxComplete();
                var newStory = {
                  strengthId: storyStrength.id,
                  strengthLabel: storyStrength.label,
                  strengthEmoji: storyStrength.emoji,
                  strengthCategory: storyStrength.category,
                  answers: Object.assign({}, storyDraft),
                  timestamp: Date.now(),
                  aiFeedback: storyAiResponse || null
                };
                var newStories = stories.concat([newStory]);
                upd({ stories: newStories, storyStrength: null, storyDraft: {}, storyStep: 0, storyAiResponse: '', storyViewMode: 'past' });
                if (addToast) addToast('\uD83D\uDCD6 Strengths story saved!', 'success');
                if (awardXP) awardXP(15);
              };

              var getAiFeedback = function() {
                if (!callGemini || storyAiLoading || !allFilled) return;
                sfxReflect();
                var storyText = storyPrompts.map(function(p) {
                  return p.label.replace('[STRENGTH]', storyStrength.label) + '\n' + (storyDraft[p.id] || '');
                }).join('\n\n');
                var prompt = 'You are a warm, encouraging strengths-based coach for a ' + band + ' school student (grade ' + gradeLevel + '). ' +
                  'They wrote a story about using their strength of "' + storyStrength.label + '". Here is their story:\n\n' +
                  storyText + '\n\n' +
                  'Give brief feedback (2-3 sentences) on how this story demonstrates the strength of ' + storyStrength.label + '. ' +
                  'Be specific \u2014 reference details from their story. Be encouraging and affirming. ' +
                  (band === 'elementary' ? 'Use simple, warm language.' : band === 'middle' ? 'Be relatable and affirming.' : 'Be thoughtful and nuanced.');
                upd({ storyAiLoading: true });
                callGemini(prompt, false, false, 0.8).then(function(resp) {
                  upd({ storyAiResponse: resp || 'Great story! You clearly used your strength well.', storyAiLoading: false });
                }).catch(function() {
                  upd({ storyAiResponse: 'Your story shows real self-awareness! Keep writing about your strengths.', storyAiLoading: false });
                });
              };

              return h('div', null,
                modeToggle,
                // Strength badge
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 } },
                  h('span', { style: { fontSize: 20 } }, storyStrength.emoji),
                  h('span', { style: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24' } }, 'Writing about: ' + storyStrength.label),
                  h('button', { 'aria-label': 'Change', onClick: function() { upd({ storyStrength: null, storyDraft: {}, storyStep: 0, storyAiResponse: '' }); }, style: { marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 6, padding: '3px 8px', color: '#94a3b8', fontSize: 10, cursor: 'pointer' } }, '\u2715 Change')
                ),
                // Progress
                h('div', { style: { display: 'flex', gap: 4, marginBottom: 12 } },
                  storyPrompts.map(function(p, pi) {
                    var filled = storyDraft[p.id] && storyDraft[p.id].trim();
                    var active = pi === storyStep;
                    return h('div', { key: pi, style: { flex: 1, height: 4, borderRadius: 2, background: filled ? '#f59e0b' : active ? 'rgba(245,158,11,0.4)' : 'rgba(255,255,255,0.06)', transition: 'all 0.3s' } });
                  })
                ),
                h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 8 } }, 'Step ' + (storyStep + 1) + ' of ' + storyPrompts.length),
                // Prompt card
                h('div', { style: { padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 12 } },
                  h('p', { style: { fontSize: 14, fontWeight: 'bold', color: '#fde68a', lineHeight: 1.6, marginBottom: 6 } }, promptLabel),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic', marginBottom: 10 } }, '\uD83D\uDCA1 ' + currentStoryPrompt.hint),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(promptLabel + '. ' + currentStoryPrompt.hint); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 8px', color: '#fbbf24', fontSize: 10, cursor: 'pointer', marginBottom: 8 } }, '\uD83D\uDD0A Read aloud') : null,
                  h('textarea', { value: storyDraft[currentStoryPrompt.id] || '', 'aria-label': 'Strength story response', onChange: function(e) {
                    var newDraft = Object.assign({}, storyDraft);
                    newDraft[currentStoryPrompt.id] = e.target.value;
                    upd({ storyDraft: newDraft });
                  }, placeholder: band === 'elementary' ? 'Tell your story...' : 'Write your response...', style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } })
                ),
                // Navigation
                h('div', { style: { display: 'flex', gap: 8, justifyContent: 'space-between' } },
                  h('button', { 'aria-label': 'Previous', onClick: function() { if (storyStep > 0) upd({ storyStep: storyStep - 1 }); }, disabled: storyStep === 0, style: { padding: '8px 16px', borderRadius: 8, background: storyStep > 0 ? 'rgba(255,255,255,0.05)' : 'transparent', color: storyStep > 0 ? '#94a3b8' : '#334155', border: '1px solid ' + (storyStep > 0 ? 'rgba(99,102,241,0.15)' : 'transparent'), fontSize: 12, cursor: storyStep > 0 ? 'pointer' : 'default' } }, '\u2190 Previous'),
                  h('div', { style: { display: 'flex', gap: 8 } },
                    storyStep < storyPrompts.length - 1 ?
                      h('button', { 'aria-label': 'Next', onClick: function() { upd({ storyStep: storyStep + 1 }); }, style: { padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, 'Next \u2192') :
                      h('div', { style: { display: 'flex', gap: 6 } },
                        callGemini ? h('button', { 'aria-label': 'Save Story', onClick: getAiFeedback, disabled: !allFilled || storyAiLoading, style: { padding: '8px 14px', borderRadius: 8, background: allFilled ? 'rgba(99,102,241,0.15)' : '#334155', color: allFilled ? '#a5b4fc' : '#94a3b8', border: '1px solid ' + (allFilled ? 'rgba(99,102,241,0.3)' : 'transparent'), fontSize: 12, cursor: allFilled ? 'pointer' : 'default' } }, storyAiLoading ? '\u23F3 Getting feedback...' : '\uD83E\uDD16 Get AI Feedback') : null,
                        h('button', { 'aria-label': 'Save Story', onClick: saveStory, disabled: !allFilled, style: { padding: '8px 20px', borderRadius: 8, background: allFilled ? '#22c55e' : '#334155', color: allFilled ? '#0f172a' : '#94a3b8', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: allFilled ? 'pointer' : 'default' } }, '\uD83D\uDCBE Save Story')
                      )
                  )
                ),
                // AI feedback preview
                storyAiResponse ? h('div', { style: { marginTop: 12, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' } },
                  h('div', { style: { fontSize: 10, color: '#a5b4fc', fontWeight: 'bold', marginBottom: 4 } }, '\uD83E\uDD16 Coach Feedback'),
                  h('div', { style: { fontSize: 12, color: '#c4b5fd', lineHeight: 1.5 } }, storyAiResponse),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(storyAiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: '#a5b4fc', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
                ) : null,
                // Step dots
                h('div', { style: { display: 'flex', justifyContent: 'center', gap: 6, marginTop: 14 } },
                  storyPrompts.map(function(p, pi) {
                    var filled = !!(storyDraft[p.id] && storyDraft[p.id].trim());
                    var isCurrent = pi === storyStep;
                    return h('button', { 'aria-label': '50%', key: pi, onClick: function() { upd({ storyStep: pi }); }, style: { width: 10, height: 10, borderRadius: '50%', border: isCurrent ? '2px solid #fbbf24' : '1px solid rgba(99,102,241,0.2)', background: filled ? '#f59e0b' : 'rgba(255,255,255,0.05)', cursor: 'pointer', padding: 0 } });
                  })
                )
              );
            })() : null,

            // ── COMPARE TAB (Strengths Comparison) ──
            tab === 'compare' ? (function() {
              var compareRole = d.compareRole || null;
              var rolesExplored = d.rolesExplored || [];

              if (selectedStrengths.length === 0) {
                return h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83D\uDD0D'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, 'Select some strengths first!'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'Go to the Discover tab to identify your strengths, then compare them to different roles.'),
                  h('button', { 'aria-label': 'Go Discover', onClick: function() { upd({ tab: 'discover' }); }, style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u2B50 Go Discover')
                );
              }

              if (!compareRole) {
                return h('div', null,
                  h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 } },
                    band === 'elementary' ? 'See how your strengths match up with different roles! Pick one to compare:' :
                    'Compare your strength profile to different roles. See what you share, what\u0027s unique to you, and what you might develop.'
                  ),
                  h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 } },
                    Object.keys(ROLE_PROFILES).map(function(roleKey) {
                      var role = ROLE_PROFILES[roleKey];
                      var explored = rolesExplored.indexOf(roleKey) >= 0;
                      return h('button', { 'aria-label': '+ rolesExplored.length +', key: roleKey, onClick: function() {
                        sfxSelect();
                        var newExplored = rolesExplored.indexOf(roleKey) < 0 ? rolesExplored.concat([roleKey]) : rolesExplored;
                        upd({ compareRole: roleKey, rolesExplored: newExplored });
                      }, style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '16px 10px', borderRadius: 14, background: role.color + '10', border: '2px solid ' + role.color + '33', cursor: 'pointer', transition: 'all 0.15s', position: 'relative' } },
                        explored ? h('span', { style: { position: 'absolute', top: 4, right: 6, fontSize: 10, color: '#22c55e' } }, '\u2713') : null,
                        h('span', { style: { fontSize: 28 } }, role.emoji),
                        h('span', { style: { fontSize: 12, fontWeight: 'bold', color: role.color } }, role.label),
                        h('span', { style: { fontSize: 10, color: '#94a3b8', textAlign: 'center', lineHeight: 1.3 } }, role.desc)
                      );
                    })
                  ),
                  rolesExplored.length > 0 ? h('div', { style: { marginTop: 12, fontSize: 11, color: '#94a3b8', textAlign: 'center' } }, '\uD83D\uDD0D Roles explored: ' + rolesExplored.length + '/6') : null
                );
              }

              // Comparison view
              var role = ROLE_PROFILES[compareRole];
              var myStrengthIds = selectedStrengths.map(function(s) { return s.id; });
              var roleStrengthIds = role.strengths;

              // Calculate shared, unique-to-me, unique-to-role
              var shared = [];
              var uniqueToMe = [];
              var uniqueToRole = [];

              roleStrengthIds.forEach(function(rid) {
                if (myStrengthIds.indexOf(rid) >= 0) {
                  shared.push(rid);
                } else {
                  uniqueToRole.push(rid);
                }
              });
              myStrengthIds.forEach(function(mid) {
                if (roleStrengthIds.indexOf(mid) < 0) {
                  uniqueToMe.push(mid);
                }
              });

              // Lookup label for a strength id
              var getStrengthLabel = function(sid) {
                var found = null;
                selectedStrengths.forEach(function(s) { if (s.id === sid) found = s; });
                if (found) return found.emoji + ' ' + found.label;
                // Search all categories
                STRENGTH_CATEGORIES.forEach(function(cat) {
                  var list = cat.strengths[band] || cat.strengths.elementary;
                  list.forEach(function(s) { if (s.id === sid && !found) found = s; });
                  // Also check other bands
                  if (!found) { (cat.strengths.middle || []).forEach(function(s) { if (s.id === sid && !found) found = s; }); }
                  if (!found) { (cat.strengths.high || []).forEach(function(s) { if (s.id === sid && !found) found = s; }); }
                  if (!found) { (cat.strengths.elementary || []).forEach(function(s) { if (s.id === sid && !found) found = s; }); }
                });
                if (found) return found.emoji + ' ' + found.label;
                return '\uD83D\uDCA0 ' + sid;
              };

              var matchPercent = roleStrengthIds.length > 0 ? Math.round((shared.length / roleStrengthIds.length) * 100) : 0;

              return h('div', null,
                h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 } },
                  h('button', { 'aria-label': 'Back', onClick: function() { upd({ compareRole: null }); }, style: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '4px 10px', color: '#94a3b8', fontSize: 11, cursor: 'pointer' } }, '\u2190 Back'),
                  h('span', { style: { fontSize: 20 } }, role.emoji),
                  h('span', { style: { fontSize: 14, fontWeight: 'bold', color: role.color } }, 'My Strengths vs ' + role.label)
                ),

                // Match meter
                h('div', { style: { textAlign: 'center', marginBottom: 16, padding: 14, borderRadius: 12, background: role.color + '10', border: '1px solid ' + role.color + '33' } },
                  h('div', { style: { fontSize: 28, fontWeight: 'bold', color: role.color } }, matchPercent + '%'),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8 } }, 'Strength Match'),
                  h('div', { style: { width: '100%', height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                    h('div', { style: { width: matchPercent + '%', height: '100%', background: role.color, borderRadius: 4, transition: 'width 0.5s' } })
                  )
                ),

                // Venn-style comparison
                h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 } },
                  // Unique to me
                  h('div', { style: { padding: 12, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' } },
                    h('div', { style: { fontSize: 10, fontWeight: 'bold', color: '#fbbf24', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 } }, '\u2B50 Only Me'),
                    uniqueToMe.length > 0 ? uniqueToMe.slice(0, 6).map(function(sid) {
                      return h('div', { key: 'um_' + sid, style: { fontSize: 11, color: '#fde68a', marginBottom: 4, padding: '3px 0' } }, getStrengthLabel(sid));
                    }) : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'None')
                  ),
                  // Shared
                  h('div', { style: { padding: 12, borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' } },
                    h('div', { style: { fontSize: 10, fontWeight: 'bold', color: '#34d399', marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 } }, '\u2728 Shared'),
                    shared.length > 0 ? shared.map(function(sid) {
                      return h('div', { key: 'sh_' + sid, style: { fontSize: 11, color: '#6ee7b7', marginBottom: 4, padding: '3px 0', fontWeight: 'bold' } }, getStrengthLabel(sid));
                    }) : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'None yet')
                  ),
                  // Unique to role
                  h('div', { style: { padding: 12, borderRadius: 12, background: role.color + '0a', border: '1px solid ' + role.color + '22' } },
                    h('div', { style: { fontSize: 10, fontWeight: 'bold', color: role.color, marginBottom: 8, textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 } }, role.emoji + ' ' + role.label.split(' ')[0]),
                    uniqueToRole.length > 0 ? uniqueToRole.map(function(sid) {
                      return h('div', { key: 'ur_' + sid, style: { fontSize: 11, color: role.color, marginBottom: 4, padding: '3px 0' } }, getStrengthLabel(sid));
                    }) : h('div', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, 'None')
                  )
                ),

                // Suggestions
                uniqueToRole.length > 0 ? h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)' } },
                  h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 8 } }, '\uD83C\uDF31 Strengths you could develop for this role:'),
                  uniqueToRole.map(function(sid) {
                    var label = getStrengthLabel(sid);
                    var actions = ACTION_SUGGESTIONS[sid];
                    return h('div', { key: 'sug_' + sid, style: { marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(99,102,241,0.08)' } },
                      h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 2 } }, label),
                      actions ? h('div', { style: { fontSize: 11, color: '#94a3b8', lineHeight: 1.4 } }, 'Try: ' + actions[0]) : null
                    );
                  })
                ) : h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)', textAlign: 'center' } },
                  h('div', { style: { fontSize: 16, marginBottom: 4 } }, '\uD83C\uDF1F'),
                  h('div', { style: { fontSize: 13, fontWeight: 'bold', color: '#34d399' } }, 'Perfect match! You have all the strengths for this role!')
                ),

                h('button', { 'aria-label': 'Compare Another Role', onClick: function() { upd({ compareRole: null }); }, style: { marginTop: 14, width: '100%', padding: '10px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDD0D Compare Another Role')
              );
            })() : null,

            // ── CHALLENGE TAB (Daily Strength Challenge) ──
            tab === 'challenge' ? (function() {
              var challengesDone = d.challengesDone || 0;
              var challengeLog = d.challengeLog || {};
              // Compute today's date key
              var now = new Date();
              var todayKey = now.getFullYear() + '-' + String(now.getMonth() + 1) + '-' + String(now.getDate());
              var todayDone = !!challengeLog[todayKey];

              if (selectedStrengths.length === 0) {
                return h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\u26A1'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, 'Select some strengths first!'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'Go to the Discover tab so we can give you daily challenges based on YOUR strengths.'),
                  h('button', { 'aria-label': 'Go Discover', onClick: function() { upd({ tab: 'discover' }); }, style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u2B50 Go Discover')
                );
              }

              // Pick today's strength based on date
              var dayNum = Math.floor(now.getTime() / 86400000);
              var todayStrength = selectedStrengths[dayNum % selectedStrengths.length];
              var challenges = DAILY_CHALLENGES[todayStrength.id] || ACTION_SUGGESTIONS[todayStrength.id] || ['Use your ' + todayStrength.label + ' strength in a meaningful way today.', 'Look for an opportunity to demonstrate ' + todayStrength.label + '.', 'Reflect on a time you used ' + todayStrength.label + ' recently.'];
              // Pick today's specific challenge
              var todayChallenge = challenges[dayNum % challenges.length];

              var completeChallenge = function() {
                if (todayDone) return;
                sfxBadge();
                var newLog = Object.assign({}, challengeLog);
                newLog[todayKey] = { strength: todayStrength.label, challenge: todayChallenge, emoji: todayStrength.emoji };
                var newCount = challengesDone + 1;
                upd({ challengeLog: newLog, challengesDone: newCount });
                if (awardXP) awardXP(10);
                if (addToast) addToast('\u26A1 Daily challenge complete! +10 XP', 'success');
              };

              // Count streak
              var streak = 0;
              var checkDate = new Date(now);
              for (var si = 0; si < 365; si++) {
                var ck = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1) + '-' + String(checkDate.getDate());
                if (challengeLog[ck]) {
                  streak++;
                  checkDate.setDate(checkDate.getDate() - 1);
                } else {
                  break;
                }
              }

              return h('div', null,
                h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 } },
                  band === 'elementary' ? 'Every day you get a fun challenge based on one of your strengths! Can you do it?' :
                  'A new challenge every day, matched to one of your strengths. Small actions build big habits.'
                ),

                // Today's challenge card
                h('div', { style: { textAlign: 'center', padding: 24, borderRadius: 16, background: todayDone ? 'rgba(52,211,153,0.1)' : 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,179,8,0.08))', border: todayDone ? '2px solid rgba(52,211,153,0.3)' : '2px solid rgba(245,158,11,0.3)', marginBottom: 20 } },
                  h('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: todayDone ? '#34d399' : '#f59e0b', marginBottom: 8, fontWeight: 'bold' } }, todayDone ? '\u2705 Challenge Complete!' : '\u26A1 Today\u0027s Challenge'),
                  h('div', { style: { fontSize: 36, marginBottom: 10 } }, todayStrength.emoji),
                  h('div', { style: { fontSize: 12, color: todayDone ? '#34d399' : '#fbbf24', fontWeight: 'bold', marginBottom: 10 } }, 'Use your ' + todayStrength.label + ' strength:'),
                  h('p', { style: { fontSize: 15, fontWeight: 'bold', color: todayDone ? '#6ee7b7' : '#fde68a', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 16px' } }, todayChallenge),
                  callTTS ? h('button', { 'aria-label': 'Read Aloud', onClick: function() { speak('Today\u0027s challenge: Use your ' + todayStrength.label + ' strength. ' + todayChallenge); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fbbf24', fontSize: 11, cursor: 'pointer', marginBottom: 12 } }, '\uD83D\uDD0A Read Aloud') : null,
                  todayDone ?
                    h('div', { style: { fontSize: 13, color: '#34d399', fontWeight: 'bold' } }, '\uD83C\uDF1F Great job! Come back tomorrow for a new challenge.') :
                    h('button', { 'aria-label': 'I Did It! (+10 XP)', onClick: completeChallenge, style: { padding: '12px 30px', borderRadius: 10, background: '#22c55e', color: '#0f172a', border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' } }, '\u2705 I Did It! (+10 XP)')
                ),

                // Stats
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 } },
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' } },
                    h('div', { style: { fontSize: 22, fontWeight: 'bold', color: '#fbbf24' } }, String(challengesDone)),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Completed')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 10, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.15)' } },
                    h('div', { style: { fontSize: 22, fontWeight: 'bold', color: '#34d399' } }, String(streak)),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Day Streak')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 12, borderRadius: 10, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)' } },
                    h('div', { style: { fontSize: 22, fontWeight: 'bold', color: '#c4b5fd' } }, String(challengesDone * 10)),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'XP Earned')
                  )
                ),

                // Other challenges for today's strength
                h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 } },
                  h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 8 } }, '\uD83D\uDCA1 More ' + todayStrength.label + ' ideas:'),
                  challenges.map(function(ch, ci) {
                    var isCurrent = ch === todayChallenge;
                    return h('div', { key: ci, style: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 0', borderBottom: ci < challenges.length - 1 ? '1px solid rgba(99,102,241,0.06)' : 'none' } },
                      h('span', { style: { fontSize: 11, color: isCurrent ? '#fbbf24' : '#94a3b8', fontWeight: isCurrent ? 'bold' : 'normal' } }, (isCurrent ? '\u27A4 ' : '\u25CB ') + ch)
                    );
                  })
                ),

                // Recent history
                (function() {
                  var logKeys = Object.keys(challengeLog).sort().reverse().slice(0, 7);
                  if (logKeys.length === 0) return null;
                  return h('div', null,
                    h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, '\uD83D\uDCC5 Recent Challenges'),
                    logKeys.map(function(key) {
                      var entry = challengeLog[key];
                      return h('div', { key: key, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' } },
                        h('span', { style: { fontSize: 14 } }, entry.emoji || '\u2B50'),
                        h('div', { style: { flex: 1 } },
                          h('div', { style: { fontSize: 11, fontWeight: 'bold', color: '#fbbf24' } }, entry.strength),
                          h('div', { style: { fontSize: 10, color: '#94a3b8' } }, entry.challenge)
                        ),
                        h('span', { style: { fontSize: 10, color: '#94a3b8' } }, key),
                        h('span', { style: { color: '#22c55e', fontSize: 12 } }, '\u2713')
                      );
                    })
                  );
                })()
              );
            })() : null,

            // ── GRATITUDE TAB (Strengths Gratitude) ──
            tab === 'gratitude' ? (function() {
              var gratitudeEntries = d.gratitudeEntries || [];
              var gratInput = d.gratInput || '';
              var gratPerson = d.gratPerson || '';
              var gratStrength = d.gratStrength || '';
              var gratPromptIdx = d.gratPromptIdx || 0;
              var gratPrompts = GRATITUDE_PROMPTS[band] || GRATITUDE_PROMPTS.elementary;
              var currentGratPrompt = gratPrompts[gratPromptIdx % gratPrompts.length];

              var saveGratitude = function() {
                if (!gratInput.trim()) return;
                sfxComplete();
                var newEntry = {
                  person: gratPerson.trim() || 'Someone special',
                  strength: gratStrength.trim() || 'their strength',
                  message: gratInput.trim(),
                  prompt: currentGratPrompt,
                  timestamp: Date.now()
                };
                var newEntries = gratitudeEntries.concat([newEntry]);
                upd({ gratitudeEntries: newEntries, gratInput: '', gratPerson: '', gratStrength: '', gratPromptIdx: (gratPromptIdx + 1) % gratPrompts.length });
                if (addToast) addToast('\uD83D\uDE4F Gratitude entry saved!', 'success');
                if (awardXP) awardXP(5);
              };

              // Strength options for the dropdown
              var allStrengthLabels = [];
              STRENGTH_CATEGORIES.forEach(function(cat) {
                var list = cat.strengths[band] || cat.strengths.elementary;
                list.forEach(function(s) {
                  if (allStrengthLabels.indexOf(s.label) < 0) allStrengthLabels.push(s.label);
                });
              });

              return h('div', null,
                h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 } },
                  band === 'elementary' ? 'Say thank you for the strengths you see in the people around you! It feels good to notice the good in others.' :
                  band === 'middle' ? 'Express gratitude for the strengths you see in others. Noticing strengths in people around you builds empathy and deepens relationships.' :
                  'Gratitude for others\u0027 strengths builds empathy, strengthens relationships, and develops your own capacity for perspective-taking.'
                ),

                // Prompt
                h('div', { style: { textAlign: 'center', padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(139,92,246,0.06))', border: '1px solid rgba(167,139,250,0.25)', marginBottom: 16 } },
                  h('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#a78bfa', marginBottom: 6, fontWeight: 'bold' } }, '\uD83D\uDE4F Gratitude Prompt'),
                  h('p', { style: { fontSize: 14, fontWeight: 'bold', color: '#e0d4ff', lineHeight: 1.6, fontStyle: 'italic' } }, currentGratPrompt),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(currentGratPrompt); }, style: { marginTop: 8, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6, padding: '4px 10px', color: '#c4b5fd', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
                ),

                // Input form
                h('div', { style: { padding: 16, borderRadius: 14, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.15)', marginBottom: 16 } },
                  h('div', { style: { display: 'flex', gap: 8, marginBottom: 10 } },
                    h('div', { style: { flex: 1 } },
                      h('label', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 'bold', marginBottom: 4, display: 'block' } }, 'Person (first name or description)'),
                      h('input', { type: 'text', value: gratPerson, 'aria-label': 'Gratitude person', onChange: function(e) { upd({ gratPerson: e.target.value }); }, placeholder: band === 'elementary' ? 'My friend, my teacher, my mom...' : 'A friend, teacher, family member...', style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' } })
                    ),
                    h('div', { style: { flex: 1 } },
                      h('label', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 'bold', marginBottom: 4, display: 'block' } }, 'Their strength'),
                      h('select', { value: gratStrength, 'aria-label': 'Their strength', onChange: function(e) { upd({ gratStrength: e.target.value }); }, style: { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, boxSizing: 'border-box' } },
                        h('option', { value: '' }, 'Choose a strength...'),
                        allStrengthLabels.map(function(lbl) {
                          return h('option', { key: lbl, value: lbl }, lbl);
                        })
                      )
                    )
                  ),
                  h('label', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 'bold', marginBottom: 4, display: 'block' } }, 'Why are you grateful? What did they do?'),
                  h('textarea', { value: gratInput, 'aria-label': 'Gratitude message', onChange: function(e) { upd({ gratInput: e.target.value }); }, placeholder: band === 'elementary' ? 'I\u0027m grateful because...' : 'Express your gratitude...', style: { width: '100%', minHeight: 80, padding: 10, borderRadius: 8, border: '1px solid rgba(167,139,250,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                    h('button', { 'aria-label': 'Save Gratitude', onClick: saveGratitude, disabled: !gratInput.trim(), style: { padding: '8px 20px', borderRadius: 8, background: gratInput.trim() ? '#8b5cf6' : '#334155', color: gratInput.trim() ? '#fff' : '#94a3b8', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: gratInput.trim() ? 'pointer' : 'default' } }, '\uD83D\uDE4F Save Gratitude'),
                    h('button', { 'aria-label': 'Next Prompt', onClick: function() { upd({ gratPromptIdx: (gratPromptIdx + 1) % gratPrompts.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u27A1 Next Prompt')
                  )
                ),

                // Gratitude wall
                gratitudeEntries.length > 0 ? h('div', null,
                  h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd', marginBottom: 10 } }, '\uD83D\uDE4F Gratitude Wall (' + gratitudeEntries.length + ')'),
                  gratitudeEntries.slice().reverse().map(function(entry, ei) {
                    return h('div', { key: 'grat' + ei, style: { padding: 12, marginBottom: 8, borderRadius: 12, background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)' } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                          h('span', { style: { fontSize: 14 } }, '\uD83D\uDE4F'),
                          h('span', { style: { fontSize: 12, fontWeight: 'bold', color: '#c4b5fd' } }, entry.person),
                          h('span', { style: { fontSize: 10, padding: '2px 8px', borderRadius: 10, background: 'rgba(167,139,250,0.15)', color: '#a78bfa' } }, entry.strength)
                        ),
                        h('span', { style: { fontSize: 10, color: '#94a3b8' } }, new Date(entry.timestamp).toLocaleDateString())
                      ),
                      h('div', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.5 } }, entry.message)
                    );
                  })
                ) : h('div', { style: { textAlign: 'center', padding: 20, color: '#94a3b8', fontSize: 12 } }, 'Your gratitude wall is empty. Start expressing gratitude for others\u0027 strengths!')
              );
            })() : null,

            // ── PLANNER TAB (Strengths in Action) ──
            tab === 'planner' ? (function() {
              var actionChecked = d.actionChecked || {};
              var actionsCompleted = d.actionsCompleted || 0;
              if (selectedStrengths.length === 0) {
                return h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\uD83D\uDCCB'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, 'Select some strengths first!'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'Go to the Discover tab to identify your strengths, then come back to plan how to use them.'),
                  h('button', { 'aria-label': 'Go Discover', onClick: function() { upd({ tab: 'discover' }); }, style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u2B50 Go Discover')
                );
              }
              return h('div', null,
                h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 4, lineHeight: 1.6 } },
                  band === 'elementary' ? 'Here are fun things you can do this week using YOUR strengths!' :
                  'Connect your strengths to real-life action. Check off activities as you complete them.'
                ),
                h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 16 } }, '\u2705 ' + actionsCompleted + ' actions completed'),
                selectedStrengths.map(function(s) {
                  var actions = ACTION_SUGGESTIONS[s.id];
                  if (!actions) return null;
                  var catData = STRENGTH_CATEGORIES.find(function(c) { return c.id === s.category; });
                  var catColor = catData ? catData.color : '#f59e0b';
                  return h('div', { key: s.id + '_' + s.category, style: { marginBottom: 16, padding: 14, borderRadius: 12, background: catColor + '0a', border: '1px solid ' + catColor + '22' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 } },
                      h('span', { style: { fontSize: 16 } }, s.emoji),
                      h('span', { style: { fontSize: 13, fontWeight: 'bold', color: catColor } }, 'Your strength: ' + s.label)
                    ),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 8, fontStyle: 'italic' } }, 'This week, try:'),
                    actions.map(function(action, ai) {
                      var actionKey = s.id + '_' + s.category + '_' + ai;
                      var checked = !!actionChecked[actionKey];
                      return h('div', { key: ai, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0', borderBottom: ai < actions.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' } },
                        h('button', { 'aria-label': 'peers', onClick: function() {
                          sfxSelect();
                          var newChecked = Object.assign({}, actionChecked);
                          newChecked[actionKey] = !checked;
                          var newCount = Object.keys(newChecked).filter(function(k) { return newChecked[k]; }).length;
                          upd({ actionChecked: newChecked, actionsCompleted: newCount });
                          if (!checked && addToast) addToast('\u2705 Action completed! Way to use your strengths!', 'success');
                        }, style: { flex: '0 0 auto', width: 22, height: 22, borderRadius: 6, border: checked ? '2px solid #22c55e' : '2px solid rgba(99,102,241,0.2)', background: checked ? 'rgba(34,197,94,0.2)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#22c55e', padding: 0 } }, checked ? '\u2713' : ''),
                        h('span', { style: { fontSize: 12, color: checked ? '#94a3b8' : '#cbd5e1', lineHeight: 1.5, textDecoration: checked ? 'line-through' : 'none' } }, (ai + 1) + ') ' + action)
                      );
                    })
                  );
                })
              );
            })() : null,

            // ── PEERS TAB ──
            tab === 'peers' ? (function() {
              var peerNotes = d.peerNotes || [];
              var peerInput = d.peerInput || '';
              var peerPromptIdx = d.peerPromptIdx || 0;
              var askFriendIdx = d.askFriendIdx || 0;
              var peerPrompts = PEER_PROMPTS[band] || PEER_PROMPTS.elementary;
              var currentPeerPrompt = peerPrompts[peerPromptIdx % peerPrompts.length];

              var savePeerNote = function() {
                if (!peerInput.trim()) return;
                sfxComplete();
                var newNotes = peerNotes.concat([{
                  prompt: currentPeerPrompt,
                  note: peerInput.trim(),
                  timestamp: Date.now()
                }]);
                upd({ peerNotes: newNotes, peerInput: '', peerPromptIdx: (peerPromptIdx + 1) % peerPrompts.length });
                if (addToast) addToast('\uD83D\uDC41\uFE0F Peer strength noted!', 'success');
              };

              return h('div', null,
                h('p', { style: { fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 } },
                  band === 'elementary' ? 'Notice the strengths in people around you! You don\'t have to name anyone \u2014 just describe what you see.' :
                  'Observing strengths in others sharpens your ability to see strengths in yourself. All entries are anonymous \u2014 describe what you see, not who.'
                ),

                // Strengths I See section
                h('div', { style: { background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 } },
                  h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#a5b4fc', marginBottom: 8 } }, '\uD83D\uDC41\uFE0F Strengths I See in Others'),
                  h('p', { style: { fontSize: 12, color: '#a5b4fc', fontWeight: 600, marginBottom: 8, lineHeight: 1.5 } }, currentPeerPrompt),
                  callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(currentPeerPrompt); }, style: { background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 6, padding: '3px 8px', color: '#a5b4fc', fontSize: 10, cursor: 'pointer', marginBottom: 8 } }, '\uD83D\uDD0A Read aloud') : null,
                  h('textarea', { value: peerInput, 'aria-label': 'Peer strength observation', onChange: function(e) { upd({ peerInput: e.target.value }); }, placeholder: 'Describe the strength you noticed (no names needed)...', style: { width: '100%', minHeight: 70, padding: 10, borderRadius: 8, border: '1px solid rgba(99,102,241,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' } }),
                  h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                    h('button', { 'aria-label': 'Save Observation', onClick: savePeerNote, disabled: !peerInput.trim(), style: { padding: '8px 16px', borderRadius: 8, background: peerInput.trim() ? '#6366f1' : '#334155', color: peerInput.trim() ? '#fff' : '#94a3b8', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: peerInput.trim() ? 'pointer' : 'default' } }, '\u2705 Save Observation'),
                    h('button', { 'aria-label': 'Next Prompt', onClick: function() { upd({ peerPromptIdx: (peerPromptIdx + 1) % peerPrompts.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u27A1 Next Prompt')
                  )
                ),

                // Ask a Friend section
                h('div', { style: { background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 } },
                  h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#fbbf24', marginBottom: 8 } }, '\uD83D\uDCE8 Ask a Friend'),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', marginBottom: 10, lineHeight: 1.5 } },
                    'Want to know what others see in you? Share one of these questions with a friend, family member, or teacher.'
                  ),
                  h('div', { style: { padding: 14, borderRadius: 10, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', marginBottom: 10 } },
                    h('p', { style: { fontSize: 14, color: '#fde68a', fontWeight: 600, lineHeight: 1.6, fontStyle: 'italic' } }, '\u201C' + ASK_FRIEND_TEMPLATES[askFriendIdx % ASK_FRIEND_TEMPLATES.length] + '\u201D')
                  ),
                  h('div', { style: { display: 'flex', gap: 8 } },
                    h('button', { 'aria-label': 'Copy Question', onClick: function() {
                      var text = ASK_FRIEND_TEMPLATES[askFriendIdx % ASK_FRIEND_TEMPLATES.length];
                      navigator.clipboard.writeText(text).then(function() {
                        if (addToast) addToast('\uD83D\uDCCB Question copied! Share it with someone you trust.', 'success');
                      }).catch(function() {});
                    }, style: { padding: '6px 14px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCCB Copy Question'),
                    h('button', { 'aria-label': 'Different Question', onClick: function() { upd({ askFriendIdx: (askFriendIdx + 1) % ASK_FRIEND_TEMPLATES.length }); }, style: { padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 11, cursor: 'pointer' } }, '\u27A1 Different Question')
                  )
                ),

                // Past peer notes
                peerNotes.length > 0 ? h('div', null,
                  h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, '\uD83D\uDCD6 My Observations (' + peerNotes.length + ')'),
                  peerNotes.slice().reverse().map(function(n, i) {
                    return h('div', { key: i, style: { padding: 10, marginBottom: 6, borderRadius: 8, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
                      h('div', { style: { fontSize: 10, color: '#94a3b8', marginBottom: 2 } }, new Date(n.timestamp).toLocaleDateString()),
                      h('div', { style: { fontSize: 11, color: '#a5b4fc', fontWeight: 600, marginBottom: 2 } }, n.prompt),
                      h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 } }, n.note)
                    );
                  })
                ) : null
              );
            })() : null,

            // ── AFFIRMATION TAB ──
            tab === 'affirm' ? (function() {
              var affirmCat = d.affirmCat || 'character';
              var affirmIdx = d.affirmIdx || 0;
              var affirmationsRead = d.affirmationsRead || 0;
              var cards = AFFIRMATION_CARDS[affirmCat] || AFFIRMATION_CARDS.character;
              var currentAffirmation = cards[affirmIdx % cards.length];
              var catData = STRENGTH_CATEGORIES.find(function(c) { return c.id === affirmCat; });
              var catColor = catData ? catData.color : '#f59e0b';
              var catEmoji = catData ? catData.emoji : '\u2B50';

              // Daily rotation: use day of year to pick a "daily" affirmation
              var dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
              var allAffirmations = AFFIRMATION_CARDS.character.concat(AFFIRMATION_CARDS.talent, AFFIRMATION_CARDS.growth);
              var dailyAffirmation = allAffirmations[dayOfYear % allAffirmations.length];

              return h('div', null,
                // Daily affirmation
                h('div', { style: { textAlign: 'center', padding: 20, marginBottom: 20, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(234,179,8,0.08))', border: '1px solid rgba(245,158,11,0.3)' } },
                  h('div', { style: { fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: '#f59e0b', marginBottom: 8, fontWeight: 'bold' } }, '\u2728 Today\'s Affirmation'),
                  h('p', { style: { fontSize: 16, fontWeight: 'bold', color: '#fde68a', lineHeight: 1.6, fontStyle: 'italic', maxWidth: 400, margin: '0 auto 12px' } }, '\u201C' + dailyAffirmation + '\u201D'),
                  callTTS ? h('button', { 'aria-label': 'Hear It', onClick: function() { speak(dailyAffirmation); }, style: { background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8, padding: '6px 14px', color: '#fbbf24', fontSize: 11, cursor: 'pointer' } }, '\uD83D\uDD0A Hear It') : null
                ),

                // Category selector
                h('div', { style: { display: 'flex', gap: 6, marginBottom: 16, justifyContent: 'center' } },
                  STRENGTH_CATEGORIES.map(function(cat) {
                    var active = affirmCat === cat.id;
                    return h('button', { 'aria-label': '+ cat.label.split(', key: cat.id, onClick: function() { upd({ affirmCat: cat.id, affirmIdx: 0 }); }, style: { padding: '6px 14px', borderRadius: 20, background: active ? cat.color + '22' : 'rgba(255,255,255,0.04)', border: active ? '2px solid ' + cat.color : '1px solid rgba(99,102,241,0.15)', color: active ? cat.color : '#94a3b8', fontSize: 11, fontWeight: 'bold', cursor: 'pointer' } }, cat.emoji + ' ' + cat.label.split(' ')[0]);
                  })
                ),

                // Card display
                h('div', { style: { textAlign: 'center', padding: 30, marginBottom: 16, borderRadius: 14, background: catColor + '0a', border: '2px solid ' + catColor + '33', minHeight: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' } },
                  h('div', { style: { fontSize: 32, marginBottom: 12 } }, catEmoji),
                  h('p', { style: { fontSize: 18, fontWeight: 'bold', color: catColor, lineHeight: 1.6, maxWidth: 400 } }, currentAffirmation),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 10 } }, (affirmIdx % cards.length + 1) + ' / ' + cards.length)
                ),

                // Controls
                h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 } },
                  h('button', { 'aria-label': 'Previous', onClick: function() {
                    var prev = affirmIdx > 0 ? affirmIdx - 1 : cards.length - 1;
                    upd({ affirmIdx: prev });
                  }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u2190 Previous'),
                  callTTS ? h('button', { 'aria-label': 'Read Aloud', onClick: function() {
                    speak(currentAffirmation);
                    var newCount = affirmationsRead + 1;
                    upd({ affirmationsRead: newCount });
                  }, style: { padding: '8px 20px', borderRadius: 8, background: catColor, color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDD0A Read Aloud') : null,
                  h('button', { 'aria-label': 'Next', onClick: function() {
                    var next = (affirmIdx + 1) % cards.length;
                    var newCount = affirmationsRead + 1;
                    upd({ affirmIdx: next, affirmationsRead: newCount });
                  }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, 'Next \u2192')
                ),

                // Affirmation stats
                h('div', { style: { textAlign: 'center', fontSize: 11, color: '#94a3b8', padding: 8 } },
                  '\uD83D\uDCAC Affirmations practiced: ' + affirmationsRead
                )
              );
            })() : null,

            // ── COACH TAB ──
            tab === 'coach' ? h('div', null,
              h('div', { style: { textAlign: 'center', padding: 20 } },
                h('div', { style: { fontSize: 40, marginBottom: 8 } }, '\uD83E\uDD16'),
                h('p', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.6, maxWidth: 400, margin: '0 auto 16px' } },
                  band === 'elementary' ? 'I\'m your Strengths Coach! Ask me anything about your strengths. I\'ll help you see how amazing you are!' :
                  'I\'m your AI Strengths Coach. Ask me about your strengths, how to use them, or how to grow in areas that matter to you.'
                )
              ),
              aiResponse ? h('div', { style: { padding: 14, borderRadius: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: '#fde68a' } },
                h('div', { style: { fontSize: 10, color: '#f59e0b', fontWeight: 'bold', marginBottom: 4 } }, '\uD83E\uDD16 Strengths Coach'),
                aiResponse,
                callTTS ? h('button', { 'aria-label': 'Read aloud', onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: '#f59e0b', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
              ) : null,
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', { type: 'text', value: aiInput, onChange: function(e) { upd({ aiInput: e.target.value }); }, onKeyDown: function(e) { if (e.key === 'Enter' && aiInput.trim()) askAI(); }, placeholder: band === 'elementary' ? 'Ask me about your strengths...' : 'Ask about your strengths, growth areas, or how to apply them...', style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12 } }),
                h('button', { 'aria-label': 'div', onClick: askAI, disabled: aiLoading, style: { padding: '10px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3' : '\u2191')
              ),
              // Quick questions
              h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 } },
                (band === 'elementary' ? [
                  'What are my best strengths?',
                  'How can I use my strengths at school?',
                  'What should I work on?'
                ] : [
                  'How do my strengths complement each other?',
                  'How can I apply my strengths to my goals?',
                  'What careers match my strengths?',
                  'How can I turn a weakness into a strength?'
                ]).map(function(q) {
                  return h('button', { 'aria-label': '5px 10px', key: q, onClick: function() { upd({ aiInput: q }); }, style: { padding: '5px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, cursor: 'pointer' } }, q);
                })
              )
            ) : null,

            // ── PROFILE TAB ──
            tab === 'profile' ? h('div', null,
              selectedStrengths.length === 0 ?
                h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\u2B50'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, 'No strengths selected yet.'),
                  h('p', { style: { fontSize: 12, color: '#94a3b8', marginTop: 4 } }, 'Go to the Discover tab to identify your strengths!'),
                  h('button', { 'aria-label': 'Start Discovering', onClick: function() { upd({ tab: 'discover' }); }, style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u2B50 Start Discovering')
                ) :
                h('div', null,
                  h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24', marginBottom: 12 } }, '\u2B50 Your Strengths Profile'),

                  // ── Strength Wheel (SVG Radar) ──
                  (function() {
                    var catCounts = STRENGTH_CATEGORIES.map(function(cat) {
                      return { label: cat.label.split(' ')[0], color: cat.color, emoji: cat.emoji, count: selectedStrengths.filter(function(s) { return s.category === cat.id; }).length };
                    });
                    var maxCount = Math.max(1, Math.max.apply(null, catCounts.map(function(c) { return c.count; })));
                    var cx = 120, cy = 110, radius = 80;
                    var n = catCounts.length;
                    var points = catCounts.map(function(c, i) {
                      var angle = (Math.PI * 2 * i / n) - Math.PI / 2;
                      var r = (c.count / maxCount) * radius;
                      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), labelX: cx + (radius + 18) * Math.cos(angle), labelY: cy + (radius + 18) * Math.sin(angle), color: c.color, label: c.emoji + ' ' + c.label, count: c.count };
                    });
                    var polygonPoints = points.map(function(p) { return p.x + ',' + p.y; }).join(' ');
                    var gridLevels = [0.25, 0.5, 0.75, 1];
                    return h('div', { style: { textAlign: 'center', marginBottom: 20 } },
                      h('svg', { width: 240, height: 230, viewBox: '0 0 240 230', style: { maxWidth: '100%' } },
                        // Grid rings
                        gridLevels.map(function(lvl, li) {
                          var gridPts = [];
                          for (var gi = 0; gi < n; gi++) {
                            var a = (Math.PI * 2 * gi / n) - Math.PI / 2;
                            gridPts.push((cx + radius * lvl * Math.cos(a)) + ',' + (cy + radius * lvl * Math.sin(a)));
                          }
                          return h('polygon', { key: li, points: gridPts.join(' '), fill: 'none', stroke: 'rgba(99,102,241,0.15)', strokeWidth: 1 });
                        }),
                        // Axis lines
                        points.map(function(p, pi) {
                          var a = (Math.PI * 2 * pi / n) - Math.PI / 2;
                          return h('line', { key: 'ax' + pi, x1: cx, y1: cy, x2: cx + radius * Math.cos(a), y2: cy + radius * Math.sin(a), stroke: 'rgba(99,102,241,0.12)', strokeWidth: 1 });
                        }),
                        // Filled shape
                        selectedStrengths.length > 0 ? h('polygon', { points: polygonPoints, fill: 'rgba(245,158,11,0.2)', stroke: '#f59e0b', strokeWidth: 2 }) : null,
                        // Dots
                        points.map(function(p, pi) {
                          return h('circle', { key: 'dot' + pi, cx: p.x, cy: p.y, r: 4, fill: p.color, stroke: '#0f172a', strokeWidth: 2 });
                        }),
                        // Labels
                        points.map(function(p, pi) {
                          return h('text', { key: 'lbl' + pi, x: p.labelX, y: p.labelY, fill: p.color, fontSize: 11, fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'central' }, p.label + ' (' + p.count + ')');
                        })
                      )
                    );
                  })(),

                  // Category breakdown
                  STRENGTH_CATEGORIES.map(function(cat) {
                    var catStrengths = selectedStrengths.filter(function(s) { return s.category === cat.id; });
                    var total = (cat.strengths[band] || cat.strengths.elementary).length;
                    if (catStrengths.length === 0) return null;
                    return h('div', { key: cat.id, style: { marginBottom: 16 } },
                      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 } },
                        h('div', { style: { fontSize: 12, fontWeight: 'bold', color: cat.color } }, cat.emoji + ' ' + cat.label + ' (' + catStrengths.length + '/' + total + ')'),
                        h('div', { style: { width: 100, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } },
                          h('div', { style: { width: Math.round(catStrengths.length / total * 100) + '%', height: '100%', background: cat.color, borderRadius: 3, transition: 'width 0.3s' } })
                        )
                      ),
                      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6 } },
                        catStrengths.map(function(s) {
                          return h('span', { key: s.id, style: { padding: '5px 12px', borderRadius: 20, background: cat.color + '22', border: '1px solid ' + cat.color + '44', color: cat.color, fontSize: 11, fontWeight: 'bold' } }, s.emoji + ' ' + s.label);
                        })
                      )
                    );
                  }),
                  // Stats grid
                  h('div', { style: { marginTop: 20, padding: 12, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
                    h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, '\uD83D\uDCCA Summary'),
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, textAlign: 'center' } },
                      [
                        { val: selectedStrengths.length, label: 'Strengths', color: '#fbbf24' },
                        { val: reflections.length + (d.deepReflections || []).length, label: 'Reflections', color: '#a78bfa' },
                        { val: scenariosDone.length, label: 'Scenarios', color: '#f97316' },
                        { val: quizBest, label: 'Quiz Best', color: '#34d399' },
                        { val: d.actionsCompleted || 0, label: 'Actions', color: '#22c55e' },
                        { val: (d.stories || []).length, label: 'Stories', color: '#f59e0b' },
                        { val: d.challengesDone || 0, label: 'Challenges', color: '#f97316' },
                        { val: (d.gratitudeEntries || []).length, label: 'Gratitude', color: '#a78bfa' },
                        { val: (d.peerNotes || []).length, label: 'Peer Notes', color: '#6366f1' },
                        { val: d.affirmationsRead || 0, label: 'Affirmations', color: '#f472b6' },
                        { val: badgeCount, label: 'Badges', color: '#818cf8' }
                      ].map(function(s, si) {
                        return h('div', { key: si },
                          h('div', { style: { fontSize: 20, fontWeight: 'bold', color: s.color } }, String(s.val)),
                          h('div', { style: { fontSize: 11, color: '#94a3b8' } }, s.label)
                        );
                      })
                    )
                  )
                )
            ) : null
          )
        );
      })();
    }
  });

  console.log('[SelHub] sel_tool_strengths.js v2.5 loaded \u2014 Strengths Finder (Stories, Compare, Challenge, Gratitude, Interview, Planner, Peers, Affirmations)');
})();
