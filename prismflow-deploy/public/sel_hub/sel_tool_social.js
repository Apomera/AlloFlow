// ═══════════════════════════════════════════════════════════════
// sel_tool_social.js — Social Skills Lab Plugin (v2.0)
// Conversation starters with AI practice partner, active
// listening challenges, body language decoder, cooperation
// scenarios, friendship skills, conversation simulator,
// body language reader, active listening challenge,
// friendship health check, and practice log.
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
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-social')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-social';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
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
    { id: 'bored', label: 'Bored & Disengaged', emoji: '\uD83D\uDE34', color: '#94a3b8',
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
  // ── Conversation Simulator — Branching Dialogue Trees ──
  // ══════════════════════════════════════════════════════════════
  var CONVO_SIMULATOR = {
    elementary: [
      { id: 'es_new_friend', title: 'Making a New Friend at Recess', scene: 'You see a kid sitting alone on the bench at recess. They look like they might want someone to play with.',
        branches: [
          { prompt: 'What do you do first?', options: [
            { text: 'Walk over and say "Hi! I\u2019m [name]. Want to play?"', tone: 'warm', effectiveness: 'strong', feedback: 'Great opener! You introduced yourself and made a clear invitation. That takes courage!', next: 0 },
            { text: 'Wave from far away and wait for them to come over.', tone: 'shy', effectiveness: 'moderate', feedback: 'A wave is friendly, but they might not feel confident enough to come over. Try going to them!', next: 1 },
            { text: 'Ask a friend to go talk to them instead.', tone: 'avoidant', effectiveness: 'weak', feedback: 'It\u2019s kind to think of them, but making the effort yourself builds YOUR friendship muscles too.', next: 2 }
          ]},
          { prompt: 'They smile and say "Sure!" What game do you suggest?', options: [
            { text: '"What do YOU like to play? I like tag and four square."', tone: 'inclusive', effectiveness: 'strong', feedback: 'Asking what THEY like shows you care about their interests. Offering your ideas too gives them options!' },
            { text: '"Let\u2019s play MY favorite game!"', tone: 'bossy', effectiveness: 'weak', feedback: 'It\u2019s good to be excited, but a new friend might feel left out if they don\u2019t get a choice.' },
            { text: '"I don\u2019t care, whatever you want."', tone: 'passive', effectiveness: 'moderate', feedback: 'Being flexible is nice, but sharing YOUR interests helps them get to know you too!' }
          ]},
          { prompt: 'They look down and say "I don\u2019t know how to play those games." How do you respond?', options: [
            { text: '"That\u2019s okay! I can show you. It\u2019s easy!"', tone: 'encouraging', effectiveness: 'strong', feedback: 'Perfect! You made them feel safe to learn. That\u2019s how trust is built!' },
            { text: '"Oh... well, maybe we can play something else."', tone: 'kind', effectiveness: 'moderate', feedback: 'Flexible and kind! Teaching them could be even better though.' },
            { text: '"Everyone knows how to play tag!"', tone: 'dismissive', effectiveness: 'weak', feedback: 'This might make them feel bad for not knowing. Remember, everyone learns at different times.' }
          ]},
          { prompt: 'After playing, recess is almost over. What do you say?', options: [
            { text: '"That was fun! Want to play again tomorrow?"', tone: 'warm', effectiveness: 'strong', feedback: 'Making plans for next time shows you genuinely enjoyed their company!' },
            { text: '"Okay, bye!" and run to class.', tone: 'abrupt', effectiveness: 'weak', feedback: 'A quick goodbye is fine, but expressing you had fun makes the connection stronger.' },
            { text: '"Want to sit together at lunch too?"', tone: 'enthusiastic', effectiveness: 'strong', feedback: 'Extending the friendship beyond recess is wonderful! You\u2019re building a real connection.' }
          ]}
        ]
      },
      { id: 'es_join_game', title: 'Asking to Join a Game', scene: 'Some kids are playing kickball and you really want to join, but you\u2019re not sure they\u2019ll say yes.',
        branches: [
          { prompt: 'How do you approach the group?', options: [
            { text: 'Walk up calmly and say "Hey, can I play next round?"', tone: 'confident', effectiveness: 'strong', feedback: 'Clear and respectful! Asking for the next round shows you understand they\u2019re mid-game.' },
            { text: 'Just start playing without asking.', tone: 'pushy', effectiveness: 'weak', feedback: 'Jumping in without asking can feel rude. A quick "Can I join?" goes a long way!' },
            { text: 'Stand nearby and hope someone notices you.', tone: 'passive', effectiveness: 'weak', feedback: 'They might not realize you want to play. Speaking up is hard but it works!' }
          ]},
          { prompt: 'Someone says "We already have enough players." What do you do?', options: [
            { text: '"That\u2019s okay! Can I be on the next team or keep score?"', tone: 'resilient', effectiveness: 'strong', feedback: 'Offering an alternative role shows flexibility and makes it easier for them to include you!' },
            { text: '"Fine, I didn\u2019t want to play anyway!" and walk away.', tone: 'defensive', effectiveness: 'weak', feedback: 'It\u2019s okay to feel disappointed, but snapping back makes it harder to try again later.' },
            { text: '"Okay" and quietly find something else to do.', tone: 'accepting', effectiveness: 'moderate', feedback: 'Being graceful about "no" is mature! But offering an alternative might still get you in.' }
          ]},
          { prompt: 'They say "Sure, you can be on our team!" How do you start?', options: [
            { text: 'Say "Thanks! Where should I stand?" and follow the group\u2019s lead.', tone: 'cooperative', effectiveness: 'strong', feedback: 'Asking shows you respect their game rules and want to be a team player!' },
            { text: 'Immediately try to take charge and rearrange positions.', tone: 'bossy', effectiveness: 'weak', feedback: 'Taking over right away can push people away. Earn trust first by being a great teammate!' },
            { text: 'Stand quietly and wait to be told what to do.', tone: 'passive', effectiveness: 'moderate', feedback: 'Being observant is good, but asking questions shows engagement and enthusiasm!' }
          ]},
          { prompt: 'You kick the ball and get out. A teammate groans. How do you handle it?', options: [
            { text: '"My bad! I\u2019ll try harder next time. Nice throw though!"', tone: 'graceful', effectiveness: 'strong', feedback: 'Owning it AND complimenting the other player shows great sportsmanship and maturity!' },
            { text: 'Blame the sun or say it was unfair.', tone: 'deflecting', effectiveness: 'weak', feedback: 'Making excuses doesn\u2019t feel good for anyone. Being honest builds trust.' },
            { text: '"Sorry..." and look embarrassed.', tone: 'anxious', effectiveness: 'moderate', feedback: 'It\u2019s okay to feel bad briefly, but don\u2019t let one play define the whole experience!' }
          ]}
        ]
      },
      { id: 'es_apologize', title: 'Apologizing After an Argument', scene: 'You and your best friend got into an argument during art class about sharing supplies. You said something mean and now they look upset.',
        branches: [
          { prompt: 'Class just ended. What do you do?', options: [
            { text: 'Go up to them and say "Hey, can we talk? I\u2019m sorry about what happened."', tone: 'brave', effectiveness: 'strong', feedback: 'Taking the first step to apologize shows real courage. Your friend will likely appreciate it!' },
            { text: 'Write them a note that says "I\u2019m sorry" and slip it to them.', tone: 'thoughtful', effectiveness: 'moderate', feedback: 'A note is sweet if talking feels too hard right now. A face-to-face talk is even stronger though!' },
            { text: 'Pretend nothing happened and act normal.', tone: 'avoidant', effectiveness: 'weak', feedback: 'Ignoring it might make your friend feel like their feelings don\u2019t matter to you.' }
          ]},
          { prompt: 'Your friend says "You really hurt my feelings." How do you respond?', options: [
            { text: '"I know, and I\u2019m sorry. I shouldn\u2019t have said that."', tone: 'accountable', effectiveness: 'strong', feedback: 'Owning your mistake without excuses is the strongest kind of apology. Well done!' },
            { text: '"Well, you hurt MY feelings first!"', tone: 'defensive', effectiveness: 'weak', feedback: 'Even if that\u2019s true, deflecting makes your apology feel fake. Address their feelings first.' },
            { text: '"I\u2019m sorry you feel that way."', tone: 'dismissive', effectiveness: 'weak', feedback: 'This puts the blame on THEIR feelings, not YOUR actions. Try apologizing for what you DID.' }
          ]},
          { prompt: 'They say "How do I know you won\u2019t do it again?" What do you say?', options: [
            { text: '"Next time I\u2019m frustrated, I\u2019ll take a breath instead of saying something mean."', tone: 'specific', effectiveness: 'strong', feedback: 'Describing a specific plan shows you\u2019ve really thought about how to be better!' },
            { text: '"I promise I won\u2019t!" ', tone: 'vague', effectiveness: 'moderate', feedback: 'Promises are nice, but a specific plan is more convincing.' },
            { text: '"I don\u2019t know." and shrug.', tone: 'uncertain', effectiveness: 'weak', feedback: 'Honesty is okay, but your friend needs to know you\u2019ll TRY to do better.' }
          ]},
          { prompt: 'They forgive you and you feel relieved. What\u2019s a good next step?', options: [
            { text: '"Want to finish our art project together? You pick the colors this time."', tone: 'generous', effectiveness: 'strong', feedback: 'Getting back to a positive activity together AND letting them choose shows real care!' },
            { text: 'Just say "Okay cool" and walk away.', tone: 'abrupt', effectiveness: 'weak', feedback: 'After an apology, reconnecting with a positive activity strengthens the friendship.' },
            { text: '"Thanks for forgiving me. You\u2019re a really good friend."', tone: 'grateful', effectiveness: 'strong', feedback: 'Expressing gratitude after being forgiven deepens the bond. Beautiful response!' }
          ]}
        ]
      },
      { id: 'es_share_toy', title: 'Sharing When You Don\u2019t Want To', scene: 'You brought your favorite toy for show-and-tell. Everyone wants to hold it but you\u2019re worried it might break.',
        branches: [
          { prompt: 'A classmate says "Can I hold it?" What do you say?', options: [
            { text: '"Sure! Just be careful with it because it\u2019s special to me."', tone: 'trusting', effectiveness: 'strong', feedback: 'Setting a gentle boundary while sharing shows maturity and trust!' },
            { text: '"NO! It\u2019s mine!"', tone: 'possessive', effectiveness: 'weak', feedback: 'It\u2019s okay to feel protective, but there are kinder ways to say it.' },
            { text: '"You can look at it but I\u2019ll hold it for you to see."', tone: 'compromise', effectiveness: 'strong', feedback: 'Great compromise! You\u2019re sharing the experience without giving up control. Smart!' }
          ]},
          { prompt: 'Someone accidentally drops it. How do you react?', options: [
            { text: 'Take a deep breath and say "It\u2019s okay, accidents happen. Is it broken?"', tone: 'calm', effectiveness: 'strong', feedback: 'Staying calm when something goes wrong is SO hard but SO impressive!' },
            { text: 'Start crying and say "I KNEW this would happen!"', tone: 'upset', effectiveness: 'weak', feedback: 'Your feelings are valid, but this makes the other person feel terrible. Try calming down first.' },
            { text: '"Please be more careful next time." Pick it up and check it.', tone: 'firm', effectiveness: 'moderate', feedback: 'Direct and not mean! Adding "it\u2019s okay" would make it even warmer.' }
          ]},
          { prompt: 'A kid who wasn\u2019t very nice to you yesterday also wants a turn. What do you do?', options: [
            { text: '"Sure, you can have a turn too." and treat them the same as everyone.', tone: 'inclusive', effectiveness: 'strong', feedback: 'Including everyone, even when it\u2019s hard, is a superpower for making the world kinder!' },
            { text: '"No way, you were mean to me yesterday!"', tone: 'grudging', effectiveness: 'weak', feedback: 'It\u2019s okay to remember being hurt, but this moment could be a fresh start.' },
            { text: '"You can look if you say sorry for yesterday first."', tone: 'conditional', effectiveness: 'moderate', feedback: 'Wanting an apology is fair, but making sharing conditional can feel like a power move.' }
          ]},
          { prompt: 'Show-and-tell is over. Your teacher says you did a great job sharing. How do you feel?', options: [
            { text: '"Thanks! It was hard at first but it felt good to share something I love."', tone: 'reflective', effectiveness: 'strong', feedback: 'Naming that it was hard AND that it felt good is real emotional awareness!' },
            { text: '"I\u2019m just glad nobody broke it!"', tone: 'relieved', effectiveness: 'moderate', feedback: 'Honest! And next time it might feel a little less scary to share.' },
            { text: '"Can I do show-and-tell again tomorrow?"', tone: 'enthusiastic', effectiveness: 'strong', feedback: 'You had such a good experience you want to do it again \u2014 that\u2019s how confidence grows!' }
          ]}
        ]
      },
      { id: 'es_new_kid', title: 'Welcoming a New Student', scene: 'There\u2019s a new student in your class today. They\u2019re standing by the door looking nervous.',
        branches: [
          { prompt: 'What\u2019s your first move?', options: [
            { text: 'Walk over and say "Hi! Welcome to our class! I\u2019m [name]."', tone: 'welcoming', effectiveness: 'strong', feedback: 'Being the first friendly face someone sees can make their WHOLE day better!' },
            { text: 'Smile at them from your seat.', tone: 'passive', effectiveness: 'moderate', feedback: 'A smile is nice! But going over to them would be even more welcoming.' },
            { text: 'Whisper to your friend "Who\u2019s that new kid?"', tone: 'gossip', effectiveness: 'weak', feedback: 'Talking ABOUT them instead of TO them can make a new kid feel even more alone.' }
          ]},
          { prompt: 'The new kid seems really shy and barely talks. What do you try?', options: [
            { text: '"Do you want me to show you around at lunch? I know where everything is!"', tone: 'helpful', effectiveness: 'strong', feedback: 'Offering specific help takes pressure off them having to ask. So thoughtful!' },
            { text: 'Ask them a bunch of questions all at once.', tone: 'overwhelming', effectiveness: 'weak', feedback: 'Too many questions can feel like an interrogation. Try one easy question at a time.' },
            { text: '"It\u2019s okay to be quiet. I was nervous on my first day too."', tone: 'empathetic', effectiveness: 'strong', feedback: 'Normalizing their feelings makes them feel understood and less alone!' }
          ]},
          { prompt: 'At lunch, they\u2019re sitting alone again. You\u2019re already with your friends. What do you do?', options: [
            { text: '"Hey [new kid], come sit with us!" and wave them over.', tone: 'inclusive', effectiveness: 'strong', feedback: 'Including them in your group is the most powerful thing you can do for a new student!' },
            { text: 'Feel bad but stay with your friends.', tone: 'passive', effectiveness: 'weak', feedback: 'The guilt you feel is your empathy talking! Acting on it is what makes you a great friend.' },
            { text: 'Ask your friends "Should we invite them over?"', tone: 'cautious', effectiveness: 'moderate', feedback: 'Getting consensus is nice, but YOU can be the leader here. Your friends will follow!' }
          ]},
          { prompt: 'By the end of the week, the new kid seems happier. They say "Thanks for being so nice to me." How do you feel?', options: [
            { text: '"Of course! That\u2019s what friends are for!" and mean it.', tone: 'genuine', effectiveness: 'strong', feedback: 'Your kindness made a real difference. THIS is what being a good human looks like!' },
            { text: '"No big deal." Shrug it off.', tone: 'modest', effectiveness: 'moderate', feedback: 'Modesty is nice, but accepting thanks gracefully honors THEIR feelings too.' },
            { text: '"I remember how it feels to be new. I\u2019m glad you\u2019re here!"', tone: 'empathetic', effectiveness: 'strong', feedback: 'Connecting through shared experience builds the deepest friendships!' }
          ]}
        ]
      }
    ],
    middle: [
      { id: 'ms_awkward', title: 'Navigating an Awkward Silence', scene: 'You\u2019re paired with someone you barely know for a class project. After introductions, there\u2019s a long, uncomfortable silence.',
        branches: [
          { prompt: 'The silence stretches on. What do you try?', options: [
            { text: '"So... have you had this teacher before? What\u2019s the vibe of this class?"', tone: 'casual', effectiveness: 'strong', feedback: 'Asking about a shared context (the class) is a natural way to break silence without being forced.' },
            { text: 'Pull out your phone and scroll.', tone: 'avoidant', effectiveness: 'weak', feedback: 'Phones feel safe but they signal "I don\u2019t want to talk" \u2014 which makes the silence worse.' },
            { text: 'Say "Well, this is awkward" and laugh.', tone: 'humor', effectiveness: 'moderate', feedback: 'Naming the awkwardness can actually break the tension! Just make sure the laugh is warm, not sarcastic.' }
          ]},
          { prompt: 'They respond with one-word answers. How do you keep going?', options: [
            { text: 'Ask an open-ended question: "What did you think about [recent school event]?"', tone: 'curious', effectiveness: 'strong', feedback: 'Open questions invite longer answers. Smart social strategy!' },
            { text: 'Give up on small talk and jump into the assignment.', tone: 'pragmatic', effectiveness: 'moderate', feedback: 'Getting to work is fine, but a bit of connection first makes collaboration smoother.' },
            { text: 'Keep asking yes/no questions faster.', tone: 'anxious', effectiveness: 'weak', feedback: 'Rapid-fire questions feel like an interrogation. Slow down and leave space for them to think.' }
          ]},
          { prompt: 'They finally start talking about something they\u2019re passionate about. What do you do?', options: [
            { text: 'Listen actively and ask follow-up questions about it.', tone: 'engaged', effectiveness: 'strong', feedback: 'Following their energy shows genuine interest. This is how real connections are made.' },
            { text: 'Wait for a pause to redirect to the assignment.', tone: 'task-focused', effectiveness: 'moderate', feedback: 'The assignment matters, but this moment of connection will make the rest of the project better.' },
            { text: 'Start talking about YOUR passion instead.', tone: 'self-centered', effectiveness: 'weak', feedback: 'Redirecting to yourself when they finally open up shuts down the connection they were building.' }
          ]},
          { prompt: 'By the end of class, the conversation flows easily. They say "This project might actually be fun." What\u2019s your move?', options: [
            { text: '"Right? Want to exchange numbers so we can plan our next meeting?"', tone: 'proactive', effectiveness: 'strong', feedback: 'Turning a class partnership into a real connection takes initiative. Nice!' },
            { text: '"Yeah, see you next class." and leave.', tone: 'neutral', effectiveness: 'moderate', feedback: 'Fine, but you\u2019re leaving the momentum on the table. A small next step keeps it going.' },
            { text: '"It\u2019s cool that you\u2019re into [their interest]. I looked up [related thing] \u2014 have you seen it?"', tone: 'invested', effectiveness: 'strong', feedback: 'Showing you were actually listening and finding connections? That\u2019s high-level social skill.' }
          ]}
        ]
      },
      { id: 'ms_disagree', title: 'Disagreeing Respectfully', scene: 'In a class debate, your partner makes a claim you strongly disagree with. Everyone\u2019s watching.',
        branches: [
          { prompt: 'They just made their point. The class looks at you. How do you start?', options: [
            { text: '"I see where you\u2019re coming from, but I think there\u2019s another angle to consider."', tone: 'respectful', effectiveness: 'strong', feedback: 'Acknowledging their view before presenting yours shows intellectual maturity.' },
            { text: '"That\u2019s wrong. Here\u2019s why..."', tone: 'blunt', effectiveness: 'weak', feedback: 'Being direct is fine, but "that\u2019s wrong" puts them on the defensive immediately.' },
            { text: '"Hmm, interesting..." but don\u2019t actually engage with their point.', tone: 'dismissive', effectiveness: 'weak', feedback: 'Fake agreement or vague responses signal you\u2019re not taking them seriously.' }
          ]},
          { prompt: 'They push back: "No, I\u2019m right because [reason]." How do you respond?', options: [
            { text: '"That\u2019s a fair point about [specific thing]. What about [counterpoint] though?"', tone: 'engaged', effectiveness: 'strong', feedback: 'Validating their specific reasoning before countering shows you\u2019re listening, not just waiting to talk.' },
            { text: '"Agree to disagree." and stop engaging.', tone: 'withdrawal', effectiveness: 'moderate', feedback: 'Sometimes appropriate, but in a debate context it can feel like giving up or dismissing them.' },
            { text: 'Roll your eyes or sigh audibly.', tone: 'contemptuous', effectiveness: 'weak', feedback: 'Non-verbal contempt is the fastest way to damage a relationship. Even in disagreement, respect matters.' }
          ]},
          { prompt: 'The debate gets heated and they raise their voice. What do you do?', options: [
            { text: 'Keep your voice calm and say "I think we both care about this \u2014 let\u2019s keep it productive."', tone: 'de-escalating', effectiveness: 'strong', feedback: 'Emotional regulation under pressure AND redirecting to shared values? That\u2019s advanced conflict resolution.' },
            { text: 'Match their volume to show you\u2019re just as passionate.', tone: 'escalating', effectiveness: 'weak', feedback: 'Volume matching creates an arms race. The person who stays calm has more influence.' },
            { text: 'Go quiet and let them "win" to avoid conflict.', tone: 'submissive', effectiveness: 'weak', feedback: 'Shutting down means your valid perspective goes unheard. You can be peaceful AND firm.' }
          ]},
          { prompt: 'After class, you see them in the hallway. Things could be weird. What do you do?', options: [
            { text: '"Hey, good debate today. You made me think about [specific point]."', tone: 'gracious', effectiveness: 'strong', feedback: 'Showing that you learned from them, even in disagreement, turns debate into dialogue.' },
            { text: 'Avoid eye contact and walk past.', tone: 'avoidant', effectiveness: 'weak', feedback: 'Avoidance signals the disagreement damaged the relationship. A quick check-in prevents that.' },
            { text: '"No hard feelings, right?" with a casual tone.', tone: 'checking', effectiveness: 'moderate', feedback: 'Good instinct to check in! Adding something specific you respected about their argument makes it stronger.' }
          ]}
        ]
      },
      { id: 'ms_stop_behavior', title: 'Asking Someone to Stop a Behavior', scene: 'A friend keeps making jokes about your appearance. At first you laughed along, but now it actually bothers you.',
        branches: [
          { prompt: 'They make another joke in front of the group. What\u2019s your move?', options: [
            { text: 'Wait until you\u2019re alone with them and say "Hey, can I talk to you about something?"', tone: 'private', effectiveness: 'strong', feedback: 'Choosing a private moment protects their dignity AND gives you space to be honest.' },
            { text: 'Say "That\u2019s not funny anymore" in front of everyone.', tone: 'public', effectiveness: 'moderate', feedback: 'Standing up for yourself is important, but public callouts can make them defensive.' },
            { text: 'Laugh along even though it hurts inside.', tone: 'masking', effectiveness: 'weak', feedback: 'Masking pain to fit in teaches people it\u2019s okay to keep going. Your feelings matter.' }
          ]},
          { prompt: 'You get them alone. How do you bring it up?', options: [
            { text: '"I know you\u2019re joking, but when you comment on my [appearance], it actually makes me feel bad."', tone: 'I-statement', effectiveness: 'strong', feedback: 'Perfect I-statement! Assuming good intent while stating impact is the gold standard.' },
            { text: '"You need to stop making fun of me."', tone: 'demanding', effectiveness: 'moderate', feedback: 'Clear and direct, which is good. Adding how it FEELS would make it harder for them to dismiss.' },
            { text: '"Everyone thinks your jokes are mean."', tone: 'weaponized', effectiveness: 'weak', feedback: 'Bringing in "everyone" feels like an attack and may not even be true. Speak for yourself.' }
          ]},
          { prompt: 'They say "Chill, I was just joking. You\u2019re so sensitive." How do you handle this?', options: [
            { text: '"I hear you, but joking or not, it affects me. I\u2019m asking you as a friend to stop."', tone: 'firm', effectiveness: 'strong', feedback: 'Holding your boundary even when they minimize it shows incredible self-respect.' },
            { text: '"Maybe you\u2019re right, I\u2019m overreacting." and drop it.', tone: 'self-doubting', effectiveness: 'weak', feedback: 'Your feelings are valid. "Sensitive" is often used to avoid accountability.' },
            { text: '"How would you feel if I made those jokes about YOU?"', tone: 'perspective-flip', effectiveness: 'moderate', feedback: 'Empathy questions can work, but they can also feel confrontational. Lead with your feelings first.' }
          ]},
          { prompt: 'A week later, they slip and make another joke, then immediately say "Sorry, habit." What now?', options: [
            { text: '"Thanks for catching yourself. I appreciate you trying."', tone: 'reinforcing', effectiveness: 'strong', feedback: 'Acknowledging their effort, even when imperfect, encourages the change you asked for.' },
            { text: '"You SAID you\u2019d stop!" and get angry.', tone: 'frustrated', effectiveness: 'weak', feedback: 'Habits take time to break. Punishing the attempt discourages them from trying.' },
            { text: 'Ignore it and see if it keeps happening.', tone: 'monitoring', effectiveness: 'moderate', feedback: 'Patience is good. Verbal acknowledgment that they caught it reinforces the positive change.' }
          ]}
        ]
      },
      { id: 'ms_group_text', title: 'Handling a Group Chat Drama', scene: 'Someone in the group chat posts a screenshot of a private conversation. People start piling on the person in the screenshot.',
        branches: [
          { prompt: 'You see the screenshot and the comments rolling in. What do you do?', options: [
            { text: 'DM the person being talked about: "Hey, I just want you to know I don\u2019t think this is okay."', tone: 'supportive', effectiveness: 'strong', feedback: 'Reaching out privately to the person being hurt is one of the bravest things you can do.' },
            { text: 'Type in the group: "This isn\u2019t cool. Private messages should stay private."', tone: 'direct', effectiveness: 'strong', feedback: 'Naming what\u2019s wrong publicly takes real courage and can shift the whole group dynamic.' },
            { text: 'Read everything but don\u2019t say anything.', tone: 'bystander', effectiveness: 'weak', feedback: 'Silence in the face of cruelty can feel like agreement. Even a small action helps.' }
          ]},
          { prompt: 'Someone replies "It\u2019s not that deep, relax." How do you respond?', options: [
            { text: '"It might not be deep to you, but imagine being the person in that screenshot."', tone: 'empathetic', effectiveness: 'strong', feedback: 'Redirecting to empathy cuts through dismissiveness. You\u2019re asking them to imagine another perspective.' },
            { text: 'Don\u2019t reply \u2014 you said your piece.', tone: 'firm', effectiveness: 'moderate', feedback: 'Sometimes you plant the seed and let it grow. You don\u2019t have to win the argument to make an impact.' },
            { text: 'Leave the group chat entirely.', tone: 'exit', effectiveness: 'moderate', feedback: 'Removing yourself is valid if the toxicity continues, but advocacy first makes a bigger difference.' }
          ]},
          { prompt: 'The person who posted it says "Why are you defending them? Are you friends with them now?"', options: [
            { text: '"You don\u2019t have to be best friends with someone to know sharing private stuff is wrong."', tone: 'principled', effectiveness: 'strong', feedback: 'Standing on principle rather than social alliances shows deep moral reasoning.' },
            { text: '"Yeah, actually, I am."', tone: 'bold', effectiveness: 'moderate', feedback: 'Claiming friendship as a reason is fine, but the principle applies regardless of friendship.' },
            { text: 'Back down and say "Nevermind, forget I said anything."', tone: 'retreating', effectiveness: 'weak', feedback: 'The pressure is real, but backing down teaches the group that speaking up has no support.' }
          ]},
          { prompt: 'Later, the person from the screenshot thanks you. But some people in the group are cold to you now. How do you feel?', options: [
            { text: '"It was worth it. I\u2019d rather lose popularity than my integrity."', tone: 'principled', effectiveness: 'strong', feedback: 'Social courage comes with social cost sometimes. Your integrity is worth more than likes.' },
            { text: '"I hope things go back to normal soon." and give it time.', tone: 'patient', effectiveness: 'moderate', feedback: 'Usually they do. People respect backbone even when they don\u2019t show it immediately.' },
            { text: '"Maybe I should\u2019ve just stayed out of it."', tone: 'regretful', effectiveness: 'weak', feedback: 'Self-doubt after doing the right thing is normal, but you made a difference. Hold onto that.' }
          ]}
        ]
      },
      { id: 'ms_peer_pressure', title: 'Handling Peer Pressure Gracefully', scene: 'Your friend group is planning to ditch class and go to the mall. Everyone\u2019s going and they\u2019re pressuring you to come.',
        branches: [
          { prompt: '"Come on, don\u2019t be lame. Everyone\u2019s going." What do you say?', options: [
            { text: '"Nah, I\u2019ve got a test next period I can\u2019t miss. Have fun though!"', tone: 'confident', effectiveness: 'strong', feedback: 'Giving a clear reason without apologizing or judging them is the sweet spot.' },
            { text: '"I don\u2019t know... I\u2019ll think about it" hoping they\u2019ll forget.', tone: 'indecisive', effectiveness: 'weak', feedback: 'Stalling leaves the door open for more pressure. A clear "no" is more effective.' },
            { text: '"That sounds fun but I really can\u2019t today."', tone: 'firm-friendly', effectiveness: 'strong', feedback: 'Validating their plan while holding your boundary \u2014 socially smooth AND self-respecting.' }
          ]},
          { prompt: '"You\u2019re always the responsible one. Live a little!" How do you handle this?', options: [
            { text: '"I live plenty! I just pick my moments. This isn\u2019t one of them."', tone: 'playful-firm', effectiveness: 'strong', feedback: 'Using humor while staying firm keeps the friendship light and your decision clear.' },
            { text: '"Fine, maybe you\u2019re right..." and consider going.', tone: 'caving', effectiveness: 'weak', feedback: 'When "live a little" overrides your judgment, you\u2019re making their decision, not yours.' },
            { text: '"Being responsible isn\u2019t boring \u2014 it\u2019s how I stay out of trouble."', tone: 'direct', effectiveness: 'moderate', feedback: 'True! Just watch the tone so it doesn\u2019t come across as judging their choice.' }
          ]},
          { prompt: 'They go without you. When they come back, they\u2019re all talking about how fun it was. You feel left out. What do you do?', options: [
            { text: 'Say "Sounds like you had a blast! I\u2019ll catch the next hangout that doesn\u2019t involve skipping." ', tone: 'secure', effectiveness: 'strong', feedback: 'Being happy for them without regretting your choice shows real self-security.' },
            { text: 'Feel resentful and give them the cold shoulder.', tone: 'bitter', effectiveness: 'weak', feedback: 'Punishing them for having fun without you isn\u2019t fair. You made a good choice \u2014 own it.' },
            { text: '"I wish I came..." and feel regret.', tone: 'FOMO', effectiveness: 'weak', feedback: 'FOMO is natural but temporary. Your future self will thank present you for staying.' }
          ]},
          { prompt: 'The next day, two of them got caught and have detention. They text you "You were smart not to come." What do you say?', options: [
            { text: '"Sorry that happened to you. At least it wasn\u2019t all of us."', tone: 'empathetic', effectiveness: 'strong', feedback: 'Empathy without "I told you so" preserves the friendship and your integrity.' },
            { text: '"Ha! Called it!"', tone: 'smug', effectiveness: 'weak', feedback: 'Being right feels good, but rubbing it in pushes friends away.' },
            { text: '"That sucks. Need help catching up on what you missed in class?"', tone: 'helpful', effectiveness: 'strong', feedback: 'Offering help instead of judgment? That\u2019s the kind of friend everyone wants.' }
          ]}
        ]
      }
    ],
    high: [
      { id: 'hs_networking', title: 'Networking at an Event', scene: 'You\u2019re at a career fair / college information event and need to talk to professionals you\u2019ve never met.',
        branches: [
          { prompt: 'You approach a booth. The representative looks busy. How do you start?', options: [
            { text: '"Hi, I\u2019m [name]. I\u2019m really interested in [field]. Do you have a moment to tell me about opportunities?"', tone: 'professional', effectiveness: 'strong', feedback: 'Clear introduction + specific interest + polite time check. Textbook professional networking.' },
            { text: 'Hover near the booth until they notice you.', tone: 'passive', effectiveness: 'weak', feedback: 'In professional settings, initiative is expected. Walk up and introduce yourself.' },
            { text: '"Hey, do you have any free stuff?"', tone: 'casual', effectiveness: 'weak', feedback: 'Opens with self-interest rather than genuine engagement. Not the impression you want.' }
          ]},
          { prompt: 'They ask "What are you passionate about?" and you freeze for a second. What do you do?', options: [
            { text: 'Be honest: "I\u2019m still figuring that out, but I know I\u2019m drawn to [area] because [reason]."', tone: 'authentic', effectiveness: 'strong', feedback: 'Authenticity + self-awareness is more impressive than a rehearsed answer. Professionals respect honesty.' },
            { text: 'Rattle off a memorized elevator pitch.', tone: 'rehearsed', effectiveness: 'moderate', feedback: 'Preparation is good, but if it sounds robotic, the connection feels transactional.' },
            { text: '"I don\u2019t know, that\u2019s why I\u2019m here." with a nervous laugh.', tone: 'deflecting', effectiveness: 'weak', feedback: 'Self-deprecation in professional contexts undermines your credibility. You know more than you think.' }
          ]},
          { prompt: 'The conversation is going well. They mention a program you\u2019ve never heard of. What do you do?', options: [
            { text: '"I haven\u2019t heard of that \u2014 can you tell me more? What makes it unique?"', tone: 'curious', effectiveness: 'strong', feedback: 'Admitting you don\u2019t know + asking a smart follow-up is a power move, not a weakness.' },
            { text: 'Nod like you know what they\u2019re talking about.', tone: 'pretending', effectiveness: 'weak', feedback: 'Faking knowledge risks embarrassment later and misses a learning opportunity.' },
            { text: '"Oh yeah, I think I\u2019ve seen that online."', tone: 'vague', effectiveness: 'weak', feedback: 'Vague agreement is transparent. Genuine curiosity is more memorable than performed knowledge.' }
          ]},
          { prompt: 'Time to wrap up. How do you end the conversation?', options: [
            { text: '"Thank you for your time. Could I get your card or email in case I have follow-up questions?"', tone: 'professional', effectiveness: 'strong', feedback: 'Requesting contact info shows you value the connection AND creates a bridge for follow-up.' },
            { text: '"Okay, thanks. Bye!" and walk away quickly.', tone: 'abrupt', effectiveness: 'weak', feedback: 'An abrupt exit wastes the rapport you built. Always close with a forward-looking action.' },
            { text: '"This was really helpful. I\u2019ll definitely look into [specific thing they mentioned]."', tone: 'engaged', effectiveness: 'strong', feedback: 'Referencing something specific shows active listening and genuine interest.' }
          ]}
        ]
      },
      { id: 'hs_difficult', title: 'Having a Difficult Conversation', scene: 'You need to tell your close friend that their constant negativity is affecting your mental health.',
        branches: [
          { prompt: 'You\u2019ve decided to bring it up. How do you set the stage?', options: [
            { text: '"Hey, can we talk about something important? It\u2019s not bad \u2014 I just care about our friendship and want to be honest."', tone: 'intentional', effectiveness: 'strong', feedback: 'Framing it as care, not criticism, reduces defensiveness. "Not bad" signals safety.' },
            { text: 'Text them a long message explaining everything.', tone: 'avoidant', effectiveness: 'moderate', feedback: 'Texts lack tone and can be misread. For important conversations, face-to-face (or at least voice) is better.' },
            { text: 'Wait for them to be negative and then react in the moment.', tone: 'reactive', effectiveness: 'weak', feedback: 'Reactive conversations are driven by emotion, not intention. Plan the conversation in advance.' }
          ]},
          { prompt: 'You say your piece. They respond: "So you think I\u2019m a toxic person?" How do you handle this?', options: [
            { text: '"Not at all. You\u2019re one of my closest friends. I\u2019m talking about a PATTERN, not who you ARE as a person."', tone: 'separating', effectiveness: 'strong', feedback: 'Distinguishing behavior from identity is crucial in difficult conversations. You nailed it.' },
            { text: '"No, no, forget I said anything. You\u2019re fine."', tone: 'retreating', effectiveness: 'weak', feedback: 'Backing down teaches you that your feelings don\u2019t deserve space. They do.' },
            { text: '"I mean... kind of? You ARE really negative a lot."', tone: 'confirming', effectiveness: 'weak', feedback: 'Confirming their worst interpretation escalates the conversation. Redirect to behavior.' }
          ]},
          { prompt: 'They get quiet and seem hurt. What do you do?', options: [
            { text: '"I know this is hard to hear. Take whatever time you need. I\u2019m not going anywhere."', tone: 'patient', effectiveness: 'strong', feedback: 'Holding space for their reaction without rushing to "fix" it shows deep emotional maturity.' },
            { text: 'Immediately apologize and say you didn\u2019t mean it.', tone: 'backpedaling', effectiveness: 'weak', feedback: 'Taking back honest communication teaches both of you that truth is dangerous. It isn\u2019t.' },
            { text: '"Can you say something? The silence is killing me."', tone: 'anxious', effectiveness: 'moderate', feedback: 'Your discomfort is valid, but their processing time matters. Let them have it.' }
          ]},
          { prompt: 'A few days later, they text: "I\u2019ve been thinking about what you said. You\u2019re right, and I\u2019m sorry." What\u2019s your response?', options: [
            { text: '"That means so much. I know it wasn\u2019t easy to hear, and I respect you even more for reflecting on it."', tone: 'appreciative', effectiveness: 'strong', feedback: 'Acknowledging their vulnerability after a hard conversation deepens trust enormously.' },
            { text: '"It\u2019s fine, don\u2019t worry about it."', tone: 'dismissive', effectiveness: 'weak', feedback: 'Minimizing their reflection dismisses the emotional work they just did. Honor it.' },
            { text: '"Thank you. What do you think would help? I want to support you, not just criticize."', tone: 'collaborative', effectiveness: 'strong', feedback: 'Moving from feedback to collaboration shows this was about the friendship, not just venting.' }
          ]}
        ]
      },
      { id: 'hs_boundaries', title: 'Setting Boundaries with a Friend', scene: 'Your best friend calls you every night at 11 PM to vent about their problems. You care about them, but it\u2019s affecting your sleep and mental health.',
        branches: [
          { prompt: 'They call again at 11:15 PM. What do you do?', options: [
            { text: 'Answer and say "Hey, I want to talk but I need to set a boundary \u2014 can we move our calls to earlier?"', tone: 'honest', effectiveness: 'strong', feedback: 'Setting the boundary in the moment it\u2019s relevant makes it clear and connected to the real impact.' },
            { text: 'Let it go to voicemail and text "Sorry, was asleep."', tone: 'passive', effectiveness: 'moderate', feedback: 'Avoids confrontation but doesn\u2019t solve the pattern. They\u2019ll call tomorrow at 11 again.' },
            { text: 'Answer and listen for an hour even though you\u2019re exhausted.', tone: 'self-sacrificing', effectiveness: 'weak', feedback: 'Self-sacrifice builds resentment and isn\u2019t sustainable. You can\u2019t pour from an empty cup.' }
          ]},
          { prompt: 'They say "But you\u2019re the only person who understands me." How do you respond?', options: [
            { text: '"I\u2019m glad you trust me, and I\u2019m not going anywhere. I just need our talks to happen at a time when I can actually be present for you."', tone: 'reassuring-firm', effectiveness: 'strong', feedback: 'Reframing the boundary as BETTER support, not less support, is masterful.' },
            { text: '"Maybe you should talk to a counselor too? I can\u2019t be your only support."', tone: 'redirecting', effectiveness: 'moderate', feedback: 'Suggesting professional support is appropriate, but be gentle \u2014 it can feel like rejection.' },
            { text: '"That\u2019s a lot of pressure to put on one person..."', tone: 'burdened', effectiveness: 'moderate', feedback: 'Honest, but it might make them feel guilty. Frame it around YOUR needs, not their burden.' }
          ]},
          { prompt: 'You set the boundary: no calls after 9 PM. The first night, they text at 11 PM: "Are you really not going to answer?" What do you do?', options: [
            { text: 'Don\u2019t respond until morning, then say "Good morning! I saw your text. Everything okay?"', tone: 'consistent', effectiveness: 'strong', feedback: 'Following through on your boundary, then checking in warmly, teaches them you mean what you say AND you still care.' },
            { text: 'Give in and call them back.', tone: 'caving', effectiveness: 'weak', feedback: 'Breaking your own boundary immediately teaches them that persistence overrides your "no."' },
            { text: 'Text back "I said no calls after 9. I\u2019m serious."', tone: 'stern', effectiveness: 'moderate', feedback: 'The message is right, but the tone could feel punishing. Warmth + firmness is the combo.' }
          ]},
          { prompt: 'After a week, the new pattern is working. They say "I actually sleep better too now that we talk earlier." How do you feel?', options: [
            { text: '"See? Boundaries aren\u2019t walls \u2014 they\u2019re fences with gates. We both benefit."', tone: 'wise', effectiveness: 'strong', feedback: 'The boundary improved BOTH your lives. That\u2019s the whole point \u2014 and you articulated it beautifully.' },
            { text: '"I\u2019m glad! I was worried you\u2019d be mad at me forever."', tone: 'relieved', effectiveness: 'moderate', feedback: 'The relief is natural, but notice: the boundary you feared setting actually strengthened the friendship.' },
            { text: '"Told you so!" teasingly.', tone: 'playful', effectiveness: 'moderate', feedback: 'Light teasing is fine with close friends! As long as it\u2019s warm, not smug.' }
          ]}
        ]
      },
      { id: 'hs_interview', title: 'Job Interview Social Skills', scene: 'You have a job interview at a local business. You\u2019re nervous but prepared.',
        branches: [
          { prompt: 'You walk in and the interviewer is on a phone call. How do you handle the wait?', options: [
            { text: 'Sit quietly, make eye contact and smile when they look up, wait patiently.', tone: 'composed', effectiveness: 'strong', feedback: 'Composure under uncertainty is a professional social skill. You\u2019re already making an impression.' },
            { text: 'Stand awkwardly in the doorway unsure what to do.', tone: 'uncertain', effectiveness: 'weak', feedback: 'Finding a seat and settling in shows confidence. The space is for you \u2014 claim it calmly.' },
            { text: 'Start scrolling on your phone.', tone: 'casual', effectiveness: 'weak', feedback: 'Phone use signals disengagement. First impressions are forming even when the interview hasn\u2019t officially started.' }
          ]},
          { prompt: '"Tell me about yourself." How do you structure your answer?', options: [
            { text: 'Brief personal context \u2192 relevant experience/skills \u2192 why you\u2019re excited about THIS opportunity.', tone: 'structured', effectiveness: 'strong', feedback: 'The past-present-future structure is clean, professional, and keeps you focused.' },
            { text: 'Start from childhood and give your full life story.', tone: 'rambling', effectiveness: 'weak', feedback: 'Less is more. Relevance and conciseness show respect for their time and your communication skills.' },
            { text: '"I\u2019m a hard worker and a fast learner." Generic buzzwords.', tone: 'cliche', effectiveness: 'weak', feedback: 'Everyone says this. Specific examples and authentic details make you memorable.' }
          ]},
          { prompt: 'They ask a question you don\u2019t know the answer to. What do you do?', options: [
            { text: '"That\u2019s a great question. I don\u2019t have direct experience with that, but here\u2019s how I\u2019d approach learning it..."', tone: 'honest', effectiveness: 'strong', feedback: 'Honesty + a learning orientation is more impressive than a bluff. Employers value coachability.' },
            { text: 'Make up an answer that sounds good.', tone: 'fabricating', effectiveness: 'weak', feedback: 'Experienced interviewers can spot fabrication. Getting caught lying is an instant disqualifier.' },
            { text: '"I\u2019m not sure" and leave it at that.', tone: 'flat', effectiveness: 'weak', feedback: 'Honesty is step one. Step two is showing how you\u2019d bridge the gap. Always add a "but."' }
          ]},
          { prompt: 'The interview ends. "Do you have any questions for us?" What do you ask?', options: [
            { text: '"What does success look like in this role in the first 90 days?"', tone: 'strategic', effectiveness: 'strong', feedback: 'This shows you\u2019re already thinking about contributing. It\u2019s the kind of question that gets remembered.' },
            { text: '"How much does it pay?"', tone: 'premature', effectiveness: 'weak', feedback: 'Compensation matters, but leading with it in a first interview signals wrong priorities.' },
            { text: '"Nope, I think you covered everything!"', tone: 'disengaged', effectiveness: 'weak', feedback: 'Having no questions suggests low interest. Always have 2-3 thoughtful questions prepared.' }
          ]}
        ]
      },
      { id: 'hs_conflict_mediation', title: 'Mediating a Friend Conflict', scene: 'Two close friends are in a serious fight. Both are texting you separately, each wanting you to take their side.',
        branches: [
          { prompt: 'Friend A texts: "Can you believe what they said? You agree with me, right?" What do you say?', options: [
            { text: '"I hear you, and what happened clearly hurt. But I want to understand the full picture before I form an opinion."', tone: 'neutral-empathetic', effectiveness: 'strong', feedback: 'Validating feelings without taking sides preserves your ability to help both of them.' },
            { text: '"Yeah, they were totally out of line."', tone: 'siding', effectiveness: 'weak', feedback: 'Agreeing with one side locks you into a position and escalates the conflict.' },
            { text: '"I don\u2019t want to get involved."', tone: 'withdrawing', effectiveness: 'moderate', feedback: 'Healthy if you mean it, but if you care about both friendships, facilitating resolution is more effective.' }
          ]},
          { prompt: 'Friend B then texts: "They\u2019re probably telling you their version. Here\u2019s what REALLY happened." What do you do?', options: [
            { text: '"I appreciate you telling me your side. I think both of you have valid feelings. Would you be open to the three of us talking?"', tone: 'mediating', effectiveness: 'strong', feedback: 'Proposing direct communication is the most constructive step. You\u2019re being a bridge, not a messenger.' },
            { text: 'Compare their stories mentally and decide who\u2019s right.', tone: 'judging', effectiveness: 'weak', feedback: 'Conflicts rarely have a clear "right" side. The goal is resolution, not a verdict.' },
            { text: 'Forward Friend A\u2019s messages so Friend B can see what they said.', tone: 'betraying', effectiveness: 'weak', feedback: 'Sharing private messages violates trust with BOTH friends. This will make everything worse.' }
          ]},
          { prompt: 'You get them both in a room (or group call). Tension is high. How do you facilitate?', options: [
            { text: '"Ground rules: one person talks at a time, no interrupting, and use \u2018I feel\u2019 instead of \u2018you always.\u2019 Who wants to go first?"', tone: 'structured', effectiveness: 'strong', feedback: 'Setting structure creates safety. This is professional-level mediation. Impressive.' },
            { text: '"Okay, both of you tell me what happened and I\u2019ll decide who\u2019s right."', tone: 'authoritarian', effectiveness: 'weak', feedback: 'Making yourself the judge creates dependency and doesn\u2019t teach them to resolve conflict directly.' },
            { text: '"Can\u2019t you two just get over it? Life\u2019s too short."', tone: 'dismissive', effectiveness: 'weak', feedback: 'Minimizing their feelings shuts down the process. Their conflict is real and deserves space.' }
          ]},
          { prompt: 'After 20 minutes, they\u2019re not friends again, but they understand each other better. They both thank you. How do you reflect?', options: [
            { text: '"I\u2019m glad you talked. Resolution doesn\u2019t always mean agreement \u2014 sometimes it just means understanding."', tone: 'wise', effectiveness: 'strong', feedback: 'This reframes success from "fixed" to "understood." That\u2019s a mature and realistic view of conflict resolution.' },
            { text: '"Phew, that was stressful. I\u2019m drained."', tone: 'exhausted', effectiveness: 'moderate', feedback: 'Emotional labor is real. Take care of yourself too \u2014 mediating is hard work.' },
            { text: '"I really hope this doesn\u2019t happen again." with anxiety.', tone: 'anxious', effectiveness: 'moderate', feedback: 'Conflict is a natural part of close relationships. Your skill in navigating it will only grow.' }
          ]}
        ]
      }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Body Language Reader — Expanded Cues Per Band ──
  // ══════════════════════════════════════════════════════════════
  var BODY_LANG_READER = {
    elementary: [
      { id: 'el_crossed', emoji: '\uD83D\uDE15', cue: 'Crossed arms', meaning: 'Uncomfortable or not wanting to be bothered', tip: 'Give them some space or gently ask if they\u2019re okay.' },
      { id: 'el_smile', emoji: '\uD83D\uDE04', cue: 'Big smile with eye crinkles', meaning: 'Happy and friendly! Wants to connect.', tip: 'Smile back! This is a great time to start talking.' },
      { id: 'el_lookaway', emoji: '\uD83D\uDE36', cue: 'Looking away while you talk', meaning: 'Might be bored, nervous, or distracted', tip: 'Try asking them a question to bring their attention back.' },
      { id: 'el_hands_hips', emoji: '\uD83E\uDDD1', cue: 'Hands on hips', meaning: 'Feeling confident OR starting to get frustrated', tip: 'Look at their face too \u2014 a smile means confident, a frown means upset.' },
      { id: 'el_hiding', emoji: '\uD83D\uDE47', cue: 'Hiding behind something (book, hair, hood)', meaning: 'Shy, embarrassed, or wanting to disappear', tip: 'Be gentle and don\u2019t draw attention to them. A quiet "hi" helps.' },
      { id: 'el_bouncing', emoji: '\uD83E\uDD38', cue: 'Bouncing or moving a lot', meaning: 'Excited, has lots of energy, or feeling restless', tip: 'Channel the energy! Suggest an active game or movement break.' },
      { id: 'el_fists', emoji: '\u270A', cue: 'Clenched fists at sides', meaning: 'Angry or trying very hard not to react', tip: 'Stay calm and give space. Say "I can see you\u2019re upset."' },
      { id: 'el_leaning', emoji: '\uD83D\uDC42', cue: 'Leaning in close', meaning: 'Very interested and wants to hear more!', tip: 'Keep talking \u2014 you have their full attention!' }
    ],
    middle: [
      { id: 'ms_eye_hold', emoji: '\uD83D\uDC41\uFE0F', cue: 'Sustained eye contact (3+ seconds)', meaning: 'Engaged, confident, or trying to establish connection', tip: 'Match their eye contact level. Too much can feel intense; too little feels dismissive.' },
      { id: 'ms_eye_dart', emoji: '\uD83D\uDC40', cue: 'Darting eyes, looking around room', meaning: 'Anxious, looking for escape, or overstimulated', tip: 'Lower the social pressure. Move to a quieter spot or change topics.' },
      { id: 'ms_slouch', emoji: '\uD83E\uDDD1\u200D\uD83D\uDCBB', cue: 'Slouched posture, chin in hand', meaning: 'Bored, checked out, or low energy/mood', tip: 'Don\u2019t take it personally \u2014 ask what\u2019s going on or suggest something active.' },
      { id: 'ms_mirror', emoji: '\uD83E\uDD1D', cue: 'Mirroring your gestures', meaning: 'Subconscious rapport \u2014 they feel connected to you', tip: 'Mirroring is a great sign! The conversation is flowing naturally.' },
      { id: 'ms_micro_smile', emoji: '\uD83D\uDE0F', cue: 'Quick micro-smile then neutral face', meaning: 'Amused but trying to hide it, or being polite', tip: 'They may be enjoying the conversation more than they show. Keep going!' },
      { id: 'ms_lip_press', emoji: '\uD83E\uDEE4', cue: 'Pressed lips, tight jaw', meaning: 'Holding back words, disagreeing silently', tip: 'They might have something to say. Ask: "What are you thinking?"' },
      { id: 'ms_space', emoji: '\uD83D\uDEB6', cue: 'Stepping back or creating distance', meaning: 'Feeling crowded or uncomfortable with closeness', tip: 'Respect the distance. Everyone has different comfort zones.' },
      { id: 'ms_phone', emoji: '\uD83D\uDCF1', cue: 'Repeatedly checking phone mid-conversation', meaning: 'Distracted, anxious about something else, or signaling disinterest', tip: 'Don\u2019t compete with the phone. Pause and say "Should we pick this up later?"' }
    ],
    high: [
      { id: 'hs_cultural_bow', emoji: '\uD83C\uDF0D', cue: 'Bowing slightly vs. offering handshake', meaning: 'Different cultures have different greeting norms', tip: 'Follow the other person\u2019s lead. If unsure, a warm nod and smile are universally safe.' },
      { id: 'hs_cultural_eye', emoji: '\uD83D\uDC41\uFE0F', cue: 'Avoiding eye contact out of respect', meaning: 'In some cultures, direct eye contact with elders/authority is disrespectful', tip: 'Don\u2019t assume lack of eye contact means disinterest \u2014 it may mean deep respect.' },
      { id: 'hs_power_pose', emoji: '\uD83E\uDDD1\u200D\uD83D\uDCBC', cue: 'Open stance, expansive gestures', meaning: 'Professional confidence, asserting presence', tip: 'In professional settings, open posture signals credibility. Practice "power posing" before presentations.' },
      { id: 'hs_casual_lean', emoji: '\uD83E\uDDD1', cue: 'Casual lean, relaxed shoulders', meaning: 'Comfortable, informal, treating you as an equal', tip: 'Match their casual energy in social settings. In formal ones, stay slightly more upright.' },
      { id: 'hs_contempt', emoji: '\uD83D\uDE12', cue: 'One-sided lip raise (contempt micro-expression)', meaning: 'Feeling superior or dismissive \u2014 the most damaging facial expression in relationships', tip: 'If you notice this in yourself, pause. Contempt corrodes connections faster than anger.' },
      { id: 'hs_genuine_fake', emoji: '\uD83C\uDFAD', cue: 'Smile without eye involvement (social smile)', meaning: 'Politeness without genuine warmth \u2014 performing connection', tip: 'Real smiles (Duchenne smiles) engage the eyes. If you see only mouth smiles, the warmth may be surface-level.' },
      { id: 'hs_touch_barrier', emoji: '\u270B', cue: 'Touching neck, ear, or creating object barriers', meaning: 'Self-soothing under stress or creating unconscious shields', tip: 'These are pacifying behaviors. The person may need reassurance or a lower-stakes environment.' },
      { id: 'hs_feet', emoji: '\uD83E\uDDB6', cue: 'Feet pointed toward exit', meaning: 'Subconsciously ready to leave, even if words say otherwise', tip: 'Feet are the most honest body part \u2014 people control their face but forget their feet.' }
    ]
  };

  // Body Language Reader Quiz (matching game)
  var BL_READER_QUIZ = {
    elementary: [
      { cue: 'Your friend has their arms crossed tight and is looking at the ground.', answer: 'el_crossed', options: ['el_crossed', 'el_smile', 'el_bouncing', 'el_leaning'] },
      { cue: 'The new kid is smiling at you with their whole face and waving.', answer: 'el_smile', options: ['el_fists', 'el_smile', 'el_lookaway', 'el_hiding'] },
      { cue: 'During storytime, your classmate keeps looking out the window and yawning.', answer: 'el_lookaway', options: ['el_leaning', 'el_hands_hips', 'el_lookaway', 'el_bouncing'] },
      { cue: 'After losing the game, a kid is standing with fists clenched and face red.', answer: 'el_fists', options: ['el_hiding', 'el_fists', 'el_smile', 'el_hands_hips'] },
      { cue: 'During your presentation, everyone is leaning forward in their chairs.', answer: 'el_leaning', options: ['el_lookaway', 'el_crossed', 'el_leaning', 'el_bouncing'] },
      { cue: 'A classmate pulls their hoodie over their face when the teacher calls on them.', answer: 'el_hiding', options: ['el_hiding', 'el_fists', 'el_smile', 'el_crossed'] },
      { cue: 'Your friend is jumping up and down and waving their hands around.', answer: 'el_bouncing', options: ['el_bouncing', 'el_hands_hips', 'el_leaning', 'el_lookaway'] },
      { cue: 'A kid stands with hands on hips and chin up, looking at the playground.', answer: 'el_hands_hips', options: ['el_crossed', 'el_fists', 'el_smile', 'el_hands_hips'] }
    ],
    middle: [
      { cue: 'In a group conversation, one person keeps copying your hand gestures and posture.', answer: 'ms_mirror', options: ['ms_mirror', 'ms_slouch', 'ms_eye_hold', 'ms_phone'] },
      { cue: 'Someone in your group keeps glancing at the door and shifting in their seat.', answer: 'ms_eye_dart', options: ['ms_eye_dart', 'ms_lip_press', 'ms_slouch', 'ms_mirror'] },
      { cue: 'During the meeting, they press their lips tight and clench their jaw when you share your idea.', answer: 'ms_lip_press', options: ['ms_phone', 'ms_lip_press', 'ms_micro_smile', 'ms_space'] },
      { cue: 'Every time you lean in to talk, they take a small step backward.', answer: 'ms_space', options: ['ms_space', 'ms_eye_hold', 'ms_slouch', 'ms_mirror'] },
      { cue: 'They maintain strong eye contact and nod slowly as you speak.', answer: 'ms_eye_hold', options: ['ms_eye_dart', 'ms_eye_hold', 'ms_micro_smile', 'ms_phone'] },
      { cue: 'While you\u2019re talking, they keep picking up their phone, glancing at it, and putting it down.', answer: 'ms_phone', options: ['ms_slouch', 'ms_phone', 'ms_eye_dart', 'ms_space'] },
      { cue: 'Their head is propped up on one hand, eyelids half-closed.', answer: 'ms_slouch', options: ['ms_mirror', 'ms_lip_press', 'ms_slouch', 'ms_eye_hold'] },
      { cue: 'A quick flash of a smile crosses their face before they look neutral again.', answer: 'ms_micro_smile', options: ['ms_micro_smile', 'ms_space', 'ms_phone', 'ms_eye_dart'] }
    ],
    high: [
      { cue: 'During a job interview, the interviewer leans back with arms spread wide across the chair.', answer: 'hs_power_pose', options: ['hs_power_pose', 'hs_casual_lean', 'hs_contempt', 'hs_touch_barrier'] },
      { cue: 'Your international classmate looks down when the teacher praises them.', answer: 'hs_cultural_eye', options: ['hs_cultural_eye', 'hs_genuine_fake', 'hs_casual_lean', 'hs_feet'] },
      { cue: 'Someone smiles at your joke but their eyes stay flat and unchanged.', answer: 'hs_genuine_fake', options: ['hs_genuine_fake', 'hs_contempt', 'hs_casual_lean', 'hs_power_pose'] },
      { cue: 'While saying "I\u2019m happy to help," their feet are pointed straight at the exit.', answer: 'hs_feet', options: ['hs_feet', 'hs_touch_barrier', 'hs_cultural_bow', 'hs_casual_lean'] },
      { cue: 'When you share your plan, one corner of their mouth lifts slightly while the other stays flat.', answer: 'hs_contempt', options: ['hs_genuine_fake', 'hs_contempt', 'hs_power_pose', 'hs_cultural_eye'] },
      { cue: 'They keep touching the back of their neck and holding their coffee cup like a shield.', answer: 'hs_touch_barrier', options: ['hs_touch_barrier', 'hs_feet', 'hs_contempt', 'hs_casual_lean'] },
      { cue: 'A new colleague greets you with a slight bow and a two-handed card presentation.', answer: 'hs_cultural_bow', options: ['hs_cultural_bow', 'hs_power_pose', 'hs_genuine_fake', 'hs_cultural_eye'] },
      { cue: 'At a casual gathering, they lean against the wall with one hand in their pocket, relaxed shoulders.', answer: 'hs_casual_lean', options: ['hs_casual_lean', 'hs_power_pose', 'hs_touch_barrier', 'hs_feet'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Active Listening Challenge — Deep Practice ──
  // ══════════════════════════════════════════════════════════════
  var LISTEN_DEEP = {
    elementary: [
      { id: 'ld_e1', speaker: 'Mia', text: 'I was so excited to wear my new shoes today but then it rained and they got all muddy and now they look terrible and I just want to cry!', skill: 'paraphrase', prompt: 'Can you say back what happened to Mia in your own words?', goodStarters: ['So your new shoes', 'It sounds like your shoes', 'You were excited but'], emoji: '\uD83D\uDC5F' },
      { id: 'ld_e2', speaker: 'Jayden', text: 'Nobody picked me for their team at PE today. I was the last one standing there. Everyone was looking at me.', skill: 'reflect', prompt: 'How do you think Jayden is feeling? Start with "It sounds like you feel..."', goodStarters: ['It sounds like you feel', 'You must feel', 'That probably made you feel'], emoji: '\uD83C\uDFC3' },
      { id: 'ld_e3', speaker: 'Sofia', text: 'My grandma is coming to visit from far away and I haven\u2019t seen her in a whole year and she\u2019s bringing my cousin too!', skill: 'clarify', prompt: 'Ask Sofia a question to learn more about her excitement!', goodStarters: ['When is she', 'How long will', 'What are you most excited', 'Have you met your cousin'], emoji: '\uD83D\uDC75' },
      { id: 'ld_e4', speaker: 'Marcus', text: 'I spent ALL weekend building a huge LEGO spaceship and then my little brother knocked it off the table and it broke into a million pieces!', skill: 'summarize', prompt: 'Summarize what happened to Marcus and how he probably feels.', goodStarters: ['You worked really hard', 'After spending your whole weekend', 'So your brother accidentally'], emoji: '\uD83D\uDE80' },
      { id: 'ld_e5', speaker: 'Lily', text: 'I have to do a presentation in front of the whole class tomorrow and my stomach already hurts just thinking about it.', skill: 'reflect', prompt: 'Reflect back what Lily is experiencing. Use feeling words!', goodStarters: ['It sounds like you\u2019re really nervous', 'You seem scared about', 'The worry is making'], emoji: '\uD83C\uDFA4' }
    ],
    middle: [
      { id: 'ld_m1', speaker: 'Alex', text: 'I found out my two best friends hung out without me this weekend. They posted it all over social media. I don\u2019t even know if I should say anything or just pretend I didn\u2019t see it.', skill: 'paraphrase', prompt: 'Paraphrase what Alex is going through. Show you understood both the situation AND the dilemma.', goodStarters: ['So you saw that your friends', 'You\u2019re dealing with being left out AND', 'It sounds like you\u2019re torn between'], emoji: '\uD83D\uDCF1' },
      { id: 'ld_m2', speaker: 'Jordan', text: 'My parents keep comparing me to my older sibling who gets straight A\u2019s. I try really hard but I\u2019m just not as good at school. It makes me feel like nothing I do is enough.', skill: 'reflect', prompt: 'Reflect the emotions Jordan is feeling. Try to name more than one emotion.', goodStarters: ['It sounds like you feel frustrated AND', 'You seem both hurt and', 'I hear frustration about the comparison and'], emoji: '\uD83D\uDCDA' },
      { id: 'ld_m3', speaker: 'Taylor', text: 'I want to try out for the school play but the popular kids always get the leads and I feel like I won\u2019t even get a chance because I\u2019m not in their group.', skill: 'clarify', prompt: 'Ask a clarifying question that helps Taylor explore their thinking more deeply.', goodStarters: ['What would it mean to you if', 'Have you ever seen someone outside', 'What\u2019s the part you\u2019re most drawn to', 'Is there someone in theater'], emoji: '\uD83C\uDFAD' },
      { id: 'ld_m4', speaker: 'Casey', text: 'I\u2019ve been hanging out with this new group and they\u2019re fun but they say stuff that\u2019s kinda mean about other people. I laugh along but afterward I feel gross about it.', skill: 'summarize', prompt: 'Summarize Casey\u2019s conflict and the tension they\u2019re feeling between belonging and values.', goodStarters: ['So you\u2019re caught between wanting to fit in', 'You enjoy the group but something doesn\u2019t sit right', 'There\u2019s a gap between how you act'], emoji: '\uD83E\uDD14' },
      { id: 'ld_m5', speaker: 'Riley', text: 'I told my friend a secret and now I\u2019m hearing it from other people. I don\u2019t even know who to trust anymore.', skill: 'reflect', prompt: 'Reflect the depth of what Riley is feeling. This isn\u2019t just about the secret \u2014 it\u2019s about trust.', goodStarters: ['The betrayal must feel', 'It sounds like this shook your trust in', 'Beyond the secret getting out, you\u2019re questioning'], emoji: '\uD83D\uDD10' }
    ],
    high: [
      { id: 'ld_h1', speaker: 'Morgan', text: 'Everyone keeps asking me what I want to major in and I genuinely have no idea. The pressure to have my whole life figured out at 17 is crushing me. I feel like I\u2019m already falling behind.', skill: 'paraphrase', prompt: 'Paraphrase Morgan\u2019s experience. Capture both the external pressure and internal response.', goodStarters: ['So the expectation to have answers', 'You\u2019re feeling crushed by the timeline', 'The gap between where people expect you to be'], emoji: '\uD83C\uDF93' },
      { id: 'ld_h2', speaker: 'Avery', text: 'I\u2019ve been performing well all semester but I still feel like a fraud. Like any day now someone\u2019s going to realize I don\u2019t actually belong in this advanced class.', skill: 'reflect', prompt: 'Reflect the cognitive-emotional pattern Avery is describing. Name what\u2019s happening beneath the surface.', goodStarters: ['It sounds like imposter syndrome', 'There\u2019s a disconnect between your evidence', 'You\u2019re succeeding externally but internally'], emoji: '\uD83C\uDFAD' },
      { id: 'ld_h3', speaker: 'Quinn', text: 'I love my friend group but I feel like I\u2019m always the one making plans, checking in, holding the group together. If I stopped, would anyone even notice?', skill: 'clarify', prompt: 'Ask a clarifying question that helps Quinn examine the dynamic without making assumptions.', goodStarters: ['Has there been a time when someone else', 'What would it look like to step back', 'Are there specific moments that triggered', 'Do you think they\u2019re aware of how much'], emoji: '\uD83E\uDDF2' },
      { id: 'ld_h4', speaker: 'Sage', text: 'My relationship with my parent has gotten really strained since they found out I disagree with some of their core beliefs. They say I\u2019m being "influenced" but I just... think for myself now.', skill: 'summarize', prompt: 'Summarize the full picture: the relationship shift, the identity development, and the misattribution Sage is experiencing.', goodStarters: ['So your growing independence is being interpreted as', 'You\u2019re navigating the tension between individuation', 'There\u2019s a painful gap between your self-understanding'], emoji: '\uD83C\uDF31' },
      { id: 'ld_h5', speaker: 'Drew', text: 'I got into my dream school but I can\u2019t afford it. My backup school gave me a full ride. Everyone says the choice is obvious but it doesn\u2019t feel obvious to me.', skill: 'reflect', prompt: 'Reflect the layers of emotion in Drew\u2019s situation. There\u2019s grief, practical tension, and social pressure.', goodStarters: ['There\u2019s a grief in getting what you wanted', 'It sounds like the "obvious" choice dismisses', 'You\u2019re mourning the dream while trying to embrace'], emoji: '\uD83C\uDFEB' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Friendship Health Check — Self-Assessment ──
  // ══════════════════════════════════════════════════════════════
  var FRIEND_HEALTH_STATEMENTS = {
    elementary: [
      { id: 'fh1', text: 'I listen when my friends are talking to me.', area: 'listening', icon: '\uD83D\uDC42' },
      { id: 'fh2', text: 'I say sorry when I do something wrong.', area: 'accountability', icon: '\uD83D\uDE4F' },
      { id: 'fh3', text: 'I include others who are left out.', area: 'inclusion', icon: '\uD83E\uDD17' },
      { id: 'fh4', text: 'I share my toys and supplies.', area: 'generosity', icon: '\uD83C\uDF81' },
      { id: 'fh5', text: 'I am happy when good things happen to my friends.', area: 'celebration', icon: '\uD83C\uDF89' },
      { id: 'fh6', text: 'I use kind words even when I\u2019m upset.', area: 'self-regulation', icon: '\uD83D\uDCAC' },
      { id: 'fh7', text: 'I keep my promises to my friends.', area: 'reliability', icon: '\uD83E\uDD1E' },
      { id: 'fh8', text: 'I take turns and play fair.', area: 'fairness', icon: '\u2696\uFE0F' },
      { id: 'fh9', text: 'I ask friends how they are feeling.', area: 'empathy', icon: '\u2764\uFE0F' },
      { id: 'fh10', text: 'I stand up for my friends when someone is being mean to them.', area: 'advocacy', icon: '\uD83D\uDEE1\uFE0F' }
    ],
    middle: [
      { id: 'fh1', text: 'I listen to understand, not just to respond.', area: 'listening', icon: '\uD83D\uDC42' },
      { id: 'fh2', text: 'I apologize when I\u2019m wrong without making excuses.', area: 'accountability', icon: '\uD83D\uDE4F' },
      { id: 'fh3', text: 'I actively include people who seem left out.', area: 'inclusion', icon: '\uD83E\uDD17' },
      { id: 'fh4', text: 'I celebrate my friends\u2019 successes without feeling jealous.', area: 'celebration', icon: '\uD83C\uDF89' },
      { id: 'fh5', text: 'I address conflicts directly instead of gossiping about them.', area: 'conflict-resolution', icon: '\uD83D\uDDE3\uFE0F' },
      { id: 'fh6', text: 'I respect my friends\u2019 boundaries, even when I don\u2019t understand them.', area: 'boundaries', icon: '\uD83D\uDEE1\uFE0F' },
      { id: 'fh7', text: 'I follow through on plans and commitments.', area: 'reliability', icon: '\uD83E\uDD1E' },
      { id: 'fh8', text: 'I can disagree with a friend without it becoming a fight.', area: 'conflict-resolution', icon: '\u2696\uFE0F' },
      { id: 'fh9', text: 'I check in on friends who seem to be going through something.', area: 'empathy', icon: '\u2764\uFE0F' },
      { id: 'fh10', text: 'I stand up against mean behavior even when it\u2019s socially risky.', area: 'advocacy', icon: '\uD83E\uDDB8' }
    ],
    high: [
      { id: 'fh1', text: 'I practice active listening \u2014 reflecting, paraphrasing, and asking clarifying questions.', area: 'listening', icon: '\uD83D\uDC42' },
      { id: 'fh2', text: 'I take accountability for my impact, even when my intent was good.', area: 'accountability', icon: '\uD83D\uDE4F' },
      { id: 'fh3', text: 'I notice and challenge exclusion patterns, not just individual incidents.', area: 'inclusion', icon: '\uD83E\uDD17' },
      { id: 'fh4', text: 'I can hold space for a friend\u2019s pain without trying to fix it.', area: 'empathy', icon: '\u2764\uFE0F' },
      { id: 'fh5', text: 'I communicate boundaries before reaching resentment.', area: 'boundaries', icon: '\uD83D\uDEE1\uFE0F' },
      { id: 'fh6', text: 'I monitor the give-and-take balance in my relationships.', area: 'reciprocity', icon: '\u2696\uFE0F' },
      { id: 'fh7', text: 'I can maintain a friendship through disagreement and growth.', area: 'resilience', icon: '\uD83C\uDF31' },
      { id: 'fh8', text: 'I support friends\u2019 autonomy even when I\u2019d make different choices.', area: 'respect', icon: '\uD83E\uDD1D' },
      { id: 'fh9', text: 'I repair ruptures quickly rather than letting tension compound.', area: 'repair', icon: '\uD83D\uDD27' },
      { id: 'fh10', text: 'I recognize when a friendship has become unhealthy and can set limits or let go.', area: 'self-awareness', icon: '\uD83E\uDDE0' }
    ]
  };

  var FRIEND_HEALTH_TIPS = {
    listening: { strength: 'You\u2019re a great listener! Friends feel heard around you.', growth: 'Try pausing before responding to make sure you fully understood what your friend said.' },
    accountability: { strength: 'Taking responsibility shows maturity and builds trust!', growth: 'Practice saying "I\u2019m sorry for [specific thing]" without adding "but..."' },
    inclusion: { strength: 'You notice and include others \u2014 that\u2019s a rare and powerful quality!', growth: 'Look for someone who seems alone this week and invite them in.' },
    generosity: { strength: 'Your willingness to share makes people feel valued!', growth: 'Sharing doesn\u2019t always mean stuff \u2014 share your time and attention too.' },
    celebration: { strength: 'You can be happy for others \u2014 that\u2019s the sign of a secure friendship!', growth: 'When a friend succeeds, try saying specifically what impressed you.' },
    'self-regulation': { strength: 'Controlling your words when upset protects your relationships!', growth: 'When you feel angry, try counting to 5 before speaking.' },
    reliability: { strength: 'People can count on you \u2014 that\u2019s the foundation of trust!', growth: 'If you can\u2019t keep a promise, tell your friend as soon as possible.' },
    fairness: { strength: 'Fairness makes friendships feel safe and balanced!', growth: 'Ask yourself: "Would I be okay if they did this to me?"' },
    empathy: { strength: 'Your ability to sense others\u2019 feelings makes you an amazing friend!', growth: 'Practice asking "How are you REALLY doing?" and waiting for the real answer.' },
    advocacy: { strength: 'Standing up for others takes courage \u2014 you have it!', growth: 'You don\u2019t have to be confrontational to speak up. Even a quiet "That\u2019s not cool" helps.' },
    'conflict-resolution': { strength: 'Handling disagreements directly shows emotional intelligence!', growth: 'Use "I feel [emotion] when [behavior]" to express frustration without attacking.' },
    boundaries: { strength: 'Respecting boundaries shows deep respect for others!', growth: 'Notice when you feel uncomfortable and practice saying what you need.' },
    reciprocity: { strength: 'Monitoring balance shows relational wisdom!', growth: 'Track who initiates plans \u2014 aim for roughly 50/50 over time.' },
    resilience: { strength: 'Friendships that survive challenges become the strongest!', growth: 'After a rough patch, check in: "Are we okay? I value this friendship."' },
    respect: { strength: 'Supporting autonomy means you see friends as whole people, not extensions of yourself!', growth: 'When you disagree with a friend\u2019s choice, say "I see it differently but I support you."' },
    repair: { strength: 'Quick repair prevents small issues from becoming big ones!', growth: 'Don\u2019t wait for the "perfect time" to address tension. Sooner is almost always better.' },
    'self-awareness': { strength: 'Recognizing unhealthy patterns is the first step to changing them!', growth: 'Journal about how you feel after spending time with each friend. Patterns will emerge.' }
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
    { id: 'streak_3',       icon: '\uD83D\uDD25',       name: 'Practice Streak',      desc: 'Practice 3 days in a row' },
    { id: 'sim_convo_1',    icon: '\uD83C\uDFAC',       name: 'Conversation Starter', desc: 'Complete your first conversation simulation' },
    { id: 'sim_convo_3',    icon: '\uD83C\uDF1F',       name: 'Dialogue Master',      desc: 'Complete 3 conversation simulations' },
    { id: 'bl_reader_3',    icon: '\uD83D\uDD75\uFE0F', name: 'Body Language Expert', desc: 'Study 3 body language cues in the reader' },
    { id: 'bl_reader_quiz', icon: '\uD83C\uDFAF',       name: 'Cue Detective',        desc: 'Score 5+ on the body language reader quiz' },
    { id: 'deep_listen_1',  icon: '\uD83C\uDFA7',       name: 'Active Listener',      desc: 'Complete your first deep listening challenge' },
    { id: 'deep_listen_all', icon: '\uD83D\uDC96',      name: 'Empathy Expert',       desc: 'Practice all 4 active listening skills' },
    { id: 'health_check',   icon: '\uD83E\uDE7A',       name: 'Friendship Checker',   desc: 'Complete the Friendship Health Check' },
    { id: 'social_butterfly', icon: '\uD83E\uDD8B',     name: 'Social Butterfly',     desc: 'Try all 8 activity tabs at least once' }
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
      var announceToSR = ctx.announceToSR;
      var a11yClick = ctx.a11yClick;
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

      // Conversation Simulator state
      var simIdx         = d.simIdx || 0;
      var simStep        = d.simStep || 0;
      var simChoices     = d.simChoices || [];
      var simDone        = d.simDone || false;
      var simCompleted   = d.simCompleted || 0;

      // Body Language Reader state
      var blrMode        = d.blrMode || 'study'; // 'study' or 'quiz'
      var blrStudied     = d.blrStudied || {};
      var blrExpanded    = d.blrExpanded || null;
      var blrQuizIdx     = d.blrQuizIdx || 0;
      var blrQuizAnswer  = d.blrQuizAnswer || null;
      var blrQuizShow    = d.blrQuizShow || false;
      var blrQuizScore   = d.blrQuizScore || 0;
      var blrQuizTotal   = d.blrQuizTotal || 0;

      // Active Listening Deep state
      var ldIdx          = d.ldIdx || 0;
      var ldDraft        = d.ldDraft || '';
      var ldRevealed     = d.ldRevealed || false;
      var ldAiResp       = d.ldAiResp || null;
      var ldAiLoading    = d.ldAiLoading || false;
      var ldCompleted    = d.ldCompleted || 0;
      var ldSkillsDone   = d.ldSkillsDone || {};

      // Friendship Health Check state
      var fhAnswers      = d.fhAnswers || {};
      var fhDone         = d.fhDone || false;
      var fhShowResults  = d.fhShowResults || false;

      // Tab visits tracking (for Social Butterfly badge)
      var tabVisits      = d.tabVisits || {};

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
        { id: 'sim',       label: '\uD83C\uDFAC Simulator' },
        { id: 'listen',    label: '\uD83D\uDC42 Listening' },
        { id: 'listenDeep', label: '\uD83C\uDFA7 Deep Listen' },
        { id: 'body',      label: '\uD83D\uDC40 Body Language' },
        { id: 'blReader',  label: '\uD83D\uDD75\uFE0F BL Reader' },
        { id: 'coop',      label: '\uD83E\uDD1D Cooperation' },
        { id: 'friends',   label: '\uD83D\uDC9B Friendship' },
        { id: 'healthChk', label: '\uD83E\uDE7A Health Check' },
        { id: 'log',       label: '\uD83D\uDCCA Progress' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Social Skills tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(tab) {
          var isActive = activeTab === tab.id;
          return h('button', { 'aria-label': 'Toggle sound',
            key: tab.id,
            role: 'tab', 'aria-selected': isActive,
            onClick: function() {
              upd('activeTab', tab.id);
              if (soundEnabled) sfxClick();
              var newVisits = Object.assign({}, tabVisits);
              newVisits[tab.id] = true;
              upd('tabVisits', newVisits);
              // Social Butterfly: visited all 8 activity tabs (not 'log')
              var actTabs = ['convo','sim','listen','listenDeep','body','blReader','coop','friends','healthChk'];
              var allVisited = actTabs.every(function(t) { return newVisits[t]; });
              if (allVisited) tryAwardBadge('social_butterfly');
            },
            style: {
              padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: isActive ? '#0ea5e9' : 'transparent',
              color: isActive ? '#fff' : '#94a3b8',
              fontWeight: isActive ? 700 : 500, fontSize: 12, whiteSpace: 'nowrap', flexShrink: 0
            }
          }, tab.label);
        }),
        h('button', { 'aria-label': 'View badges',
          onClick: function() { upd('soundEnabled', !soundEnabled); },
          style: { marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
        }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', { 'aria-label': 'View badges',
          onClick: function() { upd('showBadgesPanel', !showBadgesPanel); },
          style: { padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: showBadgesPanel ? '#0ea5e933' : 'transparent', color: '#94a3b8', fontSize: 14, flexShrink: 0 }
        }, '\uD83C\uDFC5 ' + Object.keys(earnedBadges).length + '/' + BADGES.length)
      );

      // ── Badge Popup ──
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', {             style: { position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' },
            onClick: function() { upd('showBadgePopup', null); }
          },
            h('div', {               style: { background: 'linear-gradient(135deg, #0c1631 0%, #1e293b 100%)', borderRadius: 20, padding: '32px 40px', textAlign: 'center', border: '2px solid #0ea5e9', maxWidth: 320 },
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
                return h('div', {                   key: badge.id, title: badge.name + ': ' + badge.desc,
                  style: { textAlign: 'center', padding: 12, borderRadius: 12, background: earned ? '#0c1631' : '#1e293b', border: '1px solid ' + (earned ? '#0ea5e9' : '#334155'), opacity: earned ? 1 : 0.4 }
                },
                  h('div', { style: { fontSize: 28, marginBottom: 4 } }, badge.icon),
                  h('div', { style: { fontSize: 10, fontWeight: 600, color: earned ? '#e2e8f0' : '#94a3b8' } }, badge.name),
                  h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 2 } }, badge.desc)
                );
              })
            ),
            h('button', { 'aria-label': 'Close',
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
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 20 } },
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
              'aria-label': 'Conversation draft response',
              onChange: function(e) { upd('convoDraft', e.target.value); },
              placeholder: band === 'elementary' ? 'What would you say? Type it here...' : 'Draft your response...',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { 'aria-label': 'Toggle sound',
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

              callGemini && convoDraft.trim().length > 5 && h('button', { 'aria-label': 'ai_practice',
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
            h('button', { 'aria-label': 'Next Scenario',
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
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 20 } },
            'Challenges completed: ' + listenCompleted + ' \u2022 Skill: ' + currentListen.skill
          ),

          // Speaker card
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('div', { style: { width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 } }, '\uD83D\uDDE3\uFE0F'),
              h('span', { style: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 } }, 'Someone says:')
            ),
            h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic', margin: 0 } }, '"' + currentListen.speaker + '"')
          ),

          // Comprehension question
          h('p', { style: { fontSize: 12, fontWeight: 700, color: '#cbd5e1', marginBottom: 12 } }, currentListen.question),

          // Response options
          !listenRevealed && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
            h('button', { 'aria-label': 'Toggle sound',
              onClick: function() { upd({ listenChoice: 'good', listenRevealed: true }); if (soundEnabled) sfxCorrect(); awardXP(10); var nc = listenCompleted + 1; upd('listenCompleted', nc); tryAwardBadge('listen_1'); if (nc >= 5) tryAwardBadge('listen_5'); logPractice('listen', currentListen.skill); },
              style: { padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }
            }, '\uD83D\uDFE2 "' + currentListen.goodResponse + '"'),
            h('button', { 'aria-label': 'Toggle sound',
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
            h('button', { 'aria-label': 'Next Challenge',
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
          h('button', { 'aria-label': 'Learn',
            onClick: function() { upd('blMode', 'learn'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '8px 0 0 8px', border: '1px solid #334155', background: blMode === 'learn' ? '#0ea5e9' : '#1e293b', color: blMode === 'learn' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83D\uDCDA Learn'),
          h('button', { 'aria-label': 'Quiz',
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
                  h('button', { 'aria-label': 'Toggle sound',
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
                    h('span', { style: { color: '#94a3b8', fontSize: 14 } }, isExpanded ? '\u25B2' : '\u25BC')
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
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
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
            h('p', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 20 } },
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
                    return h('button', { 'aria-label': 'Toggle sound',
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
                  h('button', { 'aria-label': 'Next Question',
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
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 20 } },
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
              return h('button', { 'aria-label': 'Toggle sound',
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
                    background: (colorMap[choice.quality] || '#94a3b8') + '10',
                    border: '2px solid ' + (isChosen ? (colorMap[choice.quality] || '#94a3b8') : (colorMap[choice.quality] || '#94a3b8') + '33'),
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
            h('button', { 'aria-label': 'Next Scenario',
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
                h('button', { 'aria-label': 'Toggle sound',
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
                  h('span', { style: { color: '#94a3b8', fontSize: 14 } }, isExpanded ? '\u25B2' : '\u25BC')
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
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
            Object.keys(friendViewed).length + '/' + FRIENDSHIP_SKILLS.length + ' skill areas explored'
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Conversation Simulator ──
      // ══════════════════════════════════════════════════════════
      var simContent = null;
      if (activeTab === 'sim') {
        var simScenarios = CONVO_SIMULATOR[band] || CONVO_SIMULATOR.elementary;
        var currentSim = simScenarios[simIdx % simScenarios.length];
        var currentBranch = currentSim.branches[simStep] || null;

        var simHeader = h('div', { style: { padding: 20, maxWidth: 580, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            '\uD83C\uDFAC Conversation Simulator'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Practice real conversations step by step! Pick what you\u2019d say.' :
            band === 'middle' ? 'Navigate branching conversations. Every choice matters.' :
            'Practice high-stakes conversations with branching dialogue trees.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Simulations completed: ' + simCompleted + ' \u2022 Scenario ' + ((simIdx % simScenarios.length) + 1) + '/' + simScenarios.length
          )
        );

        var simBody;
        if (simDone) {
          // Summary screen
          var summaryItems = simChoices.map(function(ch, ci) {
            var br = currentSim.branches[ci];
            var opt = br ? br.options[ch] : null;
            var effColor = !opt ? '#94a3b8' : opt.effectiveness === 'strong' ? '#22c55e' : opt.effectiveness === 'moderate' ? '#f59e0b' : '#ef4444';
            var effLabel = !opt ? '?' : opt.effectiveness === 'strong' ? '\u2B50 Strong' : opt.effectiveness === 'moderate' ? '\uD83D\uDFE1 Moderate' : '\uD83D\uDD34 Needs Work';
            return h('div', { key: ci, style: { padding: '12px 14px', borderRadius: 12, background: effColor + '10', border: '1px solid ' + effColor + '33', marginBottom: 8 } },
              h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
                h('span', { style: { fontSize: 11, fontWeight: 700, color: effColor } }, effLabel),
                h('span', { style: { fontSize: 10, color: '#94a3b8' } }, 'Tone: ' + (opt ? opt.tone : '?'))
              ),
              h('p', { style: { fontSize: 12, color: '#e2e8f0', margin: '0 0 4px', lineHeight: 1.4 } }, opt ? opt.text : ''),
              h('p', { style: { fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic' } }, opt ? opt.feedback : '')
            );
          });

          var strongCount = simChoices.reduce(function(count, ch, ci) {
            var br = currentSim.branches[ci];
            var opt = br ? br.options[ch] : null;
            return count + (opt && opt.effectiveness === 'strong' ? 1 : 0);
          }, 0);

          simBody = h('div', { style: { padding: '0 20px 20px', maxWidth: 580, margin: '0 auto' } },
            h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #0ea5e944', marginBottom: 16 } },
              h('div', { style: { fontSize: 40, marginBottom: 8 } }, strongCount >= 3 ? '\uD83C\uDF1F' : strongCount >= 2 ? '\uD83D\uDC4D' : '\uD83D\uDCAA'),
              h('h4', { style: { color: '#f1f5f9', margin: '0 0 4px', fontSize: 16 } }, 'Conversation Complete!'),
              h('p', { style: { color: '#94a3b8', fontSize: 12, margin: 0 } }, strongCount + '/' + currentSim.branches.length + ' strong responses')
            ),
            h('div', null, summaryItems),
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                upd({ simIdx: simIdx + 1, simStep: 0, simChoices: [], simDone: false });
              },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', marginTop: 8 }
            }, 'Next Scenario \u2192')
          );
        } else if (currentBranch) {
          simBody = h('div', { style: { padding: '0 20px 20px', maxWidth: 580, margin: '0 auto' } },
            // Scene card
            h('div', { style: { padding: 18, borderRadius: 14, background: '#0f172a', border: '1px solid #8b5cf644', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 } }, currentSim.title),
              h('p', { style: { fontSize: 13, color: '#cbd5e1', lineHeight: 1.5, marginBottom: 0 } }, currentSim.scene)
            ),
            // Step progress
            h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 16 } },
              currentSim.branches.map(function(_, bi) {
                var isDone = bi < simStep;
                var isCurrent = bi === simStep;
                return h('div', { key: bi, style: {
                  width: isCurrent ? 28 : 10, height: 10, borderRadius: 5,
                  background: isDone ? '#22c55e' : isCurrent ? '#0ea5e9' : '#334155',
                  transition: 'all 0.3s'
                }});
              })
            ),
            // Prompt
            h('p', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 12, textAlign: 'center' } }, currentBranch.prompt),
            // Options
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              currentBranch.options.map(function(opt, oi) {
                return h('button', { 'aria-label': 'Toggle sound',
                  key: oi,
                  onClick: function() {
                    var newChoices = simChoices.concat([oi]);
                    var nextStep = simStep + 1;
                    if (soundEnabled) {
                      if (opt.effectiveness === 'strong') sfxCorrect();
                      else if (opt.effectiveness === 'moderate') sfxReveal();
                      else sfxWrong();
                    }
                    awardXP(opt.effectiveness === 'strong' ? 10 : opt.effectiveness === 'moderate' ? 5 : 2);
                    logPractice('sim', currentSim.id);

                    if (nextStep >= currentSim.branches.length) {
                      var nc = simCompleted + 1;
                      upd({ simChoices: newChoices, simStep: nextStep, simDone: true, simCompleted: nc });
                      tryAwardBadge('sim_convo_1');
                      if (nc >= 3) tryAwardBadge('sim_convo_3');
                    } else {
                      upd({ simChoices: newChoices, simStep: nextStep });
                    }
                  },
                  style: { padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }
                }, opt.text);
              })
            )
          );
        } else {
          simBody = h('div', { style: { padding: 20, textAlign: 'center', color: '#94a3b8' } }, 'Loading scenario...');
        }

        simContent = h('div', null, simHeader, simBody);
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Body Language Reader ──
      // ══════════════════════════════════════════════════════════
      var blReaderContent = null;
      if (activeTab === 'blReader') {
        var blrCues = BODY_LANG_READER[band] || BODY_LANG_READER.elementary;
        var blrQuizData = BL_READER_QUIZ[band] || BL_READER_QUIZ.elementary;

        var blrToggle = h('div', { style: { display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 16 } },
          h('button', { 'aria-label': 'Study Cues',
            onClick: function() { upd('blrMode', 'study'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '8px 0 0 8px', border: '1px solid #334155', background: blrMode === 'study' ? '#8b5cf6' : '#1e293b', color: blrMode === 'study' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83D\uDCDA Study Cues'),
          h('button', { 'aria-label': 'Matching Quiz',
            onClick: function() { upd('blrMode', 'quiz'); if (soundEnabled) sfxClick(); },
            style: { padding: '6px 18px', borderRadius: '0 8px 8px 0', border: '1px solid #334155', background: blrMode === 'quiz' ? '#f59e0b' : '#1e293b', color: blrMode === 'quiz' ? '#fff' : '#94a3b8', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
          }, '\uD83E\uDDE9 Matching Quiz')
        );

        if (blrMode === 'study') {
          blReaderContent = h('div', { style: { padding: 20, maxWidth: 600, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
              '\uD83D\uDD75\uFE0F Body Language Reader'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
              band === 'elementary' ? 'Learn what people\u2019s bodies are telling you!' :
              band === 'middle' ? 'Decode non-verbal cues to understand what people really mean.' :
              'Advanced non-verbal communication: cultural context, professional signals, and micro-expressions.'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
              Object.keys(blrStudied).length + '/' + blrCues.length + ' cues studied'
            ),
            blrToggle,
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
              blrCues.map(function(cue) {
                var isExp = blrExpanded === cue.id;
                var isStudied = blrStudied[cue.id];
                return h('div', { key: cue.id, style: { borderRadius: 14, border: '1px solid ' + (isExp ? '#8b5cf666' : '#334155'), background: isExp ? '#8b5cf608' : '#1e293b', overflow: 'hidden' } },
                  h('button', { 'aria-label': 'Toggle sound',
                    onClick: function() {
                      var newExp = isExp ? null : cue.id;
                      upd('blrExpanded', newExp);
                      if (!isStudied && newExp) {
                        var ns = Object.assign({}, blrStudied);
                        ns[cue.id] = true;
                        upd('blrStudied', ns);
                        awardXP(5);
                        if (Object.keys(ns).length >= 3) tryAwardBadge('bl_reader_3');
                      }
                      if (soundEnabled) sfxClick();
                      logPractice('blReader', cue.id);
                    },
                    style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#f1f5f9' }
                  },
                    h('span', { style: { fontSize: 26, flexShrink: 0 } }, cue.emoji),
                    h('div', { style: { flex: 1 } },
                      h('div', { style: { display: 'flex', alignItems: 'center', gap: 6 } },
                        h('span', { style: { fontWeight: 700, fontSize: 13, color: isExp ? '#a78bfa' : '#f1f5f9' } }, cue.cue),
                        isStudied && h('span', { style: { fontSize: 10, color: '#22c55e' } }, '\u2713')
                      )
                    ),
                    h('span', { style: { color: '#94a3b8', fontSize: 14 } }, isExp ? '\u25B2' : '\u25BC')
                  ),
                  isExp && h('div', { style: { padding: '0 16px 16px', borderTop: '1px solid #334155' } },
                    h('div', { style: { marginTop: 12, padding: '10px 14px', borderRadius: 10, background: '#0ea5e910', marginBottom: 8 } },
                      h('p', { style: { fontSize: 10, fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', marginBottom: 4 } }, 'What it means'),
                      h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, margin: 0 } }, cue.meaning)
                    ),
                    h('div', { style: { padding: '10px 14px', borderRadius: 10, background: '#22c55e10' } },
                      h('p', { style: { fontSize: 10, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', marginBottom: 4 } }, 'How to respond'),
                      h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.5, margin: 0 } }, cue.tip)
                    )
                  )
                );
              })
            )
          );
        } else {
          // Quiz mode
          var blrQ = blrQuizData[blrQuizIdx % blrQuizData.length];
          var blrCueMap = {};
          blrCues.forEach(function(c) { blrCueMap[c.id] = c; });

          blReaderContent = h('div', { style: { padding: 20, maxWidth: 500, margin: '0 auto', textAlign: 'center' } },
            h('h3', { style: { color: '#f1f5f9', fontSize: 18, marginBottom: 4 } }, '\uD83E\uDDE9 Body Language Matching Quiz'),
            h('p', { style: { color: '#94a3b8', fontSize: 12, marginBottom: 4 } }, 'Match the scenario to the body language cue!'),
            blrToggle,
            h('p', { style: { color: '#94a3b8', fontSize: 11, marginBottom: 16 } }, 'Score: ' + blrQuizScore + '/' + blrQuizTotal),
            h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid #8b5cf644', marginBottom: 16 } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 } }, 'Scenario'),
              h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic' } }, blrQ.cue)
            ),
            !blrQuizShow
              ? h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 } },
                  blrQ.options.map(function(optId) {
                    var c = blrCueMap[optId];
                    return h('button', { 'aria-label': 'Toggle sound',
                      key: optId,
                      onClick: function() {
                        var correct = optId === blrQ.answer;
                        var ns = correct ? blrQuizScore + 1 : blrQuizScore;
                        upd({ blrQuizAnswer: optId, blrQuizShow: true, blrQuizTotal: blrQuizTotal + 1, blrQuizScore: ns });
                        if (correct) { if (soundEnabled) sfxCorrect(); awardXP(5); if (ns >= 5) tryAwardBadge('bl_reader_quiz'); }
                        else { if (soundEnabled) sfxWrong(); }
                        logPractice('blr_quiz', optId);
                      },
                      style: { padding: '10px 8px', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }
                    }, c ? c.emoji : '', ' ', c ? c.cue : optId);
                  })
                )
              : h('div', null,
                  h('div', { style: { padding: 16, borderRadius: 14, marginBottom: 12, background: blrQuizAnswer === blrQ.answer ? '#22c55e18' : '#ef444418', border: '1px solid ' + (blrQuizAnswer === blrQ.answer ? '#22c55e44' : '#ef444444') } },
                    h('p', { style: { fontSize: 16, fontWeight: 700, color: blrQuizAnswer === blrQ.answer ? '#22c55e' : '#ef4444' } },
                      blrQuizAnswer === blrQ.answer ? '\u2705 Correct!' : 'Not quite!'
                    ),
                    blrQuizAnswer !== blrQ.answer && h('p', { style: { fontSize: 13, color: '#94a3b8' } },
                      'The answer was: ' + (blrCueMap[blrQ.answer] ? blrCueMap[blrQ.answer].cue : blrQ.answer)
                    ),
                    blrCueMap[blrQ.answer] && h('p', { style: { fontSize: 12, color: '#cbd5e1', marginTop: 8, lineHeight: 1.5 } },
                      blrCueMap[blrQ.answer].meaning
                    )
                  ),
                  h('button', { 'aria-label': 'Next Question',
                    onClick: function() { upd({ blrQuizIdx: blrQuizIdx + 1, blrQuizAnswer: null, blrQuizShow: false }); },
                    style: { padding: '12px 32px', borderRadius: 10, border: 'none', background: '#f59e0b', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
                  }, 'Next Question \u2192')
                )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Active Listening Deep Challenge ──
      // ══════════════════════════════════════════════════════════
      var listenDeepContent = null;
      if (activeTab === 'listenDeep') {
        var ldScenarios = LISTEN_DEEP[band] || LISTEN_DEEP.elementary;
        var currentLd = ldScenarios[ldIdx % ldScenarios.length];

        listenDeepContent = h('div', { style: { padding: 20, maxWidth: 560, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
            '\uD83C\uDFA7 Active Listening Challenge'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 4 } },
            band === 'elementary' ? 'Someone is talking to you. Show them you REALLY heard them!' :
            band === 'middle' ? 'Practice paraphrasing, reflecting, clarifying, and summarizing.' :
            'Develop advanced active listening: hold complexity, name subtext, and create safety.'
          ),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } },
            'Completed: ' + ldCompleted + ' \u2022 Skill: ' + currentLd.skill.charAt(0).toUpperCase() + currentLd.skill.slice(1)
          ),

          // Speaker card
          h('div', { style: { padding: 18, borderRadius: 14, background: '#0f172a', border: '1px solid #334155', marginBottom: 14 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('div', { style: { width: 36, height: 36, borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 } }, currentLd.emoji),
              h('span', { style: { fontSize: 12, color: '#e2e8f0', fontWeight: 700 } }, currentLd.speaker + ' says:')
            ),
            h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.6, fontStyle: 'italic', margin: 0 } }, '"' + currentLd.text + '"')
          ),

          // Skill tag
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 } },
            h('span', { style: { padding: '4px 12px', borderRadius: 20, background: '#0ea5e918', border: '1px solid #0ea5e944', fontSize: 11, color: '#38bdf8', fontWeight: 700 } },
              '\uD83C\uDFAF Skill: ' + currentLd.skill.charAt(0).toUpperCase() + currentLd.skill.slice(1)
            )
          ),

          // Prompt
          h('p', { style: { fontSize: 13, fontWeight: 600, color: '#cbd5e1', marginBottom: 10, textAlign: 'center' } }, currentLd.prompt),

          // Good starters hint
          !ldRevealed && h('div', { style: { marginBottom: 10, padding: '8px 12px', borderRadius: 8, background: '#22c55e08', border: '1px solid #22c55e22' } },
            h('p', { style: { fontSize: 10, color: '#22c55e', fontWeight: 700, marginBottom: 2 } }, '\uD83D\uDCA1 Try starting with:'),
            h('p', { style: { fontSize: 11, color: '#94a3b8', margin: 0 } }, currentLd.goodStarters.join('  \u2022  '))
          ),

          // Input
          !ldRevealed && h('div', null,
            h('textarea', {
              value: ldDraft,
              'aria-label': 'Listening practice response',
              onChange: function(e) { upd('ldDraft', e.target.value); },
              placeholder: currentLd.skill === 'paraphrase' ? 'Restate what they said in your own words...' :
                           currentLd.skill === 'reflect' ? 'Reflect back the feelings you hear...' :
                           currentLd.skill === 'clarify' ? 'Ask a clarifying question...' :
                           'Summarize the main points and feelings...',
              rows: 3,
              style: { width: '100%', padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 10 }
            }),
            h('div', { style: { display: 'flex', gap: 8 } },
              h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  upd('ldRevealed', true);
                  var nc = ldCompleted + 1;
                  upd('ldCompleted', nc);
                  var newSkills = Object.assign({}, ldSkillsDone);
                  newSkills[currentLd.skill] = true;
                  upd('ldSkillsDone', newSkills);
                  if (soundEnabled) sfxReveal();
                  awardXP(10);
                  tryAwardBadge('deep_listen_1');
                  if (Object.keys(newSkills).length >= 4) tryAwardBadge('deep_listen_all');
                  logPractice('listenDeep', currentLd.skill);
                },
                style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
              }, '\u2705 Submit'),

              callGemini && ldDraft.trim().length > 5 && h('button', { 'aria-label': 'summarize the key points and emotions',
                onClick: function() {
                  upd('ldAiLoading', true);
                  var aiPrompt = 'You are an active listening coach for a ' + band + ' school student. They heard this from a peer named ' + currentLd.speaker + ':\n\n"' + currentLd.text + '"\n\nThe listening skill being practiced is: ' + currentLd.skill + '\n\nThe student responded: "' + ldDraft + '"\n\nIn 2-3 sentences, evaluate their response. Did they successfully ' +
                    (currentLd.skill === 'paraphrase' ? 'paraphrase (restate in own words)' :
                     currentLd.skill === 'reflect' ? 'reflect emotions (name what the speaker is feeling)' :
                     currentLd.skill === 'clarify' ? 'ask a good clarifying question' :
                     'summarize the key points and emotions') +
                    '? What was strong? How could they go deeper? ' +
                    (band === 'elementary' ? 'Use warm, encouraging language.' : 'Be specific and constructive.') +
                    ' Never be harsh.';
                  callGemini(aiPrompt).then(function(resp) {
                    upd({ ldAiResp: resp, ldAiLoading: false, ldRevealed: true });
                    var nc2 = ldCompleted + 1;
                    upd('ldCompleted', nc2);
                    var newSkills2 = Object.assign({}, ldSkillsDone);
                    newSkills2[currentLd.skill] = true;
                    upd('ldSkillsDone', newSkills2);
                    if (soundEnabled) sfxReveal();
                    awardXP(15);
                    tryAwardBadge('deep_listen_1');
                    if (Object.keys(newSkills2).length >= 4) tryAwardBadge('deep_listen_all');
                    logPractice('listenDeep', currentLd.skill + '_ai');
                  }).catch(function() {
                    upd({ ldAiResp: 'Great effort practicing active listening! Keep building this skill.', ldAiLoading: false, ldRevealed: true });
                  });
                },
                disabled: ldAiLoading,
                style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#8b5cf6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: ldAiLoading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }
              },
                Sparkles ? h(Sparkles, { size: 14 }) : '\u2728',
                ldAiLoading ? 'Evaluating...' : 'AI Evaluate'
              )
            )
          ),

          // Revealed
          ldRevealed && h('div', null,
            ldAiResp && h('div', { style: { padding: 16, borderRadius: 14, background: '#8b5cf618', border: '1px solid #8b5cf644', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#a78bfa', fontWeight: 700, marginBottom: 6 } }, '\u2728 AI Listening Coach'),
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6 } }, ldAiResp)
            ),

            h('div', { style: { padding: 14, borderRadius: 14, background: '#0ea5e912', border: '1px solid #0ea5e944', marginBottom: 12 } },
              h('p', { style: { fontSize: 11, fontWeight: 700, color: '#38bdf8', marginBottom: 6 } }, '\uD83C\uDFAF What great ' + currentLd.skill + ' looks like:'),
              h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.5, margin: 0 } },
                currentLd.skill === 'paraphrase' ? 'Good paraphrasing restates the KEY facts and feelings in YOUR words \u2014 not a word-for-word repeat.' :
                currentLd.skill === 'reflect' ? 'Strong reflections NAME the emotion and connect it to the situation: "You feel [X] because [Y]."' :
                currentLd.skill === 'clarify' ? 'Effective clarifying questions are open-ended and help the speaker explore their own thinking more deeply.' :
                'Great summaries capture both WHAT happened and HOW the person feels about it, in a concise way.'
              )
            ),

            // Skills practiced tracker
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16, flexWrap: 'wrap' } },
              ['paraphrase', 'reflect', 'clarify', 'summarize'].map(function(sk) {
                var done = ldSkillsDone[sk];
                return h('span', { key: sk, style: {
                  padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: done ? '#22c55e18' : '#334155',
                  color: done ? '#22c55e' : '#94a3b8',
                  border: '1px solid ' + (done ? '#22c55e44' : '#33415588')
                }}, (done ? '\u2713 ' : '') + sk.charAt(0).toUpperCase() + sk.slice(1));
              })
            ),

            h('button', { 'aria-label': 'Next Challenge',
              onClick: function() { upd({ ldIdx: ldIdx + 1, ldDraft: '', ldRevealed: false, ldAiResp: null }); },
              style: { width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
            }, 'Next Challenge \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Friendship Health Check ──
      // ══════════════════════════════════════════════════════════
      var healthChkContent = null;
      if (activeTab === 'healthChk') {
        var fhStatements = FRIEND_HEALTH_STATEMENTS[band] || FRIEND_HEALTH_STATEMENTS.elementary;

        if (!fhShowResults) {
          // Assessment form
          var allAnswered = fhStatements.every(function(st) { return fhAnswers[st.id] != null; });
          healthChkContent = h('div', { style: { padding: 20, maxWidth: 560, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } },
              '\uD83E\uDE7A Friendship Health Check'
            ),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 20 } },
              band === 'elementary' ? 'How good of a friend are you? Be honest \u2014 there are no wrong answers!' :
              band === 'middle' ? 'Rate yourself honestly on these friendship skills. Self-awareness is the first step to growth.' :
              'Assess your relational competencies. Honesty with yourself is the highest form of social intelligence.'
            ),

            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              fhStatements.map(function(st, si) {
                var answer = fhAnswers[st.id];
                return h('div', { key: st.id, style: { padding: '14px 16px', borderRadius: 14, background: '#1e293b', border: '1px solid #334155' } },
                  h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 } },
                    h('span', { style: { fontSize: 20, flexShrink: 0 } }, st.icon),
                    h('p', { style: { fontSize: 13, color: '#f1f5f9', margin: 0, lineHeight: 1.5 } }, st.text)
                  ),
                  h('div', { style: { display: 'flex', gap: 6 } },
                    ['agree', 'sometimes', 'disagree'].map(function(val) {
                      var selected = answer === val;
                      var colors = { agree: '#22c55e', sometimes: '#f59e0b', disagree: '#ef4444' };
                      var labels = { agree: '\u2705 Agree', sometimes: '\uD83D\uDFE1 Sometimes', disagree: '\u274C Disagree' };
                      return h('button', { 'aria-label': 'Toggle sound',
                        key: val,
                        onClick: function() {
                          var newAns = Object.assign({}, fhAnswers);
                          newAns[st.id] = val;
                          upd('fhAnswers', newAns);
                          if (soundEnabled) sfxClick();
                        },
                        style: {
                          flex: 1, padding: '8px 4px', borderRadius: 8,
                          border: '1px solid ' + (selected ? colors[val] : '#334155'),
                          background: selected ? colors[val] + '18' : 'transparent',
                          color: selected ? colors[val] : '#94a3b8',
                          fontWeight: selected ? 700 : 500, fontSize: 11, cursor: 'pointer'
                        }
                      }, labels[val]);
                    })
                  )
                );
              })
            ),

            allAnswered && h('button', { 'aria-label': 'Toggle sound',
              onClick: function() {
                upd('fhShowResults', true);
                upd('fhDone', true);
                if (soundEnabled) sfxBadge();
                awardXP(20);
                tryAwardBadge('health_check');
                logPractice('healthChk', 'completed');
              },
              style: { width: '100%', marginTop: 16, padding: '14px 0', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #0ea5e9, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer' }
            }, '\uD83E\uDE7A See My Results'),

            !allAnswered && h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginTop: 12 } },
              (fhStatements.length - Object.keys(fhAnswers).length) + ' questions remaining'
            )
          );
        } else {
          // Results view
          var strengths = [];
          var growthAreas = [];
          fhStatements.forEach(function(st) {
            var ans = fhAnswers[st.id];
            if (ans === 'agree') strengths.push(st);
            else growthAreas.push(st);
          });

          var scoreTotal = fhStatements.reduce(function(sum, st) {
            var ans = fhAnswers[st.id];
            return sum + (ans === 'agree' ? 3 : ans === 'sometimes' ? 2 : 1);
          }, 0);
          var maxScore = fhStatements.length * 3;
          var pct = Math.round(scoreTotal / maxScore * 100);
          var rating = pct >= 80 ? 'Amazing Friend' : pct >= 60 ? 'Good Friend Growing' : pct >= 40 ? 'Building Skills' : 'Just Getting Started';
          var ratingEmoji = pct >= 80 ? '\uD83C\uDF1F' : pct >= 60 ? '\uD83D\uDC4D' : pct >= 40 ? '\uD83C\uDF31' : '\uD83D\uDCAA';

          healthChkContent = h('div', { style: { padding: 20, maxWidth: 560, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83E\uDE7A Your Friendship Health Results'),

            // Score overview
            h('div', { style: { textAlign: 'center', padding: 24, borderRadius: 16, background: '#0f172a', border: '1px solid #0ea5e944', marginBottom: 20 } },
              h('div', { style: { fontSize: 48, marginBottom: 8 } }, ratingEmoji),
              h('h4', { style: { color: '#f1f5f9', margin: '0 0 4px', fontSize: 18 } }, rating),
              h('p', { style: { color: '#94a3b8', fontSize: 13, margin: 0 } }, 'Score: ' + scoreTotal + '/' + maxScore + ' (' + pct + '%)')
            ),

            // Strengths
            strengths.length > 0 && h('div', { style: { marginBottom: 16 } },
              h('h4', { style: { color: '#22c55e', fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 } }, '\u2B50 Your Strengths'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                strengths.map(function(st) {
                  var tip = FRIEND_HEALTH_TIPS[st.area];
                  return h('div', { key: st.id, style: { padding: '10px 14px', borderRadius: 10, background: '#22c55e10', border: '1px solid #22c55e22' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { style: { fontSize: 16 } }, st.icon),
                      h('span', { style: { fontSize: 12, fontWeight: 700, color: '#22c55e' } }, st.text)
                    ),
                    tip && h('p', { style: { fontSize: 11, color: '#94a3b8', margin: 0, fontStyle: 'italic' } }, tip.strength)
                  );
                })
              )
            ),

            // Growth areas
            growthAreas.length > 0 && h('div', { style: { marginBottom: 16 } },
              h('h4', { style: { color: '#f59e0b', fontSize: 14, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 } }, '\uD83C\uDF31 Growth Opportunities'),
              h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
                growthAreas.map(function(st) {
                  var ans = fhAnswers[st.id];
                  var tip = FRIEND_HEALTH_TIPS[st.area];
                  return h('div', { key: st.id, style: { padding: '10px 14px', borderRadius: 10, background: (ans === 'sometimes' ? '#f59e0b' : '#ef4444') + '10', border: '1px solid ' + (ans === 'sometimes' ? '#f59e0b' : '#ef4444') + '22' } },
                    h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 } },
                      h('span', { style: { fontSize: 16 } }, st.icon),
                      h('span', { style: { fontSize: 12, fontWeight: 600, color: '#e2e8f0' } }, st.text),
                      h('span', { style: { fontSize: 10, color: ans === 'sometimes' ? '#f59e0b' : '#ef4444', marginLeft: 'auto' } }, ans === 'sometimes' ? 'Sometimes' : 'Working on it')
                    ),
                    tip && h('p', { style: { fontSize: 11, color: '#38bdf8', margin: 0, lineHeight: 1.4 } }, '\uD83D\uDCA1 ' + tip.growth)
                  );
                })
              )
            ),

            // Action buttons
            h('div', { style: { display: 'flex', gap: 8, marginTop: 8 } },
              h('button', { 'aria-label': 'Retake',
                onClick: function() { upd({ fhAnswers: {}, fhShowResults: false, fhDone: false }); },
                style: { flex: 1, padding: '12px 0', borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#94a3b8', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, '\uD83D\uDD04 Retake'),
              h('button', { 'aria-label': 'Back to Questions',
                onClick: function() { upd('fhShowResults', false); },
                style: { flex: 1, padding: '12px 0', borderRadius: 10, border: 'none', background: '#0ea5e9', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
              }, '\u2190 Back to Questions')
            )
          );
        }
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
            ? h('div', { style: { textAlign: 'center', padding: 40, color: '#94a3b8' } },
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
                    { key: 'sim', label: 'Simulator', emoji: '\uD83C\uDFAC', color: '#a78bfa' },
                    { key: 'listen', label: 'Listening', emoji: '\uD83D\uDC42', color: '#8b5cf6' },
                    { key: 'listenDeep', label: 'Deep Listen', emoji: '\uD83C\uDFA7', color: '#06b6d4' },
                    { key: 'body', label: 'Body Language', emoji: '\uD83D\uDC40', color: '#22c55e' },
                    { key: 'body_quiz', label: 'BL Quiz', emoji: '\uD83E\uDDE9', color: '#f59e0b' },
                    { key: 'blReader', label: 'BL Reader', emoji: '\uD83D\uDD75\uFE0F', color: '#10b981' },
                    { key: 'blr_quiz', label: 'BLR Quiz', emoji: '\uD83C\uDFAF', color: '#d97706' },
                    { key: 'coop', label: 'Cooperation', emoji: '\uD83E\uDD1D', color: '#ec4899' },
                    { key: 'healthChk', label: 'Health Check', emoji: '\uD83E\uDE7A', color: '#f472b6' }
                  ].map(function(typ) {
                    var count = typeCounts[typ.key] || 0;
                    var pct = total > 0 ? (count / total * 100) : 0;
                    return h('div', { key: typ.key, style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } },
                      h('span', { style: { fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 } }, typ.emoji),
                      h('span', { style: { fontSize: 11, color: '#94a3b8', width: 80, flexShrink: 0 } }, typ.label),
                      h('div', { style: { flex: 1, height: 12, borderRadius: 6, background: '#0f172a', overflow: 'hidden' } },
                        h('div', { style: { height: '100%', width: pct + '%', background: typ.color, borderRadius: 6, transition: 'width 0.3s', minWidth: count > 0 ? 4 : 0 } })
                      ),
                      h('span', { style: { fontSize: 11, color: '#94a3b8', width: 24, textAlign: 'right', flexShrink: 0 } }, count)
                    );
                  })
                ),

                // Recent log
                h('div', null,
                  h('p', { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 8 } }, 'Recent Activity'),
                  practiceLog.slice().reverse().slice(0, 8).map(function(entry, i) {
                    var labels = { convo: '\uD83D\uDDE3\uFE0F Conversation', sim: '\uD83C\uDFAC Simulator', listen: '\uD83D\uDC42 Listening', listenDeep: '\uD83C\uDFA7 Deep Listen', body: '\uD83D\uDC40 Body Language', body_quiz: '\uD83E\uDDE9 BL Quiz', blReader: '\uD83D\uDD75\uFE0F BL Reader', blr_quiz: '\uD83C\uDFAF BLR Quiz', coop: '\uD83E\uDD1D Cooperation', healthChk: '\uD83E\uDE7A Health Check' };
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
        simContent,
        listenContent,
        listenDeepContent,
        bodyContent,
        blReaderContent,
        coopContent,
        friendsContent,
        healthChkContent,
        logContent
      );
    }
  });
})();