// ═══════════════════════════════════════════════════════════════
// sel_tool_advocacy.js — Self-Advocacy Workshop Plugin (v2.0)
// Advocacy scenarios, script builder, rights education,
// AI-powered voice practice, self-advocacy practice scripts,
// strength assessment quiz, letter/email template builder.
// Registered tool ID: "advocacy"
// Category: self-management
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
    if (document.getElementById('allo-live-advocacy')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-advocacy';
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
  function sfxResolve() { playTone(262, 0.15, 'sine', 0.06); setTimeout(function() { playTone(330, 0.12, 'sine', 0.06); }, 100); setTimeout(function() { playTone(392, 0.12, 'sine', 0.07); }, 200); setTimeout(function() { playTone(523, 0.2, 'sine', 0.09); }, 320); }

  // ══════════════════════════════════════════════════════════════
  // ── Advocacy Scenarios (branching dialogue) ──
  // 3 response styles: silent, aggressive, assertive
  // ══════════════════════════════════════════════════════════════
  var ADVOCACY_SCENARIOS = {
    elementary: [
      { id: 'ad1', title: 'Needing Help', setup: 'You don\'t understand the math worksheet, but the teacher is busy helping other students. You\'re falling behind and getting frustrated.',
        who: 'Your teacher',
        branches: [
          { label: 'Stay quiet and pretend you understand. Maybe you\'ll figure it out.', style: 'silent', outcome: 'You fall further behind. The teacher doesn\'t know you need help because you never asked. The frustration builds and math gets harder every day.', rating: 1 },
          { label: '"This is stupid! I don\'t get ANY of this! Nobody ever helps ME!"', style: 'aggressive', outcome: 'Your outburst disrupts the class. The teacher addresses your behavior instead of your confusion. You get help eventually, but through conflict instead of communication.', rating: 2 },
          { label: 'Raise your hand and wait. When the teacher comes: "I\'m stuck on this part. Can you show me how to start?"', style: 'assertive', outcome: 'You identified what you needed, asked clearly, and waited respectfully. The teacher helps you right away. Asking for help is a strength.', rating: 3 }
        ] },
      { id: 'ad2', title: 'The Bathroom Emergency', setup: 'You really need to use the bathroom, but when you asked, the teacher said "Not right now, we\'re in the middle of a lesson." It\'s getting urgent.',
        who: 'Your teacher',
        branches: [
          { label: 'Don\'t ask again. Hold it and hope for the best.', style: 'silent', outcome: 'You can\'t focus on anything except your discomfort. You might have an accident, which would be much more embarrassing than asking again.', rating: 1 },
          { label: 'Get up and walk out without permission.', style: 'aggressive', outcome: 'You took care of your need, but breaking rules without communication creates bigger problems. The teacher might give a consequence.', rating: 2 },
          { label: 'Walk up quietly and say: "I understand, but this is really urgent. I promise I\'ll be quick."', style: 'assertive', outcome: 'You acknowledged the teacher\'s concern (lesson time) while clearly stating your urgent need. Most teachers will say yes when they understand it\'s serious.', rating: 3 }
        ] },
      { id: 'ad3', title: 'The Wrong Lunch', setup: 'The cafeteria gave you food that has something you\'re allergic to. The lunch line is long and the cafeteria workers look very busy.',
        who: 'Cafeteria worker',
        branches: [
          { label: 'Just eat what you can and skip the rest. They\'re too busy.', style: 'silent', outcome: 'You go hungry or risk an allergic reaction because you didn\'t want to "bother" anyone. Your health matters more than their convenience.', rating: 1 },
          { label: '"This isn\'t right! I can\'t eat this! Don\'t you READ the allergy list?!"', style: 'aggressive', outcome: 'You got attention but made the worker defensive. They might fix it, but the hostile tone makes future interactions harder.', rating: 2 },
          { label: '"Excuse me, I have an allergy to [food]. Could I please get a different option?"', style: 'assertive', outcome: 'You stated the problem clearly and calmly. Allergy needs are serious and you have every right to safe food. Clear communication gets faster results.', rating: 3 }
        ] },
      { id: 'ad4', title: 'Can\'t See the Board', setup: 'You\'ve been squinting at the board for weeks. You can\'t read what the teacher writes, but you don\'t want to seem different.',
        who: 'Your teacher / parent',
        branches: [
          { label: 'Keep squinting. Maybe it\'ll get better on its own.', style: 'silent', outcome: 'It won\'t get better on its own. You fall behind because you can\'t see the material. A simple fix (glasses, closer seat) could change everything.', rating: 1 },
          { label: '"I can\'t see ANYTHING from back here! Why did you put me so far away?"', style: 'aggressive', outcome: 'You blamed the teacher for something they didn\'t know about. They might move you, but the approach created unnecessary tension.', rating: 2 },
          { label: 'Tell your teacher privately: "I\'m having trouble seeing the board. Could I sit closer, or could you make the writing a little bigger?"', style: 'assertive', outcome: 'You identified the problem, proposed a solution, and asked privately so you wouldn\'t feel embarrassed. That\'s excellent self-advocacy.', rating: 3 }
        ] },
      { id: 'ad5', title: 'The Headache', setup: 'You have a really bad headache during class. The last time you asked to go to the nurse, a classmate called you a "faker." You\'re worried about what they\'ll say.',
        who: 'Your teacher / the nurse',
        branches: [
          { label: 'Stay quiet. You don\'t want to be called a faker again.', style: 'silent', outcome: 'You suffer in silence because of one person\'s opinion. Your health matters more than avoiding a bully\'s comment.', rating: 1 },
          { label: 'Announce loudly: "I have a TERRIBLE headache and I NEED to go to the nurse RIGHT NOW."', style: 'aggressive', outcome: 'Making it dramatic invites more attention and comments. You\'ll probably get to go, but you made it harder on yourself.', rating: 2 },
          { label: 'Walk to the teacher\'s desk and say quietly: "I have a bad headache. May I go to the nurse?"', style: 'assertive', outcome: 'You asked privately so no one else needed to be involved. Simple, direct, and takes care of your health. What anyone else thinks about it is their problem.', rating: 3 }
        ] },
      { id: 'ad6', title: 'Invisible in the Group', setup: 'Your teacher put you in a group project, but the other kids are making all the decisions without including you. When you try to share an idea, they ignore you.',
        who: 'Group members / teacher',
        branches: [
          { label: 'Stop trying. Just sit quietly and let them do everything.', style: 'silent', outcome: 'You\'re invisible and you don\'t learn anything. You also don\'t get credit for work that isn\'t yours. Silence isn\'t safety here.', rating: 1 },
          { label: '"You guys are being SO RUDE! I\'m telling the teacher you won\'t let me help!"', style: 'aggressive', outcome: 'Threatening to tattle escalates instead of solving. The group gets defensive and the dynamic gets worse.', rating: 2 },
          { label: 'Say firmly to the group: "I have an idea for this part. Can I share it?" If ignored again, tell the teacher privately: "My group isn\'t including me. Can you help?"', style: 'assertive', outcome: 'You tried direct communication first, then escalated to the right person when it didn\'t work. That\'s a two-step advocacy move: try yourself, then get support.', rating: 3 }
        ] },
      { id: 'ad19', title: 'The Substitute Surprise', setup: 'There\'s a substitute teacher today who doesn\'t know about your special seating arrangement. She told you to sit in the back, but you need to sit near the front because of your vision.',
        who: 'Substitute teacher',
        branches: [
          { label: 'Sit in the back. It\'s only one day.', style: 'silent', outcome: 'You can\'t see all day. You miss important information. One day of silence becomes a pattern of not speaking up.', rating: 1 },
          { label: '"My REAL teacher lets me sit in front! You can\'t make me move!"', style: 'aggressive', outcome: 'Comparing the sub to the regular teacher makes them defensive. They don\'t know you and now the interaction is hostile.', rating: 2 },
          { label: '"I have a seating arrangement because I need to be closer to see. My regular teacher set it up. Can I show you?"', style: 'assertive', outcome: 'You explained WHY without being rude. Offering to show evidence (a note, the seating chart) gives the sub something to verify. Perfect advocacy.', rating: 3 }
        ] },
      { id: 'ad20', title: 'The Sensory Overload', setup: 'The fire alarm drill was really loud and now your ears hurt and you feel overwhelmed. Class is starting again but you can\'t calm down.',
        who: 'Your teacher',
        branches: [
          { label: 'Put your head down and try to tough it out.', style: 'silent', outcome: 'You\'re suffering in silence when a simple accommodation could help. Your body is telling you something \u2014 listen to it.', rating: 1 },
          { label: 'Cover your ears and cry: "I CAN\'T do this! It\'s too loud! I need to leave!"', style: 'aggressive', outcome: 'Your distress is real, but an uncontrolled reaction might be seen as a behavior problem instead of a sensory need.', rating: 2 },
          { label: 'Go to the teacher and say: "The fire alarm really affected me. I need a few minutes in a quiet space to calm down before I can learn."', style: 'assertive', outcome: 'You named the trigger, described the impact, stated your need, and connected it to learning. That\'s self-advocacy AND self-regulation working together.', rating: 3 }
        ] },
      { id: 'ad25', title: 'The Wrong Grade on Your Paper', setup: 'You got your spelling test back and it says you got a 60, but when you count the answers, you actually got an 80. The teacher already moved on to the next lesson.',
        who: 'Your teacher',
        branches: [
          { label: 'Accept the 60. The teacher is always right.', style: 'silent', outcome: 'You accepted a grade that isn\'t yours. Mistakes happen \u2014 even teachers make them. Your real score matters.', rating: 1 },
          { label: '"You graded my test WRONG! I don\'t have a 60! You need to fix this NOW!"', style: 'aggressive', outcome: 'You\'re right that it\'s wrong, but shouting during class embarrasses the teacher and makes them defensive instead of helpful.', rating: 2 },
          { label: 'Wait for a break, then go to the teacher quietly: "I counted my answers and I think there might be a mistake on my grade. Could we look at it together?"', style: 'assertive', outcome: 'You chose the right time, used polite language, and invited collaboration. Teachers appreciate students who catch errors respectfully.', rating: 3 }
        ] },
      { id: 'ad26', title: 'The Friend Who Won\'t Share', setup: 'You\'re working on an art project and need the blue paint. Another student has been holding it for 15 minutes and won\'t pass it even though you asked.',
        who: 'Your classmate / teacher',
        branches: [
          { label: 'Use a different color. It\'s not worth the fight.', style: 'silent', outcome: 'You changed your whole project to avoid conflict. Sometimes compromise is fine, but you deserve access to shared materials too.', rating: 1 },
          { label: 'Grab the paint from them: "You\'ve had it forever! It\'s MY turn!"', style: 'aggressive', outcome: 'Taking things from people escalates conflict. Now it\'s a fight over paint instead of a sharing problem.', rating: 2 },
          { label: 'Say: "I need the blue paint too. Can we take turns? I\'ll give it back in five minutes." If they still refuse, ask the teacher: "We need help sharing materials."', style: 'assertive', outcome: 'You proposed a fair solution first, then asked for adult help when peer negotiation failed. That\'s a two-step advocacy skill.', rating: 3 }
        ] },
      { id: 'ad27', title: 'Feeling Sick at School', setup: 'Your stomach really hurts and you feel like you might throw up, but the last time you went to the nurse, your mom said you were faking to get out of school.',
        who: 'Your teacher / nurse',
        branches: [
          { label: 'Stay at your desk. Nobody believes you anyway.', style: 'silent', outcome: 'You could get sicker or have an accident because a past experience made you afraid to speak up. Your body is real even when others doubt it.', rating: 1 },
          { label: 'Start crying loudly until someone notices.', style: 'aggressive', outcome: 'The distress gets attention but not the right kind. People focus on the crying instead of the sickness.', rating: 2 },
          { label: 'Tell the teacher quietly: "I feel really sick to my stomach. I think I need to go to the nurse." Be specific about what hurts and when it started.', style: 'assertive', outcome: 'Being specific helps adults take you seriously. If your mom doubts you, the nurse\'s assessment is evidence that you were genuinely ill.', rating: 3 }
        ] },
      { id: 'ad28', title: 'Someone Cuts in Line', setup: 'You\'ve been waiting in the lunch line for five minutes. A bigger kid pushes in front of you and acts like nothing happened. Other kids behind you are watching.',
        who: 'The student / lunch monitor',
        branches: [
          { label: 'Let them go. They\'re bigger than you and it\'s not worth it.', style: 'silent', outcome: 'Avoiding conflict because of a size difference teaches you that bigger people get what they want. That\'s not a rule you have to accept.', rating: 1 },
          { label: 'Push them back: "Hey! I was HERE FIRST! Get to the back!"', style: 'aggressive', outcome: 'Physical response gets you in trouble, even though you were right. Now YOU might be the one getting a consequence.', rating: 2 },
          { label: 'Say calmly: "I was in line here. The back of the line is over there." If they don\'t move, tell the lunch monitor: "Someone cut in front of me."', style: 'assertive', outcome: 'You stated the fact without emotion, gave them a chance to self-correct, and had a backup plan. Smart advocacy in a tricky situation.', rating: 3 }
        ] },
      { id: 'ad29', title: 'Too Shy to Ask for Help', setup: 'You don\'t understand the directions for the homework, but every time you think about raising your hand, your heart beats fast and your face feels hot. You\'re too shy to ask in front of everyone.',
        who: 'Your teacher / yourself',
        branches: [
          { label: 'Don\'t do the homework. You\'ll get a zero but at least you didn\'t embarrass yourself.', style: 'silent', outcome: 'A zero hurts your grade and doesn\'t solve the confusion. The embarrassment you\'re imagining is almost always worse than the reality.', rating: 1 },
          { label: 'Blurt out: "I DON\'T GET IT!" from your seat.', style: 'aggressive', outcome: 'This might get you help, but it was the thing you were afraid of \u2014 everyone looking at you. There are quieter ways.', rating: 2 },
          { label: 'Write a note to the teacher: "I don\'t understand the directions. Can you help me privately?" Or go up during a work time and ask quietly at their desk.', style: 'assertive', outcome: 'You found a way to get help that works for YOUR comfort level. Writing it down, asking privately, or emailing are all valid advocacy methods. You don\'t have to raise your hand to ask for help.', rating: 3 }
        ] }
    ],
    middle: [
      { id: 'ad7', title: 'The Missing Accommodation', setup: 'Your IEP says you get extra time on tests. But your new teacher doesn\'t have it set up and the test starts in 5 minutes. Other students are getting ready.',
        who: 'Your new teacher',
        branches: [
          { label: 'Take the test without extra time. You don\'t want to make it weird.', style: 'silent', outcome: 'You gave up a right you\'re legally entitled to because of social discomfort. Your test score won\'t reflect what you actually know.', rating: 1 },
          { label: '"Ugh, nobody EVER reads my IEP! This happens every year. You need to fix this RIGHT NOW."', style: 'aggressive', outcome: 'Your frustration is valid, but attacking the teacher guarantees a defensive response. They might comply but the relationship is damaged.', rating: 2 },
          { label: 'Go to the teacher before the test: "Hi, I have an IEP that includes extended time for tests. Can we set that up before I start?"', style: 'assertive', outcome: 'You stated the accommodation clearly, referenced the legal document, and gave the teacher a chance to act. This is textbook self-advocacy.', rating: 3 }
        ] },
      { id: 'ad8', title: 'The Unfair Dress Code', setup: 'You got dress-coded for an outfit that several other students are wearing without consequences. You believe the rule is being applied unfairly.',
        who: 'Teacher / administrator',
        branches: [
          { label: 'Change your clothes and say nothing. Fighting it will just get you in more trouble.', style: 'silent', outcome: 'You accepted an inconsistent application of rules without question. If it\'s truly unfair, your silence means it continues.', rating: 1 },
          { label: 'Refuse to change. "Other people are wearing the same thing! This is discrimination!"', style: 'aggressive', outcome: 'Refusing a direct instruction escalates the situation from dress code to defiance. Now you\'re in trouble for two things instead of one.', rating: 2 },
          { label: 'Change your clothes as asked, then go to the office: "I changed as asked, but I noticed other students wearing the same thing weren\'t dress-coded. Can you help me understand the standard?"', style: 'assertive', outcome: 'You complied first (removing the defiance argument) then advocated second. Asking for clarity is powerful because it forces accountability without confrontation.', rating: 3 }
        ] },
      { id: 'ad9', title: 'The Bystander Moment', setup: 'You see a younger student being bullied at lunch every day. They sit alone and look scared. Nobody seems to be doing anything about it.',
        who: 'School counselor / teacher',
        branches: [
          { label: 'It\'s not your business. You don\'t want to get involved.', style: 'silent', outcome: 'The bullying continues. You have the power to change someone\'s experience and you didn\'t use it. Advocacy isn\'t just for yourself.', rating: 1 },
          { label: 'Confront the bullies directly: "Leave them alone or I\'ll make you."', style: 'aggressive', outcome: 'Physical threats put you at risk and might escalate the situation. You could become a target too.', rating: 2 },
          { label: 'Tell a trusted adult: "I\'ve been seeing a student getting bullied at lunch. I\'m worried about them." You could also sit with the student.', style: 'assertive', outcome: 'You advocated for someone who couldn\'t advocate for themselves. Reporting AND showing kindness is the most powerful combination.', rating: 3 }
        ] },
      { id: 'ad10', title: 'The Schedule Problem', setup: 'You were placed in a class that conflicts with the one support you actually rely on \u2014 a reading intervention group. Nobody asked you about the change.',
        who: 'Your counselor',
        branches: [
          { label: 'Accept the new schedule. Adults know what they\'re doing.', style: 'silent', outcome: 'You lost a support you need because you assumed adults always make the right call. They don\'t \u2014 they sometimes don\'t have all the information.', rating: 1 },
          { label: '"Why does nobody ever ask ME? This is MY schedule! Change it back!"', style: 'aggressive', outcome: 'Your frustration is valid, but demands without explanation get resistance. The counselor doesn\'t know why this matters unless you tell them.', rating: 2 },
          { label: '"I noticed my schedule changed and I lost my reading group. That support really helps me. Is there a way to keep both?"', style: 'assertive', outcome: 'You explained the impact, stated the value of the support, and asked for a solution. Counselors can often adjust schedules when they understand the stakes.', rating: 3 }
        ] },
      { id: 'ad11', title: 'The Group Pressure', setup: 'Your friend group makes fun of kids who ask questions in class. You need help understanding the material, but you\'re afraid of being labeled.',
        who: 'Yourself / teacher',
        branches: [
          { label: 'Don\'t ask. Your social life matters more than one assignment.', style: 'silent', outcome: 'You sacrificed your learning to maintain a social image. But the gap in understanding compounds. Next week it\'s harder. Next month, even harder.', rating: 1 },
          { label: 'Ask loudly and sarcastically to "prove" you don\'t care: "So what IS a metaphor? Since apparently NOBODY gets it."', style: 'aggressive', outcome: 'You performed not-caring while actually caring. It\'s exhausting to live behind a mask, and the sarcasm might annoy the teacher.', rating: 2 },
          { label: 'Ask the teacher privately after class or by email. Real friends wouldn\'t judge you for learning.', style: 'assertive', outcome: 'You found a way to get help that respects your social reality. And you might realize: friends who mock learning aren\'t protecting you \u2014 they\'re holding you back.', rating: 3 }
        ] },
      { id: 'ad12', title: 'The Ignored Email', setup: 'You emailed your counselor about a problem two weeks ago. No response. The situation is getting worse and you don\'t know what to do next.',
        who: 'Your counselor / another adult',
        branches: [
          { label: 'Give up. They obviously don\'t care.', style: 'silent', outcome: 'One non-response doesn\'t mean they don\'t care \u2014 it might mean they missed it, it went to spam, or they\'re overwhelmed. Giving up hurts you, not them.', rating: 1 },
          { label: 'Storm into their office: "I emailed you TWO WEEKS ago and you didn\'t even bother responding!"', style: 'aggressive', outcome: 'Leading with accusation puts them on defense. Even if they dropped the ball, this approach makes collaboration harder.', rating: 2 },
          { label: 'Send a follow-up: "Hi, I wanted to check in on my email from [date] about [topic]. I\'m still hoping to get help with this. When could we meet?" If still no response, go to another trusted adult.', style: 'assertive', outcome: 'You followed up professionally, referenced the timeline, and had a backup plan. Persistence without hostility is one of the most important advocacy skills you\'ll ever learn.', rating: 3 }
        ] },
      { id: 'ad21', title: 'The Locked Resource', setup: 'Your school has a homework help program after school, but it requires parent sign-up. Your parent works evenings and hasn\'t been able to fill out the form. You keep getting turned away.',
        who: 'Program coordinator / counselor',
        branches: [
          { label: 'Stop trying to go. The system isn\'t built for kids like you.', style: 'silent', outcome: 'You gave up on a resource you deserve because of an administrative barrier. The system should flex for you \u2014 not the other way around.', rating: 1 },
          { label: '"This is STUPID. My mom works and can\'t sign some dumb form. Just let me in!"', style: 'aggressive', outcome: 'Your frustration is understandable, but attacking the policy doesn\'t change it. Explaining your situation opens doors.', rating: 2 },
          { label: '"My parent works evenings and can\'t fill out the form during business hours. Is there an online option, or could I bring the form home for them to sign tonight?"', style: 'assertive', outcome: 'You explained the barrier AND proposed solutions. Advocating for access when systems don\'t account for your reality is one of the most important skills you can learn.', rating: 3 }
        ] },
      { id: 'ad22', title: 'The Tech Gap', setup: 'The teacher assigned a project that requires a computer at home. You don\'t have reliable internet access. Other students are already working on it.',
        who: 'Your teacher',
        branches: [
          { label: 'Don\'t say anything. Turn in whatever you can do on paper.', style: 'silent', outcome: 'You get a lower grade because of something that\'s not your fault. The teacher might think you didn\'t try when actually you didn\'t have the tools.', rating: 1 },
          { label: '"I can\'t do this! Not everyone has a computer at home, you know!"', style: 'aggressive', outcome: 'You made an important point, but the public callout might embarrass the teacher and they\'ll respond to the tone, not the truth.', rating: 2 },
          { label: 'Talk to the teacher privately: "I don\'t have reliable internet at home. Could I use the computer lab before or after school, or is there a way to do this assignment differently?"', style: 'assertive', outcome: 'You identified the barrier, asked privately (protecting your dignity), and proposed alternatives. Many teachers genuinely don\'t realize not everyone has the same access.', rating: 3 }
        ] },
      { id: 'ad30', title: 'Unfair Group Project Grading', setup: 'Your group project got a B, but you did most of the work. Two group members barely contributed. The teacher gave everyone the same grade. You feel it\'s unfair.',
        who: 'Your teacher',
        branches: [
          { label: 'Accept the B. It\'s a group grade, that\'s how it works.', style: 'silent', outcome: 'You absorbed an unfair outcome and learned that other people\'s lack of effort can bring you down. But you had the power to change this.', rating: 1 },
          { label: '"This is so unfair! I did EVERYTHING and they did NOTHING! I deserve an A!"', style: 'aggressive', outcome: 'You stated the problem but accused your groupmates publicly. The teacher hears complaints, not evidence.', rating: 2 },
          { label: 'Talk to the teacher privately: "I want to discuss how the group grade was determined. I kept a log of my contributions and I feel the work wasn\'t evenly distributed. Could we look at individual contributions?"', style: 'assertive', outcome: 'You brought evidence (a contribution log), spoke privately, and asked for a fair review. Many teachers have policies for adjusting group grades when one person carries the load.', rating: 3 }
        ] },
      { id: 'ad31', title: 'Need a Mental Health Day', setup: 'You\'ve been overwhelmed for weeks. You can\'t focus, you\'re not sleeping, and today you just feel like you cannot handle school. You need a day off for your mental health.',
        who: 'Your parent / counselor',
        branches: [
          { label: 'Go to school anyway. Everyone else deals with it.', style: 'silent', outcome: 'Pushing through when your mind is shutting down isn\'t resilience \u2014 it\'s denial. Your mental health is health.', rating: 1 },
          { label: '"I\'m NOT going to school and you can\'t MAKE me! I don\'t care about any of it!"', style: 'aggressive', outcome: 'Refusing without explaining sounds like defiance, not distress. Your parent hears rebellion instead of pain.', rating: 2 },
          { label: 'Tell your parent honestly: "I\'ve been really overwhelmed and I don\'t think I can function at school today. Can we talk about what I\'m going through? I might need to see the counselor too."', style: 'assertive', outcome: 'You named the problem, admitted you need help, and proposed a step. A mental health day with a plan is self-advocacy, not avoidance.', rating: 3 }
        ] },
      { id: 'ad32', title: 'The Dress Code Feels Unfair', setup: 'The dress code seems to target certain students more than others. You and your friends have noticed that the same rules are enforced differently depending on who you are.',
        who: 'Administration / school board',
        branches: [
          { label: 'Follow the code and don\'t make waves. Rules are rules.', style: 'silent', outcome: 'Compliance doesn\'t equal fairness. If a rule is applied unequally, silence lets the inequity continue.', rating: 1 },
          { label: 'Post about it on social media to call out the school.', style: 'aggressive', outcome: 'Social media can raise awareness but also escalates unpredictably. You bypass the formal process that could actually change the policy.', rating: 2 },
          { label: 'Collect examples of inconsistent enforcement with dates and details. Bring them to administration: "We\'ve noticed the dress code seems to be applied differently for different students. Here are specific examples. Can we discuss how to make enforcement more consistent?"', style: 'assertive', outcome: 'Data is powerful. Specific examples are harder to dismiss than feelings. You advocated for systemic change using evidence \u2014 that\'s how policy actually gets reformed.', rating: 3 }
        ] },
      { id: 'ad33', title: 'Peer Pressure to Skip Class', setup: 'Your friend group is planning to skip 5th period to hang out off campus. They\'re pressuring you to come. You don\'t want to skip, but you don\'t want to lose your friends either.',
        who: 'Your friends / yourself',
        branches: [
          { label: 'Go along with it. One class won\'t matter and your friendships are important.', style: 'silent', outcome: 'One skip becomes two. The pattern builds. And the friendship is conditional on you doing what they want \u2014 that\'s not friendship, it\'s pressure.', rating: 1 },
          { label: '"You guys are so immature. I\'m not getting in trouble for your stupid idea."', style: 'aggressive', outcome: 'Insulting them creates a bigger rift than just saying no. Now it\'s personal instead of just a decision.', rating: 2 },
          { label: '"I\'m going to pass on this one. I\'ve got a test coming up and I can\'t miss class. I\'ll catch up with you after school."', style: 'assertive', outcome: 'You said no without judging them, gave a reason, and kept the door open for the friendship. That\'s boundary-setting with social awareness.', rating: 3 }
        ] },
      { id: 'ad34', title: 'Teacher Mispronounces Your Name', setup: 'Your teacher has been mispronouncing your name for three weeks. Every time they say it wrong, a few students snicker. You\'ve let it go but it\'s starting to really bother you.',
        who: 'Your teacher',
        branches: [
          { label: 'Let it go. It\'s just a name. People mispronounce things all the time.', style: 'silent', outcome: 'Your name is your identity. Accepting a mispronunciation tells the class your name doesn\'t matter. It does.', rating: 1 },
          { label: 'Correct them loudly in the middle of class: "It\'s not [wrong]. You\'ve been saying it WRONG for weeks!"', style: 'aggressive', outcome: 'You\'re right to correct them, but the public embarrassment makes the teacher defensive and the snickering worse.', rating: 2 },
          { label: 'Talk to the teacher before or after class: "I wanted to help you with my name. It\'s pronounced [correct]. Would it help if I wrote it out phonetically for you?"', style: 'assertive', outcome: 'You approached it as helping them, not blaming them. You offered a tool (phonetic spelling) that makes it easier for them to get it right. Your name matters and you deserve to hear it spoken correctly.', rating: 3 }
        ] }
    ],
    high: [
      { id: 'ad13', title: 'Your IEP Meeting', setup: 'You\'re sitting in your IEP meeting. The adults \u2014 teachers, specialists, your parent \u2014 are making decisions about your goals and services. They\'re talking over you as if you\'re not in the room. You disagree with a proposed change.',
        who: 'IEP team',
        branches: [
          { label: 'Let the adults handle it. They know best.', style: 'silent', outcome: 'This is YOUR plan for YOUR education. Federal law (IDEA) gives you the right to participate. When you stay silent, decisions get made without your input \u2014 and you\'re the one who has to live with them.', rating: 1 },
          { label: '"This is MY life! Stop talking about me like I\'m not here! I don\'t agree with any of this!"', style: 'aggressive', outcome: 'Your frustration is completely understandable, but an outburst can be used to question your readiness. It gives people an excuse to make decisions "for" you.', rating: 2 },
          { label: '"Excuse me \u2014 I\'d like to share my perspective on this change. I think [current approach] is working because [specific reason]. Can we discuss keeping it?"', style: 'assertive', outcome: 'You interrupted respectfully, used evidence, and requested dialogue. This is exactly what transition planning is designed for: YOUR voice in YOUR plan. The adults should be listening.', rating: 3 }
        ] },
      { id: 'ad14', title: 'The Grade Dispute', setup: 'You received a failing grade on a paper you worked hard on. Looking at the rubric, the criteria seem inconsistently applied compared to a classmate\'s paper that scored higher.',
        who: 'Your teacher / professor',
        branches: [
          { label: 'Accept the grade. Arguing will just make the teacher mad.', style: 'silent', outcome: 'If the grade is genuinely unfair, accepting it means you absorbed an injustice. You also missed a chance to practice a skill you\'ll need in college and careers.', rating: 1 },
          { label: '"This grade is BS. You gave [classmate] a higher grade for worse work. I\'m going to the department chair."', style: 'aggressive', outcome: 'Jumping to escalation without giving the teacher a chance to explain or correct signals you want conflict, not resolution. Save the nuclear option for after conversation fails.', rating: 2 },
          { label: '"I\'d like to understand my grade better. Could we go through the rubric together? I noticed some areas where I\'m not sure how the criteria were applied."', style: 'assertive', outcome: 'You expressed confusion (not accusation), referenced the rubric (evidence), and asked for collaboration. Teachers respect students who engage with the process.', rating: 3 }
        ] },
      { id: 'ad15', title: 'The Workplace Rights', setup: 'Your boss keeps scheduling you during school hours and says "If you can\'t work when I need you, I\'ll find someone who can." You need this job for your family.',
        who: 'Your supervisor / labor board',
        branches: [
          { label: 'Work the hours. You can\'t afford to lose this job.', style: 'silent', outcome: 'Missing school for work creates a downward spiral: worse grades, fewer opportunities, more dependence on a job that doesn\'t respect you. Short-term survival, long-term damage.', rating: 1 },
          { label: '"You can\'t DO that! I\'ll report you! That\'s illegal!"', style: 'aggressive', outcome: 'You might be right about the law, but threatening your boss without documentation or support puts you at risk of retaliation. Know your rights, but play it smart.', rating: 2 },
          { label: '"I want to be a reliable employee, but I can\'t miss school \u2014 it\'s required by law. Here are the hours I\'m available. Can we make this work?" Document everything in writing.', style: 'assertive', outcome: 'You showed commitment while setting a clear boundary. Putting availability in writing creates a record. If they retaliate, you have documentation. Smart advocacy protects you.', rating: 3 }
        ] },
      { id: 'ad16', title: 'The Mental Health Need', setup: 'Your anxiety has been affecting your schoolwork \u2014 missing assignments, trouble concentrating, avoiding class presentations. You need support but don\'t know how to ask for it.',
        who: 'School counselor / parent',
        branches: [
          { label: 'Push through it. Everyone has anxiety. You don\'t want to be "that kid" who needs special treatment.', style: 'silent', outcome: 'Minimizing mental health needs is self-harm disguised as toughness. Anxiety that affects functioning IS the threshold where asking for help is not optional \u2014 it\'s necessary.', rating: 1 },
          { label: '"I literally can\'t do any of this! Nobody understands! The school doesn\'t care about mental health!"', style: 'aggressive', outcome: 'Your pain is real, but generalized blame doesn\'t lead to specific help. You need a specific person to hear a specific request.', rating: 2 },
          { label: 'Tell a trusted adult: "My anxiety has been making it really hard to keep up with school. I think I might need some accommodations or support. Who should I talk to about that?"', style: 'assertive', outcome: 'You named the problem specifically, described the impact, and asked for direction. This opens the door to a 504 plan, counseling referrals, or classroom accommodations. Asking for mental health support is one of the bravest forms of self-advocacy.', rating: 3 }
        ] },
      { id: 'ad17', title: 'The Discrimination Report', setup: 'A teacher made a comment about your background that felt discriminatory. Several students laughed. The teacher didn\'t correct it. You felt small.',
        who: 'Administrator / Title VI coordinator',
        branches: [
          { label: 'Let it go. Making a report will just make things awkward.', style: 'silent', outcome: 'The comment stands unchallenged. The teacher learns it\'s acceptable. Other students with your background absorb the same message: you don\'t matter enough to protect.', rating: 1 },
          { label: 'Post about it on social media. Let the court of public opinion judge.', style: 'aggressive', outcome: 'Social media pressure sometimes works, but it also escalates unpredictably, can get YOU in trouble, and bypasses the formal protections designed to help you.', rating: 2 },
          { label: 'Document what was said, when, and who was there. Report it to an administrator or Title VI coordinator: "I want to report a comment that I believe was discriminatory. Here\'s what happened."', style: 'assertive', outcome: 'Documentation is power. You used the system designed to protect you. Title VI of the Civil Rights Act requires schools to address discrimination. Your report creates accountability.', rating: 3 }
        ] },
      { id: 'ad18', title: 'Unequal College Guidance', setup: 'Your school counselor isn\'t helping with your college applications the way they help other students. You notice a pattern in who gets support and who doesn\'t.',
        who: 'School counselor / principal',
        branches: [
          { label: 'Figure it out on your own. You\'re used to not getting help.', style: 'silent', outcome: 'Self-reliance is admirable, but you shouldn\'t HAVE to do this alone. Other students aren\'t. You deserve the same access to guidance.', rating: 1 },
          { label: '"You help everyone else but ignore me! This school only cares about certain students."', style: 'aggressive', outcome: 'Even if the pattern is real, accusation without specifics gets dismissed as "perception." You need evidence and a clear ask.', rating: 2 },
          { label: '"I\'d like to schedule regular meetings to work on my college applications, like you do with other students. Specifically, I need help with [financial aid / essays / school list]. When can we start?"', style: 'assertive', outcome: 'You made a specific, actionable request that\'s hard to refuse. You also implicitly signaled awareness of the disparity without making an accusation. If they still don\'t help, escalate to the principal with documentation.', rating: 3 }
        ] },
      { id: 'ad23', title: 'The Housing Instability', setup: 'Your family moved recently and you\'re staying with relatives. Your new school wants proof of address to enroll you, but your situation is complicated. You\'re falling behind every day you\'re not in class.',
        who: 'School registrar / McKinney-Vento liaison',
        branches: [
          { label: 'Wait until your family figures out the housing situation. School can wait.', style: 'silent', outcome: 'Every day out of school is a day of learning lost. You have legal rights to immediate enrollment regardless of housing status \u2014 but only if someone knows your situation.', rating: 1 },
          { label: '"This is discrimination! You can\'t keep me out of school just because I don\'t have a permanent address!"', style: 'aggressive', outcome: 'You might be legally right, but the registrar may not know the law either. Accusations without a path forward create conflict, not solutions.', rating: 2 },
          { label: '"My family is in a temporary housing situation. I believe the McKinney-Vento Act gives me the right to enroll immediately. Can you connect me with the district\'s homeless liaison?"', style: 'assertive', outcome: 'Knowing the law by name is power. The McKinney-Vento Act guarantees immediate enrollment for students experiencing housing instability. You just used legal literacy as advocacy. That\'s elite-level.', rating: 3 }
        ] },
      { id: 'ad24', title: 'The Unpaid Internship', setup: 'You\'re interning at a company for "experience," but you\'re doing the same work as paid employees. Your supervisor keeps adding responsibilities without compensation. You can\'t afford to work for free much longer.',
        who: 'Your supervisor / career counselor',
        branches: [
          { label: 'Keep going. The experience on your resume is worth more than money.', style: 'silent', outcome: 'Maybe. But if you\'re doing the work of an employee, labor law may require compensation. And normalizing unpaid labor hurts everyone who comes after you.', rating: 1 },
          { label: '"I\'m basically a free employee. This is exploitation and I\'m going to report it."', style: 'aggressive', outcome: 'If it IS exploitative, reporting is valid \u2014 but threatening first without exploring options burns the bridge and the reference.', rating: 2 },
          { label: '"I\'ve been taking on responsibilities beyond the internship scope, which I\'m happy to do. But I want to discuss whether this role could become a paid position, or if we can adjust the workload to match the internship agreement."', style: 'assertive', outcome: 'You acknowledged your value, referenced the agreement, and proposed options. This is professional advocacy \u2014 the kind that leads to either fair pay or a clear boundary.', rating: 3 }
        ] },
      { id: 'ad35', title: 'Internship Negotiation', setup: 'You got a summer internship offer, but the hours conflict with a family obligation two days a week. The internship coordinator said "take it or leave it." You really want this opportunity.',
        who: 'Internship coordinator',
        branches: [
          { label: 'Accept the schedule as-is. You can\'t risk losing the opportunity.', style: 'silent', outcome: 'You sacrificed something important without even trying to negotiate. In professional life, the first offer is rarely the final answer.', rating: 1 },
          { label: '"That schedule doesn\'t work for me. Change it or I\'ll find another internship."', style: 'aggressive', outcome: 'Ultimatums from interns rarely work. You have less leverage than you think, and the coordinator has other applicants.', rating: 2 },
          { label: '"I\'m very excited about this internship and committed to making it work. I have a family obligation on Tuesdays and Thursdays. Could I make up those hours on other days, or adjust my start time? I want to show I\'m dedicated."', style: 'assertive', outcome: 'You showed enthusiasm, explained the constraint, and proposed solutions. Flexibility with commitment is exactly what employers want to see. Most will negotiate when you demonstrate investment.', rating: 3 }
        ] },
      { id: 'ad36', title: 'College Accommodation Request', setup: 'You\'ve been accepted to college and you have a documented learning disability. You need to register with disability services before classes start, but you\'re not sure how to explain your needs to a new institution.',
        who: 'Disability services office',
        branches: [
          { label: 'Don\'t register. College is a fresh start and you don\'t want to be labeled.', style: 'silent', outcome: 'A fresh start doesn\'t mean leaving behind the supports that help you succeed. College coursework is harder, not easier \u2014 accommodations matter more, not less.', rating: 1 },
          { label: '"I have a disability and you HAVE to accommodate me. It\'s the law."', style: 'aggressive', outcome: 'You\'re right about the law, but leading with demands instead of information makes the process adversarial instead of collaborative.', rating: 2 },
          { label: '"I\'d like to register with disability services. I have documentation of [disability] and I\'ve found these accommodations helpful in high school: [list]. What\'s the process to get similar supports set up here?"', style: 'assertive', outcome: 'You brought documentation, referenced what works, and asked about the process. Disability services offices WANT students to self-identify early \u2014 you just made their job easier and your success more likely.', rating: 3 }
        ] },
      { id: 'ad37', title: 'Workplace Harassment', setup: 'A coworker at your part-time job keeps making comments about your age, calling you "kid" and saying things like "shouldn\'t you be doing homework?" It\'s affecting your confidence and other employees are starting to treat you differently.',
        who: 'Manager / HR',
        branches: [
          { label: 'Ignore it. They\'re just joking around and you don\'t want to be the one who can\'t take a joke.', style: 'silent', outcome: 'If the comments are persistent and affecting your work environment, it\'s not a joke \u2014 it\'s harassment. Silence normalizes it.', rating: 1 },
          { label: 'Snap back at them: "At least I have a future. What\'s your excuse for still being here?"', style: 'aggressive', outcome: 'Fighting fire with fire might feel good but now you\'re both behaving unprofessionally. You could face consequences too.', rating: 2 },
          { label: 'First, tell the coworker directly: "I\'d appreciate if you stopped making comments about my age. I\'m here to do my job." If it continues, document the incidents and report to your manager: "I\'ve asked [name] to stop making age-related comments and it\'s continuing. I\'d like this addressed."', style: 'assertive', outcome: 'You tried direct communication first, then escalated with documentation. This is textbook workplace advocacy. You created a record that protects you if things get worse.', rating: 3 }
        ] },
      { id: 'ad38', title: 'Unfair School Policy', setup: 'Your school implemented a new policy requiring students to earn a certain GPA to participate in extracurriculars. You know several students who rely on sports and clubs for college scholarships and mental health \u2014 including students with disabilities whose GPAs are affected by their conditions.',
        who: 'School board / principal',
        branches: [
          { label: 'It\'s the school\'s decision. They probably know best.', style: 'silent', outcome: 'Policies made without student input often have unintended consequences. The school board may not realize how this affects vulnerable students unless someone speaks up.', rating: 1 },
          { label: 'Organize a walkout to protest the policy.', style: 'aggressive', outcome: 'A walkout gets attention but also consequences. And it doesn\'t present an alternative \u2014 it just says "no" without offering "instead."', rating: 2 },
          { label: 'Research the policy\'s impact: how many students are affected, does it disproportionately impact students with disabilities or low-income students? Present findings to the school board: "We believe this policy has unintended consequences. Here\'s our data and a proposed alternative that still encourages academic effort while protecting access."', style: 'assertive', outcome: 'You used data, identified affected populations, and proposed an alternative. This is civic advocacy at its finest. Policymakers respond to evidence and solutions, not just opposition.', rating: 3 }
        ] },
      { id: 'ad39', title: 'Advocating for a Community Need', setup: 'Your neighborhood doesn\'t have safe sidewalks or crosswalks near the school. Students walk in the road every day. Two students have already been hit by cars this year. Nobody in charge seems to be doing anything.',
        who: 'City council / school administration',
        branches: [
          { label: 'Walk carefully and hope nothing happens to you. It\'s just how things are.', style: 'silent', outcome: 'Accepting dangerous conditions as normal is how communities stay unsafe. Someone has to start the conversation.', rating: 1 },
          { label: 'Post angry rants on social media: "Two kids got hit and nobody cares! This city is garbage!"', style: 'aggressive', outcome: 'Anger without a channel is just noise. Social media might raise awareness but doesn\'t attend city council meetings.', rating: 2 },
          { label: 'Document the issue: photograph the dangerous areas, gather statements from affected students and families, research who is responsible for infrastructure. Attend a city council meeting or write a formal request: "We\'re requesting a safety assessment for [street/intersection]. Here is evidence of the danger and the number of students affected daily."', style: 'assertive', outcome: 'You became a community advocate. Documentation, research, and formal channels are how infrastructure actually gets changed. You just practiced the same skills that civil rights leaders, disability advocates, and community organizers use every day.', rating: 3 }
        ] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Script Templates (fill-in-the-blank advocacy scripts) ──
  // ══════════════════════════════════════════════════════════════
  var SCRIPT_TEMPLATES = {
    elementary: [
      { id: 'st1', title: 'Asking for Help', context: 'Use this when you need help understanding something in class.',
        parts: [
          { type: 'text', content: 'Excuse me, ' },
          { type: 'blank', key: 'person', placeholder: "teacher's name" },
          { type: 'text', content: '. I\'m having trouble with ' },
          { type: 'blank', key: 'what', placeholder: 'what you need help with' },
          { type: 'text', content: '. Could you please ' },
          { type: 'blank', key: 'request', placeholder: 'what would help you' },
          { type: 'text', content: '? Thank you.' }
        ],
        example: { person: 'Ms. Rodriguez', what: 'the math problems on page 12', request: 'show me how to do the first one' },
        tips: ['Make eye contact if that feels okay for you', 'Use a calm, clear voice', 'It\'s okay to say "I don\'t understand"'] },
      { id: 'st2', title: 'Telling About a Problem', context: 'Use this when something at school makes you feel unsafe or upset.',
        parts: [
          { type: 'text', content: 'I need to tell you something important. ' },
          { type: 'blank', key: 'what', placeholder: 'what happened' },
          { type: 'text', content: '. It made me feel ' },
          { type: 'blank', key: 'feeling', placeholder: 'how you feel' },
          { type: 'text', content: '. I need ' },
          { type: 'blank', key: 'need', placeholder: 'what you need to happen' },
          { type: 'text', content: '.' }
        ],
        example: { what: 'A kid keeps pushing me in the hallway', feeling: 'scared and upset', need: 'help making it stop' },
        tips: ['You can tell ANY trusted adult', 'It\'s not tattling \u2014 it\'s keeping yourself safe', 'If one adult doesn\'t help, tell another one'] },
      { id: 'st3', title: 'Explaining What You Need', context: 'Use this when you have a specific need that would help you learn better.',
        parts: [
          { type: 'text', content: 'I learn better when I can ' },
          { type: 'blank', key: 'condition', placeholder: 'what helps you learn' },
          { type: 'text', content: '. Right now, ' },
          { type: 'blank', key: 'problem', placeholder: 'what\'s making it hard' },
          { type: 'text', content: '. Could we try ' },
          { type: 'blank', key: 'solution', placeholder: 'your idea for a fix' },
          { type: 'text', content: '?' }
        ],
        example: { condition: 'sit near the front where it\'s quieter', problem: 'the noise near the door makes it hard to focus', solution: 'moving my seat closer to the board' },
        tips: ['You know yourself better than anyone', 'It\'s okay to have different needs', 'Teachers WANT to help \u2014 they just need to know how'] },
      { id: 'st4', title: 'Disagreeing Respectfully', context: 'Use this when you think something isn\'t fair and want to speak up.',
        parts: [
          { type: 'text', content: 'I understand that ' },
          { type: 'blank', key: 'their_view', placeholder: 'what they decided' },
          { type: 'text', content: ', but I feel like ' },
          { type: 'blank', key: 'your_view', placeholder: 'what seems unfair' },
          { type: 'text', content: '. Could we talk about ' },
          { type: 'blank', key: 'solution', placeholder: 'another option' },
          { type: 'text', content: '?' }
        ],
        example: { their_view: 'everyone has to present in front of the class', your_view: 'I get really nervous and it\'s hard for me', solution: 'whether I could present to just you, or record a video' },
        tips: ['Start by showing you heard their side', 'Use "I feel" instead of "You\'re wrong"', 'Suggest an alternative, not just a complaint'] },
      { id: 'st13', title: 'Asking to Try Something New', context: 'Use this when you want to try a harder class, join an activity, or take on a new challenge.',
        parts: [
          { type: 'text', content: 'I\'d really like to try ' },
          { type: 'blank', key: 'goal', placeholder: 'what you want to try' },
          { type: 'text', content: '. I think I\'m ready because ' },
          { type: 'blank', key: 'reason', placeholder: 'why you\'re ready' },
          { type: 'text', content: '. Could you help me ' },
          { type: 'blank', key: 'help', placeholder: 'what you need from them' },
          { type: 'text', content: '?' }
        ],
        example: { goal: 'joining the school play', reason: 'I\'ve been practicing reading out loud and I love stories', help: 'sign up for auditions' },
        tips: ['Believing in yourself is the first step', 'Adults like to see kids who want to grow', 'If they say "not yet," ask what you need to do to get ready'] },
      { id: 'st14', title: 'When Someone Won\'t Listen', context: 'Use this when you told an adult about a problem but nothing happened.',
        parts: [
          { type: 'text', content: 'I told ' },
          { type: 'blank', key: 'who', placeholder: 'who you told' },
          { type: 'text', content: ' about ' },
          { type: 'blank', key: 'what', placeholder: 'the problem' },
          { type: 'text', content: ' on ' },
          { type: 'blank', key: 'when', placeholder: 'when you told them' },
          { type: 'text', content: '. Nothing has changed. I still need help with this. Can you please ' },
          { type: 'blank', key: 'action', placeholder: 'what you want to happen' },
          { type: 'text', content: '?' }
        ],
        example: { who: 'my teacher', what: 'kids being mean at recess', when: 'last Tuesday', action: 'talk to them or help me find a safe space at recess' },
        tips: ['If one adult doesn\'t help, try another', 'Keeping track of dates shows you\'re serious', 'You deserve to be heard'] }
    ],
    middle: [
      { id: 'st5', title: 'Requesting an Accommodation', context: 'Use this when you have a right to an accommodation and need to make sure it\'s in place.',
        parts: [
          { type: 'text', content: 'Hi, I wanted to let you know that my ' },
          { type: 'blank', key: 'plan', placeholder: 'IEP / 504 plan' },
          { type: 'text', content: ' includes ' },
          { type: 'blank', key: 'accommodation', placeholder: 'the specific accommodation' },
          { type: 'text', content: '. I want to make sure it\'s set up for ' },
          { type: 'blank', key: 'when', placeholder: 'upcoming test / class / assignment' },
          { type: 'text', content: '. What do I need to do to make that happen?' }
        ],
        example: { plan: '504 plan', accommodation: 'extended time on tests and a quiet testing location', when: 'next week\'s midterm' },
        tips: ['Know your plan \u2014 keep a copy or summary on your phone', 'Ask BEFORE the day of the test', 'It\'s your legal right, not a favor'] },
      { id: 'st6', title: 'Reporting a Concern', context: 'Use this when you need to report bullying, harassment, or a safety concern to a school adult.',
        parts: [
          { type: 'text', content: 'I need to report something. ' },
          { type: 'blank', key: 'what', placeholder: 'describe what happened' },
          { type: 'text', content: '. It has been happening ' },
          { type: 'blank', key: 'when', placeholder: 'how often / since when' },
          { type: 'text', content: '. I\'ve already tried ' },
          { type: 'blank', key: 'tried', placeholder: 'what you\'ve done so far' },
          { type: 'text', content: '. I need the school to ' },
          { type: 'blank', key: 'action', placeholder: 'what you want to happen' },
          { type: 'text', content: '.' }
        ],
        example: { what: 'A group of students keeps making fun of me in the hallway between classes', when: 'almost every day for three weeks', tried: 'ignoring it and walking a different way', action: 'address it so it stops' },
        tips: ['Be specific: names, dates, locations', 'Say what you\'ve already tried', 'Ask for a follow-up: "When can I expect to hear back?"'] },
      { id: 'st7', title: 'Discussing a Grade', context: 'Use this when you want to understand or question a grade respectfully.',
        parts: [
          { type: 'text', content: 'I\'d like to talk about my grade on ' },
          { type: 'blank', key: 'assignment', placeholder: 'the assignment' },
          { type: 'text', content: '. I ' },
          { type: 'blank', key: 'effort', placeholder: 'what you did / how you prepared' },
          { type: 'text', content: '. I\'m confused about ' },
          { type: 'blank', key: 'question', placeholder: 'what you don\'t understand about the grade' },
          { type: 'text', content: '. Could you help me understand what I could improve?' }
        ],
        example: { assignment: 'my history essay', effort: 'spent a lot of time researching and followed the rubric', question: 'why I lost points on the analysis section when I included three sources' },
        tips: ['Come with your work and the rubric', 'Ask to learn, not to argue', 'Take notes on their feedback'] },
      { id: 'st8', title: 'Explaining Your Learning Style', context: 'Use this when you want to help a teacher understand how you learn best.',
        parts: [
          { type: 'text', content: 'I\'ve noticed that I learn best when ' },
          { type: 'blank', key: 'style', placeholder: 'how you learn best' },
          { type: 'text', content: '. In this class, I\'m struggling with ' },
          { type: 'blank', key: 'challenge', placeholder: 'what\'s hard right now' },
          { type: 'text', content: '. Would it be possible to ' },
          { type: 'blank', key: 'request', placeholder: 'what would help' },
          { type: 'text', content: '? I think it would really help me show what I know.' }
        ],
        example: { style: 'I can see things visually or work with my hands', challenge: 'taking notes from lectures because I process information slowly when it\'s just audio', request: 'get the slides before class so I can follow along' },
        tips: ['Self-awareness IS the skill here', 'Frame it as "this helps me succeed"', 'Teachers appreciate students who know themselves'] },
      { id: 'st15', title: 'Pushing Back on a Consequence', context: 'Use this when you think a punishment or consequence is unfair or disproportionate.',
        parts: [
          { type: 'text', content: 'I understand that what I did was ' },
          { type: 'blank', key: 'action', placeholder: 'what you did' },
          { type: 'text', content: '. But I feel like the consequence of ' },
          { type: 'blank', key: 'consequence', placeholder: 'the punishment given' },
          { type: 'text', content: ' doesn\'t match because ' },
          { type: 'blank', key: 'reason', placeholder: 'why it seems unfair' },
          { type: 'text', content: '. Could we talk about a consequence that\'s more fair, like ' },
          { type: 'blank', key: 'alternative', placeholder: 'your suggested alternative' },
          { type: 'text', content: '?' }
        ],
        example: { action: 'talking to a friend during the lesson', consequence: 'losing all of recess for a week', reason: 'it was a first offense and I stopped when asked', alternative: 'missing one recess or doing a make-up assignment' },
        tips: ['Own what you did first \u2014 then question the response', 'Know your school\'s discipline policy', 'Ask for the rule in writing if needed'] },
      { id: 'st16', title: 'Requesting Access to a Resource', context: 'Use this when a resource exists but there\'s a barrier keeping you from using it.',
        parts: [
          { type: 'text', content: 'I\'d like to use ' },
          { type: 'blank', key: 'resource', placeholder: 'the resource or program' },
          { type: 'text', content: ', but I\'m having trouble accessing it because ' },
          { type: 'blank', key: 'barrier', placeholder: 'what\'s in the way' },
          { type: 'text', content: '. Is there a way to ' },
          { type: 'blank', key: 'solution', placeholder: 'work around the barrier' },
          { type: 'text', content: '? I think it would really help my ' },
          { type: 'blank', key: 'benefit', placeholder: 'how it would help you' },
          { type: 'text', content: '.' }
        ],
        example: { resource: 'the after-school tutoring program', barrier: 'I can\'t stay after school because I take the early bus', solution: 'have a virtual option or come during study hall instead', benefit: 'math grade and understanding of the material' },
        tips: ['Resources exist to be used \u2014 barriers are problems to solve', 'Propose at least one alternative', 'Ask who else might help if this person can\'t'] }
    ],
    high: [
      { id: 'st9', title: 'Speaking at Your IEP/504 Meeting', context: 'Use this as an opening statement when you attend your own education planning meeting.',
        parts: [
          { type: 'text', content: 'Thank you for including me. I want to share what\'s been working: ' },
          { type: 'blank', key: 'working', placeholder: 'what supports are helping' },
          { type: 'text', content: '. What I\'d like to change is ' },
          { type: 'blank', key: 'change', placeholder: 'what you want to be different' },
          { type: 'text', content: '. My goal for this year is ' },
          { type: 'blank', key: 'goal', placeholder: 'what you want to achieve' },
          { type: 'text', content: '. I need ' },
          { type: 'blank', key: 'support', placeholder: 'what support would help' },
          { type: 'text', content: ' to get there.' }
        ],
        example: { working: 'the extended time on tests and the note-taking support', change: 'I want to take more regular classes instead of all resource classes', goal: 'to be ready for college-level work by graduation', support: 'a transition plan and maybe a mentor who\'s been through this' },
        tips: ['This is YOUR meeting about YOUR life', 'Prepare notes beforehand', 'You can bring a support person', 'Ask to take breaks if you need them'] },
      { id: 'st10', title: 'Addressing Discrimination', context: 'Use this to document and report discriminatory behavior by a staff member or student.',
        parts: [
          { type: 'text', content: 'I want to report an incident. On ' },
          { type: 'blank', key: 'when', placeholder: 'date and time' },
          { type: 'text', content: ', in ' },
          { type: 'blank', key: 'where', placeholder: 'location' },
          { type: 'text', content: ', ' },
          { type: 'blank', key: 'who', placeholder: 'who was involved' },
          { type: 'text', content: ' said/did ' },
          { type: 'blank', key: 'what', placeholder: 'what happened (exact words if possible)' },
          { type: 'text', content: '. This made me feel ' },
          { type: 'blank', key: 'impact', placeholder: 'the impact on you' },
          { type: 'text', content: '. I believe this may violate ' },
          { type: 'blank', key: 'policy', placeholder: 'school policy / Title VI / Title IX' },
          { type: 'text', content: '. I\'d like to know what steps will be taken.' }
        ],
        example: { when: 'Tuesday, March 15 during 3rd period', where: 'room 204', who: 'Mr. Johnson', what: 'made a comment about my accent being "hard to understand" and suggested I "practice English more," in front of the class', impact: 'humiliated and unwelcome in that classroom', policy: 'the school\'s anti-discrimination policy and Title VI' },
        tips: ['Write everything down immediately after', 'Include exact quotes when possible', 'Note who else was present', 'Keep copies of all reports you file'] },
      { id: 'st11', title: 'Negotiating Your Work Schedule', context: 'Use this when your employer schedules you in ways that conflict with school or legal limits.',
        parts: [
          { type: 'text', content: 'I want to be a reliable employee and I take this job seriously. However, ' },
          { type: 'blank', key: 'problem', placeholder: 'the scheduling issue' },
          { type: 'text', content: '. I\'m available during ' },
          { type: 'blank', key: 'hours', placeholder: 'your available hours' },
          { type: 'text', content: '. I\'d like to work together to find a schedule that works for both of us. Could we ' },
          { type: 'blank', key: 'proposal', placeholder: 'your proposed solution' },
          { type: 'text', content: '?' }
        ],
        example: { problem: 'I\'ve been scheduled during school hours three times this month, and I can\'t miss class', hours: 'weekdays 4-9 PM and weekends', proposal: 'set a recurring schedule so we both know what to expect each week' },
        tips: ['Put your availability in writing (email/text)', 'Know your state\'s minor labor laws', 'If they retaliate, document everything', 'You can contact your state labor board anonymously'] },
      { id: 'st12', title: 'Requesting Mental Health Support', context: 'Use this when anxiety, depression, or other mental health challenges are affecting your school performance.',
        parts: [
          { type: 'text', content: 'I\'ve been going through ' },
          { type: 'blank', key: 'challenge', placeholder: 'what you\'re experiencing' },
          { type: 'text', content: '. It\'s been affecting my ' },
          { type: 'blank', key: 'impact', placeholder: 'how it affects school' },
          { type: 'text', content: '. I think I would benefit from ' },
          { type: 'blank', key: 'support', placeholder: 'what kind of support' },
          { type: 'text', content: '. Who should I talk to about getting that set up?' }
        ],
        example: { challenge: 'a lot of anxiety that makes it hard to concentrate and sometimes I can\'t come to school', impact: 'attendance, my grades, and my ability to do presentations', support: 'talking to a counselor regularly and maybe some accommodations for presentations' },
        tips: ['You don\'t have to share everything \u2014 just enough for them to help', 'Mental health accommodations are legally protected', 'If the school counselor isn\'t enough, ask about community referrals', 'Asking for help is strength, not weakness'] },
      { id: 'st17', title: 'Appealing a School Decision', context: 'Use this when a school decision (suspension, placement, policy) seems wrong and you want to challenge it formally.',
        parts: [
          { type: 'text', content: 'I\'m writing to appeal the decision to ' },
          { type: 'blank', key: 'decision', placeholder: 'the decision being appealed' },
          { type: 'text', content: '. I believe this decision should be reconsidered because ' },
          { type: 'blank', key: 'reason', placeholder: 'why it should change' },
          { type: 'text', content: '. The evidence supporting my case includes ' },
          { type: 'blank', key: 'evidence', placeholder: 'supporting facts' },
          { type: 'text', content: '. I am requesting ' },
          { type: 'blank', key: 'request', placeholder: 'what outcome you want' },
          { type: 'text', content: '. I would appreciate a response by ' },
          { type: 'blank', key: 'deadline', placeholder: 'reasonable deadline' },
          { type: 'text', content: '.' }
        ],
        example: { decision: 'suspend me for 3 days for a first-time tardy policy violation', reason: 'the student handbook states first violations result in a warning, not suspension', evidence: 'page 14 of the handbook, my clean disciplinary record, and the bus schedule showing I arrived only 2 minutes late', request: 'that the suspension be reduced to a warning per the written policy', deadline: 'Friday, so I don\'t miss more class than necessary' },
        tips: ['Put appeals in writing \u2014 always', 'Reference specific policies or documents', 'Request a timeline for response', 'CC a parent or advocate if possible'] },
      { id: 'st18', title: 'Introducing Yourself to a New Support Person', context: 'Use this when you\'re assigned a new teacher, counselor, therapist, or case manager and want them to understand your needs quickly.',
        parts: [
          { type: 'text', content: 'Hi, I\'m ' },
          { type: 'blank', key: 'name', placeholder: 'your name' },
          { type: 'text', content: '. I wanted to introduce myself and share a few things that help me succeed. I work best when ' },
          { type: 'blank', key: 'strengths', placeholder: 'what helps you' },
          { type: 'text', content: '. I sometimes struggle with ' },
          { type: 'blank', key: 'challenges', placeholder: 'what\'s hard' },
          { type: 'text', content: '. The most helpful thing a teacher/counselor has done for me is ' },
          { type: 'blank', key: 'past_help', placeholder: 'what worked before' },
          { type: 'text', content: '. I\'m looking forward to working with you.' }
        ],
        example: { name: 'Jamie', strengths: 'I have clear expectations and can check in regularly about progress', challenges: 'transitions between tasks and staying focused during long lectures', past_help: 'giving me a 2-minute warning before transitions and letting me use noise-canceling headphones during independent work' },
        tips: ['Self-introduction is the most proactive form of advocacy', 'You\'re saving them time by telling them what works', 'This script works for teachers, therapists, coaches, and bosses'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Rights Cards (interactive flip cards) ──
  // ══════════════════════════════════════════════════════════════
  var RIGHTS_CARDS = {
    elementary: [
      { id: 'rt1', title: 'Right to Be Safe', icon: '\uD83D\uDEE1\uFE0F',
        right: 'Every student has the right to feel safe at school.',
        explanation: 'No one is allowed to hit you, bully you, or make you feel scared at school. Adults at school are supposed to help keep you safe.',
        example: 'If a kid keeps pushing you at recess, you have the right to tell a teacher AND expect them to do something about it.',
        source: 'School safety laws & district policies' },
      { id: 'rt2', title: 'Right to Learn', icon: '\uD83D\uDCDA',
        right: 'You deserve help understanding things, even if it takes you longer.',
        explanation: 'Every kid learns differently. Some need more time, different tools, or extra help. That\'s okay \u2014 the school is supposed to help you learn YOUR way.',
        example: 'If reading is hard for you, the school might give you audiobooks, extra time, or a reading buddy. These aren\'t special treatment \u2014 they\'re your right.',
        source: 'IDEA (Individuals with Disabilities Education Act) & FAPE (Free Appropriate Public Education)' },
      { id: 'rt3', title: 'Right to Ask Questions', icon: '\u2753',
        right: 'You can always ask for help or clarification. No question is silly.',
        explanation: 'Classrooms are for learning, and learning means not knowing things yet. Asking questions is how your brain grows.',
        example: 'If the teacher explains something and you don\'t get it, raising your hand and saying "Could you explain that again?" is EXACTLY what you should do.',
        source: 'Every classroom should be a safe space for questions' },
      { id: 'rt4', title: 'Right to Tell an Adult', icon: '\uD83D\uDDE3\uFE0F',
        right: 'If something is wrong, you have the right to tell a trusted adult and be heard.',
        explanation: 'When something bad happens \u2014 to you or to someone else \u2014 telling an adult is not tattling. It\'s taking care of yourself and others.',
        example: 'If you see someone getting hurt, or if someone is doing something that makes you uncomfortable, you can tell your teacher, principal, parent, or any adult you trust.',
        source: 'Mandatory reporting laws protect students' },
      { id: 'rt5', title: 'Right to Be Respected', icon: '\u2764\uFE0F',
        right: 'Nobody should make you feel less than because of who you are.',
        explanation: 'No matter your skin color, language, family, religion, abilities, or anything else \u2014 you deserve respect from everyone at school, including adults.',
        example: 'If a teacher or student makes fun of your name, culture, or family, that\'s not okay. You can say "That\'s not okay" and tell another adult.',
        source: 'Civil Rights Act & school anti-discrimination policies' }
    ],
    middle: [
      { id: 'rt6', title: 'Right to Participate in Your Education Plan', icon: '\uD83D\uDCCB',
        right: 'If you have an IEP or 504 plan, you can attend your own meetings and share your voice.',
        explanation: 'Starting around middle school, you have the right to be at your IEP meeting. It\'s about YOUR life and YOUR education. Your perspective matters more than anyone else\'s in that room.',
        example: 'You can say at your meeting: "I want to try the regular English class with support" or "This accommodation is really helping me and I want to keep it."',
        source: 'IDEA Section 614(d)(1)(B) \u2014 student participation in IEP development' },
      { id: 'rt7', title: 'Right to Privacy', icon: '\uD83D\uDD12',
        right: 'Your education records are private. Schools can\'t share them without permission.',
        explanation: 'Your grades, disability status, discipline records, and personal information are protected. The school can\'t share them with random people.',
        example: 'A teacher can\'t announce your test score to the class, and the school can\'t tell other parents about your behavior without your family\'s consent.',
        source: 'FERPA (Family Educational Rights and Privacy Act, 1974)' },
      { id: 'rt8', title: 'Right to a Bully-Free Environment', icon: '\uD83D\uDEAB',
        right: 'Schools are required to address bullying and harassment.',
        explanation: 'Every state has anti-bullying laws. Your school must have a policy, investigate reports, and take action. "Kids will be kids" is not an acceptable response from adults.',
        example: 'If you report bullying and nothing changes, you can go to the principal, the district office, or even file a complaint with your state department of education.',
        source: 'State anti-bullying laws (all 50 states)' },
      { id: 'rt9', title: 'Right to Due Process', icon: '\u2696\uFE0F',
        right: 'Before being suspended or expelled, you have the right to hear the charges and tell your side.',
        explanation: 'The school can\'t just kick you out without a process. You have the right to know what you\'re accused of, present your side, and have a fair hearing.',
        example: 'If a principal says you\'re being suspended, you can say: "I\'d like to understand the specific charges and share what actually happened before any decision is made."',
        source: 'Goss v. Lopez (1975) \u2014 Supreme Court ruling on student due process' },
      { id: 'rt10', title: 'Right to Express Yourself', icon: '\uD83D\uDCAC',
        right: '"Students don\'t shed their constitutional rights at the schoolhouse gate."',
        explanation: 'You have free speech rights at school, with reasonable limits. You can wear political clothing, write opinion pieces, start clubs, and express your beliefs.',
        example: 'You can wear a shirt supporting a cause you believe in, start a student organization, or write an editorial in the school paper \u2014 as long as it doesn\'t substantially disrupt school.',
        source: 'Tinker v. Des Moines (1969) \u2014 landmark Supreme Court case' }
    ],
    high: [
      { id: 'rt11', title: 'Right to Access Your Records', icon: '\uD83D\uDCC2',
        right: 'At 18 (or with parent permission), you can see everything in your school file.',
        explanation: 'You have the right to review all your education records \u2014 grades, evaluations, disciplinary files, special education documents. You can also request corrections.',
        example: 'If you turn 18 during senior year, FERPA rights transfer to YOU. You can review your file and decide who has access to it, even from your parents.',
        source: 'FERPA \u2014 Rights transfer at age 18 or enrollment in postsecondary education' },
      { id: 'rt12', title: 'Right to Accommodations', icon: '\u267F',
        right: 'If you have a disability, you\'re entitled to reasonable accommodations in school and the workplace.',
        explanation: 'Section 504 and the ADA require schools and employers to provide accommodations for documented disabilities \u2014 including learning disabilities, ADHD, mental health conditions, and chronic illness.',
        example: 'Accommodations can include: extended test time, note-taking support, flexible deadlines, a quiet testing space, preferential seating, or modified assignments.',
        source: 'Section 504 of the Rehabilitation Act (1973) & Americans with Disabilities Act (1990)' },
      { id: 'rt13', title: 'Right to Participate in Your IEP', icon: '\uD83C\uDF93',
        right: 'You have the right to attend, speak, and set goals at your IEP meeting.',
        explanation: 'By high school, transition planning is required \u2014 and YOUR goals for after graduation drive the conversation. The team works for YOU, not the other way around.',
        example: 'You can say: "My goal is to attend community college. I need my transition plan to include college preparation, not just life skills."',
        source: 'IDEA transition planning requirements (begins by age 16, some states age 14)' },
      { id: 'rt14', title: 'Right to Report Discrimination', icon: '\uD83D\uDCE2',
        right: 'You can report discrimination based on race, sex, disability, or national origin.',
        explanation: 'Federal civil rights laws protect students from discrimination. Your school has a Title IX coordinator and a 504 coordinator who are required to investigate complaints.',
        example: 'If a teacher treats you differently because of your identity, you can file a complaint with the school, the district, or the U.S. Department of Education\'s Office for Civil Rights.',
        source: 'Title VI (race), Title IX (sex), Section 504 (disability), Title III (language)' },
      { id: 'rt15', title: 'Right to Consent Over Your Data', icon: '\uD83D\uDD10',
        right: 'At 18, you decide who sees your educational records.',
        explanation: 'Once FERPA rights transfer to you, the school needs YOUR consent to share your records \u2014 with colleges, employers, or anyone else. You control your narrative.',
        example: 'When colleges request your transcript, YOU sign the release. When employers ask for school records, YOU decide what to share.',
        source: 'FERPA \u2014 Consent requirements for disclosure of education records' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Voice Practice Scenarios (AI role-play with authority) ──
  // ══════════════════════════════════════════════════════════════
  var VOICE_SCENARIOS = {
    elementary: [
      { id: 'vo1', band: 'elementary', title: 'Asking Ms. Chen for Help',
        desc: 'You\'ve been confused about the reading assignment for three days. Ms. Chen seems busy but you really need help before the test.',
        authority: { name: 'Ms. Chen', emoji: '\uD83D\uDC69\u200D\uD83C\uDFEB', role: 'your teacher',
          personality: 'Kind but busy. She doesn\'t realize you\'re struggling because you haven\'t said anything. She\'s very responsive when students ask directly.',
          openingLine: 'Oh hi! I\'m just getting things ready for next period. Did you need something, sweetie?' },
        initialConfidence: 30, resolveThreshold: 70 },
      { id: 'vo2', band: 'elementary', title: 'Telling Principal Davis',
        desc: 'Someone has been taking your lunch money every day this week. You\'ve told your teacher but nothing changed. Now you\'re going to the principal.',
        authority: { name: 'Principal Davis', emoji: '\uD83D\uDC68\u200D\uD83D\uDCBC', role: 'the principal',
          personality: 'Formal and serious but cares deeply about student safety. Needs specific details to take action. Might ask follow-up questions.',
          openingLine: 'Come in, come in. Have a seat. What brings you to my office today?' },
        initialConfidence: 20, resolveThreshold: 65 },
      { id: 'vo3', band: 'elementary', title: 'Explaining to Nurse Patel',
        desc: 'Your stomach has been hurting a lot during school. It happens mostly before tests. You need to explain what\'s going on but it\'s hard to describe.',
        authority: { name: 'Nurse Patel', emoji: '\uD83D\uDC69\u200D\u2695\uFE0F', role: 'the school nurse',
          personality: 'Warm and patient. Asks good questions to understand what\'s happening. Takes all complaints seriously. Might suggest talking to parents.',
          openingLine: 'Hi there. Come sit down. Tell me what\'s going on \u2014 how are you feeling today?' },
        initialConfidence: 35, resolveThreshold: 65 },
      { id: 'vo10', band: 'elementary', title: 'Getting a New Seat',
        desc: 'The noise from the hallway near your desk makes it really hard to focus. You want to ask the teacher if you can move, but you\'re worried she\'ll say no.',
        authority: { name: 'Mrs. Garcia', emoji: '\uD83D\uDC69\u200D\uD83C\uDFEB', role: 'your teacher',
          personality: 'Organized and routine-oriented. She likes her seating chart but genuinely wants students to succeed. If you explain WHY you need to move, she\'ll consider it.',
          openingLine: 'I noticed you raised your hand \u2014 what do you need, sweetheart?' },
        initialConfidence: 30, resolveThreshold: 65 }
    ],
    middle: [
      { id: 'vo4', band: 'middle', title: 'Discussing Accommodations with Mr. Torres',
        desc: 'You have a 504 plan with extended time on tests, but Mr. Torres is new and doesn\'t seem to know about it. The midterm is next week.',
        authority: { name: 'Mr. Torres', emoji: '\uD83D\uDC68\u200D\uD83C\uDFEB', role: 'your new teacher',
          personality: 'Well-meaning but slightly skeptical of accommodations he hasn\'t seen documented. Responds well to specifics and professionalism. Not hostile, just uninformed.',
          openingLine: 'Hey, what\'s up? I\'ve got a few minutes before my next class. What can I do for you?' },
        initialConfidence: 25, resolveThreshold: 70 },
      { id: 'vo5', band: 'middle', title: 'Talking to Counselor Washington',
        desc: 'You were put in a class that conflicts with your reading support group. Nobody asked you. You need to talk to the counselor about changing your schedule.',
        authority: { name: 'Counselor Washington', emoji: '\uD83D\uDC69\u200D\uD83D\uDCBC', role: 'your school counselor',
          personality: 'Overworked but caring. She manages 400 students. She\'ll help if you make a clear case, but she needs to understand WHY the change matters, not just WHAT you want.',
          openingLine: 'Hi! Sorry about the wait \u2014 it\'s been a crazy week. What do you need help with?' },
        initialConfidence: 30, resolveThreshold: 70 },
      { id: 'vo6', band: 'middle', title: 'Asking Coach Rivera to Explain',
        desc: 'You were benched for the last two games without any explanation. You\'ve been at every practice and working hard. You want to understand why.',
        authority: { name: 'Coach Rivera', emoji: '\uD83E\uDDD1\u200D\uD83C\uDFEB', role: 'your coach',
          personality: 'Direct and no-nonsense. Respects athletes who advocate for themselves with maturity. Will explain decisions to students who ask respectfully.',
          openingLine: 'What\'s on your mind? Make it quick \u2014 practice starts in ten.' },
        initialConfidence: 25, resolveThreshold: 70 },
      { id: 'vo11', band: 'middle', title: 'Reporting Ongoing Harassment',
        desc: 'A group of students has been making comments about your appearance every day in the hallway. You\'ve tried ignoring it but it\'s getting worse. You\'re going to the assistant principal.',
        authority: { name: 'Mr. Brooks', emoji: '\uD83D\uDC68\u200D\uD83D\uDCBC', role: 'assistant principal',
          personality: 'Takes reports seriously but needs evidence and details to act. Will ask specific questions about dates, locations, and witnesses. Wants to help but follows procedure.',
          openingLine: 'Come in. I understand you wanted to talk about something. What\'s going on?' },
        initialConfidence: 25, resolveThreshold: 70 }
    ],
    high: [
      { id: 'vo7', band: 'high', title: 'Speaking at Your IEP Meeting',
        desc: 'Your IEP team wants to keep you in all resource classes, but you want to try a regular English class with support. The team is skeptical.',
        authority: { name: 'Dr. Hammond', emoji: '\uD83D\uDC69\u200D\uD83C\uDF93', role: 'special education coordinator',
          personality: 'Professional and data-driven. Genuinely wants what\'s best but tends to be cautious. Responds to evidence and specific plans. Will ask tough questions about readiness.',
          openingLine: 'Okay, we\'re here to review your IEP goals and placement for next year. We were thinking of continuing with the current resource class schedule. How does that sound to you?' },
        initialConfidence: 20, resolveThreshold: 75 },
      { id: 'vo8', band: 'high', title: 'Discussing a Grade with Professor Kim',
        desc: 'You received a C- on a research paper you worked hard on. Looking at the rubric, you believe the analysis section was graded inconsistently.',
        authority: { name: 'Professor Kim', emoji: '\uD83D\uDC68\u200D\uD83C\uDFEB', role: 'your AP teacher',
          personality: 'High standards, fair but firm. Values preparation and evidence. If you come with specifics, she\'ll listen carefully. If you come with complaints, she\'ll shut down.',
          openingLine: 'You wanted to discuss your paper grade? I have about 15 minutes. What questions do you have?' },
        initialConfidence: 30, resolveThreshold: 70 },
      { id: 'vo9', band: 'high', title: 'Negotiating with Supervisor Martinez',
        desc: 'Your boss keeps scheduling you during school hours despite your written availability. You need this job but can\'t keep missing class.',
        authority: { name: 'Supervisor Martinez', emoji: '\uD83D\uDC68\u200D\uD83D\uDCBC', role: 'your workplace supervisor',
          personality: 'Business-focused, stressed about staffing. Not trying to be unfair but prioritizes the store\'s needs. Responds to professionalism and solutions, not ultimatums.',
          openingLine: 'Look, I know you said you can\'t work mornings, but we\'re short-staffed. I need people who can be flexible. What are we going to do about this?' },
        initialConfidence: 25, resolveThreshold: 75 },
      { id: 'vo12', band: 'high', title: 'Challenging a Policy',
        desc: 'Your school banned all phone use, including during lunch. You have a medical condition that requires you to check a health monitoring app. You need an exception.',
        authority: { name: 'Dean Jackson', emoji: '\uD83D\uDC69\u200D\u2696\uFE0F', role: 'dean of students',
          personality: 'Rules-oriented and firm. She believes consistent enforcement is fairness. But she also understands medical necessity if you present documentation. Respects students who know the policy and make a clear case.',
          openingLine: 'I heard you have a concern about the phone policy. I want you to know the policy applies to everyone equally. What\'s your situation?' },
        initialConfidence: 20, resolveThreshold: 75 }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Power Phrases (quick-reference advocacy language) ──
  // ══════════════════════════════════════════════════════════════
  var POWER_PHRASES = {
    elementary: [
      { id: 'pp1', category: 'Asking for Help', phrase: '"I don\'t understand this part. Can you show me?"', when: 'When you\'re confused in class' },
      { id: 'pp2', category: 'Asking for Help', phrase: '"Could you explain that in a different way?"', when: 'When the first explanation didn\'t click' },
      { id: 'pp3', category: 'Stating a Need', phrase: '"I need a break. I\'m feeling overwhelmed."', when: 'When emotions are getting too big' },
      { id: 'pp4', category: 'Stating a Need', phrase: '"I can\'t see/hear from here. Can I move closer?"', when: 'When your seat isn\'t working' },
      { id: 'pp5', category: 'Setting a Boundary', phrase: '"Please stop. I don\'t like that."', when: 'When someone is bothering you' },
      { id: 'pp6', category: 'Setting a Boundary', phrase: '"That\'s not okay with me."', when: 'When something feels wrong' },
      { id: 'pp7', category: 'Reporting', phrase: '"I need to tell you something important."', when: 'When something unsafe is happening' },
      { id: 'pp8', category: 'Reporting', phrase: '"This has been happening a lot and I need help."', when: 'When a problem keeps coming back' },
      { id: 'pp9', category: 'Persistence', phrase: '"I told someone about this before and it\'s still happening."', when: 'When your first report didn\'t work' },
      { id: 'pp10', category: 'Persistence', phrase: '"Who else can I talk to about this?"', when: 'When the first person can\'t help' }
    ],
    middle: [
      { id: 'pp11', category: 'Accommodations', phrase: '"My plan includes this accommodation. Can we make sure it\'s set up?"', when: 'When an IEP/504 support is missing' },
      { id: 'pp12', category: 'Accommodations', phrase: '"This isn\'t a preference \u2014 it\'s something I\'m entitled to."', when: 'When someone questions your accommodation' },
      { id: 'pp13', category: 'Disagreeing', phrase: '"I understand your perspective, but I see it differently because..."', when: 'When you need to push back respectfully' },
      { id: 'pp14', category: 'Disagreeing', phrase: '"Can you walk me through how you made that decision?"', when: 'When a rule or grade seems unfair' },
      { id: 'pp15', category: 'Escalating', phrase: '"I\'d like to talk to [principal/counselor] about this."', when: 'When the first person isn\'t helping' },
      { id: 'pp16', category: 'Escalating', phrase: '"I\'d like this conversation documented, please."', when: 'When you need a record of what was said' },
      { id: 'pp17', category: 'Self-Awareness', phrase: '"I learn best when I can... Can we try that?"', when: 'When the teaching method isn\'t working for you' },
      { id: 'pp18', category: 'Self-Awareness', phrase: '"I\'m having a hard day. I need [specific thing] to get through this."', when: 'When you need temporary support' },
      { id: 'pp19', category: 'Boundaries', phrase: '"I\'m not comfortable with that. Here\'s what I need instead."', when: 'When someone crosses a line' },
      { id: 'pp20', category: 'Boundaries', phrase: '"Please don\'t share that about me. That\'s my information to share."', when: 'When someone violates your privacy' }
    ],
    high: [
      { id: 'pp21', category: 'Legal Rights', phrase: '"I believe this falls under [FERPA/Section 504/Title IX]. Can you clarify the school\'s process?"', when: 'When you need to invoke a legal protection' },
      { id: 'pp22', category: 'Legal Rights', phrase: '"I\'d like to understand my rights before agreeing to anything."', when: 'Before signing documents or accepting consequences' },
      { id: 'pp23', category: 'Meetings', phrase: '"I\'d like to be included in decisions about my education."', when: 'When adults are making decisions without you' },
      { id: 'pp24', category: 'Meetings', phrase: '"Can I have a moment to think about that before I respond?"', when: 'When you\'re pressured to decide on the spot' },
      { id: 'pp25', category: 'Professional', phrase: '"I want to find a solution that works for both of us."', when: 'When negotiating with employers or professors' },
      { id: 'pp26', category: 'Professional', phrase: '"I\'m putting this in writing so we both have a record."', when: 'When verbal agreements aren\'t enough' },
      { id: 'pp27', category: 'Mental Health', phrase: '"I\'m struggling and I need support, not judgment."', when: 'When reaching out for mental health help' },
      { id: 'pp28', category: 'Mental Health', phrase: '"This is affecting my ability to function. What resources are available?"', when: 'When you need accommodations for mental health' },
      { id: 'pp29', category: 'Systemic', phrase: '"I\'ve noticed a pattern of [issue]. I\'d like to discuss how to address it."', when: 'When the problem is bigger than one incident' },
      { id: 'pp30', category: 'Systemic', phrase: '"Other students are experiencing this too. This seems like a policy issue, not a personal one."', when: 'When advocating for systemic change' }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Self-Advocacy Practice Scripts (fill-in + TTS read-aloud) ──
  // ══════════════════════════════════════════════════════════════
  var SELF_ADVOCACY_SCRIPTS = {
    elementary: [
      { id: 'sas1', title: 'I Need Help With This', situation: 'You are working on an assignment and you don\'t understand what to do. You need to ask your teacher for help.',
        template: 'Excuse me, {teacher_name}. I am having trouble with {assignment}. Could you please help me understand {specific_part}? I learn better when {learning_style}.',
        blanks: [
          { key: 'teacher_name', label: 'Teacher\'s name', placeholder: 'Ms. Smith' },
          { key: 'assignment', label: 'The assignment', placeholder: 'the math worksheet' },
          { key: 'specific_part', label: 'What part confuses you', placeholder: 'how to carry the numbers' },
          { key: 'learning_style', label: 'How you learn best', placeholder: 'someone shows me an example first' }
        ],
        tips: ['Take a deep breath first', 'It is okay not to know \u2014 that is why school exists', 'Point to the exact part that confuses you'] },
      { id: 'sas2', title: 'Please Stop That', situation: 'Someone near you keeps doing something that is bothering you. It might be poking you, making noises, or taking your things.',
        template: 'I need you to please stop {behavior}. It is bothering me because {reason}. If it does not stop, I will need to tell {adult}.',
        blanks: [
          { key: 'behavior', label: 'What they are doing', placeholder: 'tapping my desk' },
          { key: 'reason', label: 'Why it bothers you', placeholder: 'I cannot focus on my work' },
          { key: 'adult', label: 'Which adult you would tell', placeholder: 'the teacher' }
        ],
        tips: ['Use a firm but calm voice', 'You do not need to explain twice', 'It is not mean to set a boundary'] },
      { id: 'sas3', title: 'Can I Have More Time?', situation: 'The teacher says time is almost up, but you are not finished. You need more time to do your best work.',
        template: '{teacher_name}, I am still working on {task}. I want to do my best but I need a little more time. Could I have {amount} more minutes, or finish it during {alternative_time}?',
        blanks: [
          { key: 'teacher_name', label: 'Teacher\'s name', placeholder: 'Mr. Johnson' },
          { key: 'task', label: 'What you are working on', placeholder: 'the writing assignment' },
          { key: 'amount', label: 'How many more minutes', placeholder: '5' },
          { key: 'alternative_time', label: 'Another time you could finish', placeholder: 'recess or lunch' }
        ],
        tips: ['Ask before time is up, not after', 'Show that you have been working, not playing', 'Offering to finish at another time shows responsibility'] },
      { id: 'sas4', title: 'Can You Explain Again?', situation: 'The teacher explained something, but you did not understand. You need them to explain it a different way.',
        template: 'Sorry, {teacher_name}, I did not quite understand that. Could you explain {topic} again? Maybe you could {alternative_method}? That usually helps me get it.',
        blanks: [
          { key: 'teacher_name', label: 'Teacher\'s name', placeholder: 'Mrs. Garcia' },
          { key: 'topic', label: 'What you did not understand', placeholder: 'the directions for the project' },
          { key: 'alternative_method', label: 'A different way to explain', placeholder: 'show me an example or draw a picture' }
        ],
        tips: ['Saying "I did not understand" is brave, not weak', 'Suggesting HOW to re-explain helps the teacher help you', 'Other kids probably did not get it either'] },
      { id: 'sas5', title: 'I Feel Left Out', situation: 'During group work or at recess, other kids are not including you. You feel lonely and want to be part of the group.',
        template: 'I have been feeling left out when {situation}. It makes me feel {feeling}. Could I join {activity}? I could help with {contribution}.',
        blanks: [
          { key: 'situation', label: 'When you feel left out', placeholder: 'we pick teams at recess' },
          { key: 'feeling', label: 'How it makes you feel', placeholder: 'sad and lonely' },
          { key: 'activity', label: 'What you want to join', placeholder: 'the soccer game' },
          { key: 'contribution', label: 'What you can add', placeholder: 'being the goalie' }
        ],
        tips: ['It is okay to ask to be included', 'Offering to contribute shows you are a team player', 'If kids say no, talk to an adult \u2014 you deserve to play too'] },
      { id: 'sas6', title: 'That\'s Not Fair Because...', situation: 'Something happened that feels unfair to you. Maybe the rules were not applied equally or someone got something you did not.',
        template: 'I think this might not be fair because {reason}. When {specific_example}, I felt {feeling}. Could we talk about {request}?',
        blanks: [
          { key: 'reason', label: 'Why it seems unfair', placeholder: 'I followed the rules but did not get the reward' },
          { key: 'specific_example', label: 'What specifically happened', placeholder: 'I raised my hand but someone who shouted out got called on' },
          { key: 'feeling', label: 'How you felt', placeholder: 'frustrated because I was trying to do the right thing' },
          { key: 'request', label: 'What you would like', placeholder: 'making sure everyone follows the same rules' }
        ],
        tips: ['Focus on the situation, not blaming a person', 'Use "I think" and "I feel" instead of "You always"', 'Fair does not always mean the same \u2014 it means what each person needs'] }
    ],
    middle: [
      { id: 'sas7', title: 'I\'d Like to Discuss My Grade', situation: 'You received a grade you think is wrong or unfair. You want to have a respectful conversation with the teacher about it.',
        template: 'Hi {teacher_name}, I would like to discuss my grade on {assignment}. I {effort_description}. Looking at the rubric, I am confused about {specific_question}. Could we review it together?',
        blanks: [
          { key: 'teacher_name', label: 'Teacher\'s name', placeholder: 'Ms. Thompson' },
          { key: 'assignment', label: 'The assignment', placeholder: 'the history essay' },
          { key: 'effort_description', label: 'What effort you put in', placeholder: 'spent three hours researching and followed the rubric closely' },
          { key: 'specific_question', label: 'What specifically confuses you', placeholder: 'why I lost points on the thesis section when I included all required elements' }
        ],
        tips: ['Bring your work and the rubric', 'Ask to understand, not to argue', 'Go at a calm time, not right when you get the grade back'] },
      { id: 'sas8', title: 'I Need Accommodations For...', situation: 'You have a documented need (IEP, 504, or medical) and need to make sure a teacher sets up your accommodation.',
        template: 'Hi {teacher_name}, I wanted to let you know that my {plan_type} includes {accommodation}. The upcoming {event} is on {date}. What do I need to do to make sure my accommodation is set up?',
        blanks: [
          { key: 'teacher_name', label: 'Teacher\'s name', placeholder: 'Mr. Chen' },
          { key: 'plan_type', label: 'Type of plan', placeholder: '504 plan' },
          { key: 'accommodation', label: 'The accommodation', placeholder: 'extended time and a quiet testing room' },
          { key: 'event', label: 'What it is for', placeholder: 'midterm exam' },
          { key: 'date', label: 'When it is', placeholder: 'next Thursday' }
        ],
        tips: ['Ask at least a week in advance', 'Know your plan \u2014 keep a copy on your phone', 'This is your legal right, not a favor'] },
      { id: 'sas9', title: 'I Disagree Respectfully Because...', situation: 'You have a different opinion than the teacher or another adult. You want to express it without being rude.',
        template: 'I understand your perspective that {their_position}. I see it differently because {your_reasoning}. I have noticed that {evidence}. Could we discuss {compromise_or_alternative}?',
        blanks: [
          { key: 'their_position', label: 'Their position or decision', placeholder: 'the homework policy is necessary' },
          { key: 'your_reasoning', label: 'Your reasoning', placeholder: 'some students have after-school responsibilities that make it impossible to complete two hours of homework' },
          { key: 'evidence', label: 'Evidence or observation', placeholder: 'several students are failing because of incomplete homework, not because they do not understand the material' },
          { key: 'compromise_or_alternative', label: 'A possible compromise', placeholder: 'allowing alternative ways to show understanding' }
        ],
        tips: ['Start by acknowledging their point of view', 'Use evidence, not just feelings', 'Propose an alternative, not just criticism'] },
      { id: 'sas10', title: 'I Need a Break Right Now', situation: 'You are feeling overwhelmed, anxious, or emotional in class. You need to step away before you lose control.',
        template: 'I am starting to feel {feeling} and I do not think I can focus right now. I need {request} so I can {purpose}. I will be back in {timeframe}.',
        blanks: [
          { key: 'feeling', label: 'What you are feeling', placeholder: 'really overwhelmed and anxious' },
          { key: 'request', label: 'What you need', placeholder: 'to step out for a few minutes' },
          { key: 'purpose', label: 'Why it will help', placeholder: 'calm down and reset so I can actually learn' },
          { key: 'timeframe', label: 'How long', placeholder: '5 minutes' }
        ],
        tips: ['Ask BEFORE you reach the breaking point', 'Giving a timeframe shows responsibility', 'Having a plan for where you will go helps adults trust you'] },
      { id: 'sas11', title: 'Can We Find a Compromise?', situation: 'You and a teacher or peer are at an impasse. Neither side is getting what they want. You want to find a middle ground.',
        template: 'I understand that you need {their_need}. I also need {your_need}. What if we tried {compromise}? That way {benefit_to_both}.',
        blanks: [
          { key: 'their_need', label: 'What they need', placeholder: 'everyone to present in front of the class' },
          { key: 'your_need', label: 'What you need', placeholder: 'a way to share my work that does not trigger my anxiety' },
          { key: 'compromise', label: 'Your proposed compromise', placeholder: 'I present to a small group, or I record a video presentation' },
          { key: 'benefit_to_both', label: 'How it helps everyone', placeholder: 'you can still assess my speaking skills and I can still show what I know' }
        ],
        tips: ['Name both sides\' needs \u2014 it shows empathy', 'Be specific about your compromise idea', 'If one compromise is rejected, have a backup'] },
      { id: 'sas12', title: 'I Feel Uncomfortable When...', situation: 'Someone is doing or saying something that makes you uncomfortable. It might not be bullying, but it crosses a line for you.',
        template: 'I need to tell you that I feel uncomfortable when {behavior}. It affects me because {impact}. I would like {request}. This is important to me.',
        blanks: [
          { key: 'behavior', label: 'What is happening', placeholder: 'people make jokes about my lunch or my food from home' },
          { key: 'impact', label: 'How it affects you', placeholder: 'I have stopped eating lunch at school and I am hungry all afternoon' },
          { key: 'request', label: 'What you want to happen', placeholder: 'the comments to stop, and maybe for the teacher to address respecting different cultures' }
        ],
        tips: ['You do not need to justify being uncomfortable', 'Naming the impact makes it real for the listener', 'If it continues after you speak up, it becomes a pattern worth reporting'] }
    ],
    high: [
      { id: 'sas13', title: 'Advocating for a Policy Change', situation: 'You have identified a school policy that is unfair or harmful. You want to formally advocate for it to be changed.',
        template: 'I am writing to advocate for a change to {policy}. This policy currently {current_impact}. I have gathered {evidence}. I propose {alternative}. I believe this would benefit {who_benefits} because {reasoning}.',
        blanks: [
          { key: 'policy', label: 'The policy', placeholder: 'the GPA requirement for extracurricular participation' },
          { key: 'current_impact', label: 'Its negative impact', placeholder: 'disproportionately excludes students with disabilities and those experiencing hardship' },
          { key: 'evidence', label: 'Evidence you have gathered', placeholder: 'data showing that 40% of affected students have documented disabilities or are in special education' },
          { key: 'alternative', label: 'Your proposed alternative', placeholder: 'a progress-based standard instead of a fixed GPA cutoff' },
          { key: 'who_benefits', label: 'Who it would help', placeholder: 'all students, especially those who use extracurriculars for college access and mental health' },
          { key: 'reasoning', label: 'Why it matters', placeholder: 'research shows that extracurricular participation actually improves academic outcomes' }
        ],
        tips: ['Data and research are your strongest tools', 'Propose alternatives, not just complaints', 'Know who has the power to change the policy and target your advocacy to them'] },
      { id: 'sas14', title: 'I Need to Set This Boundary', situation: 'Someone in your life \u2014 a friend, family member, teacher, or coworker \u2014 keeps crossing a boundary. You need to set it clearly.',
        template: 'I need to be direct about something. When {boundary_crossing}, it {impact_on_you}. Going forward, I need {boundary}. I value {relationship}, and this boundary actually helps me be {positive_outcome}.',
        blanks: [
          { key: 'boundary_crossing', label: 'What they keep doing', placeholder: 'you share my personal information with other people' },
          { key: 'impact_on_you', label: 'How it affects you', placeholder: 'makes me unable to trust you with anything important' },
          { key: 'boundary', label: 'The boundary you are setting', placeholder: 'you to keep what I tell you private unless I say otherwise' },
          { key: 'relationship', label: 'What you value about the relationship', placeholder: 'our friendship' },
          { key: 'positive_outcome', label: 'How the boundary helps', placeholder: 'a better, more trusting friend' }
        ],
        tips: ['Boundaries are not punishments \u2014 they are protection', 'You can set a boundary AND keep the relationship', 'If someone refuses to respect your boundary, that tells you something important about them'] },
      { id: 'sas15', title: 'I Want to Negotiate...', situation: 'You need to negotiate something \u2014 a work schedule, a deadline, a grade, a responsibility. You want a fair outcome for both sides.',
        template: 'I would like to discuss {topic}. My current situation is {current_state}. I am proposing {proposal} because {reasoning}. I am flexible on {flexible_point}, but I need {non_negotiable}. Can we find something that works for both of us?',
        blanks: [
          { key: 'topic', label: 'What you want to negotiate', placeholder: 'my work schedule for the school year' },
          { key: 'current_state', label: 'Your current situation', placeholder: 'I have AP classes that require significant study time and I cannot work more than 15 hours a week' },
          { key: 'proposal', label: 'What you are proposing', placeholder: 'working weekends and two weekday evenings' },
          { key: 'reasoning', label: 'Why this makes sense', placeholder: 'weekends are your busiest time and I am fully available then' },
          { key: 'flexible_point', label: 'What you can be flexible on', placeholder: 'which weekday evenings' },
          { key: 'non_negotiable', label: 'What you cannot budge on', placeholder: 'not working past 9 PM on school nights' }
        ],
        tips: ['Know your bottom line before you start', 'Show flexibility where you can \u2014 it builds goodwill', 'Put the agreement in writing afterward'] },
      { id: 'sas16', title: 'I\'m Reporting This Because...', situation: 'You need to formally report something \u2014 harassment, discrimination, a safety concern, or a policy violation. You want to do it effectively.',
        template: 'I am filing this report about {incident}. On {date}, at {location}, {what_happened}. This has been happening {frequency}. I have {evidence}. I am reporting this because {why_it_matters}. I would like {outcome}.',
        blanks: [
          { key: 'incident', label: 'Type of incident', placeholder: 'ongoing harassment by a coworker' },
          { key: 'date', label: 'When it happened', placeholder: 'March 15, and again on March 20 and March 22' },
          { key: 'location', label: 'Where', placeholder: 'in the break room and on the sales floor' },
          { key: 'what_happened', label: 'What happened (specific details)', placeholder: 'my coworker made repeated comments about my appearance and would not stop when asked' },
          { key: 'frequency', label: 'How often', placeholder: 'at least three times per week for the past month' },
          { key: 'evidence', label: 'Evidence', placeholder: 'text messages, a written log of dates and incidents, and one witness' },
          { key: 'why_it_matters', label: 'Why you are reporting', placeholder: 'it is creating a hostile work environment and affecting my ability to do my job' },
          { key: 'outcome', label: 'What you want done', placeholder: 'the behavior to stop and a written confirmation that my report has been received' }
        ],
        tips: ['Document EVERYTHING before you report', 'Keep copies of everything you submit', 'Know the chain of command: manager, HR, then external agencies', 'Retaliation for reporting is illegal \u2014 document that too if it happens'] },
      { id: 'sas17', title: 'I Need Support With...', situation: 'You are going through something hard and need to ask for support from school or work without oversharing.',
        template: 'I wanted to let you know that I am dealing with {general_description}. It has been affecting my {impact_area}. I do not need to go into all the details, but I would appreciate {specific_support}. I am working on {what_you_are_doing} and I expect to {timeline}.',
        blanks: [
          { key: 'general_description', label: 'General description (you control how much to share)', placeholder: 'a difficult family situation' },
          { key: 'impact_area', label: 'What it is affecting', placeholder: 'my ability to concentrate and meet deadlines' },
          { key: 'specific_support', label: 'What support you need', placeholder: 'some flexibility on the next two assignment deadlines' },
          { key: 'what_you_are_doing', label: 'What you are doing to manage it', placeholder: 'getting support from my counselor' },
          { key: 'timeline', label: 'Your expected timeline', placeholder: 'be back on track within two weeks' }
        ],
        tips: ['You control how much you share \u2014 nobody is entitled to your full story', 'Showing you have a plan builds trust', 'Asking for help is not weakness \u2014 it is wisdom'] },
      { id: 'sas18', title: 'My Perspective Is Different Because...', situation: 'In a discussion or meeting, your viewpoint differs from the majority. You want to share it in a way that gets heard, not dismissed.',
        template: 'I appreciate {what_others_said}. My perspective is different because {reason_for_difference}. From my experience, {your_perspective}. I think it is important to consider {what_to_consider} because {why_it_matters}.',
        blanks: [
          { key: 'what_others_said', label: 'What others shared', placeholder: 'the points that have been made about standardized testing' },
          { key: 'reason_for_difference', label: 'Why your view is different', placeholder: 'I have a learning disability that means standardized tests do not accurately reflect what I know' },
          { key: 'your_perspective', label: 'Your perspective', placeholder: 'alternative assessments like portfolios and projects give a much better picture of student learning' },
          { key: 'what_to_consider', label: 'What should be considered', placeholder: 'how testing affects students with disabilities' },
          { key: 'why_it_matters', label: 'Why it matters', placeholder: 'decisions made without diverse perspectives often have unintended consequences for marginalized groups' }
        ],
        tips: ['Start by validating what has been said \u2014 then add your view', 'Different perspectives are not wrong perspectives', 'Your lived experience IS evidence', 'If your voice is the only one saying this, it is even more important to say it'] }
    ]
  };

  // ══════════════════════════════════════════════════════════════
  // ── Advocacy Strength Assessment (self-assessment quiz) ──
  // ══════════════════════════════════════════════════════════════
  var ASSESSMENT_STATEMENTS = [
    { id: 'aq1', text: 'I can clearly state what I need to another person.', category: 'communication' },
    { id: 'aq2', text: 'I stay calm when advocating for myself, even when I am frustrated.', category: 'regulation' },
    { id: 'aq3', text: 'I can see the other person\'s perspective even when I disagree.', category: 'empathy' },
    { id: 'aq4', text: 'I know when a situation requires me to speak up versus let it go.', category: 'judgment' },
    { id: 'aq5', text: 'I can identify my own needs before trying to express them.', category: 'self_awareness' },
    { id: 'aq6', text: 'I follow up when my first attempt at advocacy does not work.', category: 'persistence' },
    { id: 'aq7', text: 'I know my legal rights as a student (IEP, 504, FERPA, etc.).', category: 'knowledge' },
    { id: 'aq8', text: 'I can advocate for others, not just myself.', category: 'empathy' },
    { id: 'aq9', text: 'I use evidence and examples when making my case, not just emotions.', category: 'communication' },
    { id: 'aq10', text: 'I feel confident that speaking up is worth it, even when it is hard.', category: 'confidence' }
  ];

  var ASSESSMENT_CATEGORIES = {
    communication: { label: 'Communication', icon: '\uD83D\uDDE3\uFE0F', tip: 'Practice using specific language: name the issue, describe the impact, make a clear request.' },
    regulation: { label: 'Self-Regulation', icon: '\uD83E\uDDD8', tip: 'Try taking a breath before speaking. Write down what you want to say before you say it.' },
    empathy: { label: 'Empathy & Perspective', icon: '\u2764\uFE0F', tip: 'Before advocating, ask yourself: what does the other person need? How can I address both our needs?' },
    judgment: { label: 'Judgment', icon: '\u2696\uFE0F', tip: 'Not everything needs a battle. Focus your energy on things that truly matter to your wellbeing or rights.' },
    self_awareness: { label: 'Self-Awareness', icon: '\uD83D\uDCAD', tip: 'Before speaking up, pause and ask: What do I actually need here? What would make this better?' },
    persistence: { label: 'Persistence', icon: '\uD83D\uDCAA', tip: 'If the first person cannot help, find someone who can. Keep a record of your attempts.' },
    knowledge: { label: 'Rights Knowledge', icon: '\uD83D\uDCDA', tip: 'Explore the Rights tab in this tool. Knowing what you are legally entitled to changes everything.' },
    confidence: { label: 'Confidence', icon: '\u2B50', tip: 'Confidence grows with practice. Start with low-stakes situations and work your way up.' }
  };

  // ══════════════════════════════════════════════════════════════
  // ── Letter / Email Template Builder ──
  // ══════════════════════════════════════════════════════════════
  var LETTER_TEMPLATES = [
    { id: 'lt1', title: 'Letter to a Teacher', recipient: 'Teacher', icon: '\uD83D\uDC69\u200D\uD83C\uDFEB',
      fields: [
        { key: 'teacher_name', label: 'Teacher\'s name', placeholder: 'Ms. Rodriguez' },
        { key: 'your_name', label: 'Your name', placeholder: 'Alex' },
        { key: 'issue', label: 'The issue or request', placeholder: 'I have been struggling to keep up with the reading pace in class' },
        { key: 'impact', label: 'How it is affecting you', placeholder: 'I am falling behind on assignments and my grades are dropping' },
        { key: 'request', label: 'What you are asking for', placeholder: 'extra time to complete reading assignments or access to audiobook versions' },
        { key: 'evidence', label: 'Supporting evidence', placeholder: 'My 504 plan includes extended time accommodations, and I have been meeting with my reading specialist weekly' }
      ],
      format: function(f) {
        return 'Dear ' + (f.teacher_name || '[Teacher Name]') + ',\n\n' +
          'I am writing to discuss something that has been affecting my learning. ' + (f.issue || '[Describe the issue]') + '. ' +
          'This has been impacting me because ' + (f.impact || '[Describe the impact]') + '.\n\n' +
          'I would like to request ' + (f.request || '[Your request]') + '. ' +
          'I believe this is reasonable because ' + (f.evidence || '[Supporting evidence]') + '.\n\n' +
          'I would appreciate the chance to discuss this with you. When would be a good time to meet?\n\n' +
          'Thank you for your time,\n' + (f.your_name || '[Your Name]');
      }
    },
    { id: 'lt2', title: 'Letter to a Principal', recipient: 'Principal', icon: '\uD83D\uDC68\u200D\uD83D\uDCBC',
      fields: [
        { key: 'principal_name', label: 'Principal\'s name', placeholder: 'Dr. Johnson' },
        { key: 'your_name', label: 'Your name', placeholder: 'Alex' },
        { key: 'issue', label: 'The issue', placeholder: 'inconsistent enforcement of the dress code policy' },
        { key: 'impact', label: 'How it affects students', placeholder: 'certain students are being dress-coded more often than others for the same outfits' },
        { key: 'request', label: 'What you are requesting', placeholder: 'a review of how the dress code is enforced and clearer written guidelines' },
        { key: 'evidence', label: 'Evidence or examples', placeholder: 'On March 5, I was dress-coded for a tank top, but three other students wore similar tops without consequence' }
      ],
      format: function(f) {
        return 'Dear ' + (f.principal_name || '[Principal Name]') + ',\n\n' +
          'I am writing to bring a concern to your attention regarding ' + (f.issue || '[the issue]') + '. ' +
          'This is affecting students because ' + (f.impact || '[describe the impact]') + '.\n\n' +
          'Specifically, ' + (f.evidence || '[provide evidence or examples]') + '.\n\n' +
          'I respectfully request ' + (f.request || '[your request]') + '. ' +
          'I believe this would benefit the entire school community.\n\n' +
          'I would welcome the opportunity to discuss this further. Thank you for considering this concern.\n\n' +
          'Respectfully,\n' + (f.your_name || '[Your Name]');
      }
    },
    { id: 'lt3', title: 'Letter to a Parent/Guardian', recipient: 'Parent', icon: '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67',
      fields: [
        { key: 'parent_name', label: 'Parent\'s name', placeholder: 'Mom' },
        { key: 'your_name', label: 'Your name', placeholder: 'Alex' },
        { key: 'issue', label: 'What you need to discuss', placeholder: 'I have been feeling really anxious about school lately' },
        { key: 'impact', label: 'How it is affecting you', placeholder: 'I am not sleeping well and I dread going to school in the morning' },
        { key: 'request', label: 'What you need from them', placeholder: 'to talk to a counselor or therapist about what I am going through' },
        { key: 'evidence', label: 'What you have already tried', placeholder: 'I have been trying deep breathing and journaling, but it is not enough' }
      ],
      format: function(f) {
        return 'Dear ' + (f.parent_name || '[Parent/Guardian]') + ',\n\n' +
          'I want to talk to you about something important. ' + (f.issue || '[What you need to discuss]') + '. ' +
          'It has been affecting me: ' + (f.impact || '[How it affects you]') + '.\n\n' +
          'I have already tried ' + (f.evidence || '[what you have done so far]') + ', but I think I need more support.\n\n' +
          'What I am asking for is ' + (f.request || '[your request]') + '. ' +
          'This is hard to bring up, but I trust you and I need your help.\n\n' +
          'Love,\n' + (f.your_name || '[Your Name]');
      }
    },
    { id: 'lt4', title: 'Letter to an Employer', recipient: 'Employer', icon: '\uD83C\uDFE2',
      fields: [
        { key: 'employer_name', label: 'Employer\'s name', placeholder: 'Mr. Martinez' },
        { key: 'your_name', label: 'Your name', placeholder: 'Alex' },
        { key: 'issue', label: 'The issue', placeholder: 'I have been scheduled during school hours three times this month' },
        { key: 'impact', label: 'How it affects you', placeholder: 'I am missing important classes and my grades are suffering' },
        { key: 'request', label: 'What you are requesting', placeholder: 'a consistent schedule that respects my school hours of 7:30 AM to 2:30 PM' },
        { key: 'evidence', label: 'Supporting information', placeholder: 'State labor law requires that minors attend school during required hours, and my availability was submitted during hiring' }
      ],
      format: function(f) {
        return 'Dear ' + (f.employer_name || '[Employer Name]') + ',\n\n' +
          'I am writing to address a scheduling concern. ' + (f.issue || '[Describe the issue]') + '. ' +
          'This is affecting me because ' + (f.impact || '[Describe the impact]') + '.\n\n' +
          'I am committed to being a reliable employee. ' + (f.evidence || '[Supporting information]') + '.\n\n' +
          'I am requesting ' + (f.request || '[Your request]') + '. ' +
          'I am happy to discuss this in person and find a solution that works for both of us.\n\n' +
          'Thank you for your understanding,\n' + (f.your_name || '[Your Name]');
      }
    }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Badges ──
  // ══════════════════════════════════════════════════════════════
  var BADGES = [
    { id: 'first_advocate',     icon: '\uD83D\uDCE2', name: 'First Voice',           desc: 'Complete your first advocacy scenario' },
    { id: 'advocate_5',         icon: '\uD83D\uDCAA', name: 'Growing Advocate',       desc: 'Complete 5 advocacy scenarios' },
    { id: 'assertive_advocate', icon: '\u2B50',        name: 'Assertive Advocate',     desc: 'Choose the assertive option 3 times in a row' },
    { id: 'first_script',       icon: '\uD83D\uDCDD', name: 'Script Starter',         desc: 'Complete your first advocacy script' },
    { id: 'script_5',           icon: '\uD83D\uDCDC', name: 'Script Master',          desc: 'Complete 5 advocacy scripts' },
    { id: 'first_rights',       icon: '\u2696\uFE0F', name: 'Rights Explorer',        desc: 'Explore your first rights card' },
    { id: 'rights_all',         icon: '\uD83D\uDCDA', name: 'Rights Scholar',         desc: 'Explore all rights in your grade band' },
    { id: 'first_voice',        icon: '\uD83C\uDFA4', name: 'Voice Found',            desc: 'Complete your first AI voice practice' },
    { id: 'voice_resolved',     icon: '\uD83C\uDF89', name: 'Heard & Understood',     desc: 'Successfully advocate in voice practice' },
    { id: 'voice_5',            icon: '\uD83C\uDF1F', name: 'Confident Speaker',      desc: 'Complete 5 voice practice sessions' },
    { id: 'total_10',           icon: '\uD83C\uDFC6', name: 'Advocacy Champion',      desc: 'Complete 10 activities across all tabs' },
    { id: 'total_20',           icon: '\uD83D\uDC8E', name: 'Advocacy Leader',        desc: 'Complete 20 activities across all tabs' },
    { id: 'phrase_explorer',    icon: '\uD83D\uDCAC', name: 'Phrase Collector',       desc: 'Practice 5 power phrases' },
    { id: 'advocate_10',        icon: '\uD83C\uDF1F', name: 'Seasoned Advocate',      desc: 'Complete 10 advocacy scenarios' },
    { id: 'sas_master',         icon: '\uD83D\uDCDC', name: 'Script Master',          desc: 'Practice 5 self-advocacy scripts' },
    { id: 'scenario_champion',  icon: '\uD83C\uDFC6', name: 'Scenario Champion',      desc: 'Complete 15 advocacy scenarios' },
    { id: 'assessment_done',    icon: '\uD83D\uDCCA', name: 'Assessment Complete',    desc: 'Complete the advocacy strength assessment' },
    { id: 'letter_writer',      icon: '\u2709\uFE0F', name: 'Letter Writer',          desc: 'Create a formal advocacy letter' },
    { id: 'advocacy_leader',    icon: '\uD83C\uDF1F', name: 'Advocacy Master',        desc: 'Earn 10 badges total' },
    { id: 'sas_all_band',       icon: '\uD83D\uDC51', name: 'Script Expert',          desc: 'Practice all scripts in your grade band' }
  ];

  // ══════════════════════════════════════════════════════════════
  // ── Register Tool ──
  // ══════════════════════════════════════════════════════════════
  window.SelHub.registerTool('advocacy', {
    icon: '\uD83D\uDCE2',
    label: 'Self-Advocacy Workshop',
    desc: 'Learn to speak up for your needs with advocacy scenarios, script templates, rights education, and AI-powered voice practice.',
    color: 'indigo',
    category: 'self-management',
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
      var band = ctx.gradeBand || 'elementary';
      var onSafetyFlag = ctx.onSafetyFlag || null;

      // ── Tool-scoped state ──
      var d = (ctx.toolData && ctx.toolData.advocacy) || {};
      var upd = function(key, val) {
        if (typeof key === 'object') { if (ctx.updateMulti) ctx.updateMulti('advocacy', key); }
        else { if (ctx.update) ctx.update('advocacy', key, val); }
      };

      var activeTab     = d.activeTab || 'scenarios';
      var soundEnabled  = d.soundEnabled != null ? d.soundEnabled : true;

      // Scenarios state
      var scIdx          = d.scIdx || 0;
      var scChoice       = d.scChoice != null ? d.scChoice : null;
      var scCompleted    = d.scCompleted || 0;
      var scAssertive    = d.scAssertive || 0;

      // Script Builder state
      var stIdx          = d.stIdx || 0;
      var stParts        = d.stParts || {};
      var stRevealed     = d.stRevealed || false;
      var stCompleted    = d.stCompleted || 0;

      // Rights state
      var rtIdx          = d.rtIdx || 0;
      var rtRevealed     = d.rtRevealed || false;
      var rtViewed       = d.rtViewed || 0;
      var rtViewedSet    = d.rtViewedSet || {};

      // Voice Practice state
      var voMode         = d.voMode || null;
      var voScenarioIdx  = d.voScenarioIdx || 0;
      var voChatHistory  = d.voChatHistory || [];
      var voConfidence   = d.voConfidence != null ? d.voConfidence : 30;
      var voTurnCount    = d.voTurnCount || 0;
      var voLoading      = d.voLoading || false;
      var voInputText    = d.voInputText || '';
      var _voUserTier    = d._voUserTier || 0;
      var voCompleted    = d.voCompleted || 0;
      var voResolveStreak = d.voResolveStreak || 0;

      // Power Phrases state
      var ppPracticed    = d.ppPracticed || {};
      var ppCount        = Object.keys(d.ppPracticed || {}).length;

      // Self-Advocacy Scripts state
      var sasIdx         = d.sasIdx || 0;
      var sasParts       = d.sasParts || {};
      var sasCompleted   = d.sasCompleted || 0;
      var sasPracticedSet = d.sasPracticedSet || {};
      var sasPracticeMode = d.sasPracticeMode || false;

      // Assessment state
      var assessAnswers  = d.assessAnswers || {};
      var assessDone     = d.assessDone || false;

      // Letter Builder state
      var ltIdx          = d.ltIdx || 0;
      var ltFields       = d.ltFields || {};
      var ltCompleted    = d.ltCompleted || 0;
      var ltPreview      = d.ltPreview || false;

      // Practice log & badges
      var practiceLog    = d.practiceLog || [];
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
        var totalActivities = scCompleted + stCompleted + rtViewed + voCompleted + ppCount + sasCompleted + ltCompleted + (assessDone ? 1 : 0);
        if (totalActivities + 1 >= 10) tryAwardBadge('total_10');
        if (totalActivities + 1 >= 20) tryAwardBadge('total_20');
        if (Object.keys(earnedBadges).length >= 10) tryAwardBadge('advocacy_leader');
      }

      var ACCENT = '#6366f1';
      var ACCENT_DIM = '#6366f122';
      var ACCENT_MED = '#6366f144';

      // ══════════════════════════════════════════════════════════
      // ── Tab Bar ──
      // ══════════════════════════════════════════════════════════
      var tabs = [
        { id: 'scenarios', label: '\uD83D\uDCE2 Scenarios' },
        { id: 'scripts',   label: '\uD83D\uDCDD Scripts' },
        { id: 'advocacy_scripts', label: '\uD83C\uDFA4 Practice' },
        { id: 'rights',    label: '\u2696\uFE0F Rights' },
        { id: 'voice',     label: '\uD83C\uDFA4 Voice' },
        { id: 'phrases',   label: '\uD83D\uDCAC Phrases' },
        { id: 'assessment', label: '\uD83D\uDCCB Quiz' },
        { id: 'letters',   label: '\u2709\uFE0F Letters' },
        { id: 'progress',  label: '\uD83D\uDCCA Progress' }
      ];

      var tabBar = h('div', {         role: 'tablist', 'aria-label': 'Self-Advocacy tabs',
        style: { display: 'flex', gap: 2, padding: '10px 12px', borderBottom: '1px solid #334155', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }
      },
        tabs.map(function(t) {
          var isActive = activeTab === t.id;
          return h('button', { 'aria-label': t.label,
            key: t.id,
            onClick: function() { upd('activeTab', t.id); if (soundEnabled) sfxClick(); },
            'aria-selected': isActive, role: 'tab',
            style: {
              padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: isActive ? 700 : 500, whiteSpace: 'nowrap',
              background: isActive ? ACCENT_DIM : 'transparent', color: isActive ? ACCENT : '#94a3b8', transition: 'all 0.15s'
            }
          }, t.label);
        }),
        h('button', { onClick: function() { upd('soundEnabled', !soundEnabled); }, style: { marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#94a3b8' }, title: soundEnabled ? 'Mute' : 'Unmute' }, soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'),
        h('button', { 'aria-label': 'Toggle panel', onClick: function() { upd('showBadgesPanel', !showBadgesPanel); }, style: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', color: '#94a3b8', position: 'relative' } },
          '\uD83C\uDFC5',
          Object.keys(earnedBadges).length > 0 && h('span', { style: { position: 'absolute', top: 0, right: 0, background: ACCENT, color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' } }, Object.keys(earnedBadges).length)
        )
      );

      // ── Topic-accent hero band per tab ──
      var heroBand = (function() {
        var TAB_META = {
          scenarios:        { accent: '#0ea5e9', soft: 'rgba(14,165,233,0.14)', icon: '\uD83D\uDCE2', title: 'Scenarios \u2014 \u201CHere\u2019s the moment, what do I do?\u201D',  hint: 'Self-advocacy = naming what you need + asking for it. Practice on low-stakes situations builds the muscle for higher-stakes ones (IEP meetings, doctor visits, jobs). The first \u201Cno\u201D is the hardest one.' },
          scripts:          { accent: '#10b981', soft: 'rgba(16,185,129,0.14)', icon: '\uD83D\uDCDD', title: 'Scripts \u2014 borrowed words for hard moments',           hint: 'Pre-written sentences to start a tough ask: \u201CI noticed\u2026\u201D, \u201CCan we talk about\u2026\u201D, \u201CI need\u2026 because\u2026\u201D. Reading off paper IS allowed and counts. Implementation intentions (Gollwitzer 1999) double follow-through.' },
          advocacy_scripts: { accent: '#9333ea', soft: 'rgba(147,51,234,0.14)', icon: '\uD83C\uDFA4', title: 'Practice \u2014 say it out loud first',                  hint: 'Bandura: behavioral rehearsal predicts self-efficacy more than any other variable. Hearing yourself say it makes the real version 10\u00d7 easier. Use the AI partner; the bathroom mirror; record + play back.' },
          rights:           { accent: '#dc2626', soft: 'rgba(220,38,38,0.14)',  icon: '\u2696',         title: 'Rights \u2014 the law has your back',                   hint: 'IDEA (FAPE + LRE), Section 504, ADA, FERPA. You have the RIGHT to ask, the right to bring a parent / advocate, the right to a formal complaint. Knowing the rule changes the room. ada.gov + ed.gov are free.' },
          voice:            { accent: '#f59e0b', soft: 'rgba(245,158,11,0.14)', icon: '\uD83C\uDFA4', title: 'Voice \u2014 your tone IS information',                  hint: 'Calm + specific + asking-not-demanding lands better than loud + vague + ultimatum. Volume up = listener defenses up. Practice saying the same words 3 ways: pleading, demanding, calmly assertive. Last one wins.' },
          phrases:          { accent: '#ec4899', soft: 'rgba(236,72,153,0.14)', icon: '\uD83D\uDCAC', title: 'Phrases \u2014 your back-pocket arsenal',                hint: '\u201CCan you say more about that?\u201D \u201CI need a minute to think.\u201D \u201CThat doesn\u2019t work for me \u2014 here\u2019s what would.\u201D Memorize 5; pull them out under stress. Reduces \u201Cspoke when I shouldn\u2019t / froze when I should.\u201D' },
          assessment:       { accent: '#0891b2', soft: 'rgba(8,145,178,0.14)',  icon: '\uD83D\uDCCB', title: 'Quiz \u2014 self-knowledge check',                       hint: 'When do you advocate for yourself well? When do you fold? Pattern recognition is half the work; the other half is one specific situation you commit to handling differently next time. Start small.' },
          letters:          { accent: '#a855f7', soft: 'rgba(168,85,247,0.14)', icon: '\u2709',         title: 'Letters \u2014 paper has weight phone calls don\u2019t',  hint: 'Formal letter = creates a record; harder to brush off. Useful for IEP requests, accommodation appeals, school grievances. Even an email saved as PDF is heavier than a verbal ask. The system listens to documentation.' },
          progress:         { accent: '#d97706', soft: 'rgba(217,119,6,0.14)',  icon: '\uD83D\uDCCA', title: 'Progress \u2014 advocacy gets easier',                   hint: 'Track wins + struggles over weeks. Patterns emerge: which settings, which people, which asks. Confidence builds from accumulated small wins, not from a single big breakthrough. Show this log to your support people.' }
        };
        var meta = TAB_META[activeTab] || TAB_META.scenarios;
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
            h('p', { style: { margin: '3px 0 0', color: '#cbd5e1', fontSize: 11, lineHeight: 1.45, fontStyle: 'italic' } }, meta.hint)
          )
        );
      })();

      // ── Badge Popup ──
      var badgePopup = null;
      if (showBadgePopup) {
        var popBadge = BADGES.find(function(b) { return b.id === showBadgePopup; });
        if (popBadge) {
          badgePopup = h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(0,0,0,0.6)' }, onClick: function() { upd('showBadgePopup', null); } },
            h('div', { style: { background: '#1e293b', border: '2px solid ' + ACCENT, borderRadius: 20, padding: '32px 40px', textAlign: 'center', maxWidth: 300 } },
              h('div', { style: { fontSize: 56, marginBottom: 10 } }, popBadge.icon),
              h('div', { style: { fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 } }, popBadge.name),
              h('div', { style: { fontSize: 12, color: '#94a3b8' } }, popBadge.desc)
            )
          );
        }
      }
      if (showBadgesPanel) {
        badgePopup = h('div', { style: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9998, background: 'rgba(0,0,0,0.5)' }, onClick: function() { upd('showBadgesPanel', false); } },
          h('div', { onClick: function(e) { e.stopPropagation(); }, style: { background: '#1e293b', border: '1px solid #334155', borderRadius: 16, padding: 24, width: '90%', maxWidth: 400, maxHeight: '70vh', overflow: 'auto' } },
            h('h3', { style: { textAlign: 'center', color: '#f1f5f9', marginBottom: 16, fontSize: 16 } }, '\uD83C\uDFC5 Badges (' + Object.keys(earnedBadges).length + '/' + BADGES.length + ')'),
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 } },
              BADGES.map(function(b) {
                var earned = !!earnedBadges[b.id];
                return h('div', { key: b.id, style: { padding: 12, borderRadius: 10, background: earned ? '#0f172a' : '#0f172a88', border: '1px solid ' + (earned ? ACCENT_MED : '#334155'), textAlign: 'center', opacity: earned ? 1 : 0.5 } },
                  h('div', { style: { fontSize: 28 } }, earned ? b.icon : '\uD83D\uDD12'),
                  h('div', { style: { fontSize: 11, fontWeight: 600, color: earned ? '#f1f5f9' : '#94a3b8', marginTop: 4 } }, b.name),
                  h('div', { style: { fontSize: 10, color: '#94a3b8', marginTop: 2 } }, b.desc)
                );
              })
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Advocacy Scenarios ──
      // ══════════════════════════════════════════════════════════
      var scenariosContent = null;
      if (activeTab === 'scenarios') {
        var scScenarios = ADVOCACY_SCENARIOS[band] || ADVOCACY_SCENARIOS.elementary;
        var curSc = scScenarios[scIdx % scScenarios.length];
        var styleColors = { silent: '#f59e0b', aggressive: '#ef4444', assertive: '#22c55e' };
        var styleLabels = { silent: 'Silent', aggressive: 'Aggressive', assertive: 'Assertive' };

        scenariosContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCE2 Advocacy Scenarios'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Read the situation, choose how to respond, and see what happens.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Scenario ' + ((scIdx % scScenarios.length) + 1) + ' of ' + scScenarios.length + (scCompleted > 0 ? ' \u00B7 ' + scCompleted + ' completed' : '')
          ),
          h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 15, marginBottom: 8, fontWeight: 700 } }, curSc.title),
            h('div', { style: { marginBottom: 10 } },
              h('span', { style: { fontSize: 10, background: '#1e293b', padding: '3px 8px', borderRadius: 6, color: '#94a3b8' } }, '\uD83D\uDC64 Advocate to: ' + curSc.who)
            ),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.7 } }, curSc.setup)
          ),
          h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 } },
            curSc.branches.map(function(br, i) {
              var isChosen = scChoice === i;
              return h('div', { key: i },
                h('button', { 'aria-label': br.label,
                  onClick: function() {
                    upd('scChoice', i);
                    if (soundEnabled) { if (br.style === 'assertive') sfxCorrect(); else if (br.style === 'aggressive') sfxWrong(); else sfxClick(); }
                  },
                  style: {
                    width: '100%', padding: '12px 16px', borderRadius: 10, border: '2px solid ' + (isChosen ? styleColors[br.style] : '#334155'),
                    background: isChosen ? styleColors[br.style] + '15' : '#1e293b', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', textAlign: 'left'
                  }
                }, br.label),
                isChosen && h('div', { style: { margin: '8px 0 0 16px', padding: 12, borderRadius: 10, borderLeft: '3px solid ' + styleColors[br.style], background: '#0f172a' } },
                  h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 } },
                    h('span', { style: { fontSize: 10, fontWeight: 700, color: styleColors[br.style], textTransform: 'uppercase', letterSpacing: '0.05em' } }, styleLabels[br.style]),
                    h('span', { style: { color: '#94a3b8' } }, '\u2B50'.repeat(br.rating))
                  ),
                  h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, br.outcome)
                )
              );
            })
          ),
          scChoice != null && h('div', { style: { textAlign: 'center' } },
            h('button', { 'aria-label': 'Next Scenario',
              onClick: function() {
                var newDone = scCompleted + 1;
                var branch = curSc.branches[scChoice];
                var newStreak = branch.style === 'assertive' ? scAssertive + 1 : 0;
                upd({ scCompleted: newDone, scAssertive: newStreak, scIdx: scIdx + 1, scChoice: null });
                logPractice('scenario', curSc.id);
                awardXP(15);
                tryAwardBadge('first_advocate');
                if (newDone >= 5) tryAwardBadge('advocate_5');
                if (newDone >= 10) tryAwardBadge('advocate_10');
                if (newDone >= 15) tryAwardBadge('scenario_champion');
                if (newStreak >= 3) tryAwardBadge('assertive_advocate');
                if (soundEnabled) sfxResolve();
                ctx.announceToSR && ctx.announceToSR('Next advocacy scenario loaded');
              },
              style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next Scenario \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Script Builder ──
      // ════════��═════════════════════════════════════════════════
      var scriptsContent = null;
      if (activeTab === 'scripts') {
        var stTemplates = SCRIPT_TEMPLATES[band] || SCRIPT_TEMPLATES.elementary;
        var curSt = stTemplates[stIdx % stTemplates.length];
        var allFilled = curSt.parts.filter(function(p) { return p.type === 'blank'; }).every(function(p) { return stParts[p.key] && stParts[p.key].trim(); });

        scriptsContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCDD Script Builder'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Fill in the blanks to build a script you can actually use.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Template ' + ((stIdx % stTemplates.length) + 1) + ' of ' + stTemplates.length + (stCompleted > 0 ? ' \u00B7 ' + stCompleted + ' completed' : '')
          ),
          // Context card
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 14, marginBottom: 6, fontWeight: 700 } }, curSt.title),
            h('p', { style: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' } }, curSt.context)
          ),
          // Fill-in-the-blank area
          h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 } }, 'Build Your Script'),
            curSt.parts.map(function(part, pi) {
              if (part.type === 'text') {
                return h('span', { key: pi, style: { fontSize: 14, color: '#e2e8f0', lineHeight: 2 } }, part.content);
              }
              return h('input', {
                key: pi, type: 'text',
                'aria-label': part.placeholder,
                value: stParts[part.key] || '',
                onChange: function(e) {
                  var newParts = Object.assign({}, stParts);
                  newParts[part.key] = e.target.value;
                  upd('stParts', newParts);
                },
                placeholder: part.placeholder,
                style: { display: 'inline-block', width: Math.max(150, (part.placeholder.length * 8)) + 'px', maxWidth: '100%', padding: '4px 8px', margin: '2px 4px', borderRadius: 6, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', verticalAlign: 'baseline' }
              });
            })
          ),
          // Live preview
          allFilled && h('div', { style: { padding: 14, borderRadius: 12, background: '#22c55e08', border: '1px solid #22c55e33', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Your Script'),
            h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.8, fontStyle: 'italic' } },
              '\u201C' + curSt.parts.map(function(p) { return p.type === 'text' ? p.content : (stParts[p.key] || '___'); }).join('') + '\u201D'
            )
          ),
          // Tips
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDCA1 Tips'),
            curSt.tips.map(function(tip, ti) {
              return h('div', { key: ti, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 4, paddingLeft: 12 } }, '\u2022 ' + tip);
            })
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' } },
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() { upd('stRevealed', true); if (soundEnabled) sfxReveal(); },
              disabled: stRevealed,
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: stRevealed ? '#334155' : '#6366f1', color: '#fff', fontWeight: 600, fontSize: 13, cursor: stRevealed ? 'default' : 'pointer' }
            }, stRevealed ? 'Example shown \u2193' : '\uD83D\uDCA1 Show Example'),
            h('button', { 'aria-label': 'Complete & Next',
              onClick: function() {
                if (!allFilled) { addToast('Fill in all the blanks first!', 'info'); return; }
                var newDone = stCompleted + 1;
                upd('stCompleted', newDone);
                logPractice('script', curSt.id);
                awardXP(15);
                tryAwardBadge('first_script');
                if (newDone >= 5) tryAwardBadge('script_5');
                if (soundEnabled) sfxCorrect();
                addToast('Script saved! Use it in real life.', 'success');
                upd({ stIdx: stIdx + 1, stParts: {}, stRevealed: false });
                ctx.announceToSR && ctx.announceToSR('Next script template loaded');
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '\u2705 Complete & Next')
          ),
          // Example reveal
          stRevealed && h('div', { style: { padding: 16, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginTop: 12 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Example Script'),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, fontStyle: 'italic' } },
              '\u201C' + curSt.parts.map(function(p) { return p.type === 'text' ? p.content : (curSt.example[p.key] || ''); }).join('') + '\u201D'
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Know Your Rights ──
      // ══════════════════════════════════════════════════════════
      var rightsContent = null;
      if (activeTab === 'rights') {
        var rtCards = RIGHTS_CARDS[band] || RIGHTS_CARDS.elementary;
        var curRt = rtCards[rtIdx % rtCards.length];

        rightsContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u2696\uFE0F Know Your Rights'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Tap a card to learn about your rights as a student.'),
          // Card selector
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
            rtCards.map(function(card, ci) {
              var isViewed = !!rtViewedSet[card.id];
              var isCurrent = (rtIdx % rtCards.length) === ci;
              return h('button', { 'aria-label': card.icon,
                key: card.id,
                onClick: function() { upd({ rtIdx: ci, rtRevealed: false }); if (soundEnabled) sfxClick(); },
                style: { padding: 12, borderRadius: 10, border: '2px solid ' + (isCurrent ? ACCENT : isViewed ? '#334155' : '#33415566'), background: isCurrent ? ACCENT_DIM : '#1e293b', cursor: 'pointer', textAlign: 'center' }
              },
                h('div', { style: { fontSize: 24, marginBottom: 4 } }, card.icon),
                h('div', { style: { fontSize: 11, fontWeight: 600, color: isCurrent ? ACCENT : '#e2e8f0' } }, card.title),
                isViewed && h('div', { style: { fontSize: 11, color: '#22c55e', marginTop: 2 } }, '\u2713 Viewed')
              );
            })
          ),
          // Active card
          !rtRevealed && h('div', Object.assign({
            'aria-label': 'Reveal right: ' + curRt.title,
            style: { padding: 24, borderRadius: 16, background: '#0f172a', border: '2px dashed ' + ACCENT_MED, cursor: 'pointer', textAlign: 'center' }
          }, a11yClick(function() {
              upd('rtRevealed', true);
              if (!rtViewedSet[curRt.id]) {
                var newSet = Object.assign({}, rtViewedSet);
                newSet[curRt.id] = true;
                var newViewed = rtViewed + 1;
                upd({ rtViewedSet: newSet, rtViewed: newViewed });
                logPractice('rights', curRt.id);
                awardXP(10);
                tryAwardBadge('first_rights');
                if (Object.keys(newSet).length >= rtCards.length) tryAwardBadge('rights_all');
              }
              if (soundEnabled) sfxReveal();
          })),
            h('div', { style: { fontSize: 40, marginBottom: 8 } }, curRt.icon),
            h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9', marginBottom: 8 } }, curRt.title),
            h('p', { style: { fontSize: 14, color: '#e2e8f0', lineHeight: 1.6, marginBottom: 12 } }, curRt.right),
            h('div', { style: { fontSize: 12, color: ACCENT } }, 'Tap to learn more \u2192')
          ),
          // Revealed detail
          rtRevealed && h('div', { style: { padding: 20, borderRadius: 16, background: '#0f172a', border: '1px solid ' + ACCENT_MED } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
              h('span', { style: { fontSize: 32 } }, curRt.icon),
              h('div', null,
                h('div', { style: { fontSize: 16, fontWeight: 700, color: '#f1f5f9' } }, curRt.title),
                h('div', { style: { fontSize: 12, color: ACCENT, fontWeight: 600 } }, curRt.right)
              )
            ),
            h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.7, marginBottom: 14 } }, curRt.explanation),
            h('div', { style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid #334155', marginBottom: 14 } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, fontWeight: 700 } }, 'Real-World Example'),
              h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6, fontStyle: 'italic' } }, curRt.example)
            ),
            h('div', { style: { fontSize: 10, color: '#94a3b8', fontStyle: 'italic' } }, '\uD83D\uDCCC Source: ' + curRt.source),
            h('div', { style: { textAlign: 'center', marginTop: 14 } },
              h('button', { 'aria-label': 'Next Right',
                onClick: function() { upd({ rtIdx: (rtIdx + 1) % rtCards.length, rtRevealed: false }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Next Right \u2192')
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Voice Practice (AI-powered advocacy role-play) ──
      // ══════════════════════════════════════════════════════════
      var voiceContent = null;
      if (activeTab === 'voice') {
        var voScenarios = VOICE_SCENARIOS[band] || VOICE_SCENARIOS.elementary;
        var curVo = voScenarios[voScenarioIdx % voScenarios.length];

        function confidenceBar(val) {
          var pct = Math.max(0, Math.min(100, val));
          var color = pct < 30 ? '#ef4444' : pct < 60 ? '#f59e0b' : '#22c55e';
          return h('div', { style: { marginBottom: 12 } },
            h('div', { style: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 } },
              h('span', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600 } }, 'Confidence'),
              h('span', { style: { fontSize: 11, color: color, fontWeight: 700 } }, pct + '/100')
            ),
            h('div', { style: { height: 8, borderRadius: 4, background: '#1e293b' } },
              h('div', { role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', style: { height: '100%', borderRadius: 4, background: color, width: pct + '%', transition: 'width 0.4s' } })
            )
          );
        }

        function chatBubble(msg, isUser, emoji) {
          return h('div', { style: { display: 'flex', gap: 8, marginBottom: 10, flexDirection: isUser ? 'row-reverse' : 'row', alignItems: 'flex-start' } },
            h('div', { style: { width: 32, height: 32, borderRadius: '50%', background: isUser ? ACCENT + '33' : '#33415533', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 } }, isUser ? '\uD83E\uDDD1' : (emoji || '\uD83E\uDD16')),
            h('div', { style: { maxWidth: '75%', padding: '10px 14px', borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isUser ? ACCENT + '22' : '#1e293b', border: '1px solid ' + (isUser ? ACCENT + '44' : '#334155') } },
              h('p', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.6, margin: 0 } }, msg)
            )
          );
        }

        // Scenario Selection
        if (!voMode) {
          voiceContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
            h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFA4 Voice Practice'),
            h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Practice advocating with AI-powered authority figures. Build confidence through conversation.'),
            voCompleted > 0 && h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } }, voCompleted + ' sessions completed'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
              voScenarios.map(function(sc, si) {
                return h('button', { 'aria-label': sc.authority.emoji,
                  key: sc.id,
                  onClick: function() {
                    upd({ voScenarioIdx: si, voMode: 'chat', voChatHistory: [{ role: 'authority', text: sc.authority.openingLine }], voConfidence: sc.initialConfidence, voTurnCount: 0, voInputText: '' });
                    if (soundEnabled) sfxClick();
                  },
                  style: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, border: '1px solid #334155', background: '#1e293b', cursor: 'pointer', textAlign: 'left' }
                },
                  h('span', { style: { fontSize: 28, flexShrink: 0 } }, sc.authority.emoji),
                  h('div', null,
                    h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 } }, sc.title),
                    h('div', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.4 } }, sc.desc),
                    h('div', { style: { fontSize: 11, color: '#94a3b8', marginTop: 4 } }, sc.authority.role + ': ' + sc.authority.name)
                  )
                );
              })
            )
          );
        }

        // Chat Interface
        if (voMode === 'chat') {
          voiceContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } },
              h('button', { 'aria-label': curVo.authority.emoji, onClick: function() { upd({ voMode: null, voChatHistory: [], voConfidence: 30, voTurnCount: 0, voInputText: '' }); }, style: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 14, padding: 4 } }, '\u2190'),
              h('span', { style: { fontSize: 20 } }, curVo.authority.emoji),
              h('div', null,
                h('span', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' } }, curVo.authority.name),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, curVo.authority.role)
              ),
              h('span', { style: { fontSize: 11, color: '#94a3b8', marginLeft: 'auto' } }, 'Turn ' + voTurnCount + '/20')
            ),
            confidenceBar(voConfidence),
            h('div', { style: { padding: 10, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 12, fontSize: 11, color: '#94a3b8', lineHeight: 1.5 } }, curVo.desc),
            h('div', { style: { flex: 1, overflow: 'auto', marginBottom: 12, maxHeight: 300 } },
              voChatHistory.map(function(msg, mi) {
                return h('div', { key: mi }, chatBubble(msg.text, msg.role === 'user', curVo.authority.emoji));
              })
            ),
            voTurnCount >= 20 && h('div', { style: { textAlign: 'center', padding: 16, background: '#f59e0b15', borderRadius: 12, border: '1px solid #f59e0b33', marginBottom: 12 } },
              h('p', { style: { fontSize: 13, color: '#f59e0b', fontWeight: 600 } }, 'Conversation limit reached (20 turns).'),
              h('button', { 'aria-label': 'Try Another',
                onClick: function() {
                  var newDone = voCompleted + 1;
                  upd({ voMode: null, voChatHistory: [], voConfidence: 30, voTurnCount: 0, voCompleted: newDone, voInputText: '' });
                  logPractice('voice', curVo.id);
                  awardXP(20);
                  tryAwardBadge('first_voice');
                  if (newDone >= 5) tryAwardBadge('voice_5');
                },
                style: { marginTop: 10, padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Try Another')
            ),
            // Crisis resources surfaced when student's own message hits Tier 3
            (_voUserTier >= 3 && window.SelHub && window.SelHub.renderCrisisResources) ? window.SelHub.renderCrisisResources(h, band) : null,
            voTurnCount < 20 && h('div', { style: { display: 'flex', gap: 8 } },
              h('input', {
                type: 'text', value: voInputText,
                'aria-label': 'Voice practice message',
                onChange: function(e) { upd('voInputText', e.target.value); },
                onKeyDown: function(e) { if (e.key === 'Enter' && voInputText.trim() && !voLoading) { sendVoMessage(); } },
                placeholder: band === 'elementary' ? 'What do you want to say?' : 'Type what you\'d say...',
                disabled: voLoading,
                style: { flex: 1, padding: 12, borderRadius: 10, border: '1px solid #334155', background: '#1e293b', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit' }
              }),
              h('button', {
                'aria-label': voLoading ? 'Coach is responding, please wait' : 'Send message to coach',
                'aria-busy': voLoading ? 'true' : 'false',
                onClick: function() { if (voInputText.trim() && !voLoading) sendVoMessage(); },
                disabled: voLoading || !voInputText.trim(),
                style: { padding: '10px 16px', borderRadius: 10, border: 'none', background: voLoading ? '#334155' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: voLoading ? 'default' : 'pointer' }
              }, voLoading ? '...' : '\u2191')
            )
          );

          function sendVoMessage() {
            var userMsg = voInputText.trim();
            if (!userMsg || voLoading) return;
            var newHistory = voChatHistory.concat([{ role: 'user', text: userMsg }]);
            upd({ voChatHistory: newHistory, voLoading: true, voTurnCount: voTurnCount + 1, voInputText: '' });

            var historyStr = '';
            var recent = newHistory.slice(-20);
            recent.forEach(function(m) {
              historyStr += (m.role === 'user' ? 'Student' : curVo.authority.name) + ': ' + m.text + '\n';
            });

            var gradeLabel = band === 'elementary' ? 'elementary school (ages 5-10)' : band === 'middle' ? 'middle school (ages 11-14)' : 'high school (ages 15-18)';
            var prompt = 'You are ' + curVo.authority.name + ', ' + curVo.authority.role + ' in a ' + gradeLabel + ' setting.\n' +
              'Personality: ' + curVo.authority.personality + '\n' +
              'Situation: ' + curVo.desc + '\n\n' +
              'A student is trying to advocate for their needs. Current confidence score: ' + voConfidence + '/100.\n' +
              'Behavior based on confidence:\n' +
              '- Below 25: You are distracted and not fully listening. The student needs to be clearer and more direct.\n' +
              '- 25-50: You are paying attention but not yet convinced. You need more information or a stronger case.\n' +
              '- 50-75: You are engaged and sympathetic. You want to help but may need the student to propose a specific solution.\n' +
              '- Above 75: You are fully supportive and ready to take action. You validate the student and commit to helping.\n\n' +
              'IMPORTANT: You are an authority figure (not a peer). Be realistic but not unkind. If they are vague, ask clarifying questions. If they are aggressive, redirect gently. If they are clear and respectful, respond positively.\n\n' +
              'Conversation so far:\n' + historyStr + '\n' +
              'Respond as ' + curVo.authority.name + ' in 2-3 sentences appropriate for ' + gradeLabel + '.\n\n' +
              'Return ONLY valid JSON: {"reply":"your response","confidenceChange":number_between_-15_and_15,"resolved":boolean}\n' +
              'confidenceChange positive when student is clear, specific, polite, and persistent. Negative when vague, aggressive, gives up, or fails to state their need. ' +
              'resolved=true only when confidence > ' + curVo.resolveThreshold + ' AND student clearly stated their need AND you committed to a concrete action.';

            // Triangulated safety assessment of the student's own message,
            // fired in parallel with the authority-figure AI response.
            if (window.SelHub && window.SelHub.assessSafety) {
              window.SelHub.assessSafety(userMsg, band, 'advocacy', callGemini)
                .catch(function() { return { tier: 0, rationale: '', category: 'none' }; })
                .then(function(_safety) {
                  _safety = _safety || { tier: 0 };
                  if (_safety.tier >= 2 && onSafetyFlag) {
                    onSafetyFlag({
                      category: 'ai_advocacy_' + (_safety.category || 'concerning'),
                      match: _safety.rationale || 'SEL advocacy safety concern',
                      severity: _safety.tier >= 3 ? 'critical' : 'medium',
                      source: 'sel_advocacy',
                      context: userMsg.substring(0, 100),
                      timestamp: new Date().toISOString(),
                      aiGenerated: true,
                      confidence: _safety.tier >= 3 ? 0.9 : 0.7,
                      tier: _safety.tier
                    });
                  }
                  upd('_voUserTier', _safety.tier || 0);
                });
            }

            callGemini(prompt).then(function(resp) {
              var text = typeof resp === 'string' ? resp : (resp && resp.text ? resp.text : String(resp));
              try {
                var jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                  var parsed = JSON.parse(jsonMatch[0]);
                  var reply = parsed.reply || 'Hmm, let me think about that.';
                  var change = typeof parsed.confidenceChange === 'number' ? parsed.confidenceChange : 0;
                  var resolved = !!parsed.resolved;
                  var newConf = Math.max(0, Math.min(100, voConfidence + change));
                  var updatedHistory = newHistory.concat([{ role: 'authority', text: reply }]);
                  if (change > 5 && soundEnabled) sfxCorrect();
                  if (change < -5 && soundEnabled) sfxWrong();

                  if (resolved && newConf >= curVo.resolveThreshold) {
                    var newDone = voCompleted + 1;
                    var newStreak = voResolveStreak + 1;
                    upd({ voChatHistory: updatedHistory, voConfidence: newConf, voLoading: false, voMode: 'resolved', voCompleted: newDone, voResolveStreak: newStreak });
                    logPractice('voice', curVo.id);
                    awardXP(30);
                    tryAwardBadge('first_voice');
                    tryAwardBadge('voice_resolved');
                    if (newDone >= 5) tryAwardBadge('voice_5');
                    if (soundEnabled) sfxResolve();
                    celebrate && celebrate();
                    if (announceToSR) announceToSR('Resolved. The conversation reached a successful outcome.');
                  } else {
                    upd({ voChatHistory: updatedHistory, voConfidence: newConf, voLoading: false });
                    if (announceToSR) announceToSR('Coach replied. Confidence is now ' + newConf + ' out of 100.');
                  }
                } else {
                  upd({ voChatHistory: newHistory.concat([{ role: 'authority', text: text.slice(0, 300) }]), voLoading: false });
                  if (announceToSR) announceToSR('Coach replied.');
                }
              } catch(e) {
                upd({ voChatHistory: newHistory.concat([{ role: 'authority', text: text.slice(0, 300) }]), voLoading: false });
                if (announceToSR) announceToSR('Coach replied.');
              }
            }).catch(function(err) {
              upd('voLoading', false);
              addToast('AI error: ' + err.message, 'error');
              if (announceToSR) announceToSR('Error: the coach could not respond. Please try again.');
            });
          }
        }

        // Resolution Screen
        if (voMode === 'resolved') {
          voiceContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto', textAlign: 'center' } },
            h('div', { style: { fontSize: 56, marginBottom: 12 } }, '\uD83C\uDF89'),
            h('h3', { style: { color: '#22c55e', fontSize: 20, marginBottom: 8 } }, 'You Advocated Successfully!'),
            h('p', { style: { color: '#94a3b8', fontSize: 13, marginBottom: 4 } }, curVo.authority.name + ' heard you and committed to action.'),
            confidenceBar(voConfidence),
            h('div', { style: { padding: 16, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'left' } },
              h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Conversation Replay'),
              h('div', { style: { maxHeight: 200, overflow: 'auto' } },
                voChatHistory.map(function(msg, mi) {
                  return h('div', { key: mi }, chatBubble(msg.text, msg.role === 'user', curVo.authority.emoji));
                })
              )
            ),
            h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
              h('button', { 'aria-label': 'Practice Another',
                onClick: function() { upd({ voMode: null, voChatHistory: [], voConfidence: 30, voTurnCount: 0, voInputText: '' }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Practice Another \u2192'),
              h('button', { 'aria-label': 'See Progress',
                onClick: function() { upd('activeTab', 'progress'); },
                style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'See Progress')
            )
          );
        }
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Power Phrases ──
      // ══════════════════════════════════════════════════════════
      var phrasesContent = null;
      if (activeTab === 'phrases') {
        var ppPhrases = POWER_PHRASES[band] || POWER_PHRASES.elementary;
        // Group by category
        var categories = {};
        ppPhrases.forEach(function(p) {
          if (!categories[p.category]) categories[p.category] = [];
          categories[p.category].push(p);
        });
        var catKeys = Object.keys(categories);

        phrasesContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCAC Power Phrases'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 6 } }, 'Memorize these phrases. They\'re tools you can use in real life.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 16 } }, ppCount + ' of ' + ppPhrases.length + ' practiced'),
          // Progress bar
          h('div', { style: { height: 6, borderRadius: 3, background: '#1e293b', marginBottom: 20 } },
            h('div', { style: { height: '100%', borderRadius: 3, background: ACCENT, width: Math.round((ppCount / ppPhrases.length) * 100) + '%', transition: 'width 0.3s' } })
          ),
          // Categories
          catKeys.map(function(cat) {
            return h('div', { key: cat, style: { marginBottom: 20 } },
              h('div', { style: { fontSize: 12, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #334155' } }, cat),
              categories[cat].map(function(p) {
                var practiced = !!ppPracticed[p.id];
                return h('div', { key: p.id, style: { padding: 12, borderRadius: 12, background: practiced ? '#22c55e08' : '#1e293b', border: '1px solid ' + (practiced ? '#22c55e33' : '#334155'), marginBottom: 8 } },
                  h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 10 } },
                    h('div', { style: { flex: 1 } },
                      h('p', { style: { fontSize: 14, color: '#f1f5f9', fontWeight: 600, marginBottom: 4, lineHeight: 1.5 } }, p.phrase),
                      h('p', { style: { fontSize: 11, color: '#94a3b8', fontStyle: 'italic' } }, '\u2192 ' + p.when)
                    ),
                    h('button', { 'aria-label': 'Toggle sound',
                      onClick: function() {
                        if (!practiced) {
                          var newPP = Object.assign({}, ppPracticed);
                          newPP[p.id] = Date.now();
                          upd('ppPracticed', newPP);
                          awardXP(5);
                          if (soundEnabled) sfxClick();
                          logPractice('phrase', p.id);
                          if (Object.keys(newPP).length >= 5) tryAwardBadge('phrase_explorer');
                          addToast('Phrase practiced!', 'success');
                        }
                      },
                      style: { padding: '6px 12px', borderRadius: 8, border: 'none', background: practiced ? '#22c55e22' : ACCENT_DIM, color: practiced ? '#22c55e' : ACCENT, fontSize: 11, fontWeight: 600, cursor: practiced ? 'default' : 'pointer', flexShrink: 0 }
                    }, practiced ? '\u2713 Practiced' : 'Practice')
                  )
                );
              })
            );
          })
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Self-Advocacy Practice Scripts ──
      // ══════════════════════════════════════════════════════════
      var advocacyScriptsContent = null;
      if (activeTab === 'advocacy_scripts') {
        var sasScripts = SELF_ADVOCACY_SCRIPTS[band] || SELF_ADVOCACY_SCRIPTS.elementary;
        var curSas = sasScripts[sasIdx % sasScripts.length];
        var sasAllFilled = curSas.blanks.every(function(b) { return sasParts[b.key] && sasParts[b.key].trim(); });

        // Build the filled script text
        function buildSasScript(sc, parts) {
          var result = sc.template;
          sc.blanks.forEach(function(b) {
            result = result.replace('{' + b.key + '}', parts[b.key] || '___');
          });
          return result;
        }

        // TTS read-aloud function
        function speakScript(text) {
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            window.speechSynthesis.speak(utterance);
          } else {
            addToast('Text-to-speech is not supported in this browser.', 'info');
          }
        }

        advocacyScriptsContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83C\uDFA4 Self-Advocacy Practice Scripts'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 12 } }, 'Fill in the blanks to create a script, then practice saying it out loud.'),
          h('div', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 11, marginBottom: 12 } },
            'Script ' + ((sasIdx % sasScripts.length) + 1) + ' of ' + sasScripts.length + (sasCompleted > 0 ? ' \u00B7 ' + sasCompleted + ' practiced' : '')
          ),
          // Script selector (horizontal scroll)
          h('div', { style: { display: 'flex', gap: 6, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8, marginBottom: 12 } },
            sasScripts.map(function(sc, si) {
              var isCurrent = (sasIdx % sasScripts.length) === si;
              var isDone = !!sasPracticedSet[sc.id];
              return h('button', { 'aria-label': 'Next',
                key: sc.id,
                onClick: function() { upd({ sasIdx: si, sasParts: {}, sasPracticeMode: false }); if (soundEnabled) sfxClick(); },
                style: { padding: '6px 12px', borderRadius: 8, border: '1px solid ' + (isCurrent ? ACCENT : isDone ? '#22c55e33' : '#334155'), background: isCurrent ? ACCENT_DIM : 'transparent', color: isCurrent ? ACCENT : isDone ? '#22c55e' : '#94a3b8', fontSize: 11, fontWeight: isCurrent ? 700 : 500, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0 }
              }, (isDone ? '\u2713 ' : '') + sc.title);
            })
          ),
          // Situation card
          h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('h4', { style: { color: ACCENT, fontSize: 14, marginBottom: 6, fontWeight: 700 } }, curSas.title),
            h('p', { style: { fontSize: 12, color: '#94a3b8', lineHeight: 1.6 } }, curSas.situation)
          ),
          // Fill-in-the-blank area
          h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 } }, 'Fill In Your Script'),
            curSas.blanks.map(function(blank, bi) {
              return h('div', { key: bi, style: { marginBottom: 10 } },
                h('label', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 } }, blank.label),
                h('input', {
                  type: 'text',
                  'aria-label': blank.label + ' advocacy response',
                  value: sasParts[blank.key] || '',
                  onChange: function(e) {
                    var newParts = Object.assign({}, sasParts);
                    newParts[blank.key] = e.target.value;
                    upd('sasParts', newParts);
                  },
                  placeholder: blank.placeholder,
                  style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }
                })
              );
            })
          ),
          // Live preview of the script
          sasAllFilled && h('div', { style: { padding: 14, borderRadius: 12, background: '#22c55e08', border: '1px solid #22c55e33', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, 'Your Script'),
            h('p', { style: { fontSize: 14, color: '#f1f5f9', lineHeight: 1.8, fontStyle: 'italic' } },
              '\u201C' + buildSasScript(curSas, sasParts) + '\u201D'
            ),
            h('div', { style: { display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center', flexWrap: 'wrap' } },
              h('button', { 'aria-label': 'Read Aloud',
                onClick: function() { speakScript(buildSasScript(curSas, sasParts)); if (soundEnabled) sfxClick(); },
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\uD83D\uDD0A Read Aloud'),
              h('button', { 'aria-label': sasPracticeMode ? '\uD83C\uDFA4 Practicing...' : '\uD83C\uDFA4 Practice Mode',
                onClick: function() { upd('sasPracticeMode', !sasPracticeMode); if (soundEnabled) sfxClick(); },
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: sasPracticeMode ? '#22c55e' : '#f59e0b', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, sasPracticeMode ? '\uD83C\uDFA4 Practicing...' : '\uD83C\uDFA4 Practice Mode')
            )
          ),
          // Practice mode overlay
          sasPracticeMode && sasAllFilled && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '2px solid #f59e0b44', marginBottom: 16, textAlign: 'center' } },
            h('div', { style: { fontSize: 32, marginBottom: 8 } }, '\uD83C\uDFA4'),
            h('p', { style: { fontSize: 14, fontWeight: 700, color: '#f59e0b', marginBottom: 8 } }, 'Practice Mode'),
            h('p', { style: { fontSize: 12, color: '#94a3b8', marginBottom: 12, lineHeight: 1.6 } }, 'Read the script out loud. Practice until it feels natural. Try it with different tones: confident, calm, and firm.'),
            h('p', { style: { fontSize: 16, color: '#f1f5f9', lineHeight: 2, padding: '12px 16px', background: '#1e293b', borderRadius: 10, fontStyle: 'italic' } },
              '\u201C' + buildSasScript(curSas, sasParts) + '\u201D'
            ),
            h('div', { style: { display: 'flex', gap: 8, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' } },
              h('button', { 'aria-label': 'Hear It Again',
                onClick: function() { speakScript(buildSasScript(curSas, sasParts)); },
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\uD83D\uDD0A Hear It Again'),
              h('button', { 'aria-label': 'Toggle sound',
                onClick: function() {
                  if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); }
                  var newDone = sasCompleted + 1;
                  var newSet = Object.assign({}, sasPracticedSet);
                  newSet[curSas.id] = Date.now();
                  upd({ sasCompleted: newDone, sasPracticedSet: newSet, sasPracticeMode: false });
                  logPractice('advocacy_script', curSas.id);
                  awardXP(15);
                  if (newDone >= 5) tryAwardBadge('sas_master');
                  if (Object.keys(newSet).length >= sasScripts.length) tryAwardBadge('sas_all_band');
                  if (soundEnabled) sfxCorrect();
                  addToast('Script practiced! Great job finding your voice.', 'success');
                },
                style: { padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }
              }, '\u2705 Mark as Practiced')
            )
          ),
          // Tips
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDCA1 Tips'),
            curSas.tips.map(function(tip, ti) {
              return h('div', { key: ti, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 4, paddingLeft: 12 } }, '\u2022 ' + tip);
            })
          ),
          // Navigation
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center' } },
            h('button', { 'aria-label': 'Previous',
              onClick: function() {
                var prev = sasIdx - 1;
                if (prev < 0) prev = sasScripts.length - 1;
                upd({ sasIdx: prev, sasParts: {}, sasPracticeMode: false });
                if (soundEnabled) sfxClick();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '\u2190 Previous'),
            h('button', { 'aria-label': 'Next',
              onClick: function() {
                upd({ sasIdx: sasIdx + 1, sasParts: {}, sasPracticeMode: false });
                if (soundEnabled) sfxClick();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, 'Next \u2192')
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Advocacy Strength Assessment ──
      // ══════════════════════════════════════════════════════════
      var assessmentContent = null;
      if (activeTab === 'assessment') {
        var assessAllDone = ASSESSMENT_STATEMENTS.every(function(s) { return assessAnswers[s.id] != null; });

        // Calculate results
        var assessResults = null;
        if (assessAllDone || assessDone) {
          var categoryScores = {};
          var categoryCounts = {};
          ASSESSMENT_STATEMENTS.forEach(function(s) {
            var val = assessAnswers[s.id] || 3;
            if (!categoryScores[s.category]) { categoryScores[s.category] = 0; categoryCounts[s.category] = 0; }
            categoryScores[s.category] += val;
            categoryCounts[s.category] += 1;
          });
          var totalScore = 0;
          var totalMax = ASSESSMENT_STATEMENTS.length * 5;
          ASSESSMENT_STATEMENTS.forEach(function(s) { totalScore += (assessAnswers[s.id] || 3); });
          var strengths = [];
          var growth = [];
          Object.keys(categoryScores).forEach(function(cat) {
            var avg = categoryScores[cat] / categoryCounts[cat];
            var catInfo = ASSESSMENT_CATEGORIES[cat];
            if (avg >= 4) { strengths.push(catInfo); }
            else if (avg <= 2.5) { growth.push(catInfo); }
          });
          assessResults = { totalScore: totalScore, totalMax: totalMax, strengths: strengths, growth: growth, categoryScores: categoryScores, categoryCounts: categoryCounts };
        }

        assessmentContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCB Advocacy Strength Assessment'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Rate each statement honestly. There are no right or wrong answers \u2014 this is about self-awareness.'),

          // If results are showing
          assessDone && assessResults && h('div', null,
            h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16, textAlign: 'center' } },
              h('div', { style: { fontSize: 36, fontWeight: 700, color: ACCENT } }, assessResults.totalScore + ' / ' + assessResults.totalMax),
              h('div', { style: { fontSize: 13, color: '#94a3b8', marginTop: 4 } }, 'Overall Advocacy Strength Score'),
              h('div', { style: { height: 8, borderRadius: 4, background: '#1e293b', marginTop: 12 } },
                h('div', { style: { height: '100%', borderRadius: 4, background: assessResults.totalScore / assessResults.totalMax >= 0.7 ? '#22c55e' : assessResults.totalScore / assessResults.totalMax >= 0.4 ? '#f59e0b' : '#ef4444', width: Math.round((assessResults.totalScore / assessResults.totalMax) * 100) + '%', transition: 'width 0.4s' } })
              )
            ),
            // Category breakdown
            h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
              Object.keys(assessResults.categoryScores).map(function(cat) {
                var catInfo = ASSESSMENT_CATEGORIES[cat];
                var avg = assessResults.categoryScores[cat] / assessResults.categoryCounts[cat];
                var color = avg >= 4 ? '#22c55e' : avg >= 3 ? '#f59e0b' : '#ef4444';
                return h('div', { key: cat, style: { padding: 12, borderRadius: 10, background: '#1e293b', border: '1px solid ' + color + '33', textAlign: 'center' } },
                  h('div', { style: { fontSize: 20 } }, catInfo.icon),
                  h('div', { style: { fontSize: 11, fontWeight: 600, color: '#e2e8f0', marginTop: 4 } }, catInfo.label),
                  h('div', { style: { fontSize: 18, fontWeight: 700, color: color, marginTop: 2 } }, avg.toFixed(1) + '/5')
                );
              })
            ),
            // Strengths
            assessResults.strengths.length > 0 && h('div', { style: { padding: 14, borderRadius: 12, background: '#22c55e08', border: '1px solid #22c55e33', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\u2B50 Your Strengths'),
              assessResults.strengths.map(function(s, si) {
                return h('div', { key: si, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 4, paddingLeft: 12 } }, s.icon + ' ' + s.label);
              })
            ),
            // Growth areas
            assessResults.growth.length > 0 && h('div', { style: { padding: 14, borderRadius: 12, background: '#f59e0b08', border: '1px solid #f59e0b33', marginBottom: 12 } },
              h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\uD83C\uDF31 Growth Areas'),
              assessResults.growth.map(function(g, gi) {
                return h('div', { key: gi, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 6, paddingLeft: 12 } },
                  h('span', { style: { fontWeight: 600 } }, g.icon + ' ' + g.label + ': '),
                  g.tip
                );
              })
            ),
            // Personalized tips
            h('div', { style: { padding: 14, borderRadius: 12, background: '#0f172a', border: '1px solid #334155', marginBottom: 16 } },
              h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, fontWeight: 700 } }, '\uD83D\uDCA1 Personalized Tips'),
              assessResults.totalScore / assessResults.totalMax >= 0.7 && h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'You have strong advocacy skills! Focus on using them to help others and tackling systemic issues. Try the Voice Practice tab for advanced challenges.'),
              assessResults.totalScore / assessResults.totalMax >= 0.4 && assessResults.totalScore / assessResults.totalMax < 0.7 && h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'You are building solid advocacy skills! Practice the Self-Advocacy Scripts to build confidence in specific situations. Focus on your growth areas with targeted scenarios.'),
              assessResults.totalScore / assessResults.totalMax < 0.4 && h('p', { style: { fontSize: 12, color: '#e2e8f0', lineHeight: 1.6 } }, 'Advocacy is a skill that grows with practice. Start with the Power Phrases tab \u2014 memorize a few phrases and try them in low-stakes situations. Every time you speak up, you get stronger.')
            ),
            h('div', { style: { textAlign: 'center' } },
              h('button', { 'aria-label': 'Retake Assessment',
                onClick: function() { upd({ assessAnswers: {}, assessDone: false }); if (soundEnabled) sfxClick(); },
                style: { padding: '10px 24px', borderRadius: 10, border: 'none', background: '#334155', color: '#f1f5f9', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
              }, 'Retake Assessment')
            )
          ),

          // Question form (if not done)
          !assessDone && h('div', null,
            h('div', { style: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginBottom: 16 } },
              Object.keys(assessAnswers).length + ' of ' + ASSESSMENT_STATEMENTS.length + ' answered'
            ),
            ASSESSMENT_STATEMENTS.map(function(stmt, qi) {
              var currentVal = assessAnswers[stmt.id];
              return h('div', { key: stmt.id, style: { padding: 14, borderRadius: 12, background: currentVal != null ? '#0f172a' : '#1e293b', border: '1px solid ' + (currentVal != null ? ACCENT_MED : '#334155'), marginBottom: 10 } },
                h('p', { style: { fontSize: 13, color: '#e2e8f0', marginBottom: 10, lineHeight: 1.5 } }, (qi + 1) + '. ' + stmt.text),
                h('div', { style: { display: 'flex', gap: 6, justifyContent: 'center' } },
                  [1, 2, 3, 4, 5].map(function(val) {
                    var isSelected = currentVal === val;
                    var labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
                    return h('button', { 'aria-label': 'Toggle sound',
                      key: val,
                      onClick: function() {
                        var newAnswers = Object.assign({}, assessAnswers);
                        newAnswers[stmt.id] = val;
                        upd('assessAnswers', newAnswers);
                        if (soundEnabled) sfxClick();
                      },
                      title: labels[val - 1],
                      style: { width: 40, height: 40, borderRadius: '50%', border: '2px solid ' + (isSelected ? ACCENT : '#334155'), background: isSelected ? ACCENT : 'transparent', color: isSelected ? '#fff' : '#94a3b8', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                    }, String(val));
                  })
                ),
                h('div', { style: { display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#94a3b8' } },
                  h('span', null, 'Strongly Disagree'),
                  h('span', null, 'Strongly Agree')
                )
              );
            }),
            assessAllDone && h('div', { style: { textAlign: 'center', marginTop: 16 } },
              h('button', { 'aria-label': 'See My Results',
                onClick: function() {
                  upd('assessDone', true);
                  logPractice('assessment', 'advocacy_assessment');
                  awardXP(25);
                  tryAwardBadge('assessment_done');
                  if (soundEnabled) sfxResolve();
                  addToast('Assessment complete! See your results above.', 'success');
                },
                style: { padding: '12px 28px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }
              }, '\u2705 See My Results')
            )
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Letter / Email Template Builder ──
      // ══════════════════════════════════════════════════════════
      var lettersContent = null;
      if (activeTab === 'letters') {
        var curLt = LETTER_TEMPLATES[ltIdx % LETTER_TEMPLATES.length];
        var ltAllFilled = curLt.fields.every(function(f) { return ltFields[f.key] && ltFields[f.key].trim(); });

        lettersContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 4, color: '#f1f5f9', fontSize: 18 } }, '\u2709\uFE0F Letter & Email Builder'),
          h('p', { style: { textAlign: 'center', color: '#94a3b8', fontSize: 12, marginBottom: 16 } }, 'Build a formal advocacy letter you can actually send. Fill in the fields and export.'),
          // Template selector
          h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 } },
            LETTER_TEMPLATES.map(function(lt, li) {
              var isCurrent = (ltIdx % LETTER_TEMPLATES.length) === li;
              return h('button', { 'aria-label': lt.icon,
                key: lt.id,
                onClick: function() { upd({ ltIdx: li, ltFields: {}, ltPreview: false }); if (soundEnabled) sfxClick(); },
                style: { padding: 12, borderRadius: 10, border: '2px solid ' + (isCurrent ? ACCENT : '#334155'), background: isCurrent ? ACCENT_DIM : '#1e293b', cursor: 'pointer', textAlign: 'center' }
              },
                h('div', { style: { fontSize: 24, marginBottom: 4 } }, lt.icon),
                h('div', { style: { fontSize: 12, fontWeight: 600, color: isCurrent ? ACCENT : '#e2e8f0' } }, 'To ' + lt.recipient)
              );
            })
          ),
          // Field inputs
          h('div', { style: { padding: 16, borderRadius: 14, background: '#1e293b', border: '1px solid #334155', marginBottom: 16 } },
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 } },
              h('span', { style: { fontSize: 20 } }, curLt.icon),
              h('div', null,
                h('div', { style: { fontSize: 14, fontWeight: 700, color: '#f1f5f9' } }, curLt.title),
                h('div', { style: { fontSize: 11, color: '#94a3b8' } }, 'Fill in each field below')
              )
            ),
            curLt.fields.map(function(field, fi) {
              return h('div', { key: fi, style: { marginBottom: 10 } },
                h('label', { style: { fontSize: 11, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 4 } }, field.label),
                h('textarea', {
                  value: ltFields[field.key] || '',
                  'aria-label': field.label,
                  onChange: function(e) {
                    var newFields = Object.assign({}, ltFields);
                    newFields[field.key] = e.target.value;
                    upd('ltFields', newFields);
                  },
                  placeholder: field.placeholder,
                  rows: 2,
                  style: { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid ' + ACCENT_MED, background: '#0f172a', color: '#f1f5f9', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }
                })
              );
            })
          ),
          // Actions
          h('div', { style: { display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 } },
            h('button', { 'aria-label': 'Hide Preview',
              onClick: function() {
                if (!ltAllFilled) { addToast('Fill in all fields first.', 'info'); return; }
                upd('ltPreview', !ltPreview);
                if (soundEnabled) sfxReveal();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: ltPreview ? '#334155' : ACCENT, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, ltPreview ? 'Hide Preview' : '\uD83D\uDC41\uFE0F Preview Letter'),
            ltAllFilled && h('button', { 'aria-label': 'Copy & Save',
              onClick: function() {
                var text = curLt.format(ltFields);
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  navigator.clipboard.writeText(text).then(function() {
                    addToast('Letter copied to clipboard!', 'success');
                  }).catch(function() {
                    addToast('Could not copy. Try selecting the text manually.', 'info');
                  });
                } else {
                  addToast('Clipboard not available. Select and copy the preview text.', 'info');
                }
                var newDone = ltCompleted + 1;
                upd('ltCompleted', newDone);
                logPractice('letter', curLt.id);
                awardXP(20);
                tryAwardBadge('letter_writer');
                if (soundEnabled) sfxCorrect();
              },
              style: { padding: '10px 20px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }
            }, '\uD83D\uDCCB Copy & Save')
          ),
          // Preview
          ltPreview && ltAllFilled && h('div', { style: { padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('p', { style: { fontSize: 10, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, fontWeight: 700 } }, 'Letter Preview'),
            h('pre', { style: { fontSize: 13, color: '#e2e8f0', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontFamily: 'inherit', margin: 0 } },
              curLt.format(ltFields)
            )
          ),
          // Tips
          h('div', { style: { padding: 12, borderRadius: 10, background: '#0f172a', border: '1px solid #334155' } },
            h('p', { style: { fontSize: 10, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontWeight: 700 } }, '\uD83D\uDCA1 Letter Writing Tips'),
            [
              'Always keep a copy of letters you send.',
              'Be specific: names, dates, and details make your case stronger.',
              'State the impact on YOU, not just what happened.',
              'End with a clear, specific request.',
              'Follow up if you do not hear back within a week.'
            ].map(function(tip, ti) {
              return h('div', { key: ti, style: { fontSize: 12, color: '#e2e8f0', marginBottom: 4, paddingLeft: 12 } }, '\u2022 ' + tip);
            })
          )
        );
      }

      // ══════════════════════════════════════════════════════════
      // ── TAB: Progress ──
      // ══════════════════════════════════════════════════════════
      var progressContent = null;
      if (activeTab === 'progress') {
        var totalActs = scCompleted + stCompleted + rtViewed + voCompleted + ppCount + sasCompleted + ltCompleted + (assessDone ? 1 : 0);
        var stats = [
          { label: 'Scenarios Done', value: scCompleted, icon: '\uD83D\uDCE2', color: '#6366f1' },
          { label: 'Scripts Built', value: stCompleted, icon: '\uD83D\uDCDD', color: '#8b5cf6' },
          { label: 'Practice Scripts', value: sasCompleted, icon: '\uD83C\uDFA4', color: '#a855f7' },
          { label: 'Rights Explored', value: rtViewed, icon: '\u2696\uFE0F', color: '#3b82f6' },
          { label: 'Voice Practices', value: voCompleted, icon: '\uD83C\uDFA4', color: '#22c55e' },
          { label: 'Phrases Practiced', value: ppCount, icon: '\uD83D\uDCAC', color: '#f59e0b' },
          { label: 'Letters Created', value: ltCompleted, icon: '\u2709\uFE0F', color: '#ec4899' },
          { label: 'Assessment', value: assessDone ? 'Done' : 'Not yet', icon: '\uD83D\uDCCB', color: '#14b8a6' }
        ];

        progressContent = h('div', { style: { padding: 20, maxWidth: 550, margin: '0 auto' } },
          h('h3', { style: { textAlign: 'center', marginBottom: 16, color: '#f1f5f9', fontSize: 18 } }, '\uD83D\uDCCA Your Progress'),
          h('div', { style: { textAlign: 'center', padding: 20, borderRadius: 14, background: '#0f172a', border: '1px solid ' + ACCENT_MED, marginBottom: 16 } },
            h('div', { style: { fontSize: 40, fontWeight: 700, color: ACCENT } }, totalActs),
            h('div', { style: { fontSize: 13, color: '#94a3b8' } }, 'Total Activities Completed')
          ),
          h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 20 } },
            stats.map(function(s) {
              return h('div', { key: s.label, style: { padding: 14, borderRadius: 12, background: '#1e293b', border: '1px solid ' + s.color + '44', textAlign: 'center' } },
                h('div', { style: { fontSize: 22 } }, s.icon),
                h('div', { style: { fontSize: 20, fontWeight: 700, color: s.color, margin: '4px 0' } }, s.value),
                h('div', { style: { fontSize: 10, color: '#94a3b8' } }, s.label)
              );
            })
          ),
          practiceLog.length > 0 && h('div', null,
            h('h4', { style: { fontSize: 14, color: '#f1f5f9', marginBottom: 8 } }, 'Recent Practice'),
            h('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } },
              practiceLog.slice(-8).reverse().map(function(entry, i) {
                var icons = { scenario: '\uD83D\uDCE2', script: '\uD83D\uDCDD', rights: '\u2696\uFE0F', voice: '\uD83C\uDFA4', phrase: '\uD83D\uDCAC', advocacy_script: '\uD83C\uDFA4', assessment: '\uD83D\uDCCB', letter: '\u2709\uFE0F' };
                var labels = { scenario: 'Advocacy Scenario', script: 'Script Builder', rights: 'Rights Explorer', voice: 'Voice Practice', phrase: 'Power Phrase', advocacy_script: 'Practice Script', assessment: 'Self-Assessment', letter: 'Advocacy Letter' };
                return h('div', { key: i, style: { padding: '8px 12px', borderRadius: 8, background: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 } },
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
      var content = scenariosContent || scriptsContent || advocacyScriptsContent || rightsContent || voiceContent || phrasesContent || assessmentContent || lettersContent || progressContent;

      return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } },
        tabBar,
        heroBand,
        badgePopup,
        h('div', { style: { flex: 1, overflow: 'auto' } }, content),
        window.SelHub && window.SelHub.renderResourceFooter && window.SelHub.renderResourceFooter(h, band)
      );
    }
  });
})();
