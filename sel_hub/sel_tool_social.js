// ═══════════════════════════════════════════════════════════════
// sel_tool_social.js — Social Skills Lab Plugin (v1.0)
// Conversation starters with AI practice partner, active
// listening challenges, body language decoder, cooperation
// scenarios, friendship skills, and practice log.
// Registered tool ID: "social"
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
  function sfxSave() { playTone(440, 0.15, 'sine', 0.06); setTimeout(function() { playTone(554, 0.15, 'sine', 0.06); }, 100); setTimeout(function() { playTone(659, 0.2, 'sine', 0.08); }, 200); }

  // ══════════════════════════════════════════════════════════════
  // ── Conversation Starters ──
  // ══════════════════════════════════════════════════════════════
  var CONVO_STARTERS = {
    elementary: [
      { prompt: 'You sit next to someone new at lunch. What could you say to start talking?', tips: ['Smile and say hi!', 'Ask their name', 'Ask what they like to play', 'Share something about yourself too'] },
      { prompt: 'Your friend looks sad at recess. What could you say?', tips: ['Ask "Are you okay?"', 'Say "I noticed you look sad"', 'Offer to play together', 'Listen without interrupting'] },
      { prompt: 'You want to join a game that other kids are already playing. What do you do?', tips: ['Wait for a good moment', 'Ask "Can I play?"', 'Offer to be on a team', 'Don\'t just jump in — ask first'] },
      { prompt: 'Someone says something you don\'t agree with. How do you respond nicely?', tips: ['Say "I think differently"', 'Don\'t say "You\'re wrong!"', 'Ask them to explain more', 'It\'s okay to disagree'] },
      { prompt: 'Your classmate did a really good job on a project. What could you say?', tips: ['Give a specific compliment', 'Say what you liked about it', 'Ask how they did it', 'Be genuine, not fake'] },
      { prompt: 'You accidentally bumped into someone in the hallway. What do you do?', tips: ['Say "I\'m sorry!" right away', 'Check if they\'re okay', 'Help pick up anything they dropped', 'Make eye contact'] }
    ],
    middle: [
      { prompt: 'You\'re at a new school and don\'t know anyone at your table. How do you break the ice?', tips: ['Ask about shared classes or teachers', 'Comment on something happening around you', 'Ask an open question, not yes/no', 'Share something relatable about yourself'] },
      { prompt: 'A friend is venting about a problem. They don\'t want advice — just someone to listen. How do you respond?', tips: ['Use active listening phrases', 'Reflect back what they said', 'Avoid jumping to solutions', 'Validate their feelings: "That sounds really hard"'] },
      { prompt: 'Someone in your group isn\'t contributing to the project. How do you bring it up?', tips: ['Use an I-statement: "I noticed..."', 'Ask if something is going on', 'Be direct but kind', 'Focus on the work, not the person'] },
      { prompt: 'You want to invite a new classmate to hang out but you\'re nervous. What do you say?', tips: ['Be casual and specific', 'Suggest a low-pressure activity', 'Accept "no" gracefully', 'It gets easier with practice'] },
      { prompt: 'A friend says something that hurts your feelings but probably didn\'t mean to. What do you do?', tips: ['Tell them how it made you feel', 'Assume good intent first', 'Use "When you said X, I felt Y"', 'Give them a chance to respond'] },
      { prompt: 'You disagree with the group\'s decision. How do you share your perspective?', tips: ['Acknowledge their view first', 'Present your reasoning calmly', 'Be open to compromise', 'Disagree with the idea, not the person'] }
    ],
    high: [
      { prompt: 'You\'re in a discussion where someone keeps interrupting others. How do you address it constructively?', tips: ['Name the pattern, not the person', '"I want to make sure everyone is heard"', 'Redirect: "Let\'s hear from ___ first"', 'Model the behavior you want to see'] },
      { prompt: 'A peer is going through something difficult and you don\'t know what to say. How do you show up?', tips: ['Presence > perfection', '"I don\'t know what to say, but I\'m here"', 'Don\'t minimize or compare', 'Follow their lead on what they need'] },
      { prompt: 'You realize you\'ve been unintentionally excluding someone from your friend group. How do you repair it?', tips: ['Acknowledge it directly', 'Don\'t make excuses — take ownership', 'Make a specific plan to include them', 'Systemic change > one-time gesture'] },
      { prompt: 'You need to give a peer critical feedback on their work. How do you do it respectfully?', tips: ['Start with something genuine you appreciate', 'Be specific about what to change', 'Frame as observation, not judgment', 'Offer to help, not just criticize'] },
      { prompt: 'Someone shares an opinion you strongly disagree with. How do you engage without damaging the relationship?', tips: ['Seek to understand before responding', 'Ask clarifying questions', 'Share your view using "I" language', 'Accept that agreement isn\'t the goal — understanding is'] },
      { prompt: 'You\'re mediating a conflict between two friends who both want your support. How do you navigate it?', tips: ['Don\'t take sides — be a bridge', 'Help each person feel heard', 'Facilitate their direct communication', 'Set a boundary: "I care about both of you"'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Active Listening Challenges ──
  // ══════════════════════════════════════════════════════════════
  var LISTENING_CHALLENGES = {
    elementary: [
      { speaker: 'I had the WORST day. First I forgot my lunch, then I fell on the playground, and nobody would let me play tag.', question: 'What happened to this person today?', goodResponse: 'Wow, that sounds like a really tough day. You forgot your lunch AND fell down? That\'s a lot.', badResponse: 'Oh yeah, I had a bad day too. Yesterday I...', skill: 'Reflecting back' },
      { speaker: 'My dog is sick and my mom says we might have to take him to the vet. I\'m really scared.', question: 'What is this person feeling?', goodResponse: 'You sound really scared about your dog. It\'s hard when someone you love is sick.', badResponse: 'Don\'t worry, he\'ll be fine! My dog was sick once and it was nothing.', skill: 'Validating feelings' },
      { speaker: 'I made the soccer team! I practiced every single day for two weeks and I finally made it!', question: 'Why is this person so happy?', goodResponse: 'You practiced EVERY day?! No wonder you made it — that\'s amazing dedication!', badResponse: 'Cool. I made my team too. It wasn\'t that hard.', skill: 'Celebrating others' },
      { speaker: 'I don\'t want to go to the birthday party. The last time I went to one, nobody talked to me and I sat alone.', question: 'What is this person worried about?', goodResponse: 'It sounds like the last party was really lonely for you. That must have been hard.', badResponse: 'Just go! It\'ll be fun. You\'re overthinking it.', skill: 'Understanding worry' },
      { speaker: 'My big sister always gets to stay up later and I never do. It\'s not fair!', question: 'What does this person think is unfair?', goodResponse: 'It sounds frustrating when things feel unequal. What would feel more fair to you?', badResponse: 'Well, she\'s older so that\'s just how it works.', skill: 'Acknowledging frustration' }
    ],
    middle: [
      { speaker: 'Everyone in my friend group has plans this weekend except me. Nobody even asked if I wanted to come.', question: 'What is this person experiencing?', goodResponse: 'That really hurts — feeling left out when everyone else has plans. Have you talked to them about it?', badResponse: 'Maybe they just forgot. Don\'t take it personally.', skill: 'Naming the feeling' },
      { speaker: 'I studied for hours but still got a C on the test. Meanwhile, my lab partner barely studied and got an A.', question: 'What makes this situation so frustrating?', goodResponse: 'That gap between effort and result must be incredibly frustrating. Your hard work matters even when grades don\'t reflect it.', badResponse: 'Some people are just naturally better at tests. Maybe try studying differently.', skill: 'Validating effort' },
      { speaker: 'My parents keep fighting and I can hear them from my room. I just put my headphones on and try to ignore it.', question: 'What coping strategy is this person using?', goodResponse: 'That sounds really stressful. It makes sense you\'d want to block it out. How are you feeling about it?', badResponse: 'All parents fight. It\'s not a big deal.', skill: 'Creating safety' },
      { speaker: 'I posted a drawing I was proud of and someone commented "that\'s trash." Now I don\'t want to draw anymore.', question: 'How did the comment affect this person?', goodResponse: 'One cruel comment shouldn\'t erase your talent, but I understand why it hurt. What did you like about the drawing?', badResponse: 'Just ignore the haters! If you can\'t handle criticism, don\'t post.', skill: 'Rebuilding confidence' },
      { speaker: 'I want to try out for the play but I\'m terrified of performing in front of people. What if everyone laughs?', question: 'What is holding this person back?', goodResponse: 'Being nervous about performing is totally normal. What would it feel like if you tried and it went well?', badResponse: 'Just do it! What\'s the worst that can happen?', skill: 'Exploring fear gently' }
    ],
    high: [
      { speaker: 'I feel like I\'m performing a version of myself around different friend groups and I don\'t know which one is the real me.', question: 'What identity challenge is this person describing?', goodResponse: 'That tension between authenticity and belonging is something a lot of people feel. What version feels most like you?', badResponse: 'Everyone does that. It\'s called code-switching. Totally normal.', skill: 'Holding complexity' },
      { speaker: 'My college counselor told me to be "more realistic" about my goals. I can\'t tell if she\'s helping or crushing me.', question: 'What is this person struggling with?', goodResponse: 'That\'s a painful ambiguity — when support feels like doubt. What do YOU believe about your goals?', badResponse: 'She probably has more experience. Maybe listen to her.', skill: 'Empowering autonomy' },
      { speaker: 'I just found out my best friend has been telling people things I shared in confidence. I don\'t even know how to bring it up.', question: 'What trust violation occurred?', goodResponse: 'Betrayal from someone close cuts deep. It makes sense you\'re unsure how to approach it. What outcome would you want?', badResponse: 'Just confront them. If they\'re a real friend, they\'ll understand.', skill: 'Processing betrayal' },
      { speaker: 'I got the leadership position but now I feel like I don\'t deserve it. Everyone else was more qualified.', question: 'What cognitive pattern is this person experiencing?', goodResponse: 'Imposter syndrome is incredibly common among capable people. What evidence says you DO deserve it?', badResponse: 'Fake it till you make it! Everyone feels that way at first.', skill: 'Naming imposter syndrome' },
      { speaker: 'I want to set boundaries with my friend who always trauma-dumps on me, but I don\'t want to seem like a bad friend.', question: 'What dilemma is this person facing?', goodResponse: 'Needing boundaries doesn\'t make you a bad friend — it makes the friendship sustainable. What boundary would feel right?', badResponse: 'That\'s what friends are for. You should be there for them.', skill: 'Supporting boundary-setting' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Body Language Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var BODY_LANGUAGE = [
    { id: 'open', label: 'Open & Friendly', emoji: '\uD83D\uDE04', color: '#22c55e',
      signs: ['Arms uncrossed and relaxed', 'Eye contact (but not staring)', 'Leaning slightly forward', 'Nodding while listening', 'Smiling genuinely'],
      meaning: { elementary: 'This person is happy to talk to you! They feel safe and friendly.', middle: 'Open body language signals approachability, trust, and engagement.', high: 'Non-verbal openness (uncrossed limbs, forward lean, Duchenne smile) signals social receptivity and psychological safety.' } },
    { id: 'closed', label: 'Closed & Guarded', emoji: '\uD83D\uDE10', color: '#ef4444',
      signs: ['Arms crossed tightly', 'Avoiding eye contact', 'Turned away or leaning back', 'Tense jaw or shoulders', 'Short or no verbal responses'],
      meaning: { elementary: 'This person might not want to talk right now, or they might be feeling uncomfortable.', middle: 'Closed body language often means someone feels defensive, uncomfortable, or disengaged.', high: 'Barrier behaviors (crossed arms, gaze aversion, postural withdrawal) may indicate discomfort, defensiveness, or cognitive load — not necessarily hostility.' } },
    { id: 'nervous', label: 'Nervous & Anxious', emoji: '\uD83D\uDE2C', color: '#f59e0b',
      signs: ['Fidgeting with hands or objects', 'Looking around the room frequently', 'Touching face or hair', 'Shifting weight or bouncing leg', 'Speaking quickly or quietly'],
      meaning: { elementary: 'This person is probably feeling worried or nervous about something.', middle: 'Nervous body language shows anxiety or discomfort — they may need reassurance.', high: 'Self-soothing behaviors (self-touch, object manipulation) and hypervigilance indicate sympathetic nervous system activation — approach with gentleness.' } },
    { id: 'bored', label: 'Bored & Disengaged', emoji: '\uD83D\uDE34', color: '#64748b',
      signs: ['Slouching in chair', 'Looking at phone or window', 'Yawning or sighing', 'Doodling or tapping', 'Minimal facial expressions'],
      meaning: { elementary: 'This person isn\'t very interested right now. Maybe the topic isn\'t exciting for them.', middle: 'Disengagement cues mean someone has mentally checked out — the conversation may need a shift.', high: 'Attentional withdrawal (gaze diversion, postural collapse) signals cognitive disengagement — a cue to recalibrate the interaction.' } },
    { id: 'interested', label: 'Interested & Engaged', emoji: '\uD83E\uDD14', color: '#3b82f6',
      signs: ['Leaning forward', 'Maintaining eye contact', 'Asking follow-up questions', 'Mirroring your gestures', 'Open facial expression'],
      meaning: { elementary: 'This person is really listening and wants to hear more!', middle: 'Engaged body language means genuine interest — they\'re tracking and processing what you say.', high: 'Active engagement indicators (forward lean, gaze maintenance, mirroring) reflect interpersonal synchrony and genuine attentional investment.' } },
    { id: 'angry', label: 'Frustrated & Angry', emoji: '\uD83D\uDE20', color: '#dc2626',
      signs: ['Clenched jaw or fists', 'Staring intensely', 'Tight, rigid posture', 'Speaking louder or through teeth', 'Invading personal space'],
      meaning: { elementary: 'This person is probably feeling really mad. Give them some space and stay calm.', middle: 'Aggressive body language signals rising anger — de-escalation and space are key.', high: 'Threat displays (postural rigidity, proxemic encroachment, vocal intensity) indicate fight-mode arousal. Priority: safety, then de-escalation.' } }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Body Language Quiz ──
  // ══════════════════════════════════════════════════════════════
  var BL_QUIZ = [
    { desc: 'They\'re sitting with arms crossed, looking away from the speaker, and their foot is tapping impatiently.', answer: 'closed', options: ['open', 'closed', 'nervous', 'interested'] },
    { desc: 'They\'re leaning forward, nodding, and asking questions about what you just said.', answer: 'interested', options: ['bored', 'angry', 'interested', 'nervous'] },
    { desc: 'They keep checking their phone, slumped in the chair, and yawning every few minutes.', answer: 'bored', options: ['open', 'nervous', 'angry', 'bored'] },
    { desc: 'They\'re fidgeting with their pencil, glancing around the room, and biting their lip.', answer: 'nervous', options: ['nervous', 'bored', 'open', 'closed'] },
    { desc: 'They\'re smiling, making eye contact, and their body is turned toward you.', answer: 'open', options: ['angry', 'open', 'closed', 'nervous'] },
    { desc: 'Their fists are clenched, jaw is tight, and they\'re speaking in a low, controlled voice.', answer: 'angry', options: ['nervous', 'closed', 'bored', 'angry'] },
    { desc: 'They mirror your gestures, lean in when you speak, and their eyes are bright.', answer: 'interested', options: ['interested', 'open', 'nervous', 'angry'] },
    { desc: 'They\'re hunched over, avoiding all eye contact, giving one-word answers.', answer: 'closed', options: ['bored', 'interested', 'closed', 'open'] },
    { desc: 'They\'re touching their hair repeatedly, voice is shaky, and they keep swallowing.', answer: 'nervous', options: ['angry', 'nervous', 'closed', 'bored'] },
    { desc: 'They stand too close, voice rises, and they point their finger while talking.', answer: 'angry', options: ['open', 'interested', 'angry', 'nervous'] }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Cooperation Scenarios ──
  // ══════════════════════════════════════════════════════════════
  var COOP_SCENARIOS = {
    elementary: [
      { situation: 'You and your partner both want to be the one who draws the poster for your project.', choices: [
        { text: 'Say "I\'ll draw and you color it in!"', quality: 'good', feedback: 'Great compromise! You split the work so both people get to contribute.' },
        { text: 'Just grab the markers and start drawing first.', quality: 'poor', feedback: 'Taking over without asking doesn\'t feel fair. Try asking instead!' },
        { text: 'Ask "What if we each draw half?"', quality: 'best', feedback: 'Perfect! You found a way for BOTH of you to draw. That\'s real teamwork!' },
        { text: 'Say "Fine, YOU do it" and sit back.', quality: 'poor', feedback: 'Giving up isn\'t teamwork either. Sharing ideas helps everyone!' }
      ]},
      { situation: 'Your group is building a tower with blocks and someone keeps knocking it over by accident.', choices: [
        { text: 'Yell "STOP! You\'re ruining it!"', quality: 'poor', feedback: 'Yelling can make people feel bad. Try a calm voice instead.' },
        { text: 'Say "Let\'s try building it together. You hold the base and I\'ll stack."', quality: 'best', feedback: 'You gave them a helpful job! Now they\'re part of the team, not the problem.' },
        { text: 'Move away and build your own tower alone.', quality: 'poor', feedback: 'Working alone doesn\'t help the team. See if you can solve it together.' },
        { text: 'Say "Can you be more careful? The tower is wobbly."', quality: 'good', feedback: 'Good — you were honest and calm. Adding a helpful suggestion makes it even better!' }
      ]},
      { situation: 'You and your friend both want to play different games at recess.', choices: [
        { text: 'Play their game today and yours tomorrow.', quality: 'best', feedback: 'Taking turns is one of the best ways to be fair! Great thinking!' },
        { text: 'Say "We ALWAYS play what you want!"', quality: 'poor', feedback: 'Even if it feels true, blaming doesn\'t help. Try suggesting a plan instead.' },
        { text: 'Find a game you BOTH like.', quality: 'good', feedback: 'Nice compromise! Finding common ground is a great social skill.' },
        { text: 'Walk away and play alone.', quality: 'poor', feedback: 'It\'s okay to need space, but try talking it out first.' }
      ]}
    ],
    middle: [
      { situation: 'In a group project, one person is doing all the work while others scroll on their phones.', choices: [
        { text: '"Hey, can we divide this up? I\'ll do the research if someone handles the slides."', quality: 'best', feedback: 'Excellent — you addressed the imbalance without attacking anyone and offered a concrete plan.' },
        { text: 'Do all the work yourself and complain about it later.', quality: 'poor', feedback: 'Martyrdom builds resentment. Speak up in the moment.' },
        { text: 'Tell the teacher that nobody is helping.', quality: 'good', feedback: 'It\'s okay to involve an adult, but try peer-to-peer first — it builds your assertiveness muscle.' },
        { text: '"I\'m not doing this alone. Figure out your parts or I\'m telling Mr. Garcia."', quality: 'poor', feedback: 'Ultimatums create defensiveness. Try collaborative problem-solving first.' }
      ]},
      { situation: 'Two members of your friend group are in a fight and both want you to take their side.', choices: [
        { text: '"I care about both of you. I\'m not picking sides, but I\'ll help you talk it out."', quality: 'best', feedback: 'Setting a clear boundary while offering support is mature and brave.' },
        { text: 'Agree with whoever talks to you first.', quality: 'poor', feedback: 'This creates a false alliance and will hurt the other friend when they find out.' },
        { text: '"I don\'t want to be in the middle. Can you two work it out?"', quality: 'good', feedback: 'Setting a boundary is good — but offering to facilitate shows deeper friendship.' },
        { text: 'Avoid both of them until it blows over.', quality: 'poor', feedback: 'Avoidance may feel safe but it can leave both friends feeling abandoned.' }
      ]},
      { situation: 'Your team is losing a game and people are starting to blame each other.', choices: [
        { text: '"Let\'s focus on what we CAN do. What\'s our strategy for this half?"', quality: 'best', feedback: 'Redirecting from blame to strategy shows real leadership under pressure.' },
        { text: '"This is [person\'s] fault — they missed the catch."', quality: 'poor', feedback: 'Singling someone out destroys team trust. Losses are shared, not blamed.' },
        { text: '"It\'s just a game. Doesn\'t matter if we lose."', quality: 'good', feedback: 'Perspective is helpful, but dismissing something the team cares about can feel invalidating.' },
        { text: 'Stay quiet and keep playing your best.', quality: 'good', feedback: 'Leading by example is solid, but a verbal redirect could really help the team right now.' }
      ]}
    ],
    high: [
      { situation: 'You\'re leading a group project and one member consistently misses deadlines, putting the whole team at risk.', choices: [
        { text: 'Have a private conversation: "Hey, I noticed you\'ve missed the last two deadlines. Is something going on? How can we adjust?"', quality: 'best', feedback: 'Private, curious, and solution-oriented — this approach preserves dignity while addressing the problem.' },
        { text: 'Reassign their work to others without telling them.', quality: 'poor', feedback: 'This solves the deadline but creates exclusion and avoids the real issue.' },
        { text: 'Call them out in the group chat so everyone can see.', quality: 'poor', feedback: 'Public shaming damages trust and triggers defensiveness. Feedback should be private.' },
        { text: 'Cc the teacher on your next message as a subtle pressure tactic.', quality: 'poor', feedback: 'Passive-aggressive moves erode trust. Direct communication is more effective and respectful.' }
      ]},
      { situation: 'In a discussion, you realize you were wrong about something you argued strongly for.', choices: [
        { text: '"I\'ve been thinking about what you said, and I think you\'re right. I was looking at it too narrowly."', quality: 'best', feedback: 'Intellectual humility is rare and powerful. Changing your mind publicly models growth for everyone.' },
        { text: 'Quietly drop it and hope nobody notices you changed your mind.', quality: 'good', feedback: 'Better than doubling down, but owning the shift explicitly builds more trust.' },
        { text: 'Keep arguing because admitting you\'re wrong feels embarrassing.', quality: 'poor', feedback: 'Ego-protection at the cost of truth damages your credibility more than admitting error.' },
        { text: 'Say "Well, we\'re both kind of right" to save face.', quality: 'poor', feedback: 'False equivalence avoids the discomfort but misses the opportunity for genuine growth.' }
      ]},
      { situation: 'Your team has to make a decision and there are two equally valid but different approaches. The group is split.', choices: [
        { text: '"Let\'s list the pros and cons of each, then vote. The losing side picks one thing to incorporate from their plan."', quality: 'best', feedback: 'Structured decision-making with integration of minority views — this is advanced facilitation.' },
        { text: '"I\'ll just decide since nobody can agree."', quality: 'poor', feedback: 'Unilateral decisions in a collaborative context feel authoritarian and breed resentment.' },
        { text: '"Let\'s try approach A first and switch to B if it doesn\'t work."', quality: 'good', feedback: 'Iterative testing is smart — just make sure the "B" camp feels their approach wasn\'t dismissed.' },
        { text: '"Let\'s ask the teacher to decide."', quality: 'poor', feedback: 'Outsourcing decisions you could make collaboratively misses a growth opportunity.' }
      ]}
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Friendship Skill Cards ──
  // ══════════════════════════════════════════════════════════════
  var FRIENDSHIP_SKILLS = [
    { id: 'making', name: 'Making Friends', emoji: '\uD83D\uDC4B', color: '#3b82f6',
      tips: {
        elementary: ['Smile and say hi — it\'s like a magic key!', 'Ask questions about THEM (favorite game, pet, show)', 'Share something you like too — find what you have in common', 'Be patient — friendship takes time to grow', 'Invite them to play or sit together'],
        middle: ['Find shared interests — clubs, classes, online games', 'Be a good listener first — people open up when they feel heard', 'Show genuine curiosity — ask follow-up questions', 'Be reliable — follow through when you say you\'ll do something', 'Don\'t try too hard — authenticity attracts people'],
        high: ['Vulnerability initiates connection — share something real', 'Quality > quantity — one deep friendship outweighs ten shallow ones', 'Be the friend you\'d want to have — model the behavior', 'Proximity + repeated interaction + self-disclosure = friendship formation', 'Social courage — reaching out first is a skill, not a personality trait']
      }
    },
    { id: 'keeping', name: 'Keeping Friends', emoji: '\uD83E\uDD1D', color: '#22c55e',
      tips: {
        elementary: ['Remember to take turns', 'Celebrate when good things happen to your friend', 'Say sorry when you mess up', 'Include your friends — don\'t leave them out', 'Check in when your friend seems sad'],
        middle: ['Show up consistently — not just when you need something', 'Respect their boundaries and other friendships', 'Address problems directly instead of gossiping', 'Celebrate their wins without comparing to yours', 'Adapt as people change — friendships evolve'],
        high: ['Reciprocity — monitor the give-and-take balance', 'Repair ruptures quickly — unaddressed tension compounds', 'Support their growth even when it means they change', 'Emotional attunement > constant availability', 'Accept the natural lifecycle of some friendships']
      }
    },
    { id: 'fixing', name: 'Fixing Friendship Problems', emoji: '\uD83D\uDD27', color: '#f59e0b',
      tips: {
        elementary: ['Talk about what happened, not who\'s bad', 'Use "I feel" instead of "You always"', 'Take a break if you\'re too mad to talk', 'Forgiveness doesn\'t mean it was okay — it means you\'re choosing to move forward', 'Get help from a trusted adult if you need it'],
        middle: ['Address the issue, not the person\'s character', 'Choose the right time and place (not in front of others)', 'Listen to their side — you might be missing something', 'Apologize for your part without "but"', 'Sometimes space is the best healer'],
        high: ['Distinguish impact from intent — both matter', 'Accountability without groveling: "I did X, it caused Y, I\'ll do Z differently"', 'Forgiveness is a process, not a moment — don\'t rush it', 'Some friendships end — and that can be healthy, not failure', 'Seek patterns — if the same conflict repeats, the friendship may need restructuring']
      }
    },
    { id: 'boundaries', name: 'Healthy Boundaries', emoji: '\uD83D\uDEE1\uFE0F', color: '#8b5cf6',
      tips: {
        elementary: ['It\'s okay to say "I don\'t want to do that"', 'A good friend won\'t make you do things that feel wrong', 'You can like someone AND say no to them', 'Tell a grown-up if someone won\'t respect your "no"', 'Your body and feelings belong to YOU'],
        middle: ['Boundaries aren\'t mean — they\'re self-respect', '"No" is a complete sentence', 'You can love someone and still need space from them', 'Pay attention to how you feel after being with someone', 'Good friends make boundaries easier, not harder'],
        high: ['Boundaries are about YOUR behavior, not controlling others', 'Internal boundaries (what you accept from yourself) matter too', 'Guilt after setting a boundary is normal — it doesn\'t mean you were wrong', 'Communicate boundaries before you reach resentment', 'The people who respect your boundaries are your people']
      }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Achievement Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_convo',    icon: '\uD83D\uDDE3\uFE0F', name: 'Ice Breaker',         desc: 'Practice your first conversation starter' },
    { id: 'convo_5',        icon: '\uD83D\uDCAC',       name: 'Smooth Talker',        desc: 'Practice 5 conversation scenarios' },
    { id: 'ai_chat',        icon: '\u2728',             name: 'AI Partner',           desc: 'Practice a conversation with the AI partner' },
    { id: 'listen_1',       icon: '\uD83D\uDC42',       name: 'Good Listener',        desc: 'Complete your first listening challenge' },
    { id: 'listen_5',       icon: '\uD83C\uDFA7',       name: 'Listening Pro',        desc: 'Complete 5 listening challenges' },
    { id: 'body_lang_3',    icon: '\uD83D\uDC40',       name: 'Body Reader',          desc: 'Learn 3 body language types' },
    { id: 'body_quiz_5',    icon: '\uD83D\uDD0D',       name: 'Decoder',              desc: 'Get 5 body language quiz answers right' },
    { id: 'coop_1',         icon: '\uD83E\uDD1C\uD83E\uDD1B', name: 'Team Player',    desc: 'Complete your first cooperation scenario' },
    { id: 'coop_5',         icon: '\uD83C\uDFC6',       name: 'Cooperation Champ',    desc: 'Complete 5 cooperation scenarios' },
    { id: 'coop_best',      icon: '\u2B50',             name: 'Best Choice',          desc: 'Pick the best response in 3 cooperation scenarios' },
    { id: 'friend_all',     icon: '\uD83D\uDC9B',       name: 'Friendship Scholar',   desc: 'Explore all 4 friendship skill areas' },
    { id: 'practice_10',    icon: '\uD83E\uDDE0',       name: 'Social Scientist',     desc: 'Complete 10 total social skills practices' },
    { id: 'streak_3',       icon: '\uD83D\uDD25',       name: 'Practice Streak',      desc: 'Practice 3 days in a row' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('social', {
    icon: '\uD83D\uDDE3\uFE0F',
    label: 'Social Skills Lab',
    desc: 'Practice conversation, listening, body language, teamwork, and friendship skills.',
    color: 'sky',
    category: 'relationship-skills',
    render: function(ctx) {
      var React = ctx.React;
      var h = React.createElement;
      var Sparkles = ctx.icons.Sparkles;
      var addToast = ctx.addToast;
      var awardXP = ctx.awardXP;
      var celebrate = ctx.celebrate;
      var callGemini = ctx.callGemini;
      var callTTS = ctx.callTTS;
      var band = ctx.gradeBand || 'elementary';

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.social) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('social', key); }
        else { if (ctx.update) ctx.update('social', key, val); }
      };

      // Navigation
      var activeTab     = d.activeTab || 'convo';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Conversation state
      var convoIdx       = d.convoIdx || 0;
      var convoRevealed  = d.convoRevealed || false;
      var convoPracticed = d.convoPracticed || 0;
      var convoAiResp    = d.convoAiResp || null;
      var convoAiLoading = d.convoAiLoading || false;
      var convoDraft     = d.convoDraft || '';

      // Listening state
      var listenIdx      = d.listenIdx || 0;
      var listenRevealed = d.listenRevealed || false;
      var listenChoice   = d.listenChoice || null; // 'good' or 'bad'
      var listenCompleted = d.listenCompleted || 0;

      // Body Language state
      var blMode         = d.blMode || 'learn'; // 'learn' or 'quiz'
      var blExplored     = d.blExplored || {};
      var blQuizIdx      = d.blQuizIdx || 0;
      var blQuizAnswer   = d.blQuizAnswer || null;
      var blQuizRevealed = d.blQuizRevealed || false;
      var blQuizScore    = d.blQuizScore || 0;
      var blQuizTotal    = d.blQuizTotal || 0;

      // Cooperation state
      var coopIdx        = d.coopIdx || 0;
      var coopChoice     = d.coopChoice || null;
      var coopRevealed   = d.coopRevealed || false;
      var coopCompleted  = d.coopCompleted || 0;
      var coopBestCount  = d.coopBestCount || 0;

      // Friendship state
      var friendViewed   = d.friendViewed || {};
      var friendExpanded = d.friendExpanded || null;

      // Practice log
      var practiceLog    = d.practiceLog || [];

      // Badge state
      var earnedBadges   = d.earnedBadges || {};
      var showBadgePopup = d.showBadgePopup || null;
      var showBadgesPanel = d.showBadgesPanel || false;

      // ── Helpers ──
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
      }

      function logPractice(type, id) {
        var entry = { type: type, id: id, timestamp: Date.now() };
        var newLog = practiceLog.concat([entry]);
        upd('practiceLog', newLog);
        if (newLog.length >= 10) tryAwardBadge('practice_10');
        // Streak
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

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'convo',     label: '\uD83D\uDDE3\uFE0F Conversation' },
        { id: 'listen',    label: '\uD83D\uDC42 Listening' },
        { id: 'body',      label: '\uD83D\uDC40 Body Language' },
        { id: 'coop',      label: '\uD83E\uDD1D Cooperation' },
        { id: 'friends',   label: '\uD83D\uDC9B Friendship' },
        { id: 'log',       label: '\uD83D\uDCCA Progress' }
      ];

      var tabBar = h('div', {
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', {
            key: tab.id,
            onClick: function() { upd('activeTab', tab.id); if (soundEnabled) sfxClick(); },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#0ea5e9' : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontWeight: isActive ? 700 : 500, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
            }
          }, tab.label);
        }),
        h('button', {
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#64748b', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', {
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#0ea5e933' : 'transparent', color: '#64748b', fontSize: 14, flexShrink: 0 }
        }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length)
      );

      // ── Badge Popup ──
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', {
            style: { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' },
            onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', {
              style: { background: 'linear-gradient(135deg, #0c1631 0%, #1e293b 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid #0ea5e9', maxWidth: 320 },
              onClick: function(e) { e.stopPropagation(); }
            },
              h('div', { style: { fontSize: 56, marginBottom: 12 } }, popBadge.icon),
              h('p', { style: { fontSize: 11, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 } }, 'Badge Earned!'),
              h('h3', { style: { margin: '0 0 8px 0', color: '#f1f5f9', fontSize: 20 } }, popBadge.name),
              h('p', { style: { margin: 0, color: '#94a3b8', fontSize: 13 } }, popBadge.desc),
              h('p', { style: { margin: '12px 0 0 0', color: '#0ea5e9', fontSize: 12, fontWeight: 700 } }, '+25 XP')
            )
          );
        }
      }

      // ── Badges Panel ──
      if (showBadgesPanel) {
        return h('div', { style: { minHeight: '100%' } },
          tabBar, badgePopup,
          h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
            h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 } },
              BADGES.map(function(badge) {
                var earned = !!earnedBadges[badge.id];
                return h('div', {
                  key: badge.id, title: badge.name + ': ' + badge.desc,
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#0c1631' : '#1e293b', border: '1px solid ' + (earned ? '#0ea5e9' : '#334155'), opacity: earned ? 1 : 0.4 }
                },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, badge.icon),
                  h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#e2e8f0' : '#64748b' } }, badge.name),
                  h('div', { style: { fontSize: 9, color: '#64748b', marginTop: 2 } }, badge.desc)
                );
              })
            ),
            h('button', {
              onClick: function() { upd('showBadgesPanel', false); },
              style: { display: 'block', margin: '16px auto 0', padding: '8px 20px', borderRadius: 8, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, cursor: 'pointer' }
            }, 'Close')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Conversation Starters ──
      // ══════════════════════════════════════════════════════════
      var convoContent = null;
      if (activeTab === 'convo') {
        var convos = CONVO_STARTERS[band] || CONVO_STARTERS.elementary;
        var current = convos[convoIdx % convos.length];

        convoContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDDE3\uFE0F What Would You Say?' : '\uD83D\uDDE3\uFE0F Conversation Practice'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Read the situation and think about what you would say!' :
            'Practice responding to real social situations. Think before you speak!'
          ),
          h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginBottom: 20 } },
            'Scenarios practiced: ' + convoPracticed
          ),

          // Scenario card
          h('div', { style: { padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid #0ea5e944', marginBottom: 16, textAlign: 'center' } },
            h('p', { style: { fontSize: 10, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } },
              'Scenario ' + ((convoIdx % convos.length) + 1) + ' of ' + convos.length
            ),
            h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } }, '"' + current.prompt + '"')
          ),

          // Practice input
          !convoRevealed && h('div', null,
            h('textarea', {
              value: convoDraft,
              onChange: function(e) { upd('convoDraft', e.target.value); },
              placeholder: band === 'elementary' ? 'What would you say? Type it here...' : 'Draft your response...',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', {
                onClick: function() {
                  upd('convoRevealed', true);
                  var nc = convoPracticed + 1;
                  upd('convoPracticed', nc);
                  if (soundEnabled) sfxReveal();
                  awardXP(10);
                  tryAwardBadge('first_convo');
                  if (nc >= 5) tryAwardBadge('convo_5');
                  logPractice('convo', 'starter');
                },
                style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
              }, '\uD83D\uDCA1 See Tips'),

              callGemini && convoDraft.trim().length > 5 && h('button', {
                onClick: function() {
                  upd('convoAiLoading', true);
                  var prompt = 'You are a social skills coach for a ' + band + ' school student. They were given this social situation:\n\n"' + current.prompt + '"\n\nThey responded: "' + convoDraft + '"\n\n' +
                    'In 2-3 sentences, give specific feedback on their response. What did they do well? What could be stronger? ' +
                    (band === 'elementary' ? 'Use warm, simple language. Be encouraging first, then suggest one improvement.' :
                     band === 'middle' ? 'Be supportive but honest. Name the social skill they used and suggest refinement.' :
                     'Use precise social-emotional vocabulary. Identify the communication strategy and suggest a more nuanced approach if applicable.') +
                    ' Never be harsh or discouraging.';
                  callGemini(prompt).then(function(resp) {
                    upd({ convoAiResp: resp, convoAiLoading: false, convoRevealed: true });
                    var nc2 = convoPracticed + 1;
                    upd('convoPracticed', nc2);
                    tryAwardBadge('first_convo');
                    tryAwardBadge('ai_chat');
                    if (nc2 >= 5) tryAwardBadge('convo_5');
                    if (soundEnabled) sfxReveal();
                    awardXP(15);
                    logPractice('convo', 'ai_practice');
                  }).catch(function() {
                    upd({ convoAiResp: 'Great effort! Practicing social responses builds confidence over time.', convoAiLoading: false, convoRevealed: true });
                  });
                },
                disabled: convoAiLoading,
                style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: convoAiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }
              },
                Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                convoAiLoading ? 'Analyzing...' : 'AI Feedback'
              )
            )
          ),

          // Revealed tips
          convoRevealed && h('div', null,
            // AI feedback
            convoAiResp && h('div', { style: { padding: 16, borderRadius: 14, background: '#8b5cf618', border: '1px solid #8b5cf644', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 6 } }, '\u2728 AI Coach Feedback'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, convoAiResp)
            ),

            // Tips card
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0ea5e912', border: '1px solid #0ea5e944', marginBottom: 16 } },
              h('p', { style: { fontSize: 11, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 8 } }, '\uD83D\uDCA1 Social Skills Tips'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                current.tips.map(function(tip, i) {
                  return h('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 10px', borderRadius: 8, background: '#1e293b' } },
                    h('span', { style: { color: '#0ea5e9', fontWeight: 700, fontSize: 12, flexShrink: 0 } }, '\u2713'),
                    h('span', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.4 } }, tip)
                  );
                })
              )
            ),
            h('button', {
              onClick: function() { upd({ convoIdx: convoIdx + 1, convoRevealed: false, convoAiResp: null, convoDraft: '' }); },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Active Listening ──
      // ══════════════════════════════════════════════════════════
      var listenContent = null;
      if (activeTab === 'listen') {
        var listens = LISTENING_CHALLENGES[band] || LISTENING_CHALLENGES.elementary;
        var currentListen = listens[listenIdx % listens.length];

        listenContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDC42 Be a Good Listener!' : '\uD83D\uDC42 Active Listening Lab'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Read what someone says, then pick the BEST way to respond!' :
            'Identify which response demonstrates stronger active listening skills.'
          ),
          h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginBottom: 20 } },
            'Challenges completed: ' + listenCompleted + ' \u2022 Skill: ' + currentListen.skill
          ),

          // Speaker card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('div', { style: { width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 } }, '\uD83D\uDDE3\uFE0F'),
              h('span', { style: { fontSize: 10, color: '#64748b', textTransform: 'uppercase', fontWeight: 700 } }, 'Someone says:')
            ),
            h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic', margin: 0 } }, '"' + currentListen.speaker + '"')
          ),

          // Comprehension question
          h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 } }, currentListen.question),

          // Response options
          !listenRevealed && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('button', {
              onClick: function() { upd({ listenChoice: 'good', listenRevealed: true }); if (soundEnabled) sfxCorrect(); awardXP(10); var nc = listenCompleted + 1; upd('listenCompleted', nc); tryAwardBadge('listen_1'); if (nc >= 5) tryAwardBadge('listen_5'); logPractice('listen', currentListen.skill); },
              style: { padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }
            }, '\uD83D\uDFE2 "' + currentListen.goodResponse + '"'),
            h('button', {
              onClick: function() { upd({ listenChoice: 'bad', listenRevealed: true }); if (soundEnabled) sfxWrong(); var nc = listenCompleted + 1; upd('listenCompleted', nc); tryAwardBadge('listen_1'); if (nc >= 5) tryAwardBadge('listen_5'); logPractice('listen', currentListen.skill); },
              style: { padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }
            }, '\uD83D\uDFE1 "' + currentListen.badResponse + '"')
          ),

          // Revealed
          listenRevealed && h('div', null,
            h('div', { style: { padding: 16, borderRadius: 14, background: listenChoice === 'good' ? '#22c55e18' : '#f59e0b18', border: '1px solid ' + (listenChoice === 'good' ? '#22c55e44' : '#f59e0b44'), marginBottom: 12 } },
              h('p', { style: { fontSize: 16, fontWeight: 700, color: listenChoice === 'good' ? '#22c55e' : '#f59e0b', marginBottom: 8 } },
                listenChoice === 'good' ? '\u2705 Great choice!' : '\uD83D\uDCA1 Not the strongest response'
              ),
              h('div', { style: { marginBottom: 10 } },
                h('p', { style: { fontSize: 10, color: '#22c55e', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, 'Better response:'),
                h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, fontStyle: 'italic' } }, '"' + currentListen.goodResponse + '"')
              ),
              h('div', null,
                h('p', { style: { fontSize: 10, color: '#ef4444', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 } }, 'Weaker response:'),
                h('p', { style: { fontSize: 13, color: '#94a3b8', lineHeight: 1.5, fontStyle: 'italic' } }, '"' + currentListen.badResponse + '"')
              ),
              h('div', { style: { marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#0ea5e912' } },
                h('p', { style: { fontSize: 11, color: '#38bdf8', fontWeight: 700, marginBottom: 2 } }, '\uD83C\uDFAF Skill: ' + currentListen.skill),
                h('p', { style: { fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.4 } },
                  band === 'elementary' ? 'The better response shows you were REALLY listening \u2014 not just waiting for your turn to talk!' :
                  'Active listening means reflecting, validating, and staying focused on the speaker \u2014 not redirecting to yourself.'
                )
              )
            ),
            h('button', {
              onClick: function() { upd({ listenIdx: listenIdx + 1, listenRevealed: false, listenChoice: null }); },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'Next Challenge \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Body Language ──
      // ══════════════════════════════════════════════════════════
      var bodyContent = null;
      if (activeTab === 'body') {
        var blToggle = h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 } },
          h('button', {
            onClick: function() { upd('blMode', 'learn'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '8px 0 0 8px', border: '1px solid #334155', background: blMode === 'learn' ? '#0ea5e9' : '#1e293b', color: blMode === 'learn' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83D\uDCDA Learn'),
          h('button', {
            onClick: function() { upd('blMode', 'quiz'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '0 8px 8px 0', border: '1px solid #334155', background: blMode === 'quiz' ? '#f59e0b' : '#1e293b', color: blMode === 'quiz' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83E\uDDE9 Quiz')
        );

        if (blMode === 'learn') {
          bodyContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
              band === 'elementary' ? '\uD83D\uDC40 Reading Body Language' : '\uD83D\uDC40 Body Language Guide'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } },
              band === 'elementary' ? 'People say a LOT without using words! Learn to read body clues.' :
              'Over 70% of communication is non-verbal. Learn to read the signals.'
            ),
            blToggle,

            // Body language cards
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              BODY_LANGUAGE.map(function(bl) {
                var isExpanded = friendExpanded === bl.id;
                var isExplored = blExplored[bl.id];
                return h('div', { key: bl.id, style: { borderRadius: 14, border: '1px solid ' + (isExpanded ? bl.color + '66' : '#334155'), background: isExpanded ? bl.color + '08' : '#1e293b', overflow: 'hidden' } },
                  h('button', {
                    onClick: function() {
                      var newExp = isExpanded ? null : bl.id;
                      upd('friendExpanded', newExp);
                      if (!isExplored && newExp) {
                        var newExplored = Object.assign({}, blExplored);
                        newExplored[bl.id] = true;
                        upd('blExplored', newExplored);
                        awardXP(5);
                        if (Object.keys(newExplored).length >= 3) tryAwardBadge('body_lang_3');
                      }
                      if (soundEnabled) sfxClick();
                      logPractice('body', bl.id);
                    },
                    style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#f1f5f9' }
                  },
                    h('span', { style: { fontSize: 28, flexShrink: 0 } }, bl.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', { style: { fontWeight: 700, fontSize: 14, color: isExpanded ? bl.color : '#f1f5f9' } }, bl.label),
                        isExplored && h('span', { style: { fontSize: 10, color: '#22c55e' } }, '\u2713')
                      )
                    ),
                    h('span', { style: { color: '#64748b', fontSize: 14 } }, isExpanded ? '\u25B2' : '\u25BC')
                  ),
                  isExpanded && h('div', { style: { padding: '0 16px 16px', borderTop: '1px solid #334155' } },
                    h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, margin: '12px 0' } }, bl.meaning[band]),
                    h('p', { style: { fontSize: 11, fontWeight: 700, color: bl.color, marginBottom: 6 } }, 'Signs to look for:'),
                    h('div', { style: { display: 'flex', flexDirection: 'column', gap: 4 } },
                      bl.signs.map(function(sign, si) {
                        return h('div', { key: si, style: { display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: bl.color + '11' } },
                          h('span', { style: { color: bl.color, fontSize: 10, fontWeight: 700 } }, '\u2022'),
                          h('span', { style: { fontSize: 12, color: '#cbd5e1' } }, sign)
                        );
                      })
                    )
                  )
                );
              })
            ),
            h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 12 } },
              Object.keys(blExplored).length + '/' + BODY_LANGUAGE.length + ' types explored'
            )
          );
        } else {
          // Quiz mode
          var currentQuiz = BL_QUIZ[blQuizIdx % BL_QUIZ.length];
          bodyContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83E\uDDE9 Body Language Quiz'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
              'Read the description and identify the body language type.'
            ),
            blToggle,
            h('p', { style: { color: '#64748b', fontSize: 11, marginBottom: 20 } },
              'Score: ' + blQuizScore + '/' + blQuizTotal
            ),

            // Description card
            h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #f59e0b44', marginBottom: 20 } },
              h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 } }, 'Body Language Clue'),
              h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } }, '"' + currentQuiz.desc + '"')
            ),

            // Options
            !blQuizRevealed
              ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
                  currentQuiz.options.map(function(opt) {
                    var bl = BODY_LANGUAGE.find(function(b) { return b.id === opt; });
                    return h('button', {
                      key: opt,
                      onClick: function() {
                        var correct = opt === currentQuiz.answer;
                        var ns = correct ? blQuizScore + 1 : blQuizScore;
                        upd({ blQuizAnswer: opt, blQuizRevealed: true, blQuizTotal: blQuizTotal + 1, blQuizScore: ns });
                        if (correct) { if (soundEnabled) sfxCorrect(); awardXP(5); if (ns >= 5) tryAwardBadge('body_quiz_5'); }
                        else { if (soundEnabled) sfxWrong(); }
                        logPractice('body_quiz', opt);
                      },
                      style: { padding: '12px 8px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
                    }, bl ? bl.emoji : '', ' ', bl ? bl.label : opt);
                  })
                )
              : h('div', null,
                  h('div', { style: { padding: 16, borderRadius: 14, marginBottom: 16, background: blQuizAnswer === currentQuiz.answer ? '#22c55e18' : '#ef444418', border: '1px solid ' + (blQuizAnswer === currentQuiz.answer ? '#22c55e44' : '#ef444444') } },
                    h('p', { style: { fontSize: 16, fontWeight: 700, color: blQuizAnswer === currentQuiz.answer ? '#22c55e' : '#ef4444' } },
                      blQuizAnswer === currentQuiz.answer ? '\u2705 Correct!' : 'Not quite!'
                    ),
                    blQuizAnswer !== currentQuiz.answer && h('p', { style: { fontSize: 13, color: '#94a3b8' } },
                      'The answer was: ' + (BODY_LANGUAGE.find(function(b) { return b.id === currentQuiz.answer; }) || {}).label
                    )
                  ),
                  h('button', {
                    onClick: function() { upd({ blQuizIdx: blQuizIdx + 1, blQuizAnswer: null, blQuizRevealed: false }); },
                    style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                  }, 'Next Question \u2192')
                )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Cooperation ──
      // ══════════════════════════════════════════════════════════
      var coopContent = null;
      if (activeTab === 'coop') {
        var coops = COOP_SCENARIOS[band] || COOP_SCENARIOS.elementary;
        var currentCoop = coops[coopIdx % coops.length];

        coopContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83E\uDD1D Working Together!' : '\uD83E\uDD1D Cooperation Scenarios'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Pick the BEST way to handle this teamwork situation!' :
            'Choose the most effective cooperative response. Look for the "best" option!'
          ),
          h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginBottom: 20 } },
            'Completed: ' + coopCompleted + ' \u2022 Best choices: ' + coopBestCount
          ),

          // Situation card
          h('div', { style: { padding: 24, borderRadius: 14, background: '#0f172a', border: '1px solid #22c55e44', marginBottom: 16, textAlign: 'center' } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } },
              'Scenario ' + ((coopIdx % coops.length) + 1) + ' of ' + coops.length
            ),
            h('p', { style: { fontSize: 15, color: '#f1f5f9', lineHeight: 1.6 } }, currentCoop.situation)
          ),

          // Choices
          !coopRevealed && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            currentCoop.choices.map(function(choice, ci) {
              return h('button', {
                key: ci,
                onClick: function() {
                  upd({ coopChoice: ci, coopRevealed: true });
                  var nc = coopCompleted + 1;
                  upd('coopCompleted', nc);
                  if (choice.quality === 'best') {
                    if (soundEnabled) sfxCorrect();
                    awardXP(15);
                    var nb = coopBestCount + 1;
                    upd('coopBestCount', nb);
                    if (nb >= 3) tryAwardBadge('coop_best');
                  } else if (choice.quality === 'good') {
                    if (soundEnabled) sfxReveal();
                    awardXP(8);
                  } else {
                    if (soundEnabled) sfxWrong();
                    awardXP(3);
                  }
                  tryAwardBadge('coop_1');
                  if (nc >= 5) tryAwardBadge('coop_5');
                  logPractice('coop', 'scenario');
                },
                style: { padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }
              }, choice.text);
            })
          ),

          // Revealed
          coopRevealed && h('div', null,
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
              currentCoop.choices.map(function(choice, ci) {
                var isChosen = coopChoice === ci;
                var colorMap = { best: '#22c55e', good: '#f59e0b', poor: '#ef4444' };
                var labelMap = { best: '\u2B50 Best', good: '\uD83D\uDFE1 Good', poor: '\uD83D\uDD34 Poor' };
                return h('div', {
                  key: ci,
                  style: {
                    padding: '12px 16px', borderRadius: 12,
                    background: (colorMap[choice.quality] || '#64748b') + '10',
                    border: '2px solid ' + (isChosen ? (colorMap[choice.quality] || '#64748b') : (colorMap[choice.quality] || '#64748b') + '33'),
                    position: 'relative'
                  }
                },
                  h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                    h('span', { style: { fontSize: 12, fontWeight: 700, color: colorMap[choice.quality] } }, labelMap[choice.quality]),
                    isChosen && h('span', { style: { fontSize: 10, color: '#94a3b8', fontWeight: 600 } }, '\u2190 Your choice')
                  ),
                  h('p', { style: { fontSize: 12, color: '#e2e8f0', margin: '0 0 4px', lineHeight: 1.4 } }, choice.text),
                  h('p', { style: { fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic', lineHeight: 1.4 } }, choice.feedback)
                );
              })
            ),
            h('button', {
              onClick: function() { upd({ coopIdx: coopIdx + 1, coopChoice: null, coopRevealed: false }); },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Friendship Skills ──
      // ══════════════════════════════════════════════════════════
      var friendsContent = null;
      if (activeTab === 'friends') {
        friendsContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            band === 'elementary' ? '\uD83D\uDC9B All About Friends!' : '\uD83D\uDC9B Friendship Skills'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
            band === 'elementary' ? 'Learn how to make friends, keep friends, and fix problems!' :
            'Evidence-based strategies for building and maintaining healthy relationships.'
          ),

          // Skill cards
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
            FRIENDSHIP_SKILLS.map(function(skill) {
              var isExpanded = friendExpanded === 'fr_' + skill.id;
              var isViewed = friendViewed[skill.id];
              var tips = skill.tips[band] || skill.tips.elementary;

              return h('div', { key: skill.id, style: { borderRadius: 14, border: '1px solid ' + (isExpanded ? skill.color + '66' : '#334155'), background: isExpanded ? skill.color + '08' : '#1e293b', overflow: 'hidden' } },
                h('button', {
                  onClick: function() {
                    var newExp = isExpanded ? null : 'fr_' + skill.id;
                    upd('friendExpanded', newExp);
                    if (!isViewed && newExp) {
                      var newViewed = Object.assign({}, friendViewed);
                      newViewed[skill.id] = true;
                      upd('friendViewed', newViewed);
                      awardXP(5);
                      if (Object.keys(newViewed).length >= FRIENDSHIP_SKILLS.length) tryAwardBadge('friend_all');
                    }
                    if (soundEnabled) sfxClick();
                  },
                  style: { display: 'flex', alignItems: 'center', gap: 12, padding: '16px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#f1f5f9' }
                },
                  h('span', { style: { fontSize: 32, flexShrink: 0 } }, skill.emoji),
                  h('div', { style: { flex: 1 } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                      h('span', { style: { fontWeight: 700, fontSize: 15, color: isExpanded ? skill.color : '#f1f5f9' } }, skill.name),
                      isViewed && h('span', { style: { fontSize: 10, color: '#22c55e' } }, '\u2713')
                    )
                  ),
                  h('span', { style: { color: '#64748b', fontSize: 14 } }, isExpanded ? '\u25B2' : '\u25BC')
                ),
                isExpanded && h('div', { style: { padding: '0 16px 16px', borderTop: '1px solid #334155' } },
                  h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 } },
                    tips.map(function(tip, ti) {
                      return h('div', { key: ti, style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 12px', borderRadius: 10, background: skill.color + '10' } },
                        h('span', { style: { color: skill.color, fontWeight: 800, fontSize: 14, flexShrink: 0, lineHeight: 1.4 } }, (ti + 1) + '.'),
                        h('span', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5 } }, tip)
                      );
                    })
                  )
                )
              );
            })
          ),
          h('p', { style: { textAlign: 'center', color: '#64748b', fontSize: 11, marginTop: 12 } },
            Object.keys(friendViewed).length + '/' + FRIENDSHIP_SKILLS.length + ' skill areas explored'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Practice Log / Progress ──
      // ══════════════════════════════════════════════════════════
      var logContent = null;
      if (activeTab === 'log') {
        var total = practiceLog.length;
        var typeCounts = {};
        practiceLog.forEach(function(e) { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });
        var daySet = {};
        practiceLog.forEach(function(e) { daySet[new Date(e.timestamp).toISOString().slice(0,10)] = true; });
        var today = new Date();
        var streak = 0;
        for (var si = 0; si < 60; si++) {
          var chk = new Date(today);
          chk.setDate(chk.getDate() - si);
          if (daySet[chk.toISOString().slice(0,10)]) { streak++; } else if (si > 0) { break; }
        }

        logContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Social Skills Progress'),

          total === 0
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#64748b' } },
                h('p', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83D\uDDE3\uFE0F'),
                h('p', { style: { fontWeight: 600 } }, 'No practice yet'),
                h('p', { style: { fontSize: 12 } }, 'Try a conversation starter, listening challenge, or cooperation scenario!')
              )
            : h('div', null,
                h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 } },
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#0ea5e9' } }, streak),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Day Streak')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#22c55e' } }, total),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Total Practices')
                  ),
                  h('div', { style: { textAlign: 'center', padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                    h('div', { style: { fontSize: 24, fontWeight: 800, color: '#f59e0b' } }, Object.keys(daySet).length),
                    h('div', { style: { fontSize: 10, color: '#94a3b8' } }, 'Days Active')
                  )
                ),

                // Type breakdown
                h('div', { style: { marginBottom: 20, padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' } },
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 10 } }, 'Practice Areas'),
                  [
                    { key: 'convo', label: 'Conversation', emoji: '\uD83D\uDDE3\uFE0F', color: '#0ea5e9' },
                    { key: 'listen', label: 'Listening', emoji: '\uD83D\uDC42', color: '#8b5cf6' },
                    { key: 'body', label: 'Body Language', emoji: '\uD83D\uDC40', color: '#22c55e' },
                    { key: 'body_quiz', label: 'BL Quiz', emoji: '\uD83E\uDDE9', color: '#f59e0b' },
                    { key: 'coop', label: 'Cooperation', emoji: '\uD83E\uDD1D', color: '#ec4899' }
                  ].map(function(typ) {
                    var count = typeCounts[typ.key] || 0;
                    var pct = total > 0 ? (count / total * 100) : 0;
                    return h('div', { key: typ.key, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                      h('span', { style: { fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 } }, typ.emoji),
                      h('span', { style: { fontSize: 11, color: '#94a3b8', width: 80, flexShrink: 0 } }, typ.label),
                      h('div', { style: { flex: 1, height: 12, borderRadius: 6, background: '#0f172a', overflow: 'hidden' } },
                        h('div', { style: { height: '100%', width: pct + '%', background: typ.color, borderRadius: 6, transition: 'width 0.3s', minWidth: count > 0 ? 4 : 0 } })
                      ),
                      h('span', { style: { fontSize: 11, color: '#64748b', width: 24, textAlign: 'right', flexShrink: 0 } }, count)
                    );
                  })
                ),

                // Recent log
                h('div', null,
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Recent Activity'),
                  practiceLog.slice().reverse().slice(0, 8).map(function(entry, i) {
                    var labels = { convo: '\uD83D\uDDE3\uFE0F Conversation', listen: '\uD83D\uDC42 Listening', body: '\uD83D\uDC40 Body Language', body_quiz: '\uD83E\uDDE9 BL Quiz', coop: '\uD83E\uDD1D Cooperation' };
                    return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: '#0f172a', marginBottom: 4 } },
                      h('span', { style: { flex: 1, fontSize: 12, color: '#e2e8f0', fontWeight: 600 } }, labels[entry.type] || entry.type),
                      h('span', { style: { fontSize: 10, color: '#475569', flexShrink: 0 } }, new Date(entry.timestamp).toLocaleDateString())
                    );
                  })
                )
              )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── Final Render ──
      // ══════════════════════════════════════════════════════════
      return h('div', { style: { minHeight: '100%' } },
        tabBar,
        badgePopup,
        convoContent,
        listenContent,
        bodyContent,
        coopContent,
        friendsContent,
        logContent
      );
    }
  });
})();