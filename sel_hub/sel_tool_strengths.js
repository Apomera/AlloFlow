// ═══════════════════════════════════════════════════════════════
// sel_tool_strengths.js — Strengths Finder Plugin (v1.0)
// Discover personal strengths through guided reflection, sorting
// activities, strengths cards, growth mindset exercises, AI coach,
// and achievement badges.
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
    explorer: { icon: '\uD83D\uDE80', name: 'Full Explorer', desc: 'Visit all tabs' }
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
    if (d.tabsVisited && d.tabsVisited.length >= 6) award('explorer');
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
        }, [selectedStrengths.length, reflections.length, d.aiAsked, d.exported, scenariosDone.length, topScenarios, quizBest, tabsVisited.length]);

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
          if (callTTS) {
            callTTS(text).then(function(url) {
              if (url) { var a = new Audio(url); a.play().catch(function() {}); }
            }).catch(function() {});
          }
        };

        var prompts = REFLECTION_PROMPTS[band] || REFLECTION_PROMPTS.elementary;
        var currentPrompt = prompts[currentPromptIdx % prompts.length];

        // ═══════════════════════════════════════════════════════════
        // ── UI ──
        // ═══════════════════════════════════════════════════════════
        var accentColor = '#f59e0b';
        var bgDark = '#0f172a';

        return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%', background: bgDark, color: '#e2e8f0', fontFamily: '"Inter", system-ui, sans-serif', overflow: 'hidden' } },

          // Header
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'linear-gradient(135deg, #78350f, #92400e)', borderBottom: '1px solid rgba(245,158,11,0.3)' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
              h('button', { onClick: function() { ctx.setStemLabTool ? ctx.setStemLabTool(null) : (ctx.setSelHubTool && ctx.setSelHubTool(null)); }, style: { background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '6px 12px', color: '#fde68a', cursor: 'pointer', fontSize: 12, fontWeight: 'bold' } }, '\u2190 Back'),
              h('div', { style: { fontWeight: 'bold', fontSize: 16, color: '#fde68a' } }, '\u2B50 Strengths Finder'),
              h('span', { style: { fontSize: 10, color: 'rgba(253,230,138,0.6)' } }, band === 'elementary' ? 'Elementary' : band === 'middle' ? 'Middle School' : 'High School')
            ),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8 } },
              h('span', { style: { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 'bold', border: '1px solid rgba(245,158,11,0.3)' } }, '\u2B50 ' + selectedStrengths.length + ' strengths'),
              h('button', { onClick: function() { upd({ showBadges: !showBadges }); }, style: { background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8, padding: '3px 8px', color: '#c4b5fd', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFC5 ' + badgeCount),
              h('button', { onClick: exportProfile, style: { background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 8, padding: '3px 8px', color: '#6ee7b7', fontSize: 10, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDCE4 Export')
            )
          ),

          // Tabs
          h('div', { style: { display: 'flex', borderBottom: '1px solid rgba(245,158,11,0.15)', background: 'rgba(15,23,42,0.8)' } },
            [{ id: 'discover', label: '\u2B50 Discover' }, { id: 'scenarios', label: '\uD83C\uDFAD Scenarios' }, { id: 'quiz', label: '\uD83E\uDDE9 Quiz' }, { id: 'reflect', label: '\uD83D\uDCDD Reflect' }, { id: 'coach', label: '\uD83E\uDD16 Coach' }, { id: 'profile', label: '\uD83D\uDCCA Profile' }].map(function(t) {
              var active = tab === t.id;
              return h('button', { key: t.id, onClick: function() { sfxSelect(); var tv = tabsVisited.indexOf(t.id) < 0 ? tabsVisited.concat([t.id]) : tabsVisited; upd({ tab: t.id, tabsVisited: tv }); }, style: { flex: 1, padding: '10px 4px', fontSize: 10, fontWeight: 'bold', color: active ? '#fbbf24' : '#64748b', background: active ? 'rgba(245,158,11,0.1)' : 'transparent', border: 'none', borderBottom: active ? '2px solid #f59e0b' : '2px solid transparent', cursor: 'pointer' } }, t.label);
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
                  h('span', { style: { fontWeight: 'bold', color: earned ? '#c4b5fd' : '#64748b' } }, b.name)
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
                      return h('button', { key: s.id, onClick: function() { toggleStrength(s, cat.id); }, title: s.desc, style: {
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
                          callTTS ? h('button', { onClick: function() { speak(s.label + '. ' + fullData.desc); }, style: { marginLeft: 4, background: 'none', border: 'none', color: '#64748b', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A') : null
                        ) : null;
                      })
                    ) : null
                );
              })
            ) : null,

            // ── SCENARIOS TAB ──
            tab === 'scenarios' ? (function() {
              var scenarios = SCENARIOS[band] || SCENARIOS.elementary;
              var sc = scenarios[scenarioIdx % scenarios.length];
              return h('div', null,
                h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12 } },
                  band === 'elementary' ? 'Read the story and pick the choice that shows YOUR strengths!' :
                  'Choose how you\'d respond. Each choice shows a different strength in action.'
                ),
                h('div', { style: { fontSize: 10, color: '#64748b', marginBottom: 12 } },
                  'Scenario ' + ((scenarioIdx % scenarios.length) + 1) + ' of ' + scenarios.length +
                  (scenariosDone.length > 0 ? ' \u2014 ' + scenariosDone.length + ' completed' : '')
                ),
                // Scenario card
                h('div', { style: { padding: 16, borderRadius: 14, background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(234,179,8,0.05))', border: '1px solid rgba(245,158,11,0.25)', marginBottom: 16 } },
                  h('div', { style: { fontSize: 14, fontWeight: 'bold', color: '#fbbf24', marginBottom: 8 } }, '\uD83C\uDFAD ' + sc.title),
                  h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 12 } }, sc.setup),
                  callTTS ? h('button', { onClick: function() { speak(sc.setup); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '3px 8px', color: '#fbbf24', fontSize: 10, cursor: 'pointer', marginBottom: 12 } }, '\uD83D\uDD0A Read aloud') : null,
                  // Choices
                  !scenarioChoice ? h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
                    sc.choices.map(function(ch, ci) {
                      return h('button', { key: ci, onClick: function() {
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
                      h('button', { onClick: function() { upd({ scenarioChoice: null, scenarioIdx: (scenarioIdx + 1) % scenarios.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\u27A1 Next Scenario'),
                      h('button', { onClick: function() { upd({ scenarioChoice: null }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\uD83D\uDD04 Try Again')
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
                  h('p', { style: { fontSize: 11, color: '#64748b', marginBottom: 16 } }, quizData.length + ' questions \u2022 Best score: ' + quizBest + '/' + quizData.length),
                  h('button', { onClick: function() { upd({ quizActive: true, quizIdx: 0, quizScore: 0, quizFeedback: null, quizDone: false }); }, style: { padding: '12px 30px', borderRadius: 10, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 14, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83C\uDFAE Start Quiz')
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
                    h('button', { onClick: function() { upd({ quizActive: true, quizIdx: 0, quizScore: 0, quizFeedback: null, quizDone: false }); }, style: { padding: '10px 24px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' } }, '\uD83D\uDD04 Play Again'),
                    h('button', { onClick: function() { upd({ quizActive: false, quizDone: false }); }, style: { padding: '10px 24px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u2190 Back')
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
                h('div', { style: { fontSize: 10, color: '#64748b', marginBottom: 8 } }, 'Question ' + (quizIdx + 1) + ' / ' + quizData.length + ' \u2022 Score: ' + quizScore),
                h('div', { style: { padding: 16, borderRadius: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: 16 } },
                  h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 4 } }, '\uD83D\uDCA1 ' + q.situation),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 'bold', marginTop: 8 } }, 'Which strength is being demonstrated?')
                ),
                quizFeedback ? h('div', { style: { padding: 14, borderRadius: 10, marginBottom: 12, background: quizFeedback.correct ? 'rgba(52,211,153,0.1)' : 'rgba(239,68,68,0.1)', border: '1px solid ' + (quizFeedback.correct ? 'rgba(52,211,153,0.3)' : 'rgba(239,68,68,0.3)') } },
                  h('p', { style: { fontSize: 13, fontWeight: 'bold', color: quizFeedback.correct ? '#34d399' : '#f87171' } }, quizFeedback.correct ? '\u2705 Correct!' : '\u274C Not quite \u2014 the answer is ' + q.answer),
                  h('button', { onClick: function() {
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
                    return h('button', { key: opt, onClick: function() {
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
                callTTS ? h('button', { onClick: function() { speak(currentPrompt); }, style: { background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '4px 10px', color: '#fbbf24', fontSize: 10, cursor: 'pointer', marginBottom: 8 } }, '\uD83D\uDD0A Read aloud') : null,
                h('textarea', { value: reflectionInput, onChange: function(e) { upd({ reflectionInput: e.target.value }); }, placeholder: band === 'elementary' ? 'Write your answer here...' : 'Take your time. There\'s no right or wrong answer...', style: { width: '100%', minHeight: 100, padding: 10, borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' } }),
                h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
                  h('button', { onClick: saveReflection, disabled: !reflectionInput.trim(), style: { padding: '8px 20px', borderRadius: 8, background: reflectionInput.trim() ? '#f59e0b' : '#334155', color: reflectionInput.trim() ? '#0f172a' : '#64748b', border: 'none', fontSize: 12, fontWeight: 'bold', cursor: reflectionInput.trim() ? 'pointer' : 'default' } }, '\u2705 Save Reflection'),
                  h('button', { onClick: function() { upd({ currentPromptIdx: (currentPromptIdx + 1) % prompts.length }); }, style: { padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(99,102,241,0.15)', fontSize: 12, cursor: 'pointer' } }, '\u27A1 Next Prompt')
                )
              ),
              // Past reflections
              reflections.length > 0 ? h('div', null,
                h('div', { style: { fontSize: 12, fontWeight: 'bold', color: '#94a3b8', marginBottom: 8 } }, '\uD83D\uDCD6 Past Reflections (' + reflections.length + ')'),
                reflections.slice().reverse().map(function(r, i) {
                  return h('div', { key: i, style: { padding: 12, marginBottom: 8, borderRadius: 10, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' } },
                    h('div', { style: { fontSize: 10, color: '#64748b', marginBottom: 4 } }, new Date(r.timestamp).toLocaleDateString()),
                    h('div', { style: { fontSize: 11, color: '#fbbf24', fontWeight: 600, marginBottom: 4 } }, r.prompt),
                    h('div', { style: { fontSize: 12, color: '#cbd5e1', lineHeight: 1.5 } }, r.response)
                  );
                })
              ) : h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 12, padding: 20 } }, 'No reflections yet. Answer the prompt above to get started!')
            ) : null,

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
                callTTS ? h('button', { onClick: function() { speak(aiResponse); }, style: { marginTop: 6, background: 'none', border: 'none', color: '#f59e0b', fontSize: 10, cursor: 'pointer' } }, '\uD83D\uDD0A Read aloud') : null
              ) : null,
              h('div', { style: { display: 'flex', gap: 6 } },
                h('input', { type: 'text', value: aiInput, onChange: function(e) { upd({ aiInput: e.target.value }); }, onKeyDown: function(e) { if (e.key === 'Enter' && aiInput.trim()) askAI(); }, placeholder: band === 'elementary' ? 'Ask me about your strengths...' : 'Ask about your strengths, growth areas, or how to apply them...', style: { flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.2)', background: 'rgba(15,23,42,0.6)', color: '#e2e8f0', fontSize: 12, outline: 'none' } }),
                h('button', { onClick: askAI, disabled: aiLoading, style: { padding: '10px 16px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: aiLoading ? 'wait' : 'pointer' } }, aiLoading ? '\u23F3' : '\u2191')
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
                  return h('button', { key: q, onClick: function() { upd({ aiInput: q }); }, style: { padding: '5px 10px', borderRadius: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', color: '#fbbf24', fontSize: 10, cursor: 'pointer' } }, q);
                })
              )
            ) : null,

            // ── PROFILE TAB ──
            tab === 'profile' ? h('div', null,
              selectedStrengths.length === 0 ?
                h('div', { style: { textAlign: 'center', padding: 40 } },
                  h('div', { style: { fontSize: 48, marginBottom: 12 } }, '\u2B50'),
                  h('p', { style: { fontSize: 14, color: '#94a3b8' } }, 'No strengths selected yet.'),
                  h('p', { style: { fontSize: 12, color: '#64748b', marginTop: 4 } }, 'Go to the Discover tab to identify your strengths!'),
                  h('button', { onClick: function() { upd({ tab: 'discover' }); }, style: { marginTop: 12, padding: '8px 20px', borderRadius: 8, background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 'bold', fontSize: 12, cursor: 'pointer' } }, '\u2B50 Start Discovering')
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
                          return h('text', { key: 'lbl' + pi, x: p.labelX, y: p.labelY, fill: p.color, fontSize: 9, fontWeight: 'bold', textAnchor: 'middle', dominantBaseline: 'central' }, p.label + ' (' + p.count + ')');
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
                    h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, textAlign: 'center' } },
                      [
                        { val: selectedStrengths.length, label: 'Strengths', color: '#fbbf24' },
                        { val: reflections.length, label: 'Reflections', color: '#a78bfa' },
                        { val: scenariosDone.length, label: 'Scenarios', color: '#f97316' },
                        { val: quizBest, label: 'Quiz Best', color: '#34d399' },
                        { val: badgeCount, label: 'Badges', color: '#6366f1' }
                      ].map(function(s, si) {
                        return h('div', { key: si },
                          h('div', { style: { fontSize: 20, fontWeight: 'bold', color: s.color } }, String(s.val)),
                          h('div', { style: { fontSize: 9, color: '#64748b' } }, s.label)
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

  console.log('[SelHub] sel_tool_strengths.js loaded \u2014 Strengths Finder');
})();
